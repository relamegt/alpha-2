const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateProblemCreation } = require('../middleware/validation');

router.get('/', protect, videoController.getAllVideos);
router.get('/:id', protect, videoController.getVideoById);

router.post('/', protect, restrictTo('admin', 'instructor'), validateProblemCreation, videoController.createVideo);
router.put('/:id', protect, restrictTo('admin', 'instructor'), videoController.updateVideo);
router.delete('/:id', protect, restrictTo('admin', 'instructor'), videoController.deleteVideo);
router.delete('/bulk', protect, restrictTo('admin', 'instructor'), videoController.bulkDeleteVideos);

module.exports = router;
