# AI 对话质量抽检复核

日期：2026-07-03

## 目标

把宠物 AI 对话从“可检索、可隐藏”推进到“可抽检、可复核、可沉淀质量样本”。后台仍然使用同一批真实 AI 回复消息，不额外做一套和移动端割裂的数据。

## 后台能力

- `GET /admin/ai/pet-chat/quality-review`
  - 返回 AI 对话质量抽检队列、统计摘要和运营说明。
  - 队列优先级按已隐藏、质量标签、误触发/漏触发、用户“不像它”、医疗风险、宠物日历/档案写入等信号计算。
- `POST /admin/ai/pet-chat/messages/{messageId}/quality-review`
  - 支持 `reviewed`、`safe`、`needs_fix`、`ignored` 四类复核状态。
  - `needs_fix` 会自动给同一条 AI 回复追加 `quality_issue` 标签。
  - 所有复核动作写入 `ai.petChat.quality_review` 审计日志。
- AI 对话页新增“AI 对话质量抽检”面板。
  - 展示待抽检、已复核、需修正、移动端隐藏等指标。
  - 支持查看全文、标已复核、标样本正常、标需修正、隐藏回复。
- AI 回复输出内容安全自动拦截。
  - `POST /ai/pet-chat/messages` 在 AI 回复落库前后会对最终回复文本执行 `pet_chat_ai_reply` 文本审核。
  - 命中 Review / Block 时，原始 AI 回复只保存到后台复核字段，自动标记 `content_safety`、`safety_review` / `safety_block`，并写入内容安全样本池。
  - 该 AI 回复会自动隐藏，进入质量抽检队列；移动端本次响应只收到安全占位文案，不会拿到原始回复。
- AI 回复生成快照。
  - 每条 AI 回复会记录后台专用 `adminAiTrace`，包含 provider、生成来源、模型参数、System Prompt hash/摘要、动态上下文 hash、宠物档案快照和 token 用量。
  - AI 对话列表、质量抽检队列和 `pet_chat_messages` 导出可查看 provider、模型、生成来源和 Prompt hash。
  - 查看全文后展示“生成快照”，用于判断历史回复来自哪版 prompt、哪种模型配置和哪份宠物上下文。

## 移动端联动

- 复核状态和质量标签仅后台可见，不直接打扰用户。
- “隐藏回复”沿用既有链路，会让移动端 `GET /ai/pet-chat/messages` 不再返回该 AI 回复。
- 后续用户继续聊天时，服务端传给 DeepSeek 的上下文也会跳过被隐藏的 AI 回复，避免问题回复继续污染后续生成。
- 机审拦截的 AI 回复同样复用隐藏链路：移动端刷新后不可见，后台可通过“机审拦截”筛选和查看全文复核原文。
- 移动端接口会剥离 `adminAiTrace` 和机审原文；这些字段只供后台查看全文和导出摘要使用。

## 当前边界

- 当前保存的是轻量生成快照，尚未保存上游模型的完整 request / response 原始报文。
- 尚未做多 reviewer 一致性评分、模型版本分桶和自动回归分析。
- 腾讯云机审调用异常按 Review 处理并自动隐藏 AI 回复，生产期偏向 fail closed；如后续要改成降级放行，需要业务和合规共同确认。

## 验收

- `scripts/smoke-pet-chat-quality-review.cjs`
  - 创建真实用户和宠物。
  - 发送高风险 AI 对话。
  - 后台质量队列能看到该 AI 回复。
  - 复核为 `needs_fix` 后自动追加 `quality_issue`。
  - 后台隐藏后，移动端 AI 对话接口不再返回该回复。
  - 后台列表、查看全文和导出能看到生成来源、模型和 Prompt hash；移动端响应与消息列表不暴露 `adminAiTrace`。
  - 开启临时输出审核规则后，AI 回复会自动隐藏，移动端响应不泄露原文，后台“机审拦截”筛选和查看全文能复核原文。
- `scripts/smoke-admin-pet-chat-page.cjs`
  - 后台 AI 对话页查看全文后展示“生成快照”和模型信息。
