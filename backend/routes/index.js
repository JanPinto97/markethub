const router = require('express').Router();
const authRouter = require('./auth');
const profileRouter = require('./profile');
const postsRouter = require('./posts');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Backend running' });
});

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/posts', postsRouter);

module.exports = router;
