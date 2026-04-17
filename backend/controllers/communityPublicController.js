const fs = require('fs');
const path = require('path');
const CommunityPublic = require('../models/CommunityPublic');
const CommunityPrivate = require('../models/CommunityPrivate');
const PostX = require('../models/PostX');
const Comment = require('../models/Comment');

function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

exports.createCommunity = async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    if (!name || name.length < 3 || name.length > 50) return fail(res, 400, 'Name must be 3-50 characters');
    if (description && description.length > 300) return fail(res, 400, 'Description max 300 characters');

    const [pubExists, privExists] = await Promise.all([
      CommunityPublic.findOne({ name }),
      CommunityPrivate.findOne({ name }),
    ]);
    if (pubExists || privExists) return fail(res, 409, 'Community name already taken');

    const community = await CommunityPublic.create({
      name,
      description: description || '',
      avatar: req.mediaUrl || '',
      members: [],
    });

    res.status(201).json({ success: true, community: community.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.getCommunity = async (req, res, next) => {
  try {
    const community = await CommunityPublic.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');
    res.json({ success: true, community: community.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.joinCommunity = async (req, res, next) => {
  try {
    const community = await CommunityPublic.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');
    if (community.members.some(m => m.toString() === req.user.id)) return fail(res, 400, 'Already a member');

    community.members.push(req.user.id);
    await community.save();

    res.json({ success: true, message: 'Joined community', memberCount: community.members.length });
  } catch (err) { next(err); }
};

exports.leaveCommunity = async (req, res, next) => {
  try {
    const community = await CommunityPublic.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');

    const idx = community.members.findIndex(m => m.toString() === req.user.id);
    if (idx === -1) return fail(res, 400, 'Not a member');

    community.members.splice(idx, 1);
    await community.save();

    const stillExists = await CommunityPublic.findById(req.params.id);
    if (stillExists) {
      res.json({ success: true, message: 'Left community' });
    } else {
      res.json({ success: true, message: 'Left community. Community deleted as it had no members.' });
    }
  } catch (err) { next(err); }
};

exports.getCommunityFeed = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { origin: 'public_community', community: req.params.id, communityType: 'CommunityPublic' };

    const [posts, total] = await Promise.all([
      PostX.find(filter)
        .sort({ trendingScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar role'),
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

exports.createCommunityPost = async (req, res, next) => {
  try {
    const community = await CommunityPublic.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');
    if (!community.members.some(m => m.toString() === req.user.id)) return fail(res, 403, 'You must be a member to post');

    const { text } = req.body || {};
    if (!text) return fail(res, 400, 'Text is required');
    if (text.length > 400) return fail(res, 400, 'Text max 400 characters');

    const post = await PostX.create({
      author: req.user.id,
      text,
      mediaUrl: req.mediaUrl || '',
      mediaType: req.mediaType || 'none',
      origin: 'public_community',
      community: community._id,
      communityType: 'CommunityPublic',
    });

    community.postCount += 1;
    await community.save();

    res.status(201).json({ success: true, post: post.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.deleteCommunityPost = async (req, res, next) => {
  try {
    const post = await PostX.findById(req.params.postId);
    if (!post) return fail(res, 404, 'Post not found');
    if (post.community?.toString() !== req.params.id) return fail(res, 404, 'Post not found in this community');

    const isAuthor = post.author.toString() === req.user.id;
    const isPlatformMod = req.user.role === 'moderator' || req.user.role === 'superadmin';
    if (!isAuthor && !isPlatformMod) return fail(res, 403, 'Not authorized');

    if (post.mediaUrl) {
      const filePath = path.join(__dirname, '..', post.mediaUrl);
      fs.unlink(filePath, () => {});
    }

    await Comment.deleteMany({ postId: post._id, postType: 'PostX' });
    await post.deleteOne();

    const community = await CommunityPublic.findById(req.params.id);
    if (community) {
      community.postCount = Math.max(0, community.postCount - 1);
      await community.save();
    }

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { next(err); }
};

exports.listCommunities = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    const [communities, total] = await Promise.all([
      CommunityPublic.find(filter).sort({ 'members.length': -1 }).skip(skip).limit(limit),
      CommunityPublic.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      communities: communities.map(c => c.toPublicJSON()),
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) { next(err); }
};
