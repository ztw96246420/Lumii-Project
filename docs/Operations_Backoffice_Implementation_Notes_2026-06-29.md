# 运营后台实现状态与待澄清记录

版本：2026-06-29

## 1. 本轮实现原则

- 后台不是独立样板页，而是由现有 `scripts/lumii-backend.cjs` 服务托管。
- 后台入口：`/admin`
- 后台 API：`/admin/*`
- 移动端公开配置：`/app/config`
- 移动端已经开始读取后台配置，避免后台和 App 割裂。
- 第一版仅支持单一 `admin` 权限管理员；细角色和双人审批先预留。配置发布、系统通知和数据导出已接入单 admin 审批流，可在配置中心强制开启。

## 2. Product Design 设计 brief

已按 Product Design 工作流做设计 brief 播放式确认，用户目标已经明确：

- 产品：Lumii 灵伴运营后台。
- 视觉来源：现有 Lumii App 风格和 `docs/Visual_Style_Guide_v0.md`。
- 设计方向：安静、温暖、可信赖、运营工具感；浅暖背景、白卡、细边线、克制橙色、低饱和状态色。
- 交互级别：完整可操作的第一版后台，不做静态稿。
- 图表组件：使用 Apache ECharts CDN，加载失败时页面保留数据卡片。

补充说明：Product Design 的 `user_context_preflight.py` 文档路径和实际路径不一致；已使用实际路径 `skills/user-context/scripts/user_context_preflight.py` 完成预检，当前没有保存的 Product Design 用户上下文。

## 3. 已实现后台模块

### 3.1 后台入口和登录

- `GET /admin`
- `POST /admin/auth/login`
- `GET /admin/me`
- `GET /admin/accounts`

当前账号：

- 用户名默认：`admin`
- 密码默认：`LumiiAdmin@2026`
- 生产建议必须通过环境变量 `LUMII_ADMIN_USERNAME`、`LUMII_ADMIN_PASSWORD` 覆盖。
- 后台新增一级菜单：账号权限。
- 当前只展示单一 `admin` 账号、当前会话、权限点清单、角色预留、安全检查、最近登录和最近高风险动作。
- 登录失败锁定已接入：连续失败默认 5 次锁定 15 分钟，可通过 `LUMII_ADMIN_LOGIN_MAX_ATTEMPTS` 和 `LUMII_ADMIN_LOGIN_LOCK_MS` 调整。
- 失败登录、触发锁定、锁定期拦截和成功登录后清零失败计数都会写入 `adminAuditLogs`。
- 账号权限页新增登录保护状态和最近失败登录表，方便排查撞库、误输密码或异常 IP。
- 后端 IP 白名单已接入：可通过 `LUMII_ADMIN_IP_ALLOWLIST` / `LUMII_ADMIN_IP_WHITELIST` 配置精确 IP 或 IPv4 CIDR；配置后 `/admin` 页面和 `/admin/*` API 都会拦截非白名单 IP。
- 账号权限页、系统健康页和上线台账会读取同一套 IP 白名单状态；非白名单登录/写请求会写入 `admin.ip_allowlist.blocked` 审计。
- 最近登录与高风险动作来自 `adminAuditLogs`，不新建假多账号数据。
- 不展示密码、密钥或敏感环境变量值，只展示是否由环境变量覆盖。
- 独立说明文档：`docs/Operations_Backoffice_Admin_Security_2026-07-02.md`。

未实现：

- 多后台账号新增/禁用/锁定/重置密码。
- MFA、登录设备管理和离职禁用流程。
- 网关层 IP 白名单；当前为 Node 后端应用层白名单，生产建议在网关/CDN 层同步配置。
- 细角色运行时权限拦截；当前所有开放能力仍由单一 `admin` 访问。

### 3.2 工作台

- `GET /admin/dashboard/summary`

展示：

- 用户总数、已建档用户。
- AI 形象处理中、卡住、ready、failed。
- 宠友圈公开动态、隐藏动态、待处理举报。
- 内容安全统一审核任务、升级任务。
- 地点待审核点评、待审核新增地点。
- 反馈总数和未关闭数。
- 移动端当前配置快照。

### 3.2.1 系统健康

- `GET /admin/system/health`

已支持：

- 后台新增一级菜单：系统健康。
- 展示整体状态、关注项、异常项、运行时长、Node 版本、端口、内存、状态文件大小和更新时间。
- 展示健康检查项：状态文件、后台账号环境变量、维护模式、COS、高德 POI、DeepSeek、灵伴形象 provider、媒体公开访问域名、AI 任务队列和客服 SLA。
- 展示业务积压：AI 灵伴生成、内容安全任务、客服工单、申诉处理、通知运营、移动端事件。
- 展示 JSON state 内关键集合行数，帮助观察文件态后端的数据膨胀。
- 不暴露任何密钥值，只展示关键环境变量或外部能力是否已配置。

未实现：

- 独立 APM、日志告警、错误追踪、服务器 CPU/磁盘全量监控。
- 不可篡改审计存储、数据库健康检查和自动告警通知。

### 3.2.2 上线台账

- `GET /admin/launch/readiness`
- `POST /admin/launch/readiness/questions/{questionId}`

已支持：

- 后台新增一级菜单：上线台账。
- 汇总展示模块成熟度、上线前必须确认的问题、生产风险和配置联动关注项。
- 模块状态使用“测试可用 / 部分可用 / 生产阻断 / 已预留”，避免把测试阶段可用误认为生产级完成。
- 台账读取配置中心联动体检、系统健康、账号权限等现有真实状态，不新建一套割裂的假数据。
- 支持在页面内更新待澄清问题状态、负责人/决策来源和决策备注；更新和重置均写入 `adminAuditLogs`。
- 独立文档：`docs/Operations_Backoffice_Launch_Readiness_Register_2026-06-30.md`。
- 决策记录文档：[Operations_Backoffice_Launch_Readiness_Question_Updates_2026-07-03.md](Operations_Backoffice_Launch_Readiness_Question_Updates_2026-07-03.md)。

未实现：

- 多管理员 owner 分配、审批流、关闭状态流转和上线结论签署。

### 3.3 用户管理

- `GET /admin/users`
- `GET /admin/users/{phone}`
- `GET /admin/users/{phone}/timeline`
- `POST /admin/users/{phone}/notes`
- `POST /admin/users/{phone}/risk-tags`
- `GET /admin/users/{phone}/business-data-summary`
- `POST /admin/users/{phone}/clear-business-data`

已支持：

- 用户列表。
- 用户详情聚合：宠物、AI 用量、AI 任务、反馈、通知、宠友圈动态。
- 用户列表可打开完整用户时间线，聚合账号、宠物、宠物日历、宠友圈内容、招呼/约遛/会话关系、地点、AI、举报处罚、申诉、反馈工单、站内通知和移动端埋点。
- 时间线支持按类型筛选，默认按事件时间倒序；会话类只展示关系、状态、消息数和通知数，不展示私信正文。
- 用户列表快捷禁言 24 小时、冻结 72 小时。
- 用户列表和用户详情展示后台内部运营备注、备注数量、最近备注和风险标签。
- 支持给用户添加运营备注，最多保留最近 30 条，写入 `user.note.create` 审计。
- 支持按白名单更新风险标签，标签包括测试账号、重点用户、需要回访、投诉处理中、违规观察、疑似骚扰、疑似违规、被频繁拉黑和 AI 异常样本，写入 `user.risk_tags.update` 审计。
- 用户列表展示被拉黑次数、不同拉黑用户数和最高频拉黑原因；当账号被 3 个不同用户拉黑时，后端自动打上 `被频繁拉黑` 风险标签并写入 `user.risk_tags.auto_blocked` 审计，该标签只用于后台排查，不自动处罚。
- 用户账号 CSV 导出新增运营风险标签、运营备注数和最近运营备注字段。
- 账号状态和生效处罚会在用户列表展示。
- 用户列表支持高危操作“清理业务数据”：先拉取清理预览，再要求填写原因和完整手机号确认。
- 清理范围覆盖宠物档案、宠物日历、AI 素材/任务/额度、宠物 AI 对话、宠友圈、点赞/评论/举报、黑名单、招呼、约遛、会话、地点收藏/点评/提交、通知、推送设备、反馈和工单。
- 清理后移动端 `/me` 会返回 `activePet=null`，用户重新进入时回到无宠物业务数据状态；账号壳、昵称、头像、简介、设置、权限、短信登录记录、后台审计日志、系统通知批次、后台备注和风险标签保留。
- 清理动作写入 `adminAuditLogs`，action 为 `user.clear_business_data`，审计中只保存清理前后摘要和用户概览，不导出被清理内容原文。
- 详见 `docs/Operations_Backoffice_User_Data_Clear_2026-06-30.md`。
- 用户备注与风险标签详见 `docs/Operations_Backoffice_User_Notes_Risk_Tags_2026-06-30.md`。
- 用户时间线详见 `docs/Operations_Backoffice_User_Timeline_2026-07-01.md`。

### 3.3.1 宠物档案

- `GET /admin/pets`
- `GET /admin/pets/{petId}`
- `PATCH /admin/pets/{petId}`
- `POST /admin/pets/{petId}/media/{avatar|ai-avatar|cover}/clear`
- `POST /admin/pets/{petId}/media/{avatar|ai-avatar|cover}/replace`

已支持：

- 后台新增一级菜单：宠物档案。
- 全局只读排查页聚合所有真实用户宠物档案。
- 支持按物种、生日完整度、形象状态、手机号/主人/宠物名/品种/宠物 ID/AI 任务 ID 搜索。
- 生日完整度区分：未知、仅年份、年月、完整日期、格式异常。
- 形象状态区分：缺头像、普通头像、AI 形象已应用、有宠友圈封面。
- AI 形象已应用通过 `avatarUrl`、`avatarJobs.acceptedPetId` 与 `ready` 状态共同判断，避免清空头像后仍误判为 AI 形象。
- 表格展示主人、默认宠物、物种/品种/性别/生日/年龄、体重、最近 AI 任务、宠物日历记录数、宠友圈小事数、地点点评数、最近关联时间和媒体治理操作。
- 支持后台修正宠物昵称、类型、品种、性别、生日和体重；复用移动端同一套资料校验与内容安全规则。
- 修正资料必须填写原因，会写入 `adminAuditLogs`，action 为 `pet.profile.update`，并给用户写入站内通知。
- 修正资料会直接更新 `users.pets`，移动端 `/pets`、`/me`、首页宠物卡片、宠物日历和 AI 对话上下文下一次刷新都会读取新值。
- 支持清空违规普通头像、AI 灵伴形象、宠友圈封面。
- 清空媒体会写入 `adminAuditLogs`，action 分别为 `pet.media.clear_avatar`、`pet.media.clear_ai_avatar`、`pet.media.clear_cover`。
- 清空媒体会强制给用户写入站内通知，并在移动端下一次刷新、登录或重新拉取 `/me` / 宠友圈资料时影响真实展示。
- 支持使用公开图片 URL 替换普通头像、AI 灵伴形象或宠友圈封面；替换前会校验图片公开可见状态，外部图片会先走图片内容安全再镜像进站内存储。
- 替换头像会解除旧 AI 形象任务的 `acceptedPetId` 关联，并清空旧动效字段，避免移动端继续播放过期素材；替换封面会同步影响宠友圈主页封面。
- 替换 AI 灵伴形象会创建 `provider=admin`、`status=ready` 的已应用 AI 形象任务，并清空旧动效字段，确保后台 AI 状态和移动端 `avatarUrl` 使用同一份数据。
- 替换媒体会写入 `adminAuditLogs`，action 分别为 `pet.media.replace_avatar`、`pet.media.replace_ai_avatar`、`pet.media.replace_cover`，并给用户写入站内通知。
- 数据导出新增宠物档案 CSV。
- 独立说明文档：[Operations_Backoffice_Pet_Media_Moderation_2026-06-30.md](Operations_Backoffice_Pet_Media_Moderation_2026-06-30.md)。
- 资料修正文档：[Operations_Backoffice_Pet_Profile_Edit_2026-07-03.md](Operations_Backoffice_Pet_Profile_Edit_2026-07-03.md)。
- 媒体替换文档：[Operations_Backoffice_Pet_Media_Replace_2026-07-03.md](Operations_Backoffice_Pet_Media_Replace_2026-07-03.md)。

暂未开放：

- 合并重复宠物档案。
- 合并动作会影响首页、AI 对话、宠物日历、宠友圈和会话引用，需要更细权限和引用迁移后再开放。

### 3.4 AI 灵伴

- `GET /admin/ai/avatar-jobs`
- `GET /admin/ai/usage`
- `GET /admin/ai/media`
- `GET /admin/ai/avatar-feedback`
- `POST /admin/ai/avatar-feedback/{jobId}/review`
- `GET /admin/ai/avatar-samples`
- `POST /admin/ai/avatar-jobs/{jobId}/samples`
- `POST /admin/ai/avatar-samples/{sampleId}/review`
- `POST /admin/ai/avatar-jobs/{jobId}/refresh`
- `POST /admin/ai/avatar-jobs/{jobId}/retry`
- `POST /admin/ai/avatar-jobs/{jobId}/mark-failed`
- `POST /admin/ai/avatar-jobs/{jobId}/refund-quota`

已支持：

- 后台 AI 灵伴页已聚合生成任务、上传素材和生成反馈。
- 查看任务、用户、宠物、provider、进度、错误、原始 mediaId 和结果预览。
- 查看上传素材质量：good / warning / blocked、质量分、分析码、分析标题、来源、文件类型、关联任务数。
- 查看用户生成反馈：原因、补充内容、用户、宠物、任务、provider、反馈时间和处理状态。
- 支持按反馈状态、反馈原因、关键词筛选生成反馈。
- 支持按素材质量、关键词筛选上传素材。
- 支持将用户生成反馈标记为已处理，写入处理人、处理时间、备注和审计日志。
- 查看 AI 用量成本：今日灵伴形象消耗、今日 AI 对话消耗、额度触顶用户、DeepSeek 请求和 token、平均回复字数、gpt-image2 累计成本和 credits。
- 查看供应商监控：当前启用 provider、历史/备用 provider、请求数、成功失败、任务 ready/processing/stuck、平均耗时、成功率和 Top 错误码。
- AI 灵伴页使用 ECharts 展示 provider ready / failed / stuck 对比。
- 新任务会沉淀 AI 供应商调用轨迹：submit / status / action 的 endpoint、耗时、供应商状态、prompt hash、输入数量、成本快照和错误摘要；后台任务列表、供应商明细和 CSV 导出均可查看脱敏摘要。
- AI 灵伴页新增“AI 样本池”：运营可从任务行将生成反馈沉淀为提示词优化样本，将失败、卡住或 trace 异常沉淀为供应商异常样本，也保留素材质量样本类型；样本支持待复盘、已复核、已忽略状态，支持按类型、状态和关键词筛选。
- 移动端提交 AI 灵伴生成反馈后会自动沉淀 `prompt_quality` 样本；供应商提交失败、状态查询连续异常或超时失败会自动沉淀 `provider_anomaly` 样本。自动入池只增加后台复盘待办，不改变移动端头像、任务结果或线上 prompt。
- AI 样本保存用户、宠物、任务、供应商、反馈原因、调用轨迹数量和成本快照等脱敏快照；复核、忽略和重复更新都会写入 `ai.avatar.sample.*` 审计日志。
- 配置中心新增 GPT Image 2 Prompt 版本库：支持从当前线上配置存档、把当前编辑区保存为候选版本、关联 AI 样本 ID、生成配置草稿和归档。候选版本不会直接影响移动端，必须发布配置草稿或审批通过后才会进入新生成任务。
- 配置中心已支持 AI 外围系统配置：查看并配置灵伴形象 provider、gpt-image2 model/resolution/size/prompt、TTAPI 备用 provider prompt、宠物 AI 对话 provider、DeepSeek model/thinking/temperature/max_tokens/system prompt。
- 后台 `GET /admin/config` 返回 AI runtime 解释数据：密钥状态、当前 provider、参数摘要、prompt 模板和示例渲染后的 prompt 预览。
- 刷新上游任务状态。
- 重试。
- 后台标记失败。
- 返还形象生成额度。
- 写入审计日志。
- 数据导出新增 AI 上传素材、AI 生成反馈、AI 灵伴样本池、AI 供应商用量 CSV；AI 任务 CSV 新增调用轨迹数量、最近调用阶段、最近调用状态、供应商任务 ID 和成本快照；不导出图片二进制或 base64 原图。
- 独立说明文档：[Operations_Backoffice_AI_Avatar_Samples_2026-07-03.md](Operations_Backoffice_AI_Avatar_Samples_2026-07-03.md)。
- 独立说明文档：[Operations_Backoffice_AI_Provider_Trace_2026-07-03.md](Operations_Backoffice_AI_Provider_Trace_2026-07-03.md)。

当前限制：

- 新任务已沉淀供应商调用脱敏摘要和成本快照；历史任务没有 trace，且当前不保存完整原始 request / response。
- 已记录 submit / status / action 调用耗时；queued / running / completed 等更细 SLA 节点仍依赖上游返回。
- 已开放“加入提示词样本集”和“供应商异常样本”的后台沉淀入口；尚未开放直接应用结果图到宠物头像等会影响移动端展示的高权限动作。
- AI Prompt 版本库已支持候选版本、样本关联和生成配置草稿；尚未做候选版本 diff、按人群灰度、样本批量重跑评测或自动回滚。

### 3.4.1 AI 对话

- `GET /admin/ai/pet-chat/messages`
- `GET /admin/ai/pet-chat/quality-review`
- `POST /admin/ai/pet-chat/messages/{messageId}/view`
- `POST /admin/ai/pet-chat/messages/{messageId}/tag`
- `POST /admin/ai/pet-chat/messages/{messageId}/quality-review`
- `POST /admin/ai/pet-chat/messages/{messageId}/hide`

已支持：

- 后台新增一级菜单：AI 对话。
- 列表按 AI 回复维度展示用户、宠物、模型、时间、用户提问摘要、AI 回复摘要、医疗风险、自动写入和管理员处理状态。
- 支持按全部、医疗风险、自动写入、已隐藏筛选，并支持手机号、宠物名、提问、回复内容搜索。
- 默认列表只展示摘要；管理员查看完整上下文必须填写查看原因。
- 查看完整上下文会写入审计日志，action 为 `ai.petChat.view`，记录手机号、宠物、消息 ID 和查看原因。
- 支持给 AI 回复标记 `quality_issue`、`medical_sample`、`false_positive`、`false_negative`，用于沉淀质量问题、医疗风险样本、误杀和漏杀样本。
- 标记动作会写入审计日志，action 为 `ai.petChat.tag`，记录标签、原因和操作者。
- 新增 AI 对话质量抽检队列，按隐藏、质量标签、误触发/漏触发、用户“不像它”、医疗风险和业务写入自动排序。
- 支持将 AI 回复复核为 `reviewed`、`safe`、`needs_fix`、`ignored`；`needs_fix` 会自动追加 `quality_issue` 标签。
- 复核动作会写入审计日志，action 为 `ai.petChat.quality_review`，记录复核状态、原因、操作者、手机号和宠物 ID。
- 支持隐藏不适合继续展示的 AI 回复，必须填写处理原因。
- 隐藏动作会写入审计日志，action 为 `ai.petChat.hide`，记录原因、操作者、手机号、宠物和消息 ID。
- 移动端 `GET /ai/pet-chat/messages` 已排除被后台隐藏的 AI 回复。
- 用户继续对话时，DeepSeek 上下文已跳过被后台隐藏的 AI 回复，避免问题回复继续影响后续生成。
- AI 回复输出已接内容安全自动拦截：最终回复文本按 `pet_chat_ai_reply` 走文本审核，命中 Review/Block 时自动隐藏原回复、只给移动端返回安全占位文案，并把原文留在后台“机审拦截”筛选和质量抽检队列中复核。
- 输出审核命中会写入内容安全样本池，保留 Biztype、RequestId、风险标签和风险分，方便运营复盘误杀/漏杀。

当前限制：

- 尚未保存上游模型的完整 request / response 原始报文，只能基于当前业务消息和上下文排查。
- AI 对话质量抽检队列已按业务风险排序；尚未做多 reviewer 一致性评分、模型版本分桶和自动回归分析。
- 腾讯云机审异常会按 Review 自动隐藏 AI 回复，生产期偏向安全兜底；是否改成降级放行仍需后续业务/合规确认。

### 3.5 宠友圈

- `GET /admin/social/posts`
- `GET /admin/social/comments`
- `POST /admin/social/posts/{postId}/hide`
- `POST /admin/social/posts/{postId}/restore`
- `POST /admin/social/posts/{postId}/delete`
- `POST /admin/social/comments/{commentId}/hide`
- `POST /admin/social/comments/{commentId}/restore`
- `POST /admin/social/comments/{commentId}/delete`
- `POST /admin/social/posts/{postId}/evidence`
- `POST /admin/social/comments/{commentId}/evidence`

已支持：

- 动态列表。
- 评论列表。
- 动态隐藏、恢复、删除。
- 评论隐藏、恢复、删除。
- 动态/评论作者快捷处罚：宠友圈后台可直接对作者警告、禁言 24h 或冻结 72h，后端会固化内容证据快照、写处罚流水、写审计，并通知用户跳转安全中心。
- 动态/评论证据详情入口：宠友圈后台可在列表中直接查看内容快照、图片、举报、评论、作者当前限制、直接关联处罚和近期审计；查看必须填写原因，并写入 `social.post.evidence.view` / `social.comment.evidence.view` 审计。
- App 可见性已排除 `hidden` 动态和评论。
- 删除动态会清理点赞和评论展示。
- 作者处罚会复用用户处罚体系，移动端发布、评论、点赞、打招呼、约遛、私信、地点投稿和地点点评等写接口会实时受禁言/冻结/封禁影响。
- 独立说明文档：[Operations_Backoffice_Social_Author_Sanction_2026-07-02.md](Operations_Backoffice_Social_Author_Sanction_2026-07-02.md)。
- 独立说明文档：[Operations_Backoffice_Social_Evidence_Detail_2026-07-02.md](Operations_Backoffice_Social_Evidence_Detail_2026-07-02.md)。

未实现：

- 申诉。
- 独立证据快照表、图片证据长期归档和水印化取证。

### 3.6 举报中心

- `GET /admin/social/reports`
- `POST /admin/social/reports/{reportId}/resolve`

已支持：

- 举报列表。
- 标记有效、无效、关闭、升级、处理中。
- 写入审核人、审核时间、审核原因。
- 举报处理为有效/无效/关闭时，会向举报人写入 App 通知中心；有效举报会同步通知被举报内容作者并跳转安全中心。
- 后台举报列表会显示举报人和作者侧结果通知时间，方便运营确认触达闭环。
- 举报创建时会固化一份 `evidenceSnapshot`，包含被举报内容文本、图片 URL、作者、举报人、举报原因、目标状态、快照 ID 和快照时间。
- 举报中心会展示证据快照是否已固化、快照时间、目标状态、图片数量和内容摘要；旧数据如暂无快照，会在后台读取或处理时补齐。
- 有效举报会自动生成处罚建议并复用同一份固化证据快照，运营可在举报中心按建议创建处罚。
- 按建议创建处罚后，会关联原举报、处罚模板、被举报目标和证据快照。
- 有效举报通知会携带 `reportId`、`targetType` 和 `targetId`，方便移动端通知中心和后续深链定位具体对象。
- 私信消息举报已接入同一举报中心，`targetType=message`；举报后先对举报者隐藏，运营在后台处理为“有效并隐藏/删除”后，会同步隐藏/删除双方会话中的对应消息。
- 私信消息举报支持在举报中心按原因查看上下文窗口，查看动作写入 `social.report.message_context.view` 审计；上下文只围绕被举报消息展开，不开放任意会话全文检索。
- 私信消息举报支持标记疑似骚扰，会给被举报用户增加 `suspected_harassment` 风险标签，并写入 `social.report.message.harassment_flag` 审计。
- 举报 CSV 导出新增证据快照 ID、快照时间、目标状态和内容摘要字段。
- 独立说明文档：[Operations_Backoffice_Report_Evidence_Snapshot_2026-06-30.md](Operations_Backoffice_Report_Evidence_Snapshot_2026-06-30.md)。
- 举报处罚联动验收文档：[Operations_Backoffice_Report_Sanction_Linkage_2026-07-01.md](Operations_Backoffice_Report_Sanction_Linkage_2026-07-01.md)。

### 3.7 地图地点

- `GET /admin/places`
- `GET /admin/places/{placeId}`
- `PATCH /admin/places/{placeId}`
- `POST /admin/places/{placeId}/merge`
- `GET /admin/places/reviews`
- `POST /admin/places/reviews/{reviewId}/approve`
- `POST /admin/places/reviews/{reviewId}/reject`
- `GET /places/{placeId}/reviews`
- `GET /admin/places/moderation-templates`
- `POST /admin/places/moderation-templates`
- `PATCH /admin/places/moderation-templates/{templateId}`
- `POST /admin/places/moderation-templates/{templateId}/delete`
- `GET /admin/places/submissions`
- `GET /admin/places/contributions`
- `POST /admin/places/submissions/{submissionId}/approve`
- `POST /admin/places/submissions/{submissionId}/reject`
- `POST /admin/places/submissions/{submissionId}/link-existing`

已支持：

- 点评审核通过/驳回。
- 新增地点审核通过/驳回。
- 新增地点通过后创建 `manual` 来源地点，宠物友好状态为 `candidate`。
- 新增地点可由后台关联到已有地点，视为审核通过并把提交图片补充进目标地点 `photoUrls`。
- 新增地点审核通过会记录地点贡献者账本：发现新地点 `+10` 贡献分，补充已有地点 `+5` 贡献分；地点目录展示贡献者数量，后台新增贡献者卡片。
- 点评和新增地点审核通过/驳回后，会向提交人写入 App 通知中心；移动端沿用 `place_review` / `place_submission` 通知入口，并在新增地点结果页展示审核状态、原因和贡献分。
- 配置中心新增 `places.contributionBadgesEnabled` 和 `places.contributionBadgeMinPoints`；移动端“我的”页会在开关开启且用户达到门槛时展示地点共建者徽章。
- 地点点评审核通过后，会进入 App 地点详情的“社区点评”公开列表；审核中和驳回点评不公开。
- App 地点详情的公开点评可被用户举报；举报进入后台举报中心和统一内容安全任务池，`targetType=place_review`，有效并隐藏/删除后公开列表不再展示该点评。
- 后台地点点评/新增地点审核表会显示结果通知时间。
- `GET /admin/places` 已返回地点目录治理对象，包含质量分、质量证据、重复候选数和重复候选明细。
- 后台地图地点页新增地点质量治理卡片，展示地点总数、平均质量分、重复候选、待治理地点和明细表。
- 移动端 `/places/nearby`、`/places/search`、`/places/{id}` 已同步返回 `qualityScore`、`qualityLabel`、`qualityReasons` 和 `duplicateCandidateCount`；移动端排序在距离/评分/点评相同时用质量分兜底。
- 后台支持地点详情编辑：名称、地址、分类、宠物友好状态、支持宠物、标签、经纬度和封面图 URL，保存时写入 `place.update` 审计。
- 后台支持人工确认地点合并：源地点会从目录移除，目标地点合并标签/支持宠物/来源 ID，并迁移地点点评、通过后的新增地点提交、收藏、通知和约遛引用，写入 `place.merge` 审计。
- 地点点评/新增地点已支持图片上传：移动端先上传到统一 `/media/uploads`，按 `place_review` / `place_submission` 走图片内容安全；通过后的图片 URL 随点评/提交入库，后台地点审核页展示缩略图。
- 新增地点审核通过后，会把提交图片中的第一张可见图写为 `manual` 地点封面，并保留到 `photoUrls`。
- 统一图片审核池已识别地点点评/新增地点图片引用，隐藏/驳回后公共图片 URL 不再可见，相关图片处理写入 `media.moderation.*` 审计。
- 地点点评和新增地点审核支持内置原因模板；运营可以套用模板后编辑最终原因。
- 内容安全任务池处理地点点评/新增地点时，也支持同一套审核原因模板。
- 审核记录会保存 `reviewTemplateId`、`reviewTemplateLabel` 和最终 `reviewReason`。
- 地点点评/新增地点 CSV 导出新增“审核模板ID”和“审核模板”字段；新增 `place_contributions` CSV 导出贡献记录。
- 后台地点页支持自定义地点审核模板维护：新增、编辑、启用/停用、排序、删除；内置模板只读。
- 模板变更会写入审计日志：`place.template.create`、`place.template.update`、`place.template.delete`。
- 独立说明文档：[Operations_Backoffice_Place_Moderation_Templates_2026-06-30.md](Operations_Backoffice_Place_Moderation_Templates_2026-06-30.md)。

当前限制：

- 贡献分当前已支持用户本人公开徽章和轻量等级展示；排行榜、活动奖励或兑换规则仍需另行确认。

### 3.8 反馈工单

- `GET /admin/feedback`
- `PATCH /admin/feedback/{feedbackId}`
- `GET /admin/tickets`
- `GET /admin/tickets/{ticketId}`
- `POST /admin/tickets/batch`
- `GET /admin/tickets/reply-templates`
- `POST /admin/tickets/reply-templates`
- `POST /admin/tickets/reply-templates/{templateId}/delete`
- `POST /admin/tickets/{ticketId}/assign`
- `POST /admin/tickets/{ticketId}/notes`
- `POST /admin/tickets/{ticketId}/reply`
- `POST /admin/tickets/{ticketId}/status`
- `PATCH /admin/tickets/{ticketId}`
- `GET /support/tickets`
- `GET /support/tickets/{ticketId}`
- `POST /support/tickets/{ticketId}/reply`
- `POST /support/tickets/{ticketId}/rate`
- `POST /support/tickets/{ticketId}/reopen`

已支持：

- App `/feedback` 提交后自动生成工单。
- 历史 feedback 会在后台读取时自动迁移为工单，不需要单独脚本。
- 后台新增“反馈收集”一级菜单，用于查看 App 原始反馈、按状态/分类/关键词筛选，并快速转处理中或关闭。
- 工单中心一级菜单负责正式客服闭环；反馈收集页和工单中心共享同一条 `feedback -> supportTicket` 链路。
- 状态筛选：未关闭、新反馈、处理中、等待用户、已解决、已关闭、全部。
- 优先级筛选：紧急、高、普通、低。
- 搜索：手机号、内容、工单 ID。
- 工单卡片展示：SLA、优先级、状态、负责人、联系方式、备注数、回复数、关联对象。
- 分配负责人。
- 修改状态和优先级。
- 批量处理勾选工单：批量分配、转处理中、等待用户、已解决、关闭、改优先级。
- 后台可编辑工单关联对象，格式支持 `post:xxx`、`comment:xxx`、`avatar_job:xxx` 等类型/ID。
- 添加内部备注。
- 客服回复。
- 客服回复支持内置模板和自定义模板；模板可设置默认回复后状态和是否通知用户，套用后仍可二次编辑。
- 客服回复可同步生成移动端 `support_reply` 系统通知，用户可在 App 通知中心看到。
- 移动端“我的反馈”页面已接入设置页入口，支持查看反馈列表、状态、处理记录和客服回复。
- 通知中心点击 `support_reply` 会直接打开对应工单详情；老通知缺少 `ticketId` 时打开我的反馈列表。
- 用户可在工单未关闭前补充文本或图片截图，补充后工单状态回到 `reviewing`，后台工单中心可继续处理。
- 工单初始反馈和用户补充均支持图片附件；后端复用现有媒体代理访问链路，但不走宠物照片识别，避免截图被误判。
- 工单关闭或已解决后，用户可提交 1-5 分满意度和可选说明；后台工单卡片展示满意度。
- 工单关闭或已解决后，用户可用文字或截图重新打开原工单；重开后状态回到 `reviewing`，并累计 `reopenCount`。
- 移动端“反馈详情”已支持附件缩略图、补充截图、关闭后评价、重新打开。
- 后台工单卡片展示附件数、用户重开次数、满意度评分和满意度说明。
- 冻结/封禁用户仍允许访问和补充 `/support/tickets`，方便申诉和客服沟通。
- `/admin/feedback` 返回原始反馈列表和汇总指标，状态更新会同步到对应工单。
- 工作台反馈统计改为基于工单：未关闭、紧急、SLA 超时。
- 配置中心新增客服工单首响 SLA、解决 SLA、负责人枚举和排班；保存后影响工单排序、SLA 标记、未分配/离班统计、负责人分配校验、导出和移动端预计响应文案。
- 移动端“我的反馈”列表/详情会展示未结束工单的预计响应时间。
- `/app/config` 只下发首响/解决 SLA，不下发客服负责人枚举和排班。
- 工单 CSV 导出新增首响 SLA、解决 SLA、负责人名称和负责人排班字段。
- 独立说明文档：[Operations_Backoffice_Ticket_SLA_Config_2026-06-30.md](Operations_Backoffice_Ticket_SLA_Config_2026-06-30.md)。
- 工单 SLA 与排班说明文档：[Operations_Backoffice_Ticket_SLA_Roster_2026-07-01.md](Operations_Backoffice_Ticket_SLA_Roster_2026-07-01.md)。
- 工单中心新增客服质量统计、负责人绩效视角、排班冲突提示和批量处理复盘；统计从 `supportTickets`、移动端评分、用户重开、审计日志和配置排班实时回算。
- 工单质量复盘说明文档：[Operations_Backoffice_Ticket_Quality_Review_2026-07-01.md](Operations_Backoffice_Ticket_Quality_Review_2026-07-01.md)。
- 工单中心新增批量回复审批、近 7 天/近 30 天 KPI 目标对照和质检待看队列；批量回复审批通过后复用单工单回复逻辑触达移动端通知中心。
- 工单批量回复审批说明文档：[Operations_Backoffice_Ticket_Batch_Reply_Approval_2026-07-01.md](Operations_Backoffice_Ticket_Batch_Reply_Approval_2026-07-01.md)。
- 工单中心新增周/月服务复盘和外包结算预览；按工单最近活动时间回算近 7 天/近 30 天 KPI，并基于已解决、首响达标、好评、低分、重开和 SLA 未达标计算负责人预估金额。
- 工单周/月服务复盘与结算预览说明文档：[Operations_Backoffice_Ticket_Service_KPI_Settlement_2026-07-01.md](Operations_Backoffice_Ticket_Service_KPI_Settlement_2026-07-01.md)。

未实现：

- 更正式的客服质检制度仍待业务确认，例如自然周/月或排班周期锁账、外包客服真实付款审批/导出/税费、抽检申诉流程、批量回复双人审批和发送撤回策略。

### 3.9 配置中心

- `GET /admin/config`
- `PATCH /admin/config`
- `GET /admin/config/approvals`
- `POST /admin/config/approvals`
- `POST /admin/config/approvals/{approvalId}/approve`
- `POST /admin/config/approvals/{approvalId}/cancel`
- `POST /admin/config/revisions/{revisionId}/rollback`
- `GET /admin/ai/prompt-versions`
- `POST /admin/ai/prompt-versions`
- `POST /admin/ai/prompt-versions/{versionId}/draft`
- `POST /admin/ai/prompt-versions/{versionId}/archive`
- `GET /app/config`

当前配置字段：

- `ai.petAvatarDailyLimit`
- `ai.petChatDailyLimit`
- `ai.avatar.provider`
- `ai.avatar.gptImage2.model`
- `ai.avatar.gptImage2.resolution`
- `ai.avatar.gptImage2.size`
- `ai.avatar.gptImage2.officialFallback`
- `ai.avatar.gptImage2.promptVersion`
- `ai.avatar.gptImage2.promptTemplate`
- `ai.avatar.ttapiFlux.mode`
- `ai.avatar.ttapiFlux.promptTemplate`
- `ai.avatar.ttapiMidjourney.mode`
- `ai.avatar.ttapiMidjourney.timeout`
- `ai.avatar.ttapiMidjourney.autoUpsample`
- `ai.avatar.ttapiMidjourney.promptTemplate`
- `ai.petChat.provider`
- `ai.petChat.deepseek.model`
- `ai.petChat.deepseek.thinking`
- `ai.petChat.deepseek.temperature`
- `ai.petChat.deepseek.maxTokens`
- `ai.petChat.deepseek.baseSystemPrompt`
- `configApproval.requireApproval`
- `configApproval.approvalExpiresHours`
- `social.petCircleMaxPhotos`
- `social.discoverRadiusKm`
- `social.nearbyMomentTtlDays`
- `features.aiAvatar`
- `features.petChat`
- `features.petCircle`
- `features.places`
- `features.walkInvite`
- `app.maintenanceEnabled`
- `app.maintenanceMessage`
- `app.announcement.enabled`
- `app.announcement.version`
- `app.announcement.title`
- `app.announcement.body`
- `app.announcement.actionLabel`
- `app.announcement.actionRoute`
- `app.update.enabled`
- `app.update.force`
- `app.update.minVersion`
- `app.update.latestVersion`
- `app.update.rolloutPercent`
- `app.update.androidUrl`
- `app.update.iosUrl`
- `app.update.title`
- `app.update.subtitle`
- `app.splash.enabled`
- `app.splash.version`
- `app.splash.title`
- `app.splash.body`
- `app.splash.imageUrl`
- `app.splash.actionLabel`
- `app.splash.actionRoute`
- `moderation.enabled`
- `moderation.textRulesEnabled`
- `moderation.blockKeywords`
- `moderation.highRiskKeywords`
- `moderation.reviewKeywords`
- `moderation.blockMessage`
- `moderation.reviewMessage`

移动端已接入：

- `social.petCircleMaxPhotos`：发布今日小事图片上限和 UI 计数。
- `social.discoverRadiusKm`：附近发现和地图定位请求半径。
- `social.nearbyMomentTtlDays`：附近宠友圈列表文案和客户端兜底过滤；后端仍是公开可见性的权威过滤。
- `ai.petAvatarDailyLimit`：AI 形象额度兜底展示。
- `ai.petChatDailyLimit`：AI 对话额度兜底展示。
- `ai.avatar.*` / `ai.petChat.*`：仅后台和服务端使用，控制外部 AI provider、模型参数和 prompt；移动端 `/app/config` 不暴露这些字段。
- `features.aiAvatar`：隐藏/拦截 AI 灵伴形象上传、生成、重试入口；后端返回 `FEATURE_DISABLED`。
- `features.petChat`：隐藏/拦截 AI 宠物对话入口和消息预加载；后端返回 `FEATURE_DISABLED`。
- `features.petCircle`：隐藏/拦截宠友圈、发布小事、我的小事、评论/点赞/举报/封面入口；后端返回 `FEATURE_DISABLED`。
- `features.places`：隐藏/拦截地图地点、地点详情、地点点评/提交入口；后端返回 `FEATURE_DISABLED`。
- `features.walkInvite`：拦截约遛邀请入口和创建接口；后端返回 `FEATURE_DISABLED`。
- `app.maintenanceEnabled`：App 进入维护页并隐藏底部导航；后端拦截非 GET 写操作，保留反馈、工单补充、退出登录、刷新 token、通知已读等基础接口。
- `app.maintenanceMessage`：维护页和后端 `APP_MAINTENANCE` 响应共用文案。
- `app.announcement`：后台可开启 App 公告弹窗；移动端在登录后展示，按手机号和版本号记录已读，同一版本每个用户只展示一次；支持跳转首页、发现、地图、我的、安全中心、设置、通知中心、反馈进度。
- `app.update`：后台可配置强制更新/可选更新、最低可用版本、最新版本、Android/iOS 下载地址和灰度比例；移动端读取后按当前 App 版本比较，强制更新不可关闭并隐藏底部导航，可选更新按用户手机号稳定灰度展示并支持“稍后再说”。
- `app.splash`：后台可配置启动提示版本、标题、正文、图片和跳转；移动端登录后按手机号和提示版本记录已读，同一版本每个用户只展示一次；展示优先级低于版本更新、高于普通 App 公告。
- `moderation.enabled` / `moderation.textRulesEnabled`：后端实时读取，用于拦截或送审小事、评论、地点点评和新增地点提交；移动端公开配置只返回开关和复审提示，不暴露关键词。

配置发布治理已接入：

- `GET /admin/config` 会返回 `linkage.summary` 和 `linkage.items`，用于展示配置联动体检。
- `POST /admin/config/drafts` 可把当前表单保存为配置草稿，不影响移动端 `/app/config`。
- `POST /admin/config/drafts/{draftId}/publish` 发布草稿，写入当前配置、生成 `draft_publish` 版本，并影响移动端下次拉取。
- `POST /admin/config/drafts/{draftId}/discard` 废弃草稿，保留审计记录。
- `POST /admin/config/approvals` 可提交立即发布、草稿发布或回滚版本的审批申请，不影响移动端 `/app/config`。
- `POST /admin/config/approvals/{approvalId}/approve` 审批通过后才会写入当前配置、生成 `approval_publish` / `approval_draft_publish` / `approval_rollback` 版本，并影响移动端下次拉取。
- `POST /admin/config/approvals/{approvalId}/cancel` 可取消待审批配置申请。
- 配置中心页面已展示每个配置项是否“前后端联动 / 后端强制 / 移动端联动 / 预留”，并列出后端证据、移动端证据、用户影响和运营备注。
- 配置中心页面新增“配置发布治理”区，展示待发布草稿、高风险草稿、待审批配置、最近草稿时间和配置版本数。
- 配置草稿和版本历史会记录变更摘要与风险项，当前高风险项覆盖维护模式、强制更新、核心功能开关、内容安全总开关、腾讯云机审开关、关键词规则和 AI provider 切换。
- 高风险配置发布确认已接入：`PATCH /admin/config`、发布草稿、回滚版本命中 P0/P1 风险时，后端返回 `ADMIN_CONFIG_RISK_CONFIRM_REQUIRED`；后台展示风险摘要，要求输入 `确认发布高风险配置` 后才会重试发布。
- 独立文档：[Operations_Backoffice_Config_Risk_Confirmation_2026-07-01.md](Operations_Backoffice_Config_Risk_Confirmation_2026-07-01.md)。
- AI 外围系统配置已接入：配置中心新增“AI 外围系统配置”区，支持查看当前如何告知 AI、切换 provider、编辑 gpt-image2/TTAPI prompt 和 DeepSeek system prompt。独立文档：[Operations_Backoffice_AI_Ops_Config_2026-07-01.md](Operations_Backoffice_AI_Ops_Config_2026-07-01.md)。
- 配置发布审批已接入：配置中心新增 `configApproval.requireApproval` 和 `configApproval.approvalExpiresHours`；开启强制审批后，直接发布、发布草稿和回滚版本会返回 `ADMIN_CONFIG_APPROVAL_REQUIRED`，必须先提交审批。
- 审批通过时会校验当前配置是否仍等于提交审批时的基线配置；如果期间配置已变化，会返回 `ADMIN_CONFIG_APPROVAL_STALE`，要求重新提交审批。
- 配置审批创建、审批通过、取消分别写入 `config.approval.create`、`config.approval.approve`、`config.approval.cancel`。
- 独立文档：[Operations_Backoffice_Config_Approval_2026-07-01.md](Operations_Backoffice_Config_Approval_2026-07-01.md)。
- 配置预约发布已接入：`POST /admin/config/schedules` 支持当前表单发布、草稿发布和版本回滚的预约；`GET /admin/config/schedules` 查看预约；`POST /admin/config/schedules/{scheduleId}/cancel` 取消预约。
- 预约发布会保存创建时的 `baseConfig`。到点前如果当前配置已经变化，预约任务会标记 `failed`，不会覆盖新配置；成功发布会生成 `scheduled_publish` / `scheduled_draft_publish` / `scheduled_rollback` 版本。
- 配置预约创建、到点发布、取消和失败分别写入 `config.schedule.create`、`config.schedule.publish`、`config.schedule.cancel`、`config.schedule.fail`。
- 独立文档：[Operations_Backoffice_Config_Scheduled_Publish_2026-07-01.md](Operations_Backoffice_Config_Scheduled_Publish_2026-07-01.md)。
- 实验和 A/B 分流基座已接入：配置中心新增 `experiments.homeAiEntry`，移动端首页 AI 对话入口按手机号稳定分桶展示 A/B 文案，并上报 `config.experiment_exposure` 和 `pet_chat.entry_click`。
- 数据看板已新增首页 AI 入口实验观测：`/admin/analytics` 返回 `experimentMetrics`，按 `experimentId + variant` 聚合曝光、点击、点击率和点击后 AI 对话估算；详见 [Operations_Backoffice_Experiment_Analytics_2026-07-03.md](Operations_Backoffice_Experiment_Analytics_2026-07-03.md)。
- 独立文档：[Operations_Backoffice_Config_Experiments_2026-07-01.md](Operations_Backoffice_Config_Experiments_2026-07-01.md)。
- 数据导出新增配置联动体检 CSV。
- 独立文档：[Operations_Backoffice_Config_Linkage_2026-06-30.md](Operations_Backoffice_Config_Linkage_2026-06-30.md)。
- 后台配置页展示最近 12 个配置版本，后端最多保留最近 80 个快照。
- 每次 `PATCH /admin/config` 保存都会生成一条 `publish` 版本，记录版本 ID、发布时间、发布人、发布原因和配置摘要。
- 支持在后台点“回滚到此版本”，调用 `POST /admin/config/revisions/{revisionId}/rollback`。
- 回滚会把当前配置恢复到目标版本快照，同时生成一条新的 `rollback` 版本，并记录 `sourceRevisionId`。
- 回滚动作写入审计日志，action 为 `config.rollback`；普通保存写入 `config.update`。
- 草稿创建、发布、废弃分别写入 `config.draft.create`、`config.draft.publish`、`config.draft.discard`。
- 新增回归脚本：`node scripts/smoke-config-approval.cjs`，覆盖强制审批、直接发布拦截、审批后 `/app/config` 生效、草稿审批、回滚审批和审计日志。
- 新增回归脚本：`node scripts/smoke-config-experiments.cjs`，覆盖首页 AI 入口实验配置、`/app/config` 下发、联动体检和曝光/点击事件上报。
- 扩展回归脚本：`node scripts/smoke-place-contributions.cjs`，覆盖地点贡献账本、`/me.placeContributionSummary`、贡献徽章配置发布和 `/app/config` 下发。
- 移动端无需改包，下一次读取 `/app/config` 后立即按回滚后的功能开关、维护模式、公告、更新策略、图片上限、附近半径和附近小事展示天数等配置生效。

移动端暂未完整接入：暂无。

### 3.10 审计日志

- `GET /admin/audit-logs`

已支持：

- 后台登录。
- AI 任务操作。
- 宠友圈/评论操作。
- 举报处理。
- 地点审核。
- 反馈状态变更。
- 配置变更与回滚。
- 用户处罚新增与撤销。
- 用户处罚/举报申诉接手、通过与驳回。
- 举报处罚建议执行。
- 审计日志页支持按动作、目标类型、管理员、时间范围和关键词筛选。
- 审计日志页展示匹配数、高风险动作数、缺少原因数和可筛动作/对象数。
- 从本版本开始，后台登录和后台请求触发的审计会记录 IP 和 User-Agent；历史审计和用户侧工单补充类审计可能为空。

### 3.11 用户处罚

- `GET /admin/sanctions`
- `GET /admin/sanction-policy-review`
- `GET /admin/sanction-templates`
- `GET /admin/users/{phone}/sanctions`
- `POST /admin/users/{phone}/sanctions`
- `POST /admin/users/{phone}/sanctions/{sanctionId}/revoke`
- `GET /admin/sanction-appeals`
- `POST /admin/sanction-appeals/{appealId}/review`
- `POST /admin/sanction-appeals/{appealId}/approve`
- `POST /admin/sanction-appeals/{appealId}/reject`
- `GET /sanction-appeals`
- `POST /sanction-appeals`

已支持：

- 处罚类型：`warning` 警告、`mute` 禁言、`freeze` 冻结、`ban` 封禁。
- 后台内置处罚模板：社区提醒、举报成立禁言 24 小时、重复违规冻结 72 小时、严重违规长期封禁。
- 后台创建处罚，支持小时级时长；时长为 `0` 表示长期有效。
- 后台创建处罚可关联模板 ID、来源、举报 ID、被举报目标和证据快照。
- 后台撤销处罚。
- 处罚流水状态实时计算：`active`、`expired`、`revoked`。
- 用户列表展示账号状态和生效处罚。
- 用户列表快捷禁言 24 小时、冻结 72 小时。
- 工作台展示生效处罚数量。
- 账号快照返回 `accountStatus` 与 `sanctions`，移动端可读取。
- 移动端接口已受后端处罚状态影响：
  - 禁言会拦截发布小事、宠友圈评论、点赞、打招呼、约遛、私信、宠友圈封面、地点投稿、地点点评。
  - 冻结/封禁会拦截大多数写操作。
  - 反馈、工单进度/补充、token refresh、通知已读保留，方便用户继续申诉或完成低风险状态同步。
- 安全中心已增加账号限制申诉卡片，用户可查看最近申诉记录，并在存在生效禁言/冻结/封禁时提交申诉。
- 冻结/封禁用户仍允许访问和提交 `/sanction-appeals`，避免账号被限制后没有入口解释问题。
- 安全中心已增加举报处理申诉卡片；举报人可对无效/关闭的举报结果申诉，被举报方可对有效举报结果申诉。
- 移动端 `GET /sanction-appeals` 返回账号申诉记录和可申诉的举报处理结果；`POST /report-appeals` 用于提交举报处理申诉。
- 后台一级菜单“申诉中心”已统一展示账号处罚申诉和举报处理申诉，支持状态、类型、关键词筛选、接手、通过、驳回。
- 举报处理申诉通过/驳回会写入 `report.appeal.*` 审计，并向用户写入 App 通知中心，点击跳转安全中心；第一版不自动恢复内容或撤销处罚，需要运营按具体对象继续处理。
- 申诉通过时默认联动撤销原处罚，也可在卡片中取消“通过时撤销处罚”。
- 举报中心处理为有效时，会自动生成处罚建议，建议包含处罚类型、时长、原因和被举报内容快照。
- 举报中心支持按建议一键创建处罚，处罚会保留举报来源、处罚模板和证据快照，并写入 `social.report.sanction` 审计日志。
- 内容安全任务池把举报处理为有效时，也会生成同样的处罚建议，避免两个入口逻辑不一致。
- 用户处罚页新增处罚策略复盘：从处罚流水、申诉、举报处罚建议和移动端生效限制回算模板命中、申诉推翻率、来源质量、重复违规用户和待处理处罚建议。
- 处罚新增、撤销、到期、申诉结果会写入 App 通知中心，并跳转到安全中心。
- 所有处罚新增/撤销、申诉接手/通过/驳回写入审计日志。
- 举报处理申诉详见 `docs/Operations_Backoffice_Report_Appeals_2026-07-01.md`。
- 处罚策略复盘详见 `docs/Operations_Backoffice_Sanction_Policy_Review_2026-07-03.md`。

未实现：

- 多管理员复核与双人审批。
- 自动升级处罚策略。

### 3.12 内容安全任务池

- `GET /admin/moderation/tasks`
- `POST /admin/moderation/tasks/batch`
- `POST /admin/moderation/tasks/{taskId}/assign`
- `POST /admin/moderation/tasks/{taskId}/{action}`
- `POST /admin/moderation/samples/{sampleId}/review`

已支持：

- 新增后台一级菜单：内容安全。
- 统一聚合以下任务：
  - 用户举报。
  - 被举报宠友圈动态。
  - 被举报宠友圈评论。
  - 待审核地点点评。
  - 待审核新增地点。
- 配置中心已支持内容安全文本规则：
  - 阻断关键词：命中后直接拒绝提交，并沉淀命中样本。
  - 高风险关键词：命中后进入人工审核，风险分更高。
  - 复审关键词：命中后进入人工审核。
- 配置中心已支持腾讯云机审开关：
  - `moderation.machineTextEnabled`：启用后，私信聊天、AI 回复输出、宠友圈小事、评论、地点点评、新增地点、宠物资料文本会调用腾讯云文本内容安全。
  - `moderation.machineImageEnabled`：启用后，宠物头像、AI 原图、宠友圈图片、宠友圈封面、地点点评图片、新增地点图片、工单附件会调用腾讯云图片内容安全。
  - 腾讯云凭据只从服务器环境变量读取，后台只显示“已配置/未配置”和 Biztype 映射，不展示密钥。
  - 上线台账会读取 `adminContentSafetyStatus()`：服务器密钥、文本机审开关、图片机审开关均就绪时，内容安全供应商和图片审核 P0 不再标为阻断；否则明确列出缺失项。
- 规则接入范围：
  - 宠友圈小事：命中复审/高风险后状态为 `pending_review`，不进入附近公开列表，内容安全池可通过、隐藏、删除。
  - 宠友圈评论：命中 Review 后写入 `pending_review`，不通知被评论人；后台通过后再产生评论可见性和提醒。
  - 地点点评/新增地点：仍按待审核流程提交，命中规则会抬高风险分并沉淀样本。
  - 宠物资料文本：命中 Block/Review 时不保存公开资料，提示用户修改后再提交。
  - 私信聊天：普通文本按 `conversation_message` 场景机审；命中阻断/复审时不写入双方消息，机审异常只记录样本不阻断聊天。
  - AI 回复输出：最终回复按 `pet_chat_ai_reply` 场景机审；命中 Review/Block 时自动隐藏原回复，移动端只收到安全占位文案，后台进入 AI 对话质量抽检和内容安全样本池。
  - 图片内容：Pass 自动可见；Review 进入图片审核池且不公开展示；Block/驳回后不可公开访问。
- 内容安全页展示最近规则和腾讯云机审命中样本，保留 Biztype、RequestId、风险标签和风险分，便于人工复核误杀。
- 配置中心新增 `moderation.sampleReviewRatePercent`，用于按比例稳定抽样已通过的公开内容；该配置只在后端生效，不下发移动端。
- 内容安全页新增“内容安全样本复盘”，区分风险命中样本和抽样复审样本。
- 样本支持人工标记：确认风险、误杀、漏杀、忽略；复审说明、处理人、处理时间和结论都会写入样本并进入审计日志。
- 样本复审只用于规则/模型质量治理，不会自动改变用户内容可见性；隐藏、删除、驳回、通过仍走任务池或图片审核池。
- 数据看板新增安全样本复审、待复审样本、误杀/漏杀和复审率口径，抽样复审不再计入规则命中。
- 数据导出新增内容安全样本 CSV，包含样本类型、机审动作、复审结论、业务场景、风险标签、Biztype、RequestId、供应商建议和复审说明。
- 移动端已消费 `/app/config.moderation` 的公开字段，在发布小事、评论、地点点评和新增地点入口展示内容安全轻提示；关键词、Biztype 和供应商策略仍不下发。详见 `docs/Operations_Backoffice_Content_Safety_Mobile_Hints_2026-07-03.md`。
- 支持状态筛选：待处理、已升级、处理中、已处理、全部。
- 支持手机号、内容、任务 ID 搜索。
- 任务卡片展示来源、风险分、风险标签、作者、举报人、对象状态、正文摘要、创建时间。
- 任务卡片展示负责人、SLA 到期时间和 SLA 状态；SLA 由任务类型与风险分自动计算，高风险任务优先级更高。
- 支持单任务认领，认领信息写入 `moderationTaskMeta` 并进入审计日志。
- 支持批量处理选中任务：批量认领、接手、举报无效、隐藏、通过、驳回；后端逐条返回成功/失败数量。
- 处理动作会写审计日志并回写原业务对象：
  - 举报：接手、无效关闭、升级、有效并隐藏、有效并删除。
  - 动态：通过、隐藏、恢复、删除。
  - 评论：隐藏、恢复、删除。
  - 地点点评：通过、驳回。
  - 新增地点：通过、驳回，通过后创建 `manual` 地点。
- 移动端联动：
  - 动态/评论被隐藏或删除后，App 列表、详情和评论列表不再展示。
  - 私信消息被举报后先从举报者会话隐藏；后台有效并隐藏/删除后，双方会话都不再展示该消息。
  - 地点点评/新增地点仍沿用原审核状态，移动端继续读取对应状态。
  - 小事进入 `pending_review` 时，发布端会提示“宠友圈内容已进入审核”。
  - 举报处理结果会写入举报人 App 通知中心；有效举报会通知被举报内容作者。
  - 举报处理为有效、有效并隐藏或有效并删除时，会确保举报证据快照已经固化，并与处罚建议共用同一份快照。
  - 地点点评/新增地点审核结果会写入提交人 App 通知中心。

独立说明文档：

- `docs/Operations_Backoffice_Moderation_Sample_Review_2026-07-01.md`

未实现：

- 内容安全供应商异步回调和模型误杀申诉归因。
- 后台多审核员、角色权限、双人复核和审核质检统计。
- 图片类证据的长期归档和水印化取证。

### 3.13 通知运营

- `GET /admin/notifications`
- `GET /admin/push-devices`
- `POST /admin/notifications/system`
- `POST /admin/notifications/{id}/cancel`
- `POST /admin/notifications/templates`
- `POST /admin/notifications/templates/{id}/delete`
- `POST /admin/notifications/audience-packages`
- `POST /admin/notifications/audience-packages/{id}/delete`

已支持：

- 后台新增一级菜单：通知运营。
- 系统通知发送器：标题、正文、目标范围、点击跳转、是否尊重用户通知开关。
- 目标范围：
  - 全部用户。
  - 今日活跃用户，按 `lastSeenAt` 近 24 小时计算。
  - 通知人群包，保存常用手机号集合，发送时只触达当前已注册用户。
  - 指定手机号，支持换行、逗号、空格分隔。
- 发送后生成 `systemNotifications` 批次记录，记录发送人、目标数、送达数、跳过数、目标样本、创建时间。
- 发送动作写入 `adminAuditLogs`，action 为 `notification.system.send`。
- 通知会写入目标用户的 App 通知中心：
  - 默认尊重用户 `pushNotifications` 开关。
  - 重要通知可选择不尊重用户通知开关，强制进入站内通知中心。
- 移动端通知中心已支持后台系统通知携带 `actionRoute`，可跳转到：首页、发现、地图、我的、安全中心、设置、通知中心、反馈进度。
- 后台展示最近设备 token 概览，为后续接入厂商 Push 服务预留。
- 工作台新增通知触达指标：发送批次、推送设备数。
- 通知运营页新增内置模板和自定义模板，运营可把当前标题、正文、跳转、是否尊重用户通知开关保存为模板，也可一键套用到发送表单。
- 系统通知新增草稿和预约发送状态：草稿不会触达用户；预约通知由后端定时扫描，到点后写入目标用户 App 通知中心。
- 通知历史支持套用历史通知、取消预约、作废草稿、撤回已发送通知；撤回已发送通知会从用户站内通知列表移除对应 campaign。
- 通知运营页顶部指标新增草稿数和预约数。
- 配置中心新增系统通知频控：可配置 24 小时批次上限、单用户 24 小时入站上限和开关；立即发送和预约到点发送都由后端执行。
- 通知运营页顶部展示频控余量和单用户上限；批次超限会整批失败，单用户超限会跳过该用户并在通知历史显示频控跳过数。
- 通知批次效果统计已接入：移动端打开通知上报 `campaignId`，后端按站内通知 `read/readAt` 和 `notification.open` 事件回算已读、点击、打开率、最近点击时间；通知运营页和数据看板同步展示。
- 通知运营页新增灰度人群包：可保存人群包名称、备注和手机号清单；后台展示手机号总数、可触达数、未注册数、样本和上次送达数；立即发送和预约发送都会按人群包当前手机号重新计算目标。
- 系统通知对象深链已接入：后台可指定宠友圈小事、地图地点、地点提交、客服工单、会话、备忘、疫苗/驱虫计划的对象 ID；后端发送前校验对象存在，移动端点击系统通知时优先打开具体对象。
- 系统通知发送审批已接入：通知可提交为 `pending_approval`，待审批时不会写入用户 App 通知中心；审批通过后才会立即发送或转为预约发送。
- 配置中心新增“强制系统通知发送审批”开关：开启后后端会拒绝直接发送和直接预约，要求先提交审批；该开关进入配置联动体检和高风险配置确认。
- 配置触达效果统计已接入：App 公告、启动提示、版本更新弹窗分别上报展示和主按钮点击，后端在 `summary.configPrompts` 聚合展示量、点击量和点击率；数据看板增加“配置触达”和配置展示/点击趋势。
- 详细口径见 `docs/Operations_Backoffice_Notification_Campaign_Stats_2026-07-01.md`、`docs/Operations_Backoffice_Notification_Audience_Packages_2026-07-01.md`、`docs/Operations_Backoffice_Notification_Deep_Links_2026-07-01.md` 和 `docs/Operations_Backoffice_Notification_Approval_2026-07-01.md`。

未实现：

- 真实厂商 Push 下发，例如 FCM、APNs、华为/小米/OPPO/VIVO 推送。
- 厂商 Push 真实送达、展示、点击回执和 token 失效原因统计。
- 多管理员双人审批；当前单 admin 版本已接入发送审批保护。

### 3.14 宠物日历

- `GET /admin/pet-calendar`
- `POST /admin/pet-calendar`
- `POST /admin/pet-calendar/batch`
- `PATCH /admin/pet-calendar/{recordId}`
- `POST /admin/pet-calendar/{recordId}/delete`
- `POST /admin/pet-calendar/{recordId}/restore`

已支持：

- 后台新增一级菜单：宠物日历。
- 运营文案统一使用“宠物日历”，后端技术 store 仍沿用 `health` 命名。
- 全局排查页聚合移动端真实日历记录：
  - 体重。
  - 疫苗/驱虫。
  - 备忘。
  - 宠友圈同步备忘。
  - AI 对话自动创建备忘、体重和医疗门禁提醒。
- 支持按类型、状态、来源、日期区间、手机号/宠物/标题/记录 ID 搜索。
- 支持按记录状态筛选：有效记录、已删除、全部。
- 顶部 KPI 覆盖：当前筛选记录数、体重记录、疫苗/驱虫、备忘、提醒开启、AI 写入。
- 后台不会调用会初始化默认记录的 C 端列表函数，只读取已持久化 state，避免打开后台制造默认日历数据。
- 疫苗/驱虫后台可区分 `due`、`overdue`、`done`；移动端仍按产品口径把未完成统一展示为“计划中”。
- 后台支持带原因修正记录：
  - 体重：`kg`、记录日期、备注；修正后同步宠物档案最新体重。
  - 疫苗/驱虫：名称、计划日期、`due / overdue / done` 状态、提醒开关；完成状态会关闭提醒。
  - 备忘：标题、内容、提醒时间、提醒开关、重复频率。
- 后台支持带原因新增记录：
  - 体重：写入真实 `/health/weights`，来源标记为“运营新增”，并同步宠物档案最新体重。
  - 疫苗/驱虫：写入真实 `/health/vaccines`，可开启提醒；完成状态会强制关闭提醒。
  - 备忘：写入真实 `/health/memos`，支持提醒时间和重复频率。
- 修正动作写入 `calendar.record.update` 审计，包含 before/after、手机号、宠物 ID、记录类型和变更字段。
- 新增动作写入 `calendar.record.create` 审计，包含手机号、宠物 ID、记录类型、记录快照和原因。
- 修正后给用户写入“宠物日历记录已修正”站内通知；疫苗/驱虫被标记完成时同时复用完成通知口径。
- 新增后给用户写入“宠物日历记录已新增”站内通知，移动端下一次刷新对应 `/health/*` 即可看到记录。
- 后台支持带原因软删除和恢复记录：
  - 删除会从真实 `/health/*` store 移除记录，移动端下一次刷新不再展示。
  - 删除快照保存在 `health.deletedRecords`，保留原记录、提醒开关、删除人、删除时间和原因。
  - 恢复会把快照写回原 store；体重会重算宠物档案最新体重，疫苗/驱虫会恢复提醒开关。
  - 删除、恢复分别写入 `calendar.record.delete` / `calendar.record.restore` 审计，并给用户写入站内通知。
- 后台支持批量删除和批量恢复，单次最多 50 条；每条仍逐条写审计和通知，批量动作额外写入 `calendar.record.batch.delete` / `calendar.record.batch.restore` 汇总审计。
- 数据导出新增宠物日历 CSV。

暂未开放：

- 宠物日历高风险动作的双人复核和多角色权限。

### 3.15 消息、招呼与约遛

- `GET /admin/social-relations`
- `POST /admin/social-relations/{relationId}/repair`
- `POST /admin/social-relations/{relationId}/message-context`
- `POST /admin/social-relations/messages/{messageId}/hide`

已支持：

- 后台新增一级菜单：关系消息。
- 全局只读排查页聚合：
  - 招呼：普通发现页招呼、宠友圈小事招呼。
  - 约遛：约遛邀请、待处理/已接受状态。
  - 会话：双方会话摘要、消息数、未读和相关通知。
  - 拉黑：拉黑双方、拉黑原因、补充说明、消息数和相关通知。
- 支持按类型、状态、手机号/宠物/地点/动态 ID/会话 ID 搜索。
- 顶部 KPI 覆盖：关系记录、待处理、已接受、招呼、约遛、会话消息和拉黑记录。
- 会话默认只展示摘要，不展示完整私信正文；摘要会基础脱敏手机号、邮箱和微信号。
- 会话行支持点击“上下文”后填写查看原因，后台只返回该关系最近消息窗口，不开放任意全文搜索；查看写入 `social.relation.message_context.view` 审计。
- 上下文窗口内可隐藏非系统消息；隐藏写入 `social.relation.message.hide` 审计，并同步隐藏双方移动端会话里的对应消息。
- 隐藏消息后会重新计算双方会话列表摘要，避免 App 会话列表继续露出被隐藏文本。
- 待处理招呼/约遛支持“修复接受”和“关闭”；修复接受会补齐 accepted 关系、双方会话入口和可发消息状态，关闭会清理待处理请求/邀请的可回复状态。
- 关系状态修复写入 `social.relation.repair.accept` / `social.relation.repair.close` 审计，必须填写原因。
- 关系消息页展示拉黑原因统计，支持按 `block` 类型筛选，CSV 导出新增拉黑原因和补充说明字段。
- 约遛接收方回复会自动接受关系的现有移动端/后端逻辑已可在本页通过状态排查。
- 数据导出新增关系消息 CSV。
- 移动端拉黑接口 `POST /social/blocks` 已支持传入 `reasonCode` 和 `reason`；当前宠友圈卡片主动拉黑默认传 `no_interest`，黑名单列表展示拉黑原因。
- 独立说明文档：[Operations_Backoffice_Social_Block_Risk_2026-07-01.md](Operations_Backoffice_Social_Block_Risk_2026-07-01.md)。
- 私信上下文独立说明文档：[Operations_Backoffice_Social_Relation_Message_Context_2026-07-03.md](Operations_Backoffice_Social_Relation_Message_Context_2026-07-03.md)。
- 异常关系修复说明文档：[Operations_Backoffice_Social_Relation_Repair_2026-07-03.md](Operations_Backoffice_Social_Relation_Repair_2026-07-03.md)。

暂未开放：

- 任意会话全文检索；目前只允许从已有关系行或私信消息举报查看最近上下文窗口。
- 后台直接改写/补发双方私信消息仍未开放；关系修复只补系统消息和状态，不允许编辑用户正文。
- 隐藏消息后的自动处罚联动仍需从举报中心、内容安全任务或用户处罚页处理。

### 3.16 数据导出

- `GET /admin/exports`
- `GET /admin/exports/history`
- `GET /admin/exports/approvals`
- `POST /admin/exports/approvals`
- `POST /admin/exports/approvals/{approvalId}/approve`
- `POST /admin/exports/approvals/{approvalId}/cancel`
- `GET /admin/exports/{type}.csv`

已支持：

- 后台新增一级菜单：数据导出。
- 支持 22 类 CSV 数据集：
  - 用户账号。
  - 宠物档案。
  - 宠物日历。
  - 关系消息。
  - AI 灵伴任务。
  - AI 上传素材。
  - AI 生成反馈。
  - AI 供应商用量。
  - 配置联动体检。
  - 内容安全任务。
  - 内容安全样本。
  - 宠友圈小事。
  - 宠友圈评论。
  - 举报记录。
  - 地点目录。
  - 地点点评。
  - 新增地点。
  - 地点贡献。
  - 工单。
  - 用户处罚。
  - 移动端事件。
  - 审计日志。
- 导出目录展示每个数据集的当前行数、单次上限和字段摘要。
- 导出目录展示敏感字段提示，例如手机号、内容、地址、经纬度、设备、原因、备注等，帮助运营判断是否需要审批。
- 导出目录支持按数据集、状态、手机号、开始/结束日期和关键词筛选，页面会展示匹配行数与原始行数。
- 导出页新增“导出审批”区域，支持按状态筛选审批单、提交当前筛选条件的导出申请、审批通过、取消和按审批单下载。
- 导出页展示最近导出记录，包含数据集、文件名、水印 ID、导出原因、筛选条件、导出行数、匹配行数、管理员、IP、User-Agent 和时间。
- CSV 下载需要管理员登录态，前端通过 Bearer token 拉取，不暴露公开下载链接。
- CSV 下载必须填写导出原因，后端会强制校验，绕过前端也不能无原因导出。
- 配置中心新增“强制数据导出审批”和“审批有效期小时数”。开启后，直接下载会返回 `ADMIN_EXPORT_APPROVAL_REQUIRED`，必须提交审批并审批通过后才能下载。
- 审批下载会校验数据集、筛选条件和导出原因，任一不一致会返回 `ADMIN_EXPORT_APPROVAL_MISMATCH`，避免拿旧审批下载不同数据。
- 审批通过后在有效期内可下载，下载次数和最近下载时间会回写审批单；审批过期、取消或未通过时不能下载。
- CSV 每行追加导出水印列：水印 ID、导出时间、管理员、导出原因和筛选条件，用于泄漏追踪和内部复盘。
- 每个 CSV 默认最多导出 1000 行，避免误导出超大文件。
- 导出申请、审批通过、取消和下载都会写入 `adminAuditLogs`；下载 action 为 `data.export.download`，记录数据集、文件名、字段、行数、导出原因、筛选条件、水印 ID 和审批单 ID。
- 默认不导出图片二进制、设备 token、完整审计 before/after 快照等大字段或敏感字段。
- 新增回归脚本：`node scripts/smoke-export-approval.cjs`，覆盖强制审批、审批创建、审批通过、筛选不一致拦截、带审批下载、下载次数、导出历史和审计日志。

未实现：

- 多管理员双人确认和审批人/申请人分离。
- 异步大文件导出、过期下载链接和对象存储归档。
- 独立导出任务表、文件归档和更完整的审批状态流转。
- 按更细字段做数据集专属筛选，例如举报原因、地点 ID、AI 供应商、工单优先级等。

### 3.17 数据看板

- `GET /admin/analytics?days=14`
- 支持查询参数：
  - `days=7|14|30|60|90`
  - `eventName`
  - `route`
  - `source`
  - `platform`
  - `q`

已支持：

- 后台新增一级菜单：数据看板。
- 默认按最近 14 天生成日粒度趋势桶。
  - 顶部 KPI 覆盖：
    - 新增用户、窗口内活跃、建档率。
    - AI 形象成功率、平均耗时、GPT Image 成本累计。
    - AI 前端漏斗：入口点击、开始生成、前端成功、前端失败。
    - 宠友圈小事、图片、评论。
    - 宠友圈前端互动：卡片曝光、点赞点击、评论点击、打招呼点击、约遛点击。
    - 移动端事件、事件用户数、采样率。
  - 地图打开、POI 搜索、地点详情查看。
  - 内容安全任务与已处理数量。
- ECharts 图表覆盖：
  - 用户增长与活跃。
    - AI 使用质量：前端开始、形象启动、成功、失败、AI 对话。
    - 社交互动：小事、点赞、评论、小事卡片曝光、小事点击、招呼、约遛。
    - 移动端行为：页面浏览、首页模块曝光、发现曝光、小事卡片曝光、地图打开、POI 搜索、地点详情、通知点击。
  - 运营处理压力：审核任务、地点点评、新增地点、工单。
- 业务健康快照覆盖：
  - 附近可见率。
  - 推送开启率和推送设备数。
  - AI 灵伴完成人群。
  - 宠物日历记录量。
  - 疫苗/驱虫提醒开启数。
  - 打招呼接受率。
  - 发现曝光事件、地图打开事件、地点详情事件。
  - 地点审核通过率。
  - 举报有效率。
- 看板明确展示剩余数据口径缺口，避免把厂商回执、严格留存等尚未采集的口径假装成真实数据。
- 已补测试期轻量漏斗：
  - AI 灵伴生成：入口点击 -> 开始生成 -> 生成成功。
  - 宠友圈浏览互动：进入发现 -> 小事加载 -> 卡片曝光 -> 产生互动。
  - 地图地点行为：打开地图 -> POI 搜索 -> 查看详情 -> 打开导航。
  - 配置触达点击：展示 -> 点击。
- 已补测试期轻量 Cohort：
  - 按用户注册日分组。
  - D0 为注册用户数，D1/D3/D7 基于移动端事件去重判断回访。
  - 页面明确标注仍非生产级长期留存口径。
- 已补事件明细筛选：
  - 可按时间窗口、事件名、页面 route、source、platform 和关键词筛选。
  - 明细继续使用后端敏感字段过滤后的属性摘要，不暴露搜索词、地址、经纬度、正文、图片 URL、token 或密码。
- 最近 7 天明细表用于核对趋势图背后的日汇总。

当前口径限制：

- 已补移动端基础事件埋点：页面浏览、首页模块曝光、AI 形象前端漏斗、发现曝光、附近伙伴加载、小事加载、小事卡片曝光、小事点赞/评论/招呼/约遛点击、地图打开、定位、POI 搜索、地点详情、导航打开、地点收藏、通知点击、宠友圈主页查看和反馈进度查看。
- 生产级严格留存 Cohort 仍需要独立事件表、设备去重和长期窗口；当前 JSON state 只适合测试期轻量 DAU、漏斗、Cohort 与行为趋势。
- Push 真实送达/点击依赖厂商通道回执，当前只能展示站内通知、通知点击事件与设备 token。
- 第三方地图导航完成状态无法从高德外部 App 回传，当前只能记录“打开导航”。

## 4. 预留菜单

当前后台左侧暂无仅占位的一级菜单。

后续应继续增加：

- 角色权限管理。
- 独立事件表/数据仓库、长期留存窗口、设备级去重和更完整的多端 Push 回执。

## 5. 待澄清问题

1. 后台正式登录是否继续用账号密码，还是接企业微信/飞书？
2. 生产后台是否只允许白名单 IP 访问？后端白名单能力已接入，仍需确认生产实际允许的出口 IP，并建议在网关层同步配置。
3. 用户禁言的业务范围第一版已明确：发布小事、评论、点赞、打招呼、约遛、私信、宠友圈封面、地点投稿、地点点评都会被禁；是否还要限制头像/资料修改待确认。
4. 运营删除宠友圈动态后，作者端是否展示“已被运营处理”的占位提示？
5. 举报处理结果第一版已通知举报人；有效举报会通知被举报内容作者，处罚建议、一键处罚和举报处理申诉已接入。后续是否需要更细的通知文案模板和处罚策略复盘待确认。
6. 新增地点审核通过/驳回已通知提交人，基础贡献积分账本已落地。后续是否要公开展示贡献者、贡献等级或活动奖励待确认。
7. 地点点评审核通过后，App 地点详情已展示最近公开点评，并支持举报进入后台任务池；后续是否需要分页、只看有图和排序规则待确认。
8. 维护模式开启时，App 是阻断登录，还是只显示顶部提示？
9. AI 形象任务返还额度的规则：所有失败都可返还，还是仅 provider 失败返还？
10. 后台是否需要独立域名，例如 `ops.lumiiapp.cn`，还是先沿用 IP `/admin`？

## 6. 下一批建议

建议下一批继续做：

1. 处罚策略进阶：多管理员复核、双人审批、批量处罚审批和处罚建议的命中率复盘。
2. 内容安全模型接入：第三方文本/图片审核、规则命中回标、模型样本沉淀和误杀回收。
3. 客服工单进阶：客服质检制度、抽检申诉规则、周/月 KPI 锁账、外包真实付款审批/导出/税费、批量回复双人审批和撤回策略。
4. 通知运营进阶：厂商 Push、厂商回执和多管理员双人审批。
5. 配置发布治理进阶：多管理员双人审批、审批后预约生效通知、灰度和 A/B 策略实验。
6. 后台静态资源和 API 增加 MFA、多管理员、更细权限与更完整审计字段。
