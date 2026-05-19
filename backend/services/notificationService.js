const Notification = require('../models/Notification');

async function notify({ recipient, actor, type, title, message, link }) {
  try {
    if (!recipient) return null;
    if (actor && recipient.toString() === actor.toString()) return null;
    const notif = await Notification.create({
      recipient,
      actor: actor || null,
      type,
      title,
      message,
      link: link || '',
    });
    return notif;
  } catch (err) {
    console.error('[notify] failed:', err.message);
    return null;
  }
}

async function notifyMany(recipients, payload) {
  const unique = [...new Set(recipients.filter(Boolean).map(r => r.toString()))];
  await Promise.all(unique.map(r => notify({ ...payload, recipient: r })));
}

module.exports = { notify, notifyMany };
