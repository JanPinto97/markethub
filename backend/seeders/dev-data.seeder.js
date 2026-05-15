/**
 * DEV DATA SEEDER
 *
 * Test users (password: Test1234!):
 *   alice_trader, bob_crypto, carol_quant, david_value,
 *   eve_scalper, frank_macro, grace_whale, henry_analyst
 *
 * Community roles (private):
 *   Whale Alerts: grace_whale (leader), bob_crypto (moderator),
 *                 alice_trader (little_whale), david_value (member), eve_scalper (member)
 *   Quant Lab:    carol_quant (leader), henry_analyst (moderator),
 *                 frank_macro (member), alice_trader (member)
 *
 * Pending requests (Whale Alerts):
 *   frank_macro: "Experienced macro trader looking for whale insights"
 *   henry_analyst: "Analyst with 5 years of market experience"
 *
 * Admin seed: see scripts/seed.js for superadmin and moderator accounts
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const PostX = require('../models/PostX');
const PostReddit = require('../models/PostReddit');
const Comment = require('../models/Comment');
const CommunityPublic = require('../models/CommunityPublic');
const CommunityPrivate = require('../models/CommunityPrivate');
const DiscussionTopic = require('../models/DiscussionTopic');

const SALT_ROUNDS = 10;
const PASSWORD = 'Test1234!';
const NOW = new Date();

const stats = {
  usersCreated: 0,
  publicComms: 0,
  privateComms: 0,
  postsGeneral: 0,
  postsPublicComm: 0,
  postsPrivateComm: 0,
  postReddit: 0,
  commentsPostX: 0,
  commentsPostReddit: 0,
  pendingRequests: 0,
  followersCreated: 0,
  trendingRecalc: 0,
};

const USER_DATA = [
  { username: 'alice_trader', email: 'alice@test.com', bio: 'Full-time forex trader. Technical analysis enthusiast.' },
  { username: 'bob_crypto', email: 'bob@test.com', bio: 'Crypto maximalist since 2017. DeFi researcher.' },
  { username: 'carol_quant', email: 'carol@test.com', bio: 'Quantitative analyst. Python and R for systematic trading.' },
  { username: 'david_value', email: 'david@test.com', bio: 'Value investor following Buffett principles.' },
  { username: 'eve_scalper', email: 'eve@test.com', bio: 'Scalper and day trader. ES futures specialist.' },
  { username: 'frank_macro', email: 'frank@test.com', bio: 'Global macro strategist. Central bank watcher.' },
  { username: 'grace_whale', email: 'grace@test.com', bio: 'Institutional trader. Large cap focused.' },
  { username: 'henry_analyst', email: 'henry@test.com', bio: 'Equity research analyst. Earnings season is my favorite.' },
];

const FOLLOWER_PAIRS = [
  ['alice_trader', 'bob_crypto'],
  ['alice_trader', 'carol_quant'],
  ['bob_crypto', 'alice_trader'],
  ['bob_crypto', 'eve_scalper'],
  ['carol_quant', 'alice_trader'],
  ['carol_quant', 'henry_analyst'],
  ['david_value', 'frank_macro'],
  ['david_value', 'grace_whale'],
  ['eve_scalper', 'bob_crypto'],
  ['eve_scalper', 'alice_trader'],
  ['frank_macro', 'david_value'],
  ['frank_macro', 'grace_whale'],
  ['grace_whale', 'frank_macro'],
  ['grace_whale', 'alice_trader'],
  ['henry_analyst', 'carol_quant'],
  ['henry_analyst', 'david_value'],
];

const GENERAL_POSTS = [
  { author: 'alice_trader', text: 'EUR/USD breaking above 1.0950 resistance. Watch for continuation toward 1.1020 if daily close holds.' },
  { author: 'bob_crypto', text: 'Bitcoin dominance falling below 48%. Altseason signals are getting stronger. Layer 2 tokens leading the charge.' },
  { author: 'carol_quant', text: 'Backtested a mean reversion strategy on SPY. Sharpe ratio of 1.8 over 5 years. Need to account for transaction costs.' },
  { author: 'david_value', text: 'P/E ratios in the energy sector are historically compressed. Some names trading at 5-6x earnings with strong free cash flow.' },
  { author: 'eve_scalper', text: 'ES futures showing strong support at 5420. Volume profile confirms this as a high-value area.' },
  { author: 'frank_macro', text: 'Fed minutes suggest a more dovish tilt. Market pricing in 75bps of cuts by year end.' },
  { author: 'grace_whale', text: 'Institutional flows shifting toward defensive sectors. Healthcare and utilities seeing unusual volume.' },
  { author: 'henry_analyst', text: 'NVDA earnings beat estimates by 15%. Forward guidance raised. Semiconductor cycle still has legs.' },
  { author: 'alice_trader', text: 'GBP/JPY forming a descending triangle on the 4H chart. Break below 188.50 targets 186.00.' },
  { author: 'bob_crypto', text: 'Ethereum gas fees dropping to 2021 levels. L2 adoption is finally reducing mainnet congestion.' },
  { author: 'carol_quant', text: 'Realized volatility diverging from implied. VIX seems overpriced relative to actual market moves.' },
  { author: 'david_value', text: 'Dividend aristocrats outperforming growth YTD. Quality factor making a comeback in this rate environment.' },
  { author: 'eve_scalper', text: 'NQ scalping tip: watch the 15850-15900 zone. Algos are stacking orders there based on order flow data.' },
  { author: 'frank_macro', text: 'ECB holding rates steady but language shifting hawkish. Euro strength could persist into Q3.' },
  { author: 'grace_whale', text: 'Block trades in SPY puts increasing. Someone is hedging a large equity portfolio ahead of FOMC.' },
];

const PUBLIC_COMMUNITY_DATA = [
  {
    name: 'Gold Bugs',
    description: 'For gold and precious metals enthusiasts. Analysis, news, and trade ideas.',
    creator: 'frank_macro',
    members: ['alice_trader', 'david_value', 'grace_whale', 'henry_analyst'],
    posts: [
      { author: 'frank_macro', text: 'Gold breaking $2400 resistance. Central bank buying continues to drive demand.', pinned: true },
      { author: 'alice_trader', text: 'Silver/gold ratio at 85. Historically silver outperforms when ratio is above 80.' },
      { author: 'david_value', text: 'Mining stocks lagging the metal price. GDX showing a 15% discount to NAV.' },
      { author: 'grace_whale', text: 'COMEX gold inventories at multi-year lows. Physical demand exceeding paper market expectations.' },
      { author: 'henry_analyst', text: 'Barrick Gold Q2 all-in sustaining costs came in at $1,250/oz. Margins expanding nicely.' },
    ],
  },
  {
    name: 'Crypto Alpha',
    description: 'On-chain analysis, DeFi strategies, and crypto market insights.',
    creator: 'bob_crypto',
    members: ['alice_trader', 'eve_scalper', 'carol_quant', 'henry_analyst'],
    posts: [
      { author: 'bob_crypto', text: 'New Uniswap V4 hooks enabling custom AMM logic. This changes the DeFi composability game.', pinned: true },
      { author: 'alice_trader', text: 'BTC whale wallets accumulating aggressively in the 62-64k range. On-chain data is bullish.' },
      { author: 'eve_scalper', text: 'SOL perpetual funding rates turning negative. Short squeeze potential building.' },
      { author: 'carol_quant', text: 'Built a sentiment model using crypto Twitter data. Correlation with 24h price moves is 0.65.' },
      { author: 'henry_analyst', text: 'Coinbase Q2 revenue up 35% QoQ. Trading volume recovery stronger than expected.' },
    ],
  },
  {
    name: 'Macro Watch',
    description: 'Global macro analysis, central bank policy, and economic data tracking.',
    creator: 'frank_macro',
    members: ['carol_quant', 'david_value', 'grace_whale', 'bob_crypto'],
    posts: [
      { author: 'frank_macro', text: 'US 10Y yield curve uninverting. Historically this signals recession within 6-12 months.', pinned: true },
      { author: 'carol_quant', text: 'PMI data from China disappointing again. Manufacturing contraction deepening.' },
      { author: 'david_value', text: 'US consumer savings rate at 3.2%. Below pre-pandemic average. Spending sustainability in question.' },
      { author: 'grace_whale', text: 'BOJ intervention probability rising. USD/JPY above 160 is their red line based on past actions.' },
      { author: 'bob_crypto', text: 'M2 money supply turning positive globally. Historically correlated with risk asset rallies in 3-6 months.' },
    ],
  },
];

const PRIVATE_COMMUNITY_DATA = [
  {
    name: 'Whale Alerts',
    description: 'Institutional-grade trade alerts and large position tracking.',
    members: [
      { username: 'grace_whale', role: 'leader' },
      { username: 'bob_crypto', role: 'moderator' },
      { username: 'alice_trader', role: 'little_whale' },
      { username: 'david_value', role: 'member' },
      { username: 'eve_scalper', role: 'member' },
    ],
    pendingRequests: [
      { username: 'frank_macro', message: 'Experienced macro trader looking for whale insights' },
      { username: 'henry_analyst', message: 'Analyst with 5 years of market experience' },
    ],
    posts: [
      { author: 'grace_whale', text: 'Large BTC transfer detected: 5,000 BTC moved from Coinbase to cold storage. Whale accumulation signal.', pinned: true },
      { author: 'bob_crypto', text: 'Unusual options activity in AAPL. $50M in call spreads expiring next month.' },
      { author: 'alice_trader', text: 'Dark pool volume in TSLA spiking. Institutional interest returning after the pullback.' },
      { author: 'grace_whale', text: 'New whale wallet created and immediately bought $12M in ETH. Address linked to a known fund.' },
      { author: 'david_value', text: 'Berkshire 13F filing shows new position in Occidental Petroleum. Buffett increasing energy exposure.' },
      { author: 'eve_scalper', text: 'Block trade alert: 10,000 ES contracts at 5435. Largest single trade this week.' },
      { author: 'bob_crypto', text: 'Tether treasury minted $1B USDT. Last time this happened, BTC rallied 20% in 30 days.' },
      { author: 'alice_trader', text: 'Whale alert: $200M in BTC longs opened on Binance futures in the last hour.' },
    ],
  },
  {
    name: 'Quant Lab',
    description: 'Quantitative strategies, algorithmic trading, and systematic approach discussions.',
    members: [
      { username: 'carol_quant', role: 'leader' },
      { username: 'henry_analyst', role: 'moderator' },
      { username: 'frank_macro', role: 'member' },
      { username: 'alice_trader', role: 'member' },
    ],
    pendingRequests: [],
    posts: [
      { author: 'carol_quant', text: 'New pairs trading model: cointegration test on XOM/CVX showing stable spread. Z-score entry at 2.0.' },
      { author: 'henry_analyst', text: 'Random forest model for earnings surprise prediction hitting 72% accuracy on out-of-sample data.' },
      { author: 'frank_macro', text: 'Factor model update: momentum factor underperforming value by 300bps this quarter.' },
      { author: 'carol_quant', text: 'Implemented a Kalman filter for dynamic hedge ratios. Reduces tracking error by 40% vs static OLS.' },
      { author: 'alice_trader', text: 'Interesting paper on using transformer models for order book prediction. Latency is still too high for live trading.' },
      { author: 'henry_analyst', text: 'Sector rotation model signaling overweight energy and underweight tech for next quarter.' },
    ],
  },
];

const POSTREDDIT_DATA = [
  {
    topicSlug: 'crypto',
    posts: [
      {
        author: 'bob_crypto',
        title: 'Is Bitcoin still a hedge against inflation or has the narrative shifted?',
        text: 'With BTC correlation to tech stocks increasing, I wonder if the original thesis of Bitcoin as digital gold still holds. Institutional adoption seems to have changed the asset class behavior fundamentally. What are your thoughts on the long-term inflation hedge narrative?',
        upvoteCount: 45,
        downvoteCount: 12,
      },
      {
        author: 'carol_quant',
        title: 'On-chain metrics suggesting accumulation phase',
        text: 'Exchange reserves at 5-year lows, long-term holder supply at ATH, and MVRV ratio below 1.5. Multiple on-chain indicators are aligning in a way we typically see before major moves. Not financial advice, but the data is compelling.',
        upvoteCount: 38,
        downvoteCount: 5,
      },
    ],
  },
  {
    topicSlug: 'forex',
    posts: [
      {
        author: 'alice_trader',
        title: 'EUR/USD technical analysis: major decision point at 1.1000',
        text: 'Monthly chart shows a massive symmetrical triangle converging at the 1.1000 psychological level. A breakout in either direction could define the trend for the rest of the year. Key levels to watch: 1.1050 resistance, 1.0850 support.',
        upvoteCount: 32,
        downvoteCount: 8,
      },
      {
        author: 'frank_macro',
        title: 'Why the Japanese Yen could be the trade of the decade',
        text: 'BOJ is cornered between defending the yen and maintaining yield curve control. Something has to give. When it does, the yen reversal could be violent and sustained. Looking at historical precedents from the Plaza Accord era.',
        upvoteCount: 55,
        downvoteCount: 3,
      },
    ],
  },
  {
    topicSlug: 'macro-economics',
    posts: [
      {
        author: 'frank_macro',
        title: 'The global debt cycle and what it means for the next decade',
        text: 'Global debt-to-GDP at 350%. Every major economy is running fiscal deficits. The historical playbook suggests financial repression: holding rates below inflation to erode debt in real terms. This has massive implications for asset allocation. Hard assets, equities with pricing power, and short-duration bonds seem to be the playbook.',
        upvoteCount: 60,
        downvoteCount: 7,
      },
    ],
  },
];

const POSTREDDIT_COMMENTS = [
  { author: 'alice_trader', text: 'Great analysis. The correlation with tech has definitely increased since ETF approval. I think BTC is evolving into a risk-on asset.' },
  { author: 'frank_macro', text: 'The inflation hedge narrative was always questionable for a volatile asset. Gold has thousands of years of track record. BTC has 15.' },
  { author: 'eve_scalper', text: 'Disagree with both takes. BTC is its own asset class now. Trying to fit it into existing categories misses the point.' },
];

function daysAgo(days) {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function getLikeUsers(users, postIndex, maxLikes) {
  const count = ((postIndex * 7 + 3) % (maxLikes + 1));
  const ids = [];
  for (let i = 0; i < count && i < users.length; i++) {
    ids.push(users[(postIndex + i * 3) % users.length]._id);
  }
  return [...new Set(ids.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
}

function getVoteUsers(users, count, offset) {
  const ids = [];
  for (let i = 0; i < count && i < users.length; i++) {
    ids.push(users[(offset + i * 2) % users.length]._id);
  }
  return [...new Set(ids.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const users = {};

  for (const data of USER_DATA) {
    let user = await User.findOne({ username: data.username });
    if (!user) {
      user = await User.create({
        username: data.username,
        email: data.email,
        passwordHash,
        role: 'user',
        bio: data.bio,
      });
      stats.usersCreated++;
    }
    users[data.username] = user;
  }

  return users;
}

async function seedFollowers(users) {
  for (const [followerName, followeeName] of FOLLOWER_PAIRS) {
    const follower = users[followerName];
    const followee = users[followeeName];
    if (!follower || !followee) continue;

    const alreadyFollowing = follower.following.some(id => id.toString() === followee._id.toString());
    if (!alreadyFollowing) {
      follower.following.push(followee._id);
      followee.followers.push(follower._id);
      stats.followersCreated++;
    }
  }

  for (const user of Object.values(users)) {
    await user.save();
  }
}

async function seedPublicCommunities(users) {
  const communities = [];
  const allUsers = Object.values(users);

  for (const data of PUBLIC_COMMUNITY_DATA) {
    let comm = await CommunityPublic.findOne({ name: data.name });
    if (!comm) {
      const memberIds = data.members.map(name => users[name]._id);
      comm = await CommunityPublic.create({
        name: data.name,
        description: data.description,
        members: memberIds,
      });
      stats.publicComms++;
    }

    for (let i = 0; i < data.posts.length; i++) {
      const postData = data.posts[i];
      const existingPost = await PostX.findOne({
        text: postData.text,
        author: users[postData.author]._id,
        origin: 'public_community',
      });
      if (!existingPost) {
        const likes = getLikeUsers(allUsers, communities.length * 5 + i, 15);
        const post = await PostX.create({
          author: users[postData.author]._id,
          text: postData.text,
          origin: 'public_community',
          community: comm._id,
          communityType: 'CommunityPublic',
          isPinned: !!postData.pinned,
          likes,
          createdAt: daysAgo(6 - i),
        });
        stats.postsPublicComm++;

        comm.postCount = (comm.postCount || 0) + 1;
      }
    }
    await comm.save();
    communities.push(comm);
  }

  return communities;
}

async function seedPrivateCommunities(users) {
  const communities = [];
  const allUsers = Object.values(users);

  for (const data of PRIVATE_COMMUNITY_DATA) {
    let comm = await CommunityPrivate.findOne({ name: data.name });
    if (!comm) {
      const members = data.members.map(m => ({
        user: users[m.username]._id,
        role: m.role,
      }));
      comm = await CommunityPrivate.create({
        name: data.name,
        description: data.description,
        members,
      });
      stats.privateComms++;

      for (const req of data.pendingRequests) {
        comm.joinRequests.push({
          user: users[req.username]._id,
          message: req.message,
          status: 'pending',
        });
        stats.pendingRequests++;
      }
      await comm.save();
    }

    for (let i = 0; i < data.posts.length; i++) {
      const postData = data.posts[i];
      const existingPost = await PostX.findOne({
        text: postData.text,
        author: users[postData.author]._id,
        origin: 'private_community',
      });
      if (!existingPost) {
        const likes = getLikeUsers(allUsers, communities.length * 8 + i + 50, 20);
        const post = await PostX.create({
          author: users[postData.author]._id,
          text: postData.text,
          origin: 'private_community',
          community: comm._id,
          communityType: 'CommunityPrivate',
          isPinned: !!postData.pinned,
          likes,
          createdAt: daysAgo(5 - (i * 0.5)),
        });
        stats.postsPrivateComm++;

        if (postData.pinned) {
          comm.pinnedPosts.push(post._id);
        }
        comm.postCount = (comm.postCount || 0) + 1;
      }
    }
    await comm.save();
    communities.push(comm);
  }

  return communities;
}

async function seedGeneralPosts(users) {
  const allUsers = Object.values(users);
  const posts = [];

  for (let i = 0; i < GENERAL_POSTS.length; i++) {
    const data = GENERAL_POSTS[i];
    const author = users[data.author];
    const existingPost = await PostX.findOne({
      text: data.text,
      author: author._id,
      origin: 'general',
    });

    if (existingPost) {
      posts.push(existingPost);
      continue;
    }

    const dayOffset = (i / GENERAL_POSTS.length) * 7;
    const likes = getLikeUsers(allUsers, i, 25);
    const post = await PostX.create({
      author: author._id,
      text: data.text,
      origin: 'general',
      likes,
      createdAt: daysAgo(7 - dayOffset),
    });
    posts.push(post);
    stats.postsGeneral++;
  }

  const COMMENTS_DATA = [
    [
      { author: 'bob_crypto', text: 'Clean setup. I have a similar target on EUR/USD. Watching the DXY for confirmation.' },
      { author: 'eve_scalper', text: 'Be careful with NFP this Friday. Could invalidate the breakout.' },
    ],
    [
      { author: 'alice_trader', text: 'Which L2 tokens are you watching? I have been looking at ARB and OP.' },
      { author: 'carol_quant', text: 'Dominance dropping is necessary but not sufficient for altseason. Volume needs to follow.' },
      { author: 'eve_scalper', text: 'SOL ecosystem tokens have been the real winners this cycle.' },
    ],
    [
      { author: 'frank_macro', text: '1.8 Sharpe is excellent. What is the max drawdown?' },
      { author: 'henry_analyst', text: 'Transaction costs will eat into that significantly on daily rebalancing.' },
    ],
    [
      { author: 'grace_whale', text: 'Energy is one of the few sectors with real earnings growth and cheap valuations.' },
      { author: 'carol_quant', text: 'Agree. My factor model is overweight energy for the same reason.' },
      { author: 'alice_trader', text: 'Oil above $80 supports these valuations. Risk is a demand slowdown in China.' },
    ],
    [
      { author: 'frank_macro', text: 'Volume profile is underrated for finding support/resistance. Good call on the 5420 level.' },
      { author: 'bob_crypto', text: 'Do you use footprint charts for ES scalping? Curious about your order flow tools.' },
    ],
  ];

  for (let postIdx = 0; postIdx < COMMENTS_DATA.length; postIdx++) {
    const post = posts[postIdx];
    if (!post) continue;
    const comments = COMMENTS_DATA[postIdx];

    for (const commentData of comments) {
      const existingComment = await Comment.findOne({
        text: commentData.text,
        postId: post._id,
        postType: 'PostX',
      });
      if (!existingComment) {
        await Comment.create({
          author: users[commentData.author]._id,
          text: commentData.text,
          postId: post._id,
          postType: 'PostX',
        });
        post.commentCount = (post.commentCount || 0) + 1;
        stats.commentsPostX++;
      }
    }
    await post.save();
  }

  return posts;
}

async function seedPostReddit(users) {
  const allUsers = Object.values(users);
  const posts = [];

  for (const topicData of POSTREDDIT_DATA) {
    const topic = await DiscussionTopic.findOne({ slug: topicData.topicSlug });
    if (!topic) {
      console.log(`Topic ${topicData.topicSlug} not found, skipping`);
      continue;
    }

    for (let i = 0; i < topicData.posts.length; i++) {
      const data = topicData.posts[i];
      const author = users[data.author];
      const existingPost = await PostReddit.findOne({
        title: data.title,
        author: author._id,
        topic: topic._id,
      });

      if (existingPost) {
        posts.push(existingPost);
        continue;
      }

      const upvoteUsers = getVoteUsers(allUsers, data.upvoteCount, i * 3);
      const downvoteUsers = getVoteUsers(
        allUsers.filter(u => !upvoteUsers.some(up => up.toString() === u._id.toString())),
        data.downvoteCount,
        i * 5 + 1
      );

      const post = await PostReddit.create({
        author: author._id,
        title: data.title,
        text: data.text,
        topic: topic._id,
        upvotes: upvoteUsers,
        downvotes: downvoteUsers,
        createdAt: daysAgo(5 - i),
      });
      posts.push(post);
      stats.postReddit++;

      topic.postCount = (topic.postCount || 0) + 1;
    }
    await topic.save();
  }

  if (posts.length > 0) {
    const firstCryptoPost = posts[0];

    for (let i = 0; i < POSTREDDIT_COMMENTS.length; i++) {
      const cData = POSTREDDIT_COMMENTS[i];
      const existingComment = await Comment.findOne({
        text: cData.text,
        postId: firstCryptoPost._id,
        postType: 'PostReddit',
      });
      if (!existingComment) {
        await Comment.create({
          author: users[cData.author]._id,
          text: cData.text,
          postId: firstCryptoPost._id,
          postType: 'PostReddit',
        });
        firstCryptoPost.commentCount = (firstCryptoPost.commentCount || 0) + 1;
        stats.commentsPostReddit++;
      }
    }
    await firstCryptoPost.save();
  }

  return posts;
}

async function recalcTrendingScores() {
  const posts = await PostX.find({});
  for (const post of posts) {
    const newScore = PostX.calculateTrendingScore(post);
    if (post.trendingScore !== newScore) {
      post.trendingScore = newScore;
      await post.save();
      stats.trendingRecalc++;
    }
  }
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);

    console.log('Seeding users...');
    const users = await seedUsers();

    console.log('Seeding followers...');
    await seedFollowers(users);

    console.log('Seeding public communities...');
    await seedPublicCommunities(users);

    console.log('Seeding private communities...');
    await seedPrivateCommunities(users);

    console.log('Seeding general posts...');
    await seedGeneralPosts(users);

    console.log('Seeding PostReddit...');
    await seedPostReddit(users);

    console.log('Recalculating trending scores...');
    await recalcTrendingScores();

    console.log('');
    console.log('=== DEV SEED COMPLETE ===');
    console.log(`Users created: ${stats.usersCreated} / 8`);
    console.log(`Communities public: ${stats.publicComms} / 3`);
    console.log(`Communities private: ${stats.privateComms} / 2`);
    console.log(`Posts (general): ${stats.postsGeneral} / 15`);
    console.log(`Posts (public comm): ${stats.postsPublicComm} / 15`);
    console.log(`Posts (private comm): ${stats.postsPrivateComm} / 14`);
    console.log(`PostReddit: ${stats.postReddit} / 5`);
    console.log(`Comments (PostX): ${stats.commentsPostX}`);
    console.log(`Comments (PostReddit): ${stats.commentsPostReddit}`);
    console.log(`Pending requests: ${stats.pendingRequests} / 2`);
    console.log(`Followers created: ${stats.followersCreated}`);
    console.log(`trendingScore recalculated: ${stats.trendingRecalc}`);
    console.log('=========================');
  } catch (err) {
    console.error('Dev seed failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
