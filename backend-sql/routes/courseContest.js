const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/courseContestController');
const { requireRole, instructorOrAdmin } = require('../middleware/roleGuard');
const { verifyToken } = require('../middleware/auth');
const CourseContest = require('../models/CourseContest');

const resolveCourseContestSlug = async (req, res, next, courseContestId) => {
    if (courseContestId && !/^[0-9a-fA-F-]{36}$/.test(courseContestId)) {
        try {
            const contest = await CourseContest.findById(courseContestId);
            if (contest) {
                req.params.courseContestId = contest.id;
            } else {
                return res.status(404).json({ success: false, message: 'Contest not found' });
            }
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server error resolving contest slug' });
        }
    }
    next();
};

router.param('courseContestId', resolveCourseContestSlug);

// Admin/Instructor routes
router.get('/', verifyToken, instructorOrAdmin, getAllCourseContests);
router.post('/', verifyToken, instructorOrAdmin, createCourseContest);
router.get('/admin/all', verifyToken, instructorOrAdmin, getAllCourseContests); // Compatibility alias
router.put('/:courseContestId', verifyToken, instructorOrAdmin, updateCourseContest);
router.delete('/:courseContestId', verifyToken, instructorOrAdmin, deleteCourseContest);
router.get('/:courseContestId/statistics', verifyToken, instructorOrAdmin, getCourseContestStatistics);

// Participant/Student routes
router.get('/:courseContestId', verifyToken, getCourseContestById);
router.get('/course/:courseId', verifyToken, getCourseContestsByCourse);
router.get('/:courseContestId/leaderboard', verifyToken, getCourseContestLeaderboard);
router.get('/:courseContestId/submissions', verifyToken, getStudentCourseContestSubmissions);
router.post('/:courseContestId/submit', verifyToken, requireRole('student', 'instructor', 'admin'), submitCourseContestCode);
router.post('/:courseContestId/run', verifyToken, requireRole('student', 'instructor', 'admin'), runCourseContestCode);
router.post('/:courseContestId/finish', verifyToken, requireRole('student', 'instructor', 'admin'), finishCourseContest);
router.post('/:courseContestId/start-attempt', verifyToken, requireRole('student', 'instructor', 'admin'), startNewAttempt);
router.get('/:courseContestId/violations/:studentId', verifyToken, getProctoringViolations);
router.post('/:courseContestId/violations', verifyToken, requireRole('student', 'instructor', 'admin'), logViolation);

module.exports = router;
