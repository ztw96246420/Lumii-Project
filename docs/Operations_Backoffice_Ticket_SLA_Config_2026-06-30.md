# 运营后台工单 SLA 配置说明

日期：2026-06-30

## 1. 目标

客服工单已经支持反馈创建、后台分配、备注、回复、通知用户、用户补充、评分和重开。此前 SLA 时限写死在后端，运营无法根据上线阶段调整处理优先级。

本次落地的是“工单 SLA 配置化”：管理员可以在配置中心调整不同优先级工单的处理时限，配置保存后立即影响后台工单排序、SLA 标记、工作台统计、导出字段和移动端预计响应文案。

2026-07-01 后，本能力已扩展为首响 SLA、解决 SLA、客服负责人枚举和排班。新口径见：[Operations_Backoffice_Ticket_SLA_Roster_2026-07-01.md](Operations_Backoffice_Ticket_SLA_Roster_2026-07-01.md)。

## 2. 配置项

配置路径：

- `support.slaHours`：兼容旧字段，等同解决 SLA。
- `support.firstResponseSlaHours`：首响 SLA。
- `support.resolutionSlaHours`：解决 SLA。
- `support.assignees`：客服负责人和排班。

默认值：

- 首响：urgent 1 小时、high 4 小时、normal 12 小时、low 24 小时。
- 解决：urgent 8 小时、high 24 小时、normal 72 小时、low 168 小时。

后台配置中心会校验：

- 每项必须大于等于 1 小时。
- 必须保持 `urgent <= high <= normal <= low`。
- 后端会再次夹紧范围，避免异常数据进入状态文件。

## 3. 后端影响

### 工单 SLA 计算

`supportTicketSlaInfo(ticket, type)` 从 `currentOpsConfig().support.firstResponseSlaHours` 和 `support.resolutionSlaHours` 读取配置；`support.slaHours` 保留为解决 SLA 兼容字段。

影响接口：

- `GET /admin/tickets`
- `GET /admin/tickets/{ticketId}`
- `GET /support/tickets`
- `GET /support/tickets/{ticketId}`
- `GET /admin/dashboard/summary`
- `GET /admin/exports/tickets.csv`

### 工单排序

后台工单队列仍按以下优先级排序：

1. SLA 超时
2. SLA 临近
3. 新反馈
4. 工单优先级
5. 最近更新时间

配置变更后，超时/临近状态会随下一次读取实时重算。

### 导出字段

`tickets.csv` 新增：

- `SLA小时`
- `当前SLA类型`
- `首响SLA状态`
- `首响SLA小时`
- `首响时间`
- `解决SLA状态`
- `解决SLA小时`
- `负责人名称`
- `负责人排班`

原有 `SLA状态` 保留。

## 4. 后台页面

配置中心新增“客服工单 SLA 与排班”区块：

- 首响 urgent/high/normal/low 小时。
- 解决 urgent/high/normal/low 小时。
- 客服负责人枚举和排班。

配置联动体检新增四项客服工单配置，标注为：

- 后端强制：是
- 移动端消费：是

原因：后端真实使用该配置重算 SLA，移动端会读取工单返回的 `slaHours` 并展示预计响应时间。

## 5. 移动端影响

移动端不需要新增请求。

后端在工单列表和工单详情中返回：

- `slaHours`
- `slaType`
- `slaLabel`
- `slaDueAt`
- `slaState`

移动端“我的反馈”列表和详情页会在未结束工单上展示：

- `预计 X 小时内响应`
- 或 `预计 X 天内响应`

已解决和已关闭工单不展示预计响应。

## 6. 当前边界

已落地：

- SLA 小时配置。
- 首响 SLA 与解决 SLA 分离。
- 负责人枚举。
- 客服排班和值班状态。
- 配置中心表单和校验。
- 工单列表、详情、工作台统计和排序实时读取配置。
- 移动端我的反馈展示预计响应。
- 配置联动体检展示客服工单 SLA。
- CSV 导出 SLA 小时。
- 配置保存、回滚和审计沿用现有配置中心机制。

暂未落地：

- 批量回复审批。
- 客服质量统计。
- SLA 变更影响历史工单的版本快照。
