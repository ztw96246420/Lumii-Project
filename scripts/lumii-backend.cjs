const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const TEST_CODE = '962464';
const SMS_COOLDOWN_MS = 60 * 1000;
const SMS_TTL_MS = 5 * 60 * 1000;
const ONLINE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_DISCOVER_RADIUS_KM = 3;
const MAX_ACCURACY_BUFFER_KM = 2;

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

function createInitialState() {
  return {
    avatarJobs: {},
    conversations: {},
    conversationMessages: {},
    greetings: [],
    health: {
      memos: {},
      vaccines: {},
      weights: {},
    },
    invites: [],
    notifications: {},
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
      permissions: defaultPermissionState(),
      permissionsOnboardingCompleted: false,
      pets: [],
      phone,
      settings: {
        nearbyVisible: true,
      },
    };
  }
  state.users[phone].permissions = normalizePermissionState(state.users[phone].permissions);
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
  };
}

function requireUser(req, res) {
  const phone = phoneFromRequest(req);
  if (!phone) {
    fail(res, 401, '请先登录后再操作', true);
    return null;
  }
  const user = ensureUser(phone);
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
  state.notifications[phone].unshift(notification);
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
    ok(res, {
      mediaId: `media-${Date.now()}`,
      previewUrl: body.previewUrl || samplePhotoUrl,
      quality: 'good',
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/ai/pet-avatar/jobs') {
    const id = `job-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    state.avatarJobs[id] = {
      createdAt: Date.now(),
      id,
      progress: 24,
      resultUrl: undefined,
      status: 'processing',
    };
    saveState();
    ok(res, state.avatarJobs[id]);
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
    job.progress = Math.min(100, Number(job.progress || 24) + 38);
    if (job.progress >= 100) {
      job.status = 'ready';
      job.resultUrl = generatedAvatarUrl;
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
    saveState();
    ok(res, vaccines[index]);
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
    ok(res, state.notifications[user.phone] || []);
    return;
  }

  if (req.method === 'POST' && pathname === '/ai/pet-chat/messages') {
    ok(res, {
      author: 'me',
      id: `msg-${Date.now()}`,
      status: 'sent',
      text: String(body.text || ''),
      time: '刚刚',
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/places/nearby') {
    ok(res, state.places);
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
