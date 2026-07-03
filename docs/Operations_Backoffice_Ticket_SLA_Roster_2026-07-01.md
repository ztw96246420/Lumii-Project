# 工单 SLA 与客服排班说明

日期：2026-07-01

## 目标

把工单中心从“能回复用户”推进到“能按客服负责人和值班窗口运营”。

本次覆盖：

- 客服负责人枚举。
- 客服排班和值班状态。
- 首响 SLA 与解决 SLA 拆分。
- 后台分配强制使用负责人枚举。
- 移动端只展示预计响应/处理时间，不暴露客服排班。

客服质量统计、排班冲突检测和批量处理复盘见：[Operations_Backoffice_Ticket_Quality_Review_2026-07-01.md](Operations_Backoffice_Ticket_Quality_Review_2026-07-01.md)。

## 配置入口

后台：配置中心 -> 客服工单 SLA 与排班。

配置项：

- `support.firstResponseSlaHours`：urgent/high/normal/low 首响小时数。
- `support.resolutionSlaHours`：urgent/high/normal/low 解决小时数。
- `support.slaHours`：兼容旧字段，等同解决 SLA。
- `support.assignees`：客服负责人、角色、排班星期、开始时间、结束时间、启用状态。

负责人配置格式：

```text
admin|Admin|客服|1,2,3,4,5,6,0|09:00|22:00|true
```

## 后台联动

- `GET /admin/tickets` 返回 `assignees`、`slaPolicy`、首响 SLA、解决 SLA、负责人名称、负责人排班和值班状态。
- `POST /admin/tickets/{ticketId}/assign` 会校验负责人必须存在于配置枚举且未停用。
- 批量分配同样校验负责人枚举。
- 工单列表统计未分配、首响超时、解决超时、离班负责人。
- 工单 CSV 导出包含首响/解决 SLA 和负责人排班字段。

## 移动端联动

- `/app/config` 只下发 `firstResponseSlaHours`、`resolutionSlaHours` 和兼容 `slaHours`。
- `/app/config` 不下发 `support.assignees`，避免用户端暴露后台排班。
- `/support/tickets` 和 `/support/tickets/{ticketId}` 返回当前用户可理解的下一条 SLA：
  - `slaType=first_response`：显示预计响应时间。
  - `slaType=resolution`：显示预计处理完成时间。
  - 工单已 resolved/closed 后不再显示预计时间。
- 移动端优先使用后端返回的 `slaDueAt` 展示精确截止时间，例如“预计今天 18:00前响应”或“预计明天 12:00前处理完成”；若旧数据缺少 `slaDueAt`，再回退为 `slaHours` 的相对文案。
- 若下一条 SLA 已超时，移动端展示“预计响应/处理完成已超时 · 原定 xx 前”，方便用户理解当前反馈进度异常，而不暴露客服负责人或排班。

## 验证

```bash
node scripts/smoke-ticket-sla-roster.cjs
```

覆盖：

- 配置发布后 App 只看到 SLA，看不到负责人排班。
- 用户反馈自动生成工单。
- 用户端工单首响 SLA 口径正确。
- 后台工单返回负责人枚举和 SLA 策略。
- 非枚举负责人无法分配。
- 分配后仍保留首响 SLA；客服真实回复用户后首响 SLA 完成，当前 SLA 切到解决 SLA。
- 客服回复并解决后，移动端工单状态同步。
- 移动端 typecheck 覆盖 `slaDueAt` 精确截止文案的字段消费。
- 配置、分配、回复均写入审计。
