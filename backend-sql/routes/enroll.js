const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { protect } = require('../middleware/auth');

// Free enrollment
router.post('/free', protect, enrollmentController.enrollFree);

// Paid enrollment - Create Order
router.post('/create-order', protect, enrollmentController.createOrder);

// Paid enrollment - Verify Payment
router.post('/verify-payment', protect, enrollmentController.verifyPayment);

module.exports = router;
