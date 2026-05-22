'use strict';

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const ROOT = path.resolve(__dirname, '..');
const SEED_DIR = path.join(ROOT, 'seed');
const ARCHIVE = path.join(SEED_DIR, 'demo-data.archive.gz');
const UPLOADS_TAR = path.join(SEED_DIR, 'uploads.tar.gz');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/markethub';

function log(msg) { console.log(`[seed:demo] ${msg}`); }
function fail(msg) { console.error(`[seed:demo] ERROR: ${msg}`); process.exit(1); }

if (!fs.existsSync(ARCHIVE)) {
  fail(`Missing dump file: ${ARCHIVE}\nRun "npm run seed:generate-dump" from a populated dev environment first.`);
}

log(`Restoring MongoDB archive from ${ARCHIVE}`);
try {
  execFileSync('mongorestore', [
    `--uri=${MONGO_URI}`,
    `--archive=${ARCHIVE}`,
    '--gzip',
    '--drop',
    '--nsExclude=markethub.users',
    '--nsExclude=markethub.discussiontopics',
  ], { stdio: 'inherit' });
} catch (err) {
  fail(`mongorestore failed: ${err.message}`);
}

if (fs.existsSync(UPLOADS_TAR)) {
  log(`Extracting uploads from ${UPLOADS_TAR}`);
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  try {
    execFileSync('tar', ['-xzf', UPLOADS_TAR, '-C', ROOT], { stdio: 'inherit' });
  } catch (err) {
    fail(`tar extract failed: ${err.message}`);
  }
} else {
  log(`No uploads archive found at ${UPLOADS_TAR} — skipping image restore.`);
}

log('Demo data restored. Visit http://localhost:4200');
