const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Backend running' });
});

module.exports = router;
