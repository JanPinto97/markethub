const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const DiscussionTopic = require('../models/DiscussionTopic');

const TOPICS = {
  CORE_MARKETS: [
    'Forex', 'Crypto', 'Stocks', 'Indices', 'ETFs', 'Bonds',
    'Commodities', 'Metals', 'Energy',
  ],
  ECONOMIA_I_MACRO: [
    'Macro Economics', 'Central Banks', 'Interest Rates', 'Inflation',
    'GDP & Economic Data', 'Monetary Policy', 'Fiscal Policy',
    'Geopolitics', 'Global Economy',
  ],
  ASSETS_ESPECIFICS: [
    'Large Cap Stocks', 'Small Cap & Penny Stocks', 'Growth Stocks',
    'Value Investing', 'Dividend Investing', 'IPOs', 'SPACs',
    'Startups & Venture Capital', 'Real Estate & REITs',
  ],
  TRADING_I_INVERSIO: [
    'Day Trading', 'Swing Trading', 'Position Trading', 'Long-term Investing',
    'Scalping', 'Algorithmic Trading', 'Quant Trading', 'High Frequency Trading',
  ],
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  let created = 0;
  let skipped = 0;

  for (const [category, names] of Object.entries(TOPICS)) {
    for (const name of names) {
      const slug = slugify(name);
      const existing = await DiscussionTopic.findOne({ $or: [{ name }, { slug }] });
      if (existing) {
        skipped++;
        continue;
      }
      await DiscussionTopic.create({ name, slug, category });
      created++;
    }
  }

  console.log(`Topics created: ${created}, skipped: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Seed topics failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
