# 后台生产安全配置包

日期：2026-07-09

## 生产启用状态（2026-07-10）

- `LUMII_ADMIN_USERNAME` 和随机强密码已通过 root-only systemd drop-in 启用。
- drop-in：`/etc/systemd/system/lumii-backend.service.d/15-admin-credentials.conf`，权限 `0600 root:root`。
- `LUMII_ADMIN_PASSWORD_ROTATION_DAYS=90` 和本次轮换时间已生效。
- 旧仓库默认密码实测返回 401，新凭据返回 200。
- 后台健康：`admin_credentials=ok`；账号安全：`defaultPasswordRisk=false`、`passwordRotation.configured=true`。
- 一次性凭据文件仅保存在开发机当前 Windows 账号 ACL 下，不进入 Git；MFA 和 IP 白名单仍待管理员确认后启用。

本次在运营后台“账号权限”页补齐生产安全硬化配置包。它解决的问题不是自动替你改服务器，而是把生产前必须配置的后台账号密码、MFA、IP 白名单和密码轮换记录整理成可复制、可审计的一次性配置建议。

## 为什么不自动启用

后台 IP 白名单、MFA 和默认密码替换都可能直接影响 `/admin` 登录。如果在未确认办公出口 IP、VPN、TOTP 认证器和新密码保存位置前自动切换，容易把当前管理员锁在后台外。因此当前实现只生成配置包，不自动写入 systemd 或服务器环境变量。

## 后台入口

路径：运营后台 → 账号权限 → 生产安全硬化配置包。

页面展示：

- 后台密码是否已由 `LUMII_ADMIN_PASSWORD` 覆盖。
- 活跃后台账号是否全部启用 MFA。
- 后台 IP 白名单是否已配置。
- 密码轮换记录是否已配置。
- 当前请求 IP，可作为白名单候选值。

点击“生成一次性配置包”后会显示：

- 新后台账号名。
- 一次性强密码。
- Base32 TOTP Secret。
- TOTP otpauth URI。
- `LUMII_ADMIN_IP_ALLOWLIST` 建议值。
- systemd drop-in 环境变量块。
- 临时 shell export 预览。
- 重启命令。

刷新页面后配置包不会保留在浏览器状态中。

## 审计与敏感信息

生成动作会写入审计日志：

- `admin.security_plan.generate`

审计只记录生成时间、目标账号、当前 IP、建议白名单和缺失项；不会记录生成的后台密码或 MFA Secret。

## 建议启用步骤

1. 在后台生成一次性配置包。
2. 把 TOTP Secret 加入认证器，并确认能看到 6 位验证码。
3. 确认 `LUMII_ADMIN_IP_ALLOWLIST` 包含办公出口 IP、VPN 或堡垒机 IP。
4. 保存新后台密码到团队密码库。
5. SSH 到服务器，执行 `sudo systemctl edit lumii-backend`，粘贴 `[Service]` 环境变量块。
6. 执行：

```bash
sudo systemctl daemon-reload
sudo systemctl restart lumii-backend
systemctl is-active lumii-backend
```

7. 保留 SSH 会话，打开后台用新密码和 TOTP 验证登录。
8. 登录成功后再关闭旧会话。

## 上线台账影响

配置真正启用后：

- `q-ip` 会从待确认变为已接入。
- `q-mfa` 会从待配置变为已接入。
- `admin_security` 中“后台密码仍可能使用默认值”的阻断会解除。

配置包生成本身不会改变 readiness 状态，只有真实环境变量生效后才会改变。

## 验收脚本

```powershell
node scripts/smoke-admin-accounts.cjs
node scripts/smoke-admin-accounts-page.cjs
node scripts/smoke-launch-regression.cjs --only=admin-accounts,admin-accounts-page,audit-integrity
```

生产代码还会在 `NODE_ENV=production` 时强制要求显式后台用户名、至少 16 字符且非仓库默认值的后台密码，以及至少 32 字符的 Token Secret；缺少任一项都会拒绝启动。
