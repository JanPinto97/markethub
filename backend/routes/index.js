const router = require('express').Router();
const authRouter = require('./auth');
const profileRouter = require('./profile');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Backend running' });
});

router.use('/auth', authRouter);
router.use('/profile', profileRouter);

module.exports = router;
