const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const uploadHandler = require('../middleware/uploadHandler');
const ctrl = require('../controllers/postXController');

router.post('/', auth, uploadHandler, ctrl.createPost);
router.get('/feed', optionalAuth, ctrl.getFeed);
router.get('/:id', optionalAuth, ctrl.getPostById);
router.post('/:id/like', auth, ctrl.likePost);
router.delete('/:id', auth, ctrl.deletePost);
router.get('/:id/comments', optionalAuth, ctrl.getComments);
router.post('/:id/comments', auth, ctrl.createComment);
router.post('/:postId/comments/:commentId/like', auth, ctrl.likeComment);
router.delete('/:postId/comments/:commentId', auth, ctrl.deleteComment);

module.exports = router;
