import { extractMainlandChinaPhone } from '../services/sms';
import { getLumiiInstallationId } from '../services/installationId';
import type {
  AccountSnapshot,
  AccountDeletionConfirmResult,
  AccountDeletionRequestResult,
  ApiResult,
  AppAnalyticsEventInput,
  AppRemoteConfig,
  AiUsageSummary,
  AvatarAnimationJob,
  AvatarGenerationFeedbackReason,
  AuthSession,
  AvatarJob,
  ChatMessage,
  Conversation,
  ConversationMessage,
  CreatePetInput,
  CreateVaccinePlanInput,
  FeedbackCategory,
  FeedbackSubmission,
  GreetingOptions,
  GreetingResult,
  HealthCalendarEvent,
  HealthMemo,
  HealthSummary,
  LegalDocument,
  NearbyLocationHint,
  NearbyMoment,
  NearbyOwner,
  PetCircleComment,
  PetCircleProfile,
  PetCircleProfilePostList,
  PetCirclePostList,
  PetCircleReportResult,
  NotificationCategory,
  NotificationItem,
  NotificationKind,
  OwnerProfilePatch,
  PetChatFeedbackRating,
  PetProfile,
  PetProfilePatch,
  PetTaxonomy,
  Place,
  PlaceReview,
  PlaceSubmission,
  PermissionStateMap,
  PushDevice,
  ReportAppealTarget,
  SanctionAppealItem,
  SanctionAppealList,
  SocialBlockListItem,
  SocialBlockOptions,
  SocialBlockResult,
  SmsCodeTicket,
  SupportTicketAttachmentDraft,
  SupportTicketDetail,
  SupportTicketItem,
  SupportTicketList,
  SupportTicketMessage,
  SupportTicketSummary,
  UploadPetMediaInput,
  UploadedPetMedia,
  UserSettings,
  UserProfile,
  VaccinePlan,
  WalkInviteInput,
  WalkInviteResult,
  WeightRecord,
  WeightTrend,
} from './types';

const wait = (ms = 360) => new Promise((resolve) => setTimeout(resolve, ms));

const lastSmsSentAtByPhone: Record<string, number> = {};
const smsCodeByPhone: Record<string, string> = {};
const smsLockedByPhone: Record<string, boolean> = {};
const smsVerifyAttemptsByPhone: Record<string, number> = {};
const smsDeviceDailyUsageById: Record<string, { count: number; day: string }> = {};
const smsDailyUsageByPhone: Record<string, { count: number; day: string }> = {};
const SMS_COOLDOWN_MS = 60 * 1000;
const SMS_DAILY_LIMIT = 50;
const SMS_DEVICE_DAILY_LIMIT = 80;
const SMS_VERIFY_MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 5 * 60 * 1000;
const MOCK_MEDIA_UPLOAD_MAX_BASE64_CHARS = 12_000_000;
const MOCK_NEARBY_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;

const mockAppRemoteConfig: AppRemoteConfig = {
  ai: {
    petAvatarDailyLimit: 10,
    petChatDailyLimit: 80,
  },
  analytics: {
    enabled: true,
    sampleRatePercent: 100,
  },
  experiments: {
    homeAiEntry: {
      controlSubtitle: '今天想和{petName}聊点什么？',
      controlTitle: '灵伴聊天',
      enabled: false,
      id: 'home_ai_entry_copy_v1',
      name: '首页 AI 对话入口文案',
      rolloutPercent: 100,
      treatmentSubtitle: '{petName}好像有话想和你说',
      treatmentTitle: '问问我的小心情',
      variantBPercent: 50,
    },
  },
  app: {
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
    enabled: false,
    machineImageEnabled: false,
    machineTextEnabled: false,
    reviewMessage: '内容已进入人工审核，通过后会展示给附近用户',
    textRulesEnabled: true,
  },
  places: {
    contributionBadgeMinPoints: 1,
    contributionBadgesEnabled: false,
    contributionLeaderboardEnabled: false,
    contributionLeaderboardLimit: 10,
    contributionRewardPolicy: {
      cycle: 'monthly',
      description: '测试期仅用于社区荣誉展示，不含现金、余额或实物兑换。',
      enabled: false,
      rewardLabel: '地点共建荣誉',
      topN: 3,
    },
    publicReviews: {
      apiLimit: 20,
      detailDisplayLimit: 3,
      requirePhotos: false,
      sort: 'newest',
    },
  },
  social: {
    discoverRadiusKm: 3,
    nearbyMomentTtlDays: 7,
    petCircleMaxPhotos: 6,
  },
  updatedAt: new Date().toISOString(),
};

let currentMockPhone = '13800138000';
let mockOwnerName = '灵伴用户';
let mockOwnerBio = '';
let mockOwnerAvatarUrl = '';
let mockAccountDeletion: AccountSnapshot['accountDeletion'] = null;
let mockAccountDeletionRequest: AccountDeletionRequestResult | null = null;
let pets: PetProfile[] = [];
let activePetId = '';
let generationProgressById: Record<string, number> = {};
let animationProgressById: Record<string, number> = {};
let mockPermissions: PermissionStateMap = {
  location: 'unknown',
  media: 'unknown',
  notifications: 'unknown',
};
let mockPermissionsOnboardingCompleted = false;
let mockUserSettings: UserSettings = {
  fuzzyLocation: true,
  interactionMessages: true,
  nearbyVisible: true,
  pushNotifications: true,
};
const mockMultiPetFixturePets: PetProfile[] = [
  {
    avatarUrl: 'lumii://preview-golden-retriever',
    birthday: '2023-05-18',
    breed: '金毛',
    gender: 'male',
    healthScore: 96,
    id: 'preview-pet-lucky',
    name: 'Lucky',
    personality: ['亲人', '爱撒娇', '喜欢散步'],
    species: 'dog',
    weightKg: 28.6,
  },
  {
    avatarUrl:
      'https://images.unsplash.com/photo-1574158622682-e40e69881006?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    birthday: '2022-11-02',
    breed: '英短',
    gender: 'female',
    healthScore: 88,
    id: 'preview-pet-mochi',
    name: 'Mochi',
    personality: ['安静', '粘人', '喜欢晒太阳'],
    species: 'cat',
    weightKg: 4.8,
  },
];
const mockMultiPetFixtureWeights: Record<string, WeightRecord[]> = {
  'preview-pet-lucky': [
    { id: 'w-preview-lucky-1', kg: 28.4, note: '精神很好，食欲正常', recordedAt: addDaysIsoDate(-7) },
    { id: 'w-preview-lucky-2', kg: 28.1, recordedAt: addDaysIsoDate(-14) },
  ],
  'preview-pet-mochi': [
    { id: 'w-preview-mochi-1', kg: 4.8, note: '食欲稳定，精神不错', recordedAt: addDaysIsoDate(-5) },
    { id: 'w-preview-mochi-2', kg: 4.7, recordedAt: addDaysIsoDate(-12) },
  ],
};

function parseMockPermissionPatch(value: Partial<PermissionStateMap>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '权限参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['location', 'media', 'notifications']);
  const allowedStatuses = new Set(['blocked', 'denied', 'granted', 'unavailable', 'unknown']);
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `权限项 ${unknownKey} 暂不支持` };
  const invalidKey = keys.find((key) => !allowedStatuses.has(source[key] as string));
  if (invalidKey) return { error: `权限项 ${invalidKey} 状态无效` };
  return { patch: source as Partial<PermissionStateMap> };
}

function parseMockUserSettingsPatch(value: Partial<UserSettings>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '设置参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['fuzzyLocation', 'interactionMessages', 'nearbyVisible', 'pushNotifications']);
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `设置项 ${unknownKey} 暂不支持` };
  const invalidKey = keys.find((key) => typeof source[key] !== 'boolean');
  if (invalidKey) return { error: `设置项 ${invalidKey} 必须是开启或关闭` };
  return { patch: source as Partial<UserSettings> };
}

type MockPetProfilePatch = Partial<Pick<PetProfile, 'avatarUrl' | 'birthday' | 'breed' | 'gender' | 'name' | 'species' | 'weightKg'>>;

function parseMockPetProfilePayload(value: Partial<CreatePetInput | PetProfile>, options: { partial?: boolean } = {}) {
  const partial = options.partial === true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '宠物资料参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['avatarBase64', 'avatarFileName', 'avatarMimeType', 'avatarUrl', 'birthday', 'breed', 'gender', 'name', 'species', 'weightKg']);
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `宠物资料字段 ${unknownKey} 暂不支持` };

  const patch: MockPetProfilePatch = {};
  const unset: Array<'avatarUrl' | 'birthday' | 'weightKg'> = [];
  const fieldRules = petTaxonomy.fieldRules;
  const supportedSpecies = new Set(fieldRules.supportedSpecies);
  const genderIds = new Set(petTaxonomy.genders.map((item) => item.id));

  if (!partial || Object.prototype.hasOwnProperty.call(source, 'name')) {
    const name = String(source.name || '').trim();
    if (!name) return { error: '请输入宠物昵称' };
    if (name.length > fieldRules.maxNameLength) return { error: `宠物昵称最多 ${fieldRules.maxNameLength} 个字` };
    patch.name = name;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(source, 'species')) {
    const species = String(source.species || '').trim();
    if (!species) return { error: '请选择宠物类型' };
    if (!supportedSpecies.has(species as 'cat' | 'dog')) return { error: '当前 MVP 版本先支持猫和狗建档' };
    patch.species = species as 'cat' | 'dog';
  }

  if (!partial || Object.prototype.hasOwnProperty.call(source, 'breed')) {
    const breed = String(source.breed || '').trim() || '待完善';
    if (breed.length > fieldRules.maxBreedLength) return { error: `宠物品种最多 ${fieldRules.maxBreedLength} 个字` };
    patch.breed = breed;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(source, 'gender')) {
    const gender = String(source.gender || 'unknown').trim() || 'unknown';
    if (!genderIds.has(gender as PetProfile['gender'])) return { error: '请选择正确的宠物性别' };
    patch.gender = gender as PetProfile['gender'];
  }

  if (Object.prototype.hasOwnProperty.call(source, 'birthday')) {
    const birthday = String(source.birthday || '').trim();
    if (birthday) {
      if (!isValidPetBirthdayValue(birthday)) return { error: '宠物生日格式应为 YYYY、YYYY-MM 或 YYYY-MM-DD，且不能晚于今天' };
      patch.birthday = birthday;
    } else {
      unset.push('birthday');
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, 'weightKg')) {
    if (source.weightKg === '' || source.weightKg === null) {
      unset.push('weightKg');
    } else {
      const weightKg = Number(source.weightKg);
      if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 200) return { error: '请输入 0-200kg 之间的宠物体重' };
      patch.weightKg = Math.round(weightKg * 100) / 100;
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, 'avatarUrl')) {
    const avatarUrl = String(source.avatarUrl || '').trim();
    if (avatarUrl) {
      if (avatarUrl.length > 2000) return { error: '宠物头像地址过长，请重新上传' };
      patch.avatarUrl = avatarUrl;
    } else {
      unset.push('avatarUrl');
    }
  }

  return { patch, unset };
}

function parseMockWeightRecordPayload(value: Partial<Pick<WeightRecord, 'kg' | 'note' | 'recordedAt'>>, options: { current?: WeightRecord; partial?: boolean } = {}) {
  const partial = options.partial === true;
  const current = options.current;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '体重记录参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['kg', 'note', 'recordedAt']);
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `体重记录字段 ${unknownKey} 暂不支持` };

  const kgInput = partial && !Object.prototype.hasOwnProperty.call(source, 'kg') ? current?.kg : source.kg;
  const kg = Number(kgInput);
  if (!Number.isFinite(kg) || kg <= 0 || kg > 200) return { error: '请输入 0-200kg 之间的宠物体重' };

  const note = Object.prototype.hasOwnProperty.call(source, 'note') ? String(source.note || '').trim() : String(current?.note || '').trim();
  if (note.length > 120) return { error: '体重备注最多 120 个字' };

  const recordedAtInput = Object.prototype.hasOwnProperty.call(source, 'recordedAt') ? source.recordedAt : current?.recordedAt || todayIsoDate();
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

const mockHealthMemoRepeats = new Set(['monthly', 'none', 'quarterly', 'yearly']);

function isValidMockMemoReminderAt(value: string) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return false;
  const [, dateText, hourText, minuteText] = match;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return isValidIsoCalendarDate(dateText) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function parseMockHealthMemoPayload(value: Partial<Pick<HealthMemo, 'content' | 'reminderAt' | 'reminderEnabled' | 'repeat' | 'title'>>, current?: HealthMemo) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '备忘参数无效，请刷新后重试' };
  }
  const allowedKeys = new Set(['content', 'reminderAt', 'reminderEnabled', 'repeat', 'title']);
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source);
  const unknownKey = keys.find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `备忘字段 ${unknownKey} 暂不支持` };

  const title = String(Object.prototype.hasOwnProperty.call(source, 'title') ? source.title : current?.title || '').trim();
  const content = String(Object.prototype.hasOwnProperty.call(source, 'content') ? source.content : current?.content || '').trim();
  const repeatInput = Object.prototype.hasOwnProperty.call(source, 'repeat') ? source.repeat : current?.repeat ?? 'none';
  const repeat = String(repeatInput || 'none').trim();
  const reminderEnabled = Object.prototype.hasOwnProperty.call(source, 'reminderEnabled') ? Boolean(source.reminderEnabled) : Boolean(current?.reminderEnabled);
  const reminderAtInput = Object.prototype.hasOwnProperty.call(source, 'reminderAt') ? source.reminderAt : current?.reminderAt ?? '';
  const reminderAt = String(reminderAtInput || '').trim();
  if (!title || !content) return { error: '请填写备忘标题和内容' };
  if (title.length > 30) return { error: '备忘标题最多 30 个字' };
  if (content.length > 500) return { error: '备忘内容最多 500 个字' };
  if (!mockHealthMemoRepeats.has(repeat)) return { error: '请选择正确重复频率' };
  if (reminderEnabled && !isValidMockMemoReminderAt(reminderAt)) return { error: '请选择正确提醒时间' };
  return {
    memo: {
      content,
      reminderAt: reminderEnabled ? reminderAt : undefined,
      reminderEnabled,
      repeat: repeat as HealthMemo['repeat'],
      title,
    },
  };
}

function parseMockVaccineStatusPatch(status: unknown): { error: string; ok: false } | { ok: true; status: VaccinePlan['status'] } {
  const nextStatus = String(status || '').trim();
  if (!['done', 'due', 'overdue'].includes(nextStatus)) return { error: '疫苗状态无效', ok: false };
  return { ok: true, status: nextStatus as VaccinePlan['status'] };
}

function parseMockVaccineReminderPatch(enabled: unknown): { error: string; ok: false } | { enabled: boolean; ok: true } {
  if (typeof enabled !== 'boolean') return { error: '疫苗提醒开关必须是开启或关闭', ok: false };
  return { enabled, ok: true };
}

function parseMockVaccineCreatePayload(value: Partial<CreateVaccinePlanInput>): { error: string; ok: false } | { input: CreateVaccinePlanInput; ok: true } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '疫苗计划参数无效，请刷新后重试', ok: false };
  }
  const source = value as Record<string, unknown>;
  const allowedKeys = new Set(['dueAt', 'name']);
  const unknownKey = Object.keys(source).find((key) => !allowedKeys.has(key));
  if (unknownKey) return { error: `疫苗计划字段 ${unknownKey} 暂不支持`, ok: false };
  const name = String(source.name || '').trim();
  const dueAt = String(source.dueAt || '').trim();
  if (!name) return { error: '请输入疫苗或驱虫名称', ok: false };
  if (name.length > 24) return { error: '疫苗名称最多 24 个字', ok: false };
  if (!isValidIsoCalendarDate(dueAt)) return { error: '请选择正确的计划日期', ok: false };
  return { input: { dueAt, name }, ok: true };
}

function parseMockPushDevicePayload(
  token: unknown,
  platform: unknown,
  deviceId?: unknown,
): { device: PushDevice; ok: true } | { error: string; ok: false } {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return { error: '推送 token 不能为空', ok: false };
  if (normalizedToken.length < 8 || normalizedToken.length > 4096 || /[\r\n\t]/.test(normalizedToken)) {
    return { error: '推送 token 格式无效，请重新授权通知', ok: false };
  }

  const normalizedPlatform = String(platform || '').trim();
  if (!['android', 'ios', 'web'].includes(normalizedPlatform)) {
    return { error: '推送平台必须是 android、ios 或 web', ok: false };
  }

  const normalizedDeviceId = deviceId === undefined || deviceId === null ? '' : String(deviceId).trim();
  if (normalizedDeviceId.length > 128 || /[\r\n\t]/.test(normalizedDeviceId)) {
    return { error: '设备标识格式无效，请重新授权通知', ok: false };
  }

  return {
    device: {
      deviceId: normalizedDeviceId || undefined,
      platform: normalizedPlatform as PushDevice['platform'],
      token: normalizedToken,
      updatedAt: new Date().toISOString(),
    },
    ok: true,
  };
}

const goldenRetrieverPhotoUrl =
  'https://images.unsplash.com/photo-1625794084867-8ddd239946b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=720';
const goldenRetrieverAvatarUrl =
  'lumii://golden-retriever-avatar';

function todayUsageKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoDateFromTimestampId(id?: string) {
  const match = String(id || '').match(/(\d{13})/);
  if (!match) return '';
  const date = new Date(Number(match[1]));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function healthMemoCalendarDate(memo: HealthMemo) {
  return normalizeCalendarDate(memo.createdAt, isoDateFromTimestampId(memo.id) || memo.updatedAt);
}

function addDaysIsoDate(days: number) {
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

function smsDailyUsageFor(phone: string) {
  const day = todayUsageKey();
  const usage = smsDailyUsageByPhone[phone];
  if (!usage || usage.day !== day) {
    smsDailyUsageByPhone[phone] = { count: 0, day };
  }
  return smsDailyUsageByPhone[phone];
}

function smsDeviceDailyUsageFor(deviceId: string) {
  const day = todayUsageKey();
  const usage = smsDeviceDailyUsageById[deviceId];
  if (!usage || usage.day !== day) {
    smsDeviceDailyUsageById[deviceId] = { count: 0, day };
  }
  return smsDeviceDailyUsageById[deviceId];
}

const acceptedPetMediaAnalysis: UploadedPetMedia['analysis'] = {
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
};

function normalizeMockImageMimeType(value?: string) {
  const mimeType = String(value || '').toLowerCase();
  if (mimeType.includes('jpg') || mimeType.includes('jpeg')) return 'image/jpeg';
  if (mimeType.includes('png')) return 'image/png';
  if (mimeType.includes('webp')) return 'image/webp';
  if (mimeType.includes('heic')) return 'image/heic';
  if (mimeType.includes('heif')) return 'image/heif';
  return '';
}

function isMockSupportedPetMediaMimeType(mimeType: string) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType);
}

function petMediaAnalysis(overrides: Partial<UploadedPetMedia['analysis']>): UploadedPetMedia['analysis'] {
  return { ...acceptedPetMediaAnalysis, ...overrides };
}

function analyzeMockPetMediaUpload(input?: UploadPetMediaInput): UploadedPetMedia['analysis'] {
  if (!input?.base64) {
    if (!input || input.source === 'mvp_sample') return acceptedPetMediaAnalysis;
    return petMediaAnalysis({
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

  const dataUrlMatch = input.base64.trim().match(/^data:([^;]+);base64,(.+)$/);
  const cleanBase64 = (dataUrlMatch ? dataUrlMatch[2] : input.base64).replace(/\s/g, '');
  const declaredMimeType = normalizeMockImageMimeType(dataUrlMatch ? dataUrlMatch[1] : input.mimeType);
  const mimeType = declaredMimeType || (dataUrlMatch || input.mimeType ? '' : 'image/jpeg');
  if (cleanBase64.length > MOCK_MEDIA_UPLOAD_MAX_BASE64_CHARS) {
    return petMediaAnalysis({
      canGenerate: false,
      code: 'file_too_large',
      message: '图片文件过大，请选择 9MB 以内的宠物照片。',
      petCount: 0,
      qualityScore: 0,
      status: 'blocked',
      suggestions: ['选择原图中的清晰单宠照片', '如照片过大，可在系统相册中轻微裁剪后再上传', '避免上传长截图或视频封面'],
      tags: ['文件过大'],
      title: '图片文件过大',
    });
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64) || cleanBase64.length % 4 === 1) {
    return petMediaAnalysis({
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
  if (!isMockSupportedPetMediaMimeType(mimeType)) {
    return petMediaAnalysis({
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
  if (cleanBase64.length < 32 * 1024) {
    return petMediaAnalysis({
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
  return acceptedPetMediaAnalysis;
}

const petTaxonomy: PetTaxonomy = {
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

const legalDocuments: Record<LegalDocument['key'], LegalDocument> = {
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

let weights: WeightRecord[] = [
  { id: 'w1', kg: 28.4, note: '精神很好，食欲正常', recordedAt: addDaysIsoDate(-7) },
  { id: 'w2', kg: 28.1, recordedAt: addDaysIsoDate(-14) },
];

let memos: HealthMemo[] = [
  { createdAt: addDaysIsoDate(-3), id: 'm1', title: '驱虫记录', content: '体外驱虫已完成，下次按计划提醒。', updatedAt: todayIsoDate() },
];

let nearbyMoments: NearbyMoment[] = [];
let petCircleComments: PetCircleComment[] = [];
let petCircleLikedIds: string[] = [];
let socialBlocks: Array<{ blockedAt: string; id: string; ownerId: string; reasonCode?: string; reasonDetail?: string; reasonLabel?: string }> = [];

function isMockOwnerBlocked(ownerId?: string) {
  return Boolean(ownerId && socialBlocks.some((block) => block.ownerId === ownerId));
}
let petCircleReportedCommentIds: string[] = [];
let petCircleReportedPostIds: string[] = [];

function mockPetChatMemoTitle(text: string) {
  if (/吃|饭|粮|零食|食欲|喝水|饮水/.test(text)) return '饮食记录';
  if (/便便|大便|尿|拉稀|腹泻|呕吐|吐/.test(text)) return '健康观察';
  if (/散步|出门|公园|遛|运动/.test(text)) return '散步记录';
  if (/洗澡|驱虫|疫苗|医院|用药|药/.test(text)) return '护理记录';
  return '今日小事';
}

function normalizeMockPetChatMemoContent(text: string) {
  return String(text || '')
    .replace(/^(麻烦|请|帮我|帮忙|可以)?(把|将)?/u, '')
    .replace(/(帮我)?(记一下|记录一下|记一笔|记到(?:健康)?备忘|加到(?:健康)?备忘|保存到(?:健康)?备忘|写进(?:健康)?备忘)[：:，,\s]*/u, '')
    .trim();
}

function createMockHealthMemoFromPetChat(text: string) {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/.test(rawText)) return null;
  if (!/(记一下|记录一下|记一笔|记到(?:健康)?备忘|加到(?:健康)?备忘|保存到(?:健康)?备忘|写进(?:健康)?备忘)/.test(rawText)) return null;
  const content = normalizeMockPetChatMemoContent(rawText) || rawText;
  if (content.length < 2) return null;
  const title = mockPetChatMemoTitle(content);
  const existing = memos.slice(0, 8).find((item) => item.title === title && item.content === content.slice(0, 240));
  if (existing) return existing;
  const memo: HealthMemo = {
    content: content.slice(0, 240),
    createdAt: todayIsoDate(),
    id: `mock-chat-memo-${Date.now()}`,
    title,
    updatedAt: todayIsoDate(),
  };
  memos = [memo, ...memos];
  return memo;
}

function extractMockPetChatWeight(text: string) {
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

function createMockWeightRecordFromPetChat(text: string) {
  const parsed = extractMockPetChatWeight(text);
  if (!parsed) return null;
  const normalizedKg = Math.round(parsed.kg * 100) / 100;
  const existing = weights
    .slice(0, 8)
    .find((item) => Number(item.kg) === normalizedKg && item.recordedAt === todayIsoDate() && String(item.note || '') === parsed.note);
  if (existing) return existing;
  const record: WeightRecord = {
    id: `mock-chat-weight-${Date.now()}`,
    kg: normalizedKg,
    note: parsed.note,
    recordedAt: todayIsoDate(),
  };
  weights = [record, ...weights];
  syncMockPetWeightFromRecords();
  return record;
}

function cleanMockPetChatProfileValue(value: unknown, maxLength: number) {
  const cleaned = String(value ?? '')
    .replace(/^[：:，,\s]+/u, '')
    .replace(/[。！!；;，,\s]+$/u, '')
    .replace(/(呢|吧|呀|啦|了)$/u, '')
    .trim();
  if (!cleaned || /^(吗|什么|多少|几岁|多大)$/u.test(cleaned)) return '';
  return cleaned.slice(0, maxLength);
}

function firstMockPetChatProfileValue(patterns: RegExp[], rawText: string, maxLength: number) {
  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    const value = cleanMockPetChatProfileValue(match?.[1], maxLength);
    if (value) return value;
  }
  return null;
}

function normalizeMockPetChatProfileDate(rawText: string) {
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

function extractMockPetChatProfileGender(rawText: string): PetProfile['gender'] | null {
  const match = String(rawText || '').match(/(?:性别)(?:是|为|改成|改为|设为|设置为|更新为)?[：:，,\s]*(男孩|女孩|男|女|公|母|弟弟|妹妹|未知|不确定)/u);
  const value = match?.[1];
  if (!value) return null;
  if (/未知|不确定/u.test(value)) return 'unknown';
  if (/男|公|弟弟/u.test(value)) return 'male';
  if (/女|母|妹妹/u.test(value)) return 'female';
  return null;
}

function extractMockPetChatPersonality(rawText: string) {
  if (!/(性格|标签)/u.test(rawText)) return null;
  const match = String(rawText || '').match(/(?:性格标签|性格|标签)(?:是|有|改成|改为|设为|设置为|更新为|补充为)?[：:，,\s]*([^。！!；;\n]{1,80})/u);
  if (!match?.[1]) return null;
  const tags: string[] = [];
  for (const token of match[1].split(/[、,，\/|｜\s]+/u)) {
    if (/(生日|出生|品种|犬种|猫种|名字|昵称|小名|性别|体重|疫苗|驱虫)/u.test(token)) break;
    const tag = cleanMockPetChatProfileValue(token, 8);
    if (tag && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 6) break;
  }
  return tags.length ? tags : null;
}

function extractMockPetProfilePatchFromPetChat(text: string): Partial<PetProfile> | null {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/u.test(rawText)) return null;
  if (!/(档案|资料|名字|昵称|小名|生日|出生|品种|犬种|猫种|性别|性格|标签|(?:它|他|她|宠物|狗狗|猫咪)(?:叫|叫做))/u.test(rawText)) return null;

  const patch: Partial<PetProfile> = {};
  const name = firstMockPetChatProfileValue(
    [
      /(?:宠物|狗狗|猫咪|它|他|她)?(?:名字|昵称|小名)(?:叫|叫做|是|改成|改为|设为|设置为|更新为)?[：:，,\s]*([^\s，,。！!；;]{1,16})/u,
      /(?:它|他|她)(?:叫|叫做)[：:，,\s]*([^\s，,。！!；;]{1,16})/u,
    ],
    rawText,
    12,
  );
  if (name && !/^(名字|昵称|小名|宠物)$/u.test(name)) patch.name = name;

  if (/(生日|出生)/u.test(rawText)) {
    const birthday = normalizeMockPetChatProfileDate(rawText);
    if (birthday) patch.birthday = birthday;
  }

  const breed = firstMockPetChatProfileValue(
    [
      /(?:品种|犬种|猫种)(?:是|为|叫|改成|改为|设为|设置为|更新为)?[：:，,\s]*([^，,。！!；;\n]{1,24})/u,
    ],
    rawText,
    20,
  );
  if (breed && !/^(品种|犬种|猫种)$/u.test(breed)) patch.breed = breed;

  const gender = extractMockPetChatProfileGender(rawText);
  if (gender) patch.gender = gender;

  const personality = extractMockPetChatPersonality(rawText);
  if (personality) patch.personality = personality;

  return Object.keys(patch).length ? patch : null;
}

function applyMockPetProfileUpdateFromPetChat(text: string) {
  const petId = activePetId || pets[0]?.id;
  const pet = pets.find((item) => item.id === petId);
  if (!pet) return null;
  const patch = extractMockPetProfilePatchFromPetChat(text);
  if (!patch) return null;
  const updatedPet = { ...pet, ...patch };
  pets = pets.map((item) => (item.id === updatedPet.id ? updatedPet : item));
  return { patch, pet: updatedPet };
}

function describeMockPetProfilePatch(patch: Partial<PetProfile>) {
  const fields: string[] = [];
  if (patch.name) fields.push('昵称');
  if (patch.birthday) fields.push('生日');
  if (patch.breed) fields.push('品种');
  if (patch.gender) fields.push('性别');
  if (patch.personality) fields.push('性格标签');
  return fields.join('、') || '宠物资料';
}

type MockPetChatVaccineAction = {
  action: 'done' | 'reminder_off' | 'reminder_on';
  reminderIds: string[];
  vaccine: VaccinePlan;
};

function detectMockPetChatVaccineAction(text: string): MockPetChatVaccineAction['action'] | null {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/.test(rawText)) return null;
  const mentionsVaccine = /(疫苗|狂犬|三联|驱虫)/.test(rawText);
  if (!mentionsVaccine) return null;
  if (/(取消|关闭|不要|不用|别).{0,8}提醒|提醒.{0,8}(取消|关闭|不要|不用|别)/.test(rawText)) return 'reminder_off';
  if (/(提醒|到期|临近|提前).{0,12}(疫苗|狂犬|三联|驱虫)|(疫苗|狂犬|三联|驱虫).{0,12}(提醒|到期|临近|提前)/.test(rawText)) return 'reminder_on';
  if (/(已打|打完|打了|刚打|接种了|已接种|接种完成|已完成|完成了|做完|做了|已做|驱虫了|驱虫完成)/.test(rawText)) return 'done';
  return null;
}

function findMockVaccineForPetChat(text: string) {
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
  return vaccines.find((vaccine) => vaccine.status !== 'done') ?? vaccines[0] ?? null;
}

function applyMockPetChatVaccineAction(text: string): MockPetChatVaccineAction | null {
  const action = detectMockPetChatVaccineAction(text);
  if (!action) return null;
  const vaccine = findMockVaccineForPetChat(text);
  if (!vaccine) return null;
  const index = vaccines.findIndex((item) => item.id === vaccine.id);
  if (index < 0) return null;

  if (action === 'done') {
    vaccines[index] = { ...vaccines[index], status: 'done' };
    vaccineReminderIds = vaccineReminderIds.filter((item) => item !== vaccines[index].id);
    addMockNotification({
      id: `mock-vaccine-done-${vaccines[index].id}`,
      kind: 'vaccine_done',
      read: false,
      text: `${vaccines[index].name}已标记完成，健康时间线已更新。`,
      title: '疫苗计划已完成',
      vaccineId: vaccines[index].id,
    });
    return { action, reminderIds: vaccineReminderIds, vaccine: vaccines[index] };
  }

  if (action === 'reminder_on') {
    if (vaccines[index].status === 'done') return null;
    vaccineReminderIds = [...new Set([vaccines[index].id, ...vaccineReminderIds])];
    addMockNotification({
      id: `mock-health-reminder-${vaccines[index].id}`,
      kind: 'vaccine_reminder',
      read: false,
      text: `${vaccines[index].name}即将到期，记得按宠物医院建议确认时间。`,
      title: '健康提醒',
      vaccineId: vaccines[index].id,
    });
    return { action, reminderIds: vaccineReminderIds, vaccine: vaccines[index] };
  }

  vaccineReminderIds = vaccineReminderIds.filter((item) => item !== vaccines[index].id);
  return { action, reminderIds: vaccineReminderIds, vaccine: vaccines[index] };
}

let vaccines: VaccinePlan[] = [];
let vaccineReminderIds: string[] = [];

function ensureMockVaccineTemplateCoverage() {
  vaccines = vaccines.sort((left, right) => left.dueAt.localeCompare(right.dueAt));
}

const owners: NearbyOwner[] = [
  {
    id: 'o1',
    imageUrl:
      'https://images.unsplash.com/photo-1599692392256-2d084495fe15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    ownerName: '林然',
    petName: '奶油',
    species: 'dog',
    distance: '1km 内',
    tags: ['金毛', '可约遛', '友好'],
  },
  {
    id: 'o2',
    imageUrl:
      'https://images.unsplash.com/photo-1597806999047-9456837df754?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    ownerName: '小夏',
    petName: '豆包',
    species: 'dog',
    distance: '约 1-2km',
    tags: ['柴犬', '想交朋友'],
  },
  {
    id: 'o3',
    imageUrl:
      'https://images.unsplash.com/photo-1665659219608-4e22c0760dd6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    ownerName: '阿泽',
    petName: 'Milo',
    species: 'cat',
    distance: '约 2-3km',
    tags: ['橘猫', '只线上聊天'],
  },
];

function getMockWebPreviewParam(key: string) {
  try {
    const location = (globalThis as unknown as { location?: { search?: string } }).location;
    return new URLSearchParams(location?.search ?? '').get(key) ?? '';
  } catch {
    return '';
  }
}

function ensureMockMultiPetFixtures() {
  if (getMockWebPreviewParam('mockMultiPet') !== 'interactive') return;
  const existingIds = new Set(pets.map((pet) => pet.id));
  const missingPets = mockMultiPetFixturePets.filter((pet) => !existingIds.has(pet.id));
  if (missingPets.length) pets = [...pets, ...missingPets];
  if (!activePetId || !pets.some((pet) => pet.id === activePetId)) activePetId = mockMultiPetFixturePets[0]?.id ?? pets[0]?.id ?? '';
}

function ensureMockMultiPetHealthFixtures() {
  if (getMockWebPreviewParam('mockMultiPet') !== 'interactive') return;
  const petId = activePetId || pets[0]?.id || mockMultiPetFixturePets[0]?.id || '';
  const fixtureWeights = mockMultiPetFixtureWeights[petId];
  if (!fixtureWeights) return;
  weights = fixtureWeights.map((record) => ({ ...record }));
}

function ensureMockBackdatedHealthCalendarFixtures() {
  if (getMockWebPreviewParam('mockHealthCalendar') !== 'backdated') return;
  const backdated = addDaysIsoDate(-6);
  const now = todayIsoDate();
  const socialMomentId = 'mock-backdated-health-moment';
  const profileMemo: HealthMemo = {
    content: 'Lucky 建档完成，可以开始记录健康和小事。',
    createdAt: backdated,
    id: 'mock-backdated-profile-memo',
    title: '建档记录',
    updatedAt: now,
  };
  const socialMemo: HealthMemo = {
    content: '六天前同步到宠物日历的宠友圈小事。',
    createdAt: now,
    id: 'mock-backdated-social-memo',
    source: 'pet_circle',
    sourceId: socialMomentId,
    title: '历史小事同步',
    updatedAt: now,
  };
  const upsertMemo = (nextMemo: HealthMemo) => {
    const index = memos.findIndex((memo) => memo.id === nextMemo.id);
    if (index >= 0) {
      memos = memos.map((memo, memoIndex) => (memoIndex === index ? { ...memo, ...nextMemo } : memo));
      return;
    }
    memos = [nextMemo, ...memos];
  };
  const momentIndex = nearbyMoments.findIndex((moment) => moment.id === socialMomentId);
  const nextMoment: NearbyMoment = {
    createdAt: `${backdated}T10:45:00.000Z`,
    distance: '0.8km',
    id: socialMomentId,
    ownerId: 'mock-self-owner',
    ownerName: mockOwnerName,
    ownedByMe: true,
    petName: 'Lucky',
    species: 'dog',
    text: '六天前和 Lucky 在楼下晒太阳。',
    visibility: 'nearby',
  };
  nearbyMoments = momentIndex >= 0
    ? nearbyMoments.map((moment, index) => (index === momentIndex ? { ...moment, ...nextMoment } : moment))
    : [nextMoment, ...nearbyMoments];
  upsertMemo(profileMemo);
  upsertMemo(socialMemo);
}

const mockPetCircleInteractionFixtureOwners: Record<string, string> = {
  'mock-fixture-pet-circle-block': 'o2',
  'mock-fixture-pet-circle-interaction': 'o1',
};

const mockPetCircleDefaultCoverUrl = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=900';

function currentMockOwnerId() {
  return `mock-${currentMockPhone}`;
}

function petCircleProfileCursorOffset(cursor?: string) {
  const offset = Math.floor(Number(cursor) || 0);
  return Math.max(0, offset);
}

function petCircleProfileLimit(value?: number, fallback = 20) {
  const limit = Math.floor(Number(value) || fallback);
  return Math.max(1, Math.min(50, limit));
}

function mockPetCircleVisibleProfilePosts(ownerId = 'me') {
  ensureMockMyPetCircleProfileFixtures();
  ensureMockPetCircleInteractionFixtures();
  const normalizedOwnerId = ownerId && ownerId !== 'me' ? ownerId : currentMockOwnerId();
  return nearbyMoments
    .filter((moment) => moment.ownerId === normalizedOwnerId)
    .filter((moment) => (moment.visibility ?? 'nearby') === 'nearby')
    .filter((moment) => !petCircleReportedPostIds.includes(moment.id))
    .map((moment) => ({
      ...moment,
      commentCount: petCircleComments.filter((comment) => comment.postId === moment.id && !petCircleReportedCommentIds.includes(comment.id)).length,
      likedByMe: petCircleLikedIds.includes(moment.id),
      likeCount: moment.likeCount ?? (petCircleLikedIds.includes(moment.id) ? 1 : 0),
      ownedByMe: moment.ownerId === currentMockOwnerId(),
    }))
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    });
}

function buildMockPetCircleProfile(ownerId = 'me', posts?: NearbyMoment[]): PetCircleProfile {
  const normalizedOwnerId = ownerId && ownerId !== 'me' ? ownerId : currentMockOwnerId();
  const ownedByMe = normalizedOwnerId === currentMockOwnerId();
  const pet = activeMockPet();
  const owner = owners.find((item) => item.id === normalizedOwnerId);
  const profilePosts = posts ?? mockPetCircleVisibleProfilePosts(normalizedOwnerId);
  const latestPostAt = profilePosts[0]?.createdAt;
  const latestPostImage = profilePosts.flatMap((post) => post.imageUrls ?? []).find(Boolean);
  const avatarUrl = ownedByMe ? pet?.avatarUrl : owner?.imageUrl;
  const coverImageUrl = ownedByMe
    ? pet?.petCircleCoverImageUrl || latestPostImage || mockPetCircleDefaultCoverUrl
    : latestPostImage || owner?.imageUrl || mockPetCircleDefaultCoverUrl;
  return {
    avatarUrl,
    canChangeCover: ownedByMe,
    coverImageUrl,
    latestPostAt,
    ownerId: normalizedOwnerId,
    ownerName: ownedByMe ? mockOwnerName : owner?.ownerName ?? '附近宠友',
    ownedByMe,
    petName: ownedByMe ? pet?.name ?? '灵伴' : owner?.petName ?? '宠友',
    relationshipStatus: ownedByMe ? 'self' : 'accepted',
    species: (ownedByMe ? pet?.species : owner?.species) === 'cat' ? 'cat' : 'dog',
    stats: {
      commentCount: profilePosts.reduce((sum, post) => sum + (post.commentCount ?? 0), 0),
      likeCount: profilePosts.reduce((sum, post) => sum + (post.likeCount ?? 0), 0),
      photoCount: profilePosts.reduce((sum, post) => sum + ((post.imageUrls?.length ?? post.photoCount) || 0), 0),
      postCount: profilePosts.length,
    },
  };
}

function ensureMockMyPetCircleProfileFixtures() {
  if (!activeMockPet()) {
    pets = [mockMultiPetFixturePets[0], ...pets.filter((pet) => pet.id !== mockMultiPetFixturePets[0].id)];
    activePetId = mockMultiPetFixturePets[0].id;
  }
  const pet = activeMockPet();
  const ensureNotificationComment = () => {
    if (petCircleComments.some((comment) => comment.id === 'mock-my-circle-today-evening-comment')) return;
    petCircleComments = [
      {
        author: '奶油',
        avatarUrl: owners.find((owner) => owner.id === 'o1')?.imageUrl,
        content: '奶油：今天也太可爱啦。',
        createdAt: new Date().toISOString(),
        id: 'mock-my-circle-today-evening-comment',
        ownerId: 'o1',
        ownedByMe: false,
        postId: 'mock-my-circle-today-evening',
        text: '奶油：今天也太可爱啦。',
      },
      ...petCircleComments,
    ];
  };
  if (!pet) return;
  if (nearbyMoments.some((moment) => moment.id === 'mock-my-circle-today-evening')) {
    ensureNotificationComment();
    return;
  }
  const ownerId = currentMockOwnerId();
  const now = new Date();
  const todayLate = new Date(now);
  todayLate.setHours(16, 42, 0, 0);
  const todayEarly = new Date(now);
  todayEarly.setHours(10, 18, 0, 0);
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 6);
  lastWeek.setHours(18, 5, 0, 0);
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastMonth.setDate(19);
  lastMonth.setHours(19, 36, 0, 0);
  const fixtures: NearbyMoment[] = [
    {
      commentCount: 8,
      createdAt: todayLate.toISOString(),
      distance: '附近',
      id: 'mock-my-circle-today-evening',
      imageUrl: pet.avatarUrl,
      imageUrls: [
        'https://images.unsplash.com/photo-1552053831-71594a27632d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
      ],
      likeCount: 24,
      ownerId,
      ownerName: mockOwnerName,
      ownedByMe: true,
      petName: pet.name,
      photoCount: 3,
      species: pet.species === 'cat' ? 'cat' : 'dog',
      text: '今天阳光超好，我们去公园散步啦！遇到了新朋友，一起追泡泡、跑跑跳跳，开心到停不下来～',
      visibility: 'nearby',
    },
    {
      commentCount: 3,
      createdAt: todayEarly.toISOString(),
      distance: '附近',
      id: 'mock-my-circle-today-morning',
      imageUrl: pet.avatarUrl,
      imageUrls: [
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
        'https://images.unsplash.com/photo-1568572933382-74d440642117?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
      ],
      likeCount: 12,
      ownerId,
      ownerName: mockOwnerName,
      ownedByMe: true,
      petName: pet.name,
      photoCount: 2,
      species: pet.species === 'cat' ? 'cat' : 'dog',
      text: '早上吃饭饭很开心，顺手记录一下精神状态。',
      visibility: 'nearby',
    },
    {
      commentCount: 6,
      createdAt: lastWeek.toISOString(),
      distance: '附近',
      id: 'mock-my-circle-last-week',
      imageUrl: pet.avatarUrl,
      imageUrls: [
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
        'https://images.unsplash.com/photo-1558788353-f76d92427f16?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
        'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
      ],
      likeCount: 18,
      ownerId,
      ownerName: mockOwnerName,
      ownedByMe: true,
      petName: pet.name,
      photoCount: 3,
      species: pet.species === 'cat' ? 'cat' : 'dog',
      text: '周末小记，玩具被翻出来以后又兴奋了一整晚。',
      visibility: 'nearby',
    },
    {
      commentCount: 4,
      createdAt: lastMonth.toISOString(),
      distance: '附近',
      id: 'mock-my-circle-last-month',
      imageUrl: pet.avatarUrl,
      imageUrls: [
        'https://images.unsplash.com/photo-1507146426996-ef05306b995a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
        'https://images.unsplash.com/photo-1517849845537-4d257902454a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
      ],
      likeCount: 15,
      ownerId,
      ownerName: mockOwnerName,
      ownedByMe: true,
      petName: pet.name,
      photoCount: 2,
      species: pet.species === 'cat' ? 'cat' : 'dog',
      text: '晚霞超美，散步回来的路上忍不住拍了两张。',
      visibility: 'nearby',
    },
  ];
  nearbyMoments = [...fixtures, ...nearbyMoments.filter((moment) => !fixtures.some((fixture) => fixture.id === moment.id))];
  ensureNotificationComment();
}

function ensureMockPetCircleInteractionFixtures() {
  if (getMockWebPreviewParam('mockPetCircle') !== 'interactive') return;
  const now = Date.now();
  const firstOwner = owners[0];
  const secondOwner = owners[1];
  if (!nearbyMoments.some((moment) => moment.id === 'mock-fixture-pet-circle-interaction')) {
    nearbyMoments = [
      {
        commentCount: 1,
        createdAt: new Date(now - 8 * 60 * 1000).toISOString(),
        distance: firstOwner.distance,
        id: 'mock-fixture-pet-circle-interaction',
        imageUrl: firstOwner.imageUrl,
        imageUrls: [
          'https://images.unsplash.com/photo-1587300003388-59208cc962cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
        ],
        likedByMe: petCircleLikedIds.includes('mock-fixture-pet-circle-interaction'),
        likeCount: petCircleLikedIds.includes('mock-fixture-pet-circle-interaction') ? 4 : 3,
        mood: '开心',
        ownerId: firstOwner.id,
        ownerName: firstOwner.ownerName,
        ownedByMe: false,
        petName: firstOwner.petName,
        photoCount: 1,
        species: firstOwner.species,
        text: 'Playwright 互动夹具：奶油今天在草坪练习等待口令。',
        visibility: 'nearby',
      },
      {
        commentCount: 0,
        createdAt: new Date(now - 18 * 60 * 1000).toISOString(),
        distance: secondOwner.distance,
        id: 'mock-fixture-pet-circle-block',
        imageUrl: secondOwner.imageUrl,
        imageUrls: [
          'https://images.unsplash.com/photo-1552053831-71594a27632d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
          'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
        ],
        likedByMe: false,
        likeCount: 6,
        mood: '想约遛',
        ownerId: secondOwner.id,
        ownerName: secondOwner.ownerName,
        ownedByMe: false,
        petName: secondOwner.petName,
        photoCount: 2,
        species: secondOwner.species,
        text: 'Playwright 拉黑夹具：豆包想找附近的朋友绕一圈。',
        visibility: 'nearby',
      },
      ...nearbyMoments,
    ];
  }
  if (!petCircleComments.some((comment) => comment.id === 'mock-fixture-pet-circle-comment')) {
    petCircleComments = [
      {
        author: secondOwner.ownerName,
        avatarUrl: secondOwner.imageUrl,
        content: 'Playwright 评论举报夹具：这个口令练习很稳。',
        createdAt: new Date(now - 4 * 60 * 1000).toISOString(),
        id: 'mock-fixture-pet-circle-comment',
        ownerId: secondOwner.id,
        ownedByMe: false,
        postId: 'mock-fixture-pet-circle-interaction',
        text: 'Playwright 评论举报夹具：这个口令练习很稳。',
      },
      ...petCircleComments,
    ];
  }
}

function ensureMockGreetingRequestFixtures() {
  if (getMockWebPreviewParam('mockGreetingRequests') !== 'interactive' || mockGreetingRequestFixturesSeeded) return;
  mockGreetingRequestFixturesSeeded = true;
  const fixtureOwner = owners[1] ?? owners[0];
  if (!fixtureOwner || greetingRequests.some((owner) => owner.id === fixtureOwner.id)) return;
  greetingRequests = [fixtureOwner, ...greetingRequests];
}

function mockVisiblePetCircleMoments(includeOwn = true) {
  if (includeOwn) ensureMockMyPetCircleProfileFixtures();
  ensureMockPetCircleInteractionFixtures();
  return nearbyMoments
    .filter((moment) => includeOwn || !moment.ownedByMe)
    .filter((moment) => (moment.visibility ?? 'nearby') === 'nearby')
    .filter((moment) => !isMockOwnerBlocked(moment.ownerId))
    .filter((moment) => !petCircleReportedPostIds.includes(moment.id))
    .map((moment) => ({
      ...moment,
      commentCount: petCircleComments.filter((comment) => comment.postId === moment.id && !petCircleReportedCommentIds.includes(comment.id)).length,
      likedByMe: petCircleLikedIds.includes(moment.id),
      likeCount: moment.likeCount ?? (petCircleLikedIds.includes(moment.id) ? 1 : 0),
    }))
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    });
}

const conversations: Conversation[] = [
  { canSendMessage: true, id: 'c1', imageUrl: owners[0]?.imageUrl, lastMessage: '今晚 7 点公园见？', name: '林然和奶油', ownerId: owners[0]?.id, petName: '奶油', relationshipStatus: 'accepted', unread: 1 },
  { canSendMessage: false, id: 'c2', lastMessage: '你提交的地点已进入审核。', name: '地点审核通知', relationshipStatus: 'pending', unread: 0 },
];

let greetingRequests: NearbyOwner[] = [];
let mockGreetingRequestFixturesSeeded = false;

let conversationMessagesById: Record<string, ConversationMessage[]> = {
  c1: [{ author: 'other', id: 'c1-welcome', text: '今晚 7 点公园见？', time: new Date().toISOString() }],
  c2: [{ author: 'system', id: 'c2-system', text: '你提交的地点已进入审核。', time: new Date().toISOString() }],
};
let conversationReportedMessageIds: string[] = [];
let petChatMessages: ChatMessage[] = [];

let notifications: NotificationItem[] = [
  {
    category: 'interaction',
    conversationId: 'c1',
    createdAt: new Date().toISOString(),
    id: 'mock-conversation-message-notification',
    kind: 'conversation_message',
    ownerId: owners[0]?.id,
    read: false,
    text: '今晚 7 点公园见？',
    title: '林然发来新消息',
  },
  {
    category: 'interaction',
    createdAt: new Date().toISOString(),
    id: 'mock-pet-circle-comment-notification',
    kind: 'pet_circle_comment',
    postId: 'mock-my-circle-today-evening',
    read: false,
    text: '奶油评论了 Lucky 的小事',
    title: 'Lucky 的小事有新互动',
  },
  {
    category: 'health',
    id: 'mock-medical-alert-notification-m1',
    kind: 'medical_alert',
    memoId: 'm1',
    read: false,
    text: '已记录健康异常观察，请查看备忘并按需联系宠物医院。',
    title: '就医提醒',
  },
  { id: 'n2', title: 'AI 形象生成', text: '新的电子宠物形象已保存。', read: true },
];

let pushDevices: PushDevice[] = [];
let feedbackSubmissions: FeedbackSubmission[] = [];
let sanctionAppeals: SanctionAppealItem[] = [];
let reportAppealTargets: ReportAppealTarget[] = [
  {
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reportId: 'mock-report-result-1',
    reportRole: 'owner',
    reportRoleLabel: '被举报方',
    reportStatus: 'valid',
    reportStatusLabel: '举报有效',
    reviewReason: '模拟举报处理结果，可在真机后端场景中由后台复核',
    targetId: 'mock-post-1',
    targetLabel: '小事',
    targetType: 'post',
    title: '小事 · 举报有效',
    updatedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];
let supportTickets: SupportTicketDetail[] = [];
let uploadedMediaById: Record<string, UploadedPetMedia> = {};
let avatarJobsById: Record<string, AvatarJob> = {};
let avatarAnimationJobsById: Record<string, AvatarAnimationJob> = {};
let mockPetChatDailyCount = 0;
let mockPetAvatarDailyCount = 0;
const mockPetAvatarDailyLimit = 10;
const mockSocialMessageMaxChars = 600;

function createMockAvatarAnimationJob(pet: PetProfile, sourceAvatarUrl?: string): AvatarAnimationJob {
  const id = `anim-${pet.id}-${Date.now()}`;
  animationProgressById[id] = 18;
  const job: AvatarAnimationJob = {
    aspectRatio: '1:1',
    createdAt: Date.now(),
    duration: 4,
    id,
    model: 'doubao-seedance-1-5-pro',
    petId: pet.id,
    petName: pet.name,
    progress: 18,
    provider: 'mock',
    providerStatus: 'queued',
    resolution: '480p',
    sourceAvatarUrl: sourceAvatarUrl || pet.avatarUrl || '',
    status: 'processing',
    updatedAt: Date.now(),
  };
  avatarAnimationJobsById = { ...avatarAnimationJobsById, [id]: job };
  return job;
}

const places: Place[] = [
  { id: 'p1', name: '云杉宠物友好公园', address: '滨江路 88 号', category: 'park', distance: '900m', rating: 4.8, reviewCount: 36, supportedSpecies: ['dog'], tags: ['可遛狗', '草坪', '饮水点'] },
  { id: 'p2', name: '暖爪咖啡', address: '中央广场 B1', category: 'cafe', distance: '1.6km', rating: 4.6, reviewCount: 18, supportedSpecies: ['cat', 'dog'], tags: ['室内友好', '可带猫包'] },
  { id: 'p4', name: '毛球宠物生活馆', address: '中央广场 2F', category: 'shop', distance: '1.9km', rating: 4.5, reviewCount: 21, supportedSpecies: ['cat', 'dog'], tags: ['宠物用品', '洗护美容'] },
  { id: 'p3', name: '安心宠物医院', address: '明湖街 12 号', category: 'clinic', distance: '2.3km', rating: 4.7, reviewCount: 24, supportedSpecies: ['cat', 'dog'], tags: ['急诊', '疫苗'] },
];
let favoritePlaceIds: string[] = [];
let placeReviews: PlaceReview[] = [];
let placeReviewReportedIds: string[] = [];
let placeReportedIds: string[] = [];
let placeSubmissions: PlaceSubmission[] = [];

function buildMockSanctionAppealList(): SanctionAppealList {
  const appeals = sanctionAppeals.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return {
    appeals,
    reportAppealTargets,
    summary: {
      all: appeals.length,
      open: appeals.filter((appeal) => appeal.status === 'pending' || appeal.status === 'reviewing').length,
      reportTargets: reportAppealTargets.length,
    },
  };
}

function supportTicketStatusLabelPriority(category: FeedbackCategory) {
  if (category === 'safety') return 'urgent';
  if (category === 'bug') return 'high';
  if (category === 'suggestion') return 'low';
  return 'normal';
}

function supportTicketTitle(category: FeedbackCategory) {
  const labels: Record<FeedbackCategory, string> = {
    bug: '问题反馈',
    other: '用户反馈',
    safety: '安全投诉',
    suggestion: '产品建议',
  };
  return `${labels[category] ?? '用户反馈'} · ${mockOwnerName || '灵伴用户'}`;
}

function mockSupportTicketAttachments(attachments: SupportTicketAttachmentDraft[] = []) {
  return attachments.slice(0, 3).map((attachment, index) => ({
    createdAt: new Date().toISOString(),
    id: `mock-support-attachment-${Date.now()}-${index}`,
    mediaId: '',
    mimeType: attachment.mimeType || 'image/jpeg',
    name: attachment.name || attachment.fileName || `截图 ${index + 1}`,
    previewUrl: attachment.previewUrl || '',
    sizeBytes: 0,
    type: 'image' as const,
    url: attachment.previewUrl || '',
  })).filter((attachment) => attachment.url);
}

function publicSupportTicketItem(ticket: SupportTicketDetail): SupportTicketItem {
  const latestSupportMessage = [...ticket.messages].reverse().find((message) => message.author === 'support');
  const attachmentCount = ticket.messages.reduce((total, message) => total + (message.attachments?.length ?? 0), 0);
  const firstResponseDone = Boolean(latestSupportMessage);
  const slaType = firstResponseDone ? 'resolution' : 'first_response';
  const slaHours = slaType === 'first_response'
    ? ({ urgent: 1, high: 4, normal: 12, low: 24 } as const)[ticket.priority]
    : ({ urgent: 8, high: 24, normal: 72, low: 168 } as const)[ticket.priority];
  return {
    attachmentCount,
    canRate: ticket.status === 'closed' || ticket.status === 'resolved',
    canReply: ticket.status !== 'closed' && ticket.status !== 'resolved',
    canReopen: ticket.status === 'closed' || ticket.status === 'resolved',
    category: ticket.category,
    content: ticket.content,
    createdAt: ticket.createdAt,
    id: ticket.id,
    lastActivityAt: ticket.lastActivityAt ?? ticket.updatedAt ?? ticket.createdAt,
    latestReply: latestSupportMessage?.content ?? '',
    latestReplyAt: latestSupportMessage?.createdAt ?? '',
    priority: ticket.priority,
    replyCount: ticket.messages.length > 0 ? ticket.messages.length - 1 : 0,
    reopenCount: ticket.reopenCount ?? ticket.messages.filter((message) => message.type === 'reopen').length,
    satisfaction: ticket.satisfaction ?? null,
    slaHours,
    slaLabel: slaType === 'first_response' ? '首响 SLA' : '解决 SLA',
    slaState: ticket.status === 'closed' || ticket.status === 'resolved' ? 'done' : 'healthy',
    slaType,
    status: ticket.status,
    title: ticket.title,
    updatedAt: ticket.updatedAt,
  };
}

function buildSupportTicketList(): SupportTicketList {
  const tickets = supportTickets
    .map(publicSupportTicketItem)
    .sort((a, b) => String(b.lastActivityAt ?? b.createdAt).localeCompare(String(a.lastActivityAt ?? a.createdAt)));
  const summary: SupportTicketSummary = {
    all: tickets.length,
    open: tickets.filter((ticket) => ticket.status !== 'closed' && ticket.status !== 'resolved').length,
    waitingUser: tickets.filter((ticket) => ticket.status === 'waiting_user').length,
  };
  return { summary, tickets };
}

function createMockSupportTicket(feedback: FeedbackSubmission): SupportTicketDetail {
  const message: SupportTicketMessage = {
    author: 'user',
    authorName: '我',
    content: feedback.content,
    createdAt: feedback.createdAt,
    id: `ticket-source-${feedback.id}`,
    type: 'feedback',
  };
  const ticket: SupportTicketDetail = {
    attachmentCount: 0,
    canRate: false,
    canReply: true,
    canReopen: false,
    category: feedback.category,
    content: feedback.content,
    createdAt: feedback.createdAt,
    id: feedback.supportTicketId ?? `ticket-${feedback.id}`,
    lastActivityAt: feedback.createdAt,
    latestReply: '',
    latestReplyAt: '',
    messages: [message],
    priority: supportTicketStatusLabelPriority(feedback.category),
    replyCount: 0,
    reopenCount: 0,
    satisfaction: null,
    status: 'received',
    title: supportTicketTitle(feedback.category),
    updatedAt: feedback.createdAt,
  };
  supportTickets = [ticket, ...supportTickets];
  return ticket;
}

function matchesPlaceSearch(place: Place, query: string) {
  const searchableText = [place.name, place.address, place.category, ...place.tags].join(' ');
  return searchableText.includes(query);
}

function mockPublicPlaceContentViolation(label: string, value: string, maxLength: number) {
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

function mockSocialChatContentViolation(label: string, value: string, maxLength = mockSocialMessageMaxChars) {
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

function normalizeMockPlaceDuplicateText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[（）()[\]【】{}]/g, '')
    .replace(/[\s·•,，。.\-_/\\:：;；'"“”‘’#号]+/g, '')
    .trim();
}

function isSimilarMockPlaceText(a: string, b: string, minLength = 4) {
  const left = normalizeMockPlaceDuplicateText(a);
  const right = normalizeMockPlaceDuplicateText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (Math.min(left.length, right.length) < minLength) return false;
  return left.includes(right) || right.includes(left);
}

function normalizeMockNotificationCategory(category: unknown): NotificationCategory {
  return category === 'health' || category === 'interaction' || category === 'system' || category === 'walk' ? category : 'system';
}

function inferMockNotificationCategory(notification: Pick<NotificationItem, 'id' | 'text' | 'title'>): NotificationCategory {
  const id = String(notification.id || '');
  if (/walk/.test(id)) return 'walk';
  if (/(health|vaccine|medical)/.test(id)) return 'health';
  if (/(greeting|message|pet-circle|pet_circle)/.test(id)) return 'interaction';
  const value = `${notification.title} ${notification.text}`;
  if (/约遛|邀请|公园|散步|见面|一起去/.test(value)) return 'walk';
  if (/健康|疫苗|体重|驱虫|提醒|就医/.test(value)) return 'health';
  return 'system';
}

function normalizeMockNotificationKind(kind: unknown): NotificationKind | '' {
  return kind === 'conversation_message' || kind === 'greeting_accepted' || kind === 'greeting_request' || kind === 'health_reminder' || kind === 'medical_alert' || kind === 'pet_circle_comment' || kind === 'pet_circle_greeting' || kind === 'pet_circle_like' || kind === 'place_review' || kind === 'place_submission' || kind === 'system' || kind === 'vaccine_done' || kind === 'vaccine_reminder' || kind === 'walk_invite' ? kind : '';
}

function isStaleMockNearbyLocation(location?: NearbyLocationHint | null) {
  if (!location?.updatedAt) return false;
  return Date.now() - Number(location.updatedAt) > MOCK_NEARBY_LOCATION_MAX_AGE_MS;
}

function normalizeMockPetCircleImageUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  const seen = new Set<string>();
  value.forEach((item) => {
    if (urls.length >= 6) return;
    const url = String(item || '').trim();
    if (!url || url.length > 2000 || seen.has(url)) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
      seen.add(url);
      urls.push(url);
    } catch {
      // Ignore invalid image URLs; public posts should use media upload fileUrl values.
    }
  });
  return urls;
}

function inferMockNotificationKind(notification: NotificationItem): NotificationKind {
  const id = String(notification.id || '');
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
  const category = normalizeMockNotificationCategory(notification.category || inferMockNotificationCategory(notification));
  if (category === 'walk') return 'walk_invite';
  if (category === 'health') return 'health_reminder';
  if (category === 'system') return 'system';
  return 'greeting_request';
}

function normalizeMockNotificationItem(notification: NotificationItem, fallbackCategory?: NotificationCategory): NotificationItem {
  const category = normalizeMockNotificationCategory(notification.category || fallbackCategory || inferMockNotificationCategory(notification));
  return {
    ...notification,
    category,
    createdAt: notification.createdAt || new Date().toISOString(),
    kind: normalizeMockNotificationKind(notification.kind) || inferMockNotificationKind({ ...notification, category }),
  };
}

function normalizeMockNotifications() {
  notifications = notifications.map((item) => normalizeMockNotificationItem(item, inferMockNotificationCategory(item)));
  return notifications;
}

function mockNotificationConversationId(notification: NotificationItem) {
  if (notification.conversationId) return notification.conversationId;
  const ownerId = String(notification.ownerId || '');
  const kind = normalizeMockNotificationKind(notification.kind) || inferMockNotificationKind(notification);
  if (kind !== 'conversation_message' && kind !== 'greeting_accepted' && kind !== 'walk_invite') return '';
  if (ownerId.startsWith('user-')) return `c-${ownerId.slice('user-'.length)}`;
  return '';
}

function mockNotificationBelongsToConversation(notification: NotificationItem, conversationId: string) {
  const kind = normalizeMockNotificationKind(notification.kind) || inferMockNotificationKind(notification);
  return (
    (kind === 'conversation_message' || kind === 'greeting_accepted' || kind === 'walk_invite') &&
    mockNotificationConversationId(notification) === conversationId
  );
}

function markMockConversationNotificationsRead(conversationId: string) {
  normalizeMockNotifications();
  notifications = notifications.map((item) => (mockNotificationBelongsToConversation(item, conversationId) ? { ...item, read: true } : item));
}

function shouldStoreMockNotification(category: NotificationCategory = 'system') {
  if (!mockUserSettings.pushNotifications) return false;
  if ((category === 'interaction' || category === 'walk') && !mockUserSettings.interactionMessages) return false;
  return true;
}

function addMockNotification(notification: NotificationItem, category?: NotificationCategory) {
  const normalizedCategory = normalizeMockNotificationCategory(notification.category || category || inferMockNotificationCategory(notification));
  if (!shouldStoreMockNotification(normalizedCategory) || notifications.some((item) => item.id === notification.id)) return false;
  notifications = [normalizeMockNotificationItem(notification, normalizedCategory), ...notifications];
  return true;
}

function removeMockGreetingRequestNotificationsFor(ownerId: string) {
  notifications = notifications.filter((item) => {
    const kind = normalizeMockNotificationKind(item.kind) || inferMockNotificationKind(item);
    return !((kind === 'greeting_request' || kind === 'pet_circle_greeting') && item.ownerId === ownerId);
  });
}

function removeMockSocialNotificationsForBlockedOwner(ownerId: string) {
  const blockedPostIds = new Set(nearbyMoments.filter((moment) => moment.ownerId === ownerId).map((moment) => moment.id));
  const blockedCommentIds = new Set(petCircleComments.filter((comment) => comment.ownerId === ownerId).map((comment) => comment.id));
  notifications = notifications.filter((item) => {
    if (item.ownerId === ownerId) return false;
    if (item.postId && blockedPostIds.has(item.postId)) return false;
    if (item.commentId && blockedCommentIds.has(item.commentId)) return false;
    return true;
  });
}

function calendarDatePart(value?: string) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  return match && isValidIsoCalendarDate(match[1]) ? match[1] : '';
}

function normalizeCalendarDate(value?: string, fallback = todayIsoDate()) {
  return calendarDatePart(value) || calendarDatePart(fallback) || todayIsoDate();
}

function sourceDateForMockHealthMemo(memo: HealthMemo) {
  if (memo.source !== 'pet_circle' || !memo.sourceId) return '';
  return nearbyMoments.find((moment) => moment.id === memo.sourceId && moment.ownedByMe)?.createdAt || '';
}

function vaccineStatusCopy(status: VaccinePlan['status']) {
  if (status === 'done') return '已完成';
  if (status === 'overdue') return '已逾期';
  return '计划中';
}

function buildHealthCalendarEvents(): HealthCalendarEvent[] {
  ensureMockVaccineTemplateCoverage();
  return [
    ...weights.map((record) => ({
      date: normalizeCalendarDate(record.recordedAt),
      detail: `${record.kg} kg${record.note ? ` · ${record.note}` : ''}`,
      id: `calendar-weight-${record.id}`,
      sourceId: record.id,
      title: '体重记录',
      type: 'weight' as const,
    })),
    ...vaccines.map((vaccine) => ({
      date: normalizeCalendarDate(vaccine.dueAt),
      detail: vaccineStatusCopy(vaccine.status),
      id: `calendar-vaccine-${vaccine.id}`,
      sourceId: vaccine.id,
      status: vaccine.status,
      title: vaccine.name,
      type: 'vaccine' as const,
    })),
    ...memos.map((memo) => ({
      date: normalizeCalendarDate(sourceDateForMockHealthMemo(memo), healthMemoCalendarDate(memo)),
      detail: memo.content,
      id: `calendar-memo-${memo.id}`,
      sourceId: memo.id,
      title: memo.title,
      type: 'memo' as const,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.id).localeCompare(String(b.id)));
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidIsoCalendarDate(value: string) {
  const text = String(value || '').trim();
  if (!isIsoDate(text)) return false;
  const date = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

function daysInDateMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function isValidPetBirthdayValue(value: string) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) return false;
  const now = new Date();
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = match[3] ? Number(match[3]) : null;
  const currentYear = now.getFullYear();
  if (!Number.isInteger(year) || year < currentYear - 30 || year > currentYear) return false;
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) return false;
  if (day !== null) {
    if (month === null || !Number.isInteger(day) || day < 1) return false;
    if (day > daysInDateMonth(year, month)) return false;
  }
  if (year !== currentYear) return true;
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  if (month !== null && month > currentMonth) return false;
  if (month === currentMonth && day !== null && day > currentDay) return false;
  return true;
}

function syncMockPetWeightFromRecords() {
  const petId = activePetId || pets[0]?.id;
  if (!petId) return;
  const latest = weights[0];
  pets = pets.map((item) => (item.id === petId ? { ...item, weightKg: latest?.kg } : item));
}

function buildWeightTrend(records: WeightRecord[]): WeightTrend {
  const sortedRecords = [...records].sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
  const current = sortedRecords[0];
  const previous = sortedRecords[1];
  if (!current) {
    return { changeKg: 0, changePercent: 0, direction: 'flat', records: [], status: 'empty', summary: '暂无体重记录' };
  }
  if (!previous) {
    return { changeKg: 0, changePercent: 0, currentKg: current.kg, direction: 'flat', records: sortedRecords, status: 'insufficient_data', summary: '已有一次记录，继续记录后会生成趋势' };
  }
  const changeKg = Number((current.kg - previous.kg).toFixed(2));
  const changePercent = previous.kg ? Number(((changeKg / previous.kg) * 100).toFixed(1)) : 0;
  const direction = Math.abs(changeKg) < 0.05 ? 'flat' : changeKg > 0 ? 'up' : 'down';
  const status = Math.abs(changePercent) >= 8 ? 'watch' : 'stable';
  return {
    changeKg,
    changePercent,
    currentKg: current.kg,
    direction,
    previousKg: previous.kg,
    records: sortedRecords,
    status,
    summary: status === 'watch' ? '近期体重变化较快，建议持续观察' : direction === 'flat' ? '体重整体稳定' : '体重有轻微变化，继续保持记录',
  };
}

function daysUntilDate(value?: string) {
  if (!value) return null;
  const dueAt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dueAt.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueAt.setHours(0, 0, 0, 0);
  return Math.ceil((dueAt.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function mockVaccineReminderCopy(vaccine?: VaccinePlan) {
  const days = daysUntilDate(vaccine?.dueAt);
  if (days === null) return '接种日期待确认';
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `${days} 天后到期`;
}

function shouldCreateMockHealthReminderNotification(vaccine?: VaccinePlan) {
  const days = daysUntilDate(vaccine?.dueAt);
  return vaccine?.status !== 'done' && days !== null && days <= 7;
}

function mockHealthReminderNotificationId(vaccine: VaccinePlan) {
  return `mock-health-reminder-${vaccine.id}`;
}

function activeMockHealthReminderNotificationIds() {
  const enabled = new Set(vaccineReminderIds);
  return new Set(
    vaccines
      .filter((vaccine) => enabled.has(vaccine.id) && shouldCreateMockHealthReminderNotification(vaccine))
      .map(mockHealthReminderNotificationId)
  );
}

function pruneMockHealthReminderNotifications() {
  const activeIds = activeMockHealthReminderNotificationIds();
  const next = notifications.filter((notification) => !String(notification.id).startsWith('mock-health-reminder-') || activeIds.has(notification.id));
  const changed = next.length !== notifications.length;
  notifications = next;
  return changed;
}

const mockVaccineNotificationFixtureId = 'mock-vaccine-notification';

function ensureMockVaccineNotificationFixture() {
  if (getMockWebPreviewParam('mockVaccineNotification') !== 'enabled') return;
  if (!vaccines.some((vaccine) => vaccine.id === mockVaccineNotificationFixtureId)) {
    vaccines = [
      {
        dueAt: todayIsoDate(),
        id: mockVaccineNotificationFixtureId,
        name: 'PW notification vaccine',
        status: 'due' as const,
      },
      ...vaccines,
    ].sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  }
  vaccineReminderIds = [...new Set([mockVaccineNotificationFixtureId, ...vaccineReminderIds])];
}

function ensureMockHealthReminderNotifications() {
  ensureMockVaccineNotificationFixture();
  let changed = pruneMockHealthReminderNotifications();
  const enabled = new Set(vaccineReminderIds);
  vaccines
    .filter((vaccine) => enabled.has(vaccine.id) && shouldCreateMockHealthReminderNotification(vaccine))
    .forEach((vaccine) => {
      const added = addMockNotification({
        id: mockHealthReminderNotificationId(vaccine),
        kind: 'vaccine_reminder',
        read: false,
        text: `${vaccine.name}：${mockVaccineReminderCopy(vaccine)}，记得按宠物医院建议确认时间。`,
        title: '健康提醒',
        vaccineId: vaccine.id,
      });
      changed = added || changed;
    });
  return changed;
}

function buildHealthSummary(): HealthSummary {
  ensureMockVaccineTemplateCoverage();
  const petId = activePetId || pets[0]?.id;
  const pet = pets.find((item) => item.id === petId);
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
  const trend = buildWeightTrend(weights);
  const pendingVaccines = vaccines.filter((item) => item.status !== 'done');
  const urgentVaccines = pendingVaccines.filter((item) => {
    const days = daysUntilDate(item.dueAt);
    return days !== null && days <= 14;
  });
  return {
    healthScore: pet.healthScore ?? 92,
    latestMemo: memos[0],
    latestWeightKg: weights[0]?.kg ?? pet.weightKg,
    latestWeightRecordedAt: weights[0]?.recordedAt,
    memoCount: memos.length,
    nextVaccine: pendingVaccines[0] ?? vaccines[0],
    pendingVaccineCount: pendingVaccines.length,
    urgentVaccineCount: urgentVaccines.length,
    vaccineReminderIds,
    weightStatus: trend.status,
    weightSummary: trend.summary,
  };
}

function detectMockPetMedicalEmergency(text: string): ChatMessage['medicalAlert'] | null {
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

function activeMockPet() {
  return pets.find((pet) => pet.id === activePetId) ?? pets[0];
}

function mockPetChatVoiceParticle(pet = activeMockPet()) {
  if (pet?.species === 'cat') return '喵~';
  if (pet?.species === 'dog') return '汪~';
  return '';
}

function mockPetChatOpener() {
  const particle = mockPetChatVoiceParticle();
  return particle ? `主人，${particle} ` : '主人，';
}

function mockPetMedicalSafetyReply(text: string) {
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

function createMockMedicalAlertFromPetChat(text: string) {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/.test(rawText)) return null;
  const emergency = detectMockPetMedicalEmergency(rawText);
  if (!emergency) return null;
  const pet = pets.find((item) => item.id === activePetId) ?? pets[0];
  const title = emergency.reason === 'toxic_ingestion' ? '误食风险观察' : '紧急健康观察';
  const content = `${pet?.name ? `${pet.name}：` : ''}${rawText}`.slice(0, 240);
  let memo = memos.slice(0, 8).find((item) => item.title === title && item.content === content);
  if (!memo) {
    memo = {
      content,
      createdAt: todayIsoDate(),
      id: `mock-medical-alert-${Date.now()}`,
      title,
      updatedAt: todayIsoDate(),
    };
    memos = [memo, ...memos];
  }
  const notificationId = `mock-medical-alert-notification-${memo.id}`;
  addMockNotification({
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

function mockFallbackPetChatReply(text: string) {
  const emergency = detectMockPetMedicalEmergency(text);
  if (emergency) return mockPetMedicalSafetyReply(text);
  const opener = mockPetChatOpener();
  if (/吐|拉稀|腹泻|不吃|不喝|没精神|发烧|咳|喘|抽搐|流血|疼|瘸|异常|医院|疫苗|驱虫/.test(text)) {
    return `${opener}我今天有点让人担心，我先把这件事放进健康观察里。\n\n我不能替代兽医判断，但如果症状持续、精神明显变差，或出现呕吐腹泻、呼吸异常、拒食拒水，建议尽快联系宠物医院。你也可以补充一下：这个情况大概持续多久了？`;
  }
  if (/散步|出门|公园|遛/.test(text)) {
    return `${opener}听起来我会很开心。出门前可以带好牵引、饮水和拾便袋，尽量选开阔的宠物友好地点。\n\n要不要顺手把这次散步记录到我的备忘里？`;
  }
  if (/吃|饭|零食|食欲/.test(text)) {
    return `${opener}收到，我会把我今天的饮食状态放在心上。食欲稳定通常是个好信号，零食还是控制一点点更安心。\n\n今天我吃得比平时多、少，还是差不多？`;
  }
  return `${opener}我收到啦。\n\n这件事我会当作今天的小记录记在心里。你愿意再告诉我一点细节吗，比如我当时的心情、食欲或者运动量？`;
}

export const mockApi = {
  config: {
    async getAppConfig(): Promise<ApiResult<AppRemoteConfig>> {
      await wait(80);
      return success(mockAppRemoteConfig);
    },
  },

  analytics: {
    async trackEvent(_input: AppAnalyticsEventInput): Promise<ApiResult<{ accepted: boolean; disabled?: boolean; eventId?: string }>> {
      await wait(40);
      return success({ accepted: true, eventId: `mock-event-${Date.now()}` });
    },
  },

  ai: {
    async getUsage(): Promise<ApiResult<AiUsageSummary>> {
      await wait(120);
      const day = todayIsoDate();
      return success({
        daily: {
          petAvatar: {
            count: mockPetAvatarDailyCount,
            day,
            limit: mockPetAvatarDailyLimit,
            remaining: Math.max(0, mockPetAvatarDailyLimit - mockPetAvatarDailyCount),
          },
          petChat: {
            count: mockPetChatDailyCount,
            day,
            limit: 80,
            remaining: Math.max(0, 80 - mockPetChatDailyCount),
          },
        },
        deepseek: {
          cacheHitTokens: 0,
          cacheMissTokens: 0,
          completionTokens: 0,
          model: 'mock',
          promptTokens: 0,
          requests: mockPetChatDailyCount,
          totalTokens: 0,
        },
        petAvatarProvider: 'mock',
        gptImage2: {
          cost: 0,
          creditsCost: 0,
          failed: 0,
          requests: 0,
          succeeded: 0,
        },
        ttapiFlux: {
          failed: 0,
          quota: 0,
          requests: mockPetAvatarDailyCount,
          succeeded: mockPetAvatarDailyCount,
        },
        ttapiMidjourney: {
          failed: 0,
          quota: 0,
          requests: 0,
          succeeded: 0,
        },
        updatedAt: new Date().toISOString(),
      });
    },
  },

  support: {
    async getSanctionAppeals(): Promise<ApiResult<SanctionAppealList>> {
      await wait(100);
      return success(buildMockSanctionAppealList());
    },

    async getTicket(ticketId: string): Promise<ApiResult<SupportTicketDetail>> {
      await wait(100);
      const ticket = supportTickets.find((item) => item.id === ticketId);
      if (!ticket) return error<SupportTicketDetail>('工单不存在或已失效', false, undefined, 'RESOURCE_NOT_FOUND');
      return success({ ...ticket, ...publicSupportTicketItem(ticket) });
    },

    async getTickets(): Promise<ApiResult<SupportTicketList>> {
      await wait(100);
      return success(buildSupportTicketList());
    },

    async rateTicket(ticketId: string, rating: number, comment = ''): Promise<ApiResult<SupportTicketDetail>> {
      await wait(120);
      const ticket = supportTickets.find((item) => item.id === ticketId);
      if (!ticket) return error<SupportTicketDetail>('工单不存在或已失效', false, undefined, 'RESOURCE_NOT_FOUND');
      if (ticket.status !== 'closed' && ticket.status !== 'resolved') return error('工单结束处理后才能评价', false);
      if (rating < 1 || rating > 5) return error('请选择 1-5 分满意度', false);
      const now = new Date().toISOString();
      ticket.satisfaction = {
        comment: comment.trim(),
        createdAt: ticket.satisfaction?.createdAt || now,
        rating,
        updatedAt: now,
      };
      ticket.updatedAt = now;
      return success({ ...ticket, ...publicSupportTicketItem(ticket) });
    },

    async reopenTicket(ticketId: string, content: string, attachments: SupportTicketAttachmentDraft[] = []): Promise<ApiResult<SupportTicketDetail>> {
      await wait(140);
      const cleanContent = content.trim();
      const ticket = supportTickets.find((item) => item.id === ticketId);
      if (!ticket) return error<SupportTicketDetail>('工单不存在或已失效', false, undefined, 'RESOURCE_NOT_FOUND');
      if (ticket.status !== 'closed' && ticket.status !== 'resolved') return error('当前工单还在处理中，不需要重新打开', false);
      const parsedAttachments = mockSupportTicketAttachments(attachments);
      if (!cleanContent && !parsedAttachments.length) return error('请填写需要继续处理的问题或添加截图', false);
      if (cleanContent.length > 1000) return error('重开说明最多 1000 个字', false);
      const message: SupportTicketMessage = {
        attachments: parsedAttachments,
        author: 'user',
        authorName: '我',
        content: cleanContent,
        createdAt: new Date().toISOString(),
        id: `ticket-reopen-${Date.now()}`,
        type: 'reopen',
      };
      ticket.messages = [...ticket.messages, message];
      ticket.status = 'reviewing';
      ticket.updatedAt = message.createdAt;
      ticket.lastActivityAt = message.createdAt;
      ticket.reopenCount = (ticket.reopenCount ?? 0) + 1;
      return success({ ...ticket, ...publicSupportTicketItem(ticket) });
    },

    async replyTicket(ticketId: string, content: string, attachments: SupportTicketAttachmentDraft[] = []): Promise<ApiResult<SupportTicketDetail>> {
      await wait(120);
      const cleanContent = content.trim();
      if (cleanContent.length > 1000) return error('补充内容最多 1000 个字', false);
      const ticket = supportTickets.find((item) => item.id === ticketId);
      if (!ticket) return error<SupportTicketDetail>('工单不存在或已失效', false, undefined, 'RESOURCE_NOT_FOUND');
      if (ticket.status === 'closed' || ticket.status === 'resolved') return error('工单已关闭，不能继续补充', false);
      const parsedAttachments = mockSupportTicketAttachments(attachments);
      if (!cleanContent && !parsedAttachments.length) return error('请填写补充内容或添加截图', false);
      const message: SupportTicketMessage = {
        attachments: parsedAttachments,
        author: 'user',
        authorName: '我',
        content: cleanContent,
        createdAt: new Date().toISOString(),
        id: `ticket-user-reply-${Date.now()}`,
        type: 'user_reply',
      };
      ticket.messages = [...ticket.messages, message];
      ticket.status = 'reviewing';
      ticket.updatedAt = message.createdAt;
      ticket.lastActivityAt = message.createdAt;
      return success({ ...ticket, ...publicSupportTicketItem(ticket) });
    },

    async submitSanctionAppeal(content: string, sanctionId?: string): Promise<ApiResult<SanctionAppealItem>> {
      await wait(140);
      const cleanContent = content.trim();
      if (!cleanContent) return error('请填写申诉说明', false);
      if (cleanContent.length < 8) return error('申诉说明至少 8 个字', false);
      if (cleanContent.length > 1000) return error('申诉说明最多 1000 个字', false);
      const duplicate = sanctionAppeals.find((appeal) => (appeal.appealType || 'sanction') === 'sanction' && (appeal.status === 'pending' || appeal.status === 'reviewing'));
      if (duplicate) return success({ ...duplicate, duplicate: true });
      const now = new Date().toISOString();
      const appeal: SanctionAppealItem = {
        appealType: 'sanction',
        content: cleanContent,
        createdAt: now,
        id: `appeal-${Date.now()}`,
        sanctionId: sanctionId || 'mock-sanction-active',
        sanctionReason: '模拟账号限制，可在真机后端场景中由后台处理',
        sanctionStatus: 'active',
        sanctionType: 'freeze',
        sanctionTypeLabel: '冻结',
        status: 'pending',
        updatedAt: now,
      };
      sanctionAppeals = [appeal, ...sanctionAppeals];
      return success(appeal);
    },

    async submitReportAppeal(reportId: string, content: string): Promise<ApiResult<SanctionAppealItem>> {
      await wait(140);
      const cleanContent = content.trim();
      if (!reportId) return error('请选择要申诉的举报处理结果', false);
      if (!cleanContent) return error('请填写申诉说明', false);
      if (cleanContent.length < 8) return error('申诉说明至少 8 个字', false);
      if (cleanContent.length > 1000) return error('申诉说明最多 1000 个字', false);
      const target = reportAppealTargets.find((item) => item.reportId === reportId);
      if (!target) return error('当前没有可申诉的举报处理结果', false);
      const duplicate = sanctionAppeals.find((appeal) => appeal.appealType === 'report' && appeal.reportId === reportId && (appeal.status === 'pending' || appeal.status === 'reviewing'));
      if (duplicate) return success({ ...duplicate, duplicate: true });
      const now = new Date().toISOString();
      const appeal: SanctionAppealItem = {
        appealType: 'report',
        content: cleanContent,
        createdAt: now,
        id: `report-appeal-${Date.now()}`,
        reportId,
        reportReason: target.reviewReason,
        reportRole: target.reportRole,
        reportRoleLabel: target.reportRoleLabel,
        reportStatus: target.reportStatus,
        reportStatusLabel: target.reportStatusLabel,
        sanctionTypeLabel: target.targetLabel || '举报处理',
        status: 'pending',
        subjectLabel: '举报处理申诉',
        targetId: target.targetId,
        targetLabel: target.targetLabel,
        targetType: target.targetType,
        title: `${target.targetLabel || '内容'}举报处理申诉`,
        updatedAt: now,
      };
      sanctionAppeals = [appeal, ...sanctionAppeals];
      reportAppealTargets = reportAppealTargets.filter((item) => item.reportId !== reportId);
      return success(appeal);
    },

    async submitFeedback(content: string, category: FeedbackCategory = 'other', contact?: string): Promise<ApiResult<FeedbackSubmission>> {
      await wait(120);
      const cleanContent = content.trim();
      if (!cleanContent) return error('请填写反馈内容', false);
      if (cleanContent.length > 1000) return error('反馈内容最多 1000 个字', false);
      const feedbackId = `feedback-${Date.now()}`;
      const feedback: FeedbackSubmission = {
        category,
        contact: contact?.trim() || undefined,
        content: cleanContent,
        createdAt: new Date().toISOString(),
        id: feedbackId,
        status: 'received',
        supportTicketId: `ticket-${feedbackId}`,
      };
      createMockSupportTicket(feedback);
      feedbackSubmissions = [feedback, ...feedbackSubmissions];
      return success(feedback);
    },
  },

  legal: {
    async getPrivacy(): Promise<ApiResult<LegalDocument>> {
      await wait(80);
      return success(legalDocuments.privacy);
    },

    async getTerms(): Promise<ApiResult<LegalDocument>> {
      await wait(80);
      return success(legalDocuments.terms);
    },
  },

  account: {
    async getMe(): Promise<ApiResult<UserProfile>> {
      await wait(120);
      return success(buildMockUserProfile());
    },

    async confirmDeletion(code: string): Promise<ApiResult<AccountDeletionConfirmResult>> {
      await wait(180);
      if (!mockAccountDeletionRequest) return error<AccountDeletionConfirmResult>('请先获取注销验证码', true, undefined, 'ACCOUNT_DELETE_CODE_REQUIRED');
      if (Date.now() > Number(mockAccountDeletionRequest.expiresAt || 0)) {
        mockAccountDeletionRequest = null;
        return error<AccountDeletionConfirmResult>('注销验证码已过期，请重新获取', true, undefined, 'ACCOUNT_DELETE_CODE_EXPIRED');
      }
      if (String(code || '').trim() !== '962464' && String(code || '').trim() !== mockAccountDeletionRequest.code) {
        return error<AccountDeletionConfirmResult>('注销验证码错误，请检查后重试', true, undefined, 'ACCOUNT_DELETE_CODE_INVALID');
      }
      const now = Date.now();
      const scheduledDeletionAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
      mockAccountDeletion = {
        confirmedAt: new Date(now).toISOString(),
        remainingDays: 30,
        requestedAt: mockAccountDeletionRequest.requestedAt,
        scheduledDeletionAt,
        status: 'pending',
      };
      mockAccountDeletionRequest = null;
      return success({ account: buildMockAccountSnapshot(), phone: currentMockPhone, scheduledDeletionAt, status: 'deletion_pending' });
    },

    async requestDeletion(): Promise<ApiResult<AccountDeletionRequestResult>> {
      await wait(160);
      if (mockAccountDeletion?.status === 'pending') {
        return success({ accountDeletion: mockAccountDeletion, phone: currentMockPhone, requested: false });
      }
      const now = Date.now();
      mockAccountDeletionRequest = {
        availableAt: now,
        code: '962464',
        expiresAt: now + OTP_TTL_MS,
        phone: currentMockPhone,
        requested: true,
        requestedAt: new Date(now).toISOString(),
      };
      return success(mockAccountDeletionRequest);
    },

    async updateMe(patch: OwnerProfilePatch): Promise<ApiResult<UserProfile>> {
      await wait(120);
      const ownerName = String(patch.ownerName ?? '').trim();
      const ownerBio = String(patch.ownerBio ?? '').trim();
      const ownerAvatarUrl = String(patch.ownerAvatarUrl ?? '').trim();
      if (!ownerName) return error('请输入昵称', false);
      if (ownerName.length > 14) return error('昵称最多 14 个字', false);
      if (ownerBio.length > 60) return error('简介最多 60 个字', false);
      if (ownerAvatarUrl.length > 2000) return error('头像地址过长，请重新选择', false);
      mockOwnerName = ownerName;
      mockOwnerBio = ownerBio;
      mockOwnerAvatarUrl = ownerAvatarUrl;
      return success(buildMockUserProfile());
    },
  },

  auth: {
    async sendSmsCode(phoneInput: string): Promise<ApiResult<SmsCodeTicket>> {
      await wait();
      const phone = extractMainlandChinaPhone([phoneInput]);
      if (!phone) return error('请输入正确的手机号', false);

      const now = Date.now();
      const lastSentAt = lastSmsSentAtByPhone[phone] ?? 0;
      if (now - lastSentAt < SMS_COOLDOWN_MS) {
        return error('操作太频繁，请稍后再试', true, {
          availableAt: lastSentAt + SMS_COOLDOWN_MS,
          code: smsCodeByPhone[phone] ?? '',
          expiresAt: now + OTP_TTL_MS,
          phone,
        });
      }

      const usage = smsDailyUsageFor(phone);
      if (usage.count >= SMS_DAILY_LIMIT) {
        return error(`今天验证码发送次数已达上限（${SMS_DAILY_LIMIT} 次），请明天再试`, true, {
          availableAt: lastSentAt + SMS_COOLDOWN_MS,
          code: smsCodeByPhone[phone] ?? '',
          expiresAt: now + OTP_TTL_MS,
          phone,
        });
      }
      const deviceId = await getLumiiInstallationId();
      const deviceUsage = smsDeviceDailyUsageFor(deviceId);
      if (deviceUsage.count >= SMS_DEVICE_DAILY_LIMIT) {
        return error(`当前设备今天获取验证码次数已达上限（${SMS_DEVICE_DAILY_LIMIT} 次），请明天再试`, true, {
          availableAt: lastSentAt + SMS_COOLDOWN_MS,
          code: smsCodeByPhone[phone] ?? '',
          expiresAt: now + OTP_TTL_MS,
          phone,
        });
      }

      const code = '962464';
      lastSmsSentAtByPhone[phone] = now;
      smsCodeByPhone[phone] = code;
      delete smsLockedByPhone[phone];
      smsVerifyAttemptsByPhone[phone] = 0;
      usage.count += 1;
      deviceUsage.count += 1;
      return success({ availableAt: now + SMS_COOLDOWN_MS, code, expiresAt: now + OTP_TTL_MS, phone });
    },

    async verifySmsCode(phone: string, code: string, expiresAt: number): Promise<ApiResult<AuthSession>> {
      await wait(260);
      const storedCode = smsCodeByPhone[phone];
      if (smsLockedByPhone[phone]) {
        return error<AuthSession>('验证码错误次数过多，请重新获取', true, undefined, 'SMS_CODE_ATTEMPT_LIMITED');
      }
      if (storedCode && Date.now() > expiresAt) return error('验证码已过期，请重新获取', true);
      if (code !== '962464' && storedCode !== code) {
        if (storedCode) {
          const attempts = (smsVerifyAttemptsByPhone[phone] ?? 0) + 1;
          const attemptsRemaining = Math.max(0, SMS_VERIFY_MAX_ATTEMPTS - attempts);
          smsVerifyAttemptsByPhone[phone] = attempts;
          if (attemptsRemaining <= 0) {
            delete smsCodeByPhone[phone];
            smsLockedByPhone[phone] = true;
            delete smsVerifyAttemptsByPhone[phone];
            return error<AuthSession>('验证码错误次数过多，请重新获取', true, undefined, 'SMS_CODE_ATTEMPT_LIMITED');
          }
          return error<AuthSession>('验证码错误，请检查后重试', true, undefined, 'SMS_CODE_INVALID');
        }
        return error<AuthSession>('验证码错误，请检查后重试', true, undefined, 'SMS_CODE_INVALID');
      }
      if (storedCode) {
        delete smsCodeByPhone[phone];
        delete smsVerifyAttemptsByPhone[phone];
      }
      currentMockPhone = phone;
      if (mockAccountDeletion?.status === 'pending') {
        mockAccountDeletion = null;
        mockAccountDeletionRequest = null;
      }
      return success({ account: buildMockAccountSnapshot(), phone, token: `mock-token-${phone}` });
    },

    async refreshSession(session?: AuthSession): Promise<ApiResult<AuthSession>> {
      await wait(120);
      if (session?.phone) currentMockPhone = session.phone;
      return success({ account: buildMockAccountSnapshot(), phone: currentMockPhone, token: `mock-token-${currentMockPhone}` });
    },

    async logout(): Promise<ApiResult<true>> {
      await wait(180);
      return success(true);
    },
  },

  permissions: {
    async getPermissionState(): Promise<ApiResult<PermissionStateMap>> {
      await wait(120);
      return success(mockPermissions);
    },

    async savePermissionState(next: Partial<PermissionStateMap>, completed = false): Promise<ApiResult<PermissionStateMap>> {
      await wait(120);
      if (typeof completed !== 'boolean') return error<PermissionStateMap>('权限引导完成状态必须是开启或关闭', false, undefined, 'PERMISSIONS_PATCH_INVALID');
      const permissionPatch = parseMockPermissionPatch(next);
      if (permissionPatch.error) return error<PermissionStateMap>(permissionPatch.error, false, undefined, 'PERMISSIONS_PATCH_INVALID');
      mockPermissions = { ...mockPermissions, ...(permissionPatch.patch ?? {}) };
      mockPermissionsOnboardingCompleted = mockPermissionsOnboardingCompleted || completed;
      return success(mockPermissions);
    },
  },

  settings: {
    async getUserSettings(): Promise<ApiResult<UserSettings>> {
      await wait(120);
      return success(mockUserSettings);
    },

    async updateUserSettings(patch: Partial<UserSettings>): Promise<ApiResult<UserSettings>> {
      await wait(120);
      const settingsPatch = parseMockUserSettingsPatch(patch);
      if (settingsPatch.error) return error<UserSettings>(settingsPatch.error, false, undefined, 'SETTINGS_PATCH_INVALID');
      mockUserSettings = { ...mockUserSettings, ...(settingsPatch.patch ?? {}) };
      return success(mockUserSettings);
    },
  },

  pets: {
    async getTaxonomy(): Promise<ApiResult<PetTaxonomy>> {
      await wait(100);
      return success(petTaxonomy);
    },

    async createPet(input: CreatePetInput): Promise<ApiResult<PetProfile>> {
      await wait();
      const petInput = parseMockPetProfilePayload(input);
      if (petInput.error) return error<PetProfile>(petInput.error, false, undefined, 'PET_PROFILE_INVALID');
      const pet: PetProfile = {
        ...(petInput.patch as CreatePetInput),
        createdAt: new Date().toISOString(),
        healthScore: 96,
        id: `pet-${Date.now()}`,
        personality: ['亲人', '爱笑', '饭量稳定'],
      };
      pets = [pet, ...pets];
      activePetId = pet.id;
      return success(pet);
    },

    async updatePet(id: string, patch: PetProfilePatch): Promise<ApiResult<PetProfile>> {
      await wait();
      const petPatch = parseMockPetProfilePayload(patch, { partial: true });
      if (petPatch.error) return error<PetProfile>(petPatch.error, false, undefined, 'PET_PROFILE_INVALID');
      pets = pets.map((pet) => {
        if (pet.id !== id) return pet;
        const nextPet = { ...pet, ...(petPatch.patch ?? {}) };
        for (const key of petPatch.unset ?? []) delete nextPet[key];
        return nextPet;
      });
      const pet = pets.find((item) => item.id === id);
      return pet ? success(pet) : error('宠物档案不存在', false);
    },

    async getPet(id: string): Promise<ApiResult<PetProfile>> {
      await wait(120);
      ensureMockMultiPetFixtures();
      const pet = pets.find((item) => item.id === id);
      return pet ? success(pet) : error('宠物档案不存在', false);
    },

    async deletePet(id: string): Promise<ApiResult<PetProfile[]>> {
      await wait(160);
      ensureMockMultiPetFixtures();
      if (!pets.some((item) => item.id === id)) return error('宠物档案不存在', false);
      pets = pets.filter((item) => item.id !== id);
      if (activePetId === id) activePetId = pets[0]?.id ?? '';
      return success(pets);
    },

    async listPets(): Promise<ApiResult<PetProfile[]>> {
      await wait(160);
      ensureMockMultiPetFixtures();
      return success(pets);
    },

    async setActivePet(id: string): Promise<ApiResult<PetProfile>> {
      await wait(160);
      ensureMockMultiPetFixtures();
      const pet = pets.find((item) => item.id === id);
      if (!pet) return error('宠物档案不存在', false);
      activePetId = id;
      return success(pet);
    },

    getActivePet(): PetProfile | null {
      ensureMockMultiPetFixtures();
      return pets.find((pet) => pet.id === activePetId) ?? pets[0] ?? null;
    },
  },

  avatar: {
    async uploadPetMedia(input?: UploadPetMediaInput): Promise<ApiResult<UploadedPetMedia>> {
      await wait();
      const analysis = analyzeMockPetMediaUpload(input);
      const media: UploadedPetMedia = {
        analysis,
        fileUrl: input?.previewUrl ?? goldenRetrieverPhotoUrl,
        mediaId: `media-${Date.now()}`,
        previewUrl: input?.previewUrl ?? goldenRetrieverPhotoUrl,
        quality: analysis.status === 'blocked' ? 'blocked' : analysis.status === 'warning' ? 'warning' : 'good',
      };
      uploadedMediaById = { ...uploadedMediaById, [media.mediaId]: media };
      return success(media);
    },

    async getUploadedMedia(mediaId: string): Promise<ApiResult<UploadedPetMedia>> {
      await wait(120);
      const media = uploadedMediaById[mediaId];
      return media ? success(media) : error('上传照片已失效，请重新上传', true);
    },

    async startGeneration(mediaId: string): Promise<ApiResult<AvatarJob>> {
      await wait();
      if (mockPetAvatarDailyCount >= mockPetAvatarDailyLimit) {
        return error('今日灵伴形象生成次数已用完，请明天再试', true);
      }
      mockPetAvatarDailyCount += 1;
      const id = `job-${mediaId}`;
      generationProgressById[id] = 24;
      const pet = pets.find((item) => item.id === activePetId) ?? pets[0];
      const job: AvatarJob = { createdAt: Date.now(), id, mediaId, petId: pet?.id, petName: pet?.name, progress: 24, provider: 'mock', status: 'processing', updatedAt: Date.now() };
      avatarJobsById = { ...avatarJobsById, [id]: job };
      return success(job);
    },

    async getGenerationStatus(id: string): Promise<ApiResult<AvatarJob>> {
      await wait(500);
      const progress = Math.min(100, (generationProgressById[id] ?? 24) + 38);
      generationProgressById[id] = progress;
      const previous = avatarJobsById[id];
      if (!previous) return error('生成任务不存在', true);
      const job: AvatarJob = {
        ...previous,
        candidateUrls:
          progress >= 100
            ? [goldenRetrieverAvatarUrl, goldenRetrieverAvatarUrl, goldenRetrieverAvatarUrl]
            : previous.candidateUrls,
        id,
        progress,
        resultUrl:
          progress >= 100
            ? goldenRetrieverAvatarUrl
            : undefined,
        status: progress >= 100 ? 'ready' : 'processing',
        updatedAt: Date.now(),
      };
      avatarJobsById = { ...avatarJobsById, [id]: job };
      return success(job);
    },

    async getLatestGeneration(petId?: string): Promise<ApiResult<AvatarJob | null>> {
      await wait(120);
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const job = Object.values(avatarJobsById)
        .filter((item) => !item.acceptedAt)
        .filter((item) => item.status === 'processing' || item.status === 'ready')
        .filter((item) => !petId || !item.petId || item.petId === petId)
        .filter((item) => Number(item.updatedAt || item.createdAt || 0) >= cutoff)
        .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0] ?? null;
      return success(job);
    },

    async getLatestAnimation(petId?: string): Promise<ApiResult<AvatarAnimationJob | null>> {
      await wait(160);
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const job = Object.values(avatarAnimationJobsById)
        .filter((item) => !petId || !item.petId || item.petId === petId)
        .filter((item) => Number(item.updatedAt || item.createdAt || 0) >= cutoff)
        .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0] ?? null;
      if (!job) return success(null);
      if (job.status === 'processing') {
        const progress = Math.min(92, (animationProgressById[job.id] ?? job.progress ?? 18) + 14);
        animationProgressById[job.id] = progress;
        const updatedJob: AvatarAnimationJob = { ...job, progress, providerStatus: 'processing', updatedAt: Date.now() };
        avatarAnimationJobsById = { ...avatarAnimationJobsById, [job.id]: updatedJob };
        return success(updatedJob);
      }
      return success(job);
    },

    async getAnimationStatus(id: string): Promise<ApiResult<AvatarAnimationJob>> {
      await wait(220);
      const job = avatarAnimationJobsById[id];
      if (!job) return error('动效生成任务不存在', true);
      if (job.status === 'processing') {
        const progress = Math.min(92, (animationProgressById[id] ?? job.progress ?? 18) + 18);
        animationProgressById[id] = progress;
        const updatedJob: AvatarAnimationJob = { ...job, progress, providerStatus: 'processing', updatedAt: Date.now() };
        avatarAnimationJobsById = { ...avatarAnimationJobsById, [id]: updatedJob };
        return success(updatedJob);
      }
      return success(job);
    },

    async startAnimation(petId?: string): Promise<ApiResult<AvatarAnimationJob | null>> {
      await wait(180);
      const pet = pets.find((item) => item.id === (petId || activePetId)) ?? pets[0];
      if (!pet?.avatarUrl) return error('请先生成并保存静态灵伴形象', true);
      const existing = Object.values(avatarAnimationJobsById)
        .filter((item) => item.petId === pet.id)
        .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0];
      if (existing && existing.status === 'processing') return success(existing);
      const job = createMockAvatarAnimationJob(pet, pet.avatarUrl);
      pets = pets.map((item) => (item.id === pet.id ? { ...item, avatarAnimationJobId: job.id, avatarAnimationStatus: job.status } : item));
      return success(job);
    },

    async retryGeneration(jobId: string): Promise<ApiResult<AvatarJob>> {
      await wait();
      const previous = avatarJobsById[jobId];
      if (mockPetAvatarDailyCount >= mockPetAvatarDailyLimit) {
        return error('今日灵伴形象生成次数已用完，请明天再试', true);
      }
      if (!previous?.mediaId) return error('原始照片已失效，请重新上传', true);
      mockPetAvatarDailyCount += 1;
      const id = `job-${previous.mediaId}-${Date.now()}`;
      generationProgressById[id] = 24;
      const job: AvatarJob = { createdAt: Date.now(), id, mediaId: previous.mediaId, originalJobId: jobId, petId: previous.petId, petName: previous.petName, progress: 24, provider: 'mock', status: 'processing', updatedAt: Date.now() };
      avatarJobsById = { ...avatarJobsById, [id]: job };
      return success(job);
    },

    async acceptGeneration(jobId: string): Promise<ApiResult<PetProfile>> {
      await wait(160);
      const job = avatarJobsById[jobId];
      if (!job) return error('生成任务不存在', true);
      if (job.status !== 'ready' || !job.resultUrl) return error('形象还没生成完成，请稍后再试', true);
      const pet = pets.find((item) => item.id === activePetId) ?? pets[0];
      if (!pet) return error('请先添加宠物档案', false);
      const animationJob = createMockAvatarAnimationJob(pet, job.resultUrl);
      const updatedPet = { ...pet, avatarAnimationJobId: animationJob.id, avatarAnimationStatus: animationJob.status, avatarUrl: job.resultUrl };
      pets = pets.map((item) => (item.id === updatedPet.id ? updatedPet : item));
      activePetId = updatedPet.id;
      avatarJobsById = { ...avatarJobsById, [jobId]: { ...job, acceptedAt: new Date().toISOString(), acceptedPetId: updatedPet.id, updatedAt: Date.now() } };
      return success(updatedPet);
    },

    async sendGenerationFeedback(jobId: string, reason: AvatarGenerationFeedbackReason = 'other', content?: string): Promise<ApiResult<AvatarJob>> {
      await wait(120);
      const job = avatarJobsById[jobId];
      if (!job) return error('生成任务不存在', true);
      const updatedJob: AvatarJob = {
        ...job,
        feedback: {
          content: content?.trim() || undefined,
          createdAt: new Date().toISOString(),
          reason,
          status: 'received',
        },
      };
      avatarJobsById = { ...avatarJobsById, [jobId]: updatedJob };
      return success(updatedJob);
    },

    async saveAvatar(petId: string, avatarUrl: string): Promise<ApiResult<PetProfile>> {
      const pet = pets.find((item) => item.id === petId);
      if (pet) {
        const animationJob = createMockAvatarAnimationJob(pet, avatarUrl);
        return mockApi.pets.updatePet(petId, { avatarAnimationJobId: animationJob.id, avatarAnimationStatus: animationJob.status, avatarUrl });
      }
      return mockApi.pets.updatePet(petId, { avatarUrl });
    },
  },

  health: {
    async getHealthSummary(): Promise<ApiResult<HealthSummary>> {
      await wait(120);
      ensureMockMultiPetHealthFixtures();
      ensureMockBackdatedHealthCalendarFixtures();
      return success(buildHealthSummary());
    },

    async listHealthCalendar(): Promise<ApiResult<HealthCalendarEvent[]>> {
      await wait(140);
      ensureMockMultiPetHealthFixtures();
      ensureMockBackdatedHealthCalendarFixtures();
      return success(buildHealthCalendarEvents());
    },

    async recordWeight(kg: number, note?: string, recordedAt?: string): Promise<ApiResult<WeightRecord>> {
      await wait();
      const weightInput = parseMockWeightRecordPayload({ kg, note, recordedAt });
      if (weightInput.error) return error<WeightRecord>(weightInput.error, false, undefined, 'HEALTH_WEIGHT_INVALID');
      const record: WeightRecord = { id: `w-${Date.now()}`, ...(weightInput.record as Pick<WeightRecord, 'kg' | 'note' | 'recordedAt'>) };
      weights = [record, ...weights];
      syncMockPetWeightFromRecords();
      return success(record);
    },

    async updateWeightRecord(id: string, patch: Partial<Pick<WeightRecord, 'kg' | 'note' | 'recordedAt'>>): Promise<ApiResult<WeightRecord>> {
      await wait(160);
      const record = weights.find((item) => item.id === id);
      if (!record) return error('体重记录不存在', false);
      const weightInput = parseMockWeightRecordPayload(patch, { current: record, partial: true });
      if (weightInput.error) return error<WeightRecord>(weightInput.error, false, undefined, 'HEALTH_WEIGHT_INVALID');
      const nextRecord: WeightRecord = {
        ...record,
        ...(weightInput.record as Pick<WeightRecord, 'kg' | 'note' | 'recordedAt'>),
      };
      weights = weights.map((item) => (item.id === id ? nextRecord : item));
      syncMockPetWeightFromRecords();
      return success(nextRecord);
    },

    async deleteWeightRecord(id: string): Promise<ApiResult<WeightRecord[]>> {
      await wait(160);
      if (!weights.some((item) => item.id === id)) return error('体重记录不存在', false);
      weights = weights.filter((item) => item.id !== id);
      syncMockPetWeightFromRecords();
      return success(weights);
    },

    async listWeightRecords(): Promise<ApiResult<WeightRecord[]>> {
      await wait(140);
      ensureMockMultiPetHealthFixtures();
      return success(weights);
    },

    async getWeightTrend(): Promise<ApiResult<WeightTrend>> {
      await wait(140);
      ensureMockMultiPetHealthFixtures();
      return success(buildWeightTrend(weights));
    },

    async listVaccines(): Promise<ApiResult<VaccinePlan[]>> {
      await wait(140);
      ensureMockVaccineTemplateCoverage();
      return success(vaccines);
    },

    async createVaccinePlan(input: CreateVaccinePlanInput): Promise<ApiResult<VaccinePlan>> {
      await wait();
      const vaccineInput = parseMockVaccineCreatePayload(input);
      if (!vaccineInput.ok) return error<VaccinePlan>(vaccineInput.error, false, undefined, 'HEALTH_VACCINE_INVALID');
      const days = daysUntilDate(vaccineInput.input.dueAt);
      const vaccine: VaccinePlan = {
        dueAt: vaccineInput.input.dueAt,
        id: `v-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        name: vaccineInput.input.name,
        status: days !== null && days < 0 ? 'overdue' : 'due',
      };
      vaccines = [vaccine, ...vaccines].sort((left, right) => left.dueAt.localeCompare(right.dueAt));
      ensureMockHealthReminderNotifications();
      return success(vaccine);
    },

    async updateVaccineStatus(id: string, status: VaccinePlan['status']): Promise<ApiResult<VaccinePlan>> {
      await wait();
      ensureMockVaccineTemplateCoverage();
      const statusPatch = parseMockVaccineStatusPatch(status);
      if (!statusPatch.ok) return error<VaccinePlan>(statusPatch.error, false, undefined, 'HEALTH_VACCINE_INVALID');
      const vaccine = vaccines.find((item) => item.id === id);
      if (!vaccine) return error('疫苗计划不存在', false);
      const nextVaccine = { ...vaccine, status: statusPatch.status };
      vaccines = vaccines.map((item) => (item.id === id ? nextVaccine : item));
      if (statusPatch.status === 'done') {
        vaccineReminderIds = vaccineReminderIds.filter((item) => item !== id);
        pruneMockHealthReminderNotifications();
        addMockNotification({
          id: `mock-vaccine-done-${id}`,
          kind: 'vaccine_done',
          read: false,
          text: `${nextVaccine.name}已标记完成，健康时间线已更新。`,
          title: '疫苗计划已完成',
          vaccineId: id,
        });
      } else {
        ensureMockHealthReminderNotifications();
      }
      return success(nextVaccine);
    },

    async listVaccineReminderIds(): Promise<ApiResult<string[]>> {
      await wait(120);
      ensureMockVaccineTemplateCoverage();
      return success(vaccineReminderIds);
    },

    async setVaccineReminder(id: string, enabled: boolean): Promise<ApiResult<string[]>> {
      await wait(160);
      ensureMockVaccineTemplateCoverage();
      const reminderPatch = parseMockVaccineReminderPatch(enabled);
      if (!reminderPatch.ok) return error<string[]>(reminderPatch.error, false, undefined, 'HEALTH_REMINDER_INVALID');
      const vaccine = vaccines.find((item) => item.id === id);
      if (!vaccine) return error<string[]>('疫苗计划不存在', false);
      if (vaccine.status === 'done' && reminderPatch.enabled) return error<string[]>('已完成的疫苗计划无需开启提醒', false, undefined, 'HEALTH_REMINDER_INVALID');
      vaccineReminderIds = reminderPatch.enabled ? [...new Set([id, ...vaccineReminderIds])] : vaccineReminderIds.filter((item) => item !== id);
      if (reminderPatch.enabled) {
        ensureMockHealthReminderNotifications();
      } else {
        pruneMockHealthReminderNotifications();
      }
      return success(vaccineReminderIds);
    },

    async saveHealthMemo(title: string, content: string, options: Pick<HealthMemo, 'reminderAt' | 'reminderEnabled' | 'repeat'> = {}): Promise<ApiResult<HealthMemo>> {
      await wait();
      const memoInput = parseMockHealthMemoPayload({ content, title, ...options });
      if (memoInput.error) return error<HealthMemo>(memoInput.error, false, undefined, 'HEALTH_MEMO_INVALID');
      const memo: HealthMemo = { id: `m-${Date.now()}`, ...(memoInput.memo as Omit<HealthMemo, 'id' | 'updatedAt'>), createdAt: todayIsoDate(), updatedAt: todayIsoDate() };
      memos = [memo, ...memos];
      return success(memo);
    },

    async updateHealthMemo(id: string, patch: Partial<Pick<HealthMemo, 'content' | 'reminderAt' | 'reminderEnabled' | 'repeat' | 'title'>>): Promise<ApiResult<HealthMemo>> {
      await wait(160);
      const memo = memos.find((item) => item.id === id);
      if (!memo) return error('备忘不存在', false);
      const memoInput = parseMockHealthMemoPayload(patch, memo);
      if (memoInput.error) return error<HealthMemo>(memoInput.error, false, undefined, 'HEALTH_MEMO_INVALID');
      const nextMemo = { ...memo, ...memoInput.memo, updatedAt: todayIsoDate() };
      memos = memos.map((item) => (item.id === id ? nextMemo : item));
      return success(nextMemo);
    },

    async deleteHealthMemo(id: string): Promise<ApiResult<HealthMemo[]>> {
      await wait(160);
      if (!memos.some((item) => item.id === id)) return error('备忘不存在', false);
      memos = memos.filter((item) => item.id !== id);
      return success(memos);
    },

    async listHealthMemos(): Promise<ApiResult<HealthMemo[]>> {
      await wait(140);
      ensureMockBackdatedHealthCalendarFixtures();
      return success(memos);
    },
  },

  social: {
    async listNearbyOwners(location?: NearbyLocationHint): Promise<ApiResult<NearbyOwner[]>> {
      await wait(200);
      if (!mockUserSettings.nearbyVisible || !location) return success([]);
      return success(owners.filter((owner) => !isMockOwnerBlocked(owner.id)));
    },

    async listNearbyMoments(location?: NearbyLocationHint): Promise<ApiResult<NearbyMoment[]>> {
      await wait(180);
      if (!mockUserSettings.nearbyVisible || !location) return success([]);
      return success(mockVisiblePetCircleMoments(false).slice(0, 8));
    },

    async listPetCirclePosts(location?: NearbyLocationHint, options: { cursor?: string; limit?: number } = {}): Promise<ApiResult<PetCirclePostList>> {
      await wait(180);
      if (!mockUserSettings.nearbyVisible || !location) return success({ items: [] });
      const data = mockVisiblePetCircleMoments(true);
      const offset = Math.max(0, Math.floor(Number(options.cursor) || 0));
      const limit = Math.max(1, Math.min(50, Math.floor(Number(options.limit) || data.length || 8)));
      const items = data.slice(offset, offset + limit);
      const nextOffset = offset + items.length;
      return success({
        items,
        nextCursor: nextOffset < data.length ? String(nextOffset) : undefined,
      });
    },

    async getPetCirclePost(postId: string, _location?: NearbyLocationHint): Promise<ApiResult<NearbyMoment>> {
      await wait(120);
      ensureMockPetCircleInteractionFixtures();
      const moment = mockVisiblePetCircleMoments(true).find((item) => item.id === postId);
      if (!moment) return error<NearbyMoment>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      return success(moment);
    },

    async listPetCircleProfilePosts(ownerId = 'me', options: { cursor?: string; limit?: number } = {}): Promise<ApiResult<PetCircleProfilePostList>> {
      await wait(180);
      const posts = mockPetCircleVisibleProfilePosts(ownerId);
      const offset = petCircleProfileCursorOffset(options.cursor);
      const limit = petCircleProfileLimit(options.limit, posts.length || 20);
      const items = posts.slice(offset, offset + limit);
      const nextOffset = offset + items.length;
      return success({
        items,
        nextCursor: nextOffset < posts.length ? String(nextOffset) : undefined,
        profile: buildMockPetCircleProfile(ownerId, posts),
      });
    },

    async updatePetCircleCover(coverImageUrl: string): Promise<ApiResult<PetCircleProfile>> {
      await wait(160);
      const value = String(coverImageUrl || '').trim();
      if (!value) return error<PetCircleProfile>('请选择可用的封面图', false, undefined, 'PET_CIRCLE_COVER_INVALID');
      if (!activeMockPet()) {
        pets = [mockMultiPetFixturePets[0], ...pets.filter((pet) => pet.id !== mockMultiPetFixturePets[0].id)];
        activePetId = mockMultiPetFixturePets[0].id;
      }
      const pet = activeMockPet();
      if (!pet) return error<PetCircleProfile>('请先为宠物建档后再更换封面', false, undefined, 'PET_CIRCLE_COVER_INVALID');
      const updatedPet: PetProfile = { ...pet, petCircleCoverImageUrl: value };
      pets = pets.map((item) => (item.id === updatedPet.id ? updatedPet : item));
      return success(buildMockPetCircleProfile('me'));
    },

    async createMoment(content: string, mood?: string, photoCount = 0, options: { imageUrls?: string[]; location?: NearbyLocationHint | null; syncToHealthCalendar?: boolean; visibility?: 'nearby' | 'private' } = {}): Promise<ApiResult<NearbyMoment>> {
      await wait(180);
      const text = String(content || '').trim();
      if (!text) return error<NearbyMoment>('先写一点今天的小事吧', false, undefined, 'SOCIAL_MOMENT_INVALID');
      const violation = mockSocialChatContentViolation('小事内容', text, 280);
      if (violation) return error<NearbyMoment>(violation, false, undefined, 'SOCIAL_MOMENT_INVALID');
      if ((options.visibility ?? 'nearby') === 'nearby' && !mockUserSettings.nearbyVisible) return error<NearbyMoment>('请先开启附近可见后再分享小事', false, undefined, 'NEARBY_HIDDEN');
      if ((options.visibility ?? 'nearby') === 'nearby' && !options.location) return error<NearbyMoment>('请先完成定位后再发布到宠友圈', true, undefined, 'NEARBY_LOCATION_REQUIRED');
      if ((options.visibility ?? 'nearby') === 'nearby' && isStaleMockNearbyLocation(options.location)) return error<NearbyMoment>('定位已过期，请重新定位后再发布到宠友圈', true, undefined, 'NEARBY_LOCATION_STALE');
      const pet = activeMockPet();
      const hasImageUrls = Array.isArray(options.imageUrls);
      const imageUrls = normalizeMockPetCircleImageUrls(options.imageUrls);
      const visibility = options.visibility ?? 'nearby';
      const moment: NearbyMoment = {
        commentCount: 0,
        createdAt: new Date().toISOString(),
        distance: '附近',
        id: `mock-moment-${Date.now()}`,
        imageUrl: pet?.avatarUrl,
        imageUrls,
        likedByMe: false,
        likeCount: 0,
        mood,
        ownerId: `mock-${currentMockPhone}`,
        ownerName: mockOwnerName,
        ownedByMe: true,
        petName: pet?.name ?? '灵伴',
        photoCount: hasImageUrls ? imageUrls.length : Math.max(0, Math.min(6, photoCount)),
        species: pet?.species === 'cat' ? 'cat' : 'dog',
        text: text.slice(0, 280),
        visibility,
      };
      if (visibility === 'private' || options.syncToHealthCalendar) {
        const memo: HealthMemo = {
          content: text.slice(0, 240),
          createdAt: normalizeCalendarDate(moment.createdAt),
          id: `m-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          source: 'pet_circle',
          sourceId: moment.id,
          title: mockPetChatMemoTitle(text),
          updatedAt: normalizeCalendarDate(moment.createdAt),
        };
        memos = [memo, ...memos];
      }
      nearbyMoments = [moment, ...nearbyMoments].slice(0, 20);
      return success(moment);
    },

    async likePetCirclePost(postId: string): Promise<ApiResult<NearbyMoment>> {
      await wait(120);
      ensureMockPetCircleInteractionFixtures();
      const moment = nearbyMoments.find((item) => item.id === postId);
      if (!moment) return error<NearbyMoment>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (isMockOwnerBlocked(moment.ownerId)) return error<NearbyMoment>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (petCircleReportedPostIds.includes(postId)) return error<NearbyMoment>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (moment.ownedByMe) return error<NearbyMoment>('暂不支持给自己的小事点赞', false, undefined, 'PET_CIRCLE_OWN_POST_LIKE');
      if (!petCircleLikedIds.includes(postId)) petCircleLikedIds = [postId, ...petCircleLikedIds];
      const nextMoment = { ...moment, likedByMe: true, likeCount: (moment.likeCount ?? 0) + 1 };
      nearbyMoments = nearbyMoments.map((item) => (item.id === postId ? nextMoment : item));
      if (!moment.ownedByMe) {
        addMockNotification({
          category: 'interaction',
          id: `mock-pet-circle-like-${postId}`,
          kind: 'pet_circle_like',
          postId,
          read: false,
          text: `你赞了 ${moment.petName} 的小事`,
          title: `${moment.petName} 的小事有新互动`,
        }, 'interaction');
      }
      return success(nextMoment);
    },

    async unlikePetCirclePost(postId: string): Promise<ApiResult<NearbyMoment>> {
      await wait(120);
      ensureMockPetCircleInteractionFixtures();
      const moment = nearbyMoments.find((item) => item.id === postId);
      if (!moment) return error<NearbyMoment>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (isMockOwnerBlocked(moment.ownerId)) return error<NearbyMoment>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (petCircleReportedPostIds.includes(postId)) return error<NearbyMoment>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      petCircleLikedIds = petCircleLikedIds.filter((id) => id !== postId);
      const nextMoment = { ...moment, likedByMe: false, likeCount: Math.max(0, (moment.likeCount ?? 0) - 1) };
      nearbyMoments = nearbyMoments.map((item) => (item.id === postId ? nextMoment : item));
      notifications = notifications.filter((item) => item.id !== `mock-pet-circle-like-${postId}`);
      return success(nextMoment);
    },

    async listPetCircleComments(postId: string): Promise<ApiResult<PetCircleComment[]>> {
      await wait(120);
      ensureMockPetCircleInteractionFixtures();
      if (!nearbyMoments.some((item) => item.id === postId)) return error<PetCircleComment[]>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (nearbyMoments.some((item) => item.id === postId && isMockOwnerBlocked(item.ownerId))) return error<PetCircleComment[]>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (petCircleReportedPostIds.includes(postId)) return error<PetCircleComment[]>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      return success(petCircleComments.filter((comment) => comment.postId === postId && !petCircleReportedCommentIds.includes(comment.id)));
    },

    async createPetCircleComment(postId: string, content: string): Promise<ApiResult<PetCircleComment[]>> {
      await wait(150);
      ensureMockPetCircleInteractionFixtures();
      const moment = nearbyMoments.find((item) => item.id === postId);
      if (!moment) return error<PetCircleComment[]>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (isMockOwnerBlocked(moment.ownerId)) return error<PetCircleComment[]>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (petCircleReportedPostIds.includes(postId)) return error<PetCircleComment[]>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      const text = String(content || '').trim();
      if (!text) return error<PetCircleComment[]>('先写一句评论吧', false, undefined, 'PET_CIRCLE_COMMENT_INVALID');
      const violation = mockSocialChatContentViolation('评论内容', text, 140);
      if (violation) return error<PetCircleComment[]>(violation, false, undefined, 'PET_CIRCLE_COMMENT_INVALID');
      const comment: PetCircleComment = {
        author: mockOwnerName,
        avatarUrl: activeMockPet()?.avatarUrl,
        content: text,
        createdAt: new Date().toISOString(),
        id: `mock-comment-${Date.now()}`,
        ownerId: `mock-${currentMockPhone}`,
        ownedByMe: true,
        postId,
        text,
      };
      petCircleComments = [...petCircleComments, comment];
      nearbyMoments = nearbyMoments.map((item) => (item.id === postId ? { ...item, commentCount: petCircleComments.filter((next) => next.postId === postId).length } : item));
      if (!moment.ownedByMe) {
        addMockNotification({
          category: 'interaction',
          commentId: comment.id,
          id: `mock-pet-circle-comment-${comment.id}`,
          kind: 'pet_circle_comment',
          postId,
          read: false,
          text: `你评论了 ${moment.petName} 的小事`,
          title: `${moment.petName} 的小事有新评论`,
        }, 'interaction');
      }
      return success(petCircleComments.filter((next) => next.postId === postId && !petCircleReportedCommentIds.includes(next.id)));
    },

    async deletePetCircleComment(commentId: string): Promise<ApiResult<{ deleted: boolean; id: string }>> {
      await wait(120);
      ensureMockPetCircleInteractionFixtures();
      const comment = petCircleComments.find((item) => item.id === commentId);
      if (!comment) return error<{ deleted: boolean; id: string }>('评论不存在或已删除', false, undefined, 'PET_CIRCLE_COMMENT_GONE');
      const moment = nearbyMoments.find((item) => item.id === comment.postId);
      if (!comment.ownedByMe && !moment?.ownedByMe) return error<{ deleted: boolean; id: string }>('只能删除自己的评论', false, undefined, 'PET_CIRCLE_COMMENT_FORBIDDEN');
      petCircleComments = petCircleComments.filter((comment) => comment.id !== commentId);
      nearbyMoments = nearbyMoments.map((item) => (item.id === moment?.id ? { ...item, commentCount: petCircleComments.filter((next) => next.postId === item.id).length } : item));
      notifications = notifications.filter((item) => item.id !== `mock-pet-circle-comment-${commentId}`);
      return success({ deleted: true, id: commentId });
    },

    async deletePetCirclePost(postId: string): Promise<ApiResult<{ deleted: boolean; id: string }>> {
      await wait(140);
      const moment = nearbyMoments.find((item) => item.id === postId);
      if (!moment) return error<{ deleted: boolean; id: string }>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (!moment.ownedByMe) return error<{ deleted: boolean; id: string }>('只能删除自己的小事', false, undefined, 'PET_CIRCLE_POST_FORBIDDEN');
      const removedCommentIds = new Set(petCircleComments.filter((comment) => comment.postId === postId).map((comment) => comment.id));
      nearbyMoments = nearbyMoments.filter((moment) => moment.id !== postId);
      petCircleComments = petCircleComments.filter((comment) => comment.postId !== postId);
      petCircleLikedIds = petCircleLikedIds.filter((id) => id !== postId);
      petCircleReportedPostIds = petCircleReportedPostIds.filter((id) => id !== postId);
      notifications = notifications.filter((item) => {
        const id = String(item.id || '');
        if (item.postId === postId) return false;
        if (id === `mock-pet-circle-like-${postId}`) return false;
        if (id.startsWith('mock-pet-circle-comment-') && removedCommentIds.has(id.slice('mock-pet-circle-comment-'.length))) return false;
        return true;
      });
      return success({ deleted: true, id: postId });
    },

    async reportPetCirclePost(postId: string, _content?: string): Promise<ApiResult<PetCircleReportResult>> {
      await wait(140);
      ensureMockPetCircleInteractionFixtures();
      const moment = nearbyMoments.find((item) => item.id === postId);
      if (petCircleReportedPostIds.includes(postId)) return success({ id: `mock-report-post-${postId}`, reported: true, targetId: postId, targetType: 'post' });
      if (!moment) return error<PetCircleReportResult>('这条小事已不可见', false, undefined, 'PET_CIRCLE_POST_GONE');
      if (moment.ownedByMe) return error<PetCircleReportResult>('不能举报自己的小事', false, undefined, 'PET_CIRCLE_REPORT_INVALID');
      petCircleReportedPostIds = [postId, ...petCircleReportedPostIds];
      return success({ id: `mock-report-${Date.now()}`, reported: true, targetId: postId, targetType: 'post' });
    },

    async reportPetCircleComment(commentId: string, _content?: string): Promise<ApiResult<PetCircleReportResult>> {
      await wait(140);
      ensureMockPetCircleInteractionFixtures();
      const comment = petCircleComments.find((item) => item.id === commentId);
      if (petCircleReportedCommentIds.includes(commentId)) return success({ id: `mock-report-comment-${commentId}`, reported: true, targetId: commentId, targetType: 'comment' });
      if (!comment) return error<PetCircleReportResult>('评论不存在或已删除', false, undefined, 'PET_CIRCLE_COMMENT_GONE');
      if (comment.ownedByMe) return error<PetCircleReportResult>('不能举报自己的评论', false, undefined, 'PET_CIRCLE_REPORT_INVALID');
      petCircleReportedCommentIds = [commentId, ...petCircleReportedCommentIds];
      return success({ id: `mock-report-${Date.now()}`, reported: true, targetId: commentId, targetType: 'comment' });
    },

    async blockOwner(ownerId: string, options: SocialBlockOptions = {}): Promise<ApiResult<SocialBlockResult>> {
      await wait(140);
      ensureMockPetCircleInteractionFixtures();
      const owner = owners.find((item) => item.id === ownerId) ?? nearbyMoments.find((item) => item.ownerId === ownerId);
      if (!owner) return error<SocialBlockResult>('用户不存在或已不可见', false, undefined, 'SOCIAL_BLOCK_INVALID');
      if (ownerId === `mock-${currentMockPhone}`) return error<SocialBlockResult>('不能拉黑自己', false, undefined, 'SOCIAL_BLOCK_INVALID');
      const reasonCode = options.reasonCode || 'no_interest';
      const reasonLabel = reasonCode === 'harassment' ? '骚扰或不适互动' : reasonCode === 'spam' ? '广告或刷屏' : reasonCode === 'unsafe' ? '不安全或疑似违规' : reasonCode === 'inappropriate' ? '内容不适合' : reasonCode === 'other' ? '其他原因' : '不想再遇见';
      if (!isMockOwnerBlocked(ownerId)) {
        socialBlocks = [{
          blockedAt: new Date().toISOString(),
          id: `mock-block-${ownerId}`,
          ownerId,
          reasonCode,
          reasonDetail: options.reason ?? '',
          reasonLabel,
        }, ...socialBlocks];
      }
      greetingRequests = greetingRequests.filter((item) => item.id !== ownerId);
      removeMockSocialNotificationsForBlockedOwner(ownerId);
      return success({ blocked: true, id: `mock-block-${ownerId}`, ownerId, reasonCode, reasonDetail: options.reason ?? '', reasonLabel });
    },

    async listBlocks(): Promise<ApiResult<SocialBlockListItem[]>> {
      await wait(140);
      return success(socialBlocks.map((block) => {
        const owner = owners.find((item) => item.id === block.ownerId);
        const moment = nearbyMoments.find((item) => item.ownerId === block.ownerId);
        return {
          avatarUrl: owner?.imageUrl ?? moment?.imageUrl,
          blockedAt: block.blockedAt,
          id: block.id,
          ownerId: block.ownerId,
          ownerName: owner?.ownerName ?? moment?.ownerName ?? '附近主人',
          petName: owner?.petName ?? moment?.petName,
          reasonCode: block.reasonCode,
          reasonDetail: block.reasonDetail,
          reasonLabel: block.reasonLabel,
          species: owner?.species ?? moment?.species,
        };
      }));
    },

    async unblockOwner(ownerId: string): Promise<ApiResult<{ deleted: boolean; ownerId: string }>> {
      await wait(140);
      const before = socialBlocks.length;
      socialBlocks = socialBlocks.filter((block) => block.ownerId !== ownerId);
      if (socialBlocks.length === before) return error<{ deleted: boolean; ownerId: string }>('黑名单对象不存在', false, undefined, 'SOCIAL_BLOCK_INVALID');
      return success({ deleted: true, ownerId });
    },

    async sendGreeting(ownerId: string, options: GreetingOptions = {}): Promise<ApiResult<GreetingResult>> {
      await wait();
      ensureMockPetCircleInteractionFixtures();
      if (isMockOwnerBlocked(ownerId)) return error<GreetingResult>('对方暂时不可打招呼，请刷新附近列表后再试', true, undefined, 'SOCIAL_TARGET_GONE');
      const owner = owners.find((item) => item.id === ownerId);
      if (!owner) return error<GreetingResult>('对方暂时不可打招呼，请刷新附近列表后再试', true);
      const postId = String(options.postId || '').trim();
      if (options.source === 'pet_circle') {
        const visibleSourcePost = nearbyMoments.some((moment) => moment.id === postId && moment.ownerId === ownerId && !petCircleReportedPostIds.includes(moment.id) && !isMockOwnerBlocked(moment.ownerId));
        const visiblePreviewFixture = mockPetCircleInteractionFixtureOwners[postId] === ownerId && !petCircleReportedPostIds.includes(postId) && !isMockOwnerBlocked(ownerId);
        if (!postId || (!visibleSourcePost && !visiblePreviewFixture)) {
          return error<GreetingResult>('这条小事已不可见，暂时不能从这里打招呼', true, undefined, 'PET_CIRCLE_POST_GONE');
        }
      }
      return success({ ownerId, ...(options.source === 'pet_circle' ? { postId, source: 'pet_circle' as const } : {}), sent: true });
    },

    async listGreetingRequests(): Promise<ApiResult<NearbyOwner[]>> {
      await wait(160);
      ensureMockGreetingRequestFixtures();
      return success(greetingRequests.filter((owner) => !isMockOwnerBlocked(owner.id)));
    },

    async acceptGreeting(ownerId: string): Promise<ApiResult<GreetingResult>> {
      await wait();
      if (isMockOwnerBlocked(ownerId)) return error<GreetingResult>('招呼请求不存在或已处理', true, undefined, 'SOCIAL_TARGET_GONE');
      const owner = greetingRequests.find((item) => item.id === ownerId) ?? owners.find((item) => item.id === ownerId);
      greetingRequests = greetingRequests.filter((item) => item.id !== ownerId);
      removeMockGreetingRequestNotificationsFor(ownerId);
      const conversation: Conversation = {
        canSendMessage: true,
        id: `accepted-${ownerId}`,
        imageUrl: owner?.imageUrl,
        lastMessage: '我们已经互相打招呼啦',
        name: owner ? `${owner.ownerName}和${owner.petName}` : '附近主人',
        ownerId,
        petName: owner?.petName,
        relationshipStatus: 'accepted',
        unread: 0,
        updatedAt: new Date().toISOString(),
      };
      conversations.unshift(conversation);
      conversationMessagesById[conversation.id] = [
        { author: 'system', id: `${conversation.id}-system`, text: '你们已经互相打招呼，可以开始聊天。', time: new Date().toISOString() },
      ];
      return success({ conversation, ownerId, sent: true });
    },

    async rejectGreeting(ownerId: string): Promise<ApiResult<{ ownerId: string; rejected: true }>> {
      await wait();
      greetingRequests = greetingRequests.filter((item) => item.id !== ownerId);
      removeMockGreetingRequestNotificationsFor(ownerId);
      return success({ ownerId, rejected: true });
    },

    async createWalkInvite(ownerId: string, input?: WalkInviteInput): Promise<ApiResult<WalkInviteResult>> {
      await wait();
      if (isMockOwnerBlocked(ownerId)) return error<WalkInviteResult>('对方暂时不可约遛，请刷新附近列表后再试', true, undefined, 'SOCIAL_TARGET_GONE');
      const owner = owners.find((item) => item.id === ownerId);
      const inviteId = `walk-${Date.now()}`;
      const place = input?.place ?? '附近宠物友好地点';
      const time = input?.time ?? '今天';
      const placeAddress = input?.placeAddress ?? '';
      const note = input?.note ?? '';
      const inviteViolation =
        mockSocialChatContentViolation('约遛地点', place, 80) ||
        mockSocialChatContentViolation('约遛地址', placeAddress, 160) ||
        mockSocialChatContentViolation('约遛时间', time, 60) ||
        mockSocialChatContentViolation('约遛备注', note, 240);
      if (inviteViolation) return error(inviteViolation, false);
      const message = `约遛邀请 · ${time} · ${place}`;
      const messageBody = [message, placeAddress ? `地址：${placeAddress}` : '', note].filter(Boolean).join('\n');
      const conversation: Conversation = {
        canSendMessage: false,
        id: `walk-${ownerId}-${Date.now()}`,
        imageUrl: owner?.imageUrl,
        lastMessage: message,
        name: owner ? `${owner.ownerName}和${owner.petName}` : '附近主人',
        ownerId,
        petName: owner?.petName,
        relationshipStatus: 'pending',
        unread: 0,
        updatedAt: new Date().toISOString(),
      };
      conversations.unshift(conversation);
      conversationMessagesById[conversation.id] = [
        { author: 'me', id: `${conversation.id}-invite`, status: 'sent', text: messageBody, time: new Date().toISOString() },
      ];
      return success({ conversation, inviteId, ownerId });
    },
  },

  messages: {
    async registerPushToken(token: string, platform: PushDevice['platform'], deviceId?: string): Promise<ApiResult<PushDevice>> {
      await wait(120);
      const pushDeviceInput = parseMockPushDevicePayload(token, platform, deviceId);
      if (!pushDeviceInput.ok) return error<PushDevice>(pushDeviceInput.error, false, undefined, 'PUSH_DEVICE_INVALID');
      const { device } = pushDeviceInput;
      pushDevices = [
        device,
        ...pushDevices.filter((item) => (device.deviceId ? item.deviceId !== device.deviceId : item.token !== device.token)),
      ];
      return success(device);
    },

    async listConversations(): Promise<ApiResult<Conversation[]>> {
      await wait(160);
      return success(conversations.filter((conversation) => !conversation.ownerId || !isMockOwnerBlocked(conversation.ownerId)));
    },

    async listConversationMessages(conversationId: string): Promise<ApiResult<ConversationMessage[]>> {
      await wait(160);
      const conversation = conversations.find((item) => item.id === conversationId);
      if (conversation?.ownerId && isMockOwnerBlocked(conversation.ownerId)) return error<ConversationMessage[]>('会话不存在，请返回消息列表刷新', true, undefined, 'SOCIAL_TARGET_GONE');
      return success((conversationMessagesById[conversationId] ?? []).filter((message) => !conversationReportedMessageIds.includes(message.id) && message.status !== 'hidden' && message.status !== 'deleted'));
    },

    async sendMessage(text: string): Promise<ApiResult<ChatMessage>> {
      await wait();
      if (!text.trim()) return error('请输入消息内容', false);
      mockPetChatDailyCount += 1;
      const medicalAlert = createMockMedicalAlertFromPetChat(text);
      const profileUpdate = medicalAlert ? null : applyMockPetProfileUpdateFromPetChat(text);
      const vaccineAction = medicalAlert || profileUpdate ? null : applyMockPetChatVaccineAction(text);
      const createdWeight = medicalAlert || profileUpdate ? null : createMockWeightRecordFromPetChat(text);
      const createdMemo = medicalAlert?.memo ?? (profileUpdate || vaccineAction || createdWeight ? null : createMockHealthMemoFromPetChat(text));
      const userMessage: ChatMessage = { id: `pet-user-${Date.now()}`, author: 'me', text, status: 'sent', time: new Date().toISOString() };
      const replyText = mockFallbackPetChatReply(text);
      const savedNotices = [
        medicalAlert ? `我已经把这个情况记到我的备忘：「${medicalAlert.memo.title}」，并生成就医提醒。` : '',
        profileUpdate ? `我已经更新了我的档案：${describeMockPetProfilePatch(profileUpdate.patch)}。` : '',
        vaccineAction?.action === 'done' ? `我已经把我的${vaccineAction.vaccine.name}标记完成。` : '',
        vaccineAction?.action === 'reminder_on' ? `我已经开启我的${vaccineAction.vaccine.name}提醒。` : '',
        vaccineAction?.action === 'reminder_off' ? `我已经关闭我的${vaccineAction.vaccine.name}提醒。` : '',
        createdWeight ? `我已经记录我的体重：${createdWeight.kg}kg。` : '',
        createdMemo ? `我已经记到我的备忘：「${createdMemo.title}」。` : '',
      ].filter(Boolean);
      const aiMessage: ChatMessage = {
        id: `pet-ai-${Date.now()}`,
        author: 'ai',
        createdMemo: createdMemo ?? undefined,
        createdWeight: createdWeight ?? undefined,
        medicalAlert: medicalAlert ? { notificationId: medicalAlert.notificationId, reason: medicalAlert.reason } : undefined,
        status: 'sent',
        text: savedNotices.length ? `${replyText}\n\n${savedNotices.join('\n')}` : replyText,
        time: new Date().toISOString(),
        updatedPet: profileUpdate?.pet,
        updatedVaccine: vaccineAction?.vaccine,
        vaccineReminderIds: vaccineAction?.reminderIds,
      };
      petChatMessages = [...petChatMessages, userMessage, aiMessage];
      return success(aiMessage);
    },

    async listPetChatMessages(): Promise<ApiResult<ChatMessage[]>> {
      await wait(160);
      return success(petChatMessages);
    },

    async sendPetChatFeedback(messageId: string, rating: PetChatFeedbackRating): Promise<ApiResult<ChatMessage>> {
      await wait(120);
      const message = petChatMessages.find((item) => item.id === messageId);
      if (!message || message.author !== 'ai') return error('只能反馈灵伴回复', false);
      message.feedback = rating;
      return success(message);
    },

    async sendConversationMessage(conversationId: string, text: string): Promise<ApiResult<ConversationMessage>> {
      await wait();
      const trimmedText = text.trim();
      if (!trimmedText) return error<ConversationMessage>('请输入消息内容', false);
      const violation = mockSocialChatContentViolation('聊天内容', trimmedText);
      if (violation) return error<ConversationMessage>(violation, false);
      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation) return error<ConversationMessage>('会话不存在，请返回消息列表刷新', true);
      if (conversation.ownerId && isMockOwnerBlocked(conversation.ownerId)) return error<ConversationMessage>('会话不存在，请返回消息列表刷新', true, undefined, 'SOCIAL_TARGET_GONE');
      if (conversation.canSendMessage === false) return error<ConversationMessage>('对方接受招呼后才能聊天', true);
      const message: ConversationMessage = { author: 'me', id: `conv-${Date.now()}`, status: 'sent', text: trimmedText, time: new Date().toISOString() };
      conversation.lastMessage = trimmedText;
      conversation.unread = 0;
      conversation.updatedAt = new Date().toISOString();
      conversationMessagesById[conversationId] = [...(conversationMessagesById[conversationId] ?? []), message];
      return success(message);
    },

    async reportConversationMessage(conversationId: string, messageId: string, _content?: string): Promise<ApiResult<PetCircleReportResult>> {
      await wait(120);
      const message = (conversationMessagesById[conversationId] ?? []).find((item) => item.id === messageId);
      if (!message || message.status === 'hidden' || message.status === 'deleted') return error<PetCircleReportResult>('这条消息已不可见', false, undefined, 'CONVERSATION_MESSAGE_GONE');
      if (message.author === 'system') return error<PetCircleReportResult>('系统消息不支持举报', false, undefined, 'CONVERSATION_MESSAGE_REPORT_INVALID');
      if (message.author === 'me') return error<PetCircleReportResult>('不能举报自己发送的消息', false, undefined, 'CONVERSATION_MESSAGE_REPORT_INVALID');
      if (!conversationReportedMessageIds.includes(messageId)) conversationReportedMessageIds = [...conversationReportedMessageIds, messageId];
      return success({ id: `mock-report-message-${messageId}`, reported: true, targetId: messageId, targetType: 'message' });
    },

    async markConversationRead(conversationId: string): Promise<ApiResult<true>> {
      await wait(100);
      const conversation = conversations.find((item) => item.id === conversationId);
      if (conversation) conversation.unread = 0;
      markMockConversationNotificationsRead(conversationId);
      return success(true);
    },

    async listNotifications(): Promise<ApiResult<NotificationItem[]>> {
      await wait(160);
      ensureMockHealthReminderNotifications();
      return success(normalizeMockNotifications());
    },

    async markNotificationsRead(ids?: string[]): Promise<ApiResult<NotificationItem[]>> {
      await wait(120);
      const idSet = ids?.length ? new Set(ids) : null;
      normalizeMockNotifications();
      notifications = notifications.map((item) => (idSet && !idSet.has(item.id) ? item : { ...item, read: true }));
      return success(notifications);
    },
  },

  places: {
    async listNearbyPlaces(_location?: NearbyLocationHint): Promise<ApiResult<Place[]>> {
      await wait(180);
      return success(places);
    },

    async searchPlaces(query: string, _location?: NearbyLocationHint): Promise<ApiResult<Place[]>> {
      await wait(180);
      const normalized = query.trim();
      return success(normalized ? places.filter((place) => matchesPlaceSearch(place, normalized)) : places);
    },

    async getPlace(placeId: string): Promise<ApiResult<Place>> {
      await wait(120);
      const place = places.find((item) => item.id === placeId);
      return place ? success(place) : error('地点不存在', false);
    },

    async listFavoritePlaceIds(): Promise<ApiResult<string[]>> {
      await wait(120);
      return success(favoritePlaceIds);
    },

    async setFavoritePlace(placeId: string, favorite: boolean): Promise<ApiResult<string[]>> {
      await wait(160);
      if (!places.some((place) => place.id === placeId)) return error('地点不存在', false);
      favoritePlaceIds = favorite ? [...new Set([placeId, ...favoritePlaceIds])] : favoritePlaceIds.filter((id) => id !== placeId);
      return success(favoritePlaceIds);
    },

    async listMyReviews(): Promise<ApiResult<PlaceReview[]>> {
      await wait(120);
      return success(placeReviews);
    },

    async listPlaceReviews(placeId: string): Promise<ApiResult<PlaceReview[]>> {
      await wait(120);
      return success(placeReviews.filter((review) => (
        review.placeId === placeId &&
        review.status === 'approved' &&
        !placeReviewReportedIds.includes(review.id)
      )));
    },

    async listMySubmissions(): Promise<ApiResult<PlaceSubmission[]>> {
      await wait(120);
      return success(placeSubmissions);
    },

    async createReview(placeId: string, content: string, imageUrls: string[] = []): Promise<ApiResult<PlaceReview>> {
      await wait();
      const place = places.find((item) => item.id === placeId);
      if (!place) return error('地点不存在', false);
      const trimmedContent = content.trim();
      if (!trimmedContent) return error('请填写点评内容', false);
      const violation = mockPublicPlaceContentViolation('点评内容', trimmedContent, 500);
      if (violation) return error(violation, false);
      const hadReviewForPlace = placeReviews.some((item) => item.placeId === placeId);
      const review: PlaceReview = {
        content: trimmedContent,
        createdAt: new Date().toISOString(),
        id: `review-${Date.now()}`,
        imageUrls: imageUrls.slice(0, 3),
        placeId,
        photoCount: imageUrls.slice(0, 3).length,
        status: 'pending_review',
      };
      placeReviews = [review, ...placeReviews.filter((item) => item.placeId !== placeId)];
      if (!hadReviewForPlace) place.reviewCount = (place.reviewCount ?? 0) + 1;
      addMockNotification({
        id: `notification-${review.id}`,
        kind: 'place_review',
        placeId,
        read: false,
        text: `${place.name}的点评已进入审核队列`,
        title: '地点点评待审核',
      });
      return success(review);
    },

    async reportReview(reviewId: string, _content?: string): Promise<ApiResult<PetCircleReportResult>> {
      await wait(140);
      const review = placeReviews.find((item) => item.id === reviewId);
      if (placeReviewReportedIds.includes(reviewId)) return success({ id: `mock-report-place-review-${reviewId}`, reported: true, targetId: reviewId, targetType: 'place_review' });
      if (!review || review.status !== 'approved') return error<PetCircleReportResult>('地点点评不存在或已不可见', false, undefined, 'PLACE_REVIEW_REPORT_INVALID');
      placeReviewReportedIds = [reviewId, ...placeReviewReportedIds];
      return success({ id: `mock-report-${Date.now()}`, reported: true, targetId: reviewId, targetType: 'place_review' });
    },

    async reportPlace(placeId: string, _content?: string): Promise<ApiResult<PetCircleReportResult>> {
      await wait(140);
      const place = places.find((item) => item.id === placeId);
      if (placeReportedIds.includes(placeId)) return success({ id: `mock-report-place-${placeId}`, reported: true, targetId: placeId, targetType: 'place' });
      if (!place) return error<PetCircleReportResult>('地点不存在或已不可见', false, undefined, 'PLACE_REPORT_INVALID');
      placeReportedIds = [placeId, ...placeReportedIds];
      return success({ id: `mock-report-${Date.now()}`, reported: true, targetId: placeId, targetType: 'place' });
    },

    async createSubmission(name: string, address: string, content: string, imageUrls: string[] = []): Promise<ApiResult<PlaceSubmission>> {
      await wait();
      const trimmedName = name.trim();
      const trimmedAddress = address.trim();
      const trimmedContent = content.trim();
      if (!trimmedName || !trimmedAddress) return error('请填写地点名称和地址', false);
      if (!trimmedContent) return error('请填写宠物友好体验', false);
      const violation =
        mockPublicPlaceContentViolation('地点名称', trimmedName, 60) ||
        mockPublicPlaceContentViolation('地点地址', trimmedAddress, 120) ||
        mockPublicPlaceContentViolation('宠物友好体验', trimmedContent, 500);
      if (violation) return error(violation, false);
      const existingPlace = places.find((place) => isSimilarMockPlaceText(trimmedName, place.name) && isSimilarMockPlaceText(trimmedAddress, place.address, 6));
      if (existingPlace) {
        return error(`可能已存在相同地点：${existingPlace.name}，请先查看已有地点或换一个更准确的名称/地址。`, false);
      }
      const duplicateSubmission = placeSubmissions.find(
        (item) =>
          (item.status === 'approved' || item.status === 'pending_review') &&
          isSimilarMockPlaceText(trimmedName, item.name) &&
          isSimilarMockPlaceText(trimmedAddress, item.address, 6),
      );
      if (duplicateSubmission) return error('这个地点已经提交过，正在审核中，请不要重复提交。', false);
      const submission: PlaceSubmission = {
        address: trimmedAddress,
        content: trimmedContent,
        createdAt: new Date().toISOString(),
        id: `place-submission-${Date.now()}`,
        imageUrls: imageUrls.slice(0, 3),
        name: trimmedName,
        photoCount: imageUrls.slice(0, 3).length,
        status: 'pending_review',
      };
      placeSubmissions = [submission, ...placeSubmissions];
      addMockNotification({
        id: `notification-${submission.id}`,
        kind: 'place_submission',
        read: false,
        submissionId: submission.id,
        text: `${submission.name}已提交审核，通过后会展示给附近用户`,
        title: '地点提交待审核',
      });
      return success(submission);
    },
  },
};

function buildMockAccountSnapshot(): AccountSnapshot {
  return {
    activePet: pets.find((pet) => pet.id === activePetId) ?? pets[0] ?? null,
    accountDeletion: mockAccountDeletion,
    accountStatus: mockAccountDeletion?.status === 'pending' ? 'deletion_pending' : 'active',
    ownerAvatarUrl: mockOwnerAvatarUrl,
    ownerBio: mockOwnerBio,
    ownerName: mockOwnerName,
    permissions: mockPermissions,
    permissionsOnboardingCompleted: mockPermissionsOnboardingCompleted,
    placeContributionSummary: {
      created: 0,
      level: {
        key: 'none',
        label: '待点亮',
        minPoints: 0,
        nextLabel: '地点新星',
        nextPoints: 1,
      },
      linkedExisting: 0,
      minPublicPoints: 1,
      points: 0,
      publicEligible: false,
      total: 0,
    },
    settings: mockUserSettings,
  };
}

function buildMockUserProfile(): UserProfile {
  return {
    ...buildMockAccountSnapshot(),
    ownerName: mockOwnerName,
    phone: currentMockPhone,
  };
}

function success<T>(data: T): ApiResult<T> {
  return { data, state: 'success' };
}

function mockErrorCodeFrom(message: string) {
  if (/操作太频繁/.test(message)) return 'SMS_RATE_LIMITED';
  if (/验证码发送次数|当前设备今天获取验证码/.test(message)) return 'SMS_DAILY_LIMITED';
  if (/验证码错误次数过多/.test(message)) return 'SMS_CODE_ATTEMPT_LIMITED';
  if (/验证码错误/.test(message)) return 'SMS_CODE_INVALID';
  if (/验证码已过期/.test(message)) return 'SMS_CODE_EXPIRED';
  if (/验证码已使用/.test(message)) return 'SMS_CODE_USED';
  if (/手机号/.test(message) && /正确|格式/.test(message)) return 'SMS_PHONE_INVALID';
  if (/不能包含|不适合发送|不适合公开|违法|灰产|微信|QQ|外部联系方式|外部链接/.test(message)) return 'CONTENT_POLICY_VIOLATION';
  if (/今日灵伴形象生成次数/.test(message)) return 'PET_AVATAR_DAILY_LIMIT';
  if (/今天和灵伴聊天次数/.test(message)) return 'PET_CHAT_DAILY_LIMIT';
  if (/不存在|失效/.test(message)) return 'RESOURCE_NOT_FOUND';
  return 'VALIDATION_FAILED';
}

function error<T>(message: string, retryable: boolean, data?: T, code?: string): ApiResult<T> {
  return { data, error: { code: code || mockErrorCodeFrom(message), message, retryable }, state: 'error' };
}
