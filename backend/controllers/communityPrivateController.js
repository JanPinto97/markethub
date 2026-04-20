const fs = require('fs');
const path = require('path');
const CommunityPrivate = require('../models/CommunityPrivate');
const CommunityPublic = require('../models/CommunityPublic');
const PostX = require('../models/PostX');
const Comment = require('../models/Comment');

function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

function getUserRole(community, userId) {
  const member = community.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
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

    const community = await CommunityPrivate.create({
      name,
      description: description || '',
      avatar: req.mediaUrl || '',
      members: [{ user: req.user.id, role: 'leader' }],
    });

    res.status(201).json({ success: true, community: community.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.getCommunity = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');
    if (!community.isMember(req.user.id)) return fail(res, 403, 'This is a private community');

    const userRole = getUserRole(community, req.user.id);

    await community.populate('members.user', 'username avatar');
    await community.populate({
      path: 'pinnedPosts',
      select: 'text mediaUrl mediaType author createdAt',
      populate: { path: 'author', select: 'username avatar' },
    });

    const detail = {
      ...community.toPublicJSON(),
      members: community.members.map(m => ({
        user: m.user && m.user.toPublicJSON ? m.user.toPublicJSON() : m.user,
        role: m.role,
      })),
      pinnedPosts: community.pinnedPosts,
    };

    const result = { success: true, community: detail, userRole };

    if (userRole === 'leader' || userRole === 'moderator') {
      result.pendingRequests = community.joinRequests.filter(r => r.status === 'pending');
    }

    res.json(result);
  } catch (err) { next(err); }
};

exports.requestToJoin = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');
    if (community.isMember(req.user.id)) return fail(res, 400, 'Already a member');

    const { message } = req.body || {};
    if (!message) return fail(res, 400, 'Message is required');
    if (message.length > 150) return fail(res, 400, 'Message max 150 characters');

    const hasPending = community.joinRequests.some(
      r => r.user.toString() === req.user.id && r.status === 'pending'
    );
    if (hasPending) return fail(res, 400, 'Request already pending');

    community.joinRequests.push({ user: req.user.id, message, status: 'pending' });
    await community.save();

    res.json({ success: true, message: 'Join request sent' });
  } catch (err) { next(err); }
};

exports.handleJoinRequest = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');

    const role = getUserRole(community, req.user.id);
    if (role !== 'leader' && role !== 'moderator') return fail(res, 403, 'Insufficient permissions');

    const { action } = req.body || {};
    if (action !== 'accept' && action !== 'reject') return fail(res, 400, 'Action must be accept or reject');

    const request = community.joinRequests.id(req.params.requestId);
    if (!request) return fail(res, 404, 'Request not found');
    if (request.status !== 'pending') return fail(res, 400, 'Request already handled');

    if (action === 'accept') {
      request.status = 'accepted';
      community.members.push({ user: request.user, role: 'member' });
    } else {
      request.status = 'rejected';
    }

    await community.save();
    res.json({ success: true, action, message: `Request ${action}ed` });
  } catch (err) { next(err); }
};

exports.expelMember = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');

    const role = getUserRole(community, req.user.id);
    if (role !== 'leader') return fail(res, 403, 'Only the leader can expel members');
    if (req.params.userId === req.user.id) return fail(res, 400, 'Cannot expel yourself. Leave the community instead.');

    const idx = community.members.findIndex(m => m.user.toString() === req.params.userId);
    if (idx === -1) return fail(res, 404, 'Member not found');
    if (community.members[idx].role === 'leader') return fail(res, 400, 'Cannot expel the leader');

    community.members.splice(idx, 1);
    await community.save();

    res.json({ success: true, message: 'Member expelled' });
  } catch (err) { next(err); }
};

exports.promoteMember = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');

    const callerRole = getUserRole(community, req.user.id);
    if (callerRole !== 'leader') return fail(res, 403, 'Only the leader can promote members');
    if (req.params.userId === req.user.id) return fail(res, 400, 'Cannot promote yourself');

    const { role } = req.body || {};
    if (!['moderator', 'little_whale', 'member'].includes(role)) {
      return fail(res, 400, 'Role must be moderator, little_whale or member');
    }

    const target = community.members.find(m => m.user.toString() === req.params.userId);
    if (!target) return fail(res, 404, 'Member not found');
    if (target.role === 'leader') return fail(res, 400, 'Cannot change the leader role');

    target.role = role;
    await community.save();

    res.json({ success: true, message: 'Member role updated', newRole: role });
  } catch (err) { next(err); }
};

exports.leaveCommunity = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');

    const idx = community.members.findIndex(m => m.user.toString() === req.user.id);
    if (idx === -1) return fail(res, 400, 'Not a member');

    const wasLeader = community.members[idx].role === 'leader';
    community.members.splice(idx, 1);

    if (wasLeader && community.members.length > 0) {
      const promoted = community.promoteNewLeader();
      if (promoted) console.log(`New leader promoted: ${promoted.user}`);
    }

    await community.save();

    const stillExists = await CommunityPrivate.findById(req.params.id);
    if (stillExists) {
      res.json({ success: true, message: 'Left community' });
    } else {
      res.json({ success: true, message: 'Left community. Community deleted as it had no members.' });
    }
  } catch (err) { next(err); }
};

exports.deleteCommunity = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');

    const role = getUserRole(community, req.user.id);
    if (role !== 'leader') return fail(res, 403, 'Only the leader can delete the community');

    const posts = await PostX.find({ community: community._id, communityType: 'CommunityPrivate' });
    const postIds = posts.map(p => p._id);

    for (const post of posts) {
      if (post.mediaUrl) {
        const filePath = path.join(__dirname, '..', post.mediaUrl);
        fs.unlink(filePath, () => {});
      }
    }

    await Comment.deleteMany({ postId: { $in: postIds }, postType: 'PostX' });
    await PostX.deleteMany({ _id: { $in: postIds } });
    await community.deleteOne();

    res.json({ success: true, message: 'Community deleted' });
  } catch (err) { next(err); }
};

exports.getCommunityFeed = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');
    if (!community.isMember(req.user.id)) return fail(res, 403, 'Members only');

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const pinnedPosts = await PostX.find({ _id: { $in: community.pinnedPosts } })
      .populate('author', 'username avatar');

    // Role bonus is applied in JS, not MongoDB — acceptable for current scale
    const allPosts = await PostX.find({
      origin: 'private_community',
      community: community._id,
      communityType: 'CommunityPrivate',
      isPinned: false,
    }).populate('author', 'username avatar role _id');

    const roleMap = {};
    for (const m of community.members) {
      roleMap[m.user.toString()] = m.role;
    }

    const scored = allPosts.map(post => {
      const authorRole = roleMap[post.author._id.toString()] || 'member';
      const effectiveScore = post.trendingScore + community.getRoleWeight(authorRole);
      return { post, effectiveScore };
    });

    scored.sort((a, b) => b.effectiveScore - a.effectiveScore || b.post.createdAt - a.post.createdAt);

    const total = scored.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = scored.slice(start, start + limit);

    res.json({
      success: true,
      pinnedPosts: pinnedPosts.map(p => p.toPublicJSON()),
      posts: paged.map(s => s.post.toPublicJSON()),
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) { next(err); }
};

exports.createCommunityPost = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');
    if (!community.isMember(req.user.id)) return fail(res, 403, 'You must be a member to post');

    const { text } = req.body || {};
    if (!text) return fail(res, 400, 'Text is required');
    if (text.length > 400) return fail(res, 400, 'Text max 400 characters');

    const post = await PostX.create({
      author: req.user.id,
      text,
      mediaUrl: req.mediaUrl || '',
      mediaType: req.mediaType || 'none',
      origin: 'private_community',
      community: community._id,
      communityType: 'CommunityPrivate',
    });

    community.postCount += 1;
    await community.save();

    res.status(201).json({ success: true, post: post.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.deleteCommunityPost = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');

    const post = await PostX.findById(req.params.postId);
    if (!post) return fail(res, 404, 'Post not found');
    if (post.community?.toString() !== req.params.id) return fail(res, 404, 'Post not found in this community');

    const isAuthor = post.author.toString() === req.user.id;
    const communityRole = getUserRole(community, req.user.id);
    const isCommunityMod = communityRole === 'leader' || communityRole === 'moderator';
    const isPlatformMod = req.user.role === 'moderator' || req.user.role === 'superadmin';

    if (!isAuthor && !isCommunityMod && !isPlatformMod) return fail(res, 403, 'Not authorized');

    if (post.mediaUrl) {
      const filePath = path.join(__dirname, '..', post.mediaUrl);
      fs.unlink(filePath, () => {});
    }

    await Comment.deleteMany({ postId: post._id, postType: 'PostX' });

    if (post.isPinned) {
      const pinIdx = community.pinnedPosts.indexOf(post._id.toString());
      if (pinIdx !== -1) community.pinnedPosts.splice(pinIdx, 1);
    }

    community.postCount = Math.max(0, community.postCount - 1);
    await community.save();
    await post.deleteOne();

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { next(err); }
};

exports.pinPost = async (req, res, next) => {
  try {
    const community = await CommunityPrivate.findById(req.params.id);
    if (!community) return fail(res, 404, 'Community not found');

    const role = getUserRole(community, req.user.id);
    if (role !== 'leader') return fail(res, 403, 'Only the leader can pin posts');

    const post = await PostX.findById(req.params.postId);
    if (!post) return fail(res, 404, 'Post not found');
    if (post.community?.toString() !== req.params.id) return fail(res, 404, 'Post not found in this community');

    const pinIdx = community.pinnedPosts.findIndex(id => id.toString() === post._id.toString());
    let pinned;
    if (pinIdx !== -1) {
      community.pinnedPosts.splice(pinIdx, 1);
      post.isPinned = false;
      pinned = false;
    } else {
      community.pinnedPosts.push(post._id);
      post.isPinned = true;
      pinned = true;
    }

    await Promise.all([community.save(), post.save()]);
    res.json({ success: true, pinned, message: pinned ? 'Post pinned' : 'Post unpinned' });
  } catch (err) { next(err); }
};

exports.listCommunities = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const [communities, total] = await Promise.all([
      CommunityPrivate.find(filter).sort({ 'members.length': -1 }).skip(skip).limit(limit),
      CommunityPrivate.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      communities: communities.map(c => c.toPublicJSON()),
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) { next(err); }
};
