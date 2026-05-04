const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const interviewSessionController = require('../controllers/interviewSessionController');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(protect, restrictTo('student'));

router.post('/sessions', interviewSessionController.createSession);
router.get('/sessions', interviewSessionController.listSessions);
router.get('/sessions/:id', interviewSessionController.getSession);
router.patch('/sessions/:id', interviewSessionController.updateSession);

// Resume parsing (PDF -> text)
router.post('/resume/parse', upload.single('resume'), interviewSessionController.parseResume);

module.exports = router;
