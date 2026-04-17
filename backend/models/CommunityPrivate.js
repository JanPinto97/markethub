const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['leader', 'moderator', 'little_whale', 'member'],
      default: 'member',
    },
  },
  { _id: false }
);

const joinRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, maxLength: 150, default: '' },
    createdAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { _id: false }
);

const communityPrivateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxLength: 50 },
  description: { type: String, default: '', maxLength: 300 },
  avatar: { type: String, default: '' },
  members: { type: [memberSchema], default: [] },
  joinRequests: { type: [joinRequestSchema], default: [] },
  pinnedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PostX' }],
  postCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

communityPrivateSchema.methods.getLeader = function () {
  return this.members.find((m) => m.role === 'leader') || null;
};

communityPrivateSchema.methods.getMemberRole = function (userId) {
  const m = this.members.find((m) => m.user.toString() === userId.toString());
  return m ? m.role : null;
};

communityPrivateSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

communityPrivateSchema.methods.promoteNewLeader = function () {
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const byRole = (role) => this.members.filter((m) => m.role === role);

  const candidate =
    pickRandom(byRole('moderator')) ||
    pickRandom(byRole('little_whale')) ||
    pickRandom(byRole('member'));

  if (!candidate) return null;
  candidate.role = 'leader';
  return candidate;
};

communityPrivateSchema.methods.getRoleWeight = function (role) {
  switch (role) {
    case 'leader': return 50;
    case 'moderator': return 20;
    case 'little_whale': return 10;
    case 'member':
    default: return 0;
  }
};

communityPrivateSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    avatar: this.avatar,
    memberCount: this.members ? this.members.length : 0,
    postCount: this.postCount,
    createdAt: this.createdAt,
  };
};

communityPrivateSchema.methods.toDetailJSON = async function () {
  await this.populate('members.user');
  return {
    ...this.toPublicJSON(),
    members: this.members.map((m) => ({
      user: m.user && m.user.toPublicJSON ? m.user.toPublicJSON() : m.user,
      role: m.role,
    })),
    pinnedPosts: this.pinnedPosts,
  };
};

communityPrivateSchema.post('save', async function (doc) {
  if (doc.members.length === 0) {
    await doc.constructor.deleteOne({ _id: doc._id });
  }
});

module.exports = mongoose.model('CommunityPrivate', communityPrivateSchema);
