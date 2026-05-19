const Notification = require('../models/Notification');

function fail(res, code, message) {
  return res.status(code).json({ success: false, message, code });
}

exports.list = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
    const docs = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'username avatar');

    const unreadCount = await Notification.countDocuments({ recipient: req.user.id, read: false });

    res.json({
      success: true,
      notifications: docs.map(d => d.toPublicJSON()),
      unreadCount,
    });
  } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.markOneRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, recipient: req.user.id });
    if (!notif) return fail(res, 404, 'Notification not found');
    if (!notif.read) {
      notif.read = true;
      await notif.save();
    }
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    res.json({ success: true });
  } catch (err) { next(err); }
};
