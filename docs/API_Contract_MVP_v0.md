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
  | { state: 'error'; error: { code: string; message: string; retryable: boolean }; data?: unknown };
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

MVP 错误码表：

| code | 含义 |
| --- | --- |
| `AUTH_REQUIRED` | 未登录或缺少 token |
| `AUTH_TOKEN_EXPIRED` | 登录已失效，需要重新登录 |
| `SMS_PHONE_INVALID` | 手机号格式不正确 |
| `SMS_RATE_LIMITED` | 短信 60s 冷却或短时间过频 |
| `SMS_DAILY_LIMITED` | 手机号、设备或 IP 当日短信额度已达上限 |
| `SMS_CODE_INVALID` | 验证码错误 |
| `SMS_CODE_ATTEMPT_LIMITED` | 同一张验证码票据输错次数过多，需要重新获取 |
| `SMS_CODE_EXPIRED` | 验证码过期 |
| `SMS_CODE_USED` | 验证码已使用 |
| `VALIDATION_FAILED` | 普通入参校验失败 |
| `CONTENT_POLICY_VIOLATION` | 文本命中基础内容安全拦截 |
| `RESOURCE_NOT_FOUND` | 资源不存在或无权读取 |
| `DUPLICATE_RESOURCE` | 重复提交或资源冲突 |
| `FORBIDDEN` | 当前关系或权限不允许操作 |
| `RATE_LIMITED` | 通用频控 |
| `PET_CHAT_DAILY_LIMIT` | 灵伴对话当日额度已达上限 |
| `PET_AVATAR_DAILY_LIMIT` | 灵伴形象生成当日额度已达上限 |
| `SERVER_ERROR` | 服务端异常 |
| `ROUTE_NOT_FOUND` | 接口不存在 |

2026-06-12 补充：MVP 测试后端 `state=error` 响应会统一返回 `error.code`；App HTTP 适配器和 mock API 均会保留该字段。现有页面仍优先展示 `error.message`，不需要新增 Figma 页面。

## 3. 鉴权

### POST `/auth/sms/send`

发送手机号验证码。

Request:

```json
{
  "phone": "13531850966",
  "deviceId": "lumii-android-optional-installation-id"
}
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
- `deviceId` 为 App 自动生成的安装级风控标识，旧客户端不传也能发码；它不是硬件 ID，清除 App 数据后会重置。
- 2026-06-12 补充：MVP 测试后端已支持单手机号 60s 冷却、单手机号每日上限、单设备每日上限和单 IP 每日上限；默认 `SMS_DAILY_LIMIT=50`、`SMS_DEVICE_DAILY_LIMIT=80`、`SMS_IP_DAILY_LIMIT=150`，触发上限时返回中文错误，前端复用现有 toast，不需要新增页面。

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
      "ownerAvatarUrl": "",
      "ownerBio": "",
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
    "token": "lumii-v1.<payload>.<signature>"
  }
}
```

说明：
- 验证码校验成功后，MVP 测试后端和 mock API 会消费当前手机号的验证码票据，避免同一张票据被重复使用或后续变成过期残留；测试后端会保留本次发送产生的 60s 冷却时间，防止登录成功后立刻重复发码。
- 同一张验证码票据默认最多允许输错 5 次，可通过 `SMS_VERIFY_MAX_ATTEMPTS` 调整；达到上限后返回 `SMS_CODE_ATTEMPT_LIMITED`，该票据失效，用户需要等待当前发码冷却结束后重新获取验证码。前端复用现有验证码错误 toast/重新获取倒计时，不需要新增页面。
- 为了测试便利，固定测试码 `962464` 在没有待验证票据时仍可作为快速登录码；生产短信服务需要改成真实随机码和一次性校验。

### POST `/auth/logout`

退出登录。前端成功后清空本地 token。MVP 测试后端会撤销当前请求携带的 `lumii-v1` 签名 token，退出后继续用该 token 调用 `/me` 或 `/auth/token/refresh` 会返回 401。旧 `lumii-local-手机号` 仅作历史兼容，无法精确撤销。

### POST `/auth/token/refresh`

本地已有 session 时刷新登录态和账号快照。App 启动时会先用本地 token 调用该接口，成功后更新本地 session；如果返回 401，则清空本地缓存并回到登录页。

Request:

```http
Authorization: Bearer lumii-v1.<payload>.<signature>
```

Token 说明：MVP 测试后端当前签发 `lumii-v1.<payload>.<signature>` 格式的 HMAC 登录态 token，默认有效期 30 天，可用 `AUTH_TOKEN_TTL_MS` 调整；签名密钥来自 `LUMII_TOKEN_SECRET` 或 `AUTH_TOKEN_SECRET`。`POST /auth/token/refresh` 会滚动返回新 token；`POST /auth/logout` 会把当前签名 token 加入服务端撤销列表。为了不影响已安装测试包，后端暂时兼容旧 `lumii-local-手机号` token；生产版本仍建议替换为正式 access token / refresh token 体系。

Response:

```json
{
  "data": {
    "account": {
      "activePet": null,
      "ownerAvatarUrl": "",
      "ownerBio": "",
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
    "token": "lumii-v1.<payload>.<signature>"
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
    "ownerAvatarUrl": "",
    "ownerBio": "一个会陪奶油晒太阳的人",
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
- `ownerName`：1 到 14 个字。
- `ownerBio`：可为空，最多 60 个字。
- `ownerAvatarUrl`：可为空，最多 2000 字符；MVP 先保存 App 传入的本地/URL 占位，正式对象存储上传后续替换。

Request:

```json
{
  "ownerName": "Serena",
  "ownerBio": "一个会陪奶油晒太阳的人",
  "ownerAvatarUrl": "file:///local/avatar.jpg"
}
```

Response：同 `GET /me`。

### GET `/permissions`

返回当前账号已保存的权限状态。

### PATCH `/permissions`

保存当前账号权限引导状态。

说明：
- `permissions` 当前只接受 `location`、`media`、`notifications` 三个字段。
- 持久化状态只接受 `unknown`、`denied`、`blocked`、`unavailable`、`granted`；前端本地瞬时态 `requesting` 不允许写入服务端。
- `completed` 如传入必须是布尔值。
- 传入未知权限项、非法状态或非法 `completed` 时返回 400，`error.code=PERMISSIONS_PATCH_INVALID`，不会静默吞掉错误字段。

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
- 当前只接受 `fuzzyLocation`、`interactionMessages`、`nearbyVisible`、`pushNotifications` 四个布尔字段。
- 传入未知字段或非布尔值时返回 400，`error.code=SETTINGS_PATCH_INVALID`，不会静默吞掉错误字段。
- `nearbyVisible=false` 后，其他用户的附近发现列表不会再出现该账号；测试后端会清空该账号已保存的位置和在线曝光时间。
- `fuzzyLocation=true` 后，测试后端只持久化约 1km 粒度的位置；从 `false` 切回 `true` 时，会立即把已保存的精确位置粗化。
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

MVP 兜底校验：
- `POST /pets` 必填 `name`、`species`，`breed` 为空时保存为“待完善”，`gender` 为空时保存为 `unknown`。
- `PATCH /pets/{petId}` 当前只允许更新 `name`、`species`、`breed`、`gender`、`birthday`、`weightKg`、`avatarUrl`。
- `name` 最多 12 个字；`breed` 最多 20 个字。
- `species` 当前只接受 `dog`、`cat`。
- `gender` 只接受 `male`、`female`、`unknown`。
- `birthday` 如填写必须是合法 `YYYY-MM-DD` 日期；传空字符串会清空生日。
- `weightKg` 如填写必须是 `0-200kg` 之间的数字；传空字符串或 `null` 会清空体重。
- 未支持字段、非法物种、非法生日、非法体重等返回 400，`error.code=PET_PROFILE_INVALID`，不会静默改成默认值或污染宠物档案。

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

MVP 测试后端当前已做基础文件校验：

- 支持图片：`jpg/jpeg`、`png`、`webp`、`heic/heif`。
- 默认大小限制：base64 字符串不超过 `MEDIA_UPLOAD_MAX_BASE64_CHARS=12000000`，解码后文件不超过 `MEDIA_UPLOAD_MAX_BYTES=9000000`。
- 后端会校验 base64 合法性和图片文件头，不只相信前端传入的 `mimeType`。
- 基础拦截会仍返回 `UploadedPetMedia`，但 `analysis.canGenerate=false`，`quality=blocked`，`analysis.code` 可能是 `missing_file`、`invalid_file`、`unsupported_format`、`file_too_large`。App 复用现有上传失败/识别结果链路，不新增页面。
- 视频、对象存储直传、EXIF 清理、自动压缩、真实人脸/多宠/无宠物视觉识别模型仍属生产增强或后续专项。

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
{ "kg": 28.6, "note": "MVP 本地记录", "recordedAt": "2026-06-16" }
```

行为：
- 新记录插入列表首位。
- 同步更新当前宠物 `weightKg`。
- 当前只接受 `kg`、`note`、`recordedAt` 三个字段；未知字段返回 400。
- `kg` 必须是 `0-200kg` 之间的数字，会保留到 2 位小数。
- `note` 可选，最多 120 个字。
- `recordedAt` 可选，默认当天；传入时必须是真实存在的 `YYYY-MM-DD` 日期。
- 体重、日期或字段不合法时返回 400，`error.code=HEALTH_WEIGHT_INVALID`。

### PATCH `/health/weights/{weightId}`

编辑当前宠物的某条体重记录。MVP 测试后端会按当前宠物的体重列表查找；如果编辑的是列表首位记录，会同步影响当前宠物 `weightKg`。

Request:

```json
{ "kg": 28.9, "note": "洗澡后复称", "recordedAt": "2026-06-12" }
```

说明：
- 当前只允许更新 `kg`、`note`、`recordedAt`。
- `kg` 可选，但传入时必须为 `0-200kg` 之间的数字，会保留到 2 位小数。
- `note` 可选，可传空字符串清空备注，最多 120 个字。
- `recordedAt` 可选，传入时必须是真实存在的 `YYYY-MM-DD` 日期。
- 体重、日期或字段不合法时返回 400，`error.code=HEALTH_WEIGHT_INVALID`。
- 不存在的记录返回 404 中文错误。

### DELETE `/health/weights/{weightId}`

删除当前宠物的某条体重记录。MVP 测试后端会返回删除后的体重记录列表，并用删除后的首条记录回填当前宠物 `weightKg`；如果没有剩余记录，则清空当前宠物体重。

Response data:

```ts
WeightRecord[]
```

说明：
- App 已暴露体重记录删除入口，删除前必须经过二次确认弹窗。
- 删除后 `GET /health/weights/trend` 和 `GET /health/calendar` 会基于最新列表重新计算/聚合。

### GET `/health/vaccines`

当前宠物疫苗/驱虫计划。测试后端会按 `phone + activePetId` 持久化，默认根据猫/狗生成基础计划。

### POST `/health/vaccines`

在当前宠物下新增一条疫苗/驱虫计划。App 现有疫苗计划页内联新增表单会调用该接口，保存成功后刷新健康摘要、健康日历和计划列表。

Request:

```json
{ "name": "狂犬疫苗", "dueAt": "2026-06-30" }
```

说明：
- `name` 必填，最多 24 个字。
- `dueAt` 必须是合法 `YYYY-MM-DD` 日期。
- 测试后端会根据 `dueAt` 自动设置 `status`：过去日期为 `overdue`，今天或未来为 `due`。
- 请求只接受 `name`、`dueAt` 两个字段；未知字段返回 `HEALTH_VACCINE_INVALID`。

### PATCH `/health/vaccines/{vaccineId}`

Request:

```json
{ "status": "done" }
```

`status` 可为 `due`、`done`、`overdue`。

说明：
- 只接受 `status` 字段，未知字段或非法状态会返回 `HEALTH_VACCINE_INVALID`。
- `vaccineId` 不存在时返回 404，不会新建计划。

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
- 只接受 `enabled` 布尔字段，未知字段或非布尔值会返回 `HEALTH_REMINDER_INVALID`。
- 已完成的疫苗计划不能重新开启提醒。
- 开启提醒后，如计划已临近或逾期，`GET /notifications` 会生成一条去重后的健康提醒通知；关闭提醒或标记计划完成后，测试后端和 mock API 会清理对应的旧健康提醒通知，避免通知中心继续展示过期提醒。
- App 真机侧会在系统通知权限和 App 通知开关均开启时，为已开启的疫苗/驱虫计划安排本地系统通知；标记完成、关闭通知或退出账号会取消对应本地提醒。

### GET `/health/memos`

当前宠物健康备忘列表。测试后端会按 `phone + activePetId` 持久化。

### POST `/health/memos`

Request:

```json
{
  "title": "驱虫记录",
  "content": "体外驱虫已完成。",
  "reminderAt": "2026-09-16 09:00",
  "reminderEnabled": true,
  "repeat": "quarterly"
}
```

说明：
- 当前接受 `title`、`content`、`reminderAt`、`reminderEnabled`、`repeat`。
- `title` 和 `content` 不能为空。
- `title` 最多 30 个字，`content` 最多 500 个字。
- `repeat` 可选值为 `none`、`monthly`、`quarterly`、`yearly`；未传时按 `none` 处理。
- `reminderEnabled=true` 时必须传合法 `reminderAt`，格式为 `YYYY-MM-DD HH:mm`；`reminderEnabled=false` 时后端不保存 `reminderAt`。
- 字段、标题、内容、提醒时间或重复频率不合法时返回 400，`error.code=HEALTH_MEMO_INVALID`。

### PATCH `/health/memos/{memoId}`

编辑健康备忘。MVP 测试后端会按当前宠物的备忘列表查找。

Request:

```json
{
  "title": "洗澡记录",
  "content": "耳朵干净，皮肤没有明显泛红。",
  "reminderAt": "2026-07-16 09:00",
  "reminderEnabled": true,
  "repeat": "monthly"
}
```

说明：
- 当前允许更新 `title`、`content`、`reminderAt`、`reminderEnabled`、`repeat`。
- `title` 和 `content` 不能为空。
- `title` 最多 30 个字，`content` 最多 500 个字。
- 未传入的字段会沿用原值。
- `repeat` 可选值为 `none`、`monthly`、`quarterly`、`yearly`。
- `reminderEnabled=true` 时必须传合法 `reminderAt`，格式为 `YYYY-MM-DD HH:mm`；`reminderEnabled=false` 时后端不保存 `reminderAt`。
- 字段、标题、内容、提醒时间或重复频率不合法时返回 400，`error.code=HEALTH_MEMO_INVALID`。
- App 已暴露健康备忘编辑入口；编辑页支持同步更新标题、内容、提醒时间、提醒开关和重复频率。

### DELETE `/health/memos/{memoId}`

删除健康备忘。MVP 测试后端会返回删除后的当前宠物备忘列表。

Response data:

```ts
HealthMemo[]
```

说明：
- App 已暴露健康备忘删除入口，删除前必须经过二次确认弹窗。

## 7. 社交与消息

### GET `/social/discover`

附近宠物主人列表。

Query:

```txt
lat=23.1291&lng=113.2644&radiusKm=3&accuracy=30
```

说明：
- 当前测试后端会在 `nearbyVisible=true` 时保存用户最近一次位置和 `lastSeenAt`。
- `fuzzyLocation=true` 时保存粗粒度位置，`fuzzyLocation=false` 时保存本次请求的精确位置。
- 如果当前账号已关闭 `nearbyVisible`，仍可用本次请求的临时定位查询附近伙伴，但后端不会持久化该定位，也不会刷新在线曝光时间。
- 发现范围默认 3km。
- 距离返回模糊文案，例如 `500m 内`、`1km 内`、`约 1-2km`。
- 超过在线时间窗口或超出距离范围不会返回。
- 返回卡片的 `id` 形如 `user-{phone}`，当前作为 `POST /social/greetings`、`POST /social/walk-invites` 和招呼请求处理接口的 `ownerId` 入参。

### POST `/social/greetings`

Request:

```json
{ "ownerId": "user-13500000002" }
```

MVP 产品约束：
- 打招呼暂不限制次数。
- 前端保留配置口，后续可加每日次数、单用户频次、风控灰度。
- 附近距离建议后端返回模糊文案，例如 `1km 内`、`约 1-2km`，不要直接暴露精确定位。

当前测试后端策略：
- ~~发送招呼时直接给双方创建会话。~~ 当前已改为只创建待处理招呼请求；接收方接受后才创建双方会话。
- 如果 `ownerId` 不存在、指向自己，或对方已关闭附近可见，返回 404 中文错误，不创建招呼、会话、消息或通知，前端应提示刷新附近列表后重试。

### GET `/social/greeting-requests`

获取当前用户收到的待处理招呼请求。

说明：
- 返回结构复用附近宠物主人卡片，卡片 `id` 同样作为 `{ownerId}` 传入接受/婉拒接口。

### POST `/social/greeting-requests/{ownerId}/accept`

接受招呼请求，创建双方会话。

### POST `/social/greeting-requests/{ownerId}/reject`

婉拒招呼请求。

### POST `/social/walk-invites`

Request:

```json
{ "ownerId": "user-13500000002" }
```

说明：
- 如果 `ownerId` 不存在、指向自己，或对方已关闭附近可见，返回 404 中文错误，不创建约遛邀请、会话、消息或通知。

### GET `/conversations`

会话列表。

说明：
- 会话项会返回 `canSendMessage` 和 `relationshipStatus`。
- `canSendMessage=false` 时，前端应禁用输入框并提示“等待对方接受招呼”。
- 当前测试后端只有双方存在已接受招呼关系时才允许普通聊天；结构化约遛邀请可以进入消息列表，但不会自动解锁自由聊天。

### GET `/conversations/{conversationId}/messages`

会话消息列表。

### POST `/conversations/{conversationId}/messages`

发送人和人的聊天消息。

Request:

```json
{ "text": "你好，我们今晚也在附近" }
```

说明：
- 未互相接受招呼前，返回 403 中文错误 `对方接受招呼后才能聊天`，不写入双方消息。
- 不存在或伪造的会话 ID 返回 404 中文错误 `会话不存在，请返回消息列表刷新`。
- 基础内容安全：聊天内容最多 600 字，不能包含手机号、邮箱、外部链接、微信/QQ 等外部联系方式，或明显违法/灰产词；命中时返回中文 `400` 错误，App 现有发送失败 toast 会展示错误，不写入双方消息、不产生通知。
- 约遛邀请里的地点、时间、备注也会走同类基础拦截；这不是生产级内容审核服务，后续富提示/申诉/人工审核仍需单独设计。

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
- `token` 不能为空，长度需在 8-4096 字符内，不能包含换行或制表符。
- `platform` 只支持 `android`、`ios`、`web`，不再静默兜底；非法平台返回 `PUSH_DEVICE_INVALID`。
- `deviceId` 可选，传入时最多 128 字符，不能包含换行或制表符。
- 请求只接受 `token`、`platform`、`deviceId` 三个字段；未知字段返回 `PUSH_DEVICE_INVALID`。
- 传入 `deviceId` 时按 `deviceId` 去重更新；未传 `deviceId` 时按 token 去重。
- 该接口不等于生产推送服务上线；生产仍需确认厂商通道、通知模板、送达回执和退订策略。

### GET `/notifications`

读取通知中心列表。当前测试后端会在读取前检查已开启的健康提醒，临近或逾期的疫苗计划会生成去重后的“健康提醒”通知；已经关闭提醒或已标记完成的计划会清理旧健康提醒通知。

说明：
- 地点点评提交、用户新增地点提交也会写入通知中心，App 成功提交后会重新拉取该列表，不再只依赖前端临时通知。
- 通知项会返回 `category` 与 `createdAt`，App 以这两个字段驱动筛选、分组和时间显示；旧通知缺字段时，测试后端会在读取时补齐。
- `category` 当前取值为 `health`、`interaction`、`walk`、`system`。普通聊天和招呼归入 `interaction`，约遛邀请归入 `walk`；互动和约遛通知是否生成受 `pushNotifications` 与 `interactionMessages` 控制。

### POST `/notifications/read`

标记通知已读。

Request:

```json
{ "ids": ["notification-id-001"] }
```

说明：
- `ids` 为空或不传时，标记当前用户全部通知已读。
- 返回最新通知列表。
- App 不再进入通知中心时自动标记已读；当前交互由通知中心「全部已读」按钮主动触发。

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
- 命中高风险医疗关键词时，后端会在调用模型前返回固定安全回复，提示尽快联系宠物医院或兽医；该路径不触发 DeepSeek 请求，并会自动写入一条“紧急健康观察/误食风险观察”健康备忘，生成通知中心“就医提醒”，回复携带 `medicalAlert` 和 `createdMemo`。同一内容会去重，不重复创建备忘或通知。
- 当用户明确表达“记一下 / 记录一下 / 记到健康备忘 / 加到健康备忘”等意图时，后端会把本条内容写入当前宠物健康备忘，并在 AI 回复里附带 `createdMemo`；重复同一内容会命中去重，不重复创建备忘。
- 当用户在对话里明确记录体重，如“帮我记录体重 29.5kg / 今天称重 59斤”，后端会写入当前宠物体重记录并在 AI 回复里附带 `createdWeight`；同一天同体重同备注会命中去重，不重复创建体重记录。
- 当用户在对话里明确处理疫苗/驱虫计划，如“狂犬疫苗已打 / 开启体内驱虫提醒 / 关闭体内驱虫提醒”，后端会更新当前宠物匹配到的疫苗/驱虫计划，并在 AI 回复里附带 `updatedVaccine` 和最新 `vaccineReminderIds`。
- 当用户在对话里明确更新宠物档案，如“它叫奶油 / 生日是 2022年5月1日 / 品种是金毛寻回犬 / 性别是妹妹 / 性格是亲人、爱互动”，后端会更新当前宠物档案，并在 AI 回复里附带 `updatedPet`；App 会同步首页、我的页和宠物资料快照。该能力只处理明确资料字段，不把普通聊天误写入档案。
- 未配置 `DEEPSEEK_API_KEY` 时使用本地 fallback 回复。
- 配置 DeepSeek 后，后端会注入用户不可见的 Lumii 宠物陪伴提示词、宠物档案、健康摘要和最近少量历史。
- 当历史对话超过最近窗口时，服务端会把更早的宠物对话压缩成确定性中文摘要注入系统提示，只把最近窗口完整传给 DeepSeek，避免长对话持续放大 token。
- DeepSeek 返回后，服务端会做一层医疗安全后置过滤：如果模型回复包含确定诊断、具体药物/剂量/处方、自行催吐/注射/用药，或淡化急症就医，会替换为固定安全回复；普通“不要自行用药/请联系兽医”类安全提醒不会被误拦。
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
- 后续对话会把当前宠物下的“像它/不像它”反馈做轻量聚合，作为用户不可见上下文注入 DeepSeek 提示词，用于微调语气、节奏和关注点；该聚合不额外调用模型。

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
- App 进入上传/识别/形象确认页会读取该接口，用真实 `daily.petAvatar.count/limit/remaining` 展示“今日形象生成”额度；点击“确认并生成灵伴”或“重新生成”前会先检查剩余额度，后端仍作为最终额度拦截来源。

## 8. 地点

```ts
type Place = {
  address: string;
  category: 'cafe' | 'clinic' | 'other' | 'park';
  distance: string;
  id: string;
  name: string;
  rating: number;
  reviewCount?: number;
  supportedSpecies?: Array<'cat' | 'dog'>;
  tags: string[];
};
```

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
- `reviewCount` 用于 App 地图页“点评最多”排序；生产后端能返回真实公开点评数时应返回该字段，旧数据缺字段时 App 会按 0 处理。
- `supportedSpecies` 用于 App 地图页“汪星友好 / 喵星友好”筛选；生产后端能判断时建议返回该字段，旧数据缺字段时 App 仅会按标签和地点类别做保守推断。
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

基础内容安全：
- 点评内容最多 500 字。
- 点评内容不能包含手机号、邮箱、外部链接、微信/QQ 等外部联系方式，或明显违法/灰产词；命中时返回中文 `400` 错误，App 现有提交失败 toast 会展示错误。
- 该规则只是 MVP 公开内容基础拦截，不等同于生产级内容审核服务。

Request:

```json
{ "content": "草坪很大，有饮水点，牵引绳友好。\n附照片 2 张（本次提交预览）" }
```

MVP 说明：当前 App 端的地点点评/新增地点表单已支持本地照片选择和预览；在生产级媒体上传接口补齐前，提交内容会先携带照片数量摘要。后续替换为 `mediaIds` / 图片审核结果时，应保留现有文本字段兼容。

Response data:

```json
{
  "id": "review-001",
  "placeId": "place-001",
  "content": "草坪很大，有饮水点，牵引绳友好。\n附照片 2 张（本次提交预览）",
  "status": "pending_review",
  "createdAt": "2026-06-16T09:30:00.000+08:00"
}
```

### GET `/places/reviews/my`

读取当前用户提交过的地点点评列表。App 会用它在地点详情中回显自己的审核中点评。

### POST `/places/submissions`

提交新的宠物友好地点和体验内容。MVP 测试后端只进入审核中，不会立刻加入附近地点列表。

副作用：
- 成功后会为当前用户生成一条“地点提交待审核”通知，可通过 `GET /notifications` 读回。

重复校验：
- 如果名称和地址都与已存在地点高度相似，返回 `409`，中文错误提示用户先查看已有地点或修改名称/地址。
- 如果名称和地址都与当前审核中的地点提交高度相似，返回 `409`；当前用户重复提交时提示“这个地点已经提交过，正在审核中”。
- MVP 只做保守的服务端基础拦截；“疑似地点卡片 / 查看已有地点 / 仍然提交”等富交互仍需 Figma 状态设计。

基础内容安全：
- 地点名称最多 60 字，地点地址最多 120 字，宠物友好体验最多 500 字。
- 名称、地址和体验不能包含手机号、邮箱、外部链接、微信/QQ 等外部联系方式，或明显违法/灰产词；命中时返回中文 `400` 错误。
- 普通门牌号、楼层号等地址数字不会按联系方式处理。

Request:

```json
{
  "name": "阳光宠物公园",
  "address": "滨江路 188 号",
  "content": "草坪很大，有饮水点，牵引绳友好。\n附照片 2 张（本次提交预览）"
}
```

MVP 说明：当前 App 端的新增地点表单已支持本地照片选择和预览；在生产级媒体上传接口补齐前，提交内容会先携带照片数量摘要。后续替换为 `mediaIds` / 图片审核结果时，应保留现有文本字段兼容。

Response data:

```json
{
  "id": "place-submission-001",
  "name": "阳光宠物公园",
  "address": "滨江路 188 号",
  "content": "草坪很大，有饮水点，牵引绳友好。\n附照片 2 张（本次提交预览）",
  "status": "pending_review",
  "createdAt": "2026-06-16T09:30:00.000+08:00"
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

读取用户协议测试版静态文本。MVP 测试后端和 mock API 均不要求登录即可访问。

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
- 当前内容是测试版协议文本，用于说明现阶段核心功能与数据处理方式。
- 正式上线前必须替换为法务或合规顾问确认后的完整文本。

### GET `/legal/privacy`

读取隐私政策测试版静态文本。MVP 测试后端和 mock API 均不要求登录即可访问。

Response data:

```ts
LegalDocument
```

说明：
- 当前内容是测试版隐私政策文本，会覆盖登录、宠物照片、AI 处理、附近发现、推送通知等核心场景。
- 正式上线前仍需要补个人信息收集清单、第三方 SDK 清单、注销规则、未成年人保护说明和正式隐私政策。

## 11. P0 待后端确认

- ~~统一错误码表：短信、登录、上传、AI、地图、社交、健康、权限。~~ MVP 测试后端已统一 `error.code`；生产仍可继续细化埋点级错误码和后台统计。
- ~~鉴权 token 刷新机制和 401 处理。~~ MVP 测试后端已支持签名登录态 token、`POST /auth/token/refresh`、`POST /auth/logout` 当前 token 撤销和 401 回登录处理；生产 access/refresh token、多端设备管理和安全审计仍待正式后端方案确认。
- ~~短信频控规则：单手机号、单 IP、单设备、每日上限。~~ 当前测试后端已做单手机号 60s 冷却、单手机号每日上限、单设备每日上限、单 IP 每日上限和验证码输错次数限制；生产仍需补真实随机验证码、短信服务商回执、黑名单/WAF/验证码风控平台等更完整策略。
- ~~上传图片基础限制：图片大小、格式、base64 合法性、图片文件头校验。~~ MVP 测试后端已支持 jpg/png/webp/heic/heif、默认 9MB 解码文件上限和损坏文件拦截；视频时长、对象存储直传、自动压缩、EXIF 清理和真实视觉识别模型仍待生产方案确认。
- ~~地图供应商：已确认 MVP 首发优先高德地图。~~ Android 高德 Key 与 SDK 已接入；仍需确认 POI 数据来源、自有地点库边界、iOS Key/SDK 和外部导航规则。
- AI 形象生成任务的完整状态：排队、分析、生成、成功、失败、过期。
- AI 对话内容安全和医疗建议边界。
