#!/usr/bin/env node

const { execFile, spawn } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const includeVisual = process.argv.includes('--include-visual');
const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);

const suites = [
  { key: 'mobile-typecheck', title: 'Mobile TypeScript', command: 'npm', args: ['run', 'typecheck'], cwd: path.join(rootDir, 'mobile'), timeoutMs: 90_000 },
  { key: 'backend-syntax', title: 'Backend syntax', command: process.execPath, args: ['--check', path.join(rootDir, 'scripts', 'lumii-backend.cjs')], timeoutMs: 30_000 },
  { key: 'admin-syntax', title: 'Admin syntax', command: process.execPath, args: ['--check', path.join(rootDir, 'admin', 'admin.js')], timeoutMs: 30_000 },

  { key: 'mobile-core', title: 'Mobile core flows', script: 'smoke-mobile-core-flows.cjs', timeoutMs: 180_000 },
  { key: 'pet-circle', title: 'Pet friend circle', script: 'smoke-pet-circle.cjs', timeoutMs: 180_000 },
  { key: 'avatar-animation', title: 'Avatar animation lifecycle', script: 'smoke-avatar-animation.cjs', timeoutMs: 180_000 },
  { key: 'avatar-mirror-failure', title: 'Avatar animation mirror failure', script: 'smoke-avatar-animation-mirror-failure.cjs', timeoutMs: 180_000 },
  { key: 'ai-stuck-reaper', title: 'AI stuck-job recovery', script: 'smoke-ai-stuck-reaper.cjs', timeoutMs: 180_000 },
  { key: 'ai-prompt-versions', title: 'AI prompt versions', script: 'smoke-ai-prompt-versions.cjs', timeoutMs: 180_000 },
  { key: 'ai-provider-trace', title: 'AI provider trace', script: 'smoke-ai-provider-trace.cjs', timeoutMs: 180_000 },

  { key: 'content-safety', title: 'Content safety E2E', script: 'smoke-content-safety-e2e.cjs', timeoutMs: 180_000 },
  { key: 'launch-readiness-safety', title: 'Launch readiness content safety', script: 'smoke-launch-readiness-content-safety.cjs', timeoutMs: 180_000 },
  { key: 'launch-readiness-decisions', title: 'Launch readiness decisions', script: 'smoke-launch-readiness-question-update.cjs', timeoutMs: 180_000 },
  { key: 'moderation-sanction', title: 'Report sanction linkage', script: 'smoke-report-sanction-linkage.cjs', timeoutMs: 180_000 },
  { key: 'report-appeals', title: 'Report appeals', script: 'smoke-report-appeals.cjs', timeoutMs: 180_000 },
  { key: 'social-block-risk', title: 'Social block risk', script: 'smoke-social-block-risk.cjs', timeoutMs: 180_000 },
  { key: 'social-relation-repair', title: 'Social relation repair', script: 'smoke-social-relation-repair.cjs', timeoutMs: 180_000 },

  { key: 'pet-calendar-admin', title: 'Admin pet calendar edit', script: 'smoke-admin-pet-calendar-edit.cjs', timeoutMs: 180_000 },
  { key: 'pet-profile-admin', title: 'Admin pet profile edit', script: 'smoke-admin-pet-profile-edit.cjs', timeoutMs: 180_000 },
  { key: 'pet-media-admin', title: 'Admin pet media replace', script: 'smoke-admin-pet-media-replace.cjs', timeoutMs: 180_000 },
  { key: 'place-reviews', title: 'Place public reviews', script: 'smoke-place-public-reviews.cjs', timeoutMs: 180_000 },
  { key: 'place-contributions', title: 'Place contributions', script: 'smoke-place-contributions.cjs', timeoutMs: 180_000 },

  { key: 'notifications', title: 'Notification deep links', script: 'smoke-notification-deep-links.cjs', timeoutMs: 180_000 },
  { key: 'notification-approval', title: 'Notification approval', script: 'smoke-notification-approval.cjs', timeoutMs: 180_000 },
  { key: 'analytics', title: 'Analytics events', script: 'smoke-analytics-events.cjs', timeoutMs: 180_000 },
  { key: 'observability', title: 'Observability alerts', script: 'smoke-observability-alerts.cjs', timeoutMs: 180_000 },

  { key: 'admin-accounts', title: 'Admin accounts', script: 'smoke-admin-accounts.cjs', timeoutMs: 180_000 },
  { key: 'user-auth-sessions', title: 'User auth sessions', script: 'smoke-user-auth-sessions.cjs', timeoutMs: 180_000 },
  { key: 'high-risk-countersign', title: 'High-risk countersign', script: 'smoke-high-risk-approval-countersign.cjs', timeoutMs: 180_000 },
  { key: 'data-clear', title: 'Data clear approval', script: 'smoke-data-clear-approval.cjs', timeoutMs: 180_000 },
  { key: 'export-approval', title: 'Export approval and signed links', script: 'smoke-export-approval.cjs', timeoutMs: 180_000 },
  { key: 'audit-integrity', title: 'Audit integrity journal', script: 'smoke-admin-audit-integrity.cjs', timeoutMs: 180_000 },
  { key: 'state-compaction', title: 'State storage compaction', script: 'smoke-state-storage-compaction.cjs', timeoutMs: 180_000 },

  { key: 'admin-config-page', title: 'Admin high-risk config page', script: 'smoke-admin-config-high-risk-page.cjs', timeoutMs: 180_000, visual: true },
  { key: 'admin-system-health-page', title: 'Admin system health page', script: 'smoke-admin-system-health-page.cjs', timeoutMs: 180_000, visual: true },
  { key: 'admin-media-page', title: 'Admin media replace page', script: 'smoke-admin-pet-media-replace-page.cjs', timeoutMs: 180_000, visual: true },
  { key: 'frontend-playwright', title: 'Frontend Playwright smoke', script: 'smoke-frontend-playwright.cjs', timeoutMs: 420_000, visual: true },
];

function toCommand(suite) {
  if (suite.script) {
    return {
      command: process.execPath,
      args: [path.join(rootDir, 'scripts', suite.script)],
      cwd: rootDir,
    };
  }
  return {
    command: suite.command,
    args: suite.args || [],
    cwd: suite.cwd || rootDir,
  };
}

function runSuite(suite) {
  const { command, args, cwd } = toCommand(suite);
  const startedAt = Date.now();
  return new Promise((resolve) => {
    let output = '';
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: process.platform === 'win32' && command === 'npm',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    function killProcessTree() {
      if (child.exitCode !== null) return;
      if (process.platform === 'win32') {
        execFile('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], () => {});
        return;
      }
      child.kill('SIGKILL');
    }
    const timer = setTimeout(() => {
      output += `\n[timeout] ${suite.title} exceeded ${suite.timeoutMs}ms\n`;
      killProcessTree();
    }, suite.timeoutMs);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({
        code,
        durationMs: Date.now() - startedAt,
        output: output.trim(),
        signal,
        suite,
      });
    });
  });
}

async function main() {
  const selected = suites.filter((suite) => {
    if (only) return only.split(',').map((item) => item.trim()).includes(suite.key);
    return includeVisual || !suite.visual;
  });
  if (!selected.length) {
    console.error('No launch regression suites selected.');
    process.exit(1);
  }

  console.log(`Lumii launch regression: ${selected.length} suites${includeVisual ? ' including visual checks' : ''}`);
  const failures = [];
  for (const suite of selected) {
    process.stdout.write(`\n[run] ${suite.title} (${suite.key}) ... `);
    const result = await runSuite(suite);
    const seconds = (result.durationMs / 1000).toFixed(1);
    if (result.code === 0) {
      console.log(`ok ${seconds}s`);
      if (result.output && process.env.SMOKE_VERBOSE) console.log(result.output);
    } else {
      console.log(`failed ${seconds}s`);
      console.log(result.output || '(no output)');
      failures.push(result);
    }
  }

  if (failures.length) {
    console.error(`\nLaunch regression failed: ${failures.length}/${selected.length} suites failed.`);
    failures.forEach((failure) => {
      console.error(`- ${failure.suite.key}: exit=${failure.code} signal=${failure.signal || '-'}`);
    });
    process.exit(1);
  }
  console.log(`\nLaunch regression passed: ${selected.length}/${selected.length} suites.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
