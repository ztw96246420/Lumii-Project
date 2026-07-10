import { mockApi } from './mockApi';
import { getLumiiInstallationId } from '../services/installationId';
import type {
  ApiError,
  ApiResult,
  AccountDeletionConfirmResult,
  AccountDeletionRequestResult,
  AppAnalyticsEventInput,
  AppRemoteConfig,
  AiUsageSummary,
  AvatarGenerationFeedbackReason,
  AvatarAnimationJob,
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
  NotificationItem,
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
  SanctionAppealItem,
  SanctionAppealList,
  SocialBlockListItem,
  SocialBlockOptions,
  SocialBlockResult,
  SmsCodeTicket,
  SupportTicketDetail,
  SupportTicketAttachmentDraft,
  SupportTicketList,
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
  env: Record<string, string | undefined>;
};

export type LumiiApi = typeof mockApi;
export type LumiiApiMode = 'http' | 'mock';

const localLanBackendBaseUrl = 'http://193.112.92.111';
const configuredMode = process.env.EXPO_PUBLIC_API_MODE === 'mock' ? 'mock' : 'http';
const configuredBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? localLanBackendBaseUrl).replace(/\/+$/, '');
const requiresHttps = process.env.EXPO_PUBLIC_REQUIRE_HTTPS === 'true';
if (requiresHttps && (configuredMode !== 'http' || !configuredBaseUrl.startsWith('https://'))) {
  throw new Error('Lumii production API configuration requires an HTTPS EXPO_PUBLIC_API_BASE_URL.');
}
const shouldUseHttp = configuredMode === 'http' && configuredBaseUrl.length > 0;
const httpRequestTimeoutMs = 15000;
const avatarStartRequestTimeoutMs = 120000;
const avatarStatusRequestTimeoutMs = 30000;

let authToken = '';
let cachedActivePet: PetProfile | null = null;

export const apiConfig = {
  baseUrl: configuredBaseUrl,
  mode: shouldUseHttp ? 'http' : 'mock',
  requestedMode: configuredMode,
  requiresHttps,
} as const;

export const lumiiApi: LumiiApi = shouldUseHttp ? createHttpApi(configuredBaseUrl) : mockApi;

export function setLumiiAuthToken(token?: string) {
  const nextToken = token ?? '';
  if (authToken !== nextToken) cachedActivePet = null;
  authToken = nextToken;
}

function nearbyLocationQuery(location?: NearbyLocationHint) {
  if (!location) return '';
  return `lat=${encodeURIComponent(location.latitude)}&lng=${encodeURIComponent(location.longitude)}&radiusKm=${encodeURIComponent(location.radiusKm ?? 3)}${location.accuracy ? `&accuracy=${encodeURIComponent(location.accuracy)}` : ''}`;
}

function createHttpApi(baseUrl: string): LumiiApi {
  return {
    config: {
      async getAppConfig(): Promise<ApiResult<AppRemoteConfig>> {
        return request<AppRemoteConfig>('GET', '/app/config');
      },
    },

    analytics: {
      async trackEvent(input: AppAnalyticsEventInput): Promise<ApiResult<{ accepted: boolean; disabled?: boolean; eventId?: string }>> {
        const deviceId = input.deviceId || await getLumiiInstallationId();
        return request<{ accepted: boolean; disabled?: boolean; eventId?: string }>('POST', '/analytics/events', { ...input, deviceId });
      },
    },

    ai: {
      async getUsage(): Promise<ApiResult<AiUsageSummary>> {
        return request<AiUsageSummary>('GET', '/ai/usage');
      },
    },

    support: {
      async getSanctionAppeals(): Promise<ApiResult<SanctionAppealList>> {
        return request<SanctionAppealList>('GET', '/sanction-appeals');
      },

      async getTicket(ticketId: string): Promise<ApiResult<SupportTicketDetail>> {
        return request<SupportTicketDetail>('GET', `/support/tickets/${encodeURIComponent(ticketId)}`);
      },

      async getTickets(): Promise<ApiResult<SupportTicketList>> {
        return request<SupportTicketList>('GET', '/support/tickets');
      },

      async rateTicket(ticketId: string, rating: number, comment = ''): Promise<ApiResult<SupportTicketDetail>> {
        return request<SupportTicketDetail>('POST', `/support/tickets/${encodeURIComponent(ticketId)}/rate`, { comment, rating });
      },

      async reopenTicket(ticketId: string, content: string, attachments: SupportTicketAttachmentDraft[] = []): Promise<ApiResult<SupportTicketDetail>> {
        return request<SupportTicketDetail>('POST', `/support/tickets/${encodeURIComponent(ticketId)}/reopen`, { attachments, content });
      },

      async replyTicket(ticketId: string, content: string, attachments: SupportTicketAttachmentDraft[] = []): Promise<ApiResult<SupportTicketDetail>> {
        return request<SupportTicketDetail>('POST', `/support/tickets/${encodeURIComponent(ticketId)}/reply`, { attachments, content });
      },

      async submitSanctionAppeal(content: string, sanctionId?: string): Promise<ApiResult<SanctionAppealItem>> {
        return request<SanctionAppealItem>('POST', '/sanction-appeals', { content, sanctionId });
      },

      async submitReportAppeal(reportId: string, content: string): Promise<ApiResult<SanctionAppealItem>> {
        return request<SanctionAppealItem>('POST', '/report-appeals', { content, reportId });
      },

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

      async confirmDeletion(code: string): Promise<ApiResult<AccountDeletionConfirmResult>> {
        return request<AccountDeletionConfirmResult>('POST', '/account/delete/confirm', { code });
      },

      async requestDeletion(): Promise<ApiResult<AccountDeletionRequestResult>> {
        return request<AccountDeletionRequestResult>('POST', '/account/delete/request');
      },

      async updateMe(patch: OwnerProfilePatch): Promise<ApiResult<UserProfile>> {
        return request<UserProfile>('PATCH', '/me', patch);
      },
    },

    auth: {
      async sendSmsCode(phoneInput: string): Promise<ApiResult<SmsCodeTicket>> {
        const deviceId = await getLumiiInstallationId();
        const result = await request<Partial<SmsCodeTicket>>('POST', '/auth/sms/send', { deviceId, phone: phoneInput });
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

      async updatePet(id: string, patch: PetProfilePatch): Promise<ApiResult<PetProfile>> {
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
        return request<AvatarJob>('POST', '/ai/pet-avatar/jobs', { mediaId }, { timeoutMs: avatarStartRequestTimeoutMs });
      },

      async getGenerationStatus(id: string): Promise<ApiResult<AvatarJob>> {
        return request<AvatarJob>('GET', `/ai/pet-avatar/jobs/${encodeURIComponent(id)}`, undefined, { timeoutMs: avatarStatusRequestTimeoutMs });
      },

      async getLatestGeneration(petId?: string): Promise<ApiResult<AvatarJob | null>> {
        const query = petId ? `?petId=${encodeURIComponent(petId)}` : '';
        return request<AvatarJob | null>('GET', `/ai/pet-avatar/jobs/latest${query}`, undefined, { timeoutMs: avatarStatusRequestTimeoutMs });
      },

      async getLatestAnimation(petId?: string): Promise<ApiResult<AvatarAnimationJob | null>> {
        const query = petId ? `?petId=${encodeURIComponent(petId)}` : '';
        return request<AvatarAnimationJob | null>('GET', `/ai/pet-avatar/animation/latest${query}`, undefined, { timeoutMs: avatarStatusRequestTimeoutMs });
      },

      async getAnimationStatus(id: string): Promise<ApiResult<AvatarAnimationJob>> {
        return request<AvatarAnimationJob>('GET', `/ai/pet-avatar/animation/${encodeURIComponent(id)}`, undefined, { timeoutMs: avatarStatusRequestTimeoutMs });
      },

      async startAnimation(petId?: string): Promise<ApiResult<AvatarAnimationJob | null>> {
        return request<AvatarAnimationJob | null>('POST', '/ai/pet-avatar/animation', petId ? { petId } : undefined, { timeoutMs: avatarStartRequestTimeoutMs });
      },

      async retryGeneration(jobId: string): Promise<ApiResult<AvatarJob>> {
        return request<AvatarJob>('POST', `/ai/pet-avatar/jobs/${encodeURIComponent(jobId)}/retry`, undefined, { timeoutMs: avatarStartRequestTimeoutMs });
      },

      async acceptGeneration(jobId: string): Promise<ApiResult<PetProfile>> {
        const result = await request<PetProfile>('POST', `/ai/pet-avatar/jobs/${encodeURIComponent(jobId)}/accept`);
        if (result.data) cachedActivePet = result.data;
        return result;
      },

      async sendGenerationFeedback(jobId: string, reason: AvatarGenerationFeedbackReason = 'other', content?: string): Promise<ApiResult<AvatarJob>> {
        return request<AvatarJob>('POST', `/ai/pet-avatar/jobs/${encodeURIComponent(jobId)}/feedback`, { content, reason });
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

      async recordWeight(kg: number, note?: string, recordedAt?: string): Promise<ApiResult<WeightRecord>> {
        return request<WeightRecord>('POST', '/health/weights', { kg, note, recordedAt });
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

      async createVaccinePlan(input: CreateVaccinePlanInput): Promise<ApiResult<VaccinePlan>> {
        return request<VaccinePlan>('POST', '/health/vaccines', input);
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

      async saveHealthMemo(
        title: string,
        content: string,
        options: Pick<HealthMemo, 'reminderAt' | 'reminderEnabled' | 'repeat'> = {},
      ): Promise<ApiResult<HealthMemo>> {
        return request<HealthMemo>('POST', '/health/memos', { content, title, ...options });
      },

      async updateHealthMemo(id: string, patch: Partial<Pick<HealthMemo, 'content' | 'reminderAt' | 'reminderEnabled' | 'repeat' | 'title'>>): Promise<ApiResult<HealthMemo>> {
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
        const locationQuery = nearbyLocationQuery(location);
        const query = locationQuery ? `?${locationQuery}` : '';
        return request<NearbyOwner[]>('GET', `/social/discover${query}`);
      },

      async listNearbyMoments(location?: NearbyLocationHint): Promise<ApiResult<NearbyMoment[]>> {
        const locationQuery = nearbyLocationQuery(location);
        const query = locationQuery ? `?${locationQuery}` : '';
        return request<NearbyMoment[]>('GET', `/social/nearby-moments${query}`);
      },

      async listPetCirclePosts(location?: NearbyLocationHint, options: { cursor?: string; limit?: number } = {}): Promise<ApiResult<PetCirclePostList>> {
        const locationQuery = nearbyLocationQuery(location);
        const queryParts = [
          locationQuery,
          options.cursor ? `cursor=${encodeURIComponent(options.cursor)}` : '',
          options.limit ? `limit=${encodeURIComponent(options.limit)}` : '',
        ].filter(Boolean);
        const query = queryParts.length ? `?${queryParts.join('&')}` : '';
        return request<PetCirclePostList>('GET', `/social/pet-circle/posts${query}`);
      },

      async getPetCirclePost(postId: string, location?: NearbyLocationHint): Promise<ApiResult<NearbyMoment>> {
        const locationQuery = nearbyLocationQuery(location);
        const query = locationQuery ? `?${locationQuery}` : '';
        return request<NearbyMoment>('GET', `/social/pet-circle/posts/${encodeURIComponent(postId)}${query}`);
      },

      async listPetCircleProfilePosts(ownerId = 'me', options: { cursor?: string; limit?: number } = {}): Promise<ApiResult<PetCircleProfilePostList>> {
        const queryParts = [
          options.cursor ? `cursor=${encodeURIComponent(options.cursor)}` : '',
          options.limit ? `limit=${encodeURIComponent(options.limit)}` : '',
        ].filter(Boolean);
        const query = queryParts.length ? `?${queryParts.join('&')}` : '';
        return request<PetCircleProfilePostList>('GET', `/social/pet-circle/profiles/${encodeURIComponent(ownerId || 'me')}/posts${query}`);
      },

      async updatePetCircleCover(coverImageUrl: string): Promise<ApiResult<PetCircleProfile>> {
        return request<PetCircleProfile>('PATCH', '/social/pet-circle/profile/cover', { coverImageUrl });
      },

      async createMoment(content: string, mood?: string, photoCount = 0, options: { imageUrls?: string[]; location?: NearbyLocationHint | null; syncToHealthCalendar?: boolean; visibility?: 'nearby' | 'private' } = {}): Promise<ApiResult<NearbyMoment>> {
        return request<NearbyMoment>('POST', '/social/pet-circle/posts', { content, imageUrls: options.imageUrls, location: options.location ?? undefined, mood, photoCount, syncToHealthCalendar: options.syncToHealthCalendar, visibility: options.visibility ?? 'nearby' });
      },

      async likePetCirclePost(postId: string): Promise<ApiResult<NearbyMoment>> {
        return request<NearbyMoment>('POST', `/social/pet-circle/posts/${encodeURIComponent(postId)}/like`);
      },

      async unlikePetCirclePost(postId: string): Promise<ApiResult<NearbyMoment>> {
        return request<NearbyMoment>('DELETE', `/social/pet-circle/posts/${encodeURIComponent(postId)}/like`);
      },

      async listPetCircleComments(postId: string): Promise<ApiResult<PetCircleComment[]>> {
        return request<PetCircleComment[]>('GET', `/social/pet-circle/posts/${encodeURIComponent(postId)}/comments`);
      },

      async createPetCircleComment(postId: string, content: string): Promise<ApiResult<PetCircleComment[]>> {
        return request<PetCircleComment[]>('POST', `/social/pet-circle/posts/${encodeURIComponent(postId)}/comments`, { content });
      },

      async deletePetCircleComment(commentId: string): Promise<ApiResult<{ deleted: boolean; id: string }>> {
        return request<{ deleted: boolean; id: string }>('DELETE', `/social/pet-circle/comments/${encodeURIComponent(commentId)}`);
      },

      async deletePetCirclePost(postId: string): Promise<ApiResult<{ deleted: boolean; id: string }>> {
        return request<{ deleted: boolean; id: string }>('DELETE', `/social/pet-circle/posts/${encodeURIComponent(postId)}`);
      },

      async reportPetCirclePost(postId: string, content?: string): Promise<ApiResult<PetCircleReportResult>> {
        return request<PetCircleReportResult>('POST', `/social/pet-circle/posts/${encodeURIComponent(postId)}/report`, { content });
      },

      async reportPetCircleComment(commentId: string, content?: string): Promise<ApiResult<PetCircleReportResult>> {
        return request<PetCircleReportResult>('POST', `/social/pet-circle/comments/${encodeURIComponent(commentId)}/report`, { content });
      },

      async blockOwner(ownerId: string, options: SocialBlockOptions = {}): Promise<ApiResult<SocialBlockResult>> {
        return request<SocialBlockResult>('POST', '/social/blocks', { ownerId, ...options });
      },

      async listBlocks(): Promise<ApiResult<SocialBlockListItem[]>> {
        return request<SocialBlockListItem[]>('GET', '/social/blocks');
      },

      async unblockOwner(ownerId: string): Promise<ApiResult<{ deleted: boolean; ownerId: string }>> {
        return request<{ deleted: boolean; ownerId: string }>('DELETE', `/social/blocks/${encodeURIComponent(ownerId)}`);
      },

      async sendGreeting(ownerId: string, options: GreetingOptions = {}): Promise<ApiResult<GreetingResult>> {
        return request<GreetingResult>('POST', '/social/greetings', { ownerId, postId: options.postId, source: options.source });
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
        return request<WalkInviteResult>('POST', '/social/walk-invites', {
          latitude: input?.latitude,
          longitude: input?.longitude,
          note: input?.note,
          ownerId,
          place: input?.place,
          placeAddress: input?.placeAddress,
          placeId: input?.placeId,
          time: input?.time,
        });
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

      async reportConversationMessage(conversationId: string, messageId: string, content?: string): Promise<ApiResult<PetCircleReportResult>> {
        return request<PetCircleReportResult>('POST', `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/report`, { content });
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
      async listNearbyPlaces(location?: NearbyLocationHint): Promise<ApiResult<Place[]>> {
        const locationQuery = nearbyLocationQuery(location);
        return request<Place[]>('GET', `/places/nearby${locationQuery ? `?${locationQuery}` : ''}`);
      },

      async searchPlaces(query: string, location?: NearbyLocationHint): Promise<ApiResult<Place[]>> {
        const locationQuery = nearbyLocationQuery(location);
        const params = [`q=${encodeURIComponent(query)}`, locationQuery].filter(Boolean).join('&');
        return request<Place[]>('GET', `/places/search?${params}`);
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

      async listPlaceReviews(placeId: string): Promise<ApiResult<PlaceReview[]>> {
        return request<PlaceReview[]>('GET', `/places/${encodeURIComponent(placeId)}/reviews`);
      },

      async listMySubmissions(): Promise<ApiResult<PlaceSubmission[]>> {
        return request<PlaceSubmission[]>('GET', '/places/submissions/my');
      },

      async createReview(placeId: string, content: string, imageUrls: string[] = []): Promise<ApiResult<PlaceReview>> {
        return request<PlaceReview>('POST', `/places/${encodeURIComponent(placeId)}/reviews`, {
          content,
          imageUrls,
          source: 'mvp',
        });
      },

      async reportReview(reviewId: string, content?: string): Promise<ApiResult<PetCircleReportResult>> {
        return request<PetCircleReportResult>('POST', `/places/reviews/${encodeURIComponent(reviewId)}/report`, { content });
      },

      async reportPlace(placeId: string, content?: string): Promise<ApiResult<PetCircleReportResult>> {
        return request<PetCircleReportResult>('POST', `/places/${encodeURIComponent(placeId)}/report`, { content });
      },

      async createSubmission(name: string, address: string, content: string, imageUrls: string[] = []): Promise<ApiResult<PlaceSubmission>> {
        return request<PlaceSubmission>('POST', '/places/submissions', {
          address,
          content,
          imageUrls,
          name,
          source: 'mvp',
        });
      },
    },
  };

  async function request<T>(method: string, path: string, body?: unknown, options: { timeoutMs?: number } = {}): Promise<ApiResult<T>> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timeoutId = controller ? setTimeout(() => controller.abort(), options.timeoutMs ?? httpRequestTimeoutMs) : undefined;
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        method,
        signal: controller?.signal,
      });

      const payload = await readJson(response);
      if (!response.ok) {
        if (timeoutId) clearTimeout(timeoutId);
        return errorResult(messageFromPayload(payload) ?? `服务请求失败（${response.status}）`, response.status >= 500, response.status, errorCodeFromPayload(payload, response.status));
      }

      if (timeoutId) clearTimeout(timeoutId);
      return normalizeResult<T>(payload);
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return errorResult('网络请求超时，请检查网络后重试', true, 408, 'REQUEST_TIMEOUT');
      }
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
    return errorResult(messageFromPayload(payload) ?? '请求失败', Boolean(payload.retryable), undefined, errorCodeFromPayload(payload));
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

function errorCodeFromPayload(payload: unknown, statusCode?: number) {
  if (isRecord(payload)) {
    if (typeof payload.code === 'string') return payload.code;
    if (isRecord(payload.error) && typeof payload.error.code === 'string') return payload.error.code;
  }
  return statusCode ? errorCodeFromStatus(statusCode) : undefined;
}

function errorCodeFromStatus(statusCode: number) {
  if (statusCode === 401) return 'AUTH_REQUIRED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'RESOURCE_NOT_FOUND';
  if (statusCode === 409) return 'DUPLICATE_RESOURCE';
  if (statusCode === 429) return 'RATE_LIMITED';
  if (statusCode >= 500) return 'SERVER_ERROR';
  if (statusCode >= 400) return 'VALIDATION_FAILED';
  return 'REQUEST_FAILED';
}

function errorResult<T = never>(message: string, retryable: boolean, statusCode?: number, code?: string): ApiResult<T> {
  const apiError: ApiError = {
    ...(code ? { code } : {}),
    message,
    retryable,
    ...(statusCode === undefined ? {} : { statusCode }),
  };
  return { error: apiError, state: 'error' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
