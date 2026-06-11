import type { LumiiPermissionKey, LumiiPermissionStatus } from '../services/permissions';

export type ApiState = 'error' | 'loading' | 'success';

export type ApiError = {
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

export type AccountSnapshot = {
  activePet: PetProfile | null;
  ownerName?: string;
  permissions: PermissionStateMap;
  permissionsOnboardingCompleted: boolean;
  settings: UserSettings;
};

export type UserProfile = AccountSnapshot & {
  ownerName: string;
  phone: string;
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
  avatarUrl?: string;
  birthday?: string;
  breed: string;
  gender: 'female' | 'male' | 'unknown';
  healthScore: number;
  id: string;
  name: string;
  personality: string[];
  species: PetSpecies;
  weightKg?: number;
};

export type CreatePetInput = Omit<PetProfile, 'healthScore' | 'id' | 'personality'>;

export type AvatarJob = {
  errorMessage?: string;
  id: string;
  progress: number;
  provider?: 'mock' | 'ttapi-flux-edits' | 'ttapi-midjourney';
  resultUrl?: string;
  status: 'failed' | 'processing' | 'ready';
};

export type UploadedPetMedia = {
  analysis: PetMediaAnalysis;
  mediaId: string;
  previewUrl: string;
  quality: 'blocked' | 'good' | 'warning';
};

export type PetMediaAnalysis = {
  canGenerate: boolean;
  code:
    | 'busy_scene'
    | 'human_and_pet'
    | 'low_quality'
    | 'missing_file'
    | 'multiple_pets'
    | 'no_pet'
    | 'other_animals'
    | 'single_pet_clear'
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
  source: 'camera' | 'library' | 'mvp_sample';
};

export type PetChatFeedbackRating = 'good' | 'off';

export type ChatMessage = {
  author: 'ai' | 'me' | 'system';
  feedback?: PetChatFeedbackRating;
  id: string;
  status?: 'failed' | 'sending' | 'sent';
  text: string;
  time: string;
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

export type VaccinePlan = {
  dueAt: string;
  id: string;
  name: string;
  status: 'done' | 'due' | 'overdue';
};

export type HealthMemo = {
  content: string;
  id: string;
  title: string;
  updatedAt: string;
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

export type NearbyLocationHint = {
  accuracy?: number;
  latitude: number;
  longitude: number;
  radiusKm?: number;
};

export type Conversation = {
  id: string;
  imageUrl?: string;
  lastMessage: string;
  name: string;
  ownerId?: string;
  petName?: string;
  unread: number;
  updatedAt?: string;
};

export type ConversationMessage = {
  author: 'me' | 'other' | 'system';
  id: string;
  status?: 'failed' | 'sending' | 'sent';
  text: string;
  time: string;
};

export type GreetingResult = {
  conversation?: Conversation;
  ownerId: string;
  sent: true;
};

export type WalkInviteInput = {
  note?: string;
  place?: string;
  time?: string;
};

export type WalkInviteResult = {
  conversation?: Conversation;
  inviteId: string;
  ownerId: string;
};

export type NotificationItem = {
  id: string;
  read: boolean;
  text: string;
  title: string;
};

export type Place = {
  address: string;
  category: 'cafe' | 'clinic' | 'other' | 'park';
  distance: string;
  id: string;
  name: string;
  rating: number;
  tags: string[];
};

export type PlaceReview = {
  content: string;
  createdAt: string;
  id: string;
  placeId: string;
  status: 'approved' | 'pending_review' | 'rejected';
};

export type PlaceSubmission = {
  address: string;
  content: string;
  createdAt: string;
  id: string;
  name: string;
  status: 'approved' | 'pending_review' | 'rejected';
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
  | 'healthMemos'
  | 'home'
  | 'login'
  | 'map'
  | 'messages'
  | 'notifications'
  | 'otp'
  | 'permissions'
  | 'petDetail'
  | 'petInfo'
  | 'placeDetail'
  | 'profile'
  | 'safety'
  | 'settings'
  | 'upload'
  | 'uploadDetail'
  | 'uploadNoPet'
  | 'vaccine'
  | 'greetingRequests'
  | 'walkInvite'
  | 'weight';
