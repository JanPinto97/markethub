const fs = require('fs');
const path = require('path');
const PostX = require('../models/PostX');
const PostReddit = require('../models/PostReddit');
const Comment = require('../models/Comment');
const User = require('../models/User');
const CommunityPrivate = require('../models/CommunityPrivate');

async function findAnyPost(id) {
  const px = await PostX.findById(id);
  if (px) return { post: px, postType: 'PostX' };
  const pr = await PostReddit.findById(id);
  if (pr) return { post: pr, postType: 'PostReddit' };
  return null;
}

function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

exports.createPost = async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text) return fail(res, 400, 'Text is required');
    if (text.length > 400) return fail(res, 400, 'Text max 400 characters');

    const post = await PostX.create({
      author: req.user.id,
      text,
      mediaUrl: req.mediaUrl,
      mediaType: req.mediaType,
      origin: 'general',
      community: null,
      communityType: null,
    });
    res.status(201).json({ success: true, post: post.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.getFeed = async (req, res, next) => {
  try {
    const mode = req.query.mode || 'trending';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    let filter = {};
    let sort = {};

    if (mode === 'following') {
      if (!req.user) return fail(res, 401, 'Authentication required for following feed');
      const user = await User.findById(req.user.id).select('following');
      filter = { author: { $in: user.following }, origin: { $in: ['general', 'public_community'] } };
      sort = { createdAt: -1 };
    } else {
      filter = { origin: { $in: ['general', 'public_community'] } };
      sort = { trendingScore: -1, createdAt: -1 };
    }

    const [posts, total] = await Promise.all([
      PostX.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar role')
        .populate('community', 'name'),
      PostX.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      posts: posts.map(p => p.toPublicJSON()),
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) { next(err); }
};

exports.getPostById = async (req, res, next) => {
  try {
    const post = await PostX.findById(req.params.id).populate('author', 'username avatar role');
    if (!post) return fail(res, 404, 'Post not found');

    if (post.origin === 'private_community') {
      if (!req.user) return fail(res, 403, 'Access denied');
      const community = await CommunityPrivate.findById(post.community);
      if (!community || !community.isMember(req.user.id)) return fail(res, 403, 'Access denied');
    }

    res.json({ success: true, post: post.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.likePost = async (req, res, next) => {
  try {
    const post = await PostX.findById(req.params.id);
    if (!post) return fail(res, 404, 'Post not found');

    const idx = post.likes.indexOf(req.user.id);
    const liked = idx === -1;
    if (liked) post.likes.push(req.user.id);
    else post.likes.splice(idx, 1);

    post.trendingScore = PostX.calculateTrendingScore(post);
    await post.save();

    res.json({ success: true, liked, likesCount: post.likes.length });
  } catch (err) { next(err); }
};

exports.deletePost = async (req, res, next) => {
  try {
    const post = await PostX.findById(req.params.id);
    if (!post) return fail(res, 404, 'Post not found');

    const isAuthor = post.author.toString() === req.user.id;
    const isPlatformMod = req.user.role === 'moderator' || req.user.role === 'superadmin';
    if (!isAuthor && !isPlatformMod) return fail(res, 403, 'Not authorized');

    if (post.mediaUrl) {
      const filePath = path.join(__dirname, '..', post.mediaUrl);
      fs.unlink(filePath, () => {});
    }

    await Comment.deleteMany({ postId: post._id, postType: 'PostX' });
    await post.deleteOne();

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { next(err); }
};

exports.getComments = async (req, res, next) => {
  try {
    const found = await findAnyPost(req.params.id);
    if (!found) return fail(res, 404, 'Post not found');

    const topLevel = await Comment.find({ postId: req.params.id, postType: found.postType, parentComment: null })
      .sort({ createdAt: 1 })
      .populate('author', 'username avatar')
      .populate('replyingTo', 'username');

    const topIds = topLevel.map(c => c._id);
    const replies = await Comment.find({ parentComment: { $in: topIds } })
      .sort({ createdAt: 1 })
      .populate('author', 'username avatar')
      .populate('replyingTo', 'username');

    const replyMap = {};
    for (const r of replies) {
      const pid = r.parentComment.toString();
      (replyMap[pid] ||= []).push(r.toPublicJSON());
    }

    const comments = topLevel.map(c => ({
      ...c.toPublicJSON(),
      replies: replyMap[c._id.toString()] || [],
    }));

    res.json({ success: true, comments });
  } catch (err) { next(err); }
};

exports.createComment = async (req, res, next) => {
  try {
    const { text, parentCommentId } = req.body || {};
    if (!text) return fail(res, 400, 'Text is required');
    if (text.length > 400) return fail(res, 400, 'Text max 400 characters');

    const found = await findAnyPost(req.params.id);
    if (!found) return fail(res, 404, 'Post not found');
    const { post, postType } = found;

    const data = { author: req.user.id, text, postId: post._id, postType };

    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId);
      if (!parent) return fail(res, 404, 'Parent comment not found');
      if (parent.parentComment) return fail(res, 400, 'Cannot reply to a reply');
      data.parentComment = parentCommentId;
      data.replyingTo = parent.author;
    }

    const comment = await Comment.create(data);
    post.commentCount += 1;
    if (postType === 'PostX') post.trendingScore = PostX.calculateTrendingScore(post);
    await post.save();

    res.status(201).json({ success: true, comment: comment.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.likeComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return fail(res, 404, 'Comment not found');
    if (comment.postType !== 'PostX') return fail(res, 400, 'Likes not supported for this comment type');

    const idx = comment.likes.indexOf(req.user.id);
    const liked = idx === -1;
    if (liked) comment.likes.push(req.user.id);
    else comment.likes.splice(idx, 1);
    await comment.save();

    res.json({ success: true, liked, likesCount: comment.likes.length });
  } catch (err) { next(err); }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return fail(res, 404, 'Comment not found');

    const isAuthor = comment.author.toString() === req.user.id;
    const isPlatformMod = req.user.role === 'moderator' || req.user.role === 'superadmin';
    if (!isAuthor && !isPlatformMod) return fail(res, 403, 'Not authorized');

    const replyCount = await Comment.countDocuments({ parentComment: comment._id });
    await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();

    const found = await findAnyPost(comment.postId);
    if (found) {
      found.post.commentCount = Math.max(0, found.post.commentCount - (1 + replyCount));
      await found.post.save();
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
};
