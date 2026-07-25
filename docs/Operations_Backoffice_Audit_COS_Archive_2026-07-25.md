# 运营后台审计 Journal COS 异地归档

日期：2026-07-25

## 目标

后台写操作继续追加到本机 `admin-audit-journal.jsonl` 的 `prevHash/hash` 链，同时把发生变化后的完整 journal 归档到腾讯云 COS，避免审计证据只存在单台服务器。

## 归档契约

- 每次归档先写入 `audit.archive.cos.attempt` 审计记录，再对包含该记录的完整 journal 做快照。
- 内容未变化时跳过上传，不产生重复对象或新的归档审计。
- 每次成功归档写入两个唯一对象：`*.jsonl` 与 `*.manifest.json`。
- journal 对象携带 `Content-MD5`、`x-cos-meta-journal-sha256` 和 `x-cos-forbid-overwrite: true`。
- manifest 记录 journal SHA-256、字节数、行数、最新审计 hash、上一归档 ID/哈希和对象键。
- 应用只创建新对象，不提供覆盖、下载或删除归档对象的后台接口。
- `x-cos-forbid-overwrite` 是应用侧防覆盖保护；正式合规保留仍需在 COS 控制台配置版本控制、对象锁/合规保留和生命周期策略。

## 生产环境变量

```text
LUMII_ADMIN_AUDIT_COS_ENABLED=true
LUMII_ADMIN_AUDIT_COS_PREFIX=admin-audit
LUMII_ADMIN_AUDIT_COS_INTERVAL_MS=900000
LUMII_ADMIN_AUDIT_COS_INITIAL_DELAY_MS=20000
LUMII_ADMIN_AUDIT_COS_STALE_MS=3600000
```

归档复用 `COS_BUCKET`、`COS_REGION`、`COS_SECRET_ID`、`COS_SECRET_KEY` 和可选 `COS_ENDPOINT`。生产 CAM 凭据只需目标前缀的写入权限，不应授予公开读或删除权限。

## 后台与接口

- 审计页展示归档状态、自动周期、最近成功时间、journal/manifest 对象键和哈希链。
- `GET /admin/audit-archives`：需要 `audit.view`。
- `POST /admin/audit-archives/run`：需要 `audit.archive`，原因至少 4 个字。
- `GET /admin/audit-logs` 同时返回 `archive` 状态。
- 系统健康检查项：`audit_cos_archive`。
- 失败、超时或 COS 配置不完整时，运营告警键：`audit_cos_archive`。
- 上线台账缺口：`audit_archive`。

## 生产验收

1. 启用环境变量并重启 `lumii-backend`。
2. 在审计页执行一次“立即归档”。
3. 确认后台状态为“COS 归档正常”，系统健康 `audit_cos_archive=ok`。
4. 在 COS 确认同一归档 ID 下存在 JSONL 与 manifest 两个对象。
5. 下载到隔离环境后计算 JSONL SHA-256，与 manifest 的 `journal.sha256` 对比。
6. 在 COS 控制台启用版本控制和适用的对象锁/合规保留策略；使用独立 CAM 账号抽查，应用账号不应有删除权限。

## 回归

```text
node scripts/smoke-admin-audit-cos-archive.cjs
node scripts/smoke-admin-audit-integrity.cjs
node scripts/smoke-launch-regression.cjs --only=audit-cos-archive,audit-integrity,observability,admin-dashboard-page
```
