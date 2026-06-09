# Lumii / 灵伴 短信验证码接入测试 v0

日期：2026-05-28

维护更新：2026-06-10

当前结论：
- Spug 通道已完成一次真实手机号测试，证明短信链路可用。
- 当前云端 MVP 测试后端使用固定验证码 `962464`，避免在 App 包内暴露 Spug URL。
- 生产版本仍应由后端代理短信发送，不允许客户端保存短信服务密钥。

## 当前接入方式

- 本地测试通过 Spug Push URL 发送验证码。
- ~~前端登录页点击“获取验证码”时，会读取 Stitch iframe 内的手机号输入框，并调用短信发送服务。~~ 当前已改为 React Native 登录状态机调用 `lumiiApi.auth.sendSmsCode`。
- 2026-05-29 已完成真实手机号发送测试，Spug 返回 `code: 200`、`msg: 请求成功`，手机端验证码接收正确。
- ~~当前前端直连只用于本地验证。~~ 当前云端测试后端已提供 `POST /auth/sms/send` 和 `POST /auth/sms/verify`；生产版本继续沿用“后端保存 Spug URL/短信密钥”的原则。

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

## 前端预览环境变量

~~如果要让 `http://localhost:8081/` 登录页点击“获取验证码”时真实发送短信，需要重启前端服务，并在启动前设置：~~

该方式已不作为当前推荐路径，仅保留为历史调试记录：

```powershell
$env:EXPO_PUBLIC_SPUG_SMS_URL="https://push.spug.cc/send/你的token"
npm run web
```

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
- 验证码有效期：建议 5 分钟。
- ~~再次获取倒计时：建议 60 秒。~~ 当前前端和测试后端均按 60 秒处理。
- 单手机号频控：建议 1 分钟 1 次、1 小时 5 次、1 天 10 次。
- 单 IP 频控：建议 1 小时 20 次。
- ~~测试手机号白名单和固定验证码策略。~~ 当前 MVP 测试验证码固定为 `962464`；生产需切回真实随机验证码。
- 错误提示文案：手机号格式错误、发送过频、服务不可用、验证码错误、验证码过期。
