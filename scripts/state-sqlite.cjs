const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SQLITE_STATE_SCHEMA_VERSION = 1;

function checksumJson(jsonText) {
  return crypto.createHash('sha256').update(jsonText, 'utf8').digest('hex');
}

function normalizedSource(value, fallback = 'save') {
  return String(value || fallback).trim().slice(0, 80) || fallback;
}

function fileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function secureDatabaseFiles(databasePath) {
  if (process.platform === 'win32') return;
  [databasePath, `${databasePath}-wal`, `${databasePath}-shm`].forEach((filePath) => {
    if (fs.existsSync(filePath)) fs.chmodSync(filePath, 0o600);
  });
}

function createSqliteStateStore(options = {}) {
  const databasePathInput = String(options.databasePath || '').trim();
  if (!databasePathInput) throw new Error('SQLite state database path is required');
  const databasePath = path.resolve(databasePathInput);
  const timeoutMs = Math.max(1000, Math.min(60_000, Number(options.timeoutMs || 5000) || 5000));
  const commitRetain = Math.max(100, Math.min(100_000, Number(options.commitRetain || 5000) || 5000));
  let DatabaseSync;
  try {
    ({ DatabaseSync } = require('node:sqlite'));
  } catch (error) {
    const wrapped = new Error(`SQLite state storage requires Node.js 22.5 or newer: ${error?.message || error}`);
    wrapped.code = 'STATE_SQLITE_UNAVAILABLE';
    throw wrapped;
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath, { timeout: timeoutMs });
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = ${timeoutMs};
    PRAGMA wal_autocheckpoint = 1000;
    CREATE TABLE IF NOT EXISTS lumii_state_snapshot (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      schema_version INTEGER NOT NULL,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      state_json TEXT NOT NULL CHECK (json_valid(state_json)),
      checksum_sha256 TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS lumii_state_commits (
      revision INTEGER PRIMARY KEY,
      checksum_sha256 TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source TEXT NOT NULL
    ) STRICT;
  `);
  secureDatabaseFiles(databasePath);

  const selectSnapshot = database.prepare(`
    SELECT schema_version, revision, state_json, checksum_sha256, updated_at, source
    FROM lumii_state_snapshot
    WHERE singleton_id = 1
  `);
  const insertSnapshot = database.prepare(`
    INSERT INTO lumii_state_snapshot (
      singleton_id, schema_version, revision, state_json, checksum_sha256, updated_at, source
    ) VALUES (1, ?, ?, ?, ?, ?, ?)
  `);
  const updateSnapshot = database.prepare(`
    UPDATE lumii_state_snapshot
    SET schema_version = ?, revision = ?, state_json = ?, checksum_sha256 = ?, updated_at = ?, source = ?
    WHERE singleton_id = 1 AND revision = ?
  `);
  const replaceSnapshot = database.prepare(`
    INSERT INTO lumii_state_snapshot (
      singleton_id, schema_version, revision, state_json, checksum_sha256, updated_at, source
    ) VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(singleton_id) DO UPDATE SET
      schema_version = excluded.schema_version,
      revision = excluded.revision,
      state_json = excluded.state_json,
      checksum_sha256 = excluded.checksum_sha256,
      updated_at = excluded.updated_at,
      source = excluded.source
  `);
  const insertCommit = database.prepare(`
    INSERT INTO lumii_state_commits (revision, checksum_sha256, updated_at, source)
    VALUES (?, ?, ?, ?)
  `);
  const pruneCommits = database.prepare('DELETE FROM lumii_state_commits WHERE revision <= ?');
  const countCommits = database.prepare('SELECT COUNT(*) AS count FROM lumii_state_commits');

  function transaction(action) {
    database.exec('BEGIN IMMEDIATE');
    try {
      const result = action();
      database.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        database.exec('ROLLBACK');
      } catch {}
      throw error;
    }
  }

  function validatedSnapshot(row) {
    if (!row) return null;
    const jsonText = String(row.state_json || '');
    JSON.parse(jsonText);
    const checksum = checksumJson(jsonText);
    if (checksum !== row.checksum_sha256) {
      const error = new Error(`SQLite state checksum mismatch at revision ${row.revision}`);
      error.code = 'STATE_SQLITE_CHECKSUM_MISMATCH';
      throw error;
    }
    return {
      checksum,
      jsonText,
      revision: Number(row.revision || 0),
      schemaVersion: Number(row.schema_version || 0),
      source: String(row.source || ''),
      updatedAt: String(row.updated_at || ''),
    };
  }

  function recordCommit(revision, checksum, updatedAt, source) {
    insertCommit.run(revision, checksum, updatedAt, source);
    const pruneBeforeOrAt = revision - commitRetain;
    if (pruneBeforeOrAt > 0) pruneCommits.run(pruneBeforeOrAt);
  }

  function initialize(jsonTextInput, sourceInput = 'json_migration') {
    const jsonText = String(jsonTextInput || '');
    JSON.parse(jsonText);
    const checksum = checksumJson(jsonText);
    const updatedAt = new Date().toISOString();
    const source = normalizedSource(sourceInput, 'json_migration');
    return transaction(() => {
      const existing = validatedSnapshot(selectSnapshot.get());
      if (existing) return existing;
      const revision = 1;
      insertSnapshot.run(SQLITE_STATE_SCHEMA_VERSION, revision, jsonText, checksum, updatedAt, source);
      recordCommit(revision, checksum, updatedAt, source);
      return { checksum, jsonText, revision, schemaVersion: SQLITE_STATE_SCHEMA_VERSION, source, updatedAt };
    });
  }

  function load() {
    return validatedSnapshot(selectSnapshot.get());
  }

  function save(jsonTextInput, expectedRevisionInput, sourceInput = 'save') {
    const jsonText = String(jsonTextInput || '');
    JSON.parse(jsonText);
    const expectedRevision = Number(expectedRevisionInput || 0);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
      throw new Error(`Invalid SQLite state revision: ${expectedRevisionInput}`);
    }
    const revision = expectedRevision + 1;
    const checksum = checksumJson(jsonText);
    const updatedAt = new Date().toISOString();
    const source = normalizedSource(sourceInput);
    return transaction(() => {
      const result = updateSnapshot.run(
        SQLITE_STATE_SCHEMA_VERSION,
        revision,
        jsonText,
        checksum,
        updatedAt,
        source,
        expectedRevision,
      );
      if (Number(result.changes || 0) !== 1) {
        const current = selectSnapshot.get();
        const error = new Error(`SQLite state revision conflict: expected ${expectedRevision}, current ${current?.revision || 0}`);
        error.code = 'STATE_SQLITE_REVISION_CONFLICT';
        throw error;
      }
      recordCommit(revision, checksum, updatedAt, source);
      return { checksum, jsonText, revision, schemaVersion: SQLITE_STATE_SCHEMA_VERSION, source, updatedAt };
    });
  }

  function restore(jsonTextInput, sourceInput = 'backup_recovery') {
    const jsonText = String(jsonTextInput || '');
    JSON.parse(jsonText);
    const checksum = checksumJson(jsonText);
    const updatedAt = new Date().toISOString();
    const source = normalizedSource(sourceInput, 'backup_recovery');
    return transaction(() => {
      const current = selectSnapshot.get();
      const revision = Math.max(0, Number(current?.revision || 0)) + 1;
      replaceSnapshot.run(SQLITE_STATE_SCHEMA_VERSION, revision, jsonText, checksum, updatedAt, source);
      recordCommit(revision, checksum, updatedAt, source);
      return { checksum, jsonText, revision, schemaVersion: SQLITE_STATE_SCHEMA_VERSION, source, updatedAt };
    });
  }

  function checkpoint(mode = 'PASSIVE') {
    const normalizedMode = ['PASSIVE', 'FULL', 'RESTART', 'TRUNCATE'].includes(String(mode).toUpperCase())
      ? String(mode).toUpperCase()
      : 'PASSIVE';
    return database.prepare(`PRAGMA wal_checkpoint(${normalizedMode})`).get();
  }

  function info() {
    const snapshot = selectSnapshot.get();
    const quickCheckRow = database.prepare('PRAGMA quick_check').get();
    const quickCheck = String(Object.values(quickCheckRow || {})[0] || 'unknown');
    const journalModeRow = database.prepare('PRAGMA journal_mode').get();
    const journalMode = String(Object.values(journalModeRow || {})[0] || 'unknown');
    return {
      checksum: String(snapshot?.checksum_sha256 || ''),
      commitCount: Number(countCommits.get()?.count || 0),
      databaseBytes: fileSize(databasePath),
      databasePath,
      healthy: quickCheck.toLowerCase() === 'ok',
      journalMode,
      quickCheck,
      revision: Number(snapshot?.revision || 0),
      schemaVersion: Number(snapshot?.schema_version || SQLITE_STATE_SCHEMA_VERSION),
      shmBytes: fileSize(`${databasePath}-shm`),
      source: String(snapshot?.source || ''),
      updatedAt: String(snapshot?.updated_at || ''),
      walBytes: fileSize(`${databasePath}-wal`),
    };
  }

  function close() {
    try {
      checkpoint('TRUNCATE');
    } catch {}
    database.close();
  }

  return {
    checkpoint,
    close,
    info,
    initialize,
    load,
    restore,
    save,
  };
}

module.exports = {
  SQLITE_STATE_SCHEMA_VERSION,
  checksumJson,
  createSqliteStateStore,
};
