const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const ctrl = require('../controllers/userController');

router.get('/trending', ctrl.getTrending);
router.get('/:username', optionalAuth, ctrl.getPublicProfile);
router.get('/:username/posts', ctrl.getUserPosts);
router.post('/:username/follow', auth, ctrl.followUser);
router.get('/:username/followers', ctrl.getFollowers);
router.get('/:username/following', ctrl.getFollowing);

module.exports = router;
