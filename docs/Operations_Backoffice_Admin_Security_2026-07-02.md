# Lumii 运营后台账号与 IP 白名单安全

日期：2026-07-02

## 目标

把当前后台从“只有账号密码”推进到“生产可配置入口边界”的状态。

2026-07-04 已新增多管理员账号底座，2026-07-09 已补第一版运行时 RBAC，详见 [Operations_Backoffice_Admin_Accounts_2026-07-04.md](./Operations_Backoffice_Admin_Accounts_2026-07-04.md)。本文继续记录登录失败锁定和后台 IP 白名单能力。

## 已支持

- `LUMII_ADMIN_USERNAME`：覆盖默认后台用户名。
- `LUMII_ADMIN_PASSWORD`：覆盖默认后台密码。
- `LUMII_ADMIN_LOGIN_MAX_ATTEMPTS`：连续失败锁定阈值，默认 5 次。
- `LUMII_ADMIN_LOGIN_LOCK_MS`：锁定时长，默认 15 分钟。
- `LUMII_ADMIN_IP_ALLOWLIST` / `LUMII_ADMIN_IP_WHITELIST`：后台 IP 白名单。
- state 管理员账号：已支持创建、禁用、启用和重置密码；环境变量账号仍作为最高兼容入口。
- 角色权限运行时拦截：`support`、`content_moderator`、`ops_admin`、`auditor` 等非全量账号调用未授权 `/admin/*` API 会被后端拒绝。

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
- 后台安全整体仍会因为 MFA、逐账号锁定和生产数据库未接而保持 `partial`，不误报为生产完全就绪。

## 仍未实现

- MFA。
- 后台登录设备管理。
- 逐账号登录失败锁定。
- 后台账号离职禁用流程。
- 网关层 IP 白名单。当前为 Node 后端应用层白名单，生产建议网关层同时配置。

## 回归脚本

- `node scripts/smoke-admin-ip-allowlist.cjs`

脚本覆盖：

- 白名单 IP 可以打开 `/admin` 并登录。
- 非白名单 IP 不能打开 `/admin`。
- 非白名单 IP 不能调用 `/admin/auth/login`。
- CIDR 规则可以匹配允许 IP。
- 账号权限页返回白名单状态。
