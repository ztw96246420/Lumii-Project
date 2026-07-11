# Lumii 生产短信验证码接入

日期：2026-07-10

代码状态：已完成，生产启用等待腾讯云短信应用、签名和模板值。

## 1. 腾讯云控制台准备

国内短信必须先完成实名资质、短信应用、签名和验证码模板审核，并购买可用短信额度。腾讯云文档：

- [国内短信快速入门](https://cloud.tencent.com/document/product/382/37745)
- [SendSms API](https://cloud.tencent.com/document/api/382/55981)
- [Node.js SDK 与参数说明](https://cloud.tencent.com/document/product/382/43197)

需要记录三个生产值：

```text
TENCENT_SMS_SDK_APP_ID    短信应用的 SmsSdkAppId
TENCENT_SMS_SIGN_NAME     已审核并完成运营商报备的签名内容，不带括号
TENCENT_SMS_TEMPLATE_ID   已审核的验证码正文模板 ID
```

默认模板参数只传验证码 `{1}`。如果模板为“验证码 `{1}`，`{2}` 分钟内有效”，再设置：

```text
TENCENT_SMS_TEMPLATE_PARAM_MODE=code_ttl
```

## 2. 服务器配置

示例见 `ops/systemd/lumii-backend.service.d/55-tencent-sms.example`：

```text
LUMII_SMS_PROVIDER=tencent
TENCENT_SMS_ENDPOINT=sms.tencentcloudapi.com
TENCENT_SMS_VERSION=2021-01-11
TENCENT_SMS_REGION=ap-guangzhou
TENCENT_SMS_SDK_APP_ID=<生产值>
TENCENT_SMS_SIGN_NAME=<生产值>
TENCENT_SMS_TEMPLATE_ID=<生产值>
TENCENT_SMS_TEMPLATE_PARAM_MODE=code
SMS_VERIFY_MAX_ATTEMPTS=5
SMS_LOGIN_CLIENT_MAX_FAILURES=10
SMS_LOGIN_ACCOUNT_MAX_FAILURES=20
SMS_LOGIN_FAILURE_WINDOW_MS=900000
SMS_LOGIN_LOCK_MS=900000
```

`TENCENTCLOUD_SECRET_ID` 和 `TENCENTCLOUD_SECRET_KEY` 继续从服务器受限环境文件读取，不写入 Git。

## 3. 安全行为

- 生产默认 `LUMII_SMS_PROVIDER=disabled`，缺配置时 fail closed。
- 生产配置 `mock` 会拒绝启动。
- 生产缺少显式后台强密码或至少 32 字符的 Token Secret 时同样拒绝启动。
- 固定测试码只在非生产 mock 模式可用，且必须先获取有效票据。
- 生产验证码由 `crypto.randomInt` 生成 6 位数字。
- 状态库只保存 HMAC-SHA256，不保存验证码明文。
- API 响应不返回生产验证码。
- 验证码只能使用一次，受过期、冷却、手机号/设备/IP 日限额和分层错误次数锁定保护。
- 单张票据默认最多错 5 次；同手机号 + 设备/IP 在 15 分钟内累计 10 次失败会限制该风险客户端 15 分钟，同手机号跨客户端累计 20 次失败后触发账号层兜底。
- 成功登录会自动清零该手机号失败计数；锁定不会因重新发码而绕过。
- 后台“用户管理”展示当前登录限制、最近失败 IP 和设备哈希；人工解锁需要 `user.login_unlock` 权限、身份核验原因和审计日志。
- 短信发送失败不会创建用户，也不会保存可验证票据。
- 登录验证码和注销验证码使用不同 purpose，不能互相替代。

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

任一状态不满足时，不允许构建正式候选 APK。

自动化：

```powershell
node scripts/smoke-sms-production.cjs
node scripts/smoke-launch-regression.cjs
```

专项测试覆盖生产密钥/后台密码启动门禁、生产 mock 拒绝启动、未配置通道 503、固定码旁路失败、TC3 签名请求、随机码登录、单次使用、明文不落库、连续失败临时锁定、锁定期禁止发码、后台解锁审计、恢复登录、注销验证码和后台上线台账。
