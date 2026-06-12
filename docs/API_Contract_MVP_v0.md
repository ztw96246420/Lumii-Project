# Lumii MVP API 契约草案 v0

日期：2026-05-30

维护更新：2026-06-12

当前实现状态：
- 移动端 API 门面：`mobile/src/mvp/api.ts`。
- 云端测试后端：`http://193.112.92.111`。
- 测试验证码：`962464`。
- 当前测试后端使用文件状态持久化，适合 MVP 联调，不是生产架构。
- ~~默认走本地 `mockApi`。~~ 当前已默认走 HTTP 测试后端；如需本地 mock，可显式配置 `EXPO_PUBLIC_API_MODE=mock`。

## 1. 前端接入策略

当前前端通过 `mobile/src/mvp/api.ts` 访问统一 API 门面：

- ~~默认：`EXPO_PUBLIC_API_MODE=mock`，走本地 `mockApi`。~~
- 当前默认：不设置环境变量时走 `http://193.112.92.111` 测试后端。
- 真实接口：`EXPO_PUBLIC_API_MODE=http` 且配置 `EXPO_PUBLIC_API_BASE_URL` 后，走 HTTP 适配器。
- App 页面只依赖 `lumiiApi`，不直接依赖 mock，实现 mock/真实接口可替换。

建议环境变量：

```env
EXPO_PUBLIC_API_MODE=http
EXPO_PUBLIC_API_BASE_URL=http://193.112.92.111
EXPO_PUBLIC_MAP_PROVIDER=amap
EXPO_PUBLIC_AMAP_KEY=
EXPO_PUBLIC_TENCENT_MAP_KEY=
EXPO_PUBLIC_AI_GATEWAY_URL=
EXPO_PUBLIC_UPLOAD_ENDPOINT=
```

## 2. 统一返回结构

前端优先接受标准结构：

```ts
type ApiResult<T> =
  | { state: 'success'; data: T }
  | { state: 'error'; error: { message: string; retryable: boolean }; data?: unknown };
```

HTTP 适配器也兼容后端常见结构：

```json
{ "success": true, "data": {} }
```

错误建议：

```json
{
  "success": false,
  "error": {
    "code": "SMS_RATE_LIMITED",
    "message": "操作太频繁，请稍后再试",
    "retryable": true
  }
}
```

## 3. 鉴权

### POST `/auth/sms/send`

发送手机号验证码。

Request:

```json
{ "phone": "13531850966" }
```

Response:

```json
{
  "data": {
    "phone": "13531850966",
    "availableAt": 1780100000000,
    "expiresAt": 1780100240000
  }
}
```

说明：
- 真实接口不应返回验证码。
- mock 环境会返回 `code`，仅用于本地演示。
- `availableAt` 用于 60s 重新发送倒计时。
- `expiresAt` 用于验证码过期判断。

### POST `/auth/sms/verify`

Request:

```json
{
  "phone": "13531850966",
  "code": "123456",
  "expiresAt": 1780100240000
}
```

Response:

```json
{
  "data": {
    "account": {
      "activePet": null,
      "ownerName": "用户0966",
      "permissions": {
        "location": "unknown",
        "media": "unknown",
        "notifications": "unknown"
      },
      "permissionsOnboardingCompleted": false,
      "settings": {
        "fuzzyLocation": true,
        "interactionMessages": true,
        "nearbyVisible": true,
        "pushNotifications": true
      }
    },
    "phone": "13531850966",
    "token": "jwt-or-session-token"
  }
}
```

### POST `/auth/logout`

退出登录。前端成功后清空本地 token。

### POST `/auth/token/refresh`

本地已有 session 时刷新登录态和账号快照。App 启动时会先用本地 token 调用该接口，成功后更新本地 session；如果返回 401，则清空本地缓存并回到登录页。

Request:

```http
Authorization: Bearer jwt-or-session-token
```

Response:

```json
{
  "data": {
    "account": {
      "activePet": null,
      "ownerName": "用户0966",
      "permissions": {
        "location": "granted",
        "media": "granted",
        "notifications": "granted"
      },
      "permissionsOnboardingCompleted": true,
      "settings": {
        "fuzzyLocation": true,
        "interactionMessages": true,
        "nearbyVisible": true,
        "pushNotifications": true
      }
    },
    "phone": "13531850966",
    "token": "jwt-or-session-token"
  }
}
```

### GET `/me`

读取当前登录用户资料。App 启动和恢复 session 后会用它同步“我的页”昵称、手机号、当前宠物、权限和设置状态。

Response:

```json
{
  "data": {
    "phone": "13531850966",
    "ownerName": "用户0966",
    "activePet": null,
    "permissions": {
      "location": "granted",
      "media": "granted",
      "notifications": "granted"
    },
    "permissionsOnboardingCompleted": true,
    "settings": {
      "fuzzyLocation": true,
      "interactionMessages": true,
      "nearbyVisible": true,
      "pushNotifications": true
    }
  }
}
```

### PATCH `/me`

更新当前登录用户资料。MVP 测试后端当前支持：
- `ownerName`：1 到 16 个字。

Request:

```json
{ "ownerName": "Serena" }
```

Response：同 `GET /me`。

### GET `/permissions`

返回当前账号已保存的权限状态。

### PATCH `/permissions`

保存当前账号权限引导状态。

Request:

```json
{
  "permissions": {
    "location": "granted",
    "media": "granted",
    "notifications": "granted"
  },
  "completed": true
}
```

### GET `/settings`

返回当前账号设置。

Response:

```json
{
  "data": {
    "fuzzyLocation": true,
    "interactionMessages": true,
    "nearbyVisible": true,
    "pushNotifications": true
  }
}
```

### PATCH `/settings`

保存当前账号设置。

说明：
- `nearbyVisible=false` 后，其他用户的附近发现列表不会再出现该账号。
- `pushNotifications=false` 后，测试后端不再为该账号生成新的健康、互动、地点审核通知；历史通知不会自动删除。
- `interactionMessages=false` 后，测试后端不再为该账号生成新的招呼、招呼接受、约遛邀请、聊天消息通知；会话和未读数仍正常写入。

Request:

```json
{ "nearbyVisible": false }
```

## 4. 宠物档案

### GET `/pet-taxonomy`

读取建档用的宠物字典。该接口不要求登录，方便 App 在新用户建档前加载选项。MVP 首版只开放猫狗完整选择；兔子、仓鼠、鸟类、爬宠、其他先作为后续扩展入口保留。

Response data:

```ts
type PetTaxonomy = {
  fieldRules: {
    birthdayFormat: 'YYYY-MM-DD';
    maxBreedLength: number;
    maxNameLength: number;
    supportedSpecies: Array<'dog' | 'cat'>;
    weightUnit: 'kg';
  };
  genders: Array<{ id: 'male' | 'female' | 'unknown'; label: string }>;
  personalityTags: string[];
  species: Array<{
    id: 'dog' | 'cat' | 'rabbit' | 'hamster' | 'bird' | 'reptile' | 'other';
    label: string;
    supportedInMvp: boolean;
    breeds: string[];
  }>;
};
```

说明：
- `supportedInMvp=true` 的物种才应该在首版建档流程中作为可选项展示。
- 当前测试后端内置猫狗常用品种和基础性格标签；正式品种库后续可替换为运营维护版本。
- `fieldRules` 供前端做本地校验，后端仍会做兜底校验。

### GET `/pets`

返回当前用户的宠物列表。

### GET `/pets/{petId}`

读取某只宠物详情。用于后续多宠管理、切换前确认、详情页刷新等场景。

### POST `/pets`

Request:

```json
{
  "name": "奶油",
  "species": "dog",
  "breed": "金毛寻回犬",
  "gender": "unknown",
  "weightKg": 28.4
}
```

Response data:

```ts
type PetProfile = {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'rabbit' | 'hamster' | 'bird' | 'reptile' | 'other';
  breed: string;
  gender: 'male' | 'female' | 'unknown';
  weightKg?: number;
  birthday?: string;
  avatarUrl?: string;
  healthScore: number;
  personality: string[];
};
```

MVP 产品约束：
- 首版 UI 先完整支持 `dog`、`cat`。
- 其他物种类型保留接口和类型扩展口，暂不作为首版核心体验。

### PATCH `/pets/{petId}`

编辑宠物档案。

说明：
- App 已在“编辑宠物信息”页接入该接口；保存成功后会同步当前宠物快照并刷新健康摘要。

### DELETE `/pets/{petId}`

删除某只宠物档案。MVP 测试后端行为：
- 删除当前宠物后，会自动把剩余列表第一只设为当前宠物。
- 如果删除后没有宠物，当前宠物会清空。
- App 暂不暴露删除入口；后续必须等 Figma 补齐危险操作二次确认后再接 UI。

Response data:

```ts
PetProfile[]
```

### POST `/pets/{petId}/set-default`

切换当前宠物。

### POST `/pets/{petId}/avatar`

保存 AI 电子宠物形象。

Request:

```json
{ "avatarUrl": "https://..." }
```

## 5. 媒体上传与 AI 形象生成

### POST `/media/uploads`

MVP HTTP 适配器当前使用该接口承接上传结果。真实实现建议拆为：

- `POST /media/upload-token`
- 客户端直传 OSS/COS
- `POST /media/commit`

Response data:

```json
{
  "analysis": {
    "canGenerate": true,
    "code": "single_pet_clear",
    "message": "照片可以用于生成灵伴形象",
    "qualityScore": 92,
    "status": "accepted"
  },
  "mediaId": "media-001",
  "previewUrl": "https://...",
  "quality": "good"
}
```

### GET `/media/{mediaId}`

读取当前登录账号上传过的媒体元信息。用于上传后恢复、生成前复核和后续调试，不返回原始图片二进制。

Response data:

```ts
UploadedPetMedia
```

说明：
- 需要登录，只能读取当前账号自己的上传记录。
- 如果媒体不存在或不属于当前账号，返回 404：`上传照片已失效，请重新上传`。
- 原始文件读取仍使用内部/临时的 `GET /media/uploads/{mediaId}/file`，该地址主要给外部生成服务读取图片，不作为 App 业务页面入口。

### POST `/ai/pet-avatar/jobs`

Request:

```json
{ "mediaId": "media-001" }
```

Response data:

```ts
type AvatarJob = {
  acceptedAt?: string;
  acceptedPetId?: string;
  feedback?: {
    content?: string;
    createdAt: string;
    reason: 'color' | 'expression' | 'face_shape' | 'not_same_pet' | 'other' | 'style';
    status: 'received' | 'reviewed';
  };
  id: string;
  mediaId?: string;
  originalJobId?: string;
  status: 'processing' | 'ready' | 'failed';
  progress: number;
  resultUrl?: string;
};
```

### GET `/ai/pet-avatar/jobs/{jobId}`

轮询 AI 生成任务状态。

说明：
- 需要登录，只能读取当前账号自己的生成任务。

### POST `/ai/pet-avatar/jobs/{jobId}/retry`

基于原任务的 `mediaId` 重新生成一条新任务。MVP 测试后端会复用原上传媒体，仍受每日 AI 形象生成次数限制。

Response data:

```ts
AvatarJob
```

### POST `/ai/pet-avatar/jobs/{jobId}/accept`

接受当前任务生成结果，并保存为当前宠物的电子形象。

Response data:

```ts
PetProfile
```

说明：
- 任务必须属于当前账号。
- 任务必须是 `ready` 且包含 `resultUrl`。
- 当前账号必须已经有宠物档案。

### POST `/ai/pet-avatar/jobs/{jobId}/feedback`

记录用户对生成结果的“不像我家宠物/风格不喜欢”等反馈。当前只保存结构化反馈，不触发真实视觉识别模型或重新训练。

Request:

```json
{
  "reason": "face_shape",
  "content": "脸型不像，耳朵也偏短"
}
```

Response data:

```ts
AvatarJob
```

说明：
- `reason` 支持 `color`、`expression`、`face_shape`、`not_same_pet`、`style`、`other`。
- `content` 可选，最多 500 个字。

## 6. 健康管理

### GET `/health/summary`

读取当前宠物的首页/健康页摘要。MVP 测试后端会按当前宠物聚合健康分、最近体重、体重趋势、疫苗/驱虫计划、健康备忘和已开启的疫苗提醒。

Response data:

```ts
type HealthSummary = {
  healthScore: number;
  latestMemo?: HealthMemo;
  latestWeightKg?: number;
  latestWeightRecordedAt?: string;
  memoCount: number;
  nextVaccine?: VaccinePlan;
  pendingVaccineCount: number;
  urgentVaccineCount: number;
  vaccineReminderIds: string[];
  weightStatus: 'empty' | 'insufficient_data' | 'stable' | 'watch';
  weightSummary: string;
};
```

说明：
- 没有当前宠物时返回空摘要，`healthScore=0`、`weightStatus=empty`。
- `urgentVaccineCount` 当前按未完成且 14 天内到期/已逾期计算。
- 该接口只做摘要聚合，不替代 `GET /health/weights`、`GET /health/vaccines`、`GET /health/memos` 的详情读取。
- App 首页、健康页、体重页和疫苗页顶部摘要已优先使用该接口；详情列表仍读取各自明细接口，不需要新增设计页面。

### GET `/health/calendar`

聚合当前宠物的体重、疫苗和健康备忘，返回健康日历事件。MVP 测试后端按 `phone + activePetId` 持久化，事件只做健康记录聚合，不替代兽医诊断。

Response data:

```ts
type HealthCalendarEvent = {
  date: string; // YYYY-MM-DD
  detail: string;
  id: string;
  sourceId: string;
  status?: 'done' | 'due' | 'overdue';
  title: string;
  type: 'memo' | 'vaccine' | 'weight';
};
```

说明：
- `weight` 来自体重记录，`detail` 为体重和备注。
- `vaccine` 来自疫苗/驱虫计划，`status` 会保留原计划状态。
- `memo` 来自健康备忘，若 `updatedAt` 不是日期格式，会归到当天。
- 返回按 `date` 倒序排列。

### GET `/health/weights`

当前登录用户的当前宠物体重记录列表。测试后端会按 `phone + activePetId` 持久化；未添加宠物时返回空数组。

### GET `/health/weights/trend`

当前宠物体重趋势摘要。MVP 测试后端基于最近记录计算轻量趋势，不作为医疗判断。

Response data:

```ts
type WeightTrend = {
  currentKg?: number;
  previousKg?: number;
  changeKg: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
  status: 'empty' | 'insufficient_data' | 'stable' | 'watch';
  summary: string;
  records: WeightRecord[];
};
```

说明：
- 没有记录时返回 `status=empty`。
- 只有一条记录时返回 `status=insufficient_data`。
- 变化幅度达到约 8% 时返回 `status=watch`，文案只提示持续观察，不替代兽医判断。

### POST `/health/weights`

Request:

```json
{ "kg": 28.6, "note": "MVP 本地记录" }
```

行为：
- 新记录插入列表首位。
- 同步更新当前宠物 `weightKg`。
- `kg <= 0` 或非数字时返回中文错误。

### PATCH `/health/weights/{weightId}`

编辑当前宠物的某条体重记录。MVP 测试后端会按当前宠物的体重列表查找；如果编辑的是列表首位记录，会同步影响当前宠物 `weightKg`。

Request:

```json
{ "kg": 28.9, "note": "洗澡后复称", "recordedAt": "2026-06-12" }
```

说明：
- `kg` 可选，但传入时必须为大于 0 的数字。
- `note` 可选，可传空字符串清空备注。
- `recordedAt` 可选，传入时必须为 `YYYY-MM-DD`。
- 不存在的记录返回 404 中文错误。

### DELETE `/health/weights/{weightId}`

删除当前宠物的某条体重记录。MVP 测试后端会返回删除后的体重记录列表，并用删除后的首条记录回填当前宠物 `weightKg`；如果没有剩余记录，则清空当前宠物体重。

Response data:

```ts
WeightRecord[]
```

说明：
- App 暂不暴露删除入口；后续必须等 Figma 补齐删除二次确认后再接 UI。
- 删除后 `GET /health/weights/trend` 和 `GET /health/calendar` 会基于最新列表重新计算/聚合。

### GET `/health/vaccines`

当前宠物疫苗/驱虫计划。测试后端会按 `phone + activePetId` 持久化，默认根据猫/狗生成基础计划。

### PATCH `/health/vaccines/{vaccineId}`

Request:

```json
{ "status": "done" }
```

`status` 可为 `due`、`done`、`overdue`。

当疫苗计划被标记为 `done` 后：
- 测试后端会自动移除该计划的提醒开关。
- 测试后端会生成一条“疫苗计划已完成”通知，可通过 `GET /notifications` 读回；是否生成受 `pushNotifications` 控制。

### GET `/health/vaccine-reminders`

读取当前宠物已开启提醒的疫苗计划 ID 列表。

Response:

```json
["vaccine-id-001"]
```

### PATCH `/health/vaccine-reminders/{vaccineId}`

开启或关闭某条疫苗计划提醒。

Request:

```json
{ "enabled": true }
```

说明：
- 当前测试后端按 `phone + activePetId` 持久化提醒开关。
- 已完成的疫苗计划不能重新开启提醒。
- 开启提醒后，如计划已临近或逾期，`GET /notifications` 会生成一条去重后的健康提醒通知。

### GET `/health/memos`

当前宠物健康备忘列表。测试后端会按 `phone + activePetId` 持久化。

### POST `/health/memos`

Request:

```json
{ "title": "驱虫记录", "content": "体外驱虫已完成。" }
```

`title` 和 `content` 不能为空。

### PATCH `/health/memos/{memoId}`

编辑健康备忘。MVP 测试后端会按当前宠物的备忘列表查找。

Request:

```json
{ "title": "洗澡记录", "content": "耳朵干净，皮肤没有明显泛红。" }
```

说明：
- `title` 和 `content` 不能为空。
- 未传入的字段会沿用原值。
- App 暂不暴露编辑入口；后续需要等 Figma 补齐编辑页/弹层与删除确认。

### DELETE `/health/memos/{memoId}`

删除健康备忘。MVP 测试后端会返回删除后的当前宠物备忘列表。

Response data:

```ts
HealthMemo[]
```

说明：
- App 暂不暴露删除入口；后续必须等 Figma 补齐危险操作二次确认后再接 UI。

## 7. 社交与消息

### GET `/social/discover`

附近宠物主人列表。

Query:

```txt
lat=23.1291&lng=113.2644&radiusKm=3&accuracy=30
```

说明：
- 当前测试后端会保存用户最近一次位置和 `lastSeenAt`。
- 发现范围默认 3km。
- 距离返回模糊文案，例如 `500m 内`、`1km 内`、`约 1-2km`。
- 超过在线时间窗口或超出距离范围不会返回。

### POST `/social/greetings`

Request:

```json
{ "ownerId": "owner-001" }
```

MVP 产品约束：
- 打招呼暂不限制次数。
- 前端保留配置口，后续可加每日次数、单用户频次、风控灰度。
- 附近距离建议后端返回模糊文案，例如 `1km 内`、`约 1-2km`，不要直接暴露精确定位。

当前测试后端兼容策略：
- 已安装旧 APK：发送招呼时会直接给双方创建会话，方便不重装继续测试。
- 下一版 App：会使用待处理招呼请求，接收方接受后再正式进入会话。

### GET `/social/greeting-requests`

获取当前用户收到的待处理招呼请求。

### POST `/social/greeting-requests/{ownerId}/accept`

接受招呼请求，创建双方会话。

### POST `/social/greeting-requests/{ownerId}/reject`

婉拒招呼请求。

### POST `/social/walk-invites`

Request:

```json
{ "ownerId": "owner-001" }
```

### GET `/conversations`

会话列表。

### GET `/conversations/{conversationId}/messages`

会话消息列表。

### POST `/conversations/{conversationId}/messages`

发送人和人的聊天消息。

Request:

```json
{ "text": "你好，我们今晚也在附近" }
```

### POST `/conversations/{conversationId}/read`

标记会话已读。当前测试后端会持久化未读数归零。

### POST `/devices/push-token`

上报当前登录账号的设备推送 token。MVP 测试后端只保存 token，不连接厂商推送通道；后续接入 APNs、厂商通道、极光或个推时复用该设备记录。

App 调用时机：真机通知权限变为 `granted` 后，App 会通过 Expo Notifications 获取 Expo Push Token 并调用该接口登记；二次登录恢复到已授权通知状态时也会静默补登记。Web 预览不登记设备 token。

Request:

```json
{ "token": "ExponentPushToken[xxxx]", "platform": "android", "deviceId": "optional-device-id" }
```

Response data:

```ts
type PushDevice = {
  deviceId?: string;
  platform: 'android' | 'ios' | 'web';
  token: string;
  updatedAt: string;
};
```

说明：
- `token` 不能为空。
- `platform` 支持 `android`、`ios`、`web`，未识别时测试后端按 `android` 兜底。
- 传入 `deviceId` 时按 `deviceId` 去重更新；未传 `deviceId` 时按 token 去重。
- 该接口不等于生产推送服务上线；生产仍需确认厂商通道、通知模板、送达回执和退订策略。

### GET `/notifications`

读取通知中心列表。当前测试后端会在读取前检查已开启的健康提醒，临近或逾期的疫苗计划会生成去重后的“健康提醒”通知。

说明：
- 地点点评提交、用户新增地点提交也会写入通知中心，App 成功提交后会重新拉取该列表，不再只依赖前端临时通知。
- 普通聊天消息、招呼和约遛邀请会生成互动通知；是否生成受 `pushNotifications` 与 `interactionMessages` 控制。

### POST `/notifications/read`

标记通知已读。

Request:

```json
{ "ids": ["notification-id-001"] }
```

说明：
- `ids` 为空或不传时，标记当前用户全部通知已读。
- 返回最新通知列表。

### GET `/ai/pet-chat/messages`

读取当前登录用户、当前宠物的电子宠物 AI 对话历史。

### POST `/ai/pet-chat/messages`

电子宠物 AI 对话消息。

Request:

```json
{ "text": "今天精神不太好" }
```

行为：
- 后端保存用户消息和 AI 回复。
- 命中高风险医疗关键词时，后端会在调用模型前返回固定安全回复，提示尽快联系宠物医院或兽医；该路径不触发 DeepSeek 请求。
- 未配置 `DEEPSEEK_API_KEY` 时使用本地 fallback 回复。
- 配置 DeepSeek 后，后端会注入用户不可见的 Lumii 宠物陪伴提示词、宠物档案、健康摘要和最近少量历史。
- 默认限制单条用户输入长度，避免异常消耗 token。
- 默认返回非流式完整回复，后续可升级流式输出。

### POST `/ai/pet-chat/messages/{messageId}/feedback`

记录用户对某条 AI 回复的反馈。当前 MVP 支持：

```json
{ "rating": "good" }
```

`rating` 可选值：
- `good`：这个回复像我的宠物。
- `off`：这个回复不像我的宠物，需要后续优化人格/语气。

说明：
- 只能反馈 AI 回复，不能反馈用户自己发送的消息。
- 测试后端会把 `feedback` 写回对应消息，后续 `GET /ai/pet-chat/messages` 可读回。

### GET `/ai/usage`

读取当前账号的 AI 日用量和测试后端累计模型调用统计。该接口只读已有统计，不触发 DeepSeek、Flux 或 Midjourney 请求，主要用于 MVP 阶段控制 token/额度消耗。

Response data:

```ts
type AiUsageSummary = {
  daily: {
    petAvatar: { count: number; day: string; limit: number; remaining: number };
    petChat: { count: number; day: string; limit: number; remaining: number };
  };
  deepseek: {
    cacheHitTokens: number;
    cacheMissTokens: number;
    completionTokens: number;
    model: string;
    promptTokens: number;
    requests: number;
    totalTokens: number;
  };
  petAvatarProvider: string;
  ttapiFlux: { failed: number; quota: number; requests: number; succeeded: number };
  ttapiMidjourney: { failed: number; quota: number; requests: number; succeeded: number };
  updatedAt: string;
}
```

说明：
- `daily.petChat` 使用当前账号当日宠物对话次数和 `PET_CHAT_DAILY_LIMIT`。
- `daily.petAvatar` 使用当前账号当日宠物形象生成次数和 `PET_AVATAR_DAILY_LIMIT`。
- `deepseek`、`ttapiFlux`、`ttapiMidjourney` 是测试后端累计统计，用于联调成本观察，不作为生产计费账单。
- App 进入 AI 宠物对话页和发送消息后会读取该接口，用真实 `daily.petChat.count/limit` 展示“今日 AI 对话”额度，不再使用前端本地软额度。

## 8. 地点

### GET `/places/nearby`

附近宠物友好地点。

### GET `/places/search?q=公园`

搜索地点。MVP 测试后端会按地点名称、地址、分类和标签进行包含匹配；`q` 为空时返回附近地点列表。

### GET `/places/{placeId}`

读取单个宠物友好地点详情，供地图地点详情页、收藏状态刷新和后续分享卡片复用。

Response data:

```ts
Place
```

说明：
- 如果地点不存在，返回 404 和中文错误 `地点不存在`。
- 当前 MVP 详情数据结构与地点列表项一致，后续可在不破坏列表接口的前提下扩展营业时间、电话、图片、点评摘要等字段。

### GET `/places/favorites`

读取当前用户已收藏的地点 ID 列表。测试后端会按登录用户持久化。

Response:

```json
["place-park-1"]
```

### PATCH `/places/{placeId}/favorite`

收藏或取消收藏地点。

Request:

```json
{ "favorite": true }
```

说明：
- `favorite=true` 表示收藏，`favorite=false` 表示取消收藏。
- 如果地点不存在，返回中文错误。
- 返回最新收藏地点 ID 列表。

### POST `/places/{placeId}/reviews`

提交点评。测试后端会按用户持久化当前地点最新一条点评，MVP 返回审核中状态。

副作用：
- 成功后会为当前用户生成一条“地点点评待审核”通知，可通过 `GET /notifications` 读回。

Request:

```json
{ "content": "草坪很大，有饮水点，牵引绳友好。" }
```

Response data:

```json
{
  "id": "review-001",
  "placeId": "place-001",
  "content": "草坪很大，有饮水点，牵引绳友好。",
  "status": "pending_review",
  "createdAt": "刚刚"
}
```

### GET `/places/reviews/my`

读取当前用户提交过的地点点评列表。App 会用它在地点详情中回显自己的审核中点评。

### POST `/places/submissions`

提交新的宠物友好地点和体验内容。MVP 测试后端只进入审核中，不会立刻加入附近地点列表。

副作用：
- 成功后会为当前用户生成一条“地点提交待审核”通知，可通过 `GET /notifications` 读回。

Request:

```json
{
  "name": "阳光宠物公园",
  "address": "滨江路 188 号",
  "content": "草坪很大，有饮水点，牵引绳友好。"
}
```

Response data:

```json
{
  "id": "place-submission-001",
  "name": "阳光宠物公园",
  "address": "滨江路 188 号",
  "content": "草坪很大，有饮水点，牵引绳友好。",
  "status": "pending_review",
  "createdAt": "刚刚"
}
```

### GET `/places/submissions/my`

读取当前用户提交过的新增地点审核记录。当前 App 只在提交后展示审核中状态，后续若补“我的提交”页面可复用此接口。

Response data:

```ts
PlaceSubmission[]
```

说明：
- MVP 测试后端、HTTP API 门面和 mock API 均已支持。
- 这不是新页面要求；“我的提交”列表若要正式展示，仍需要先补 Figma Make 设计。

## 9. 设置、安全与反馈

### POST `/feedback`

提交普通产品反馈或问题反馈。MVP 测试后端要求登录，保存为 `received` 状态；当前 App 暂不暴露正式反馈表单，后续设置/安全中心补设计后可接入。

Request:

```json
{
  "category": "suggestion",
  "content": "希望补充猫咪体重模板",
  "contact": "可选联系方式"
}
```

Response data:

```ts
type FeedbackSubmission = {
  category: 'bug' | 'other' | 'safety' | 'suggestion';
  contact?: string;
  content: string;
  createdAt: string;
  id: string;
  ownerName?: string;
  status: 'closed' | 'received' | 'reviewing';
};
```

说明：
- `category` 支持 `bug`、`suggestion`、`safety`、`other`；未知值会落到 `other`。
- `content` 不能为空，最多 1000 个字。
- 服务端会保存账号归属，返回给 App 的结果不包含手机号。
- 这不是举报/拉黑流程；举报和拉黑按此前优先级暂缓。

## 10. 合规静态文本

### GET `/legal/terms`

读取用户协议占位版。MVP 测试后端和 mock API 均不要求登录即可访问。

Response data:

```ts
type LegalDocument = {
  disclaimer: string;
  effectiveDate: string;
  key: 'terms';
  sections: Array<{ title: string; body: string[] }>;
  title: string;
  version: string;
};
```

说明：
- 当前内容是 MVP 占位版，仅用于产品联调与体验测试。
- 正式上线前必须替换为法务或合规顾问确认后的正式文本。

### GET `/legal/privacy`

读取隐私政策占位版。MVP 测试后端和 mock API 均不要求登录即可访问。

Response data:

```ts
LegalDocument
```

说明：
- 当前内容是 MVP 占位版，会覆盖登录、宠物照片、AI 处理、附近发现、推送通知等核心场景。
- 正式上线前仍需要补个人信息收集清单、第三方 SDK 清单、注销规则、未成年人保护说明和正式隐私政策。

## 11. P0 待后端确认

- 统一错误码表：短信、登录、上传、AI、地图、社交、健康、权限。
- 鉴权 token 刷新机制和 401 处理。
- ~~短信频控规则：单手机号、单 IP、单设备、每日上限。~~ 当前测试后端已做 60s 频控；生产仍需补 IP/设备/每日上限。
- 上传文件限制：图片大小、格式、视频时长、EXIF 清理。
- ~~地图供应商：已确认 MVP 首发优先高德地图。~~ Android 高德 Key 与 SDK 已接入；仍需确认 POI 数据来源、自有地点库边界、iOS Key/SDK 和外部导航规则。
- AI 形象生成任务的完整状态：排队、分析、生成、成功、失败、过期。
- AI 对话内容安全和医疗建议边界。
