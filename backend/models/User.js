const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: { type: String, default: '' },
  googleId: { type: String, default: null, index: true, sparse: true },
  role: {
    type: String,
    enum: ['user', 'moderator', 'superadmin'],
    default: 'user',
  },
  avatar: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  bio: { type: String, default: '', maxLength: 300 },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    this.loginAttempts = 0;
  }
  return this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  return this.save();
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    coverImage: this.coverImage,
    bio: this.bio,
    role: this.role,
    followingCount: this.following ? this.following.length : 0,
    followersCount: this.followers ? this.followers.length : 0,
    createdAt: this.createdAt,
  };
};

userSchema.methods.toPrivateJSON = function () {
  return { ...this.toPublicJSON(), email: this.email };
};

module.exports = mongoose.model('User', userSchema);
