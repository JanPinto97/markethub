const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'follow',
  'post_like',
  'post_comment',
  'reddit_comment',
  'community_accepted',
  'community_request',
  'discussion_opened',
];

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

notificationSchema.index({ recipient: 1, createdAt: -1 });

notificationSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    link: this.link,
    read: this.read,
    actor: this.actor && this.actor.username
      ? { id: this.actor._id, username: this.actor.username, avatar: this.actor.avatar || '' }
      : null,
    createdAt: this.createdAt,
  };
};

notificationSchema.statics.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

module.exports = mongoose.model('Notification', notificationSchema);
