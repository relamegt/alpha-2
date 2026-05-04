const express = require('express');
const router = express.Router();
const User = require('../models/User');
const publicController = require('../controllers/publicController');
const { optionalAuth, protect } = require('../middleware/auth');
const courseAccessGuard = require('../middleware/accessGuard');

// Get public stats for homepage (no auth required)
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.getTotalUsersCount();

        res.json({
            success: true,
            stats: {
                totalUsersEverCreated: totalUsers
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stats'
        });
    }
});

// Get user public profile
router.get('/profile/:username', optionalAuth, publicController.getPublicProfile);

// Get specific Subsection Data (Direct Focus Bypass)
router.get('/courses/focus/:courseId/:subsectionId', protect, courseAccessGuard, publicController.getModuleFocusedData);

// Check if username exists
router.get('/check-username/:username', publicController.checkUsername);

// Get published courses for catalog
router.get('/courses', optionalAuth, publicController.getPublishedCourses);

// Get single course details
router.get('/courses/:courseId', optionalAuth, publicController.getCourseDetails);

module.exports = router;
