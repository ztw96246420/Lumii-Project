# Lumii / 灵伴 MVP 开发支持清单 v0

日期：2026-05-28

这份文档只记录“我继续开发时需要你或后端/设计/运营提供的支持”。它和 PRD、路线图分开，方便你随时补资料、补接口、补内容。

## 0. 2026-06-12 当前维护结论

已完成或已有测试方案：
- ~~测试环境 API Base URL。~~ 当前云端测试后端为 `http://193.112.92.111`。
- ~~高德或腾讯地图 SDK/API Key。~~ MVP 已选高德；Android 高德 Key/SDK 已接入，iOS 仍待接。
- ~~社交发现/打招呼/聊天接口从零开始。~~ 当前云端测试后端已支持附近发现、发送招呼、招呼请求、接受/婉拒、会话、消息、未读归零。
- ~~每次测试都需要打 APK 并放到腾讯云下载。~~ 日常开发不再上传 APK；只热更新后端或用本地模拟器/Android Studio 验证。

仍需要你后续重点支持：
- Figma Make 新页面/新状态设计，尤其健康编辑删除、聊天富消息、地点审核/重复/失败、黑名单和注销冷静期。
- AI 形象生成真实供应商、风格样张、重新生成/不像我的宠物/局部调整规则。
- iOS 高德 Key/SDK、地点 POI 策略和外部导航规则。
- 用户协议、隐私政策、第三方 SDK 清单、个人信息收集清单。
- 生产级短信/推送/对象存储/内容审核方案。

## 1. 当前开发前提

- 首发市场：中国大陆。
- 地图优先：已确认 MVP 首发先选高德地图。
- 登录方式：MVP 先做手机号 + 短信验证码，不接微信登录、苹果登录。
- 设计源：当前已转为 Figma Make 源码 `Lumii Project Opus4.7` 作为主要视觉源；Stitch 文档仅保留历史页面/交互缺口参考。
- AI 风格：偏真实卡通化，需要保留真实宠物的毛色、脸型、眼神、体态特征。
- 当前前端形态：React Native/Expo MVP 已通过统一 API 门面和状态机跑通主链路；默认可走云端测试后端，也可显式回退 mock；页面不再长期依赖 Stitch iframe/HTML 文案识别，正在按 Figma Make 源码逐屏转译。

## 1.1 2026-06-02 需要你优先支持的事项

1. AI 宠物形象样张/素材：
   - 当前前端为了稳定演示，已生成并接入本地金毛真实卡通化示例资产：`mobile/assets/lumii/golden-avatar-v1.png`。
   - mock AI 生成结果现在使用内部 URI `lumii://golden-retriever-avatar` 映射到该本地资产。
   - 仍需要你提供 3-5 张最终想要的“真实卡通化”样张，最好包含原图/生成图对照。
   - 如果能重新提供你家狗狗正式照片，请放在不易过期的位置，微信 `RWTemp` 临时路径已经失效。
2. AI 图像生成接口：
   - 需要确定供应商、输入照片、生成风格 prompt、返回候选图数量、失败/重试/保存接口。
   - 当前 `POST /ai/pet-avatar/jobs`、`GET /ai/pet-avatar/jobs/{jobId}`、保存接口均为 mock。
3. 高德地图：
   - 已按“高德优先”做 mock 地图视觉和外部导航入口。
   - 2026-06-07 已提供 Android 高德 Key `Lumii灵伴`，并接入 Android 高德 3D 地图 SDK、Manifest Key、权限、隐私合规初始化与 RN 原生 `MapView` 桥接。
   - 2026-06-10 已补地图样式能力层：灵伴暖色、标准、卫星、夜间、实时路况；Android 真机桥接已支持 `mapType` 和 `showTraffic`。
   - 当前 Android Studio x86_64 模拟器因高德 3D 地图库主 ABI 限制会自动回退 mock 底图；ARM 真机/ARM 首选 ABI 设备启用原生高德地图。
   - 后续仍需要确认 POI 搜索/周边地点策略、外部导航跳转规则、iOS 高德 Key/SDK，以及是否申请/配置高德自定义地图模板。
4. QA 验收：
   - ~~设置页已增加“MVP 验收入口”，方便你下飞机后逐页验收所有页面/状态。~~ 当前代码里已没有可见的 MVP 验收入口，不再作为待补页面或正式包隐藏任务误导你。
   - 2026-06-02 已完成首页、健康、体重、疫苗、发现、消息、通知、地图、地点详情、我的、宠物档案、设置、账号安全、安全中心等现有 RN 路由的 Figma Make 风格批量转译。
   - 后续如果重新需要验收入口，必须做成开发环境开关，正式包隐藏。

## 2. MVP 用户闭环

### 2.1 新用户建档闭环

登录页 -> 获取验证码 -> 验证码状态/错误 -> 权限引导 -> 未添加宠物空状态 -> 添加宠物基础信息 -> 上传宠物照片 -> 识别详情/失败重传 -> AI 生成中 -> AI 结果确认 -> 电子宠物首页。

需要支持：
- ~~短信验证码接口。~~ 当前测试后端已提供 `POST /auth/sms/send`、`POST /auth/sms/verify`，固定测试码 `962464`；生产短信仍需后端代理。
- ~~新老用户判断。~~ 当前登录返回 `account.activePet`、`permissionsOnboardingCompleted`，可用于二次登录跳过注册链路。
- ~~宠物基础资料保存。~~ 当前测试后端已提供 `GET/POST/PATCH /pets` 和当前宠物保存。
- 图片上传。
- AI 生成任务创建、轮询、失败重试、结果保存。

### 2.2 电子宠物与健康闭环

电子宠物首页 -> 宠物档案 -> 健康日历 -> 疫苗计划/体重记录/健康备忘 -> 保存记录 -> 首页健康摘要更新。

需要支持：
- 宠物健康摘要接口。
- 疫苗计划模板。
- 体重记录和趋势接口。
- 健康备忘、就诊记录接口。
- 健康提醒通知。

### 2.3 社交闭环

社交发现 -> 附近宠物主人卡片 -> 打招呼 -> 招呼请求 -> 接受后进入聊天 -> 消息发送/失败重发 -> 举报/拉黑。

需要支持：
- ~~基于位置的附近用户列表。~~ 当前测试后端已按 3km 默认半径、模糊距离、在线窗口返回附近用户。
- ~~发现页基础刷新和筛选。~~ 当前 App 已支持下拉/按钮刷新、自动定位刷新、猫狗/兴趣标签基础筛选和空结果状态；复杂筛选 Bottom Sheet 仍待 Figma。
- 用户隐私可见范围。
- ~~打招呼发送、接受、拒绝。~~ 当前测试后端已支持发送招呼、招呼请求、接受/婉拒。
- ~~会话和消息接口。~~ 当前测试后端已支持会话列表、消息列表、发消息、标记已读。
- 举报、拉黑、安全策略。

### 2.4 地图地点闭环

宠物友好地图 -> 搜索/筛选 -> 地点详情 -> 收藏/分享/导航 -> 新增地点点评 -> 审核通知。

需要支持：
- ~~高德或腾讯地图 SDK/API Key。~~ 已确认高德优先；Android 高德 Key 已接入，iOS Key/SDK 待接入。
- ~~地点搜索、分类筛选。~~ 当前 RN 地图页已支持测试后端搜索、分类筛选、loading 和空结果状态。
- ~~宠物友好地点详情。~~ 已有地点详情、收藏、分享、高德导航入口。
- ~~点评提交、审核状态。~~ 已接测试后端；地点点评图片上传仍待设计/接口。
- ~~外部地图导航跳转。~~ 已接高德 URI；腾讯/苹果地图优先级仍待生产策略确认。

### 2.5 我的与安全闭环

我的 -> 多宠管理/设置隐私/账号安全/举报安全 -> 保存设置或提交请求 -> 反馈状态。

需要支持：
- ~~用户资料接口。~~ MVP 测试后端已支持 `GET /me`、`PATCH /me`，App 会在通用数据加载时同步 ownerName、手机号、当前宠物、权限和设置。
- ~~多宠管理接口。~~ MVP 测试后端已支持宠物列表、创建、详情、编辑、删除、设置当前宠物；多宠管理页面和删除二次确认仍需 Figma 设计。
- 隐私设置接口。
- 黑名单接口。
- 账号注销流程。
- ~~未接入危险操作不做 mock 成功反馈。~~ 当前账号安全/安全中心未接入项仅展示“后续开放”，不会假提交举报、拉黑或注销。
- 用户协议、隐私政策、儿童/未成年人相关合规判断。

## 3. 接口支持清单

### 3.1 认证与账号

需要接口：
- `POST /auth/sms/send`：发送验证码。
- `POST /auth/sms/verify`：校验验证码并登录/注册。
- `POST /auth/logout`：退出登录。
- ~~`POST /auth/token/refresh`：刷新 token。~~ MVP 测试后端已支持；App 启动恢复本地 session 时会先刷新账号快照，401 才清缓存回登录。
- ~~`GET /me`：当前用户资料。~~ MVP 测试后端已支持，App 会用于“我的页”等用户资料同步。
- ~~`PATCH /me`：更新用户资料。~~ MVP 测试后端已支持更新 `ownerName`；完整资料编辑页仍需后续设计。
- `POST /account/delete/request`：发起账号注销。
- `POST /account/delete/confirm`：短信确认注销。

当前状态：
- 本地已接入 Spug 短信发送测试链路，真实手机号测试成功。
- 当前云端 MVP 测试后端使用固定验证码 `962464`，避免 App 内暴露短信服务地址。
- 前端原型已完成“手机号/协议校验 -> 发送验证码 loading -> 输入 6 位验证码 -> 正确进入登录成功 loading -> 权限页 / 错误进入验证码错误页 / 过期进入验证码过期页”的本地会话校验。
- 已接入 Stitch 的手机号格式错误、发送频繁、未勾选协议、验证码过期、登录成功跳转中等登录状态页。
- 生产仍建议后端提供 `POST /auth/sms/send` 和 `POST /auth/sms/verify`，不要在 App 包内暴露短信服务地址。

### 2.1.1 权限授权接入状态

当前状态：
- 已安装并接入 Expo 权限模块：`expo-location`、`expo-image-picker`、`expo-notifications`。
- 权限页三个开关已接入前端桥接：定位、照片与相机、消息通知。
- Web 预览中不会弹系统授权框，会模拟授权成功并回写开关状态；iOS/Android 真机中会调用系统授权弹窗。

iOS 调用：
- 定位：`Location.requestForegroundPermissionsAsync()`，需要 `NSLocationWhenInUseUsageDescription`。
- 照片与相机：`ImagePicker.requestMediaLibraryPermissionsAsync()` + `ImagePicker.requestCameraPermissionsAsync()`，需要相册和相机 usage description。
- 通知：`Notifications.requestPermissionsAsync({ ios: { allowAlert, allowBadge, allowSound } })`。

Android 调用：
- 定位：`Location.requestForegroundPermissionsAsync()`，声明 `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION`。
- 照片与相机：`ImagePicker.requestMediaLibraryPermissionsAsync()` + `ImagePicker.requestCameraPermissionsAsync()`，声明 `CAMERA` / `READ_MEDIA_IMAGES` 等权限。
- 通知：Android 13+ 通过 `Notifications.requestPermissionsAsync()` 触发 `POST_NOTIFICATIONS`；同时创建默认通知 Channel。

需要你确认：
- 验证码长度：当前按 6 位实现。
- ~~倒计时秒数：建议 60s，前端后续接真实倒计时。~~ 当前前端和测试后端均按 60s 处理。
- 单手机号频控规则：每分钟、每天、每 IP 上限。
- ~~测试手机号和固定验证码：测试手机号已验证可收短信；固定验证码仅用于命令行测试，真实前端会生成随机 6 位。~~ 当前云端 MVP 测试包也使用固定验证码 `962464`；生产再切随机短信码。
- 错误码文案：验证码错误、过期、发送过频、手机号格式错误、服务不可用。

### 3.2 媒体上传

需要接口：
- `POST /media/upload-token`：获取上传凭证。
- `POST /media/commit`：提交上传结果。
- `GET /media/{id}`：读取媒体信息。

需要你确认：
- 对象存储：阿里云 OSS、腾讯云 COS、七牛云或其他。
- 最大图片数量、单张大小、视频时长。
- 支持格式：jpg、png、heic、mp4 等。
- 是否服务端做人脸检测、宠物主体检测、多宠物检测。
- 图片是否需要自动压缩和去 EXIF。

### 3.3 宠物资料

需要接口：
- ~~`GET /pets`：宠物列表。~~ MVP 测试后端已支持。
- ~~`POST /pets`：创建宠物。~~ MVP 测试后端已支持。
- ~~`GET /pets/{petId}`：宠物详情。~~ MVP 测试后端已支持。
- ~~`PATCH /pets/{petId}`：编辑宠物。~~ MVP 测试后端已支持。
- ~~`DELETE /pets/{petId}`：删除宠物。~~ MVP 测试后端已支持；App 暂不暴露删除入口，需先补 Figma 危险操作确认。
- ~~`POST /pets/{petId}/set-default`：设置默认宠物。~~ MVP 测试后端已支持。
- `GET /pet-taxonomy`：物种、品种、性格标签字典。

需要你提供：
- 首发支持物种范围：建议猫、狗为完整支持，鸟、仓鼠、兔子等先支持基础档案。
- 犬猫品种字典。
- 性格标签字典。
- 性别、绝育、生日、体重单位等字段规则。

### 3.4 AI 宠物形象生成

需要接口：
- `POST /ai/pet-avatar/jobs`：创建 AI 形象生成任务。
- `GET /ai/pet-avatar/jobs/{jobId}`：查询任务状态。
- `POST /ai/pet-avatar/jobs/{jobId}/retry`：重新生成。
- `POST /ai/pet-avatar/jobs/{jobId}/accept`：保存选中的形象。
- `POST /ai/pet-avatar/jobs/{jobId}/feedback`：反馈“不像我的宠物”。

任务状态建议：
- `queued`：排队中。
- `analyzing`：分析照片。
- `extracting_features`：提取特征。
- `generating`：生成中。
- `succeeded`：生成成功。
- `failed`：生成失败。
- `expired`：结果过期。

需要你提供：
- AI 供应商选择：OpenAI、火山、通义、混元、即梦或其他。
- 图像生成目标风格样张：真实卡通化参考图。
- 生成结果数量：单张还是多张候选。
- 每个用户免费生成次数和重试次数。
- 是否保留原图、保留多久、如何删除。
- AI 失败时的兜底策略。

### 3.5 AI 电子宠物对话

需要接口：
- ~~`POST /ai/pet-chat/sessions`：创建/获取与某只宠物的会话。~~ MVP 暂以当前登录用户 + 当前宠物作为隐式 session。
- ~~`GET /ai/pet-chat/sessions/{sessionId}/messages`：读取历史消息。~~ MVP 已接 `GET /ai/pet-chat/messages`。
- ~~`POST /ai/pet-chat/sessions/{sessionId}/messages`：发送消息并获取回复。~~ MVP 已接 `POST /ai/pet-chat/messages`，支持 DeepSeek V4 服务端适配层与本地 fallback。
- ~~`POST /ai/pet-chat/messages/{messageId}/feedback`：反馈语气不像、无帮助、不安全等。~~ MVP 测试后端已支持 `good/off`，App 会把“像它/不像它”写回对应 AI 消息。

需要你提供：
- 宠物人格设定字段：活泼、黏人、稳重、胆小等。
- 健康建议边界文案：AI 不能替代兽医诊断。
- 是否支持语音输入、图片输入。
- AI 回复是否需要流式输出。
- 敏感内容和医疗风险拦截策略。

当前状态：
- 电子宠物对话页已从 Stitch 同步并接入前端原型。
- MVP 后端已接电子宠物对话历史读取、消息保存、DeepSeek V4 适配层、fallback 回复和 AI 回复反馈写回。
- DeepSeek 密钥只允许配置在服务端环境变量，不进入前端和 Git。
- 仍需要后续补流式输出、长对话摘要、反馈聚合分析和正式安全评估。

### 3.6 健康管理

需要接口：
- ~~`GET /pets/{petId}/health/summary`：首页健康摘要。~~ MVP 暂由 `GET /health/weights`、`GET /health/vaccines`、`GET /health/memos` 拼装。
- `GET /pets/{petId}/health/calendar`：健康日历。
- ~~`POST /pets/{petId}/health/memos`：新增健康备忘。~~ 测试后端已接 `POST /health/memos`，按当前宠物持久化。
- `PATCH /pets/{petId}/health/memos/{memoId}`：编辑健康备忘。
- `DELETE /pets/{petId}/health/memos/{memoId}`：删除健康备忘。
- ~~`POST /pets/{petId}/weights`：记录体重。~~ 测试后端已接 `POST /health/weights`，按当前宠物持久化并同步宠物体重。
- `GET /pets/{petId}/weights/trend`：体重趋势。
- ~~`GET /pets/{petId}/vaccines/plan`：疫苗计划。~~ 测试后端已接 `GET /health/vaccines`。
- ~~`PATCH /pets/{petId}/vaccines/plan`：更新疫苗计划。~~ 测试后端已接 `PATCH /health/vaccines/{vaccineId}`，支持标记完成。

需要你提供：
- 犬猫疫苗模板。
- 驱虫提醒模板。
- 体重健康判断规则：先粗略按品种/年龄区间，后续再精细化。
- 健康提醒推送文案。
- 就诊记录字段规范。

### 3.7 社交发现与聊天

需要接口：
- ~~`GET /social/discover`：附近宠物主人列表。~~ 测试后端已接。
- ~~`POST /social/greetings`：发送打招呼。~~ 测试后端已接。
- ~~`GET /social/greetings/inbox`：收到的招呼。~~ 实际测试端点为 `GET /social/greeting-requests`。
- ~~`POST /social/greetings/{id}/accept`：接受招呼。~~ 实际测试端点为 `POST /social/greeting-requests/{ownerId}/accept`。
- ~~`POST /social/greetings/{id}/reject`：拒绝招呼。~~ 实际测试端点为 `POST /social/greeting-requests/{ownerId}/reject`。
- ~~`GET /conversations`：会话列表。~~ 测试后端已接。
- ~~`GET /conversations/{id}/messages`：消息列表。~~ 测试后端已接。
- ~~`POST /conversations/{id}/messages`：发送消息。~~ 测试后端已接。
- ~~`POST /conversations/{id}/read`：标记已读。~~ 测试后端已接。
- `POST /users/{userId}/block`：拉黑。
- `DELETE /users/{userId}/block`：解除拉黑。
- `POST /reports`：举报。

需要你确认：
- ~~附近范围：1km、3km、5km、10km 是否可选。~~ 当前 MVP 默认 3km，接口保留 `radiusKm` 参数。
- ~~是否展示精确距离，还是模糊距离。~~ 当前按模糊距离展示。
- 未互相同意前是否允许发消息：建议不能，只能打招呼。
- ~~打招呼是否有每日次数限制。~~ MVP 暂不限制，代码保留后续频控口。
- AI 打招呼文案是否由后端生成。
- 聊天是否支持图片、地点卡片、约遛邀请卡片。

### 3.8 地图与宠物友好地点

需要接口：
- ~~`GET /places/search`：地点搜索。~~ MVP 测试后端已支持按名称、地址、分类、标签搜索。
- ~~`GET /places/nearby`：附近地点。~~ MVP 测试后端已支持。
- `GET /places/{placeId}`：地点详情。
- ~~`POST /places`：新增地点。~~ MVP 测试后端已改用 `POST /places/submissions` 提交新增地点草稿。
- ~~`POST /places/{placeId}/reviews`：提交点评。~~ MVP 测试后端已支持。
- ~~`POST /places/{placeId}/favorite`：收藏地点。~~ MVP 测试后端已改用 `PATCH /places/{placeId}/favorite`。
- ~~`DELETE /places/{placeId}/favorite`：取消收藏。~~ MVP 测试后端已改用 `PATCH /places/{placeId}/favorite`。
- `POST /places/{placeId}/report`：举报地点信息。

需要你确认：
- ~~选择高德还是腾讯作为首发地图。~~ 已确认 MVP 首发先选高德地图。
- 地点类别：宠物医院、宠物友好餐厅/咖啡、宠物公园、洗护、美容、寄养、饮水点、可遛区域。
- 点评是否需要审核。
- 地点是否允许用户新增。
- 是否接入地图 POI，还是先做自有地点库。
- 外部导航打开高德、腾讯、苹果地图的优先级。

### 3.9 通知

需要接口：
- `POST /devices/push-token`：上报推送 token。
- ~~`GET /notifications`：通知列表。~~ MVP 测试后端已支持，App 会在消息页/通知页刷新读取。
- ~~`POST /notifications/read`：批量标记已读。~~ MVP 测试后端已支持，进入通知中心会自动标记已读。
- ~~`PATCH /notification-settings`：通知设置。~~ MVP 测试后端已用 `PATCH /settings` 保存 `pushNotifications`。

需要你提供：
- 推送服务选择：极光、个推、厂商通道、Firebase/APNs 等。
- 通知模板：验证码除外，健康提醒、AI 生成完成、招呼请求、地点审核、系统通知。
- 通知权限拒绝时的引导文案。

### 3.10 设置、安全与合规

需要接口：
- ~~`GET /privacy-settings`。~~ MVP 测试后端已用 `GET /settings` 返回 `fuzzyLocation`、`nearbyVisible`、`interactionMessages`、`pushNotifications`。
- ~~`PATCH /privacy-settings`。~~ MVP 测试后端已用 `PATCH /settings` 保存隐私与通知开关；`nearbyVisible=false` 会影响附近发现曝光。
- `GET /blocks`。
- `DELETE /blocks/{userId}`。
- `POST /feedback`。
- `GET /legal/terms`。
- `GET /legal/privacy`。

需要你提供：
- 用户协议。
- 隐私政策。
- 个人信息收集清单。
- 第三方 SDK 清单。
- 账号注销说明。
- 举报处理规则。
- 内容审核规则。

## 4. 内容和运营素材清单

P0 必需：
- App 名称和中英文写法：Lumii / 灵伴。
- Logo、启动图、App 图标。
- AI 真实卡通化风格参考图 5 到 10 张。
- 示例宠物原图和对应理想结果。
- 登录、权限、上传、AI 生成、失败提示的正式中文文案。
- 用户协议和隐私政策初稿。
- 犬猫物种、品种、性格标签字典。
- 高德或腾讯地图 Key。

P1 建议：
- 疫苗/驱虫/体重健康模板。
- 宠物友好地点分类和图标。
- 空状态插画或 Stitch 页面。
- 举报原因列表。
- 聊天安全提示文案。
- Push 通知模板。
- 运营种子内容：附近宠物卡片、地点点评、系统通知示例。

P2 后续：
- 鸟、仓鼠、兔子、爬宠等非猫狗物种的健康模板。
- 商家主页资料。
- 活动/约遛运营规则。
- 会员或 AI 额度策略。

## 5. 技术环境与密钥

需要准备：
- ~~测试环境 API Base URL。~~ 当前：`http://193.112.92.111`。
- OpenAPI/Apifox/YApi 文档。
- ~~测试账号和测试验证码。~~ 当前测试验证码：`962464`。
- ~~地图 SDK Key。~~ Android 高德 Key 已接入；iOS 待接。
- 对象存储测试 Bucket。
- AI 服务测试 Key 或后端代理接口。
- 推送服务测试 App Key。
- 错误码表。
- CORS 和本地调试白名单。

建议环境变量：
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_MAP_PROVIDER`
- `EXPO_PUBLIC_AMAP_KEY`
- `EXPO_PUBLIC_TENCENT_MAP_KEY`
- `EXPO_PUBLIC_AI_GATEWAY_URL`
- `EXPO_PUBLIC_UPLOAD_ENDPOINT`

## 6. 我接下来开发会优先消耗的支持

第一批最需要：
1. ~~短信验证码接口协议和测试手机号。~~ 测试后端已可用；生产短信规则仍待确认。
2. ~~宠物资料接口协议。~~ 测试后端已可用。
3. 图片上传和 AI 形象生成接口协议。
4. AI 电子宠物对话接口协议。
5. iOS 高德 Key、地点分类和 POI 策略。
6. 用户协议、隐私政策占位版。

第二批：
1. 健康管理接口和疫苗模板。
2. ~~社交发现/打招呼/聊天接口。~~ 测试后端已可用；生产级风控/安全仍待补。
3. 地点点评/审核接口。
4. ~~通知中心和推送设置接口。~~ MVP 测试后端已接通知列表、已读和设置保存；生产推送 token、厂商通道和通知模板仍待补。
5. 举报、拉黑、账号注销接口。

第三批：
1. 真实种子数据。
2. 更完整的异常态和审核态。
3. 性能、埋点、灰度、监控方案。

## 7. 2026-05-30 MVP 原生化开发状态更新

本轮已把前端入口从 Stitch iframe/文案点击桥接切换为 React Native 原生化 MVP 状态机。~~Stitch 仍作为视觉源和 QA 对照~~ 当前主设计源已改为 Figma Make/Figma 源码包，Stitch 仅保留历史参考；业务流程不再依赖页面全文识别或按钮文案推断。

已落地的 mock service 命名空间：
- `auth`：`sendSmsCode`、`verifySmsCode`、`logout`
- `permissions`：当前通过 `src/services/permissions.ts` 调用 Expo 权限服务；Web 预览模拟授权
- `pets`：`createPet`、`updatePet`、`listPets`、`setActivePet`
- `avatar`：`uploadPetMedia`、`startGeneration`、`getGenerationStatus`、`saveAvatar`
- `health`：`recordWeight`、`listWeightRecords`、`listVaccines`、`saveHealthMemo`
- `social`：`listNearbyOwners`、`sendGreeting`、`createWalkInvite`
- `messages`：`listConversations`、`sendMessage`、`listNotifications`
- `places`：`listNearbyPlaces`、`searchPlaces`、`createReview`

仍需要你/后端/设计优先补充：
- API Base URL、鉴权 token 方案、统一错误码结构。
- 短信后端代理接口，避免在 App 内暴露短信服务地址。
- 宠物物种、品种、性格标签字典；猫狗 P0 完整，兔子/仓鼠/鹦鹉/爬宠先基础档案。
- AI 真实卡通化参考样张 5-10 张，以及“重新生成/不像我的宠物/局部调整”的交互规则。
- 对象存储方案和上传限制：图片大小、视频时长、格式、压缩、EXIF 清理。
- 地图供应商最终选择：已确认高德地图；Android 高德 SDK Key 已接入，仍需 POI 分类、导航跳转规则、iOS Key/SDK。
- 健康模板：疫苗、驱虫、体重区间、提醒文案。
- 社交规则：附近范围、距离模糊策略、打招呼次数限制、未互相关注是否可聊天。
- 合规材料：用户协议、隐私政策、个人信息收集清单、第三方 SDK 清单、注销规则、举报处理规则。

2026-05-30 追加：
- 已新增接口契约草案：`docs/API_Contract_MVP_v0.md`。
- 已新增前端 API 门面：`mobile/src/mvp/api.ts`。
- 后端对接时，请优先按契约确认 `EXPO_PUBLIC_API_BASE_URL`、统一返回结构、错误码、鉴权 token、短信频控、上传与 AI 生成任务状态。
- 已确认 MVP 宠物类型首版先完整支持猫、狗；兔子、仓鼠、鹦鹉、爬宠等保留后续扩展。
- 已确认打招呼暂不限制次数，但前端保留配置口，后续可按每日次数或风控策略调整。
- 已确认附近距离采用模糊显示，不暴露精确距离。
- 已确认 AI 宠物形象风格以 Stitch 中“真实宠物照片 -> 真实卡通化 avatar”的对照为准，尤其参考金毛照片和金毛 realistic cartoon avatar，以及社交发现页里的宠物图。
