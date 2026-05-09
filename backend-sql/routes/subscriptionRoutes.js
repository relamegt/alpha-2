const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

router.get('/plan', protect, subscriptionController.getCurrentPlan);
router.post('/create-order', protect, subscriptionController.createSubscriptionOrder);
router.post('/verify-payment', protect, subscriptionController.verifySubscriptionPayment);

module.exports = router;
