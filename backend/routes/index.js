const router = require('express').Router();
const authRouter = require('./auth');
const profileRouter = require('./profile');
const postsRouter = require('./posts');
const communitiesPublicRouter = require('./communitiesPublic');
const communitiesPrivateRouter = require('./communitiesPrivate');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const communityMyCtrl = require('../controllers/communityMyController');
const communityDiscoverCtrl = require('../controllers/communityDiscoverController');
const marketRouter = require('./markets');
const topicsRouter = require('./topics');
const usersRouter = require('./users');
const searchRouter = require('./search');
const discussionsRouter = require('./discussions');
const assistantRouter = require('./assistant');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Backend running' });
});

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/posts', postsRouter);
router.get('/communities/my', auth, communityMyCtrl.getMyCommunities);
router.get('/communities/discover', optionalAuth, communityDiscoverCtrl.discover);
router.use('/communities/public', communitiesPublicRouter);
router.use('/communities/private', communitiesPrivateRouter);
router.use('/markets', marketRouter);
router.use('/topics', topicsRouter);
router.use('/users', usersRouter);
router.use('/search', searchRouter);
router.use('/discussions', discussionsRouter);
router.use('/assistant', assistantRouter);

module.exports = router;
