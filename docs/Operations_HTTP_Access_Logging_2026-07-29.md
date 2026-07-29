# 生产 HTTP 访问日志与请求追踪

日期：2026-07-29

后端现在为每个 HTTP 请求生成服务端可信的 `X-Request-Id`，并在生产环境默认向标准输出写一行 JSON 访问日志。systemd 将标准输出接入 journald；后续腾讯云 CLS 只需采集 `lumii-backend` 服务日志，不需要改业务接口。

## 默认行为

- `NODE_ENV=production` 时默认开启；可用 `LUMII_HTTP_ACCESS_LOG_ENABLED=false` 显式关闭，但系统健康会给出警告。
- 成功的 `/health` 探针默认不写访问日志，避免探针噪音；失败探针仍会记录。
- 每个响应都返回全新的 UUID v4 `X-Request-Id`，不会信任或回显客户端传入的同名请求头。
- 慢请求阈值默认 2000ms；超过阈值会标记 `slow=true`。
- 进程内同时统计总请求、4xx、5xx、慢请求、中断请求和最近错误时间；后台系统健康以 `http_access_logging` 展示。

示例：

```json
{"at":"2026-07-29T08:00:00.000Z","durationMs":18.4,"event":"lumii.http.access","method":"GET","outcome":"success","requestId":"5d951a98-a579-4e70-a518-2f13f98d217b","routeBucket":"/pets","schemaVersion":1,"slow":false,"statusCode":200}
```

## 隐私边界

访问日志只允许以下字段：

- 时间、耗时、事件名、HTTP 方法（非标准方法统一记为 `OTHER`）、结果、请求 ID、固定路由桶、schema 版本、慢请求标记和状态码。
- 路由只保留固定一级桶，例如 `/auth`、`/pets`、`/admin`；未知路径统一记为 `/other`。

以下信息禁止进入访问日志：

- 完整 URL、路径参数和查询参数。
- 手机号、用户 ID、宠物 ID及其他业务标识。
- Authorization、Cookie、请求体、响应体。
- IP、Host、Referer、User-Agent 和客户端提供的请求 ID。

专项回归会使用伪造手机号、查询密钥、Authorization、User-Agent 与客户端请求 ID，逐字段确认 JSON 日志没有泄漏。

## systemd 配置

仓库配置：`ops/systemd/lumii-backend.service.d/70-http-access-logging.conf`

```ini
[Service]
Environment="LUMII_HTTP_ACCESS_LOG_ENABLED=true"
Environment="LUMII_HTTP_ACCESS_LOG_INCLUDE_HEALTH=false"
Environment="LUMII_HTTP_ACCESS_LOG_SLOW_MS=2000"
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lumii-backend
```

部署后查看：

```bash
sudo journalctl -u lumii-backend --since "15 minutes ago" --no-pager -o cat
sudo journalctl -u lumii-backend --since today --no-pager -o cat | grep '"event":"lumii.http.access"'
```

拿到 App 或客服反馈的 `X-Request-Id` 后，可在 journald/CLS 中按该 UUID 精确定位单次请求，同时不会用手机号检索日志。

## CLS/APM 接入边界

代码侧已经完成可采集的 JSON 单行日志和请求关联。正式上线前仍需在腾讯云侧完成：

1. 创建 CLS 日志主题和机器采集配置，把 `lumii-backend` journald 输出送入该主题。
2. 将 JSON 字段设置为索引，至少索引 `event`、`requestId`、`routeBucket`、`statusCode`、`durationMs`、`outcome` 和 `slow`。
3. 配置保留周期、访问权限和脱敏审计；日志平台不得额外采集请求头或请求体。
4. 建议建立 5xx、慢请求比例、连续无日志和服务不可用告警，并绑定正式接收人与值班升级路径。

完成腾讯云采集、告警接收人与值班 SOP 前，上线台账中的“可观测性”仍保持 `partial/blocked`，不会因为代码已有日志就误判为完整闭环。

## 验收

```powershell
node --check scripts/lumii-backend.cjs
node scripts/smoke-http-access-logging.cjs
node scripts/smoke-launch-regression.cjs --only=http-access-logging,observability,admin-system-health-page --include-visual
```
