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

## Pet Home And AI Chat

- Screen26 `renderHome`: aligned two low-risk visual differences with the Figma pet home source.
  - Health score ring now uses the Figma filled heart icon instead of the heart-pulse icon.
  - Metric cards can now separate icon tone from tag tone, so the vaccine tile keeps a teal icon while its due-date tag stays orange like the source.
  - The floating chat hint already rotates through local prompt copy on each return to Home, so the previous fixed "今天想去公园散步吗？" issue is covered without adding a new page or external call.
  - No change to home navigation, health summary, vaccine data, weight data, nearby owner count, or daily-post entry.

- Screen27-28 `renderChat`: reviewed against the Figma AI chat and error-state source.
  - Header, avatar online/offline state, safety tip, message bubbles, typing dots, quick topics, input dock, error banner, and failed-message retry card already match the source closely.
  - Kept the MVP reply feedback chips ("像它 / 不像它") as product behavior for improving pet persona responses.
  - No change to DeepSeek chat request flow, send/retry state, quota display, or message persistence.

## Health Main Flow

- Screen29 `renderHealth`: aligned health-home atoms with the Figma pet-core source.
  - Health score hero now uses the Figma filled heart icon and lighter label/body weights.
  - `HealthMakeRow` can now separate icon tone from badge tone, matching the source pattern where the vaccine row has a teal icon with an orange due-state badge.
  - Health memo count badge now uses the muted grey tone from Figma.
  - No change to health summary fetch, vaccine reminder sync, weight data, memo data, health calendar entry, or row navigation.

- Screen30-34 `renderWeight` / `renderVaccine` / `renderMemoNew` / `renderDailyPost`: reviewed as part of this health pass.
  - Weight edit/delete and memo edit/delete were already covered in the Health Editing section.
  - Vaccine plan and daily-post layouts already follow the source structure closely enough for this pass.
  - No code change was made in those flows.

## Foundation Components

- Screen64-67 / 71-73 `ui.tsx`: reviewed Button, Field, Toast, ConfirmDialog, EmptyState, ErrorState, LoadingState, and Skeleton atoms against the Figma system source.
  - Component sizing, radii, icon boxes, basic typography, loading copy, disabled state, and danger-state detection already match the source closely.
  - `rg` confirms the real source text is Chinese (`处理中…`, `正在为你召唤灵伴…`, `确认`, `取消`); the garbled text seen in `Get-Content` output is a PowerShell console encoding artifact, not App copy.
  - No code change was made here to avoid broad component churn.

- Screen68-70 shared surfaces: reviewed BottomSheet, TabBar, and base Card usage.
  - Existing BottomSheet and TabBar styles are already aligned with the Figma radius, spacing, and active-state treatment used by current production screens.
  - Base Card remains available as a shared atom, while page-specific Figma cards are intentionally kept as local styles where the source screens require different radii, shadows, or row density.

## Profile

- Screen54 `renderProfile`: adjusted the three main profile blocks for narrow Android devices after true-device review.
  - Figma source uses 16px horizontal inset on a 393px frame.
  - Web/Figma preview keeps 16px.
  - Native screens now use 12px for the hero card, current-pet block, and menu group so the blocks occupy a closer visual proportion on real Android layouts including wider vivo devices.
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

## Owner Edit

- Screen86-91 `renderOwnerEdit`: aligned the existing owner-edit page with Figma's owner edit component set.
  - Shared form atoms now use Figma-like regular weights for field labels, text inputs, counters, and helper text.
  - Avatar hint spacing/text, camera shadow, read-only phone color, upload note, and save-error card typography now match the Figma states more closely.
  - No change to avatar picking, owner profile validation, save retry, success state, or `lumiiApi.account.updateMe`.

## Health Editing

- Screen92-96 `renderMemoEdit`: aligned the existing health memo edit/delete flow with Figma's memo edit source.
  - Memo edit body now uses the same effective 16px horizontal inset and 10px top rhythm as Figma.
  - Memo content textarea height and date/category meta row typography now match the Figma atoms more closely.
  - Delete entry typography was reduced to Figma's 14px/500 treatment.
  - No change to memo validation, save, delete confirmation, or local CRUD behavior.

- Screen97-101 `renderWeight`: aligned the existing weight trend, edit sheet, and delete flow with Figma's weight source.
  - Trend card, health notice, and history list now use the same effective 16px horizontal inset as Figma.
  - Trend label/unit, history header, and edit-sheet meta rows were adjusted to the Figma hierarchy.
  - No change to trend calculations, abnormal-status detection, add/edit/delete record handlers, or bottom-sheet behavior.

## Settings And Safety

- Screen58 `renderSettings`: reviewed the shared settings `Section` / `Row` / `Toggle` atoms against the Figma profile source.
  - Existing row height, icon size, card inset, toggle size, and footnote rhythm already match the Figma atoms closely, so no style churn was made there.

- Screen59 `renderAccountSecurity`: aligned the account-security hero hierarchy with Figma.
  - Hero title weight now matches Figma's 14px / 600 treatment.
  - No change to displayed phone, login protection toggle, or account-security navigation.

- Screen60 `renderSafety`: aligned the safety-center page with Figma's 16px content inset and lighter card hierarchy.
  - Added a page-level wrapper to match Figma's `8px 16px` body rhythm.
  - Safety hero/action-card/audit-note typography now uses the Figma weights.
  - Existing placeholder actions remain toast-only; no new report/block backend flow was added.

- Screen62 `renderLogoutConfirmSheet`: aligned logout confirmation bottom sheet buttons with Figma.
  - Sheet action buttons now use 48px height, 14px radius, and 600 text weight.
  - No change to `logout`, session clearing, or cancel behavior.

## Social And Messages

- Screen38 `renderGreetingSheet`: aligned the greeting bottom sheet with the Figma social source.
  - Header now uses the 48px rounded pet image with the owner's mini avatar overlay instead of a generic circular avatar.
  - Added the Figma "选一句话开场" label, four greeting chips including "自定义", and a large 82px message preview card.
  - Added the teal safety notice from Figma: first greeting requires the other side to agree before chatting.
  - No change to `sendGreeting`, greeting saving state, request creation, message creation, or rate-limit extension points.

- Screen41-42 `renderMessages` / `renderConversation`: aligned low-risk typography with the Figma message list and chat detail source.
  - Conversation row title/time weights now match the lighter Figma hierarchy.
  - Chat header name and safety strip typography/radius now match Screen42 more closely.
  - No change to inbox refresh, opening conversations, message send/retry/delete, or notification entry logic.

## Notifications And Map

- Screen44 `renderNotifications`: reviewed against the Figma notification center source.
  - Header, filter chips, group labels, unread cards, category icons, time labels, and action button sizes already match the Figma source closely.
  - Kept the disabled "全部已读" state when there are no unread notifications because it reflects live data state, even though the static Figma frame shows the enabled state.
  - No code change was made here.

- Screen45-47 `renderMap`: reviewed against the Figma map home, search/filter, and locate-failed frames.
  - Apparent top-position differences are safe-area compensated in RN: the native top inset plus RN offsets match the Figma `top: 50 / 108 / 270` placement rhythm.
  - Kept the map bottom sheet above the real app tab bar instead of Figma's static bottom edge, because the production app has persistent bottom navigation.
  - No code change was made here to avoid destabilizing real AMap, location retry, search, map-style panel, traffic toggle, place detail, and navigation flows.

## Places And Navigation

- Screen48 `renderPlaceDetail`: reviewed against the Figma place-detail source.
  - Hero height, top floating actions, photo count, rounded detail sheet, rating row, address card, feature tags, review preview, write-review shortcut, and AMap CTA already match the source closely.
  - Kept live favorite/saving states, share action, pending-review notice, selected-place data, and AMap navigation entry.
  - No code change was made here.

- Screen49 `renderAddPlaceReview`: reviewed against the Figma add-place / review source.
  - Place chip, rating card, selectable tags, textarea, photo squares, audit notice, header publish action, and bottom submit button already follow the Figma layout.
  - Kept the MVP add-place mode in the same route because the production flow supports both "新增地点" and "写点评"; this is a product extension, not a Figma mismatch.
  - No code change was made here.

- Screen50-51 `renderPlaceSubmitResult`: aligned the failure visual with the Figma state.
  - Success state was already close: 160px audit illustration, stepper card, and two 48px action buttons.
  - Failure state now uses the Figma circular alert icon instead of the triangular warning icon.
  - No change to draft saving, retry, success close, or continue-submit behavior.

- Screen52 `Toast` for favorite / unfavorite: reviewed against the Figma favorite toast source.
  - The shared Toast already supports the dark bookmark success layout, orange action text, surface unfavorite layout, bottom placement, icon tones, subtitle, and action text used by favorite flows.
  - Kept the shared component instead of forking a one-off place toast, so other completed toast states stay consistent.

- Screen53 `renderAmapNavigationConfirm`: reviewed against the Figma AMap confirmation source.
  - Modal width, rounded radius, green navigation icon, title/body typography, place row, map app choices, and cancel/open actions already match the source closely.
  - Kept real `openAmapPlace` behavior and did not alter native navigation handling.

## Verification

- `npm run typecheck`
- `git diff --check`
- `Invoke-WebRequest -UseBasicParsing -Uri http://localhost:8081/ -TimeoutSec 8`
