# Lumii AI 宠物对话 DeepSeek 接入策略 2026-06-10

## 目标

电子宠物对话要像“真实宠物的电子灵伴”，不是裸聊天机器人。用户输入不会直接裸传给模型，而是由后端拼接用户不可见的产品提示词、宠物档案、健康上下文和少量历史后再请求模型。

## DeepSeek 文档结论

- DeepSeek V4 可通过 OpenAI 兼容格式调用，Base URL 为 `https://api.deepseek.com`，对话接口为 `POST /chat/completions`。
- 当前模型为 `deepseek-v4-flash` 和 `deepseek-v4-pro`；旧的 `deepseek-chat` / `deepseek-reasoner` 将弃用。
- `/chat/completions` 是无状态接口，多轮对话必须由我们每次自行拼接历史。
- DeepSeek 上下文硬盘缓存默认开启，重复前缀可能命中缓存，命中部分会按缓存命中价格计费。
- 返回 `usage` 中包含 token 用量与缓存命中/未命中字段，可用于成本监控。

## MVP 推荐接口与模型

默认使用：

```txt
model=deepseek-v4-flash
thinking.type=disabled
max_tokens=420
temperature=0.7
stream=false
```

原因：
- 宠物陪伴聊天主要是情绪陪伴、日常记录、轻健康提醒，不是复杂推理。
- `deepseek-v4-flash` 输入未命中、输出价格均明显低于 Pro。
- 关闭思考模式可减少延迟和思考链相关成本。
- 非流式实现成本低，先适合 MVP；后续再加流式打字效果。

暂不默认使用：

```txt
deepseek-v4-pro + thinking enabled
```

仅在后续明确需要复杂推理时再开启，例如多天健康趋势分析、复杂喂养计划、跨记录总结。

## 成本控制策略

1. 稳定系统提示词放在第一条 `system` 消息。
   - 这样 DeepSeek 自动缓存更容易命中固定前缀。

2. 宠物上下文单独放在第二条 `system` 消息。
   - 只传必要字段：宠物名、物种、品种、年龄、体重、性格、健康分、最近体重、健康备忘、疫苗计划。
   - 不传全量宠物资料、不传全量健康历史。

3. 历史消息只带最近少量轮次。
   - 当前默认 `PET_CHAT_HISTORY_LIMIT=10` 条消息。
   - 全量历史保存在后端 state，但不全部送模型。

4. 限制单条用户输入。
   - 当前默认 `PET_CHAT_MAX_INPUT_CHARS=600`。
   - 防止用户粘贴大段文本烧 input tokens。

5. 限制输出长度。
   - 当前默认 `PET_CHAT_MAX_TOKENS=420`。
   - 宠物对话不需要长篇回答。

6. 记录 usage。
   - 后端聚合 `prompt_tokens`、`completion_tokens`、`total_tokens`、`prompt_cache_hit_tokens`、`prompt_cache_miss_tokens`。
   - 后续可做管理后台或日志告警。

7. 使用匿名 `user_id`。
   - 后端使用手机号 SHA-256 摘要生成匿名 ID。
   - 不把手机号直接传给 DeepSeek。
   - 有助于 DeepSeek 侧调度隔离与缓存隔离。

## 隐藏提示词策略

后端会加入用户不可见的系统提示词，核心内容：
- 你是 Lumii App 内的 AI 电子宠物陪伴助手，不是通用聊天机器人。
- 你以当前真实宠物的电子灵伴身份说话，但不能声称自己是真实动物或真人。
- 语气温暖、自然、短句、简体中文，通常 1-3 段。
- 优先结合宠物档案和最近健康记录。
- 不能替代兽医诊断，不给处方。
- 出现高风险症状时，引导联系宠物医院或兽医。
- 不索要精确住址、身份证、银行卡等敏感信息。

## 后端环境变量

```txt
DEEPSEEK_API_KEY=服务端密钥，不提交 Git
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_THINKING=disabled
PET_CHAT_HISTORY_LIMIT=10
PET_CHAT_MAX_TOKENS=420
PET_CHAT_MAX_INPUT_CHARS=600
```

## 当前实现状态

- 已新增后端 `GET /ai/pet-chat/messages`：读取当前宠物 AI 聊天历史。
- 已改造后端 `POST /ai/pet-chat/messages`：保存用户消息和 AI 回复。
- 未设置 `DEEPSEEK_API_KEY` 时自动使用本地 fallback 回复，避免开发环境误烧 token。
- 前端聊天页进入时会拉取历史。
- 前端发送消息后继续显示本地发送中/失败状态。
- 云端服务已通过 `DEEPSEEK_API_KEY` 环境变量启用真实 DeepSeek 调用；密钥不进入前端、不提交 Git。

## 云端实测记录

- 测试接口：`POST /ai/pet-chat/messages`
- 测试模型：`deepseek-v4-flash`
- 测试模式：`thinking.type=disabled`
- 测试输入：`今天精神不错`
- 测试结果：模型返回中文宠物陪伴回复，并正确结合宠物名“小云”。
- DeepSeek usage 聚合已增长到：
  - `requests=2`
  - `promptTokens=698`
  - `completionTokens=76`
  - `totalTokens=774`

## 后续增强

- 加流式输出，让聊天像真实打字。
- 对长对话做摘要，而不是无限带历史。
- 按用户/天增加 AI 请求限额。
- 健康风险消息单独标记，后续进入健康备忘或就医提醒。
- 增加“这不像我家宠物”的反馈入口，用于调提示词。
