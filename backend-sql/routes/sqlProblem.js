const express = require('express');
const router = express.Router();
const sqlProblemController = require('../controllers/sqlProblemController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateProblemCreation } = require('../middleware/validation');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

router.get('/', protect, sqlProblemController.getAllProblems);
router.get('/:id', protect, sqlProblemController.getProblemById);

router.post('/', protect, restrictTo('admin', 'instructor'), validateProblemCreation, sqlProblemController.createProblem);
router.post('/bulk', protect, restrictTo('admin', 'instructor'), upload.single('file'), sqlProblemController.bulkCreateProblems);
router.put('/:id', protect, restrictTo('admin', 'instructor'), sqlProblemController.updateProblem);
router.delete('/:id', protect, restrictTo('admin', 'instructor'), sqlProblemController.deleteProblem);

module.exports = router;
