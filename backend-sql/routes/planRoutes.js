const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleGuard');

// Public routes
router.get('/active', planController.getActivePlans);

// Admin routes
router.get('/', protect, adminOnly, planController.getAllPlans);
router.post('/', protect, adminOnly, planController.createPlan);
router.put('/:id', protect, adminOnly, planController.updatePlan);
router.delete('/:id', protect, adminOnly, planController.deletePlan);

module.exports = router;
