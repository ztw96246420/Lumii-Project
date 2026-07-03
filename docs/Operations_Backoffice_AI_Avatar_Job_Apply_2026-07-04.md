# 运营后台：AI 形象任务结果应用到宠物档案

日期：2026-07-04

## 背景

AI 灵伴任务页此前已支持刷新、重试、标记失败、返还额度、沉淀提示词样本和供应商异常样本，但 ready 结果图不能由运营直接应用到真实宠物档案。线上遇到单个用户生成成功但移动端展示异常时，只能走“宠物媒体替换”手工 URL 链路，任务状态和宠物 AI 状态容易割裂。

本次补齐后台到移动端的同源数据闭环：运营可从 AI 灵伴任务行将 ready 结果图应用到同一用户的指定宠物档案。

## 后台能力

- AI 灵伴任务表返回 `acceptedPetId`、`acceptedPetName`、`adminAppliedAt`、`adminAppliedBy`。
- 任务卡片展示：
  - 已应用：显示目标宠物名或宠物 ID。
  - 未应用 ready 任务：显示“可应用到宠物档案”。
- ready 且有 `resultUrl` 的任务行展示“应用为AI形象”按钮。
- 点击后需要填写目标宠物 ID、应用原因，并二次确认影响范围。

## API

`POST /admin/ai/avatar-jobs/{jobId}/apply`

请求体：

```json
{
  "petId": "pet-xxx",
  "reason": "运营复核后应用到用户当前宠物"
}
```

校验规则：

- 任务必须存在。
- 任务归属用户必须存在。
- 任务必须是 `status=ready` 且有 `resultUrl`。
- `reason` 必填。
- `petId` 必须属于该任务的同一用户，禁止跨用户应用。
- 结果图不能是本地占位图。
- 如果结果图来自站内上传素材，必须仍然是公开可见状态。
- 外部 URL 在应用前会尝试下载并走图片内容安全；命中 review/block 时不直接应用。

成功后：

- 更新 `users[phone].pets[].avatarUrl`。
- 清空该宠物旧的 `avatarAnimationJobId/avatarAnimationStatus/avatarAnimationUrl/avatarAnimationUpdatedAt`。
- 更新任务：
  - `acceptedAt`
  - `acceptedPetId`
  - `adminAppliedAt`
  - `adminAppliedBy`
  - `adminAppliedReason`
  - `petId`
  - `petName`
- 如果结果图需要重新镜像，保留 `sourceResultUrl` 并将 `resultUrl` 更新为站内存储地址。
- 解除目标宠物旧 AI 任务的 `acceptedPetId/acceptedAt`，避免多个 ready 任务同时被判断为已应用。
- 写入审计 `ai.avatar.apply_to_pet`。
- 写入用户站内通知，提示 AI 灵伴形象由平台协助替换。

## 移动端影响

移动端不新增独立数据源，仍读取同一份宠物档案：

- `/pets`
- `/me`
- 首页宠物卡片
- AI 对话宠物上下文
- 宠友圈宠物头像展示

应用动作会清空旧动效字段，因此首页不会继续播放和旧静态图不匹配的视频。后续如需要重新生成动效，应由现有灵伴动效任务链路重新触发。

## 审计和运营边界

- 该操作属于高影响后台动作，必须填写原因。
- 当前 admin 权限可操作，后续多角色后台上线后建议收敛到 `ai_ops` 或 `pet_ops` 高权限。
- 不支持跨用户选择宠物。
- 不做批量应用，避免误改真实用户首页形象。
- 合并重复宠物档案仍未开放；该动作只处理单个任务到单只宠物的应用关系。

## 验证

新增 smoke：

```bash
node scripts/smoke-admin-ai-avatar-job-apply.cjs
```

覆盖：

- 后台创建一个 ready AI 形象任务。
- 缺少原因时拒绝应用。
- 将该 ready 任务应用到同账号另一只宠物。
- 后台宠物档案目标宠物显示 `avatarStatusKey=ai`。
- 原宠物不再因为该任务被误判为 AI 形象已应用。
- 移动端 `/pets` 读取到新的 `avatarUrl`。
- 旧动效字段被清空。
- 用户通知和审计日志均写入。
