const express = require('express');
const router = express.Router();
const interviewExperienceController = require('../controllers/interviewExperienceController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public routes (with optional auth for isUpvoted status)
router.get('/meta/popular-companies', interviewExperienceController.getPopularCompanies);
router.get('/', optionalAuth, interviewExperienceController.getAllExperiences);
router.get('/:id', optionalAuth, interviewExperienceController.getExperienceById);

// Protected routes
router.post('/', protect, interviewExperienceController.createExperience);
router.put('/:id', protect, interviewExperienceController.updateExperience);
router.delete('/bulk', protect, interviewExperienceController.bulkDeleteExperiences);
router.delete('/:id', protect, interviewExperienceController.deleteExperience);
router.post('/:id/upvote', protect, interviewExperienceController.upvoteExperience);

module.exports = router;
