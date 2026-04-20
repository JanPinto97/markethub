const router = require('express').Router();
const authRouter = require('./auth');
const profileRouter = require('./profile');
const postsRouter = require('./posts');
const communitiesPublicRouter = require('./communitiesPublic');
const communitiesPrivateRouter = require('./communitiesPrivate');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Backend running' });
});

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/posts', postsRouter);
router.use('/communities/public', communitiesPublicRouter);
router.use('/communities/private', communitiesPrivateRouter);

module.exports = router;
