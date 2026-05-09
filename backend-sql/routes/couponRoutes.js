const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleGuard');

// Public/Student routes
router.post('/validate', protect, couponController.validateCoupon);

// Admin routes
router.get('/', protect, adminOnly, couponController.getAllCoupons);
router.post('/', protect, adminOnly, couponController.createCoupon);
router.put('/:id', protect, adminOnly, couponController.updateCoupon);
router.delete('/:id', protect, adminOnly, couponController.deleteCoupon);

module.exports = router;
