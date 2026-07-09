# 配置发布审批治理说明

版本：2026-07-01

## 1. 目标

配置中心会直接影响移动端 `/app/config`，包括维护模式、强制更新、功能开关、公告、启动提示、AI 额度、附近半径、内容安全和通知治理。本轮新增配置发布审批，目标是把“保存即生效”升级为“可强制审批后生效”。

当前已支持高风险审批人/申请人分离和 `highRiskApproval.requiredApprovals` 最少会签人数；生产期建议配置为 2 或以上，并补审批值守通知。

## 2. 配置项

配置中心新增“配置发布审批”：

- `configApproval.requireApproval`：是否强制配置发布审批。
- `configApproval.approvalExpiresHours`：审批申请有效期，允许 1-168 小时。

开启强制审批后，以下动作不会直接改写 `/app/config`：

- `PATCH /admin/config`
- `POST /admin/config/drafts/{draftId}/publish`
- `POST /admin/config/revisions/{revisionId}/rollback`

这些接口会返回 `ADMIN_CONFIG_APPROVAL_REQUIRED`，必须先提交配置审批并审批通过。

## 3. 后台页面

配置中心新增：

- 发布审批指标：展示强制/可选、待审批数和有效期。
- 配置审批列表：展示发布、草稿发布、回滚的审批单。
- 变更摘要：展示本次配置从什么值变成什么值。
- 风险详情：展示维护、强更、核心功能开关、内容安全等高风险项。
- 审批并发布：审批通过后才会写入 `opsConfig`、生成版本，并影响移动端下次 `/app/config` 拉取。

当强制审批开启时：

- 底部主按钮从“立即发布”切换为“提交发布审批”。
- 草稿操作从“发布草稿”切换为“提交审批”。
- 版本历史操作从“回滚到此版本”切换为“提交回滚审批”。

## 4. 接口

- `GET /admin/config/approvals?status=&limit=`：配置审批列表。
- `POST /admin/config/approvals`：提交配置发布审批。
- `POST /admin/config/approvals/{approvalId}/approve`：审批并发布。
- `POST /admin/config/approvals/{approvalId}/cancel`：取消审批。

`POST /admin/config/approvals` 支持三类动作：

- `action=publish`：提交当前表单配置审批。
- `action=draft_publish`：提交草稿发布审批，需要 `draftId`。
- `action=rollback`：提交版本回滚审批，需要 `revisionId`。

配置预约发布已作为独立治理能力接入，详见 [Operations_Backoffice_Config_Scheduled_Publish_2026-07-01.md](Operations_Backoffice_Config_Scheduled_Publish_2026-07-01.md)。当前版本在 `configApproval.requireApproval=true` 时不允许绕过审批直接创建预约；后续可以扩展为“先审批，审批通过后按预约时间生效”。

## 5. 校验规则

- 草稿保存不影响移动端，不需要审批。
- 审批单会绑定配置快照、申请时的基线配置、变更摘要、风险项和申请原因。
- 审批通过前不会更新 `/app/config`。
- 审批通过时会校验当前配置是否仍等于申请时的基线配置；如果期间配置已被其他操作改变，会返回 `ADMIN_CONFIG_APPROVAL_STALE`，要求重新提交。
- 审批通过时会生成新的配置版本，版本 action 为 `approval_publish`、`approval_draft_publish` 或 `approval_rollback`。
- 命中 P0/P1 高风险配置时，提交审批前仍需要输入 `确认发布高风险配置`。

## 6. 审计

以下动作都会写入 `adminAuditLogs`：

- `config.approval.create`
- `config.approval.approve`
- `config.approval.cancel`

审批通过后还会生成配置版本，移动端下一次读取 `/app/config` 即按新配置生效。

## 7. 验收

回归脚本：

```bash
node scripts/smoke-config-approval.cjs
```

覆盖内容：

- 开启强制配置发布审批。
- 直接发布被拦截。
- 提交发布审批。
- 审批前 `/app/config` 不变化。
- 审批通过后 `/app/config` 生效。
- 草稿发布审批。
- 回滚审批。
- 审计日志记录审批创建和审批通过。

## 8. 后续增强

- 生产期启用审批人/申请人分离和最少 2 人会签。
- 审批值守通知和审批 owner。
- 配置预约发布已接入；后续可补审批通过后的预约生效和预约通知。
- 灰度配置和 A/B 实验分流。
- 配置审批通知和审批超时提醒。
