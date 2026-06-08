# Lumii / 灵伴 短信验证码接入测试 v0

日期：2026-05-28

## 当前接入方式

- 本地测试通过 Spug Push URL 发送验证码。
- 前端登录页点击“获取验证码”时，会读取 Stitch iframe 内的手机号输入框，并调用短信发送服务。
- 2026-05-29 已完成真实手机号发送测试，Spug 返回 `code: 200`、`msg: 请求成功`，手机端验证码接收正确。
- 当前前端直连只用于本地验证。生产版本建议改为后端接口 `POST /auth/sms/send`，由后端保存 Spug URL，避免密钥暴露在 App 包内。

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

如果要让 `http://localhost:8081/` 登录页点击“获取验证码”时真实发送短信，需要重启前端服务，并在启动前设置：

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
- 再次获取倒计时：建议 60 秒。
- 单手机号频控：建议 1 分钟 1 次、1 小时 5 次、1 天 10 次。
- 单 IP 频控：建议 1 小时 20 次。
- 测试手机号白名单和固定验证码策略。
- 错误提示文案：手机号格式错误、发送过频、服务不可用、验证码错误、验证码过期。
