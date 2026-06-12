import { extractMainlandChinaPhone } from '../services/sms';
import { getLumiiInstallationId } from '../services/installationId';
import type {
  AccountSnapshot,
  ApiResult,
  AiUsageSummary,
  AvatarGenerationFeedbackReason,
  AuthSession,
  AvatarJob,
  ChatMessage,
  Conversation,
  ConversationMessage,
  CreatePetInput,
  FeedbackCategory,
  FeedbackSubmission,
  GreetingResult,
  HealthCalendarEvent,
  HealthMemo,
  HealthSummary,
  LegalDocument,
  NearbyLocationHint,
  NearbyOwner,
  NotificationItem,
  PetChatFeedbackRating,
  PetProfile,
  PetTaxonomy,
  Place,
  PlaceReview,
  PlaceSubmission,
  PermissionStateMap,
  PushDevice,
  SmsCodeTicket,
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
const smsDeviceDailyUsageById: Record<string, { count: number; day: string }> = {};
const smsDailyUsageByPhone: Record<string, { count: number; day: string }> = {};
const SMS_COOLDOWN_MS = 60 * 1000;
const SMS_DAILY_LIMIT = 50;
const SMS_DEVICE_DAILY_LIMIT = 80;
const OTP_TTL_MS = 5 * 60 * 1000;

let currentMockPhone = '13800138000';
let mockOwnerName = '灵伴用户';
let pets: PetProfile[] = [];
let activePetId = '';
let generationProgressById: Record<string, number> = {};
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

const goldenRetrieverPhotoUrl =
  'https://images.unsplash.com/photo-1625794084867-8ddd239946b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=720';
const goldenRetrieverAvatarUrl =
  'lumii://golden-retriever-avatar';

function todayUsageKey() {
  return new Date().toISOString().slice(0, 10);
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

const petTaxonomy: PetTaxonomy = {
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

const legalDocuments: Record<LegalDocument['key'], LegalDocument> = {
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

let weights: WeightRecord[] = [
  { id: 'w1', kg: 28.4, note: '精神很好，食欲正常', recordedAt: '2026-05-28' },
  { id: 'w2', kg: 28.1, recordedAt: '2026-05-21' },
];

let memos: HealthMemo[] = [
  { id: 'm1', title: '驱虫记录', content: '体外驱虫已完成，下次 6 月底。', updatedAt: '2026-05-20' },
];

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
    .replace(/(帮我)?(记一下|记录一下|记一笔|记到健康备忘|记到备忘|加到健康备忘|加到备忘|保存到健康备忘|保存到备忘|写进健康备忘|写进备忘)[：:，,\s]*/u, '')
    .trim();
}

function createMockHealthMemoFromPetChat(text: string) {
  const rawText = String(text || '').trim();
  if (!rawText || /不要记|别记|不用记|不要记录|别记录/.test(rawText)) return null;
  if (!/(记一下|记录一下|记一笔|记到健康备忘|记到备忘|加到健康备忘|加到备忘|保存到健康备忘|保存到备忘|写进健康备忘|写进备忘)/.test(rawText)) return null;
  const content = normalizeMockPetChatMemoContent(rawText) || rawText;
  if (content.length < 2) return null;
  const title = mockPetChatMemoTitle(content);
  const existing = memos.slice(0, 8).find((item) => item.title === title && item.content === content.slice(0, 240));
  if (existing) return existing;
  const memo: HealthMemo = {
    content: content.slice(0, 240),
    id: `mock-chat-memo-${Date.now()}`,
    title,
    updatedAt: '刚刚',
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
    .find((item) => Number(item.kg) === normalizedKg && item.recordedAt === '2026-05-30' && String(item.note || '') === parsed.note);
  if (existing) return existing;
  const record: WeightRecord = {
    id: `mock-chat-weight-${Date.now()}`,
    kg: normalizedKg,
    note: parsed.note,
    recordedAt: '2026-05-30',
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
      read: false,
      text: `${vaccines[index].name}已标记完成，健康时间线已更新。`,
      title: '疫苗计划已完成',
    });
    return { action, reminderIds: vaccineReminderIds, vaccine: vaccines[index] };
  }

  if (action === 'reminder_on') {
    if (vaccines[index].status === 'done') return null;
    vaccineReminderIds = [...new Set([vaccines[index].id, ...vaccineReminderIds])];
    addMockNotification({
      id: `mock-health-reminder-${vaccines[index].id}`,
      read: false,
      text: `${vaccines[index].name}即将到期，记得按宠物医院建议确认时间。`,
      title: '健康提醒',
    });
    return { action, reminderIds: vaccineReminderIds, vaccine: vaccines[index] };
  }

  vaccineReminderIds = vaccineReminderIds.filter((item) => item !== vaccines[index].id);
  return { action, reminderIds: vaccineReminderIds, vaccine: vaccines[index] };
}

let vaccines: VaccinePlan[] = [
  { id: 'v1', name: '狂犬疫苗', dueAt: '2026-06-18', status: 'due' },
  { id: 'v2', name: '体内驱虫', dueAt: '2026-06-05', status: 'due' },
];
let vaccineReminderIds: string[] = [];

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

const conversations: Conversation[] = [
  { canSendMessage: true, id: 'c1', imageUrl: owners[0]?.imageUrl, lastMessage: '今晚 7 点公园见？', name: '林然和奶油', ownerId: owners[0]?.id, petName: '奶油', relationshipStatus: 'accepted', unread: 1 },
  { canSendMessage: false, id: 'c2', lastMessage: '你提交的地点已进入审核。', name: '地点审核通知', relationshipStatus: 'pending', unread: 0 },
];

let greetingRequests: NearbyOwner[] = [];

let conversationMessagesById: Record<string, ConversationMessage[]> = {
  c1: [{ author: 'other', id: 'c1-welcome', text: '今晚 7 点公园见？', time: '09:32' }],
  c2: [{ author: 'system', id: 'c2-system', text: '你提交的地点已进入审核。', time: '刚刚' }],
};
let petChatMessages: ChatMessage[] = [];

let notifications: NotificationItem[] = [
  { id: 'n1', title: '疫苗提醒', text: '狂犬疫苗将在 19 天后到期。', read: false },
  { id: 'n2', title: 'AI 形象生成', text: '新的电子宠物形象已保存。', read: true },
];

let pushDevices: PushDevice[] = [];
let feedbackSubmissions: FeedbackSubmission[] = [];
let uploadedMediaById: Record<string, UploadedPetMedia> = {};
let avatarJobsById: Record<string, AvatarJob> = {};
let mockPetChatDailyCount = 0;
let mockPetAvatarDailyCount = 0;
const mockPetAvatarDailyLimit = 10;
const mockSocialMessageMaxChars = 600;

const places: Place[] = [
  { id: 'p1', name: '云杉宠物友好公园', address: '滨江路 88 号', category: 'park', distance: '900m', rating: 4.8, tags: ['可遛狗', '草坪', '饮水点'] },
  { id: 'p2', name: '暖爪咖啡', address: '中央广场 B1', category: 'cafe', distance: '1.6km', rating: 4.6, tags: ['室内友好', '可带猫包'] },
  { id: 'p3', name: '安心宠物医院', address: '明湖街 12 号', category: 'clinic', distance: '2.3km', rating: 4.7, tags: ['急诊', '疫苗'] },
];
let favoritePlaceIds: string[] = [];
let placeReviews: PlaceReview[] = [];
let placeSubmissions: PlaceSubmission[] = [];

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

function shouldStoreMockNotification(category: 'system' | 'interaction' = 'system') {
  if (!mockUserSettings.pushNotifications) return false;
  if (category === 'interaction' && !mockUserSettings.interactionMessages) return false;
  return true;
}

function addMockNotification(notification: NotificationItem, category: 'system' | 'interaction' = 'system') {
  if (!shouldStoreMockNotification(category) || notifications.some((item) => item.id === notification.id)) return;
  notifications = [notification, ...notifications];
}

function normalizeCalendarDate(value?: string) {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : new Date().toISOString().slice(0, 10);
}

function vaccineStatusCopy(status: VaccinePlan['status']) {
  if (status === 'done') return '已完成';
  if (status === 'overdue') return '已逾期';
  return '待提醒';
}

function buildHealthCalendarEvents(): HealthCalendarEvent[] {
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
      date: normalizeCalendarDate(memo.updatedAt),
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

function buildHealthSummary(): HealthSummary {
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

function mockPetMedicalSafetyReply(text: string) {
  const petName = (pets.find((pet) => pet.id === activePetId) ?? pets[0])?.name || '你的宠物';
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
      id: `mock-medical-alert-${Date.now()}`,
      title,
      updatedAt: '刚刚',
    };
    memos = [memo, ...memos];
  }
  const notificationId = `mock-medical-alert-notification-${memo.id}`;
  addMockNotification({
    id: notificationId,
    read: false,
    text: emergency.reason === 'toxic_ingestion'
      ? '已记录疑似误食风险，请尽快联系宠物医院或兽医确认处理方式。'
      : '已记录高风险健康观察，请优先联系宠物医院或兽医。',
    title: '就医提醒',
  });
  return { memo, notificationId, reason: emergency.reason };
}

export const mockApi = {
  ai: {
    async getUsage(): Promise<ApiResult<AiUsageSummary>> {
      await wait(120);
      const day = new Date().toISOString().slice(0, 10);
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
        updatedAt: '刚刚',
      });
    },
  },

  support: {
    async submitFeedback(content: string, category: FeedbackCategory = 'other', contact?: string): Promise<ApiResult<FeedbackSubmission>> {
      await wait(120);
      const cleanContent = content.trim();
      if (!cleanContent) return error('请填写反馈内容', false);
      if (cleanContent.length > 1000) return error('反馈内容最多 1000 个字', false);
      const feedback: FeedbackSubmission = {
        category,
        contact: contact?.trim() || undefined,
        content: cleanContent,
        createdAt: '刚刚',
        id: `feedback-${Date.now()}`,
        status: 'received',
      };
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

    async updateMe(patch: Partial<Pick<UserProfile, 'ownerName'>>): Promise<ApiResult<UserProfile>> {
      await wait(120);
      const ownerName = String(patch.ownerName ?? '').trim();
      if (!ownerName) return error('请输入昵称', false);
      if (ownerName.length > 16) return error('昵称最多 16 个字', false);
      mockOwnerName = ownerName;
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
      usage.count += 1;
      deviceUsage.count += 1;
      return success({ availableAt: now + SMS_COOLDOWN_MS, code, expiresAt: now + OTP_TTL_MS, phone });
    },

    async verifySmsCode(phone: string, code: string, expiresAt: number): Promise<ApiResult<AuthSession>> {
      await wait(260);
      if (Date.now() > expiresAt) return error('验证码已过期，请重新获取', true);
      if (smsCodeByPhone[phone] !== code) return error('验证码错误，请检查后重试', true);
      currentMockPhone = phone;
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
      mockPermissions = { ...mockPermissions, ...next };
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
      mockUserSettings = { ...mockUserSettings, ...patch };
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
      const pet: PetProfile = {
        ...input,
        healthScore: 96,
        id: `pet-${Date.now()}`,
        personality: ['亲人', '爱笑', '饭量稳定'],
      };
      pets = [pet, ...pets];
      activePetId = pet.id;
      return success(pet);
    },

    async updatePet(id: string, patch: Partial<PetProfile>): Promise<ApiResult<PetProfile>> {
      await wait();
      pets = pets.map((pet) => (pet.id === id ? { ...pet, ...patch } : pet));
      const pet = pets.find((item) => item.id === id);
      return pet ? success(pet) : error('宠物档案不存在', false);
    },

    async getPet(id: string): Promise<ApiResult<PetProfile>> {
      await wait(120);
      const pet = pets.find((item) => item.id === id);
      return pet ? success(pet) : error('宠物档案不存在', false);
    },

    async deletePet(id: string): Promise<ApiResult<PetProfile[]>> {
      await wait(160);
      if (!pets.some((item) => item.id === id)) return error('宠物档案不存在', false);
      pets = pets.filter((item) => item.id !== id);
      if (activePetId === id) activePetId = pets[0]?.id ?? '';
      return success(pets);
    },

    async listPets(): Promise<ApiResult<PetProfile[]>> {
      await wait(160);
      return success(pets);
    },

    async setActivePet(id: string): Promise<ApiResult<PetProfile>> {
      await wait(160);
      const pet = pets.find((item) => item.id === id);
      if (!pet) return error('宠物档案不存在', false);
      activePetId = id;
      return success(pet);
    },

    getActivePet(): PetProfile | null {
      return pets.find((pet) => pet.id === activePetId) ?? pets[0] ?? null;
    },
  },

  avatar: {
    async uploadPetMedia(input?: UploadPetMediaInput): Promise<ApiResult<UploadedPetMedia>> {
      await wait();
      const media: UploadedPetMedia = {
        analysis: acceptedPetMediaAnalysis,
        mediaId: `media-${Date.now()}`,
        previewUrl: input?.previewUrl ?? goldenRetrieverPhotoUrl,
        quality: 'good',
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
      const job: AvatarJob = { id, mediaId, progress: 24, provider: 'mock', status: 'processing' };
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
        id,
        progress,
        resultUrl:
          progress >= 100
            ? goldenRetrieverAvatarUrl
            : undefined,
        status: progress >= 100 ? 'ready' : 'processing',
      };
      avatarJobsById = { ...avatarJobsById, [id]: job };
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
      const job: AvatarJob = { id, mediaId: previous.mediaId, originalJobId: jobId, progress: 24, provider: 'mock', status: 'processing' };
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
      const updatedPet = { ...pet, avatarUrl: job.resultUrl };
      pets = pets.map((item) => (item.id === updatedPet.id ? updatedPet : item));
      activePetId = updatedPet.id;
      avatarJobsById = { ...avatarJobsById, [jobId]: { ...job, acceptedAt: '刚刚', acceptedPetId: updatedPet.id } };
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
          createdAt: '刚刚',
          reason,
          status: 'received',
        },
      };
      avatarJobsById = { ...avatarJobsById, [jobId]: updatedJob };
      return success(updatedJob);
    },

    async saveAvatar(petId: string, avatarUrl: string): Promise<ApiResult<PetProfile>> {
      return mockApi.pets.updatePet(petId, { avatarUrl });
    },
  },

  health: {
    async getHealthSummary(): Promise<ApiResult<HealthSummary>> {
      await wait(120);
      return success(buildHealthSummary());
    },

    async listHealthCalendar(): Promise<ApiResult<HealthCalendarEvent[]>> {
      await wait(140);
      return success(buildHealthCalendarEvents());
    },

    async recordWeight(kg: number, note?: string): Promise<ApiResult<WeightRecord>> {
      await wait();
      const record = { id: `w-${Date.now()}`, kg, note, recordedAt: '2026-05-30' };
      weights = [record, ...weights];
      syncMockPetWeightFromRecords();
      return success(record);
    },

    async updateWeightRecord(id: string, patch: Partial<Pick<WeightRecord, 'kg' | 'note' | 'recordedAt'>>): Promise<ApiResult<WeightRecord>> {
      await wait(160);
      const record = weights.find((item) => item.id === id);
      if (!record) return error('体重记录不存在', false);
      const nextKg = patch.kg === undefined ? record.kg : Number(patch.kg);
      if (!Number.isFinite(nextKg) || nextKg <= 0) return error('请输入正确体重', false);
      const nextRecordedAt = String(patch.recordedAt ?? record.recordedAt).trim();
      if (!isIsoDate(nextRecordedAt)) return error('请选择正确日期', false);
      const nextRecord = {
        ...record,
        kg: nextKg,
        note: patch.note === undefined ? record.note : String(patch.note),
        recordedAt: nextRecordedAt,
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
      return success(weights);
    },

    async getWeightTrend(): Promise<ApiResult<WeightTrend>> {
      await wait(140);
      return success(buildWeightTrend(weights));
    },

    async listVaccines(): Promise<ApiResult<VaccinePlan[]>> {
      await wait(140);
      return success(vaccines);
    },

    async updateVaccineStatus(id: string, status: VaccinePlan['status']): Promise<ApiResult<VaccinePlan>> {
      await wait();
      const vaccine = vaccines.find((item) => item.id === id);
      if (!vaccine) return error('疫苗计划不存在', false);
      const nextVaccine = { ...vaccine, status };
      vaccines = vaccines.map((item) => (item.id === id ? nextVaccine : item));
      if (status === 'done') {
        vaccineReminderIds = vaccineReminderIds.filter((item) => item !== id);
        addMockNotification({
          id: `mock-vaccine-done-${id}`,
          read: false,
          text: `${nextVaccine.name}已标记完成，健康时间线已更新。`,
          title: '疫苗计划已完成',
        });
      }
      return success(nextVaccine);
    },

    async listVaccineReminderIds(): Promise<ApiResult<string[]>> {
      await wait(120);
      return success(vaccineReminderIds);
    },

    async setVaccineReminder(id: string, enabled: boolean): Promise<ApiResult<string[]>> {
      await wait(160);
      const vaccine = vaccines.find((item) => item.id === id);
      if (!vaccine) return error('疫苗计划不存在', false);
      if (vaccine.status === 'done' && enabled) return error('已完成的疫苗计划无需开启提醒', false);
      vaccineReminderIds = enabled ? [...new Set([id, ...vaccineReminderIds])] : vaccineReminderIds.filter((item) => item !== id);
      if (enabled) {
        addMockNotification({
          id: `mock-health-reminder-${id}`,
          read: false,
          text: `${vaccine.name}即将到期，记得按宠物医院建议确认时间。`,
          title: '健康提醒',
        });
      }
      return success(vaccineReminderIds);
    },

    async saveHealthMemo(title: string, content: string): Promise<ApiResult<HealthMemo>> {
      await wait();
      const memo = { id: `m-${Date.now()}`, title, content, updatedAt: '2026-05-30' };
      memos = [memo, ...memos];
      return success(memo);
    },

    async updateHealthMemo(id: string, patch: Partial<Pick<HealthMemo, 'content' | 'title'>>): Promise<ApiResult<HealthMemo>> {
      await wait(160);
      const memo = memos.find((item) => item.id === id);
      if (!memo) return error('健康备忘不存在', false);
      const title = String(patch.title ?? memo.title).trim();
      const content = String(patch.content ?? memo.content).trim();
      if (!title || !content) return error('请填写备忘标题和内容', false);
      const nextMemo = { ...memo, title, content, updatedAt: '刚刚' };
      memos = memos.map((item) => (item.id === id ? nextMemo : item));
      return success(nextMemo);
    },

    async deleteHealthMemo(id: string): Promise<ApiResult<HealthMemo[]>> {
      await wait(160);
      if (!memos.some((item) => item.id === id)) return error('健康备忘不存在', false);
      memos = memos.filter((item) => item.id !== id);
      return success(memos);
    },

    async listHealthMemos(): Promise<ApiResult<HealthMemo[]>> {
      await wait(140);
      return success(memos);
    },
  },

  social: {
    async listNearbyOwners(_location?: NearbyLocationHint): Promise<ApiResult<NearbyOwner[]>> {
      await wait(200);
      return success(owners);
    },

    async sendGreeting(ownerId: string): Promise<ApiResult<GreetingResult>> {
      await wait();
      const owner = owners.find((item) => item.id === ownerId);
      if (!owner) return error('对方暂时不可打招呼，请刷新附近列表后再试', true);
      return success({ ownerId, sent: true });
    },

    async listGreetingRequests(): Promise<ApiResult<NearbyOwner[]>> {
      await wait(160);
      return success(greetingRequests);
    },

    async acceptGreeting(ownerId: string): Promise<ApiResult<GreetingResult>> {
      await wait();
      const owner = greetingRequests.find((item) => item.id === ownerId) ?? owners.find((item) => item.id === ownerId);
      greetingRequests = greetingRequests.filter((item) => item.id !== ownerId);
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
        updatedAt: '刚刚',
      };
      conversations.unshift(conversation);
      conversationMessagesById[conversation.id] = [
        { author: 'system', id: `${conversation.id}-system`, text: '你们已经互相打招呼，可以开始聊天。', time: '刚刚' },
      ];
      return success({ conversation, ownerId, sent: true });
    },

    async rejectGreeting(ownerId: string): Promise<ApiResult<{ ownerId: string; rejected: true }>> {
      await wait();
      greetingRequests = greetingRequests.filter((item) => item.id !== ownerId);
      return success({ ownerId, rejected: true });
    },

    async createWalkInvite(ownerId: string, input?: WalkInviteInput): Promise<ApiResult<WalkInviteResult>> {
      await wait();
      const owner = owners.find((item) => item.id === ownerId);
      const inviteId = `walk-${Date.now()}`;
      const place = input?.place ?? '附近宠物友好地点';
      const time = input?.time ?? '今天';
      const note = input?.note ?? '';
      const inviteViolation =
        mockSocialChatContentViolation('约遛地点', place, 80) ||
        mockSocialChatContentViolation('约遛时间', time, 60) ||
        mockSocialChatContentViolation('约遛备注', note, 240);
      if (inviteViolation) return error(inviteViolation, false);
      const message = `${time} · ${place}`;
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
        updatedAt: '刚刚',
      };
      conversations.unshift(conversation);
      conversationMessagesById[conversation.id] = [
        { author: 'me', id: `${conversation.id}-invite`, status: 'sent', text: note ? `${message}\n${note}` : message, time: '刚刚' },
      ];
      return success({ conversation, inviteId, ownerId });
    },
  },

  messages: {
    async registerPushToken(token: string, platform: PushDevice['platform'], deviceId?: string): Promise<ApiResult<PushDevice>> {
      await wait(120);
      const normalizedToken = String(token || '').trim();
      if (!normalizedToken) return error('推送 token 不能为空', false);
      const normalizedPlatform = platform === 'ios' || platform === 'web' ? platform : 'android';
      const device: PushDevice = {
        deviceId: deviceId ? String(deviceId) : undefined,
        platform: normalizedPlatform,
        token: normalizedToken,
        updatedAt: '刚刚',
      };
      pushDevices = [
        device,
        ...pushDevices.filter((item) => (device.deviceId ? item.deviceId !== device.deviceId : item.token !== device.token)),
      ];
      return success(device);
    },

    async listConversations(): Promise<ApiResult<Conversation[]>> {
      await wait(160);
      return success(conversations);
    },

    async listConversationMessages(conversationId: string): Promise<ApiResult<ConversationMessage[]>> {
      await wait(160);
      return success(conversationMessagesById[conversationId] ?? []);
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
      const userMessage: ChatMessage = { id: `pet-user-${Date.now()}`, author: 'me', text, status: 'sent', time: '刚刚' };
      const replyText = detectMockPetMedicalEmergency(text)
        ? mockPetMedicalSafetyReply(text)
        : '我收到啦。这个情况我会放进今天的小记录里，如果和健康有关，也建议继续观察食欲、精神和便便状态。';
      const savedNotices = [
        medicalAlert ? `已帮你记录到健康备忘：「${medicalAlert.memo.title}」，并生成就医提醒。` : '',
        profileUpdate ? `已帮你更新宠物档案：${describeMockPetProfilePatch(profileUpdate.patch)}。` : '',
        vaccineAction?.action === 'done' ? `已帮你标记${vaccineAction.vaccine.name}完成。` : '',
        vaccineAction?.action === 'reminder_on' ? `已帮你开启${vaccineAction.vaccine.name}提醒。` : '',
        vaccineAction?.action === 'reminder_off' ? `已帮你关闭${vaccineAction.vaccine.name}提醒。` : '',
        createdWeight ? `已帮你记录体重：${createdWeight.kg}kg。` : '',
        createdMemo ? `已帮你记到健康备忘：「${createdMemo.title}」。` : '',
      ].filter(Boolean);
      const aiMessage: ChatMessage = {
        id: `pet-ai-${Date.now()}`,
        author: 'ai',
        createdMemo: createdMemo ?? undefined,
        createdWeight: createdWeight ?? undefined,
        medicalAlert: medicalAlert ? { notificationId: medicalAlert.notificationId, reason: medicalAlert.reason } : undefined,
        status: 'sent',
        text: savedNotices.length ? `${replyText}\n\n${savedNotices.join('\n')}` : replyText,
        time: '刚刚',
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
      if (!trimmedText) return error('请输入消息内容', false);
      const violation = mockSocialChatContentViolation('聊天内容', trimmedText);
      if (violation) return error(violation, false);
      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation) return error('会话不存在，请返回消息列表刷新', true);
      if (conversation.canSendMessage === false) return error('对方接受招呼后才能聊天', true);
      const message: ConversationMessage = { author: 'me', id: `conv-${Date.now()}`, status: 'sent', text: trimmedText, time: '刚刚' };
      conversationMessagesById[conversationId] = [...(conversationMessagesById[conversationId] ?? []), message];
      return success(message);
    },

    async markConversationRead(conversationId: string): Promise<ApiResult<true>> {
      await wait(100);
      const conversation = conversations.find((item) => item.id === conversationId);
      if (conversation) conversation.unread = 0;
      return success(true);
    },

    async listNotifications(): Promise<ApiResult<NotificationItem[]>> {
      await wait(160);
      return success(notifications);
    },

    async markNotificationsRead(ids?: string[]): Promise<ApiResult<NotificationItem[]>> {
      await wait(120);
      const idSet = ids?.length ? new Set(ids) : null;
      notifications = notifications.map((item) => (idSet && !idSet.has(item.id) ? item : { ...item, read: true }));
      return success(notifications);
    },
  },

  places: {
    async listNearbyPlaces(): Promise<ApiResult<Place[]>> {
      await wait(180);
      return success(places);
    },

    async searchPlaces(query: string): Promise<ApiResult<Place[]>> {
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

    async listMySubmissions(): Promise<ApiResult<PlaceSubmission[]>> {
      await wait(120);
      return success(placeSubmissions);
    },

    async createReview(placeId: string, content: string): Promise<ApiResult<PlaceReview>> {
      await wait();
      const place = places.find((item) => item.id === placeId);
      if (!place) return error('地点不存在', false);
      const trimmedContent = content.trim();
      if (!trimmedContent) return error('请填写点评内容', false);
      const violation = mockPublicPlaceContentViolation('点评内容', trimmedContent, 500);
      if (violation) return error(violation, false);
      const review: PlaceReview = {
        content: trimmedContent,
        createdAt: '刚刚',
        id: `review-${Date.now()}`,
        placeId,
        status: 'pending_review',
      };
      placeReviews = [review, ...placeReviews.filter((item) => item.placeId !== placeId)];
      addMockNotification({
        id: `notification-${review.id}`,
        read: false,
        text: `${place.name}的点评已进入审核队列`,
        title: '地点点评待审核',
      });
      return success(review);
    },

    async createSubmission(name: string, address: string, content: string): Promise<ApiResult<PlaceSubmission>> {
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
        createdAt: '刚刚',
        id: `place-submission-${Date.now()}`,
        name: trimmedName,
        status: 'pending_review',
      };
      placeSubmissions = [submission, ...placeSubmissions];
      addMockNotification({
        id: `notification-${submission.id}`,
        read: false,
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
    ownerName: mockOwnerName,
    permissions: mockPermissions,
    permissionsOnboardingCompleted: mockPermissionsOnboardingCompleted,
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
  if (/验证码错误/.test(message)) return 'SMS_CODE_INVALID';
  if (/验证码已过期/.test(message)) return 'SMS_CODE_EXPIRED';
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
