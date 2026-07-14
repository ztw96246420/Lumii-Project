# AI 生成内容标识与追溯说明

日期：2026-07-14

## 适用范围

本说明覆盖 Lumii 当前由 GPT Image 2 生成的静态灵伴形象，以及由 Seedance 生成的动态灵伴视频。用户自行上传的原始宠物图片、普通头像和普通宠友圈图片不应被标记为 AI 生成。

## 显式标识

- 生成结果页、首页灵伴舞台、宠物资料、宠友圈资料头部、附近主人和使用该头像的评论身份位置显示精简的 `AI生成` 标识。
- 动态灵伴按视频任务来源显示，静态灵伴按当前宠物头像来源显示；二者不会因另一个媒体的状态而互相误标。
- 普通上传或后台普通图片替换成功后，立即清除当前静态来源标记及已经失效的动效绑定。

## 隐式元数据

每个生成任务创建稳定内容 ID，并保存以下字段：

- `contentId`
- `generationType`: `pet-avatar-image` 或 `pet-avatar-animation`
- `service`: `Lumii`
- `provider`
- `generatedAt`
- `labelVersion`: `cn-generated-content-v1`

新生成 PNG 会把相同信息写入 PNG `tEXt` 块；PNG 和 MP4 的 COS 对象写入 `x-cos-meta-*` 自定义元数据。MP4 还会在 FFmpeg 后处理或仅元数据重封装时写入标准容器元数据。

## 数据流与权限

- 生成任务保存完整来源信息。
- 宠物档案只保存当前实际使用媒体的来源信息。
- 移动端社交接口只返回 `avatarAiGenerated` 布尔值，不返回 provider、模型或内部任务细节。
- 运营后台 AI 图片/视频任务表显示内容 ID、标识版本、生成时间和 provider，便于投诉、审核和导出追溯。
- 旧数据只在当前媒体与已完成任务仍精确匹配时迁移来源信息，避免把后续手工替换的头像误标为 AI。

## 验收

```powershell
node scripts/smoke-ai-generated-content-provenance.cjs
node scripts/smoke-launch-regression.cjs --only=avatar-animation,admin-ai-avatar-job-apply,ai-generated-content-provenance
```

验收覆盖：

- PNG 文件体与 COS 请求元数据包含内容 ID。
- 任务、宠物档案、宠友圈资料与后台任务列表可沿同一 ID/标识状态追溯。
- 普通头像替换没有 AI 元数据，并清除旧来源字段。
- 服务重启迁移不会将普通替换头像重新标记为 AI。
- 移动端关键展示位存在 `AI生成内容标识` 可访问性标签，普通头像不出现误标。

## 发布注意事项

- 已经生成并存储的旧文件不会仅因代码升级自动重写文件体；其页面标识可由匹配任务迁移恢复，文件内元数据仅保证新生成或重新处理的内容。
- 若 FFmpeg 后处理失败，服务端会保留原视频以避免任务丢失，但 COS 对象元数据仍会记录生成来源；运营应在后台排查后重新处理异常视频。
- 标识策略、用户协议和导出/分享产品行为需要随监管要求及实际分发渠道持续复核，不以单次代码验收替代法律审核。
