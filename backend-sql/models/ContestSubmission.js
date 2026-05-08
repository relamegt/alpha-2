const prisma = require('../config/db');
const { getRedis } = require('../config/redis');

const CACHE_TTL = 30;

class ContestSubmission {
    // Force invalidate cache
    static async invalidateCache(contestId) {
        if (contestId) {
            try {
                const redis = getRedis();
                await redis.del(`leaderboard:cache:${contestId}`);
            } catch (e) {}
        }
    }

    // Create new contest submission
    static async create(submissionData) {
        return await prisma.contestSubmission.create({
            data: {
                contestId: submissionData.contestId,
                studentId: submissionData.studentId,
                problemId: submissionData.problemId || null,
                code: submissionData.code || '',
                language: submissionData.language || '',
                verdict: submissionData.verdict,
                testCasesPassed: submissionData.testCasesPassed || 0,
                totalTestCases: submissionData.totalTestCases || 0,
                points: submissionData.points || 0,
                memoryUsed: submissionData.memoryUsed || 0,
                executionTime: submissionData.executionTime || 0,
                attemptNumber: submissionData.attemptNumber || 1,
                tabSwitchCount: submissionData.tabSwitchCount || 0,
                tabSwitchDuration: submissionData.tabSwitchDuration || 0,
                pasteAttempts: submissionData.pasteAttempts || 0,
                fullscreenExits: submissionData.fullscreenExits || 0,
                isAutoSubmit: submissionData.isAutoSubmit || false,
                isFinalContestSubmission: submissionData.isFinalContestSubmission || false,
                isViolationLog: submissionData.isViolationLog || false
            }
        });
    }

    static async hasSubmittedContest(studentId, contestId, attemptNumber = null) {
        const where = {
            studentId,
            contestId,
            isFinalContestSubmission: true
        };
        
        if (attemptNumber !== null) {
            where.attemptNumber = attemptNumber;
        } else {
            // Find the latest start record to determine active attempt if no attemptNumber provided
            const latestStart = await prisma.contestSubmission.findFirst({
                where: { studentId, contestId, verdict: 'STARTED' },
                orderBy: { createdAt: 'desc' }
            });
            where.attemptNumber = latestStart ? (latestStart.attemptNumber || 1) : 1;
        }

        const record = await prisma.contestSubmission.findFirst({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return !!record;
    }

    static async isProblemSolved(studentId, contestId, problemId) {
        const submission = await prisma.contestSubmission.findFirst({
            where: { studentId, contestId, problemId, verdict: 'Accepted' }
        });
        return !!submission;
    }

    static async getStartRecord(studentId, contestId) {
        // Find the latest start record
        const latestStart = await prisma.contestSubmission.findFirst({
            where: { studentId: String(studentId), contestId: String(contestId), verdict: 'STARTED' },
            orderBy: { createdAt: 'desc' }
        });

        if (!latestStart) return null;

        // Check if this attempt has been completed
        const isCompleted = await prisma.contestSubmission.findFirst({
            where: {
                studentId: String(studentId),
                contestId: String(contestId),
                verdict: 'COMPLETED',
                attemptNumber: latestStart.attemptNumber || 1
            }
        });

        return { ...latestStart, isCompleted: !!isCompleted, submittedAt: latestStart.createdAt };
    }

    static async getOrCreateStartRecord(studentId, contestId) {
        const startRecord = await this.getStartRecord(studentId, contestId);
        if (startRecord) return startRecord;

        // No start record yet? Create attempt 1
        const newRecord = await this.create({
            studentId,
            contestId,
            verdict: 'STARTED',
            code: 'Contest Started',
            attemptNumber: 1
        });

        // Force cache refresh so student appears in leaderboard as "In Progress"
        await this.invalidateCache(contestId);
        
        return { ...newRecord, isCompleted: false, submittedAt: newRecord.createdAt };
    }

    static async startNewAttempt(studentId, contestId) {
        const latestStart = await prisma.contestSubmission.findFirst({
            where: { studentId, contestId, verdict: 'STARTED' },
            orderBy: { createdAt: 'desc' }
        });

        const nextAttempt = latestStart ? (latestStart.attemptNumber || 1) + 1 : 1;

        const newRecord = await this.create({
            studentId,
            contestId,
            verdict: 'STARTED',
            code: `Contest Started - Attempt ${nextAttempt}`,
            attemptNumber: nextAttempt
        });
        return { ...newRecord, submittedAt: newRecord.createdAt };
    }

    static async markContestCompleted(studentId, contestId, score, violations = {}, attemptNumber = 1) {
        const result = await this.create({
            studentId,
            contestId,
            verdict: 'COMPLETED',
            isFinalContestSubmission: true,
            code: `Final Score: ${score}`,
            tabSwitchCount:    violations.tabSwitchCount    || 0,
            tabSwitchDuration: violations.tabSwitchDuration || 0,
            fullscreenExits:   violations.fullscreenExits   || 0,
            pasteAttempts:     violations.pasteAttempts     || 0,
            points: score,
            attemptNumber,
        });

        try {
            const User     = require('./User');
            const Progress = require('./Progress');

            await User.addCoins(studentId, score);

            // Sync progress for every solved problem — MUST pass contentType!
            const acceptedProblemIds = await this.getAcceptedProblems(studentId, contestId, attemptNumber);
            for (const problemId of acceptedProblemIds) {
                // Contest problems are standard coding problems → contentType 'problem'
                await Progress.updateProblemsSolved(studentId, problemId, 'problem');
            }
        } catch (e) {
            console.error('Error updating stats on contest completion:', e);
        }

        return result;
    }

    static async logViolation(studentId, contestId, violations, attemptNumber = 1) {
        return await this.create({
            studentId,
            contestId,
            verdict: 'VIOLATION_LOG',
            isViolationLog: true,
            code: 'Violation Logged',
            tabSwitchCount: violations.tabSwitchCount || 0,
            tabSwitchDuration: violations.tabSwitchDuration || 0,
            pasteAttempts: violations.pasteAttempts || 0,
            fullscreenExits: violations.fullscreenExits || 0,
                attemptNumber
        });
    }

    static async getProblemStatistics(contestId) {
        const subs = await prisma.contestSubmission.findMany({
            where: { contestId },
            select: { problemId: true, verdict: true }
        });

        const stats = {};
        subs.forEach(sub => {
            if (!sub.problemId) return;
            const pid = sub.problemId;
            if (!stats[pid]) stats[pid] = { totalSubmissions: 0, acceptedCount: 0 };
            stats[pid].totalSubmissions++;
            if (sub.verdict === 'Accepted') stats[pid].acceptedCount++;
        });
        return stats;
    }

    static async findById(submissionId) {
        const submission = await prisma.contestSubmission.findUnique({ where: { id: submissionId } });
        if (!submission) return null;
        return { ...submission, submittedAt: submission.createdAt };
    }

    static async findByStudent(studentId, limit = 500) {
        const submissions = await prisma.contestSubmission.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        return submissions.map(sub => ({ ...sub, submittedAt: sub.createdAt }));
    }

    static async findByContest(contestId, includeCode = false) {
        const submissions = await prisma.contestSubmission.findMany({
            where: { contestId },
            select: includeCode ? undefined : {
                id: true, contestId: true, studentId: true, problemId: true,
                language: true, verdict: true, points: true, executionTime: true,
                memoryUsed: true, createdAt: true, attemptNumber: true,
                tabSwitchCount: true, pasteAttempts: true, isFinalContestSubmission: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10000
        });
        return submissions.map(sub => ({ ...sub, submittedAt: sub.createdAt }));
    }

    static async findByStudentAndContest(studentId, contestId, attemptNumber = null) {
        const where = { studentId, contestId, isFinalContestSubmission: false };
        if (attemptNumber !== null) where.attemptNumber = attemptNumber;
        
        const submissions = await prisma.contestSubmission.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 1000
        });
        return submissions.map(sub => ({ ...sub, submittedAt: sub.createdAt }));
    }

    static async getAcceptedProblems(studentId, contestId, attemptNumber = null) {
        const where = {
            studentId,
            contestId,
            verdict: 'Accepted',
            problemId: { not: null },   // BUG FIX: exclude null problemIds explicitly
        };
        if (attemptNumber !== null) where.attemptNumber = attemptNumber;

        const submissions = await prisma.contestSubmission.findMany({
            where,
            select: { problemId: true },
            distinct: ['problemId'],
            take: 500,
        });
        // Extra JS guard — belt + suspenders
        return submissions.map(s => s.problemId).filter(Boolean);
    }

    static async calculateScore(studentId, contestId, attemptNumber = null) {
        const Contest = require('./Contest');
        const Problem = require('./Problem');

        const [contest, acceptedProblemIds] = await Promise.all([
            Contest.findById(contestId),
            this.getAcceptedProblems(studentId, contestId, attemptNumber)
        ]);

        if (!contest || acceptedProblemIds.length === 0) {
            return { score: 0, time: 0, problemsSolved: 0 };
        }

        const where = { studentId, contestId, verdict: 'Accepted' };
        if (attemptNumber !== null) where.attemptNumber = attemptNumber;

        const [problems, allAcceptedSubs] = await Promise.all([
            Problem.findByIds(acceptedProblemIds),
            prisma.contestSubmission.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                take: 1000
            })
        ]);

        const problemMap = new Map(problems.map(p => [p.id, p]));
        const firstAcceptedByProblem = new Map();

        allAcceptedSubs.forEach(sub => {
            if (!firstAcceptedByProblem.has(sub.problemId)) {
                firstAcceptedByProblem.set(sub.problemId, sub);
            }
        });

        let totalScore = 0;
        let totalTime = 0;

        for (const problemId of acceptedProblemIds) {
            const problem = problemMap.get(problemId);
            const firstAccepted = firstAcceptedByProblem.get(problemId);

            if (problem && firstAccepted) {
                totalScore += (problem.points || 0);
                
                let startTime = contest.startTime;
                const timeTaken = (new Date(firstAccepted.createdAt) - new Date(startTime)) / (1000 * 60);
                totalTime = Math.max(totalTime, timeTaken);
            }
        }

        return { score: totalScore, time: totalTime, problemsSolved: acceptedProblemIds.length };
    }

    static async getBestScoreOverall(studentId, contestId) {
        const submissions = await prisma.contestSubmission.findMany({
            where: { studentId, contestId },
            select: { attemptNumber: true }
        });
        
        if (!submissions.length) return { score: 0, time: 0, problemsSolved: 0, bestAttemptNumber: 1 };
        const attempts = [...new Set(submissions.map(s => s.attemptNumber || 1))];
        
        let bestOverall = { score: 0, time: 0, problemsSolved: 0, bestAttemptNumber: 1 };
        for (let att of attempts) {
            const result = await this.calculateScore(studentId, contestId, att);
            if (result.score > bestOverall.score || (result.score === bestOverall.score && result.time < bestOverall.time)) {
                bestOverall = { ...result, bestAttemptNumber: att };
            }
        }
        return bestOverall;
    }

    static async getProctoringViolations(studentId, contestId, attemptNumber = null) {
        const where = { studentId, contestId };
        if (attemptNumber !== null) where.attemptNumber = attemptNumber;

        const latestRecord = await prisma.contestSubmission.findFirst({
            where: { ...where, OR: [{ isViolationLog: true }, { isFinalContestSubmission: true }] },
            orderBy: { createdAt: 'desc' }
        });

        if (latestRecord) {
            return {
                totalTabSwitches: latestRecord.tabSwitchCount || 0,
                totalTabSwitchDuration: latestRecord.tabSwitchDuration || 0,
                totalPasteAttempts: latestRecord.pasteAttempts || 0,
                totalFullscreenExits: latestRecord.fullscreenExits || 0
            };
        }
        return { totalTabSwitches: 0, totalTabSwitchDuration: 0, totalPasteAttempts: 0, totalFullscreenExits: 0 };
    }

    static async removeContestCompletion(studentId, contestId) {
        return await prisma.contestSubmission.deleteMany({
            where: { studentId, contestId, isFinalContestSubmission: true }
        });
    }

    static async clearViolationLogs(studentId, contestId) {
        return await prisma.contestSubmission.deleteMany({
            where: { studentId, contestId, isViolationLog: true }
        });
    }

    static async deleteByContest(contestId) {
        return await prisma.contestSubmission.deleteMany({ where: { contestId } });
    }

    static async getLeaderboard(contestId, currentUserId = null, forceRefresh = false, page = 1, limit = 50) {
        const redis = getRedis();
        const Contest = require('./Contest');
        const contest = await Contest.findById(contestId);
        if (!contest) return { leaderboard: [], total: 0, page, limit, totalPages: 0 };

        const cacheKey = `leaderboard:cache:${contest.id}`;
        let allEnrichedData = null;

        if (!forceRefresh) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) allEnrichedData = JSON.parse(cached);
            } catch (e) {}
        }

        if (!allEnrichedData) {
            const User = require('./User');
            const Problem = require('./Problem');

            const allSubmissions = await prisma.contestSubmission.findMany({
                where: { contestId: contest.id },
                select: {
                    studentId: true, problemId: true, verdict: true, createdAt: true,
                    attemptNumber: true, isFinalContestSubmission: true,
                    tabSwitchCount: true, tabSwitchDuration: true, pasteAttempts: true, fullscreenExits: true
                },
                take: 50000
            });

            const participantIdsSet = new Set();
            if (currentUserId) participantIdsSet.add(currentUserId);
            const submissionsByStudent = new Map();
            const latestViolations = new Map();

            allSubmissions.forEach(sub => {
                if (!sub.studentId) return;
                participantIdsSet.add(sub.studentId);
                if (!submissionsByStudent.has(sub.studentId)) submissionsByStudent.set(sub.studentId, []);
                submissionsByStudent.get(sub.studentId).push(sub);

                const existing = latestViolations.get(sub.studentId);
                if (!existing || new Date(sub.createdAt) > new Date(existing.time)) {
                    latestViolations.set(sub.studentId, {
                        ...sub,
                        time: sub.createdAt
                    });
                }
            });

            // Get eligible users
            // 1. All students from the assigned batch
            if (contest.batchId) {
                const batchUsers = await prisma.user.findMany({ where: { role: 'student', batchId: contest.batchId }, select: { id: true } });
                batchUsers.forEach(u => participantIdsSet.add(u.id));
            }

            // 2. All students explicitly registered for this contest (e.g. spot users or open registrations)
            const registeredUsers = await prisma.user.findMany({ 
                where: { 
                    role: 'student', 
                    registeredForContest: contest.id 
                }, 
                select: { id: true } 
            });
            registeredUsers.forEach(u => participantIdsSet.add(u.id));

            const users = await prisma.user.findMany({
                where: { id: { in: Array.from(participantIdsSet) } },
                select: { 
                    id: true, 
                    firstName: true, 
                    lastName: true, 
                    email: true, 
                    education: true, 
                    role: true, 
                    alphaCoins: true 
                }
            });

            const contestProblems = await Problem.findByIds(contest.problems?.map(p => p.id || p) || []);
            const isContestEnded = new Date() > new Date(contest.endTime);

            allEnrichedData = users
                .filter(u => u.role === 'student')
                .map(user => {
                    const studentSubs = submissionsByStudent.get(user.id) || [];
                    const subsByAttempt = new Map();
                    studentSubs.forEach(s => {
                        const att = s.attemptNumber || 1;
                        if (!subsByAttempt.has(att)) subsByAttempt.set(att, []);
                        subsByAttempt.get(att).push(s);
                    });

                    let bestResult = { score: 0, time: 0, solved: 0, status: {} };
                    const v = latestViolations.get(user.id) || { tabSwitchCount: 0, tabSwitchDuration: 0, pasteAttempts: 0, fullscreenExits: 0 };

                    for (const [att, aSubs] of subsByAttempt.entries()) {
                        let curScore = 0, curTime = 0, curSolved = 0;
                        const curStatus = {};
                        const pSubsMap = new Map();
                        aSubs.forEach(s => { if (s.problemId) { if (!pSubsMap.has(s.problemId)) pSubsMap.set(s.problemId, []); pSubsMap.get(s.problemId).push(s); } });

                        for (const prob of contestProblems) {
                            const ps = pSubsMap.get(prob.id) || [];
                            const accepted = ps.filter(s => s.verdict === 'Accepted');
                            if (accepted.length > 0) {
                                curSolved++;
                                curScore += (prob.points || 0);
                                const first = accepted.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
                                let userStart = contest.startTime;
                                const t = (new Date(first.createdAt) - new Date(userStart)) / (1000 * 60);
                                curTime = Math.max(curTime, t);
                                curStatus[prob.id] = { status: 'Accepted', tries: ps.length, submittedAt: t };
                            } else {
                                curStatus[prob.id] = { status: ps.length > 0 ? 'Wrong Answer' : 'Not Attempted', tries: ps.length, submittedAt: null };
                            }
                        }

                        // Update bestResult if this attempt is better, or if it's the first attempt we're seeing
                        if (bestResult.solved === 0 && Object.keys(bestResult.status).length === 0) {
                            bestResult = { score: curScore, time: curTime, solved: curSolved, status: curStatus };
                        } else if (curScore > bestResult.score || (curScore === bestResult.score && curTime < bestResult.time)) {
                            bestResult = { score: curScore, time: curTime, solved: curSolved, status: curStatus };
                        }
                    }

                    const userSubmitted = studentSubs.some(s => s.isFinalContestSubmission);
                    return {
                        studentId: user.id, rollNumber: user.education?.rollNumber || 'N/A', fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0],
                        username: user.email?.split('@')[0], branch: user.education?.branch || 'N/A', section: user.profile?.section || 'N/A',
                        score: bestResult.score, time: bestResult.time, problemsSolved: bestResult.solved,
                        tabSwitchCount: v.tabSwitchCount, tabSwitchDuration: v.tabSwitchDuration, pasteAttempts: v.pasteAttempts, fullscreenExits: v.fullscreenExits,
                        isCompleted: userSubmitted || isContestEnded,
                        status: userSubmitted ? 'Submitted' : (isContestEnded ? 'Finished' : 'In Progress'),
                        problems: bestResult.status
                    };
                });

            allEnrichedData.sort((a, b) => b.score !== a.score? b.score - a.score : a.time - b.time);
            allEnrichedData = allEnrichedData.map((e, i) => ({ ...e, rank: i + 1 }));
            try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(allEnrichedData)); } catch (e) {}
        }

        const total = allEnrichedData.length;
        const startIndex = (page - 1) * limit;
        return { leaderboard: allEnrichedData.slice(startIndex, startIndex + limit), total, page, limit, totalPages: Math.ceil(total / limit) };
    }
}

module.exports = ContestSubmission;
