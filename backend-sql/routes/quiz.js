const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateProblemCreation } = require('../middleware/validation');

router.get('/', protect, quizController.getAllQuizzes);
router.get('/:id', protect, quizController.getQuizById);

router.post('/', protect, restrictTo('admin', 'instructor'), validateProblemCreation, quizController.createQuiz);
router.put('/:id', protect, restrictTo('admin', 'instructor'), quizController.updateQuiz);
router.delete('/:id', protect, restrictTo('admin', 'instructor'), quizController.deleteQuiz);

module.exports = router;
