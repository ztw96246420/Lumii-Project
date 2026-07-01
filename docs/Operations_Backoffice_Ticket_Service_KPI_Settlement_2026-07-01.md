# 工单周/月服务复盘与结算预览说明

日期：2026-07-01

## 目标

把工单中心从“能看客服质量”推进到“能按运营周期复盘服务质量，并给外包客服结算一个可调的预览口径”。

当前能力只做后台预览，不生成付款单，不代表最终财务结算凭证。

## 后台入口

后台：工单中心。

新增区块：

- 周/月服务复盘。
- 近 7 天结算预览。
- 近 30 天结算预览。

配置入口：

- 配置中心 -> 客服工单 SLA 与排班 -> 客服结算预览规则。

## 后端接口

`GET /admin/tickets` 新增返回：

- `serviceReport.periods`：近 7 天和近 30 天的服务复盘。
- `serviceReport.periods[].quality`：周期内客服质量统计。
- `serviceReport.periods[].settlement`：周期内按负责人聚合的结算预览。
- `serviceReport.settlementPolicy`：当前结算预览配置。

## 周期口径

当前使用：

- `week`：近 7 天。
- `month`：近 30 天。

周期筛选看工单最近活动时间，包括：

- 工单创建时间。
- 工单更新时间。
- 工单关闭时间。
- 用户评分时间。
- 用户/客服回复时间。

这样用户重开、补充回复、评分等晚于创建时间的动作，也能进入当前运营复盘。

## 结算预览配置

`support.settlement`：

- `previewEnabled`：是否启用结算预览展示。
- `currency`：币种，当前后台固定保存为 `CNY`。
- `resolvedTicketCents`：每个已解决工单的基础金额。
- `firstResponseBonusCents`：首响达标奖励。
- `satisfactionBonusCents`：4-5 分评价奖励。
- `lowRatingPenaltyCents`：1-2 分低分扣减。
- `reopenPenaltyCents`：用户重开扣减。
- `breachPenaltyCents`：首响或解决 SLA 未达标扣减。

后台配置页以“元”为单位展示和填写，保存到后端时转换为“分”。

## 负责人聚合

按工单当前 `assignee` 聚合：

- 工单数。
- 已解决数。
- 首响达标数。
- 好评数。
- 低分数。
- 重开次数。
- SLA 扣减项。
- 已质检数。
- 质检需跟进数。

历史未知负责人保留为历史负责人；未分配工单进入“未分配”分组。

## 计算公式

单个负责人：

```text
基础金额 = 已解决数 * resolvedTicketCents
奖励金额 = 首响达标数 * firstResponseBonusCents + 好评数 * satisfactionBonusCents
扣减金额 = 低分数 * lowRatingPenaltyCents + 重开次数 * reopenPenaltyCents + SLA扣减项 * breachPenaltyCents
预估金额 = max(0, 基础金额 + 奖励金额 - 扣减金额)
```

当前不会把预估金额写入新的财务记录，也不会触发付款、审批或通知。

## 移动端联动

移动端不新增页面，也不读取结算规则。

移动端真实行为会反向进入后台口径：

- 用户提交反馈创建工单。
- 用户查看客服回复。
- 用户评分进入满意度。
- 用户重开进入重开扣减。
- 用户补充回复影响工单最近活动时间。

## 仍需业务确认

- 生产期是否用自然周、自然月、排班周期，还是外包账期。
- 外包客服是否需要区分一线客服、安全客服、技术处理人。
- 是否需要结算锁账、审批、导出、发票、税费和调整项。
- 是否允许客服对低分/扣减申诉。
- 批量回复生产期是否必须双人审批，以及是否需要发送撤回。

## 验证

```bash
node scripts/smoke-ticket-sla-roster.cjs
```

覆盖：

- 结算配置保存和归一化。
- `GET /admin/tickets` 返回 `serviceReport`。
- 已解决、已评分、首响达标工单产生正向结算预览。
- 批量回复仍走原有审批和移动端通知链路。
