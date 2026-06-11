const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const TEST_CODE = '962464';
const SMS_COOLDOWN_MS = 60 * 1000;
const SMS_TTL_MS = 5 * 60 * 1000;
const ONLINE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_DISCOVER_RADIUS_KM = 3;
const MAX_ACCURACY_BUFFER_KM = 2;
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_THINKING = process.env.DEEPSEEK_THINKING || 'disabled';
const PET_CHAT_HISTORY_LIMIT = Number(process.env.PET_CHAT_HISTORY_LIMIT || '10');
const PET_CHAT_MAX_TOKENS = Number(process.env.PET_CHAT_MAX_TOKENS || '420');
const PET_CHAT_MAX_INPUT_CHARS = Number(process.env.PET_CHAT_MAX_INPUT_CHARS || '600');
const PET_CHAT_DAILY_LIMIT = Number(process.env.PET_CHAT_DAILY_LIMIT || '80');
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
    greetings: [],
    health: {
      memos: {},
      vaccineReminders: {},
      vaccines: {},
      weights: {},
    },
    invites: [],
    notifications: {},
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
    places: defaultPlaces,
    sms: {},
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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(body);
}

function ok(res, data) {
  sendJson(res, 200, { data, state: 'success' });
}

function fail(res, statusCode, message, retryable = false, data) {
  sendJson(res, statusCode, { data, error: { message, retryable }, state: 'error' });
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

function phoneFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token.startsWith('lumii-local-')) return '';
  return token.slice('lumii-local-'.length);
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
    permissions,
    permissionsOnboardingCompleted: Boolean(user.permissionsOnboardingCompleted || allPermissionsGranted(permissions)),
    settings: normalizeUserSettings(user.settings),
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
  user.lastSeenAt = Date.now();
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

function ensureHealthReminderNotifications(user) {
  const reminderIds = new Set(vaccineReminderIdsFor(user));
  if (!reminderIds.size) return;
  const vaccines = healthList('vaccines', user, defaultVaccinesFor);
  vaccines
    .filter((vaccine) => vaccine.status !== 'done' && reminderIds.has(vaccine.id))
    .filter((vaccine) => {
      const days = daysUntilDate(vaccine.dueAt);
      return days !== null && days <= 7;
    })
    .forEach((vaccine) => {
      addNotification(user.phone, {
        id: healthReminderNotificationId(user, vaccine),
        read: false,
        text: `${vaccine.name}：${vaccineReminderCopy(vaccine)}，记得按宠物医院建议确认时间。`,
        title: '健康提醒',
      });
    });
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

function fallbackPetChatReply(user, text) {
  const pet = selectedPetFor(user) || activePetFor(user);
  const petName = pet?.name || '灵伴';
  const lower = text.toLowerCase();
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

async function callDeepSeekPetChat(user, text, history) {
  if (!DEEPSEEK_API_KEY) return { source: 'fallback', text: fallbackPetChatReply(user, text) };
  const messages = [
    { role: 'system', content: petChatBaseSystemPrompt() },
    { role: 'system', content: buildPetChatContextPrompt(user) },
    ...history
      .slice(-PET_CHAT_HISTORY_LIMIT)
      .filter((message) => message.author === 'me' || message.author === 'ai')
      .map((message) => ({
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
  return {
    id: conversationIdFor(otherUser.phone),
    imageUrl: otherPet.avatarUrl,
    lastMessage,
    name: `${otherUser.ownerName || `用户${suffix}`}和${otherPet.name || `灵伴${suffix}`}`,
    ownerId: `user-${otherUser.phone}`,
    petName: otherPet.name || `灵伴${suffix}`,
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

function addNotification(phone, notification) {
  state.notifications[phone] = state.notifications[phone] || [];
  if (state.notifications[phone].some((item) => item.id === notification.id)) return;
  state.notifications[phone].unshift(notification);
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

  if (req.method === 'POST' && pathname === '/auth/sms/send') {
    const phone = normalizePhone(body.phone);
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
    const ticket = {
      availableAt: now + SMS_COOLDOWN_MS,
      code: TEST_CODE,
      expiresAt: now + SMS_TTL_MS,
      phone,
    };
    state.sms[phone] = ticket;
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
    if (code !== TEST_CODE && ticket?.code !== code) {
      fail(res, 400, '验证码错误，请检查后重试', true);
      return;
    }
    if (ticket && Date.now() > ticket.expiresAt) {
      fail(res, 400, '验证码已过期，请重新获取', true);
      return;
    }
    const user = ensureUser(phone);
    user.lastSeenAt = Date.now();
    saveState();
    ok(res, { account: buildAccountSnapshot(user), phone, token: `lumii-local-${phone}` });
    return;
  }

  if (req.method === 'POST' && pathname === '/auth/logout') {
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
    saveState();
    ok(res, user.settings);
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
    ok(res, {
      analysis,
      mediaId,
      previewUrl: body.previewUrl || samplePhotoUrl,
      quality: analysis.status === 'blocked' ? 'blocked' : analysis.status === 'warning' ? 'warning' : 'good',
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/ai/pet-avatar/jobs') {
    if (!canUsePetAvatarGeneration(user)) {
      fail(res, 429, '今日灵伴形象生成次数已用完，请明天再试', true);
      return;
    }
    const mediaId = String(body.mediaId || '');
    const media = state.mediaUploads?.[mediaId];
    if (mediaId && !media) {
      fail(res, 404, '上传照片已失效，请重新上传', true);
      return;
    }
    if (media?.analysis && !media.analysis.canGenerate) {
      fail(res, 400, media.analysis.message || '当前照片不适合生成灵伴形象，请重新上传', false, media.analysis);
      return;
    }
    const id = `job-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const job = createMockAvatarJob(id);
    job.mediaId = mediaId;
    job.ownerPhone = user.phone;
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
    saveState();
    ok(res, job);
    return;
  }

  const avatarJobMatch = pathname.match(/^\/ai\/pet-avatar\/jobs\/([^/]+)$/);
  if (req.method === 'GET' && avatarJobMatch) {
    const id = decodeURIComponent(avatarJobMatch[1]);
    const job = state.avatarJobs[id];
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

  if (req.method === 'GET' && pathname === '/health/weights') {
    ok(res, healthList('weights', user, defaultWeightRecordsFor));
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
    const pet = selectedPetFor(user);
    if (pet) pet.weightKg = kg;
    saveState();
    ok(res, record);
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
    if (status === 'done') setVaccineReminderFor(user, id, false);
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
    if (body.enabled) ensureHealthReminderNotifications(user);
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

  if (req.method === 'GET' && pathname === '/social/discover') {
    user.lastSeenAt = Date.now();
    const location = locationFromQuery(url);
    if (location) user.location = location;
    saveState();
    ok(res, listOnlineOwners(user, location?.radiusKm || user.location?.radiusKm || DEFAULT_DISCOVER_RADIUS_KM));
    return;
  }

  if (req.method === 'GET' && pathname === '/social/greeting-requests') {
    ok(res, listGreetingRequestsFor(user));
    return;
  }

  if (req.method === 'POST' && pathname === '/social/greetings') {
    const ownerId = String(body.ownerId || '');
    const targetPhone = resolveOwnerId(ownerId);
    const fromPet = activePetFor(user);
    const lastMessage = `${fromPet.name}想认识你`;
    let senderConversation = null;
    if (targetPhone && state.users[targetPhone]) {
      const targetUser = ensureUser(targetPhone);
      const targetPet = activePetFor(targetUser);
      const existing = pendingGreetingFor(user.phone, targetPhone);
      const shouldCreateGreetingMessages = !existing;
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
      senderConversation = buildConversationFor(user, targetUser, '我想认识你和你的毛孩子', 0);
      const targetConversation = buildConversationFor(targetUser, user, lastMessage, 1);
      upsertConversation(user.phone, senderConversation);
      upsertConversation(targetPhone, targetConversation);
      if (shouldCreateGreetingMessages) {
        appendConversationMessage(user.phone, senderConversation.id, {
          author: 'me',
          id: messageId(),
          status: 'sent',
          text: '我想认识你和你的毛孩子',
          time: '刚刚',
        });
        appendConversationMessage(targetPhone, targetConversation.id, {
          author: 'other',
          id: messageId(),
          status: 'sent',
          text: lastMessage,
          time: '刚刚',
        });
        addNotification(targetPhone, {
          id: `n-greeting-${Date.now()}`,
          read: false,
          text: `${user.ownerName}和${fromPet.name}向你和${targetPet.name}打了招呼`,
          title: '新的招呼',
        });
      }
    }
    saveState();
    ok(res, { conversation: senderConversation, ownerId, sent: true });
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
    });
    saveState();
    ok(res, { conversation: myConversation, ownerId, sent: true });
    return;
  }

  if (req.method === 'POST' && pathname === '/social/walk-invites') {
    const ownerId = String(body.ownerId || '');
    const targetPhone = resolveOwnerId(ownerId);
    const inviteId = `walk-${Date.now()}`;
    const place = String(body.place || '附近宠物友好地点');
    const time = String(body.time || '今天');
    const note = String(body.note || '');
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
    if (targetPhone && state.users[targetPhone]) {
      const targetUser = ensureUser(targetPhone);
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
      });
    }
    saveState();
    ok(res, { conversation: senderConversation, inviteId, ownerId });
    return;
  }

  if (req.method === 'GET' && pathname === '/conversations') {
    ok(res, state.conversations[user.phone] || []);
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
    if (text.length > PET_CHAT_MAX_INPUT_CHARS) {
      fail(res, 400, `消息太长了，请控制在 ${PET_CHAT_MAX_INPUT_CHARS} 字以内`, false);
      return;
    }
    const targetPhone = conversationId.startsWith('c-') ? conversationId.slice(2) : '';
    const myMessage = {
      author: 'me',
      id: messageId(),
      status: 'sent',
      text,
      time: '刚刚',
    };
    appendConversationMessage(user.phone, conversationId, myMessage);

    if (targetPhone && state.users[targetPhone]) {
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
    }

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

  if (req.method === 'GET' && pathname === '/ai/pet-chat/messages') {
    ok(res, petChatMessagesFor(user));
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
    const reply = await callDeepSeekPetChat(user, text, messages);
    const aiMessage = {
      author: 'ai',
      id: messageId(),
      status: 'sent',
      text: reply.text,
      time: '刚刚',
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
    ok(
      res,
      query
        ? state.places.filter((place) => place.name.includes(query) || place.tags.some((tag) => tag.includes(query)))
        : state.places,
    );
    return;
  }

  const reviewMatch = pathname.match(/^\/places\/([^/]+)\/reviews$/);
  if (req.method === 'POST' && reviewMatch) {
    ok(res, { placeId: decodeURIComponent(reviewMatch[1]), status: 'pending_review' });
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
