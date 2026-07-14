# AI 灵伴动效生成接入说明

日期：2026-07-02

## 目标

静态 AI 灵伴形象保存成功后，服务端异步创建灵伴动效任务。移动端首页保持原有进入逻辑，任务处理中在“灵伴在线”下方展示小进度条，任务完成后默认播放动态灵伴，并提供“静态灵伴 / 动态灵伴”切换。

## 上游接口

- Provider：`doubao-seedance-1-5-pro`
- Endpoint：`POST https://api.apimart.ai/v1/videos/generations`
- 状态查询：`GET https://api.apimart.ai/v1/tasks/{task_id}?language=zh`
- 参考图：使用 GPT Image 2 生成并保存后的静态灵伴图
- 固定参数：
  - `duration: 4`
  - `aspect_ratio: "1:1"`
  - `resolution: "480p"`
  - `audio: false`
  - `camerafixed: true` 默认开启，可在后台切换

## 环境变量

- `APIMART_API_KEY`：优先使用的视频生成网关密钥。
- `GPT_IMAGE2_API_KEY`：如果未配置 `APIMART_API_KEY`，动效生成会复用该密钥。
- `APIMART_BASE_URL`：默认 `https://api.apimart.ai`。
- `PET_AVATAR_ANIMATION_PROVIDER`：默认有 APIMart key 时为 `doubao-seedance-1-5-pro`，否则为 `disabled`。可设为 `mock` 或 `disabled`。
- `PET_AVATAR_ANIMATION_ENABLED=false`：关闭新动效任务。
- `PET_AVATAR_ANIMATION_MODEL`：默认 `doubao-seedance-1-5-pro`。
- `PET_AVATAR_ANIMATION_MAX_BYTES`：下载并转存视频到 COS 的最大字节数，默认 35MB。

## 后台配置

路径：后台“配置中心” -> “AI 外围系统配置”。

可配置项：

- 灵伴动效 provider：`doubao-seedance-1-5-pro` / `mock` / `disabled`
- 启用灵伴动效异步生成
- Seedance model
- Seedance 锁定镜头 `camerafixed`
- 狗狗动效 prompt
- 猫咪动效 prompt
- 默认动效 prompt
- negative constraints

说明：当前 APIMart Seedance 文档没有列独立 `negative_prompt` 字段，所以服务端把 negative constraints 合并进主 prompt 的 `Avoid:` 段。

## 任务状态

状态表：`state.avatarAnimationJobs`

核心字段：

- `status`: `processing` / `ready` / `failed`
- `progress`: 0-100
- `providerJobId`: 上游 task id
- `sourceAvatarUrl`: 静态灵伴图
- `videoUrl`: 可播放动效视频 URL
- `petId`, `ownerPhone`, `avatarJobId`

超时策略：

- 提交阶段超过 2 分钟未拿到 task id，标记失败。
- 状态阶段超过 20 分钟未完成，标记失败。

## 后台处置

路径：后台“AI 灵伴” -> “动效任务”。

运营可处理移动端不再轮询后残留的卡住任务：

- `刷新`：请求上游状态并同步宠物档案动效字段。
- `重试`：基于当前静态灵伴形象新建动效任务，并写回 `avatarAnimationJobId/avatarAnimationStatus/avatarAnimationUrl`。
- `失败`：手动结束异常任务，清空当前任务对应的动效 URL，让移动端首页回退到静态灵伴。

详见：[Operations_Backoffice_AI_Avatar_Animation_Recovery_2026-07-04.md](./Operations_Backoffice_AI_Avatar_Animation_Recovery_2026-07-04.md)。

## 移动端接口

- `GET /ai/pet-avatar/animation/latest?petId=...`
- `GET /ai/pet-avatar/animation/{jobId}`
- `POST /ai/pet-avatar/animation`

移动端不读取后台 prompt/provider 配置；只读取用户自己的动效 job 状态和视频 URL。

## 清数据

后台“清理用户业务数据”会同时删除该用户的 `avatarAnimationJobs`，避免测试号重跑时残留旧动效任务。

## Avatar-stage background

- `PET_AVATAR_ANIMATION_STAGE_BACKGROUND`: default `#FFFDFC`, matching the home companion info panel rather than the root app background.
- The Seedance prompt uses this value as the solid warm off-white Lumii avatar-stage background, so generated MP4 pixels blend with the app companion display frame.
- Keep only a soft contact shadow under the pet; avoid pure white, gray, checkerboard, gradients, room/outdoor scenes, floor lines, and horizon lines.
- Existing MP4 files keep their baked background pixels. Regenerate the static avatar first, then regenerate animation, when changing matte/background policy.
- `PET_AVATAR_ANIMATION_DOWNLOAD_TIMEOUT_MS`: default 5 minutes. Server-side mirroring uses range requests when the upstream video supports `Accept-Ranges: bytes`.

## AI generated-content labeling and provenance

- Every static-avatar and animation job receives a stable AI content ID, generation type, provider, generated timestamp, and label version (`cn-generated-content-v1`).
- Mobile surfaces that display the generated pet identity show the compact explicit label `AI生成`. User-uploaded replacement avatars do not inherit the label.
- Newly mirrored PNG files contain PNG `tEXt` entries for `AI-Generated`, `AI-Service`, `AI-Content-ID`, `AI-Content-Type`, `AI-Provider`, `AI-Label-Version`, and `AI-Generated-At`.
- COS objects for generated PNG and MP4 files receive equivalent `x-cos-meta-*` metadata. MP4 files also receive standard title/comment/description/encoded-by/creation-time metadata during FFmpeg processing or a metadata-only remux.
- Pet records keep the content ID and label version for the currently applied static and dynamic companion. A manual avatar replacement clears stale provenance and animation bindings; startup migration only restores provenance when the current media still matches a completed generation job.
- Operators can inspect the content ID and label version in the AI task tables. Public social payloads expose only the generated-content boolean and do not expose provider internals.
- Regression command: `node scripts/smoke-ai-generated-content-provenance.cjs`.
