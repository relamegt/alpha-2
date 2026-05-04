const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateProblemCreation } = require('../middleware/validation');

router.get('/', protect, articleController.getAllArticles);
router.get('/:id', protect, articleController.getArticleById);

router.post('/', protect, restrictTo('admin', 'instructor'), validateProblemCreation, articleController.createArticle);
router.put('/:id', protect, restrictTo('admin', 'instructor'), articleController.updateArticle);
router.delete('/:id', protect, restrictTo('admin', 'instructor'), articleController.deleteArticle);

module.exports = router;
