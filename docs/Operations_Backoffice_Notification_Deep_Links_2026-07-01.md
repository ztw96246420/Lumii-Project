# 运营后台系统通知对象深链

## 1. 背景

通知运营此前只能配置粗粒度 `actionRoute`，例如首页、发现、地图、我的、通知中心、反馈进度。这个能力适合公告和维护提醒，但不适合“提醒用户查看某条小事、某个地点、某个工单或某条疫苗计划”。

本次新增系统通知对象深链，让后台发送的站内系统通知可以直接带移动端可识别的业务对象 ID。

## 2. 后台表单

通知运营页新增：

- `深链类型`
- `对象 ID`

当前支持：

- `post`：宠友圈小事，写入 `postId`
- `place`：地图地点，写入 `placeId`
- `submission`：地点提交，写入 `submissionId`
- `ticket`：客服工单，写入 `ticketId`
- `conversation`：会话，写入 `conversationId`
- `memo`：宠物日历备忘，写入 `memoId`
- `vaccine`：疫苗/驱虫计划，写入 `vaccineId`

发送历史会展示深链目标，历史通知“套用”会回填深链类型和对象 ID。

## 3. 后端校验

`POST /admin/notifications/system` 会在创建草稿、预约和立即发送前校验深链对象：

- 小事必须存在且为 `published`。
- 地点必须存在。
- 地点提交记录必须存在。
- 客服工单必须存在。
- 会话必须存在。
- 备忘必须存在。
- 疫苗/驱虫计划必须存在。

校验失败时返回中文错误，不会保存草稿或发送通知，避免创建点击后必然失效的运营触达。

## 4. 移动端联动

系统通知仍保持：

- `category=system`
- `kind=system`

这样它不会被伪装成点赞、评论、约遛或聊天通知，也不会误占互动消息角标。

移动端点击 `system` 通知时，会优先处理对象深链：

1. `postId`：打开发现页宠友圈，并高亮对应小事。
2. `placeId`：打开地点详情。
3. `submissionId`：打开新增地点审核进度。
4. `ticketId`：打开反馈进度并定位工单。
5. `conversationId`：打开会话。
6. `memoId`：打开宠物日历备忘。
7. `vaccineId`：打开疫苗/驱虫计划并定位计划。
8. 如果没有对象深链，再回落到 `actionRoute`。

真机系统通知响应解析也补齐了 `actionRoute`、`ticketId` 和 `support_reply`，为后续厂商 Push 复用同一套 payload 做准备。

## 5. 尚未覆盖

- 厂商 Push 真实下发。
- 厂商 Push 到达、展示、点击回执。
- 发送审批。
- 更友好的后台对象选择器，例如搜索小事、地点或工单后自动填 ID。

## 6. 验证

新增 smoke：

```bash
node scripts/smoke-notification-deep-links.cjs
```

验证链路：

1. 创建测试用户并读取地图地点。
2. 后台发送带 `deepLinkType=place` 的系统通知。
3. 用户通知中心返回 `placeId`。
4. 后台发送历史返回 `deepLinkType`、`deepLinkId` 和 `placeId`。
5. 使用不存在的地点 ID 发送时返回 400，证明后端校验生效。
