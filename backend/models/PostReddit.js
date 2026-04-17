const mongoose = require('mongoose');

const postRedditSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxLength: 300 },
    text: { type: String, default: '', maxLength: 2000 },
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['none', 'image', 'video'], default: 'none' },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentCount: { type: Number, default: 0 },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionTopic', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

postRedditSchema.virtual('voteScore').get(function () {
  return (this.upvotes ? this.upvotes.length : 0) - (this.downvotes ? this.downvotes.length : 0);
});

postRedditSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    author: this.author,
    title: this.title,
    text: this.text,
    mediaUrl: this.mediaUrl,
    mediaType: this.mediaType,
    upvotes: this.upvotes ? this.upvotes.length : 0,
    downvotes: this.downvotes ? this.downvotes.length : 0,
    voteScore: this.voteScore,
    commentCount: this.commentCount,
    topic: this.topic,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('PostReddit', postRedditSchema);
