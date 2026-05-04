const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { protect } = require('../middleware/auth');

router.get('/', protect, contentController.getContent);
router.get('/:idOrSlug', protect, contentController.getContentById);

module.exports = router;
