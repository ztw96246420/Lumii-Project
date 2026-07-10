# 运营后台站外告警与审批提醒

日期：2026-07-10

本能力把运营后台已有的健康告警和高风险待审批队列接到企业微信、飞书、钉钉或通用 Webhook。它用于提醒值守人员及时进入后台处理，不在站外通道中直接执行审批、处罚、导出或配置发布。

## 覆盖范围

- 后台默认账号或 IP 白名单风险。
- 状态文件、滚动备份和媒体访问异常。
- AI 灵伴形象、灵伴动效任务卡住。
- 内容安全升级任务、客服 SLA、用户申诉。
- Expo Push ticket/receipt 失败。
- 配置发布、系统通知、敏感导出、处罚、数据清理和批量客服回复等高风险待审批聚合提醒。

默认只发送 `high` 和 `critical` 告警。相同告警按稳定内容指纹去重，默认 6 小时后仍未消除才再次提醒；告警内容或数量发生变化时会重新发送。

## 服务器配置

必填：

```ini
[Service]
Environment="LUMII_ADMIN_ALERT_WEBHOOK_URL=https://your-webhook.example/path"
```

可选：

```ini
Environment="LUMII_ADMIN_ALERT_WEBHOOK_PROVIDER=auto"
Environment="LUMII_ADMIN_ALERT_WEBHOOK_MIN_SEVERITY=high"
Environment="LUMII_ADMIN_ALERT_WEBHOOK_INTERVAL_MS=300000"
Environment="LUMII_ADMIN_ALERT_WEBHOOK_REPEAT_MS=21600000"
Environment="LUMII_ADMIN_ALERT_WEBHOOK_TIMEOUT_MS=8000"
Environment="LUMII_ADMIN_ALERT_WEBHOOK_INITIAL_DELAY_MS=15000"
Environment="LUMII_ADMIN_PUBLIC_BASE_URL=https://ops.example.com"
```

`provider=auto` 会按域名识别企业微信、飞书和钉钉，其他地址按通用 JSON Webhook 发送。也可显式填写 `wecom`、`feishu`、`dingtalk` 或 `generic`。

Webhook URL 只从服务器环境变量读取。后台 API 和页面只显示是否配置、供应商、目标主机名、最近成功/失败时间和状态码，不返回完整 URL。

## 后台操作

运营后台工作台和系统健康页会显示站外通道状态。通道配置成功后，有 `config.update` 权限的管理员可点击“测试通道”：

- 成功会显示最近成功时间，并写入 `admin.alert_webhook.test` 审计。
- HTTP 非 2xx、供应商业务错误码或请求超时会记录失败，但不会中断主业务请求。
- 自动巡检和手动测试均写入 `adminAlertWebhookDeliveries`，仅保留最近 200 条，可由环境变量调整上限。

## 值守口径

- `critical`：5 分钟内确认，立即检查 SSH、系统健康页和最近部署；无法恢复时进入维护/回滚流程。
- `high`：15 分钟内确认，进入对应后台模块处理；高风险审批必须回到原审批页完成会签。
- 重复告警：先判断是同一问题未恢复，还是内容/数量变化；不要仅通过关闭通知规避告警。
- 通道持续失败：先在后台执行测试，再检查 Webhook 是否被撤销、出口网络、供应商限流和服务器时间。
- 交接：值班结束前确认未关闭的 critical/high 告警、待审批队列和最近一次通道发送状态。

## 验收

```powershell
node --check scripts/lumii-backend.cjs
node --check admin/admin.js
node scripts/smoke-observability-alerts.cjs
node scripts/smoke-admin-alert-webhook-providers.cjs
node scripts/smoke-launch-regression.cjs --only=observability,alert-webhook-providers,pending-approval-watch,high-risk-countersign
```

回归脚本会启动本地伪 Webhook，覆盖自动推送、内容聚合、指纹去重、手动测试、HTTP 失败记录和恢复后再次发送。

## 仍需生产确认

- 实际接收群和责任人。
- 夜间与节假日值班安排。
- critical/high 超时升级路径。
- 外部日志/APM 平台。当前 Webhook 解决的是通知通道，不替代日志检索、链路追踪和基础设施监控。
