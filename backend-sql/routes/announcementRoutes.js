const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleGuard');

router.get('/', protect, announcementController.getAllWithReadStatus);
router.get('/unread-count', protect, announcementController.getUnreadCount);
router.post('/mark-as-read/:id?', protect, announcementController.markAsRead);

// Admin routes
router.post('/', protect, adminOnly, announcementController.create);
router.put('/:announcementId', protect, adminOnly, announcementController.update);
router.delete('/:announcementId', protect, adminOnly, announcementController.delete);

module.exports = router;
