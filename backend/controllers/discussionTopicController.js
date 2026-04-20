const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const DiscussionTopic = require('../models/DiscussionTopic');
const PostReddit = require('../models/PostReddit');
const Comment = require('../models/Comment');

function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

exports.listTopics = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.ids) {
      const ids = req.query.ids.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
      filter._id = { $in: ids };
    }
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const topics = await DiscussionTopic.find(filter).sort({ name: 1 });
    res.json({ success: true, topics: topics.map(t => t.toPublicJSON()) });
  } catch (err) { next(err); }
};

exports.getTopicBySlug = async (req, res, next) => {
  try {
    const topic = await DiscussionTopic.findOne({ slug: req.params.slug });
    if (!topic) return fail(res, 404, 'Topic not found');
    res.json({ success: true, topic: topic.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.getTopicFeed = async (req, res, next) => {
  try {
    const topic = await DiscussionTopic.findOne({ slug: req.params.slug });
    if (!topic) return fail(res, 404, 'Topic not found');

    const sort = req.query.sort || 'top';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    if (sort === 'top') {
      const [countResult] = await PostReddit.aggregate([
        { $match: { topic: topic._id } },
        { $count: 'total' },
      ]);
      const total = countResult ? countResult.total : 0;

      const docs = await PostReddit.aggregate([
        { $match: { topic: topic._id } },
        { $addFields: { voteScore: { $subtract: [{ $size: '$upvotes' }, { $size: '$downvotes' }] } } },
        { $sort: { voteScore: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'authorDoc' } },
        { $unwind: '$authorDoc' },
        {
          $project: {
            _id: 1, title: 1, text: 1, mediaUrl: 1, mediaType: 1,
            upvotes: { $size: '$upvotes' }, downvotes: { $size: '$downvotes' },
            voteScore: 1, commentCount: 1, topic: 1, createdAt: 1,
            author: {
              _id: '$authorDoc._id', username: '$authorDoc.username',
              avatar: '$authorDoc.avatar', role: '$authorDoc.role',
            },
          },
        },
      ]);

      const posts = docs.map(d => ({
        id: d._id, author: d.author, title: d.title, text: d.text,
        mediaUrl: d.mediaUrl, mediaType: d.mediaType,
        upvotes: d.upvotes, downvotes: d.downvotes,
        voteScore: d.voteScore, commentCount: d.commentCount,
        topic: d.topic, createdAt: d.createdAt,
      }));

      const totalPages = Math.ceil(total / limit);
      return res.json({
        success: true, posts,
        pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
      });
    }

    // sort === 'new'
    const filter = { topic: topic._id };
    const [posts, total] = await Promise.all([
      PostReddit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('author', 'username avatar role'),
      PostReddit.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      posts: posts.map(p => p.toPublicJSON()),
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) { next(err); }
};

exports.createTopicPost = async (req, res, next) => {
  try {
    const topic = await DiscussionTopic.findOne({ slug: req.params.slug });
    if (!topic) return fail(res, 404, 'Topic not found');

    const { title, text } = req.body || {};
    if (!title) return fail(res, 400, 'Title is required');
    if (title.length > 300) return fail(res, 400, 'Title max 300 characters');
    if (text && text.length > 2000) return fail(res, 400, 'Text max 2000 characters');

    const post = await PostReddit.create({
      author: req.user.id,
      title,
      text: text || '',
      mediaUrl: req.mediaUrl || '',
      mediaType: req.mediaType || 'none',
      topic: topic._id,
    });

    topic.postCount += 1;
    await topic.save();

    res.status(201).json({ success: true, post: post.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.getPostById = async (req, res, next) => {
  try {
    const topic = await DiscussionTopic.findOne({ slug: req.params.slug });
    if (!topic) return fail(res, 404, 'Topic not found');

    const post = await PostReddit.findById(req.params.postId).populate('author', 'username avatar role');
    if (!post || post.topic.toString() !== topic._id.toString()) return fail(res, 404, 'Post not found');

    res.json({ success: true, post: post.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.votePost = async (req, res, next) => {
  try {
    const topic = await DiscussionTopic.findOne({ slug: req.params.slug });
    if (!topic) return fail(res, 404, 'Topic not found');

    const post = await PostReddit.findById(req.params.postId);
    if (!post || post.topic.toString() !== topic._id.toString()) return fail(res, 404, 'Post not found');

    const { vote } = req.body || {};
    if (vote !== 'up' && vote !== 'down') return fail(res, 400, 'Vote must be up or down');

    const uid = req.user.id;
    const upIdx = post.upvotes.indexOf(uid);
    const downIdx = post.downvotes.indexOf(uid);

    if (vote === 'up') {
      if (upIdx !== -1) {
        post.upvotes.splice(upIdx, 1);
      } else {
        post.upvotes.push(uid);
        if (downIdx !== -1) post.downvotes.splice(downIdx, 1);
      }
    } else {
      if (downIdx !== -1) {
        post.downvotes.splice(downIdx, 1);
      } else {
        post.downvotes.push(uid);
        if (upIdx !== -1) post.upvotes.splice(upIdx, 1);
      }
    }

    await post.save();

    const hasUp = post.upvotes.some(id => id.toString() === uid);
    const hasDown = post.downvotes.some(id => id.toString() === uid);

    res.json({
      success: true,
      upvotes: post.upvotes.length,
      downvotes: post.downvotes.length,
      voteScore: post.upvotes.length - post.downvotes.length,
      userVote: hasUp ? 'up' : hasDown ? 'down' : null,
    });
  } catch (err) { next(err); }
};

exports.deleteTopicPost = async (req, res, next) => {
  try {
    const topic = await DiscussionTopic.findOne({ slug: req.params.slug });
    if (!topic) return fail(res, 404, 'Topic not found');

    const post = await PostReddit.findById(req.params.postId);
    if (!post || post.topic.toString() !== topic._id.toString()) return fail(res, 404, 'Post not found');

    const isAuthor = post.author.toString() === req.user.id;
    const isPlatformMod = req.user.role === 'moderator' || req.user.role === 'superadmin';
    if (!isAuthor && !isPlatformMod) return fail(res, 403, 'Not authorized');

    if (post.mediaUrl) {
      const filePath = path.join(__dirname, '..', post.mediaUrl);
      fs.unlink(filePath, () => {});
    }

    await Comment.deleteMany({ postId: post._id, postType: 'PostReddit' });
    await post.deleteOne();

    topic.postCount = Math.max(0, topic.postCount - 1);
    await topic.save();

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { next(err); }
};
