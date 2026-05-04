const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleGuard');

router.get('/', protect, jobController.getAllJobs);
router.get('/search', protect, jobController.searchJobs);
router.get('/:jobId', protect, jobController.getJobById);

// Admin/System routes
router.post('/batch', protect, adminOnly, jobController.storeJobs);
router.post('/', protect, adminOnly, jobController.createJob);
router.put('/:jobId', protect, adminOnly, jobController.updateJob);
router.delete('/:jobId', protect, adminOnly, jobController.deleteJob);

module.exports = router;
