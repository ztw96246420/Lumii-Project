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

## Pet Onboarding

- Screen15 `renderPetInfo`: aligned title and pet type controls with Figma `PageTitle` / `TypePick`.
  - Page title: 26px, 600 weight, 34px line height.
  - Pet type text: inactive 500 weight, active 600 weight.
  - Kept MVP business fields for birthday and gender; these are intentional product fields and were not removed just to match the four-field static mock.
  - No change to `savePetProfile`, draft state, validation, or route transition.

- Screen16 `renderUpload`: aligned upload guidance details with Figma `UploadBox` / `TipsList`.
  - Upload hint text: 12.5px, 400 weight.
  - Tips rows now use a 16px teal-tint circular check icon like Figma.
  - Tips text: 13px, 400 weight.
  - Kept the extra "avoid people or other animals" guidance because it supports the current AI image-generation safety/quality flow.
  - No change to camera, gallery, upload, media analysis, or permission logic.

## Profile

- Screen54 `renderProfile`: adjusted the three main profile blocks for narrow Android devices after true-device review.
  - Figma source uses 16px horizontal inset on a 393px frame.
  - Web/Figma preview keeps 16px.
  - Native screens up to 380dp width now use 12px for the hero card, current-pet block, and menu group so the blocks occupy a closer visual proportion on compact Android layouts.
  - No change to profile navigation, account data, pet detail entry, multi-pet entry, notifications, settings, or safety routes.

- Screen55 `renderPetDetail`: aligned pet detail content width and typography with the Figma profile source.
  - Body content now uses the same effective 16px horizontal inset as Figma while the hero image stays full bleed.
  - Hero subtitle, edit button label, and stat card label/value weights were reduced to match Figma's lighter hierarchy.
  - No change to pet avatar refresh, edit-pet navigation, vaccine entry, health memo entry, or displayed account data.

- Screen81 `renderMultiPet`: aligned the current-pet and list layout with the newer Figma multi-pet source.
  - Effective content inset changed from the generic 20px second-level page inset to Figma's 16px.
  - Current-pet hero starts 8px below the top bar and keeps the 14px bottom rhythm from Figma.
  - The bottom explainer card now uses the Figma white card with neutral border instead of the shared teal chat safety card.
  - No change to active pet switching, delete confirmation, add-pet navigation, loading overlay, or toast behavior.

## Verification

- `npm run typecheck`
- `git diff --check`
- `Invoke-WebRequest -UseBasicParsing -Uri http://localhost:8081/ -TimeoutSec 8`
