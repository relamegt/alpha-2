const express = require('express');
const router = express.Router();
const sheetController = require('../controllers/sheetController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleGuard');

// Public/Student routes (authenticated)
router.get('/', protect, sheetController.getAllSheets);
router.get('/:sheetId', protect, sheetController.getSheetById);
router.get('/:sheetId/progress', protect, sheetController.getUserSheetProgress);
router.post('/progress/toggle-completion', protect, sheetController.toggleCompletion);
router.post('/progress/toggle-revision', protect, sheetController.toggleRevision);
router.get('/user/stats', protect, sheetController.getUserStats);

// Admin routes
router.post('/', protect, adminOnly, sheetController.createSheet);
router.put('/:sheetId', protect, adminOnly, sheetController.updateSheet);
router.delete('/:sheetId', protect, adminOnly, sheetController.deleteSheet);

router.post('/:sheetId/sections', protect, adminOnly, sheetController.addSection);
router.put('/sections/:sectionId', protect, adminOnly, sheetController.updateSection);
router.delete('/sections/:sectionId', protect, adminOnly, sheetController.deleteSection);

router.post('/sections/:sectionId/subsections', protect, adminOnly, sheetController.addSubsection);
router.put('/subsections/:subsectionId', protect, adminOnly, sheetController.updateSubsection);
router.delete('/subsections/:subsectionId', protect, adminOnly, sheetController.deleteSubsection);

// SheetProblem Management
router.get('/problems/search', protect, adminOnly, sheetController.searchProblems);
router.get('/problems/:problemId', protect, sheetController.getSheetProblemById);
router.post('/problems/batch', protect, sheetController.getBatchProblems);
router.post('/subsections/:subsectionId/problems', protect, adminOnly, sheetController.addProblemToSubsection);
router.post('/subsections/:subsectionId/problems/create', protect, adminOnly, sheetController.createProblemInSubsection);
router.put('/problems/:problemId', protect, adminOnly, sheetController.updateSheetProblem);
router.delete('/problems/:problemId/unlink', protect, adminOnly, sheetController.removeProblemFromSubsection);
router.delete('/problems/:problemId', protect, adminOnly, sheetController.deleteSheetProblem);

module.exports = router;
