const Discussion = require('../models/Discussion');
const DiscussionMessage = require('../models/DiscussionMessage');
const Comment = require('../models/Comment');

exports.checkDiscussion = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const discussion = await Discussion.findOne({ commentId });
    if (discussion) {
      return res.json({ success: true, exists: true, discussionId: discussion._id });
    }
    return res.json({ success: true, exists: false });
  } catch (err) {
    next(err);
  }
};

exports.createDiscussion = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;

    const existing = await Discussion.findOne({ commentId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Discussion already exists', code: 409 });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found', code: 404 });
    }

    const discussion = await Discussion.create({
      commentId,
      postId: comment.postId,
      createdBy: req.user.id,
    });

    const message = await DiscussionMessage.create({
      discussionId: discussion._id,
      author: req.user.id,
      text,
      replyTo: null,
    });

    const populatedMessage = await DiscussionMessage.findById(message._id)
      .populate('author', 'username avatar');

    res.status(201).json({ success: true, discussion, message: populatedMessage });
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const { cursor, limit = 30 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 30, 50);

    const filter = { discussionId };
    if (cursor) {
      filter.createdAt = { $gt: new Date(cursor) };
    }

    const messages = await DiscussionMessage.find(filter)
      .sort({ createdAt: 1 })
      .limit(parsedLimit + 1)
      .populate('author', 'username avatar')
      .populate({
        path: 'replyTo',
        select: 'text author',
        populate: { path: 'author', select: 'username' },
      });

    const hasMore = messages.length > parsedLimit;
    if (hasMore) messages.pop();

    const formatted = messages.map(m => {
      const obj = m.toObject();
      if (obj.replyTo && obj.replyTo.text && obj.replyTo.text.length > 80) {
        obj.replyTo.text = obj.replyTo.text.slice(0, 80) + '...';
      }
      return obj;
    });

    res.json({ success: true, messages: formatted, hasMore });
  } catch (err) {
    next(err);
  }
};

exports.addMessage = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const { text, replyTo } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Text is required', code: 400 });
    }
    if (text.length > 2000) {
      return res.status(400).json({ success: false, message: 'Text too long', code: 400 });
    }

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found', code: 404 });
    }

    const message = await DiscussionMessage.create({
      discussionId,
      author: req.user.id,
      text: text.trim(),
      replyTo: replyTo || null,
    });

    const populated = await DiscussionMessage.findById(message._id)
      .populate('author', 'username avatar')
      .populate({
        path: 'replyTo',
        select: 'text author',
        populate: { path: 'author', select: 'username' },
      });

    const obj = populated.toObject();
    if (obj.replyTo && obj.replyTo.text && obj.replyTo.text.length > 80) {
      obj.replyTo.text = obj.replyTo.text.slice(0, 80);
    }

    res.status(201).json({ success: true, message: obj });
  } catch (err) {
    next(err);
  }
};

exports.getDiscussion = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const discussion = await Discussion.findById(discussionId)
      .populate({
        path: 'commentId',
        select: 'text author createdAt',
        populate: { path: 'author', select: 'username avatar' },
      });
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found', code: 404 });
    }
    res.json({ success: true, discussion });
  } catch (err) {
    next(err);
  }
};
