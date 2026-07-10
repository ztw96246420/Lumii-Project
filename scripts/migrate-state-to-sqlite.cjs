#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { checksumJson, createSqliteStateStore } = require('./state-sqlite.cjs');

const rootDir = path.resolve(__dirname, '..');

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function collectionCount(state) {
  return Object.entries(state || {}).reduce((summary, [key, value]) => {
    if (Array.isArray(value)) summary[key] = value.length;
    else if (value && typeof value === 'object') summary[key] = Object.keys(value).length;
    return summary;
  }, {});
}

function main() {
  const sourcePath = path.resolve(argValue('--source', path.join(rootDir, 'dist', 'lumii-backend-state.json')));
  const databasePath = path.resolve(argValue('--database', path.join(rootDir, 'dist', 'lumii-state.sqlite')));
  const verifyOnly = process.argv.includes('--verify-only');
  const jsonText = fs.readFileSync(sourcePath, 'utf8');
  const state = JSON.parse(jsonText);
  const sourceChecksum = checksumJson(jsonText);
  const store = createSqliteStateStore({ databasePath });
  try {
    let snapshot = store.load();
    if (!snapshot) {
      if (verifyOnly) throw new Error('SQLite state database is empty');
      snapshot = store.initialize(jsonText, 'migration_cli');
    }
    if (snapshot.checksum !== sourceChecksum) {
      throw new Error(`SQLite state differs from source JSON: sqlite=${snapshot.checksum} json=${sourceChecksum}`);
    }
    const info = store.info();
    if (!info.healthy || info.journalMode !== 'wal') {
      throw new Error(`SQLite verification failed: quick_check=${info.quickCheck} journal=${info.journalMode}`);
    }
    process.stdout.write(`${JSON.stringify({
      collections: collectionCount(state),
      databaseBytes: info.databaseBytes,
      databasePath,
      journalMode: info.journalMode,
      quickCheck: info.quickCheck,
      revision: snapshot.revision,
      sourceBytes: Buffer.byteLength(jsonText, 'utf8'),
      sourcePath,
      stateChecksum: sourceChecksum,
      status: 'ok',
    }, null, 2)}\n`);
  } finally {
    store.close();
  }
}

try {
  main();
} catch (error) {
  console.error(error?.stack || error);
  process.exit(1);
}
