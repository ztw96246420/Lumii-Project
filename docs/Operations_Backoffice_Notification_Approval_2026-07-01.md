# 运营后台系统通知发送审批

## 1. 背景

通知运营已经具备系统通知、草稿、预约、撤回、模板、人群包、对象深链和频控。为了降低运营误发风险，本次新增单 admin 可用的发送审批保护。

当前已支持高风险审批人/申请人分离和 `highRiskApproval.requiredApprovals` 最少会签人数；同一个管理员是否可自审由配置中心控制。生产期建议配置为 2 或以上，并补审批值守通知。

## 2. 后台页面

通知运营页新增：

- 顶部 `审批保护` 指标：显示当前配置是否强制审批。
- 顶部 `待处理` 指标：合并草稿、待审批和预约。
- 发送区 `提交审批` 按钮。
- 开启强制审批后，主按钮变为 `提交审批`，预约按钮变为 `预约审批`。
- 通知历史卡片新增 `待审批` 状态、提交审批时间、审批时间、审批说明和 `审批发送` 操作。

配置中心 `系统通知治理` 新增：

- `强制系统通知发送审批`

开启后，后端会拒绝直接 `send` 和直接 `scheduled`，要求先走 `approval`。

## 3. 后端状态机

新增创建模式：

- `mode=approval`

新增状态：

- `pending_approval`

待审批通知只写入 `state.systemNotifications`，不会写入任何用户的 `state.notifications[phone]`。

审批通过接口：

- `POST /admin/notifications/{id}/approve`

审批通过后：

- 普通审批：调用现有发送逻辑，写入用户 App 通知中心。
- 预约审批：如果预约时间仍在未来，转为 `scheduled`；到点后由现有定时扫描发送。
- 预约时间已过：审批通过后直接发送，避免通知卡死。

## 4. 审计

新增审计 action：

- `notification.system.approval.request`
- `notification.system.approve_send`
- `notification.system.approve_schedule`
- `notification.system.approve_failed`

继续复用：

- `notification.system.send`
- `notification.system.schedule`
- `notification.system.failed`
- `notification.system.cancel`
- `notification.system.revoke`

## 5. 配置联动

`notifications.requireApproval` 已加入配置中心联动体检：

- 后端强制：是。
- 移动端消费：间接消费。
- 用户影响：只有审批通过的系统通知才会进入 App 通知中心。

该配置也进入高风险配置确认，开启或关闭时需要确认文案并写审计。

## 6. 尚未覆盖

- 审批队列分配 owner。
- 站外/站内管理员审批通知。
- 审批驳回并回填修改意见。
- 厂商 Push 真实下发、送达回执和 token 失效原因。

## 7. 验证

新增 smoke：

```bash
node scripts/smoke-notification-approval.cjs
```

验证链路：

1. 管理员提交 `mode=approval` 系统通知。
2. 用户通知中心确认没有收到待审批通知。
3. 管理员审批通过。
4. 用户通知中心收到该批次通知。
5. 配置中心开启 `notifications.requireApproval`。
6. 直接发送被后端拦截。
7. 上线台账不再把发送审批列为未完成。
