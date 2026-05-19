const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.get('/', auth, ctrl.list);
router.post('/read-all', auth, ctrl.markAllRead);
router.post('/:id/read', auth, ctrl.markOneRead);
router.delete('/', auth, ctrl.clearAll);

module.exports = router;
