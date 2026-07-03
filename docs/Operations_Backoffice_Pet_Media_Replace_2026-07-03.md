# 宠物媒体后台替换

日期：2026-07-03

## 目标

补齐运营后台对宠物普通头像和宠友圈封面的受控替换能力。这个能力用于用户申诉、明显违规后的运营修正或客服协助，不用于伪造 AI 灵伴形象任务结果。

## 后台能力

- `POST /admin/pets/{petId}/media/avatar/replace`
  - 必须提交 `imageUrl` 和 `reason`。
  - `imageUrl` 必须是移动端可直接访问的公开 `http(s)` 图片 URL。
  - 若是外部图片，会先下载并经过图片内容安全校验，再镜像到站内存储。
  - 写入 `adminAuditLogs`，action 为 `pet.media.replace_avatar`。
  - 给用户写入站内通知 `宠物头像已替换`。
- `POST /admin/pets/{petId}/media/cover/replace`
  - 必须提交 `imageUrl` 和 `reason`。
  - 复用公开 URL、图片内容安全和站内存储镜像规则。
  - 写入 `adminAuditLogs`，action 为 `pet.media.replace_cover`。
  - 给用户写入站内通知 `宠友圈封面已替换`。

## 移动端联动

- 替换普通头像会直接更新同一份 `users.pets[].avatarUrl`。
- 移动端 `/pets`、`/me`、首页宠物卡片、宠物档案、AI 对话头像和宠友圈头像下一次刷新都会读取新头像。
- 如果原头像来自已接受的 AI 灵伴任务，后台替换会解除旧任务的 `acceptedPetId` / `acceptedAt` 关联，并清空 `avatarAnimationJobId`、`avatarAnimationStatus`、`avatarAnimationUrl`、`avatarAnimationUpdatedAt`，避免移动端继续播放旧动效。
- 替换宠友圈封面会直接更新 `users.pets[].petCircleCoverImageUrl`，移动端宠友圈个人主页下一次刷新读取新封面。

## 当前边界

- 不开放 `ai-avatar` 替换接口。AI 灵伴结果图属于任务产物，生产期只能清空、下架、复盘或重新生成，不能由后台随意指定一张图冒充 AI 结果。
- 不支持后台直接上传本地文件；当前第一版要求运营先使用已有公开图片 URL。后续如要上传，应复用统一 `/media/uploads` 和内容安全池。
- 不支持合并重复宠物档案；合并需要迁移宠物日历、AI 任务、宠友圈、约遛/会话等引用。

## 验收

- `scripts/smoke-admin-pet-media-replace.cjs`
  - 用户创建宠物。
  - 后台替换普通头像成功。
  - 后台替换宠友圈封面成功。
  - 移动端 `/pets` 读到新头像和新封面。
  - 宠友圈个人主页读到新头像和新封面。
  - 用户通知中心收到替换通知。
  - 审计日志存在 `pet.media.replace_avatar` 和 `pet.media.replace_cover`。
  - `ai-avatar` 替换被拒绝。
- `scripts/smoke-admin-pet-media-replace-page.cjs`
  - 打开运营后台宠物档案页。
  - 验证“换头像 / 换封面”按钮可见。
  - 通过页面 prompt/confirm 完成替换。
  - 截图保存到 `artifacts/admin-pet-media-replace/`。
