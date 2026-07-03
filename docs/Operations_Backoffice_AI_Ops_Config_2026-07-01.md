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
- `ai.avatar.gptImage2.promptVersion`
- `ai.avatar.gptImage2.promptTemplate`
- `PET_AVATAR_STAGE_BACKGROUND`：静态灵伴形象和动效共用的 Lumii 舞台底色，默认 `#FFFDFC`，匹配首页“宠物名字 / 品种 / 灵伴在线”所在灵伴信息卡的近似实色，不是 APP 根背景色。GPT Image 2 静态 prompt 应使用同色暖白 matte 背景，不再要求 true transparent / PNG cutout，避免上游把透明预览棋盘格画进结果图。
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
- 新建灵伴形象任务和刷新任务状态后，AI 灵伴页会展示供应商调用轨迹脱敏摘要，用于核对实际请求是否按当前配置执行。

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
- 供应商调用轨迹只记录脱敏摘要：endpoint、method、provider、stage、耗时、prompt hash/长度、图片数量、供应商状态、成本快照和错误摘要。

## 安全与治理

- `/app/config` 不返回 prompt、provider 和模型参数，只返回移动端需要展示的 AI 额度。
- API 密钥只读取服务器环境变量：`GPT_IMAGE2_API_KEY`、`TTAPI_API_KEY`、`DEEPSEEK_API_KEY`。
- 切换 AI provider 属于 P1 高风险配置，需要输入 `确认发布高风险配置`。
- 修改 gpt-image2 prompt 或 DeepSeek system prompt 属于 P2 风险，会进入版本历史和审计。
- 配置支持保存草稿、发布草稿、提交审批、预约发布、版本历史和回滚。
- 调用轨迹不保存 API Key、base64 原图、完整图片 URL 或完整 prompt 原文；如需完整原始报文，需要单独设计更严格的加密存储、留存周期和审批访问。

## 验收

- 后台能看到当前灵伴形象和 AI 对话的 provider、密钥状态、模型参数和 prompt 预览。
- 后台修改 gpt-image2 prompt 后，新建形象任务使用新 prompt。
- 后台切换 `ai.avatar.provider` 后，新建形象任务进入对应 provider 分支。
- 后台修改 DeepSeek base system prompt 后，新对话请求使用新 system prompt。
- `/app/config` 不暴露 prompt/provider/model 详情。
- AI 灵伴页能看到新任务的供应商调用轨迹，且 trace 不泄露 base64 原图或完整 prompt。
- 配置发布、草稿、审批、预约发布、回滚、审计均可复用配置中心既有链路。
- GPT Image 2 Prompt 版本库已独立接入，候选版本可关联 AI 样本池并生成配置草稿；只有草稿发布或审批通过后，`promptVersion` 和 `promptTemplate` 才会影响新建移动端生成任务。

## 回归脚本

- `node scripts/smoke-config-ai-ops.cjs`
- `node scripts/smoke-ai-provider-trace.cjs`

该脚本覆盖：

- 默认 AI 配置读取。
- 后台 AI runtime 解释数据。
- provider/prompt 发布。
- AI 配置进入版本历史。
- `/app/config` 不泄露 prompt/provider 详情。

`smoke-ai-provider-trace.cjs` 会启动本地 fake gpt-image2 服务，覆盖上传、生成、刷新和后台 trace 查询，并确认 trace 不泄露 base64 原图。
