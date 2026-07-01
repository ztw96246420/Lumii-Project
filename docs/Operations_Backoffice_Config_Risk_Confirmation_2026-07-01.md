# 运营后台高风险配置发布确认

## 1. 背景

配置中心会直接影响移动端 `/app/config`，包括维护模式、强制更新、核心功能开关、内容安全开关、系统通知频控等。此前后台已经能识别高风险变更并保存草稿，但直接发布、草稿发布、版本回滚仍可能被误点。

当前项目暂时只有 `admin` 管理员角色，因此本次先落地“单 admin 强确认”：

- 保存草稿不拦截，因为草稿不会影响移动端。
- 真正发布到 `/app/config` 前，命中 P0/P1 风险必须输入固定确认文案。
- 所有发布和回滚继续写审计日志。

## 2. 需要确认的风险范围

后端使用 `configRiskChanges(before, after)` 计算配置差异。命中以下级别会拦截：

- `P0`
- `P1`

当前典型 P0/P1 配置包括：

- 维护模式。
- 强制更新。
- AI 灵伴形象、AI 对话、宠友圈、地图地点、约遛等功能开关。
- 内容安全总开关、腾讯云文本/图片机审开关。
- 阻断/高风险/复审关键词。
- 系统通知频控开关。
- AI 额度被改为 0。

## 3. 后端规则

以下接口会强制校验：

- `PATCH /admin/config`
- `POST /admin/config/drafts/{id}/publish`
- `POST /admin/config/revisions/{id}/rollback`

如果命中 P0/P1 且没有确认，返回：

- HTTP `409`
- error code: `ADMIN_CONFIG_RISK_CONFIRM_REQUIRED`
- data:
  - `confirmText`
  - `blockingRisks`
  - `riskChanges`
  - `reasonMinLength`

继续发布必须提交：

```json
{
  "riskAcknowledged": true,
  "riskConfirmText": "确认发布高风险配置"
}
```

并且 `reason` 至少 4 个字符。

## 4. 后台交互

配置中心“配置发布治理”区新增“发布保护”指标，提示：

- P0/P1 需要确认文案。
- 当前确认文案为：`确认发布高风险配置`。

管理员点击立即发布、发布草稿或回滚时：

1. 后端先按真实配置差异判断风险。
2. 如命中风险，后台弹出风险摘要。
3. 管理员输入固定确认文案。
4. 后台带 `riskAcknowledged/riskConfirmText` 重试发布。

## 5. 移动端联动

该保护不改变移动端协议，但会降低误发高风险配置的概率。配置发布成功后，移动端仍按原逻辑在下一次读取 `/app/config` 时生效。

## 6. 后续仍需补齐

- 多管理员账号。
- 双人审批。
- 超高风险配置的延迟生效/预约发布。
- 配置变更 diff 预览弹窗。
- 配置回滚的影响范围预估。

## 7. 验证

新增 smoke：

```bash
node scripts/smoke-config-risk-confirmation.cjs
```

验证内容：

1. 未确认的维护模式直接发布会被 409 拦截。
2. 输入固定确认文案后可发布。
3. 保存高风险草稿不拦截。
4. 发布高风险草稿必须确认。
5. 回滚到高风险配置版本必须确认。
