const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/discussionController');

router.get('/comment/:commentId', ctrl.checkDiscussion);
router.post('/comment/:commentId', auth, ctrl.createDiscussion);
router.get('/:discussionId', ctrl.getDiscussion);
router.get('/:discussionId/messages', ctrl.getMessages);
router.post('/:discussionId/messages', auth, ctrl.addMessage);

module.exports = router;
