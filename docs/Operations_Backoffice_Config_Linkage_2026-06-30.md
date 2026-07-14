# 运营后台配置联动清单

日期：2026-07-01

## 目标

配置中心不能只是后台表单。每个配置项都需要说明：

- 后端是否强制执行。
- 移动端是否读取并改变体验。
- 用户实际会感知什么。
- 哪些能力只是预留，不能误认为已经上线。

## 已落地

- `GET /admin/config` 返回 `linkage.summary` 和 `linkage.items`。
- 配置中心页面展示“配置联动体检”，包含联动状态、当前值、后端证据、移动端证据、用户影响和运营备注。
- 数据导出新增 `config_linkage.csv`，用于验收和运营复盘。

## 当前联动状态

### 前后端联动

- `ai.petAvatarDailyLimit`：后端限制生成次数，移动端展示形象生成额度。
- `ai.petChatDailyLimit`：后端限制对话次数，移动端展示 AI 对话额度。
- `social.petCircleMaxPhotos`：后端限制图片数量，移动端控制发布图片选择和计数。
- `social.discoverRadiusKm`：后台固定提供 `3km / 5km / 10km` 三档，首发默认 `10km`；移动端同步展示并发起请求，后端以后台值为权威范围，旧客户端或篡改请求不能扩大/缩小附近伙伴、小事和地图 POI 的范围。
- `social.nearbyMomentTtlDays`：后端过滤附近小事，移动端文案和兜底过滤同步。
- `features.aiAvatar`：后端阻断上传/生成/重试，移动端隐藏或拦截入口。
- `features.petChat`：后端阻断 AI 对话，移动端隐藏或拦截入口。
- `features.petCircle`：后端阻断宠友圈相关接口，移动端隐藏或拦截入口。
- `features.places`：后端阻断地图地点接口，移动端隐藏或拦截入口。
- `features.walkInvite`：后端阻断约遛邀请，移动端隐藏或拦截入口。
- `app.maintenanceEnabled` / `app.maintenanceMessage`：后端拦截主要写操作，移动端展示维护页。
- `experiments.homeAiEntry`：后端通过 `/app/config` 下发实验策略，移动端按手机号稳定分桶并改变首页 AI 对话入口文案。
- `analytics.enabled`：后端控制 `/analytics/events` 是否落库，移动端关闭页面、发现、地图、通知等事件上报。
- `analytics.sampleRatePercent`：移动端按手机号和事件名稳定采样，后端配置中心统一下发。
- `support.slaHours`：后端按配置计算工单 SLA、排序和统计，移动端在我的反馈展示预计响应时间。

### 移动端联动

- `app.announcement`：移动端按版本展示公告弹窗，后端只负责下发配置。
- `app.update`：移动端按版本、强制更新和灰度比例展示更新弹窗，后端只负责下发配置。
- `app.splash`：移动端按版本展示启动提示，后端只负责下发配置。

### 后端强制

- `moderation.enabled` / `moderation.textRulesEnabled`：后端实时执行文本规则，移动端当前只展示后端返回的错误或送审结果。
- `moderation.machineTextEnabled`：后端调用腾讯云文本内容安全，覆盖私信、AI 回复输出、宠友圈小事、评论、地点内容和宠物资料文本；移动端只读取公开开关，不获取 Biztype 或密钥。
- `moderation.machineImageEnabled`：后端调用腾讯云图片内容安全，覆盖宠物头像、AI 原图、宠友圈图片、封面和工单附件；移动端只看到审核结果和错误提示。
- `moderation.sampleReviewRatePercent`：后端按比例稳定抽样已通过的公开内容进入样本复盘；移动端不读取该比例，用户侧发布结果不受影响。
- `notifications.rateLimitEnabled` / `notifications.maxCampaignsPerDay` / `notifications.maxPerUserPerDay`：后端限制后台系统通知的 24 小时批次上限和单用户入站上限；移动端不读取阈值，但用户只会收到频控允许入站的系统通知。
- `notifications.requireApproval`：后端限制后台系统通知直接发送和直接预约；开启后必须先提交审批，审批通过后移动端才会收到系统通知或等待预约到点。
- `analytics.retentionDays`：后端按保留天数清理移动端事件，移动端不需要感知。

### 预留

- 暂无配置中心预留项。多实验平台、实验互斥层、指标胜出分析和自动回滚仍属于 `experiments.homeAiEntry` 基座之后的扩展能力。

## 待澄清

1. 内容安全开关是否需要在移动端发布页显示轻提示，例如“内容规则已开启”。
2. 强制更新的 Android 下载地址上线后使用 CDN URL、应用市场 URL，还是服务器直链。
3. 后续多实验平台是否继续按手机号稳定分桶，还是增加设备 ID / 宠物 ID / 人群包分桶。
4. 通知人群包后续是否需要从手机号列表扩展到地区、活跃度、宠物类型等动态条件。
5. 配置发布草稿、单 admin 审批、回滚审批和预约发布已接入；生产首发仍需确认是否强制双人审批和灰度发布。
6. 移动端事件生产化后进入独立事件表、日志服务还是数据仓库。
7. 内容安全抽样复审率生产初始值建议 1%-5%，最终比例需要结合人工审核产能确认。

## 2026-07-04 更新：内容安全轻提示联动

- 新增 `moderation.publicHint` 配置，包含 `enabled`、`postText`、`commentText`、`placeText`、`imageText`。
- `/app/config` 仅下发用户可读的公开提示文案，不下发关键词、Biztype、供应商策略或命中规则。
- 移动端已在今日小事发布、宠友圈评论、地点点评/新增地点入口消费该配置；后台关闭 `publicHint.enabled` 后，移动端不再展示这类轻提示。
- 原“内容安全开关是否需要在移动端发布页显示轻提示”的待澄清项已按“需要，但只展示运营可配置文案，不展示策略细节”处理。

## 2026-07-04 更新：地点公开点评查看更多

- `places.publicReviews.apiLimit` 继续控制后端 `/places/{id}/reviews` 最多返回条数。
- `places.publicReviews.detailDisplayLimit` 控制移动端地点详情首屏展示条数。
- 当公开点评数超过首屏展示条数时，移动端展示“查看更多 / 收起”，展开后显示本次后端返回的全部公开点评。
- 后台配置中心的“移动端查看更多”已从预留标记改为已接入。

## 2026-07-14 更新：App 触达配置发布约束

- `app.announcement`、`app.splash` 和 `app.update` 仍由 `/app/config` 下发并由移动端执行，但后端现已在所有正式发布边界统一做语义校验，不再只相信后台页面的前端校验。
- 启用公告或启动提示时必须同时填写稳定版本、标题和正文；版本用于按账号记录已读，同一版本处理后不会重复弹出。
- 启用可选更新时必须填写最新版本号或最新构建号；启用强制更新时必须填写最低可用版本号或最低构建号；启用任一 Android 更新时必须配置 `http://` 或 `https://` 下载地址。
- 校验覆盖直接发布、草稿发布、审批创建、最终批准、预约创建、到点发布和历史版本回滚。草稿允许暂存不完整内容，发布时必须完整；无效预约在到点二次校验失败后会进入失败状态，不会污染线上配置。
- 移动端已验证触达优先级为版本更新、启动提示、运营公告；可选更新允许稍后处理，强制更新没有关闭入口；配置动作支持打开下载地址或跳转到白名单内 App 页面。
- `smoke-config-risk-confirmation.cjs` 覆盖无效直接发布、草稿发布、审批和预约创建；`smoke-frontend-playwright.cjs` 覆盖真实前后台下发、展示、动作、已读去重与强制更新阻断视觉。
