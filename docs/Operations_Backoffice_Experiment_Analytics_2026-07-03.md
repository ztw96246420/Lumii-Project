# 运营后台配置实验观测闭环

版本：2026-07-03

## 1. 背景

配置中心已经支持 `experiments.homeAiEntry`，移动端会通过 `/app/config` 获取首页 AI 对话入口实验配置，并按 `experimentId + 手机号` 做稳定分桶。

本次补齐的是运营后台观测闭环：后台不只允许改 A/B 文案，也能在数据看板里看到实验是否真实曝光、用户是否点击，以及点击后是否继续产生 AI 对话。

## 2. 已落地能力

- 后端 `/admin/analytics` 新增 `experimentMetrics`。
- 数据来源复用移动端已有埋点：
  - `config.experiment_exposure`
  - `pet_chat.entry_click`
- 后台数据看板新增「首页 AI 入口实验观测」卡片。
- 卡片展示当前实验 ID、启用状态、rollout、B 组比例、曝光、点击率、点击后对话估算和当前窗口较优组。
- 明细表按 `experimentId + variant` 展示 A 组 / B 组曝光、点击、点击率、后续对话估算和最近事件时间。
- ECharts 图表展示每组曝光用户、点击用户和点击率。

## 3. 移动端联动

移动端现有逻辑不需要改页面：

- `/app/config` 下发 `experiments.homeAiEntry`。
- App 根据实验 ID、手机号和 rollout 稳定决定是否参与实验。
- 参与用户会稳定分到 A 组或 B 组。
- 首页 AI 入口文案根据分组展示。
- 首页曝光时上报 `config.experiment_exposure`。
- 点击入口时上报 `pet_chat.entry_click`，携带 `experimentId` 和 `variant`。

## 4. 当前数据口径

准确口径：

- 曝光次数：窗口内 `config.experiment_exposure` 事件数。
- 曝光用户：窗口内曝光事件按手机号去重。
- 点击次数：窗口内 `pet_chat.entry_click` 且携带实验 ID 的事件数。
- 点击用户：窗口内点击事件按手机号去重。
- 点击率：点击用户 / 曝光用户。

测试期估算口径：

- 后续对话估算：同一用户点击实验入口后，后端发现该用户产生了宠物 AI 对话用户消息，即视为点击后对话。
- 当前 AI 对话消息本身尚未直接保存 `experimentId`，所以这不是严格归因。

## 5. 后续待澄清

- 是否需要在 AI 对话发送接口中显式传入 `experimentId` 和 `variant`，形成严格归因。
- 是否需要支持多个实验并行，而不只是首页 AI 入口实验。
- 是否需要在后台提供停止实验、一键把较优组发布为默认配置的操作。
- 是否要加入样本量不足提示、置信度或显著性计算。

## 6. 验证

本地烟测：

```bash
node scripts/smoke-analytics-events.cjs
```

该脚本会模拟：

- A 组曝光、点击，并产生一次 AI 对话。
- B 组只曝光不点击。
- `/admin/analytics` 返回对应 A/B 明细、点击率和点击后对话估算。
