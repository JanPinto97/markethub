const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const uploadHandler = require('../middleware/uploadHandler');
const ctrl = require('../controllers/discussionTopicController');

router.get('/', ctrl.listTopics);
router.get('/:slug', ctrl.getTopicBySlug);
router.get('/:slug/feed', optionalAuth, ctrl.getTopicFeed);
router.post('/:slug/posts', auth, uploadHandler, ctrl.createTopicPost);
router.get('/:slug/posts/:postId', ctrl.getPostById);
router.post('/:slug/posts/:postId/vote', auth, ctrl.votePost);
router.delete('/:slug/posts/:postId', auth, ctrl.deleteTopicPost);

module.exports = router;
