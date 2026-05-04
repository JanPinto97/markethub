const CommunityPublic = require('../models/CommunityPublic');
const CommunityPrivate = require('../models/CommunityPrivate');

exports.discover = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sort = req.query.sort || 'popularity';
    const typeParam = req.query.type || 'public,private';
    const types = typeParam.split(',').map(t => t.trim()).filter(t => ['public', 'private'].includes(t));
    if (types.length === 0) types.push('public', 'private');

    const userId = req.user ? req.user.id : null;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let results = [];

    if (types.includes('public')) {
      const publicComms = await CommunityPublic.find(filter).lean();
      for (const c of publicComms) {
        results.push({
          id: c._id,
          name: c.name,
          avatar: c.avatar || '',
          type: 'public',
          memberCount: c.members.length,
          isJoined: userId ? c.members.some(m => m.toString() === userId) : false,
          createdAt: c.createdAt,
          _members: c.members,
        });
      }
    }

    if (types.includes('private')) {
      const privateComms = await CommunityPrivate.find(filter).lean();
      for (const c of privateComms) {
        results.push({
          id: c._id,
          name: c.name,
          avatar: c.avatar || '',
          type: 'private',
          memberCount: c.members.length,
          isJoined: userId ? c.members.some(m => m.user.toString() === userId) : false,
          createdAt: c.createdAt,
          _members: c.members,
        });
      }
    }

    if (sort === 'members') {
      results.sort((a, b) => b.memberCount - a.memberCount);
    } else if (sort === 'new') {
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      results.sort((a, b) => {
        const aRecent = (a._members || []).filter(m => {
          const joinDate = m.joinedAt || m.createdAt;
          return joinDate && new Date(joinDate) >= sevenDaysAgo;
        }).length;
        const bRecent = (b._members || []).filter(m => {
          const joinDate = m.joinedAt || m.createdAt;
          return joinDate && new Date(joinDate) >= sevenDaysAgo;
        }).length;
        if (bRecent !== aRecent) return bRecent - aRecent;
        return b.memberCount - a.memberCount;
      });
    }

    const total = results.length;
    const paged = results.slice(skip, skip + limit);
    const items = paged.map(({ _members, createdAt, ...rest }) => rest);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      communities: items,
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) { next(err); }
};
