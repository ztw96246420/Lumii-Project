# Lumii 运营后台需求文档

版本：2026-06-29

适用项目：灵伴 Lumii App

文档目标：基于当前已开发的前端页面、API 合约和 `scripts/lumii-backend.cjs` 测试后端，定义一套可落地、可分期开发的运营后台需求。

## 1. 背景

Lumii 当前已经具备较完整的 C 端 MVP 能力：

- 手机号验证码登录、会话保持、权限与隐私设置。
- 宠物建档、宠物生日/体重/疫苗/备忘等宠物日历能力。
- 宠物照片上传、AI 灵伴形象生成、生成结果接受和反馈。
- 宠物 AI 对话、医疗风险提示、对话中自动写入备忘/体重/疫苗动作。
- 发现页、附近宠友、宠友圈小事、点赞、评论、举报、拉黑、我的小事。
- 招呼、接受/拒绝招呼、约遛邀请、双方会话、消息通知。
- 宠物友好地图、高德 POI 搜索、收藏、地点点评、用户提交地点。
- 通知中心、推送 token 登记、用户反馈。

但目前这些能力大部分只面向 App 用户，运营侧仍缺少统一后台来处理：

- 用户问题排查。
- 内容审核与举报闭环。
- 地点和点评审核。
- AI 生成失败、卡住、额度异常、成本监控。
- 宠友圈、聊天、约遛等社交安全。
- 用户反馈和客服工单。
- 运营数据看板、配置、审计和风控。

当前后端仍是单文件测试后端，核心状态保存在 JSON state 文件中。运营后台需求必须同时照顾两个阶段：

1. MVP 运营后台：在现有测试后端基础上快速补齐只读查询、简单审核和问题排查。
2. 生产运营后台：迁移到正式数据库、权限体系、操作审计、内容安全服务和客服工单后，支撑真实上线。

## 2. 现状依据

本需求文档参考了以下当前工程内容：

- 产品 PRD：`docs/PRD_v0.md`
- API 合约：`docs/API_Contract_MVP_v0.md`
- 宠友圈设计与接口说明：`docs/Pet_Friend_Circle_Feature_Spec_2026-06-19.md`
- 移动端类型定义：`mobile/src/mvp/types.ts`
- 测试后端实现：`scripts/lumii-backend.cjs`

当前后端核心 state 对象包含：

- `users`
- `sms`
- `revokedAuthTokens`
- `mediaUploads`
- `avatarJobs`
- `petAvatarDailyUsage`
- `petChatMessages`
- `petChatDailyUsage`
- `aiUsage`
- `health.weights`
- `health.vaccines`
- `health.vaccineReminders`
- `health.memos`
- `socialMoments`
- `socialLikes`
- `socialComments`
- `socialReports`
- `socialBlocks`
- `greetings`
- `invites`
- `conversations`
- `conversationMessages`
- `notifications`
- `pushDevices`
- `places`
- `placeReviews`
- `placeSubmissions`
- `feedback`

当前主要业务状态枚举：

| 对象 | 当前状态 | 说明 |
| --- | --- | --- |
| AI 形象任务 | `processing` / `ready` / `failed` | `gpt-image-2`、mock、历史 TTAPI 路径均兼容 |
| 上传宠物照片质量 | `good` / `warning` / `blocked` | 基础图片质量和宠物主体判断 |
| AI 形象反馈 | `received` / `reviewed` | 用户对结果“不像”等反馈 |
| 疫苗/驱虫计划 | `due` / `done` / `overdue` | 前端显示上 `due` 和 `overdue` 应统一为“计划中” |
| 宠友圈动态 | `published` / `deleted` | 文档里有 `hidden` 草案，当前代码主要使用 `published/deleted` |
| 宠友圈评论 | `published` / `deleted` | 动态作者可删除动态下评论 |
| 宠友圈举报 | `pending` | 当前只有举报收集和对举报者隐藏，还没有后台处理流 |
| 拉黑关系 | active record | 当前用 `socialBlocks` 存在即代表拉黑 |
| 招呼 | `pending` / `accepted` / `rejected` / `blocked` | 拉黑会让待处理招呼进入 `blocked` |
| 约遛邀请 | `pending` / `accepted` | 接收方回复可默认接受并开启会话 |
| 地点点评 | `pending_review` / `approved` / `rejected` | 当前提交后为待审核 |
| 新增地点 | `pending_review` / `approved` / `rejected` | 当前提交后为待审核 |
| 用户反馈 | `received` / `reviewing` / `closed` | 当前提交后为 received |
| 通知 | `read=true/false` | `kind` 区分落页 |
| 权限状态 | `unknown` / `denied` / `blocked` / `unavailable` / `granted` | 服务端只持久化这 5 类 |

## 3. 后台建设目标

### 3.1 业务目标

运营后台要解决四类核心问题：

1. 看得见：能看到用户、宠物、内容、AI 任务、地点、反馈、通知、用量和风险。
2. 管得住：能审核、隐藏、删除、恢复、封禁、解封、处理举报、处理地点提交。
3. 查得清：能快速定位某个手机号、宠物、动态、评论、会话、AI 任务、通知的问题。
4. 可追责：所有运营动作都有权限控制、二次确认、操作审计和可回滚策略。

### 3.2 产品目标

- 降低测试阶段问题定位成本。
- 支撑真实用户上线后的内容安全和社区运营。
- 支撑 AI 功能的稳定性、成本、失败率监控。
- 支撑客服处理用户反馈、投诉和账号问题。
- 为后续增长、活动、配置、数据分析预留后台基础。

### 3.3 非目标

第一版后台不做以下能力：

- 不直接替代正式数据仓库和 BI 系统。
- 不在后台读取用户明文验证码、鉴权 token 或第三方密钥。
- 不允许运营人员直接修改 AI 供应商密钥、服务器环境变量。
- 不允许普通运营导出完整手机号、精确位置、原始照片等敏感数据。
- 不做复杂 CRM 营销自动化，第一版只做必要运营触达和系统通知。

## 4. 用户与权限模型

### 4.1 后台角色

| 角色 | 定位 | 典型权限 |
| --- | --- | --- |
| 超级管理员 `super_admin` | 系统最高权限，仅创始团队少数人使用 | 所有模块、角色管理、危险操作审批 |
| 运营管理员 `ops_admin` | 日常运营负责人 | 用户、内容、地点、反馈、配置、数据看板 |
| 内容审核员 `content_moderator` | 处理宠友圈、评论、图片、举报 | 审核、隐藏、删除、警告、升级 |
| 社区安全员 `safety_admin` | 处理拉黑、骚扰、违规用户、封禁 | 用户限制、社交关系排查、举报复核 |
| 地点运营 `place_ops` | 处理 POI、点评、新增地点 | 审核地点、合并地点、编辑标签 |
| 客服 `support` | 处理用户反馈、问题排查 | 用户只读、工单、通知补发、非危险修复 |
| AI 运营 `ai_ops` | 处理 AI 形象和 AI 对话质量 | AI 任务、失败重试、成本与用量、反馈样本 |
| 数据分析 `data_analyst` | 看运营数据，不处理用户 | 数据看板、导出脱敏统计 |
| 审计员 `auditor` | 查看操作记录 | 只读审计日志和关键对象历史 |

### 4.2 权限原则

- 最小权限：每个角色只拿完成职责所需权限。
- 敏感信息默认脱敏：手机号默认显示 `135****0966`，需要权限才能查看完整手机号。
- 危险操作二次确认：封禁、批量删除、导出、覆盖用户数据必须二次确认。
- 高危操作双人审批：永久封禁、批量封禁、批量内容删除、手动清空用户数据需要审批。
- 操作必留痕：所有写操作必须写入 `adminAuditLogs`。
- 后台和 C 端账号分离：后台账号不能用普通手机号登录体系直接复用。

### 4.3 权限点清单

| 权限点 | 描述 |
| --- | --- |
| `admin.view_dashboard` | 查看运营总览 |
| `admin.manage_roles` | 管理后台账号和角色 |
| `user.view` | 查看用户列表和详情 |
| `user.view_pii` | 查看完整手机号、设备、IP 等敏感信息 |
| `user.update_status` | 冻结、解冻、限制用户 |
| `user.clear_data` | 清除用户业务数据 |
| `pet.view` | 查看宠物档案 |
| `pet.edit` | 修正明显错误的宠物资料 |
| `media.view` | 查看上传图片和 AI 结果图 |
| `media.hide` | 隐藏违规图片 |
| `ai.view` | 查看 AI 任务和用量 |
| `ai.retry` | 人工重试失败任务 |
| `ai.refund_quota` | 返还用户生成额度 |
| `ai.review_feedback` | 处理 AI 形象反馈 |
| `calendar.view` | 查看宠物日历记录 |
| `calendar.edit` | 修复异常日历记录 |
| `social.view` | 查看宠友圈动态、评论、互动 |
| `social.moderate` | 隐藏、恢复、删除社交内容 |
| `social.handle_report` | 处理举报 |
| `social.sanction` | 用户警告、禁言、封禁 |
| `message.view_meta` | 查看会话元数据 |
| `message.view_content` | 查看消息正文，需高权限和原因记录 |
| `place.view` | 查看地点和 POI |
| `place.moderate` | 审核点评和新增地点 |
| `place.edit` | 编辑地点资料、标签、宠物友好状态 |
| `feedback.view` | 查看用户反馈 |
| `feedback.handle` | 分配、回复、关闭反馈 |
| `notification.view` | 查看通知投递记录 |
| `notification.resend` | 补发系统通知 |
| `config.view` | 查看运营配置 |
| `config.edit` | 修改运营配置 |
| `data.export` | 导出脱敏数据 |
| `audit.view` | 查看审计日志 |

## 5. 后台信息架构

### 5.1 一级导航

1. 工作台
2. 用户管理
3. 宠物与档案
4. AI 灵伴
5. 宠物日历
6. 宠友圈
7. 消息与社交关系
8. 地图地点
9. 内容安全
10. 反馈工单
11. 通知与推送
12. 数据看板
13. 系统配置
14. 审计日志

### 5.2 工作台

工作台是运营每天打开后台的第一屏，必须展示“今天需要处理什么”和“系统有没有异常”。

核心卡片：

- 今日新增用户。
- 今日新增宠物。
- 今日 AI 形象生成任务数、成功率、失败数、处理中超时数。
- 今日 AI 对话请求数、医疗风险拦截数。
- 待审核宠友圈动态/评论。
- 待处理举报。
- 待审核地点点评。
- 待审核新增地点。
- 待处理反馈工单。
- 今日封禁/禁言用户。
- 推送登记设备数、推送失败数。
- CDN/媒体访问异常提示。

工作台快捷入口：

- 搜手机号。
- 搜宠物名。
- 搜动态 ID / 评论 ID。
- 搜 AI 任务 ID。
- 搜地点名 / POI ID。
- 搜反馈 ID。

异常提醒：

- AI 形象任务卡住超过阈值。
- 同一用户短时间多次生成失败。
- 某类接口错误率上升。
- 举报积压超过 SLA。
- 地点审核积压超过 SLA。
- 用户反馈积压超过 SLA。

## 6. 模块需求

### 6.1 后台登录与安全

#### 功能

- 后台账号密码登录。
- 支持 MFA，建议第一版使用邮箱/Authenticator App，后续可接企业微信。
- 支持登录设备管理。
- 支持 IP 白名单，至少超级管理员可配置。
- 支持强制下线后台账号。
- 支持密码重置和密码强度策略。

#### 登录风控

- 连续 5 次密码错误锁定 15 分钟。
- 异地登录提醒。
- 新设备登录提醒。
- 超过 30 分钟无操作自动锁屏。
- 超过 12 小时强制重新登录。

#### 审计

记录字段：

- adminId
- adminName
- role
- action
- targetType
- targetId
- before
- after
- reason
- ip
- userAgent
- createdAt

### 6.2 用户管理

#### 用户列表

筛选条件：

- 手机号，支持完整手机号和后四位。
- 用户昵称。
- 注册时间区间。
- 最近活跃时间区间。
- 是否有宠物。
- 默认宠物物种：狗/猫/其他。
- 附近可见：开启/关闭。
- 推送通知：开启/关闭。
- 账号状态：正常/禁言/冻结/封禁/注销中/已注销。
- AI 形象生成次数区间。
- 被举报次数区间。
- 拉黑别人次数、被拉黑次数。

列表字段：

- 用户 ID。
- 脱敏手机号。
- 昵称。
- 头像。
- 宠物数。
- 默认宠物。
- 注册时间。
- 最近活跃时间。
- 附近可见状态。
- 推送状态。
- 账号状态。
- 风险标签。
- 最近一次反馈/举报摘要。

#### 用户详情

基础信息：

- 手机号，默认脱敏。
- 昵称、头像、简介。
- 注册时间、最近登录时间、最近活跃时间。
- 登录设备和安装 ID。
- 权限状态：定位、相册、通知。
- 用户设置：模糊位置、互动消息、附近可见、推送通知。
- 当前默认宠物。
- 所有宠物档案。

行为信息：

- 登录记录。
- 短信发送和验证记录，不能展示验证码明文。
- AI 形象任务记录。
- AI 对话用量。
- 宠友圈动态、评论、点赞。
- 招呼、约遛、会话关系。
- 地点收藏、点评、提交地点。
- 反馈工单。
- 通知记录。

运营动作：

- 添加运营备注。
- 标记风险用户。
- 禁言用户，限制评论/聊天/发布小事。
- 冻结账号，禁止登录和互动。
- 解除禁言/冻结。
- 清除用户业务数据，测试阶段需要保留该能力，但必须只给超级管理员。
- 返还 AI 形象生成额度。
- 补发通知或客服消息。

#### 风险标签

系统自动标签：

- 高频短信请求。
- 高频 AI 生成失败。
- 高频举报他人。
- 多次被举报。
- 发布内容命中联系方式拦截。
- 短时间大量评论。
- 多次地点重复提交。
- 多设备异常登录。

运营手工标签：

- 重点用户。
- 测试账号。
- 误伤待观察。
- 违规观察。
- 投诉处理中。
- 需要回访。

### 6.3 宠物与档案

#### 宠物列表

筛选条件：

- 宠物名。
- 主人手机号。
- 物种。
- 品种。
- 性别。
- 生日完整度：未知/仅年份/年月/完整日期。
- 是否有普通头像。
- 是否有 AI 灵伴形象。
- 是否有宠友圈封面。
- 建档时间。

列表字段：

- 宠物 ID。
- 宠物头像。
- 宠物名。
- 物种/品种。
- 主人手机号。
- 创建时间。
- 最近日历记录时间。
- AI 形象状态。
- 宠友圈动态数。

#### 宠物详情

基础信息：

- 宠物名、物种、品种、性别、生日、体重。
- 普通头像。
- AI 灵伴形象 URL。
- 宠友圈封面图。
- 性格标签。
- 创建时间、更新时间。

关联信息：

- 主人账号。
- 宠物日历记录。
- AI 形象任务。
- AI 对话消息。
- 宠友圈动态。
- 地点点评和约遛记录。

运营动作：

- 修正宠物资料明显错误。
- 隐藏违规头像。
- 清除异常 AI 形象图。
- 更换或清空宠友圈封面。
- 合并重复宠物档案，生产阶段谨慎开放。

### 6.4 AI 灵伴

AI 灵伴后台分为“生成任务”、“媒体素材”、“生成反馈”、“用量成本”和“供应商监控”。

当前实现状态：

- 第一阶段已落地“生成任务”、“媒体素材”、“生成反馈”的运营列表、筛选、处理和 CSV 导出。
- 第一阶段已落地“用量成本”和“供应商监控”的只读运营看板、provider 对比图、Top 错误码和 CSV 导出。
- 生成反馈已支持标记 `reviewed`、处理备注、处理人和处理时间，并写入后台审计。
- 媒体素材列表只展示预览、质量分析和关联任务，不导出 base64 原图或图片二进制。
- “用量成本”和“供应商监控”当前基于业务任务状态与 `aiUsage` 累计字段；逐次调用成本、provider 原始 request / response、完整 SLA 时间点仍需后续补齐。

#### 6.4.1 生成任务列表

筛选条件：

- 任务 ID。
- 手机号。
- 宠物 ID。
- 媒体 ID。
- provider：`gpt-image-2` / mock / 历史 TTAPI。
- 状态：processing / ready / failed。
- 创建时间。
- 更新时间。
- 进度区间。
- 是否已接受。
- 错误码。
- 是否卡住。
- 是否有用户反馈。

列表字段：

- 任务 ID。
- 用户手机号。
- 宠物名。
- provider。
- 状态。
- 进度。
- 原图预览。
- 结果图预览。
- 错误信息。
- 创建时间。
- 更新时间。
- 是否接受。
- 成本估算。

卡住判定：

- `processing` 且 `updatedAt` 超过预估完成时间。
- `progress` 长时间停留在同一值。
- provider 任务存在但状态刷新连续失败。
- 前端 latest job 显示处理中但后端 provider 无对应任务。

#### 6.4.2 任务详情

展示：

- 任务基础信息。
- 原始上传媒体。
- 生成提示词版本。
- provider 请求参数：model、size、resolution。
- provider 状态和外部 task id。
- 结果 URL、候选图 URL。
- 用户接受时间。
- 用户反馈。
- 错误码、错误信息、刷新失败记录。
- 额度扣减记录。

运营动作：

- 刷新 provider 状态。
- 手动标记失败。
- 手动重试。
- 返还生成额度。
- 将结果图应用到宠物头像，需高权限。
- 将任务加入样本集，用于后续提示词评估。
- 标记为供应商异常样本。

#### 6.4.3 媒体素材

筛选条件：

- 媒体 ID。
- ownerPhone。
- 质量：good/warning/blocked。
- 分析 code：no_pet、multiple_pets、human_and_pet、low_quality 等。
- 上传来源：camera/library/mvp_sample。
- 是否转存 COS。
- 是否被用于 AI 生成。

详情展示：

- 原图预览。
- COS objectKey。
- fileUrl。
- previewUrl。
- mimeType。
- fileName。
- analysis：title、message、qualityScore、tags、suggestions。
- 关联任务。

运营动作：

- 隐藏违规图片。
- 删除测试图片。
- 标记误判。
- 加入图片审核样本。

#### 6.4.4 生成反馈

当前用户可提交 AI 形象反馈：

- color
- expression
- face_shape
- not_same_pet
- style
- other

后台需要：

- 反馈列表。
- 反馈详情。
- 原图和结果图对比。
- 按原因聚合统计。
- 标记 `reviewed`。
- 备注处理结论。
- 是否需要返还额度。
- 是否纳入提示词优化样本。

#### 6.4.5 AI 用量和成本

当前后端已有：

- `daily.petAvatar`
- `daily.petChat`
- `deepseek` token 统计。
- `gptImage2` requests/succeeded/failed/cost/creditsCost。
- 历史 `ttapiFlux`、`ttapiMidjourney` 统计。

后台看板应展示：

- 今日 AI 形象生成次数。
- 今日成功率。
- 今日失败率。
- 平均生成耗时。
- 卡住任务数。
- 每用户平均生成次数。
- Top 失败错误码。
- 今日成本估算。
- DeepSeek 请求数、tokens、平均回复长度。
- 医疗风险拦截数。
- AI 对话额度命中数。

### 6.5 AI 宠物对话

#### 列表

筛选条件：

- 用户手机号。
- 宠物 ID。
- 时间区间。
- 是否触发医疗风险。
- 是否创建备忘。
- 是否创建体重。
- 是否更新疫苗。
- 用户反馈：good/off。
- 请求失败。

列表字段：

- 消息 ID。
- 用户。
- 宠物。
- 用户输入摘要。
- AI 回复摘要。
- 创建时间。
- 是否医疗风险。
- 是否写入宠物日历。
- 用户反馈。

#### 详情

展示：

- 对话上下文。
- 当前宠物资料快照。
- AI 回复内容。
- 创建的备忘/体重/疫苗动作。
- 医疗风险命中原因。
- DeepSeek provider 数据。
- 用户反馈。

运营动作：

- 标记回复质量问题。
- 标记医疗安全样本。
- 标记误触发/漏触发。
- 隐藏不适合继续展示的 AI 消息，需保留审计。

隐私要求：

- 普通客服默认只能看摘要。
- 查看完整对话正文必须填写原因。
- 所有查看完整正文行为写入审计。

### 6.6 宠物日历

当前 App 已将“健康日历”口径改为“宠物日历”，但后端接口仍使用 `/health/*` 路径。后台文案应统一显示“宠物日历”，技术字段可保留 `health` 命名。

#### 日历记录列表

记录类型：

- 体重。
- 疫苗/驱虫。
- 备忘。
- 宠友圈同步备忘。
- AI 对话自动创建备忘。
- AI 对话自动创建体重。

筛选条件：

- 手机号。
- 宠物 ID。
- 类型。
- 日期区间。
- 来源：手动/宠友圈/AI 对话/系统。
- 是否开启提醒。
- 疫苗状态：计划中/已完成。

列表字段：

- 记录 ID。
- 用户。
- 宠物。
- 类型。
- 标题。
- 日期。
- 提醒时间。
- 来源。
- 更新时间。

#### 详情与动作

接口：

- `GET /admin/pet-calendar`
- `PATCH /admin/pet-calendar/{recordId}`

体重：

- 查看 kg、备注、记录日期。
- 支持修复明显错误值，需写原因和审计。
- 修正后同步宠物档案最新体重。

疫苗/驱虫：

- 查看名称、计划日期、状态、提醒开关。
- `due` 和 `overdue` 在后台业务口径可分开，但用户前端统一显示“计划中”。
- 支持修正名称、计划日期、状态和提醒开关；完成状态会关闭提醒。

备忘：

- 查看标题、内容、提醒时间、重复频率。
- 查看来源。
- 支持修正标题、内容、提醒时间、提醒开关和重复频率。
- 删除、恢复、批量处理和后台新增暂不开放，需要更细权限或审批。

所有修正动作必须：

- 原因必填。
- 写入 `calendar.record.update` 审计，记录 before/after、变更字段、手机号和宠物 ID。
- 给用户写入站内通知，移动端刷新后读取同一份 `/health/*` 数据。

### 6.7 宠友圈

宠友圈是运营后台的核心内容安全模块之一。

#### 6.7.1 动态列表

筛选条件：

- 动态 ID。
- 用户手机号。
- 宠物名。
- 物种：狗/猫。
- 状态：published/deleted/hidden。
- 可见性：nearby/private。
- 是否我发布的小事。
- 是否带图。
- 图片数量。
- 点赞数区间。
- 评论数区间。
- 被举报次数。
- 发布时间区间。
- 是否命中内容安全规则。
- 是否来自历史同步数据。

列表字段：

- 动态 ID。
- 宠物头像。
- 宠物名。
- 主人昵称和手机号。
- 文本摘要。
- 图片缩略图。
- 发布时间。
- 可见性。
- 状态。
- 点赞数。
- 评论数。
- 举报数。
- 最近处理状态。

#### 6.7.2 动态详情

展示：

- 完整正文。
- 全部图片。
- 发布宠物和主人资料。
- 发布位置只显示模糊范围，不展示精确坐标。
- 点赞列表。
- 评论列表。
- 举报列表。
- 是否被当前用户删除。
- 是否被运营隐藏。
- 是否同步到宠物日历备忘。

运营动作：

- 隐藏动态，对全体用户不可见，保留作者自己可见或展示“已被隐藏”。
- 删除动态，仅在严重违规或用户要求删除时使用。
- 恢复动态。
- 给作者发送警告。
- 禁言作者。
- 封禁作者。
- 将相关图片加入媒体审核。
- 将举报标记为有效/无效。
- 备注处理结论。

状态建议：

- `published`：正常展示。
- `hidden`：运营隐藏，不展示给其他用户。
- `deleted_by_user`：用户删除。
- `deleted_by_admin`：运营删除。
- `pending_review`：需要审核后展示，生产内容安全启用后使用。

当前代码只有 `published/deleted`，生产需要扩展状态，不能只复用 `deleted`。

#### 6.7.3 评论列表

筛选条件：

- 评论 ID。
- 动态 ID。
- 评论用户。
- 动态作者。
- 状态。
- 被举报次数。
- 发布时间。
- 内容关键词。

运营动作：

- 隐藏评论。
- 删除评论。
- 恢复评论。
- 警告评论用户。
- 禁言评论用户。
- 处理评论举报。

#### 6.7.4 点赞

点赞本身一般不需要审核，但后台需要查看：

- 某动态点赞列表。
- 某用户点赞历史。
- 点赞通知是否生成。
- 点赞是否异常刷量。

运营动作：

- 移除异常点赞。
- 标记刷量风险。

#### 6.7.5 我的宠友圈页面运营支持

当前 C 端已有“我发布的小事”页面需求。后台需要支持：

- 查看某用户个人宠友圈 profile。
- 查看封面图。
- 查看统计：动态数、照片数、点赞数、评论数。
- 查看“同一天多条”的时间线。
- 修改/清空违规封面图。
- 处理他人访问权限问题：只有双方同意招呼后可查看完整宠友圈。

### 6.8 举报与拉黑

#### 举报中心

当前已有：

- 动态举报。
- 评论举报。
- 被举报内容对举报者立即隐藏。
- 举报记录状态为 `pending`。

后台必须补齐：

- 举报队列。
- 举报聚合。
- 举报处理。
- 处罚策略。
- 通知策略。
- 复核和申诉。

举报列表筛选：

- 举报 ID。
- targetType：post/comment/user/message/place/review。
- targetId。
- 举报人。
- 被举报人。
- 举报原因。
- 状态：pending/reviewing/valid/invalid/escalated/closed。
- 创建时间。
- SLA 状态。
- 被举报人历史违规次数。

举报详情：

- 举报内容。
- 被举报对象快照。
- 举报人信息。
- 被举报人信息。
- 历史举报。
- 双方拉黑关系。
- 双方会话关系。
- 处理记录。

处理动作：

- 标记举报有效。
- 标记举报无效。
- 隐藏内容。
- 删除内容。
- 警告用户。
- 禁言用户。
- 冻结用户。
- 永久封禁，需高权限。
- 拉黑关系建议，不能替用户自动拉黑，除非安全策略明确。
- 升级人工复核。

#### 拉黑管理

当前已有：

- 创建拉黑。
- 查看拉黑列表。
- 解除拉黑。
- 拉黑后互相不可见，并阻断会话/招呼。

后台需求：

- 查看某用户主动拉黑列表。
- 查看某用户被拉黑情况。
- 查看双方关系状态：无关系、待招呼、已接受、已拉黑。
- 查看拉黑发生前后的举报、会话、评论。
- 仅超级管理员可人工解除异常拉黑，且需要原因。

### 6.9 消息、招呼与约遛

#### 招呼管理

筛选条件：

- 发起人。
- 接收人。
- 状态：pending/accepted/rejected/blocked。
- 来源：发现页/宠友圈/约遛自动接受。
- postId。
- 时间区间。

详情展示：

- 双方用户和宠物。
- 来源动态。
- 当前会话状态。
- 通知记录。
- 是否被拉黑。

运营动作：

- 修复异常状态。
- 关闭死循环状态，清理待处理招呼请求。
- 手动标记已接受或关闭，需填写原因并写审计。
- 标记风险招呼。

#### 约遛管理

筛选条件：

- 发起人。
- 接收人。
- 地点名。
- placeId。
- 计划时间。
- 状态。
- 是否已回复。

详情展示：

- 发起人和接收人。
- 地点、地址、坐标。
- 约遛备注。
- 生成的会话消息。
- 通知记录。

运营动作：

- 修复异常 pending 为已接受，补齐双方可发消息关系。
- 关闭异常 pending，避免接收方继续通过该邀请自动接受。
- 下架包含违规联系方式的约遛。
- 协助客服排查“不能回复”问题。

#### 会话管理

隐私级别要高于普通内容。

列表默认只展示：

- 会话双方。
- 最后一条消息摘要，默认脱敏。
- 更新时间。
- 未读数。
- 关系状态。
- 是否存在举报/拉黑。

查看完整消息正文需要：

- `message.view_content` 权限。
- 填写查看原因。
- 写审计。
- 仅从已有关系行或举报证据进入最近消息窗口，不提供任意全文检索。
- 对医疗/安全投诉、骚扰举报和客服争议场景优先开放。

运营动作：

- 标记骚扰会话。
- 隐藏违规消息，并同步影响双方移动端会话消息列表和会话摘要。
- 禁言用户。
- 保留证据快照。

### 6.10 地图地点

地图地点包含三类来源：

- seed：系统默认地点。
- amap：高德 POI 标准化地点。
- manual：用户提交地点或运营手动地点。

#### 地点列表

筛选条件：

- 地点名。
- 地址。
- 城市/区域，当前可先通过地址文本筛选。
- 类别：park/cafe/shop/clinic/other。
- 来源：seed/amap/manual/tencent。
- 宠物友好状态：candidate/verified/rejected/unknown。
- 评分区间。
- 点评数区间。
- 是否有图片。
- 是否被收藏。

列表字段：

- 地点 ID。
- 名称。
- 地址。
- 类别。
- 来源。
- sourcePoiId。
- 宠物友好状态。
- 支持物种。
- 评分。
- 点评数。
- 最近更新时间。

#### 地点详情

展示：

- 基础信息。
- 高德 POI 信息。
- 经纬度、入口经纬度。
- 图片。
- 营业时间。
- 标签。
- 支持物种。
- 收藏数。
- 点评列表。
- 新增地点提交来源。

运营动作：

- 编辑名称、地址、电话、标签、图片。
- 设置宠物友好状态。
- 合并重复地点。
- 关联或解除高德 POI。
- 下架地点。
- 恢复地点。

#### 地点点评审核

当前提交后 `pending_review`。

审核列表字段：

- 点评 ID。
- 地点。
- 用户。
- 内容。
- 状态。
- 创建时间。
- 命中规则。

操作：

- 通过。
- 驳回。
- 编辑后通过，需保留原文。
- 标记广告。
- 标记联系方式。
- 警告用户。

审核通过后：

- App 地点详情可展示点评。
- 点评计数生效。
- 通知用户审核通过。

审核拒绝后：

- App 不展示点评。
- 通知用户未通过和原因。

#### 新增地点审核

当前提交后 `pending_review`，并有重复检测。

审核字段：

- submissionId。
- 提交用户。
- 地点名称。
- 地址。
- 宠物友好体验。
- 创建时间。
- 可能重复地点。
- 可能重复提交。

操作：

- 通过并创建地点。
- 关联已有地点。
- 驳回。
- 要求用户补充信息。
- 运营编辑后通过。

### 6.11 通知与推送

当前通知类型：

- `conversation_message`
- `greeting_accepted`
- `greeting_request`
- `health_reminder`
- `medical_alert`
- `pet_circle_comment`
- `pet_circle_greeting`
- `pet_circle_like`
- `place_review`
- `place_submission`
- `system`
- `vaccine_done`
- `vaccine_reminder`
- `walk_invite`

#### 通知列表

筛选条件：

- 用户手机号。
- kind。
- category：health/interaction/walk/system。
- read。
- 时间区间。
- 关联对象 ID。

字段：

- 通知 ID。
- 用户。
- 标题。
- 内容。
- kind。
- category。
- read。
- createdAt。
- postId/commentId/conversationId/placeId/submissionId/memoId/vaccineId。

运营动作：

- 标记已读。
- 删除异常通知。
- 补发系统通知。
- 查看落页对象是否存在。

#### 推送设备

字段：

- 用户。
- platform：android/ios/web。
- token，默认脱敏。
- deviceId。
- updatedAt。

运营动作：

- 删除失效 token。
- 标记推送失败。
- 测试推送，需高权限。

### 6.12 反馈工单

当前 App 有 `/feedback`，分类：

- bug
- suggestion
- safety
- other

当前状态：

- received
- reviewing
- closed

后台应把 feedback 升级为工单。

#### 工单列表

筛选条件：

- 工单 ID。
- 用户手机号。
- 分类。
- 状态。
- 优先级。
- 负责人。
- 创建时间。
- 是否关联对象。
- 是否安全投诉。

列表字段：

- 工单 ID。
- 用户。
- 分类。
- 内容摘要。
- 状态。
- 优先级。
- 负责人。
- 创建时间。
- 最近更新时间。

#### 工单详情

展示：

- 用户反馈原文。
- 联系方式。
- 用户账号信息。
- 关联日志。
- 关联对象：动态、评论、AI 任务、地点、会话。
- 处理记录。
- 内部备注。

操作：

- 接单。
- 分配负责人。
- 改状态。
- 改优先级。
- 添加内部备注。
- 关联用户、动态、AI 任务、地点。
- 发送客服回复，第一版可以只记录回复，不实际触达。
- 关闭工单。
- 重新打开。

SLA 建议：

- safety：2 小时内首次处理。
- bug：24 小时内首次处理。
- suggestion/other：72 小时内首次处理。

### 6.13 内容安全

内容安全后台不是一个独立孤岛，而是要覆盖所有用户生成内容。

#### 审核对象范围

- 宠友圈动态文本。
- 宠友圈动态图片。
- 宠友圈评论。
- 聊天消息，默认只做机器审核，人工查看需高权限。
- 用户头像。
- 宠物头像。
- AI 灵伴结果图。
- 宠友圈封面图。
- 地点点评。
- 新增地点名称、地址、体验内容。
- 用户反馈中的安全投诉。

#### 内容风险类型

- 个人联系方式。
- 外部链接。
- 广告营销。
- 诈骗灰产。
- 色情低俗。
- 辱骂攻击。
- 骚扰约见。
- 涉政涉暴恐，生产必须接入合规审核服务。
- 宠物医疗高风险误导。
- 侵犯隐私，包含人脸、车牌、住址等。
- 版权或盗图风险。

#### 审核任务状态

建议统一 `moderationTasks` 状态：

- `pending`：待处理。
- `auto_approved`：机器通过。
- `auto_rejected`：机器拒绝。
- `manual_review`：需要人工。
- `approved`：人工通过。
- `rejected`：人工拒绝。
- `hidden`：已隐藏。
- `deleted`：已删除。
- `escalated`：升级复核。
- `appealed`：用户申诉。
- `closed`：处理完毕。

#### 审核动作

- 通过。
- 驳回。
- 隐藏。
- 删除。
- 恢复。
- 标记误判。
- 标记漏判。
- 发送用户提醒。
- 触发用户处罚。
- 升级复核。

#### 内容展示策略

第一版建议：

- 宠友圈动态和评论：先发后审，但命中高风险规则则阻断或进入待审核。
- 地点点评和新增地点：先审后发。
- 用户头像、宠物头像、封面图：先展示给自己，进入异步审核；违规后对外隐藏。
- AI 生成结果图：用户可自己看到，若作为公开头像或封面展示，应进入图片审核。
- 聊天消息：机器实时拦截联系方式、广告和违法违规词；人工仅在举报/投诉时查看。

### 6.14 系统配置

后台需要可配置但要有发布流程的项目：

- AI 形象每日额度。
- AI 对话每日额度。
- 宠友圈动态图片上限，当前产品为最多 6 张。
- 宠友圈动态文本上限。
- 评论文本上限。
- 聊天消息文本上限。
- 附近发现默认半径，当前默认 3km。
- 附近小事有效期，当前为 7 天。
- 短信发送冷却和每日上限。
- 审核关键词规则。
- 举报原因枚举。
- 反馈分类枚举。
- 宠物品种字典。
- 地点标签字典。
- 法务协议版本。

配置要求：

- 配置变更需要预览。
- 配置变更需要发布确认。
- 每次变更写审计。
- 关键配置支持回滚。
- 生产配置变更不应直接改服务器环境变量。

### 6.15 数据看板

#### 用户增长

- 新增用户。
- 活跃用户。
- 留存。
- 完成宠物建档率。
- 完成 AI 灵伴生成率。
- 开启附近可见率。
- 开启推送率。

#### AI

- AI 形象生成启动数。
- 生成成功数。
- 生成失败数。
- 平均耗时。
- 成本。
- 接受率。
- 反馈率。
- 重试率。
- AI 对话请求数。
- 医疗风险触发数。

#### 宠物日历

- 新增体重记录。
- 新增备忘。
- 新增疫苗/驱虫计划。
- 提醒开启率。
- AI 自动写入记录数。

#### 社交

- 附近发现曝光人数。
- 宠友圈动态数。
- 宠友圈图片数。
- 点赞数。
- 评论数。
- 招呼数。
- 招呼接受率。
- 约遛邀请数。
- 会话消息数。
- 拉黑数。
- 举报数。

#### 地图地点

- 地图打开次数。
- POI 搜索次数。
- 地点详情查看。
- 收藏数。
- 点评数。
- 新增地点提交数。
- 审核通过率。

#### 安全

- 审核任务数。
- 自动拦截数。
- 人工处理数。
- 举报有效率。
- 平均处理时长。
- 封禁数。
- 禁言数。
- 申诉数。

## 7. 数据模型建议

### 7.1 后台账号

```ts
type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleIds: string[];
  status: 'active' | 'disabled' | 'locked';
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 7.2 角色权限

```ts
type AdminRole = {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};
```

### 7.3 审计日志

```ts
type AdminAuditLog = {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};
```

### 7.4 审核任务

```ts
type ModerationTask = {
  id: string;
  targetType:
    | 'pet_circle_post'
    | 'pet_circle_comment'
    | 'chat_message'
    | 'owner_avatar'
    | 'pet_avatar'
    | 'ai_avatar'
    | 'pet_circle_cover'
    | 'place_review'
    | 'place_submission';
  targetId: string;
  ownerPhone: string;
  contentText?: string;
  mediaUrls?: string[];
  riskTypes: string[];
  riskScore?: number;
  source: 'auto_rule' | 'model' | 'report' | 'manual';
  status:
    | 'pending'
    | 'auto_approved'
    | 'auto_rejected'
    | 'manual_review'
    | 'approved'
    | 'rejected'
    | 'hidden'
    | 'deleted'
    | 'escalated'
    | 'appealed'
    | 'closed';
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  decisionReason?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 7.5 处罚记录

```ts
type UserSanction = {
  id: string;
  phone: string;
  type: 'warning' | 'mute' | 'freeze' | 'ban';
  reason: string;
  sourceType?: 'report' | 'moderation' | 'manual';
  sourceId?: string;
  startsAt: string;
  endsAt?: string;
  status: 'active' | 'expired' | 'revoked';
  createdBy: string;
  createdAt: string;
};
```

### 7.6 工单

```ts
type SupportTicket = {
  id: string;
  source: 'feedback' | 'report' | 'manual';
  sourceId?: string;
  phone?: string;
  category: 'bug' | 'suggestion' | 'safety' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'received' | 'reviewing' | 'waiting_user' | 'resolved' | 'closed';
  assigneeId?: string;
  title: string;
  content: string;
  relatedObjects: Array<{ type: string; id: string }>;
  createdAt: string;
  updatedAt: string;
};
```

### 7.7 运营配置

```ts
type OpsConfig = {
  key: string;
  value: unknown;
  description?: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  updatedBy: string;
  updatedAt: string;
};
```

## 8. Admin API 草案

后台接口建议统一放在 `/admin/*`，使用独立后台鉴权。

### 8.1 鉴权

- `POST /admin/auth/login`
- `POST /admin/auth/logout`
- `GET /admin/me`
- `POST /admin/auth/mfa/verify`

### 8.2 工作台

- `GET /admin/dashboard/summary`
- `GET /admin/dashboard/todos`
- `GET /admin/dashboard/alerts`

### 8.3 用户

- `GET /admin/users`
- `GET /admin/users/{phone}`
- `PATCH /admin/users/{phone}/status`
- `POST /admin/users/{phone}/notes`
- `GET /admin/users/{phone}/timeline`
- `POST /admin/users/{phone}/clear-business-data`
- `POST /admin/users/{phone}/ai-avatar/refund-quota`

### 8.4 宠物

- `GET /admin/pets`
- `GET /admin/pets/{petId}`
- `PATCH /admin/pets/{petId}`
- `POST /admin/pets/{petId}/hide-avatar`
- `POST /admin/pets/{petId}/clear-ai-avatar`

### 8.5 AI

- `GET /admin/ai/avatar-jobs`
- `GET /admin/ai/avatar-jobs/{jobId}`
- `POST /admin/ai/avatar-jobs/{jobId}/refresh`
- `POST /admin/ai/avatar-jobs/{jobId}/retry`
- `POST /admin/ai/avatar-jobs/{jobId}/mark-failed`
- `POST /admin/ai/avatar-jobs/{jobId}/refund-quota`
- `GET /admin/ai/avatar-feedback`
- `POST /admin/ai/avatar-feedback/{feedbackId}/review`
- `GET /admin/ai/media`
- `GET /admin/ai/usage`
- `GET /admin/ai/chat/messages`
- `GET /admin/ai/chat/messages/{messageId}`
- `POST /admin/ai/chat/messages/{messageId}/quality-label`

### 8.6 宠物日历

- `GET /admin/calendar/events`
- `GET /admin/calendar/events/{eventId}`
- `PATCH /admin/calendar/weights/{weightId}`
- `PATCH /admin/calendar/vaccines/{vaccineId}`
- `PATCH /admin/calendar/memos/{memoId}`

### 8.7 宠友圈

- `GET /admin/social/posts`
- `GET /admin/social/posts/{postId}`
- `POST /admin/social/posts/{postId}/hide`
- `POST /admin/social/posts/{postId}/restore`
- `POST /admin/social/posts/{postId}/delete`
- `GET /admin/social/comments`
- `POST /admin/social/comments/{commentId}/hide`
- `POST /admin/social/comments/{commentId}/restore`
- `POST /admin/social/comments/{commentId}/delete`
- `GET /admin/social/reports`
- `GET /admin/social/reports/{reportId}`
- `POST /admin/social/reports/{reportId}/resolve`
- `GET /admin/social/blocks`
- `DELETE /admin/social/blocks/{blockId}`

### 8.8 消息与关系

- `GET /admin/social-relations`
- `POST /admin/social-relations/{relationId}/repair`
- `POST /admin/social-relations/{relationId}/message-context`
- `POST /admin/social-relations/messages/{messageId}/hide`

### 8.9 地点

- `GET /admin/places`
- `GET /admin/places/{placeId}`
- `PATCH /admin/places/{placeId}`
- `POST /admin/places/{placeId}/merge`
- `POST /admin/places/{placeId}/hide`
- `GET /admin/places/reviews`
- `POST /admin/places/reviews/{reviewId}/approve`
- `POST /admin/places/reviews/{reviewId}/reject`
- `GET /admin/places/submissions`
- `POST /admin/places/submissions/{submissionId}/approve`
- `POST /admin/places/submissions/{submissionId}/reject`
- `POST /admin/places/submissions/{submissionId}/link-existing`

### 8.10 反馈工单

- `GET /admin/tickets`
- `GET /admin/tickets/{ticketId}`
- `POST /admin/tickets/batch`
- `GET /admin/tickets/reply-templates`
- `POST /admin/tickets/reply-templates`
- `POST /admin/tickets/reply-templates/{templateId}/delete`
- `POST /admin/tickets/{ticketId}/assign`
- `POST /admin/tickets/{ticketId}/reply`
- `POST /admin/tickets/{ticketId}/status`
- `POST /admin/tickets/{ticketId}/notes`
- `PATCH /admin/tickets/{ticketId}`

### 8.11 通知与推送

- `GET /admin/notifications`
- `GET /admin/push-devices`
- `DELETE /admin/push-devices/{deviceId}`
- `POST /admin/notifications/system`
- `POST /admin/notifications/{notificationId}/approve`

### 8.12 配置与审计

- `GET /admin/config`
- `PATCH /admin/config/{key}`
- `POST /admin/config/{key}/publish`
- `GET /admin/audit-logs`
- `GET /admin/exports`
- `POST /admin/exports`

## 9. 内容处理流程

### 9.1 宠友圈动态流程

```text
用户发布动态
  -> 基础规则检查
  -> 高风险：阻断或 pending_review
  -> 中低风险：先发布，同时创建审核任务
  -> 用户举报：创建 report + moderationTask
  -> 审核员处理
  -> 通过/隐藏/删除/处罚
  -> 通知作者或举报人
  -> 写审计日志
```

### 9.2 地点点评流程

```text
用户提交点评
  -> 基础规则检查
  -> status=pending_review
  -> 地点运营审核
  -> approved：公开展示，通知用户
  -> rejected：不展示，通知用户原因
  -> 写审计日志
```

### 9.3 新增地点流程

```text
用户提交地点
  -> 字段校验
  -> 重复检测
  -> status=pending_review
  -> 地点运营审核
  -> 通过：创建或关联 Place
  -> 驳回：记录原因
  -> 通知用户
  -> 写审计日志
```

### 9.4 AI 形象异常流程

```text
任务 processing 超时
  -> 工作台告警
  -> AI 运营查看 provider 状态
  -> 可手动刷新/重试/标记失败
  -> 必要时返还额度
  -> 如果结果质量差，加入反馈样本
  -> 写审计日志
```

### 9.5 用户安全投诉流程

```text
用户反馈或举报
  -> 创建工单
  -> 自动关联用户、动态、评论、会话、地点
  -> safety_admin 处理
  -> 必要时查看完整消息，必须填写原因
  -> 处理内容和用户处罚
  -> 工单关闭
  -> 写审计日志
```

## 10. 关键页面规格

### 10.1 用户详情页布局

顶部：

- 用户头像、昵称、脱敏手机号、账号状态。
- 快捷操作：备注、禁言、冻结、返还额度、创建工单。

主体 Tab：

- 概览。
- 宠物。
- AI 灵伴。
- 宠物日历。
- 宠友圈。
- 社交关系。
- 地图地点。
- 通知。
- 反馈工单。
- 审计。

右侧：

- 风险标签。
- 最近事件时间线。
- 内部备注。

### 10.2 宠友圈动态详情页布局

左侧：

- 动态正文。
- 图片九宫格，最多 6 张。
- 发布宠物和主人信息。
- 发布时间、距离口径、可见性。

右侧：

- 状态和风险标签。
- 点赞数、评论数、举报数。
- 审核动作区。
- 举报记录。
- 操作日志。

底部：

- 评论列表。
- 相关通知。
- 相关工单。

### 10.3 AI 任务详情页布局

左侧：

- 原图。
- 结果图。
- 候选图。

中间：

- 任务状态。
- provider 信息。
- 进度。
- 错误信息。
- 请求参数。
- 成本。

右侧：

- 用户和宠物。
- 额度记录。
- 反馈。
- 操作：刷新、重试、失败、返还额度。

### 10.4 地点审核详情页布局

左侧：

- 提交内容。
- 地点名、地址、体验描述。
- 图片和标签，后续支持。

中间：

- 可能重复地点。
- 高德搜索结果。
- 地图位置。

右侧：

- 审核动作。
- 通过后创建字段。
- 驳回原因模板。
- 操作记录。

## 11. 非功能需求

### 11.1 性能

- 列表页首屏 2 秒内返回。
- 支持分页和游标。
- 搜手机号、ID 类查询 1 秒内返回。
- 图片缩略图使用 CDN 或受控代理。
- 审计日志和大数据查询不能拖慢主业务。

### 11.2 安全

- 后台必须 HTTPS。
- 后台账号独立鉴权。
- MFA。
- IP 白名单。
- CSRF 防护。
- XSS 防护。
- 操作鉴权在后端校验，不能只靠前端隐藏按钮。
- 敏感字段脱敏。
- 导出审批。
- 高危操作二次确认。

### 11.3 隐私

- 精确位置不直接展示，默认只展示模糊位置。
- 聊天正文默认不可见。
- 手机号默认脱敏。
- 图片原图查看写审计。
- 用户删除/注销后，后台遵循数据保留和删除策略。

### 11.4 可观测性

- 后台 API 请求日志。
- 后台错误日志。
- 任务处理时长。
- 审核处理时长。
- AI provider 状态。
- 推送成功/失败。
- 异常告警。

### 11.5 可恢复

- 后台写操作要尽量软删除。
- 运营隐藏和删除分开。
- 关键操作支持恢复。
- 配置支持回滚。
- 审计日志不可被普通管理员删除。

## 12. 分期路线

### Phase 0：测试期只读后台

目标：先把问题查清楚。

范围：

- 后台登录，单管理员也可以。
- 用户搜索和详情。
- 宠物详情。
- AI 任务查询。
- 媒体上传查询。
- 宠友圈动态/评论只读。
- 地点点评/提交只读。
- 反馈列表。
- 通知列表。
- 基础工作台。

验收：

- 能通过手机号查到完整业务链路。
- 能查 AI 任务为什么卡住。
- 能查某条宠友圈评论/点赞/通知是否存在。
- 能查某个地点提交和审核状态。

### Phase 1：内容审核和举报闭环

目标：上线前必须具备社区安全底线。

范围：

- 宠友圈动态审核。
- 评论审核。
- 举报中心。
- 隐藏/恢复/删除内容。
- 用户警告/禁言/冻结。
- 审计日志。
- 地点点评和新增地点审核。
- 工单状态流。

验收：

- 任意举报能在后台看到并处理。
- 违规动态能被隐藏且 App 不再展示。
- 处理结果有审计。
- 地点点评和新增地点能通过/驳回。

### Phase 2：AI 运维和客服联动

目标：支撑 AI 成本、质量和用户问题处理。

范围：

- AI 任务刷新、重试、失败、返还额度。
- AI 反馈处理。
- AI 用量和成本看板。
- AI 对话安全样本。
- 工单关联 AI 任务/动态/地点。
- 通知补发。

验收：

- 卡住任务能定位和处理。
- 用户反馈“生成失败”可以在 5 分钟内查明状态。
- AI 成本和失败率可日常监控。

### Phase 3：生产级运营能力

目标：正式上线后稳定运营。

范围：

- 正式数据库后台。
- 角色权限完整化。
- MFA 和 IP 白名单。
- 数据导出审批。
- 配置中心。
- 数据看板。
- 内容安全模型接入。
- 申诉流程。
- 批量处理。

验收：

- 所有高危动作可审计。
- 审核 SLA 可统计。
- 内容安全可扩展到图片、文本和聊天。
- 运营配置可灰度和回滚。

## 13. 验收标准

### 13.1 通用验收

- 所有后台页面都有权限校验。
- 所有写操作写审计日志。
- 所有列表支持分页。
- 关键列表支持手机号、ID、时间区间搜索。
- 敏感字段默认脱敏。
- 高危操作需要填写原因。
- 错误提示清晰，不暴露服务器密钥和堆栈。

### 13.2 用户管理验收

- 能通过手机号查用户。
- 能看到用户的宠物、AI、宠友圈、地点、通知、反馈。
- 能禁言和解除禁言。
- 能冻结和解冻。
- 清除用户业务数据需要超级管理员权限。

### 13.3 宠友圈验收

- 能查看动态和评论。
- 能处理举报。
- 能隐藏动态，隐藏后 App 列表不展示。
- 能恢复隐藏动态。
- 能删除严重违规动态。
- 能禁言发布者。
- 能看到处理记录。

### 13.4 地点验收

- 能审核地点点评。
- 能审核新增地点。
- 通过后 App 可展示。
- 驳回后 App 不展示。
- 能查看重复地点提示。

### 13.5 AI 验收

- 能查询任务状态。
- 能看到原图和结果图。
- 能看到 provider、进度、错误信息。
- 能手动刷新状态。
- 能对失败或卡住任务重试。
- 能返还额度。
- 能查看 AI 用量和成本。

### 13.6 工单验收

- 用户反馈能进入工单列表。
- 工单可分配、备注、改状态、关闭。
- safety 类型有更高优先级。
- 工单可关联用户、动态、AI 任务、地点。

## 14. 上线前必须补齐的业务规则

以下不是后台 UI，而是后台上线前必须明确的业务规则：

1. 内容违规分级：轻微、中等、严重、违法。
2. 用户处罚梯度：提醒、警告、短期禁言、长期禁言、冻结、封禁。
3. 举报处理 SLA。
4. 地点审核标准。
5. 点评通过/驳回标准。
6. AI 生成失败是否返还额度的规则。
7. 用户要求删除数据时后台如何执行。
8. 用户投诉聊天骚扰时谁可以查看消息正文。
9. 未成年人保护和宠物医疗免责声明。
10. 运营人员误操作恢复流程。

## 15. 当前代码需要为后台预留的改造点

### 15.1 数据层

当前 JSON state 适合测试，不适合生产运营后台。需要迁移到数据库后拆表：

- users
- pets
- media_uploads
- avatar_jobs
- ai_usage_daily
- pet_chat_messages
- calendar_weights
- calendar_vaccines
- calendar_memos
- social_posts
- social_comments
- social_likes
- social_reports
- social_blocks
- greetings
- walk_invites
- conversations
- conversation_messages
- notifications
- push_devices
- places
- place_reviews
- place_submissions
- feedback
- admin_users
- admin_roles
- admin_audit_logs
- moderation_tasks
- support_tickets
- user_sanctions
- ops_configs

### 15.2 状态扩展

当前多个对象状态不够运营化：

- 宠友圈动态需要从 `published/deleted` 扩展出 `hidden`、`pending_review`、`deleted_by_user`、`deleted_by_admin`。
- 评论需要 `hidden`。
- 举报需要 `reviewing/valid/invalid/escalated/closed`。
- 用户需要账号状态和处罚记录。
- AI 任务需要保存 provider 原始任务 ID、最后刷新错误、耗时、成本。
- 地点点评和提交需要审核人、审核时间、审核原因。
- feedback 需要工单化。

### 15.3 审计

当前测试后端没有审计日志。后台写操作必须统一经过：

```text
checkPermission()
validateInput()
loadBeforeSnapshot()
applyChange()
writeAuditLog()
returnResult()
```

### 15.4 管理 API

不要让后台直接复用 C 端接口做高权限操作。应新增 `/admin/*`：

- 独立鉴权。
- 独立权限。
- 独立审计。
- 独立限流。

### 15.5 内容安全服务

当前只有正则级基础拦截，生产需要：

- 文本审核服务。
- 图片审核服务。
- 举报聚合。
- 人工审核队列。
- 违规样本沉淀。

## 16. 待确认问题

1. 后台第一版是否允许公网访问，还是只允许公司/开发者 IP 白名单访问？
2. 是否需要企业微信/飞书登录后台？
3. 内容审核服务优先接腾讯云内容安全、阿里云内容安全，还是自建规则加人工审核先跑？
4. 用户封禁后，是否允许查看历史宠友圈和宠物日历？
5. 用户删除宠友圈动态时，后台是否保留完整证据快照？
6. 聊天消息保留周期多久？
7. AI 生成原图和结果图保留周期多久？
8. 地点审核通过后，用户提交内容是否展示为点评，还是只作为地点创建依据？
9. 客服回复用户走 App 内通知，还是短信/电话/人工微信？
10. 生产数据库和后台是同一服务部署，还是单独后台服务部署？

## 17. 建议优先级

如果按上线风险排序，建议优先顺序是：

1. 用户查询和 AI 任务排查。
2. 宠友圈动态/评论审核。
3. 举报处理和用户处罚。
4. 地点点评/新增地点审核。
5. 反馈工单。
6. 审计日志。
7. AI 用量成本看板。
8. 配置中心。
9. 数据看板。

原因很直接：AI 生成稳定性和内容安全会最先影响真实用户体验；地点审核和反馈决定运营闭环；数据看板和配置中心重要，但可以在前面的安全底座之后补。
