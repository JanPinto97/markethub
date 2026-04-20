const router = require('express').Router();
const auth = require('../middleware/auth');
const uploadHandler = require('../middleware/uploadHandler');
const ctrl = require('../controllers/communityPrivateController');

router.get('/', ctrl.listCommunities);
router.post('/', auth, uploadHandler, ctrl.createCommunity);
router.get('/:id', auth, ctrl.getCommunity);
router.post('/:id/request', auth, ctrl.requestToJoin);
router.post('/:id/requests/:requestId', auth, ctrl.handleJoinRequest);
router.delete('/:id/members/:userId', auth, ctrl.expelMember);
router.put('/:id/members/:userId/role', auth, ctrl.promoteMember);
router.post('/:id/leave', auth, ctrl.leaveCommunity);
router.delete('/:id', auth, ctrl.deleteCommunity);
router.get('/:id/feed', auth, ctrl.getCommunityFeed);
router.post('/:id/posts', auth, uploadHandler, ctrl.createCommunityPost);
router.delete('/:id/posts/:postId', auth, ctrl.deleteCommunityPost);
router.post('/:id/posts/:postId/pin', auth, ctrl.pinPost);

module.exports = router;
