const router = require('express').Router();
const authRouter = require('./auth');
const profileRouter = require('./profile');
const postsRouter = require('./posts');
const communitiesPublicRouter = require('./communitiesPublic');
const communitiesPrivateRouter = require('./communitiesPrivate');
const auth = require('../middleware/auth');
const communityMyCtrl = require('../controllers/communityMyController');
const marketRouter = require('./markets');
const topicsRouter = require('./topics');
const usersRouter = require('./users');
const searchRouter = require('./search');
const discussionsRouter = require('./discussions');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Backend running' });
});

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/posts', postsRouter);
router.get('/communities/my', auth, communityMyCtrl.getMyCommunities);
router.use('/communities/public', communitiesPublicRouter);
router.use('/communities/private', communitiesPrivateRouter);
router.use('/markets', marketRouter);
router.use('/topics', topicsRouter);
router.use('/users', usersRouter);
router.use('/search', searchRouter);
router.use('/discussions', discussionsRouter);

module.exports = router;
