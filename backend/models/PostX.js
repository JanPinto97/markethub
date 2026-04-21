const mongoose = require('mongoose');

const postXSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxLength: 400 },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, enum: ['none', 'image', 'video'], default: 'none' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentCount: { type: Number, default: 0 },
  origin: {
    type: String,
    enum: ['general', 'public_community', 'private_community'],
    required: true,
  },
  community: { type: mongoose.Schema.Types.ObjectId, default: null, refPath: 'communityType' },
  communityType: {
    type: String,
    enum: ['CommunityPublic', 'CommunityPrivate', null],
    default: null,
  },
  isPinned: { type: Boolean, default: false },
  trendingScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

postXSchema.statics.calculateTrendingScore = function (post) {
  const base = (post.likes ? post.likes.length : 0) * 1 + (post.commentCount || 0) * 2;
  const ageMs = Date.now() - new Date(post.createdAt).getTime();
  const ageH = ageMs / (1000 * 60 * 60);
  let decay = 1;
  if (ageH >= 24 && ageH < 48) decay = 0.5;
  else if (ageH >= 48) decay = 0.25;
  return base * decay;
};

postXSchema.methods.toPublicJSON = function (currentUserId = null) {
  const likes = this.likes || [];
  const liked = currentUserId ? likes.some(id => id.toString() === currentUserId.toString()) : false;
  return {
    id: this._id,
    author: this.author,
    text: this.text,
    mediaUrl: this.mediaUrl,
    mediaType: this.mediaType,
    likesCount: likes.length,
    liked,
    commentCount: this.commentCount,
    origin: this.origin,
    community: this.community,
    communityType: this.communityType,
    isPinned: this.isPinned,
    trendingScore: this.trendingScore,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('PostX', postXSchema);
