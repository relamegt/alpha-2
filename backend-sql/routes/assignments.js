const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/assignmentController');
const { protect } = require('../middleware/auth');

router.get('/',                   protect, ctrl.list);
router.post('/',                  protect, ctrl.create);
router.get('/:id',                protect, ctrl.getOne);
router.patch('/:id',              protect, ctrl.update);
router.delete('/:id',             protect, ctrl.delete);
router.post('/:id/publish-github',protect, ctrl.publishToGithub);
router.get('/:id/template',       protect, ctrl.getTemplate);   // IDE pulls this
router.post('/:id/submit/inline', protect, ctrl.submitInline);  // inline submit
router.post('/ide/session',       protect, ctrl.createIDESession);
router.post('/ide/authenticate',           ctrl.validateIDEToken); // no auth — called by IDE

module.exports = router;
