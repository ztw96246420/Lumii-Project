# Lumii AI 宠物形象生成：TTAPI Flux Edits 方案

## 当前结论

当前 MVP 主方案暂定为：

```bash
PET_AVATAR_PROVIDER=ttapi-flux-edits
TTAPI_FLUX_MODE=flux-2-max
```

原因：

- Lumii 的目标是“真实宠物照片 -> 高相似度真实卡通化形象”。
- Midjourney `imagine` 更偏“参考图 + 创作生成”，容易把宠物重新设计成好看的通用角色。
- TTAPI `flux/edits` 是基于参考图片做 image edit，更接近照片转绘链路。
- 2026-06-10 样图测试中，`flux-2-max` 的“叼花金毛”结果比 `flux-kontext-max` 更接近我们想要的高级真实卡通化质感。

## 官方接口依据

- `POST /flux/edits`：multipart 上传参考图，参数包含 `image`、`mode`、`prompt`、`aspect_ratio`。
- `GET /flux/fetch?jobId=...`：轮询生成结果，成功后读取 `data.imageUrl`。
- 文档列出的可用 `mode` 包括：`flux-kontext-pro`、`flux-kontext-max`、`flux-2-pro`、`flux-2-flex`、`flux-2-max` 等。

## 后端流程

1. App 相册/相机选择图片，上传 `base64`。
2. 后端保存原图 data URL。
3. `POST /ai/pet-avatar/jobs` 创建任务。
4. 当 `PET_AVATAR_PROVIDER=ttapi-flux-edits`：
   - 后端把 data URL 转成文件 Blob。
   - 调用 `POST /flux/edits`。
   - 保存 TTAPI `job_id`。
5. `GET /ai/pet-avatar/jobs/{jobId}` 轮询：
   - 调用 `GET /flux/fetch?jobId=...`。
   - 成功后把 `data.imageUrl` 返回为 `resultUrl`。
6. App 仍使用现有“生成中 -> 结果确认 -> 保存”页面。

## Prompt v1

```text
Create a realistic cartoon transformation of the exact same {species} in the reference image, preserving identity and facial likeness.
Breed/profile hint: {breed}. Keep this individual pet recognizable, not a generic {breed}.
Preserve identity: fur color, markings, eye shape, nose shape, muzzle length, ear shape, face proportions, age impression, expression, posture, and natural anatomy.
If the photo contains a distinctive object, pose, or expression, preserve it unless it distracts from the pet portrait.
Make it feel like a premium Lumii mobile app pet avatar: realistic semi-3D hand-painted fur, soft studio lighting, tactile warm texture, clean edges, gentle off-white background.
Keep the head and upper body centered in a square portrait. Preserve realistic dog/cat anatomy and natural proportions.
Avoid flat vector illustration, black comic outlines, anime style, chibi style, plush toy, generic mascot, exaggerated eyes, changed breed, changed age, human clothing, bowtie, hat, collar emphasis, text, watermark, logo, extra limbs, or distorted face.
The image should look like the uploaded pet became a polished realistic cartoon avatar, not a newly invented cartoon pet.
```

## 样图测试记录

测试素材：Unsplash 金毛照片 `photo-1552053831-71594a27632d`。

- `flux-kontext-max`：相似度有保留，但风格偏扁平插画，黑描边明显，不适合作为主风格。
- `flux-2-max`：质感更高级，保留了叼花、金毛、正面坐姿等核心特征；仍有眼睛偏大、花色变化、偏 3D 可爱化的问题，但方向明显优于 Midjourney 和 `flux-kontext-max`。

## 后续优化

- 用用户真实宠物照片继续测试，重点看“主人是否一眼认得出是自家宠物”。
- 结果页建议后续补 Figma：多候选结果、选择其中一张、重新生成、反馈“不像”。
- 若 `flux-2-max` 仍不稳定，再对比 OpenAI image edit、Gemini/Nano Banana reference image、Flux Kontext Pro/Max 的不同 prompt。
- 生产环境应迁移到对象存储和过期 URL，不长期把 base64 存在本地 JSON。

