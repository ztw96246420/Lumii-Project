# 工单批量回复审批与质检 KPI 说明

日期：2026-07-01

## 目标

把工单中心从“能复盘质量”推进到“能受控批量触达用户”。

本次新增：

- 批量回复申请。
- 批量回复审批发送。
- 批量回复取消。
- 客服 KPI 目标配置。
- 质检待看队列。
- 周/月服务复盘与结算预览。

## 后台入口

后台：工单中心。

新增区块：

- 质检待看。
- 批量回复审批。

配置入口：

- 配置中心 -> 客服工单 SLA 与排班 -> 质检与批量回复治理。

## 后端接口

- `POST /admin/tickets/batch-replies`：提交批量回复申请。
- `POST /admin/tickets/batch-replies/{approvalId}/approve`：审批并发送批量回复。
- `POST /admin/tickets/batch-replies/{approvalId}/cancel`：取消待审批批量回复。
- `POST /admin/tickets/quality-reviews/{ticketId}`：标记质检结果。
- `GET /admin/tickets`：返回 `qualityPolicy`、`qualityKpi`、`qualityReview`、`batchReplyApprovals`、`serviceReport`。

## 配置项

`support.batchReply`：

- `enabled`：是否允许批量回复申请。
- `requireApproval`：是否必须审批后发送。
- `maxTickets`：单次批量回复最多工单数。

`support.qualityTargets`：

- `firstResponseSlaRate`：首响达标目标。
- `resolutionSlaRate`：解决达标目标。
- `avgRating`：满意度目标。
- `reopenRateMax`：重开率红线。
- `lowRatingMax`：低分数量红线。

`support.qualityReview`：

- `enabled`：是否开启质检队列。
- `lowRatingThreshold`：低分进入质检的评分阈值。
- `reopenThreshold`：重开进入质检的次数阈值。
- 首响 SLA 未达标、解决 SLA 未达标、已结束但无客服首响默认进入质检。

`support.settlement`：

- `previewEnabled`：是否启用结算预览。
- `resolvedTicketCents`：每个已解决工单基础金额。
- `firstResponseBonusCents`：首响达标奖励。
- `satisfactionBonusCents`：4-5 分评价奖励。
- `lowRatingPenaltyCents`：低分扣减。
- `reopenPenaltyCents`：用户重开扣减。
- `breachPenaltyCents`：首响或解决 SLA 未达标扣减。

## 触达规则

批量回复不会直接触达用户。

流程：

1. 运营在工单队列勾选工单。
2. 填写批量回复内容。
3. 提交批量回复申请。
4. 审批通过后，后端逐条调用现有单工单回复逻辑。
5. 若勾选通知用户，会生成移动端 `support_reply` 通知。

因此移动端不需要新增页面。用户看到的是普通客服回复和现有通知中心提醒。

## 审计

会写入：

- `ticket.batch_reply.create`
- `ticket.batch_reply.approve`
- `ticket.batch_reply.cancel`
- `ticket.batch.update`
- 每条成功发送的工单仍写入 `ticket.reply.create`

## 仍需澄清

- 生产期是否启用审批人/申请人分离，以及最少会签人数配置为 2 还是 3。
- 批量回复是否需要发送前预览用户名单和脱敏信息。
- 批量回复发送后是否需要撤回能力。
- 周/月 KPI 生产期是否按自然周期、排班周期，还是外包结算周期。
- 外包客服真实付款是否需要锁账、审批、导出、税费和调整项。

## 验证

```bash
node scripts/smoke-ticket-sla-roster.cjs
```

覆盖：

- 配置中心批量回复和 KPI 配置。
- 提交批量回复申请。
- 审批通过后移动端工单详情出现客服回复。
- 审批通过后移动端通知中心出现 `support_reply`。
- 批量回复创建和审批写入审计日志。
- 服务复盘返回周/月 KPI 和结算预览。
