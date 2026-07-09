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
- Backend and admin JavaScript syntax checks.
- Mobile core flows.
- Pet friend circle posting, comments, visibility, location, and calendar sync.
- AI avatar animation lifecycle, retry, failure recovery, prompt/provider traces.
- Content safety, moderation, reports, appeals, sanctions, and social blocking.
- Legal document update/signoff, public legal text endpoints, launch-readiness compliance linkage, and audit records.
- Pet calendar, pet profile, pet media, places, notifications, analytics, and observability.
- Admin accounts, high-risk countersign, data clear approval, export approval, signed export links, audit integrity journal, state compaction, and state backup recovery.

## Visual Gate

```powershell
node scripts/smoke-launch-regression.cjs --include-visual
```

This also runs Playwright-backed admin/frontend page checks. Use it when page
layout, admin UI, or browser-visible interaction changed.

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
