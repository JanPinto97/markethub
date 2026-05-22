const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');

const GOOGLE_ENABLED = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL);

if (!GOOGLE_ENABLED) {
  console.warn('[passport] Google OAuth disabled: missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL');
}

if (GOOGLE_ENABLED) passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = (profile.emails && profile.emails[0] && profile.emails[0].value || '').toLowerCase().trim();
      if (!email) return done(null, false, { message: 'No email returned by Google' });

      let user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);

      user = await User.findOne({ email });
      if (user) {
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
        return done(null, user);
      }

      const baseUsername = (profile.displayName || email.split('@')[0])
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 24) || 'user';
      let username = baseUsername;
      let i = 0;
      while (await User.findOne({ username })) {
        i += 1;
        username = `${baseUsername}${i}`.slice(0, 30);
      }

      user = await User.create({
        username,
        email,
        googleId: profile.id,
        avatar: (profile.photos && profile.photos[0] && profile.photos[0].value) || '',
        role: 'user',
        passwordHash: '',
      });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

module.exports = passport;
module.exports.GOOGLE_ENABLED = GOOGLE_ENABLED;
