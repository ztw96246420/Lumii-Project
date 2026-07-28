# Lumii 运营后台账号与 IP 白名单安全

日期：2026-07-02

## 目标

把当前后台从“只有账号密码”推进到“生产可配置入口边界”的状态。

2026-07-04 已新增多管理员账号底座，2026-07-09 已补第一版运行时 RBAC、逐账号登录失败锁定和 TOTP MFA 基座，详见 [Operations_Backoffice_Admin_Accounts_2026-07-04.md](./Operations_Backoffice_Admin_Accounts_2026-07-04.md)。本文继续记录后台 IP 白名单与账号安全能力。

## 已支持

- `LUMII_ADMIN_USERNAME`：覆盖默认后台用户名。
- `LUMII_ADMIN_PASSWORD`：覆盖默认后台密码。
- `LUMII_ADMIN_LOGIN_MAX_ATTEMPTS`：连续失败锁定阈值，默认 5 次。
- `LUMII_ADMIN_LOGIN_LOCK_MS`：锁定时长，默认 15 分钟。
- `LUMII_ADMIN_IP_ALLOWLIST` / `LUMII_ADMIN_IP_WHITELIST`：后台 IP 白名单。
- `LUMII_ADMIN_MFA_SECRET` / `LUMII_ADMIN_TOTP_SECRET`：环境变量 admin 账号的 Base32 TOTP MFA Secret。
- `LUMII_ADMIN_MFA_WINDOW`：TOTP 验证窗口，默认允许前后 1 个 30 秒窗口。
- `LUMII_ADMIN_PASSWORD_ROTATION_DAYS`：后台密码轮换检查周期，默认 90 天；设为 0 可关闭检查。
- `LUMII_ADMIN_PASSWORD_ROTATED_AT` / `LUMII_ADMIN_PASSWORD_UPDATED_AT`：环境变量 admin 账号最近一次密码轮换时间。
- state 管理员账号：已支持创建、禁用、启用、重置密码和启用/重置/关闭 MFA；环境变量账号仍作为最高兼容入口。
- 角色权限运行时拦截：`support`、`content_moderator`、`ops_admin`、`auditor` 等非全量账号调用未授权 `/admin/*` API 会被后端拒绝。
- 逐账号登录失败锁定：某个账号达到失败阈值后只锁定该账号，其他管理员仍可登录处理。
- TOTP MFA：账号启用 MFA 后，登录需同时提交 6 位验证码；缺失返回 `ADMIN_MFA_REQUIRED`，错误返回 `ADMIN_MFA_FAILED`。
- 密码轮换检查：账号权限页会检查所有活跃后台账号是否存在轮换时间、是否超过轮换周期；state 账号读取 `passwordUpdatedAt`，环境变量账号读取 `LUMII_ADMIN_PASSWORD_ROTATED_AT`。
- 离职停用：state 账号可通过 `/admin/accounts/{id}/offboard` 销毁旧密码凭据、清空 MFA、立即使旧会话失效并禁止原账号恢复。
- 后台登录设备管理：新签发的后台 Token 会绑定服务端会话记录；账号权限页可查看当前账号的登录设备、IP、User-Agent、最后活动与到期时间，并支持单设备强制退出、保留当前设备后退出其他设备以及主动注销。密码/MFA 重置、账号禁用和离职停用会同步撤销对应会话；服务端不保存完整 Bearer Token。
- 会话管理版本首次部署后，旧版无服务端会话绑定的后台 Token 会统一失效并要求重新登录，避免留下无法单独撤销的兼容旁路；App 用户 Token 不受影响。

白名单格式：

- 支持逗号、空格或换行分隔。
- 支持精确 IP，例如 `1.2.3.4`。
- 支持 IPv4 CIDR，例如 `10.0.0.0/24`。

## 运行规则

- 未配置 IP 白名单时，后台保持原有行为，但账号权限页和系统健康页会继续标记为安全关注。
- 配置 IP 白名单后，`/admin` 页面和 `/admin/*` API 都会先校验访问 IP。
- 非白名单 IP 会返回 `ADMIN_IP_NOT_ALLOWED`，不会进入登录校验或后台接口逻辑。
- 非白名单的登录/写请求会写入 `admin.ip_allowlist.blocked` 审计日志。
- 页面只展示白名单是否启用、规则条数和脱敏样本，不展示完整规则明文。

## 后台页面联动

- 账号权限页展示 IP 白名单是否启用、当前 IP 是否允许、规则数量和安全检查。
- 系统健康页把 `admin_ip_allowlist` 纳入外部/安全依赖检查。
- 上线台账的 `q-ip` 会在白名单配置后自动标记为已接入。
- 上线台账的 `q-mfa` 会按活跃账号 MFA 配置情况自动标记为已接入、部分启用或待配置。
- 账号权限页的安全检查会把 `password_rotation` 纳入安全关注计数，辅助生产期密码轮换 SOP。
- 后台安全 readiness 会按环境变量密码、IP 白名单、全员 MFA、密码轮换记录和离职停用能力实时判定；正式数据库缺口由独立数据底座项跟踪。

## 仍需生产组织配置

- 实际人事交接负责人、外部密码库和密码轮换执行排期。
- 网关层 IP 白名单。当前为 Node 后端应用层白名单，生产建议网关层同时配置。

## 回归脚本

- `node scripts/smoke-admin-ip-allowlist.cjs`
- `node scripts/smoke-admin-login-sessions.cjs`

脚本覆盖：

- 白名单 IP 可以打开 `/admin` 并登录。
- 非白名单 IP 不能打开 `/admin`。
- 非白名单 IP 不能调用 `/admin/auth/login`。
- CIDR 规则可以匹配允许 IP。
- 账号权限页返回白名单状态。
- 后台会话可跨服务重启保留；单设备撤销、退出其他设备、主动注销均立即失效并写入审计日志。
- 账号禁用、密码/MFA 重置和离职停用会主动撤销该账号的有效后台会话。
