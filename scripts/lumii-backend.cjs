const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const TEST_CODE = '962464';
const SMS_COOLDOWN_MS = Number(process.env.SMS_COOLDOWN_MS || 60 * 1000);
const SMS_TTL_MS = Number(process.env.SMS_TTL_MS || 5 * 60 * 1000);
const SMS_DAILY_LIMIT = Number(process.env.SMS_DAILY_LIMIT || '50');
const SMS_DEVICE_DAILY_LIMIT = Number(process.env.SMS_DEVICE_DAILY_LIMIT || '80');
const SMS_IP_DAILY_LIMIT = Number(process.env.SMS_IP_DAILY_LIMIT || '150');
const AUTH_TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS || 30 * 24 * 60 * 60 * 1000);
const AUTH_TOKEN_SECRET = process.env.LUMII_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET || 'lumii-mvp-dev-token-secret';
const ONLINE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_DISCOVER_RADIUS_KM = 3;
const FUZZY_LOCATION_GRID_DEGREES = 0.01;
const FUZZY_LOCATION_MIN_ACCURACY_METERS = 1000;
const MAX_ACCURACY_BUFFER_KM = 2;
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
const PET_AVATAR_PROVIDER = (process.env.PET_AVATAR_PROVIDER || (TTAPI_API_KEY ? 'ttapi-flux-edits' : 'mock')).toLowerCase();
const PET_AVATAR_DAILY_LIMIT = Number(process.env.PET_AVATAR_DAILY_LIMIT || '10');
const PET_AVATAR_PUBLIC_BASE_URL = (process.env.PET_AVATAR_PUBLIC_BASE_URL || process.env.LUMII_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const MEDIA_UPLOAD_MAX_BASE64_CHARS = Number(process.env.MEDIA_UPLOAD_MAX_BASE64_CHARS || '12000000');

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
    tags: ['可遛狗', '草坪', '饮水点'],
  },
  {
    address: '中央广场 B1',
    category: 'cafe',
    distance: '1.6km',
    id: 'place-cafe-1',
    name: '暖爪咖啡',
    rating: 4.6,
    tags: ['室内友好', '可带猫包'],
  },
  {
    address: '明湖街 12 号',
    category: 'clinic',
    distance: '2.3km',
    id: 'place-clinic-1',
    name: '安心宠物医院',
    rating: 4.7,
    tags: ['急诊', '疫苗'],
  },
];

const petTaxonomy = {
  fieldRules: {
    birthdayFormat: 'YYYY-MM-DD',
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
    disclaimer: 'MVP 占位版，仅用于产品联调与体验测试，正式上线前需由法务或合规顾问确认。',
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
          '如果照片包含人脸、多个宠物或无宠物内容，MVP 会提示重新上传或进入人工/模型校验策略。',
        ],
        title: '宠物照片与 AI 处理',
      },
      {
        body: [
          '你可以在设置中关闭附近可见、互动消息提醒和推送通知。',
          '正式版本需要补充个人信息收集清单、第三方 SDK 清单、注销规则和未成年人保护说明。',
        ],
        title: '你的控制权',
      },
    ],
    title: '灵伴隐私政策',
    version: 'mvp-placeholder-2026-06-12',
  },
  terms: {
    disclaimer: 'MVP 占位版，仅用于产品联调与体验测试，正式上线前需由法务或合规顾问确认。',
    effectiveDate: '2026-06-12',
    key: 'terms',
    sections: [
      {
        body: [
          '灵伴是围绕真实宠物、电子宠物形象、健康记录和宠物主人社交的移动端服务。',
          'MVP 阶段功能仍在测试，页面、接口和 AI 结果可能持续调整。',
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
          '正式版本需要补充举报处理、拉黑、账号注销和争议处理规则。',
        ],
        title: '社交与安全',
      },
    ],
    title: '灵伴用户协议',
    version: 'mvp-placeholder-2026-06-12',
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
    };
  } catch {
    return createInitialState();
  }
}

let state = loadState();

function saveState() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
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

function normalizeUserSettings(value) {
  const current = value && typeof value === 'object' ? value : {};
  const defaults = defaultUserSettings();
  return Object.fromEntries(Object.keys(defaults).map((key) => [key, typeof current[key] === 'boolean' ? current[key] : defaults[key]]));
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

function createPlaceReview(user, placeId, content) {
  const place = (state.places || []).find((item) => item.id === placeId);
  if (!place) return null;
  const trimmedContent = String(content || '').trim();
  if (!trimmedContent) return false;
  const violation = publicPlaceContentViolation('点评内容', trimmedContent, 500);
  if (violation) return { error: violation, statusCode: 400 };
  const review = {
    content: trimmedContent,
    createdAt: '刚刚',
    id: `review-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    placeId,
    status: 'pending_review',
  };
  state.placeReviews[user.phone] = [review, ...placeReviewsFor(user).filter((item) => item.placeId !== placeId)];
  addNotification(user.phone, {
    id: `notification-${review.id}`,
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
    createdAt: '刚刚',
    id: `place-submission-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    name,
    status: 'pending_review',
  };
  state.placeSubmissions[user.phone] = [submission, ...placeSubmissionsFor(user)];
  addNotification(user.phone, {
    id: `notification-${submission.id}`,
    read: false,
    text: `${submission.name}已提交审核，通过后会展示给附近用户`,
    title: '地点提交待审核',
  });
  return { submission };
}

function publicUploadedMedia(media) {
  if (!media) return null;
  const analysis = media.analysis || analyzeUploadedPetMedia({}, media.dataUrl);
  return {
    analysis,
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
  const pet = user.pets.find((item) => item.id === user.activePetId) || user.pets[0];
  if (pet) return pet;
  const suffix = user.phone.slice(-4);
  const dogFirst = Number(suffix[suffix.length - 1]) % 2 === 0;
  return {
    avatarUrl: dogFirst
      ? 'https://images.unsplash.com/photo-1552053831-71594a27632d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600'
      : 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    breed: dogFirst ? '金毛' : '英短',
    gender: 'unknown',
    healthScore: 92,
    id: `fallback-pet-${user.phone}`,
    name: `灵伴${suffix}`,
    personality: ['真实在线', '想交朋友'],
    species: dogFirst ? 'dog' : 'cat',
    weightKg: dogFirst ? 28.4 : 5.2,
  };
}

function healthKeyFor(user) {
  const pet = selectedPetFor(user);
  return pet ? `${user.phone}:${pet.id}` : `${user.phone}:no-pet`;
}

function defaultWeightRecordsFor(user) {
  const pet = selectedPetFor(user);
  if (!pet) return [];
  const kg = Number(pet.weightKg) || (pet.species === 'cat' ? 5.2 : 28.4);
  return [
    { id: `w-${user.phone}-${pet.id}-1`, kg, note: '建档初始体重', recordedAt: new Date().toISOString().slice(0, 10) },
  ];
}

function defaultMemosFor(user) {
  const pet = selectedPetFor(user);
  if (!pet) return [];
  return [
    { content: `${pet.name}建档完成，可以开始记录食欲、便便、洗澡和就诊情况。`, id: `m-${user.phone}-${pet.id}-1`, title: '建档记录', updatedAt: '刚刚' },
  ];
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
    id: `m-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    title: normalizedTitle,
    updatedAt: '刚刚',
  };
  memos.unshift(memo);
  return memo;
}

function defaultVaccinesFor(user) {
  const pet = selectedPetFor(user);
  if (!pet) return [];
  return [
    { dueAt: '2026-06-18', id: `v-${user.phone}-${pet.id}-1`, name: pet.species === 'cat' ? '猫三联' : '狂犬疫苗', status: 'due' },
    { dueAt: '2026-07-05', id: `v-${user.phone}-${pet.id}-2`, name: '体内驱虫', status: 'due' },
  ];
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function healthList(storeName, user, defaultsFactory) {
  state.health = state.health || { memos: {}, vaccines: {}, weights: {} };
  state.health[storeName] = state.health[storeName] || {};
  const key = healthKeyFor(user);
  if (!state.health[storeName][key]) state.health[storeName][key] = defaultsFactory(user);
  return state.health[storeName][key];
}

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

function normalizeCalendarDate(value, fallback = todayIsoDate()) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function vaccineStatusCopy(status) {
  if (status === 'done') return '已完成';
  if (status === 'overdue') return '已逾期';
  return '待提醒';
}

function buildHealthCalendarEvents(user) {
  const weights = healthList('weights', user, defaultWeightRecordsFor);
  const vaccines = healthList('vaccines', user, defaultVaccinesFor);
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
      date: normalizeCalendarDate(memo.updatedAt),
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
  const vaccines = healthList('vaccines', user, defaultVaccinesFor);
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
  const vaccines = healthList('vaccines', user, defaultVaccinesFor);
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
  const vaccines = healthList('vaccines', user, defaultVaccinesFor);
  vaccines
    .filter((vaccine) => vaccine.status !== 'done' && reminderIds.has(vaccine.id))
    .filter(shouldCreateHealthReminderNotification)
    .forEach((vaccine) => {
      const added = addNotification(user.phone, {
        id: healthReminderNotificationId(user, vaccine),
        read: false,
        text: `${vaccine.name}：${vaccineReminderCopy(vaccine)}，记得按宠物医院建议确认时间。`,
        title: '健康提醒',
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
  if (!birthday) return '年龄待补充';
  const bornAt = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(bornAt.getTime())) return '年龄待补充';
  const now = new Date();
  let months = (now.getFullYear() - bornAt.getFullYear()) * 12 + (now.getMonth() - bornAt.getMonth());
  if (now.getDate() < bornAt.getDate()) months -= 1;
  if (months <= 0) return '未满 1 个月';
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (!years) return `${restMonths} 个月`;
  return restMonths ? `${years} 岁 ${restMonths} 个月` : `${years} 岁`;
}

function petChatBaseSystemPrompt() {
  return [
    '你是 Lumii（灵伴）App 内的 AI 电子宠物陪伴助手，不是通用聊天机器人。',
    '你要以“用户真实宠物的电子灵伴”的身份说话：温暖、亲近、有一点拟人化，但不要声称自己是真实动物或真人。',
    '回复目标：陪伴主人、帮助记录宠物日常、提醒健康管理、鼓励安全社交。',
    '表达风格：简体中文；短句；自然亲切；通常 1-3 段；必要时用 1 个温柔追问推动记录；不要过度卖萌；默认不使用 emoji。',
    '健康边界：你不能替代兽医诊断，不给确定诊断和处方。遇到精神萎靡、持续呕吐腹泻、呼吸困难、抽搐、外伤、拒食拒水等风险，要建议尽快联系宠物医院或兽医。',
    '隐私边界：不要索要精确住址、身份证、银行卡等敏感信息；涉及线下见面时建议公开宠物友好地点。',
    '如果用户只是闲聊，也要尽量结合宠物档案和最近记录回应。',
  ].join('\n');
}

function buildPetChatContextPrompt(user) {
  const pet = selectedPetFor(user) || activePetFor(user);
  const healthMemos = healthList('memos', user, defaultMemosFor).slice(0, 3);
  const weights = healthList('weights', user, defaultWeightRecordsFor).slice(0, 2);
  const vaccines = healthList('vaccines', user, defaultVaccinesFor).slice(0, 3);
  const feedbackLines = petChatFeedbackContextFor(user);
  const petName = pet?.name || `灵伴${user.phone.slice(-4)}`;
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
    `健康备忘：${healthMemos.length ? healthMemos.map((item) => `${item.title}：${item.content}`).join('；') : '暂无'}`,
    `疫苗/驱虫：${vaccines.length ? vaccines.map((item) => `${item.name} ${item.status} ${item.dueAt}`).join('；') : '暂无'}`,
  ];

  return [
    `当前你正在陪伴的宠物是“${petName}”。以下资料只用于生成更贴合的回复，不要机械复述。`,
    '宠物档案：',
    ...profileLines,
    '',
    '近期上下文：',
    ...contextLines,
    ...(feedbackLines.length ? ['', '用户对灵伴回复的反馈：', ...feedbackLines] : []),
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
  return new Date().toISOString().slice(0, 10);
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

function recordTtapiAvatarUsage(result, succeeded) {
  state.aiUsage = state.aiUsage || createInitialState().aiUsage;
  const bucket = result?.provider === 'ttapi-flux-edits' ? 'ttapiFlux' : 'ttapiMidjourney';
  state.aiUsage[bucket] = state.aiUsage[bucket] || createInitialState().aiUsage[bucket];
  if (succeeded) state.aiUsage[bucket].succeeded += 1;
  if (!succeeded) state.aiUsage[bucket].failed += 1;
  const quota = Number(result?.data?.quota || result?.quota || 0);
  if (Number.isFinite(quota)) state.aiUsage[bucket].quota += quota;
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
    ttapiFlux,
    ttapiMidjourney,
    updatedAt: new Date().toISOString(),
  };
}

function cleanBase64DataUrl(value, mimeType) {
  const input = String(value || '').trim();
  if (!input || input.length > MEDIA_UPLOAD_MAX_BASE64_CHARS) return '';
  const dataUrlMatch = input.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const clean = dataUrlMatch[2].replace(/\s/g, '');
    return `data:${normalizeImageMimeType(dataUrlMatch[1])};base64,${clean}`;
  }
  return `data:${normalizeImageMimeType(mimeType)};base64,${input.replace(/\s/g, '')}`;
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

function analyzeUploadedPetMedia(body, dataUrl) {
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
      suggestions: ['换一张单只宠物照片', '后续版本会支持裁剪并指定其中一只宠物', '避免多人多宠合照直接生成'],
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
      suggestions: ['尽量裁掉人的脸和身体', '让宠物单独位于画面中央', '后续版本会补充宠物主体裁剪页'],
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
      suggestions: ['换一张只有目标宠物的照片', '避免猫狗同框或多动物同框', '后续版本会支持选择目标宠物'],
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

function normalizeImageMimeType(value) {
  const mimeType = String(value || '').toLowerCase();
  if (mimeType.includes('png')) return 'image/png';
  if (mimeType.includes('webp')) return 'image/webp';
  return 'image/jpeg';
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
  const breed = pet?.breed || (species === 'cat' ? 'cat' : 'golden retriever');
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
  const breed = pet?.breed || (species === 'cat' ? 'cat' : 'golden retriever');
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

function ttapiJobIdFrom(payload) {
  return payload?.data?.job_id || payload?.data?.jobId || payload?.jobId || '';
}

function ttapiResultUrlFrom(payload) {
  const data = payload?.data || {};
  if (Array.isArray(data.images) && data.images[0]) return data.images[0];
  return data.imageUrl || data.image_url || data.cdnImage || data.discordImage || '';
}

function nextProcessingProgress(current, remoteProgress) {
  const parsed = Number(remoteProgress);
  if (Number.isFinite(parsed) && parsed > 0) return Math.max(10, Math.min(98, parsed));
  return Math.min(98, Math.max(10, Number(current || 10) + 12));
}

function createMockAvatarJob(id) {
  return {
    createdAt: Date.now(),
    id,
    progress: 24,
    provider: 'mock',
    resultUrl: undefined,
    status: 'processing',
  };
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
  job.mediaId = mediaId;
  job.ownerPhone = user.phone;
  if (originalJobId) job.originalJobId = originalJobId;
  state.avatarJobs[id] = job;
  if (PET_AVATAR_PROVIDER === 'ttapi-flux-edits') {
    try {
      await startTtapiFluxAvatarJob(user, job, media);
    } catch (error) {
      job.errorMessage = error.message || 'Avatar generation failed to start';
      job.progress = 0;
      job.status = 'failed';
    }
  } else if (PET_AVATAR_PROVIDER === 'ttapi-midjourney') {
    try {
      await startTtapiAvatarJob(req, user, job, media);
    } catch (error) {
      job.errorMessage = error.message || 'Avatar generation failed to start';
      job.progress = 0;
      job.status = 'failed';
    }
  }
  consumePetAvatarQuota(user);
  return { job };
}

function avatarJobForUser(user, jobId) {
  const job = state.avatarJobs[jobId];
  return job && job.ownerPhone === user.phone ? job : null;
}

const avatarFeedbackReasons = new Set(['color', 'expression', 'face_shape', 'not_same_pet', 'other', 'style']);

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
}

async function refreshTtapiAvatarJob(job) {
  const activeProviderJobId = job.upsampleJobId || job.providerJobId;
  if (!activeProviderJobId) throw new Error('TTAPI job id is missing');
  const payload = await ttapiMidjourneyRequest(`/midjourney/v1/fetch?jobId=${encodeURIComponent(activeProviderJobId)}`);
  job.providerStatus = payload.status;

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
        return job;
      }
    }

    const resultUrl = ttapiResultUrlFrom(payload);
    if (!resultUrl) throw new Error('TTAPI result does not include an image URL');
    job.progress = 100;
    job.resultUrl = resultUrl;
    job.status = 'ready';
    if (!job.usageRecorded) {
      recordTtapiAvatarUsage(payload, true);
      job.usageRecorded = true;
    }
    return job;
  }

  if (payload.status === 'FAILED') {
    job.progress = Math.max(10, Number(job.progress || 10));
    job.status = 'failed';
    if (!job.usageRecorded) {
      recordTtapiAvatarUsage(payload, false);
      job.usageRecorded = true;
    }
    return job;
  }

  job.progress = nextProcessingProgress(job.progress, payload?.data?.progress);
  job.status = 'processing';
  return job;
}

async function refreshTtapiFluxAvatarJob(job) {
  if (!job.providerJobId) throw new Error('TTAPI Flux job id is missing');
  const payload = await ttapiFluxRequest(`/flux/fetch?jobId=${encodeURIComponent(job.providerJobId)}`, {
    method: 'GET',
  });
  job.providerStatus = payload.status;

  if (payload.status === 'SUCCESS') {
    const resultUrl = ttapiResultUrlFrom(payload);
    if (!resultUrl) throw new Error('TTAPI Flux result does not include an image URL');
    job.progress = 100;
    job.resultUrl = resultUrl;
    job.status = 'ready';
    if (!job.usageRecorded) {
      recordTtapiAvatarUsage({ ...payload, provider: 'ttapi-flux-edits' }, true);
      job.usageRecorded = true;
    }
    return job;
  }

  if (payload.status === 'FAILED') {
    job.progress = Math.max(10, Number(job.progress || 10));
    job.status = 'failed';
    if (!job.usageRecorded) {
      recordTtapiAvatarUsage({ ...payload, provider: 'ttapi-flux-edits' }, false);
      job.usageRecorded = true;
    }
    return job;
  }

  job.progress = nextProcessingProgress(job.progress, payload?.data?.progress);
  job.status = 'processing';
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
  const petName = pet?.name || '你的宠物';
  const ingestionHint = /(误食|吃了|吞了|舔了|咬了)/.test(String(text || ''));
  const extra = ingestionHint
    ? '如果是误食，请尽量保留包装、成分、照片和大概时间，不要自行催吐或喂药。'
    : '请先让它保持安静，避免继续运动；如果有出血、呼吸异常或抽搐，优先就近急诊。';
  return [
    `这个情况我不能当作普通聊天处理。${petName}可能存在需要尽快评估的风险，请马上联系宠物医院或兽医。`,
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
    .replace(/(帮我)?(记一下|记录一下|记一笔|记到健康备忘|记到备忘|加到健康备忘|加到备忘|保存到健康备忘|保存到备忘|写进健康备忘|写进备忘)[：:，,\s]*/u, '')
    .trim();
}

function createHealthMemoFromPetChat(user, text) {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/.test(rawText)) return null;
  if (!/(记一下|记录一下|记一笔|记到健康备忘|记到备忘|加到健康备忘|加到备忘|保存到健康备忘|保存到备忘|写进健康备忘|写进备忘)/.test(rawText)) return null;
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
  const vaccines = healthList('vaccines', user, defaultVaccinesFor);
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
  const vaccines = healthList('vaccines', user, defaultVaccinesFor);
  const vaccine = findVaccineForPetChat(user, text);
  if (!vaccine) return null;
  const index = vaccines.findIndex((item) => item.id === vaccine.id);
  if (index < 0) return null;

  if (action === 'done') {
    vaccines[index] = { ...vaccines[index], status: 'done' };
    const reminderIds = setVaccineReminderFor(user, vaccines[index].id, false);
    addNotification(user.phone, {
      id: `n-vaccine-done-${healthKeyFor(user)}-${vaccines[index].id}`,
      read: false,
      text: `${vaccines[index].name}已标记完成，健康时间线已更新。`,
      title: '疫苗计划已完成',
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
  const petName = pet?.name || '灵伴';
  const hasHealthConcern = /吐|拉稀|腹泻|不吃|不喝|没精神|发烧|咳|喘|抽搐|流血|疼|瘸|异常|医院|疫苗|驱虫/.test(text);
  if (hasHealthConcern) {
    return `我先帮你记下来：${petName}今天有点让人担心。\n\n我不能替代兽医判断，但如果症状持续、精神明显变差，或出现呕吐腹泻、呼吸异常、拒食拒水，建议尽快联系宠物医院。你也可以补充一下：这个情况大概持续多久了？`;
  }
  if (/散步|出门|公园|遛/.test(text)) {
    return `${petName}听起来会很开心。出门前可以带好牵引、饮水和拾便袋，尽量选开阔的宠物友好地点。\n\n要不要顺手把这次散步记录到健康备忘里？`;
  }
  if (/吃|饭|零食|食欲/.test(text)) {
    return `收到，我会把${petName}今天的饮食状态放在心上。食欲稳定通常是个好信号，零食还是控制一点点更安心。\n\n今天它吃得比平时多、少，还是差不多？`;
  }
  return `${petName}的小灵伴收到啦。\n\n这件事我会当作今天的小记录记在心里。你愿意再告诉我一点细节吗，比如它当时的心情、食欲或者运动量？`;
}

function compactPetChatLine(text, maxLength = 88, options = {}) {
  let cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (options.removeSavedActions) {
    cleaned = cleaned.replace(/已帮你(?:记录|更新|标记|开启|关闭)[^。！？!?]*(?:。|$)/g, '').trim();
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
        .filter((line) => /^已帮你/.test(line)),
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
  const pet = selectedPetFor(user) || activePetFor(user);
  const petName = pet?.name || '你的宠物';
  const reasonCopy = {
    definitive_diagnosis: '我不能在聊天里给出确定诊断。',
    downplayed_emergency: '如果出现高风险症状，不能只靠线上判断。',
    medication_or_dosage: '我不能提供具体药物、剂量或处方建议。',
    unsafe_home_treatment: '我不建议在没有兽医指导时自行催吐、注射或用药。',
  }[reason] || '我不能把这类健康问题当作普通建议处理。';
  return [
    `${reasonCopy}${petName}的健康情况需要更谨慎处理。`,
    '我可以帮你整理观察记录，但不能替代兽医诊断或处方。请优先联系宠物医院或兽医，并带上症状开始时间、精神状态、食欲饮水、便便/呕吐情况和相关照片。',
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
    const content = String(payload?.choices?.[0]?.message?.content || '').trim();
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

function listOnlineOwners(viewer, radiusKm = DEFAULT_DISCOVER_RADIUS_KM) {
  const now = Date.now();
  const realOwners = Object.values(state.users)
    .filter((user) => user.phone !== viewer.phone)
    .filter((user) => user.settings?.nearbyVisible !== false)
    .filter((user) => now - (user.lastSeenAt || 0) < ONLINE_TTL_MS)
    .map((user, index) => {
      const distanceKm = distanceKmBetween(viewer.location, user.location);
      return { card: buildOwnerCard(user, viewer.phone, index, distanceKm ?? undefined), distanceKm, user };
    })
    .filter(({ distanceKm, user }) => {
      if (!viewer.location) return true;
      if (!user.location || distanceKm === null || distanceKm === undefined) return false;
      return distanceKm <= radiusKm + accuracyBufferKm(viewer.location, user.location);
    })
    .sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER))
    .map(({ card }) => card);
  return realOwners;
}

function upsertConversation(phone, conversation) {
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

function conversationTargetPhone(conversationId) {
  return conversationId.startsWith('c-') ? conversationId.slice(2) : '';
}

function enrichConversationFor(user, conversation) {
  const targetPhone = conversationTargetPhone(conversation.id);
  const canSendMessage = Boolean(targetPhone && state.users[targetPhone] && acceptedGreetingBetween(user.phone, targetPhone));
  return {
    ...conversation,
    canSendMessage,
    relationshipStatus: canSendMessage ? 'accepted' : 'pending',
  };
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
  const suffix = otherUser.phone.slice(-4);
  const canSendMessage = acceptedGreetingBetween(user.phone, otherUser.phone);
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
    updatedAt: '刚刚',
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
}

function shouldStoreNotification(phone, category = 'system') {
  const user = state.users[phone];
  if (!user) return false;
  const settings = normalizeUserSettings(user.settings);
  if (!settings.pushNotifications) return false;
  if (category === 'interaction' && !settings.interactionMessages) return false;
  return true;
}

function addNotification(phone, notification, category = 'system') {
  if (!shouldStoreNotification(phone, category)) return false;
  state.notifications[phone] = state.notifications[phone] || [];
  if (state.notifications[phone].some((item) => item.id === notification.id)) return false;
  state.notifications[phone].unshift(notification);
  return true;
}

function markNotificationsRead(phone, ids) {
  const idSet = Array.isArray(ids) && ids.length ? new Set(ids.map(String)) : null;
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
  targetUser.settings = normalizeUserSettings(targetUser.settings);
  if (targetUser.settings.nearbyVisible === false) return null;
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
    if (ticket?.consumedAt && code !== TEST_CODE) {
      fail(res, 400, '验证码已使用，请重新获取', true);
      return;
    }
    if (code !== TEST_CODE && ticket?.code !== code) {
      fail(res, 400, '验证码错误，请检查后重试', true);
      return;
    }
    if (ticket && !ticket.consumedAt && Date.now() > ticket.expiresAt) {
      fail(res, 400, '验证码已过期，请重新获取', true);
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
    if (!ownerName) {
      fail(res, 400, '请输入昵称', false);
      return;
    }
    if (ownerName.length > 16) {
      fail(res, 400, '昵称最多 16 个字', false);
      return;
    }
    user.ownerName = ownerName;
    saveState();
    ok(res, buildUserProfile(user));
    return;
  }

  if (req.method === 'GET' && pathname === '/permissions') {
    ok(res, user.permissions);
    return;
  }

  if (req.method === 'PATCH' && pathname === '/permissions') {
    user.permissions = normalizePermissionState({ ...user.permissions, ...(body.permissions || {}) });
    user.permissionsOnboardingCompleted = Boolean(body.completed || user.permissionsOnboardingCompleted || allPermissionsGranted(user.permissions));
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
    user.settings = normalizeUserSettings({ ...user.settings, ...body });
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
    const token = String(body.token || '').trim();
    if (!token) {
      fail(res, 400, '推送 token 不能为空', false);
      return;
    }
    const platform = ['android', 'ios', 'web'].includes(String(body.platform || '')) ? String(body.platform) : 'android';
    const device = {
      deviceId: body.deviceId ? String(body.deviceId) : undefined,
      platform,
      token,
      updatedAt: '刚刚',
    };
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
    const pet = {
      avatarUrl: body.avatarUrl,
      birthday: body.birthday,
      breed: String(body.breed || '待完善'),
      gender: body.gender === 'male' || body.gender === 'female' ? body.gender : 'unknown',
      healthScore: 96,
      id: `pet-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: String(body.name || `灵伴${user.phone.slice(-4)}`),
      personality: ['亲人', '爱互动', '想交朋友'],
      species: body.species === 'cat' ? 'cat' : 'dog',
      weightKg: Number(body.weightKg) || undefined,
    };
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
    Object.assign(pet, body);
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
    pet.avatarUrl = String(body.avatarUrl || generatedAvatarUrl);
    saveState();
    ok(res, pet);
    return;
  }

  if (req.method === 'POST' && pathname === '/media/uploads') {
    const mediaId = `media-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const dataUrl = cleanBase64DataUrl(body.base64, body.mimeType);
    const analysis = analyzeUploadedPetMedia(body, dataUrl);
    state.mediaUploads = state.mediaUploads || {};
    state.mediaUploads[mediaId] = {
      analysis,
      createdAt: Date.now(),
      dataUrl,
      fileName: String(body.fileName || ''),
      mediaId,
      mimeType: normalizeImageMimeType(body.mimeType),
      ownerPhone: user.phone,
      previewUrl: body.previewUrl || samplePhotoUrl,
      source: body.source || 'mvp_sample',
    };
    saveState();
    ok(res, publicUploadedMedia(state.mediaUploads[mediaId]));
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
    ok(res, publicUploadedMedia(media));
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

  const avatarJobMatch = pathname.match(/^\/ai\/pet-avatar\/jobs\/([^/]+)$/);
  if (req.method === 'GET' && avatarJobMatch) {
    const id = decodeURIComponent(avatarJobMatch[1]);
    const job = avatarJobForUser(user, id);
    if (!job) {
      fail(res, 404, '生成任务不存在', true);
      return;
    }
    if (job.provider === 'ttapi-flux-edits' && job.status === 'processing') {
      try {
        await refreshTtapiFluxAvatarJob(job);
      } catch (error) {
        job.errorMessage = error.message || 'Avatar generation status failed';
        job.status = 'failed';
      }
    } else if (job.provider === 'ttapi-midjourney' && job.status === 'processing') {
      try {
        await refreshTtapiAvatarJob(job);
      } catch (error) {
        job.errorMessage = error.message || 'Avatar generation status failed';
        job.status = 'failed';
      }
    } else if (job.status === 'processing') {
      job.progress = Math.min(100, Number(job.progress || 24) + 38);
      if (job.progress >= 100) {
        job.status = 'ready';
        job.resultUrl = generatedAvatarUrl;
      }
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
      pet.avatarUrl = job.resultUrl;
      job.acceptedAt = new Date().toISOString();
      job.acceptedPetId = pet.id;
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
    const kg = Number(body.kg);
    if (!Number.isFinite(kg) || kg <= 0) {
      fail(res, 400, '请输入正确体重', false);
      return;
    }
    const records = healthList('weights', user, defaultWeightRecordsFor);
    const record = {
      id: `w-${Date.now()}`,
      kg,
      note: String(body.note || ''),
      recordedAt: todayIsoDate(),
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
    const kg = body.kg === undefined ? Number(current.kg) : Number(body.kg);
    if (!Number.isFinite(kg) || kg <= 0) {
      fail(res, 400, '请输入正确体重', false);
      return;
    }
    const recordedAt = String(body.recordedAt === undefined ? current.recordedAt : body.recordedAt).trim();
    if (!isIsoDate(recordedAt)) {
      fail(res, 400, '请选择正确日期', false);
      return;
    }
    records[index] = {
      ...current,
      kg,
      note: body.note === undefined ? current.note : String(body.note || ''),
      recordedAt,
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
    ok(res, healthList('vaccines', user, defaultVaccinesFor));
    return;
  }

  const vaccineMatch = pathname.match(/^\/health\/vaccines\/([^/]+)$/);
  if (req.method === 'PATCH' && vaccineMatch) {
    const id = decodeURIComponent(vaccineMatch[1]);
    const status = String(body.status || '');
    if (!['done', 'due', 'overdue'].includes(status)) {
      fail(res, 400, '疫苗状态无效', false);
      return;
    }
    const vaccines = healthList('vaccines', user, defaultVaccinesFor);
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
        read: false,
        text: `${vaccines[index].name}已标记完成，健康时间线已更新。`,
        title: '疫苗计划已完成',
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
    const vaccines = healthList('vaccines', user, defaultVaccinesFor);
    const vaccine = vaccines.find((item) => item.id === vaccineId);
    if (!vaccine) {
      fail(res, 404, '疫苗计划不存在', false);
      return;
    }
    if (vaccine.status === 'done' && body.enabled !== false) {
      fail(res, 400, '已完成的疫苗计划无需开启提醒', false);
      return;
    }
    const reminderIds = setVaccineReminderFor(user, vaccineId, Boolean(body.enabled));
    if (body.enabled) {
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
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    if (!title || !content) {
      fail(res, 400, '请填写备忘标题和内容', false);
      return;
    }
    const memos = healthList('memos', user, defaultMemosFor);
    const memo = {
      content,
      id: `m-${Date.now()}`,
      title,
      updatedAt: '刚刚',
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
      fail(res, 404, '健康备忘不存在', false);
      return;
    }
    const title = String(body.title ?? memos[index].title).trim();
    const content = String(body.content ?? memos[index].content).trim();
    if (!title || !content) {
      fail(res, 400, '请填写备忘标题和内容', false);
      return;
    }
    memos[index] = { ...memos[index], title, content, updatedAt: '刚刚' };
    saveState();
    ok(res, memos[index]);
    return;
  }

  if (req.method === 'DELETE' && healthMemoMatch) {
    const memoId = decodeURIComponent(healthMemoMatch[1]);
    const memos = healthList('memos', user, defaultMemosFor);
    const index = memos.findIndex((item) => item.id === memoId);
    if (index < 0) {
      fail(res, 404, '健康备忘不存在', false);
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
    const existing = pendingGreetingFor(user.phone, targetPhone);
    if (existing) {
      existing.at = Date.now();
    } else {
      state.greetings.push({
        at: Date.now(),
        fromPhone: user.phone,
        message: '我想认识你和你的毛孩子',
        ownerId,
        status: 'pending',
        targetPhone,
      });
    }
    if (!existing) {
      addNotification(targetPhone, {
        id: `n-greeting-${Date.now()}`,
        read: false,
        text: `${user.ownerName}和${fromPet.name}向你和${targetPet.name}打了招呼`,
        title: '新的招呼',
      }, 'interaction');
    }
    saveState();
    ok(res, { ownerId, sent: true });
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

    if (action === 'reject') {
      saveState();
      ok(res, { ownerId, rejected: true });
      return;
    }

    const myPet = activePetFor(user);
    const fromPet = activePetFor(fromUser);
    const acceptedText = '我们已经互相打招呼啦';
    const myConversation = buildConversationFor(user, fromUser, acceptedText, 0);
    const senderConversation = buildConversationFor(fromUser, user, `${myPet.name}已接受你的招呼`, 1);
    upsertConversation(user.phone, myConversation);
    upsertConversation(fromUser.phone, senderConversation);
    appendConversationMessage(user.phone, myConversation.id, {
      author: 'system',
      id: messageId(),
      text: '你们已经互相打招呼，可以开始聊天。',
      time: '刚刚',
    });
    appendConversationMessage(fromUser.phone, senderConversation.id, {
      author: 'system',
      id: messageId(),
      text: `${myPet.name}已接受${fromPet.name}的招呼，可以开始聊天。`,
      time: '刚刚',
    });
    addNotification(fromUser.phone, {
      id: `n-greeting-accepted-${Date.now()}`,
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
    const time = String(body.time || '今天');
    const note = String(body.note || '');
    const inviteViolation =
      socialChatContentViolation('约遛地点', place, 80) ||
      socialChatContentViolation('约遛时间', time, 60) ||
      socialChatContentViolation('约遛备注', note, 240);
    if (inviteViolation) {
      fail(res, 400, inviteViolation, false);
      return;
    }
    const fromPet = activePetFor(user);
    const lastMessage = `${time} · ${place}`;
    let senderConversation = null;
    state.invites.push({
      at: Date.now(),
      fromPhone: user.phone,
      inviteId,
      ownerId,
      place,
      targetPhone,
      time,
    });
    senderConversation = buildConversationFor(user, targetUser, lastMessage, 0);
    const targetConversation = buildConversationFor(targetUser, user, `${fromPet.name}发来约遛邀请`, 1);
    upsertConversation(user.phone, senderConversation);
    upsertConversation(targetPhone, targetConversation);
    appendConversationMessage(user.phone, senderConversation.id, {
      author: 'me',
      id: messageId(),
      status: 'sent',
      text: note ? `${lastMessage}\n${note}` : lastMessage,
      time: '刚刚',
    });
    appendConversationMessage(targetPhone, targetConversation.id, {
      author: 'other',
      id: messageId(),
      status: 'sent',
      text: note ? `${fromPet.name}邀请你：${lastMessage}\n${note}` : `${fromPet.name}邀请你：${lastMessage}`,
      time: '刚刚',
    });
    addNotification(targetPhone, {
      id: `n-walk-${Date.now()}`,
      read: false,
      text: `${user.ownerName}和${fromPet.name}邀请你在${time}去${place}`,
      title: '新的约遛邀请',
    }, 'interaction');
    saveState();
    ok(res, { conversation: senderConversation, inviteId, ownerId });
    return;
  }

  if (req.method === 'GET' && pathname === '/conversations') {
    ok(res, (state.conversations[user.phone] || []).map((conversation) => enrichConversationFor(user, conversation)));
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
    if (!acceptedGreetingBetween(user.phone, targetPhone)) {
      fail(res, 403, '对方接受招呼后才能聊天', true);
      return;
    }
    const myMessage = {
      author: 'me',
      id: messageId(),
      status: 'sent',
      text,
      time: '刚刚',
    };
    appendConversationMessage(user.phone, conversationId, myMessage);

    const targetUser = ensureUser(targetPhone);
    const targetConversationId = conversationIdFor(user.phone);
    appendConversationMessage(targetPhone, targetConversationId, {
      author: 'other',
      id: messageId(),
      status: 'sent',
      text,
      time: '刚刚',
    });
    upsertConversation(user.phone, buildConversationFor(user, targetUser, text, 0));
    upsertConversation(targetPhone, buildConversationFor(targetUser, user, text, 1));
    addNotification(targetPhone, {
      id: `n-message-${myMessage.id}`,
      read: false,
      text: `${user.ownerName || '附近主人'}：${text.slice(0, 48)}`,
      title: '新的消息',
    }, 'interaction');

    saveState();
    ok(res, myMessage);
    return;
  }

  if (req.method === 'GET' && pathname === '/notifications') {
    ensureHealthReminderNotifications(user);
    saveState();
    ok(res, state.notifications[user.phone] || []);
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
      time: '刚刚',
    };
    consumePetChatQuota(user);
    const medicalAlert = createMedicalAlertFromPetChat(user, text);
    const profileUpdate = medicalAlert ? null : applyPetProfileUpdateFromPetChat(user, text);
    const vaccineAction = medicalAlert || profileUpdate ? null : applyPetChatVaccineAction(user, text);
    const createdWeight = medicalAlert || profileUpdate ? null : createWeightRecordFromPetChat(user, text);
    const createdMemo = medicalAlert?.memo ?? (profileUpdate || vaccineAction || createdWeight ? null : createHealthMemoFromPetChat(user, text));
    const reply = await callDeepSeekPetChat(user, text, messages);
    const savedNotices = [
      medicalAlert ? `已帮你记录到健康备忘：「${medicalAlert.memo.title}」，并生成就医提醒。` : '',
      profileUpdate ? `已帮你更新宠物档案：${describePetProfilePatch(profileUpdate.patch)}。` : '',
      vaccineAction?.action === 'done' ? `已帮你标记${vaccineAction.vaccine.name}完成。` : '',
      vaccineAction?.action === 'reminder_on' ? `已帮你开启${vaccineAction.vaccine.name}提醒。` : '',
      vaccineAction?.action === 'reminder_off' ? `已帮你关闭${vaccineAction.vaccine.name}提醒。` : '',
      createdWeight ? `已帮你记录体重：${createdWeight.kg}kg。` : '',
      createdMemo ? `已帮你记到健康备忘：「${createdMemo.title}」。` : '',
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
      time: '刚刚',
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
    ok(res, state.places);
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
    ok(res, query ? state.places.filter((place) => matchesPlaceSearch(place, query)) : state.places);
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
    ok(res, place);
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
