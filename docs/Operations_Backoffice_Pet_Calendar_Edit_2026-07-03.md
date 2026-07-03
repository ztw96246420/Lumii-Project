# 运营后台宠物日历新增与修正

日期：2026-07-03

## 背景

宠物日历后台原先只做排查展示，运营能看到体重、疫苗/驱虫和备忘，但不能新增或修正明显记录。这样客服遇到用户误录、AI 自动写入异常、提醒状态错误，或需要代用户补一条低风险记录时，只能让用户自己回移动端处理。

本次补齐低风险新增与修正闭环：后台写入和修正的都是移动端真实 `/health/*` 数据，不维护独立副本。

## 接口

- `GET /admin/pet-calendar`
- `POST /admin/pet-calendar`
- `POST /admin/pet-calendar/batch`
- `PATCH /admin/pet-calendar/{recordId}`
- `POST /admin/pet-calendar/{recordId}/delete`
- `POST /admin/pet-calendar/{recordId}/restore`

`recordId` 由后台列表返回，格式：

- `weight:{phone}:{petId}:{sourceId}`
- `vaccine:{phone}:{petId}:{sourceId}`
- `memo:{phone}:{petId}:{sourceId}`

新增记录请求：

```json
{
  "phone": "13500000000",
  "petId": "pet-xxx",
  "type": "weight | vaccine | memo",
  "record": {},
  "reason": "运营新增原因"
}
```

新增字段沿用移动端同一套校验：

- 体重：`kg`、`recordedAt`、`note`。
- 疫苗/驱虫：`name`、`dueAt`、`status`、`reminderEnabled`。
- 备忘：`title`、`content`、`reminderAt`、`reminderEnabled`、`repeat`。

## 可修正字段

体重：

- `kg`
- `recordedAt`
- `note`

疫苗/驱虫：

- `name`
- `dueAt`
- `status`：`due` / `overdue` / `done`
- `reminderEnabled`

备忘：

- `title`
- `content`
- `reminderAt`
- `reminderEnabled`
- `repeat`：`none` / `monthly` / `quarterly` / `yearly`

## 移动端联动

- 修正体重后，移动端 `/health/weights` 返回新记录值；宠物档案中的最新体重同步更新。
- 修正疫苗/驱虫后，移动端 `/health/vaccines` 返回新计划；如果状态改为 `done`，提醒会关闭，`/health/vaccine-reminders` 不再返回该记录 ID。
- 修正备忘后，移动端 `/health/memos` 返回新标题、内容和提醒配置。
- 后台新增体重、疫苗/驱虫或备忘后，移动端对应 `/health/*` 接口下一次刷新即可读到新记录；后台来源显示为“运营新增”。
- 后台新增疫苗/驱虫并开启提醒时，移动端 `/health/vaccine-reminders` 会返回该记录 ID；如果记录状态是 `done`，提醒会强制关闭。
- 后台删除记录是软删除：记录会从移动端对应 `/health/*` 列表移除，但后台保留快照、删除原因和恢复入口。
- 后台恢复记录会把快照写回原 `/health/*` store；体重会重算宠物档案最新体重，疫苗/驱虫会按删除前状态恢复提醒开关。
- 每次修正都会给用户写入“宠物日历记录已修正”站内通知。
- 每次新增都会给用户写入“宠物日历记录已新增”站内通知。
- 每次删除都会给用户写入“宠物日历记录已删除”站内通知。
- 每次恢复都会给用户写入“宠物日历记录已恢复”站内通知。
- 疫苗/驱虫被后台标记完成时，同时复用“疫苗/驱虫计划已完成”通知口径。

## 审计

动作名：

- `calendar.record.create`
- `calendar.record.delete`
- `calendar.record.restore`
- `calendar.record.batch.delete`
- `calendar.record.batch.restore`
- `calendar.record.update`

审计内容：

- 管理员。
- 手机号。
- 宠物 ID 和宠物名。
- 记录类型。
- 变更字段，新增记录时为空。
- before / after。
- 原因。

原因必填。修正时没有字段变化不写审计、不保存。

## 后台页面

宠物日历列表新增“新增记录”全局操作，以及“修正、删除、恢复”行内操作。

页面继续展示：

- 类型、状态、来源、日期区间、搜索筛选。
- 记录状态筛选：有效记录、已删除、全部。
- 日历记录、体重记录、疫苗/驱虫、备忘、提醒开启、AI 写入 KPI。
- 来源标识：用户记录、运营新增、宠友圈同步、AI 对话。
- 批量处理：支持最多 50 条记录批量删除或批量恢复；批量动作额外写入汇总审计，单条仍逐条写审计和通知。

## 暂不开放

- 通过备忘反向修改源宠友圈动态。
- 审批流或双人复核。

双人复核属于更高风险治理能力，后续需要配合多管理员权限再开放。

## 验证

新增烟测：

```bash
node scripts/smoke-admin-pet-calendar-edit.cjs
```

覆盖：

- 后台新增、修正、删除、恢复体重、疫苗/驱虫、备忘。
- 移动端 `/health/*` 接口读到新值。
- 删除后移动端不再读到记录，恢复后重新读到记录。
- 疫苗完成后提醒关闭；后台新增或恢复疫苗开启提醒后，移动端提醒列表可见。
- 用户收到站内通知。
- 审计日志写入 `calendar.record.create`、`calendar.record.update`、`calendar.record.delete`、`calendar.record.restore`、`calendar.record.batch.delete` 和 `calendar.record.batch.restore`。
