# 移动端事件埋点与运营看板说明

日期：2026-06-30

## 目标

补齐运营后台数据看板中最基础的 App 行为口径，让后台能看到用户是否真的进入发现、地图、地点详情、通知和宠友圈相关链路，而不是只能依赖业务结果数据。

本次只做测试期轻量事件流水，不替代生产级数据仓库。

## 已接入链路

### 后端

- 新增 `POST /analytics/events`。
- 需要用户登录态，不接收匿名事件。
- 读取 `opsConfig.analytics.enabled`，关闭后返回 `accepted=false`，不落库。
- 事件写入 `state.appEvents`，按 `opsConfig.analytics.retentionDays` 清理，最多保留 8000 条。
- 事件写入时会更新用户 `lastSeenAt`，用于轻量活跃口径。
- 新增 `app_events.csv` 数据导出。
- `/admin/analytics` 聚合页面浏览、首页模块曝光、AI 形象前端漏斗、发现曝光、宠友圈卡片曝光与互动、地图打开、POI 搜索、地点详情、通知点击和系统通知批次点击。
- `/admin/dashboard/summary` 增加移动端事件总量、事件用户数和最新事件时间。

### 后台

- 配置中心新增“移动端事件埋点”：
  - 是否启用。
  - 采样率。
  - 保留天数。
- 配置联动体检新增：
  - `analytics.enabled`
  - `analytics.sampleRatePercent`
  - `analytics.retentionDays`
- 数据看板新增：
  - 移动端事件 KPI。
  - AI 前端漏斗 KPI。
  - 宠友圈前端互动 KPI。
  - 地图行为 KPI。
  - 移动端行为趋势图。
  - 最近 7 天事件明细列。
- 数据导出新增“移动端事件”。

### 移动端

移动端读取 `/app/config` 中的：

- `analytics.enabled`
- `analytics.sampleRatePercent`

上报前会按“手机号 + 事件名”稳定采样。采样率低于 100 时，同一个用户对同一个事件的采样结果保持稳定，避免趋势抖动过大。

## 事件清单

| 事件名 | 含义 | 主要来源 |
| --- | --- | --- |
| `app.page_view` | 页面切换 | 全局 route 变化 |
| `home.module_exposure` | 首页模块曝光 | 进入首页后记录宠物主视觉、AI 对话入口、宠物日历、附近小事、快捷入口 |
| `config.announcement_impression` | App 公告展示 | `/app/config` 下发公告弹窗且弹窗真实展示 |
| `config.announcement_action` | App 公告主按钮点击 | 公告弹窗主按钮，包含“知道了”和有跳转的按钮 |
| `config.splash_impression` | 启动提示展示 | `/app/config` 下发启动提示且弹窗真实展示 |
| `config.splash_action` | 启动提示主按钮点击 | 启动提示主按钮，包含“知道了”和有跳转的按钮 |
| `config.update_impression` | 更新提示展示 | 版本策略命中后展示强更或普通更新弹窗 |
| `config.update_action` | 更新提示主按钮点击 | 更新弹窗“立即更新”点击；属性只记录是否强更、版本和是否配置下载地址 |
| `ai_avatar.entry_click` | AI 形象入口点击 | 宠物详情重新生成入口 |
| `ai_avatar.start` | AI 形象开始生成 | 首次生成或重新生成成功创建任务 |
| `ai_avatar.success` | AI 形象生成成功 | 生成任务返回可确认结果 |
| `ai_avatar.failure` | AI 形象生成失败 | 额度不足、启动失败、重试失败或轮询到失败状态 |
| `discover.view` | 进入发现页 | 发现页 route |
| `discover.filter` | 切换发现筛选 | 发现筛选 |
| `discover.search` | 打开发现搜索或按关键词筛选 | 发现搜索入口 |
| `discover.refresh` | 下拉刷新发现 | 发现刷新 |
| `discover.owners_loaded` | 附近伙伴加载成功 | 附近人接口 |
| `discover.pet_circle_loaded` | 附近小事加载成功 | 宠友圈列表接口 |
| `discover.pet_circle_load_more` | 附近小事加载更多 | 宠友圈分页 |
| `pet_circle.card_exposure` | 宠友圈卡片曝光 | 附近小事列表、通知跳转、我的/他人宠友圈主页 |
| `pet_circle.like_click` | 宠友圈点赞点击 | 小事卡片操作区 |
| `pet_circle.comment_click` | 宠友圈评论点击 | 小事卡片和宠友圈主页评论入口 |
| `pet_circle.greeting_click` | 宠友圈招呼点击 | 小事卡片和资料卡 |
| `pet_circle.profile_view` | 查看宠友圈主页 | 我的/他人宠友圈主页 |
| `pet_circle.walk_invite_click` | 宠友圈约遛点击 | 宠友圈资料卡约遛入口 |
| `map.open` | 进入地图页 | 地图 route |
| `map.locate` | 地图定位成功 | 高德定位/预览兜底定位 |
| `map.poi_search` | 地图 POI 搜索或附近地点刷新 | 地图搜索/筛选 |
| `map.place_detail_view` | 进入地点详情 | 地图列表或通知跳转 |
| `map.favorite_toggle` | 收藏/取消收藏地点 | 地点详情 |
| `map.navigation_open` | 打开高德导航 | 地点详情导航 |
| `notification.open` | 点击通知；系统通知会携带 `campaignId` / `notificationId` 用于批次点击率 | 通知中心 |
| `support.open` | 进入反馈进度 | 工单/反馈入口 |

## 配置触达口径

公告、启动提示和更新提示复用 `/analytics/events`，后台 `GET /admin/analytics` 会在 `summary.configPrompts` 返回展示、主按钮点击和点击率；数据看板同步展示“配置触达”和“配置展示/点击”趋势。

移动端同一会话内对同一配置版本的曝光只上报一次，避免因为 React state 刷新或页面切换造成重复曝光。主按钮点击不去重，用于观察用户是否真正点了“知道了/跳转/立即更新”。

## 隐私与数据最小化

后端会过滤事件属性中的敏感字段，当前不存：

- 正文、评论、消息内容。
- 搜索词、关键词。
- 地址。
- 精确经纬度。
- 手机号属性字段。
- token、secret、password。
- 图片 URL、头像 URL、base64。

允许保留的属性只用于聚合，例如：

- 筛选项。
- 结果数量。
- 是否有更多。
- 搜索词长度。
- 采样来源。
- 页面名。
- 地点 ID、通知类型这类业务排查 ID。

## 当前限制

- 测试期仍使用 JSON state，不适合长期存储大规模事件。
- 不支持任意事件查询后台页面，当前只做看板聚合和 CSV 导出。
- 严格留存 Cohort 仍需要独立事件表、设备去重和更长窗口。
- Push 真实送达率仍需要厂商回执。
- 第三方地图导航完成无法从外部高德 App 回传，当前只能记录“打开导航”。

## 生产化建议

上线前建议把事件从 JSON state 迁移到独立表或数据仓库：

- `app_event_id`
- `user_id` / `phone_hash`
- `pet_id`
- `event_name`
- `route`
- `platform`
- `app_version`
- `app_build`
- `device_id_hash`
- `properties_json`
- `occurred_at`
- `created_at`

并增加：

- 分区或 TTL。
- 事件白名单版本管理。
- 后台事件明细筛选。
- 留存 Cohort。
- 漏斗分析。
- 导出审批和水印。
