const prisma = require('../config/db');
const { VERDICTS, CONTENT_TYPES } = require('../utils/constants');
const User = require('../models/User');
const Progress = require('../models/Progress');

/**
 * Handles the logic for completing a content item (problem, SQL, video, etc.)
 * Ensures atomicity using Prisma transactions and prevents double coin awards.
 */
class ProgressService {
    /**
     * Records a completion for a content item.
     * @param {string} studentId - The ID of the student.
     * @param {Object} content - The content object (problem, video, etc.).
     * @param {Object} submissionData - Data for the submission record (code, language, etc.).
     * @param {boolean} isFirstSolveCheck - Whether to award coins for the first solve.
     * @param {string} courseId - Optional ID of the course this content belongs to.
     */
    static async handleContentCompletion(studentId, content, submissionData = null, isFirstSolveCheck = true, courseId = null) {
        const contentType = content.type || CONTENT_TYPES.PROBLEM;
        const contentId = content.id;
        const fkColumn = this._getFkColumn(contentType);

        // Normalize courseId if it's a slug
        let resolvedCourseId = courseId;
        if (courseId && courseId.length < 30) { // Simple check for UUID vs Slug (UUID is 36 chars)
            const course = await prisma.course.findUnique({ 
                where: { slug: courseId },
                select: { id: true }
            });
            if (course) resolvedCourseId = course.id;
        }

        return await prisma.$transaction(async (tx) => {
            // Use resolvedCourseId everywhere within transaction
            courseId = resolvedCourseId; 
            // 1. Check if already completed to prevent double-awarding coins
            const existingProgress = await tx.progress.findUnique({
                where: {
                    user_content_unique: {
                        studentId,
                        contentType,
                        contentId
                    }
                }
            });

            const isAlreadyCompleted = existingProgress && existingProgress.status === 'completed';
            let coinsEarned = 0;

            if (!isAlreadyCompleted && isFirstSolveCheck && !content.isContestProblem) {
                // HIGH - User Requirement: No points for videos and articles
                const allowedTypes = [CONTENT_TYPES.PROBLEM, CONTENT_TYPES.SQL, CONTENT_TYPES.QUIZ, CONTENT_TYPES.PRACTICAL, CONTENT_TYPES.ASSIGNMENT];
                if (allowedTypes.includes(contentType)) {
                    coinsEarned = content.points || 0;
                }
            }

            // 2. Handle Submission record
            let submission = null;
            if (submissionData) {
                const isPractical = contentType === CONTENT_TYPES.PRACTICAL;
                const isNonCoding = [CONTENT_TYPES.VIDEO, CONTENT_TYPES.QUIZ, CONTENT_TYPES.ARTICLE].includes(contentType);

                if (isPractical) {
                    // Practical exercises use a separate table (practical_submissions), 
                    // which is handled in the practicalExerciseController.
                    // Here we just ensure the progress and coins are handled.
                    submission = submissionData.submission; // Should be passed if already created
                } else if (isNonCoding) {
                    // Single latest attempt logic: upsert or update existing
                    const existingSubmission = await tx.submission.findFirst({
                        where: { studentId, [fkColumn]: contentId }
                    });

                    if (existingSubmission) {
                        submission = await tx.submission.update({
                            where: { id: existingSubmission.id },
                            data: {
                                code: submissionData.code,
                                language: submissionData.language || 'json',
                                verdict: VERDICTS.ACCEPTED,
                                testCasesPassed: submissionData.testCasesPassed || 0,
                                totalTestCases: submissionData.totalTestCases || 0,
                                metadata: submissionData.metadata || {},
                                courseId,
                                updatedAt: new Date()
                            }
                        });
                    } else {
                        submission = await tx.submission.create({
                            data: {
                                studentId,
                                [fkColumn]: contentId,
                                code: submissionData.code,
                                language: submissionData.language || 'json',
                                verdict: VERDICTS.ACCEPTED,
                                testCasesPassed: submissionData.testCasesPassed || 0,
                                totalTestCases: submissionData.totalTestCases || 0,
                                points: coinsEarned,
                                courseId,
                                metadata: submissionData.metadata || {}
                            }
                        });
                    }
                } else {
                    // Coding problems allow multiple submissions (historical record)
                    submission = await tx.submission.create({
                        data: {
                            studentId,
                            [fkColumn]: contentId,
                            code:            submissionData.code,
                            language:        submissionData.language,
                            verdict:         submissionData.verdict || VERDICTS.ACCEPTED,
                            testCasesPassed: submissionData.testCasesPassed || 0,
                            totalTestCases:  submissionData.totalTestCases || 0,
                            points:          coinsEarned,
                            courseId,
                            executionTime:   submissionData.executionTime || 0,
                            memoryUsed:      submissionData.memoryUsed || 0,
                            metadata:        submissionData.metadata || {}
                        }
                    });
                }
            }

            // 3. Update or Create Progress record
            const progress = await tx.progress.upsert({
                where: {
                    user_content_unique: {
                        studentId,
                        contentType,
                        contentId
                    }
                },
                update: {
                    status: 'completed',
                    lastAttemptAt: new Date(),
                    courseId,
                    [fkColumn]: contentId
                },
                create: {
                    studentId,
                    contentType,
                    contentId,
                    status: 'completed',
                    courseId,
                    [fkColumn]: contentId
                }
            });

            // 4. Award coins to User
            let totalAlphaCoins = 0;
            if (coinsEarned > 0) {
                const updatedUser = await tx.user.update({
                    where: { id: studentId },
                    data: {
                        alphaCoins: { increment: coinsEarned },
                        lastCoinUpdate: new Date()
                    },
                    select: { alphaCoins: true }
                });
                totalAlphaCoins = updatedUser.alphaCoins;
                
                // 5. Update Leaderboard (Batch) immediately for real-time consistency
                const Leaderboard = require('../models/Leaderboard');
                await Leaderboard.updateAlphaCoins(studentId, totalAlphaCoins);

                // 6. Update Course Leaderboard if inside a course
                if (courseId) {
                    const CourseLeaderboard = require('../models/CourseLeaderboard');
                    await CourseLeaderboard.updateStudentScore(courseId, studentId, coinsEarned);
                }

                // 7. Queue a full recalculation job as backup/enrichment (handles external scores sync etc)
                const { addScoreJob } = require('../config/queue');
                await addScoreJob(studentId);
            } else {
                const user = await tx.user.findUnique({ where: { id: studentId }, select: { alphaCoins: true } });
                totalAlphaCoins = user?.alphaCoins || 0;
            }

            return {
                success: true,
                isFirstSolve: !isAlreadyCompleted,
                coinsEarned,
                totalAlphaCoins,
                submission,
                progress
            };
        });
    }

    static _getFkColumn(contentType) {
        const mapping = {
            [CONTENT_TYPES.PROBLEM]: 'problemId',
            [CONTENT_TYPES.SQL]:     'sqlProblemId',
            [CONTENT_TYPES.VIDEO]:   'videoId',
            [CONTENT_TYPES.QUIZ]:    'quizId',
            [CONTENT_TYPES.ARTICLE]: 'articleId',
            [CONTENT_TYPES.PRACTICAL]: 'practicalExerciseId',
            [CONTENT_TYPES.ASSIGNMENT]: 'assignmentId',
        };
        return mapping[contentType] || 'problemId';
    }
}

module.exports = ProgressService;
