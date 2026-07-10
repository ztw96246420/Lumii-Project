# 运营后台管理员离职停用

日期：2026-07-10

## 目标

区分“临时禁用”和“人员离职”两类操作。临时禁用允许后续恢复；离职停用用于永久终止原账号身份，避免重新启用后旧密码或 MFA 再次生效。

## 行为

接口：`POST /admin/accounts/{accountId}/offboard`

执行后会一次性完成：

- 状态改为 `offboarded`。
- 用服务端随机值覆盖原密码哈希，不返回随机值。
- 清空原 MFA Secret 并关闭 MFA。
- 更新密码和 MFA 时间戳，使已签发 Token 立即失效。
- 清理该账号登录失败锁定状态。
- 记录离职时间、操作人和原因。
- 写入 `admin.account.offboard` 审计，不记录密码、MFA Secret 或新随机凭据。

离职账号不能执行普通启用、重置密码或重置 MFA，也不能再次登录。返岗人员必须创建新账号，保留前后两段独立审计身份。

## 页面操作

路径：运营后台 → 账号权限 → 后台账号列表 → 离职停用。

页面要求先输入完整账号名，再填写离职原因。环境变量账号不支持页面离职停用，需要通过服务器环境变量轮换或删除。

## 操作口径

1. 确认存在另一名可用的超级管理员，禁止停用当前登录账号。
2. 选择“离职停用”，输入账号名二次确认。
3. 填写可追溯原因，例如离职日期、交接单号或负责人。
4. 操作后确认账号状态为“离职停用”。
5. 检查审计日志包含 `admin.account.offboard`。
6. 返岗或重新合作时新建账号，不恢复原账号。

## 验收

```powershell
node scripts/smoke-admin-accounts.cjs
node scripts/smoke-launch-regression.cjs --only=admin-accounts,admin-accounts-page --include-visual
```

回归覆盖旧 Token 失效、旧密码拒绝、MFA 清除、密码凭据销毁、禁止重新启用、禁止重置密码/MFA、状态统计和审计记录。
