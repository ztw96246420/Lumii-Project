# Lumii 开发路线 v0

版本：v0.1  
日期：2026-05-25

## 1. 推荐技术路线

移动端：

- React Native + Expo，快速同时覆盖 iOS 和 Android。
- TypeScript。
- Expo Router 或 React Navigation。
- Zustand 或 Redux Toolkit 管理状态。

后端：

- MVP 推荐 Supabase + Edge Functions，降低早期开发和运维成本。
- 数据库使用 PostgreSQL。
- 位置能力使用 PostGIS。
- 文件存储使用对象存储。
- 后续业务复杂后，可迁移到 NestJS 或 FastAPI 独立服务。

实时和消息：

- MVP 可使用 Supabase Realtime。
- 如果聊天复杂度上升，再评估 Stream、Sendbird、环信、融云等专业 IM 服务。

地图：

- 首发市场为中国大陆，优先评估高德地图和腾讯地图。
- MVP 需要定位、附近 POI、地点搜索、地图标记、地点详情和路线跳转。
- 地图层仍建议做轻量抽象，避免后续切换地图服务时牵动业务代码。

AI：

- 后端封装 AI Gateway。
- 先接图像生成、宠物聊天、健康记录结构化、破冰文案。
- 具体模型和 API 在实现前以官方最新文档为准，避免被过时接口锁死。

推送：

- iOS 使用 APNs。
- Android 海外使用 FCM。
- 中国大陆 Android 需要评估厂商推送或第三方推送服务。

## 2. 数据模型草案

users：

- id
- phone/email/oauth_id
- nickname
- avatar_url
- bio
- privacy_mode
- created_at

pets：

- id
- owner_id
- name
- species
- breed
- gender
- birthday
- weight
- neutered
- personality_tags
- social_status
- avatar_image_url
- created_at

pet_media：

- id
- pet_id
- type
- url
- is_reference
- created_at

pet_avatar_jobs：

- id
- pet_id
- status
- style
- input_media_ids
- result_urls
- selected_url
- error_message
- created_at

pet_memories：

- id
- pet_id
- type
- content
- source
- created_at

health_records：

- id
- pet_id
- record_type
- title
- value
- unit
- occurred_at
- note
- attachment_urls

reminders：

- id
- pet_id
- reminder_type
- title
- due_at
- repeat_rule
- status

nearby_visibility：

- user_id
- pet_id
- location_point
- location_geohash
- visibility_radius
- updated_at

greetings：

- id
- from_user_id
- to_user_id
- from_pet_id
- to_pet_id
- message
- status
- created_at

conversations：

- id
- type
- created_at

messages：

- id
- conversation_id
- sender_id
- message_type
- body
- media_url
- created_at

places：

- id
- name
- category
- location_point
- address
- pet_friendly_tags
- source
- created_by
- created_at

place_reviews：

- id
- place_id
- user_id
- pet_id
- rating
- content
- media_urls
- created_at

reports：

- id
- reporter_id
- target_type
- target_id
- reason
- status
- created_at

## 3. 开发阶段

### Phase 0：产品验证与原型，1 到 2 周

目标：

- 明确首发市场。
- 明确产品名、视觉方向和核心人群。
- 画出主流程原型。
- 做 10 到 20 个目标用户访谈。

产出：

- PRD v1。
- 低保真原型。
- 视觉风格板。
- 技术验证清单。

### Phase 1：MVP 开发，6 到 8 周

目标：

- 做出可内测的 iOS 和 Android 版本。
- 完成宠物建档、电子宠物生成、聊天、健康提醒、附近发现、地图标记。

里程碑：

- Week 1：项目脚手架、登录、数据库、基础 UI。
- Week 2：宠物档案、媒体上传、个人页。
- Week 3：AI 头像生成任务流。
- Week 4：电子宠物聊天和宠物记忆。
- Week 5：健康记录、提醒、推送。
- Week 6：附近发现、打招呼、聊天。
- Week 7：地图、地点收藏、地点点评。
- Week 8：安全、埋点、修复、内测包。

### Phase 2：封闭 Beta，3 到 4 周

目标：

- 100 到 500 名真实养宠用户试用。
- 验证生成像不像、聊天有没有留存、附近社交是否成立。

重点：

- 用户反馈收集。
- AI 成本控制。
- 社交安全。
- 位置隐私。
- 崩溃和性能。

### Phase 3：公开 v1

目标：

- 上架 App Store 和主流 Android 渠道。
- 增加会员、更多风格包、活动和地图内容运营。

## 4. 测试策略

客户端：

- 组件测试。
- 关键页面快照。
- 登录、建宠物、上传、聊天、地图的端到端测试。
- 真机测试 iOS 和 Android。

后端：

- API 单元测试。
- 数据权限测试。
- 地理位置查询测试。
- 消息和提醒集成测试。

AI：

- 生成任务失败重试测试。
- 内容安全测试。
- 医疗风险回复测试。
- 成本和限额测试。

上线前：

- 隐私政策和用户协议检查。
- 账号注销流程检查。
- 敏感权限弹窗检查。
- App Store 和 Android 审核材料准备。

## 5. 部署策略

开发环境：

- Supabase dev 项目。
- AI 测试 Key。
- 地图测试 Key。
- Expo development build。

测试环境：

- 独立数据库。
- 独立对象存储。
- 测试推送证书。
- TestFlight 和 Android internal testing。

生产环境：

- 生产数据库和备份。
- 日志、告警和成本监控。
- AI 调用限额。
- 内容审核后台。

## 6. 近期行动清单

1. 评估高德地图和腾讯地图，确认 MVP 地图 SDK。
2. 确认短信服务商和手机号登录方案。
3. 确认首批真实卡通化样张。
4. 画出移动端核心页面原型。
5. 搭建 React Native 项目。
6. 搭建数据库和认证。
7. 先做宠物档案和电子宠物生成闭环。
