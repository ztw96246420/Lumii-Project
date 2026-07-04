# AI 灵伴失败额度返还策略

日期：2026-07-04

## 1. 策略口径

后台配置项：`ai.avatarFailureRefund`

默认开启自动返还，仅覆盖供应商侧或平台侧不可控失败：

- `providerStartFailure`：供应商任务提交失败或缺少必要供应商配置，对应 `AVATAR_PROVIDER_START_FAILED` / `AVATAR_PROVIDER_START_TIMEOUT`。
- `providerTimeout`：供应商状态长时间无结果或状态查询超时，对应 `AVATAR_PROVIDER_STATUS_TIMEOUT` / `AVATAR_PROVIDER_TIMEOUT`。
- `providerFailure`：供应商明确返回生成失败，对应 `AVATAR_PROVIDER_FAILED`。

默认不自动返还：

- 用户上传照片不合格，例如无宠物、多宠、人宠同框风险、格式错误、文件过大。
- 内容安全拦截或待复审图片。
- 运营手动标记失败 `ADMIN_MARKED_FAILED`。
- 未实际消耗额度的任务。
- 已经返还过的任务。

## 2. 后台能力

- 配置中心新增失败返还开关：
  - 供应商失败自动返还额度。
  - 提交失败返还。
  - 超时返还。
  - 供应商失败返还。
- `GET /admin/ai/avatar-jobs` 返回每个任务的：
  - `quotaConsumed`
  - `quotaRefunded`
  - `quotaRefundedAt`
  - `quotaRefundedBy`
  - `quotaRefundSource`
  - `quotaRefundReason`
- AI 任务页新增“额度”列，展示未扣额度、已扣除、已返还、自动/人工来源和返还原因。
- AI 任务页顶部新增“额度返还”指标和当前自动返还策略摘要。
- 手动返还接口 `POST /admin/ai/avatar-jobs/{jobId}/refund-quota` 会防重复：
  - 未扣额度返回 `409 ADMIN_AVATAR_REFUND_INVALID`。
  - 已返还返回 `409 ADMIN_AVATAR_REFUND_INVALID`。

## 3. 移动端联动

移动端不需要直接读取返还策略。

返还发生后，用户的 `petAvatarDailyUsage` 会被扣回，移动端重新请求 `/ai/usage` 时：

- `daily.petAvatar.count` 恢复。
- `daily.petAvatar.remaining` 恢复。
- 生成页的剩余次数展示随之恢复。

## 4. 审计

自动返还写入：

- `action`: `ai.avatar.auto_refund_quota`
- `targetType`: `avatar_job`
- `adminName`: `system`

人工返还写入：

- `action`: `ai.avatar.refund-quota`
- `targetType`: `avatar_job`
- `adminName`: 当前管理员

## 5. 验收

新增 smoke：

```bash
node scripts/smoke-ai-avatar-refund.cjs
```

覆盖：

- 供应商提交失败后任务进入 `failed`。
- 任务已扣额度但自动返还。
- `/ai/usage` 的 `count` 和 `remaining` 恢复。
- 后台任务列表返回返还字段。
- 后台重复人工返还被 `409` 拦截。
- `/admin/ai/usage` 返回返还策略和返还统计。
- 审计存在 `ai.avatar.auto_refund_quota`。
