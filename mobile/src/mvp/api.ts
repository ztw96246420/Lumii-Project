import { mockApi } from './mockApi';
import type {
  ApiError,
  ApiResult,
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

declare const process: {
  env?: Record<string, string | undefined>;
};

export type LumiiApi = typeof mockApi;
export type LumiiApiMode = 'http' | 'mock';

const env = process?.env ?? {};
const localLanBackendBaseUrl = 'http://193.112.92.111';
const configuredMode = env.EXPO_PUBLIC_API_MODE === 'mock' ? 'mock' : 'http';
const configuredBaseUrl = (env.EXPO_PUBLIC_API_BASE_URL ?? localLanBackendBaseUrl).replace(/\/+$/, '');
const shouldUseHttp = configuredMode === 'http' && configuredBaseUrl.length > 0;

let authToken = '';
let cachedActivePet: PetProfile | null = null;

export const apiConfig = {
  baseUrl: configuredBaseUrl,
  mode: shouldUseHttp ? 'http' : 'mock',
  requestedMode: configuredMode,
} as const;

export const lumiiApi: LumiiApi = shouldUseHttp ? createHttpApi(configuredBaseUrl) : mockApi;

export function setLumiiAuthToken(token?: string) {
  const nextToken = token ?? '';
  if (authToken !== nextToken) cachedActivePet = null;
  authToken = nextToken;
}

function createHttpApi(baseUrl: string): LumiiApi {
  return {
    support: {
      async submitFeedback(content: string, category: FeedbackCategory = 'other', contact?: string): Promise<ApiResult<FeedbackSubmission>> {
        return request<FeedbackSubmission>('POST', '/feedback', { category, contact, content });
      },
    },

    legal: {
      async getPrivacy(): Promise<ApiResult<LegalDocument>> {
        return request<LegalDocument>('GET', '/legal/privacy');
      },

      async getTerms(): Promise<ApiResult<LegalDocument>> {
        return request<LegalDocument>('GET', '/legal/terms');
      },
    },

    account: {
      async getMe(): Promise<ApiResult<UserProfile>> {
        return request<UserProfile>('GET', '/me');
      },

      async updateMe(patch: Partial<Pick<UserProfile, 'ownerName'>>): Promise<ApiResult<UserProfile>> {
        return request<UserProfile>('PATCH', '/me', patch);
      },
    },

    auth: {
      async sendSmsCode(phoneInput: string): Promise<ApiResult<SmsCodeTicket>> {
        const result = await request<Partial<SmsCodeTicket>>('POST', '/auth/sms/send', { phone: phoneInput });
        return mapResult(result, (data) => ({
          availableAt: data.availableAt ?? Date.now() + 60 * 1000,
          code: data.code,
          expiresAt: data.expiresAt ?? Date.now() + 5 * 60 * 1000,
          phone: data.phone ?? phoneInput,
        }));
      },

      async verifySmsCode(phone: string, code: string, expiresAt: number): Promise<ApiResult<AuthSession>> {
        const result = await request<AuthSession>('POST', '/auth/sms/verify', { code, expiresAt, phone });
        if (result.data?.token) setLumiiAuthToken(result.data.token);
        return result;
      },

      async refreshSession(): Promise<ApiResult<AuthSession>> {
        const result = await request<AuthSession>('POST', '/auth/token/refresh');
        if (result.data?.token) setLumiiAuthToken(result.data.token);
        return result;
      },

      async logout(): Promise<ApiResult<true>> {
        const result = await request<true>('POST', '/auth/logout');
        if (result.state === 'success') setLumiiAuthToken();
        return result;
      },
    },

    permissions: {
      async getPermissionState(): Promise<ApiResult<PermissionStateMap>> {
        return request<PermissionStateMap>('GET', '/permissions');
      },

      async savePermissionState(next: Partial<PermissionStateMap>, completed = false): Promise<ApiResult<PermissionStateMap>> {
        return request<PermissionStateMap>('PATCH', '/permissions', { completed, permissions: next });
      },
    },

    settings: {
      async getUserSettings(): Promise<ApiResult<UserSettings>> {
        return request<UserSettings>('GET', '/settings');
      },

      async updateUserSettings(patch: Partial<UserSettings>): Promise<ApiResult<UserSettings>> {
        return request<UserSettings>('PATCH', '/settings', patch);
      },
    },

    pets: {
      async getTaxonomy(): Promise<ApiResult<PetTaxonomy>> {
        return request<PetTaxonomy>('GET', '/pet-taxonomy');
      },

      async createPet(input: CreatePetInput): Promise<ApiResult<PetProfile>> {
        const result = await request<PetProfile>('POST', '/pets', input);
        if (result.data) cachedActivePet = result.data;
        return result;
      },

      async updatePet(id: string, patch: Partial<PetProfile>): Promise<ApiResult<PetProfile>> {
        const result = await request<PetProfile>('PATCH', `/pets/${encodeURIComponent(id)}`, patch);
        if (result.data && cachedActivePet?.id === id) cachedActivePet = result.data;
        return result;
      },

      async getPet(id: string): Promise<ApiResult<PetProfile>> {
        const result = await request<PetProfile>('GET', `/pets/${encodeURIComponent(id)}`);
        if (result.data && cachedActivePet?.id === id) cachedActivePet = result.data;
        return result;
      },

      async deletePet(id: string): Promise<ApiResult<PetProfile[]>> {
        const result = await request<PetProfile[]>('DELETE', `/pets/${encodeURIComponent(id)}`);
        if (result.data) cachedActivePet = result.data[0] ?? null;
        return result;
      },

      async listPets(): Promise<ApiResult<PetProfile[]>> {
        const result = await request<PetProfile[]>('GET', '/pets');
        if (result.data?.length && !cachedActivePet) cachedActivePet = result.data[0];
        return result;
      },

      async setActivePet(id: string): Promise<ApiResult<PetProfile>> {
        const result = await request<PetProfile>('POST', `/pets/${encodeURIComponent(id)}/set-default`);
        if (result.data) cachedActivePet = result.data;
        return result;
      },

      getActivePet() {
        return cachedActivePet;
      },
    },

    avatar: {
      async uploadPetMedia(input: UploadPetMediaInput = { source: 'mvp_sample' }): Promise<ApiResult<UploadedPetMedia>> {
        return request<UploadedPetMedia>('POST', '/media/uploads', input);
      },

      async getUploadedMedia(mediaId: string): Promise<ApiResult<UploadedPetMedia>> {
        return request<UploadedPetMedia>('GET', `/media/${encodeURIComponent(mediaId)}`);
      },

      async startGeneration(mediaId: string): Promise<ApiResult<AvatarJob>> {
        return request<AvatarJob>('POST', '/ai/pet-avatar/jobs', { mediaId });
      },

      async getGenerationStatus(id: string): Promise<ApiResult<AvatarJob>> {
        return request<AvatarJob>('GET', `/ai/pet-avatar/jobs/${encodeURIComponent(id)}`);
      },

      async saveAvatar(petId: string, avatarUrl: string): Promise<ApiResult<PetProfile>> {
        const result = await request<PetProfile>('POST', `/pets/${encodeURIComponent(petId)}/avatar`, { avatarUrl });
        if (result.data) cachedActivePet = result.data;
        return result;
      },
    },

    health: {
      async getHealthSummary(): Promise<ApiResult<HealthSummary>> {
        return request<HealthSummary>('GET', '/health/summary');
      },

      async listHealthCalendar(): Promise<ApiResult<HealthCalendarEvent[]>> {
        return request<HealthCalendarEvent[]>('GET', '/health/calendar');
      },

      async recordWeight(kg: number, note?: string): Promise<ApiResult<WeightRecord>> {
        return request<WeightRecord>('POST', '/health/weights', { kg, note });
      },

      async updateWeightRecord(id: string, patch: Partial<Pick<WeightRecord, 'kg' | 'note' | 'recordedAt'>>): Promise<ApiResult<WeightRecord>> {
        return request<WeightRecord>('PATCH', `/health/weights/${encodeURIComponent(id)}`, patch);
      },

      async deleteWeightRecord(id: string): Promise<ApiResult<WeightRecord[]>> {
        return request<WeightRecord[]>('DELETE', `/health/weights/${encodeURIComponent(id)}`);
      },

      async listWeightRecords(): Promise<ApiResult<WeightRecord[]>> {
        return request<WeightRecord[]>('GET', '/health/weights');
      },

      async getWeightTrend(): Promise<ApiResult<WeightTrend>> {
        return request<WeightTrend>('GET', '/health/weights/trend');
      },

      async listVaccines(): Promise<ApiResult<VaccinePlan[]>> {
        return request<VaccinePlan[]>('GET', '/health/vaccines');
      },

      async updateVaccineStatus(id: string, status: VaccinePlan['status']): Promise<ApiResult<VaccinePlan>> {
        return request<VaccinePlan>('PATCH', `/health/vaccines/${encodeURIComponent(id)}`, { status });
      },

      async listVaccineReminderIds(): Promise<ApiResult<string[]>> {
        return request<string[]>('GET', '/health/vaccine-reminders');
      },

      async setVaccineReminder(id: string, enabled: boolean): Promise<ApiResult<string[]>> {
        return request<string[]>('PATCH', `/health/vaccine-reminders/${encodeURIComponent(id)}`, { enabled });
      },

      async saveHealthMemo(title: string, content: string): Promise<ApiResult<HealthMemo>> {
        return request<HealthMemo>('POST', '/health/memos', { content, title });
      },

      async updateHealthMemo(id: string, patch: Partial<Pick<HealthMemo, 'content' | 'title'>>): Promise<ApiResult<HealthMemo>> {
        return request<HealthMemo>('PATCH', `/health/memos/${encodeURIComponent(id)}`, patch);
      },

      async deleteHealthMemo(id: string): Promise<ApiResult<HealthMemo[]>> {
        return request<HealthMemo[]>('DELETE', `/health/memos/${encodeURIComponent(id)}`);
      },

      async listHealthMemos(): Promise<ApiResult<HealthMemo[]>> {
        return request<HealthMemo[]>('GET', '/health/memos');
      },
    },

    social: {
      async listNearbyOwners(location?: NearbyLocationHint): Promise<ApiResult<NearbyOwner[]>> {
        const query = location
          ? `?lat=${encodeURIComponent(location.latitude)}&lng=${encodeURIComponent(location.longitude)}&radiusKm=${encodeURIComponent(location.radiusKm ?? 3)}${location.accuracy ? `&accuracy=${encodeURIComponent(location.accuracy)}` : ''}`
          : '';
        return request<NearbyOwner[]>('GET', `/social/discover${query}`);
      },

      async sendGreeting(ownerId: string): Promise<ApiResult<GreetingResult>> {
        return request<GreetingResult>('POST', '/social/greetings', { ownerId });
      },

      async listGreetingRequests(): Promise<ApiResult<NearbyOwner[]>> {
        return request<NearbyOwner[]>('GET', '/social/greeting-requests');
      },

      async acceptGreeting(ownerId: string): Promise<ApiResult<GreetingResult>> {
        return request<GreetingResult>('POST', `/social/greeting-requests/${encodeURIComponent(ownerId)}/accept`);
      },

      async rejectGreeting(ownerId: string): Promise<ApiResult<{ ownerId: string; rejected: true }>> {
        return request<{ ownerId: string; rejected: true }>('POST', `/social/greeting-requests/${encodeURIComponent(ownerId)}/reject`);
      },

      async createWalkInvite(ownerId: string, input?: WalkInviteInput): Promise<ApiResult<WalkInviteResult>> {
        return request<WalkInviteResult>('POST', '/social/walk-invites', { note: input?.note, ownerId, place: input?.place, time: input?.time });
      },
    },

    messages: {
      async registerPushToken(token: string, platform: PushDevice['platform'], deviceId?: string): Promise<ApiResult<PushDevice>> {
        return request<PushDevice>('POST', '/devices/push-token', { deviceId, platform, token });
      },

      async listConversations(): Promise<ApiResult<Conversation[]>> {
        return request<Conversation[]>('GET', '/conversations');
      },

      async listConversationMessages(conversationId: string): Promise<ApiResult<ConversationMessage[]>> {
        return request<ConversationMessage[]>('GET', `/conversations/${encodeURIComponent(conversationId)}/messages`);
      },

      async sendMessage(text: string): Promise<ApiResult<ChatMessage>> {
        return request<ChatMessage>('POST', '/ai/pet-chat/messages', { text });
      },

      async listPetChatMessages(): Promise<ApiResult<ChatMessage[]>> {
        return request<ChatMessage[]>('GET', '/ai/pet-chat/messages');
      },

      async sendPetChatFeedback(messageId: string, rating: PetChatFeedbackRating): Promise<ApiResult<ChatMessage>> {
        return request<ChatMessage>('POST', `/ai/pet-chat/messages/${encodeURIComponent(messageId)}/feedback`, { rating });
      },

      async sendConversationMessage(conversationId: string, text: string): Promise<ApiResult<ConversationMessage>> {
        return request<ConversationMessage>('POST', `/conversations/${encodeURIComponent(conversationId)}/messages`, { text });
      },

      async markConversationRead(conversationId: string): Promise<ApiResult<true>> {
        return request<true>('POST', `/conversations/${encodeURIComponent(conversationId)}/read`);
      },

      async listNotifications(): Promise<ApiResult<NotificationItem[]>> {
        return request<NotificationItem[]>('GET', '/notifications');
      },

      async markNotificationsRead(ids?: string[]): Promise<ApiResult<NotificationItem[]>> {
        return request<NotificationItem[]>('POST', '/notifications/read', { ids });
      },
    },

    places: {
      async listNearbyPlaces(): Promise<ApiResult<Place[]>> {
        return request<Place[]>('GET', '/places/nearby');
      },

      async searchPlaces(query: string): Promise<ApiResult<Place[]>> {
        return request<Place[]>('GET', `/places/search?q=${encodeURIComponent(query)}`);
      },

      async getPlace(placeId: string): Promise<ApiResult<Place>> {
        return request<Place>('GET', `/places/${encodeURIComponent(placeId)}`);
      },

      async listFavoritePlaceIds(): Promise<ApiResult<string[]>> {
        return request<string[]>('GET', '/places/favorites');
      },

      async setFavoritePlace(placeId: string, favorite: boolean): Promise<ApiResult<string[]>> {
        return request<string[]>('PATCH', `/places/${encodeURIComponent(placeId)}/favorite`, { favorite });
      },

      async listMyReviews(): Promise<ApiResult<PlaceReview[]>> {
        return request<PlaceReview[]>('GET', '/places/reviews/my');
      },

      async listMySubmissions(): Promise<ApiResult<PlaceSubmission[]>> {
        return request<PlaceSubmission[]>('GET', '/places/submissions/my');
      },

      async createReview(placeId: string, content: string): Promise<ApiResult<PlaceReview>> {
        return request<PlaceReview>('POST', `/places/${encodeURIComponent(placeId)}/reviews`, {
          content,
          source: 'mvp',
        });
      },

      async createSubmission(name: string, address: string, content: string): Promise<ApiResult<PlaceSubmission>> {
        return request<PlaceSubmission>('POST', '/places/submissions', {
          address,
          content,
          name,
          source: 'mvp',
        });
      },
    },
  };

  async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        method,
      });

      const payload = await readJson(response);
      if (!response.ok) {
        return errorResult(messageFromPayload(payload) ?? `服务请求失败（${response.status}）`, response.status >= 500, response.status);
      }

      return normalizeResult<T>(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : '网络请求失败，请稍后重试';
      return errorResult(message, true);
    }
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return true;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeResult<T>(payload: unknown): ApiResult<T> {
  if (isApiResult<T>(payload)) return payload;

  if (isRecord(payload) && payload.success === false) {
    return errorResult(messageFromPayload(payload) ?? '请求失败', Boolean(payload.retryable));
  }

  if (isRecord(payload) && 'data' in payload) {
    return { data: payload.data as T, state: 'success' };
  }

  return { data: payload as T, state: 'success' };
}

function mapResult<T, U>(result: ApiResult<T>, mapper: (data: T) => U): ApiResult<U> {
  if (result.state === 'success' && result.data !== undefined) return { data: mapper(result.data), state: 'success' };
  if (result.data !== undefined) return { data: mapper(result.data), error: result.error, state: 'error' };
  return { error: result.error, state: 'error' };
}

function isApiResult<T>(payload: unknown): payload is ApiResult<T> {
  return isRecord(payload) && (payload.state === 'success' || payload.state === 'error' || payload.state === 'loading');
}

function messageFromPayload(payload: unknown) {
  if (!isRecord(payload)) return undefined;
  if (typeof payload.message === 'string') return payload.message;
  if (isRecord(payload.error) && typeof payload.error.message === 'string') return payload.error.message;
  return undefined;
}

function errorResult<T = never>(message: string, retryable: boolean, statusCode?: number): ApiResult<T> {
  const apiError: ApiError = { message, retryable, statusCode };
  return { error: apiError, state: 'error' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
