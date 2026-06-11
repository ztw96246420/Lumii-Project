import { extractMainlandChinaPhone } from '../services/sms';
import type {
  AccountSnapshot,
  ApiResult,
  AuthSession,
  AvatarJob,
  ChatMessage,
  Conversation,
  ConversationMessage,
  CreatePetInput,
  GreetingResult,
  HealthMemo,
  NearbyLocationHint,
  NearbyOwner,
  NotificationItem,
  PetChatFeedbackRating,
  PetProfile,
  Place,
  PlaceReview,
  PlaceSubmission,
  PermissionStateMap,
  SmsCodeTicket,
  UploadPetMediaInput,
  UploadedPetMedia,
  UserSettings,
  VaccinePlan,
  WalkInviteInput,
  WalkInviteResult,
  WeightRecord,
} from './types';

const wait = (ms = 360) => new Promise((resolve) => setTimeout(resolve, ms));

const lastSmsSentAtByPhone: Record<string, number> = {};
const smsCodeByPhone: Record<string, string> = {};
const SMS_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;

let currentMockPhone = '13800138000';
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

let weights: WeightRecord[] = [
  { id: 'w1', kg: 28.4, note: '精神很好，食欲正常', recordedAt: '2026-05-28' },
  { id: 'w2', kg: 28.1, recordedAt: '2026-05-21' },
];

let memos: HealthMemo[] = [
  { id: 'm1', title: '驱虫记录', content: '体外驱虫已完成，下次 6 月底。', updatedAt: '2026-05-20' },
];

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
  { id: 'c1', imageUrl: owners[0]?.imageUrl, name: '林然和奶油', lastMessage: '今晚 7 点公园见？', ownerId: owners[0]?.id, petName: '奶油', unread: 1 },
  { id: 'c2', name: '地点审核通知', lastMessage: '你提交的地点已进入审核。', unread: 0 },
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

function shouldStoreMockNotification(category: 'system' | 'interaction' = 'system') {
  if (!mockUserSettings.pushNotifications) return false;
  if (category === 'interaction' && !mockUserSettings.interactionMessages) return false;
  return true;
}

function addMockNotification(notification: NotificationItem, category: 'system' | 'interaction' = 'system') {
  if (!shouldStoreMockNotification(category) || notifications.some((item) => item.id === notification.id)) return;
  notifications = [notification, ...notifications];
}

export const mockApi = {
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

      const code = '962464';
      lastSmsSentAtByPhone[phone] = now;
      smsCodeByPhone[phone] = code;
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
      return success({
        analysis: acceptedPetMediaAnalysis,
        mediaId: `media-${Date.now()}`,
        previewUrl: input?.previewUrl ?? goldenRetrieverPhotoUrl,
        quality: 'good',
      });
    },

    async startGeneration(mediaId: string): Promise<ApiResult<AvatarJob>> {
      await wait();
      const id = `job-${mediaId}`;
      generationProgressById[id] = 24;
      return success({ id, progress: 24, status: 'processing' });
    },

    async getGenerationStatus(id: string): Promise<ApiResult<AvatarJob>> {
      await wait(500);
      const progress = Math.min(100, (generationProgressById[id] ?? 24) + 38);
      generationProgressById[id] = progress;
      return success({
        id,
        progress,
        resultUrl:
          progress >= 100
            ? goldenRetrieverAvatarUrl
            : undefined,
        status: progress >= 100 ? 'ready' : 'processing',
      });
    },

    async saveAvatar(petId: string, avatarUrl: string): Promise<ApiResult<PetProfile>> {
      return mockApi.pets.updatePet(petId, { avatarUrl });
    },
  },

  health: {
    async recordWeight(kg: number, note?: string): Promise<ApiResult<WeightRecord>> {
      await wait();
      const record = { id: `w-${Date.now()}`, kg, note, recordedAt: '2026-05-30' };
      weights = [record, ...weights];
      return success(record);
    },

    async listWeightRecords(): Promise<ApiResult<WeightRecord[]>> {
      await wait(140);
      return success(weights);
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
      const conversation: Conversation = {
        id: `greeting-${ownerId}`,
        imageUrl: owner?.imageUrl,
        lastMessage: '我想认识你和你的毛孩子',
        name: owner ? `${owner.ownerName}和${owner.petName}` : '附近主人',
        ownerId,
        petName: owner?.petName,
        unread: 0,
        updatedAt: '刚刚',
      };
      conversations.unshift(conversation);
      conversationMessagesById[conversation.id] = [
        { author: 'me', id: `${conversation.id}-hello`, status: 'sent', text: conversation.lastMessage, time: '刚刚' },
      ];
      return success({ conversation, ownerId, sent: true });
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
        id: `accepted-${ownerId}`,
        imageUrl: owner?.imageUrl,
        lastMessage: '我们已经互相打招呼啦',
        name: owner ? `${owner.ownerName}和${owner.petName}` : '附近主人',
        ownerId,
        petName: owner?.petName,
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
      const message = `${input?.time ?? '今天'} · ${input?.place ?? '附近宠物友好地点'}`;
      const conversation: Conversation = {
        id: `walk-${ownerId}-${Date.now()}`,
        imageUrl: owner?.imageUrl,
        lastMessage: message,
        name: owner ? `${owner.ownerName}和${owner.petName}` : '附近主人',
        ownerId,
        petName: owner?.petName,
        unread: 0,
        updatedAt: '刚刚',
      };
      conversations.unshift(conversation);
      conversationMessagesById[conversation.id] = [
        { author: 'me', id: `${conversation.id}-invite`, status: 'sent', text: input?.note ? `${message}\n${input.note}` : message, time: '刚刚' },
      ];
      return success({ conversation, inviteId, ownerId });
    },
  },

  messages: {
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
      const userMessage: ChatMessage = { id: `pet-user-${Date.now()}`, author: 'me', text, status: 'sent', time: '刚刚' };
      const aiMessage: ChatMessage = {
        id: `pet-ai-${Date.now()}`,
        author: 'ai',
        status: 'sent',
        text: '我收到啦。这个情况我会放进今天的小记录里，如果和健康有关，也建议继续观察食欲、精神和便便状态。',
        time: '刚刚',
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
      if (!text.trim()) return error('请输入消息内容', false);
      const message: ConversationMessage = { author: 'me', id: `conv-${Date.now()}`, status: 'sent', text, time: '刚刚' };
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

    async createReview(placeId: string, content: string): Promise<ApiResult<PlaceReview>> {
      await wait();
      const place = places.find((item) => item.id === placeId);
      if (!place) return error('地点不存在', false);
      if (!content.trim()) return error('请填写点评内容', false);
      const review: PlaceReview = {
        content: content.trim(),
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
      if (!name.trim() || !address.trim()) return error('请填写地点名称和地址', false);
      if (!content.trim()) return error('请填写宠物友好体验', false);
      const submission: PlaceSubmission = {
        address: address.trim(),
        content: content.trim(),
        createdAt: '刚刚',
        id: `place-submission-${Date.now()}`,
        name: name.trim(),
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
    permissions: mockPermissions,
    permissionsOnboardingCompleted: mockPermissionsOnboardingCompleted,
    settings: mockUserSettings,
  };
}

function success<T>(data: T): ApiResult<T> {
  return { data, state: 'success' };
}

function error<T>(message: string, retryable: boolean, data?: T): ApiResult<T> {
  return { data, error: { message, retryable }, state: 'error' };
}
