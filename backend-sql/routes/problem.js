const express = require('express');
const router = express.Router();
const multer = require('multer');
const problemController = require('../controllers/problemController');
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleGuard');
const { validateProblemCreation, validateObjectId, validateProblemFileUpload } = require('../middleware/validation');
const { fileUploadLimiter } = require('../middleware/rateLimiter');
const ProblemModel = require('../models/Problem');
const SqlProblemModel = require('../models/SqlProblem');
const VideoModel = require('../models/Video');
const QuizModel = require('../models/Quiz');
const PrivateArticleModel = require('../models/PrivateArticle');
const AssignmentModel = require('../models/Assignment');

const resolveProblemSlug = async (req, res, next, problemId) => {
    if (problemId && problemId !== 'bulk') {
        try {
            const models = [
                ProblemModel,
                SqlProblemModel,
                VideoModel,
                QuizModel,
                PrivateArticleModel,
                AssignmentModel
            ];
            
            let foundItem = null;
            let foundType = '';

            for (const M of models) {
                if (!M || typeof M.findById !== 'function') continue;
                try {
                    foundItem = await M.findById(problemId);
                    if (foundItem) {
                        foundType = M.name;
                        break;
                    }
                } catch (e) {
                    console.error(`[Slug Resolve] Model ${M.name || 'Unknown'} failed:`, e.message);
                    continue; 
                }
            }

            if (foundItem && foundItem.id) {
                req.params.problemId = String(foundItem.id);
            } else if (foundItem) {
                // Found but no ID? Fallback to whatever we found if it has _id
                req.params.problemId = String(foundItem._id || problemId);
            } else {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Content not found with this ID or slug',
                    attemptedId: problemId 
                });
            }
        } catch (error) {
            console.error('[Slug Resolve Critical Error]:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error resolving slug', 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
            });
        }
    }
    next();
};

router.param('problemId', resolveProblemSlug);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit for problem bulk uploads
});

router.use(verifyToken);

// Public problem routes (all authenticated users)
router.get('/', problemController.getAllProblems);
router.get('/difficulty/count', problemController.getDifficultyWiseCount);
router.get('/:problemId', validateObjectId('problemId'), problemController.getProblemById);
router.post('/:problemId/view-editorial', validateObjectId('problemId'), problemController.viewEditorial);

// Admin-only routes
router.post('/', adminOnly, validateProblemCreation, problemController.createProblem);
router.post('/bulk', adminOnly, upload.single('file'), fileUploadLimiter, validateProblemFileUpload, problemController.bulkCreateProblems);
router.delete('/bulk', adminOnly, problemController.bulkDeleteProblems);
router.put('/:problemId', adminOnly, validateObjectId('problemId'), problemController.updateProblem);
router.put('/:problemId/solution-code', adminOnly, validateObjectId('problemId'), problemController.setSolutionCode);
router.delete('/:problemId', adminOnly, validateObjectId('problemId'), problemController.deleteProblem);

module.exports = router;
