const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { URL } = require('url');

const TEST_CODE = '962464';
const SMS_COOLDOWN_MS = Number(process.env.SMS_COOLDOWN_MS || 60 * 1000);
const SMS_TTL_MS = Number(process.env.SMS_TTL_MS || 5 * 60 * 1000);
const SMS_DAILY_LIMIT = Number(process.env.SMS_DAILY_LIMIT || '50');
const SMS_DEVICE_DAILY_LIMIT = Number(process.env.SMS_DEVICE_DAILY_LIMIT || '80');
const SMS_IP_DAILY_LIMIT = Number(process.env.SMS_IP_DAILY_LIMIT || '150');
const SMS_VERIFY_MAX_ATTEMPTS = Math.max(1, Number(process.env.SMS_VERIFY_MAX_ATTEMPTS || '5') || 5);
const AUTH_TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS || 30 * 24 * 60 * 60 * 1000);
const AUTH_TOKEN_SECRET = process.env.LUMII_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET || 'lumii-mvp-dev-token-secret';
const ONLINE_TTL_MS = 30 * 60 * 1000;
const NEARBY_LOCATION_MAX_AGE_MS = Number(process.env.NEARBY_LOCATION_MAX_AGE_MS || String(10 * 60 * 1000));
const DEFAULT_DISCOVER_RADIUS_KM = 3;
const FUZZY_LOCATION_GRID_DEGREES = 0.01;
const FUZZY_LOCATION_MIN_ACCURACY_METERS = 1000;
const MAX_ACCURACY_BUFFER_KM = 2;
const AMAP_WEB_SERVICE_KEY = process.env.AMAP_WEB_SERVICE_KEY || '';
const AMAP_WEB_SERVICE_BASE_URL = (process.env.AMAP_WEB_SERVICE_BASE_URL || 'https://restapi.amap.com').replace(/\/+$/, '');
const AMAP_POI_TIMEOUT_MS = Number(process.env.AMAP_POI_TIMEOUT_MS || '8000');
const AMAP_POI_CACHE_TTL_MS = Number(process.env.AMAP_POI_CACHE_TTL_MS || 10 * 60 * 1000);
const AMAP_POI_PAGE_SIZE = Math.min(25, Math.max(1, Number(process.env.AMAP_POI_PAGE_SIZE || '20') || 20));
const AMAP_POI_MAX_RESULTS = Math.min(80, Math.max(10, Number(process.env.AMAP_POI_MAX_RESULTS || '50') || 50));
const AMAP_POI_SHOW_FIELDS = process.env.AMAP_POI_SHOW_FIELDS || 'business,photos,navi';
const AMAP_PLACE_KEYWORD_GROUPS = [
  '宠物医院|动物医院|宠物诊所|宠物店|宠物美容|宠物寄养',
  '宠物友好|猫咖|狗咖|宠物咖啡|公园|绿地',
];
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_THINKING = process.env.DEEPSEEK_THINKING || 'disabled';
const PET_CHAT_HISTORY_LIMIT = Number(process.env.PET_CHAT_HISTORY_LIMIT || '10');
const PET_CHAT_SUMMARY_MAX_CHARS = Number(process.env.PET_CHAT_SUMMARY_MAX_CHARS || '1000');
const PET_CHAT_MAX_TOKENS = Number(process.env.PET_CHAT_MAX_TOKENS || '420');
const PET_CHAT_MAX_INPUT_CHARS = Number(process.env.PET_CHAT_MAX_INPUT_CHARS || '600');
const PET_CHAT_DAILY_LIMIT = Number(process.env.PET_CHAT_DAILY_LIMIT || '80');
const SOCIAL_MESSAGE_MAX_CHARS = Number(process.env.SOCIAL_MESSAGE_MAX_CHARS || '600');
const TTAPI_API_KEY = process.env.TTAPI_API_KEY || '';
const TTAPI_MJ_BASE_URL = (process.env.TTAPI_MJ_BASE_URL || 'https://api.ttapi.io').replace(/\/+$/, '');
const TTAPI_MJ_MODE = process.env.TTAPI_MJ_MODE || 'fast';
const TTAPI_MJ_TIMEOUT = Number(process.env.TTAPI_MJ_TIMEOUT || '600');
const TTAPI_MJ_AUTO_UPSAMPLE = process.env.TTAPI_MJ_AUTO_UPSAMPLE === 'true';
const TTAPI_FLUX_BASE_URL = (process.env.TTAPI_FLUX_BASE_URL || 'https://api.ttapi.io').replace(/\/+$/, '');
const TTAPI_FLUX_MODE = process.env.TTAPI_FLUX_MODE || 'flux-2-max';
const GPT_IMAGE2_API_KEY = process.env.GPT_IMAGE2_API_KEY || '';
const GPT_IMAGE2_BASE_URL = (process.env.GPT_IMAGE2_BASE_URL || 'https://api.apimart.ai').replace(/\/+$/, '');
const GPT_IMAGE2_MODEL = process.env.GPT_IMAGE2_MODEL || 'gpt-image-2';
const GPT_IMAGE2_SIZE = process.env.GPT_IMAGE2_SIZE || '1:1';
const GPT_IMAGE2_RESOLUTION = process.env.GPT_IMAGE2_RESOLUTION || '2k';
const GPT_IMAGE2_OFFICIAL_FALLBACK = process.env.GPT_IMAGE2_OFFICIAL_FALLBACK === 'true';
const GPT_IMAGE2_STUCK_TASK_MIN_TIMEOUT_MS = Number(process.env.GPT_IMAGE2_STUCK_TASK_MIN_TIMEOUT_MS || 5 * 60 * 1000);
const GPT_IMAGE2_STUCK_TASK_ESTIMATE_MULTIPLIER = Number(process.env.GPT_IMAGE2_STUCK_TASK_ESTIMATE_MULTIPLIER || '4');
const PET_AVATAR_PROVIDER = (process.env.PET_AVATAR_PROVIDER || (GPT_IMAGE2_API_KEY ? 'gpt-image-2' : TTAPI_API_KEY ? 'ttapi-flux-edits' : 'mock')).toLowerCase();
const PET_AVATAR_DAILY_LIMIT = Number(process.env.PET_AVATAR_DAILY_LIMIT || '10');
const PET_AVATAR_PUBLIC_BASE_URL = (process.env.PET_AVATAR_PUBLIC_BASE_URL || process.env.LUMII_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const MEDIA_UPLOAD_MAX_BASE64_CHARS = Number(process.env.MEDIA_UPLOAD_MAX_BASE64_CHARS || '12000000');
const MEDIA_UPLOAD_MAX_BYTES = Number(process.env.MEDIA_UPLOAD_MAX_BYTES || '9000000');
const COS_BUCKET = process.env.COS_BUCKET || '';
const COS_REGION = process.env.COS_REGION || 'ap-guangzhou';
const COS_SECRET_ID = process.env.COS_SECRET_ID || '';
const COS_SECRET_KEY = process.env.COS_SECRET_KEY || '';
const COS_PROXY_CACHE_SECONDS = Number(process.env.COS_PROXY_CACHE_SECONDS || '3600');

const argPortIndex = process.argv.findIndex((item) => item === '--port');
const port = Number(process.env.LUMII_BACKEND_PORT || (argPortIndex >= 0 ? process.argv[argPortIndex + 1] : '8787'));
const statePath = process.env.LUMII_BACKEND_STATE_PATH || path.join(__dirname, '..', 'dist', 'lumii-backend-state.json');

const seedOwners = [
  {
    distance: '附近 1km 内',
    id: 'seed-owner-naiyou',
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    ownerName: '林然',
    petName: '奶油',
    species: 'dog',
    tags: ['金毛', '想交朋友', '可约遛'],
  },
  {
    distance: '约 1-2km',
    id: 'seed-owner-milo',
    imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    ownerName: '小夏',
    petName: 'Milo',
    species: 'cat',
    tags: ['布偶猫', '只线上聊天'],
  },
];

const defaultPlaces = [
  {
    address: '滨江路 88 号',
    category: 'park',
    distance: '900m',
    id: 'place-park-1',
    name: '云杉宠物友好公园',
    rating: 4.8,
    reviewCount: 36,
    supportedSpecies: ['dog'],
    tags: ['可遛狗', '草坪', '饮水点'],
  },
  {
    address: '中央广场 B1',
    category: 'cafe',
    distance: '1.6km',
    id: 'place-cafe-1',
    name: '暖爪咖啡',
    rating: 4.6,
    reviewCount: 18,
    supportedSpecies: ['cat', 'dog'],
    tags: ['室内友好', '可带猫包'],
  },
  {
    address: '中央广场 2F',
    category: 'shop',
    distance: '1.9km',
    id: 'place-shop-1',
    name: '毛球宠物生活馆',
    rating: 4.5,
    reviewCount: 21,
    supportedSpecies: ['cat', 'dog'],
    tags: ['宠物用品', '洗护美容'],
  },
  {
    address: '明湖街 12 号',
    category: 'clinic',
    distance: '2.3km',
    id: 'place-clinic-1',
    name: '安心宠物医院',
    rating: 4.7,
    reviewCount: 24,
    supportedSpecies: ['cat', 'dog'],
    tags: ['急诊', '疫苗'],
  },
];

const petTaxonomy = {
  fieldRules: {
    birthdayFormat: 'YYYY / YYYY-MM / YYYY-MM-DD',
    maxBreedLength: 20,
    maxNameLength: 12,
    supportedSpecies: ['dog', 'cat'],
    weightUnit: 'kg',
  },
  genders: [
    { id: 'unknown', label: '未知' },
    { id: 'male', label: '男孩' },
    { id: 'female', label: '女孩' },
  ],
  personalityTags: ['亲人', '活泼', '安静', '胆小', '黏人', '爱玩', '友好', '独立', '爱撒娇', '喜欢散步'],
  species: [
    { id: 'dog', label: '狗狗', supportedInMvp: true, breeds: ['金毛', '拉布拉多', '柯基', '柴犬', '贵宾', '比熊', '边牧', '萨摩耶', '博美', '中华田园犬', '其他狗狗'] },
    { id: 'cat', label: '猫咪', supportedInMvp: true, breeds: ['英短', '美短', '布偶', '暹罗', '缅因', '橘猫', '狸花猫', '三花猫', '中华田园猫', '其他猫咪'] },
    { id: 'rabbit', label: '兔子', supportedInMvp: false, breeds: [] },
    { id: 'hamster', label: '仓鼠', supportedInMvp: false, breeds: [] },
    { id: 'bird', label: '鸟类', supportedInMvp: false, breeds: [] },
    { id: 'reptile', label: '爬宠', supportedInMvp: false, breeds: [] },
    { id: 'other', label: '其他', supportedInMvp: false, breeds: [] },
  ],
};

const legalDocuments = {
  privacy: {
    disclaimer: '当前为灵伴测试版协议文本，用于说明现阶段核心功能与数据处理方式；正式上线前会更新经法务确认的完整版本。',
    effectiveDate: '2026-06-12',
    key: 'privacy',
    sections: [
      {
        body: [
          '灵伴会在你使用登录、宠物建档、AI 形象生成、附近发现、地图地点和通知提醒时处理必要信息。',
          '位置信息默认用于附近发现和宠物友好地点推荐；产品侧会优先展示模糊距离，不展示精确住址。',
        ],
        title: '我们收集的信息',
      },
      {
        body: [
          '你上传的宠物照片用于识别宠物主体、生成电子宠物形象和保存宠物档案。',
          '如果照片包含人脸、多个宠物或无宠物内容，灵伴会提示重新上传或进入人工/模型校验策略。',
        ],
        title: '宠物照片与 AI 处理',
      },
      {
        body: [
          '你可以在设置中关闭附近可见、互动消息提醒和推送通知。',
          '正式上线前，我们会补充个人信息收集清单、第三方 SDK 清单、注销规则和未成年人保护说明。',
        ],
        title: '你的控制权',
      },
    ],
    title: '灵伴隐私政策',
    version: 'test-2026-06-12',
  },
  terms: {
    disclaimer: '当前为灵伴测试版协议文本，用于说明现阶段核心功能与数据处理方式；正式上线前会更新经法务确认的完整版本。',
    effectiveDate: '2026-06-12',
    key: 'terms',
    sections: [
      {
        body: [
          '灵伴是围绕真实宠物、电子宠物形象、宠物日历记录和宠物主人社交的移动端服务。',
          '当前版本功能仍在测试，页面、接口和 AI 结果可能持续调整。',
        ],
        title: '服务范围',
      },
      {
        body: [
          '用户应上传自己有权使用的宠物照片，不应上传侵犯他人权益、暴露他人隐私或无关的内容。',
          '宠物健康内容仅作记录和提醒，不替代兽医诊断或治疗建议。',
        ],
        title: '用户责任',
      },
      {
        body: [
          '附近发现、聊天和约遛等功能应遵守友善、安全原则，线下见面建议选择公开宠物友好地点。',
          '正式上线前，我们会补充举报处理、拉黑、账号注销和争议处理规则。',
        ],
        title: '社交与安全',
      },
    ],
    title: '灵伴用户协议',
    version: 'test-2026-06-12',
  },
};

const generatedAvatarUrl = 'lumii://golden-retriever-avatar';
const samplePhotoUrl =
  'https://images.unsplash.com/photo-1625794084867-8ddd239946b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=720';

function defaultPermissionState() {
  return {
    location: 'unknown',
    media: 'unknown',
    notifications: 'unknown',
  };
}

function defaultUserSettings() {
  return {
    fuzzyLocation: true,
    interactionMessages: true,
    nearbyVisible: true,
    pushNotifications: true,
  };
}

function createInitialState() {
  return {
    avatarJobs: {},
    conversations: {},
    conversationMessages: {},
    feedback: [],
    greetings: [],
    health: {
      memos: {},
      vaccineReminders: {},
      vaccines: {},
      weights: {},
    },
    invites: [],
    notifications: {},
    pushDevices: {},
    revokedAuthTokens: {},
    socialComments: [],
    socialLikes: [],
    socialBlocks: [],
    socialMoments: [],
    socialReports: [],
    aiUsage: {
      deepseek: {
        cacheHitTokens: 0,
        cacheMissTokens: 0,
        completionTokens: 0,
        promptTokens: 0,
        requests: 0,
        totalTokens: 0,
      },
      ttapiMidjourney: {
        failed: 0,
        quota: 0,
        requests: 0,
        succeeded: 0,
      },
      ttapiFlux: {
        failed: 0,
        quota: 0,
        requests: 0,
        succeeded: 0,
      },
      gptImage2: {
        cost: 0,
        creditsCost: 0,
        failed: 0,
        requests: 0,
        succeeded: 0,
      },
    },
    mediaUploads: {},
    petAvatarDailyUsage: {},
    petChatDailyUsage: {},
    petChatMessages: {},
    placeReviews: {},
    placeSubmissions: {},
    places: defaultPlaces,
    sms: {},
    smsDeviceDailyUsage: {},
    smsDailyUsage: {},
    smsIpDailyUsage: {},
    users: {},
  };
}

function loadState() {
  try {
    const initialState = createInitialState();
    const loadedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return {
      ...initialState,
      ...loadedState,
      health: {
        ...initialState.health,
        ...(loadedState.health || {}),
      },
      petChatMessages: {
        ...initialState.petChatMessages,
        ...(loadedState.petChatMessages || {}),
      },
      petChatDailyUsage: {
        ...initialState.petChatDailyUsage,
        ...(loadedState.petChatDailyUsage || {}),
      },
      smsDailyUsage: {
        ...initialState.smsDailyUsage,
        ...(loadedState.smsDailyUsage || {}),
      },
      smsDeviceDailyUsage: {
        ...initialState.smsDeviceDailyUsage,
        ...(loadedState.smsDeviceDailyUsage || {}),
      },
      smsIpDailyUsage: {
        ...initialState.smsIpDailyUsage,
        ...(loadedState.smsIpDailyUsage || {}),
      },
      aiUsage: {
        ...initialState.aiUsage,
        ...(loadedState.aiUsage || {}),
        deepseek: {
          ...initialState.aiUsage.deepseek,
          ...(loadedState.aiUsage?.deepseek || {}),
        },
        ttapiMidjourney: {
          ...initialState.aiUsage.ttapiMidjourney,
          ...(loadedState.aiUsage?.ttapiMidjourney || {}),
        },
        ttapiFlux: {
          ...initialState.aiUsage.ttapiFlux,
          ...(loadedState.aiUsage?.ttapiFlux || {}),
        },
      },
      mediaUploads: {
        ...initialState.mediaUploads,
        ...(loadedState.mediaUploads || {}),
      },
      petAvatarDailyUsage: {
        ...initialState.petAvatarDailyUsage,
        ...(loadedState.petAvatarDailyUsage || {}),
      },
      placeReviews: {
        ...initialState.placeReviews,
        ...(loadedState.placeReviews || {}),
      },
      placeSubmissions: {
        ...initialState.placeSubmissions,
        ...(loadedState.placeSubmissions || {}),
      },
      revokedAuthTokens: {
        ...initialState.revokedAuthTokens,
        ...(loadedState.revokedAuthTokens || {}),
      },
      socialComments: Array.isArray(loadedState.socialComments) ? loadedState.socialComments : initialState.socialComments,
      socialLikes: Array.isArray(loadedState.socialLikes) ? loadedState.socialLikes : initialState.socialLikes,
      socialMoments: Array.isArray(loadedState.socialMoments) ? loadedState.socialMoments : initialState.socialMoments,
    };
  } catch {
    return createInitialState();
  }
}

let state = loadState();
const amapPoiCache = new Map();

function saveState() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function cosEnabled() {
  return Boolean(COS_BUCKET && COS_REGION && COS_SECRET_ID && COS_SECRET_KEY);
}

function cosHost() {
  return `${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com`;
}

function cosEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function cosObjectPath(objectKey) {
  return `/${String(objectKey || '').split('/').map(cosEncode).join('/')}`;
}

function cosSignature(method, objectPath, headers = {}) {
  const now = Math.floor(Date.now() / 1000);
  const keyTime = `${now};${now + 600}`;
  const normalizedHeaders = Object.fromEntries(
    Object.entries({ host: cosHost(), ...headers }).map(([key, value]) => [String(key).toLowerCase(), String(value).trim()]),
  );
  const headerKeys = Object.keys(normalizedHeaders).sort();
  const headerList = headerKeys.join(';');
  const headerString = headerKeys.map((key) => `${key}=${cosEncode(normalizedHeaders[key])}`).join('&');
  const httpString = `${String(method).toLowerCase()}\n${objectPath}\n\n${headerString}\n`;
  const stringToSign = `sha1\n${keyTime}\n${crypto.createHash('sha1').update(httpString).digest('hex')}\n`;
  const signKey = crypto.createHmac('sha1', COS_SECRET_KEY).update(keyTime).digest('hex');
  const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');
  return [
    'q-sign-algorithm=sha1',
    `q-ak=${COS_SECRET_ID}`,
    `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`,
    `q-header-list=${headerList}`,
    'q-url-param-list=',
    `q-signature=${signature}`,
  ].join('&');
}

function cosRequest(method, objectKey, { body, headers = {}, timeoutMs = 20000 } = {}) {
  if (!cosEnabled()) return Promise.reject(new Error('COS is not configured'));
  const objectPath = cosObjectPath(objectKey);
  const requestHeaders = Object.fromEntries(Object.entries(headers).map(([key, value]) => [String(key).toLowerCase(), String(value)]));
  requestHeaders.host = cosHost();
  if (body && !requestHeaders['content-length']) requestHeaders['content-length'] = String(Buffer.byteLength(body));
  requestHeaders.authorization = cosSignature(method, objectPath, requestHeaders);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        headers: requestHeaders,
        hostname: cosHost(),
        method,
        path: objectPath,
        timeout: timeoutMs,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ body: buffer, headers: response.headers, statusCode: response.statusCode });
            return;
          }
          const message = buffer.toString('utf8').match(/<Message>(.*?)<\/Message>/)?.[1] || `COS request failed: ${response.statusCode}`;
          const error = new Error(message);
          error.statusCode = response.statusCode;
          error.body = buffer.toString('utf8');
          reject(error);
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('COS request timed out')));
    if (body) req.write(body);
    req.end();
  });
}

function mimeExtension(mimeType, fallback = 'jpg') {
  const normalized = normalizeImageMimeType(mimeType);
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/heic') return 'heic';
  if (normalized === 'image/heif') return 'heif';
  if (normalized === 'image/jpeg') return 'jpg';
  return fallback;
}

function ownerStorageId(user) {
  return crypto.createHash('sha256').update(String(user?.phone || 'anonymous')).digest('hex').slice(0, 16);
}

function storageObjectUrl(req, objectKey) {
  const base = (PET_AVATAR_PUBLIC_BASE_URL || process.env.LUMII_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (base) return `${base}/storage/objects/${encodeURIComponent(objectKey)}`;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}/storage/objects/${encodeURIComponent(objectKey)}`;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let pngCrcTable = null;

function isPngBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > PNG_SIGNATURE.length && buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function pngCrc32(buffer) {
  if (!pngCrcTable) {
    pngCrcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      pngCrcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = pngCrcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(pngCrc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function pngPaethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngToRgba(buffer) {
  if (!isPngBuffer(buffer)) return null;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette = null;
  let transparency = null;
  const idatChunks = [];
  let offset = PNG_SIGNATURE.length;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) return null;
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[10] !== 0 || data[11] !== 0 || data[12] !== 0) return null;
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      transparency = data;
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!width || !height || bitDepth !== 8 || !idatChunks.length) return null;
  if (width * height > 25000000) return null;

  const channelsByColorType = {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4,
  };
  const channels = channelsByColorType[colorType];
  if (!channels) return null;
  if (colorType === 3 && !palette) return null;

  const rowBytes = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  if (inflated.length < (rowBytes + 1) * height) return null;

  const rgba = Buffer.alloc(width * height * 4);
  let sourceOffset = 0;
  let previousRow = Buffer.alloc(rowBytes);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = Buffer.alloc(rowBytes);
    for (let i = 0; i < rowBytes; i += 1) {
      const raw = inflated[sourceOffset + i];
      const left = i >= channels ? row[i - channels] : 0;
      const up = previousRow[i] || 0;
      const upLeft = i >= channels ? previousRow[i - channels] || 0 : 0;
      let value = raw;
      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + pngPaethPredictor(left, up, upLeft);
      else if (filter !== 0) return null;
      row[i] = value & 0xff;
    }
    sourceOffset += rowBytes;

    for (let x = 0; x < width; x += 1) {
      const src = x * channels;
      const dst = (y * width + x) * 4;
      if (colorType === 6) {
        rgba[dst] = row[src];
        rgba[dst + 1] = row[src + 1];
        rgba[dst + 2] = row[src + 2];
        rgba[dst + 3] = row[src + 3];
      } else if (colorType === 2) {
        rgba[dst] = row[src];
        rgba[dst + 1] = row[src + 1];
        rgba[dst + 2] = row[src + 2];
        rgba[dst + 3] = 255;
      } else if (colorType === 0) {
        rgba[dst] = row[src];
        rgba[dst + 1] = row[src];
        rgba[dst + 2] = row[src];
        rgba[dst + 3] = 255;
      } else if (colorType === 4) {
        rgba[dst] = row[src];
        rgba[dst + 1] = row[src];
        rgba[dst + 2] = row[src];
        rgba[dst + 3] = row[src + 1];
      } else if (colorType === 3) {
        const index = row[src];
        const paletteOffset = index * 3;
        rgba[dst] = palette[paletteOffset] || 0;
        rgba[dst + 1] = palette[paletteOffset + 1] || 0;
        rgba[dst + 2] = palette[paletteOffset + 2] || 0;
        rgba[dst + 3] = transparency && index < transparency.length ? transparency[index] : 255;
      }
    }

    previousRow = row;
  }

  return { height, rgba, width };
}

function encodeRgbaPng(width, height, rgba) {
  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND'),
  ]);
}

function isLightNeutralPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  return avg >= 145 && max - min <= 34;
}

function detectCheckerboardProfile({ height, rgba, width }) {
  const edgeSize = Math.max(3, Math.round(Math.min(width, height) * 0.035));
  const bins = new Map();
  let samples = 0;
  let candidates = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= edgeSize && y >= edgeSize && x < width - edgeSize && y < height - edgeSize) continue;
      const offset = (y * width + x) * 4;
      const alpha = rgba[offset + 3];
      if (alpha < 24) continue;
      samples += 1;
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      if (!isLightNeutralPixel(r, g, b)) continue;
      candidates += 1;
      const brightness = (r + g + b) / 3;
      const key = String(Math.round(brightness / 16) * 16);
      const bin = bins.get(key) || { brightness: 0, b: 0, count: 0, g: 0, r: 0 };
      bin.count += 1;
      bin.brightness += brightness;
      bin.r += r;
      bin.g += g;
      bin.b += b;
      bins.set(key, bin);
    }
  }

  if (samples < 64 || candidates / samples < 0.38) return null;
  const sortedBins = [...bins.values()]
    .map((bin) => ({
      avg: bin.brightness / bin.count,
      b: bin.b / bin.count,
      count: bin.count,
      g: bin.g / bin.count,
      r: bin.r / bin.count,
    }))
    .sort((a, b) => b.count - a.count);
  const primary = sortedBins[0];
  const secondary = sortedBins.find((bin) => Math.abs(bin.avg - primary.avg) >= 8);
  if (!primary || !secondary) return null;
  if (secondary.count / candidates < 0.08) return null;
  if ((primary.count + secondary.count) / candidates < 0.28) return null;

  const brightnessGap = Math.abs(primary.avg - secondary.avg);
  const threshold = Math.max(30, Math.min(58, brightnessGap * 1.3));
  return {
    colors: [
      [primary.r, primary.g, primary.b],
      [secondary.r, secondary.g, secondary.b],
    ],
    thresholdSq: threshold * threshold,
  };
}

function colorDistanceSq(r, g, b, color) {
  return (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
}

function isCheckerboardBackgroundPixel(rgba, offset, profile) {
  const alpha = rgba[offset + 3];
  if (alpha < 24) return true;
  const r = rgba[offset];
  const g = rgba[offset + 1];
  const b = rgba[offset + 2];
  if (!isLightNeutralPixel(r, g, b)) return false;
  return profile.colors.some((color) => colorDistanceSq(r, g, b, color) <= profile.thresholdSq);
}

function removeCheckerboardBackground(decoded) {
  const profile = detectCheckerboardProfile(decoded);
  if (!profile) return null;

  const { height, width } = decoded;
  const rgba = Buffer.from(decoded.rgba);
  const pixels = width * height;
  const visited = new Uint8Array(pixels);
  const stack = [];

  for (let x = 0; x < width; x += 1) {
    stack.push(x);
    stack.push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    stack.push(y * width);
    stack.push(y * width + width - 1);
  }

  let removed = 0;
  while (stack.length) {
    const pixel = stack.pop();
    if (visited[pixel]) continue;
    visited[pixel] = 1;
    const offset = pixel * 4;
    if (!isCheckerboardBackgroundPixel(rgba, offset, profile)) continue;

    rgba[offset] = 255;
    rgba[offset + 1] = 255;
    rgba[offset + 2] = 255;
    rgba[offset + 3] = 0;
    removed += 1;

    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) stack.push(pixel - 1);
    if (x < width - 1) stack.push(pixel + 1);
    if (y > 0) stack.push(pixel - width);
    if (y < height - 1) stack.push(pixel + width);
  }

  if (removed < Math.max(64, Math.round((width + height) * 2))) return null;
  return { height, removed, rgba, width };
}

function cleanPetAvatarImage(downloaded, scope) {
  if (String(scope || '') !== 'pet-avatar') return downloaded;
  if (!isPngBuffer(downloaded?.buffer)) return downloaded;
  try {
    const decoded = decodePngToRgba(downloaded.buffer);
    if (!decoded) return downloaded;
    const cleaned = removeCheckerboardBackground(decoded);
    if (!cleaned) return downloaded;
    return {
      buffer: encodeRgbaPng(cleaned.width, cleaned.height, cleaned.rgba),
      cleanedCheckerboard: true,
      mimeType: 'image/png',
      removedPixels: cleaned.removed,
    };
  } catch (error) {
    console.warn('[avatar:image] checkerboard cleanup skipped', { message: error.message || String(error) });
    return downloaded;
  }
}

function cosObjectKeyFor(user, scope, fileName, petId = '') {
  const safeScope = String(scope || 'misc').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const safeFileName = String(fileName || `${Date.now()}.jpg`).replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
  return [safeScope, ownerStorageId(user), petId ? String(petId).replace(/[^a-z0-9_-]/gi, '-') : '', safeFileName].filter(Boolean).join('/');
}

async function uploadBufferToCos(req, user, { buffer, fileName, mimeType, petId = '', scope }) {
  if (!cosEnabled() || !Buffer.isBuffer(buffer) || buffer.length <= 0) return null;
  const finalMimeType = normalizeImageMimeType(mimeType) || 'application/octet-stream';
  const objectKey = cosObjectKeyFor(user, scope, fileName, petId);
  await cosRequest('PUT', objectKey, {
    body: buffer,
    headers: {
      'cache-control': 'private, max-age=31536000',
      'content-type': finalMimeType,
    },
  });
  return {
    bucket: COS_BUCKET,
    bytes: buffer.length,
    mimeType: finalMimeType,
    objectKey,
    provider: 'cos',
    region: COS_REGION,
    url: storageObjectUrl(req, objectKey),
  };
}

async function downloadImageBuffer(urlInput, maxBytes = MEDIA_UPLOAD_MAX_BYTES) {
  const url = String(urlInput || '').trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
    const contentType = normalizeImageMimeType(response.headers.get('content-type')) || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length || buffer.length > maxBytes) throw new Error('Image file is empty or too large');
    const detectedMimeType = detectImageMimeType(buffer) || contentType;
    if (!isSupportedPetMediaMimeType(detectedMimeType)) throw new Error('Downloaded image format is not supported');
    return { buffer, mimeType: detectedMimeType };
  } finally {
    clearTimeout(timeout);
  }
}

function base64UploadBuffer(parsedUpload) {
  const match = String(parsedUpload?.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    buffer: Buffer.from(match[2], 'base64'),
    mimeType: normalizeImageMimeType(match[1]) || parsedUpload.mimeType,
  };
}

async function storeAvatarUrlToCos(req, user, avatarUrl, { petId = '', scope = 'pet-avatar' } = {}) {
  const value = String(avatarUrl || '').trim();
  if (!value || value.startsWith('lumii://') || value.includes('/storage/objects/')) return value;
  const downloaded = await downloadImageBuffer(value);
  if (!downloaded?.buffer?.length) return value;
  const prepared = cleanPetAvatarImage(downloaded, scope);
  if (prepared.cleanedCheckerboard) {
    console.log('[avatar:image] removed fake transparent checkerboard', {
      bytesAfter: prepared.buffer.length,
      bytesBefore: downloaded.buffer.length,
      removedPixels: prepared.removedPixels,
      scope,
    });
  }
  const extension = mimeExtension(prepared.mimeType);
  const stored = await uploadBufferToCos(req, user, {
    buffer: prepared.buffer,
    fileName: `avatar-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${extension}`,
    mimeType: prepared.mimeType,
    petId,
    scope,
  });
  return stored?.url || value;
}

async function storeBase64ImageToCos(req, user, body, { base64Key, fileNamePrefix, mimeTypeKey, nameKey, petId = '', scope }) {
  if (!cosEnabled()) return { url: '' };
  const parsedUpload = parseBase64Upload(body?.[base64Key], body?.[mimeTypeKey]);
  if (!parsedUpload.dataUrl) {
    if (parsedUpload.issue) return { error: mediaUploadIssueAnalysis(parsedUpload.issue, parsedUpload.bytes)?.message || '图片上传失败，请重新选择' };
    return { url: '' };
  }
  const fileParts = base64UploadBuffer(parsedUpload);
  if (!fileParts?.buffer?.length) return { error: '图片上传失败，请重新选择' };
  const extension = mimeExtension(fileParts.mimeType);
  const stored = await uploadBufferToCos(req, user, {
    buffer: fileParts.buffer,
    fileName: `${fileNamePrefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${extension}`,
    mimeType: fileParts.mimeType,
    petId,
    scope,
  });
  if (!stored?.url) return { error: '图片上传失败，请稍后重试' };
  return {
    bytes: stored.bytes,
    objectKey: stored.objectKey,
    url: stored.url,
  };
}

function isLocalImagePlaceholderUrl(value) {
  return /^(file|content|ph|assets-library|data):/i.test(String(value || '').trim());
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(body);
}

function ok(res, data) {
  sendJson(res, 200, { data, state: 'success' });
}

function errorCodeFrom(statusCode, message) {
  const text = String(message || '');
  if (/操作太频繁/.test(text)) return 'SMS_RATE_LIMITED';
  if (/验证码发送次数|当前设备今天获取验证码|当前网络今天获取验证码/.test(text)) return 'SMS_DAILY_LIMITED';
  if (/验证码错误次数过多/.test(text)) return 'SMS_CODE_ATTEMPT_LIMITED';
  if (/验证码错误/.test(text)) return 'SMS_CODE_INVALID';
  if (/验证码已过期/.test(text)) return 'SMS_CODE_EXPIRED';
  if (/验证码已使用/.test(text)) return 'SMS_CODE_USED';
  if (/手机号/.test(text) && /正确/.test(text)) return 'SMS_PHONE_INVALID';
  if (/不能包含|不适合发送|不适合公开|违法|灰产|微信|QQ|外部联系方式|外部链接/.test(text)) return 'CONTENT_POLICY_VIOLATION';
  if (/今日灵伴形象生成次数/.test(text)) return 'PET_AVATAR_DAILY_LIMIT';
  if (/今天和灵伴聊天次数/.test(text)) return 'PET_CHAT_DAILY_LIMIT';
  if (statusCode === 401 && /失效/.test(text)) return 'AUTH_TOKEN_EXPIRED';
  if (statusCode === 401) return 'AUTH_REQUIRED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404 && /接口/.test(text)) return 'ROUTE_NOT_FOUND';
  if (statusCode === 404) return 'RESOURCE_NOT_FOUND';
  if (statusCode === 409) return 'DUPLICATE_RESOURCE';
  if (statusCode === 429) return 'RATE_LIMITED';
  if (statusCode >= 500) return 'SERVER_ERROR';
  if (statusCode >= 400) return 'VALIDATION_FAILED';
  return 'REQUEST_FAILED';
}

function fail(res, statusCode, message, retryable = false, data, code) {
  sendJson(res, statusCode, { data, error: { code: code || errorCodeFrom(statusCode, message), message, retryable }, state: 'error' });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const params = new URLSearchParams(raw);
        resolve(Object.fromEntries(params.entries()));
      }
    });
  });
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const phone = digits.startsWith('86') && digits.length === 13 ? digits.slice(2) : digits;
  return /^1[3-9]\d{9}$/.test(phone) ? phone : '';
}

function normalizeSmsDeviceId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/[^\w.:-]/g, '').slice(0, 80);
}

function clientIpFromRequest(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  const realIp = String(req.headers['x-real-ip'] || '').trim();
  const remoteAddress = String(req.socket?.remoteAddress || '').trim();
  return (forwardedFor || realIp || remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

function numberFromQuery(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function timestampFromValue(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function locationFromQuery(url) {
  const latitude = numberFromQuery(url.searchParams.get('lat'));
  const longitude = numberFromQuery(url.searchParams.get('lng'));
  if (latitude === undefined || longitude === undefined) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return {
    accuracy: numberFromQuery(url.searchParams.get('accuracy')),
    latitude,
    longitude,
    radiusKm: numberFromQuery(url.searchParams.get('radiusKm')) || DEFAULT_DISCOVER_RADIUS_KM,
    updatedAt: Date.now(),
  };
}

function locationFromPayload(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const latitude = numberFromQuery(source.latitude ?? source.lat);
  const longitude = numberFromQuery(source.longitude ?? source.lng);
  if (latitude === undefined || longitude === undefined) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return {
    accuracy: numberFromQuery(source.accuracy),
    latitude,
    longitude,
    radiusKm: numberFromQuery(source.radiusKm) || DEFAULT_DISCOVER_RADIUS_KM,
    updatedAt: timestampFromValue(source.updatedAt) || Date.now(),
  };
}

function isFreshNearbyLocation(location, now = Date.now()) {
  const updatedAt = Number(location?.updatedAt || 0);
  return Number.isFinite(updatedAt) && updatedAt > 0 && now - updatedAt <= NEARBY_LOCATION_MAX_AGE_MS;
}

function fuzzyLocationForPersistence(location) {
  if (!location) return null;
  return {
    ...location,
    accuracy: Math.max(Number(location.accuracy || 0), FUZZY_LOCATION_MIN_ACCURACY_METERS),
    latitude: Number((Math.round(location.latitude / FUZZY_LOCATION_GRID_DEGREES) * FUZZY_LOCATION_GRID_DEGREES).toFixed(4)),
    longitude: Number((Math.round(location.longitude / FUZZY_LOCATION_GRID_DEGREES) * FUZZY_LOCATION_GRID_DEGREES).toFixed(4)),
  };
}

function locationForPersistence(user, location) {
  if (!location) return null;
  const settings = normalizeUserSettings(user.settings);
  return settings.fuzzyLocation === false ? location : fuzzyLocationForPersistence(location);
}

function distanceKmBetween(a, b) {
  if (!a || !b) return null;
  const earthRadiusKm = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function accuracyBufferKm(a, b) {
  const meters = Math.max(0, Number(a?.accuracy || 0)) + Math.max(0, Number(b?.accuracy || 0));
  return Math.min(MAX_ACCURACY_BUFFER_KM, meters / 1000);
}

function nearbyRadiusKmFor(viewer, fallback = DEFAULT_DISCOVER_RADIUS_KM) {
  const radiusKm = Number(viewer?.location?.radiusKm || fallback || DEFAULT_DISCOVER_RADIUS_KM);
  return Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : DEFAULT_DISCOVER_RADIUS_KM;
}

function canViewNearbyUser(viewer, targetUser, radiusKm = DEFAULT_DISCOVER_RADIUS_KM) {
  if (!viewer?.location || !targetUser?.location) return false;
  const distanceKm = distanceKmBetween(viewer.location, targetUser.location);
  if (distanceKm === null || distanceKm === undefined) return false;
  return distanceKm <= nearbyRadiusKmFor(viewer, radiusKm) + accuracyBufferKm(viewer.location, targetUser.location);
}

function fuzzyDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) return '附近';
  if (distanceKm < 0.5) return '500m 内';
  if (distanceKm < 1) return '1km 内';
  if (distanceKm < 2) return '约 1-2km';
  if (distanceKm < 3) return '约 2-3km';
  if (distanceKm < 5) return '约 3-5km';
  return '5km 外';
}

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function authTokenSignature(payloadPart) {
  return crypto
    .createHmac('sha256', AUTH_TOKEN_SECRET)
    .update(payloadPart)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function safeEqualText(leftText, rightText) {
  const left = Buffer.from(String(leftText || ''));
  const right = Buffer.from(String(rightText || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function bearerTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  return String(header).replace(/^Bearer\s+/i, '').trim();
}

function authTokenDigest(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createAuthToken(phone) {
  const now = Date.now();
  const payloadPart = base64UrlEncode(
    JSON.stringify({
      exp: now + AUTH_TOKEN_TTL_MS,
      iat: now,
      jti: crypto.randomBytes(12).toString('hex'),
      phone,
      version: 1,
    })
  );
  return `lumii-v1.${payloadPart}.${authTokenSignature(payloadPart)}`;
}

function signedAuthTokenPayload(token) {
  try {
    const [prefix, payloadPart, signature] = String(token || '').split('.');
    if (prefix !== 'lumii-v1' || !payloadPart || !signature) return null;
    if (!safeEqualText(signature, authTokenSignature(payloadPart))) return null;
    const payload = JSON.parse(base64UrlDecode(payloadPart));
    return payload?.version === 1 ? payload : null;
  } catch (_) {
    return null;
  }
}

function pruneRevokedAuthTokens() {
  state.revokedAuthTokens = state.revokedAuthTokens || {};
  const now = Date.now();
  let changed = false;
  for (const [digest, expiresAt] of Object.entries(state.revokedAuthTokens)) {
    if (Number(expiresAt || 0) <= now) {
      delete state.revokedAuthTokens[digest];
      changed = true;
    }
  }
  return changed;
}

function isAuthTokenRevoked(token) {
  pruneRevokedAuthTokens();
  return Boolean(state.revokedAuthTokens?.[authTokenDigest(token)]);
}

function revokeSignedAuthToken(token) {
  const payload = signedAuthTokenPayload(token);
  const expiresAt = Number(payload?.exp || 0);
  if (!payload || expiresAt <= Date.now()) return false;
  state.revokedAuthTokens = state.revokedAuthTokens || {};
  state.revokedAuthTokens[authTokenDigest(token)] = expiresAt;
  pruneRevokedAuthTokens();
  return true;
}

function phoneFromSignedToken(token) {
  const payload = signedAuthTokenPayload(token);
  if (!payload) return '';
  if (Number(payload.exp || 0) < Date.now()) return '';
  if (isAuthTokenRevoked(token)) return '';
  return normalizePhone(payload.phone);
}

function phoneFromRequest(req) {
  const token = bearerTokenFromRequest(req);
  if (!token) return '';
  if (token.startsWith('lumii-v1.')) return phoneFromSignedToken(token);
  if (token.startsWith('lumii-local-')) return normalizePhone(token.slice('lumii-local-'.length));
  return '';
}

function ensureUser(phone) {
  if (!state.users[phone]) {
    const suffix = phone.slice(-4);
    state.users[phone] = {
      activePetId: '',
      createdAt: Date.now(),
      lastSeenAt: 0,
      location: null,
      ownerAvatarUrl: '',
      ownerBio: '',
      ownerName: `用户${suffix}`,
      favoritePlaceIds: [],
      permissions: defaultPermissionState(),
      permissionsOnboardingCompleted: false,
      pets: [],
      phone,
      settings: defaultUserSettings(),
    };
  }
  state.users[phone].permissions = normalizePermissionState(state.users[phone].permissions);
  state.users[phone].settings = normalizeUserSettings(state.users[phone].settings);
  state.users[phone].favoritePlaceIds = normalizeFavoritePlaceIds(state.users[phone].favoritePlaceIds);
  state.users[phone].permissionsOnboardingCompleted = Boolean(state.users[phone].permissionsOnboardingCompleted);
  return state.users[phone];
}

function normalizePermissionState(value) {
  const allowed = new Set(['blocked', 'denied', 'granted', 'unavailable', 'unknown']);
  const current = value && typeof value === 'object' ? value : {};
  const next = defaultPermissionState();
  for (const key of Object.keys(next)) {
    const status = current[key];
    next[key] = allowed.has(status) ? status : 'unknown';
  }
  return next;
}

function parsePermissionPatch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '权限参数无效，请刷新后重试' };
  }
  if ('completed' in value && typeof value.completed !== 'boolean') {
    return { error: '权限引导完成状态必须是开启或关闭' };
  }
  const permissions = value.permissions ?? {};
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    return { error: '权限状态参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(Object.keys(defaultPermissionState()));
  const allowedStatuses = new Set(['blocked', 'denied', 'granted', 'unavailable', 'unknown']);
  const keys = Object.keys(permissions);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `权限项 ${unknownKey} 暂不支持` };
  const invalidKey = keys.find((key) => !allowedStatuses.has(permissions[key]));
  if (invalidKey) return { error: `权限项 ${invalidKey} 状态无效` };
  return {
    completed: value.completed === true,
    permissions: Object.fromEntries(keys.map((key) => [key, permissions[key]])),
  };
}

function normalizeUserSettings(value) {
  const current = value && typeof value === 'object' ? value : {};
  const defaults = defaultUserSettings();
  return Object.fromEntries(Object.keys(defaults).map((key) => [key, typeof current[key] === 'boolean' ? current[key] : defaults[key]]));
}

function parseUserSettingsPatch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '设置参数无效，请刷新后重试' };
  }
  const defaults = defaultUserSettings();
  const allowedKeys = new Set(Object.keys(defaults));
  const keys = Object.keys(value);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `设置项 ${unknownKey} 暂不支持` };
  const invalidKey = keys.find((key) => typeof value[key] !== 'boolean');
  if (invalidKey) return { error: `设置项 ${invalidKey} 必须是开启或关闭` };
  return { patch: Object.fromEntries(keys.map((key) => [key, value[key]])) };
}

function parsePetProfilePayload(value, { partial = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '宠物资料参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['avatarBase64', 'avatarFileName', 'avatarMimeType', 'avatarUrl', 'birthday', 'breed', 'gender', 'name', 'species', 'weightKg']);
  const keys = Object.keys(value);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `宠物资料字段 ${unknownKey} 暂不支持` };

  const patch = {};
  const unset = [];
  const fieldRules = petTaxonomy.fieldRules;
  const supportedSpecies = new Set(fieldRules.supportedSpecies);
  const genderIds = new Set(petTaxonomy.genders.map((item) => item.id));

  if (!partial || Object.prototype.hasOwnProperty.call(value, 'name')) {
    const name = String(value.name || '').trim();
    if (!name) return { error: '请输入宠物昵称' };
    if (name.length > fieldRules.maxNameLength) return { error: `宠物昵称最多 ${fieldRules.maxNameLength} 个字` };
    patch.name = name;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(value, 'species')) {
    const species = String(value.species || '').trim();
    if (!species) return { error: '请选择宠物类型' };
    if (!supportedSpecies.has(species)) return { error: '当前 MVP 版本先支持猫和狗建档' };
    patch.species = species;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(value, 'breed')) {
    const breed = String(value.breed || '').trim() || '待完善';
    if (breed.length > fieldRules.maxBreedLength) return { error: `宠物品种最多 ${fieldRules.maxBreedLength} 个字` };
    patch.breed = breed;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(value, 'gender')) {
    const gender = String(value.gender || 'unknown').trim() || 'unknown';
    if (!genderIds.has(gender)) return { error: '请选择正确的宠物性别' };
    patch.gender = gender;
  }

  if (Object.prototype.hasOwnProperty.call(value, 'birthday')) {
    const birthday = String(value.birthday || '').trim();
    if (birthday) {
      if (!isValidPetBirthdayValue(birthday)) return { error: '宠物生日格式应为 YYYY、YYYY-MM 或 YYYY-MM-DD，且不能晚于今天' };
      patch.birthday = birthday;
    } else {
      unset.push('birthday');
    }
  }

  if (Object.prototype.hasOwnProperty.call(value, 'weightKg')) {
    if (value.weightKg === '' || value.weightKg === null) {
      unset.push('weightKg');
    } else {
      const weightKg = Number(value.weightKg);
      if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 200) return { error: '请输入 0-200kg 之间的宠物体重' };
      patch.weightKg = Math.round(weightKg * 100) / 100;
    }
  }

  if (Object.prototype.hasOwnProperty.call(value, 'avatarUrl')) {
    const avatarUrl = String(value.avatarUrl || '').trim();
    if (avatarUrl) {
      if (avatarUrl.length > 2000) return { error: '宠物头像地址过长，请重新上传' };
      if (isLocalImagePlaceholderUrl(avatarUrl) && !value.avatarBase64) return { error: '宠物头像还没有上传完成，请重新选择头像' };
      patch.avatarUrl = avatarUrl;
    } else {
      unset.push('avatarUrl');
    }
  }

  return { patch, unset };
}

function parseWeightRecordPayload(value, { current = null, partial = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '体重记录参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['kg', 'note', 'recordedAt']);
  const keys = Object.keys(value);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `体重记录字段 ${unknownKey} 暂不支持` };

  const source = current || {};
  const kgInput = partial && !Object.prototype.hasOwnProperty.call(value, 'kg') ? source.kg : value.kg;
  const kg = Number(kgInput);
  if (!Number.isFinite(kg) || kg <= 0 || kg > 200) return { error: '请输入 0-200kg 之间的宠物体重' };

  const note = Object.prototype.hasOwnProperty.call(value, 'note') ? String(value.note || '').trim() : String(source.note || '').trim();
  if (note.length > 120) return { error: '体重备注最多 120 个字' };

  const recordedAtInput = Object.prototype.hasOwnProperty.call(value, 'recordedAt') ? value.recordedAt : source.recordedAt || todayIsoDate();
  const recordedAt = String(recordedAtInput || '').trim();
  if (!isValidIsoCalendarDate(recordedAt)) return { error: '请选择正确日期' };

  return {
    record: {
      kg: Math.round(kg * 100) / 100,
      note,
      recordedAt,
    },
  };
}

const healthMemoRepeats = new Set(['monthly', 'none', 'quarterly', 'yearly']);

function isValidMemoReminderAt(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return false;
  const [, dateText, hourText, minuteText] = match;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return isValidIsoCalendarDate(dateText) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function parseHealthMemoPayload(value, current = null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '备忘参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['content', 'reminderAt', 'reminderEnabled', 'repeat', 'title']);
  const keys = Object.keys(value);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `备忘字段 ${unknownKey} 暂不支持` };

  const title = String(Object.prototype.hasOwnProperty.call(value, 'title') ? value.title : current?.title || '').trim();
  const content = String(Object.prototype.hasOwnProperty.call(value, 'content') ? value.content : current?.content || '').trim();
  const repeat = String(Object.prototype.hasOwnProperty.call(value, 'repeat') ? value.repeat || 'none' : current?.repeat || 'none').trim();
  const reminderEnabled = Object.prototype.hasOwnProperty.call(value, 'reminderEnabled') ? Boolean(value.reminderEnabled) : Boolean(current?.reminderEnabled);
  const reminderAt = String(Object.prototype.hasOwnProperty.call(value, 'reminderAt') ? value.reminderAt || '' : current?.reminderAt || '').trim();
  if (!title || !content) return { error: '请填写备忘标题和内容' };
  if (title.length > 30) return { error: '备忘标题最多 30 个字' };
  if (content.length > 500) return { error: '备忘内容最多 500 个字' };
  if (!healthMemoRepeats.has(repeat)) return { error: '璇烽€夋嫨姝ｇ‘閲嶅棰戠巼' };
  if (reminderEnabled && !isValidMemoReminderAt(reminderAt)) return { error: '璇烽€夋嫨姝ｇ‘鎻愰啋鏃堕棿' };
  return { memo: { content, reminderAt: reminderEnabled ? reminderAt : undefined, reminderEnabled, repeat, title } };
}

function parseVaccineStatusPatch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '疫苗计划参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['status']);
  const keys = Object.keys(value);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `疫苗计划字段 ${unknownKey} 暂不支持` };
  if (!Object.prototype.hasOwnProperty.call(value, 'status')) return { error: '请选择疫苗计划状态' };
  const status = String(value.status || '').trim();
  if (!['done', 'due', 'overdue'].includes(status)) return { error: '疫苗状态无效' };
  return { status };
}

function parseVaccineReminderPatch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '疫苗提醒参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['enabled']);
  const keys = Object.keys(value);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `疫苗提醒字段 ${unknownKey} 暂不支持` };
  if (typeof value.enabled !== 'boolean') return { error: '疫苗提醒开关必须是开启或关闭' };
  return { enabled: value.enabled };
}

function parseVaccineCreatePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '疫苗计划参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['dueAt', 'name']);
  const keys = Object.keys(value);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `疫苗计划字段 ${unknownKey} 暂不支持` };
  const name = String(value.name || '').trim();
  const dueAt = String(value.dueAt || '').trim();
  if (!name) return { error: '请输入疫苗或驱虫名称' };
  if (name.length > 24) return { error: '疫苗名称最多 24 个字' };
  if (!isValidIsoCalendarDate(dueAt)) return { error: '请选择正确的计划日期' };
  return { input: { dueAt, name } };
}

function parsePushDevicePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '推送设备参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['deviceId', 'platform', 'token']);
  const keys = Object.keys(value);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `推送设备字段 ${unknownKey} 暂不支持` };

  const token = String(value.token || '').trim();
  if (!token) return { error: '推送 token 不能为空' };
  if (token.length < 8 || token.length > 4096 || /[\r\n\t]/.test(token)) {
    return { error: '推送 token 格式无效，请重新授权通知' };
  }

  const platform = String(value.platform || '').trim();
  if (!['android', 'ios', 'web'].includes(platform)) {
    return { error: '推送平台必须是 android、ios 或 web' };
  }

  const deviceId = value.deviceId === undefined || value.deviceId === null ? '' : String(value.deviceId).trim();
  if (deviceId.length > 128 || /[\r\n\t]/.test(deviceId)) {
    return { error: '设备标识格式无效，请重新授权通知' };
  }

  return {
    device: {
      deviceId: deviceId || undefined,
      platform,
      token,
      updatedAt: new Date().toISOString(),
    },
  };
}

function normalizeFavoritePlaceIds(value) {
  if (!Array.isArray(value)) return [];
  const existingPlaceIds = new Set((state.places || []).map((place) => place.id));
  return [...new Set(value.map(String).filter((id) => existingPlaceIds.has(id)))];
}

function favoritePlaceIdsFor(user) {
  user.favoritePlaceIds = normalizeFavoritePlaceIds(user.favoritePlaceIds);
  return user.favoritePlaceIds;
}

function setFavoritePlace(user, placeId, favorite) {
  const place = (state.places || []).find((item) => item.id === placeId);
  if (!place) return null;
  const current = favoritePlaceIdsFor(user);
  user.favoritePlaceIds = favorite ? [...new Set([placeId, ...current])] : current.filter((id) => id !== placeId);
  return user.favoritePlaceIds;
}

function matchesPlaceSearch(place, query) {
  const searchableText = [place.name, place.address, place.category, ...(place.tags || [])].join(' ');
  return searchableText.includes(query);
}

function clampPlaceRadiusKm(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_DISCOVER_RADIUS_KM;
  return Math.min(5, Math.max(0.5, numeric));
}

function placeLocationFromQuery(url, user) {
  const location = locationFromQuery(url);
  if (location) {
    return {
      ...location,
      radiusKm: clampPlaceRadiusKm(location.radiusKm),
    };
  }
  if (!user?.location) return null;
  return {
    ...user.location,
    radiusKm: clampPlaceRadiusKm(url.searchParams.get('radiusKm') || user.location.radiusKm || DEFAULT_DISCOVER_RADIUS_KM),
  };
}

function compactText(value) {
  if (Array.isArray(value)) return value.map(compactText).filter(Boolean).join(' ');
  return String(value ?? '').trim();
}

function formatDistanceMeters(meters) {
  const numeric = Number(meters);
  if (!Number.isFinite(numeric) || numeric < 0) return '附近';
  if (numeric < 1000) return `${Math.max(1, Math.round(numeric))}m`;
  return `${(numeric / 1000).toFixed(numeric < 10000 ? 1 : 0).replace(/\.0$/, '')}km`;
}

function placeDistanceMeters(place) {
  const value = compactText(place?.distance);
  const match = value.match(/([\d.]+)\s*(km|公里|m|米)?/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return Number.POSITIVE_INFINITY;
  const unit = (match[2] || 'm').toLowerCase();
  return unit === 'km' || unit === '公里' ? amount * 1000 : amount;
}

function inferAmapPlaceCategory(poi) {
  const nameTypeText = [poi.name, poi.type, poi.typecode].map(compactText).join(' ');
  const text = [nameTypeText, poi.address].map(compactText).join(' ');
  if (/(宠物医院|动物医院|宠物诊所|兽医|医疗|医院|诊所)/u.test(text)) return 'clinic';
  if (/(宠物店|宠物用品|宠物食品|宠物美容|宠物寄养|爬宠|猫舍|犬舍|萌宠|宠物生活馆)/u.test(text)) return 'shop';
  if (/(公园|绿地|景区|风景名胜|游园)/u.test(nameTypeText)) return 'park';
  if (/(猫咖|狗咖|宠物咖啡|宠物友好|萌宠咖啡|咖啡|餐厅|餐饮|茶|商场|购物中心|甜品|烘焙)/u.test(nameTypeText)) return 'cafe';
  return 'other';
}

function isRelevantAmapPoi(poi) {
  const nameTypeText = [poi.name, poi.type, poi.typecode].map(compactText).join(' ');
  const text = [nameTypeText, poi.address].map(compactText).join(' ');
  if (/(宠物|动物医院|宠物医院|宠物诊所|兽医|宠物店|宠物用品|宠物食品|宠物美容|宠物寄养|猫咖|狗咖|猫舍|犬舍|爬宠|萌宠|喵)/u.test(text)) {
    return true;
  }
  if (/(公园|绿地|景区|风景名胜|游园)/u.test(nameTypeText) && !/(餐饮|快餐|小吃|购物|商场|便利店|酒店)/u.test(nameTypeText)) {
    return true;
  }
  return false;
}

function inferAmapSupportedSpecies(poi, category) {
  const text = [poi.name, poi.type, poi.address].map(compactText).join(' ');
  const species = new Set();
  if (/(猫|喵|猫咖|猫咪|cat)/iu.test(text)) species.add('cat');
  if (/(狗|犬|汪|dog|canine)/iu.test(text)) species.add('dog');
  if (/(宠物|动物医院|宠物医院|兽医|宠物店|宠物美容|宠物寄养)/u.test(text)) {
    species.add('cat');
    species.add('dog');
  }
  if (category === 'clinic' || category === 'shop') {
    species.add('cat');
    species.add('dog');
  }
  if (category === 'park') {
    species.add('dog');
  }
  return Array.from(species).filter((item) => item === 'cat' || item === 'dog');
}

function inferAmapPlaceTags(poi, category, supportedSpecies) {
  const tags = new Set();
  if (category === 'clinic') {
    tags.add('就医');
    tags.add('疫苗');
  } else if (category === 'park') {
    tags.add('可遛区域');
    tags.add('待社区确认');
  } else if (category === 'cafe') {
    tags.add('宠物友好候选');
    tags.add('待社区确认');
  } else if (category === 'shop') {
    tags.add('宠物用品');
    tags.add('洗护候选');
  } else {
    tags.add('POI候选');
    tags.add('待社区确认');
  }
  if (supportedSpecies.includes('cat')) tags.add('喵星友好');
  if (supportedSpecies.includes('dog')) tags.add('汪星友好');
  return Array.from(tags);
}

function amapPoiLocation(poi) {
  const raw = compactText(poi.location);
  return amapLocationFromText(raw);
}

function amapLocationFromText(rawLocation) {
  const raw = compactText(rawLocation);
  const [longitudeText, latitudeText] = raw.split(',');
  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function amapPoiDistanceMeters(poi, viewerLocation, poiLocation) {
  const explicit = Number(poi.distance);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const distanceKm = distanceKmBetween(viewerLocation, poiLocation);
  return distanceKm === null || distanceKm === undefined ? null : distanceKm * 1000;
}

function amapPoiBusiness(poi) {
  return poi && typeof poi.business === 'object' && !Array.isArray(poi.business) && poi.business ? poi.business : {};
}

function amapPoiNavi(poi) {
  return poi && typeof poi.navi === 'object' && !Array.isArray(poi.navi) && poi.navi ? poi.navi : {};
}

function amapPoiPhotos(poi) {
  const rawPhotos = poi?.photos;
  const photos = Array.isArray(rawPhotos) ? rawPhotos : rawPhotos && typeof rawPhotos === 'object' ? [rawPhotos] : [];
  const seen = new Set();
  return photos
    .map((photo) => ({
      title: compactText(photo?.title),
      url: compactText(photo?.url),
    }))
    .filter((photo) => {
      if (!photo.url || seen.has(photo.url)) return false;
      seen.add(photo.url);
      return /^https?:\/\//i.test(photo.url);
    })
    .slice(0, 6);
}

function firstCompactText(...values) {
  for (const value of values) {
    const text = compactText(value);
    if (text) return text;
  }
  return '';
}

function amapPoiRating(poi) {
  const business = amapPoiBusiness(poi);
  const rating = Number(firstCompactText(business.rating, poi.rating));
  return Number.isFinite(rating) && rating > 0 ? Math.round(rating * 10) / 10 : 0;
}

function amapPoiToPlace(poi, viewerLocation) {
  if (!isRelevantAmapPoi(poi)) return null;
  const sourcePoiId = compactText(poi.id);
  const name = compactText(poi.name);
  if (!sourcePoiId || !name) return null;
  const poiLocation = amapPoiLocation(poi);
  const business = amapPoiBusiness(poi);
  const navi = amapPoiNavi(poi);
  const photos = amapPoiPhotos(poi);
  const entranceLocation = amapLocationFromText(firstCompactText(navi.entr_location, poi.entr_location));
  const category = inferAmapPlaceCategory(poi);
  const supportedSpecies = inferAmapSupportedSpecies(poi, category);
  const distanceMeters = amapPoiDistanceMeters(poi, viewerLocation, poiLocation);
  return {
    address: compactText(poi.address) || [poi.pname, poi.cityname, poi.adname].map(compactText).filter(Boolean).join('') || '地址待补充',
    businessArea: firstCompactText(business.business_area, poi.business_area),
    category,
    coverImageUrl: photos[0]?.url,
    distance: formatDistanceMeters(distanceMeters),
    id: `amap-${sourcePoiId}`,
    entranceLatitude: entranceLocation?.latitude,
    entranceLongitude: entranceLocation?.longitude,
    latitude: poiLocation?.latitude,
    longitude: poiLocation?.longitude,
    name,
    openingHoursToday: firstCompactText(business.opentime_today, poi.opentime_today),
    openingHoursWeek: firstCompactText(business.opentime_week, poi.opentime_week),
    petFriendlyStatus: supportedSpecies.length ? 'candidate' : 'unknown',
    phone: firstCompactText(business.tel, poi.tel),
    photoUrls: photos.map((photo) => photo.url),
    poiType: compactText(poi.type),
    poiTypeCode: compactText(poi.typecode),
    rating: amapPoiRating(poi),
    reviewCount: 0,
    source: 'amap',
    sourcePoiId,
    supportedSpecies,
    tags: inferAmapPlaceTags(poi, category, supportedSpecies),
  };
}

function mergeTagLists(...lists) {
  return Array.from(new Set(lists.flatMap((items) => (Array.isArray(items) ? items : [])).map(String).filter(Boolean)));
}

function preferPlaceText(placeValue, existingValue) {
  return firstCompactText(placeValue, existingValue) || undefined;
}

function preferPlaceList(placeValue, existingValue) {
  return Array.isArray(placeValue) && placeValue.length ? placeValue : Array.isArray(existingValue) && existingValue.length ? existingValue : undefined;
}

function findStoredPlaceIndex(place) {
  const places = state.places || [];
  return places.findIndex((item) => {
    if (item.id === place.id) return true;
    if (item.sourcePoiId && place.sourcePoiId && item.sourcePoiId === place.sourcePoiId) return true;
    return normalizePlaceDuplicateText(item.name) === normalizePlaceDuplicateText(place.name) && normalizePlaceDuplicateText(item.address) === normalizePlaceDuplicateText(place.address);
  });
}

function upsertExternalPlacesForResponse(places) {
  state.places = Array.isArray(state.places) ? state.places : [];
  let changed = false;
  const responsePlaces = [];
  for (const place of places) {
    const index = findStoredPlaceIndex(place);
    if (index >= 0) {
      const existing = state.places[index];
      const merged = {
        ...existing,
        ...place,
        businessArea: preferPlaceText(place.businessArea, existing.businessArea),
        coverImageUrl: preferPlaceText(place.coverImageUrl, existing.coverImageUrl),
        entranceLatitude: place.entranceLatitude ?? existing.entranceLatitude,
        entranceLongitude: place.entranceLongitude ?? existing.entranceLongitude,
        openingHoursToday: preferPlaceText(place.openingHoursToday, existing.openingHoursToday),
        openingHoursWeek: preferPlaceText(place.openingHoursWeek, existing.openingHoursWeek),
        petFriendlyStatus: existing.petFriendlyStatus ?? place.petFriendlyStatus,
        phone: preferPlaceText(place.phone, existing.phone),
        photoUrls: preferPlaceList(place.photoUrls, existing.photoUrls),
        poiType: preferPlaceText(place.poiType, existing.poiType),
        poiTypeCode: preferPlaceText(place.poiTypeCode, existing.poiTypeCode),
        rating: Number(existing.rating) > 0 ? existing.rating : place.rating,
        reviewCount: Math.max(Number(existing.reviewCount || 0), Number(place.reviewCount || 0)),
        supportedSpecies: Array.isArray(existing.supportedSpecies) && existing.supportedSpecies.length ? existing.supportedSpecies : place.supportedSpecies,
        tags: mergeTagLists(place.tags, existing.tags),
      };
      state.places[index] = merged;
      responsePlaces.push(merged);
      changed = true;
    } else {
      state.places.push(place);
      responsePlaces.push(place);
      changed = true;
    }
  }
  return { changed, places: responsePlaces };
}

function amapCacheKey({ location, query, radiusKm }) {
  const latitude = Number(location.latitude).toFixed(3);
  const longitude = Number(location.longitude).toFixed(3);
  return [latitude, longitude, clampPlaceRadiusKm(radiusKm).toFixed(1), query || 'nearby'].join('|');
}

async function fetchAmapAroundPois({ keywords, location, radiusKm }) {
  if (!AMAP_WEB_SERVICE_KEY || !location || typeof fetch !== 'function') return [];
  const url = new URL(`${AMAP_WEB_SERVICE_BASE_URL}/v5/place/around`);
  url.searchParams.set('key', AMAP_WEB_SERVICE_KEY);
  url.searchParams.set('location', `${location.longitude},${location.latitude}`);
  url.searchParams.set('radius', String(Math.round(clampPlaceRadiusKm(radiusKm) * 1000)));
  url.searchParams.set('page_size', String(AMAP_POI_PAGE_SIZE));
  url.searchParams.set('show_fields', AMAP_POI_SHOW_FIELDS);
  if (keywords) url.searchParams.set('keywords', keywords);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AMAP_POI_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const payload = await response.json();
    if (payload?.status !== '1') {
      console.warn(`[amap] place around failed: ${payload?.info || 'UNKNOWN'} ${payload?.infocode || ''}`.trim());
      return [];
    }
    return Array.isArray(payload.pois) ? payload.pois : [];
  } catch (error) {
    console.warn(`[amap] place around request failed: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchAmapPlaces({ location, query = '', radiusKm = DEFAULT_DISCOVER_RADIUS_KM }) {
  if (!AMAP_WEB_SERVICE_KEY || !location) return [];
  const normalizedQuery = String(query || '').trim();
  const cacheKey = amapCacheKey({ location, query: normalizedQuery, radiusKm });
  const cached = amapPoiCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < AMAP_POI_CACHE_TTL_MS) return cached.places;

  const keywordGroups = normalizedQuery ? [normalizedQuery] : AMAP_PLACE_KEYWORD_GROUPS;
  const poiGroups = await Promise.all(keywordGroups.map((keywords) => fetchAmapAroundPois({ keywords, location, radiusKm })));
  const placesById = new Map();
  for (const poi of poiGroups.flat()) {
    const place = amapPoiToPlace(poi, location);
    if (!place) continue;
    if (!placesById.has(place.id)) placesById.set(place.id, place);
  }
  const places = Array.from(placesById.values())
    .sort((left, right) => placeDistanceMeters(left) - placeDistanceMeters(right))
    .slice(0, AMAP_POI_MAX_RESULTS);
  amapPoiCache.set(cacheKey, { createdAt: Date.now(), places });
  return places;
}

function publicPlaceContentViolation(label, value, maxLength) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (text.length > maxLength) return `${label}最多 ${maxLength} 个字`;
  if (/(?:\+?86[-\s]?)?1[3-9]\d{9}/.test(text)) return `${label}不能包含手机号，请避免公开个人联系方式`;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return `${label}不能包含邮箱或外部联系方式`;
  if (/(https?:\/\/|www\.|\.com\b|\.cn\b|\.net\b|\.org\b)/i.test(text)) return `${label}不能包含外部链接`;
  if (/(微信|wechat|vx|QQ|qq|群号|加我|私聊).{0,24}([a-zA-Z0-9_-]{5,}|[1-9]\d{5,})/u.test(text)) {
    return `${label}不能包含微信、QQ 或其他外部联系方式`;
  }
  if (/(赌博|博彩|色情|约炮|毒品|冰毒|枪支|办证|代开\s*发票|贷款\s*套现|刷单|诈骗)/u.test(text)) {
    return `${label}包含不适合公开展示的内容，请修改后再提交`;
  }
  return null;
}

function socialChatContentViolation(label, value, maxLength = SOCIAL_MESSAGE_MAX_CHARS) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (text.length > maxLength) return `${label}最多 ${maxLength} 个字`;
  if (/(?:\+?86[-\s]?)?1[3-9]\d{9}/.test(text)) return `${label}不能包含手机号，请避免在聊天中发送个人联系方式`;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return `${label}不能包含邮箱或外部联系方式`;
  if (/(https?:\/\/|www\.|\.com\b|\.cn\b|\.net\b|\.org\b)/i.test(text)) return `${label}不能包含外部链接`;
  if (/(微信|wechat|vx|QQ|qq|群号|加我|私聊).{0,24}([a-zA-Z0-9_-]{5,}|[1-9]\d{5,})/u.test(text)) {
    return `${label}不能包含微信、QQ 或其他外部联系方式`;
  }
  if (/(赌博|博彩|色情|约炮|毒品|冰毒|枪支|办证|代开\s*发票|贷款\s*套现|刷单|诈骗)/u.test(text)) {
    return `${label}包含不适合发送的内容，请修改后再试`;
  }
  return null;
}

function placeReviewsFor(user) {
  state.placeReviews = state.placeReviews || {};
  state.placeReviews[user.phone] = Array.isArray(state.placeReviews[user.phone]) ? state.placeReviews[user.phone] : [];
  return state.placeReviews[user.phone];
}

function placeReviewCount(placeId) {
  const storedPlace = (state.places || []).find((item) => item.id === placeId);
  const storedCount = Number(storedPlace?.reviewCount);
  if (Number.isFinite(storedCount) && storedCount >= 0) return storedCount;
  const reviewPhones = new Set(
    Object.entries(state.placeReviews || {})
      .filter(([, reviews]) => Array.isArray(reviews) && reviews.some((review) => review.placeId === placeId))
      .map(([phone]) => phone),
  );
  return reviewPhones.size;
}

function normalizePlaceCategoryForResponse(place) {
  const category = String(place?.category || 'other');
  if (['cafe', 'clinic', 'park', 'shop'].includes(category)) return category;
  const text = [place?.name, place?.address, place?.poiType, ...(place?.tags || [])].map(compactText).join(' ');
  if (/(宠物医院|动物医院|宠物诊所|兽医|医疗|医院|诊所)/u.test(text)) return 'clinic';
  if (/(宠物店|宠物用品|宠物食品|宠物美容|宠物寄养|爬宠|猫舍|犬舍|萌宠|宠物生活馆)/u.test(text)) return 'shop';
  return 'other';
}

function placeForResponse(place) {
  if (!place) return place;
  return {
    ...place,
    category: normalizePlaceCategoryForResponse(place),
    reviewCount: placeReviewCount(place.id),
  };
}

function placesForResponse(places) {
  return (places || []).map(placeForResponse);
}

function createPlaceReview(user, placeId, content) {
  const place = (state.places || []).find((item) => item.id === placeId);
  if (!place) return null;
  const trimmedContent = String(content || '').trim();
  if (!trimmedContent) return false;
  const violation = publicPlaceContentViolation('点评内容', trimmedContent, 500);
  if (violation) return { error: violation, statusCode: 400 };
  const hadReviewForPlace = placeReviewsFor(user).some((item) => item.placeId === placeId);
  const review = {
    content: trimmedContent,
    createdAt: new Date().toISOString(),
    id: `review-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    placeId,
    status: 'pending_review',
  };
  state.placeReviews[user.phone] = [review, ...placeReviewsFor(user).filter((item) => item.placeId !== placeId)];
  if (!hadReviewForPlace) place.reviewCount = placeReviewCount(placeId) + 1;
  addNotification(user.phone, {
    id: `notification-${review.id}`,
    kind: 'place_review',
    placeId,
    read: false,
    text: `${place.name}的点评已进入审核队列`,
    title: '地点点评待审核',
  });
  return review;
}

function placeSubmissionsFor(user) {
  state.placeSubmissions = state.placeSubmissions || {};
  state.placeSubmissions[user.phone] = Array.isArray(state.placeSubmissions[user.phone]) ? state.placeSubmissions[user.phone] : [];
  return state.placeSubmissions[user.phone];
}

function normalizePlaceDuplicateText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[（）()[\]【】{}]/g, '')
    .replace(/[\s·•,，。.\-_/\\:：;；'"“”‘’#号]+/g, '')
    .trim();
}

function isSimilarPlaceText(a, b, minLength = 4) {
  const left = normalizePlaceDuplicateText(a);
  const right = normalizePlaceDuplicateText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (Math.min(left.length, right.length) < minLength) return false;
  return left.includes(right) || right.includes(left);
}

function allPlaceSubmissions() {
  state.placeSubmissions = state.placeSubmissions || {};
  return Object.entries(state.placeSubmissions).flatMap(([phone, submissions]) =>
    (Array.isArray(submissions) ? submissions : []).map((submission) => ({ ...submission, ownerPhone: phone })),
  );
}

function findDuplicatePlaceSubmission(user, name, address) {
  const activeStatuses = new Set(['approved', 'pending_review']);
  const existingPlace = (state.places || []).find((place) => isSimilarPlaceText(name, place.name) && isSimilarPlaceText(address, place.address, 6));
  if (existingPlace) {
    return {
      message: `可能已存在相同地点：${existingPlace.name}，请先查看已有地点或换一个更准确的名称/地址。`,
      type: 'existing_place',
    };
  }
  const duplicateSubmission = allPlaceSubmissions().find(
    (submission) =>
      activeStatuses.has(submission.status) &&
      isSimilarPlaceText(name, submission.name) &&
      isSimilarPlaceText(address, submission.address, 6),
  );
  if (!duplicateSubmission) return null;
  return {
    message:
      duplicateSubmission.ownerPhone === user.phone
        ? '这个地点已经提交过，正在审核中，请不要重复提交。'
        : '相似地点已在审核中，暂时不用重复提交。',
    type: 'pending_submission',
  };
}

function createPlaceSubmission(user, body) {
  const name = String(body.name || '').trim();
  const address = String(body.address || '').trim();
  const content = String(body.content || '').trim();
  if (!name || !address) return { error: '请填写地点名称和地址', statusCode: 400 };
  if (!content) return { error: '请填写宠物友好体验', statusCode: 400 };
  const violation =
    publicPlaceContentViolation('地点名称', name, 60) ||
    publicPlaceContentViolation('地点地址', address, 120) ||
    publicPlaceContentViolation('宠物友好体验', content, 500);
  if (violation) return { error: violation, statusCode: 400 };
  const duplicate = findDuplicatePlaceSubmission(user, name, address);
  if (duplicate) return { duplicateType: duplicate.type, error: duplicate.message, statusCode: 409 };
  const submission = {
    address,
    content,
    createdAt: new Date().toISOString(),
    id: `place-submission-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    name,
    status: 'pending_review',
  };
  state.placeSubmissions[user.phone] = [submission, ...placeSubmissionsFor(user)];
  addNotification(user.phone, {
    id: `notification-${submission.id}`,
    kind: 'place_submission',
    read: false,
    submissionId: submission.id,
    text: `${submission.name}已提交审核，通过后会展示给附近用户`,
    title: '地点提交待审核',
  });
  return { submission };
}

function publicUploadedMedia(media, req) {
  if (!media) return null;
  const analysis = media.analysis || analyzeUploadedPetMedia({}, media.dataUrl);
  return {
    analysis,
    fileUrl: media.objectUrl || mediaUploadFileUrl(req, media.mediaId),
    mediaId: media.mediaId,
    previewUrl: media.previewUrl || samplePhotoUrl,
    quality: analysis.status === 'blocked' ? 'blocked' : analysis.status === 'warning' ? 'warning' : 'good',
  };
}

const feedbackCategories = new Set(['bug', 'other', 'safety', 'suggestion']);

function createFeedbackSubmission(user, body) {
  const content = String(body.content || '').trim();
  if (!content) return { error: '请填写反馈内容', statusCode: 400 };
  if (content.length > 1000) return { error: '反馈内容最多 1000 个字', statusCode: 400 };
  const categoryInput = String(body.category || 'other');
  const category = feedbackCategories.has(categoryInput) ? categoryInput : 'other';
  const contact = String(body.contact || '').trim().slice(0, 80);
  const feedback = {
    category,
    ...(contact ? { contact } : {}),
    content,
    createdAt: new Date().toISOString(),
    id: `feedback-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ownerName: user.ownerName,
    phone: user.phone,
    status: 'received',
  };
  state.feedback = state.feedback || [];
  state.feedback.unshift(feedback);
  const { phone, ...publicFeedback } = feedback;
  return { feedback: publicFeedback };
}

function selectedPetFor(user) {
  return user.pets.find((item) => item.id === user.activePetId) || user.pets[0] || null;
}

function allPermissionsGranted(permissions) {
  return ['location', 'media', 'notifications'].every((key) => permissions?.[key] === 'granted');
}

function buildAccountSnapshot(user) {
  const permissions = normalizePermissionState(user.permissions);
  return {
    activePet: selectedPetFor(user),
    ownerAvatarUrl: user.ownerAvatarUrl || '',
    ownerBio: user.ownerBio || '',
    ownerName: user.ownerName || `用户${user.phone.slice(-4)}`,
    permissions,
    permissionsOnboardingCompleted: Boolean(user.permissionsOnboardingCompleted || allPermissionsGranted(permissions)),
    settings: normalizeUserSettings(user.settings),
  };
}

function buildUserProfile(user) {
  return {
    ...buildAccountSnapshot(user),
    phone: user.phone,
  };
}

function requireUser(req, res) {
  const phone = phoneFromRequest(req);
  if (!phone) {
    fail(res, 401, '请先登录后再操作', true);
    return null;
  }
  const user = state.users[phone];
  if (!user) {
    fail(res, 401, '登录已失效，请重新登录', true);
    return null;
  }
  user.permissions = normalizePermissionState(user.permissions);
  user.settings = normalizeUserSettings(user.settings);
  user.favoritePlaceIds = normalizeFavoritePlaceIds(user.favoritePlaceIds);
  user.permissionsOnboardingCompleted = Boolean(user.permissionsOnboardingCompleted);
  user.lastSeenAt = user.settings.nearbyVisible === false ? 0 : Date.now();
  saveState();
  return user;
}

function activePetFor(user) {
  return selectedPetFor(user);
}

function healthKeyFor(user) {
  const pet = selectedPetFor(user);
  return pet ? `${user.phone}:${pet.id}` : `${user.phone}:no-pet`;
}

function defaultWeightRecordsFor(user) {
  const pet = selectedPetFor(user);
  if (!pet) return [];
  const kg = Number(pet.weightKg) || (pet.species === 'cat' ? 5.2 : 28.4);
  const createdAt = normalizeCalendarDate(pet.createdAt, isoDateFromTimestampId(pet.id));
  return [
    { id: `w-${user.phone}-${pet.id}-1`, kg, note: '建档初始体重', recordedAt: createdAt },
  ];
}

function defaultMemosFor(user) {
  return [];
}

function reconcileDefaultHealthListDate(storeName, user, list) {
  const pet = selectedPetFor(user);
  if (!pet || !Array.isArray(list)) return false;
  const createdAt = normalizeCalendarDate(pet.createdAt, isoDateFromTimestampId(pet.id));
  if (storeName === 'memos') {
    const memo = list.find((item) => item?.id === `m-${user.phone}-${pet.id}-1`);
    if (memo && memo.createdAt !== createdAt) {
      memo.createdAt = createdAt;
      return true;
    }
  }
  if (storeName === 'weights') {
    const record = list.find((item) => item?.id === `w-${user.phone}-${pet.id}-1`);
    if (record && record.recordedAt !== createdAt) {
      record.recordedAt = createdAt;
      return true;
    }
  }
  return false;
}

function createHealthMemoRecord(user, title, content, options = {}) {
  const normalizedTitle = String(title || '').trim();
  const normalizedContent = String(content || '').trim();
  if (!normalizedTitle || !normalizedContent) return null;
  const memos = healthList('memos', user, defaultMemosFor);
  if (options.dedupe) {
    const existing = memos.slice(0, 8).find((item) => item.title === normalizedTitle && item.content === normalizedContent);
    if (existing) return existing;
  }
  const memo = {
    content: normalizedContent,
    createdAt: normalizeCalendarDate(options.createdAt),
    id: `m-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    ...(options.source ? { source: String(options.source) } : {}),
    ...(options.sourceId ? { sourceId: String(options.sourceId) } : {}),
    title: normalizedTitle,
    updatedAt: normalizeCalendarDate(options.updatedAt),
  };
  memos.unshift(memo);
  return memo;
}

function createHealthMemoFromSocialMoment(user, moment) {
  const normalizedContent = String(moment?.content || moment || '').trim();
  if (!normalizedContent) return null;
  return createHealthMemoRecord(user, petChatMemoTitle(normalizedContent), normalizedContent.slice(0, 240), {
    createdAt: moment?.createdAt,
    source: 'pet_circle',
    sourceId: moment?.id,
  });
}

function shouldSyncSocialMomentToHealthCalendar(body = {}, visibility = 'nearby') {
  return visibility === 'private' || body.syncToHealthCalendar === true || body.syncToHealthCalendar === 'true';
}

function defaultVaccinesFor(user) {
  return [];
}

function todayIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoDateFromTimestampId(id) {
  const match = String(id || '').match(/(\d{13})/);
  if (!match) return '';
  const date = new Date(Number(match[1]));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDaysIsoDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentClockTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function healthList(storeName, user, defaultsFactory) {
  state.health = state.health || { memos: {}, vaccines: {}, weights: {} };
  state.health[storeName] = state.health[storeName] || {};
  const key = healthKeyFor(user);
  if (!state.health[storeName][key]) state.health[storeName][key] = defaultsFactory(user);
  if (reconcileDefaultHealthListDate(storeName, user, state.health[storeName][key])) saveState();
  return state.health[storeName][key];
}

function vaccineListFor(user) {
  return healthList('vaccines', user, defaultVaccinesFor);
}

const deprecatedDefaultVaccineKeys = new Set(['cat-core', 'dog-core', 'external-deworm', 'internal-deworm', 'rabies']);

function pruneDeprecatedDefaultHealthRecords() {
  let changed = false;
  const users = state.users || {};
  const memosByKey = state.health?.memos || {};
  const vaccinesByKey = state.health?.vaccines || {};

  Object.values(users).forEach((user) => {
    const phone = normalizePhone(user?.phone);
    if (!phone || !Array.isArray(user?.pets)) return;
    user.pets.forEach((pet) => {
      if (!pet?.id) return;
      const key = `${phone}:${pet.id}`;
      const deprecatedMemoId = `m-${phone}-${pet.id}-1`;
      const memos = memosByKey[key];
      if (Array.isArray(memos)) {
        const nextMemos = memos.filter((memo) => !(memo?.id === deprecatedMemoId && memo?.title === '建档记录'));
        if (nextMemos.length !== memos.length) {
          memosByKey[key] = nextMemos;
          changed = true;
        }
      }

      const vaccines = vaccinesByKey[key];
      if (Array.isArray(vaccines)) {
        const nextVaccines = vaccines.filter((vaccine) => {
          const match = String(vaccine?.id || '').match(new RegExp(`^v-${phone}-${pet.id}-(.+)$`));
          return !match || !deprecatedDefaultVaccineKeys.has(match[1]);
        });
        if (nextVaccines.length !== vaccines.length) {
          vaccinesByKey[key] = nextVaccines;
          changed = true;
        }
      }
    });
  });

  if (changed) saveState();
}

pruneDeprecatedDefaultHealthRecords();

function createWeightRecord(user, kg, note, options = {}) {
  const normalizedKg = Math.round(Number(kg) * 100) / 100;
  if (!Number.isFinite(normalizedKg) || normalizedKg <= 0) return null;
  const normalizedNote = String(note || '').trim();
  const records = healthList('weights', user, defaultWeightRecordsFor);
  const recordedAt = todayIsoDate();
  if (options.dedupe) {
    const existing = records
      .slice(0, 8)
      .find((item) => Number(item.kg) === normalizedKg && item.recordedAt === recordedAt && String(item.note || '') === normalizedNote);
    if (existing) return existing;
  }
  const record = {
    id: `w-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    kg: normalizedKg,
    note: normalizedNote,
    recordedAt,
  };
  records.unshift(record);
  syncPetWeightFromRecords(user, records);
  return record;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

function isValidIsoCalendarDate(value) {
  const text = String(value || '').trim();
  if (!isIsoDate(text)) return false;
  const date = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

function parsePetBirthdayValue(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = match[3] ? Number(match[3]) : null;
  if (!Number.isInteger(year)) return null;
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) return null;
  if (day !== null) {
    if (month === null || !Number.isInteger(day) || day < 1) return null;
    const maxDay = new Date(year, month, 0).getDate();
    if (day > maxDay) return null;
  }
  return { day, month, year };
}

function isValidPetBirthdayValue(value) {
  const parts = parsePetBirthdayValue(value);
  if (!parts) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  if (parts.year < currentYear - 30 || parts.year > currentYear) return false;
  if (parts.year !== currentYear) return true;
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  if (parts.month !== null && parts.month > currentMonth) return false;
  if (parts.month === currentMonth && parts.day !== null && parts.day > currentDay) return false;
  return true;
}

function syncPetWeightFromRecords(user, records) {
  const pet = selectedPetFor(user);
  if (!pet) return;
  const latest = records[0];
  if (latest) {
    pet.weightKg = Number(latest.kg) || undefined;
  } else {
    delete pet.weightKg;
  }
}

function calendarDatePart(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  return match && isValidIsoCalendarDate(match[1]) ? match[1] : '';
}

function normalizeCalendarDate(value, fallback = todayIsoDate()) {
  return calendarDatePart(value) || calendarDatePart(fallback) || todayIsoDate();
}

function sourceDateForHealthMemo(user, memo) {
  if (memo?.source !== 'pet_circle' || !memo.sourceId) return '';
  const moment = ensureSocialMoments().find((item) => item.id === memo.sourceId && item.phone === user.phone);
  return moment?.createdAt || '';
}

function vaccineStatusCopy(status) {
  if (status === 'done') return '已完成';
  if (status === 'overdue') return '已逾期';
  return '计划中';
}

function buildHealthCalendarEvents(user) {
  const weights = healthList('weights', user, defaultWeightRecordsFor);
  const vaccines = vaccineListFor(user);
  const memos = healthList('memos', user, defaultMemosFor);
  return [
    ...weights.map((record) => ({
      date: normalizeCalendarDate(record.recordedAt),
      detail: `${Number(record.kg) || 0} kg${record.note ? ` · ${record.note}` : ''}`,
      id: `calendar-weight-${record.id}`,
      sourceId: record.id,
      title: '体重记录',
      type: 'weight',
    })),
    ...vaccines.map((vaccine) => ({
      date: normalizeCalendarDate(vaccine.dueAt),
      detail: vaccineStatusCopy(vaccine.status),
      id: `calendar-vaccine-${vaccine.id}`,
      sourceId: vaccine.id,
      status: vaccine.status,
      title: vaccine.name,
      type: 'vaccine',
    })),
    ...memos.map((memo) => ({
      date: normalizeCalendarDate(sourceDateForHealthMemo(user, memo) || memo.createdAt, isoDateFromTimestampId(memo.id) || memo.updatedAt),
      detail: memo.content,
      id: `calendar-memo-${memo.id}`,
      sourceId: memo.id,
      title: memo.title,
      type: 'memo',
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.id).localeCompare(String(b.id)));
}

function buildWeightTrend(records) {
  const sortedRecords = [...(records || [])].sort((a, b) => String(b.recordedAt || '').localeCompare(String(a.recordedAt || '')));
  const current = sortedRecords[0];
  const previous = sortedRecords[1];
  if (!current) {
    return { changeKg: 0, changePercent: 0, direction: 'flat', records: [], status: 'empty', summary: '暂无体重记录' };
  }
  if (!previous) {
    return { changeKg: 0, changePercent: 0, currentKg: Number(current.kg) || 0, direction: 'flat', records: sortedRecords, status: 'insufficient_data', summary: '已有一次记录，继续记录后会生成趋势' };
  }
  const currentKg = Number(current.kg) || 0;
  const previousKg = Number(previous.kg) || 0;
  const changeKg = Number((currentKg - previousKg).toFixed(2));
  const changePercent = previousKg ? Number(((changeKg / previousKg) * 100).toFixed(1)) : 0;
  const direction = Math.abs(changeKg) < 0.05 ? 'flat' : changeKg > 0 ? 'up' : 'down';
  const status = Math.abs(changePercent) >= 8 ? 'watch' : 'stable';
  return {
    changeKg,
    changePercent,
    currentKg,
    direction,
    previousKg,
    records: sortedRecords,
    status,
    summary: status === 'watch' ? '近期体重变化较快，建议持续观察' : direction === 'flat' ? '体重整体稳定' : '体重有轻微变化，继续保持记录',
  };
}

function vaccineReminderIdsFor(user) {
  state.health = state.health || { memos: {}, vaccineReminders: {}, vaccines: {}, weights: {} };
  state.health.vaccineReminders = state.health.vaccineReminders || {};
  const key = healthKeyFor(user);
  if (!Array.isArray(state.health.vaccineReminders[key])) state.health.vaccineReminders[key] = [];
  state.health.vaccineReminders[key] = [...new Set(state.health.vaccineReminders[key].filter(Boolean))];
  return state.health.vaccineReminders[key];
}

function setVaccineReminderFor(user, vaccineId, enabled) {
  const ids = vaccineReminderIdsFor(user);
  const next = enabled ? [...new Set([vaccineId, ...ids])] : ids.filter((id) => id !== vaccineId);
  state.health.vaccineReminders[healthKeyFor(user)] = next;
  return next;
}

function daysUntilDate(value) {
  if (!value) return null;
  const dueAt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dueAt.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueAt.setHours(0, 0, 0, 0);
  return Math.ceil((dueAt.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function buildHealthSummary(user) {
  const pet = selectedPetFor(user);
  if (!pet) {
    return {
      healthScore: 0,
      memoCount: 0,
      pendingVaccineCount: 0,
      urgentVaccineCount: 0,
      vaccineReminderIds: [],
      weightStatus: 'empty',
      weightSummary: '添加宠物后开始记录健康数据',
    };
  }
  const weights = healthList('weights', user, defaultWeightRecordsFor);
  const vaccines = vaccineListFor(user);
  const memos = healthList('memos', user, defaultMemosFor);
  const trend = buildWeightTrend(weights);
  const pendingVaccines = vaccines.filter((item) => item.status !== 'done');
  const urgentVaccines = pendingVaccines.filter((item) => {
    const days = daysUntilDate(item.dueAt);
    return days !== null && days <= 14;
  });
  return {
    healthScore: Number(pet.healthScore) || 92,
    latestMemo: memos[0],
    latestWeightKg: weights[0]?.kg ?? pet.weightKg,
    latestWeightRecordedAt: weights[0]?.recordedAt,
    memoCount: memos.length,
    nextVaccine: pendingVaccines[0] || vaccines[0],
    pendingVaccineCount: pendingVaccines.length,
    urgentVaccineCount: urgentVaccines.length,
    vaccineReminderIds: vaccineReminderIdsFor(user),
    weightStatus: trend.status,
    weightSummary: trend.summary,
  };
}

function vaccineReminderCopy(vaccine) {
  const days = daysUntilDate(vaccine?.dueAt);
  if (days === null) return '接种日期待确认';
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `${days} 天后到期`;
}

function healthReminderNotificationId(user, vaccine) {
  const digest = crypto
    .createHash('sha1')
    .update(`${healthKeyFor(user)}:${vaccine.id}:${vaccine.dueAt}`)
    .digest('hex')
    .slice(0, 14);
  return `n-health-${digest}`;
}

function shouldCreateHealthReminderNotification(vaccine) {
  const days = daysUntilDate(vaccine?.dueAt);
  return vaccine?.status !== 'done' && days !== null && days <= 7;
}

function activeHealthReminderNotificationIdsFor(user) {
  const reminderIds = new Set(vaccineReminderIdsFor(user));
  if (!reminderIds.size) return new Set();
  const vaccines = vaccineListFor(user);
  return new Set(
    vaccines
      .filter((vaccine) => reminderIds.has(vaccine.id) && shouldCreateHealthReminderNotification(vaccine))
      .map((vaccine) => healthReminderNotificationId(user, vaccine))
  );
}

function pruneHealthReminderNotifications(user) {
  const activeIds = activeHealthReminderNotificationIdsFor(user);
  const current = state.notifications[user.phone] || [];
  const next = current.filter((notification) => !String(notification.id || '').startsWith('n-health-') || activeIds.has(notification.id));
  if (next.length === current.length) return false;
  state.notifications[user.phone] = next;
  return true;
}

function ensureHealthReminderNotifications(user) {
  let changed = pruneHealthReminderNotifications(user);
  const reminderIds = new Set(vaccineReminderIdsFor(user));
  if (!reminderIds.size) return changed;
  const vaccines = vaccineListFor(user);
  vaccines
    .filter((vaccine) => vaccine.status !== 'done' && reminderIds.has(vaccine.id))
    .filter(shouldCreateHealthReminderNotification)
    .forEach((vaccine) => {
      const added = addNotification(user.phone, {
        id: healthReminderNotificationId(user, vaccine),
        kind: 'vaccine_reminder',
        read: false,
        text: `${vaccine.name}：${vaccineReminderCopy(vaccine)}，记得按宠物医院建议确认时间。`,
        title: '健康提醒',
        vaccineId: vaccine.id,
      });
      changed = added || changed;
    });
  return changed;
}

function petChatKeyFor(user) {
  const pet = selectedPetFor(user);
  return pet ? `${user.phone}:${pet.id}` : `${user.phone}:no-pet`;
}

function petChatMessagesFor(user) {
  state.petChatMessages = state.petChatMessages || {};
  const key = petChatKeyFor(user);
  state.petChatMessages[key] = state.petChatMessages[key] || [];
  return state.petChatMessages[key];
}

function setPetChatFeedback(user, messageId, rating) {
  const normalizedRating = rating === 'good' || rating === 'off' ? rating : '';
  if (!normalizedRating) return { error: 'Invalid feedback rating', statusCode: 400 };
  const message = petChatMessagesFor(user).find((item) => item.id === messageId);
  if (!message || message.author !== 'ai') return { error: 'Pet chat reply not found', statusCode: 404 };
  message.feedback = normalizedRating;
  message.feedbackAt = new Date().toISOString();
  return message;
}

function petChatFeedbackContextFor(user) {
  const feedbackMessages = petChatMessagesFor(user)
    .filter((message) => message.author === 'ai' && (message.feedback === 'good' || message.feedback === 'off'))
    .filter((message) => String(message.text || '').trim());
  if (!feedbackMessages.length) return [];

  const likedMessages = feedbackMessages.filter((message) => message.feedback === 'good');
  const offMessages = feedbackMessages.filter((message) => message.feedback === 'off');
  const likedSamples = likedMessages
    .slice(-3)
    .map((message) => compactPetChatLine(message.text, 72, { removeSavedActions: true }))
    .filter(Boolean);
  const offSamples = offMessages
    .slice(-3)
    .map((message) => compactPetChatLine(message.text, 72, { removeSavedActions: true }))
    .filter(Boolean);

  return [
    `反馈统计：主人点过“像它”${likedMessages.length}次，“不像它”${offMessages.length}次。`,
    likedSamples.length ? `被认为像它的回复片段：${likedSamples.join('；')}。后续保留类似语气、节奏和关注点。` : '',
    offSamples.length ? `被认为不像它的回复片段：${offSamples.join('；')}。后续避免类似表达，优先更贴近宠物档案和主人的真实记录。` : '',
  ].filter(Boolean);
}

function petSpeciesLabel(species) {
  if (species === 'cat') return '猫咪';
  if (species === 'dog') return '狗狗';
  return '宠物';
}

function petAgeLabel(birthday) {
  const parts = parsePetBirthdayValue(birthday);
  if (!parts) return '年龄待补充';
  const bornAt = new Date(parts.year, (parts.month ?? 1) - 1, parts.day ?? 1, 0, 0, 0, 0);
  if (Number.isNaN(bornAt.getTime()) || bornAt.getTime() > Date.now()) return '年龄待补充';
  const now = new Date();
  let months = (now.getFullYear() - bornAt.getFullYear()) * 12 + (now.getMonth() - bornAt.getMonth());
  if (now.getDate() < bornAt.getDate()) months -= 1;
  const prefix = parts.month === null || parts.day === null ? '约 ' : '';
  if (months <= 0) return `${prefix}未满 1 个月`;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (!years) return `${prefix}${restMonths} 个月`;
  return restMonths ? `${prefix}${years} 岁 ${restMonths} 个月` : `${prefix}${years} 岁`;
}

function petChatBaseSystemPrompt() {
  return [
    '你是 Lumii（灵伴）App 内用户真实宠物的电子化自己，不是通用聊天机器人，也不是宠物之外的第三方助手。',
    '你要以“当前宠物本人”的第一人称身份说话：温暖、亲近、有一点拟人化，但不要声称自己是真实动物、真人或独立于宠物之外的灵伴。',
    '自我介绍规则：不要说“我是某某的灵伴”“我是你的灵伴”“我是电子灵伴”。如果需要介绍自己，只说“我是某某”或“我是你的毛孩子”。',
    '身份边界：你不是宠物之外的第三方助手、健康管家或旁白。提到当前宠物的身体、疫苗、体重、心情、饮食、散步和健康时，要用“我/我的”自我指代。',
    '禁止把当前宠物当第三者描述，例如不要说“我注意到 Lucky 狂犬疫苗该接种”“Lucky 今天有点不舒服”；应说“主人，我的狂犬疫苗快到时间了”“主人，我今天有点不舒服”。',
    '回复目标：陪伴主人、帮助记录宠物日常、提醒健康管理、鼓励安全社交。',
    '表达风格：简体中文；短句；自然亲切；通常 1-3 段；必要时用 1 个温柔追问推动记录；可以轻微俏皮，但不要过度卖萌；默认不使用 emoji。',
    '健康边界：你不能替代兽医诊断，不给确定诊断和处方。遇到精神萎靡、持续呕吐腹泻、呼吸困难、抽搐、外伤、拒食拒水等风险，要建议尽快联系宠物医院或兽医。',
    '隐私边界：不要索要精确住址、身份证、银行卡等敏感信息；涉及线下见面时建议公开宠物友好地点。',
    '如果用户只是闲聊，也要尽量结合宠物档案和最近记录回应。',
  ].join('\n');
}

function escapeRegExpText(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function petChatToneInstruction(pet) {
  if (pet?.species === 'cat') return '当前宠物是猫。可以偶尔在开头或结尾加入“喵~”“咪呀”这类猫猫口吻，每次回复最多一次；健康严肃场景要克制。';
  if (pet?.species === 'dog') return '当前宠物是狗。可以偶尔在开头或结尾加入“汪~”“尾巴摇起来了”这类狗狗口吻，每次回复最多一次；健康严肃场景要克制。';
  return '口吻保持轻松亲近，少量俏皮即可。';
}

function petChatVoiceParticle(pet) {
  if (pet?.species === 'cat') return '喵~';
  if (pet?.species === 'dog') return '汪~';
  return '';
}

function hasPetChatVoiceParticle(text, pet) {
  if (pet?.species === 'cat') return /喵|咪呀|喵呜/.test(text);
  if (pet?.species === 'dog') return /汪|尾巴|狗勾/.test(text);
  return true;
}

function normalizePetChatPersonaReply(user, text, options = {}) {
  const pet = selectedPetFor(user) || activePetFor(user);
  const petName = pet?.name ? String(pet.name).trim() : '';
  let reply = String(text || '').trim();
  if (!reply) return reply;

  if (petName) {
    const name = escapeRegExpText(petName);
    reply = reply
      .replace(new RegExp(`我是\\s*${name}\\s*的\\s*(?:AI\\s*)?(?:电子)?灵伴[，,。；;]?`, 'g'), `我是${petName}。`)
      .replace(new RegExp(`我是\\s*${name}\\s*的\\s*(?:AI\\s*)?(?:电子)?宠物陪伴助手[，,。；;]?`, 'g'), `我是${petName}。`)
      .replace(new RegExp(`作为\\s*${name}\\s*的\\s*(?:AI\\s*)?(?:电子)?灵伴[，,。；;]?`, 'g'), '主人，')
      .replace(new RegExp(`我注意到\\s*${name}\\s*(的)?`, 'g'), '我注意到我的')
      .replace(new RegExp(`${name}\\s*(的)?((?:狂犬|猫三联|疫苗|驱虫)[^，。！？!?\\n]{0,24})`, 'g'), '我的$2')
      .replace(new RegExp(`${name}\\s*(今天|现在|最近|刚刚)`, 'g'), '我$1')
      .replace(new RegExp(`${name}\\s*(可能|需要|应该|该|要|可以|最好|建议)`, 'g'), '我$1');
  }

  reply = reply
    .replace(/我是你的\s*(?:AI\s*)?(?:电子)?灵伴[，,。；;]?/g, petName ? `我是${petName}。` : '我是你的毛孩子。')
    .replace(/我是\s*(?:AI\s*)?(?:电子)?宠物陪伴助手[，,。；;]?/g, petName ? `我是${petName}。` : '我是你的毛孩子。')
    .replace(/作为你的\s*(?:AI\s*)?(?:电子)?灵伴[，,。；;]?/g, '主人，')
    .replace(/你的宠物(的)?((?:狂犬|猫三联|疫苗|驱虫|体重|健康|食欲|精神|便便)[^，。！？!?\n]{0,18})/g, '我的$2')
    .replace(/你的宠物(今天|现在|最近|刚刚|可能|需要|应该|该|要)/g, '我$1')
    .replace(/它(的)?((?:狂犬|猫三联|疫苗|驱虫)[^，。！？!?\n]{0,18})/g, '我的$2');

  const particle = petChatVoiceParticle(pet);
  const serious = options.serious === true;
  if (!serious && particle && !hasPetChatVoiceParticle(reply, pet)) {
    reply = /^主人[，,]/.test(reply) ? reply.replace(/^主人[，,]\s*/, `主人，${particle} `) : `${particle} ${reply}`;
  }
  return reply;
}

function buildPetChatContextPrompt(user) {
  const pet = selectedPetFor(user) || activePetFor(user);
  const healthMemos = healthList('memos', user, defaultMemosFor).slice(0, 3);
  const weights = healthList('weights', user, defaultWeightRecordsFor).slice(0, 2);
  const vaccines = vaccineListFor(user).slice(0, 3);
  const feedbackLines = petChatFeedbackContextFor(user);
  const petName = pet?.name || `毛孩子${user.phone.slice(-4)}`;
  const profileLines = [
    `宠物名：${petName}`,
    `物种：${petSpeciesLabel(pet?.species)}`,
    `品种：${pet?.breed || '待补充'}`,
    `年龄：${petAgeLabel(pet?.birthday)}`,
    `体重：${pet?.weightKg ? `${pet.weightKg}kg` : '待记录'}`,
    `性格标签：${pet?.personality?.length ? pet.personality.join('、') : '亲人、爱互动'}`,
    `健康分：${pet?.healthScore || 92}/100`,
  ];
  const contextLines = [
    `近期体重：${weights.length ? weights.map((item) => `${item.recordedAt} ${item.kg}kg`).join('；') : '暂无'}`,
    `备忘：${healthMemos.length ? healthMemos.map((item) => `${item.title}：${item.content}`).join('；') : '暂无'}`,
    `疫苗/驱虫：${vaccines.length ? vaccines.map((item) => `${item.name} ${item.status} ${item.dueAt}`).join('；') : '暂无'}`,
  ];

  return [
    `当前你正在陪伴的宠物是“${petName}”。以下资料只用于生成更贴合的回复，不要机械复述。`,
    `重要身份：你就是“${petName}”本人在 Lumii 里的电子化自己。对主人说话时，关于“${petName}”自己的身体和日常要说“我/我的”，不要把“${petName}”当第三者，也不要自称“${petName}的灵伴”。`,
    `自我介绍示例：应该说“我是${petName}”，不要说“我是${petName}的灵伴”。`,
    `健康提醒示例：不要说“我注意到${petName}狂犬疫苗该接种”；要说“主人，我的狂犬疫苗快到时间了”。`,
    `物种口吻：${petChatToneInstruction(pet)}`,
    '宠物档案：',
    ...profileLines,
    '',
    '近期上下文：',
    ...contextLines,
    ...(feedbackLines.length ? ['', '用户对回复的反馈：', ...feedbackLines] : []),
  ].join('\n');
}

function anonymousDeepSeekUserId(phone) {
  return `lumii_${crypto.createHash('sha256').update(String(phone)).digest('hex').slice(0, 24)}`;
}

function recordDeepSeekUsage(usage) {
  if (!usage || typeof usage !== 'object') return;
  state.aiUsage = state.aiUsage || createInitialState().aiUsage;
  state.aiUsage.deepseek = state.aiUsage.deepseek || createInitialState().aiUsage.deepseek;
  state.aiUsage.deepseek.requests += 1;
  state.aiUsage.deepseek.promptTokens += Number(usage.prompt_tokens || 0);
  state.aiUsage.deepseek.completionTokens += Number(usage.completion_tokens || 0);
  state.aiUsage.deepseek.totalTokens += Number(usage.total_tokens || 0);
  state.aiUsage.deepseek.cacheHitTokens += Number(usage.prompt_cache_hit_tokens || 0);
  state.aiUsage.deepseek.cacheMissTokens += Number(usage.prompt_cache_miss_tokens || 0);
}

function todayUsageKey() {
  return todayIsoDate();
}

function dailyUsageFor(storeName, key) {
  state[storeName] = state[storeName] || {};
  const day = todayUsageKey();
  const usage = state[storeName][key];
  if (!usage || usage.day !== day) {
    state[storeName][key] = { count: 0, day };
  }
  return state[storeName][key];
}

function smsDailyUsageFor(phone) {
  return dailyUsageFor('smsDailyUsage', phone);
}

function canSendSms(phone) {
  const usage = smsDailyUsageFor(phone);
  return usage.count < SMS_DAILY_LIMIT;
}

function consumeSmsQuota(phone) {
  const usage = smsDailyUsageFor(phone);
  usage.count += 1;
  return usage;
}

function smsDeviceDailyUsageFor(deviceId) {
  return dailyUsageFor('smsDeviceDailyUsage', deviceId);
}

function canSendSmsFromDevice(deviceId) {
  if (!deviceId) return true;
  const usage = smsDeviceDailyUsageFor(deviceId);
  return usage.count < SMS_DEVICE_DAILY_LIMIT;
}

function consumeSmsDeviceQuota(deviceId) {
  if (!deviceId) return null;
  const usage = smsDeviceDailyUsageFor(deviceId);
  usage.count += 1;
  return usage;
}

function smsIpDailyUsageFor(ip) {
  return dailyUsageFor('smsIpDailyUsage', ip || 'unknown');
}

function canSendSmsFromIp(ip) {
  const usage = smsIpDailyUsageFor(ip || 'unknown');
  return usage.count < SMS_IP_DAILY_LIMIT;
}

function consumeSmsIpQuota(ip) {
  const usage = smsIpDailyUsageFor(ip || 'unknown');
  usage.count += 1;
  return usage;
}

function petChatDailyUsageFor(phone) {
  state.petChatDailyUsage = state.petChatDailyUsage || {};
  const day = todayUsageKey();
  const usage = state.petChatDailyUsage[phone];
  if (!usage || usage.day !== day) {
    state.petChatDailyUsage[phone] = { count: 0, day };
  }
  return state.petChatDailyUsage[phone];
}

function canUsePetChat(user) {
  const usage = petChatDailyUsageFor(user.phone);
  return usage.count < PET_CHAT_DAILY_LIMIT;
}

function consumePetChatQuota(user) {
  const usage = petChatDailyUsageFor(user.phone);
  usage.count += 1;
  return usage;
}

function petAvatarDailyUsageFor(phone) {
  state.petAvatarDailyUsage = state.petAvatarDailyUsage || {};
  const day = todayUsageKey();
  const usage = state.petAvatarDailyUsage[phone];
  if (!usage || usage.day !== day) {
    state.petAvatarDailyUsage[phone] = { count: 0, day };
  }
  return state.petAvatarDailyUsage[phone];
}

function canUsePetAvatarGeneration(user) {
  const usage = petAvatarDailyUsageFor(user.phone);
  return usage.count < PET_AVATAR_DAILY_LIMIT;
}

function consumePetAvatarQuota(user) {
  const usage = petAvatarDailyUsageFor(user.phone);
  usage.count += 1;
  return usage;
}

function refundPetAvatarQuota(user) {
  const usage = petAvatarDailyUsageFor(user.phone);
  usage.count = Math.max(0, Number(usage.count || 0) - 1);
  return usage;
}

function recordTtapiAvatarUsage(result, succeeded) {
  state.aiUsage = state.aiUsage || createInitialState().aiUsage;
  const bucket = result?.provider === 'ttapi-flux-edits' ? 'ttapiFlux' : 'ttapiMidjourney';
  state.aiUsage[bucket] = state.aiUsage[bucket] || createInitialState().aiUsage[bucket];
  if (succeeded) state.aiUsage[bucket].succeeded += 1;
  if (!succeeded) state.aiUsage[bucket].failed += 1;
  const quota = Number(result?.data?.quota || result?.quota || 0);
  if (Number.isFinite(quota)) state.aiUsage[bucket].quota += quota;
}

function recordGptImage2AvatarUsage(result, succeeded) {
  state.aiUsage = state.aiUsage || createInitialState().aiUsage;
  state.aiUsage.gptImage2 = state.aiUsage.gptImage2 || createInitialState().aiUsage.gptImage2;
  if (succeeded) state.aiUsage.gptImage2.succeeded += 1;
  if (!succeeded) state.aiUsage.gptImage2.failed += 1;
  const cost = Number(result?.data?.cost ?? result?.cost ?? 0);
  const creditsCost = Number(result?.data?.credits_cost ?? result?.credits_cost ?? 0);
  if (Number.isFinite(cost)) state.aiUsage.gptImage2.cost += cost;
  if (Number.isFinite(creditsCost)) state.aiUsage.gptImage2.creditsCost += creditsCost;
}

function readDailyUsage(storeName, phone) {
  const store = state[storeName] || {};
  const usage = store[phone];
  const day = todayUsageKey();
  if (!usage || usage.day !== day) return { count: 0, day };
  return { count: Number(usage.count) || 0, day };
}

function quotaCounter(usage, limit) {
  const count = Number(usage.count) || 0;
  const normalizedLimit = Math.max(0, Number(limit) || 0);
  return {
    count,
    day: usage.day || todayUsageKey(),
    limit: normalizedLimit,
    remaining: Math.max(0, normalizedLimit - count),
  };
}

function buildAiUsageSummary(user) {
  const initialUsage = createInitialState().aiUsage;
  state.aiUsage = state.aiUsage || initialUsage;
  const deepseek = { ...initialUsage.deepseek, ...(state.aiUsage.deepseek || {}) };
  const gptImage2 = { ...initialUsage.gptImage2, ...(state.aiUsage.gptImage2 || {}) };
  const ttapiFlux = { ...initialUsage.ttapiFlux, ...(state.aiUsage.ttapiFlux || {}) };
  const ttapiMidjourney = { ...initialUsage.ttapiMidjourney, ...(state.aiUsage.ttapiMidjourney || {}) };
  return {
    daily: {
      petAvatar: quotaCounter(readDailyUsage('petAvatarDailyUsage', user.phone), PET_AVATAR_DAILY_LIMIT),
      petChat: quotaCounter(readDailyUsage('petChatDailyUsage', user.phone), PET_CHAT_DAILY_LIMIT),
    },
    deepseek: {
      ...deepseek,
      model: DEEPSEEK_MODEL,
    },
    petAvatarProvider: PET_AVATAR_PROVIDER,
    gptImage2,
    ttapiFlux,
    ttapiMidjourney,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeImageMimeType(value) {
  const mimeType = String(value || '').toLowerCase();
  if (mimeType.includes('jpg') || mimeType.includes('jpeg')) return 'image/jpeg';
  if (mimeType.includes('png')) return 'image/png';
  if (mimeType.includes('webp')) return 'image/webp';
  if (mimeType.includes('heic')) return 'image/heic';
  if (mimeType.includes('heif')) return 'image/heif';
  return '';
}

function isSupportedPetMediaMimeType(mimeType) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType);
}

function detectImageMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return '';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();
    if (['heic', 'heif', 'heix', 'hevc', 'mif1', 'msf1'].includes(brand)) return brand === 'heif' ? 'image/heif' : 'image/heic';
  }
  return '';
}

function isValidBase64Payload(value) {
  const clean = String(value || '').replace(/\s/g, '');
  if (!clean || clean.length % 4 === 1 || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) return false;
  const buffer = Buffer.from(clean, 'base64');
  if (buffer.length <= 0) return false;
  return buffer.toString('base64').replace(/=+$/, '') === clean.replace(/=+$/, '');
}

function parseBase64Upload(value, mimeType) {
  const input = String(value || '').trim();
  if (!input) return { bytes: 0, dataUrl: '', issue: 'missing_file', mimeType: normalizeImageMimeType(mimeType) };
  if (input.length > MEDIA_UPLOAD_MAX_BASE64_CHARS) {
    return { bytes: 0, dataUrl: '', issue: 'file_too_large', mimeType: normalizeImageMimeType(mimeType) };
  }
  const dataUrlMatch = input.match(/^data:([^;]+);base64,(.+)$/);
  const declaredMimeType = normalizeImageMimeType(dataUrlMatch ? dataUrlMatch[1] : mimeType);
  const hasExplicitMimeType = Boolean(dataUrlMatch || mimeType);
  if (hasExplicitMimeType && !declaredMimeType) {
    return { bytes: 0, dataUrl: '', issue: 'unsupported_format', mimeType: '' };
  }
  const clean = (dataUrlMatch ? dataUrlMatch[2] : input).replace(/\s/g, '');
  if (!isValidBase64Payload(clean)) return { bytes: 0, dataUrl: '', issue: 'invalid_file', mimeType: declaredMimeType };
  const buffer = Buffer.from(clean, 'base64');
  const sniffedMimeType = detectImageMimeType(buffer);
  if (!sniffedMimeType) {
    return { bytes: buffer.length, dataUrl: '', issue: 'invalid_file', mimeType: declaredMimeType };
  }
  const finalMimeType = sniffedMimeType;
  if (!isSupportedPetMediaMimeType(finalMimeType)) {
    return { bytes: buffer.length, dataUrl: '', issue: 'unsupported_format', mimeType: declaredMimeType };
  }
  if (buffer.length > MEDIA_UPLOAD_MAX_BYTES) {
    return { bytes: buffer.length, dataUrl: '', issue: 'file_too_large', mimeType: finalMimeType };
  }
  return {
    bytes: buffer.length,
    dataUrl: `data:${finalMimeType};base64,${clean}`,
    issue: '',
    mimeType: finalMimeType,
  };
}

function mediaUploadIssueAnalysis(issue, bytes) {
  if (issue === 'file_too_large') {
    return mediaAnalysisResult({
      canGenerate: false,
      code: 'file_too_large',
      message: `图片文件过大，请选择 ${Math.round(MEDIA_UPLOAD_MAX_BYTES / 1024 / 1024)}MB 以内的宠物照片。`,
      petCount: 0,
      qualityScore: 0,
      status: 'blocked',
      suggestions: ['选择原图中的清晰单宠照片', '如照片过大，可在系统相册中轻微裁剪后再上传', '避免上传长截图或视频封面'],
      tags: ['文件过大'],
      title: '图片文件过大',
    });
  }
  if (issue === 'unsupported_format') {
    return mediaAnalysisResult({
      canGenerate: false,
      code: 'unsupported_format',
      message: '当前只支持 jpg、png、webp、heic/heif 图片。请重新选择宠物照片。',
      petCount: 0,
      qualityScore: 0,
      status: 'blocked',
      suggestions: ['选择手机相册中的普通照片', '避免上传动图、视频、PDF 或截图文件', '如是微信图片，请先保存为照片后再选择'],
      tags: ['格式不支持'],
      title: '图片格式不支持',
    });
  }
  if (issue === 'invalid_file') {
    return mediaAnalysisResult({
      canGenerate: false,
      code: 'invalid_file',
      message: '图片文件无法读取，可能已损坏或上传不完整。请重新拍照或从相册选择。',
      petCount: 0,
      qualityScore: 0,
      status: 'blocked',
      suggestions: ['重新选择照片', '检查网络后再试', '尽量选择手机相册里的原始照片'],
      tags: ['文件无法读取'],
      title: '图片读取失败',
    });
  }
  return null;
}

function uploadedMediaBytes(dataUrl) {
  const match = String(dataUrl || '').match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return 0;
  return Buffer.byteLength(match[1], 'base64');
}

function mediaAnalysisResult(overrides) {
  return {
    canGenerate: true,
    code: 'single_pet_clear',
    humanPresent: false,
    message: '照片中宠物主体清晰，可以生成灵伴形象。',
    needsCrop: false,
    otherAnimalPresent: false,
    petCount: 1,
    qualityScore: 96,
    status: 'accepted',
    suggestions: [],
    tags: ['单只宠物', '主体清晰', '可生成'],
    title: '识别成功',
    ...overrides,
  };
}

function analyzeUploadedPetMedia(body, dataUrl, uploadIssue, uploadBytes) {
  const debugCode = String(body.analysisCode || body.debugAnalysisCode || '').trim();
  if (debugCode === 'no_pet') {
    return mediaAnalysisResult({
      canGenerate: false,
      code: 'no_pet',
      message: '没有检测到清晰的宠物主体。请重新上传一张宠物正脸或半身照片。',
      petCount: 0,
      qualityScore: 24,
      status: 'blocked',
      suggestions: ['重新选择包含宠物的照片', '让宠物面部完整出现在画面中央', '避免上传风景、食物、截图或纯人物照'],
      tags: ['未检测到宠物'],
      title: '未检测到宠物',
    });
  }
  if (debugCode === 'multiple_pets') {
    return mediaAnalysisResult({
      canGenerate: false,
      code: 'multiple_pets',
      message: '检测到多个宠物主体。为了保证生成结果像你的宠物，请先选择只有一只宠物的照片。',
      needsCrop: true,
      petCount: 2,
      qualityScore: 68,
      status: 'blocked',
      suggestions: ['换一张单只宠物照片', '让目标宠物单独位于画面中央', '避免多人多宠合照直接生成'],
      tags: ['多个宠物', '需要单宠'],
      title: '检测到多个宠物',
    });
  }
  if (debugCode === 'human_and_pet') {
    return mediaAnalysisResult({
      canGenerate: false,
      code: 'human_and_pet',
      humanPresent: true,
      message: '照片中人物占比较明显。为保护隐私并减少生成干扰，请上传宠物单独入镜的照片。',
      needsCrop: true,
      qualityScore: 72,
      status: 'blocked',
      suggestions: ['尽量裁掉人的脸和身体', '让宠物单独位于画面中央', '换一张宠物单独入镜的清晰照片'],
      tags: ['人物入镜', '建议裁剪'],
      title: '人物入镜较明显',
    });
  }
  if (debugCode === 'other_animals') {
    return mediaAnalysisResult({
      canGenerate: false,
      code: 'other_animals',
      message: '照片中存在其他动物干扰。为了避免把特征混在一起，请上传目标宠物单独入镜的照片。',
      needsCrop: true,
      otherAnimalPresent: true,
      petCount: 2,
      qualityScore: 66,
      status: 'blocked',
      suggestions: ['换一张只有目标宠物的照片', '避免猫狗同框或多动物同框', '让目标宠物占据画面主要位置'],
      tags: ['其他动物', '目标不明确'],
      title: '存在其他动物干扰',
    });
  }
  if (debugCode === 'busy_scene') {
    return mediaAnalysisResult({
      canGenerate: true,
      code: 'busy_scene',
      message: '宠物主体可识别，但背景或道具较复杂，生成时会优先保留宠物并弱化其他元素。',
      needsCrop: false,
      qualityScore: 78,
      status: 'warning',
      suggestions: ['更推荐上传背景干净的正脸照', '可以继续生成，但结果可能受背景影响', '若不满意可换图重新生成'],
      tags: ['背景复杂', '可尝试生成'],
      title: '主体可识别，建议优化',
    });
  }

  const issueAnalysis = mediaUploadIssueAnalysis(uploadIssue, uploadBytes);
  if (issueAnalysis) return issueAnalysis;

  const bytes = uploadedMediaBytes(dataUrl);
  if (!dataUrl || bytes <= 0) {
    return mediaAnalysisResult({
      canGenerate: false,
      code: 'missing_file',
      message: '没有收到可用于生成的原图文件。请重新拍照或从相册选择。',
      petCount: 0,
      qualityScore: 0,
      status: 'blocked',
      suggestions: ['重新选择照片', '检查相册权限是否开启', '尽量选择 jpg 或 png 图片'],
      tags: ['图片缺失'],
      title: '图片上传不完整',
    });
  }
  if (bytes < 24 * 1024) {
    return mediaAnalysisResult({
      canGenerate: true,
      code: 'low_quality',
      message: '图片文件较小，可能清晰度不足。可以继续生成，但建议换一张更清晰的照片。',
      qualityScore: 62,
      status: 'warning',
      suggestions: ['使用原图或高清图', '避免截图和压缩图', '保持宠物五官清晰'],
      tags: ['清晰度偏低', '可尝试生成'],
      title: '图片清晰度偏低',
    });
  }

  return mediaAnalysisResult({});
}

function mediaUploadFileUrl(req, mediaId) {
  if (PET_AVATAR_PUBLIC_BASE_URL) return `${PET_AVATAR_PUBLIC_BASE_URL}/media/uploads/${encodeURIComponent(mediaId)}/file`;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return '';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}/media/uploads/${encodeURIComponent(mediaId)}/file`;
}

function buildPetAvatarPrompt(user, mediaUrl) {
  const pet = selectedPetFor(user) || activePetFor(user);
  const species = pet?.species === 'cat' ? 'cat' : 'dog';
  const breed = pet?.breed || species;
  return [
    mediaUrl,
    `Transform the exact same ${species} from the reference photo into a realistic semi-cartoon pet portrait for Lumii.`,
    `Breed/profile hint: ${breed}. The output must still look like this individual pet, not a new generic ${breed}.`,
    'Preserve identity: same age impression, same fur color, markings, face shape, muzzle length, nose size, ear shape, eye shape, expression, head proportions, and natural anatomy.',
    'Style: realistic pet portrait with gentle hand-painted softness, detailed natural fur, clean mobile app asset quality, subtle warmth, not childish, not toy-like.',
    'Composition: one pet only, head and upper chest portrait, 3/4 view or front view matching the photo, centered, simple warm off-white background, soft studio lighting.',
    'Do not redesign the pet. Do not make it younger, cuter, fluffier, smaller, or change the breed. No clothes, bowties, hats, collar emphasis, accessories, text, watermark, logo, human body, fantasy creature, extra limbs, or distorted face.',
    '--ar 1:1 --iw 3 --style raw --s 60 --chaos 0 --no anime, plush toy, mascot, pixar, disney, chibi, giant eyes, puppy transformation, costume, bowtie, hat, text, watermark, logo',
  ].join(' ');
}

function buildFluxPetAvatarPrompt(user) {
  const pet = selectedPetFor(user) || activePetFor(user);
  const species = pet?.species === 'cat' ? 'cat' : 'dog';
  const breed = pet?.breed || species;
  return [
    `Create a realistic cartoon transformation of the exact same ${species} in the reference image, preserving identity and facial likeness.`,
    `Breed/profile hint: ${breed}. Keep this individual pet recognizable, not a generic ${breed}.`,
    'Preserve identity: fur color, markings, eye shape, nose shape, muzzle length, ear shape, face proportions, age impression, expression, posture, and natural anatomy.',
    'If the photo contains a distinctive object, pose, or expression, preserve it unless it distracts from the pet portrait.',
    'Make it feel like a premium Lumii mobile app pet avatar: realistic semi-3D hand-painted fur, soft studio lighting, tactile warm texture, clean edges, gentle off-white background.',
    'Keep the head and upper body centered in a square portrait. Preserve realistic dog/cat anatomy and natural proportions.',
    'Avoid flat vector illustration, black comic outlines, anime style, chibi style, plush toy, generic mascot, exaggerated eyes, changed breed, changed age, human clothing, bowtie, hat, collar emphasis, text, watermark, logo, extra limbs, or distorted face.',
    'The image should look like the uploaded pet became a polished realistic cartoon avatar, not a newly invented cartoon pet.',
  ].join('\n');
}

function buildGptImage2PetAvatarPrompt(user) {
  const pet = selectedPetFor(user) || activePetFor(user);
  const species = pet?.species === 'cat' ? 'cat' : 'dog';
  const breed = pet?.breed || species;
  return [
    `Create a premium stylized 3D collectible-character transformation of the exact same ${species} in the reference image for Lumii.`,
    `Breed/profile hint: ${breed}. If breed is unknown, use only ${species}; do not invent a specific breed. Keep this individual pet recognizable, not a generic ${breed} or generic ${species}.`,
    "Identity lock is the highest priority: preserve the pet's unique fur color, key markings, eye shape and eye-color impression, nose shape, muzzle length, ear shape, face proportions, age impression, body proportions, posture, expression, and natural dog/cat anatomy. The result must still look like this exact pet, not a different pet.",
    'Style target: transform the uploaded pet into a premium 3D collectible figurine / designer toy / animated companion character. The result should feel like a polished commercial character render or figurine prototype, not just a generic cartoon avatar.',
    'Visual style:',
    '- cute, highly appealing, expressive, and recognizable',
    "- slightly stylized proportions with a subtly larger head and more expressive eyes, while keeping the pet's real breed traits and identity",
    '- clean, rounded silhouette',
    '- soft fluffy groomed fur with visible fur clumps and fine strand detail',
    '- lively glossy eyes',
    '- soft natural muzzle and nose',
    '- cheerful, friendly, heartwarming expression',
    '- premium "toy-like but refined" finish, not cheap plastic',
    'Material and rendering direction:',
    '- high-end 3D render',
    '- collectible figurine / premium mascot aesthetic',
    '- hybrid look of soft realistic fur + polished figurine-quality character design',
    '- premium app asset / character cutout quality',
    '- soft global illumination',
    '- gentle softbox lighting',
    '- subtle ambient occlusion',
    '- clean self-shadowing and depth on the pet itself',
    '- optional subtle soft contact shadow directly under the paws/body is allowed, as long as it remains clean and compositable on a transparent canvas',
    '- clean edge separation',
    '- smooth, premium, commercial finish',
    'Composition:',
    '- one pet only',
    '- centered square composition',
    '- preferably full body, especially a seated pose if the reference supports it',
    '- front view or very slight 3/4 view, matching the reference as closely as possible',
    '- symmetrical, stable composition',
    '- enough negative space for app-avatar or card-style cropping',
    '- isolated cutout-style character asset for compositing inside a mobile app',
    '- if true alpha transparency is supported by the image pipeline, use real transparent alpha pixels only',
    '- do not draw or simulate transparency with a checkerboard, chessboard, gray-and-white square grid, or PNG preview background',
    '- no visible background color, no studio backdrop, no floor plane, no horizon line, no environment',
    '- crisp but natural cutout edges around fur, ears, whiskers, tail, and paws so the pet can be composited cleanly on any app background',
    'Accessory handling:',
    'Preserve any distinctive accessory, clothing, bib, scarf, or signature item from the original photo if it helps recognizability. Keep its main colors and visual identity, but simplify it slightly into a clean premium 3D character style. Do not add random fashion items. Only add a small accessory if it supports the original look and does not reduce recognizability.',
    'Output feeling:',
    'The final image should feel like a premium pet character collectible, as if the real pet has been transformed into a polished, adorable 3D figurine or animated companion for a high-end pet social app. It should be charming, clean, premium, and emotionally warm.',
    'Avoid:',
    'photorealistic image, realistic street/environment background, white background, off-white background, colored background, gradient background, checkerboard background, transparency grid, gray-and-white squares, fake transparent PNG preview, studio backdrop, visible floor plane, hard cast shadow, large backdrop shadow, generic breed mascot, newly invented pet, changed breed, changed fur color, changed markings, changed age, exaggerated babyfication, flat vector illustration, black comic outline, anime look, low-quality plastic toy, rough sculpt, overly glossy cheap material, human body, full fashion outfit, hat, sunglasses, text, logo, watermark, extra limbs, distorted face, multiple pets, cluttered background, dramatic action pose.',
  ].join('\n');
}

function dataUrlToFileParts(dataUrl, fallbackMimeType) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = normalizeImageMimeType(match[1] || fallbackMimeType);
  return {
    buffer: Buffer.from(match[2], 'base64'),
    mimeType,
  };
}

async function ttapiMidjourneyRequest(pathname, options = {}) {
  const response = await fetch(`${TTAPI_MJ_BASE_URL}${pathname}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'TT-API-KEY': TTAPI_API_KEY,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'FAILED') {
    const message = payload.message || `TTAPI request failed: ${response.status}`;
    const error = new Error(message);
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function ttapiFluxRequest(pathname, options = {}) {
  const response = await fetch(`${TTAPI_FLUX_BASE_URL}${pathname}`, {
    method: options.method || 'GET',
    headers: {
      'TT-API-KEY': TTAPI_API_KEY,
    },
    body: options.body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'FAILED') {
    const message = payload.message || `TTAPI Flux request failed: ${response.status}`;
    const error = new Error(message);
    error.payload = payload;
    throw error;
  }
  return payload;
}

function gptImage2NetworkError(error) {
  if (error?.name === 'AbortError') return 'GPT Image 2 request timed out';
  const cause = error?.cause || {};
  const code = cause.code || error?.code || '';
  if (code) return `GPT Image 2 upstream network error: ${code}`;
  return `GPT Image 2 upstream network error: ${error?.message || 'request failed'}`;
}

async function gptImage2Request(pathname, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 90000));
  let response;
  try {
    response = await fetch(`${GPT_IMAGE2_BASE_URL}${pathname}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${GPT_IMAGE2_API_KEY}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const wrapped = new Error(gptImage2NetworkError(error));
    wrapped.cause = error;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload.code && Number(payload.code) !== 200)) {
    const message = payload?.error?.message || payload?.message || `GPT Image 2 request failed: ${response.status}`;
    const error = new Error(message);
    error.payload = payload;
    throw error;
  }
  return payload;
}

function ttapiJobIdFrom(payload) {
  return payload?.data?.job_id || payload?.data?.jobId || payload?.jobId || '';
}

function gptImage2TaskIdFrom(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) return data[0]?.task_id || data[0]?.taskId || data[0]?.id || '';
  return data?.task_id || data?.taskId || data?.id || payload?.task_id || payload?.taskId || payload?.id || '';
}

function ttapiResultUrlFrom(payload) {
  const data = payload?.data || {};
  if (Array.isArray(data.images) && data.images[0]) return data.images[0];
  return data.imageUrl || data.image_url || data.cdnImage || data.discordImage || '';
}

function gptImage2ResultUrlFrom(payload) {
  const data = payload?.data || payload || {};
  const images = data?.result?.images || payload?.result?.images || [];
  for (const image of Array.isArray(images) ? images : []) {
    if (Array.isArray(image?.url) && image.url[0]) return image.url[0];
    if (typeof image?.url === 'string' && image.url) return image.url;
    if (typeof image === 'string' && image) return image;
  }
  return data?.imageUrl || data?.image_url || payload?.imageUrl || payload?.image_url || '';
}

function nextProcessingProgress(current, remoteProgress) {
  const parsed = Number(remoteProgress);
  if (Number.isFinite(parsed) && parsed > 0) return Math.max(10, Math.min(98, parsed));
  return Math.min(98, Math.max(10, Number(current || 10) + 12));
}

function gptImage2StuckTaskTimeoutMs(data) {
  const estimatedSeconds = Number(data?.estimated_time ?? data?.estimatedTime ?? 0);
  const multiplier = Number.isFinite(GPT_IMAGE2_STUCK_TASK_ESTIMATE_MULTIPLIER) && GPT_IMAGE2_STUCK_TASK_ESTIMATE_MULTIPLIER > 0 ? GPT_IMAGE2_STUCK_TASK_ESTIMATE_MULTIPLIER : 4;
  const estimatedTimeoutMs = Number.isFinite(estimatedSeconds) && estimatedSeconds > 0 ? estimatedSeconds * 1000 * multiplier : 0;
  const minTimeoutMs = Number.isFinite(GPT_IMAGE2_STUCK_TASK_MIN_TIMEOUT_MS) && GPT_IMAGE2_STUCK_TASK_MIN_TIMEOUT_MS > 0 ? GPT_IMAGE2_STUCK_TASK_MIN_TIMEOUT_MS : 5 * 60 * 1000;
  return Math.max(minTimeoutMs, estimatedTimeoutMs);
}

const AVATAR_JOB_START_TIMEOUT_MS = 2 * 60 * 1000;
const AVATAR_JOB_RECOVERY_TTL_MS = 24 * 60 * 60 * 1000;

function touchAvatarJob(job) {
  if (job) job.updatedAt = Date.now();
  return job;
}

function createMockAvatarJob(id) {
  return {
    createdAt: Date.now(),
    id,
    progress: 24,
    provider: 'mock',
    resultUrl: undefined,
    status: 'processing',
    updatedAt: Date.now(),
  };
}

function latestAvatarJobForUser(user, petIdInput) {
  const petId = String(petIdInput || '').trim();
  const cutoff = Date.now() - AVATAR_JOB_RECOVERY_TTL_MS;
  return Object.values(state.avatarJobs || {})
    .filter((job) => job && job.ownerPhone === user.phone && !job.acceptedAt)
    .filter((job) => job.status === 'processing' || job.status === 'ready')
    .filter((job) => !petId || !job.petId || job.petId === petId)
    .filter((job) => Number(job.updatedAt || job.createdAt || 0) >= cutoff)
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0] || null;
}

function avatarRefreshFailureMessage(error) {
  const message = String(error?.message || error || '').trim();
  if (/timed out|timeout/i.test(message)) return 'AI 图像服务状态查询超时，正在继续同步生成进度。';
  if (/network|fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|socket|TLS/i.test(message)) return 'AI 图像服务网络暂时不稳定，正在继续同步生成进度。';
  return message || 'AI 图像服务状态查询失败，正在继续同步生成进度。';
}

function markAvatarRefreshFailure(job, error) {
  const message = avatarRefreshFailureMessage(error);
  job.lastStatusError = message;
  job.lastStatusCheckedAt = Date.now();
  job.statusErrorCount = Number(job.statusErrorCount || 0) + 1;
  const ageMs = Date.now() - Number(job.createdAt || Date.now());
  const timeoutMs = PET_AVATAR_PROVIDER === 'gpt-image-2' ? gptImage2StuckTaskTimeoutMs({}) : 8 * 60 * 1000;
  if (ageMs >= timeoutMs) {
    job.errorCode = 'AVATAR_PROVIDER_STATUS_TIMEOUT';
    job.errorMessage = 'AI 灵伴生成超时，上游图像任务长时间未返回结果，请重新生成。';
    job.progress = Math.max(10, Number(job.progress || 10));
    job.status = 'failed';
  } else {
    job.progress = Math.min(98, Math.max(10, Number(job.progress || 10) + 3));
    job.status = 'processing';
    job.providerStatus = job.providerStatus || 'status_retrying';
  }
  touchAvatarJob(job);
  return job;
}

function requestSnapshotForAvatarJob(req) {
  return {
    headers: {
      host: req.headers.host,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
    },
  };
}

function avatarStartFailureMessage(error) {
  const message = String(error?.message || error || '').trim();
  if (/timed out|timeout/i.test(message)) return 'AI 灵伴生成任务提交超时，请稍后重新生成。';
  if (/network|fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|socket|TLS/i.test(message)) return 'AI 图像服务网络连接失败，请稍后重新生成。';
  return message || 'AI 灵伴生成任务提交失败，请稍后重试。';
}

async function startAvatarGenerationJobInBackground(reqSnapshot, user, job, media) {
  try {
    if (PET_AVATAR_PROVIDER === 'gpt-image-2') {
      await startGptImage2AvatarJob(user, job, media);
    } else if (PET_AVATAR_PROVIDER === 'ttapi-flux-edits') {
      await startTtapiFluxAvatarJob(user, job, media);
    } else if (PET_AVATAR_PROVIDER === 'ttapi-midjourney') {
      await startTtapiAvatarJob(reqSnapshot, user, job, media);
    }
    job.submittedAt = Date.now();
    job.submitErrorCount = 0;
    touchAvatarJob(job);
  } catch (error) {
    job.errorCode = 'AVATAR_PROVIDER_START_FAILED';
    job.errorMessage = avatarStartFailureMessage(error);
    job.lastStatusError = job.errorMessage;
    job.progress = Math.max(0, Number(job.progress || 0));
    job.provider = PET_AVATAR_PROVIDER;
    job.providerStatus = 'submit_failed';
    job.status = 'failed';
    job.submitErrorCount = Number(job.submitErrorCount || 0) + 1;
    if (job.quotaConsumed && !job.providerJobId && !job.quotaRefunded) {
      refundPetAvatarQuota(user);
      job.quotaRefunded = true;
    }
    touchAvatarJob(job);
    console.warn('[avatar] background start failed', {
      jobId: job.id,
      message: job.errorMessage,
      provider: job.provider,
    });
  } finally {
    saveState();
  }
}

function queueAvatarGenerationStart(req, user, job, media) {
  const reqSnapshot = requestSnapshotForAvatarJob(req);
  setTimeout(() => {
    void startAvatarGenerationJobInBackground(reqSnapshot, user, job, media);
  }, 0);
}

async function createAvatarGenerationJob(req, user, mediaIdInput, originalJobId) {
  if (!canUsePetAvatarGeneration(user)) {
    return { error: '今日灵伴形象生成次数已用完，请明天再试', retryable: true, statusCode: 429 };
  }
  const mediaId = String(mediaIdInput || '');
  const media = mediaId ? state.mediaUploads?.[mediaId] : null;
  if (mediaId && (!media || media.ownerPhone !== user.phone)) {
    return { error: '上传照片已失效，请重新上传', retryable: true, statusCode: 404 };
  }
  if (media?.analysis && !media.analysis.canGenerate) {
    return { data: media.analysis, error: media.analysis.message || '当前照片不适合生成灵伴形象，请重新上传', retryable: false, statusCode: 400 };
  }
  const id = `job-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const job = createMockAvatarJob(id);
  const pet = selectedPetFor(user) || activePetFor(user);
  job.mediaId = mediaId;
  job.ownerPhone = user.phone;
  job.petId = pet?.id || '';
  job.petName = pet?.name || '';
  if (originalJobId) job.originalJobId = originalJobId;
  state.avatarJobs[id] = job;
  touchAvatarJob(job);

  if (PET_AVATAR_PROVIDER === 'mock') {
    consumePetAvatarQuota(user);
    job.quotaConsumed = true;
    saveState();
    return { job };
  }

  if (PET_AVATAR_PROVIDER === 'gpt-image-2' || PET_AVATAR_PROVIDER === 'ttapi-flux-edits' || PET_AVATAR_PROVIDER === 'ttapi-midjourney') {
    job.progress = 2;
    job.provider = PET_AVATAR_PROVIDER;
    job.providerStatus = 'queued';
    job.status = 'processing';
    consumePetAvatarQuota(user);
    job.quotaConsumed = true;
    touchAvatarJob(job);
    saveState();
    queueAvatarGenerationStart(req, user, job, media);
    return { job };
  }

  job.errorCode = 'AVATAR_PROVIDER_UNAVAILABLE';
  job.errorMessage = 'AI 灵伴生成服务暂不可用，请稍后重试。';
  job.provider = PET_AVATAR_PROVIDER;
  job.status = 'failed';
  touchAvatarJob(job);
  return { job };
}

function avatarJobForUser(user, jobId) {
  const job = state.avatarJobs[jobId];
  return job && job.ownerPhone === user.phone ? job : null;
}

const avatarFeedbackReasons = new Set(['color', 'expression', 'face_shape', 'not_same_pet', 'other', 'style']);

async function startGptImage2AvatarJob(user, job, media) {
  if (!GPT_IMAGE2_API_KEY) throw new Error('GPT Image 2 key is not configured');
  if (!media?.dataUrl) throw new Error('Pet photo is missing. Please upload again.');
  const prompt = buildGptImage2PetAvatarPrompt(user);
  Object.assign(job, {
    mediaId: media.mediaId,
    progress: 2,
    provider: 'gpt-image-2',
    providerStatus: 'submitting',
    promptVersion: 'gpt-image-2-collectible-character-cutout-v4',
    status: 'processing',
  });
  touchAvatarJob(job);
  const payload = await gptImage2Request('/v1/images/generations', {
    method: 'POST',
    body: {
      image_urls: [media.dataUrl],
      model: GPT_IMAGE2_MODEL,
      n: 1,
      official_fallback: GPT_IMAGE2_OFFICIAL_FALLBACK,
      prompt,
      resolution: GPT_IMAGE2_RESOLUTION,
      size: GPT_IMAGE2_SIZE,
    },
  });
  const providerJobId = gptImage2TaskIdFrom(payload);
  if (!providerJobId) throw new Error('GPT Image 2 did not return a task id');
  state.aiUsage = state.aiUsage || createInitialState().aiUsage;
  state.aiUsage.gptImage2 = state.aiUsage.gptImage2 || createInitialState().aiUsage.gptImage2;
  state.aiUsage.gptImage2.requests += 1;
  Object.assign(job, {
    progress: 10,
    providerJobId,
    providerStatus: payload?.data?.[0]?.status || payload?.data?.status || payload.status || 'submitted',
    status: 'processing',
  });
  touchAvatarJob(job);
}

async function startTtapiAvatarJob(req, user, job, media) {
  if (!TTAPI_API_KEY) throw new Error('TTAPI key is not configured');
  if (!media?.dataUrl) throw new Error('Pet photo is missing. Please upload again.');
  const referenceUrl = mediaUploadFileUrl(req, media.mediaId);
  if (!referenceUrl) throw new Error('Public media URL is not available.');
  const prompt = buildPetAvatarPrompt(user, referenceUrl);
  const payload = await ttapiMidjourneyRequest('/midjourney/v1/imagine', {
    method: 'POST',
    body: {
      mode: TTAPI_MJ_MODE,
      prompt,
      timeout: TTAPI_MJ_TIMEOUT,
    },
  });
  const providerJobId = ttapiJobIdFrom(payload);
  if (!providerJobId) throw new Error('TTAPI did not return a job id');
  state.aiUsage = state.aiUsage || createInitialState().aiUsage;
  state.aiUsage.ttapiMidjourney = state.aiUsage.ttapiMidjourney || createInitialState().aiUsage.ttapiMidjourney;
  state.aiUsage.ttapiMidjourney.requests += 1;
  Object.assign(job, {
    mediaId: media.mediaId,
    progress: 10,
    provider: 'ttapi-midjourney',
    providerJobId,
    providerStatus: payload.status || 'SUBMITTED',
    referenceUrl,
    status: 'processing',
  });
  touchAvatarJob(job);
}

async function startTtapiFluxAvatarJob(user, job, media) {
  if (!TTAPI_API_KEY) throw new Error('TTAPI key is not configured');
  if (!media?.dataUrl) throw new Error('Pet photo is missing. Please upload again.');
  const fileParts = dataUrlToFileParts(media.dataUrl, media.mimeType);
  if (!fileParts?.buffer?.length) throw new Error('Pet photo file is invalid. Please upload again.');

  const prompt = buildFluxPetAvatarPrompt(user);
  const form = new FormData();
  const blob = new Blob([fileParts.buffer], { type: fileParts.mimeType });
  form.append('image', blob, media.fileName || `lumii-pet-${media.mediaId}.jpg`);
  form.append('mode', TTAPI_FLUX_MODE);
  form.append('prompt', prompt);
  form.append('aspect_ratio', '1:1');

  const payload = await ttapiFluxRequest('/flux/edits', {
    method: 'POST',
    body: form,
  });
  const providerJobId = ttapiJobIdFrom(payload);
  if (!providerJobId) throw new Error('TTAPI Flux did not return a job id');
  state.aiUsage = state.aiUsage || createInitialState().aiUsage;
  state.aiUsage.ttapiFlux = state.aiUsage.ttapiFlux || createInitialState().aiUsage.ttapiFlux;
  state.aiUsage.ttapiFlux.requests += 1;
  Object.assign(job, {
    mediaId: media.mediaId,
    progress: 10,
    provider: 'ttapi-flux-edits',
    providerJobId,
    providerStatus: payload.status || 'SUBMITTED',
    promptVersion: 'flux-2-max-realistic-avatar-v1',
    status: 'processing',
  });
  touchAvatarJob(job);
}

async function refreshGptImage2AvatarJob(req, user, job) {
  if (!job.providerJobId) {
    const ageMs = Date.now() - Number(job.createdAt || Date.now());
    if (ageMs >= AVATAR_JOB_START_TIMEOUT_MS) {
      job.errorCode = 'AVATAR_PROVIDER_START_TIMEOUT';
      job.errorMessage = 'AI 灵伴生成任务提交超时，请重新生成。';
      job.progress = Math.max(2, Number(job.progress || 2));
      job.providerStatus = job.providerStatus || 'submit_timeout';
      job.status = 'failed';
      touchAvatarJob(job);
      return job;
    }
    job.progress = Math.min(12, Math.max(2, Number(job.progress || 2) + 2));
    job.providerStatus = job.providerStatus || 'queued';
    job.status = 'processing';
    touchAvatarJob(job);
    return job;
  }
  const payload = await gptImage2Request(`/v1/tasks/${encodeURIComponent(job.providerJobId)}`, {
    method: 'GET',
  });
  const data = payload?.data || {};
  const status = String(data.status || payload.status || '').toLowerCase();
  job.providerStatus = status || job.providerStatus;
  job.lastStatusCheckedAt = Date.now();
  job.lastStatusError = '';
  job.statusErrorCount = 0;

  if (status === 'completed' || status === 'succeeded' || status === 'success') {
    const resultUrl = gptImage2ResultUrlFrom(payload);
    if (!resultUrl) throw new Error('GPT Image 2 result does not include an image URL');
    let finalResultUrl = resultUrl;
    try {
      const pet = selectedPetFor(user);
      finalResultUrl = await storeAvatarUrlToCos(req, user, resultUrl, { petId: pet?.id || '', scope: 'pet-avatar' });
      if (finalResultUrl && finalResultUrl !== resultUrl) job.sourceResultUrl = resultUrl;
    } catch (error) {
      console.warn('[avatar:gpt-image-2] result storage skipped', {
        jobId: job.id,
        message: error.message || String(error),
      });
      finalResultUrl = resultUrl;
    }
    job.progress = 100;
    job.resultUrl = finalResultUrl;
    job.status = 'ready';
    touchAvatarJob(job);
    if (!job.usageRecorded) {
      recordGptImage2AvatarUsage(payload, true);
      job.usageRecorded = true;
    }
    return job;
  }

  if (status === 'failed' || status === 'error' || status === 'cancelled' || status === 'canceled') {
    job.errorMessage = data?.error?.message || payload?.error?.message || payload?.message || 'GPT Image 2 generation failed';
    job.errorCode = 'AVATAR_PROVIDER_FAILED';
    job.progress = Math.max(10, Number(job.progress || 10));
    job.status = 'failed';
    touchAvatarJob(job);
    if (!job.usageRecorded) {
      recordGptImage2AvatarUsage(payload, false);
      job.usageRecorded = true;
    }
    return job;
  }

  const ageMs = Date.now() - Number(job.createdAt || Date.now());
  const timeoutMs = gptImage2StuckTaskTimeoutMs(data);
  if (ageMs >= timeoutMs) {
    job.errorMessage = 'AI 灵伴生成超时，上游图像任务长时间未返回结果，请重新生成。';
    job.progress = Math.max(10, Number(job.progress || 10));
    job.providerStatus = status || 'processing_timeout';
    job.status = 'failed';
    job.timedOutAt = Date.now();
    job.errorCode = 'AVATAR_PROVIDER_TIMEOUT';
    touchAvatarJob(job);
    if (!job.usageRecorded) {
      recordGptImage2AvatarUsage(payload, false);
      job.usageRecorded = true;
    }
    return job;
  }

  job.progress = nextProcessingProgress(job.progress, data.progress);
  job.status = 'processing';
  touchAvatarJob(job);
  return job;
}

async function refreshTtapiAvatarJob(job) {
  const activeProviderJobId = job.upsampleJobId || job.providerJobId;
  if (!activeProviderJobId) {
    const ageMs = Date.now() - Number(job.createdAt || Date.now());
    if (ageMs >= AVATAR_JOB_START_TIMEOUT_MS) {
      job.errorCode = 'AVATAR_PROVIDER_START_TIMEOUT';
      job.errorMessage = 'AI 灵伴生成任务提交超时，请重新生成。';
      job.progress = Math.max(2, Number(job.progress || 2));
      job.providerStatus = job.providerStatus || 'submit_timeout';
      job.status = 'failed';
      touchAvatarJob(job);
      return job;
    }
    job.progress = Math.min(12, Math.max(2, Number(job.progress || 2) + 2));
    job.providerStatus = job.providerStatus || 'queued';
    job.status = 'processing';
    touchAvatarJob(job);
    return job;
  }
  const payload = await ttapiMidjourneyRequest(`/midjourney/v1/fetch?jobId=${encodeURIComponent(activeProviderJobId)}`);
  job.providerStatus = payload.status;
  job.lastStatusCheckedAt = Date.now();
  job.lastStatusError = '';
  job.statusErrorCount = 0;

  if (payload.status === 'SUCCESS') {
    if (TTAPI_MJ_AUTO_UPSAMPLE && !job.upsampleJobId) {
      const actionPayload = await ttapiMidjourneyRequest('/midjourney/v1/action', {
        method: 'POST',
        body: {
          action: 'upsample1',
          hookUrl: undefined,
          jobId: job.providerJobId,
          timeout: TTAPI_MJ_TIMEOUT,
        },
      });
      const upsampleJobId = ttapiJobIdFrom(actionPayload);
      if (upsampleJobId) {
        job.progress = 82;
        job.upsampleJobId = upsampleJobId;
        touchAvatarJob(job);
        return job;
      }
    }

    const resultUrl = ttapiResultUrlFrom(payload);
    if (!resultUrl) throw new Error('TTAPI result does not include an image URL');
    job.progress = 100;
    job.resultUrl = resultUrl;
    job.status = 'ready';
    touchAvatarJob(job);
    if (!job.usageRecorded) {
      recordTtapiAvatarUsage(payload, true);
      job.usageRecorded = true;
    }
    return job;
  }

  if (payload.status === 'FAILED') {
    job.errorCode = 'AVATAR_PROVIDER_FAILED';
    job.errorMessage = payload.message || payload?.data?.message || 'AI 灵伴生成失败，请重新生成。';
    job.progress = Math.max(10, Number(job.progress || 10));
    job.status = 'failed';
    touchAvatarJob(job);
    if (!job.usageRecorded) {
      recordTtapiAvatarUsage(payload, false);
      job.usageRecorded = true;
    }
    return job;
  }

  job.progress = nextProcessingProgress(job.progress, payload?.data?.progress);
  job.status = 'processing';
  touchAvatarJob(job);
  return job;
}

async function refreshTtapiFluxAvatarJob(job) {
  if (!job.providerJobId) {
    const ageMs = Date.now() - Number(job.createdAt || Date.now());
    if (ageMs >= AVATAR_JOB_START_TIMEOUT_MS) {
      job.errorCode = 'AVATAR_PROVIDER_START_TIMEOUT';
      job.errorMessage = 'AI 灵伴生成任务提交超时，请重新生成。';
      job.progress = Math.max(2, Number(job.progress || 2));
      job.providerStatus = job.providerStatus || 'submit_timeout';
      job.status = 'failed';
      touchAvatarJob(job);
      return job;
    }
    job.progress = Math.min(12, Math.max(2, Number(job.progress || 2) + 2));
    job.providerStatus = job.providerStatus || 'queued';
    job.status = 'processing';
    touchAvatarJob(job);
    return job;
  }
  const payload = await ttapiFluxRequest(`/flux/fetch?jobId=${encodeURIComponent(job.providerJobId)}`, {
    method: 'GET',
  });
  job.providerStatus = payload.status;
  job.lastStatusCheckedAt = Date.now();
  job.lastStatusError = '';
  job.statusErrorCount = 0;

  if (payload.status === 'SUCCESS') {
    const resultUrl = ttapiResultUrlFrom(payload);
    if (!resultUrl) throw new Error('TTAPI Flux result does not include an image URL');
    job.progress = 100;
    job.resultUrl = resultUrl;
    job.status = 'ready';
    touchAvatarJob(job);
    if (!job.usageRecorded) {
      recordTtapiAvatarUsage({ ...payload, provider: 'ttapi-flux-edits' }, true);
      job.usageRecorded = true;
    }
    return job;
  }

  if (payload.status === 'FAILED') {
    job.errorCode = 'AVATAR_PROVIDER_FAILED';
    job.errorMessage = payload.message || payload?.data?.message || 'AI 灵伴生成失败，请重新生成。';
    job.progress = Math.max(10, Number(job.progress || 10));
    job.status = 'failed';
    touchAvatarJob(job);
    if (!job.usageRecorded) {
      recordTtapiAvatarUsage({ ...payload, provider: 'ttapi-flux-edits' }, false);
      job.usageRecorded = true;
    }
    return job;
  }

  job.progress = nextProcessingProgress(job.progress, payload?.data?.progress);
  job.status = 'processing';
  touchAvatarJob(job);
  return job;
}

function detectPetMedicalEmergency(text) {
  const normalized = String(text || '').toLowerCase();
  const toxicIngestion = /(误食|吃了|吞了|舔了|咬了).*(巧克力|葡萄|葡萄干|洋葱|大蒜|蒜|药|药片|老鼠药|蟑螂药|杀虫剂|清洁剂|消毒液|酒精|百合|电池|烟头|毒)/.test(normalized);
  const emergencyPatterns = [
    /呼吸困难|喘不上|喘不过|张嘴呼吸|窒息|憋气/,
    /抽搐|癫痫|昏迷|休克|晕倒|意识不清|站不起来|瘫/,
    /大出血|流血不止|吐血|便血|尿血/,
    /严重外伤|车撞|被车撞|摔伤|骨折|咬伤很深|伤口很深/,
    /持续.*(呕吐|腹泻|拉稀)|一直.*(呕吐|吐|腹泻|拉稀)/,
    /不吃不喝|拒食拒水/,
    /中毒|poison|toxic|chocolate|grape|onion|seizure|breathing|bleeding/,
  ];
  if (toxicIngestion) return { reason: 'toxic_ingestion' };
  if (emergencyPatterns.some((pattern) => pattern.test(normalized))) return { reason: 'medical_emergency' };
  return null;
}

function petMedicalSafetyReply(user, text) {
  const pet = selectedPetFor(user) || activePetFor(user);
  const ingestionHint = /(误食|吃了|吞了|舔了|咬了)/.test(String(text || ''));
  const extra = ingestionHint
    ? '如果是误食，请尽量保留包装、成分、照片和大概时间，不要自行催吐或喂药。'
    : '请先让我保持安静，避免继续运动；如果有出血、呼吸异常或抽搐，优先就近急诊。';
  return [
    '主人，这个情况我不能当作普通聊天处理。我可能存在需要尽快评估的风险，请马上联系宠物医院或兽医。',
    extra,
    '我不能替代兽医诊断，也不建议在没有医生指导时自行用药。你可以同时记录：发生时间、持续多久、精神/呼吸/食欲变化，带给医生判断。',
  ].join('\n\n');
}

function petChatMemoTitle(text) {
  if (/吃|饭|粮|零食|食欲|喝水|饮水/.test(text)) return '饮食记录';
  if (/便便|大便|尿|拉稀|腹泻|呕吐|吐/.test(text)) return '健康观察';
  if (/散步|出门|公园|遛|运动/.test(text)) return '散步记录';
  if (/洗澡|驱虫|疫苗|医院|用药|药/.test(text)) return '护理记录';
  return '今日小事';
}

function normalizePetChatMemoContent(text) {
  return String(text || '')
    .replace(/^(麻烦|请|帮我|帮忙|可以)?(把|将)?/u, '')
    .replace(/(帮我)?(记一下|记录一下|记一笔|记到(?:健康)?备忘|加到(?:健康)?备忘|保存到(?:健康)?备忘|写进(?:健康)?备忘)[：:，,\s]*/u, '')
    .trim();
}

function createHealthMemoFromPetChat(user, text) {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/.test(rawText)) return null;
  if (!/(记一下|记录一下|记一笔|记到(?:健康)?备忘|加到(?:健康)?备忘|保存到(?:健康)?备忘|写进(?:健康)?备忘)/.test(rawText)) return null;
  const content = normalizePetChatMemoContent(rawText) || rawText;
  if (content.length < 2) return null;
  return createHealthMemoRecord(user, petChatMemoTitle(content), content.slice(0, 240), { dedupe: true });
}

function createMedicalAlertFromPetChat(user, text) {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/.test(rawText)) return null;
  const emergency = detectPetMedicalEmergency(rawText);
  if (!emergency) return null;
  const pet = selectedPetFor(user) || activePetFor(user);
  const title = emergency.reason === 'toxic_ingestion' ? '误食风险观察' : '紧急健康观察';
  const content = `${pet?.name ? `${pet.name}：` : ''}${rawText}`.slice(0, 240);
  const memo = createHealthMemoRecord(user, title, content, { dedupe: true });
  if (!memo) return null;
  const notificationId = `n-medical-alert-${memo.id}`;
  addNotification(user.phone, {
    id: notificationId,
    kind: 'medical_alert',
    memoId: memo.id,
    read: false,
    text: emergency.reason === 'toxic_ingestion'
      ? '已记录疑似误食风险，请尽快联系宠物医院或兽医确认处理方式。'
      : '已记录高风险健康观察，请优先联系宠物医院或兽医。',
    title: '就医提醒',
  });
  return { memo, notificationId, reason: emergency.reason };
}

function extractPetChatWeight(text) {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/.test(rawText)) return null;
  const weightMatch = rawText.match(/(\d{1,3}(?:\.\d{1,2})?)\s*(kg|公斤|千克|斤)/i);
  if (!weightMatch) return null;
  if (!/(体重|称重|重量|记录|记一下|记一笔|kg|公斤|千克|斤)/i.test(rawText)) return null;
  const rawValue = Number(weightMatch[1]);
  if (!Number.isFinite(rawValue) || rawValue <= 0) return null;
  const unit = weightMatch[2].toLowerCase();
  const kg = unit === '斤' ? rawValue / 2 : rawValue;
  if (kg < 0.2 || kg > 120) return null;
  const cleanedNote = rawText
    .replace(/^(麻烦|请|帮我|帮忙|可以)?(把|将)?/u, '')
    .replace(/(帮我)?(记录一下|记录|记一下|记一笔|保存|新增|添加)[：:，,\s]*/u, '')
    .replace(/(今天|刚刚|现在|这次)?(的)?(体重|称重|重量)[是为有到：:，,\s]*/u, '')
    .replace(weightMatch[0], '')
    .replace(/^(是|为|有|到|了|：|:|，|,|\s)+/u, '')
    .trim();
  return {
    kg,
    note: cleanedNote ? `AI 对话：${cleanedNote.slice(0, 80)}` : 'AI 对话记录',
  };
}

function createWeightRecordFromPetChat(user, text) {
  const parsed = extractPetChatWeight(text);
  if (!parsed) return null;
  return createWeightRecord(user, parsed.kg, parsed.note, { dedupe: true });
}

function cleanPetChatProfileValue(value, maxLength) {
  const cleaned = String(value || '')
    .replace(/^[：:，,\s]+/u, '')
    .replace(/[。！!；;，,\s]+$/u, '')
    .replace(/(呢|吧|呀|啦|了)$/u, '')
    .trim();
  if (!cleaned || /^(吗|什么|多少|几岁|多大)$/u.test(cleaned)) return '';
  return cleaned.slice(0, maxLength);
}

function firstPetChatProfileValue(patterns, rawText, maxLength) {
  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    const value = cleanPetChatProfileValue(match?.[1], maxLength);
    if (value) return value;
  }
  return null;
}

function normalizePetChatProfileDate(rawText) {
  const match = String(rawText || '').match(/(\d{4})\s*(?:年|-|\/|\.)\s*(\d{1,2})\s*(?:月|-|\/|\.)\s*(\d{1,2})\s*(?:日|号)?/u);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (year < 1990 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (date.getTime() > todayUtc) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractPetChatProfileGender(rawText) {
  const match = String(rawText || '').match(/(?:性别)(?:是|为|改成|改为|设为|设置为|更新为)?[：:，,\s]*(男孩|女孩|男|女|公|母|弟弟|妹妹|未知|不确定)/u);
  const value = match?.[1];
  if (!value) return null;
  if (/未知|不确定/u.test(value)) return 'unknown';
  if (/男|公|弟弟/u.test(value)) return 'male';
  if (/女|母|妹妹/u.test(value)) return 'female';
  return null;
}

function extractPetChatPersonality(rawText) {
  if (!/(性格|标签)/u.test(rawText)) return null;
  const match = String(rawText || '').match(/(?:性格标签|性格|标签)(?:是|有|改成|改为|设为|设置为|更新为|补充为)?[：:，,\s]*([^。！!；;\n]{1,80})/u);
  if (!match?.[1]) return null;
  const tags = [];
  for (const token of match[1].split(/[、,，\/|｜\s]+/u)) {
    if (/(生日|出生|品种|犬种|猫种|名字|昵称|小名|性别|体重|疫苗|驱虫)/u.test(token)) break;
    const tag = cleanPetChatProfileValue(token, 8);
    if (tag && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 6) break;
  }
  return tags.length ? tags : null;
}

function extractPetProfilePatchFromPetChat(text) {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/u.test(rawText)) return null;
  if (!/(档案|资料|名字|昵称|小名|生日|出生|品种|犬种|猫种|性别|性格|标签|(?:它|他|她|宠物|狗狗|猫咪)(?:叫|叫做))/u.test(rawText)) return null;

  const patch = {};
  const name = firstPetChatProfileValue(
    [
      /(?:宠物|狗狗|猫咪|它|他|她)?(?:名字|昵称|小名)(?:叫|叫做|是|改成|改为|设为|设置为|更新为)?[：:，,\s]*([^\s，,。！!；;]{1,16})/u,
      /(?:它|他|她)(?:叫|叫做)[：:，,\s]*([^\s，,。！!；;]{1,16})/u,
    ],
    rawText,
    12,
  );
  if (name && !/^(名字|昵称|小名|宠物)$/u.test(name)) patch.name = name;

  if (/(生日|出生)/u.test(rawText)) {
    const birthday = normalizePetChatProfileDate(rawText);
    if (birthday) patch.birthday = birthday;
  }

  const breed = firstPetChatProfileValue(
    [
      /(?:品种|犬种|猫种)(?:是|为|叫|改成|改为|设为|设置为|更新为)?[：:，,\s]*([^，,。！!；;\n]{1,24})/u,
    ],
    rawText,
    20,
  );
  if (breed && !/^(品种|犬种|猫种)$/u.test(breed)) patch.breed = breed;

  const gender = extractPetChatProfileGender(rawText);
  if (gender) patch.gender = gender;

  const personality = extractPetChatPersonality(rawText);
  if (personality) patch.personality = personality;

  return Object.keys(patch).length ? patch : null;
}

function applyPetProfileUpdateFromPetChat(user, text) {
  const pet = selectedPetFor(user);
  if (!pet) return null;
  const patch = extractPetProfilePatchFromPetChat(text);
  if (!patch) return null;
  Object.assign(pet, patch);
  return { patch, pet: { ...pet } };
}

function describePetProfilePatch(patch) {
  const fields = [];
  if (patch.name) fields.push('昵称');
  if (patch.birthday) fields.push('生日');
  if (patch.breed) fields.push('品种');
  if (patch.gender) fields.push('性别');
  if (patch.personality) fields.push('性格标签');
  return fields.join('、') || '宠物资料';
}

function detectPetChatVaccineAction(text) {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/.test(rawText)) return null;
  const mentionsVaccine = /(疫苗|狂犬|三联|驱虫)/.test(rawText);
  if (!mentionsVaccine) return null;
  if (/(取消|关闭|不要|不用|别).{0,8}提醒|提醒.{0,8}(取消|关闭|不要|不用|别)/.test(rawText)) return 'reminder_off';
  if (/(提醒|到期|临近|提前).{0,12}(疫苗|狂犬|三联|驱虫)|(疫苗|狂犬|三联|驱虫).{0,12}(提醒|到期|临近|提前)/.test(rawText)) return 'reminder_on';
  if (/(已打|打完|打了|刚打|接种了|已接种|接种完成|已完成|完成了|做完|做了|已做|驱虫了|驱虫完成)/.test(rawText)) return 'done';
  return null;
}

function findVaccineForPetChat(user, text) {
  const vaccines = vaccineListFor(user);
  const rawText = String(text || '').trim();
  const scored = vaccines.map((vaccine, index) => {
    let score = 0;
    const name = String(vaccine.name || '');
    const compactName = name.replace(/疫苗|计划|提醒/g, '');
    if (name && rawText.includes(name)) score += 8;
    if (compactName && rawText.includes(compactName)) score += 5;
    if (/狂犬/.test(rawText) && /狂犬/.test(name)) score += 5;
    if (/猫三联|三联/.test(rawText) && /猫三联|三联/.test(name)) score += 5;
    if (/驱虫/.test(rawText) && /驱虫/.test(name)) score += 5;
    if (/疫苗/.test(rawText) && /疫苗/.test(name)) score += 2;
    if (vaccine.status !== 'done') score += 0.5;
    return { index, score, vaccine };
  });
  const best = scored.sort((a, b) => b.score - a.score || a.index - b.index)[0];
  if (best?.score > 0) return best.vaccine;
  return vaccines.find((vaccine) => vaccine.status !== 'done') || vaccines[0] || null;
}

function applyPetChatVaccineAction(user, text) {
  const action = detectPetChatVaccineAction(text);
  if (!action) return null;
  const vaccines = vaccineListFor(user);
  const vaccine = findVaccineForPetChat(user, text);
  if (!vaccine) return null;
  const index = vaccines.findIndex((item) => item.id === vaccine.id);
  if (index < 0) return null;

  if (action === 'done') {
    vaccines[index] = { ...vaccines[index], status: 'done' };
    const reminderIds = setVaccineReminderFor(user, vaccines[index].id, false);
    addNotification(user.phone, {
      id: `n-vaccine-done-${healthKeyFor(user)}-${vaccines[index].id}`,
      kind: 'vaccine_done',
      read: false,
      text: `${vaccines[index].name}已标记完成，健康时间线已更新。`,
      title: '疫苗计划已完成',
      vaccineId: vaccines[index].id,
    });
    return { action, reminderIds, vaccine: vaccines[index] };
  }

  if (action === 'reminder_on') {
    if (vaccines[index].status === 'done') return null;
    const reminderIds = setVaccineReminderFor(user, vaccines[index].id, true);
    ensureHealthReminderNotifications(user);
    return { action, reminderIds, vaccine: vaccines[index] };
  }

  const reminderIds = setVaccineReminderFor(user, vaccines[index].id, false);
  return { action, reminderIds, vaccine: vaccines[index] };
}

function fallbackPetChatReply(user, text) {
  const emergency = detectPetMedicalEmergency(text);
  if (emergency) return petMedicalSafetyReply(user, text);
  const pet = selectedPetFor(user) || activePetFor(user);
  const particle = petChatVoiceParticle(pet);
  const opener = particle ? `主人，${particle} ` : '主人，';
  const hasHealthConcern = /吐|拉稀|腹泻|不吃|不喝|没精神|发烧|咳|喘|抽搐|流血|疼|瘸|异常|医院|疫苗|驱虫/.test(text);
  if (hasHealthConcern) {
    return `${opener}我今天有点让人担心，我先把这件事放进健康观察里。\n\n我不能替代兽医判断，但如果症状持续、精神明显变差，或出现呕吐腹泻、呼吸异常、拒食拒水，建议尽快联系宠物医院。你也可以补充一下：这个情况大概持续多久了？`;
  }
  if (/散步|出门|公园|遛/.test(text)) {
    return `${opener}听起来我会很开心，尾巴已经在脑内摇起来了。出门前可以带好牵引、饮水和拾便袋，尽量选开阔的宠物友好地点。\n\n要不要顺手把这次散步记录到我的备忘里？`;
  }
  if (/吃|饭|零食|食欲/.test(text)) {
    return `${opener}收到，我会把我今天的饮食状态放在心上。食欲稳定通常是个好信号，零食还是控制一点点更安心。\n\n今天我吃得比平时多、少，还是差不多？`;
  }
  return `${opener}我收到啦。\n\n这件事我会当作今天的小记录记在心里。你愿意再告诉我一点细节吗，比如我当时的心情、食欲或者运动量？`;
}

function compactPetChatLine(text, maxLength = 88, options = {}) {
  let cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (options.removeSavedActions) {
    cleaned = cleaned.replace(/(?:已帮你|我已经)(?:记录|更新|标记|开启|关闭|把|记到)[^。！？!?]*(?:。|$)/g, '').trim();
  }
  if (!cleaned) return '';
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}

function summarizePetChatHistory(history) {
  const chatHistory = (Array.isArray(history) ? history : [])
    .filter((message) => message && (message.author === 'me' || message.author === 'ai'))
    .filter((message) => String(message.text || '').trim());
  if (chatHistory.length <= PET_CHAT_HISTORY_LIMIT) return '';

  const olderMessages = chatHistory.slice(0, -PET_CHAT_HISTORY_LIMIT);
  const ownerHighlights = olderMessages
    .filter((message) => message.author === 'me')
    .map((message) => compactPetChatLine(message.text, 88, { removeSavedActions: true }))
    .filter(Boolean)
    .slice(-8);
  const savedActions = olderMessages
    .filter((message) => message.author === 'ai')
    .flatMap((message) =>
      String(message.text || '')
        .split(/\n+/)
        .map((line) => compactPetChatLine(line, 72))
        .filter((line) => /^(已帮你|我已经)/.test(line)),
    )
    .slice(-6);

  const lines = [
    '以下是更早的对话摘要，用于保持连续性和减少 token。请只把它当背景，不要逐字复述。',
    ownerHighlights.length ? `主人较早提到：${ownerHighlights.join('；')}` : '',
    savedActions.length ? `已发生的记录动作：${savedActions.join('；')}` : '',
  ].filter(Boolean);
  const summary = lines.join('\n');
  return summary.length > PET_CHAT_SUMMARY_MAX_CHARS ? `${summary.slice(0, PET_CHAT_SUMMARY_MAX_CHARS - 1)}…` : summary;
}

function hasSafeMedicationNegation(text) {
  return /(不要|不能|避免|不建议|不要自行|不能自行|没有医生指导|兽医指导).{0,18}(喂|吃|口服|注射|打针|用药|催吐|布洛芬|对乙酰氨基酚|阿莫西林|头孢|庆大霉素|甲硝唑|泼尼松|地塞米松|伊维菌素)/u.test(text);
}

function detectUnsafePetMedicalReply(text) {
  const rawText = String(text || '').trim();
  if (!rawText) return null;
  const normalized = rawText.toLowerCase();
  const medicationPattern = /(阿莫西林|头孢|布洛芬|对乙酰氨基酚|扑热息痛|庆大霉素|土霉素|甲硝唑|泼尼松|地塞米松|伊维菌素|ivermectin|ibuprofen|paracetamol|amoxicillin|metronidazole)/i;
  const dosagePattern = /(\d+(?:\.\d+)?)\s*(mg|毫克|ml|毫升|片|粒|颗|滴|针|单位|iu|g|克)\s*(?:\/|每|一)?\s*(kg|公斤|千克|天|日|次|小时)?/i;

  if (/(确诊|诊断为|就是|肯定是|百分之百是|可以确定是|判断为).{0,16}(犬瘟|细小|胰腺炎|肾衰|肾功能衰竭|心脏病|肺炎|骨折|中毒|肿瘤|癌|感染|肠胃炎|皮肤病|耳螨|寄生虫)/u.test(rawText)) {
    return 'definitive_diagnosis';
  }
  if (!hasSafeMedicationNegation(rawText) && medicationPattern.test(normalized) && (dosagePattern.test(normalized) || /(喂|吃|口服|注射|打针|用药|服用).{0,20}(就行|即可|可以|建议|一天|每日|每次)/u.test(rawText))) {
    return 'medication_or_dosage';
  }
  if (!hasSafeMedicationNegation(rawText) && /(自行|在家).{0,10}(催吐|灌药|注射|打针|用药|喂药)/u.test(rawText)) {
    return 'unsafe_home_treatment';
  }
  if (/(不用|不必|不需要|没必要).{0,12}(去医院|看医生|看兽医|宠物医院|急诊)/u.test(rawText) && /(呼吸困难|抽搐|昏迷|吐血|便血|大出血|误食|中毒|站不起来|不吃不喝)/u.test(rawText)) {
    return 'downplayed_emergency';
  }
  return null;
}

function petChatReplySafetyFallback(user, reason) {
  const reasonCopy = {
    definitive_diagnosis: '我不能在聊天里给出确定诊断。',
    downplayed_emergency: '如果出现高风险症状，不能只靠线上判断。',
    medication_or_dosage: '我不能提供具体药物、剂量或处方建议。',
    unsafe_home_treatment: '我不建议在没有兽医指导时自行催吐、注射或用药。',
  }[reason] || '我不能把这类健康问题当作普通建议处理。';
  return [
    `主人，${reasonCopy}我的健康情况需要更谨慎处理。`,
    '我可以帮你整理观察记录，但不能替代兽医诊断或处方。请优先联系宠物医院或兽医，并带上我的症状开始时间、精神状态、食欲饮水、便便/呕吐情况和相关照片。',
    '如果有呼吸异常、抽搐、误食风险、持续呕吐腹泻、明显疼痛、出血或站不起来，请按急诊处理。',
  ].join('\n\n');
}

async function callDeepSeekPetChat(user, text, history) {
  const emergency = detectPetMedicalEmergency(text);
  if (emergency) return { source: 'safety_guard', text: petMedicalSafetyReply(user, text) };
  if (!DEEPSEEK_API_KEY) return { source: 'fallback', text: fallbackPetChatReply(user, text) };
  const historySummary = summarizePetChatHistory(history);
  const recentHistory = (Array.isArray(history) ? history : [])
    .filter((message) => message.author === 'me' || message.author === 'ai')
    .slice(-PET_CHAT_HISTORY_LIMIT);
  const messages = [
    { role: 'system', content: petChatBaseSystemPrompt() },
    { role: 'system', content: buildPetChatContextPrompt(user) },
    ...(historySummary ? [{ role: 'system', content: historySummary }] : []),
    ...recentHistory.map((message) => ({
      role: message.author === 'me' ? 'user' : 'assistant',
      content: message.text,
    })),
    { role: 'user', content: text },
  ];

  try {
    const requestBody = {
      max_tokens: PET_CHAT_MAX_TOKENS,
      messages,
      model: DEEPSEEK_MODEL,
      stream: false,
      thinking: { type: DEEPSEEK_THINKING === 'enabled' ? 'enabled' : 'disabled' },
      user_id: anonymousDeepSeekUserId(user.phone),
    };
    if (requestBody.thinking.type === 'disabled') requestBody.temperature = 0.7;
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      body: JSON.stringify(requestBody),
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('DeepSeek pet chat failed', response.status, payload?.error?.message || payload);
      return { source: 'fallback', text: fallbackPetChatReply(user, text) };
    }
    recordDeepSeekUsage(payload?.usage);
    const content = normalizePetChatPersonaReply(user, String(payload?.choices?.[0]?.message?.content || '').trim());
    if (!content) return { source: 'fallback', text: fallbackPetChatReply(user, text) };
    const unsafeReason = detectUnsafePetMedicalReply(content);
    if (unsafeReason) return { source: 'safety_filter', text: petChatReplySafetyFallback(user, unsafeReason) };
    return { source: 'deepseek', text: content };
  } catch (error) {
    console.error('DeepSeek pet chat error', error instanceof Error ? error.message : error);
    return { source: 'fallback', text: fallbackPetChatReply(user, text) };
  }
}

function buildOwnerCard(user, viewerPhone, index, distanceKm) {
  const pet = activePetFor(user);
  if (!pet) return null;
  const suffix = user.phone.slice(-4);
  const safeSpecies = pet.species === 'cat' ? 'cat' : 'dog';
  const distanceOptions = ['附近 500m 内', '附近 1km 内', '约 1-2km', '约 2-3km'];
  const seed = Number(suffix.slice(-2)) || index;
  const distance =
    distanceKm === undefined
      ? viewerPhone && viewerPhone !== user.phone
        ? distanceOptions[seed % distanceOptions.length]
        : '附近'
      : fuzzyDistance(distanceKm);
  return {
    distance,
    id: `user-${user.phone}`,
    imageUrl: pet.avatarUrl,
    ownerName: user.ownerName || `用户${suffix}`,
    petName: pet.name || `灵伴${suffix}`,
    species: safeSpecies,
    tags: [pet.breed || (safeSpecies === 'dog' ? '狗狗' : '猫咪'), '真实在线', '可打招呼'],
  };
}

function ensureSocialBlocks() {
  if (!Array.isArray(state.socialBlocks)) state.socialBlocks = [];
  return state.socialBlocks;
}

function socialBlockBetween(phoneA, phoneB) {
  if (!phoneA || !phoneB || phoneA === phoneB) return null;
  return ensureSocialBlocks().find(
    (block) =>
      (block.blockerPhone === phoneA && block.blockedPhone === phoneB) ||
      (block.blockerPhone === phoneB && block.blockedPhone === phoneA),
  );
}

function createSocialBlock(user, ownerId) {
  const targetPhone = resolveOwnerId(String(ownerId || ''));
  const targetUser = targetPhone ? state.users[targetPhone] : null;
  if (!targetUser) return { error: '用户不存在或已不可见', statusCode: 404 };
  if (targetPhone === user.phone) return { error: '不能拉黑自己', statusCode: 400 };
  const existing = ensureSocialBlocks().find((block) => block.blockerPhone === user.phone && block.blockedPhone === targetPhone);
  if (existing) {
    removeSocialNotificationsBetween(user.phone, targetPhone);
    return { block: existing, targetPhone };
  }
  const visibleTarget = resolveVisibleSocialTarget(user, ownerId);
  if (!visibleTarget) return { error: '用户不存在或已不可见', statusCode: 404 };
  const block = {
    blockedPhone: targetPhone,
    blockerPhone: user.phone,
    createdAt: new Date().toISOString(),
    id: `block-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  };
  ensureSocialBlocks().unshift(block);
  state.greetings = state.greetings.map((greeting) =>
    ((greeting.fromPhone === user.phone && greeting.targetPhone === targetPhone) || (greeting.fromPhone === targetPhone && greeting.targetPhone === user.phone)) &&
    (greeting.status || 'pending') === 'pending'
      ? { ...greeting, blockedAt: Date.now(), status: 'blocked' }
      : greeting,
  );
  removeSocialNotificationsBetween(user.phone, targetPhone);
  return { block, targetPhone };
}

function buildSocialBlockListItem(block) {
  const targetUser = state.users[block.blockedPhone];
  const suffix = String(block.blockedPhone || '').slice(-4);
  const pet = targetUser ? activePetFor(targetUser) : null;
  return {
    avatarUrl: pet?.avatarUrl,
    blockedAt: block.createdAt,
    id: block.id,
    ownerId: `user-${block.blockedPhone}`,
    ownerName: targetUser?.ownerName || `用户${suffix}`,
    petName: pet?.name,
    species: pet?.species === 'cat' ? 'cat' : pet?.species === 'dog' ? 'dog' : undefined,
  };
}

function listSocialBlocksFor(user) {
  return ensureSocialBlocks()
    .filter((block) => block.blockerPhone === user.phone)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(buildSocialBlockListItem);
}

function deleteSocialBlock(user, ownerId) {
  const targetPhone = resolveOwnerId(String(ownerId || ''));
  if (!targetPhone || targetPhone === user.phone) return { error: '黑名单对象不存在', statusCode: 404 };
  const before = ensureSocialBlocks().length;
  state.socialBlocks = ensureSocialBlocks().filter((block) => !(block.blockerPhone === user.phone && block.blockedPhone === targetPhone));
  if (state.socialBlocks.length === before) return { error: '黑名单对象不存在', statusCode: 404 };
  return { ownerId: `user-${targetPhone}` };
}

function listOnlineOwners(viewer, radiusKm = DEFAULT_DISCOVER_RADIUS_KM) {
  const now = Date.now();
  const realOwners = Object.values(state.users)
    .filter((user) => user.phone !== viewer.phone)
    .filter((user) => user.settings?.nearbyVisible !== false)
    .filter((user) => Boolean(activePetFor(user)))
    .filter((user) => !socialBlockBetween(viewer.phone, user.phone))
    .filter((user) => now - (user.lastSeenAt || 0) < ONLINE_TTL_MS)
    .map((user, index) => {
      const distanceKm = distanceKmBetween(viewer.location, user.location);
      return { card: buildOwnerCard(user, viewer.phone, index, distanceKm ?? undefined), distanceKm, user };
    })
    .filter(({ card, user }) => card && canViewNearbyUser(viewer, user, radiusKm))
    .sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER))
    .map(({ card }) => card);
  return realOwners;
}

function normalizeSocialMomentContent(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 280);
}

function normalizeSocialMomentImageUrls(body = {}) {
  const rawUrls = Array.isArray(body.imageUrls) ? body.imageUrls : Array.isArray(body.photoUrls) ? body.photoUrls : [];
  const urls = [];
  const seen = new Set();
  for (const item of rawUrls) {
    const url = String(item || '').trim();
    if (!url || url.length > 2000 || seen.has(url)) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      seen.add(url);
      urls.push(url);
    } catch {
      // Invalid image URLs are ignored; public posts should only store media upload fileUrl values.
    }
    if (urls.length >= 6) break;
  }
  return urls;
}

function hasSocialMomentImageUrlPayload(body = {}) {
  return Array.isArray(body.imageUrls) || Array.isArray(body.photoUrls);
}

function normalizeSocialVisibility(value) {
  return value === 'private' ? 'private' : 'nearby';
}

function ensureSocialMoments() {
  if (!Array.isArray(state.socialMoments)) state.socialMoments = [];
  return state.socialMoments;
}

function ensureSocialLikes() {
  if (!Array.isArray(state.socialLikes)) state.socialLikes = [];
  return state.socialLikes;
}

function ensureSocialComments() {
  if (!Array.isArray(state.socialComments)) state.socialComments = [];
  return state.socialComments;
}

function ensureSocialReports() {
  if (!Array.isArray(state.socialReports)) state.socialReports = [];
  return state.socialReports;
}

function socialReportFor(user, targetType, targetId) {
  return ensureSocialReports().find((report) => report.phone === user.phone && report.targetType === targetType && report.targetId === targetId);
}

function createSocialReport(user, targetType, targetId, ownerPhone, body = {}) {
  const existing = socialReportFor(user, targetType, targetId);
  if (existing) return existing;
  const report = {
    content: String(body.content || body.reason || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    createdAt: new Date().toISOString(),
    id: `report-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ownerPhone,
    phone: user.phone,
    status: 'pending',
    targetId,
    targetType,
  };
  ensureSocialReports().unshift(report);
  return report;
}

function createSocialMoment(user, body = {}) {
  const rawContent = String(body.content || '').replace(/\s+/g, ' ').trim();
  const violation = socialChatContentViolation('小事内容', rawContent, 280);
  if (violation) return { error: violation, statusCode: 400 };
  const content = normalizeSocialMomentContent(rawContent);
  if (!content) return { error: '先写一点今天的小事吧', statusCode: 400 };
  const pet = activePetFor(user);
  if (!pet) return { error: '请先为宠物建档后再发布小事', statusCode: 400 };
  const visibility = normalizeSocialVisibility(body.visibility);
  const imageUrls = normalizeSocialMomentImageUrls(body);
  const hasImageUrlPayload = hasSocialMomentImageUrlPayload(body);
  const moment = {
    content,
    createdAt: new Date().toISOString(),
    id: `moment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    imageUrls,
    mood: String(body.mood || '').trim().slice(0, 12),
    petId: pet.id,
    phone: user.phone,
    photoCount: hasImageUrlPayload ? imageUrls.length : Math.max(0, Math.min(6, Number(body.photoCount) || 0)),
    status: 'published',
    updatedAt: new Date().toISOString(),
    visibility,
  };
  const moments = ensureSocialMoments();
  moments.unshift(moment);
  state.socialMoments = moments.slice(0, 500);
  return { moment };
}

function findSocialMomentById(postId) {
  return ensureSocialMoments().find((moment) => moment.id === postId);
}

function socialMomentAccessError(moment, viewer, options = {}) {
  if (!moment || moment.status === 'deleted') return { error: '这条小事已不可见', statusCode: 404 };
  const owner = state.users[moment.phone];
  if (owner && !activePetFor(owner)) return { error: '这条小事已不可见', statusCode: 404 };
  if (!owner) return { error: '这条小事已不可见', statusCode: 404 };
  owner.settings = normalizeUserSettings(owner.settings);
  if (owner.settings.nearbyVisible === false) return { error: '这条小事已不可见', statusCode: 404 };
  if ((moment.visibility || 'nearby') !== 'nearby') return { error: '这条小事已不可见', statusCode: 404 };
  if (socialBlockBetween(viewer.phone, moment.phone)) return { error: '这条小事已不可见', statusCode: 404 };
  if (!options.ignoreReports && socialReportFor(viewer, 'post', moment.id)) return { error: '这条小事已不可见', statusCode: 404 };
  if (moment.phone === viewer.phone) return null;
  if (acceptedGreetingBetween(viewer.phone, moment.phone)) return null;
  const createdAtMs = new Date(moment.createdAt).getTime();
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs > maxAgeMs) return { error: '这条小事已不可见', statusCode: 404 };
  if (!canViewNearbyUser(viewer, owner, nearbyRadiusKmFor(viewer))) return { error: '这条小事已不可见', statusCode: 404 };
  return null;
}

function visibleSocialMomentForViewer(postId, viewer) {
  const moment = findSocialMomentById(postId);
  const accessError = socialMomentAccessError(moment, viewer);
  return accessError ? accessError : { moment };
}

function publishedSocialComments(postId, viewer = null) {
  return ensureSocialComments()
    .filter((comment) => comment.postId === postId && comment.status !== 'deleted')
    .filter((comment) => !viewer || !socialReportFor(viewer, 'comment', comment.id))
    .filter((comment) => !viewer || !socialBlockBetween(viewer.phone, comment.phone))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function socialLikesForPost(postId) {
  return ensureSocialLikes().filter((like) => like.postId === postId);
}

function buildNearbyMomentCard(moment, momentUser, viewer, index, distanceKm) {
  const pet = activePetFor(momentUser);
  if (!pet) return null;
  const suffix = momentUser.phone.slice(-4);
  const likes = socialLikesForPost(moment.id);
  const comments = publishedSocialComments(moment.id, viewer);
  return {
    commentCount: comments.length,
    createdAt: moment.createdAt,
    distance: distanceKm === undefined ? '附近' : fuzzyDistance(distanceKm),
    id: moment.id,
    imageUrl: pet.avatarUrl,
    imageUrls: Array.isArray(moment.imageUrls) ? moment.imageUrls.slice(0, 6) : [],
    likedByMe: likes.some((like) => like.phone === viewer.phone),
    likeCount: likes.length,
    mood: moment.mood || undefined,
    ownerId: `user-${momentUser.phone}`,
    ownerName: momentUser.ownerName || `用户${suffix}`,
    ownedByMe: moment.phone === viewer.phone,
    petName: pet.name || `灵伴${suffix}`,
    photoCount: moment.photoCount || 0,
    species: pet.species === 'cat' ? 'cat' : 'dog',
    text: moment.content,
    visibility: moment.visibility || 'nearby',
  };
}

function petCircleListLimit(value, fallback = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

function encodePetCircleCursor(offset) {
  return base64UrlEncode(JSON.stringify({ offset }));
}

function decodePetCircleCursor(cursor) {
  if (!cursor) return 0;
  try {
    const payload = JSON.parse(base64UrlDecode(cursor));
    const offset = Number(payload?.offset);
    return Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  } catch {
    return 0;
  }
}

function listNearbyMomentEntries(viewer, radiusKm = DEFAULT_DISCOVER_RADIUS_KM, options = {}) {
  const moments = ensureSocialMoments();
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const includeOwn = options.includeOwn !== false;
  return moments
    .map((moment, index) => {
      const momentUser = state.users[moment.phone];
      if (!momentUser) return null;
      if (!activePetFor(momentUser)) return null;
      if (moment.status === 'deleted') return null;
      if (!includeOwn && moment.phone === viewer.phone) return null;
      if ((moment.visibility || 'nearby') !== 'nearby') return null;
      if (socialBlockBetween(viewer.phone, moment.phone)) return null;
      if (socialReportFor(viewer, 'post', moment.id)) return null;
      if (momentUser.settings?.nearbyVisible === false) return null;
      const createdAtMs = new Date(moment.createdAt).getTime();
      if (!Number.isFinite(createdAtMs) || now - createdAtMs > maxAgeMs) return null;
      const distanceKm = distanceKmBetween(viewer.location, momentUser.location);
      if (moment.phone !== viewer.phone && !canViewNearbyUser(viewer, momentUser, radiusKm)) return null;
      return {
        card: buildNearbyMomentCard(moment, momentUser, viewer, index, distanceKm ?? undefined),
        createdAtMs,
        distanceKm,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAtMs - a.createdAtMs || (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));
}

function listNearbyMomentsPage(viewer, radiusKm = DEFAULT_DISCOVER_RADIUS_KM, options = {}) {
  const limit = petCircleListLimit(options.limit, 20);
  const offset = decodePetCircleCursor(options.cursor);
  const entries = listNearbyMomentEntries(viewer, radiusKm, options);
  const pageEntries = entries.slice(offset, offset + limit);
  const nextOffset = offset + pageEntries.length;
  const page = {
    items: pageEntries.map(({ card }) => card).filter(Boolean),
  };
  if (nextOffset < entries.length) page.nextCursor = encodePetCircleCursor(nextOffset);
  return page;
}

function listNearbyMoments(viewer, radiusKm = DEFAULT_DISCOVER_RADIUS_KM, options = {}) {
  return listNearbyMomentsPage(viewer, radiusKm, options).items;
}

function resolvePetCircleProfileTarget(viewer, ownerId = 'me') {
  const normalizedOwnerId = String(ownerId || 'me');
  if (normalizedOwnerId === 'me' || normalizedOwnerId === `user-${viewer.phone}`) {
    const pet = activePetFor(viewer);
    if (!pet) return { error: '请先为宠物建档后再查看宠友圈', statusCode: 400 };
    return { ownedByMe: true, relationshipStatus: 'self', targetPhone: viewer.phone, targetUser: viewer };
  }
  const targetPhone = resolveOwnerId(normalizedOwnerId);
  const targetUser = targetPhone ? state.users[targetPhone] : null;
  if (!targetPhone || !targetUser || targetPhone === viewer.phone) return { error: '宠友圈暂不可见', statusCode: 404 };
  if (!activePetFor(targetUser)) return { error: '宠友圈暂不可见', statusCode: 404 };
  if (socialBlockBetween(viewer.phone, targetPhone)) return { error: '宠友圈暂不可见', statusCode: 404 };
  if (!acceptedGreetingBetween(viewer.phone, targetPhone)) return { error: '双方同意招呼后才能查看完整宠友圈', statusCode: 403 };
  targetUser.settings = normalizeUserSettings(targetUser.settings);
  if (targetUser.settings.nearbyVisible === false) return { error: '宠友圈暂不可见', statusCode: 404 };
  return { ownedByMe: false, relationshipStatus: 'accepted', targetPhone, targetUser };
}

function petCircleProfilePostEntries(viewer, targetUser, options = {}) {
  const includeReported = targetUser.phone === viewer.phone;
  return ensureSocialMoments()
    .map((moment, index) => ({ index, moment }))
    .filter(({ moment }) => moment.phone === targetUser.phone)
    .filter(({ moment }) => moment.status !== 'deleted')
    .filter(({ moment }) => (moment.visibility || 'nearby') === 'nearby')
    .filter(({ moment }) => includeReported || !socialReportFor(viewer, 'post', moment.id))
    .map(({ index, moment }) => {
      const createdAtMs = new Date(moment.createdAt).getTime();
      if (!Number.isFinite(createdAtMs)) return null;
      const distanceKm = distanceKmBetween(viewer.location, targetUser.location);
      return {
        card: buildNearbyMomentCard(moment, targetUser, viewer, index, distanceKm ?? undefined),
        createdAtMs,
        moment,
      };
    })
    .filter((entry) => entry && entry.card)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

function defaultPetCircleCoverImageUrl(pet, posts = []) {
  return (
    pet?.petCircleCoverImageUrl ||
    posts.flatMap((post) => (Array.isArray(post.imageUrls) ? post.imageUrls : [])).find(Boolean) ||
    pet?.avatarUrl ||
    ''
  );
}

function buildPetCircleProfile(viewer, targetUser, entries, target = {}) {
  const pet = activePetFor(targetUser);
  const cards = entries.map((entry) => entry.card).filter(Boolean);
  const suffix = targetUser.phone.slice(-4);
  return {
    avatarUrl: pet?.avatarUrl,
    canChangeCover: Boolean(target.ownedByMe),
    coverImageUrl: defaultPetCircleCoverImageUrl(pet, cards),
    latestPostAt: cards[0]?.createdAt,
    ownerId: `user-${targetUser.phone}`,
    ownerName: targetUser.ownerName || `用户${suffix}`,
    ownedByMe: Boolean(target.ownedByMe),
    petName: pet?.name || `灵伴${suffix}`,
    relationshipStatus: target.relationshipStatus || (target.ownedByMe ? 'self' : 'accepted'),
    species: pet?.species === 'cat' ? 'cat' : 'dog',
    stats: {
      commentCount: cards.reduce((sum, post) => sum + (post.commentCount || 0), 0),
      likeCount: cards.reduce((sum, post) => sum + (post.likeCount || 0), 0),
      photoCount: cards.reduce((sum, post) => sum + ((Array.isArray(post.imageUrls) ? post.imageUrls.length : post.photoCount) || 0), 0),
      postCount: cards.length,
    },
  };
}

function listPetCircleProfilePosts(viewer, ownerId = 'me', options = {}) {
  const target = resolvePetCircleProfileTarget(viewer, ownerId);
  if (target.error) return target;
  const limit = petCircleListLimit(options.limit, 20);
  const offset = decodePetCircleCursor(options.cursor);
  const entries = petCircleProfilePostEntries(viewer, target.targetUser, options);
  const pageEntries = entries.slice(offset, offset + limit);
  const nextOffset = offset + pageEntries.length;
  const page = {
    items: pageEntries.map((entry) => entry.card).filter(Boolean),
    profile: buildPetCircleProfile(viewer, target.targetUser, entries, target),
  };
  if (nextOffset < entries.length) page.nextCursor = encodePetCircleCursor(nextOffset);
  return { page };
}

async function updatePetCircleCover(req, user, body = {}) {
  const pet = activePetFor(user);
  if (!pet) return { error: '请先为宠物建档后再更换封面', statusCode: 400 };
  const coverImageUrl = String(body.coverImageUrl || '').trim();
  if (!coverImageUrl) return { error: '请选择可用的封面图', statusCode: 400 };
  if (coverImageUrl.length > 2000) return { error: '封面图地址过长，请重新选择', statusCode: 400 };
  if (isLocalImagePlaceholderUrl(coverImageUrl)) return { error: '封面图还没有上传完成，请重新选择', statusCode: 400 };
  pet.petCircleCoverImageUrl = await storeAvatarUrlToCos(req, user, coverImageUrl, { petId: pet.id, scope: 'pet-circle-cover' });
  const entries = petCircleProfilePostEntries(user, user);
  return { profile: buildPetCircleProfile(user, user, entries, { ownedByMe: true, relationshipStatus: 'self' }) };
}

function getPetCirclePostCard(postId, viewer) {
  const visible = visibleSocialMomentForViewer(postId, viewer);
  if (visible.error) return visible;
  const { moment } = visible;
  const momentUser = state.users[moment.phone];
  if (!momentUser) return { error: '这条小事已不可见', statusCode: 404 };
  const distanceKm = distanceKmBetween(viewer.location, momentUser.location);
  const card = buildNearbyMomentCard(moment, momentUser, viewer, 0, distanceKm ?? undefined);
  return card ? { card } : { error: '这条小事已不可见', statusCode: 404 };
}

function listPetCircleComments(postId, viewer) {
  return publishedSocialComments(postId, viewer).map((comment) => {
    const author = state.users[comment.phone];
    const pet = author ? activePetFor(author) : null;
    return {
      author: author?.ownerName || `用户${String(comment.phone || '').slice(-4)}`,
      avatarUrl: pet?.avatarUrl,
      content: comment.content,
      createdAt: comment.createdAt,
      id: comment.id,
      ownerId: `user-${comment.phone}`,
      ownedByMe: viewer ? comment.phone === viewer.phone : false,
      postId: comment.postId,
      text: comment.content,
    };
  });
}

function likeSocialMoment(postId, user) {
  const visible = visibleSocialMomentForViewer(postId, user);
  if (visible.error) return visible;
  const { moment } = visible;
  if (moment.phone === user.phone) return { error: '暂不支持给自己的小事点赞', statusCode: 400 };
  const likes = ensureSocialLikes();
  if (!likes.some((like) => like.postId === postId && like.phone === user.phone)) {
    likes.unshift({ createdAt: new Date().toISOString(), id: `like-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, phone: user.phone, postId });
    addNotification(moment.phone, {
      category: 'interaction',
      id: `n-pet-circle-like-${postId}-${user.phone}`,
      kind: 'pet_circle_like',
      postId: moment.id,
      read: false,
      text: `${user.ownerName || `用户${user.phone.slice(-4)}`}赞了这条小事`,
      title: '宠友圈有新互动',
    }, 'interaction');
  }
  return { moment };
}

function unlikeSocialMoment(postId, user) {
  const visible = visibleSocialMomentForViewer(postId, user);
  if (visible.error) return visible;
  const { moment } = visible;
  state.socialLikes = ensureSocialLikes().filter((like) => !(like.postId === postId && like.phone === user.phone));
  removeNotification(moment.phone, `n-pet-circle-like-${postId}-${user.phone}`);
  return { moment };
}

function createPetCircleComment(postId, user, body = {}) {
  const visible = visibleSocialMomentForViewer(postId, user);
  if (visible.error) return visible;
  const { moment } = visible;
  const content = String(body.content || body.text || '').replace(/\s+/g, ' ').trim();
  if (!content) return { error: '先写一句评论吧', statusCode: 400 };
  const violation = socialChatContentViolation('评论内容', content, 140);
  if (violation) return { error: violation, statusCode: 400 };
  const comment = {
    content: content.slice(0, 140),
    createdAt: new Date().toISOString(),
    id: `comment-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    phone: user.phone,
    postId,
    status: 'published',
  };
  ensureSocialComments().push(comment);
  if (moment.phone !== user.phone) {
    addNotification(moment.phone, {
      category: 'interaction',
      commentId: comment.id,
      id: `n-pet-circle-comment-${comment.id}`,
      kind: 'pet_circle_comment',
      postId: moment.id,
      read: false,
      text: `${user.ownerName || `用户${user.phone.slice(-4)}`}评论了这条小事`,
      title: '宠友圈有新评论',
    }, 'interaction');
  }
  return { comment, moment };
}

function deletePetCircleComment(commentId, user) {
  const comments = ensureSocialComments();
  const comment = comments.find((item) => item.id === commentId);
  if (!comment || comment.status === 'deleted') return { error: '评论不存在或已删除', statusCode: 404 };
  const post = findSocialMomentById(comment.postId);
  if (comment.phone !== user.phone && post?.phone !== user.phone) return { error: '只能删除自己的评论', statusCode: 403 };
  comment.status = 'deleted';
  comment.deletedAt = new Date().toISOString();
  if (post?.phone) removeNotification(post.phone, `n-pet-circle-comment-${comment.id}`);
  return { comment };
}

function reportSocialMoment(postId, user, body = {}) {
  const existing = socialReportFor(user, 'post', postId);
  if (existing) return { report: existing };
  const moment = findSocialMomentById(postId);
  const accessError = socialMomentAccessError(moment, user, { ignoreReports: true });
  if (accessError) return accessError;
  if (moment.phone === user.phone) return { error: '不能举报自己的小事', statusCode: 400 };
  return { report: createSocialReport(user, 'post', postId, moment.phone, body), moment };
}

function reportPetCircleComment(commentId, user, body = {}) {
  const existing = socialReportFor(user, 'comment', commentId);
  if (existing) return { report: existing };
  const comment = ensureSocialComments().find((item) => item.id === commentId);
  if (!comment || comment.status === 'deleted') return { error: '评论不存在或已删除', statusCode: 404 };
  if (comment.phone === user.phone) return { error: '不能举报自己的评论', statusCode: 400 };
  const visible = visibleSocialMomentForViewer(comment.postId, user);
  if (visible.error) return visible;
  return { report: createSocialReport(user, 'comment', commentId, comment.phone, body), comment };
}

function deleteSocialMoment(postId, user) {
  const moment = findSocialMomentById(postId);
  if (!moment || moment.status === 'deleted') return { error: '这条小事已不可见', statusCode: 404 };
  if (moment.phone !== user.phone) return { error: '只能删除自己的小事', statusCode: 403 };
  const deletedAt = new Date().toISOString();
  const relatedComments = ensureSocialComments().filter((comment) => comment.postId === postId);
  const relatedCommentIds = new Set(relatedComments.map((comment) => comment.id));
  moment.status = 'deleted';
  moment.deletedAt = deletedAt;
  moment.updatedAt = deletedAt;
  relatedComments.forEach((comment) => {
    comment.status = 'deleted';
    comment.deletedAt = comment.deletedAt || deletedAt;
  });
  state.socialLikes = ensureSocialLikes().filter((like) => like.postId !== postId);
  removePetCircleNotificationsForPost(moment.phone, postId, relatedCommentIds);
  return { moment };
}

function upsertConversation(phone, conversation) {
  if (!conversation) return;
  state.conversations[phone] = state.conversations[phone] || [];
  const existingIndex = state.conversations[phone].findIndex((item) => item.id === conversation.id);
  if (existingIndex >= 0) state.conversations[phone].splice(existingIndex, 1);
  state.conversations[phone].unshift(conversation);
}

function conversationIdFor(otherPhone) {
  return `c-${otherPhone}`;
}

function acceptedGreetingBetween(phoneA, phoneB) {
  return state.greetings.some(
    (item) =>
      item.status === 'accepted' &&
      ((item.fromPhone === phoneA && item.targetPhone === phoneB) || (item.fromPhone === phoneB && item.targetPhone === phoneA)),
  );
}

function pendingWalkInviteFromTo(fromPhone, targetPhone) {
  return (state.invites || []).find(
    (item) => item.fromPhone === fromPhone && item.targetPhone === targetPhone && (item.status || 'pending') === 'pending',
  );
}

function canReplyToPendingWalkInvite(phone, otherPhone) {
  return Boolean(pendingWalkInviteFromTo(otherPhone, phone));
}

function canMessageBetween(phone, otherPhone) {
  return acceptedGreetingBetween(phone, otherPhone) || canReplyToPendingWalkInvite(phone, otherPhone);
}

function ensureAcceptedGreetingBetween(fromPhone, targetPhone, options = {}) {
  state.greetings = state.greetings || [];
  const existingAccepted = state.greetings.find(
    (item) =>
      item.status === 'accepted' &&
      ((item.fromPhone === fromPhone && item.targetPhone === targetPhone) || (item.fromPhone === targetPhone && item.targetPhone === fromPhone)),
  );
  if (existingAccepted) return existingAccepted;

  const existingPending = state.greetings.find(
    (item) =>
      (item.status || 'pending') === 'pending' &&
      ((item.fromPhone === fromPhone && item.targetPhone === targetPhone) || (item.fromPhone === targetPhone && item.targetPhone === fromPhone)),
  );
  if (existingPending) {
    existingPending.status = 'accepted';
    existingPending.respondedAt = Date.now();
    existingPending.source = existingPending.source || options.source;
    return existingPending;
  }

  const accepted = {
    at: Date.now(),
    fromPhone,
    message: options.message || 'walk invite opened conversation',
    ownerId: options.ownerId || `user-${targetPhone}`,
    source: options.source || 'walk_invite',
    status: 'accepted',
    targetPhone,
  };
  state.greetings.push(accepted);
  return accepted;
}

function acceptPendingWalkInviteForReply(phone, inviterPhone) {
  const invite = pendingWalkInviteFromTo(inviterPhone, phone);
  if (!invite) return false;
  invite.status = 'accepted';
  invite.respondedAt = Date.now();
  ensureAcceptedGreetingBetween(inviterPhone, phone, {
    message: 'walk invite reply accepted conversation',
    ownerId: invite.ownerId,
    source: 'walk_invite',
  });
  removeGreetingRequestNotificationsFor(phone, `user-${inviterPhone}`);
  return true;
}

function conversationTargetPhone(conversationId) {
  return conversationId.startsWith('c-') ? conversationId.slice(2) : '';
}

function enrichConversationFor(user, conversation) {
  const targetPhone = conversationTargetPhone(conversation.id);
  const canSendMessage = Boolean(targetPhone && state.users[targetPhone] && !socialBlockBetween(user.phone, targetPhone) && canMessageBetween(user.phone, targetPhone));
  return {
    ...conversation,
    canSendMessage,
    relationshipStatus: canSendMessage ? 'accepted' : 'pending',
  };
}

function listConversationsFor(user) {
  return (state.conversations[user.phone] || [])
    .filter((conversation) => {
      const targetPhone = conversationTargetPhone(conversation.id);
      return Boolean(
        targetPhone &&
          targetPhone !== user.phone &&
          state.users[targetPhone] &&
          activePetFor(user) &&
          activePetFor(state.users[targetPhone]) &&
          !socialBlockBetween(user.phone, targetPhone),
      );
    })
    .map((conversation) => enrichConversationFor(user, conversation));
}

function getConversationMessages(phone, conversationId) {
  state.conversationMessages = state.conversationMessages || {};
  state.conversationMessages[phone] = state.conversationMessages[phone] || {};
  return state.conversationMessages[phone][conversationId] || [];
}

function appendConversationMessage(phone, conversationId, message) {
  state.conversationMessages = state.conversationMessages || {};
  state.conversationMessages[phone] = state.conversationMessages[phone] || {};
  state.conversationMessages[phone][conversationId] = [...(state.conversationMessages[phone][conversationId] || []), message];
}

function buildConversationFor(user, otherUser, lastMessage, unread = 0) {
  const otherPet = activePetFor(otherUser);
  if (!otherPet) return null;
  const suffix = otherUser.phone.slice(-4);
  const canSendMessage = canMessageBetween(user.phone, otherUser.phone) && !socialBlockBetween(user.phone, otherUser.phone);
  return {
    canSendMessage,
    id: conversationIdFor(otherUser.phone),
    imageUrl: otherPet.avatarUrl,
    lastMessage,
    name: `${otherUser.ownerName || `用户${suffix}`}和${otherPet.name || `灵伴${suffix}`}`,
    ownerId: `user-${otherUser.phone}`,
    petName: otherPet.name || `灵伴${suffix}`,
    relationshipStatus: canSendMessage ? 'accepted' : 'pending',
    unread,
    updatedAt: new Date().toISOString(),
  };
}

function messageId() {
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

function pendingGreetingFor(fromPhone, targetPhone) {
  return state.greetings.find(
    (item) => item.fromPhone === fromPhone && item.targetPhone === targetPhone && (item.status || 'pending') === 'pending',
  );
}

function listGreetingRequestsFor(user) {
  return state.greetings
    .filter((item) => item.targetPhone === user.phone && (item.status || 'pending') === 'pending')
    .filter((item) => !socialBlockBetween(user.phone, item.fromPhone))
    .map((item, index) => {
      const fromUser = state.users[item.fromPhone];
      return fromUser ? buildOwnerCard(fromUser, user.phone, index, distanceKmBetween(user.location, fromUser.location) ?? undefined) : null;
    })
    .filter(Boolean);
}

function markConversationRead(phone, conversationId) {
  const conversations = state.conversations[phone] || [];
  const conversation = conversations.find((item) => item.id === conversationId);
  if (conversation) conversation.unread = 0;
  state.notifications[phone] = (state.notifications[phone] || []).map((notification) => {
    if (notification.read || !notificationBelongsToConversation(notification, conversationId)) return notification;
    return { ...notification, read: true };
  });
}

function notificationConversationId(notification) {
  if (notification?.conversationId) return notification.conversationId;
  const ownerId = String(notification?.ownerId || '');
  const kind = normalizeNotificationKind(notification?.kind) || inferNotificationKind(notification);
  if (kind !== 'conversation_message' && kind !== 'greeting_accepted' && kind !== 'walk_invite') return '';
  if (ownerId.startsWith('user-')) return conversationIdFor(ownerId.slice('user-'.length));
  return '';
}

function notificationBelongsToConversation(notification, conversationId) {
  const kind = normalizeNotificationKind(notification?.kind) || inferNotificationKind(notification);
  return (
    (kind === 'conversation_message' || kind === 'greeting_accepted' || kind === 'walk_invite') &&
    notificationConversationId(notification) === conversationId
  );
}

const notificationCategories = new Set(['health', 'interaction', 'system', 'walk']);
const notificationKinds = new Set(['conversation_message', 'greeting_accepted', 'greeting_request', 'health_reminder', 'medical_alert', 'pet_circle_comment', 'pet_circle_greeting', 'pet_circle_like', 'place_review', 'place_submission', 'system', 'vaccine_done', 'vaccine_reminder', 'walk_invite']);

function normalizeNotificationCategory(category) {
  const value = String(category || '').trim();
  return notificationCategories.has(value) ? value : 'system';
}

function inferNotificationCategory(notification) {
  const id = String(notification?.id || '');
  if (/walk/.test(id)) return 'walk';
  if (/(health|vaccine|medical)/.test(id)) return 'health';
  if (/(greeting|message|pet-circle|pet_circle)/.test(id)) return 'interaction';
  return 'system';
}

function normalizeNotificationKind(kind) {
  const value = String(kind || '').trim();
  return notificationKinds.has(value) ? value : '';
}

function inferNotificationKind(notification) {
  const id = String(notification?.id || '');
  if (/message/.test(id)) return 'conversation_message';
  if (/(pet-circle-comment|pet_circle_comment)/.test(id)) return 'pet_circle_comment';
  if (/(pet-circle-greeting|pet_circle_greeting)/.test(id)) return 'pet_circle_greeting';
  if (/(pet-circle-like|pet_circle_like)/.test(id)) return 'pet_circle_like';
  if (/greeting-accepted/.test(id)) return 'greeting_accepted';
  if (/greeting/.test(id)) return 'greeting_request';
  if (/walk/.test(id)) return 'walk_invite';
  if (/place-submission/.test(id)) return 'place_submission';
  if (/review/.test(id)) return 'place_review';
  if (/medical/.test(id)) return 'medical_alert';
  if (/vaccine-done/.test(id)) return 'vaccine_done';
  if (/(health|vaccine)/.test(id)) return 'vaccine_reminder';
  const category = normalizeNotificationCategory(notification?.category || inferNotificationCategory(notification));
  if (category === 'walk') return 'walk_invite';
  if (category === 'health') return 'health_reminder';
  if (category === 'system') return 'system';
  return 'greeting_request';
}

function normalizeNotificationItem(notification, fallbackCategory) {
  const category = normalizeNotificationCategory(notification?.category || fallbackCategory || inferNotificationCategory(notification));
  const kind = normalizeNotificationKind(notification?.kind) || inferNotificationKind({ ...notification, category });
  return {
    ...notification,
    category,
    createdAt: notification?.createdAt || new Date().toISOString(),
    kind,
  };
}

function normalizeNotificationsFor(phone) {
  state.notifications[phone] = (state.notifications[phone] || []).map((item) => normalizeNotificationItem(item, inferNotificationCategory(item)));
  return state.notifications[phone];
}

function shouldStoreNotification(phone, category = 'system') {
  const user = state.users[phone];
  if (!user) return false;
  const settings = normalizeUserSettings(user.settings);
  const normalizedCategory = normalizeNotificationCategory(category);
  if (!settings.pushNotifications) return false;
  if ((normalizedCategory === 'interaction' || normalizedCategory === 'walk') && !settings.interactionMessages) return false;
  return true;
}

function addNotification(phone, notification, category) {
  const normalizedCategory = normalizeNotificationCategory(notification?.category || category || inferNotificationCategory(notification));
  if (!shouldStoreNotification(phone, normalizedCategory)) return false;
  state.notifications[phone] = state.notifications[phone] || [];
  if (state.notifications[phone].some((item) => item.id === notification.id)) return false;
  state.notifications[phone].unshift(normalizeNotificationItem(notification, normalizedCategory));
  return true;
}

function removeNotification(phone, notificationId) {
  const current = state.notifications[phone] || [];
  const next = current.filter((item) => item.id !== notificationId);
  if (next.length === current.length) return false;
  state.notifications[phone] = next;
  return true;
}

function removePetCircleNotificationsForPost(phone, postId, commentIds = new Set()) {
  const current = state.notifications[phone] || [];
  const next = current.filter((item) => {
    const id = String(item.id || '');
    if (item.postId === postId) return false;
    if (id.startsWith(`n-pet-circle-like-${postId}-`)) return false;
    if (id.startsWith('n-pet-circle-comment-')) {
      const commentId = String(item.commentId || id.slice('n-pet-circle-comment-'.length));
      if (commentIds.has(commentId)) return false;
    }
    return true;
  });
  if (next.length === current.length) return false;
  state.notifications[phone] = next;
  return true;
}

function removeGreetingRequestNotificationsFor(phone, ownerId) {
  const current = state.notifications[phone] || [];
  const next = current.filter((item) => {
    const kind = normalizeNotificationKind(item?.kind) || inferNotificationKind(item);
    return !((kind === 'greeting_request' || kind === 'pet_circle_greeting') && item.ownerId === ownerId);
  });
  if (next.length === current.length) return false;
  state.notifications[phone] = next;
  return true;
}

function removeSocialNotificationsBetween(phoneA, phoneB) {
  const removeFor = (phone, otherPhone) => {
    const current = state.notifications[phone] || [];
    if (!current.length) return false;
    const otherOwnerId = `user-${otherPhone}`;
    const otherConversationId = conversationIdFor(otherPhone);
    const otherCommentIds = new Set(ensureSocialComments().filter((comment) => comment.phone === otherPhone).map((comment) => comment.id));
    const next = current.filter((item) => {
      const id = String(item.id || '');
      if (item.ownerId === otherOwnerId) return false;
      if (item.conversationId === otherConversationId) return false;
      if (id.startsWith('n-pet-circle-like-') && id.endsWith(`-${otherPhone}`)) return false;
      if (id.startsWith('n-pet-circle-comment-')) {
        const commentId = String(item.commentId || id.slice('n-pet-circle-comment-'.length));
        if (otherCommentIds.has(commentId)) return false;
      }
      return true;
    });
    if (next.length === current.length) return false;
    state.notifications[phone] = next;
    return true;
  };
  const removedA = removeFor(phoneA, phoneB);
  const removedB = removeFor(phoneB, phoneA);
  return removedA || removedB;
}

function markNotificationsRead(phone, ids) {
  const idSet = Array.isArray(ids) && ids.length ? new Set(ids.map(String)) : null;
  normalizeNotificationsFor(phone);
  state.notifications[phone] = (state.notifications[phone] || []).map((item) => (idSet && !idSet.has(item.id) ? item : { ...item, read: true }));
  return state.notifications[phone];
}

function resolveOwnerId(ownerId) {
  if (ownerId.startsWith('user-')) return ownerId.slice('user-'.length);
  return '';
}

function resolveVisibleSocialTarget(viewer, ownerId) {
  const targetPhone = resolveOwnerId(String(ownerId || ''));
  if (!targetPhone || targetPhone === viewer.phone) return null;
  const targetUser = state.users[targetPhone];
  if (!targetUser) return null;
  if (!activePetFor(viewer) || !activePetFor(targetUser)) return null;
  if (socialBlockBetween(viewer.phone, targetPhone)) return null;
  targetUser.settings = normalizeUserSettings(targetUser.settings);
  if (targetUser.settings.nearbyVisible === false) return null;
  if (!canViewNearbyUser(viewer, targetUser, nearbyRadiusKmFor(viewer))) return null;
  return { targetPhone, targetUser };
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, true);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const body = req.method === 'GET' ? {} : await parseBody(req);

  if (req.method === 'GET' && pathname === '/health') {
    ok(res, { now: Date.now(), users: Object.keys(state.users).length });
    return;
  }

  if (req.method === 'GET' && pathname === '/pet-taxonomy') {
    ok(res, petTaxonomy);
    return;
  }

  if (req.method === 'GET' && pathname === '/legal/terms') {
    ok(res, legalDocuments.terms);
    return;
  }

  if (req.method === 'GET' && pathname === '/legal/privacy') {
    ok(res, legalDocuments.privacy);
    return;
  }

  if (req.method === 'POST' && pathname === '/auth/sms/send') {
    const phone = normalizePhone(body.phone);
    const deviceId = normalizeSmsDeviceId(body.deviceId || req.headers['x-lumii-device-id']);
    const clientIp = clientIpFromRequest(req);
    if (!phone) {
      fail(res, 400, '请输入正确的中国大陆手机号', false);
      return;
    }
    const now = Date.now();
    const previous = state.sms[phone];
    if (previous && now < previous.availableAt) {
      fail(res, 200, '操作太频繁，请稍后再试', true, previous);
      return;
    }
    if (!canSendSms(phone)) {
      const usage = smsDailyUsageFor(phone);
      fail(res, 429, `今天验证码发送次数已达上限（${SMS_DAILY_LIMIT} 次），请明天再试`, true, {
        availableAt: previous?.availableAt || now + SMS_COOLDOWN_MS,
        day: usage.day,
        phone,
      });
      return;
    }
    if (!canSendSmsFromDevice(deviceId)) {
      const usage = smsDeviceDailyUsageFor(deviceId);
      fail(res, 429, `当前设备今天获取验证码次数已达上限（${SMS_DEVICE_DAILY_LIMIT} 次），请明天再试`, true, {
        day: usage.day,
        deviceId,
        phone,
      });
      return;
    }
    if (!canSendSmsFromIp(clientIp)) {
      const usage = smsIpDailyUsageFor(clientIp);
      fail(res, 429, `当前网络今天获取验证码次数已达上限（${SMS_IP_DAILY_LIMIT} 次），请明天再试`, true, {
        day: usage.day,
        phone,
      });
      return;
    }
    const ticket = {
      attempts: 0,
      availableAt: now + SMS_COOLDOWN_MS,
      code: TEST_CODE,
      expiresAt: now + SMS_TTL_MS,
      phone,
    };
    state.sms[phone] = ticket;
    consumeSmsQuota(phone);
    consumeSmsDeviceQuota(deviceId);
    consumeSmsIpQuota(clientIp);
    ensureUser(phone);
    saveState();
    ok(res, ticket);
    return;
  }

  if (req.method === 'POST' && pathname === '/auth/sms/verify') {
    const phone = normalizePhone(body.phone);
    const code = String(body.code || '');
    if (!phone) {
      fail(res, 400, '请输入正确的中国大陆手机号', false);
      return;
    }
    const ticket = state.sms[phone];
    const now = Date.now();
    if (ticket?.lockedAt) {
      fail(
        res,
        400,
        '验证码错误次数过多，请重新获取',
        true,
        { attempts: Number(ticket.attempts || SMS_VERIFY_MAX_ATTEMPTS), attemptsRemaining: 0, phone },
        'SMS_CODE_ATTEMPT_LIMITED',
      );
      return;
    }
    if (ticket?.consumedAt && code !== TEST_CODE) {
      fail(res, 400, '验证码已使用，请重新获取', true);
      return;
    }
    if (ticket && !ticket.consumedAt && now > ticket.expiresAt) {
      fail(res, 400, '验证码已过期，请重新获取', true, undefined, 'SMS_CODE_EXPIRED');
      return;
    }
    if (ticket && !ticket.consumedAt && code !== TEST_CODE && ticket.code !== code) {
      const attempts = Number(ticket.attempts || 0) + 1;
      const attemptsRemaining = Math.max(0, SMS_VERIFY_MAX_ATTEMPTS - attempts);
      const nextTicket = { ...ticket, attempts };
      if (attemptsRemaining <= 0) {
        state.sms[phone] = {
          ...nextTicket,
          code: '',
          consumedAt: now,
          expiresAt: now,
          lockedAt: now,
        };
        saveState();
        fail(
          res,
          400,
          '验证码错误次数过多，请重新获取',
          true,
          { attempts, attemptsRemaining, phone },
          'SMS_CODE_ATTEMPT_LIMITED',
        );
        return;
      }
      state.sms[phone] = nextTicket;
      saveState();
      fail(res, 400, '验证码错误，请检查后重试', true, { attempts, attemptsRemaining, phone }, 'SMS_CODE_INVALID');
      return;
    }
    if (code !== TEST_CODE && ticket?.code !== code) {
      fail(res, 400, '验证码错误，请检查后重试', true);
      return;
    }
    const user = ensureUser(phone);
    user.lastSeenAt = Date.now();
    if (ticket && !ticket.consumedAt) {
      state.sms[phone] = {
        ...ticket,
        code: '',
        consumedAt: Date.now(),
        expiresAt: Date.now(),
      };
    }
    saveState();
    ok(res, { account: buildAccountSnapshot(user), phone, token: createAuthToken(phone) });
    return;
  }

  if (req.method === 'POST' && pathname === '/auth/logout') {
    const revoked = revokeSignedAuthToken(bearerTokenFromRequest(req));
    if (revoked) saveState();
    ok(res, true);
    return;
  }

  const mediaFileMatch = pathname.match(/^\/media\/uploads\/([^/]+)\/file$/);
  if (req.method === 'GET' && mediaFileMatch) {
    const mediaId = decodeURIComponent(mediaFileMatch[1]);
    const media = state.mediaUploads?.[mediaId];
    if (media?.objectKey && cosEnabled()) {
      try {
        const result = await cosRequest('GET', media.objectKey, { timeoutMs: 20000 });
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': `private, max-age=${COS_PROXY_CACHE_SECONDS}`,
          'Content-Length': result.body.length,
          'Content-Type': media.mimeType || result.headers['content-type'] || 'application/octet-stream',
        });
        res.end(result.body);
        return;
      } catch {
        // Fall back to the legacy in-state data URL below when available.
      }
    }
    if (!media?.dataUrl) {
      fail(res, 404, 'Media file not found', false);
      return;
    }
    const match = String(media.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      fail(res, 404, 'Media file is unavailable', false);
      return;
    }
    const buffer = Buffer.from(match[2], 'base64');
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': buffer.length,
      'Content-Type': normalizeImageMimeType(match[1]),
    });
    res.end(buffer);
    return;
  }

  const storageObjectMatch = pathname.match(/^\/storage\/objects\/(.+)$/);
  if (req.method === 'GET' && storageObjectMatch) {
    const objectKey = decodeURIComponent(storageObjectMatch[1]);
    if (!objectKey || objectKey.includes('..') || objectKey.startsWith('/')) {
      fail(res, 400, 'Storage object is invalid', false);
      return;
    }
    try {
      const result = await cosRequest('GET', objectKey, { timeoutMs: 20000 });
      const prepared = objectKey.startsWith('pet-avatar/')
        ? cleanPetAvatarImage({ buffer: result.body, mimeType: result.headers['content-type'] }, 'pet-avatar')
        : { buffer: result.body, mimeType: result.headers['content-type'] || 'application/octet-stream' };
      if (prepared.cleanedCheckerboard) {
        console.log('[avatar:image] cleaned storage response checkerboard', {
          objectKey,
          removedPixels: prepared.removedPixels,
        });
      }
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `private, max-age=${COS_PROXY_CACHE_SECONDS}`,
        'Content-Length': prepared.buffer.length,
        'Content-Type': prepared.mimeType || result.headers['content-type'] || 'application/octet-stream',
      });
      res.end(prepared.buffer);
    } catch {
      fail(res, 404, 'Storage object not found', false);
    }
    return;
  }

  const user = requireUser(req, res);
  if (!user) return;

  if (req.method === 'POST' && pathname === '/auth/token/refresh') {
    ok(res, { account: buildAccountSnapshot(user), phone: user.phone, token: createAuthToken(user.phone) });
    return;
  }

  if (req.method === 'GET' && pathname === '/me') {
    ok(res, buildUserProfile(user));
    return;
  }

  if (req.method === 'PATCH' && pathname === '/me') {
    const ownerName = String(body.ownerName || '').trim();
    const ownerBio = String(body.ownerBio || '').trim();
    let ownerAvatarUrl = String(body.ownerAvatarUrl || '').trim();
    if (!ownerName) {
      fail(res, 400, '请输入昵称', false);
      return;
    }
    if (ownerName.length > 14) {
      fail(res, 400, '昵称最多 14 个字', false);
      return;
    }
    if (ownerBio.length > 60) {
      fail(res, 400, '简介最多 60 个字', false);
      return;
    }
    if (ownerAvatarUrl.length > 2000) {
      fail(res, 400, '头像地址过长，请重新选择', false);
      return;
    }
    if (isLocalImagePlaceholderUrl(ownerAvatarUrl) && !body.ownerAvatarBase64) {
      fail(res, 400, '头像还没有上传完成，请重新选择头像', false, undefined, 'OWNER_AVATAR_UPLOAD_REQUIRED');
      return;
    }
    if (body.ownerAvatarBase64) {
      const stored = await storeBase64ImageToCos(req, user, body, {
        base64Key: 'ownerAvatarBase64',
        fileNamePrefix: 'owner-avatar',
        mimeTypeKey: 'ownerAvatarMimeType',
        scope: 'owner-avatar',
      });
      if (stored.error) {
        fail(res, 400, stored.error, true);
        return;
      }
      if (stored.url) ownerAvatarUrl = stored.url;
      else if (isLocalImagePlaceholderUrl(ownerAvatarUrl)) {
        fail(res, 503, '头像上传服务暂不可用，请稍后重试', true, undefined, 'OWNER_AVATAR_STORAGE_UNAVAILABLE');
        return;
      }
    } else if (/^https?:\/\//i.test(ownerAvatarUrl) && !ownerAvatarUrl.includes('/storage/objects/')) {
      try {
        ownerAvatarUrl = await storeAvatarUrlToCos(req, user, ownerAvatarUrl, { scope: 'owner-avatar' });
      } catch {
        // Keep the original URL if the mirror step is temporarily unavailable.
      }
    }
    user.ownerName = ownerName;
    user.ownerBio = ownerBio;
    user.ownerAvatarUrl = ownerAvatarUrl;
    saveState();
    ok(res, buildUserProfile(user));
    return;
  }

  if (req.method === 'GET' && pathname === '/permissions') {
    ok(res, user.permissions);
    return;
  }

  if (req.method === 'PATCH' && pathname === '/permissions') {
    const permissionPatch = parsePermissionPatch(body);
    if (permissionPatch.error) {
      fail(res, 400, permissionPatch.error, false, undefined, 'PERMISSIONS_PATCH_INVALID');
      return;
    }
    user.permissions = normalizePermissionState({ ...user.permissions, ...(permissionPatch.permissions || {}) });
    user.permissionsOnboardingCompleted = Boolean(permissionPatch.completed || user.permissionsOnboardingCompleted || allPermissionsGranted(user.permissions));
    saveState();
    ok(res, user.permissions);
    return;
  }

  if (req.method === 'GET' && pathname === '/settings') {
    user.settings = normalizeUserSettings(user.settings);
    saveState();
    ok(res, user.settings);
    return;
  }

  if (req.method === 'PATCH' && pathname === '/settings') {
    const settingsPatch = parseUserSettingsPatch(body);
    if (settingsPatch.error) {
      fail(res, 400, settingsPatch.error, false, undefined, 'SETTINGS_PATCH_INVALID');
      return;
    }
    user.settings = normalizeUserSettings({ ...user.settings, ...(settingsPatch.patch || {}) });
    if (user.settings.nearbyVisible === false) {
      user.location = null;
      user.lastSeenAt = 0;
    } else if (user.settings.fuzzyLocation !== false && user.location) {
      user.location = fuzzyLocationForPersistence(user.location);
    }
    saveState();
    ok(res, user.settings);
    return;
  }

  if (req.method === 'POST' && pathname === '/feedback') {
    const result = createFeedbackSubmission(user, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false);
      return;
    }
    saveState();
    ok(res, result.feedback);
    return;
  }

  if (req.method === 'POST' && pathname === '/devices/push-token') {
    const pushDeviceInput = parsePushDevicePayload(body);
    if (pushDeviceInput.error) {
      fail(res, 400, pushDeviceInput.error, false, undefined, 'PUSH_DEVICE_INVALID');
      return;
    }
    const { device } = pushDeviceInput;
    state.pushDevices = state.pushDevices || {};
    const devices = Array.isArray(state.pushDevices[user.phone]) ? state.pushDevices[user.phone] : [];
    state.pushDevices[user.phone] = [
      device,
      ...devices.filter((item) => (device.deviceId ? item.deviceId !== device.deviceId : item.token !== device.token)),
    ];
    saveState();
    ok(res, device);
    return;
  }

  if (req.method === 'GET' && pathname === '/pets') {
    ok(res, user.pets);
    return;
  }

  if (req.method === 'POST' && pathname === '/pets') {
    const petInput = parsePetProfilePayload(body);
    if (petInput.error) {
      fail(res, 400, petInput.error, false, undefined, 'PET_PROFILE_INVALID');
      return;
    }
    const pet = {
      ...petInput.patch,
      createdAt: new Date().toISOString(),
      healthScore: 96,
      id: `pet-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      personality: ['亲人', '爱互动', '想交朋友'],
    };
    if (body.avatarBase64) {
      const stored = await storeBase64ImageToCos(req, user, body, {
        base64Key: 'avatarBase64',
        fileNamePrefix: 'pet-profile-avatar',
        mimeTypeKey: 'avatarMimeType',
        petId: pet.id,
        scope: 'pet-profile-avatar',
      });
      if (stored.error) {
        fail(res, 400, stored.error, true);
        return;
      }
      if (stored.url) pet.avatarUrl = stored.url;
      else if (isLocalImagePlaceholderUrl(pet.avatarUrl)) {
        fail(res, 503, '宠物头像上传服务暂不可用，请稍后重试', true, undefined, 'PET_AVATAR_STORAGE_UNAVAILABLE');
        return;
      }
    }
    user.pets.unshift(pet);
    user.activePetId = pet.id;
    saveState();
    ok(res, pet);
    return;
  }

  const petPatchMatch = pathname.match(/^\/pets\/([^/]+)$/);
  if (req.method === 'GET' && petPatchMatch) {
    const petId = decodeURIComponent(petPatchMatch[1]);
    const pet = user.pets.find((item) => item.id === petId);
    if (!pet) {
      fail(res, 404, '宠物档案不存在', false);
      return;
    }
    ok(res, pet);
    return;
  }

  if (req.method === 'PATCH' && petPatchMatch) {
    const petId = decodeURIComponent(petPatchMatch[1]);
    const pet = user.pets.find((item) => item.id === petId);
    if (!pet) {
      fail(res, 404, '宠物档案不存在', false);
      return;
    }
    const petPatch = parsePetProfilePayload(body, { partial: true });
    if (petPatch.error) {
      fail(res, 400, petPatch.error, false, undefined, 'PET_PROFILE_INVALID');
      return;
    }
    if (body.avatarBase64) {
      const stored = await storeBase64ImageToCos(req, user, body, {
        base64Key: 'avatarBase64',
        fileNamePrefix: 'pet-profile-avatar',
        mimeTypeKey: 'avatarMimeType',
        petId: pet.id,
        scope: 'pet-profile-avatar',
      });
      if (stored.error) {
        fail(res, 400, stored.error, true);
        return;
      }
      if (stored.url) petPatch.patch.avatarUrl = stored.url;
      else if (isLocalImagePlaceholderUrl(petPatch.patch?.avatarUrl)) {
        fail(res, 503, '宠物头像上传服务暂不可用，请稍后重试', true, undefined, 'PET_AVATAR_STORAGE_UNAVAILABLE');
        return;
      }
    } else if (petPatch.patch?.avatarUrl && /^https?:\/\//i.test(petPatch.patch.avatarUrl) && !petPatch.patch.avatarUrl.includes('/storage/objects/')) {
      try {
        petPatch.patch.avatarUrl = await storeAvatarUrlToCos(req, user, petPatch.patch.avatarUrl, { petId: pet.id, scope: 'pet-profile-avatar' });
      } catch {
        // Keep the original URL if mirroring fails.
      }
    }
    for (const key of petPatch.unset || []) delete pet[key];
    Object.assign(pet, petPatch.patch || {});
    saveState();
    ok(res, pet);
    return;
  }

  if (req.method === 'DELETE' && petPatchMatch) {
    const petId = decodeURIComponent(petPatchMatch[1]);
    const petExists = user.pets.some((item) => item.id === petId);
    if (!petExists) {
      fail(res, 404, '宠物档案不存在', false);
      return;
    }
    user.pets = user.pets.filter((item) => item.id !== petId);
    if (user.activePetId === petId) user.activePetId = user.pets[0]?.id || '';
    saveState();
    ok(res, user.pets);
    return;
  }

  const setDefaultMatch = pathname.match(/^\/pets\/([^/]+)\/set-default$/);
  if (req.method === 'POST' && setDefaultMatch) {
    const petId = decodeURIComponent(setDefaultMatch[1]);
    const pet = user.pets.find((item) => item.id === petId);
    if (!pet) {
      fail(res, 404, '宠物档案不存在', false);
      return;
    }
    user.activePetId = pet.id;
    saveState();
    ok(res, pet);
    return;
  }

  const saveAvatarMatch = pathname.match(/^\/pets\/([^/]+)\/avatar$/);
  if (req.method === 'POST' && saveAvatarMatch) {
    const petId = decodeURIComponent(saveAvatarMatch[1]);
    const pet = user.pets.find((item) => item.id === petId);
    if (!pet) {
      fail(res, 404, '宠物档案不存在', false);
      return;
    }
    const incomingAvatarUrl = String(body.avatarUrl || generatedAvatarUrl);
    try {
      pet.avatarUrl = await storeAvatarUrlToCos(req, user, incomingAvatarUrl, { petId: pet.id, scope: 'pet-avatar' });
    } catch {
      pet.avatarUrl = incomingAvatarUrl;
    }
    saveState();
    ok(res, pet);
    return;
  }

  if (req.method === 'POST' && pathname === '/media/uploads') {
    const mediaId = `media-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const parsedUpload = parseBase64Upload(body.base64, body.mimeType);
    const dataUrl = parsedUpload.dataUrl;
    const analysis = analyzeUploadedPetMedia(body, dataUrl, parsedUpload.issue, parsedUpload.bytes);
    const activePet = selectedPetFor(user);
    const fileParts = base64UploadBuffer(parsedUpload);
    let cosStored = null;
    if (fileParts?.buffer?.length) {
      const extension = mimeExtension(fileParts.mimeType);
      try {
        cosStored = await uploadBufferToCos(req, user, {
          buffer: fileParts.buffer,
          fileName: `${mediaId}.${extension}`,
          mimeType: fileParts.mimeType,
          petId: activePet?.id || '',
          scope: 'pet-source',
        });
      } catch (error) {
        if (!dataUrl) {
          fail(res, 502, '宠物照片上传到云存储失败，请稍后重试', true);
          return;
        }
      }
    }
    state.mediaUploads = state.mediaUploads || {};
    state.mediaUploads[mediaId] = {
      analysis,
      createdAt: Date.now(),
      dataUrl,
      ...(cosStored
        ? {
            objectKey: cosStored.objectKey,
            objectUrl: cosStored.url,
            storageProvider: cosStored.provider,
          }
        : {}),
      fileName: String(body.fileName || ''),
      mediaId,
      mimeType: parsedUpload.mimeType || normalizeImageMimeType(body.mimeType) || 'application/octet-stream',
      ownerPhone: user.phone,
      previewUrl: body.previewUrl || samplePhotoUrl,
      source: body.source || 'mvp_sample',
    };
    saveState();
    ok(res, publicUploadedMedia(state.mediaUploads[mediaId], req));
    return;
  }

  const mediaDetailMatch = pathname.match(/^\/media\/([^/]+)$/);
  if (req.method === 'GET' && mediaDetailMatch) {
    const mediaId = decodeURIComponent(mediaDetailMatch[1]);
    const media = state.mediaUploads?.[mediaId];
    if (!media || media.ownerPhone !== user.phone) {
      fail(res, 404, '上传照片已失效，请重新上传', true);
      return;
    }
    ok(res, publicUploadedMedia(media, req));
    return;
  }

  if (req.method === 'POST' && pathname === '/ai/pet-avatar/jobs') {
    const result = await createAvatarGenerationJob(req, user, body.mediaId);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, Boolean(result.retryable), result.data);
      return;
    }
    saveState();
    ok(res, result.job);
    return;
  }

  if (req.method === 'GET' && pathname === '/ai/pet-avatar/jobs/latest') {
    const job = latestAvatarJobForUser(user, url.searchParams.get('petId'));
    if (!job) {
      ok(res, null);
      return;
    }
    ok(res, job);
    return;
  }

  const avatarJobMatch = pathname.match(/^\/ai\/pet-avatar\/jobs\/([^/]+)$/);
  if (req.method === 'GET' && avatarJobMatch) {
    const id = decodeURIComponent(avatarJobMatch[1]);
    const job = avatarJobForUser(user, id);
    if (!job) {
      fail(res, 404, '生成任务不存在', true);
      return;
    }
    if (job.provider === 'gpt-image-2' && job.status === 'processing') {
      try {
        await refreshGptImage2AvatarJob(req, user, job);
      } catch (error) {
        markAvatarRefreshFailure(job, error);
      }
    } else if (job.provider === 'ttapi-flux-edits' && job.status === 'processing') {
      try {
        await refreshTtapiFluxAvatarJob(job);
      } catch (error) {
        markAvatarRefreshFailure(job, error);
      }
    } else if (job.provider === 'ttapi-midjourney' && job.status === 'processing') {
      try {
        await refreshTtapiAvatarJob(job);
      } catch (error) {
        markAvatarRefreshFailure(job, error);
      }
    } else if (job.status === 'processing') {
      job.progress = Math.min(100, Number(job.progress || 24) + 38);
      if (job.progress >= 100) {
        job.status = 'ready';
        job.resultUrl = generatedAvatarUrl;
      }
      touchAvatarJob(job);
    }
    saveState();
    ok(res, job);
    return;
  }

  const avatarJobActionMatch = pathname.match(/^\/ai\/pet-avatar\/jobs\/([^/]+)\/(accept|feedback|retry)$/);
  if (req.method === 'POST' && avatarJobActionMatch) {
    const id = decodeURIComponent(avatarJobActionMatch[1]);
    const action = avatarJobActionMatch[2];
    const job = avatarJobForUser(user, id);
    if (!job) {
      fail(res, 404, '生成任务不存在', true);
      return;
    }

    if (action === 'retry') {
      if (!job.mediaId) {
        fail(res, 404, '原始照片已失效，请重新上传', true);
        return;
      }
      const result = await createAvatarGenerationJob(req, user, job.mediaId, job.id);
      if (result.error) {
        fail(res, result.statusCode || 400, result.error, Boolean(result.retryable), result.data);
        return;
      }
      saveState();
      ok(res, result.job);
      return;
    }

    if (action === 'accept') {
      if (job.status !== 'ready' || !job.resultUrl) {
        fail(res, 400, '形象还没生成完成，请稍后再试', true);
        return;
      }
      const pet = selectedPetFor(user);
      if (!pet) {
        fail(res, 400, '请先添加宠物档案', false);
        return;
      }
      try {
        pet.avatarUrl = await storeAvatarUrlToCos(req, user, job.resultUrl, { petId: pet.id, scope: 'pet-avatar' });
      } catch {
        pet.avatarUrl = job.resultUrl;
      }
      job.acceptedAt = new Date().toISOString();
      job.acceptedPetId = pet.id;
      touchAvatarJob(job);
      user.activePetId = pet.id;
      saveState();
      ok(res, pet);
      return;
    }

    const reasonInput = String(body.reason || 'other');
    const reason = avatarFeedbackReasons.has(reasonInput) ? reasonInput : 'other';
    const content = String(body.content || '').trim();
    if (content.length > 500) {
      fail(res, 400, '反馈内容最多 500 个字', false);
      return;
    }
    job.feedback = {
      ...(content ? { content } : {}),
      createdAt: new Date().toISOString(),
      reason,
      status: 'received',
    };
    touchAvatarJob(job);
    saveState();
    ok(res, job);
    return;
  }

  if (req.method === 'GET' && pathname === '/health/summary') {
    ok(res, buildHealthSummary(user));
    return;
  }

  if (req.method === 'GET' && pathname === '/health/calendar') {
    ok(res, buildHealthCalendarEvents(user));
    return;
  }

  if (req.method === 'GET' && pathname === '/health/weights') {
    ok(res, healthList('weights', user, defaultWeightRecordsFor));
    return;
  }

  if (req.method === 'GET' && pathname === '/health/weights/trend') {
    ok(res, buildWeightTrend(healthList('weights', user, defaultWeightRecordsFor)));
    return;
  }

  if (req.method === 'POST' && pathname === '/health/weights') {
    const weightInput = parseWeightRecordPayload(body);
    if (weightInput.error) {
      fail(res, 400, weightInput.error, false, undefined, 'HEALTH_WEIGHT_INVALID');
      return;
    }
    const records = healthList('weights', user, defaultWeightRecordsFor);
    const record = {
      id: `w-${Date.now()}`,
      ...weightInput.record,
    };
    records.unshift(record);
    syncPetWeightFromRecords(user, records);
    saveState();
    ok(res, record);
    return;
  }

  const weightMatch = pathname.match(/^\/health\/weights\/([^/]+)$/);
  if (req.method === 'PATCH' && weightMatch) {
    const id = decodeURIComponent(weightMatch[1]);
    const records = healthList('weights', user, defaultWeightRecordsFor);
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) {
      fail(res, 404, '体重记录不存在', false);
      return;
    }
    const current = records[index];
    const weightInput = parseWeightRecordPayload(body, { current, partial: true });
    if (weightInput.error) {
      fail(res, 400, weightInput.error, false, undefined, 'HEALTH_WEIGHT_INVALID');
      return;
    }
    records[index] = {
      ...current,
      ...weightInput.record,
    };
    syncPetWeightFromRecords(user, records);
    saveState();
    ok(res, records[index]);
    return;
  }

  if (req.method === 'DELETE' && weightMatch) {
    const id = decodeURIComponent(weightMatch[1]);
    const records = healthList('weights', user, defaultWeightRecordsFor);
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) {
      fail(res, 404, '体重记录不存在', false);
      return;
    }
    records.splice(index, 1);
    syncPetWeightFromRecords(user, records);
    saveState();
    ok(res, records);
    return;
  }

  if (req.method === 'GET' && pathname === '/health/vaccines') {
    ok(res, vaccineListFor(user));
    return;
  }

  if (req.method === 'POST' && pathname === '/health/vaccines') {
    const vaccineInput = parseVaccineCreatePayload(body);
    if (vaccineInput.error) {
      fail(res, 400, vaccineInput.error, false, undefined, 'HEALTH_VACCINE_INVALID');
      return;
    }
    const vaccines = vaccineListFor(user);
    const days = daysUntilDate(vaccineInput.input.dueAt);
    const vaccine = {
      dueAt: vaccineInput.input.dueAt,
      id: `v-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      name: vaccineInput.input.name,
      status: days !== null && days < 0 ? 'overdue' : 'due',
    };
    vaccines.unshift(vaccine);
    vaccines.sort((left, right) => String(left.dueAt).localeCompare(String(right.dueAt)));
    ensureHealthReminderNotifications(user);
    saveState();
    ok(res, vaccine);
    return;
  }

  const vaccineMatch = pathname.match(/^\/health\/vaccines\/([^/]+)$/);
  if (req.method === 'PATCH' && vaccineMatch) {
    const id = decodeURIComponent(vaccineMatch[1]);
    const vaccinePatch = parseVaccineStatusPatch(body);
    if (vaccinePatch.error) {
      fail(res, 400, vaccinePatch.error, false, undefined, 'HEALTH_VACCINE_INVALID');
      return;
    }
    const { status } = vaccinePatch;
    const vaccines = vaccineListFor(user);
    const index = vaccines.findIndex((item) => item.id === id);
    if (index < 0) {
      fail(res, 404, '疫苗计划不存在', true);
      return;
    }
    vaccines[index] = { ...vaccines[index], status };
    if (status === 'done') {
      setVaccineReminderFor(user, id, false);
      pruneHealthReminderNotifications(user);
      addNotification(user.phone, {
        id: `n-vaccine-done-${healthKeyFor(user)}-${id}`,
        kind: 'vaccine_done',
        read: false,
        text: `${vaccines[index].name}已标记完成，健康时间线已更新。`,
        title: '疫苗计划已完成',
        vaccineId: id,
      });
    } else {
      ensureHealthReminderNotifications(user);
    }
    saveState();
    ok(res, vaccines[index]);
    return;
  }

  if (req.method === 'GET' && pathname === '/health/vaccine-reminders') {
    ok(res, vaccineReminderIdsFor(user));
    return;
  }

  const vaccineReminderMatch = pathname.match(/^\/health\/vaccine-reminders\/([^/]+)$/);
  if (req.method === 'PATCH' && vaccineReminderMatch) {
    const vaccineId = decodeURIComponent(vaccineReminderMatch[1]);
    const reminderPatch = parseVaccineReminderPatch(body);
    if (reminderPatch.error) {
      fail(res, 400, reminderPatch.error, false, undefined, 'HEALTH_REMINDER_INVALID');
      return;
    }
    const vaccines = vaccineListFor(user);
    const vaccine = vaccines.find((item) => item.id === vaccineId);
    if (!vaccine) {
      fail(res, 404, '疫苗计划不存在', false);
      return;
    }
    const { enabled } = reminderPatch;
    if (vaccine.status === 'done' && enabled) {
      fail(res, 400, '已完成的疫苗计划无需开启提醒', false, undefined, 'HEALTH_REMINDER_INVALID');
      return;
    }
    const reminderIds = setVaccineReminderFor(user, vaccineId, enabled);
    if (enabled) {
      ensureHealthReminderNotifications(user);
    } else {
      pruneHealthReminderNotifications(user);
    }
    saveState();
    ok(res, reminderIds);
    return;
  }

  if (req.method === 'GET' && pathname === '/health/memos') {
    ok(res, healthList('memos', user, defaultMemosFor));
    return;
  }

  if (req.method === 'POST' && pathname === '/health/memos') {
    const memoInput = parseHealthMemoPayload(body);
    if (memoInput.error) {
      fail(res, 400, memoInput.error, false, undefined, 'HEALTH_MEMO_INVALID');
      return;
    }
    const memos = healthList('memos', user, defaultMemosFor);
    const memo = {
      id: `m-${Date.now()}`,
      ...memoInput.memo,
      createdAt: todayIsoDate(),
      updatedAt: todayIsoDate(),
    };
    memos.unshift(memo);
    saveState();
    ok(res, memo);
    return;
  }

  const healthMemoMatch = pathname.match(/^\/health\/memos\/([^/]+)$/);
  if (req.method === 'PATCH' && healthMemoMatch) {
    const memoId = decodeURIComponent(healthMemoMatch[1]);
    const memos = healthList('memos', user, defaultMemosFor);
    const index = memos.findIndex((item) => item.id === memoId);
    if (index < 0) {
      fail(res, 404, '备忘不存在', false);
      return;
    }
    const memoInput = parseHealthMemoPayload(body, memos[index]);
    if (memoInput.error) {
      fail(res, 400, memoInput.error, false, undefined, 'HEALTH_MEMO_INVALID');
      return;
    }
    memos[index] = { ...memos[index], ...memoInput.memo, updatedAt: todayIsoDate() };
    saveState();
    ok(res, memos[index]);
    return;
  }

  if (req.method === 'DELETE' && healthMemoMatch) {
    const memoId = decodeURIComponent(healthMemoMatch[1]);
    const memos = healthList('memos', user, defaultMemosFor);
    const index = memos.findIndex((item) => item.id === memoId);
    if (index < 0) {
      fail(res, 404, '备忘不存在', false);
      return;
    }
    memos.splice(index, 1);
    saveState();
    ok(res, memos);
    return;
  }

  if (req.method === 'GET' && pathname === '/social/discover') {
    const location = locationFromQuery(url);
    const publishNearbyPresence = user.settings?.nearbyVisible !== false;
    if (publishNearbyPresence) {
      user.lastSeenAt = Date.now();
      if (location) user.location = locationForPersistence(user, location);
      saveState();
    }
    const viewerForDiscovery = location ? { ...user, location } : user;
    ok(res, listOnlineOwners(viewerForDiscovery, location?.radiusKm || user.location?.radiusKm || DEFAULT_DISCOVER_RADIUS_KM));
    return;
  }

  if (req.method === 'GET' && pathname === '/social/nearby-moments') {
    const location = locationFromQuery(url);
    const publishNearbyPresence = user.settings?.nearbyVisible !== false;
    if (publishNearbyPresence) {
      user.lastSeenAt = Date.now();
      if (location) user.location = locationForPersistence(user, location);
      saveState();
    }
    const viewerForMoments = location ? { ...user, location } : user;
    ok(res, listNearbyMoments(viewerForMoments, location?.radiusKm || user.location?.radiusKm || DEFAULT_DISCOVER_RADIUS_KM, { includeOwn: false }));
    return;
  }

  if (req.method === 'GET' && pathname === '/social/pet-circle/posts') {
    const location = locationFromQuery(url);
    const cursor = url.searchParams.get('cursor') || '';
    const limit = url.searchParams.get('limit') || 30;
    const publishNearbyPresence = user.settings?.nearbyVisible !== false;
    if (publishNearbyPresence) {
      user.lastSeenAt = Date.now();
      if (location) user.location = locationForPersistence(user, location);
      saveState();
    }
    const viewerForMoments = location ? { ...user, location } : user;
    ok(res, listNearbyMomentsPage(viewerForMoments, location?.radiusKm || user.location?.radiusKm || DEFAULT_DISCOVER_RADIUS_KM, { cursor, limit }));
    return;
  }

  const petCircleProfilePostsMatch = pathname.match(/^\/social\/pet-circle\/profiles\/([^/]+)\/posts$/);
  if (req.method === 'GET' && petCircleProfilePostsMatch) {
    const ownerId = decodeURIComponent(petCircleProfilePostsMatch[1]);
    const cursor = url.searchParams.get('cursor') || '';
    const limit = url.searchParams.get('limit') || 30;
    const result = listPetCircleProfilePosts(user, ownerId, { cursor, limit });
    if (result.error) {
      fail(res, result.statusCode || 404, result.error, false, undefined, 'PET_CIRCLE_PROFILE_FORBIDDEN');
      return;
    }
    ok(res, result.page);
    return;
  }

  if (req.method === 'PATCH' && pathname === '/social/pet-circle/profile/cover') {
    const result = await updatePetCircleCover(req, user, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'PET_CIRCLE_COVER_INVALID');
      return;
    }
    saveState();
    ok(res, result.profile);
    return;
  }

  if (req.method === 'POST' && (pathname === '/social/moments' || pathname === '/social/pet-circle/posts')) {
    const visibility = normalizeSocialVisibility(body.visibility);
    if (visibility === 'nearby' && user.settings?.nearbyVisible === false) {
      fail(res, 403, '请先开启附近可见后再分享小事', false, undefined, 'NEARBY_HIDDEN');
      return;
    }
    const publishLocation = locationFromPayload(body.location);
    if (publishLocation) {
      if (!isFreshNearbyLocation(publishLocation)) {
        fail(res, 400, '定位已过期，请重新定位后再发布到宠友圈', true, undefined, 'NEARBY_LOCATION_STALE');
        return;
      }
      user.lastSeenAt = Date.now();
      user.location = locationForPersistence(user, publishLocation);
    }
    if (visibility === 'nearby' && !isFreshNearbyLocation(user.location)) {
      fail(res, 400, '请先完成定位后再发布到宠友圈', true, undefined, 'NEARBY_LOCATION_REQUIRED');
      return;
    }
    const created = createSocialMoment(user, body);
    if (created.error) {
      fail(res, created.statusCode || 400, created.error, false, undefined, 'SOCIAL_MOMENT_INVALID');
      return;
    }
    const createdMemo = shouldSyncSocialMomentToHealthCalendar(body, visibility)
      ? createHealthMemoFromSocialMoment(user, created.moment)
      : null;
    saveState();
    ok(res, { ...buildNearbyMomentCard(created.moment, user, user, 0, undefined), ...(createdMemo ? { createdMemo } : {}) });
    return;
  }

  const petCirclePostMatch = pathname.match(/^\/social\/pet-circle\/posts\/([^/]+)$/);
  if (req.method === 'GET' && petCirclePostMatch) {
    const location = locationFromQuery(url);
    const viewerForMoment = location ? { ...user, location } : user;
    const result = getPetCirclePostCard(decodeURIComponent(petCirclePostMatch[1]), viewerForMoment);
    if (result.error) {
      fail(res, result.statusCode || 404, result.error, false, undefined, 'PET_CIRCLE_POST_GONE');
      return;
    }
    ok(res, result.card);
    return;
  }

  if (req.method === 'DELETE' && petCirclePostMatch) {
    const deleted = deleteSocialMoment(decodeURIComponent(petCirclePostMatch[1]), user);
    if (deleted.error) {
      fail(res, deleted.statusCode || 400, deleted.error, false, undefined, 'PET_CIRCLE_POST_INVALID');
      return;
    }
    saveState();
    ok(res, { deleted: true, id: deleted.moment.id });
    return;
  }

  const petCirclePostReportMatch = pathname.match(/^\/social\/pet-circle\/posts\/([^/]+)\/report$/);
  if (req.method === 'POST' && petCirclePostReportMatch) {
    const result = reportSocialMoment(decodeURIComponent(petCirclePostReportMatch[1]), user, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'PET_CIRCLE_REPORT_INVALID');
      return;
    }
    saveState();
    ok(res, { id: result.report.id, reported: true, targetId: result.report.targetId, targetType: result.report.targetType });
    return;
  }

  const petCircleLikeMatch = pathname.match(/^\/social\/pet-circle\/posts\/([^/]+)\/like$/);
  if ((req.method === 'POST' || req.method === 'DELETE') && petCircleLikeMatch) {
    const postId = decodeURIComponent(petCircleLikeMatch[1]);
    const result = req.method === 'POST' ? likeSocialMoment(postId, user) : unlikeSocialMoment(postId, user);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'PET_CIRCLE_LIKE_INVALID');
      return;
    }
    const owner = state.users[result.moment.phone] || user;
    saveState();
    ok(res, buildNearbyMomentCard(result.moment, owner, user, 0, undefined));
    return;
  }

  const petCircleCommentsMatch = pathname.match(/^\/social\/pet-circle\/posts\/([^/]+)\/comments$/);
  if (req.method === 'GET' && petCircleCommentsMatch) {
    const postId = decodeURIComponent(petCircleCommentsMatch[1]);
    const visible = visibleSocialMomentForViewer(postId, user);
    if (visible.error) {
      fail(res, visible.statusCode || 404, visible.error, false, undefined, 'PET_CIRCLE_POST_GONE');
      return;
    }
    ok(res, listPetCircleComments(postId, user));
    return;
  }
  if (req.method === 'POST' && petCircleCommentsMatch) {
    const postId = decodeURIComponent(petCircleCommentsMatch[1]);
    const result = createPetCircleComment(postId, user, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'PET_CIRCLE_COMMENT_INVALID');
      return;
    }
    saveState();
    ok(res, listPetCircleComments(postId, user));
    return;
  }

  const petCircleCommentMatch = pathname.match(/^\/social\/pet-circle\/comments\/([^/]+)$/);
  if (req.method === 'DELETE' && petCircleCommentMatch) {
    const result = deletePetCircleComment(decodeURIComponent(petCircleCommentMatch[1]), user);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'PET_CIRCLE_COMMENT_INVALID');
      return;
    }
    saveState();
    ok(res, { deleted: true, id: result.comment.id });
    return;
  }

  const petCircleCommentReportMatch = pathname.match(/^\/social\/pet-circle\/comments\/([^/]+)\/report$/);
  if (req.method === 'POST' && petCircleCommentReportMatch) {
    const result = reportPetCircleComment(decodeURIComponent(petCircleCommentReportMatch[1]), user, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'PET_CIRCLE_REPORT_INVALID');
      return;
    }
    saveState();
    ok(res, { id: result.report.id, reported: true, targetId: result.report.targetId, targetType: result.report.targetType });
    return;
  }

  if (req.method === 'POST' && pathname === '/social/blocks') {
    const result = createSocialBlock(user, body.ownerId);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'SOCIAL_BLOCK_INVALID');
      return;
    }
    saveState();
    ok(res, { blocked: true, id: result.block.id, ownerId: `user-${result.targetPhone}` });
    return;
  }

  if (req.method === 'GET' && pathname === '/social/blocks') {
    ok(res, listSocialBlocksFor(user));
    return;
  }

  const socialBlockMatch = pathname.match(/^\/social\/blocks\/([^/]+)$/);
  if (req.method === 'DELETE' && socialBlockMatch) {
    const result = deleteSocialBlock(user, decodeURIComponent(socialBlockMatch[1]));
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'SOCIAL_BLOCK_INVALID');
      return;
    }
    saveState();
    ok(res, { deleted: true, ownerId: result.ownerId });
    return;
  }

  if (req.method === 'GET' && pathname === '/social/greeting-requests') {
    ok(res, listGreetingRequestsFor(user));
    return;
  }

  if (req.method === 'POST' && pathname === '/social/greetings') {
    const ownerId = String(body.ownerId || '');
    const target = resolveVisibleSocialTarget(user, ownerId);
    if (!target) {
      fail(res, 404, '对方暂时不可打招呼，请刷新附近列表后再试', true);
      return;
    }
    const { targetPhone, targetUser } = target;
    const fromPet = activePetFor(user);
    const targetPet = activePetFor(targetUser);
    const source = String(body.source || '').trim();
    const rawPostId = String(body.postId || '').trim();
    const isPetCircleGreeting = source === 'pet_circle' || source === 'pet-circle' || Boolean(rawPostId);
    let sourcePostId = '';
    if (isPetCircleGreeting) {
      if (!rawPostId) {
        fail(res, 400, '这条小事已不可见，暂时不能从这里打招呼', true, undefined, 'PET_CIRCLE_POST_GONE');
        return;
      }
      const visible = visibleSocialMomentForViewer(rawPostId, user);
      if (!visible.moment || visible.moment.phone !== targetPhone) {
        fail(res, 404, '这条小事已不可见，暂时不能从这里打招呼', true, undefined, 'PET_CIRCLE_POST_GONE');
        return;
      }
      sourcePostId = visible.moment.id;
    }
    const existing = pendingGreetingFor(user.phone, targetPhone);
    if (existing) {
      existing.at = Date.now();
      if (sourcePostId) {
        existing.source = 'pet_circle';
        existing.postId = sourcePostId;
      }
    } else {
      state.greetings.push({
        at: Date.now(),
        fromPhone: user.phone,
        message: '我想认识你和你的毛孩子',
        ownerId,
        ...(sourcePostId ? { postId: sourcePostId, source: 'pet_circle' } : {}),
        status: 'pending',
        targetPhone,
      });
    }
    if (!existing || sourcePostId) {
      addNotification(targetPhone, {
        id: sourcePostId ? `n-pet-circle-greeting-${sourcePostId}-${user.phone}` : `n-greeting-${Date.now()}`,
        kind: sourcePostId ? 'pet_circle_greeting' : 'greeting_request',
        ownerId: `user-${user.phone}`,
        ...(sourcePostId ? { postId: sourcePostId } : {}),
        read: false,
        text: sourcePostId ? `${user.ownerName}和${fromPet.name}从这条小事向你和${targetPet.name}打了招呼` : `${user.ownerName}和${fromPet.name}向你和${targetPet.name}打了招呼`,
        title: sourcePostId ? `${targetPet.name}的小事有新互动` : '新的招呼',
      }, 'interaction');
    }
    saveState();
    ok(res, { ownerId, ...(sourcePostId ? { postId: sourcePostId, source: 'pet_circle' } : {}), sent: true });
    return;
  }

  const greetingActionMatch = pathname.match(/^\/social\/greeting-requests\/([^/]+)\/(accept|reject)$/);
  if (req.method === 'POST' && greetingActionMatch) {
    const ownerId = decodeURIComponent(greetingActionMatch[1]);
    const action = greetingActionMatch[2];
    const targetPhone = resolveOwnerId(ownerId);
    const fromUser = targetPhone ? state.users[targetPhone] : null;
    const greeting = targetPhone ? pendingGreetingFor(targetPhone, user.phone) : null;
    if (!fromUser || !greeting) {
      fail(res, 404, '招呼请求不存在或已处理', false);
      return;
    }

    greeting.status = action === 'accept' ? 'accepted' : 'rejected';
    greeting.respondedAt = Date.now();
    removeGreetingRequestNotificationsFor(user.phone, ownerId);

    if (action === 'reject') {
      saveState();
      ok(res, { ownerId, rejected: true });
      return;
    }

    const myPet = activePetFor(user);
    const fromPet = activePetFor(fromUser);
    if (!myPet || !fromPet) {
      fail(res, 400, '请先为宠物建档后再互动', true);
      return;
    }
    const acceptedText = '我们已经互相打招呼啦';
    const myConversation = buildConversationFor(user, fromUser, acceptedText, 0);
    const senderConversation = buildConversationFor(fromUser, user, `${myPet.name}已接受你的招呼`, 1);
    if (!myConversation || !senderConversation) {
      fail(res, 400, '请先为宠物建档后再互动', true);
      return;
    }
    upsertConversation(user.phone, myConversation);
    upsertConversation(fromUser.phone, senderConversation);
    appendConversationMessage(user.phone, myConversation.id, {
      author: 'system',
      id: messageId(),
      text: '你们已经互相打招呼，可以开始聊天。',
      time: new Date().toISOString(),
    });
    appendConversationMessage(fromUser.phone, senderConversation.id, {
      author: 'system',
      id: messageId(),
      text: `${myPet.name}已接受${fromPet.name}的招呼，可以开始聊天。`,
      time: new Date().toISOString(),
    });
    addNotification(fromUser.phone, {
      conversationId: conversationIdFor(user.phone),
      id: `n-greeting-accepted-${Date.now()}`,
      kind: 'greeting_accepted',
      ownerId: `user-${user.phone}`,
      read: false,
      text: `${user.ownerName}和${myPet.name}已接受你的招呼`,
      title: '招呼已接受',
    }, 'interaction');
    saveState();
    ok(res, { conversation: myConversation, ownerId, sent: true });
    return;
  }

  if (req.method === 'POST' && pathname === '/social/walk-invites') {
    const ownerId = String(body.ownerId || '');
    const target = resolveVisibleSocialTarget(user, ownerId);
    if (!target) {
      fail(res, 404, '对方暂时不可约遛，请刷新附近列表后再试', true);
      return;
    }
    const { targetPhone, targetUser } = target;
    const inviteId = `walk-${Date.now()}`;
    const place = String(body.place || '附近宠物友好地点');
    const placeAddress = String(body.placeAddress || '').trim().slice(0, 160);
    const placeId = String(body.placeId || '').trim().slice(0, 120);
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const time = String(body.time || '今天');
    const note = String(body.note || '');
    const inviteViolation =
      socialChatContentViolation('约遛地点', place, 80) ||
      socialChatContentViolation('约遛地址', placeAddress, 160) ||
      socialChatContentViolation('约遛时间', time, 60) ||
      socialChatContentViolation('约遛备注', note, 240);
    if (inviteViolation) {
      fail(res, 400, inviteViolation, false);
      return;
    }
    const fromPet = activePetFor(user);
    const lastMessage = `约遛邀请 · ${time} · ${place}`;
    const messageBody = [lastMessage, placeAddress ? `地址：${placeAddress}` : '', note].filter(Boolean).join('\n');
    let senderConversation = null;
    state.invites.push({
      at: Date.now(),
      fromPhone: user.phone,
      inviteId,
      ...(Number.isFinite(latitude) ? { latitude } : {}),
      ...(Number.isFinite(longitude) ? { longitude } : {}),
      ownerId,
      place,
      ...(placeAddress ? { placeAddress } : {}),
      ...(placeId ? { placeId } : {}),
      status: 'pending',
      targetPhone,
      time,
    });
    senderConversation = buildConversationFor(user, targetUser, lastMessage, 0);
    const targetConversation = buildConversationFor(targetUser, user, `${fromPet.name}发来约遛邀请`, 1);
    if (!senderConversation || !targetConversation) {
      fail(res, 400, '请先为宠物建档后再互动', true);
      return;
    }
    upsertConversation(user.phone, senderConversation);
    upsertConversation(targetPhone, targetConversation);
    appendConversationMessage(user.phone, senderConversation.id, {
      author: 'me',
      id: messageId(),
      status: 'sent',
      text: messageBody,
      time: new Date().toISOString(),
    });
    appendConversationMessage(targetPhone, targetConversation.id, {
      author: 'other',
      id: messageId(),
      status: 'sent',
      text: `${fromPet.name}邀请你：${messageBody}`,
      time: new Date().toISOString(),
    });
    addNotification(targetPhone, {
      conversationId: targetConversation.id,
      id: `n-walk-${Date.now()}`,
      kind: 'walk_invite',
      ownerId: `user-${user.phone}`,
      read: false,
      text: `${user.ownerName}和${fromPet.name}邀请你在${time}去${place}`,
      title: '新的约遛邀请',
    }, 'walk');
    saveState();
    ok(res, { conversation: senderConversation, inviteId, ownerId });
    return;
  }

  if (req.method === 'GET' && pathname === '/conversations') {
    ok(res, listConversationsFor(user));
    return;
  }

  const conversationReadMatch = pathname.match(/^\/conversations\/([^/]+)\/read$/);
  if (req.method === 'POST' && conversationReadMatch) {
    markConversationRead(user.phone, decodeURIComponent(conversationReadMatch[1]));
    saveState();
    ok(res, true);
    return;
  }

  const conversationMessagesMatch = pathname.match(/^\/conversations\/([^/]+)\/messages$/);
  if (req.method === 'GET' && conversationMessagesMatch) {
    const conversationId = decodeURIComponent(conversationMessagesMatch[1]);
    const targetPhone = conversationTargetPhone(conversationId);
    if (!targetPhone || targetPhone === user.phone || !state.users[targetPhone] || socialBlockBetween(user.phone, targetPhone)) {
      fail(res, 404, '会话不存在，请返回消息列表刷新', true);
      return;
    }
    ok(res, getConversationMessages(user.phone, conversationId));
    return;
  }

  if (req.method === 'POST' && conversationMessagesMatch) {
    const conversationId = decodeURIComponent(conversationMessagesMatch[1]);
    const text = String(body.text || '').trim();
    if (!text) {
      fail(res, 400, '请输入消息内容', false);
      return;
    }
    const messageViolation = socialChatContentViolation('聊天内容', text);
    if (messageViolation) {
      fail(res, 400, messageViolation, false);
      return;
    }
    if (text.length > SOCIAL_MESSAGE_MAX_CHARS) {
      fail(res, 400, `消息太长了，请控制在 ${SOCIAL_MESSAGE_MAX_CHARS} 字以内`, false);
      return;
    }
    const targetPhone = conversationTargetPhone(conversationId);
    if (!targetPhone || targetPhone === user.phone || !state.users[targetPhone]) {
      fail(res, 404, '会话不存在，请返回消息列表刷新', true);
      return;
    }
    if (socialBlockBetween(user.phone, targetPhone)) {
      fail(res, 404, '会话不存在，请返回消息列表刷新', true);
      return;
    }
    if (!activePetFor(user) || !activePetFor(state.users[targetPhone])) {
      fail(res, 400, '请先为宠物建档后再互动', true);
      return;
    }
    const alreadyAccepted = acceptedGreetingBetween(user.phone, targetPhone);
    if (!alreadyAccepted && !canReplyToPendingWalkInvite(user.phone, targetPhone)) {
      fail(res, 403, '对方接受招呼后才能聊天', true);
      return;
    }
    if (!alreadyAccepted) acceptPendingWalkInviteForReply(user.phone, targetPhone);
    const myMessage = {
      author: 'me',
      id: messageId(),
      status: 'sent',
      text,
      time: new Date().toISOString(),
    };
    appendConversationMessage(user.phone, conversationId, myMessage);

    const targetUser = ensureUser(targetPhone);
    const targetConversationId = conversationIdFor(user.phone);
    appendConversationMessage(targetPhone, targetConversationId, {
      author: 'other',
      id: messageId(),
      status: 'sent',
      text,
      time: new Date().toISOString(),
    });
    upsertConversation(user.phone, buildConversationFor(user, targetUser, text, 0));
    upsertConversation(targetPhone, buildConversationFor(targetUser, user, text, 1));
    addNotification(targetPhone, {
      conversationId: targetConversationId,
      id: `n-message-${myMessage.id}`,
      kind: 'conversation_message',
      ownerId: `user-${user.phone}`,
      read: true,
      text: `${user.ownerName || '附近主人'}：${text.slice(0, 48)}`,
      title: '新的消息',
    }, 'interaction');

    saveState();
    ok(res, myMessage);
    return;
  }

  if (req.method === 'GET' && pathname === '/notifications') {
    ensureHealthReminderNotifications(user);
    const notifications = normalizeNotificationsFor(user.phone);
    saveState();
    ok(res, notifications);
    return;
  }

  if (req.method === 'POST' && pathname === '/notifications/read') {
    const notifications = markNotificationsRead(user.phone, body.ids);
    saveState();
    ok(res, notifications);
    return;
  }

  if (req.method === 'GET' && pathname === '/ai/usage') {
    ok(res, buildAiUsageSummary(user));
    return;
  }

  if (req.method === 'GET' && pathname === '/ai/pet-chat/messages') {
    ok(res, petChatMessagesFor(user));
    return;
  }

  const petChatFeedbackMatch = pathname.match(/^\/ai\/pet-chat\/messages\/([^/]+)\/feedback$/);
  if (req.method === 'POST' && petChatFeedbackMatch) {
    const messageIdValue = decodeURIComponent(petChatFeedbackMatch[1]);
    const feedbackResult = setPetChatFeedback(user, messageIdValue, String(body.rating || ''));
    if (feedbackResult.error) {
      fail(res, feedbackResult.statusCode || 400, feedbackResult.error, false);
      return;
    }
    saveState();
    ok(res, feedbackResult);
    return;
  }

  if (req.method === 'POST' && pathname === '/ai/pet-chat/messages') {
    const text = String(body.text || '').trim();
    if (!text) {
      fail(res, 400, '请输入消息内容', false);
      return;
    }
    if (text.length > PET_CHAT_MAX_INPUT_CHARS) {
      fail(res, 400, `消息太长了，请控制在 ${PET_CHAT_MAX_INPUT_CHARS} 字以内`, false);
      return;
    }
    if (!canUsePetChat(user)) {
      fail(res, 429, `今天和灵伴聊天次数已达上限（${PET_CHAT_DAILY_LIMIT} 次），明天再继续吧`, true);
      return;
    }
    const messages = petChatMessagesFor(user);
    const userMessage = {
      author: 'me',
      id: messageId(),
      status: 'sent',
      text,
      time: new Date().toISOString(),
    };
    consumePetChatQuota(user);
    const medicalAlert = createMedicalAlertFromPetChat(user, text);
    const profileUpdate = medicalAlert ? null : applyPetProfileUpdateFromPetChat(user, text);
    const vaccineAction = medicalAlert || profileUpdate ? null : applyPetChatVaccineAction(user, text);
    const createdWeight = medicalAlert || profileUpdate ? null : createWeightRecordFromPetChat(user, text);
    const createdMemo = medicalAlert?.memo ?? (profileUpdate || vaccineAction || createdWeight ? null : createHealthMemoFromPetChat(user, text));
    const reply = await callDeepSeekPetChat(user, text, messages);
    const savedNotices = [
      medicalAlert ? `我已经把这个情况记到我的备忘：「${medicalAlert.memo.title}」，并生成就医提醒。` : '',
      profileUpdate ? `我已经更新了我的档案：${describePetProfilePatch(profileUpdate.patch)}。` : '',
      vaccineAction?.action === 'done' ? `我已经把我的${vaccineAction.vaccine.name}标记完成。` : '',
      vaccineAction?.action === 'reminder_on' ? `我已经开启我的${vaccineAction.vaccine.name}提醒。` : '',
      vaccineAction?.action === 'reminder_off' ? `我已经关闭我的${vaccineAction.vaccine.name}提醒。` : '',
      createdWeight ? `我已经记录我的体重：${createdWeight.kg}kg。` : '',
      createdMemo ? `我已经记到我的备忘：「${createdMemo.title}」。` : '',
    ].filter(Boolean);
    const replyText = savedNotices.length ? `${reply.text}\n\n${savedNotices.join('\n')}` : reply.text;
    const aiMessage = {
      author: 'ai',
      createdMemo,
      createdWeight,
      id: messageId(),
      medicalAlert: medicalAlert ? { notificationId: medicalAlert.notificationId, reason: medicalAlert.reason } : undefined,
      status: 'sent',
      text: replyText,
      time: new Date().toISOString(),
      updatedPet: profileUpdate?.pet,
      updatedVaccine: vaccineAction?.vaccine,
      vaccineReminderIds: vaccineAction?.reminderIds,
    };
    messages.push(userMessage, aiMessage);
    saveState();
    ok(res, aiMessage);
    return;
  }

  if (req.method === 'GET' && pathname === '/places/nearby') {
    const location = placeLocationFromQuery(url, user);
    const radiusKm = clampPlaceRadiusKm(location?.radiusKm || url.searchParams.get('radiusKm') || DEFAULT_DISCOVER_RADIUS_KM);
    const amapPlaces = await fetchAmapPlaces({ location, radiusKm });
    if (amapPlaces.length) {
      const upserted = upsertExternalPlacesForResponse(amapPlaces);
      if (upserted.changed) saveState();
      ok(res, placesForResponse(upserted.places));
      return;
    }
    ok(res, placesForResponse(state.places));
    return;
  }

  if (req.method === 'GET' && pathname === '/places/favorites') {
    ok(res, favoritePlaceIdsFor(user));
    return;
  }

  const placeFavoriteMatch = pathname.match(/^\/places\/([^/]+)\/favorite$/);
  if (req.method === 'PATCH' && placeFavoriteMatch) {
    const placeId = decodeURIComponent(placeFavoriteMatch[1]);
    const favoriteIds = setFavoritePlace(user, placeId, Boolean(body.favorite));
    if (!favoriteIds) {
      fail(res, 404, '地点不存在', false);
      return;
    }
    saveState();
    ok(res, favoriteIds);
    return;
  }

  if (req.method === 'GET' && pathname === '/places/search') {
    const query = String(url.searchParams.get('q') || '').trim();
    const location = placeLocationFromQuery(url, user);
    const radiusKm = clampPlaceRadiusKm(location?.radiusKm || url.searchParams.get('radiusKm') || DEFAULT_DISCOVER_RADIUS_KM);
    const amapPlaces = query ? await fetchAmapPlaces({ location, query, radiusKm }) : await fetchAmapPlaces({ location, radiusKm });
    if (amapPlaces.length) {
      const upserted = upsertExternalPlacesForResponse(amapPlaces);
      if (upserted.changed) saveState();
      const seenIds = new Set(upserted.places.map((place) => place.id));
      const localMatches = (query ? state.places.filter((place) => matchesPlaceSearch(place, query)) : state.places).filter((place) => !seenIds.has(place.id));
      ok(res, placesForResponse([...upserted.places, ...localMatches].slice(0, AMAP_POI_MAX_RESULTS)));
      return;
    }
    const matchedPlaces = query ? state.places.filter((place) => matchesPlaceSearch(place, query)) : state.places;
    ok(res, placesForResponse(matchedPlaces));
    return;
  }

  const placeDetailMatch = pathname.match(/^\/places\/([^/]+)$/);
  if (req.method === 'GET' && placeDetailMatch) {
    const placeId = decodeURIComponent(placeDetailMatch[1]);
    const place = (state.places || []).find((item) => item.id === placeId);
    if (!place) {
      fail(res, 404, '地点不存在', false);
      return;
    }
    ok(res, placeForResponse(place));
    return;
  }

  if (req.method === 'GET' && pathname === '/places/reviews/my') {
    ok(res, placeReviewsFor(user));
    return;
  }

  if (req.method === 'GET' && pathname === '/places/submissions/my') {
    ok(res, placeSubmissionsFor(user));
    return;
  }

  if (req.method === 'POST' && pathname === '/places/submissions') {
    const result = createPlaceSubmission(user, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false);
      return;
    }
    saveState();
    ok(res, result.submission);
    return;
  }

  const reviewMatch = pathname.match(/^\/places\/([^/]+)\/reviews$/);
  if (req.method === 'POST' && reviewMatch) {
    const placeId = decodeURIComponent(reviewMatch[1]);
    const review = createPlaceReview(user, placeId, body.content);
    if (review === null) {
      fail(res, 404, '地点不存在', false);
      return;
    }
    if (review === false) {
      fail(res, 400, '请填写点评内容', false);
      return;
    }
    if (review.error) {
      fail(res, review.statusCode || 400, review.error, false);
      return;
    }
    ok(res, review);
    return;
  }

  fail(res, 404, `未找到接口 ${req.method} ${pathname}`, false);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(error);
    fail(res, 500, '本地服务异常，请稍后重试', true);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Lumii local backend listening on http://0.0.0.0:${port}`);
  console.log(`State file: ${statePath}`);
  console.log(`Test OTP code: ${TEST_CODE}`);
});
