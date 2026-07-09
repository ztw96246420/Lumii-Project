# 数据导出审批治理说明

版本：2026-07-01

## 1. 目标

数据导出用于测试排查、客服复盘和运营分析，但它天然包含较高的数据泄漏风险。本轮新增的目标是把“原因必填 + CSV 水印 + 审计”升级为“可强制审批 + 条件锁定 + 下载追踪”的闭环。

当前已支持高风险审批人/申请人分离、`highRiskApproval.requiredApprovals` 最少会签人数和服务器本地导出归档任务；生产期建议会签人数配置为 2 或以上，并补审批值守通知、对象存储归档和敏感字段授权。

## 2. 配置项

后台配置中心新增“数据导出治理”：

- `exports.requireApproval`：是否强制数据导出审批。
- `exports.approvalExpiresHours`：审批通过后的有效期，允许 1-168 小时。

开启强制审批后，直接调用 `/admin/exports/{type}.csv` 会返回 `ADMIN_EXPORT_APPROVAL_REQUIRED`，必须先提交并审批通过导出申请。

## 3. 后台页面

数据导出页包含三段：

- 导出目录：展示 22 类数据集、匹配行数、字段摘要、敏感字段数量和敏感字段名称。
- 导出审批：展示待审批/已审批申请，支持提交审批、审批通过、取消和生成归档。
- 导出归档任务：展示排队、生成中、已生成、失败、过期任务，归档文件保留期内可下载。
- 导出历史：展示最近下载记录，包含审批单 ID、水印 ID、导出原因、筛选条件、行数、管理员、IP 和时间。

敏感字段识别目前用于提示和治理判断，命中范围包括手机号、内容、地址、经纬度、IP、User-Agent、设备、Token、原因、备注、摘要等字段名。

## 4. 接口

- `GET /admin/exports`：导出目录，同时返回审批策略和敏感字段提示。
- `GET /admin/exports/approvals?type=&status=`：审批单列表。
- `POST /admin/exports/approvals`：按当前数据集、筛选条件和导出原因提交审批。
- `POST /admin/exports/approvals/{approvalId}/approve`：审批通过。
- `POST /admin/exports/approvals/{approvalId}/cancel`：取消审批。
- `GET /admin/exports/jobs?type=&status=`：导出归档任务列表。
- `POST /admin/exports/jobs`：按数据集、筛选、原因和可选审批单创建归档任务。
- `GET /admin/exports/jobs/{jobId}/download`：下载已完成归档文件。
- `GET /admin/exports/{type}.csv?reason=&approvalId=`：下载 CSV。
- `GET /admin/exports/history`：导出历史。

## 5. 校验规则

- 导出原因最少 4 个字符，后端强制校验。
- 审批单记录数据集、筛选条件、导出原因、字段数、匹配行数、敏感字段和申请人。
- 下载时会校验审批单状态必须为 `approved`。
- 下载时会校验审批单未过期。
- 下载时会校验数据集、筛选条件和导出原因必须与审批单一致。
- 通过审批创建归档任务或直接下载后，会回写审批下载次数和最近下载时间。
- 归档任务会写入服务器本地文件目录，state 只保留任务元数据、文件名、行数、水印和过期时间。

## 6. 审计

以下动作都会写入 `adminAuditLogs`：

- `data.export.approval.create`
- `data.export.approval.approve`
- `data.export.approval.cancel`
- `data.export.job.create`
- `data.export.job.complete`
- `data.export.job.download`
- `data.export.download`

下载审计包含审批单 ID、数据集、文件名、字段、行数、导出原因、筛选条件、水印 ID、管理员、IP 和 User-Agent。

## 7. 验收

回归脚本：

```bash
node scripts/smoke-export-approval.cjs
```

覆盖内容：

- 开启强制审批配置。
- 直接下载被拦截。
- 提交审批申请。
- 审批通过。
- 用不一致筛选条件下载被拦截。
- 用审批单创建导出归档任务。
- 归档任务生成完成并可下载。
- 用审批单下载成功。
- 审批单下载次数回写。
- 导出历史记录审批单 ID。
- 审计日志记录申请、审批和下载。

## 8. 后续增强

- 生产期启用审批人/申请人分离和最少 2 人会签。
- 高敏数据集敏感字段授权。
- 按数据集配置可导字段和脱敏规则。
- 对象存储归档和签名下载链接。
- 导出文件生命周期和销毁审计。
