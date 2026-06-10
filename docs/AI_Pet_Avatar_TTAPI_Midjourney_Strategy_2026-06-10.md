# Lumii AI 宠物形象生成：TTAPI Midjourney 接入方案

## 目标

把“真实宠物照片 -> 真实卡通化灵伴形象”的 MVP 链路从本地 mock 切到可真实生成的服务端链路。

当前选型先接 TTAPI Midjourney，后续仍保留 provider 插槽，可切换 OpenAI、Flux、Gemini/Nano Banana 或自研后端。

## 选型判断

TTAPI Midjourney 官方文档给出的主流程是异步任务：

1. `POST /midjourney/v1/imagine` 创建任务，返回 `data.job_id`。
2. `GET /midjourney/v1/fetch?jobId=...` 轮询任务状态和图片结果。
3. 如果要继续放大或变化，再调用 `POST /midjourney/v1/action`。

对 Lumii 来说，用户上传的是宠物真实照片。TTAPI 的 `imagine` 只收 `prompt`，所以 MVP 做法是：

1. App 选择相册/相机图片时，额外传一份 base64 给后端。
2. 后端保存图片，并开放一个随机媒体文件 URL。
3. 后端把该 URL 放在 Midjourney prompt 最前面，作为 image prompt 参考图。
4. prompt 明确约束：保留真实毛色、耳朵、鼻子、眼神、脸型、品种结构；不要衣服、蝴蝶结、文字、水印、拟人身体。
5. 结果成功后返回第一张候选图给现有“结果确认”页。

这是“参考图生成”方案，不是严格意义的局部编辑或像素级重绘。若后续希望更强的身份一致性，可以评估 OpenAI image edit、Flux Kontext、Gemini/Nano Banana reference images，或增加多候选选择页面。

## 当前实现

### 前端

- `expo-image-picker` 选择相册/拍照时启用 `base64: true`。
- 上传参数新增 `base64`。
- 质量从 `0.9` 调为 `0.78`，降低移动端上传体积。
- 生成页轮询从 `850ms` 调为 `3000ms`，避免真实接口高频请求。
- 生成失败时仍停留在生成页，提供“重新生成 / 重新选择照片”。

### 后端

- `POST /media/uploads`
  - 保存 `base64` 图片 data URL。
  - 返回 `mediaId` 和 `previewUrl`。

- `GET /media/uploads/{mediaId}/file`
  - 公开返回上传图片文件，供 TTAPI 拉取参考图。
  - `mediaId` 带随机后缀，MVP 阶段暂不做鉴权。

- `POST /ai/pet-avatar/jobs`
  - 默认 provider 根据环境变量决定。
  - `PET_AVATAR_PROVIDER=ttapi-midjourney` 且配置 `TTAPI_API_KEY` 时走真实 TTAPI。
  - 未配置时仍可使用 mock。
  - 默认每个手机号每天最多生成 10 次。

- `GET /ai/pet-avatar/jobs/{jobId}`
  - mock provider：沿用本地进度。
  - TTAPI provider：调用 `fetch` 刷新任务状态。
  - 成功后把 TTAPI 图片 URL 写入 `resultUrl`。

## 环境变量

```bash
PET_AVATAR_PROVIDER=ttapi-midjourney
TTAPI_API_KEY=服务端密钥，不提交 Git
TTAPI_MJ_BASE_URL=https://api.ttapi.io
TTAPI_MJ_MODE=fast
TTAPI_MJ_TIMEOUT=600
TTAPI_MJ_AUTO_UPSAMPLE=false
PET_AVATAR_DAILY_LIMIT=10
PET_AVATAR_PUBLIC_BASE_URL=http://193.112.92.111
MEDIA_UPLOAD_MAX_BASE64_CHARS=12000000
```

说明：

- `TTAPI_MJ_MODE` 可用 `relax`、`fast`、`turbo`。MVP 测试先用 `fast`。
- `TTAPI_MJ_AUTO_UPSAMPLE=false` 是为了省额度；后续如果你更重视单图精细度，可以打开自动 `upsample1`。
- `PET_AVATAR_PUBLIC_BASE_URL` 必须是 TTAPI 能访问到的公网地址。

## Prompt 模板

```text
{reference_image_url}
Transform the exact same {species} from the reference photo into a realistic semi-cartoon pet portrait for Lumii.
Breed/profile hint: {breed}. The output must still look like this individual pet, not a new generic {breed}.
Preserve identity: same age impression, same fur color, markings, face shape, muzzle length, nose size, ear shape, eye shape, expression, head proportions, and natural anatomy.
Style: realistic pet portrait with gentle hand-painted softness, detailed natural fur, clean mobile app asset quality, subtle warmth, not childish, not toy-like.
Composition: one pet only, head and upper chest portrait, 3/4 view or front view matching the photo, centered, simple warm off-white background, soft studio lighting.
Do not redesign the pet. Do not make it younger, cuter, fluffier, smaller, or change the breed. No clothes, bowties, hats, collar emphasis, accessories, text, watermark, logo, human body, fantasy creature, extra limbs, or distorted face.
--ar 1:1 --iw 3 --style raw --s 60 --chaos 0 --no anime, plush toy, mascot, pixar, disney, chibi, giant eyes, puppy transformation, costume, bowtie, hat, text, watermark, logo
```

## 风险和后续优化

- Midjourney 参考图一致性不一定稳定，需要用真实宠物照片多测。
- 当前结果页只展示单图，后续建议补 Figma 页面：四宫格候选结果、选择某一张、重新生成、反馈“不像”。
- 生产环境应把上传图放到对象存储，设置过期 URL，而不是长期保存在本地 JSON。
- 生产环境应增加图片压缩、图片安全审核、宠物主体检测、多宠物提示。
- 若 TTAPI 结果不够像，应优先对比 Flux Kontext / OpenAI image edit / Gemini reference image 的效果。
