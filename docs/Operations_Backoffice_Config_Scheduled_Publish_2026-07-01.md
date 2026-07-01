# 配置预约发布治理说明

日期：2026-07-01

## 1. 目标

配置中心已经可以直接影响移动端 `/app/config`，包括 AI provider、灵伴形象 prompt、DeepSeek system prompt、内容安全开关、通知频控、公告和维护模式。预约发布用于让运营把配置变更安排到未来时间生效，避免夜间维护、版本更新或 prompt 调整必须人工守点发布。

## 2. 当前已支持

- 当前表单配置预约发布。
- 配置草稿预约发布。
- 配置版本预约回滚。
- 预约取消。
- 到点自动发布。
- 发布前基线校验：如果预约创建后当前配置已经变化，预约任务会失败，不会覆盖新配置。
- 审计日志和版本历史。

## 3. 后端状态

新增 `opsConfigSchedules`，每条预约包含：

- `action`：`publish` / `draft_publish` / `rollback`。
- `status`：`scheduled` / `published` / `canceled` / `failed`。
- `scheduledAt`：预约发布时间。
- `baseConfig`：创建预约时的当前配置基线。
- `config`：预约到点后要发布的配置快照。
- `changeSummary` / `riskChanges`：变更摘要和风险项。
- `sourceDraftId` / `sourceRevisionId`：草稿或回滚来源。
- `reason`、创建人、发布时间、取消原因、失败原因、关联版本号。

## 4. 接口

- `GET /admin/config/schedules?status=&limit=`：查看配置预约。
- `POST /admin/config/schedules`：创建预约。
- `POST /admin/config/schedules/{scheduleId}/cancel`：取消预约。

创建预约请求示例：

```json
{
  "action": "publish",
  "scheduledAt": "2026-07-01T22:30:00.000Z",
  "reason": "夜间发布灵伴形象 prompt",
  "ai": {
    "avatar": {
      "gptImage2": {
        "promptTemplate": "..."
      }
    }
  }
}
```

## 5. 生效规则

- 预约时间必须晚于当前时间，且不超过 180 天。
- 强制配置审批开启时，当前版本不允许直接创建预约；需要先走审批链路，后续可再扩展“审批通过后预约生效”。
- 命中 P0/P1 高风险配置时，创建预约也必须输入 `确认发布高风险配置`。
- 预约到点后会生成 `scheduled_publish`、`scheduled_draft_publish` 或 `scheduled_rollback` 版本。
- 预约创建后如果当前配置已经被其他发布、审批、回滚或预约改变，预约会标记为 `failed`，失败原因是“当前配置已变化，请重新创建预约发布”。

## 6. 后台页面

配置中心新增：

- 治理指标“预约发布”。
- 当前表单底部的预约发布时间和“预约发布”按钮。
- 草稿行内“预约发布”。
- 版本历史行内“预约回滚”。
- “配置预约发布”列表，展示预约时间、状态、风险、变更摘要和取消入口。

## 7. 审计

以下动作写入 `adminAuditLogs`：

- `config.schedule.create`
- `config.schedule.publish`
- `config.schedule.cancel`
- `config.schedule.fail`

## 8. 验收

回归脚本：

```bash
node scripts/smoke-config-scheduled-publish.cjs
```

覆盖内容：

- 创建预约后 `/app/config` 不会立即变化。
- 取消预约后到点不生效。
- 预约到点后 `/app/config` 生效并生成版本。
- 预约创建后配置基线变化时，预约失败且不覆盖新配置。
- 审计日志记录创建、发布、取消和失败。

## 9. 后续增强

- 强制审批开启时支持“审批通过后预约生效”。
- 预约发布前通知管理员。
- 预约失败通知管理员。
- 灰度配置和 A/B 实验分流。
