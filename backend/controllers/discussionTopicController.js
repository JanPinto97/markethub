const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const DiscussionTopic = require('../models/DiscussionTopic');
const PostReddit = require('../models/PostReddit');
const Comment = require('../models/Comment');
const buildCommentTree = require('../utils/buildCommentTree');

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
            upvotesCount: { $size: '$upvotes' }, downvotesCount: { $size: '$downvotes' },
            rawUpvotes: '$upvotes', rawDownvotes: '$downvotes',
            voteScore: 1, commentCount: 1, topic: 1, createdAt: 1,
            author: {
              _id: '$authorDoc._id', username: '$authorDoc.username',
              avatar: '$authorDoc.avatar', role: '$authorDoc.role',
            },
          },
        },
      ]);

      const uid = req.user ? req.user.id : null;
      const posts = docs.map(d => {
        let userVote = null;
        if (uid) {
          if (d.rawUpvotes.some(id => id.toString() === uid)) userVote = 'up';
          else if (d.rawDownvotes.some(id => id.toString() === uid)) userVote = 'down';
        }
        return {
          id: d._id, author: d.author, title: d.title, text: d.text,
          mediaUrl: d.mediaUrl, mediaType: d.mediaType,
          upvotes: d.upvotesCount, downvotes: d.downvotesCount,
          voteScore: d.voteScore, commentCount: d.commentCount,
          topic: d.topic, createdAt: d.createdAt, userVote,
        };
      });

      const totalPages = Math.ceil(total / limit);
      return res.json({
        success: true, posts,
        pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
      });
    }

    // sort === 'recent'
    const filter = { topic: topic._id };
    const [posts, total] = await Promise.all([
      PostReddit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('author', 'username avatar role'),
      PostReddit.countDocuments(filter),
    ]);
    const uid2 = req.user ? req.user.id : null;
    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      posts: posts.map(p => {
        const json = p.toPublicJSON();
        json.userVote = null;
        if (uid2) {
          if (p.upvotes.some(id => id.toString() === uid2)) json.userVote = 'up';
          else if (p.downvotes.some(id => id.toString() === uid2)) json.userVote = 'down';
        }
        return json;
      }),
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

    await post.populate('author', 'username avatar role');
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

async function loadPostByRoute(req) {
  const topic = await DiscussionTopic.findOne({ slug: req.params.slug });
  if (!topic) return { error: { code: 404, message: 'Topic not found' } };
  const post = await PostReddit.findById(req.params.postId);
  if (!post || post.topic.toString() !== topic._id.toString()) {
    return { error: { code: 404, message: 'Post not found' } };
  }
  return { topic, post };
}

exports.listPostComments = async (req, res, next) => {
  try {
    const { error, post } = await loadPostByRoute(req);
    if (error) return fail(res, error.code, error.message);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { postId: post._id, postType: 'PostReddit', parentComment: null };
    const [topLevel, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar')
        .populate('replyingTo', 'username'),
      Comment.countDocuments(filter),
    ]);

    const topIds = topLevel.map(c => c._id);
    const replyMap = await buildCommentTree(topIds, 0, 3);

    const comments = topLevel.map(c => {
      const cid = c._id.toString();
      return {
        ...c.toPublicJSON(),
        replies: replyMap[cid] || [],
        hasMoreReplies: false,
      };
    });

    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      comments,
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) { next(err); }
};

exports.createPostComment = async (req, res, next) => {
  try {
    const { error, post } = await loadPostByRoute(req);
    if (error) return fail(res, error.code, error.message);

    const { text } = req.body || {};
    if (!text || !text.trim()) return fail(res, 400, 'Text is required');
    if (text.length > 400) return fail(res, 400, 'Text max 400 characters');

    const comment = await Comment.create({
      author: req.user.id,
      text: text.trim(),
      postId: post._id,
      postType: 'PostReddit',
      parentComment: null,
    });

    post.commentCount += 1;
    await post.save();

    await comment.populate('author', 'username avatar');
    res.status(201).json({ success: true, comment: comment.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.createPostReply = async (req, res, next) => {
  try {
    const { error, post } = await loadPostByRoute(req);
    if (error) return fail(res, error.code, error.message);

    const { text } = req.body || {};
    if (!text || !text.trim()) return fail(res, 400, 'Text is required');
    if (text.length > 400) return fail(res, 400, 'Text max 400 characters');

    const target = await Comment.findById(req.params.commentId);
    if (!target || target.postId.toString() !== post._id.toString()) {
      return fail(res, 404, 'Comment not found');
    }

    const reply = await Comment.create({
      author: req.user.id,
      text: text.trim(),
      postId: post._id,
      postType: 'PostReddit',
      parentComment: target._id,
      replyingTo: target.author,
    });

    post.commentCount += 1;
    await post.save();

    await reply.populate('author', 'username avatar');
    await reply.populate('replyingTo', 'username');
    res.status(201).json({ success: true, comment: reply.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.deletePostComment = async (req, res, next) => {
  try {
    const { error, post } = await loadPostByRoute(req);
    if (error) return fail(res, error.code, error.message);

    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.postId.toString() !== post._id.toString() || comment.parentComment) {
      return fail(res, 404, 'Comment not found');
    }

    const isAuthor = comment.author.toString() === req.user.id;
    const isPlatformMod = req.user.role === 'moderator' || req.user.role === 'superadmin';
    if (!isAuthor && !isPlatformMod) return fail(res, 403, 'Not authorized');

    const replyCount = await Comment.countDocuments({ parentComment: comment._id });
    await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();

    post.commentCount = Math.max(0, post.commentCount - (1 + replyCount));
    await post.save();

    res.json({ success: true, message: 'Comment deleted', removed: 1 + replyCount });
  } catch (err) { next(err); }
};

exports.deletePostReply = async (req, res, next) => {
  try {
    const { error, post } = await loadPostByRoute(req);
    if (error) return fail(res, error.code, error.message);

    const reply = await Comment.findById(req.params.replyId);
    if (
      !reply ||
      reply.postId.toString() !== post._id.toString() ||
      !reply.parentComment ||
      reply.parentComment.toString() !== req.params.commentId
    ) {
      return fail(res, 404, 'Reply not found');
    }

    const isAuthor = reply.author.toString() === req.user.id;
    const isPlatformMod = req.user.role === 'moderator' || req.user.role === 'superadmin';
    if (!isAuthor && !isPlatformMod) return fail(res, 403, 'Not authorized');

    await reply.deleteOne();

    post.commentCount = Math.max(0, post.commentCount - 1);
    await post.save();

    res.json({ success: true, message: 'Reply deleted' });
  } catch (err) { next(err); }
};

exports.getCommentThread = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId)
      .populate('author', 'username avatar')
      .populate('replyingTo', 'username');
    if (!comment) return fail(res, 404, 'Comment not found');

    const replyMap = await buildCommentTree([comment._id], 0, 3);
    const node = {
      ...comment.toPublicJSON(),
      replies: replyMap[comment._id.toString()] || [],
      hasMoreReplies: false,
    };

    res.json({ success: true, comment: node });
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
