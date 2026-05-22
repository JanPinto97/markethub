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

function log(msg) { console.log(`[generate-dump] ${msg}`); }
function fail(msg) { console.error(`[generate-dump] ERROR: ${msg}`); process.exit(1); }

if (!fs.existsSync(SEED_DIR)) fs.mkdirSync(SEED_DIR, { recursive: true });

log(`Dumping MongoDB to ${ARCHIVE}`);
try {
  execFileSync('mongodump', [
    `--uri=${MONGO_URI}`,
    `--archive=${ARCHIVE}`,
    '--gzip',
    '--excludeCollection=users',
    '--excludeCollection=discussiontopics',
  ], { stdio: 'inherit' });
} catch (err) {
  fail(`mongodump failed: ${err.message}`);
}

if (fs.existsSync(UPLOADS_DIR) && fs.readdirSync(UPLOADS_DIR).length > 0) {
  log(`Archiving uploads/ to ${UPLOADS_TAR}`);
  try {
    execFileSync('tar', ['-czf', UPLOADS_TAR, '-C', ROOT, 'uploads'], { stdio: 'inherit' });
  } catch (err) {
    fail(`tar create failed: ${err.message}`);
  }
} else {
  log('uploads/ is empty or missing — skipping uploads archive.');
}

log('Dump generated. Commit backend/seed/*.gz to share with reviewers.');
