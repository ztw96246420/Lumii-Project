import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  LogBox,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  StatusBar as NativeStatusBar,
  View,
} from 'react-native';
import type { KeyboardTypeOptions, RefreshControlProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import {
  AlertTriangle,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BatteryFull,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Edit3,
  Eye,
  EyeOff,
  Flag,
  Heart,
  HeartPulse,
  Home as HomeIcon,
  ImagePlus,
  KeyRound,
  Lock,
  Locate,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Navigation,
  NotebookPen,
  PawPrint,
  PenLine,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Share2,
  Signal,
  Smile,
  SlidersHorizontal,
  Sparkles,
  Star,
  Stethoscope,
  Smartphone,
  Syringe,
  Tag,
  Trash2,
  User,
  UserX,
  Users,
  Wifi,
  Weight,
  WifiOff,
  X,
} from 'lucide-react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { getLumiiPermissionStatus, requestLumiiPermission } from '../services/permissions';
import { cancelVaccineLocalReminder, cancelVaccineLocalReminders, scheduleVaccineLocalReminder, syncVaccineLocalReminders } from '../services/healthReminders';
import { getLumiiPushRegistration } from '../services/pushToken';
import { clearPersistedLumiiSession, deleteLocalJsonStorage, loadLocalJsonStorage, loadPersistedLumiiSession, saveLocalJsonStorage, savePersistedLumiiSession } from '../services/sessionStorage';
import { LumiiAmapView, getLumiiAmapCurrentLocation, isLumiiAmapAvailable } from '../native/LumiiAmapView';
import { apiConfig, lumiiApi, setLumiiAuthToken } from './api';
import { productConfig } from './productConfig';
import { BottomSheet, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, SkeletonLine, StatusPill, Toast, palette, styles as uiStyles } from './ui';
import type {
  AppRoute,
  AppTab,
  AiUsageSummary,
  AvatarGenerationFeedbackReason,
  AuthSession,
  AvatarJob,
  ChatMessage,
  Conversation,
  ConversationMessage,
  HealthCalendarEvent,
  HealthMemo,
  HealthSummary,
  NearbyLocationHint,
  NearbyMoment,
  NearbyOwner,
  NotificationCategory,
  NotificationItem,
  NotificationKind,
  PetChatFeedbackRating,
  PermissionStateMap,
  PetProfile,
  PetSpecies,
  Place,
  PlaceReview,
  SmsCodeTicket,
  UploadedPetMedia,
  UserSettings,
  VaccinePlan,
  WeightRecord,
} from './types';

const smsCooldownMs = 60 * 1000;
const defaultDiscoverRadiusKm = 3;
const fallbackPetAvatarDailyLimit = 10;
const fallbackPetChatDailyLimit = 80;
const appFontFamily = Platform.OS === 'web' ? 'Microsoft YaHei, PingFang SC, Arial, sans-serif' : undefined;
const nativeTopInset = Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 24 : 0;
type NotificationFilter = 'all' | NotificationCategory;
type MemoRepeat = NonNullable<HealthMemo['repeat']>;
type DatePickerMode = 'date' | 'time';
type DatePickerRequest = {
  maximumDate?: Date;
  minimumDate?: Date;
  mode: DatePickerMode;
  title: string;
  value: Date;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const notificationFilterOptions: Array<{ key: NotificationFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'interaction', label: '互动' },
  { key: 'walk', label: '约遛' },
  { key: 'health', label: '健康提醒' },
  { key: 'system', label: '系统' },
];

function isNotificationCategory(value: unknown): value is NotificationCategory {
  return value === 'health' || value === 'interaction' || value === 'system' || value === 'walk';
}

function notificationCategoryFor(item: NotificationItem): NotificationCategory {
  if (isNotificationCategory(item.category)) return item.category;
  const id = String(item.id || '');
  if (/walk/.test(id)) return 'walk';
  if (/(health|vaccine|medical)/.test(id)) return 'health';
  if (/(greeting|message)/.test(id)) return 'interaction';
  const value = `${item.title} ${item.text}`;
  if (/账号|安全|登录|设备|系统|隐私|注销/.test(value)) return 'system';
  if (/约遛|邀请|公园|散步|见面|一起去|地点/.test(value)) return 'walk';
  if (/健康|疫苗|体重|驱虫|AI|灵伴|生成|建议|提醒|不吃|拉稀|呕吐/.test(value)) return 'health';
  return 'interaction';
}

function isNotificationKind(value: unknown): value is NotificationKind {
  return value === 'conversation_message' || value === 'greeting_accepted' || value === 'greeting_request' || value === 'health_reminder' || value === 'system' || value === 'walk_invite';
}

function notificationKindFor(item: NotificationItem): NotificationKind {
  if (isNotificationKind(item.kind)) return item.kind;
  const id = String(item.id || '');
  if (/message/.test(id)) return 'conversation_message';
  if (/greeting-accepted/.test(id)) return 'greeting_accepted';
  if (/greeting/.test(id)) return 'greeting_request';
  if (/walk/.test(id)) return 'walk_invite';
  if (/(health|vaccine|medical)/.test(id)) return 'health_reminder';
  const category = notificationCategoryFor(item);
  if (category === 'walk') return 'walk_invite';
  if (category === 'health') return 'health_reminder';
  if (category === 'system') return 'system';
  return 'greeting_request';
}

function conversationIdFromNotification(item: NotificationItem) {
  if (item.conversationId) return item.conversationId;
  const ownerId = String(item.ownerId || '');
  const kind = notificationKindFor(item);
  if (kind !== 'greeting_request' && ownerId.startsWith('user-')) return `c-${ownerId.slice('user-'.length)}`;
  return '';
}

function notificationDateFor(item: NotificationItem) {
  if (!item.createdAt) return null;
  const date = new Date(item.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateFromTimestamp(timestamp?: number) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function notificationDisplayTime(item: NotificationItem, seenAt?: number) {
  const date = notificationDateFor(item) ?? dateFromTimestamp(seenAt);
  if (!date) return '新通知';
  return formatRelativeDisplayTime(date);
}

function formatRelativeDisplayTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  if (diffMs >= 0 && diffMs < 60 * 1000) return '刚刚';
  if (diffMs >= 0 && diffMs < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diffMs / 60000))} 分钟前`;
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  if (isSameCalendarDay(date, new Date())) return `${hour}:${minute}`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return `昨天 ${hour}:${minute}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${hour}:${minute}`;
}

function formatTimestampDisplay(value?: string, fallback = '时间待确认') {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : formatRelativeDisplayTime(date);
}

function formatMessageListTime(value?: string, fallback = '新消息') {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return formatRelativeDisplayTime(date);
  const clockMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (clockMatch) return `${clockMatch[1].padStart(2, '0')}:${clockMatch[2]}`;
  return text;
}

function formatChatDateChip(value?: string) {
  const text = String(value ?? '').trim();
  if (!text) return `今天 ${formatClockTime()}`;
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    const time = formatClockTime(date);
    if (isSameCalendarDay(date, new Date())) return `今天 ${time}`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameCalendarDay(date, yesterday)) return `昨天 ${time}`;
    return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
  }
  const clockMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (clockMatch) return `今天 ${clockMatch[1].padStart(2, '0')}:${clockMatch[2]}`;
  if (text === '刚刚') return `今天 ${formatClockTime()}`;
  return text;
}

function isPetChatWelcomeMessage(message?: ChatMessage) {
  return message?.id === 'pet-chat-welcome';
}

function parsePlaceDistanceMeters(distance?: string) {
  const text = String(distance ?? '').trim().toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return Number.MAX_SAFE_INTEGER;
  return text.includes('km') || text.includes('公里') ? value * 1000 : value;
}

function formatGreetingRequestSeenTime(timestamp?: number) {
  if (!timestamp) return '新招呼';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '新招呼' : formatRelativeDisplayTime(date);
}

function notificationGroupFor(item: NotificationItem, seenAt?: number) {
  const date = notificationDateFor(item) ?? dateFromTimestamp(seenAt);
  if (!date) return '今天';
  const today = new Date();
  if (isSameCalendarDay(date, today)) return '今天';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return '昨天';
  return '更早';
}

function isSameCalendarDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);
const webTextInputReset =
  Platform.OS === 'web'
    ? ({ outlineColor: 'transparent', outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle)
    : null;
const webPressableReset =
  Platform.OS === 'web'
    ? ({ outlineColor: 'transparent', outlineStyle: 'none', outlineWidth: 0, userSelect: 'none' } as unknown as ViewStyle)
    : null;
const placeReviewPhotoUrls = [
  'https://images.unsplash.com/photo-1764660308106-72eacd973fc8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'https://images.unsplash.com/photo-1599692392256-2d084495fe15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
];
const placeParkPhotoUrl =
  'https://images.unsplash.com/photo-1761532950128-501cc3a7e735?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=900';
const placeCafePhotoUrl =
  'https://images.unsplash.com/photo-1691067987594-b1b7f84ba55a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
const placeVetPhotoUrl =
  'https://images.unsplash.com/photo-1746021375258-79fa1464ca1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
const walkInviteParkPhotoUrl =
  'https://images.unsplash.com/photo-1561438774-1790fe271b8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
const discoverOwnerAvatarUrls = [
  'https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
  'https://images.unsplash.com/photo-1562337404-3044c84ac061?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
  'https://images.unsplash.com/photo-1567516364473-233c4b6fcfbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
];
const generatedGoldenAvatarUri = 'lumii://golden-retriever-avatar';
const generatedGoldenAvatarSource = require('../../assets/lumii/golden-avatar-v1.png');
const loadedRemoteAvatarUris = new Set<string>();

const routeTitles: Partial<Record<AppRoute, string>> = {
  accountSecurity: '账号安全',
  addPlaceReview: '新增地点',
  aiResult: '形象确认',
  chat: '和灵伴聊天',
  conversation: '聊天',
  dailyPost: '今日小事',
  discover: '附近',
  editPet: '编辑宠物',
  emptyPet: '添加宠物',
  generating: 'AI 生成中',
  greetingRequests: '招呼请求',
  health: '健康管理',
  healthCalendar: '健康日历',
  healthMemos: '健康备忘',
  home: '灵伴',
  map: '地图',
  memoEdit: '编辑备忘',
  memoNew: '新增健康备忘',
  messages: '消息',
  multiPet: '我的宠物',
  notifications: '通知中心',
  otp: '输入验证码',
  ownerEdit: '编辑个人资料',
  permissions: '权限设置',
  petDetail: '宠物档案',
  petInfo: '宠物信息',
  placeDetail: '地点详情',
  profile: '我的',
  safety: '安全中心',
  settings: '设置与隐私',
  upload: '上传照片',
  uploadDetail: '识别详情',
  uploadNoPet: '上传失败',
  vaccine: '疫苗计划',
  walkInvite: '约遛邀请',
  weight: '体重记录',
};

const tabItems: Array<{ Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>; label: string; route: AppTab }> = [
  { Icon: HomeIcon, label: '宠物', route: 'home' },
  { Icon: Compass, label: '发现', route: 'discover' },
  { Icon: MapPin, label: '地图', route: 'map' },
  { Icon: MessageCircle, label: '消息', route: 'messages' },
  { Icon: User, label: '我的', route: 'profile' },
];

const tabBackToHomeRoutes = new Set<AppRoute>(['discover', 'map', 'messages', 'profile']);
const appExitPromptRoutes = new Set<AppRoute>(['emptyPet', 'home', 'login', 'permissions']);
const focusedInboxRoutes = new Set<AppRoute>(['greetingRequests', 'messages', 'notifications']);
const passiveInboxRoutes = new Set<AppRoute>(['discover', 'home', 'map', 'profile']);
const petRequiredRoutes = new Set<AppRoute>(['aiResult', 'chat', 'dailyPost', 'editPet', 'generating', 'health', 'healthCalendar', 'healthMemos', 'home', 'memoEdit', 'memoNew', 'petDetail', 'upload', 'uploadDetail', 'uploadNoPet', 'vaccine', 'weight']);
const avatarFlowRoutes = new Set<AppRoute>(['upload', 'uploadDetail', 'uploadNoPet', 'generating', 'aiResult']);
const homeChatPrompts = [
  '今天想和{petName}聊点什么？',
  '要不要记录一件开心小事？',
  '看看附近有没有新朋友？',
  '今天适合来一点轻松互动',
  '{petName}好像有话想和你说',
  '要不要安排一次温柔散步？',
  '给{petName}补一条健康记录吧',
  '今天也想陪你待一会儿',
];
const dailyMoodOptions = ['开心', '活跃', '正常', '有点累'] as const;
type DailyMood = (typeof dailyMoodOptions)[number];
const placeFriendlyFeatureOptions = ['可遛狗', '饮水点', '室内友好', '停车方便'] as const;

const permissionCopy = {
  location: {
    description: '发现附近养宠朋友、宠物友好餐厅与公园',
    label: '定位权限',
  },
  media: {
    description: '为灵伴拍照、识别毛色五官，生成专属形象',
    label: '照片与相机',
  },
  notifications: {
    description: '不错过灵伴的呼唤、好友互动与陪伴提醒',
    label: '消息通知',
  },
};

const permissionDeniedCopy: Record<keyof PermissionStateMap, { action: string; pageTitle: string; tip: string }> = {
  location: {
    action: '去系统设置开启定位',
    pageTitle: '开启定位，发现附近的它们',
    tip: '附近的猫狗朋友与宠物友好场所将无法显示',
  },
  media: {
    action: '去系统设置开启相机',
    pageTitle: '开启相机，为灵伴留下样子',
    tip: '无法上传宠物照片、生成专属灵伴形象',
  },
  notifications: {
    action: '去系统设置开启通知',
    pageTitle: '开启通知，不错过它的呼唤',
    tip: '灵伴的撒娇、提醒、好友互动将无法收到',
  },
};

const initialPermissions: PermissionStateMap = {
  location: 'unknown',
  media: 'unknown',
  notifications: 'unknown',
};
const permissionKeys: Array<keyof PermissionStateMap> = ['location', 'media', 'notifications'];
const defaultUserSettings: UserSettings = {
  fuzzyLocation: true,
  interactionMessages: true,
  nearbyVisible: true,
  pushNotifications: true,
};
const webPreviewPermissions: PermissionStateMap = {
  location: 'granted',
  media: 'granted',
  notifications: 'granted',
};
const webPreviewPet: PetProfile = {
  avatarUrl: generatedGoldenAvatarUri,
  birthday: '2023-05-18',
  breed: '金毛',
  gender: 'male',
  healthScore: 96,
  id: 'preview-pet-lucky',
  name: 'Lucky',
  personality: ['亲人', '爱撒娇', '喜欢散步'],
  species: 'dog',
  weightKg: 28.6,
};
const webPreviewSession: AuthSession = {
  account: {
    activePet: webPreviewPet,
    ownerName: 'Serenaqing',
    permissions: webPreviewPermissions,
    permissionsOnboardingCompleted: true,
    settings: defaultUserSettings,
  },
  phone: '13531850966',
  token: 'lumii-web-preview-token',
};
const avatarUploadMaxBytes = 9 * 1024 * 1024;
const supportedAvatarMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function getWebPreviewParam(key: string) {
  if (Platform.OS !== 'web') return '';
  try {
    const location = (globalThis as unknown as { location?: { search?: string } }).location;
    return new URLSearchParams(location?.search ?? '').get(key) ?? '';
  } catch {
    return '';
  }
}

type HomeMomentPreviewKind = 'empty' | 'loadingError' | 'usersNoPosts';

function normalizeHomeMomentPreview(value: string): HomeMomentPreviewKind | null {
  if (value === 'users' || value === 'friends' || value === 'online') return 'usersNoPosts';
  if (value === 'empty') return 'empty';
  if (value === 'loading' || value === 'error') return 'loadingError';
  return null;
}

type PetDraft = {
  avatarBase64?: string;
  avatarFileName?: string;
  avatarMimeType?: string;
  avatarUrl: string;
  birthday: string;
  breed: string;
  gender: PetProfile['gender'];
  name: string;
  species: PetSpecies;
  weight: string;
};
type LocalImageUploadDraft = {
  base64?: string;
  fileName?: string;
  mimeType?: string;
  uri: string;
};

function normalizeLocalImageMimeType(mimeType?: null | string, uri?: string, fileName?: null | string) {
  const source = `${mimeType ?? ''} ${uri ?? ''} ${fileName ?? ''}`.toLowerCase();
  if (source.includes('jpg') || source.includes('jpeg')) return 'image/jpeg';
  if (source.includes('png')) return 'image/png';
  if (source.includes('webp')) return 'image/webp';
  if (source.includes('heic')) return 'image/heic';
  if (source.includes('heif')) return 'image/heif';
  return '';
}

function estimateBase64Bytes(value?: null | string) {
  const clean = String(value || '').replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '');
  if (!clean) return 0;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function avatarExtensionForMimeType(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'image/heif') return 'heif';
  return 'jpg';
}

function buildAvatarUploadDraft(asset?: ImagePicker.ImagePickerAsset): { draft?: LocalImageUploadDraft; error?: string } {
  if (!asset?.uri) return { error: '没有读取到头像，请重新选择' };
  const mimeType = normalizeLocalImageMimeType(asset.mimeType, asset.uri, asset.fileName);
  if (!mimeType || !supportedAvatarMimeTypes.has(mimeType)) return { error: '头像仅支持 JPG、PNG、WebP、HEIC 图片' };
  if (!asset.base64) return { error: '头像没有读取到可上传内容，请重新选择或裁剪后再试' };
  const bytes = Number(asset.fileSize) || estimateBase64Bytes(asset.base64);
  if (bytes > avatarUploadMaxBytes) return { error: `头像文件过大，请选择 ${Math.round(avatarUploadMaxBytes / 1024 / 1024)}MB 以内的图片` };
  return {
    draft: {
      base64: asset.base64,
      fileName: asset.fileName || `avatar-${Date.now()}.${avatarExtensionForMimeType(mimeType)}`,
      mimeType,
      uri: asset.uri,
    },
  };
}
type DiscoverFilter = 'all' | 'dog' | 'cat' | 'social' | 'walk';
const discoverFilterOptions: Array<{ key: DiscoverFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'dog', label: '🐶 汪星人' },
  { key: 'cat', label: '🐱 喵星人' },
  { key: 'social', label: '想交朋友' },
  { key: 'walk', label: '可约遛' },
];

const emptyPetDraft: PetDraft = {
  avatarUrl: '',
  birthday: '',
  breed: '',
  gender: 'unknown',
  name: '',
  species: 'dog',
  weight: '',
};

function draftFromPet(pet: PetProfile): PetDraft {
  return {
    avatarUrl: pet.avatarUrl ?? '',
    birthday: pet.birthday ?? '',
    breed: pet.breed ?? '',
    gender: pet.gender,
    name: pet.name,
    species: pet.species,
    weight: pet.weightKg ? String(pet.weightKg) : '',
  };
}

function arePetSnapshotsEqual(left?: null | PetProfile, right?: null | PetProfile) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.species === right.species &&
    left.breed === right.breed &&
    left.gender === right.gender &&
    left.birthday === right.birthday &&
    left.weightKg === right.weightKg &&
    left.avatarUrl === right.avatarUrl &&
    left.healthScore === right.healthScore &&
    (left.personality ?? []).join('|') === (right.personality ?? []).join('|')
  );
}

const speciesLabels: Record<PetSpecies, string> = {
  bird: '鹦鹉',
  cat: '猫咪',
  dog: '狗狗',
  hamster: '仓鼠',
  other: '其他',
  rabbit: '兔子',
  reptile: '爬宠',
};

const defaultMapCenter = {
  latitude: 23.1291,
  longitude: 113.2644,
  markerSnippet: '滨江路 88 号',
  markerTitle: '云杉宠物友好公园',
  zoom: 14,
};

type MapVisualMode = 'lumii' | 'night' | 'satellite' | 'standard';
type PlaceSpeciesFilter = 'all' | Extract<PetSpecies, 'cat' | 'dog'>;
type PlaceSortMode = 'distance' | 'rating' | 'reviews';

const mapStyleOptions: Array<{
  description: string;
  key: MapVisualMode;
  label: string;
}> = [
  { description: '柔和暖色，适合日常浏览宠物友好地点', key: 'lumii', label: '灵伴' },
  { description: '高德默认底图，信息最完整', key: 'standard', label: '标准' },
  { description: '真实地貌视角，适合看公园和草地', key: 'satellite', label: '卫星' },
  { description: '低亮度模式，夜间查看更舒服', key: 'night', label: '夜间' },
];

const placeSortOptions: Array<{ key: PlaceSortMode; label: string }> = [
  { key: 'distance', label: '距离最近' },
  { key: 'rating', label: '评分最高' },
  { key: 'reviews', label: '点评最多' },
];
const placeDistanceFilterOptions = [1, 3, 5] as const;
type PlaceDistanceFilterKm = (typeof placeDistanceFilterOptions)[number];

function sortPlacesByMode(items: Place[], mode: PlaceSortMode) {
  return [...items].sort((left, right) => {
    if (mode === 'rating') {
      const ratingDelta = right.rating - left.rating;
      if (ratingDelta !== 0) return ratingDelta;
    }
    if (mode === 'reviews') {
      const reviewDelta = (right.reviewCount ?? 0) - (left.reviewCount ?? 0);
      if (reviewDelta !== 0) return reviewDelta;
    }
    const distanceDelta = parsePlaceDistanceMeters(left.distance) - parsePlaceDistanceMeters(right.distance);
    if (distanceDelta !== 0) return distanceDelta;
    return right.rating - left.rating;
  });
}

function filterPlacesByDistance(items: Place[], radiusKm: PlaceDistanceFilterKm) {
  return items.filter((place) => parsePlaceDistanceMeters(place.distance) <= radiusKm * 1000);
}

function getPlaceSupportedSpecies(place: Place) {
  const explicit = Array.isArray(place.supportedSpecies)
    ? place.supportedSpecies.filter((species): species is Extract<PetSpecies, 'cat' | 'dog'> => species === 'cat' || species === 'dog')
    : [];
  if (explicit.length) return Array.from(new Set(explicit));
  const text = [place.name, place.category, ...place.tags].join(' ').toLowerCase();
  const inferred = new Set<Extract<PetSpecies, 'cat' | 'dog'>>();
  if (/狗|汪|遛|dog|canine/.test(text)) inferred.add('dog');
  if (/猫|喵|cat|feline/.test(text)) inferred.add('cat');
  if (place.category === 'clinic') {
    inferred.add('cat');
    inferred.add('dog');
  }
  return Array.from(inferred);
}

function filterPlacesBySpecies(items: Place[], speciesFilter: PlaceSpeciesFilter) {
  if (speciesFilter === 'all') return items;
  return items.filter((place) => getPlaceSupportedSpecies(place).includes(speciesFilter));
}

type ConfirmState = {
  body: string;
  confirmText?: string;
  onConfirm: () => void;
  title: string;
};

type PlaceSubmitResult = {
  draft: string;
  kind: 'place' | 'review';
  placeMeta: string;
  placeName: string;
  status: 'error' | 'success';
  submittedAt: string;
};

type PlaceComposerDraft = {
  address: string;
  customFeatureDraft: string;
  customFeatureVisible: boolean;
  experience: string;
  featureTags: string[];
  kind: 'place' | 'review';
  name: string;
  photoUris: string[];
  placeId?: string;
  rating: number;
  reviewDraft: string;
  savedAt: number;
  version: 1;
};

type WalkInviteDraft = {
  latitude?: number;
  longitude?: number;
  note: string;
  ownerId: string;
  place: string;
  placeAddress?: string;
  placeId?: string;
  savedAt: number;
  time: string;
  version: 1;
};

const PLACE_COMPOSER_DRAFT_STORAGE_PREFIX = 'lumii.placeComposerDraft.v1';
const WALK_INVITE_DRAFT_STORAGE_PREFIX = 'lumii.walkInviteDraft.v1';

type AppToast = {
  icon?: 'bookmark' | 'heart';
  iconTone?: 'muted' | 'orange';
  layout?: 'avatarSaveError' | 'avatarSaveSuccess' | 'default';
  message: string;
  placement?: 'bottom' | 'top';
  subtitle?: string;
  tone?: 'error' | 'info' | 'success' | 'warning';
  variant?: 'dark' | 'surface';
};

type UserSettingKey = keyof UserSettings;
type AvatarFeedbackChipId = 'cartoon' | 'color_deeper' | 'color_lighter' | 'ears' | 'eyes' | 'not_same_pet' | 'posture';
type AvatarCandidateTone = 'main' | 'soft' | 'warm';

const avatarFeedbackOptions: Array<{ id: AvatarFeedbackChipId; label: string; reason: AvatarGenerationFeedbackReason }> = [
  { id: 'not_same_pet', label: '不像我家宠物', reason: 'not_same_pet' },
  { id: 'color_lighter', label: '毛色更浅', reason: 'color' },
  { id: 'color_deeper', label: '毛色更深', reason: 'color' },
  { id: 'ears', label: '耳朵更像', reason: 'face_shape' },
  { id: 'eyes', label: '眼睛更像', reason: 'expression' },
  { id: 'posture', label: '胖瘦调整', reason: 'face_shape' },
  { id: 'cartoon', label: '卡通程度调整', reason: 'style' },
];

const defaultAvatarFeedbackChipIds: AvatarFeedbackChipId[] = ['not_same_pet', 'color_deeper', 'eyes'];
const avatarCandidateTones: AvatarCandidateTone[] = ['main', 'warm', 'soft'];

function isGeneratedAvatarUri(uri?: null | string) {
  return Boolean(uri?.startsWith('lumii://'));
}

function getAvatarCandidateUrls(job?: null | AvatarJob) {
  const candidates = (job?.candidateUrls ?? []).map((uri) => uri.trim()).filter(Boolean);
  if (candidates.length) return candidates;
  return job?.resultUrl ? [job.resultUrl] : [];
}

function clampSmsCooldown(availableAt: number) {
  const now = Date.now();
  return Math.min(Math.max(availableAt, now), now + smsCooldownMs);
}

function formatMaskedPhone(phone?: null | string) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (/^1[3-9]\d{9}$/.test(digits)) return `${digits.slice(0, 3)} **** ${digits.slice(-4)}`;
  return '未绑定手机号';
}

function formatOwnerName(phone?: null | string, pet?: null | PetProfile, ownerName?: null | string) {
  const normalizedOwnerName = String(ownerName ?? '').trim();
  if (normalizedOwnerName) return normalizedOwnerName;
  if (pet?.name) return `${pet.name}的铲屎官`;
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (/^1[3-9]\d{9}$/.test(digits)) return `用户${digits.slice(-4)}`;
  return '灵伴用户';
}

function accountVerificationLabel(phone?: null | string) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return /^1[3-9]\d{9}$/.test(digits) ? '手机号已验证' : '手机号待验证';
}

function currentDeviceLabel() {
  if (Platform.OS === 'android') return 'Android 当前设备';
  if (Platform.OS === 'ios') return 'iPhone 当前设备';
  if (Platform.OS === 'web') return 'Web 预览设备';
  return '当前设备';
}

function formatPetAge(birthday?: string) {
  if (!birthday) return '年龄待补充';
  const bornAt = new Date(birthday);
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

function formatWeightKg(kg?: null | number) {
  if (!Number.isFinite(Number(kg))) return '待记录';
  return `${Number(kg).toFixed(1).replace(/\.0$/, '')} kg`;
}

function formatDueLabel(dueAt?: string) {
  if (!dueAt) return '待设置';
  const due = new Date(`${dueAt}T00:00:00`);
  if (Number.isNaN(due.getTime())) return dueAt;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return `逾期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `${days} 天后`;
}

function daysUntilDate(dateText?: string) {
  if (!dateText) return null;
  const due = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function isVaccineReminderUrgent(vaccine: VaccinePlan) {
  const days = daysUntilDate(vaccine.dueAt);
  return vaccine.status !== 'done' && days !== null && days <= 7;
}

function vaccineReminderCopy(vaccine?: VaccinePlan) {
  if (!vaccine) return '暂无待提醒计划';
  if (vaccine.status === 'done') return '已完成';
  const days = daysUntilDate(vaccine.dueAt);
  if (days === null) return '待提醒';
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  if (days <= 7) return `${days} 天后到期`;
  return formatDueLabel(vaccine.dueAt);
}

function petBodySizeLabel(pet?: PetProfile | null) {
  const kg = Number(pet?.weightKg);
  if (!Number.isFinite(kg) || kg <= 0) return '待补充';
  if (pet?.species === 'cat') {
    if (kg < 3.5) return '偏小';
    if (kg <= 6.5) return '标准';
    return '偏大';
  }
  if (kg < 10) return '小型';
  if (kg < 25) return '中型';
  return '大型';
}

function buildPetProfileTags(pet?: PetProfile | null, pendingVaccineCount = 0, vaccineCount = 0) {
  if (!pet) return [];
  const tags = pet.personality?.length ? [...pet.personality] : [];
  if (pendingVaccineCount > 0) tags.push(`${pendingVaccineCount} 项待提醒`);
  else tags.push(vaccineCount > 0 ? '疫苗已完成' : '疫苗待添加');
  tags.push(pet.weightKg ? '体重已记录' : '体重待补充');
  if (!pet.birthday) tags.push('生日待补充');
  return [...new Set(tags)].slice(0, 3);
}

function dateToIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(dateText?: string) {
  if (!dateText) return null;
  const date = new Date(`${dateText.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function todayIsoDate() {
  return dateToIsoDate(new Date());
}

function addDaysIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateToIsoDate(date);
}

function isExactIsoCalendarDate(dateText: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return false;
  const date = parseIsoDate(dateText);
  return Boolean(date && dateToIsoDate(date) === dateText);
}

function formatClockTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatTodayTimeLabel(date = new Date()) {
  return `今天 · ${formatClockTime(date)}`;
}

function defaultMemoReminderDate() {
  return nextMemoReminderDate('quarterly');
}

function normalizeMemoRepeat(value?: HealthMemo['repeat']): MemoRepeat {
  return value === 'monthly' || value === 'quarterly' || value === 'yearly' || value === 'none' ? value : 'none';
}

function nextMemoReminderDate(repeat: MemoRepeat, base = new Date()) {
  const date = new Date();
  date.setTime(base.getTime());
  if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
  else if (repeat === 'quarterly') date.setMonth(date.getMonth() + 3);
  else if (repeat === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else date.setDate(date.getDate() + 7);
  date.setHours(9, 0, 0, 0);
  return date;
}

function formatMemoReminderLabel(date: Date) {
  return `${dateToIsoDate(date)} · ${formatClockTime(date)}`;
}

function formatMemoReminderValue(date: Date) {
  return `${dateToIsoDate(date)} ${formatClockTime(date)}`;
}

function parseMemoReminderDate(value?: string, fallbackRepeat: MemoRepeat = 'quarterly') {
  if (!value) return nextMemoReminderDate(fallbackRepeat);
  const normalized = value.trim().replace(' · ', ' ').replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? nextMemoReminderDate(fallbackRepeat) : date;
}

const memoRepeatOptions: Array<{ label: string; value: MemoRepeat }> = [
  { label: '不重复', value: 'none' },
  { label: '每月', value: 'monthly' },
  { label: '每 3 月', value: 'quarterly' },
  { label: '每年', value: 'yearly' },
];

function memoRepeatLabel(value?: HealthMemo['repeat']) {
  return memoRepeatOptions.find((item) => item.value === normalizeMemoRepeat(value))?.label ?? '不重复';
}

function buildWalkInviteDateTiles(base = new Date()) {
  const times = ['17:30', '18:30', '16:00'];
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return [0, 1, 2].map((offset) => {
    const date = new Date(base);
    date.setDate(base.getDate() + offset);
    const day = offset === 0 ? '今天' : offset === 1 ? '明天' : weekdays[date.getDay()];
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      date: monthDay,
      day,
      value: `${day} ${times[offset]}`,
      weekday: weekdays[date.getDay()],
    };
  });
}

function defaultWalkInviteTime() {
  return buildWalkInviteDateTiles()[0]?.value ?? `今天 ${formatClockTime()}`;
}

function withOperationTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
  });
}

function monthStartIso(dateText = todayIsoDate()) {
  const date = parseIsoDate(dateText) ?? new Date();
  return dateToIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function shiftMonthIso(monthIso: string, amount: number) {
  const date = parseIsoDate(monthIso) ?? new Date();
  return dateToIsoDate(new Date(date.getFullYear(), date.getMonth() + amount, 1));
}

function formatMonthLabel(monthIso: string) {
  const date = parseIsoDate(monthIso) ?? new Date();
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function formatCalendarDateLabel(dateText: string) {
  const date = parseIsoDate(dateText);
  if (!date) return dateText;
  if (isSameCalendarDay(date, new Date())) return '今天';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return '昨天';
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function formatOptionalDateLabel(dateText?: string, fallback = '今天') {
  return dateText ? formatCalendarDateLabel(dateText) : fallback;
}

function formatCompactDateLabel(dateText?: string, fallback = '待设置') {
  if (!dateText) return fallback;
  const date = parseIsoDate(dateText);
  if (!date) return dateText;
  if (isSameCalendarDay(date, new Date())) return '今天';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameCalendarDay(date, tomorrow)) return '明天';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return '昨天';
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function weekdayLabel(dateText: string) {
  const date = parseIsoDate(dateText);
  if (!date) return '日期待确认';
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
}

function mergePermissionState(...states: Array<Partial<PermissionStateMap> | null | undefined>): PermissionStateMap {
  return states.reduce<PermissionStateMap>((next, state) => ({ ...next, ...(state ?? {}) }), { ...initialPermissions });
}

function mergeNativePermissionStatus(base: PermissionStateMap, patch: Partial<PermissionStateMap>): PermissionStateMap {
  return permissionKeys.reduce<PermissionStateMap>((next, key) => {
    const incoming = patch[key];
    if (!incoming) return next;
    const current = next[key];
    next[key] = (current === 'blocked' || current === 'unavailable') && incoming !== 'granted' ? current : incoming;
    return next;
  }, mergePermissionState(base));
}

function allLumiiPermissionsGranted(state: PermissionStateMap) {
  return permissionKeys.every((key) => state[key] === 'granted');
}

function createConversationSafetyMessage(): ConversationMessage {
  return { author: 'system', id: 'conversation-safe-tip', text: '为了保护隐私，聊天前不会展示精确住址。', time: new Date().toISOString() };
}

function createPetChatWelcomeMessage(pet?: null | PetProfile): ChatMessage {
  return {
    author: 'ai',
    id: 'pet-chat-welcome',
    status: 'sent',
    text: `我是${pet?.name ? `${pet.name}的` : '你的'}灵伴。今天想记录什么小事？`,
    time: new Date().toISOString(),
  };
}

function indexPlaceReviewsByPlaceId(reviews: PlaceReview[]) {
  return reviews.reduce<Record<string, PlaceReview>>((next, review) => {
    if (!next[review.placeId]) next[review.placeId] = review;
    return next;
  }, {});
}

export default function LumiiMvpApp() {
  const isHomePreviewMode = getWebPreviewParam('preview') === 'home' || getWebPreviewParam('preview') === 'pet-home';
  const forcedHomeMomentKind = normalizeHomeMomentPreview(getWebPreviewParam('moment'));
  const profileHorizontalInset = Platform.OS === 'web' ? 16 : 12;
  const profileBlockMarginStyle = useMemo<ViewStyle>(() => ({ marginHorizontal: profileHorizontalInset }), [profileHorizontalInset]);
  const profileBlockPaddingStyle = useMemo<ViewStyle>(() => ({ paddingHorizontal: profileHorizontalInset }), [profileHorizontalInset]);
  const [route, setRoute] = useState<AppRoute>(isHomePreviewMode ? 'home' : 'login');
  const [history, setHistory] = useState<AppRoute[]>([]);
  const [toast, setToast] = useState<AppToast | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [amapNavigationPlace, setAmapNavigationPlace] = useState<Place | null>(null);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [sessionBootstrapping, setSessionBootstrapping] = useState(!isHomePreviewMode);
  const [bootPetAvatarUri, setBootPetAvatarUri] = useState<string | null>(isHomePreviewMode ? webPreviewPet.avatarUrl ?? null : null);

  const [phone, setPhone] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementAttention, setAgreementAttention] = useState(false);
  const [loginInlineError, setLoginInlineError] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const sendLoadingRef = useRef(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const verifyLoadingRef = useRef(false);
  const [loginSuccessLoading, setLoginSuccessLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMeta, setOtpMeta] = useState<SmsCodeTicket | null>(null);
  const [otpInlineError, setOtpInlineError] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [session, setSession] = useState<AuthSession | null>(isHomePreviewMode ? webPreviewSession : null);
  const activePetIdRef = useRef<string | null>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const phoneValueRef = useRef('');
  const otpInputRef = useRef<TextInput>(null);
  const otpMetaRef = useRef<SmsCodeTicket | null>(null);
  const mapAutoLocateAttemptedRef = useRef(false);
  const lastDiscoverLocationRef = useRef<NearbyLocationHint | null>(null);
  const exitBackPressedAtRef = useRef(0);
  const previousRouteRef = useRef<AppRoute>(isHomePreviewMode ? 'home' : 'login');
  const routeRef = useRef<AppRoute>(isHomePreviewMode ? 'home' : 'login');
  const systemSettingsOpenedAtRef = useRef(0);
  const registeredPushTokenRef = useRef('');
  const scheduledPushRegistrationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef(isHomePreviewMode ? webPreviewSession.token : '');
  const permissionsRef = useRef<PermissionStateMap>(isHomePreviewMode ? webPreviewPermissions : initialPermissions);
  const userSettingsRef = useRef<UserSettings>(defaultUserSettings);
  const userSettingSavingKeysRef = useRef<Set<UserSettingKey>>(new Set());
  const datePickerCommitRef = useRef<(date: Date) => void>(() => undefined);

  const [datePickerRequest, setDatePickerRequest] = useState<DatePickerRequest | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [permissions, setPermissions] = useState<PermissionStateMap>(isHomePreviewMode ? webPreviewPermissions : initialPermissions);
  const [activePet, setActivePet] = useState<PetProfile | null>(isHomePreviewMode ? webPreviewPet : null);
  const [pets, setPets] = useState<PetProfile[]>(isHomePreviewMode ? [webPreviewPet] : []);
  const [petSwitchingId, setPetSwitchingId] = useState('');
  const petSwitchingIdRef = useRef('');
  const [petDeletingId, setPetDeletingId] = useState('');
  const petDeletingIdRef = useRef('');
  const [petDeleteConfirm, setPetDeleteConfirm] = useState<PetProfile | null>(null);
  const [petDraft, setPetDraft] = useState(emptyPetDraft);
  const [petProfileSaving, setPetProfileSaving] = useState(false);
  const petProfileSavingRef = useRef(false);
  const [media, setMedia] = useState<UploadedPetMedia | null>(null);
  const mediaIdRef = useRef<string | null>(null);
  const [mediaPickerMode, setMediaPickerMode] = useState<'camera' | 'library' | null>(null);
  const mediaPickingRef = useRef(false);
  const [avatarJob, setAvatarJob] = useState<AvatarJob | null>(null);
  const avatarJobIdRef = useRef<string | null>(null);
  const avatarPollingJobIdRef = useRef<string | null>(null);
  const [avatarStarting, setAvatarStarting] = useState(false);
  const avatarStartingRef = useRef(false);
  const [avatarResultPrefetching, setAvatarResultPrefetching] = useState(false);
  const [avatarAccepting, setAvatarAccepting] = useState(false);
  const avatarAcceptingRef = useRef(false);
  const [avatarRetrying, setAvatarRetrying] = useState(false);
  const avatarRetryingRef = useRef(false);
  const avatarResultRouteJobIdRef = useRef('');
  const avatarTransitioningJobIdRef = useRef<string | null>(null);
  const [selectedAvatarCandidateIndex, setSelectedAvatarCandidateIndex] = useState(0);
  const [avatarFeedbackSheetVisible, setAvatarFeedbackSheetVisible] = useState(false);
  const [avatarFeedbackChipIds, setAvatarFeedbackChipIds] = useState<AvatarFeedbackChipId[]>(defaultAvatarFeedbackChipIds);
  const [avatarFeedbackSubmitting, setAvatarFeedbackSubmitting] = useState(false);
  const avatarFeedbackSubmittingRef = useRef(false);
  const [avatarRegenerateConfirmVisible, setAvatarRegenerateConfirmVisible] = useState(false);
  const [homeHintIndex, setHomeHintIndex] = useState(() => Math.floor(Math.random() * homeChatPrompts.length));

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([createPetChatWelcomeMessage()]);
  const [chatInput, setChatInput] = useState('');
  const petChatScrollRef = useRef<ScrollView>(null);
  const [chatFeedbackById, setChatFeedbackById] = useState<Record<string, PetChatFeedbackRating>>({});
  const [chatFeedbackSavingIds, setChatFeedbackSavingIds] = useState<string[]>([]);
  const chatFeedbackSavingIdsRef = useRef<Set<string>>(new Set());
  const [chatReplying, setChatReplying] = useState(false);
  const chatReplyingRef = useRef(false);
  const [aiUsage, setAiUsage] = useState<AiUsageSummary | null>(null);
  const [petChatDailyCount, setPetChatDailyCount] = useState(0);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [healthCalendarEvents, setHealthCalendarEvents] = useState<HealthCalendarEvent[]>([]);
  const [healthCalendarError, setHealthCalendarError] = useState('');
  const [healthCalendarLoading, setHealthCalendarLoading] = useState(false);
  const healthCalendarLoadingRef = useRef(false);
  const [healthCalendarRefreshing, setHealthCalendarRefreshing] = useState(false);
  const [healthCalendarMonth, setHealthCalendarMonth] = useState(() => monthStartIso());
  const [selectedHealthCalendarDate, setSelectedHealthCalendarDate] = useState(() => todayIsoDate());
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [vaccines, setVaccines] = useState<VaccinePlan[]>([]);
  const [vaccineReminderIds, setVaccineReminderIds] = useState<string[]>([]);
  const [memos, setMemos] = useState<HealthMemo[]>([]);
  const [weightEditorMode, setWeightEditorMode] = useState<'add' | 'edit' | null>(null);
  const [weightEditRecord, setWeightEditRecord] = useState<WeightRecord | null>(null);
  const [weightEditValue, setWeightEditValue] = useState('');
  const [weightEditNote, setWeightEditNote] = useState('');
  const [weightDraftRecordedAt, setWeightDraftRecordedAt] = useState(() => new Date());
  const [weightEditSaving, setWeightEditSaving] = useState(false);
  const weightEditSavingRef = useRef(false);
  const [weightDeleteConfirm, setWeightDeleteConfirm] = useState<WeightRecord | null>(null);
  const [weightSaving, setWeightSaving] = useState(false);
  const weightSavingRef = useRef(false);
  const [memoTitle, setMemoTitle] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const memoSavingRef = useRef(false);
  const [selectedMemo, setSelectedMemo] = useState<HealthMemo | null>(null);
  const [memoEditTitle, setMemoEditTitle] = useState('');
  const [memoEditContent, setMemoEditContent] = useState('');
  const [memoEditRepeat, setMemoEditRepeat] = useState<MemoRepeat>('none');
  const [memoEditReminderAt, setMemoEditReminderAt] = useState(() => defaultMemoReminderDate());
  const [memoEditReminderEnabled, setMemoEditReminderEnabled] = useState(false);
  const [memoEditSaving, setMemoEditSaving] = useState(false);
  const memoEditSavingRef = useRef(false);
  const [memoDeleting, setMemoDeleting] = useState(false);
  const memoDeletingRef = useRef(false);
  const [memoDeleteConfirmVisible, setMemoDeleteConfirmVisible] = useState(false);
  const [memoDraftTitle, setMemoDraftTitle] = useState('');
  const [memoDraftContent, setMemoDraftContent] = useState('');
  const [memoDraftRepeat, setMemoDraftRepeat] = useState<NonNullable<HealthMemo['repeat']>>('quarterly');
  const [memoDraftReminderAt, setMemoDraftReminderAt] = useState(() => defaultMemoReminderDate());
  const [memoDraftReminderEnabled, setMemoDraftReminderEnabled] = useState(true);
  const [memoDraftSaving, setMemoDraftSaving] = useState(false);
  const memoDraftSavingRef = useRef(false);
  const [vaccineReminderSavingIds, setVaccineReminderSavingIds] = useState<string[]>([]);
  const vaccineReminderSavingIdsRef = useRef<Set<string>>(new Set());
  const [vaccineDoneSavingIds, setVaccineDoneSavingIds] = useState<string[]>([]);
  const vaccineDoneSavingIdsRef = useRef<Set<string>>(new Set());
  const [vaccineComposerVisible, setVaccineComposerVisible] = useState(false);
  const [vaccineNameDraft, setVaccineNameDraft] = useState('');
  const [vaccineDueDraft, setVaccineDueDraft] = useState('');
  const [vaccineCreating, setVaccineCreating] = useState(false);
  const vaccineCreatingRef = useRef(false);
  const [dailyPostText, setDailyPostText] = useState('');
  const [dailyMood, setDailyMood] = useState<DailyMood>('开心');
  const [dailyPostPhotoUris, setDailyPostPhotoUris] = useState<string[]>([]);
  const [dailyPhotoPicking, setDailyPhotoPicking] = useState(false);
  const dailyPhotoPickingRef = useRef(false);
  const [dailyPostSaving, setDailyPostSaving] = useState(false);
  const dailyPostSavingRef = useRef(false);
  const [owners, setOwners] = useState<NearbyOwner[]>([]);
  const ownersRef = useRef<NearbyOwner[]>([]);
  const [nearbyMoments, setNearbyMoments] = useState<NearbyMoment[]>([]);
  const [nearbyMomentsError, setNearbyMomentsError] = useState('');
  const [nearbyMomentsLoading, setNearbyMomentsLoading] = useState(false);
  const nearbyMomentsLoadingRef = useRef(false);
  const [homeMomentIndex, setHomeMomentIndex] = useState(0);
  const [discoverRefreshing, setDiscoverRefreshing] = useState(false);
  const discoverRefreshingRef = useRef(false);
  const [discoverLocationError, setDiscoverLocationError] = useState('');
  const [discoverLastRefreshedAt, setDiscoverLastRefreshedAt] = useState(0);
  const discoverRequestSeqRef = useRef(0);
  const [discoverFilter, setDiscoverFilter] = useState<DiscoverFilter>('all');
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverSearchVisible, setDiscoverSearchVisible] = useState(false);
  const discoverSearchInputRef = useRef<TextInput>(null);
  const [greetingRequestOwners, setGreetingRequestOwners] = useState<NearbyOwner[]>([]);
  const greetingRequestOwnersRef = useRef<NearbyOwner[]>([]);
  const [greetingRequestSeenAtById, setGreetingRequestSeenAtById] = useState<Record<string, number>>({});
  const greetingRequestSeenAtByIdRef = useRef<Record<string, number>>({});
  const [socialActionSavingIds, setSocialActionSavingIds] = useState<string[]>([]);
  const socialActionSavingIdsRef = useRef<Set<string>>(new Set());
  const [walkInviteSaving, setWalkInviteSaving] = useState(false);
  const walkInviteSavingRef = useRef(false);
  const [walkDraftSaving, setWalkDraftSaving] = useState(false);
  const walkDraftSavingRef = useRef(false);
  const [selectedOwner, setSelectedOwner] = useState<NearbyOwner | null>(null);
  const selectedOwnerIdRef = useRef<string | null>(null);
  const [greetingSheetOwner, setGreetingSheetOwner] = useState<NearbyOwner | null>(null);
  const [greetingMessage, setGreetingMessage] = useState('你好呀，我们也在附近，想认识一下吗？');
  const [walkInvitePlace, setWalkInvitePlace] = useState('');
  const [walkInvitePlaceAddress, setWalkInvitePlaceAddress] = useState('');
  const [walkInvitePlaceId, setWalkInvitePlaceId] = useState('');
  const [walkInvitePlaceLatitude, setWalkInvitePlaceLatitude] = useState<number | undefined>(undefined);
  const [walkInvitePlaceLongitude, setWalkInvitePlaceLongitude] = useState<number | undefined>(undefined);
  const [walkInvitePickingPlace, setWalkInvitePickingPlace] = useState(false);
  const [walkInviteTime, setWalkInviteTime] = useState(() => defaultWalkInviteTime());
  const [walkInviteNote, setWalkInviteNote] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const inboxRefreshInFlightRef = useRef(false);
  const inboxRefreshQueuedRef = useRef(false);
  const conversationRefreshInFlightRef = useRef<string | null>(null);
  const conversationSendingKeysRef = useRef<Set<string>>(new Set());
  const localConversationMessageIdsRef = useRef<Record<string, string>>({});
  const [inboxManualRefreshing, setInboxManualRefreshing] = useState(false);
  const inboxManualRefreshingRef = useRef(false);
  const [conversationDraftsById, setConversationDraftsById] = useState<Record<string, string>>({});
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([createConversationSafetyMessage()]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationSeenAtById, setNotificationSeenAtById] = useState<Record<string, number>>({});
  const notificationSeenAtByIdRef = useRef<Record<string, number>>({});
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeQuery, setPlaceQuery] = useState('');
  const placeQueryRef = useRef('');
  const mapSearchInputRef = useRef<TextInput>(null);
  const [placeFilter, setPlaceFilter] = useState<'all' | Place['category']>('all');
  const [placeDistanceRadiusKm, setPlaceDistanceRadiusKm] = useState<PlaceDistanceFilterKm>(3);
  const [placeSpeciesFilter, setPlaceSpeciesFilter] = useState<PlaceSpeciesFilter>('all');
  const [placeSortMode, setPlaceSortMode] = useState<PlaceSortMode>('distance');
  const [placeSearching, setPlaceSearching] = useState(false);
  const placeSearchingRef = useRef(false);
  const [mapPlacesSheetExpanded, setMapPlacesSheetExpanded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const selectedPlaceIdRef = useRef<string | null>(null);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState<string[]>([]);
  const [favoritePlaceSavingIds, setFavoritePlaceSavingIds] = useState<string[]>([]);
  const favoritePlaceSavingIdsRef = useRef<Set<string>>(new Set());
  const [placeReviewsByPlaceId, setPlaceReviewsByPlaceId] = useState<Record<string, PlaceReview>>({});
  const [locatingMap, setLocatingMap] = useState(false);
  const locatingMapRef = useRef(false);
  const locatingMapRequestRef = useRef(0);
  const [mapLocationError, setMapLocationError] = useState('');
  const [mapCenter, setMapCenter] = useState(defaultMapCenter);
  const [mapStyleKey, setMapStyleKey] = useState<MapVisualMode>('lumii');
  const [mapTrafficEnabled, setMapTrafficEnabled] = useState(false);
  const [mapStylePanelVisible, setMapStylePanelVisible] = useState(false);
  const [placeComposerMode, setPlaceComposerMode] = useState<'place' | 'review'>('place');
  const [placeDraftAddress, setPlaceDraftAddress] = useState('');
  const [placeDraftName, setPlaceDraftName] = useState('');
  const [placeReviewDraft, setPlaceReviewDraft] = useState('');
  const [placeSubmissionExperience, setPlaceSubmissionExperience] = useState('');
  const [placeSubmissionRating, setPlaceSubmissionRating] = useState(5);
  const [selectedPlaceFeatureTags, setSelectedPlaceFeatureTags] = useState<string[]>([]);
  const [customPlaceFeatureDraft, setCustomPlaceFeatureDraft] = useState('');
  const [customPlaceFeatureVisible, setCustomPlaceFeatureVisible] = useState(false);
  const customPlaceFeatureInputRef = useRef<TextInput>(null);
  const [placePhotoUris, setPlacePhotoUris] = useState<string[]>([]);
  const [placePhotoPicking, setPlacePhotoPicking] = useState(false);
  const placePhotoPickingRef = useRef(false);
  const [placeReviewSaving, setPlaceReviewSaving] = useState(false);
  const placeReviewSavingRef = useRef(false);
  const [placeSubmitResult, setPlaceSubmitResult] = useState<PlaceSubmitResult | null>(null);
  const [placeDraftSaving, setPlaceDraftSaving] = useState(false);
  const placeDraftSavingRef = useRef(false);
  const [placeSubmissionSaving, setPlaceSubmissionSaving] = useState(false);
  const placeSubmissionSavingRef = useRef(false);
  const [placeSubmissionStatus, setPlaceSubmissionStatus] = useState<'idle' | 'pending_review'>('idle');
  const [userSettings, setUserSettings] = useState<UserSettings>(isHomePreviewMode ? webPreviewSession.account!.settings : defaultUserSettings);
  const [ownerNameDraft, setOwnerNameDraft] = useState('');
  const [ownerBioDraft, setOwnerBioDraft] = useState('');
  const [ownerAvatarDraft, setOwnerAvatarDraft] = useState('');
  const [ownerAvatarUploadDraft, setOwnerAvatarUploadDraft] = useState<LocalImageUploadDraft | null>(null);
  const [ownerAvatarPicking, setOwnerAvatarPicking] = useState(false);
  const ownerAvatarPickingRef = useRef(false);
  const [ownerProfileSaveError, setOwnerProfileSaveError] = useState('');
  const [ownerProfileSaved, setOwnerProfileSaved] = useState(false);
  const [ownerProfileSaving, setOwnerProfileSaving] = useState(false);
  const ownerProfileSavingRef = useRef(false);
  const healthReminderNotifiedRef = useRef<Set<string>>(new Set());
  const localHealthReminderSyncKeyRef = useRef('');
  const localHealthReminderScheduledIdsRef = useRef<string[]>([]);

  const currentTab = useMemo<AppTab | null>(() => {
    if (route === 'health' || route === 'emptyPet') return 'home';
    return tabItems.some((item) => item.route === route) ? (route as AppTab) : null;
  }, [route]);

  const showBottomTabs = Boolean(session && currentTab);
  const cooldownRemaining = Math.min(60, Math.max(0, Math.ceil((cooldownUntil - clock) / 1000)));
  const petAvatarDailyUsage = aiUsage?.daily.petAvatar;
  const petAvatarDailyLimit = petAvatarDailyUsage?.limit ?? fallbackPetAvatarDailyLimit;
  const petAvatarDailyCount = petAvatarDailyUsage?.count ?? 0;
  const petAvatarDailyRemaining = petAvatarDailyUsage?.remaining ?? Math.max(0, petAvatarDailyLimit - petAvatarDailyCount);
  const petChatDailyLimit = aiUsage?.daily.petChat.limit ?? fallbackPetChatDailyLimit;
  const pendingVaccines = useMemo(() => vaccines.filter((item) => item.status !== 'done'), [vaccines]);
  const urgentVaccines = useMemo(() => pendingVaccines.filter(isVaccineReminderUrgent), [pendingVaccines]);

  function getActivePetFallback() {
    return apiConfig.mode === 'mock' ? lumiiApi.pets.getActivePet() : null;
  }

  function getCurrentPet() {
    return activePet ?? getActivePetFallback();
  }

  function isCurrentPetRequest(requestSessionToken: string, requestPetId: null | string) {
    return Boolean(requestSessionToken && requestPetId && sessionTokenRef.current === requestSessionToken && activePetIdRef.current === requestPetId);
  }

  function isCurrentDiscoverRequest(requestSessionToken: string, requestId: number) {
    return sessionTokenRef.current === requestSessionToken && discoverRequestSeqRef.current === requestId && userSettingsRef.current.nearbyVisible;
  }

  const showToast = useCallback((message: string, options?: Omit<AppToast, 'message'>) => setToast({ message, ...options }), []);

  function closeDatePicker() {
    setDatePickerRequest(null);
  }

  function openDatePicker(request: DatePickerRequest, onCommit: (date: Date) => void) {
    if (Platform.OS === 'web') return;
    datePickerCommitRef.current = onCommit;
    setDatePickerRequest(request);
  }

  function handleNativeDatePickerChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      closeDatePicker();
    }
    if (event.type !== 'set' || !selectedDate) return;
    if (Platform.OS === 'ios') {
      setDatePickerRequest((current) => (current ? { ...current, value: selectedDate } : current));
      return;
    }
    datePickerCommitRef.current(selectedDate);
  }

  function commitIosDatePicker() {
    if (!datePickerRequest) return;
    datePickerCommitRef.current(datePickerRequest.value);
    closeDatePicker();
  }

  function preserveClockTime(base: Date, selectedDate: Date) {
    const next = new Date(selectedDate);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    return next;
  }

  function openPetBirthdayPicker() {
    openDatePicker(
      {
        maximumDate: new Date(),
        mode: 'date',
        title: '选择生日',
        value: parseIsoDate(petDraft.birthday) ?? new Date(),
      },
      (date) => setPetDraft((draft) => ({ ...draft, birthday: dateToIsoDate(date) })),
    );
  }

  function openWeightRecordDatePicker() {
    const value = weightEditRecord?.recordedAt ? parseIsoDate(weightEditRecord.recordedAt) ?? new Date() : weightDraftRecordedAt;
    openDatePicker(
      {
        maximumDate: new Date(),
        mode: 'date',
        title: '选择记录日期',
        value,
      },
      (date) => {
        const selectedIso = dateToIsoDate(date);
        if (weightEditRecord) {
          setWeightEditRecord((record) => (record ? { ...record, recordedAt: selectedIso } : record));
          return;
        }
        setWeightDraftRecordedAt(preserveClockTime(weightDraftRecordedAt, date));
      },
    );
  }

  function openVaccineDueDatePicker() {
    openDatePicker(
      {
        minimumDate: parseIsoDate(todayIsoDate()) ?? new Date(),
        mode: 'date',
        title: '选择计划日期',
        value: parseIsoDate(vaccineDueDraft) ?? parseIsoDate(addDaysIsoDate(30)) ?? new Date(),
      },
      (date) => setVaccineDueDraft(dateToIsoDate(date)),
    );
  }

  function openMemoReminderDatePicker(kind: 'draft' | 'edit') {
    const current = kind === 'draft' ? memoDraftReminderAt : memoEditReminderAt;
    openDatePicker(
      {
        minimumDate: parseIsoDate(todayIsoDate()) ?? new Date(),
        mode: 'date',
        title: '选择提醒日期',
        value: current,
      },
      (date) => {
        const next = preserveClockTime(current, date);
        if (kind === 'draft') setMemoDraftReminderAt(next);
        else setMemoEditReminderAt(next);
      },
    );
  }

  const go = useCallback(
    (nextRoute: AppRoute) => {
      if (nextRoute === route) return;
      exitBackPressedAtRef.current = 0;
      setHistory((items) => [...items, route]);
      setRoute(nextRoute);
    },
    [route],
  );

  const replace = useCallback((nextRoute: AppRoute) => {
    exitBackPressedAtRef.current = 0;
    setRoute(nextRoute);
  }, []);

  const resetTo = useCallback((nextRoute: AppRoute) => {
    exitBackPressedAtRef.current = 0;
    setHistory([]);
    setRoute(nextRoute);
  }, []);

  const getDefaultBackRoute = useCallback((): AppRoute => {
    if (!session) return 'login';
    return activePet ? 'home' : 'emptyPet';
  }, [activePet, session]);

  const back = useCallback(() => {
    setHistory((items) => {
      const next = [...items];
      const previous = next.pop();
      setRoute(previous ?? getDefaultBackRoute());
      return next;
    });
  }, [getDefaultBackRoute]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (confirm) {
        setConfirm(null);
        return true;
      }

      if (amapNavigationPlace) {
        setAmapNavigationPlace(null);
        return true;
      }

      if (mapStylePanelVisible) {
        setMapStylePanelVisible(false);
        return true;
      }

      if (walkInvitePickingPlace && route === 'map') {
        cancelWalkInvitePlacePick();
        return true;
      }

      if (tabBackToHomeRoutes.has(route)) {
        resetTo(activePet ? 'home' : 'emptyPet');
        return true;
      }

      if (appExitPromptRoutes.has(route)) {
        const now = Date.now();
        if (now - exitBackPressedAtRef.current < 1800) {
          BackHandler.exitApp();
          return true;
        }
        exitBackPressedAtRef.current = now;
        showToast('再按一次退出灵伴');
        return true;
      }

      back();
      return true;
    });

    return () => subscription.remove();
  }, [activePet, amapNavigationPlace, back, confirm, mapStylePanelVisible, resetTo, route, showToast, walkInvitePickingPlace]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(Math.max(0, Math.round(event.endCoordinates.height)));
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isHomePreviewMode) {
      setLumiiAuthToken(webPreviewSession.token);
      setSessionBootstrapping(false);
      return undefined;
    }

    let mounted = true;

    const bootstrapSession = async () => {
      try {
        const persistedSession = await loadPersistedLumiiSession();
        if (!mounted) return;
        if (persistedSession) {
          setBootPetAvatarUri(persistedSession.account?.activePet?.avatarUrl ?? null);
          setLumiiAuthToken(persistedSession.token);
          const refreshedSession = await lumiiApi.auth.refreshSession(persistedSession);
          if (!mounted) return;
          if (refreshedSession.error?.statusCode === 401) {
            await clearPersistedLumiiSession();
            clearLocalAccountState();
            return;
          }
          await restoreAfterLogin(refreshedSession.data ?? persistedSession, { persist: Boolean(refreshedSession.data), silent: true });
        }
      } catch {
        if (mounted) {
          await clearPersistedLumiiSession();
        }
      } finally {
        if (mounted) setSessionBootstrapping(false);
      }
    };

    void bootstrapSession();

    return () => {
      mounted = false;
    };
  }, [isHomePreviewMode]);

  useEffect(() => {
    if (!toast?.message) return undefined;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast?.message]);

  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  useEffect(() => {
    if (cooldownRemaining === 0 && cooldownUntil) setCooldownUntil(0);
  }, [cooldownRemaining, cooldownUntil]);

  useEffect(() => {
    if (!session) return;
    sessionTokenRef.current = session.token;
    if (isHomePreviewMode) return;
    void loadCommonData(session.token);
  }, [isHomePreviewMode, session?.token]);

  useEffect(() => {
    sessionTokenRef.current = session?.token ?? '';
  }, [session?.token]);

  useEffect(() => {
    phoneValueRef.current = phone;
  }, [phone]);

  useEffect(() => {
    otpMetaRef.current = otpMeta;
  }, [otpMeta]);

  useEffect(() => {
    placeQueryRef.current = placeQuery;
  }, [placeQuery]);

  useEffect(() => {
    selectedPlaceIdRef.current = selectedPlace?.id ?? null;
  }, [selectedPlace?.id]);

  useEffect(() => {
    if (walkInvitePickingPlace && route !== 'map' && route !== 'placeDetail') setWalkInvitePickingPlace(false);
  }, [route, walkInvitePickingPlace]);

  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);

  useEffect(() => {
    userSettingsRef.current = userSettings;
  }, [userSettings]);

  useEffect(() => {
    mediaIdRef.current = media?.mediaId ?? null;
  }, [media?.mediaId]);

  useEffect(() => {
    avatarJobIdRef.current = avatarJob?.id ?? null;
  }, [avatarJob?.id]);

  useEffect(() => {
    ownersRef.current = owners;
  }, [owners]);

  useEffect(() => {
    greetingRequestOwnersRef.current = greetingRequestOwners;
  }, [greetingRequestOwners]);

  useEffect(() => {
    selectedOwnerIdRef.current = selectedOwner?.id ?? null;
  }, [selectedOwner?.id]);

  useEffect(() => {
    setBootPetAvatarUri(activePet?.avatarUrl ?? null);
    setSession((current) => {
      if (!current?.account || arePetSnapshotsEqual(current.account.activePet, activePet)) return current;
      const nextSession = {
        ...current,
        account: {
          ...current.account,
          activePet,
        },
      };
      void savePersistedLumiiSession(nextSession);
      return nextSession;
    });
  }, [activePet]);

  useEffect(() => {
    activePetIdRef.current = activePet?.id ?? null;
  }, [activePet?.id]);

  useEffect(() => {
    if (!activePet) return;
    setPets((items) => {
      const withoutActive = items.filter((item) => item.id !== activePet.id);
      return [activePet, ...withoutActive];
    });
  }, [activePet]);

  useEffect(() => {
    const previousRoute = previousRouteRef.current;
    routeRef.current = route;
    if (previousRoute !== route) exitBackPressedAtRef.current = 0;
    if (route === 'home' && previousRoute !== 'home') {
      setHomeHintIndex((index) => (index + 1) % homeChatPrompts.length);
    }
    previousRouteRef.current = route;
  }, [route]);

  useEffect(() => {
    if (!session || route !== 'home' || isHomePreviewMode) return;
    void loadNearbyMoments({ silent: true });
  }, [isHomePreviewMode, route, session, userSettings.nearbyVisible]);

  useEffect(() => {
    if (route !== 'home' || nearbyMoments.length <= 1) return undefined;
    const id = setInterval(() => {
      setHomeMomentIndex((index) => index + 1);
    }, 5200);
    return () => clearInterval(id);
  }, [nearbyMoments.length, route]);

  useEffect(() => {
    if (route !== 'editPet') return;
    const pet = getCurrentPet();
    if (!pet) {
      replace('petInfo');
      showToast('请先添加宠物档案');
      return;
    }
    setPetDraft(draftFromPet(pet));
  }, [activePet?.id, route, replace, showToast]);

  useEffect(() => {
    if (route !== 'ownerEdit') return;
    const ownerName = formatOwnerName(session?.phone, getCurrentPet(), session?.account?.ownerName);
    setOwnerNameDraft(ownerName);
    setOwnerBioDraft(session?.account?.ownerBio ?? '');
    setOwnerAvatarDraft(session?.account?.ownerAvatarUrl ?? '');
    setOwnerAvatarUploadDraft(null);
    setOwnerProfileSaveError('');
    setOwnerProfileSaved(false);
  }, [activePet?.id, route, session?.phone]);

  useEffect(() => {
    if (route !== 'memoEdit') return;
    if (!selectedMemo) {
      replace('healthCalendar');
      showToast('请选择要编辑的备忘');
      return;
    }
    setMemoEditTitle(selectedMemo.title);
    setMemoEditContent(selectedMemo.content);
    const repeat = normalizeMemoRepeat(selectedMemo.repeat);
    const enabled = selectedMemo.reminderEnabled ?? Boolean(selectedMemo.reminderAt);
    setMemoEditRepeat(repeat);
    setMemoEditReminderEnabled(enabled);
    setMemoEditReminderAt(parseMemoReminderDate(selectedMemo.reminderAt, repeat));
  }, [replace, route, selectedMemo, showToast]);

  useEffect(() => {
    if (route === 'memoNew') {
      setMemoDraftRepeat('quarterly');
      setMemoDraftReminderAt(defaultMemoReminderDate());
      setMemoDraftReminderEnabled(true);
    }
  }, [route]);

  useEffect(() => {
    if (route === 'petInfo') setPetDraft(emptyPetDraft);
  }, [route]);

  useEffect(() => {
    if (!session || getCurrentPet() || !petRequiredRoutes.has(route)) return;
    replace('emptyPet');
  }, [activePet, replace, route, session]);

  useEffect(() => {
    if (!session || route !== 'permissions') return;
    if (allLumiiPermissionsGranted(permissions)) return;
    void refreshPermissionStatuses({ persist: true });
  }, [route, session]);

  useEffect(() => {
    if (Platform.OS === 'web' || !session) return undefined;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (route !== 'permissions' && !systemSettingsOpenedAtRef.current) return;
      const settingsOpenedAt = systemSettingsOpenedAtRef.current;
      if (settingsOpenedAt && Date.now() - settingsOpenedAt < 500) return;
      if (settingsOpenedAt) systemSettingsOpenedAtRef.current = 0;
      void refreshPermissionStatuses({ persist: true });
    });
    return () => subscription.remove();
  }, [route, session]);

  useEffect(() => {
    if (!session || route !== 'discover') return undefined;
    if (!userSettings.nearbyVisible) {
      applyNearbyOwners([]);
      return undefined;
    }
    let active = true;
    const refreshOwners = async () => {
      if (discoverRefreshingRef.current) return;
      const nextOwners = await fetchNearbyOwners({ forceLocation: !lastDiscoverLocationRef.current, silent: true });
      if (active && nextOwners) {
        applyNearbyOwners(nextOwners);
        setDiscoverLocationError('');
        setDiscoverLastRefreshedAt(Date.now());
      }
    };
    void refreshOwners();
    return () => {
      active = false;
    };
  }, [route, session, userSettings.nearbyVisible]);

  useEffect(() => {
    if (!session || route !== 'map' || mapAutoLocateAttemptedRef.current) return;
    mapAutoLocateAttemptedRef.current = true;
    void locateMapToCurrentPosition({ silent: true });
  }, [route, session]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id ?? null;
  }, [selectedConversation?.id]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    const selectedId = selectedConversationIdRef.current;
    if (!selectedId) return;
    const syncedConversation = conversations.find((conversation) => conversation.id === selectedId);
    if (syncedConversation) {
      setSelectedConversation(syncedConversation);
      return;
    }
    if (route === 'conversation') {
      setSelectedConversation(null);
      setConversationMessages([createConversationSafetyMessage()]);
    }
  }, [conversations, route]);

  useEffect(() => {
    if (!selectedPlace?.id) return;
    const syncedPlace = places.find((place) => place.id === selectedPlace.id);
    if (syncedPlace) {
      setSelectedPlace(syncedPlace);
      return;
    }
    if (route === 'placeDetail') setSelectedPlace(null);
  }, [places, route, selectedPlace?.id]);

  useEffect(() => {
    if (!session || !focusedInboxRoutes.has(route)) return;
    void loadInboxData();
  }, [route, session]);

  useEffect(() => {
    if (!session || !focusedInboxRoutes.has(route)) return undefined;
    const id = setInterval(() => {
      void loadInboxData();
    }, 6000);
    return () => clearInterval(id);
  }, [route, session]);

  useEffect(() => {
    if (!session || !passiveInboxRoutes.has(route)) return undefined;
    const id = setInterval(() => {
      void loadInboxData();
    }, 15000);
    return () => clearInterval(id);
  }, [route, session]);

  useEffect(() => {
    if (!session || route !== 'conversation' || !selectedConversation?.id) return undefined;
    const id = setInterval(() => {
      void loadConversationMessages(selectedConversation.id, { markRead: true, silent: true });
      void loadInboxData();
    }, 5000);
    return () => clearInterval(id);
  }, [route, selectedConversation?.id, session]);

  useEffect(() => {
    if (!session) return undefined;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (focusedInboxRoutes.has(route) || passiveInboxRoutes.has(route) || route === 'conversation') void loadInboxData();
      if (route === 'conversation' && selectedConversationIdRef.current) {
        void loadConversationMessages(selectedConversationIdRef.current, { markRead: true, silent: true });
      }
      if (route === 'discover' && userSettingsRef.current.nearbyVisible && !discoverRefreshingRef.current) {
        void fetchNearbyOwners({ forceLocation: false, silent: true }).then((nextOwners) => {
          if (!nextOwners) return;
          applyNearbyOwners(nextOwners);
          setDiscoverLocationError('');
          setDiscoverLastRefreshedAt(Date.now());
        });
      }
      if (route === 'map' && !locatingMapRef.current && !lastDiscoverLocationRef.current) {
        void locateMapToCurrentPosition({ silent: true });
      }
    });
    return () => subscription.remove();
  }, [route, session]);

  useEffect(() => {
    if (!session || route !== 'chat') return;
    void loadPetChatMessages();
    void loadAiUsage();
  }, [route, session, activePet?.id]);

  useEffect(() => {
    if (!session || route !== 'healthCalendar') return;
    void loadHealthCalendar({ silent: true });
  }, [activePet?.id, route, session]);

  useEffect(() => {
    if (!session || (route !== 'upload' && route !== 'uploadDetail' && route !== 'aiResult')) return;
    void loadAiUsage();
  }, [route, session]);

  useEffect(() => {
    if (!session || !urgentVaccines.length) return;
    const enabledUrgentVaccines = urgentVaccines.filter((vaccine) => vaccineReminderIds.includes(vaccine.id));
    if (!enabledUrgentVaccines.length) return;
    const shouldRefresh = enabledUrgentVaccines.some((vaccine) => !healthReminderNotifiedRef.current.has(vaccine.id));
    enabledUrgentVaccines.forEach((vaccine) => healthReminderNotifiedRef.current.add(vaccine.id));
    if (shouldRefresh) void loadInboxData();
  }, [session, urgentVaccines, vaccineReminderIds]);

  useEffect(() => {
    if (!session) return;
    const enabledVaccines = vaccines.filter((vaccine) => vaccineReminderIds.includes(vaccine.id) && vaccine.status !== 'done');
    const enabledIds = enabledVaccines.map((vaccine) => vaccine.id).sort();
    const canSchedule = permissions.notifications === 'granted' && userSettings.pushNotifications;

    if (!canSchedule || !enabledIds.length) {
      const scheduledIds = localHealthReminderScheduledIdsRef.current;
      if (scheduledIds.length) void cancelVaccineLocalReminders(scheduledIds);
      localHealthReminderScheduledIdsRef.current = [];
      localHealthReminderSyncKeyRef.current = '';
      return;
    }

    const syncKey = [
      activePet?.id ?? 'no-pet',
      activePet?.name ?? '',
      ...enabledVaccines.map((vaccine) => `${vaccine.id}:${vaccine.dueAt}:${vaccine.status}`).sort(),
    ].join('|');
    if (localHealthReminderSyncKeyRef.current === syncKey) return;

    const removedIds = localHealthReminderScheduledIdsRef.current.filter((id) => !enabledIds.includes(id));
    if (removedIds.length) void cancelVaccineLocalReminders(removedIds);
    localHealthReminderSyncKeyRef.current = syncKey;
    localHealthReminderScheduledIdsRef.current = enabledIds;
    void syncVaccineLocalReminders(enabledVaccines, enabledIds, activePet?.name);
  }, [activePet?.id, activePet?.name, permissions.notifications, session, userSettings.pushNotifications, vaccineReminderIds, vaccines]);

  useEffect(() => {
    if (route !== 'generating' || !avatarJob || avatarJob.status !== 'processing') return undefined;
    const id = setInterval(() => {
      void pollAvatarJob();
    }, 3000);
    return () => clearInterval(id);
  }, [avatarJob, route]);

  async function loadCommonData(targetSessionToken = sessionTokenRef.current) {
    const requestSessionToken = targetSessionToken;
    if (!requestSessionToken) return;
    const [profileResult, petListResult, healthSummaryResult, healthCalendarResult, weightResult, vaccineResult, vaccineReminderResult, memoResult, ownerResult, momentResult, greetingRequestResult, conversationResult, notificationResult, placeResult, favoritePlaceResult, placeReviewResult, aiUsageResult] = await Promise.all([
      lumiiApi.account.getMe(),
      lumiiApi.pets.listPets(),
      lumiiApi.health.getHealthSummary(),
      lumiiApi.health.listHealthCalendar(),
      lumiiApi.health.listWeightRecords(),
      lumiiApi.health.listVaccines(),
      lumiiApi.health.listVaccineReminderIds(),
      lumiiApi.health.listHealthMemos(),
      lumiiApi.social.listNearbyOwners(),
      lumiiApi.social.listNearbyMoments(),
      lumiiApi.social.listGreetingRequests(),
      lumiiApi.messages.listConversations(),
      lumiiApi.messages.listNotifications(),
      lumiiApi.places.listNearbyPlaces(),
      lumiiApi.places.listFavoritePlaceIds(),
      lumiiApi.places.listMyReviews(),
      lumiiApi.ai.getUsage(),
    ]);
    if (sessionTokenRef.current !== requestSessionToken) return;
    let loadedSettings = userSettingsRef.current;
    if (profileResult.data) {
      const profile = profileResult.data;
      const profileSettings = { ...defaultUserSettings, ...profile.settings };
      loadedSettings = profileSettings;
      setSession((current) => (current ? { ...current, account: profile, phone: profile.phone } : current));
      userSettingsRef.current = profileSettings;
      setUserSettings(profileSettings);
      const profilePet = profile.activePet ?? getActivePetFallback();
      activePetIdRef.current = profilePet?.id ?? null;
      setActivePet(profilePet);
    }
    if (petListResult.data) {
      setPets(petListResult.data);
      if (!profileResult.data?.activePet && petListResult.data[0]) {
        activePetIdRef.current = petListResult.data[0].id;
        setActivePet(petListResult.data[0]);
      }
    }
    if (healthSummaryResult.data) {
      setHealthSummary(healthSummaryResult.data);
      setVaccineReminderIds(healthSummaryResult.data.vaccineReminderIds);
      setActivePet((pet) =>
        pet
          ? {
              ...pet,
              healthScore: healthSummaryResult.data!.healthScore,
              weightKg: healthSummaryResult.data!.latestWeightKg ?? pet.weightKg,
            }
          : pet,
      );
    }
    if (healthCalendarResult.data) {
      setHealthCalendarEvents(healthCalendarResult.data);
      setHealthCalendarError('');
    }
    if (weightResult.data) setWeights(weightResult.data);
    if (vaccineResult.data) setVaccines(vaccineResult.data);
    if (vaccineReminderResult.data) setVaccineReminderIds(vaccineReminderResult.data);
    if (memoResult.data) setMemos(memoResult.data);
    if (ownerResult.data) {
      if (loadedSettings.nearbyVisible) {
        applyNearbyOwners(ownerResult.data);
      } else {
        discoverRequestSeqRef.current += 1;
        lastDiscoverLocationRef.current = null;
        applyNearbyOwners([]);
      }
    }
    if (momentResult.data) {
      setNearbyMoments(momentResult.data);
      setNearbyMomentsError('');
    } else if (momentResult.error) {
      setNearbyMomentsError(momentResult.error.message);
    }
    if (greetingRequestResult.data) {
      applyGreetingRequestOwners(greetingRequestResult.data);
    }
    if (conversationResult.data) setConversations(conversationResult.data);
    if (notificationResult.data) applyNotifications(notificationResult.data);
    if (placeResult.data) setPlaces(placeResult.data);
    if (favoritePlaceResult.data) setFavoritePlaceIds(favoritePlaceResult.data);
    if (placeReviewResult.data) setPlaceReviewsByPlaceId(indexPlaceReviewsByPlaceId(placeReviewResult.data));
    if (aiUsageResult.data) {
      setAiUsage(aiUsageResult.data);
      setPetChatDailyCount(aiUsageResult.data.daily.petChat.count);
    }
    setActivePet((pet) => pet ?? getActivePetFallback());
  }

  async function loadAiUsage(options: { silent?: boolean } = { silent: true }) {
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return null;
    const result = await lumiiApi.ai.getUsage();
    if (sessionTokenRef.current !== requestSessionToken) return null;
    if (result.data) {
      setAiUsage(result.data);
      setPetChatDailyCount(result.data.daily.petChat.count);
      return result.data;
    }
    if (options.silent === false) showToast(result.error?.message ?? 'AI 用量读取失败');
    return null;
  }

  async function ensurePetAvatarQuota() {
    const latestUsage = await loadAiUsage();
    const usage = latestUsage?.daily.petAvatar ?? aiUsage?.daily.petAvatar;
    if (!usage) return true;
    if (usage.remaining <= 0) {
      showToast(`今日形象生成次数已用完（${usage.count}/${usage.limit}），明天再试`);
      return false;
    }
    return true;
  }

  async function refreshHealthSummary() {
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) return null;
    const result = await lumiiApi.health.getHealthSummary();
    if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return null;
    if (!result.data) return null;
    setHealthSummary(result.data);
    setVaccineReminderIds(result.data.vaccineReminderIds);
    setActivePet((pet) =>
      pet
        ? {
            ...pet,
            healthScore: result.data!.healthScore,
            weightKg: result.data!.latestWeightKg ?? pet.weightKg,
          }
        : pet,
    );
    return result.data;
  }

  async function loadHealthCalendar(options: { refreshing?: boolean; silent?: boolean } = {}) {
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId || healthCalendarLoadingRef.current) return null;
    healthCalendarLoadingRef.current = true;
    if (options.refreshing) {
      setHealthCalendarRefreshing(true);
    } else {
      setHealthCalendarLoading(true);
    }
    try {
      const result = await lumiiApi.health.listHealthCalendar();
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return null;
      if (result.data) {
        setHealthCalendarEvents(result.data);
        setHealthCalendarError('');
        return result.data;
      }
      const message = result.error?.message ?? '健康日历读取失败';
      setHealthCalendarError(message);
      if (!options.silent) showToast(message, { tone: 'error', variant: 'surface' });
      return null;
    } finally {
      if (isCurrentPetRequest(requestSessionToken, requestPetId)) {
        setHealthCalendarLoading(false);
        setHealthCalendarRefreshing(false);
      }
      healthCalendarLoadingRef.current = false;
    }
  }

  function resetPetScopedRuntimeState(nextPet?: PetProfile | null) {
    if (localHealthReminderScheduledIdsRef.current.length) void cancelVaccineLocalReminders(localHealthReminderScheduledIdsRef.current);
    resetAvatarDraft();
    setChatMessages([createPetChatWelcomeMessage(nextPet)]);
    setChatInput('');
    setChatFeedbackById({});
    chatFeedbackSavingIdsRef.current.clear();
    setChatFeedbackSavingIds([]);
    chatReplyingRef.current = false;
    setChatReplying(false);
    setAiUsage(null);
    setPetChatDailyCount(0);
    setHealthSummary(null);
    setHealthCalendarEvents([]);
    setHealthCalendarError('');
    healthCalendarLoadingRef.current = false;
    setHealthCalendarLoading(false);
    setHealthCalendarRefreshing(false);
    setHealthCalendarMonth(monthStartIso());
    setSelectedHealthCalendarDate(todayIsoDate());
    setWeights([]);
    setWeightEditorMode(null);
    setWeightEditRecord(null);
    setWeightDraftRecordedAt(new Date());
    setWeightEditValue('');
    setWeightEditNote('');
    weightEditSavingRef.current = false;
    setWeightEditSaving(false);
    weightSavingRef.current = false;
    setWeightSaving(false);
    setWeightDeleteConfirm(null);
    setVaccines([]);
    setVaccineReminderIds([]);
    setMemos([]);
    setMemoTitle('');
    setMemoContent('');
    memoSavingRef.current = false;
    setMemoSaving(false);
    setSelectedMemo(null);
    setMemoEditTitle('');
    setMemoEditContent('');
    setMemoEditRepeat('none');
    setMemoEditReminderAt(defaultMemoReminderDate());
    setMemoEditReminderEnabled(false);
    memoEditSavingRef.current = false;
    setMemoEditSaving(false);
    memoDeletingRef.current = false;
    setMemoDeleting(false);
    setMemoDeleteConfirmVisible(false);
    setMemoDraftTitle('');
    setMemoDraftContent('');
    setMemoDraftRepeat('quarterly');
    setMemoDraftReminderAt(defaultMemoReminderDate());
    setMemoDraftReminderEnabled(true);
    memoDraftSavingRef.current = false;
    setMemoDraftSaving(false);
    vaccineReminderSavingIdsRef.current.clear();
    setVaccineReminderSavingIds([]);
    vaccineDoneSavingIdsRef.current.clear();
    setVaccineDoneSavingIds([]);
    setVaccineComposerVisible(false);
    setVaccineNameDraft('');
    setVaccineDueDraft('');
    vaccineCreatingRef.current = false;
    setVaccineCreating(false);
    setDailyPostText('');
    setDailyPostPhotoUris([]);
    dailyPhotoPickingRef.current = false;
    setDailyPhotoPicking(false);
    setDailyMood('开心');
    dailyPostSavingRef.current = false;
    setDailyPostSaving(false);
    healthReminderNotifiedRef.current.clear();
    localHealthReminderScheduledIdsRef.current = [];
    localHealthReminderSyncKeyRef.current = '';
  }

  async function refreshPetScopedData(options: { pet?: PetProfile | null; reset?: boolean; silent?: boolean } = {}) {
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) return false;
    if (options.reset) resetPetScopedRuntimeState(options.pet ?? getCurrentPet());
    const [healthSummaryResult, healthCalendarResult, weightResult, vaccineResult, vaccineReminderResult, memoResult, aiUsageResult, petChatResult] = await Promise.all([
      lumiiApi.health.getHealthSummary(),
      lumiiApi.health.listHealthCalendar(),
      lumiiApi.health.listWeightRecords(),
      lumiiApi.health.listVaccines(),
      lumiiApi.health.listVaccineReminderIds(),
      lumiiApi.health.listHealthMemos(),
      lumiiApi.ai.getUsage(),
      lumiiApi.messages.listPetChatMessages(),
    ]);
    if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return false;

    let refreshed = true;
    if (healthSummaryResult.data) {
      setHealthSummary(healthSummaryResult.data);
      setVaccineReminderIds(healthSummaryResult.data.vaccineReminderIds);
      setActivePet((pet) =>
        pet
          ? {
              ...pet,
              healthScore: healthSummaryResult.data!.healthScore,
              weightKg: healthSummaryResult.data!.latestWeightKg ?? pet.weightKg,
            }
          : pet,
      );
    }
    if (healthCalendarResult.data) {
      setHealthCalendarEvents(healthCalendarResult.data);
      setHealthCalendarError('');
    }
    if (weightResult.data) setWeights(weightResult.data);
    if (vaccineResult.data) setVaccines(vaccineResult.data);
    if (vaccineReminderResult.data) setVaccineReminderIds(vaccineReminderResult.data);
    if (memoResult.data) setMemos(memoResult.data);
    if (aiUsageResult.data) {
      setAiUsage(aiUsageResult.data);
      setPetChatDailyCount(aiUsageResult.data.daily.petChat.count);
    }
    if (petChatResult.data) {
      const currentPet = getCurrentPet();
      setChatMessages(petChatResult.data.length ? petChatResult.data : [createPetChatWelcomeMessage(currentPet)]);
      setChatFeedbackById(
        Object.fromEntries(
          petChatResult.data
            .filter((message) => message.author === 'ai' && message.feedback)
            .map((message) => [message.id, message.feedback!]),
        ),
      );
      if (!aiUsageResult.data) setPetChatDailyCount(petChatResult.data.filter((message) => message.author === 'me').length);
    }
    const errorMessage =
      healthSummaryResult.error?.message ??
      healthCalendarResult.error?.message ??
      weightResult.error?.message ??
      vaccineResult.error?.message ??
      vaccineReminderResult.error?.message ??
      memoResult.error?.message ??
      aiUsageResult.error?.message ??
      petChatResult.error?.message;
    if (errorMessage) {
      refreshed = false;
      if (options.silent === false) showToast(errorMessage, { tone: 'error', variant: 'surface' });
    }
    return refreshed;
  }

  async function refreshPets() {
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    const result = await lumiiApi.pets.listPets();
    if (sessionTokenRef.current !== requestSessionToken) return;
    if (result.data) setPets(result.data);
  }

  async function switchActivePet(pet: PetProfile) {
    if (pet.id === activePetIdRef.current) {
      showToast(`${pet.name}已经是当前灵伴`);
      return;
    }
    if (petSwitchingIdRef.current) return;
    const requestSessionToken = sessionTokenRef.current;
    petSwitchingIdRef.current = pet.id;
    setPetSwitchingId(pet.id);
    try {
      const result = await lumiiApi.pets.setActivePet(pet.id);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        activePetIdRef.current = result.data.id;
        setActivePet(result.data);
        setPets((items) => [result.data!, ...items.filter((item) => item.id !== result.data!.id)]);
        setSession((current) =>
          current?.account
            ? {
                ...current,
                account: {
                  ...current.account,
                  activePet: result.data!,
                },
              }
            : current,
        );
        const refreshed = await refreshPetScopedData({ pet: result.data, reset: true, silent: true });
        showToast(refreshed ? `已切换为${result.data.name}，首页内容已更新` : `已切换为${result.data.name}，部分数据稍后刷新`, {
          tone: refreshed ? 'success' : 'warning',
          variant: 'surface',
        });
      } else {
        showToast(result.error?.message ?? '切换宠物失败', { tone: 'error', variant: 'surface' });
      }
    } finally {
      petSwitchingIdRef.current = '';
      setPetSwitchingId('');
    }
  }

  async function deletePet(pet: PetProfile) {
    if (petDeletingIdRef.current) return;
    const requestSessionToken = sessionTokenRef.current;
    petDeletingIdRef.current = pet.id;
    setPetDeletingId(pet.id);
    try {
      const result = await lumiiApi.pets.deletePet(pet.id);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        setPetDeleteConfirm(null);
        const nextPet = result.data[0] ?? null;
        setPets(result.data);
        activePetIdRef.current = nextPet?.id ?? null;
        setActivePet(nextPet);
        setSession((current) =>
          current?.account
            ? {
                ...current,
                account: {
                  ...current.account,
                  activePet: nextPet,
                },
              }
            : current,
        );
        if (nextPet) {
          const refreshed = await refreshPetScopedData({ pet: nextPet, reset: true, silent: true });
          showToast(refreshed ? `已移除${pet.name}` : `已移除${pet.name}，部分数据稍后刷新`, { tone: refreshed ? 'success' : 'warning', variant: 'surface' });
        } else {
          resetPetScopedRuntimeState(null);
          setHistory([]);
          replace('emptyPet');
          showToast('宠物档案已移除', { tone: 'success', variant: 'surface' });
        }
      } else {
        showToast(result.error?.message ?? '删除宠物失败', { tone: 'error', variant: 'surface' });
      }
    } finally {
      petDeletingIdRef.current = '';
      setPetDeletingId('');
    }
  }

  function confirmDeletePet(pet: PetProfile) {
    setPetDeleteConfirm(pet);
  }

  async function loadInboxData(options: { silent?: boolean } = { silent: true }) {
    if (inboxRefreshInFlightRef.current) {
      inboxRefreshQueuedRef.current = true;
      if (options.silent === false) showToast('消息正在刷新');
      return false;
    }

    let refreshed = true;
    const silent = options.silent !== false;
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return false;
    inboxRefreshInFlightRef.current = true;
    try {
      const [greetingRequestResult, conversationResult, notificationResult] = await Promise.all([
        lumiiApi.social.listGreetingRequests(),
        lumiiApi.messages.listConversations(),
        lumiiApi.messages.listNotifications(),
      ]);
      if (sessionTokenRef.current !== requestSessionToken) return false;
      if (greetingRequestResult.data) {
        applyGreetingRequestOwners(greetingRequestResult.data);
      }
      if (conversationResult.data) setConversations(conversationResult.data);
      if (notificationResult.data) applyNotifications(notificationResult.data);
      const errorMessage = greetingRequestResult.error?.message ?? conversationResult.error?.message ?? notificationResult.error?.message;
      if (errorMessage) {
        refreshed = false;
        if (!silent) showToast(errorMessage || '消息刷新失败，请稍后重试');
      } else if (!silent) {
        showToast('消息已刷新');
      }
    } finally {
      inboxRefreshInFlightRef.current = false;
      if (inboxRefreshQueuedRef.current) {
        inboxRefreshQueuedRef.current = false;
        void loadInboxData({ silent: true });
      }
    }
    return refreshed;
  }

  function applyNearbyOwners(nextOwners: NearbyOwner[]) {
    if (!userSettingsRef.current.nearbyVisible) {
      ownersRef.current = [];
      setOwners([]);
      setDiscoverLocationError('');
      selectedOwnerIdRef.current = null;
      setSelectedOwner(null);
      return;
    }
    ownersRef.current = nextOwners;
    setOwners(nextOwners);
    setSelectedOwner((current) => {
      const nextSelectedOwner = nextOwners.find((owner) => owner.id === current?.id) ?? null;
      selectedOwnerIdRef.current = nextSelectedOwner?.id ?? null;
      return nextSelectedOwner;
    });
  }

  function applyGreetingRequestOwners(nextOwners: NearbyOwner[]) {
    const now = Date.now();
    const activeIds = new Set(nextOwners.map((owner) => owner.id));
    const nextSeenAt: Record<string, number> = {};
    nextOwners.forEach((owner) => {
      nextSeenAt[owner.id] = greetingRequestSeenAtByIdRef.current[owner.id] ?? now;
    });
    Object.keys(greetingRequestSeenAtByIdRef.current).forEach((ownerId) => {
      if (!activeIds.has(ownerId)) delete greetingRequestSeenAtByIdRef.current[ownerId];
    });
    greetingRequestSeenAtByIdRef.current = nextSeenAt;
    setGreetingRequestSeenAtById(nextSeenAt);
    greetingRequestOwnersRef.current = nextOwners;
    setGreetingRequestOwners(nextOwners);
  }

  function applyNotifications(nextNotifications: NotificationItem[]) {
    const now = Date.now();
    const activeIds = new Set(nextNotifications.map((item) => item.id));
    const nextSeenAt: Record<string, number> = {};
    nextNotifications.forEach((item) => {
      if (!notificationDateFor(item)) {
        nextSeenAt[item.id] = notificationSeenAtByIdRef.current[item.id] ?? now;
      }
    });
    Object.keys(notificationSeenAtByIdRef.current).forEach((notificationId) => {
      if (!activeIds.has(notificationId)) delete notificationSeenAtByIdRef.current[notificationId];
    });
    notificationSeenAtByIdRef.current = nextSeenAt;
    setNotificationSeenAtById(nextSeenAt);
    setNotifications(nextNotifications);
  }

  async function refreshInboxManually() {
    if (inboxManualRefreshingRef.current) return;
    inboxManualRefreshingRef.current = true;
    setInboxManualRefreshing(true);
    try {
      await loadInboxData({ silent: false });
    } finally {
      inboxManualRefreshingRef.current = false;
      setInboxManualRefreshing(false);
    }
  }

  async function markAllNotificationsRead() {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
    if (!unreadIds.length) {
      showToast('当前没有未读通知');
      return;
    }
    const requestSessionToken = sessionTokenRef.current;
    const previousNotifications = notifications;
    setNotifications((items) => items.map((item) => (unreadIds.includes(item.id) ? { ...item, read: true } : item)));
    const result = await lumiiApi.messages.markNotificationsRead(unreadIds);
    if (sessionTokenRef.current !== requestSessionToken) return;
    if (result.data) {
      applyNotifications(result.data);
      showToast('已全部标记为已读', { tone: 'success', variant: 'surface' });
      return;
    }
    setNotifications(previousNotifications);
    showToast(result.error?.message ?? '标记已读失败，请稍后重试', { tone: 'error', variant: 'surface' });
  }

  async function markNotificationReadSilently(notificationId: string) {
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    setNotifications((items) => items.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
    const result = await lumiiApi.messages.markNotificationsRead([notificationId]);
    if (sessionTokenRef.current !== requestSessionToken) return;
    if (result.data) applyNotifications(result.data);
  }

  async function openConversationFromNotification(conversationId: string) {
    const requestSessionToken = sessionTokenRef.current;
    let conversation = conversationsRef.current.find((item) => item.id === conversationId);
    if (!conversation) {
      const result = await lumiiApi.messages.listConversations();
      if (sessionTokenRef.current !== requestSessionToken) return false;
      if (result.data) {
        conversationsRef.current = result.data;
        setConversations(result.data);
        conversation = result.data.find((item) => item.id === conversationId);
      }
    }
    if (!conversation) {
      go('messages');
      showToast('会话已更新，请在消息列表查看');
      return false;
    }
    await openConversation(conversation);
    return true;
  }

  async function openNotification(item: NotificationItem) {
    if (!item.read) void markNotificationReadSilently(item.id);
    const kind = notificationKindFor(item);
    const conversationId = conversationIdFromNotification(item);
    if (conversationId && (kind === 'conversation_message' || kind === 'greeting_accepted' || kind === 'walk_invite')) {
      await openConversationFromNotification(conversationId);
      return;
    }
    if (kind === 'conversation_message' || kind === 'greeting_accepted' || kind === 'walk_invite') {
      go('messages');
      return;
    }
    if (kind === 'greeting_request') {
      go('greetingRequests');
      return;
    }
    const category = notificationCategoryFor(item);
    if (category === 'health') go('health');
    else if (category === 'walk') go('messages');
    else if (category === 'system') go('settings');
    else go('messages');
  }

  function setConversationMessagesFromServer(conversationId: string, messages: ConversationMessage[]) {
    const cleanMessages = messages.filter((message) => message.author !== 'system');
    setConversationMessages((current) => {
      const localPending = current.filter(
        (message) =>
          message.author === 'me' &&
          (message.status === 'sending' || message.status === 'failed') &&
          localConversationMessageIdsRef.current[message.id] === conversationId &&
          !cleanMessages.some((serverMessage) => serverMessage.id === message.id),
      );
      return [createConversationSafetyMessage(), ...cleanMessages, ...localPending];
    });
  }

  async function loadConversationMessages(conversationId: string, options: { markRead?: boolean; silent?: boolean } = {}) {
    if (conversationRefreshInFlightRef.current === conversationId) return;
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    conversationRefreshInFlightRef.current = conversationId;
    try {
      const result = await lumiiApi.messages.listConversationMessages(conversationId);
      if (sessionTokenRef.current !== requestSessionToken) return;
      const isActiveConversation = !selectedConversationIdRef.current || selectedConversationIdRef.current === conversationId;
      if (result.data) {
        if (isActiveConversation) setConversationMessagesFromServer(conversationId, result.data);
        if (options.markRead) {
          void lumiiApi.messages.markConversationRead(conversationId).then((markResult) => {
            if (sessionTokenRef.current !== requestSessionToken) return;
            if (!markResult.data && !options.silent) showToast(markResult.error?.message ?? '已读状态同步失败');
          });
          setConversations((items) => items.map((item) => (item.id === conversationId ? { ...item, unread: 0 } : item)));
        }
      } else if (!options.silent && isActiveConversation) {
        showToast(result.error?.message ?? '聊天记录加载失败');
      }
    } finally {
      if (conversationRefreshInFlightRef.current === conversationId) conversationRefreshInFlightRef.current = null;
    }
  }

  async function loadPetChatMessages() {
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) return;
    const result = await lumiiApi.messages.listPetChatMessages();
    if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
    if (result.data) {
      setChatMessages(result.data.length ? result.data : [createPetChatWelcomeMessage(activePet)]);
      setChatFeedbackById(
        Object.fromEntries(
          result.data
            .filter((message) => message.author === 'ai' && message.feedback)
            .map((message) => [message.id, message.feedback!]),
        ),
      );
      setPetChatDailyCount(result.data.filter((message) => message.author === 'me').length);
    } else {
      setChatMessages((items) => (items.length ? items : [createPetChatWelcomeMessage(activePet)]));
      showToast(result.error?.message ?? '灵伴聊天记录加载失败');
    }
  }

  async function persistPermissionSnapshot(nextPermissions: PermissionStateMap, completed = false) {
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return nextPermissions;
    const result = await lumiiApi.permissions.savePermissionState(nextPermissions, Boolean(completed || allLumiiPermissionsGranted(nextPermissions)));
    if (sessionTokenRef.current !== requestSessionToken) return nextPermissions;
    if (result.data) {
      const savedPermissions = mergePermissionState(nextPermissions, result.data);
      permissionsRef.current = savedPermissions;
      setPermissions(savedPermissions);
      return savedPermissions;
    }
    permissionsRef.current = nextPermissions;
    setPermissions(nextPermissions);
    return nextPermissions;
  }

  async function registerPushDevice(options: { silent?: boolean; targetSession?: AuthSession } = {}) {
    const currentSession = options.targetSession ?? session;
    if (!currentSession || Platform.OS === 'web') return;
    const requestSessionToken = currentSession.token;
    try {
      const registration = await getLumiiPushRegistration();
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (!registration?.token || registeredPushTokenRef.current === registration.token) return;
      const result = await lumiiApi.messages.registerPushToken(registration.token, registration.platform, registration.deviceId);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        registeredPushTokenRef.current = result.data.token;
      } else if (!options.silent) {
        showToast(result.error?.message ?? '通知设备登记失败');
      }
    } catch {
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (!options.silent) showToast('通知设备登记失败，不影响继续使用');
    }
  }

  function clearScheduledPushRegistration() {
    if (!scheduledPushRegistrationRef.current) return;
    clearTimeout(scheduledPushRegistrationRef.current);
    scheduledPushRegistrationRef.current = null;
  }

  function schedulePushDeviceRegistration(options: { delayMs?: number; targetSession?: AuthSession } = {}) {
    const targetSession = options.targetSession ?? session;
    if (!targetSession || Platform.OS === 'web') return;
    if (permissionsRef.current.notifications !== 'granted' || !userSettingsRef.current.pushNotifications) return;
    clearScheduledPushRegistration();
    scheduledPushRegistrationRef.current = setTimeout(() => {
      scheduledPushRegistrationRef.current = null;
      if (sessionTokenRef.current !== targetSession.token) return;
      if (permissionsRef.current.notifications !== 'granted' || !userSettingsRef.current.pushNotifications) return;
      void registerPushDevice({ silent: true, targetSession });
    }, options.delayMs ?? 1500);
  }

  async function refreshPermissionStatuses(options: { base?: PermissionStateMap; completed?: boolean; persist?: boolean } = {}) {
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return mergePermissionState(options.base ?? permissionsRef.current);
    let nextPermissions = mergePermissionState(options.base ?? permissionsRef.current);

    if (Platform.OS !== 'web') {
      const statusResults = await Promise.all(permissionKeys.map((key) => getLumiiPermissionStatus(key)));
      if (sessionTokenRef.current !== requestSessionToken) return mergePermissionState(options.base ?? permissionsRef.current);
      const nativeStatusPatch = Object.fromEntries(statusResults.map((result) => [result.permission, result.status])) as Partial<PermissionStateMap>;
      nextPermissions = mergeNativePermissionStatus(nextPermissions, nativeStatusPatch);
    }

    permissionsRef.current = nextPermissions;
    setPermissions(nextPermissions);

    if (options.persist) {
      nextPermissions = await persistPermissionSnapshot(nextPermissions, Boolean(options.completed));
    }

    return nextPermissions;
  }

  async function restoreAfterLogin(nextSession: AuthSession, options: { persist?: boolean; silent?: boolean } = {}) {
    const requestSessionToken = nextSession.token;
    setLumiiAuthToken(nextSession.token);
    sessionTokenRef.current = nextSession.token;
    setBootPetAvatarUri(nextSession.account?.activePet?.avatarUrl ?? null);
    setSession(nextSession);
    setHistory([]);

    const account = nextSession.account;
    const accountPermissions = mergePermissionState(account?.permissions);
    permissionsRef.current = accountPermissions;
    setPermissions(accountPermissions);
    const accountSettings = { ...defaultUserSettings, ...(account?.settings ?? {}) };
    userSettingsRef.current = accountSettings;
    setUserSettings(accountSettings);

    const [petResult, latestPermissions] = await Promise.all([
      lumiiApi.pets.listPets(),
      refreshPermissionStatuses({
        base: accountPermissions,
        completed: Boolean(account?.permissionsOnboardingCompleted),
        persist: true,
      }),
    ]);

    if (sessionTokenRef.current !== requestSessionToken) return false;

    if (petResult.error?.statusCode === 401) {
      await clearPersistedLumiiSession();
      clearLocalAccountState();
      if (!options.silent) showToast('登录已失效，请重新登录');
      return false;
    }

    const restoredPet = account?.activePet ?? petResult.data?.[0] ?? getActivePetFallback();
    setBootPetAvatarUri(restoredPet?.avatarUrl ?? null);
    const permissionFlowDone = Boolean(account?.permissionsOnboardingCompleted || allLumiiPermissionsGranted(latestPermissions));
    const restoredSession: AuthSession = account
      ? {
          ...nextSession,
          account: {
            ...account,
            activePet: restoredPet ?? null,
            permissions: latestPermissions,
            permissionsOnboardingCompleted: permissionFlowDone,
            settings: accountSettings,
          },
        }
      : nextSession;

    setSession(restoredSession);
    if (options.persist !== false) {
      await savePersistedLumiiSession(restoredSession);
    }
    if (sessionTokenRef.current !== requestSessionToken) return false;

    activePetIdRef.current = restoredPet?.id ?? null;
    setActivePet(restoredPet ?? null);
    permissionsRef.current = latestPermissions;
    if (latestPermissions.notifications === 'granted') {
      schedulePushDeviceRegistration({ delayMs: 2500, targetSession: restoredSession });
    }

    replace(restoredPet ? 'home' : permissionFlowDone ? 'emptyPet' : 'permissions');
    if (!options.silent) showToast('登录成功');
    return true;
  }

  async function requestSmsCode(source: 'login' | 'otp') {
    if (sendLoadingRef.current) return;
    const requestPhone = phone.trim();
    if (!/^1[3-9]\d{9}$/.test(requestPhone)) {
      setAgreementAttention(false);
      setLoginInlineError('手机号格式有误，请输入 11 位中国大陆手机号');
      phoneInputRef.current?.focus();
      return;
    }
    setLoginInlineError('');
    if (!agreementAccepted) {
      setAgreementAttention(true);
      showToast('请先勾选并同意用户协议');
      return;
    }
    setAgreementAttention(false);
    if (cooldownRemaining > 0) {
      showToast(`${cooldownRemaining}s 后可重新发送`);
      return;
    }
    sendLoadingRef.current = true;
    setSendLoading(true);
    try {
      const result = await lumiiApi.auth.sendSmsCode(requestPhone);
      if (phoneValueRef.current.trim() !== requestPhone) return;
      if (result.state === 'success' && result.data) {
        otpMetaRef.current = result.data;
        setOtpMeta(result.data);
        setCooldownUntil(clampSmsCooldown(result.data.availableAt));
        setOtpCode('');
        setOtpInlineError('');
        showToast('验证码已发送');
        if (source === 'login') go('otp');
      } else {
        const cooldownData = result.data as { availableAt?: number } | undefined;
        if (cooldownData?.availableAt) setCooldownUntil(clampSmsCooldown(cooldownData.availableAt));
        showToast(result.error?.message ?? '验证码发送失败');
      }
    } finally {
      sendLoadingRef.current = false;
      setSendLoading(false);
    }
  }

  async function verifySmsCode(codeOverride?: string) {
    if (verifyLoadingRef.current) return;
    const ticket = otpMetaRef.current;
    if (!ticket) {
      showToast('请先获取验证码');
      return;
    }
    const code = (codeOverride ?? otpCode).replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setOtpInlineError('请输入 6 位验证码');
      return;
    }
    verifyLoadingRef.current = true;
    setVerifyLoading(true);
    setOtpInlineError('');
    try {
      const result = await lumiiApi.auth.verifySmsCode(ticket.phone, code, ticket.expiresAt);
      const currentTicket = otpMetaRef.current;
      if (!currentTicket || currentTicket.phone !== ticket.phone || currentTicket.expiresAt !== ticket.expiresAt) return;
      if (result.data) {
        setBootPetAvatarUri(result.data.account?.activePet?.avatarUrl ?? null);
        setLoginSuccessLoading(true);
        await restoreAfterLogin(result.data);
      } else {
        const message = result.error?.message ?? '验证码校验失败';
        setOtpInlineError(message);
        showToast(message);
      }
    } finally {
      verifyLoadingRef.current = false;
      setVerifyLoading(false);
      setLoginSuccessLoading(false);
    }
  }

  function handleOtpCodeChange(value: string) {
    const next = value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(next);
    if (otpInlineError) setOtpInlineError('');
    if (next.length === 6 && !verifyLoadingRef.current) void verifySmsCode(next);
  }

  async function requestPermission(key: keyof PermissionStateMap) {
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    const currentPermissions = permissionsRef.current;
    if (currentPermissions[key] === 'requesting' || currentPermissions[key] === 'granted') return;
    setPermissions((items) => ({ ...items, [key]: 'requesting' }));
    const result = await requestLumiiPermission(key);
    if (sessionTokenRef.current !== requestSessionToken) return;
    const nextPermissions = mergePermissionState(permissionsRef.current, { [key]: result.status });
    permissionsRef.current = nextPermissions;
    setPermissions(nextPermissions);
    void persistPermissionSnapshot(nextPermissions);
    if (key === 'notifications' && result.status === 'granted') {
      schedulePushDeviceRegistration();
    }
    showToast(result.message);
  }

  async function requestAllPermissions() {
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    let grantedAfterRequest = 0;
    let nextPermissions = mergePermissionState(permissionsRef.current);
    for (const key of permissionKeys) {
      if (nextPermissions[key] === 'granted') {
        grantedAfterRequest += 1;
        continue;
      }
      setPermissions((items) => ({ ...items, [key]: 'requesting' }));
      const result = await requestLumiiPermission(key);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.status === 'granted') grantedAfterRequest += 1;
      nextPermissions = mergePermissionState(nextPermissions, { [key]: result.status });
      permissionsRef.current = nextPermissions;
      setPermissions(nextPermissions);
      if (key === 'notifications' && result.status === 'granted') {
        schedulePushDeviceRegistration();
      }
      showToast(result.message);
    }
    void persistPermissionSnapshot(nextPermissions, grantedAfterRequest === permissionKeys.length);
    if (grantedAfterRequest === permissionKeys.length) showToast('权限已开启，可以继续添加宠物');
  }

  async function openPermissionSettings() {
    if (Platform.OS === 'web') {
      showToast('Web 预览中以模拟授权为准，真机将打开系统设置');
      return;
    }
    try {
      systemSettingsOpenedAtRef.current = Date.now();
      await Linking.openSettings();
      showToast('返回灵伴后会自动刷新权限状态');
    } catch {
      systemSettingsOpenedAtRef.current = 0;
      showToast('无法打开系统设置，请手动前往系统设置开启权限');
    }
  }

  function continueAfterPermissions() {
    const permissionSnapshot = mergePermissionState(permissions);
    replace(activePet ? 'home' : 'emptyPet');
    setTimeout(() => {
      void persistPermissionSnapshot(permissionSnapshot, true);
    }, 0);
  }

  async function savePetProfile() {
    if (petProfileSavingRef.current) return;
    if (!petDraft.name.trim()) {
      showToast('请输入宠物昵称');
      return;
    }
    const payload = {
      avatarBase64: petDraft.avatarBase64,
      avatarFileName: petDraft.avatarFileName,
      avatarMimeType: petDraft.avatarMimeType,
      avatarUrl: petDraft.avatarUrl || undefined,
      birthday: petDraft.birthday,
      breed: petDraft.breed.trim() || '未知品种',
      gender: petDraft.gender,
      name: petDraft.name.trim(),
      species: petDraft.species,
      weightKg: Number.parseFloat(petDraft.weight) || undefined,
    };
    petProfileSavingRef.current = true;
    setPetProfileSaving(true);
    try {
      if (route === 'editPet') {
        const pet = getCurrentPet();
        if (!pet) {
          showToast('请先添加宠物档案');
          return;
        }
        const result = await lumiiApi.pets.updatePet(pet.id, payload);
        if (result.data) {
          activePetIdRef.current = result.data.id;
          setActivePet(result.data);
          setPets((items) => items.map((item) => (item.id === result.data!.id ? result.data! : item)));
          setSession((current) =>
            current?.account
              ? {
                  ...current,
                  account: {
                    ...current.account,
                    activePet: result.data!,
                  },
                }
              : current,
          );
          void refreshHealthSummary();
          setHistory((items) => items.slice(0, -1));
          replace('petDetail');
          showToast('宠物信息已保存');
        } else {
          showToast(result.error?.message ?? '保存宠物档案失败');
        }
        return;
      }

      const result = await lumiiApi.pets.createPet(payload);
      if (result.data) {
        activePetIdRef.current = result.data.id;
        setActivePet(result.data);
        setPets((items) => [result.data!, ...items.filter((item) => item.id !== result.data!.id)]);
        setSession((current) =>
          current?.account
            ? {
                ...current,
                account: {
                  ...current.account,
                  activePet: result.data!,
                },
              }
            : current,
        );
        resetPetScopedRuntimeState(result.data);
        void refreshPetScopedData();
        go('upload');
      } else {
        showToast(result.error?.message ?? '保存宠物档案失败');
      }
    } finally {
      petProfileSavingRef.current = false;
      setPetProfileSaving(false);
    }
  }

  async function pickPetProfileAvatar() {
    if (route !== 'editPet') return;
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast('请先允许访问相册');
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82,
      });
      if (pickerResult.canceled) return;
      const asset = pickerResult.assets[0];
      const uploadDraft = buildAvatarUploadDraft(asset);
      if (uploadDraft.error || !uploadDraft.draft) {
        showToast(uploadDraft.error ?? '没有读取到头像，请重新选择', { tone: 'error', variant: 'surface' });
        return;
      }
      setPetDraft((draft) => ({
        ...draft,
        avatarBase64: uploadDraft.draft!.base64,
        avatarFileName: uploadDraft.draft!.fileName,
        avatarMimeType: uploadDraft.draft!.mimeType,
        avatarUrl: uploadDraft.draft!.uri,
      }));
      showToast('宠物头像已选择，保存资料后生效');
    } catch {
      showToast('打开相册失败，请稍后重试', { tone: 'error', variant: 'surface' });
    }
  }

  function resetAvatarDraft() {
    mediaPickingRef.current = false;
    mediaIdRef.current = null;
    avatarJobIdRef.current = null;
    avatarPollingJobIdRef.current = null;
    avatarStartingRef.current = false;
    avatarAcceptingRef.current = false;
    avatarRetryingRef.current = false;
    avatarTransitioningJobIdRef.current = null;
    setMedia(null);
    setAvatarJob(null);
    setAvatarStarting(false);
    setAvatarResultPrefetching(false);
    setAvatarAccepting(false);
    setAvatarRetrying(false);
    setSelectedAvatarCandidateIndex(0);
    setAvatarFeedbackSheetVisible(false);
    setAvatarFeedbackChipIds(defaultAvatarFeedbackChipIds);
    avatarFeedbackSubmittingRef.current = false;
    setAvatarFeedbackSubmitting(false);
    setAvatarRegenerateConfirmVisible(false);
    setMediaPickerMode(null);
    avatarResultRouteJobIdRef.current = '';
  }

  function startPetAvatarRefresh() {
    const pet = getCurrentPet();
    if (!pet) {
      showToast('请先添加宠物档案');
      return;
    }
    resetAvatarDraft();
    go('upload');
  }

  async function pickAndUploadPetMedia(source: 'camera' | 'library') {
    if (mediaPickingRef.current) return;
    if (avatarStartingRef.current || avatarRetryingRef.current || avatarAcceptingRef.current) {
      showToast('当前操作处理中，请稍后');
      return;
    }
    mediaPickingRef.current = true;
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = getCurrentPet()?.id ?? null;
    setMediaPickerMode(source);
    try {
      const permissionResult =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showToast(source === 'camera' ? '请先允许相机权限' : '请先允许访问相册', { subtitle: '授权后才能上传宠物照片生成灵伴', tone: 'warning', variant: 'surface' });
        return;
      }

      const pickerResult =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              base64: true,
              mediaTypes: ['images'],
              quality: 0.78,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsMultipleSelection: false,
              base64: true,
              defaultTab: 'photos',
              mediaTypes: ['images'],
              quality: 0.78,
            });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        showToast(source === 'camera' ? '已取消拍照' : '已取消选择照片');
        return;
      }

      const asset = pickerResult.assets[0];
      const result = await lumiiApi.avatar.uploadPetMedia({
        base64: asset.base64 ?? undefined,
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? undefined,
        previewUrl: asset.uri,
        source,
      });
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (!avatarFlowRoutes.has(routeRef.current)) return;
      const currentPetId = getCurrentPet()?.id ?? null;
      if (requestPetId && currentPetId && currentPetId !== requestPetId) {
        showToast('当前宠物已切换，请重新选择照片');
        return;
      }
      if (result.data) {
        mediaIdRef.current = result.data.mediaId;
        setMedia(result.data);
        if (!result.data.analysis.canGenerate) {
          go('uploadNoPet');
          return;
        }
        go('uploadDetail');
      } else {
        mediaIdRef.current = null;
        setMedia(null);
        go('uploadNoPet');
      }
    } catch {
      showToast(source === 'camera' ? '打开相机失败，请稍后重试' : '打开相册失败，请稍后重试', { subtitle: '当前照片没有上传，请重新选择', tone: 'error', variant: 'surface' });
    } finally {
      mediaPickingRef.current = false;
      setMediaPickerMode(null);
    }
  }

  async function startAvatarGeneration() {
    if (avatarStartingRef.current || avatarRetryingRef.current) return;
    if (!getCurrentPet()) {
      showToast('请先添加宠物档案');
      replace('emptyPet');
      return;
    }
    if (!media) {
      showToast('请先上传宠物照片');
      return;
    }
    if (!media.analysis.canGenerate) {
      showToast(media.analysis.message || '当前照片不适合生成，请重新上传', { subtitle: '建议上传清晰、单只猫狗、正脸或半身照片', tone: 'warning', variant: 'surface' });
      replace('uploadNoPet');
      return;
    }
    avatarStartingRef.current = true;
    setAvatarStarting(true);
    try {
      const hasQuota = await ensurePetAvatarQuota();
      if (!hasQuota) return;
      const requestSessionToken = sessionTokenRef.current;
      const mediaId = media.mediaId;
      const result = await lumiiApi.avatar.startGeneration(mediaId);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (mediaIdRef.current !== mediaId) return;
      if (!avatarFlowRoutes.has(routeRef.current)) return;
      if (result.data) {
        avatarResultRouteJobIdRef.current = '';
        setAvatarResultPrefetching(false);
        avatarJobIdRef.current = result.data.id;
        setAvatarJob(result.data);
        go('generating');
      } else {
        showToast(result.error?.message ?? '启动生成失败，请重新选择照片', { subtitle: '照片已保留，可稍后重新生成', tone: 'error', variant: 'surface' });
      }
      void loadAiUsage();
    } finally {
      avatarStartingRef.current = false;
      setAvatarStarting(false);
    }
  }

  async function transitionToAvatarResult(job: AvatarJob) {
    if (avatarResultRouteJobIdRef.current === job.id) return;
    if (avatarTransitioningJobIdRef.current === job.id) return;
    if (avatarJobIdRef.current !== job.id) return;
    avatarResultRouteJobIdRef.current = job.id;
    avatarTransitioningJobIdRef.current = job.id;
    setAvatarResultPrefetching(true);
    const resultUrl = job.resultUrl;
    if (resultUrl && !isGeneratedAvatarUri(resultUrl)) {
      try {
        await Promise.race([Image.prefetch(resultUrl), new Promise((resolve) => setTimeout(resolve, 7000))]);
      } catch {
        showToast('生成图加载较慢，已先进入确认页');
      }
    }
    if (avatarJobIdRef.current !== job.id || !avatarFlowRoutes.has(routeRef.current)) {
      avatarResultRouteJobIdRef.current = '';
      avatarTransitioningJobIdRef.current = null;
      setAvatarResultPrefetching(false);
      return;
    }
    setAvatarResultPrefetching(false);
    avatarTransitioningJobIdRef.current = null;
    replace('aiResult');
  }

  async function pollAvatarJob() {
    if (!avatarJob) return;
    const requestedJobId = avatarJob.id;
    if (avatarPollingJobIdRef.current === requestedJobId) return;
    avatarPollingJobIdRef.current = requestedJobId;
    try {
      const result = await lumiiApi.avatar.getGenerationStatus(requestedJobId);
      if (avatarJobIdRef.current !== requestedJobId) return;
      if (!avatarFlowRoutes.has(routeRef.current)) return;
      if (result.data) {
        avatarJobIdRef.current = result.data.id;
        setAvatarJob(result.data);
        if (result.data.status === 'ready') void transitionToAvatarResult(result.data);
      }
    } finally {
      if (avatarPollingJobIdRef.current === requestedJobId) avatarPollingJobIdRef.current = null;
    }
  }

  async function saveAvatar() {
    const pet = getCurrentPet();
    const avatarCandidateUrls = getAvatarCandidateUrls(avatarJob);
    const selectedCandidateUri = avatarCandidateUrls[Math.min(selectedAvatarCandidateIndex, Math.max(avatarCandidateUrls.length - 1, 0))] ?? avatarJob?.resultUrl;
    if (!pet || !selectedCandidateUri) {
      showToast('还没有可保存的形象');
      return;
    }
    if (avatarAcceptingRef.current) return;
    avatarAcceptingRef.current = true;
    setAvatarAccepting(true);
    try {
      const requestSessionToken = sessionTokenRef.current;
      const jobId = avatarJob?.id;
      const result = jobId && selectedCandidateUri === avatarJob?.resultUrl
        ? await lumiiApi.avatar.acceptGeneration(jobId)
        : await lumiiApi.avatar.saveAvatar(pet.id, selectedCandidateUri);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (jobId && avatarJobIdRef.current !== jobId) return;
      if (result.data) {
        activePetIdRef.current = result.data.id;
        setActivePet(result.data);
        setPets((items) => [result.data!, ...items.filter((item) => item.id !== result.data!.id)]);
        resetAvatarDraft();
        void refreshPetScopedData();
        replace('home');
        showToast('已保存为你的电子灵伴', { layout: 'avatarSaveSuccess', subtitle: '可在「我的宠物」中查看', tone: 'success', variant: 'dark' });
      } else {
        showToast(result.error?.message ?? '保存失败，请检查网络', { layout: 'avatarSaveError', subtitle: '网络连接异常，灵伴形象未上传，可在本页重新保存', tone: 'error', variant: 'surface' });
      }
    } finally {
      avatarAcceptingRef.current = false;
      setAvatarAccepting(false);
    }
  }

  async function retryAvatarGeneration() {
    if (avatarRetryingRef.current || avatarStartingRef.current) return;
    if (!avatarJob?.id) {
      await startAvatarGeneration();
      return;
    }
    avatarRetryingRef.current = true;
    setAvatarRetrying(true);
    try {
      const hasQuota = await ensurePetAvatarQuota();
      if (!hasQuota) return;
      const requestSessionToken = sessionTokenRef.current;
      const requestedJobId = avatarJob.id;
      const result = await lumiiApi.avatar.retryGeneration(requestedJobId);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (avatarJobIdRef.current !== requestedJobId) return;
      if (!avatarFlowRoutes.has(routeRef.current)) return;
      if (result.data) {
        avatarResultRouteJobIdRef.current = '';
        setAvatarResultPrefetching(false);
        setSelectedAvatarCandidateIndex(0);
        setAvatarFeedbackSheetVisible(false);
        setAvatarRegenerateConfirmVisible(false);
        avatarJobIdRef.current = result.data.id;
        setAvatarJob(result.data);
        replace('generating');
      } else {
        showToast(result.error?.message ?? '重新生成失败，请稍后重试', { subtitle: '当前形象仍会保留在确认页', tone: 'error', variant: 'surface' });
      }
      void loadAiUsage();
    } finally {
      avatarRetryingRef.current = false;
      setAvatarRetrying(false);
    }
  }

  function toggleAvatarFeedbackChip(id: AvatarFeedbackChipId) {
    setAvatarFeedbackChipIds((items) => {
      if (items.includes(id)) return items.filter((item) => item !== id);
      return [...items, id];
    });
  }

  function openAvatarRegenerateConfirm() {
    if (avatarRetryingRef.current || avatarStartingRef.current || avatarAcceptingRef.current) return;
    setAvatarRegenerateConfirmVisible(true);
  }

  async function submitAvatarFeedbackAndRetry() {
    if (avatarFeedbackSubmittingRef.current || avatarRetryingRef.current || avatarStartingRef.current) return;
    if (!avatarFeedbackChipIds.length) {
      showToast('请选择至少一个反馈原因', { tone: 'warning', variant: 'surface' });
      return;
    }
    const jobId = avatarJob?.id;
    if (!jobId) {
      setAvatarFeedbackSheetVisible(false);
      await retryAvatarGeneration();
      return;
    }

    avatarFeedbackSubmittingRef.current = true;
    setAvatarFeedbackSubmitting(true);
    try {
      const requestSessionToken = sessionTokenRef.current;
      const primaryOption = avatarFeedbackOptions.find((item) => item.id === avatarFeedbackChipIds[0]) ?? avatarFeedbackOptions[0];
      const content = avatarFeedbackOptions
        .filter((item) => avatarFeedbackChipIds.includes(item.id))
        .map((item) => item.label)
        .join('、');
      const result = await lumiiApi.avatar.sendGenerationFeedback(jobId, primaryOption.reason, content);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (avatarJobIdRef.current !== jobId) return;
      if (result.data) {
        setAvatarJob(result.data);
        setAvatarFeedbackSheetVisible(false);
        showToast('已记录反馈，正在重新生成', { tone: 'success', variant: 'surface' });
        await retryAvatarGeneration();
      } else {
        showToast(result.error?.message ?? '反馈保存失败，请稍后重试', { subtitle: '当前形象仍会保留', tone: 'error', variant: 'surface' });
      }
    } finally {
      avatarFeedbackSubmittingRef.current = false;
      setAvatarFeedbackSubmitting(false);
    }
  }

  function syncPetChatBusinessEffects(message: ChatMessage) {
    const syncLabels: string[] = [];
    const addSyncLabel = (label: string) => {
      if (!syncLabels.includes(label)) syncLabels.push(label);
    };
    let shouldRefreshHealth = false;
    let shouldRefreshInbox = false;

    if (message.updatedPet) {
      activePetIdRef.current = message.updatedPet.id;
      setActivePet(message.updatedPet);
      shouldRefreshHealth = true;
      addSyncLabel('宠物档案');
    }

    if (message.createdMemo) {
      setMemos((items) => [message.createdMemo!, ...items.filter((item) => item.id !== message.createdMemo!.id)]);
      shouldRefreshHealth = true;
      addSyncLabel('健康日历');
    }

    if (message.medicalAlert) {
      shouldRefreshInbox = true;
      addSyncLabel('就医提醒');
    }

    if (message.createdWeight) {
      setWeights((items) => [message.createdWeight!, ...items.filter((item) => item.id !== message.createdWeight!.id)]);
      setActivePet((pet) => (pet ? { ...pet, weightKg: message.createdWeight!.kg } : pet));
      shouldRefreshHealth = true;
      addSyncLabel('体重记录');
    }

    if (message.updatedVaccine) {
      setVaccines((items) => items.map((item) => (item.id === message.updatedVaccine!.id ? message.updatedVaccine! : item)));
      shouldRefreshHealth = true;
      shouldRefreshInbox = true;
      addSyncLabel('疫苗计划');
    }

    if (message.vaccineReminderIds) {
      setVaccineReminderIds(message.vaccineReminderIds);
      localHealthReminderSyncKeyRef.current = '';
    }

    if (shouldRefreshInbox) void loadInboxData();
    if (shouldRefreshHealth) void refreshHealthSummary();
    if (syncLabels.length) showToast(`已同步：${syncLabels.join('、')}`);
  }

  async function sendChatMessage(textOverride?: string, retryMessageId?: string) {
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) {
      showToast('请先添加宠物档案');
      return;
    }
    const text = (textOverride ?? chatInput).trim();
    if (!text) return;
    if (chatReplyingRef.current) {
      showToast('等灵伴回复完再继续聊');
      return;
    }
    if (petChatDailyCount >= petChatDailyLimit) {
      showToast('今天和灵伴聊得很多啦，稍后再继续');
      return;
    }
    const messageTime = new Date().toISOString();
    const local: ChatMessage = retryMessageId
      ? { author: 'me', id: retryMessageId, status: 'sending', text, time: messageTime }
      : { author: 'me', id: `me-${Date.now()}`, status: 'sending', text, time: messageTime };
    if (!retryMessageId) setChatInput('');
    chatReplyingRef.current = true;
    setChatReplying(true);
    setChatMessages((items) =>
      retryMessageId ? items.map((item) => (item.id === retryMessageId ? local : item)) : [...items, local],
    );
    try {
      const result = await lumiiApi.messages.sendMessage(text);
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) {
        setChatMessages((items) => items.filter((item) => item.id !== local.id));
        return;
      }
      setChatMessages((items) => items.map((item) => (item.id === local.id ? { ...item, status: result.data ? 'sent' : 'failed' } : item)));
      if (result.data) {
        setChatMessages((items) => [...items, result.data!]);
        syncPetChatBusinessEffects(result.data);
        void loadAiUsage();
      } else {
        showToast(result.error?.message ?? '消息发送失败', { subtitle: '消息气泡已保留，可在下方重新发送', tone: 'error', variant: 'surface' });
        void loadAiUsage();
      }
    } finally {
      chatReplyingRef.current = false;
      setChatReplying(false);
    }
  }

  async function ratePetChatReply(messageId: string, rating: PetChatFeedbackRating) {
    if (chatFeedbackSavingIdsRef.current.has(messageId)) return;
    chatFeedbackSavingIdsRef.current.add(messageId);
    setChatFeedbackSavingIds((items) => [...new Set([...items, messageId])]);
    const previousRating = chatFeedbackById[messageId];
    setChatFeedbackById((items) => ({ ...items, [messageId]: rating }));
    try {
      const result = await lumiiApi.messages.sendPetChatFeedback(messageId, rating);
      if (result.data) {
        setChatMessages((items) => items.map((item) => (item.id === messageId ? { ...item, feedback: result.data!.feedback } : item)));
        showToast(rating === 'good' ? '已记录：这个回复像它' : '已记录：这条反馈会作为语气参考');
      } else {
        setChatFeedbackById((items) => {
          const next = { ...items };
          if (previousRating) next[messageId] = previousRating;
          else delete next[messageId];
          return next;
        });
        showToast(result.error?.message ?? '反馈保存失败，请稍后重试', { subtitle: '当前回复不会被重新训练', tone: 'error', variant: 'surface' });
      }
    } finally {
      chatFeedbackSavingIdsRef.current.delete(messageId);
      setChatFeedbackSavingIds((items) => items.filter((id) => id !== messageId));
    }
  }

  async function openConversation(conversation: Conversation) {
    selectedConversationIdRef.current = conversation.id;
    setSelectedConversation(conversation);
    if (conversation.canSendMessage === false) setConversationDraft(conversation.id, '');
    setConversations((items) => items.map((item) => (item.id === conversation.id ? { ...item, unread: 0 } : item)));
    setConversationMessages([createConversationSafetyMessage()]);
    go('conversation');
    await loadConversationMessages(conversation.id, { markRead: true });
  }

  function setConversationDraft(conversationId: string, text: string) {
    setConversationDraftsById((drafts) => ({ ...drafts, [conversationId]: text }));
  }

  function beginSocialAction(actionId: string) {
    if (socialActionSavingIdsRef.current.has(actionId)) return false;
    socialActionSavingIdsRef.current.add(actionId);
    setSocialActionSavingIds([...socialActionSavingIdsRef.current]);
    return true;
  }

  function endSocialAction(actionId: string) {
    socialActionSavingIdsRef.current.delete(actionId);
    setSocialActionSavingIds([...socialActionSavingIdsRef.current]);
  }

  async function rejectGreeting(owner: NearbyOwner) {
    const actionId = `reject:${owner.id}`;
    if (socialActionSavingIdsRef.current.has(`accept:${owner.id}`) || socialActionSavingIdsRef.current.has(`report:${owner.id}`)) return;
    if (!beginSocialAction(actionId)) return;
    const requestSessionToken = sessionTokenRef.current;
    try {
      if (!greetingRequestOwnersRef.current.some((item) => item.id === owner.id)) {
        showToast('招呼请求已更新，请返回消息页刷新');
        return;
      }
      const result = await lumiiApi.social.rejectGreeting(owner.id);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        applyGreetingRequestOwners(greetingRequestOwnersRef.current.filter((item) => item.id !== owner.id));
        void loadInboxData();
        showToast('已婉拒招呼');
      } else {
        showToast(result.error?.message ?? '操作失败，请稍后重试');
      }
    } finally {
      endSocialAction(actionId);
    }
  }

  async function reportGreeting(owner: NearbyOwner) {
    const actionId = `report:${owner.id}`;
    if (socialActionSavingIdsRef.current.has(`accept:${owner.id}`) || socialActionSavingIdsRef.current.has(`reject:${owner.id}`)) return;
    if (!beginSocialAction(actionId)) return;
    const requestSessionToken = sessionTokenRef.current;
    const pet = getCurrentPet();
    const feedbackContent = [
      '招呼请求举报',
      `对方：${owner.ownerName} & ${owner.petName}`,
      `对方ID：${owner.id}`,
      `距离：${owner.distance}`,
      owner.tags.length ? `标签：${owner.tags.join('、')}` : '',
      pet ? `我的宠物：${pet.name}${pet.breed ? `（${pet.breed}）` : ''}` : '',
      '来源：招呼请求列表',
    ].filter(Boolean).join('\n');
    try {
      if (!greetingRequestOwnersRef.current.some((item) => item.id === owner.id)) {
        showToast('招呼请求已更新，请返回消息页刷新');
        return;
      }
      const feedbackResult = await lumiiApi.support.submitFeedback(feedbackContent, 'safety', session?.phone);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (!feedbackResult.data) {
        showToast(feedbackResult.error?.message ?? '举报提交失败，请稍后重试', { tone: 'error', variant: 'surface' });
        return;
      }
      const rejectResult = await lumiiApi.social.rejectGreeting(owner.id);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (rejectResult.data) {
        applyGreetingRequestOwners(greetingRequestOwnersRef.current.filter((item) => item.id !== owner.id));
        void loadInboxData();
        showToast('举报已提交，招呼请求已忽略', { tone: 'success', variant: 'surface' });
      } else {
        showToast(rejectResult.error?.message ?? '举报已提交，但招呼状态更新失败，请稍后刷新', { tone: 'warning', variant: 'surface' });
      }
    } finally {
      endSocialAction(actionId);
    }
  }

  async function acceptGreeting(owner: NearbyOwner) {
    const actionId = `accept:${owner.id}`;
    if (socialActionSavingIdsRef.current.has(`reject:${owner.id}`) || socialActionSavingIdsRef.current.has(`report:${owner.id}`)) return;
    if (!beginSocialAction(actionId)) return;
    const requestSessionToken = sessionTokenRef.current;
    try {
      if (!greetingRequestOwnersRef.current.some((item) => item.id === owner.id)) {
        showToast('招呼请求已更新，请返回消息页刷新');
        return;
      }
      const result = await lumiiApi.social.acceptGreeting(owner.id);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        applyGreetingRequestOwners(greetingRequestOwnersRef.current.filter((item) => item.id !== owner.id));
        if (result.data.conversation) {
          setConversations((items) => [result.data!.conversation!, ...items.filter((item) => item.id !== result.data!.conversation!.id)]);
        }
        void loadInboxData();
        replace('messages');
        showToast('已接受招呼，可以聊天了');
      } else {
        showToast(result.error?.message ?? '操作失败，请稍后重试');
      }
    } finally {
      endSocialAction(actionId);
    }
  }

  async function sendConversationMessage(textOverride?: string, retryMessageId?: string) {
    const conversation = selectedConversation;
    if (!conversation) {
      showToast('会话已失效，请返回消息列表重新选择');
      return;
    }
    const conversationId = conversation.id;
    const text = (textOverride ?? (conversationDraftsById[conversation.id] ?? '')).trim();
    if (!text) return;
    if (conversation.canSendMessage === false) {
      showToast('对方接受招呼后才能聊天');
      return;
    }
    const sendKey = retryMessageId ? `retry:${conversationId}:${retryMessageId}` : `send:${conversationId}`;
    if (conversationSendingKeysRef.current.has(sendKey)) return;
    conversationSendingKeysRef.current.add(sendKey);
    const requestSessionToken = sessionTokenRef.current;
    const messageTime = new Date().toISOString();
    const local: ConversationMessage = retryMessageId
      ? { author: 'me', id: retryMessageId, status: 'sending', text, time: messageTime }
      : { author: 'me', id: `conversation-${conversationId}-${Date.now()}`, status: 'sending', text, time: messageTime };
    localConversationMessageIdsRef.current[local.id] = conversationId;
    if (!retryMessageId && textOverride === undefined) setConversationDraft(conversationId, '');
    setConversationMessages((items) =>
      retryMessageId ? items.map((item) => (item.id === retryMessageId ? local : item)) : [...items, local],
    );
    try {
      const result = await lumiiApi.messages.sendConversationMessage(conversationId, text);
      if (sessionTokenRef.current !== requestSessionToken) {
        delete localConversationMessageIdsRef.current[local.id];
        return;
      }
      const isActiveConversation = selectedConversationIdRef.current === conversationId;
      if (result.data) {
        delete localConversationMessageIdsRef.current[local.id];
        const updatedAt = new Date().toISOString();
        if (isActiveConversation) {
          setConversationMessages((items) => items.map((item) => (item.id === local.id ? result.data! : item)));
        }
        setConversations((items) => items.map((item) => (item.id === conversationId ? { ...item, lastMessage: text, unread: 0, updatedAt } : item)));
      } else {
        if (isActiveConversation) {
          setConversationMessages((items) => items.map((item) => (item.id === local.id ? { ...item, status: 'failed' } : item)));
          showToast(result.error?.message ?? '消息发送失败', { subtitle: '消息已标记为未送达，可在气泡下方重试', tone: 'error', variant: 'surface' });
        } else {
          delete localConversationMessageIdsRef.current[local.id];
        }
      }
    } finally {
      conversationSendingKeysRef.current.delete(sendKey);
    }
  }

  function deleteLocalConversationMessage(messageId: string) {
    delete localConversationMessageIdsRef.current[messageId];
    setConversationMessages((items) => items.filter((item) => item.id !== messageId));
  }

  async function recordWeight() {
    if (weightSavingRef.current) return;
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) {
      showToast('请先添加宠物档案');
      return;
    }
    const kg = Number.parseFloat(weightEditValue);
    const note = weightEditNote.trim();
    if (!Number.isFinite(kg) || kg <= 0) {
      showToast('请输入正确体重');
      return;
    }
    if (kg > 200) {
      showToast('请输入 0-200kg 之间的体重');
      return;
    }
    if (note.length > 40) {
      showToast('备注最多 40 个字');
      return;
    }
    weightSavingRef.current = true;
    setWeightSaving(true);
    try {
      const result = await lumiiApi.health.recordWeight(Math.round(kg * 100) / 100, note || '手动记录', dateToIsoDate(weightDraftRecordedAt));
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
      if (result.data) {
        setWeights((items) => [result.data!, ...items]);
        setActivePet((pet) => (pet ? { ...pet, weightKg: result.data!.kg } : pet));
        closeWeightEditor();
        void refreshHealthSummary();
        showToast('体重已记录', { tone: 'success', variant: 'surface' });
      } else {
        showToast(result.error?.message ?? '保存失败，请稍后重试', { tone: 'error', variant: 'surface' });
      }
    } finally {
      weightSavingRef.current = false;
      setWeightSaving(false);
    }
  }

  function openWeightAddEditor(initialKg?: null | number) {
    const fallbackWeight = healthSummary?.latestWeightKg ?? weights[0]?.kg ?? activePet?.weightKg ?? initialKg;
    setWeightEditorMode('add');
    setWeightEditRecord(null);
    setWeightDraftRecordedAt(new Date());
    setWeightEditValue(Number.isFinite(Number(fallbackWeight)) ? Number(fallbackWeight).toFixed(1).replace(/\.0$/, '') : '');
    setWeightEditNote('');
  }

  function openWeightEditor(record: WeightRecord) {
    setWeightEditorMode('edit');
    setWeightEditRecord(record);
    setWeightEditValue(String(record.kg));
    setWeightEditNote(record.note ?? '');
  }

  function closeWeightEditor() {
    setWeightEditorMode(null);
    setWeightEditRecord(null);
    setWeightDraftRecordedAt(new Date());
    setWeightEditValue('');
    setWeightEditNote('');
  }

  async function saveWeightEdit() {
    if (weightEditSavingRef.current) return;
    const record = weightEditRecord;
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!record || !requestPetId) return;
    const kg = Number.parseFloat(weightEditValue);
    const note = weightEditNote.trim();
    if (!Number.isFinite(kg) || kg <= 0 || kg > 200) {
      showToast('请输入 0-200kg 之间的体重');
      return;
    }
    if (note.length > 40) {
      showToast('备注最多 40 个字');
      return;
    }
    weightEditSavingRef.current = true;
    setWeightEditSaving(true);
    try {
      const result = await lumiiApi.health.updateWeightRecord(record.id, {
        kg: Math.round(kg * 100) / 100,
        note,
        recordedAt: record.recordedAt,
      });
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
      if (result.data) {
        const wasLatestRecord = weights[0]?.id === record.id;
        setWeights((items) => items.map((item) => (item.id === result.data!.id ? result.data! : item)).sort((left, right) => right.recordedAt.localeCompare(left.recordedAt)));
        if (wasLatestRecord) {
          setActivePet((pet) => (pet ? { ...pet, weightKg: result.data!.kg } : pet));
        }
        closeWeightEditor();
        void refreshHealthSummary();
        showToast('体重记录已保存', { tone: 'success', variant: 'surface' });
      } else {
        showToast(result.error?.message ?? '体重保存失败', { tone: 'error', variant: 'surface' });
      }
    } finally {
      weightEditSavingRef.current = false;
      setWeightEditSaving(false);
    }
  }

  async function deleteWeightRecord(record: WeightRecord) {
    if (weightEditSavingRef.current) return;
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) return;
    weightEditSavingRef.current = true;
    setWeightEditSaving(true);
    try {
      const result = await lumiiApi.health.deleteWeightRecord(record.id);
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
      if (result.data) {
        setWeightDeleteConfirm(null);
        setWeights(result.data);
        const nextWeight = result.data[0]?.kg;
        setActivePet((pet) => (pet ? { ...pet, weightKg: nextWeight } : pet));
        closeWeightEditor();
        void refreshHealthSummary();
        showToast('体重记录已删除', { tone: 'success', variant: 'surface' });
      } else {
        showToast(result.error?.message ?? '删除体重失败', { tone: 'error', variant: 'surface' });
      }
    } finally {
      weightEditSavingRef.current = false;
      setWeightEditSaving(false);
    }
  }

  function confirmDeleteWeightRecord(record?: WeightRecord | null) {
    if (!record) return;
    setWeightDeleteConfirm(record);
  }

  async function enableVaccineReminder(vaccine?: VaccinePlan) {
    if (!vaccine) {
      showToast('暂无可提醒的疫苗计划');
      return;
    }
    if (vaccineReminderIds.includes(vaccine.id)) {
      showToast('这个提醒已经开启');
      return;
    }
    if (vaccineReminderSavingIdsRef.current.has(vaccine.id)) return;
    vaccineReminderSavingIdsRef.current.add(vaccine.id);
    setVaccineReminderSavingIds([...vaccineReminderSavingIdsRef.current]);
    setVaccineReminderIds((items) => [vaccine.id, ...items.filter((id) => id !== vaccine.id)]);
    try {
      const result = await lumiiApi.health.setVaccineReminder(vaccine.id, true);
      if (result.data) {
        setVaccineReminderIds(result.data);
        void loadInboxData();
        void refreshHealthSummary();
        const pushReady = permissionsRef.current.notifications === 'granted' && userSettingsRef.current.pushNotifications;
        const localReminder = pushReady ? await scheduleVaccineLocalReminder(vaccine, activePet?.name) : null;
        if (localReminder?.scheduled) {
          localHealthReminderScheduledIdsRef.current = [...new Set([vaccine.id, ...localHealthReminderScheduledIdsRef.current])];
        }
        showToast(pushReady ? (localReminder?.scheduled ? '疫苗提醒已开启，系统通知已安排' : '疫苗提醒已开启；系统通知调度失败') : '疫苗提醒已开启；系统通知需在设置中开启');
      } else {
        setVaccineReminderIds((items) => items.filter((id) => id !== vaccine.id));
        showToast(result.error?.message ?? '提醒开启失败，请稍后重试');
      }
    } finally {
      vaccineReminderSavingIdsRef.current.delete(vaccine.id);
      setVaccineReminderSavingIds([...vaccineReminderSavingIdsRef.current]);
    }
  }

  async function markVaccineDone(vaccine?: VaccinePlan) {
    if (!vaccine) {
      showToast('暂无可完成的疫苗计划');
      return;
    }
    if (vaccineDoneSavingIdsRef.current.has(vaccine.id)) return;
    vaccineDoneSavingIdsRef.current.add(vaccine.id);
    setVaccineDoneSavingIds([...vaccineDoneSavingIdsRef.current]);
    try {
      const result = await lumiiApi.health.updateVaccineStatus(vaccine.id, 'done');
      if (!result.data) {
        showToast(result.error?.message ?? '操作失败，请稍后重试');
        return;
      }
      setVaccines((items) => items.map((item) => (item.id === vaccine.id ? result.data! : item)));
      setVaccineReminderIds((items) => items.filter((id) => id !== vaccine.id));
      void cancelVaccineLocalReminder(vaccine.id);
      localHealthReminderScheduledIdsRef.current = localHealthReminderScheduledIdsRef.current.filter((id) => id !== vaccine.id);
      localHealthReminderSyncKeyRef.current = '';
      void loadInboxData();
      void refreshHealthSummary();
      showToast('已标记完成');
    } finally {
      vaccineDoneSavingIdsRef.current.delete(vaccine.id);
      setVaccineDoneSavingIds([...vaccineDoneSavingIdsRef.current]);
    }
  }

  function openVaccineComposer() {
    setVaccineComposerVisible(true);
    setVaccineNameDraft('');
    setVaccineDueDraft('');
  }

  async function createVaccinePlan() {
    if (vaccineCreatingRef.current) return;
    const name = vaccineNameDraft.trim();
    const dueAt = vaccineDueDraft.trim();
    if (!name) {
      showToast('请输入疫苗或驱虫名称');
      return;
    }
    if (name.length > 24) {
      showToast('疫苗名称最多 24 个字');
      return;
    }
    if (!isExactIsoCalendarDate(dueAt)) {
      showToast(`请选择正确的计划日期，例如 ${addDaysIsoDate(30)}`);
      return;
    }
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) return;
    vaccineCreatingRef.current = true;
    setVaccineCreating(true);
    try {
      const result = await lumiiApi.health.createVaccinePlan({ dueAt, name });
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
      if (result.data) {
        setVaccines((items) => [result.data!, ...items.filter((item) => item.id !== result.data!.id)].sort((left, right) => left.dueAt.localeCompare(right.dueAt)));
        setVaccineComposerVisible(false);
        setVaccineNameDraft('');
        setVaccineDueDraft('');
        void refreshPetScopedData();
        showToast('疫苗计划已添加', { tone: 'success', variant: 'surface' });
      } else {
        showToast(result.error?.message ?? '新增计划失败，请稍后重试', { tone: 'error', variant: 'surface' });
      }
    } finally {
      vaccineCreatingRef.current = false;
      setVaccineCreating(false);
    }
  }

  async function syncNearbySettingsChange(key: UserSettingKey, nextValue: boolean) {
    if (key !== 'nearbyVisible' && key !== 'fuzzyLocation') return;

    discoverRequestSeqRef.current += 1;
    lastDiscoverLocationRef.current = null;
    const nearbyWillBeVisible = key === 'nearbyVisible' ? nextValue : userSettingsRef.current.nearbyVisible;
    if (!nearbyWillBeVisible) {
      applyNearbyOwners([]);
      void loadInboxData();
      return;
    }

    const nextOwners = await fetchNearbyOwners({ forceLocation: true, silent: true });
    if (nextOwners) applyNearbyOwners(nextOwners);
    void loadInboxData();
  }

  async function setUserSettingValue(
    key: UserSettingKey,
    label: string,
    nextValue: boolean,
    options: { unchangedMessage?: string; successMessage?: string } = {},
  ): Promise<boolean> {
    if (userSettingSavingKeysRef.current.has(key)) return false;
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return false;
    const previousSettings = userSettingsRef.current;
    if (previousSettings[key] === nextValue) {
      if (options.unchangedMessage) showToast(options.unchangedMessage, { tone: 'info', variant: 'surface' });
      return true;
    }
    userSettingSavingKeysRef.current.add(key);
    const nextSettings = { ...previousSettings, [key]: nextValue };

    try {
      if (key === 'pushNotifications' && !nextValue) {
        clearScheduledPushRegistration();
      }

      if (key === 'pushNotifications' && nextValue && permissionsRef.current.notifications !== 'granted') {
        setPermissions((items) => ({ ...items, notifications: 'requesting' }));
        const permissionResult = await requestLumiiPermission('notifications');
        if (sessionTokenRef.current !== requestSessionToken) return false;
        const nextPermissions = mergePermissionState(permissionsRef.current, { notifications: permissionResult.status });
        const savedPermissions = await persistPermissionSnapshot(nextPermissions);
        if (sessionTokenRef.current !== requestSessionToken) return false;
        setPermissions(savedPermissions);
        if (permissionResult.status !== 'granted') {
          showToast(permissionResult.status === 'blocked' ? '请先在系统设置开启消息通知权限' : '请先允许消息通知权限');
          return false;
        }
        schedulePushDeviceRegistration();
      }

      setUserSettings(nextSettings);
      userSettingsRef.current = nextSettings;
      const result = await lumiiApi.settings.updateUserSettings({ [key]: nextValue });
      if (sessionTokenRef.current !== requestSessionToken) return false;
      if (result.data) {
        const serverSettings = { ...defaultUserSettings, ...result.data };
        const savedSettings = { ...userSettingsRef.current, [key]: serverSettings[key] };
        userSettingsRef.current = savedSettings;
        setUserSettings(savedSettings);
        if (key === 'pushNotifications') {
          if (nextValue) {
            schedulePushDeviceRegistration({ delayMs: 500 });
            void syncVaccineLocalReminders(vaccines, vaccineReminderIds, activePet?.name);
            localHealthReminderScheduledIdsRef.current = vaccineReminderIds;
            localHealthReminderSyncKeyRef.current = '';
          } else {
            void cancelVaccineLocalReminders(vaccineReminderIds);
            localHealthReminderScheduledIdsRef.current = [];
            localHealthReminderSyncKeyRef.current = '';
          }
        }
        void syncNearbySettingsChange(key, serverSettings[key]);
        showToast(options.successMessage ?? `${label}已${serverSettings[key] ? '开启' : '关闭'}`, { tone: 'success', variant: 'surface' });
        return true;
      } else {
        const rolledBackSettings = { ...userSettingsRef.current, [key]: previousSettings[key] };
        userSettingsRef.current = rolledBackSettings;
        setUserSettings(rolledBackSettings);
        if (key === 'pushNotifications' && previousSettings.pushNotifications) {
          schedulePushDeviceRegistration({ delayMs: 500 });
        }
        showToast(result.error?.message ?? '设置保存失败，请稍后重试');
        return false;
      }
    } finally {
      userSettingSavingKeysRef.current.delete(key);
    }
  }

  async function toggleUserSetting(key: UserSettingKey, label: string) {
    await setUserSettingValue(key, label, !userSettingsRef.current[key]);
  }

  async function disableDiscoverForNow() {
    const saved = await setUserSettingValue('nearbyVisible', '附近可见', false, {
      successMessage: '已关闭附近可见，可在我的页重新开启',
      unchangedMessage: '附近可见已关闭，可在我的页重新开启',
    });
    if (saved) clearDiscoverSearchAndFilter();
  }

  async function pickOwnerAvatar() {
    if (ownerAvatarPickingRef.current) return;
    ownerAvatarPickingRef.current = true;
    setOwnerAvatarPicking(true);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast('请先允许访问相册');
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82,
      });
      if (pickerResult.canceled) return;
      const asset = pickerResult.assets[0];
      const uploadDraft = buildAvatarUploadDraft(asset);
      if (uploadDraft.error || !uploadDraft.draft) {
        showToast(uploadDraft.error ?? '没有读取到头像，请重新选择', { tone: 'error', variant: 'surface' });
        return;
      }
      setOwnerAvatarDraft(uploadDraft.draft.uri);
      setOwnerAvatarUploadDraft(uploadDraft.draft);
      setOwnerProfileSaved(false);
      showToast('头像已选择，保存后生效');
    } catch {
      showToast('打开相册失败，请稍后重试', { tone: 'error', variant: 'surface' });
    } finally {
      ownerAvatarPickingRef.current = false;
      setOwnerAvatarPicking(false);
    }
  }

  async function saveOwnerProfile() {
    if (ownerProfileSavingRef.current) return;
    const ownerName = ownerNameDraft.trim();
    const ownerBio = ownerBioDraft.trim();
    const ownerAvatarUrl = ownerAvatarDraft.trim();
    if (!ownerName) {
      showToast('请输入主人昵称');
      return;
    }
    if (ownerName.length > 14) {
      showToast('昵称最多 14 个字');
      return;
    }
    if (ownerBio.length > 60) {
      showToast('简介最多 60 个字');
      return;
    }
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    ownerProfileSavingRef.current = true;
    setOwnerProfileSaveError('');
    setOwnerProfileSaved(false);
    setOwnerProfileSaving(true);
    try {
      const result = await lumiiApi.account.updateMe({
        ownerAvatarBase64: ownerAvatarUploadDraft?.base64,
        ownerAvatarFileName: ownerAvatarUploadDraft?.fileName,
        ownerAvatarMimeType: ownerAvatarUploadDraft?.mimeType,
        ownerAvatarUrl,
        ownerBio,
        ownerName,
      });
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        const profileSettings = { ...defaultUserSettings, ...result.data.settings };
        setSession((current) => (current ? { ...current, account: result.data!, phone: result.data!.phone } : current));
        userSettingsRef.current = profileSettings;
        setUserSettings(profileSettings);
        setActivePet(result.data.activePet ?? getCurrentPet());
        setOwnerAvatarDraft(result.data.ownerAvatarUrl ?? '');
        setOwnerAvatarUploadDraft(null);
        setOwnerProfileSaved(true);
        showToast('资料已保存，新的头像也更新好了', { tone: 'success', variant: 'surface' });
      } else {
        const message = result.error?.message ?? '网络不稳定，资料未能保存';
        setOwnerProfileSaveError(message);
        showToast(message, { subtitle: '内容已保留，可修改后再次保存', tone: 'error', variant: 'surface' });
      }
    } finally {
      ownerProfileSavingRef.current = false;
      setOwnerProfileSaving(false);
    }
  }

  async function toggleFavoritePlace(place?: Place) {
    if (!place) {
      showToast('暂无可收藏地点');
      return;
    }
    if (favoritePlaceSavingIdsRef.current.has(place.id)) return;
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    const wasFavorite = favoritePlaceIds.includes(place.id);
    const nextFavorite = !wasFavorite;
    favoritePlaceSavingIdsRef.current.add(place.id);
    setFavoritePlaceSavingIds((ids) => [place.id, ...ids.filter((id) => id !== place.id)]);
    setFavoritePlaceIds((ids) => (nextFavorite ? [place.id, ...ids.filter((id) => id !== place.id)] : ids.filter((id) => id !== place.id)));
    try {
      const result = await lumiiApi.places.setFavoritePlace(place.id, nextFavorite);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        setFavoritePlaceIds(result.data);
        showToast(
          nextFavorite ? '已收藏到「想去」' : `已取消收藏 · ${place.name}`,
          nextFavorite
            ? {
                icon: 'bookmark',
                iconTone: 'orange',
                subtitle: '后续可在收藏入口集中查看',
                tone: 'success',
                variant: 'dark',
              }
            : {
                icon: 'heart',
                iconTone: 'muted',
                placement: 'bottom',
                subtitle: '已从收藏列表移除',
                tone: 'info',
                variant: 'surface',
              },
        );
      } else {
        setFavoritePlaceIds((ids) => (wasFavorite ? [place.id, ...ids.filter((id) => id !== place.id)] : ids.filter((id) => id !== place.id)));
        showToast(result.error?.message ?? '收藏状态保存失败', { tone: 'error', variant: 'surface' });
      }
    } finally {
      favoritePlaceSavingIdsRef.current.delete(place.id);
      setFavoritePlaceSavingIds((ids) => ids.filter((id) => id !== place.id));
    }
  }

  function buildPlaceShareMessage(place: Place) {
    const tags = place.tags.length ? `\n宠物友好特色：${place.tags.join('、')}` : '';
    const opening = place.openingHoursToday || place.openingHoursWeek ? `营业：${getPlaceOpeningText(place)}` : '';
    const phone = place.phone ? `电话：${place.phone}` : '';
    const rating = hasPlaceRating(place) ? `评分：${getPlaceRatingLabel(place)}` : '';
    return [
      `我在灵伴发现了一个宠物友好地点：${place.name}`,
      `地址：${place.address}`,
      `距离：${place.distance}`,
      rating,
      opening,
      phone,
      tags,
      '\n来自 Lumii 灵伴',
    ].filter(Boolean).join('\n');
  }

  async function sharePlace(place?: Place) {
    if (!place) {
      showToast('暂无可分享地点');
      return;
    }
    try {
      const result = await Share.share({
        message: buildPlaceShareMessage(place),
        title: `${place.name} - 灵伴宠物友好地点`,
      });
      if (result.action === Share.dismissedAction) return;
      showToast('地点已分享');
    } catch {
      showToast('分享失败，请稍后重试');
    }
  }

  function buildAmapWebPlaceSearchUrl(place: Place) {
    const keyword = `${place.name} ${place.address}`.trim();
    const params = new URLSearchParams({
      callnative: '1',
      keyword,
      src: 'lumii',
      view: 'map',
    });
    return `https://uri.amap.com/search?${params.toString()}`;
  }

  function buildAmapNativeUrls(place: Place) {
    const name = encodeURIComponent(place.name);
    const destinationLatitude = place.entranceLatitude ?? place.latitude;
    const destinationLongitude = place.entranceLongitude ?? place.longitude;
    const hasCoordinate = Number.isFinite(destinationLatitude) && Number.isFinite(destinationLongitude);
    if (!hasCoordinate) return [];
    const lat = String(destinationLatitude);
    const lon = String(destinationLongitude);
    return Platform.OS === 'ios'
      ? [
        `iosamap://navi?sourceApplication=Lumii&backScheme=lumii&lat=${lat}&lon=${lon}&dev=0&style=2&poiname=${name}`,
        `iosamap://path?sourceApplication=Lumii&dlat=${lat}&dlon=${lon}&dname=${name}&dev=0&t=0`,
      ]
      : [
        `androidamap://navi?sourceApplication=Lumii&lat=${lat}&lon=${lon}&dev=0&style=2&poiname=${name}`,
        `amapuri://route/plan/?sourceApplication=Lumii&dlat=${lat}&dlon=${lon}&dname=${name}&dev=0&t=0`,
      ];
  }

  async function openAmapPlace(place?: Place) {
    if (!place) {
      showToast('暂无可打开地点');
      return;
    }
    const nativeUrls = buildAmapNativeUrls(place);
    for (const nativeUrl of nativeUrls) {
      try {
        const canOpen = await Linking.canOpenURL(nativeUrl);
        if (canOpen) {
          await Linking.openURL(nativeUrl);
          return;
        }
      } catch {
        // Try the next native scheme before falling back to the web URI.
      }
    }
    try {
      await Linking.openURL(buildAmapWebPlaceSearchUrl(place));
    } catch {
      showToast('未检测到高德地图 App，且无法打开网页版导航');
    }
  }

  function openPetCompanionSettings() {
    const pet = getCurrentPet();
    if (!pet) {
      showToast('请先添加宠物档案');
      return;
    }
    go('petDetail');
  }

  async function saveMemoDraft() {
    if (memoDraftSavingRef.current) return;
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) {
      showToast('请先添加宠物档案');
      return;
    }
    if (!memoDraftTitle.trim() || !memoDraftContent.trim()) {
      showToast('请填写备忘标题和内容');
      return;
    }
    const requestTitle = memoDraftTitle.trim();
    const requestContent = memoDraftContent.trim();
    if (requestTitle.length > 20) {
      showToast('标题最多 20 个字');
      return;
    }
    if (requestContent.length > 200) {
      showToast('内容最多 200 个字');
      return;
    }
    memoDraftSavingRef.current = true;
    setMemoDraftSaving(true);
    try {
      const result = await lumiiApi.health.saveHealthMemo(requestTitle, requestContent, {
        reminderAt: memoDraftReminderEnabled ? formatMemoReminderValue(memoDraftReminderAt) : undefined,
        reminderEnabled: memoDraftReminderEnabled,
        repeat: memoDraftRepeat,
      });
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
      if (result.data) {
        setMemos((items) => [result.data!, ...items]);
        setMemoDraftTitle('');
        setMemoDraftContent('');
        setMemoDraftRepeat('quarterly');
        setMemoDraftReminderAt(defaultMemoReminderDate());
        setMemoDraftReminderEnabled(true);
        void refreshHealthSummary();
        showToast('健康备忘已保存', { subtitle: '已同步到健康日历', tone: 'success', variant: 'surface' });
        replace('healthCalendar');
      } else {
        showToast(result.error?.message ?? '保存失败，请稍后重试', { tone: 'error', variant: 'surface' });
      }
    } finally {
      memoDraftSavingRef.current = false;
      setMemoDraftSaving(false);
    }
  }

  async function saveHealthMemo() {
    if (memoSavingRef.current) return;
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) {
      showToast('请先添加宠物档案');
      return;
    }
    if (!memoTitle.trim() || !memoContent.trim()) {
      showToast('请填写标题和内容');
      return;
    }
    const requestTitle = memoTitle.trim();
    const requestContent = memoContent.trim();
    memoSavingRef.current = true;
    setMemoSaving(true);
    try {
      const result = await lumiiApi.health.saveHealthMemo(requestTitle, requestContent);
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
      if (result.data) {
        setMemos((items) => [result.data!, ...items]);
        setMemoTitle('');
        setMemoContent('');
        void refreshHealthSummary();
        showToast('健康备忘已保存', { tone: 'success', variant: 'surface' });
      } else {
        showToast(result.error?.message ?? '保存失败，请稍后重试', { tone: 'error', variant: 'surface' });
      }
    } finally {
      memoSavingRef.current = false;
      setMemoSaving(false);
    }
  }

  function openMemoEditor(memo: HealthMemo) {
    const repeat = normalizeMemoRepeat(memo.repeat);
    setSelectedMemo(memo);
    setMemoEditTitle(memo.title);
    setMemoEditContent(memo.content);
    setMemoEditRepeat(repeat);
    setMemoEditReminderEnabled(memo.reminderEnabled ?? Boolean(memo.reminderAt));
    setMemoEditReminderAt(parseMemoReminderDate(memo.reminderAt, repeat));
    go('memoEdit');
  }

  async function saveMemoEdit() {
    if (memoEditSavingRef.current) return;
    const memo = selectedMemo;
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!memo || !requestPetId) {
      showToast('请选择要编辑的备忘');
      return;
    }
    const title = memoEditTitle.trim();
    const content = memoEditContent.trim();
    if (!title || !content) {
      showToast('请填写备忘标题和内容');
      return;
    }
    if (title.length > 20) {
      showToast('标题最多 20 个字');
      return;
    }
    if (content.length > 200) {
      showToast('内容最多 200 个字');
      return;
    }
    memoEditSavingRef.current = true;
    setMemoEditSaving(true);
    try {
      const result = await lumiiApi.health.updateHealthMemo(memo.id, {
        content,
        reminderAt: memoEditReminderEnabled ? formatMemoReminderValue(memoEditReminderAt) : undefined,
        reminderEnabled: memoEditReminderEnabled,
        repeat: memoEditRepeat,
        title,
      });
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
      if (result.data) {
        setMemos((items) => items.map((item) => (item.id === result.data!.id ? result.data! : item)));
        setSelectedMemo(result.data);
        void refreshHealthSummary();
        showToast('备忘已保存', { subtitle: `${getCurrentPet()?.name ?? '灵伴'}的小日记又厚了一页`, tone: 'success', variant: 'surface' });
      } else {
        showToast(result.error?.message ?? '备忘保存失败', { tone: 'error', variant: 'surface' });
      }
    } finally {
      memoEditSavingRef.current = false;
      setMemoEditSaving(false);
    }
  }

  async function deleteSelectedMemo() {
    if (memoDeletingRef.current) return;
    const memo = selectedMemo;
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!memo || !requestPetId) return;
    memoDeletingRef.current = true;
    setMemoDeleting(true);
    try {
      const result = await lumiiApi.health.deleteHealthMemo(memo.id);
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
      if (result.data) {
        setMemos(result.data);
        setSelectedMemo(null);
        setMemoDeleteConfirmVisible(false);
        void refreshHealthSummary();
        replace('healthCalendar');
        showToast('备忘已删除', { tone: 'success', variant: 'surface' });
      } else {
        showToast(result.error?.message ?? '删除备忘失败', { tone: 'error', variant: 'surface' });
      }
    } finally {
      memoDeletingRef.current = false;
      setMemoDeleting(false);
    }
  }

  function confirmDeleteMemo() {
    if (!selectedMemo) return;
    setMemoDeleteConfirmVisible(true);
  }

  function buildDailyPostDraft(mood: DailyMood) {
    const pet = getCurrentPet();
    const petName = pet?.name ?? '宝贝';
    const latestWeight = healthSummary?.latestWeightKg ?? pet?.weightKg;
    const weightCopy = latestWeight ? `最近体重记录是 ${formatWeightKg(latestWeight)}，` : '';
    const vaccineCopy = healthSummary?.nextVaccine ? `也记得留意${healthSummary.nextVaccine.name}。` : '';
    const moodCopy: Record<DailyMood, string[]> = {
      开心: [
        `今天${petName}心情很好，一直主动靠近人，互动时眼神很亮。`,
        `${petName}今天状态很放松，散步和玩耍都很配合。`,
      ],
      活跃: [
        `今天${petName}精力很足，活动量比平时更高，回家后喝水正常。`,
        `${petName}今天很有精神，玩具互动和外出时都很积极。`,
      ],
      正常: [
        `今天${petName}整体状态正常，食欲、精神和排便都没有明显异常。`,
        `${petName}今天表现稳定，日常活动和休息节奏都比较规律。`,
      ],
      有点累: [
        `今天${petName}看起来有点累，活动后休息时间变长，需要继续观察精神和食欲。`,
        `${petName}今天没那么活跃，先减少剧烈运动，晚上留意恢复情况。`,
      ],
    };
    const variants = moodCopy[mood];
    const variant = variants[(new Date().getDate() + petName.length) % variants.length];
    return [variant, weightCopy ? `${weightCopy}可以作为后续健康趋势参考。` : '', vaccineCopy].filter(Boolean).join('');
  }

  function fillDailyPostDraft() {
    setDailyPostText(buildDailyPostDraft(dailyMood));
    showToast(`已按“${dailyMood}”生成今日记录草稿`, { tone: 'success', variant: 'surface' });
  }

  async function pickDailyPostPhoto(source: 'camera' | 'library') {
    if (dailyPhotoPickingRef.current) return;
    if (dailyPostPhotoUris.length >= 3) {
      showToast('今日小事最多添加 3 张照片');
      return;
    }
    dailyPhotoPickingRef.current = true;
    setDailyPhotoPicking(true);
    try {
      const permissionResult =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast(source === 'camera' ? '请先允许相机权限' : '请先允许访问相册', { tone: 'warning', variant: 'surface' });
        return;
      }
      const pickerResult =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              mediaTypes: ['images'],
              quality: 0.78,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsMultipleSelection: true,
              mediaTypes: ['images'],
              quality: 0.78,
              selectionLimit: Math.max(1, 3 - dailyPostPhotoUris.length),
            });
      if (pickerResult.canceled || !pickerResult.assets?.length) {
        showToast(source === 'camera' ? '已取消拍照' : '已取消选择照片');
        return;
      }
      const nextUris = pickerResult.assets.map((asset) => asset.uri).filter(Boolean);
      if (!nextUris.length) {
        showToast('没有读取到可用照片，请重新选择');
        return;
      }
      setDailyPostPhotoUris((items) => [...items, ...nextUris].slice(0, 3));
      showToast(`已添加 ${nextUris.length} 张照片`, { tone: 'success', variant: 'surface' });
    } finally {
      dailyPhotoPickingRef.current = false;
      setDailyPhotoPicking(false);
    }
  }

  async function publishDailyPost() {
    if (dailyPostSavingRef.current) return;
    const requestSessionToken = sessionTokenRef.current;
    const requestPetId = activePetIdRef.current;
    if (!requestPetId) {
      showToast('请先添加宠物档案');
      return;
    }
    if (!dailyPostText.trim()) {
      showToast('先写一点今天的小事吧');
      return;
    }
    const requestText = dailyPostText.trim();
    const photoSummary = dailyPostPhotoUris.length ? `\n附照片 ${dailyPostPhotoUris.length} 张（本次记录预览）` : '';
    dailyPostSavingRef.current = true;
    setDailyPostSaving(true);
    try {
      const result = await lumiiApi.health.saveHealthMemo('今日小事', `${requestText}${photoSummary}`);
      if (!isCurrentPetRequest(requestSessionToken, requestPetId)) return;
      if (result.data) {
        setMemos((items) => [result.data!, ...items]);
        setDailyPostText('');
        setDailyPostPhotoUris([]);
        const momentResult = await lumiiApi.social.createMoment(requestText, dailyMood, dailyPostPhotoUris.length);
        if (sessionTokenRef.current === requestSessionToken && momentResult.data) {
          setNearbyMomentsError('');
          setHomeMomentIndex(0);
          void loadNearbyMoments({ silent: true });
        } else if (sessionTokenRef.current === requestSessionToken && momentResult.error) {
          setNearbyMomentsError(momentResult.error.message);
        }
        void refreshHealthSummary();
        replace('home');
        showToast('今日小事已记录', {
          subtitle: momentResult.data ? '已同步到健康日历和附近小事' : '已同步到健康日历，小事同步稍后再试',
          tone: momentResult.data ? 'success' : 'info',
          variant: 'surface',
        });
      } else {
        showToast(result.error?.message ?? '发布失败，请稍后重试', { subtitle: '内容已留在编辑框中，不会丢失', tone: 'error', variant: 'surface' });
      }
    } finally {
      dailyPostSavingRef.current = false;
      setDailyPostSaving(false);
    }
  }

  function openGreetingSheet(owner: NearbyOwner) {
    setGreetingSheetOwner(owner);
    setGreetingMessage(`你好呀，${owner.petName}看起来好可爱，我们也在附近，想认识一下吗？`);
  }

  function closeGreetingSheet() {
    if (greetingSheetOwner && socialActionSavingIdsRef.current.has(`greet:${greetingSheetOwner.id}`)) return;
    setGreetingSheetOwner(null);
    setGreetingMessage('你好呀，我们也在附近，想认识一下吗？');
  }

  async function sendGreeting(ownerId: string) {
    const actionId = `greet:${ownerId}`;
    if (!beginSocialAction(actionId)) return;
    const requestSessionToken = sessionTokenRef.current;
    const owner = ownersRef.current.find((item) => item.id === ownerId) ?? (greetingSheetOwner?.id === ownerId ? greetingSheetOwner : undefined);
    try {
      const result = await lumiiApi.social.sendGreeting(ownerId);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        if (result.data.conversation) {
          setConversations((items) => [result.data!.conversation!, ...items.filter((item) => item.id !== result.data!.conversation!.id)]);
        }
        void loadInboxData();
        if (greetingSheetOwner?.id === ownerId) {
          setGreetingSheetOwner(null);
          setGreetingMessage('你好呀，我们也在附近，想认识一下吗？');
        }
        showToast(`已向${owner?.petName ?? '附近伙伴'}打招呼`, { tone: 'success', variant: 'surface' });
      } else {
        showToast(result.error?.message ?? '发送失败', { tone: 'error', variant: 'surface' });
      }
    } finally {
      endSocialAction(actionId);
    }
  }

  function getWalkInviteDraftStorageKey(ownerId: string) {
    const accountKey = (session?.phone || phoneValueRef.current.trim() || 'anonymous').replace(/[^\w.-]/g, '_');
    return `${WALK_INVITE_DRAFT_STORAGE_PREFIX}:${accountKey}:${ownerId}`;
  }

  function normalizeWalkInviteDraft(value: unknown, ownerId: string) {
    const draft = value as Partial<WalkInviteDraft> | null;
    if (!draft || draft.version !== 1 || draft.ownerId !== ownerId) return null;
    const place = typeof draft.place === 'string' ? draft.place : '';
    const placeAddress = typeof draft.placeAddress === 'string' ? draft.placeAddress : '';
    const placeId = typeof draft.placeId === 'string' ? draft.placeId : '';
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    const time = typeof draft.time === 'string' ? draft.time : '';
    const note = typeof draft.note === 'string' ? draft.note : '';
    const savedAt = Number(draft.savedAt || 0);
    if (!time && !place && !note) return null;
    return {
      note,
      ...(Number.isFinite(latitude) ? { latitude } : {}),
      ...(Number.isFinite(longitude) ? { longitude } : {}),
      ownerId,
      place,
      placeAddress,
      placeId,
      savedAt: Number.isFinite(savedAt) && savedAt > 0 ? savedAt : Date.now(),
      time,
      version: 1 as const,
    };
  }

  async function loadWalkInviteDraft(ownerId: string) {
    const stored = await loadLocalJsonStorage<unknown>(getWalkInviteDraftStorageKey(ownerId));
    return normalizeWalkInviteDraft(stored, ownerId);
  }

  async function deleteWalkInviteDraft(ownerId: string) {
    try {
      await deleteLocalJsonStorage(getWalkInviteDraftStorageKey(ownerId));
    } catch {
      // Draft cleanup should never block a sent invite.
    }
  }

  async function openWalkInvite(owner: NearbyOwner) {
    const requestSessionToken = sessionTokenRef.current;
    selectedOwnerIdRef.current = owner.id;
    setSelectedOwner(owner);
    let draft: null | WalkInviteDraft = null;
    try {
      draft = await loadWalkInviteDraft(owner.id);
    } catch {
      draft = null;
    }
    if (sessionTokenRef.current !== requestSessionToken || selectedOwnerIdRef.current !== owner.id) return;
    setWalkInviteTime(draft?.time || defaultWalkInviteTime());
    setWalkInvitePlace(draft?.place || '');
    setWalkInvitePlaceAddress(draft?.placeAddress || '');
    setWalkInvitePlaceId(draft?.placeId || '');
    setWalkInvitePlaceLatitude(draft?.latitude);
    setWalkInvitePlaceLongitude(draft?.longitude);
    setWalkInviteNote(draft?.note || '');
    go('walkInvite');
    if (draft) {
      const savedAt = formatClockTime(new Date(draft.savedAt));
      showToast('已恢复约遛草稿', { subtitle: `保存于 ${savedAt}`, tone: 'success', variant: 'surface' });
    }
  }

  function walkInvitePlaceMetaFor(place: Place) {
    return [place.address, place.distance].filter(Boolean).join(' · ');
  }

  function returnToWalkInviteFromMap() {
    setHistory((items) => {
      const walkInviteIndex = items.lastIndexOf('walkInvite');
      setRoute(selectedOwnerIdRef.current ? 'walkInvite' : 'discover');
      return walkInviteIndex >= 0 ? items.slice(0, walkInviteIndex) : items;
    });
  }

  function cancelWalkInvitePlacePick() {
    setWalkInvitePickingPlace(false);
    returnToWalkInviteFromMap();
  }

  function finishWalkInvitePlacePick(place: Place) {
    setSelectedPlace(place);
    setWalkInvitePlace(place.name);
    setWalkInvitePlaceAddress(walkInvitePlaceMetaFor(place));
    setWalkInvitePlaceId(place.id);
    setWalkInvitePlaceLatitude(place.latitude);
    setWalkInvitePlaceLongitude(place.longitude);
    setWalkInvitePickingPlace(false);
    returnToWalkInviteFromMap();
    showToast('已选择约遛地点', { subtitle: place.name, tone: 'success', variant: 'surface' });
  }

  function openWalkInvitePlacePicker() {
    if (!selectedOwner) {
      showToast('请选择附近主人');
      return;
    }
    setWalkInvitePickingPlace(true);
    setMapPlacesSheetExpanded(true);
    placeQueryRef.current = '';
    setPlaceQuery('');
    setPlaceFilter('all');
    setPlaceSpeciesFilter('all');
    setPlaceDistanceRadiusKm(3);
    setPlaceSortMode('distance');
    go('map');
    showToast('请选择约遛地点', { subtitle: '点击地图下方地点即可带回邀请页', tone: 'info', variant: 'surface' });
    if (!places.length) void searchPlaces({ filter: 'all', silent: true, speciesFilter: 'all' });
  }

  async function saveWalkInviteDraft() {
    if (walkDraftSavingRef.current) return;
    const owner = selectedOwner;
    if (!owner) {
      showToast('请选择附近主人');
      return;
    }
    const draft: WalkInviteDraft = {
      latitude: walkInvitePlaceLatitude,
      longitude: walkInvitePlaceLongitude,
      note: walkInviteNote.trim(),
      ownerId: owner.id,
      place: walkInvitePlace.trim(),
      placeAddress: walkInvitePlaceAddress.trim(),
      placeId: walkInvitePlaceId,
      savedAt: Date.now(),
      time: walkInviteTime.trim(),
      version: 1,
    };
    if (!draft.time && !draft.place && !draft.note) {
      showToast('先填写一点约遛内容再保存');
      return;
    }
    walkDraftSavingRef.current = true;
    setWalkDraftSaving(true);
    try {
      await saveLocalJsonStorage(getWalkInviteDraftStorageKey(owner.id), draft);
      if (selectedOwnerIdRef.current !== owner.id) return;
      const subtitle = [draft.time, draft.place].filter(Boolean).join(' · ') || '稍后继续编辑';
      showToast('约遛草稿已保存', { subtitle, tone: 'success', variant: 'surface' });
    } catch {
      showToast('草稿保存失败，请稍后重试', { tone: 'error', variant: 'surface' });
    } finally {
      walkDraftSavingRef.current = false;
      setWalkDraftSaving(false);
    }
  }

  async function createWalkInvite() {
    if (walkInviteSavingRef.current) return;
    const owner = selectedOwner;
    if (!owner) {
      showToast('请选择附近主人');
      return;
    }
    if (!walkInvitePlace.trim() || !walkInviteTime.trim()) {
      showToast('请填写地点和时间');
      return;
    }
    const requestSessionToken = sessionTokenRef.current;
    const requestOwnerId = owner.id;
    const requestPlace = walkInvitePlace.trim();
    const requestPlaceAddress = walkInvitePlaceAddress.trim();
    const requestPlaceId = walkInvitePlaceId;
    const selectedWalkPlace = requestPlaceId ? places.find((place) => place.id === requestPlaceId) ?? selectedPlace : null;
    const requestLatitude = walkInvitePlaceLatitude ?? selectedWalkPlace?.latitude;
    const requestLongitude = walkInvitePlaceLongitude ?? selectedWalkPlace?.longitude;
    const requestTime = walkInviteTime.trim();
    const requestNote = walkInviteNote.trim();
    const stillEditingSameInvite = selectedOwnerIdRef.current === requestOwnerId && routeRef.current === 'walkInvite';
    walkInviteSavingRef.current = true;
    setWalkInviteSaving(true);
    try {
      const result = await lumiiApi.social.createWalkInvite(owner.id, {
        latitude: requestLatitude,
        longitude: requestLongitude,
        note: requestNote,
        place: requestPlace,
        placeAddress: requestPlaceAddress,
        placeId: requestPlaceId,
        time: requestTime,
      });
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        const conversation =
          result.data.conversation ??
          {
            id: `walk-${Date.now()}`,
            lastMessage: `${requestTime} · ${requestPlace}`,
            name: `${owner.ownerName}和${owner.petName}`,
            unread: 0,
          };
        setConversations((items) => [conversation, ...items.filter((item) => item.id !== conversation.id)]);
        await deleteWalkInviteDraft(requestOwnerId);
        if (stillEditingSameInvite) {
          setWalkInvitePlace('');
          setWalkInvitePlaceAddress('');
          setWalkInvitePlaceId('');
          setWalkInvitePlaceLatitude(undefined);
          setWalkInvitePlaceLongitude(undefined);
          setWalkInviteNote('');
        }
        void loadInboxData();
        if (stillEditingSameInvite) {
          replace('messages');
          showToast('约遛邀请已发送', { tone: 'success', variant: 'surface' });
        }
      } else if (stillEditingSameInvite) {
        showToast(result.error?.message ?? '约遛邀请发送失败', { tone: 'error', variant: 'surface' });
      }
    } finally {
      walkInviteSavingRef.current = false;
      setWalkInviteSaving(false);
    }
  }

  async function searchPlaces(options: { filter?: 'all' | Place['category']; location?: NearbyLocationHint | null; silent?: boolean; speciesFilter?: PlaceSpeciesFilter } = {}) {
    if (placeSearchingRef.current) return;
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    const query = placeQueryRef.current.trim();
    const nextFilter = options.filter ?? 'all';
    const nextSpeciesFilter = options.speciesFilter ?? placeSpeciesFilter;
    placeSearchingRef.current = true;
    setPlaceSearching(true);
    setPlaceFilter(nextFilter);
    setPlaceSpeciesFilter(nextSpeciesFilter);
    try {
      const location = options.location ?? lastDiscoverLocationRef.current ?? undefined;
      const result = query ? await lumiiApi.places.searchPlaces(query, location) : await lumiiApi.places.listNearbyPlaces(location);
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (placeQueryRef.current.trim() !== query) return;
      if (result.data) {
        const nextPlaces = result.data;
        setPlaces(nextPlaces);
        const nextCategoryPlaces = nextFilter === 'all' ? nextPlaces : nextPlaces.filter((place) => place.category === nextFilter);
        const visibleNextPlaces = sortPlacesByMode(
          filterPlacesByDistance(filterPlacesBySpecies(nextCategoryPlaces, nextSpeciesFilter), placeDistanceRadiusKm),
          placeSortMode,
        );
        setSelectedPlace((current) => visibleNextPlaces.find((place) => place.id === current?.id) ?? visibleNextPlaces[0] ?? nextPlaces[0] ?? null);
        if (!options.silent) showToast(query ? (visibleNextPlaces.length ? `找到 ${visibleNextPlaces.length} 个地点` : '没有匹配地点') : '已刷新附近地点');
      } else {
        showToast(result.error?.message ?? '搜索失败，请稍后重试');
      }
    } finally {
      placeSearchingRef.current = false;
      setPlaceSearching(false);
    }
  }

  async function fetchNearbyOwners(options: { forceLocation?: boolean; silent?: boolean } = {}) {
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken || !userSettingsRef.current.nearbyVisible) return null;
    const requestId = discoverRequestSeqRef.current + 1;
    discoverRequestSeqRef.current = requestId;
    const location = options.forceLocation
      ? await getDiscoverLocationHint({ allowCachedOnError: false, requestId, requestSessionToken, silent: options.silent })
      : lastDiscoverLocationRef.current ?? (await getDiscoverLocationHint({ requestId, requestSessionToken, silent: options.silent }));
    if (!isCurrentDiscoverRequest(requestSessionToken, requestId)) return null;
    if (!location) return null;
    const result = await lumiiApi.social.listNearbyOwners(location ?? undefined);
    if (!isCurrentDiscoverRequest(requestSessionToken, requestId)) return null;
    if (result.data) return result.data;
    if (!options.silent) showToast(result.error?.message ?? '附近伙伴刷新失败，请稍后重试');
    if (!options.silent) setDiscoverLocationError(result.error?.message ?? '附近伙伴刷新失败，请稍后重试');
    return null;
  }

  async function loadNearbyMoments(options: { location?: NearbyLocationHint | null; silent?: boolean } = {}) {
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken || !userSettingsRef.current.nearbyVisible) {
      setNearbyMoments([]);
      setNearbyMomentsError('');
      return null;
    }
    if (nearbyMomentsLoadingRef.current) return null;
    nearbyMomentsLoadingRef.current = true;
    setNearbyMomentsLoading(true);
    try {
      const location = options.location ?? lastDiscoverLocationRef.current ?? undefined;
      const result = await lumiiApi.social.listNearbyMoments(location ?? undefined);
      if (sessionTokenRef.current !== requestSessionToken) return null;
      if (result.data) {
        setNearbyMoments(result.data);
        setNearbyMomentsError('');
        setHomeMomentIndex(0);
        return result.data;
      }
      const message = result.error?.message ?? '附近小事刷新失败，请稍后重试';
      setNearbyMomentsError(message);
      if (!options.silent) showToast(message, { tone: 'error', variant: 'surface' });
      return null;
    } finally {
      nearbyMomentsLoadingRef.current = false;
      setNearbyMomentsLoading(false);
    }
  }

  async function refreshDiscoverByPull() {
    if (discoverRefreshingRef.current) return;
    if (!userSettingsRef.current.nearbyVisible) {
      applyNearbyOwners([]);
      showToast('请先在我的页开启附近可见');
      return;
    }
    discoverRefreshingRef.current = true;
    setDiscoverRefreshing(true);
    try {
      const nextOwners = await fetchNearbyOwners({ forceLocation: true, silent: false });
      if (nextOwners) {
        applyNearbyOwners(nextOwners);
        setDiscoverLocationError('');
        setDiscoverLastRefreshedAt(Date.now());
        void loadNearbyMoments({ location: lastDiscoverLocationRef.current, silent: true });
        showToast(nextOwners.length ? '已刷新附近伙伴' : '3km 内暂时没有新的伙伴');
      }
    } finally {
      discoverRefreshingRef.current = false;
      setDiscoverRefreshing(false);
    }
  }

  function ownerMatchesDiscoverFilter(owner: NearbyOwner, filter: DiscoverFilter) {
    if (filter === 'all') return true;
    if (filter === 'dog' || filter === 'cat') return owner.species === filter;
    const tagText = owner.tags.join(' ').toLowerCase();
    if (filter === 'social') return tagText.includes('交') || tagText.includes('朋友') || tagText.includes('friend');
    return tagText.includes('约') || tagText.includes('遛') || tagText.includes('walk');
  }

  function ownerMatchesDiscoverQuery(owner: NearbyOwner, query: string) {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return true;
    const text = [
      owner.petName,
      owner.ownerName,
      speciesLabels[owner.species],
      owner.distance,
      ...owner.tags,
    ].join(' ').toLowerCase();
    return text.includes(keyword);
  }

  function clearDiscoverSearchAndFilter() {
    setDiscoverQuery('');
    setDiscoverFilter('all');
    showToast('已清除搜索和筛选条件');
  }

  function openDiscoverSearch() {
    if (discoverRefreshingRef.current) return;
    if (!discoverSearchVisible) {
      setDiscoverSearchVisible(true);
      setTimeout(() => discoverSearchInputRef.current?.focus(), 50);
      return;
    }
    if (discoverQuery.trim()) {
      showToast('已按关键词筛选附近伙伴');
      return;
    }
    void refreshDiscoverByPull();
  }

  function applyDiscoverFilter(filter: DiscoverFilter) {
    setDiscoverFilter(filter);
    const label = discoverFilterOptions.find((item) => item.key === filter)?.label ?? '全部';
    showToast(filter === 'all' ? '已显示全部附近伙伴' : `已筛选：${label}`);
  }

  function cycleDiscoverFilter() {
    const currentIndex = discoverFilterOptions.findIndex((item) => item.key === discoverFilter);
    const nextFilter = discoverFilterOptions[(currentIndex + 1) % discoverFilterOptions.length]?.key ?? 'all';
    applyDiscoverFilter(nextFilter);
  }

  function openClinicMapSearch(message = '正在查找附近宠物医院') {
    const query = '宠物医院';
    placeQueryRef.current = query;
    setPlaceQuery(query);
    setPlaceFilter('clinic');
    go('map');
    showToast(message, { tone: 'info', variant: 'surface' });
    void searchPlaces({ filter: 'clinic' });
  }

  function openVaccineClinicSearch(vaccine?: VaccinePlan) {
    openClinicMapSearch(vaccine ? `正在查找可处理${vaccine.name}的附近宠物医院` : '正在查找附近宠物医院');
  }

  async function getDiscoverLocationHint(options: { allowCachedOnError?: boolean; requestId?: number; requestSessionToken?: string; silent?: boolean } = {}): Promise<NearbyLocationHint | null> {
    const requestSessionToken = options.requestSessionToken ?? sessionTokenRef.current;
    const requestId = options.requestId ?? discoverRequestSeqRef.current;
    if (!requestSessionToken) return null;
    try {
      const permissionResult = await withOperationTimeout(
        requestLumiiPermission('location'),
        20000,
        '定位权限请求超时，请检查系统权限后重试',
      );
      if (!isCurrentDiscoverRequest(requestSessionToken, requestId)) return null;
      const nextPermissions = mergePermissionState(permissionsRef.current, { location: permissionResult.status });
      permissionsRef.current = nextPermissions;
      setPermissions(nextPermissions);
      void persistPermissionSnapshot(nextPermissions);

      if (permissionResult.status !== 'granted') {
        setDiscoverLocationError(permissionResult.message || '定位权限未开启');
        if (!options.silent) showToast(permissionResult.message);
        return null;
      }

      if (!isLumiiAmapAvailable) {
        if (!isCurrentDiscoverRequest(requestSessionToken, requestId)) return null;
        const fallback = {
          latitude: defaultMapCenter.latitude,
          longitude: defaultMapCenter.longitude,
          radiusKm: defaultDiscoverRadiusKm,
        };
        lastDiscoverLocationRef.current = fallback;
        return fallback;
      }

      const location = await withOperationTimeout(
        getLumiiAmapCurrentLocation(),
        22000,
        '定位超时，请检查 GPS、网络和定位权限后重试',
      );
      if (!isCurrentDiscoverRequest(requestSessionToken, requestId)) return null;
      const hint = {
        accuracy: location.accuracy,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: defaultDiscoverRadiusKm,
      };
      lastDiscoverLocationRef.current = hint;
      setDiscoverLocationError('');
      return hint;
    } catch (error) {
      if (!isCurrentDiscoverRequest(requestSessionToken, requestId)) return null;
      const message = error instanceof Error ? error.message : '定位失败，请稍后重试';
      setDiscoverLocationError(message);
      if (!options.silent) showToast(message, { tone: 'error', variant: 'surface' });
      return options.allowCachedOnError === false ? null : lastDiscoverLocationRef.current;
    }
  }

  async function locateMapToCurrentPosition(options: { silent?: boolean } = {}) {
    if (locatingMapRef.current) {
      if (!options.silent) showToast('正在定位，请稍候');
      return;
    }
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    locatingMapRef.current = true;
    const requestId = locatingMapRequestRef.current + 1;
    locatingMapRequestRef.current = requestId;
    setLocatingMap(true);
    try {
      const permissionResult = await withOperationTimeout(
        requestLumiiPermission('location'),
        20000,
        '定位权限请求超时，请检查系统权限后重试',
      );
      if (sessionTokenRef.current !== requestSessionToken) return;
      const nextPermissions = mergePermissionState(permissionsRef.current, { location: permissionResult.status });
      permissionsRef.current = nextPermissions;
      setPermissions(nextPermissions);
      void persistPermissionSnapshot(nextPermissions);

      if (permissionResult.status !== 'granted') {
        setMapLocationError(permissionResult.message || '请检查定位权限是否已开启');
        if (!options.silent) {
          showToast(permissionResult.message);
        }
        return;
      }

      if (!isLumiiAmapAvailable) {
        if (sessionTokenRef.current !== requestSessionToken) return;
        const fallbackLocation = {
          latitude: defaultMapCenter.latitude,
          longitude: defaultMapCenter.longitude,
          radiusKm: defaultDiscoverRadiusKm,
        };
        lastDiscoverLocationRef.current = fallbackLocation;
        setMapCenter(defaultMapCenter);
        setMapLocationError('');
        void searchPlaces({ location: fallbackLocation, silent: true });
        if (!options.silent) showToast('当前预览环境使用模拟地图，真机将调用高德定位');
        return;
      }

      const location = await withOperationTimeout(
        getLumiiAmapCurrentLocation(),
        22000,
        '定位超时，请检查 GPS、网络和定位权限后重试',
      );
      if (sessionTokenRef.current !== requestSessionToken) return;
      const accuracy = location.accuracy ? Math.round(location.accuracy) : undefined;
      const locationHint = {
        accuracy: location.accuracy,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: defaultDiscoverRadiusKm,
      };
      lastDiscoverLocationRef.current = locationHint;
      setMapCenter({
        latitude: location.latitude,
        longitude: location.longitude,
        markerSnippet: location.address || (accuracy ? `定位精度约 ${accuracy} 米` : '已定位到当前位置'),
        markerTitle: '我的当前位置',
        zoom: accuracy && accuracy > 500 ? 15 : 16,
      });
      setMapLocationError('');
      void searchPlaces({ location: locationHint, silent: options.silent });
      if (!options.silent) showToast(accuracy ? `已定位，精度约 ${accuracy} 米` : '已定位到当前位置');
    } catch (error) {
      if (sessionTokenRef.current !== requestSessionToken) return;
      const message = error instanceof Error ? error.message : '定位失败，请稍后重试';
      setMapLocationError(message);
      if (!options.silent) {
        showToast(message);
      }
    } finally {
      if (locatingMapRequestRef.current === requestId) {
        locatingMapRef.current = false;
        setLocatingMap(false);
      }
    }
  }

  async function createPlaceReview() {
    if (placeReviewSavingRef.current) return;
    const place = selectedPlace;
    if (!place) {
      showToast('地点已失效，请返回地图重新选择');
      return;
    }
    if (!placeReviewDraft.trim()) {
      showToast('请填写点评内容');
      return;
    }
    const reviewFeatureTags = [...selectedPlaceFeatureTags];
    const reviewContent = placeReviewDraft.trim();
    const reviewDraft = `${buildPlaceSubmissionExperience(reviewFeatureTags, reviewContent)}${buildPlacePhotoSummary()}`;
    const submittedAt = formatClockTime();
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    placeReviewSavingRef.current = true;
    setPlaceSubmitResult(null);
    setPlaceReviewSaving(true);
    try {
      const result = await lumiiApi.places.createReview(place.id, reviewDraft);
      const stillReviewingSamePlace =
        sessionTokenRef.current === requestSessionToken &&
        selectedPlaceIdRef.current === place.id &&
        (routeRef.current === 'placeDetail' || routeRef.current === 'addPlaceReview');
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        await deletePlaceComposerDraft('review', place.id);
        const hadReviewForPlace = Boolean(placeReviewsByPlaceId[place.id]);
        if (!hadReviewForPlace) {
          setPlaces((items) => items.map((item) => (item.id === place.id ? { ...item, reviewCount: (item.reviewCount ?? 0) + 1 } : item)));
          setSelectedPlace((current) => (current?.id === place.id ? { ...current, reviewCount: (current.reviewCount ?? 0) + 1 } : current));
        }
        if (stillReviewingSamePlace) setPlaceReviewDraft('');
        if (stillReviewingSamePlace) setPlacePhotoUris([]);
        if (stillReviewingSamePlace) setSelectedPlaceFeatureTags([]);
        if (stillReviewingSamePlace) setCustomPlaceFeatureDraft('');
        if (stillReviewingSamePlace) setCustomPlaceFeatureVisible(false);
        if (stillReviewingSamePlace) setPlaceSubmissionRating(5);
        setPlaceReviewsByPlaceId((items) => ({ ...items, [place.id]: result.data! }));
        void loadInboxData();
        if (stillReviewingSamePlace) {
          setPlaceSubmitResult({
            draft: reviewDraft,
            kind: 'review',
            placeMeta: `${place.address} · ${place.distance}`,
            placeName: place.name,
            status: 'success',
            submittedAt: formatTimestampDisplay(result.data.createdAt, submittedAt),
          });
        }
      } else if (stillReviewingSamePlace) {
        setPlaceSubmitResult({
          draft: reviewDraft,
          kind: 'review',
          placeMeta: `${place.address} · ${place.distance}`,
          placeName: place.name,
          status: 'error',
          submittedAt,
        });
      }
    } finally {
      placeReviewSavingRef.current = false;
      setPlaceReviewSaving(false);
    }
  }

  function togglePlaceFeatureTag(tag: string) {
    setSelectedPlaceFeatureTags((items) =>
      items.includes(tag) ? items.filter((item) => item !== tag) : [...items, tag],
    );
  }

  function addCustomPlaceFeatureTag() {
    const tag = customPlaceFeatureDraft.trim();
    if (!tag) {
      setCustomPlaceFeatureVisible(true);
      setTimeout(() => customPlaceFeatureInputRef.current?.focus(), 50);
      return;
    }
    if (tag.length > 8) {
      showToast('特色标签最多 8 个字');
      return;
    }
    if ([...placeFriendlyFeatureOptions, ...selectedPlaceFeatureTags].includes(tag)) {
      showToast('这个特色已经添加过了');
      return;
    }
    setSelectedPlaceFeatureTags((items) => [...items, tag]);
    setCustomPlaceFeatureDraft('');
    setCustomPlaceFeatureVisible(false);
    showToast(`已添加特色：${tag}`, { tone: 'success', variant: 'surface' });
  }

  function buildPlaceSubmissionExperience(tags: string[], content: string) {
    return [tags.length ? `宠物友好特色：${tags.join('、')}` : '', `推荐评分：${placeSubmissionRating} 星`, content.trim()].filter(Boolean).join('。');
  }

  function buildPlacePhotoSummary(count = placePhotoUris.length) {
    return count ? `\n附照片 ${count} 张（本次提交预览）` : '';
  }

  function normalizePlaceDraftTextArray(value: unknown, maxCount = 8) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .filter((item, index, items) => items.indexOf(item) === index)
      .slice(0, maxCount);
  }

  function normalizePlaceDraftRating(value: unknown) {
    const rating = Number(value);
    if (!Number.isFinite(rating)) return 5;
    return Math.min(5, Math.max(1, Math.round(rating)));
  }

  function getPlaceComposerDraftStorageKey(kind: PlaceComposerDraft['kind'], placeId?: string) {
    const accountKey = (session?.phone || phoneValueRef.current.trim() || 'anonymous').replace(/[^\w.-]/g, '_');
    const targetKey = kind === 'review' ? placeId || 'unknown-place' : 'new-place';
    return `${PLACE_COMPOSER_DRAFT_STORAGE_PREFIX}:${accountKey}:${kind}:${targetKey}`;
  }

  function normalizePlaceComposerDraft(value: unknown, kind: PlaceComposerDraft['kind'], placeId?: string) {
    const draft = value as Partial<PlaceComposerDraft> | null;
    if (!draft || draft.version !== 1 || draft.kind !== kind) return null;
    if (kind === 'review' && draft.placeId !== placeId) return null;
    const featureTags = normalizePlaceDraftTextArray(draft.featureTags);
    const photoUris = normalizePlaceDraftTextArray(draft.photoUris, 3);
    const name = typeof draft.name === 'string' ? draft.name.trim() : '';
    const address = typeof draft.address === 'string' ? draft.address.trim() : '';
    const reviewDraft = typeof draft.reviewDraft === 'string' ? draft.reviewDraft.trim() : '';
    const experience = typeof draft.experience === 'string' ? draft.experience.trim() : '';
    const customFeatureDraft = typeof draft.customFeatureDraft === 'string' ? draft.customFeatureDraft.trim() : '';
    const savedAt = Number(draft.savedAt || 0);
    const hasContent =
      kind === 'place'
        ? Boolean(name || address || experience || featureTags.length || photoUris.length || customFeatureDraft)
        : Boolean(reviewDraft || experience || featureTags.length || photoUris.length || customFeatureDraft);
    if (!hasContent) return null;
    return {
      address,
      customFeatureDraft,
      customFeatureVisible: Boolean(draft.customFeatureVisible && customFeatureDraft),
      experience,
      featureTags,
      kind,
      name,
      photoUris,
      placeId: kind === 'review' ? placeId : undefined,
      rating: normalizePlaceDraftRating(draft.rating),
      reviewDraft,
      savedAt: Number.isFinite(savedAt) && savedAt > 0 ? savedAt : Date.now(),
      version: 1 as const,
    };
  }

  async function loadPlaceComposerDraft(kind: PlaceComposerDraft['kind'], placeId?: string) {
    const stored = await loadLocalJsonStorage<unknown>(getPlaceComposerDraftStorageKey(kind, placeId));
    return normalizePlaceComposerDraft(stored, kind, placeId);
  }

  async function savePlaceComposerDraft(draft: PlaceComposerDraft) {
    await saveLocalJsonStorage(getPlaceComposerDraftStorageKey(draft.kind, draft.placeId), draft);
  }

  async function deletePlaceComposerDraft(kind: PlaceComposerDraft['kind'], placeId?: string) {
    try {
      await deleteLocalJsonStorage(getPlaceComposerDraftStorageKey(kind, placeId));
    } catch {
      // Draft cleanup should never block a successful submission.
    }
  }

  function buildCurrentPlaceComposerDraft(kind: PlaceComposerDraft['kind']) {
    const place = selectedPlace;
    const featureTags = normalizePlaceDraftTextArray(selectedPlaceFeatureTags);
    const photoUris = normalizePlaceDraftTextArray(placePhotoUris, 3);
    const customFeatureDraft = customPlaceFeatureDraft.trim();
    const draft: PlaceComposerDraft = {
      address: kind === 'place' ? placeDraftAddress.trim() : place ? `${place.address} · ${place.distance}` : '',
      customFeatureDraft,
      customFeatureVisible: Boolean(customPlaceFeatureVisible && customFeatureDraft),
      experience: placeSubmissionExperience.trim(),
      featureTags,
      kind,
      name: kind === 'place' ? placeDraftName.trim() : place?.name ?? '',
      photoUris,
      placeId: kind === 'review' ? place?.id : undefined,
      rating: normalizePlaceDraftRating(placeSubmissionRating),
      reviewDraft: placeReviewDraft.trim(),
      savedAt: Date.now(),
      version: 1,
    };
    const hasContent =
      kind === 'place'
        ? Boolean(draft.name || draft.address || draft.experience || draft.featureTags.length || draft.photoUris.length || draft.customFeatureDraft)
        : Boolean(draft.placeId && (draft.reviewDraft || draft.featureTags.length || draft.photoUris.length || draft.customFeatureDraft));
    return hasContent ? draft : null;
  }

  function applyPlaceComposerDraft(draft: PlaceComposerDraft) {
    setPlacePhotoUris(draft.photoUris);
    setSelectedPlaceFeatureTags(draft.featureTags);
    setCustomPlaceFeatureDraft(draft.customFeatureDraft);
    setCustomPlaceFeatureVisible(draft.customFeatureVisible);
    setPlaceSubmissionRating(draft.rating);
    if (draft.kind === 'review') {
      setPlaceDraftName('');
      setPlaceDraftAddress('');
      setPlaceSubmissionExperience('');
      setPlaceReviewDraft(draft.reviewDraft || draft.experience);
      return;
    }
    setPlaceReviewDraft('');
    setPlaceDraftName(draft.name);
    setPlaceDraftAddress(draft.address);
    setPlaceSubmissionExperience(draft.experience);
  }

  async function pickPlacePhoto() {
    if (placePhotoPickingRef.current) return;
    if (placePhotoUris.length >= 3) {
      showToast('地点照片最多添加 3 张');
      return;
    }
    placePhotoPickingRef.current = true;
    setPlacePhotoPicking(true);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast('请先允许访问相册', { subtitle: '授权后才能添加地点照片', tone: 'warning', variant: 'surface' });
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        quality: 0.78,
        selectionLimit: Math.max(1, 3 - placePhotoUris.length),
      });
      if (pickerResult.canceled || !pickerResult.assets?.length) {
        showToast('已取消选择照片');
        return;
      }
      const nextUris = pickerResult.assets.map((asset) => asset.uri).filter(Boolean);
      if (!nextUris.length) {
        showToast('没有读取到可用照片，请重新选择');
        return;
      }
      setPlacePhotoUris((items) => [...items, ...nextUris].slice(0, 3));
      showToast(`已添加 ${nextUris.length} 张地点照片`, { tone: 'success', variant: 'surface' });
    } finally {
      placePhotoPickingRef.current = false;
      setPlacePhotoPicking(false);
    }
  }

  async function openPlaceSubmissionComposer() {
    const requestSessionToken = sessionTokenRef.current;
    setPlaceComposerMode('place');
    setPlaceSubmitResult(null);
    placePhotoPickingRef.current = false;
    setPlacePhotoPicking(false);
    let draft: null | PlaceComposerDraft = null;
    try {
      draft = await loadPlaceComposerDraft('place');
    } catch {
      draft = null;
    }
    if (sessionTokenRef.current !== requestSessionToken) return;
    if (draft) {
      applyPlaceComposerDraft(draft);
    } else {
      setPlacePhotoUris([]);
      setSelectedPlaceFeatureTags([]);
      setCustomPlaceFeatureDraft('');
      setCustomPlaceFeatureVisible(false);
      setPlaceSubmissionRating(5);
      setPlaceDraftName('');
      setPlaceDraftAddress('');
      setPlaceSubmissionExperience('');
      setPlaceReviewDraft('');
    }
    go('addPlaceReview');
    if (draft) {
      showToast('已恢复新增地点草稿', { subtitle: `保存于 ${formatClockTime(new Date(draft.savedAt))}`, tone: 'success', variant: 'surface' });
    }
  }

  async function openPlaceReviewComposer(place: Place) {
    const requestSessionToken = sessionTokenRef.current;
    selectedPlaceIdRef.current = place.id;
    setSelectedPlace(place);
    setPlaceComposerMode('review');
    setPlaceSubmitResult(null);
    placePhotoPickingRef.current = false;
    setPlacePhotoPicking(false);
    let draft: null | PlaceComposerDraft = null;
    try {
      draft = await loadPlaceComposerDraft('review', place.id);
    } catch {
      draft = null;
    }
    if (sessionTokenRef.current !== requestSessionToken || selectedPlaceIdRef.current !== place.id) return;
    if (draft) {
      applyPlaceComposerDraft(draft);
    } else {
      setPlacePhotoUris([]);
      setSelectedPlaceFeatureTags(place.tags.slice(0, 3));
      setCustomPlaceFeatureDraft('');
      setCustomPlaceFeatureVisible(false);
      setPlaceSubmissionRating(5);
      setPlaceReviewDraft('');
      setPlaceSubmissionExperience('');
      setPlaceDraftName('');
      setPlaceDraftAddress('');
    }
    go('addPlaceReview');
    if (draft) {
      showToast('已恢复点评草稿', { subtitle: `保存于 ${formatClockTime(new Date(draft.savedAt))}`, tone: 'success', variant: 'surface' });
    }
  }

  async function submitPlaceDraft() {
    if (placeSubmissionSavingRef.current) return;
    if (!placeDraftName.trim() || !placeDraftAddress.trim()) {
      showToast('请填写地点名称和地址');
      return;
    }
    if (!placeSubmissionExperience.trim() && !selectedPlaceFeatureTags.length) {
      showToast('请填写宠物友好体验');
      return;
    }
    const requestSessionToken = sessionTokenRef.current;
    if (!requestSessionToken) return;
    const requestName = placeDraftName.trim();
    const requestAddress = placeDraftAddress.trim();
    const requestFeatureTags = [...selectedPlaceFeatureTags];
    const requestExperience = `${buildPlaceSubmissionExperience(requestFeatureTags, placeSubmissionExperience)}${buildPlacePhotoSummary()}`;
    const submittedAt = formatClockTime();
    placeSubmissionSavingRef.current = true;
    setPlaceSubmitResult(null);
    setPlaceSubmissionSaving(true);
    try {
      const result = await lumiiApi.places.createSubmission(requestName, requestAddress, requestExperience);
      const stillEditingSubmission = sessionTokenRef.current === requestSessionToken && routeRef.current === 'addPlaceReview';
      if (sessionTokenRef.current !== requestSessionToken) return;
      if (result.data) {
        await deletePlaceComposerDraft('place');
        if (stillEditingSubmission) {
          setPlaceSubmissionExperience('');
          setPlaceDraftName('');
          setPlaceDraftAddress('');
          setPlacePhotoUris([]);
          setSelectedPlaceFeatureTags([]);
          setCustomPlaceFeatureDraft('');
          setCustomPlaceFeatureVisible(false);
          setPlaceSubmissionRating(5);
          setPlaceSubmissionStatus('pending_review');
        }
        void loadInboxData();
        if (stillEditingSubmission) {
          setPlaceSubmitResult({
            draft: requestExperience,
            kind: 'place',
            placeMeta: requestAddress,
            placeName: requestName,
            status: 'success',
            submittedAt: formatTimestampDisplay(result.data.createdAt, submittedAt),
          });
        }
      } else if (stillEditingSubmission) {
        setPlaceSubmitResult({
          draft: requestExperience,
          kind: 'place',
          placeMeta: requestAddress,
          placeName: requestName,
          status: 'error',
          submittedAt,
        });
      }
    } finally {
      placeSubmissionSavingRef.current = false;
      setPlaceSubmissionSaving(false);
    }
  }

  function clearLocalAccountState() {
    if (localHealthReminderScheduledIdsRef.current.length) void cancelVaccineLocalReminders(localHealthReminderScheduledIdsRef.current);
    clearScheduledPushRegistration();
    setLumiiAuthToken();
    setConfirm(null);
    setAmapNavigationPlace(null);
    setToast(null);
    setSession(null);
    setBootPetAvatarUri(null);
    activePetIdRef.current = null;
    setActivePet(null);
    setPets([]);
    petSwitchingIdRef.current = '';
    setPetSwitchingId('');
    petDeletingIdRef.current = '';
    setPetDeletingId('');
    setHistory([]);
    phoneValueRef.current = '';
    setPhone('');
    setPhoneFocused(false);
    setAgreementAccepted(false);
    setAgreementAttention(false);
    setLoginInlineError('');
    sendLoadingRef.current = false;
    setSendLoading(false);
    verifyLoadingRef.current = false;
    setVerifyLoading(false);
    setLoginSuccessLoading(false);
    setOtpCode('');
    otpMetaRef.current = null;
    setOtpMeta(null);
    setOtpInlineError('');
    setCooldownUntil(0);
    setClock(Date.now());
    setPermissions(initialPermissions);
    setPetDraft(emptyPetDraft);
    petProfileSavingRef.current = false;
    setPetProfileSaving(false);
    mediaPickingRef.current = false;
    mediaIdRef.current = null;
    setMedia(null);
    setMediaPickerMode(null);
    avatarJobIdRef.current = null;
    avatarPollingJobIdRef.current = null;
    avatarStartingRef.current = false;
    setAvatarJob(null);
    setAvatarStarting(false);
    setAvatarResultPrefetching(false);
    avatarAcceptingRef.current = false;
    setAvatarAccepting(false);
    avatarRetryingRef.current = false;
    setAvatarRetrying(false);
    avatarResultRouteJobIdRef.current = '';
    avatarTransitioningJobIdRef.current = null;
    setSelectedAvatarCandidateIndex(0);
    setAvatarFeedbackSheetVisible(false);
    setAvatarFeedbackChipIds(defaultAvatarFeedbackChipIds);
    avatarFeedbackSubmittingRef.current = false;
    setAvatarFeedbackSubmitting(false);
    setAvatarRegenerateConfirmVisible(false);
    registeredPushTokenRef.current = '';
    sessionTokenRef.current = '';
    setChatMessages([createPetChatWelcomeMessage()]);
    setChatInput('');
    setChatFeedbackById({});
    chatFeedbackSavingIdsRef.current.clear();
    setChatFeedbackSavingIds([]);
    chatReplyingRef.current = false;
    setChatReplying(false);
    setAiUsage(null);
    setPetChatDailyCount(0);
    setHealthCalendarEvents([]);
    setHealthCalendarError('');
    healthCalendarLoadingRef.current = false;
    setHealthCalendarLoading(false);
    setHealthCalendarRefreshing(false);
    setHealthCalendarMonth(monthStartIso());
    setSelectedHealthCalendarDate(todayIsoDate());
    setWeights([]);
    setWeightEditorMode(null);
    setWeightEditRecord(null);
    setWeightDraftRecordedAt(new Date());
    setWeightEditValue('');
    setWeightEditNote('');
    weightEditSavingRef.current = false;
    setWeightEditSaving(false);
    setVaccines([]);
    setVaccineReminderIds([]);
    setMemos([]);
    setConversations([]);
    setSelectedConversation(null);
    selectedConversationIdRef.current = null;
    inboxRefreshInFlightRef.current = false;
    inboxRefreshQueuedRef.current = false;
    conversationRefreshInFlightRef.current = null;
    conversationSendingKeysRef.current.clear();
    localConversationMessageIdsRef.current = {};
    inboxManualRefreshingRef.current = false;
    setInboxManualRefreshing(false);
    setConversationDraftsById({});
    setConversationMessages([createConversationSafetyMessage()]);
    setNotifications([]);
    setNotificationSeenAtById({});
    notificationSeenAtByIdRef.current = {};
    discoverRequestSeqRef.current += 1;
    applyNearbyOwners([]);
    setPlaceSubmitResult(null);
    discoverRefreshingRef.current = false;
    setDiscoverRefreshing(false);
    setDiscoverFilter('all');
    setDiscoverQuery('');
    setDiscoverSearchVisible(false);
    setGreetingRequestOwners([]);
    greetingRequestOwnersRef.current = [];
    setGreetingRequestSeenAtById({});
    greetingRequestSeenAtByIdRef.current = {};
    socialActionSavingIdsRef.current.clear();
    setSocialActionSavingIds([]);
    walkInviteSavingRef.current = false;
    setWalkInviteSaving(false);
    walkDraftSavingRef.current = false;
    setWalkDraftSaving(false);
    selectedOwnerIdRef.current = null;
    setSelectedOwner(null);
    setGreetingSheetOwner(null);
    setGreetingMessage('你好呀，我们也在附近，想认识一下吗？');
    setWalkInvitePlace('');
    setWalkInvitePlaceAddress('');
    setWalkInvitePlaceId('');
    setWalkInvitePlaceLatitude(undefined);
    setWalkInvitePlaceLongitude(undefined);
    setWalkInvitePickingPlace(false);
    setWalkInviteTime(defaultWalkInviteTime());
    setWalkInviteNote('');
    setPlaces([]);
    placeQueryRef.current = '';
    setPlaceQuery('');
    setPlaceFilter('all');
    setPlaceDistanceRadiusKm(3);
    setPlaceSpeciesFilter('all');
    setPlaceSortMode('distance');
    placeSearchingRef.current = false;
    setPlaceSearching(false);
    selectedPlaceIdRef.current = null;
    setSelectedPlace(null);
    setFavoritePlaceIds([]);
    favoritePlaceSavingIdsRef.current.clear();
    setFavoritePlaceSavingIds([]);
    setPlaceReviewsByPlaceId({});
    setCustomPlaceFeatureDraft('');
    setCustomPlaceFeatureVisible(false);
    locatingMapRef.current = false;
    locatingMapRequestRef.current += 1;
    setLocatingMap(false);
    setMapLocationError('');
    setMapCenter(defaultMapCenter);
    setMapStyleKey('lumii');
    setMapTrafficEnabled(false);
    setMapStylePanelVisible(false);
    mapAutoLocateAttemptedRef.current = false;
    lastDiscoverLocationRef.current = null;
    setPlaceDraftAddress('');
    setPlaceDraftName('');
    setPlaceComposerMode('place');
    setPlaceReviewDraft('');
    setPlaceSubmissionExperience('');
    setPlaceSubmissionRating(5);
    placePhotoPickingRef.current = false;
    setPlacePhotoPicking(false);
    setPlacePhotoUris([]);
    setSelectedPlaceFeatureTags([]);
    placeReviewSavingRef.current = false;
    setPlaceReviewSaving(false);
    placeDraftSavingRef.current = false;
    setPlaceDraftSaving(false);
    placeSubmissionSavingRef.current = false;
    setPlaceSubmissionSaving(false);
    setPlaceSubmissionStatus('idle');
    userSettingSavingKeysRef.current.clear();
    setHealthSummary(null);
    weightSavingRef.current = false;
    setWeightSaving(false);
    setMemoTitle('');
    setMemoContent('');
    memoSavingRef.current = false;
    setMemoSaving(false);
    setSelectedMemo(null);
    setMemoEditTitle('');
    setMemoEditContent('');
    memoEditSavingRef.current = false;
    setMemoEditSaving(false);
    memoDeletingRef.current = false;
    setMemoDeleting(false);
    setMemoDeleteConfirmVisible(false);
    setMemoDraftTitle('');
    setMemoDraftContent('');
    setMemoDraftRepeat('quarterly');
    setMemoDraftReminderAt(defaultMemoReminderDate());
    setMemoDraftReminderEnabled(true);
    setMemoEditRepeat('none');
    setMemoEditReminderAt(defaultMemoReminderDate());
    setMemoEditReminderEnabled(false);
    memoDraftSavingRef.current = false;
    setMemoDraftSaving(false);
    vaccineReminderSavingIdsRef.current.clear();
    setVaccineReminderSavingIds([]);
    vaccineDoneSavingIdsRef.current.clear();
    setVaccineDoneSavingIds([]);
    setVaccineComposerVisible(false);
    setVaccineNameDraft('');
    setVaccineDueDraft('');
    vaccineCreatingRef.current = false;
    setVaccineCreating(false);
    setDailyPostText('');
    setDailyPostPhotoUris([]);
    dailyPhotoPickingRef.current = false;
    setDailyPhotoPicking(false);
    setDailyMood('开心');
    dailyPostSavingRef.current = false;
    setDailyPostSaving(false);
    healthReminderNotifiedRef.current.clear();
    localHealthReminderScheduledIdsRef.current = [];
    localHealthReminderSyncKeyRef.current = '';
    setUserSettings(defaultUserSettings);
    setOwnerNameDraft('');
    setOwnerBioDraft('');
    setOwnerAvatarDraft('');
    setOwnerAvatarUploadDraft(null);
    ownerAvatarPickingRef.current = false;
    setOwnerAvatarPicking(false);
    ownerProfileSavingRef.current = false;
    setOwnerProfileSaving(false);
    setOwnerProfileSaved(false);
    replace('login');
  }

  async function logout() {
    try {
      await lumiiApi.auth.logout();
    } finally {
      setLogoutConfirmVisible(false);
      await clearPersistedLumiiSession();
      clearLocalAccountState();
    }
    showToast('已退出登录');
  }

  function openConfirm(title: string, body: string, onConfirm: () => void, confirmText?: string) {
    setConfirm({ body, confirmText, onConfirm, title });
  }

  const Screen = useCallback(
    function ScreenView({ children, refreshControl, right, showBack = true, title }: { children: ReactNode; refreshControl?: ReactElement<RefreshControlProps>; right?: ReactNode; showBack?: boolean; title?: string }) {
      const headerTitle = title ?? routeTitles[route] ?? '灵伴';
      const hideHeader = Boolean(placeSubmitResult) || route === 'login' || route === 'home' || route === 'discover' || route === 'map' || route === 'messages' || route === 'notifications' || route === 'profile' || route === 'chat' || route === 'conversation' || route === 'placeDetail';
      const isLoginRoute = route === 'login';
      const isOtpRoute = route === 'otp';
      const isMapRoute = route === 'map';
      const isPetChatRoute = route === 'chat';
      const isConversationRoute = route === 'conversation';
      const isProfileRoute = route === 'profile';
      const keyboardAwareContentInset = keyboardHeight > 0 && Platform.OS !== 'web'
        ? { paddingBottom: Math.max(showBottomTabs ? 110 : 32, Math.min(keyboardHeight + 36, 420)) }
        : null;
      return (
        <View style={styles.screen}>
          {Platform.OS === 'web' ? <PhoneStatusBar /> : null}
          {hideHeader ? null : (
            <View style={[styles.header, isOtpRoute && styles.otpHeader]}>
              <View style={[styles.headerRow, isOtpRoute && styles.otpHeaderRow]}>
                {showBack ? (
                  <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={back} style={[styles.iconButton, isOtpRoute && styles.otpIconButton]}>
                    <ChevronLeft color={palette.ink} size={20} strokeWidth={2.6} />
                  </Pressable>
                ) : (
                  <View style={[styles.headerSpacer, isOtpRoute && styles.otpHeaderSpacer]} />
                )}
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                {right ? <View style={[styles.headerActionSlot, isOtpRoute && styles.otpHeaderSpacer]}>{right}</View> : <View style={[styles.headerSpacer, isOtpRoute && styles.otpHeaderSpacer]} />}
              </View>
            </View>
          )}
          {isOtpRoute ? (
            <View style={styles.otpContent}>{children}</View>
          ) : isMapRoute ? (
            <View style={styles.mapContent}>{children}</View>
          ) : isPetChatRoute || isConversationRoute ? (
            <View style={[styles.content, styles.chatRouteContent]}>{children}</View>
          ) : isLoginRoute ? (
            <View style={[styles.content, styles.loginContent]}>{children}</View>
          ) : isProfileRoute ? (
            <ScrollView
              contentContainerStyle={[styles.profileRouteContent, showBottomTabs && styles.contentWithTabs, keyboardAwareContentInset]}
              keyboardDismissMode="none"
              keyboardShouldPersistTaps="always"
              refreshControl={refreshControl}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.content, showBottomTabs && styles.contentWithTabs, keyboardAwareContentInset]}
              keyboardDismissMode="none"
              keyboardShouldPersistTaps="always"
              refreshControl={refreshControl}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          )}
        </View>
      );
    },
    [back, keyboardHeight, placeSubmitResult, route, showBottomTabs],
  );

  function renderLogin() {
    const loginSendDisabled = sendLoading || cooldownRemaining > 0 || phone.trim().length === 0;
    const loginSendCountdown = cooldownRemaining > 0;
    return (
      <Screen showBack={false}>
        <View style={styles.loginHero}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <PawPrint color="#fff" size={20} strokeWidth={2.4} />
            </View>
            <Text style={styles.logoText}>Lumii 灵伴</Text>
          </View>
          <View style={styles.loginTitleBlock}>
            <Text style={styles.loginTitle}>你好呀，</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.9} numberOfLines={1} style={styles.loginTitleLine}>
              准备好遇见你的灵伴了吗？
            </Text>
          </View>
          <Text style={styles.loginSubtitle}>使用手机号快速登录，开启与猫狗的温暖陪伴</Text>
        </View>

        <View style={styles.loginForm}>
          <Pressable
            accessibilityLabel="请输入中国大陆手机号"
            accessibilityRole="button"
            onPress={() => phoneInputRef.current?.focus()}
            style={[styles.phoneInputShell, phoneFocused && styles.phoneInputShellFocused, webPressableReset]}
          >
            <Text style={styles.countryCode}>+86</Text>
            <View style={styles.phoneDivider} />
            <TextInput
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect={false}
              importantForAutofill="no"
              keyboardType="phone-pad"
              maxLength={11}
              onBlur={() => {
                if (Platform.OS === 'web') setPhoneFocused(false);
              }}
              onChangeText={(value) => {
                const nextPhone = value.replace(/\D/g, '').slice(0, 11);
                phoneValueRef.current = nextPhone;
                setPhone(nextPhone);
                if (loginInlineError) setLoginInlineError('');
              }}
              onFocus={() => {
                if (Platform.OS === 'web') setPhoneFocused(true);
              }}
              placeholder="请输入中国大陆手机号"
              placeholderTextColor="#b6aca3"
              ref={phoneInputRef}
              returnKeyType="done"
              showSoftInputOnFocus
              style={[styles.phoneInput, webTextInputReset]}
              textContentType="none"
              underlineColorAndroid="transparent"
              value={phone}
            />
          </Pressable>
          {loginInlineError ? <InlineErrorMake text={loginInlineError} /> : null}
          <Pressable
            disabled={loginSendDisabled}
            onPress={() => void requestSmsCode('login')}
            style={({ pressed }) => [
              styles.loginSmsButton,
              loginSendDisabled && !sendLoading && styles.loginSmsButtonDisabled,
              loginSendCountdown && styles.loginSmsButtonCountdown,
              pressed && !loginSendDisabled && styles.loginSmsButtonPressed,
              webPressableReset,
            ]}
          >
            {sendLoading ? <ActivityIndicator color="#fff" size="small" /> : null}
            <Text style={[styles.loginSmsButtonText, loginSendCountdown && styles.loginSmsButtonTextCountdown]}>
              {sendLoading ? '发送中...' : cooldownRemaining > 0 ? `${cooldownRemaining}s 后重试` : '获取验证码'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="同意用户协议与隐私政策"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreementAccepted }}
            hitSlop={8}
            onPress={() => {
              setAgreementAttention(false);
              setAgreementAccepted((value) => !value);
            }}
            style={[styles.agreementRow, webPressableReset]}
          >
            <View style={[styles.checkbox, agreementAccepted && styles.checkboxChecked, agreementAttention && !agreementAccepted && styles.checkboxAttention]}>{agreementAccepted ? <Check color="#fff" size={13} strokeWidth={3} /> : null}</View>
            <Text style={[styles.agreementText, agreementAttention && !agreementAccepted && styles.agreementTextAttention]}>我已阅读并同意《用户协议》《隐私政策》</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  function getSessionLoadingAvatarUri() {
    const bootAvatarUri = bootPetAvatarUri ?? activePet?.avatarUrl ?? session?.account?.activePet?.avatarUrl ?? null;
    return bootAvatarUri && !isGeneratedAvatarUri(bootAvatarUri) ? bootAvatarUri : null;
  }

  function renderSessionBootstrapping() {
    const bootAvatarUri = getSessionLoadingAvatarUri();
    return (
      <View style={styles.bootPage}>
        {bootAvatarUri ? <PetAvatar size={96} uri={bootAvatarUri} /> : <Mascot size={96} />}
        <ActivityIndicator color={palette.orange} size="small" />
        <Text style={styles.bootText}>正在进入灵伴</Text>
      </View>
    );
  }

  function renderLoginSuccessLoading() {
    const loginAvatarUri = getSessionLoadingAvatarUri();
    return (
      <View style={styles.loginSuccessPageMake}>
        {loginAvatarUri ? <PetAvatar size={120} uri={loginAvatarUri} /> : <Mascot size={120} />}
        <View style={styles.loginSuccessLoadingRowMake}>
          <ActivityIndicator color={palette.orange} size="small" />
          <Text style={styles.loginSuccessLoadingTextMake}>登录中...</Text>
        </View>
        <Text style={styles.loginSuccessHintMake}>
          正在为你唤醒专属灵伴{'\n'}请稍候片刻
        </Text>
        <View style={styles.loginSuccessDotsMake}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={[styles.loginSuccessDotMake, index === 0 && styles.loginSuccessDotActiveMake]} />
          ))}
        </View>
        <View style={styles.homeIndicator} />
      </View>
    );
  }

  function renderOtp() {
    const canResend = cooldownRemaining === 0 && !sendLoading;
    const otpChars = otpCode.padEnd(6, ' ').split('').slice(0, 6);
    const cursorIndex = Math.min(otpCode.length, 5);
    return (
      <Screen showBack={false} title="">
        <View style={styles.otpPage}>
          <Text style={styles.otpTitle}>输入验证码</Text>
          <Text style={styles.otpSubtitle}>
            已发送 6 位验证码至 <Text style={styles.otpSubtitleStrong}>+86 {otpMeta?.phone ?? phone}</Text>
          </Text>
          <Pressable onPress={() => otpInputRef.current?.focus()} style={[styles.otpGrid, webPressableReset]}>
            <TextInput
              ref={otpInputRef}
              autoFocus
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={handleOtpCodeChange}
              style={[styles.otpHiddenInput, webTextInputReset]}
              value={otpCode}
            />
            {otpChars.map((char, index) => {
              const filled = char.trim().length > 0;
              const active = index === cursorIndex && !filled && !otpInlineError;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpDigitBox,
                    filled && styles.otpDigitBoxFilled,
                    active && styles.otpDigitBoxActive,
                    Boolean(otpInlineError) && styles.otpDigitBoxError,
                  ]}
                >
                  {filled ? <Text style={[styles.otpDigitText, Boolean(otpInlineError) && styles.otpDigitTextError]}>{char}</Text> : null}
                  {active ? <View style={styles.otpCursor} /> : null}
                </View>
              );
            })}
          </Pressable>
          {otpInlineError ? (
            <InlineErrorMake style={styles.otpInlineErrorRow} text={otpInlineError} />
          ) : verifyLoading ? (
            <Text style={styles.otpInlineNotice}>正在校验验证码...</Text>
          ) : null}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>没有收到验证码？</Text>
            <Pressable disabled={!canResend} onPress={() => void requestSmsCode('otp')} style={webPressableReset}>
              <Text style={[styles.resendAction, !canResend && styles.resendActionDisabled]}>
                {sendLoading ? '发送中...' : cooldownRemaining > 0 ? `${cooldownRemaining}s 后重新发送` : '重新发送'}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.bottomTipCard}>
          <View style={styles.bottomTipIcon}>
            <PawPrint color={palette.teal} size={18} strokeWidth={2.5} />
          </View>
          <Text style={styles.bottomTipText}>
            新朋友提示：登录后可领养一只 AI 灵伴<Text style={styles.bottomTipMuted}>，与你的真实毛孩子一起成长。</Text>
          </Text>
        </View>
        {verifyLoading && !loginSuccessLoading ? (
          <View style={styles.otpVerifyingOverlay}>
            <ActivityIndicator color={palette.orange} size="small" />
            <Text style={styles.otpVerifyingText}>登录中...</Text>
          </View>
        ) : null}
        <View style={styles.homeIndicator} />
      </Screen>
    );
  }

  function renderPermissions() {
    const grantedCount = Object.values(permissions).filter((item) => item === 'granted').length;
    const allPermissionsGranted = grantedCount === Object.keys(permissionCopy).length;
    const requestingPermission = Object.values(permissions).some((item) => item === 'requesting');
    const deniedEntry = (Object.keys(permissions) as Array<keyof PermissionStateMap>).find((key) => ['blocked', 'denied', 'unavailable'].includes(permissions[key]));
    const deniedEntryStatus = deniedEntry ? permissions[deniedEntry] : undefined;
    const deniedNeedsSettings = deniedEntryStatus === 'blocked' || deniedEntryStatus === 'unavailable';
    const deniedConfig = deniedEntry ? permissionDeniedCopy[deniedEntry] : null;

    return (
      <Screen showBack={false} title="">
        {deniedConfig ? (
          <View style={styles.permissionDeniedPageTitle}>
            <Text style={styles.permissionDeniedPageTitleText}>{deniedConfig.pageTitle}</Text>
          </View>
        ) : (
          <View style={styles.makeIntroHeader}>
            <Mascot size={64} />
            <View style={styles.makeIntroCopy}>
              <Text style={styles.makeIntroTitle}>为你的灵伴准备一个家</Text>
              <Text style={styles.makeIntroSubtitle}>打开下列权限，体验更完整的陪伴</Text>
            </View>
          </View>
        )}

        {deniedEntry && deniedConfig ? (
          <View style={styles.permissionDeniedHero}>
            <View style={[styles.permissionDeniedIcon, deniedEntry === 'media' && styles.tealIcon, deniedEntry === 'notifications' && styles.goldIcon]}>
              {deniedEntry === 'location' ? <MapPin color="#fff" size={30} strokeWidth={2.4} /> : deniedEntry === 'media' ? <Camera color="#fff" size={30} strokeWidth={2.4} /> : <Bell color="#fff" size={30} strokeWidth={2.4} />}
              <View style={styles.permissionDeniedIconBadge}>
                <X color="#fff" size={14} strokeWidth={3} />
              </View>
            </View>
            <View style={styles.flex}>
              <Text style={styles.permissionDeniedTitle}>权限当前已关闭</Text>
              <Text style={styles.permissionDeniedText}>{deniedConfig.tip}</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.permissionMakeStack, deniedEntry && styles.permissionMakeStackDenied]}>
          {(Object.keys(permissionCopy) as Array<keyof PermissionStateMap>).map((key) => {
            const status = permissions[key];
            const Icon = key === 'location' ? MapPin : key === 'media' ? Camera : Bell;
            const isGranted = status === 'granted';
            const isLoading = status === 'requesting';
            const isBlocked = status === 'blocked' || status === 'unavailable';
            const isDenied = status === 'denied' || isBlocked;
            return (
              <Pressable
                disabled={isGranted || isLoading}
                key={key}
                onPress={() => (isBlocked ? void openPermissionSettings() : void requestPermission(key))}
                style={[styles.permissionMakeRow, isGranted && styles.permissionMakeRowGranted, isDenied && styles.permissionMakeRowDenied, webPressableReset]}
              >
                <View style={[styles.permissionIconMake, key === 'media' && styles.tealIcon, key === 'notifications' && styles.goldIcon]}>
                  <Icon color="#fff" size={20} strokeWidth={2.4} />
                </View>
                <View style={styles.flex}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.permissionTitleMake}>{permissionCopy[key].label}</Text>
                    {isLoading ? (
                      <View style={styles.permissionStatusLoadingRow}>
                        <ActivityIndicator color={palette.muted} size="small" />
                        <Text style={styles.permissionStatusLoading}>授权中</Text>
                      </View>
                    ) : isGranted ? (
                      <View style={styles.permissionStatusOn}>
                        <Check color={palette.teal} size={12} strokeWidth={3} />
                        <Text style={styles.permissionStatusOnText}>已开启</Text>
                      </View>
                    ) : isDenied ? (
                      <Text style={styles.permissionStatusDenied}>{isBlocked ? '去设置' : '重新授权'}</Text>
                    ) : (
                      <View style={styles.permissionSwitchOff}>
                        <View style={styles.permissionSwitchThumb} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.permissionDescMake}>{permissionCopy[key].description}</Text>
                  {isDenied ? (
                    <View style={styles.permissionDeniedHint}>
                      <AlertTriangle color={palette.danger} size={12} strokeWidth={2.5} />
                      <Text style={styles.permissionDeniedHintText}>已被系统拒绝，去系统设置开启</Text>
                      <ChevronRight color={palette.danger} size={12} strokeWidth={2.5} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.makeBottomActions}>
          {deniedEntry ? (
            <Pressable
              onPress={deniedNeedsSettings ? () => void openPermissionSettings() : () => void requestPermission(deniedEntry)}
              style={[styles.permissionPrimaryButton, webPressableReset]}
            >
              <Settings color="#fff" size={16} strokeWidth={2.4} />
              <Text style={styles.permissionPrimaryButtonText}>{deniedNeedsSettings ? permissionDeniedCopy[deniedEntry].action : `重新授权${permissionCopy[deniedEntry].label}`}</Text>
            </Pressable>
          ) : allPermissionsGranted ? (
            <Pressable onPress={() => void continueAfterPermissions()} style={[styles.permissionPrimaryButton, webPressableReset]}>
              <Text style={styles.permissionPrimaryButtonText}>下一步，添加宠物</Text>
            </Pressable>
          ) : (
            <Pressable disabled={requestingPermission} onPress={() => void requestAllPermissions()} style={[styles.permissionPrimaryButton, requestingPermission && styles.aiCtaDisabled, webPressableReset]}>
              {requestingPermission ? <ActivityIndicator color="#fff" size="small" /> : null}
              <Text style={styles.permissionPrimaryButtonText}>{requestingPermission ? '授权中...' : '一键开启全部权限'}</Text>
            </Pressable>
          )}
          {allPermissionsGranted ? null : (
            <Pressable onPress={() => void continueAfterPermissions()} style={[styles.textAction, webPressableReset]}>
              <Text style={styles.textActionText}>{deniedEntry ? '暂不开启，继续使用' : '稍后再说'}</Text>
            </Pressable>
          )}
        </View>
      </Screen>
    );
  }

  function renderNoPetMakeEmpty({ onLater, variant = 'management' }: { onLater?: () => void; variant?: 'management' | 'tabHome' }) {
    const tabHome = variant === 'tabHome';
    return (
      <View style={tabHome ? styles.noPetTabHomeMake : styles.noPetEmptyMake}>
        <View style={tabHome ? styles.noPetTabArtMake : styles.noPetArtMake}>
          {tabHome ? (
            <>
              <View style={styles.noPetTabGlowMake} />
              <View style={styles.noPetTabMascotMake}>
                <Mascot size={130} />
              </View>
              <View style={styles.noPetTabPlusMake}>
                <Plus color={palette.orange} size={14} strokeWidth={2.6} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.noPetArtGlowMake} />
              <View style={styles.noPetPawOrbMake}>
                <PawPrint color={palette.orange} size={72} strokeWidth={2.1} />
              </View>
              <View style={styles.noPetSparkleMake}>
                <Sparkles color="#fff" size={12} strokeWidth={2.5} />
              </View>
            </>
          )}
        </View>
        <Text style={tabHome ? styles.noPetTabTitleMake : styles.noPetTitleMake}>{tabHome ? '还没有添加你的毛孩子' : '先添加一位灵伴吧'}</Text>
        <Text style={tabHome ? styles.noPetTabDescMake : styles.noPetDescMake}>
          {tabHome ? (
            <>
              告诉 Lumii 你家的猫咪或狗狗{'\n'}我们会为它生成一个专属 AI 灵伴
            </>
          ) : (
            <>
              告诉 Lumii 你家的猫咪或狗狗{'\n'}我们会为它生成一份专属健康档案和 AI 灵伴
            </>
          )}
        </Text>
        <Pressable onPress={() => go('petInfo')} style={[tabHome ? styles.noPetTabPrimaryMake : styles.noPetPrimaryMake, webPressableReset]}>
          {tabHome ? null : <Plus color="#fff" size={15} strokeWidth={2.6} />}
          <Text style={tabHome ? styles.noPetTabPrimaryTextMake : styles.noPetPrimaryTextMake}>{tabHome ? '添加我的宠物' : '添加宠物'}</Text>
        </Pressable>
        {onLater && !tabHome ? (
          <Pressable onPress={onLater} style={[styles.noPetLaterMake, webPressableReset]}>
            <Text style={styles.noPetLaterTextMake}>稍后再说</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  function renderEmptyPet() {
    return (
      <Screen showBack={false} title="我的宠物">
        {renderNoPetMakeEmpty({ onLater: () => resetTo('profile'), variant: 'tabHome' })}
      </Screen>
    );
  }

  function renderPetInfo() {
    const editingPet = route === 'editPet';
    const editingProfile = getCurrentPet();
    if (editingPet) {
      return (
        <Screen title="编辑宠物资料">
          <View style={styles.petEditAvatarBlock}>
            <Pressable onPress={() => void pickPetProfileAvatar()} style={[styles.petEditAvatarWrap, webPressableReset]}>
              <PetAvatar size={88} uri={petDraft.avatarUrl || editingProfile?.avatarUrl || generatedGoldenAvatarUri} />
              <View style={styles.petEditCameraBadge}>
                <Camera color="#fff" size={14} strokeWidth={2.4} />
              </View>
            </Pressable>
            <Text style={styles.petEditAvatarHint}>点击更换头像</Text>
          </View>

          <View style={styles.petEditCardMake}>
            <View style={styles.petEditRowMake}>
              <Text style={styles.petEditLabelMake}>昵称</Text>
              <TextInput
                onChangeText={(name) => setPetDraft((draft) => ({ ...draft, name }))}
                placeholder="例如：奶油"
                placeholderTextColor={palette.muted}
                style={[styles.petEditInputMake, webTextInputReset]}
                value={petDraft.name}
              />
            </View>
            <View style={styles.petEditDividerMake} />
            <View style={styles.petEditRowMake}>
              <Text style={styles.petEditLabelMake}>类型</Text>
              <View style={styles.petEditChipRowMake}>
                {productConfig.pet.supportedSpecies.map((species) => {
                  const selected = petDraft.species === species;
                  return (
                    <Pressable key={species} onPress={() => setPetDraft((draft) => ({ ...draft, species }))} style={[styles.petEditMiniChipMake, selected && styles.petEditMiniChipActiveMake, webPressableReset]}>
                      <Text style={[styles.petEditMiniChipTextMake, selected && styles.petEditMiniChipTextActiveMake]}>{speciesLabels[species]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.petEditDividerMake} />
            <View style={styles.petEditRowMake}>
              <Text style={styles.petEditLabelMake}>品种</Text>
              <TextInput
                onChangeText={(breed) => setPetDraft((draft) => ({ ...draft, breed }))}
                placeholder="例如：金毛寻回犬"
                placeholderTextColor={palette.muted}
                style={[styles.petEditInputMake, webTextInputReset]}
                value={petDraft.breed}
              />
            </View>
            <View style={styles.petEditDividerMake} />
            <View style={styles.petEditRowMake}>
              <Text style={styles.petEditLabelMake}>生日</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  onChangeText={(birthday) => setPetDraft((draft) => ({ ...draft, birthday }))}
                  placeholder="例如：2023-04-12"
                  placeholderTextColor={palette.muted}
                  style={[styles.petEditInputMake, webTextInputReset]}
                  value={petDraft.birthday}
                />
              ) : (
                <DateValueButton onPress={openPetBirthdayPicker} style={styles.petEditDateButtonMake} textStyle={styles.petEditInputMake} value={petDraft.birthday} />
              )}
            </View>
            <View style={styles.petEditDividerMake} />
            <View style={styles.petEditRowMake}>
              <Text style={styles.petEditLabelMake}>性别</Text>
              <View style={styles.petEditChipRowMake}>
                {[
                  { label: '♂ 男生', value: 'male' },
                  { label: '♀ 女生', value: 'female' },
                  { label: '未知', value: 'unknown' },
                ].map((item) => {
                  const selected = petDraft.gender === item.value;
                  return (
                    <Pressable key={item.value} onPress={() => setPetDraft((draft) => ({ ...draft, gender: item.value as PetProfile['gender'] }))} style={[styles.petEditMiniChipMake, selected && styles.petEditMiniChipActiveMake, webPressableReset]}>
                      <Text style={[styles.petEditMiniChipTextMake, selected && styles.petEditMiniChipTextActiveMake]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.petEditDividerMake} />
            <View style={styles.petEditRowMake}>
              <Text style={styles.petEditLabelMake}>绝育</Text>
              <Text style={styles.petEditReadonlyMake}>未记录</Text>
            </View>
            <View style={styles.petEditDividerMake} />
            <View style={styles.petEditRowMake}>
              <Text style={styles.petEditLabelMake}>体重</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(weight) => setPetDraft((draft) => ({ ...draft, weight }))}
                placeholder="--"
                placeholderTextColor={palette.muted}
                style={[styles.petEditInputMake, webTextInputReset]}
                value={petDraft.weight}
              />
              <Text style={styles.petEditUnitMake}>kg</Text>
            </View>
          </View>

          <Text style={styles.petEditFootnoteMake}>准确的资料能让 AI 灵伴更懂它，也能让附近的朋友更安心约遛。</Text>

          <View style={styles.makeBottomActions}>
            <Button loading={petProfileSaving} onPress={() => void savePetProfile()}>保存</Button>
            {editingProfile ? (
              <Pressable disabled={petProfileSaving} onPress={() => confirmDeletePet(editingProfile)} style={[styles.petEditDeleteMake, webPressableReset]}>
                <Text style={styles.petEditDeleteTextMake}>删除该宠物档案</Text>
              </Pressable>
            ) : null}
          </View>
        </Screen>
      );
    }
    return (
      <Screen title="添加宠物 1/2">
        <View style={styles.makePageTitleBlock}>
          <Text style={styles.pageTitle}>告诉我们它是谁</Text>
          <Text style={styles.makePageSubtitle}>这些信息将用于生成它的专属 AI 灵伴</Text>
        </View>

        <View style={styles.petInfoFormMake}>
          <PetInfoMakeField label="宠物昵称" onChangeText={(name) => setPetDraft((draft) => ({ ...draft, name }))} placeholder="例如：豆豆" value={petDraft.name} />
          <View style={styles.optionWrap}>
            <Text style={styles.label}>宠物类型</Text>
            <View style={styles.segmentRow}>
              {productConfig.pet.supportedSpecies.map((species) => (
                <Pressable
                  key={species}
                  onPress={() => setPetDraft((draft) => ({ ...draft, species }))}
                  style={[styles.petTypeMakeButton, petDraft.species === species && styles.petTypeMakeButtonActive]}
                >
                  <Text style={styles.petTypeEmoji}>{species === 'dog' ? '🐶' : '🐱'}</Text>
                  <Text style={[styles.petTypeMakeText, petDraft.species === species && styles.petTypeMakeTextActive]}>{speciesLabels[species]}</Text>
                  {petDraft.species === species ? (
                    <View style={styles.petTypeCheck}>
                      <Check color="#fff" size={11} strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
          <PetInfoMakeField label="品种" onChangeText={(breed) => setPetDraft((draft) => ({ ...draft, breed }))} placeholder="例如：金毛寻回犬" value={petDraft.breed} />
          {Platform.OS === 'web' ? (
            <PetInfoMakeField label="生日" onChangeText={(birthday) => setPetDraft((draft) => ({ ...draft, birthday }))} placeholder="例如：2024-05-30" value={petDraft.birthday} />
          ) : (
            <View style={styles.petInfoFieldMake}>
              <Text style={styles.petInfoFieldLabelMake}>生日</Text>
              <DateValueButton onPress={openPetBirthdayPicker} placeholder="选择生日" style={styles.petInfoInputShellMake} textStyle={styles.petInfoDateValueTextMake} value={petDraft.birthday} />
            </View>
          )}
          <View style={styles.optionWrap}>
            <Text style={styles.label}>性别</Text>
            <View style={styles.segmentRow}>
              {[
                { label: '弟弟', value: 'male' },
                { label: '妹妹', value: 'female' },
                { label: '未知', value: 'unknown' },
              ].map((item) => {
                const selected = petDraft.gender === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setPetDraft((draft) => ({ ...draft, gender: item.value as PetProfile['gender'] }))}
                    style={[styles.petGenderButton, selected && styles.petGenderButtonActive, webPressableReset]}
                  >
                    <Text style={[styles.petGenderText, selected && styles.petGenderTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <PetInfoMakeField keyboardType="decimal-pad" label="当前体重" onChangeText={(weight) => setPetDraft((draft) => ({ ...draft, weight }))} placeholder="12.5" suffix="kg" value={petDraft.weight} />
        </View>

        <View style={styles.makeBottomActions}>
          <Pressable disabled={petProfileSaving} onPress={() => void savePetProfile()} style={[styles.petInfoPrimaryButtonMake, petProfileSaving && styles.aiCtaDisabled, webPressableReset]}>
            {petProfileSaving ? <ActivityIndicator color="#fff" size="small" /> : null}
            <Text style={styles.petInfoPrimaryButtonTextMake}>下一步：上传它的照片</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  function renderUpload() {
    return (
      <Screen title="添加宠物 2/2">
        <View style={styles.makePageTitleBlock}>
          <Text style={styles.pageTitle}>给{activePet?.name ?? (petDraft.name || '它')}来一张正脸照</Text>
          <Text style={styles.makePageSubtitle}>清晰、光线自然、能看到完整面部</Text>
        </View>
        <View style={styles.uploadBoxMake}>
          <Mascot size={150} />
          <View style={styles.uploadDashedFrame} />
          <View style={styles.scanCornerLt} />
          <View style={styles.scanCornerRt} />
          <View style={styles.scanCornerRb} />
          <View style={styles.scanCornerLb} />
          <Text style={styles.uploadHintMake}>请将宠物正脸放入框内</Text>
        </View>
        <View style={styles.tipsCardMake}>
          {['光线明亮、自然光最佳', '完整露出五官与毛色', '尽量只有一只宠物入镜', '避免人物或其他动物干扰'].map((tip) => (
            <View key={tip} style={styles.tipMakeRow}>
              <View style={styles.tipCheckMake}>
                <Check color={palette.teal} size={11} strokeWidth={3} />
              </View>
              <Text style={styles.tipMakeText}>{tip}</Text>
            </View>
          ))}
        </View>
        <View style={styles.uploadActionsMake}>
          <UploadMakeButton loading={mediaPickerMode === 'library'} onPress={() => void pickAndUploadPetMedia('library')} tone="ghost">相册选择</UploadMakeButton>
          <UploadMakeButton loading={mediaPickerMode === 'camera'} onPress={() => void pickAndUploadPetMedia('camera')}>立即拍照</UploadMakeButton>
        </View>
      </Screen>
    );
  }

  function renderUploadDetail() {
    if (!media) {
      return renderMissingUploadMedia('识别结果');
    }
    const analysis = media?.analysis;
    const analysisTags = analysis?.tags?.length ? analysis.tags : ['主体清晰', '五官完整', '光线正常'];
    const featureSummary = analysis?.tags?.slice(0, 3).join(' · ') || '待生成时进一步提取';
    const faceSummary = analysis?.title ?? '主体清晰 · 五官完整';
    const moodSummary = analysis?.message ?? '温顺亲人 · 适合生成';
    const avatarStartDisabled = avatarStarting;
    const petSubjectParts = [speciesLabels[activePet?.species ?? petDraft.species], activePet?.breed || petDraft.breed].filter(Boolean);
    return (
      <Screen title="识别结果">
        <View style={[styles.recognitionHeroMake, Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg,#F8D9B7 0%, #E2A56A 100%)' } as object) : null]}>
          <PetAvatar uri={media.previewUrl} size={170} />
          <View style={styles.recognitionSuccessBadge}>
            <Sparkles color="#fff" size={12} strokeWidth={2.4} />
            <Text style={styles.recognitionBadgeText}>{analysis?.status === 'warning' ? '建议优化' : '识别成功'}</Text>
          </View>
          <Text style={styles.recognitionQuality}>质量 {analysis?.qualityScore ?? 96}%</Text>
        </View>
        <View style={styles.recognitionDetailCardMake}>
          <MakeDetailRow label="宠物主体" value={petSubjectParts.join(' · ') || '待确认'} valueAlign="right" />
          <View style={styles.makeDivider} />
          <MakeDetailRow label="毛色特征" value={featureSummary} valueAlign="right" />
          <View style={styles.makeDivider} />
          <MakeDetailRow label="五官特征" value={faceSummary} valueAlign="right" />
          <View style={styles.makeDivider} />
          <MakeDetailRow label="表情气质" value={moodSummary} valueAlign="right" />
        </View>
        <View style={styles.recognitionFeatureChipsMake}>
          {analysisTags.map((tag) => (
            <Text key={tag} style={analysis?.status === 'warning' ? styles.featureChipWarm : styles.featureChipCool}>{tag.startsWith('#') ? tag : `# ${tag}`}</Text>
          ))}
        </View>
        <View style={styles.recognitionBottomActions}>
          <Pressable
            accessibilityRole="button"
            disabled={avatarStartDisabled}
            onPress={() => void startAvatarGeneration()}
            style={({ pressed }) => [styles.recognitionPrimaryCta, pressed && !avatarStartDisabled && styles.recognitionPrimaryCtaPressed, avatarStartDisabled && styles.opacity60, webPressableReset]}
          >
            {avatarStarting ? <ActivityIndicator color="#fff" size="small" /> : null}
            <Text style={styles.recognitionPrimaryCtaText}>{avatarStarting ? '正在生成...' : '确认并生成灵伴'}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  function renderUploadNoPet() {
    const analysis = media?.analysis;
    const failedTitle = analysis?.title ?? '未检测到清晰宠物主体';
    const failedMessage = analysis?.message ?? '试试以下方式：';
    const failedSuggestions = analysis?.suggestions?.length
      ? analysis.suggestions
      : ['保持光线明亮、避免逆光', '镜头距离宠物 30-80cm', '完整露出面部，不要被遮挡'];
    return (
      <Screen title="识别结果">
        <View style={styles.failedPhotoMake}>
          <View style={styles.failedBlurOrb} />
          <View style={styles.failedAlertCircle}>
            <AlertTriangle color={palette.danger} size={30} strokeWidth={2.4} />
          </View>
          <Text style={styles.failedBadgeMake}>识别失败</Text>
        </View>
        <View style={styles.detailCardMake}>
          <Text style={styles.cardTitle}>{failedTitle}</Text>
          <Text style={[styles.mutedText, styles.failedTipsIntro]}>{failedMessage}</Text>
          {failedSuggestions.map((tip) => (
            <View key={tip} style={styles.tipBulletRow}>
              <View style={styles.tipBulletDot} />
              <Text style={styles.tipBulletText}>{tip}</Text>
            </View>
          ))}
        </View>
        <View style={styles.uploadActionsMake}>
          <UploadMakeButton onPress={() => replace('upload')} tone="ghost">重新选择</UploadMakeButton>
          <UploadMakeButton onPress={() => replace('upload')}>重新拍照</UploadMakeButton>
        </View>
      </Screen>
    );
  }

  function renderMissingUploadMedia(title: string) {
    return (
      <Screen title={title}>
        <View style={styles.aiGeneratingPage}>
          <ErrorState
            action="重新选择照片"
            description="当前没有可用的上传照片，可能是页面状态已被清理或上传中断。请重新选择宠物照片后再继续。"
            icon={<ImagePlus color={palette.orange} size={20} strokeWidth={2.4} />}
            iconTone="primary"
            onAction={() => replace('upload')}
            title="需要先上传宠物照片"
          />
        </View>
      </Screen>
    );
  }

  function renderGenerating() {
    if (!media) {
      return renderMissingUploadMedia('生成灵伴');
    }
    const progress = avatarResultPrefetching ? 100 : avatarJob?.progress ?? 62;
    const generatingTitle = avatarResultPrefetching ? '正在载入高清灵伴形象' : '正在生成你的小灵伴';
    const generatingSubtitle = avatarResultPrefetching ? '形象已经生成完成，正在载入结果图\n马上就能确认保存' : '正在捕捉毛色、五官和表情特征\n这个过程可能需要几十秒';
    if (avatarJob?.status === 'failed') {
      return (
        <Screen title="生成灵伴">
          <View style={styles.aiGeneratingPage}>
            <View style={styles.aiGeneratingOrb}>
              <Image resizeMode="cover" source={{ uri: media.previewUrl }} style={styles.aiGeneratingImage} />
              <View style={styles.aiOriginalThumb}>
                <Image resizeMode="cover" source={{ uri: media.previewUrl }} style={styles.avatarImage} />
              </View>
            </View>
            <ErrorState
              action={avatarRetrying ? '生成中' : '重新生成'}
              description={avatarJob.errorMessage || '可能是网络波动，或图片生成服务没有返回可用结果。你的上传照片已经保留，可以直接重试。'}
              icon={<Sparkles color={palette.orange} size={20} strokeWidth={2.4} />}
              iconTone="primary"
              onAction={avatarRetrying ? undefined : () => void retryAvatarGeneration()}
              title="AI 灵伴生成失败"
            />
            <View style={styles.aiFailureSecondaryAction}>
              <Button onPress={() => replace('upload')} tone="secondary">重新选择照片</Button>
            </View>
          </View>
        </Screen>
      );
    }
    return (
      <Screen title="生成灵伴">
        <View style={styles.aiGeneratingPage}>
          <View style={styles.aiGeneratingOrb}>
            <View style={styles.aiGeneratingRing} />
            <Image blurRadius={2} resizeMode="cover" source={{ uri: media.previewUrl }} style={styles.aiGeneratingImage} />
            <View style={styles.aiScanLine} />
            <View pointerEvents="none" style={styles.aiParticleLayer}>
              <View style={[styles.aiParticleDot, styles.aiParticleDotOne]} />
              <View style={[styles.aiParticleDot, styles.aiParticleDotTwo]} />
              <View style={[styles.aiParticleDot, styles.aiParticleDotThree]} />
              <View style={[styles.aiParticleDot, styles.aiParticleDotFour]} />
            </View>
            <View style={styles.aiOriginalThumb}>
              <Image resizeMode="cover" source={{ uri: media.previewUrl }} style={styles.avatarImage} />
            </View>
            <View style={styles.aiWorkingBadge}>
              <Sparkles color={palette.orange} size={12} strokeWidth={2.5} />
              <Text style={styles.aiWorkingText}>{avatarResultPrefetching ? '高清载入中' : 'AI 转化中'}</Text>
            </View>
          </View>
          <Text style={styles.aiGeneratingTitle}>{generatingTitle}</Text>
          <Text style={styles.aiGeneratingSubtitle}>{generatingSubtitle}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.aiStepsCard}>
            <MakeStepRow done text="识别宠物主体与五官位置" />
            <MakeStepRow done={avatarResultPrefetching} active={!avatarResultPrefetching} text="捕捉毛色、纹理与体态" />
            <MakeStepRow active={avatarResultPrefetching} text={avatarResultPrefetching ? '载入真实卡通化结果图' : '生成真实卡通化灵伴形象'} />
          </View>
        </View>
      </Screen>
    );
  }

  function renderMissingAvatarResult() {
    return (
      <Screen title="形象确认">
        <View style={styles.aiGeneratingPage}>
          <ErrorState
            action="重新生成"
            description="当前没有可确认的灵伴生成结果，可能是生成任务已过期或被新的上传任务替换。请重新上传照片生成。"
            icon={<Sparkles color={palette.orange} size={20} strokeWidth={2.4} />}
            iconTone="primary"
            onAction={() => replace('upload')}
            title="还没有可保存的灵伴形象"
          />
        </View>
      </Screen>
    );
  }

  function renderAiResult() {
    if (!media) {
      return renderMissingUploadMedia('形象确认');
    }
    const avatarCandidates = getAvatarCandidateUrls(avatarJob);
    if (!avatarJob || (!avatarCandidates.length && !avatarJob.resultUrl)) {
      return renderMissingAvatarResult();
    }
    const petName = activePet?.name ?? (petDraft.name || '你的宠物');
    const petBreed = activePet?.breed || petDraft.breed || speciesLabels[petDraft.species];
    const resultUri = avatarJob.resultUrl ?? avatarCandidates[0]!;
    const visibleAvatarCandidates = avatarCandidates.length ? avatarCandidates : [resultUri];
    const multiCandidate = visibleAvatarCandidates.length > 1;
    const selectedIndex = multiCandidate ? Math.min(selectedAvatarCandidateIndex, visibleAvatarCandidates.length - 1) : 0;
    const selectedAvatarUri = visibleAvatarCandidates[selectedIndex] ?? resultUri;
    const sourcePhotoUri = media.previewUrl;
    const title = multiCandidate ? '挑一个你最喜欢的' : '遇见你的小灵伴';
    const actionButtons = (
      <View style={[styles.aiResultActions, !multiCandidate && styles.aiResultActionsSingle]}>
        <Pressable disabled={avatarAccepting} onPress={() => void saveAvatar()} style={({ pressed }) => [styles.aiPrimaryCta, pressed && !avatarAccepting && styles.aiPrimaryCtaPressed, avatarAccepting && styles.aiCtaDisabled, webPressableReset]}>
          {avatarAccepting ? <ActivityIndicator color="#fff" size="small" /> : <Heart color="#fff" size={16} strokeWidth={2.4} />}
          <Text style={styles.aiPrimaryCtaText}>{avatarAccepting ? '保存中...' : '保存并设为电子灵伴'}</Text>
        </Pressable>
        <Pressable disabled={avatarRetrying} onPress={openAvatarRegenerateConfirm} style={({ pressed }) => [styles.aiGhostCta, pressed && !avatarRetrying && styles.aiGhostCtaPressed, avatarRetrying && styles.aiCtaDisabled, webPressableReset]}>
          {avatarRetrying ? <ActivityIndicator color={palette.ink} size="small" /> : <RefreshCw color={palette.ink} size={15} strokeWidth={2.4} />}
          <Text style={styles.aiGhostCtaText}>{avatarRetrying ? '生成中...' : '重新生成'}</Text>
        </Pressable>
      </View>
    );
    return (
      <Screen
        right={
          multiCandidate ? undefined : (
            <View style={styles.aiResultHeaderHeart}>
              <Heart color={palette.orange} fill={palette.orange} size={16} strokeWidth={2.2} />
            </View>
          )
        }
        title={title}
      >
        <View style={styles.aiResultPage}>
          <View pointerEvents="none" style={styles.aiPageWarmGlow} />
          <View pointerEvents="none" style={styles.aiPageTealGlow} />
          {multiCandidate ? (
            <View style={styles.aiCandidateIntro}>
              <Sparkles color={palette.teal} size={12} strokeWidth={2.4} />
              <Text style={styles.aiCandidateIntroText}>AI 为{petName}生成了 {visibleAvatarCandidates.length} 个不同风格的灵伴</Text>
            </View>
          ) : (
            <View style={styles.aiOriginalPhotoChip}>
              <View style={styles.aiOriginalPhotoThumb}>
                <Image resizeMode="cover" source={{ uri: sourcePhotoUri }} style={styles.avatarImage} />
              </View>
              <Text style={styles.aiOriginalPhotoText}>
                基于你上传的{'\n'}
                <Text style={styles.aiOriginalPhotoStrong}>{petName}的照片</Text>
              </Text>
            </View>
          )}
          <View style={[styles.aiResultHero, !multiCandidate && styles.aiResultHeroSingle]}>
            <View pointerEvents="none" style={[styles.aiResultHeroGlow, !multiCandidate && styles.aiResultHeroGlowSingle]} />
            <View pointerEvents="none" style={[styles.aiResultHeroRing, !multiCandidate && styles.aiResultHeroRingSingle]} />
            <View style={[styles.aiResultAvatarFrame, !multiCandidate && styles.aiResultAvatarFrameSingle]}>
              <PetAvatar uri={selectedAvatarUri} size={multiCandidate ? 230 : 260} />
            </View>
            {!multiCandidate ? (
              <View style={styles.aiResultHeroBadge}>
                <Sparkles color={palette.orange} fill={palette.orange} size={13} strokeWidth={2.2} />
                <Text style={styles.aiResultHeroBadgeText}>AI 灵伴</Text>
              </View>
            ) : null}
            <Sparkles color={palette.orange} fill={palette.orange} size={13} strokeWidth={2.2} style={styles.aiSparkOne} />
            <Sparkles color={palette.orange} fill={palette.orange} size={10} strokeWidth={2.2} style={styles.aiSparkTwo} />
            <Sparkles color={palette.orange} fill={palette.orange} size={12} strokeWidth={2.2} style={styles.aiSparkThree} />
          </View>
          <Text style={[styles.aiResultName, !multiCandidate && styles.aiResultNameSingle]}>{petName}</Text>
          <Text style={styles.aiResultDesc}>一只温柔亲人的{petBreed}灵伴已经准备好陪你</Text>
          <View style={[styles.aiResultFeatureTags, !multiCandidate && styles.aiResultFeatureTagsSingle]}>
            <Text style={styles.featureChipWarm}>真实卡通化</Text>
            {!multiCandidate ? <Text style={styles.featureChipCool}>保留毛色</Text> : null}
            <Text style={multiCandidate ? styles.featureChipCool : styles.featureChipWarm}>亲和表情</Text>
          </View>
          {multiCandidate ? (
            <View style={styles.aiCandidateBlock}>
              <Text style={styles.aiCandidateLabel}>其他候选</Text>
              <View style={styles.aiCandidateRow}>
                {visibleAvatarCandidates.map((candidateUri, index) => {
                  const active = index === selectedIndex;
                  const tone = avatarCandidateTones[index] ?? 'main';
                  const source = candidateUri && !isGeneratedAvatarUri(candidateUri) ? { uri: candidateUri } : generatedGoldenAvatarSource;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      key={`${candidateUri}-${index}`}
                      onPress={() => setSelectedAvatarCandidateIndex(index)}
                      style={[styles.aiCandidateItem, active && styles.aiCandidateItemActive, webPressableReset]}
                    >
                      <View style={[styles.aiCandidateImageFrame, active && styles.aiCandidateImageFrameActive]}>
                        <Image resizeMode="cover" source={source} style={[styles.aiCandidateImage, styles[`aiCandidateImage_${tone}`]]} />
                        <View pointerEvents="none" style={[styles.aiCandidateImageOverlay, styles[`aiCandidateImageOverlay_${tone}`]]} />
                        {active ? (
                          <View style={styles.aiCandidateCheck}>
                            <Check color="#fff" size={11} strokeWidth={3} />
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          {multiCandidate ? (
            <Pressable disabled={avatarRetrying || avatarAccepting} onPress={() => setAvatarFeedbackSheetVisible(true)} style={[styles.aiFeedbackEntry, webPressableReset]}>
              <AlertTriangle color={palette.orange} size={13} strokeWidth={2.4} />
              <Text style={styles.aiFeedbackEntryText}>不像我家宠物？先告诉我们哪里不像</Text>
            </Pressable>
          ) : null}
          <Text style={styles.aiQuotaHint}>重新生成会消耗 1 次额度 · 今日剩余 {petAvatarDailyRemaining} 次</Text>
          {actionButtons}
        </View>
        {renderAvatarFeedbackSheet()}
        {renderAvatarRegenerateConfirm()}
      </Screen>
    );
  }

  function renderAvatarFeedbackSheet() {
    return (
      <BottomSheet
        contentStyle={styles.aiFeedbackSheet}
        dismissDisabled={avatarFeedbackSubmitting || avatarRetrying}
        onClose={() => setAvatarFeedbackSheetVisible(false)}
        visible={avatarFeedbackSheetVisible}
      >
        <Text style={styles.aiFeedbackTitle}>告诉我们哪里不满意</Text>
        <Text style={styles.aiFeedbackSubtitle}>可选择多个，我们将据此优化下一次生成</Text>
        <View style={styles.aiFeedbackChipWrap}>
          {avatarFeedbackOptions.map((option) => {
            const selected = avatarFeedbackChipIds.includes(option.id);
            return (
              <Pressable
                disabled={avatarFeedbackSubmitting || avatarRetrying}
                key={option.id}
                onPress={() => toggleAvatarFeedbackChip(option.id)}
                style={[styles.aiFeedbackChip, selected && styles.aiFeedbackChipSelected, webPressableReset]}
              >
                {selected ? <Check color={palette.orange} size={12} strokeWidth={3} /> : null}
                <Text style={[styles.aiFeedbackChipText, selected && styles.aiFeedbackChipTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.aiFeedbackSliderCard}>
          <View style={styles.aiFeedbackSliderHead}>
            <Text style={styles.aiFeedbackSliderTitle}>卡通程度</Text>
            <Text style={styles.aiFeedbackSliderValue}>偏真实</Text>
          </View>
          <View style={styles.aiFeedbackSliderTrack}>
            <View style={styles.aiFeedbackSliderFill} />
            <View style={styles.aiFeedbackSliderThumb} />
          </View>
          <View style={styles.aiFeedbackSliderLabels}>
            <Text style={styles.aiFeedbackSliderLabel}>真实</Text>
            <Text style={styles.aiFeedbackSliderLabel}>卡通</Text>
          </View>
        </View>
        <View style={styles.aiFeedbackActions}>
          <Pressable disabled={avatarFeedbackSubmitting || avatarRetrying} onPress={() => setAvatarFeedbackSheetVisible(false)} style={[styles.aiFeedbackCancel, webPressableReset]}>
            <Text style={styles.aiFeedbackCancelText}>取消</Text>
          </Pressable>
          <Pressable disabled={avatarFeedbackSubmitting || avatarRetrying} onPress={() => void submitAvatarFeedbackAndRetry()} style={[styles.aiFeedbackSubmit, (avatarFeedbackSubmitting || avatarRetrying) && styles.aiCtaDisabled, webPressableReset]}>
            {avatarFeedbackSubmitting || avatarRetrying ? <ActivityIndicator color="#fff" size="small" /> : <RefreshCw color="#fff" size={15} strokeWidth={2.4} />}
            <Text style={styles.aiFeedbackSubmitText}>{avatarFeedbackSubmitting || avatarRetrying ? '处理中...' : '按反馈重新生成'}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    );
  }

  function renderAvatarRegenerateConfirm() {
    return (
      <Modal
        animationType="fade"
        onRequestClose={() => setAvatarRegenerateConfirmVisible(false)}
        transparent
        visible={avatarRegenerateConfirmVisible}
      >
        <View style={styles.aiRegenerateBackdrop}>
          <View style={styles.aiRegenerateDialog}>
            <View style={styles.aiRegenerateIconBox}>
              <RefreshCw color={palette.orange} size={24} strokeWidth={2.3} />
            </View>
            <Text style={styles.aiRegenerateTitle}>要重新生成灵伴形象吗？</Text>
            <Text style={styles.aiRegenerateBody}>当前形象将被替换{'\n'}每天可重新生成 {petAvatarDailyLimit} 次，今天还剩 {petAvatarDailyRemaining} 次</Text>
            <View style={styles.aiRegenerateNote}>
              <AlertTriangle color={palette.teal} size={14} strokeWidth={2.4} />
              <Text style={styles.aiRegenerateNoteText}>建议先告诉我们哪里不满意，生成会更准</Text>
            </View>
            <View style={styles.aiRegenerateActions}>
              <Pressable disabled={avatarRetrying} onPress={() => setAvatarRegenerateConfirmVisible(false)} style={[styles.aiRegenerateCancel, webPressableReset]}>
                <Text style={styles.aiRegenerateCancelText}>取消</Text>
              </Pressable>
              <Pressable
                disabled={avatarRetrying}
                onPress={() => {
                  setAvatarRegenerateConfirmVisible(false);
                  void retryAvatarGeneration();
                }}
                style={[styles.aiRegenerateSubmit, avatarRetrying && styles.aiCtaDisabled, webPressableReset]}
              >
                {avatarRetrying ? <ActivityIndicator color="#fff" size="small" /> : <RefreshCw color="#fff" size={14} strokeWidth={2.4} />}
                <Text style={styles.aiRegenerateSubmitText}>{avatarRetrying ? '生成中...' : '重新生成'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderHome() {
    const pet = getCurrentPet();
    if (!pet) return renderEmptyPet();
    const nextVaccine = healthSummary?.nextVaccine ?? pendingVaccines[0] ?? vaccines[0];
    const latestWeight = healthSummary?.latestWeightKg ?? weights[0]?.kg ?? pet.weightKg;
    const petMeta = [pet.breed || speciesLabels[pet.species], formatPetAge(pet.birthday)].filter(Boolean).join(' · ');
    const memoCount = healthSummary?.memoCount ?? memos.length;
    const calendarSummary = healthCalendarEvents.length ? `${healthCalendarEvents.length} 条记录` : (healthSummary?.latestMemo?.title ?? memos[0]?.title ?? '查看记录');
    const onlineCopy = owners.length ? `${owners.length} 位伙伴在线` : '暂无附近伙伴';
    const homeChatHint = homeChatPrompts[homeHintIndex].replace(/\{petName\}/g, pet.name);
    const todayWeightRecorded = weights.some((item) => item.recordedAt === todayIsoDate());
    const visibleNearbyMoments = nearbyMoments.slice(0, 5);
    const activeNearbyMoment = visibleNearbyMoments.length ? visibleNearbyMoments[homeMomentIndex % visibleNearbyMoments.length] : null;
    const hasMomentError = Boolean(nearbyMomentsError && !visibleNearbyMoments.length);
    const homeMomentStates = [
      { key: 'moments', kind: 'moments' as const, pill: visibleNearbyMoments.length > 1 ? `${visibleNearbyMoments.length} 条小事` : '新小事' },
      { key: 'users-no-posts', kind: 'usersNoPosts' as const, pill: '可互动' },
      { key: 'empty', kind: 'empty' as const, pill: '暂无动态' },
      { key: 'loading-error', kind: 'loadingError' as const, pill: '加载失败' },
    ];
    const forcedHomeMomentIndex = forcedHomeMomentKind ? homeMomentStates.findIndex((item) => item.kind === forcedHomeMomentKind) : -1;
    const fallbackHomeMomentState = hasMomentError
      ? homeMomentStates[3]
      : activeNearbyMoment
        ? homeMomentStates[0]
        : owners.length
          ? homeMomentStates[1]
          : homeMomentStates[2];
    const activeHomeMomentState = forcedHomeMomentIndex >= 0 ? homeMomentStates[forcedHomeMomentIndex] : fallbackHomeMomentState;
    const handleHomeMomentPress = () => {
      if (activeHomeMomentState.kind === 'loadingError') {
        void loadNearbyMoments({ silent: false });
        return;
      }
      if (activeHomeMomentState.kind === 'empty') {
        void refreshDiscoverByPull();
        return;
      }
      go('discover');
    };
    const renderHomeMomentContent = () => {
      if (activeHomeMomentState.kind === 'moments' && activeNearbyMoment) {
        return (
          <>
            <View style={styles.homeMomentBody}>
              <PetAvatar uri={activeNearbyMoment.imageUrl ?? generatedGoldenAvatarUri} size={70} />
              <View style={styles.homeMomentCopy}>
                <View style={styles.homeMomentNameRow}>
                  <Text numberOfLines={1} style={styles.homeMomentName}>{activeNearbyMoment.petName} 的小事</Text>
                  <View style={styles.homeMomentDistance}>
                    <MapPin color={palette.teal} size={9} strokeWidth={2.4} />
                    <Text numberOfLines={1} style={styles.homeMomentDistanceText}>{activeNearbyMoment.distance}</Text>
                  </View>
                </View>
                <Text numberOfLines={2} style={styles.homeMomentText}>{activeNearbyMoment.text}</Text>
                <Text numberOfLines={1} style={styles.homeMomentMeta}>
                  {activeNearbyMoment.ownerName} · {formatTimestampDisplay(activeNearbyMoment.createdAt)}
                  {activeNearbyMoment.photoCount ? ` · ${activeNearbyMoment.photoCount} 张照片` : ''}
                </Text>
              </View>
            </View>
            {visibleNearbyMoments.length > 1 ? (
              <View style={styles.homeMomentFooter}>
                <View style={styles.homeMomentDots}>
                  {visibleNearbyMoments.map((item, index) => (
                    <View key={item.id} style={[styles.homeMomentDot, index === homeMomentIndex % visibleNearbyMoments.length && styles.homeMomentDotActive]} />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        );
      }
      if (activeHomeMomentState.kind === 'usersNoPosts') {
        return (
          <>
            <View style={styles.homeMomentStateBody}>
              <View style={styles.homeMomentAvatarStack}>
                {owners.slice(0, 3).map((owner, index) => (
                  <View key={`${owner.id}-home-stack`} style={[styles.homeMomentStackAvatar, { left: index * 25, zIndex: 3 - index }]}>
                    <PetAvatar uri={owner.imageUrl ?? generatedGoldenAvatarUri} size={42} />
                  </View>
                ))}
              </View>
              <View style={styles.homeMomentStateCopy}>
                <Text numberOfLines={1} style={styles.homeMomentStateTitle}>附近 {owners.length} 位伙伴在线</Text>
                <Text numberOfLines={2} style={styles.homeMomentStateText}>暂时还没有人分享小事，先去宠友圈打个招呼吧。</Text>
              </View>
            </View>
            <View style={styles.homeMomentStateActionRow}>
              <Text numberOfLines={1} style={styles.homeMomentStateSubtle}>模糊距离 · 只展示猫狗伙伴</Text>
              <View style={styles.homeMomentStateCta}>
                <Text style={styles.homeMomentStateCtaText}>去宠友圈</Text>
              </View>
            </View>
          </>
        );
      }
      if (activeHomeMomentState.kind === 'empty') {
        return (
          <View style={styles.homeMomentStateBody}>
            <View style={styles.homeMomentEmptyIcon}>
              <PawPrint color="#C9A58A" size={22} strokeWidth={2.4} />
            </View>
            <View style={styles.homeMomentStateCopy}>
              <Text numberOfLines={1} style={styles.homeMomentStateTitle}>附近暂时还没有小事</Text>
              <Text numberOfLines={1} style={styles.homeMomentStateText}>稍后再来看看</Text>
              <View style={styles.homeMomentRefreshChip}>
                <RefreshCw color="#B9784B" size={10} strokeWidth={2.6} />
                <Text style={styles.homeMomentRefreshText}>刷新附近</Text>
              </View>
            </View>
          </View>
        );
      }
      return (
        <View style={styles.homeMomentLoadingBody}>
          <View style={styles.homeMomentSkeletonColumn}>
            <View style={[styles.homeMomentSkeletonLine, styles.homeMomentSkeletonLineShort]} />
            <View style={[styles.homeMomentSkeletonLine, styles.homeMomentSkeletonLineLong]} />
            <View style={[styles.homeMomentSkeletonLine, styles.homeMomentSkeletonLineMini]} />
          </View>
          <View style={styles.homeMomentSkeletonColumnWide}>
            <View style={[styles.homeMomentSkeletonLine, styles.homeMomentSkeletonLineWide]} />
            <View style={[styles.homeMomentSkeletonLine, styles.homeMomentSkeletonLineMid]} />
            <View style={[styles.homeMomentSkeletonLine, styles.homeMomentSkeletonLineFull]} />
            <View style={styles.homeMomentRetryChip}>
              <RefreshCw color="#B9784B" size={10} strokeWidth={2.6} />
              <Text style={styles.homeMomentRetryText}>网络不稳，轻点重试</Text>
            </View>
          </View>
        </View>
      );
    };
    return (
      <Screen showBack={false} title="">
        <View style={styles.homeMakePage}>
          <View style={styles.homeMakeHeader}>
            <View style={styles.homeMakeGreeting}>
              <PetAvatar uri={pet.avatarUrl ?? generatedGoldenAvatarUri} size={42} />
              <View style={styles.flex}>
                <Text style={styles.homeMakeKicker}>早安，{pet.name}！</Text>
                <Pressable onPress={() => go('chat')} style={[styles.homeMakeChatEntry, webPressableReset]}>
                  <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={1} style={styles.homeMakeHeadline}>灵伴聊天 · {homeChatHint}</Text>
                  <ChevronRight color={palette.orange} size={13} strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>
            <Pressable onPress={() => go('notifications')} style={styles.homeBellButton}>
              <Bell color={palette.ink} size={17} strokeWidth={2.3} />
              <View style={styles.homeBellDot} />
            </Pressable>
          </View>

          <View style={styles.homePetStage}>
            <View style={styles.homePetGlow} />
            <View style={styles.homePetRing} />
            <View style={styles.homePetAvatarShell}>
              <PetAvatar uri={pet.avatarUrl ?? generatedGoldenAvatarUri} size={214} />
            </View>
            <View style={styles.homeOnlineBadge}>
              <View style={styles.homeOnlineDot} />
              <Text style={styles.homeOnlineText}>灵伴在线</Text>
            </View>
          </View>

          <View style={styles.homePetIdentityBlock}>
            <View style={styles.homePetNameRow}>
              <Text style={styles.homePetName}>{pet.name}</Text>
              <Text style={styles.homePetMeta}>· {petMeta}</Text>
            </View>
          </View>

          <Pressable onPress={handleHomeMomentPress} style={[webPressableReset, styles.homeMomentCard, Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFFCF8 0%, #FFF6EE 100%)' } as object) : null]}>
            <View style={styles.homeMomentHeader}>
              <View style={styles.homeMomentTitleRow}>
                <View style={styles.homeMomentIcon}>
                  <MessageCircle color={palette.orange} size={15} strokeWidth={2.4} />
                </View>
                <Text style={styles.homeMomentTitle}>附近宠友小事</Text>
              </View>
            <View style={styles.homeMomentAutoPill}>
                {activeHomeMomentState.kind === 'moments' ? <Sparkles color={palette.teal} size={10} strokeWidth={2.4} /> : activeHomeMomentState.kind === 'loadingError' ? <RefreshCw color={palette.teal} size={10} strokeWidth={2.4} /> : activeHomeMomentState.kind === 'empty' ? <MapPin color={palette.teal} size={10} strokeWidth={2.4} /> : <Users color={palette.teal} size={10} strokeWidth={2.4} />}
                <Text style={styles.homeMomentAutoText}>{activeHomeMomentState.pill}</Text>
              </View>
            </View>
            <View style={styles.homeMomentLayer}>
              {renderHomeMomentContent()}
            </View>
          </Pressable>

          <View style={styles.homeQuickGrid}>
            <MetricCard Icon={Weight} label="今日体重" onPress={() => go('weight')} tag={todayWeightRecorded ? '已记录' : '待记录'} tagTone="teal" value={formatWeightKg(latestWeight)} />
            <MetricCard Icon={Syringe} iconTone="teal" label="疫苗提醒" onPress={() => go('vaccine')} tag={formatDueLabel(nextVaccine?.dueAt)} tagTone="orange" value={nextVaccine?.name ?? '待添加计划'} />
            <MetricCard Icon={CalendarDays} label="健康日历" onPress={() => go('healthCalendar')} tag={`${memoCount} 条`} tagTone="muted" value={calendarSummary} />
            <MetricCard Icon={MapPin} label="附近伙伴" onPress={() => go('discover')} tag={`${defaultDiscoverRadiusKm}km`} tagTone="teal" value={onlineCopy} />
          </View>

          <Pressable onPress={() => go('dailyPost')} style={[styles.homeStoryStrip, webPressableReset]}>
            <View style={styles.homeStoryIcon}>
              <Camera color={palette.orange} size={18} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.homeStoryTitle}>记录今天的小事</Text>
              <Text style={styles.homeStorySub}>让 AI 灵伴更懂{pet.name}</Text>
            </View>
            <ChevronRight color={palette.muted} size={18} strokeWidth={2.2} />
          </Pressable>
        </View>
      </Screen>
    );
  }

  function renderChat() {
    const pet = getCurrentPet();
    const failedChatMessage = chatMessages.slice().reverse().find((message) => message.author === 'me' && message.status === 'failed');
    const chatDisconnected = Boolean(failedChatMessage);
    const firstVisibleChatTime = chatMessages.find((message) => message.time && message.time !== '刚刚')?.time;
    const chatDateChipLabel = formatChatDateChip(firstVisibleChatTime);
    const revealFailedChatMessage = () => {
      petChatScrollRef.current?.scrollToEnd({ animated: true });
      showToast('已定位到失败消息，可在消息下方点击重试', { tone: 'info', variant: 'surface' });
    };
    return (
      <Screen showBack={false} title="">
        <View style={styles.chatPageMake}>
        <View style={styles.chatMakeHeader}>
          <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={back} style={styles.chatBackButton}>
            <ChevronLeft color={palette.ink} size={22} strokeWidth={2.4} />
          </Pressable>
          <View style={[styles.chatAvatarWrap, chatDisconnected && styles.chatAvatarWrapOffline]}>
            <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={38} />
            <View style={[styles.chatAvatarDot, chatDisconnected && styles.chatAvatarDotOffline]} />
          </View>
          <View style={styles.chatHeaderCopy}>
            <Text style={styles.chatMakeName}>{pet?.name ?? '灵伴'}</Text>
            <View style={styles.chatOnlineRow}>
              {chatDisconnected ? <View style={styles.chatOfflineMiniDot} /> : <Smile color={palette.teal} size={11} strokeWidth={2.3} />}
              <Text style={[styles.chatOnlineText, chatDisconnected && styles.chatOnlineTextMutedMake]}>{chatDisconnected ? '连接中断' : '在线 · 心情很好'}</Text>
            </View>
          </View>
          <Pressable onPress={openPetCompanionSettings} style={styles.makeIconChip}>
            <Sparkles color={chatDisconnected ? palette.muted : palette.orange} size={16} strokeWidth={2.3} />
          </Pressable>
        </View>

        {chatDisconnected ? (
          <View style={[styles.chatErrorBanner, styles.chatErrorBannerPet]}>
            <AlertCircle color={palette.danger} size={14} strokeWidth={2.4} />
            <Text style={styles.chatErrorBannerText}>网络不稳定，灵伴暂时无法回复</Text>
            <Pressable onPress={revealFailedChatMessage} style={styles.chatErrorBannerAction}>
              <Text style={styles.chatErrorBannerActionText}>查看详情</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.chatSafetyTip}>
            <Stethoscope color={palette.teal} size={13} strokeWidth={2.4} />
            <Text style={styles.chatSafetyText}>AI 灵伴不能替代兽医，紧急情况请就医</Text>
          </View>
        )}

        <ScrollView ref={petChatScrollRef} contentContainerStyle={styles.chatMakeList} keyboardDismissMode="none" keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} style={styles.chatMakeScroller}>
          <Text style={styles.chatDateChip}>{chatDateChipLabel}</Text>
          {chatMessages.map((message) => (
            <View key={message.id} style={styles.chatMessageGroup}>
              <View style={[styles.chatMakeBubbleRow, message.author === 'me' && styles.chatMakeBubbleRowMe]}>
                {message.author === 'ai' ? <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={26} /> : null}
                <View style={styles.chatBubbleColumn}>
                  <View style={[styles.chatMakeBubble, message.author === 'me' && styles.chatMakeBubbleMe]}>
                    <Text style={[styles.chatMakeText, message.author === 'me' && styles.chatTextMe]}>{message.text}</Text>
                  </View>
                  {message.author === 'ai' ? (
                    <View style={styles.chatFeedbackRow}>
                      {(['good', 'off'] as const).map((rating) => (
                        <Pressable
                          disabled={chatFeedbackSavingIds.includes(message.id)}
                          key={rating}
                          onPress={() => void ratePetChatReply(message.id, rating)}
                          style={[
                            styles.chatFeedbackChip,
                            chatFeedbackById[message.id] === rating && styles.chatFeedbackChipActive,
                            chatFeedbackSavingIds.includes(message.id) && styles.mapSearchActionDisabled,
                          ]}
                        >
                          <Text style={[styles.chatFeedbackText, chatFeedbackById[message.id] === rating && styles.chatFeedbackTextActive]}>
                            {rating === 'good' ? '像它' : '不像它'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
              {message.author === 'me' && message.status === 'failed' ? (
                <Pressable onPress={() => void sendChatMessage(message.text, message.id)} style={[styles.messageRetryCard, styles.messageRetryCardMe]}>
                  <View style={styles.messageRetryIcon}>
                    <RefreshCw color={palette.danger} size={15} strokeWidth={2.4} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.messageRetryTitle}>消息发送失败</Text>
                    <Text style={styles.messageRetryText}>点击重试，或稍后再发送</Text>
                  </View>
                  <View style={styles.messageRetryButton}>
                    <RefreshCw color="#fff" size={11} strokeWidth={2.5} />
                    <Text style={styles.messageRetryButtonText}>重试</Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
          ))}
          {chatReplying ? (
            <View style={styles.chatMakeBubbleRow}>
              <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={26} />
              <View style={[styles.chatMakeBubble, styles.chatTypingBubble]}>
                {[0, 1, 2].map((dot) => <View key={dot} style={[styles.chatTypingDot, dot === 1 && styles.chatTypingDotMid, dot === 2 && styles.chatTypingDotLast]} />)}
              </View>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.chatBottomDock}>
          <ScrollView contentContainerStyle={styles.chatTopicRow} horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
            {['🍖 今天吃什么？', '💊 健康提醒', '💛 陪我聊天', '📝 生成日常笔记'].map((topic) => (
              <Pressable key={topic} onPress={() => setChatInput(topic)} style={styles.chatTopicChip}>
                <Text style={styles.chatTopicText}>{topic}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.chatComposerRow}>
            <View style={styles.chatComposer}>
              <TextInput
                onChangeText={setChatInput}
                placeholder={`告诉${pet?.name ?? '灵伴'}今天发生了什么...`}
                placeholderTextColor="#b6aca3"
                style={[styles.chatInput, webTextInputReset]}
                value={chatInput}
              />
              <Mic color={palette.muted} size={18} strokeWidth={2.2} />
              <Camera color={palette.muted} size={18} strokeWidth={2.2} />
            </View>
            <Pressable onPress={() => void sendChatMessage()} style={styles.sendButton}>
              {chatReplying ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={18} strokeWidth={2.4} />}
            </Pressable>
          </View>
          {petChatDailyCount > Math.max(0, petChatDailyLimit - 5) ? (
            <Text style={styles.chatQuotaHint}>今日 AI 对话 {petChatDailyCount}/{petChatDailyLimit}</Text>
          ) : null}
        </View>
        </View>
      </Screen>
    );
  }

  function renderConversation() {
    const conversation = selectedConversation;
    const canSendMessage = Boolean(conversation && conversation.canSendMessage !== false);
    const conversationInput = conversation ? conversationDraftsById[conversation.id] ?? '' : '';
    const failedConversationMessage = conversationMessages.slice().reverse().find((message) => message.author === 'me' && message.status === 'failed');
    const conversationAvatarUri = conversation?.imageUrl ?? owners[0]?.imageUrl ?? generatedGoldenAvatarUri;
    const firstConversationTime = conversationMessages.find((message) => message.author !== 'system')?.time;
    const conversationDateText = firstConversationTime ? formatChatDateChip(firstConversationTime) : '今天';
    const parseWalkInviteMessage = (text: string) => {
      const [rawFirstLine, ...noteLines] = text.split('\n');
      const firstLine = rawFirstLine.trim();
      const body = (firstLine.includes('邀请你：') ? firstLine.split('邀请你：').pop()!.trim() : firstLine).replace(/^约遛邀请\s*·\s*/, '');
      const parts = body.split(' · ');
      const time = parts[0]?.trim();
      const place = parts.slice(1).join(' · ').trim();
      const maybeInvite = Boolean(time && place && /(\d{1,2}:\d{2}|今天|明天|周)/.test(time) && /(公园|西门|东门|咖啡|草坪|广场|宠物|医院|店|河边)/.test(place));
      const addressLine = noteLines.find((line) => line.trim().startsWith('地址：'))?.trim();
      const note = noteLines.filter((line) => !line.trim().startsWith('地址：')).join('\n').trim();
      return maybeInvite ? { address: addressLine?.replace(/^地址：/, '') ?? '', note, place, time } : null;
    };
    const replyToWalkInvite = (invite: NonNullable<ReturnType<typeof parseWalkInviteMessage>>, accepted: boolean) => {
      if (!canSendMessage) {
        showToast('对方接受招呼后才能确认约遛');
        return;
      }
      const reply = accepted
        ? `好呀，我确认参加：${invite.time}，${invite.place}。`
        : `我先看下时间，晚点再确认这个约遛邀请：${invite.time}，${invite.place}。`;
      void sendConversationMessage(reply);
    };
    const openWalkInviteFromConversation = () => {
      if (!conversation || !canSendMessage) {
        showToast('对方接受招呼后才能发起约遛');
        return;
      }
      const ownerId = conversation.ownerId;
      const ownerNameSuffix = conversation.petName ? `和${conversation.petName}` : '';
      const ownerNameFromConversation =
        ownerNameSuffix && conversation.name.endsWith(ownerNameSuffix)
          ? conversation.name.slice(0, -ownerNameSuffix.length) || conversation.name
          : conversation.name;
      const owner =
        ownersRef.current.find((item) => item.id === ownerId) ??
        greetingRequestOwnersRef.current.find((item) => item.id === ownerId) ??
        (ownerId
          ? {
            distance: '模糊距离',
            id: ownerId,
            imageUrl: conversation.imageUrl,
            ownerName: ownerNameFromConversation,
            petName: conversation.petName ?? conversation.name,
            species: 'dog' as const,
            tags: ['可约遛'],
          }
          : null);
      if (!owner) {
        showToast('暂时无法识别对方资料，请回发现页重新选择伙伴');
        return;
      }
      void openWalkInvite(owner);
    };
    const sendPetCardFromConversation = () => {
      if (!conversation || !canSendMessage) {
        showToast('对方接受招呼后才能发送宠物卡');
        return;
      }
      const pet = getCurrentPet();
      if (!pet) {
        showToast('请先添加宠物档案');
        return;
      }
      const petCard = [
        `这是${pet.name}的小资料：`,
        `品种：${pet.breed || speciesLabels[pet.species]}`,
        pet.weightKg ? `体重：${formatWeightKg(pet.weightKg)}` : '',
        pet.birthday ? `年龄：${formatPetAge(pet.birthday)}` : '',
        pet.personality.length ? `性格：${pet.personality.join('、')}` : '',
      ].filter(Boolean).join('\n');
      void sendConversationMessage(petCard);
    };
    const sendPlaceFromConversation = () => {
      if (!conversation || !canSendMessage) {
        showToast('对方接受招呼后才能发送地点');
        return;
      }
      const place = selectedPlace;
      if (!place) {
        go('map');
        showToast('请先在地图选择一个宠物友好地点');
        return;
      }
      const placeMessage = [
        `地点推荐：${place.name}`,
        `地址：${place.address}`,
        `距离：${place.distance} · 评分 ${place.rating}`,
        place.tags.length ? `特色：${place.tags.join('、')}` : '',
      ].filter(Boolean).join('\n');
      void sendConversationMessage(placeMessage);
    };
    const handleConversationAttachment = (label: string) => {
      if (label === '地点') {
        sendPlaceFromConversation();
        return;
      }
      if (label === '约遛') {
        openWalkInviteFromConversation();
        return;
      }
      if (label === '宠物卡') {
        sendPetCardFromConversation();
        return;
      }
    };
    return (
      <Screen showBack={false} title="">
        <View style={styles.chatPageMake}>
          <View style={styles.chatMakeHeader}>
            <View style={styles.chatHeaderLeftMake}>
              <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={back} style={styles.chatBackButtonMake}>
                <ChevronLeft color={palette.ink} size={22} strokeWidth={2.5} />
              </Pressable>
              <View style={styles.conversationHeaderAvatarMake}>
                <PetAvatar uri={conversationAvatarUri} size={40} />
                {conversation ? (
                  <View style={styles.conversationHeaderOwnerBadgeMake}>
                    <User color={palette.orange} size={9} strokeWidth={2.5} />
                  </View>
                ) : null}
              </View>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={styles.chatMakeName}>{conversation?.name ?? '会话已失效'}</Text>
                <View style={styles.chatOnlineRow}>
                  <View style={[styles.homeOnlineDot, !canSendMessage && styles.chatOfflineDotMake]} />
                  <Text numberOfLines={1} style={[styles.chatOnlineText, !canSendMessage && styles.chatOnlineTextMutedMake]}>{conversation ? (canSendMessage ? '在线 · 模糊距离' : '等待对方接受招呼') : '请返回消息列表重新选择'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.chatSafetyTip}>
            <Shield color={palette.teal} size={13} strokeWidth={2.4} />
            <Text style={styles.chatSafetyText}>
              {conversation ? (canSendMessage ? '请勿转账或线下单独见面，注意宠物与人身安全' : '对方接受招呼后才能继续聊天，未确认前不会暴露精确位置') : '当前会话已经不可用，请回到消息列表刷新后重新选择'}
            </Text>
            <Pressable accessibilityLabel="举报" accessibilityRole="button" onPress={() => go('safety')} style={webPressableReset}>
              <Flag color={palette.teal} size={12} strokeWidth={2.4} />
            </Pressable>
          </View>

          {conversation && failedConversationMessage ? (
            <View style={styles.chatErrorBanner}>
              <AlertTriangle color={palette.danger} size={14} strokeWidth={2.4} />
              <Text style={styles.chatErrorBannerText}>网络不稳定，消息可能延迟送达</Text>
              <Pressable onPress={() => void sendConversationMessage(failedConversationMessage.text, failedConversationMessage.id)} style={styles.chatErrorBannerAction}>
                <RefreshCw color={palette.danger} size={11} strokeWidth={2.5} />
                <Text style={styles.chatErrorBannerActionText}>重连</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.chatMakeList} keyboardDismissMode="none" keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} style={styles.chatMakeScroller}>
            <Text style={styles.chatDateChip}>{conversationDateText}</Text>
            {conversation ? (
              conversationMessages.map((message) => {
                const invite = message.author !== 'system' ? parseWalkInviteMessage(message.text) : null;
                return message.author === 'system' ? (
                  <View key={message.id} style={styles.conversationSystemBubble}>
                    <Text style={styles.conversationSystemText}>{message.text}</Text>
                  </View>
                ) : (
                  <View key={message.id} style={styles.chatMessageGroup}>
                    <View style={[styles.chatMakeBubbleRow, message.author === 'me' && styles.chatMakeBubbleRowMe]}>
                      {message.author === 'other' ? <PetAvatar uri={conversationAvatarUri} size={26} /> : null}
                      {invite ? (
                        <View style={[styles.chatInviteBubbleMake, message.author === 'me' && styles.chatInviteBubbleMeMake]}>
                          <Image resizeMode="cover" source={{ uri: walkInviteParkPhotoUrl }} style={styles.chatInviteHeroImageMake} />
                          <View style={styles.chatInviteHeroOverlayMake} />
                          <View style={styles.chatInviteBadgeMake}>
                            <PawPrint color={palette.orange} size={10} strokeWidth={2.6} />
                            <Text style={styles.chatInviteBadgeTextMake}>约遛邀请</Text>
                          </View>
                          <Text numberOfLines={1} style={styles.chatInvitePlaceMake}>{invite.place}</Text>
                          <View style={styles.chatInviteBodyMake}>
                            <View style={styles.chatInviteTimeRowMake}>
                              <CalendarDays color={palette.orange} size={12} strokeWidth={2.4} />
                              <Text numberOfLines={1} style={styles.chatInviteTimeTextMake}>{invite.time}</Text>
                            </View>
                            {invite.address ? <Text numberOfLines={1} style={styles.chatInviteNoteMake}>地址：{invite.address}</Text> : null}
                            {invite.note ? <Text numberOfLines={2} style={styles.chatInviteNoteMake}>{invite.note}</Text> : null}
                            {message.author === 'me' ? (
                              <View style={styles.chatInviteActionsMake}>
                                <View style={[styles.chatInvitePrimaryMake, styles.mapSearchActionDisabled]}>
                                  <Text style={styles.chatInvitePrimaryTextMake}>已发送</Text>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.chatInviteActionsMake}>
                                <Pressable onPress={() => replyToWalkInvite(invite, false)} style={[styles.chatInviteSecondaryMake, webPressableReset]}>
                                  <Text style={styles.chatInviteSecondaryTextMake}>稍后再说</Text>
                                </Pressable>
                                <Pressable onPress={() => replyToWalkInvite(invite, true)} style={[styles.chatInvitePrimaryMake, webPressableReset]}>
                                  <Text style={styles.chatInvitePrimaryTextMake}>接受</Text>
                                </Pressable>
                              </View>
                            )}
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.chatMakeBubble, message.author === 'me' && styles.chatMakeBubbleMe]}>
                          <Text style={[styles.chatMakeText, message.author === 'me' && styles.chatTextMe]}>{message.text}</Text>
                        </View>
                      )}
                      {message.status === 'sending' ? (
                        <View style={styles.chatSendingMetaMake}>
                          <ActivityIndicator color={palette.muted} size="small" />
                          <Text style={styles.chatSendingTextMake}>发送中</Text>
                        </View>
                      ) : null}
                    </View>
                    {message.author === 'me' && message.status === 'failed' ? (
                      <View style={[styles.messageRetryCard, styles.messageRetryCardMe]}>
                        <View style={styles.messageRetryIcon}>
                          <AlertTriangle color={palette.danger} size={15} strokeWidth={2.4} />
                        </View>
                        <View style={styles.flex}>
                          <Text style={styles.messageRetryTitle}>消息未送达</Text>
                          <Text style={styles.messageRetryText}>点击重试或删除这条消息</Text>
                        </View>
                        <View style={styles.messageRetryActions}>
                          <Pressable onPress={() => void sendConversationMessage(message.text, message.id)} style={styles.messageRetryButton}>
                            <RefreshCw color="#fff" size={11} strokeWidth={2.5} />
                            <Text style={styles.messageRetryButtonText}>重试</Text>
                          </Pressable>
                          <Pressable onPress={() => deleteLocalConversationMessage(message.id)} style={styles.messageRetryDelete}>
                            <Text style={styles.messageRetryDeleteText}>删除</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <ErrorState
                action="回到消息"
                description="对方可能已不可见，或会话状态已刷新。请回到消息列表重新选择。"
                icon={<MessageCircle color={palette.danger} size={20} strokeWidth={2.4} />}
                iconTone="danger"
                onAction={() => replace('messages')}
                title="会话已失效"
              />
            )}
          </ScrollView>

          <View style={styles.chatBottomDock}>
            <ScrollView horizontal contentContainerStyle={styles.chatAttachmentRowMake} keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
              {[
                { Icon: MapPin, label: '地点' },
                { Icon: PawPrint, label: '宠物卡' },
                { Icon: CalendarDays, label: '约遛' },
              ].map(({ Icon, label }) => (
                <Pressable key={label} onPress={() => handleConversationAttachment(label)} style={[styles.chatAttachmentChipMake, webPressableReset]}>
                  <Icon color={palette.ink} size={12} strokeWidth={2.3} />
                  <Text style={styles.chatAttachmentTextMake}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.chatComposerRow}>
              <View style={[styles.chatComposer, !canSendMessage && styles.opacity60]}>
                <TextInput
                  editable={canSendMessage}
                  onChangeText={(text) => {
                    if (conversation) setConversationDraft(conversation.id, text);
                  }}
                  placeholder={conversation ? (canSendMessage ? '说点什么...' : '等待对方接受招呼') : '请先选择会话'}
                  placeholderTextColor="#b6aca3"
                  style={[styles.chatInput, !canSendMessage && styles.chatInputDisabled, webTextInputReset]}
                  value={conversationInput}
                />
                <Mic color={palette.muted} size={17} strokeWidth={2.2} />
                <Camera color={palette.muted} size={17} strokeWidth={2.2} />
              </View>
              <Pressable disabled={!canSendMessage} onPress={() => void sendConversationMessage()} style={[styles.sendButton, !canSendMessage && styles.mapSearchActionDisabled]}>
                <Send color="#fff" size={16} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  function renderHealth() {
    const pet = getCurrentPet();
    const nextHealthVaccine = healthSummary?.nextVaccine ?? pendingVaccines[0] ?? vaccines[0];
    const latestWeight = healthSummary?.latestWeightKg ?? weights[0]?.kg ?? pet?.weightKg;
    const healthScore = healthSummary?.healthScore ?? pet?.healthScore ?? 92;
    const weightSubtitle = healthSummary?.weightSummary ?? (weights.length > 1 ? `最近一次 ${formatOptionalDateLabel(weights[0]?.recordedAt)}` : '暂无连续记录，先从今天开始');
    const latestMemo = healthSummary?.latestMemo ?? memos[0];
    const urgentHealthCount = healthSummary?.urgentVaccineCount ?? urgentVaccines.length;
    const pendingHealthCount = healthSummary?.pendingVaccineCount ?? pendingVaccines.length;
    const recentRows = [
      {
        Icon: Weight,
        date: weights[0]?.recordedAt ? formatOptionalDateLabel(weights[0].recordedAt) : '待记录',
        dot: 'warm' as const,
        sub: weights[1] ? `较上次 ${Number(latestWeight ?? 0) >= weights[1].kg ? '+' : ''}${(Number(latestWeight ?? 0) - weights[1].kg).toFixed(1).replace(/\.0$/, '')}kg` : weightSubtitle,
        title: `体重 ${formatWeightKg(latestWeight)}`,
      },
      nextHealthVaccine
        ? {
          Icon: nextHealthVaccine.status === 'done' ? Check : Syringe,
          date: formatOptionalDateLabel(nextHealthVaccine.dueAt, '日期待确认'),
          dot: 'cool' as const,
          sub: nextHealthVaccine.status === 'done' ? '已完成' : vaccineReminderCopy(nextHealthVaccine),
          title: nextHealthVaccine.status === 'done' ? `${nextHealthVaccine.name}完成` : `${nextHealthVaccine.name}提醒`,
        }
        : null,
      latestMemo
        ? {
          Icon: Sparkles,
          date: formatOptionalDateLabel(latestMemo.updatedAt),
          dot: 'muted' as const,
          sub: latestMemo.content,
          title: latestMemo.title,
        }
        : null,
    ].filter(Boolean) as Array<{ Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>; date: string; dot: 'cool' | 'muted' | 'warm'; sub: string; title: string }>;
    return (
      <Screen
        right={(
          <Pressable accessibilityLabel="新增健康记录" accessibilityRole="button" onPress={() => go('memoNew')} style={styles.makeIconChip}>
            <Plus color={palette.ink} size={18} strokeWidth={2.4} />
          </Pressable>
        )}
        title={`${pet?.name ?? '灵伴'}的健康`}
      >
        <View style={styles.healthHeroMake}>
          <View style={styles.healthHeroGlow} />
          <View style={styles.healthHeroCopy}>
            <View style={styles.healthHeroLabelRow}>
              <Heart color={palette.orange} fill={palette.orange} size={12} strokeWidth={2.4} />
              <Text style={styles.healthHeroLabel}>今日健康分</Text>
            </View>
            <View style={styles.healthHeroScoreRow}>
              <Text style={styles.healthHeroScore}>{healthScore}</Text>
              <Text style={styles.healthHeroTotal}>/ 100</Text>
            </View>
            <Text style={styles.healthHeroDesc}>{weightSubtitle}</Text>
          </View>
          <View style={styles.healthHeroAvatar}>
            <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={64} />
          </View>
        </View>

        <View style={styles.healthSectionStack}>
          <HealthMakeRow Icon={Weight} badge={formatWeightKg(latestWeight)} chart onPress={() => go('weight')} subtitle={weightSubtitle} title="体重趋势" tone="warm" />
          <HealthMakeRow Icon={Syringe} badge={urgentHealthCount ? `${urgentHealthCount} 项临近` : pendingHealthCount ? `${pendingHealthCount} 项` : '已完成'} badgeTone="warm" onPress={() => go('vaccine')} subtitle={nextHealthVaccine ? `${nextHealthVaccine.name} · ${vaccineReminderCopy(nextHealthVaccine)}` : '暂无计划'} title="疫苗计划" tone="cool" />
          <HealthMakeRow Icon={CalendarDays} badge={`${healthCalendarEvents.length || recentRows.length} 条`} onPress={() => go('healthCalendar')} subtitle="按月份查看体重、疫苗和备忘记录" title="健康日历" tone="cool" />
        </View>

        {urgentHealthCount ? (
          <Pressable onPress={() => go('vaccine')} style={styles.healthReminderCard}>
            <View style={styles.healthReminderIcon}>
              <Bell color={palette.orange} size={18} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.healthReminderTitle}>有 {urgentHealthCount} 项健康提醒需要关注</Text>
              <Text style={styles.healthReminderText}>{urgentVaccines.slice(0, 2).map((item) => `${item.name} ${vaccineReminderCopy(item)}`).join(' · ')}</Text>
            </View>
            <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} />
          </Pressable>
        ) : null}

        <View style={styles.healthTimelineCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.healthRecentTitle}>近期记录</Text>
            <Pressable onPress={() => go('healthCalendar')} style={[styles.textAction, webPressableReset]}>
              <Text style={styles.healthRecentLink}>查看日历</Text>
            </Pressable>
          </View>
          {recentRows.map(({ Icon, date, dot, sub, title }, index) => (
            <View key={`${title}-${index}`}>
              <View style={styles.healthTimelineRow}>
                <View style={[
                  styles.healthTimelineIcon,
                  dot === 'cool' && styles.healthTimelineIconCool,
                  dot === 'muted' && styles.healthTimelineIconMuted,
                ]}>
                  <Icon color={dot === 'cool' ? palette.teal : dot === 'muted' ? '#C8A871' : palette.orange} size={14} strokeWidth={2.4} />
                </View>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={styles.timelineTitleMake}>{title}</Text>
                  <Text numberOfLines={1} style={styles.timelineSubMake}>{sub}</Text>
                </View>
                <Text style={styles.timelineDateMake}>{date}</Text>
              </View>
              {index < recentRows.length - 1 ? <View style={styles.makeDivider} /> : null}
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  function renderHealthCalendar() {
    const pet = getCurrentPet();
    const monthDate = parseIsoDate(healthCalendarMonth) ?? new Date();
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const today = todayIsoDate();
    const selectedDate = selectedHealthCalendarDate;
    const selectedDateObject = parseIsoDate(selectedDate);
    const firstDayOffset = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<null | number> = [
      ...Array.from({ length: firstDayOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const visibleEvents = healthCalendarEvents.filter((event) => {
      const date = parseIsoDate(event.date);
      return date && date.getFullYear() === year && date.getMonth() === month;
    });
    const eventsByDay = visibleEvents.reduce<Record<number, HealthCalendarEvent[]>>((next, event) => {
      const day = parseIsoDate(event.date)?.getDate();
      if (!day) return next;
      if (!next[day]) next[day] = [];
      next[day].push(event);
      return next;
    }, {});
    const selectedEvents = healthCalendarEvents.filter((event) => event.date === selectedDate);
    const overdueVaccines = visibleEvents.filter((event) => event.type === 'vaccine' && (event.status === 'overdue' || (daysUntilDate(event.date) ?? 99) < 0));
    const upcomingVaccines = visibleEvents.filter((event) => {
      if (event.type !== 'vaccine' || event.status === 'done') return false;
      const days = daysUntilDate(event.date);
      return days !== null && days >= 0 && days <= 14;
    });
    const monthSummary = visibleEvents.length
      ? `本月共有 ${visibleEvents.length} 条健康记录，继续保持温柔记录`
      : '本月还没有健康记录，先从今天开始';
    const petNote = overdueVaccines.length
      ? `${overdueVaccines.length} 项疫苗/驱虫已逾期，建议尽快处理`
      : visibleEvents.length
        ? `本月已有 ${visibleEvents.length} 条健康记录`
        : '记录越完整，灵伴越懂它';
    const selectedCountLabel = selectedEvents.length ? `${selectedEvents.length} 条记录` : '无记录';
    const showInitialLoading = healthCalendarLoading && !healthCalendarEvents.length;
    const showError = Boolean(healthCalendarError && !healthCalendarEvents.length);

    const selectDay = (day: number) => {
      setSelectedHealthCalendarDate(dateToIsoDate(new Date(year, month, day)));
    };
    const moveMonth = (amount: number) => {
      const nextMonth = shiftMonthIso(healthCalendarMonth, amount);
      const nextDate = parseIsoDate(nextMonth) ?? new Date();
      const nextSelected = nextDate.getFullYear() === new Date().getFullYear() && nextDate.getMonth() === new Date().getMonth()
        ? todayIsoDate()
        : dateToIsoDate(nextDate);
      setHealthCalendarMonth(nextMonth);
      setSelectedHealthCalendarDate(nextSelected);
    };
    const eventMeta = (event: HealthCalendarEvent) => {
      if (event.type === 'weight') return { bg: '#E8F5F3', color: palette.teal, Icon: Weight, label: '体重' };
      if (event.type === 'vaccine') return { bg: '#FBF2D9', color: '#C99B3E', Icon: Syringe, label: '疫苗 / 驱虫' };
      return { bg: '#FFE6D6', color: palette.orange, Icon: NotebookPen, label: '健康备忘' };
    };
    const renderDots = (dayEvents: HealthCalendarEvent[] = []) => (
      <View style={styles.calendarDots}>
        {dayEvents.slice(0, 3).map((event) => (
          <View key={`${event.id}-dot`} style={[styles.calendarDot, { backgroundColor: eventMeta(event).color }]} />
        ))}
      </View>
    );
    const renderEventItem = (event: HealthCalendarEvent) => {
      const meta = eventMeta(event);
      const Icon = meta.Icon;
      const isOverdue = event.type === 'vaccine' && (event.status === 'overdue' || (daysUntilDate(event.date) ?? 99) < 0);
      return (
        <Pressable
          key={event.id}
          onPress={() => {
            if (event.type === 'weight') go('weight');
            if (event.type === 'vaccine') go('vaccine');
            if (event.type === 'memo') {
              const memo = memos.find((item) => item.id === event.sourceId);
              if (memo) openMemoEditor(memo);
              else go('memoNew');
            }
          }}
          style={[styles.calendarEventItem, webPressableReset]}
        >
          <View style={[styles.calendarEventIcon, { backgroundColor: isOverdue ? '#FBE4DE' : meta.bg }]}>
            <Icon color={isOverdue ? palette.danger : meta.color} size={15} strokeWidth={2.4} />
          </View>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.calendarEventTitle}>{event.title}</Text>
            <Text numberOfLines={2} style={styles.calendarEventSub}>{event.detail || meta.label}</Text>
          </View>
          <Text style={styles.calendarEventTime}>{formatCalendarDateLabel(event.date)}</Text>
        </Pressable>
      );
    };

    if (showError) {
      return (
        <Screen title="健康日历">
          <HealthCalendarPetCard note="日历暂时无法加载" pet={pet} />
          <View style={styles.calendarErrorState}>
            <View style={styles.calendarErrorIcon}>
              <WifiOff color={palette.danger} size={28} strokeWidth={2.3} />
            </View>
            <Text style={styles.calendarErrorTitle}>日历读取失败</Text>
            <Text style={styles.calendarErrorText}>可能是网络抖了一下，{pet?.name ?? '灵伴'}的健康记录都在云端保存着，不会丢失</Text>
            <Pressable onPress={() => void loadHealthCalendar()} style={[styles.calendarRetryButton, webPressableReset]}>
              <RefreshCw color="#fff" size={14} strokeWidth={2.5} />
              <Text style={styles.calendarRetryText}>重新加载</Text>
            </Pressable>
            <Pressable onPress={back} style={[styles.calendarLaterButton, webPressableReset]}>
              <Text style={styles.calendarLaterText}>稍后再试</Text>
            </Pressable>
          </View>
        </Screen>
      );
    }

    return (
      <Screen
        refreshControl={<RefreshControl refreshing={healthCalendarRefreshing} tintColor={palette.orange} onRefresh={() => void loadHealthCalendar({ refreshing: true })} />}
        title="健康日历"
      >
        {(showInitialLoading || healthCalendarRefreshing) ? (
          <View style={styles.calendarSyncRibbon}>
            <ActivityIndicator color={palette.orange} size="small" />
            <Text style={styles.calendarSyncText}>正在为{pet?.name ?? '灵伴'}同步健康日历...</Text>
          </View>
        ) : null}

        <HealthCalendarPetCard note={petNote} pet={pet} />

        <View style={styles.calendarMonthSwitcher}>
          <Pressable onPress={() => moveMonth(-1)} style={[styles.calendarMonthButton, webPressableReset]}>
            <ChevronLeft color={palette.ink} size={16} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.calendarMonthLabel}>{formatMonthLabel(healthCalendarMonth)}</Text>
          <Pressable onPress={() => moveMonth(1)} style={[styles.calendarMonthButton, webPressableReset]}>
            <ChevronRight color={palette.ink} size={16} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.calendarGridCard}>
          <View style={styles.calendarWeekRow}>
            {['日', '一', '二', '三', '四', '五', '六'].map((label, index) => (
              <Text key={label} style={[styles.calendarWeekText, (index === 0 || index === 6) && styles.calendarWeekTextWeekend]}>{label}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {showInitialLoading
              ? Array.from({ length: 35 }).map((_, index) => (
                <View key={`skeleton-${index}`} style={styles.calendarDayCell}>
                  <SkeletonLine borderRadius={11} height={22} width={22} />
                </View>
              ))
              : cells.map((day, index) => {
                if (!day) return <View key={`empty-${index}`} style={styles.calendarDayCell} />;
                const dayDate = dateToIsoDate(new Date(year, month, day));
                const dayEvents = eventsByDay[day] ?? [];
                const selected = dayDate === selectedDate;
                const isToday = dayDate === today && !selected;
                const overdue = dayEvents.some((event) => event.type === 'vaccine' && (event.status === 'overdue' || (daysUntilDate(event.date) ?? 99) < 0));
                return (
                  <Pressable key={dayDate} onPress={() => selectDay(day)} style={[styles.calendarDayCell, webPressableReset]}>
                    <View style={[
                      styles.calendarDayCircle,
                      selected && styles.calendarDayCircleSelected,
                      isToday && styles.calendarDayCircleToday,
                      overdue && !selected && styles.calendarDayCircleOverdue,
                    ]}>
                      <Text style={[
                        styles.calendarDayText,
                        selected && styles.calendarDayTextSelected,
                        overdue && !selected && styles.calendarDayTextOverdue,
                        (isToday || selected || overdue) && styles.calendarDayTextStrong,
                      ]}>{day}</Text>
                    </View>
                    {renderDots(dayEvents)}
                  </Pressable>
                );
              })}
          </View>
          <View style={styles.calendarLegend}>
            {[
              { bg: palette.teal, label: '体重' },
              { bg: '#C99B3E', label: '疫苗 / 驱虫' },
              { bg: palette.orange, label: '健康备忘' },
            ].map((item) => (
              <View key={item.label} style={styles.calendarLegendItem}>
                <View style={[styles.calendarLegendDot, { backgroundColor: item.bg }]} />
                <Text style={styles.calendarLegendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {overdueVaccines[0] ? (
          <Pressable onPress={() => go('vaccine')} style={[styles.calendarOverdueCard, webPressableReset]}>
            <View style={styles.calendarOverdueIcon}>
              <AlertTriangle color={palette.danger} size={15} strokeWidth={2.5} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.calendarOverdueTitle}>{overdueVaccines[0].title}已逾期</Text>
              <Text style={styles.calendarOverdueText}>{overdueVaccines[0].detail || `${formatCalendarDateLabel(overdueVaccines[0].date)} 应完成`}</Text>
            </View>
            <Text style={styles.calendarOverdueAction}>处理</Text>
          </Pressable>
        ) : upcomingVaccines[0] ? (
          <Pressable onPress={() => go('vaccine')} style={[styles.calendarUpcomingCard, webPressableReset]}>
            <View style={styles.calendarUpcomingIcon}>
              <Syringe color="#C99B3E" size={15} strokeWidth={2.5} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.calendarUpcomingTitle}>{upcomingVaccines[0].title} · {formatDueLabel(upcomingVaccines[0].date)}</Text>
              <Text style={styles.calendarUpcomingText}>建议在 {formatCalendarDateLabel(upcomingVaccines[0].date)} 前完成</Text>
            </View>
            <Text style={styles.calendarUpcomingDate}>{formatCompactDateLabel(upcomingVaccines[0].date, '待设置')}</Text>
          </Pressable>
        ) : (
          <View style={styles.calendarSummaryCard}>
            <View style={styles.calendarSummaryIcon}>
              <Sparkles color={palette.orange} size={15} strokeWidth={2.4} />
            </View>
            <Text style={styles.calendarSummaryText}>{monthSummary}</Text>
          </View>
        )}

        <View style={styles.calendarSelectedHeader}>
          <View>
            <Text style={styles.calendarSelectedDate}>{formatCalendarDateLabel(selectedDate)}</Text>
            <Text style={styles.calendarSelectedWeek}>{selectedDateObject ? weekdayLabel(selectedDate) : '日期待确认'}</Text>
          </View>
          <Text style={[styles.calendarSelectedCount, !selectedEvents.length && styles.calendarSelectedCountMuted]}>{selectedCountLabel}</Text>
        </View>

        {showInitialLoading ? (
          <View style={styles.calendarSkeletonList}>
            {[0, 1].map((item) => (
              <View key={item} style={styles.calendarSkeletonRow}>
                <SkeletonLine borderRadius={10} height={32} width={32} />
                <View style={styles.calendarSkeletonTextStack}>
                  <SkeletonLine height={11} width="58%" />
                  <SkeletonLine borderRadius={5} height={9} width="42%" />
                </View>
              </View>
            ))}
          </View>
        ) : selectedEvents.length ? (
          <View style={styles.calendarEventList}>
            {selectedEvents.map(renderEventItem)}
          </View>
        ) : (
          <View style={styles.calendarEmptyCard}>
            <View style={styles.calendarEmptyIcon}>
              <PawPrint color={palette.muted} size={22} strokeWidth={2.3} />
            </View>
            <Text style={styles.calendarEmptyTitle}>这一天还没有健康记录</Text>
            <Text style={styles.calendarEmptyText}>随手记一笔，让{pet?.name ?? '灵伴'}的健康曲线更完整</Text>
            <Pressable onPress={() => go('memoNew')} style={[styles.calendarEmptyButton, webPressableReset]}>
              <Plus color="#fff" size={14} strokeWidth={2.6} />
              <Text style={styles.calendarEmptyButtonText}>添加一条记录</Text>
            </Pressable>
          </View>
        )}
      </Screen>
    );
  }

  function renderHealthMemos() {
    const petName = getCurrentPet()?.name ?? '灵伴';
    return (
      <Screen
        right={(
          <Pressable accessibilityLabel="新增健康备忘" accessibilityRole="button" onPress={() => go('memoNew')} style={[styles.weightAddLink, webPressableReset]}>
            <Plus color={palette.orange} size={15} strokeWidth={2.6} />
            <Text style={styles.weightAddLinkText}>新增</Text>
          </Pressable>
        )}
        title="健康备忘"
      >
        <View style={styles.memoIntroCard}>
          <View style={styles.memoIntroIcon}>
            <NotebookPen color={palette.orange} size={16} strokeWidth={2.4} />
          </View>
          <Text style={styles.memoIntroText}>备忘可以记录洗澡、用药、心情、奇怪小习惯…</Text>
        </View>

        {memos.length ? (
          <View style={styles.memoListCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>全部备忘</Text>
              <Text style={styles.metaText}>{memos.length} 条</Text>
            </View>
            {memos.map((memo, index) => (
              <View key={memo.id}>
                <Pressable onPress={() => openMemoEditor(memo)} style={[styles.memoListRow, webPressableReset]}>
                  <View style={styles.memoListIcon}>
                    <NotebookPen color={index % 2 === 1 ? palette.teal : palette.orange} size={15} strokeWidth={2.4} />
                  </View>
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={styles.timelineTitleMake}>{memo.title}</Text>
                    <Text numberOfLines={2} style={styles.timelineSubMake}>{memo.content}</Text>
                    {memo.reminderEnabled && memo.reminderAt ? (
                      <Text numberOfLines={1} style={styles.memoListReminderText}>
                        提醒：{memo.reminderAt} · {memoRepeatLabel(memo.repeat)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.memoListTrail}>
                    <Text style={styles.timelineDateMake}>{formatOptionalDateLabel(memo.updatedAt)}</Text>
                    <ChevronRight color={palette.muted} size={14} strokeWidth={2.2} />
                  </View>
                </Pressable>
                {index < memos.length - 1 ? <View style={styles.makeDivider} /> : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.memoEmptyMake}>
            <View style={styles.memoEmptyArt}>
              <View style={styles.memoEmptyGlow} />
              <View style={styles.memoEmptyCircle}>
                <NotebookPen color={palette.orange} size={38} strokeWidth={1.7} />
              </View>
            </View>
            <Text style={styles.memoEmptyTitle}>还没有健康备忘</Text>
            <Text style={styles.memoEmptyDesc}>随手记下{petName}今天的小事，未来翻起来会很温暖</Text>
            <Pressable onPress={() => go('memoNew')} style={[styles.memoEmptyButton, webPressableReset]}>
              <Plus color="#fff" size={15} strokeWidth={2.7} />
              <Text style={styles.memoEmptyButtonText}>新建备忘</Text>
            </Pressable>
          </View>
        )}
      </Screen>
    );
  }

  function renderMemoNew() {
    const memoTypes = [
      { Icon: Sparkles, label: '洗澡' },
      { Icon: Shield, label: '驱虫' },
      { Icon: Stethoscope, label: '体检' },
      { Icon: NotebookPen, label: '其他' },
    ];
    const titleCount = memoDraftTitle.trim().length;
    const contentCount = memoDraftContent.trim().length;
    const invalid = !memoDraftTitle.trim() || !memoDraftContent.trim() || titleCount > 20 || contentCount > 200;
    const adjustMemoReminderAt = () => {
      if (!memoDraftReminderEnabled) return;
      setMemoDraftReminderAt((current) => {
        const next = nextMemoReminderDate(memoDraftRepeat, current);
        showToast(`提醒时间已调整为 ${formatMemoReminderLabel(next)}`, { tone: 'success', variant: 'surface' });
        return next;
      });
    };
    return (
      <Screen
        right={(
          <Pressable disabled={invalid || memoDraftSaving} onPress={() => void saveMemoDraft()} style={[styles.memoTopSave, (invalid || memoDraftSaving) && styles.memoTopSaveDisabled, webPressableReset]}>
            <Text style={[styles.memoTopSaveText, (invalid || memoDraftSaving) && styles.memoTopSaveTextDisabled]}>{memoDraftSaving ? '保存中' : '保存'}</Text>
          </Pressable>
        )}
        title="新增健康备忘"
      >
        <View style={styles.memoNewPage}>
          <Text style={styles.memoFieldLabel}>备忘类型</Text>
          <View style={styles.memoTypeGrid}>
            {memoTypes.map(({ Icon, label }) => {
              const active = memoDraftTitle === label;
              return (
                <Pressable key={label} onPress={() => setMemoDraftTitle(label)} style={[styles.memoTypeCell, active && styles.memoTypeCellActive, webPressableReset]}>
                  <Icon color={active ? palette.orange : palette.muted} size={18} strokeWidth={2.4} />
                  <Text style={[styles.memoTypeText, active && styles.memoTypeTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.fieldHintRow}>
            <Text style={[styles.fieldHintText, !memoDraftTitle.trim() && styles.fieldHintError]}>{!memoDraftTitle.trim() ? '请选择备忘类型' : ' '}</Text>
            <Text style={styles.fieldHintText}>{titleCount}/20</Text>
          </View>

          <Text style={styles.memoFieldLabel}>提醒时间</Text>
          <Pressable
            disabled={!memoDraftReminderEnabled}
            onPress={Platform.OS === 'web' ? adjustMemoReminderAt : () => openMemoReminderDatePicker('draft')}
            style={[styles.memoPickerRow, !memoDraftReminderEnabled && styles.memoPickerRowDisabled, webPressableReset]}
          >
            <CalendarDays color={palette.orange} size={16} strokeWidth={2.4} />
            <Text style={styles.memoPickerValue}>{memoDraftReminderEnabled ? formatMemoReminderLabel(memoDraftReminderAt) : '未开启提醒'}</Text>
            <ChevronRight color={palette.muted} size={16} strokeWidth={2.4} />
          </Pressable>

          <Text style={styles.memoFieldLabel}>重复</Text>
          <View style={styles.memoRepeatRow}>
            {memoRepeatOptions.map((item) => {
              const active = item.value === memoDraftRepeat;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    setMemoDraftRepeat(item.value);
                    setMemoDraftReminderAt(nextMemoReminderDate(item.value));
                  }}
                  style={[styles.memoRepeatOption, active && styles.memoRepeatOptionActive, webPressableReset]}
                >
                  <Text style={[styles.memoRepeatText, active && styles.memoRepeatTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.memoFieldLabel}>备注</Text>
          <TextInput
            multiline
            onChangeText={setMemoDraftContent}
            placeholder="今天有什么值得记录的小事？"
            placeholderTextColor="#B8B3A8"
            style={[styles.memoNoteInput, contentCount > 200 && styles.makeTextInputError, webTextInputReset]}
            textAlignVertical="top"
            value={memoDraftContent}
          />
          <View style={styles.fieldHintRow}>
            <Text style={[styles.fieldHintText, contentCount > 200 && styles.fieldHintError]}>{!memoDraftContent.trim() ? '备忘内容不能为空' : contentCount > 200 ? '内容最多 200 个字' : ' '}</Text>
            <Text style={[styles.fieldHintText, contentCount > 200 && styles.fieldHintError]}>{contentCount}/200</Text>
          </View>

          <Pressable onPress={() => setMemoDraftReminderEnabled((enabled) => !enabled)} style={[styles.memoReminderRow, webPressableReset]}>
            <View style={styles.memoReminderIcon}>
              <Bell color={palette.orange} size={15} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.timelineTitleMake}>到期前提醒</Text>
              <Text style={styles.timelineSubMake}>{memoDraftReminderEnabled ? '提前 3 天通知' : '已关闭提醒'}</Text>
            </View>
            <View style={[styles.memoSwitchTrack, !memoDraftReminderEnabled && styles.memoSwitchTrackOff]}>
              <View style={[styles.memoSwitchThumb, !memoDraftReminderEnabled && styles.memoSwitchThumbOff]} />
            </View>
          </Pressable>

          <Pressable disabled={invalid || memoDraftSaving} onPress={() => void saveMemoDraft()} style={[styles.memoPrimaryCta, (invalid || memoDraftSaving) && styles.memoPrimaryCtaDisabled, webPressableReset]}>
            {memoDraftSaving ? <ActivityIndicator color="#fff" size="small" /> : <Check color="#fff" size={16} strokeWidth={3} />}
            <Text style={styles.memoPrimaryCtaText}>{memoDraftSaving ? '正在保存备忘…' : '保存备忘'}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  function renderMemoEdit() {
    const titleCount = memoEditTitle.trim().length;
    const contentCount = memoEditContent.trim().length;
    const invalid = !memoEditTitle.trim() || !memoEditContent.trim() || titleCount > 20 || contentCount > 200;
    const controlsDisabled = memoEditSaving || memoDeleting;
    const adjustMemoEditReminderAt = () => {
      if (!memoEditReminderEnabled || controlsDisabled) return;
      const next = nextMemoReminderDate(memoEditRepeat, memoEditReminderAt);
      setMemoEditReminderAt(next);
      showToast(`提醒时间已调整为 ${formatMemoReminderLabel(next)}`, { tone: 'success', variant: 'surface' });
    };
    return (
      <Screen title="编辑备忘">
        <View style={styles.memoEditPageMake}>
          {memoEditSaving ? (
            <View style={styles.memoSavingPuffMake}>
              <ActivityIndicator color={palette.orange} size="small" />
              <Text style={styles.memoSavingPuffTextMake}>正在保存备忘...</Text>
            </View>
          ) : null}
        <View style={[styles.memoEditFormMake, memoEditSaving && styles.memoSavingContentDimMake]}>
          <View style={styles.makeFieldGroup}>
            <Text style={styles.makeFieldLabel}>备忘标题 *</Text>
            <TextInput
              onChangeText={setMemoEditTitle}
              placeholder="例如：洗澡记录"
              placeholderTextColor="#B8B3A8"
              style={[styles.makeTextInput, (!memoEditTitle.trim() || titleCount > 20) && styles.makeTextInputError, webTextInputReset]}
              value={memoEditTitle}
            />
            <View style={styles.fieldHintRow}>
              <Text style={[styles.fieldHintText, titleCount > 20 && styles.fieldHintError]}>{!memoEditTitle.trim() ? '标题不能为空' : titleCount > 20 ? '标题最多 20 个字' : ' '}</Text>
              <Text style={[styles.fieldHintText, titleCount > 20 && styles.fieldHintError]}>{titleCount}/20</Text>
            </View>
          </View>
          <View style={styles.makeFieldGroup}>
            <Text style={styles.makeFieldLabel}>备忘内容 *</Text>
            <TextInput
              multiline
              onChangeText={setMemoEditContent}
              placeholder="今天有什么值得记录的小事？"
              placeholderTextColor="#B8B3A8"
              style={[styles.makeTextInput, styles.makeTextAreaInput, styles.memoEditContentInputMake, (!memoEditContent.trim() || contentCount > 200) && styles.makeTextInputError, webTextInputReset]}
              textAlignVertical="top"
              value={memoEditContent}
            />
            <View style={styles.fieldHintRow}>
              <Text style={[styles.fieldHintText, contentCount > 200 && styles.fieldHintError]}>{!memoEditContent.trim() ? '内容不能为空' : contentCount > 200 ? '内容最多 200 个字' : ' '}</Text>
              <Text style={[styles.fieldHintText, contentCount > 200 && styles.fieldHintError]}>{contentCount}/200</Text>
            </View>
          </View>

          <View style={styles.makeFieldGroup}>
            <Text style={styles.makeFieldLabel}>提醒时间</Text>
            <Pressable
              disabled={!memoEditReminderEnabled || controlsDisabled}
              onPress={Platform.OS === 'web' ? adjustMemoEditReminderAt : () => openMemoReminderDatePicker('edit')}
              style={[styles.memoPickerRow, (!memoEditReminderEnabled || controlsDisabled) && styles.memoPickerRowDisabled, webPressableReset]}
            >
              <CalendarDays color={palette.orange} size={16} strokeWidth={2.4} />
              <Text style={styles.memoPickerValue}>{memoEditReminderEnabled ? formatMemoReminderLabel(memoEditReminderAt) : '未开启提醒'}</Text>
              <ChevronRight color={palette.muted} size={16} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View style={styles.makeFieldGroup}>
            <Text style={styles.makeFieldLabel}>重复</Text>
            <View style={styles.memoRepeatRow}>
              {memoRepeatOptions.map((item) => {
                const active = item.value === memoEditRepeat;
                return (
                  <Pressable
                    disabled={controlsDisabled}
                    key={item.value}
                    onPress={() => {
                      setMemoEditRepeat(item.value);
                      setMemoEditReminderAt(nextMemoReminderDate(item.value));
                    }}
                    style={[styles.memoRepeatOption, active && styles.memoRepeatOptionActive, controlsDisabled && styles.opacity60, webPressableReset]}
                  >
                    <Text style={[styles.memoRepeatText, active && styles.memoRepeatTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            disabled={controlsDisabled}
            onPress={() => setMemoEditReminderEnabled((enabled) => !enabled)}
            style={[styles.memoReminderRow, controlsDisabled && styles.opacity60, webPressableReset]}
          >
            <View style={styles.memoReminderIcon}>
              <Bell color={palette.orange} size={15} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.timelineTitleMake}>到期前提醒</Text>
              <Text style={styles.timelineSubMake}>{memoEditReminderEnabled ? '提前 3 天通知' : '已关闭提醒'}</Text>
            </View>
            <View style={[styles.memoSwitchTrack, !memoEditReminderEnabled && styles.memoSwitchTrackOff]}>
              <View style={[styles.memoSwitchThumb, !memoEditReminderEnabled && styles.memoSwitchThumbOff]} />
            </View>
          </Pressable>

          <View style={styles.memoMetaCard}>
            <View style={[styles.memoMetaRowMake, styles.memoMetaRowBorder]}>
              <View style={styles.metaIconBox}>
                <CalendarDays color={palette.muted} size={13} strokeWidth={2.3} />
              </View>
              <Text style={styles.memoMetaLabelMake}>更新日期</Text>
              <Text style={styles.memoMetaValueMake}>{formatOptionalDateLabel(selectedMemo?.updatedAt)}</Text>
            </View>
            <View style={styles.memoMetaRowMake}>
              <View style={styles.metaIconBox}>
                <Tag color={palette.muted} size={13} strokeWidth={2.3} />
              </View>
              <Text style={styles.memoMetaLabelMake}>分类</Text>
              <Text style={styles.memoMetaValueMake}>日常护理</Text>
            </View>
          </View>
        </View>
        <View style={[styles.editActionStack, memoEditSaving && styles.memoSavingContentDimMake]}>
          <Pressable disabled={memoDeleting || memoEditSaving} onPress={confirmDeleteMemo} style={[styles.deleteTextButton, webPressableReset]}>
            {memoDeleting ? <ActivityIndicator color={palette.danger} size="small" /> : <Trash2 color={palette.danger} size={15} strokeWidth={2.4} />}
            <Text style={styles.deleteTextButtonLabel}>删除备忘</Text>
          </Pressable>
          <Button disabled={invalid} loading={memoEditSaving} onPress={() => void saveMemoEdit()}>保存修改</Button>
        </View>
        </View>
      </Screen>
    );
  }

  function renderWeight() {
    const pet = getCurrentPet();
    const currentWeight = healthSummary?.latestWeightKg ?? weights[0]?.kg ?? pet?.weightKg;
    const previousWeight = weights[1]?.kg;
    const weightDelta = Number.isFinite(Number(currentWeight)) && Number.isFinite(Number(previousWeight))
      ? Number(currentWeight) - Number(previousWeight)
      : 0;
    const weightDeltaLabel = weightDelta === 0 ? '0' : Math.abs(weightDelta).toFixed(1).replace(/\.0$/, '');
    const isWeightWatch = healthSummary?.weightStatus === 'watch' || Math.abs(weightDelta) >= 1.5;
    const directionCopy = weights.length < 2
      ? '首次记录'
      : weightDelta < 0
        ? `30 天 -${weightDeltaLabel} kg`
        : weightDelta > 0
          ? `30 天 +${weightDeltaLabel} kg`
          : '30 天稳定';
    const weightValues = weights.map((item) => item.kg).filter((value) => Number.isFinite(Number(value)));
    const averageWeight = weightValues.length ? weightValues.reduce((sum, value) => sum + value, 0) / weightValues.length : undefined;
    const minWeight = weightValues.length ? Math.min(...weightValues) : undefined;
    const maxWeight = weightValues.length ? Math.max(...weightValues) : undefined;
    const weightSpread = Number.isFinite(Number(minWeight)) && Number.isFinite(Number(maxWeight)) ? Number(maxWeight) - Number(minWeight) : undefined;
    const historyDeltaFor = (index: number) => {
      const current = weights[index];
      const next = weights[index + 1];
      if (!current || !next) return null;
      const delta = current.kg - next.kg;
      if (Math.abs(delta) < 0.05) return { direction: 'flat' as const, label: '0' };
      return {
        direction: delta > 0 ? 'up' as const : 'down' as const,
        label: `${delta > 0 ? '+' : '-'}${Math.abs(delta).toFixed(1).replace(/\.0$/, '')}`,
      };
    };
    return (
      <Screen title="体重记录">
        {weights.length ? (
          <>
            <View style={styles.weightTrendCard}>
              <View style={styles.weightTrendHeader}>
                <View>
                  <Text style={styles.weightTrendLabel}>当前体重</Text>
                  <View style={styles.weightTrendValueRow}>
                    <Text style={styles.weightTrendValue}>{Number.isFinite(Number(currentWeight)) ? Number(currentWeight).toFixed(1).replace(/\.0$/, '') : '--'}</Text>
                    <Text style={styles.weightTrendUnit}>kg</Text>
                  </View>
                </View>
                <View style={[styles.weightDeltaPill, isWeightWatch && styles.weightDeltaPillWarn]}>
                  {weightDelta < 0 ? (
                    <ArrowDown color={isWeightWatch ? '#C99B3E' : palette.teal} size={11} strokeWidth={3} />
                  ) : (
                    <ArrowUp color={isWeightWatch ? '#C99B3E' : palette.teal} size={11} strokeWidth={3} />
                  )}
                  <Text style={[styles.homeHealthDeltaText, isWeightWatch && styles.weightWarnText]}>{directionCopy}</Text>
                </View>
              </View>
              <WeightTrendMiniChart abnormal={isWeightWatch} records={weights} />
              <View style={styles.weightStatRow}>
                <View style={styles.weightStatChip}>
                  <Text style={styles.metricLabel}>近 7 天均值</Text>
                  <Text numberOfLines={1} style={styles.metricValue}>{formatWeightKg(averageWeight).replace(' kg', '')}</Text>
                </View>
                <View style={[styles.weightStatChip, styles.weightStatChipOk]}>
                  <Text style={styles.metricLabel}>健康区间</Text>
                  <Text numberOfLines={1} style={[styles.metricValue, styles.weightOkText]}>观察中</Text>
                </View>
                <View style={[styles.weightStatChip, isWeightWatch && styles.weightStatChipWarn]}>
                  <Text style={styles.metricLabel}>波动</Text>
                  <Text numberOfLines={1} style={[styles.metricValue, isWeightWatch && styles.weightWarnText]}>{Number.isFinite(Number(weightSpread)) ? `±${(Number(weightSpread) / 2).toFixed(1).replace(/\.0$/, '')}` : '--'}</Text>
                </View>
              </View>
            </View>
            {isWeightWatch ? (
              <View style={styles.weightNoticeWarn}>
                <View style={styles.weightNoticeIconWarn}>
                  <Sparkles color="#C99B3E" size={16} strokeWidth={2.4} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.timelineTitleMake}>近 30 天体重变化较快</Text>
                  <Text style={styles.timelineSubMake}>可能与饮食、运动或天气有关。如伴随食欲/精神变化，建议咨询兽医。</Text>
                </View>
              </View>
            ) : (
              <View style={styles.weightNoticeOk}>
                <View style={styles.weightNoticeIconOk}>
                  <HeartPulse color={palette.teal} size={16} strokeWidth={2.4} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.timelineTitleMake}>{weights.length < 2 ? '已开始记录体重' : `${pet?.name ?? '灵伴'}近 30 天体重平稳`}</Text>
                  <Text style={styles.timelineSubMake}>{weights.length < 2 ? '再记录几次后，灵伴会给出更可靠的趋势判断。' : healthSummary?.weightSummary ?? '一直在健康区间里，继续保持现在的饮食与运动节奏。'}</Text>
                </View>
              </View>
            )}
            <View style={styles.weightHistoryHeader}>
              <Text style={styles.weightSectionTitle}>历史记录</Text>
              <Pressable onPress={() => openWeightAddEditor(currentWeight)} style={[styles.weightAddLink, webPressableReset]}>
                <Plus color={palette.orange} size={12} strokeWidth={2.5} />
                <Text style={styles.weightAddLinkText}>添加</Text>
              </Pressable>
            </View>
            <View style={styles.weightHistoryStack}>
              {weights.map((item, index) => {
                const delta = historyDeltaFor(index);
                const deltaColor = delta?.direction === 'down' ? palette.teal : delta?.direction === 'up' ? '#C99B3E' : palette.muted;
                return (
                  <Pressable key={item.id} onPress={() => openWeightEditor(item)} style={[styles.weightHistoryRowMake, index === 0 && styles.weightHistoryRowHighlight, webPressableReset]}>
                    <View style={styles.weightHistoryIcon}>
                      <Weight color={palette.teal} size={14} strokeWidth={2.4} />
                    </View>
                    <View style={styles.flex}>
                      <View style={styles.weightHistoryTitleRow}>
                        <Text style={styles.timelineTitleMake}>{formatWeightKg(item.kg)}</Text>
                        {delta ? (
                          <View style={styles.weightHistoryDelta}>
                            {delta.direction === 'down' ? (
                              <ArrowDown color={deltaColor} size={11} strokeWidth={2.5} />
                            ) : delta.direction === 'up' ? (
                              <ArrowUp color={deltaColor} size={11} strokeWidth={2.5} />
                            ) : null}
                            <Text style={[styles.weightHistoryDeltaText, { color: deltaColor }]}>{delta.label}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text numberOfLines={1} style={styles.timelineSubMake}>{formatOptionalDateLabel(item.recordedAt)}{item.note ? ` · ${item.note}` : ''}</Text>
                    </View>
                    <Edit3 color={palette.muted} size={15} strokeWidth={2.2} />
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.weightEmptyMake}>
            <View style={styles.weightEmptyArt}>
              <View style={styles.weightEmptyGlow} />
              <View style={styles.weightEmptyCircle}>
                <Svg height={60} viewBox="0 0 60 60" width={60}>
                  <Path d="M 6 42 L 18 32 L 28 38 L 40 22 L 54 18" fill="none" stroke={palette.teal} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
                  <Circle cx={54} cy={18} fill={palette.teal} r={4} />
                </Svg>
              </View>
            </View>
            <Text style={styles.weightEmptyTitle}>还没有体重记录</Text>
            <Text style={styles.weightEmptyDesc}>每周称一次，就能看见{pet?.name ?? '毛孩子'}成长的轨迹。</Text>
            <Pressable onPress={() => openWeightAddEditor(currentWeight)} style={[styles.weightEmptyButton, webPressableReset]}>
              <Plus color="#fff" size={14} strokeWidth={2.6} />
              <Text style={styles.weightEmptyButtonText}>记录第一次体重</Text>
            </Pressable>
            <View style={styles.weightEmptyTip}>
              <Sparkles color={palette.orange} size={13} strokeWidth={2.4} />
              <Text style={styles.weightEmptyTipText}>记录后会自动生成趋势曲线和健康提示。</Text>
            </View>
          </View>
        )}
        <BottomSheet contentStyle={styles.weightEditSheet} dismissDisabled={weightEditSaving || weightSaving} onClose={closeWeightEditor} visible={Boolean(weightEditorMode)}>
          <View style={styles.rowBetween}>
            <Text style={styles.sheetTitle}>{weightEditorMode === 'add' ? '记录体重' : '编辑体重记录'}</Text>
            <Pressable disabled={weightEditSaving || weightSaving} onPress={closeWeightEditor} style={webPressableReset}>
              <X color={palette.muted} size={18} strokeWidth={2.3} />
            </Pressable>
          </View>
          <View style={styles.weightNumberInput}>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setWeightEditValue}
              placeholder="0.0"
              placeholderTextColor="#B8B3A8"
              style={[styles.weightNumberInputText, webTextInputReset]}
              value={weightEditValue}
            />
            <Text style={styles.weightUnitText}>kg</Text>
          </View>
          <View style={styles.quickWeightRow}>
            {[-0.1, 0.1, 0.5].map((delta) => (
              <Pressable
                key={delta}
                onPress={() => {
                  const base = Number.parseFloat(weightEditValue);
                  if (Number.isFinite(base)) setWeightEditValue(String(Math.max(0, Math.round((base + delta) * 10) / 10)));
                }}
                style={[styles.quickWeightChip, webPressableReset]}
              >
                <Text style={styles.quickWeightText}>{delta > 0 ? `+${delta}` : delta}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.weightSheetMetaCard}>
            <Pressable
              disabled={weightEditSaving || weightSaving}
              onPress={openWeightRecordDatePicker}
              style={[styles.weightSheetMetaRow, (weightEditSaving || weightSaving) && styles.opacity60, webPressableReset]}
            >
              <View style={styles.metaIconBox}>
                <CalendarDays color={palette.muted} size={13} strokeWidth={2.3} />
              </View>
              <Text style={styles.memoMetaLabelMake}>{weightEditRecord ? '记录日期' : '记录时间'}</Text>
              <Text style={styles.memoMetaValueMake}>
                {weightEditRecord ? formatCalendarDateLabel(weightEditRecord.recordedAt) : formatTodayTimeLabel(weightDraftRecordedAt)}
              </Text>
              <ChevronRight color={palette.muted} size={14} strokeWidth={2.3} />
            </Pressable>
            <View style={styles.makeDivider} />
            <View style={styles.weightSheetNoteRow}>
              <View style={styles.metaIconBox}>
                <Edit3 color={palette.muted} size={13} strokeWidth={2.3} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.memoMetaLabelMake}>备注</Text>
                <TextInput
                  onChangeText={setWeightEditNote}
                  placeholder="例如：晨起空腹"
                  placeholderTextColor="#B8B3A8"
                  style={[styles.weightSheetNoteInput, webTextInputReset]}
                  value={weightEditNote}
                />
              </View>
            </View>
          </View>
          <View style={styles.editActionStack}>
            <Button loading={weightEditorMode === 'add' ? weightSaving : weightEditSaving} onPress={() => void (weightEditorMode === 'add' ? recordWeight() : saveWeightEdit())}>{weightEditorMode === 'add' ? '保存记录' : '保存修改'}</Button>
            {weightEditorMode === 'edit' ? (
              <Pressable disabled={weightEditSaving} onPress={() => confirmDeleteWeightRecord(weightEditRecord)} style={[styles.deleteTextButton, webPressableReset]}>
                <Trash2 color={palette.danger} size={15} strokeWidth={2.4} />
                <Text style={styles.deleteTextButtonLabel}>删除这条记录</Text>
              </Pressable>
            ) : null}
          </View>
        </BottomSheet>
      </Screen>
    );
  }

  function renderVaccine() {
    const nextVaccine = healthSummary?.nextVaccine ?? pendingVaccines[0] ?? vaccines[0];
    const nextVaccineDueLabel = formatDueLabel(nextVaccine?.dueAt);
    const nextVaccineReminderSaving = nextVaccine ? vaccineReminderSavingIds.includes(nextVaccine.id) : false;
    const overdueVaccine = vaccines.find((item) => item.status === 'overdue' || (daysUntilDate(item.dueAt) ?? 999) < 0);
    const upcomingVaccine = vaccines.find((item) => item.status !== 'done' && (daysUntilDate(item.dueAt) ?? 999) >= 0 && (daysUntilDate(item.dueAt) ?? 999) <= 14);
    const heroStatus = !nextVaccine ? '暂无计划' : nextVaccine.status === 'done' ? '已完成' : nextVaccine.status === 'overdue' ? '已逾期' : (daysUntilDate(nextVaccine.dueAt) ?? 999) <= 14 ? '即将到期' : '计划中';
    const vaccineQuickDates = [
      { date: todayIsoDate(), label: '今天' },
      { date: addDaysIsoDate(7), label: '7 天后' },
      { date: addDaysIsoDate(30), label: '30 天后' },
      { date: addDaysIsoDate(90), label: '90 天后' },
    ];
    const vaxRowMeta = (item: VaccinePlan) => {
      const days = daysUntilDate(item.dueAt);
      const dueDateLabel = formatOptionalDateLabel(item.dueAt, '日期待确认');
      if (item.status === 'done') return { label: '已完成', style: styles.vaccineStateDone, sub: `已完成 · ${dueDateLabel}`, textStyle: styles.vaccineStateDoneText };
      if (item.status === 'overdue' || (days !== null && days < 0)) return { label: '已逾期', style: styles.vaccineStateOverdue, sub: `${vaccineReminderCopy(item)} · ${dueDateLabel}`, textStyle: styles.vaccineStateOverdueText };
      if (days !== null && days <= 14) return { label: '待接种', style: styles.vaccineStateUpcoming, sub: `${vaccineReminderCopy(item)} · ${vaccineReminderIds.includes(item.id) ? '提醒已开启' : '未开启提醒'}`, textStyle: styles.vaccineStateUpcomingText };
      return { label: '计划中', style: styles.vaccineStatePlanned, sub: `${vaccineReminderCopy(item)} · ${dueDateLabel}`, textStyle: styles.vaccineStatePlannedText };
    };
    return (
      <Screen title="疫苗计划">
        <View style={styles.vaccineHeroMake}>
          <View style={styles.vaccineHeroGlow} />
          <View style={styles.vaccineHeroTop}>
            <View style={styles.flex}>
              <Text style={[styles.vaccineDuePill, nextVaccine?.status === 'overdue' && styles.vaccineDuePillDanger]}>{heroStatus}</Text>
              <Text style={styles.vaccineHeroTitle}>{nextVaccine?.name ?? '暂无计划'}</Text>
              <View style={styles.chatOnlineRow}>
                <CalendarDays color="rgba(31,33,29,0.72)" size={12} strokeWidth={2.3} />
                <Text style={styles.vaccineHeroMeta}>{formatOptionalDateLabel(nextVaccine?.dueAt, '待设置')} · {nextVaccineDueLabel}</Text>
              </View>
            </View>
            <View style={styles.vaccineHeroIcon}>
              <Syringe color={palette.orange} size={26} strokeWidth={2.5} />
            </View>
          </View>
          <View style={styles.vaccineHeroActions}>
            <Pressable disabled={!nextVaccine || nextVaccine.status === 'done' || nextVaccineReminderSaving} onPress={() => void enableVaccineReminder(nextVaccine)} style={[styles.vaccineHeroActionSecondary, (!nextVaccine || nextVaccine.status === 'done') && styles.vaccineHeroActionDisabled, webPressableReset]}>
              {nextVaccineReminderSaving ? <ActivityIndicator color={palette.orange} size="small" /> : <Bell color={palette.orange} size={13} strokeWidth={2.4} />}
              <Text style={[styles.vaccineHeroActionSecondaryText, (!nextVaccine || nextVaccine.status === 'done') && styles.vaccineHeroActionDisabledText]}>{nextVaccine && vaccineReminderIds.includes(nextVaccine.id) ? '提醒已开启' : '开启提醒'}</Text>
            </Pressable>
          </View>
        </View>

        {overdueVaccine ? (
          <Pressable onPress={() => openVaccineClinicSearch(overdueVaccine)} style={[styles.vaccineReminderDanger, webPressableReset]}>
            <View style={styles.vaccineReminderIconDanger}>
              <AlertTriangle color={palette.danger} size={15} strokeWidth={2.5} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.timelineTitleMake}>{overdueVaccine.name}已逾期</Text>
              <Text style={styles.timelineSubMake}>别担心，挑个有空的下午带{getCurrentPet()?.name ?? '毛孩子'}去补打就好。</Text>
            </View>
            <Text style={styles.vaccineReminderActionText}>预约</Text>
          </Pressable>
        ) : null}

        {upcomingVaccine ? (
          <View style={styles.vaccineReminderWarm}>
            <View style={styles.vaccineReminderIconWarm}>
              <Syringe color="#C99B3E" size={15} strokeWidth={2.5} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.timelineTitleMake}>{upcomingVaccine.name} · {vaccineReminderCopy(upcomingVaccine)}</Text>
              <Text style={styles.timelineSubMake}>建议在 {formatOptionalDateLabel(upcomingVaccine.dueAt)} 前完成。</Text>
            </View>
            <Text style={styles.timelineDateMake}>{formatCompactDateLabel(upcomingVaccine.dueAt)}</Text>
          </View>
        ) : null}

        <View style={styles.vaccinePlanBlock}>
          <View style={styles.vaccinePlanHeader}>
            <Text style={styles.weightSectionTitle}>全部计划</Text>
            <Pressable disabled={vaccineCreating} onPress={vaccineComposerVisible ? () => setVaccineComposerVisible(false) : openVaccineComposer} style={[styles.weightAddLink, vaccineCreating && styles.mapSearchActionDisabled, webPressableReset]}>
              {vaccineComposerVisible ? <X color={palette.orange} size={12} strokeWidth={2.5} /> : <Plus color={palette.orange} size={12} strokeWidth={2.5} />}
              <Text style={styles.weightAddLinkText}>{vaccineComposerVisible ? '取消' : '新增'}</Text>
            </Pressable>
          </View>
          {vaccineComposerVisible ? (
            <View style={styles.vaccineComposerCard}>
              <View style={styles.vaccineComposerField}>
                <Text style={styles.label}>名称</Text>
                <TextInput
                  editable={!vaccineCreating}
                  onChangeText={setVaccineNameDraft}
                  placeholder="例如：狂犬疫苗 / 体内驱虫"
                  placeholderTextColor="#B8B3A8"
                  style={[styles.makeTextInput, webTextInputReset]}
                  value={vaccineNameDraft}
                />
              </View>
              <View style={styles.vaccineComposerField}>
                <Text style={styles.label}>计划日期</Text>
                {Platform.OS === 'web' ? (
                  <TextInput
                    editable={!vaccineCreating}
                    keyboardType="numbers-and-punctuation"
                    onChangeText={setVaccineDueDraft}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#B8B3A8"
                    style={[styles.makeTextInput, !vaccineDueDraft.trim() && styles.vaccineDateInputEmpty, webTextInputReset]}
                    value={vaccineDueDraft}
                  />
                ) : (
                  <DateValueButton
                    disabled={vaccineCreating}
                    onPress={openVaccineDueDatePicker}
                    placeholder="选择计划日期"
                    style={[styles.makeTextInput, !vaccineDueDraft.trim() && styles.vaccineDateInputEmpty]}
                    textStyle={styles.vaccineDateValueTextMake}
                    value={vaccineDueDraft}
                  />
                )}
                <View style={styles.vaccineQuickDateRow}>
                  {vaccineQuickDates.map((item) => (
                    <Pressable
                      disabled={vaccineCreating}
                      key={item.label}
                      onPress={() => setVaccineDueDraft(item.date)}
                      style={[styles.vaccineQuickDateChip, vaccineDueDraft === item.date && styles.vaccineQuickDateChipActive, webPressableReset]}
                    >
                      <Text style={[styles.vaccineQuickDateText, vaccineDueDraft === item.date && styles.vaccineQuickDateTextActive]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Button loading={vaccineCreating} onPress={() => void createVaccinePlan()}>保存计划</Button>
            </View>
          ) : null}
          <View style={styles.vaccinePlanCard}>
          {vaccines.length ? vaccines.map((item, index) => {
            const meta = vaxRowMeta(item);
            const doneSaving = vaccineDoneSavingIds.includes(item.id);
            return (
            <View key={item.id}>
              <View style={styles.vaccinePlanRow}>
                <View style={[styles.vaccinePlanIcon, item.status === 'done' && styles.vaccinePlanIconDone, meta.label === '计划中' && styles.vaccinePlanIconPlanned]}>
                  {item.status === 'done' ? <Check color={palette.teal} size={16} strokeWidth={3} /> : <Syringe color={meta.label === '计划中' ? palette.muted : palette.orange} size={16} strokeWidth={2.4} />}
                </View>
                <View style={styles.flex}>
                  <View style={styles.vaccinePlanTitleRow}>
                    <Text numberOfLines={1} style={styles.timelineTitleMake}>{item.name}</Text>
                    <Text style={[styles.vaccineStateTag, meta.style, meta.textStyle]}>{meta.label}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.timelineSubMake}>{meta.sub}</Text>
                </View>
                <View style={styles.vaccinePlanRightMake}>
                  <Text style={styles.timelineDateMake}>{formatCompactDateLabel(item.dueAt)}</Text>
                  {item.status !== 'done' ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={doneSaving}
                      onPress={() => void markVaccineDone(item)}
                      style={[styles.vaccinePlanDoneButtonMake, doneSaving && styles.vaccinePlanDoneButtonDisabledMake, webPressableReset]}
                    >
                      {doneSaving ? <ActivityIndicator color={palette.orange} size="small" /> : <Check color={palette.orange} size={11} strokeWidth={2.8} />}
                      <Text style={styles.vaccinePlanDoneButtonTextMake}>完成</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              {index < vaccines.length - 1 ? <View style={styles.makeDivider} /> : null}
            </View>
            );
          }) : (
            <View style={styles.vaccineEmptyPlanMake}>
              <Text style={styles.timelineTitleMake}>暂无疫苗或驱虫计划</Text>
              <Text style={styles.timelineSubMake}>点右上角“新增”，为{getCurrentPet()?.name ?? '毛孩子'}添加下一次提醒。</Text>
            </View>
          )}
          </View>
        </View>

        <View style={styles.vaccineTipMake}>
          <Sparkles color={palette.teal} size={14} strokeWidth={2.4} />
          <Text style={styles.chatSafetyText}>建议接种前 1 天减少剧烈运动，注射后观察 24 小时是否有过敏反应。具体接种时间请以宠物医院建议为准。</Text>
        </View>
      </Screen>
    );
  }

  function renderDiscover() {
    const discoverEnabled = userSettings.nearbyVisible;
    const locationDenied = ['blocked', 'denied', 'unavailable'].includes(permissions.location);
    const discoverAccessIssue: null | 'location' | 'visibility' = !discoverEnabled ? 'visibility' : locationDenied ? 'location' : null;
    const discoverSearchQuery = discoverQuery.trim();
    const discoverHasLocationError = Boolean(discoverLocationError && !discoverAccessIssue);
    const visibleOwners = discoverAccessIssue
      ? []
      : owners
        .filter((owner) => ownerMatchesDiscoverFilter(owner, discoverFilter))
        .filter((owner) => ownerMatchesDiscoverQuery(owner, discoverSearchQuery));
    const activeDiscoverFilterLabel = discoverFilterOptions.find((item) => item.key === discoverFilter)?.label ?? '全部';
    const discoverRefreshCopy = discoverLastRefreshedAt ? ` · ${formatClockTime(new Date(discoverLastRefreshedAt))}刷新` : '';
    const previewOwner: NearbyOwner = owners[0] ?? {
      distance: '?km',
      id: 'discover-preview',
      imageUrl: generatedGoldenAvatarUri,
      ownerName: '??',
      petName: '??',
      species: 'dog',
      tags: ['开启后可见', '模糊距离'],
    };
    const discoverIssueCopy = discoverAccessIssue === 'location'
      ? {
        action: permissions.location === 'blocked' || permissions.location === 'unavailable' ? '去设置开启' : '开启定位',
        banner: '定位未授权，无法显示附近的朋友',
        body: '我们只展示模糊距离，不会暴露精确位置\n你可以随时关闭',
        primary: () => (permissions.location === 'blocked' || permissions.location === 'unavailable' ? void openPermissionSettings() : void refreshDiscoverByPull()),
        title: '开启定位发现附近朋友',
      }
      : {
        action: '去隐私设置',
        banner: '附近可见未开启，附近朋友暂不可见',
        body: '开启后才会展示附近猫狗主人\n也会让附近伙伴看到你',
        primary: () => go('settings'),
        title: '开启附近可见发现朋友',
      };
    const renderDiscoverEmptyState = () => {
      const filtered = discoverFilter !== 'all' || Boolean(discoverSearchQuery);
      const clearOrRefresh = () => (filtered ? clearDiscoverSearchAndFilter() : void refreshDiscoverByPull());
      return (
        <View style={styles.discoverEmptyMake}>
          <View style={styles.discoverEmptySummaryMake}>
            <SlidersHorizontal color={palette.orange} size={13} strokeWidth={2.4} />
            <Text numberOfLines={1} style={styles.discoverEmptySummaryTextMake}>
              {discoverHasLocationError ? '定位失败 · 可重新刷新' : filtered ? `已应用条件 · ${discoverSearchQuery || activeDiscoverFilterLabel} · 3km 内` : `附近 3km 内 · 模糊距离 · 0 位${discoverRefreshCopy}`}
            </Text>
            {filtered ? <Text onPress={clearDiscoverSearchAndFilter} style={styles.discoverEmptyClearMake}>清除</Text> : null}
          </View>
          <View style={styles.discoverEmptyHeroMake}>
            <View style={styles.discoverEmptyGlowMake} />
            <View style={styles.discoverEmptyOrbMake}>
              <Search color="#fff" size={48} strokeWidth={2.2} />
            </View>
            <Text style={styles.discoverEmptyCountMake}>0 位</Text>
          </View>
          <Text style={styles.discoverEmptyTitleMake}>{discoverHasLocationError ? '暂时无法刷新附近伙伴' : '附近暂时没有匹配的朋友'}</Text>
          <Text style={styles.discoverEmptyDescMake}>
            {discoverHasLocationError ? `${discoverLocationError}\n请检查定位权限、GPS 或网络后重试` : filtered ? '可以试试放宽搜索或筛选条件\n或切换查看全部附近伙伴' : '可以下拉刷新附近列表\n或稍后再来看看新的伙伴'}
          </Text>
          <View style={styles.discoverEmptyActionsMake}>
            {filtered ? (
              <Pressable onPress={clearDiscoverSearchAndFilter} style={[styles.discoverEmptyGhostMake, webPressableReset]}>
                <Text style={styles.discoverEmptyGhostTextMake}>清除条件</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={clearOrRefresh} style={[styles.discoverEmptyPrimaryMake, webPressableReset]}>
              {filtered ? <Navigation color="#fff" size={14} strokeWidth={2.4} /> : <RefreshCw color="#fff" size={14} strokeWidth={2.4} />}
              <Text style={styles.discoverEmptyPrimaryTextMake}>{filtered ? '查看全部' : discoverHasLocationError ? '重新定位' : '刷新附近'}</Text>
            </Pressable>
          </View>
        </View>
      );
    };
    const renderOwnerCard = (owner: NearbyOwner, preview = false) => {
      const savingGreeting = socialActionSavingIds.includes(`greet:${owner.id}`);
      const petImageSource = owner.imageUrl && !isGeneratedAvatarUri(owner.imageUrl) ? { uri: owner.imageUrl } : generatedGoldenAvatarSource;
      const breed = preview ? '?' : owner.tags[0] ?? (owner.species === 'dog' ? '狗狗' : '猫咪');
      const tags = preview ? ['??', '??'] : (owner.tags.length > 1 ? owner.tags.slice(1, 3) : owner.tags.slice(0, 2));
      return (
        <View key={preview ? 'preview-owner-card' : owner.id} style={[styles.ownerCardMake, preview && styles.ownerCardPreviewBlur]}>
          <View style={styles.ownerCardTopMake}>
            <View style={styles.ownerPetPhotoMake}>
              <Image resizeMode="cover" source={petImageSource} style={styles.avatarImage} />
            </View>
            <View style={styles.ownerInfoMake}>
              <View style={styles.ownerNameRowMake}>
                <Text numberOfLines={1} style={styles.ownerPetNameMake}>{preview ? '??' : owner.petName}</Text>
                <View style={styles.ownerDistancePillMake}>
                  <MapPin color={palette.teal} size={10} strokeWidth={2.4} />
                  <Text style={styles.ownerDistanceTextMake}>{preview ? '?km' : owner.distance}</Text>
                </View>
              </View>
              <Text style={styles.ownerMetaMake}>{preview ? '? · 主人 ??' : `${breed} · 主人 ${owner.ownerName}`}</Text>
              <Text style={styles.ownerBioMake} numberOfLines={2}>{preview ? '开启定位后可见附近伙伴' : `${owner.tags.join(' · ')}，也想认识附近的新朋友。`}</Text>
              <View style={styles.ownerTagRowMake}>
                {tags.map((tag, tagIndex) => (
                  <Text
                    key={`${owner.id}-${tag}-${tagIndex}`}
                    style={[
                      styles.ownerTagMake,
                      /友好|交朋友/.test(tag) && styles.ownerTagCoolMake,
                      /线上|暂不|只/.test(tag) && styles.ownerTagNeutralMake,
                    ]}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            </View>
          </View>
          {!preview ? (
            <View style={styles.ownerActionsMake}>
              <Pressable disabled={savingGreeting} onPress={() => openGreetingSheet(owner)} style={[styles.ownerGhostButtonMake, savingGreeting && styles.mapSearchActionDisabled, webPressableReset]}>
                {savingGreeting ? <ActivityIndicator color={palette.orange} size="small" /> : <Heart color={palette.orange} size={13} strokeWidth={2.4} />}
                <Text style={styles.ownerGhostButtonTextMake}>打个招呼</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void openWalkInvite(owner);
                }}
                style={[styles.ownerPrimaryButtonMake, webPressableReset]}
              >
                <PawPrint color="#fff" size={13} strokeWidth={2.5} />
                <Text style={styles.ownerPrimaryButtonTextMake}>约遛</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      );
    };
    return (
      <Screen
        refreshControl={
          <RefreshControl
            colors={[palette.orange]}
            onRefresh={() => void refreshDiscoverByPull()}
            progressBackgroundColor="#fffdf9"
            refreshing={discoverRefreshing}
            tintColor={palette.orange}
          />
        }
        showBack={false}
        title="附近"
      >
        <View style={styles.discoverMakeHeader}>
          <Text style={styles.makeScreenTitle}>发现</Text>
          <View style={styles.messagesHeaderActions}>
            <Pressable accessibilityLabel="搜索附近伙伴" accessibilityRole="button" disabled={discoverRefreshing} onPress={openDiscoverSearch} style={[styles.makeIconChip, discoverRefreshing && styles.mapSearchActionDisabled]}>
              {discoverRefreshing ? <ActivityIndicator color={palette.ink} size="small" /> : <Search color={palette.ink} size={16} strokeWidth={2.3} />}
            </Pressable>
            <Pressable accessibilityLabel="切换附近筛选" accessibilityRole="button" onPress={cycleDiscoverFilter} style={styles.makeIconChip}>
              <SlidersHorizontal color={palette.ink} size={16} strokeWidth={2.3} />
            </Pressable>
          </View>
        </View>
        {discoverSearchVisible ? (
          <View style={[styles.searchBar, styles.discoverSearchBarMake]}>
            <Search color={palette.muted} size={16} strokeWidth={2.3} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setDiscoverQuery}
              onSubmitEditing={() => showToast(discoverSearchQuery ? `已筛选出 ${visibleOwners.length} 位附近伙伴` : '请输入宠物名、主人昵称、品种或标签')}
              placeholder="搜索宠物名、主人、品种或标签"
              placeholderTextColor={palette.muted}
              ref={discoverSearchInputRef}
              returnKeyType="search"
              style={[styles.searchInput, webTextInputReset]}
              value={discoverQuery}
            />
            <Pressable
              accessibilityLabel={discoverQuery.trim() ? '清除搜索' : '收起搜索'}
              accessibilityRole="button"
              onPress={() => {
                if (discoverQuery.trim()) {
                  setDiscoverQuery('');
                  return;
                }
                setDiscoverSearchVisible(false);
              }}
              style={[styles.discoverSearchClearMake, webPressableReset]}
            >
              <X color={palette.muted} size={14} strokeWidth={2.5} />
            </Pressable>
          </View>
        ) : null}
        <View style={[styles.locationChipMake, (discoverAccessIssue || discoverHasLocationError) && styles.locationChipDeniedMake]}>
          {discoverAccessIssue ? <Shield color={palette.danger} size={14} strokeWidth={2.4} /> : discoverHasLocationError ? <WifiOff color={palette.danger} size={14} strokeWidth={2.4} /> : <MapPin color={palette.orange} size={13} strokeWidth={2.4} />}
          <Text style={[styles.locationChipText, (discoverAccessIssue || discoverHasLocationError) && styles.locationChipDeniedText]}>{discoverAccessIssue ? discoverIssueCopy.banner : discoverHasLocationError ? `定位失败 · ${discoverLocationError}` : `附近 · 3km 内 · ${discoverSearchQuery ? `搜索“${discoverSearchQuery}”` : activeDiscoverFilterLabel} · ${visibleOwners.length} 位${discoverRefreshCopy}`}</Text>
          {!discoverAccessIssue ? <Text style={styles.locationPrivacyPill}>模糊距离</Text> : null}
        </View>
        <ScrollView horizontal contentContainerStyle={styles.filterChipsMake} showsHorizontalScrollIndicator={false}>
          {discoverFilterOptions.map((filter) => (
            <Text key={filter.key} onPress={() => applyDiscoverFilter(filter.key)} style={[styles.filterChipMake, discoverFilter === filter.key && styles.filterChipMakeActive]}>{filter.label}</Text>
          ))}
        </ScrollView>
        <View style={styles.discoverCardsMake}>
          {discoverAccessIssue ? (
            <>
              <View pointerEvents="none" style={styles.discoverBlurPreviewMake}>
                {renderOwnerCard(previewOwner, true)}
              </View>
              <View style={styles.discoverPermissionPanelMake}>
                <View style={styles.discoverPermissionIconMake}>
                  <MapPin color={palette.orange} size={26} strokeWidth={2.3} />
                </View>
                <Text style={styles.discoverPermissionTitleMake}>{discoverIssueCopy.title}</Text>
                <Text style={styles.discoverPermissionBodyMake}>{discoverIssueCopy.body}</Text>
                <View style={styles.discoverPrivacyNoteMake}>
                  <Shield color={palette.teal} size={13} strokeWidth={2.4} />
                  <Text style={styles.discoverPrivacyNoteTextMake}>你的精确位置不会向任何用户公开</Text>
                </View>
                <View style={styles.discoverPermissionActionsMake}>
                  <Pressable onPress={() => void disableDiscoverForNow()} style={[styles.discoverPermissionGhostMake, webPressableReset]}>
                    <Text style={styles.discoverPermissionGhostTextMake}>暂不开启</Text>
                  </Pressable>
                  <Pressable onPress={discoverIssueCopy.primary} style={[styles.discoverPermissionPrimaryMake, webPressableReset]}>
                    <Compass color="#fff" size={13} strokeWidth={2.4} />
                    <Text style={styles.discoverPermissionPrimaryTextMake}>{discoverIssueCopy.action}</Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            visibleOwners.map((owner) => renderOwnerCard(owner))
          )}
          {!discoverAccessIssue && !visibleOwners.length ? (
            discoverEnabled ? renderDiscoverEmptyState() : null
          ) : null}
        </View>
      </Screen>
    );
  }

  function renderMap() {
    const placeFilters: Array<{ key: 'all' | Place['category']; label: string }> = [
      { key: 'all', label: '全部' },
      { key: 'park', label: '公园' },
      { key: 'cafe', label: '咖啡店' },
      { key: 'shop', label: '宠物店' },
      { key: 'clinic', label: '医院' },
    ];
    const categoryFilteredPlaces = placeFilter === 'all' ? places : places.filter((place) => place.category === placeFilter);
    const speciesFilteredPlaces = filterPlacesBySpecies(categoryFilteredPlaces, placeSpeciesFilter);
    const filteredPlaces = filterPlacesByDistance(speciesFilteredPlaces, placeDistanceRadiusKm);
    const visiblePlaces = sortPlacesByMode(filteredPlaces, placeSortMode);
    const highlightedPlace = visiblePlaces[0];
    const placeFilterLabel = placeFilters.find((item) => item.key === placeFilter)?.label ?? '全部';
    const placeSpeciesFilterLabel = placeSpeciesFilter === 'dog' ? '汪星友好' : placeSpeciesFilter === 'cat' ? '喵星友好' : '';
    const placeSortLabel = placeSortOptions.find((item) => item.key === placeSortMode)?.label ?? '距离最近';
    const placeFilterMeta = [placeQuery.trim() ? '搜索结果' : placeFilterLabel, placeSpeciesFilterLabel || null, placeSortLabel].filter(Boolean).join(' · ');
    const placeResultMeta = placeSearching ? '搜索中...' : `${visiblePlaces.length} 个 · ${placeDistanceRadiusKm}km 内 · ${placeFilterMeta}`;
    const mapSheetTitle = walkInvitePickingPlace ? '选择约遛地点' : '附近宠物友好地点';
    const distanceProgress = `${Math.round((placeDistanceRadiusKm / 5) * 100)}%`;
    const distanceProgressStyle = { width: distanceProgress as ViewStyle['width'] };
    const distanceThumbStyle = { left: distanceProgress as ViewStyle['left'] };
    const mapStyle = mapStyleOptions.find((item) => item.key === mapStyleKey) ?? mapStyleOptions[0];
    const mapSearchPanelVisible = Boolean(placeQuery.trim() || placeFilter !== 'all' || placeSpeciesFilter !== 'all');
    const mapAreaDisplayLabel = mapStyleKey === 'satellite'
      ? highlightedPlace
        ? `${highlightedPlace.name}实景`
        : '当前区域实景'
      : highlightedPlace?.name ?? (placeQuery.trim() ? '搜索区域' : '附近区域');
    const clearMapSearch = () => {
      placeQueryRef.current = '';
      setPlaceQuery('');
      setPlaceFilter('all');
      setPlaceSpeciesFilter('all');
      setPlaceDistanceRadiusKm(3);
      setPlaceSortMode('distance');
      void searchPlaces({ filter: 'all', speciesFilter: 'all' });
    };
    const togglePlaceSpeciesFilter = (species: Extract<PetSpecies, 'cat' | 'dog'>) => {
      const nextSpecies = placeSpeciesFilter === species ? 'all' : species;
      setPlaceSpeciesFilter(nextSpecies);
      showToast(nextSpecies === 'all' ? '已取消宠物类型筛选' : `已筛选${nextSpecies === 'dog' ? '汪星' : '喵星'}友好地点`, { tone: 'info', variant: 'surface' });
    };
    const cyclePlaceDistanceFilter = () => {
      const currentIndex = placeDistanceFilterOptions.indexOf(placeDistanceRadiusKm);
      const nextRadius = placeDistanceFilterOptions[(currentIndex + 1) % placeDistanceFilterOptions.length] ?? 3;
      setPlaceDistanceRadiusKm(nextRadius);
      showToast(`已筛选 ${nextRadius}km 内地点`, { tone: 'info', variant: 'surface' });
    };
    const openMapManualSearch = () => {
      mapSearchInputRef.current?.focus();
      showToast('可以搜索城市、区域或地点名称');
    };
    const openMapLocationAction = () => {
      if (permissions.location === 'blocked' || permissions.location === 'unavailable') {
        void openPermissionSettings();
        return;
      }
      void locateMapToCurrentPosition();
    };
    const openOrPickPlace = (place: Place) => {
      setSelectedPlace(place);
      if (walkInvitePickingPlace) finishWalkInvitePlacePick(place);
      else go('placeDetail');
    };
    return (
      <Screen showBack={false} title="">
        <View style={styles.mapPageFull}>
          <View
            style={[
              styles.mapFauxFull,
              mapStyleKey === 'standard' && styles.mapFauxFullStandard,
              mapStyleKey === 'satellite' && styles.mapFauxFullSatellite,
              mapStyleKey === 'night' && styles.mapFauxFullNight,
            ]}
          >
            {isLumiiAmapAvailable ? (
              <>
                <LumiiAmapView
                  latitude={mapCenter.latitude}
                  longitude={mapCenter.longitude}
                  mapType={mapStyleKey}
                  markerSnippet={mapCenter.markerSnippet}
                  markerTitle={mapCenter.markerTitle}
                  showTraffic={mapTrafficEnabled}
                  style={styles.nativeAmap}
                  zoom={mapCenter.zoom}
                />
                {mapStyleKey === 'lumii' ? <View pointerEvents="none" style={styles.mapNativeWarmOverlay} /> : null}
              </>
            ) : (
              <>
                <View style={[styles.mapWaterPatch, mapStyleKey === 'night' && styles.mapWaterPatchNight, mapStyleKey === 'satellite' && styles.mapWaterPatchSatellite]} />
                <View style={[styles.mapGreenPatchA, mapStyleKey === 'night' && styles.mapGreenPatchNight, mapStyleKey === 'satellite' && styles.mapGreenPatchSatellite]} />
                <View style={[styles.mapGreenPatchB, mapStyleKey === 'night' && styles.mapGreenPatchNight, mapStyleKey === 'satellite' && styles.mapGreenPatchSatellite]} />
                <View style={[styles.mapRoadMain, mapStyleKey === 'night' && styles.mapRoadNight, mapStyleKey === 'satellite' && styles.mapRoadSatellite]} />
                <View style={[styles.mapRoadSecond, mapStyleKey === 'night' && styles.mapRoadNight, mapStyleKey === 'satellite' && styles.mapRoadSatellite]} />
                <View style={[styles.mapRoadThird, mapStyleKey === 'night' && styles.mapRoadNight, mapStyleKey === 'satellite' && styles.mapRoadSatellite]} />
                {mapTrafficEnabled ? (
                  <>
                    <View style={styles.mapTrafficLineA} />
                    <View style={styles.mapTrafficLineB} />
                  </>
                ) : null}
                <Text numberOfLines={1} style={[styles.mapAreaLabel, mapStyleKey === 'night' && styles.mapAreaLabelNight]}>{mapAreaDisplayLabel}</Text>
                <View style={styles.mapMarkerMain}>
                  <MapPin color="#fff" size={22} strokeWidth={2.4} />
                </View>
                <View style={styles.mapMarkerSmallA}>
                  <PawPrint color={palette.ink} size={17} strokeWidth={2.2} />
                </View>
                <View style={styles.mapMarkerSmallB}>
                  <Sparkles color={palette.ink} size={15} strokeWidth={2.2} />
                </View>
              </>
            )}
            {mapSearchPanelVisible ? <View pointerEvents="none" style={styles.mapDimOverlayMake} /> : null}
            {mapLocationError && !mapSearchPanelVisible ? <View pointerEvents="none" style={styles.mapLocationFailureVeilMake} /> : null}
            <View style={styles.mapControlStack}>
              <Pressable onPress={() => void locateMapToCurrentPosition()} style={styles.mapCtrlButton}>
                {locatingMap ? <ActivityIndicator color={palette.orange} size="small" /> : <MapPin color={palette.orange} size={16} strokeWidth={2.4} />}
              </Pressable>
              <Pressable onPress={() => void openPlaceSubmissionComposer()} style={styles.mapCtrlButton}>
                <Plus color={palette.ink} size={16} strokeWidth={2.4} />
              </Pressable>
              <Pressable onPress={() => setMapStylePanelVisible((visible) => !visible)} style={[styles.mapCtrlButton, mapStylePanelVisible && styles.mapCtrlButtonActive]}>
                <SlidersHorizontal color={mapStylePanelVisible ? '#fff' : palette.ink} size={16} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          <BottomSheet contentStyle={styles.mapStylePanelSheet} onClose={() => setMapStylePanelVisible(false)} visible={mapStylePanelVisible}>
            <View style={styles.mapStyleHeader}>
              <View style={styles.flex}>
                <Text style={styles.mapStyleTitle}>地图样式</Text>
                <Text style={styles.mapStyleSubtitle}>{mapStyle.description}</Text>
              </View>
              <View style={styles.mapStyleHeaderActions}>
                <Text style={styles.mapStyleCurrent}>{mapStyle.label}</Text>
                <Pressable accessibilityLabel="关闭地图样式" onPress={() => setMapStylePanelVisible(false)} style={styles.mapStyleCloseButton}>
                  <X color={palette.ink} size={14} strokeWidth={2.6} />
                </Pressable>
              </View>
            </View>
            <View style={styles.mapStyleOptions}>
              {mapStyleOptions.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setMapStyleKey(item.key);
                    setMapStylePanelVisible(false);
                  }}
                  style={[styles.mapStyleOption, mapStyleKey === item.key && styles.mapStyleOptionActive]}
                >
                  <Text style={[styles.mapStyleOptionText, mapStyleKey === item.key && styles.mapStyleOptionTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setMapTrafficEnabled((enabled) => !enabled)} style={styles.mapTrafficToggle}>
              <Signal color={mapTrafficEnabled ? palette.orange : palette.muted} size={15} strokeWidth={2.4} />
              <View style={styles.flex}>
                <Text style={styles.mapTrafficTitle}>实时路况</Text>
                <Text style={styles.mapTrafficSub}>{mapTrafficEnabled ? '已显示主要道路拥堵状态' : '关闭后底图更干净'}</Text>
              </View>
              <Text style={[styles.mapTrafficState, mapTrafficEnabled && styles.mapTrafficStateOn]}>{mapTrafficEnabled ? '开' : '关'}</Text>
            </Pressable>
          </BottomSheet>

          <View style={styles.mapSearchFloatMake}>
            <Search color={palette.muted} size={16} strokeWidth={2.2} />
            <TextInput
              ref={mapSearchInputRef}
              onChangeText={(value) => {
                placeQueryRef.current = value;
                setPlaceQuery(value);
              }}
              onSubmitEditing={() => void searchPlaces()}
              placeholder="搜索公园、咖啡店、宠物医院…"
              placeholderTextColor={palette.muted}
              returnKeyType="search"
              style={[styles.mapSearchInput, webTextInputReset]}
              value={placeQuery}
            />
            <Pressable disabled={placeSearching} onPress={placeQuery.trim() ? clearMapSearch : () => void searchPlaces()} style={[placeQuery.trim() ? styles.mapSearchClearButtonMake : styles.mapSearchActionMake, placeSearching && styles.mapSearchActionDisabled]}>
              {placeSearching ? <ActivityIndicator color="#fff" size="small" /> : placeQuery.trim() ? <X color={palette.muted} size={14} strokeWidth={2.4} /> : <SlidersHorizontal color="#fff" size={14} strokeWidth={2.4} />}
            </Pressable>
          </View>

          {walkInvitePickingPlace ? (
            <View style={styles.mapPickBannerMake}>
              <View style={styles.mapPickIconMake}>
                <PawPrint color={palette.orange} size={14} strokeWidth={2.5} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.mapPickTitleMake}>正在选择约遛地点</Text>
                <Text numberOfLines={1} style={styles.mapPickSubMake}>点击下方地点即可带回邀请页</Text>
              </View>
              <Pressable onPress={cancelWalkInvitePlacePick} style={[styles.mapPickCancelMake, webPressableReset]}>
                <Text style={styles.mapPickCancelTextMake}>取消</Text>
              </Pressable>
            </View>
          ) : null}

          {mapLocationError ? (
            <View style={styles.mapLocationErrorBanner}>
              <View style={styles.mapLocationErrorIcon}>
                <AlertTriangle color={palette.danger} size={14} strokeWidth={2.5} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.mapLocationErrorTitle}>定位失败</Text>
                <Text style={styles.mapLocationErrorText}>{mapLocationError || '请检查 GPS 与网络是否开启'}</Text>
              </View>
              <Pressable onPress={() => void locateMapToCurrentPosition()} style={styles.mapLocationErrorRetry}>
                <RefreshCw color="#fff" size={11} strokeWidth={2.5} />
                <Text style={styles.mapLocationErrorRetryText}>重试</Text>
              </Pressable>
            </View>
          ) : null}

          {mapSearchPanelVisible ? (
            <View style={styles.mapSearchResultSheetMake}>
              <View style={styles.mapSearchFilterHeadMake}>
                <Text style={styles.mapSearchFilterTitleMake}>筛选</Text>
                <Pressable onPress={clearMapSearch} style={webPressableReset}>
                  <Text style={styles.mapSearchResetMake}>重置</Text>
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.mapFilterSearchContentMake} horizontal showsHorizontalScrollIndicator={false} style={styles.mapFilterSearchScrollerMake}>
                {placeFilters.map((item) => (
                  <Pressable key={item.key} onPress={() => setPlaceFilter(item.key)} style={[styles.mapChipMake, placeFilter === item.key && styles.mapChipMakeActive]}>
                    <Text style={[styles.mapChipMakeText, placeFilter === item.key && styles.mapChipMakeTextActive]}>{getPlaceFilterChipLabel(item.key)}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => togglePlaceSpeciesFilter('dog')} style={[styles.mapChipMake, placeSpeciesFilter === 'dog' && styles.mapChipMakeActive, webPressableReset]}>
                  <Text style={[styles.mapChipMakeText, placeSpeciesFilter === 'dog' && styles.mapChipMakeTextActive]}>🐶 汪星友好</Text>
                </Pressable>
                <Pressable onPress={() => togglePlaceSpeciesFilter('cat')} style={[styles.mapChipMake, placeSpeciesFilter === 'cat' && styles.mapChipMakeActive, webPressableReset]}>
                  <Text style={[styles.mapChipMakeText, placeSpeciesFilter === 'cat' && styles.mapChipMakeTextActive]}>🐱 喵星友好</Text>
                </Pressable>
              </ScrollView>
              <View style={styles.mapSegmentRowMake}>
                {placeSortOptions.map((option) => {
                  const active = option.key === placeSortMode;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option.key}
                      onPress={() => setPlaceSortMode(option.key)}
                      style={[styles.mapSegmentButtonMake, active && styles.mapSegmentButtonActiveMake, webPressableReset]}
                    >
                      <Text style={[styles.mapSegmentTextMake, active && styles.mapSegmentTextActiveMake]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable accessibilityRole="button" onPress={cyclePlaceDistanceFilter} style={[styles.mapDistanceFilterRowMake, webPressableReset]}>
                <Text style={styles.mapDistanceFilterLabelMake}>距离</Text>
                <View style={styles.mapDistanceTrackMake}>
                  <View style={[styles.mapDistanceTrackFillMake, distanceProgressStyle]} />
                  <View style={[styles.mapDistanceThumbMake, distanceThumbStyle]} />
                </View>
                <Text style={styles.mapDistanceValueMake}>{placeDistanceRadiusKm}km</Text>
              </Pressable>
              <View style={styles.mapSearchResultHeaderMake}>
                <Text style={styles.sectionTitle}>搜索结果</Text>
                <Text style={styles.metaText}>{visiblePlaces.length} 个匹配</Text>
              </View>
              <ScrollView contentContainerStyle={styles.mapSearchResultListMake} showsVerticalScrollIndicator={false}>
                {visiblePlaces.map((place, index) => (
                  <PlaceSheetRow
                    active={place.id === highlightedPlace?.id}
                    key={place.id}
                    onPress={() => {
                      openOrPickPlace(place);
                    }}
                    place={place}
                    rank={index + 1}
                  />
                ))}
                {!visiblePlaces.length ? (
                  <EmptyState
                    action="清空筛选"
                    description="可以切换筛选条件，或搜索其他关键词。"
                    icon={<MapPin color={palette.muted} size={26} strokeWidth={2.4} />}
                    onAction={clearMapSearch}
                    title="没有匹配地点"
                  />
                ) : null}
              </ScrollView>
            </View>
          ) : mapLocationError ? (
            <>
              <View style={styles.mapLocationCenterMake}>
                <View style={styles.mapLocationCenterIconMake}>
                  <Locate color={palette.muted} size={32} strokeWidth={2} />
                </View>
                <Text style={styles.mapLocationCenterTitleMake}>无法获取当前位置</Text>
                <Text style={styles.mapLocationCenterTextMake}>
                  可以手动搜索城市或区域{'\n'}
                  或前往设置开启定位权限
                </Text>
              </View>
              <View style={styles.mapLocationBottomActionsMake}>
                <Pressable onPress={openMapManualSearch} style={[styles.mapLocationGhostActionMake, webPressableReset]}>
                  <MapPin color={palette.ink} size={15} strokeWidth={2.3} />
                  <Text style={styles.mapLocationGhostActionTextMake}>手动选地区</Text>
                </Pressable>
                <Pressable onPress={openMapLocationAction} style={[styles.mapLocationPrimaryActionMake, webPressableReset]}>
                  <Navigation color="#fff" size={15} strokeWidth={2.3} />
                  <Text style={styles.mapLocationPrimaryActionTextMake}>{permissions.location === 'blocked' || permissions.location === 'unavailable' ? '去开启定位' : '重新定位'}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.mapFilterFloatMake} horizontal showsHorizontalScrollIndicator={false} style={styles.mapFilterScrollerMake}>
                {placeFilters.map((item) => (
                  <Pressable key={item.key} onPress={() => setPlaceFilter(item.key)} style={[styles.mapChipMake, placeFilter === item.key && styles.mapChipMakeActive]}>
                    <Text style={[styles.mapChipMakeText, placeFilter === item.key && styles.mapChipMakeTextActive]}>{getPlaceFilterChipLabel(item.key)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View pointerEvents="none" style={styles.mapFilterRightFadeMake} />

              <View style={[styles.mapBottomSheetMake, !mapPlacesSheetExpanded && styles.mapBottomSheetCollapsedMake]}>
                <Pressable accessibilityRole="button" onPress={() => setMapPlacesSheetExpanded((expanded) => !expanded)} style={[styles.mapSheetHeaderButtonMake, webPressableReset]}>
                  <View style={styles.flex}>
                    <View style={styles.sheetHandle} />
                    <View style={styles.mapSheetHeader}>
                      <View style={styles.flex}>
                        <Text style={styles.sectionTitle}>{mapSheetTitle}</Text>
                        <Text style={styles.metaText}>{mapPlacesSheetExpanded ? `${placeResultMeta} · 向下收起` : `${placeResultMeta} · 点击展开`}</Text>
                      </View>
                      <View style={styles.mapSheetToggleIconMake}>
                        {mapPlacesSheetExpanded ? <ArrowDown color={palette.ink} size={15} strokeWidth={2.6} /> : <ArrowUp color={palette.ink} size={15} strokeWidth={2.6} />}
                      </View>
                    </View>
                  </View>
                </Pressable>
                {mapPlacesSheetExpanded ? (
                  <ScrollView contentContainerStyle={styles.mapPlacesSheetScrollContentMake} showsVerticalScrollIndicator={false} style={styles.mapPlacesSheetScrollMake}>
                    {visiblePlaces.map((place, index) => (
                      <PlaceSheetRow
                        active={place.id === highlightedPlace?.id}
                        key={place.id}
                        onPress={() => {
                          openOrPickPlace(place);
                        }}
                        place={place}
                        rank={index + 1}
                      />
                    ))}
                    {!visiblePlaces.length ? (
                      <EmptyState
                        action="清空筛选"
                        description="可以切换筛选条件，或搜索其他关键词。"
                        icon={<MapPin color={palette.muted} size={26} strokeWidth={2.4} />}
                        onAction={clearMapSearch}
                        title="没有匹配地点"
                      />
                    ) : null}
                  </ScrollView>
                ) : null}
              </View>
            </>
          )}
        </View>
      </Screen>
    );
  }

  function renderPlaceDetail() {
    if (placeSubmitResult?.kind === 'review') return renderPlaceSubmitResult(placeSubmitResult);
    const place = selectedPlace;
    const isFavoritePlace = place ? favoritePlaceIds.includes(place.id) : false;
    const isFavoriteSaving = place ? favoritePlaceSavingIds.includes(place.id) : false;
    const myPlaceReview = place ? placeReviewsByPlaceId[place.id] : undefined;
    const hasPendingPlaceReview = myPlaceReview?.status === 'pending_review';
    const pet = getCurrentPet();
    const ownerName = formatOwnerName(session?.phone, pet, session?.account?.ownerName);
    const placeReviewSummary = place?.reviewCount ? `· 社区点评 ${place.reviewCount} 条` : '· 待社区点评';
    const placeHasRating = place ? hasPlaceRating(place) : false;
    const placeReviewTime = myPlaceReview
      ? hasPendingPlaceReview
        ? `审核中 · ${formatTimestampDisplay(myPlaceReview.createdAt)}`
        : formatTimestampDisplay(myPlaceReview.createdAt)
      : '暂无点评';
    const placeReviewBody = myPlaceReview?.content ?? '分享你的真实体验，帮助附近养宠人判断是否适合前往。';
    return (
      <Screen title="">
        {place ? (
          <View style={styles.placeDetailPageMake}>
            <View style={styles.placeHeroMake}>
              <Image resizeMode="cover" source={{ uri: getPlaceVisualUrl(place) }} style={styles.avatarImage} />
              <View style={styles.placeHeroOverlay} />
              <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={back} style={styles.placeBackButtonMake}>
                <ChevronLeft color={palette.ink} size={18} strokeWidth={2.5} />
              </Pressable>
              <View style={styles.placeHeroActions}>
                <Pressable onPress={() => void sharePlace(place)} style={styles.placeBackButtonMake}>
                  <Share2 color={palette.ink} size={15} strokeWidth={2.4} />
                </Pressable>
                <Pressable disabled={isFavoriteSaving} onPress={() => void toggleFavoritePlace(place)} style={styles.placeBackButtonMake}>
                  {isFavoriteSaving ? (
                    <ActivityIndicator color={palette.orange} size="small" />
                  ) : (
                    <Heart color={isFavoritePlace ? palette.orange : palette.ink} fill={isFavoritePlace ? palette.orange : 'transparent'} size={15} strokeWidth={2.4} />
                  )}
                </Pressable>
              </View>
              <View style={styles.placePhotoCountMake}>
                <Camera color="#fff" size={11} strokeWidth={2.4} />
                <Text style={styles.placePhotoCountTextMake}>{getPlacePhotoBadgeText(place)}</Text>
              </View>
            </View>
            <View style={styles.placeSheetMake}>
              <View style={styles.placeTitleRowMake}>
                <Text numberOfLines={2} style={styles.placeTitleMake}>{place.name}</Text>
                <View style={styles.placeVerifyPillMake}>
                  <ShieldCheck color={palette.teal} size={9} strokeWidth={2.5} />
                  <Text style={styles.placeVerifyTextMake}>社区共建</Text>
                </View>
              </View>
              <View style={styles.placeRatingRowMake}>
                {placeHasRating ? (
                  <>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} color="#FFB94B" fill="#FFB94B" size={13} strokeWidth={2} />
                    ))}
                    <Text style={styles.placeRatingValueMake}>{getPlaceRatingLabel(place)}</Text>
                  </>
                ) : (
                  <Text style={styles.placeRatingMissingMake}>暂无评分</Text>
                )}
                <Text style={styles.placeReviewCountMake}>{placeReviewSummary}</Text>
                <View style={styles.placeDistancePillDetailMake}>
                  <Navigation color={palette.teal} size={11} strokeWidth={2.6} />
                  <Text style={styles.placeDistanceTextDetailMake}>{place.distance}</Text>
                </View>
              </View>
              <View style={styles.placeAddressMake}>
                <MapPin color={palette.orange} size={13} strokeWidth={2.4} />
                <View style={styles.flex}>
                  <Text style={styles.placeAddressText}>{place.address}</Text>
                  <View style={styles.placeAddressMetaRowMake}>
                    <View style={styles.placeAddressMetaItemMake}>
                      <Clock color={palette.muted} size={10} strokeWidth={2.2} />
                      <Text style={styles.placeAddressMeta}>{getPlaceOpeningText(place)}</Text>
                    </View>
                    <View style={styles.placeAddressMetaItemMake}>
                      <Phone color={palette.muted} size={10} strokeWidth={2.2} />
                      <Text style={styles.placeAddressMeta}>{getPlacePhoneText(place)}</Text>
                    </View>
                    {place.businessArea ? (
                      <View style={styles.placeAddressMetaItemMake}>
                        <Tag color={palette.muted} size={10} strokeWidth={2.2} />
                        <Text style={styles.placeAddressMeta}>{place.businessArea}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              <Text style={styles.placeSectionLabel}>宠物友好特色</Text>
              <View style={styles.tagRow}>
                {place.tags.map((tag, index) => (
                  <Text
                    key={tag}
                    style={[
                      styles.placeFeatureTagMake,
                      index % 3 === 1 && styles.placeFeatureTagOliveMake,
                      index % 3 === 2 && styles.placeFeatureTagCoolMake,
                    ]}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
              <View style={styles.placeReviewPreviewMake}>
                <View style={styles.placeReviewHeaderMake}>
                  <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={28} />
                  <View style={styles.flex}>
                    <View style={styles.placeReviewAuthorRowMake}>
                      <Text numberOfLines={1} style={styles.placeReviewAuthorMake}>{myPlaceReview ? ownerName : '还没有你的点评'}</Text>
                      {myPlaceReview ? (
                        <View style={styles.placeReviewStarsMake}>
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} color="#FFB94B" fill="#FFB94B" size={10} strokeWidth={2} />
                          ))}
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.placeReviewTimeMake}>{placeReviewTime}</Text>
                  </View>
                </View>
                <Text style={styles.placeReviewBodyMake}>{placeReviewBody}</Text>
              </View>
              <View style={styles.placeDetailBottomCtaMake}>
                {walkInvitePickingPlace ? (
                  <>
                    <Pressable onPress={cancelWalkInvitePlacePick} style={[styles.placeReviewShortcutMake, webPressableReset]}>
                      <X color={palette.ink} size={16} strokeWidth={2.4} />
                      <Text style={styles.placeReviewShortcutTextMake}>取消</Text>
                    </Pressable>
                    <Pressable onPress={() => finishWalkInvitePlacePick(place)} style={[styles.placeNavigationButtonMake, webPressableReset]}>
                      <Check color="#fff" size={15} strokeWidth={2.8} />
                      <Text style={styles.placeNavigationButtonTextMake}>选为约遛地点</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable disabled={placeReviewSaving} onPress={() => void openPlaceReviewComposer(place)} style={[styles.placeReviewShortcutMake, webPressableReset]}>
                      {placeReviewSaving ? <ActivityIndicator color={palette.ink} size="small" /> : <PenLine color={palette.ink} size={16} strokeWidth={2.4} />}
                      <Text style={styles.placeReviewShortcutTextMake}>{hasPendingPlaceReview ? '再点评' : '写点评'}</Text>
                    </Pressable>
                    <Pressable onPress={() => setAmapNavigationPlace(place)} style={[styles.placeNavigationButtonMake, webPressableReset]}>
                      <Navigation color="#fff" size={15} strokeWidth={2.6} />
                      <Text style={styles.placeNavigationButtonTextMake}>高德导航</Text>
                    </Pressable>
                  </>
                )}
              </View>
              {hasPendingPlaceReview ? (
                <View style={styles.reviewStatusCard}>
                  <Check color={palette.teal} size={15} strokeWidth={3} />
                  <Text style={styles.reviewStatusText}>已提交，等待审核。通过后会展示在地点详情中。</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <ErrorState
            action="回到地图"
            description="这个地点可能已不在当前结果里，请回到地图重新选择。"
            icon={<MapPin color={palette.warning} size={20} strokeWidth={2.4} />}
            iconTone="warning"
            onAction={() => replace('map')}
            title="地点已失效"
          />
        )}
      </Screen>
    );
  }

  function renderAmapNavigationConfirm() {
    const place = amapNavigationPlace;
    if (!place) return null;
    return (
      <Modal animationType="fade" onRequestClose={() => setAmapNavigationPlace(null)} transparent visible>
        <View style={styles.amapConfirmBackdropMake}>
          <View style={styles.amapConfirmModalMake}>
            <View style={styles.amapConfirmIconMake}>
              <Navigation color="#fff" size={26} strokeWidth={2.4} />
            </View>
            <Text style={styles.amapConfirmTitleMake}>即将打开高德地图导航</Text>
            <Text style={styles.amapConfirmBodyMake}>
              离开 Lumii 前往高德地图{'\n'}为「{place.name}」规划路线
            </Text>
            <View style={styles.amapConfirmPlaceMake}>
              <View style={styles.amapConfirmPlaceIconMake}>
                <MapPin color={palette.danger} size={18} strokeWidth={2.4} />
              </View>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={styles.amapConfirmPlaceTitleMake}>{place.name}</Text>
                <Text numberOfLines={1} style={styles.amapConfirmPlaceMetaMake}>{place.address} · {place.distance}</Text>
              </View>
              <View style={styles.amapConfirmEtaMake}>
                <Navigation color={palette.teal} size={11} strokeWidth={2.6} />
                <Text style={styles.amapConfirmEtaTextMake}>外部规划</Text>
              </View>
            </View>
            <View style={styles.amapConfirmAppRowMake}>
              <View style={[styles.amapConfirmAppPickMake, styles.amapConfirmAppPickActiveMake]}>
                <Text style={[styles.amapConfirmAppLabelMake, styles.amapConfirmAppLabelActiveMake]}>高德地图</Text>
                <Text style={styles.amapConfirmAppSubMake}>推荐</Text>
              </View>
            </View>
            <Text style={styles.amapConfirmSupportTextMake}>当前仅支持通过高德地图打开路线规划</Text>
            <View style={styles.amapConfirmActionsMake}>
              <Pressable onPress={() => setAmapNavigationPlace(null)} style={[styles.amapConfirmCancelMake, webPressableReset]}>
                <Text style={styles.amapConfirmCancelTextMake}>取消</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAmapNavigationPlace(null);
                  void openAmapPlace(place);
                }}
                style={[styles.amapConfirmSubmitMake, webPressableReset]}
              >
                <Navigation color="#fff" size={14} strokeWidth={2.6} />
                <Text style={styles.amapConfirmSubmitTextMake}>打开导航</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function closePlaceSubmitResult() {
    const result = placeSubmitResult;
    setPlaceSubmitResult(null);
    if (result?.kind === 'place' && result.status === 'success') replace('map');
  }

  function continueAfterPlaceSubmitSuccess() {
    const result = placeSubmitResult;
    setPlaceSubmitResult(null);
    if (result?.kind === 'review') {
      setPlaceReviewDraft('');
      setSelectedPlaceFeatureTags([]);
      setCustomPlaceFeatureDraft('');
      setCustomPlaceFeatureVisible(false);
      setPlaceSubmissionRating(5);
    } else {
      setPlaceDraftName('');
      setPlaceDraftAddress('');
      setPlaceSubmissionExperience('');
      setSelectedPlaceFeatureTags([]);
      setCustomPlaceFeatureDraft('');
      setCustomPlaceFeatureVisible(false);
      setPlaceSubmissionStatus('idle');
    }
  }

  async function saveFailedPlaceDraft() {
    if (placeDraftSavingRef.current) return;
    const result = placeSubmitResult;
    if (!result) return;
    const draft = buildCurrentPlaceComposerDraft(result.kind);
    if (!draft) {
      showToast('先填写一点草稿内容再保存', { tone: 'warning', variant: 'surface' });
      return;
    }
    placeDraftSavingRef.current = true;
    setPlaceDraftSaving(true);
    try {
      await savePlaceComposerDraft(draft);
      setPlaceSubmitResult(null);
      showToast('草稿已保存', { subtitle: `保存于 ${formatClockTime(new Date(draft.savedAt))}`, tone: 'success', variant: 'surface' });
    } catch {
      showToast('草稿保存失败，请稍后重试', { tone: 'error', variant: 'surface' });
    } finally {
      placeDraftSavingRef.current = false;
      setPlaceDraftSaving(false);
    }
  }

  function retryFailedPlaceSubmit() {
    const result = placeSubmitResult;
    setPlaceSubmitResult(null);
    if (result?.kind === 'review') {
      void createPlaceReview();
    } else if (result?.kind === 'place') {
      void submitPlaceDraft();
    }
  }

  function renderPlaceSubmitResult(result: PlaceSubmitResult) {
    const success = result.status === 'success';
    const isReview = result.kind === 'review';
    const submittedAt = result.submittedAt || formatClockTime();
    const pageTitle = success ? '提交成功' : '提交失败';
    const headline = success ? (isReview ? '点评已提交' : '地点已提交') : '提交失败，请稍后再试';
    const body = success
      ? isReview
        ? '为保证社区真实可信，我们需要 24 小时内\n人工审核你的点评，通过后会通知你'
        : '为保证地点真实可信，我们需要 24 小时内\n人工审核你的提交，通过后会通知你'
      : '可能原因：网络不稳定 / 服务暂时繁忙\n草稿仍保留在当前页面，可保存后稍后继续编辑';

    return (
      <Screen showBack={false} title="">
        <View style={styles.placeSubmitResultPageMake}>
          <View style={styles.placeSubmitBgGlowMake} />
          <View style={styles.placeSubmitHeaderMake}>
            <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={() => setPlaceSubmitResult(null)} style={[styles.iconButton, webPressableReset]}>
              <ChevronLeft color={palette.ink} size={19} strokeWidth={2.4} />
            </Pressable>
            <Text style={styles.placeSubmitHeaderTitleMake}>{pageTitle}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.placeSubmitCenterMake}>
            {success ? (
              <View style={styles.placeSubmitSuccessArtMake}>
                <View style={styles.placeSubmitSuccessGlowMake} />
                <View style={styles.placeSubmitSuccessCircleMake}>
                  <Clock color={palette.orange} size={56} strokeWidth={2.2} />
                </View>
                <Sparkles color={palette.orange} fill={palette.orange} size={16} style={styles.placeSubmitSparkleLeftMake} />
                <Sparkles color={palette.teal} fill={palette.teal} size={12} style={styles.placeSubmitSparkleRightMake} />
                <View style={styles.placeSubmitCheckBadgeMake}>
                  <Check color="#fff" size={18} strokeWidth={3} />
                </View>
              </View>
            ) : (
              <View style={styles.placeSubmitErrorArtMake}>
                <View style={styles.placeSubmitErrorInnerMake}>
                  <AlertCircle color={palette.danger} size={32} strokeWidth={2.2} />
                </View>
              </View>
            )}
            <Text style={styles.placeSubmitHeadlineMake}>{headline}</Text>
            <Text style={styles.placeSubmitBodyMake}>{body}</Text>

            {success ? (
              <View style={styles.placeSubmitStepperMake}>
                <PlaceSubmitStep done text={isReview ? '已提交点评' : '已提交地点'} time={submittedAt} />
                <View style={[styles.placeSubmitStepLineMake, styles.placeSubmitStepLineActiveMake]} />
                <PlaceSubmitStep active text="人工审核中" time="预计 24 小时内" />
                <View style={styles.placeSubmitStepLineMake} />
                <PlaceSubmitStep text={isReview ? '通过后发布到地点' : '通过后展示给附近用户'} time="将通知你" />
              </View>
            ) : (
              <View style={styles.placeSubmitDraftCardMake}>
                <View style={styles.rowBetween}>
                  <View style={styles.inlineActionRow}>
                    <NotebookPen color={palette.orange} size={13} strokeWidth={2.4} />
                    <Text style={styles.placeSubmitDraftTitleMake}>草稿内容</Text>
                  </View>
                  <Text style={styles.placeSubmitDraftTimeMake}>{submittedAt}</Text>
                </View>
                <View style={styles.placeSubmitDraftMetaMake}>
                  <View style={styles.ratingPill}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} color="#FFB94B" fill="#FFB94B" size={11} strokeWidth={2} />
                    ))}
                  </View>
                  <Text numberOfLines={1} style={styles.placeSubmitDraftPlaceMake}>· {result.placeName}</Text>
                </View>
                <Text numberOfLines={2} style={styles.placeSubmitDraftTextMake}>{result.draft || '草稿内容已保留，稍后可以继续补充。'}</Text>
              </View>
            )}

            <View style={styles.placeSubmitActionRowMake}>
              {success ? (
                <>
                  <Pressable onPress={closePlaceSubmitResult} style={[styles.placeSubmitGhostButtonMake, webPressableReset]}>
                    <MapPin color={palette.ink} size={14} strokeWidth={2.4} />
                    <Text style={styles.placeSubmitGhostTextMake}>{isReview ? '返回地点' : '回到地图'}</Text>
                  </Pressable>
                  <Pressable onPress={continueAfterPlaceSubmitSuccess} style={[styles.placeSubmitPrimaryButtonMake, webPressableReset]}>
                    <NotebookPen color="#fff" size={14} strokeWidth={2.4} />
                    <Text style={styles.placeSubmitPrimaryTextMake}>{isReview ? '再写一条' : '继续提交'}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable disabled={placeDraftSaving} onPress={() => void saveFailedPlaceDraft()} style={[styles.placeSubmitGhostButtonMake, placeDraftSaving && styles.mapSearchActionDisabled, webPressableReset]}>
                    {placeDraftSaving ? <ActivityIndicator color={palette.ink} size="small" /> : null}
                    <Text style={styles.placeSubmitGhostTextMake}>{placeDraftSaving ? '保存中' : '保存草稿'}</Text>
                  </Pressable>
                  <Pressable disabled={placeDraftSaving} onPress={retryFailedPlaceSubmit} style={[styles.placeSubmitPrimaryButtonMake, placeDraftSaving && styles.mapSearchActionDisabled, webPressableReset]}>
                    <RefreshCw color="#fff" size={14} strokeWidth={2.4} />
                    <Text style={styles.placeSubmitPrimaryTextMake}>重新提交</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
        <View style={styles.homeIndicator} />
      </Screen>
    );
  }

  function renderMessages() {
    const pet = getCurrentPet();
    const petChatHistoryMessages = chatMessages.filter((message) => !isPetChatWelcomeMessage(message));
    const lastPetChatMessage = petChatHistoryMessages[petChatHistoryMessages.length - 1];
    const petChatPreview = lastPetChatMessage?.text || '还没有开始聊天，点进来和它说第一句话';
    const petChatTime = lastPetChatMessage ? formatMessageListTime(lastPetChatMessage.time) : '待开始';
    const hasInboxContent = Boolean(pet) || greetingRequestOwners.length > 0 || conversations.length > 0;
    return (
      <Screen
        refreshControl={
          <RefreshControl
            colors={[palette.orange]}
            onRefresh={() => void refreshInboxManually()}
            progressBackgroundColor="#fffdf9"
            refreshing={inboxManualRefreshing}
            tintColor={palette.orange}
          />
        }
        showBack={false}
        title=""
      >
        <View style={styles.messagesMakePage}>
          <View style={styles.messagesMakeHeader}>
            <Text style={styles.makeScreenTitle}>消息</Text>
            <View style={styles.messagesHeaderActions}>
              <Pressable
                accessibilityLabel="刷新消息"
                accessibilityRole="button"
                disabled={inboxManualRefreshing}
                onPress={() => void refreshInboxManually()}
                style={[styles.makeIconChip, inboxManualRefreshing && styles.mapSearchActionDisabled]}
              >
                {inboxManualRefreshing ? <ActivityIndicator color={palette.ink} size="small" /> : <RefreshCw color={palette.ink} size={15} strokeWidth={2.3} />}
              </Pressable>
              <Pressable onPress={() => go('notifications')} style={styles.makeIconChip}>
                <Bell color={palette.ink} size={16} strokeWidth={2.3} />
                {notifications.some((item) => !item.read) ? <View style={styles.homeBellDot} /> : null}
              </Pressable>
            </View>
          </View>

          {greetingRequestOwners.length ? (
          <Pressable onPress={() => go('greetingRequests')} style={styles.messagesRequestMake}>
            <View style={styles.messagesAvatarStack}>
              {greetingRequestOwners.slice(0, 3).map((owner, index) => (
                <View key={owner.id} style={index > 0 ? styles.messagesAvatarOverlap : null}>
                  <PetAvatar uri={owner.imageUrl} size={32} />
                </View>
              ))}
            </View>
            <View style={styles.flex}>
              <Text style={styles.messagesRequestTitle}>{greetingRequestOwners.length} 条新招呼请求</Text>
              <Text style={styles.messagesRequestText}>{greetingRequestOwners.slice(0, 3).map((owner) => owner.petName).join('、')} 想和你打招呼</Text>
            </View>
            <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} />
          </Pressable>
          ) : null}

          <View style={styles.messagesListMake}>
            {pet ? (
              <Pressable onPress={() => go('chat')} style={styles.conversationMakeRow}>
                <View style={styles.conversationAvatarWrap}>
                  <View style={styles.conversationAiAvatarRingMake}>
                    <PetAvatar uri={pet.avatarUrl ?? generatedGoldenAvatarUri} size={50} />
                  </View>
                  <View style={styles.conversationAiBadge}>
                    <Sparkles color="#fff" size={10} strokeWidth={2.6} />
                  </View>
                </View>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={styles.conversationMakeTitle}>AI 灵伴 · {pet.name}</Text>
                  <Text numberOfLines={1} style={styles.conversationMakeText}>{petChatPreview}</Text>
                </View>
                <View style={styles.conversationMetaCol}>
                  <Text style={styles.metaText}>{petChatTime}</Text>
                </View>
              </Pressable>
            ) : null}
            {conversations.map((conversation) => (
              <Pressable key={conversation.id} onPress={() => void openConversation(conversation)} style={styles.conversationMakeRow}>
                <View style={styles.conversationAvatarWrap}>
                  <PetAvatar uri={conversation.imageUrl ?? (conversation.id === 'c1' ? generatedGoldenAvatarUri : owners[0]?.imageUrl)} size={50} />
                  <View style={styles.conversationOwnerBadge}>
                    <User color={palette.orange} size={10} strokeWidth={2.5} />
                  </View>
                </View>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={styles.conversationMakeTitle}>{conversation.name}</Text>
                  <View style={styles.conversationPreviewRowMake}>
                    {conversation.lastMessage.includes('约遛邀请') ? <Text style={styles.conversationInvitePrefixMake}>[邀请]</Text> : null}
                    <Text numberOfLines={1} style={styles.conversationMakeText}>{conversation.lastMessage}</Text>
                  </View>
                </View>
                <View style={styles.conversationMetaCol}>
                  <Text style={styles.metaText}>{formatMessageListTime(conversation.updatedAt)}</Text>
                  {conversation.unread > 0 ? <Text style={styles.unreadBadge}>{conversation.unread}</Text> : null}
                </View>
              </Pressable>
            ))}
            {!hasInboxContent ? (
              <View style={styles.messagesEmptyWrap}>
                <EmptyState
                  description="收到的招呼和聊天会出现在这里。去发现页看看附近有没有想认识的新伙伴。"
                  icon={<MessageCircle color={palette.muted} size={26} strokeWidth={2.4} />}
                  onAction={() => resetTo('discover')}
                  action="去发现"
                  title="还没有消息"
                />
              </View>
            ) : null}
          </View>
        </View>
      </Screen>
    );
  }

  function renderNotifications() {
    const unreadNotificationCount = notifications.filter((item) => !item.read).length;
    const activeFilterLabel = notificationFilterOptions.find((item) => item.key === notificationFilter)?.label ?? '全部';
    const notificationItems = notifications.map((item, index) => ({
      category: notificationCategoryFor(item),
      group: notificationGroupFor(item, notificationSeenAtById[item.id]),
      index,
      item,
      time: notificationDisplayTime(item, notificationSeenAtById[item.id]),
    }));
    const filteredNotifications = notificationItems.filter((entry) => notificationFilter === 'all' || entry.category === notificationFilter);
    const groupedNotifications = ['今天', '昨天', '更早'].map((group) => ({
      group,
      items: filteredNotifications.filter((entry) => entry.group === group),
    })).filter((group) => group.items.length > 0);
    const notificationMetaFor = (item: NotificationItem) => {
      const category = notificationCategoryFor(item);
      const kind = notificationKindFor(item);
      if (category === 'walk') {
        return {
          icon: <PawPrint color={palette.orange} size={15} strokeWidth={2.5} />,
          iconStyle: styles.notificationIconWalkMake,
          rightLabel: kind === 'walk_invite' ? '聊天' : '查看',
        };
      }
      if (category === 'interaction') {
        const opensConversation = kind === 'conversation_message' || kind === 'greeting_accepted' || Boolean(conversationIdFromNotification(item));
        return {
          icon: <Heart color={palette.danger} size={15} strokeWidth={2.5} />,
          iconStyle: styles.notificationIconInteractionMake,
          rightLabel: opensConversation ? '聊天' : '处理',
        };
      }
      if (category === 'health') {
        return {
          icon: <Sparkles color={palette.teal} size={15} strokeWidth={2.5} />,
          iconStyle: styles.notificationIconHealthMake,
          rightLabel: '',
        };
      }
      return {
        icon: <Shield color={palette.muted} size={15} strokeWidth={2.5} />,
        iconStyle: styles.notificationIconSystemMake,
        rightLabel: '',
      };
    };
    return (
      <Screen title="">
        <View style={styles.notificationPageMake}>
          <View style={styles.notificationMakeHeader}>
            <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={back} style={[styles.notificationHeaderIconMake, webPressableReset]}>
              <ChevronLeft color={palette.ink} size={20} strokeWidth={2.6} />
            </Pressable>
            <Text style={styles.notificationHeaderTitleMake}>通知</Text>
            <Pressable
              accessibilityRole="button"
              disabled={unreadNotificationCount === 0}
              onPress={() => void markAllNotificationsRead()}
              style={[styles.notificationReadAllButtonMake, unreadNotificationCount === 0 && styles.notificationReadAllButtonDisabledMake, webPressableReset]}
            >
              <Text style={[styles.notificationReadAllTextMake, unreadNotificationCount === 0 && styles.notificationReadAllTextDisabledMake]}>全部已读</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.notificationFilterRowMake}
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            {notificationFilterOptions.map((option) => {
              const active = option.key === notificationFilter;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={option.key}
                  onPress={() => setNotificationFilter(option.key)}
                  style={[styles.notificationFilterChipMake, active && styles.notificationFilterChipActiveMake, webPressableReset]}
                >
                  <Text style={[styles.notificationFilterTextMake, active && styles.notificationFilterTextActiveMake]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.notificationListMake}>
            {!notifications.length ? (
              <EmptyState
                action="刷新通知"
                description="招呼请求、健康提醒和系统消息会出现在这里。"
                icon={<Bell color={palette.muted} size={26} strokeWidth={2.4} />}
                onAction={() => void refreshInboxManually()}
                title="暂时没有通知"
              />
            ) : null}
            {notifications.length > 0 && !filteredNotifications.length ? (
              <EmptyState
                action="查看全部"
                description="切换到全部通知，或者下拉刷新看看有没有新的动态。"
                icon={<Bell color={palette.muted} size={26} strokeWidth={2.4} />}
                onAction={() => setNotificationFilter('all')}
                title={`暂无${activeFilterLabel}通知`}
              />
            ) : null}
            {groupedNotifications.map((group) => (
              <View key={group.group} style={styles.notificationGroupMake}>
                <Text style={styles.notificationGroupLabelMake}>{group.group}</Text>
                {group.items.map((entry) => {
                  const meta = notificationMetaFor(entry.item);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={entry.item.id}
                      onPress={() => void openNotification(entry.item)}
                      style={[styles.notificationCardMake, !entry.item.read && styles.notificationCardUnreadMake, webPressableReset]}
                    >
                      <View style={[styles.notificationIconMake, meta.iconStyle]}>{meta.icon}</View>
                      <View style={styles.notificationBodyMake}>
                        <View style={styles.notificationTitleRowMake}>
                          <Text numberOfLines={2} style={styles.notificationTitleMake}>{entry.item.title}</Text>
                          {!entry.item.read ? <View style={styles.notificationUnreadDotMake} /> : null}
                        </View>
                        {entry.item.text ? <Text numberOfLines={2} style={styles.notificationSubMake}>{entry.item.text}</Text> : null}
                        <View style={styles.notificationMetaRowMake}>
                          <Text style={styles.notificationTimeMake}>{entry.time}</Text>
                          {meta.rightLabel ? (
                            <Pressable accessibilityRole="button" onPress={() => void openNotification(entry.item)} style={[styles.notificationActionMake, webPressableReset]}>
                              <Text style={styles.notificationActionTextMake}>{meta.rightLabel}</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </Screen>
    );
  }

  function renderProfile() {
    const pet = getCurrentPet();
    const maskedPhone = formatMaskedPhone(session?.phone);
    const ownerName = formatOwnerName(session?.phone, pet, session?.account?.ownerName);
    const speciesLabel = pet ? speciesLabels[pet.species] : '';
    const petGenderSymbol = pet?.gender === 'female' ? '♀' : pet?.gender === 'male' ? '♂' : '';
    const petBadgeText = [petGenderSymbol, pet?.breed || speciesLabel].filter(Boolean).join(' ');
    const petTags = buildPetProfileTags(pet, pendingVaccines.length, vaccines.length);
    const unreadNotificationCount = notifications.filter((item) => !item.read).length;
    return (
      <Screen showBack={false} title="">
        <View style={styles.profileMakePage}>
          <View style={styles.profileMakeHeader}>
            <Text style={styles.profileScreenTitleMake}>我的</Text>
            <Pressable onPress={() => go('settings')} style={styles.profileSettingsButton}>
              <Settings color={palette.ink} size={18} strokeWidth={2.3} />
            </Pressable>
          </View>

          <View style={[styles.profileHeroMake, profileBlockMarginStyle, Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 60%, #FFD7BF 100%)' } as object) : null]}>
            <View style={styles.profileHeroOrb} />
            <View style={styles.profileHeroContent}>
              <View style={styles.profileOwnerAvatar}>
                {session?.account?.ownerAvatarUrl ? (
                  <Image source={{ uri: session.account.ownerAvatarUrl }} style={styles.avatarImage} />
                ) : (
                  <User color={palette.orange} size={30} strokeWidth={2.3} />
                )}
              </View>
              <View style={styles.flex}>
                <Text style={styles.profileOwnerName}>{ownerName}</Text>
                <View style={styles.profilePhoneRow}>
                  <Phone color={palette.muted} size={11} strokeWidth={2.2} />
                  <Text style={styles.profilePhoneText}>{maskedPhone}</Text>
                </View>
                <View style={styles.profileVerifyPill}>
                  <Shield color={palette.teal} size={10} strokeWidth={2.4} />
                  <Text style={styles.profileVerifyText}>{accountVerificationLabel(session?.phone)}</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="编辑个人资料"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => go('ownerEdit')}
                style={webPressableReset}
              >
                <Edit3 color={palette.muted} size={18} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.profileCurrentWrap, profileBlockPaddingStyle]}>
            <View style={styles.profileSectionLabelRow}>
              <Text style={styles.profileSectionLabel}>当前宠物</Text>
              <Pressable onPress={() => go(pet ? 'multiPet' : 'petInfo')}>
                <Text style={styles.profileManageLink}>{pet ? '多宠管理 ›' : '添加宠物 ›'}</Text>
              </Pressable>
            </View>
            {pet ? (
              <Pressable accessibilityLabel={`进入${pet.name}的宠物档案`} accessibilityRole="button" onPress={() => go('petDetail')} style={styles.profilePetCardMake}>
                <PetAvatar uri={pet.avatarUrl ?? generatedGoldenAvatarUri} size={60} />
                <View style={styles.flex}>
                  <View style={styles.profilePetNameRow}>
                    <Text style={styles.profilePetName}>{pet.name}</Text>
                    <Text style={styles.profilePetBadge}>{petBadgeText || speciesLabel}</Text>
                  </View>
                  <Text style={styles.profilePetMeta}>{formatPetAge(pet.birthday)} · {formatWeightKg(pet.weightKg)}</Text>
                  <View style={styles.profilePetTags}>
                    {petTags.map((tag) => (
                      <Text key={tag} style={styles.profilePetTag}>{tag}</Text>
                    ))}
                  </View>
                </View>
                <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} />
              </Pressable>
            ) : (
              <Pressable accessibilityLabel="添加宠物档案" accessibilityRole="button" onPress={() => go('petInfo')} style={styles.profilePetCardMake}>
                <View style={styles.profilePetEmptyIcon}>
                  <PawPrint color={palette.orange} size={24} strokeWidth={2.4} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.profilePetName}>还没有添加宠物</Text>
                  <Text style={styles.profilePetMeta}>添加猫狗档案后，会在这里管理健康、灵伴和附近互动</Text>
                </View>
                <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} />
              </Pressable>
            )}
          </View>

          <View style={[styles.profileMenuGroup, profileBlockMarginStyle]}>
            <ProfileMakeRow Icon={PawPrint} iconBg="#FFE6D6" iconColor={palette.orange} onPress={() => go(pet ? 'petDetail' : 'petInfo')} title="宠物档案" value={pet?.name ?? '待添加'} />
            <ProfileMakeRow Icon={Users} iconBg="#E8F5F3" iconColor={palette.teal} onPress={() => go('multiPet')} title="多宠管理" value={pets.length ? `${pets.length} 只` : '去添加'} />
            <ProfileMakeRow
              Icon={Bell}
              iconBg="#FBF2D9"
              iconColor={palette.warning}
              onPress={() => go('notifications')}
              right={unreadNotificationCount ? <Text style={styles.profileUnreadBadge}>{unreadNotificationCount}</Text> : <Text numberOfLines={1} style={styles.profileMakeRowValue}>暂无未读</Text>}
              title="通知中心"
            />
            <ProfileMakeRow Icon={Settings} iconBg={palette.pale} iconColor={palette.ink} onPress={() => go('settings')} title="设置与隐私" />
            <ProfileMakeRow Icon={Shield} iconBg="#E8F5F3" iconColor={palette.teal} last onPress={() => go('safety')} title="安全中心" />
          </View>
        </View>
      </Screen>
    );
  }

  function renderMultiPet() {
    const current = getCurrentPet();
    const orderedPets: PetProfile[] = pets.length
      ? ([current, ...pets.filter((item) => item.id !== current?.id)].filter(Boolean) as PetProfile[])
      : current
        ? [current]
        : [];
    const switchingPetName = pets.find((pet) => pet.id === petSwitchingId)?.name;
    return (
      <Screen title="我的宠物">
        <View style={styles.multiPetPageMake}>
          {current ? (
            <View style={[styles.multiPetHero, Boolean(petSwitchingId) && styles.multiPetHeroDimmedMake]}>
              <View style={styles.profileHeroOrb} />
              <View style={styles.multiPetHeroMain}>
                <PetAvatar uri={current.avatarUrl ?? generatedGoldenAvatarUri} size={72} />
                <View style={styles.flex}>
                  <View style={styles.profilePetNameRow}>
                    <Text style={styles.multiPetHeroName}>{current.name}</Text>
                    <View style={styles.currentPetBadge}>
                      <Sparkles color={palette.orange} size={9} strokeWidth={2.5} />
                      <Text style={styles.currentPetBadgeText}>当前灵伴</Text>
                    </View>
                  </View>
                  <Text style={styles.profilePetMeta}>{speciesLabels[current.species]} · {current.breed || '品种待补充'}</Text>
                  <Text style={styles.profilePetMeta}>{formatPetAge(current.birthday)} · {formatWeightKg(current.weightKg)}</Text>
                </View>
              </View>
              <View style={styles.multiPetHeroHealth}>
                <Heart color={palette.teal} size={12} strokeWidth={2.4} />
                <Text style={styles.multiPetHeroHealthText}>{current.healthScore >= 80 ? '近 30 天健康稳定' : '建议关注近期健康状态'}</Text>
              </View>
            </View>
          ) : null}

          {petSwitchingId ? (
            <View style={styles.multiPetSwitchToastMake}>
              <ActivityIndicator color={palette.orange} size="small" />
              <Text style={styles.multiPetSwitchToastTextMake}>正在召唤{switchingPetName ?? '灵伴'}…</Text>
            </View>
          ) : null}

          {orderedPets.length ? (
            <>
              <View style={styles.multiPetSectionLabelRow}>
                <Text style={styles.profileSectionLabel}>全部宠物 · {orderedPets.length} 只</Text>
                <Text style={petSwitchingId ? styles.multiPetSwitchingTextMake : styles.profileManageLink}>{petSwitchingId ? `正在切换到${switchingPetName ?? '灵伴'}…` : '最多 5 只'}</Text>
              </View>

              <View style={styles.multiPetList}>
                {orderedPets.map((pet) => {
                  const isCurrent = pet.id === current?.id;
                  const switching = petSwitchingId === pet.id;
                  const deleting = petDeletingId === pet.id;
                  return (
                    <View key={pet.id} style={[styles.multiPetRow, isCurrent && styles.multiPetRowActive]}>
                      <PetAvatar uri={pet.avatarUrl ?? generatedGoldenAvatarUri} size={54} />
                      <Pressable
                        onPress={() => {
                          if (isCurrent) {
                            go('petDetail');
                          } else {
                            void switchActivePet(pet);
                          }
                        }}
                        style={[styles.flex, webPressableReset]}
                      >
                        <View style={styles.profilePetNameRow}>
                          <Text style={styles.multiPetRowName}>{pet.name}</Text>
                          <Text numberOfLines={1} style={[styles.multiPetKindBadge, pet.species === 'dog' && styles.multiPetKindBadgeDog]}>{speciesLabels[pet.species]} · {pet.breed || '品种待补充'}</Text>
                        </View>
                        <Text style={styles.profilePetMeta}>{formatPetAge(pet.birthday)} · {formatWeightKg(pet.weightKg)}</Text>
                        <View style={[styles.multiPetHealthPill, pet.healthScore < 75 && styles.multiPetHealthPillWarn]}>
                          {pet.healthScore < 75 ? <AlertTriangle color={palette.warning} size={10} strokeWidth={2.4} /> : <Heart color={palette.teal} size={10} strokeWidth={2.4} />}
                          <Text style={[styles.multiPetHealthPillText, pet.healthScore < 75 && styles.multiPetHealthPillTextWarn]}>{pet.healthScore >= 80 ? '近 30 天健康稳定' : '建议关注近期健康状态'}</Text>
                        </View>
                      </Pressable>
                      <View style={styles.multiPetActions}>
                        <Pressable
                          disabled={isCurrent || Boolean(petSwitchingId)}
                          onPress={() => void switchActivePet(pet)}
                          style={[styles.switchPetButton, isCurrent && styles.switchPetButtonActive, switching && styles.switchPetButtonLoadingMake, webPressableReset]}
                        >
                          {switching ? (
                            <ActivityIndicator color={palette.orange} size="small" />
                          ) : (
                            <>
                              {isCurrent ? <Check color={palette.orange} size={12} strokeWidth={2.6} /> : null}
                              <Text style={[styles.switchPetText, isCurrent && styles.switchPetTextActive]}>{isCurrent ? '已选中' : '切换'}</Text>
                            </>
                          )}
                        </Pressable>
                        <Pressable disabled={deleting} onPress={() => confirmDeletePet(pet)} style={[styles.petDeleteIconButton, webPressableReset]}>
                          {deleting ? <ActivityIndicator color={palette.danger} size="small" /> : <Trash2 color={palette.danger} size={15} strokeWidth={2.3} />}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                <Pressable onPress={() => go('petInfo')} style={[styles.addPetDashed, webPressableReset]}>
                  <Plus color={palette.orange} size={16} strokeWidth={2.5} />
                  <Text style={styles.addPetDashedText}>添加新的宠物</Text>
                </Pressable>
              </View>
            </>
          ) : (
            renderNoPetMakeEmpty({ onLater: () => back() })
          )}

          {orderedPets.length ? (
            <View style={styles.multiPetNoteMake}>
              <PawPrint color={palette.orange} size={14} strokeWidth={2.4} />
              <Text style={styles.multiPetNoteTextMake}>切换当前宠物后，首页、健康、AI 对话和附近资料都会同步更新。</Text>
            </View>
          ) : null}
        </View>
      </Screen>
    );
  }

  function renderOwnerEdit() {
    const nameCount = ownerNameDraft.trim().length;
    const bioCount = ownerBioDraft.trim().length;
    const invalid = !ownerNameDraft.trim() || nameCount > 14 || bioCount > 60;
    return (
      <Screen title="编辑个人资料">
        <View style={styles.ownerEditMakePage}>
        {ownerProfileSaving ? (
          <View style={styles.ownerSavingPuffMake}>
            <ActivityIndicator color={palette.orange} size="small" />
            <Text style={styles.ownerSavingPuffTextMake}>正在保存资料...</Text>
          </View>
        ) : null}

        <View style={[styles.ownerAvatarBlock, ownerProfileSaving && styles.ownerSavingContentDimMake]}>
          <Pressable onPress={() => void pickOwnerAvatar()} style={[styles.ownerAvatarLarge, webPressableReset]}>
            {ownerAvatarDraft ? (
              <Image source={{ uri: ownerAvatarDraft }} style={[styles.ownerAvatarImage, ownerAvatarPicking && styles.ownerAvatarImageUploadingMake]} />
            ) : (
              <User color={palette.orange} size={42} strokeWidth={2.2} />
            )}
            {ownerAvatarPicking ? (
              <View style={styles.ownerAvatarOverlay}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.ownerAvatarProgressTextMake}>处理中</Text>
              </View>
            ) : null}
            {ownerProfileSaved && !ownerAvatarPicking ? (
              <View style={styles.ownerAvatarSuccessOverlayMake}>
                <Check color="#fff" size={28} strokeWidth={2.8} />
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => void pickOwnerAvatar()} style={[styles.ownerAvatarCamera, webPressableReset]}>
            <Camera color="#fff" size={14} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.ownerAvatarHintMake}>{ownerAvatarPicking ? '正在处理头像...' : ownerProfileSaved ? '头像已更新' : '点击更换头像'}</Text>
        </View>

        <View style={[styles.editFormCard, ownerProfileSaving && styles.ownerSavingContentDimMake]}>
          <View style={styles.makeFieldGroup}>
            <Text style={styles.makeFieldLabel}>主人昵称 *</Text>
            <TextInput
              maxLength={18}
              onChangeText={(value) => {
                setOwnerNameDraft(value);
                if (ownerProfileSaved) setOwnerProfileSaved(false);
              }}
              placeholder="给自己取个昵称"
              placeholderTextColor="#B8B3A8"
              style={[styles.makeTextInput, (!ownerNameDraft.trim() || nameCount > 14) && styles.makeTextInputError, webTextInputReset]}
              value={ownerNameDraft}
            />
            <View style={styles.fieldHintRow}>
              <Text style={[styles.fieldHintText, (!ownerNameDraft.trim() || nameCount > 14) && styles.fieldHintError]}>{!ownerNameDraft.trim() ? '昵称不能为空' : nameCount > 14 ? '昵称最多 14 个字' : ' '}</Text>
              <Text style={[styles.fieldHintText, nameCount > 14 && styles.fieldHintError]}>{nameCount}/14</Text>
            </View>
          </View>

          <View style={styles.makeFieldGroup}>
            <View style={styles.rowBetween}>
              <Text style={styles.makeFieldLabel}>手机号</Text>
              <Text style={styles.lockedFieldHint}>暂不支持修改</Text>
            </View>
            <View style={[styles.makeTextInput, styles.readonlyField]}>
              <Phone color={palette.muted} size={15} strokeWidth={2.2} />
              <Text style={styles.ownerReadonlyValueMake}>{formatMaskedPhone(session?.phone)}</Text>
            </View>
            <Text style={styles.fieldHintText}>手机号是当前登录账号，暂不支持在资料页修改。</Text>
          </View>

          <View style={styles.makeFieldGroup}>
            <View style={styles.rowBetween}>
              <Text style={styles.makeFieldLabel}>个人简介</Text>
              <Text style={styles.lockedFieldHint}>选填</Text>
            </View>
            <TextInput
              multiline
              onChangeText={(value) => {
                setOwnerBioDraft(value);
                if (ownerProfileSaved) setOwnerProfileSaved(false);
              }}
              placeholder="写一句介绍你和毛孩子的话"
              placeholderTextColor="#B8B3A8"
              style={[styles.makeTextInput, styles.makeTextAreaInput, bioCount > 60 && styles.makeTextInputError, webTextInputReset]}
              textAlignVertical="top"
              value={ownerBioDraft}
            />
            <View style={styles.fieldHintRow}>
              <Text style={[styles.fieldHintText, bioCount > 60 && styles.fieldHintError]}>{bioCount > 60 ? '简介最多 60 个字' : ' '}</Text>
              <Text style={[styles.fieldHintText, bioCount > 60 && styles.fieldHintError]}>{bioCount}/60</Text>
            </View>
          </View>
        </View>

        {ownerAvatarPicking ? (
          <View style={styles.ownerAvatarUploadNoteMake}>
            <ActivityIndicator color={palette.orange} size="small" />
            <Text style={styles.ownerAvatarUploadNoteTextMake}>正在处理头像，完成后保存按钮会恢复可用</Text>
          </View>
        ) : null}

        {ownerProfileSaveError ? (
          <View style={styles.ownerSaveErrorCardMake}>
            <View style={styles.ownerSaveErrorIconMake}>
              <WifiOff color={palette.danger} size={15} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.ownerSaveErrorTitleMake}>资料已暂存到本地</Text>
              <Text style={styles.ownerSaveErrorTextMake}>别担心，输入不会丢失，网络恢复后再点一次即可</Text>
            </View>
            <Pressable onPress={() => void saveOwnerProfile()} style={[styles.ownerSaveRetryMake, webPressableReset]}>
              <RefreshCw color={palette.orange} size={11} strokeWidth={2.5} />
              <Text style={styles.ownerSaveRetryTextMake}>重试</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.editActionStack}>
          <Button disabled={invalid || ownerAvatarPicking} loading={ownerProfileSaving} onPress={() => void saveOwnerProfile()}>保存资料</Button>
        </View>
        </View>
      </Screen>
    );
  }

  function renderSettings() {
    return (
      <Screen title="设置与隐私">
        <View style={styles.settingsMakePage}>
          <SettingsMakeSection footnote="开启「模糊定位」后，附近的人只能看到 1 公里范围内的大致位置，不会显示精确坐标。" title="隐私">
            <SettingsMakeRow
              Icon={MapPin}
              iconBg="#E8F5F3"
              iconColor={palette.teal}
              onPress={() => void toggleUserSetting('fuzzyLocation', '模糊定位')}
              right={<SettingsMakeToggle on={userSettings.fuzzyLocation} />}
              sub="只显示 1 公里范围"
              title="模糊定位"
            />
            <SettingsMakeRow
              Icon={Eye}
              iconBg="#EFEAE1"
              iconColor={palette.ink}
              onPress={() => void toggleUserSetting('nearbyVisible', '附近可见')}
              right={<SettingsMakeToggle on={userSettings.nearbyVisible} />}
              sub="允许出现在附近的人列表"
              title="附近可见"
            />
            <SettingsMakeRow
              Icon={MessageCircle}
              iconBg="#FFE6D6"
              iconColor={palette.orange}
              last
              onPress={() => void toggleUserSetting('interactionMessages', '互动消息提醒')}
              right={<SettingsMakeToggle on={userSettings.interactionMessages} />}
              title="互动消息提醒"
            />
          </SettingsMakeSection>

          <SettingsMakeSection title="通用">
            <SettingsMakeRow
              Icon={Bell}
              iconBg="#FBF2D9"
              iconColor="#C99B3E"
              last
              onPress={() => void toggleUserSetting('pushNotifications', '通知')}
              title="通知"
              value={userSettings.pushNotifications ? '开启' : '关闭'}
            />
          </SettingsMakeSection>

          <SettingsMakeSection title="安全与账号">
            <SettingsMakeRow Icon={Lock} iconBg="#E8F5F3" iconColor={palette.teal} onPress={() => go('accountSecurity')} title="账号安全" />
            <SettingsMakeRow Icon={Shield} iconBg="#E8F5F3" iconColor={palette.teal} onPress={() => go('safety')} title="黑名单与举报" />
            <SettingsMakeRow
              Icon={LogOut}
              danger
              iconBg="#FBE4DE"
              iconColor={palette.danger}
              last
              onPress={() => setLogoutConfirmVisible(true)}
              right={<View />}
              title="退出登录"
            />
          </SettingsMakeSection>
        </View>
      </Screen>
    );
  }

  function renderPetDetail() {
    const pet = getCurrentPet();
    const genderSymbol = pet?.gender === 'female' ? '♀' : pet?.gender === 'male' ? '♂' : '未知';
    const vaccineValue = pendingVaccines.length ? `${pendingVaccines.length} 项待提醒` : vaccines.length ? '已完成' : '待添加';
    const memoValue = memos.length ? `${memos.length} 条记录` : '待记录';
    const detailImageUri = pet?.avatarUrl ?? generatedGoldenAvatarUri;
    const birthdayShort = pet?.birthday ? pet.birthday.slice(0, 7).replace(/-/g, '.') : '待补充';
    const bodySize = petBodySizeLabel(pet);
    const coatColor = '未记录';
    return (
      <Screen title="宠物档案">
        {pet ? (
          <View style={styles.petDetailMakePage}>
            <View style={styles.petDetailHeroMake}>
              <Image resizeMode="cover" source={{ uri: detailImageUri }} style={styles.petDetailHeroImage} />
              <View style={styles.petDetailHeroOverlay} />
              <Pressable onPress={startPetAvatarRefresh} style={styles.petDetailCamera}>
                <Camera color="#fff" size={12} strokeWidth={2.3} />
                <Text style={styles.petDetailCameraText}>更换</Text>
              </Pressable>
              <View style={styles.petDetailHeroText}>
                <Text style={styles.petDetailHeroName}>{pet.name}</Text>
                <Text style={styles.petDetailHeroMeta}>{pet.breed || speciesLabels[pet.species]} · {genderSymbol} · {formatPetAge(pet.birthday)}</Text>
              </View>
              <Pressable onPress={() => go('editPet')} style={styles.petDetailEdit}>
                <Edit3 color={palette.orange} size={12} strokeWidth={2.4} />
                <Text style={styles.petDetailEditText}>编辑</Text>
              </Pressable>
            </View>
            <View style={styles.petDetailStats}>
              {[
                ['体重', formatWeightKg(pet.weightKg)],
                ['生日', birthdayShort],
                ['体型', bodySize],
              ].map(([label, value]) => (
                <View key={label} style={styles.petDetailStatCard}>
                  <Text style={styles.petDetailStatLabel}>{label}</Text>
                  <Text style={styles.petDetailStatValue}>{value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.petDetailSectionMake}>
              <Text style={styles.petDetailSectionTitleMake}>基础信息</Text>
              <View style={styles.petDetailInfoCardMake}>
                <PetDetailInfoRow label="昵称" value={pet.name} />
                <View style={styles.makeDivider} />
                <PetDetailInfoRow label="品种" value={pet.breed || speciesLabels[pet.species]} />
                <View style={styles.makeDivider} />
                <PetDetailInfoRow label="性别 / 绝育" value={`${genderSymbol} / 未记录`} />
                <View style={styles.makeDivider} />
                <PetDetailInfoRow label="毛色" value={coatColor} />
              </View>
            </View>
            <View style={styles.petDetailSectionMake}>
              <Text style={styles.petDetailSectionTitleMake}>健康</Text>
              <View style={styles.petDetailInfoCardMake}>
                <ProfileMakeRow Icon={Heart} iconBg="#E8F5F3" iconColor={palette.teal} onPress={() => go('vaccine')} title="疫苗与驱虫" value={vaccineValue} />
                <ProfileMakeRow Icon={CalendarDays} iconBg="#FBF2D9" iconColor={palette.warning} last onPress={() => go('healthCalendar')} title="健康日历" value={memoValue} />
              </View>
            </View>
          </View>
        ) : (
          renderEmptyPet()
        )}
      </Screen>
    );
  }

  function renderDailyPost() {
    const pet = getCurrentPet();
    const petName = pet?.name ?? '灵伴';
    const aiDraft = buildDailyPostDraft(dailyMood);
    const dailyPlaceholderCount = Math.max(0, 2 - dailyPostPhotoUris.length);
    return (
      <Screen
        right={(
          <Pressable disabled={dailyPostSaving} onPress={() => void publishDailyPost()} style={[styles.dailyHeaderPublishMake, webPressableReset]}>
            {dailyPostSaving ? <ActivityIndicator color={palette.orange} size="small" /> : <Text style={styles.dailyHeaderPublishTextMake}>发布</Text>}
          </Pressable>
        )}
        title="今日小事"
      >
        <View style={styles.dailyPostPageMake}>
          <Pressable onPress={() => go('petDetail')} style={[styles.dailyPetChipMake, webPressableReset]}>
            <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={38} />
            <View style={styles.flex}>
              <Text style={styles.dailyPetChipTitleMake}>{petName}的日常</Text>
              <Text style={styles.dailyPetChipSubMake}>主人记录 · 仅自己可见</Text>
            </View>
            <ChevronRight color={palette.muted} size={16} strokeWidth={2.3} />
          </Pressable>

          <View style={styles.dailyTextCardMake}>
            <TextInput
              multiline
              onChangeText={setDailyPostText}
              placeholder="写下今天的小事，比如散步、食欲、精神状态，或者一个可爱的瞬间。"
              placeholderTextColor="#b6aca3"
              style={[styles.dailyTextareaMake, webTextInputReset]}
              value={dailyPostText}
            />
          </View>

          <View style={styles.dailyPhotoRowMake}>
            {dailyPostPhotoUris.map((uri, index) => (
              <Pressable
                disabled={dailyPhotoPicking}
                key={`${uri}-${index}`}
                onPress={() => {
                  setDailyPostPhotoUris((items) => items.filter((item) => item !== uri));
                  showToast('已移除这张照片');
                }}
                style={[styles.dailyPhotoSquareMake, webPressableReset]}
              >
                <Image resizeMode="cover" source={{ uri }} style={styles.avatarImage} />
              </Pressable>
            ))}
            {dailyPostPhotoUris.length < 3 ? (
              <Pressable disabled={dailyPhotoPicking} onPress={() => void pickDailyPostPhoto('library')} style={[styles.dailyPhotoAddMake, dailyPhotoPicking && styles.mapSearchActionDisabled, webPressableReset]}>
                {dailyPhotoPicking ? <ActivityIndicator color={palette.muted} size="small" /> : <ImagePlus color={palette.muted} size={20} strokeWidth={2.2} />}
                <Text style={styles.dailyPhotoAddTextMake}>{dailyPhotoPicking ? '选择中' : '添加'}</Text>
              </Pressable>
            ) : null}
            {Array.from({ length: dailyPlaceholderCount }).map((_, index) => (
              <View key={`daily-photo-placeholder-${index}`} style={styles.dailyPhotoPlaceholderMake}>
                <ImagePlus color="rgba(122,121,114,0.32)" size={18} strokeWidth={2.1} />
              </View>
            ))}
          </View>

          <View style={styles.dailyChipRowMake}>
            {dailyMoodOptions.map((item) => (
              <Text
                key={item}
                onPress={() => setDailyMood(item)}
                style={[styles.dailyChipMake, dailyMood === item && styles.dailyChipActiveMake]}
              >
                {item === '开心' ? '😊' : item === '活跃' ? '🐾' : item === '正常' ? '🌿' : '💤'} 心情：{item}
              </Text>
            ))}
            <Text style={styles.dailyChipMake}>#日常</Text>
            <Text style={styles.dailyChipMake}>#健康观察</Text>
          </View>

          <View style={[styles.dailyAiCardMake, Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, rgba(255,138,92,0.10), rgba(77,182,172,0.10))' } as object) : null]}>
            <View style={styles.dailyAiIconMake}>
              <Sparkles color={palette.orange} size={15} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <View style={styles.rowBetween}>
                <Text style={styles.dailyAiTitleMake}>AI 灵伴帮你润色</Text>
                <Text onPress={fillDailyPostDraft} style={styles.dailyAiActionMake}>采用</Text>
              </View>
              <Text style={styles.dailyAiTextMake} numberOfLines={4}>“{aiDraft}”</Text>
            </View>
          </View>

          <View style={styles.dailyBottomBarMake}>
            <View style={styles.dailyToolRowMake}>
              <Pressable disabled={dailyPhotoPicking} onPress={() => void pickDailyPostPhoto('camera')} style={[styles.dailyToolButtonMake, dailyPhotoPicking && styles.mapSearchActionDisabled, webPressableReset]}>
                {dailyPhotoPicking ? <ActivityIndicator color={palette.ink} size="small" /> : <Camera color={palette.ink} size={20} strokeWidth={2.3} />}
              </Pressable>
              <Pressable disabled={dailyPhotoPicking} onPress={() => void pickDailyPostPhoto('library')} style={[styles.dailyToolButtonMake, dailyPhotoPicking && styles.mapSearchActionDisabled, webPressableReset]}>
                <ImagePlus color={palette.ink} size={20} strokeWidth={2.3} />
              </Pressable>
              <Pressable onPress={() => setDailyMood(dailyMood === '开心' ? '活跃' : '开心')} style={[styles.dailyToolButtonMake, webPressableReset]}>
                <Smile color={palette.ink} size={20} strokeWidth={2.3} />
              </Pressable>
            </View>
            <Pressable disabled={dailyPostSaving} onPress={() => void publishDailyPost()} style={[styles.dailyPublishPillMake, dailyPostSaving && styles.dailyPublishPillDisabledMake, webPressableReset]}>
              {dailyPostSaving ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={13} strokeWidth={2.8} />}
              <Text style={styles.dailyPublishPillTextMake}>{dailyPostSaving ? '发布中' : '发布'}</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  function renderWalkInvite() {
    const owner = selectedOwner;
    const pet = getCurrentPet();
    const currentPetImageSource = pet?.avatarUrl && !isGeneratedAvatarUri(pet.avatarUrl) ? { uri: pet.avatarUrl } : generatedGoldenAvatarSource;
    const ownerPetImageSource = owner?.imageUrl && !isGeneratedAvatarUri(owner.imageUrl) ? { uri: owner.imageUrl } : generatedGoldenAvatarSource;
    const dateTiles = buildWalkInviteDateTiles();
    const activeDateIndex = Math.max(0, dateTiles.findIndex((tile) => walkInviteTime.startsWith(tile.day) || walkInviteTime.includes(tile.date)));
    const walkNotePlaceholder = pet?.name
      ? `可以写下${pet.name}喜欢的玩具、性格或见面注意事项`
      : '可以写下宠物喜欢的玩具、性格或见面注意事项';
    const selectedWalkPlace = walkInvitePlaceId ? places.find((place) => place.id === walkInvitePlaceId) ?? null : null;
    const walkPlaceVisualUrl = selectedWalkPlace ? getPlaceVisualUrl(selectedWalkPlace) : walkInviteParkPhotoUrl;
    const walkPlaceMeta = walkInvitePlaceAddress || (selectedWalkPlace ? walkInvitePlaceMetaFor(selectedWalkPlace) : '');
    return (
      <Screen title="约遛邀请">
        {owner ? (
          <View style={styles.walkInvitePageMake}>
            <View style={styles.walkPetsCardMake}>
              <View style={styles.walkAvatarStackMake}>
                <View style={styles.walkAvatarCircleMake}>
                  <Image resizeMode="cover" source={currentPetImageSource} style={styles.avatarImage} />
                </View>
                <View style={[styles.walkAvatarCircleMake, styles.walkAvatarOverlapMake]}>
                  <Image resizeMode="cover" source={ownerPetImageSource} style={styles.avatarImage} />
                </View>
              </View>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={styles.walkPetsTitleMake}>{pet?.name ?? '我的宠物'} × {owner.petName}</Text>
                <Text numberOfLines={1} style={styles.walkPetsMetaMake}>{pet?.breed ?? (pet?.species === 'cat' ? '猫咪' : '狗狗')} × {owner.tags[0] ?? (owner.species === 'cat' ? '猫咪' : '狗狗')} · 一起溜达？</Text>
              </View>
            </View>

            <Text style={styles.walkFieldLabelMake}>时间</Text>
            <View style={styles.walkDateRowMake}>
              {dateTiles.map((tile, index) => {
                const active = index === activeDateIndex;
                return (
                  <Pressable key={tile.value} onPress={() => setWalkInviteTime(tile.value)} style={[styles.walkDateTileMake, active && styles.walkDateTileActiveMake, webPressableReset]}>
                    <Text style={[styles.walkDateDayMake, active && styles.walkDateDayActiveMake]}>{tile.day}</Text>
                    <Text style={styles.walkDateValueMake}>{tile.date}</Text>
                    <Text style={styles.walkDateWeekMake}>{tile.weekday}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.walkTimeRowMake}>
              <Clock color={palette.orange} size={15} strokeWidth={2.4} />
              <TextInput
                onChangeText={setWalkInviteTime}
                placeholder="17:30 - 18:30"
                placeholderTextColor="#B8B3A8"
                style={[styles.walkTimeInputMake, webTextInputReset]}
                value={walkInviteTime}
              />
              <ChevronRight color={palette.muted} size={15} strokeWidth={2.4} />
            </View>

            <Text style={styles.walkFieldLabelMake}>地点</Text>
            <View style={styles.walkPlaceCardMake}>
              <Image resizeMode="cover" source={{ uri: walkPlaceVisualUrl }} style={styles.avatarImage} />
              <View style={styles.walkPlaceOverlayMake} />
              <View style={[styles.walkPlaceTitleMake, walkPlaceMeta && styles.walkPlaceTitleWithMetaMake]}>
                <MapPin color="#fff" size={13} strokeWidth={2.4} />
                <TextInput
                  onChangeText={(value) => {
                    setWalkInvitePlace(value);
                    setWalkInvitePlaceAddress('');
                    setWalkInvitePlaceId('');
                    setWalkInvitePlaceLatitude(undefined);
                    setWalkInvitePlaceLongitude(undefined);
                  }}
                  placeholder="搜索或选择宠物友好地点"
                  placeholderTextColor="rgba(255,255,255,0.78)"
                  style={[styles.walkPlaceInputMake, webTextInputReset]}
                  value={walkInvitePlace}
                />
              </View>
              {walkPlaceMeta ? <Text numberOfLines={1} style={styles.walkPlaceMetaMake}>{walkPlaceMeta}</Text> : null}
              <Pressable onPress={openWalkInvitePlacePicker} style={[styles.walkPlacePickBadgeMake, webPressableReset]}>
                <Text style={styles.walkPlacePickBadgeTextMake}>{walkInvitePlaceId ? '重选地点' : '地图选择'}</Text>
              </Pressable>
            </View>

            <Text style={styles.walkFieldLabelMake}>留言</Text>
            <View style={styles.walkMessageCardMake}>
              <TextInput
                multiline
                onChangeText={setWalkInviteNote}
                placeholder={walkNotePlaceholder}
                placeholderTextColor="#B8B3A8"
                style={[styles.walkMessageInputMake, webTextInputReset]}
                value={walkInviteNote}
              />
            </View>

            <View style={styles.walkSafetyMake}>
              <Shield color={palette.teal} size={13} strokeWidth={2.4} />
              <Text style={styles.walkSafetyTextMake}>建议在公共宠物友好场所见面，注意人身与宠物安全</Text>
            </View>

            <View style={styles.walkBottomActionsMake}>
              <Pressable disabled={walkInviteSaving || walkDraftSaving} onPress={() => void saveWalkInviteDraft()} style={[styles.walkDraftButtonMake, (walkInviteSaving || walkDraftSaving) && styles.mapSearchActionDisabled, webPressableReset]}>
                {walkDraftSaving ? <ActivityIndicator color={palette.ink} size="small" /> : null}
                <Text style={styles.walkDraftButtonTextMake}>{walkDraftSaving ? '保存中' : '保存草稿'}</Text>
              </Pressable>
              <Pressable disabled={walkInviteSaving} onPress={() => void createWalkInvite()} style={[styles.walkSendButtonMake, webPressableReset]}>
                {walkInviteSaving ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={14} strokeWidth={2.5} />}
                <Text style={styles.walkSendButtonTextMake}>{walkInviteSaving ? '发送中' : '发送邀请'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ErrorState
            action="回到发现页"
            description="原来的对象可能已离开附近列表，请回到发现页重新选择。"
            icon={<Users color={palette.warning} size={20} strokeWidth={2.4} />}
            iconTone="warning"
            onAction={() => replace('discover')}
            title="暂无可邀请对象"
          />
        )}
      </Screen>
    );
  }

  function renderGreetingRequests() {
    const pet = getCurrentPet();
    const requestCount = greetingRequestOwners.length;
    return (
      <Screen title="招呼请求">
        {requestCount ? (
          <View style={styles.greetingRequestSummaryMake}>
            <Text style={styles.greetingRequestSummaryBadgeMake}>{requestCount} 条新招呼</Text>
            <Text numberOfLines={1} style={styles.greetingRequestSummaryTextMake}>同意后即可开始聊天</Text>
          </View>
        ) : null}
        <View style={styles.requestStackMake}>
          {requestCount ? greetingRequestOwners.map((owner, index) => {
            const accepting = socialActionSavingIds.includes(`accept:${owner.id}`);
            const rejecting = socialActionSavingIds.includes(`reject:${owner.id}`);
            const reporting = socialActionSavingIds.includes(`report:${owner.id}`);
            const busy = accepting || rejecting || reporting;
            const petImageSource = owner.imageUrl && !isGeneratedAvatarUri(owner.imageUrl) ? { uri: owner.imageUrl } : generatedGoldenAvatarSource;
            const ownerAvatarUrl = discoverOwnerAvatarUrls[index % discoverOwnerAvatarUrls.length];
            const breed = owner.tags[0] ?? (owner.species === 'dog' ? '狗狗' : '猫咪');
            const extraTags = owner.tags.slice(1, 3);
            const tagText = [breed, owner.distance, ...extraTags].filter(Boolean).join(' · ');
            const requestMessage = index === 0
              ? `嗨～看起来${pet?.name ?? '你家宠物'}超有活力！要不约个时间一起玩？`
              : `想和${pet?.name ?? '你家宠物'}做朋友～可以一起分享日常吗？`;
            return (
              <View key={owner.id} style={styles.greetingRequestCardMake}>
                <View style={styles.greetingRequestTopMake}>
                  <View style={styles.greetingRequestAvatarWrapMake}>
                    <View style={styles.greetingRequestPetPhotoMake}>
                      <Image resizeMode="cover" source={petImageSource} style={styles.avatarImage} />
                    </View>
                    <View style={styles.greetingRequestOwnerAvatarMake}>
                      <Image resizeMode="cover" source={{ uri: ownerAvatarUrl }} style={styles.avatarImage} />
                    </View>
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.greetingRequestTitleRowMake}>
                      <Text numberOfLines={1} style={styles.greetingRequestTitleMake}>{owner.ownerName} & {owner.petName}</Text>
                      <Text style={styles.greetingRequestTimeMake}>{formatGreetingRequestSeenTime(greetingRequestSeenAtById[owner.id])}</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.greetingRequestMetaMake}>{tagText}</Text>
                    <Text style={styles.greetingRequestMessageMake}>{requestMessage}</Text>
                  </View>
                </View>

                <View style={styles.greetingRequestActionsMake}>
                  <Pressable disabled={busy} onPress={() => void rejectGreeting(owner)} style={[styles.greetingRequestActionGhostMake, busy && styles.mapSearchActionDisabled, webPressableReset]}>
                    {rejecting ? <ActivityIndicator color={palette.muted} size="small" /> : <X color={palette.muted} size={13} strokeWidth={2.5} />}
                    <Text style={styles.greetingRequestActionGhostTextMake}>{rejecting ? '忽略中' : '忽略'}</Text>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => void reportGreeting(owner)} style={[styles.greetingRequestActionReportMake, busy && styles.mapSearchActionDisabled, webPressableReset]}>
                    {reporting ? <ActivityIndicator color={palette.ink} size="small" /> : <Flag color={palette.ink} size={12} strokeWidth={2.3} />}
                    <Text style={styles.greetingRequestActionReportTextMake}>{reporting ? '提交中' : '举报'}</Text>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => void acceptGreeting(owner)} style={[styles.greetingRequestActionPrimaryMake, busy && styles.mapSearchActionDisabled, webPressableReset]}>
                    {accepting ? <ActivityIndicator color="#fff" size="small" /> : <Check color="#fff" size={13} strokeWidth={3} />}
                    <Text style={styles.greetingRequestActionPrimaryTextMake}>{accepting ? '同意中' : '同意 & 聊天'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }) : (
            <EmptyState
              description="新的附近互动会出现在这里。"
              icon={<MessageCircle color={palette.muted} size={26} strokeWidth={2.4} />}
              title="暂无新的招呼"
            />
          )}
        </View>
        <View style={styles.greetingRequestSafetyMake}>
          <Shield color={palette.muted} size={12} strokeWidth={2.4} />
          <Text style={styles.greetingRequestSafetyTextMake}>忽略的招呼不会通知对方，接受前不会暴露精确位置</Text>
        </View>
      </Screen>
    );
  }

  function renderAddPlaceReview() {
    if (placeSubmitResult) return renderPlaceSubmitResult(placeSubmitResult);
    const isReviewMode = placeComposerMode === 'review';
    const place = selectedPlace;
    const headerTitle = isReviewMode ? '写一条点评' : '新增地点';
    const submitLabel = isReviewMode ? '发布' : '提交';
    const bodyValue = isReviewMode ? placeReviewDraft : placeSubmissionExperience;
    const setBodyValue = isReviewMode ? setPlaceReviewDraft : setPlaceSubmissionExperience;
    const bodyPlaceholder = isReviewMode
      ? '例如：草坪很整洁，饮水点和便便袋都备得很齐。'
      : '例如：草坪很大，有饮水点，牵引绳友好。';
    const saving = isReviewMode ? placeReviewSaving : placeSubmissionSaving;
    const placePhotoPlaceholderCount = Math.max(0, 2 - placePhotoUris.length);
    const customSelectedPlaceFeatureTags = selectedPlaceFeatureTags.filter((tag) => !placeFriendlyFeatureOptions.includes(tag as (typeof placeFriendlyFeatureOptions)[number]));
    const submitComposer = () => {
      if (isReviewMode) void createPlaceReview();
      else void submitPlaceDraft();
    };

    if (isReviewMode && !place) {
      return (
        <Screen title="写一条点评">
          <ErrorState
            action="回到地图"
            description="请先从地点详情进入点评页。"
            icon={<MapPin color={palette.warning} size={20} strokeWidth={2.4} />}
            iconTone="warning"
            onAction={() => replace('map')}
            title="还没有选择地点"
          />
        </Screen>
      );
    }

    return (
      <Screen showBack={false} title="">
        <View style={styles.addPlacePageMake}>
          <View style={styles.addPlaceBgGlowMake} />
          <View style={styles.addPlaceHeaderMake}>
            <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={back} style={[styles.iconButton, webPressableReset]}>
              <ChevronLeft color={palette.ink} size={18} strokeWidth={2.4} />
            </Pressable>
            <Text style={styles.addPlaceHeaderTitleMake}>{headerTitle}</Text>
            <Pressable disabled={saving} onPress={submitComposer} style={[styles.addPlaceHeaderPublishMake, saving && styles.opacity60, webPressableReset]}>
              {saving ? <ActivityIndicator color={palette.orange} size="small" /> : <Text style={styles.addPlaceHeaderPublishTextMake}>{submitLabel}</Text>}
            </Pressable>
          </View>

          {isReviewMode && place ? (
            <View style={styles.addPlacePlaceCardMake}>
              <Image resizeMode="cover" source={{ uri: placeReviewPhotoUrls[0] }} style={styles.addPlacePlaceThumbMake} />
              <View style={styles.flex}>
                <Text numberOfLines={1} style={styles.addPlacePlaceNameMake}>{place.name}</Text>
                <Text numberOfLines={1} style={styles.addPlacePlaceMetaMake}>{getPlaceCategoryLabel(place)} · {place.address}</Text>
              </View>
              <ChevronRight color={palette.muted} size={15} strokeWidth={2.2} />
            </View>
          ) : (
            <View style={styles.addPlaceInputCardMake}>
              <View style={styles.addPlaceInputRowMake}>
                <View style={styles.addPlaceInputIconMake}>
                  <MapPin color={palette.orange} size={16} strokeWidth={2.5} />
                </View>
                <TextInput
                  onChangeText={setPlaceDraftName}
                  placeholder="例如：阳光宠物公园"
                  placeholderTextColor="#B8AEA4"
                  style={[styles.addPlaceLineInputMake, webTextInputReset]}
                  value={placeDraftName}
                />
              </View>
              <View style={styles.addPlaceDividerMake} />
              <View style={styles.addPlaceInputRowMake}>
                <View style={styles.addPlaceInputIconMake}>
                  <Navigation color={palette.teal} size={16} strokeWidth={2.5} />
                </View>
                <TextInput
                  onChangeText={setPlaceDraftAddress}
                  placeholder="搜索或输入地址"
                  placeholderTextColor="#B8AEA4"
                  style={[styles.addPlaceLineInputMake, webTextInputReset]}
                  value={placeDraftAddress}
                />
              </View>
            </View>
          )}

          <Text style={styles.addPlaceFieldLabelMake}>{isReviewMode ? '给它打个分' : '推荐程度'}</Text>
          <View style={styles.addPlaceRatingCardMake}>
            {Array.from({ length: 5 }).map((_, index) => {
              const value = index + 1;
              const active = value <= placeSubmissionRating;
              return (
                <Pressable key={value} onPress={() => setPlaceSubmissionRating(value)} style={[styles.addPlaceStarButtonMake, webPressableReset]}>
                  <Star color={active ? '#FFB94B' : '#E0DBD0'} fill={active ? '#FFB94B' : 'transparent'} size={28} strokeWidth={2} />
                </Pressable>
              );
            })}
            <Text style={styles.addPlaceRatingTextMake}>{placeSubmissionRating >= 5 ? '非常推荐' : placeSubmissionRating >= 4 ? '推荐' : '一般'}</Text>
          </View>

          <Text style={styles.addPlaceFieldLabelMake}>这里的宠物友好特色</Text>
          <View style={styles.addPlaceChipRowMake}>
            {placeFriendlyFeatureOptions.map((item) => (
              <Pressable key={item} onPress={() => togglePlaceFeatureTag(item)} style={[styles.addPlaceSelectChipMake, selectedPlaceFeatureTags.includes(item) && styles.addPlaceSelectChipActiveMake, webPressableReset]}>
                <Text style={[styles.addPlaceSelectChipTextMake, selectedPlaceFeatureTags.includes(item) && styles.addPlaceSelectChipTextActiveMake]}>{item}</Text>
              </Pressable>
            ))}
            {customSelectedPlaceFeatureTags.map((item) => (
              <Pressable key={item} onPress={() => togglePlaceFeatureTag(item)} style={[styles.addPlaceSelectChipMake, styles.addPlaceSelectChipActiveMake, webPressableReset]}>
                <Text style={[styles.addPlaceSelectChipTextMake, styles.addPlaceSelectChipTextActiveMake]}>{item}</Text>
              </Pressable>
            ))}
            {!customPlaceFeatureVisible ? (
              <Pressable
                onPress={() => {
                  setCustomPlaceFeatureVisible(true);
                  setTimeout(() => customPlaceFeatureInputRef.current?.focus(), 50);
                }}
                style={[styles.addPlaceSelectChipMake, webPressableReset]}
              >
                <Plus color={palette.ink} size={12} strokeWidth={2.5} />
                <Text style={styles.addPlaceSelectChipTextMake}>自定义</Text>
              </Pressable>
            ) : null}
          </View>
          {customPlaceFeatureVisible ? (
            <View style={styles.addPlaceCustomTagRowMake}>
              <TextInput
                maxLength={8}
                onChangeText={setCustomPlaceFeatureDraft}
                onSubmitEditing={addCustomPlaceFeatureTag}
                placeholder="输入特色，例如：有草坪"
                placeholderTextColor="#B8AEA4"
                ref={customPlaceFeatureInputRef}
                returnKeyType="done"
                style={[styles.addPlaceCustomTagInputMake, webTextInputReset]}
                value={customPlaceFeatureDraft}
              />
              <Pressable onPress={addCustomPlaceFeatureTag} style={[styles.addPlaceCustomTagButtonMake, webPressableReset]}>
                <Plus color="#fff" size={12} strokeWidth={2.7} />
                <Text style={styles.addPlaceCustomTagButtonTextMake}>添加</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.addPlaceFieldLabelMake}>{isReviewMode ? '写下你的体验' : '写下宠物友好体验'}</Text>
          <TextInput
            multiline
            onChangeText={setBodyValue}
            placeholder={bodyPlaceholder}
            placeholderTextColor="#B8AEA4"
            style={[styles.addPlaceTextAreaMake, webTextInputReset]}
            textAlignVertical="top"
            value={bodyValue}
          />

          <Text style={styles.addPlaceFieldLabelMake}>添加照片（可选）</Text>
          <View style={styles.addPlacePhotoRowMake}>
            {placePhotoUris.map((uri, index) => (
              <Pressable
                disabled={placePhotoPicking || saving}
                key={`${uri}-${index}`}
                onPress={() => {
                  setPlacePhotoUris((items) => items.filter((_, itemIndex) => itemIndex !== index));
                  showToast('已移除这张地点照片');
                }}
                style={[styles.addPlacePhotoSquareMake, webPressableReset]}
              >
                <Image resizeMode="cover" source={{ uri }} style={styles.avatarImage} />
              </Pressable>
            ))}
            {placePhotoUris.length < 3 ? (
              <Pressable disabled={placePhotoPicking || saving} onPress={() => void pickPlacePhoto()} style={[styles.addPlacePhotoAddMake, (placePhotoPicking || saving) && styles.mapSearchActionDisabled, webPressableReset]}>
                {placePhotoPicking ? <ActivityIndicator color={palette.muted} size="small" /> : <Camera color={palette.muted} size={20} strokeWidth={2.2} />}
                <Text style={styles.addPlacePhotoAddTextMake}>{placePhotoPicking ? '选择中' : '添加'}</Text>
              </Pressable>
            ) : null}
            {Array.from({ length: placePhotoPlaceholderCount }).map((_, index) => (
              <View key={`place-photo-placeholder-${index}`} style={styles.addPlacePhotoPlaceholderMake}>
                <Camera color="rgba(122,121,114,0.32)" size={18} strokeWidth={2.1} />
              </View>
            ))}
          </View>

          <View style={styles.addPlaceNoticeMake}>
            <Shield color={palette.teal} size={13} strokeWidth={2.5} />
            <Text style={styles.addPlaceNoticeTextMake}>
              {isReviewMode ? '点评需经过 24 小时人工审核，请保持真实客观' : '地点和体验会进入 24 小时人工审核，通过后展示给附近用户'}
            </Text>
          </View>

          {placeSubmissionStatus === 'pending_review' && !isReviewMode ? (
            <View style={styles.reviewStatusCard}>
              <Check color={palette.teal} size={15} strokeWidth={3} />
              <Text style={styles.reviewStatusText}>已提交审核，我们会在通知中心同步处理进度。</Text>
            </View>
          ) : null}

          <Pressable disabled={saving} onPress={submitComposer} style={[styles.addPlaceSubmitButtonMake, saving && styles.opacity60, webPressableReset]}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : isReviewMode ? <PenLine color="#fff" size={15} strokeWidth={2.5} /> : <Shield color="#fff" size={15} strokeWidth={2.5} />}
            <Text style={styles.addPlaceSubmitTextMake}>{isReviewMode ? '发布点评' : '提交审核'}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  function renderAccountSecurity() {
    const deviceLabel = currentDeviceLabel();
    const verificationLabel = accountVerificationLabel(session?.phone);
    return (
      <Screen title="账号安全">
        <View style={styles.settingsMakePage}>
          <View style={[styles.accountSecurityHeroMake, Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #E8F5F3 0%, #DDEFEC 100%)' } as object) : null]}>
            <View style={styles.accountSecurityHeroIconMake}>
              <Shield color={palette.teal} size={20} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.accountSecurityHeroTitleMake}>账号已登录 · {verificationLabel}</Text>
              <Text style={styles.accountSecurityHeroSubMake}>当前登录：{deviceLabel}</Text>
            </View>
          </View>

          <SettingsMakeSection title="登录方式">
            <SettingsMakeRow Icon={Phone} iconBg="#EFEAE1" iconColor={palette.ink} title="手机号" value={formatMaskedPhone(session?.phone)} />
            <SettingsMakeRow Icon={Mail} iconBg="#EFEAE1" iconColor={palette.ink} title="邮箱" value="未绑定" />
            <SettingsMakeRow Icon={KeyRound} iconBg="#FFE6D6" iconColor={palette.orange} last title="登录密码" value="验证码登录" />
          </SettingsMakeSection>

          <SettingsMakeSection title="登录与设备">
            <SettingsMakeRow Icon={Smartphone} iconBg="#E8F5F3" iconColor={palette.teal} title="登录设备" value={deviceLabel} />
            <SettingsMakeRow Icon={EyeOff} iconBg="#EFEAE1" iconColor={palette.ink} last title="登录保护" value="验证码登录" />
          </SettingsMakeSection>
        </View>
      </Screen>
    );
  }

  function renderSafety() {
    const safetyActions = [
      {
        Icon: Flag,
        bg: '#FFE6D6',
        color: palette.orange,
        status: '对象页提交',
        sub: '请在招呼请求、聊天或地点详情中提交，便于带上对象信息',
        title: '举报用户或地点',
      },
      {
        Icon: UserX,
        bg: palette.pale,
        color: palette.ink,
        status: '待接入',
        sub: '需要对象资料页确认后再开放，当前不会做假拦截',
        title: '拉黑用户',
      },
      {
        Icon: Shield,
        bg: '#E8F5F3',
        color: palette.teal,
        status: '0 人',
        sub: '已拉黑 0 人',
        title: '黑名单管理',
      },
      {
        Icon: AlertTriangle,
        bg: '#FBF2D9',
        color: palette.warning,
        onPress: () => openClinicMapSearch('正在查找附近宠物医院和可求助地点'),
        sub: '查找附近宠物医院和可求助地点',
        title: '紧急求助指南',
      },
    ];
    return (
      <Screen title="安全中心">
        <View style={styles.safetyPageMake}>
          <View style={[styles.safetyHeroMake, Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 100%)' } as object) : null]}>
            <View style={styles.safetyHeroIconMake}>
              <Shield color={palette.orange} size={22} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.safetyHeroTitleMake}>Lumii 守护你的每一次出门</Text>
              <Text style={styles.safetyHeroSubMake}>遇到不安全的人或地点，可以随时举报或拉黑</Text>
            </View>
          </View>

          <View style={styles.safetyActionStackMake}>
            {safetyActions.map(({ Icon, bg, color, onPress, status, sub, title }) => {
              const content = (
                <>
                  <View style={[styles.safetyActionIconMake, { backgroundColor: bg }]}>
                    <Icon color={color} size={18} strokeWidth={2.4} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.safetyActionTitleMake}>{title}</Text>
                    <Text style={styles.safetyActionSubMake}>{sub}</Text>
                  </View>
                  {onPress ? <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} /> : <Text style={styles.safetyActionStatusMake}>{status}</Text>}
                </>
              );
              return onPress ? (
                <Pressable key={title} onPress={onPress} style={[styles.safetyActionCardMake, webPressableReset]}>
                  {content}
                </Pressable>
              ) : (
                <View key={title} style={[styles.safetyActionCardMake, styles.safetyActionCardStaticMake]}>
                  {content}
                </View>
              );
            })}
          </View>

          <View style={styles.safetyAuditNoteMake}>
            <Shield color={palette.teal} size={14} strokeWidth={2.4} />
            <Text style={styles.safetyAuditNoteTextMake}>所有举报会在 24 小时内由人工与算法共同审核。情节严重的，将立刻封禁并通知平台处理。</Text>
          </View>
        </View>
      </Screen>
    );
  }

  function renderPlaceholder(title: string, body: string) {
    const isSafety = title.includes('安全');
    const isAccount = title.includes('账号');
    return (
      <Screen title={title}>
        <View style={styles.placeholderMake}>
          <View style={styles.placeholderHeroMake}>
            <Shield color={palette.teal} size={28} strokeWidth={2.5} />
            <View style={styles.flex}>
              <Text style={styles.timelineTitleMake}>{isAccount ? `账号已登录 · ${accountVerificationLabel(session?.phone)}` : isSafety ? '社区安全中心' : title}</Text>
              <Text style={styles.timelineSubMake}>{body}</Text>
            </View>
          </View>
          <View style={styles.settingsGroupMake}>
            <Text style={styles.settingsGroupTitle}>{isAccount ? '登录方式' : isSafety ? '安全工具' : '功能入口'}</Text>
            <ProfileMakeRow Icon={Phone} title="手机号" value={formatMaskedPhone(session?.phone)} />
            <ProfileMakeRow Icon={Shield} title={isSafety ? '举报与拉黑' : '登录保护'} value={isSafety ? '对象页提交' : '已开启'} />
          </View>
        </View>
      </Screen>
    );
  }

  function renderGreetingSheet() {
    const owner = greetingSheetOwner;
    const saving = owner ? socialActionSavingIds.includes(`greet:${owner.id}`) : false;
    const currentPet = getCurrentPet();
    const ownerIndex = owner ? Math.max(0, owners.findIndex((item) => item.id === owner.id)) : 0;
    const ownerAvatarUrl = discoverOwnerAvatarUrls[ownerIndex % discoverOwnerAvatarUrls.length];
    const ownerBreed = owner ? owner.tags[0] ?? (owner.species === 'cat' ? '猫咪' : '狗狗') : '';
    const ownerPetImageSource = owner?.imageUrl && !isGeneratedAvatarUri(owner.imageUrl) ? { uri: owner.imageUrl } : generatedGoldenAvatarSource;
    const currentPetIntro = currentPet
      ? `我家${currentPet.name}${currentPet.breed ? `（${currentPet.breed}）` : ''}`
      : '我家的灵伴';
    const quickMessages = owner
      ? [
          { label: `嗨～看起来${owner.petName}超有活力！`, text: `嗨～看起来${owner.petName}超有活力！${currentPetIntro}特别想找附近同伴` },
          { label: `我家${currentPet?.name ?? '灵伴'}也喜欢公园`, text: `我家${currentPet?.name ?? '灵伴'}也喜欢去公园玩，感觉和${owner.petName}应该会很合拍～` },
          { label: '改天一起遛弯？', text: `我们也常在附近散步，改天方便的话可以和${owner.petName}一起遛弯吗？` },
          { label: '自定义', text: greetingMessage || `你好呀，想和${owner.petName}打个招呼～` },
        ]
      : [];
    return (
      <BottomSheet contentStyle={styles.greetingSheetMake} dismissDisabled={saving} onClose={closeGreetingSheet} visible={Boolean(owner)}>
        {owner ? (
          <>
            <View style={styles.greetingSheetHeader}>
              <View style={styles.greetingSheetAvatarMake}>
                <Image resizeMode="cover" source={ownerPetImageSource} style={styles.avatarImage} />
                <View style={styles.greetingSheetOwnerAvatarMake}>
                  <Image resizeMode="cover" source={{ uri: ownerAvatarUrl }} style={styles.avatarImage} />
                </View>
              </View>
              <View style={styles.flex}>
                <Text style={styles.sheetTitle}>和{owner.petName}打个招呼</Text>
                <Text style={styles.greetingSheetMeta}>{ownerBreed} · 主人 {owner.ownerName} · {owner.distance}</Text>
              </View>
              <Pressable disabled={saving} onPress={closeGreetingSheet} style={[styles.greetingSheetClose, webPressableReset]}>
                <X color={palette.muted} size={17} strokeWidth={2.4} />
              </Pressable>
            </View>

            <Text style={styles.greetingQuickLabelMake}>选一句话开场</Text>
            <View style={styles.greetingQuickRow}>
              {quickMessages.map((message, index) => (
                <Pressable key={message.label} onPress={() => setGreetingMessage(message.text)} style={[styles.greetingQuickChip, greetingMessage === message.text && styles.greetingQuickChipActive, webPressableReset]}>
                  {index === 3 ? <Plus color={greetingMessage === message.text ? palette.orange : palette.ink} size={12} strokeWidth={2.4} /> : null}
                  <Text style={[styles.greetingQuickChipText, greetingMessage === message.text && styles.greetingQuickChipTextActive]} numberOfLines={1}>
                    {message.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.greetingMessageCard}>
              <Text style={styles.greetingMessageText}>{greetingMessage}</Text>
            </View>

            <View style={styles.greetingSafetyMake}>
              <Shield color={palette.teal} size={13} strokeWidth={2.4} />
              <Text style={styles.greetingSafetyTextMake}>首次招呼后对方同意，才能继续聊天。请勿发送骚扰信息</Text>
            </View>

            <View style={styles.greetingSheetActions}>
              <View style={styles.flex}>
                <Button disabled={saving} onPress={closeGreetingSheet} tone="ghost">取消</Button>
              </View>
              <View style={styles.flex}>
                <Button loading={saving} onPress={() => void sendGreeting(owner.id)}>发送招呼</Button>
              </View>
            </View>
          </>
        ) : null}
      </BottomSheet>
    );
  }

  function renderLogoutConfirmSheet() {
    const petName = getCurrentPet()?.name ?? '灵伴';
    return (
      <BottomSheet contentStyle={styles.logoutConfirmSheetMake} dismissDisabled={false} onClose={() => setLogoutConfirmVisible(false)} visible={logoutConfirmVisible}>
        <View style={styles.logoutSheetIconMake}>
          <LogOut color={palette.danger} size={26} strokeWidth={2.4} />
        </View>
        <Text style={styles.logoutSheetTitleMake}>确定要退出登录吗？</Text>
        <Text style={styles.logoutSheetBodyMake}>退出后，本机将不再接收{petName}的健康提醒与 AI 灵伴消息。重新登录后所有数据仍会保留。</Text>
        <View style={styles.logoutSheetActionsMake}>
          <Pressable onPress={() => void logout()} style={[styles.sheetDangerButtonMake, webPressableReset]}>
            <Text style={styles.sheetDangerButtonTextMake}>确认退出</Text>
          </Pressable>
          <Pressable onPress={() => setLogoutConfirmVisible(false)} style={[styles.sheetGhostButtonMake, webPressableReset]}>
            <Text style={styles.sheetGhostButtonTextMake}>取消</Text>
          </Pressable>
        </View>
      </BottomSheet>
    );
  }

  function renderPetDeleteConfirmSheet() {
    const pet = petDeleteConfirm;
    const deleting = pet ? petDeletingId === pet.id : false;
    return (
      <BottomSheet contentStyle={styles.petDeleteSheetMake} dismissDisabled={deleting} onClose={() => setPetDeleteConfirm(null)} visible={Boolean(pet)}>
        {pet ? (
          <>
            <View style={styles.petDeletePreviewMake}>
              <PetAvatar size={44} uri={pet.avatarUrl ?? generatedGoldenAvatarUri} />
              <View style={styles.flex}>
                <Text style={styles.petDeletePreviewNameMake}>{pet.name}</Text>
                <Text style={styles.petDeletePreviewMetaMake}>{pet.breed || speciesLabels[pet.species]} · {formatPetAge(pet.birthday)} · {formatWeightKg(pet.weightKg)}</Text>
              </View>
              <Trash2 color={palette.danger} size={18} strokeWidth={2.4} />
            </View>
            <Text style={styles.petDeleteTitleMake}>确定要移除{pet.name}吗？</Text>
            <Text style={styles.petDeleteBodyMake}>移除后，{pet.name}的健康记录、AI 灵伴记忆和社交资料将被永久删除，且无法恢复。</Text>
            <View style={styles.petDeleteTipMake}>
              <AlertTriangle color={palette.orange} size={14} strokeWidth={2.4} />
              <Text style={styles.petDeleteTipTextMake}>如果只是暂时不想看到，可以选择切换为其它宠物，记录会一直保留。</Text>
            </View>
            <View style={styles.petDeleteActionsMake}>
              <Pressable disabled={deleting} onPress={() => void deletePet(pet)} style={[styles.sheetDangerButtonMake, deleting && styles.aiCtaDisabled, webPressableReset]}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : null}
                <Text style={styles.sheetDangerButtonTextMake}>确认移除</Text>
              </Pressable>
              <Pressable disabled={deleting} onPress={() => setPetDeleteConfirm(null)} style={[styles.sheetGhostButtonMake, webPressableReset]}>
                <Text style={styles.sheetGhostButtonTextMake}>再想想</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </BottomSheet>
    );
  }

  function renderMemoDeleteConfirm() {
    const memo = selectedMemo;
    return (
      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!memoDeleting) setMemoDeleteConfirmVisible(false);
        }}
        transparent
        visible={memoDeleteConfirmVisible && Boolean(memo)}
      >
        <View style={styles.memoDeleteBackdropMake}>
          {memo ? (
            <View style={styles.memoDeleteDialogMake}>
              <View style={styles.memoDeleteIconMake}>
                <Trash2 color={palette.danger} size={22} strokeWidth={2.4} />
              </View>
              <Text style={styles.memoDeleteTitleMake}>删除这条备忘？</Text>
              <Text style={styles.memoDeleteBodyMake}>
                「{memo.title}」将从{getCurrentPet()?.name ?? '灵伴'}的健康备忘中移除，删除后不可恢复
              </Text>
              <View style={styles.memoDeleteActionsMake}>
                <Pressable disabled={memoDeleting} onPress={() => setMemoDeleteConfirmVisible(false)} style={[styles.memoDeleteCancelMake, webPressableReset]}>
                  <Text style={styles.memoDeleteCancelTextMake}>取消</Text>
                </Pressable>
                <Pressable disabled={memoDeleting} onPress={() => void deleteSelectedMemo()} style={[styles.memoDeleteDangerMake, memoDeleting && styles.aiCtaDisabled, webPressableReset]}>
                  {memoDeleting ? <ActivityIndicator color="#fff" size="small" /> : null}
                  <Text style={styles.memoDeleteDangerTextMake}>确认删除</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    );
  }

  function renderWeightDeleteConfirm() {
    const record = weightDeleteConfirm;
    const deleting = Boolean(record && weightEditSaving);
    return (
      <Modal animationType="fade" onRequestClose={() => !deleting && setWeightDeleteConfirm(null)} transparent visible={Boolean(record)}>
        <View style={styles.weightDeleteBackdropMake}>
          {record ? (
            <View style={styles.weightDeleteDialogMake}>
              <View style={styles.weightDeleteIconMake}>
                <Trash2 color={palette.danger} size={22} strokeWidth={2.4} />
              </View>
              <Text style={styles.weightDeleteTitleMake}>删除这条体重记录？</Text>
              <View style={styles.weightDeletePreviewMake}>
                <View style={styles.weightDeletePreviewIconMake}>
                  <Weight color={palette.teal} size={13} strokeWidth={2.5} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.weightDeletePreviewKgMake}>{formatWeightKg(record.kg)}</Text>
                  <Text style={styles.weightDeletePreviewMetaMake}>{formatOptionalDateLabel(record.recordedAt)} · {record.note || '手动记录'}</Text>
                </View>
              </View>
              <Text style={styles.weightDeleteBodyMake}>删除后这条记录无法恢复，{getCurrentPet()?.name ?? '灵伴'}的体重趋势将重新计算。</Text>
              <View style={styles.weightDeleteActionsMake}>
                <Pressable disabled={deleting} onPress={() => setWeightDeleteConfirm(null)} style={[styles.weightDeleteCancelMake, webPressableReset]}>
                  <Text style={styles.weightDeleteCancelTextMake}>取消</Text>
                </Pressable>
                <Pressable disabled={deleting} onPress={() => void deleteWeightRecord(record)} style={[styles.weightDeleteSubmitMake, deleting && styles.aiCtaDisabled, webPressableReset]}>
                  {deleting ? <ActivityIndicator color="#fff" size="small" /> : null}
                  <Text style={styles.weightDeleteSubmitTextMake}>确认删除</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    );
  }

  function renderScreen() {
    if (sessionBootstrapping) return renderSessionBootstrapping();
    if (loginSuccessLoading) return renderLoginSuccessLoading();
    if (session && !getCurrentPet() && petRequiredRoutes.has(route)) return renderEmptyPet();

    switch (route) {
      case 'accountSecurity':
        return renderAccountSecurity();
      case 'addPlaceReview':
        return renderAddPlaceReview();
      case 'aiResult':
        return renderAiResult();
      case 'chat':
        return renderChat();
      case 'conversation':
        return renderConversation();
      case 'dailyPost':
        return renderDailyPost();
      case 'discover':
        return renderDiscover();
      case 'editPet':
      case 'petInfo':
        return renderPetInfo();
      case 'emptyPet':
        return renderEmptyPet();
      case 'generating':
        return renderGenerating();
      case 'greetingRequests':
        return renderGreetingRequests();
      case 'health':
        return renderHealth();
      case 'healthCalendar':
        return renderHealthCalendar();
      case 'healthMemos':
        return renderHealthMemos();
      case 'memoEdit':
        return renderMemoEdit();
      case 'memoNew':
        return renderMemoNew();
      case 'home':
        return renderHome();
      case 'login':
        return renderLogin();
      case 'map':
        return renderMap();
      case 'messages':
        return renderMessages();
      case 'multiPet':
        return renderMultiPet();
      case 'notifications':
        return renderNotifications();
      case 'otp':
        return renderOtp();
      case 'ownerEdit':
        return renderOwnerEdit();
      case 'permissions':
        return renderPermissions();
      case 'petDetail':
        return renderPetDetail();
      case 'placeDetail':
        return renderPlaceDetail();
      case 'profile':
        return renderProfile();
      case 'safety':
        return renderSafety();
      case 'settings':
        return renderSettings();
      case 'upload':
        return renderUpload();
      case 'uploadDetail':
        return renderUploadDetail();
      case 'uploadNoPet':
        return renderUploadNoPet();
      case 'vaccine':
        return renderVaccine();
      case 'walkInvite':
        return renderWalkInvite();
      case 'weight':
        return renderWeight();
      default:
        return renderHome();
    }
  }

  const tabUnreadCount = Math.min(
    99,
    conversations.reduce((sum, conversation) => sum + (conversation.unread ?? 0), 0) + notifications.filter((item) => !item.read).length,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} keyboardVerticalOffset={0} style={styles.appWrap}>
        <View style={[styles.phoneFrame, nativeTopInset ? { paddingTop: nativeTopInset } : null]}>
          {renderScreen()}
          {showBottomTabs ? (
            <View style={styles.tabBar}>
              {tabItems.map(({ Icon, ...item }) => {
                const selected = currentTab === item.route;
                const showBadge = item.route === 'messages' && tabUnreadCount > 0;
                return (
                  <Pressable key={item.route} onPress={() => resetTo(item.route)} style={[styles.tabItem, webPressableReset]}>
                    {showBadge ? <Text style={styles.tabUnreadBadge}>{tabUnreadCount > 9 ? '9+' : tabUnreadCount}</Text> : null}
                    <Icon color={selected ? palette.orange : palette.muted} size={20} strokeWidth={selected ? 2.4 : 2} />
                    <Text style={[styles.tabText, selected && styles.tabTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <Toast icon={toast?.icon} iconTone={toast?.iconTone} layout={toast?.layout} message={toast?.message} placement={toast?.placement} subtitle={toast?.subtitle} tone={toast?.tone} variant={toast?.variant} />
          {datePickerRequest && Platform.OS !== 'web' ? (
            Platform.OS === 'ios' ? (
              <Modal animationType="fade" transparent visible>
                <View style={styles.datePickerBackdrop}>
                  <View style={styles.datePickerSheet}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sheetTitle}>{datePickerRequest.title}</Text>
                      <Pressable onPress={closeDatePicker} style={webPressableReset}>
                        <X color={palette.muted} size={18} strokeWidth={2.3} />
                      </Pressable>
                    </View>
                    <DateTimePicker
                      display="spinner"
                      locale="zh-CN"
                      maximumDate={datePickerRequest.maximumDate}
                      minimumDate={datePickerRequest.minimumDate}
                      mode={datePickerRequest.mode}
                      onChange={handleNativeDatePickerChange}
                      themeVariant="light"
                      value={datePickerRequest.value}
                    />
                    <View style={styles.datePickerActionRow}>
                      <Pressable onPress={closeDatePicker} style={[styles.datePickerCancelButton, webPressableReset]}>
                        <Text style={styles.datePickerCancelText}>取消</Text>
                      </Pressable>
                      <Pressable onPress={commitIosDatePicker} style={[styles.datePickerConfirmButton, webPressableReset]}>
                        <Text style={styles.datePickerConfirmText}>确定</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                display={datePickerRequest.mode === 'date' ? 'calendar' : 'clock'}
                maximumDate={datePickerRequest.maximumDate}
                minimumDate={datePickerRequest.minimumDate}
                mode={datePickerRequest.mode}
                onChange={handleNativeDatePickerChange}
                positiveButton={{ label: '确定', textColor: palette.orange }}
                negativeButton={{ label: '取消' }}
                value={datePickerRequest.value}
              />
            )
          ) : null}
          {renderGreetingSheet()}
          {renderAmapNavigationConfirm()}
          {renderLogoutConfirmSheet()}
          {renderPetDeleteConfirmSheet()}
          {renderMemoDeleteConfirm()}
          {renderWeightDeleteConfirm()}
          <ConfirmDialog
            body={confirm?.body ?? ''}
            confirmText={confirm?.confirmText}
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              const action = confirm?.onConfirm;
              setConfirm(null);
              action?.();
            }}
            title={confirm?.title ?? ''}
            visible={Boolean(confirm)}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WeightTrendMiniChart({ abnormal, records }: { abnormal?: boolean; records: WeightRecord[] }) {
  const values = records.slice(0, 12).reverse().map((item) => item.kg).filter((value) => Number.isFinite(Number(value)));
  const width = 320;
  const height = 128;
  const pad = { bottom: 22, left: 10, right: 10, top: 16 };
  if (!values.length) {
    return (
      <View style={[styles.weightChartWrap, styles.weightChartEmptyMake]}>
        <Text style={styles.weightChartEmptyText}>暂无体重曲线，记录第一次体重后生成</Text>
      </View>
    );
  }
  const minValue = Math.min(...values, 24);
  const maxValue = Math.max(...values, 28);
  const range = Math.max(1, maxValue - minValue);
  const scaleX = (index: number) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(1, values.length - 1);
  const scaleY = (value: number) => pad.top + (1 - (value - minValue) / range) * (height - pad.top - pad.bottom);
  const path = values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(index)} ${scaleY(value)}`).join(' ');
  const areaPath = `${path} L ${scaleX(values.length - 1)} ${height - pad.bottom} L ${scaleX(0)} ${height - pad.bottom} Z`;
  const lineColor = abnormal ? '#C99B3E' : palette.teal;
  const bandTop = height * 0.28;
  const bandHeight = height * 0.34;

  return (
    <View style={styles.weightChartWrap}>
      <Svg height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
        <Rect fill="#E8F5F3" height={bandHeight} opacity={0.58} rx={8} width={width - pad.left - pad.right} x={pad.left} y={bandTop} />
        <SvgText fill={palette.teal} fontSize="9" fontWeight="700" textAnchor="end" x={width - pad.right} y={bandTop + 14}>
          健康观察区间
        </SvgText>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <Line key={ratio} stroke="#F0EBE0" strokeDasharray="2 4" strokeWidth={1} x1={pad.left} x2={width - pad.right} y1={height * ratio} y2={height * ratio} />
        ))}
        <Path d={areaPath} fill={lineColor} opacity={0.12} />
        <Path d={path} fill="none" stroke={lineColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} />
        <Circle cx={scaleX(values.length - 1)} cy={scaleY(values[values.length - 1])} fill="#fff" r={5} stroke={lineColor} strokeWidth={2.5} />
        {[0, Math.floor((values.length - 1) / 3), Math.floor(((values.length - 1) * 2) / 3), values.length - 1].map((index) => (
          <SvgText key={index} fill={palette.muted} fontSize="9" fontWeight="600" textAnchor="middle" x={scaleX(index)} y={height - 5}>
            {index === values.length - 1 ? '今天' : `${Math.max(1, values.length - index)}次前`}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function PhoneStatusBar() {
  return (
    <View style={styles.phoneStatusBar}>
      <Text style={styles.phoneStatusTime}>9:41</Text>
      <View style={styles.phoneStatusIcons}>
        <Signal color={palette.ink} size={18} strokeWidth={2.6} />
        <Wifi color={palette.ink} size={16} strokeWidth={2.6} />
        <BatteryFull color={palette.ink} size={22} strokeWidth={2.4} />
      </View>
    </View>
  );
}

function InlineErrorMake({ style, text }: { style?: ViewStyle; text: string }) {
  return (
    <View style={[styles.inlineErrorRow, style]}>
      <AlertCircle color={palette.danger} size={14} strokeWidth={2.2} />
      <Text style={styles.inlineErrorText}>{text}</Text>
    </View>
  );
}

function DateValueButton({
  disabled,
  onPress,
  placeholder = '选择日期',
  style,
  textStyle,
  value,
}: {
  disabled?: boolean;
  onPress: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  value?: string;
}) {
  const hasValue = Boolean(value);
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.dateValueButton, style, disabled && styles.opacity60, webPressableReset]}>
      <Text numberOfLines={1} style={[styles.dateValueText, textStyle, !hasValue && styles.dateValuePlaceholder]}>{hasValue ? value : placeholder}</Text>
      <CalendarDays color={hasValue ? palette.orange : palette.muted} size={15} strokeWidth={2.4} />
    </Pressable>
  );
}

function PetInfoMakeField({
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  suffix,
  value,
}: {
  keyboardType?: KeyboardTypeOptions;
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  value: string;
}) {
  return (
    <View style={styles.petInfoFieldMake}>
      <Text style={styles.petInfoFieldLabelMake}>{label}</Text>
      <View style={styles.petInfoInputShellMake}>
        <TextInput
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B8B5AC"
          style={[styles.petInfoInputTextMake, webTextInputReset]}
          value={value}
        />
        {suffix ? <Text style={styles.petInfoInputSuffixMake}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function Mascot({ size = 96 }: { size?: number }) {
  return (
    <View style={[styles.mascot, { borderRadius: size / 2, height: size, width: size }]}>
      <PawPrint color="#8a5226" size={Math.max(30, size * 0.38)} strokeWidth={2.4} />
    </View>
  );
}

function PetAvatar({ size = 96, uri }: { size?: number; uri?: null | string }) {
  const remoteUri = uri && !isGeneratedAvatarUri(uri) ? uri : null;
  const [loading, setLoading] = useState(Boolean(remoteUri && !loadedRemoteAvatarUris.has(remoteUri)));

  useEffect(() => {
    setLoading(Boolean(remoteUri && !loadedRemoteAvatarUris.has(remoteUri)));
  }, [remoteUri]);

  return (
    <View style={[styles.petAvatar, { borderRadius: size / 2, height: size, width: size }]}>
      {remoteUri ? (
        <View style={styles.avatarPlaceholder}>
          <PawPrint color="#8a5226" size={Math.max(18, size * 0.34)} strokeWidth={2.4} />
        </View>
      ) : null}
      <Image
        onError={() => setLoading(false)}
        onLoadEnd={() => {
          if (remoteUri) loadedRemoteAvatarUris.add(remoteUri);
          setLoading(false);
        }}
        onLoadStart={() => {
          if (remoteUri && !loadedRemoteAvatarUris.has(remoteUri)) setLoading(true);
        }}
        resizeMode="cover"
        source={remoteUri ? { uri: remoteUri } : generatedGoldenAvatarSource}
        style={[styles.avatarImage, remoteUri && styles.avatarImageRemote]}
      />
      {loading ? (
        <View pointerEvents="none" style={styles.avatarLoadingOverlay}>
          <SkeletonLine borderRadius={size / 2} height={size} style={styles.avatarLoadingSkeleton} width={size} />
          <View style={styles.avatarLoadingSpinner}>
            <ActivityIndicator color={palette.orange} size="small" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MetricCard({
  Icon,
  iconTone,
  label,
  onPress,
  tag,
  tagTone = 'orange',
  value,
}: {
  Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  iconTone?: 'orange' | 'teal';
  label: string;
  onPress: () => void;
  tag?: string;
  tagTone?: 'orange' | 'teal' | 'muted';
  value: string;
}) {
  const tagPalette = tagTone === 'teal'
    ? { bg: 'rgba(77,182,172,0.14)', color: palette.teal }
    : tagTone === 'muted'
      ? { bg: 'rgba(122,121,114,0.12)', color: palette.muted }
      : { bg: 'rgba(255,138,92,0.12)', color: palette.orange };
  const resolvedIconTone = iconTone ?? (tagTone === 'teal' ? 'teal' : 'orange');
  const iconPalette = resolvedIconTone === 'teal'
    ? { bg: 'rgba(77,182,172,0.18)', color: palette.teal }
    : { bg: 'rgba(255,138,92,0.15)', color: palette.orange };
  return (
    <Pressable onPress={onPress} style={[styles.metricCard, webPressableReset]}>
      <View style={styles.metricTopRow}>
        <View style={[styles.metricIcon, { backgroundColor: iconPalette.bg }]}>
          <Icon color={iconPalette.color} size={18} strokeWidth={2.4} />
        </View>
        {tag ? <Text numberOfLines={1} style={[styles.metricTag, { backgroundColor: tagPalette.bg, color: tagPalette.color }]}>{tag}</Text> : null}
      </View>
      <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
    </Pressable>
  );
}

function ListRow({ left, right, subtitle }: { left: string; right?: string; subtitle?: string }) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={uiStyles.cardTitle}>{left}</Text>
        {right ? <Text style={styles.metaText}>{right}</Text> : null}
      </View>
      {subtitle ? <Text style={uiStyles.body}>{subtitle}</Text> : null}
    </Card>
  );
}

function PlaceRow({ onPress, place }: { onPress: () => void; place: Place }) {
  return (
    <Pressable onPress={onPress} style={styles.placeRow}>
      <View style={styles.roundIcon}>
        <MapPin color="#fff" size={18} strokeWidth={2.4} />
      </View>
      <View style={styles.flex}>
        <Text style={uiStyles.cardTitle}>{place.name}</Text>
        <Text style={uiStyles.body}>{place.address} · {place.distance}</Text>
      </View>
      <View style={styles.ratingPill}>
        {hasPlaceRating(place) ? <Star color={palette.orange} fill={palette.orange} size={13} strokeWidth={2} /> : null}
        <Text style={styles.ratingText}>{getPlaceRatingLabel(place)}</Text>
      </View>
    </Pressable>
  );
}

function getPlaceVisualUrl(place: Place) {
  const photoUrl = place.coverImageUrl || place.photoUrls?.find((url) => /^https?:\/\//i.test(url));
  if (photoUrl) return photoUrl;
  if (place.category === 'park') return placeParkPhotoUrl;
  if (place.category === 'cafe') return placeCafePhotoUrl;
  if (place.category === 'shop') return placeReviewPhotoUrls[1] ?? placeCafePhotoUrl;
  if (place.category === 'clinic') return placeVetPhotoUrl;
  return placeReviewPhotoUrls[0] ?? placeParkPhotoUrl;
}

function hasPlaceRating(place: Place) {
  return Number.isFinite(Number(place.rating)) && Number(place.rating) > 0;
}

function getPlaceRatingLabel(place: Place) {
  return hasPlaceRating(place) ? Number(place.rating).toFixed(1).replace(/\.0$/, '') : '待评';
}

function getPlacePhotoBadgeText(place: Place) {
  const photoCount = Array.isArray(place.photoUrls) ? place.photoUrls.filter((url) => /^https?:\/\//i.test(url)).length : 0;
  if (photoCount > 0) return `${photoCount} 张图片`;
  if (place.coverImageUrl) return 'POI图片';
  return '示意图';
}

function getPlaceOpeningText(place: Place) {
  return place.openingHoursToday || place.openingHoursWeek || '营业时间待补充';
}

function getPlacePhoneText(place: Place) {
  return place.phone || '联系电话待补充';
}

function getPlaceCategoryLabel(place: Place) {
  if (place.category === 'park') return '公园';
  if (place.category === 'cafe') return '咖啡店';
  if (place.category === 'shop') return '宠物店';
  if (place.category === 'clinic') return '宠物医院';
  return '宠物友好地点';
}

function getPlaceFilterChipLabel(category: 'all' | Place['category']) {
  if (category === 'park') return '🌳 公园';
  if (category === 'cafe') return '☕ 咖啡店';
  if (category === 'shop') return '🛍️ 宠物店';
  if (category === 'clinic') return '🏥 医院';
  return '全部';
}

function PlaceSheetRow({ active, onPress, place }: { active?: boolean; onPress: () => void; place: Place; rank: number }) {
  return (
    <Pressable onPress={onPress} style={[styles.placeSheetRow, active && styles.placeSheetRowActive]}>
      <View style={styles.placeSheetPhotoMake}>
        <Image resizeMode="cover" source={{ uri: getPlaceVisualUrl(place) }} style={styles.avatarImage} />
        <View style={styles.placeSheetRatingBadgeMake}>
          {hasPlaceRating(place) ? <Star color="#FFB94B" fill="#FFB94B" size={8} strokeWidth={0} /> : null}
          <Text style={styles.placeSheetRatingTextMake}>{getPlaceRatingLabel(place)}</Text>
        </View>
      </View>
      <View style={styles.flex}>
        <View style={styles.placeSheetTitleRowMake}>
          <Text numberOfLines={1} style={styles.placeSheetTitle}>{place.name}</Text>
          <View style={styles.placeSheetDistancePillMake}>
            <Navigation color={palette.teal} size={9} strokeWidth={2.5} />
            <Text style={styles.placeSheetDistanceTextMake}>{place.distance}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.placeSheetMeta}>{getPlaceCategoryLabel(place)} · {place.address}</Text>
        <View style={styles.placeSheetTags}>
          {place.tags.slice(0, 2).map((tag) => (
            <Text key={tag} style={styles.placeSheetTag}>{tag}</Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function PlaceSubmitStep({ active, done, text, time }: { active?: boolean; done?: boolean; text: string; time: string }) {
  const color = done ? palette.teal : active ? palette.orange : palette.muted;
  return (
    <View style={styles.placeSubmitStepMake}>
      <View style={[styles.placeSubmitStepDotMake, done && styles.placeSubmitStepDotDoneMake, active && styles.placeSubmitStepDotActiveMake]}>
        {done ? (
          <Check color={color} size={13} strokeWidth={3} />
        ) : active ? (
          <View style={[styles.placeSubmitStepDotInnerMake, { backgroundColor: color }]} />
        ) : (
          <View style={[styles.placeSubmitStepDotTinyMake, { backgroundColor: color }]} />
        )}
      </View>
      <View style={styles.flex}>
        <Text style={[styles.placeSubmitStepTitleMake, (done || active) && styles.placeSubmitStepTitleActiveMake]}>{text}</Text>
        <Text style={styles.placeSubmitStepTimeMake}>{time}</Text>
      </View>
    </View>
  );
}

function MenuRow({
  Icon,
  onPress,
  title,
  value,
}: {
  Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  onPress: () => void;
  title: string;
  value?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuIcon}>
        <Icon color={palette.orange} size={18} strokeWidth={2.4} />
      </View>
      <Text style={styles.menuTitle}>{title}</Text>
      {value ? <Text style={styles.metaText}>{value}</Text> : null}
      <ChevronRight color={palette.muted} size={17} strokeWidth={2.3} />
    </Pressable>
  );
}

function ProfileMakeRow({
  Icon,
  iconBg = palette.orangeSoft,
  iconColor = palette.orange,
  last,
  onPress,
  right,
  title,
  value,
}: {
  Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  iconBg?: string;
  iconColor?: string;
  last?: boolean;
  onPress?: () => void;
  right?: ReactNode;
  title: string;
  value?: string;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.profileMakeRow, last && styles.profileMakeRowLast, !onPress && styles.profileMakeRowStatic]}>
      <View style={[styles.profileMakeRowIcon, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={16} strokeWidth={2.4} />
      </View>
      <Text numberOfLines={1} style={styles.profileMakeRowTitle}>
        {title}
      </Text>
      {right ?? (value ? (
        <Text numberOfLines={1} style={styles.profileMakeRowValue}>
          {value}
        </Text>
      ) : null)}
      {onPress ? <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

function SettingsMakeSection({ children, footnote, title }: { children: ReactNode; footnote?: string; title?: string }) {
  return (
    <View style={styles.settingsMakeSection}>
      {title ? <Text style={styles.settingsMakeSectionTitle}>{title}</Text> : null}
      <View style={styles.settingsMakeCard}>{children}</View>
      {footnote ? <Text style={styles.settingsMakeFootnote}>{footnote}</Text> : null}
    </View>
  );
}

function SettingsMakeRow({
  Icon,
  danger,
  iconBg = palette.pale,
  iconColor = palette.ink,
  last,
  onPress,
  right,
  sub,
  title,
  value,
}: {
  Icon?: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  danger?: boolean;
  iconBg?: string;
  iconColor?: string;
  last?: boolean;
  onPress?: () => void;
  right?: ReactNode;
  sub?: string;
  title: string;
  value?: string;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.settingsMakeRow, last && styles.settingsMakeRowLast]}>
      {Icon ? (
        <View style={[styles.settingsMakeRowIcon, { backgroundColor: iconBg }]}>
          <Icon color={iconColor} size={15} strokeWidth={2.4} />
        </View>
      ) : null}
      <View style={styles.settingsMakeRowText}>
        <Text numberOfLines={1} style={[styles.settingsMakeRowTitle, danger && styles.settingsMakeRowTitleDanger]}>
          {title}
        </Text>
        {sub ? <Text numberOfLines={1} style={styles.settingsMakeRowSub}>{sub}</Text> : null}
      </View>
      {value ? <Text numberOfLines={1} style={styles.settingsMakeRowValue}>{value}</Text> : null}
      {right !== undefined ? right : <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} />}
    </Pressable>
  );
}

function SettingsMakeToggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.settingsMakeToggleTrack, on && styles.settingsMakeToggleTrackOn]}>
      <View style={[styles.settingsMakeToggleThumb, on && styles.settingsMakeToggleThumbOn]} />
    </View>
  );
}

function UploadMakeButton({ children, loading, onPress, tone = 'solid' }: { children: string; loading?: boolean; onPress: () => void; tone?: 'ghost' | 'solid' }) {
  const solid = tone === 'solid';
  return (
    <Pressable disabled={loading} onPress={onPress} style={[styles.uploadMakeButton, solid ? styles.uploadMakeButtonSolid : styles.uploadMakeButtonGhost, loading && styles.opacity60, webPressableReset]}>
      {loading ? (
        <ActivityIndicator color={solid ? '#fff' : palette.ink} size="small" />
      ) : (
        <Camera color={solid ? '#fff' : palette.ink} size={16} strokeWidth={2.4} />
      )}
      <Text style={[styles.uploadMakeButtonText, solid && styles.uploadMakeButtonTextSolid]}>{loading ? '处理中…' : children}</Text>
    </Pressable>
  );
}

function MakeDetailRow({ inset, label, value, valueAlign = 'left' }: { inset?: boolean; label: string; value: string; valueAlign?: 'left' | 'right' }) {
  return (
    <View style={[styles.makeDetailRow, inset && styles.makeDetailRowInset]}>
      <Text numberOfLines={1} style={styles.makeDetailLabel}>
        {label}
      </Text>
      <Text numberOfLines={2} style={[styles.makeDetailValue, valueAlign === 'right' && styles.makeDetailValueRight]}>
        {value}
      </Text>
    </View>
  );
}

function PetDetailInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.petDetailInfoRowMake}>
      <Text numberOfLines={1} style={styles.petDetailInfoLabelMake}>
        {label}
      </Text>
      <Text numberOfLines={2} style={styles.petDetailInfoValueMake}>
        {value}
      </Text>
    </View>
  );
}

function MakeStepRow({ active, done, text }: { active?: boolean; done?: boolean; text: string }) {
  return (
    <View style={styles.makeStepRow}>
      <View style={[styles.makeStepDot, done && styles.makeStepDotDone, active && styles.makeStepDotActive]}>
        {done ? <Check color={palette.teal} size={12} strokeWidth={3} /> : <View style={[styles.makeStepInnerDot, active && styles.makeStepInnerDotActive]} />}
      </View>
      <Text style={[styles.makeStepText, !done && !active && styles.makeStepTextMuted]}>{text}</Text>
    </View>
  );
}

function HealthCalendarPetCard({ note, pet }: { note: string; pet?: null | PetProfile }) {
  const speciesLabel = pet?.breed || speciesLabels[pet?.species ?? 'dog'] || '宠物';
  return (
    <View style={styles.calendarPetCard}>
      <PetAvatar size={44} uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} />
      <View style={styles.calendarPetCopy}>
        <View style={styles.calendarPetTitleRow}>
          <Text numberOfLines={1} style={styles.calendarPetName}>{pet?.name ?? '灵伴'}</Text>
          <Text numberOfLines={1} style={styles.calendarPetTag}>♥ {speciesLabel}</Text>
        </View>
        <Text numberOfLines={1} style={styles.calendarPetNote}>{note}</Text>
      </View>
    </View>
  );
}

function HealthMakeRow({
  Icon,
  badge,
  badgeTone,
  chart,
  onPress,
  subtitle,
  title,
  tone,
}: {
  Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  badge: string;
  badgeTone?: 'cool' | 'muted' | 'warm';
  chart?: boolean;
  onPress: () => void;
  subtitle: string;
  title: string;
  tone: 'cool' | 'warm';
}) {
  const isCool = tone === 'cool';
  const resolvedBadgeTone = badgeTone ?? tone;
  return (
    <Pressable onPress={onPress} style={styles.healthMakeRow}>
      <View style={styles.healthMakeRowTop}>
        <View style={[styles.healthMakeIcon, isCool && styles.healthMakeIconCool]}>
          <Icon color={isCool ? palette.teal : palette.orange} size={17} strokeWidth={2.5} />
        </View>
        <View style={styles.flex}>
          <View style={styles.rowBetween}>
            <Text style={styles.healthMakeTitle}>{title}</Text>
            <Text style={[
              styles.healthMakeBadge,
              resolvedBadgeTone === 'cool' && styles.healthMakeBadgeCool,
              resolvedBadgeTone === 'muted' && styles.healthMakeBadgeMuted,
            ]}>{badge}</Text>
          </View>
          <Text style={styles.healthMakeSub}>{subtitle}</Text>
        </View>
        <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} />
      </View>
      {chart ? <HealthMiniChart /> : null}
    </Pressable>
  );
}

function HealthMiniChart() {
  const values = [22, 18, 26, 22, 28, 24, 18, 22, 16, 14, 20, 18, 12];
  const width = 320;
  const height = 56;
  const max = 30;
  const stepX = width / Math.max(1, values.length - 1);
  const points = values.map((value, index) => {
    const x = index * stepX;
    const y = height - (value / max) * height;
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1] ?? { x: width, y: height / 2 };
  return (
    <View style={styles.healthMiniChartWrap}>
      <Svg height={56} viewBox={`0 0 ${width} ${height}`} width="100%">
        <Path d={areaPath} fill="rgba(255,138,92,0.14)" />
        <Path d={path} fill="none" stroke={palette.orange} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} />
        <Circle cx={last.x} cy={last.y} fill="#fff" r={4} stroke={palette.orange} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', gap: 12 },
  accountSecurityHeroIconMake: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, height: 40, justifyContent: 'center', width: 40 },
  accountSecurityHeroMake: { alignItems: 'center', backgroundColor: '#E8F5F3', borderRadius: 16, flexDirection: 'row', gap: 12, marginBottom: 18, marginHorizontal: 16, marginTop: 8, padding: 14 },
  accountSecurityHeroSubMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, lineHeight: 17, marginTop: 2 },
  accountSecurityHeroTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  addPlaceBgGlowMake: { backgroundColor: 'rgba(255,217,182,0.48)', borderRadius: 220, height: 240, left: -70, position: 'absolute', right: -70, top: -120 },
  addPlaceChipRowMake: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addPlaceCustomTagButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 14, flexDirection: 'row', gap: 4, height: 38, justifyContent: 'center', paddingHorizontal: 13, shadowColor: palette.orange, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.18, shadowRadius: 16 },
  addPlaceCustomTagButtonTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  addPlaceCustomTagInputMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', minHeight: 38, paddingHorizontal: 0, paddingVertical: 0 },
  addPlaceCustomTagRowMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 10, minHeight: 46, paddingHorizontal: 12, paddingVertical: 4 },
  addPlaceDividerMake: { backgroundColor: palette.border, height: 1, marginLeft: 52 },
  addPlaceFieldLabelMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500', lineHeight: 17, marginBottom: 8, marginTop: 16 },
  addPlaceHeaderMake: { alignItems: 'center', flexDirection: 'row', height: 50, justifyContent: 'space-between', marginBottom: 4 },
  addPlaceHeaderPublishMake: { alignItems: 'center', height: 36, justifyContent: 'center', minWidth: 44 },
  addPlaceHeaderPublishTextMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  addPlaceHeaderTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  addPlaceHero: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 22, flexDirection: 'row', gap: 13, paddingHorizontal: 18, paddingVertical: 18, shadowColor: '#8b5e3c', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.16, shadowRadius: 30 },
  addPlaceHeroSub: { color: 'rgba(255,255,255,0.88)', flex: 1, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  addPlaceHeroTitle: { color: '#fff', fontFamily: appFontFamily, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  addPlaceInputCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  addPlaceInputIconMake: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 12, height: 36, justifyContent: 'center', width: 36 },
  addPlaceInputRowMake: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 58, paddingHorizontal: 12 },
  addPlaceLineInputMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '600', minHeight: 44, padding: 0 },
  addPlaceNoticeMake: { alignItems: 'flex-start', backgroundColor: 'rgba(77,182,172,0.10)', borderColor: 'rgba(77,182,172,0.22)', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10 },
  addPlaceNoticeTextMake: { color: palette.teal, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 18 },
  addPlacePageMake: { flex: 1, marginHorizontal: -20, marginTop: -18, minHeight: 720, overflow: 'hidden', paddingHorizontal: 20, paddingTop: 0, position: 'relative' },
  addPlacePhotoAddMake: { alignItems: 'center', aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.68)', borderColor: palette.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1.5, flex: 1, gap: 4, justifyContent: 'center' },
  addPlacePhotoAddTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '600' },
  addPlacePhotoPlaceholderMake: { alignItems: 'center', aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.38)', borderColor: 'rgba(122,121,114,0.14)', borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, flex: 1, justifyContent: 'center' },
  addPlacePhotoRowMake: { flexDirection: 'row', gap: 8 },
  addPlacePhotoSquareMake: { aspectRatio: 1, borderColor: '#fff', borderRadius: 14, borderWidth: 2, flex: 1, overflow: 'hidden' },
  addPlacePlaceCardMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  addPlacePlaceMetaMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, lineHeight: 16, marginTop: 2 },
  addPlacePlaceNameMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  addPlacePlaceThumbMake: { borderRadius: 14, height: 48, width: 48 },
  addPlaceRatingCardMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', paddingVertical: 16 },
  addPlaceRatingTextMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 14, fontWeight: '800', marginLeft: 4 },
  addPlaceSelectChipActiveMake: { backgroundColor: 'rgba(255,138,92,0.12)', borderColor: palette.orange, borderWidth: 1.5 },
  addPlaceSelectChipMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 4, minHeight: 34, paddingHorizontal: 12, paddingVertical: 7 },
  addPlaceSelectChipTextActiveMake: { color: palette.orange, fontWeight: '700' },
  addPlaceSelectChipTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  addPlaceStarButtonMake: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  addPlaceSubmitButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 25, flexDirection: 'row', gap: 7, height: 50, justifyContent: 'center', marginTop: 18, shadowColor: palette.orange, shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.28, shadowRadius: 24 },
  addPlaceSubmitTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 15, fontWeight: '700' },
  addPlaceTextAreaMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, lineHeight: 22, minHeight: 104, paddingHorizontal: 14, paddingTop: 12 },
  amapConfirmActionsMake: { flexDirection: 'row', gap: 8, marginTop: 16 },
  amapConfirmAppLabelActiveMake: { color: palette.orange, fontWeight: '600' },
  amapConfirmAppLabelMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500', lineHeight: 17 },
  amapConfirmAppPickActiveMake: { backgroundColor: 'rgba(255,138,92,0.10)', borderColor: palette.orange, borderWidth: 1.5 },
  amapConfirmAppPickMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flex: 1, height: 56, justifyContent: 'center', position: 'relative' },
  amapConfirmAppRowMake: { flexDirection: 'row', gap: 8, marginTop: 12 },
  amapConfirmAppSubMake: { backgroundColor: '#fff', borderRadius: 6, color: palette.orange, fontFamily: appFontFamily, fontSize: 9.5, fontWeight: '700', marginTop: 2, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 1 },
  amapConfirmBackdropMake: { alignItems: 'center', backgroundColor: 'rgba(27,28,25,0.45)', flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  amapConfirmBodyMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  amapConfirmCancelMake: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 24, flex: 1, height: 48, justifyContent: 'center' },
  amapConfirmCancelTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '500' },
  amapConfirmEtaMake: { alignItems: 'center', flexDirection: 'row', flexShrink: 0, gap: 2 },
  amapConfirmEtaTextMake: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600' },
  amapConfirmIconMake: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#4CB251', borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 12, shadowColor: '#4CB251', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.32, shadowRadius: 24, width: 56 },
  amapConfirmModalMake: { backgroundColor: '#fff', borderRadius: 24, maxWidth: 320, paddingBottom: 18, paddingHorizontal: 20, paddingTop: 22, shadowColor: '#000', shadowOffset: { height: 30, width: 0 }, shadowOpacity: 0.26, shadowRadius: 60, width: '100%' },
  amapConfirmPlaceIconMake: { alignItems: 'center', backgroundColor: 'rgba(229,87,63,0.14)', borderRadius: 12, flexShrink: 0, height: 40, justifyContent: 'center', width: 40 },
  amapConfirmPlaceMake: { alignItems: 'center', backgroundColor: palette.background, borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10 },
  amapConfirmPlaceMetaMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, lineHeight: 15, marginTop: 2 },
  amapConfirmPlaceTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
  amapConfirmSubmitMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 24, flex: 1, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.26, shadowRadius: 24 },
  amapConfirmSubmitTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '600' },
  amapConfirmSupportTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 17, marginTop: 8, textAlign: 'center' },
  amapConfirmTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '700', letterSpacing: 0, lineHeight: 24, textAlign: 'center' },
  agreementRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, marginTop: 18 },
  agreementText: { color: palette.muted, flex: 1, fontFamily: appFontFamily, fontSize: 13, fontWeight: '500', lineHeight: 21 },
  agreementTextAttention: { color: palette.danger },
  appWrap: { alignItems: 'center', backgroundColor: '#e8e2d9', flex: 1, justifyContent: 'center' },
  avatarImage: { height: '100%', width: '100%' },
  avatarImageRemote: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  avatarLoadingOverlay: { alignItems: 'center', backgroundColor: 'rgba(251,247,241,0.58)', bottom: 0, justifyContent: 'center', left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0 },
  avatarLoadingSkeleton: { left: 0, opacity: 0.82, position: 'absolute', top: 0 },
  avatarLoadingSpinner: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  avatarPlaceholder: { alignItems: 'center', backgroundColor: '#f6dfbf', height: '100%', justifyContent: 'center', width: '100%' },
  bootPage: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', paddingHorizontal: 32 },
  bootText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  bottomAction: { gap: 10, marginTop: 20 },
  bottomTipCard: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.10)', borderColor: 'rgba(77,182,172,0.18)', borderRadius: 18, borderWidth: 1, bottom: 40, flexDirection: 'row', gap: 12, left: 20, paddingHorizontal: 16, paddingVertical: 14, position: 'absolute', right: 20 },
  bottomTipIcon: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.18)', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  bottomTipMuted: { color: palette.muted },
  bottomTipText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13, lineHeight: 20 },
  cardTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  centerStage: { alignItems: 'center', gap: 16, justifyContent: 'center', minHeight: 520, paddingHorizontal: 16 },
  chatBubble: { alignSelf: 'flex-start', backgroundColor: palette.card, borderRadius: 18, maxWidth: '84%', padding: 12 },
  chatBubbleColumn: { maxWidth: '82%' },
  chatBubbleMe: { alignSelf: 'flex-end', backgroundColor: palette.orange },
  chatAvatarDot: { backgroundColor: palette.teal, borderColor: '#fff', borderRadius: 6, borderWidth: 2, bottom: -1, height: 12, position: 'absolute', right: -1, width: 12 },
  chatAvatarDotOffline: { backgroundColor: palette.muted },
  chatAvatarWrap: { borderColor: '#fff', borderRadius: 19, borderWidth: 2, height: 38, overflow: 'visible', position: 'relative', shadowColor: '#50371e', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.18, shadowRadius: 10, width: 38 },
  chatAvatarWrapOffline: { opacity: 0.72, shadowOpacity: 0.08 },
  chatBackButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 26 },
  chatBackButtonMake: { alignItems: 'center', height: 40, justifyContent: 'center', marginLeft: -2, width: 24 },
  chatBottomDock: { backgroundColor: palette.background, paddingBottom: Platform.OS === 'web' ? 8 : 2, paddingTop: 8 },
  chatComposer: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 24, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 8, minHeight: 48, paddingHorizontal: 14, paddingVertical: 0, shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.08, shadowRadius: 20 },
  chatComposerRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 6 },
  chatDateChip: { alignSelf: 'center', backgroundColor: 'rgba(122,121,114,0.12)', borderRadius: 12, color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 4 },
  chatErrorBanner: { alignItems: 'center', backgroundColor: 'rgba(229,87,63,0.10)', borderColor: 'rgba(229,87,63,0.25)', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 9 },
  chatErrorBannerPet: { marginTop: 4, paddingVertical: 10 },
  chatErrorBannerAction: { alignItems: 'center', flexDirection: 'row', gap: 4, paddingHorizontal: 2, paddingVertical: 2 },
  chatErrorBannerActionText: { color: palette.danger, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  chatErrorBannerText: { color: palette.danger, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 16 },
  chatHeaderCopy: { flex: 1, minWidth: 0 },
  chatHeaderLeftMake: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12, minWidth: 0 },
  chatInput: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, minHeight: 40, paddingHorizontal: 2 },
  chatInputDisabled: { color: palette.muted },
  chatInviteActionsMake: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chatInviteBadgeMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, flexDirection: 'row', gap: 4, left: 10, paddingHorizontal: 8, paddingVertical: 3, position: 'absolute', top: 10 },
  chatInviteBadgeTextMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '800' },
  chatInviteBodyMake: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10 },
  chatInviteBubbleMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, maxWidth: 260, overflow: 'hidden', shadowColor: '#50371e', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.08, shadowRadius: 14, width: 240 },
  chatInviteBubbleMeMake: { borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  chatInviteHeroImageMake: { height: 96, width: '100%' },
  chatInviteHeroOverlayMake: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.52) 100%)' } as object) : null), backgroundColor: 'rgba(0,0,0,0.14)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  chatInviteNoteMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', lineHeight: 17, marginTop: 6 },
  chatInvitePlaceMake: { bottom: 8, color: '#fff', fontFamily: appFontFamily, fontSize: 13, fontWeight: '800', left: 10, lineHeight: 18, position: 'absolute', right: 10 },
  chatInvitePrimaryMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 15, flex: 1, height: 30, justifyContent: 'center' },
  chatInvitePrimaryTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  chatInviteSecondaryMake: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 15, flex: 1, height: 30, justifyContent: 'center' },
  chatInviteSecondaryTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  chatInviteTimeRowMake: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  chatInviteTimeTextMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  chatList: { gap: 10, minHeight: 520 },
  chatMakeBubble: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#50371e', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.06, shadowRadius: 14 },
  chatMakeBubbleMe: { backgroundColor: palette.orange, borderBottomLeftRadius: 18, borderBottomRightRadius: 4, borderColor: palette.orange, shadowColor: palette.orange, shadowOpacity: 0.18 },
  chatMakeBubbleRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  chatMakeBubbleRowMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  chatMakeHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, height: 56, marginHorizontal: -4 },
  chatMakeList: { gap: 10, paddingBottom: 14, paddingTop: 14 },
  chatMakeScroller: { flex: 1, marginHorizontal: -4, paddingHorizontal: 4 },
  chatMakeName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  chatMakeText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, lineHeight: 22 },
  chatMessageGroup: { gap: 8 },
  chatOfflineDotMake: { backgroundColor: palette.muted },
  chatOfflineMiniDot: { backgroundColor: palette.muted, borderRadius: 3, height: 6, width: 6 },
  chatOnlineTextMutedMake: { color: palette.muted },
  chatFeedbackChip: { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  chatFeedbackChipActive: { backgroundColor: palette.orangeSoft, borderColor: 'rgba(255,138,92,0.42)' },
  chatFeedbackRow: { flexDirection: 'row', gap: 6, marginLeft: 2, marginTop: 5 },
  chatFeedbackText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '700' },
  chatFeedbackTextActive: { color: palette.orange },
  chatOnlineRow: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 2 },
  chatOnlineText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  chatPageMake: { flex: 1, minHeight: 0 },
  chatQuotaHint: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '600', lineHeight: 15, marginTop: 4, textAlign: 'center' },
  chatRouteContent: { flex: 1, gap: 0, paddingBottom: Platform.OS === 'web' ? 18 : 12, paddingHorizontal: 16, paddingTop: 0 },
  chatSafetyText: { color: palette.teal, flex: 1, fontFamily: appFontFamily, fontSize: 11, fontWeight: '500', lineHeight: 16 },
  chatSafetyTip: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.10)', borderColor: 'rgba(77,182,172,0.22)', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 4, paddingHorizontal: 12, paddingVertical: 8 },
  chatSendingMetaMake: { alignItems: 'center', flexDirection: 'row', gap: 4, marginBottom: 4 },
  chatSendingTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '600' },
  chatAttachmentChipMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6, shadowColor: '#50371e', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.06, shadowRadius: 14 },
  chatAttachmentRowMake: { gap: 8, paddingBottom: 4, paddingRight: 14 },
  chatAttachmentTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  chatTopicChip: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#50371e', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.06, shadowRadius: 14 },
  chatTopicRow: { gap: 8, paddingBottom: 4, paddingRight: 14 },
  chatTopicText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600' },
  chatText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, lineHeight: 20 },
  chatTextMe: { color: '#fff', fontWeight: '600' },
  chatTypingBubble: { alignItems: 'center', flexDirection: 'row', gap: 5, minHeight: 42 },
  chatTypingDot: { backgroundColor: palette.orange, borderRadius: 3, height: 6, opacity: 0.45, width: 6 },
  chatTypingDotLast: { opacity: 0.72 },
  chatTypingDotMid: { opacity: 0.58 },
  chatTypingText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700' },
  checkbox: { alignItems: 'center', backgroundColor: 'transparent', borderColor: '#C8C4BA', borderRadius: 9, borderWidth: 1.5, height: 18, justifyContent: 'center', marginTop: 2, width: 18 },
  checkboxAttention: { borderColor: palette.danger },
  checkboxChecked: { backgroundColor: palette.orange, borderColor: palette.orange },
  content: { gap: 16, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 18 },
  contentWithTabs: { paddingBottom: 110 },
  conversationRow: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 70, padding: 14 },
  countryCode: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '500', minWidth: 34 },
  dangerText: { color: palette.danger, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  addPetDashed: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#FFC8A6', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1.5, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 52, paddingHorizontal: 14, paddingVertical: 14 },
  addPetDashedText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '600' },
  currentPetBadge: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, flexDirection: 'row', gap: 3, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  currentPetBadgeText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 10, fontWeight: '600', lineHeight: 14 },
  noPetArtGlowMake: { backgroundColor: 'rgba(255,138,92,0.12)', borderRadius: 90, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  noPetArtMake: { height: 180, marginBottom: 18, position: 'relative', width: 180 },
  noPetDescMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  noPetEmptyMake: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 590, paddingHorizontal: 36, textAlign: 'center' },
  noPetLaterMake: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 8 },
  noPetLaterTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  noPetPawOrbMake: { alignItems: 'center', backgroundColor: '#FFE3D1', borderColor: 'rgba(255,255,255,0.82)', borderRadius: 72, borderWidth: 1, bottom: 18, justifyContent: 'center', left: 18, position: 'absolute', right: 18, shadowColor: palette.orange, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.18, shadowRadius: 28, top: 18 },
  noPetPrimaryMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 14, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 24, minHeight: 46, paddingHorizontal: 28, shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.28, shadowRadius: 22 },
  noPetPrimaryTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  noPetSparkleMake: { alignItems: 'center', backgroundColor: palette.teal, borderRadius: 11, height: 22, justifyContent: 'center', position: 'absolute', right: 8, shadowColor: palette.teal, shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.26, shadowRadius: 14, top: 14, width: 22 },
  noPetTabArtMake: { height: 200, marginBottom: 8, position: 'relative', width: 200 },
  noPetTabDescMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13.5, lineHeight: 21.6, marginTop: 10, textAlign: 'center' },
  noPetTabGlowMake: { backgroundColor: 'rgba(255,138,92,0.16)', borderRadius: 100, bottom: 0, left: 0, opacity: 0.72, position: 'absolute', right: 0, top: 0 },
  noPetTabHomeMake: { alignItems: 'center', justifyContent: 'center', minHeight: 620, paddingHorizontal: 32, textAlign: 'center' },
  noPetTabMascotMake: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  noPetTabPlusMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.orange, borderRadius: 14, borderStyle: 'dashed', borderWidth: 2, bottom: 14, height: 28, justifyContent: 'center', position: 'absolute', right: 12, width: 28 },
  noPetTabPrimaryMake: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: palette.orange, borderRadius: 26, flexDirection: 'row', gap: 7, height: 52, justifyContent: 'center', marginTop: 64, shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.28, shadowRadius: 22 },
  noPetTabPrimaryTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 16, fontWeight: '500' },
  noPetTabTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 19, fontWeight: '600', lineHeight: 26, textAlign: 'center' },
  noPetTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 18, fontWeight: '800', lineHeight: 25, textAlign: 'center' },
  deleteTextButton: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  deleteTextButtonLabel: { color: palette.danger, fontFamily: appFontFamily, fontSize: 14, fontWeight: '500' },
  datePickerActionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  datePickerBackdrop: { alignItems: 'center', backgroundColor: 'rgba(20,18,14,0.46)', flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  datePickerCancelButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flex: 1, height: 46, justifyContent: 'center' },
  datePickerCancelText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '600' },
  datePickerConfirmButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 14, flex: 1, height: 46, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.22, shadowRadius: 18 },
  datePickerConfirmText: { color: '#fff', fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  datePickerSheet: { backgroundColor: '#fff', borderRadius: 22, paddingBottom: 18, paddingHorizontal: 18, paddingTop: 18, shadowColor: '#50371e', shadowOffset: { height: 18, width: 0 }, shadowOpacity: 0.22, shadowRadius: 38, width: '100%' },
  dateValueButton: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  dateValuePlaceholder: { color: palette.muted, fontWeight: '500' },
  dateValueText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '600' },
  editActionStack: { gap: 10, marginTop: 16 },
  editFormCard: { gap: 4, paddingHorizontal: 0, paddingTop: 0 },
  fieldHintError: { color: palette.danger },
  fieldHintRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, minHeight: 15, paddingHorizontal: 4 },
  fieldHintText: { color: palette.muted, flexShrink: 1, fontFamily: appFontFamily, fontSize: 11, fontWeight: '400', lineHeight: 15 },
  lockedFieldHint: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '400' },
  makeFieldGroup: { gap: 6, marginTop: 4 },
  makeFieldLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '400', paddingHorizontal: 4 },
  makeTextAreaInput: { minHeight: 112, paddingTop: 12 },
  makeTextInput: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1.5, color: palette.ink, flexDirection: 'row', fontFamily: appFontFamily, fontSize: 14, fontWeight: '400', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10 },
  makeTextInputError: { borderColor: palette.danger },
  memoDeleteActionsMake: { flexDirection: 'row', gap: 10, marginTop: 18 },
  memoDeleteBackdropMake: { alignItems: 'center', backgroundColor: 'rgba(20,18,14,0.50)', flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  memoDeleteBodyMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 21, marginTop: 8, paddingHorizontal: 6, textAlign: 'center' },
  memoDeleteCancelMake: { alignItems: 'center', backgroundColor: 'transparent', borderColor: palette.border, borderRadius: 13, borderWidth: 1, flex: 1, height: 46, justifyContent: 'center' },
  memoDeleteCancelTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '600' },
  memoDeleteDangerMake: { alignItems: 'center', backgroundColor: palette.danger, borderRadius: 13, flex: 1, flexDirection: 'row', gap: 6, height: 46, justifyContent: 'center', shadowColor: palette.danger, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.22, shadowRadius: 18 },
  memoDeleteDangerTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14, fontWeight: '600' },
  memoDeleteDialogMake: { backgroundColor: '#fff', borderRadius: 20, paddingBottom: 18, paddingHorizontal: 20, paddingTop: 22, shadowColor: '#50371e', shadowOffset: { height: 18, width: 0 }, shadowOpacity: 0.22, shadowRadius: 40, width: '100%' },
  memoDeleteIconMake: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#FBE4DE', borderRadius: 16, height: 52, justifyContent: 'center', marginBottom: 14, width: 52 },
  memoDeleteTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '700', lineHeight: 23, textAlign: 'center' },
  memoMetaBox: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  memoEditFormMake: { gap: 4, paddingTop: 0 },
  memoEditContentInputMake: { minHeight: 130 },
  memoEditPageMake: { marginHorizontal: -4, marginTop: -8, position: 'relative' },
  memoEmptyArt: { height: 140, marginBottom: 14, position: 'relative', width: 140 },
  memoEmptyButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 13, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 22, minHeight: 44, paddingHorizontal: 24, shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.28, shadowRadius: 22 },
  memoEmptyButtonText: { color: '#fff', fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700' },
  memoEmptyCircle: { alignItems: 'center', backgroundColor: '#FFE9D6', borderColor: 'rgba(255,255,255,0.86)', borderRadius: 54, borderWidth: 1, height: 108, justifyContent: 'center', left: 16, position: 'absolute', shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.2, shadowRadius: 24, top: 16, width: 108 },
  memoEmptyDesc: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 21, marginTop: 8, maxWidth: 260, textAlign: 'center' },
  memoEmptyGlow: { backgroundColor: 'rgba(255,138,92,0.16)', borderRadius: 70, height: 140, left: 0, position: 'absolute', top: 0, width: 140 },
  memoEmptyMake: { alignItems: 'center', justifyContent: 'center', minHeight: 500, paddingHorizontal: 30, paddingVertical: 34 },
  memoEmptyTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  memoFieldLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  memoIntroCard: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 100%)' } as object) : null), alignItems: 'center', backgroundColor: '#FFE7D6', borderRadius: 16, flexDirection: 'row', gap: 10, marginTop: 8, padding: 12 },
  memoIntroIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  memoIntroText: { color: palette.muted, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17 },
  memoListCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, marginTop: 14, paddingHorizontal: 14, paddingVertical: 8 },
  memoListIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 10, flexShrink: 0, height: 32, justifyContent: 'center', width: 32 },
  memoListReminderText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17, marginTop: 4 },
  memoListRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 68, paddingVertical: 10 },
  memoListTrail: { alignItems: 'center', flexDirection: 'row', flexShrink: 0, gap: 4 },
  memoMetaCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
  memoMetaLabelMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '400', lineHeight: 18 },
  memoMetaRowBorder: { borderBottomColor: palette.border, borderBottomWidth: 1 },
  memoMetaRowMake: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 },
  memoMetaValueMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '400', lineHeight: 18 },
  memoNewPage: { paddingTop: 0 },
  memoNoteInput: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '600', lineHeight: 22, minHeight: 92, paddingHorizontal: 16, paddingTop: 12 },
  memoPickerRow: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, height: 52, paddingHorizontal: 16 },
  memoPickerRowDisabled: { opacity: 0.58 },
  memoPickerValue: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  memoPrimaryCta: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 26, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center', marginTop: 28, shadowColor: palette.orange, shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.28, shadowRadius: 28 },
  memoPrimaryCtaDisabled: { backgroundColor: palette.pale, shadowOpacity: 0 },
  memoPrimaryCtaText: { color: '#fff', fontFamily: appFontFamily, fontSize: 15.5, fontWeight: '700' },
  memoSavingContentDimMake: { opacity: 0.88 },
  memoSavingPuffMake: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, position: 'absolute', shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.18, shadowRadius: 28, top: -4, zIndex: 20 },
  memoSavingPuffTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  memoReminderIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  memoReminderRow: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 14, paddingHorizontal: 16, paddingVertical: 14 },
  memoRepeatOption: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 40 },
  memoRepeatOptionActive: { backgroundColor: 'rgba(255,138,92,0.12)', borderColor: palette.orange, borderWidth: 1.5 },
  memoRepeatRow: { flexDirection: 'row', gap: 8 },
  memoRepeatText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600' },
  memoRepeatTextActive: { color: palette.orange, fontWeight: '700' },
  memoSwitchThumb: { backgroundColor: '#fff', borderRadius: 11, height: 22, marginLeft: 18, shadowColor: '#000', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.18, shadowRadius: 4, width: 22 },
  memoSwitchThumbOff: { marginLeft: 0 },
  memoSwitchTrack: { backgroundColor: palette.orange, borderRadius: 13, height: 26, padding: 2, width: 44 },
  memoSwitchTrackOff: { backgroundColor: 'rgba(122,121,114,0.22)' },
  memoTopSave: { paddingHorizontal: 0, paddingVertical: 8 },
  memoTopSaveDisabled: { opacity: 0.55 },
  memoTopSaveText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  memoTopSaveTextDisabled: { color: palette.muted },
  memoTypeCell: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flex: 1, gap: 6, minHeight: 66, justifyContent: 'center', paddingVertical: 10 },
  memoTypeCellActive: { backgroundColor: 'rgba(255,138,92,0.12)', borderColor: palette.orange, borderWidth: 1.5 },
  memoTypeGrid: { flexDirection: 'row', gap: 8 },
  memoTypeText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600' },
  memoTypeTextActive: { color: palette.orange, fontWeight: '700' },
  metaIconBox: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 8, height: 26, justifyContent: 'center', width: 26 },
  multiPetActions: { alignItems: 'flex-end', gap: 8 },
  multiPetHero: { backgroundColor: '#FFE3D1', borderRadius: 20, gap: 0, marginBottom: 14, marginTop: -10, overflow: 'hidden', padding: 14, position: 'relative' },
  multiPetHeroHealth: { alignItems: 'center', borderTopColor: 'rgba(255,255,255,0.55)', borderTopWidth: 1, flexDirection: 'row', gap: 6, marginTop: 12, paddingTop: 10 },
  multiPetHeroHealthText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '400', lineHeight: 16 },
  multiPetHeroDimmedMake: { opacity: 0.78 },
  multiPetHeroMain: { alignItems: 'center', flexDirection: 'row', gap: 14, position: 'relative' },
  multiPetHeroName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  multiPetHealthPill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E8F5F3', borderRadius: 8, flexDirection: 'row', gap: 4, marginTop: 6, paddingHorizontal: 8, paddingVertical: 2 },
  multiPetHealthPillText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '500', lineHeight: 15 },
  multiPetHealthPillTextWarn: { color: palette.warning },
  multiPetHealthPillWarn: { backgroundColor: '#FBF2D9' },
  multiPetKindBadge: { backgroundColor: '#E8F5F3', borderRadius: 6, color: palette.teal, flexShrink: 1, fontFamily: appFontFamily, fontSize: 10, fontWeight: '500', lineHeight: 14, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 1 },
  multiPetKindBadgeDog: { backgroundColor: '#FFE6D6', color: palette.orange },
  multiPetList: { gap: 10 },
  multiPetNoteMake: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 14, padding: 12 },
  multiPetNoteTextMake: { color: palette.muted, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '400', lineHeight: 18 },
  multiPetPageMake: { marginHorizontal: -4, position: 'relative' },
  multiPetRowName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '700', lineHeight: 20 },
  multiPetSectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 },
  multiPetRow: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 80, paddingHorizontal: 14, paddingVertical: 12 },
  multiPetRowActive: { borderColor: '#FFD9C2' },
  multiPetSwitchingTextMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  multiPetSwitchToastMake: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10, position: 'absolute', shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.18, shadowRadius: 28, top: 70, zIndex: 20 },
  multiPetSwitchToastTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '800' },
  ownerAvatarBlock: { alignItems: 'center', paddingBottom: 18, paddingTop: 14 },
  ownerAvatarCamera: { alignItems: 'center', backgroundColor: palette.orange, borderColor: palette.background, borderRadius: 16, borderWidth: 3, bottom: 30, height: 32, justifyContent: 'center', marginBottom: -16, marginLeft: 70, shadowColor: palette.orange, shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.26, shadowRadius: 14, width: 32 },
  ownerAvatarHintMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '400', lineHeight: 18, marginTop: 12 },
  ownerAvatarImageUploadingMake: { opacity: 0.82 },
  ownerAvatarImage: { height: '100%', width: '100%' },
  ownerAvatarLarge: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#fff', borderRadius: 48, borderWidth: 3, height: 96, justifyContent: 'center', overflow: 'hidden', shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.1, shadowRadius: 22, width: 96 },
  ownerAvatarOverlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.32)', bottom: 0, gap: 4, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  ownerAvatarProgressTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 10, fontWeight: '600', lineHeight: 13 },
  ownerAvatarSuccessOverlayMake: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.85)', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  ownerAvatarUploadNoteMake: { alignItems: 'center', backgroundColor: '#FFF7F0', borderColor: '#FFE0CC', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 8, padding: 12 },
  ownerAvatarUploadNoteTextMake: { color: palette.muted, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '400', lineHeight: 18 },
  ownerEditMakePage: { marginHorizontal: -4, position: 'relative' },
  ownerSaveErrorCardMake: { alignItems: 'center', backgroundColor: '#FBE4DE', borderColor: '#F5C7BD', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 8, padding: 12 },
  ownerSaveErrorIconMake: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  ownerSaveErrorTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 17, marginTop: 2 },
  ownerReadonlyValueMake: { color: '#9C988E', flex: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '400', lineHeight: 20 },
  ownerSaveErrorTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  ownerSaveRetryMake: { alignItems: 'center', borderColor: palette.orange, borderRadius: 9, borderWidth: 1, flexDirection: 'row', flexShrink: 0, gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  ownerSaveRetryTextMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  ownerSavingContentDimMake: { opacity: 0.88 },
  ownerSavingPuffMake: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, position: 'absolute', shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.18, shadowRadius: 28, top: 8, zIndex: 20 },
  ownerSavingPuffTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  petDeleteIconButton: { alignItems: 'center', backgroundColor: '#FBE4DE', borderRadius: 10, height: 30, justifyContent: 'center', width: 30 },
  petDeleteActionsMake: { gap: 10, marginTop: 20 },
  petDeleteBodyMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  petDeletePreviewMake: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: '#FFF7F0', borderColor: '#FFE0CC', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 18, paddingHorizontal: 14, paddingVertical: 12 },
  petDeletePreviewMetaMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 16, marginTop: 2 },
  petDeletePreviewNameMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  petDeleteSheetMake: { gap: 0, paddingBottom: 20, paddingHorizontal: 20, paddingTop: 12 },
  petDeleteTipMake: { alignItems: 'flex-start', backgroundColor: '#FBF2D9', borderColor: '#EFDFA8', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10 },
  petDeleteTipTextMake: { color: '#8A6B2A', flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17 },
  petDeleteTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 18, fontWeight: '800', lineHeight: 25, textAlign: 'center' },
  petDogBadge: { backgroundColor: palette.orangeSoft, color: palette.orange },
  quickWeightChip: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 10, borderWidth: 1, flex: 1, paddingVertical: 8 },
  quickWeightRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickWeightText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700' },
  readonlyField: { backgroundColor: '#F4EFE6' },
  sheetTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  switchPetButton: { alignItems: 'center', borderColor: palette.orange, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 32, minWidth: 58, paddingHorizontal: 10, paddingVertical: 6 },
  switchPetButtonActive: { backgroundColor: palette.orangeSoft, borderColor: palette.orangeSoft },
  switchPetButtonLoadingMake: { backgroundColor: '#fff', borderColor: palette.border },
  switchPetText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  switchPetTextActive: { color: palette.orange },
  weightAddLink: { alignItems: 'center', flexDirection: 'row', gap: 3, paddingHorizontal: 2, paddingVertical: 4 },
  weightAddLinkText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  weightChartWrap: { marginHorizontal: -4, marginTop: 10 },
  weightChartEmptyMake: { alignItems: 'center', backgroundColor: '#F8F5EE', borderColor: palette.border, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, height: 128, justifyContent: 'center' },
  weightChartEmptyText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  weightDeleteActionsMake: { flexDirection: 'row', gap: 10, marginTop: 20 },
  weightDeleteBackdropMake: { alignItems: 'center', backgroundColor: 'rgba(31,33,29,0.42)', flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  weightDeleteBodyMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 20, marginTop: 12, textAlign: 'center' },
  weightDeleteCancelMake: { alignItems: 'center', backgroundColor: '#F4EFE6', borderRadius: 16, flex: 1, height: 48, justifyContent: 'center' },
  weightDeleteCancelTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  weightDeleteDialogMake: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingBottom: 20, paddingHorizontal: 18, paddingTop: 22, shadowColor: '#000', shadowOffset: { height: 22, width: 0 }, shadowOpacity: 0.18, shadowRadius: 42, width: '100%' },
  weightDeleteIconMake: { alignItems: 'center', backgroundColor: '#FBE4DE', borderRadius: 16, height: 52, justifyContent: 'center', marginBottom: 14, width: 52 },
  weightDeletePreviewIconMake: { alignItems: 'center', backgroundColor: '#E8F5F3', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  weightDeletePreviewKgMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '800', lineHeight: 21 },
  weightDeletePreviewMake: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: '#FFF7F0', borderColor: '#FFE0CC', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 14, paddingHorizontal: 12, paddingVertical: 11 },
  weightDeletePreviewMetaMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 16, marginTop: 2 },
  weightDeleteSubmitMake: { alignItems: 'center', backgroundColor: palette.danger, borderRadius: 16, flex: 1, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center' },
  weightDeleteSubmitTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14, fontWeight: '800' },
  weightDeleteTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 18, fontWeight: '800', lineHeight: 25, textAlign: 'center' },
  weightDeltaPill: { alignItems: 'center', backgroundColor: palette.tealSoft, borderRadius: 10, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  weightDeltaPillWarn: { backgroundColor: '#FBF2D9' },
  weightEditSheet: { gap: 14 },
  weightEmptyArt: { height: 160, marginBottom: 16, position: 'relative', width: 160 },
  weightEmptyButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 14, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 22, minHeight: 46, paddingHorizontal: 26, shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.26, shadowRadius: 22 },
  weightEmptyButtonText: { color: '#fff', fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  weightEmptyCircle: { alignItems: 'center', backgroundColor: '#DBEFEB', borderColor: 'rgba(255,255,255,0.86)', borderRadius: 62, borderWidth: 1, height: 124, justifyContent: 'center', left: 18, position: 'absolute', shadowColor: palette.teal, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.18, shadowRadius: 28, top: 18, width: 124 },
  weightEmptyDesc: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 21, marginTop: 8, maxWidth: 260, textAlign: 'center' },
  weightEmptyGlow: { backgroundColor: 'rgba(77,182,172,0.18)', borderRadius: 80, height: 160, left: 0, position: 'absolute', top: 0, width: 160 },
  weightEmptyMake: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 560, paddingHorizontal: 30, paddingVertical: 36 },
  weightEmptyTip: { alignItems: 'center', backgroundColor: '#FFF7F0', borderColor: '#FFE0CC', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 28, paddingHorizontal: 14, paddingVertical: 10 },
  weightEmptyTipText: { color: palette.muted, flexShrink: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 16 },
  weightEmptyTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  weightHistoryDelta: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  weightHistoryDeltaText: { fontFamily: appFontFamily, fontSize: 11, fontWeight: '700' },
  weightHistoryHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0, paddingTop: 12 },
  weightHistoryIcon: { alignItems: 'center', backgroundColor: '#E8F5F3', borderRadius: 10, flexShrink: 0, height: 32, justifyContent: 'center', width: 32 },
  weightHistoryRowHighlight: { backgroundColor: '#FFF7F0', borderColor: '#FFE0CC' },
  weightHistoryRowMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  weightHistoryStack: { gap: 8, marginHorizontal: -4 },
  weightHistoryTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  weightNoticeOk: { alignItems: 'center', backgroundColor: '#E8F5F3', borderColor: '#C4E0DA', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginHorizontal: -4, padding: 12 },
  weightNoticeIconOk: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  weightNoticeIconWarn: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 11, height: 36, justifyContent: 'center', width: 36 },
  weightNoticeWarn: { alignItems: 'center', backgroundColor: '#FBF2D9', borderColor: '#EFDFA8', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginHorizontal: -4, padding: 12 },
  weightNumberInput: { alignItems: 'flex-end', backgroundColor: '#fff', borderColor: palette.orange, borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', gap: 6, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  weightNumberInputText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 42, fontWeight: '700', letterSpacing: 0, lineHeight: 48, minWidth: 120, padding: 0, textAlign: 'center' },
  weightOkText: { color: palette.teal },
  weightSectionTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600' },
  weightSheetMetaCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  weightSheetMetaRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 },
  weightSheetNoteInput: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '400', lineHeight: 18, minHeight: 24, paddingHorizontal: 0, paddingVertical: 0 },
  weightSheetNoteRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  weightStatChip: { backgroundColor: palette.pale, borderRadius: 12, flex: 1, paddingHorizontal: 10, paddingVertical: 10 },
  weightStatChipOk: { backgroundColor: '#E8F5F3' },
  weightStatChipWarn: { backgroundColor: '#FBF2D9' },
  weightStatRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  weightTrendCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, marginHorizontal: -4, marginTop: 8, paddingBottom: 10, paddingHorizontal: 14, paddingTop: 14 },
  weightTrendHeader: { alignItems: 'flex-end', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  weightTrendLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '400' },
  weightTrendUnit: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '500', marginBottom: 2 },
  weightTrendValue: { color: palette.ink, fontFamily: appFontFamily, fontSize: 26, fontWeight: '700', letterSpacing: 0, lineHeight: 30 },
  weightTrendValueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 5, marginTop: 4 },
  weightUnitText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 15, fontWeight: '700', marginBottom: 7 },
  weightWarnText: { color: '#C99B3E' },
  flex: { flex: 1, minWidth: 0 },
  aiFailureSecondaryAction: { marginTop: 12, width: '100%' },
  aiGeneratingImage: { backgroundColor: '#fbeedd', borderColor: '#fff', borderRadius: 120, borderWidth: 5, height: 240, opacity: 0.92, width: 240 },
  aiGeneratingOrb: { alignItems: 'center', alignSelf: 'center', height: 286, justifyContent: 'center', marginTop: 28, position: 'relative', width: 286 },
  aiGeneratingPage: { alignItems: 'center', paddingHorizontal: 6 },
  aiGeneratingRing: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'conic-gradient(from 0deg, rgba(255,138,92,0) 0%, rgba(255,138,92,0.85) 35%, rgba(77,182,172,0.85) 70%, rgba(255,138,92,0) 100%)' } as object) : null), backgroundColor: 'rgba(255,138,92,0.18)', borderColor: 'rgba(255,138,92,0.45)', borderRadius: 136, borderWidth: 2, height: 272, opacity: 0.82, position: 'absolute', width: 272 },
  aiGeneratingSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13.5, lineHeight: 22, marginTop: 10, textAlign: 'center' },
  aiGeneratingTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 22, fontWeight: '600', letterSpacing: 0, lineHeight: 29, marginTop: 54, textAlign: 'center' },
  aiGhostCta: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderColor: palette.border, borderRadius: 27, borderWidth: 1, flexDirection: 'row', gap: 8, height: 54, justifyContent: 'center', shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.08, shadowRadius: 18 },
  aiGhostCtaPressed: { backgroundColor: '#fff' },
  aiGhostCtaText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15.5, fontWeight: '500' },
  aiCtaDisabled: { opacity: 0.72 },
  aiCandidateBlock: { marginTop: 22, width: '100%' },
  aiCandidateCheck: { alignItems: 'center', backgroundColor: palette.orange, borderColor: '#fff', borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', position: 'absolute', right: 6, top: 6, width: 22 },
  aiCandidateImage: { height: '100%', width: '100%' },
  aiCandidateImageFrame: { backgroundColor: '#FFEDD9', borderColor: palette.border, borderRadius: 18, borderWidth: 1, height: '100%', overflow: 'hidden', position: 'relative', width: '100%' },
  aiCandidateImageFrameActive: { borderColor: '#fff', borderWidth: 2 },
  aiCandidateImageOverlay: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  aiCandidateImageOverlay_main: { backgroundColor: 'rgba(255,138,92,0.03)' },
  aiCandidateImageOverlay_soft: { backgroundColor: 'rgba(77,182,172,0.12)' },
  aiCandidateImageOverlay_warm: { backgroundColor: 'rgba(255,185,125,0.13)' },
  aiCandidateImage_main: { opacity: 1 },
  aiCandidateImage_soft: { opacity: 0.94 },
  aiCandidateImage_warm: { opacity: 0.98 },
  aiCandidateIntro: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 4 },
  aiCandidateIntroText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500', lineHeight: 18 },
  aiCandidateItem: { aspectRatio: 1, borderRadius: 22, flex: 1, padding: 4 },
  aiCandidateItemActive: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FF8A5C, #4DB6AC)' } as object) : null), backgroundColor: palette.orange },
  aiCandidateLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500', letterSpacing: 0.3, marginBottom: 10 },
  aiCandidateRow: { flexDirection: 'row', gap: 12 },
  aiFeedbackActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  aiFeedbackCancel: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 27, flex: 1, height: 54, justifyContent: 'center' },
  aiFeedbackCancelText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '500' },
  aiFeedbackChip: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 9 },
  aiFeedbackChipSelected: { backgroundColor: 'rgba(255,138,92,0.12)', borderColor: palette.orange, borderWidth: 1.5 },
  aiFeedbackChipText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  aiFeedbackChipTextSelected: { color: palette.orange, fontWeight: '600' },
  aiFeedbackChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  aiFeedbackEntry: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(255,138,92,0.10)', borderColor: 'rgba(255,138,92,0.18)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 8 },
  aiFeedbackEntryText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700', lineHeight: 17 },
  aiFeedbackSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 0, paddingBottom: 30, paddingHorizontal: 22, paddingTop: 18 },
  aiFeedbackSliderCard: { backgroundColor: palette.background, borderColor: palette.border, borderRadius: 16, borderWidth: 1, marginTop: 18, paddingHorizontal: 16, paddingVertical: 14 },
  aiFeedbackSliderFill: { backgroundColor: palette.orange, borderRadius: 3, bottom: 0, left: 0, position: 'absolute', top: 0, width: '38%' },
  aiFeedbackSliderHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  aiFeedbackSliderLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '500' },
  aiFeedbackSliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  aiFeedbackSliderThumb: { backgroundColor: '#fff', borderColor: palette.orange, borderRadius: 11, borderWidth: 2, height: 22, left: '38%', marginLeft: -11, marginTop: -11, position: 'absolute', top: '50%', width: 22, shadowColor: '#50371e', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.16, shadowRadius: 10 },
  aiFeedbackSliderTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '600' },
  aiFeedbackSliderTrack: { backgroundColor: '#E9E0D6', borderRadius: 3, height: 6, position: 'relative' },
  aiFeedbackSliderValue: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  aiFeedbackSubmit: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 27, flex: 1.4, flexDirection: 'row', gap: 8, height: 54, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.24, shadowRadius: 24 },
  aiFeedbackSubmitText: { color: '#fff', fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  aiFeedbackSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 20, marginTop: 6 },
  aiFeedbackTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 18, fontWeight: '600', letterSpacing: 0, lineHeight: 25 },
  aiOriginalThumb: { borderColor: '#fff', borderRadius: 31, borderWidth: 3, height: 62, left: 7, overflow: 'hidden', position: 'absolute', top: 12, width: 62 },
  aiPageTealGlow: { backgroundColor: 'rgba(77,182,172,0.13)', borderRadius: 160, bottom: -80, height: 220, position: 'absolute', right: -90, width: 220 },
  aiPageWarmGlow: { backgroundColor: 'rgba(255,217,182,0.42)', borderRadius: 220, height: 240, left: -80, position: 'absolute', right: -80, top: -42 },
  aiParticleDot: { backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: 2, height: 4, position: 'absolute', width: 4 },
  aiParticleDotFour: { bottom: 72, height: 3, left: 72, opacity: 0.8, width: 3 },
  aiParticleDotOne: { left: 62, top: 72 },
  aiParticleDotThree: { bottom: 58, height: 5, opacity: 0.9, right: 78, width: 5 },
  aiParticleDotTwo: { height: 3, right: 82, top: 50, width: 3 },
  aiParticleLayer: { borderRadius: 120, height: 240, overflow: 'hidden', position: 'absolute', width: 240 },
  aiPhotoChip: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.82)', borderColor: palette.border, borderRadius: 30, borderWidth: 1, flexDirection: 'row', gap: 10, marginLeft: 0, marginTop: 4, paddingBottom: 6, paddingLeft: 6, paddingRight: 14, paddingTop: 6, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.12, shadowRadius: 22, zIndex: 3 },
  aiPhotoChipImage: { borderColor: '#fff', borderRadius: 18, borderWidth: 2, height: 36, width: 36 },
  aiPhotoChipStrong: { color: palette.ink, fontWeight: '700' },
  aiPhotoChipText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', lineHeight: 15 },
  aiPrimaryCta: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 27, flexDirection: 'row', gap: 8, height: 54, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.26, shadowRadius: 28 },
  aiPrimaryCtaPressed: { backgroundColor: '#F2774A', transform: [{ scale: 0.99 }] },
  aiPrimaryCtaText: { color: '#fff', fontFamily: appFontFamily, fontSize: 16, fontWeight: '600' },
  aiQuotaHint: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', lineHeight: 18, marginTop: 10, textAlign: 'center' },
  aiRegenerateActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  aiRegenerateBackdrop: { alignItems: 'center', backgroundColor: 'rgba(27,28,25,0.45)', flex: 1, justifyContent: 'center' },
  aiRegenerateBody: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  aiRegenerateCancel: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 24, flex: 1, height: 48, justifyContent: 'center' },
  aiRegenerateCancelText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  aiRegenerateDialog: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, marginHorizontal: 32, maxWidth: 312, paddingBottom: 20, paddingHorizontal: 22, paddingTop: 26, shadowColor: '#000', shadowOffset: { height: 30, width: 0 }, shadowOpacity: 0.28, shadowRadius: 60, width: 312 },
  aiRegenerateIconBox: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, rgba(255,138,92,0.18), rgba(77,182,172,0.18))' } as object) : null), alignItems: 'center', backgroundColor: 'rgba(255,138,92,0.14)', borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 14, width: 56 },
  aiRegenerateNote: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: palette.background, borderRadius: 12, flexDirection: 'row', gap: 8, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10 },
  aiRegenerateNoteText: { color: palette.muted, flex: 1, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  aiRegenerateSubmit: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 24, flex: 1.2, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.22, shadowRadius: 22 },
  aiRegenerateSubmitText: { color: '#fff', fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  aiRegenerateTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '600', letterSpacing: 0, lineHeight: 24, textAlign: 'center' },
  aiResultActions: { gap: 12, marginTop: 18, width: '100%' },
  aiResultActionsSingle: { marginTop: 24, paddingHorizontal: 12 },
  aiResultAvatarFrame: { alignItems: 'center', backgroundColor: '#FFEDD9', borderColor: '#fff', borderRadius: 115, borderWidth: 4, height: 230, justifyContent: 'center', overflow: 'hidden', shadowColor: '#b46e3c', shadowOffset: { height: 24, width: 0 }, shadowOpacity: 0.26, shadowRadius: 52, width: 230 },
  aiResultAvatarFrameSingle: { borderRadius: 130, height: 260, width: 260 },
  aiResultDesc: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13.5, lineHeight: 21, marginTop: 14, textAlign: 'center' },
  aiResultFeatureTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 26 },
  aiResultFeatureTagsSingle: { marginTop: 18, paddingHorizontal: 20 },
  aiResultHeaderHeart: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderColor: palette.border, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
  aiResultHero: { alignItems: 'center', height: 230, justifyContent: 'center', marginTop: 24, position: 'relative', width: 230 },
  aiResultHeroSingle: { height: 260, marginTop: 98, width: 260 },
  aiResultHeroBadge: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, bottom: 3, flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingVertical: 6, position: 'absolute', shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.13, shadowRadius: 20 },
  aiResultHeroBadgeText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  aiResultHeroGlow: { backgroundColor: 'rgba(255,138,92,0.20)', borderRadius: 145, height: 290, position: 'absolute', width: 290 },
  aiResultHeroGlowSingle: { borderRadius: 155, height: 310, width: 310 },
  aiResultHeroRing: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'conic-gradient(from 210deg, rgba(255,138,92,0.55), rgba(77,182,172,0.5), rgba(255,200,140,0.5), rgba(255,138,92,0.55))' } as object) : null), backgroundColor: 'rgba(255,138,92,0.14)', borderRadius: 121, height: 242, opacity: 0.86, position: 'absolute', width: 242 },
  aiResultHeroRingSingle: { borderRadius: 136, height: 272, width: 272 },
  aiResultName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 24, fontWeight: '700', letterSpacing: 0, lineHeight: 32, marginTop: 24, textAlign: 'center' },
  aiResultNameSingle: { marginTop: 38 },
  aiResultPage: { alignItems: 'center', minHeight: 720, paddingHorizontal: 8, position: 'relative' },
  aiOriginalPhotoChip: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.78)', borderColor: palette.border, borderRadius: 30, borderWidth: 1, flexDirection: 'row', gap: 12, left: 0, paddingBottom: 6, paddingLeft: 6, paddingRight: 14, paddingTop: 6, position: 'absolute', shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.12, shadowRadius: 22, top: 8, zIndex: 4 },
  aiOriginalPhotoStrong: { color: palette.ink, fontWeight: '600' },
  aiOriginalPhotoText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', lineHeight: 15 },
  aiOriginalPhotoThumb: { borderColor: '#fff', borderRadius: 18, borderWidth: 2, height: 36, overflow: 'hidden', width: 36 },
  aiScanLine: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(90deg, rgba(255,138,92,0), rgba(255,138,92,0.9), rgba(255,138,92,0))' } as object) : null), backgroundColor: palette.orange, borderRadius: 999, height: 2, left: 28, opacity: 0.88, position: 'absolute', right: 28, top: 135, shadowColor: palette.orange, shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.45, shadowRadius: 12 },
  aiSparkOne: { left: 4, position: 'absolute', top: 38 },
  aiSparkThree: { bottom: 64, position: 'absolute', right: -2 },
  aiSparkTwo: { position: 'absolute', right: 46, top: 12 },
  aiStepsCard: { backgroundColor: 'rgba(255,255,255,0.70)', borderColor: palette.border, borderRadius: 18, borderWidth: 1, marginTop: 22, paddingHorizontal: 16, paddingVertical: 14, width: '100%' },
  aiWorkingBadge: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, bottom: 34, flexDirection: 'row', gap: 5, paddingHorizontal: 12, paddingVertical: 6, position: 'absolute', right: 2, shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.15, shadowRadius: 18 },
  aiWorkingText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  formCard: { gap: 12 },
  goldIcon: { backgroundColor: '#f2b441' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  greetButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 17, height: 34, justifyContent: 'center', position: 'absolute', right: 14, top: 70, width: 34 },
  greetingMessageCard: { backgroundColor: palette.background, borderColor: palette.border, borderRadius: 16, borderWidth: 1, minHeight: 82, paddingHorizontal: 14, paddingVertical: 12 },
  greetingMessageText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '400', lineHeight: 22 },
  greetingQuickChip: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 4, maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 8 },
  greetingQuickChipActive: { backgroundColor: 'rgba(255,138,92,0.12)', borderColor: palette.orange, borderWidth: 1.5 },
  greetingQuickChipText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500', lineHeight: 17 },
  greetingQuickChipTextActive: { color: palette.orange },
  greetingQuickLabelMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500', lineHeight: 17, marginBottom: -6 },
  greetingQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  greetingSafetyMake: { alignItems: 'flex-start', backgroundColor: 'rgba(77,182,172,0.10)', borderColor: 'rgba(77,182,172,0.22)', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  greetingSafetyTextMake: { color: palette.teal, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', lineHeight: 17 },
  greetingSheetActions: { flexDirection: 'row', gap: 10, marginTop: 0 },
  greetingSheetAvatarMake: { backgroundColor: palette.pale, borderRadius: 14, height: 48, overflow: 'hidden', position: 'relative', width: 48 },
  greetingSheetClose: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  greetingSheetHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  greetingSheetHint: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 17, textAlign: 'center' },
  greetingSheetMake: { gap: 14, paddingHorizontal: 22, paddingTop: 16 },
  greetingSheetMeta: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', lineHeight: 18, marginTop: 3 },
  greetingSheetOwnerAvatarMake: { backgroundColor: '#fff', borderColor: '#fff', borderRadius: 11, borderWidth: 2, bottom: -3, height: 22, overflow: 'hidden', position: 'absolute', right: -3, width: 22 },
  header: { backgroundColor: palette.background, paddingHorizontal: 16, paddingTop: 0 },
  headerActionSlot: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  headerRow: { alignItems: 'center', flexDirection: 'row', height: 44, justifyContent: 'space-between' },
  headerSpacer: { height: 36, width: 36 },
  headerTitle: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  calendarDayCell: { alignItems: 'center', height: 40, justifyContent: 'center', width: '14.2857%' },
  calendarDayCircle: { alignItems: 'center', borderRadius: 15, height: 30, justifyContent: 'center', width: 30 },
  calendarDayCircleOverdue: { backgroundColor: '#FBE4DE', borderColor: '#F5C7BD', borderWidth: 1 },
  calendarDayCircleSelected: { backgroundColor: palette.orange },
  calendarDayCircleToday: { backgroundColor: '#FFF1E5', borderColor: palette.orange, borderWidth: 1 },
  calendarDayText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '400', lineHeight: 16 },
  calendarDayTextOverdue: { color: palette.danger },
  calendarDayTextSelected: { color: '#fff' },
  calendarDayTextStrong: { fontWeight: '700' },
  calendarDot: { borderRadius: 2, height: 4, width: 4 },
  calendarDots: { flexDirection: 'row', gap: 2, height: 5, justifyContent: 'center', marginTop: 2 },
  calendarEmptyButton: { alignItems: 'center', alignSelf: 'center', backgroundColor: palette.orange, borderRadius: 12, flexDirection: 'row', gap: 6, marginTop: 14, minHeight: 34, paddingHorizontal: 18 },
  calendarEmptyButtonText: { color: '#fff', fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700' },
  calendarEmptyCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, marginTop: 0, paddingHorizontal: 16, paddingVertical: 26 },
  calendarEmptyIcon: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 16, height: 52, justifyContent: 'center', marginBottom: 10, width: 52 },
  calendarEmptyText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 18, marginTop: 6, textAlign: 'center' },
  calendarEmptyTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700' },
  calendarErrorIcon: { alignItems: 'center', backgroundColor: '#FBE4DE', borderRadius: 22, height: 72, justifyContent: 'center', marginBottom: 14, width: 72 },
  calendarErrorState: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 430, paddingHorizontal: 32 },
  calendarErrorText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  calendarErrorTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '800' },
  calendarEventIcon: { alignItems: 'center', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  calendarEventItem: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, paddingHorizontal: 12, paddingVertical: 11 },
  calendarEventList: { gap: 8 },
  calendarEventSub: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 17, marginTop: 2 },
  calendarEventTime: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600' },
  calendarEventTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  calendarGridCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, paddingBottom: 12, paddingHorizontal: 10, paddingTop: 14 },
  calendarLaterButton: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 8 },
  calendarLaterText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  calendarLegend: { borderTopColor: palette.border, borderTopWidth: 1, flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: 10, paddingTop: 10 },
  calendarLegendDot: { borderRadius: 3, height: 6, width: 6 },
  calendarLegendItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  calendarLegendText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '600' },
  calendarMonthButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 10, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  calendarMonthLabel: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '800', letterSpacing: 0 },
  calendarMonthSwitcher: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  calendarOverdueAction: { borderColor: palette.orange, borderRadius: 9, borderWidth: 1, color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  calendarOverdueCard: { alignItems: 'center', backgroundColor: '#FBE4DE', borderColor: '#F5C7BD', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 12, padding: 12 },
  calendarOverdueIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  calendarOverdueText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, lineHeight: 16, marginTop: 2 },
  calendarOverdueTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '800' },
  calendarPetCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 14, marginTop: 8, padding: 12 },
  calendarPetCopy: { flex: 1, minWidth: 0 },
  calendarPetName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', maxWidth: 138 },
  calendarPetNote: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  calendarPetTag: { backgroundColor: '#E8F5F3', borderRadius: 6, color: palette.teal, fontFamily: appFontFamily, fontSize: 10, fontWeight: '700', maxWidth: 132, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 1 },
  calendarPetTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  calendarRetryButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 13, flexDirection: 'row', gap: 8, marginTop: 22, minHeight: 40, paddingHorizontal: 20, shadowColor: palette.orange, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.24, shadowRadius: 16 },
  calendarRetryText: { color: '#fff', fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  calendarSelectedCount: { backgroundColor: '#E8F5F3', borderRadius: 10, color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4 },
  calendarSelectedCountMuted: { backgroundColor: palette.pale, color: palette.muted },
  calendarSelectedDate: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '800' },
  calendarSelectedHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 4 },
  calendarSelectedWeek: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', marginTop: 2 },
  calendarSkeletonList: { gap: 10, marginTop: 0 },
  calendarSkeletonRow: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  calendarSkeletonTextStack: { flex: 1, gap: 6 },
  calendarSummaryCard: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 100%)' } as object) : null), alignItems: 'center', backgroundColor: '#FFE3D1', borderRadius: 14, flexDirection: 'row', gap: 10, marginTop: 14, padding: 12 },
  calendarSummaryIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  calendarSummaryText: { color: palette.muted, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 18 },
  calendarSyncRibbon: { alignItems: 'center', backgroundColor: '#FFF1E5', borderColor: '#FFE0CC', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 6, paddingHorizontal: 14, paddingVertical: 8 },
  calendarSyncText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  calendarUpcomingCard: { alignItems: 'center', backgroundColor: '#FBF2D9', borderColor: '#EFDFA8', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 12, padding: 12 },
  calendarUpcomingDate: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  calendarUpcomingIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  calendarUpcomingText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, lineHeight: 16, marginTop: 2 },
  calendarUpcomingTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '800' },
  calendarWeekRow: { flexDirection: 'row', marginBottom: 6 },
  calendarWeekText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', paddingVertical: 4, textAlign: 'center', width: '14.2857%' },
  calendarWeekTextWeekend: { color: palette.orange },
  healthScore: { color: palette.ink, fontFamily: appFontFamily, fontSize: 44, fontWeight: '700', lineHeight: 50 },
  healthHeroAvatar: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 38, height: 76, justifyContent: 'center', padding: 6, shadowColor: '#b46e3c', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.18, shadowRadius: 22, width: 76, zIndex: 2 },
  healthHeroCopy: { flex: 1, minWidth: 0 },
  healthHeroDesc: { color: 'rgba(31,33,29,0.72)', fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500', lineHeight: 19, marginTop: 8 },
  healthHeroGlow: { backgroundColor: 'rgba(255,255,255,0.46)', borderRadius: 70, height: 140, position: 'absolute', right: -20, top: -20, width: 140 },
  healthHeroLabel: { color: 'rgba(31,33,29,0.68)', fontFamily: appFontFamily, fontSize: 12, fontWeight: '500' },
  healthHeroLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  healthHeroMake: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFE3CB 0%, #FFD2A8 60%, #FFC089 100%)' } as object) : null), alignItems: 'center', backgroundColor: '#ffd2a8', borderRadius: 24, flexDirection: 'row', gap: 12, marginTop: 8, overflow: 'hidden', paddingHorizontal: 20, paddingVertical: 18, position: 'relative', shadowColor: '#b46e3c', shadowOffset: { height: 18, width: 0 }, shadowOpacity: 0.18, shadowRadius: 36 },
  healthHeroScore: { color: palette.ink, fontFamily: appFontFamily, fontSize: 44, fontWeight: '700', letterSpacing: 0, lineHeight: 48 },
  healthHeroScoreRow: { alignItems: 'baseline', flexDirection: 'row', gap: 6, marginTop: 6 },
  healthHeroTotal: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '500' },
  healthMakeBadge: { backgroundColor: palette.orangeSoft, borderRadius: 12, color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 3 },
  healthMakeBadgeCool: { backgroundColor: 'rgba(77,182,172,0.14)', color: palette.teal },
  healthMakeBadgeMuted: { backgroundColor: 'rgba(122,121,114,0.12)', color: palette.muted },
  healthMakeIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  healthMakeIconCool: { backgroundColor: 'rgba(77,182,172,0.18)' },
  healthMakeRow: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, gap: 0, paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.07, shadowRadius: 24 },
  healthMakeRowTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  healthMakeSub: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, marginTop: 3 },
  healthMakeTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '600' },
  healthMiniChartWrap: { height: 56, marginTop: 12, overflow: 'hidden' },
  healthMemoEditorMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, gap: 14, padding: 16, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.07, shadowRadius: 24 },
  healthMemoIconMake: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  healthMemoMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, gap: 12, marginTop: 14, padding: 16 },
  healthReminderCard: { alignItems: 'center', backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.26)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.08, shadowRadius: 22 },
  healthReminderIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  healthReminderText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17, marginTop: 2 },
  healthReminderTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700', lineHeight: 19 },
  healthRecentLink: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  healthRecentTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  healthSectionStack: { gap: 10, marginTop: 14 },
  healthTimelineCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, marginTop: 14, paddingHorizontal: 14, paddingVertical: 8 },
  healthTimelineIcon: { alignItems: 'center', backgroundColor: 'rgba(255,138,92,0.15)', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  healthTimelineIconCool: { backgroundColor: 'rgba(77,182,172,0.18)' },
  healthTimelineIconMuted: { backgroundColor: 'rgba(200,168,113,0.18)' },
  healthTimelineRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 10 },
  heroCard: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 16 },
  homeBellButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.78)', borderColor: palette.border, borderRadius: 19, borderWidth: 1, height: 38, justifyContent: 'center', position: 'relative', width: 38 },
  homeBellDot: { backgroundColor: palette.orange, borderColor: '#fff', borderRadius: 4, borderWidth: 1.5, height: 7, position: 'absolute', right: 9, top: 8, width: 7 },
  homeHealthCard: { alignItems: 'center', backgroundColor: '#ffe3cb', borderColor: 'rgba(255,255,255,0.7)', borderRadius: 22, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 18, paddingVertical: 15, shadowColor: '#8b5e3c', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.12, shadowRadius: 24 },
  homeHealthDelta: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.22)', borderRadius: 10, flexDirection: 'row', gap: 2, marginLeft: 6, paddingHorizontal: 8, paddingVertical: 3 },
  homeHealthDeltaText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600' },
  homeHealthDesc: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 17, marginTop: 8 },
  homeHealthLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500' },
  homeHealthRing: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: 32, height: 64, justifyContent: 'center', overflow: 'hidden', position: 'relative', width: 64 },
  homeHealthRingInner: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 25, height: 50, justifyContent: 'center', width: 50, zIndex: 2 },
  homeHealthRingTrack: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'conic-gradient(from -90deg, #4DB6AC 0% 92%, rgba(255,255,255,0.64) 92% 100%)' } as object) : null), backgroundColor: palette.teal, borderRadius: 32, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  homeHealthScore: { color: palette.ink, fontFamily: appFontFamily, fontSize: 36, fontWeight: '700', letterSpacing: 0, lineHeight: 38 },
  homeHealthScoreRow: { alignItems: 'baseline', flexDirection: 'row', gap: 2, marginTop: 4 },
  homeHealthTotal: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '500' },
  homeMomentAutoPill: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.15)', borderRadius: 11, flexDirection: 'row', gap: 3, paddingHorizontal: 8, paddingVertical: 4 },
  homeMomentAutoText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '700' },
  homeMomentAvatarStack: { height: 48, position: 'relative', width: 98 },
  homeMomentBody: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  homeMomentCard: { backgroundColor: '#FFFCF8', borderColor: 'rgba(255,255,255,0.9)', borderRadius: 24, borderWidth: 1, marginTop: 8, paddingHorizontal: 12, paddingBottom: 9, paddingTop: 12, shadowColor: '#8b5e3c', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.08, shadowRadius: 24 },
  homeMomentCopy: { flex: 1, minWidth: 0 },
  homeMomentDistance: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.12)', borderRadius: 9, flexDirection: 'row', gap: 2, maxWidth: 82, paddingHorizontal: 6, paddingVertical: 2 },
  homeMomentDistanceText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 10, fontWeight: '700' },
  homeMomentDot: { backgroundColor: 'rgba(122,121,114,0.22)', borderRadius: 3, height: 6, width: 6 },
  homeMomentDotActive: { backgroundColor: palette.orange, width: 16 },
  homeMomentDots: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  homeMomentFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', marginTop: 7 },
  homeMomentHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  homeMomentIcon: { alignItems: 'center', backgroundColor: 'rgba(255,138,92,0.15)', borderRadius: 11, height: 24, justifyContent: 'center', width: 24 },
  homeMomentLayer: { backgroundColor: '#FFFDFC', borderColor: 'rgba(255,255,255,0.96)', borderRadius: 19, borderWidth: 1, marginTop: 8, paddingHorizontal: 8, paddingVertical: 7, shadowColor: '#8b5e3c', shadowOffset: { height: 7, width: 0 }, shadowOpacity: 0.06, shadowRadius: 14 },
  homeMomentEmptyIcon: { alignItems: 'center', backgroundColor: '#F7EEE7', borderColor: '#FFF9F2', borderRadius: 25, borderWidth: 1, height: 50, justifyContent: 'center', width: 50 },
  homeMomentLoadingBody: { alignItems: 'center', flexDirection: 'row', gap: 16, minHeight: 62, paddingHorizontal: 8, paddingVertical: 3 },
  homeMomentMeta: { color: '#A98566', fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '600', marginTop: 4 },
  homeMomentName: { color: palette.ink, flexShrink: 1, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '800', lineHeight: 18 },
  homeMomentNameRow: { alignItems: 'center', flexDirection: 'row', gap: 6, minWidth: 0 },
  homeMomentRefreshChip: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFF1E4', borderRadius: 10, flexDirection: 'row', gap: 4, marginTop: 6, paddingHorizontal: 8, paddingVertical: 4 },
  homeMomentRefreshText: { color: '#B9784B', fontFamily: appFontFamily, fontSize: 9.5, fontWeight: '800' },
  homeMomentRetryChip: { alignItems: 'center', alignSelf: 'flex-end', backgroundColor: '#FFF4EA', borderRadius: 11, flexDirection: 'row', gap: 4, marginTop: 4, paddingHorizontal: 8, paddingVertical: 5 },
  homeMomentRetryText: { color: '#B9784B', fontFamily: appFontFamily, fontSize: 9.5, fontWeight: '800' },
  homeMomentSkeletonColumn: { gap: 10, width: 88 },
  homeMomentSkeletonColumnWide: { flex: 1, gap: 9, minWidth: 0 },
  homeMomentSkeletonLine: { backgroundColor: '#F0E6DC', borderRadius: 8, height: 11 },
  homeMomentSkeletonLineFull: { width: '100%' },
  homeMomentSkeletonLineLong: { width: 82 },
  homeMomentSkeletonLineMid: { width: '72%' },
  homeMomentSkeletonLineMini: { height: 9, width: 48 },
  homeMomentSkeletonLineShort: { width: 55 },
  homeMomentSkeletonLineWide: { width: '88%' },
  homeMomentStackAvatar: { borderColor: '#FFFDFC', borderRadius: 23, borderWidth: 2, height: 46, overflow: 'hidden', position: 'absolute', top: 1, width: 46 },
  homeMomentStateActionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  homeMomentStateBody: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 60, paddingHorizontal: 8, paddingVertical: 3 },
  homeMomentStateCopy: { flex: 1, minWidth: 0 },
  homeMomentStateCta: { alignItems: 'center', backgroundColor: '#D08A54', borderRadius: 13, justifyContent: 'center', minWidth: 78, paddingHorizontal: 12, paddingVertical: 6 },
  homeMomentStateCtaText: { color: '#fff', fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '800' },
  homeMomentStateSubtle: { color: '#B09986', flex: 1, fontFamily: appFontFamily, fontSize: 10, fontWeight: '600', marginRight: 8 },
  homeMomentStateText: { color: '#8A7667', fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 16, marginTop: 4 },
  homeMomentStateTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '800', lineHeight: 19 },
  homeMomentText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', lineHeight: 16.5, marginTop: 3 },
  homeMomentThumb: { backgroundColor: '#fff', borderColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 2, height: 76, overflow: 'hidden', shadowColor: '#8b5e3c', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.14, shadowRadius: 14, width: 76 },
  homeMomentThumbImage: { height: '100%', width: '100%' },
  homeMomentTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '800', letterSpacing: 0 },
  homeMomentTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  homeMakeGreeting: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12, minWidth: 0 },
  homeMakeChatEntry: { alignItems: 'center', alignSelf: 'stretch', flexDirection: 'row', gap: 2, maxWidth: '100%', minWidth: 0, paddingRight: 2, paddingVertical: 2 },
  homeMakeHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingTop: 6 },
  homeMakeHeadline: { color: palette.ink, flex: 1, flexShrink: 1, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700', letterSpacing: 0, lineHeight: 17, minWidth: 0 },
  homeMakeKicker: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500' },
  homeMakePage: { gap: 0, position: 'relative' },
  homeOnlineBadge: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.16)', borderRadius: 14, bottom: 8, flexDirection: 'row', gap: 5, left: 34, paddingHorizontal: 11, paddingVertical: 5, position: 'absolute', zIndex: 4 },
  homeOnlineDot: { backgroundColor: palette.teal, borderRadius: 3, height: 6, width: 6 },
  homeOnlineText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  homePetAvatarShell: { alignItems: 'center', backgroundColor: '#FFEDD9', borderColor: '#fff', borderRadius: 112, borderWidth: 4, height: 224, justifyContent: 'center', overflow: 'hidden', shadowColor: '#b46e3c', shadowOffset: { height: 28, width: 0 }, shadowOpacity: 0.26, shadowRadius: 56, width: 224, zIndex: 2 },
  homePetGlow: { backgroundColor: 'rgba(255,138,92,0.20)', borderRadius: 148, height: 296, position: 'absolute', width: 296 },
  homePetIdentityBlock: { alignItems: 'center', marginTop: 0, position: 'relative', zIndex: 5 },
  homePetRing: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'conic-gradient(from 210deg, rgba(255,138,92,0.42), rgba(77,182,172,0.38), rgba(255,200,140,0.42), rgba(255,138,92,0.42))' } as object) : null), backgroundColor: 'rgba(255,138,92,0.12)', borderRadius: 122, height: 244, opacity: 0.86, position: 'absolute', width: 244, zIndex: 1 },
  homePetMeta: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500' },
  homePetName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 22, fontWeight: '700', letterSpacing: 0, lineHeight: 27 },
  homePetNameRow: { alignItems: 'center', flexDirection: 'row', gap: 2, justifyContent: 'center' },
  homePetStage: { alignItems: 'center', height: 286, justifyContent: 'center', marginBottom: 2, marginTop: 4, position: 'relative', zIndex: 2 },
  homeQuickGrid: { columnGap: 12, flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, rowGap: 12 },
  homeStoryIcon: { alignItems: 'center', backgroundColor: 'rgba(255,138,92,0.14)', borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  homeStoryStrip: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, paddingHorizontal: 14, paddingVertical: 9, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.08, shadowRadius: 24 },
  homeStorySub: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, marginTop: 2 },
  homeStoryTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
  homeIndicator: { alignSelf: 'center', backgroundColor: palette.ink, borderRadius: 999, bottom: 9, height: 4, opacity: 0.9, position: 'absolute', width: 134 },
  iconButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderColor: 'transparent', borderRadius: 18, borderWidth: 0, height: 36, justifyContent: 'center', width: 36 },
  inlineError: { color: palette.danger, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600' },
  inlineErrorRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 10 },
  inlineErrorText: { color: palette.danger, flex: 1, fontFamily: appFontFamily, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  inlineActionRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  inlineDeleteButton: { alignItems: 'center', backgroundColor: 'rgba(122,121,114,0.12)', borderRadius: 999, justifyContent: 'center', paddingHorizontal: 9, paddingVertical: 5 },
  inlineDeleteText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  inlineNotice: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600' },
  inlineRetryButton: { alignItems: 'center', backgroundColor: '#ffdad6', borderRadius: 999, justifyContent: 'center', paddingHorizontal: 9, paddingVertical: 5 },
  inlineRetryText: { color: palette.danger, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  infoChip: { backgroundColor: palette.background, borderRadius: 14, color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 10, textAlign: 'center' },
  infoChipRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  label: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500' },
  loginForm: { gap: 0, marginTop: 32 },
  loginHero: { marginTop: 50 },
  loginContent: { flex: 1, paddingHorizontal: 28 },
  loginSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, lineHeight: 21, marginTop: 8 },
  loginSuccessDotActiveMake: { backgroundColor: palette.orange },
  loginSuccessDotMake: { backgroundColor: 'rgba(255,138,92,0.25)', borderRadius: 3, height: 6, width: 6 },
  loginSuccessDotsMake: { flexDirection: 'row', gap: 8, marginTop: 32 },
  loginSuccessHintMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  loginSuccessLoadingRowMake: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 36 },
  loginSuccessLoadingTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '500', lineHeight: 24 },
  loginSuccessPageMake: { alignItems: 'center', backgroundColor: palette.background, flex: 1, justifyContent: 'center', paddingHorizontal: 32, position: 'relative' },
  loginSmsButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 26, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center', marginTop: 28, shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.22, shadowRadius: 22 },
  loginSmsButtonCountdown: { backgroundColor: palette.pale, shadowOpacity: 0 },
  loginSmsButtonDisabled: { backgroundColor: '#F1D9CB', shadowOpacity: 0 },
  loginSmsButtonPressed: { backgroundColor: '#F2774A', transform: [{ scale: 0.99 }] },
  loginSmsButtonText: { color: '#fff', fontFamily: appFontFamily, fontSize: 16, fontWeight: '500' },
  loginSmsButtonTextCountdown: { color: palette.muted },
  loginTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 28, fontWeight: '600', includeFontPadding: false, letterSpacing: 0, lineHeight: 35 },
  loginTitleBlock: { maxWidth: '100%' },
  loginTitleLine: { color: palette.ink, fontFamily: appFontFamily, fontSize: 28, fontWeight: '600', includeFontPadding: false, letterSpacing: 0, lineHeight: 35, maxWidth: '100%' },
  logoMark: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 12, height: 36, justifyContent: 'center', width: 36 },
  logoRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 18 },
  logoText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '600' },
  longTextInput: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1.5, color: palette.ink, fontFamily: appFontFamily, fontSize: 14, lineHeight: 21, minHeight: 130, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top' },
  logoutConfirmSheetMake: { alignItems: 'center', gap: 0, paddingBottom: 20, paddingHorizontal: 20, paddingTop: 10 },
  logoutButton: { alignItems: 'center', backgroundColor: '#ffdad6', borderRadius: 18, flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 52 },
  logoutSheetActionsMake: { alignSelf: 'stretch', gap: 10, marginTop: 22 },
  logoutSheetBodyMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 21, marginTop: 8, paddingHorizontal: 12, textAlign: 'center' },
  logoutSheetIconMake: { alignItems: 'center', backgroundColor: '#FBE4DE', borderRadius: 18, height: 60, justifyContent: 'center', marginBottom: 14, marginTop: 4, width: 60 },
  logoutSheetTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 18, fontWeight: '700', lineHeight: 25, textAlign: 'center' },
  logoutText: { color: palette.danger, fontFamily: appFontFamily, fontSize: 15, fontWeight: '700' },
  sheetDangerButtonMake: { alignItems: 'center', backgroundColor: palette.danger, borderRadius: 14, flexDirection: 'row', gap: 8, height: 48, justifyContent: 'center', shadowColor: palette.danger, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.18, shadowRadius: 18 },
  sheetDangerButtonTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  sheetGhostButtonMake: { alignItems: 'center', backgroundColor: '#F4EFE6', borderRadius: 14, height: 48, justifyContent: 'center' },
  sheetGhostButtonTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  mapCanvas: { backgroundColor: '#eef2ec', borderRadius: 24, height: 330, overflow: 'hidden', position: 'relative' },
  mapLabel: { backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 999, color: '#5e7d75', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', left: 18, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, position: 'absolute', top: 18 },
  mapMarker: { alignItems: 'center', backgroundColor: palette.orange, borderColor: '#fff', borderRadius: 999, borderWidth: 3, height: 50, justifyContent: 'center', left: '48%', position: 'absolute', top: '48%', width: 50 },
  mapPatchA: { backgroundColor: '#cfe7d2', borderRadius: 44, height: 128, left: -20, position: 'absolute', top: 32, transform: [{ rotate: '-18deg' }], width: 160 },
  mapPatchB: { backgroundColor: '#cfe8e7', borderRadius: 52, bottom: -26, height: 132, position: 'absolute', right: -34, transform: [{ rotate: '16deg' }], width: 190 },
  mapRoad: { backgroundColor: '#fffaf4', borderColor: 'rgba(218,206,192,0.8)', borderRadius: 999, borderWidth: 1, height: 24, left: -40, position: 'absolute', right: -40, top: 144, transform: [{ rotate: '-11deg' }] },
  mapAreaLabel: { backgroundColor: 'rgba(255,255,255,0.74)', borderRadius: 999, color: '#5e7d75', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', left: 22, maxWidth: 190, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5, position: 'absolute', top: 116 },
  mapBottomSheet: { backgroundColor: 'rgba(255,253,249,0.98)', borderColor: 'rgba(234,223,210,0.9)', borderRadius: 28, borderWidth: 1, gap: 10, marginTop: -56, padding: 14, shadowColor: '#50371e', shadowOffset: { height: -10, width: 0 }, shadowOpacity: 0.12, shadowRadius: 24 },
  mapBottomSheetMake: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 82, gap: 10, left: 0, maxHeight: 360, overflow: 'hidden', paddingBottom: 18, paddingHorizontal: 20, paddingTop: 10, position: 'absolute', right: 0, shadowColor: '#000', shadowOffset: { height: -18, width: 0 }, shadowOpacity: 0.16, shadowRadius: 40 },
  mapBottomSheetCollapsedMake: { maxHeight: 92, paddingBottom: 12 },
  mapChipFloat: { alignItems: 'center', backgroundColor: 'rgba(255,253,249,0.92)', borderColor: 'rgba(234,223,210,0.78)', borderRadius: 999, borderWidth: 1, height: 34, justifyContent: 'center', paddingHorizontal: 13 },
  mapChipFloatActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  mapChipText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  mapChipTextActive: { color: '#fff' },
  mapChipMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: palette.border, borderRadius: 16, borderWidth: 1, height: 34, justifyContent: 'center', paddingHorizontal: 14, shadowColor: '#000', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.12, shadowRadius: 18 },
  mapChipMakeActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  mapChipMakeText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500' },
  mapChipMakeTextActive: { color: '#fff', fontWeight: '600' },
  mapContent: { flex: 1, position: 'relative' },
  mapControlStack: { gap: 8, position: 'absolute', right: 16, top: 226 },
  mapCtrlButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, height: 40, justifyContent: 'center', shadowColor: '#000', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.16, shadowRadius: 18, width: 40 },
  mapCtrlButtonActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  mapDimOverlayMake: { backgroundColor: 'rgba(27,28,25,0.30)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 2 },
  mapDistanceFilterLabelMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  mapDistanceFilterRowMake: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 14, paddingHorizontal: 4 },
  mapDistanceThumbMake: { backgroundColor: '#fff', borderColor: palette.orange, borderRadius: 10, borderWidth: 2, height: 20, left: '55%', marginLeft: -10, marginTop: -10, position: 'absolute', shadowColor: '#50371e', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.18, shadowRadius: 8, top: '50%', width: 20 },
  mapDistanceTrackFillMake: { backgroundColor: palette.orange, borderRadius: 3, bottom: 0, left: 0, position: 'absolute', top: 0, width: '55%' },
  mapDistanceTrackMake: { backgroundColor: palette.pale, borderRadius: 3, flex: 1, height: 6, position: 'relative' },
  mapDistanceValueMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '800' },
  mapFauxFull: { backgroundColor: '#eef2ec', height: 620, overflow: 'hidden', position: 'relative' },
  mapFauxFullNight: { backgroundColor: '#17222b' },
  mapFauxFullSatellite: { backgroundColor: '#2b3b32' },
  mapFauxFullStandard: { backgroundColor: '#edf1ec' },
  mapFilterFloat: { gap: 8, paddingHorizontal: 14 },
  mapFilterFloatMake: { gap: 8, paddingHorizontal: 16 },
  mapFilterRightFadeMake: { backgroundColor: 'rgba(255,255,255,0.72)', height: 40, position: 'absolute', right: 0, top: 64, width: 18, zIndex: 4 },
  mapFilterScroller: { left: 0, position: 'absolute', right: 0, top: 74, zIndex: 2 },
  mapFilterScrollerMake: { left: 0, position: 'absolute', right: 0, top: 64, zIndex: 4 },
  mapFilterSearchContentMake: { gap: 8, paddingRight: 4 },
  mapFilterSearchScrollerMake: { marginHorizontal: -2 },
  mapFilterWrapMake: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mapGreenPatchA: { backgroundColor: '#cfe7d2', borderRadius: 36, height: 122, left: -26, opacity: 0.96, position: 'absolute', top: 34, transform: [{ rotate: '-18deg' }], width: 150 },
  mapGreenPatchB: { backgroundColor: '#dcefd8', borderRadius: 46, bottom: 44, height: 126, opacity: 0.96, position: 'absolute', right: -34, transform: [{ rotate: '16deg' }], width: 184 },
  mapGreenPatchNight: { backgroundColor: '#244238', opacity: 0.88 },
  mapGreenPatchSatellite: { backgroundColor: '#385f3d', opacity: 0.9 },
  mapHero: { backgroundColor: '#eef2ec', borderRadius: 26, height: 456, marginHorizontal: -6, overflow: 'hidden', position: 'relative' },
  mapLocationBottomActionsMake: { bottom: 132, flexDirection: 'row', gap: 8, left: 16, position: 'absolute', right: 16, zIndex: 5 },
  mapLocationCenterIconMake: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 38, height: 76, justifyContent: 'center', shadowColor: '#000', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.16, shadowRadius: 30, width: 76 },
  mapLocationCenterMake: { alignItems: 'center', left: 0, paddingHorizontal: 40, position: 'absolute', right: 0, top: 280, zIndex: 4 },
  mapLocationCenterTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500', lineHeight: 21, marginTop: 8, textAlign: 'center' },
  mapLocationCenterTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '700', letterSpacing: 0, lineHeight: 24, marginTop: 18, textAlign: 'center' },
  mapLocationErrorBanner: { alignItems: 'center', backgroundColor: '#fff', borderColor: 'rgba(229,87,63,0.25)', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 9, left: 16, paddingHorizontal: 12, paddingVertical: 10, position: 'absolute', right: 16, shadowColor: '#000', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.1, shadowRadius: 22, top: 64, zIndex: 6 },
  mapLocationErrorIcon: { alignItems: 'center', backgroundColor: 'rgba(229,87,63,0.14)', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  mapLocationErrorRetry: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 12, flexDirection: 'row', gap: 4, minHeight: 32, paddingHorizontal: 12, paddingVertical: 7 },
  mapLocationErrorRetryText: { color: '#fff', fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  mapLocationErrorText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, lineHeight: 15, marginTop: 1 },
  mapLocationErrorTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700', lineHeight: 17 },
  mapLocationFailureVeilMake: { backgroundColor: 'rgba(238,242,236,0.55)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 1 },
  mapLocationGhostActionMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 7, height: 48, justifyContent: 'center', shadowColor: '#000', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.10, shadowRadius: 22 },
  mapLocationGhostActionTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  mapLocationPrimaryActionMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 18, flex: 1, flexDirection: 'row', gap: 7, height: 48, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.24, shadowRadius: 24 },
  mapLocationPrimaryActionTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14, fontWeight: '800' },
  mapMarkerMain: { alignItems: 'center', backgroundColor: palette.orange, borderColor: '#fff', borderRadius: 999, borderWidth: 3, height: 48, justifyContent: 'center', left: '49%', position: 'absolute', top: '50%', shadowColor: palette.orange, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.28, shadowRadius: 18, width: 48 },
  mapMarkerSmallA: { alignItems: 'center', backgroundColor: palette.card, borderColor: 'rgba(234,223,210,0.88)', borderRadius: 999, borderWidth: 1, height: 38, justifyContent: 'center', left: '25%', position: 'absolute', top: '29%', shadowColor: '#50371e', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.12, shadowRadius: 12, width: 38 },
  mapMarkerSmallB: { alignItems: 'center', backgroundColor: palette.card, borderColor: 'rgba(234,223,210,0.88)', borderRadius: 999, borderWidth: 1, bottom: 92, height: 34, justifyContent: 'center', position: 'absolute', right: 86, shadowColor: '#50371e', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.12, shadowRadius: 12, width: 34 },
  mapNativeWarmOverlay: { backgroundColor: 'rgba(255,244,229,0.18)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  nativeAmap: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  mapPage: { gap: 0 },
  mapPageFull: { flex: 1, position: 'relative' },
  mapRoadMain: { backgroundColor: '#fffaf4', borderColor: 'rgba(218,206,192,0.82)', borderRadius: 999, borderWidth: 1, height: 23, left: -44, position: 'absolute', right: -36, top: 178, transform: [{ rotate: '-11deg' }] },
  mapRoadNight: { backgroundColor: '#263749', borderColor: 'rgba(130,158,172,0.24)' },
  mapRoadSatellite: { backgroundColor: '#d0d0bd', borderColor: 'rgba(255,255,255,0.28)', opacity: 0.58 },
  mapRoadSecond: { backgroundColor: '#fffaf4', borderColor: 'rgba(218,206,192,0.72)', borderRadius: 999, borderWidth: 1, bottom: 106, height: 19, left: -30, position: 'absolute', right: -22, transform: [{ rotate: '19deg' }] },
  mapRoadThird: { backgroundColor: '#fffaf4', borderColor: 'rgba(218,206,192,0.68)', borderRadius: 999, borderWidth: 1, height: 18, left: 148, position: 'absolute', top: -20, transform: [{ rotate: '82deg' }], width: 18 },
  mapSearchAction: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  mapSearchActionDisabled: { opacity: 0.72 },
  mapSearchActionMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  mapSearchClearButtonMake: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  mapSearchFloat: { alignItems: 'center', backgroundColor: 'rgba(255,253,249,0.96)', borderColor: 'rgba(234,223,210,0.86)', borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 9, left: 14, minHeight: 48, paddingLeft: 14, paddingRight: 6, position: 'absolute', right: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.1, shadowRadius: 18, top: 14, zIndex: 3 },
  mapSearchFloatMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(255,255,255,0.85)', borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 8, height: 48, left: 16, paddingLeft: 16, paddingRight: 10, position: 'absolute', right: 16, shadowColor: '#000', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.14, shadowRadius: 30, top: 6, zIndex: 5 },
  mapSearchInput: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, minHeight: 40 },
  mapSearchFilterHeadMake: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  mapSearchFilterTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '800' },
  mapSearchResetMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '800' },
  mapSearchResultHeaderMake: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 16 },
  mapSearchResultListMake: { gap: 10, paddingBottom: 24 },
  mapSearchResultSheetMake: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, bottom: 0, left: 0, paddingBottom: 16, paddingHorizontal: 20, paddingTop: 16, position: 'absolute', right: 0, shadowColor: '#000', shadowOffset: { height: -20, width: 0 }, shadowOpacity: 0.20, shadowRadius: 40, top: 110, zIndex: 6 },
  mapSegmentButtonActiveMake: { backgroundColor: palette.orange, shadowColor: palette.orange, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.24, shadowRadius: 16 },
  mapSegmentButtonMake: { alignItems: 'center', backgroundColor: palette.background, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 34, paddingVertical: 8 },
  mapSegmentRowMake: { flexDirection: 'row', gap: 8, marginTop: 12 },
  mapSegmentTextActiveMake: { color: '#fff', fontWeight: '700' },
  mapSegmentTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  mapSheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  mapSheetHeaderButtonMake: { alignSelf: 'stretch' },
  mapSheetToggleIconMake: { alignItems: 'center', backgroundColor: palette.pale, borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexShrink: 0, height: 28, justifyContent: 'center', marginLeft: 10, width: 28 },
  mapPlacesSheetScrollContentMake: { gap: 10, paddingBottom: 6 },
  mapPlacesSheetScrollMake: { maxHeight: 282 },
  mapPickBannerMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: 'rgba(255,138,92,0.24)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 10, left: 16, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, position: 'absolute', right: 16, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.12, shadowRadius: 24, top: 62, zIndex: 7 },
  mapPickCancelMake: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 14, flexShrink: 0, height: 28, justifyContent: 'center', paddingHorizontal: 10 },
  mapPickCancelTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '800' },
  mapPickIconMake: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 14, flexShrink: 0, height: 28, justifyContent: 'center', width: 28 },
  mapPickSubMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', lineHeight: 15, marginTop: 1 },
  mapPickTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '800', lineHeight: 17 },
  mapStyleCurrent: { backgroundColor: palette.orangeSoft, borderRadius: 999, color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  mapStyleCloseButton: { alignItems: 'center', backgroundColor: palette.background, borderColor: palette.border, borderRadius: 999, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  mapStyleHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  mapStyleHeaderActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  mapStyleOption: { alignItems: 'center', backgroundColor: palette.background, borderColor: palette.border, borderRadius: 14, borderWidth: 1, flex: 1, minHeight: 34, justifyContent: 'center', paddingHorizontal: 8 },
  mapStyleOptionActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  mapStyleOptions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  mapStyleOptionText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  mapStyleOptionTextActive: { color: '#fff' },
  mapStylePanelSheet: { gap: 12 },
  mapStyleSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17, marginTop: 2, maxWidth: 238 },
  mapStyleTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  mapTrafficLineA: { backgroundColor: 'rgba(255,138,92,0.78)', borderRadius: 999, height: 4, left: 18, position: 'absolute', right: 70, top: 188, transform: [{ rotate: '-11deg' }], zIndex: 1 },
  mapTrafficLineB: { backgroundColor: 'rgba(77,182,172,0.72)', borderRadius: 999, bottom: 116, height: 4, left: 82, position: 'absolute', right: 22, transform: [{ rotate: '19deg' }], zIndex: 1 },
  mapTrafficState: { backgroundColor: palette.pale, borderRadius: 999, color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4 },
  mapTrafficStateOn: { backgroundColor: palette.orangeSoft, color: palette.orange },
  mapTrafficSub: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 2 },
  mapTrafficTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '800' },
  mapTrafficToggle: { alignItems: 'center', backgroundColor: palette.background, borderRadius: 16, flexDirection: 'row', gap: 10, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8 },
  mapWaterPatch: { backgroundColor: '#cfe8e7', borderRadius: 46, bottom: -34, height: 118, left: -28, opacity: 0.96, position: 'absolute', right: -34, transform: [{ rotate: '-7deg' }] },
  mapWaterPatchNight: { backgroundColor: '#1d4350', opacity: 0.92 },
  mapWaterPatchSatellite: { backgroundColor: '#244b56', opacity: 0.9 },
  mapAreaLabelNight: { backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.76)' },
  mascot: { alignItems: 'center', backgroundColor: '#f2c28a', justifyContent: 'center', overflow: 'hidden' },
  makeIconChip: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.78)', borderColor: palette.border, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', position: 'relative', width: 36 },
  makeBottomActions: { gap: 12, marginTop: 22 },
  makeDetailLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', lineHeight: 19, width: 78 },
  makeDetailRow: { alignItems: 'center', flexDirection: 'row', gap: 14, minHeight: 44, paddingVertical: 10 },
  makeDetailRowInset: { paddingHorizontal: 16 },
  makeDetailValue: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '600', lineHeight: 20, minWidth: 0, textAlign: 'left' },
  makeDetailValueRight: { maxWidth: 220, textAlign: 'right' },
  makeDivider: { backgroundColor: palette.border, height: 1 },
  makeIntroCopy: { flex: 1, gap: 4, minWidth: 0 },
  makeIntroHeader: { alignItems: 'center', flexDirection: 'row', gap: 13, marginTop: 4, paddingHorizontal: 8 },
  makeIntroSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 19 },
  makeIntroTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 20, fontWeight: '600', lineHeight: 27 },
  makePageSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, lineHeight: 21, marginTop: 7 },
  makePageTitleBlock: { marginTop: 2, paddingHorizontal: 6 },
  makeScreenTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 22, fontWeight: '700', letterSpacing: 0, lineHeight: 28 },
  makeStepDot: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 10, height: 20, justifyContent: 'center', width: 20 },
  makeStepDotActive: { backgroundColor: 'rgba(255,138,92,0.16)' },
  makeStepDotDone: { backgroundColor: 'rgba(77,182,172,0.18)' },
  makeStepInnerDot: { backgroundColor: palette.muted, borderRadius: 3, height: 5, opacity: 0.45, width: 5 },
  makeStepInnerDotActive: { backgroundColor: palette.orange, borderRadius: 4, height: 7, opacity: 1, width: 7 },
  makeStepRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 7 },
  makeStepText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
  makeStepTextMuted: { color: palette.muted, fontWeight: '600', opacity: 0.65 },
  menuIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  menuRow: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 60, paddingHorizontal: 14 },
  menuTitle: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, fontWeight: '700' },
  messageRetryActions: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  messageRetryButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 12, flexDirection: 'row', gap: 4, minHeight: 32, paddingHorizontal: 12, paddingVertical: 7 },
  messageRetryButtonText: { color: '#fff', fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  messageRetryCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.09, shadowRadius: 18 },
  messageRetryCardMe: { alignSelf: 'flex-end' },
  messageRetryDelete: { alignItems: 'center', justifyContent: 'center', minHeight: 32, paddingHorizontal: 2 },
  messageRetryDeleteText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  messageRetryIcon: { alignItems: 'center', backgroundColor: 'rgba(229,87,63,0.12)', borderRadius: 15, height: 30, justifyContent: 'center', width: 30 },
  messageRetryText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  messageRetryTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  conversationAiAvatarRingMake: { alignItems: 'center', borderColor: palette.orange, borderRadius: 27, borderWidth: 2, height: 54, justifyContent: 'center', overflow: 'hidden', width: 54 },
  conversationAiBadge: { alignItems: 'center', backgroundColor: palette.orange, borderColor: '#fff', borderRadius: 10, borderWidth: 2, bottom: -3, height: 20, justifyContent: 'center', position: 'absolute', right: -3, width: 20 },
  conversationAvatarWrap: { position: 'relative' },
  conversationHeaderAvatarMake: { position: 'relative' },
  conversationHeaderOwnerBadgeMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#fff', borderRadius: 10, borderWidth: 2, bottom: -3, height: 20, justifyContent: 'center', position: 'absolute', right: -3, shadowColor: '#50371e', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.12, shadowRadius: 10, width: 20 },
  conversationMakeRow: { alignItems: 'center', borderBottomColor: palette.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 74, paddingVertical: 12 },
  conversationInvitePrefixMake: { color: palette.orange, flexShrink: 0, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700', lineHeight: 18, marginRight: 4 },
  conversationMakeText: { color: 'rgba(27,28,25,0.78)', flex: 1, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 18 },
  conversationMakeTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '600', lineHeight: 20 },
  conversationMetaCol: { alignItems: 'flex-end', gap: 7 },
  conversationOwnerBadge: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#fff', borderRadius: 11, borderWidth: 2, bottom: -3, height: 22, justifyContent: 'center', position: 'absolute', right: -3, shadowColor: '#50371e', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.12, shadowRadius: 10, width: 22 },
  conversationPreviewRowMake: { alignItems: 'center', flexDirection: 'row', marginTop: 4, minWidth: 0 },
  conversationSystemBubble: { alignSelf: 'center', backgroundColor: 'rgba(122,121,114,0.10)', borderRadius: 14, maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 7 },
  conversationSystemText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17, textAlign: 'center' },
  composerCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, gap: 8, padding: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 18 },
  dailyAiActionMake: { color: palette.orange, flexShrink: 0, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700', paddingHorizontal: 2, paddingVertical: 2 },
  dailyAiCardMake: { alignItems: 'flex-start', backgroundColor: 'rgba(255,138,92,0.08)', borderColor: 'rgba(255,138,92,0.22)', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 2, paddingHorizontal: 16, paddingVertical: 14 },
  dailyAiIconMake: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, flexShrink: 0, height: 34, justifyContent: 'center', width: 34 },
  dailyAiTextMake: { color: 'rgba(27,28,25,0.86)', fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500', lineHeight: 21, marginTop: 6 },
  dailyAiTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700' },
  dailyBottomBarMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderColor: palette.border, borderRadius: 28, borderWidth: 1, flexDirection: 'row', height: 56, justifyContent: 'space-between', marginTop: 2, paddingHorizontal: 18, shadowColor: '#50371e', shadowOffset: { height: 16, width: 0 }, shadowOpacity: 0.18, shadowRadius: 36 },
  dailyChipActiveMake: { backgroundColor: 'rgba(255,138,92,0.12)', borderColor: palette.orange, color: palette.orange, fontWeight: '700' },
  dailyChipMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6 },
  dailyChipRowMake: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  dailyHeaderPublishMake: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  dailyHeaderPublishTextMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  dailyPetChipMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.08, shadowRadius: 22 },
  dailyPetChipSubMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 16, marginTop: 2 },
  dailyPetChipTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  dailyPhotoAddMake: { alignItems: 'center', aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.58)', borderColor: palette.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1.5, flex: 1, gap: 4, justifyContent: 'center' },
  dailyPhotoAddTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700' },
  dailyPhotoPlaceholderMake: { alignItems: 'center', aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.38)', borderColor: 'rgba(122,121,114,0.14)', borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, flex: 1, justifyContent: 'center' },
  dailyPhotoRowMake: { flexDirection: 'row', gap: 8 },
  dailyPhotoSquareMake: { aspectRatio: 1, borderColor: '#fff', borderRadius: 14, borderWidth: 2, flex: 1, overflow: 'hidden', shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.12, shadowRadius: 18 },
  dailyPostPageMake: { gap: 12, marginTop: -2 },
  dailyPublishPillDisabledMake: { opacity: 0.82 },
  dailyPublishPillMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 16, flexDirection: 'row', gap: 5, minHeight: 34, paddingHorizontal: 14, shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.34, shadowRadius: 22 },
  dailyPublishPillTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  dailyTextareaMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '500', lineHeight: 25, minHeight: 130, padding: 0, textAlignVertical: 'top' },
  dailyTextCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, minHeight: 130, paddingHorizontal: 16, paddingVertical: 14 },
  dailyToolButtonMake: { alignItems: 'center', height: 34, justifyContent: 'center', width: 28 },
  dailyToolRowMake: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  greetingRequestActionGhostMake: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 18, flex: 1, flexDirection: 'row', gap: 4, height: 36, justifyContent: 'center' },
  greetingRequestActionGhostTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500' },
  greetingRequestActionPrimaryMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 18, flex: 1.4, flexDirection: 'row', gap: 4, height: 36, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.28, shadowRadius: 18 },
  greetingRequestActionPrimaryTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700' },
  greetingRequestActionReportMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 4, height: 36, justifyContent: 'center' },
  greetingRequestActionReportTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500' },
  greetingRequestActionsMake: { flexDirection: 'row', gap: 8, marginTop: 12 },
  greetingRequestAvatarWrapMake: { flexShrink: 0, height: 56, position: 'relative', width: 56 },
  greetingRequestCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, padding: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.08, shadowRadius: 24 },
  greetingRequestMessageMake: { color: 'rgba(27,28,25,0.85)', fontFamily: appFontFamily, fontSize: 13, fontWeight: '500', lineHeight: 21, marginTop: 8 },
  greetingRequestMetaMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '500', lineHeight: 16, marginTop: 2 },
  greetingRequestOwnerAvatarMake: { backgroundColor: '#fff', borderColor: '#fff', borderRadius: 11, borderWidth: 2, bottom: 0, height: 22, overflow: 'hidden', position: 'absolute', right: 0, width: 22 },
  greetingRequestPetPhotoMake: { backgroundColor: palette.pale, borderRadius: 14, height: 48, overflow: 'hidden', width: 48 },
  greetingRequestSafetyMake: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 14, paddingVertical: 10 },
  greetingRequestSafetyTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  greetingRequestSummaryBadgeMake: { backgroundColor: 'rgba(255,138,92,0.12)', borderRadius: 9, color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 3 },
  greetingRequestSummaryMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.62)', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 4, paddingHorizontal: 12, paddingVertical: 8 },
  greetingRequestSummaryTextMake: { color: palette.muted, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500' },
  greetingRequestTimeMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '500', lineHeight: 15, marginLeft: 8 },
  greetingRequestTitleMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 20, minWidth: 0 },
  greetingRequestTitleRowMake: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  greetingRequestTopMake: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  messagesAvatarOverlap: { marginLeft: -10 },
  messagesAvatarStack: { flexDirection: 'row', width: 60 },
  messagesHeaderActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  messagesEmptyWrap: { marginTop: 18 },
  messagesListMake: { marginTop: 14 },
  messagesMakeHeader: { alignItems: 'center', flexDirection: 'row', height: 50, justifyContent: 'space-between' },
  messagesMakePage: { paddingTop: 0 },
  messagesRequestMake: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, rgba(255,138,92,0.10), rgba(77,182,172,0.10))' } as object) : null), alignItems: 'center', backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.22)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.1, shadowRadius: 22 },
  messagesRequestText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  messagesRequestTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700', lineHeight: 19 },
  messagesTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end' },
  metaText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '500' },
  metricCard: { backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexGrow: 0, flexShrink: 0, minHeight: 102, minWidth: 0, paddingHorizontal: 13, paddingVertical: 12, shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.06, shadowRadius: 20, width: '48%' },
  metricIcon: { alignItems: 'center', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  metricLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', minWidth: 0 },
  metricTag: { borderRadius: 10, flexShrink: 1, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '600', maxWidth: 76, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  metricTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, minWidth: 0 },
  metricValue: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600', lineHeight: 20, marginTop: 3, minWidth: 0 },
  mutedText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 19 },
  notificationButton: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', position: 'relative', width: 44 },
  notificationDot: { backgroundColor: palette.danger, borderColor: '#fff', borderRadius: 5, borderWidth: 1, height: 10, position: 'absolute', right: 10, top: 10, width: 10 },
  notificationActionMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 14, minHeight: 28, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  notificationActionTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  notificationBodyMake: { flex: 1, minWidth: 0 },
  notificationCardMake: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  notificationCardUnreadMake: { backgroundColor: 'rgba(255,138,92,0.06)', borderColor: 'rgba(255,138,92,0.22)' },
  notificationFilterChipActiveMake: { backgroundColor: palette.ink, borderColor: palette.ink },
  notificationFilterChipMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 999, borderWidth: 1, height: 34, justifyContent: 'center', paddingHorizontal: 14 },
  notificationFilterRowMake: { flexDirection: 'row', gap: 8, paddingBottom: 4, paddingHorizontal: 2, paddingTop: 4 },
  notificationFilterTextActiveMake: { color: '#fff', fontWeight: '700' },
  notificationFilterTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  notificationGroupLabelMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3, lineHeight: 16, paddingBottom: 6, paddingTop: 10 },
  notificationGroupMake: { gap: 8 },
  notificationHeaderIconMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderColor: palette.border, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
  notificationHeaderTitleMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 17, fontWeight: '700', lineHeight: 23, textAlign: 'center' },
  notificationIconHealthMake: { backgroundColor: 'rgba(77,182,172,0.18)' },
  notificationIconInteractionMake: { backgroundColor: 'rgba(229,87,63,0.14)' },
  notificationIconMake: { alignItems: 'center', borderRadius: 12, flexShrink: 0, height: 34, justifyContent: 'center', width: 34 },
  notificationIconSystemMake: { backgroundColor: 'rgba(122,121,114,0.14)' },
  notificationIconWalkMake: { backgroundColor: 'rgba(255,138,92,0.16)' },
  notificationListMake: { gap: 4, paddingTop: 4 },
  notificationMakeHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 44 },
  notificationMetaRowMake: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, minHeight: 28 },
  notificationPageMake: { gap: 8, paddingTop: 0 },
  notificationReadAllButtonDisabledMake: { opacity: 0.55 },
  notificationReadAllButtonMake: { alignItems: 'center', borderRadius: 14, justifyContent: 'center', minHeight: 34, minWidth: 64, paddingHorizontal: 2 },
  notificationReadAllTextDisabledMake: { color: 'rgba(122,121,114,0.72)' },
  notificationReadAllTextMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  notificationSubMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', lineHeight: 17, marginTop: 3 },
  notificationTimeMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '500', lineHeight: 15 },
  notificationTitleMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '600', lineHeight: 19, minWidth: 0 },
  notificationTitleRowMake: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  notificationUnreadDotMake: { backgroundColor: palette.orange, borderRadius: 4, flexShrink: 0, height: 8, marginTop: 5, width: 8 },
  optionWrap: { gap: 8 },
  otpCursor: { backgroundColor: palette.orange, borderRadius: 1, height: 24, position: 'absolute', width: 2 },
  otpDigitBox: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 14, borderWidth: 1, height: 56, justifyContent: 'center', shadowColor: '#50371e', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.06, shadowRadius: 8, width: 46 },
  otpDigitBoxActive: { borderColor: palette.orange, shadowColor: palette.orange, shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.18, shadowRadius: 10 },
  otpDigitBoxError: { borderColor: palette.danger },
  otpDigitBoxFilled: { borderColor: palette.ink },
  otpDigitText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 22, fontWeight: '600', lineHeight: 28 },
  otpDigitTextError: { color: palette.danger },
  otpGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, position: 'relative' },
  otpHiddenInput: { height: 1, left: 0, opacity: 0, position: 'absolute', top: 0, width: 1 },
  otpHeader: { paddingTop: 0 },
  otpHeaderRow: { height: 44 },
  otpHeaderSpacer: { height: 36, width: 36 },
  otpIconButton: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 0, height: 36, width: 36 },
  otpInlineError: { color: palette.danger, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', marginTop: 10 },
  otpInlineErrorRow: { marginTop: 10 },
  otpInlineNotice: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', marginTop: 10 },
  otpContent: { flex: 1, paddingBottom: 0, paddingHorizontal: 22, paddingTop: 16, position: 'relative' },
  otpPage: { paddingHorizontal: 6, paddingTop: 0 },
  otpSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, lineHeight: 21, marginTop: 10 },
  otpSubtitleStrong: { color: palette.ink, fontWeight: '400' },
  otpTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 26, fontWeight: '600', letterSpacing: 0, lineHeight: 34 },
  otpVerifyingOverlay: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(255,253,249,0.96)', borderColor: palette.border, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, position: 'absolute', top: 110 },
  otpVerifyingText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  ownerCard: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  opacity60: { opacity: 0.6 },
  discoverBlurPreviewMake: { opacity: 0.5, transform: [{ scale: 0.99 }] },
  discoverCardsMake: { gap: 12, marginTop: 14 },
  discoverEmptyActionsMake: { flexDirection: 'row', gap: 12, marginTop: 22, width: '100%' },
  discoverEmptyClearMake: { color: palette.orange, flexShrink: 0, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  discoverEmptyCountMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 12, borderWidth: 1, color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4, position: 'absolute', right: 12, top: 8 },
  discoverEmptyDescMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 21.5, marginTop: 10, textAlign: 'center' },
  discoverEmptyGhostMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 24, borderWidth: 1, flex: 1, height: 48, justifyContent: 'center' },
  discoverEmptyGhostTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '600' },
  discoverEmptyGlowMake: { backgroundColor: 'rgba(255,138,92,0.18)', borderRadius: 78, height: 156, left: 0, opacity: 0.72, position: 'absolute', top: 0, width: 156 },
  discoverEmptyHeroMake: { height: 156, marginTop: 64, position: 'relative', width: 156 },
  discoverEmptyMake: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 0 },
  discoverEmptyOrbMake: { alignItems: 'center', backgroundColor: '#FFD2A8', borderRadius: 65, height: 130, justifyContent: 'center', left: 13, position: 'absolute', shadowColor: '#B46E3C', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.2, shadowRadius: 30, top: 13, width: 130 },
  discoverEmptyPrimaryMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 24, flex: 1, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.24, shadowRadius: 20 },
  discoverEmptyPrimaryTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '700' },
  discoverEmptySummaryMake: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.6)', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 40, paddingHorizontal: 12, paddingVertical: 8 },
  discoverEmptySummaryTextMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500' },
  discoverEmptyTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 19, fontWeight: '700', letterSpacing: 0, lineHeight: 26, marginTop: 20, textAlign: 'center' },
  discoverMakeHeader: { alignItems: 'center', flexDirection: 'row', height: 50, justifyContent: 'space-between' },
  discoverSearchBarMake: { marginBottom: 10, minHeight: 46, paddingHorizontal: 12 },
  discoverSearchClearMake: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 13, height: 26, justifyContent: 'center', width: 26 },
  discoverPermissionActionsMake: { flexDirection: 'row', gap: 8, marginTop: 14 },
  discoverPermissionBodyMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  discoverPermissionGhostMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 24, borderWidth: 1, flex: 1, height: 48, justifyContent: 'center' },
  discoverPermissionGhostTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '600' },
  discoverPermissionIconMake: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(255,138,92,0.16)', borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 12, width: 56 },
  discoverPermissionPanelMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 24, borderWidth: 1, marginTop: -2, paddingBottom: 18, paddingHorizontal: 20, paddingTop: 20, shadowColor: '#50371e', shadowOffset: { height: 24, width: 0 }, shadowOpacity: 0.20, shadowRadius: 50 },
  discoverPermissionPrimaryMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 24, flex: 1, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.24, shadowRadius: 20 },
  discoverPermissionPrimaryTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '700' },
  discoverPermissionTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '800', letterSpacing: 0, lineHeight: 23, textAlign: 'center' },
  discoverPrivacyNoteMake: { alignItems: 'flex-start', backgroundColor: 'rgba(77,182,172,0.10)', borderRadius: 12, flexDirection: 'row', gap: 8, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10 },
  discoverPrivacyNoteTextMake: { color: palette.teal, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17 },
  filterChipMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8 },
  filterChipMakeActive: { backgroundColor: palette.orange, borderColor: palette.orange, color: '#fff' },
  filterChipsMake: { gap: 8, paddingRight: 20, paddingVertical: 2 },
  locationChipMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 9 },
  locationChipDeniedMake: { backgroundColor: 'rgba(229,87,63,0.08)', borderColor: 'rgba(229,87,63,0.22)' },
  locationChipDeniedText: { color: palette.danger },
  locationChipText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600' },
  locationPrivacyPill: { backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 9, color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  ownerActionsMake: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ownerBioMake: { color: 'rgba(27,28,25,0.78)', fontFamily: appFontFamily, fontSize: 12, fontWeight: '500', lineHeight: 18.6, marginTop: 6 },
  ownerCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, padding: 14, shadowColor: '#50371e', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.10, shadowRadius: 30 },
  ownerCardPreviewBlur: { opacity: 0.78 },
  ownerCardTopMake: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  ownerDistanceMake: { backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 9, color: palette.teal, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  ownerDistancePillMake: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 9, flexDirection: 'row', flexShrink: 0, gap: 3, paddingHorizontal: 8, paddingVertical: 3 },
  ownerDistanceTextMake: { color: palette.teal, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '700' },
  ownerGhostButtonMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, height: 36, justifyContent: 'center', paddingHorizontal: 14 },
  ownerGhostButtonTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600' },
  ownerInfoMake: { flex: 1, minWidth: 0 },
  ownerInviteHero: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 16, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.08, shadowRadius: 24 },
  ownerMetaMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', marginTop: 2 },
  ownerNameRowMake: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  ownerPetNameMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700', letterSpacing: 0, lineHeight: 21, minWidth: 0 },
  ownerPetPhotoMake: { backgroundColor: '#FFEDD9', borderRadius: 18, flexShrink: 0, height: 92, overflow: 'hidden', position: 'relative', width: 92 },
  ownerPrimaryButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 15, flexDirection: 'row', gap: 6, height: 30, justifyContent: 'center', minWidth: 78, paddingHorizontal: 12, shadowColor: palette.orange, shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.24, shadowRadius: 12 },
  ownerPrimaryButtonTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  ownerTagMake: { backgroundColor: palette.orangeSoft, borderRadius: 10, color: palette.orange, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  ownerTagMakeActive: { backgroundColor: palette.orange, color: '#fff' },
  ownerTagCoolMake: { backgroundColor: 'rgba(77,182,172,0.14)', color: palette.teal },
  ownerTagNeutralMake: { backgroundColor: '#F4EFE6', color: palette.muted },
  ownerTagRowMake: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  pageSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  pageTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 26, fontWeight: '600', lineHeight: 34 },
  permissionDeniedHero: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 16, marginTop: 24, paddingHorizontal: 18, paddingVertical: 22, shadowColor: '#50371e', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.06, shadowRadius: 14 },
  permissionDeniedHint: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 10 },
  permissionDeniedHintText: { color: palette.danger, flexShrink: 1, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500', lineHeight: 16 },
  permissionDeniedIcon: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 20, height: 68, justifyContent: 'center', position: 'relative', width: 68 },
  permissionDeniedIconBadge: { alignItems: 'center', backgroundColor: palette.danger, borderColor: '#fff', borderRadius: 13, borderWidth: 2, bottom: -4, height: 26, justifyContent: 'center', position: 'absolute', right: -4, width: 26 },
  permissionDeniedPageTitle: { marginTop: 8, paddingHorizontal: 8 },
  permissionDeniedPageTitleText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 26, fontWeight: '600', letterSpacing: 0, lineHeight: 34 },
  permissionDeniedText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 20, marginTop: 4 },
  permissionDeniedTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  permissionDescMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 19.5 },
  permissionIconMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 14, flexShrink: 0, height: 44, justifyContent: 'center', width: 44 },
  permissionMakeRow: { alignItems: 'flex-start', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16, shadowColor: '#50371e', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.04, shadowRadius: 10 },
  permissionMakeRowDenied: { borderColor: 'rgba(216,70,53,0.26)' },
  permissionMakeRowGranted: { backgroundColor: '#f2fbfa', borderColor: 'rgba(77,182,172,0.32)' },
  permissionMakeStack: { gap: 12, marginTop: 28 },
  permissionMakeStackDenied: { marginTop: 22 },
  permissionPrimaryButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 26, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.24, shadowRadius: 22 },
  permissionPrimaryButtonText: { color: '#fff', fontFamily: appFontFamily, fontSize: 16, fontWeight: '500' },
  permissionStatusDenied: { backgroundColor: 'rgba(229,87,63,0.10)', borderRadius: 12, color: palette.danger, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4 },
  permissionStatusLoading: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '400' },
  permissionStatusLoadingRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  permissionStatusOn: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  permissionStatusOnText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500' },
  permissionSwitchOff: { backgroundColor: palette.pale, borderRadius: 12, height: 24, justifyContent: 'center', paddingHorizontal: 2, width: 40 },
  permissionSwitchThumb: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 10, height: 20, shadowColor: '#000', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.14, shadowRadius: 4, width: 20 },
  permissionTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '500', lineHeight: 22 },
  petInfoFieldLabelMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500', marginBottom: 8 },
  petInfoFieldMake: { gap: 0 },
  petInfoDateValueTextMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 16, fontWeight: '500' },
  petInfoFormMake: { gap: 18, marginTop: 24, paddingHorizontal: 6 },
  petInfoInputShellMake: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', height: 52, paddingHorizontal: 16 },
  petInfoInputSuffixMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, fontWeight: '500' },
  petInfoInputTextMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 16, fontWeight: '500', height: 52, paddingHorizontal: 0 },
  petInfoPrimaryButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 26, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.24, shadowRadius: 22 },
  petInfoPrimaryButtonTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 16, fontWeight: '500' },
  petTypeCheck: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 10, height: 20, justifyContent: 'center', position: 'absolute', right: 11, top: 11, width: 20 },
  petTypeEmoji: { fontSize: 25, lineHeight: 31 },
  petTypeMakeButton: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 8, minHeight: 64, paddingHorizontal: 16, position: 'relative' },
  petTypeMakeButtonActive: { backgroundColor: 'rgba(255,138,92,0.10)', borderColor: palette.orange, borderWidth: 1.5 },
  petTypeMakeText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '500' },
  petTypeMakeTextActive: { color: palette.orange, fontWeight: '600' },
  petAvatar: { backgroundColor: '#f6dfbf', overflow: 'hidden' },
  petGreeting: { color: palette.ink, fontFamily: appFontFamily, fontSize: 19, fontWeight: '700', lineHeight: 25 },
  petHero: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 28, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 18 },
  petHeroCopy: { flex: 1, gap: 8 },
  petDetailCamera: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 10, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 6, position: 'absolute', right: 16, top: 16 },
  petDetailCameraText: { color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  petDetailEdit: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, bottom: 14, flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingVertical: 7, position: 'absolute', right: 16 },
  petDetailEditText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  petDetailHeroImage: { height: '100%', width: '100%' },
  petDetailHeroMake: { alignItems: 'center', backgroundColor: '#f4b879', height: 220, justifyContent: 'center', marginHorizontal: -16, marginTop: -18, overflow: 'hidden', position: 'relative' },
  petDetailHeroMeta: { color: 'rgba(255,255,255,0.9)', fontFamily: appFontFamily, fontSize: 12, fontWeight: '400', marginTop: 2 },
  petDetailHeroName: { color: '#fff', fontFamily: appFontFamily, fontSize: 24, fontWeight: '700', lineHeight: 31 },
  petDetailHeroOverlay: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 38%, rgba(0,0,0,0.56) 100%)' } as object) : null), backgroundColor: 'rgba(0,0,0,0.18)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  petDetailHeroText: { bottom: 14, left: 18, position: 'absolute' },
  petDetailInfoCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  petDetailInfoLabelMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, fontWeight: '400', lineHeight: 20, minWidth: 0 },
  petDetailInfoRowMake: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 14 },
  petDetailInfoValueMake: { color: palette.muted, flexShrink: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '400', lineHeight: 20, maxWidth: '56%', minWidth: 0, textAlign: 'right' },
  petDetailMakePage: { gap: 14, marginHorizontal: -4 },
  petDetailSectionMake: { marginBottom: 4 },
  petDetailSectionTitleMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '400', letterSpacing: 0, paddingBottom: 8, paddingHorizontal: 4 },
  petDetailStatCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 12, borderWidth: 1, flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  petDetailStatLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '400' },
  petDetailStatValue: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600', marginTop: 4 },
  petDetailStats: { flexDirection: 'row', gap: 10 },
  petEditAvatarBlock: { alignItems: 'center', paddingBottom: 18, paddingTop: 12 },
  petEditAvatarHint: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', marginTop: 8 },
  petEditAvatarWrap: { borderColor: '#fff', borderRadius: 44, borderWidth: 3, height: 88, overflow: 'visible', position: 'relative', shadowColor: '#000', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.08, shadowRadius: 14, width: 88 },
  petEditCameraBadge: { alignItems: 'center', backgroundColor: palette.orange, borderColor: '#fff', borderRadius: 15, borderWidth: 2, bottom: -2, height: 30, justifyContent: 'center', position: 'absolute', right: -2, width: 30 },
  petEditCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, marginHorizontal: 0, overflow: 'hidden' },
  petEditDeleteMake: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  petEditDeleteTextMake: { color: palette.danger, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  petEditDividerMake: { backgroundColor: palette.border, height: 1, marginLeft: 16 },
  petEditFootnoteMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, lineHeight: 19, paddingHorizontal: 4, paddingTop: 10 },
  petEditDateButtonMake: { flex: 1, minHeight: 48 },
  petEditInputMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600', minHeight: 48, paddingHorizontal: 0, paddingVertical: 0 },
  petEditLabelMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, fontWeight: '500', lineHeight: 20, width: 80 },
  petEditMiniChipActiveMake: { backgroundColor: palette.orangeSoft, borderColor: palette.orange },
  petEditMiniChipMake: { alignItems: 'center', backgroundColor: '#F8F3EA', borderColor: 'transparent', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 30, paddingHorizontal: 10 },
  petEditMiniChipTextActiveMake: { color: palette.orange, fontWeight: '800' },
  petEditMiniChipTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  petEditChipRowMake: { alignItems: 'center', flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'flex-start' },
  petEditReadonlyMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  petEditRowMake: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 50, paddingHorizontal: 16, paddingVertical: 1 },
  petEditUnitMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, fontWeight: '600' },
  petGenderButton: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 16, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  petGenderButtonActive: { backgroundColor: 'rgba(255,138,92,0.10)', borderColor: palette.orange, borderWidth: 1.5 },
  petGenderText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700' },
  petGenderTextActive: { color: palette.orange },
  phoneDivider: { backgroundColor: palette.border, height: 20, marginHorizontal: 14, width: 1 },
  phoneFrame: { backgroundColor: palette.background, borderRadius: Platform.OS === 'web' ? 44 : 0, flex: 1, height: Platform.OS === 'web' ? 844 : undefined, maxHeight: Platform.OS === 'web' ? 844 : undefined, maxWidth: Platform.OS === 'web' ? 390 : undefined, overflow: 'hidden', shadowColor: '#50371e', shadowOffset: { height: 30, width: 0 }, shadowOpacity: 0.18, shadowRadius: 60, width: '100%' },
  phoneInput: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 16, minHeight: 56, paddingHorizontal: 0 },
  phoneInputShell: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', minHeight: 56, paddingHorizontal: 18, shadowColor: '#50371e', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.04, shadowRadius: 8 },
  phoneInputShellFocused: { borderColor: palette.orange, shadowColor: palette.orange, shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.16, shadowRadius: 12 },
  phoneStatusBar: { alignItems: 'center', backgroundColor: palette.background, flexDirection: 'row', height: 44, justifyContent: 'space-between', paddingBottom: 4, paddingHorizontal: 28, paddingTop: 12 },
  phoneStatusIcons: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  phoneStatusTime: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  permissionCard: { alignItems: 'flex-start', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 },
  permissionCardGranted: { backgroundColor: '#f2fbfa', borderColor: 'rgba(77,182,172,0.32)' },
  placeWriteReviewButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 23, flexDirection: 'row', gap: 7, height: 46, justifyContent: 'center', marginTop: 12, shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.22, shadowRadius: 18 },
  placeWriteReviewButtonTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  placeWriteReviewMetaMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  placeWriteReviewPanelMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, marginTop: 16, paddingHorizontal: 14, paddingVertical: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 20 },
  placeWriteReviewTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 19, marginTop: 8 },
  placeWriteReviewTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  placeSubmitActionRowMake: { flexDirection: 'row', gap: 8, marginTop: 20, width: '100%' },
  placeSubmitBgGlowMake: { backgroundColor: 'rgba(255,217,182,0.46)', borderRadius: 220, height: 260, left: -40, position: 'absolute', right: -40, top: -120 },
  placeSubmitBodyMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 21.5, marginTop: 10, textAlign: 'center' },
  placeSubmitCenterMake: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 30 },
  placeSubmitCheckBadgeMake: { alignItems: 'center', backgroundColor: palette.teal, borderColor: '#fff', borderRadius: 19, borderWidth: 3, bottom: -2, height: 38, justifyContent: 'center', position: 'absolute', right: -2, shadowColor: palette.teal, shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.3, shadowRadius: 14, width: 38 },
  placeSubmitDraftCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, marginTop: 22, paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.08, shadowRadius: 22, width: '100%' },
  placeSubmitDraftMetaMake: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 2 },
  placeSubmitDraftPlaceMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  placeSubmitDraftTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, lineHeight: 18.5, marginTop: 6 },
  placeSubmitDraftTimeMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11 },
  placeSubmitDraftTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600' },
  placeSubmitErrorArtMake: { alignItems: 'center', backgroundColor: 'rgba(229,87,63,0.10)', borderRadius: 48, height: 96, justifyContent: 'center', width: 96 },
  placeSubmitErrorInnerMake: { alignItems: 'center', backgroundColor: 'rgba(229,87,63,0.18)', borderRadius: 32, height: 64, justifyContent: 'center', width: 64 },
  placeSubmitGhostButtonMake: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 24, flex: 1, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center' },
  placeSubmitGhostTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '600' },
  placeSubmitHeaderMake: { alignItems: 'center', flexDirection: 'row', height: 50, justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2 },
  placeSubmitHeaderTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  placeSubmitHeadlineMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 22, fontWeight: '700', letterSpacing: 0, lineHeight: 29, marginTop: 24, textAlign: 'center' },
  placeSubmitPrimaryButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 24, flex: 1, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.26, shadowRadius: 24 },
  placeSubmitPrimaryTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '700' },
  placeSubmitResultPageMake: { flex: 1, marginHorizontal: -20, marginTop: -18, minHeight: 720, overflow: 'hidden', position: 'relative' },
  placeSubmitSparkleLeftMake: { left: -4, position: 'absolute', top: 4 },
  placeSubmitSparkleRightMake: { position: 'absolute', right: 0, top: 20 },
  placeSubmitStepDotActiveMake: { backgroundColor: 'rgba(255,138,92,0.16)' },
  placeSubmitStepDotDoneMake: { backgroundColor: 'rgba(77,182,172,0.18)' },
  placeSubmitStepDotInnerMake: { borderRadius: 4, height: 8, width: 8 },
  placeSubmitStepDotMake: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 12, height: 24, justifyContent: 'center', width: 24 },
  placeSubmitStepDotTinyMake: { borderRadius: 3, height: 6, opacity: 0.5, width: 6 },
  placeSubmitStepLineActiveMake: { backgroundColor: palette.orange, opacity: 0.5 },
  placeSubmitStepLineMake: { backgroundColor: palette.border, height: 14, marginLeft: 11, width: 2 },
  placeSubmitStepMake: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 4 },
  placeSubmitStepTimeMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, marginTop: 1 },
  placeSubmitStepTitleActiveMake: { fontWeight: '600' },
  placeSubmitStepTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '500', lineHeight: 19 },
  placeSubmitStepperMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, marginTop: 24, paddingBottom: 12, paddingHorizontal: 16, paddingTop: 16, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.08, shadowRadius: 26, width: '100%' },
  placeSubmitSuccessArtMake: { height: 160, position: 'relative', width: 160 },
  placeSubmitSuccessCircleMake: { alignItems: 'center', backgroundColor: '#FFD2A8', borderColor: '#fff', borderRadius: 80, borderWidth: 6, bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0, shadowColor: '#b46e3c', shadowOffset: { height: 22, width: 0 }, shadowOpacity: 0.28, shadowRadius: 44 },
  placeSubmitSuccessGlowMake: { backgroundColor: 'rgba(77,182,172,0.20)', borderRadius: 90, bottom: -10, left: -10, position: 'absolute', right: -10, top: -10 },
  placeRankBadge: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  placeRankBadgeActive: { backgroundColor: palette.orange },
  placeRankText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  placeRankTextActive: { color: '#fff' },
  placeRow: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  placeSheetDistancePillMake: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 8, flexDirection: 'row', flexShrink: 0, gap: 2, marginLeft: 6, paddingHorizontal: 7, paddingVertical: 2 },
  placeSheetDistanceTextMake: { color: palette.teal, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '700', lineHeight: 14 },
  placeSheetMeta: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '500', lineHeight: 16, marginTop: 2 },
  placeSheetPhotoMake: { backgroundColor: palette.pale, borderRadius: 14, flexShrink: 0, height: 78, overflow: 'hidden', position: 'relative', width: 78 },
  placeSheetRatingBadgeMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 7, flexDirection: 'row', gap: 2, left: 6, paddingHorizontal: 6, paddingVertical: 2, position: 'absolute', top: 6 },
  placeSheetRatingTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 9.5, fontWeight: '700', lineHeight: 12 },
  placeSheetRow: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: 'rgba(234,223,210,0.72)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 100, paddingHorizontal: 10, paddingVertical: 10 },
  placeSheetRowActive: { backgroundColor: 'rgba(255,138,92,0.06)', borderColor: palette.orange, borderWidth: 1.5, shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.12, shadowRadius: 24 },
  placeSheetTag: { backgroundColor: palette.orangeSoft, borderRadius: 999, color: palette.orange, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', includeFontPadding: false, lineHeight: 14, minHeight: 20, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, textAlign: 'center', textAlignVertical: 'center' },
  placeSheetTags: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  placeSheetTitle: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  placeSheetTitleRowMake: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  placeAddressMake: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 9, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10 },
  placeAddressMeta: { color: palette.muted, flexShrink: 1, fontFamily: appFontFamily, fontSize: 11, lineHeight: 15 },
  placeAddressMetaItemMake: { alignItems: 'center', flexDirection: 'row', gap: 4, maxWidth: '100%' },
  placeAddressMetaRowMake: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  placeAddressText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '500', lineHeight: 19 },
  placeBackButtonMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 19, height: 38, justifyContent: 'center', shadowColor: '#000', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.18, shadowRadius: 14, width: 38 },
  placeDetailBottomCtaMake: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 16 },
  placeDetailPageMake: { marginHorizontal: -20, marginTop: -18 },
  placeDistanceMake: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', marginLeft: 'auto' },
  placeDistancePillDetailMake: { alignItems: 'center', flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  placeDistanceTextDetailMake: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', lineHeight: 15 },
  placeFeatureTagCoolMake: { backgroundColor: 'rgba(77,182,172,0.14)', color: palette.teal },
  placeFeatureTagMake: { backgroundColor: palette.orangeSoft, borderRadius: 999, color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  placeFeatureTagOliveMake: { backgroundColor: '#E8F5F3', color: '#5F8D6A' },
  placeHeroActions: { flexDirection: 'row', gap: 8, position: 'absolute', right: 16, top: 44 },
  placeHeroMake: { backgroundColor: '#9fc8a4', height: 280, overflow: 'hidden', position: 'relative' },
  placeHeroOverlay: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)' } as object) : null), backgroundColor: 'rgba(31,33,29,0.18)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  placeNavigationButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 26, flex: 1, flexDirection: 'row', gap: 7, height: 52, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.24, shadowRadius: 18 },
  placeNavigationButtonTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  placePhotoCount: { backgroundColor: 'rgba(31,33,29,0.65)', borderRadius: 11, bottom: 18, color: '#fff', fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', left: 16, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4, position: 'absolute' },
  placePhotoCountMake: { alignItems: 'center', backgroundColor: 'rgba(31,33,29,0.65)', borderRadius: 11, bottom: 18, flexDirection: 'row', gap: 4, left: 16, paddingHorizontal: 10, paddingVertical: 4, position: 'absolute' },
  placePhotoCountTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', lineHeight: 14 },
  placeRatingRowMake: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 7 },
  placeRatingMissingMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  placeRatingValueMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700', lineHeight: 17 },
  placeReviewAuthorMake: { color: palette.ink, flexShrink: 1, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  placeReviewAuthorRowMake: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  placeReviewBodyMake: { color: 'rgba(27,28,25,0.85)', fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 20, marginTop: 8 },
  placeReviewCountMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', lineHeight: 15 },
  placeReviewHeaderMake: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  placeReviewPreviewMake: { alignItems: 'stretch', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, marginTop: 16, paddingHorizontal: 14, paddingVertical: 12 },
  placeReviewShortcutMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, gap: 2, height: 52, justifyContent: 'center', shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.08, shadowRadius: 18, width: 52 },
  placeReviewShortcutTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 9.5, fontWeight: '600', lineHeight: 12 },
  placeReviewStarsMake: { alignItems: 'center', flexDirection: 'row', gap: 1 },
  placeReviewTimeMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '500', lineHeight: 14, marginTop: 1 },
  placeSectionLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginTop: 14 },
  placeSheetMake: { backgroundColor: palette.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -28, paddingBottom: 30, paddingHorizontal: 20, paddingTop: 18 },
  placeTitleMake: { color: palette.ink, flex: 1, flexShrink: 1, fontFamily: appFontFamily, fontSize: 21, fontWeight: '700', letterSpacing: 0, lineHeight: 28 },
  placeTitleRowMake: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  placeVerifyMake: { backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 8, color: palette.teal, fontFamily: appFontFamily, fontSize: 10, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
  placeVerifyPillMake: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 8, flexDirection: 'row', flexShrink: 0, gap: 3, marginTop: 3, paddingHorizontal: 7, paddingVertical: 3 },
  placeVerifyTextMake: { color: palette.teal, fontFamily: appFontFamily, fontSize: 10, fontWeight: '700', lineHeight: 13 },
  placeholderHeroMake: { alignItems: 'center', backgroundColor: '#e8f5f3', borderRadius: 18, flexDirection: 'row', gap: 12, padding: 16 },
  placeholderMake: { gap: 14 },
  previewPhoto: { backgroundColor: palette.pale, borderRadius: 24, height: 330, width: '100%' },
  recognitionBadgeText: { color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '500' },
  recognitionBottomActions: { marginTop: 22, paddingHorizontal: 8 },
  recognitionDetailCardMake: { backgroundColor: palette.card, borderColor: palette.border, borderRadius: 20, borderWidth: 1, marginTop: 18, paddingHorizontal: 16, paddingVertical: 16, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 18 },
  recognitionFeatureChipsMake: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start', marginTop: 14 },
  recognitionHeroMake: { alignItems: 'center', backgroundColor: '#e2a56a', borderRadius: 28, height: 280, justifyContent: 'center', marginTop: 2, overflow: 'hidden', position: 'relative' },
  recognitionPrimaryCta: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 26, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.28, shadowRadius: 22 },
  recognitionPrimaryCtaPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  recognitionPrimaryCtaText: { color: '#fff', fontFamily: appFontFamily, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  recognitionQuality: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 5, position: 'absolute', right: 14, top: 14 },
  recognitionSuccessBadge: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.95)', borderRadius: 14, flexDirection: 'row', gap: 5, left: 14, paddingHorizontal: 12, paddingVertical: 5, position: 'absolute', top: 14 },
  profileCard: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  profileCurrentWrap: { alignSelf: 'stretch', marginBottom: 18, marginTop: 16, paddingHorizontal: 16 },
  profileHeroContent: { alignItems: 'center', flexDirection: 'row', gap: 14, position: 'relative' },
  profileHeroMake: { alignSelf: 'stretch', backgroundColor: '#ffe3d1', borderRadius: 22, marginHorizontal: 16, marginTop: 16, overflow: 'hidden', padding: 18, position: 'relative' },
  profileHeroOrb: { backgroundColor: 'rgba(255,255,255,0.42)', borderRadius: 70, height: 140, position: 'absolute', right: -30, top: -20, width: 140 },
  profileMakeHeader: { alignItems: 'center', flexDirection: 'row', height: 50, justifyContent: 'space-between', paddingHorizontal: 20 },
  profileMakeMenuRowValue: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  profileMakePage: { alignSelf: 'stretch', flexGrow: 1, minWidth: '100%', paddingTop: 0, width: '100%' },
  profileMakeRow: { alignItems: 'center', borderBottomColor: palette.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 14 },
  profileMakeRowIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 8, height: 28, justifyContent: 'center', width: 28 },
  profileMakeRowLast: { borderBottomWidth: 0 },
  profileMakeRowStatic: { opacity: 0.92 },
  profileMakeRowTitle: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, fontWeight: '400', lineHeight: 20, minWidth: 0 },
  profileMakeRowValue: { color: palette.muted, flexShrink: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '400', lineHeight: 18, maxWidth: '42%', minWidth: 0, textAlign: 'right' },
  profileManageLink: { color: palette.teal, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  profileMenuGroup: { alignSelf: 'stretch', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, marginHorizontal: 16, overflow: 'hidden' },
  profileOwnerAvatar: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#fff', borderRadius: 32, borderWidth: 3, height: 64, justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.08, shadowRadius: 10, width: 64 },
  profileOwnerName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  profilePetBadge: { backgroundColor: '#e8f5f3', borderRadius: 6, color: palette.teal, fontFamily: appFontFamily, fontSize: 10, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 1 },
  profilePetCardMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 14 },
  profilePetEmptyIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  profilePetMeta: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, lineHeight: 17, marginTop: 4 },
  profilePetName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700' },
  profilePetNameRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  profilePetTag: { backgroundColor: '#f4efe6', borderRadius: 6, color: palette.muted, fontFamily: appFontFamily, fontSize: 10, fontWeight: '400', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2 },
  profilePetTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  profilePhoneRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 4 },
  profilePhoneText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12 },
  profileSectionLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  profileSectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, paddingHorizontal: 4 },
  profileScreenTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 26, fontWeight: '700', letterSpacing: 0, lineHeight: 32 },
  profileRouteContent: { alignItems: 'stretch', flexGrow: 1, minWidth: '100%', paddingHorizontal: 0, paddingTop: 8, width: '100%' },
  safetyActionCardMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 70, padding: 14 },
  safetyActionCardStaticMake: { opacity: 0.82 },
  safetyActionIconMake: { alignItems: 'center', borderRadius: 12, height: 40, justifyContent: 'center', width: 40 },
  safetyActionStackMake: { gap: 10 },
  safetyActionStatusMake: { backgroundColor: palette.pale, borderRadius: 10, color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  safetyActionSubMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '400', lineHeight: 17, marginTop: 2 },
  safetyActionTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  safetyAuditNoteMake: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 4, padding: 12 },
  safetyAuditNoteTextMake: { color: palette.muted, flex: 1, fontFamily: appFontFamily, fontSize: 12, fontWeight: '400', lineHeight: 20 },
  safetyHeroIconMake: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, height: 46, justifyContent: 'center', width: 46 },
  safetyHeroMake: { alignItems: 'center', backgroundColor: '#FFE3D1', borderRadius: 18, flexDirection: 'row', gap: 14, marginBottom: 6, padding: 16 },
  safetyHeroSubMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '400', lineHeight: 18, marginTop: 4 },
  safetyHeroTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  safetyPageMake: { gap: 10, marginHorizontal: -4, marginTop: -10 },
  profileSettingsButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 12, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
  profileUnreadBadge: { backgroundColor: palette.danger, borderRadius: 10, color: '#fff', fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 1 },
  profileVerifyPill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, flexDirection: 'row', gap: 4, marginTop: 8, paddingHorizontal: 8, paddingVertical: 3 },
  profileVerifyText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600' },
  progressFill: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(90deg, #FFB48C 0%, #FF8A5C 60%, #FF6F3B 100%)' } as object) : null), backgroundColor: palette.orange, borderRadius: 999, height: '100%', shadowColor: palette.orange, shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.45, shadowRadius: 12 },
  progressTrack: { backgroundColor: 'rgba(255,138,92,0.16)', borderRadius: 999, height: 6, marginTop: 28, overflow: 'hidden', width: '100%' },
  ratingPill: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  ratingText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  requestCard: { alignItems: 'center', backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.24)', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 },
  requestStackMake: { gap: 12 },
  resendAction: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13, fontWeight: '500' },
  resendActionDisabled: { color: '#b8b5ac' },
  resendRow: { alignItems: 'center', flexDirection: 'row', gap: 4, justifyContent: 'center', marginTop: 24 },
  resendText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '400' },
  roundIcon: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 16, height: 44, justifyContent: 'center', width: 44 },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  reviewStatusCard: { alignItems: 'flex-start', backgroundColor: 'rgba(77,182,172,0.10)', borderColor: 'rgba(77,182,172,0.22)', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 12, paddingVertical: 10 },
  reviewStatusText: { color: palette.teal, flex: 1, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  safe: { backgroundColor: '#e8e2d9', flex: 1 },
  screen: { backgroundColor: palette.background, flex: 1 },
  searchBar: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 52, paddingHorizontal: 14 },
  searchInput: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, minHeight: 42 },
  searchText: { color: palette.muted, flex: 1, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '700' },
  settingsGroupMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, gap: 0, overflow: 'hidden', paddingTop: 8 },
  settingsGroupTitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 8 },
  settingsMakeCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, marginHorizontal: 16, overflow: 'hidden' },
  settingsMakeFootnote: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '400', lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
  settingsMakePage: { marginHorizontal: -20, marginTop: -10, paddingTop: 8 },
  settingsMakeRow: { alignItems: 'center', borderBottomColor: palette.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 14 },
  settingsMakeRowIcon: { alignItems: 'center', borderRadius: 8, height: 28, justifyContent: 'center', width: 28 },
  settingsMakeRowLast: { borderBottomWidth: 0 },
  settingsMakeRowSub: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '400', lineHeight: 16, marginTop: 2 },
  settingsMakeRowText: { flex: 1, minWidth: 0 },
  settingsMakeRowTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '400', lineHeight: 20 },
  settingsMakeRowTitleDanger: { color: palette.danger },
  settingsMakeRowValue: { color: palette.muted, flexShrink: 0, fontFamily: appFontFamily, fontSize: 14, fontWeight: '400', lineHeight: 18, maxWidth: '34%', textAlign: 'right' },
  settingsMakeSection: { marginBottom: 18 },
  settingsMakeSectionTitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '400', letterSpacing: 0.4, paddingBottom: 8, paddingHorizontal: 20 },
  settingsMakeToggleThumb: { backgroundColor: '#fff', borderRadius: 11, height: 22, left: 2, position: 'absolute', shadowColor: '#000', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.15, shadowRadius: 4, top: 2, width: 22 },
  settingsMakeToggleThumbOn: { left: 20 },
  settingsMakeToggleTrack: { backgroundColor: '#D9D5CB', borderRadius: 13, height: 26, position: 'relative', width: 44 },
  settingsMakeToggleTrackOn: { backgroundColor: palette.teal },
  segmentButton: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 16, borderWidth: 1, flex: 1, minHeight: 48, justifyContent: 'center' },
  segmentButtonActive: { backgroundColor: palette.orange, borderColor: palette.orange },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  sendButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 24, height: 48, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.28, shadowRadius: 24, width: 48 },
  sheetHandle: { alignSelf: 'center', backgroundColor: 'rgba(31,33,29,0.22)', borderRadius: 999, height: 4, marginBottom: 2, width: 46 },
  smallIconButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  stack: { gap: 12 },
  statusText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  successText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  switchOff: { backgroundColor: palette.pale, borderRadius: 12, height: 24, width: 40 },
  detailCardMake: { backgroundColor: palette.card, borderColor: palette.border, borderRadius: 20, borderWidth: 1, marginTop: 22, paddingHorizontal: 18, paddingVertical: 16, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 18 },
  emptyPetCta: { marginTop: 18, width: '100%' },
  emptyPetGlow: { alignItems: 'center', backgroundColor: 'rgba(255,138,92,0.12)', borderRadius: 100, height: 200, justifyContent: 'center', marginBottom: 8, position: 'relative', width: 200 },
  emptyPetPlus: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.orange, borderRadius: 14, borderStyle: 'dashed', borderWidth: 2, bottom: 14, height: 28, justifyContent: 'center', position: 'absolute', right: 12, width: 28 },
  emptyPetStage: { alignItems: 'center', justifyContent: 'center', minHeight: 580, paddingHorizontal: 22 },
  failedAlertCircle: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: 34, height: 68, justifyContent: 'center', position: 'absolute', shadowColor: '#000', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.2, shadowRadius: 24, width: 68 },
  failedBadgeMake: { backgroundColor: 'rgba(229,87,63,0.94)', borderRadius: 14, color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', left: 16, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 5, position: 'absolute', top: 16 },
  failedBlurOrb: { backgroundColor: '#7b6e59', borderRadius: 100, height: 200, opacity: 0.6, width: 200 },
  failedPhotoMake: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, #E8E3D8 0%, #C8C0AF 100%)' } as object) : null), alignItems: 'center', backgroundColor: '#c8c0af', borderRadius: 28, height: 320, justifyContent: 'center', marginTop: 2, overflow: 'hidden', position: 'relative' },
  failedTipsIntro: { marginTop: 8 },
  featureChipCool: { backgroundColor: 'rgba(77,182,172,0.12)', borderRadius: 14, color: palette.teal, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', letterSpacing: 0, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6 },
  featureChipWarm: { backgroundColor: 'rgba(255,138,92,0.12)', borderRadius: 14, color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', letterSpacing: 0, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6 },
  featureChipsMake: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 18 },
  scanCornerLb: { borderColor: palette.orange, borderLeftWidth: 3, borderRadius: 4, borderTopWidth: 3, bottom: 18, height: 22, left: 18, position: 'absolute', transform: [{ rotate: '270deg' }], width: 22 },
  scanCornerLt: { borderColor: palette.orange, borderLeftWidth: 3, borderRadius: 4, borderTopWidth: 3, height: 22, left: 18, position: 'absolute', top: 18, width: 22 },
  scanCornerRb: { borderColor: palette.orange, borderLeftWidth: 3, borderRadius: 4, borderTopWidth: 3, bottom: 18, height: 22, position: 'absolute', right: 18, transform: [{ rotate: '180deg' }], width: 22 },
  scanCornerRt: { borderColor: palette.orange, borderLeftWidth: 3, borderRadius: 4, borderTopWidth: 3, height: 22, position: 'absolute', right: 18, top: 18, transform: [{ rotate: '90deg' }], width: 22 },
  tabBar: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, bottom: 18, flexDirection: 'row', justifyContent: 'space-between', left: 16, paddingHorizontal: 6, paddingVertical: 8, position: 'absolute', right: 16 },
  tabItem: { alignItems: 'center', flex: 1, gap: 3, justifyContent: 'center', minHeight: 42, paddingVertical: 4, position: 'relative' },
  tabText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10, fontWeight: '400', lineHeight: 13 },
  tabTextActive: { color: palette.orange, fontWeight: '600' },
  tabUnreadBadge: { backgroundColor: palette.danger, borderColor: '#fff', borderRadius: 8, borderWidth: 2, color: '#fff', fontFamily: appFontFamily, fontSize: 10, fontWeight: '700', height: 16, lineHeight: 12, minWidth: 16, overflow: 'hidden', paddingHorizontal: 3, position: 'absolute', right: 17, textAlign: 'center', top: 2, zIndex: 2 },
  tag: { backgroundColor: palette.orangeSoft, borderRadius: 999, color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tealIcon: { backgroundColor: palette.teal },
  textAction: { alignItems: 'center', paddingVertical: 8 },
  textActionDisabled: { color: '#b8aca0' },
  textActionText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '400' },
  unreadBadge: { backgroundColor: palette.orange, borderRadius: 999, color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  uploadFrame: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 28, borderStyle: 'dashed', borderWidth: 1.4, gap: 10, minHeight: 300, justifyContent: 'center', padding: 24, width: '100%' },
  uploadActionsMake: { flexDirection: 'row', gap: 12, marginTop: 18 },
  uploadBoxMake: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, #FFF4EA 0%, #FBEEDF 100%)' } as object) : null), alignItems: 'center', backgroundColor: '#fff0df', borderRadius: 28, height: 340, justifyContent: 'center', marginTop: 22, overflow: 'hidden', position: 'relative', shadowColor: '#b46e3c', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.12, shadowRadius: 18 },
  uploadDashedFrame: { borderColor: 'rgba(255,138,92,0.55)', borderRadius: 28, borderStyle: 'dashed', borderWidth: 2, bottom: 14, left: 14, position: 'absolute', right: 14, top: 14 },
  uploadHintMake: { bottom: 18, color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '400', position: 'absolute', textAlign: 'center' },
  uploadMakeButton: { alignItems: 'center', borderRadius: 26, flex: 1, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center' },
  uploadMakeButtonGhost: { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 },
  uploadMakeButtonSolid: { backgroundColor: palette.orange, shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.28, shadowRadius: 22 },
  uploadMakeButtonText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '500', lineHeight: 20 },
  uploadMakeButtonTextSolid: { color: '#fff' },
  tipsCardMake: { backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, gap: 8, marginTop: 18, paddingHorizontal: 16, paddingVertical: 14 },
  tipBulletDot: { backgroundColor: palette.orange, borderRadius: 3, height: 5, width: 5 },
  tipBulletRow: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingVertical: 3 },
  tipBulletText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  tipCheckMake: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.18)', borderRadius: 8, height: 16, justifyContent: 'center', width: 16 },
  tipMakeRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  tipMakeText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13, fontWeight: '400' },
  timelineDateMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  timelineDotCool: { backgroundColor: palette.teal },
  timelineDotMake: { backgroundColor: palette.orange, borderRadius: 3, height: 6, width: 6 },
  timelineRowMake: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 11 },
  timelineSubMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, lineHeight: 18, marginTop: 2 },
  timelineTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  vaccineDuePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 10, color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 3 },
  vaccineDuePillDanger: { color: palette.danger },
  vaccineComposerCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, gap: 13, marginBottom: 10, padding: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 18 },
  vaccineComposerField: { gap: 8 },
  vaccineDateInputEmpty: { borderColor: 'rgba(122,121,114,0.26)' },
  vaccineDateValueTextMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '400' },
  vaccineEmptyPlanMake: { gap: 4, paddingHorizontal: 2, paddingVertical: 18 },
  vaccineHeroActionDisabled: { opacity: 0.58 },
  vaccineHeroActionDisabledText: { color: palette.muted },
  vaccineHeroActionPrimary: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 20, flex: 1, flexDirection: 'row', gap: 5, height: 40, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.26, shadowRadius: 20 },
  vaccineHeroActionPrimaryText: { color: '#fff', fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  vaccineHeroActionSecondary: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 5, height: 40, justifyContent: 'center' },
  vaccineHeroActionSecondaryText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  vaccineHeroActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  vaccineHeroGlow: { backgroundColor: 'rgba(255,255,255,0.38)', borderRadius: 64, height: 128, position: 'absolute', right: -28, top: -34, width: 128 },
  vaccineHeroIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 28, height: 56, justifyContent: 'center', shadowColor: '#b46e3c', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.22, shadowRadius: 22, width: 56 },
  vaccineHeroMake: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFE3CB 0%, #FFD2A8 100%)' } as object) : null), backgroundColor: '#ffd2a8', borderRadius: 22, marginTop: 8, overflow: 'hidden', paddingHorizontal: 18, paddingVertical: 16, position: 'relative', shadowColor: '#b46e3c', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.18, shadowRadius: 30 },
  vaccineHeroMeta: { color: 'rgba(31,33,29,0.72)', fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600' },
  vaccineHeroTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 20, fontWeight: '700', letterSpacing: 0, lineHeight: 27, marginTop: 10 },
  vaccineHeroTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  vaccinePlanBlock: { marginTop: 16 },
  vaccinePlanCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 4, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 18 },
  vaccinePlanHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  vaccinePlanIcon: { alignItems: 'center', backgroundColor: 'rgba(255,138,92,0.14)', borderRadius: 18, flexShrink: 0, height: 36, justifyContent: 'center', width: 36 },
  vaccinePlanIconDone: { backgroundColor: 'rgba(77,182,172,0.16)' },
  vaccinePlanIconPlanned: { backgroundColor: 'rgba(122,121,114,0.14)' },
  vaccinePlanDoneButtonDisabledMake: { opacity: 0.58 },
  vaccinePlanDoneButtonMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.orange, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 28, paddingHorizontal: 9 },
  vaccinePlanDoneButtonTextMake: { color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700', lineHeight: 16 },
  vaccinePlanRightMake: { alignItems: 'flex-end', flexShrink: 0, gap: 7, minWidth: 58 },
  vaccinePlanRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 12 },
  vaccinePlanTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  vaccineQuickDateChip: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 999, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 32, paddingHorizontal: 8 },
  vaccineQuickDateChipActive: { backgroundColor: palette.orange, borderColor: palette.orange },
  vaccineQuickDateRow: { flexDirection: 'row', gap: 7 },
  vaccineQuickDateText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  vaccineQuickDateTextActive: { color: '#fff' },
  vaccineReminderActionText: { borderColor: palette.orange, borderRadius: 9, borderWidth: 1, color: palette.orange, flexShrink: 0, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  vaccineReminderDanger: { alignItems: 'center', backgroundColor: '#FBE4DE', borderColor: '#F5C7BD', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 12 },
  vaccineReminderIconDanger: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, flexShrink: 0, height: 32, justifyContent: 'center', width: 32 },
  vaccineReminderIconWarm: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, flexShrink: 0, height: 32, justifyContent: 'center', width: 32 },
  vaccineReminderWarm: { alignItems: 'center', backgroundColor: '#FBF2D9', borderColor: '#EFDFA8', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 12 },
  vaccineStateDone: { backgroundColor: 'rgba(77,182,172,0.16)' },
  vaccineStateDoneText: { color: palette.teal },
  vaccineStateOverdue: { backgroundColor: 'rgba(229,87,63,0.12)' },
  vaccineStateOverdueText: { color: palette.danger },
  vaccineStatePlanned: { backgroundColor: 'rgba(122,121,114,0.14)' },
  vaccineStatePlannedText: { color: palette.muted },
  vaccineStateTag: { borderRadius: 9, flexShrink: 0, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2 },
  vaccineStateUpcoming: { backgroundColor: 'rgba(255,138,92,0.14)' },
  vaccineStateUpcomingText: { color: palette.orange },
  vaccineTipMake: { alignItems: 'flex-start', backgroundColor: 'rgba(77,182,172,0.10)', borderColor: 'rgba(77,182,172,0.22)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  walkAvatarCircleMake: { backgroundColor: '#FFEDD9', borderColor: '#fff', borderRadius: 28, borderWidth: 3, height: 56, overflow: 'hidden', shadowColor: '#50371e', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.16, shadowRadius: 14, width: 56 },
  walkAvatarOverlapMake: { marginLeft: -16 },
  walkAvatarStackMake: { alignItems: 'center', flexDirection: 'row', flexShrink: 0, width: 100 },
  walkBottomActionsMake: { flexDirection: 'row', gap: 8, marginTop: 4 },
  walkDateDayActiveMake: { color: palette.orange },
  walkDateDayMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  walkDateRowMake: { flexDirection: 'row', gap: 8 },
  walkDateTileActiveMake: { backgroundColor: 'rgba(255,138,92,0.12)', borderColor: palette.orange, borderWidth: 1.5 },
  walkDateTileMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flex: 1, height: 64, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  walkDateValueMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 19, marginTop: 2 },
  walkDateWeekMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '500', lineHeight: 14, marginTop: 1 },
  walkDraftButtonMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 24, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center' },
  walkDraftButtonTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '600' },
  walkFieldLabelMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  walkInvitePageMake: { gap: 0, marginTop: 4 },
  walkMessageCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, minHeight: 64, paddingHorizontal: 14, paddingVertical: 12 },
  walkMessageInputMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '500', lineHeight: 21.5, minHeight: 38, padding: 0, textAlignVertical: 'top' },
  walkPetsCardMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 16, shadowColor: '#50371e', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.1, shadowRadius: 30 },
  walkPetsMetaMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', lineHeight: 16, marginTop: 2 },
  walkPetsTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700', letterSpacing: 0, lineHeight: 22 },
  walkPlaceBadgeMake: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, color: palette.ink, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4, position: 'absolute', right: 12, top: 12 },
  walkPlaceCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, height: 110, overflow: 'hidden', position: 'relative' },
  walkPlaceInputMake: { color: '#fff', flex: 1, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700', minHeight: 22, padding: 0 },
  walkPlaceMetaMake: { bottom: 8, color: 'rgba(255,255,255,0.76)', fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '600', left: 30, position: 'absolute', right: 82 },
  walkPlaceOverlayMake: { ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)' } as object) : null), backgroundColor: 'rgba(0,0,0,0.18)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  walkPlacePickBadgeMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, justifyContent: 'center', minHeight: 28, paddingHorizontal: 9, paddingVertical: 4, position: 'absolute', right: 12, top: 12 },
  walkPlacePickBadgeTextMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 11, fontWeight: '800', lineHeight: 14 },
  walkPlaceTitleMake: { alignItems: 'center', bottom: 12, flexDirection: 'row', gap: 5, left: 12, position: 'absolute', right: 72 },
  walkPlaceTitleWithMetaMake: { bottom: 26 },
  walkSafetyMake: { alignItems: 'flex-start', backgroundColor: 'rgba(77,182,172,0.10)', borderColor: 'rgba(77,182,172,0.22)', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10 },
  walkSafetyTextMake: { color: palette.teal, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 18 },
  walkSendButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 24, flex: 1, flexDirection: 'row', gap: 6, height: 48, justifyContent: 'center', shadowColor: palette.orange, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.24, shadowRadius: 24 },
  walkSendButtonTextMake: { color: '#fff', fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '700' },
  walkTimeInputMake: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '600', minHeight: 44, paddingHorizontal: 10, paddingVertical: 0 },
  walkTimeRowMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', height: 48, paddingHorizontal: 14 },
  weightHeroMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, paddingHorizontal: 22, paddingVertical: 20, shadowColor: '#50371e', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.08, shadowRadius: 30 },
  weightInputMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, gap: 12, marginTop: 14, padding: 16 },
  apiModeMake: { borderBottomColor: palette.border, borderBottomWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
});
