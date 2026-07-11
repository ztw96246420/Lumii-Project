# 用户短信登录失败锁定与后台处置

日期：2026-07-11

## 1. 目标

防止攻击者通过重复申请验证码和跨票据穷举 6 位验证码，同时避免仅凭手机号轻易锁死正常用户。

## 2. 分层策略

- 单张验证码票据默认最多输错 5 次，达到上限后票据立即失效。
- 同手机号 + 安装设备、同手机号 + 来源 IP 在 15 分钟窗口内累计失败 10 次后，限制该风险客户端 15 分钟。
- 同手机号跨设备/IP 累计失败 20 次后触发账号层兜底限制。
- 锁定期间不发送新短信，也不接受验证码校验；成功校验后清除该手机号全部失败计数。
- 设备标识为 App 安装级 ID，不使用硬件 ID；后台只展示设备哈希。

## 3. 后台处置

用户管理页的“登录锁定”指标展示当前受限用户数。用户行会展示：

- 是否受限及解除时间。
- 累计失败次数。
- 最近失败 IP 和脱敏设备哈希。
- “解除登录限制”操作。

人工解锁前必须完成手机号持有人身份核验，并填写至少 4 个字的处理原因。接口为：

```text
POST /admin/users/{phone}/login-lock/unlock
Permission: user.login_unlock
Audit action: user.sms_login.unlock
```

客服、运营管理员、管理员和超级管理员具备该权限；审计员与内容审核员默认无权解锁。

## 4. 监控与配置

环境变量：

```text
SMS_VERIFY_MAX_ATTEMPTS=5
SMS_LOGIN_CLIENT_MAX_FAILURES=10
SMS_LOGIN_ACCOUNT_MAX_FAILURES=20
SMS_LOGIN_FAILURE_WINDOW_MS=900000
SMS_LOGIN_LOCK_MS=900000
```

系统健康页必须显示 `sms_login_lockout=ok`。生产期应监控 `SMS_LOGIN_LOCKED` 比例、受限手机号数、来源 IP 聚集度和人工解锁审计；异常升高时优先排查撞库或短信轰炸。

## 5. 自动化证据

- `node scripts/smoke-sms-production.cjs`
- `node scripts/smoke-admin-accounts-page.cjs`
- `node scripts/smoke-frontend-playwright.cjs`

覆盖正常随机码登录、连续失败锁定、锁定期禁止发码、后台查看与解锁、解锁审计、恢复登录，以及 App 15 分钟倒计时视觉状态。
