const express = require('express');
const router = express.Router();
const { 
    getCourseAnalytics, 
    getOverallAnalytics, 
    getCourseLeaderboardPaged,
    getGlobalLeaderboardPaged 
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

// All analytics routes require authentication
router.use(protect);

// Student overall dashboard analytics
router.get('/overall', getOverallAnalytics);

// Course specific analytics
router.get('/course/:courseId', getCourseAnalytics);

// Course specific paged leaderboard
router.get('/course/:courseId/leaderboard', getCourseLeaderboardPaged);

// Global paged leaderboard
router.get('/global/leaderboard', getGlobalLeaderboardPaged);

module.exports = router;
