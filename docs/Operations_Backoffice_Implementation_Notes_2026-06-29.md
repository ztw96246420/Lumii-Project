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

当前账号：

- 用户名默认：`admin`
- 密码默认：`LumiiAdmin@2026`
- 生产建议必须通过环境变量 `LUMII_ADMIN_USERNAME`、`LUMII_ADMIN_PASSWORD` 覆盖。

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

### 3.3 用户管理

- `GET /admin/users`
- `GET /admin/users/{phone}`

已支持：

- 用户列表。
- 用户详情聚合：宠物、AI 用量、AI 任务、反馈、通知、宠友圈动态。

未实现：

- 禁言/冻结/解封。
- 用户业务数据清理。
- 用户备注和风险标签。

### 3.4 AI 灵伴

- `GET /admin/ai/avatar-jobs`
- `POST /admin/ai/avatar-jobs/{jobId}/refresh`
- `POST /admin/ai/avatar-jobs/{jobId}/retry`
- `POST /admin/ai/avatar-jobs/{jobId}/mark-failed`
- `POST /admin/ai/avatar-jobs/{jobId}/refund-quota`

已支持：

- 查看任务、用户、宠物、provider、进度、错误。
- 刷新上游任务状态。
- 重试。
- 后台标记失败。
- 返还形象生成额度。
- 写入审计日志。

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
- 证据快照。

### 3.6 举报中心

- `GET /admin/social/reports`
- `POST /admin/social/reports/{reportId}/resolve`

已支持：

- 举报列表。
- 标记有效、无效、关闭、升级、处理中。
- 写入审核人、审核时间、审核原因。

未实现：

- 举报自动触发处罚。
- 举报人/被举报人的处理通知。

### 3.7 地图地点

- `GET /admin/places`
- `GET /admin/places/reviews`
- `POST /admin/places/reviews/{reviewId}/approve`
- `POST /admin/places/reviews/{reviewId}/reject`
- `GET /admin/places/submissions`
- `POST /admin/places/submissions/{submissionId}/approve`
- `POST /admin/places/submissions/{submissionId}/reject`

已支持：

- 点评审核通过/驳回。
- 新增地点审核通过/驳回。
- 新增地点通过后创建 `manual` 来源地点，宠物友好状态为 `candidate`。

未实现：

- 地点合并。
- 编辑地点详情。
- 地点审核原因模板。

### 3.8 反馈工单

- `GET /admin/feedback`
- `PATCH /admin/feedback/{feedbackId}`
- `GET /admin/tickets`
- `GET /admin/tickets/{ticketId}`
- `POST /admin/tickets/{ticketId}/assign`
- `POST /admin/tickets/{ticketId}/notes`
- `POST /admin/tickets/{ticketId}/reply`
- `POST /admin/tickets/{ticketId}/status`
- `PATCH /admin/tickets/{ticketId}`

已支持：

- App `/feedback` 提交后自动生成工单。
- 历史 feedback 会在后台读取时自动迁移为工单，不需要单独脚本。
- 工单中心一级菜单，替代原简单反馈列表。
- 状态筛选：未关闭、新反馈、处理中、等待用户、已解决、已关闭、全部。
- 优先级筛选：紧急、高、普通、低。
- 搜索：手机号、内容、工单 ID。
- 工单卡片展示：SLA、优先级、状态、负责人、联系方式、备注数、回复数、关联对象。
- 分配负责人。
- 修改状态和优先级。
- 添加内部备注。
- 客服回复。
- 客服回复可同步生成移动端 `support_reply` 系统通知，用户可在 App 通知中心看到。
- 旧 `/admin/feedback` 仍保留兼容，状态更新会同步到对应工单。
- 工作台反馈统计改为基于工单：未关闭、紧急、SLA 超时。

未实现：

- 用户端“我的工单/反馈进度”详情页。
- 工单关联对象的后台手动编辑 UI，当前后端已预留 `relatedObjects` 字段。
- 工单负责人枚举、SLA 配置化、批量分配。
- 客服回复模板。

### 3.9 配置中心

- `GET /admin/config`
- `PATCH /admin/config`
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

移动端已接入：

- `social.petCircleMaxPhotos`：发布今日小事图片上限和 UI 计数。
- `social.discoverRadiusKm`：附近发现和地图定位请求半径。
- `ai.petAvatarDailyLimit`：AI 形象额度兜底展示。
- `ai.petChatDailyLimit`：AI 对话额度兜底展示。
- `features.aiAvatar`：隐藏/拦截 AI 灵伴形象上传、生成、重试入口；后端返回 `FEATURE_DISABLED`。
- `features.petChat`：隐藏/拦截 AI 宠物对话入口和消息预加载；后端返回 `FEATURE_DISABLED`。
- `features.petCircle`：隐藏/拦截宠友圈、发布小事、我的小事、评论/点赞/举报/封面入口；后端返回 `FEATURE_DISABLED`。
- `features.places`：隐藏/拦截地图地点、地点详情、地点点评/提交入口；后端返回 `FEATURE_DISABLED`。
- `features.walkInvite`：拦截约遛邀请入口和创建接口；后端返回 `FEATURE_DISABLED`。
- `app.maintenanceEnabled`：App 进入维护页并隐藏底部导航；后端拦截非 GET 写操作，保留反馈、退出登录、刷新 token、通知已读等基础接口。
- `app.maintenanceMessage`：维护页和后端 `APP_MAINTENANCE` 响应共用文案。

移动端暂未完整接入：

- `social.nearbyMomentTtlDays` 目前主要由后端可见性使用。

### 3.10 审计日志

- `GET /admin/audit-logs`

已支持：

- 后台登录。
- AI 任务操作。
- 宠友圈/评论操作。
- 举报处理。
- 地点审核。
- 反馈状态变更。
- 配置变更。
- 用户处罚新增与撤销。

### 3.11 用户处罚

- `GET /admin/sanctions`
- `GET /admin/users/{phone}/sanctions`
- `POST /admin/users/{phone}/sanctions`
- `POST /admin/users/{phone}/sanctions/{sanctionId}/revoke`

已支持：

- 处罚类型：`warning` 警告、`mute` 禁言、`freeze` 冻结、`ban` 封禁。
- 后台创建处罚，支持小时级时长；时长为 `0` 表示长期有效。
- 后台撤销处罚。
- 处罚流水状态实时计算：`active`、`expired`、`revoked`。
- 用户列表展示账号状态和生效处罚。
- 用户列表快捷禁言 24 小时、冻结 72 小时。
- 工作台展示生效处罚数量。
- 账号快照返回 `accountStatus` 与 `sanctions`，移动端可读取。
- 移动端接口已受后端处罚状态影响：
  - 禁言会拦截发布小事、宠友圈评论、点赞、打招呼、约遛、私信、宠友圈封面、地点投稿、地点点评。
  - 冻结/封禁会拦截大多数写操作。
  - 反馈、token refresh、通知已读保留，方便用户继续申诉或完成低风险状态同步。
- 所有处罚新增/撤销写入审计日志。

未实现：

- 自动由举报处理触发处罚建议。
- 用户端独立申诉入口与申诉处理后台。
- 处罚到期/撤销通知。
- 处罚模板与证据快照。
- 多管理员复核与双人审批。

### 3.12 内容安全任务池

- `GET /admin/moderation/tasks`
- `POST /admin/moderation/tasks/{taskId}/{action}`

已支持：

- 新增后台一级菜单：内容安全。
- 统一聚合以下任务：
  - 用户举报。
  - 被举报宠友圈动态。
  - 被举报宠友圈评论。
  - 待审核地点点评。
  - 待审核新增地点。
- 支持状态筛选：待处理、已升级、处理中、已处理、全部。
- 支持手机号、内容、任务 ID 搜索。
- 任务卡片展示来源、风险分、风险标签、作者、举报人、对象状态、正文摘要、创建时间。
- 处理动作会写审计日志并回写原业务对象：
  - 举报：接手、无效关闭、升级、有效并隐藏、有效并删除。
  - 动态：隐藏、恢复、删除。
  - 评论：隐藏、恢复、删除。
  - 地点点评：通过、驳回。
  - 新增地点：通过、驳回，通过后创建 `manual` 地点。
- 移动端联动：
  - 动态/评论被隐藏或删除后，App 列表、详情和评论列表不再展示。
  - 地点点评/新增地点仍沿用原审核状态，移动端继续读取对应状态。

未实现：

- 文本/图片第三方内容安全模型接入。
- 自动风险分和违规分类，目前主要来自举报、状态和规则聚合。
- 审核任务负责人、批量处理、SLA 计时。
- 举报处理结果通知、作者处罚建议自动生成。

## 4. 预留菜单

后台左侧已预留但未接入完整逻辑：

- 数据导出。

后续应继续增加：

- 角色权限管理。
- 系统配置发布/回滚。
- 运营数据看板细分页。

## 5. 待澄清问题

1. 后台正式登录是否继续用账号密码，还是接企业微信/飞书？
2. 生产后台是否只允许白名单 IP 访问？
3. 用户禁言的业务范围第一版已明确：发布小事、评论、点赞、打招呼、约遛、私信、宠友圈封面、地点投稿、地点点评都会被禁；是否还要限制头像/资料修改待确认。
4. 运营删除宠友圈动态后，作者端是否展示“已被运营处理”的占位提示？
5. 举报处理结果是否通知举报人？
6. 新增地点审核通过后，是否需要通知提交人“已通过”？
7. 地点点评审核通过后，App 地点详情是否要公开展示所有 approved 点评？当前 C 端还没有完整公开点评列表。
8. 维护模式开启时，App 是阻断登录，还是只显示顶部提示？
9. AI 形象任务返还额度的规则：所有失败都可返还，还是仅 provider 失败返还？
10. 客服回复用户第一版已走 App 通知中心；后续是否需要“我的工单/反馈进度”详情页？
11. 后台是否需要独立域名，例如 `ops.lumiiapp.cn`，还是先沿用 IP `/admin`？

## 6. 下一批建议

建议下一批继续做：

1. 处罚申诉与通知：用户端申诉入口、后台处理、处罚到期/撤销通知。
2. 内容安全模型接入：文本/图片审核、规则配置、自动风险分、样本沉淀。
3. 用户端我的工单：反馈进度、客服回复详情、继续补充信息。
4. 继续扩大移动端配置化范围：公告弹窗、灰度策略、强制升级、启动页素材。
5. 后台静态资源和 API 增加更细权限与更完整审计字段。
