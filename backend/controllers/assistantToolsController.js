const axios = require('axios');
const User = require('../models/User');
const CommunityPublic = require('../models/CommunityPublic');
const CommunityPrivate = require('../models/CommunityPrivate');
const DiscussionTopic = require('../models/DiscussionTopic');
const PostReddit = require('../models/PostReddit');
const PostX = require('../models/PostX');

const cache = new Map();
const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};
const setCached = (key, value, ttlMs) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const trimUser = (u) => ({
  username: u.username,
  bio: u.bio || '',
  role: u.role,
  followersCount: u.followers ? u.followers.length : 0,
  followingCount: u.following ? u.following.length : 0,
  profileUrl: `/profile/${u.username}`,
});

const trimCommunityPublic = (c) => ({
  id: c._id.toString(),
  name: c.name,
  description: c.description || '',
  type: 'public',
  memberCount: c.members ? c.members.length : 0,
  postCount: c.postCount || 0,
  url: `/community/c/${c._id}`,
});

const trimCommunityPrivate = (c) => ({
  id: c._id.toString(),
  name: c.name,
  description: c.description || '',
  type: 'private',
  memberCount: c.members ? c.members.length : 0,
  postCount: c.postCount || 0,
  url: `/community/p/${c._id}`,
});

const trimTopic = (t) => ({
  slug: t.slug,
  name: t.name,
  category: t.category,
  description: t.description || '',
  postCount: t.postCount || 0,
  url: `/community/t/${t.slug}`,
});

const trimPostReddit = (p, slug) => ({
  id: p._id.toString(),
  title: p.title,
  text: (p.text || '').slice(0, 500),
  author: p.author && p.author.username ? p.author.username : null,
  voteScore: (p.upvotes ? p.upvotes.length : 0) - (p.downvotes ? p.downvotes.length : 0),
  commentCount: p.commentCount || 0,
  createdAt: p.createdAt,
  url: `/community/t/${slug}/p/${p._id}`,
});

const searchCommunities = async ({ q = '', type } = {}) => {
  if (!q || String(q).length < 1) return { items: [] };
  const regex = { $regex: String(q), $options: 'i' };
  const filter = { $or: [{ name: regex }, { description: regex }] };
  const items = [];
  if (!type || type === 'public' || type === 'all') {
    const pubs = await CommunityPublic.find(filter).limit(10);
    items.push(...pubs.map(trimCommunityPublic));
  }
  if (!type || type === 'private' || type === 'all') {
    const privs = await CommunityPrivate.find(filter).limit(10);
    items.push(...privs.map(trimCommunityPrivate));
  }
  return { items };
};

const getCommunity = async ({ id } = {}) => {
  if (!id) return { error: 'id required' };
  try {
    const pub = await CommunityPublic.findById(id);
    if (pub) {
      const recentPosts = await PostX.find({ community: pub._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('author', 'username');
      return {
        ...trimCommunityPublic(pub),
        recentPosts: recentPosts.map((p) => ({
          author: p.author && p.author.username ? p.author.username : null,
          text: (p.text || '').slice(0, 200),
          createdAt: p.createdAt,
        })),
      };
    }
  } catch {}
  try {
    const priv = await CommunityPrivate.findById(id);
    if (priv) return trimCommunityPrivate(priv);
  } catch {}
  return { error: 'Community not found' };
};

const searchUsers = async ({ q } = {}) => {
  if (!q || String(q).length < 1) return { items: [] };
  const users = await User.find({ username: { $regex: String(q), $options: 'i' } }).limit(10);
  return { items: users.map(trimUser) };
};

const getUser = async ({ username } = {}) => {
  if (!username) return { error: 'username required' };
  const user = await User.findOne({ username });
  if (!user) return { error: 'User not found' };
  return trimUser(user);
};

const searchTopics = async ({ q = '' } = {}) => {
  const filter = q
    ? {
        $or: [
          { name: { $regex: String(q), $options: 'i' } },
          { description: { $regex: String(q), $options: 'i' } },
        ],
      }
    : {};
  const topics = await DiscussionTopic.find(filter).limit(15);
  return { items: topics.map(trimTopic) };
};

const getTopicPosts = async ({ slug, limit = 10 } = {}) => {
  if (!slug) return { error: 'slug required' };
  const topic = await DiscussionTopic.findOne({ slug });
  if (!topic) return { error: 'Topic not found' };
  const max = Math.min(Number(limit) || 10, 25);
  const posts = await PostReddit.find({ topic: topic._id })
    .sort({ createdAt: -1 })
    .limit(max)
    .populate('author', 'username');
  return { topic: trimTopic(topic), items: posts.map((p) => trimPostReddit(p, slug)) };
};

const NEWS_TTL_MS = 2 * 60 * 1000;
const CALENDAR_TTL_MS = 5 * 60 * 1000;

const getLatestNews = async ({ limit = 10 } = {}) => {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return { error: 'News service not configured' };
  const max = Math.min(Number(limit) || 10, 25);
  const cacheKey = 'news:general';
  let data = getCached(cacheKey);
  if (!data) {
    try {
      const resp = await axios.get(`https://finnhub.io/api/v1/news?category=general&token=${key}`);
      data = resp.data || [];
      setCached(cacheKey, data, NEWS_TTL_MS);
    } catch {
      return { error: 'Failed to fetch news' };
    }
  }
  const items = data.slice(0, max).map((n) => ({
    headline: n.headline,
    summary: (n.summary || '').slice(0, 400),
    source: n.source,
    datetime: n.datetime,
    url: n.url,
  }));
  return { items };
};

const getCalendar = async ({ from, to } = {}) => {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return { error: 'Calendar service not configured' };
  try {
    const today = new Date();
    const offset = (d, days) => {
      const x = new Date(d);
      x.setDate(x.getDate() + days);
      return x.toISOString().slice(0, 10);
    };
    const f = from || offset(today, 0);
    const t = to || offset(today, 7);
    const cacheKey = `calendar:${f}:${t}`;
    let data = getCached(cacheKey);
    if (!data) {
      const resp = await axios.get(
        `https://finnhub.io/api/v1/calendar/economic?from=${f}&to=${t}&token=${key}`
      );
      data = resp.data || {};
      setCached(cacheKey, data, CALENDAR_TTL_MS);
    }
    const items = (data.economicCalendar || []).slice(0, 50).map((e) => ({
      event: e.event,
      country: e.country,
      time: e.time,
      impact: e.impact,
      actual: e.actual,
      prev: e.prev,
      estimate: e.estimate,
      unit: e.unit,
    }));
    return { from: f, to: t, items };
  } catch {
    return { error: 'Failed to fetch calendar' };
  }
};

const handler = (fn, argsFrom = (req) => ({ ...req.query, ...req.params })) => async (req, res, next) => {
  try {
    const result = await fn(argsFrom(req));
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  searchCommunities,
  getCommunity,
  searchUsers,
  getUser,
  searchTopics,
  getTopicPosts,
  getLatestNews,
  getCalendar,
  handlers: {
    searchCommunities: handler(searchCommunities),
    getCommunity: handler(getCommunity),
    searchUsers: handler(searchUsers),
    getUser: handler(getUser),
    searchTopics: handler(searchTopics),
    getTopicPosts: handler(getTopicPosts),
    getLatestNews: handler(getLatestNews),
    getCalendar: handler(getCalendar),
  },
};
