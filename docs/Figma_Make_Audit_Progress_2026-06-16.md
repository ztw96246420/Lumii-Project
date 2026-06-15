# Figma Make Audit Progress - 2026-06-16

This file records incremental parity work that should be merged back into `Figma_Make_Full_Parity_Audit_2026-06-14.md` after the main table encoding is normalized.

## Login And OTP

- Screen1 `renderLogin`: aligned the default login header closer to Figma `BrandHeader`.
  - Horizontal page padding: 28px.
  - Logo: 36px mark, 17px text, 600 weight.
  - Title: 28px, 600 weight, 35px line height.
  - Subtitle top spacing: 8px.
  - `loginHero` top offset changed from 88 to 50.
  - No change to phone input refs, focus handling, validation, SMS cooldown, or navigation logic.

- Screen6-8 `renderOtp`: aligned OTP typography without changing the OTP state machine.
  - OTP digits: 22px, 600 weight.
  - Phone number in subtitle: normal weight.
  - Resend copy: 13px, 400 weight.
  - Resend action: 13px, 500 weight.
  - Voice code link: teal accent, 13px, 400 weight.
  - No change to input order, paste handling, countdown, resend, verify, or expiry logic.

## Permissions

- Screen10-13 `renderPermissions`: aligned permission-page typography only.
  - Primary button text: 16px, 500 weight.
  - Denied hint row: 12px, 500 weight.
  - Denied status badge: 12px, 500 weight.
  - Loading status text: 12px, 400 weight.
  - Bottom weak actions: 13px, 400 weight.
  - No change to `requestPermission`, `requestAllPermissions`, `openPermissionSettings`, or `continueAfterPermissions`.

## Verification

- `npm run typecheck`
- `git diff --check`
- `Invoke-WebRequest -UseBasicParsing -Uri http://localhost:8081/ -TimeoutSec 8`

