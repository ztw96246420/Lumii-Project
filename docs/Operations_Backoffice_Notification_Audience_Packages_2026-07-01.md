# 运营后台通知人群包

## 1. 背景

通知运营原先只有三种目标范围：全部用户、今日活跃用户、指定手机号。指定手机号适合一次性补发，但不适合反复使用的灰度测试、补偿回访和小范围运营触达。

本次新增“通知人群包”，用于把一组手机号保存成可复用目标。

## 2. 后端能力

新增状态字段：

- `notificationAudiencePackages`

人群包字段：

- `id`
- `name`
- `description`
- `phones`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `lastUsedAt`
- `lastUsedCount`

新增接口：

- `POST /admin/notifications/audience-packages`
- `POST /admin/notifications/audience-packages/{id}/delete`

`POST /admin/notifications/system` 新增目标：

- `target=audience_package`
- `audiencePackageId={id}`

## 3. 触达口径

人群包保存的是规范化后的手机号集合。保存时只要求手机号格式有效，不要求手机号已经注册。

真正发送时，后端会按当前 `state.users` 过滤可触达用户：

- `phoneCount`：人群包手机号总数。
- `reachableCount`：当前已注册、可写入站内通知的手机号数量。
- `missingCount`：人群包里尚未注册或当前不存在的手机号数量。

立即发送和预约发送都会重新计算人群包目标。预约通知不会把创建时的目标用户固定死，避免预约期间用户状态变化造成旧数据触达。

## 4. 后台页面

通知运营页新增：

- 顶部指标：人群包数量。
- 发送表单：目标范围新增“通知人群包”，并可选择已保存人群包。
- 灰度人群包维护区：可保存名称、备注、手机号清单。
- 人群包列表：展示可触达数、手机号总数、未注册数、样本手机号、上次送达数和上次使用时间。
- 发送历史：展示对应人群包名称，历史通知可继续套用。

## 5. 审计

新增审计 action：

- `notification.audience_package.create`
- `notification.audience_package.update`
- `notification.audience_package.delete`

系统通知发送仍记录：

- `notification.system.send`
- `notification.system.schedule`
- `notification.system.draft`
- `notification.system.failed`
- `notification.system.cancel`
- `notification.system.revoke`

## 6. 尚未覆盖

- 发送审批。
- 人群包导入导出。
- 按行为标签、活跃度、宠物类型自动圈选动态人群。
- 厂商 Push 真实下发和回执。

## 7. 验证

新增 smoke：

```bash
node scripts/smoke-notification-audience-packages.cjs
```

验证链路：

1. 创建两个用户。
2. 后台保存一个包含两个手机号的人群包。
3. 后台用 `target=audience_package` 发送系统通知。
4. 两个用户通知中心都能读到该 campaign。
5. 后台通知运营返回人群包、发送历史和送达统计。
