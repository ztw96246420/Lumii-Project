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

## 移动端联动

- 复核状态和质量标签仅后台可见，不直接打扰用户。
- “隐藏回复”沿用既有链路，会让移动端 `GET /ai/pet-chat/messages` 不再返回该 AI 回复。
- 后续用户继续聊天时，服务端传给 DeepSeek 的上下文也会跳过被隐藏的 AI 回复，避免问题回复继续污染后续生成。

## 当前边界

- 尚未保存上游模型的完整 request / response 原始报文。
- 尚未做多 reviewer 一致性评分、模型版本分桶和自动回归分析。
- 尚未把 AI 回复送第三方内容安全模型做自动拦截；当前依靠安全门禁、后台队列和人工复核。

## 验收

- `scripts/smoke-pet-chat-quality-review.cjs`
  - 创建真实用户和宠物。
  - 发送高风险 AI 对话。
  - 后台质量队列能看到该 AI 回复。
  - 复核为 `needs_fix` 后自动追加 `quality_issue`。
  - 后台隐藏后，移动端 AI 对话接口不再返回该回复。
