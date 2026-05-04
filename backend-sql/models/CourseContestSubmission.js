const prisma = require('../config/db');
const { getRedis } = require('../config/redis');

class CourseContestSubmission {
    static async invalidateCache(courseContestId) {
        if (courseContestId) {
            try {
                const redis = getRedis();
                await redis.del(`cache:cc:lb:${courseContestId}`);
            } catch (e) {}
        }
    }

    static async create(data) {
        return await prisma.courseContestSubmission.create({
            data: {
                studentId: data.studentId,
                courseContestId: data.courseContestId,
                problemId: data.problemId || null,
                code: data.code != null ? data.code : '',
                language: data.language != null ? data.language : '',
                verdict: data.verdict || 'Pending',
                score: data.score || 0,
                timeTaken: data.timeTaken || 0,
                memoryUsed: data.memoryUsed || 0,
                testCasesPassed: data.testCasesPassed || 0,
                totalTestCases: data.totalTestCases || 0,
                tabSwitchCount: data.tabSwitchCount || 0,
                tabSwitchDuration: data.tabSwitchDuration || 0,
                pasteAttempts: data.pasteAttempts || 0,
                fullscreenExits: data.fullscreenExits || 0,
                isAutoSubmit: data.isAutoSubmit || false,
                attemptNumber: data.attemptNumber || 1,
                isFinalSubmission: data.isFinalSubmission || false
            }
        });
    }

    static async findByStudentAndCourseContest(studentId, courseContestId, attemptNumber = null) {
        const where = { studentId, courseContestId };
        if (attemptNumber !== null) where.attemptNumber = attemptNumber;
        
        const submissions = await prisma.courseContestSubmission.findMany({
            where,
            orderBy: { submittedAt: 'desc' }
        });
        return submissions;
    }

    static async hasSubmittedCourseContest(studentId, courseContestId, attemptNumber = null) {
        const where = {
            studentId,
            courseContestId,
            isFinalSubmission: true
        };
        if (attemptNumber !== null) where.attemptNumber = attemptNumber;

        const record = await prisma.courseContestSubmission.findFirst({
            where
        });
        return !!record;
    }

    static async isProblemSolved(studentId, courseContestId, problemId) {
        const submission = await prisma.courseContestSubmission.findFirst({
            where: { studentId, courseContestId, problemId, verdict: 'Accepted' }
        });
        return !!submission;
    }

    static async getStartRecord(studentId, courseContestId) {
        const latestStart = await prisma.courseContestSubmission.findFirst({
            where: { studentId, courseContestId, verdict: 'STARTED' },
            orderBy: { attemptNumber: 'desc' }
        });
        return latestStart || null;
    }

    static async getOrCreateStartRecord(studentId, courseContestId) {
        const latestStart = await prisma.courseContestSubmission.findFirst({
            where: { studentId, courseContestId, verdict: 'STARTED' },
            orderBy: { attemptNumber: 'desc' }
        });

        if (latestStart) {
            const isCompleted = await this.hasSubmittedCourseContest(studentId, courseContestId);
            return { ...latestStart, isCompleted };
        }

        const newRecord = await this.create({
            studentId,
            courseContestId,
            problemId: null, // No problem for start record
            verdict: 'STARTED',
            code: 'Contest Started',
            attemptNumber: 1
        });

        return { ...newRecord, isCompleted: false };
    }

    static async startNewAttempt(studentId, courseContestId) {
        const latestStart = await prisma.courseContestSubmission.findFirst({
            where: { studentId, courseContestId, verdict: 'STARTED' },
            orderBy: { attemptNumber: 'desc' }
        });

        const nextAttempt = latestStart ? latestStart.attemptNumber + 1 : 1;

        const newRecord = await this.create({
            studentId,
            courseContestId,
            problemId: null,
            verdict: 'STARTED',
            code: `Contest Started - Attempt ${nextAttempt}`,
            attemptNumber: nextAttempt
        });
        return newRecord;
    }

    static async markCourseContestCompleted(studentId, courseContestId, score, violations = {}, attemptNumber = 1) {
        const transactionResult = await prisma.$transaction(async (tx) => {
            // 1. Fetch accepted problems for this attempt
            const acceptedSubs = await tx.courseContestSubmission.findMany({
                where: {
                    studentId,
                    courseContestId,
                    verdict: 'Accepted',
                    problemId: { not: null },
                    attemptNumber
                },
                select: { problemId: true },
                distinct: ['problemId'],
            });
            const acceptedProblemIds = acceptedSubs.map(s => s.problemId).filter(Boolean);
            
            // 2. Get total points from problems
            const problemsData = await tx.problem.findMany({
                where: { id: { in: acceptedProblemIds } },
                select: { points: true }
            });
            const calculatedScore = problemsData.reduce((sum, p) => sum + (p.points || 0), 0);
            const problemsSolvedCount = acceptedProblemIds.length;

            const finalScore = (score && score > 0) ? score : calculatedScore;

            // 3. Create COMPLETED submission record
            const result = await tx.courseContestSubmission.create({
                data: {
                    studentId,
                    courseContestId,
                    problemId: null,
                    verdict: 'COMPLETED',
                    isFinalSubmission: true,
                    code: `Final Score: ${finalScore}`,
                    tabSwitchCount: violations.tabSwitchCount || 0,
                    tabSwitchDuration: violations.tabSwitchDuration || 0,
                    fullscreenExits: violations.fullscreenExits || 0,
                    pasteAttempts: violations.pasteAttempts || 0,
                    score: finalScore,
                    attemptNumber
                }
            });

            // 4. Update Leaderboard
            const startRecord = await tx.courseContestSubmission.findFirst({
                where: { studentId, courseContestId, verdict: 'STARTED', attemptNumber },
                orderBy: { submittedAt: 'asc' }
            });
            const timeTaken = startRecord ? (new Date() - new Date(startRecord.submittedAt)) / (1000 * 60) : 0;

            await tx.courseContestLeaderboard.upsert({
                where: {
                    courseContestId_studentId_attemptNumber: {
                        courseContestId,
                        studentId,
                        attemptNumber
                    }
                },
                update: {
                    totalScore: finalScore,
                    problemsSolved: problemsSolvedCount,
                    timeTaken,
                    completedAt: new Date()
                },
                create: {
                    courseContestId,
                    studentId,
                    totalScore: finalScore,
                    problemsSolved: problemsSolvedCount,
                    attemptNumber,
                    timeTaken,
                    completedAt: new Date()
                }
            });

            // 5. Award coins and update Progress
            if (finalScore > 0) {
                await tx.user.update({
                    where: { id: studentId },
                    data: { alphaCoins: { increment: finalScore } }
                });
            }

            // Sync progress for all solved problems during this contest attempt
            for (const pid of acceptedProblemIds) {
                await tx.progress.upsert({
                    where: {
                        user_content_unique: { studentId, contentType: 'problem', contentId: pid }
                    },
                    update: { status: 'completed', updatedAt: new Date() },
                    create: { studentId, contentType: 'problem', contentId: pid, status: 'completed', problemId: pid }
                });
            }

            await this.invalidateCache(courseContestId);
            return result;
        });

        // 6. Global Leaderboard Synchronization (Post-transaction)
        try {
            const user = await prisma.user.findUnique({ where: { id: studentId }, select: { alphaCoins: true } });
            if (user) {
                const LeaderboardModel = require('./Leaderboard');
                await LeaderboardModel.updateAlphaCoins(studentId, user.alphaCoins);
                
                const { addScoreJob } = require('../config/queue');
                await addScoreJob(studentId);
            }
        } catch (e) {
            console.warn('[CourseContest] Failed to sync global leaderboard:', e.message);
        }

        return transactionResult;
    }

    static async getLeaderboard(courseContestId, currentUserId = null, page = 1, limit = 50) {
        const contest = await prisma.courseContest.findUnique({ where: { id: courseContestId } });
        if (!contest) return { leaderboard: [], total: 0 };

        const skip = (page - 1) * limit;

        // Note: Joining with User to get names and rollNumber
        const entries = await prisma.courseContestLeaderboard.findMany({
            where: { courseContestId },
            include: {
                student: {
                    select: {
                        username: true,
                        firstName: true,
                        lastName: true,
                        education: true,
                        email: true
                    }
                }
            },
            orderBy: [
                { totalScore: 'desc' },
                { timeTaken: 'asc' }
            ],
            skip,
            take: limit
        });

        const total = await prisma.courseContestLeaderboard.count({ where: { courseContestId } });

        // Fetch violation totals for each entry
        const leaderboard = await Promise.all(entries.map(async (entry, index) => {
            // Get violation counts from the final submission or latest violation logs
            const violations = await this.getProctoringViolations(entry.studentId, courseContestId, entry.attemptNumber);
            
            return {
                rank: skip + index + 1,
                studentId: entry.studentId,
                username: entry.student.username || entry.student.email.split('@')[0],
                fullName: `${entry.student.firstName || ''} ${entry.student.lastName || ''}`.trim() || entry.student.email.split('@')[0],
                rollNumber: entry.student.education?.rollNumber || 'N/A',
                branch: entry.student.education?.branch || 'N/A',
                score: entry.totalScore,
                problemsSolved: entry.problemsSolved,
                time: entry.timeTaken ? Number(entry.timeTaken.toFixed(2)) : 0, // Frontend expects 'time'
                timeTaken: entry.timeTaken ? Number(entry.timeTaken.toFixed(2)) : 0,
                attemptNumber: entry.attemptNumber,
                completedAt: entry.completedAt,
                tabSwitchCount: violations.totalTabSwitches || 0,
                tabSwitchDuration: violations.totalTabSwitchDuration || 0,
                fullscreenExits: violations.totalFullscreenExits || 0,
                totalViolations: (violations.totalTabSwitches || 0) + (violations.totalFullscreenExits || 0)
            };
        }));

        return { leaderboard, total };
    }

    static async getProblemStatistics(courseContestId) {
        const subs = await prisma.courseContestSubmission.findMany({
            where: { courseContestId },
            select: { problemId: true, verdict: true }
        });

        const stats = {};
        subs.forEach(sub => {
            if (!sub.problemId) return;
            if (!stats[sub.problemId]) stats[sub.problemId] = { totalSubmissions: 0, acceptedCount: 0 };
            stats[sub.problemId].totalSubmissions++;
            if (sub.verdict === 'Accepted') stats[sub.problemId].acceptedCount++;
        });
        return stats;
    }

    static async getProctoringViolations(studentId, courseContestId, attemptNumber = 1) {
        const latestRecord = await prisma.courseContestSubmission.findFirst({
            where: {
                studentId,
                courseContestId,
                attemptNumber,
                OR: [
                    { verdict: 'VIOLATION_LOG' },
                    { isFinalSubmission: true }
                ]
            },
            orderBy: { submittedAt: 'desc' }
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

    static async logViolation(studentId, courseContestId, violations, attemptNumber = 1) {
        return await this.create({
            studentId,
            courseContestId,
            problemId: null,
            verdict: 'VIOLATION_LOG',
            attemptNumber,
            tabSwitchCount: violations.tabSwitchCount || 0,
            tabSwitchDuration: violations.tabSwitchDuration || 0,
            pasteAttempts: violations.pasteAttempts || 0,
            fullscreenExits: violations.fullscreenExits || 0
        });
    }

    static async getBestScoreOverall(studentId, courseContestId) {
        const bestEntry = await prisma.courseContestLeaderboard.findFirst({
            where: { studentId, courseContestId },
            orderBy: [
                { totalScore: 'desc' },
                { timeTaken: 'asc' }
            ]
        });

        if (!bestEntry) return { score: 0, time: 0, problemsSolved: 0 };

        return {
            score: bestEntry.totalScore,
            time: bestEntry.timeTaken,
            problemsSolved: bestEntry.problemsSolved,
            attemptNumber: bestEntry.attemptNumber
        };
    }

    static async getAcceptedProblems(studentId, courseContestId, attemptNumber = null) {
        const where = {
            studentId,
            courseContestId,
            verdict: 'Accepted',
            problemId: { not: null },   // BUG FIX: exclude null problemIds
        };
        if (attemptNumber !== null) where.attemptNumber = attemptNumber;

        const subs = await prisma.courseContestSubmission.findMany({
            where,
            select: { problemId: true },
            distinct: ['problemId'],
        });
        return subs.map(s => s.problemId).filter(Boolean);
    }

    static async deleteByContest(courseContestId) {
        return await prisma.courseContestSubmission.deleteMany({ where: { courseContestId } });
    }

    static async clearViolationLogs(studentId, courseContestId) {
        return await prisma.courseContestSubmission.deleteMany({
            where: { studentId, courseContestId, verdict: 'VIOLATION_LOG' }
        });
    }

    static async removeContestCompletion(studentId, courseContestId) {
        return await prisma.courseContestSubmission.deleteMany({
            where: { studentId, courseContestId, isFinalSubmission: true }
        });
    }
}

module.exports = CourseContestSubmission;
