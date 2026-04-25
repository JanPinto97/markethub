const CommunityPublic = require('../models/CommunityPublic');
const CommunityPrivate = require('../models/CommunityPrivate');

exports.getMyCommunities = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [publicComms, privateComms] = await Promise.all([
      CommunityPublic.find({ members: userId }).select('name members avatar').lean(),
      CommunityPrivate.find({ 'members.user': userId }).select('name members avatar').lean(),
    ]);

    const communities = [
      ...publicComms.map(c => ({
        id: c._id,
        name: c.name,
        type: 'public',
        memberCount: c.members.length,
        avatar: c.avatar || '',
      })),
      ...privateComms.map(c => ({
        id: c._id,
        name: c.name,
        type: 'private',
        memberCount: c.members.length,
        avatar: c.avatar || '',
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, communities });
  } catch (err) { next(err); }
};
