const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const SALT_ROUNDS = 10;

async function upsertUser({ username, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Skipped ${role}: ${email} already exists`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await User.create({ username, email, passwordHash, role });
  console.log(`Created ${role}: ${email}`);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  const superadminUsername = process.env.SUPERADMIN_USERNAME || 'superadmin';
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@markethub.com';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';

  const moderatorUsername = process.env.MODERATOR_USERNAME || 'moderator';
  const moderatorEmail = process.env.MODERATOR_EMAIL || 'moderator@markethub.com';
  const moderatorPassword = process.env.MODERATOR_PASSWORD || 'Moderator123!';

  await upsertUser({
    username: superadminUsername,
    email: superadminEmail,
    password: superadminPassword,
    role: 'superadmin',
  });

  await upsertUser({
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    role: 'moderator',
  });

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
