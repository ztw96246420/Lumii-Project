# Lumii 运营后台多管理员账号底座

日期：2026-07-04

## 目标

把后台账号从“只有一个环境变量 admin”推进到“环境变量 admin + 可运营维护的 state 管理员账号”。

这一步仍保持当前目标里的“暂时仅需 admin 权限”：新增账号全部拥有现阶段后台 admin 全量能力，不做细角色拦截。这样先解决多人测试、离职禁用、密码重置和审计归因问题，后续再叠加 RBAC、MFA 和双人审批。

## 已支持

- 环境变量账号继续可用：
  - `LUMII_ADMIN_USERNAME`
  - `LUMII_ADMIN_PASSWORD`
- 新增 state 管理员账号：
  - `POST /admin/accounts`
  - 保存到 `state.adminAccounts`
  - 密码使用 PBKDF2 + salt 哈希保存，不保存明文。
- 账号状态：
  - `active`
  - `disabled`
- 账号操作：
  - 创建账号
  - 禁用账号
  - 启用账号
  - 重置密码
- token 失效规则：
  - 禁用账号后，该账号已有 token 立即无法通过 `/admin/me`。
  - 重置密码后，该账号旧 token 立即失效。
- 审计：
  - `admin.account.create`
  - `admin.account.disable`
  - `admin.account.enable`
  - `admin.account.reset_password`
  - 禁用账号尝试登录会记录 `admin.login.disabled_account`。
- 页面：
  - 账号权限页新增“新增后台账号”表单。
  - 账号权限页新增“后台账号列表”，展示环境变量账号和 state 账号。
  - state 账号支持页面禁用、启用和重置密码。

## 后台与移动端关系

这个能力不直接改变移动端功能，但它是所有“后台控制移动端”的治理前提：

- 后台配置影响移动端时，需要知道是谁改的。
- 后台处罚、内容隐藏、工单回复、通知发送会影响移动端用户，需要能追溯管理员身份。
- 后续双人审批、导出审批、永久封禁审批都依赖多管理员身份。

## 当前边界

- 新增账号当前统一 `admin` 权限。
- 暂不做细角色运行时拦截。
- 暂不做 MFA。
- 暂不做管理员设备管理。
- 暂不做密码过期策略。
- 暂不做环境变量账号的页面禁用或页面重置密码。
- 登录失败锁定仍是全局后台锁定，不是逐账号锁定。
- 数据仍保存在 JSON state；生产期应迁移到正式数据库。

## 生产期待补

- 后台账号表迁移到数据库。
- 细角色 RBAC：
  - `super_admin`
  - `ops_admin`
  - `content_moderator`
  - `support`
  - `ai_ops`
  - `place_ops`
  - `auditor`
- MFA：
  - TOTP 或企业微信/飞书/邮箱二次验证。
- 逐账号登录失败锁定。
- 密码强度和密码过期策略。
- 管理员离职禁用流程。
- 管理员最近登录设备。
- 高危操作双人审批。
- 审计日志不可篡改存储。

## 回归脚本

```bash
node scripts/smoke-admin-accounts.cjs
```

脚本覆盖：

- 环境变量 admin 可登录。
- admin 可创建 state 管理员账号。
- 新账号可登录。
- 禁用账号后旧 token 失效。
- 禁用账号不能登录。
- 启用账号后可重新登录。
- 重置密码后旧 token 和旧密码失效。
- 新密码可登录。
- 创建、禁用、启用、重置密码均写审计。
