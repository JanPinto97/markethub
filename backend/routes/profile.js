const router = require('express').Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const auth = require('../middleware/auth');

const SALT_ROUNDS = 10;

function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

router.use(auth);

router.put('/', async (req, res, next) => {
  try {
    const { username, avatar, bio } = req.body || {};
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
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) {
      if (bio.length > 300) return fail(res, 400, 'Bio max 300 characters');
      user.bio = bio;
    }
    await user.save();
    res.json({ success: true, user: user.toPublicJSON() });
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
