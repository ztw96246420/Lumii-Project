# 内容安全配置与移动端轻提示联动

日期：2026-07-03

## 背景

运营后台已经支持内容安全总开关、文本关键词规则、腾讯云文本机审和腾讯云图片机审。此前这些配置主要由后端执行，移动端只在提交后收到拦截或送审结果，用户在发布公开内容前无法感知平台审核规则已经开启。

本次补齐移动端轻提示，让后台内容安全配置在 App 公开内容入口可见，同时继续避免泄露具体审核策略。

## 下发字段

`GET /app/config` 的 `moderation` 只下发以下公开字段：

- `enabled`
- `textRulesEnabled`
- `machineTextEnabled`
- `machineImageEnabled`
- `reviewMessage`

以下字段不会下发到移动端：

- `blockKeywords`
- `highRiskKeywords`
- `reviewKeywords`
- 腾讯云 Biztype
- 腾讯云 RequestId
- 供应商策略细节

## 移动端展示位置

当 `moderation.enabled` 开启，并且文本规则、文本机审或图片机审任一能力开启时，移动端会展示内容安全轻提示：

- 发布今日小事：提示公开小事会按平台安全规则校验。
- 宠友圈评论抽屉：提示评论会按平台安全规则校验。
- 地点点评：提示地点点评会按平台安全规则校验。
- 新增地点：提示地点内容会按平台安全规则校验。

提示文案会使用后台配置的 `moderation.reviewMessage` 做复审说明，但不会在 App 暴露具体命中规则。

## 后端与后台

配置联动清单已把以下项标记为移动端已应用：

- `moderation.enabled`
- `moderation.textRulesEnabled`
- `moderation.machineTextEnabled`
- `moderation.machineImageEnabled`

配置联动证据说明：

- 后端仍是唯一可信执行点。
- 移动端只展示粗粒度提示。
- 提交后的阻断、送审、隐藏、审核通过仍以后端接口返回和后台任务池处理结果为准。

## 验证

`scripts/smoke-launch-readiness-content-safety.cjs` 增加了 `/app/config` 验证：

- 启用内容安全配置后，公开 `moderation` 字段会下发到移动端。
- `blockKeywords`、`highRiskKeywords`、`reviewKeywords` 不会出现在 `/app/config`。
- 腾讯云文本和图片机审开启后，上线台账仍会标记内容安全能力 ready。

## 后续问题

- 是否需要在发布按钮附近增加“预计审核时间”文案，目前先不做，避免弱化发布流程。
- 是否需要对私信聊天展示类似提示，目前先不做，因为私信发送体验更依赖即时性，命中时以后端错误提示为准。
