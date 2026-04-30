const Comment = require('../models/Comment');

async function buildCommentTree(parentIds, currentDepth = 0, maxDepth = 3) {
  if (!parentIds.length || currentDepth >= maxDepth) return {};

  const children = await Comment.find({ parentComment: { $in: parentIds } })
    .sort({ createdAt: 1 })
    .populate('author', 'username avatar')
    .populate('replyingTo', 'username');

  if (!children.length) return {};

  const childIds = children.map(c => c._id);

  let subMap = {};
  let hasDeepChildren = {};

  if (currentDepth + 1 < maxDepth) {
    subMap = await buildCommentTree(childIds, currentDepth + 1, maxDepth);
  } else {
    const deepCounts = await Comment.aggregate([
      { $match: { parentComment: { $in: childIds } } },
      { $group: { _id: '$parentComment', count: { $sum: 1 } } }
    ]);
    for (const dc of deepCounts) {
      hasDeepChildren[dc._id.toString()] = true;
    }
  }

  const result = {};
  for (const c of children) {
    const pid = c.parentComment.toString();
    const cid = c._id.toString();
    const node = {
      ...c.toPublicJSON(),
      replies: subMap[cid] || [],
      hasMoreReplies: !!(hasDeepChildren[cid]),
    };
    (result[pid] ||= []).push(node);
  }

  return result;
}

module.exports = buildCommentTree;
