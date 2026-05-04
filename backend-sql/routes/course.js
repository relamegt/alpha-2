const express = require('express');
const router = express.Router();
const {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    addSection,
    updateSection,
    deleteSection,
    addSubsection,
    updateSubsection,
    deleteSubsection,
    addProblemToSection,
    removeProblemFromSection,
    addContestToSection,
    removeContestFromSection,
    addProblemToSubsection,
    removeProblemFromSubsection,
    addContestToSubsection,
    removeContestFromSubsection,
    getSubsectionContent
} = require('../controllers/courseController');
const { verifyToken, protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleGuard');
const courseAccessGuard = require('../middleware/accessGuard');

// DIAGNOSTIC (MOVE TO TOP - NO AUTH)
router.get('/v2/focused-data/:courseId/:subsectionId', getSubsectionContent);

// Base authentication required for all AFTER
router.use(protect);

// Public (Authenticated) Routes for Courses
router.get('/:courseId/subsections/:subsectionId', courseAccessGuard, getSubsectionContent); 

router.route('/')
    .get(getAllCourses)
    .post(adminOnly, createCourse);

router.route('/:id')
    .get(courseAccessGuard, getCourseById)
    .put(adminOnly, updateCourse)
    .delete(adminOnly, deleteCourse);

// Admin Only Routes for Sections, Subsections & Problems
router.use(adminOnly);

// Sections
router.route('/:courseId/sections')
    .post(addSection);

router.route('/:courseId/sections/:sectionId')
    .put(updateSection)
    .delete(deleteSection);

// Subsections
router.route('/:courseId/sections/:sectionId/subsections')
    .post(addSubsection);

router.route('/:courseId/sections/:sectionId/subsections/:subsectionId')
    .put(updateSubsection)
    .delete(deleteSubsection);

// Problems within Sections
router.route('/:courseId/sections/:sectionId/problems')
    .post(addProblemToSection)
    .delete(removeProblemFromSection);

router.route('/:courseId/sections/:sectionId/problems/:problemId')
    .delete(removeProblemFromSection);

// Contests within Sections
router.route('/:courseId/sections/:sectionId/contests')
    .post(addContestToSection)
    .delete(removeContestFromSection);

router.route('/:courseId/sections/:sectionId/contests/:contestId')
    .delete(removeContestFromSection);

// Problems within Subsections
router.route('/:courseId/sections/:sectionId/subsections/:subsectionId/problems')
    .post(addProblemToSubsection)
    .delete(removeProblemFromSubsection);

router.route('/:courseId/sections/:sectionId/subsections/:subsectionId/problems/:problemId')
    .delete(removeProblemFromSubsection);

// Contests within Subsections
router.route('/:courseId/sections/:sectionId/subsections/:subsectionId/contests')
    .post(addContestToSubsection)
    .delete(removeContestFromSubsection);

router.route('/:courseId/sections/:sectionId/subsections/:subsectionId/contests/:contestId')
    .delete(removeContestFromSubsection);

module.exports = router;
