const PostX = require('../models/PostX');

async function updateTrendingScores() {
  try {
    const posts = await PostX.find({});
    if (!posts.length) return;

    const ops = posts.map(post => ({
      updateOne: {
        filter: { _id: post._id },
        update: { $set: { trendingScore: PostX.calculateTrendingScore(post) } },
      },
    }));

    const result = await PostX.bulkWrite(ops);
    console.log(`Trending scores updated: ${result.modifiedCount} posts`);
  } catch (err) {
    console.error('Trending score update failed:', err.message);
  }
}

module.exports = { updateTrendingScores };
