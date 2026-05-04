const express = require('express');
const router = express.Router();
const controller = require('../controllers/publicArticleController');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');

// Public routes (using optionalAuth to check if user is logged in for "isSaved" status)
router.get('/', optionalAuth, controller.getAllArticles);
router.get('/categories', controller.getCategories);
router.get('/recent', controller.getRecentArticles);
router.get('/:slug', optionalAuth, controller.getArticleBySlug);

// Protected routes
router.post('/:articleId/toggle-save', protect, controller.toggleSaveArticle);
router.post('/:id/mark-as-read', protect, controller.markAsRead);
router.get('/user/saved', protect, controller.getSavedArticles);

// Admin routes
router.post('/', protect, restrictTo('admin'), controller.createArticle);
router.put('/:id', protect, restrictTo('admin'), controller.updateArticle);
router.delete('/:id', protect, restrictTo('admin'), controller.deleteArticle);

module.exports = router;
