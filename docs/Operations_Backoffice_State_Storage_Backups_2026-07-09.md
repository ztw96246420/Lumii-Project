# State Storage Backups

Date: 2026-07-09

## Purpose

The current MVP backend still stores business state in a JSON state file. This is not a replacement for a production database, but the file state now has a safer operating baseline for testing and early rollout:

- Atomic state writes through a temporary file and rename.
- Automatic gzip rolling backups after successful writes.
- Startup recovery from the latest valid backup if the main state JSON is corrupted.
- System Health visibility for backup count, latest backup, save errors, backup errors, and recovery source.
- Launch Readiness now distinguishes a bare JSON state blocker from a recoverable file-state baseline.

## Environment

- `STATE_BACKUP_ENABLED`: defaults to `true`; set `false` only for disposable local runs.
- `STATE_BACKUP_DIR`: defaults to `state-backups` beside `LUMII_BACKEND_STATE_PATH`.
- `STATE_BACKUP_RETAIN`: defaults to `48`, capped at `200`.
- `STATE_BACKUP_MIN_INTERVAL_MS`: defaults to `300000`.

Production or long-running test servers should place `STATE_BACKUP_DIR` on persistent disk and include it in server-level backups.

## Recovery Behavior

On startup, the backend first reads `LUMII_BACKEND_STATE_PATH`.

If the main state file cannot be parsed, the backend scans `STATE_BACKUP_DIR` from newest to oldest and loads the first valid `.json.gz` or `.json` backup. After a successful recovery, it rewrites the main state file through the normal atomic `saveState()` path.

System Health returns `stateBackups.loadedFromBackup=true` and `stateBackups.restoredBackupPath` for that process lifetime, so operators can see that recovery happened.

## Validation

`scripts/smoke-state-storage-compaction.cjs` now validates:

- Durable media data URLs are pruned from persisted state.
- State health exposes the `state_backups` check.
- A gzip backup file is generated.
- Corrupting the main state JSON and restarting recovers users and avatar jobs from the latest backup.

This reduces the immediate single-file failure mode, but final production hardening still requires a real database, database backups, migration tooling, and independent audit storage.
