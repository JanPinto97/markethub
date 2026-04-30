const mongoose = require('mongoose');

const discussionMessageSchema = new mongoose.Schema({
  discussionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 2000 },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionMessage', default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DiscussionMessage', discussionMessageSchema);
