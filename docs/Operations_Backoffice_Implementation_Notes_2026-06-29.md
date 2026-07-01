# 运营后台实现状态与待澄清记录

版本：2026-06-29

## 1. 本轮实现原则

- 后台不是独立样板页，而是由现有 `scripts/lumii-backend.cjs` 服务托管。
- 后台入口：`/admin`
- 后台 API：`/admin/*`
- 移动端公开配置：`/app/config`
- 移动端已经开始读取后台配置，避免后台和 App 割裂。
- 第一版仅支持单一 `admin` 权限管理员，细角色、双人审批、导出审批先预留。

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
- 最近登录与高风险动作来自 `adminAuditLogs`，不新建假多账号数据。
- 不展示密码、密钥或敏感环境变量值，只展示是否由环境变量覆盖。

未实现：

- 多后台账号新增/禁用/锁定/重置密码。
- MFA、IP 白名单、登录设备管理和离职禁用流程。
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
- 展示业务积压：AI 灵伴生成、内容安全任务、客服工单、处罚申诉、通知运营、移动端事件。
- 展示 JSON state 内关键集合行数，帮助观察文件态后端的数据膨胀。
- 不暴露任何密钥值，只展示关键环境变量或外部能力是否已配置。

未实现：

- 独立 APM、日志告警、错误追踪、服务器 CPU/磁盘全量监控。
- 不可篡改审计存储、数据库健康检查和自动告警通知。

### 3.2.2 上线台账

- `GET /admin/launch/readiness`

已支持：

- 后台新增一级菜单：上线台账。
- 汇总展示模块成熟度、上线前必须确认的问题、生产风险和配置联动关注项。
- 模块状态使用“测试可用 / 部分可用 / 生产阻断 / 已预留”，避免把测试阶段可用误认为生产级完成。
- 台账读取配置中心联动体检、系统健康、账号权限等现有真实状态，不新建一套割裂的假数据。
- 独立文档：`docs/Operations_Backoffice_Launch_Readiness_Register_2026-06-30.md`。

未实现：

- 页面内编辑待澄清问题。
- 多管理员 owner 分配、审批流、关闭状态流转和上线结论签署。

### 3.3 用户管理

- `GET /admin/users`
- `GET /admin/users/{phone}`
- `POST /admin/users/{phone}/notes`
- `POST /admin/users/{phone}/risk-tags`
- `GET /admin/users/{phone}/business-data-summary`
- `POST /admin/users/{phone}/clear-business-data`

已支持：

- 用户列表。
- 用户详情聚合：宠物、AI 用量、AI 任务、反馈、通知、宠友圈动态。
- 用户列表快捷禁言 24 小时、冻结 72 小时。
- 用户列表和用户详情展示后台内部运营备注、备注数量、最近备注和风险标签。
- 支持给用户添加运营备注，最多保留最近 30 条，写入 `user.note.create` 审计。
- 支持按白名单更新风险标签，标签包括测试账号、重点用户、需要回访、投诉处理中、违规观察、疑似骚扰、疑似违规和 AI 异常样本，写入 `user.risk_tags.update` 审计。
- 用户账号 CSV 导出新增运营风险标签、运营备注数和最近运营备注字段。
- 账号状态和生效处罚会在用户列表展示。
- 用户列表支持高危操作“清理业务数据”：先拉取清理预览，再要求填写原因和完整手机号确认。
- 清理范围覆盖宠物档案、宠物日历、AI 素材/任务/额度、宠物 AI 对话、宠友圈、点赞/评论/举报、黑名单、招呼、约遛、会话、地点收藏/点评/提交、通知、推送设备、反馈和工单。
- 清理后移动端 `/me` 会返回 `activePet=null`，用户重新进入时回到无宠物业务数据状态；账号壳、昵称、头像、简介、设置、权限、短信登录记录、后台审计日志、系统通知批次、后台备注和风险标签保留。
- 清理动作写入 `adminAuditLogs`，action 为 `user.clear_business_data`，审计中只保存清理前后摘要和用户概览，不导出被清理内容原文。
- 详见 `docs/Operations_Backoffice_User_Data_Clear_2026-06-30.md`。
- 用户备注与风险标签详见 `docs/Operations_Backoffice_User_Notes_Risk_Tags_2026-06-30.md`。

### 3.3.1 宠物档案

- `GET /admin/pets`

已支持：

- 后台新增一级菜单：宠物档案。
- 全局只读排查页聚合所有真实用户宠物档案。
- 支持按物种、生日完整度、形象状态、手机号/主人/宠物名/品种/宠物 ID/AI 任务 ID 搜索。
- 生日完整度区分：未知、仅年份、年月、完整日期、格式异常。
- 形象状态区分：缺头像、普通头像、AI 形象已应用、有宠友圈封面。
- AI 形象已应用通过 `avatarUrl`、`avatarJobs.acceptedPetId` 与 `ready` 状态共同判断，避免清空头像后仍误判为 AI 形象。
- 表格展示主人、默认宠物、物种/品种/性别/生日/年龄、体重、最近 AI 任务、宠物日历记录数、宠友圈小事数、地点点评数、最近关联时间和媒体治理操作。
- 支持清空违规普通头像、AI 灵伴形象、宠友圈封面。
- 清空媒体会写入 `adminAuditLogs`，action 分别为 `pet.media.clear_avatar`、`pet.media.clear_ai_avatar`、`pet.media.clear_cover`。
- 清空媒体会强制给用户写入站内通知，并在移动端下一次刷新、登录或重新拉取 `/me` / 宠友圈资料时影响真实展示。
- 数据导出新增宠物档案 CSV。
- 独立说明文档：[Operations_Backoffice_Pet_Media_Moderation_2026-06-30.md](Operations_Backoffice_Pet_Media_Moderation_2026-06-30.md)。

暂未开放：

- 后台直接修正宠物资料。
- 后台替换头像、替换 AI 形象图、更换宠友圈封面。
- 合并重复宠物档案。
- 上述动作会影响首页、AI 对话、宠物日历、宠友圈和会话引用，需要更细权限、引用迁移或上传审核后再开放。

### 3.4 AI 灵伴

- `GET /admin/ai/avatar-jobs`
- `GET /admin/ai/usage`
- `GET /admin/ai/media`
- `GET /admin/ai/avatar-feedback`
- `POST /admin/ai/avatar-feedback/{jobId}/review`
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
- 刷新上游任务状态。
- 重试。
- 后台标记失败。
- 返还形象生成额度。
- 写入审计日志。
- 数据导出新增 AI 上传素材、AI 生成反馈、AI 供应商用量 CSV；不导出图片二进制或 base64 原图。

当前限制：

- 尚未沉淀供应商原始 request / response、逐次调用成本快照、完整 SLA 时间线。
- 尚未开放“加入提示词样本集”、“供应商异常样本”或“直接应用结果图到宠物头像”等高权限动作。

### 3.4.1 AI 对话

- `GET /admin/ai/pet-chat/messages`
- `POST /admin/ai/pet-chat/messages/{messageId}/view`
- `POST /admin/ai/pet-chat/messages/{messageId}/tag`
- `POST /admin/ai/pet-chat/messages/{messageId}/hide`

已支持：

- 后台新增一级菜单：AI 对话。
- 列表按 AI 回复维度展示用户、宠物、模型、时间、用户提问摘要、AI 回复摘要、医疗风险、自动写入和管理员处理状态。
- 支持按全部、医疗风险、自动写入、已隐藏筛选，并支持手机号、宠物名、提问、回复内容搜索。
- 默认列表只展示摘要；管理员查看完整上下文必须填写查看原因。
- 查看完整上下文会写入审计日志，action 为 `ai.petChat.view`，记录手机号、宠物、消息 ID 和查看原因。
- 支持给 AI 回复标记 `quality_issue`、`medical_sample`、`false_positive`、`false_negative`，用于沉淀质量问题、医疗风险样本、误杀和漏杀样本。
- 标记动作会写入审计日志，action 为 `ai.petChat.tag`，记录标签、原因和操作者。
- 支持隐藏不适合继续展示的 AI 回复，必须填写处理原因。
- 隐藏动作会写入审计日志，action 为 `ai.petChat.hide`，记录原因、操作者、手机号、宠物和消息 ID。
- 移动端 `GET /ai/pet-chat/messages` 已排除被后台隐藏的 AI 回复。
- 用户继续对话时，DeepSeek 上下文已跳过被后台隐藏的 AI 回复，避免问题回复继续影响后续生成。

当前限制：

- 尚未保存上游模型的完整 request / response 原始报文，只能基于当前业务消息和上下文排查。
- 暂未做 AI 对话质量抽检队列、采样规则和复核流。
- 暂未接入第三方内容安全模型对 AI 回复做自动拦截，当前主要依靠风险提示、后台检索和人工处理。

### 3.5 宠友圈

- `GET /admin/social/posts`
- `GET /admin/social/comments`
- `POST /admin/social/posts/{postId}/hide`
- `POST /admin/social/posts/{postId}/restore`
- `POST /admin/social/posts/{postId}/delete`
- `POST /admin/social/comments/{commentId}/hide`
- `POST /admin/social/comments/{commentId}/restore`
- `POST /admin/social/comments/{commentId}/delete`

已支持：

- 动态列表。
- 评论列表。
- 动态隐藏、恢复、删除。
- 评论隐藏、恢复、删除。
- App 可见性已排除 `hidden` 动态和评论。
- 删除动态会清理点赞和评论展示。

未实现：

- 作者处罚。
- 申诉。
- 动态详情页中的完整证据查看入口。

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
- 举报 CSV 导出新增证据快照 ID、快照时间、目标状态和内容摘要字段。
- 独立说明文档：[Operations_Backoffice_Report_Evidence_Snapshot_2026-06-30.md](Operations_Backoffice_Report_Evidence_Snapshot_2026-06-30.md)。

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
- 地点点评审核通过后，会进入 App 地点详情的“社区点评”公开列表；审核中和驳回点评不公开。
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

- 贡献分当前只是后台运营账本和用户通知提示，尚未做用户端公开徽章、贡献等级、活动奖励或兑换规则。

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
- 配置中心新增客服工单 SLA，可配置 urgent/high/normal/low 的小时数；保存后影响工单排序、SLA 标记、工作台统计、导出和移动端预计响应文案。
- 移动端“我的反馈”列表/详情会展示未结束工单的预计响应时间。
- 工单 CSV 导出新增 `SLA小时` 字段。
- 独立说明文档：[Operations_Backoffice_Ticket_SLA_Config_2026-06-30.md](Operations_Backoffice_Ticket_SLA_Config_2026-06-30.md)。

未实现：

- 工单负责人枚举。
- 客服排班、首响 SLA/解决 SLA 拆分和客服质量统计。
- 批量回复用户暂不开放，避免误触达；当前批量只覆盖分配、状态和优先级。

### 3.9 配置中心

- `GET /admin/config`
- `PATCH /admin/config`
- `POST /admin/config/revisions/{revisionId}/rollback`
- `GET /app/config`

当前配置字段：

- `ai.petAvatarDailyLimit`
- `ai.petChatDailyLimit`
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
- 配置中心页面已展示每个配置项是否“前后端联动 / 后端强制 / 移动端联动 / 预留”，并列出后端证据、移动端证据、用户影响和运营备注。
- 配置中心页面新增“配置发布治理”区，展示待发布草稿、高风险草稿、最近草稿时间和配置版本数。
- 配置草稿和版本历史会记录变更摘要与风险项，当前高风险项覆盖维护模式、强制更新、核心功能开关、内容安全总开关、腾讯云机审开关和关键词规则。
- 数据导出新增配置联动体检 CSV。
- 独立文档：[Operations_Backoffice_Config_Linkage_2026-06-30.md](Operations_Backoffice_Config_Linkage_2026-06-30.md)。
- 后台配置页展示最近 12 个配置版本，后端最多保留最近 80 个快照。
- 每次 `PATCH /admin/config` 保存都会生成一条 `publish` 版本，记录版本 ID、发布时间、发布人、发布原因和配置摘要。
- 支持在后台点“回滚到此版本”，调用 `POST /admin/config/revisions/{revisionId}/rollback`。
- 回滚会把当前配置恢复到目标版本快照，同时生成一条新的 `rollback` 版本，并记录 `sourceRevisionId`。
- 回滚动作写入审计日志，action 为 `config.rollback`；普通保存写入 `config.update`。
- 草稿创建、发布、废弃分别写入 `config.draft.create`、`config.draft.publish`、`config.draft.discard`。
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
- 用户处罚申诉接手、通过与驳回。
- 举报处罚建议执行。
- 审计日志页支持按动作、目标类型、管理员、时间范围和关键词筛选。
- 审计日志页展示匹配数、高风险动作数、缺少原因数和可筛动作/对象数。
- 从本版本开始，后台登录和后台请求触发的审计会记录 IP 和 User-Agent；历史审计和用户侧工单补充类审计可能为空。

### 3.11 用户处罚

- `GET /admin/sanctions`
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
- 后台新增一级菜单：申诉中心，支持状态筛选、关键词检索、接手、通过、驳回。
- 申诉通过时默认联动撤销原处罚，也可在卡片中取消“通过时撤销处罚”。
- 举报中心处理为有效时，会自动生成处罚建议，建议包含处罚类型、时长、原因和被举报内容快照。
- 举报中心支持按建议一键创建处罚，处罚会保留举报来源、处罚模板和证据快照，并写入 `social.report.sanction` 审计日志。
- 内容安全任务池把举报处理为有效时，也会生成同样的处罚建议，避免两个入口逻辑不一致。
- 处罚新增、撤销、到期、申诉结果会写入 App 通知中心，并跳转到安全中心。
- 所有处罚新增/撤销、申诉接手/通过/驳回写入审计日志。

未实现：

- 多管理员复核与双人审批。

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
  - `moderation.machineTextEnabled`：启用后，宠友圈小事、评论、地点点评、新增地点、宠物资料文本会调用腾讯云文本内容安全。
  - `moderation.machineImageEnabled`：启用后，宠物头像、AI 原图、宠友圈图片、宠友圈封面、地点点评图片、新增地点图片、工单附件会调用腾讯云图片内容安全。
  - 腾讯云凭据只从服务器环境变量读取，后台只显示“已配置/未配置”和 Biztype 映射，不展示密钥。
- 规则接入范围：
  - 宠友圈小事：命中复审/高风险后状态为 `pending_review`，不进入附近公开列表，内容安全池可通过、隐藏、删除。
  - 宠友圈评论：命中 Review 后写入 `pending_review`，不通知被评论人；后台通过后再产生评论可见性和提醒。
  - 地点点评/新增地点：仍按待审核流程提交，命中规则会抬高风险分并沉淀样本。
  - 宠物资料文本：命中 Block/Review 时不保存公开资料，提示用户修改后再提交。
  - 图片内容：Pass 自动可见；Review 进入图片审核池且不公开展示；Block/驳回后不可公开访问。
- 内容安全页展示最近规则和腾讯云机审命中样本，保留 Biztype、RequestId、风险标签和风险分，便于人工复核误杀。
- 配置中心新增 `moderation.sampleReviewRatePercent`，用于按比例稳定抽样已通过的公开内容；该配置只在后端生效，不下发移动端。
- 内容安全页新增“内容安全样本复盘”，区分风险命中样本和抽样复审样本。
- 样本支持人工标记：确认风险、误杀、漏杀、忽略；复审说明、处理人、处理时间和结论都会写入样本并进入审计日志。
- 样本复审只用于规则/模型质量治理，不会自动改变用户内容可见性；隐藏、删除、驳回、通过仍走任务池或图片审核池。
- 数据看板新增安全样本复审、待复审样本、误杀/漏杀和复审率口径，抽样复审不再计入规则命中。
- 数据导出新增内容安全样本 CSV，包含样本类型、机审动作、复审结论、业务场景、风险标签、Biztype、RequestId、供应商建议和复审说明。
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

已支持：

- 后台新增一级菜单：通知运营。
- 系统通知发送器：标题、正文、目标范围、点击跳转、是否尊重用户通知开关。
- 目标范围：
  - 全部用户。
  - 今日活跃用户，按 `lastSeenAt` 近 24 小时计算。
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

未实现：

- 真实厂商 Push 下发，例如 FCM、APNs、华为/小米/OPPO/VIVO 推送。
- 发送审批和灰度人群包。
- 通知点击后的复杂深链参数，例如指定帖子、地点详情；工单详情第一版已支持 `ticketId`。

### 3.14 宠物日历

- `GET /admin/pet-calendar`

已支持：

- 后台新增一级菜单：宠物日历。
- 运营文案统一使用“宠物日历”，后端技术 store 仍沿用 `health` 命名。
- 全局只读排查页聚合移动端真实日历记录：
  - 体重。
  - 疫苗/驱虫。
  - 备忘。
  - 宠友圈同步备忘。
  - AI 对话自动创建备忘、体重和医疗门禁提醒。
- 支持按类型、状态、来源、日期区间、手机号/宠物/标题/记录 ID 搜索。
- 顶部 KPI 覆盖：当前筛选记录数、体重记录、疫苗/驱虫、备忘、提醒开启、AI 写入。
- 后台不会调用会初始化默认记录的 C 端列表函数，只读取已持久化 state，避免打开后台制造默认日历数据。
- 疫苗/驱虫后台可区分 `due`、`overdue`、`done`；移动端仍按产品口径把未完成统一展示为“计划中”。
- 数据导出新增宠物日历 CSV。

暂未开放：

- 后台直接编辑/删除/恢复宠物日历记录。
- 体重明显错误值修复、疫苗状态修复、异常提醒关闭等高风险动作。
- 上述写操作需要 before/after 审计、原因、审批或更细权限后再开放。

### 3.15 消息、招呼与约遛

- `GET /admin/social-relations`

已支持：

- 后台新增一级菜单：关系消息。
- 全局只读排查页聚合：
  - 招呼：普通发现页招呼、宠友圈小事招呼。
  - 约遛：约遛邀请、待处理/已接受状态。
  - 会话：双方会话摘要、消息数、未读和相关通知。
- 支持按类型、状态、手机号/宠物/地点/动态 ID/会话 ID 搜索。
- 顶部 KPI 覆盖：关系记录、待处理、已接受、招呼、约遛、会话消息。
- 会话默认只展示摘要，不展示完整私信正文；摘要会基础脱敏手机号、邮箱和微信号。
- 约遛接收方回复会自动接受关系的现有移动端/后端逻辑已可在本页通过状态排查。
- 数据导出新增关系消息 CSV。

暂未开放：

- 后台修复异常招呼/约遛状态。
- 查看完整私信正文。
- 隐藏违规会话消息、保留证据快照和标记骚扰会话。
- 上述能力需要 `message.view_content` 权限、查看原因、before/after 审计和更细处罚联动后再开放。

### 3.16 数据导出

- `GET /admin/exports`
- `GET /admin/exports/history`
- `GET /admin/exports/{type}.csv`

已支持：

- 后台新增一级菜单：数据导出。
- 支持 21 类 CSV 数据集：
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
  - 工单。
  - 用户处罚。
  - 移动端事件。
  - 审计日志。
- 导出目录展示每个数据集的当前行数、单次上限和字段摘要。
- 导出目录支持按数据集、状态、手机号、开始/结束日期和关键词筛选，页面会展示匹配行数与原始行数。
- 导出页展示最近导出记录，包含数据集、文件名、水印 ID、导出原因、筛选条件、导出行数、匹配行数、管理员、IP、User-Agent 和时间。
- CSV 下载需要管理员登录态，前端通过 Bearer token 拉取，不暴露公开下载链接。
- CSV 下载必须填写导出原因，后端会强制校验，绕过前端也不能无原因导出。
- CSV 每行追加导出水印列：水印 ID、导出时间、管理员、导出原因和筛选条件，用于泄漏追踪和内部复盘。
- 每个 CSV 默认最多导出 1000 行，避免误导出超大文件。
- 导出动作会写入 `adminAuditLogs`，action 为 `data.export.download`，记录数据集、文件名、字段、行数、导出原因、筛选条件和水印 ID。
- 默认不导出图片二进制、设备 token、完整审计 before/after 快照等大字段或敏感字段。

未实现：

- 导出审批和双人确认。
- 异步大文件导出、过期下载链接和对象存储归档。
- 独立导出任务表、文件归档和导出审批状态流转。
- 按更细字段做数据集专属筛选，例如举报原因、地点 ID、AI 供应商、工单优先级等。

### 3.17 数据看板

- `GET /admin/analytics?days=14`

已支持：

- 后台新增一级菜单：数据看板。
- 默认按最近 14 天生成日粒度趋势桶。
- 顶部 KPI 覆盖：
  - 新增用户、窗口内活跃、建档率。
  - AI 形象成功率、平均耗时、GPT Image 成本累计。
  - 宠友圈小事、图片、评论。
  - 移动端事件、事件用户数、采样率。
  - 地图打开、POI 搜索、地点详情查看。
  - 内容安全任务与已处理数量。
- ECharts 图表覆盖：
  - 用户增长与活跃。
  - AI 使用质量：形象启动、成功、失败、AI 对话。
  - 社交互动：小事、点赞、评论、招呼、约遛。
  - 移动端行为：页面浏览、发现曝光、地图打开、POI 搜索、地点详情、通知点击。
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
- 最近 7 天明细表用于核对趋势图背后的日汇总。

当前口径限制：

- 已补移动端基础事件埋点：页面浏览、发现曝光、附近伙伴加载、小事加载、地图打开、定位、POI 搜索、地点详情、导航打开、地点收藏、通知点击、宠友圈主页查看和反馈进度查看。
- 严格留存 Cohort 需要独立事件表、设备去重和长期窗口；当前 JSON state 只适合测试期轻量 DAU 与行为趋势。
- Push 真实送达/点击依赖厂商通道回执，当前只能展示站内通知、通知点击事件与设备 token。
- 第三方地图导航完成状态无法从高德外部 App 回传，当前只能记录“打开导航”。

## 4. 预留菜单

当前后台左侧暂无仅占位的一级菜单。

后续应继续增加：

- 角色权限管理。
- 严格留存 Cohort、看板时间范围筛选、事件明细筛选和独立事件表/数据仓库。

## 5. 待澄清问题

1. 后台正式登录是否继续用账号密码，还是接企业微信/飞书？
2. 生产后台是否只允许白名单 IP 访问？
3. 用户禁言的业务范围第一版已明确：发布小事、评论、点赞、打招呼、约遛、私信、宠友圈封面、地点投稿、地点点评都会被禁；是否还要限制头像/资料修改待确认。
4. 运营删除宠友圈动态后，作者端是否展示“已被运营处理”的占位提示？
5. 举报处理结果第一版已通知举报人；有效举报会通知被举报内容作者。后续是否需要更细的通知文案模板、申诉入口或处罚联动待确认。
6. 新增地点审核通过/驳回已通知提交人，基础贡献积分账本已落地。后续是否要公开展示贡献者、贡献等级或活动奖励待确认。
7. 地点点评审核通过后，App 地点详情已展示最近公开点评；后续是否需要分页、点评举报入口、只看有图和排序规则待确认。
8. 维护模式开启时，App 是阻断登录，还是只显示顶部提示？
9. AI 形象任务返还额度的规则：所有失败都可返还，还是仅 provider 失败返还？
10. 后台是否需要独立域名，例如 `ops.lumiiapp.cn`，还是先沿用 IP `/admin`？

## 6. 下一批建议

建议下一批继续做：

1. 处罚策略进阶：多管理员复核、双人审批、批量处罚审批和处罚建议的命中率复盘。
2. 内容安全模型接入：第三方文本/图片审核、规则命中回标、模型样本沉淀和误杀回收。
3. 客服工单进阶：负责人枚举、SLA 配置化、批量处理复盘和客服质量统计。
4. 通知运营进阶：厂商 Push、发送审批、复杂深链和灰度人群包。
5. 配置发布治理进阶：配置草稿、发布审批、灰度人群包和 A/B 策略实验。
6. 后台静态资源和 API 增加更细权限与更完整审计字段。
