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
const TENCENTCLOUD_SECRET_ID = process.env.TENCENTCLOUD_SECRET_ID || process.env.TENCENT_CLOUD_SECRET_ID || '';
const TENCENTCLOUD_SECRET_KEY = process.env.TENCENTCLOUD_SECRET_KEY || process.env.TENCENT_CLOUD_SECRET_KEY || '';
const TENCENT_CMS_REGION = process.env.TENCENT_CMS_REGION || 'ap-guangzhou';
const TENCENT_CMS_TEXT_ENDPOINT = process.env.TENCENT_CMS_TEXT_ENDPOINT || 'tms.tencentcloudapi.com';
const TENCENT_CMS_TEXT_VERSION = process.env.TENCENT_CMS_TEXT_VERSION || '2020-12-29';
const TENCENT_CMS_TEXT_BIZ_TYPE = process.env.TENCENT_CMS_TEXT_BIZ_TYPE || '';
const TENCENT_CMS_TEXT_BIZ_TYPES = {
  pet_circle_comment: process.env.TENCENT_CMS_TEXT_BIZ_SOCIAL_COMMENT || process.env.TENCENT_CMS_TEXT_BIZ_COMMENT || 'lumii_t_social_comment',
  pet_circle_post: process.env.TENCENT_CMS_TEXT_BIZ_SOCIAL_POST || process.env.TENCENT_CMS_TEXT_BIZ_POST || 'lumii_t_social_post',
  pet_profile: process.env.TENCENT_CMS_TEXT_BIZ_PROFILE || 'lumii_t_profile',
  place_review: process.env.TENCENT_CMS_TEXT_BIZ_PLACE || process.env.TENCENT_CMS_TEXT_BIZ_PLACE_REVIEW || 'lumii_t_place',
  place_submission: process.env.TENCENT_CMS_TEXT_BIZ_PLACE || process.env.TENCENT_CMS_TEXT_BIZ_PLACE_SUBMISSION || 'lumii_t_place',
};
const TENCENT_CMS_IMAGE_ENDPOINT = process.env.TENCENT_CMS_IMAGE_ENDPOINT || 'ims.tencentcloudapi.com';
const TENCENT_CMS_IMAGE_VERSION = process.env.TENCENT_CMS_IMAGE_VERSION || '2020-12-29';
const TENCENT_CMS_IMAGE_BIZ_TYPE = process.env.TENCENT_CMS_IMAGE_BIZ_TYPE || '';
const TENCENT_CMS_IMAGE_BIZ_TYPES = {
  media_upload: process.env.TENCENT_CMS_IMAGE_BIZ_PET_AVATAR || 'lumii_i_pet_avatar',
  pet_avatar: process.env.TENCENT_CMS_IMAGE_BIZ_PET_AVATAR || 'lumii_i_pet_avatar',
  pet_circle_cover: process.env.TENCENT_CMS_IMAGE_BIZ_COVER || 'lumii_i_cover',
  pet_circle_photo: process.env.TENCENT_CMS_IMAGE_BIZ_SOCIAL_PHOTO || 'lumii_i_social_photo',
  support: process.env.TENCENT_CMS_IMAGE_BIZ_SUPPORT || 'lumii_i_support',
};
const TENCENT_CMS_TIMEOUT_MS = Number(process.env.TENCENT_CMS_TIMEOUT_MS || '12000');

const argPortIndex = process.argv.findIndex((item) => item === '--port');
const port = Number(process.env.LUMII_BACKEND_PORT || (argPortIndex >= 0 ? process.argv[argPortIndex + 1] : '8787'));
const statePath = process.env.LUMII_BACKEND_STATE_PATH || path.join(__dirname, '..', 'dist', 'lumii-backend-state.json');
const adminStaticDir = path.join(__dirname, '..', 'admin');
const ADMIN_USERNAME = process.env.LUMII_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.LUMII_ADMIN_PASSWORD || 'LumiiAdmin@2026';
const ADMIN_TOKEN_TTL_MS = Number(process.env.LUMII_ADMIN_TOKEN_TTL_MS || 12 * 60 * 60 * 1000);
const ADMIN_LOGIN_MAX_ATTEMPTS = Math.max(1, Number(process.env.LUMII_ADMIN_LOGIN_MAX_ATTEMPTS || '5') || 5);
const ADMIN_LOGIN_LOCK_MS = Math.max(60 * 1000, Number(process.env.LUMII_ADMIN_LOGIN_LOCK_MS || 15 * 60 * 1000) || 15 * 60 * 1000);

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

function defaultOpsConfig() {
  return {
    ai: {
      petAvatarDailyLimit: PET_AVATAR_DAILY_LIMIT,
      petChatDailyLimit: PET_CHAT_DAILY_LIMIT,
    },
    analytics: {
      enabled: true,
      retentionDays: 30,
      sampleRatePercent: 100,
    },
    app: {
      announcement: {
        actionLabel: '知道了',
        actionRoute: '',
        body: '',
        enabled: false,
        title: '',
        version: '',
      },
      maintenanceEnabled: false,
      maintenanceMessage: '',
      splash: {
        actionLabel: '知道了',
        actionRoute: '',
        body: '',
        enabled: false,
        imageUrl: '',
        title: '',
        version: '',
      },
      update: {
        androidUrl: '',
        enabled: false,
        force: false,
        iosUrl: '',
        latestVersion: '',
        minVersion: '',
        rolloutPercent: 100,
        subtitle: '',
        title: '发现新版本',
      },
    },
    features: {
      aiAvatar: true,
      petChat: true,
      petCircle: true,
      places: true,
      walkInvite: true,
    },
    moderation: {
      blockKeywords: [],
      blockMessage: '内容包含平台暂不支持公开展示的信息，请修改后再提交',
      enabled: false,
      highRiskKeywords: [],
      machineImageEnabled: false,
      machineTextEnabled: false,
      reviewKeywords: [],
      reviewMessage: '内容已进入人工审核，通过后会展示给附近用户',
      sampleReviewRatePercent: 0,
      textRulesEnabled: true,
    },
    support: {
      slaHours: {
        high: 8,
        low: 72,
        normal: 24,
        urgent: 2,
      },
    },
    notifications: {
      maxCampaignsPerDay: 5,
      maxPerUserPerDay: 2,
      rateLimitEnabled: true,
    },
    social: {
      discoverRadiusKm: DEFAULT_DISCOVER_RADIUS_KM,
      nearbyMomentTtlDays: 7,
      petCircleMaxPhotos: 6,
    },
    updatedAt: new Date().toISOString(),
  };
}

function createInitialState() {
  return {
    adminAuditLogs: [],
    adminLoginSecurity: {
      failedAttempts: 0,
      firstFailedAt: '',
      lastFailedAt: '',
      lastFailedIp: '',
      lastFailedUserAgent: '',
      lastUsername: '',
      lockedUntil: '',
      lockCount: 0,
    },
    appEvents: [],
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
    moderationTaskMeta: {},
    moderationSamples: [],
    socialReports: [],
    sanctionAppeals: [],
    supportTickets: [],
    supportTicketReplyTemplates: [],
    systemNotifications: [],
    notificationTemplates: [],
    opsConfigDrafts: [],
    opsConfigRevisions: [],
    userSanctions: [],
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
    opsConfig: defaultOpsConfig(),
    placeModerationTemplates: [],
    placeContributions: [],
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

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeKeywordList(value, fallback = [], maxItems = 80) {
  const rawItems = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/[\n,，;；]+/u);
  const seen = new Set();
  const items = [];
  for (const raw of rawItems) {
    const keyword = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(keyword);
    if (items.length >= maxItems) break;
  }
  if (items.length) return items;
  if (fallback && fallback !== value) return normalizeKeywordList(fallback, null, maxItems);
  return [];
}

function normalizeModerationConfig(value, defaults) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    blockKeywords: normalizeKeywordList(source.blockKeywords, defaults.blockKeywords),
    blockMessage: String(source.blockMessage || defaults.blockMessage).slice(0, 80),
    enabled: Boolean(source.enabled),
    highRiskKeywords: normalizeKeywordList(source.highRiskKeywords, defaults.highRiskKeywords),
    machineImageEnabled: Boolean(source.machineImageEnabled),
    machineTextEnabled: Boolean(source.machineTextEnabled),
    reviewKeywords: normalizeKeywordList(source.reviewKeywords, defaults.reviewKeywords),
    reviewMessage: String(source.reviewMessage || defaults.reviewMessage).slice(0, 80),
    sampleReviewRatePercent: Math.floor(clampNumber(source.sampleReviewRatePercent, defaults.sampleReviewRatePercent ?? 0, 0, 100)),
    textRulesEnabled: source.textRulesEnabled !== false,
  };
}

function normalizeSupportConfig(value, defaults) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const defaultSlaHours = defaults?.slaHours || {};
  const sourceSlaHours = source.slaHours && typeof source.slaHours === 'object' ? source.slaHours : {};
  return {
    slaHours: {
      high: Math.floor(clampNumber(sourceSlaHours.high, defaultSlaHours.high || 8, 1, 168)),
      low: Math.floor(clampNumber(sourceSlaHours.low, defaultSlaHours.low || 72, 1, 336)),
      normal: Math.floor(clampNumber(sourceSlaHours.normal, defaultSlaHours.normal || 24, 1, 336)),
      urgent: Math.floor(clampNumber(sourceSlaHours.urgent, defaultSlaHours.urgent || 2, 1, 72)),
    },
  };
}

function normalizeNotificationOpsConfig(value, defaults) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    maxCampaignsPerDay: Math.floor(clampNumber(source.maxCampaignsPerDay, defaults.maxCampaignsPerDay || 5, 1, 50)),
    maxPerUserPerDay: Math.floor(clampNumber(source.maxPerUserPerDay, defaults.maxPerUserPerDay || 2, 1, 20)),
    rateLimitEnabled: source.rateLimitEnabled !== false,
  };
}

function normalizeAnalyticsConfig(value, defaults) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    enabled: source.enabled !== false,
    retentionDays: Math.floor(clampNumber(source.retentionDays, defaults.retentionDays || 30, 7, 180)),
    sampleRatePercent: Math.floor(clampNumber(source.sampleRatePercent, defaults.sampleRatePercent ?? 100, 0, 100)),
  };
}

function normalizeAppVersionText(value) {
  return String(value || '').trim().replace(/[^0-9A-Za-z.+_-]/g, '').slice(0, 32);
}

function normalizeHttpUrlText(value, maxLength = 500) {
  const text = String(value || '').trim().slice(0, maxLength);
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) return '';
  return text;
}

function normalizeOpsConfig(value) {
  const defaults = defaultOpsConfig();
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const ai = source.ai && typeof source.ai === 'object' ? source.ai : {};
  const analytics = source.analytics && typeof source.analytics === 'object' ? source.analytics : {};
  const app = source.app && typeof source.app === 'object' ? source.app : {};
  const features = source.features && typeof source.features === 'object' ? source.features : {};
  const moderation = source.moderation && typeof source.moderation === 'object' ? source.moderation : {};
  const notifications = source.notifications && typeof source.notifications === 'object' ? source.notifications : {};
  const social = source.social && typeof source.social === 'object' ? source.social : {};
  const support = source.support && typeof source.support === 'object' ? source.support : {};
  return {
    ai: {
      petAvatarDailyLimit: Math.floor(clampNumber(ai.petAvatarDailyLimit, defaults.ai.petAvatarDailyLimit, 0, 1000)),
      petChatDailyLimit: Math.floor(clampNumber(ai.petChatDailyLimit, defaults.ai.petChatDailyLimit, 0, 1000)),
    },
    analytics: normalizeAnalyticsConfig(analytics, defaults.analytics),
    app: {
      announcement: {
        actionLabel: String(app.announcement?.actionLabel || defaults.app.announcement.actionLabel).slice(0, 16),
        actionRoute: ['discover', 'home', 'map', 'notifications', 'profile', 'safety', 'settings', 'supportTickets'].includes(String(app.announcement?.actionRoute || '')) ? String(app.announcement.actionRoute) : '',
        body: String(app.announcement?.body || '').slice(0, 180),
        enabled: Boolean(app.announcement?.enabled),
        title: String(app.announcement?.title || '').slice(0, 40),
        version: String(app.announcement?.version || '').slice(0, 40),
      },
      maintenanceEnabled: Boolean(app.maintenanceEnabled),
      maintenanceMessage: String(app.maintenanceMessage || '').slice(0, 120),
      splash: {
        actionLabel: String(app.splash?.actionLabel || defaults.app.splash.actionLabel).slice(0, 16),
        actionRoute: ['discover', 'home', 'map', 'notifications', 'profile', 'safety', 'settings', 'supportTickets'].includes(String(app.splash?.actionRoute || '')) ? String(app.splash.actionRoute) : '',
        body: String(app.splash?.body || '').slice(0, 180),
        enabled: Boolean(app.splash?.enabled),
        imageUrl: normalizeHttpUrlText(app.splash?.imageUrl, 1000),
        title: String(app.splash?.title || '').slice(0, 40),
        version: String(app.splash?.version || '').slice(0, 40),
      },
      update: {
        androidUrl: normalizeHttpUrlText(app.update?.androidUrl, 1000),
        enabled: Boolean(app.update?.enabled),
        force: Boolean(app.update?.force),
        iosUrl: normalizeHttpUrlText(app.update?.iosUrl, 1000),
        latestVersion: normalizeAppVersionText(app.update?.latestVersion),
        minVersion: normalizeAppVersionText(app.update?.minVersion),
        rolloutPercent: Math.floor(clampNumber(app.update?.rolloutPercent, defaults.app.update.rolloutPercent, 0, 100)),
        subtitle: String(app.update?.subtitle || '').slice(0, 140),
        title: String(app.update?.title || defaults.app.update.title).slice(0, 40),
      },
    },
    features: {
      aiAvatar: features.aiAvatar !== false,
      petChat: features.petChat !== false,
      petCircle: features.petCircle !== false,
      places: features.places !== false,
      walkInvite: features.walkInvite !== false,
    },
    moderation: normalizeModerationConfig(moderation, defaults.moderation),
    notifications: normalizeNotificationOpsConfig(notifications, defaults.notifications),
    support: normalizeSupportConfig(support, defaults.support),
    social: {
      discoverRadiusKm: clampNumber(social.discoverRadiusKm, defaults.social.discoverRadiusKm, 1, 20),
      nearbyMomentTtlDays: Math.floor(clampNumber(social.nearbyMomentTtlDays, defaults.social.nearbyMomentTtlDays, 1, 90)),
      petCircleMaxPhotos: Math.floor(clampNumber(social.petCircleMaxPhotos, defaults.social.petCircleMaxPhotos, 1, 9)),
    },
    updatedAt: String(source.updatedAt || defaults.updatedAt),
  };
}

function currentOpsConfig() {
  state.opsConfig = normalizeOpsConfig(state.opsConfig || defaultOpsConfig());
  return state.opsConfig;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function opsConfigSummary(config) {
  const features = config?.features || {};
  return {
    announcementEnabled: Boolean(config?.app?.announcement?.enabled),
    analyticsEnabled: config?.analytics?.enabled !== false,
    analyticsSampleRatePercent: Number(config?.analytics?.sampleRatePercent ?? 100),
    maintenanceEnabled: Boolean(config?.app?.maintenanceEnabled),
    machineImageModerationEnabled: Boolean(config?.moderation?.machineImageEnabled),
    machineTextModerationEnabled: Boolean(config?.moderation?.machineTextEnabled),
    moderationEnabled: Boolean(config?.moderation?.enabled),
    moderationSampleReviewRatePercent: Number(config?.moderation?.sampleReviewRatePercent ?? 0),
    notificationMaxCampaignsPerDay: Number(config?.notifications?.maxCampaignsPerDay || 0),
    notificationMaxPerUserPerDay: Number(config?.notifications?.maxPerUserPerDay || 0),
    notificationRateLimitEnabled: config?.notifications?.rateLimitEnabled !== false,
    discoverRadiusKm: Number(config?.social?.discoverRadiusKm || 0),
    enabledFeatures: Object.values(features).filter((value) => value !== false).length,
    nearbyMomentTtlDays: Number(config?.social?.nearbyMomentTtlDays || 0),
    petAvatarDailyLimit: Number(config?.ai?.petAvatarDailyLimit || 0),
    petChatDailyLimit: Number(config?.ai?.petChatDailyLimit || 0),
    petCircleMaxPhotos: Number(config?.social?.petCircleMaxPhotos || 0),
    supportHighSlaHours: Number(config?.support?.slaHours?.high || 0),
    supportUrgentSlaHours: Number(config?.support?.slaHours?.urgent || 0),
    updateEnabled: Boolean(config?.app?.update?.enabled),
  };
}

function adminContentSafetyStatus(config = currentOpsConfig()) {
  const moderation = config.moderation || {};
  const textScopes = [
    ['pet_circle_post', '宠友圈小事文本'],
    ['pet_circle_comment', '宠友圈评论文本'],
    ['place_review', '地点点评文本'],
    ['place_submission', '新增地点文本'],
    ['pet_profile', '宠物资料文本'],
  ];
  const imageScopes = [
    ['pet_avatar', '宠物头像与灵伴原图'],
    ['pet_circle_photo', '宠友圈小事图片'],
    ['pet_circle_cover', '宠友圈封面图片'],
    ['support', '反馈/工单附件图片'],
  ];
  return {
    credentialsConfigured: tencentCmsConfigured(),
    image: {
      bizTypes: imageScopes.map(([scope, label]) => ({ bizType: tencentImageBizTypeForScope(scope), label, scope })),
      enabled: Boolean(moderation.enabled && moderation.machineImageEnabled),
      endpoint: TENCENT_CMS_IMAGE_ENDPOINT,
      version: TENCENT_CMS_IMAGE_VERSION,
    },
    region: TENCENT_CMS_REGION,
    requiredEnv: [
      'TENCENTCLOUD_SECRET_ID',
      'TENCENTCLOUD_SECRET_KEY',
      '可选：TENCENT_CMS_*_BIZ_* 用于覆盖默认 Biztype',
    ],
    text: {
      bizTypes: textScopes.map(([scope, label]) => ({ bizType: tencentTextBizTypeForScope(scope), label, scope })),
      enabled: Boolean(moderation.enabled && moderation.machineTextEnabled),
      endpoint: TENCENT_CMS_TEXT_ENDPOINT,
      version: TENCENT_CMS_TEXT_VERSION,
    },
  };
}

function ensureOpsConfigRevisions() {
  if (!Array.isArray(state.opsConfigRevisions)) state.opsConfigRevisions = [];
  state.opsConfigRevisions = state.opsConfigRevisions
    .filter((item) => item && item.id && item.config)
    .slice(0, 80);
  return state.opsConfigRevisions;
}

function adminOpsConfigRevisions() {
  return ensureOpsConfigRevisions().map((item) => ({
    action: item.action || 'publish',
    createdAt: item.createdAt,
    createdBy: item.createdBy || 'admin',
    id: item.id,
    reason: item.reason || '',
    changeSummary: Array.isArray(item.changeSummary) ? item.changeSummary : [],
    riskChanges: Array.isArray(item.riskChanges) ? item.riskChanges : [],
    sourceRevisionId: item.sourceRevisionId || '',
    summary: item.summary || opsConfigSummary(item.config),
  }));
}

function recordOpsConfigRevision(admin, config, reason = '', action = 'publish', sourceRevisionId = '', beforeConfig = null) {
  const snapshot = normalizeOpsConfig(config);
  const createdAt = snapshot.updatedAt || new Date().toISOString();
  const before = beforeConfig ? normalizeOpsConfig(beforeConfig) : currentOpsConfig();
  const riskChanges = configRiskChanges(before, snapshot);
  const revision = {
    action,
    config: cloneJson(snapshot),
    createdAt,
    createdBy: admin?.username || 'admin',
    id: `config-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    reason: String(reason || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    riskChanges,
    sourceRevisionId,
    changeSummary: configChangeSummary(before, snapshot),
    summary: opsConfigSummary(snapshot),
  };
  state.opsConfigRevisions = [revision, ...ensureOpsConfigRevisions()].slice(0, 80);
  return revision;
}

function buildOpsConfigPatch(before, body = {}) {
  return normalizeOpsConfig({
    ...before,
    ...body,
    ai: { ...before.ai, ...(body.ai || {}) },
    analytics: { ...before.analytics, ...(body.analytics || {}) },
    app: {
      ...before.app,
      ...(body.app || {}),
      announcement: {
        ...(before.app?.announcement || {}),
        ...(body.app?.announcement || {}),
      },
      splash: {
        ...(before.app?.splash || {}),
        ...(body.app?.splash || {}),
      },
      update: {
        ...(before.app?.update || {}),
        ...(body.app?.update || {}),
      },
    },
    features: { ...before.features, ...(body.features || {}) },
    moderation: { ...before.moderation, ...(body.moderation || {}) },
    notifications: { ...before.notifications, ...(body.notifications || {}) },
    social: { ...before.social, ...(body.social || {}) },
    support: {
      ...before.support,
      ...(body.support || {}),
      slaHours: {
        ...(before.support?.slaHours || {}),
        ...(body.support?.slaHours || {}),
      },
    },
    updatedAt: new Date().toISOString(),
  });
}

function configValueAt(config, key) {
  return String(key || '').split('.').reduce((value, part) => (value === undefined || value === null ? undefined : value[part]), config);
}

function normalizedConfigComparable(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean).sort();
  if (value && typeof value === 'object') return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = normalizedConfigComparable(value[key]);
    return acc;
  }, {});
  return value;
}

function configValueChanged(before, after, key) {
  return JSON.stringify(normalizedConfigComparable(configValueAt(before, key))) !== JSON.stringify(normalizedConfigComparable(configValueAt(after, key)));
}

function configDisplayValue(value) {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (Array.isArray(value)) return `${value.length} items`;
  if (value && typeof value === 'object') return JSON.stringify(value).slice(0, 120);
  if (value === undefined || value === null || value === '') return '-';
  return String(value).slice(0, 120);
}

function configChangeSummary(before, after) {
  const specs = [
    ['ai.petAvatarDailyLimit', 'AI avatar daily limit'],
    ['ai.petChatDailyLimit', 'AI chat daily limit'],
    ['social.petCircleMaxPhotos', 'Pet circle max photos'],
    ['social.discoverRadiusKm', 'Discover radius'],
    ['social.nearbyMomentTtlDays', 'Nearby moment TTL'],
    ['features.aiAvatar', 'AI avatar feature'],
    ['features.petChat', 'Pet chat feature'],
    ['features.petCircle', 'Pet circle feature'],
    ['features.places', 'Places feature'],
    ['features.walkInvite', 'Walk invite feature'],
    ['app.maintenanceEnabled', 'Maintenance mode'],
    ['app.maintenanceMessage', 'Maintenance message'],
    ['app.announcement', 'App announcement'],
    ['app.update', 'App update policy'],
    ['app.splash', 'Splash notice'],
    ['analytics.enabled', 'Analytics enabled'],
    ['analytics.sampleRatePercent', 'Analytics sample rate'],
    ['analytics.retentionDays', 'Analytics retention days'],
    ['moderation.enabled', 'Content safety enabled'],
    ['moderation.textRulesEnabled', 'Text rules enabled'],
    ['moderation.machineTextEnabled', 'Tencent text moderation'],
    ['moderation.machineImageEnabled', 'Tencent image moderation'],
    ['moderation.blockKeywords', 'Block keywords'],
    ['moderation.highRiskKeywords', 'High-risk keywords'],
    ['moderation.reviewKeywords', 'Review keywords'],
    ['moderation.sampleReviewRatePercent', 'Moderation sample review rate'],
    ['notifications.rateLimitEnabled', 'Notification rate limit enabled'],
    ['notifications.maxCampaignsPerDay', 'Notification daily campaign cap'],
    ['notifications.maxPerUserPerDay', 'Notification daily per-user cap'],
    ['support.slaHours', 'Support SLA hours'],
  ];
  return specs
    .filter(([key]) => configValueChanged(before, after, key))
    .map(([key, label]) => ({
      after: configDisplayValue(configValueAt(after, key)),
      before: configDisplayValue(configValueAt(before, key)),
      key,
      label,
    }))
    .slice(0, 40);
}

function configRiskChanges(before, after) {
  const risks = [];
  const addRisk = (key, label, severity, reason) => {
    if (!configValueChanged(before, after, key)) return;
    risks.push({
      after: configDisplayValue(configValueAt(after, key)),
      before: configDisplayValue(configValueAt(before, key)),
      key,
      label,
      reason,
      severity,
    });
  };
  addRisk('app.maintenanceEnabled', 'Maintenance mode', 'P0', 'Can block most write flows and change the mobile app entry experience.');
  addRisk('app.update.force', 'Force update', 'P0', 'Can prevent users on older APKs from continuing without an update.');
  addRisk('features.aiAvatar', 'AI avatar feature switch', 'P1', 'Can hide or block a core AI avatar workflow.');
  addRisk('features.petChat', 'Pet chat feature switch', 'P1', 'Can hide or block AI pet chat.');
  addRisk('features.petCircle', 'Pet circle feature switch', 'P1', 'Can hide or block pet circle browsing and publishing.');
  addRisk('features.places', 'Places feature switch', 'P1', 'Can hide or block map and place workflows.');
  addRisk('features.walkInvite', 'Walk invite feature switch', 'P1', 'Can block user-to-user walk invites.');
  addRisk('moderation.enabled', 'Content safety master switch', 'P0', 'Can allow or block public UGC safety checks.');
  addRisk('moderation.machineTextEnabled', 'Tencent text moderation', 'P0', 'Can change machine review coverage for public text.');
  addRisk('moderation.machineImageEnabled', 'Tencent image moderation', 'P0', 'Can change machine review coverage for public images.');
  addRisk('moderation.blockKeywords', 'Block keywords', 'P1', 'Can immediately reject user submissions.');
  addRisk('moderation.highRiskKeywords', 'High-risk keywords', 'P1', 'Can send public content into review.');
  addRisk('moderation.reviewKeywords', 'Review keywords', 'P1', 'Can send public content into review.');
  addRisk('moderation.sampleReviewRatePercent', 'Moderation sample review rate', 'P2', 'Can change how much approved public content enters manual quality sampling.');
  addRisk('notifications.rateLimitEnabled', 'Notification rate limit', 'P1', 'Can remove the guardrail that prevents repeated system notifications.');
  addRisk('notifications.maxCampaignsPerDay', 'Notification daily campaign cap', 'P2', 'Can make global notification sending more or less aggressive.');
  addRisk('notifications.maxPerUserPerDay', 'Notification per-user daily cap', 'P2', 'Can make individual users receive more or fewer system notifications.');
  if (Number(configValueAt(after, 'ai.petAvatarDailyLimit')) === 0 && configValueChanged(before, after, 'ai.petAvatarDailyLimit')) {
    addRisk('ai.petAvatarDailyLimit', 'AI avatar daily limit', 'P1', 'Setting the limit to 0 effectively disables new avatar generation.');
  }
  if (Number(configValueAt(after, 'ai.petChatDailyLimit')) === 0 && configValueChanged(before, after, 'ai.petChatDailyLimit')) {
    addRisk('ai.petChatDailyLimit', 'AI chat daily limit', 'P1', 'Setting the limit to 0 effectively disables new pet chat messages.');
  }
  return risks;
}

function normalizeOpsConfigDraft(item = {}) {
  if (!item || typeof item !== 'object' || !item.id || !item.config) return null;
  const config = normalizeOpsConfig(item.config);
  const status = ['draft', 'published', 'discarded'].includes(String(item.status || '')) ? String(item.status) : 'draft';
  const baseConfig = item.baseConfig ? normalizeOpsConfig(item.baseConfig) : currentOpsConfig();
  return {
    baseSummary: item.baseSummary || opsConfigSummary(baseConfig),
    changeSummary: Array.isArray(item.changeSummary) ? item.changeSummary : configChangeSummary(baseConfig, config),
    config,
    createdAt: item.createdAt || new Date().toISOString(),
    createdBy: item.createdBy || 'admin',
    discardedAt: item.discardedAt || '',
    discardedBy: item.discardedBy || '',
    id: String(item.id),
    publishedAt: item.publishedAt || '',
    publishedBy: item.publishedBy || '',
    reason: String(item.reason || '').slice(0, 240),
    revisionId: item.revisionId || '',
    riskChanges: Array.isArray(item.riskChanges) ? item.riskChanges : configRiskChanges(baseConfig, config),
    status,
    summary: item.summary || opsConfigSummary(config),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

function ensureOpsConfigDrafts() {
  if (!Array.isArray(state.opsConfigDrafts)) state.opsConfigDrafts = [];
  state.opsConfigDrafts = state.opsConfigDrafts
    .map(normalizeOpsConfigDraft)
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
    .slice(0, 60);
  return state.opsConfigDrafts;
}

function adminOpsConfigDrafts() {
  return ensureOpsConfigDrafts().map((draft) => ({
    baseSummary: draft.baseSummary,
    changeSummary: draft.changeSummary,
    createdAt: draft.createdAt,
    createdBy: draft.createdBy,
    discardedAt: draft.discardedAt,
    discardedBy: draft.discardedBy,
    id: draft.id,
    publishedAt: draft.publishedAt,
    publishedBy: draft.publishedBy,
    reason: draft.reason,
    revisionId: draft.revisionId,
    riskChanges: draft.riskChanges,
    status: draft.status,
    summary: draft.summary,
    updatedAt: draft.updatedAt,
  }));
}

function createOpsConfigDraft(admin, body = {}) {
  const before = currentOpsConfig();
  const next = buildOpsConfigPatch(before, body);
  const now = new Date().toISOString();
  const draft = normalizeOpsConfigDraft({
    baseConfig: before,
    baseSummary: opsConfigSummary(before),
    changeSummary: configChangeSummary(before, next),
    config: next,
    createdAt: now,
    createdBy: admin?.username || 'admin',
    id: `config-draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    reason: body.reason || 'config draft',
    riskChanges: configRiskChanges(before, next),
    status: 'draft',
    summary: opsConfigSummary(next),
    updatedAt: now,
  });
  state.opsConfigDrafts = [draft, ...ensureOpsConfigDrafts()].slice(0, 60);
  return draft;
}

function configLinkageValue(config, key) {
  const parts = String(key || '').split('.');
  let value = config;
  for (const part of parts) {
    if (!part || value === null || value === undefined) return '';
    value = value[part];
  }
  if (typeof value === 'boolean') return value ? '开启' : '关闭';
  if (Array.isArray(value)) return `${value.length} 条`;
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function adminConfigLinkageStatus(item) {
  if (item.reserved) return 'reserved';
  if (item.backendEnforced && item.mobileApplied) return 'linked';
  if (item.backendEnforced) return 'backend_only';
  if (item.mobileApplied) return 'mobile_only';
  return 'pending';
}

function adminConfigLinkageStatusLabel(status) {
  const labels = {
    backend_only: '后端强制',
    linked: '前后端联动',
    mobile_only: '移动端联动',
    pending: '待接入',
    reserved: '预留',
  };
  return labels[status] || status || '未知';
}

function adminConfigLinkageItems(config = currentOpsConfig()) {
  const specs = [
    {
      backendEvidence: 'consumePetAvatarQuota / canUsePetAvatarGeneration 读取 currentOpsConfig().ai.petAvatarDailyLimit。',
      backendEnforced: true,
      group: 'AI',
      key: 'ai.petAvatarDailyLimit',
      label: '灵伴形象每日额度',
      mobileApplied: true,
      mobileEvidence: '移动端读取 /ai/usage 和 /app/config，生成页展示 count/limit/remaining。',
      userImpact: '控制单用户每天可生成 AI 灵伴形象的次数。',
    },
    {
      backendEvidence: 'consumePetChatQuota / canUsePetChat 读取 currentOpsConfig().ai.petChatDailyLimit。',
      backendEnforced: true,
      group: 'AI',
      key: 'ai.petChatDailyLimit',
      label: 'AI 对话每日额度',
      mobileApplied: true,
      mobileEvidence: '移动端读取 /ai/usage 和 /app/config，AI 对话入口展示真实额度。',
      userImpact: '控制单用户每天可发送 AI 宠物对话的次数。',
    },
    {
      backendEvidence: 'createPetCircleMoment / public card 截断图片数量均读取 effectivePetCircleMaxPhotos()。',
      backendEnforced: true,
      group: '宠友圈',
      key: 'social.petCircleMaxPhotos',
      label: '宠友圈图片上限',
      mobileApplied: true,
      mobileEvidence: '发布小事页面用 remoteConfig.social.petCircleMaxPhotos 控制选择数量和计数。',
      userImpact: '影响发布今日小事最多可上传多少张图。',
    },
    {
      backendEvidence: '后端接受移动端传入 radiusKm，并在附近伙伴、附近小事、地图 POI 请求中按半径计算。',
      backendEnforced: true,
      group: '发现/地图',
      key: 'social.discoverRadiusKm',
      label: '附近默认半径',
      mobileApplied: true,
      mobileEvidence: '发现和地图请求使用 configuredDiscoverRadiusKm 作为 radiusKm，页面也展示 km 标签。',
      userImpact: '影响附近伙伴、小事和地图地点的默认搜索半径。',
    },
    {
      backendEvidence: 'listNearbyMomentEntries 使用 effectiveNearbyMomentTtlMs() 过滤附近小事。',
      backendEnforced: true,
      group: '宠友圈',
      key: 'social.nearbyMomentTtlDays',
      label: '附近小事有效天数',
      mobileApplied: true,
      mobileEvidence: '发现页文案和客户端兜底过滤使用 remoteConfig.social.nearbyMomentTtlDays。',
      userImpact: '影响附近宠友圈保留多少天内的小事。',
    },
    {
      backendEvidence: '上传、生成、重试 AI 形象接口均调用 failIfFeatureDisabled(aiAvatar)。',
      backendEnforced: true,
      group: '功能开关',
      key: 'features.aiAvatar',
      label: 'AI 灵伴形象开关',
      mobileApplied: true,
      mobileEvidence: '移动端隐藏/拦截上传、生成、结果重试等入口，关闭时跳回首页。',
      userImpact: '可临时关闭 AI 灵伴形象生成链路。',
    },
    {
      backendEvidence: 'AI 对话列表、反馈、发送消息接口均调用 failIfFeatureDisabled(petChat)。',
      backendEnforced: true,
      group: '功能开关',
      key: 'features.petChat',
      label: 'AI 宠物对话开关',
      mobileApplied: true,
      mobileEvidence: '移动端隐藏/拦截 AI 对话入口和消息预加载，关闭时跳回首页。',
      userImpact: '可临时关闭 AI 宠物对话链路。',
    },
    {
      backendEvidence: '宠友圈列表、发布、评论、点赞、举报、封面接口均调用 failIfFeatureDisabled(petCircle)。',
      backendEnforced: true,
      group: '功能开关',
      key: 'features.petCircle',
      label: '宠友圈开关',
      mobileApplied: true,
      mobileEvidence: '移动端隐藏宠友圈 tab、发布入口、我的小事入口，并拦截相关跳转。',
      userImpact: '可临时关闭宠友圈浏览和互动。',
    },
    {
      backendEvidence: '地点附近、搜索、详情、收藏、点评、提交接口均调用 failIfFeatureDisabled(places)。',
      backendEnforced: true,
      group: '功能开关',
      key: 'features.places',
      label: '地图地点开关',
      mobileApplied: true,
      mobileEvidence: '移动端隐藏/拦截地图、地点详情、点评和新增地点入口。',
      userImpact: '可临时关闭地图地点相关能力。',
    },
    {
      backendEvidence: '约遛创建接口调用 failIfFeatureDisabled(walkInvite)。',
      backendEnforced: true,
      group: '功能开关',
      key: 'features.walkInvite',
      label: '约遛邀请开关',
      mobileApplied: true,
      mobileEvidence: '移动端拦截约遛邀请入口和创建动作。',
      userImpact: '可临时关闭用户之间的约遛邀请。',
    },
    {
      backendEvidence: 'failIfMaintenance 会拦截非白名单写操作，并返回 APP_MAINTENANCE。',
      backendEnforced: true,
      group: 'App 策略',
      key: 'app.maintenanceEnabled',
      label: '维护模式',
      mobileApplied: true,
      mobileEvidence: '移动端展示维护页、隐藏底部导航，并阻断主要业务页面。',
      userImpact: '用于系统维护或严重故障时临时收口 App。',
    },
    {
      backendEvidence: 'APP_MAINTENANCE 响应使用 currentOpsConfig().app.maintenanceMessage。',
      backendEnforced: true,
      group: 'App 策略',
      key: 'app.maintenanceMessage',
      label: '维护提示文案',
      mobileApplied: true,
      mobileEvidence: '维护页直接展示 remoteConfig.app.maintenanceMessage。',
      userImpact: '决定维护页和后端错误提示的用户可见文案。',
    },
    {
      backendEvidence: '/app/config 返回公告安全字段，不做写操作拦截。',
      backendEnforced: false,
      group: 'App 触达',
      key: 'app.announcement.enabled',
      label: 'App 公告',
      mobileApplied: true,
      mobileEvidence: '移动端登录后按手机号和公告版本展示一次，并支持跳转指定页面。',
      userImpact: '用于功能上线、活动或重要提醒。',
    },
    {
      backendEvidence: '/app/config 返回更新策略，不强制后端接口。',
      backendEnforced: false,
      group: 'App 策略',
      key: 'app.update.enabled',
      label: '版本更新提示',
      mobileApplied: true,
      mobileEvidence: '移动端按版本号、force 和 rolloutPercent 展示强制/可选更新弹窗。',
      userImpact: '用于引导或强制用户升级 APK。',
    },
    {
      backendEvidence: '/app/config 返回启动提示，不强制后端接口。',
      backendEnforced: false,
      group: 'App 触达',
      key: 'app.splash.enabled',
      label: '启动提示',
      mobileApplied: true,
      mobileEvidence: '移动端登录后按手机号和提示版本展示一次，优先级低于版本更新。',
      userImpact: '用于启动时运营提示或重要说明。',
    },
    {
      backendEvidence: 'deliverManagedSystemNotification 读取 notifications.rateLimitEnabled / maxCampaignsPerDay / maxPerUserPerDay，超限批次会失败，超限用户会跳过。',
      backendEnforced: true,
      group: '通知运营',
      key: 'notifications.rateLimitEnabled',
      label: '系统通知频控',
      mobileApplied: true,
      mobileEvidence: '移动端通知中心不读取阈值，但最终只会收到后端频控允许入站的系统通知。',
      userImpact: '限制运营系统通知对用户的打扰，避免同一天重复触达或误发刷屏。',
    },
    {
      backendEvidence: '/analytics/events 会读取 currentOpsConfig().analytics.enabled，关闭后只返回 accepted=false，不落库。',
      backendEnforced: true,
      group: '数据埋点',
      key: 'analytics.enabled',
      label: '移动端事件采集',
      mobileApplied: true,
      mobileEvidence: '移动端读取 remoteConfig.analytics.enabled，关闭时不再上报页面、发现、地图、地点和通知事件。',
      userImpact: '影响运营后台是否能看到 App 行为数据和真实看板口径。',
    },
    {
      backendEvidence: '/app/config 下发 sampleRatePercent；后端仍会按服务端配置兜底拒收关闭状态。',
      backendEnforced: true,
      group: '数据埋点',
      key: 'analytics.sampleRatePercent',
      label: '埋点采样率',
      mobileApplied: true,
      mobileEvidence: '移动端按手机号/事件名稳定采样，降低请求量；后台配置保存后下次读取生效。',
      userImpact: '影响进入运营看板的移动端事件样本规模。',
    },
    {
      backendEvidence: 'pruneAppEvents 使用 currentOpsConfig().analytics.retentionDays 清理旧事件，并限制 JSON state 体积。',
      backendEnforced: true,
      group: '数据埋点',
      key: 'analytics.retentionDays',
      label: '埋点保留天数',
      mobileApplied: false,
      mobileEvidence: '移动端不需要知道保留天数；这是后台数据治理规则。',
      operatorNote: '测试后端仍是 JSON state，保留期不建议过长；生产期应迁移到事件表或数据仓库。',
      userImpact: '影响后台可回看多少天的 App 行为事件。',
    },
    {
      backendEvidence: 'socialChatContentViolation 实时读取 moderation 配置，命中后阻断或送审小事、评论、地点内容。',
      backendEnforced: true,
      group: '内容安全',
      key: 'moderation.enabled',
      label: '内容安全总开关',
      mobileApplied: false,
      mobileEvidence: '移动端当前不主动消费该开关；由后端返回具体拦截或送审结果。',
      operatorNote: '后续可在移动端发布页展示“内容规则已开启”的轻提示。',
      userImpact: '影响公开内容提交是否进入规则审核。',
    },
    {
      backendEvidence: '关键词规则由后端执行；blockKeywords 不进入 /app/config，避免暴露规则。',
      backendEnforced: true,
      group: '内容安全',
      key: 'moderation.textRulesEnabled',
      label: '文本关键词规则',
      mobileApplied: false,
      mobileEvidence: '移动端当前不主动消费关键词规则，只展示后端返回的错误/送审结果。',
      operatorNote: '关键词不应下发到移动端；只可下发安全提示文案。',
      userImpact: '控制文本内容是否被关键词规则拦截或送审。',
    },
    {
      backendEvidence: 'evaluateContentTextModeration 调用腾讯云 TextModeration；Pass 放行，Review 进入人工池，Block 直接拒绝公开提交。',
      backendEnforced: true,
      group: '内容安全',
      key: 'moderation.machineTextEnabled',
      label: '腾讯云文本机审',
      mobileApplied: false,
      mobileEvidence: '移动端不消费 Biztype 和规则，只展示后端返回的拦截/送审文案。',
      operatorNote: '需要服务器环境变量 TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY；Biztype 默认按生产细分策略选择。',
      userImpact: '影响宠友圈小事、评论、地点点评和新增地点文本是否由腾讯云机审。',
    },
    {
      backendEvidence: '上传素材、宠物头像、宠友圈封面会调用腾讯云 ImageModeration；Pass 放行，Review 暂不公开，Block 拒绝或隐藏。',
      backendEnforced: true,
      group: '内容安全',
      key: 'moderation.machineImageEnabled',
      label: '腾讯云图片机审',
      mobileApplied: false,
      mobileEvidence: '移动端不消费图片策略，只按后端返回结果继续上传、提示等待审核或提示换图。',
      operatorNote: '需要服务器环境变量 TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY；Biztype 默认按图片业务场景选择。',
      userImpact: '影响宠物头像、灵伴原图、宠友圈图片、封面和工单附件是否由腾讯云机审。',
    },
    {
      backendEvidence: 'maybeRecordModerationQualitySample 按 sampleReviewRatePercent 稳定抽样已通过的公开内容，进入内容安全样本复盘；不改变用户侧发布结果。',
      backendEnforced: true,
      group: '内容安全',
      key: 'moderation.sampleReviewRatePercent',
      label: '内容安全抽样复审率',
      mobileApplied: false,
      mobileEvidence: '移动端不读取抽样率；这是后台质检和误杀/漏杀复盘配置。',
      operatorNote: '建议生产初期从 1%-5% 起步；抽样样本只用于后台复审，不直接隐藏内容。',
      userImpact: '不直接影响用户体验，但影响运营是否能发现模型漏杀或规则过严。',
    },
    {
      backendEvidence: 'supportTicketSlaHours 读取 currentOpsConfig().support.slaHours.urgent，影响工单排序、SLA badge、工作台统计和导出。',
      backendEnforced: true,
      group: '客服工单',
      key: 'support.slaHours.urgent',
      label: '紧急工单 SLA',
      mobileApplied: true,
      mobileEvidence: '移动端我的反馈读取工单返回的 slaHours，未结束工单展示预计响应时间。',
      userImpact: '影响安全投诉、紧急反馈在后台和用户侧的预计响应口径。',
    },
    {
      backendEvidence: 'supportTicketSlaHours 读取 currentOpsConfig().support.slaHours.high，影响工单排序、SLA badge、工作台统计和导出。',
      backendEnforced: true,
      group: '客服工单',
      key: 'support.slaHours.high',
      label: '高优先级工单 SLA',
      mobileApplied: true,
      mobileEvidence: '移动端我的反馈读取工单返回的 slaHours，未结束工单展示预计响应时间。',
      userImpact: '影响 Bug 等高优先级反馈的处理时限。',
    },
    {
      backendEvidence: 'supportTicketSlaHours 读取 currentOpsConfig().support.slaHours.normal，影响工单排序、SLA badge、工作台统计和导出。',
      backendEnforced: true,
      group: '客服工单',
      key: 'support.slaHours.normal',
      label: '普通工单 SLA',
      mobileApplied: true,
      mobileEvidence: '移动端我的反馈读取工单返回的 slaHours，未结束工单展示预计响应时间。',
      userImpact: '影响普通反馈默认处理时限。',
    },
    {
      backendEvidence: 'supportTicketSlaHours 读取 currentOpsConfig().support.slaHours.low，影响工单排序、SLA badge、工作台统计和导出。',
      backendEnforced: true,
      group: '客服工单',
      key: 'support.slaHours.low',
      label: '低优先级工单 SLA',
      mobileApplied: true,
      mobileEvidence: '移动端我的反馈读取工单返回的 slaHours，未结束工单展示预计响应时间。',
      userImpact: '影响产品建议等低优先级反馈的处理时限。',
    },
    {
      backendEvidence: '配置结构预留，可用于后续活动页、AB 实验或人群包。',
      backendEnforced: false,
      group: '预留',
      key: 'experiments',
      label: '实验和灰度人群包',
      mobileApplied: false,
      mobileEvidence: '移动端尚无实验分流框架。',
      operatorNote: '需要先确认实验粒度、用户分桶、指标回收和回滚策略。',
      reserved: true,
      userImpact: '后续用于精细化灰度和 A/B 测试。',
    },
  ];

  return specs.map((item) => {
    const status = adminConfigLinkageStatus(item);
    return {
      ...item,
      currentValue: item.reserved ? '未配置' : configLinkageValue(config, item.key),
      status,
      statusLabel: adminConfigLinkageStatusLabel(status),
    };
  });
}

function adminConfigLinkageSummary(items) {
  return {
    backendOnly: items.filter((item) => item.status === 'backend_only').length,
    backendEnforced: items.filter((item) => item.backendEnforced).length,
    linked: items.filter((item) => item.status === 'linked').length,
    mobileApplied: items.filter((item) => item.mobileApplied).length,
    mobileOnly: items.filter((item) => item.status === 'mobile_only').length,
    reserved: items.filter((item) => item.status === 'reserved').length,
    total: items.length,
  };
}

function adminOpsConfigResponse() {
  const config = currentOpsConfig();
  const linkageItems = adminConfigLinkageItems(config);
  const drafts = adminOpsConfigDrafts();
  const activeDrafts = drafts.filter((draft) => draft.status === 'draft');
  return {
    ...config,
    contentSafety: adminContentSafetyStatus(config),
    drafts,
    governance: {
      activeDrafts: activeDrafts.length,
      highRiskDrafts: activeDrafts.filter((draft) => (draft.riskChanges || []).some((risk) => risk.severity === 'P0')).length,
      latestDraftAt: drafts[0]?.updatedAt || '',
    },
    linkage: {
      items: linkageItems,
      summary: adminConfigLinkageSummary(linkageItems),
    },
    revisions: adminOpsConfigRevisions(),
  };
}

const ADMIN_EXPORT_ROW_LIMIT = 1000;
const ADMIN_EXPORT_REASON_MIN_LENGTH = 4;
const ADMIN_ANALYTICS_DEFAULT_DAYS = 14;
const ADMIN_ANALYTICS_MAX_DAYS = 90;

function exportDateText(value) {
  if (!value) return '';
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toISOString();
}

function exportBoolText(value) {
  if (value === true) return '是';
  if (value === false) return '否';
  return '';
}

function exportJoin(value, separator = ' | ') {
  if (!Array.isArray(value)) return '';
  return value.map((item) => String(item || '').trim()).filter(Boolean).join(separator);
}

function exportColumn(key, label, value) {
  return { key, label, value };
}

function adminExportWatermarkColumns(watermark = {}) {
  return [
    exportColumn('__exportWatermarkId', '导出水印ID', () => watermark.id || ''),
    exportColumn('__exportedAt', '导出时间', () => watermark.exportedAt || ''),
    exportColumn('__exportedBy', '导出管理员', () => watermark.adminName || ''),
    exportColumn('__exportReason', '导出原因', () => watermark.reason || ''),
    exportColumn('__exportFilter', '导出筛选', () => watermark.filterSummary || ''),
  ];
}

function exportCellValue(row, column) {
  const raw = typeof column.value === 'function' ? column.value(row) : row?.[column.key];
  if (raw === null || raw === undefined) return '';
  if (Array.isArray(raw)) return exportJoin(raw);
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvFromRows(rows, columns) {
  const header = columns.map((column) => escapeCsvCell(column.label));
  const lines = rows.map((row) => columns.map((column) => escapeCsvCell(exportCellValue(row, column))).join(','));
  return `\ufeff${[header.join(','), ...lines].join('\r\n')}\r\n`;
}

function adminExportTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

function adminExportFiltersFromUrl(url) {
  return normalizeAdminExportFilters({
    from: url.searchParams.get('from'),
    phone: url.searchParams.get('phone'),
    q: url.searchParams.get('q'),
    status: url.searchParams.get('status'),
    to: url.searchParams.get('to'),
  });
}

function normalizeAdminExportFilters(options = {}) {
  return {
    from: String(options.from || '').trim(),
    phone: String(options.phone || '').trim(),
    q: String(options.q || '').trim(),
    status: String(options.status || 'all').trim() || 'all',
    to: String(options.to || '').trim(),
  };
}

function adminExportFilterSummary(filters = {}) {
  const parts = [];
  if (filters.status && filters.status !== 'all') parts.push(`状态=${filters.status}`);
  if (filters.phone) parts.push(`手机号=${filters.phone}`);
  if (filters.from) parts.push(`开始=${filters.from}`);
  if (filters.to) parts.push(`结束=${filters.to}`);
  if (filters.q) parts.push(`关键词=${filters.q}`);
  return parts.join('；') || '全部数据';
}

function normalizeAdminExportReason(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function adminExportReasonFromUrl(url) {
  return normalizeAdminExportReason(url.searchParams.get('reason'));
}

function createAdminExportWatermark(admin, result, reason) {
  const exportedAt = new Date().toISOString();
  return {
    adminName: admin?.username || ADMIN_USERNAME,
    datasetLabel: result.label,
    datasetType: result.type,
    exportedAt,
    filterSummary: result.filterSummary,
    id: `export-${adminExportTimestamp()}-${crypto.randomBytes(3).toString('hex')}`,
    reason,
  };
}

function adminExportJson(value) {
  try {
    return JSON.stringify(value || {});
  } catch {
    return '';
  }
}

function adminExportDateMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{10,13}$/u.test(text)) {
    const numeric = Number(text);
    if (Number.isFinite(numeric)) return text.length <= 10 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function adminExportRowDateMs(row) {
  const keys = [
    'createdAt',
    'updatedAt',
    'occurredAt',
    'reviewedAt',
    'submittedAt',
    'lastSeenAt',
    'latestActivityAt',
    'date',
    'expiresAt',
    'revokedAt',
  ];
  for (const key of keys) {
    const value = row?.[key];
    if (!value) continue;
    const parsed = adminExportDateMs(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function adminExportRowStatusCandidates(row) {
  const keys = [
    'status',
    'statusLabel',
    'quality',
    'qualityLabel',
    'providerStatus',
    'jobStatus',
    'slaState',
    'type',
    'typeLabel',
    'visibility',
  ];
  return keys.map((key) => row?.[key]).filter((value) => value !== null && value !== undefined && String(value).trim());
}

function adminExportRowPhoneHaystack(row) {
  const values = [];
  const visit = (value, key = '') => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value).forEach(([childKey, childValue]) => visit(childValue, childKey));
      return;
    }
    if (String(key || '').toLowerCase().includes('phone')) values.push(String(value));
  };
  visit(row);
  return values.join(' ').toLowerCase();
}

function filterAdminExportRows(rows, rawFilters = {}) {
  const filters = normalizeAdminExportFilters(rawFilters);
  const status = String(filters.status || 'all').toLowerCase();
  const phone = String(filters.phone || '').toLowerCase();
  const q = String(filters.q || '').toLowerCase();
  const fromMs = auditDateStartMs(filters.from);
  const toMs = auditDateEndMs(filters.to);
  return rows.filter((row) => {
    if (status !== 'all') {
      const matchesStatus = adminExportRowStatusCandidates(row)
        .some((value) => String(value || '').toLowerCase() === status);
      if (!matchesStatus) return false;
    }
    if (phone && !adminExportRowPhoneHaystack(row).includes(phone)) return false;
    const rowDateMs = adminExportRowDateMs(row);
    if (fromMs !== null && (!Number.isFinite(rowDateMs) || rowDateMs < fromMs)) return false;
    if (toMs !== null && (!Number.isFinite(rowDateMs) || rowDateMs > toMs)) return false;
    if (q && !adminExportJson(row).toLowerCase().includes(q)) return false;
    return true;
  });
}

function adminExportDataset(type) {
  const users = () => Object.values(state.users || {}).map(adminUserSummary)
    .sort((a, b) => Number(b.lastSeenAt || b.createdAt || 0) - Number(a.lastSeenAt || a.createdAt || 0));
  const specs = {
    users: {
      description: '账号、宠物数量、附近可见、处罚和内容计数，用于用户排查和运营盘点。',
      label: '用户账号',
      rows: users,
      columns: [
        exportColumn('phone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('status', '账号状态'),
        exportColumn('petCount', '宠物数'),
        exportColumn('activePet', '当前宠物', (row) => row.activePet?.name || ''),
        exportColumn('nearbyVisible', '附近可见', (row) => exportBoolText(row.settings?.nearbyVisible)),
        exportColumn('socialPostCount', '小事数'),
        exportColumn('reportsAgainstCount', '被举报数'),
        exportColumn('activeSanctions', '生效处罚数', (row) => row.sanctions?.activeCount || 0),
        exportColumn('adminRiskTags', '运营风险标签', (row) => exportJoin(row.adminRiskTagLabels || row.adminRiskTags || [])),
        exportColumn('adminNoteCount', '运营备注数'),
        exportColumn('adminLatestNote', '最近运营备注'),
        exportColumn('createdAt', '注册时间', (row) => exportDateText(row.createdAt)),
        exportColumn('lastSeenAt', '最近活跃', (row) => exportDateText(row.lastSeenAt)),
      ],
    },
    pets: {
      description: '宠物档案、生日完整度、头像/AI 形象和关联内容计数，用于全局宠物排查。',
      label: '宠物档案',
      rows: () => adminPetProfiles({ limit: ADMIN_EXPORT_ROW_LIMIT }).items,
      columns: [
        exportColumn('id', '宠物ID'),
        exportColumn('name', '宠物名'),
        exportColumn('speciesLabel', '物种'),
        exportColumn('breed', '品种'),
        exportColumn('genderLabel', '性别'),
        exportColumn('birthday', '生日'),
        exportColumn('birthdayCompletenessLabel', '生日完整度'),
        exportColumn('weightKg', '体重kg'),
        exportColumn('phone', '主人手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('isActivePet', '当前默认宠物', (row) => exportBoolText(row.isActivePet)),
        exportColumn('avatarStatusLabel', '头像状态'),
        exportColumn('latestAvatarJobStatus', '最近AI任务状态'),
        exportColumn('hasPetCircleCover', '宠友圈封面', (row) => exportBoolText(row.hasPetCircleCover)),
        exportColumn('calendarCount', '日历记录数'),
        exportColumn('socialPostCount', '小事数'),
        exportColumn('createdAt', '建档时间', (row) => exportDateText(row.createdAt)),
        exportColumn('latestActivityAt', '最近关联时间', (row) => exportDateText(row.latestActivityAt)),
      ],
    },
    pet_calendar: {
      description: '宠物日历体重、疫苗/驱虫、备忘及来源，用于客服排查移动端日历记录。',
      label: '宠物日历',
      rows: () => adminPetCalendarRecords({ limit: ADMIN_EXPORT_ROW_LIMIT }).records,
      columns: [
        exportColumn('id', '记录ID'),
        exportColumn('typeLabel', '类型'),
        exportColumn('statusLabel', '状态'),
        exportColumn('date', '日期'),
        exportColumn('phone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('petName', '宠物名'),
        exportColumn('petSpecies', '物种'),
        exportColumn('petBreed', '品种'),
        exportColumn('title', '标题'),
        exportColumn('detail', '内容'),
        exportColumn('sourceLabel', '来源'),
        exportColumn('reminderEnabled', '提醒开启', (row) => exportBoolText(row.reminderEnabled)),
        exportColumn('updatedAt', '更新时间', (row) => exportDateText(row.updatedAt)),
      ],
    },
    social_relations: {
      description: '招呼、约遛、会话摘要和关系状态，用于排查互动链路和“不能回复”问题。',
      label: '关系消息',
      rows: () => adminSocialRelations({ limit: ADMIN_EXPORT_ROW_LIMIT }).items,
      columns: [
        exportColumn('id', '记录ID'),
        exportColumn('typeLabel', '类型'),
        exportColumn('statusLabel', '状态'),
        exportColumn('fromPhone', '发起人手机号'),
        exportColumn('fromName', '发起人昵称'),
        exportColumn('fromPetName', '发起宠物'),
        exportColumn('targetPhone', '接收人手机号'),
        exportColumn('targetName', '接收人昵称'),
        exportColumn('targetPetName', '接收宠物'),
        exportColumn('sourceLabel', '来源'),
        exportColumn('summary', '摘要'),
        exportColumn('notificationCount', '相关通知数'),
        exportColumn('messageCount', '消息数'),
        exportColumn('blocked', '存在拉黑', (row) => exportBoolText(row.blocked)),
        exportColumn('createdAt', '创建时间', (row) => exportDateText(row.createdAt)),
        exportColumn('updatedAt', '更新时间', (row) => exportDateText(row.updatedAt)),
      ],
    },
    avatar_jobs: {
      description: 'AI 灵伴生成任务状态、供应商、进度和错误信息，用于排查卡住或失败任务。',
      label: 'AI 灵伴任务',
      rows: adminAvatarJobs,
      columns: [
        exportColumn('id', '任务ID'),
        exportColumn('status', '状态'),
        exportColumn('provider', '供应商'),
        exportColumn('providerStatus', '供应商状态'),
        exportColumn('progress', '进度'),
        exportColumn('ownerPhone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('petName', '宠物名'),
        exportColumn('errorCode', '错误码'),
        exportColumn('errorMessage', '错误信息'),
        exportColumn('createdAt', '创建时间', (row) => exportDateText(row.createdAt)),
        exportColumn('updatedAt', '更新时间', (row) => exportDateText(row.updatedAt)),
      ],
    },
    ai_media: {
      description: '宠物原图上传质量、来源和关联 AI 任务，用于排查生成前素材问题。',
      label: 'AI 上传素材',
      rows: () => adminAiMedia({ limit: ADMIN_EXPORT_ROW_LIMIT }).items,
      columns: [
        exportColumn('mediaId', '媒体ID'),
        exportColumn('quality', '质量状态'),
        exportColumn('qualityLabel', '质量标签'),
        exportColumn('qualityScore', '质量分'),
        exportColumn('analysisCode', '分析码'),
        exportColumn('analysisTitle', '分析标题'),
        exportColumn('ownerPhone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('petName', '宠物名'),
        exportColumn('source', '来源'),
        exportColumn('mimeType', '文件类型'),
        exportColumn('sizeKb', '大小KB'),
        exportColumn('avatarJobCount', '关联任务数'),
        exportColumn('latestAvatarJobStatus', '最近任务状态'),
        exportColumn('createdAt', '上传时间', (row) => exportDateText(row.createdAt)),
      ],
    },
    avatar_feedback: {
      description: '用户对 AI 灵伴结果的不满意原因、内容和处理状态，用于提示词与供应商质量复盘。',
      label: 'AI 生成反馈',
      rows: () => adminAvatarFeedback({ limit: ADMIN_EXPORT_ROW_LIMIT }).items,
      columns: [
        exportColumn('jobId', '任务ID'),
        exportColumn('status', '处理状态'),
        exportColumn('statusLabel', '处理状态标签'),
        exportColumn('reason', '反馈原因'),
        exportColumn('reasonLabel', '反馈原因标签'),
        exportColumn('content', '反馈内容'),
        exportColumn('ownerPhone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('petName', '宠物名'),
        exportColumn('provider', '供应商'),
        exportColumn('jobStatus', '任务状态'),
        exportColumn('mediaId', '媒体ID'),
        exportColumn('reviewedBy', '处理人'),
        exportColumn('reviewedAt', '处理时间', (row) => exportDateText(row.reviewedAt)),
        exportColumn('createdAt', '反馈时间', (row) => exportDateText(row.createdAt)),
      ],
    },
    ai_provider_usage: {
      description: 'AI 供应商请求、成功失败、成本、额度和任务健康，用于成本复盘和供应商监控。',
      label: 'AI 供应商用量',
      rows: () => adminAiUsage().providers,
      columns: [
        exportColumn('provider', '供应商'),
        exportColumn('label', '名称'),
        exportColumn('roleLabel', '当前角色'),
        exportColumn('requests', '请求数'),
        exportColumn('succeeded', '成功数'),
        exportColumn('failed', '失败数'),
        exportColumn('quota', '消耗额度'),
        exportColumn('cost', '成本USD'),
        exportColumn('creditsCost', 'Credits'),
        exportColumn('jobCount', '任务数'),
        exportColumn('ready', 'Ready任务'),
        exportColumn('processing', '处理中'),
        exportColumn('stuck', '卡住'),
        exportColumn('successRate', '成功率'),
        exportColumn('averageSeconds', '平均耗时秒'),
        exportColumn('latestJobAt', '最近任务时间', (row) => exportDateText(row.latestJobAt)),
        exportColumn('topErrorCode', 'Top错误码'),
      ],
    },
    config_linkage: {
      description: '配置项、当前值、后端强制点、移动端消费点和预留状态，用于验收配置中心是否真正联动 App。',
      label: '配置联动体检',
      rows: () => adminConfigLinkageItems(currentOpsConfig()),
      columns: [
        exportColumn('group', '分组'),
        exportColumn('key', '配置键'),
        exportColumn('label', '配置项'),
        exportColumn('currentValue', '当前值'),
        exportColumn('statusLabel', '联动状态'),
        exportColumn('backendEnforced', '后端强制', (row) => exportBoolText(row.backendEnforced)),
        exportColumn('mobileApplied', '移动端消费', (row) => exportBoolText(row.mobileApplied)),
        exportColumn('backendEvidence', '后端证据'),
        exportColumn('mobileEvidence', '移动端证据'),
        exportColumn('userImpact', '用户影响'),
        exportColumn('operatorNote', '运营备注'),
      ],
    },
    moderation_tasks: {
      description: '统一内容安全任务池，覆盖举报、被举报内容、地点点评和新增地点。',
      label: '内容安全任务',
      rows: () => adminModerationTasks({ limit: ADMIN_EXPORT_ROW_LIMIT, status: 'all' }).tasks,
      columns: [
        exportColumn('id', '任务ID'),
        exportColumn('kindLabel', '类型'),
        exportColumn('status', '状态'),
        exportColumn('priority', '优先级'),
        exportColumn('riskScore', '风险分'),
        exportColumn('riskTypes', '风险标签', (row) => exportJoin(row.riskTypes)),
        exportColumn('assignee', '负责人'),
        exportColumn('slaStatus', 'SLA状态', (row) => row.sla?.status || ''),
        exportColumn('ownerPhone', '作者手机号'),
        exportColumn('ownerName', '作者昵称'),
        exportColumn('targetType', '对象类型'),
        exportColumn('targetId', '对象ID'),
        exportColumn('title', '标题'),
        exportColumn('contentText', '内容摘要'),
        exportColumn('createdAt', '创建时间', (row) => exportDateText(row.createdAt)),
        exportColumn('updatedAt', '更新时间', (row) => exportDateText(row.updatedAt)),
      ],
    },
    moderation_samples: {
      description: '内容安全风险命中和抽样复审样本，覆盖机审动作、复审结论、Biztype 和 RequestId。',
      label: '内容安全样本',
      rows: () => adminModerationSamples().slice(0, ADMIN_EXPORT_ROW_LIMIT),
      columns: [
        exportColumn('id', '样本ID'),
        exportColumn('sampleKindLabel', '样本类型'),
        exportColumn('action', '机审动作'),
        exportColumn('reviewStatusLabel', '复审结论'),
        exportColumn('scope', '业务场景'),
        exportColumn('sourceLabel', '来源'),
        exportColumn('riskScore', '风险分'),
        exportColumn('riskTypes', '风险标签', (row) => exportJoin(row.riskTypes)),
        exportColumn('matchedKeywords', '命中关键词', (row) => exportJoin(row.matchedKeywords)),
        exportColumn('bizType', 'Biztype'),
        exportColumn('requestId', 'RequestId'),
        exportColumn('provider', '供应商'),
        exportColumn('providerRawSuggestion', '供应商建议'),
        exportColumn('ownerPhone', '手机号'),
        exportColumn('targetId', '对象ID'),
        exportColumn('contentText', '内容摘要'),
        exportColumn('reviewedBy', '复审人'),
        exportColumn('reviewReason', '复审说明'),
        exportColumn('createdAt', '创建时间', (row) => exportDateText(row.createdAt)),
        exportColumn('reviewedAt', '复审时间', (row) => exportDateText(row.reviewedAt)),
      ],
    },
    social_posts: {
      description: '宠友圈小事内容状态、互动和举报计数，用于内容复盘。',
      label: '宠友圈小事',
      rows: adminSocialPosts,
      columns: [
        exportColumn('id', '小事ID'),
        exportColumn('status', '状态'),
        exportColumn('visibility', '可见性'),
        exportColumn('ownerPhone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('petName', '宠物名'),
        exportColumn('content', '正文'),
        exportColumn('imageCount', '图片数', (row) => row.imageUrls?.length || 0),
        exportColumn('likeCount', '点赞数'),
        exportColumn('commentCount', '评论数'),
        exportColumn('reportCount', '举报数'),
        exportColumn('createdAt', '发布时间', (row) => exportDateText(row.createdAt)),
        exportColumn('updatedAt', '更新时间', (row) => exportDateText(row.updatedAt)),
      ],
    },
    social_comments: {
      description: '宠友圈评论状态和举报计数，用于评论审核追踪。',
      label: '宠友圈评论',
      rows: adminSocialComments,
      columns: [
        exportColumn('id', '评论ID'),
        exportColumn('status', '状态'),
        exportColumn('postId', '小事ID'),
        exportColumn('postOwnerPhone', '小事作者'),
        exportColumn('ownerPhone', '评论者手机号'),
        exportColumn('ownerName', '评论者昵称'),
        exportColumn('content', '评论内容'),
        exportColumn('reportCount', '举报数'),
        exportColumn('createdAt', '创建时间', (row) => exportDateText(row.createdAt)),
      ],
    },
    reports: {
      description: '举报记录、处理状态和站内通知回执，用于安全处理复盘。',
      label: '举报记录',
      rows: adminSocialReports,
      columns: [
        exportColumn('id', '举报ID'),
        exportColumn('status', '状态'),
        exportColumn('targetType', '对象类型'),
        exportColumn('targetId', '对象ID'),
        exportColumn('reporterPhone', '举报人手机号'),
        exportColumn('reporterName', '举报人昵称'),
        exportColumn('ownerPhone', '被举报人手机号'),
        exportColumn('ownerName', '被举报人昵称'),
        exportColumn('content', '举报原因'),
        exportColumn('evidenceSnapshotId', '证据快照ID', (row) => row.evidenceSnapshot?.snapshotId || ''),
        exportColumn('evidenceSnapshotAt', '证据快照时间', (row) => exportDateText(row.evidenceSnapshot?.snapshotAt)),
        exportColumn('evidenceTargetStatus', '快照目标状态', (row) => row.evidenceSnapshot?.targetStatus || ''),
        exportColumn('evidenceContentText', '证据内容摘要', (row) => row.evidenceSnapshot?.contentText || ''),
        exportColumn('resultNotifiedAt', '举报人通知时间', (row) => exportDateText(row.resultNotifiedAt)),
        exportColumn('ownerResultNotifiedAt', '作者通知时间', (row) => exportDateText(row.ownerResultNotifiedAt)),
        exportColumn('createdAt', '创建时间', (row) => exportDateText(row.createdAt)),
      ],
    },
    places: {
      description: '地点目录质量治理数据，覆盖质量分、重复候选、收藏、点评、来源和宠物友好状态。',
      label: '地点目录',
      rows: () => adminPlaceCatalog().places,
      columns: [
        exportColumn('id', '地点ID'),
        exportColumn('name', '地点名称'),
        exportColumn('address', '地址'),
        exportColumn('category', '分类'),
        exportColumn('source', '来源'),
        exportColumn('petFriendlyStatus', '宠物友好状态'),
        exportColumn('qualityScore', '质量分'),
        exportColumn('qualityLabel', '质量标签'),
        exportColumn('qualityReasons', '质量证据', (row) => exportJoin(row.qualityReasons || [])),
        exportColumn('duplicateCandidateCount', '重复候选数'),
        exportColumn('duplicateCandidates', '重复候选', (row) => exportJoin((row.duplicateCandidates || []).map((item) => `${item.name}:${item.score}`))),
        exportColumn('rating', '评分'),
        exportColumn('reviewCount', '点评数'),
        exportColumn('approvedReviewCount', '已审点评数'),
        exportColumn('favoriteCount', '收藏数'),
        exportColumn('contributorCount', '贡献者数'),
        exportColumn('supportedSpecies', '支持物种', (row) => exportJoin(row.supportedSpecies || [])),
        exportColumn('tags', '标签', (row) => exportJoin(row.tags || [])),
        exportColumn('latitude', '纬度'),
        exportColumn('longitude', '经度'),
      ],
    },
    place_reviews: {
      description: '地点点评审核记录，用于地点内容运营和审核追踪。',
      label: '地点点评',
      rows: adminPlaceReviews,
      columns: [
        exportColumn('id', '点评ID'),
        exportColumn('status', '状态'),
        exportColumn('placeId', '地点ID'),
        exportColumn('placeName', '地点名'),
        exportColumn('ownerPhone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('rating', '评分'),
        exportColumn('content', '点评内容'),
        exportColumn('reviewedBy', '审核人'),
        exportColumn('reviewTemplateId', '审核模板ID'),
        exportColumn('reviewTemplateLabel', '审核模板'),
        exportColumn('reviewReason', '审核原因'),
        exportColumn('createdAt', '提交时间', (row) => exportDateText(row.createdAt)),
        exportColumn('reviewedAt', '审核时间', (row) => exportDateText(row.reviewedAt)),
      ],
    },
    place_submissions: {
      description: '新增地点提交与审核记录，用于地点入库运营。',
      label: '新增地点',
      rows: adminPlaceSubmissions,
      columns: [
        exportColumn('id', '提交ID'),
        exportColumn('status', '状态'),
        exportColumn('name', '地点名'),
        exportColumn('address', '地址'),
        exportColumn('ownerPhone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('content', '补充说明'),
        exportColumn('approvedPlaceId', '通过后地点ID'),
        exportColumn('linkedExistingPlaceId', '关联已有地点ID'),
        exportColumn('contributionId', '贡献记录ID'),
        exportColumn('contributionPoints', '贡献积分'),
        exportColumn('contributionActionLabel', '贡献类型'),
        exportColumn('reviewedBy', '审核人'),
        exportColumn('reviewTemplateId', '审核模板ID'),
        exportColumn('reviewTemplateLabel', '审核模板'),
        exportColumn('reviewReason', '审核原因'),
        exportColumn('createdAt', '提交时间', (row) => exportDateText(row.createdAt)),
        exportColumn('reviewedAt', '审核时间', (row) => exportDateText(row.reviewedAt)),
      ],
    },
    place_contributions: {
      description: '地点贡献者账本，记录新增地点审核通过或关联已有地点后给提交人的运营积分与来源。',
      label: '地点贡献者',
      rows: adminPlaceContributions,
      columns: [
        exportColumn('id', '贡献记录ID'),
        exportColumn('actionLabel', '贡献类型'),
        exportColumn('points', '积分'),
        exportColumn('phone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('submissionId', '提交ID'),
        exportColumn('placeId', '地点ID'),
        exportColumn('placeName', '地点名称'),
        exportColumn('createdBy', '记录人'),
        exportColumn('reason', '原因'),
        exportColumn('createdAt', '记录时间', (row) => exportDateText(row.createdAt)),
      ],
    },
    tickets: {
      description: '用户反馈工单、负责人、SLA 和回复数，用于客服处理复盘。',
      label: '工单',
      rows: () => adminSupportTickets({ limit: ADMIN_EXPORT_ROW_LIMIT, priority: 'all', status: 'all' }).tickets,
      columns: [
        exportColumn('id', '工单ID'),
        exportColumn('status', '状态'),
        exportColumn('priority', '优先级'),
        exportColumn('slaState', 'SLA状态'),
        exportColumn('slaHours', 'SLA小时'),
        exportColumn('category', '分类'),
        exportColumn('phone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('title', '标题'),
        exportColumn('content', '内容'),
        exportColumn('assignee', '负责人'),
        exportColumn('replyCount', '回复数'),
        exportColumn('createdAt', '创建时间', (row) => exportDateText(row.createdAt)),
        exportColumn('updatedAt', '更新时间', (row) => exportDateText(row.updatedAt)),
      ],
    },
    sanctions: {
      description: '账号处罚和撤销记录，用于风控复盘。',
      label: '用户处罚',
      rows: adminSanctions,
      columns: [
        exportColumn('id', '处罚ID'),
        exportColumn('status', '状态'),
        exportColumn('typeLabel', '类型'),
        exportColumn('phone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('petName', '宠物名'),
        exportColumn('reason', '处罚原因'),
        exportColumn('durationHours', '时长小时'),
        exportColumn('createdBy', '创建人'),
        exportColumn('createdAt', '创建时间', (row) => exportDateText(row.createdAt)),
        exportColumn('expiresAt', '到期时间', (row) => exportDateText(row.expiresAt)),
        exportColumn('revokedAt', '撤销时间', (row) => exportDateText(row.revokedAt)),
        exportColumn('revokeReason', '撤销原因'),
      ],
    },
    app_events: {
      description: '移动端页面、发现、地图、地点、通知等行为事件，用于补齐运营看板口径。',
      label: '移动端事件',
      rows: () => adminAppEvents({ limit: ADMIN_EXPORT_ROW_LIMIT }).items,
      columns: [
        exportColumn('id', '事件ID'),
        exportColumn('name', '事件名'),
        exportColumn('label', '事件标签'),
        exportColumn('phone', '手机号'),
        exportColumn('ownerName', '主人昵称'),
        exportColumn('petName', '宠物名'),
        exportColumn('route', '页面'),
        exportColumn('source', '来源'),
        exportColumn('platform', '平台'),
        exportColumn('appVersion', 'App版本'),
        exportColumn('appBuild', 'Build'),
        exportColumn('deviceIdHash', '设备哈希'),
        exportColumn('propertySummary', '属性摘要'),
        exportColumn('occurredAt', '客户端时间', (row) => exportDateText(row.occurredAt)),
        exportColumn('createdAt', '服务端时间', (row) => exportDateText(row.createdAt)),
      ],
    },
    audit_logs: {
      description: '后台写操作审计摘要，不导出 before/after 完整快照。',
      label: '审计日志',
      rows: () => (state.adminAuditLogs || []).slice(0, ADMIN_EXPORT_ROW_LIMIT),
      columns: [
        exportColumn('id', '审计ID'),
        exportColumn('action', '动作'),
        exportColumn('adminName', '管理员'),
        exportColumn('role', '角色'),
        exportColumn('targetType', '对象类型'),
        exportColumn('targetId', '对象ID'),
        exportColumn('reason', '原因'),
        exportColumn('createdAt', '时间', (row) => exportDateText(row.createdAt)),
      ],
    },
  };
  return specs[type] || null;
}

function adminExportCatalog(filters = {}) {
  const normalizedFilters = normalizeAdminExportFilters(filters);
  return ['users', 'pets', 'pet_calendar', 'social_relations', 'avatar_jobs', 'ai_media', 'avatar_feedback', 'ai_provider_usage', 'config_linkage', 'moderation_tasks', 'moderation_samples', 'social_posts', 'social_comments', 'reports', 'places', 'place_reviews', 'place_submissions', 'place_contributions', 'tickets', 'sanctions', 'app_events', 'audit_logs']
    .map((type) => {
      const dataset = adminExportDataset(type);
      const rows = dataset ? dataset.rows() : [];
      const filteredRows = filterAdminExportRows(rows, normalizedFilters);
      return {
        columns: dataset.columns.map((column) => column.label),
        description: dataset.description,
        filterSummary: adminExportFilterSummary(normalizedFilters),
        governanceLabel: '需原因 · CSV水印',
        label: dataset.label,
        limit: ADMIN_EXPORT_ROW_LIMIT,
        reasonRequired: true,
        rowCount: filteredRows.length,
        totalRows: rows.length,
        type,
        watermarkEnabled: true,
      };
    });
}

function buildAdminExportCsv(type, filters = {}, options = {}) {
  const dataset = adminExportDataset(type);
  if (!dataset) return null;
  const allRows = dataset.rows();
  const normalizedFilters = normalizeAdminExportFilters(filters);
  const matchedRows = filterAdminExportRows(allRows, normalizedFilters);
  const rows = matchedRows.slice(0, ADMIN_EXPORT_ROW_LIMIT);
  const baseResult = {
    filterSummary: adminExportFilterSummary(normalizedFilters),
    filters: normalizedFilters,
    filename: `lumii-${type}-${adminExportTimestamp()}.csv`,
    label: dataset.label,
    rowCount: rows.length,
    matchedRows: matchedRows.length,
    totalRows: allRows.length,
    type,
  };
  const reason = normalizeAdminExportReason(options.reason);
  const watermark = createAdminExportWatermark(options.admin, baseResult, reason);
  const columns = [...dataset.columns, ...adminExportWatermarkColumns(watermark)];
  return {
    ...baseResult,
    columns: columns.map((column) => column.label),
    csv: csvFromRows(rows, columns),
    exportReason: reason,
    watermark,
    watermarkId: watermark.id,
  };
}

function adminExportHistory(options = {}) {
  const type = String(options.type || 'all').trim() || 'all';
  const q = String(options.q || '').trim().toLowerCase();
  const limit = Math.min(80, Math.max(10, Number(options.limit || 20) || 20));
  const logs = (state.adminAuditLogs || [])
    .filter((log) => log?.action === 'data.export.download' && log?.targetType === 'data_export')
    .map((log) => {
      const datasetType = String(log.targetId || log.after?.type || '');
      const dataset = adminExportDataset(datasetType);
      const after = log.after || {};
      const rowCount = Number(after.rowCount || 0);
      return {
        adminName: log.adminName || '',
        columnsCount: Array.isArray(after.columns) ? after.columns.length : 0,
        createdAt: log.createdAt,
        datasetLabel: dataset?.label || datasetType || '未知数据集',
        datasetType,
        exportReason: after.exportReason || '',
        filename: after.filename || '',
        filterSummary: after.filterSummary || log.reason || '全部数据',
        filters: after.filters || {},
        id: log.id,
        ip: log.ip || '',
        matchedRows: Number(after.matchedRows ?? rowCount),
        reason: log.reason || '',
        role: log.role || '',
        rowCount,
        totalRows: Number(after.totalRows || 0),
        userAgent: log.userAgent || '',
        watermarkId: after.watermarkId || after.watermark?.id || '',
      };
    })
    .filter((item) => {
      if (type !== 'all' && item.datasetType !== type) return false;
      if (!q) return true;
      return [
        item.adminName,
        item.datasetLabel,
        item.datasetType,
        item.filename,
        item.filterSummary,
        item.id,
        item.ip,
        item.reason,
        item.userAgent,
        item.watermarkId,
        item.exportReason,
        adminExportJson(item.filters),
      ].some((value) => String(value || '').toLowerCase().includes(q));
    });
  return {
    items: logs.slice(0, limit),
    summary: {
      lastExportAt: logs[0]?.createdAt || '',
      matched: logs.length,
      rowsExported: logs.reduce((sum, item) => sum + Number(item.rowCount || 0), 0),
      total: (state.adminAuditLogs || []).filter((log) => log?.action === 'data.export.download' && log?.targetType === 'data_export').length,
      uniqueDatasets: new Set(logs.map((item) => item.datasetType).filter(Boolean)).size,
    },
  };
}

function sendCsv(res, filename, csv) {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    'Content-Type': 'text/csv; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(csv);
}

function publicAppConfig() {
  const config = currentOpsConfig();
  return {
    ai: config.ai,
    analytics: {
      enabled: config.analytics?.enabled !== false,
      sampleRatePercent: Math.floor(clampNumber(config.analytics?.sampleRatePercent, 100, 0, 100)),
    },
    app: config.app,
    features: config.features,
    moderation: {
      enabled: config.moderation.enabled,
      machineImageEnabled: config.moderation.machineImageEnabled,
      machineTextEnabled: config.moderation.machineTextEnabled,
      reviewMessage: config.moderation.reviewMessage,
      textRulesEnabled: config.moderation.textRulesEnabled,
    },
    social: config.social,
    support: config.support,
    updatedAt: config.updatedAt,
  };
}

function featureEnabled(key) {
  return currentOpsConfig().features?.[key] !== false;
}

function failIfFeatureDisabled(res, key, label) {
  if (featureEnabled(key)) return false;
  fail(res, 403, `${label}暂时维护中，请稍后再试`, true, { feature: key }, 'FEATURE_DISABLED');
  return true;
}

function maintenanceMessage() {
  return currentOpsConfig().app.maintenanceMessage || '灵伴正在维护升级，请稍后再试';
}

function failIfMaintenanceWriteBlocked(req, pathname, res) {
  if (!currentOpsConfig().app.maintenanceEnabled) return false;
  if (req.method === 'GET') return false;
  if (['/analytics/events', '/auth/logout', '/auth/token/refresh', '/feedback', '/notifications/read'].includes(pathname) || pathname.startsWith('/support/tickets') || pathname.startsWith('/sanction-appeals')) return false;
  fail(res, 503, maintenanceMessage(), true, { maintenanceEnabled: true }, 'APP_MAINTENANCE');
  return true;
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
      appEvents: Array.isArray(loadedState.appEvents) ? loadedState.appEvents : [],
      supportTicketReplyTemplates: Array.isArray(loadedState.supportTicketReplyTemplates) ? loadedState.supportTicketReplyTemplates : [],
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
      opsConfigDrafts: Array.isArray(loadedState.opsConfigDrafts) ? loadedState.opsConfigDrafts : initialState.opsConfigDrafts,
      opsConfig: normalizeOpsConfig(loadedState.opsConfig || initialState.opsConfig),
      placeModerationTemplates: Array.isArray(loadedState.placeModerationTemplates) ? loadedState.placeModerationTemplates : initialState.placeModerationTemplates,
      placeContributions: Array.isArray(loadedState.placeContributions) ? loadedState.placeContributions : initialState.placeContributions,
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
      adminLoginSecurity: {
        ...initialState.adminLoginSecurity,
        ...(loadedState.adminLoginSecurity || {}),
      },
      adminAuditLogs: Array.isArray(loadedState.adminAuditLogs) ? loadedState.adminAuditLogs : initialState.adminAuditLogs,
      socialComments: Array.isArray(loadedState.socialComments) ? loadedState.socialComments : initialState.socialComments,
      socialLikes: Array.isArray(loadedState.socialLikes) ? loadedState.socialLikes : initialState.socialLikes,
      socialMoments: Array.isArray(loadedState.socialMoments) ? loadedState.socialMoments : initialState.socialMoments,
      moderationSamples: Array.isArray(loadedState.moderationSamples) ? loadedState.moderationSamples : initialState.moderationSamples,
      sanctionAppeals: Array.isArray(loadedState.sanctionAppeals) ? loadedState.sanctionAppeals : initialState.sanctionAppeals,
      supportTickets: Array.isArray(loadedState.supportTickets) ? loadedState.supportTickets : initialState.supportTickets,
      systemNotifications: Array.isArray(loadedState.systemNotifications) ? loadedState.systemNotifications : initialState.systemNotifications,
      notificationTemplates: Array.isArray(loadedState.notificationTemplates) ? loadedState.notificationTemplates : initialState.notificationTemplates,
      userSanctions: Array.isArray(loadedState.userSanctions) ? loadedState.userSanctions : initialState.userSanctions,
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

function staticContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.css') return 'text/css; charset=utf-8';
  if (extension === '.js') return 'application/javascript; charset=utf-8';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.svg') return 'image/svg+xml; charset=utf-8';
  return 'text/html; charset=utf-8';
}

function sendStaticFile(res, filePath) {
  const buffer = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=300',
    'Content-Length': buffer.length,
    'Content-Type': staticContentType(filePath),
  });
  res.end(buffer);
}

function serveAdminStatic(req, res, pathname) {
  if (req.method !== 'GET') return false;
  if (pathname === '/admin' || pathname === '/admin/') {
    sendStaticFile(res, path.join(adminStaticDir, 'index.html'));
    return true;
  }
  if (!pathname.startsWith('/admin/')) return false;
  const relative = decodeURIComponent(pathname.slice('/admin/'.length));
  if (!relative || relative.startsWith('api/') || relative.startsWith('auth/') || relative.includes('..') || path.isAbsolute(relative)) return false;
  const filePath = path.resolve(adminStaticDir, relative);
  const root = path.resolve(adminStaticDir);
  if (!filePath.startsWith(root + path.sep)) return false;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  sendStaticFile(res, filePath);
  return true;
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

function createAdminToken(username) {
  const now = Date.now();
  const payloadPart = base64UrlEncode(
    JSON.stringify({
      exp: now + ADMIN_TOKEN_TTL_MS,
      iat: now,
      jti: crypto.randomBytes(12).toString('hex'),
      role: 'admin',
      username,
      version: 1,
    }),
  );
  return `lumii-admin-v1.${payloadPart}.${authTokenSignature(payloadPart)}`;
}

function adminFromRequest(req) {
  const token = bearerTokenFromRequest(req);
  try {
    const [prefix, payloadPart, signature] = String(token || '').split('.');
    if (prefix !== 'lumii-admin-v1' || !payloadPart || !signature) return null;
    if (!safeEqualText(signature, authTokenSignature(payloadPart))) return null;
    const payload = JSON.parse(base64UrlDecode(payloadPart));
    if (payload?.version !== 1 || payload?.role !== 'admin') return null;
    if (Number(payload.exp || 0) < Date.now()) return null;
    return {
      expiresAt: Number(payload.exp || 0),
      issuedAt: Number(payload.iat || 0),
      jti: String(payload.jti || ''),
      role: 'admin',
      username: String(payload.username || ADMIN_USERNAME),
    };
  } catch (_) {
    return null;
  }
}

function requireAdmin(req, res) {
  const admin = adminFromRequest(req);
  if (!admin) {
    fail(res, 401, '请先登录运营后台', true, undefined, 'ADMIN_AUTH_REQUIRED');
    return null;
  }
  return admin;
}

function writeAdminAudit(admin, action, targetType, targetId, before, after, reason = '') {
  state.adminAuditLogs = Array.isArray(state.adminAuditLogs) ? state.adminAuditLogs : [];
  state.adminAuditLogs.unshift({
    action,
    adminName: admin?.username || 'admin',
    after,
    before,
    createdAt: new Date().toISOString(),
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ip: admin?.ip || '',
    reason: String(reason || '').slice(0, 240),
    role: admin?.role || 'admin',
    targetId: String(targetId || ''),
    targetType,
    userAgent: String(admin?.userAgent || '').slice(0, 180),
  });
  state.adminAuditLogs = state.adminAuditLogs.slice(0, 1000);
}

function ensureAdminLoginSecurity() {
  const initial = createInitialState().adminLoginSecurity;
  state.adminLoginSecurity = {
    ...initial,
    ...(state.adminLoginSecurity || {}),
  };
  state.adminLoginSecurity.failedAttempts = Math.max(0, Number(state.adminLoginSecurity.failedAttempts || 0));
  state.adminLoginSecurity.lockCount = Math.max(0, Number(state.adminLoginSecurity.lockCount || 0));
  return state.adminLoginSecurity;
}

function adminLoginLockUntilMs(security = ensureAdminLoginSecurity()) {
  const lockedUntil = Date.parse(String(security.lockedUntil || ''));
  return Number.isFinite(lockedUntil) ? lockedUntil : 0;
}

function adminLoginSecurityStatus() {
  const security = ensureAdminLoginSecurity();
  const lockedUntilMs = adminLoginLockUntilMs(security);
  const now = Date.now();
  const locked = lockedUntilMs > now;
  return {
    failedAttempts: Math.max(0, Number(security.failedAttempts || 0)),
    firstFailedAt: security.firstFailedAt || '',
    lastFailedAt: security.lastFailedAt || '',
    lastFailedIp: security.lastFailedIp || '',
    lastFailedUserAgent: security.lastFailedUserAgent || '',
    lastUsername: security.lastUsername || '',
    locked,
    lockedUntil: locked ? new Date(lockedUntilMs).toISOString() : '',
    lockCount: Math.max(0, Number(security.lockCount || 0)),
    lockMinutes: Math.ceil(ADMIN_LOGIN_LOCK_MS / 60 / 1000),
    maxAttempts: ADMIN_LOGIN_MAX_ATTEMPTS,
    remainingLockMs: locked ? Math.max(0, lockedUntilMs - now) : 0,
    remainingLockMinutes: locked ? Math.max(1, Math.ceil((lockedUntilMs - now) / 60 / 1000)) : 0,
  };
}

function recordAdminLoginFailure(admin, username, reason = 'invalid_credentials') {
  const security = ensureAdminLoginSecurity();
  const before = cloneJson(security);
  const now = new Date().toISOString();
  const attempts = Math.max(0, Number(security.failedAttempts || 0)) + 1;
  security.failedAttempts = attempts;
  security.firstFailedAt = security.firstFailedAt || now;
  security.lastFailedAt = now;
  security.lastFailedIp = admin?.ip || '';
  security.lastFailedUserAgent = admin?.userAgent || '';
  security.lastUsername = String(username || '').slice(0, 80);
  let lockedNow = false;
  if (attempts >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    security.lockedUntil = new Date(Date.now() + ADMIN_LOGIN_LOCK_MS).toISOString();
    security.lockCount = Math.max(0, Number(security.lockCount || 0)) + 1;
    lockedNow = true;
  }
  const after = cloneJson(security);
  writeAdminAudit(admin, 'admin.login.failed', 'admin_user', username || ADMIN_USERNAME, before, after, reason);
  if (lockedNow) {
    writeAdminAudit(admin, 'admin.login.locked', 'admin_user', username || ADMIN_USERNAME, before, after, `连续 ${attempts} 次失败，锁定 ${Math.ceil(ADMIN_LOGIN_LOCK_MS / 60 / 1000)} 分钟`);
  }
  return adminLoginSecurityStatus();
}

function recordAdminLoginSuccess(admin) {
  const security = ensureAdminLoginSecurity();
  const before = cloneJson(security);
  security.failedAttempts = 0;
  security.firstFailedAt = '';
  security.lastFailedAt = '';
  security.lastFailedIp = '';
  security.lastFailedUserAgent = '';
  security.lastUsername = '';
  security.lockedUntil = '';
  const after = cloneJson(security);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    writeAdminAudit(admin, 'admin.login.reset_failures', 'admin_user', admin?.username || ADMIN_USERNAME, before, after, '登录成功后清零失败计数');
  }
  return adminLoginSecurityStatus();
}

function auditDateEndMs(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/u.test(text)) {
    const parsed = Date.parse(`${text}T23:59:59.999`);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function auditDateStartMs(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/u.test(text)) {
    const parsed = Date.parse(`${text}T00:00:00.000`);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function auditSearchHaystack(log) {
  return [
    log?.action,
    log?.adminName,
    log?.id,
    log?.ip,
    log?.reason,
    log?.role,
    log?.targetId,
    log?.targetType,
    log?.userAgent,
    JSON.stringify(log?.before || {}),
    JSON.stringify(log?.after || {}),
  ].map((value) => String(value || '').toLowerCase()).join(' ');
}

function adminAuditLogs(options = {}) {
  const logs = Array.isArray(state.adminAuditLogs) ? state.adminAuditLogs : [];
  const action = String(options.action || 'all');
  const adminName = String(options.admin || 'all');
  const targetType = String(options.targetType || 'all');
  const q = String(options.q || '').trim().toLowerCase();
  const fromMs = auditDateStartMs(options.from);
  const toMs = auditDateEndMs(options.to);
  const limit = Math.min(500, Math.max(20, Number(options.limit || 300) || 300));
  const matched = logs.filter((log) => {
    if (action !== 'all' && log.action !== action) return false;
    if (adminName !== 'all' && log.adminName !== adminName) return false;
    if (targetType !== 'all' && log.targetType !== targetType) return false;
    const createdMs = Date.parse(String(log.createdAt || ''));
    if (fromMs !== null && (!Number.isFinite(createdMs) || createdMs < fromMs)) return false;
    if (toMs !== null && (!Number.isFinite(createdMs) || createdMs > toMs)) return false;
    if (q && !auditSearchHaystack(log).includes(q)) return false;
    return true;
  });
  const highRiskPattern = /(ban|clear|config|delete|export|freeze|hide|revoke|rollback|sanction|send|submission|update)/i;
  const actions = Array.from(new Set(logs.map((log) => log.action).filter(Boolean))).sort();
  const admins = Array.from(new Set(logs.map((log) => log.adminName).filter(Boolean))).sort();
  const targetTypes = Array.from(new Set(logs.map((log) => log.targetType).filter(Boolean))).sort();
  return {
    filters: { actions, admins, targetTypes },
    items: matched.slice(0, limit),
    summary: {
      highRisk: matched.filter((log) => highRiskPattern.test(String(log.action || ''))).length,
      matched: matched.length,
      missingReason: matched.filter((log) => highRiskPattern.test(String(log.action || '')) && !String(log.reason || '').trim()).length,
      total: logs.length,
    },
  };
}

const ADMIN_USER_RISK_TAGS = [
  { key: 'test_account', label: '测试账号' },
  { key: 'key_user', label: '重点用户' },
  { key: 'needs_followup', label: '需要回访' },
  { key: 'complaint', label: '投诉处理中' },
  { key: 'watch', label: '违规观察' },
  { key: 'suspected_harassment', label: '疑似骚扰' },
  { key: 'suspected_abuse', label: '疑似违规' },
  { key: 'ai_sample', label: 'AI 异常样本' },
];
const ADMIN_USER_RISK_TAG_KEY_SET = new Set(ADMIN_USER_RISK_TAGS.map((item) => item.key));
const ADMIN_USER_RISK_TAG_LABEL_TO_KEY = new Map(ADMIN_USER_RISK_TAGS.map((item) => [item.label, item.key]));

const PLACE_MODERATION_TEMPLATES = [
  {
    action: 'approve',
    id: 'place_review_approve_relevant',
    kind: 'review',
    reason: '感谢分享，点评内容完整且与地点体验相关，已通过审核。',
    title: '点评内容有效',
  },
  {
    action: 'reject',
    id: 'place_review_reject_irrelevant',
    kind: 'review',
    reason: '点评内容与该地点体验关联不足，请补充更具体的到店体验后再提交。',
    title: '内容与地点无关',
  },
  {
    action: 'reject',
    id: 'place_review_reject_unclear',
    kind: 'review',
    reason: '点评信息不够清晰，暂无法确认真实体验，请补充宠物友好设施、服务或到店细节后再提交。',
    title: '体验信息不足',
  },
  {
    action: 'reject',
    id: 'place_review_reject_unsafe',
    kind: 'review',
    reason: '点评内容包含不适合公开展示的信息，请修改后重新提交。',
    title: '内容不适合公开',
  },
  {
    action: 'approve',
    id: 'place_submission_approve_complete',
    kind: 'submission',
    reason: '感谢补充宠物友好地点，名称、地址和体验描述清晰，已通过审核。',
    title: '新增地点信息完整',
  },
  {
    action: 'reject',
    id: 'place_submission_reject_incomplete',
    kind: 'submission',
    reason: '地点名称或地址信息不够完整，暂无法确认地点，请补充准确名称和地址后再提交。',
    title: '地点信息不完整',
  },
  {
    action: 'reject',
    id: 'place_submission_reject_duplicate',
    kind: 'submission',
    reason: '该地点疑似已存在于地图中，暂不重复创建。如信息有误，可在已有地点下补充点评。',
    title: '疑似重复地点',
  },
  {
    action: 'reject',
    id: 'place_submission_reject_not_pet_friendly',
    kind: 'submission',
    reason: '暂未发现该地点具备明确宠物友好特征，建议补充宠物可进入区域、规则或现场照片后再提交。',
    title: '宠物友好信息不足',
  },
];

function adminUserRiskTagLabel(key) {
  return ADMIN_USER_RISK_TAGS.find((item) => item.key === key)?.label || key;
}

function adminRiskTagTokens(value) {
  return (Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\s,，、]+/) : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function unknownAdminRiskTags(value) {
  return adminRiskTagTokens(value).filter((token) => !ADMIN_USER_RISK_TAG_KEY_SET.has(token) && !ADMIN_USER_RISK_TAG_LABEL_TO_KEY.has(token));
}

function normalizeAdminRiskTags(value) {
  const raw = adminRiskTagTokens(value);
  const tags = [];
  for (const item of raw) {
    const key = ADMIN_USER_RISK_TAG_KEY_SET.has(item) ? item : ADMIN_USER_RISK_TAG_LABEL_TO_KEY.get(item);
    if (!key || tags.includes(key)) continue;
    tags.push(key);
    if (tags.length >= 8) break;
  }
  return tags;
}

function normalizeAdminNotes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((note) => {
      const content = String(note?.content || '').replace(/\s+/g, ' ').trim().slice(0, 500);
      if (!content) return null;
      const createdAt = String(note?.createdAt || new Date().toISOString());
      return {
        content,
        createdAt,
        createdBy: String(note?.createdBy || 'admin').slice(0, 80),
        id: String(note?.id || `user-note-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 30);
}

const SANCTION_TYPES = new Set(['warning', 'mute', 'freeze', 'ban']);
const SANCTION_TYPE_LABELS = {
  ban: '封禁',
  freeze: '冻结',
  mute: '禁言',
  warning: '警告',
};
const SANCTION_DEFAULT_DURATION_HOURS = {
  ban: 0,
  freeze: 72,
  mute: 24,
  warning: 0,
};
const SANCTION_TEMPLATES = [
  {
    description: '轻微违规或证据不足但需要留痕，通知用户注意社区规范。',
    durationHours: 0,
    id: 'warning_community_notice',
    label: '社区提醒',
    reason: '违反社区规范，先做警告留痕；如再次违规将升级限制。',
    type: 'warning',
  },
  {
    description: '举报成立后的默认处理，适合广告、骚扰、低俗评论等首次违规。',
    durationHours: 24,
    id: 'report_valid_mute_24h',
    label: '举报成立 · 禁言 24 小时',
    reason: '用户举报成立，相关内容违反社区规范，禁言 24 小时。',
    type: 'mute',
  },
  {
    description: '重复违规或较严重骚扰，临时冻结账号写操作。',
    durationHours: 72,
    id: 'repeat_violation_freeze_72h',
    label: '重复违规 · 冻结 72 小时',
    reason: '多次违规或情节较重，冻结账号 72 小时，保留申诉入口。',
    type: 'freeze',
  },
  {
    description: '严重违规、灰产、恶意攻击等高风险账号。',
    durationHours: 0,
    id: 'severe_violation_ban',
    label: '严重违规 · 长期封禁',
    reason: '存在严重违规或高风险行为，长期封禁账号。',
    type: 'ban',
  },
];
const SANCTION_APPEAL_STATUSES = new Set(['approved', 'closed', 'pending', 'rejected', 'reviewing']);

function ensureUserSanctions() {
  if (!Array.isArray(state.userSanctions)) state.userSanctions = [];
  return state.userSanctions;
}

function ensureSanctionAppeals() {
  if (!Array.isArray(state.sanctionAppeals)) state.sanctionAppeals = [];
  return state.sanctionAppeals;
}

function normalizeSanctionType(value) {
  const type = String(value || '').trim();
  return SANCTION_TYPES.has(type) ? type : '';
}

function sanctionExpiresAtMs(sanction) {
  if (!sanction?.expiresAt) return 0;
  const expiresAtMs = new Date(sanction.expiresAt).getTime();
  return Number.isFinite(expiresAtMs) ? expiresAtMs : 0;
}

function sanctionRuntimeStatus(sanction, now = Date.now()) {
  if (!sanction) return 'unknown';
  if (sanction.revokedAt) return 'revoked';
  const expiresAtMs = sanctionExpiresAtMs(sanction);
  if (expiresAtMs && expiresAtMs <= now) return 'expired';
  return 'active';
}

function userSanctionsFor(phone) {
  return ensureUserSanctions().filter((sanction) => sanction.phone === phone);
}

function activeUserSanctionsFor(phone, now = Date.now()) {
  return userSanctionsFor(phone).filter((sanction) => sanctionRuntimeStatus(sanction, now) === 'active');
}

function activeUserSanctionOfType(phone, types, now = Date.now()) {
  const typeSet = new Set(Array.isArray(types) ? types : [types]);
  return activeUserSanctionsFor(phone, now).find((sanction) => typeSet.has(sanction.type)) || null;
}

function accountStatusFor(user) {
  if (!user?.phone) return 'active';
  if (activeUserSanctionOfType(user.phone, 'ban')) return 'banned';
  if (activeUserSanctionOfType(user.phone, 'freeze')) return 'frozen';
  if (activeUserSanctionOfType(user.phone, 'mute')) return 'muted';
  return user.accountStatus && !['banned', 'frozen', 'muted'].includes(user.accountStatus) ? user.accountStatus : 'active';
}

function userSanctionSummary(phone) {
  const active = activeUserSanctionsFor(phone);
  const activeRestrictive = active.filter((sanction) => sanction.type !== 'warning');
  const latest = userSanctionsFor(phone)
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
  return {
    activeCount: active.length,
    activeRestrictiveCount: activeRestrictive.length,
    activeTypes: active.map((sanction) => sanction.type),
    latest: latest ? adminSanctionItem(latest) : null,
  };
}

function adminSanctionItem(sanction) {
  const user = state.users?.[sanction.phone];
  const pet = user ? selectedPetFor(user) : null;
  return {
    createdAt: sanction.createdAt,
    createdBy: sanction.createdBy || '',
    durationHours: Number(sanction.durationHours || 0),
    evidenceSnapshot: sanction.evidenceSnapshot || null,
    expiresAt: sanction.expiresAt || '',
    id: sanction.id,
    ownerName: user?.ownerName || `用户${String(sanction.phone || '').slice(-4)}`,
    petName: pet?.name || '',
    phone: sanction.phone,
    reason: sanction.reason || '',
    revokedAt: sanction.revokedAt || '',
    revokedBy: sanction.revokedBy || '',
    revokeReason: sanction.revokeReason || '',
    source: sanction.source || 'manual',
    sourceReportId: sanction.sourceReportId || '',
    sourceTargetId: sanction.sourceTargetId || '',
    sourceTargetType: sanction.sourceTargetType || '',
    status: sanctionRuntimeStatus(sanction),
    templateId: sanction.templateId || '',
    type: sanction.type,
    typeLabel: SANCTION_TYPE_LABELS[sanction.type] || sanction.type,
  };
}

function notifySanctionEvent(phone, sanction, title, text, idPrefix = 'update') {
  if (!phone || !state.users?.[phone]) return false;
  const suffix = sanction?.id || `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  return addNotification(phone, {
    actionRoute: 'safety',
    category: 'system',
    createdAt: new Date().toISOString(),
    id: `n-sanction-${idPrefix}-${suffix}`,
    kind: 'system',
    read: false,
    sanctionId: sanction?.id || '',
    text,
    title,
  }, 'system', { force: true });
}

function notifyExpiredSanctionsFor(user) {
  if (!user?.phone) return false;
  let changed = false;
  for (const sanction of userSanctionsFor(user.phone)) {
    if (sanctionRuntimeStatus(sanction) !== 'expired' || sanction.expiredNotifiedAt) continue;
    sanction.expiredNotifiedAt = new Date().toISOString();
    notifySanctionEvent(
      user.phone,
      sanction,
      '账号限制已到期',
      `${SANCTION_TYPE_LABELS[sanction.type] || '账号限制'}已自动到期，如页面状态未更新，可重新登录或刷新。`,
      'expired',
    );
    changed = true;
  }
  return changed;
}

function adminSanctions() {
  return ensureUserSanctions()
    .map(adminSanctionItem)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function parseSanctionDurationHours(type, value) {
  if (value === '' || value === null || value === undefined) return SANCTION_DEFAULT_DURATION_HOURS[type] || 0;
  const durationHours = Math.floor(Number(value));
  if (!Number.isFinite(durationHours) || durationHours < 0 || durationHours > 24 * 365) return null;
  return durationHours;
}

function createUserSanction(admin, phone, body = {}) {
  const user = state.users?.[phone];
  if (!user) return { error: '用户不存在', statusCode: 404 };
  const type = normalizeSanctionType(body.type);
  if (!type) return { error: '请选择正确的处罚类型', statusCode: 400 };
  const reason = String(body.reason || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!reason) return { error: '请填写处罚原因', statusCode: 400 };
  const durationHours = parseSanctionDurationHours(type, body.durationHours);
  if (durationHours === null) return { error: '处罚时长需为 0 到 8760 小时', statusCode: 400 };
  const createdAt = new Date().toISOString();
  const sanction = {
    createdAt,
    createdBy: admin?.username || 'admin',
    durationHours,
    evidenceSnapshot: normalizeSanctionEvidenceSnapshot(body.evidenceSnapshot),
    expiresAt: durationHours > 0 ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString() : '',
    id: `sanction-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    phone,
    reason,
    source: String(body.source || 'manual').slice(0, 60),
    sourceReportId: String(body.sourceReportId || '').slice(0, 120),
    sourceTargetId: String(body.sourceTargetId || '').slice(0, 120),
    sourceTargetType: String(body.sourceTargetType || '').slice(0, 60),
    templateId: String(body.templateId || '').slice(0, 120),
    type,
  };
  ensureUserSanctions().unshift(sanction);
  user.accountStatus = accountStatusFor(user);
  notifySanctionEvent(
    phone,
    sanction,
    '账号状态已更新',
    `你的账号已被${SANCTION_TYPE_LABELS[type] || '限制'}。原因：${reason}`,
    'created',
  );
  return { sanction };
}

function revokeUserSanction(admin, phone, sanctionId, reason = '', options = {}) {
  const sanction = ensureUserSanctions().find((item) => item.id === sanctionId && item.phone === phone);
  if (!sanction) return { error: '处罚记录不存在', statusCode: 404 };
  if (sanction.revokedAt) return { sanction };
  sanction.revokedAt = new Date().toISOString();
  sanction.revokedBy = admin?.username || 'admin';
  sanction.revokeReason = String(reason || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  const user = state.users?.[phone];
  if (user) user.accountStatus = accountStatusFor(user);
  if (options.notify !== false) {
    notifySanctionEvent(
      phone,
      sanction,
      '账号限制已撤销',
      `${SANCTION_TYPE_LABELS[sanction.type] || '账号限制'}已撤销。${sanction.revokeReason ? `说明：${sanction.revokeReason}` : ''}`,
      'revoked',
    );
  }
  return { sanction };
}

function sanctionAppealStatusFor(value) {
  const status = String(value || 'pending');
  return SANCTION_APPEAL_STATUSES.has(status) ? status : 'pending';
}

function findSanctionAppeal(appealId) {
  return ensureSanctionAppeals().find((item) => item.id === appealId);
}

function findUserSanction(phone, sanctionId) {
  return ensureUserSanctions().find((item) => item.phone === phone && item.id === sanctionId);
}

function adminSanctionTemplates() {
  return SANCTION_TEMPLATES.map((template) => ({
    ...template,
    typeLabel: SANCTION_TYPE_LABELS[template.type] || template.type,
  }));
}

function sanctionTemplateById(templateId) {
  return SANCTION_TEMPLATES.find((template) => template.id === templateId) || null;
}

function normalizeSanctionEvidenceSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
  return {
    contentText: String(snapshot.contentText || '').slice(0, 600),
    createdAt: snapshot.createdAt || '',
    mediaUrls: Array.isArray(snapshot.mediaUrls) ? snapshot.mediaUrls.slice(0, 6).map((url) => String(url || '').slice(0, 500)).filter(Boolean) : [],
    ownerName: String(snapshot.ownerName || '').slice(0, 80),
    ownerPhone: normalizePhone(snapshot.ownerPhone || ''),
    reportContent: String(snapshot.reportContent || '').slice(0, 240),
    reportId: String(snapshot.reportId || '').slice(0, 120),
    reporterName: String(snapshot.reporterName || '').slice(0, 80),
    reporterPhone: normalizePhone(snapshot.reporterPhone || ''),
    snapshotAt: String(snapshot.snapshotAt || '').slice(0, 40),
    snapshotId: String(snapshot.snapshotId || '').slice(0, 120),
    targetId: String(snapshot.targetId || '').slice(0, 120),
    targetLabel: String(snapshot.targetLabel || '').slice(0, 120),
    targetStatus: String(snapshot.targetStatus || '').slice(0, 60),
    targetType: String(snapshot.targetType || '').slice(0, 60),
  };
}

function appealableSanctionFor(user, sanctionId = '') {
  const explicit = sanctionId ? findUserSanction(user.phone, sanctionId) : null;
  if (explicit && sanctionRuntimeStatus(explicit) === 'active' && explicit.type !== 'warning') return explicit;
  return activeUserSanctionsFor(user.phone)
    .filter((sanction) => sanction.type !== 'warning')
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
}

function publicSanctionAppealItem(appeal) {
  const sanction = findUserSanction(appeal.phone, appeal.sanctionId);
  const status = sanctionAppealStatusFor(appeal.status);
  return {
    content: appeal.content || '',
    createdAt: appeal.createdAt,
    id: appeal.id,
    reviewReason: appeal.reviewReason || '',
    reviewedAt: appeal.reviewedAt || '',
    sanctionId: appeal.sanctionId,
    sanctionReason: appeal.sanctionReason || sanction?.reason || '',
    sanctionStatus: sanction ? sanctionRuntimeStatus(sanction) : 'unknown',
    sanctionType: appeal.sanctionType || sanction?.type || '',
    sanctionTypeLabel: SANCTION_TYPE_LABELS[appeal.sanctionType || sanction?.type] || appeal.sanctionType || sanction?.type || '账号限制',
    status,
    updatedAt: appeal.updatedAt || appeal.createdAt,
  };
}

function adminSanctionAppealItem(appeal) {
  const user = state.users?.[appeal.phone];
  const sanction = findUserSanction(appeal.phone, appeal.sanctionId);
  const pet = user ? selectedPetFor(user) : null;
  return {
    ...publicSanctionAppealItem(appeal),
    handledBy: appeal.handledBy || '',
    ownerName: user?.ownerName || appeal.ownerName || `用户${String(appeal.phone || '').slice(-4)}`,
    petName: pet?.name || '',
    phone: appeal.phone,
    revokeSanction: appeal.revokeSanction !== false,
    sanction: sanction ? adminSanctionItem(sanction) : null,
  };
}

function sanctionAppealsForUser(user) {
  const appeals = ensureSanctionAppeals()
    .filter((appeal) => appeal.phone === user.phone)
    .map(publicSanctionAppealItem)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return {
    appeals,
    summary: {
      all: appeals.length,
      open: appeals.filter((appeal) => appeal.status === 'pending' || appeal.status === 'reviewing').length,
    },
  };
}

function adminSanctionAppeals(options = {}) {
  const status = String(options.status || 'open');
  const q = String(options.q || '').trim().toLowerCase();
  const all = ensureSanctionAppeals().map(adminSanctionAppealItem);
  const appeals = all
    .filter((appeal) => {
      if (status === 'all') return true;
      if (status === 'open') return appeal.status === 'pending' || appeal.status === 'reviewing';
      return appeal.status === status;
    })
    .filter((appeal) => {
      if (!q) return true;
      return [appeal.id, appeal.phone, appeal.ownerName, appeal.petName, appeal.content, appeal.reviewReason, appeal.sanctionReason, appeal.sanctionTypeLabel]
        .some((value) => String(value || '').toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const rank = { pending: 4, reviewing: 3, approved: 2, rejected: 1, closed: 0 };
      return (rank[b.status] || 0) - (rank[a.status] || 0) || String(b.createdAt).localeCompare(String(a.createdAt));
    });
  return {
    appeals: appeals.slice(0, 300),
    summary: {
      all: all.length,
      approved: all.filter((appeal) => appeal.status === 'approved').length,
      open: all.filter((appeal) => appeal.status === 'pending' || appeal.status === 'reviewing').length,
      pending: all.filter((appeal) => appeal.status === 'pending').length,
      rejected: all.filter((appeal) => appeal.status === 'rejected').length,
      reviewing: all.filter((appeal) => appeal.status === 'reviewing').length,
    },
  };
}

function createSanctionAppeal(user, body = {}) {
  const sanction = appealableSanctionFor(user, String(body.sanctionId || '').trim());
  if (!sanction) return { error: '当前没有可申诉的生效账号限制', statusCode: 400 };
  const duplicate = ensureSanctionAppeals().find((appeal) =>
    appeal.phone === user.phone &&
    appeal.sanctionId === sanction.id &&
    (appeal.status === 'pending' || appeal.status === 'reviewing')
  );
  if (duplicate) return { appeal: duplicate, duplicate: true };
  const content = String(body.content || '').replace(/\s+/g, ' ').trim();
  if (!content) return { error: '请填写申诉说明', statusCode: 400 };
  if (content.length < 8) return { error: '申诉说明至少 8 个字', statusCode: 400 };
  if (content.length > 1000) return { error: '申诉说明最多 1000 个字', statusCode: 400 };
  const now = new Date().toISOString();
  const appeal = {
    content,
    createdAt: now,
    id: `appeal-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ownerName: user.ownerName || '',
    phone: user.phone,
    sanctionId: sanction.id,
    sanctionReason: sanction.reason || '',
    sanctionType: sanction.type,
    status: 'pending',
    updatedAt: now,
  };
  ensureSanctionAppeals().unshift(appeal);
  return { appeal };
}

function handleSanctionAppeal(admin, appeal, action, body = {}) {
  const before = JSON.parse(JSON.stringify(appeal));
  const now = new Date().toISOString();
  const reason = String(body.reason || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (action === 'review') {
    appeal.status = 'reviewing';
    appeal.handledBy = admin?.username || 'admin';
    appeal.updatedAt = now;
    writeAdminAudit(admin, 'sanction.appeal.review', 'sanction_appeal', appeal.id, before, appeal, reason || '申诉接手处理');
    return { appeal };
  }
  if ((action === 'approve' || action === 'reject') && !reason) {
    return { error: '请填写处理说明', statusCode: 400 };
  }
  if (action === 'approve') {
    const sanction = findUserSanction(appeal.phone, appeal.sanctionId);
    appeal.status = 'approved';
    appeal.reviewReason = reason;
    appeal.reviewedAt = now;
    appeal.handledBy = admin?.username || 'admin';
    appeal.revokeSanction = body.revokeSanction !== false;
    appeal.updatedAt = now;
    if (appeal.revokeSanction && sanction && sanctionRuntimeStatus(sanction) === 'active') {
      revokeUserSanction(admin, appeal.phone, appeal.sanctionId, `申诉通过：${reason}`, { notify: false });
    }
    notifySanctionEvent(
      appeal.phone,
      sanction || { id: appeal.sanctionId, type: appeal.sanctionType },
      appeal.revokeSanction ? '申诉通过，账号限制已撤销' : '申诉通过',
      reason,
      `appeal-approved-${appeal.id}`,
    );
    writeAdminAudit(admin, 'sanction.appeal.approve', 'sanction_appeal', appeal.id, before, appeal, reason);
    return { appeal };
  }
  if (action === 'reject') {
    appeal.status = 'rejected';
    appeal.reviewReason = reason;
    appeal.reviewedAt = now;
    appeal.handledBy = admin?.username || 'admin';
    appeal.updatedAt = now;
    notifySanctionEvent(
      appeal.phone,
      { id: appeal.sanctionId, type: appeal.sanctionType },
      '账号申诉已处理',
      reason,
      `appeal-rejected-${appeal.id}`,
    );
    writeAdminAudit(admin, 'sanction.appeal.reject', 'sanction_appeal', appeal.id, before, appeal, reason);
    return { appeal };
  }
  return { error: '不支持的申诉处理动作', statusCode: 400 };
}

function accountWriteRestrictionFor(user) {
  if (!user?.phone) return null;
  return activeUserSanctionOfType(user.phone, ['ban', 'freeze']);
}

function mutedRestrictionFor(user) {
  if (!user?.phone) return null;
  return activeUserSanctionOfType(user.phone, 'mute');
}

function allowRestrictedWrite(pathname) {
  return pathname === '/analytics/events' || pathname === '/auth/token/refresh' || pathname === '/feedback' || pathname === '/notifications/read' || pathname.startsWith('/support/tickets') || pathname.startsWith('/sanction-appeals');
}

function failIfAccountRestricted(user, req, pathname, res) {
  const sanction = accountWriteRestrictionFor(user);
  if (!sanction || req.method === 'GET' || allowRestrictedWrite(pathname)) return false;
  const label = SANCTION_TYPE_LABELS[sanction.type] || '限制';
  const suffix = sanction.expiresAt ? `，解除时间：${sanction.expiresAt}` : '';
  fail(res, 403, `账号已被${label}，暂时不能继续操作${suffix}。如有疑问，请通过反馈联系灵伴。`, false, { sanction: adminSanctionItem(sanction) }, 'ACCOUNT_RESTRICTED');
  return true;
}

function failIfMuted(user, res, actionLabel) {
  const sanction = mutedRestrictionFor(user);
  if (!sanction) return false;
  const suffix = sanction.expiresAt ? `，解除时间：${sanction.expiresAt}` : '';
  fail(res, 403, `账号已被禁言，暂时不能${actionLabel}${suffix}。如有疑问，请通过反馈联系灵伴。`, false, { sanction: adminSanctionItem(sanction) }, 'ACCOUNT_MUTED');
  return true;
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
  state.users[phone].adminNotes = normalizeAdminNotes(state.users[phone].adminNotes);
  state.users[phone].adminRiskTags = normalizeAdminRiskTags(state.users[phone].adminRiskTags);
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

function tencentCmsConfigured() {
  return Boolean(TENCENTCLOUD_SECRET_ID && TENCENTCLOUD_SECRET_KEY);
}

function tencentCmsIsoDate(timestampSeconds) {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

function hmacSha256(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function callTencentCloudApi({ action, endpoint, payload, region = TENCENT_CMS_REGION, service, version }) {
  if (!tencentCmsConfigured()) throw new Error('Tencent Cloud content safety credentials are not configured');
  const timestamp = Math.floor(Date.now() / 1000);
  const date = tencentCmsIsoDate(timestamp);
  const body = JSON.stringify(payload || {});
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${endpoint}\nx-tc-action:${String(action).toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    sha256Hex(body),
  ].join('\n');
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const secretDate = hmacSha256(`TC3${TENCENTCLOUD_SECRET_KEY}`, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256(secretSigning, stringToSign, 'hex');
  const authorization = `TC3-HMAC-SHA256 Credential=${TENCENTCLOUD_SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TENCENT_CMS_TIMEOUT_MS);
  try {
    const response = await fetch(`https://${endpoint}`, {
      body,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json; charset=utf-8',
        Host: endpoint,
        'X-TC-Action': action,
        'X-TC-Region': region,
        'X-TC-Timestamp': String(timestamp),
        'X-TC-Version': version,
      },
      method: 'POST',
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Tencent Cloud response is not JSON: ${text.slice(0, 120)}`);
    }
    if (!response.ok || parsed.Response?.Error) {
      const error = parsed.Response?.Error;
      throw new Error(error?.Message || `Tencent Cloud request failed: ${response.status}`);
    }
    return parsed.Response || {};
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTencentSuggestion(value) {
  const suggestion = String(value || '').trim().toLowerCase();
  if (suggestion === 'pass' || suggestion === 'allow') return 'allow';
  if (suggestion === 'review') return 'review';
  if (suggestion === 'block' || suggestion === 'forbid') return 'block';
  return 'review';
}

function tencentTextBizTypeForScope(scope) {
  return TENCENT_CMS_TEXT_BIZ_TYPES[String(scope || '')] || TENCENT_CMS_TEXT_BIZ_TYPE || '';
}

function tencentImageBizTypeForScope(scope) {
  return TENCENT_CMS_IMAGE_BIZ_TYPES[String(scope || '')] || TENCENT_CMS_IMAGE_BIZ_TYPE || '';
}

function imageModerationScopeForUploadSource(source) {
  const value = String(source || '').trim();
  if (/pet[-_]?circle|social|moment|post/i.test(value)) return 'pet_circle_photo';
  if (/place[-_]?review|place_review/i.test(value)) return 'place_review';
  if (/place[-_]?submission|place_submission|place[-_]?draft/i.test(value)) return 'place_submission';
  if (/cover/i.test(value)) return 'pet_circle_cover';
  if (/support|feedback|ticket/i.test(value)) return 'support';
  return 'pet_avatar';
}

function tencentKeywordsFromResponse(response = {}) {
  const values = [];
  const pushValue = (value) => {
    const text = String(value || '').trim();
    if (text && !values.includes(text)) values.push(text.slice(0, 40));
  };
  if (Array.isArray(response.Keywords)) response.Keywords.forEach(pushValue);
  else String(response.Keywords || '').split(/[,\s，、]+/u).forEach(pushValue);
  [response.DetailResults, response.LabelResults, response.ObjectResults, response.OcrResults, response.LibResults].forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (Array.isArray(item.Keywords)) item.Keywords.forEach(pushValue);
      else String(item.Keywords || '').split(/[,\s，、]+/u).forEach(pushValue);
    });
  });
  return values.slice(0, 8);
}

function tencentRiskTypesFromResponse(response = {}, fallback = '腾讯云内容安全') {
  const values = [];
  const pushValue = (value) => {
    const text = String(value || '').trim();
    if (text && !values.includes(text)) values.push(text.slice(0, 40));
  };
  pushValue(response.Label);
  pushValue(response.SubLabel);
  [response.DetailResults, response.LabelResults, response.ObjectResults, response.OcrResults, response.LibResults].forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      pushValue(item.Label);
      pushValue(item.SubLabel);
      pushValue(item.Name);
    });
  });
  if (!values.length) values.push(fallback);
  return values.slice(0, 6);
}

function tencentRiskScoreFromResponse(response = {}) {
  const candidates = [response.Score, response.HitFlag ? 100 : 0];
  [response.DetailResults, response.LabelResults, response.ObjectResults, response.OcrResults, response.LibResults].forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => candidates.push(item.Score));
  });
  const scores = candidates.map(Number).filter((value) => Number.isFinite(value));
  return Math.max(0, Math.min(100, scores.length ? Math.max(...scores) : 0));
}

function contentSafetyMachineError(scope, error) {
  return {
    action: 'review',
    matchedKeywords: [],
    message: currentOpsConfig().moderation?.reviewMessage || '内容已进入人工审核，通过后会展示给附近用户',
    provider: 'tencent_cloud',
    providerError: String(error?.message || error || '内容安全服务调用失败').slice(0, 240),
    riskScore: 66,
    riskTypes: ['机审调用异常'],
    scope,
    source: 'tencent_cms_error',
    sourceLabel: '机器审核异常',
  };
}

async function evaluateTencentTextModeration(label, text, options = {}) {
  const config = currentOpsConfig().moderation || {};
  if (!config.enabled || !config.machineTextEnabled) return null;
  const content = String(text || '').trim();
  if (!content) return null;
  const scope = options.scope || 'text';
  const bizType = tencentTextBizTypeForScope(scope);
  try {
    const response = await callTencentCloudApi({
      action: 'TextModeration',
      endpoint: TENCENT_CMS_TEXT_ENDPOINT,
      payload: {
        BizType: bizType || undefined,
        Content: Buffer.from(content, 'utf8').toString('base64'),
        DataId: options.targetId || `${scope}-${Date.now()}`,
        User: options.ownerPhone ? { UserId: String(options.ownerPhone) } : undefined,
      },
      service: 'tms',
      version: TENCENT_CMS_TEXT_VERSION,
    });
    const action = normalizeTencentSuggestion(response.Suggestion);
    return {
      action: action === 'review' && options.reviewAsBlock ? 'block' : action,
      bizType,
      label: response.Label || '',
      matchedKeywords: tencentKeywordsFromResponse(response),
      message: action === 'block'
        ? (config.blockMessage || `${label}包含不适合公开展示的内容，请修改后再提交`)
        : (config.reviewMessage || `${label}已进入人工审核`),
      provider: 'tencent_cloud',
      providerRawSuggestion: response.Suggestion || '',
      requestId: response.RequestId || '',
      riskScore: tencentRiskScoreFromResponse(response),
      riskTypes: tencentRiskTypesFromResponse(response, '腾讯云文本机审'),
      scope,
      source: 'tencent_cms',
      sourceLabel: '腾讯云文本机审',
    };
  } catch (error) {
    return { ...contentSafetyMachineError(scope, error), bizType };
  }
}

async function evaluateTencentImageModeration(media, options = {}) {
  const config = currentOpsConfig().moderation || {};
  if (!config.enabled || !config.machineImageEnabled) return null;
  const scope = options.scope || 'image';
  const bizType = tencentImageBizTypeForScope(scope);
  try {
    const payload = {
      BizType: bizType || undefined,
      DataId: options.targetId || media?.mediaId || `image-${Date.now()}`,
      User: media?.ownerPhone ? { UserId: String(media.ownerPhone) } : undefined,
    };
    if (options.fileUrl) payload.FileUrl = options.fileUrl;
    else if (options.fileContent) payload.FileContent = options.fileContent;
    else if (media?.dataUrl) {
      const match = String(media.dataUrl).match(/^data:[^;]+;base64,(.+)$/);
      if (match) payload.FileContent = match[1];
    }
    if (!payload.FileUrl && !payload.FileContent) return null;
    const response = await callTencentCloudApi({
      action: 'ImageModeration',
      endpoint: TENCENT_CMS_IMAGE_ENDPOINT,
      payload,
      service: 'ims',
      version: TENCENT_CMS_IMAGE_VERSION,
    });
    const action = normalizeTencentSuggestion(response.Suggestion);
    return {
      action,
      bizType,
      label: response.Label || '',
      matchedKeywords: tencentKeywordsFromResponse(response),
      message: action === 'block'
        ? (config.blockMessage || '图片包含不适合公开展示的内容，请重新上传')
        : (config.reviewMessage || '图片已进入人工审核，通过后会展示'),
      provider: 'tencent_cloud',
      providerRawSuggestion: response.Suggestion || '',
      requestId: response.RequestId || '',
      riskScore: tencentRiskScoreFromResponse(response),
      riskTypes: tencentRiskTypesFromResponse(response, '腾讯云图片机审'),
      scope,
      source: 'tencent_cms',
      sourceLabel: '腾讯云图片机审',
    };
  } catch (error) {
    return { ...contentSafetyMachineError(scope, error), bizType };
  }
}

function ensureModerationSamples() {
  if (!Array.isArray(state.moderationSamples)) state.moderationSamples = [];
  state.moderationSamples = state.moderationSamples
    .map(normalizeModerationSample)
    .filter(Boolean)
    .slice(0, 500);
  return state.moderationSamples;
}

function normalizeModerationSample(item = {}) {
  if (!item || typeof item !== 'object') return null;
  const action = ['allow', 'review', 'block'].includes(String(item.action || '')) ? String(item.action) : 'review';
  const reviewStatus = ['unreviewed', 'confirmed', 'false_positive', 'false_negative', 'ignored'].includes(String(item.reviewStatus || ''))
    ? String(item.reviewStatus)
    : 'unreviewed';
  const sampleKind = ['risk_hit', 'quality_sample'].includes(String(item.sampleKind || ''))
    ? String(item.sampleKind)
    : (action === 'allow' || item.source === 'sample_review' ? 'quality_sample' : 'risk_hit');
  return {
    action,
    bizType: String(item.bizType || ''),
    contentText: String(item.contentText || '').slice(0, 500),
    createdAt: item.createdAt || new Date().toISOString(),
    id: String(item.id || `sample-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    matchedKeywords: Array.isArray(item.matchedKeywords) ? item.matchedKeywords.slice(0, 8) : [],
    ownerPhone: item.ownerPhone || '',
    provider: item.provider || '',
    providerRawSuggestion: item.providerRawSuggestion || '',
    requestId: item.requestId || '',
    reviewReason: String(item.reviewReason || '').slice(0, 240),
    reviewStatus,
    reviewedAt: item.reviewedAt || '',
    reviewedBy: item.reviewedBy || '',
    riskScore: Math.max(0, Math.min(100, Number(item.riskScore || 0))),
    riskTypes: Array.isArray(item.riskTypes) ? item.riskTypes.slice(0, 6) : [],
    sampleKind,
    scope: item.scope || 'text',
    source: item.source || (sampleKind === 'quality_sample' ? 'sample_review' : 'rule'),
    sourceLabel: item.sourceLabel || (sampleKind === 'quality_sample' ? '抽样复审' : '规则命中'),
    targetId: item.targetId || '',
  };
}

function moderationSampleReviewStatusLabel(status) {
  if (status === 'confirmed') return '确认风险';
  if (status === 'false_positive') return '误杀';
  if (status === 'false_negative') return '漏杀';
  if (status === 'ignored') return '忽略';
  return '待复审';
}

function moderationSampleKindLabel(kind) {
  return kind === 'quality_sample' ? '抽样复审' : '风险命中';
}

function matchedModerationKeywords(text, keywords = []) {
  const source = String(text || '').toLowerCase();
  if (!source) return [];
  return (Array.isArray(keywords) ? keywords : [])
    .filter((keyword) => {
      const value = String(keyword || '').trim().toLowerCase();
      return value && source.includes(value);
    })
    .slice(0, 8);
}

function evaluateTextModeration(label, text, options = {}) {
  const config = currentOpsConfig().moderation || {};
  if (!config.enabled || !config.textRulesEnabled) return { action: 'allow', matchedKeywords: [], riskScore: 0, riskTypes: [] };
  const normalized = String(text || '').trim();
  if (!normalized) return { action: 'allow', matchedKeywords: [], riskScore: 0, riskTypes: [] };
  const blockMatches = matchedModerationKeywords(normalized, config.blockKeywords);
  if (blockMatches.length) {
    return {
      action: 'block',
      matchedKeywords: blockMatches,
      message: config.blockMessage || `${label}包含不适合公开展示的内容，请修改后再提交`,
      riskScore: 100,
      riskTypes: ['阻断规则命中'],
    };
  }
  const highRiskMatches = matchedModerationKeywords(normalized, config.highRiskKeywords);
  if (highRiskMatches.length) {
    const action = options.reviewAsBlock ? 'block' : 'review';
    return {
      action,
      matchedKeywords: highRiskMatches,
      message: action === 'block' ? (config.blockMessage || `${label}命中高风险规则，请修改后再提交`) : (config.reviewMessage || `${label}已进入人工审核`),
      riskScore: 92,
      riskTypes: ['高风险规则命中'],
    };
  }
  const reviewMatches = matchedModerationKeywords(normalized, config.reviewKeywords);
  if (reviewMatches.length) {
    const action = options.reviewAsBlock ? 'block' : 'review';
    return {
      action,
      matchedKeywords: reviewMatches,
      message: action === 'block' ? (config.blockMessage || `${label}命中复审规则，请修改后再提交`) : (config.reviewMessage || `${label}已进入人工审核`),
      riskScore: 72,
      riskTypes: ['复审规则命中'],
    };
  }
  return { action: 'allow', matchedKeywords: [], riskScore: 0, riskTypes: [] };
}

async function evaluateContentTextModeration(label, text, options = {}) {
  const local = evaluateTextModeration(label, text, options);
  if (local.action !== 'allow') return local;
  const machine = await evaluateTencentTextModeration(label, text, options);
  return machine || local;
}

function petProfileModerationText(patch = {}) {
  return ['name', 'breed', 'species', 'gender']
    .map((key) => String(patch?.[key] || '').trim())
    .filter(Boolean)
    .join(' ');
}

async function moderatePetProfileTextForPublicUse(patch, user, targetId = '') {
  const contentText = petProfileModerationText(patch);
  if (!contentText) return { action: 'allow' };
  const moderation = await evaluateContentTextModeration('宠物资料', contentText, {
    ownerPhone: user.phone,
    scope: 'pet_profile',
    targetId,
  });
  if (moderation.action === 'allow') {
    maybeRecordModerationQualitySample({ contentText, ownerPhone: user.phone, scope: 'pet_profile', targetId });
    return moderation;
  }
  recordModerationSample({ ...moderation, contentText, ownerPhone: user.phone, scope: 'pet_profile', targetId });
  return {
    ...moderation,
    error: moderation.message || '宠物资料需要修改后再保存',
    statusCode: moderation.action === 'block' ? 400 : 409,
  };
}

function moderationMetadataFromEvaluation(evaluation, scope) {
  if (!evaluation || evaluation.action === 'allow') return null;
  return {
    action: evaluation.action,
    bizType: evaluation.bizType || '',
    label: evaluation.label || '',
    matchedKeywords: evaluation.matchedKeywords || [],
    provider: evaluation.provider || '',
    providerRawSuggestion: evaluation.providerRawSuggestion || '',
    requestId: evaluation.requestId || '',
    riskScore: evaluation.riskScore || 0,
    riskTypes: evaluation.riskTypes || [],
    scope,
    source: evaluation.source || 'rule',
    sourceLabel: evaluation.sourceLabel || '规则命中',
  };
}

function recordModerationSample(input = {}) {
  const now = new Date().toISOString();
  const sample = normalizeModerationSample({
    action: input.action || 'review',
    contentText: String(input.contentText || '').slice(0, 500),
    createdAt: now,
    id: `sample-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    matchedKeywords: Array.isArray(input.matchedKeywords) ? input.matchedKeywords.slice(0, 8) : [],
    ownerPhone: input.ownerPhone || '',
    bizType: input.bizType || '',
    provider: input.provider || '',
    providerRawSuggestion: input.providerRawSuggestion || '',
    requestId: input.requestId || '',
    reviewReason: '',
    reviewStatus: 'unreviewed',
    reviewedAt: '',
    reviewedBy: '',
    riskScore: Math.max(0, Math.min(100, Number(input.riskScore || 0))),
    riskTypes: Array.isArray(input.riskTypes) ? input.riskTypes.slice(0, 6) : [],
    sampleKind: input.sampleKind || (input.action === 'allow' ? 'quality_sample' : 'risk_hit'),
    scope: input.scope || 'text',
    source: input.source || 'rule',
    sourceLabel: input.sourceLabel || '规则命中',
    targetId: input.targetId || '',
  });
  const samples = ensureModerationSamples();
  samples.unshift(sample);
  state.moderationSamples = samples.slice(0, 500);
  return sample;
}

function stablePercentBucket(value) {
  const text = String(value || '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

function shouldRecordModerationQualitySample(scope, targetId, contentText) {
  const config = currentOpsConfig().moderation || {};
  if (!config.enabled) return false;
  const rate = Math.floor(clampNumber(config.sampleReviewRatePercent, 0, 0, 100));
  if (rate <= 0) return false;
  if (rate >= 100) return true;
  return stablePercentBucket(`${scope}|${targetId}|${contentText}`) < rate;
}

function maybeRecordModerationQualitySample(input = {}) {
  const contentText = String(input.contentText || '').slice(0, 500);
  const scope = input.scope || 'text';
  const targetId = input.targetId || '';
  if (!contentText || !shouldRecordModerationQualitySample(scope, targetId, contentText)) return null;
  return recordModerationSample({
    action: 'allow',
    contentText,
    ownerPhone: input.ownerPhone || '',
    riskScore: 0,
    riskTypes: ['抽样复审'],
    sampleKind: 'quality_sample',
    scope,
    source: 'sample_review',
    sourceLabel: '抽样复审',
    targetId,
  });
}

function adminModerationSamples() {
  return ensureModerationSamples()
    .slice()
    .sort((a, b) => {
      if (a.reviewStatus === 'unreviewed' && b.reviewStatus !== 'unreviewed') return -1;
      if (a.reviewStatus !== 'unreviewed' && b.reviewStatus === 'unreviewed') return 1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    })
    .map((sample) => ({
      ...sample,
      reviewStatusLabel: moderationSampleReviewStatusLabel(sample.reviewStatus),
      sampleKindLabel: moderationSampleKindLabel(sample.sampleKind),
    }));
}

function moderationSampleSummary(samples = adminModerationSamples()) {
  return {
    confirmed: samples.filter((item) => item.reviewStatus === 'confirmed').length,
    falseNegative: samples.filter((item) => item.reviewStatus === 'false_negative').length,
    falsePositive: samples.filter((item) => item.reviewStatus === 'false_positive').length,
    ignored: samples.filter((item) => item.reviewStatus === 'ignored').length,
    qualitySamples: samples.filter((item) => item.sampleKind === 'quality_sample').length,
    riskHits: samples.filter((item) => item.sampleKind !== 'quality_sample').length,
    total: samples.length,
    unreviewed: samples.filter((item) => item.reviewStatus === 'unreviewed').length,
  };
}

function adminReviewModerationSample(admin, sampleId, body = {}) {
  const samples = ensureModerationSamples();
  const sample = samples.find((item) => item.id === sampleId);
  if (!sample) return { error: '内容安全样本不存在', statusCode: 404 };
  const reviewStatus = String(body.reviewStatus || body.status || '').trim();
  if (!['confirmed', 'false_positive', 'false_negative', 'ignored'].includes(reviewStatus)) {
    return { error: '不支持的样本复审结论', statusCode: 400 };
  }
  const reason = adminReason(body, moderationSampleReviewStatusLabel(reviewStatus));
  const before = { ...sample };
  sample.reviewStatus = reviewStatus;
  sample.reviewReason = reason;
  sample.reviewedAt = new Date().toISOString();
  sample.reviewedBy = admin?.username || 'admin';
  writeAdminAudit(admin, 'moderation.sample.review', 'moderation_sample', sample.id, before, sample, reason);
  return {
    sample: {
      ...sample,
      reviewStatusLabel: moderationSampleReviewStatusLabel(sample.reviewStatus),
      sampleKindLabel: moderationSampleKindLabel(sample.sampleKind),
    },
  };
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

function approvedPlaceReviewCount(placeId) {
  return Object.values(state.placeReviews || {}).reduce((sum, reviews) => {
    if (!Array.isArray(reviews)) return sum;
    return sum + reviews.filter((review) => review.placeId === placeId && review.status === 'approved').length;
  }, 0);
}

function placeFavoriteCount(placeId) {
  return Object.values(state.users || {}).reduce((sum, user) => (
    Array.isArray(user?.favoritePlaceIds) && user.favoritePlaceIds.includes(placeId) ? sum + 1 : sum
  ), 0);
}

function approvedPlaceSubmissionCount(placeId) {
  return allPlaceSubmissions().filter((submission) => submission.status === 'approved' && submission.approvedPlaceId === placeId).length;
}

const PLACE_CONTRIBUTION_POINTS = {
  created: 10,
  linked_existing: 5,
};

function normalizePlaceContributionAction(value) {
  const action = String(value || '').trim();
  return Object.prototype.hasOwnProperty.call(PLACE_CONTRIBUTION_POINTS, action) ? action : 'created';
}

function placeContributionActionLabel(action) {
  if (action === 'linked_existing') return '补充已有地点';
  if (action === 'created') return '发现新地点';
  return action || '-';
}

function ensurePlaceContributions() {
  state.placeContributions = Array.isArray(state.placeContributions) ? state.placeContributions : [];
  return state.placeContributions;
}

function placeContributionForSubmission(submissionId) {
  const id = String(submissionId || '').trim();
  if (!id) return null;
  return ensurePlaceContributions().find((item) => item.submissionId === id) || null;
}

function placeContributionSummary(contributions = ensurePlaceContributions()) {
  const visible = Array.isArray(contributions) ? contributions : [];
  return {
    created: visible.filter((item) => item.action === 'created').length,
    linkedExisting: visible.filter((item) => item.action === 'linked_existing').length,
    points: visible.reduce((sum, item) => sum + Number(item.points || 0), 0),
    total: visible.length,
    users: new Set(visible.map((item) => item.phone).filter(Boolean)).size,
  };
}

function adminPlaceContributions() {
  return ensurePlaceContributions()
    .map((item) => {
      const owner = state.users?.[item.phone];
      const place = (state.places || []).find((entry) => entry.id === item.placeId);
      return {
        ...item,
        actionLabel: placeContributionActionLabel(item.action),
        ownerName: owner?.ownerName || `用户${String(item.phone || '').slice(-4)}`,
        placeName: place?.name || item.placeName || item.placeId,
      };
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function appendPlaceContributor(place, phone) {
  if (!place || !phone) return;
  const current = Array.isArray(place.contributorPhones) ? place.contributorPhones.map(String) : [];
  if (!current.includes(phone)) place.contributorPhones = [...current, phone];
}

function mergeSubmissionImagesIntoPlace(place, submission) {
  if (!place || !submission) return;
  const imageUrls = visibleImageUrls(submission.imageUrls).slice(0, 3);
  if (!imageUrls.length) return;
  const current = Array.isArray(place.photoUrls) ? place.photoUrls : [];
  const next = [...current];
  imageUrls.forEach((url) => {
    if (url && !next.includes(url)) next.push(url);
  });
  place.photoUrls = next.slice(0, 6);
  if (!place.coverImageUrl) place.coverImageUrl = place.photoUrls[0] || '';
}

function ensureManualPlaceForSubmission(submission, phone = '') {
  if (!submission) return null;
  if (submission.approvedPlaceId) {
    const found = findPlaceById(submission.approvedPlaceId);
    if (found?.place) {
      appendPlaceContributor(found.place, phone);
      mergeSubmissionImagesIntoPlace(found.place, submission);
      return found.place;
    }
  }
  const imageUrls = visibleImageUrls(submission.imageUrls).slice(0, 3);
  const place = {
    address: submission.address,
    category: 'other',
    contributorPhones: phone ? [phone] : [],
    coverImageUrl: imageUrls[0] || '',
    distance: '附近',
    id: `manual-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    name: submission.name,
    petFriendlyStatus: 'candidate',
    photoUrls: imageUrls,
    rating: 0,
    reviewCount: 0,
    source: 'manual',
    supportedSpecies: ['cat', 'dog'],
    tags: ['用户提交', '待完善'],
  };
  state.places = [place, ...(state.places || [])];
  submission.approvedPlaceId = place.id;
  return place;
}

function recordPlaceContribution(admin, phone, submission, place, actionValue, reason = '') {
  if (!phone || !submission?.id || !place?.id) return null;
  const existing = placeContributionForSubmission(submission.id);
  if (existing) return existing;
  const action = normalizePlaceContributionAction(actionValue);
  const now = new Date().toISOString();
  const points = PLACE_CONTRIBUTION_POINTS[action] || 0;
  const contribution = {
    action,
    actionLabel: placeContributionActionLabel(action),
    createdAt: now,
    createdBy: admin?.username || 'admin',
    id: `place-contribution-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    phone,
    placeId: place.id,
    placeName: place.name || submission.name || '',
    points,
    reason: String(reason || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    submissionId: submission.id,
  };
  ensurePlaceContributions().unshift(contribution);
  appendPlaceContributor(place, phone);
  submission.contributionAction = action;
  submission.contributionActionLabel = contribution.actionLabel;
  submission.contributionId = contribution.id;
  submission.contributionPoints = points;
  submission.contributionRewardedAt = now;
  writeAdminAudit(admin, 'place.contribution.create', 'place_contribution', contribution.id, null, contribution, contribution.reason || contribution.actionLabel);
  return contribution;
}

function normalizePlaceCategoryForResponse(place) {
  const category = String(place?.category || 'other');
  if (['cafe', 'clinic', 'park', 'shop'].includes(category)) return category;
  const text = [place?.name, place?.address, place?.poiType, ...(place?.tags || [])].map(compactText).join(' ');
  if (/(宠物医院|动物医院|宠物诊所|兽医|医疗|医院|诊所)/u.test(text)) return 'clinic';
  if (/(宠物店|宠物用品|宠物食品|宠物美容|宠物寄养|爬宠|猫舍|犬舍|萌宠|宠物生活馆)/u.test(text)) return 'shop';
  return 'other';
}

function placeQualityDetails(place) {
  const category = normalizePlaceCategoryForResponse(place);
  const reviewCount = placeReviewCount(place?.id);
  const approvedReviews = approvedPlaceReviewCount(place?.id);
  const favoriteCount = placeFavoriteCount(place?.id);
  const approvedSubmissions = approvedPlaceSubmissionCount(place?.id);
  const tags = Array.isArray(place?.tags) ? place.tags.filter(Boolean) : [];
  const supportedSpecies = Array.isArray(place?.supportedSpecies)
    ? place.supportedSpecies.filter((species) => species === 'cat' || species === 'dog')
    : [];
  const rating = Number(place?.rating || 0);
  const hasCoordinates = Number.isFinite(Number(place?.latitude)) && Number.isFinite(Number(place?.longitude));
  const status = String(place?.petFriendlyStatus || 'unknown');
  const source = String(place?.source || '');
  const reasons = [];
  let score = 28;
  if (compactText(place?.name)) {
    score += 8;
    reasons.push('名称完整');
  }
  if (compactText(place?.address)) {
    score += 10;
    reasons.push('地址完整');
  }
  if (hasCoordinates) {
    score += 10;
    reasons.push('有坐标');
  }
  if (category !== 'other') {
    score += 8;
    reasons.push('分类明确');
  }
  if (supportedSpecies.length) {
    score += 8;
    reasons.push('猫狗适配已标注');
  }
  if (tags.length) {
    score += Math.min(10, tags.length * 3);
    reasons.push('标签可检索');
  }
  if (Number.isFinite(rating) && rating > 0) {
    score += Math.min(24, Math.round(rating * 5));
    reasons.push('有评分');
  }
  if (reviewCount > 0) {
    score += Math.min(12, reviewCount * 3);
    reasons.push('有用户点评');
  }
  if (approvedReviews > 0) {
    score += Math.min(10, approvedReviews * 4);
    reasons.push('有已审点评');
  }
  if (favoriteCount > 0) {
    score += Math.min(8, favoriteCount * 2);
    reasons.push('被用户收藏');
  }
  if (approvedSubmissions > 0) {
    score += Math.min(6, approvedSubmissions * 3);
    reasons.push('来自审核入库');
  }
  if (source === 'amap' || source === 'tencent') score += 4;
  if (status === 'verified') {
    score += 10;
    reasons.push('宠物友好已验证');
  } else if (status === 'candidate') {
    score -= 10;
    reasons.push('宠物友好待验证');
  } else if (status === 'rejected') {
    score -= 25;
    reasons.push('宠物友好被驳回');
  }
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const label = normalizedScore >= 80 ? '高质量' : normalizedScore >= 60 ? '可用' : '待完善';
  return {
    approvedReviews,
    approvedSubmissions,
    category,
    favoriteCount,
    label,
    reasons: reasons.slice(0, 6),
    reviewCount,
    score: normalizedScore,
  };
}

function placeLocationForQuality(place) {
  const latitude = Number(place?.latitude);
  const longitude = Number(place?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function placeDuplicateCandidates(place, allPlaces = state.places || [], limit = 3) {
  const placeLocation = placeLocationForQuality(place);
  return (allPlaces || [])
    .filter((candidate) => candidate && candidate.id !== place?.id)
    .map((candidate) => {
      const reasons = [];
      let score = 0;
      if (compactText(place?.sourcePoiId) && compactText(place?.sourcePoiId) === compactText(candidate.sourcePoiId)) {
        score += 80;
        reasons.push('外部 POI ID 相同');
      }
      if (isSimilarPlaceText(place?.name, candidate.name, 3)) {
        score += 45;
        reasons.push('名称相似');
      }
      if (isSimilarPlaceText(place?.address, candidate.address, 6)) {
        score += 30;
        reasons.push('地址相似');
      }
      if (normalizePlaceCategoryForResponse(place) === normalizePlaceCategoryForResponse(candidate)) {
        score += 8;
        reasons.push('分类相同');
      }
      const candidateLocation = placeLocationForQuality(candidate);
      const distanceKm = placeLocation && candidateLocation ? distanceKmBetween(placeLocation, candidateLocation) : null;
      if (distanceKm !== null && distanceKm !== undefined) {
        if (distanceKm <= 0.05) {
          score += 25;
          reasons.push('50m 内');
        } else if (distanceKm <= 0.2) {
          score += 12;
          reasons.push('200m 内');
        }
      }
      return {
        address: candidate.address || '',
        category: normalizePlaceCategoryForResponse(candidate),
        distanceMeters: distanceKm === null || distanceKm === undefined ? null : Math.round(distanceKm * 1000),
        id: candidate.id,
        name: candidate.name || candidate.id,
        reasons,
        score: Math.max(0, Math.min(100, score)),
      };
    })
    .filter((candidate) => candidate.score >= 55)
    .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);
}

function placeForResponse(place) {
  if (!place) return place;
  const quality = placeQualityDetails(place);
  const duplicateCandidateCount = placeDuplicateCandidates(place, state.places || [], 4).length;
  return {
    ...place,
    category: quality.category,
    contributorCount: Array.isArray(place.contributorPhones) ? place.contributorPhones.length : 0,
    duplicateCandidateCount,
    qualityLabel: quality.label,
    qualityReasons: quality.reasons,
    qualityScore: quality.score,
    reviewCount: quality.reviewCount,
  };
}

function placesForResponse(places) {
  return (places || []).map(placeForResponse);
}

function adminPlaceCatalog() {
  const sourcePlaces = state.places || [];
  const places = sourcePlaces.map((place) => {
    const quality = placeQualityDetails(place);
    const duplicateCandidates = placeDuplicateCandidates(place, sourcePlaces, 5);
    return {
      ...placeForResponse(place),
      approvedReviewCount: quality.approvedReviews,
      approvedSubmissionCount: quality.approvedSubmissions,
      duplicateCandidates,
      duplicateCandidateCount: duplicateCandidates.length,
      favoriteCount: quality.favoriteCount,
    };
  }).sort((a, b) =>
    (b.duplicateCandidateCount || 0) - (a.duplicateCandidateCount || 0) ||
    (a.qualityScore || 0) - (b.qualityScore || 0) ||
    String(a.name).localeCompare(String(b.name))
  );
  const total = places.length;
  const duplicatePlaceCount = places.filter((place) => place.duplicateCandidateCount > 0).length;
  const needsReview = places.filter((place) => Number(place.qualityScore || 0) < 60 || place.duplicateCandidateCount > 0 || place.petFriendlyStatus === 'candidate').length;
  const averageQualityScore = total
    ? Math.round(places.reduce((sum, place) => sum + Number(place.qualityScore || 0), 0) / total)
    : 0;
  const contributionSummary = placeContributionSummary();
  return {
    places,
    summary: {
      averageQualityScore,
      contributionPoints: contributionSummary.points,
      contributionRecords: contributionSummary.total,
      contributors: contributionSummary.users,
      duplicatePlaceCount,
      highQuality: places.filter((place) => Number(place.qualityScore || 0) >= 80).length,
      needsReview,
      total,
    },
  };
}

function findPlaceById(placeId) {
  const id = String(placeId || '').trim();
  const index = (state.places || []).findIndex((place) => place.id === id);
  if (index < 0) return null;
  return { index, place: state.places[index] };
}

function normalizePlaceTagsForAdmin(value, fallback = []) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[\n,，、/]+/u);
  const seen = new Set();
  const tags = [];
  for (const raw of source) {
    const tag = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 18);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= 12) break;
  }
  if (tags.length) return tags;
  return Array.isArray(fallback) ? fallback.filter(Boolean).slice(0, 12) : [];
}

function normalizePlaceSupportedSpeciesForAdmin(value, fallback = []) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[\n,，、/]+/u);
  const species = source
    .map((item) => String(item || '').trim().toLowerCase())
    .map((item) => (item === 'dog' || item === 'cat' ? item : ''))
    .filter(Boolean);
  const normalized = [...new Set(species)];
  if (normalized.length) return normalized;
  return Array.isArray(fallback) ? [...new Set(fallback.filter((item) => item === 'dog' || item === 'cat'))] : [];
}

function normalizeAdminPlaceCategory(value, fallback = 'other') {
  const category = String(value || fallback || 'other').trim();
  return ['cafe', 'clinic', 'other', 'park', 'shop'].includes(category) ? category : 'other';
}

function normalizeAdminPlaceFriendlyStatus(value, fallback = 'unknown') {
  const status = String(value || fallback || 'unknown').trim();
  return ['candidate', 'rejected', 'unknown', 'verified'].includes(status) ? status : 'unknown';
}

function normalizeAdminPlaceNumber(value, fallback, min, max) {
  if (value === undefined || value === null || value === '') return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function buildAdminPlacePatch(current, body = {}) {
  const patch = {};
  if (body.name !== undefined) {
    const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!name) return { error: '地点名称不能为空', statusCode: 400 };
    patch.name = name;
  }
  if (body.address !== undefined) {
    const address = String(body.address || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!address) return { error: '地点地址不能为空', statusCode: 400 };
    patch.address = address;
  }
  if (body.category !== undefined) patch.category = normalizeAdminPlaceCategory(body.category, current.category);
  if (body.petFriendlyStatus !== undefined) patch.petFriendlyStatus = normalizeAdminPlaceFriendlyStatus(body.petFriendlyStatus, current.petFriendlyStatus);
  if (body.supportedSpecies !== undefined) patch.supportedSpecies = normalizePlaceSupportedSpeciesForAdmin(body.supportedSpecies, current.supportedSpecies);
  if (body.tags !== undefined) patch.tags = normalizePlaceTagsForAdmin(body.tags, current.tags);
  if (body.rating !== undefined) patch.rating = normalizeAdminPlaceNumber(body.rating, current.rating || 0, 0, 5);
  if (body.reviewCount !== undefined) patch.reviewCount = Math.floor(normalizeAdminPlaceNumber(body.reviewCount, current.reviewCount || 0, 0, 999999));
  if (body.latitude !== undefined) patch.latitude = normalizeAdminPlaceNumber(body.latitude, current.latitude, -90, 90);
  if (body.longitude !== undefined) patch.longitude = normalizeAdminPlaceNumber(body.longitude, current.longitude, -180, 180);
  if (body.distance !== undefined) patch.distance = String(body.distance || current.distance || '附近').replace(/\s+/g, ' ').trim().slice(0, 32) || '附近';
  if (body.coverImageUrl !== undefined) patch.coverImageUrl = normalizeHttpUrlText(body.coverImageUrl, 1000) || '';
  if (body.openingHoursToday !== undefined) patch.openingHoursToday = String(body.openingHoursToday || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (body.phone !== undefined) patch.phone = String(body.phone || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return { patch };
}

function updateAdminPlace(admin, placeId, body = {}) {
  const found = findPlaceById(placeId);
  if (!found) return { error: '地点不存在', statusCode: 404 };
  const built = buildAdminPlacePatch(found.place, body);
  if (built.error) return built;
  const before = cloneJson(found.place);
  const next = {
    ...found.place,
    ...built.patch,
    updatedAt: new Date().toISOString(),
    updatedBy: admin?.username || 'admin',
  };
  state.places[found.index] = next;
  const reason = adminReason(body, '编辑地点资料');
  writeAdminAudit(admin, 'place.update', 'place', next.id, before, next, reason);
  return { place: adminPlaceCatalog().places.find((place) => place.id === next.id), reason };
}

function replacePlaceIdReferences(sourceId, targetId) {
  const summary = { favorites: 0, invites: 0, notifications: 0, reviews: 0, submissions: 0 };
  Object.values(state.placeReviews || {}).forEach((reviews) => {
    if (!Array.isArray(reviews)) return;
    reviews.forEach((review) => {
      if (review?.placeId === sourceId) {
        review.placeId = targetId;
        summary.reviews += 1;
      }
    });
  });
  Object.values(state.placeSubmissions || {}).forEach((submissions) => {
    if (!Array.isArray(submissions)) return;
    submissions.forEach((submission) => {
      if (submission?.approvedPlaceId === sourceId) {
        submission.approvedPlaceId = targetId;
        summary.submissions += 1;
      }
    });
  });
  Object.values(state.users || {}).forEach((user) => {
    if (Array.isArray(user.favoritePlaceIds) && user.favoritePlaceIds.includes(sourceId)) {
      user.favoritePlaceIds = [...new Set(user.favoritePlaceIds.map((id) => (id === sourceId ? targetId : id)))];
      summary.favorites += 1;
    }
  });
  Object.values(state.notifications || {}).forEach((notifications) => {
    if (!Array.isArray(notifications)) return;
    notifications.forEach((notification) => {
      if (notification?.placeId === sourceId) {
        notification.placeId = targetId;
        summary.notifications += 1;
      }
    });
  });
  (Array.isArray(state.invites) ? state.invites : []).forEach((invite) => {
    if (invite?.placeId === sourceId) {
      invite.placeId = targetId;
      summary.invites += 1;
    }
  });
  return summary;
}

function mergeAdminPlace(admin, sourcePlaceId, body = {}) {
  const sourceFound = findPlaceById(sourcePlaceId);
  if (!sourceFound) return { error: '源地点不存在', statusCode: 404 };
  const targetId = String(body.targetPlaceId || body.mergeIntoPlaceId || body.targetId || '').trim();
  if (!targetId) return { error: '请选择要合并到的目标地点', statusCode: 400 };
  if (targetId === sourceFound.place.id) return { error: '不能把地点合并到自身', statusCode: 400 };
  const targetFound = findPlaceById(targetId);
  if (!targetFound) return { error: '目标地点不存在', statusCode: 404 };
  const reason = adminReason(body, '合并重复地点');
  const before = {
    source: cloneJson(sourceFound.place),
    target: cloneJson(targetFound.place),
  };
  const mergedTags = normalizePlaceTagsForAdmin([...(targetFound.place.tags || []), ...(sourceFound.place.tags || [])], targetFound.place.tags);
  const mergedSpecies = normalizePlaceSupportedSpeciesForAdmin([...(targetFound.place.supportedSpecies || []), ...(sourceFound.place.supportedSpecies || [])], targetFound.place.supportedSpecies);
  const sourceReviewCount = Number(sourceFound.place.reviewCount || 0);
  const targetReviewCount = Number(targetFound.place.reviewCount || 0);
  targetFound.place.tags = mergedTags;
  targetFound.place.supportedSpecies = mergedSpecies;
  targetFound.place.updatedAt = new Date().toISOString();
  targetFound.place.updatedBy = admin?.username || 'admin';
  targetFound.place.mergedSourceIds = [...new Set([...(targetFound.place.mergedSourceIds || []), sourceFound.place.id, ...(sourceFound.place.mergedSourceIds || [])])];
  const referenceSummary = replacePlaceIdReferences(sourceFound.place.id, targetFound.place.id);
  targetFound.place.reviewCount = Math.max(targetReviewCount + sourceReviewCount, placeReviewCount(targetFound.place.id));
  state.places = (state.places || []).filter((place) => place.id !== sourceFound.place.id);
  const after = {
    referenceSummary,
    removedPlaceId: sourceFound.place.id,
    target: cloneJson(targetFound.place),
  };
  writeAdminAudit(admin, 'place.merge', 'place', targetFound.place.id, before, after, reason);
  return {
    catalog: adminPlaceCatalog(),
    mergedPlaceId: sourceFound.place.id,
    referenceSummary,
    targetPlace: adminPlaceCatalog().places.find((place) => place.id === targetFound.place.id),
  };
}

async function createPlaceReview(user, placeId, bodyOrContent) {
  const place = (state.places || []).find((item) => item.id === placeId);
  if (!place) return null;
  const body = bodyOrContent && typeof bodyOrContent === 'object' ? bodyOrContent : { content: bodyOrContent };
  const content = body.content;
  const trimmedContent = String(content || '').trim();
  if (!trimmedContent) return false;
  const violation = publicPlaceContentViolation('点评内容', trimmedContent, 500);
  if (violation) return { error: violation, statusCode: 400 };
  const imageModerationError = placeImageModerationError(body);
  if (imageModerationError) return { error: imageModerationError, statusCode: 400 };
  const imageUrls = normalizePlaceImageUrls(body);
  const moderation = await evaluateContentTextModeration('点评内容', trimmedContent, { ownerPhone: user.phone, scope: 'place_review' });
  if (moderation.action === 'block') {
    recordModerationSample({ ...moderation, contentText: trimmedContent, ownerPhone: user.phone, scope: 'place_review' });
    return { error: moderation.message || '点评内容需要修改后再提交', statusCode: 400 };
  }
  const hadReviewForPlace = placeReviewsFor(user).some((item) => item.placeId === placeId);
  const review = {
    content: trimmedContent,
    createdAt: new Date().toISOString(),
    id: `review-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    imageUrls,
    moderation: moderationMetadataFromEvaluation(moderation, 'place_review'),
    photoCount: imageUrls.length,
    placeId,
    status: 'pending_review',
  };
  if (review.moderation) recordModerationSample({ ...moderation, contentText: trimmedContent, ownerPhone: user.phone, scope: 'place_review', targetId: review.id });
  else maybeRecordModerationQualitySample({ contentText: trimmedContent, ownerPhone: user.phone, scope: 'place_review', targetId: review.id });
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

async function createPlaceSubmission(user, body) {
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
  const imageModerationError = placeImageModerationError(body);
  if (imageModerationError) return { error: imageModerationError, statusCode: 400 };
  const imageUrls = normalizePlaceImageUrls(body);
  const moderation = await evaluateContentTextModeration('新增地点内容', [name, address, content].join(' '), { ownerPhone: user.phone, scope: 'place_submission' });
  if (moderation.action === 'block') {
    recordModerationSample({ ...moderation, contentText: [name, address, content].join(' · '), ownerPhone: user.phone, scope: 'place_submission' });
    return { error: moderation.message || '地点内容需要修改后再提交', statusCode: 400 };
  }
  const duplicate = findDuplicatePlaceSubmission(user, name, address);
  if (duplicate) return { duplicateType: duplicate.type, error: duplicate.message, statusCode: 409 };
  const submission = {
    address,
    content,
    createdAt: new Date().toISOString(),
    id: `place-submission-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    imageUrls,
    moderation: moderationMetadataFromEvaluation(moderation, 'place_submission'),
    name,
    photoCount: imageUrls.length,
    status: 'pending_review',
  };
  if (submission.moderation) recordModerationSample({ ...moderation, contentText: [name, address, content].join(' · '), ownerPhone: user.phone, scope: 'place_submission', targetId: submission.id });
  else maybeRecordModerationQualitySample({ contentText: [name, address, content].join(' · '), ownerPhone: user.phone, scope: 'place_submission', targetId: submission.id });
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

function normalizeMediaModerationStatus(value, media) {
  const status = String(value || '').trim();
  if (['approved', 'hidden', 'pending_review', 'rejected'].includes(status)) return status;
  return 'approved';
}

function mediaModerationStatusLabel(status) {
  if (status === 'pending_review') return '待审核';
  if (status === 'approved') return '已通过';
  if (status === 'hidden') return '已隐藏';
  if (status === 'rejected') return '已驳回';
  return status || '-';
}

function mediaUploadForImageUrl(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/media\/uploads\/([^/]+)\/file$/);
    if (match) {
      const mediaId = decodeURIComponent(match[1]);
      return state.mediaUploads?.[mediaId] || null;
    }
  } catch {
    return null;
  }
  return Object.values(state.mediaUploads || {}).find((media) => {
    if (!media) return false;
    return url === media.objectUrl;
  }) || null;
}

function mediaUploadForObjectKey(objectKey) {
  const key = String(objectKey || '').trim();
  if (!key) return null;
  return Object.values(state.mediaUploads || {}).find((media) => media?.objectKey === key) || null;
}

function isMediaUploadPubliclyVisible(media) {
  const status = normalizeMediaModerationStatus(media?.moderationStatus, media);
  return status === 'approved';
}

function isMediaUploadBlockedFromPublic(media) {
  if (!media) return false;
  return !isMediaUploadPubliclyVisible(media);
}

function isImageUrlPubliclyVisible(imageUrl) {
  const media = mediaUploadForImageUrl(imageUrl);
  return media ? isMediaUploadPubliclyVisible(media) : true;
}

function visibleImageUrl(imageUrl) {
  const url = String(imageUrl || '').trim();
  return url && isImageUrlPubliclyVisible(url) ? url : '';
}

function visibleImageUrls(imageUrls) {
  const seen = new Set();
  const urls = [];
  for (const item of Array.isArray(imageUrls) ? imageUrls : []) {
    const url = visibleImageUrl(item);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= effectivePetCircleMaxPhotos()) break;
  }
  return urls;
}

function normalizePlaceImageUrls(body = {}) {
  const rawUrls = Array.isArray(body.imageUrls) ? body.imageUrls : Array.isArray(body.photoUrls) ? body.photoUrls : [];
  const urls = [];
  const seen = new Set();
  for (const item of rawUrls) {
    const url = String(item || '').trim();
    if (!url || url.length > 2000 || seen.has(url)) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      if (!isImageUrlPubliclyVisible(url)) continue;
      seen.add(url);
      urls.push(url);
    } catch {
      // Invalid image URLs are ignored; place content should submit media upload URLs.
    }
    if (urls.length >= 3) break;
  }
  return urls;
}

function placeImageModerationError(body = {}) {
  const rawUrls = Array.isArray(body.imageUrls) ? body.imageUrls : Array.isArray(body.photoUrls) ? body.photoUrls : [];
  for (const item of rawUrls) {
    const media = mediaUploadForImageUrl(item);
    if (!media) continue;
    const status = normalizeMediaModerationStatus(media.moderationStatus, media);
    if (status === 'pending_review') return '有地点图片正在安全审核中，通过后才能提交';
    if (status === 'hidden' || status === 'rejected') return '有地点图片未通过平台安全审核，请重新选择图片';
  }
  return '';
}

function publicUploadedMedia(media, req) {
  if (!media) return null;
  const analysis = media.analysis || analyzeUploadedPetMedia({}, media.dataUrl);
  const moderationStatus = normalizeMediaModerationStatus(media.moderationStatus, { ...media, analysis });
  return {
    analysis,
    fileUrl: media.objectUrl || mediaUploadFileUrl(req, media.mediaId),
    mediaId: media.mediaId,
    moderationReason: media.moderationReason || '',
    moderationStatus,
    moderationStatusLabel: mediaModerationStatusLabel(moderationStatus),
    previewUrl: media.previewUrl || samplePhotoUrl,
    quality: analysis.status === 'blocked' ? 'blocked' : analysis.status === 'warning' ? 'warning' : 'good',
  };
}

function mediaModerationStatusFromEvaluation(evaluation) {
  if (!evaluation) return 'approved';
  if (evaluation.action === 'block') return 'rejected';
  if (evaluation.action === 'review') return 'pending_review';
  return 'approved';
}

function contentSafetySnapshot(evaluation) {
  if (!evaluation) return null;
  return {
    action: evaluation.action || 'allow',
    bizType: evaluation.bizType || '',
    label: evaluation.label || '',
    matchedKeywords: Array.isArray(evaluation.matchedKeywords) ? evaluation.matchedKeywords.slice(0, 8) : [],
    provider: evaluation.provider || '',
    providerError: evaluation.providerError || '',
    providerRawSuggestion: evaluation.providerRawSuggestion || '',
    requestId: evaluation.requestId || '',
    riskScore: Math.max(0, Math.min(100, Number(evaluation.riskScore || 0))),
    riskTypes: Array.isArray(evaluation.riskTypes) ? evaluation.riskTypes.slice(0, 6) : [],
    source: evaluation.source || '',
    sourceLabel: evaluation.sourceLabel || '',
  };
}

function mediaModerationReasonFromEvaluation(evaluation) {
  if (!evaluation) return '';
  if (evaluation.action === 'allow') return '';
  if (evaluation.providerError) return evaluation.providerError;
  const types = Array.isArray(evaluation.riskTypes) ? evaluation.riskTypes.filter(Boolean).slice(0, 3).join('、') : '';
  return evaluation.message || types || mediaModerationStatusLabel(mediaModerationStatusFromEvaluation(evaluation));
}

async function moderateImageFileContentForPublicUse(fileContent, ownerPhone, scope, targetId) {
  const result = await evaluateTencentImageModeration({ mediaId: targetId, ownerPhone }, {
    fileContent,
    scope,
    targetId,
  });
  if (!result) return { action: 'allow' };
  if (result.action === 'block') {
    recordModerationSample({ ...result, contentText: targetId || scope, ownerPhone, scope, targetId });
    return { action: 'block', error: result.message || '图片包含不适合公开展示的内容，请重新上传', result };
  }
  if (result.action === 'review') {
    recordModerationSample({ ...result, contentText: targetId || scope, ownerPhone, scope, targetId });
    return { action: 'review', error: result.message || '图片已进入人工审核，请稍后再试', result };
  }
  if (result.action === 'allow') {
    maybeRecordModerationQualitySample({ contentText: targetId || scope, ownerPhone, scope, targetId });
  }
  return { action: 'allow', result };
}

const feedbackCategories = new Set(['bug', 'other', 'safety', 'suggestion']);

async function createFeedbackSubmission(req, user, body) {
  const content = String(body.content || '').trim();
  if (!content) return { error: '请填写反馈内容', statusCode: 400 };
  if (content.length > 1000) return { error: '反馈内容最多 1000 个字', statusCode: 400 };
  const categoryInput = String(body.category || body.type || 'other');
  const category = feedbackCategories.has(categoryInput) ? categoryInput : 'other';
  const contact = String(body.contact || '').trim().slice(0, 80);
  const attachmentResult = await buildSupportAttachments(req, user, body);
  if (attachmentResult.error) return attachmentResult;
  const feedback = {
    attachments: attachmentResult.attachments || [],
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
  const ticket = createSupportTicketFromFeedback(feedback);
  feedback.supportTicketId = ticket.id;
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
  if (notifyExpiredSanctionsFor(user)) saveState();
  const permissions = normalizePermissionState(user.permissions);
  return {
    activePet: selectedPetFor(user),
    accountStatus: accountStatusFor(user),
    ownerAvatarUrl: user.ownerAvatarUrl || '',
    ownerBio: user.ownerBio || '',
    ownerName: user.ownerName || `用户${user.phone.slice(-4)}`,
    permissions,
    permissionsOnboardingCompleted: Boolean(user.permissionsOnboardingCompleted || allPermissionsGranted(permissions)),
    sanctions: userSanctionSummary(user.phone),
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
  user.accountStatus = accountStatusFor(user);
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

function visiblePetChatMessagesFor(user) {
  return petChatMessagesFor(user).filter((message) => !message.adminHiddenAt);
}

function parsePetChatStorageKey(key) {
  const [phone, ...petIdParts] = String(key || '').split(':');
  return {
    petId: petIdParts.join(':'),
    phone: normalizePhone(phone),
  };
}

function petChatAdminActionLabels(message = {}) {
  return [
    message.medicalAlert ? '医疗风险' : '',
    message.createdMemo ? '写入备忘' : '',
    message.createdWeight ? '写入体重' : '',
    message.updatedVaccine ? '更新疫苗/驱虫' : '',
    message.updatedPet ? '更新档案' : '',
    message.adminHiddenAt ? '已隐藏' : '',
    ...(Array.isArray(message.adminTags) ? message.adminTags : []),
  ].filter(Boolean);
}

function adminPetChatMessages(options = {}) {
  const q = String(options.q || '').trim().toLowerCase();
  const flag = String(options.flag || 'all');
  const rows = Object.entries(state.petChatMessages || {}).flatMap(([key, messages]) => {
    const { phone, petId } = parsePetChatStorageKey(key);
    const user = phone ? state.users?.[phone] : null;
    const pet = user?.pets?.find((item) => item.id === petId) || (user ? selectedPetFor(user) : null);
    const list = Array.isArray(messages) ? messages : [];
    return list
      .map((message, index) => ({ index, message }))
      .filter(({ message }) => message?.author === 'ai')
      .map(({ index, message }) => {
        const userMessage = [...list.slice(0, index)].reverse().find((item) => item.author === 'me');
        const actionLabels = petChatAdminActionLabels(message);
        return {
          actionLabels,
          adminHiddenAt: message.adminHiddenAt || '',
          adminHiddenBy: message.adminHiddenBy || '',
          adminHiddenReason: message.adminHiddenReason || '',
          adminTags: Array.isArray(message.adminTags) ? message.adminTags : [],
          aiSummary: compactPetChatLine(message.text || '', 120, { removeSavedActions: true }),
          createdMemoTitle: message.createdMemo?.title || '',
          createdWeightKg: message.createdWeight?.kg || '',
          feedback: message.feedback || '',
          feedbackAt: message.feedbackAt || '',
          hasCalendarWrite: Boolean(message.createdMemo || message.createdWeight || message.updatedVaccine),
          hasMedicalAlert: Boolean(message.medicalAlert),
          id: message.id,
          medicalReason: message.medicalAlert?.reason || '',
          ownerName: user?.ownerName || (phone ? `用户${phone.slice(-4)}` : '-'),
          ownerPhone: phone,
          petId,
          petName: pet?.name || '',
          time: message.time || message.createdAt || '',
          updatedPet: Boolean(message.updatedPet),
          updatedVaccineName: message.updatedVaccine?.name || '',
          userMessageId: userMessage?.id || '',
          userSummary: compactPetChatLine(userMessage?.text || '', 100),
        };
      });
  });
  return rows
    .filter((row) => {
      if (flag === 'medical') return row.hasMedicalAlert;
      if (flag === 'writes') return row.hasCalendarWrite || row.updatedPet;
      if (flag === 'feedback_good') return row.feedback === 'good';
      if (flag === 'feedback_off') return row.feedback === 'off';
      if (flag === 'hidden') return Boolean(row.adminHiddenAt);
      if (flag === 'tagged') return row.adminTags.length > 0;
      return true;
    })
    .filter((row) => {
      if (!q) return true;
      return [row.id, row.ownerPhone, row.ownerName, row.petName, row.userSummary, row.aiSummary, row.medicalReason, row.feedback, row.actionLabels.join(' ')]
        .some((value) => String(value || '').toLowerCase().includes(q));
    })
    .sort((a, b) => String(b.time).localeCompare(String(a.time)))
    .slice(0, 300);
}

function findPetChatAdminMessage(messageId) {
  const id = String(messageId || '');
  for (const [key, messages] of Object.entries(state.petChatMessages || {})) {
    const list = Array.isArray(messages) ? messages : [];
    const index = list.findIndex((message) => message.id === id);
    if (index >= 0) {
      const { phone, petId } = parsePetChatStorageKey(key);
      const user = phone ? state.users?.[phone] : null;
      const pet = user?.pets?.find((item) => item.id === petId) || (user ? selectedPetFor(user) : null);
      return { index, key, list, message: list[index], pet, petId, phone, user };
    }
  }
  return null;
}

function adminPetChatDetail(admin, messageId, reason = '') {
  const normalizedReason = String(reason || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!normalizedReason) return { error: '查看完整对话必须填写原因', statusCode: 400 };
  const found = findPetChatAdminMessage(messageId);
  if (!found || found.message?.author !== 'ai') return { error: 'AI 对话消息不存在', statusCode: 404 };
  const start = Math.max(0, found.index - 6);
  const end = Math.min(found.list.length, found.index + 5);
  const context = found.list.slice(start, end).map((message) => ({
    adminHiddenAt: message.adminHiddenAt || '',
    author: message.author,
    feedback: message.feedback || '',
    id: message.id,
    text: message.text || '',
    time: message.time || message.createdAt || '',
  }));
  const detail = {
    actions: petChatAdminActionLabels(found.message),
    context,
    createdMemo: found.message.createdMemo || null,
    createdWeight: found.message.createdWeight || null,
    feedback: found.message.feedback || '',
    feedbackAt: found.message.feedbackAt || '',
    medicalAlert: found.message.medicalAlert || null,
    message: found.message,
    ownerName: found.user?.ownerName || (found.phone ? `用户${found.phone.slice(-4)}` : '-'),
    ownerPhone: found.phone,
    pet: found.pet || null,
    petId: found.petId,
    updatedPet: found.message.updatedPet || null,
    updatedVaccine: found.message.updatedVaccine || null,
  };
  writeAdminAudit(admin, 'ai.petChat.view', 'pet_chat_message', found.message.id, null, {
    ownerPhone: found.phone,
    petId: found.petId,
    reason: normalizedReason,
  }, normalizedReason);
  return { detail };
}

function tagPetChatAdminMessage(admin, messageId, body = {}) {
  const found = findPetChatAdminMessage(messageId);
  if (!found || found.message?.author !== 'ai') return { error: 'AI 对话消息不存在', statusCode: 404 };
  const allowedTags = new Set(['quality_issue', 'medical_sample', 'false_positive', 'false_negative']);
  const tag = String(body.tag || '').trim();
  const reason = String(body.reason || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!allowedTags.has(tag)) return { error: '请选择正确的 AI 对话标签', statusCode: 400 };
  const before = { adminTags: Array.isArray(found.message.adminTags) ? [...found.message.adminTags] : [] };
  const tags = new Set(before.adminTags);
  tags.add(tag);
  found.message.adminTags = [...tags];
  found.message.adminTaggedAt = new Date().toISOString();
  found.message.adminTaggedBy = admin?.username || 'admin';
  found.message.adminTagReason = reason;
  writeAdminAudit(admin, 'ai.petChat.tag', 'pet_chat_message', found.message.id, before, {
    adminTags: found.message.adminTags,
    reason,
  }, reason || tag);
  return { row: adminPetChatMessages({ flag: 'all' }).find((item) => item.id === found.message.id) };
}

function hidePetChatAdminMessage(admin, messageId, body = {}) {
  const found = findPetChatAdminMessage(messageId);
  if (!found || found.message?.author !== 'ai') return { error: 'AI 对话消息不存在', statusCode: 404 };
  const reason = String(body.reason || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!reason) return { error: '隐藏 AI 回复必须填写原因', statusCode: 400 };
  const before = {
    adminHiddenAt: found.message.adminHiddenAt || '',
    adminHiddenReason: found.message.adminHiddenReason || '',
  };
  found.message.adminHiddenAt = new Date().toISOString();
  found.message.adminHiddenBy = admin?.username || 'admin';
  found.message.adminHiddenReason = reason;
  writeAdminAudit(admin, 'ai.petChat.hide', 'pet_chat_message', found.message.id, before, {
    adminHiddenAt: found.message.adminHiddenAt,
    reason,
  }, reason);
  return { row: adminPetChatMessages({ flag: 'all' }).find((item) => item.id === found.message.id) };
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

function effectivePetChatDailyLimit() {
  return currentOpsConfig().ai.petChatDailyLimit;
}

function effectivePetAvatarDailyLimit() {
  return currentOpsConfig().ai.petAvatarDailyLimit;
}

function effectivePetCircleMaxPhotos() {
  return currentOpsConfig().social.petCircleMaxPhotos;
}

function effectiveNearbyMomentTtlMs() {
  return currentOpsConfig().social.nearbyMomentTtlDays * 24 * 60 * 60 * 1000;
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
  return usage.count < effectivePetChatDailyLimit();
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
  return usage.count < effectivePetAvatarDailyLimit();
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
      petAvatar: quotaCounter(readDailyUsage('petAvatarDailyUsage', user.phone), effectivePetAvatarDailyLimit()),
      petChat: quotaCounter(readDailyUsage('petChatDailyUsage', user.phone), effectivePetChatDailyLimit()),
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
  const mediaSafetyStatus = normalizeMediaModerationStatus(media?.moderationStatus, media);
  if (media && mediaSafetyStatus === 'pending_review') {
    return { error: '这张照片正在进行安全审核，请通过后再生成灵伴形象', retryable: true, statusCode: 409 };
  }
  if (media && (mediaSafetyStatus === 'hidden' || mediaSafetyStatus === 'rejected')) {
    return { error: '这张照片未通过平台安全审核，请重新上传合适的图片', retryable: false, statusCode: 400 };
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
      if (!isImageUrlPubliclyVisible(url)) continue;
      seen.add(url);
      urls.push(url);
    } catch {
      // Invalid image URLs are ignored; public posts should only store media upload fileUrl values.
    }
    if (urls.length >= effectivePetCircleMaxPhotos()) break;
  }
  return urls;
}

function socialMomentImageModerationError(body = {}) {
  const rawUrls = Array.isArray(body.imageUrls) ? body.imageUrls : Array.isArray(body.photoUrls) ? body.photoUrls : [];
  for (const item of rawUrls) {
    const media = mediaUploadForImageUrl(item);
    if (!media) continue;
    const status = normalizeMediaModerationStatus(media.moderationStatus, media);
    if (status === 'pending_review') return '有图片正在安全审核中，通过后才能发布';
    if (status === 'hidden' || status === 'rejected') return '有图片未通过平台安全审核，请重新选择图片';
  }
  return '';
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
  report.evidenceSnapshot = buildSocialReportEvidenceSnapshot(report);
  ensureSocialReports().unshift(report);
  return report;
}

async function createSocialMoment(user, body = {}) {
  const rawContent = String(body.content || '').replace(/\s+/g, ' ').trim();
  const violation = socialChatContentViolation('小事内容', rawContent, 280);
  if (violation) return { error: violation, statusCode: 400 };
  const content = normalizeSocialMomentContent(rawContent);
  if (!content) return { error: '先写一点今天的小事吧', statusCode: 400 };
  const pet = activePetFor(user);
  if (!pet) return { error: '请先为宠物建档后再发布小事', statusCode: 400 };
  const moderation = await evaluateContentTextModeration('小事内容', content, { ownerPhone: user.phone, scope: 'pet_circle_post' });
  if (moderation.action === 'block') {
    recordModerationSample({ ...moderation, contentText: content, ownerPhone: user.phone, scope: 'pet_circle_post' });
    return { error: moderation.message || '小事内容需要修改后再发布', statusCode: 400 };
  }
  const visibility = normalizeSocialVisibility(body.visibility);
  const imageModerationError = socialMomentImageModerationError(body);
  if (imageModerationError) return { error: imageModerationError, statusCode: 400 };
  const imageUrls = normalizeSocialMomentImageUrls(body);
  const hasImageUrlPayload = hasSocialMomentImageUrlPayload(body);
  const moment = {
    content,
    createdAt: new Date().toISOString(),
    id: `moment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    imageUrls,
    mood: String(body.mood || '').trim().slice(0, 12),
    moderation: moderationMetadataFromEvaluation(moderation, 'pet_circle_post'),
    petId: pet.id,
    phone: user.phone,
    photoCount: hasImageUrlPayload ? imageUrls.length : Math.max(0, Math.min(effectivePetCircleMaxPhotos(), Number(body.photoCount) || 0)),
    status: moderation.action === 'review' ? 'pending_review' : 'published',
    updatedAt: new Date().toISOString(),
    visibility,
  };
  if (moment.moderation) recordModerationSample({ ...moderation, contentText: content, ownerPhone: user.phone, scope: 'pet_circle_post', targetId: moment.id });
  else maybeRecordModerationQualitySample({ contentText: content, ownerPhone: user.phone, scope: 'pet_circle_post', targetId: moment.id });
  const moments = ensureSocialMoments();
  moments.unshift(moment);
  state.socialMoments = moments.slice(0, 500);
  return { moment };
}

function findSocialMomentById(postId) {
  return ensureSocialMoments().find((moment) => moment.id === postId);
}

function socialMomentAccessError(moment, viewer, options = {}) {
  if (!moment || moment.status === 'deleted' || moment.status === 'hidden' || moment.status === 'pending_review') return { error: '这条小事已不可见', statusCode: 404 };
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
  const maxAgeMs = effectiveNearbyMomentTtlMs();
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
    .filter((comment) => comment.postId === postId && (comment.status || 'published') === 'published')
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
  const publicImageUrls = visibleImageUrls(moment.imageUrls);
  return {
    commentCount: comments.length,
    createdAt: moment.createdAt,
    distance: distanceKm === undefined ? '附近' : fuzzyDistance(distanceKm),
    id: moment.id,
    imageUrl: visibleImageUrl(pet.avatarUrl),
    imageUrls: publicImageUrls,
    likedByMe: likes.some((like) => like.phone === viewer.phone),
    likeCount: likes.length,
    mood: moment.mood || undefined,
    moderationStatus: moment.status === 'pending_review' ? 'pending_review' : undefined,
    ownerId: `user-${momentUser.phone}`,
    ownerName: momentUser.ownerName || `用户${suffix}`,
    ownedByMe: moment.phone === viewer.phone,
    petName: pet.name || `灵伴${suffix}`,
    photoCount: publicImageUrls.length,
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
  const maxAgeMs = effectiveNearbyMomentTtlMs();
  const now = Date.now();
  const includeOwn = options.includeOwn !== false;
  return moments
    .map((moment, index) => {
      const momentUser = state.users[moment.phone];
      if (!momentUser) return null;
      if (!activePetFor(momentUser)) return null;
      if ((moment.status || 'published') !== 'published') return null;
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
    .filter(({ moment }) => (moment.status || 'published') === 'published')
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
    visibleImageUrl(pet?.petCircleCoverImageUrl) ||
    posts.flatMap((post) => (Array.isArray(post.imageUrls) ? post.imageUrls : [])).find(Boolean) ||
    visibleImageUrl(pet?.avatarUrl) ||
    ''
  );
}

function buildPetCircleProfile(viewer, targetUser, entries, target = {}) {
  const pet = activePetFor(targetUser);
  const cards = entries.map((entry) => entry.card).filter(Boolean);
  const suffix = targetUser.phone.slice(-4);
  return {
    avatarUrl: visibleImageUrl(pet?.avatarUrl),
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
  if (!isImageUrlPubliclyVisible(coverImageUrl)) return { error: '这张封面图正在审核或已不可用，请重新选择', statusCode: 400 };
  if (!mediaUploadForImageUrl(coverImageUrl)) {
    const downloaded = await downloadImageBuffer(coverImageUrl).catch(() => null);
    if (downloaded?.buffer?.length) {
      const safety = await moderateImageFileContentForPublicUse(downloaded.buffer.toString('base64'), user.phone, 'pet_circle_cover', pet.id);
      if (safety.action !== 'allow') return { error: safety.error, statusCode: safety.action === 'block' ? 400 : 409 };
    }
  }
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
      avatarUrl: visibleImageUrl(pet?.avatarUrl),
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

async function createPetCircleComment(postId, user, body = {}) {
  const visible = visibleSocialMomentForViewer(postId, user);
  if (visible.error) return visible;
  const { moment } = visible;
  const content = String(body.content || body.text || '').replace(/\s+/g, ' ').trim();
  if (!content) return { error: '先写一句评论吧', statusCode: 400 };
  const violation = socialChatContentViolation('评论内容', content, 140);
  if (violation) return { error: violation, statusCode: 400 };
  const moderation = await evaluateContentTextModeration('评论内容', content, { ownerPhone: user.phone, scope: 'pet_circle_comment' });
  if (moderation.action === 'block') {
    recordModerationSample({ ...moderation, contentText: content, ownerPhone: user.phone, scope: 'pet_circle_comment' });
    return { error: moderation.message || '评论内容需要修改后再发送', statusCode: 400 };
  }
  const comment = {
    content: content.slice(0, 140),
    createdAt: new Date().toISOString(),
    id: `comment-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    moderation: moderationMetadataFromEvaluation(moderation, 'pet_circle_comment'),
    phone: user.phone,
    postId,
    status: moderation.action === 'review' ? 'pending_review' : 'published',
  };
  ensureSocialComments().push(comment);
  if (comment.moderation) recordModerationSample({ ...moderation, contentText: content, ownerPhone: user.phone, scope: 'pet_circle_comment', targetId: comment.id });
  else maybeRecordModerationQualitySample({ contentText: content, ownerPhone: user.phone, scope: 'pet_circle_comment', targetId: comment.id });
  if (comment.status === 'published' && moment.phone !== user.phone) {
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
const notificationKinds = new Set(['conversation_message', 'greeting_accepted', 'greeting_request', 'health_reminder', 'medical_alert', 'pet_circle_comment', 'pet_circle_greeting', 'pet_circle_like', 'place_review', 'place_submission', 'support_reply', 'system', 'vaccine_done', 'vaccine_reminder', 'walk_invite']);

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
  if (/(support|ticket|feedback|customer-service)/.test(id)) return 'support_reply';
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

function addNotification(phone, notification, category, options = {}) {
  const normalizedCategory = normalizeNotificationCategory(notification?.category || category || inferNotificationCategory(notification));
  if (!options.force && !shouldStoreNotification(phone, normalizedCategory)) return false;
  state.notifications[phone] = state.notifications[phone] || [];
  if (state.notifications[phone].some((item) => item.id === notification.id)) return false;
  state.notifications[phone].unshift(normalizeNotificationItem(notification, normalizedCategory));
  return true;
}

function markResultNotification(record, status, statusKey = 'resultNotifiedStatus', atKey = 'resultNotifiedAt') {
  if (!record) return null;
  const normalizedStatus = String(status || '').trim();
  if (!normalizedStatus || record[statusKey] === normalizedStatus) return null;
  const notifiedAt = new Date().toISOString();
  record[statusKey] = normalizedStatus;
  record[atKey] = notifiedAt;
  return notifiedAt;
}

function socialReportTargetLabel(targetType) {
  if (targetType === 'post') return '小事';
  if (targetType === 'comment') return '评论';
  return '内容';
}

function notifySocialReportResolution(report, actionOrStatus, reason = '') {
  if (!report) return false;
  const rawStatus = String(actionOrStatus || report.status || '').trim();
  const status = rawStatus === 'hide' || rawStatus === 'delete' ? 'valid' : rawStatus;
  if (!['valid', 'invalid', 'closed'].includes(status)) return false;
  const targetLabel = socialReportTargetLabel(report.targetType);
  const reasonText = String(reason || report.reviewReason || '').trim();
  let changed = false;
  const reporterCanNotify = Boolean(report.phone && state.users?.[report.phone]);
  const reporterNotifiedAt = reporterCanNotify ? markResultNotification(report, status) : null;
  if (reporterNotifiedAt) {
    const title = status === 'valid' ? '举报已处理' : status === 'invalid' ? '举报未通过' : '举报已关闭';
    const text =
      status === 'valid'
        ? `你提交的${targetLabel}举报已核实并处理，感谢帮助维护社区环境。`
        : status === 'invalid'
          ? `你提交的${targetLabel}举报暂未发现明确违规${reasonText ? `：${reasonText}。` : '。'}`
          : `你提交的${targetLabel}举报已关闭${reasonText ? `：${reasonText}。` : '。'}`;
    changed = addNotification(report.phone, {
      actionRoute: 'notifications',
      category: 'system',
      createdAt: reporterNotifiedAt,
      id: `n-report-result-${report.id}-${status}`,
      kind: 'system',
      read: false,
      reportId: report.id,
      text,
      title,
    }, 'system', { force: true }) || changed;
  }
  if (status === 'valid' && report.ownerPhone && state.users?.[report.ownerPhone]) {
    const ownerStatus = rawStatus === 'delete' ? 'deleted' : rawStatus === 'hide' ? 'hidden' : 'valid';
    const ownerNotifiedAt = markResultNotification(report, ownerStatus, 'ownerResultNotifiedStatus', 'ownerResultNotifiedAt');
    if (ownerNotifiedAt) {
      const actionText = ownerStatus === 'deleted' ? '删除' : ownerStatus === 'hidden' ? '隐藏' : '处理';
      changed = addNotification(report.ownerPhone, {
        actionRoute: 'safety',
        category: 'system',
        createdAt: ownerNotifiedAt,
        id: `n-report-owner-${report.id}-${ownerStatus}`,
        kind: 'system',
        read: false,
        reportId: report.id,
        text: reasonText
          ? `你发布的${targetLabel}因用户举报已被平台${actionText}，原因：${reasonText}。如有疑问可在安全中心查看或申诉。`
          : `你发布的${targetLabel}因用户举报已被平台${actionText}。如有疑问可在安全中心查看或申诉。`,
        title: `${targetLabel}已被处理`,
      }, 'system', { force: true }) || changed;
    }
  }
  return changed;
}

function notifyPlaceReviewModeration(phone, review, actionOrStatus, reason = '') {
  if (!phone || !review || !state.users?.[phone]) return false;
  const status = actionOrStatus === 'approve' ? 'approved' : actionOrStatus === 'reject' ? 'rejected' : String(actionOrStatus || review.status || '');
  if (!['approved', 'rejected'].includes(status)) return false;
  const notifiedAt = markResultNotification(review, status);
  if (!notifiedAt) return false;
  const place = (state.places || []).find((item) => item.id === review.placeId);
  const placeName = place?.name || '地点';
  const reasonText = String(reason || review.reviewReason || '').trim();
  return addNotification(phone, {
    category: 'system',
    createdAt: notifiedAt,
    id: `n-place-review-result-${review.id}-${status}`,
    kind: 'place_review',
    placeId: review.placeId,
    read: false,
    reviewId: review.id,
    text:
      status === 'approved'
        ? `你对${placeName}的点评已通过审核。`
        : `你对${placeName}的点评未通过审核${reasonText ? `：${reasonText}。` : '。'}`,
    title: status === 'approved' ? '地点点评已通过' : '地点点评未通过',
  }, 'system', { force: true });
}

function notifyPlaceSubmissionModeration(phone, submission, actionOrStatus, reason = '') {
  if (!phone || !submission || !state.users?.[phone]) return false;
  const status = actionOrStatus === 'approve' ? 'approved' : actionOrStatus === 'reject' ? 'rejected' : String(actionOrStatus || submission.status || '');
  if (!['approved', 'rejected'].includes(status)) return false;
  const notifiedAt = markResultNotification(submission, status);
  if (!notifiedAt) return false;
  const reasonText = String(reason || submission.reviewReason || '').trim();
  const points = Number(submission.contributionPoints || 0);
  const contributionText = status === 'approved' && points > 0
    ? `已记录${submission.contributionActionLabel || '地点贡献'}，+${points}贡献分。`
    : '';
  return addNotification(phone, {
    category: 'system',
    createdAt: notifiedAt,
    id: `n-place-submission-result-${submission.id}-${status}`,
    kind: 'place_submission',
    placeId: submission.approvedPlaceId || '',
    read: false,
    submissionId: submission.id,
    text:
      status === 'approved'
        ? `${submission.name || '新增地点'}已通过审核，后续会展示给附近用户。${contributionText}`
        : `${submission.name || '新增地点'}未通过审核${reasonText ? `：${reasonText}。` : '。'}`,
    title: status === 'approved' ? '新增地点已通过' : '新增地点未通过',
  }, 'system', { force: true });
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

const systemNotificationTargets = new Set(['active_today', 'all', 'phones']);
const systemNotificationActionRoutes = new Set(['discover', 'home', 'map', 'notifications', 'profile', 'safety', 'settings', 'supportTickets']);
const systemNotificationModes = new Set(['draft', 'scheduled', 'send']);
const SYSTEM_NOTIFICATION_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

function ensureSystemNotifications() {
  state.systemNotifications = Array.isArray(state.systemNotifications) ? state.systemNotifications : [];
  return state.systemNotifications;
}

function ensureNotificationTemplates() {
  state.notificationTemplates = Array.isArray(state.notificationTemplates) ? state.notificationTemplates : [];
  return state.notificationTemplates;
}

function parseNotificationPhones(value) {
  const source = Array.isArray(value) ? value.join('\n') : String(value || '');
  return Array.from(new Set(source.split(/[\s,，;；]+/).map(normalizePhone).filter(Boolean)));
}

function systemNotificationTargetPhones(target, phones) {
  const users = Object.values(state.users || {});
  if (target === 'all') return users.map((user) => user.phone).filter(Boolean);
  if (target === 'active_today') {
    return users
      .filter((user) => Date.now() - Number(user.lastSeenAt || 0) < 24 * 60 * 60 * 1000)
      .map((user) => user.phone)
      .filter(Boolean);
  }
  return parseNotificationPhones(phones).filter((phone) => Boolean(state.users?.[phone]));
}

function normalizeSystemNotificationScheduledAt(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function systemNotificationTimestampMs(item = {}) {
  return Date.parse(item.deliveredAt || item.createdAt || item.scheduledAt || '') || 0;
}

function notificationRateLimitConfig(config = currentOpsConfig()) {
  const defaults = defaultOpsConfig().notifications;
  return normalizeNotificationOpsConfig(config.notifications || {}, defaults);
}

function recentSystemNotificationCampaigns(now = Date.now()) {
  const cutoff = now - SYSTEM_NOTIFICATION_RATE_WINDOW_MS;
  return ensureSystemNotifications()
    .filter((item) => item.status === 'sent')
    .filter((item) => systemNotificationTimestampMs(item) >= cutoff);
}

function userSystemNotificationCountInWindow(phone, now = Date.now()) {
  const cutoff = now - SYSTEM_NOTIFICATION_RATE_WINDOW_MS;
  return (state.notifications?.[phone] || [])
    .filter((item) => (normalizeNotificationKind(item.kind) || inferNotificationKind(item)) === 'system')
    .filter((item) => Date.parse(item.createdAt || '') >= cutoff)
    .length;
}

function notificationRateLimitSnapshot(config = currentOpsConfig(), now = Date.now()) {
  const rateLimit = notificationRateLimitConfig(config);
  const campaignsLast24h = recentSystemNotificationCampaigns(now).length;
  return {
    campaignsLast24h,
    enabled: rateLimit.rateLimitEnabled,
    maxCampaignsPerDay: rateLimit.maxCampaignsPerDay,
    maxPerUserPerDay: rateLimit.maxPerUserPerDay,
    remainingCampaigns: rateLimit.rateLimitEnabled ? Math.max(0, rateLimit.maxCampaignsPerDay - campaignsLast24h) : rateLimit.maxCampaignsPerDay,
    windowHours: 24,
  };
}

function systemNotificationCampaignRateLimit(now = Date.now(), config = currentOpsConfig()) {
  const snapshot = notificationRateLimitSnapshot(config, now);
  if (!snapshot.enabled) return { allowed: true, snapshot };
  if (snapshot.campaignsLast24h >= snapshot.maxCampaignsPerDay) {
    return {
      allowed: false,
      message: `系统通知频控：24 小时内已发送 ${snapshot.campaignsLast24h}/${snapshot.maxCampaignsPerDay} 批`,
      snapshot,
    };
  }
  return { allowed: true, snapshot };
}

function systemNotificationUserRateLimited(phone, now = Date.now(), config = currentOpsConfig()) {
  const rateLimit = notificationRateLimitConfig(config);
  if (!rateLimit.rateLimitEnabled) return false;
  return userSystemNotificationCountInWindow(phone, now) >= rateLimit.maxPerUserPerDay;
}

function defaultNotificationTemplates() {
  return [
    {
      actionRoute: 'notifications',
      builtin: true,
      id: 'builtin-maintenance',
      name: '维护提醒',
      respectUserSettings: false,
      text: '灵伴将在稍后进行服务维护，期间部分功能可能短暂不可用。维护完成后我们会尽快恢复。',
      title: '服务维护提醒',
    },
    {
      actionRoute: 'safety',
      builtin: true,
      id: 'builtin-safety',
      name: '安全提醒',
      respectUserSettings: false,
      text: '我们发现你的账号有一条需要留意的安全提醒，请前往安全中心查看详情。',
      title: '账号安全提醒',
    },
    {
      actionRoute: 'supportTickets',
      builtin: true,
      id: 'builtin-support',
      name: '客服进度',
      respectUserSettings: true,
      text: '你的反馈有新的处理进展，请到我的反馈里查看。',
      title: '反馈进度更新',
    },
  ];
}

function normalizeNotificationTemplate(item) {
  return {
    actionRoute: systemNotificationActionRoutes.has(String(item.actionRoute || '')) ? String(item.actionRoute || '') : '',
    builtin: Boolean(item.builtin),
    createdAt: item.createdAt || '',
    createdBy: item.createdBy || '',
    id: String(item.id || `notification-template-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    name: String(item.name || item.title || '通知模板').trim().slice(0, 32),
    respectUserSettings: item.respectUserSettings !== false,
    text: String(item.text || '').trim().slice(0, 240),
    title: String(item.title || '').trim().slice(0, 48),
  };
}

function adminNotificationTemplates() {
  const custom = ensureNotificationTemplates().map((item) => normalizeNotificationTemplate(item)).filter((item) => item.title && item.text);
  return [...defaultNotificationTemplates(), ...custom];
}

function createNotificationTemplate(admin, body = {}) {
  const template = normalizeNotificationTemplate({
    actionRoute: body.actionRoute,
    createdAt: new Date().toISOString(),
    createdBy: admin?.username || 'admin',
    name: body.name,
    respectUserSettings: body.respectUserSettings !== false,
    text: body.text,
    title: body.title,
  });
  if (!template.name) return { error: '请填写模板名称', statusCode: 400 };
  if (!template.title) return { error: '请填写通知标题', statusCode: 400 };
  if (!template.text) return { error: '请填写通知内容', statusCode: 400 };
  ensureNotificationTemplates().unshift(template);
  state.notificationTemplates = state.notificationTemplates.slice(0, 80);
  writeAdminAudit(admin, 'notification.template.create', 'notification_template', template.id, null, template, template.name);
  return { template, templates: adminNotificationTemplates() };
}

function removeNotificationTemplate(admin, id) {
  const before = ensureNotificationTemplates();
  const target = before.find((item) => item.id === id);
  if (!target) return { error: '通知模板不存在或内置模板不可删除', statusCode: 404 };
  state.notificationTemplates = before.filter((item) => item.id !== id);
  writeAdminAudit(admin, 'notification.template.delete', 'notification_template', id, target, null, target.name || id);
  return { templates: adminNotificationTemplates() };
}

function adminPushDevices() {
  return Object.entries(state.pushDevices || {}).flatMap(([phone, devices]) => {
    const user = state.users?.[phone];
    return (Array.isArray(devices) ? devices : []).map((device) => ({
      deviceId: device.deviceId || '',
      ownerName: user?.ownerName || `用户${String(phone).slice(-4)}`,
      phone,
      platform: device.platform || 'unknown',
      tokenTail: String(device.token || '').slice(-8),
      updatedAt: device.updatedAt || '',
    }));
  }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function systemNotificationItem(item) {
  const targetPhones = Array.isArray(item.targetPhones) ? item.targetPhones : [];
  return {
    actionRoute: item.actionRoute || '',
    audienceCount: Number(item.audienceCount || targetPhones.length || 0),
    canceledAt: item.canceledAt || '',
    canceledBy: item.canceledBy || '',
    createdAt: item.createdAt,
    createdBy: item.createdBy || 'admin',
    deliveredAt: item.deliveredAt || '',
    deliveredCount: Number(item.deliveredCount || 0),
    failedPhones: Array.isArray(item.failedPhones) ? item.failedPhones.slice(0, 20) : [],
    failedReason: item.failedReason || '',
    id: item.id,
    mode: item.mode || (item.status === 'draft' ? 'draft' : item.status === 'scheduled' ? 'scheduled' : 'send'),
    phonesInput: item.phonesInput || '',
    rateLimitSnapshot: item.rateLimitSnapshot || null,
    rateLimitedCount: Number(item.rateLimitedCount || 0),
    rateLimitedPhones: Array.isArray(item.rateLimitedPhones) ? item.rateLimitedPhones.slice(0, 20) : [],
    respectUserSettings: item.respectUserSettings !== false,
    revokedCount: Number(item.revokedCount || 0),
    scheduledAt: item.scheduledAt || '',
    skippedCount: Number(item.skippedCount || 0),
    status: item.status || 'sent',
    target: item.target || 'phones',
    targetPhones: targetPhones.slice(0, 30),
    text: item.text || '',
    title: item.title || '',
  };
}

function adminSystemNotifications() {
  processDueSystemNotifications();
  const campaigns = ensureSystemNotifications().map(systemNotificationItem)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 200);
  const devices = adminPushDevices();
  const users = Object.values(state.users || {});
  return {
    campaigns,
    devices: devices.slice(0, 200),
    rateLimit: notificationRateLimitSnapshot(),
    summary: {
      activeToday: users.filter((user) => Date.now() - Number(user.lastSeenAt || 0) < 24 * 60 * 60 * 1000).length,
      campaigns: campaigns.length,
      devices: devices.length,
      drafts: campaigns.filter((item) => item.status === 'draft').length,
      scheduled: campaigns.filter((item) => item.status === 'scheduled').length,
      users: users.length,
    },
    templates: adminNotificationTemplates(),
  };
}

function createSystemNotification(admin, body = {}) {
  const title = String(body.title || '').trim().slice(0, 48);
  const text = String(body.text || '').trim().slice(0, 240);
  if (!title) return { error: '请填写通知标题', statusCode: 400 };
  if (!text) return { error: '请填写通知内容', statusCode: 400 };
  const targetInput = String(body.target || 'phones').trim();
  const target = systemNotificationTargets.has(targetInput) ? targetInput : 'phones';
  const actionRouteInput = String(body.actionRoute || '').trim();
  const actionRoute = systemNotificationActionRoutes.has(actionRouteInput) ? actionRouteInput : '';
  const targetPhones = systemNotificationTargetPhones(target, body.phones || body.targetPhones);
  if (!targetPhones.length) return { error: '没有可触达的目标用户', statusCode: 400 };
  const now = new Date().toISOString();
  const notification = {
    actionRoute,
    audienceCount: targetPhones.length,
    createdAt: now,
    createdBy: admin?.username || 'admin',
    deliveredCount: 0,
    failedPhones: [],
    id: `system-notification-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    respectUserSettings: body.respectUserSettings !== false,
    skippedCount: 0,
    status: 'sent',
    target,
    targetPhones,
    text,
    title,
  };
  for (const phone of targetPhones) {
    const added = addNotification(phone, {
      actionRoute: actionRoute || undefined,
      campaignId: notification.id,
      category: 'system',
      createdAt: now,
      id: `${notification.id}-${phone}`,
      kind: 'system',
      read: false,
      text,
      title,
    }, 'system', { force: !notification.respectUserSettings });
    if (added) notification.deliveredCount += 1;
    else {
      notification.skippedCount += 1;
      notification.failedPhones.push(phone);
    }
  }
  ensureSystemNotifications().unshift(notification);
  state.systemNotifications = state.systemNotifications.slice(0, 300);
  writeAdminAudit(admin, 'notification.system.send', 'system_notification', notification.id, null, systemNotificationItem(notification), title);
  return { notification: systemNotificationItem(notification), summary: adminSystemNotifications().summary };
}

function deliverManagedSystemNotification(notification, admin, reason = '发送系统通知') {
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const targetPhones = systemNotificationTargetPhones(notification.target, notification.phonesInput || notification.targetPhones);
  const campaignRate = systemNotificationCampaignRateLimit(nowMs);
  notification.audienceCount = targetPhones.length;
  notification.deliveredAt = now;
  notification.deliveredCount = 0;
  notification.failedPhones = [];
  notification.rateLimitSnapshot = campaignRate.snapshot;
  notification.rateLimitedCount = 0;
  notification.rateLimitedPhones = [];
  notification.skippedCount = 0;
  notification.targetPhones = targetPhones;
  notification.updatedAt = now;
  if (!targetPhones.length) {
    notification.failedReason = '没有可触达的目标用户';
    notification.status = 'failed';
    writeAdminAudit(admin, 'notification.system.failed', 'system_notification', notification.id, null, systemNotificationItem(notification), reason);
    return false;
  }
  if (!campaignRate.allowed) {
    notification.failedReason = campaignRate.message;
    notification.status = 'failed';
    writeAdminAudit(admin, 'notification.system.failed', 'system_notification', notification.id, null, systemNotificationItem(notification), campaignRate.message);
    return false;
  }
  for (const phone of targetPhones) {
    if (systemNotificationUserRateLimited(phone, nowMs)) {
      notification.skippedCount += 1;
      notification.rateLimitedCount += 1;
      if (notification.rateLimitedPhones.length < 50) notification.rateLimitedPhones.push(phone);
      notification.failedPhones.push(phone);
      continue;
    }
    const added = addNotification(phone, {
      actionRoute: notification.actionRoute || undefined,
      campaignId: notification.id,
      category: 'system',
      createdAt: now,
      id: `${notification.id}-${phone}`,
      kind: 'system',
      read: false,
      text: notification.text,
      title: notification.title,
    }, 'system', { force: !notification.respectUserSettings });
    if (added) notification.deliveredCount += 1;
    else {
      notification.skippedCount += 1;
      notification.failedPhones.push(phone);
    }
  }
  notification.failedReason = '';
  notification.status = 'sent';
  writeAdminAudit(admin, 'notification.system.send', 'system_notification', notification.id, null, systemNotificationItem(notification), reason);
  return true;
}

function createManagedSystemNotification(admin, body = {}) {
  const title = String(body.title || '').trim().slice(0, 48);
  const text = String(body.text || '').trim().slice(0, 240);
  if (!title) return { error: '请填写通知标题', statusCode: 400 };
  if (!text) return { error: '请填写通知内容', statusCode: 400 };
  const modeInput = String(body.mode || 'send').trim();
  const mode = systemNotificationModes.has(modeInput) ? modeInput : 'send';
  const targetInput = String(body.target || 'phones').trim();
  const target = systemNotificationTargets.has(targetInput) ? targetInput : 'phones';
  const actionRouteInput = String(body.actionRoute || '').trim();
  const actionRoute = systemNotificationActionRoutes.has(actionRouteInput) ? actionRouteInput : '';
  const phonesInput = Array.isArray(body.phones || body.targetPhones) ? (body.phones || body.targetPhones).join('\n') : String(body.phones || body.targetPhones || '');
  const targetPhones = systemNotificationTargetPhones(target, phonesInput);
  if (mode !== 'draft' && !targetPhones.length) return { error: '没有可触达的目标用户', statusCode: 400 };
  const scheduledAt = mode === 'scheduled' ? normalizeSystemNotificationScheduledAt(body.scheduledAt) : '';
  if (mode === 'scheduled') {
    if (!scheduledAt) return { error: '请填写正确的定时发送时间', statusCode: 400 };
    if (new Date(scheduledAt).getTime() <= Date.now() + 30 * 1000) return { error: '定时发送时间需要晚于当前时间至少 30 秒', statusCode: 400 };
  }
  const now = new Date().toISOString();
  const notification = {
    actionRoute,
    audienceCount: mode === 'draft' ? 0 : targetPhones.length,
    createdAt: now,
    createdBy: admin?.username || 'admin',
    deliveredCount: 0,
    failedPhones: [],
    id: `system-notification-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    mode,
    phonesInput,
    respectUserSettings: body.respectUserSettings !== false,
    scheduledAt,
    skippedCount: 0,
    status: mode === 'draft' ? 'draft' : mode === 'scheduled' ? 'scheduled' : 'sent',
    target,
    targetPhones: mode === 'draft' || mode === 'scheduled' ? [] : targetPhones,
    text,
    title,
  };
  if (mode === 'send') deliverManagedSystemNotification(notification, admin, body.reason || '发送系统通知');
  else writeAdminAudit(admin, mode === 'draft' ? 'notification.system.draft' : 'notification.system.schedule', 'system_notification', notification.id, null, systemNotificationItem(notification), title);
  ensureSystemNotifications().unshift(notification);
  state.systemNotifications = state.systemNotifications.slice(0, 300);
  return { notification: systemNotificationItem(notification), summary: adminSystemNotifications().summary };
}

function revokeSystemNotification(admin, id, body = {}) {
  const notification = ensureSystemNotifications().find((item) => item.id === id);
  if (!notification) return { error: '系统通知不存在', statusCode: 404 };
  if (notification.status === 'canceled') return { notification: systemNotificationItem(notification), summary: adminSystemNotifications().summary };
  const before = systemNotificationItem(notification);
  const now = new Date().toISOString();
  let revokedCount = 0;
  if (notification.status === 'sent') {
    for (const [phone, items] of Object.entries(state.notifications || {})) {
      const current = Array.isArray(items) ? items : [];
      const next = current.filter((item) => item.campaignId !== id);
      revokedCount += current.length - next.length;
      state.notifications[phone] = next;
    }
  }
  notification.canceledAt = now;
  notification.canceledBy = admin?.username || 'admin';
  notification.revokedCount = revokedCount;
  notification.status = 'canceled';
  notification.updatedAt = now;
  writeAdminAudit(admin, before.status === 'sent' ? 'notification.system.revoke' : 'notification.system.cancel', 'system_notification', id, before, systemNotificationItem(notification), body.reason || '运营后台撤回通知');
  return { notification: systemNotificationItem(notification), summary: adminSystemNotifications().summary };
}

function processDueSystemNotifications() {
  let changed = false;
  const systemAdmin = { role: 'system', username: 'system' };
  for (const notification of ensureSystemNotifications()) {
    if (notification.status !== 'scheduled' || !notification.scheduledAt) continue;
    if (new Date(notification.scheduledAt).getTime() > Date.now()) continue;
    deliverManagedSystemNotification(notification, systemAdmin, '定时系统通知到点发送');
    changed = true;
  }
  if (changed) saveState();
  return changed;
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

function adminUserSummary(user) {
  const pets = Array.isArray(user.pets) ? user.pets : [];
  const activePet = selectedPetFor(user);
  const socialPosts = ensureSocialMoments().filter((item) => item.phone === user.phone && item.status !== 'deleted');
  const reportsAgainstUser = ensureSocialReports().filter((report) => report.ownerPhone === user.phone);
  const sanctionSummary = userSanctionSummary(user.phone);
  const adminNotes = normalizeAdminNotes(user.adminNotes);
  const adminRiskTags = normalizeAdminRiskTags(user.adminRiskTags);
  user.adminNotes = adminNotes;
  user.adminRiskTags = adminRiskTags;
  return {
    activePet,
    adminLatestNote: adminNotes[0]?.content || '',
    adminLatestNoteAt: adminNotes[0]?.createdAt || '',
    adminLatestNoteBy: adminNotes[0]?.createdBy || '',
    adminNoteCount: adminNotes.length,
    adminRiskTagLabels: adminRiskTags.map(adminUserRiskTagLabel),
    adminRiskTags,
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt || 0,
    ownerAvatarUrl: user.ownerAvatarUrl || '',
    ownerBio: user.ownerBio || '',
    ownerName: user.ownerName || `用户${user.phone.slice(-4)}`,
    permissions: normalizePermissionState(user.permissions),
    petCount: pets.length,
    pets,
    phone: user.phone,
    reportsAgainstCount: reportsAgainstUser.length,
    sanctions: sanctionSummary,
    settings: normalizeUserSettings(user.settings),
    socialPostCount: socialPosts.length,
    status: accountStatusFor(user),
  };
}

function adminAddUserNote(admin, phone, body = {}) {
  const normalizedPhone = normalizePhone(phone);
  const user = normalizedPhone ? state.users[normalizedPhone] : null;
  if (!user) return { error: '用户不存在', statusCode: 404 };
  const content = String(body.content || '').replace(/\s+/g, ' ').trim();
  if (!content) return { error: '请填写运营备注', statusCode: 400 };
  if (content.length > 500) return { error: '运营备注最多 500 字', statusCode: 400 };
  const before = adminUserSummary(user);
  const note = {
    content,
    createdAt: new Date().toISOString(),
    createdBy: admin?.username || 'admin',
    id: `user-note-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  };
  user.adminNotes = [note, ...normalizeAdminNotes(user.adminNotes)].slice(0, 30);
  const after = adminUserSummary(user);
  writeAdminAudit(admin, 'user.note.create', 'user', normalizedPhone, before, { ...after, note }, content);
  return { notes: user.adminNotes, user: after };
}

function adminUpdateUserRiskTags(admin, phone, body = {}) {
  const normalizedPhone = normalizePhone(phone);
  const user = normalizedPhone ? state.users[normalizedPhone] : null;
  if (!user) return { error: '用户不存在', statusCode: 404 };
  const before = adminUserSummary(user);
  const value = body.tags ?? body.tag ?? body.value;
  const unknownTags = unknownAdminRiskTags(value);
  if (unknownTags.length) return { error: `无法识别风险标签：${unknownTags.join('、')}`, statusCode: 400 };
  const tags = normalizeAdminRiskTags(value);
  user.adminRiskTags = tags;
  const after = adminUserSummary(user);
  writeAdminAudit(admin, 'user.risk_tags.update', 'user', normalizedPhone, before, after, adminReason(body, '更新用户风险标签'));
  return { options: ADMIN_USER_RISK_TAGS, user: after };
}

function conversationMessageCountForMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  return Object.values(value).reduce((sum, messages) => sum + (Array.isArray(messages) ? messages.length : 0), 0);
}

function deleteObjectKeysByPredicate(objectValue, predicate) {
  if (!objectValue || typeof objectValue !== 'object' || Array.isArray(objectValue)) return 0;
  let count = 0;
  for (const key of Object.keys(objectValue)) {
    if (!predicate(key, objectValue[key])) continue;
    delete objectValue[key];
    count += 1;
  }
  return count;
}

function businessDataIdsForUser(phone) {
  const postIds = new Set(ensureSocialMoments().filter((item) => item.phone === phone).map((item) => item.id).filter(Boolean));
  const commentIds = new Set(
    ensureSocialComments()
      .filter((item) => item.phone === phone || postIds.has(item.postId))
      .map((item) => item.id)
      .filter(Boolean),
  );
  const reportIds = new Set(
    ensureSocialReports()
      .filter((item) => item.phone === phone || item.ownerPhone === phone || postIds.has(item.targetId) || commentIds.has(item.targetId))
      .map((item) => item.id)
      .filter(Boolean),
  );
  const placeReviewIds = new Set((state.placeReviews?.[phone] || []).map((item) => item.id).filter(Boolean));
  const placeSubmissionIds = new Set((state.placeSubmissions?.[phone] || []).map((item) => item.id).filter(Boolean));
  return { commentIds, placeReviewIds, placeSubmissionIds, postIds, reportIds };
}

function moderationTaskMetaBelongsToClearedUser(taskId, ids) {
  const { kind, id } = splitModerationTaskId(taskId);
  if (kind === 'post') return ids.postIds.has(id);
  if (kind === 'comment') return ids.commentIds.has(id);
  if (kind === 'report') return ids.reportIds.has(id);
  if (kind === 'placeReview') return ids.placeReviewIds.has(id);
  if (kind === 'placeSubmission') return ids.placeSubmissionIds.has(id);
  return false;
}

function notificationBelongsToClearedUser(notification = {}, phone, ids) {
  const text = String(notification.id || '');
  if (notification.ownerId === `user-${phone}`) return true;
  if (notification.postId && ids.postIds.has(notification.postId)) return true;
  if (notification.commentId && ids.commentIds.has(notification.commentId)) return true;
  if (notification.reportId && ids.reportIds.has(notification.reportId)) return true;
  if (notification.conversationId === `c-${phone}`) return true;
  if (text.includes(phone)) return true;
  for (const postId of ids.postIds) if (postId && text.includes(postId)) return true;
  for (const commentId of ids.commentIds) if (commentId && text.includes(commentId)) return true;
  return false;
}

function adminUserBusinessDataSummary(phone) {
  const normalizedPhone = normalizePhone(phone);
  const user = normalizedPhone ? state.users[normalizedPhone] : null;
  if (!user) return null;
  const ids = businessDataIdsForUser(normalizedPhone);
  const healthPrefix = `${normalizedPhone}:`;
  const petChatKeys = Object.keys(state.petChatMessages || {}).filter((key) => key.startsWith(healthPrefix));
  const conversationCount = (state.conversations?.[normalizedPhone] || []).length +
    Object.entries(state.conversations || {}).reduce((sum, [ownerPhone, conversations]) => {
      if (ownerPhone === normalizedPhone || !Array.isArray(conversations)) return sum;
      return sum + conversations.filter((item) => item.id === `c-${normalizedPhone}` || item.ownerId === `user-${normalizedPhone}`).length;
    }, 0);
  const conversationMessageCount = conversationMessageCountForMap(state.conversationMessages?.[normalizedPhone]) +
    Object.entries(state.conversationMessages || {}).reduce((sum, [ownerPhone, map]) => {
      if (ownerPhone === normalizedPhone || !map || typeof map !== 'object' || Array.isArray(map)) return sum;
      const messages = map[`c-${normalizedPhone}`];
      return sum + (Array.isArray(messages) ? messages.length : 0);
    }, 0);
  const notificationCount = (state.notifications?.[normalizedPhone] || []).length +
    Object.entries(state.notifications || {}).reduce((sum, [ownerPhone, notifications]) => {
      if (ownerPhone === normalizedPhone || !Array.isArray(notifications)) return sum;
      return sum + notifications.filter((item) => notificationBelongsToClearedUser(item, normalizedPhone, ids)).length;
    }, 0);
  const mediaIds = new Set(Object.values(state.mediaUploads || {}).filter((item) => item?.ownerPhone === normalizedPhone).map((item) => item.mediaId).filter(Boolean));
  const avatarJobs = Object.values(state.avatarJobs || {}).filter((job) => job?.ownerPhone === normalizedPhone || mediaIds.has(job?.mediaId));
  const healthStoreCount = ['weights', 'vaccines', 'memos', 'vaccineReminders'].reduce((sum, key) => (
    sum + Object.keys(state.health?.[key] || {}).filter((itemKey) => itemKey.startsWith(healthPrefix)).length
  ), 0);
  const feedbackIds = new Set((state.feedback || []).filter((item) => item.phone === normalizedPhone).map((item) => item.id).filter(Boolean));
  const supportTicketCount = (state.supportTickets || []).filter((item) => item.phone === normalizedPhone || feedbackIds.has(item.sourceId)).length;
  return {
    aiAvatarDailyUsage: state.petAvatarDailyUsage?.[normalizedPhone] ? 1 : 0,
    avatarJobs: avatarJobs.length,
    conversations: conversationCount,
    conversationMessages: conversationMessageCount,
    feedback: feedbackIds.size,
    greetings: (state.greetings || []).filter((item) => item.fromPhone === normalizedPhone || item.targetPhone === normalizedPhone).length,
    healthStores: healthStoreCount,
    invites: (state.invites || []).filter((item) => item.fromPhone === normalizedPhone || item.targetPhone === normalizedPhone).length,
    mediaUploads: mediaIds.size,
    moderationSamples: (state.moderationSamples || []).filter((item) => item.ownerPhone === normalizedPhone || ids.postIds.has(item.targetId) || ids.commentIds.has(item.targetId)).length,
    notifications: notificationCount,
    petChatDailyUsage: state.petChatDailyUsage?.[normalizedPhone] ? 1 : 0,
    petChatMessages: petChatKeys.reduce((sum, key) => sum + (Array.isArray(state.petChatMessages?.[key]) ? state.petChatMessages[key].length : 0), 0),
    petChatThreads: petChatKeys.length,
    pets: Array.isArray(user.pets) ? user.pets.length : 0,
    placeReviews: (state.placeReviews?.[normalizedPhone] || []).length,
    placeSubmissions: (state.placeSubmissions?.[normalizedPhone] || []).length,
    pushDevices: (state.pushDevices?.[normalizedPhone] || []).length,
    socialBlocks: ensureSocialBlocks().filter((item) => item.blockerPhone === normalizedPhone || item.blockedPhone === normalizedPhone).length,
    socialComments: ids.commentIds.size,
    socialLikes: ensureSocialLikes().filter((item) => item.phone === normalizedPhone || ids.postIds.has(item.postId)).length,
    socialMoments: ids.postIds.size,
    socialReports: ids.reportIds.size,
    supportTickets: supportTicketCount,
  };
}

function adminClearUserBusinessData(admin, phone, body = {}) {
  const normalizedPhone = normalizePhone(phone);
  const user = normalizedPhone ? state.users[normalizedPhone] : null;
  if (!user) return { error: '用户不存在', statusCode: 404 };
  const reason = adminReason(body, '清理用户业务数据');
  const confirmation = String(body.confirmation || '').trim();
  if (confirmation !== normalizedPhone) return { error: '请用目标手机号确认清理动作', statusCode: 400 };
  const beforeSummary = adminUserBusinessDataSummary(normalizedPhone);
  const beforeUser = adminUserSummary(user);
  const ids = businessDataIdsForUser(normalizedPhone);
  const healthPrefix = `${normalizedPhone}:`;
  const feedbackIds = new Set((state.feedback || []).filter((item) => item.phone === normalizedPhone).map((item) => item.id).filter(Boolean));
  const mediaIds = new Set(Object.values(state.mediaUploads || {}).filter((item) => item?.ownerPhone === normalizedPhone).map((item) => item.mediaId).filter(Boolean));

  user.pets = [];
  user.activePetId = '';
  user.favoritePlaceIds = [];
  user.location = null;
  user.lastSeenAt = 0;

  ['weights', 'vaccines', 'memos', 'vaccineReminders'].forEach((key) => {
    if (!state.health?.[key]) return;
    deleteObjectKeysByPredicate(state.health[key], (itemKey) => itemKey.startsWith(healthPrefix));
  });
  deleteObjectKeysByPredicate(state.petChatMessages, (key) => key.startsWith(healthPrefix));
  deleteObjectKeysByPredicate(state.mediaUploads, (_key, item) => item?.ownerPhone === normalizedPhone);
  deleteObjectKeysByPredicate(state.avatarJobs, (_key, job) => job?.ownerPhone === normalizedPhone || mediaIds.has(job?.mediaId));
  deleteObjectKeysByPredicate(state.moderationTaskMeta, (taskId) => moderationTaskMetaBelongsToClearedUser(taskId, ids));
  if (state.petAvatarDailyUsage) delete state.petAvatarDailyUsage[normalizedPhone];
  if (state.petChatDailyUsage) delete state.petChatDailyUsage[normalizedPhone];
  if (state.placeReviews) delete state.placeReviews[normalizedPhone];
  if (state.placeSubmissions) delete state.placeSubmissions[normalizedPhone];
  if (state.notifications) delete state.notifications[normalizedPhone];
  if (state.pushDevices) delete state.pushDevices[normalizedPhone];
  if (state.conversations) delete state.conversations[normalizedPhone];
  if (state.conversationMessages) delete state.conversationMessages[normalizedPhone];

  state.socialMoments = ensureSocialMoments().filter((item) => item.phone !== normalizedPhone);
  state.socialComments = ensureSocialComments().filter((item) => item.phone !== normalizedPhone && !ids.postIds.has(item.postId));
  state.socialLikes = ensureSocialLikes().filter((item) => item.phone !== normalizedPhone && !ids.postIds.has(item.postId));
  state.socialReports = ensureSocialReports().filter((item) => item.phone !== normalizedPhone && item.ownerPhone !== normalizedPhone && !ids.postIds.has(item.targetId) && !ids.commentIds.has(item.targetId));
  state.socialBlocks = ensureSocialBlocks().filter((item) => item.blockerPhone !== normalizedPhone && item.blockedPhone !== normalizedPhone);
  state.greetings = (state.greetings || []).filter((item) => item.fromPhone !== normalizedPhone && item.targetPhone !== normalizedPhone);
  state.invites = (state.invites || []).filter((item) => item.fromPhone !== normalizedPhone && item.targetPhone !== normalizedPhone);
  state.feedback = (state.feedback || []).filter((item) => item.phone !== normalizedPhone);
  state.supportTickets = (state.supportTickets || []).filter((item) => item.phone !== normalizedPhone && !feedbackIds.has(item.sourceId));
  state.moderationSamples = (state.moderationSamples || []).filter((item) => item.ownerPhone !== normalizedPhone && !ids.postIds.has(item.targetId) && !ids.commentIds.has(item.targetId));

  Object.entries(state.conversations || {}).forEach(([ownerPhone, conversations]) => {
    if (!Array.isArray(conversations)) return;
    state.conversations[ownerPhone] = conversations.filter((item) => item.id !== `c-${normalizedPhone}` && item.ownerId !== `user-${normalizedPhone}`);
  });
  Object.entries(state.conversationMessages || {}).forEach(([ownerPhone, map]) => {
    if (!map || typeof map !== 'object' || Array.isArray(map)) return;
    delete map[`c-${normalizedPhone}`];
    if (!Object.keys(map).length) delete state.conversationMessages[ownerPhone];
  });
  Object.entries(state.notifications || {}).forEach(([ownerPhone, notifications]) => {
    if (!Array.isArray(notifications)) return;
    state.notifications[ownerPhone] = notifications.filter((item) => !notificationBelongsToClearedUser(item, normalizedPhone, ids));
  });

  const afterSummary = adminUserBusinessDataSummary(normalizedPhone);
  writeAdminAudit(admin, 'user.clear_business_data', 'user', normalizedPhone, {
    summary: beforeSummary,
    user: beforeUser,
  }, {
    summary: afterSummary,
    user: adminUserSummary(user),
  }, reason);
  return { after: afterSummary, before: beforeSummary, phone: normalizedPhone };
}

function adminPetBirthdayInfo(pet) {
  const birthday = String(pet?.birthday || '').trim();
  if (!birthday) return { key: 'unknown', label: '未知' };
  if (/^\d{4}$/u.test(birthday)) return { key: 'year', label: '仅年份' };
  if (/^\d{4}-\d{2}$/u.test(birthday)) return { key: 'month', label: '年月' };
  if (/^\d{4}-\d{2}-\d{2}$/u.test(birthday)) return { key: 'full', label: '完整日期' };
  return { key: 'invalid', label: '格式异常' };
}

function adminPetGenderLabel(gender) {
  if (gender === 'male') return '男孩';
  if (gender === 'female') return '女孩';
  return '未知';
}

function adminPetAvatarJobMap() {
  const map = new Map();
  Object.values(state.avatarJobs || {}).forEach((job) => {
    const ownerPhone = normalizePhone(job?.ownerPhone);
    if (!ownerPhone) return;
    const petIds = new Set([job?.petId, job?.acceptedPetId].map((value) => String(value || '').trim()).filter(Boolean));
    petIds.forEach((petId) => {
      const key = `${ownerPhone}:${petId}`;
      const entry = map.get(key) || { accepted: null, latest: null };
      const currentTime = analyticsTimeMs(job.updatedAt || job.createdAt);
      const latestTime = analyticsTimeMs(entry.latest?.updatedAt || entry.latest?.createdAt);
      if (!entry.latest || currentTime >= latestTime) entry.latest = job;
      if (job.status === 'ready' && job.acceptedPetId === petId) {
        const acceptedTime = analyticsTimeMs(entry.accepted?.acceptedAt || entry.accepted?.updatedAt || entry.accepted?.createdAt);
        const currentAcceptedTime = analyticsTimeMs(job.acceptedAt || job.updatedAt || job.createdAt);
        if (!entry.accepted || currentAcceptedTime >= acceptedTime) entry.accepted = job;
      }
      map.set(key, entry);
    });
  });
  return map;
}

function adminPetCalendarStats(phone, petId) {
  const key = `${phone}:${petId}`;
  const rows = [
    ...adminHealthStoreList('weights', key).map((record) => record.updatedAt || record.recordedAt || record.id),
    ...adminHealthStoreList('vaccines', key).map((record) => record.updatedAt || record.dueAt || record.id),
    ...adminHealthStoreList('memos', key).map((record) => record.updatedAt || record.createdAt || record.id),
  ];
  const latestActivityAt = rows
    .map((value) => analyticsTimeMs(value))
    .filter((value) => value > 0)
    .sort((a, b) => b - a)[0] || 0;
  return {
    count:
      adminHealthStoreList('weights', key).length +
      adminHealthStoreList('vaccines', key).length +
      adminHealthStoreList('memos', key).length,
    latestActivityAt,
  };
}

function adminPetAvatarStatus(pet, acceptedAvatarJob) {
  const hasAvatar = Boolean(String(pet?.avatarUrl || '').trim());
  const hasAiAvatar = Boolean(hasAvatar && acceptedAvatarJob?.acceptedPetId === pet?.id && acceptedAvatarJob?.status === 'ready');
  if (hasAiAvatar) return { key: 'ai', label: 'AI 形象已应用' };
  if (hasAvatar) return { key: 'basic', label: '普通头像' };
  return { key: 'missing', label: '缺头像' };
}

function findAdminPetById(petIdInput) {
  const petId = String(petIdInput || '').trim();
  if (!petId) return null;
  for (const user of Object.values(state.users || {})) {
    const phone = normalizePhone(user?.phone);
    if (!phone || !Array.isArray(user.pets)) continue;
    const petIndex = user.pets.findIndex((item) => item?.id === petId);
    if (petIndex < 0) continue;
    return { phone, pet: user.pets[petIndex], petIndex, user };
  }
  return null;
}

function notifyPetMediaModeration(phone, pet, kind, reason) {
  if (!phone || !pet || !state.users?.[phone]) return false;
  const kindLabel = kind === 'cover' ? '宠友圈封面' : kind === 'ai-avatar' ? 'AI 灵伴形象' : '宠物头像';
  const reasonText = String(reason || '').trim();
  return addNotification(phone, {
    actionRoute: 'profile',
    category: 'system',
    createdAt: new Date().toISOString(),
    id: `n-pet-media-${pet.id}-${kind}-${Date.now()}`,
    kind: 'system',
    petId: pet.id,
    read: false,
    text: reasonText
      ? `${pet.name || '宠物'}的${kindLabel}因平台规则已被处理，原因：${reasonText}。你可以重新上传合适的图片。`
      : `${pet.name || '宠物'}的${kindLabel}因平台规则已被处理。你可以重新上传合适的图片。`,
    title: `${kindLabel}已处理`,
  }, 'system', { force: true });
}

function adminClearPetMedia(admin, petId, kindInput, body = {}) {
  const kind = String(kindInput || '').trim();
  const allowedKinds = new Set(['ai-avatar', 'avatar', 'cover']);
  if (!allowedKinds.has(kind)) return { error: '不支持的宠物媒体处理类型', statusCode: 400 };
  const found = findAdminPetById(petId);
  if (!found) return { error: '宠物档案不存在', statusCode: 404 };
  const { phone, pet, user } = found;
  const reason = String(body?.reason || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!reason) return { error: '请填写处理原因', statusCode: 400 };
  const before = cloneJson({
    avatarUrl: pet.avatarUrl || '',
    pet,
    petCircleCoverImageUrl: pet.petCircleCoverImageUrl || '',
  });
  const now = new Date().toISOString();
  let changed = false;
  let clearedAvatarJobCount = 0;

  if (kind === 'cover') {
    if (!pet.petCircleCoverImageUrl) return { error: '这只宠物暂无宠友圈封面可清空', statusCode: 400 };
    delete pet.petCircleCoverImageUrl;
    changed = true;
  } else {
    const acceptedJobs = Object.values(state.avatarJobs || {}).filter((job) => job?.ownerPhone === phone && job.acceptedPetId === pet.id);
    if (!pet.avatarUrl && !acceptedJobs.length) return { error: '这只宠物暂无头像或 AI 形象可清空', statusCode: 400 };
    if (pet.avatarUrl) {
      delete pet.avatarUrl;
      changed = true;
    }
    acceptedJobs.forEach((job) => {
      job.adminClearedAt = now;
      job.adminClearedReason = reason;
      job.adminClearedBy = admin?.username || 'admin';
      job.acceptedPetId = '';
      job.acceptedAt = '';
      clearedAvatarJobCount += 1;
      touchAvatarJob(job);
    });
    changed = changed || clearedAvatarJobCount > 0;
  }

  if (!changed) return { error: '没有可处理的宠物媒体', statusCode: 400 };
  pet.updatedAt = now;
  const after = cloneJson({
    avatarUrl: pet.avatarUrl || '',
    clearedAvatarJobCount,
    pet,
    petCircleCoverImageUrl: pet.petCircleCoverImageUrl || '',
  });
  const action = kind === 'cover' ? 'pet.media.clear_cover' : kind === 'ai-avatar' ? 'pet.media.clear_ai_avatar' : 'pet.media.clear_avatar';
  writeAdminAudit(admin, action, 'pet', pet.id, before, after, reason);
  notifyPetMediaModeration(phone, pet, kind, reason);
  return {
    item: adminPetProfiles({ q: pet.id, limit: 1 }).items.find((row) => row.id === pet.id) || null,
    phone: user.phone,
    petId: pet.id,
  };
}

function adminPetProfiles(options = {}) {
  const speciesFilter = String(options.species || 'all');
  const birthdayFilter = String(options.birthday || 'all');
  const avatarFilter = String(options.avatar || 'all');
  const q = String(options.q || '').trim().toLowerCase();
  const limit = Math.floor(clampNumber(options.limit, 300, 1, ADMIN_EXPORT_ROW_LIMIT));
  const avatarJobs = adminPetAvatarJobMap();
  const socialPosts = ensureSocialMoments();
  const placeReviews = adminPlaceReviews();
  const rows = [];

  Object.values(state.users || {}).forEach((user) => {
    const phone = normalizePhone(user?.phone);
    if (!phone) return;
    const ownerName = user.ownerName || `用户${phone.slice(-4)}`;
    const pets = Array.isArray(user.pets) ? user.pets : [];
    pets.forEach((pet, index) => {
      if (!pet?.id) return;
      const avatarJobInfo = avatarJobs.get(`${phone}:${pet.id}`) || {};
      const avatarJob = avatarJobInfo.latest || null;
      const acceptedAvatarJob = avatarJobInfo.accepted || null;
      const birthdayInfo = adminPetBirthdayInfo(pet);
      const avatarStatus = adminPetAvatarStatus(pet, acceptedAvatarJob);
      const calendarStats = adminPetCalendarStats(phone, pet.id);
      const petPosts = socialPosts.filter((post) => post.phone === phone && post.petId === pet.id && post.status !== 'deleted');
      const petReviews = placeReviews.filter((review) => review.ownerPhone === phone);
      const createdAt = pet.createdAt || isoDateFromTimestampId(pet.id) || user.createdAt || '';
      const latestActivityAt = [
        analyticsTimeMs(pet.updatedAt),
        analyticsTimeMs(calendarStats.latestActivityAt),
        ...petPosts.map((post) => analyticsTimeMs(post.updatedAt || post.createdAt)),
        ...petReviews.map((review) => analyticsTimeMs(review.reviewedAt || review.createdAt)),
        analyticsTimeMs(avatarJob?.updatedAt || avatarJob?.createdAt),
        analyticsTimeMs(createdAt),
      ].filter((value) => value > 0).sort((a, b) => b - a)[0] || 0;
      rows.push({
        ageLabel: petAgeLabel(pet.birthday),
        avatarJobId: avatarJob?.id || '',
        avatarStatusKey: avatarStatus.key,
        avatarStatusLabel: avatarStatus.label,
        avatarUrl: pet.avatarUrl || '',
        birthday: pet.birthday || '',
        birthdayCompleteness: birthdayInfo.key,
        birthdayCompletenessLabel: birthdayInfo.label,
        breed: pet.breed || '待完善',
        calendarCount: calendarStats.count,
        createdAt,
        gender: pet.gender || 'unknown',
        genderLabel: adminPetGenderLabel(pet.gender),
        hasAvatar: Boolean(pet.avatarUrl),
        hasPetCircleCover: Boolean(pet.petCircleCoverImageUrl),
        id: pet.id,
        isActivePet: user.activePetId ? user.activePetId === pet.id : index === 0,
        latestActivityAt,
        latestAvatarJobStatus: avatarJob?.status || 'none',
        name: pet.name || '未命名宠物',
        ownerName,
        ownerStatus: accountStatusFor(user),
        petCircleCoverImageUrl: pet.petCircleCoverImageUrl || '',
        phone,
        placeReviewCount: petReviews.length,
        socialPostCount: petPosts.length,
        species: pet.species === 'cat' ? 'cat' : pet.species === 'dog' ? 'dog' : 'other',
        speciesLabel: petSpeciesLabel(pet.species),
        weightKg: pet.weightKg || '',
      });
    });
  });

  const filtered = rows
    .filter((row) => speciesFilter === 'all' || row.species === speciesFilter)
    .filter((row) => birthdayFilter === 'all' || row.birthdayCompleteness === birthdayFilter)
    .filter((row) => avatarFilter === 'all' || (avatarFilter === 'cover' ? row.hasPetCircleCover : row.avatarStatusKey === avatarFilter))
    .filter((row) => {
      if (!q) return true;
      return [
        row.id,
        row.name,
        row.phone,
        row.ownerName,
        row.species,
        row.speciesLabel,
        row.breed,
        row.genderLabel,
        row.birthday,
        row.birthdayCompletenessLabel,
        row.avatarStatusLabel,
        row.avatarJobId,
      ].some((value) => String(value || '').toLowerCase().includes(q));
    })
    .sort((a, b) => Number(b.latestActivityAt || 0) - Number(a.latestActivityAt || 0) || String(a.id).localeCompare(String(b.id)));

  const summarySource = filtered;
  const summary = {
    aiAvatar: summarySource.filter((row) => row.avatarStatusKey === 'ai').length,
    all: summarySource.length,
    cats: summarySource.filter((row) => row.species === 'cat').length,
    cover: summarySource.filter((row) => row.hasPetCircleCover).length,
    dogs: summarySource.filter((row) => row.species === 'dog').length,
    fullBirthday: summarySource.filter((row) => row.birthdayCompleteness === 'full').length,
    missingAvatar: summarySource.filter((row) => row.avatarStatusKey === 'missing').length,
    partialBirthday: summarySource.filter((row) => ['year', 'month'].includes(row.birthdayCompleteness)).length,
    socialPosts: summarySource.reduce((sum, row) => sum + Number(row.socialPostCount || 0), 0),
    totalPets: rows.length,
    unknownBirthday: summarySource.filter((row) => row.birthdayCompleteness === 'unknown').length,
  };

  return {
    filters: { avatar: avatarFilter, birthday: birthdayFilter, q: options.q || '', species: speciesFilter },
    items: filtered.slice(0, limit),
    summary,
  };
}

function adminHealthStoreList(storeName, key) {
  const store = state.health?.[storeName] || {};
  const rows = store[key];
  return Array.isArray(rows) ? rows : [];
}

function adminHealthRecordDate(value, fallback = '') {
  return calendarDatePart(value) || calendarDatePart(fallback) || isoDateFromTimestampId(fallback) || '';
}

function adminPetCalendarSource(type, record, aiMemoIds, aiWeightIds) {
  if (type === 'memo' && record?.source === 'pet_circle') return { key: 'pet_circle', label: '宠友圈同步' };
  if (type === 'memo' && aiMemoIds.has(record?.id)) return { key: 'ai_chat', label: 'AI 对话' };
  if (type === 'weight' && aiWeightIds.has(record?.id)) return { key: 'ai_chat', label: 'AI 对话' };
  if (type === 'memo' && String(record?.title || '').includes('就医提醒')) return { key: 'ai_chat', label: 'AI 医疗门禁' };
  return { key: 'manual', label: '用户记录' };
}

function adminPetCalendarRecords(options = {}) {
  const typeFilter = String(options.type || 'all');
  const statusFilter = String(options.status || 'all');
  const sourceFilter = String(options.source || 'all');
  const q = String(options.q || '').trim().toLowerCase();
  const from = adminHealthRecordDate(options.from);
  const to = adminHealthRecordDate(options.to);
  const limit = Math.floor(clampNumber(options.limit, 300, 1, ADMIN_EXPORT_ROW_LIMIT));
  const messages = flattenPetChatMessagesForAnalytics();
  const aiMemoIds = new Set(messages.map((message) => message.createdMemo?.id).filter(Boolean));
  const aiWeightIds = new Set(messages.map((message) => message.createdWeight?.id).filter(Boolean));
  const records = [];

  Object.values(state.users || {}).forEach((user) => {
    const phone = normalizePhone(user?.phone);
    if (!phone) return;
    const pets = Array.isArray(user.pets) ? user.pets : [];
    const ownerName = user.ownerName || `用户${phone.slice(-4)}`;
    pets.forEach((pet) => {
      if (!pet?.id) return;
      const key = `${phone}:${pet.id}`;
      const base = {
        ownerName,
        petBreed: pet.breed || '',
        petId: pet.id,
        petName: pet.name || '未命名宠物',
        petSpecies: pet.species === 'cat' ? 'cat' : 'dog',
        phone,
      };
      const reminderIds = new Set(adminHealthStoreList('vaccineReminders', key));

      adminHealthStoreList('weights', key).forEach((record) => {
        const date = adminHealthRecordDate(record.recordedAt, record.id);
        const source = adminPetCalendarSource('weight', record, aiMemoIds, aiWeightIds);
        records.push({
          ...base,
          date,
          detail: `${Number(record.kg) || 0} kg${record.note ? ` · ${record.note}` : ''}`,
          id: `weight:${phone}:${pet.id}:${record.id}`,
          rawStatus: 'recorded',
          sourceId: record.id,
          sourceKey: source.key,
          sourceLabel: source.label,
          status: 'recorded',
          statusLabel: '已记录',
          title: '体重记录',
          type: 'weight',
          typeLabel: '体重',
          updatedAt: date,
        });
      });

      adminHealthStoreList('vaccines', key).forEach((record) => {
        const date = adminHealthRecordDate(record.dueAt, record.id);
        const days = daysUntilDate(date);
        const rawStatus = record.status === 'done' ? 'done' : days !== null && days < 0 ? 'overdue' : 'due';
        const source = adminPetCalendarSource('vaccine', record, aiMemoIds, aiWeightIds);
        records.push({
          ...base,
          date,
          daysUntil: days,
          detail: `${record.name || '疫苗/驱虫'} · ${vaccineStatusCopy(rawStatus)}${reminderIds.has(record.id) ? ' · 已开提醒' : ''}`,
          id: `vaccine:${phone}:${pet.id}:${record.id}`,
          rawStatus,
          reminderEnabled: reminderIds.has(record.id),
          sourceId: record.id,
          sourceKey: source.key,
          sourceLabel: source.label,
          status: rawStatus,
          statusLabel: vaccineStatusCopy(rawStatus),
          title: record.name || '疫苗/驱虫',
          type: 'vaccine',
          typeLabel: '疫苗/驱虫',
          updatedAt: record.updatedAt || date,
        });
      });

      adminHealthStoreList('memos', key).forEach((record) => {
        const sourceMomentDate = record?.source === 'pet_circle' && record.sourceId
          ? ensureSocialMoments().find((item) => item.id === record.sourceId && item.phone === phone)?.createdAt
          : '';
        const date = adminHealthRecordDate(sourceMomentDate || record.createdAt, record.id || record.updatedAt);
        const source = adminPetCalendarSource('memo', record, aiMemoIds, aiWeightIds);
        records.push({
          ...base,
          date,
          detail: record.content || '',
          id: `memo:${phone}:${pet.id}:${record.id}`,
          rawStatus: 'recorded',
          sourceId: record.id,
          sourceKey: source.key,
          sourceLabel: source.label,
          status: 'recorded',
          statusLabel: '已记录',
          title: record.title || '备忘',
          type: 'memo',
          typeLabel: '备忘',
          updatedAt: record.updatedAt || record.createdAt || date,
        });
      });
    });
  });

  const filteredRecords = records
    .filter((record) => typeFilter === 'all' || record.type === typeFilter)
    .filter((record) => statusFilter === 'all' || record.status === statusFilter || record.rawStatus === statusFilter)
    .filter((record) => sourceFilter === 'all' || record.sourceKey === sourceFilter)
    .filter((record) => !from || record.date >= from)
    .filter((record) => !to || record.date <= to)
    .filter((record) => {
      if (!q) return true;
      return [
        record.id,
        record.sourceId,
        record.phone,
        record.ownerName,
        record.petId,
        record.petName,
        record.petBreed,
        record.title,
        record.detail,
        record.sourceLabel,
        record.statusLabel,
      ].some((value) => String(value || '').toLowerCase().includes(q));
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || String(a.id).localeCompare(String(b.id)));

  const summarySource = filteredRecords;
  const summary = {
    aiWrites: summarySource.filter((record) => record.sourceKey === 'ai_chat').length,
    all: summarySource.length,
    memos: summarySource.filter((record) => record.type === 'memo').length,
    overdueVaccines: summarySource.filter((record) => record.type === 'vaccine' && record.rawStatus === 'overdue').length,
    petCircleMemos: summarySource.filter((record) => record.sourceKey === 'pet_circle').length,
    recorded: summarySource.filter((record) => record.status === 'recorded').length,
    reminderEnabled: summarySource.filter((record) => record.reminderEnabled).length,
    totalRecords: records.length,
    vaccines: summarySource.filter((record) => record.type === 'vaccine').length,
    weights: summarySource.filter((record) => record.type === 'weight').length,
  };

  return {
    filters: { from, q: options.q || '', source: sourceFilter, status: statusFilter, to, type: typeFilter },
    records: filteredRecords.slice(0, limit),
    summary,
  };
}

function adminRelationUser(phone) {
  const normalizedPhone = normalizePhone(phone);
  const user = normalizedPhone ? state.users[normalizedPhone] : null;
  const pet = user ? activePetFor(user) : null;
  return {
    name: user?.ownerName || (normalizedPhone ? `用户${normalizedPhone.slice(-4)}` : '未知用户'),
    petBreed: pet?.breed || '',
    petName: pet?.name || '',
    petSpecies: pet?.species === 'cat' ? 'cat' : pet?.species === 'dog' ? 'dog' : '',
    phone: normalizedPhone,
  };
}

function adminRelationStatusLabel(status) {
  const value = String(status || 'pending');
  if (value === 'accepted') return '已接受';
  if (value === 'rejected') return '已拒绝';
  if (value === 'blocked') return '已拉黑';
  if (value === 'done') return '已处理';
  return '待处理';
}

function adminRelationSourceLabel(type, value) {
  const source = String(value || '').trim();
  if (type === 'conversation') return '会话';
  if (source === 'pet_circle') return '宠友圈小事';
  if (source === 'walk_invite') return '约遛自动接受';
  if (type === 'walk_invite') return '约遛邀请';
  return '发现页';
}

function adminMaskMessageSummary(value, maxLength = 90) {
  return String(value || '')
    .replace(/\b1\d{10}\b/g, (match) => `${match.slice(0, 3)}****${match.slice(7)}`)
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[邮箱]')
    .replace(/微信(?:号)?[:：\s]*[A-Za-z0-9_-]{4,}/gi, '微信号[已隐藏]')
    .replace(/(wxid_[A-Za-z0-9_-]+)/gi, '[微信号]')
    .slice(0, maxLength);
}

function adminNotificationsBetween(fromPhone, targetPhone, kinds = []) {
  const kindSet = new Set(kinds);
  const ownerIds = new Set([`user-${fromPhone}`, `user-${targetPhone}`]);
  const phones = [fromPhone, targetPhone].filter(Boolean);
  return phones.flatMap((phone) =>
    (state.notifications?.[phone] || []).filter((notification) => {
      const kind = normalizeNotificationKind(notification?.kind) || inferNotificationKind(notification);
      if (kindSet.size && !kindSet.has(kind)) return false;
      if (notification.ownerId && ownerIds.has(notification.ownerId)) return true;
      const conversationId = notificationConversationId(notification);
      return conversationId === conversationIdFor(fromPhone) || conversationId === conversationIdFor(targetPhone);
    }),
  );
}

function adminConversationMessageCount(phone, conversationId) {
  const messages = state.conversationMessages?.[phone]?.[conversationId];
  return Array.isArray(messages) ? messages.length : 0;
}

function adminSocialRelations(options = {}) {
  const kindFilter = String(options.kind || 'all');
  const statusFilter = String(options.status || 'all');
  const q = String(options.q || '').trim().toLowerCase();
  const limit = Math.floor(clampNumber(options.limit, 300, 1, ADMIN_EXPORT_ROW_LIMIT));
  const items = [];

  (Array.isArray(state.greetings) ? state.greetings : []).forEach((greeting, index) => {
    const from = adminRelationUser(greeting.fromPhone);
    const target = adminRelationUser(greeting.targetPhone);
    if (!from.phone || !target.phone) return;
    const blocked = Boolean(socialBlockBetween(from.phone, target.phone));
    const status = blocked ? 'blocked' : String(greeting.status || 'pending');
    const notifications = adminNotificationsBetween(from.phone, target.phone, ['greeting_request', 'greeting_accepted', 'pet_circle_greeting']);
    items.push({
      blocked,
      conversationId: conversationIdFor(target.phone),
      createdAt: greeting.at || greeting.createdAt || 0,
      fromName: from.name,
      fromPetName: from.petName,
      fromPhone: from.phone,
      id: `greeting:${greeting.fromPhone}:${greeting.targetPhone}:${greeting.at || index}`,
      kind: 'greeting',
      messageCount: 0,
      notificationCount: notifications.length,
      postId: greeting.postId || '',
      sourceKey: greeting.source || 'discover',
      sourceLabel: adminRelationSourceLabel('greeting', greeting.source),
      status,
      statusLabel: adminRelationStatusLabel(status),
      summary: adminMaskMessageSummary(greeting.postId ? `来自小事 ${greeting.postId}` : greeting.message || '我想认识你和你的毛孩子'),
      targetName: target.name,
      targetPetName: target.petName,
      targetPhone: target.phone,
      typeLabel: '招呼',
      updatedAt: greeting.respondedAt || greeting.at || greeting.createdAt || 0,
    });
  });

  (Array.isArray(state.invites) ? state.invites : []).forEach((invite, index) => {
    const from = adminRelationUser(invite.fromPhone);
    const target = adminRelationUser(invite.targetPhone);
    if (!from.phone || !target.phone) return;
    const blocked = Boolean(socialBlockBetween(from.phone, target.phone));
    const status = blocked ? 'blocked' : String(invite.status || 'pending');
    const notifications = adminNotificationsBetween(from.phone, target.phone, ['walk_invite']);
    const summary = [invite.time || '时间待确认', invite.place || '附近宠物友好地点', invite.placeAddress || ''].filter(Boolean).join(' · ');
    items.push({
      blocked,
      conversationId: conversationIdFor(target.phone),
      createdAt: invite.at || invite.createdAt || 0,
      fromName: from.name,
      fromPetName: from.petName,
      fromPhone: from.phone,
      id: invite.inviteId || `walk:${invite.fromPhone}:${invite.targetPhone}:${invite.at || index}`,
      kind: 'walk_invite',
      messageCount: adminConversationMessageCount(from.phone, conversationIdFor(target.phone)),
      notificationCount: notifications.length,
      placeId: invite.placeId || '',
      sourceKey: 'walk_invite',
      sourceLabel: adminRelationSourceLabel('walk_invite', 'walk_invite'),
      status,
      statusLabel: adminRelationStatusLabel(status),
      summary: adminMaskMessageSummary(summary),
      targetName: target.name,
      targetPetName: target.petName,
      targetPhone: target.phone,
      typeLabel: '约遛',
      updatedAt: invite.respondedAt || invite.at || invite.createdAt || 0,
    });
  });

  const seenConversationPairs = new Set();
  Object.entries(state.conversations || {}).forEach(([ownerPhone, conversations]) => {
    if (!Array.isArray(conversations)) return;
    conversations.forEach((conversation, index) => {
      const targetPhone = conversationTargetPhone(conversation.id);
      if (!normalizePhone(ownerPhone) || !normalizePhone(targetPhone) || ownerPhone === targetPhone) return;
      const pairKey = [ownerPhone, targetPhone].sort().join(':');
      if (seenConversationPairs.has(pairKey)) return;
      seenConversationPairs.add(pairKey);
      const from = adminRelationUser(ownerPhone);
      const target = adminRelationUser(targetPhone);
      if (!from.phone || !target.phone) return;
      const blocked = Boolean(socialBlockBetween(from.phone, target.phone));
      const canMessage = !blocked && canMessageBetween(from.phone, target.phone);
      const status = blocked ? 'blocked' : canMessage ? 'accepted' : 'pending';
      const ownerConversationId = conversationIdFor(target.phone);
      const targetConversationId = conversationIdFor(from.phone);
      const ownerMessageCount = adminConversationMessageCount(from.phone, ownerConversationId);
      const targetMessageCount = adminConversationMessageCount(target.phone, targetConversationId);
      const notifications = adminNotificationsBetween(from.phone, target.phone, ['conversation_message', 'greeting_accepted', 'walk_invite']);
      items.push({
        blocked,
        conversationId: ownerConversationId,
        createdAt: conversation.updatedAt || 0,
        fromName: from.name,
        fromPetName: from.petName,
        fromPhone: from.phone,
        id: `conversation:${pairKey}:${index}`,
        kind: 'conversation',
        messageCount: Math.max(ownerMessageCount, targetMessageCount),
        notificationCount: notifications.length,
        sourceKey: 'conversation',
        sourceLabel: adminRelationSourceLabel('conversation'),
        status,
        statusLabel: adminRelationStatusLabel(status),
        summary: adminMaskMessageSummary(conversation.lastMessage || '暂无消息摘要'),
        targetName: target.name,
        targetPetName: target.petName,
        targetPhone: target.phone,
        typeLabel: '会话',
        unreadTotal: Number(conversation.unread || 0),
        updatedAt: conversation.updatedAt || 0,
      });
    });
  });

  const filtered = items
    .filter((item) => kindFilter === 'all' || item.kind === kindFilter)
    .filter((item) => statusFilter === 'all' || item.status === statusFilter)
    .filter((item) => {
      if (!q) return true;
      return [
        item.id,
        item.fromPhone,
        item.fromName,
        item.fromPetName,
        item.targetPhone,
        item.targetName,
        item.targetPetName,
        item.statusLabel,
        item.sourceLabel,
        item.summary,
        item.postId,
        item.placeId,
        item.conversationId,
      ].some((value) => String(value || '').toLowerCase().includes(q));
    })
    .sort((a, b) => analyticsTimeMs(b.updatedAt || b.createdAt) - analyticsTimeMs(a.updatedAt || a.createdAt) || String(a.id).localeCompare(String(b.id)));

  const summarySource = filtered;
  const summary = {
    accepted: summarySource.filter((item) => item.status === 'accepted').length,
    all: summarySource.length,
    blocked: summarySource.filter((item) => item.blocked).length,
    conversations: summarySource.filter((item) => item.kind === 'conversation').length,
    greetings: summarySource.filter((item) => item.kind === 'greeting').length,
    messageCount: summarySource.reduce((sum, item) => sum + Number(item.messageCount || 0), 0),
    notifications: summarySource.reduce((sum, item) => sum + Number(item.notificationCount || 0), 0),
    pending: summarySource.filter((item) => item.status === 'pending').length,
    rejected: summarySource.filter((item) => item.status === 'rejected').length,
    totalRecords: items.length,
    walkInvites: summarySource.filter((item) => item.kind === 'walk_invite').length,
  };

  return {
    filters: { kind: kindFilter, q: options.q || '', status: statusFilter },
    items: filtered.slice(0, limit),
    summary,
  };
}

function adminDashboardSummary() {
  const users = Object.values(state.users || {});
  const avatarJobs = Object.values(state.avatarJobs || {});
  const socialPosts = ensureSocialMoments();
  const socialComments = ensureSocialComments();
  const reports = ensureSocialReports();
  const placeReviews = adminPlaceReviews();
  const placeSubmissions = adminPlaceSubmissions();
  const tickets = adminSupportTickets({ status: 'all' }).summary;
  const appeals = adminSanctionAppeals({ status: 'all' }).summary;
  const pendingReports = reports.filter((item) => (item.status || 'pending') === 'pending');
  const processingAvatarJobs = avatarJobs.filter((job) => job.status === 'processing');
  const stuckAvatarJobs = processingAvatarJobs.filter((job) => Date.now() - Number(job.updatedAt || job.createdAt || 0) > 5 * 60 * 1000);
  const moderation = adminModerationTasks({ status: 'all' }).summary;
  const notifications = adminSystemNotifications().summary;
  const appEvents = adminAppEvents({ limit: ADMIN_EXPORT_ROW_LIMIT }).summary;
  const config = currentOpsConfig();
  return {
    ai: {
      avatarFailed: avatarJobs.filter((job) => job.status === 'failed').length,
      avatarProcessing: processingAvatarJobs.length,
      avatarReady: avatarJobs.filter((job) => job.status === 'ready').length,
      avatarStuck: stuckAvatarJobs.length,
      gptImage2: state.aiUsage?.gptImage2 || createInitialState().aiUsage.gptImage2,
      petAvatarDailyLimit: effectivePetAvatarDailyLimit(),
      petChatDailyLimit: effectivePetChatDailyLimit(),
    },
    config: publicAppConfig(),
    content: {
      comments: socialComments.filter((item) => (item.status || 'published') === 'published').length,
      hiddenPosts: socialPosts.filter((item) => item.status === 'hidden').length,
      moderationPending: moderation.pending,
      pendingReports: pendingReports.length,
      posts: socialPosts.filter((item) => item.status === 'published').length,
    },
    feedback: {
      open: tickets.open,
      overdue: tickets.overdue,
      total: tickets.all,
      urgent: tickets.urgent,
    },
    events: {
      enabled: config.analytics?.enabled !== false,
      latestAt: appEvents.latestAt,
      sampleRatePercent: Number(config.analytics?.sampleRatePercent ?? 100),
      total: appEvents.total,
      uniqueUsers: appEvents.uniqueUsers,
    },
    appeals,
    places: {
      pendingReviews: placeReviews.filter((item) => item.status === 'pending_review').length,
      pendingSubmissions: placeSubmissions.filter((item) => item.status === 'pending_review').length,
      total: (state.places || []).length,
    },
    users: {
      activeToday: users.filter((user) => Date.now() - Number(user.lastSeenAt || 0) < 24 * 60 * 60 * 1000).length,
      activeSanctions: adminSanctions().filter((item) => item.status === 'active').length,
      total: users.length,
      withPets: users.filter((user) => (user.pets || []).length > 0).length,
    },
    moderation,
    notifications,
    updatedAt: new Date().toISOString(),
  };
}

function adminSafeStateFileInfo() {
  try {
    const stat = fs.statSync(statePath);
    return {
      exists: true,
      modifiedAt: stat.mtime.toISOString(),
      path: statePath,
      sizeBytes: stat.size,
    };
  } catch (error) {
    return {
      error: error?.message || 'state file missing',
      exists: false,
      modifiedAt: '',
      path: statePath,
      sizeBytes: 0,
    };
  }
}

function adminCheckStatus(status, key, label, detail, evidence = '') {
  return { detail, evidence, key, label, status };
}

function adminSystemHealth() {
  const now = Date.now();
  const memory = process.memoryUsage();
  const stateFile = adminSafeStateFileInfo();
  const avatarJobs = Object.values(state.avatarJobs || {});
  const processingAvatarJobs = avatarJobs.filter((job) => job.status === 'processing');
  const stuckAvatarJobs = processingAvatarJobs.filter((job) => now - analyticsTimeMs(job.updatedAt || job.createdAt) > 5 * 60 * 1000);
  const moderation = adminModerationTasks({ status: 'all' }).summary;
  const tickets = adminSupportTickets({ status: 'all' }).summary;
  const appeals = adminSanctionAppeals({ status: 'all' }).summary;
  const config = currentOpsConfig();
  const notifications = adminSystemNotifications().summary;
  const appEvents = adminAppEvents({ limit: ADMIN_EXPORT_ROW_LIMIT }).summary;
  const stateSizeWarn = stateFile.sizeBytes > 15 * 1024 * 1024;
  const checks = [
    adminCheckStatus(stateFile.exists ? stateSizeWarn ? 'warn' : 'ok' : 'bad', 'state_file', '状态文件', stateFile.exists ? `JSON state ${Math.round(stateFile.sizeBytes / 1024)} KB` : '状态文件不存在或不可读', stateFile.path),
    adminCheckStatus(process.env.LUMII_ADMIN_USERNAME && process.env.LUMII_ADMIN_PASSWORD ? 'ok' : 'warn', 'admin_credentials', '后台账号环境变量', process.env.LUMII_ADMIN_PASSWORD ? '后台密码由环境变量覆盖' : '仍可能使用默认后台账号密码', 'LUMII_ADMIN_USERNAME / LUMII_ADMIN_PASSWORD'),
    adminCheckStatus(config.app?.maintenanceEnabled ? 'warn' : 'ok', 'maintenance', '维护模式', config.app?.maintenanceEnabled ? maintenanceMessage() : '未开启维护模式', '/app/config + 写接口维护拦截'),
    adminCheckStatus(cosEnabled() ? 'ok' : 'warn', 'cos_storage', '腾讯云 COS', cosEnabled() ? '对象存储已配置' : '对象存储未完整配置，媒体可能走本地/代理兼容链路', `bucket=${COS_BUCKET ? 'set' : 'missing'} region=${COS_REGION || '-'}`),
    adminCheckStatus(AMAP_WEB_SERVICE_KEY ? 'ok' : 'warn', 'amap', '高德 POI', AMAP_WEB_SERVICE_KEY ? 'Web Service Key 已配置' : '未配置高德 Web Service Key，地点搜索会降级', AMAP_WEB_SERVICE_BASE_URL),
    adminCheckStatus(DEEPSEEK_API_KEY ? 'ok' : 'warn', 'deepseek', 'DeepSeek 对话', DEEPSEEK_API_KEY ? 'AI 对话密钥已配置' : '未配置 DeepSeek 密钥，可能使用回退逻辑', DEEPSEEK_MODEL),
    adminCheckStatus(PET_AVATAR_PROVIDER === 'mock' ? 'warn' : PET_AVATAR_PROVIDER === 'gpt-image-2' && !GPT_IMAGE2_API_KEY ? 'bad' : 'ok', 'pet_avatar_provider', '灵伴形象生成', PET_AVATAR_PROVIDER === 'mock' ? '当前使用 mock provider' : `当前 provider：${PET_AVATAR_PROVIDER}`, `gpt-image-2 key=${GPT_IMAGE2_API_KEY ? 'set' : 'missing'} resolution=${GPT_IMAGE2_RESOLUTION}`),
    adminCheckStatus(PET_AVATAR_PUBLIC_BASE_URL || process.env.LUMII_PUBLIC_BASE_URL ? 'ok' : 'warn', 'public_media_base', '媒体公开访问域名', PET_AVATAR_PUBLIC_BASE_URL || process.env.LUMII_PUBLIC_BASE_URL ? '已配置公开访问 base URL' : '未配置公开访问 base URL，部分媒体 URL 依赖请求 Host', 'PET_AVATAR_PUBLIC_BASE_URL / LUMII_PUBLIC_BASE_URL'),
    adminCheckStatus(stuckAvatarJobs.length ? 'warn' : 'ok', 'avatar_queue', 'AI 任务队列', stuckAvatarJobs.length ? `${stuckAvatarJobs.length} 个生成任务可能卡住` : '暂无卡住的生成任务', `${processingAvatarJobs.length} processing / ${avatarJobs.length} total`),
    adminCheckStatus(Number(tickets.overdue || 0) ? 'warn' : 'ok', 'support_sla', '客服 SLA', Number(tickets.overdue || 0) ? `${tickets.overdue} 个工单已超时` : '暂无超时工单', `${tickets.open || 0} open / ${tickets.all || 0} all`),
  ];
  const bad = checks.filter((item) => item.status === 'bad').length;
  const warn = checks.filter((item) => item.status === 'warn').length;
  const countObject = (value) => Object.keys(value || {}).length;
  const countArray = (value) => Array.isArray(value) ? value.length : 0;
  const countNotificationRows = Object.values(state.notifications || {}).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  return {
    checks,
    collections: [
      { key: 'users', label: '用户', rows: countObject(state.users) },
      { key: 'mediaUploads', label: '媒体上传', rows: countObject(state.mediaUploads) },
      { key: 'avatarJobs', label: 'AI 任务', rows: countObject(state.avatarJobs) },
      { key: 'adminAuditLogs', label: '审计日志', rows: countArray(state.adminAuditLogs) },
      { key: 'appEvents', label: '移动端事件', rows: countArray(state.appEvents) },
      { key: 'notifications', label: '通知记录', rows: countNotificationRows },
      { key: 'supportTickets', label: '工单', rows: countArray(state.supportTickets) },
      { key: 'reports', label: '举报', rows: ensureSocialReports().length },
    ],
    dependencies: checks.filter((item) => ['admin_credentials', 'cos_storage', 'amap', 'deepseek', 'pet_avatar_provider', 'public_media_base'].includes(item.key)),
    generatedAt: new Date(now).toISOString(),
    queues: [
      { detail: `${processingAvatarJobs.length} 处理中 / ${avatarJobs.length} 总任务`, label: 'AI 灵伴生成', status: stuckAvatarJobs.length ? 'warn' : 'ok', value: stuckAvatarJobs.length },
      { detail: `${moderation.pending || 0} 待处理 / ${moderation.escalated || 0} 已升级`, label: '内容安全任务', status: moderation.escalated ? 'warn' : 'ok', value: moderation.pending || 0 },
      { detail: `${moderation.sampleUnreviewed || 0} 待复审 / ${moderation.qualitySamples || 0} 抽样`, label: '内容安全样本', status: moderation.sampleUnreviewed ? 'warn' : 'ok', value: moderation.sampleUnreviewed || 0 },
      { detail: `${tickets.open || 0} 未关闭 / ${tickets.overdue || 0} 已超时`, label: '客服工单', status: tickets.overdue ? 'warn' : 'ok', value: tickets.open || 0 },
      { detail: `${appeals.open || 0} 待处理 / ${appeals.pending || 0} 新申诉`, label: '处罚申诉', status: appeals.open ? 'warn' : 'ok', value: appeals.open || 0 },
      { detail: `${notifications.campaigns || 0} 批次 / ${notifications.devices || 0} 设备`, label: '通知运营', status: 'ok', value: notifications.campaigns || 0 },
      { detail: `${appEvents.uniqueUsers || 0} 用户 / 最近 ${appEvents.latestAt ? new Date(appEvents.latestAt).toISOString() : '无'}`, label: '移动端事件', status: config.analytics?.enabled === false ? 'warn' : 'ok', value: appEvents.total || 0 },
    ],
    runtime: {
      env: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      pid: process.pid,
      platform: process.platform,
      port,
      uptimeSeconds: Math.round(process.uptime()),
    },
    stateFile,
    status: bad ? 'bad' : warn ? 'warn' : 'ok',
    summary: {
      bad,
      checks: checks.length,
      stateSizeBytes: stateFile.sizeBytes,
      users: countObject(state.users),
      warn,
    },
    resources: {
      memory,
    },
  };
}

function adminPermissionCatalog() {
  return [
    ['admin.login', '登录后台', '系统管理'],
    ['dashboard.view', '查看工作台', '看板'],
    ['analytics.view', '查看数据看板', '看板'],
    ['user.view', '查看用户列表和详情', '用户'],
    ['user.note', '添加用户备注', '用户'],
    ['user.tag', '标记用户风险标签', '用户'],
    ['user.clear_data', '清理用户业务数据', '用户'],
    ['pet.view', '查看宠物档案', '宠物'],
    ['pet.media_moderate', '清理头像、AI 形象、宠友圈封面', '宠物'],
    ['ai.avatar.view', '查看 AI 灵伴任务、素材和反馈', 'AI'],
    ['ai.chat.view_summary', '查看 AI 对话摘要和风险标签', 'AI'],
    ['moderation.view', '查看内容安全任务池', '内容安全'],
    ['moderation.process', '处理内容安全任务', '内容安全'],
    ['moderation.sample_review', '复审内容安全命中与抽样样本', '内容安全'],
    ['social.report.process', '处理举报', '社区安全'],
    ['user.sanction', '创建或撤销处罚', '社区安全'],
    ['sanction.appeal.process', '处理处罚申诉', '社区安全'],
    ['place.moderate', '审核地点点评和新增地点', '地点'],
    ['support.ticket.process', '处理客服工单', '客服'],
    ['notification.send', '发送、预约、撤回系统通知', '通知'],
    ['config.update', '修改移动端联动配置', '配置'],
    ['config.draft', '创建、发布、废弃配置草稿', '配置'],
    ['config.rollback', '回滚配置版本', '配置'],
    ['audit.view', '查看审计日志', '审计'],
    ['data.export.download', '下载运营 CSV', '导出'],
    ['system.health.view', '查看系统健康', '系统管理'],
    ['launch.readiness.view', '查看上线台账', '系统管理'],
  ].map(([key, label, group]) => ({ group, key, label, status: 'active' }));
}

function adminRoleCatalog() {
  return [
    { key: 'admin', label: '单管理员', note: '当前版本唯一实际角色，拥有后台全部已开放能力。', status: 'active' },
    { key: 'super_admin', label: '超级管理员', note: '生产期用于账号权限、双人审批最终确认和危险配置。', status: 'reserved' },
    { key: 'ops_admin', label: '运营管理员', note: '生产期用于日常运营、配置、通知和工单。', status: 'reserved' },
    { key: 'content_moderator', label: '内容审核员', note: '生产期用于动态、评论、图片和地点内容审核。', status: 'reserved' },
    { key: 'support', label: '客服', note: '生产期用于工单、低风险用户排查和通知补发。', status: 'reserved' },
    { key: 'auditor', label: '审计员', note: '生产期用于只读审计和操作复核。', status: 'reserved' },
  ];
}

function adminAccountHighRiskPattern() {
  return /(ban|clear|config|delete|export|freeze|hide|revoke|rollback|sanction|send|submission|update)/i;
}

function adminAccounts(admin = {}) {
  const logs = Array.isArray(state.adminAuditLogs) ? state.adminAuditLogs : [];
  const loginLogs = logs
    .filter((log) => log?.action === 'admin.login')
    .slice(0, 20)
    .map((log) => ({
      adminName: log.adminName || '',
      createdAt: log.createdAt,
      id: log.id,
      ip: log.ip || '',
      userAgent: log.userAgent || '',
    }));
  const failedLoginLogs = logs
    .filter((log) => ['admin.login.failed', 'admin.login.locked', 'admin.login.blocked_by_lock'].includes(log?.action))
    .slice(0, 20)
    .map((log) => ({
      action: log.action,
      adminName: log.adminName || '',
      createdAt: log.createdAt,
      id: log.id,
      ip: log.ip || '',
      reason: log.reason || '',
      userAgent: log.userAgent || '',
    }));
  const highRiskPattern = adminAccountHighRiskPattern();
  const highRiskActions = logs
    .filter((log) => highRiskPattern.test(String(log?.action || '')))
    .slice(0, 20)
    .map((log) => ({
      action: log.action,
      adminName: log.adminName || '',
      createdAt: log.createdAt,
      id: log.id,
      reason: log.reason || '',
      targetId: log.targetId || '',
      targetType: log.targetType || '',
    }));
  const passwordFromEnv = Boolean(process.env.LUMII_ADMIN_PASSWORD);
  const usernameFromEnv = Boolean(process.env.LUMII_ADMIN_USERNAME);
  const loginSecurity = adminLoginSecurityStatus();
  const checks = [
    adminCheckStatus(usernameFromEnv && passwordFromEnv ? 'ok' : 'warn', 'credential_env', '后台账号环境变量', passwordFromEnv ? '后台密码由环境变量覆盖' : '仍可能使用默认后台密码', 'LUMII_ADMIN_USERNAME / LUMII_ADMIN_PASSWORD'),
    adminCheckStatus(loginSecurity.locked ? 'warn' : 'ok', 'login_lockout', '登录失败锁定', loginSecurity.locked ? `当前已锁定到 ${loginSecurity.lockedUntil}` : `连续 ${loginSecurity.maxAttempts} 次失败会锁定 ${loginSecurity.lockMinutes} 分钟`, 'LUMII_ADMIN_LOGIN_MAX_ATTEMPTS / LUMII_ADMIN_LOGIN_LOCK_MS'),
    adminCheckStatus('warn', 'mfa', 'MFA', '当前单 admin 版本未接 MFA，生产期必须补齐。', '预留'),
    adminCheckStatus('warn', 'ip_allowlist', 'IP 白名单', '当前未强制后台 IP 白名单，生产期应在网关或后端启用。', '预留'),
    adminCheckStatus('warn', 'multi_accounts', '多管理员账号', '当前只有一个环境变量 admin 账号，未开放新增、禁用、重置密码。', '预留'),
  ];
  const lastLogin = loginLogs[0] || null;
  return {
    accounts: [
      {
        createdAt: '',
        displayName: ADMIN_USERNAME,
        id: 'admin-env',
        lastLoginAt: lastLogin?.createdAt || '',
        lastLoginIp: lastLogin?.ip || '',
        lockedUntil: loginSecurity.lockedUntil,
        mfaEnabled: false,
        roleIds: ['admin'],
        status: loginSecurity.locked ? 'locked' : 'active',
        updatedAt: '',
        username: ADMIN_USERNAME,
      },
    ],
    currentSession: {
      expiresAt: admin.expiresAt ? new Date(admin.expiresAt).toISOString() : '',
      issuedAt: admin.issuedAt ? new Date(admin.issuedAt).toISOString() : '',
      ip: admin.ip || '',
      role: admin.role || 'admin',
      tokenId: admin.jti ? `${String(admin.jti).slice(0, 6)}...${String(admin.jti).slice(-4)}` : '',
      userAgent: admin.userAgent || '',
      username: admin.username || ADMIN_USERNAME,
    },
    permissions: adminPermissionCatalog(),
    recentHighRiskActions: highRiskActions,
    recentLogins: loginLogs,
    roles: adminRoleCatalog(),
    security: {
      checks,
      defaultPasswordRisk: !passwordFromEnv,
      mfaRequired: false,
      passwordFromEnv,
      usernameFromEnv,
    },
    loginSecurity,
    summary: {
      activeAccounts: 1,
      activePermissions: adminPermissionCatalog().length,
      failedAttempts: loginSecurity.failedAttempts,
      lockedAccounts: loginSecurity.locked ? 1 : 0,
      reservedRoles: adminRoleCatalog().filter((role) => role.status === 'reserved').length,
      securityWarnings: checks.filter((check) => check.status !== 'ok').length,
    },
    updatedAt: new Date().toISOString(),
    recentFailedLogins: failedLoginLogs,
  };
}

function adminReadinessStatusMeta(status) {
  const map = {
    blocked: { label: '生产阻断', tone: 'bad' },
    partial: { label: '部分可用', tone: 'warn' },
    ready: { label: '测试可用', tone: 'ok' },
    reserved: { label: '已预留', tone: 'reserved' },
  };
  return map[status] || { label: status || '未知', tone: 'warn' };
}

function adminReadinessModules(context) {
  const { accounts, health, linkageSummary } = context;
  const hasHealthBad = Number(health?.summary?.bad || 0) > 0;
  const hasAccountWarnings = Number(accounts?.summary?.securityWarnings || 0) > 0;
  const hasConfigReserved = Number(linkageSummary?.reserved || 0) > 0;
  return [
    {
      key: 'dashboard',
      module: '工作台与数据看板',
      group: '看板',
      status: 'ready',
      evidence: '已接入用户、AI、社交、审核、地点、工单、配置、通知和移动端事件摘要。',
      mobileLinkage: '读取 App 行为事件、配置快照和用户业务数据；不是孤立后台。',
      nextStep: '生产期补留存 Cohort、漏斗、独立事件表和数据仓库。',
    },
    {
      key: 'users',
      module: '用户排查',
      group: '用户',
      status: 'ready',
      evidence: '支持手机号定位、用户详情、宠物、AI、社交、地点、工单、通知、处罚和运营标签。',
      mobileLinkage: '清理业务数据、处罚状态和通知会真实影响 App 下一次刷新。',
      nextStep: '生产期补更细账号状态、完整 PII 查看审批和客服排查 SOP。',
    },
    {
      key: 'pets',
      module: '宠物档案与宠物日历',
      group: '宠物',
      status: 'ready',
      evidence: '已覆盖宠物档案、头像/AI 形象/封面清理、生日完整度、体重、疫苗/驱虫、备忘。',
      mobileLinkage: '媒体清理、日历记录和疫苗状态会影响首页、档案、宠物日历和提醒展示。',
      nextStep: '高风险编辑/删除日历记录仍需更细权限、审计和审批后开放。',
    },
    {
      key: 'ai_avatar',
      module: 'AI 灵伴生成',
      group: 'AI',
      status: hasHealthBad ? 'blocked' : 'partial',
      evidence: '后台可看任务状态、卡住任务、供应商、素材、反馈、重试、标失败和返还额度。',
      mobileLinkage: '额度、功能开关、结果应用和失败状态会联动移动端生成页与首页形象。',
      nextStep: '生产期补供应商 SLA、失败归因分层、图片安全审核和成本对账。',
    },
    {
      key: 'pet_chat',
      module: 'AI 对话抽检',
      group: 'AI',
      status: 'partial',
      evidence: '已支持摘要检索、原因审计后查看、医疗风险样本、质量标签和隐藏 AI 回复。',
      mobileLinkage: '隐藏回复后移动端不再返回，后续上下文也跳过被隐藏回复。',
      nextStep: '生产期接第三方内容安全、医疗风险更细规则和样本标注闭环。',
    },
    {
      key: 'moderation',
      module: '内容安全任务池',
      group: '安全',
      status: 'partial',
      evidence: '小事、评论、举报、地点点评和新增地点可进入统一任务池并人工处理。',
      mobileLinkage: '隐藏、删除、通过、驳回和举报结果通知会影响 App 可见内容和通知中心。',
      nextStep: '生产期必须接文本/图片内容安全模型、举报后台策略、封禁/隐藏运营闭环。',
    },
    {
      key: 'reports',
      module: '举报与处罚申诉',
      group: '安全',
      status: 'partial',
      evidence: '举报可处理有效/无效/关闭，处罚可创建/撤销，申诉可通过/驳回并通知用户。',
      mobileLinkage: '处罚会限制移动端写接口，申诉通过可撤销处罚并通知用户。',
      nextStep: '永久封禁、批量处罚和高风险处罚建议需要双人审批。',
    },
    {
      key: 'places',
      module: '地点审核',
      group: '地点',
      status: 'partial',
      evidence: '地点点评和新增地点支持通过/驳回、关联已有地点、原因模板、通知、导出、地点编辑、人工合并和基础贡献账本。',
      mobileLinkage: '审核状态会影响地点详情、地点提交和用户通知中心。',
      nextStep: '补用户端公开贡献身份、贡献等级/奖励策略、多角色权限和公开点评列表口径。',
    },
    {
      key: 'support',
      module: '反馈与工单',
      group: '客服',
      status: 'ready',
      evidence: 'App 反馈自动生成工单，后台支持分配、备注、回复、状态流转、模板和 SLA。',
      mobileLinkage: '客服回复可写入通知中心，用户可查看、补充、评分和重开。',
      nextStep: '生产期补客服排班、首响/解决 SLA 拆分和客服质量统计。',
    },
    {
      key: 'notifications',
      module: '通知运营',
      group: '触达',
      status: 'partial',
      evidence: '支持系统通知、草稿、预约、撤回、模板、设备概览、actionRoute 和系统通知频控。',
      mobileLinkage: '通知会写入 App 通知中心，支持跳首页、发现、地图、我的、安全中心、设置、反馈进度。',
      nextStep: '生产期补厂商 Push、复杂深链、发送审批和灰度人群包。',
    },
    {
      key: 'config',
      module: '配置中心',
      group: '配置',
      status: hasConfigReserved ? 'partial' : 'ready',
      evidence: '配置可保存草稿、立即发布、草稿发布/废弃、版本化、回滚和审计，已展示前后端联动体检与高风险摘要。',
      mobileLinkage: '移动端读取 /app/config 后应用功能开关、维护、公告、更新、启动提示、额度和附近策略。',
      nextStep: '生产期补双人审批、定时发布、灰度人群包和 A/B 实验。',
    },
    {
      key: 'exports_audit',
      module: '数据导出与审计',
      group: '治理',
      status: 'partial',
      evidence: 'CSV 导出支持筛选、导出原因、文件水印、历史、行数摘要和 data.export.download 审计；审计日志支持搜索筛选。',
      mobileLinkage: '导出覆盖移动端真实业务数据和 App 事件，不导出图片二进制或完整设备 token。',
      nextStep: '生产期补双人导出审批、异步导出、文件归档和敏感字段授权。',
    },
    {
      key: 'system',
      module: '系统健康与账号权限',
      group: '系统',
      status: hasAccountWarnings ? 'partial' : 'ready',
      evidence: '已覆盖系统健康、外部依赖、业务积压、单 admin 账号、权限点、会话和高风险动作。',
      mobileLinkage: '系统健康观测包含影响 App 的 AI、地图、媒体、客服、通知和配置能力。',
      nextStep: '生产期补多管理员、MFA、IP 白名单、APM 和不可篡改审计。',
    },
  ].map((item) => ({ ...item, statusLabel: adminReadinessStatusMeta(item.status).label }));
}

function adminReadinessQuestions() {
  return [
    ['q-domain', 'P1', '后台正式域名使用 ops.lumiiapp.cn、admin.lumiiapp.cn，还是先沿用 /admin？', '当前可沿用 /admin；生产建议独立后台域名并做访问控制。', '影响后台入口、证书、CDN/网关和运维 SOP。'],
    ['q-ip', 'P0', '生产后台是否必须白名单 IP？', '当前未强制白名单；生产前建议至少网关层限制。', '影响后台暴露面和账号被撞库风险。'],
    ['q-mfa', 'P0', '后台账号是否接企业微信、飞书或邮箱 MFA？', '当前单 admin 账号无 MFA。', '影响生产后台登录安全。'],
    ['q-safety-vendor', 'P0', '内容安全供应商选哪家，文本和图片是否同一供应商？', '当前只有规则和人工任务池，第三方模型未接。', '影响宠友圈、评论、头像、宠物图、地点点评的真实审核能力。'],
    ['q-image-policy', 'P0', '图片审核失败时，宠友圈发布是阻断、送审，还是先隐藏等待审核？', '当前图片安全策略尚未生产定稿。', '影响用户发布体验和违规内容外露风险。'],
    ['q-message-view', 'P1', '私信是否允许人工查看全文？如果允许，谁审批、保留多久？', '当前后台默认只做摘要排查。', '影响隐私合规和骚扰治理能力。'],
    ['q-clear-data', 'P1', '用户业务数据清理是否只保留测试环境？', '当前已实现清理链路，生产是否开放需确认。', '影响误操作风险、用户数据权益和客服 SOP。'],
    ['q-ai-refund', 'P1', 'AI 失败额度返还规则如何定义？', '当前后台可人工返还；自动规则未定。', '影响用户权益、成本和客服处理标准。'],
    ['q-ban-approval', 'P0', '永久封禁是否必须双人审批？', '当前单 admin 可执行处罚；双人审批未接。', '影响高风险处罚治理。'],
    ['q-pii-export', 'P0', '导出完整手机号是否允许？如允许，谁审批？', '当前导出默认脱敏，不开放完整手机号导出。', '影响隐私合规和数据泄露风险。'],
    ['q-place-reward', 'P2', '地点贡献分是否对用户公开展示，是否接贡献等级、活动奖励或兑换规则？', '当前已记录基础贡献积分并通知提交人，但不做用户端公开展示或奖励兑换。', '影响地点生态激励。'],
    ['q-notification-approval', 'P1', '系统通知是否需要发送审批和灰度人群包？', '当前支持草稿/预约/撤回、模板和系统通知频控，未接发送审批。', '影响误发和运营风险。'],
    ['q-config-approval', 'P0', '配置强制更新、维护模式、全功能关闭是否必须审批？', '当前保存即发布并记录版本，可回滚。', '影响事故风险和发布治理。'],
    ['q-compliance-text', 'P0', 'App 备案、隐私政策、内容审核制度是否已准备生产版文本？', '当前代码层面不可替代法务/合规文本确认。', '影响正式上线合规。'],
  ].map(([id, priority, question, currentPolicy, impact]) => ({
    currentPolicy,
    id,
    impact,
    owner: '待业务确认',
    priority,
    status: 'open',
    statusLabel: '待确认',
    question,
  }));
}

function adminReadinessGaps(context) {
  const { accounts, health } = context;
  const defaultPasswordRisk = Boolean(accounts?.security?.defaultPasswordRisk);
  const healthBad = Number(health?.summary?.bad || 0) > 0;
  return [
    {
      key: 'admin_security',
      area: '后台安全',
      severity: 'P0',
      status: defaultPasswordRisk ? 'blocked' : 'partial',
      issue: defaultPasswordRisk ? '后台密码仍可能使用默认值' : '已接登录失败锁定，仍缺 MFA、IP 白名单和多管理员账号。',
      requiredAction: '生产前启用环境变量密码、MFA、IP 白名单和账号禁用/轮换流程。',
      evidence: '账号权限页 / 系统健康页',
    },
    {
      key: 'state_storage',
      area: '数据底座',
      severity: 'P0',
      status: 'blocked',
      issue: '当前后端仍是 JSON state 文件态，不能作为生产级数据库。',
      requiredAction: '迁移数据库、独立审计存储、备份恢复和迁移脚本。',
      evidence: 'scripts/lumii-backend.cjs statePath',
    },
    {
      key: 'content_model',
      area: '内容安全',
      severity: 'P0',
      status: 'blocked',
      issue: '文本/图片第三方内容安全模型未接入。',
      requiredAction: '确定供应商、接入同步/异步审核、失败降级、复审和样本回流。',
      evidence: '内容安全任务池当前为规则 + 人工处理',
    },
    {
      key: 'image_moderation',
      area: '图片审核',
      severity: 'P0',
      status: 'blocked',
      issue: '头像、宠物图、宠友圈图片、地点图片缺真实图片审核闭环。',
      requiredAction: '上传链路增加图片审核状态，移动端按阻断/送审/隐藏策略展示。',
      evidence: '待确认图片审核失败策略',
    },
    {
      key: 'high_risk_approval',
      area: '高风险操作',
      severity: 'P1',
      status: 'partial',
      issue: '处罚、配置发布、强制通知、数据清理和敏感导出没有双人审批。',
      requiredAction: '接操作审批表、审批状态、撤回/驳回、审批审计和超时处理。',
      evidence: '账号权限页已预留 super_admin / ops_admin / auditor',
    },
    {
      key: 'push_provider',
      area: '通知触达',
      severity: 'P1',
      status: 'partial',
      issue: '当前以站内通知为主，厂商 Push、送达回执、发送审批和灰度人群包未完成。',
      requiredAction: '接 Android 厂商 Push、iOS APNs、回执、失败重试、发送审批和灰度人群包。',
      evidence: '通知运营页设备 token 概览',
    },
    {
      key: 'observability',
      area: '可观测性',
      severity: healthBad ? 'P0' : 'P1',
      status: healthBad ? 'blocked' : 'partial',
      issue: '后台内置健康页不能替代生产日志、APM、告警和值班。',
      requiredAction: '接入服务日志、错误告警、任务失败告警、队列积压告警和数据库健康检查。',
      evidence: '系统健康页',
    },
    {
      key: 'exports_governance',
      area: '数据导出',
      severity: 'P1',
      status: 'partial',
      issue: '导出已有审计、原因必填和 CSV 水印，但没有双人审批、异步任务、归档和过期下载链接。',
      requiredAction: '补导出申请、双人审批、文件生命周期、对象存储归档和敏感字段授权。',
      evidence: '数据导出页 / 审计日志',
    },
  ].map((item) => ({ ...item, statusLabel: adminReadinessStatusMeta(item.status).label }));
}

function adminLaunchReadiness() {
  const config = currentOpsConfig();
  const linkageItems = adminConfigLinkageItems(config);
  const linkageSummary = adminConfigLinkageSummary(linkageItems);
  const context = {
    accounts: adminAccounts(),
    health: adminSystemHealth(),
    linkageSummary,
  };
  const modules = adminReadinessModules(context);
  const questions = adminReadinessQuestions();
  const gaps = adminReadinessGaps(context);
  const countStatus = (rows, status) => rows.filter((item) => item.status === status).length;
  const openP0 = questions.filter((item) => item.priority === 'P0').length + gaps.filter((item) => item.severity === 'P0' && item.status !== 'ready').length;
  return {
    generatedAt: new Date().toISOString(),
    gaps,
    linkage: {
      attentionItems: linkageItems.filter((item) => item.status !== 'linked').slice(0, 12),
      summary: linkageSummary,
    },
    modules,
    questions,
    summary: {
      blockedGaps: countStatus(gaps, 'blocked'),
      linkedConfigItems: linkageSummary.linked,
      openP0,
      openQuestions: questions.filter((item) => item.status === 'open').length,
      partialModules: countStatus(modules, 'partial'),
      readyModules: countStatus(modules, 'ready'),
      reservedItems: countStatus(gaps, 'reserved') + Number(linkageSummary.reserved || 0),
      status: openP0 ? 'partial' : 'ready',
      statusLabel: openP0 ? '测试运营可用，生产前仍需治理' : '可进入生产上线复核',
      totalConfigItems: linkageSummary.total,
      totalModules: modules.length,
    },
  };
}

const APP_EVENT_MAX_ROWS = 8000;
const APP_EVENT_ALLOWED_NAMES = new Set([
  'app.page_view',
  'discover.filter',
  'discover.owners_loaded',
  'discover.pet_circle_load_more',
  'discover.pet_circle_loaded',
  'discover.refresh',
  'discover.search',
  'discover.view',
  'map.favorite_toggle',
  'map.locate',
  'map.navigation_open',
  'map.open',
  'map.place_detail_view',
  'map.poi_search',
  'notification.open',
  'pet_circle.profile_view',
  'support.open',
]);

const APP_EVENT_LABELS = {
  'app.page_view': '页面浏览',
  'discover.filter': '发现筛选',
  'discover.owners_loaded': '附近伙伴加载',
  'discover.pet_circle_load_more': '小事加载更多',
  'discover.pet_circle_loaded': '附近小事加载',
  'discover.refresh': '发现刷新',
  'discover.search': '发现搜索',
  'discover.view': '发现曝光',
  'map.favorite_toggle': '地点收藏',
  'map.locate': '地图定位',
  'map.navigation_open': '打开导航',
  'map.open': '地图打开',
  'map.place_detail_view': '地点详情查看',
  'map.poi_search': 'POI 搜索',
  'notification.open': '通知点击',
  'pet_circle.profile_view': '宠友圈主页查看',
  'support.open': '反馈进度查看',
};

const APP_EVENT_SENSITIVE_PROPERTY_KEYS = new Set([
  'address',
  'avatarurl',
  'base64',
  'body',
  'content',
  'imageurl',
  'keyword',
  'lat',
  'latitude',
  'lng',
  'longitude',
  'password',
  'phone',
  'query',
  'secret',
  'text',
  'token',
]);

function normalizeAppEventName(value) {
  const name = String(value || '').trim();
  return APP_EVENT_ALLOWED_NAMES.has(name) ? name : '';
}

function normalizeAppEventText(value, maxLength = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeAppEventRoute(value) {
  return normalizeAppEventText(value, 40).replace(/[^0-9A-Za-z_.-]/g, '');
}

function normalizeAppEventSource(value) {
  const source = normalizeAppEventText(value, 40).replace(/[^0-9A-Za-z_.-]/g, '');
  return source || 'mobile';
}

function normalizeAppEventProperties(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output = {};
  for (const [rawKey, rawValue] of Object.entries(value).slice(0, 32)) {
    const key = String(rawKey || '').trim().replace(/[^0-9A-Za-z_.-]/g, '').slice(0, 48);
    if (!key) continue;
    const lowerKey = key.toLowerCase();
    if (APP_EVENT_SENSITIVE_PROPERTY_KEYS.has(lowerKey) || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('password')) continue;
    if (typeof rawValue === 'boolean') {
      output[key] = rawValue;
      continue;
    }
    if (typeof rawValue === 'number') {
      if (Number.isFinite(rawValue)) output[key] = Math.round(rawValue * 1000) / 1000;
      continue;
    }
    if (typeof rawValue === 'string') {
      const text = normalizeAppEventText(rawValue, 120);
      if (text) output[key] = text;
    }
  }
  return output;
}

function appEventTimestamp(value, fallback = Date.now()) {
  const timestamp = analyticsTimeMs(value);
  if (!timestamp) return fallback;
  const now = Date.now();
  if (timestamp > now + 5 * 60 * 1000) return fallback;
  if (timestamp < now - 7 * 24 * 60 * 60 * 1000) return fallback;
  return timestamp;
}

function appEventDeviceHash(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);
}

function pruneAppEvents(config = currentOpsConfig()) {
  const retentionDays = Math.floor(clampNumber(config.analytics?.retentionDays, 30, 7, 180));
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  state.appEvents = (Array.isArray(state.appEvents) ? state.appEvents : [])
    .filter((event) => event && analyticsTimeMs(event.createdAt) >= cutoff)
    .slice(-APP_EVENT_MAX_ROWS);
  return state.appEvents;
}

function recordAppEvent(req, user, body = {}) {
  const config = currentOpsConfig();
  if (config.analytics?.enabled === false) {
    return { accepted: false, disabled: true, reason: 'analytics_disabled' };
  }
  const name = normalizeAppEventName(body.name || body.event);
  if (!name) return { error: '事件名不支持', statusCode: 400 };
  const now = Date.now();
  const activePet = selectedPetFor(user);
  const event = {
    appBuild: normalizeAppEventText(body.appBuild || body.buildNumber, 24),
    appVersion: normalizeAppEventText(body.appVersion, 32),
    createdAt: new Date(now).toISOString(),
    deviceIdHash: appEventDeviceHash(body.deviceId),
    id: `app-event-${now}-${Math.random().toString(16).slice(2, 8)}`,
    name,
    occurredAt: new Date(appEventTimestamp(body.occurredAt || body.clientAt, now)).toISOString(),
    ownerName: user.ownerName || '',
    petId: normalizeAppEventText(body.petId || body.activePetId || activePet?.id, 80),
    petName: activePet?.name || '',
    phone: user.phone,
    platform: normalizeAppEventText(body.platform, 24),
    properties: normalizeAppEventProperties(body.properties),
    route: normalizeAppEventRoute(body.route),
    source: normalizeAppEventSource(body.source),
  };
  state.appEvents = [...pruneAppEvents(config), event].slice(-APP_EVENT_MAX_ROWS);
  user.lastSeenAt = now;
  return { accepted: true, eventId: event.id };
}

function adminAppEvents(options = {}) {
  const limit = Math.floor(clampNumber(options.limit, 300, 1, ADMIN_EXPORT_ROW_LIMIT));
  const name = normalizeAppEventName(options.name);
  const q = normalizeAppEventText(options.q, 80).toLowerCase();
  const items = pruneAppEvents()
    .map((event) => ({
      ...event,
      label: APP_EVENT_LABELS[event.name] || event.name,
      propertySummary: Object.entries(event.properties || {})
        .map(([key, value]) => `${key}=${value}`)
        .join(' | '),
    }))
    .filter((event) => (!name || event.name === name))
    .filter((event) => {
      if (!q) return true;
      return [event.name, event.label, event.phone, event.ownerName, event.petName, event.route, event.source, event.propertySummary]
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => analyticsTimeMs(b.createdAt) - analyticsTimeMs(a.createdAt));
  const uniqueUsers = new Set(items.map((event) => event.phone).filter(Boolean));
  const byName = items.reduce((acc, event) => {
    acc[event.name] = (acc[event.name] || 0) + 1;
    return acc;
  }, {});
  return {
    filters: { name: name || 'all', q: options.q || '' },
    items: items.slice(0, limit),
    summary: {
      byName,
      latestAt: items[0]?.createdAt || '',
      total: items.length,
      uniqueUsers: uniqueUsers.size,
    },
  };
}

function analyticsDateKeyFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function analyticsTimeMs(value) {
  if (!value) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value || '').trim();
  if (!text) return 0;
  const timestamp = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function analyticsDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const text = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  }
  const timestamp = analyticsTimeMs(value);
  if (!timestamp) return '';
  return analyticsDateKeyFromDate(new Date(timestamp));
}

function analyticsWindow(daysInput) {
  const days = Math.floor(clampNumber(daysInput, ADMIN_ANALYTICS_DEFAULT_DAYS, 7, ADMIN_ANALYTICS_MAX_DAYS));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const day = analyticsDateKeyFromDate(date);
    buckets.push({
      activeUsers: 0,
      aiActionRecords: 0,
      appEvents: 0,
      avatarFailed: 0,
      avatarReady: 0,
      avatarStarted: 0,
      conversationMessages: 0,
      date: day,
      discoverExposures: 0,
      greetings: 0,
      greetingsAccepted: 0,
      healthMemos: 0,
      healthVaccines: 0,
      healthWeights: 0,
      label: day.slice(5).replace('-', '/'),
      mapOpens: 0,
      medicalRisk: 0,
      moderationFalseNegative: 0,
      moderationFalsePositive: 0,
      moderationQualitySamples: 0,
      moderationRiskHits: 0,
      moderationSampleReviews: 0,
      moderationSamples: 0,
      moderationTasks: 0,
      newUsers: 0,
      notificationOpens: 0,
      pageViews: 0,
      petChatRequests: 0,
      placeDetailViews: 0,
      placeReviews: 0,
      placeSubmissions: 0,
      poiSearches: 0,
      reports: 0,
      socialComments: 0,
      socialImages: 0,
      socialLikes: 0,
      socialPosts: 0,
      tickets: 0,
      walkInvites: 0,
    });
  }
  return {
    bucketMap: new Map(buckets.map((bucket) => [bucket.date, bucket])),
    buckets,
    days,
  };
}

function incrementAnalyticsBucket(bucketMap, value, key, amount = 1) {
  const day = analyticsDateKey(value);
  const bucket = bucketMap.get(day);
  if (!bucket) return false;
  bucket[key] = Number(bucket[key] || 0) + amount;
  return true;
}

function sumAnalyticsBuckets(buckets, key) {
  return buckets.reduce((sum, bucket) => sum + Number(bucket[key] || 0), 0);
}

function analyticsPercent(part, total) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total || 0)) * 1000) / 10;
}

function analyticsAverage(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (!finiteValues.length) return 0;
  return Math.round(finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length);
}

function flattenAnalyticsMap(map) {
  return Object.values(map || {}).flatMap((items) => (Array.isArray(items) ? items : []));
}

function flattenConversationMessagesForAnalytics() {
  return Object.values(state.conversationMessages || {}).flatMap((conversationMap) =>
    Object.values(conversationMap || {}).flatMap((messages) => (Array.isArray(messages) ? messages : [])),
  );
}

function flattenPetChatMessagesForAnalytics() {
  return Object.values(state.petChatMessages || {}).flatMap((messages) => (Array.isArray(messages) ? messages : []));
}

function analyticsAvatarDurationSeconds(job) {
  const start = analyticsTimeMs(job.acceptedAt || job.createdAt);
  const end = analyticsTimeMs(job.completedAt || job.updatedAt);
  if (!start || !end || end < start) return null;
  return Math.round((end - start) / 1000);
}

function adminAnalytics(options = {}) {
  const { bucketMap, buckets, days } = analyticsWindow(options.days);
  const users = Object.values(state.users || {}).map((user) => ({
    ...user,
    settings: normalizeUserSettings(user.settings),
  }));
  const avatarJobs = Object.values(state.avatarJobs || {});
  const petChatMessages = flattenPetChatMessagesForAnalytics();
  const petChatRequests = petChatMessages.filter((message) => message.author === 'me');
  const petChatReplies = petChatMessages.filter((message) => message.author === 'ai');
  const healthWeights = flattenAnalyticsMap(state.health?.weights);
  const healthMemos = flattenAnalyticsMap(state.health?.memos);
  const healthVaccines = flattenAnalyticsMap(state.health?.vaccines);
  const vaccineReminderIds = flattenAnalyticsMap(state.health?.vaccineReminders);
  const socialPosts = ensureSocialMoments();
  const socialComments = ensureSocialComments();
  const socialLikes = ensureSocialLikes();
  const socialReports = ensureSocialReports();
  const socialBlocks = ensureSocialBlocks();
  const greetings = Array.isArray(state.greetings) ? state.greetings : [];
  const walkInvites = Array.isArray(state.invites) ? state.invites : [];
  const conversationMessages = flattenConversationMessagesForAnalytics().filter((message) => message.author === 'me');
  const placeReviews = adminPlaceReviews();
  const placeSubmissions = adminPlaceSubmissions();
  const tickets = adminSupportTickets({ limit: ADMIN_EXPORT_ROW_LIMIT, priority: 'all', status: 'all' }).tickets;
  const moderationTasks = adminModerationTasks({ limit: ADMIN_EXPORT_ROW_LIMIT, status: 'all' }).tasks;
  const moderationSamples = adminModerationSamples();
  const sanctions = adminSanctions();
  const aiUsage = state.aiUsage || createInitialState().aiUsage;
  const appEvents = pruneAppEvents();

  users.forEach((user) => {
    incrementAnalyticsBucket(bucketMap, user.createdAt, 'newUsers');
    incrementAnalyticsBucket(bucketMap, user.lastSeenAt, 'activeUsers');
  });
  avatarJobs.forEach((job) => {
    incrementAnalyticsBucket(bucketMap, job.createdAt, 'avatarStarted');
    if (job.status === 'ready') incrementAnalyticsBucket(bucketMap, job.updatedAt || job.createdAt, 'avatarReady');
    if (job.status === 'failed') incrementAnalyticsBucket(bucketMap, job.updatedAt || job.createdAt, 'avatarFailed');
  });
  petChatRequests.forEach((message) => incrementAnalyticsBucket(bucketMap, message.time || message.createdAt, 'petChatRequests'));
  petChatReplies
    .filter((message) => message.medicalAlert || message.createdMemo || message.createdWeight || message.updatedVaccine || message.updatedPet)
    .forEach((message) => incrementAnalyticsBucket(bucketMap, message.time || message.createdAt, 'aiActionRecords'));
  healthWeights.forEach((record) => incrementAnalyticsBucket(bucketMap, record.recordedAt || isoDateFromTimestampId(record.id), 'healthWeights'));
  healthMemos.forEach((memo) => incrementAnalyticsBucket(bucketMap, memo.createdAt || isoDateFromTimestampId(memo.id), 'healthMemos'));
  healthVaccines.forEach((vaccine) => incrementAnalyticsBucket(bucketMap, isoDateFromTimestampId(vaccine.id) || vaccine.dueAt, 'healthVaccines'));
  socialPosts.forEach((post) => {
    incrementAnalyticsBucket(bucketMap, post.createdAt, 'socialPosts');
    incrementAnalyticsBucket(bucketMap, post.createdAt, 'socialImages', Array.isArray(post.imageUrls) ? post.imageUrls.length : 0);
  });
  socialLikes.forEach((like) => incrementAnalyticsBucket(bucketMap, like.createdAt, 'socialLikes'));
  socialComments.forEach((comment) => incrementAnalyticsBucket(bucketMap, comment.createdAt, 'socialComments'));
  socialReports.forEach((report) => incrementAnalyticsBucket(bucketMap, report.createdAt, 'reports'));
  greetings.forEach((greeting) => {
    incrementAnalyticsBucket(bucketMap, greeting.at || greeting.createdAt, 'greetings');
    if (greeting.status === 'accepted') incrementAnalyticsBucket(bucketMap, greeting.respondedAt || greeting.at, 'greetingsAccepted');
  });
  walkInvites.forEach((invite) => incrementAnalyticsBucket(bucketMap, invite.at || invite.createdAt, 'walkInvites'));
  conversationMessages.forEach((message) => incrementAnalyticsBucket(bucketMap, message.time || message.createdAt, 'conversationMessages'));
  placeReviews.forEach((review) => incrementAnalyticsBucket(bucketMap, review.createdAt, 'placeReviews'));
  placeSubmissions.forEach((submission) => incrementAnalyticsBucket(bucketMap, submission.createdAt, 'placeSubmissions'));
  tickets.forEach((ticket) => incrementAnalyticsBucket(bucketMap, ticket.createdAt, 'tickets'));
  moderationTasks.forEach((task) => incrementAnalyticsBucket(bucketMap, task.createdAt, 'moderationTasks'));
  moderationSamples.forEach((sample) => {
    incrementAnalyticsBucket(bucketMap, sample.createdAt, 'moderationSamples');
    incrementAnalyticsBucket(bucketMap, sample.createdAt, sample.sampleKind === 'quality_sample' ? 'moderationQualitySamples' : 'moderationRiskHits');
    if (sample.reviewedAt) {
      incrementAnalyticsBucket(bucketMap, sample.reviewedAt, 'moderationSampleReviews');
      if (sample.reviewStatus === 'false_positive') incrementAnalyticsBucket(bucketMap, sample.reviewedAt, 'moderationFalsePositive');
      if (sample.reviewStatus === 'false_negative') incrementAnalyticsBucket(bucketMap, sample.reviewedAt, 'moderationFalseNegative');
    }
  });
  appEvents.forEach((event) => {
    incrementAnalyticsBucket(bucketMap, event.createdAt || event.occurredAt, 'appEvents');
    if (event.name === 'app.page_view') incrementAnalyticsBucket(bucketMap, event.createdAt || event.occurredAt, 'pageViews');
    if (event.name === 'discover.view' || event.name === 'discover.owners_loaded' || event.name === 'discover.pet_circle_loaded') incrementAnalyticsBucket(bucketMap, event.createdAt || event.occurredAt, 'discoverExposures');
    if (event.name === 'map.open') incrementAnalyticsBucket(bucketMap, event.createdAt || event.occurredAt, 'mapOpens');
    if (event.name === 'map.poi_search') incrementAnalyticsBucket(bucketMap, event.createdAt || event.occurredAt, 'poiSearches');
    if (event.name === 'map.place_detail_view') incrementAnalyticsBucket(bucketMap, event.createdAt || event.occurredAt, 'placeDetailViews');
    if (event.name === 'notification.open') incrementAnalyticsBucket(bucketMap, event.createdAt || event.occurredAt, 'notificationOpens');
  });

  const windowAvatarStarted = sumAnalyticsBuckets(buckets, 'avatarStarted');
  const windowAvatarReady = sumAnalyticsBuckets(buckets, 'avatarReady');
  const windowAvatarFailed = sumAnalyticsBuckets(buckets, 'avatarFailed');
  const avatarDurations = avatarJobs
    .filter((job) => job.status === 'ready')
    .map(analyticsAvatarDurationSeconds)
    .filter((value) => value !== null);
  const usersWithReadyAvatar = new Set(avatarJobs.filter((job) => job.status === 'ready' && job.ownerPhone).map((job) => job.ownerPhone));
  const acceptedGreetings = greetings.filter((greeting) => greeting.status === 'accepted').length;
  const handledModerationTasks = moderationTasks.filter((task) => !['pending', 'reviewing', 'escalated'].includes(task.status)).length;
  const moderationSamplesSummary = moderationSampleSummary(moderationSamples);
  const reviewedModerationSamples = moderationSamplesSummary.total - moderationSamplesSummary.unreviewed;
  const validReports = socialReports.filter((report) => report.status === 'valid').length;
  const reviewedPlaceItems = [...placeReviews, ...placeSubmissions].filter((item) => item.status === 'approved' || item.status === 'rejected');
  const approvedPlaceItems = reviewedPlaceItems.filter((item) => item.status === 'approved');
  const activeTodayCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const windowAppEvents = appEvents.filter((event) => bucketMap.has(analyticsDateKey(event.createdAt || event.occurredAt)));
  const appEventUsers = new Set(windowAppEvents.map((event) => event.phone).filter(Boolean));
  const config = currentOpsConfig();

  return {
    buckets,
    dataGaps: [
      { label: '严格留存 Cohort', reason: '当前已有页面浏览事件，可做轻量 DAU；严格留存还需要独立事件表、设备去重和长期窗口。' },
      { label: 'Push 真实送达/点击', reason: '当前只记录站内通知与设备 token，未接厂商回执。' },
      { label: '第三方地图导航完成', reason: '当前只能记录打开导航动作，无法确认用户是否完成高德导航。' },
    ],
    days,
    generatedAt: new Date().toISOString(),
    summary: {
      ai: {
        avatarAverageSeconds: analyticsAverage(avatarDurations),
        avatarFailed: windowAvatarFailed,
        avatarReady: windowAvatarReady,
        avatarStarted: windowAvatarStarted,
        avatarSuccessRate: analyticsPercent(windowAvatarReady, windowAvatarReady + windowAvatarFailed),
        deepseekRequests: Number(aiUsage.deepseek?.requests || 0),
        deepseekTokens: Number(aiUsage.deepseek?.totalTokens || 0),
        gptImage2Cost: Number(aiUsage.gptImage2?.cost || 0),
        medicalRisk: petChatReplies.filter((message) => message.medicalAlert).length,
        petChatRequests: sumAnalyticsBuckets(buckets, 'petChatRequests'),
        readyUserRate: analyticsPercent(usersWithReadyAvatar.size, users.length),
      },
      calendar: {
        aiActionRecords: sumAnalyticsBuckets(buckets, 'aiActionRecords'),
        memos: sumAnalyticsBuckets(buckets, 'healthMemos'),
        reminderEnabled: vaccineReminderIds.length,
        vaccines: sumAnalyticsBuckets(buckets, 'healthVaccines'),
        weights: sumAnalyticsBuckets(buckets, 'healthWeights'),
      },
      places: {
        approvalRate: analyticsPercent(approvedPlaceItems.length, reviewedPlaceItems.length),
        approved: approvedPlaceItems.length,
        mapOpens: sumAnalyticsBuckets(buckets, 'mapOpens'),
        placeDetailViews: sumAnalyticsBuckets(buckets, 'placeDetailViews'),
        poiSearches: sumAnalyticsBuckets(buckets, 'poiSearches'),
        reviews: sumAnalyticsBuckets(buckets, 'placeReviews'),
        submissions: sumAnalyticsBuckets(buckets, 'placeSubmissions'),
      },
      events: {
        discoverExposures: sumAnalyticsBuckets(buckets, 'discoverExposures'),
        enabled: config.analytics?.enabled !== false,
        latestAt: windowAppEvents.map((event) => analyticsTimeMs(event.createdAt)).sort((a, b) => b - a)[0] || 0,
        mapOpens: sumAnalyticsBuckets(buckets, 'mapOpens'),
        notificationOpens: sumAnalyticsBuckets(buckets, 'notificationOpens'),
        pageViews: sumAnalyticsBuckets(buckets, 'pageViews'),
        retentionDays: Number(config.analytics?.retentionDays || 30),
        sampleRatePercent: Number(config.analytics?.sampleRatePercent ?? 100),
        total: sumAnalyticsBuckets(buckets, 'appEvents'),
        uniqueUsers: appEventUsers.size,
      },
      safety: {
        falseNegative: moderationSamplesSummary.falseNegative,
        falsePositive: moderationSamplesSummary.falsePositive,
        handledModerationTasks,
        moderationTasks: sumAnalyticsBuckets(buckets, 'moderationTasks'),
        qualitySamples: moderationSamplesSummary.qualitySamples,
        reportValidRate: analyticsPercent(validReports, socialReports.filter((report) => report.status !== 'pending').length),
        reports: sumAnalyticsBuckets(buckets, 'reports'),
        ruleHits: moderationSamplesSummary.riskHits,
        sampleReviewRate: analyticsPercent(reviewedModerationSamples, moderationSamplesSummary.total),
        sampleReviews: sumAnalyticsBuckets(buckets, 'moderationSampleReviews'),
        sampleRiskHits: sumAnalyticsBuckets(buckets, 'moderationRiskHits'),
        sampleTotal: moderationSamplesSummary.total,
        sampleUnreviewed: moderationSamplesSummary.unreviewed,
        sanctions: sanctions.filter((item) => item.status === 'active').length,
      },
      social: {
        blockCount: socialBlocks.length,
        comments: sumAnalyticsBuckets(buckets, 'socialComments'),
        conversationMessages: sumAnalyticsBuckets(buckets, 'conversationMessages'),
        greetingAcceptRate: analyticsPercent(acceptedGreetings, greetings.length),
        greetings: sumAnalyticsBuckets(buckets, 'greetings'),
        images: sumAnalyticsBuckets(buckets, 'socialImages'),
        likes: sumAnalyticsBuckets(buckets, 'socialLikes'),
        posts: sumAnalyticsBuckets(buckets, 'socialPosts'),
        reports: sumAnalyticsBuckets(buckets, 'reports'),
        walkInvites: sumAnalyticsBuckets(buckets, 'walkInvites'),
      },
      users: {
        activeToday: users.filter((user) => Number(user.lastSeenAt || 0) >= activeTodayCutoff).length,
        activeUsers: sumAnalyticsBuckets(buckets, 'activeUsers'),
        nearbyVisibleRate: analyticsPercent(users.filter((user) => user.settings.nearbyVisible !== false).length, users.length),
        newUsers: sumAnalyticsBuckets(buckets, 'newUsers'),
        pushDeviceCount: Object.values(state.pushDevices || {}).length,
        pushEnabledRate: analyticsPercent(users.filter((user) => user.settings.pushNotifications !== false).length, users.length),
        total: users.length,
        withPetRate: analyticsPercent(users.filter((user) => (user.pets || []).length > 0).length, users.length),
      },
    },
  };
}

function adminAvatarJobs() {
  return Object.values(state.avatarJobs || {})
    .map((job) => {
      const owner = job.ownerPhone ? state.users[job.ownerPhone] : null;
      const media = job.mediaId ? state.mediaUploads?.[job.mediaId] : null;
      const pet = owner?.pets?.find((item) => item.id === job.petId) || (owner ? selectedPetFor(owner) : null);
      return {
        acceptedAt: job.acceptedAt,
        createdAt: job.createdAt,
        errorCode: job.errorCode,
        errorMessage: job.errorMessage,
        id: job.id,
        lastStatusError: job.lastStatusError,
        mediaId: job.mediaId,
        ownerName: owner?.ownerName,
        ownerPhone: job.ownerPhone,
        petId: job.petId,
        petName: pet?.name || job.petName,
        previewUrl: media?.objectUrl || media?.previewUrl || '',
        progress: job.progress,
        provider: job.provider,
        providerStatus: job.providerStatus,
        resultUrl: job.resultUrl,
        status: job.status,
        updatedAt: job.updatedAt,
      };
    })
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
}

function avatarMediaQuality(analysis = {}) {
  if (analysis.status === 'blocked') return 'blocked';
  if (analysis.status === 'warning') return 'warning';
  return 'good';
}

function avatarMediaQualityLabel(quality) {
  if (quality === 'blocked') return '不可生成';
  if (quality === 'warning') return '建议优化';
  return '可生成';
}

function avatarMediaSourceLabel(source) {
  if (source === 'mvp_sample') return '测试样例';
  if (source === 'pet_circle_photo') return '宠友圈图片';
  if (source === 'pet-source') return '宠物原图';
  if (source === 'place_review') return '地点点评';
  if (source === 'place_submission') return '新增地点';
  if (source === 'support') return '工单附件';
  return source || '用户上传';
}

function mediaModerationRiskScore(media, analysis = {}) {
  const status = normalizeMediaModerationStatus(media?.moderationStatus, media);
  const safetyScore = Number(media?.contentSafety?.riskScore);
  if (Number.isFinite(safetyScore) && safetyScore > 0) return Math.max(0, Math.min(100, safetyScore));
  if (status === 'pending_review') return analysis.status === 'blocked' ? 88 : 64;
  if (status === 'hidden' || status === 'rejected') return 76;
  if (analysis.status === 'warning') return 42;
  return 16;
}

function mediaAuditSnapshot(media) {
  if (!media) return null;
  const analysis = media.analysis || {};
  return {
    analysisCode: analysis.code || '',
    analysisStatus: analysis.status || '',
    fileName: media.fileName || '',
    mediaId: media.mediaId || '',
    mimeType: media.mimeType || '',
    contentSafety: media.contentSafety || null,
    moderatedAt: media.moderatedAt || '',
    moderatedBy: media.moderatedBy || '',
    moderationReason: media.moderationReason || '',
    moderationStatus: normalizeMediaModerationStatus(media.moderationStatus, media),
    objectKey: media.objectKey || '',
    objectUrl: media.objectUrl || '',
    ownerPhone: media.ownerPhone || '',
    source: media.source || '',
    storageProvider: media.storageProvider || '',
    updatedAt: media.updatedAt || media.createdAt || '',
  };
}

function mediaUrlCandidates(media, req = null) {
  const urls = new Set();
  if (!media) return urls;
  if (media.objectUrl) urls.add(media.objectUrl);
  if (req && media.mediaId) urls.add(mediaUploadFileUrl(req, media.mediaId));
  return urls;
}

function imageUrlMatchesMedia(imageUrl, media, req = null) {
  const url = String(imageUrl || '').trim();
  if (!url || !media) return false;
  const upload = mediaUploadForImageUrl(url);
  if (upload?.mediaId && upload.mediaId === media.mediaId) return true;
  return mediaUrlCandidates(media, req).has(url);
}

function adminMediaUsage(media, req = null) {
  const mediaId = media?.mediaId || '';
  const posts = ensureSocialMoments()
    .filter((moment) => (moment.imageUrls || []).some((url) => imageUrlMatchesMedia(url, media, req)))
    .map((moment) => ({
      id: moment.id,
      ownerPhone: moment.phone,
      status: moment.status || 'published',
    }));
  const placeReviews = Object.entries(state.placeReviews || {}).flatMap(([phone, reviews]) =>
    (Array.isArray(reviews) ? reviews : [])
      .filter((review) => (review.imageUrls || []).some((url) => imageUrlMatchesMedia(url, media, req)))
      .map((review) => ({
        id: review.id,
        ownerPhone: phone,
        placeId: review.placeId || '',
        status: review.status || 'pending_review',
      })),
  );
  const placeSubmissions = Object.entries(state.placeSubmissions || {}).flatMap(([phone, submissions]) =>
    (Array.isArray(submissions) ? submissions : [])
      .filter((submission) => (submission.imageUrls || []).some((url) => imageUrlMatchesMedia(url, media, req)))
      .map((submission) => ({
        id: submission.id,
        name: submission.name || '',
        ownerPhone: phone,
        status: submission.status || 'pending_review',
      })),
  );
  const coverPets = [];
  const avatarPets = [];
  for (const user of Object.values(state.users || {})) {
    for (const pet of Array.isArray(user.pets) ? user.pets : []) {
      if (imageUrlMatchesMedia(pet.petCircleCoverImageUrl, media, req)) coverPets.push({ id: pet.id, name: pet.name || '', ownerPhone: user.phone });
      if (imageUrlMatchesMedia(pet.avatarUrl, media, req)) avatarPets.push({ id: pet.id, name: pet.name || '', ownerPhone: user.phone });
    }
  }
  const avatarJobs = Object.values(state.avatarJobs || {})
    .filter((job) => job.mediaId === mediaId)
    .map((job) => ({ id: job.id, status: job.status || '', ownerPhone: job.ownerPhone || '' }));
  return {
    avatarJobCount: avatarJobs.length,
    avatarJobs,
    avatarPetCount: avatarPets.length,
    avatarPets,
    coverPetCount: coverPets.length,
    coverPets,
    placeReviewCount: placeReviews.length,
    placeReviews,
    placeSubmissionCount: placeSubmissions.length,
    placeSubmissions,
    postCount: posts.length,
    posts,
  };
}

function adminMediaModerationItem(media, req = null) {
  const base = adminAiMediaItem(media, req);
  const analysis = media?.analysis || {};
  const contentSafety = media?.contentSafety || null;
  const status = normalizeMediaModerationStatus(media?.moderationStatus, media);
  const usage = adminMediaUsage(media, req);
  const riskTypes = [
    ...(Array.isArray(contentSafety?.riskTypes) ? contentSafety.riskTypes : []),
    avatarMediaQualityLabel(base.quality),
    ...(Array.isArray(analysis.tags) ? analysis.tags : []),
  ].filter(Boolean);
  return {
    ...base,
    contentSafety,
    moderatedAt: media?.moderatedAt || '',
    moderatedBy: media?.moderatedBy || '',
    moderationReason: media?.moderationReason || '',
    moderationStatus: status,
    moderationStatusLabel: mediaModerationStatusLabel(status),
    references: usage,
    riskScore: mediaModerationRiskScore(media, analysis),
    riskTypes,
    status,
    statusLabel: mediaModerationStatusLabel(status),
  };
}

function adminMediaModeration(options = {}, req = null) {
  const q = String(options.q || '').trim().toLowerCase();
  const statusFilter = String(options.status || 'pending_review');
  const limit = Math.floor(clampNumber(options.limit, 300, 1, ADMIN_EXPORT_ROW_LIMIT));
  const allItems = Object.values(state.mediaUploads || {})
    .map((media) => adminMediaModerationItem(media, req))
    .sort((a, b) => {
      if (a.status === 'pending_review' && b.status !== 'pending_review') return -1;
      if (b.status === 'pending_review' && a.status !== 'pending_review') return 1;
      return analyticsTimeMs(b.createdAt || b.updatedAt) - analyticsTimeMs(a.createdAt || a.updatedAt);
    });
  const filtered = allItems.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (!q) return true;
    const haystack = [
      item.mediaId,
      item.ownerPhone,
      item.ownerName,
      item.petName,
      item.petId,
      item.analysisCode,
      item.analysisTitle,
      item.source,
      item.sourceLabel,
      item.statusLabel,
      item.moderationReason,
      item.latestAvatarJobId,
      item.latestAvatarJobStatus,
      ...(item.references?.posts || []).map((post) => post.id),
      ...(item.references?.placeReviews || []).map((review) => review.id),
      ...(item.references?.placeSubmissions || []).map((submission) => submission.id),
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
  return {
    items: filtered.slice(0, limit),
    summary: {
      all: allItems.length,
      approved: allItems.filter((item) => item.status === 'approved').length,
      hidden: allItems.filter((item) => item.status === 'hidden').length,
      pending: allItems.filter((item) => item.status === 'pending_review').length,
      referencedByPlaces: allItems.filter((item) => (item.references?.placeReviewCount || 0) + (item.references?.placeSubmissionCount || 0) > 0).length,
      referencedByPosts: allItems.filter((item) => item.references?.postCount > 0).length,
      rejected: allItems.filter((item) => item.status === 'rejected').length,
      totalMedia: allItems.length,
    },
  };
}

function notifyMediaModeration(media, action, reason) {
  const phone = normalizePhone(media?.ownerPhone);
  if (!phone || !state.users?.[phone]) return false;
  if (action !== 'hide' && action !== 'reject') return false;
  const label = action === 'reject' ? '未通过审核' : '已被隐藏';
  const reasonText = String(reason || '').trim();
  return addNotification(phone, {
    actionRoute: 'profile',
    category: 'system',
    createdAt: new Date().toISOString(),
    id: `n-media-${media.mediaId}-${Date.now()}`,
    kind: 'system',
    read: false,
    text: reasonText
      ? `你上传的一张图片${label}，原因：${reasonText}。请重新上传合适的图片。`
      : `你上传的一张图片${label}。请重新上传合适的图片。`,
    title: `图片${label}`,
  }, 'system', { force: true });
}

function adminModerateMediaUpload(admin, mediaId, actionInput, body = {}, req = null) {
  const id = String(mediaId || '').trim();
  const media = state.mediaUploads?.[id];
  if (!media) return { error: '图片素材不存在', statusCode: 404 };
  const action = String(actionInput || '').trim();
  const nextStatusByAction = {
    approve: 'approved',
    hide: 'hidden',
    reject: 'rejected',
    restore: 'approved',
    review: 'pending_review',
  };
  const nextStatus = nextStatusByAction[action];
  if (!nextStatus) return { error: '不支持的图片审核动作', statusCode: 400 };
  const reason = adminReason(body, `图片审核：${mediaModerationStatusLabel(nextStatus)}`);
  const before = mediaAuditSnapshot(media);
  const now = new Date().toISOString();
  media.moderationStatus = nextStatus;
  media.moderationReason = reason;
  media.moderatedAt = now;
  media.moderatedBy = admin?.username || 'admin';
  media.updatedAt = now;
  notifyMediaModeration(media, action, reason);
  const after = mediaAuditSnapshot(media);
  writeAdminAudit(admin, `media.moderation.${action}`, 'media_upload', id, before, after, reason);
  return { item: adminMediaModerationItem(media, req) };
}

function avatarFeedbackReasonLabel(reason) {
  const labels = {
    color: '毛色/花纹不像',
    expression: '表情不像',
    face_shape: '脸型不像',
    not_same_pet: '不像同一只宠物',
    other: '其他',
    style: '风格不喜欢',
  };
  return labels[reason] || '其他';
}

function avatarFeedbackStatusLabel(status) {
  return status === 'reviewed' ? '已处理' : '待处理';
}

function adminAiMediaItem(media, req) {
  const mediaId = media?.mediaId || '';
  const ownerPhone = normalizePhone(media?.ownerPhone);
  const owner = ownerPhone ? state.users[ownerPhone] : null;
  const relatedJobs = Object.values(state.avatarJobs || {}).filter((job) => job.mediaId === mediaId);
  const latestJob = relatedJobs
    .slice()
    .sort((a, b) => analyticsTimeMs(b.updatedAt || b.createdAt) - analyticsTimeMs(a.updatedAt || a.createdAt))[0] || null;
  const pet = owner?.pets?.find((item) => item.id === latestJob?.petId) || (owner ? selectedPetFor(owner) : null);
  const analysis = media?.analysis || analyzeUploadedPetMedia({}, media?.dataUrl);
  const quality = avatarMediaQuality(analysis);
  const fileUrl = media?.objectUrl || (req && mediaId ? mediaUploadFileUrl(req, mediaId) : '');
  const previewUrl = media?.objectUrl || media?.previewUrl || fileUrl || '';
  const adminPreviewUrl = media?.dataUrl || previewUrl;
  const sizeKb = Math.round(uploadedMediaBytes(media?.dataUrl) / 1024);
  return {
    analysisCode: analysis.code || '',
    analysisMessage: analysis.message || '',
    analysisTitle: analysis.title || '',
    adminPreviewUrl,
    avatarJobCount: relatedJobs.length,
    canGenerate: analysis.canGenerate !== false,
    createdAt: media?.createdAt || '',
    fileName: media?.fileName || '',
    fileUrl,
    latestAvatarJobId: latestJob?.id || '',
    latestAvatarJobStatus: latestJob?.status || '',
    mediaId,
    mimeType: media?.mimeType || '',
    ownerName: owner?.ownerName || (ownerPhone ? `用户${ownerPhone.slice(-4)}` : ''),
    ownerPhone,
    petId: pet?.id || latestJob?.petId || '',
    petName: pet?.name || latestJob?.petName || '',
    previewUrl,
    quality,
    qualityLabel: avatarMediaQualityLabel(quality),
    qualityScore: Number(analysis.qualityScore || 0),
    sizeKb,
    source: media?.source || '',
    sourceLabel: avatarMediaSourceLabel(media?.source),
    storageProvider: media?.storageProvider || '',
    suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
    tags: Array.isArray(analysis.tags) ? analysis.tags : [],
    updatedAt: media?.updatedAt || media?.createdAt || '',
  };
}

function adminAiMedia(options = {}, req = null) {
  const q = String(options.q || '').trim().toLowerCase();
  const qualityFilter = String(options.quality || 'all');
  const limit = Math.floor(clampNumber(options.limit, 300, 1, ADMIN_EXPORT_ROW_LIMIT));
  const allItems = Object.values(state.mediaUploads || {})
    .map((media) => adminAiMediaItem(media, req))
    .sort((a, b) => analyticsTimeMs(b.createdAt || b.updatedAt) - analyticsTimeMs(a.createdAt || a.updatedAt));
  const filtered = allItems.filter((item) => {
    if (qualityFilter !== 'all' && item.quality !== qualityFilter) return false;
    if (!q) return true;
    const haystack = [
      item.mediaId,
      item.ownerPhone,
      item.ownerName,
      item.petName,
      item.petId,
      item.analysisCode,
      item.analysisTitle,
      item.source,
      item.sourceLabel,
      item.latestAvatarJobId,
      item.latestAvatarJobStatus,
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
  return {
    items: filtered.slice(0, limit),
    summary: {
      all: filtered.length,
      blocked: allItems.filter((item) => item.quality === 'blocked').length,
      good: allItems.filter((item) => item.quality === 'good').length,
      linked: allItems.filter((item) => item.avatarJobCount > 0).length,
      totalMedia: allItems.length,
      warning: allItems.filter((item) => item.quality === 'warning').length,
    },
  };
}

function adminAvatarFeedbackItem(job, req = null) {
  const feedback = job?.feedback || {};
  const owner = job?.ownerPhone ? state.users[job.ownerPhone] : null;
  const media = job?.mediaId ? state.mediaUploads?.[job.mediaId] : null;
  const pet = owner?.pets?.find((item) => item.id === job.petId) || (owner ? selectedPetFor(owner) : null);
  const status = feedback.status === 'reviewed' ? 'reviewed' : 'received';
  const mediaPreviewUrl = media?.objectUrl || media?.previewUrl || (req && media?.mediaId ? mediaUploadFileUrl(req, media.mediaId) : '');
  return {
    content: feedback.content || '',
    createdAt: feedback.createdAt || job?.updatedAt || job?.createdAt || '',
    jobId: job?.id || '',
    jobStatus: job?.status || '',
    mediaId: job?.mediaId || '',
    mediaPreviewUrl,
    ownerName: owner?.ownerName || (job?.ownerPhone ? `用户${String(job.ownerPhone).slice(-4)}` : ''),
    ownerPhone: job?.ownerPhone || '',
    petId: pet?.id || job?.petId || '',
    petName: pet?.name || job?.petName || '',
    progress: job?.progress || 0,
    provider: job?.provider || '',
    reason: feedback.reason || 'other',
    reasonLabel: avatarFeedbackReasonLabel(feedback.reason || 'other'),
    resultUrl: job?.resultUrl || '',
    reviewNote: feedback.reviewNote || '',
    reviewedAt: feedback.reviewedAt || '',
    reviewedBy: feedback.reviewedBy || '',
    status,
    statusLabel: avatarFeedbackStatusLabel(status),
    updatedAt: job?.updatedAt || '',
  };
}

function adminAvatarFeedback(options = {}, req = null) {
  const q = String(options.q || '').trim().toLowerCase();
  const reasonFilter = String(options.reason || 'all');
  const statusFilter = String(options.status || 'all');
  const limit = Math.floor(clampNumber(options.limit, 300, 1, ADMIN_EXPORT_ROW_LIMIT));
  const allItems = Object.values(state.avatarJobs || {})
    .filter((job) => job?.feedback)
    .map((job) => adminAvatarFeedbackItem(job, req))
    .sort((a, b) => analyticsTimeMs(b.createdAt || b.updatedAt) - analyticsTimeMs(a.createdAt || a.updatedAt));
  const filtered = allItems.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (reasonFilter !== 'all' && item.reason !== reasonFilter) return false;
    if (!q) return true;
    const haystack = [
      item.jobId,
      item.ownerPhone,
      item.ownerName,
      item.petName,
      item.petId,
      item.mediaId,
      item.provider,
      item.reason,
      item.reasonLabel,
      item.content,
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
  return {
    items: filtered.slice(0, limit),
    summary: {
      all: filtered.length,
      hasContent: allItems.filter((item) => item.content).length,
      received: allItems.filter((item) => item.status !== 'reviewed').length,
      reviewed: allItems.filter((item) => item.status === 'reviewed').length,
      style: allItems.filter((item) => item.reason === 'style').length,
      totalFeedback: allItems.length,
      unlikePet: allItems.filter((item) => ['color', 'expression', 'face_shape', 'not_same_pet'].includes(item.reason)).length,
    },
  };
}

function reviewAvatarFeedback(admin, jobId, body = {}, req = null) {
  const job = state.avatarJobs?.[jobId];
  if (!job?.feedback) return { error: 'AI 生成反馈不存在', statusCode: 404 };
  const before = cloneJson(job.feedback);
  const note = String(body.reviewNote || body.note || body.reason || '').trim().slice(0, 240);
  job.feedback = {
    ...job.feedback,
    reviewedAt: new Date().toISOString(),
    reviewedBy: admin?.username || 'admin',
    status: 'reviewed',
    ...(note ? { reviewNote: note } : {}),
  };
  touchAvatarJob(job);
  writeAdminAudit(admin, 'ai.avatar.feedback.review', 'avatar_job', job.id, before, job.feedback, adminReason(body, '标记 AI 生成反馈已处理'));
  return { item: adminAvatarFeedbackItem(job, req) };
}

function adminProviderLabel(provider) {
  if (provider === 'gpt-image-2') return 'GPT Image 2';
  if (provider === 'ttapi-flux-edits') return 'TTAPI Flux';
  if (provider === 'ttapi-midjourney') return 'TTAPI Midjourney';
  if (provider === 'mock') return 'Mock 本地生成';
  return provider || '未知供应商';
}

function adminProviderUsageBucket(provider, aiUsage) {
  if (provider === 'gpt-image-2') {
    return { ...(createInitialState().aiUsage.gptImage2), ...(aiUsage.gptImage2 || {}) };
  }
  if (provider === 'ttapi-flux-edits') {
    return { ...(createInitialState().aiUsage.ttapiFlux), ...(aiUsage.ttapiFlux || {}) };
  }
  if (provider === 'ttapi-midjourney') {
    return { ...(createInitialState().aiUsage.ttapiMidjourney), ...(aiUsage.ttapiMidjourney || {}) };
  }
  return { failed: 0, quota: 0, requests: 0, succeeded: 0 };
}

function adminProviderRoleLabel(provider) {
  if (provider === PET_AVATAR_PROVIDER) return '当前启用';
  if (provider === 'mock') return '兜底/测试';
  return '历史/备用';
}

function adminUsageCountForToday(store = {}) {
  const day = todayUsageKey();
  const rows = Object.entries(store || {}).filter(([, usage]) => usage?.day === day);
  return {
    count: rows.reduce((sum, [, usage]) => sum + Number(usage?.count || 0), 0),
    users: rows.length,
  };
}

function adminQuotaHitCount(store = {}, limit = 0) {
  const day = todayUsageKey();
  const normalizedLimit = Math.max(0, Number(limit) || 0);
  if (!normalizedLimit) return 0;
  return Object.values(store || {}).filter((usage) => usage?.day === day && Number(usage.count || 0) >= normalizedLimit).length;
}

function adminErrorCodeRows(jobs) {
  const map = new Map();
  jobs
    .filter((job) => job.status === 'failed' || job.errorCode || job.lastStatusError)
    .forEach((job) => {
      const code = String(job.errorCode || (job.lastStatusError ? 'STATUS_REFRESH_ERROR' : 'UNKNOWN')).trim() || 'UNKNOWN';
      const entry = map.get(code) || {
        code,
        count: 0,
        latestAt: 0,
        latestMessage: '',
        providers: new Set(),
      };
      entry.count += 1;
      entry.providers.add(job.provider || 'unknown');
      const latestAt = analyticsTimeMs(job.updatedAt || job.createdAt);
      if (latestAt >= entry.latestAt) {
        entry.latestAt = latestAt;
        entry.latestMessage = job.errorMessage || job.lastStatusError || '';
      }
      map.set(code, entry);
    });
  return [...map.values()]
    .map((entry) => ({
      code: entry.code,
      count: entry.count,
      latestAt: entry.latestAt,
      latestMessage: entry.latestMessage,
      providers: [...entry.providers],
    }))
    .sort((a, b) => b.count - a.count || b.latestAt - a.latestAt)
    .slice(0, 8);
}

function adminAiUsage(options = {}) {
  const { bucketMap, buckets, days } = analyticsWindow(options.days || 14);
  const aiUsage = {
    ...createInitialState().aiUsage,
    ...(state.aiUsage || {}),
    deepseek: { ...createInitialState().aiUsage.deepseek, ...(state.aiUsage?.deepseek || {}) },
    gptImage2: { ...createInitialState().aiUsage.gptImage2, ...(state.aiUsage?.gptImage2 || {}) },
    ttapiFlux: { ...createInitialState().aiUsage.ttapiFlux, ...(state.aiUsage?.ttapiFlux || {}) },
    ttapiMidjourney: { ...createInitialState().aiUsage.ttapiMidjourney, ...(state.aiUsage?.ttapiMidjourney || {}) },
  };
  const avatarJobs = Object.values(state.avatarJobs || {});
  const petChatMessages = flattenPetChatMessagesForAnalytics();
  const petChatRequests = petChatMessages.filter((message) => message.author === 'me');
  const petChatReplies = petChatMessages.filter((message) => message.author === 'ai');
  const actionReplies = petChatReplies.filter((message) => message.medicalAlert || message.createdMemo || message.createdWeight || message.updatedVaccine || message.updatedPet);
  const medicalRisk = petChatReplies.filter((message) => message.medicalAlert);

  avatarJobs.forEach((job) => {
    incrementAnalyticsBucket(bucketMap, job.createdAt, 'avatarStarted');
    if (job.status === 'ready') incrementAnalyticsBucket(bucketMap, job.updatedAt || job.createdAt, 'avatarReady');
    if (job.status === 'failed') incrementAnalyticsBucket(bucketMap, job.updatedAt || job.createdAt, 'avatarFailed');
  });
  petChatRequests.forEach((message) => incrementAnalyticsBucket(bucketMap, message.time || message.createdAt, 'petChatRequests'));
  actionReplies.forEach((message) => incrementAnalyticsBucket(bucketMap, message.time || message.createdAt, 'aiActionRecords'));
  medicalRisk.forEach((message) => incrementAnalyticsBucket(bucketMap, message.time || message.createdAt, 'medicalRisk'));

  const processing = avatarJobs.filter((job) => job.status === 'processing');
  const stuck = processing.filter((job) => Date.now() - analyticsTimeMs(job.updatedAt || job.createdAt) > 5 * 60 * 1000);
  const ready = avatarJobs.filter((job) => job.status === 'ready');
  const failed = avatarJobs.filter((job) => job.status === 'failed');
  const avatarDurations = ready.map(analyticsAvatarDurationSeconds).filter((value) => value !== null);
  const ownerPhones = new Set(avatarJobs.map((job) => job.ownerPhone).filter(Boolean));
  const errorCodes = adminErrorCodeRows(avatarJobs);

  const providers = ['gpt-image-2', 'ttapi-flux-edits', 'ttapi-midjourney', 'mock']
    .map((provider) => {
      const usage = adminProviderUsageBucket(provider, aiUsage);
      const jobs = avatarJobs.filter((job) => (job.provider || 'mock') === provider);
      const providerReady = jobs.filter((job) => job.status === 'ready');
      const providerFailed = jobs.filter((job) => job.status === 'failed');
      const providerProcessing = jobs.filter((job) => job.status === 'processing');
      const providerStuck = providerProcessing.filter((job) => Date.now() - analyticsTimeMs(job.updatedAt || job.createdAt) > 5 * 60 * 1000);
      const durations = providerReady.map(analyticsAvatarDurationSeconds).filter((value) => value !== null);
      const providerErrors = adminErrorCodeRows(jobs);
      return {
        averageSeconds: analyticsAverage(durations),
        cost: Number(usage.cost || 0),
        creditsCost: Number(usage.creditsCost || 0),
        failed: Number(usage.failed || providerFailed.length || 0),
        jobCount: jobs.length,
        label: adminProviderLabel(provider),
        latestJobAt: jobs.map((job) => analyticsTimeMs(job.updatedAt || job.createdAt)).sort((a, b) => b - a)[0] || 0,
        processing: providerProcessing.length,
        provider,
        quota: Number(usage.quota || 0),
        ready: providerReady.length,
        requests: Number(usage.requests || jobs.length || 0),
        roleLabel: adminProviderRoleLabel(provider),
        stuck: providerStuck.length,
        succeeded: Number(usage.succeeded || providerReady.length || 0),
        successRate: analyticsPercent(providerReady.length, providerReady.length + providerFailed.length),
        topErrorCode: providerErrors[0]?.code || '',
      };
    })
    .filter((provider) => provider.jobCount || provider.requests || provider.provider === PET_AVATAR_PROVIDER);

  const todayAvatarUsage = adminUsageCountForToday(state.petAvatarDailyUsage);
  const todayPetChatUsage = adminUsageCountForToday(state.petChatDailyUsage);
  const averageReplyLength = analyticsAverage(petChatReplies.map((message) => String(message.text || '').length));
  const windowAvatarReady = sumAnalyticsBuckets(buckets, 'avatarReady');
  const windowAvatarFailed = sumAnalyticsBuckets(buckets, 'avatarFailed');
  const deepseekRequests = Number(aiUsage.deepseek?.requests || 0);
  const deepseekTokens = Number(aiUsage.deepseek?.totalTokens || 0);
  return {
    buckets,
    dataGaps: [
      { label: '今日 AI 成本', reason: '当前 gpt-image2 成本是累计字段，缺少逐次调用时间，不能可靠拆成今日成本。' },
      { label: '供应商原始 SLA', reason: '当前只持久化业务任务时间，未完整保存 submit / queued / running / completed 每个上游节点。' },
      { label: 'DeepSeek 单次成本', reason: '当前记录 token 总量，未配置单价和每条消息成本快照。' },
    ],
    days,
    generatedAt: new Date().toISOString(),
    limits: {
      petAvatarDailyLimit: effectivePetAvatarDailyLimit(),
      petChatDailyLimit: effectivePetChatDailyLimit(),
    },
    providers,
    summary: {
      actionRecords: actionReplies.length,
      averageReplyLength,
      avatarAverageSeconds: analyticsAverage(avatarDurations),
      avatarFailed: failed.length,
      avatarProcessing: processing.length,
      avatarReady: ready.length,
      avatarStarted: avatarJobs.length,
      avatarStuck: stuck.length,
      avatarSuccessRate: analyticsPercent(windowAvatarReady, windowAvatarReady + windowAvatarFailed),
      averageAvatarJobsPerUser: ownerPhones.size ? Math.round((avatarJobs.length / ownerPhones.size) * 10) / 10 : 0,
      deepseekAverageTokens: deepseekRequests ? Math.round(deepseekTokens / deepseekRequests) : 0,
      deepseekRequests,
      deepseekTokens,
      gptImage2Cost: Number(aiUsage.gptImage2?.cost || 0),
      gptImage2CreditsCost: Number(aiUsage.gptImage2?.creditsCost || 0),
      medicalRisk: medicalRisk.length,
      petAvatarQuotaHitUsers: adminQuotaHitCount(state.petAvatarDailyUsage, effectivePetAvatarDailyLimit()),
      petChatQuotaHitUsers: adminQuotaHitCount(state.petChatDailyUsage, effectivePetChatDailyLimit()),
      todayPetAvatarCount: todayAvatarUsage.count,
      todayPetAvatarUsers: todayAvatarUsage.users,
      todayPetChatCount: todayPetChatUsage.count,
      todayPetChatUsers: todayPetChatUsage.users,
      windowAvatarFailed,
      windowAvatarReady,
      windowAvatarStarted: sumAnalyticsBuckets(buckets, 'avatarStarted'),
      windowPetChatRequests: sumAnalyticsBuckets(buckets, 'petChatRequests'),
    },
    topErrors: errorCodes,
  };
}

function adminSocialPosts() {
  return ensureSocialMoments()
    .map((moment) => {
      const owner = state.users[moment.phone];
      const pet = owner ? activePetFor(owner) : null;
      const comments = ensureSocialComments().filter((comment) => comment.postId === moment.id && (comment.status || 'published') === 'published');
      const reports = ensureSocialReports().filter((report) => report.targetType === 'post' && report.targetId === moment.id);
      return {
        commentCount: comments.length,
        content: moment.content,
        createdAt: moment.createdAt,
        id: moment.id,
        imageUrls: Array.isArray(moment.imageUrls) ? moment.imageUrls : [],
        likeCount: ensureSocialLikes().filter((like) => like.postId === moment.id).length,
        moderation: moment.moderation || null,
        ownerName: owner?.ownerName || `用户${String(moment.phone || '').slice(-4)}`,
        ownerPhone: moment.phone,
        petName: pet?.name,
        reportCount: reports.length,
        status: moment.status || 'published',
        updatedAt: moment.updatedAt,
        visibility: moment.visibility || 'nearby',
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function adminSocialComments() {
  return ensureSocialComments()
    .map((comment) => {
      const owner = state.users[comment.phone];
      const post = findSocialMomentById(comment.postId);
      const reports = ensureSocialReports().filter((report) => report.targetType === 'comment' && report.targetId === comment.id);
      return {
        content: comment.content,
        createdAt: comment.createdAt,
        id: comment.id,
        ownerName: owner?.ownerName || `用户${String(comment.phone || '').slice(-4)}`,
        ownerPhone: comment.phone,
        postId: comment.postId,
        postOwnerPhone: post?.phone,
        moderation: comment.moderation || null,
        reportCount: reports.length,
        status: comment.status || 'published',
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function adminSocialReports() {
  return ensureSocialReports()
    .map((report) => {
      const reporter = state.users[report.phone];
      const owner = state.users[report.ownerPhone];
      const evidenceSnapshot = socialReportEvidenceSnapshot(report);
      const suggestion = report.sanctionSuggestion || ((report.status || 'pending') === 'valid'
        ? buildReportSanctionSuggestion({ username: report.reviewedBy || 'admin' }, report, report.reviewReason || '')
        : null);
      return {
        content: report.content,
        createdAt: report.createdAt,
        evidenceSnapshot,
        id: report.id,
        ownerName: owner?.ownerName || `用户${String(report.ownerPhone || '').slice(-4)}`,
        ownerPhone: report.ownerPhone,
        ownerResultNotifiedAt: report.ownerResultNotifiedAt || '',
        ownerResultNotifiedStatus: report.ownerResultNotifiedStatus || '',
        reporterName: reporter?.ownerName || `用户${String(report.phone || '').slice(-4)}`,
        reporterPhone: report.phone,
        resultNotifiedAt: report.resultNotifiedAt || '',
        resultNotifiedStatus: report.resultNotifiedStatus || '',
        sanctionId: report.sanctionId || suggestion?.sanctionId || '',
        sanctionSuggestion: suggestion ? {
          ...suggestion,
          typeLabel: SANCTION_TYPE_LABELS[suggestion.type] || suggestion.type,
        } : null,
        status: report.status || 'pending',
        targetId: report.targetId,
        targetType: report.targetType,
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function adminPlaceReviews() {
  state.placeReviews = state.placeReviews || {};
  return Object.entries(state.placeReviews).flatMap(([phone, reviews]) =>
    (Array.isArray(reviews) ? reviews : []).map((review) => {
      const place = (state.places || []).find((item) => item.id === review.placeId);
      const owner = state.users[phone];
      return {
        ...review,
        ownerName: owner?.ownerName || `用户${phone.slice(-4)}`,
        ownerPhone: phone,
        placeName: place?.name || review.placeId,
      };
    }),
  ).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function adminPlaceSubmissions() {
  state.placeSubmissions = state.placeSubmissions || {};
  return Object.entries(state.placeSubmissions).flatMap(([phone, submissions]) =>
    (Array.isArray(submissions) ? submissions : []).map((submission) => {
      const owner = state.users[phone];
      const duplicateCandidates = placeDuplicateCandidates({
        address: submission.address,
        category: 'other',
        id: submission.id,
        name: submission.name,
        source: 'submission',
      }, state.places || [], 5);
      return {
        ...submission,
        duplicateCandidates,
        duplicateCandidateCount: duplicateCandidates.length,
        ownerName: owner?.ownerName || `用户${phone.slice(-4)}`,
        ownerPhone: phone,
      };
    }),
  ).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function findPlaceReview(reviewId) {
  for (const [phone, reviews] of Object.entries(state.placeReviews || {})) {
    const review = Array.isArray(reviews) ? reviews.find((item) => item.id === reviewId) : null;
    if (review) return { phone, review };
  }
  return null;
}

function findPlaceSubmission(submissionId) {
  for (const [phone, submissions] of Object.entries(state.placeSubmissions || {})) {
    const submission = Array.isArray(submissions) ? submissions.find((item) => item.id === submissionId) : null;
    if (submission) return { phone, submission };
  }
  return null;
}

const PLACE_MODERATION_TEMPLATE_KIND_SET = new Set(['review', 'submission']);
const PLACE_MODERATION_TEMPLATE_ACTION_SET = new Set(['approve', 'reject']);

function normalizePlaceModerationTemplateKind(value) {
  const kind = String(value || '').trim();
  return PLACE_MODERATION_TEMPLATE_KIND_SET.has(kind) ? kind : 'review';
}

function normalizePlaceModerationTemplateAction(value) {
  const action = String(value || '').trim();
  return PLACE_MODERATION_TEMPLATE_ACTION_SET.has(action) ? action : 'reject';
}

function normalizePlaceModerationTemplateEnabled(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['0', 'false', 'no', 'off', 'disabled'].includes(text)) return false;
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(text)) return true;
  return fallback;
}

function normalizePlaceModerationTemplateSortOrder(value, fallback = 100) {
  if (value === undefined || value === null || value === '') return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(9999, Math.round(numeric)));
}

function normalizePlaceModerationTemplate(item = {}, fallback = {}) {
  const builtin = Boolean(fallback.builtin || item.builtin);
  return {
    action: normalizePlaceModerationTemplateAction(item.action || fallback.action),
    builtin,
    createdAt: item.createdAt || fallback.createdAt || '',
    createdBy: item.createdBy || fallback.createdBy || '',
    enabled: builtin ? true : normalizePlaceModerationTemplateEnabled(item.enabled, fallback.enabled !== false),
    id: String(item.id || fallback.id || `place-moderation-template-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`).trim().slice(0, 120),
    kind: normalizePlaceModerationTemplateKind(item.kind || fallback.kind),
    reason: String(item.reason || fallback.reason || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    sortOrder: normalizePlaceModerationTemplateSortOrder(item.sortOrder, fallback.sortOrder),
    title: String(item.title || fallback.title || '').replace(/\s+/g, ' ').trim().slice(0, 48),
    updatedAt: item.updatedAt || fallback.updatedAt || '',
    updatedBy: item.updatedBy || fallback.updatedBy || '',
  };
}

function validatePlaceModerationTemplate(template) {
  if (!template.title) return { error: '请填写地点审核模板标题', statusCode: 400 };
  if (!template.reason) return { error: '请填写地点审核模板原因', statusCode: 400 };
  if (!PLACE_MODERATION_TEMPLATE_KIND_SET.has(template.kind)) return { error: '地点审核模板类型无效', statusCode: 400 };
  if (!PLACE_MODERATION_TEMPLATE_ACTION_SET.has(template.action)) return { error: '地点审核模板动作无效', statusCode: 400 };
  return null;
}

function validatePlaceModerationTemplateInput(body = {}, options = {}) {
  const partial = Boolean(options.partial);
  if ((!partial || Object.prototype.hasOwnProperty.call(body, 'kind')) && body.kind !== undefined) {
    const kind = String(body.kind || '').trim();
    if (kind && !PLACE_MODERATION_TEMPLATE_KIND_SET.has(kind)) return { error: '地点审核模板类型无效', statusCode: 400 };
  }
  if ((!partial || Object.prototype.hasOwnProperty.call(body, 'action')) && body.action !== undefined) {
    const action = String(body.action || '').trim();
    if (action && !PLACE_MODERATION_TEMPLATE_ACTION_SET.has(action)) return { error: '地点审核模板动作无效', statusCode: 400 };
  }
  return null;
}

function ensurePlaceModerationTemplates() {
  state.placeModerationTemplates = Array.isArray(state.placeModerationTemplates)
    ? state.placeModerationTemplates.map((item) => normalizePlaceModerationTemplate(item, { builtin: false })).filter((item) => item.title && item.reason)
    : [];
  return state.placeModerationTemplates;
}

function builtinPlaceModerationTemplates() {
  return PLACE_MODERATION_TEMPLATES.map((template, index) => normalizePlaceModerationTemplate(template, {
    builtin: true,
    enabled: true,
    sortOrder: (index + 1) * 10,
  }));
}

function placeModerationTemplateUsageStats() {
  const stats = new Map();
  const collect = (item) => {
    const id = String(item?.reviewTemplateId || '').trim();
    if (!id) return;
    const current = stats.get(id) || { lastUsedAt: '', usageCount: 0 };
    current.usageCount += 1;
    const usedAt = item.reviewedAt || item.updatedAt || item.createdAt || '';
    if (String(usedAt).localeCompare(current.lastUsedAt || '') > 0) current.lastUsedAt = usedAt;
    stats.set(id, current);
  };
  adminPlaceReviews().forEach(collect);
  adminPlaceSubmissions().forEach(collect);
  return stats;
}

function adminPlaceModerationTemplates(options = {}) {
  const includeDisabled = options.includeDisabled !== false;
  const usageStats = placeModerationTemplateUsageStats();
  return [...builtinPlaceModerationTemplates(), ...ensurePlaceModerationTemplates()]
    .filter((template) => includeDisabled || template.enabled !== false)
    .map((template) => ({
      ...template,
      ...(usageStats.get(template.id) || { lastUsedAt: '', usageCount: 0 }),
    }))
    .sort((a, b) =>
      String(a.kind).localeCompare(String(b.kind))
      || String(a.action).localeCompare(String(b.action))
      || Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      || String(a.title).localeCompare(String(b.title)),
    );
}

function placeModerationTemplateById(templateId) {
  const id = String(templateId || '').trim();
  if (!id) return null;
  return adminPlaceModerationTemplates({ includeDisabled: true }).find((template) => template.id === id) || null;
}

function createPlaceModerationTemplate(admin, body = {}) {
  const now = new Date().toISOString();
  const inputValidation = validatePlaceModerationTemplateInput(body);
  if (inputValidation) return inputValidation;
  const template = normalizePlaceModerationTemplate({
    action: body.action,
    createdAt: now,
    createdBy: admin?.username || 'admin',
    enabled: body.enabled,
    kind: body.kind,
    reason: body.reason,
    sortOrder: body.sortOrder,
    title: body.title,
  }, { enabled: true, sortOrder: 100 });
  const validation = validatePlaceModerationTemplate(template);
  if (validation) return validation;
  ensurePlaceModerationTemplates().unshift(template);
  state.placeModerationTemplates = ensurePlaceModerationTemplates().slice(0, 120);
  writeAdminAudit(admin, 'place.template.create', 'place_moderation_template', template.id, null, template, template.title);
  return {
    template: adminPlaceModerationTemplates({ includeDisabled: true }).find((item) => item.id === template.id),
    templates: adminPlaceModerationTemplates({ includeDisabled: true }),
  };
}

function updatePlaceModerationTemplate(admin, templateId, body = {}) {
  const id = String(templateId || '').trim();
  const templates = ensurePlaceModerationTemplates();
  const index = templates.findIndex((item) => item.id === id);
  if (index < 0) return { error: '地点审核模板不存在或内置模板不可编辑', statusCode: 404 };
  const inputValidation = validatePlaceModerationTemplateInput(body, { partial: true });
  if (inputValidation) return inputValidation;
  const before = { ...templates[index] };
  const now = new Date().toISOString();
  const next = normalizePlaceModerationTemplate({
    ...before,
    action: Object.prototype.hasOwnProperty.call(body, 'action') ? body.action : before.action,
    enabled: Object.prototype.hasOwnProperty.call(body, 'enabled') ? body.enabled : before.enabled,
    kind: Object.prototype.hasOwnProperty.call(body, 'kind') ? body.kind : before.kind,
    reason: Object.prototype.hasOwnProperty.call(body, 'reason') ? body.reason : before.reason,
    sortOrder: Object.prototype.hasOwnProperty.call(body, 'sortOrder') ? body.sortOrder : before.sortOrder,
    title: Object.prototype.hasOwnProperty.call(body, 'title') ? body.title : before.title,
    updatedAt: now,
    updatedBy: admin?.username || 'admin',
  }, before);
  const validation = validatePlaceModerationTemplate(next);
  if (validation) return validation;
  templates[index] = next;
  state.placeModerationTemplates = templates;
  writeAdminAudit(admin, 'place.template.update', 'place_moderation_template', id, before, next, next.title);
  return {
    template: adminPlaceModerationTemplates({ includeDisabled: true }).find((item) => item.id === id),
    templates: adminPlaceModerationTemplates({ includeDisabled: true }),
  };
}

function removePlaceModerationTemplate(admin, templateId) {
  const id = String(templateId || '').trim();
  const templates = ensurePlaceModerationTemplates();
  const target = templates.find((item) => item.id === id);
  if (!target) return { error: '地点审核模板不存在或内置模板不可删除', statusCode: 404 };
  state.placeModerationTemplates = templates.filter((item) => item.id !== id);
  writeAdminAudit(admin, 'place.template.delete', 'place_moderation_template', id, target, null, target.title || id);
  return { templates: adminPlaceModerationTemplates({ includeDisabled: true }) };
}

function linkPlaceSubmissionToExisting(admin, submissionId, body = {}) {
  const found = findPlaceSubmission(submissionId);
  if (!found) return { error: '新增地点提交不存在', statusCode: 404 };
  const targetPlaceId = String(body.placeId || body.targetPlaceId || body.approvedPlaceId || '').trim();
  if (!targetPlaceId) return { error: '请填写要关联的已有地点 ID', statusCode: 400 };
  const targetFound = findPlaceById(targetPlaceId);
  if (!targetFound?.place) return { error: '目标地点不存在', statusCode: 404 };
  if (found.submission.status === 'approved' && found.submission.approvedPlaceId && found.submission.approvedPlaceId !== targetFound.place.id) {
    return { error: '这条新增地点已审核到其他地点，请先复核记录', statusCode: 409 };
  }
  const moderation = placeModerationReason(body, 'submission', 'approve', '新增地点关联已有地点');
  if (moderation.error) return moderation;
  const before = { ...found.submission };
  found.submission.status = 'approved';
  found.submission.reviewedAt = new Date().toISOString();
  found.submission.reviewedBy = admin.username;
  found.submission.approvedPlaceId = targetFound.place.id;
  found.submission.linkedExistingAt = found.submission.reviewedAt;
  found.submission.linkedExistingBy = admin.username;
  found.submission.linkedExistingPlaceId = targetFound.place.id;
  applyPlaceModerationReason(found.submission, moderation);
  mergeSubmissionImagesIntoPlace(targetFound.place, found.submission);
  const contribution = recordPlaceContribution(admin, found.phone, found.submission, targetFound.place, 'linked_existing', moderation.reason);
  notifyPlaceSubmissionModeration(found.phone, found.submission, 'approve', moderation.reason);
  writeAdminAudit(admin, 'place.submission.link_existing', 'place_submission', submissionId, before, found.submission, moderation.reason);
  return {
    contribution,
    place: adminPlaceCatalog().places.find((place) => place.id === targetFound.place.id),
    submission: adminPlaceSubmissions().find((item) => item.id === submissionId),
  };
}

function placeModerationReason(body = {}, kind, action, fallback = '地点审核处理') {
  const template = placeModerationTemplateById(body.templateId);
  if (body.templateId && !template) return { error: '地点审核模板不存在', statusCode: 400 };
  if (template && template.enabled === false) return { error: '地点审核模板已停用', statusCode: 400 };
  if (template && (template.kind !== kind || template.action !== action)) {
    return { error: '地点审核模板不适用于当前操作', statusCode: 400 };
  }
  const reason = String(body.reason || template?.reason || fallback).replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!reason) return { error: '请填写审核原因', statusCode: 400 };
  return { reason, template };
}

function applyPlaceModerationReason(target, moderation) {
  target.reviewReason = moderation.reason;
  if (moderation.template) {
    target.reviewTemplateId = moderation.template.id;
    target.reviewTemplateLabel = moderation.template.title;
  } else {
    delete target.reviewTemplateId;
    delete target.reviewTemplateLabel;
  }
}

function adminFeedbackItems(options = {}) {
  ensureSupportTickets();
  const statusFilter = String(options.status || 'all');
  const categoryFilter = String(options.category || 'all');
  const q = String(options.q || '').trim().toLowerCase();
  return (Array.isArray(state.feedback) ? state.feedback : [])
    .map((item) => ({
      attachmentCount: normalizeSupportAttachments(item.attachments).length,
      category: item.category,
      contact: item.contact,
      content: item.content,
      createdAt: item.createdAt,
      id: item.id,
      ownerName: item.ownerName,
      phone: item.phone,
      priority: supportTicketPriorityFor(item),
      status: item.status || 'received',
      supportTicketId: item.supportTicketId || `ticket-${item.id}`,
    }))
    .filter((item) => {
      if (statusFilter === 'open' && item.status === 'closed') return false;
      if (statusFilter !== 'all' && statusFilter !== 'open' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (q) {
        const haystack = [item.id, item.phone, item.ownerName, item.contact, item.content, item.supportTicketId].map((value) => String(value || '').toLowerCase()).join(' ');
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function adminFeedbackSummary() {
  const items = adminFeedbackItems({ status: 'all' });
  return {
    all: items.length,
    bug: items.filter((item) => item.category === 'bug').length,
    closed: items.filter((item) => item.status === 'closed').length,
    open: items.filter((item) => item.status !== 'closed').length,
    received: items.filter((item) => item.status === 'received').length,
    reviewing: items.filter((item) => item.status === 'reviewing').length,
    safety: items.filter((item) => item.category === 'safety').length,
    suggestion: items.filter((item) => item.category === 'suggestion').length,
  };
}

const ticketStatuses = new Set(['closed', 'received', 'resolved', 'reviewing', 'waiting_user']);
const ticketPriorities = new Set(['low', 'normal', 'high', 'urgent']);
const supportTicketAttachmentLimit = 6;

function supportTicketPriorityFor(feedback = {}) {
  if (ticketPriorities.has(feedback.priority)) return feedback.priority;
  if (feedback.category === 'safety') return 'urgent';
  if (feedback.category === 'bug') return 'high';
  if (feedback.category === 'suggestion') return 'low';
  return 'normal';
}

function supportTicketStatusFor(value) {
  const status = String(value || 'received');
  return ticketStatuses.has(status) ? status : 'received';
}

function ticketFeedbackStatus(status) {
  if (status === 'closed' || status === 'resolved') return 'closed';
  if (status === 'reviewing' || status === 'waiting_user') return 'reviewing';
  return 'received';
}

function supportTicketTitle(feedback = {}) {
  const categoryLabel = {
    bug: '问题反馈',
    other: '用户反馈',
    safety: '安全投诉',
    suggestion: '产品建议',
  }[feedback.category] || '用户反馈';
  return `${categoryLabel} · ${feedback.ownerName || `用户${String(feedback.phone || '').slice(-4)}`}`;
}

function supportAttachmentInputsFrom(body = {}) {
  const inputs = [];
  if (Array.isArray(body.attachments)) inputs.push(...body.attachments);
  if (Array.isArray(body.attachmentUrls)) inputs.push(...body.attachmentUrls);
  if (body.attachmentUrl) inputs.push(body.attachmentUrl);
  return inputs.slice(0, supportTicketAttachmentLimit);
}

function normalizeSupportAttachmentUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url.slice(0, 1000);
  if (/^\/media\/uploads\/[^/]+\/file$/i.test(url)) return url;
  return '';
}

function publicSupportAttachment(attachment = {}) {
  const url = normalizeSupportAttachmentUrl(attachment.url || attachment.fileUrl || attachment.previewUrl);
  if (!url) return null;
  const mimeType = normalizeImageMimeType(attachment.mimeType) || 'image/jpeg';
  return {
    createdAt: attachment.createdAt || '',
    id: String(attachment.id || `support-attachment-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`),
    mediaId: attachment.mediaId || '',
    mimeType,
    name: String(attachment.name || attachment.fileName || '问题截图').trim().slice(0, 120),
    previewUrl: normalizeSupportAttachmentUrl(attachment.previewUrl) || url,
    sizeBytes: Math.max(0, Math.floor(Number(attachment.sizeBytes || attachment.bytes || 0))),
    type: 'image',
    url,
  };
}

function normalizeSupportAttachments(input) {
  return (Array.isArray(input) ? input : [])
    .map(publicSupportAttachment)
    .filter(Boolean)
    .slice(0, supportTicketAttachmentLimit);
}

function supportTicketAttachmentCount(ticket = {}) {
  const ownCount = normalizeSupportAttachments(ticket.attachments).length;
  const replyCount = (Array.isArray(ticket.replies) ? ticket.replies : [])
    .reduce((total, reply) => total + normalizeSupportAttachments(reply?.attachments).length, 0);
  return ownCount + replyCount;
}

function supportTicketReplySummary(reply = {}) {
  const content = String(reply.content || '').trim();
  if (content) return content;
  const attachmentCount = normalizeSupportAttachments(reply.attachments).length;
  if (attachmentCount) return `补充了 ${attachmentCount} 张附件`;
  return '';
}

async function createSupportAttachment(req, user, input, index = 0) {
  const source = typeof input === 'string' ? { url: input } : input || {};
  const rawUrl = String(source.url || source.fileUrl || source.previewUrl || '').trim();
  const rawBase64 = String(source.base64 || source.dataUrl || (/^data:image\//i.test(rawUrl) ? rawUrl : '')).trim();
  const createdAt = new Date().toISOString();
  const name = String(source.name || source.fileName || `support-${Date.now()}-${index + 1}`).trim().slice(0, 120) || '问题截图';

  if (rawBase64) {
    const parsedUpload = parseBase64Upload(rawBase64, source.mimeType);
    if (!parsedUpload.dataUrl) {
      const message = mediaUploadIssueAnalysis(parsedUpload.issue, parsedUpload.bytes)?.message || '附件上传失败，请重新选择图片';
      return { error: message, statusCode: 400 };
    }
    const fileParts = base64UploadBuffer(parsedUpload);
    if (!fileParts?.buffer?.length) return { error: '附件上传失败，请重新选择图片', statusCode: 400 };
    const mediaId = `support-media-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    let cosStored = null;
    try {
      const extension = mimeExtension(fileParts.mimeType);
      cosStored = await uploadBufferToCos(req, user, {
        buffer: fileParts.buffer,
        fileName: `${mediaId}.${extension}`,
        mimeType: fileParts.mimeType,
        petId: '',
        scope: 'support-ticket',
      });
    } catch {
      cosStored = null;
    }
    const imageModeration = await evaluateTencentImageModeration(
      { mediaId, ownerPhone: user.phone },
      {
        fileContent: fileParts.buffer.toString('base64'),
        scope: 'support',
        targetId: mediaId,
      },
    );
    const moderationStatus = mediaModerationStatusFromEvaluation(imageModeration);
    state.mediaUploads = state.mediaUploads || {};
    state.mediaUploads[mediaId] = {
      contentSafety: contentSafetySnapshot(imageModeration),
      createdAt: Date.now(),
      dataUrl: parsedUpload.dataUrl,
      ...(cosStored
        ? {
            objectKey: cosStored.objectKey,
            objectUrl: cosStored.url,
            storageProvider: cosStored.provider,
          }
        : {}),
      fileName: name,
      mediaId,
      mimeType: fileParts.mimeType,
      moderatedAt: imageModeration?.action && imageModeration.action !== 'allow' ? new Date().toISOString() : '',
      moderatedBy: imageModeration?.action && imageModeration.action !== 'allow' ? (imageModeration.sourceLabel || 'machine') : '',
      moderationReason: mediaModerationReasonFromEvaluation(imageModeration),
      moderationStatus,
      ownerPhone: user.phone,
      previewUrl: source.previewUrl || mediaUploadFileUrl(req, mediaId),
      source: 'support_ticket',
    };
    if (imageModeration?.action && imageModeration.action !== 'allow') {
      recordModerationSample({ ...imageModeration, contentText: name, ownerPhone: user.phone, scope: 'support', targetId: mediaId });
    }
    return {
      attachment: {
        createdAt,
        id: `support-attachment-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        mediaId,
        mimeType: fileParts.mimeType,
        name,
        previewUrl: mediaUploadFileUrl(req, mediaId),
        sizeBytes: fileParts.buffer.length,
        type: 'image',
        url: mediaUploadFileUrl(req, mediaId),
      },
    };
  }

  const url = normalizeSupportAttachmentUrl(rawUrl);
  if (!url) return { error: '附件地址无效，请重新选择图片', statusCode: 400 };
  return {
    attachment: {
      createdAt,
      id: `support-attachment-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      mediaId: '',
      mimeType: normalizeImageMimeType(source.mimeType) || 'image/jpeg',
      name,
      previewUrl: url,
      sizeBytes: Math.max(0, Math.floor(Number(source.sizeBytes || source.bytes || 0))),
      type: 'image',
      url,
    },
  };
}

async function buildSupportAttachments(req, user, body = {}) {
  const inputs = supportAttachmentInputsFrom(body);
  const attachments = [];
  for (let index = 0; index < inputs.length; index += 1) {
    const result = await createSupportAttachment(req, user, inputs[index], index);
    if (result.error) return result;
    if (result.attachment) attachments.push(result.attachment);
  }
  return { attachments };
}

function createSupportTicketFromFeedback(feedback) {
  state.supportTickets = Array.isArray(state.supportTickets) ? state.supportTickets : [];
  const existing = state.supportTickets.find((ticket) => ticket.source === 'feedback' && ticket.sourceId === feedback.id);
  if (existing) {
    const feedbackAttachments = normalizeSupportAttachments(feedback.attachments);
    if (feedbackAttachments.length && !normalizeSupportAttachments(existing.attachments).length) existing.attachments = feedbackAttachments;
    feedback.supportTicketId = existing.id;
    return existing;
  }
  const ticket = {
    assignee: '',
    attachments: normalizeSupportAttachments(feedback.attachments),
    category: feedback.category || 'other',
    contact: feedback.contact || '',
    content: feedback.content || '',
    createdAt: feedback.createdAt || new Date().toISOString(),
    id: feedback.supportTicketId || `ticket-${feedback.id}`,
    notes: [],
    ownerName: feedback.ownerName || '',
    phone: feedback.phone || '',
    priority: supportTicketPriorityFor(feedback),
    relatedObjects: [],
    replies: [],
    source: 'feedback',
    sourceId: feedback.id,
    status: supportTicketStatusFor(feedback.status),
    title: supportTicketTitle(feedback),
    updatedAt: feedback.handledAt || feedback.createdAt || new Date().toISOString(),
  };
  state.supportTickets.unshift(ticket);
  feedback.supportTicketId = ticket.id;
  return ticket;
}

function ensureSupportTickets() {
  state.supportTickets = Array.isArray(state.supportTickets) ? state.supportTickets : [];
  state.feedback = Array.isArray(state.feedback) ? state.feedback : [];
  let changed = false;
  for (const feedback of state.feedback) {
    const beforeTicketId = feedback.supportTicketId;
    const ticket = createSupportTicketFromFeedback(feedback);
    if (!beforeTicketId || beforeTicketId !== ticket.id) changed = true;
  }
  if (changed) saveState();
  return state.supportTickets;
}

function syncFeedbackFromTicket(ticket) {
  if (!ticket || ticket.source !== 'feedback' || !ticket.sourceId) return;
  const feedback = (state.feedback || []).find((item) => item.id === ticket.sourceId);
  if (!feedback) return;
  feedback.status = ticketFeedbackStatus(ticket.status);
  feedback.handledAt = ticket.updatedAt;
  feedback.handledBy = ticket.assignee || feedback.handledBy || '';
  feedback.priority = ticket.priority;
  feedback.supportTicketId = ticket.id;
  feedback.attachments = normalizeSupportAttachments(ticket.attachments);
}

function findSupportTicket(ticketId) {
  return ensureSupportTickets().find((ticket) => ticket.id === ticketId);
}

function supportTicketSlaHours(ticket) {
  const priority = supportTicketPriorityFor(ticket);
  const slaHours = currentOpsConfig().support?.slaHours || defaultOpsConfig().support.slaHours;
  return Math.max(1, Math.floor(Number(slaHours[priority] || slaHours.normal || 24)));
}

function supportTicketSlaState(ticket) {
  if (ticket.status === 'closed' || ticket.status === 'resolved') return 'done';
  const createdAtMs = new Date(ticket.createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return 'unknown';
  const elapsedHours = (Date.now() - createdAtMs) / 36e5;
  const limit = supportTicketSlaHours(ticket);
  if (elapsedHours >= limit) return 'overdue';
  if (elapsedHours >= limit * 0.75) return 'due_soon';
  return 'healthy';
}

function normalizeRelatedObjects(input) {
  const source = Array.isArray(input) ? input : [];
  return source
    .map((item) => {
      const type = String(item?.type || '').trim().slice(0, 40);
      const id = String(item?.id || '').trim().slice(0, 120);
      if (!type || !id) return null;
      return { id, type };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function supportTicketItem(ticket) {
  const user = ticket.phone ? state.users?.[ticket.phone] : null;
  const replies = Array.isArray(ticket.replies) ? ticket.replies : [];
  const notes = Array.isArray(ticket.notes) ? ticket.notes : [];
  const relatedObjects = normalizeRelatedObjects(ticket.relatedObjects);
  const latestReply = replies.find((reply) => supportTicketReplySummary(reply));
  return {
    assignee: ticket.assignee || '',
    attachmentCount: supportTicketAttachmentCount(ticket),
    category: ticket.category || 'other',
    contact: ticket.contact || '',
    content: ticket.content || '',
    createdAt: ticket.createdAt,
    firstReplyAt: replies[0]?.createdAt || '',
    id: ticket.id,
    lastActivityAt: ticket.updatedAt || ticket.createdAt,
    latestNote: notes[0]?.content || '',
    latestReply: supportTicketReplySummary(latestReply) || '',
    noteCount: notes.length,
    ownerName: ticket.ownerName || user?.ownerName || `用户${String(ticket.phone || '').slice(-4)}`,
    phone: ticket.phone || '',
    priority: supportTicketPriorityFor(ticket),
    relatedObjects,
    replyCount: replies.length,
    reopenCount: Math.max(0, Math.floor(Number(ticket.reopenCount || 0))),
    satisfaction: ticket.satisfaction || null,
    slaHours: supportTicketSlaHours(ticket),
    slaState: supportTicketSlaState(ticket),
    source: ticket.source || 'manual',
    sourceId: ticket.sourceId || '',
    status: supportTicketStatusFor(ticket.status),
    title: ticket.title || supportTicketTitle(ticket),
    updatedAt: ticket.updatedAt || ticket.createdAt,
  };
}

function adminSupportTickets(options = {}) {
  const q = String(options.q || '').trim().toLowerCase();
  const status = String(options.status || 'open');
  const priority = String(options.priority || 'all');
  const limit = Math.floor(clampNumber(options.limit, 300, 1, ADMIN_EXPORT_ROW_LIMIT));
  const rows = ensureSupportTickets().map(supportTicketItem)
    .filter((ticket) => {
      if (status === 'all') return true;
      if (status === 'open') return ticket.status !== 'closed' && ticket.status !== 'resolved';
      return ticket.status === status;
    })
    .filter((ticket) => priority === 'all' || ticket.priority === priority)
    .filter((ticket) => {
      if (!q) return true;
      return [ticket.id, ticket.title, ticket.content, ticket.ownerName, ticket.phone, ticket.assignee, ticket.contact, ticket.category, ticket.sourceId]
        .some((value) => String(value || '').toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const priorityRank = { urgent: 4, high: 3, normal: 2, low: 1 };
      const statusRank = (ticket) => (ticket.slaState === 'overdue' ? 10 : ticket.slaState === 'due_soon' ? 8 : ticket.status === 'received' ? 5 : 0);
      return statusRank(b) - statusRank(a) || (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0) || String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
  const all = ensureSupportTickets().map(supportTicketItem);
  return {
    summary: {
      all: all.length,
      closed: all.filter((ticket) => ticket.status === 'closed' || ticket.status === 'resolved').length,
      open: all.filter((ticket) => ticket.status !== 'closed' && ticket.status !== 'resolved').length,
      overdue: all.filter((ticket) => ticket.slaState === 'overdue').length,
      safety: all.filter((ticket) => ticket.category === 'safety').length,
      urgent: all.filter((ticket) => ticket.priority === 'urgent' || ticket.priority === 'high').length,
      waitingUser: all.filter((ticket) => ticket.status === 'waiting_user').length,
    },
    tickets: rows.slice(0, limit),
  };
}

function supportTicketDetail(ticket) {
  return {
    ...supportTicketItem(ticket),
    attachments: normalizeSupportAttachments(ticket.attachments),
    notes: Array.isArray(ticket.notes) ? ticket.notes : [],
    replies: (Array.isArray(ticket.replies) ? ticket.replies : []).map((reply) => ({
      ...reply,
      attachments: normalizeSupportAttachments(reply?.attachments),
    })),
  };
}

function supportTicketPublicItem(ticket) {
  const item = supportTicketItem(ticket);
  const replies = Array.isArray(ticket.replies) ? ticket.replies : [];
  const latestSupportReply = replies.find((reply) => reply?.author !== 'user');
  const status = supportTicketStatusFor(ticket.status);
  return {
    attachmentCount: item.attachmentCount,
    canRate: status === 'closed' || status === 'resolved',
    canReply: status !== 'closed' && status !== 'resolved',
    canReopen: status === 'closed' || status === 'resolved',
    category: item.category,
    content: item.content,
    createdAt: item.createdAt,
    id: item.id,
    lastActivityAt: item.lastActivityAt,
    latestReply: supportTicketReplySummary(latestSupportReply) || '',
    latestReplyAt: latestSupportReply?.createdAt || '',
    priority: item.priority,
    replyCount: replies.length,
    reopenCount: item.reopenCount,
    satisfaction: item.satisfaction,
    slaHours: item.slaHours,
    status,
    title: item.title,
    updatedAt: item.updatedAt,
  };
}

function supportTicketPublicDetail(ticket) {
  const replies = Array.isArray(ticket.replies) ? ticket.replies : [];
  const messages = [
    {
      author: 'user',
      authorName: '我',
      attachments: normalizeSupportAttachments(ticket.attachments),
      content: ticket.content || '',
      createdAt: ticket.createdAt,
      id: `ticket-source-${ticket.id}`,
      type: 'feedback',
    },
    ...replies.map((reply) => {
      const isUser = reply?.author === 'user';
      return {
        author: isUser ? 'user' : 'support',
        authorName: isUser ? '我' : 'Lumii 客服',
        attachments: normalizeSupportAttachments(reply?.attachments),
        content: reply?.content || '',
        createdAt: reply?.createdAt || ticket.updatedAt || ticket.createdAt,
        id: reply?.id || `ticket-message-${Date.now()}`,
        type: reply?.type === 'reopen' ? 'reopen' : isUser ? 'user_reply' : 'support_reply',
      };
    }),
  ]
    .filter((message) => message.content || normalizeSupportAttachments(message.attachments).length)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  return {
    ...supportTicketPublicItem(ticket),
    messages,
  };
}

function supportTicketsForUser(user) {
  const tickets = ensureSupportTickets()
    .filter((ticket) => ticket.phone === user.phone)
    .map(supportTicketPublicItem)
    .sort((a, b) => String(b.lastActivityAt || b.createdAt).localeCompare(String(a.lastActivityAt || a.createdAt)));
  return {
    summary: {
      all: tickets.length,
      open: tickets.filter((ticket) => ticket.status !== 'closed' && ticket.status !== 'resolved').length,
      waitingUser: tickets.filter((ticket) => ticket.status === 'waiting_user').length,
    },
    tickets,
  };
}

function defaultSupportTicketReplyTemplates() {
  return [
    {
      builtin: true,
      content: '你好，我们已经收到你的反馈，会继续排查。为了更快定位问题，可以补充发生时间、手机型号、App 页面和截图。',
      id: 'builtin-ticket-need-info',
      name: '请求补充信息',
      nextStatus: 'waiting_user',
      notifyUser: true,
    },
    {
      builtin: true,
      content: '你好，这个问题我们已经定位并处理。你可以刷新页面或重新打开 App 试一下，如果仍然复现，可以在这条反馈里继续补充。',
      id: 'builtin-ticket-resolved',
      name: '已处理请复测',
      nextStatus: 'resolved',
      notifyUser: true,
    },
    {
      builtin: true,
      content: '你好，这条反馈涉及账号或社区安全，我们已经转入人工复核。处理结果会通过通知中心同步给你。',
      id: 'builtin-ticket-safety',
      name: '安全复核说明',
      nextStatus: 'reviewing',
      notifyUser: true,
    },
  ];
}

function ensureSupportTicketReplyTemplates() {
  state.supportTicketReplyTemplates = Array.isArray(state.supportTicketReplyTemplates) ? state.supportTicketReplyTemplates : [];
  return state.supportTicketReplyTemplates;
}

function normalizeSupportTicketReplyTemplate(item = {}) {
  return {
    builtin: Boolean(item.builtin),
    content: String(item.content || '').trim().slice(0, 1000),
    createdAt: item.createdAt || '',
    createdBy: item.createdBy || '',
    id: String(item.id || `ticket-reply-template-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    name: String(item.name || '客服回复模板').trim().slice(0, 32),
    nextStatus: supportTicketStatusFor(item.nextStatus || 'waiting_user'),
    notifyUser: item.notifyUser !== false,
  };
}

function adminSupportTicketReplyTemplates() {
  const custom = ensureSupportTicketReplyTemplates()
    .map(normalizeSupportTicketReplyTemplate)
    .filter((template) => template.name && template.content);
  return [...defaultSupportTicketReplyTemplates(), ...custom];
}

function createSupportTicketReplyTemplate(admin, body = {}) {
  const template = normalizeSupportTicketReplyTemplate({
    content: body.content,
    createdAt: new Date().toISOString(),
    createdBy: admin?.username || 'admin',
    name: body.name,
    nextStatus: body.nextStatus,
    notifyUser: body.notifyUser !== false,
  });
  if (!template.name) return { error: '请填写模板名称', statusCode: 400 };
  if (!template.content) return { error: '请填写模板内容', statusCode: 400 };
  ensureSupportTicketReplyTemplates().unshift(template);
  state.supportTicketReplyTemplates = state.supportTicketReplyTemplates.slice(0, 80);
  writeAdminAudit(admin, 'ticket.reply_template.create', 'support_ticket_reply_template', template.id, null, template, template.name);
  return { template, templates: adminSupportTicketReplyTemplates() };
}

function removeSupportTicketReplyTemplate(admin, id) {
  const before = ensureSupportTicketReplyTemplates();
  const target = before.find((item) => item.id === id);
  if (!target) return { error: '回复模板不存在或内置模板不可删除', statusCode: 404 };
  state.supportTicketReplyTemplates = before.filter((item) => item.id !== id);
  writeAdminAudit(admin, 'ticket.reply_template.delete', 'support_ticket_reply_template', id, target, null, target.name || id);
  return { templates: adminSupportTicketReplyTemplates() };
}

function updateSupportTicket(admin, ticket, patch = {}, reason = '') {
  const before = JSON.parse(JSON.stringify(ticket));
  const nextStatus = patch.status !== undefined ? supportTicketStatusFor(patch.status) : ticket.status;
  const nextPriority = patch.priority !== undefined && ticketPriorities.has(String(patch.priority)) ? String(patch.priority) : ticket.priority;
  ticket.status = nextStatus;
  ticket.priority = nextPriority;
  if (patch.assignee !== undefined) ticket.assignee = String(patch.assignee || '').trim().slice(0, 80);
  if (patch.relatedObjects !== undefined) ticket.relatedObjects = normalizeRelatedObjects(patch.relatedObjects);
  ticket.updatedAt = new Date().toISOString();
  if (!ticket.firstHandledAt && ticket.status !== 'received') ticket.firstHandledAt = ticket.updatedAt;
  if (ticket.status === 'closed' || ticket.status === 'resolved') ticket.closedAt = ticket.updatedAt;
  syncFeedbackFromTicket(ticket);
  writeAdminAudit(admin, 'ticket.update', 'support_ticket', ticket.id, before, ticket, reason);
  return ticket;
}

function adminHandleSupportTicketBatch(admin, body = {}) {
  const ticketIds = Array.from(new Set((Array.isArray(body.ticketIds) ? body.ticketIds : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean)))
    .slice(0, 100);
  if (!ticketIds.length) return { error: '请先选择工单', statusCode: 400 };
  const action = String(body.action || '').trim();
  const reason = String(body.reason || `批量处理 ${action}`).trim().slice(0, 240);
  const assignee = String(body.assignee || admin?.username || 'admin').trim().slice(0, 80);
  const priority = ticketPriorities.has(String(body.priority)) ? String(body.priority) : undefined;
  const status = ticketStatuses.has(String(body.status)) ? String(body.status) : ticketStatuses.has(action) ? action : undefined;
  const results = [];

  ticketIds.forEach((ticketId) => {
    const ticket = findSupportTicket(ticketId);
    if (!ticket) {
      results.push({ error: '工单不存在', id: ticketId, ok: false });
      return;
    }
    if (action === 'assign') {
      updateSupportTicket(admin, ticket, { assignee, status: status || 'reviewing' }, reason || '批量分配工单');
    } else if (action === 'priority') {
      if (!priority) {
        results.push({ error: '优先级无效', id: ticketId, ok: false });
        return;
      }
      updateSupportTicket(admin, ticket, { priority }, reason || '批量更新优先级');
    } else if (status) {
      updateSupportTicket(admin, ticket, { priority, status }, reason || '批量更新工单状态');
    } else {
      results.push({ error: '不支持的批量动作', id: ticketId, ok: false });
      return;
    }
    results.push({ id: ticketId, ok: true });
  });

  return {
    errorCount: results.filter((item) => !item.ok).length,
    results,
    successCount: results.filter((item) => item.ok).length,
  };
}

function addSupportTicketNote(admin, ticket, content) {
  const note = String(content || '').trim();
  if (!note) return { error: '请填写内部备注', statusCode: 400 };
  const before = JSON.parse(JSON.stringify(ticket));
  ticket.notes = Array.isArray(ticket.notes) ? ticket.notes : [];
  ticket.notes.unshift({
    adminName: admin?.username || 'admin',
    content: note.slice(0, 1000),
    createdAt: new Date().toISOString(),
    id: `ticket-note-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  });
  ticket.updatedAt = ticket.notes[0].createdAt;
  syncFeedbackFromTicket(ticket);
  writeAdminAudit(admin, 'ticket.note.create', 'support_ticket', ticket.id, before, ticket, note);
  return { note: ticket.notes[0], ticket };
}

function replySupportTicket(admin, ticket, body = {}) {
  const content = String(body.content || '').trim();
  if (!content) return { error: '请填写客服回复内容', statusCode: 400 };
  const before = JSON.parse(JSON.stringify(ticket));
  ticket.replies = Array.isArray(ticket.replies) ? ticket.replies : [];
  const reply = {
    author: 'support',
    adminName: admin?.username || 'admin',
    content: content.slice(0, 1000),
    createdAt: new Date().toISOString(),
    id: `ticket-reply-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    notifyUser: body.notifyUser !== false,
  };
  ticket.replies.unshift(reply);
  ticket.status = supportTicketStatusFor(body.nextStatus || 'waiting_user');
  ticket.updatedAt = reply.createdAt;
  ticket.lastReplyAt = reply.createdAt;
  if (!ticket.firstHandledAt) ticket.firstHandledAt = reply.createdAt;
  if (reply.notifyUser && ticket.phone) {
    addNotification(ticket.phone, {
      category: 'system',
      id: `n-support-reply-${ticket.id}-${reply.id}`,
      kind: 'support_reply',
      read: false,
      text: reply.content,
      ticketId: ticket.id,
      title: '客服回复了你的反馈',
    }, 'system');
  }
  syncFeedbackFromTicket(ticket);
  writeAdminAudit(admin, 'ticket.reply.create', 'support_ticket', ticket.id, before, ticket, body.reason || content);
  return { reply, ticket };
}

async function addUserSupportTicketReply(req, user, ticket, body = {}) {
  const cleanContent = String(body.content || '').trim();
  if (cleanContent.length > 1000) return { error: '补充内容最多 1000 个字', statusCode: 400 };
  const status = supportTicketStatusFor(ticket.status);
  if (status === 'closed' || status === 'resolved') return { error: '工单已关闭，不能继续补充', statusCode: 409 };
  const attachmentResult = await buildSupportAttachments(req, user, body);
  if (attachmentResult.error) return attachmentResult;
  const attachments = attachmentResult.attachments || [];
  if (!cleanContent && !attachments.length) return { error: '请填写补充内容或添加截图', statusCode: 400 };
  const before = JSON.parse(JSON.stringify(ticket));
  ticket.replies = Array.isArray(ticket.replies) ? ticket.replies : [];
  const reply = {
    attachments,
    author: 'user',
    authorName: user.ownerName || `用户${String(user.phone || '').slice(-4)}`,
    content: cleanContent.slice(0, 1000),
    createdAt: new Date().toISOString(),
    id: `ticket-user-reply-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  };
  ticket.replies.unshift(reply);
  ticket.status = 'reviewing';
  ticket.updatedAt = reply.createdAt;
  ticket.userLastReplyAt = reply.createdAt;
  syncFeedbackFromTicket(ticket);
  writeAdminAudit({ username: `user:${user.phone}`, role: 'user' }, 'ticket.user.reply', 'support_ticket', ticket.id, before, ticket, cleanContent || `补充 ${attachments.length} 张附件`);
  return { reply, ticket };
}

function rateSupportTicket(user, ticket, body = {}) {
  const status = supportTicketStatusFor(ticket.status);
  if (status !== 'closed' && status !== 'resolved') return { error: '工单结束处理后才能评价', statusCode: 409 };
  const rating = Math.floor(Number(body.rating || 0));
  if (rating < 1 || rating > 5) return { error: '请选择 1-5 分满意度', statusCode: 400 };
  const comment = String(body.comment || '').trim();
  if (comment.length > 400) return { error: '评价说明最多 400 个字', statusCode: 400 };
  const before = JSON.parse(JSON.stringify(ticket));
  const now = new Date().toISOString();
  ticket.satisfaction = {
    byPhone: user.phone,
    comment,
    createdAt: ticket.satisfaction?.createdAt || now,
    rating,
    updatedAt: now,
  };
  ticket.updatedAt = now;
  syncFeedbackFromTicket(ticket);
  writeAdminAudit({ username: `user:${user.phone}`, role: 'user' }, 'ticket.user.rate', 'support_ticket', ticket.id, before, ticket, `rating:${rating}`);
  return { ticket };
}

async function reopenSupportTicket(req, user, ticket, body = {}) {
  const status = supportTicketStatusFor(ticket.status);
  if (status !== 'closed' && status !== 'resolved') return { error: '当前工单还在处理中，不需要重新打开', statusCode: 409 };
  const cleanContent = String(body.content || body.reason || '').trim();
  if (cleanContent.length > 1000) return { error: '重开说明最多 1000 个字', statusCode: 400 };
  const attachmentResult = await buildSupportAttachments(req, user, body);
  if (attachmentResult.error) return attachmentResult;
  const attachments = attachmentResult.attachments || [];
  if (!cleanContent && !attachments.length) return { error: '请填写需要继续处理的问题或添加截图', statusCode: 400 };
  const before = JSON.parse(JSON.stringify(ticket));
  const now = new Date().toISOString();
  ticket.replies = Array.isArray(ticket.replies) ? ticket.replies : [];
  const reply = {
    attachments,
    author: 'user',
    authorName: user.ownerName || `用户${String(user.phone || '').slice(-4)}`,
    content: cleanContent.slice(0, 1000),
    createdAt: now,
    id: `ticket-reopen-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    type: 'reopen',
  };
  ticket.replies.unshift(reply);
  ticket.lastClosedAt = ticket.closedAt || ticket.lastClosedAt || '';
  ticket.closedAt = '';
  ticket.reopenCount = Math.max(0, Math.floor(Number(ticket.reopenCount || 0))) + 1;
  ticket.reopenedAt = now;
  ticket.status = 'reviewing';
  ticket.updatedAt = now;
  ticket.userLastReplyAt = now;
  syncFeedbackFromTicket(ticket);
  writeAdminAudit({ username: `user:${user.phone}`, role: 'user' }, 'ticket.user.reopen', 'support_ticket', ticket.id, before, ticket, cleanContent || `重开并补充 ${attachments.length} 张附件`);
  return { reply, ticket };
}

function adminReason(body = {}, fallback = '运营后台处理') {
  return String(body.reason || fallback).replace(/\s+/g, ' ').trim().slice(0, 240);
}

function ensureModerationTaskMeta() {
  if (!state.moderationTaskMeta || typeof state.moderationTaskMeta !== 'object' || Array.isArray(state.moderationTaskMeta)) {
    state.moderationTaskMeta = {};
  }
  return state.moderationTaskMeta;
}

function moderationTaskMeta(taskId) {
  const meta = ensureModerationTaskMeta();
  meta[taskId] = meta[taskId] && typeof meta[taskId] === 'object' && !Array.isArray(meta[taskId]) ? meta[taskId] : {};
  return meta[taskId];
}

function moderationSlaHours(kind, riskScore = 0) {
  const score = Number(riskScore || 0);
  if (score >= 90) return 4;
  if (score >= 80) return 8;
  if (kind === 'place_submission') return 72;
  if (kind === 'place_review') return 48;
  if (kind === 'report') return 24;
  return 12;
}

function moderationSlaSnapshot(task) {
  const createdAtMs = new Date(task.createdAt || Date.now()).getTime();
  const hours = moderationSlaHours(task.kind, task.riskScore);
  const dueAtMs = Number.isFinite(createdAtMs) ? createdAtMs + hours * 60 * 60 * 1000 : Date.now() + hours * 60 * 60 * 1000;
  const remainingMinutes = Math.ceil((dueAtMs - Date.now()) / 60000);
  const terminal = !['pending', 'reviewing', 'escalated'].includes(task.status);
  return {
    dueAt: new Date(dueAtMs).toISOString(),
    hours,
    remainingMinutes,
    status: terminal ? 'done' : remainingMinutes < 0 ? 'overdue' : remainingMinutes <= 120 ? 'due_soon' : 'active',
  };
}

function markModerationTaskMeta(taskId, admin, action, reason = '') {
  const meta = moderationTaskMeta(taskId);
  const now = new Date().toISOString();
  meta.lastAction = action;
  meta.lastReason = String(reason || '').slice(0, 240);
  meta.updatedAt = now;
  if (action === 'reviewing' || action === 'assign') {
    meta.assignee = admin?.username || 'admin';
    meta.assignedAt = now;
    meta.assignedBy = admin?.username || 'admin';
  }
  if (!['assign', 'reviewing', 'escalate'].includes(action)) {
    meta.completedAt = now;
    meta.completedBy = admin?.username || 'admin';
  }
  return meta;
}

function assignModerationTaskMeta(taskId, admin, assignee, reason = '') {
  const meta = moderationTaskMeta(taskId);
  const now = new Date().toISOString();
  meta.assignee = String(assignee || admin?.username || 'admin').trim().slice(0, 40) || 'admin';
  meta.assignedAt = now;
  meta.assignedBy = admin?.username || 'admin';
  meta.lastAction = 'assign';
  meta.lastReason = String(reason || '').slice(0, 240);
  meta.updatedAt = now;
  return meta;
}

function moderationTaskStatus(rawStatus) {
  const status = String(rawStatus || 'pending');
  if (status === 'pending_review') return 'pending';
  if (['pending', 'reviewing', 'escalated'].includes(status)) return status;
  if (['approved', 'valid', 'published'].includes(status)) return 'approved';
  if (['rejected', 'invalid'].includes(status)) return 'rejected';
  if (['hidden', 'deleted', 'closed'].includes(status)) return status;
  return 'pending';
}

function moderationTaskPriority(status, riskScore = 0) {
  if (status === 'escalated') return 110 + riskScore;
  if (status === 'pending') return 90 + riskScore;
  if (status === 'reviewing') return 70 + riskScore;
  return riskScore;
}

function moderationTaskActions(task) {
  if (['deleted', 'closed', 'approved', 'rejected'].includes(task.status) && task.kind === 'report') return [];
  if (task.kind === 'report') {
    const actions = [
      { action: 'reviewing', label: '接手' },
      { action: 'invalid', label: '无效关闭' },
      { action: 'escalate', label: '升级' },
    ];
    if (task.targetType === 'post' || task.targetType === 'comment') {
      actions.splice(1, 0, { action: 'hide', label: '有效并隐藏', tone: 'danger' });
      actions.splice(2, 0, { action: 'delete', label: '有效并删除', tone: 'danger', confirm: true });
    } else {
      actions.splice(1, 0, { action: 'valid', label: '标记有效' });
    }
    return actions;
  }
  if (task.kind === 'place_review' || task.kind === 'place_submission') {
    if (task.status !== 'pending') return [];
    return [
      { action: 'approve', label: '通过' },
      { action: 'reject', label: '驳回', tone: 'danger' },
    ];
  }
  if (task.kind === 'media_upload') {
    if (task.status === 'pending') {
      return [
        { action: 'approve', label: '通过' },
        { action: 'hide', label: '隐藏', tone: 'danger' },
        { action: 'reject', label: '驳回', tone: 'danger', confirm: true },
      ];
    }
    if (task.status === 'hidden' || task.status === 'rejected') {
      return [
        { action: 'restore', label: '恢复' },
      ];
    }
    return [
      { action: 'hide', label: '隐藏', tone: 'danger' },
      { action: 'reject', label: '驳回', tone: 'danger', confirm: true },
    ];
  }
  if (task.kind === 'pet_circle_post' || task.kind === 'pet_circle_comment') {
    if (task.status === 'deleted') return [];
    if (task.status === 'pending') {
      return [
        { action: 'approve', label: '通过' },
        { action: 'hide', label: '隐藏', tone: 'danger' },
        { action: 'delete', label: '删除', tone: 'danger', confirm: true },
      ];
    }
    if (task.status === 'hidden') {
      return [
        { action: 'restore', label: '恢复' },
        { action: 'delete', label: '删除', tone: 'danger', confirm: true },
      ];
    }
    return [
      { action: 'hide', label: '隐藏', tone: 'danger' },
      { action: 'delete', label: '删除', tone: 'danger', confirm: true },
    ];
  }
  return [];
}

function socialReportTargetSnapshot(report) {
  if (report.targetType === 'post') {
    const post = adminSocialPosts().find((item) => item.id === report.targetId);
    if (!post) return { contentText: '', targetLabel: '动态不存在', targetStatus: 'missing' };
    return {
      contentText: post.content,
      mediaUrls: post.imageUrls,
      ownerName: post.ownerName,
      ownerPhone: post.ownerPhone,
      targetLabel: post.petName ? `${post.petName} 的小事` : '宠友圈动态',
      targetStatus: post.status,
    };
  }
  if (report.targetType === 'comment') {
    const comment = adminSocialComments().find((item) => item.id === report.targetId);
    if (!comment) return { contentText: '', targetLabel: '评论不存在', targetStatus: 'missing' };
    return {
      contentText: comment.content,
      ownerName: comment.ownerName,
      ownerPhone: comment.ownerPhone,
      targetLabel: '宠友圈评论',
      targetStatus: comment.status,
    };
  }
  return { contentText: report.content || '', targetLabel: report.targetType, targetStatus: 'unknown' };
}

function isFrozenEvidenceSnapshot(snapshot) {
  return Boolean(snapshot?.snapshotId && snapshot?.snapshotAt);
}

function socialReportEvidenceSnapshot(report) {
  return normalizeSanctionEvidenceSnapshot(report?.evidenceSnapshot) || buildSocialReportEvidenceSnapshot(report, { frozen: false });
}

function buildSocialReportEvidenceSnapshot(report, options = {}) {
  const target = socialReportTargetSnapshot(report);
  const frozen = options.frozen !== false;
  return normalizeSanctionEvidenceSnapshot({
    ...target,
    createdAt: report.createdAt || '',
    ownerPhone: target.ownerPhone || report.ownerPhone,
    reportContent: report.content || '',
    reportId: report.id,
    reporterName: report.reporterName || state.users?.[report.phone]?.ownerName || '',
    reporterPhone: report.phone,
    snapshotAt: frozen ? new Date().toISOString() : '',
    snapshotId: frozen ? `evidence-${report.id || Date.now()}` : '',
    targetId: report.targetId,
    targetType: report.targetType,
  });
}

function ensureSocialReportEvidenceSnapshot(report) {
  if (!report) return null;
  const existing = normalizeSanctionEvidenceSnapshot(report.evidenceSnapshot);
  const snapshot = isFrozenEvidenceSnapshot(existing) ? existing : buildSocialReportEvidenceSnapshot(report);
  report.evidenceSnapshot = snapshot;
  return snapshot;
}

function suggestSanctionTemplateForReport(report) {
  const activeRestrictive = activeUserSanctionsFor(report.ownerPhone)
    .filter((sanction) => sanction.type !== 'warning');
  if (activeRestrictive.length > 0) return sanctionTemplateById('repeat_violation_freeze_72h');
  const target = socialReportTargetSnapshot(report);
  const hasMedia = Array.isArray(target.mediaUrls) && target.mediaUrls.length > 0;
  if (!String(target.contentText || '').trim() && !hasMedia) return sanctionTemplateById('warning_community_notice');
  return sanctionTemplateById('report_valid_mute_24h');
}

function buildReportSanctionSuggestion(admin, report, reason = '') {
  const template = suggestSanctionTemplateForReport(report) || sanctionTemplateById('report_valid_mute_24h');
  const evidenceSnapshot = ensureSocialReportEvidenceSnapshot(report);
  return {
    createdAt: report.sanctionSuggestion?.createdAt || new Date().toISOString(),
    createdBy: report.sanctionSuggestion?.createdBy || admin?.username || 'admin',
    durationHours: template.durationHours,
    evidenceSnapshot,
    id: report.sanctionSuggestion?.id || `suggestion-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    reason: String(reason || template.reason || '举报成立，建议处罚').replace(/\s+/g, ' ').trim().slice(0, 240),
    status: 'suggested',
    templateId: template.id,
    type: template.type,
    typeLabel: SANCTION_TYPE_LABELS[template.type] || template.type,
  };
}

function ensureReportSanctionSuggestion(admin, report, reason = '') {
  if (!report || !report.ownerPhone) return null;
  if (report.sanctionSuggestion?.status === 'applied') return report.sanctionSuggestion;
  const suggestion = buildReportSanctionSuggestion(admin, report, reason);
  report.sanctionSuggestion = suggestion;
  return suggestion;
}

function applyReportSanctionSuggestion(admin, reportId, body = {}) {
  const report = ensureSocialReports().find((item) => item.id === reportId);
  if (!report) return { error: '举报不存在', statusCode: 404 };
  if (!report.ownerPhone || !state.users?.[report.ownerPhone]) return { error: '被举报用户不存在', statusCode: 404 };
  if (!['valid', 'escalated', 'reviewing'].includes(report.status || 'pending')) {
    return { error: '只有有效或复核中的举报可以创建处罚', statusCode: 400 };
  }
  if (report.sanctionSuggestion?.status === 'applied' && report.sanctionSuggestion.sanctionId) {
    return { error: '该举报已经创建过处罚', statusCode: 400 };
  }
  const beforeReport = JSON.parse(JSON.stringify(report));
  const baseSuggestion = ensureReportSanctionSuggestion(admin, report, report.reviewReason || body.reason || '');
  const template = sanctionTemplateById(String(body.templateId || baseSuggestion.templateId || '')) || sanctionTemplateById(baseSuggestion.templateId);
  const type = normalizeSanctionType(body.type) || template?.type || baseSuggestion.type;
  const durationHours = parseSanctionDurationHours(type, body.durationHours ?? template?.durationHours ?? baseSuggestion.durationHours);
  if (!type || durationHours === null) return { error: '处罚模板配置不正确', statusCode: 400 };
  const reason = String(body.reason || baseSuggestion.reason || template?.reason || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!reason) return { error: '请填写处罚原因', statusCode: 400 };
  const evidenceSnapshot = ensureSocialReportEvidenceSnapshot(report);
  const result = createUserSanction(admin, report.ownerPhone, {
    durationHours,
    evidenceSnapshot,
    reason,
    source: 'social_report',
    sourceReportId: report.id,
    sourceTargetId: report.targetId,
    sourceTargetType: report.targetType,
    templateId: template?.id || baseSuggestion.templateId || '',
    type,
  });
  if (result.error) return result;
  report.sanctionId = result.sanction.id;
  report.sanctionSuggestion = {
    ...baseSuggestion,
    appliedAt: new Date().toISOString(),
    appliedBy: admin?.username || 'admin',
    durationHours,
    evidenceSnapshot,
    reason,
    sanctionId: result.sanction.id,
    status: 'applied',
    templateId: template?.id || baseSuggestion.templateId || '',
    type,
    typeLabel: SANCTION_TYPE_LABELS[type] || type,
  };
  writeAdminAudit(admin, 'social.report.sanction', 'social_report', report.id, beforeReport, {
    report,
    sanction: adminSanctionItem(result.sanction),
  }, reason);
  return {
    report: adminSocialReports().find((item) => item.id === report.id),
    sanction: adminSanctionItem(result.sanction),
  };
}

function buildModerationTask(input) {
  const status = moderationTaskStatus(input.status);
  const riskScore = Math.max(0, Math.min(100, Number(input.riskScore || 0)));
  const task = {
    actions: [],
    contentText: input.contentText || '',
    createdAt: input.createdAt || new Date().toISOString(),
    id: input.id,
    kind: input.kind,
    kindLabel: input.kindLabel,
    mediaUrls: Array.isArray(input.mediaUrls) ? input.mediaUrls : [],
    ownerName: input.ownerName || '',
    ownerPhone: input.ownerPhone || '',
    reason: input.reason || '',
    relatedCount: Number(input.relatedCount || 0),
    reporterName: input.reporterName || '',
    reporterPhone: input.reporterPhone || '',
    riskScore,
    riskTypes: Array.isArray(input.riskTypes) ? input.riskTypes : [],
    source: input.source || 'manual',
    sourceLabel: input.sourceLabel || '',
    status,
    targetId: input.targetId || '',
    targetLabel: input.targetLabel || '',
    targetStatus: input.targetStatus || '',
    targetType: input.targetType || '',
    title: input.title || input.kindLabel,
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
  const meta = ensureModerationTaskMeta()[task.id] || {};
  task.assignee = meta.assignee || '';
  task.assignedAt = meta.assignedAt || '';
  task.completedAt = meta.completedAt || '';
  task.completedBy = meta.completedBy || '';
  task.lastAction = meta.lastAction || '';
  task.lastReason = meta.lastReason || '';
  task.sla = moderationSlaSnapshot(task);
  task.priority = moderationTaskPriority(task.status, task.riskScore);
  task.actions = moderationTaskActions(task);
  return task;
}

function adminModerationTasks(options = {}) {
  const statusFilter = String(options.status || 'pending');
  const q = String(options.q || '').trim().toLowerCase();
  const limit = Math.floor(clampNumber(options.limit, 300, 1, ADMIN_EXPORT_ROW_LIMIT));
  const reportTasks = adminSocialReports().map((report) => {
    const target = socialReportTargetSnapshot(report);
    const riskScore = report.status === 'escalated' ? 95 : 82;
    return buildModerationTask({
      ...target,
      createdAt: report.createdAt,
      id: `report:${report.id}`,
      kind: 'report',
      kindLabel: '举报',
      ownerName: target.ownerName || report.ownerName,
      ownerPhone: target.ownerPhone || report.ownerPhone,
      reason: report.content || '',
      reporterName: report.reporterName,
      reporterPhone: report.reporterPhone,
      riskScore,
      riskTypes: ['用户举报'],
      source: 'report',
      sourceLabel: '用户举报',
      status: report.status,
      targetId: report.targetId,
      targetLabel: target.targetLabel,
      targetType: report.targetType,
      title: `举报 · ${target.targetLabel || report.targetType}`,
      updatedAt: report.reviewedAt || report.createdAt,
    });
  });
  const postTasks = adminSocialPosts()
    .filter((post) => post.reportCount > 0 || post.status === 'hidden' || post.status === 'pending_review')
    .map((post) => buildModerationTask({
      contentText: post.content,
      createdAt: post.createdAt,
      id: `post:${post.id}`,
      kind: 'pet_circle_post',
      kindLabel: '宠友圈动态',
      mediaUrls: post.imageUrls,
      ownerName: post.ownerName,
      ownerPhone: post.ownerPhone,
      relatedCount: post.reportCount,
      riskScore: post.moderation?.riskScore || (post.reportCount > 1 ? 88 : 70),
      riskTypes: post.moderation?.riskTypes?.length ? post.moderation.riskTypes : (post.reportCount ? [`${post.reportCount} 次举报`] : ['人工隐藏复核']),
      source: post.moderation?.source || (post.reportCount ? 'report' : 'manual'),
      sourceLabel: post.moderation?.sourceLabel || (post.reportCount ? '举报聚合' : '人工处理'),
      status: post.status === 'published' && post.reportCount > 0 ? 'pending' : post.status,
      targetId: post.id,
      targetLabel: post.petName ? `${post.petName} 的小事` : '宠友圈动态',
      targetStatus: post.status,
      targetType: 'post',
      title: post.petName ? `${post.petName} 的小事` : '宠友圈动态',
      updatedAt: post.updatedAt || post.createdAt,
    }));
  const commentTasks = adminSocialComments()
    .filter((comment) => comment.reportCount > 0 || comment.status === 'hidden' || comment.status === 'pending_review')
    .map((comment) => buildModerationTask({
      contentText: comment.content,
      createdAt: comment.createdAt,
      id: `comment:${comment.id}`,
      kind: 'pet_circle_comment',
      kindLabel: '宠友圈评论',
      ownerName: comment.ownerName,
      ownerPhone: comment.ownerPhone,
      relatedCount: comment.reportCount,
      riskScore: comment.moderation?.riskScore || (comment.reportCount > 1 ? 86 : 68),
      riskTypes: comment.moderation?.riskTypes?.length ? comment.moderation.riskTypes : (comment.reportCount ? [`${comment.reportCount} 次举报`] : ['人工隐藏复核']),
      source: comment.moderation?.source || (comment.reportCount ? 'report' : 'manual'),
      sourceLabel: comment.moderation?.sourceLabel || (comment.reportCount ? '举报聚合' : '人工处理'),
      status: comment.status === 'published' && comment.reportCount > 0 ? 'pending' : comment.status,
      targetId: comment.id,
      targetLabel: '宠友圈评论',
      targetStatus: comment.status,
      targetType: 'comment',
      title: '宠友圈评论',
      updatedAt: comment.createdAt,
    }));
  const reviewTasks = adminPlaceReviews().map((review) => buildModerationTask({
    contentText: review.content,
    createdAt: review.createdAt,
    id: `placeReview:${review.id}`,
    kind: 'place_review',
    kindLabel: '地点点评',
    ownerName: review.ownerName,
    ownerPhone: review.ownerPhone,
    reason: review.reviewReason || '',
    riskScore: review.moderation?.riskScore || (review.status === 'pending_review' ? 55 : 20),
    riskTypes: review.moderation?.riskTypes?.length ? review.moderation.riskTypes : ['地点内容待审'],
    source: review.moderation?.source || 'manual',
    sourceLabel: review.moderation?.sourceLabel || '用户提交',
    status: review.status,
    targetId: review.id,
    targetLabel: review.placeName,
    targetStatus: review.status,
    targetType: 'place_review',
    title: review.placeName,
    updatedAt: review.reviewedAt || review.createdAt,
  }));
  const submissionTasks = adminPlaceSubmissions().map((submission) => buildModerationTask({
    contentText: [submission.address, submission.content].filter(Boolean).join(' · '),
    createdAt: submission.createdAt,
    id: `placeSubmission:${submission.id}`,
    kind: 'place_submission',
    kindLabel: '新增地点',
    ownerName: submission.ownerName,
    ownerPhone: submission.ownerPhone,
    reason: submission.reviewReason || '',
    riskScore: submission.moderation?.riskScore || (submission.status === 'pending_review' ? 58 : 20),
    riskTypes: submission.moderation?.riskTypes?.length ? submission.moderation.riskTypes : ['地点入库待审'],
    source: submission.moderation?.source || 'manual',
    sourceLabel: submission.moderation?.sourceLabel || '用户提交',
    status: submission.status,
    targetId: submission.id,
    targetLabel: submission.name,
    targetStatus: submission.status,
    targetType: 'place_submission',
    title: submission.name,
    updatedAt: submission.reviewedAt || submission.createdAt,
  }));
  const mediaTasks = adminMediaModeration({ limit: ADMIN_EXPORT_ROW_LIMIT, status: 'all' }, options.req || null).items
    .filter((media) => media.status !== 'approved')
    .map((media) => buildModerationTask({
      contentText: [media.analysisTitle, media.analysisMessage, media.fileName].filter(Boolean).join(' · '),
      createdAt: media.createdAt,
      id: `media:${media.mediaId}`,
      kind: 'media_upload',
      kindLabel: '图片素材',
      mediaUrls: media.fileUrl ? [media.fileUrl] : [],
      ownerName: media.ownerName,
      ownerPhone: media.ownerPhone,
      reason: media.moderationReason || '',
      relatedCount: media.references?.postCount || media.references?.avatarJobCount || 0,
      riskScore: media.riskScore,
      riskTypes: media.riskTypes?.length ? media.riskTypes : ['图片审核'],
      source: media.source || 'upload',
      sourceLabel: media.sourceLabel || '用户上传',
      status: media.status,
      targetId: media.mediaId,
      targetLabel: media.petName || media.mediaId,
      targetStatus: media.status,
      targetType: 'media_upload',
      title: media.petName ? `${media.petName} 的图片素材` : '图片素材',
      updatedAt: media.moderatedAt || media.updatedAt || media.createdAt,
    }));
  const tasks = [...reportTasks, ...postTasks, ...commentTasks, ...reviewTasks, ...submissionTasks, ...mediaTasks]
    .filter((task) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') return ['pending', 'reviewing', 'escalated'].includes(task.status);
      if (statusFilter === 'handled') return !['pending', 'reviewing', 'escalated'].includes(task.status);
      return task.status === statusFilter;
    })
    .filter((task) => {
      if (!q) return true;
      return [task.id, task.title, task.kindLabel, task.ownerName, task.ownerPhone, task.reporterName, task.reporterPhone, task.contentText, task.reason, task.targetId]
        .some((value) => String(value || '').toLowerCase().includes(q));
    })
    .sort((a, b) => b.priority - a.priority || String(b.createdAt).localeCompare(String(a.createdAt)));
  const allTasks = [...reportTasks, ...postTasks, ...commentTasks, ...reviewTasks, ...submissionTasks, ...mediaTasks];
  const samples = adminModerationSamples();
  const sampleSummary = moderationSampleSummary(samples);
  return {
    sampleSummary,
    samples: samples.slice(0, 24),
    summary: {
      all: allTasks.length,
      assigned: allTasks.filter((task) => task.assignee).length,
      escalated: allTasks.filter((task) => task.status === 'escalated').length,
      handled: allTasks.filter((task) => !['pending', 'reviewing', 'escalated'].includes(task.status)).length,
      media: allTasks.filter((task) => task.kind === 'media_upload').length,
      overdue: allTasks.filter((task) => task.sla?.status === 'overdue').length,
      pending: allTasks.filter((task) => ['pending', 'reviewing', 'escalated'].includes(task.status)).length,
      places: allTasks.filter((task) => task.kind === 'place_review' || task.kind === 'place_submission').length,
      reports: allTasks.filter((task) => task.kind === 'report').length,
      ruleHits: sampleSummary.riskHits,
      sampleFalseNegative: sampleSummary.falseNegative,
      sampleFalsePositive: sampleSummary.falsePositive,
      sampleUnreviewed: sampleSummary.unreviewed,
      qualitySamples: sampleSummary.qualitySamples,
      social: allTasks.filter((task) => task.kind === 'pet_circle_post' || task.kind === 'pet_circle_comment').length,
    },
    tasks: tasks.slice(0, limit),
  };
}

function splitModerationTaskId(taskId) {
  const index = String(taskId || '').indexOf(':');
  if (index <= 0) return { id: '', kind: '' };
  return { id: taskId.slice(index + 1), kind: taskId.slice(0, index) };
}

function findAdminModerationTask(taskId) {
  return adminModerationTasks({ status: 'all' }).tasks.find((item) => item.id === taskId) || null;
}

function adminAssignModerationTask(admin, taskId, body = {}) {
  const task = findAdminModerationTask(taskId);
  if (!task) return { error: 'Moderation task not found', statusCode: 404 };
  const reason = adminReason(body, 'Assign moderation task');
  const assignee = String(body.assignee || admin.username || 'admin').replace(/\s+/g, ' ').trim().slice(0, 40) || 'admin';
  const before = { ...(ensureModerationTaskMeta()[taskId] || {}) };
  const meta = assignModerationTaskMeta(taskId, admin, assignee, reason);
  writeAdminAudit(admin, 'moderation.task.assign', 'moderation_task', taskId, before, meta, reason);
  return { task: findAdminModerationTask(taskId) };
}

function adminHandleModerationTaskBatch(admin, body = {}) {
  const rawTaskIds = Array.isArray(body.taskIds) ? body.taskIds : [];
  const taskIds = Array.from(new Set(rawTaskIds.map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 50);
  const action = String(body.action || '').trim();
  if (!taskIds.length) return { error: 'No moderation tasks selected', statusCode: 400 };
  if (!action) return { error: 'No moderation batch action selected', statusCode: 400 };
  const reason = adminReason(body, `Batch moderation ${action}`);
  const results = [];
  for (const taskId of taskIds) {
    const result = action === 'assign'
      ? adminAssignModerationTask(admin, taskId, { assignee: body.assignee || admin.username, reason })
      : adminHandleModerationTaskAction(admin, taskId, action, { reason });
    results.push({
      error: result.error || '',
      id: taskId,
      ok: !result.error,
      statusCode: result.statusCode || 200,
    });
  }
  return {
    action,
    errorCount: results.filter((item) => !item.ok).length,
    results,
    successCount: results.filter((item) => item.ok).length,
    total: results.length,
  };
}

function adminHandleModerationTaskAction(admin, taskId, action, body = {}) {
  const { kind, id } = splitModerationTaskId(taskId);
  const reason = adminReason(body, `Moderation task ${action}`);
  const now = new Date().toISOString();
  if (kind === 'report') {
    const report = ensureSocialReports().find((item) => item.id === id);
    if (!report) return { error: '审核任务不存在', statusCode: 404 };
    const beforeReport = { ...report };
    if (action === 'reviewing') report.status = 'reviewing';
    else if (action === 'invalid') report.status = 'invalid';
    else if (action === 'valid') report.status = 'valid';
    else if (action === 'escalate') report.status = 'escalated';
    else if (action === 'hide' || action === 'delete') {
      if (report.targetType === 'post') {
        const post = findSocialMomentById(report.targetId);
        if (!post) return { error: '被举报动态不存在', statusCode: 404 };
        const beforePost = { ...post };
        post.status = action === 'hide' ? 'hidden' : 'deleted';
        post.updatedAt = now;
        post.adminModerationReason = reason;
        if (action === 'delete') {
          post.deletedAt = now;
          state.socialLikes = ensureSocialLikes().filter((like) => like.postId !== post.id);
          ensureSocialComments().filter((comment) => comment.postId === post.id).forEach((comment) => {
            comment.status = 'deleted';
            comment.deletedAt = comment.deletedAt || now;
          });
        }
        writeAdminAudit(admin, `moderation.post.${action}`, 'pet_circle_post', post.id, beforePost, post, reason);
      } else if (report.targetType === 'comment') {
        const comment = ensureSocialComments().find((item) => item.id === report.targetId);
        if (!comment) return { error: '被举报评论不存在', statusCode: 404 };
        const beforeComment = { ...comment };
        comment.status = action === 'hide' ? 'hidden' : 'deleted';
        comment.adminModerationReason = reason;
        if (action === 'delete') comment.deletedAt = now;
        writeAdminAudit(admin, `moderation.comment.${action}`, 'pet_circle_comment', comment.id, beforeComment, comment, reason);
      } else {
        return { error: '该举报对象暂不支持这个动作', statusCode: 400 };
      }
      report.status = 'valid';
    } else return { error: '不支持的审核动作', statusCode: 400 };
    report.reviewedAt = now;
    report.reviewedBy = admin.username;
    report.reviewReason = reason;
    if (report.status === 'valid') {
      ensureSocialReportEvidenceSnapshot(report);
      ensureReportSanctionSuggestion(admin, report, reason);
    }
    markModerationTaskMeta(taskId, admin, action, reason);
    notifySocialReportResolution(report, action, reason);
    writeAdminAudit(admin, 'moderation.report.resolve', 'social_report', report.id, beforeReport, report, reason);
    return { task: adminModerationTasks({ status: 'all' }).tasks.find((item) => item.id === taskId) };
  }
  if (kind === 'post') {
    const post = findSocialMomentById(id);
    if (!post) return { error: '动态不存在', statusCode: 404 };
    const before = { ...post };
    if (action === 'approve') post.status = 'published';
    else if (action === 'hide') post.status = 'hidden';
    else if (action === 'restore') post.status = 'published';
    else if (action === 'delete') {
      post.status = 'deleted';
      post.deletedAt = now;
      state.socialLikes = ensureSocialLikes().filter((like) => like.postId !== id);
      ensureSocialComments().filter((comment) => comment.postId === id).forEach((comment) => {
        comment.status = 'deleted';
        comment.deletedAt = comment.deletedAt || now;
      });
    } else return { error: '不支持的动态处理动作', statusCode: 400 };
    post.updatedAt = now;
    post.adminModerationReason = reason;
    markModerationTaskMeta(taskId, admin, action, reason);
    writeAdminAudit(admin, `moderation.post.${action}`, 'pet_circle_post', id, before, post, reason);
    return { task: adminModerationTasks({ status: 'all' }).tasks.find((item) => item.id === taskId) };
  }
  if (kind === 'comment') {
    const comment = ensureSocialComments().find((item) => item.id === id);
    if (!comment) return { error: '评论不存在', statusCode: 404 };
    const before = { ...comment };
    if (action === 'approve') {
      comment.status = 'published';
      const post = findSocialMomentById(comment.postId);
      if (post?.phone && post.phone !== comment.phone) {
        const commenter = state.users[comment.phone];
        addNotification(post.phone, {
          category: 'interaction',
          commentId: comment.id,
          id: `n-pet-circle-comment-${comment.id}`,
          kind: 'pet_circle_comment',
          postId: post.id,
          read: false,
          text: `${commenter?.ownerName || `用户${String(comment.phone || '').slice(-4)}`}评论了这条小事`,
          title: '宠友圈有新评论',
        }, 'interaction');
      }
    }
    else if (action === 'hide') comment.status = 'hidden';
    else if (action === 'restore') comment.status = 'published';
    else if (action === 'delete') {
      comment.status = 'deleted';
      comment.deletedAt = now;
    } else return { error: '不支持的评论处理动作', statusCode: 400 };
    comment.adminModerationReason = reason;
    markModerationTaskMeta(taskId, admin, action, reason);
    writeAdminAudit(admin, `moderation.comment.${action}`, 'pet_circle_comment', id, before, comment, reason);
    return { task: adminModerationTasks({ status: 'all' }).tasks.find((item) => item.id === taskId) };
  }
  if (kind === 'media') {
    const result = adminModerateMediaUpload(admin, id, action, body);
    if (result.error) return result;
    markModerationTaskMeta(taskId, admin, action, reason);
    return { task: adminModerationTasks({ status: 'all' }).tasks.find((item) => item.id === taskId) };
  }
  if (kind === 'placeReview') {
    const found = findPlaceReview(id);
    if (!found) return { error: '地点点评不存在', statusCode: 404 };
    if (action !== 'approve' && action !== 'reject') return { error: '不支持的地点点评处理动作', statusCode: 400 };
    const moderation = placeModerationReason(body, 'review', action, reason);
    if (moderation.error) return moderation;
    const before = { ...found.review };
    found.review.status = action === 'approve' ? 'approved' : 'rejected';
    found.review.reviewedAt = now;
    found.review.reviewedBy = admin.username;
    applyPlaceModerationReason(found.review, moderation);
    markModerationTaskMeta(taskId, admin, action, moderation.reason);
    notifyPlaceReviewModeration(found.phone, found.review, action, moderation.reason);
    writeAdminAudit(admin, `moderation.placeReview.${action}`, 'place_review', id, before, found.review, moderation.reason);
    return { task: adminModerationTasks({ status: 'all' }).tasks.find((item) => item.id === taskId) };
  }
  if (kind === 'placeSubmission') {
    const found = findPlaceSubmission(id);
    if (!found) return { error: '新增地点提交不存在', statusCode: 404 };
    if (action !== 'approve' && action !== 'reject') return { error: '不支持的新增地点处理动作', statusCode: 400 };
    const moderation = placeModerationReason(body, 'submission', action, reason);
    if (moderation.error) return moderation;
    const before = { ...found.submission };
    found.submission.status = action === 'approve' ? 'approved' : 'rejected';
    found.submission.reviewedAt = now;
    found.submission.reviewedBy = admin.username;
    applyPlaceModerationReason(found.submission, moderation);
    if (action === 'approve' && !found.submission.approvedPlaceId) {
      const place = ensureManualPlaceForSubmission(found.submission, found.phone);
      if (place) recordPlaceContribution(admin, found.phone, found.submission, place, 'created', moderation.reason);
    }
    markModerationTaskMeta(taskId, admin, action, moderation.reason);
    notifyPlaceSubmissionModeration(found.phone, found.submission, action, moderation.reason);
    writeAdminAudit(admin, `moderation.placeSubmission.${action}`, 'place_submission', id, before, found.submission, moderation.reason);
    return { task: adminModerationTasks({ status: 'all' }).tasks.find((item) => item.id === taskId) };
  }
  return { error: '审核任务不存在', statusCode: 404 };
}

async function handleAdminRequest(req, res, pathname, url, body) {
  if (req.method === 'POST' && pathname === '/admin/auth/login') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const admin = {
      ip: clientIpFromRequest(req),
      role: 'admin',
      userAgent: String(req.headers['user-agent'] || '').slice(0, 180),
      username,
    };
    const lockStatus = adminLoginSecurityStatus();
    if (lockStatus.locked) {
      writeAdminAudit(admin, 'admin.login.blocked_by_lock', 'admin_user', username || ADMIN_USERNAME, null, lockStatus, '后台登录临时锁定中');
      saveState();
      fail(res, 429, `后台登录已被临时锁定，请 ${lockStatus.remainingLockMinutes} 分钟后再试`, true, lockStatus, 'ADMIN_LOGIN_LOCKED');
      return true;
    }
    if (!safeEqualText(username, ADMIN_USERNAME) || !safeEqualText(password, ADMIN_PASSWORD)) {
      const failedStatus = recordAdminLoginFailure(admin, username, '管理员账号或密码不正确');
      saveState();
      if (failedStatus.locked) {
        fail(res, 429, `密码错误次数过多，已锁定 ${failedStatus.lockMinutes} 分钟`, true, failedStatus, 'ADMIN_LOGIN_LOCKED');
        return true;
      }
      fail(res, 401, `管理员账号或密码不正确，还可尝试 ${Math.max(0, failedStatus.maxAttempts - failedStatus.failedAttempts)} 次`, false, failedStatus, 'ADMIN_LOGIN_FAILED');
      return true;
    }
    recordAdminLoginSuccess(admin);
    writeAdminAudit(admin, 'admin.login', 'admin_user', username, null, { username }, 'login');
    saveState();
    ok(res, { admin, loginSecurity: adminLoginSecurityStatus(), token: createAdminToken(username) });
    return true;
  }

  const admin = requireAdmin(req, res);
  if (!admin) return true;
  admin.ip = clientIpFromRequest(req);
  admin.userAgent = String(req.headers['user-agent'] || '').slice(0, 180);

  if (req.method === 'GET' && pathname === '/admin/me') {
    ok(res, admin);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/accounts') {
    ok(res, adminAccounts(admin));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/dashboard/summary') {
    ok(res, adminDashboardSummary());
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/analytics') {
    ok(res, adminAnalytics({ days: url.searchParams.get('days') }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/system/health') {
    ok(res, adminSystemHealth());
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/launch/readiness') {
    ok(res, adminLaunchReadiness());
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/exports') {
    ok(res, adminExportCatalog(adminExportFiltersFromUrl(url)));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/exports/history') {
    ok(res, adminExportHistory({
      limit: url.searchParams.get('limit') || 20,
      q: url.searchParams.get('q') || '',
      type: url.searchParams.get('type') || 'all',
    }));
    return true;
  }

  const adminExportMatch = pathname.match(/^\/admin\/exports\/([^/]+)\.csv$/);
  if (req.method === 'GET' && adminExportMatch) {
    const type = decodeURIComponent(adminExportMatch[1]);
    const exportReason = adminExportReasonFromUrl(url);
    if (exportReason.length < ADMIN_EXPORT_REASON_MIN_LENGTH) {
      fail(res, 400, `请填写导出原因（至少 ${ADMIN_EXPORT_REASON_MIN_LENGTH} 个字）`, false, undefined, 'ADMIN_EXPORT_REASON_REQUIRED');
      return true;
    }
    const result = buildAdminExportCsv(type, adminExportFiltersFromUrl(url), { admin, reason: exportReason });
    if (!result) {
      fail(res, 404, '导出数据集不存在', false, undefined, 'ADMIN_EXPORT_NOT_FOUND');
      return true;
    }
    writeAdminAudit(admin, 'data.export.download', 'data_export', type, null, {
      columns: result.columns,
      exportReason: result.exportReason,
      filterSummary: result.filterSummary,
      filters: result.filters,
      filename: result.filename,
      matchedRows: result.matchedRows,
      rowCount: result.rowCount,
      totalRows: result.totalRows,
      type,
      watermark: result.watermark,
      watermarkId: result.watermarkId,
    }, `导出${result.label}：${exportReason}；${result.filterSummary}`);
    saveState();
    sendCsv(res, result.filename, result.csv);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/notifications') {
    ok(res, adminSystemNotifications());
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/push-devices') {
    ok(res, adminPushDevices());
    return true;
  }

  if (req.method === 'POST' && pathname === '/admin/notifications/system') {
    const result = createManagedSystemNotification(admin, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_NOTIFICATION_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  const adminNotificationCancelMatch = pathname.match(/^\/admin\/notifications\/([^/]+)\/cancel$/);
  if (req.method === 'POST' && adminNotificationCancelMatch) {
    const result = revokeSystemNotification(admin, decodeURIComponent(adminNotificationCancelMatch[1]), body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_NOTIFICATION_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/admin/notifications/templates') {
    const result = createNotificationTemplate(admin, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_NOTIFICATION_TEMPLATE_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  const adminNotificationTemplateDeleteMatch = pathname.match(/^\/admin\/notifications\/templates\/([^/]+)\/delete$/);
  if (req.method === 'POST' && adminNotificationTemplateDeleteMatch) {
    const result = removeNotificationTemplate(admin, decodeURIComponent(adminNotificationTemplateDeleteMatch[1]));
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_NOTIFICATION_TEMPLATE_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/tickets') {
    ok(res, adminSupportTickets({
      priority: url.searchParams.get('priority') || 'all',
      q: url.searchParams.get('q') || '',
      status: url.searchParams.get('status') || 'open',
    }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/tickets/reply-templates') {
    ok(res, adminSupportTicketReplyTemplates());
    return true;
  }

  if (req.method === 'POST' && pathname === '/admin/tickets/reply-templates') {
    const result = createSupportTicketReplyTemplate(admin, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_TICKET_TEMPLATE_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  const adminTicketReplyTemplateDeleteMatch = pathname.match(/^\/admin\/tickets\/reply-templates\/([^/]+)\/delete$/);
  if (req.method === 'POST' && adminTicketReplyTemplateDeleteMatch) {
    const result = removeSupportTicketReplyTemplate(admin, decodeURIComponent(adminTicketReplyTemplateDeleteMatch[1]));
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_TICKET_TEMPLATE_NOT_FOUND');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/admin/tickets/batch') {
    const result = adminHandleSupportTicketBatch(admin, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_TICKET_BATCH_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  const adminTicketMatch = pathname.match(/^\/admin\/tickets\/([^/]+)$/);
  if (req.method === 'GET' && adminTicketMatch) {
    const ticketId = decodeURIComponent(adminTicketMatch[1]);
    const ticket = findSupportTicket(ticketId);
    if (!ticket) {
      fail(res, 404, '工单不存在', false, undefined, 'ADMIN_TICKET_NOT_FOUND');
      return true;
    }
    ok(res, supportTicketDetail(ticket));
    return true;
  }

  if (req.method === 'PATCH' && adminTicketMatch) {
    const ticketId = decodeURIComponent(adminTicketMatch[1]);
    const ticket = findSupportTicket(ticketId);
    if (!ticket) {
      fail(res, 404, '工单不存在', false, undefined, 'ADMIN_TICKET_NOT_FOUND');
      return true;
    }
    const updated = updateSupportTicket(admin, ticket, {
      priority: body.priority,
      relatedObjects: body.relatedObjects,
      status: body.status,
    }, body.reason);
    saveState();
    ok(res, supportTicketDetail(updated));
    return true;
  }

  const adminTicketActionMatch = pathname.match(/^\/admin\/tickets\/([^/]+)\/(assign|notes|reply|status)$/);
  if ((req.method === 'POST' || req.method === 'PATCH') && adminTicketActionMatch) {
    const ticketId = decodeURIComponent(adminTicketActionMatch[1]);
    const action = adminTicketActionMatch[2];
    const ticket = findSupportTicket(ticketId);
    if (!ticket) {
      fail(res, 404, '工单不存在', false, undefined, 'ADMIN_TICKET_NOT_FOUND');
      return true;
    }
    if (action === 'assign') {
      updateSupportTicket(admin, ticket, { assignee: body.assignee || admin.username, status: body.status || 'reviewing' }, body.reason || '工单分配');
    } else if (action === 'notes') {
      const result = addSupportTicketNote(admin, ticket, body.content);
      if (result.error) {
        fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_TICKET_NOTE_INVALID');
        return true;
      }
    } else if (action === 'reply') {
      const result = replySupportTicket(admin, ticket, body);
      if (result.error) {
        fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_TICKET_REPLY_INVALID');
        return true;
      }
    } else if (action === 'status') {
      updateSupportTicket(admin, ticket, { priority: body.priority, status: body.status }, body.reason || '工单状态更新');
    }
    saveState();
    ok(res, supportTicketDetail(ticket));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/moderation/tasks') {
    ok(res, adminModerationTasks({
      q: url.searchParams.get('q') || '',
      req,
      status: url.searchParams.get('status') || 'pending',
    }));
    return true;
  }

  if (req.method === 'POST' && pathname === '/admin/moderation/tasks/batch') {
    const result = adminHandleModerationTaskBatch(admin, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_MODERATION_BATCH_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  const adminModerationTaskAssignMatch = pathname.match(/^\/admin\/moderation\/tasks\/([^/]+)\/assign$/);
  if (req.method === 'POST' && adminModerationTaskAssignMatch) {
    const taskId = decodeURIComponent(adminModerationTaskAssignMatch[1]);
    const result = adminAssignModerationTask(admin, taskId, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_MODERATION_ASSIGN_INVALID');
      return true;
    }
    saveState();
    ok(res, result.task || null);
    return true;
  }

  const adminModerationTaskActionMatch = pathname.match(/^\/admin\/moderation\/tasks\/([^/]+)\/([^/]+)$/);
  if (req.method === 'POST' && adminModerationTaskActionMatch) {
    const taskId = decodeURIComponent(adminModerationTaskActionMatch[1]);
    const action = decodeURIComponent(adminModerationTaskActionMatch[2]);
    const result = adminHandleModerationTaskAction(admin, taskId, action, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_MODERATION_TASK_INVALID');
      return true;
    }
    saveState();
    ok(res, result.task || null);
    return true;
  }

  const adminModerationSampleReviewMatch = pathname.match(/^\/admin\/moderation\/samples\/([^/]+)\/review$/);
  if (req.method === 'POST' && adminModerationSampleReviewMatch) {
    const sampleId = decodeURIComponent(adminModerationSampleReviewMatch[1]);
    const result = adminReviewModerationSample(admin, sampleId, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_MODERATION_SAMPLE_INVALID');
      return true;
    }
    saveState();
    ok(res, result.sample || null);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/media/moderation') {
    ok(res, adminMediaModeration({
      q: url.searchParams.get('q') || '',
      status: url.searchParams.get('status') || 'pending_review',
    }, req));
    return true;
  }

  const adminMediaModerationMatch = pathname.match(/^\/admin\/media\/([^/]+)\/moderate$/);
  if (req.method === 'POST' && adminMediaModerationMatch) {
    const mediaId = decodeURIComponent(adminMediaModerationMatch[1]);
    const result = adminModerateMediaUpload(admin, mediaId, body.action, body, req);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_MEDIA_MODERATION_INVALID');
      return true;
    }
    saveState();
    ok(res, result.item || null);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/users') {
    const q = String(url.searchParams.get('q') || '').trim();
    const users = Object.values(state.users || {})
      .map(adminUserSummary)
      .filter((user) => !q || user.phone.includes(q) || user.ownerName.includes(q) || user.pets.some((pet) => String(pet.name || '').includes(q)))
      .sort((a, b) => Number(b.lastSeenAt || b.createdAt || 0) - Number(a.lastSeenAt || a.createdAt || 0));
    ok(res, users.slice(0, 200));
    return true;
  }

  const adminUserMatch = pathname.match(/^\/admin\/users\/([^/]+)$/);
  if (req.method === 'GET' && adminUserMatch) {
    const phone = normalizePhone(decodeURIComponent(adminUserMatch[1]));
    const user = phone ? state.users[phone] : null;
    if (!user) {
      fail(res, 404, '用户不存在', false, undefined, 'ADMIN_USER_NOT_FOUND');
      return true;
    }
    ok(res, {
      ...adminUserSummary(user),
      aiUsage: buildAiUsageSummary(user),
      adminNotes: normalizeAdminNotes(user.adminNotes),
      riskTagOptions: ADMIN_USER_RISK_TAGS,
      avatarJobs: adminAvatarJobs().filter((job) => job.ownerPhone === phone),
      feedback: adminFeedbackItems().filter((item) => item.phone === phone),
      notifications: normalizeNotificationsFor(phone),
      socialPosts: adminSocialPosts().filter((post) => post.ownerPhone === phone),
    });
    return true;
  }

  const adminUserNoteMatch = pathname.match(/^\/admin\/users\/([^/]+)\/notes$/);
  if (req.method === 'POST' && adminUserNoteMatch) {
    const phone = normalizePhone(decodeURIComponent(adminUserNoteMatch[1]));
    const result = adminAddUserNote(admin, phone, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_USER_NOTE_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  const adminUserRiskTagsMatch = pathname.match(/^\/admin\/users\/([^/]+)\/risk-tags$/);
  if (req.method === 'POST' && adminUserRiskTagsMatch) {
    const phone = normalizePhone(decodeURIComponent(adminUserRiskTagsMatch[1]));
    const result = adminUpdateUserRiskTags(admin, phone, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_USER_RISK_TAGS_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  const adminUserBusinessSummaryMatch = pathname.match(/^\/admin\/users\/([^/]+)\/business-data-summary$/);
  if (req.method === 'GET' && adminUserBusinessSummaryMatch) {
    const phone = normalizePhone(decodeURIComponent(adminUserBusinessSummaryMatch[1]));
    const summary = phone ? adminUserBusinessDataSummary(phone) : null;
    if (!summary) {
      fail(res, 404, '用户不存在', false, undefined, 'ADMIN_USER_NOT_FOUND');
      return true;
    }
    ok(res, { phone, summary });
    return true;
  }

  const adminUserClearBusinessDataMatch = pathname.match(/^\/admin\/users\/([^/]+)\/clear-business-data$/);
  if (req.method === 'POST' && adminUserClearBusinessDataMatch) {
    const phone = normalizePhone(decodeURIComponent(adminUserClearBusinessDataMatch[1]));
    const result = adminClearUserBusinessData(admin, phone, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_USER_CLEAR_BUSINESS_DATA_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/pets') {
    ok(res, adminPetProfiles({
      avatar: url.searchParams.get('avatar') || 'all',
      birthday: url.searchParams.get('birthday') || 'all',
      q: url.searchParams.get('q') || '',
      species: url.searchParams.get('species') || 'all',
    }));
    return true;
  }

  const adminPetMediaClearMatch = pathname.match(/^\/admin\/pets\/([^/]+)\/media\/([^/]+)\/clear$/);
  if (req.method === 'POST' && adminPetMediaClearMatch) {
    const petId = decodeURIComponent(adminPetMediaClearMatch[1]);
    const kind = decodeURIComponent(adminPetMediaClearMatch[2]);
    const result = adminClearPetMedia(admin, petId, kind, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PET_MEDIA_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/pet-calendar') {
    ok(res, adminPetCalendarRecords({
      from: url.searchParams.get('from') || '',
      q: url.searchParams.get('q') || '',
      source: url.searchParams.get('source') || 'all',
      status: url.searchParams.get('status') || 'all',
      to: url.searchParams.get('to') || '',
      type: url.searchParams.get('type') || 'all',
    }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/social-relations') {
    ok(res, adminSocialRelations({
      kind: url.searchParams.get('kind') || 'all',
      q: url.searchParams.get('q') || '',
      status: url.searchParams.get('status') || 'all',
    }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/sanctions') {
    const q = String(url.searchParams.get('q') || '').trim();
    const rows = adminSanctions().filter((item) =>
      !q || item.phone.includes(q) || item.ownerName.includes(q) || item.reason.includes(q) || item.typeLabel.includes(q) || item.type.includes(q)
    );
    ok(res, rows.slice(0, 300));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/sanction-templates') {
    ok(res, adminSanctionTemplates());
    return true;
  }

  const adminUserSanctionsMatch = pathname.match(/^\/admin\/users\/([^/]+)\/sanctions$/);
  if (req.method === 'GET' && adminUserSanctionsMatch) {
    const phone = normalizePhone(decodeURIComponent(adminUserSanctionsMatch[1]));
    const user = phone ? state.users[phone] : null;
    if (!user) {
      fail(res, 404, '用户不存在', false, undefined, 'ADMIN_USER_NOT_FOUND');
      return true;
    }
    ok(res, userSanctionsFor(phone).map(adminSanctionItem));
    return true;
  }

  if (req.method === 'POST' && adminUserSanctionsMatch) {
    const phone = normalizePhone(decodeURIComponent(adminUserSanctionsMatch[1]));
    const before = phone && state.users[phone] ? adminUserSummary(state.users[phone]) : null;
    const result = phone ? createUserSanction(admin, phone, body) : { error: '用户不存在', statusCode: 404 };
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_SANCTION_INVALID');
      return true;
    }
    const after = adminUserSummary(state.users[phone]);
    writeAdminAudit(admin, 'user.sanction.create', 'user', phone, before, { ...after, sanction: adminSanctionItem(result.sanction) }, body.reason);
    saveState();
    ok(res, adminSanctionItem(result.sanction));
    return true;
  }

  const adminUserSanctionRevokeMatch = pathname.match(/^\/admin\/users\/([^/]+)\/sanctions\/([^/]+)\/revoke$/);
  if (req.method === 'POST' && adminUserSanctionRevokeMatch) {
    const phone = normalizePhone(decodeURIComponent(adminUserSanctionRevokeMatch[1]));
    const sanctionId = decodeURIComponent(adminUserSanctionRevokeMatch[2]);
    const before = phone && state.users[phone] ? adminUserSummary(state.users[phone]) : null;
    const result = phone ? revokeUserSanction(admin, phone, sanctionId, body.reason) : { error: '用户不存在', statusCode: 404 };
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_SANCTION_NOT_FOUND');
      return true;
    }
    const after = state.users[phone] ? adminUserSummary(state.users[phone]) : null;
    writeAdminAudit(admin, 'user.sanction.revoke', 'user', phone, before, { ...after, sanction: adminSanctionItem(result.sanction) }, body.reason);
    saveState();
    ok(res, adminSanctionItem(result.sanction));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/sanction-appeals') {
    ok(res, adminSanctionAppeals({
      q: url.searchParams.get('q') || '',
      status: url.searchParams.get('status') || 'open',
    }));
    return true;
  }

  const adminSanctionAppealActionMatch = pathname.match(/^\/admin\/sanction-appeals\/([^/]+)\/(approve|reject|review)$/);
  if (req.method === 'POST' && adminSanctionAppealActionMatch) {
    const appealId = decodeURIComponent(adminSanctionAppealActionMatch[1]);
    const action = adminSanctionAppealActionMatch[2];
    const appeal = findSanctionAppeal(appealId);
    if (!appeal) {
      fail(res, 404, '申诉不存在', false, undefined, 'ADMIN_SANCTION_APPEAL_NOT_FOUND');
      return true;
    }
    const result = handleSanctionAppeal(admin, appeal, action, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_SANCTION_APPEAL_INVALID');
      return true;
    }
    saveState();
    ok(res, adminSanctionAppealItem(result.appeal));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/ai/avatar-jobs') {
    ok(res, adminAvatarJobs());
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/ai/usage') {
    ok(res, adminAiUsage({ days: url.searchParams.get('days') || 14 }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/ai/media') {
    ok(res, adminAiMedia({
      q: url.searchParams.get('q') || '',
      quality: url.searchParams.get('quality') || 'all',
    }, req));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/ai/avatar-feedback') {
    ok(res, adminAvatarFeedback({
      q: url.searchParams.get('q') || '',
      reason: url.searchParams.get('reason') || 'all',
      status: url.searchParams.get('status') || 'all',
    }, req));
    return true;
  }

  const adminAvatarFeedbackReviewMatch = pathname.match(/^\/admin\/ai\/avatar-feedback\/([^/]+)\/review$/);
  if (req.method === 'POST' && adminAvatarFeedbackReviewMatch) {
    const result = reviewAvatarFeedback(admin, decodeURIComponent(adminAvatarFeedbackReviewMatch[1]), body, req);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_AVATAR_FEEDBACK_INVALID');
      return true;
    }
    saveState();
    ok(res, result.item);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/ai/pet-chat/messages') {
    ok(res, adminPetChatMessages({
      flag: url.searchParams.get('flag') || 'all',
      q: url.searchParams.get('q') || '',
    }));
    return true;
  }

  const adminPetChatViewMatch = pathname.match(/^\/admin\/ai\/pet-chat\/messages\/([^/]+)\/view$/);
  if (req.method === 'POST' && adminPetChatViewMatch) {
    const result = adminPetChatDetail(admin, decodeURIComponent(adminPetChatViewMatch[1]), body.reason);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PET_CHAT_VIEW_INVALID');
      return true;
    }
    saveState();
    ok(res, result.detail);
    return true;
  }

  const adminPetChatTagMatch = pathname.match(/^\/admin\/ai\/pet-chat\/messages\/([^/]+)\/tag$/);
  if (req.method === 'POST' && adminPetChatTagMatch) {
    const result = tagPetChatAdminMessage(admin, decodeURIComponent(adminPetChatTagMatch[1]), body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PET_CHAT_TAG_INVALID');
      return true;
    }
    saveState();
    ok(res, result.row || null);
    return true;
  }

  const adminPetChatHideMatch = pathname.match(/^\/admin\/ai\/pet-chat\/messages\/([^/]+)\/hide$/);
  if (req.method === 'POST' && adminPetChatHideMatch) {
    const result = hidePetChatAdminMessage(admin, decodeURIComponent(adminPetChatHideMatch[1]), body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PET_CHAT_HIDE_INVALID');
      return true;
    }
    saveState();
    ok(res, result.row || null);
    return true;
  }

  const adminAvatarActionMatch = pathname.match(/^\/admin\/ai\/avatar-jobs\/([^/]+)\/(refresh|retry|mark-failed|refund-quota)$/);
  if (req.method === 'POST' && adminAvatarActionMatch) {
    const jobId = decodeURIComponent(adminAvatarActionMatch[1]);
    const action = adminAvatarActionMatch[2];
    const job = state.avatarJobs?.[jobId];
    const owner = job?.ownerPhone ? state.users[job.ownerPhone] : null;
    if (!job || !owner) {
      fail(res, 404, 'AI 任务不存在', false, undefined, 'ADMIN_AVATAR_JOB_NOT_FOUND');
      return true;
    }
    const before = { ...job };
    if (action === 'refresh') {
      if (job.provider === 'gpt-image-2' && job.status === 'processing') await refreshGptImage2AvatarJob(req, owner, job).catch((error) => markAvatarRefreshFailure(job, error));
      else if (job.provider === 'ttapi-flux-edits' && job.status === 'processing') await refreshTtapiFluxAvatarJob(job).catch((error) => markAvatarRefreshFailure(job, error));
      else if (job.provider === 'ttapi-midjourney' && job.status === 'processing') await refreshTtapiAvatarJob(job).catch((error) => markAvatarRefreshFailure(job, error));
      else touchAvatarJob(job);
    } else if (action === 'retry') {
      if (!job.mediaId) {
        fail(res, 400, '原始照片缺失，无法重试', false, undefined, 'ADMIN_AVATAR_RETRY_INVALID');
        return true;
      }
      const result = await createAvatarGenerationJob(req, owner, job.mediaId, job.id);
      if (result.error) {
        fail(res, result.statusCode || 400, result.error, Boolean(result.retryable));
        return true;
      }
      writeAdminAudit(admin, 'ai.avatar.retry', 'avatar_job', job.id, before, result.job, body.reason);
      saveState();
      ok(res, result.job);
      return true;
    } else if (action === 'mark-failed') {
      job.status = 'failed';
      job.errorCode = 'ADMIN_MARKED_FAILED';
      job.errorMessage = String(body.reason || '运营后台标记失败').slice(0, 240);
      touchAvatarJob(job);
    } else if (action === 'refund-quota') {
      refundPetAvatarQuota(owner);
      job.adminQuotaRefundedAt = new Date().toISOString();
      touchAvatarJob(job);
    }
    writeAdminAudit(admin, `ai.avatar.${action}`, 'avatar_job', job.id, before, job, body.reason);
    saveState();
    ok(res, job);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/social/posts') {
    ok(res, adminSocialPosts());
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/social/comments') {
    ok(res, adminSocialComments());
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/social/reports') {
    ok(res, adminSocialReports());
    return true;
  }

  const adminPostActionMatch = pathname.match(/^\/admin\/social\/posts\/([^/]+)\/(hide|restore|delete)$/);
  if (req.method === 'POST' && adminPostActionMatch) {
    const postId = decodeURIComponent(adminPostActionMatch[1]);
    const action = adminPostActionMatch[2];
    const post = findSocialMomentById(postId);
    if (!post) {
      fail(res, 404, '动态不存在', false, undefined, 'ADMIN_POST_NOT_FOUND');
      return true;
    }
    const before = { ...post };
    if (action === 'hide') post.status = 'hidden';
    if (action === 'restore') post.status = 'published';
    if (action === 'delete') {
      post.status = 'deleted';
      post.deletedAt = new Date().toISOString();
      state.socialLikes = ensureSocialLikes().filter((like) => like.postId !== postId);
      ensureSocialComments().filter((comment) => comment.postId === postId).forEach((comment) => {
        comment.status = 'deleted';
        comment.deletedAt = comment.deletedAt || new Date().toISOString();
      });
    }
    post.updatedAt = new Date().toISOString();
    post.adminModerationReason = String(body.reason || '').slice(0, 240);
    writeAdminAudit(admin, `social.post.${action}`, 'pet_circle_post', postId, before, post, body.reason);
    saveState();
    ok(res, adminSocialPosts().find((item) => item.id === postId));
    return true;
  }

  const adminCommentActionMatch = pathname.match(/^\/admin\/social\/comments\/([^/]+)\/(hide|restore|delete)$/);
  if (req.method === 'POST' && adminCommentActionMatch) {
    const commentId = decodeURIComponent(adminCommentActionMatch[1]);
    const action = adminCommentActionMatch[2];
    const comment = ensureSocialComments().find((item) => item.id === commentId);
    if (!comment) {
      fail(res, 404, '评论不存在', false, undefined, 'ADMIN_COMMENT_NOT_FOUND');
      return true;
    }
    const before = { ...comment };
    if (action === 'hide') comment.status = 'hidden';
    if (action === 'restore') comment.status = 'published';
    if (action === 'delete') {
      comment.status = 'deleted';
      comment.deletedAt = new Date().toISOString();
    }
    comment.adminModerationReason = String(body.reason || '').slice(0, 240);
    writeAdminAudit(admin, `social.comment.${action}`, 'pet_circle_comment', commentId, before, comment, body.reason);
    saveState();
    ok(res, adminSocialComments().find((item) => item.id === commentId));
    return true;
  }

  const adminReportResolveMatch = pathname.match(/^\/admin\/social\/reports\/([^/]+)\/resolve$/);
  if (req.method === 'POST' && adminReportResolveMatch) {
    const reportId = decodeURIComponent(adminReportResolveMatch[1]);
    const report = ensureSocialReports().find((item) => item.id === reportId);
    if (!report) {
      fail(res, 404, '举报不存在', false, undefined, 'ADMIN_REPORT_NOT_FOUND');
      return true;
    }
    const before = { ...report };
    const nextStatus = String(body.status || 'closed');
    report.status = ['valid', 'invalid', 'closed', 'escalated', 'reviewing'].includes(nextStatus) ? nextStatus : 'closed';
    report.reviewedAt = new Date().toISOString();
    report.reviewedBy = admin.username;
    report.reviewReason = String(body.reason || '').slice(0, 240);
    if (report.status === 'valid') {
      ensureSocialReportEvidenceSnapshot(report);
      ensureReportSanctionSuggestion(admin, report, report.reviewReason);
    }
    notifySocialReportResolution(report, report.status, body.reason);
    writeAdminAudit(admin, 'social.report.resolve', 'social_report', reportId, before, report, body.reason);
    saveState();
    ok(res, adminSocialReports().find((item) => item.id === reportId));
    return true;
  }

  const adminReportSanctionMatch = pathname.match(/^\/admin\/social\/reports\/([^/]+)\/sanction$/);
  if (req.method === 'POST' && adminReportSanctionMatch) {
    const reportId = decodeURIComponent(adminReportSanctionMatch[1]);
    const result = applyReportSanctionSuggestion(admin, reportId, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_REPORT_SANCTION_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/places') {
    ok(res, adminPlaceCatalog());
    return true;
  }

  const adminPlaceMergeMatch = pathname.match(/^\/admin\/places\/([^/]+)\/merge$/);
  if (req.method === 'POST' && adminPlaceMergeMatch) {
    const placeId = decodeURIComponent(adminPlaceMergeMatch[1]);
    const result = mergeAdminPlace(admin, placeId, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PLACE_MERGE_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/places/moderation-templates') {
    ok(res, adminPlaceModerationTemplates());
    return true;
  }

  if (req.method === 'POST' && pathname === '/admin/places/moderation-templates') {
    const result = createPlaceModerationTemplate(admin, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PLACE_TEMPLATE_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  const adminPlaceTemplateDeleteMatch = pathname.match(/^\/admin\/places\/moderation-templates\/([^/]+)\/delete$/);
  if (req.method === 'POST' && adminPlaceTemplateDeleteMatch) {
    const templateId = decodeURIComponent(adminPlaceTemplateDeleteMatch[1]);
    const result = removePlaceModerationTemplate(admin, templateId);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PLACE_TEMPLATE_DELETE_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  const adminPlaceTemplatePatchMatch = pathname.match(/^\/admin\/places\/moderation-templates\/([^/]+)$/);
  if (req.method === 'PATCH' && adminPlaceTemplatePatchMatch) {
    const templateId = decodeURIComponent(adminPlaceTemplatePatchMatch[1]);
    const result = updatePlaceModerationTemplate(admin, templateId, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PLACE_TEMPLATE_UPDATE_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/places/reviews') {
    ok(res, adminPlaceReviews());
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/places/submissions') {
    ok(res, adminPlaceSubmissions());
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/places/contributions') {
    const contributions = adminPlaceContributions();
    ok(res, {
      contributions,
      summary: placeContributionSummary(contributions),
    });
    return true;
  }

  const adminPlaceDetailMatch = pathname.match(/^\/admin\/places\/([^/]+)$/);
  if ((req.method === 'GET' || req.method === 'PATCH') && adminPlaceDetailMatch) {
    const placeId = decodeURIComponent(adminPlaceDetailMatch[1]);
    if (req.method === 'GET') {
      const place = adminPlaceCatalog().places.find((item) => item.id === placeId);
      if (!place) {
        fail(res, 404, '地点不存在', false, undefined, 'ADMIN_PLACE_NOT_FOUND');
        return true;
      }
      ok(res, place);
      return true;
    }
    const result = updateAdminPlace(admin, placeId, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PLACE_UPDATE_INVALID');
      return true;
    }
    saveState();
    ok(res, result.place);
    return true;
  }

  const adminPlaceReviewActionMatch = pathname.match(/^\/admin\/places\/reviews\/([^/]+)\/(approve|reject)$/);
  if (req.method === 'POST' && adminPlaceReviewActionMatch) {
    const reviewId = decodeURIComponent(adminPlaceReviewActionMatch[1]);
    const action = adminPlaceReviewActionMatch[2];
    const found = findPlaceReview(reviewId);
    if (!found) {
      fail(res, 404, '地点点评不存在', false, undefined, 'ADMIN_PLACE_REVIEW_NOT_FOUND');
      return true;
    }
    const before = { ...found.review };
    const moderation = placeModerationReason(body, 'review', action, action === 'approve' ? '地点点评审核通过' : '地点点评审核驳回');
    if (moderation.error) {
      fail(res, moderation.statusCode || 400, moderation.error, false, undefined, 'ADMIN_PLACE_REVIEW_REASON_INVALID');
      return true;
    }
    found.review.status = action === 'approve' ? 'approved' : 'rejected';
    found.review.reviewedAt = new Date().toISOString();
    found.review.reviewedBy = admin.username;
    applyPlaceModerationReason(found.review, moderation);
    notifyPlaceReviewModeration(found.phone, found.review, action, moderation.reason);
    writeAdminAudit(admin, `place.review.${action}`, 'place_review', reviewId, before, found.review, moderation.reason);
    saveState();
    ok(res, adminPlaceReviews().find((item) => item.id === reviewId));
    return true;
  }

  const adminPlaceSubmissionActionMatch = pathname.match(/^\/admin\/places\/submissions\/([^/]+)\/(approve|reject)$/);
  if (req.method === 'POST' && adminPlaceSubmissionActionMatch) {
    const submissionId = decodeURIComponent(adminPlaceSubmissionActionMatch[1]);
    const action = adminPlaceSubmissionActionMatch[2];
    const found = findPlaceSubmission(submissionId);
    if (!found) {
      fail(res, 404, '新增地点提交不存在', false, undefined, 'ADMIN_PLACE_SUBMISSION_NOT_FOUND');
      return true;
    }
    const before = { ...found.submission };
    const moderation = placeModerationReason(body, 'submission', action, action === 'approve' ? '新增地点审核通过' : '新增地点审核驳回');
    if (moderation.error) {
      fail(res, moderation.statusCode || 400, moderation.error, false, undefined, 'ADMIN_PLACE_SUBMISSION_REASON_INVALID');
      return true;
    }
    found.submission.status = action === 'approve' ? 'approved' : 'rejected';
    found.submission.reviewedAt = new Date().toISOString();
    found.submission.reviewedBy = admin.username;
    applyPlaceModerationReason(found.submission, moderation);
    if (action === 'approve' && !found.submission.approvedPlaceId) {
      const place = ensureManualPlaceForSubmission(found.submission, found.phone);
      if (place) recordPlaceContribution(admin, found.phone, found.submission, place, 'created', moderation.reason);
    }
    notifyPlaceSubmissionModeration(found.phone, found.submission, action, moderation.reason);
    writeAdminAudit(admin, `place.submission.${action}`, 'place_submission', submissionId, before, found.submission, moderation.reason);
    saveState();
    ok(res, adminPlaceSubmissions().find((item) => item.id === submissionId));
    return true;
  }

  const adminPlaceSubmissionLinkMatch = pathname.match(/^\/admin\/places\/submissions\/([^/]+)\/link-existing$/);
  if (req.method === 'POST' && adminPlaceSubmissionLinkMatch) {
    const submissionId = decodeURIComponent(adminPlaceSubmissionLinkMatch[1]);
    const result = linkPlaceSubmissionToExisting(admin, submissionId, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'ADMIN_PLACE_SUBMISSION_LINK_INVALID');
      return true;
    }
    saveState();
    ok(res, result);
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/feedback') {
    ok(res, {
      items: adminFeedbackItems({
        category: url.searchParams.get('category') || 'all',
        q: url.searchParams.get('q') || '',
        status: url.searchParams.get('status') || 'open',
      }),
      summary: adminFeedbackSummary(),
    });
    return true;
  }

  const adminFeedbackMatch = pathname.match(/^\/admin\/feedback\/([^/]+)$/);
  if (req.method === 'PATCH' && adminFeedbackMatch) {
    const feedbackId = decodeURIComponent(adminFeedbackMatch[1]);
    const feedback = (state.feedback || []).find((item) => item.id === feedbackId);
    if (!feedback) {
      fail(res, 404, '反馈不存在', false, undefined, 'ADMIN_FEEDBACK_NOT_FOUND');
      return true;
    }
    const before = { ...feedback };
    const status = String(body.status || feedback.status);
    feedback.status = ['received', 'reviewing', 'closed'].includes(status) ? status : feedback.status;
    feedback.handledAt = new Date().toISOString();
    feedback.handledBy = admin.username;
    const ticket = findSupportTicket(feedback.supportTicketId || `ticket-${feedback.id}`);
    if (ticket) {
      ticket.status = supportTicketStatusFor(feedback.status);
      ticket.updatedAt = feedback.handledAt;
      ticket.assignee = ticket.assignee || admin.username;
      ticket.priority = ticket.priority || supportTicketPriorityFor(feedback);
      syncFeedbackFromTicket(ticket);
    }
    writeAdminAudit(admin, 'feedback.update', 'feedback', feedbackId, before, feedback, body.reason);
    saveState();
    ok(res, adminFeedbackItems().find((item) => item.id === feedbackId));
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/config') {
    ok(res, adminOpsConfigResponse());
    return true;
  }

  if (req.method === 'PATCH' && pathname === '/admin/config') {
    const before = currentOpsConfig();
    const next = buildOpsConfigPatch(before, body);
    state.opsConfig = next;
    const revision = recordOpsConfigRevision(admin, next, body.reason || '配置中心保存', 'publish', '', before);
    writeAdminAudit(admin, 'config.update', 'ops_config', 'app', before, { ...next, revisionId: revision.id }, body.reason);
    saveState();
    ok(res, adminOpsConfigResponse());
    return true;
  }

  if (req.method === 'POST' && pathname === '/admin/config/drafts') {
    const draft = createOpsConfigDraft(admin, body);
    writeAdminAudit(admin, 'config.draft.create', 'ops_config_draft', draft.id, null, {
      changeSummary: draft.changeSummary,
      reason: draft.reason,
      riskChanges: draft.riskChanges,
      summary: draft.summary,
    }, body.reason);
    saveState();
    ok(res, { ...adminOpsConfigResponse(), draft });
    return true;
  }

  const adminConfigDraftMatch = pathname.match(/^\/admin\/config\/drafts\/([^/]+)\/(publish|discard)$/);
  if (req.method === 'POST' && adminConfigDraftMatch) {
    const draftId = decodeURIComponent(adminConfigDraftMatch[1]);
    const action = adminConfigDraftMatch[2];
    const draft = ensureOpsConfigDrafts().find((item) => item.id === draftId);
    if (!draft) {
      fail(res, 404, '配置草稿不存在', false, undefined, 'ADMIN_CONFIG_DRAFT_NOT_FOUND');
      return true;
    }
    if (draft.status !== 'draft') {
      fail(res, 409, '配置草稿已经处理，不能重复操作', false, { status: draft.status }, 'ADMIN_CONFIG_DRAFT_ALREADY_HANDLED');
      return true;
    }
    const beforeDraft = cloneJson(draft);
    const now = new Date().toISOString();
    if (action === 'discard') {
      draft.status = 'discarded';
      draft.discardedAt = now;
      draft.discardedBy = admin.username;
      draft.updatedAt = now;
      writeAdminAudit(admin, 'config.draft.discard', 'ops_config_draft', draft.id, beforeDraft, draft, body.reason);
      saveState();
      ok(res, { ...adminOpsConfigResponse(), draft });
      return true;
    }
    const before = currentOpsConfig();
    const next = normalizeOpsConfig({ ...cloneJson(draft.config), updatedAt: now });
    state.opsConfig = next;
    const revision = recordOpsConfigRevision(admin, next, body.reason || draft.reason || `发布配置草稿 ${draft.id}`, 'draft_publish', draft.id, before);
    draft.status = 'published';
    draft.publishedAt = now;
    draft.publishedBy = admin.username;
    draft.revisionId = revision.id;
    draft.updatedAt = now;
    writeAdminAudit(admin, 'config.draft.publish', 'ops_config_draft', draft.id, beforeDraft, { ...draft, revisionId: revision.id }, body.reason);
    saveState();
    ok(res, { ...adminOpsConfigResponse(), draft, revision });
    return true;
  }

  const adminConfigRollbackMatch = pathname.match(/^\/admin\/config\/revisions\/([^/]+)\/rollback$/);
  if (req.method === 'POST' && adminConfigRollbackMatch) {
    const revisionId = decodeURIComponent(adminConfigRollbackMatch[1]);
    const revision = ensureOpsConfigRevisions().find((item) => item.id === revisionId);
    if (!revision) {
      fail(res, 404, '配置版本不存在', false, undefined, 'ADMIN_CONFIG_REVISION_NOT_FOUND');
      return true;
    }
    const before = currentOpsConfig();
    const next = normalizeOpsConfig({
      ...cloneJson(revision.config),
      updatedAt: new Date().toISOString(),
    });
    state.opsConfig = next;
    const rollbackRevision = recordOpsConfigRevision(admin, next, body.reason || `回滚到 ${revisionId}`, 'rollback', revisionId, before);
    writeAdminAudit(admin, 'config.rollback', 'ops_config', revisionId, before, { ...next, revisionId: rollbackRevision.id, sourceRevisionId: revisionId }, body.reason);
    saveState();
    ok(res, { ...adminOpsConfigResponse(), rolledBackFrom: revisionId });
    return true;
  }

  if (req.method === 'GET' && pathname === '/admin/audit-logs') {
    ok(res, adminAuditLogs({
      action: url.searchParams.get('action') || 'all',
      admin: url.searchParams.get('admin') || 'all',
      from: url.searchParams.get('from') || '',
      limit: url.searchParams.get('limit') || 300,
      q: url.searchParams.get('q') || '',
      targetType: url.searchParams.get('targetType') || 'all',
      to: url.searchParams.get('to') || '',
    }));
    return true;
  }

  fail(res, 404, `未找到后台接口 ${req.method} ${pathname}`, false, undefined, 'ADMIN_ROUTE_NOT_FOUND');
  return true;
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

  if (req.method === 'GET' && pathname === '/app/config') {
    ok(res, publicAppConfig());
    return;
  }

  if (serveAdminStatic(req, res, pathname)) {
    return;
  }

  if (pathname.startsWith('/admin/')) {
    await handleAdminRequest(req, res, pathname, url, body);
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
    if (isMediaUploadBlockedFromPublic(media)) {
      fail(res, 404, 'Media file not found', false);
      return;
    }
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
    const media = mediaUploadForObjectKey(objectKey);
    if (isMediaUploadBlockedFromPublic(media)) {
      fail(res, 404, 'Storage object not found', false);
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
  if (failIfAccountRestricted(user, req, pathname, res)) return;
  if (failIfMaintenanceWriteBlocked(req, pathname, res)) return;

  if (req.method === 'POST' && pathname === '/analytics/events') {
    const result = recordAppEvent(req, user, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'APP_EVENT_INVALID');
      return;
    }
    if (result.accepted) saveState();
    ok(res, result);
    return;
  }

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

  if (req.method === 'GET' && pathname === '/sanction-appeals') {
    ok(res, sanctionAppealsForUser(user));
    return;
  }

  if (req.method === 'POST' && pathname === '/sanction-appeals') {
    const result = createSanctionAppeal(user, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'SANCTION_APPEAL_INVALID');
      return;
    }
    saveState();
    ok(res, {
      ...publicSanctionAppealItem(result.appeal),
      duplicate: Boolean(result.duplicate),
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/support/tickets') {
    ok(res, supportTicketsForUser(user));
    return;
  }

  const userSupportTicketMatch = pathname.match(/^\/support\/tickets\/([^/]+)$/);
  if (req.method === 'GET' && userSupportTicketMatch) {
    const ticketId = decodeURIComponent(userSupportTicketMatch[1]);
    const ticket = findSupportTicket(ticketId);
    if (!ticket || ticket.phone !== user.phone) {
      fail(res, 404, '工单不存在', false, undefined, 'SUPPORT_TICKET_NOT_FOUND');
      return;
    }
    ok(res, supportTicketPublicDetail(ticket));
    return;
  }

  const userSupportTicketReplyMatch = pathname.match(/^\/support\/tickets\/([^/]+)\/reply$/);
  if (req.method === 'POST' && userSupportTicketReplyMatch) {
    const ticketId = decodeURIComponent(userSupportTicketReplyMatch[1]);
    const ticket = findSupportTicket(ticketId);
    if (!ticket || ticket.phone !== user.phone) {
      fail(res, 404, '工单不存在', false, undefined, 'SUPPORT_TICKET_NOT_FOUND');
      return;
    }
    const result = await addUserSupportTicketReply(req, user, ticket, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'SUPPORT_TICKET_REPLY_INVALID');
      return;
    }
    saveState();
    ok(res, supportTicketPublicDetail(ticket));
    return;
  }

  const userSupportTicketRateMatch = pathname.match(/^\/support\/tickets\/([^/]+)\/rate$/);
  if (req.method === 'POST' && userSupportTicketRateMatch) {
    const ticketId = decodeURIComponent(userSupportTicketRateMatch[1]);
    const ticket = findSupportTicket(ticketId);
    if (!ticket || ticket.phone !== user.phone) {
      fail(res, 404, '工单不存在', false, undefined, 'SUPPORT_TICKET_NOT_FOUND');
      return;
    }
    const result = rateSupportTicket(user, ticket, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'SUPPORT_TICKET_RATE_INVALID');
      return;
    }
    saveState();
    ok(res, supportTicketPublicDetail(ticket));
    return;
  }

  const userSupportTicketReopenMatch = pathname.match(/^\/support\/tickets\/([^/]+)\/reopen$/);
  if (req.method === 'POST' && userSupportTicketReopenMatch) {
    const ticketId = decodeURIComponent(userSupportTicketReopenMatch[1]);
    const ticket = findSupportTicket(ticketId);
    if (!ticket || ticket.phone !== user.phone) {
      fail(res, 404, '工单不存在', false, undefined, 'SUPPORT_TICKET_NOT_FOUND');
      return;
    }
    const result = await reopenSupportTicket(req, user, ticket, body);
    if (result.error) {
      fail(res, result.statusCode || 400, result.error, false, undefined, 'SUPPORT_TICKET_REOPEN_INVALID');
      return;
    }
    saveState();
    ok(res, supportTicketPublicDetail(ticket));
    return;
  }

  if (req.method === 'POST' && pathname === '/feedback') {
    const result = await createFeedbackSubmission(req, user, body);
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
    const profileModeration = await moderatePetProfileTextForPublicUse(petInput.patch, user, pet.id);
    if (profileModeration.action && profileModeration.action !== 'allow') {
      fail(
        res,
        profileModeration.statusCode || 400,
        profileModeration.error,
        profileModeration.action === 'review',
        profileModeration,
        profileModeration.action === 'block' ? 'PROFILE_CONTENT_BLOCKED' : 'PROFILE_CONTENT_REVIEW',
      );
      return;
    }
    if (body.avatarBase64) {
      const avatarParsedUpload = parseBase64Upload(body.avatarBase64, body.avatarMimeType);
      const avatarFileContent = String(avatarParsedUpload.dataUrl || '').match(/^data:[^;]+;base64,(.+)$/)?.[1] || '';
      if (avatarFileContent) {
        const safety = await moderateImageFileContentForPublicUse(avatarFileContent, user.phone, 'pet_avatar', pet.id);
        if (safety.action !== 'allow') {
          fail(res, safety.action === 'block' ? 400 : 409, safety.error, safety.action === 'review', safety.result, safety.action === 'block' ? 'IMAGE_CONTENT_BLOCKED' : 'IMAGE_CONTENT_REVIEW');
          return;
        }
      }
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
    const profileModeration = await moderatePetProfileTextForPublicUse(petPatch.patch || {}, user, pet.id);
    if (profileModeration.action && profileModeration.action !== 'allow') {
      fail(
        res,
        profileModeration.statusCode || 400,
        profileModeration.error,
        profileModeration.action === 'review',
        profileModeration,
        profileModeration.action === 'block' ? 'PROFILE_CONTENT_BLOCKED' : 'PROFILE_CONTENT_REVIEW',
      );
      return;
    }
    if (body.avatarBase64) {
      const avatarParsedUpload = parseBase64Upload(body.avatarBase64, body.avatarMimeType);
      const avatarFileContent = String(avatarParsedUpload.dataUrl || '').match(/^data:[^;]+;base64,(.+)$/)?.[1] || '';
      if (avatarFileContent) {
        const safety = await moderateImageFileContentForPublicUse(avatarFileContent, user.phone, 'pet_avatar', pet.id);
        if (safety.action !== 'allow') {
          fail(res, safety.action === 'block' ? 400 : 409, safety.error, safety.action === 'review', safety.result, safety.action === 'block' ? 'IMAGE_CONTENT_BLOCKED' : 'IMAGE_CONTENT_REVIEW');
          return;
        }
      }
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
    const uploadSource = body.source || 'mvp_sample';
    const uploadScope = imageModerationScopeForUploadSource(uploadSource);
    if (uploadScope === 'pet_circle_photo' && failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
    else if ((uploadScope === 'place_review' || uploadScope === 'place_submission') && failIfFeatureDisabled(res, 'places', '地图地点')) return;
    else if (uploadScope === 'pet_avatar' && failIfFeatureDisabled(res, 'aiAvatar', 'AI 灵伴形象')) return;
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
    const uploadMedia = {
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
      source: uploadSource,
    };
    const uploadFileContent = String(dataUrl || '').match(/^data:[^;]+;base64,(.+)$/)?.[1] || '';
    const imageModeration = await evaluateTencentImageModeration(uploadMedia, {
      fileContent: uploadFileContent,
      scope: uploadScope,
      targetId: mediaId,
    });
    const moderationStatus = mediaModerationStatusFromEvaluation(imageModeration);
    uploadMedia.contentSafety = contentSafetySnapshot(imageModeration);
    uploadMedia.moderationReason = mediaModerationReasonFromEvaluation(imageModeration);
    uploadMedia.moderationStatus = moderationStatus;
    if (imageModeration?.action && imageModeration.action !== 'allow') {
      uploadMedia.moderatedAt = new Date().toISOString();
      uploadMedia.moderatedBy = imageModeration.sourceLabel || 'machine';
      recordModerationSample({ ...imageModeration, contentText: String(body.fileName || mediaId), ownerPhone: user.phone, scope: uploadScope, targetId: mediaId });
    } else if (imageModeration?.action === 'allow') {
      maybeRecordModerationQualitySample({ contentText: String(body.fileName || mediaId), ownerPhone: user.phone, scope: uploadScope, targetId: mediaId });
    }
    state.mediaUploads[mediaId] = uploadMedia;
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
    if (failIfFeatureDisabled(res, 'aiAvatar', 'AI 灵伴形象')) return;
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
      if (failIfFeatureDisabled(res, 'aiAvatar', 'AI 灵伴形象')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
    if (failIfMuted(user, res, '更换宠友圈封面')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
    if (failIfMuted(user, res, '发布小事')) return;
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
    const created = await createSocialMoment(user, body);
    if (created.error) {
      saveState();
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
    if (req.method === 'POST' && failIfMuted(user, res, '点赞互动')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
    if (failIfMuted(user, res, '发表评论')) return;
    const postId = decodeURIComponent(petCircleCommentsMatch[1]);
    const result = await createPetCircleComment(postId, user, body);
    if (result.error) {
      saveState();
      fail(res, result.statusCode || 400, result.error, false, undefined, 'PET_CIRCLE_COMMENT_INVALID');
      return;
    }
    saveState();
    ok(res, listPetCircleComments(postId, user));
    return;
  }

  const petCircleCommentMatch = pathname.match(/^\/social\/pet-circle\/comments\/([^/]+)$/);
  if (req.method === 'DELETE' && petCircleCommentMatch) {
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
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
    if (failIfFeatureDisabled(res, 'petCircle', '宠友圈')) return;
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
    if (failIfMuted(user, res, '打招呼')) return;
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
    if (failIfFeatureDisabled(res, 'walkInvite', '约遛邀请')) return;
    if (failIfMuted(user, res, '发起约遛')) return;
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
    if (failIfMuted(user, res, '发送消息')) return;
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
    processDueSystemNotifications();
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
    if (failIfFeatureDisabled(res, 'petChat', 'AI 宠物对话')) return;
    ok(res, visiblePetChatMessagesFor(user));
    return;
  }

  const petChatFeedbackMatch = pathname.match(/^\/ai\/pet-chat\/messages\/([^/]+)\/feedback$/);
  if (req.method === 'POST' && petChatFeedbackMatch) {
    if (failIfFeatureDisabled(res, 'petChat', 'AI 宠物对话')) return;
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
    if (failIfFeatureDisabled(res, 'petChat', 'AI 宠物对话')) return;
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
      fail(res, 429, `今天和灵伴聊天次数已达上限（${effectivePetChatDailyLimit()} 次），明天再继续吧`, true);
      return;
    }
    const messages = petChatMessagesFor(user);
    const visibleMessages = visiblePetChatMessagesFor(user);
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
    const reply = await callDeepSeekPetChat(user, text, visibleMessages);
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
    if (failIfFeatureDisabled(res, 'places', '地图地点')) return;
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
    if (failIfFeatureDisabled(res, 'places', '地图地点')) return;
    ok(res, favoritePlaceIdsFor(user));
    return;
  }

  const placeFavoriteMatch = pathname.match(/^\/places\/([^/]+)\/favorite$/);
  if (req.method === 'PATCH' && placeFavoriteMatch) {
    if (failIfFeatureDisabled(res, 'places', '地图地点')) return;
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
    if (failIfFeatureDisabled(res, 'places', '地图地点')) return;
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
    if (failIfFeatureDisabled(res, 'places', '地图地点')) return;
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
    if (failIfFeatureDisabled(res, 'places', '地图地点')) return;
    ok(res, placeReviewsFor(user));
    return;
  }

  if (req.method === 'GET' && pathname === '/places/submissions/my') {
    if (failIfFeatureDisabled(res, 'places', '地图地点')) return;
    ok(res, placeSubmissionsFor(user));
    return;
  }

  if (req.method === 'POST' && pathname === '/places/submissions') {
    if (failIfFeatureDisabled(res, 'places', '地图地点')) return;
    if (failIfMuted(user, res, '提交地点')) return;
    const result = await createPlaceSubmission(user, body);
    if (result.error) {
      saveState();
      fail(res, result.statusCode || 400, result.error, false);
      return;
    }
    saveState();
    ok(res, result.submission);
    return;
  }

  const reviewMatch = pathname.match(/^\/places\/([^/]+)\/reviews$/);
  if (req.method === 'POST' && reviewMatch) {
    if (failIfFeatureDisabled(res, 'places', '地图地点')) return;
    if (failIfMuted(user, res, '发布地点点评')) return;
    const placeId = decodeURIComponent(reviewMatch[1]);
    const review = await createPlaceReview(user, placeId, body);
    if (review === null) {
      fail(res, 404, '地点不存在', false);
      return;
    }
    if (review === false) {
      fail(res, 400, '请填写点评内容', false);
      return;
    }
    if (review.error) {
      saveState();
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

const notificationScheduler = setInterval(() => {
  try {
    processDueSystemNotifications();
  } catch (error) {
    console.error('Failed to process scheduled notifications', error);
  }
}, 60 * 1000);
if (typeof notificationScheduler.unref === 'function') notificationScheduler.unref();
