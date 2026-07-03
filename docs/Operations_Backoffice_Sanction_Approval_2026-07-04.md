# 运营后台永久封禁审批
日期：2026-07-04

## 背景

此前“用户处罚”页可以直接创建封禁处罚。对于 `ban + durationHours = 0` 这种长期/永久封禁，直接落地会立刻影响移动端账号状态，属于高风险运营动作。

本次补齐单 admin 版本的永久封禁审批流：先提交审批单，审批通过后才真正创建处罚。

## 本次实现

新增后端状态：
- `adminSanctionApprovals`

新增后台接口：
- `GET /admin/sanction-approvals`
- `POST /admin/sanction-approvals`
- `POST /admin/sanction-approvals/{approvalId}/approve`
- `POST /admin/sanction-approvals/{approvalId}/cancel`

调整既有接口：
- `POST /admin/users/{phone}/sanctions`
  - 当 `type = ban` 且 `durationHours = 0` 时，直接返回 `ADMIN_SANCTION_APPROVAL_REQUIRED`。
  - 非永久封禁仍可直接创建。

## 后台页面

“用户处罚”页新增“永久封禁审批”卡片：
- 展示待审批、已审批、已取消数量。
- 展示用户、处罚类型、原因、来源、提交人和状态。
- 待审批行支持：
  - 审批通过
  - 取消

创建处罚表单调整：
- 普通警告/禁言/冻结/短期封禁仍直接创建。
- 永久封禁自动提交审批。

## 移动端联动

待审批状态不会影响移动端：
- 不改变 `/me` 的 `accountStatus`。
- 不写入 `userSanctions`。
- 不发送账号限制通知。

审批通过后才会：
- 创建真实处罚流水。
- 更新用户账号状态为 `banned`。
- 后端写接口开始返回 `ACCOUNT_RESTRICTED`。
- 发送站内通知，用户仍可通过反馈、工单、申诉入口处理异议。

取消审批后：
- 不创建处罚。
- 不影响移动端账号状态。
- 只保留后台审批记录和审计日志。

## 审计动作

新增审计动作：
- `user.sanction.approval.create`
- `user.sanction.approval.approve`
- `user.sanction.approval.cancel`

审批通过时还会记录：
- `user.sanction.create`

## 当前不做

- 多管理员双人审批。
- 申请人和审批人强制分离。
- 批量处罚审批。
- 审批超时自动取消。
- 审批消息推送给另一个运营角色。

这些仍保留在生产期多管理员能力里。

## 验证

新增 smoke：

```bash
node scripts/smoke-sanction-approval.cjs
```

覆盖内容：
- 直接创建永久封禁会返回 `ADMIN_SANCTION_APPROVAL_REQUIRED`。
- 提交审批后用户仍保持 `active`。
- 审批通过后才生成 `ban` 处罚并变成 `banned`。
- 被永久封禁后普通写操作被拦截。
- 取消审批不会生成处罚，也不会影响用户状态。
