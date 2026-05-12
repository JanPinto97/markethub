const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const User = require('../models/User');
const auth = require('../middleware/auth');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function signAccess(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}
function signRefresh(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}
function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}
function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || username.length < 3 || username.length > 30) {
      return fail(res, 400, 'Username must be 3-30 characters');
    }
    if (!email || !EMAIL_RE.test(email)) {
      return fail(res, 400, 'Invalid email');
    }
    if (!password || password.length < 8) {
      return fail(res, 400, 'Password must be at least 8 characters');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existing) {
      const field = existing.email === normalizedEmail ? 'Email' : 'Username';
      return fail(res, 409, `${field} already taken`);
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ username, email: normalizedEmail, passwordHash, role: 'user' });

    const accessToken = signAccess(user);
    setRefreshCookie(res, signRefresh(user));
    res.status(201).json({ success: true, accessToken, user: user.toPrivateJSON() });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return fail(res, 400, 'Email and password required');

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return fail(res, 401, 'Invalid credentials');

    if (user.isLocked()) {
      const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${minutes} minutes`, code: 423, minutesRemaining: minutes });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await user.incrementLoginAttempts();
      return fail(res, 401, 'Invalid credentials');
    }

    await user.resetLoginAttempts();
    const accessToken = signAccess(user);
    setRefreshCookie(res, signRefresh(user));
    res.json({ success: true, accessToken, user: user.toPrivateJSON() });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out' });
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) return fail(res, 401, 'Missing refresh token');
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return fail(res, 401, 'Invalid refresh token');
    }
    const user = await User.findById(payload.id);
    if (!user) return fail(res, 401, 'User not found');
    const accessToken = signAccess(user);
    res.json({ success: true, accessToken });
  } catch (err) { next(err); }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 404, 'User not found');
    res.json({ success: true, user: user.toPrivateJSON() });
  } catch (err) { next(err); }
});

const googleEnabled = passport.GOOGLE_ENABLED;

router.get('/google', (req, res, next) => {
  if (!googleEnabled) return fail(res, 503, 'Google OAuth not configured');
  return passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!googleEnabled) return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    return passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed` })(req, res, next);
  },
  (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
      const accessToken = signAccess(user);
      setRefreshCookie(res, signRefresh(user));
      res.redirect(`${FRONTEND_URL}/auth/google/success?token=${encodeURIComponent(accessToken)}`);
    } catch {
      res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }
  }
);

module.exports = router;
