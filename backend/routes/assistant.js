const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/assistantController');

router.post('/chat', auth, ctrl.chat);

module.exports = router;
