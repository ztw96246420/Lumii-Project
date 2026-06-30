# 运营后台配置联动清单

日期：2026-06-30

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
- `social.discoverRadiusKm`：移动端作为默认半径发请求，后端按请求半径返回附近数据。
- `social.nearbyMomentTtlDays`：后端过滤附近小事，移动端文案和兜底过滤同步。
- `features.aiAvatar`：后端阻断上传/生成/重试，移动端隐藏或拦截入口。
- `features.petChat`：后端阻断 AI 对话，移动端隐藏或拦截入口。
- `features.petCircle`：后端阻断宠友圈相关接口，移动端隐藏或拦截入口。
- `features.places`：后端阻断地图地点接口，移动端隐藏或拦截入口。
- `features.walkInvite`：后端阻断约遛邀请，移动端隐藏或拦截入口。
- `app.maintenanceEnabled` / `app.maintenanceMessage`：后端拦截主要写操作，移动端展示维护页。
- `analytics.enabled`：后端控制 `/analytics/events` 是否落库，移动端关闭页面、发现、地图、通知等事件上报。
- `analytics.sampleRatePercent`：移动端按手机号和事件名稳定采样，后端配置中心统一下发。
- `support.slaHours`：后端按配置计算工单 SLA、排序和统计，移动端在我的反馈展示预计响应时间。

### 移动端联动

- `app.announcement`：移动端按版本展示公告弹窗，后端只负责下发配置。
- `app.update`：移动端按版本、强制更新和灰度比例展示更新弹窗，后端只负责下发配置。
- `app.splash`：移动端按版本展示启动提示，后端只负责下发配置。

### 后端强制

- `moderation.enabled` / `moderation.textRulesEnabled`：后端实时执行文本规则，移动端当前只展示后端返回的错误或送审结果。
- `moderation.machineTextEnabled`：后端调用腾讯云文本内容安全，覆盖宠友圈小事、评论、地点内容和宠物资料文本；移动端只读取公开开关，不获取 Biztype 或密钥。
- `moderation.machineImageEnabled`：后端调用腾讯云图片内容安全，覆盖宠物头像、AI 原图、宠友圈图片、封面和工单附件；移动端只看到审核结果和错误提示。
- `moderation.sampleReviewRatePercent`：后端按比例稳定抽样已通过的公开内容进入样本复盘；移动端不读取该比例，用户侧发布结果不受影响。
- `notifications.rateLimitEnabled` / `notifications.maxCampaignsPerDay` / `notifications.maxPerUserPerDay`：后端限制后台系统通知的 24 小时批次上限和单用户入站上限；移动端不读取阈值，但用户只会收到频控允许入站的系统通知。
- `analytics.retentionDays`：后端按保留天数清理移动端事件，移动端不需要感知。

### 预留

- `experiments`：实验和灰度人群包尚未实现，需要先确定分桶、指标回收和回滚策略。

## 待澄清

1. 内容安全开关是否需要在移动端发布页显示轻提示，例如“内容规则已开启”。
2. 强制更新的 Android 下载地址上线后使用 CDN URL、应用市场 URL，还是服务器直链。
3. 后续 A/B 实验是否按手机号稳定分桶，还是按设备 ID / 宠物 ID 分桶。
4. 灰度人群包是否只支持手机号列表，还是需要地区、活跃度、宠物类型等条件。
5. 配置发布草稿已接入；审批、定时发布和回滚审批是否进入生产首发仍待确认。
6. 移动端事件生产化后进入独立事件表、日志服务还是数据仓库。
7. 内容安全抽样复审率生产初始值建议 1%-5%，最终比例需要结合人工审核产能确认。
