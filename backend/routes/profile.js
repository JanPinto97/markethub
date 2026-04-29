const router = require('express').Router();
const bcrypt = require('bcrypt');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const User = require('../models/User');
const auth = require('../middleware/auth');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads', 'images'));
  },
  filename(req, file, cb) {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const profileUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    const err = new Error('File type not allowed');
    err.statusCode = 400;
    cb(err);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

const SALT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

router.use(auth);

router.put('/', (req, res, next) => {
  profileUpload(req, res, (err) => {
    if (err) {
      err.statusCode = err.statusCode || 400;
      return next(err);
    }
    next();
  });
}, async (req, res, next) => {
  try {
    const { username, email, bio } = req.body || {};
    const avatarFile = req.files?.avatar?.[0];
    const coverFile = req.files?.coverImage?.[0];
    const avatar = avatarFile ? `/uploads/images/${avatarFile.filename}` : req.body.avatar;
    const coverImage = coverFile ? `/uploads/images/${coverFile.filename}` : req.body.coverImage;
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 404, 'User not found');

    if (username !== undefined && username !== user.username) {
      if (username.length < 3 || username.length > 30) {
        return fail(res, 400, 'Username must be 3-30 characters');
      }
      const taken = await User.findOne({ username, _id: { $ne: user._id } });
      if (taken) return fail(res, 409, 'Username already taken');
      user.username = username;
    }
    if (email !== undefined) {
      const normalized = String(email).toLowerCase().trim();
      if (normalized !== user.email) {
        if (!EMAIL_RE.test(normalized)) return fail(res, 400, 'Invalid email');
        const taken = await User.findOne({ email: normalized, _id: { $ne: user._id } });
        if (taken) return fail(res, 409, 'Email already taken');
        user.email = normalized;
      }
    }
    if (avatar !== undefined) user.avatar = avatar;
    if (coverImage !== undefined) user.coverImage = coverImage;
    if (bio !== undefined) {
      if (bio.length > 300) return fail(res, 400, 'Bio max 300 characters');
      user.bio = bio;
    }
    await user.save();
    res.json({ success: true, user: user.toPrivateJSON() });
  } catch (err) { next(err); }
});

router.put('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return fail(res, 400, 'currentPassword and newPassword required');
    if (newPassword.length < 8) return fail(res, 400, 'Password must be at least 8 characters');

    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 404, 'User not found');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return fail(res, 401, 'Current password incorrect');

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { next(err); }
});

module.exports = router;
