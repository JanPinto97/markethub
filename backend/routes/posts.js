const router = require('express').Router();
const auth = require('../middleware/auth');
const uploadHandler = require('../middleware/uploadHandler');
const ctrl = require('../controllers/postXController');

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role };
    } catch {}
  }
  next();
}

router.post('/', auth, uploadHandler, ctrl.createPost);
router.get('/feed', optionalAuth, ctrl.getFeed);
router.get('/:id', optionalAuth, ctrl.getPostById);
router.post('/:id/like', auth, ctrl.likePost);
router.delete('/:id', auth, ctrl.deletePost);
router.get('/:id/comments', ctrl.getComments);
router.post('/:id/comments', auth, ctrl.createComment);
router.post('/:postId/comments/:commentId/like', auth, ctrl.likeComment);
router.delete('/:postId/comments/:commentId', auth, ctrl.deleteComment);

module.exports = router;
