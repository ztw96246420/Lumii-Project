# Lumii 运营后台多管理员账号底座

日期：2026-07-04

## 目标

把后台账号从“只有一个环境变量 admin”推进到“环境变量 admin + 可运营维护的 state 管理员账号”。

2026-07-09 已在多账号底座上补齐第一版运行时 RBAC、逐账号登录失败锁定与 TOTP MFA。2026-07-10 已补不可恢复的离职停用：销毁旧密码凭据、清空 MFA、使旧会话立即失效并保留独立审计身份。

## 已支持

- 环境变量账号继续可用：
  - `LUMII_ADMIN_USERNAME`
  - `LUMII_ADMIN_PASSWORD`
  - `LUMII_ADMIN_MFA_SECRET` / `LUMII_ADMIN_TOTP_SECRET`
  - `LUMII_ADMIN_PASSWORD_ROTATED_AT` / `LUMII_ADMIN_PASSWORD_ROTATION_DAYS`
- 新增 state 管理员账号：
  - `POST /admin/accounts`
  - 保存到 `state.adminAccounts`
  - 密码使用 PBKDF2 + salt 哈希保存，不保存明文。
  - 支持传入 `roleIds`，页面默认创建 `support` 角色，避免误给全量权限。
- 运行时角色权限：
  - `admin` / `super_admin`：全量后台能力。
  - `ops_admin`：日常运营、配置、通知、工单和非导出类治理操作。
  - `content_moderator`：内容审核、图片/私信上下文、地点审核。
  - `support`：工单、低风险用户排查、关系状态排查和备注。
  - `auditor`：只读看板、审计和上线台账复核。
  - 未授权角色调用对应 `/admin/*` API 会返回 `ADMIN_PERMISSION_DENIED`，并带回缺失权限点。
- 账号状态：
  - `active`
  - `disabled`
  - `offboarded`
- 账号操作：
  - 创建账号
  - 禁用账号
  - 启用账号
  - 重置密码
  - 启用/重置/关闭 MFA
  - 离职停用（不可恢复）
- token 失效规则：
  - 禁用账号后，该账号已有 token 立即无法通过 `/admin/me`。
  - 重置密码后，该账号旧 token 立即失效。
  - 启用、重置或关闭 MFA 后，该账号旧 token 立即失效。
  - 离职停用后旧 token 立即失效，旧密码/MFA 被销毁，原账号禁止重新启用。
- 密码轮换检查：
  - state 账号使用 `passwordUpdatedAt` 计算是否超过轮换周期。
  - 环境变量 admin 账号使用 `LUMII_ADMIN_PASSWORD_ROTATED_AT` / `LUMII_ADMIN_PASSWORD_UPDATED_AT` 记录最近轮换时间。
  - `LUMII_ADMIN_PASSWORD_ROTATION_DAYS` 默认 90 天；超期或缺失轮换时间会在账号权限页安全检查中标记为 warn。
- TOTP MFA：
  - 创建 state 账号时可传入 `mfaSecret` / `totpSecret`。
  - `POST /admin/accounts/{id}/reset-mfa` 可启用、重置或传空关闭 state 账号 MFA。
  - 环境变量 admin 账号的 MFA 只能通过服务器环境变量配置。
  - MFA Secret 仅存储在服务端 state 或环境变量，不在账号列表接口回显。
- 逐账号登录保护：
  - 每个账号独立累计登录失败次数。
  - 达到 `LUMII_ADMIN_LOGIN_MAX_ATTEMPTS` 后只锁定该账号 `LUMII_ADMIN_LOGIN_LOCK_MS`。
  - 其他管理员账号仍可登录处理事故。
  - 成功登录或重置密码会清理该账号失败计数和锁定状态。
- 审计：
  - `admin.account.create`
  - `admin.account.disable`
  - `admin.account.enable`
  - `admin.account.reset_password`
  - `admin.account.reset_mfa`
  - `admin.account.offboard`
  - `admin.login.mfa_required`
  - `admin.login.mfa_failed`
  - 禁用账号尝试登录会记录 `admin.login.disabled_account`。
- 页面：
  - 账号权限页新增“新增后台账号”表单。
  - 创建账号时可选择角色。
  - 账号权限页新增“后台账号列表”，展示环境变量账号和 state 账号。
  - 角色边界和权限点表展示每个角色拥有的权限。
  - state 账号支持页面禁用、启用、重置密码和重置 MFA。
  - state 账号支持“离职停用”二次确认；返岗需新建账号。

## 后台与移动端关系

这个能力不直接改变移动端功能，但它是所有“后台控制移动端”的治理前提：

- 后台配置影响移动端时，需要知道是谁改的。
- 后台处罚、内容隐藏、工单回复、通知发送会影响移动端用户，需要能追溯管理员身份并限制到对应角色。
- 后续双人审批、导出审批、永久封禁审批都依赖多管理员身份。

## 当前边界

- 暂不做管理员设备管理。
- 暂不做密码过期策略。
- 暂不做环境变量账号的页面禁用或页面重置密码。
- 数据仍保存在 JSON state；生产期应迁移到正式数据库。
- 第一版 RBAC 是后端集中权限门和页面角色选择，按钮级隐藏仍可继续细化；安全边界以后端拦截为准。
- 已接入密码轮换状态检查和离职停用技术闭环；定期执行、外部密码库和人事交接单仍属于生产组织流程。

## 生产期待补

- 后台账号表迁移到数据库。
- 继续细化 RBAC：
  - 更细的 AI/地点专项角色。
  - 按字段授权，例如完整手机号、导出敏感字段。
  - 按页面隐藏无权限操作按钮。
- 继续强化 MFA：
  - 生产前为所有活跃后台账号配置 TOTP。
  - 后续可升级企业微信/飞书/邮箱二次验证或设备绑定。
- 密码强度和密码过期策略。
- ~~管理员离职禁用流程。~~ 已实现不可恢复的离职停用；生产期需落实际交接负责人和单号。
- 管理员最近登录设备。
- 高危操作双人审批。
- 审计日志不可篡改存储。

## 回归脚本

```bash
node scripts/smoke-admin-accounts.cjs
```

脚本覆盖：

- 环境变量 admin 启用 MFA 后，缺验证码会被拒绝，正确验证码可登录。
- 环境变量 admin 的密码轮换时间会纳入安全检查。
- admin 可创建 state 管理员账号。
- state 管理员账号启用 MFA 后，缺验证码/错误验证码会被拒绝，正确验证码可登录。
- 新账号可登录，默认客服角色。
- 客服角色可查看工单，但不能访问账号管理、用户业务数据清理或导出历史。
- 客服账号输错到锁定后，环境变量 admin 仍可登录。
- 重置客服账号密码后，该账号锁定状态会被清除。
- 禁用账号后旧 token 失效。
- 禁用账号不能登录。
- 启用账号后可重新登录。
- 重置密码后旧 token 和旧密码失效。
- 重置/关闭 MFA 后旧 token 失效，关闭后可无验证码登录。
- 新密码可登录。
- 密码轮换检查在环境变量账号和 state 账号均未超期时返回 ok。
- 创建、禁用、启用、重置密码、重置 MFA 和 MFA 登录失败均写审计。
- 离职停用会销毁旧凭据、清除 MFA、使旧 Token 失效，并阻止启用、密码重置和 MFA 重置。
