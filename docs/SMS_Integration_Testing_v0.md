# Lumii / 灵伴 短信验证码接入测试 v0

日期：2026-05-28

维护更新：2026-07-11

当前结论：
- Spug 通道已完成一次真实手机号测试，证明短信链路可用。
- 非生产 mock 后端可使用固定验证码 `962464`；生产后端使用 Spug 和随机一次性验证码。
- 生产版本由后端代理短信发送，不允许客户端保存短信服务密钥。

## 当前接入方式

- 本地测试通过 Spug Push URL 发送验证码。
- ~~前端登录页点击“获取验证码”时，会读取 Stitch iframe 内的手机号输入框，并调用短信发送服务。~~ 当前已改为 React Native 登录状态机调用 `lumiiApi.auth.sendSmsCode`。
- 2026-05-29 已完成真实手机号发送测试，Spug 返回 `code: 200`、`msg: 请求成功`，手机端验证码接收正确。
- ~~当前前端直连只用于本地验证。~~ 当前后端已提供 `POST /auth/sms/send` 和 `POST /auth/sms/verify`；生产 Spug 模板编号只保存在服务器环境配置中。

## 本地测试命令

Dry-run 不会真实发送短信，只验证 payload：

```powershell
$env:SPUG_SMS_URL="https://push.spug.cc/send/你的token"
npm run sms:test -- 18600000000 --code=962464 --dry-run
```

真实发送测试：

```powershell
$env:SPUG_SMS_URL="https://push.spug.cc/send/你的token"
npm run sms:test -- 你的手机号 --code=962464
```

## 前端安全边界

不再支持 `EXPO_PUBLIC_SPUG_SMS_URL`。任何 `EXPO_PUBLIC_*` 值都会进入客户端构建产物，不能存放 Spug 模板编号。Web 预览、真机和正式 APK 都必须调用 Lumii 后端短信接口。

## Payload

```json
{
  "name": "灵伴",
  "code": "962464",
  "targets": "18600000000"
}
```

## 还需要确认

- ~~Spug 短信通道需要完成实名认证；当前真实发送测试已返回 `code: 403`，提示需前往个人设置/实名认证完成认证后再试。~~
- 已完成实名认证并重试成功。
- ~~验证码有效期：建议 5 分钟。~~ 当前 MVP 测试后端和 mock API 均按 5 分钟处理。
- ~~再次获取倒计时：建议 60 秒。~~ 当前前端和测试后端均按 60 秒处理。
- ~~单手机号频控：建议 1 分钟 1 次、1 小时 5 次、1 天 10 次。~~ 当前 MVP 测试后端已做单手机号 60s 冷却和单手机号每日上限，默认 `SMS_DAILY_LIMIT=50`；生产上限可再按短信成本和风控调整。
- ~~单 IP 频控：建议 1 小时 20 次。~~ 当前 MVP 测试后端已做单 IP 每日上限和单设备每日上限，默认 `SMS_IP_DAILY_LIMIT=150`、`SMS_DEVICE_DAILY_LIMIT=80`；生产仍建议接黑名单/WAF/验证码风控平台。
- ~~验证码输错次数限制。~~ 当前 MVP 测试后端和 mock API 已做同一张票据最多 5 次输错限制，默认 `SMS_VERIFY_MAX_ATTEMPTS=5`。
- ~~测试手机号白名单和固定验证码策略。~~ 固定码 `962464` 仅允许非生产 mock；生产使用真实随机验证码。
- 错误提示文案：手机号格式错误、发送过频、服务不可用、验证码错误、验证码错误次数过多、验证码过期、验证码已使用。
