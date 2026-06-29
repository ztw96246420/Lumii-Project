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

已支持：

- 反馈列表。
- 状态切换：`received`、`reviewing`、`closed`。

未实现：

- 工单负责人。
- 内部备注。
- 客服回复。
- 关联对象。

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

移动端暂未完整接入：

- `features.*` 功能开关暂未系统性隐藏入口。
- `app.maintenanceEnabled` 暂未弹维护提示。
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

## 4. 预留菜单

后台左侧已预留但未接入完整逻辑：

- 用户处罚。
- 数据导出。

后续应继续增加：

- 工单中心独立页。
- 内容安全任务池。
- 角色权限管理。
- 系统配置发布/回滚。
- 运营数据看板细分页。

## 5. 待澄清问题

1. 后台正式登录是否继续用账号密码，还是接企业微信/飞书？
2. 生产后台是否只允许白名单 IP 访问？
3. 用户禁言的业务范围：只禁宠友圈，还是聊天/评论/招呼一起禁？
4. 运营删除宠友圈动态后，作者端是否展示“已被运营处理”的占位提示？
5. 举报处理结果是否通知举报人？
6. 新增地点审核通过后，是否需要通知提交人“已通过”？
7. 地点点评审核通过后，App 地点详情是否要公开展示所有 approved 点评？当前 C 端还没有完整公开点评列表。
8. 维护模式开启时，App 是阻断登录，还是只显示顶部提示？
9. AI 形象任务返还额度的规则：所有失败都可返还，还是仅 provider 失败返还？
10. 后台是否需要独立域名，例如 `ops.lumiiapp.cn`，还是先沿用 IP `/admin`？

## 6. 下一批建议

建议下一批继续做：

1. 用户处罚状态：禁言、冻结、解封，并让 App 发布/评论/聊天接口受影响。
2. 工单中心：负责人、备注、关联对象、客服回复。
3. 内容安全任务池：把举报、动态、评论、地点点评统一到审核任务。
4. 移动端功能开关完整接入：宠友圈、地图、AI 对话、约遛入口。
5. 后台静态资源和 API 增加更细权限与更完整审计字段。
