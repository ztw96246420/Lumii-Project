import type { LumiiPermissionKey, LumiiPermissionStatus } from '../services/permissions';

export type ApiState = 'error' | 'loading' | 'success';

export type ApiError = {
  code?: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
};

export type ApiResult<T> = {
  data?: T;
  error?: ApiError;
  state: ApiState;
};

export type AuthSession = {
  account?: AccountSnapshot;
  phone: string;
  token: string;
};

export type AccountSanctionSnapshot = {
  activeCount: number;
  activeRestrictiveCount: number;
  activeTypes: string[];
  latest?: {
    createdAt?: string;
    expiresAt?: string;
    id: string;
    reason?: string;
    status?: string;
    type: string;
    typeLabel?: string;
  } | null;
};

export type AccountSnapshot = {
  activePet: PetProfile | null;
  accountDeletion?: AccountDeletionSnapshot | null;
  accountStatus?: 'active' | 'banned' | 'deletion_pending' | 'frozen' | 'muted' | string;
  ownerAvatarUrl?: string;
  ownerBio?: string;
  ownerName?: string;
  permissions: PermissionStateMap;
  permissionsOnboardingCompleted: boolean;
  placeContributionSummary?: PlaceContributionSummary;
  sanctions?: AccountSanctionSnapshot;
  settings: UserSettings;
};

export type AccountDeletionSnapshot = {
  confirmedAt?: string;
  remainingDays?: number;
  requestedAt?: string;
  scheduledDeletionAt: string;
  status: 'pending';
};

export type AccountDeletionRequestResult = {
  accountDeletion?: AccountDeletionSnapshot | null;
  availableAt?: number;
  code?: string;
  expiresAt?: number;
  phone: string;
  requested: boolean;
  requestedAt?: string;
};

export type AccountDeletionConfirmResult = {
  account: AccountSnapshot;
  phone: string;
  scheduledDeletionAt: string;
  status: 'deletion_pending';
};

export type UserProfile = AccountSnapshot & {
  ownerName: string;
  phone: string;
};

export type PlaceContributionSummary = {
  created: number;
  leaderboardEnabled?: boolean;
  level?: {
    key: string;
    label: string;
    minPoints: number;
    nextLabel?: string;
    nextPoints?: number;
  };
  linkedExisting: number;
  minPublicPoints?: number;
  nextLevelRemainingPoints?: number;
  points: number;
  publicEligible?: boolean;
  rank?: number;
  rankTotal?: number;
  rawPoints?: number;
  rewardEligible?: boolean;
  rewardLabel?: string;
  rewardPolicy?: PlaceContributionRewardPolicy;
  total: number;
  users?: number;
};

export type PlaceContributionRewardPolicy = {
  cycle?: 'monthly' | 'quarterly' | 'seasonal';
  cycleLabel?: string;
  description?: string;
  enabled?: boolean;
  leaderboardEnabled?: boolean;
  publicEnabled?: boolean;
  rewardLabel?: string;
  topN?: number;
};

export type OwnerProfilePatch = Partial<Pick<UserProfile, 'ownerAvatarUrl' | 'ownerBio' | 'ownerName'>> & {
  ownerAvatarBase64?: string;
  ownerAvatarFileName?: string;
  ownerAvatarMimeType?: string;
};

export type SmsCodeTicket = {
  availableAt: number;
  code?: string;
  expiresAt: number;
  phone: string;
};

export type PermissionStateMap = Record<LumiiPermissionKey, LumiiPermissionStatus | 'unknown' | 'requesting'>;

export type UserSettings = {
  fuzzyLocation: boolean;
  interactionMessages: boolean;
  nearbyVisible: boolean;
  pushNotifications: boolean;
};

export type PetSpecies = 'bird' | 'cat' | 'dog' | 'hamster' | 'rabbit' | 'reptile' | 'other';

export type PetProfile = {
  avatarAnimationJobId?: string;
  avatarAnimationStatus?: AvatarAnimationJob['status'] | string;
  avatarAnimationUpdatedAt?: string;
  avatarAnimationUrl?: string;
  avatarUrl?: string;
  birthday?: string;
  breed: string;
  createdAt?: string;
  gender: 'female' | 'male' | 'unknown';
  healthScore: number;
  id: string;
  name: string;
  personality: string[];
  petCircleCoverImageUrl?: string;
  species: PetSpecies;
  weightKg?: number;
};

export type PetProfilePatch = Partial<PetProfile> & {
  avatarBase64?: string;
  avatarFileName?: string;
  avatarMimeType?: string;
};

export type CreatePetInput = Omit<PetProfile, 'healthScore' | 'id' | 'personality'>;

export type PetTaxonomy = {
  fieldRules: {
    birthdayFormat: 'YYYY / YYYY-MM / YYYY-MM-DD';
    maxBreedLength: number;
    maxNameLength: number;
    supportedSpecies: Array<Extract<PetSpecies, 'cat' | 'dog'>>;
    weightUnit: 'kg';
  };
  genders: Array<{
    id: PetProfile['gender'];
    label: string;
  }>;
  personalityTags: string[];
  species: Array<{
    breeds: string[];
    id: PetSpecies;
    label: string;
    supportedInMvp: boolean;
  }>;
};

export type AvatarJob = {
  acceptedAt?: string;
  acceptedPetId?: string;
  candidateUrls?: string[];
  createdAt?: number;
  errorCode?: string;
  errorMessage?: string;
  feedback?: AvatarGenerationFeedback;
  id: string;
  lastStatusError?: string;
  lastStatusCheckedAt?: number;
  mediaId?: string;
  originalJobId?: string;
  petId?: string;
  petName?: string;
  progress: number;
  providerStatus?: string;
  provider?: 'gpt-image-2' | 'mock' | 'ttapi-flux-edits' | 'ttapi-midjourney';
  resultUrl?: string;
  status: 'failed' | 'processing' | 'ready';
  updatedAt?: number;
};

export type AvatarAnimationJob = {
  aspectRatio?: '1:1' | string;
  avatarJobId?: string;
  createdAt?: number;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
  id: string;
  model?: string;
  petId?: string;
  petName?: string;
  progress: number;
  provider?: 'disabled' | 'doubao-seedance-1-5-pro' | 'mock' | 'stored' | string;
  providerStatus?: string;
  resolution?: '480p' | string;
  sourceAvatarUrl?: string;
  status: 'failed' | 'processing' | 'ready';
  updatedAt?: number;
  videoUrl?: string;
};

export type AvatarGenerationFeedbackReason = 'color' | 'expression' | 'face_shape' | 'not_same_pet' | 'other' | 'style';

export type AvatarGenerationFeedback = {
  content?: string;
  createdAt: string;
  reason: AvatarGenerationFeedbackReason;
  status: 'received' | 'reviewed';
};

export type AiUsageCounter = {
  count: number;
  day: string;
  limit: number;
  remaining: number;
};

export type AiUsageSummary = {
  daily: {
    petAvatar: AiUsageCounter;
    petChat: AiUsageCounter;
  };
  deepseek: {
    cacheHitTokens: number;
    cacheMissTokens: number;
    completionTokens: number;
    model: string;
    promptTokens: number;
    requests: number;
    totalTokens: number;
  };
  petAvatarProvider: string;
  gptImage2: {
    cost: number;
    creditsCost: number;
    failed: number;
    requests: number;
    succeeded: number;
  };
  ttapiFlux: {
    failed: number;
    quota: number;
    requests: number;
    succeeded: number;
  };
  ttapiMidjourney: {
    failed: number;
    quota: number;
    requests: number;
    succeeded: number;
  };
  updatedAt: string;
};

export type UploadedPetMedia = {
  analysis: PetMediaAnalysis;
  fileUrl?: string;
  mediaId: string;
  moderationReason?: string;
  moderationStatus?: 'approved' | 'hidden' | 'pending_review' | 'rejected';
  moderationStatusLabel?: string;
  previewUrl: string;
  quality: 'blocked' | 'good' | 'warning';
};

export type PetMediaAnalysis = {
  canGenerate: boolean;
  code:
    | 'busy_scene'
    | 'file_too_large'
    | 'human_and_pet'
    | 'invalid_file'
    | 'low_quality'
    | 'missing_file'
    | 'multiple_pets'
    | 'no_pet'
    | 'other_animals'
    | 'single_pet_clear'
    | 'unsupported_format'
    | 'unclear';
  humanPresent?: boolean;
  message: string;
  needsCrop?: boolean;
  otherAnimalPresent?: boolean;
  petCount?: number;
  qualityScore: number;
  status: 'accepted' | 'blocked' | 'warning';
  suggestions: string[];
  tags: string[];
  title: string;
};

export type UploadPetMediaInput = {
  base64?: string;
  fileName?: string;
  mimeType?: string;
  previewUrl?: string;
  source: 'camera' | 'library' | 'mvp_sample' | 'pet_circle_photo' | 'place_review' | 'place_submission';
};

export type PetChatFeedbackRating = 'good' | 'off';

export type ChatMessage = {
  author: 'ai' | 'me' | 'system';
  createdMemo?: HealthMemo;
  createdWeight?: WeightRecord;
  feedback?: PetChatFeedbackRating;
  id: string;
  medicalAlert?: {
    notificationId?: string;
    reason: 'medical_emergency' | 'toxic_ingestion';
  };
  status?: 'failed' | 'sending' | 'sent';
  text: string;
  time: string;
  updatedPet?: PetProfile;
  updatedVaccine?: VaccinePlan;
  vaccineReminderIds?: string[];
};

export type WeightRecord = {
  id: string;
  kg: number;
  note?: string;
  recordedAt: string;
};

export type WeightTrend = {
  changeKg: number;
  changePercent: number;
  currentKg?: number;
  direction: 'down' | 'flat' | 'up';
  previousKg?: number;
  records: WeightRecord[];
  status: 'empty' | 'insufficient_data' | 'stable' | 'watch';
  summary: string;
};

export type HealthSummary = {
  healthScore: number;
  latestMemo?: HealthMemo;
  latestWeightKg?: number;
  latestWeightRecordedAt?: string;
  memoCount: number;
  nextVaccine?: VaccinePlan;
  pendingVaccineCount: number;
  urgentVaccineCount: number;
  vaccineReminderIds: string[];
  weightStatus: WeightTrend['status'];
  weightSummary: string;
};

export type VaccinePlan = {
  dueAt: string;
  id: string;
  name: string;
  status: 'done' | 'due' | 'overdue';
};

export type CreateVaccinePlanInput = {
  dueAt: string;
  name: string;
};

export type HealthMemo = {
  content: string;
  createdAt?: string;
  id: string;
  reminderAt?: string;
  reminderEnabled?: boolean;
  repeat?: 'monthly' | 'none' | 'quarterly' | 'yearly';
  source?: 'pet_circle';
  sourceId?: string;
  title: string;
  updatedAt: string;
};

export type HealthCalendarEvent = {
  date: string;
  detail: string;
  id: string;
  sourceId: string;
  status?: VaccinePlan['status'];
  title: string;
  type: 'memo' | 'vaccine' | 'weight';
};

export type NearbyOwner = {
  distance: string;
  id: string;
  imageUrl?: string;
  ownerName: string;
  petName: string;
  species: Extract<PetSpecies, 'cat' | 'dog'>;
  tags: string[];
};

export type NearbyMoment = {
  commentCount?: number;
  createdAt: string;
  distance: string;
  id: string;
  imageUrl?: string;
  imageUrls?: string[];
  likedByMe?: boolean;
  likeCount?: number;
  mood?: string;
  moderationStatus?: 'pending_review';
  ownerId: string;
  ownerName: string;
  ownedByMe?: boolean;
  petName: string;
  photoCount?: number;
  species: Extract<PetSpecies, 'cat' | 'dog'>;
  text: string;
  visibility?: 'nearby' | 'private';
};

export type PetCircleComment = {
  author: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
  id: string;
  ownerId: string;
  ownedByMe?: boolean;
  postId: string;
  text: string;
};

export type PetCirclePostList = {
  items: NearbyMoment[];
  nextCursor?: string;
};

export type PetCircleProfile = {
  avatarUrl?: string;
  canChangeCover?: boolean;
  coverImageUrl?: string;
  latestPostAt?: string;
  ownerId: string;
  ownerName: string;
  ownedByMe: boolean;
  petName: string;
  relationshipStatus?: 'accepted' | 'self';
  species: Extract<PetSpecies, 'cat' | 'dog'>;
  stats: {
    commentCount: number;
    likeCount: number;
    photoCount: number;
    postCount: number;
  };
};

export type PetCircleProfilePostList = {
  items: NearbyMoment[];
  nextCursor?: string;
  profile: PetCircleProfile;
};

export type PetCircleReportResult = {
  id: string;
  reported: true;
  targetId: string;
  targetType: 'comment' | 'message' | 'place' | 'place_review' | 'post';
};

export type SocialBlockResult = {
  blocked: true;
  id: string;
  ownerId: string;
  reasonCode?: string;
  reasonDetail?: string;
  reasonLabel?: string;
  riskTagApplied?: boolean;
};

export type SocialBlockListItem = {
  avatarUrl?: string;
  blockedAt: string;
  id: string;
  ownerId: string;
  ownerName: string;
  petName?: string;
  reasonCode?: string;
  reasonDetail?: string;
  reasonLabel?: string;
  species?: Extract<PetSpecies, 'cat' | 'dog'>;
};

export type SocialBlockOptions = {
  reason?: string;
  reasonCode?: string;
};

export type NearbyLocationHint = {
  accuracy?: number;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  updatedAt?: number;
};

export type Conversation = {
  canSendMessage?: boolean;
  id: string;
  imageUrl?: string;
  lastMessage: string;
  name: string;
  ownerId?: string;
  petName?: string;
  relationshipStatus?: 'accepted' | 'pending';
  unread: number;
  updatedAt?: string;
};

export type ConversationMessage = {
  author: 'me' | 'other' | 'system';
  reportedByMe?: boolean;
  id: string;
  status?: 'deleted' | 'failed' | 'hidden' | 'sending' | 'sent';
  text: string;
  threadMessageId?: string;
  time: string;
};

export type GreetingOptions = {
  postId?: string;
  source?: 'pet_circle';
};

export type GreetingResult = {
  conversation?: Conversation;
  ownerId: string;
  postId?: string;
  source?: 'pet_circle';
  sent: true;
};

export type WalkInviteInput = {
  latitude?: number;
  longitude?: number;
  note?: string;
  place?: string;
  placeAddress?: string;
  placeId?: string;
  time?: string;
};

export type WalkInviteResult = {
  conversation?: Conversation;
  inviteId: string;
  ownerId: string;
};

export type NotificationCategory = 'health' | 'interaction' | 'system' | 'walk';
export type NotificationKind = 'conversation_message' | 'greeting_accepted' | 'greeting_request' | 'health_reminder' | 'medical_alert' | 'pet_circle_comment' | 'pet_circle_greeting' | 'pet_circle_like' | 'place_review' | 'place_submission' | 'support_reply' | 'system' | 'vaccine_done' | 'vaccine_reminder' | 'walk_invite';

export type NotificationItem = {
  actionRoute?: 'discover' | 'home' | 'map' | 'notifications' | 'profile' | 'safety' | 'settings' | 'supportTickets';
  campaignId?: string;
  category?: NotificationCategory;
  commentId?: string;
  conversationId?: string;
  createdAt?: string;
  id: string;
  kind?: NotificationKind;
  memoId?: string;
  ownerId?: string;
  placeId?: string;
  postId?: string;
  read: boolean;
  readAt?: string;
  reportAppealId?: string;
  reportId?: string;
  submissionId?: string;
  ticketId?: string;
  text: string;
  title: string;
  vaccineId?: string;
};

export type PushDevice = {
  deviceId?: string;
  platform: 'android' | 'ios' | 'web';
  token: string;
  updatedAt: string;
};

export type Place = {
  address: string;
  businessArea?: string;
  category: 'cafe' | 'clinic' | 'other' | 'park' | 'shop';
  coverImageUrl?: string;
  distance: string;
  entranceLatitude?: number;
  entranceLongitude?: number;
  id: string;
  latitude?: number;
  longitude?: number;
  name: string;
  openingHoursToday?: string;
  openingHoursWeek?: string;
  petFriendlyStatus?: 'candidate' | 'rejected' | 'unknown' | 'verified';
  phone?: string;
  photoUrls?: string[];
  poiType?: string;
  poiTypeCode?: string;
  duplicateCandidateCount?: number;
  qualityLabel?: string;
  qualityReasons?: string[];
  qualityScore?: number;
  rating: number;
  reviewCount?: number;
  source?: 'amap' | 'manual' | 'seed' | 'tencent';
  sourcePoiId?: string;
  supportedSpecies?: Array<Extract<PetSpecies, 'cat' | 'dog'>>;
  tags: string[];
};

export type PlaceReview = {
  content: string;
  createdAt: string;
  id: string;
  imageUrls?: string[];
  ownerAvatarUrl?: string;
  ownerName?: string;
  placeId: string;
  placeName?: string;
  photoCount?: number;
  reviewReason?: string;
  reviewedAt?: string;
  status: 'approved' | 'deleted' | 'hidden' | 'pending_review' | 'rejected';
};

export type PlaceSubmission = {
  address: string;
  approvedPlaceId?: string;
  contributionAction?: 'created' | 'linked_existing';
  contributionActionLabel?: string;
  contributionId?: string;
  contributionPoints?: number;
  contributionRewardedAt?: string;
  content: string;
  createdAt: string;
  id: string;
  imageUrls?: string[];
  linkedExistingPlaceId?: string;
  name: string;
  photoCount?: number;
  reviewReason?: string;
  reviewedAt?: string;
  status: 'approved' | 'pending_review' | 'rejected';
};

export type LegalDocument = {
  disclaimer: string;
  effectiveDate: string;
  key: 'privacy' | 'terms';
  sections: Array<{
    body: string[];
    title: string;
  }>;
  title: string;
  version: string;
};

export type FeedbackCategory = 'bug' | 'other' | 'safety' | 'suggestion';

export type FeedbackSubmission = {
  category: FeedbackCategory;
  contact?: string;
  content: string;
  createdAt: string;
  id: string;
  ownerName?: string;
  status: 'closed' | 'received' | 'reviewing';
  supportTicketId?: string;
};

export type SanctionAppealStatus = 'approved' | 'closed' | 'pending' | 'rejected' | 'reviewing';

export type SanctionAppealItem = {
  appealType?: 'report' | 'sanction';
  content: string;
  createdAt: string;
  duplicate?: boolean;
  id: string;
  reportId?: string;
  reportReason?: string;
  reportRole?: 'owner' | 'reporter';
  reportRoleLabel?: string;
  reportStatus?: string;
  reportStatusLabel?: string;
  reviewReason?: string;
  reviewedAt?: string;
  sanctionId?: string;
  sanctionReason?: string;
  sanctionStatus?: string;
  sanctionType?: string;
  sanctionTypeLabel: string;
  status: SanctionAppealStatus;
  subjectLabel?: string;
  targetId?: string;
  targetLabel?: string;
  targetType?: string;
  title?: string;
  updatedAt?: string;
};

export type ReportAppealTarget = {
  createdAt?: string;
  reportId: string;
  reportRole?: 'owner' | 'reporter';
  reportRoleLabel?: string;
  reportStatus?: string;
  reportStatusLabel?: string;
  reviewReason?: string;
  targetId?: string;
  targetLabel?: string;
  targetType?: string;
  title?: string;
  updatedAt?: string;
};

export type SanctionAppealList = {
  appeals: SanctionAppealItem[];
  reportAppealTargets?: ReportAppealTarget[];
  summary: {
    all: number;
    open: number;
    reportTargets?: number;
  };
};

export type SupportTicketStatus = 'closed' | 'received' | 'resolved' | 'reviewing' | 'waiting_user';
export type SupportTicketPriority = 'high' | 'low' | 'normal' | 'urgent';

export type SupportTicketAttachment = {
  createdAt?: string;
  id: string;
  mediaId?: string;
  mimeType: string;
  name: string;
  previewUrl?: string;
  sizeBytes?: number;
  type: 'image';
  url: string;
};

export type SupportTicketSatisfaction = {
  comment?: string;
  createdAt?: string;
  rating: number;
  updatedAt?: string;
};

export type SupportTicketAttachmentDraft = {
  base64?: string;
  fileName?: string;
  mimeType?: string;
  name?: string;
  previewUrl?: string;
};

export type SupportTicketItem = {
  attachmentCount?: number;
  canRate?: boolean;
  canReply: boolean;
  canReopen?: boolean;
  category: FeedbackCategory;
  content: string;
  createdAt: string;
  id: string;
  lastActivityAt?: string;
  latestReply?: string;
  latestReplyAt?: string;
  priority: SupportTicketPriority;
  replyCount: number;
  reopenCount?: number;
  satisfaction?: null | SupportTicketSatisfaction;
  slaDueAt?: string;
  slaHours?: number;
  slaLabel?: string;
  slaState?: 'done' | 'due_soon' | 'healthy' | 'overdue' | 'unknown';
  slaType?: 'first_response' | 'resolution';
  status: SupportTicketStatus;
  title: string;
  updatedAt?: string;
};

export type SupportTicketMessage = {
  attachments?: SupportTicketAttachment[];
  author: 'support' | 'user';
  authorName: string;
  content: string;
  createdAt: string;
  id: string;
  type: 'feedback' | 'reopen' | 'support_reply' | 'user_reply';
};

export type SupportTicketDetail = SupportTicketItem & {
  attachments?: SupportTicketAttachment[];
  messages: SupportTicketMessage[];
};

export type SupportTicketSummary = {
  all: number;
  open: number;
  waitingUser: number;
};

export type SupportTicketList = {
  summary: SupportTicketSummary;
  tickets: SupportTicketItem[];
};

export type AppAnalyticsEventName =
  | 'ai_avatar.entry_click'
  | 'ai_avatar.failure'
  | 'ai_avatar.start'
  | 'ai_avatar.success'
  | 'app.page_view'
  | 'config.announcement_action'
  | 'config.announcement_impression'
  | 'config.experiment_exposure'
  | 'config.splash_action'
  | 'config.splash_impression'
  | 'config.update_action'
  | 'config.update_impression'
  | 'discover.filter'
  | 'discover.owners_loaded'
  | 'discover.pet_circle_load_more'
  | 'discover.pet_circle_loaded'
  | 'discover.refresh'
  | 'discover.search'
  | 'discover.view'
  | 'home.module_exposure'
  | 'map.favorite_toggle'
  | 'map.locate'
  | 'map.navigation_open'
  | 'map.open'
  | 'map.place_detail_view'
  | 'map.poi_search'
  | 'notification.impression'
  | 'notification.open'
  | 'pet_chat.entry_click'
  | 'pet_circle.card_exposure'
  | 'pet_circle.comment_click'
  | 'pet_circle.greeting_click'
  | 'pet_circle.like_click'
  | 'pet_circle.profile_view'
  | 'pet_circle.walk_invite_click'
  | 'support.open';

export type AppAnalyticsEventInput = {
  appBuild?: number | string;
  appVersion?: string;
  deviceId?: string;
  name: AppAnalyticsEventName;
  occurredAt?: string;
  petId?: string;
  platform?: string;
  properties?: Record<string, boolean | number | string | undefined>;
  route?: string;
  source?: string;
};

export type AppRemoteConfig = {
  ai: {
    petAvatarDailyLimit: number;
    petChatDailyLimit: number;
  };
  analytics?: {
    enabled?: boolean;
    sampleRatePercent?: number;
  };
  experiments?: {
    homeAiEntry?: {
      controlSubtitle?: string;
      controlTitle?: string;
      enabled?: boolean;
      id?: string;
      name?: string;
      rolloutPercent?: number;
      treatmentSubtitle?: string;
      treatmentTitle?: string;
      variantBPercent?: number;
    };
  };
  app: {
    announcement?: {
      actionLabel?: string;
      actionRoute?: 'discover' | 'home' | 'map' | 'notifications' | 'profile' | 'safety' | 'settings' | 'supportTickets' | '';
      body?: string;
      enabled?: boolean;
      title?: string;
      version?: string;
    };
    maintenanceEnabled: boolean;
    maintenanceMessage: string;
    splash?: {
      actionLabel?: string;
      actionRoute?: 'discover' | 'home' | 'map' | 'notifications' | 'profile' | 'safety' | 'settings' | 'supportTickets' | '';
      body?: string;
      enabled?: boolean;
      imageUrl?: string;
      title?: string;
      version?: string;
    };
    update?: {
      androidUrl?: string;
      enabled?: boolean;
      force?: boolean;
      iosUrl?: string;
      latestVersion?: string;
      minVersion?: string;
      rolloutPercent?: number;
      subtitle?: string;
      title?: string;
    };
  };
  features: {
    aiAvatar: boolean;
    petChat: boolean;
    petCircle: boolean;
    places: boolean;
    walkInvite: boolean;
  };
  moderation?: {
    enabled?: boolean;
    machineImageEnabled?: boolean;
    machineTextEnabled?: boolean;
    publicHint?: {
      commentText?: string;
      enabled?: boolean;
      imageText?: string;
      placeText?: string;
      postText?: string;
    };
    reviewMessage?: string;
    textRulesEnabled?: boolean;
  };
  places?: {
    contributionBadgeMinPoints?: number;
    contributionBadgesEnabled?: boolean;
    contributionLeaderboardEnabled?: boolean;
    contributionLeaderboardLimit?: number;
    contributionRewardPolicy?: PlaceContributionRewardPolicy;
    publicReviews?: {
      apiLimit?: number;
      detailDisplayLimit?: number;
      requirePhotos?: boolean;
      sort?: 'newest' | 'oldest' | 'with_photos_first';
    };
  };
  social: {
    discoverRadiusKm: number;
    nearbyMomentTtlDays: number;
    petCircleMaxPhotos: number;
  };
  support?: {
    firstResponseSlaHours?: Partial<Record<SupportTicketPriority, number>>;
    resolutionSlaHours?: Partial<Record<SupportTicketPriority, number>>;
    slaHours?: Partial<Record<SupportTicketPriority, number>>;
  };
  updatedAt: string;
};

export type AppTab = 'discover' | 'home' | 'map' | 'messages' | 'profile';

export type AppRoute =
  | 'accountSecurity'
  | 'addPlaceReview'
  | 'aiResult'
  | 'chat'
  | 'conversation'
  | 'dailyPost'
  | 'discover'
  | 'editPet'
  | 'emptyPet'
  | 'generating'
  | 'health'
  | 'healthCalendar'
  | 'healthMemos'
  | 'home'
  | 'login'
  | 'map'
  | 'memoEdit'
  | 'memoNew'
  | 'messages'
  | 'multiPet'
  | 'notifications'
  | 'otp'
  | 'ownerEdit'
  | 'permissions'
  | 'petDetail'
  | 'petInfo'
  | 'petCircleProfile'
  | 'placeDetail'
  | 'profile'
  | 'safety'
  | 'settings'
  | 'supportTickets'
  | 'upload'
  | 'uploadDetail'
  | 'uploadNoPet'
  | 'vaccine'
  | 'greetingRequests'
  | 'walkInvite'
  | 'weight';
