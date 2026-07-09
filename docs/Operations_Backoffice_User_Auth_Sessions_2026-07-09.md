# 用户登录设备与 IP 排查

维护日期：2026-07-09

## 范围

本专项补齐移动端用户登录来源排查能力，用于客服和运营定位：

- 用户是否完成短信登录。
- 最近一次登录、Token 刷新或登出的 IP。
- 是否存在多次会话或异常来源。
- 清理用户业务数据后，登录排查记录是否同步归零。

## 已实现

- `state.authSessions` 按手机号保存最近会话，默认每个用户保留 30 条，可用 `LUMII_AUTH_SESSION_RETAIN_PER_USER` 调整。
- `/auth/sms/send` 记录短信发送时的设备 ID、IP、User-Agent 摘要。
- `/auth/sms/verify` 成功后创建登录会话。
- `/auth/token/refresh` 记录刷新来源，并把新 token 与上一 token 建立脱敏关联。
- `/auth/logout` 将对应会话标记为已登出。
- `/admin/users` 返回 `authSessionSummary`，后台用户列表展示最近登录来源。
- `/admin/users/:phone` 返回 `authSessions`，用于单用户详细排查。
- `/admin/users/:phone/timeline?kind=account` 聚合登录、刷新、登出事件。
- `/admin/users/:phone/business-data-summary` 统计 `authSessions`。
- 用户业务数据清理审批执行后，会同步删除该用户 `authSessions`。

## 隐私边界

后台不展示也不返回完整 token 或完整设备 ID。

- Token：只保存 hash 和尾号。
- 设备：只保存 SHA-256 前 12 位 hash 和尾号。
- User-Agent：只保留 180 字符摘要。
- IP：用于风控和客服排查，按后台权限展示。

## 验证

新增回归脚本：

```bash
node scripts/smoke-user-auth-sessions.cjs
```

已纳入上线回归门禁：

```bash
node scripts/smoke-launch-regression.cjs --only=user-auth-sessions
```
