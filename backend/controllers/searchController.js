const User = require('../models/User');
const PostX = require('../models/PostX');
const CommunityPublic = require('../models/CommunityPublic');
const CommunityPrivate = require('../models/CommunityPrivate');

function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

exports.search = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (q.length < 2) return fail(res, 400, 'Search query must be at least 2 characters');

    const type = req.query.type;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const regex = { $regex: q, $options: 'i' };

    const results = {};
    const tasks = [];

    if (!type || type === 'users') {
      tasks.push(
        (async () => {
          const filter = { username: regex };
          const [items, total] = await Promise.all([
            User.find(filter).skip(skip).limit(limit),
            User.countDocuments(filter),
          ]);
          results.users = { items: items.map(u => u.toPublicJSON()), total };
        })()
      );
    }

    if (!type || type === 'posts') {
      tasks.push(
        (async () => {
          const filter = { text: regex, origin: { $in: ['general', 'public_community'] } };
          const [items, total] = await Promise.all([
            PostX.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
              .populate('author', 'username avatar')
              .populate('community', 'name'),
            PostX.countDocuments(filter),
          ]);
          results.posts = { items: items.map(p => p.toPublicJSON()), total };
        })()
      );
    }

    if (!type || type === 'communities') {
      tasks.push(
        (async () => {
          const [pubItems, privItems] = await Promise.all([
            CommunityPublic.find({ name: regex }),
            CommunityPrivate.find({ name: regex }),
          ]);
          const all = [
            ...pubItems.map(c => ({ ...c.toPublicJSON(), type: 'public' })),
            ...privItems.map(c => ({ ...c.toPublicJSON(), type: 'private' })),
          ];
          all.sort((a, b) => b.memberCount - a.memberCount);
          const total = all.length;
          const paged = all.slice(skip, skip + limit);
          results.communities = { items: paged, total };
        })()
      );
    }

    await Promise.all(tasks);
    res.json({ success: true, query: q, results });
  } catch (err) { next(err); }
};
