const prisma = require('../config/db');
const { getRedis } = require('../config/redis');

const GLOBAL_RANK_KEY = 'leaderboard:global';

class Leaderboard {
  // Create or update leaderboard entry
  static async upsertByStudent(leaderboardData) {
    const studentId = leaderboardData.studentId;
    const alphaCoins = leaderboardData.alphaCoins || 0;
    const externalScores = {
        hackerrank: leaderboardData.externalScores?.hackerrank || 0,
        leetcode: leaderboardData.externalScores?.leetcode || 0,
        codechef: leaderboardData.externalScores?.codechef || 0,
        codeforces: leaderboardData.externalScores?.codeforces || 0,
        interviewbit: leaderboardData.externalScores?.interviewbit || 0,
        spoj: leaderboardData.externalScores?.spoj || 0
    };

    const overallScore = alphaCoins + Object.values(externalScores).reduce((a, b) => a + b, 0);

    const result = await prisma.leaderboard.upsert({
      where: { studentId },
      create: {
        studentId,
        batchId: leaderboardData.batchId || null,
        rollNumber: leaderboardData.rollNumber || 'N/A',
        username: leaderboardData.username || 'Unknown',
        alphaCoins,
        externalScores,
        overallScore,
        lastUpdated: new Date()
      },
      update: {
        batchId: leaderboardData.batchId || null,
        rollNumber: leaderboardData.rollNumber || 'N/A',
        username: leaderboardData.username || 'Unknown',
        alphaCoins,
        externalScores,
        overallScore,
        lastUpdated: new Date()
      }
    });

    // Sync with Redis
    try {
      const redis = getRedis();
      await redis.zadd(GLOBAL_RANK_KEY, overallScore, studentId);
    } catch (err) {
      console.error('[Redis] Failed to sync global rank:', err.message);
    }

    return result;
  }

  // Find leaderboard entry by student
  static async findByStudent(studentId) {
    return await prisma.leaderboard.findUnique({
      where: { studentId }
    });
  }

  // Get batch leaderboard with ranks
  static async getBatchLeaderboard(batchId) {
    const leaderboard = await prisma.leaderboard.findMany({
      where: { batchId },
      orderBy: { overallScore: 'desc' },
      take: 10000
    });

    // Calculate ranks in-memory for the batch
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Enrich with global ranks
    return await this._getGlobalRanksFromScores(leaderboard);
  }

  // Update Alpha Coins
  static async updateAlphaCoins(studentId, score) {
    const entry = await this.findByStudent(studentId);
    if (!entry) return;

    const externalTotal = Object.values(entry.externalScores || {}).reduce((a, b) => a + b, 0);
    const newOverallScore = score + externalTotal;

    const result = await prisma.leaderboard.update({
      where: { studentId },
      data: {
        alphaCoins: score,
        overallScore: newOverallScore,
        lastUpdated: new Date()
      }
    });

    try {
      await getRedis().zadd(GLOBAL_RANK_KEY, newOverallScore, studentId);
    } catch (e) { }

    return result;
  }

  // Recalculate scores for a student
  static async recalculateScores(studentId) {
    const redis = getRedis();
    const lockKey = `lock:recalculate:${studentId}`;

    const lockAcquired = await redis.set(lockKey, 'locked', 'NX', 'EX', 30);
    if (!lockAcquired) return null;

    try {
      const user = await prisma.user.findUnique({
          where: { id: studentId },
          include: { externalProfiles: true }
      });
      if (!user || user.role !== 'student') return null;

      // 1. Practice Score (Submissions for non-contest content)
      const practiceSubmissions = await prisma.submission.findMany({
          where: { studentId, verdict: 'Accepted' },
          select: { problemId: true, sqlProblemId: true, videoId: true, quizId: true, articleId: true },
      });

      let practiceScore = 0;
      if (practiceSubmissions.length > 0) {
          // Extract unique IDs of each type
          const problemIds = [...new Set(practiceSubmissions.map(s => s.problemId).filter(Boolean))];
          const sqlProblemIds = [...new Set(practiceSubmissions.map(s => s.sqlProblemId).filter(Boolean))];
          const quizIds = [...new Set(practiceSubmissions.map(s => s.quizId).filter(Boolean))];
          const videoIds = [...new Set(practiceSubmissions.map(s => s.videoId).filter(Boolean))];
          const articleIds = [...new Set(practiceSubmissions.map(s => s.articleId).filter(Boolean))];

          // Fetch points for allowed content types (Problems, SQL, Quizzes)
          const [problems, sqlProblems, quizzes] = await Promise.all([
              problemIds.length > 0 ? prisma.problem.findMany({ where: { id: { in: problemIds } }, select: { points: true } }) : [],
              sqlProblemIds.length > 0 ? prisma.sqlProblem.findMany({ where: { id: { in: sqlProblemIds } }, select: { points: true } }) : [],
              quizIds.length > 0 ? prisma.quiz.findMany({ where: { id: { in: quizIds } }, select: { points: true } }) : [],
          ]);

          const sumPoints = (list) => list.reduce((acc, curr) => acc + (curr.points || 0), 0);
          practiceScore = sumPoints(problems) + sumPoints(sqlProblems) + sumPoints(quizzes);
      }

      // 2. Contest Score (Standard Contests)
      const contestSubmissions = await prisma.contestSubmission.findMany({
          where: { studentId, verdict: 'Accepted' },
          select: { problemId: true, contestId: true },
          distinct: ['problemId', 'contestId']
      });

      let contestScore = 0;
      if (contestSubmissions.length > 0) {
          const problemIds = [...new Set(contestSubmissions.map(s => s.problemId).filter(Boolean))];
          if (problemIds.length > 0) {
              const problems = await prisma.problem.findMany({
                  where: { id: { in: problemIds } },
                  select: { id: true, points: true }
              });
              const pointsMap = new Map(problems.map(p => [p.id, p.points || 0]));

              contestSubmissions.forEach(sub => {
                  if (sub.problemId) {
                      contestScore += pointsMap.get(sub.problemId) || 0;
                  }
              });
          }
      }

      // 3. Course Contest Score (New!)
      const courseContestSubmissions = await prisma.courseContestSubmission.findMany({
          where: { studentId, verdict: 'Accepted', isFinalSubmission: true },
          select: { score: true }
      });
      const courseContestScore = courseContestSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0);

      const alphaCoins = practiceScore + contestScore + courseContestScore;

      // Sync user coins
      await prisma.user.update({
          where: { id: studentId },
          data: { alphaCoins: alphaCoins }
      });

      // External scores
      const scoreCalculator = require('../utils/scoreCalculator');
      const externalScores = {
          hackerrank: 0, leetcode: 0, codechef: 0, codeforces: 0, interviewbit: 0, spoj: 0
      };
      
      user.externalProfiles.forEach(profile => {
          const ExternalProfileModel = require('./ExternalProfile');
          if (ExternalProfileModel.isSocialPlatform(profile.platform)) return;
          const score = scoreCalculator.calculatePlatformScore(profile.platform, profile.stats);
          externalScores[profile.platform] = score;
      });

      return await this.upsertByStudent({
          studentId,
          rollNumber: user.education?.rollNumber || 'N/A',
          username: user.email.split('@')[0],
          alphaCoins,
          externalScores,
          batchId: user.batchId
      });
    } finally {
      await redis.del(lockKey);
    }
  }

  // Get student rank
  static async getStudentRank(studentId) {
    const entry = await this.findByStudent(studentId);
    if (!entry) return null;

    const redis = getRedis();

    const [batchRankCount, batchTotal, redisGlobalRank] = await Promise.all([
      prisma.leaderboard.count({
        where: {
          batchId: entry.batchId,
          overallScore: { gt: entry.overallScore }
        }
      }),
      prisma.leaderboard.count({ where: { batchId: entry.batchId } }),
      redis.zrevrank(GLOBAL_RANK_KEY, studentId)
    ]);

    let globalRank;
    if (redisGlobalRank !== null) {
      globalRank = redisGlobalRank + 1;
    } else {
      globalRank = await prisma.leaderboard.count({
          where: { overallScore: { gt: entry.overallScore } }
      }) + 1;
    }

    return {
      batchRank: batchRankCount + 1,
      globalRank,
      totalStudents: batchTotal,
      score: entry.overallScore,
      details: entry
    };
  }

  static async getTopPerformers(limit = 10) {
      return await prisma.leaderboard.findMany({
          orderBy: { overallScore: 'desc' },
          take: limit
      });
  }

  // --- Added Missing Methods for Parity ---

  static async upsert(data) {
      return await this.upsertByStudent(data);
  }

  static async findByBatch(batchId) {
      return await this.getBatchLeaderboard(batchId);
  }

  static async updateExternalScore(studentId, platform, score) {
      const entry = await this.findByStudent(studentId);
      if (!entry) return null;
      
      const newScores = { ...entry.externalScores, [platform]: score };
      const nonExternalScore = entry.overallScore - (entry.externalScores[platform] || 0);
      const newOverallScore = nonExternalScore + score;
      
      const result = await prisma.leaderboard.update({
          where: { studentId },
          data: {
              externalScores: newScores,
              overallScore: newOverallScore,
              lastUpdated: new Date()
          }
      });
      try { await getRedis().zadd(GLOBAL_RANK_KEY, newOverallScore, studentId); } catch (e) {}
      return result;
  }

  static async deleteByStudent(studentId) {
      try { await getRedis().zrem(GLOBAL_RANK_KEY, studentId); } catch (e) {}
      return await prisma.leaderboard.deleteMany({ where: { studentId } });
  }

  static async deleteByBatch(batchId) {
      return await prisma.leaderboard.deleteMany({ where: { batchId } });
  }

  static async _getGlobalRanksFromScores(leaderboardData) {
      if (!leaderboardData || leaderboardData.length === 0) return leaderboardData;
      
      const redis = getRedis();
      const studentIds = leaderboardData.map(e => e.studentId);
      
      try {
          // Attempt to get ranks from Redis
          const pipeline = redis.pipeline();
          studentIds.forEach(id => pipeline.zrevrank(GLOBAL_RANK_KEY, id));
          const ranks = await pipeline.exec();
          
          leaderboardData.forEach((entry, index) => {
              const redisRank = ranks[index][1];
              if (redisRank !== null) {
                  entry.globalRank = redisRank + 1;
              }
          });
          
          // For any missing ranks, calculate via SQL
          const missingIds = leaderboardData.filter(e => !e.globalRank).map(e => e.studentId);
          if (missingIds.length > 0) {
              for (const entry of leaderboardData) {
                  if (!entry.globalRank) {
                      const count = await prisma.leaderboard.count({
                          where: { overallScore: { gt: entry.overallScore } }
                      });
                      entry.globalRank = count + 1;
                  }
              }
          }
      } catch (err) {
          console.warn('[Leaderboard] Global rank enrichment failed:', err.message);
      }
      
      return leaderboardData;
  }
}

module.exports = Leaderboard;
