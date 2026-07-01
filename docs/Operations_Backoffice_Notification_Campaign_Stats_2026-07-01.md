# 运营后台通知批次效果统计

## 1. 背景

通知运营此前已经支持后台创建系统通知、草稿、待审批、预约发送、撤回和频控。原来的 `deliveredCount` 只代表“写入 App 站内通知中心成功”，不能回答运营更关心的两个问题：

- 用户是否已读。
- 用户是否点击打开。

## 2. 本次实现

系统通知批次现在会从两类真实数据回算效果：

- 用户通知记录：`state.notifications[phone]` 中带 `campaignId` 的系统通知。
- 移动端埋点：`notification.open` 事件中的 `campaignId` 和 `notificationId`。

后台 `/admin/notifications` 每个批次新增：

- `readCount`
- `unreadCount`
- `readRate`
- `openCount`
- `uniqueOpenCount`
- `openRate`
- `latestReadAt`
- `latestOpenAt`

顶部汇总新增：

- `reads`
- `readRate`
- `opens`
- `openRate`

## 3. 移动端联动

移动端打开通知时继续上报 `notification.open`，并补充：

- `campaignId`
- `notificationId`
- `category`
- `kind`
- `route`

用户标记通知已读时，后端会写入 `readAt`。现有移动端 UI 不需要调整。

## 4. 数据口径

- `deliveredCount`：系统通知批次写入用户站内通知中心的数量。
- `pending_approval`：提交审批但尚未触达用户的系统通知；审批通过后才会转为 `sent` 或 `scheduled`。
- `readCount`：当前仍在用户站内通知中的该批次通知，且 `read=true` 的数量。
- `uniqueOpenCount`：按 `notificationId` 去重后的点击人数/通知数。
- `openCount`：移动端点击打开事件总次数，重复点击会累计。
- `readRate`：`readCount / deliveredCount`。
- `openRate`：`uniqueOpenCount / deliveredCount`。

注意：撤回已发送通知会从用户站内通知中心删除对应 campaign，因此 `readCount` 会反映当前站内状态；`deliveredCount` 仍保留原始批次写入数量。

## 5. 尚未覆盖

- 厂商 Push 的真实下发、到达、展示和点击回执。
- Push token 失效原因统计。
- 多管理员双人审批；当前单 admin 发送审批已接入。

## 6. 验证

新增 smoke：

```bash
node scripts/smoke-notification-campaign-stats.cjs
```

验证链路：

1. 管理员发送系统通知。
2. 用户读取通知列表。
3. 用户标记该通知已读。
4. 移动端上报 `notification.open`。
5. 后台通知运营和数据看板返回已读、点击和打开率。
