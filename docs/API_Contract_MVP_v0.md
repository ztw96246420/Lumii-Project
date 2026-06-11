# Lumii MVP API 契约草案 v0

日期：2026-05-30

维护更新：2026-06-10

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

保存当前账号设置。`nearbyVisible=false` 后，其他用户的附近发现列表不会再出现该账号。

Request:

```json
{ "nearbyVisible": false }
```

## 4. 宠物档案

### GET `/pets`

返回当前用户的宠物列表。

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
  "mediaId": "media-001",
  "previewUrl": "https://...",
  "quality": "good"
}
```

### POST `/ai/pet-avatar/jobs`

Request:

```json
{ "mediaId": "media-001" }
```

Response data:

```ts
type AvatarJob = {
  id: string;
  status: 'processing' | 'ready' | 'failed';
  progress: number;
  resultUrl?: string;
};
```

### GET `/ai/pet-avatar/jobs/{jobId}`

轮询 AI 生成任务状态。

## 6. 健康管理

### GET `/health/weights`

当前登录用户的当前宠物体重记录列表。测试后端会按 `phone + activePetId` 持久化；未添加宠物时返回空数组。

### POST `/health/weights`

Request:

```json
{ "kg": 28.6, "note": "MVP 本地记录" }
```

行为：
- 新记录插入列表首位。
- 同步更新当前宠物 `weightKg`。
- `kg <= 0` 或非数字时返回中文错误。

### GET `/health/vaccines`

当前宠物疫苗/驱虫计划。测试后端会按 `phone + activePetId` 持久化，默认根据猫/狗生成基础计划。

### PATCH `/health/vaccines/{vaccineId}`

Request:

```json
{ "status": "done" }
```

`status` 可为 `due`、`done`、`overdue`。

当疫苗计划被标记为 `done` 后，测试后端会自动移除该计划的提醒开关。

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

### GET `/notifications`

读取通知中心列表。当前测试后端会在读取前检查已开启的健康提醒，临近或逾期的疫苗计划会生成去重后的“健康提醒”通知。

说明：
- 地点点评提交、用户新增地点提交也会写入通知中心，App 成功提交后会重新拉取该列表，不再只依赖前端临时通知。

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
- 未配置 `DEEPSEEK_API_KEY` 时使用本地 fallback 回复。
- 配置 DeepSeek 后，后端会注入用户不可见的 Lumii 宠物陪伴提示词、宠物档案、健康摘要和最近少量历史。
- 默认限制单条用户输入长度，避免异常消耗 token。
- 默认返回非流式完整回复，后续可升级流式输出。

## 8. 地点

### GET `/places/nearby`

附近宠物友好地点。

### GET `/places/search?q=公园`

搜索地点。

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

## 9. P0 待后端确认

- 统一错误码表：短信、登录、上传、AI、地图、社交、健康、权限。
- 鉴权 token 刷新机制和 401 处理。
- ~~短信频控规则：单手机号、单 IP、单设备、每日上限。~~ 当前测试后端已做 60s 频控；生产仍需补 IP/设备/每日上限。
- 上传文件限制：图片大小、格式、视频时长、EXIF 清理。
- ~~地图供应商：已确认 MVP 首发优先高德地图。~~ Android 高德 Key 与 SDK 已接入；仍需确认 POI 数据来源、自有地点库边界、iOS Key/SDK 和外部导航规则。
- AI 形象生成任务的完整状态：排队、分析、生成、成功、失败、过期。
- AI 对话内容安全和医疗建议边界。
