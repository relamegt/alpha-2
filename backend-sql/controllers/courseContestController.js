const CourseContest = require('../models/CourseContest');
const CourseContestSubmission = require('../models/CourseContestSubmission');
const Problem = require('../models/Problem');
const User = require('../models/User');
const { validateCode } = require('../services/judge0Service');
const prisma = require('../config/db');
const { notifyViolation } = require('../config/websocket');
const { getRedis } = require('../config/redis');
const { addScoreJob, addExecutionJob } = require('../config/queue');
const { VERDICTS, USER_ROLES, CONTENT_TYPES } = require('../utils/constants');
const { asyncHandler } = require('../utils/errorHandler');

// Get all course contests (Admin/Instructor)
const getAllCourseContests = async (req, res) => {
    try {
        const contests = await CourseContest.findAll();
        res.json({
            success: true,
            contests,
            count: contests.length
        });
    } catch (error) {
        console.error('Get all course contests error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch course contests' });
    }
};

// Create CourseContest
const createCourseContest = async (req, res) => {
    try {
        const {
            title, description, duration, maxAttempts,
            proctoringEnabled, tabSwitchLimit, maxViolations,
            rules, difficulty, coinsReward, problems,
            startTime, endTime // These should NOT be present
        } = req.body;

        if (startTime || endTime) {
            return res.status(400).json({
                success: false,
                message: "Course contests do not have start/end times"
            });
        }

        if (!title || !duration || !problems || !Array.isArray(problems)) {
            return res.status(400).json({
                success: false,
                message: "Title, duration, and problems are required"
            });
        }

        const contest = await CourseContest.create({
            title,
            description,
            duration: parseInt(duration),
            maxAttempts: parseInt(maxAttempts) || 1,
            proctoringEnabled: proctoringEnabled !== false,
            tabSwitchLimit: parseInt(tabSwitchLimit) || 3,
            maxViolations: parseInt(maxViolations) || 5,
            rules: rules || '',
            difficulty: difficulty || 'Medium',
            coinsReward: parseInt(coinsReward) || 0,
            createdBy: req.user.userId,
            problems
        });

        res.status(201).json({
            success: true,
            message: 'Course contest created successfully',
            contest
        });
    } catch (error) {
        console.error('Create course contest error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create course contest',
            error: error.message
        });
    }
};

// Get CourseContest by ID/Slug
const getCourseContestById = async (req, res) => {
    try {
        const { courseContestId } = req.params;
        const studentId = req.user.userId;
        const now = new Date();

        const contest = await CourseContest.findById(courseContestId);
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Course contest not found'
            });
        }

        let effectiveStartTime = null;
        let effectiveEndTime = null;
        let currentAttempt = 1;
        let hasStarted = false;

        if (req.user.role === USER_ROLES.STUDENT) {
            // Use read-only lookup — do NOT auto-create a start record here
            const startRecord = await CourseContestSubmission.getStartRecord(studentId, contest.id);

            if (startRecord) {
                hasStarted = true;
                currentAttempt = startRecord.attemptNumber || 1;
                effectiveStartTime = new Date(startRecord.submittedAt);
                const durationMs = (contest.duration || 60) * 60 * 1000;
                effectiveEndTime = new Date(effectiveStartTime.getTime() + durationMs);
            }
        }

        const hasSubmitted = hasStarted
            ? await CourseContestSubmission.hasSubmittedCourseContest(studentId, contest.id, currentAttempt)
            : false;

        if (req.user.role === 'student' && hasStarted) {
            const isTimeUp = effectiveEndTime && now > effectiveEndTime;
            contest.isAttemptCompleted = hasSubmitted || isTimeUp;
            contest.hasStarted = hasStarted;
            contest.currentAttempt = currentAttempt;

            // Always get best results to show current best score in sidebar
            const bestResults = await CourseContestSubmission.getBestScoreOverall(studentId, contest.id);
            contest.lastAttemptResults = bestResults;
        }

        const solvedProblemIds = hasStarted
            ? await CourseContestSubmission.getAcceptedProblems(studentId, contest.id, currentAttempt)
            : [];

        const problems = contest.problems.map((problem) => {
            if (!problem) return null;
            const isSolved = solvedProblemIds.includes(problem.id);

            // Hide test cases for active (not-yet-completed) attempts
            if (req.user.role === 'student' && !contest.isAttemptCompleted) {
                if (problem.testCases) {
                    problem.testCases = problem.testCases.map(tc => ({
                        input: tc.isHidden ? 'Hidden' : tc.input,
                        output: tc.isHidden ? 'Hidden' : tc.output,
                        isHidden: tc.isHidden
                    }));
                }
            }

            return {
                ...problem,
                isSolved
            };
        }).filter(Boolean);

        res.json({
            success: true,
            contest: {
                ...contest,
                problems,
                startTime: effectiveStartTime,
                endTime: effectiveEndTime,
                isSubmitted: hasSubmitted,
                hasStarted,
                currentAttempt: currentAttempt,
                isAttemptCompleted: contest.isAttemptCompleted || false,
                lastAttemptResults: contest.lastAttemptResults || null
            }
        });
    } catch (error) {
        console.error('Get course contest by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course contest',
            error: error.message
        });
    }
};

// Update CourseContest
const updateCourseContest = async (req, res) => {
    try {
        const { courseContestId } = req.params;
        const updateData = req.body;

        const contest = await CourseContest.findById(courseContestId);
        if (!contest) {
            return res.status(404).json({ success: false, message: 'Course contest not found' });
        }

        await CourseContest.update(courseContestId, updateData);
        res.json({
            success: true,
            message: 'Course contest updated successfully'
        });
    } catch (error) {
        console.error('Update course contest error:', error);
        res.status(500).json({ success: false, message: 'Failed to update course contest' });
    }
};

// Delete CourseContest
const deleteCourseContest = async (req, res) => {
    try {
        const { courseContestId } = req.params;
        await CourseContest.delete(courseContestId);
        res.json({
            success: true,
            message: 'Course contest deleted successfully'
        });
    } catch (error) {
        console.error('Delete course contest error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete course contest' });
    }
};

// Submit code
const submitCourseContestCode = async (req, res) => {
    const studentId = req.user.userId;
    const { courseContestId } = req.params;
    const { problemId, code, language, tabSwitchCount, tabSwitchDuration, pasteAttempts, fullscreenExits, isAutoSubmit } = req.body;
    const redis = getRedis();
    const lockKey = `lock:cc_submission:${studentId}:${problemId}`;

    try {
        const acquired = await redis.set(lockKey, 'LOCKED', 'NX', 'EX', 30);
        if (!acquired) {
            return res.status(429).json({ success: false, message: 'Submission in progress' });
        }

        if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

        const problem = await prisma.problem.findUnique({ where: { id: problemId } });
        if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });

        if (problem.type !== 'sql') {
            const validation = validateCode(code, language);
            if (!validation.valid) return res.status(400).json({ success: false, message: 'Invalid code' });
        }

        const contest = await CourseContest.findById(courseContestId);
        if (!contest) return res.status(404).json({ success: false, message: 'Contest not found' });

        const startRecord = await CourseContestSubmission.getOrCreateStartRecord(studentId, contest.id);
        const effectiveStartTime = new Date(startRecord.submittedAt);
        const durationMs = (contest.duration || 60) * 60 * 1000;
        const effectiveEndTime = new Date(effectiveStartTime.getTime() + durationMs);

        if (new Date() > effectiveEndTime) {
            return res.status(400).json({ success: false, message: 'Contest window expired' });
        }

        await addExecutionJob({
            type: 'cc_submit',
            studentId,
            courseContestId: contest.id,
            problemId,
            code,
            language,
            tabSwitchCount,
            tabSwitchDuration,
            pasteAttempts,
            fullscreenExits,
            isAutoSubmit,
            timeLimit: problem.timeLimit || 2000,
            attemptNumber: startRecord.attemptNumber || 1
        });

        res.json({ success: true, isProcessing: true, message: 'Submission processing...' });
    } catch (error) {
        await redis.del(lockKey);
        res.status(500).json({ success: false, message: 'Submission failed' });
    }
};

    // Run code
const runCourseContestCode = async (req, res) => {
    try {
        const { courseContestId } = req.params;
        const { problemId, code, language, customInput } = req.body;

        // BUG FIX: null-check problem before using problem.timeLimit
        const problem = await prisma.problem.findUnique({ where: { id: problemId } });
        if (!problem) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        await addExecutionJob({
            type: 'cc_run',
            studentId: req.user.userId,
            courseContestId,
            problemId,
            code,
            language,
            customInput,
            timeLimit: problem.timeLimit || 2000
        });

        res.json({ success: true, isProcessing: true, message: 'Code running...' });
    } catch (error) {
        console.error('runCourseContestCode error:', error);
        res.status(500).json({ success: false, message: 'Execution failed', error: error.message });
    }
};

// Finish contest
const finishCourseContest = async (req, res) => {
    const studentId = req.user.userId;
    const { courseContestId } = req.params;
    const { score, violations, attemptNumber, tabSwitchCount, tabSwitchDuration, fullscreenExits, pasteAttempts } = req.body;
    const redis = getRedis();
    const lockKey = `lock:cc_finish:${studentId}:${courseContestId}`;

    try {
        const acquired = await redis.set(lockKey, 'LOCKED', 'NX', 'EX', 10);
        if (!acquired) return res.status(429).json({ success: false, message: 'Finish request in progress' });

        // Ensure the student actually has a start record before finishing
        const startRecord = await CourseContestSubmission.getStartRecord(studentId, courseContestId);
        if (!startRecord) {
            // No start record — nothing to finish; treat as already done
            return res.json({ success: true, message: 'Contest already completed or not started' });
        }

        const currentAttempt = attemptNumber || startRecord.attemptNumber || 1;

        // Idempotent: if already completed for this attempt, return success without re-running
        const alreadyFinished = await CourseContestSubmission.hasSubmittedCourseContest(studentId, courseContestId, currentAttempt);
        if (alreadyFinished) {
            return res.json({ success: true, message: 'Contest already completed' });
        }

        const finalViolations = violations || {
            tabSwitchCount: tabSwitchCount || 0,
            tabSwitchDuration: tabSwitchDuration || 0,
            fullscreenExits: fullscreenExits || 0,
            pasteAttempts: pasteAttempts || 0
        };

        await CourseContestSubmission.markCourseContestCompleted(studentId, courseContestId, score || 0, finalViolations, currentAttempt);

        res.json({ success: true, message: 'Contest completed' });
    } catch (error) {
        console.error('finishCourseContest error:', error);
        res.status(500).json({ success: false, message: 'Failed to finish contest' });
    } finally {
        await redis.del(lockKey);
    }
};

// Leaderboard
const getCourseContestLeaderboard = async (req, res) => {
    try {
        const { courseContestId } = req.params;
        const { page, limit } = req.query;
        const parsedPage = parseInt(page) || 1;
        const parsedLimit = parseInt(limit) || 50;
        const result = await CourseContestSubmission.getLeaderboard(courseContestId, req.user.userId, parsedPage, parsedLimit);
        
        // Fetch the full contest with problems populated for per-problem columns and totalProblems
        const CourseContest = require('../models/CourseContest');
        const contestData = await CourseContest.findById(courseContestId);
        
        if (!contestData) {
            return res.status(404).json({ success: false, message: 'Course contest not found' });
        }

        // Build problems array with _id and title for frontend column headers
        const problems = (contestData.problems || []).map(p => ({
            _id: p.id || p._id,
            id: p.id || p._id,
            title: p.title || 'Untitled',
            points: p.points || 0
        }));
        const totalProblems = problems.length || contestData.problemIds?.length || 0;

        // ─── OPTIMIZED BULK FETCH ──────────────────────────────────────────────────
        // 1. Get all student IDs in the current leaderboard page
        const studentIds = result.leaderboard.map(e => e.studentId);
        if (studentIds.length === 0) {
            return res.json({ success: true, leaderboard: [], total: 0 });
        }

        // 2. Bulk fetch all relevant submissions for these students in this contest
        // This avoids N * 4 queries and replaces them with 3 total queries.
        const [allAcceptedSubs, allAttemptSubs, allStartRecords] = await Promise.all([
            prisma.courseContestSubmission.findMany({
                where: { studentId: { in: studentIds }, courseContestId, verdict: 'Accepted', problemId: { not: null } },
                select: { studentId: true, problemId: true, submittedAt: true },
            }),
            prisma.courseContestSubmission.findMany({
                where: { 
                    studentId: { in: studentIds }, 
                    courseContestId, 
                    problemId: { not: null },
                    verdict: { notIn: ['STARTED', 'VIOLATION_LOG', 'COMPLETED'] }
                },
                select: { studentId: true, problemId: true, verdict: true }
            }),
            prisma.courseContestSubmission.findMany({
                where: { studentId: { in: studentIds }, courseContestId, verdict: 'STARTED' },
                select: { studentId: true, submittedAt: true, attemptNumber: true },
                orderBy: { submittedAt: 'asc' }
            })
        ]);

        // 3. Map records to students for fast lookup
        const acceptedByStudent = {};
        const totalByStudent    = {};
        const startByStudent    = {};

        allAcceptedSubs.forEach(s => {
            if (!acceptedByStudent[s.studentId]) acceptedByStudent[s.studentId] = new Map();
            // Store earliest acceptance per problem
            if (!acceptedByStudent[s.studentId].has(s.problemId)) {
                acceptedByStudent[s.studentId].set(s.problemId, s.submittedAt);
            }
        });

        allAttemptSubs.forEach(s => {
            if (!totalByStudent[s.studentId]) totalByStudent[s.studentId] = {};
            if (!totalByStudent[s.studentId][s.problemId]) totalByStudent[s.studentId][s.problemId] = 0;
            totalByStudent[s.studentId][s.problemId]++;
        });

        allStartRecords.forEach(s => {
            if (!startByStudent[s.studentId]) startByStudent[s.studentId] = {};
            // Record earliest start per student (or per attempt if needed)
            if (!startByStudent[s.studentId][s.attemptNumber]) startByStudent[s.studentId][s.attemptNumber] = s.submittedAt;
        });

        // 4. Enrich leaderboard entries using the maps
        const enrichedLeaderboard = result.leaderboard.map((entry) => {
            const problemsMap = {};
            const studentStartTimes = startByStudent[entry.studentId] || {};
            const studentStarts = Object.values(studentStartTimes).sort((a,b) => new Date(a) - new Date(b));
            const contestStartTime = studentStarts[0] ? new Date(studentStarts[0]) : null;

            for (const prob of problems) {
                const pid = prob._id;
                const acceptedTime = acceptedByStudent[entry.studentId]?.get(pid);
                const tries = totalByStudent[entry.studentId]?.[pid] || 0;

                let relTime = null;
                if (acceptedTime && contestStartTime) {
                    relTime = (new Date(acceptedTime) - contestStartTime) / (1000 * 60);
                }

                problemsMap[pid] = {
                    status: acceptedTime ? 'Accepted' : (tries > 0 ? 'Wrong Answer' : 'Not Attempted'),
                    tries: tries,
                    submittedAt: relTime
                };
            }

            return {
                ...entry,
                problems: problemsMap,
                status: entry.completedAt ? 'Finished' : 'In Progress',
                totalViolations: (entry.tabSwitchCount || 0) + (entry.fullscreenExits || 0)
            };
        });
        // ─── END OPTIMIZATION ───────────────────────────────────────────────────────

        // Build contest object matching the shape from regular contest leaderboard
        const contestObj = {
            id: contestData.id,
            _id: contestData.id,
            title: contestData.title,
            description: contestData.description || '',
            duration: contestData.duration,
            proctoringEnabled: contestData.proctoringEnabled,
            tabSwitchLimit: contestData.tabSwitchLimit,
            maxViolations: contestData.maxViolations,
            totalProblems,
            problems
        };

        res.json({
            success: true,
            contest: contestObj,
            count: enrichedLeaderboard.length,
            total: result.total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(result.total / parsedLimit),
            leaderboard: enrichedLeaderboard,
            totalProblems
        });
    } catch (error) {
        console.error('getCourseContestLeaderboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
    }
};

// Student Submissions
const getStudentCourseContestSubmissions = async (req, res) => {
    try {
        const { courseContestId } = req.params;
        const { attemptNumber } = req.query;
        const submissions = await CourseContestSubmission.findByStudentAndCourseContest(req.user.userId, courseContestId, attemptNumber ? parseInt(attemptNumber) : null);
        res.json({ success: true, submissions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
    }
};

// Statistics
const getCourseContestStatistics = async (req, res) => {
    try {
        const { courseContestId } = req.params;
        const stats = await CourseContest.getStatistics(courseContestId);
        res.json({ success: true, statistics: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
};

// Proctoring Violatons
const getProctoringViolations = async (req, res) => {
    try {
        const { courseContestId, studentId } = req.params;
        const { attemptNumber } = req.query;
        const violations = await CourseContestSubmission.getProctoringViolations(studentId, courseContestId, attemptNumber ? parseInt(attemptNumber) : 1);
        res.json({ success: true, violations });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch violations' });
    }
};

// Log Violation
const logViolation = async (req, res) => {
    try {
        const { courseContestId } = req.params;
        const { violations, attemptNumber } = req.body;
        await CourseContestSubmission.logViolation(req.user.userId, courseContestId, violations, attemptNumber);
        res.json({ success: true, message: 'Violation logged' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to log violation' });
    }
};

// Start New Attempt
const startNewAttempt = async (req, res) => {
    try {
        const { courseContestId } = req.params;
        const studentId = req.user.userId;

        // Check if student has already started at all
        const existingStart = await CourseContestSubmission.getStartRecord(studentId, courseContestId);

        let record;
        if (!existingStart) {
            // First time starting — create attempt 1
            record = await CourseContestSubmission.getOrCreateStartRecord(studentId, courseContestId);
        } else {
            // Re-attempt — create next attempt number
            record = await CourseContestSubmission.startNewAttempt(studentId, courseContestId);
        }

        res.json({ success: true, startRecord: record });
    } catch (error) {
        console.error('startNewAttempt error:', error);
        res.status(500).json({ success: false, message: 'Failed to start new attempt' });
    }
};

// Get CourseContests by Course
const getCourseContestsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        
        // 1. Fetch the course to see which contests are linked in the tree
        const course = await prisma.course.findUnique({
            where: { id: courseId }
        });

        if (!course) {
            // Check by slug if ID not found
            const courseBySlug = await prisma.course.findUnique({ where: { slug: courseId } });
            if (!courseBySlug) return res.status(404).json({ success: false, message: 'Course not found' });
            return getCourseContestsByCourse({ ...req, params: { courseId: courseBySlug.id } }, res);
        }

        // 2. Extract all courseContestIds from sections JSON
        const linkedContestIds = new Set();
        (course.sections || []).forEach(section => {
            (section.subsections || []).forEach(sub => {
                (sub.courseContestIds || []).forEach(cid => {
                    const id = typeof cid === 'object' && cid?.$oid ? cid.$oid : cid;
                    if (id) linkedContestIds.add(String(id));
                });
            });
        });

        // 3. Fetch all these contests (and also any that have this courseId set directly)
        const rawContests = await prisma.courseContest.findMany({
            where: {
                OR: [
                    { id: { in: Array.from(linkedContestIds) } },
                    { courseId: course.id }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        // Use model to populate problems correctly from problemIds array
        const contests = await Promise.all(rawContests.map(async c => {
            const populated = await CourseContest._populateProblems(c);
            if (req.user && req.user.role === 'student') {
                const CourseContestSubmission = require('../models/CourseContestSubmission');
                const isCompleted = await CourseContestSubmission.hasSubmittedCourseContest(req.user.userId, c.id);
                populated.isSubmitted = isCompleted;
                populated.isSolved = isCompleted;
            }
            return populated;
        }));

        res.json({ success: true, contests });
    } catch (error) {
        console.error('Get course contests error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contests linked to this course' });
    }
};

module.exports = {
    getAllCourseContests,
    createCourseContest,
    getCourseContestById,
    getCourseContestsByCourse,
    updateCourseContest,
    deleteCourseContest,
    submitCourseContestCode,
    runCourseContestCode,
    finishCourseContest,
    getCourseContestLeaderboard,
    getStudentCourseContestSubmissions,
    getCourseContestStatistics,
    getProctoringViolations,
    logViolation,
    startNewAttempt
};
