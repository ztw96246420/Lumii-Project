# Lumii 运营后台 AI 外围系统配置

日期：2026-07-01

## 目标

把灵伴形象生成、宠物 AI 对话这类外部 AI 系统从“代码/环境变量硬编码”升级为“后台可看、可配置、可审计、可回滚”的运营能力。

这项能力解决三个问题：

- 运营能看到当前到底怎么告知 AI，包括 provider、model、尺寸/分辨率、prompt 模板和 DeepSeek system prompt。
- 不重新打包 App、不改代码，也能调整新请求使用的 AI provider 和提示词。
- API 密钥不进入后台表单、不下发移动端，只由服务器环境变量读取。

## 当前已支持

配置中心新增 `ai.avatar` 和 `ai.petChat`：

- `ai.avatar.provider`：`gpt-image-2` / `ttapi-flux-edits` / `ttapi-midjourney` / `mock`。
- `ai.avatar.gptImage2.model`
- `ai.avatar.gptImage2.resolution`：`1k` / `2k` / `4k`。
- `ai.avatar.gptImage2.size`：`1:1` / `16:9` / `9:16` / `4:3` / `3:4`。
- `ai.avatar.gptImage2.officialFallback`
- `ai.avatar.gptImage2.promptTemplate`
- `ai.avatar.ttapiFlux.mode`
- `ai.avatar.ttapiFlux.promptTemplate`
- `ai.avatar.ttapiMidjourney.mode`
- `ai.avatar.ttapiMidjourney.timeout`
- `ai.avatar.ttapiMidjourney.autoUpsample`
- `ai.avatar.ttapiMidjourney.promptTemplate`
- `ai.petChat.provider`：`deepseek` / `fallback`。
- `ai.petChat.deepseek.model`
- `ai.petChat.deepseek.thinking`
- `ai.petChat.deepseek.temperature`
- `ai.petChat.deepseek.maxTokens`
- `ai.petChat.deepseek.baseSystemPrompt`

后台配置页展示：

- GPT Image 2 / TTAPI / DeepSeek 密钥是否已在服务器配置。
- 当前启用 provider。
- 每个 provider 的参数摘要。
- 当前 prompt 模板。
- 以示例宠物渲染后的 prompt 预览。
- DeepSeek 对话会追加的动态上下文结构。

## Prompt 模板变量

灵伴形象 prompt 支持：

- `{species}`：`dog` 或 `cat`。
- `{breed}`：宠物档案中的品种；如果没有品种，只使用 `{species}`，不能默认编造具体品种。
- `{petName}`：宠物名。
- `{speciesLabel}`：中文物种名。
- `{mediaUrl}`：仅 Midjourney prompt 使用的公网参考图 URL。

## 运行规则

- 新建 AI 形象任务时读取当前 `ai.avatar.provider`；历史任务继续按任务自身 provider 刷新。
- gpt-image2 请求读取当前 `model`、`resolution`、`size`、`officialFallback` 和 `promptTemplate`。
- TTAPI Flux / Midjourney 作为历史或备用 provider，也读取后台配置。
- 宠物 AI 对话读取当前 `ai.petChat.provider`；`fallback` 不调用外部模型。
- DeepSeek 请求读取当前 `model`、`thinking`、`temperature`、`maxTokens` 和 `baseSystemPrompt`。
- DeepSeek 仍由服务端追加动态上下文：宠物档案、近期体重、备忘、疫苗/驱虫、用户反馈样本和最近对话历史。

## 安全与治理

- `/app/config` 不返回 prompt、provider 和模型参数，只返回移动端需要展示的 AI 额度。
- API 密钥只读取服务器环境变量：`GPT_IMAGE2_API_KEY`、`TTAPI_API_KEY`、`DEEPSEEK_API_KEY`。
- 切换 AI provider 属于 P1 高风险配置，需要输入 `确认发布高风险配置`。
- 修改 gpt-image2 prompt 或 DeepSeek system prompt 属于 P2 风险，会进入版本历史和审计。
- 配置支持保存草稿、发布草稿、提交审批、版本历史和回滚。

## 验收

- 后台能看到当前灵伴形象和 AI 对话的 provider、密钥状态、模型参数和 prompt 预览。
- 后台修改 gpt-image2 prompt 后，新建形象任务使用新 prompt。
- 后台切换 `ai.avatar.provider` 后，新建形象任务进入对应 provider 分支。
- 后台修改 DeepSeek base system prompt 后，新对话请求使用新 system prompt。
- `/app/config` 不暴露 prompt/provider/model 详情。
- 配置发布、草稿、审批、回滚、审计均可复用配置中心既有链路。

## 回归脚本

- `node scripts/smoke-config-ai-ops.cjs`

该脚本覆盖：

- 默认 AI 配置读取。
- 后台 AI runtime 解释数据。
- provider/prompt 发布。
- AI 配置进入版本历史。
- `/app/config` 不泄露 prompt/provider 详情。
