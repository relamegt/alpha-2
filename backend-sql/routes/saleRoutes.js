const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleGuard');

// Public routes
router.get('/active-banner', saleController.getActiveBanner);

// Admin routes
router.get('/', protect, adminOnly, saleController.getAllBanners);
router.post('/upsert', protect, adminOnly, saleController.upsertSaleBanner);
router.delete('/:id', protect, adminOnly, saleController.deleteBanner);

module.exports = router;
