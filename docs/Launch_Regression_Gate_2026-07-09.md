# Lumii Launch Regression Gate

Date: 2026-07-09

This is the local pre-release gate for the current mobile + backoffice MVP.
Run it before APK packaging and before server deployment when the change touches
mobile business flows, admin operations, AI jobs, content safety, social flows,
or data governance.

## Default Gate

```powershell
node scripts/smoke-launch-regression.cjs
```

The default gate runs:

- Mobile TypeScript compile check.
- Mobile preview/production Release HTTPS configuration validation, including API host allowlisting and Android cleartext-traffic protection.
- Backend and admin JavaScript syntax checks.
- Mobile core flows.
- Production SMS fail-closed behavior, Tencent SendSms payload/signing, random OTP verification, one-time use, plaintext exclusion, and account-deletion OTP.
- Pet friend circle posting, comments, visibility, location, and calendar sync.
- AI avatar generation/animation lifecycle, retry, failure recovery, quota refund, sample review, prompt/provider traces, admin job result apply, and pet chat quality review.
- Content safety, moderation, reports, appeals, sanctions, social evidence, private-message report context, and social blocking.
- Legal document update/signoff, public legal text endpoints, launch-readiness compliance linkage, and audit records.
- Pet calendar, pet profile edit/merge, pet media, places, notifications, notification display/click stats, Expo Push simulation, audience packages, campaign stats, analytics, support SLA, and observability.
- Admin accounts, IP allowlist, account deletion, user timeline, high-risk approval countersign/expiry/reject/separation, data clear approval, export approval, signed export links, audit integrity journal, state compaction, and state backup recovery.
- Admin production security package generation, MFA/IP/password-rotation readiness, and non-leaking security audit records.
- SQLite/WAL state migration, optimistic revision conflict protection, JSON mirror rebuild, checksum recovery, and backup restoration.
- Config center AI ops, approval, content-safety hints, experiments, risk confirmation, scheduled publish, and media CDN probe.
- Public API HTTPS launch-readiness probing, including TLS/DNS/health failures and the corresponding P0 readiness blocker.
- All standalone non-visual smoke scripts under `scripts/smoke-*.cjs` are included in the default gate; visual/browser checks remain opt-in through `--include-visual`.

Last verified on 2026-07-10: 70/70 default non-visual suites passed.

## Visual Gate

```powershell
node scripts/smoke-launch-regression.cjs --include-visual
```

This also runs Playwright-backed admin/frontend page checks, including admin
accounts, legal documents, system health, media replacement, AI pet chat review,
and the mobile frontend smoke. Use it when page layout, admin UI, or
browser-visible interaction changed.

## Focused Gate

```powershell
node scripts/smoke-launch-regression.cjs --only=mobile-core,pet-circle,avatar-animation
```

Use focused mode while iterating. A release candidate should pass the default
gate, and should pass the visual gate when UI changed.

## Notes

- Each suite has an explicit timeout so a stuck backend process fails loudly.
- Default mode avoids browser-dependent visual checks to keep server-side
  deployment verification reliable.
- The gate is additive: individual smoke scripts remain useful for debugging a
  failed module.
