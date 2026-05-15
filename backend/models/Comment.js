const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxLength: 400 },
  postId: { type: mongoose.Schema.Types.ObjectId, required: true },
  postType: { type: String, enum: ['PostX', 'PostReddit'], required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

commentSchema.methods.toPublicJSON = function (currentUserId = null) {
  const liked = currentUserId
    ? (this.likes || []).some(id => id.toString() === currentUserId.toString())
    : false;
  return {
    id: this._id,
    author: this.author,
    text: this.text,
    postId: this.postId,
    postType: this.postType,
    likesCount: this.likes ? this.likes.length : 0,
    liked,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Comment', commentSchema);
