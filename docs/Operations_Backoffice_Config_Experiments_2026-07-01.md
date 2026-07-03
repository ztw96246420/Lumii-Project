# 运营后台配置实验与 A/B 分流基座

日期：2026-07-01

## 目标

把配置中心里原本“预留”的实验和 A/B 分流，先落成一条可真实验证的后台到移动端联动链路。

第一期不做完整实验平台，而是支持一个明确业务点：`首页 AI 对话入口文案实验`。

## 已支持

配置中心新增：

- `experiments.homeAiEntry.enabled`：是否启用首页 AI 入口文案实验。
- `experiments.homeAiEntry.id`：实验 ID，移动端用它参与稳定分桶；换 ID 等同于开启新实验。
- `experiments.homeAiEntry.name`：后台展示用实验名称。
- `experiments.homeAiEntry.rolloutPercent`：参与实验流量，0-100。
- `experiments.homeAiEntry.variantBPercent`：进入实验后的 B 组比例，0-100。
- `experiments.homeAiEntry.controlTitle`
- `experiments.homeAiEntry.controlSubtitle`
- `experiments.homeAiEntry.treatmentTitle`
- `experiments.homeAiEntry.treatmentSubtitle`

## 移动端规则

- 移动端读取 `/app/config` 的 `experiments.homeAiEntry`。
- 实验未开启、rollout 为 0 或未命中 rollout 时，首页保持原有本地轮换文案。
- 命中实验后，移动端按 `experimentId + 手机号` 稳定分桶。
- A 组使用 control 文案，B 组使用 treatment 文案。
- 文案支持 `{petName}`，移动端会替换为当前宠物名。
- 当前影响首页两个 AI 对话入口：
  - 顶部问候区的 AI 对话入口。
  - 宠物形象卡片内的轻互动入口。

## 埋点

移动端新增：

- `config.experiment_exposure`：实验曝光。
- `pet_chat.entry_click`：AI 对话入口点击。

事件属性只包含实验 ID、分组、入口来源等结构化字段，不包含聊天正文、用户输入、图片 URL 或地址。

## 数据看板观测

- 数据看板已新增「首页 AI 入口实验观测」。
- 后端 `/admin/analytics` 返回 `experimentMetrics`，按 `experimentId + variant` 聚合曝光、点击、点击率和点击后 AI 对话估算。
- 该观测闭环详见 [Operations_Backoffice_Experiment_Analytics_2026-07-03.md](Operations_Backoffice_Experiment_Analytics_2026-07-03.md)。

## 配置联动体检

配置中心的“配置联动体检”已把 `experiments.homeAiEntry.enabled` 标为移动端联动项：

- 后端证据：`/app/config` 下发 `experiments.homeAiEntry`。
- 移动端证据：按手机号稳定分桶，改变首页 AI 对话入口文案，并上报曝光/点击事件。

原 `experiments` 预留项已移除。

## 尚未完成

- 多实验注册表。
- 实验互斥层。
- 置信度、显著性判断和自动胜出决策。
- 自动停止、自动回滚。
- 面向人群包、设备 ID、宠物 ID 的更多分桶维度。
- 实验结束后的配置归档和胜出版本固化流程。

## 回归脚本

- `node scripts/smoke-config-experiments.cjs`
- `node scripts/smoke-analytics-events.cjs`

脚本覆盖：

- 后台默认实验配置。
- 发布首页 AI 入口实验。
- `/app/config` 下发实验配置。
- 配置联动体检不再出现 `experiments` 预留项。
- `config.experiment_exposure` 和 `pet_chat.entry_click` 可真实上报。
