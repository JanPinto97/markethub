const mongoose = require('mongoose');

const communityPublicSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxLength: 50 },
  description: { type: String, default: '', maxLength: 300 },
  avatar: { type: String, default: '' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  postCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

communityPublicSchema.methods.isEmpty = function () {
  return this.members.length === 0;
};

communityPublicSchema.methods.toPublicJSON = function () {
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

communityPublicSchema.pre('save', function () {
  this.$locals.wasNew = this.isNew;
});

communityPublicSchema.post('save', async function (doc) {
  if (!doc.$locals.wasNew && doc.members.length === 0) {
    await doc.constructor.deleteOne({ _id: doc._id });
  }
});

module.exports = mongoose.model('CommunityPublic', communityPublicSchema);
