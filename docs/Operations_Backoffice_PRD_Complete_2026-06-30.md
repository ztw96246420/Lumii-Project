# Lumii 运营后台完整需求文档

版本：2026-06-30

适用项目：Lumii 灵伴 App

文档定位：基于当前仓库已经开发的移动端、测试后端和后台页面，定义一套完整、可分期、可验收的运营后台产品需求。本文档不是仅面向当前测试期的实现记录，而是后续做生产级运营后台、客服后台、内容安全后台和数据运营后台的统一需求基线。

相关代码与文档依据：

- 移动端主实现：`mobile/src/mvp/LumiiMvpApp.tsx`
- 移动端 API 门面：`mobile/src/mvp/api.ts`
- 移动端类型定义：`mobile/src/mvp/types.ts`
- 测试后端：`scripts/lumii-backend.cjs`
- 当前后台前端：`admin/index.html`、`admin/admin.js`、`admin/admin.css`
- 现有 API 文档：`docs/API_Contract_MVP_v0.md`
- 现有运营后台需求草案：`docs/Operations_Backoffice_Requirements_2026-06-29.md`
- 现有运营后台实现状态：`docs/Operations_Backoffice_Implementation_Notes_2026-06-29.md`
- 配置联动说明：`docs/Operations_Backoffice_Config_Linkage_2026-06-30.md`
- 用户业务数据清理说明：`docs/Operations_Backoffice_User_Data_Clear_2026-06-30.md`

## 1. 背景与问题

Lumii 当前已经不是只有静态页面的原型。现有代码已覆盖登录、宠物建档、AI 灵伴形象、AI 对话、宠物日历、宠友圈、附近发现、打招呼、约遛、聊天、通知、地图地点、地点点评、用户反馈、工单、账号处罚与申诉等多个真实业务链路。

这些链路一旦进入真机测试或小范围上线，会持续产生运营问题：

- 用户说“生成失败”“卡在进度条”“头像不对”“额度不对”，需要能查 AI 任务和原始素材。
- 用户举报动态、评论、地点点评、聊天骚扰，不能只在 App 里隐藏给举报人看，需要后台闭环。
- 地点点评和新增地点需要人工审核，否则地图数据会污染。
- 宠友圈、头像、宠物图片、评论、地点内容都涉及内容安全。
- 用户账号被禁言、冻结、封禁后需要申诉入口和后台复核。
- 客服需要看用户反馈、补充截图、回复用户、记录内部备注和 SLA。
- 配置中心已经能影响 App 体验，必须有版本、回滚和变更审计。
- 测试期经常需要清理指定用户业务数据，生产期则必须严格控制。

所以运营后台的目标不是“做一个能看数据的页面”，而是把 Lumii 从功能可跑推进到可运营、可排查、可治理、可上线。

## 2. 当前代码能力盘点

### 2.1 当前后台已存在的一级菜单

当前 `admin/admin.js` 已有以下导航：

1. 工作台
2. 数据看板
3. 用户管理
4. 宠物档案
5. 宠物日历
6. AI 灵伴
7. AI 对话
8. 内容安全
9. 宠友圈
10. 关系消息
11. 举报中心
12. 地图地点
13. 工单中心
14. 通知运营
15. 配置中心
16. 审计日志
17. 用户处罚
18. 申诉中心
19. 数据导出

### 2.2 当前后端主要业务状态

当前 `scripts/lumii-backend.cjs` 使用 JSON state 持久化。主要状态对象包括：

- 用户与账号：`users`、`sms`、`revokedAuthTokens`
- 媒体与 AI：`mediaUploads`、`avatarJobs`、`petAvatarDailyUsage`、`petChatMessages`、`petChatDailyUsage`、`aiUsage`
- 宠物日历：`health.weights`、`health.vaccines`、`health.vaccineReminders`、`health.memos`
- 社交与内容：`socialMoments`、`socialLikes`、`socialComments`、`socialReports`、`socialBlocks`
- 关系与消息：`greetings`、`invites`、`conversations`、`conversationMessages`
- 通知：`notifications`、`pushDevices`、`systemNotifications`
- 地点：`places`、`placeReviews`、`placeSubmissions`
- 客服：`feedback`、`supportTickets`
- 风控与治理：`sanctionAppeals`、`moderationTaskMeta`、`moderationSamples`
- 后台治理：`adminAccounts`、`opsConfig`、`opsConfigDrafts`、`opsConfigApprovals`、`opsConfigSchedules`、`opsConfigRevisions`、`adminAuditLogs`

### 2.3 当前已落地的后台能力

当前测试后台已落地：

- 管理员登录、后台静态页托管、后台 API 鉴权、多管理员账号底座。
- 工作台概览。
- 用户列表、用户详情聚合、用户时间线、运营备注、风险标签、快捷禁言/冻结、用户业务数据清理。
- 宠物档案只读排查。
- AI 灵伴任务、素材、反馈、供应商用量、重试、刷新、标记失败、人工返还额度和供应商失败自动返还额度。
- AI 对话检索、查看全文审计、打标签、隐藏异常回复。
- 宠友圈动态/评论列表、隐藏、恢复、删除。
- 举报列表、处理结果、通知闭环、处罚建议，覆盖动态、评论、地点点评和私信消息。
- 地点点评和新增地点审核。
- 工单中心、负责人、状态、优先级、内部备注、客服回复、模板、用户补充、评分、重开。
- 配置中心、移动端配置联动、配置版本和回滚。
- 审计日志。
- 用户处罚、处罚模板、撤销、申诉、申诉通过联动撤销。
- 内容安全任务池、文本规则、审核任务、批量处理。
- 通知运营、系统通知、草稿、预约、撤回、模板。
- 宠物日历只读排查。
- 关系消息只读排查。
- 22 类 CSV 数据导出。
- 数据看板，含移动端基础事件趋势。

### 2.4 当前明确缺口

当前尚不足以直接称为生产级运营后台，主要缺口：

- 多管理员账号底座、角色权限运行时拦截、IP 白名单、逐账号登录失败锁定、TOTP MFA 基座和密码轮换状态检查已接入；生产期仍缺全员配置 MFA/真实白名单、账号离职交接 SOP 和正式账号数据库。
- 腾讯云文本/图片机审已接入基础链路；生产期仍需确认密钥轮换、抽样比例、异步回调和误杀申诉归因机制。
- 图片内容审核已形成统一图片审核池：头像、宠物图、宠友圈图片、封面、地点点评图片、新增地点图片和工单附件均可进入同一处理入口；生产期仍需长期证据归档和多审核员质检。
- 用户备注和风险标签已有基础能力；生产期仍需系统自动标签和备注作废流程。
- 宠物资料编辑、违规媒体清空、普通头像/宠友圈封面替换和同账号重复宠物合并已支持。
- 私信查看治理已接入：不开放任意全文检索，仅在举报/关系排查中查看最近上下文窗口；窗口大小、查看原因和审计保留标记由配置中心管理，生产期多管理员后可升级双人审批。
- 地点质量分、重复候选、地点详情编辑、地点图片审核、人工确认后的地点合并、自定义审核模板、基础地点贡献账本、贡献分手动调整和撤销、公开点评展示策略已接入；用户本人公开贡献身份和轻量等级已接入，排行榜或活动奖励仍待定。
- 真实厂商 Push 和推送回执未接入；后台系统通知频控、对象深链、发送审批和高风险最少会签人数已接入。
- 数据看板已补页面、发现、地图、地点和通知等基础事件；严格留存、完整转化漏斗和 Push 厂商回执仍未做。
- 配置中心已支持草稿、高风险确认、预约发布、版本回滚、发布审批和高风险最少会签人数；生产期仍需审批值守通知、灰度配置和 A/B 分流。
- 导出已支持基础筛选、原因必填、CSV 水印、默认敏感字段脱敏、完整敏感字段独立授权、审批流、高风险最少会签人数、审批有效期、单审批下载次数上限、服务器本地归档任务和短时效签名下载链接；对象存储归档未做。
- 操作审计保存在 JSON state 内，同时新审计记录会追加到独立 JSONL journal，并写入 `prevHash/hash` 哈希链，可在后台校验 retained window 和 journal 的准不可篡改完整性；生产期仍需同步到数据库、WORM 或外部日志服务。
- 当前单文件后端适合联调，不适合长期生产架构。

## 3. 建设目标

### 3.1 业务目标

运营后台需要解决四个核心问题：

1. 看得见：用户、宠物、内容、AI、地点、工单、通知、处罚、配置、审计都能被查到。
2. 管得住：能审核、隐藏、删除、恢复、处罚、申诉、通知、回滚、清理测试数据。
3. 查得清：能按手机号、宠物 ID、帖子 ID、评论 ID、地点 ID、工单 ID、AI 任务 ID、通知 ID 快速定位。
4. 追得回：所有高风险动作都要有权限、原因、二次确认、审计和必要的回滚或申诉通道。

### 3.2 产品目标

- 支撑真机测试：减少每次排查都要 SSH 看 state 的情况。
- 支撑小范围上线：先能处理用户反馈、举报、AI 失败、地点审核。
- 支撑生产上线：补齐权限、安全、审核、风控、客服和数据闭环。
- 支撑长期运营：配置、通知、数据、实验、活动、增长可以逐步接入。

### 3.3 非目标

第一阶段不做：

- 不做复杂 CRM 营销自动化。
- 不做正式 BI 数据仓库的替代品。
- 不在后台展示验证码明文、鉴权 token、第三方 API Key。
- 不允许普通运营导出完整手机号、设备 token、精确位置、原图二进制。
- 不允许普通运营直接修改服务器环境变量。
- 不把测试用“清理业务数据”能力默认开放给生产普通运营。

## 4. 用户角色与权限模型

### 4.1 后台角色

| 角色 | 定位 | 核心权限 |
| --- | --- | --- |
| 超级管理员 `super_admin` | 创始团队或最高权限负责人 | 所有模块、账号权限、双人审批最终确认、危险配置 |
| 运营管理员 `ops_admin` | 日常运营负责人 | 用户、内容、地点、通知、配置、看板、工单 |
| 内容审核员 `content_moderator` | 处理内容安全任务 | 动态、评论、图片、地点内容审核，不能做长期封禁 |
| 社区安全员 `safety_admin` | 处理骚扰、举报、拉黑、处罚 | 举报、处罚、申诉、关系消息排查 |
| 客服 `support` | 处理用户问题和反馈 | 用户只读、工单、通知补发、低风险排查 |
| 地点运营 `place_ops` | 维护宠物友好地点 | 地点审核、地点编辑、合并、质量标记 |
| AI 运营 `ai_ops` | 处理 AI 生成和对话质量 | AI 任务、重试、额度返还、样本标注、成本监控 |
| 数据分析 `data_analyst` | 看数据，不处理个案 | 数据看板、脱敏导出 |
| 审计员 `auditor` | 复核后台操作 | 审计日志、对象历史、只读 |

### 4.2 权限原则

- 后台账号和 App 用户账号必须分离。
- 每个写操作必须绑定权限点。
- 敏感字段默认脱敏。
- 查看完整手机号、完整聊天、原图、导出数据都必须记录原因。
- 高危动作必须二次确认，生产期应支持双人审批。
- 后台操作不可静默失败；失败必须明确提示原因。
- 后台操作必须写入审计日志，并能按管理员、对象、动作、时间检索。

### 4.3 权限点清单

| 权限点 | 说明 |
| --- | --- |
| `admin.login` | 登录后台 |
| `admin.manage_accounts` | 管理后台账号、角色、MFA |
| `dashboard.view` | 查看工作台 |
| `user.view` | 查看用户列表和详情 |
| `user.view_pii` | 查看完整手机号、设备、IP |
| `user.note` | 添加用户备注 |
| `user.tag` | 标记用户风险标签 |
| `user.sanction` | 创建或撤销处罚 |
| `user.clear_data` | 清理用户业务数据 |
| `pet.view` | 查看宠物档案 |
| `pet.edit` | 修正宠物资料 |
| `pet.media_moderate` | 隐藏、清理或替换宠物头像、AI 形象、封面 |
| `calendar.view` | 查看宠物日历 |
| `calendar.edit` | 修复日历记录 |
| `ai.view` | 查看 AI 任务、素材、用量 |
| `ai.operate` | 刷新、重试、标记失败 |
| `ai.refund_quota` | 返还 AI 额度 |
| `ai.sample` | 标注 AI 样本 |
| `pet_chat.view_summary` | 查看 AI 对话摘要 |
| `pet_chat.view_full` | 查看 AI 对话完整上下文 |
| `pet_chat.moderate` | 隐藏 AI 回复、标注质量 |
| `pet_chat.quality_review` | 复核 AI 对话质量抽检样本 |
| `social.view` | 查看宠友圈和评论 |
| `social.moderate` | 隐藏、恢复、删除动态和评论 |
| `report.handle` | 处理举报 |
| `message.view_meta` | 查看招呼、约遛、会话元信息 |
| `message.view_content` | 查看完整私信正文 |
| `place.view` | 查看地点和审核记录 |
| `place.moderate` | 审核地点点评和新增地点 |
| `place.edit` | 编辑地点资料、合并地点 |
| `ticket.view` | 查看工单 |
| `ticket.handle` | 分配、备注、回复、关闭工单 |
| `notification.view` | 查看通知运营 |
| `notification.send` | 发送系统通知 |
| `notification.cancel` | 撤回或取消通知 |
| `config.view` | 查看配置 |
| `config.edit` | 修改配置 |
| `config.rollback` | 回滚配置 |
| `analytics.view` | 查看数据看板 |
| `export.download` | 下载数据导出 |
| `audit.view` | 查看审计日志 |

## 5. 全局产品规则

### 5.1 列表页通用规则

每个业务列表至少包含：

- 关键词搜索。
- 状态筛选。
- 时间筛选。
- 主要对象 ID 可复制。
- 手机号默认脱敏。
- 空态、加载态、失败态。
- 刷新按钮。
- 导出入口或跳转到数据导出。
- 操作按钮必须根据状态禁用或隐藏。

### 5.2 详情页通用规则

每个详情页至少包含：

- 对象基本信息。
- 关联用户、宠物、内容、通知、工单、处罚、审计。
- 原始状态与显示状态。
- 最近操作记录。
- 可用操作区。
- 高风险操作说明。
- 移动端影响说明。

### 5.3 写操作通用规则

所有后台写操作必须：

- 填写原因，默认原因只能用于低风险操作。
- 写入 `adminAuditLogs` 或生产级审计表。
- 记录 `before` 与 `after` 摘要。
- 返回最新对象快照。
- 更新相关列表和 KPI。
- 对移动端有影响时明确触发通知或状态变化。

### 5.4 高风险操作规则

高风险操作包括：

- 清理用户业务数据。
- 永久封禁用户。
- 批量删除内容。
- 查看完整私信正文。
- 导出含敏感信息的数据。
- 回滚配置。
- 强制更新 App。
- 全量发送系统通知。

高风险操作必须：

- 二次确认。
- 输入目标 ID 或手机号确认。
- 填写原因。
- 生产期需要双人审批。
- 审计日志保留 180 天以上，生产建议保留 1 年以上。

## 6. 信息架构

后台一级导航建议保持当前 19 个模块，但按运营使用频率分组：

### 6.1 日常工作

- 工作台
- 内容安全
- 举报中心
- 工单中心
- 地图地点
- AI 灵伴

### 6.2 用户与社区

- 用户管理
- 宠物档案
- 宠物日历
- 宠友圈
- 关系消息
- 用户处罚
- 申诉中心

### 6.3 运营配置

- 通知运营
- 配置中心
- 数据看板
- 数据导出
- 审计日志

### 6.4 系统管理

- 后台账号
- 角色权限
- 操作审批
- 系统健康
- 上线台账

当前代码已基础实现系统健康页、账号权限页、state 多管理员账号底座、角色权限运行时拦截、逐账号登录失败锁定、IP 白名单、TOTP MFA、密码轮换状态检查、高风险最少会签人数和上线台账页；内容安全质检策略复盘、审批值守通知、账号离职交接 SOP 和生产数据底座仍是生产级后台需要补齐的治理能力。

## 7. 模块需求

### 7.1 后台登录与安全

### 目标

确保后台不是公开可撞库的普通页面，并且后台人员的每一次敏感操作都有身份依据。

### 当前状态

已实现：

- `GET /admin`
- `POST /admin/auth/login`
- `GET /admin/me`
- `GET /admin/accounts`
- `POST /admin/accounts`
- `POST /admin/accounts/{accountId}/disable`
- `POST /admin/accounts/{accountId}/enable`
- `POST /admin/accounts/{accountId}/reset-password`
- 环境变量 `admin` 账号。
- state 管理员账号，支持创建、禁用、启用和重置密码。
- 账号权限页已展示当前会话、账号列表、权限点、角色边界、安全检查、最近登录和最近高风险动作。
- 登录失败锁定已实现为逐账号锁定：每个账号连续 5 次密码错误默认锁定 15 分钟，失败、锁定、锁定期拦截和成功/重置密码清零都会写审计。
- IP 白名单已实现：`LUMII_ADMIN_IP_ALLOWLIST` / `LUMII_ADMIN_IP_WHITELIST`。

待补齐：

- 生产级密码过期、轮换和历史密码策略。
- MFA。
- 登录设备管理。
- 管理员离职禁用。

### 页面需求

登录页：

- 用户名。
- 密码。
- MFA 验证码，生产期必需。
- 登录失败提示。
- 联系管理员入口。

账号安全页：

- 当前账号信息。
- 最近登录记录。
- 已登录设备。
- 修改密码。
- MFA 绑定状态。

后台账号管理页：

- 账号列表。
- 角色。
- 状态：正常、禁用、锁定。
- 最近登录时间。
- 创建、禁用、重置密码。
- 角色分配。

### 风控规则

- 连续 5 次密码错误锁定 15 分钟。
- 30 分钟无操作自动锁屏。
- 12 小时强制重新登录。
- 异常 IP 登录通知超级管理员。
- 超级管理员操作需二次确认。

### 验收标准

- 未登录访问 `/admin/*` 返回 401 或跳回登录。
- 普通运营不能访问未授权模块。
- 管理员禁用后 token 立即失效。
- 登录、登出、失败登录均写审计。

### 7.2 工作台

### 目标

让运营打开后台第一眼知道今天最需要处理什么、系统是否异常。

### 当前状态

已实现 `GET /admin/dashboard/summary`，覆盖用户、AI、社交、审核、地点、工单、配置、通知等摘要。

已实现 `GET /admin/system/health`，覆盖后端运行、状态文件、状态备份、内存、关键外部服务配置、业务积压和 JSON state 集合行数。页面只展示配置是否存在，不展示密钥值；状态文件已接入原子写入、滚动 gzip 备份和启动损坏恢复，生产期仍需接入 APM、日志告警、数据库健康检查和不可篡改审计存储。

已实现 `GET /admin/launch/readiness`，覆盖模块成熟度、上线前必须确认的问题、生产风险台账和配置联动关注项；页面口径区分“测试可用 / 部分可用 / 生产阻断 / 已预留”，避免把预留能力误标为生产完成。已实现 `POST /admin/launch/readiness/questions/{questionId}`，运营可在页面内记录待澄清问题的状态、负责人/决策来源和备注，状态支持 `open`、`reviewing`、`ready`、`deferred`、`closed`，更新/重置均写入审计。已实现 `POST /admin/launch/readiness/signoff`，支持签署当前上线结论、保存 P0/待确认问题/模块状态快照、重置签署记录，并在存在未关闭 P0 时拒绝签署 `ready_for_production`。

### 页面结构

顶部 KPI：

- 今日新增用户。
- 今日新增宠物。
- 今日活跃用户。
- AI 形象任务数、成功率、失败数、卡住数。
- AI 对话次数、医疗风险拦截数。
- 待处理内容安全任务。
- 待处理举报。
- 待审核地点点评。
- 待审核新增地点。
- 未关闭工单。
- 生效处罚。
- 预约通知。
- 配置最近更新时间。

待办区：

- 高风险内容安全任务。
- SLA 即将超时工单。
- 卡住的 AI 任务。
- 待处理举报。
- 待审核地点。
- 申诉待处理。

系统异常区：

- AI provider 失败率上升。
- 图片上传或 CDN 访问异常。
- 短信发送失败率上升。
- 工单积压超 SLA。
- 内容安全积压超 SLA。
- 推送设备 token 异常。

快捷搜索：

- 手机号。
- 宠物名或宠物 ID。
- AI 任务 ID。
- 动态 ID。
- 评论 ID。
- 举报 ID。
- 地点 ID。
- 工单 ID。

### 验收标准

- 工作台所有数字可点击进入对应列表，并自动带筛选条件。
- 卡住 AI 任务和 SLA 超时工单必须能被明显识别。
- 配置中心维护模式开启时，工作台有醒目提醒。

### 7.3 用户管理

### 目标

围绕一个手机号快速回答：这个用户是谁、有什么宠物、遇到了什么问题、是否有违规风险、后台做过什么动作。

### 当前状态

已实现：

- 用户列表。
- 用户详情聚合。
- 快捷禁言 24 小时。
- 快捷冻结 72 小时。
- 用户备注。
- 风险标签。
- 用户业务数据清理。
- 完整用户时间线。
- 登录设备和 IP 排查：移动端短信登录、Token 刷新、登出会写入脱敏会话记录；后台用户列表、用户详情、用户时间线和业务数据清理汇总均已接入。

待补齐：

- 更细粒度账号状态管理。

### 用户列表字段

- 脱敏手机号。
- 用户昵称。
- 头像。
- 宠物数。
- 默认宠物。
- 注册时间。
- 最近活跃时间。
- 附近可见开关。
- 推送开关。
- 最近登录来源、IP、设备 hash 和会话状态。
- 账号状态。
- 生效处罚。
- 风险标签。
- 最近工单。
- 最近举报/被举报。
- AI 形象任务统计。

### 筛选条件

- 手机号，支持完整手机号和后四位。
- 昵称。
- 注册时间。
- 最近活跃时间。
- 是否有宠物。
- 默认宠物物种。
- 附近可见开关。
- 推送开关。
- 账号状态。
- 生效处罚类型。
- 被举报次数。
- 工单状态。
- AI 失败次数。
- 风险标签。

### 用户详情结构

用户资料：

- 手机号，默认脱敏。
- 昵称、头像、简介。
- 注册时间。
- 最近登录/活跃。
- 权限状态：定位、相册、通知。
- 设置：附近可见、模糊位置、互动通知、推送通知。
- 当前默认宠物。

业务聚合：

- 宠物档案。
- AI 形象任务。
- AI 对话用量。
- 宠物日历记录。
- 宠友圈动态、评论、点赞。
- 举报和被举报。
- 拉黑关系。
- 招呼、约遛、会话。
- 地点收藏、点评、提交。
- 通知。
- 工单。
- 处罚和申诉。
- 审计日志。

运营动作：

- 添加备注。
- 添加/移除风险标签。
- 创建处罚。
- 撤销处罚。
- 返还 AI 额度。
- 补发系统通知。
- 清理业务数据。
- 查看完整手机号，需权限和原因。

### 用户备注需求

备注字段：

- 内容。
- 创建人。
- 创建时间。
- 是否置顶。
- 关联对象，可选：工单、举报、处罚、AI 任务。

规则：

- 备注仅后台可见。
- 备注不可物理删除，允许追加“作废”状态。
- 每条备注最多 500 字。
- 添加、作废都写审计。

### 风险标签需求

手动标签建议：

- 测试账号。
- 重点用户。
- 需回访。
- 投诉处理中。
- 违规观察。
- 疑似骚扰。
- 疑似刷量。
- AI 异常样本。

系统标签建议：

- 短信高频。
- AI 失败高频。
- 多次被举报。
- 高频举报他人。
- 高频删除内容。
- 高频提交地点。
- 多次命中内容规则。
- 多设备异常登录。

规则：

- 系统标签由规则计算，不允许手动删除，只允许运营标记“已复核”。
- 手动标签可增删，但必须记录原因。
- 用户端不可见。

### 用户业务数据清理

测试期可保留，生产期必须强管控。当前已接入单 admin 审批：提交申请不会立刻影响移动端，审批通过后才执行真实清理；生产期是否继续开放或升级双人审批仍需业务确认。

清理范围以现有文档为准，覆盖：

- 宠物档案。
- 宠物日历。
- AI 素材、任务、额度。
- AI 对话。
- 宠友圈。
- 点赞、评论、举报。
- 黑名单。
- 招呼、约遛、会话。
- 地点收藏、点评、提交。
- 通知、推送设备。
- 反馈和工单。
- 内容安全样本。

保留范围：

- 账号壳。
- 手机号。
- 昵称、头像、简介。
- 权限和设置。
- 短信登录记录。
- 后台审计。
- 处罚和申诉。

生产建议：

- 默认不对生产环境开放。
- 如需开放，只允许超级管理员。
- 必须输入完整手机号确认。
- 必须双人审批。
- 必须生成清理前摘要快照。

### 验收标准

- 客服输入手机号能在 10 秒内定位用户详情。
- 任意用户处罚状态能在列表和详情看到一致结果。
- 清理业务数据后，移动端 `/me` 返回 `activePet=null`，旧业务内容不再出现。
- 所有用户操作写审计。

### 7.4 宠物档案

### 目标

支撑排查宠物资料、头像、AI 形象、生日、体重、宠友圈封面等问题。

### 当前状态

已实现排查与基础媒体治理页：

- `GET /admin/pets`
- `GET /admin/pets/{petId}`
- `PATCH /admin/pets/{petId}`
- `POST /admin/pets/{petId}/media/{avatar|ai-avatar|cover}/clear`
- `POST /admin/pets/{petId}/media/{avatar|ai-avatar|cover}/replace`

已开放后台资料修正：昵称、类型、品种、性别、生日、体重。必须填写原因，写入审计并通知用户；移动端读取同一份 `users.pets`，下一次刷新后生效。

已开放普通头像、AI 灵伴形象和宠友圈封面替换；重复宠物合并已支持同一用户内迁移，跨用户合并仍禁止。

### 列表字段

- 宠物 ID。
- 头像。
- 宠物名。
- 物种。
- 品种。
- 性别。
- 生日完整度。
- 年龄。
- 体重。
- 主人手机号。
- 是否默认宠物。
- 普通头像状态。
- AI 形象状态。
- 宠友圈封面状态。
- 最近 AI 任务。
- 宠物日历记录数。
- 宠友圈小事数。
- 地点点评数。
- 最近关联时间。

### 筛选条件

- 宠物名。
- 主人手机号。
- 宠物 ID。
- 物种。
- 品种。
- 性别。
- 生日完整度：未知、仅年份、年月、完整日期、异常。
- 头像状态：无头像、普通头像、AI 形象、有封面。
- AI 任务 ID。

### 详情页需求

- 宠物基础资料。
- 主人账号。
- 普通头像预览。
- AI 形象预览。
- 宠友圈封面预览。
- 宠物日历记录。
- AI 任务记录。
- AI 对话摘要。
- 宠友圈动态。
- 地点点评和约遛记录。

### 后台动作

当前已开放：

- 清空违规普通头像。
- 清空违规 AI 灵伴形象。
- 清空违规宠友圈封面。
- 使用公开图片 URL 替换普通头像。
- 使用公开图片 URL 替换 AI 灵伴形象。
- 使用公开图片 URL 替换宠友圈封面。
- 将 ready AI 形象任务结果应用到同账号指定宠物档案。
- 合并同一用户下重复宠物档案，并迁移日历、AI 任务、AI 对话、宠友圈、通知和会话卡片引用。
- 写入 before/after 审计。
- 给用户写入站内通知。

生产期可开放：

- 将 AI 形象加入样本复盘或强制下架原始结果。
- 跨用户或争议归属宠物合并仍不开放；如确需处理，应先走人工工单确认和更细权限。

风险：

- 宠物资料被 AI 对话、宠物日历、宠友圈、消息、地点点评引用。
- 合并档案必须处理所有引用迁移。
- 清空头像或 AI 形象会影响首页和宠友圈展示。
- 替换普通头像会解除旧 AI 形象任务关联并清空旧动效字段，避免移动端继续使用过期素材。
- 应用 AI 形象任务结果会更新移动端真实 `avatarUrl` 并清空旧动效字段；必须限定同一用户宠物并写入审计。
- 合并重复宠物必须限定同一用户；目标宠物保留现有资料，源宠物只补齐空字段，避免把目标宠物主页和头像意外覆盖。

### 验收标准

- 任意宠物能从宠物列表跳转到主人用户详情。
- 生日未知、仅年份、年月、完整日期能正确区分。
- AI 形象状态不能只凭 `avatarUrl` 判断，应关联 ready 且已接受的任务；清空头像后不能继续显示为 AI 形象已应用。
- 清空头像、AI 形象、封面后，移动端真实展示会回到现有兜底头像、历史小事图片或宠物头像。
- 替换头像或宠友圈封面后，移动端 `/pets` 和宠友圈资料页下一次刷新能读到新 URL，用户通知中心能看到替换说明。
- 从 AI 任务页应用 ready 结果后，目标宠物在后台显示为 AI 形象已应用，移动端 `/pets` 读取同一 URL，旧动效不会继续播放。
- 合并重复宠物后，移动端 `/pets` 不再返回源宠物；目标宠物能读到迁移后的宠物日历、AI 对话、宠友圈小事、AI 任务和通知；后台审计有 `pet.profile.merge`。

### 7.5 宠物日历

### 目标

排查体重、疫苗/驱虫、备忘、AI 自动写入、宠友圈同步备忘等记录。

### 当前状态

已实现排查和低风险修正页：

- `GET /admin/pet-calendar`
- `PATCH /admin/pet-calendar/{recordId}`

移动端产品名已统一为“宠物日历”，后端技术 store 仍沿用 `health`。

### 记录类型

- 体重。
- 疫苗/驱虫。
- 备忘。
- 宠友圈同步备忘。
- AI 对话自动写入备忘。
- AI 对话自动写入体重。
- AI 医疗风险提醒。

### 列表字段

- 记录 ID。
- 类型。
- 标题。
- 内容摘要。
- 宠物。
- 主人手机号。
- 日期。
- 状态。
- 来源。
- 是否开启提醒。
- 是否 AI 写入。
- 创建时间。
- 更新时间。

### 筛选条件

- 类型。
- 状态。
- 来源。
- 日期区间。
- 手机号。
- 宠物名。
- 标题或内容。
- 记录 ID。

### 状态口径

疫苗/驱虫后端状态：

- `due`：未完成计划。
- `overdue`：已过计划日期但未完成。
- `done`：已完成。

移动端展示口径：

- `due` 和 `overdue` 统一展示为“计划中”。
- 不再展示“待接种”，避免用户理解成本过高。

### 后台动作

当前已开放：

- 修复明显错误体重：`kg`、记录日期、备注。
- 修复疫苗/驱虫计划：名称、计划日期、`due / overdue / done` 状态、提醒开关。
- 修复备忘：标题、内容、提醒时间、提醒开关、重复频率。
- 新增体重、疫苗/驱虫、备忘，来源标记为“运营新增”。
- 软删除和恢复宠物日历记录，删除后移动端不再展示，恢复后重新展示，后台保留快照、原因和恢复入口。
- 批量删除和批量恢复，单次最多 50 条；逐条写审计和通知，同时写批量汇总审计。
- 所有新增、修正、删除、恢复必须填写原因，写入对应审计，并通知用户。
- 操作的是移动端真实 `/health/*` 数据，不维护后台独立副本。

仍暂不开放：

- 对宠友圈同步备忘进行源动态联动编辑或删除；如需处理源内容，应走宠友圈内容治理链路。
- 高风险动作的双人复核和多角色权限。

要求：

- 所有编辑必须写 before/after。
- AI 自动写入记录要保留来源。
- 不能因为后台打开列表而创建默认记录。

### 验收标准

- 新用户没有任何记录时，后台和移动端都不应自动制造默认建档记录或默认疫苗记录。
- 同一天多条记录必须按具体时间展示。
- AI 自动写入和用户手动记录能区分来源。

### 7.6 AI 灵伴形象

### 目标

解决 AI 形象生成失败、卡住、额度异常、结果质量、供应商成本和提示词质量问题。

### 当前状态

已实现：

- 生成任务列表。
- 上传素材列表。
- 生成反馈列表。
- 用量成本。
- provider 监控。
- 供应商调用轨迹：新任务会记录 submit / status / action 的脱敏请求摘要、返回摘要、耗时和成本快照。
- AI 样本池：支持将任务沉淀为提示词优化样本、供应商异常样本或素材质量样本，支持待复盘、已复核、已忽略状态和 CSV 导出；移动端生成反馈会自动进入提示词样本，供应商提交/状态异常会自动进入供应商异常样本。
- 刷新、重试、标记失败、人工返还额度和供应商失败自动返还额度。
- AI 外围系统配置：在配置中心查看和编辑灵伴形象 provider、gpt-image2 model/resolution/size/prompt、TTAPI 备用 provider prompt、宠物 AI 对话 provider、DeepSeek model/thinking/temperature/max_tokens/system prompt。

### 任务列表字段

- 任务 ID。
- 用户手机号。
- 宠物。
- mediaId。
- provider。
- provider 外部任务 ID。
- 最近调用阶段。
- 调用轨迹数。
- 最近调用耗时。
- 成本快照。
- model。
- 状态：processing、ready、failed。
- 进度。
- 是否卡住。
- 原图预览。
- 结果图预览。
- 错误码。
- 错误信息。
- 创建时间。
- 更新时间。
- 完成耗时。
- 是否已接受。
- 是否已返还额度、返还来源、返还原因。

### 筛选条件

- 任务 ID。
- 手机号。
- 宠物 ID。
- mediaId。
- provider。
- 状态。
- 创建时间。
- 是否卡住。
- 是否有反馈。
- 错误码。
- 是否已接受。

### 任务详情

- 用户和宠物信息。
- 上传素材分析。
- 当前提示词版本。
- 当前生效 prompt 模板和示例渲染结果。
- provider 请求参数摘要。
- provider 外部任务 ID。
- provider 调用轨迹：阶段、endpoint、method、供应商状态、耗时、成本、错误摘要。
- SLA 时间线：创建、提交、状态查询、结果就绪、失败、用户采用。
- 生成结果 URL。
- 用户接受记录。
- 用户反馈。
- 错误时间线。
- 额度消耗记录。
- 审计记录。

### 操作

- 刷新任务状态。
- 重试任务。
- 标记失败。
- 人工返还额度；供应商提交失败、供应商超时和供应商返回失败默认自动返还。
- 标记为供应商异常样本。
- 标记为提示词优化样本。
- 复核或忽略 AI 样本，写入审计日志。
- 生产期可考虑：将结果应用到宠物头像。

### 稳定性需求

- 卡住判定：processing 超过配置阈值，或进度长期不变。
- 前端 loading 不能无限卡住，应轮询后端状态并处理超时。
- 失败需要区分用户输入问题、供应商失败、网络失败、内容安全失败、系统异常。
- 额度返还规则必须明确：供应商失败默认返还；用户主动重试或输入不合格不一定返还。
- prompt/provider 调整必须走配置中心发布、草稿、审批、预约发布、版本历史和审计链路。
- 样本池只提供复盘证据，不自动修改线上 prompt、provider 或移动端展示。
- 自动入池只产生后台待复盘样本，不自动重跑任务、不自动扣/返额度、不自动下发新配置。
- 供应商调用轨迹必须脱敏保存：不保存 API Key、base64 原图、完整图片 URL 或完整 prompt 原文；只保存 prompt hash/长度、图片数量、状态、耗时、成本和错误摘要。

### 图片背景要求

当前 AI 形象目标是无背景或透明背景风格，并在 App 端正确处理透明通道。

后台需要支持：

- 预览原始结果图。
- 检测是否疑似棋盘格背景被当成像素写入。
- 标记背景异常样本。
- 必要时重新处理透明背景或提示词样本。

### 验收标准

- 13531850966 这类真实测试用户卡住时，后台能看到任务状态、更新时间、错误和 provider 信息。
- 自动或人工返还额度后，移动端 `/ai/usage` 立即体现；重复返还会被后台拦截。
- 重试和标记失败都有审计。
- 入样本池、复核和忽略都有审计。
- `ai_avatar_samples` 可在运营导出目录中看到。
- 不导出原图 base64 或图片二进制。

### 7.7 AI 对话

### 目标

排查 AI 回复质量、宠物第一人称口吻、医疗风险、自动写入记录、上下文污染等问题。

### 当前状态

已实现：

- AI 回复列表。
- 摘要搜索。
- 查看全文需填写原因。
- 标记质量问题、医疗样本、误触发、漏触发。
- 隐藏异常回复。
- 移动端不再展示被隐藏回复，后续上下文也跳过。

### 列表字段

- 消息 ID。
- 用户手机号。
- 宠物。
- 模型。
- 时间。
- 用户问题摘要。
- AI 回复摘要。
- 是否医疗风险。
- 是否自动写入。
- 写入类型：备忘、体重、疫苗/驱虫、宠物资料。
- 管理标签。
- 是否隐藏。

### 筛选条件

- 手机号。
- 宠物名。
- 消息 ID。
- 全部、医疗风险、自动写入、已隐藏、有标签。
- 关键词。

### 详情需求

- 完整上下文。
- 用户问题。
- AI 回复。
- 系统提示词摘要。
- 宠物档案快照。
- 自动写入对象。
- 医疗风险命中原因。
- 用户反馈。
- 审计记录。

### 操作

- 查看全文。
- 添加质量标签。
- 隐藏回复。
- 取消隐藏，生产期需二次确认。
- 加入医疗风险样本。
- 加入提示词优化样本。

### AI 口吻质量规则

后台应支持抽检以下问题：

- AI 是否以宠物第一人称回复。
- 是否错误称“我是 XX 的灵伴”。
- 是否给出确定性医疗诊断。
- 是否出现外部联系方式。
- 是否错误更新宠物资料。
- 是否重复写入日历记录。

### 验收标准

- 查看完整上下文必须写审计。
- 隐藏回复后 App 历史消息和后续上下文都不再使用该回复。
- 医疗风险样本能被导出或检索。

### 7.8 内容安全任务池

### 目标

把宠友圈、评论、地点点评、新增地点、举报、规则命中样本聚合到一个人工处理池，避免分散在多个页面漏处理。

### 当前状态

已实现：

- `GET /admin/moderation/tasks`
- 批量处理。
- 认领。
- 单任务处理。
- 文本规则：阻断关键词、高风险关键词、复审关键词。
- 规则命中样本沉淀。
- 腾讯云文本/图片机审基础链路。
- 公开图片统一审核池。

待补齐：

- 腾讯云异步回调、密钥轮换和策略命中归因。
- 处罚建议命中率复盘、自动升级策略和双人审批。
- 误杀/漏杀复盘。

### 任务来源

- 用户举报。
- 被举报宠友圈动态。
- 被举报宠友圈评论。
- 待审核地点点评。
- 待审核新增地点。
- 文本规则命中小事。
- 文本规则命中评论。
- 文本规则命中地点内容。
- 图片审核命中，生产期新增。
- 头像审核命中，生产期新增。

### 任务字段

- 任务 ID。
- 来源类型。
- 风险分。
- 风险标签。
- 状态。
- 优先级。
- SLA 到期时间。
- 负责人。
- 作者手机号。
- 举报人手机号，可选。
- 目标对象 ID。
- 内容摘要。
- 图片预览，可选。
- 命中规则。
- 创建时间。
- 最近更新时间。

### 状态

- `pending`：待处理。
- `reviewing`：处理中。
- `escalated`：已升级。
- `approved`：通过。
- `hidden`：已隐藏。
- `deleted`：已删除。
- `rejected`：已驳回。
- `invalid`：举报无效。
- `closed`：关闭。

### 操作

- 认领。
- 转交。
- 通过。
- 隐藏。
- 删除。
- 驳回。
- 举报无效。
- 升级。
- 创建处罚。
- 添加备注。
- 批量认领。
- 批量通过/隐藏/驳回。

### 自动审核建议

生产级内容安全建议：

- 文本先走规则，再走模型。
- 图片上传后走图片审核，结果分为 pass、review、block。
- block 直接拒绝或隐藏。
- review 进入人工池。
- pass 直接发布或进入原业务审核。
- 所有模型结果沉淀为样本，供误杀/漏杀复盘。

### 移动端影响

- 小事进入审核：发布端提示“内容已进入审核”，附近列表不展示。
- 评论命中规则：建议直接提示修改，不制造“发了但别人看不到”。
- 地点点评/新增地点：仍展示待审核。
- 被隐藏/删除内容：App 不再展示。
- 举报处理结果：通知举报人；有效举报通知作者。

### 验收标准

- 内容安全任务不会和举报中心处理结果冲突。
- 同一举报在任一入口处理后，另一个入口状态同步。
- 批量处理返回逐条成功/失败数量。
- 所有处理写审计。

### 7.9 宠友圈

### 目标

治理附近宠友圈动态、评论、图片、互动和作者违规。

### 当前状态

已实现：

- 动态列表。
- 评论列表。
- 动态隐藏、恢复、删除。
- 评论隐藏、恢复、删除。
- App 过滤 hidden/deleted 内容。
- 举报证据快照已基础落地：举报创建时固化 `evidenceSnapshot`，有效举报、隐藏、删除和处罚建议共用同一份快照。
- 有效举报会生成处罚建议，举报中心支持按建议创建处罚，并把处罚状态同步到移动端写接口限制。
- 宠友圈动态/评论列表已支持直接创建作者处罚，自动固化内容证据快照，写入 `social.post.sanction` / `social.comment.sanction` 审计，处罚结果会通知用户并实时限制移动端写接口。
- 宠友圈动态/评论列表已支持证据详情入口：查看前必须填写原因，详情聚合内容快照、图片、举报、评论、作者当前限制、直接关联处罚和近期审计，并写入 `social.post.evidence.view` / `social.comment.evidence.view`。

待补齐：

- 独立详情页路由。
- 独立证据快照表和图片证据存储。
- 图片证据长期归档。

### 动态列表字段

- 动态 ID。
- 作者手机号。
- 宠物名。
- 物种。
- 正文摘要。
- 图片数。
- 点赞数。
- 评论数。
- 举报数。
- 可见范围。
- 状态。
- 是否本人删除。
- 是否后台隐藏。
- 创建时间。
- 更新时间。

### 评论列表字段

- 评论 ID。
- 动态 ID。
- 评论人手机号。
- 动态作者手机号。
- 内容摘要。
- 状态。
- 举报数。
- 创建时间。

### 筛选条件

- 手机号。
- 动态 ID。
- 评论 ID。
- 关键词。
- 状态。
- 是否被举报。
- 图片数。
- 创建时间。
- 物种。

### 操作

- 隐藏动态。
- 恢复动态。
- 删除动态。
- 隐藏评论。
- 恢复评论。
- 删除评论。
- 跳转作者用户详情。
- 创建作者处罚。
- 生成证据快照。

### 证据快照

处理举报或处罚前应保存：

- 文本内容。
- 图片 URL 或安全快照引用。
- 作者。
- 发布时间。
- 互动数。
- 举报原因。
- 处理前状态。

生产建议不可依赖原动态状态，因为动态后续可能被用户删除或修改。

### 验收标准

- 隐藏后所有列表、详情、评论入口都不可见。
- 删除后点赞、评论、通知不再造成前端角标异常。
- 宠友圈举报能从动态或评论跳转到对应内容。

### 7.10 举报与拉黑

### 目标

处理用户举报，形成“举报提交 - 后台处理 - 通知结果 - 必要处罚 - 可申诉”的闭环。

### 当前状态

已实现：

- 宠友圈动态举报。
- 宠友圈评论举报。
- 地点点评举报，举报后对举报者即时隐藏；后台可处理为有效/无效/升级，或有效并隐藏/删除公开点评。
- 举报人侧即时隐藏。
- 后台举报中心。
- 处理为有效/无效/关闭/升级/处理中。
- 有效举报通知作者。
- 举报人收到处理结果。
- 处罚建议。
- 举报证据快照。
- 聊天消息举报，含按原因查看举报消息上下文窗口、写审计、标记疑似骚扰。
- 按建议处罚，保留举报来源、处罚模板和证据快照；重复处罚会被后端拦截。
- 作者被处罚后，移动端写接口按处罚类型拦截，并保留安全中心申诉入口。
- 举报处理结果申诉：举报人可对无效/关闭结果申诉，被举报方可对有效结果申诉；后台申诉中心统一接手、通过、驳回，并通过通知中心同步结果。

拉黑已实现：

- 拉黑后双方互不可见。
- 清理双方相关通知。
- 会话和附近列表受影响。
- 拉黑原因持久化，支持原因枚举和补充说明。
- 后台关系消息页展示拉黑记录和原因统计。
- 用户管理展示被拉黑次数、不同拉黑人数和最高频原因。
- 被 3 个不同用户拉黑时自动打上 `被频繁拉黑` 风险标签，并写入审计日志；该标签只用于运营排查，不自动处罚。

### 举报列表字段

- 举报 ID。
- 举报类型：动态、评论、用户、地点、消息。
- 举报人。
- 被举报人。
- 目标对象。
- 举报原因。
- 补充说明。
- 目标内容摘要。
- 状态。
- 处理人。
- 处理时间。
- 结果通知状态。
- 处罚建议。

### 处理动作

- 接手。
- 标记有效。
- 标记无效。
- 关闭。
- 升级。
- 有效并隐藏内容。
- 有效并删除内容。
- 按建议处罚。
- 自定义处罚。

### 通知规则

- 举报无效：通知举报人。
- 举报有效：通知举报人和作者。
- 作者被处罚：另发处罚通知。
- 申诉结果：通知申诉人。

### 验收标准

- 同一内容被多个用户举报，应聚合显示重复举报数。
- 已处理举报不能重复处罚，除非管理员明确追加处罚。
- 有效举报必须能追溯证据快照。
- 按举报建议创建的处罚必须能在移动端账号快照、通知中心和写接口拦截中体现。

### 7.11 关系消息

### 目标

排查打招呼、约遛、会话、通知角标、未读数和拉黑关系问题。

### 当前状态

已实现关系排查页 `GET /admin/social-relations`。

已从举报中心开放：

- 私信消息举报上下文窗口，必须填写查看原因并写审计。
- 私信消息举报标记疑似骚扰，联动用户风险标签。

已从关系消息页开放：

- 待处理招呼/约遛可执行“修复接受”或“关闭”，必须填写原因并写审计。
- 修复接受会补齐 accepted 关系、双方移动端会话入口和可发消息状态。
- 关闭 pending 约遛后，接收方不能再通过该待处理邀请直接回复并自动接受。
- 从已有关系行查看最近私信上下文窗口，按 `social.messageAccess` 策略校验窗口大小和查看原因，并写 `social.relation.message_context.view` 审计。
- 在上下文窗口内隐藏违规非系统私信，写 `social.relation.message.hide` 审计。
- 隐藏后双方移动端 `/conversations/{id}/messages` 不再展示该消息，双方 `/conversations` 摘要会重新计算，避免继续露出被隐藏文本。

暂未开放：

- 任意会话全文检索。
- 后台直接新增、改写或补发会话消息。

### 列表类型

- 招呼。
- 宠友圈来源招呼。
- 约遛。
- 会话。
- 拉黑。

### 列表字段

- 关系 ID。
- 类型。
- 发起人。
- 接收人。
- 宠物。
- 来源。
- 状态。
- 来源动态 ID。
- 地点。
- 时间。
- 会话 ID。
- 消息数。
- 未读数。
- 相关通知。
- 拉黑原因。
- 拉黑原因补充。

### 筛选条件

- 类型。
- 状态。
- 手机号。
- 宠物名。
- 地点。
- 动态 ID。
- 会话 ID。
- 拉黑原因。

### 关键业务规则

- A 向 B 发起约遛，A 侧应显示等待 B 接受。
- B 侧收到约遛后可以直接回复，回复视为默认接受。
- 双方接受过招呼或约遛后，可以查看对方宠友圈。
- 看他人的宠友圈不能展示“我”的标记。
- 拉黑后双方动态、会话、通知、招呼、约遛互相不可见。

### 生产期动作

- 查看最近私信上下文窗口，需高权限和原因。
- 标记骚扰会话。
- 隐藏违规消息。
- 创建处罚。
- 修复异常关系状态。

### 验收标准

- 后台能定位“通知点进去未刷新评论数”“招呼角标不消失”“约遛死循环”这类链路问题。
- 默认不展示完整私信正文。
- 查看私信上下文必须有审计。
- 隐藏私信后，双方移动端消息列表和会话摘要都不能继续展示被隐藏文本。
- 修复 pending 招呼/约遛后，移动端招呼请求、会话可发消息状态和约遛可回复状态必须同步变化。

### 7.12 地图地点

### 目标

治理 Lumii 自有宠物友好地点层，包括地点点评、新增地点、地点质量、重复地点、用户贡献。

### 当前状态

已实现：

- 地点列表。
- 地点质量分和质量证据。
- 重复地点候选提示。
- 地点点评审核。
- 新增地点审核。
- 地点详情编辑。
- 人工确认地点合并，并迁移点评、收藏、通知、约遛等引用。
- 地点点评/新增地点图片接入统一图片审核池，审核通过后随地点内容入库。
- 公开点评展示策略：后台配置排序、是否只看有图、后端返回上限和移动端详情首屏展示条数。
- 审核结果通知。
- 内置地点审核原因模板；通过/驳回时可套用，最终原因可编辑，并写入通知、审计和 CSV 导出。
- 新增地点支持关联已有地点，视为审核通过并把图片补充到目标地点。
- 基础地点贡献账本：发现新地点 `+10`，补充已有地点 `+5`，后台展示贡献记录和贡献分，并支持运营手动调整或撤销贡献记录。

待补齐：

- 用户本人公开贡献身份和轻量等级已接入；后台纠偏会实时影响移动端汇总；排行榜、活动奖励或兑换策略仍待定。

### 地点列表字段

- 地点 ID。
- 名称。
- 地址。
- 来源：高德、手动、导入。
- 经纬度，默认不展示精确值给低权限角色。
- 类型。
- 宠物友好状态。
- 猫狗支持。
- 点评数。
- 收藏数。
- 审核中提交数。
- 最近更新时间。

### 点评审核字段

- 点评 ID。
- 地点。
- 提交人。
- 内容。
- 图片数。
- 状态：pending_review、approved、rejected。
- 命中规则。
- 创建时间。
- 审核人。
- 审核原因。
- 审核模板 ID。
- 审核模板标题。

### 新增地点审核字段

- 提交 ID。
- 名称。
- 地址。
- 体验内容。
- 图片数。
- 提交人。
- 相似地点。
- 状态。
- 创建时间。
- 审核人。
- 审核原因。
- 审核模板 ID。
- 审核模板标题。

### 操作

- 点评通过。
- 点评驳回。
- 新增地点通过。
- 新增地点驳回。
- 套用审核原因模板，提交前可编辑最终原因。
- 合并到已有地点。
- 编辑地点资料。
- 标记地点不适合宠物。
- 关闭重复提交。

### 验收标准

- 点评审核结果能在用户通知中心看到。
- 新增地点通过后能生成 manual 地点。
- 套用模板的审核记录能追溯模板 ID、模板标题和最终原因。
- 重复地点不应无限新增。
- 人工合并后旧地点不再出现在地点目录，旧地点的点评、收藏、通知和约遛引用应迁移到目标地点。
- 地点审核记录可追溯。

### 7.13 工单中心

### 目标

把用户反馈变成可分配、可回复、可追踪、可评价的客服闭环。

### 当前状态

已实现：

- App 反馈自动生成工单。
- 反馈收集页：查看 App 原始反馈，支持状态、分类、关键词筛选，并可快速转处理中或关闭。
- 工单列表。
- 工单详情。
- 负责人。
- 状态和优先级。
- 批量处理。
- 内部备注。
- 客服回复。
- 回复模板。
- 用户补充文字和截图。
- 用户评分。
- 用户重开。
- 移动端我的反馈。
- 工单 SLA 配置化，按 urgent/high/normal/low 拆分首响/解决小时数，并联动后台排序、统计、导出和移动端预计响应文案。
- 工单负责人枚举、客服排班和值班状态；后台分配必须选择已配置负责人。
- 工单基础质量统计、按负责人绩效视角、排班冲突检测和批量处理复盘；数据来自真实工单、移动端评分/重开和后台审计日志。
- 批量回复审批、近 7 天/近 30 天 KPI 目标对照和质检待看队列；审批通过后复用单工单回复逻辑触达移动端通知中心。
- 周/月服务复盘和外包结算预览；按工单最近活动时间回算近 7 天/近 30 天数据，结算预览按已解决、首响达标、好评、低分、重开和 SLA 未达标实时计算。
- 反馈收集页状态更新会同步到关联工单；正式回复用户仍在工单中心完成。

待补齐：

- 更正式的客服质检制度：抽检申诉规则、自然周/月或排班周期锁账、外包客服真实付款审批/导出/税费、批量回复双人审批/撤回和多角色权限。

### 工单状态

- `received`：新反馈。
- `reviewing`：处理中。
- `waiting_user`：等待用户。
- `resolved`：已解决。
- `closed`：已关闭。

### 优先级

- `urgent`：紧急。
- `high`：高。
- `normal`：普通。
- `low`：低。

### 列表字段

- 工单 ID。
- 用户手机号。
- 分类。
- 内容摘要。
- 状态。
- 优先级。
- SLA。
- 负责人。
- 备注数。
- 回复数。
- 附件数。
- 重开次数。
- 满意度。
- 创建时间。
- 最近更新时间。

### 详情结构

- 用户信息。
- 原始反馈。
- 附件。
- 对话时间线。
- 内部备注。
- 关联对象。
- 处理状态。
- 满意度评价。
- 操作审计。

### 操作

- 分配负责人。
- 修改优先级。
- 修改状态。
- 添加内部备注。
- 客服回复。
- 套用模板。
- 保存模板。
- 关闭工单。
- 标记已解决。
- 编辑关联对象。

### SLA 建议

- 紧急：2 小时。
- 高：8 小时。
- 普通：24 小时。
- 低：72 小时。

### 验收标准

- 用户能在 App 查看客服回复。
- 客服回复可选择是否通知用户。
- 用户补充后工单回到处理中。
- 关闭后用户可评分和重开。
- 冻结/封禁用户仍能访问工单和申诉相关入口。

### 7.14 用户处罚与申诉

### 目标

对违规用户执行警告、禁言、冻结、封禁，并提供申诉复核。

### 当前状态

已实现：

- 处罚类型：warning、mute、freeze、ban。
- 处罚模板。
- 创建处罚。
- 撤销处罚。
- 处罚到期计算。
- 用户列表展示账号状态。
- 移动端写操作受处罚影响。
- 申诉中心。
- 申诉通过可联动撤销处罚。
- 处罚通知。
- 处罚策略复盘：按模板、来源、申诉、撤销、重复违规和举报处罚建议回算策略表现，并展示当前移动端受限用户口径。

待补齐：

- 双人审批。
- 批量处罚审批。
- 处罚自动升级策略。

### 处罚类型

- 警告：不限制功能，仅通知用户。
- 禁言：限制发布、评论、点赞、招呼、约遛、私信、地点投稿、地点点评等互动。
- 冻结：限制大多数写操作。
- 封禁：长期限制账号使用。

### 处罚字段

- 处罚 ID。
- 用户手机号。
- 类型。
- 原因。
- 时长。
- 开始时间。
- 结束时间。
- 来源：手动、举报、内容安全、系统规则。
- 关联举报 ID。
- 关联证据快照。
- 创建人。
- 撤销人。
- 撤销原因。
- 状态：active、expired、revoked。

### 申诉字段

- 申诉 ID。
- 用户手机号。
- 关联处罚。
- 申诉内容。
- 状态：pending、reviewing、approved、rejected、closed。
- 接手人。
- 复核原因。
- 是否撤销处罚。
- 创建时间。
- 更新时间。

### 验收标准

- 处罚立即影响移动端写接口。
- 申诉通过后可撤销处罚并通知用户。
- 处罚新增、撤销、申诉处理都有审计。
- 处罚过期后自动失效。

### 7.15 通知运营

### 目标

支持运营向用户发送系统通知、活动通知、客服通知、审核结果通知，并能管理草稿、预约、撤回和模板。

### 当前状态

已实现：

- 系统通知发送。
- 全量、今日活跃、指定手机号。
- 是否尊重用户通知开关。
- 草稿。
- 预约发送。
- 撤回。
- 模板。
- 移动端通知中心 actionRoute。
- 后台系统通知频控：24 小时批次上限、单用户 24 小时入站上限。
- 发送审批：支持 `pending_approval` 待审批状态，审批通过后才触达用户或转为预约。
- 强制发送审批配置：开启后后端拒绝直接发送和直接预约。
- 站内通知效果统计：已读数、已读率、去重点击数、点击总次数、打开率、最近点击时间。

待补齐：

- 真实厂商 Push。
- 厂商 Push 送达、展示、点击回执。
- 高风险最少会签人数已接入；生产期仍需审批值守通知和厂商 Push 回执。
- 通知人群包已落地；更复杂的动态人群、实验分流仍未接入。
- 系统通知对象深链已落地；更友好的后台对象搜索选择器仍可后续增强。

### 通知字段

- 通知批次 ID。
- 标题。
- 正文。
- 目标范围。
- 目标数量。
- 送达数量。
- 跳过数量。
- 状态：draft、pending_approval、scheduled、sent、failed、canceled。
- 发送人。
- 预约时间。
- actionRoute。
- 是否尊重用户开关。
- 频控快照。
- 频控跳过数。
- 已读数量。
- 已读率。
- 去重点击数量。
- 点击总次数。
- 打开率。
- 最近已读时间。
- 最近点击时间。
- 创建时间。

### 目标范围

- 全部用户。
- 今日活跃用户。
- 指定手机号。
- 生产期扩展：用户标签、人群包、地区、宠物类型、活跃度、版本号。

### 频控规则

- 配置中心可设置后台系统通知 24 小时批次上限，默认 5 批。
- 配置中心可设置单用户 24 小时入站上限，默认 2 条。
- 批次超限时整批失败并写入通知历史和审计。
- 单用户超限时跳过该用户，批次继续发送给其他未超限用户。
- 审核结果、工单回复、申诉处理不计入营销频控。
- 强制通知会进入发送审批治理；生产期若接多管理员，可继续补双人审批。

### 验收标准

- 预约通知到点后写入用户通知中心。
- 撤回已发送通知后，用户通知列表移除对应 campaign。
- 系统通知可跳转到指定页面。
- 用户读取和点击系统通知后，后台批次历史展示已读、点击和打开率。
- 全量发送必须二次确认。

### 7.16 配置中心

### 目标

让运营无需重新打包 App，也能控制功能开关、额度、维护模式、公告、更新策略、启动提示、内容安全规则。

### 当前状态

已实现：

- `GET /admin/config`
- `PATCH /admin/config`
- `GET /admin/config/approvals`
- `POST /admin/config/approvals`
- `POST /admin/config/approvals/{approvalId}/approve`
- `POST /admin/config/approvals/{approvalId}/cancel`
- `POST /admin/config/revisions/{revisionId}/rollback`
- `GET /app/config`
- 配置联动体检。
- 版本快照。
- 回滚。
- 单 admin 配置发布审批。
- AI 外围系统配置和 prompt/provider 治理。
- 配置实验与 A/B 分流基座。

### 当前配置

AI：

- `ai.petAvatarDailyLimit`
- `ai.petChatDailyLimit`
- `ai.avatar.provider`
- `ai.avatar.gptImage2.model`
- `ai.avatar.gptImage2.resolution`
- `ai.avatar.gptImage2.size`
- `ai.avatar.gptImage2.officialFallback`
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

配置治理：

- `configApproval.requireApproval`
- `configApproval.approvalExpiresHours`

实验与 A/B 分流：

- `experiments.homeAiEntry.enabled`
- `experiments.homeAiEntry.id`
- `experiments.homeAiEntry.name`
- `experiments.homeAiEntry.rolloutPercent`
- `experiments.homeAiEntry.variantBPercent`
- `experiments.homeAiEntry.controlTitle`
- `experiments.homeAiEntry.controlSubtitle`
- `experiments.homeAiEntry.treatmentTitle`
- `experiments.homeAiEntry.treatmentSubtitle`

社交：

- `social.petCircleMaxPhotos`
- `social.discoverRadiusKm`
- `social.nearbyMomentTtlDays`

功能开关：

- `features.aiAvatar`
- `features.petChat`
- `features.petCircle`
- `features.places`
- `features.walkInvite`

App：

- `app.maintenanceEnabled`
- `app.maintenanceMessage`
- `app.announcement`
- `app.update`
- `app.splash`

内容安全：

- `moderation.enabled`
- `moderation.textRulesEnabled`
- `moderation.blockKeywords`
- `moderation.highRiskKeywords`
- `moderation.reviewKeywords`
- `moderation.blockMessage`
- `moderation.reviewMessage`

### 配置治理规则

- 每次保存必须填写发布原因。
- 每次保存生成版本。
- 回滚生成新的版本，而不是删除历史。
- 移动端公开配置不能返回敏感关键词明文。
- 高风险配置已经接入二次确认：维护模式、强制更新、全功能关闭、内容安全规则、核心功能关闭、通知频控关闭等 P0/P1 风险发布前需要输入固定确认文案。
- 可开启强制配置发布审批；开启后，立即发布、发布草稿和回滚版本都必须先提交审批。
- 配置审批通过前不影响 `/app/config`；审批通过后生成配置版本并影响移动端下一次拉取。
- 审批通过时会校验当前配置是否仍等于提交审批时的基线配置，避免旧审批覆盖新配置。
- 生产期配置发布仍应继续补齐审批值守通知、审批后预约通知和灰度人群。

### 验收标准

- 修改图片上限后，移动端发布小事 UI 和后端限制一致。
- 关闭宠友圈后，移动端入口隐藏或阻断，后端接口也返回功能关闭。
- 回滚后移动端下一次拉取配置生效。
- 内容安全关键词不出现在 `/app/config`。
- 命中 P0/P1 风险的立即发布、发布草稿和回滚，未输入确认文案时必须被后端拒绝。
- 强制配置审批开启后，直接发布、发布草稿和回滚必须被后端拒绝；审批通过后 `/app/config` 才变化。

### 7.17 数据看板

### 目标

让运营看到增长、留存、AI、社交、内容安全、地点、工单等核心趋势，并明确当前数据口径限制。

### 当前状态

已实现：

- `GET /admin/analytics?days=14`
- `GET /admin/analytics?days=30&eventName=pet_circle.card_exposure&source=mobile&q=Lucky`
- 用户增长与活跃。
- AI 使用质量。
- 社交互动。
- 移动端基础行为趋势。
- 运营处理压力。
- 业务健康快照。
- 测试期轻量漏斗：AI 灵伴生成、宠友圈浏览互动、地图地点行为、配置触达点击。
- 测试期轻量 Cohort：按注册日分组，展示 D0/D1/D3/D7。
- 事件明细筛选：时间窗口、事件名、route、source、platform、关键词。

当前限制：

- 已补页面、发现、地图、地点、通知和反馈入口等基础移动端事件。
- 生产级严格留存 Cohort 仍需要独立事件表、设备去重和长期窗口；当前为 JSON state 测试期轻量口径。
- Push 真实送达/点击缺厂商回执。
- 外部高德导航只能记录打开动作，无法确认用户是否完成导航。

### 核心指标

增长：

- 新增用户。
- 活跃用户。
- 建档率。
- 多宠用户占比。

AI：

- AI 形象启动数。
- AI 形象成功率。
- AI 形象失败率。
- 平均耗时。
- 额度触顶用户。
- AI 对话次数。
- 医疗风险拦截数。
- GPT Image 成本。
- DeepSeek token。

社交：

- 宠友圈发布数。
- 图片数。
- 点赞数。
- 评论数。
- 打招呼数。
- 招呼接受率。
- 约遛数。
- 会话消息数。

内容安全：

- 规则命中数。
- 待处理任务。
- 已处理任务。
- 举报数。
- 有效举报率。
- 处罚数。
- 申诉数和通过率。

地点：

- 点评提交数。
- 新增地点提交数。
- 审核通过率。
- 收藏数。

客服：

- 工单数。
- 未关闭数。
- SLA 超时数。
- 平均响应时间。
- 满意度。
- 重开率。

### 埋点补齐需求

已补基础事件：

- 页面浏览。
- 发现页曝光。
- 附近伙伴加载。
- 宠友圈小事加载和加载更多。
- 地图打开。
- 地图定位。
- POI 搜索。
- 地点详情查看。
- 地点收藏。
- 打开高德导航。
- 通知点击。
- 宠友圈主页查看。
- 工单入口点击。
- 首页模块级曝光。
- AI 生成入口点击、开始、成功、失败的前端事件。
- 宠友圈动态卡片曝光、点赞点击、评论点击、打招呼点击和约遛点击。

仍待补齐：

- 通知真实曝光。
- 生产级事件表、设备级去重、长期留存窗口和数据仓库。

### 验收标准

- 看板必须标明数据口径。
- 尚未采集的指标不能伪造。
- 可按 7/14/30/60/90 天筛选。
- 可按事件名、页面 route、source、platform 和关键词筛选事件明细。
- 漏斗必须按同一用户的事件顺序计算，不能只累加事件次数。
- 生产期数据应从事件表或数据仓库读取，不直接扫业务 JSON。

### 7.18 数据导出

### 目标

为测试、运营复盘、问题排查提供脱敏 CSV 导出。

### 当前状态

已实现 22 类 CSV：

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

### 导出规则

- 默认最多 1000 行。
- 需要管理员登录。
- 支持按数据集、状态、手机号、开始/结束日期和关键词筛选导出。
- 下载必须填写导出原因，后端强制校验。
- 导出目录展示敏感字段提示，例如手机号、内容、地址、经纬度、设备、原因、备注等。
- 配置中心可开启强制数据导出审批，并设置审批有效期小时数。
- 开启强制审批后，必须先提交导出申请，审批通过后才能下载。
- 下载时校验审批单的数据集、筛选条件和导出原因，避免旧审批下载不同数据。
- 审批通过后在有效期内可下载，并记录下载次数和最近下载时间。
- 下载动作写审计，并记录筛选条件、导出原因、水印 ID 和审批单 ID。
- CSV 每行追加水印列：水印 ID、导出时间、管理员、导出原因和筛选条件。
- 导出页展示最近导出记录，可直接追溯数据集、文件名、水印 ID、导出原因、筛选条件、导出行数、管理员、IP 和时间。
- 手机号、昵称、内容、地址、经纬度、IP、设备、Token、原因、备注、摘要等敏感列默认脱敏。
- 完整敏感字段导出必须具备 `data.export.sensitive` 权限，并且必须提交包含 `includeSensitive=true` 的导出审批；即使关闭全局强制审批，也不能绕过该审批。
- 服务器本地归档任务支持生成短时效签名下载链接，默认 15 分钟，可通过 `LUMII_ADMIN_EXPORT_SIGNED_DOWNLOAD_TTL_MINUTES` 配置；签名链接生成和下载均写入审计。
- 不导出图片二进制。
- 不导出完整设备 token。
- 不导出完整审计 before/after 大对象。
- 当前单 admin 版本已支持按字段脱敏和完整敏感字段授权；生产多角色版本应继续收紧真实角色分配、定期复核和文件外发制度。

### 生产期补齐

- 按数据集专属字段继续扩展筛选，例如举报原因、地点 ID、AI 供应商、工单优先级等。
- 异步生成更大文件和对象存储归档。
- 对象存储签名下载链接过期策略与本地签名链接策略对齐。
- 多管理员双人导出审批的真实排班和审批值守通知。
- 独立导出任务表、对象存储文件归档和更细文件生命周期策略。
- 数据最小化策略。

### 验收标准

- 每次下载审计包含数据集、行数、字段、文件名、导出原因和水印 ID。
- 强制审批开启后，未审批下载会被拒绝；审批下载必须绑定相同数据集、筛选条件和导出原因。
- 每次按筛选下载时，审计包含状态、手机号、时间范围和关键词等筛选条件。
- 导出页能看到最近导出记录，并能随当前数据集选择过滤。
- 普通运营无法导出敏感数据。
- 导出文件字段与后台列表口径一致，并追加水印列。
- 归档任务能生成短时效签名链接；篡改 token 或过期 token 不能下载。

### 7.19 审计日志

### 目标

记录后台谁在什么时候对什么对象做了什么、为什么做、前后变化是什么。

### 当前状态

已实现 `GET /admin/audit-logs`，记录多类后台写操作，并支持按管理员、动作、目标类型、目标/原因关键词和时间范围筛选。

后台审计页已展示匹配日志、高风险动作、缺少原因、链路状态、已签名日志、独立 journal 状态和最新 Hash 等指标；从 2026-06-30 起，后台登录和后台请求触发的审计会记录 IP 与 User-Agent，历史审计可能为空。从当前版本开始，新审计记录会写入 `prevHash/hash` 形成哈希链，并追加到 `admin-audit-journal.jsonl`；旧日志会标记为历史未签名，不伪装成已验证。

### 审计字段

- 审计 ID。
- 管理员 ID。
- 管理员名称。
- 角色。
- 动作。
- 目标类型。
- 目标 ID。
- before 摘要。
- after 摘要。
- 原因。
- IP。
- User-Agent。
- 创建时间。
- chainVersion。
- prevHash。
- hash。
- journal 行：同一审计记录的 JSONL 追加副本。

### 必须审计的动作

- 登录。
- 查看敏感信息。
- 查看完整私信或 AI 上下文。
- 用户备注、标签、处罚、撤销处罚。
- 清理用户业务数据。
- 内容隐藏、恢复、删除。
- 举报处理。
- 地点审核。
- 工单回复。
- 通知发送、撤回。
- 配置保存、回滚。
- 数据导出。

### 生产期要求

- 审计日志不可由普通管理员删除。
- 审计日志至少保留 1 年。
- 新审计记录必须能通过哈希链校验；若修改已签名日志的业务字段，完整性状态必须变为异常。
- 高危操作审计需可导出给内部复盘。
- before/after 不能保存过大的图片或完整聊天原文，敏感内容应保存摘要或证据快照引用。
- 生产期仍需把审计 journal 同步到数据库、WORM 存储或外部日志服务，避免只依赖本机文件。

### 验收标准

- 任一后台写操作能在审计日志中查到。
- 审计日志可按管理员、动作、目标、时间搜索。
- 高危操作审计包含原因。
- 审计页能展示链路状态、已验证数量、历史未签名数量和最新 hash 尾号。
- 审计页能展示独立 journal 是否存在、有效行数、异常行数、文件大小和最新 hash 尾号。

## 8. 生产级内容安全方案

### 8.1 审核对象

生产上线前需要覆盖：

- 宠友圈正文。
- 宠友圈图片。
- 宠友圈评论。
- 用户头像。
- 宠物头像。
- AI 形象结果图。
- 宠友圈封面。
- 地点点评正文。
- 地点点评图片。
- 新增地点名称、地址、正文、图片。
- 私信文本。
- 工单附件，至少做基础安全扫描。

### 8.2 审核链路

推荐链路：

1. 用户提交内容。
2. 后端基础规则校验。
3. 文本内容进入第三方文本审核。
4. 图片内容进入第三方图片审核。
5. 结果为 pass：进入业务发布或原审核流。
6. 结果为 review：进入内容安全任务池。
7. 结果为 block：拒绝发布或隐藏，向用户展示合适提示。
8. 人工处理结果回标，用于调规则和模型。

### 8.3 审核结果

统一结果：

- `pass`：通过。
- `review`：人工复审。
- `block`：阻断。
- `error`：审核服务异常，按保守策略处理。

建议保守策略：

- 宠友圈正文审核异常：进入人工审核，不直接公开。
- 评论审核异常：提示稍后再试，避免隐形评论。
- 私信审核异常：允许基础规则通过后发送，但记录风险，具体看上线风险等级。
- 头像/图片审核异常：不公开展示，进入复审。

### 8.4 审核运营闭环

后台必须支持：

- 样本列表。
- 误杀标记。
- 漏杀标记。
- 规则命中统计。
- 模型命中统计。
- 审核员处理量。
- SLA 超时。
- 处罚转化率。
- 申诉通过率。

## 9. 后台 API 需求草案

当前已实现接口保留，生产期建议按以下资源组织。

### 9.1 鉴权

- `POST /admin/auth/login`
- `POST /admin/auth/logout`
- `GET /admin/me`
- `GET /admin/accounts`
- `POST /admin/accounts`
- `PATCH /admin/accounts/{adminId}`
- `POST /admin/accounts/{adminId}/disable`
- `POST /admin/accounts/{adminId}/reset-password`

### 9.2 工作台与看板

- `GET /admin/dashboard/summary`
- `GET /admin/analytics`
- `GET /admin/system/health`

### 9.3 用户

- `GET /admin/users`
- `GET /admin/users/{phone}`
- `GET /admin/users/{phone}/timeline`
- `POST /admin/users/{phone}/notes`
- `POST /admin/users/{phone}/risk-tags`
- `GET /admin/users/{phone}/business-data-summary`
- `GET /admin/data-clear-approvals`
- `POST /admin/data-clear-approvals`
- `POST /admin/data-clear-approvals/{approvalId}/approve`
- `POST /admin/data-clear-approvals/{approvalId}/cancel`
- `POST /admin/users/{phone}/clear-business-data`

### 9.4 宠物与日历

- `GET /admin/pets`
- `GET /admin/pets/{petId}`
- `PATCH /admin/pets/{petId}`
- `POST /admin/pets/{petId}/media/{avatar|ai-avatar|cover}/clear`
- `GET /admin/pet-calendar`
- `PATCH /admin/pet-calendar/{recordId}`

### 9.5 AI

- `GET /admin/ai/avatar-jobs`
- `GET /admin/ai/avatar-jobs/{jobId}`
- `POST /admin/ai/avatar-jobs/{jobId}/refresh`
- `POST /admin/ai/avatar-jobs/{jobId}/retry`
- `POST /admin/ai/avatar-jobs/{jobId}/mark-failed`
- `POST /admin/ai/avatar-jobs/{jobId}/refund-quota`
- `GET /admin/ai/media`
- `GET /admin/ai/avatar-feedback`
- `POST /admin/ai/avatar-feedback/{jobId}/review`
- `GET /admin/ai/pet-chat/messages`
- `GET /admin/ai/pet-chat/quality-review`
- `POST /admin/ai/pet-chat/messages/{messageId}/view`
- `POST /admin/ai/pet-chat/messages/{messageId}/tag`
- `POST /admin/ai/pet-chat/messages/{messageId}/quality-review`
- `POST /admin/ai/pet-chat/messages/{messageId}/hide`

### 9.6 社交与内容

- `GET /admin/social/posts`
- `GET /admin/social/posts/{postId}`
- `POST /admin/social/posts/{postId}/hide`
- `POST /admin/social/posts/{postId}/restore`
- `POST /admin/social/posts/{postId}/delete`
- `GET /admin/social/comments`
- `POST /admin/social/comments/{commentId}/hide`
- `POST /admin/social/comments/{commentId}/restore`
- `POST /admin/social/comments/{commentId}/delete`
- `GET /admin/social-relations`
- `GET /admin/social/reports`
- `POST /admin/social/reports/{reportId}/resolve`
- `POST /admin/social/reports/{reportId}/sanction`

### 9.7 内容安全

- `GET /admin/moderation/tasks`
- `POST /admin/moderation/tasks/batch`
- `POST /admin/moderation/tasks/{taskId}/assign`
- `POST /admin/moderation/tasks/{taskId}/{action}`
- `GET /admin/moderation/samples`
- `POST /admin/moderation/samples/{sampleId}/label`

### 9.8 地点

- `GET /admin/places`
- `GET /admin/places/{placeId}`
- `PATCH /admin/places/{placeId}`
- `POST /admin/places/{placeId}/merge`
- `GET /admin/places/moderation-templates`
- `POST /admin/places/moderation-templates`
- `PATCH /admin/places/moderation-templates/{templateId}`
- `POST /admin/places/moderation-templates/{templateId}/delete`
- `GET /admin/places/reviews`
- `POST /admin/places/reviews/{reviewId}/approve`
- `POST /admin/places/reviews/{reviewId}/reject`
- `GET /places/{placeId}/reviews`
- `POST /places/reviews/{reviewId}/report`
- `GET /admin/places/submissions`
- `GET /admin/places/contributions`
- `POST /admin/places/submissions/{submissionId}/approve`
- `POST /admin/places/submissions/{submissionId}/reject`
- `POST /admin/places/submissions/{submissionId}/link-existing`

### 9.9 工单

- `GET /admin/tickets`
- `GET /admin/tickets/{ticketId}`
- `POST /admin/tickets/batch`
- `POST /admin/tickets/{ticketId}/assign`
- `POST /admin/tickets/{ticketId}/notes`
- `POST /admin/tickets/{ticketId}/reply`
- `POST /admin/tickets/{ticketId}/status`
- `PATCH /admin/tickets/{ticketId}`
- `GET /admin/tickets/reply-templates`
- `POST /admin/tickets/reply-templates`
- `POST /admin/tickets/reply-templates/{templateId}/delete`

### 9.10 处罚与申诉

- `GET /admin/sanctions`
- `GET /admin/sanction-templates`
- `GET /admin/users/{phone}/sanctions`
- `POST /admin/users/{phone}/sanctions`
- `POST /admin/users/{phone}/sanctions/{sanctionId}/revoke`
- `GET /admin/sanction-appeals`
- `POST /admin/sanction-appeals/{appealId}/review`
- `POST /admin/sanction-appeals/{appealId}/approve`
- `POST /admin/sanction-appeals/{appealId}/reject`

### 9.11 通知、配置、导出、审计

- `GET /admin/notifications`
- `POST /admin/notifications/system`
- `POST /admin/notifications/{id}/cancel`
- `GET /admin/push-devices`
- `GET /admin/config`
- `PATCH /admin/config`
- `GET /admin/config/approvals`
- `POST /admin/config/approvals`
- `POST /admin/config/approvals/{approvalId}/approve`
- `POST /admin/config/approvals/{approvalId}/cancel`
- `POST /admin/config/revisions/{revisionId}/rollback`
- `GET /admin/exports`
- `GET /admin/exports/history`
- `GET /admin/exports/approvals`
- `POST /admin/exports/approvals`
- `POST /admin/exports/approvals/{approvalId}/approve`
- `POST /admin/exports/approvals/{approvalId}/cancel`
- `GET /admin/exports/{type}.csv`
- `GET /admin/audit-logs`

## 10. 数据模型建议

### 10.1 后台账号

```ts
type AdminAccount = {
  id: string;
  username: string;
  displayName: string;
  roleIds: string[];
  status: 'active' | 'disabled' | 'locked';
  mfaEnabled: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 10.2 用户运营元数据

```ts
type UserOpsMeta = {
  phone: string;
  manualTags: string[];
  systemTags: string[];
  notes: UserOpsNote[];
  latestRiskScore?: number;
  updatedAt: string;
};

type UserOpsNote = {
  id: string;
  content: string;
  relatedType?: string;
  relatedId?: string;
  createdBy: string;
  createdAt: string;
  voidedAt?: string;
  voidedBy?: string;
};
```

### 10.3 审计日志

```ts
type AdminAuditLog = {
  id: string;
  adminId: string;
  adminName: string;
  roleIds: string[];
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip?: string;
  userAgent?: string;
  chainVersion?: number;
  prevHash?: string;
  hash?: string;
  createdAt: string;
};
```

### 10.4 审核任务

```ts
type ModerationTask = {
  id: string;
  source: 'report' | 'pet_circle_post' | 'pet_circle_comment' | 'place_review' | 'place_submission' | 'image' | 'avatar' | 'message';
  targetId: string;
  ownerPhone?: string;
  reporterPhone?: string;
  contentText?: string;
  mediaIds?: string[];
  status: string;
  riskScore: number;
  riskTags: string[];
  assignee?: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 10.5 处罚记录

```ts
type Sanction = {
  id: string;
  phone: string;
  type: 'warning' | 'mute' | 'freeze' | 'ban';
  reason: string;
  source?: string;
  reportId?: string;
  evidenceSnapshotId?: string;
  startsAt: string;
  endsAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
  createdBy: string;
  createdAt: string;
};
```

## 11. 分期路线

### Phase 0：当前测试期后台稳定

目标：支撑真机测试和小规模内测。

应完成：

- 保持当前后台可访问。
- 保证 AI 任务、用户、工单、举报、配置、审计可用。
- 完善用户备注和风险标签文档与验证。
- 补关键缺口文档。
- 保持部署和 git 同步。

### Phase 1：上线前最小运营闭环

目标：支撑真实用户小规模上线。

必须完成：

- 多管理员账号底座已接入；上线前继续补生产化账号治理。
- 角色权限运行时拦截。
- 内容安全文本/图片模型接入。
- 宠友圈图片审核。
- 头像/宠物图审核。
- 举报聚合和证据快照。
- 地点审核模板已支持自定义维护；地点编辑、合并、图片审核和基础贡献账本已基础落地，生产期补贡献者公开展示、激励策略和多角色权限。
- 工单 SLA 配置、负责人枚举、客服排班、首响/解决 SLA 拆分、基础质量统计、排班冲突检测、KPI 目标、质检待看、批量处理复盘、批量回复审批、周/月服务复盘和外包结算预览已基础落地；生产期补客服质检制度、周/月锁账、外包真实付款审批/导出/税费和批量回复双人审批/撤回策略。
- 真实厂商 Push 基础通道。
- 数据导出已接审批流、高风险最少会签人数、默认敏感字段脱敏、完整敏感字段独立授权、服务器本地归档任务和短时效签名下载链接；生产期补对象存储归档和文件生命周期策略。

### Phase 2：生产运营能力

目标：支撑稳定运营和风险控制。

应完成：

- 双人审批。
- 配置草稿、预约发布和单 admin 审批已落地；生产期补双人审批、灰度和 A/B 分流。
- 审核员绩效和误杀/漏杀复盘。
- 地点合并、详情编辑与质量运营深化。
- 用户风险评分。
- 聊天举报和骚扰治理。
- 数据埋点和留存分析。
- 对象存储归档和更细文件生命周期策略。

### Phase 3：规模化运营

目标：支撑增长、活动、数据分析和商业化。

可规划：

- 用户分群。
- 活动运营。
- A/B 实验。
- 自动化触达。
- 商家/地点运营后台。
- 数据仓库和 BI。
- 模型样本标注平台。

## 12. 上线前必须确认的问题

1. 后台正式域名使用 `ops.lumiiapp.cn`、`admin.lumiiapp.cn`，还是先沿用 `/admin`？
2. 生产后台是否必须白名单 IP？
3. 后台账号是否接企业微信/飞书/邮箱 MFA？
4. 内容安全供应商选哪家，文本和图片是否同一供应商？
5. 图片审核失败时，宠友圈发布是阻断、送审，还是先隐藏等待审核？
6. 私信查看策略已落地：不开放任意全文检索，仅在举报/关系排查中查看最近上下文窗口；窗口、原因必填和保留标记由 `social.messageAccess` 配置，单 admin 阶段为带审计自审批，生产多管理员后可升级双人审批。
7. 用户业务数据清理已接入单 admin 审批；生产期是否只保留测试环境、隐藏入口或升级双人审批？
8. AI 失败额度返还规则已接入：默认供应商提交失败、供应商超时和供应商返回失败自动返还；照片不合格、内容安全拦截和运营手动标失败不自动返还，后台人工返还会防重复。
9. 永久封禁是否必须双人审批？
10. 导出完整手机号已允许但默认关闭：必须具备 `data.export.sensitive` 权限并提交完整敏感字段审批；生产期需确认最终审批角色和值守 SOP。
11. 地点贡献分已支持用户本人公开徽章、轻量等级、后台手动调整和撤销；是否接排行榜、活动奖励或兑换规则？
12. 系统通知是否需要发送审批？频控、通知人群包、对象深链、发送审批和高风险最少会签人数已按通知运营链路接入。
13. 配置强制更新是否必须审批？
14. App 备案、隐私政策、内容审核制度是否已准备生产版文本？

## 13. 总体验收标准

后台达到“可上线运营”的最低验收：

- 运营能通过手机号完整排查一个用户的账号、宠物、AI、社交、地点、工单、处罚和通知。
- 用户举报能在后台处理，并通知举报人和被举报作者。
- 内容被隐藏或删除后，移动端不再展示。
- AI 任务失败或卡住能在后台定位、重试、标记失败、按规则自动返还或人工返还额度。
- 地点点评和新增地点能审核，并通知提交人；审核通过的地点点评会按后台配置在 App 地点详情公开展示。
- 工单能回复用户，用户能在 App 查看、补充、评分、重开。
- 配置改动能版本化、可回滚、可审计，并真实影响移动端。
- 处罚能真实限制移动端写接口，申诉能撤销处罚。
- 所有后台写操作有审计。
- 敏感数据默认脱敏。
- 高风险操作二次确认。
- 数据导出有审计。
- 工作台能看到待处理和异常。

## 14. 研发实现原则

- 继续沿用现有后台视觉风格：浅暖背景、白卡、细边框、克制橙色、低饱和状态色。
- 优先补闭环，不优先做复杂视觉。
- 列表、详情、操作、审计一起做，不只做单点按钮。
- 移动端受后台配置影响的能力，必须同时验证前端入口和后端强制。
- 所有新增接口都要考虑冻结、封禁、维护模式和功能开关。
- 所有用户可见结果都要考虑通知闭环。
- 生产级能力不得继续依赖单文件 JSON state。

## 15. 下一步建议

如果当前只做文档，不进入开发，建议后续开发顺序：

1. 后台账号与权限。
2. 内容安全模型接入和图片审核。
3. 证据快照长期归档、处罚策略复盘和举报申诉处理质检。
4. 工单客服质检制度、周/月 KPI 锁账、外包真实付款审批/导出/税费、批量回复双人审批和撤回策略。
5. 地点合并与地点编辑。
6. 生产级事件表、留存 Cohort 和漏斗分析。
7. 配置发布双人审批、灰度发布与 A/B 实验分流。
