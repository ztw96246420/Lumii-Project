# 运营后台宠物日历修正

日期：2026-07-03

## 背景

宠物日历后台原先只做排查展示，运营能看到体重、疫苗/驱虫和备忘，但不能修正明显错误。这样客服遇到用户误录、AI 自动写入异常、提醒状态错误时，只能让用户自己回移动端处理。

本次补齐低风险修正闭环：后台修的是移动端真实 `/health/*` 数据，不维护独立副本。

## 接口

- `GET /admin/pet-calendar`
- `PATCH /admin/pet-calendar/{recordId}`

`recordId` 由后台列表返回，格式：

- `weight:{phone}:{petId}:{sourceId}`
- `vaccine:{phone}:{petId}:{sourceId}`
- `memo:{phone}:{petId}:{sourceId}`

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
- 每次修正都会给用户写入“宠物日历记录已修正”站内通知。
- 疫苗/驱虫被后台标记完成时，同时复用“疫苗/驱虫计划已完成”通知口径。

## 审计

动作名：`calendar.record.update`

审计内容：

- 管理员。
- 手机号。
- 宠物 ID 和宠物名。
- 记录类型。
- 变更字段。
- before / after。
- 原因。

原因必填。没有字段变化时不写审计、不保存。

## 后台页面

宠物日历列表新增“修正记录”行内操作。

页面继续展示：

- 类型、状态、来源、日期区间、搜索筛选。
- 日历记录、体重记录、疫苗/驱虫、备忘、提醒开启、AI 写入 KPI。
- 来源标识：用户记录、宠友圈同步、AI 对话。

## 暂不开放

- 后台新增日历记录。
- 删除、恢复、批量处理日历记录。
- 通过备忘反向修改源宠友圈动态。
- 审批流或双人复核。

这些属于更高风险操作，后续需要更细权限和恢复策略。

## 验证

新增烟测：

```bash
node scripts/smoke-admin-pet-calendar-edit.cjs
```

覆盖：

- 后台修正体重、疫苗/驱虫、备忘。
- 移动端 `/health/*` 接口读到新值。
- 疫苗完成后提醒关闭。
- 用户收到站内通知。
- 审计日志写入 `calendar.record.update`。
