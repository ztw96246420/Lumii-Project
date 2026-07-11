# Lumii 生产短信验证码接入

日期：2026-07-11

当前生产通道：Spug 推送助手。腾讯云短信实现继续保留，企业化后可通过环境变量切换。

## 1. Spug 模板准备

在 Spug 推送助手创建“短信验证码”消息模板，开启动态推送对象。后端按官方接口发送以下字段：

```json
{
  "name": "灵伴",
  "code": "随机 6 位验证码",
  "targets": "中国大陆手机号"
}
```

官方文档：[发送短信验证码](https://push.spug.cc/guide/sms-code)。

模板编号等同调用凭据，只能存放在服务器受限环境配置中。禁止写入 Git、后台页面、日志、App 环境变量或 APK。

## 2. 服务器配置

示例见 `ops/systemd/lumii-backend.service.d/55-spug-sms.example`：

```text
LUMII_SMS_PROVIDER=spug
SPUG_SMS_BASE_URL=https://push.spug.cc/send
SPUG_SMS_TEMPLATE_ID=<生产模板编号>
SPUG_SMS_SENDER_NAME=灵伴
SPUG_SMS_TIMEOUT_MS=8000
SMS_VERIFY_MAX_ATTEMPTS=5
SMS_LOGIN_CLIENT_MAX_FAILURES=10
SMS_LOGIN_ACCOUNT_MAX_FAILURES=20
SMS_LOGIN_FAILURE_WINDOW_MS=900000
SMS_LOGIN_LOCK_MS=900000
```

建议在 Spug 个人中心将调用 IP 白名单限制为 Lumii 生产服务器固定出口 IP。模板编号轮换后必须同步更新服务器环境配置并重启服务。

腾讯云备用通道配置仍见 `ops/systemd/lumii-backend.service.d/55-tencent-sms.example`，切换时设置 `LUMII_SMS_PROVIDER=tencent`。

## 3. 安全行为

- App 只调用 `POST /auth/sms/send`，不包含 Spug URL 或模板编号。
- 生产默认 `LUMII_SMS_PROVIDER=disabled`，缺配置时 fail closed；生产配置 `mock` 会拒绝启动。
- 仅接受 Spug HTTPS 端点；自动化测试只额外允许 loopback HTTP。
- Spug 必须返回 HTTP 成功且 JSON `code` 为 `200` 或 `0`，否则按发送失败处理。
- 生产验证码由 `crypto.randomInt` 生成 6 位数字，固定测试码只允许非生产 mock 环境。
- 状态库只保存 HMAC-SHA256，不保存验证码明文，API 响应也不返回生产验证码。
- 验证码只能使用一次，受有效期、冷却、手机号/设备/IP 日限额和分层错误次数锁定保护。
- 短信发送失败不会创建用户，也不会保存可验证票据。
- 登录验证码和注销验证码使用不同 purpose，不能互相替代。
- 后台健康页只显示供应商和基础地址，不显示模板编号。

## 4. 上线门禁

后台系统健康：

```text
sms_provider=ok
sms_login_lockout=ok
```

上线台账：

```text
sms_delivery=ready
```

自动化：

```powershell
node scripts/smoke-sms-production.cjs
node scripts/smoke-launch-regression.cjs
```

专项测试覆盖 Spug 请求路径和 payload、供应商拒绝、随机码登录、固定码旁路阻断、验证码明文不落库、一次性消费、失败锁定、后台解锁、注销验证码、健康检查凭据脱敏，以及腾讯云备用通道兼容性。

部署后还必须使用真实手机号完成“发送 -> 接收 -> 登录”验收，并在 Spug 推送日志确认提交结果。HTTP 接收成功只代表供应商受理，不等同运营商最终送达。
