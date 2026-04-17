const router = require('express').Router();
const auth = require('../middleware/auth');
const uploadHandler = require('../middleware/uploadHandler');
const ctrl = require('../controllers/communityPublicController');

router.get('/', ctrl.listCommunities);
router.post('/', auth, uploadHandler, ctrl.createCommunity);
router.get('/:id', ctrl.getCommunity);
router.post('/:id/join', auth, ctrl.joinCommunity);
router.post('/:id/leave', auth, ctrl.leaveCommunity);
router.get('/:id/feed', ctrl.getCommunityFeed);
router.post('/:id/posts', auth, uploadHandler, ctrl.createCommunityPost);
router.delete('/:id/posts/:postId', auth, ctrl.deleteCommunityPost);

module.exports = router;
