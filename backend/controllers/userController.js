const User = require('../models/User');
const PostX = require('../models/PostX');
const CommunityPublic = require('../models/CommunityPublic');

function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

exports.getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: { $regex: `^${req.params.username}$`, $options: 'i' } });
    if (!user) return fail(res, 404, 'User not found');

    const communities = await CommunityPublic.find({ members: user._id });

    const result = {
      success: true,
      user: user.toPublicJSON(),
      communities: communities.map(c => c.toPublicJSON()),
    };

    if (req.user) {
      const me = await User.findById(req.user.id).select('following');
      result.isFollowing = me.following.some(id => id.toString() === user._id.toString());
    }

    res.json(result);
  } catch (err) { next(err); }
};

exports.getUserPosts = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: { $regex: `^${req.params.username}$`, $options: 'i' } });
    if (!user) return fail(res, 404, 'User not found');

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { author: user._id, origin: { $in: ['general', 'public_community'] } };

    const [posts, total] = await Promise.all([
      PostX.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('author', 'username avatar')
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

exports.followUser = async (req, res, next) => {
  try {
    const target = await User.findOne({ username: { $regex: `^${req.params.username}$`, $options: 'i' } });
    if (!target) return fail(res, 404, 'User not found');
    if (target._id.toString() === req.user.id) return fail(res, 400, 'Cannot follow yourself');

    const me = await User.findById(req.user.id);
    const idx = me.following.findIndex(id => id.toString() === target._id.toString());
    let following;

    if (idx !== -1) {
      me.following.splice(idx, 1);
      const tIdx = target.followers.findIndex(id => id.toString() === me._id.toString());
      if (tIdx !== -1) target.followers.splice(tIdx, 1);
      following = false;
    } else {
      me.following.push(target._id);
      target.followers.push(me._id);
      following = true;
    }

    await Promise.all([me.save(), target.save()]);
    res.json({ success: true, following, followersCount: target.followers.length });
  } catch (err) { next(err); }
};

exports.getFollowers = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: { $regex: `^${req.params.username}$`, $options: 'i' } });
    if (!user) return fail(res, 404, 'User not found');

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    await user.populate({ path: 'followers', select: 'username avatar bio role createdAt following followers coverImage' });

    const total = user.followers.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = user.followers.slice(start, start + limit);

    res.json({
      success: true,
      followers: paged.map(u => u.toPublicJSON()),
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) { next(err); }
};

exports.getFollowing = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: { $regex: `^${req.params.username}$`, $options: 'i' } });
    if (!user) return fail(res, 404, 'User not found');

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    await user.populate({ path: 'following', select: 'username avatar bio role createdAt following followers coverImage' });

    const total = user.following.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = user.following.slice(start, start + limit);

    res.json({
      success: true,
      following: paged.map(u => u.toPublicJSON()),
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) { next(err); }
};
