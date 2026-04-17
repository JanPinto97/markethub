const mongoose = require('mongoose');

const CATEGORIES = ['CORE_MARKETS', 'ECONOMIA_I_MACRO', 'ASSETS_ESPECIFICS', 'TRADING_I_INVERSIO'];

const discussionTopicSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  category: { type: String, required: true, enum: CATEGORIES },
  description: { type: String, default: '' },
  postCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

discussionTopicSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    slug: this.slug,
    category: this.category,
    description: this.description,
    postCount: this.postCount,
  };
};

module.exports = mongoose.model('DiscussionTopic', discussionTopicSchema);
module.exports.CATEGORIES = CATEGORIES;
