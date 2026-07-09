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
  { key: 'admin-ai-avatar-job-apply', title: 'Admin AI avatar job apply', script: 'smoke-admin-ai-avatar-job-apply.cjs', timeoutMs: 180_000 },
  { key: 'ai-avatar-refund', title: 'AI avatar refund', script: 'smoke-ai-avatar-refund.cjs', timeoutMs: 180_000 },
  { key: 'ai-avatar-samples', title: 'AI avatar samples', script: 'smoke-ai-avatar-samples.cjs', timeoutMs: 180_000 },
  { key: 'ai-stuck-reaper', title: 'AI stuck-job recovery', script: 'smoke-ai-stuck-reaper.cjs', timeoutMs: 180_000 },
  { key: 'ai-prompt-versions', title: 'AI prompt versions', script: 'smoke-ai-prompt-versions.cjs', timeoutMs: 180_000 },
  { key: 'ai-provider-trace', title: 'AI provider trace', script: 'smoke-ai-provider-trace.cjs', timeoutMs: 180_000 },
  { key: 'pet-chat-quality-review', title: 'Pet chat quality review', script: 'smoke-pet-chat-quality-review.cjs', timeoutMs: 180_000 },

  { key: 'content-safety', title: 'Content safety E2E', script: 'smoke-content-safety-e2e.cjs', timeoutMs: 180_000 },
  { key: 'legal-documents', title: 'Legal document signoff', script: 'smoke-legal-documents.cjs', timeoutMs: 180_000 },
  { key: 'launch-readiness-safety', title: 'Launch readiness content safety', script: 'smoke-launch-readiness-content-safety.cjs', timeoutMs: 180_000 },
  { key: 'launch-readiness-decisions', title: 'Launch readiness decisions', script: 'smoke-launch-readiness-question-update.cjs', timeoutMs: 180_000 },
  { key: 'conversation-message-reports', title: 'Conversation message reports', script: 'smoke-conversation-message-reports.cjs', timeoutMs: 180_000 },
  { key: 'moderation-sanction', title: 'Report sanction linkage', script: 'smoke-report-sanction-linkage.cjs', timeoutMs: 180_000 },
  { key: 'report-appeals', title: 'Report appeals', script: 'smoke-report-appeals.cjs', timeoutMs: 180_000 },
  { key: 'sanction-approval', title: 'Sanction approval', script: 'smoke-sanction-approval.cjs', timeoutMs: 180_000 },
  { key: 'sanction-policy-review', title: 'Sanction policy review', script: 'smoke-sanction-policy-review.cjs', timeoutMs: 180_000 },
  { key: 'social-author-sanction', title: 'Social author sanction', script: 'smoke-social-author-sanction.cjs', timeoutMs: 180_000 },
  { key: 'social-block-risk', title: 'Social block risk', script: 'smoke-social-block-risk.cjs', timeoutMs: 180_000 },
  { key: 'social-evidence-detail', title: 'Social evidence detail', script: 'smoke-social-evidence-detail.cjs', timeoutMs: 180_000 },
  { key: 'social-relation-message-context', title: 'Social relation message context', script: 'smoke-social-relation-message-context.cjs', timeoutMs: 180_000 },
  { key: 'social-relation-repair', title: 'Social relation repair', script: 'smoke-social-relation-repair.cjs', timeoutMs: 180_000 },

  { key: 'pet-calendar-admin', title: 'Admin pet calendar edit', script: 'smoke-admin-pet-calendar-edit.cjs', timeoutMs: 180_000 },
  { key: 'pet-profile-admin', title: 'Admin pet profile edit', script: 'smoke-admin-pet-profile-edit.cjs', timeoutMs: 180_000 },
  { key: 'pet-profile-merge', title: 'Admin pet profile merge', script: 'smoke-admin-pet-profile-merge.cjs', timeoutMs: 180_000 },
  { key: 'pet-media-admin', title: 'Admin pet media replace', script: 'smoke-admin-pet-media-replace.cjs', timeoutMs: 180_000 },
  { key: 'place-reviews', title: 'Place public reviews', script: 'smoke-place-public-reviews.cjs', timeoutMs: 180_000 },
  { key: 'place-contributions', title: 'Place contributions', script: 'smoke-place-contributions.cjs', timeoutMs: 180_000 },

  { key: 'notifications', title: 'Notification deep links', script: 'smoke-notification-deep-links.cjs', timeoutMs: 180_000 },
  { key: 'notification-audience-packages', title: 'Notification audience packages', script: 'smoke-notification-audience-packages.cjs', timeoutMs: 180_000 },
  { key: 'notification-approval', title: 'Notification approval', script: 'smoke-notification-approval.cjs', timeoutMs: 180_000 },
  { key: 'notification-campaign-stats', title: 'Notification campaign stats', script: 'smoke-notification-campaign-stats.cjs', timeoutMs: 180_000 },
  { key: 'notification-expo-push', title: 'Notification Expo push', script: 'smoke-notification-expo-push.cjs', timeoutMs: 180_000 },
  { key: 'analytics', title: 'Analytics events', script: 'smoke-analytics-events.cjs', timeoutMs: 180_000 },
  { key: 'observability', title: 'Observability alerts', script: 'smoke-observability-alerts.cjs', timeoutMs: 180_000 },
  { key: 'ticket-sla-roster', title: 'Ticket SLA roster', script: 'smoke-ticket-sla-roster.cjs', timeoutMs: 180_000 },

  { key: 'admin-accounts', title: 'Admin accounts', script: 'smoke-admin-accounts.cjs', timeoutMs: 180_000 },
  { key: 'admin-ip-allowlist', title: 'Admin IP allowlist', script: 'smoke-admin-ip-allowlist.cjs', timeoutMs: 180_000 },
  { key: 'account-deletion', title: 'Account deletion', script: 'smoke-account-deletion.cjs', timeoutMs: 180_000 },
  { key: 'user-timeline', title: 'User timeline', script: 'smoke-user-timeline.cjs', timeoutMs: 180_000 },
  { key: 'user-auth-sessions', title: 'User auth sessions', script: 'smoke-user-auth-sessions.cjs', timeoutMs: 180_000 },
  { key: 'high-risk-countersign', title: 'High-risk countersign', script: 'smoke-high-risk-approval-countersign.cjs', timeoutMs: 180_000 },
  { key: 'high-risk-expiry', title: 'High-risk approval expiry', script: 'smoke-high-risk-approval-expiry.cjs', timeoutMs: 180_000 },
  { key: 'high-risk-reject', title: 'High-risk approval reject', script: 'smoke-high-risk-approval-reject.cjs', timeoutMs: 180_000 },
  { key: 'high-risk-separation', title: 'High-risk approval separation', script: 'smoke-high-risk-approval-separation.cjs', timeoutMs: 180_000 },
  { key: 'data-clear', title: 'Data clear approval', script: 'smoke-data-clear-approval.cjs', timeoutMs: 180_000 },
  { key: 'export-approval', title: 'Export approval and signed links', script: 'smoke-export-approval.cjs', timeoutMs: 180_000 },
  { key: 'config-ai-ops', title: 'Config AI ops', script: 'smoke-config-ai-ops.cjs', timeoutMs: 180_000 },
  { key: 'config-approval', title: 'Config approval', script: 'smoke-config-approval.cjs', timeoutMs: 180_000 },
  { key: 'config-content-safety-hints', title: 'Config content safety hints', script: 'smoke-config-content-safety-hints.cjs', timeoutMs: 180_000 },
  { key: 'config-experiments', title: 'Config experiments', script: 'smoke-config-experiments.cjs', timeoutMs: 180_000 },
  { key: 'config-risk-confirmation', title: 'Config risk confirmation', script: 'smoke-config-risk-confirmation.cjs', timeoutMs: 180_000 },
  { key: 'config-scheduled-publish', title: 'Config scheduled publish', script: 'smoke-config-scheduled-publish.cjs', timeoutMs: 180_000 },
  { key: 'media-cdn-probe', title: 'Media CDN probe', script: 'smoke-media-cdn-probe.cjs', timeoutMs: 180_000 },
  { key: 'audit-integrity', title: 'Audit integrity journal', script: 'smoke-admin-audit-integrity.cjs', timeoutMs: 180_000 },
  { key: 'state-compaction', title: 'State storage compaction', script: 'smoke-state-storage-compaction.cjs', timeoutMs: 180_000 },

  { key: 'admin-accounts-page', title: 'Admin accounts page', script: 'smoke-admin-accounts-page.cjs', timeoutMs: 180_000, visual: true },
  { key: 'admin-config-page', title: 'Admin high-risk config page', script: 'smoke-admin-config-high-risk-page.cjs', timeoutMs: 180_000, visual: true },
  { key: 'admin-legal-documents-page', title: 'Admin legal documents page', script: 'smoke-admin-legal-documents-page.cjs', timeoutMs: 180_000, visual: true },
  { key: 'admin-system-health-page', title: 'Admin system health page', script: 'smoke-admin-system-health-page.cjs', timeoutMs: 180_000, visual: true },
  { key: 'admin-media-page', title: 'Admin media replace page', script: 'smoke-admin-pet-media-replace-page.cjs', timeoutMs: 180_000, visual: true },
  { key: 'admin-pet-chat-page', title: 'Admin pet chat page', script: 'smoke-admin-pet-chat-page.cjs', timeoutMs: 180_000, visual: true },
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
