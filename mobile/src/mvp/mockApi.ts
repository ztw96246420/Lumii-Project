import { extractMainlandChinaPhone } from '../services/sms';
import type {
  AccountSnapshot,
  ApiResult,
  AuthSession,
  AvatarJob,
  ChatMessage,
  Conversation,
  CreatePetInput,
  HealthMemo,
  NearbyLocationHint,
  NearbyOwner,
  NotificationItem,
  PetProfile,
  Place,
  PermissionStateMap,
  SmsCodeTicket,
  UploadPetMediaInput,
  UploadedPetMedia,
  VaccinePlan,
  WeightRecord,
} from './types';

const wait = (ms = 360) => new Promise((resolve) => setTimeout(resolve, ms));

const lastSmsSentAtByPhone: Record<string, number> = {};
const smsCodeByPhone: Record<string, string> = {};
const SMS_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;

let pets: PetProfile[] = [];
let activePetId = '';
let generationProgressById: Record<string, number> = {};
let mockPermissions: PermissionStateMap = {
  location: 'unknown',
  media: 'unknown',
  notifications: 'unknown',
};
let mockPermissionsOnboardingCompleted = false;

const goldenRetrieverPhotoUrl =
  'https://images.unsplash.com/photo-1625794084867-8ddd239946b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=720';
const goldenRetrieverAvatarUrl =
  'lumii://golden-retriever-avatar';

let weights: WeightRecord[] = [
  { id: 'w1', kg: 28.4, note: '精神很好，食欲正常', recordedAt: '2026-05-28' },
  { id: 'w2', kg: 28.1, recordedAt: '2026-05-21' },
];

let memos: HealthMemo[] = [
  { id: 'm1', title: '驱虫记录', content: '体外驱虫已完成，下次 6 月底。', updatedAt: '2026-05-20' },
];

const vaccines: VaccinePlan[] = [
  { id: 'v1', name: '狂犬疫苗', dueAt: '2026-06-18', status: 'due' },
  { id: 'v2', name: '体内驱虫', dueAt: '2026-06-05', status: 'due' },
];

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
  { id: 'c1', name: '林然和奶油', lastMessage: '今晚 7 点公园见？', unread: 1 },
  { id: 'c2', name: '地点审核通知', lastMessage: '你提交的地点已进入审核。', unread: 0 },
];

const notifications: NotificationItem[] = [
  { id: 'n1', title: '疫苗提醒', text: '狂犬疫苗将在 19 天后到期。', read: false },
  { id: 'n2', title: 'AI 形象生成', text: '新的电子宠物形象已保存。', read: true },
];

const places: Place[] = [
  { id: 'p1', name: '云杉宠物友好公园', address: '滨江路 88 号', category: 'park', distance: '900m', rating: 4.8, tags: ['可遛狗', '草坪', '饮水点'] },
  { id: 'p2', name: '暖爪咖啡', address: '中央广场 B1', category: 'cafe', distance: '1.6km', rating: 4.6, tags: ['室内友好', '可带猫包'] },
  { id: 'p3', name: '安心宠物医院', address: '明湖街 12 号', category: 'clinic', distance: '2.3km', rating: 4.7, tags: ['急诊', '疫苗'] },
];

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
      return success({ account: buildMockAccountSnapshot(), phone, token: `mock-token-${phone}` });
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

    async sendGreeting(ownerId: string): Promise<ApiResult<{ ownerId: string; sent: true }>> {
      await wait();
      return success({ ownerId, sent: true });
    },

    async createWalkInvite(ownerId: string): Promise<ApiResult<{ inviteId: string; ownerId: string }>> {
      await wait();
      return success({ inviteId: `walk-${Date.now()}`, ownerId });
    },
  },

  messages: {
    async listConversations(): Promise<ApiResult<Conversation[]>> {
      await wait(160);
      return success(conversations);
    },

    async sendMessage(text: string): Promise<ApiResult<ChatMessage>> {
      await wait();
      if (!text.trim()) return error('请输入消息内容', false);
      return success({ id: `msg-${Date.now()}`, author: 'me', text, status: 'sent', time: '刚刚' });
    },

    async listNotifications(): Promise<ApiResult<NotificationItem[]>> {
      await wait(160);
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
      return success(normalized ? places.filter((place) => place.name.includes(normalized) || place.tags.some((tag) => tag.includes(normalized))) : places);
    },

    async createReview(placeId: string): Promise<ApiResult<{ placeId: string; status: 'pending_review' }>> {
      await wait();
      return success({ placeId, status: 'pending_review' });
    },
  },
};

function buildMockAccountSnapshot(): AccountSnapshot {
  return {
    activePet: pets.find((pet) => pet.id === activePetId) ?? pets[0] ?? null,
    permissions: mockPermissions,
    permissionsOnboardingCompleted: mockPermissionsOnboardingCompleted,
  };
}

function success<T>(data: T): ApiResult<T> {
  return { data, state: 'success' };
}

function error<T>(message: string, retryable: boolean, data?: T): ApiResult<T> {
  return { data, error: { message, retryable }, state: 'error' };
}
