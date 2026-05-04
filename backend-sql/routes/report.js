const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const leaderboardController = require('../controllers/leaderboardController');
const courseLeaderboardController = require('../controllers/courseLeaderboardController');
const { verifyToken } = require('../middleware/auth');
const { instructorOrAdmin, checkOwnership } = require('../middleware/roleGuard');
const { validateObjectId } = require('../middleware/validation');
const { reportLimiter } = require('../middleware/rateLimiter');
const Contest = require('../models/Contest');

const resolveContestSlug = async (req, res, next, contestId) => {
    if (contestId && contestId !== 'global' && contestId !== 'all' && !/^[0-9a-fA-F]{24}$/.test(contestId)) {
        try {
            // Check standard contests
            let contest = await Contest.findById(contestId);
            if (!contest) {
                // Check course contests
                const CourseContest = require('../models/CourseContest');
                contest = await CourseContest.findById(contestId);
            }

            if (contest) {
                req.params.contestId = contest.id.toString();
            } else {
                return res.status(404).json({ success: false, message: 'Contest not found' });
            }
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server error resolving contest' });
        }
    }
    next();
};

router.param('contestId', resolveContestSlug);

router.use(verifyToken);

// Leaderboards - SINGLE CALL, NO FILTERS
router.get('/leaderboard/batch/:batchId', validateObjectId('batchId'), leaderboardController.getBatchLeaderboard);
router.get('/leaderboard/batch/:batchId/external-all', validateObjectId('batchId'), leaderboardController.getAllExternalData); // NEW: Get ALL platforms at once
router.get('/leaderboard/contest/:contestId', validateObjectId('contestId'), leaderboardController.getInternalContestLeaderboard);
router.get('/leaderboard/top', leaderboardController.getTopPerformers);
router.get('/leaderboard/student/:studentId/rank', validateObjectId('studentId'), leaderboardController.getStudentRank);
router.get('/leaderboard/course/:courseId', courseLeaderboardController.getCourseLeaderboard);

// Reports (Admin/Instructor only)
router.get('/batch/:batchId', instructorOrAdmin, validateObjectId('batchId'), reportLimiter, reportController.getReport);
router.get('/batch/:batchId/export/csv', instructorOrAdmin, validateObjectId('batchId'), reportLimiter, reportController.exportCSVReport);
router.get('/batch/:batchId/export/pdf', instructorOrAdmin, validateObjectId('batchId'), reportLimiter, reportController.exportPDFReport);
router.get('/batch/:batchId/analytics', instructorOrAdmin, validateObjectId('batchId'), reportController.getBatchAnalytics);

// Contest reports
router.get('/contest/:contestId', instructorOrAdmin, validateObjectId('contestId'), reportController.getContestReport);
router.get('/contest/:contestId/export/csv', instructorOrAdmin, validateObjectId('contestId'), reportLimiter, reportController.exportContestCSV);

// Student reports
router.get('/student/:studentId', validateObjectId('studentId'), checkOwnership('studentId'), reportController.getStudentDetailedReport);

// Course reports
router.get('/course/:courseId', instructorOrAdmin, courseLeaderboardController.generateCourseReport);

// Assignment reports
router.get('/assignment/:id/analytics', instructorOrAdmin, reportController.getAssignmentAnalytics);

module.exports = router;
