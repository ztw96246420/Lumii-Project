# Tencent Content Safety Runbook

Date: 2026-06-30

This runbook records the production-facing Tencent Cloud content safety setup for Lumii. Do not store real SecretId or SecretKey values in this repository.

## Server Environment

Required server environment variables:

- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`

Optional environment variables:

- `TENCENT_CMS_REGION`, default `ap-guangzhou`
- `TENCENT_CMS_TIMEOUT_MS`, default `12000`
- `TENCENT_CMS_TEXT_ENDPOINT`, default `tms.tencentcloudapi.com`
- `TENCENT_CMS_TEXT_VERSION`, default `2020-12-29`
- `TENCENT_CMS_IMAGE_ENDPOINT`, default `ims.tencentcloudapi.com`
- `TENCENT_CMS_IMAGE_VERSION`, default `2020-12-29`

The backend only exposes whether credentials are configured. It never returns SecretId or SecretKey to the admin UI or mobile app.

## Biztype Mapping

Text content safety:

| Backend scope | Default Biztype | Scene |
| --- | --- | --- |
| `conversation_message` | `lumii_t_conversation` | Private conversation text |
| `pet_chat_ai_reply` | `lumii_t_ai_reply` | AI pet chat generated reply text |
| `pet_circle_post` | `lumii_t_social_post` | Pet circle moment text |
| `pet_circle_comment` | `lumii_t_social_comment` | Pet circle comment text |
| `place_review` | `lumii_t_place` | Place review text |
| `place_submission` | `lumii_t_place` | User submitted place text |
| `pet_profile` | `lumii_t_profile` | Public pet profile text |

Image content safety:

| Backend scope | Default Biztype | Scene |
| --- | --- | --- |
| `pet_avatar` | `lumii_i_pet_avatar` | Pet avatar and AI source photo |
| `pet_circle_photo` | `lumii_i_social_photo` | Pet circle post image |
| `pet_circle_cover` | `lumii_i_cover` | Pet circle cover image |
| `place_review` | `lumii_i_place` | Place review image |
| `place_submission` | `lumii_i_place` | User submitted place image |
| `support` | `lumii_i_support` | Support ticket attachment |

If Tencent Cloud Biztype names change, override them with these environment variables instead of changing code:

- `TENCENT_CMS_TEXT_BIZ_SOCIAL_POST`
- `TENCENT_CMS_TEXT_BIZ_SOCIAL_COMMENT`
- `TENCENT_CMS_TEXT_BIZ_CONVERSATION` or `TENCENT_CMS_TEXT_BIZ_CHAT`
- `TENCENT_CMS_TEXT_BIZ_AI_REPLY` or `TENCENT_CMS_TEXT_BIZ_PET_CHAT`
- `TENCENT_CMS_TEXT_BIZ_PLACE`
- `TENCENT_CMS_TEXT_BIZ_PROFILE`
- `TENCENT_CMS_IMAGE_BIZ_PET_AVATAR`
- `TENCENT_CMS_IMAGE_BIZ_SOCIAL_PHOTO`
- `TENCENT_CMS_IMAGE_BIZ_COVER`
- `TENCENT_CMS_IMAGE_BIZ_PLACE`
- `TENCENT_CMS_IMAGE_BIZ_PLACE_REVIEW`
- `TENCENT_CMS_IMAGE_BIZ_PLACE_SUBMISSION`
- `TENCENT_CMS_IMAGE_BIZ_SUPPORT`

The admin launch-readiness ledger now derives the content-safety P0 state from `adminContentSafetyStatus()`: Tencent credentials plus both text and image machine switches must be enabled before the content-safety vendor and image-review items are marked as ready.

## Runtime Policy

- Local keyword rules run first.
- Tencent Cloud machine moderation runs only when `moderation.enabled` and the relevant machine switch are both enabled.
- `Pass`: content is allowed.
- `Review`: public content is held from public display and enters the admin review pool when that content type has one. Private conversation messages use review-as-block and are not sent to either side.
- `Block`: public content is rejected or hidden.
- AI pet chat replies use `pet_chat_ai_reply`. Review or Block auto-hides the original generated reply, returns only a safe fallback sentence to mobile for that POST response, and keeps the original text in the admin AI chat quality queue.
- Tencent Cloud call failures are treated as `Review` for public content, so production fails closed rather than publishing unchecked content.
- Tencent Cloud call failures for private conversation messages are recorded as moderation samples but do not block sending, to avoid breaking live IM during upstream incidents.

## Admin and App Linkage

Admin config page:

- Shows credential configured status.
- Shows text/image moderation switch status.
- Shows Biztype mapping and endpoint metadata.

Mobile app config:

- Receives public moderation switch states.
- Does not receive Tencent credentials.
- Does not receive Biztype values.
