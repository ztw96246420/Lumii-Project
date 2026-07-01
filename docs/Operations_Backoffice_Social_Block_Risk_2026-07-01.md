# 关系拉黑原因与风险标签说明

版本：2026-07-01

## 1. 目标

把 App 内的拉黑行为沉淀为可排查、可统计、可预警的运营信号：

- 用户主动拉黑后，后端保存拉黑双方、原因枚举和补充说明。
- 后台关系消息页能看到拉黑记录、原因统计和导出字段。
- 用户管理能看到一个账号被多少次、多少个不同用户拉黑。
- 当一个账号被 3 个不同用户拉黑时，自动打上 `被频繁拉黑` 风险标签。

该机制是运营排查信号，不是自动处罚策略。

## 2. 移动端与接口

移动端接口：

- `POST /social/blocks`
- `GET /social/blocks`
- `DELETE /social/blocks/{ownerId}`

`POST /social/blocks` 支持字段：

- `ownerId`：被拉黑对象，例如 `user-13531850966`。
- `reasonCode`：拉黑原因枚举。
- `reason`：可选补充说明，后端最多保留 120 字。

当前原因枚举：

- `unspecified`：未填写原因。
- `harassment`：骚扰或不适互动。
- `spam`：广告或刷屏。
- `unsafe`：不安全或疑似违规。
- `inappropriate`：内容不适合。
- `no_interest`：不想再遇见。
- `other`：其他原因。

当前 App 宠友圈卡片主动拉黑默认传：

- `reasonCode=no_interest`
- `reason=用户在宠友圈卡片主动拉黑`

黑名单列表会返回并展示 `reasonCode`、`reasonLabel`、`reasonDetail`，方便用户知道自己当时为什么拉黑。

## 3. 后台展示

### 用户管理

`GET /admin/users` 和 `GET /admin/users/{phone}` 返回 `socialBlockStats`：

- `blockedByCount`：被拉黑总次数。
- `uniqueBlockerCount`：不同拉黑用户数。
- `blockingCount`：该用户主动拉黑别人次数。
- `topReasonLabel`：最高频被拉黑原因。
- `reasonRows`：按原因聚合的被拉黑统计。
- `riskThreshold`：当前自动风险标签阈值，默认 3。

用户列表的“运营标记”列会展示：

- 风险标签。
- 被拉黑次数 / 不同拉黑用户数。
- 最高频拉黑原因。
- 运营备注摘要。

### 关系消息

`GET /admin/social-relations` 新增 `kind=block` 记录：

- 类型：拉黑。
- 发起人：拉黑者。
- 接收人：被拉黑者。
- 状态：已拉黑。
- 摘要：原因 + 补充说明。
- 风险列：已拉黑、通知数、消息数和拉黑原因。

页面右侧展示“拉黑原因统计”，用于判断拉黑是否集中在骚扰、广告、不安全等问题。

CSV `social_relations` 导出新增：

- `拉黑原因`
- `拉黑原因补充`

## 4. 自动风险标签

阈值：

- 一个账号被 3 个不同用户拉黑。

触发后：

- 后端给该账号追加 `frequently_blocked`。
- 后台显示标签为“被频繁拉黑”。
- 写入审计日志 `user.risk_tags.auto_blocked`。

不会自动执行：

- 禁言。
- 冻结。
- 封禁。
- 内容隐藏。
- 强制人工复核。

运营应结合举报、聊天消息举报、内容安全任务、用户时间线和历史处罚再决定是否处理。

## 5. 审计与测试

自动打标签会写入：

- action：`user.risk_tags.auto_blocked`
- targetType：`user`
- targetId：目标手机号
- before/after：风险标签和拉黑统计快照

回归脚本：

- `node scripts/smoke-social-block-risk.cjs`

覆盖链路：

- 3 个不同用户拉黑同一账号。
- 拉黑原因入库。
- 黑名单列表返回原因。
- 后台关系消息出现拉黑行和原因统计。
- 用户管理出现 `被频繁拉黑` 风险标签。
- 用户时间线出现拉黑关系。
- 自动风险标签写入审计日志。

## 6. 当前限制

- 移动端暂未提供用户选择拉黑原因的弹窗，当前只有场景默认原因；后续可以在拉黑确认弹窗中加入原因选择。
- `被频繁拉黑` 标签不会因为用户解除拉黑而自动移除，避免风险痕迹被短期关系波动抹掉；需要运营在用户详情手动调整。
- 阈值当前写死为 3，后续如需要可迁移到配置中心。
