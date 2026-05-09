const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const contestController = require('../controllers/contestController');
const { verifyToken } = require('../middleware/auth');
const { adminOnly, instructorOrAdmin } = require('../middleware/roleGuard');
const { validateBatchCreation, validateFileUpload, validateContestCreation, validateObjectId } = require('../middleware/validation');
const { fileUploadLimiter } = require('../middleware/rateLimiter');

// Configure multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// All routes require authentication
router.use(verifyToken);

// ============================================
// BATCH MANAGEMENT ROUTES
// ============================================
router.post('/batches', adminOnly, validateBatchCreation, adminController.createBatch);
router.get('/batches', instructorOrAdmin, adminController.getAllBatches);
router.put('/batches/:batchId', adminOnly, adminController.updateBatch);
router.post('/batches/:batchId/extend', adminOnly, adminController.extendBatchExpiry);
router.get('/batches/:batchId/statistics', instructorOrAdmin, adminController.getBatchStatistics);
router.delete('/batches/:batchId', adminOnly, adminController.deleteBatch);

// ============================================
// USER MANAGEMENT (WITHIN BATCH) ROUTES
// ============================================
router.post('/batches/:batchId/users', adminOnly, adminController.addUserToBatch);
router.post('/batches/:batchId/users/bulk',
    adminOnly,
    upload.single('file'),
    fileUploadLimiter,
    validateFileUpload,
    adminController.bulkAddUsersToBatch
);
router.get('/batches/:batchId/users', instructorOrAdmin, adminController.getBatchUsers);
router.delete('/batches/:batchId/users/:userId', adminOnly, adminController.removeUserFromBatch);

// ============================================
// ADMIN USER MANAGEMENT ROUTES
// ============================================
router.post('/admins', adminOnly, adminController.createAdminUser);
router.get('/users', adminOnly, adminController.getAllUsers);
router.get('/analytics', adminOnly, adminController.getSystemAnalytics);
router.delete('/users/:userId', adminOnly, adminController.deleteUser);

// ============================================
// SUBSCRIPTION & PLAN MANAGEMENT
// ============================================
router.get('/subscriptions', adminOnly, adminController.getAllSubscriptions);
router.post('/users/assign-plan', adminOnly, adminController.assignPlanByEmail);

module.exports = router;
