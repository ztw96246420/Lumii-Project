import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  LogBox,
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
import type { RefreshControlProps, TextStyle, ViewStyle } from 'react-native';
import {
  AlertTriangle,
  ArrowUp,
  BatteryFull,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Edit3,
  HeartPulse,
  Home as HomeIcon,
  ImagePlus,
  LogOut,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  NotebookPen,
  PawPrint,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Signal,
  SlidersHorizontal,
  Sparkles,
  Star,
  Syringe,
  User,
  Users,
  Wifi,
  Weight,
  X,
} from 'lucide-react-native';

import { getLumiiPermissionStatus, requestLumiiPermission } from '../services/permissions';
import { cancelVaccineLocalReminder, cancelVaccineLocalReminders, scheduleVaccineLocalReminder, syncVaccineLocalReminders } from '../services/healthReminders';
import { getLumiiPushRegistration } from '../services/pushToken';
import { clearPersistedLumiiSession, loadPersistedLumiiSession, savePersistedLumiiSession } from '../services/sessionStorage';
import { LumiiAmapView, getLumiiAmapCurrentLocation, isLumiiAmapAvailable } from '../native/LumiiAmapView';
import { apiConfig, lumiiApi, setLumiiAuthToken } from './api';
import { productConfig } from './productConfig';
import { Button, Card, ConfirmDialog, Field, StatusPill, Toast, palette, styles as uiStyles } from './ui';
import type {
  AppRoute,
  AppTab,
  AiUsageSummary,
  AuthSession,
  AvatarJob,
  ChatMessage,
  Conversation,
  ConversationMessage,
  HealthMemo,
  HealthSummary,
  NearbyLocationHint,
  NearbyOwner,
  NotificationItem,
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

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);
const webTextInputReset =
  Platform.OS === 'web'
    ? ({ outlineColor: 'transparent', outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle)
    : null;
const webPressableReset =
  Platform.OS === 'web'
    ? ({ outlineColor: 'transparent', outlineStyle: 'none', outlineWidth: 0, userSelect: 'none' } as unknown as ViewStyle)
    : null;
const demoPetPhotoUrl =
  'https://images.unsplash.com/photo-1625794084867-8ddd239946b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=720';
const generatedGoldenAvatarUri = 'lumii://golden-retriever-avatar';
const generatedGoldenAvatarSource = require('../../assets/lumii/golden-avatar-v1.png');

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
  healthMemos: '健康备忘',
  home: '灵伴',
  map: '地图',
  messages: '消息',
  notifications: '通知中心',
  otp: '输入验证码',
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
  { Icon: MapIcon, label: '地图', route: 'map' },
  { Icon: MessageCircle, label: '消息', route: 'messages' },
  { Icon: User, label: '我的', route: 'profile' },
];

const tabBackToHomeRoutes = new Set<AppRoute>(['discover', 'map', 'messages', 'profile']);
const appExitPromptRoutes = new Set<AppRoute>(['emptyPet', 'home', 'login', 'permissions']);
const focusedInboxRoutes = new Set<AppRoute>(['greetingRequests', 'messages', 'notifications']);
const passiveInboxRoutes = new Set<AppRoute>(['discover', 'home', 'map', 'profile']);
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

type PetDraft = {
  birthday: string;
  breed: string;
  gender: PetProfile['gender'];
  name: string;
  species: PetSpecies;
  weight: string;
};
type DiscoverFilter = 'all' | 'dog' | 'cat' | 'social' | 'walk';
const discoverFilterOptions: Array<{ key: DiscoverFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'dog', label: '🐶 汪星人' },
  { key: 'cat', label: '🐱 喵星人' },
  { key: 'social', label: '想交朋友' },
  { key: 'walk', label: '可约遛' },
];

const emptyPetDraft: PetDraft = {
  birthday: '2024-05-30',
  breed: '金毛寻回犬',
  gender: 'unknown',
  name: '奶油',
  species: 'dog',
  weight: '28.4',
};

function draftFromPet(pet: PetProfile): PetDraft {
  return {
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

type ConfirmState = {
  body: string;
  confirmText?: string;
  onConfirm: () => void;
  title: string;
};

type UserSettingKey = keyof UserSettings;

function isGeneratedAvatarUri(uri?: null | string) {
  return Boolean(uri?.startsWith('lumii://'));
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
  return { author: 'system', id: 'conversation-safe-tip', text: '为了保护隐私，聊天前不会展示精确住址。', time: '刚刚' };
}

function createPetChatWelcomeMessage(pet?: null | PetProfile): ChatMessage {
  return {
    author: 'ai',
    id: 'pet-chat-welcome',
    status: 'sent',
    text: `我是${pet?.name ? `${pet.name}的` : '你的'}灵伴。今天想记录什么小事？`,
    time: '刚刚',
  };
}

function indexPlaceReviewsByPlaceId(reviews: PlaceReview[]) {
  return reviews.reduce<Record<string, PlaceReview>>((next, review) => {
    if (!next[review.placeId]) next[review.placeId] = review;
    return next;
  }, {});
}

export default function LumiiMvpApp() {
  const [route, setRoute] = useState<AppRoute>('login');
  const [history, setHistory] = useState<AppRoute[]>([]);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [sessionBootstrapping, setSessionBootstrapping] = useState(true);

  const [phone, setPhone] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMeta, setOtpMeta] = useState<SmsCodeTicket | null>(null);
  const [otpInlineError, setOtpInlineError] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [session, setSession] = useState<AuthSession | null>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const otpInputRef = useRef<TextInput>(null);
  const mapAutoLocateAttemptedRef = useRef(false);
  const lastDiscoverLocationRef = useRef<NearbyLocationHint | null>(null);
  const exitBackPressedAtRef = useRef(0);
  const previousRouteRef = useRef<AppRoute>('login');
  const systemSettingsOpenedAtRef = useRef(0);
  const registeredPushTokenRef = useRef('');
  const scheduledPushRegistrationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef('');
  const userSettingSavingKeysRef = useRef<Set<UserSettingKey>>(new Set());

  const [permissions, setPermissions] = useState<PermissionStateMap>(initialPermissions);
  const [activePet, setActivePet] = useState<PetProfile | null>(null);
  const [petDraft, setPetDraft] = useState(emptyPetDraft);
  const [petProfileSaving, setPetProfileSaving] = useState(false);
  const [media, setMedia] = useState<UploadedPetMedia | null>(null);
  const [mediaPickerMode, setMediaPickerMode] = useState<'camera' | 'library' | null>(null);
  const [avatarJob, setAvatarJob] = useState<AvatarJob | null>(null);
  const [avatarStarting, setAvatarStarting] = useState(false);
  const [avatarResultPrefetching, setAvatarResultPrefetching] = useState(false);
  const [avatarAccepting, setAvatarAccepting] = useState(false);
  const [avatarRetrying, setAvatarRetrying] = useState(false);
  const avatarResultRouteJobIdRef = useRef('');
  const [homeHintIndex, setHomeHintIndex] = useState(() => Math.floor(Math.random() * homeChatPrompts.length));

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([createPetChatWelcomeMessage()]);
  const [chatInput, setChatInput] = useState('');
  const [chatFeedbackById, setChatFeedbackById] = useState<Record<string, PetChatFeedbackRating>>({});
  const [chatFeedbackSavingIds, setChatFeedbackSavingIds] = useState<string[]>([]);
  const [chatReplying, setChatReplying] = useState(false);
  const [aiUsage, setAiUsage] = useState<AiUsageSummary | null>(null);
  const [petChatDailyCount, setPetChatDailyCount] = useState(0);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [vaccines, setVaccines] = useState<VaccinePlan[]>([]);
  const [vaccineReminderIds, setVaccineReminderIds] = useState<string[]>([]);
  const [memos, setMemos] = useState<HealthMemo[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);
  const [memoTitle, setMemoTitle] = useState('今日观察');
  const [memoContent, setMemoContent] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoDraftTitle, setMemoDraftTitle] = useState('洗澡记录');
  const [memoDraftContent, setMemoDraftContent] = useState('今天洗澡后耳朵干净，皮肤没有明显泛红。');
  const [memoDraftSaving, setMemoDraftSaving] = useState(false);
  const [vaccineReminderSavingIds, setVaccineReminderSavingIds] = useState<string[]>([]);
  const [vaccineDoneSavingIds, setVaccineDoneSavingIds] = useState<string[]>([]);
  const [dailyPostText, setDailyPostText] = useState('');
  const [dailyPostSaving, setDailyPostSaving] = useState(false);
  const [owners, setOwners] = useState<NearbyOwner[]>([]);
  const [discoverRefreshing, setDiscoverRefreshing] = useState(false);
  const [discoverFilter, setDiscoverFilter] = useState<DiscoverFilter>('all');
  const [greetingRequestOwners, setGreetingRequestOwners] = useState<NearbyOwner[]>([]);
  const [socialActionSavingIds, setSocialActionSavingIds] = useState<string[]>([]);
  const socialActionSavingIdsRef = useRef<Set<string>>(new Set());
  const [walkInviteSaving, setWalkInviteSaving] = useState(false);
  const walkInviteSavingRef = useRef(false);
  const [selectedOwner, setSelectedOwner] = useState<NearbyOwner | null>(null);
  const [walkInvitePlace, setWalkInvitePlace] = useState('滨江绿地');
  const [walkInviteTime, setWalkInviteTime] = useState('今天 19:00');
  const [walkInviteNote, setWalkInviteNote] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const inboxRefreshInFlightRef = useRef(false);
  const inboxRefreshQueuedRef = useRef(false);
  const conversationRefreshInFlightRef = useRef<string | null>(null);
  const [inboxManualRefreshing, setInboxManualRefreshing] = useState(false);
  const [conversationInput, setConversationInput] = useState('');
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([createConversationSafetyMessage()]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeFilter, setPlaceFilter] = useState<'all' | Place['category']>('all');
  const [placeSearching, setPlaceSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState<string[]>([]);
  const [favoritePlaceSavingIds, setFavoritePlaceSavingIds] = useState<string[]>([]);
  const [placeReviewsByPlaceId, setPlaceReviewsByPlaceId] = useState<Record<string, PlaceReview>>({});
  const [locatingMap, setLocatingMap] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultMapCenter);
  const [mapStyleKey, setMapStyleKey] = useState<MapVisualMode>('lumii');
  const [mapTrafficEnabled, setMapTrafficEnabled] = useState(false);
  const [mapStylePanelVisible, setMapStylePanelVisible] = useState(false);
  const [placeDraftAddress, setPlaceDraftAddress] = useState('滨江路 88 号');
  const [placeDraftName, setPlaceDraftName] = useState('云杉宠物友好公园');
  const [placeReview, setPlaceReview] = useState('');
  const [placeReviewSaving, setPlaceReviewSaving] = useState(false);
  const [placeReviewStatus, setPlaceReviewStatus] = useState<'idle' | 'pending_review'>('idle');
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
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

  const showToast = useCallback((message: string) => setToast(message), []);

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

      if (mapStylePanelVisible) {
        setMapStylePanelVisible(false);
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
  }, [activePet, back, confirm, mapStylePanelVisible, resetTo, route, showToast]);

  useEffect(() => {
    let mounted = true;

    const bootstrapSession = async () => {
      try {
        const persistedSession = await loadPersistedLumiiSession();
        if (!mounted) return;
        if (persistedSession) {
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
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

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
    void loadCommonData();
  }, [session?.token]);

  useEffect(() => {
    sessionTokenRef.current = session?.token ?? '';
  }, [session?.token]);

  useEffect(() => {
    setSession((current) => {
      if (!current?.account || arePetSnapshotsEqual(current.account.activePet, activePet)) return current;
      return {
        ...current,
        account: {
          ...current.account,
          activePet,
        },
      };
    });
  }, [activePet]);

  useEffect(() => {
    const previousRoute = previousRouteRef.current;
    if (previousRoute !== route) exitBackPressedAtRef.current = 0;
    if (route === 'home' && previousRoute !== 'home') {
      setHomeHintIndex((index) => (index + 1) % homeChatPrompts.length);
    }
    previousRouteRef.current = route;
  }, [route]);

  useEffect(() => {
    if (route !== 'editPet') return;
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    if (!pet) {
      replace('petInfo');
      showToast('请先添加宠物档案');
      return;
    }
    setPetDraft(draftFromPet(pet));
  }, [activePet?.id, route, replace, showToast]);

  useEffect(() => {
    if (route === 'petInfo') setPetDraft(emptyPetDraft);
  }, [route]);

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
      const nextOwners = await fetchNearbyOwners({ forceLocation: !lastDiscoverLocationRef.current, silent: true });
      if (active && nextOwners) applyNearbyOwners(nextOwners);
    };
    void refreshOwners();
    const id = setInterval(() => {
      void refreshOwners();
    }, 8000);
    return () => {
      active = false;
      clearInterval(id);
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
    if (!session || route !== 'notifications') return;
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
    if (!unreadIds.length) return;
    setNotifications((items) => items.map((item) => (unreadIds.includes(item.id) ? { ...item, read: true } : item)));
    void lumiiApi.messages.markNotificationsRead(unreadIds).then((result) => {
      if (result.data) setNotifications(result.data);
    });
  }, [notifications, route, session]);

  useEffect(() => {
    if (!session || route !== 'conversation' || !selectedConversation?.id) return undefined;
    const id = setInterval(() => {
      void loadConversationMessages(selectedConversation.id, { markRead: true, silent: true });
      void loadInboxData();
    }, 5000);
    return () => clearInterval(id);
  }, [route, selectedConversation?.id, session]);

  useEffect(() => {
    if (!session || route !== 'chat') return;
    void loadPetChatMessages();
    void loadAiUsage();
  }, [route, session, activePet?.id]);

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

  async function loadCommonData() {
    const [profileResult, healthSummaryResult, weightResult, vaccineResult, vaccineReminderResult, memoResult, ownerResult, greetingRequestResult, conversationResult, notificationResult, placeResult, favoritePlaceResult, placeReviewResult, aiUsageResult] = await Promise.all([
      lumiiApi.account.getMe(),
      lumiiApi.health.getHealthSummary(),
      lumiiApi.health.listWeightRecords(),
      lumiiApi.health.listVaccines(),
      lumiiApi.health.listVaccineReminderIds(),
      lumiiApi.health.listHealthMemos(),
      lumiiApi.social.listNearbyOwners(),
      lumiiApi.social.listGreetingRequests(),
      lumiiApi.messages.listConversations(),
      lumiiApi.messages.listNotifications(),
      lumiiApi.places.listNearbyPlaces(),
      lumiiApi.places.listFavoritePlaceIds(),
      lumiiApi.places.listMyReviews(),
      lumiiApi.ai.getUsage(),
    ]);
    if (profileResult.data) {
      const profile = profileResult.data;
      setSession((current) => (current ? { ...current, account: profile, phone: profile.phone } : current));
      setUserSettings({ ...defaultUserSettings, ...profile.settings });
      if (profile.activePet) setActivePet(profile.activePet);
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
    if (weightResult.data) setWeights(weightResult.data);
    if (vaccineResult.data) setVaccines(vaccineResult.data);
    if (vaccineReminderResult.data) setVaccineReminderIds(vaccineReminderResult.data);
    if (memoResult.data) setMemos(memoResult.data);
    if (ownerResult.data) applyNearbyOwners(ownerResult.data);
    if (greetingRequestResult.data) setGreetingRequestOwners(greetingRequestResult.data);
    if (conversationResult.data) setConversations(conversationResult.data);
    if (notificationResult.data) setNotifications(notificationResult.data);
    if (placeResult.data) setPlaces(placeResult.data);
    if (favoritePlaceResult.data) setFavoritePlaceIds(favoritePlaceResult.data);
    if (placeReviewResult.data) setPlaceReviewsByPlaceId(indexPlaceReviewsByPlaceId(placeReviewResult.data));
    if (aiUsageResult.data) {
      setAiUsage(aiUsageResult.data);
      setPetChatDailyCount(aiUsageResult.data.daily.petChat.count);
    }
    setActivePet((pet) => pet ?? lumiiApi.pets.getActivePet());
  }

  async function loadAiUsage(options: { silent?: boolean } = { silent: true }) {
    const result = await lumiiApi.ai.getUsage();
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
    const result = await lumiiApi.health.getHealthSummary();
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

  async function refreshPetScopedData() {
    const [healthSummaryResult, weightResult, vaccineResult, vaccineReminderResult, memoResult, aiUsageResult] = await Promise.all([
      lumiiApi.health.getHealthSummary(),
      lumiiApi.health.listWeightRecords(),
      lumiiApi.health.listVaccines(),
      lumiiApi.health.listVaccineReminderIds(),
      lumiiApi.health.listHealthMemos(),
      lumiiApi.ai.getUsage(),
    ]);

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
    if (weightResult.data) setWeights(weightResult.data);
    if (vaccineResult.data) setVaccines(vaccineResult.data);
    if (vaccineReminderResult.data) setVaccineReminderIds(vaccineReminderResult.data);
    if (memoResult.data) setMemos(memoResult.data);
    if (aiUsageResult.data) {
      setAiUsage(aiUsageResult.data);
      setPetChatDailyCount(aiUsageResult.data.daily.petChat.count);
    }
  }

  async function loadInboxData(options: { silent?: boolean } = { silent: true }) {
    if (inboxRefreshInFlightRef.current) {
      inboxRefreshQueuedRef.current = true;
      if (options.silent === false) showToast('消息正在刷新');
      return false;
    }

    let refreshed = true;
    const silent = options.silent !== false;
    inboxRefreshInFlightRef.current = true;
    try {
      const [greetingRequestResult, conversationResult, notificationResult] = await Promise.all([
        lumiiApi.social.listGreetingRequests(),
        lumiiApi.messages.listConversations(),
        lumiiApi.messages.listNotifications(),
      ]);
      if (greetingRequestResult.data) setGreetingRequestOwners(greetingRequestResult.data);
      if (conversationResult.data) setConversations(conversationResult.data);
      if (notificationResult.data) setNotifications(notificationResult.data);
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
    setOwners(nextOwners);
    setSelectedOwner((current) => (current && nextOwners.some((owner) => owner.id === current.id) ? current : null));
  }

  async function refreshInboxManually() {
    if (inboxManualRefreshing) return;
    setInboxManualRefreshing(true);
    try {
      await loadInboxData({ silent: false });
    } finally {
      setInboxManualRefreshing(false);
    }
  }

  function setConversationMessagesFromServer(messages: ConversationMessage[]) {
    const cleanMessages = messages.filter((message) => message.author !== 'system');
    setConversationMessages((current) => {
      const localPending = current.filter(
        (message) =>
          message.author === 'me' &&
          (message.status === 'sending' || message.status === 'failed') &&
          !cleanMessages.some((serverMessage) => serverMessage.id === message.id),
      );
      return [createConversationSafetyMessage(), ...cleanMessages, ...localPending];
    });
  }

  async function loadConversationMessages(conversationId: string, options: { markRead?: boolean; silent?: boolean } = {}) {
    if (conversationRefreshInFlightRef.current === conversationId) return;
    conversationRefreshInFlightRef.current = conversationId;
    try {
      const result = await lumiiApi.messages.listConversationMessages(conversationId);
      const isActiveConversation = !selectedConversationIdRef.current || selectedConversationIdRef.current === conversationId;
      if (result.data) {
        if (isActiveConversation) setConversationMessagesFromServer(result.data);
        if (options.markRead) {
          void lumiiApi.messages.markConversationRead(conversationId);
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
    const result = await lumiiApi.messages.listPetChatMessages();
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
    const result = await lumiiApi.permissions.savePermissionState(nextPermissions, Boolean(completed || allLumiiPermissionsGranted(nextPermissions)));
    if (result.data) {
      const savedPermissions = mergePermissionState(nextPermissions, result.data);
      setPermissions(savedPermissions);
      return savedPermissions;
    }
    return nextPermissions;
  }

  async function registerPushDevice(options: { silent?: boolean; targetSession?: AuthSession } = {}) {
    const currentSession = options.targetSession ?? session;
    if (!currentSession || Platform.OS === 'web') return;
    try {
      const registration = await getLumiiPushRegistration();
      if (!registration?.token || registeredPushTokenRef.current === registration.token) return;
      const result = await lumiiApi.messages.registerPushToken(registration.token, registration.platform, registration.deviceId);
      if (result.data) {
        registeredPushTokenRef.current = result.data.token;
      } else if (!options.silent) {
        showToast(result.error?.message ?? '通知设备登记失败');
      }
    } catch {
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
    clearScheduledPushRegistration();
    scheduledPushRegistrationRef.current = setTimeout(() => {
      scheduledPushRegistrationRef.current = null;
      if (sessionTokenRef.current !== targetSession.token) return;
      void registerPushDevice({ silent: true, targetSession });
    }, options.delayMs ?? 1500);
  }

  async function refreshPermissionStatuses(options: { base?: PermissionStateMap; completed?: boolean; persist?: boolean } = {}) {
    let nextPermissions = mergePermissionState(options.base ?? permissions);

    if (Platform.OS !== 'web') {
      const statusResults = await Promise.all(permissionKeys.map((key) => getLumiiPermissionStatus(key)));
      const nativeStatusPatch = Object.fromEntries(statusResults.map((result) => [result.permission, result.status])) as Partial<PermissionStateMap>;
      nextPermissions = mergeNativePermissionStatus(nextPermissions, nativeStatusPatch);
    }

    setPermissions(nextPermissions);

    if (options.persist) {
      nextPermissions = await persistPermissionSnapshot(nextPermissions, Boolean(options.completed));
    }

    return nextPermissions;
  }

  async function restoreAfterLogin(nextSession: AuthSession, options: { persist?: boolean; silent?: boolean } = {}) {
    setLumiiAuthToken(nextSession.token);
    sessionTokenRef.current = nextSession.token;
    setSession(nextSession);
    setHistory([]);

    const account = nextSession.account;
    const accountPermissions = mergePermissionState(account?.permissions);
    setPermissions(accountPermissions);
    setUserSettings({ ...defaultUserSettings, ...(account?.settings ?? {}) });

    const [petResult, latestPermissions] = await Promise.all([
      lumiiApi.pets.listPets(),
      refreshPermissionStatuses({
        base: accountPermissions,
        completed: Boolean(account?.permissionsOnboardingCompleted),
        persist: true,
      }),
    ]);

    if (petResult.error?.statusCode === 401) {
      await clearPersistedLumiiSession();
      clearLocalAccountState();
      if (!options.silent) showToast('登录已失效，请重新登录');
      return false;
    }

    if (options.persist !== false) {
      await savePersistedLumiiSession(nextSession);
    }

    const restoredPet = account?.activePet ?? petResult.data?.[0] ?? lumiiApi.pets.getActivePet();
    setActivePet(restoredPet ?? null);
    if (latestPermissions.notifications === 'granted') {
      schedulePushDeviceRegistration({ delayMs: 2500, targetSession: nextSession });
    }

    const permissionFlowDone = Boolean(account?.permissionsOnboardingCompleted || allLumiiPermissionsGranted(latestPermissions));
    replace(restoredPet ? 'home' : permissionFlowDone ? 'emptyPet' : 'permissions');
    if (!options.silent) showToast('登录成功');
    return true;
  }

  async function requestSmsCode(source: 'login' | 'otp') {
    if (sendLoading) return;
    if (!agreementAccepted) {
      showToast('请先勾选并同意用户协议与隐私政策');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      showToast('请输入正确的中国大陆手机号');
      return;
    }
    setSendLoading(true);
    try {
      const result = await lumiiApi.auth.sendSmsCode(phone);
      if (result.state === 'success' && result.data) {
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
      setSendLoading(false);
    }
  }

  async function verifySmsCode(codeOverride?: string) {
    if (!otpMeta) {
      showToast('请先获取验证码');
      return;
    }
    const code = (codeOverride ?? otpCode).replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setOtpInlineError('请输入 6 位验证码');
      return;
    }
    setVerifyLoading(true);
    setOtpInlineError('');
    try {
      const result = await lumiiApi.auth.verifySmsCode(otpMeta.phone, code, otpMeta.expiresAt);
      if (result.data) {
        await restoreAfterLogin(result.data);
      } else {
        const message = result.error?.message ?? '验证码校验失败';
        setOtpInlineError(message);
        showToast(message);
      }
    } finally {
      setVerifyLoading(false);
    }
  }

  function handleOtpCodeChange(value: string) {
    const next = value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(next);
    if (otpInlineError) setOtpInlineError('');
    if (next.length === 6 && !verifyLoading) void verifySmsCode(next);
  }

  async function requestPermission(key: keyof PermissionStateMap) {
    if (permissions[key] === 'requesting' || permissions[key] === 'granted') return;
    setPermissions((items) => ({ ...items, [key]: 'requesting' }));
    const result = await requestLumiiPermission(key);
    const nextPermissions = mergePermissionState(permissions, { [key]: result.status });
    setPermissions(nextPermissions);
    void persistPermissionSnapshot(nextPermissions);
    if (key === 'notifications' && result.status === 'granted') {
      schedulePushDeviceRegistration();
    }
    showToast(result.message);
  }

  async function requestAllPermissions() {
    let grantedAfterRequest = 0;
    let nextPermissions = mergePermissionState(permissions);
    for (const key of permissionKeys) {
      if (permissions[key] === 'granted') {
        grantedAfterRequest += 1;
        continue;
      }
      setPermissions((items) => ({ ...items, [key]: 'requesting' }));
      const result = await requestLumiiPermission(key);
      if (result.status === 'granted') grantedAfterRequest += 1;
      nextPermissions = mergePermissionState(nextPermissions, { [key]: result.status });
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
    if (petProfileSaving) return;
    if (!petDraft.name.trim()) {
      showToast('请输入宠物昵称');
      return;
    }
    const payload = {
      birthday: petDraft.birthday,
      breed: petDraft.breed.trim() || '未知品种',
      gender: petDraft.gender,
      name: petDraft.name.trim(),
      species: petDraft.species,
      weightKg: Number.parseFloat(petDraft.weight) || undefined,
    };
    setPetProfileSaving(true);
    try {
      if (route === 'editPet') {
        const pet = activePet ?? lumiiApi.pets.getActivePet();
        if (!pet) {
          showToast('请先添加宠物档案');
          return;
        }
        const result = await lumiiApi.pets.updatePet(pet.id, payload);
        if (result.data) {
          setActivePet(result.data);
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
        setActivePet(result.data);
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
        resetAvatarDraft();
        void refreshPetScopedData();
        go('upload');
      } else {
        showToast(result.error?.message ?? '保存宠物档案失败');
      }
    } finally {
      setPetProfileSaving(false);
    }
  }

  function resetAvatarDraft() {
    setMedia(null);
    setAvatarJob(null);
    setAvatarStarting(false);
    setAvatarResultPrefetching(false);
    setMediaPickerMode(null);
    avatarResultRouteJobIdRef.current = '';
  }

  function startPetAvatarRefresh() {
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    if (!pet) {
      showToast('请先添加宠物档案');
      return;
    }
    resetAvatarDraft();
    go('upload');
  }

  async function pickAndUploadPetMedia(source: 'camera' | 'library') {
    if (mediaPickerMode) return;
    setMediaPickerMode(source);
    try {
      const permissionResult =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showToast(source === 'camera' ? '请先允许相机权限' : '请先允许访问相册');
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
      if (result.data) {
        setMedia(result.data);
        if (!result.data.analysis.canGenerate) {
          go('uploadNoPet');
          return;
        }
        go('uploadDetail');
      } else {
        go('uploadNoPet');
      }
    } catch {
      showToast(source === 'camera' ? '打开相机失败，请稍后重试' : '打开相册失败，请稍后重试');
    } finally {
      setMediaPickerMode(null);
    }
  }

  async function startAvatarGeneration() {
    if (avatarStarting || avatarRetrying) return;
    if (!media) {
      showToast('请先上传宠物照片');
      return;
    }
    if (!media.analysis.canGenerate) {
      showToast(media.analysis.message || '当前照片不适合生成，请重新上传');
      replace('uploadNoPet');
      return;
    }
    setAvatarStarting(true);
    try {
      const hasQuota = await ensurePetAvatarQuota();
      if (!hasQuota) return;
      const result = await lumiiApi.avatar.startGeneration(media.mediaId);
      if (result.data) {
        avatarResultRouteJobIdRef.current = '';
        setAvatarResultPrefetching(false);
        setAvatarJob(result.data);
        go('generating');
      } else {
        showToast(result.error?.message ?? '启动生成失败');
      }
      void loadAiUsage();
    } finally {
      setAvatarStarting(false);
    }
  }

  async function transitionToAvatarResult(job: AvatarJob) {
    if (avatarResultRouteJobIdRef.current === job.id) return;
    avatarResultRouteJobIdRef.current = job.id;
    setAvatarResultPrefetching(true);
    const resultUrl = job.resultUrl;
    if (resultUrl && !isGeneratedAvatarUri(resultUrl)) {
      try {
        await Promise.race([Image.prefetch(resultUrl), new Promise((resolve) => setTimeout(resolve, 7000))]);
      } catch {
        showToast('生成图加载较慢，已先进入确认页');
      }
    }
    setAvatarResultPrefetching(false);
    replace('aiResult');
  }

  async function pollAvatarJob() {
    if (!avatarJob) return;
    const result = await lumiiApi.avatar.getGenerationStatus(avatarJob.id);
    if (result.data) {
      setAvatarJob(result.data);
      if (result.data.status === 'ready') void transitionToAvatarResult(result.data);
    }
  }

  async function saveAvatar() {
    if (!activePet || !avatarJob?.resultUrl) {
      showToast('还没有可保存的形象');
      return;
    }
    if (avatarAccepting) return;
    setAvatarAccepting(true);
    try {
      const result = avatarJob.id
        ? await lumiiApi.avatar.acceptGeneration(avatarJob.id)
        : await lumiiApi.avatar.saveAvatar(activePet.id, avatarJob.resultUrl);
      if (result.data) {
        setActivePet(result.data);
        resetAvatarDraft();
        void refreshPetScopedData();
        replace('home');
        showToast('灵伴形象已保存');
      } else {
        showToast(result.error?.message ?? '保存形象失败，请稍后重试');
      }
    } finally {
      setAvatarAccepting(false);
    }
  }

  async function retryAvatarGeneration() {
    if (avatarRetrying) return;
    if (!avatarJob?.id) {
      await startAvatarGeneration();
      return;
    }
    setAvatarRetrying(true);
    try {
      const hasQuota = await ensurePetAvatarQuota();
      if (!hasQuota) return;
      const result = await lumiiApi.avatar.retryGeneration(avatarJob.id);
      if (result.data) {
        avatarResultRouteJobIdRef.current = '';
        setAvatarResultPrefetching(false);
        setAvatarJob(result.data);
        replace('generating');
      } else {
        showToast(result.error?.message ?? '重新生成失败，请稍后重试');
      }
      void loadAiUsage();
    } finally {
      setAvatarRetrying(false);
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
      setActivePet(message.updatedPet);
      shouldRefreshHealth = true;
      addSyncLabel('宠物档案');
    }

    if (message.createdMemo) {
      setMemos((items) => [message.createdMemo!, ...items.filter((item) => item.id !== message.createdMemo!.id)]);
      shouldRefreshHealth = true;
      addSyncLabel('健康备忘');
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
    const text = (textOverride ?? chatInput).trim();
    if (!text) return;
    if (chatReplying) {
      showToast('等灵伴回复完再继续聊');
      return;
    }
    if (petChatDailyCount >= petChatDailyLimit) {
      showToast('今天和灵伴聊得很多啦，稍后再继续');
      return;
    }
    const local: ChatMessage = retryMessageId
      ? { author: 'me', id: retryMessageId, status: 'sending', text, time: '刚刚' }
      : { author: 'me', id: `me-${Date.now()}`, status: 'sending', text, time: '刚刚' };
    if (!retryMessageId) setChatInput('');
    setChatReplying(true);
    setChatMessages((items) =>
      retryMessageId ? items.map((item) => (item.id === retryMessageId ? local : item)) : [...items, local],
    );
    try {
      const result = await lumiiApi.messages.sendMessage(text);
      setChatMessages((items) => items.map((item) => (item.id === local.id ? { ...item, status: result.data ? 'sent' : 'failed' } : item)));
      if (result.data) {
        setChatMessages((items) => [...items, result.data!]);
        syncPetChatBusinessEffects(result.data);
        void loadAiUsage();
      } else {
        showToast(result.error?.message ?? '消息发送失败');
        void loadAiUsage();
      }
    } finally {
      setChatReplying(false);
    }
  }

  async function ratePetChatReply(messageId: string, rating: PetChatFeedbackRating) {
    if (chatFeedbackSavingIds.includes(messageId)) return;
    setChatFeedbackSavingIds((items) => [...new Set([...items, messageId])]);
    const previousRating = chatFeedbackById[messageId];
    setChatFeedbackById((items) => ({ ...items, [messageId]: rating }));
    try {
      const result = await lumiiApi.messages.sendPetChatFeedback(messageId, rating);
      if (result.data) {
        setChatMessages((items) => items.map((item) => (item.id === messageId ? { ...item, feedback: result.data!.feedback } : item)));
        showToast(rating === 'good' ? '已记录：这个回复像它' : '已记录：后续会让灵伴更贴近它');
      } else {
        setChatFeedbackById((items) => {
          const next = { ...items };
          if (previousRating) next[messageId] = previousRating;
          else delete next[messageId];
          return next;
        });
        showToast(result.error?.message ?? '反馈保存失败，请稍后重试');
      }
    } finally {
      setChatFeedbackSavingIds((items) => items.filter((id) => id !== messageId));
    }
  }

  async function openConversation(conversation: Conversation) {
    selectedConversationIdRef.current = conversation.id;
    setSelectedConversation(conversation);
    if (conversation.canSendMessage === false) setConversationInput('');
    setConversations((items) => items.map((item) => (item.id === conversation.id ? { ...item, unread: 0 } : item)));
    setConversationMessages([createConversationSafetyMessage()]);
    go('conversation');
    await loadConversationMessages(conversation.id, { markRead: true });
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
    if (!beginSocialAction(actionId)) return;
    try {
      const result = await lumiiApi.social.rejectGreeting(owner.id);
      if (result.data) {
        setGreetingRequestOwners((items) => items.filter((item) => item.id !== owner.id));
        void loadInboxData();
        showToast('已婉拒招呼');
      } else {
        showToast(result.error?.message ?? '操作失败，请稍后重试');
      }
    } finally {
      endSocialAction(actionId);
    }
  }

  async function acceptGreeting(owner: NearbyOwner) {
    const actionId = `accept:${owner.id}`;
    if (!beginSocialAction(actionId)) return;
    try {
      const result = await lumiiApi.social.acceptGreeting(owner.id);
      if (result.data) {
        setGreetingRequestOwners((items) => items.filter((item) => item.id !== owner.id));
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
    const text = (textOverride ?? conversationInput).trim();
    const conversation = selectedConversation ?? conversations[0];
    if (!text || !conversation) return;
    if (conversation.canSendMessage === false) {
      showToast('对方接受招呼后才能聊天');
      return;
    }
    const local: ConversationMessage = retryMessageId
      ? { author: 'me', id: retryMessageId, status: 'sending', text, time: '刚刚' }
      : { author: 'me', id: `conversation-${Date.now()}`, status: 'sending', text, time: '刚刚' };
    if (!retryMessageId) setConversationInput('');
    setConversationMessages((items) =>
      retryMessageId ? items.map((item) => (item.id === retryMessageId ? local : item)) : [...items, local],
    );
    const result = await lumiiApi.messages.sendConversationMessage(conversation.id, text);
    setConversationMessages((items) => items.map((item) => (item.id === local.id ? (result.data ?? { ...item, status: 'failed' }) : item)));
    if (result.data) {
      setConversations((items) => items.map((item) => (item.id === conversation.id ? { ...item, lastMessage: text, unread: 0 } : item)));
    } else {
      showToast(result.error?.message ?? '消息发送失败');
    }
  }

  function deleteLocalConversationMessage(messageId: string) {
    setConversationMessages((items) => items.filter((item) => item.id !== messageId));
  }

  async function recordWeight() {
    if (weightSaving) return;
    const kg = Number.parseFloat(weightInput);
    if (!Number.isFinite(kg) || kg <= 0) {
      showToast('请输入正确体重');
      return;
    }
    setWeightSaving(true);
    try {
      const result = await lumiiApi.health.recordWeight(kg, '手动记录');
      if (result.data) {
        setWeights((items) => [result.data!, ...items]);
        setActivePet((pet) => (pet ? { ...pet, weightKg: result.data!.kg } : pet));
        setWeightInput('');
        void refreshHealthSummary();
        showToast('体重已记录');
      } else {
        showToast(result.error?.message ?? '保存失败，请稍后重试');
      }
    } finally {
      setWeightSaving(false);
    }
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
    if (vaccineReminderSavingIds.includes(vaccine.id)) return;
    setVaccineReminderSavingIds((items) => [vaccine.id, ...items.filter((id) => id !== vaccine.id)]);
    setVaccineReminderIds((items) => [vaccine.id, ...items.filter((id) => id !== vaccine.id)]);
    try {
      const result = await lumiiApi.health.setVaccineReminder(vaccine.id, true);
      if (result.data) {
        setVaccineReminderIds(result.data);
        void loadInboxData();
        void refreshHealthSummary();
        const pushReady = permissions.notifications === 'granted' && userSettings.pushNotifications;
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
      setVaccineReminderSavingIds((items) => items.filter((id) => id !== vaccine.id));
    }
  }

  async function markVaccineDone(vaccine?: VaccinePlan) {
    if (!vaccine) {
      showToast('暂无可完成的疫苗计划');
      return;
    }
    if (vaccineDoneSavingIds.includes(vaccine.id)) return;
    setVaccineDoneSavingIds((items) => [vaccine.id, ...items.filter((id) => id !== vaccine.id)]);
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
      setVaccineDoneSavingIds((items) => items.filter((id) => id !== vaccine.id));
    }
  }

  async function syncNearbySettingsChange(key: UserSettingKey, nextValue: boolean) {
    if (key !== 'nearbyVisible' && key !== 'fuzzyLocation') return;

    lastDiscoverLocationRef.current = null;
    const nearbyWillBeVisible = key === 'nearbyVisible' ? nextValue : userSettings.nearbyVisible;
    if (!nearbyWillBeVisible) {
      applyNearbyOwners([]);
      void loadInboxData();
      return;
    }

    const nextOwners = await fetchNearbyOwners({ forceLocation: true, silent: true });
    if (nextOwners) applyNearbyOwners(nextOwners);
    void loadInboxData();
  }

  async function toggleUserSetting(key: UserSettingKey, label: string) {
    if (userSettingSavingKeysRef.current.has(key)) return;
    userSettingSavingKeysRef.current.add(key);
    const previousSettings = userSettings;
    const nextValue = !previousSettings[key];
    const nextSettings = { ...previousSettings, [key]: nextValue };

    try {
      if (key === 'pushNotifications' && nextValue && permissions.notifications !== 'granted') {
        setPermissions((items) => ({ ...items, notifications: 'requesting' }));
        const permissionResult = await requestLumiiPermission('notifications');
        const nextPermissions = mergePermissionState(permissions, { notifications: permissionResult.status });
        const savedPermissions = await persistPermissionSnapshot(nextPermissions);
        setPermissions(savedPermissions);
        if (permissionResult.status !== 'granted') {
          showToast(permissionResult.status === 'blocked' ? '请先在系统设置开启消息通知权限' : '请先允许消息通知权限');
          return;
        }
        schedulePushDeviceRegistration();
      }

      setUserSettings(nextSettings);
      const result = await lumiiApi.settings.updateUserSettings({ [key]: nextValue });
      if (result.data) {
        setUserSettings({ ...defaultUserSettings, ...result.data });
        if (key === 'pushNotifications') {
          if (nextValue) {
            void syncVaccineLocalReminders(vaccines, vaccineReminderIds, activePet?.name);
            localHealthReminderScheduledIdsRef.current = vaccineReminderIds;
            localHealthReminderSyncKeyRef.current = '';
          } else {
            void cancelVaccineLocalReminders(vaccineReminderIds);
            localHealthReminderScheduledIdsRef.current = [];
            localHealthReminderSyncKeyRef.current = '';
          }
        }
        void syncNearbySettingsChange(key, nextValue);
        showToast(`${label}已${nextValue ? '开启' : '关闭'}`);
      } else {
        setUserSettings(previousSettings);
        showToast(result.error?.message ?? '设置保存失败，请稍后重试');
      }
    } finally {
      userSettingSavingKeysRef.current.delete(key);
    }
  }

  async function toggleFavoritePlace(place?: Place) {
    if (!place) {
      showToast('暂无可收藏地点');
      return;
    }
    if (favoritePlaceSavingIds.includes(place.id)) return;
    const wasFavorite = favoritePlaceIds.includes(place.id);
    const nextFavorite = !wasFavorite;
    setFavoritePlaceSavingIds((ids) => [place.id, ...ids.filter((id) => id !== place.id)]);
    setFavoritePlaceIds((ids) => (nextFavorite ? [place.id, ...ids.filter((id) => id !== place.id)] : ids.filter((id) => id !== place.id)));
    try {
      const result = await lumiiApi.places.setFavoritePlace(place.id, nextFavorite);
      if (result.data) {
        setFavoritePlaceIds(result.data);
        showToast(nextFavorite ? '已收藏地点' : '已取消收藏');
      } else {
        setFavoritePlaceIds((ids) => (wasFavorite ? [place.id, ...ids.filter((id) => id !== place.id)] : ids.filter((id) => id !== place.id)));
        showToast(result.error?.message ?? '收藏状态保存失败');
      }
    } finally {
      setFavoritePlaceSavingIds((ids) => ids.filter((id) => id !== place.id));
    }
  }

  function buildPlaceShareMessage(place: Place) {
    const tags = place.tags.length ? `\n宠物友好特色：${place.tags.join('、')}` : '';
    return [
      `我在灵伴发现了一个宠物友好地点：${place.name}`,
      `地址：${place.address}`,
      `距离：${place.distance} · 评分 ${place.rating}`,
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

  function buildAmapPlaceSearchUrl(place: Place) {
    const keyword = `${place.name} ${place.address}`.trim();
    const params = new URLSearchParams({
      callnative: '1',
      keyword,
      src: 'lumii',
      view: 'map',
    });
    return `https://uri.amap.com/search?${params.toString()}`;
  }

  async function openAmapPlace(place?: Place) {
    if (!place) {
      showToast('暂无可打开地点');
      return;
    }
    try {
      await Linking.openURL(buildAmapPlaceSearchUrl(place));
    } catch {
      showToast('无法打开高德地图，请稍后重试');
    }
  }

  function openPetCompanionSettings() {
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    if (!pet) {
      showToast('请先添加宠物档案');
      return;
    }
    go('petDetail');
  }

  async function saveMemoDraft() {
    if (memoDraftSaving) return;
    if (!memoDraftTitle.trim() || !memoDraftContent.trim()) {
      showToast('请填写备忘标题和内容');
      return;
    }
    setMemoDraftSaving(true);
    try {
      const result = await lumiiApi.health.saveHealthMemo(memoDraftTitle, memoDraftContent);
      if (result.data) {
        setMemos((items) => [result.data!, ...items]);
        setMemoDraftTitle('');
        setMemoDraftContent('');
        void refreshHealthSummary();
        showToast('健康备忘已保存');
      } else {
        showToast(result.error?.message ?? '保存失败，请稍后重试');
      }
    } finally {
      setMemoDraftSaving(false);
    }
  }

  async function saveHealthMemo() {
    if (memoSaving) return;
    if (!memoTitle.trim() || !memoContent.trim()) {
      showToast('请填写标题和内容');
      return;
    }
    setMemoSaving(true);
    try {
      const result = await lumiiApi.health.saveHealthMemo(memoTitle, memoContent);
      if (result.data) {
        setMemos((items) => [result.data!, ...items]);
        setMemoContent('');
        void refreshHealthSummary();
        showToast('健康备忘已保存');
      } else {
        showToast(result.error?.message ?? '保存失败，请稍后重试');
      }
    } finally {
      setMemoSaving(false);
    }
  }

  async function publishDailyPost() {
    if (dailyPostSaving) return;
    if (!dailyPostText.trim()) {
      showToast('先写一点今天的小事吧');
      return;
    }
    setDailyPostSaving(true);
    try {
      const result = await lumiiApi.health.saveHealthMemo('今日小事', dailyPostText.trim());
      if (result.data) {
        setMemos((items) => [result.data!, ...items]);
        setDailyPostText('');
        void refreshHealthSummary();
        replace('home');
        showToast('今日小事已记录');
      } else {
        showToast(result.error?.message ?? '发布失败，请稍后重试');
      }
    } finally {
      setDailyPostSaving(false);
    }
  }

  async function sendGreeting(ownerId: string) {
    const actionId = `greet:${ownerId}`;
    if (!beginSocialAction(actionId)) return;
    const owner = owners.find((item) => item.id === ownerId);
    try {
      const result = await lumiiApi.social.sendGreeting(ownerId);
      if (result.data) {
        if (result.data.conversation) {
          setConversations((items) => [result.data!.conversation!, ...items.filter((item) => item.id !== result.data!.conversation!.id)]);
        }
        void loadInboxData();
        showToast(`已向${owner?.petName ?? '附近伙伴'}打招呼`);
      } else {
        showToast(result.error?.message ?? '发送失败');
      }
    } finally {
      endSocialAction(actionId);
    }
  }

  async function createWalkInvite() {
    if (walkInviteSavingRef.current) return;
    const owner = selectedOwner ?? owners[0];
    if (!owner) {
      showToast('请选择附近主人');
      return;
    }
    if (!walkInvitePlace.trim() || !walkInviteTime.trim()) {
      showToast('请填写地点和时间');
      return;
    }
    walkInviteSavingRef.current = true;
    setWalkInviteSaving(true);
    try {
      const result = await lumiiApi.social.createWalkInvite(owner.id, {
        note: walkInviteNote.trim(),
        place: walkInvitePlace.trim(),
        time: walkInviteTime.trim(),
      });
      if (result.data) {
        const conversation =
          result.data.conversation ??
          {
            id: `walk-${Date.now()}`,
            lastMessage: `${walkInviteTime} · ${walkInvitePlace}`,
            name: `${owner.ownerName}和${owner.petName}`,
            unread: 0,
          };
        setConversations((items) => [conversation, ...items.filter((item) => item.id !== conversation.id)]);
        setWalkInviteNote('');
        void loadInboxData();
        replace('messages');
        showToast('约遛邀请已发送');
      } else {
        showToast(result.error?.message ?? '约遛邀请发送失败');
      }
    } finally {
      walkInviteSavingRef.current = false;
      setWalkInviteSaving(false);
    }
  }

  async function searchPlaces() {
    if (placeSearching) return;
    const query = placeQuery.trim();
    setPlaceSearching(true);
    setPlaceFilter('all');
    try {
      const result = query ? await lumiiApi.places.searchPlaces(query) : await lumiiApi.places.listNearbyPlaces();
      if (result.data) {
        const nextPlaces = result.data;
        setPlaces(nextPlaces);
        setSelectedPlace((current) => (current && nextPlaces.some((place) => place.id === current.id) ? current : nextPlaces[0] ?? null));
        showToast(query ? (nextPlaces.length ? `找到 ${nextPlaces.length} 个地点` : '没有匹配地点') : '已刷新附近地点');
      } else {
        showToast(result.error?.message ?? '搜索失败，请稍后重试');
      }
    } finally {
      setPlaceSearching(false);
    }
  }

  async function fetchNearbyOwners(options: { forceLocation?: boolean; silent?: boolean } = {}) {
    const location = options.forceLocation
      ? await getDiscoverLocationHint({ silent: options.silent })
      : lastDiscoverLocationRef.current ?? (await getDiscoverLocationHint({ silent: options.silent }));
    const result = await lumiiApi.social.listNearbyOwners(location ?? undefined);
    if (result.data) return result.data;
    if (!options.silent) showToast(result.error?.message ?? '附近伙伴刷新失败，请稍后重试');
    return null;
  }

  async function refreshDiscoverByPull() {
    if (discoverRefreshing) return;
    if (!userSettings.nearbyVisible) {
      applyNearbyOwners([]);
      showToast('请先在我的页开启附近可见');
      return;
    }
    setDiscoverRefreshing(true);
    try {
      const nextOwners = await fetchNearbyOwners({ forceLocation: true, silent: false });
      if (nextOwners) {
        applyNearbyOwners(nextOwners);
        showToast(nextOwners.length ? '已刷新附近伙伴' : '3km 内暂时没有新的伙伴');
      }
    } finally {
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

  async function getDiscoverLocationHint(options: { silent?: boolean } = {}): Promise<NearbyLocationHint | null> {
    try {
      const permissionResult = await requestLumiiPermission('location');
      const nextPermissions = mergePermissionState(permissions, { location: permissionResult.status });
      setPermissions(nextPermissions);
      void persistPermissionSnapshot(nextPermissions);

      if (permissionResult.status !== 'granted') {
        if (!options.silent) showToast(permissionResult.message);
        return null;
      }

      if (!isLumiiAmapAvailable) {
        const fallback = {
          latitude: defaultMapCenter.latitude,
          longitude: defaultMapCenter.longitude,
          radiusKm: defaultDiscoverRadiusKm,
        };
        lastDiscoverLocationRef.current = fallback;
        return fallback;
      }

      const location = await getLumiiAmapCurrentLocation();
      const hint = {
        accuracy: location.accuracy,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: defaultDiscoverRadiusKm,
      };
      lastDiscoverLocationRef.current = hint;
      return hint;
    } catch (error) {
      if (!options.silent) showToast(error instanceof Error ? error.message : '定位失败，请稍后重试');
      return lastDiscoverLocationRef.current;
    }
  }

  async function locateMapToCurrentPosition(options: { silent?: boolean } = {}) {
    if (locatingMap) return;
    setLocatingMap(true);
    try {
      const permissionResult = await requestLumiiPermission('location');
      const nextPermissions = mergePermissionState(permissions, { location: permissionResult.status });
      setPermissions(nextPermissions);
      void persistPermissionSnapshot(nextPermissions);

      if (permissionResult.status !== 'granted') {
        if (!options.silent) showToast(permissionResult.message);
        return;
      }

      if (!isLumiiAmapAvailable) {
        lastDiscoverLocationRef.current = {
          latitude: defaultMapCenter.latitude,
          longitude: defaultMapCenter.longitude,
          radiusKm: defaultDiscoverRadiusKm,
        };
        setMapCenter(defaultMapCenter);
        if (!options.silent) showToast('当前预览环境使用模拟地图，真机将调用高德定位');
        return;
      }

      const location = await getLumiiAmapCurrentLocation();
      const accuracy = location.accuracy ? Math.round(location.accuracy) : undefined;
      lastDiscoverLocationRef.current = {
        accuracy: location.accuracy,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: defaultDiscoverRadiusKm,
      };
      setMapCenter({
        latitude: location.latitude,
        longitude: location.longitude,
        markerSnippet: location.address || (accuracy ? `定位精度约 ${accuracy} 米` : '已定位到当前位置'),
        markerTitle: '我的当前位置',
        zoom: accuracy && accuracy > 500 ? 15 : 16,
      });
      if (!options.silent) showToast(accuracy ? `已定位，精度约 ${accuracy} 米` : '已定位到当前位置');
    } catch (error) {
      if (!options.silent) showToast(error instanceof Error ? error.message : '定位失败，请稍后重试');
    } finally {
      setLocatingMap(false);
    }
  }

  async function createPlaceReview() {
    if (placeReviewSaving) return;
    const place = selectedPlace ?? places[0];
    if (!place) return;
    if (!placeReview.trim()) {
      showToast('请填写点评内容');
      return;
    }
    const reviewContent = placeReview.trim();
    setPlaceReviewSaving(true);
    try {
      const result = await lumiiApi.places.createReview(place.id, reviewContent);
      if (result.data) {
        setPlaceReview('');
        setPlaceReviewStatus('pending_review');
        setPlaceReviewsByPlaceId((items) => ({ ...items, [place.id]: result.data! }));
        void loadInboxData();
        showToast('点评已提交，等待审核');
      } else {
        showToast(result.error?.message ?? '提交失败，请稍后重试');
      }
    } finally {
      setPlaceReviewSaving(false);
    }
  }

  async function submitPlaceDraft() {
    if (placeReviewSaving) return;
    if (!placeDraftName.trim() || !placeDraftAddress.trim()) {
      showToast('请填写地点名称和地址');
      return;
    }
    if (!placeReview.trim()) {
      showToast('请填写宠物友好体验');
      return;
    }
    setPlaceReviewSaving(true);
    try {
      const result = await lumiiApi.places.createSubmission(placeDraftName.trim(), placeDraftAddress.trim(), placeReview.trim());
      if (result.data) {
        setPlaceReview('');
        setPlaceDraftName('');
        setPlaceDraftAddress('');
        setPlaceReviewStatus('pending_review');
        void loadInboxData();
        showToast('地点已提交审核');
      } else {
        showToast(result.error?.message ?? '提交失败，请稍后重试');
      }
    } finally {
      setPlaceReviewSaving(false);
    }
  }

  function clearLocalAccountState() {
    if (localHealthReminderScheduledIdsRef.current.length) void cancelVaccineLocalReminders(localHealthReminderScheduledIdsRef.current);
    clearScheduledPushRegistration();
    setLumiiAuthToken();
    setConfirm(null);
    setSession(null);
    setActivePet(null);
    setHistory([]);
    setPhone('');
    setPhoneFocused(false);
    setAgreementAccepted(false);
    setSendLoading(false);
    setVerifyLoading(false);
    setOtpCode('');
    setOtpMeta(null);
    setOtpInlineError('');
    setCooldownUntil(0);
    setClock(Date.now());
    setPermissions(initialPermissions);
    setPetDraft(emptyPetDraft);
    setPetProfileSaving(false);
    setMedia(null);
    setMediaPickerMode(null);
    setAvatarJob(null);
    setAvatarStarting(false);
    setAvatarResultPrefetching(false);
    setAvatarAccepting(false);
    setAvatarRetrying(false);
    avatarResultRouteJobIdRef.current = '';
    registeredPushTokenRef.current = '';
    sessionTokenRef.current = '';
    setChatMessages([createPetChatWelcomeMessage()]);
    setChatInput('');
    setChatFeedbackById({});
    setChatFeedbackSavingIds([]);
    setChatReplying(false);
    setAiUsage(null);
    setPetChatDailyCount(0);
    setWeights([]);
    setVaccines([]);
    setVaccineReminderIds([]);
    setMemos([]);
    setWeightInput('');
    setConversations([]);
    setSelectedConversation(null);
    selectedConversationIdRef.current = null;
    inboxRefreshInFlightRef.current = false;
    inboxRefreshQueuedRef.current = false;
    conversationRefreshInFlightRef.current = null;
    setInboxManualRefreshing(false);
    setConversationInput('');
    setConversationMessages([createConversationSafetyMessage()]);
    setNotifications([]);
    applyNearbyOwners([]);
    setDiscoverRefreshing(false);
    setDiscoverFilter('all');
    setGreetingRequestOwners([]);
    socialActionSavingIdsRef.current.clear();
    setSocialActionSavingIds([]);
    walkInviteSavingRef.current = false;
    setWalkInviteSaving(false);
    setSelectedOwner(null);
    setWalkInvitePlace('滨江绿地');
    setWalkInviteTime('今天 19:00');
    setWalkInviteNote('');
    setPlaces([]);
    setPlaceQuery('');
    setPlaceFilter('all');
    setPlaceSearching(false);
    setSelectedPlace(null);
    setFavoritePlaceIds([]);
    setFavoritePlaceSavingIds([]);
    setPlaceReviewsByPlaceId({});
    setLocatingMap(false);
    setMapCenter(defaultMapCenter);
    setMapStyleKey('lumii');
    setMapTrafficEnabled(false);
    setMapStylePanelVisible(false);
    mapAutoLocateAttemptedRef.current = false;
    lastDiscoverLocationRef.current = null;
    setPlaceDraftAddress('滨江路 88 号');
    setPlaceDraftName('云杉宠物友好公园');
    setPlaceReview('');
    setPlaceReviewSaving(false);
    setPlaceReviewStatus('idle');
    userSettingSavingKeysRef.current.clear();
    setHealthSummary(null);
    setWeightSaving(false);
    setMemoTitle('今日观察');
    setMemoContent('');
    setMemoSaving(false);
    setMemoDraftTitle('洗澡记录');
    setMemoDraftContent('今天洗澡后耳朵干净，皮肤没有明显泛红。');
    setMemoDraftSaving(false);
    setVaccineReminderSavingIds([]);
    setVaccineDoneSavingIds([]);
    setDailyPostText('');
    setDailyPostSaving(false);
    healthReminderNotifiedRef.current.clear();
    localHealthReminderScheduledIdsRef.current = [];
    localHealthReminderSyncKeyRef.current = '';
    setUserSettings(defaultUserSettings);
    replace('login');
  }

  async function logout() {
    try {
      await lumiiApi.auth.logout();
    } finally {
      await clearPersistedLumiiSession();
      clearLocalAccountState();
    }
    showToast('已退出登录');
  }

  function openConfirm(title: string, body: string, onConfirm: () => void, confirmText?: string) {
    setConfirm({ body, confirmText, onConfirm, title });
  }

  const Screen = useCallback(
    function ScreenView({ children, refreshControl, showBack = true, title }: { children: ReactNode; refreshControl?: ReactElement<RefreshControlProps>; showBack?: boolean; title?: string }) {
      const headerTitle = title ?? routeTitles[route] ?? '灵伴';
      const hideHeader = route === 'login' || route === 'home' || route === 'discover' || route === 'map' || route === 'messages' || route === 'profile' || route === 'chat' || route === 'placeDetail';
      const isLoginRoute = route === 'login';
      const isOtpRoute = route === 'otp';
      const isMapRoute = route === 'map';
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
                <View style={[styles.headerSpacer, isOtpRoute && styles.otpHeaderSpacer]} />
              </View>
            </View>
          )}
          {isOtpRoute ? (
            <View style={styles.otpContent}>{children}</View>
          ) : isMapRoute ? (
            <View style={styles.mapContent}>{children}</View>
          ) : isLoginRoute ? (
            <View style={[styles.content, styles.loginContent]}>{children}</View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.content, showBottomTabs && styles.contentWithTabs]}
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
    [back, route, showBottomTabs],
  );

  function renderLogin() {
    return (
      <Screen showBack={false}>
        <View style={styles.loginHero}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <PawPrint color="#fff" size={21} strokeWidth={2.4} />
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
              onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 11))}
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
          <Button disabled={sendLoading || cooldownRemaining > 0 || phone.trim().length === 0} loading={sendLoading} onPress={() => void requestSmsCode('login')}>
            {cooldownRemaining > 0 ? `${cooldownRemaining}s 后重试` : '获取验证码'}
          </Button>
          <Pressable
            accessibilityLabel="同意用户协议与隐私政策"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreementAccepted }}
            hitSlop={8}
            onPress={() => setAgreementAccepted((value) => !value)}
            style={[styles.agreementRow, webPressableReset]}
          >
            <View style={[styles.checkbox, agreementAccepted && styles.checkboxChecked]}>{agreementAccepted ? <Check color="#fff" size={13} strokeWidth={3} /> : null}</View>
            <Text style={styles.agreementText}>我已阅读并同意《用户协议》《隐私政策》</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  function renderSessionBootstrapping() {
    return (
      <View style={styles.bootPage}>
        <PetAvatar size={96} uri={generatedGoldenAvatarUri} />
        <ActivityIndicator color={palette.orange} size="small" />
        <Text style={styles.bootText}>正在进入灵伴</Text>
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
            <Text style={styles.otpInlineError}>{otpInlineError}</Text>
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
          <View style={styles.voiceRow}>
            <Text style={styles.voiceText}>收不到？试试</Text>
            <Text style={styles.voiceLink}>语音验证码</Text>
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
        {verifyLoading ? (
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

    return (
      <Screen showBack={false} title="">
        <View style={styles.makeIntroHeader}>
          <Mascot size={58} />
          <View style={styles.makeIntroCopy}>
            <Text style={styles.makeIntroTitle}>为你的灵伴准备一个家</Text>
            <Text style={styles.makeIntroSubtitle}>打开下列权限，体验更完整的陪伴</Text>
          </View>
        </View>

        {deniedEntry ? (
          <View style={styles.permissionDeniedHero}>
            <View style={[styles.permissionDeniedIcon, deniedEntry === 'media' && styles.tealIcon, deniedEntry === 'notifications' && styles.goldIcon]}>
              {deniedEntry === 'location' ? <MapPin color="#fff" size={30} strokeWidth={2.4} /> : deniedEntry === 'media' ? <Camera color="#fff" size={30} strokeWidth={2.4} /> : <Bell color="#fff" size={30} strokeWidth={2.4} />}
            </View>
            <Text style={styles.permissionDeniedTitle}>{permissionCopy[deniedEntry].label}未开启</Text>
            <Text style={styles.permissionDeniedText}>{permissionCopy[deniedEntry].description}</Text>
          </View>
        ) : null}

        <View style={styles.permissionMakeStack}>
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
                <View style={[styles.roundIcon, key === 'media' && styles.tealIcon, key === 'notifications' && styles.goldIcon]}>
                  <Icon color="#fff" size={20} strokeWidth={2.4} />
                </View>
                <View style={styles.flex}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{permissionCopy[key].label}</Text>
                    {isLoading ? (
                      <Text style={styles.permissionStatusLoading}>授权中</Text>
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
                  <Text style={styles.mutedText}>{permissionCopy[key].description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.makeBottomActions}>
          {deniedEntry ? (
            <Button onPress={deniedNeedsSettings ? () => void openPermissionSettings() : () => void requestPermission(deniedEntry)}>
              {deniedNeedsSettings ? '去系统设置开启权限' : `重新授权${permissionCopy[deniedEntry].label}`}
            </Button>
          ) : allPermissionsGranted ? (
            <Button onPress={() => void continueAfterPermissions()}>下一步，添加宠物</Button>
          ) : (
            <Button loading={requestingPermission} onPress={() => void requestAllPermissions()}>
              一键开启全部权限
            </Button>
          )}
          {allPermissionsGranted ? null : (
            <Pressable onPress={() => void continueAfterPermissions()} style={[styles.textAction, webPressableReset]}>
              <Text style={styles.textActionText}>暂不开启，继续使用</Text>
            </Pressable>
          )}
        </View>
      </Screen>
    );
  }

  function renderEmptyPet() {
    return (
      <Screen showBack={false} title="我的宠物">
        <View style={styles.emptyPetStage}>
          <View style={styles.emptyPetGlow}>
            <Mascot size={130} />
            <View style={styles.emptyPetPlus}>
              <Plus color={palette.orange} size={14} strokeWidth={2.8} />
            </View>
          </View>
          <Text style={styles.pageTitle}>还没有添加你的毛孩子</Text>
          <Text style={styles.pageSubtitle}>告诉 Lumii 你家的猫咪或狗狗{'\n'}我们会为它生成一个专属 AI 灵伴</Text>
          <View style={styles.emptyPetCta}>
            <Button onPress={() => go('petInfo')}>添加我的宠物</Button>
          </View>
        </View>
      </Screen>
    );
  }

  function renderPetInfo() {
    const editingPet = route === 'editPet';
    return (
      <Screen title={editingPet ? '编辑宠物信息' : '添加宠物 1/2'}>
        <View style={styles.makePageTitleBlock}>
          <Text style={styles.pageTitle}>{editingPet ? '更新它的小档案' : '告诉我们它是谁'}</Text>
          <Text style={styles.makePageSubtitle}>{editingPet ? '修改后会同步到首页、健康记录和社交资料' : '这些信息将用于生成它的专属 AI 灵伴'}</Text>
        </View>

        <View style={styles.petInfoFormMake}>
          <Field label="宠物昵称" onChangeText={(name) => setPetDraft((draft) => ({ ...draft, name }))} placeholder="例如：奶油" value={petDraft.name} />
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
          <Field label="品种" onChangeText={(breed) => setPetDraft((draft) => ({ ...draft, breed }))} placeholder="例如：金毛寻回犬" value={petDraft.breed} />
          <Field label="生日" onChangeText={(birthday) => setPetDraft((draft) => ({ ...draft, birthday }))} placeholder="例如：2024-05-30" value={petDraft.birthday} />
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
          <Field keyboardType="decimal-pad" label="体重 kg" onChangeText={(weight) => setPetDraft((draft) => ({ ...draft, weight }))} value={petDraft.weight} />
        </View>

        <View style={styles.makeBottomActions}>
          <Button loading={petProfileSaving} onPress={() => void savePetProfile()}>{editingPet ? '保存宠物信息' : '下一步：上传它的照片'}</Button>
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
              <Check color={palette.teal} size={14} strokeWidth={2.8} />
              <Text style={styles.tipMakeText}>{tip}</Text>
            </View>
          ))}
        </View>
        <View style={styles.uploadActionsMake}>
          <Button loading={mediaPickerMode === 'library'} onPress={() => void pickAndUploadPetMedia('library')} tone="secondary">相册选择</Button>
          <Button loading={mediaPickerMode === 'camera'} onPress={() => void pickAndUploadPetMedia('camera')}>立即拍照</Button>
        </View>
      </Screen>
    );
  }

  function renderUploadDetail() {
    const analysis = media?.analysis;
    const analysisTags = analysis?.tags?.length ? analysis.tags : ['正脸清晰', '毛色完整', '可生成'];
    const suggestions = analysis?.suggestions?.slice(0, 2) ?? [];
    return (
      <Screen title="识别结果">
        <View style={styles.recognitionHeroMake}>
          <PetAvatar uri={media?.previewUrl ?? demoPetPhotoUrl} size={170} />
          <View style={styles.recognitionSuccessBadge}>
            <Sparkles color="#fff" size={12} strokeWidth={2.4} />
            <Text style={styles.recognitionBadgeText}>{analysis?.status === 'warning' ? '建议优化' : '识别成功'}</Text>
          </View>
          <Text style={styles.recognitionQuality}>质量 {analysis?.qualityScore ?? 96}%</Text>
        </View>
        <View style={styles.detailCardMake}>
          <MakeDetailRow label="宠物主体" value={`${speciesLabels[activePet?.species ?? petDraft.species]} · ${activePet?.breed ?? (petDraft.breed || '金毛寻回犬')}`} />
          <View style={styles.makeDivider} />
          <MakeDetailRow label="识别状态" value={analysis?.title ?? '单只宠物主体清晰'} />
          <View style={styles.makeDivider} />
          <MakeDetailRow label="生成建议" value={analysis?.message ?? '当前照片适合生成真实卡通化灵伴形象'} />
          <View style={styles.makeDivider} />
          <MakeDetailRow label="注意事项" value={suggestions.length ? suggestions.join('；') : '生成会优先保留宠物主体并弱化背景'} />
        </View>
        <View style={styles.featureChipsMake}>
          {analysisTags.map((tag) => (
            <Text key={tag} style={analysis?.status === 'warning' ? styles.featureChipWarm : styles.featureChipCool}>{tag}</Text>
          ))}
        </View>
        <Text style={styles.aiQuotaHint}>今日形象生成 {petAvatarDailyCount}/{petAvatarDailyLimit} · 剩余 {petAvatarDailyRemaining} 次</Text>
        <View style={styles.makeBottomActions}>
          <Button loading={avatarStarting} onPress={() => void startAvatarGeneration()}>确认并生成灵伴</Button>
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
          <Button onPress={() => replace('upload')} tone="secondary">重新选择</Button>
          <Button onPress={() => replace('upload')}>重新拍照</Button>
        </View>
      </Screen>
    );
  }

  function renderGenerating() {
    const progress = avatarResultPrefetching ? 100 : avatarJob?.progress ?? 62;
    const generatingTitle = avatarResultPrefetching ? '正在载入高清灵伴形象' : '正在生成你的小灵伴';
    const generatingSubtitle = avatarResultPrefetching ? '形象已经生成完成，正在载入结果图\n马上就能确认保存' : '正在捕捉毛色、五官和表情特征\n这个过程可能需要几十秒';
    if (avatarJob?.status === 'failed') {
      return (
        <Screen title="生成灵伴">
          <View style={styles.aiGeneratingPage}>
            <View style={styles.aiGeneratingOrb}>
              <Image resizeMode="cover" source={{ uri: media?.previewUrl ?? demoPetPhotoUrl }} style={styles.aiGeneratingImage} />
              <View style={styles.aiOriginalThumb}>
                <Image resizeMode="cover" source={{ uri: media?.previewUrl ?? demoPetPhotoUrl }} style={styles.avatarImage} />
              </View>
            </View>
            <Text style={styles.aiGeneratingTitle}>生成暂时失败</Text>
            <Text style={styles.aiGeneratingSubtitle}>
              {avatarJob.errorMessage ? '服务没有返回可用结果，请稍后再试' : '当前图片生成服务开小差了，请稍后再试'}
            </Text>
            <View style={styles.uploadActionsMake}>
              <Button loading={avatarRetrying} onPress={() => void retryAvatarGeneration()}>重新生成</Button>
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
            <Image resizeMode="cover" source={{ uri: media?.previewUrl ?? demoPetPhotoUrl }} style={styles.aiGeneratingImage} />
            <View style={styles.aiScanLine} />
            <View style={styles.aiOriginalThumb}>
              <Image resizeMode="cover" source={{ uri: media?.previewUrl ?? demoPetPhotoUrl }} style={styles.avatarImage} />
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

  function renderAiResult() {
    const petName = activePet?.name ?? (petDraft.name || '豆豆');
    const petBreed = activePet?.breed || petDraft.breed || speciesLabels[petDraft.species];
    return (
      <Screen title="遇见你的小灵伴">
        <View style={styles.aiResultPage}>
          <View style={styles.aiPhotoChip}>
            <Image resizeMode="cover" source={{ uri: media?.previewUrl ?? demoPetPhotoUrl }} style={styles.aiPhotoChipImage} />
            <Text style={styles.aiPhotoChipText}>基于你上传的{'\n'}<Text style={styles.aiPhotoChipStrong}>{petName}的照片</Text></Text>
          </View>
          <View style={styles.aiResultHero}>
            <PetAvatar uri={avatarJob?.resultUrl ?? generatedGoldenAvatarUri} size={260} />
          </View>
          <Text style={styles.aiResultName}>{petName}</Text>
          <Text style={styles.aiResultDesc}>一只温柔亲人的{petBreed}灵伴已经准备好陪你</Text>
          <View style={styles.featureChipsMake}>
            <Text style={styles.featureChipWarm}>真实卡通化</Text>
            <Text style={styles.featureChipCool}>保留毛色</Text>
            <Text style={styles.featureChipWarm}>亲和表情</Text>
          </View>
          <Text style={styles.aiQuotaHint}>重新生成会消耗 1 次额度 · 今日剩余 {petAvatarDailyRemaining} 次</Text>
          <View style={styles.aiResultActions}>
            <Button loading={avatarAccepting} onPress={() => void saveAvatar()}>保存并设为电子灵伴</Button>
            <Button loading={avatarRetrying} onPress={() => void retryAvatarGeneration()} tone="secondary">重新生成</Button>
          </View>
        </View>
      </Screen>
    );
  }

  function renderHome() {
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    if (!pet) return renderEmptyPet();
    const nextVaccine = healthSummary?.nextVaccine ?? pendingVaccines[0] ?? vaccines[0];
    const latestWeight = healthSummary?.latestWeightKg ?? weights[0]?.kg ?? pet.weightKg;
    const healthScore = healthSummary?.healthScore ?? pet.healthScore ?? 92;
    const petMeta = [pet.breed || speciesLabels[pet.species], formatPetAge(pet.birthday)].filter(Boolean).join(' · ');
    const memoCount = healthSummary?.memoCount ?? memos.length;
    const memoSummary = healthSummary?.latestMemo?.title ?? memos[0]?.title ?? '暂无备忘';
    const onlineCopy = owners.length ? `${owners.length} 位伙伴在线` : '暂无附近伙伴';
    const homeChatHint = homeChatPrompts[homeHintIndex].replace(/\{petName\}/g, pet.name);
    const healthStatusLabel =
      healthSummary?.weightStatus === 'watch' ? '关注' : healthSummary?.weightStatus === 'empty' ? '待记' : healthSummary ? '稳定' : '+3';
    const healthDescription = healthSummary?.weightSummary ?? '体重稳定，运动量良好';
    return (
      <Screen showBack={false} title="">
        <View style={styles.homeMakePage}>
          <View style={styles.homeMakeHeader}>
            <View style={styles.homeMakeGreeting}>
              <PetAvatar uri={pet.avatarUrl ?? generatedGoldenAvatarUri} size={42} />
              <View style={styles.flex}>
                <Text style={styles.homeMakeKicker}>早安，{pet.name}！</Text>
                <Text numberOfLines={1} style={styles.homeMakeHeadline}>今天也是元气满满的一天</Text>
              </View>
            </View>
            <Pressable onPress={() => go('notifications')} style={styles.homeBellButton}>
              <Bell color={palette.ink} size={17} strokeWidth={2.3} />
              <View style={styles.homeBellDot} />
            </Pressable>
          </View>

          <View style={styles.homePetStage}>
            <PetAvatar uri={pet.avatarUrl ?? generatedGoldenAvatarUri} size={196} />
            <View style={styles.homeOnlineBadge}>
              <View style={styles.homeOnlineDot} />
              <Text style={styles.homeOnlineText}>灵伴在线</Text>
            </View>
          </View>
          <Pressable onPress={() => go('chat')} style={[styles.homeChatHint, webPressableReset]}>
            <Sparkles color={palette.orange} size={13} strokeWidth={2.4} />
            <Text numberOfLines={1} style={styles.homeChatHintText}>{homeChatHint}</Text>
          </Pressable>

          <View style={styles.homePetNameRow}>
            <Text style={styles.homePetName}>{pet.name}</Text>
            <Text style={styles.homePetMeta}>· {petMeta}</Text>
          </View>

          <Pressable onPress={() => go('health')} style={[webPressableReset, styles.homeHealthCard, Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFF1E0 0%, #FFE3CB 60%, #FFD7B5 100%)' } as object) : null]}>
            <View>
              <Text style={styles.homeHealthLabel}>今日健康分</Text>
              <View style={styles.homeHealthScoreRow}>
                <Text style={styles.homeHealthScore}>{healthScore}</Text>
                <Text style={styles.homeHealthTotal}>/ 100</Text>
                <View style={styles.homeHealthDelta}>
                  <ArrowUp color={palette.teal} size={10} strokeWidth={3} />
                  <Text style={styles.homeHealthDeltaText}>{healthStatusLabel}</Text>
                </View>
              </View>
              <Text style={styles.homeHealthDesc}>{healthDescription}</Text>
            </View>
            <View style={styles.homeHealthRing}>
              <View style={styles.homeHealthRingInner}>
                <HeartPulse color={palette.orange} size={22} strokeWidth={2.3} />
              </View>
            </View>
          </Pressable>

          <View style={styles.homeQuickGrid}>
            <MetricCard Icon={Weight} label="今日体重" onPress={() => go('weight')} tag={weights.length ? '已记录' : '待记录'} tagTone="teal" value={formatWeightKg(latestWeight)} />
            <MetricCard Icon={Syringe} label="疫苗提醒" onPress={() => go('vaccine')} tag={formatDueLabel(nextVaccine?.dueAt)} tagTone="orange" value={nextVaccine?.name ?? '待添加计划'} />
            <MetricCard Icon={NotebookPen} label="健康备忘" onPress={() => go('healthMemos')} tag={`${memoCount} 条`} tagTone="muted" value={memoSummary} />
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
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    return (
      <Screen showBack={false} title="">
        <View style={styles.chatMakeHeader}>
          <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={back} style={styles.makeIconChip}>
            <ChevronLeft color={palette.ink} size={20} strokeWidth={2.5} />
          </Pressable>
          <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={38} />
          <View style={styles.flex}>
            <Text style={styles.chatMakeName}>{pet?.name ?? '灵伴'}</Text>
            <View style={styles.chatOnlineRow}>
              <View style={styles.homeOnlineDot} />
              <Text style={styles.chatOnlineText}>在线 · 心情很好</Text>
            </View>
          </View>
          <Pressable onPress={openPetCompanionSettings} style={styles.makeIconChip}>
            <Sparkles color={palette.orange} size={16} strokeWidth={2.3} />
          </Pressable>
        </View>

        <View style={styles.chatSafetyTip}>
          <HeartPulse color={palette.teal} size={13} strokeWidth={2.4} />
          <Text style={styles.chatSafetyText}>AI 灵伴不能替代兽医，紧急情况请就医</Text>
        </View>

        <View style={styles.chatMakeList}>
          <Text style={styles.chatDateChip}>今天 09:32</Text>
          {chatMessages.map((message) => (
            <View key={message.id} style={[styles.chatMakeBubbleRow, message.author === 'me' && styles.chatMakeBubbleRowMe]}>
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
              {message.status === 'failed' ? (
                <Pressable onPress={() => void sendChatMessage(message.text, message.id)} style={styles.inlineRetryButton}>
                  <Text style={styles.inlineRetryText}>重试</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {chatReplying ? (
            <View style={styles.chatMakeBubbleRow}>
              <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={26} />
              <View style={[styles.chatMakeBubble, styles.chatTypingBubble]}>
                <ActivityIndicator color={palette.orange} size="small" />
                <Text style={styles.chatTypingText}>{pet?.name ?? '灵伴'}正在回复...</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.chatTopicRow}>
            {['今天吃什么？', '健康提醒', '陪我聊天'].map((topic) => (
              <Pressable key={topic} onPress={() => setChatInput(topic)} style={styles.chatTopicChip}>
                <Text style={styles.chatTopicText}>{topic}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.chatComposer}>
          <TextInput
            onChangeText={setChatInput}
            placeholder={`告诉${pet?.name ?? '灵伴'}今天发生了什么...`}
            placeholderTextColor="#b6aca3"
            style={[styles.chatInput, webTextInputReset]}
            value={chatInput}
          />
          <Pressable onPress={() => void sendChatMessage()} style={styles.sendButton}>
            {chatReplying ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={18} strokeWidth={2.4} />}
          </Pressable>
        </View>
        <Text style={styles.chatQuotaHint}>今日 AI 对话 {petChatDailyCount}/{petChatDailyLimit} · 失败可重试，优先保留近 10 条上下文</Text>
      </Screen>
    );
  }

  function renderConversation() {
    const conversation = selectedConversation ?? conversations[0];
    const canSendMessage = conversation?.canSendMessage !== false;
    return (
      <Screen showBack={false} title="">
        <View style={styles.chatMakeHeader}>
          <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={back} style={styles.makeIconChip}>
            <ChevronLeft color={palette.ink} size={20} strokeWidth={2.5} />
          </Pressable>
          <PetAvatar uri={conversation?.imageUrl ?? owners[0]?.imageUrl ?? generatedGoldenAvatarUri} size={38} />
          <View style={styles.flex}>
            <Text style={styles.chatMakeName}>{conversation?.name ?? '附近主人'}</Text>
            <View style={styles.chatOnlineRow}>
              <View style={styles.homeOnlineDot} />
              <Text style={styles.chatOnlineText}>{canSendMessage ? '模糊距离 · 已互相打招呼' : '等待对方接受招呼'}</Text>
            </View>
          </View>
          <Pressable onPress={() => go('safety')} style={styles.makeIconChip}>
            <Shield color={palette.orange} size={16} strokeWidth={2.3} />
          </Pressable>
        </View>

        <View style={styles.chatSafetyTip}>
          <Shield color={palette.teal} size={13} strokeWidth={2.4} />
          <Text style={styles.chatSafetyText}>{canSendMessage ? '聊天中请勿透露精确住址，线下见面建议选择公开宠物友好地点。' : '对方接受招呼后才能继续聊天，未确认前不会暴露精确位置。'}</Text>
        </View>

        <View style={styles.chatMakeList}>
          <Text style={styles.chatDateChip}>今天</Text>
          {conversationMessages.map((message) => (
            message.author === 'system' ? (
              <View key={message.id} style={styles.conversationSystemBubble}>
                <Text style={styles.conversationSystemText}>{message.text}</Text>
              </View>
            ) : (
              <View key={message.id} style={[styles.chatMakeBubbleRow, message.author === 'me' && styles.chatMakeBubbleRowMe]}>
                {message.author === 'other' ? <PetAvatar uri={conversation?.imageUrl ?? owners[0]?.imageUrl ?? generatedGoldenAvatarUri} size={26} /> : null}
                <View style={[styles.chatMakeBubble, message.author === 'me' && styles.chatMakeBubbleMe]}>
                  <Text style={[styles.chatMakeText, message.author === 'me' && styles.chatTextMe]}>{message.text}</Text>
                </View>
                {message.status === 'sending' ? <ActivityIndicator color={palette.orange} size="small" /> : null}
                {message.status === 'failed' ? (
                  <View style={styles.inlineActionRow}>
                    <Pressable onPress={() => void sendConversationMessage(message.text, message.id)} style={styles.inlineRetryButton}>
                      <Text style={styles.inlineRetryText}>重发</Text>
                    </Pressable>
                    <Pressable onPress={() => deleteLocalConversationMessage(message.id)} style={styles.inlineDeleteButton}>
                      <Text style={styles.inlineDeleteText}>删除</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )
          ))}
        </View>
        <View style={styles.chatComposer}>
          <TextInput
            editable={canSendMessage}
            onChangeText={setConversationInput}
            placeholder={canSendMessage ? '发一条友好的消息...' : '等待对方接受招呼'}
            placeholderTextColor="#b6aca3"
            style={[styles.chatInput, !canSendMessage && styles.chatInputDisabled, webTextInputReset]}
            value={conversationInput}
          />
          <Pressable disabled={!canSendMessage} onPress={() => void sendConversationMessage()} style={[styles.sendButton, !canSendMessage && styles.mapSearchActionDisabled]}>
            <Send color="#fff" size={18} strokeWidth={2.4} />
          </Pressable>
        </View>
      </Screen>
    );
  }

  function renderHealth() {
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    const nextHealthVaccine = healthSummary?.nextVaccine ?? pendingVaccines[0] ?? vaccines[0];
    const latestWeight = healthSummary?.latestWeightKg ?? weights[0]?.kg ?? pet?.weightKg;
    const healthScore = healthSummary?.healthScore ?? pet?.healthScore ?? 92;
    const weightSubtitle = healthSummary?.weightSummary ?? (weights.length > 1 ? `最近一次 ${weights[0]?.recordedAt}` : '暂无连续记录，先从今天开始');
    const latestMemo = healthSummary?.latestMemo ?? memos[0];
    const memoCount = healthSummary?.memoCount ?? memos.length;
    const memoSubtitle = latestMemo ? `${latestMemo.title} · ${latestMemo.updatedAt}` : '记录洗澡、驱虫、食欲或异常观察';
    const urgentHealthCount = healthSummary?.urgentVaccineCount ?? urgentVaccines.length;
    const pendingHealthCount = healthSummary?.pendingVaccineCount ?? pendingVaccines.length;
    return (
      <Screen title={`${pet?.name ?? '灵伴'}的健康`}>
        <View style={styles.healthHeroMake}>
          <View style={styles.healthHeroCopy}>
            <View style={styles.healthHeroLabelRow}>
              <HeartPulse color={palette.orange} size={13} strokeWidth={2.4} />
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
          <HealthMakeRow Icon={Weight} badge={formatWeightKg(latestWeight)} onPress={() => go('weight')} subtitle={weightSubtitle} title="体重趋势" tone="warm" />
          <HealthMakeRow Icon={Syringe} badge={urgentHealthCount ? `${urgentHealthCount} 项临近` : pendingHealthCount ? `${pendingHealthCount} 项` : '已完成'} onPress={() => go('vaccine')} subtitle={nextHealthVaccine ? `${nextHealthVaccine.name} · ${vaccineReminderCopy(nextHealthVaccine)}` : '暂无计划'} title="疫苗计划" tone="cool" />
          <HealthMakeRow Icon={CalendarDays} badge={`${memoCount} 条`} onPress={() => go('healthMemos')} subtitle={memoSubtitle} title="健康备忘" tone="warm" />
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

        <View style={styles.healthMemoMake}>
          <Text style={styles.sectionTitle}>快速备忘</Text>
          <Field label="标题" onChangeText={setMemoTitle} value={memoTitle} />
          <Field label="内容" onChangeText={setMemoContent} placeholder="例如：今天食欲很好，便便正常" value={memoContent} />
          <Button loading={memoSaving} onPress={() => void saveHealthMemo()}>保存备忘</Button>
        </View>

        <View style={styles.healthTimelineCard}>
          <Text style={styles.sectionTitle}>近期记录</Text>
          {[...memos.slice(0, 2).map((memo) => ({ sub: memo.content, title: memo.title, date: memo.updatedAt })), { title: '体重记录', sub: `今日 ${formatWeightKg(latestWeight)}`, date: weights[0]?.recordedAt ?? '待记录' }].map((item, index, items) => (
            <View key={`${item.title}-${index}`}>
              <View style={styles.timelineRowMake}>
                <View style={[styles.timelineDotMake, index % 2 === 1 && styles.timelineDotCool]} />
                <View style={styles.flex}>
                  <Text style={styles.timelineTitleMake}>{item.title}</Text>
                  <Text style={styles.timelineSubMake}>{item.sub}</Text>
                </View>
                <Text style={styles.timelineDateMake}>{item.date}</Text>
              </View>
              {index < items.length - 1 ? <View style={styles.makeDivider} /> : null}
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  function renderHealthMemos() {
    return (
      <Screen title="健康备忘">
        <View style={styles.healthMemoEditorMake}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>新增备忘</Text>
              <Text style={styles.timelineSubMake}>记录洗澡、驱虫、便便、食欲或异常观察</Text>
            </View>
            <View style={styles.healthMemoIconMake}>
              <NotebookPen color={palette.orange} size={20} strokeWidth={2.4} />
            </View>
          </View>
          <Field label="标题" onChangeText={setMemoDraftTitle} placeholder="例如：洗澡记录" value={memoDraftTitle} />
          <TextInput
            multiline
            onChangeText={setMemoDraftContent}
            placeholder="例如：今天洗澡后耳朵干净，皮肤没有明显泛红。"
            placeholderTextColor="#b6aca3"
            style={[styles.longTextInput, webTextInputReset]}
            value={memoDraftContent}
          />
          <View style={styles.infoChipRow}>
            <Text style={styles.infoChip}>今天</Text>
            <Text style={styles.infoChip}>可同步健康时间线</Text>
          </View>
          <Button loading={memoDraftSaving} onPress={() => void saveMemoDraft()}>保存备忘</Button>
        </View>

        <View style={styles.healthTimelineCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>全部备忘</Text>
            <Text style={styles.metaText}>{memos.length} 条</Text>
          </View>
          {memos.length ? memos.map((memo, index) => (
            <View key={memo.id}>
              <View style={styles.timelineRowMake}>
                <View style={[styles.timelineDotMake, index % 2 === 1 && styles.timelineDotCool]} />
                <View style={styles.flex}>
                  <Text style={styles.timelineTitleMake}>{memo.title}</Text>
                  <Text style={styles.timelineSubMake}>{memo.content}</Text>
                </View>
                <Text style={styles.timelineDateMake}>{memo.updatedAt}</Text>
              </View>
              {index < memos.length - 1 ? <View style={styles.makeDivider} /> : null}
            </View>
          )) : (
            <View style={styles.emptyStateMake}>
              <NotebookPen color={palette.orange} size={24} strokeWidth={2.4} />
              <Text style={styles.emptyStateTitleMake}>还没有备忘</Text>
              <Text style={styles.emptyStateTextMake}>先记录一条小事，后面可以按时间线查看。</Text>
            </View>
          )}
        </View>
      </Screen>
    );
  }

  function renderWeight() {
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    const currentWeight = healthSummary?.latestWeightKg ?? weights[0]?.kg ?? pet?.weightKg;
    const previousWeight = weights[1]?.kg;
    const weightDelta = Number.isFinite(Number(currentWeight)) && Number.isFinite(Number(previousWeight))
      ? Number(currentWeight) - Number(previousWeight)
      : 0;
    const weightDeltaLabel = weightDelta === 0 ? '0' : Math.abs(weightDelta).toFixed(1).replace(/\.0$/, '');
    return (
      <Screen title="体重记录">
        <View style={styles.weightHeroMake}>
          <Text style={styles.healthHeroLabel}>今日体重</Text>
          <View style={styles.healthHeroScoreRow}>
            <Text style={styles.healthHeroScore}>{Number.isFinite(Number(currentWeight)) ? Number(currentWeight).toFixed(1).replace(/\.0$/, '') : '--'}</Text>
            <Text style={styles.healthHeroTotal}>kg</Text>
            <View style={styles.homeHealthDelta}>
              <ArrowUp color={palette.teal} size={10} strokeWidth={3} />
              <Text style={styles.homeHealthDeltaText}>{weightDeltaLabel}</Text>
            </View>
          </View>
          <Text style={styles.healthHeroDesc}>{healthSummary?.weightSummary ?? (pet ? `${pet.name}当前状态良好 · 建议持续稳定记录` : '添加宠物后可持续记录体重')}</Text>
        </View>
        <View style={styles.weightInputMake}>
          <Text style={styles.sectionTitle}>记录新的体重</Text>
          <Field keyboardType="decimal-pad" label="今日体重 kg" onChangeText={setWeightInput} placeholder={currentWeight ? String(currentWeight) : '请输入体重'} value={weightInput} />
          <View style={styles.infoChipRow}>
            <Text style={styles.infoChip}>今天 · 09:32</Text>
            <Text style={styles.infoChip}>照片</Text>
          </View>
          <Button loading={weightSaving} onPress={() => void recordWeight()}>保存记录</Button>
        </View>
        <View style={styles.healthTimelineCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>历史记录</Text>
            <Text style={styles.metaText}>近 30 天</Text>
          </View>
          {weights.map((item, index) => (
            <View key={item.id}>
              <View style={styles.timelineRowMake}>
                <View style={styles.timelineDotMake} />
                <View style={styles.flex}>
                  <Text style={styles.timelineTitleMake}>{item.kg} kg</Text>
                  <Text style={styles.timelineSubMake}>{item.note ?? '无备注'}</Text>
                </View>
                <Text style={styles.timelineDateMake}>{item.recordedAt}</Text>
              </View>
              {index < weights.length - 1 ? <View style={styles.makeDivider} /> : null}
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  function renderVaccine() {
    const nextVaccine = healthSummary?.nextVaccine ?? pendingVaccines[0] ?? vaccines[0];
    const nextVaccineDueLabel = formatDueLabel(nextVaccine?.dueAt);
    const nextVaccineReminderLabel = vaccineReminderCopy(nextVaccine);
    const nextVaccineReminderSaving = nextVaccine ? vaccineReminderSavingIds.includes(nextVaccine.id) : false;
    const nextVaccineDoneSaving = nextVaccine ? vaccineDoneSavingIds.includes(nextVaccine.id) : false;
    return (
      <Screen title="疫苗计划">
        <View style={styles.vaccineHeroMake}>
          <View style={styles.flex}>
            <Text style={styles.vaccineDuePill}>{nextVaccine?.status === 'done' ? '已完成' : nextVaccineReminderLabel}</Text>
            <Text style={styles.vaccineHeroTitle}>{nextVaccine?.name ?? '暂无计划'}</Text>
            <View style={styles.chatOnlineRow}>
              <CalendarDays color={palette.muted} size={12} strokeWidth={2.3} />
              <Text style={styles.vaccineHeroMeta}>{nextVaccine?.dueAt ?? '待设置'} · {nextVaccineDueLabel}</Text>
            </View>
          </View>
          <View style={styles.vaccineHeroIcon}>
            <Syringe color={palette.orange} size={26} strokeWidth={2.5} />
          </View>
        </View>
        <View style={styles.actionRow}>
          <Button loading={nextVaccineReminderSaving} onPress={() => void enableVaccineReminder(nextVaccine)} tone="secondary">{nextVaccine && vaccineReminderIds.includes(nextVaccine.id) ? '提醒已开启' : '开启提醒'}</Button>
          <Button disabled={nextVaccine?.status === 'done'} loading={nextVaccineDoneSaving} onPress={() => void markVaccineDone(nextVaccine)}>{nextVaccine?.status === 'done' ? '已完成' : '标记完成'}</Button>
        </View>
        <View style={styles.healthTimelineCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>全部计划</Text>
            <Text style={styles.metaText}>提醒工具</Text>
          </View>
          {vaccines.map((item, index) => (
            <View key={item.id}>
              <View style={styles.timelineRowMake}>
                <View style={[styles.timelineDotMake, item.status === 'done' && styles.timelineDotCool]} />
                <View style={styles.flex}>
                  <Text style={styles.timelineTitleMake}>{item.name}</Text>
                  <Text style={styles.timelineSubMake}>{item.status === 'done' ? '已完成' : vaccineReminderIds.includes(item.id) ? `提醒已开启 · ${vaccineReminderCopy(item)}` : vaccineReminderCopy(item)} · {item.dueAt}</Text>
                </View>
                <StatusPill tone={item.status === 'done' ? 'success' : isVaccineReminderUrgent(item) ? 'danger' : 'neutral'}>{item.status === 'done' ? '完成' : isVaccineReminderUrgent(item) ? '临近' : '计划中'}</StatusPill>
              </View>
              {index < vaccines.length - 1 ? <View style={styles.makeDivider} /> : null}
            </View>
          ))}
        </View>
        <View style={styles.chatSafetyTip}>
          <Sparkles color={palette.teal} size={14} strokeWidth={2.4} />
          <Text style={styles.chatSafetyText}>疫苗计划为提醒工具，具体接种时间请以宠物医院建议为准。</Text>
        </View>
      </Screen>
    );
  }

  function renderDiscover() {
    const discoverEnabled = userSettings.nearbyVisible;
    const visibleOwners = discoverEnabled ? owners.filter((owner) => ownerMatchesDiscoverFilter(owner, discoverFilter)) : [];
    const activeDiscoverFilterLabel = discoverFilterOptions.find((item) => item.key === discoverFilter)?.label ?? '全部';
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
            <Pressable accessibilityLabel="刷新附近伙伴" accessibilityRole="button" disabled={discoverRefreshing} onPress={() => void refreshDiscoverByPull()} style={[styles.makeIconChip, (discoverRefreshing || !discoverEnabled) && styles.mapSearchActionDisabled]}>
              {discoverRefreshing ? <ActivityIndicator color={palette.ink} size="small" /> : <RefreshCw color={palette.ink} size={16} strokeWidth={2.3} />}
            </Pressable>
            <Pressable accessibilityLabel="切换附近筛选" accessibilityRole="button" onPress={cycleDiscoverFilter} style={styles.makeIconChip}>
              <SlidersHorizontal color={palette.ink} size={16} strokeWidth={2.3} />
            </Pressable>
          </View>
        </View>
        <View style={styles.locationChipMake}>
          <MapPin color={palette.orange} size={13} strokeWidth={2.4} />
          <Text style={styles.locationChipText}>{discoverEnabled ? `附近 · 3km 内 · ${activeDiscoverFilterLabel} · ${visibleOwners.length} 位` : '附近可见未开启'}</Text>
          <Text style={styles.locationPrivacyPill}>{discoverEnabled ? '模糊距离' : '已隐藏'}</Text>
        </View>
        <ScrollView horizontal contentContainerStyle={styles.filterChipsMake} showsHorizontalScrollIndicator={false}>
          {discoverFilterOptions.map((filter) => (
            <Text key={filter.key} onPress={() => applyDiscoverFilter(filter.key)} style={[styles.filterChipMake, discoverFilter === filter.key && styles.filterChipMakeActive]}>{filter.label}</Text>
          ))}
        </ScrollView>
        <View style={styles.discoverCardsMake}>
          {visibleOwners.map((owner) => (
            <View key={owner.id} style={styles.ownerCardMake}>
              <PetAvatar uri={owner.imageUrl} size={92} />
              <View style={styles.flex}>
                <View style={styles.rowBetween}>
                  <Text style={styles.ownerPetNameMake}>{owner.petName}</Text>
                  <Text style={styles.ownerDistanceMake}>{owner.distance}</Text>
                </View>
                <Text style={styles.ownerMetaMake}>{owner.species === 'dog' ? '狗狗' : '猫咪'} · 主人 {owner.ownerName}</Text>
                <Text style={styles.ownerBioMake} numberOfLines={2}>{owner.tags.join(' · ')}，也想认识附近的新朋友。</Text>
                <View style={styles.ownerTagRowMake}>
                  {owner.tags.slice(0, 2).map((tag) => (
                    <Text key={tag} style={styles.ownerTagMake}>{tag}</Text>
                  ))}
                </View>
                <Pressable
                  onPress={() => {
                    setSelectedOwner(owner);
                    go('walkInvite');
                  }}
                  style={[styles.walkInviteInline, webPressableReset]}
                >
                  <CalendarDays color={palette.orange} size={14} strokeWidth={2.3} />
                  <Text style={styles.walkInviteInlineText}>约遛邀请</Text>
                </Pressable>
              </View>
              <Pressable disabled={socialActionSavingIds.includes(`greet:${owner.id}`)} onPress={() => void sendGreeting(owner.id)} style={[styles.greetButtonMake, socialActionSavingIds.includes(`greet:${owner.id}`) && styles.mapSearchActionDisabled]}>
                {socialActionSavingIds.includes(`greet:${owner.id}`) ? <ActivityIndicator color="#fff" size="small" /> : <MessageCircle color="#fff" size={15} strokeWidth={2.4} />}
              </Pressable>
            </View>
          ))}
          {!visibleOwners.length ? (
            <View style={styles.mapEmptyCard}>
              <Text style={styles.cardTitle}>{discoverEnabled ? '暂无匹配伙伴' : '附近可见未开启'}</Text>
              <Text style={styles.mutedText}>{discoverEnabled ? '可以切换筛选条件，或下拉刷新附近列表。' : '开启后才会展示附近猫狗主人，也会让附近伙伴看到你。'}</Text>
            </View>
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
      { key: 'clinic', label: '医院' },
    ];
    const filteredPlaces = placeFilter === 'all' ? places : places.filter((place) => place.category === placeFilter);
    const visiblePlaces = filteredPlaces;
    const highlightedPlace = visiblePlaces[0];
    const placeFilterLabel = placeFilters.find((item) => item.key === placeFilter)?.label ?? '全部';
    const placeResultMeta = placeSearching ? '搜索中...' : `${visiblePlaces.length} 个 · ${placeQuery.trim() ? '搜索结果' : placeFilterLabel}`;
    const mapStyle = mapStyleOptions.find((item) => item.key === mapStyleKey) ?? mapStyleOptions[0];
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
                <Text style={[styles.mapAreaLabel, mapStyleKey === 'night' && styles.mapAreaLabelNight]}>{mapStyleKey === 'satellite' ? '绿地实景' : '滨江绿地'}</Text>
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
            <View style={styles.mapControlStack}>
              <Pressable onPress={() => void locateMapToCurrentPosition()} style={styles.mapCtrlButton}>
                {locatingMap ? <ActivityIndicator color={palette.orange} size="small" /> : <MapPin color={palette.orange} size={16} strokeWidth={2.4} />}
              </Pressable>
              <Pressable onPress={() => go('addPlaceReview')} style={styles.mapCtrlButton}>
                <Plus color={palette.ink} size={16} strokeWidth={2.4} />
              </Pressable>
              <Pressable onPress={() => setMapStylePanelVisible((visible) => !visible)} style={[styles.mapCtrlButton, mapStylePanelVisible && styles.mapCtrlButtonActive]}>
                <SlidersHorizontal color={mapStylePanelVisible ? '#fff' : palette.ink} size={16} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          {mapStylePanelVisible ? (
            <Pressable
              accessibilityLabel="关闭地图样式"
              onPress={() => setMapStylePanelVisible(false)}
              style={styles.mapStyleDismissLayer}
            />
          ) : null}

          {mapStylePanelVisible ? (
            <View style={styles.mapStylePanel}>
              <View style={styles.mapStyleHeader}>
                <View>
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
            </View>
          ) : null}

          <View style={styles.mapSearchFloatMake}>
            <Search color={palette.muted} size={16} strokeWidth={2.2} />
            <TextInput
              onChangeText={setPlaceQuery}
              onSubmitEditing={() => void searchPlaces()}
              placeholder="搜索公园、咖啡店、宠物医院…"
              placeholderTextColor={palette.muted}
              returnKeyType="search"
              style={[styles.mapSearchInput, webTextInputReset]}
              value={placeQuery}
            />
            <Pressable disabled={placeSearching} onPress={() => void searchPlaces()} style={[styles.mapSearchActionMake, placeSearching && styles.mapSearchActionDisabled]}>
              {placeSearching ? <ActivityIndicator color="#fff" size="small" /> : <SlidersHorizontal color="#fff" size={14} strokeWidth={2.4} />}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.mapFilterFloatMake} horizontal showsHorizontalScrollIndicator={false} style={styles.mapFilterScrollerMake}>
            {placeFilters.map((item) => (
              <Pressable key={item.key} onPress={() => setPlaceFilter(item.key)} style={[styles.mapChipMake, placeFilter === item.key && styles.mapChipMakeActive]}>
                <Text style={[styles.mapChipMakeText, placeFilter === item.key && styles.mapChipMakeTextActive]}>
                  {item.key === 'park' ? '公园' : item.key === 'cafe' ? '咖啡店' : item.key === 'clinic' ? '医院' : '全部'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.mapBottomSheetMake}>
            <View style={styles.sheetHandle} />
            <View style={styles.mapSheetHeader}>
              <Text style={styles.sectionTitle}>附近宠物友好地点</Text>
              <Text style={styles.metaText}>{placeResultMeta}</Text>
            </View>
            {visiblePlaces.slice(0, 3).map((place, index) => (
              <PlaceSheetRow
                active={place.id === highlightedPlace?.id}
                key={place.id}
                onPress={() => {
                  setSelectedPlace(place);
                  go('placeDetail');
                }}
                place={place}
                rank={index + 1}
              />
            ))}
            {!visiblePlaces.length ? (
              <View style={styles.mapEmptyCard}>
                <Text style={styles.cardTitle}>没有匹配地点</Text>
                <Text style={styles.mutedText}>可以切换筛选条件，或搜索其他关键词。</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Screen>
    );
  }

  function renderPlaceDetail() {
    const place = selectedPlace ?? places[0];
    const isFavoritePlace = place ? favoritePlaceIds.includes(place.id) : false;
    const isFavoriteSaving = place ? favoritePlaceSavingIds.includes(place.id) : false;
    const myPlaceReview = place ? placeReviewsByPlaceId[place.id] : undefined;
    const placeReviewButtonLabel = myPlaceReview?.status === 'pending_review' || placeReviewStatus === 'pending_review' ? '再次提交点评' : '提交点评';
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    const ownerName = formatOwnerName(session?.phone, pet, session?.account?.ownerName);
    return (
      <Screen title="">
        {place ? (
          <View style={styles.placeDetailPageMake}>
            <View style={styles.placeHeroMake}>
              <View style={styles.placeHeroOverlay} />
              <Pressable accessibilityLabel="返回" accessibilityRole="button" onPress={back} style={styles.placeBackButtonMake}>
                <ChevronLeft color={palette.ink} size={18} strokeWidth={2.5} />
              </Pressable>
              <View style={styles.placeHeroActions}>
                <Pressable onPress={() => void sharePlace(place)} style={styles.placeBackButtonMake}>
                  <Send color={palette.ink} size={15} strokeWidth={2.4} />
                </Pressable>
                <Pressable disabled={isFavoriteSaving} onPress={() => void toggleFavoritePlace(place)} style={styles.placeBackButtonMake}>
                  <HeartPulse color={isFavoritePlace ? palette.orange : palette.ink} size={15} strokeWidth={2.4} />
                </Pressable>
              </View>
              <Text style={styles.placePhotoCount}>1 / 48</Text>
            </View>
            <View style={styles.placeSheetMake}>
              <View style={styles.placeTitleRowMake}>
                <Text style={styles.placeTitleMake}>{place.name}</Text>
                <Text style={styles.placeVerifyMake}>官方认证</Text>
              </View>
              <View style={styles.placeRatingRowMake}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} color="#f2b441" fill="#f2b441" size={12} strokeWidth={2} />
                ))}
                <Text style={styles.ratingText}>{place.rating}</Text>
                <Text style={styles.metaText}>· 236 条点评</Text>
                <Text style={styles.placeDistanceMake}>{place.distance}</Text>
              </View>
              <View style={styles.placeAddressMake}>
                <MapPin color={palette.orange} size={13} strokeWidth={2.4} />
                <View style={styles.flex}>
                  <Text style={styles.placeAddressText}>{place.address}</Text>
                  <Text style={styles.placeAddressMeta}>06:00 - 22:00 · 010-8888-8888</Text>
                </View>
              </View>
              <Text style={styles.placeSectionLabel}>宠物友好特色</Text>
              <View style={styles.tagRow}>
                {place.tags.map((tag) => (
                  <Text key={tag} style={styles.tag}>{tag}</Text>
                ))}
              </View>
              <View style={styles.placeReviewPreviewMake}>
                <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={28} />
                <View style={styles.flex}>
                  <Text style={styles.timelineTitleMake}>{myPlaceReview ? `${ownerName} · ${myPlaceReview.status === 'pending_review' ? '审核中' : '已点评'}` : ownerName}</Text>
                  <Text style={styles.timelineSubMake}>{myPlaceReview?.content ?? '草坪很大，有饮水点，周末人会稍多。'}</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <Button loading={isFavoriteSaving} onPress={() => void toggleFavoritePlace(place)} tone="secondary">{isFavoritePlace ? '已收藏' : '收藏'}</Button>
                <Button onPress={() => openConfirm('打开高德地图', `将打开高德地图查看${place.name}，你可以在高德内继续发起导航。`, () => void openAmapPlace(place), '打开')}>高德导航</Button>
              </View>
              <View style={styles.weightInputMake}>
                <Field label="点评内容" onChangeText={setPlaceReview} placeholder="例如：草坪很大，有饮水点" value={placeReview} />
                <Button loading={placeReviewSaving} onPress={() => void createPlaceReview()}>{placeReviewButtonLabel}</Button>
                {placeReviewStatus === 'pending_review' ? (
                  <View style={styles.reviewStatusCard}>
                    <Check color={palette.teal} size={15} strokeWidth={3} />
                    <Text style={styles.reviewStatusText}>已提交，等待审核。通过后会展示在地点详情中。</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
      </Screen>
    );
  }

  function renderMessages() {
    return (
      <Screen showBack={false} title="">
        <View style={styles.messagesMakePage}>
          <View style={styles.messagesMakeHeader}>
            <Text style={styles.makeScreenTitle}>消息</Text>
            <View style={styles.messagesHeaderActions}>
              <Pressable accessibilityLabel="刷新消息" accessibilityRole="button" disabled={inboxManualRefreshing} onPress={() => void refreshInboxManually()} style={[styles.makeIconChip, inboxManualRefreshing && styles.mapSearchActionDisabled]}>
                {inboxManualRefreshing ? <ActivityIndicator color={palette.ink} size="small" /> : <RefreshCw color={palette.ink} size={16} strokeWidth={2.3} />}
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
          {conversations.map((conversation) => (
            <Pressable key={conversation.id} onPress={() => void openConversation(conversation)} style={styles.conversationMakeRow}>
              <PetAvatar uri={conversation.imageUrl ?? (conversation.id === 'c1' ? generatedGoldenAvatarUri : owners[0]?.imageUrl)} size={50} />
              <View style={styles.flex}>
                <Text numberOfLines={1} style={styles.conversationMakeTitle}>{conversation.name}</Text>
                <Text numberOfLines={1} style={styles.conversationMakeText}>{conversation.lastMessage}</Text>
              </View>
              <View style={styles.conversationMetaCol}>
                <Text style={styles.metaText}>{conversation.updatedAt ?? (conversation.id === 'c1' ? '09:32' : '刚刚')}</Text>
                {conversation.unread > 0 ? <Text style={styles.unreadBadge}>{conversation.unread}</Text> : null}
              </View>
            </Pressable>
          ))}
          </View>
        </View>
      </Screen>
    );
  }

  function renderNotifications() {
    return (
      <Screen title="通知中心">
        <View style={styles.notificationListMake}>
          {notifications.map((item) => (
            <View key={item.id} style={[styles.notificationCardMake, !item.read && styles.notificationCardUnreadMake]}>
              <View style={styles.notificationIconMake}>
                <Bell color={item.read ? palette.muted : palette.orange} size={16} strokeWidth={2.4} />
              </View>
              <View style={styles.flex}>
                <View style={styles.rowBetween}>
                  <Text style={styles.timelineTitleMake}>{item.title}</Text>
                  <StatusPill tone={item.read ? 'neutral' : 'success'}>{item.read ? '已读' : '未读'}</StatusPill>
                </View>
                <Text style={styles.timelineSubMake}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  function renderProfile() {
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    const maskedPhone = formatMaskedPhone(session?.phone);
    const ownerName = formatOwnerName(session?.phone, pet, session?.account?.ownerName);
    const speciesLabel = pet ? speciesLabels[pet.species] : '';
    const permissionEnabled = allLumiiPermissionsGranted(permissions);
    const notificationsEnabled = permissions.notifications === 'granted' && userSettings.pushNotifications;
    return (
      <Screen showBack={false} title="">
        <View style={styles.profileMakePage}>
          <View style={styles.profileMakeHeader}>
            <Text style={styles.makeScreenTitle}>我的</Text>
            <Pressable onPress={() => go('settings')} style={styles.profileSettingsButton}>
              <Settings color={palette.ink} size={18} strokeWidth={2.3} />
            </Pressable>
          </View>

          <View style={[styles.profileHeroMake, Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 60%, #FFD7BF 100%)' } as object) : null]}>
            <View style={styles.profileHeroOrb} />
            <View style={styles.profileHeroContent}>
              <View style={styles.profileOwnerAvatar}>
                <User color={palette.orange} size={30} strokeWidth={2.3} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.profileOwnerName}>{ownerName}</Text>
                <View style={styles.profilePhoneRow}>
                  <Phone color={palette.muted} size={11} strokeWidth={2.2} />
                  <Text style={styles.profilePhoneText}>{maskedPhone}</Text>
                </View>
                <View style={styles.profileVerifyPill}>
                  <Shield color={palette.teal} size={10} strokeWidth={2.4} />
                  <Text style={styles.profileVerifyText}>已实名 · Lv.3</Text>
                </View>
              </View>
              <Edit3 color={palette.muted} size={18} strokeWidth={2.2} />
            </View>
          </View>

          <View style={styles.profileCurrentWrap}>
            <View style={styles.profileSectionLabelRow}>
              <Text style={styles.profileSectionLabel}>当前宠物</Text>
              <Pressable onPress={() => go(pet ? 'petDetail' : 'petInfo')}>
                <Text style={styles.profileManageLink}>{pet ? '多宠管理 ›' : '添加宠物 ›'}</Text>
              </Pressable>
            </View>
            {pet ? (
              <Pressable accessibilityLabel={`进入${pet.name}的宠物档案`} accessibilityRole="button" onPress={() => go('petDetail')} style={styles.profilePetCardMake}>
                <PetAvatar uri={pet.avatarUrl ?? generatedGoldenAvatarUri} size={60} />
                <View style={styles.flex}>
                  <View style={styles.profilePetNameRow}>
                    <Text style={styles.profilePetName}>{pet.name}</Text>
                    <Text style={styles.profilePetBadge}>{pet.breed || speciesLabel}</Text>
                  </View>
                  <Text style={styles.profilePetMeta}>{formatPetAge(pet.birthday)} · {pet.weightKg ? `${pet.weightKg} kg` : '体重待补充'}</Text>
                  <View style={styles.profilePetTags}>
                    {(pet.personality?.length ? pet.personality : ['真实在线', '想交朋友']).slice(0, 3).map((tag) => (
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

          <View style={styles.profileMenuGroup}>
            <ProfileMakeRow Icon={PawPrint} onPress={() => go(pet ? 'petDetail' : 'petInfo')} title="宠物档案" value={pet?.name ?? '待添加'} />
            <ProfileMakeRow Icon={Users} onPress={() => go('discover')} title="社交与附近" value={permissionEnabled && userSettings.nearbyVisible ? '已开启' : '待开启'} />
            <ProfileMakeRow Icon={Bell} onPress={() => go('notifications')} title="通知设置" value={notificationsEnabled ? '已开启' : '未开启'} />
            <ProfileMakeRow Icon={Shield} onPress={() => go('safety')} title="安全中心" />
            <ProfileMakeRow Icon={User} onPress={() => go('accountSecurity')} title="账号安全" />
            <ProfileMakeRow Icon={LogOut} onPress={() => openConfirm('退出当前账号', '退出后会清除本机登录缓存，下次需要重新获取验证码登录。', () => void logout(), '退出')} title="退出当前账号" value="清除本机登录" />
          </View>
        </View>
      </Screen>
    );
  }

  function renderSettings() {
    return (
      <Screen title="设置与隐私">
        <View style={styles.settingsGroupMake}>
          <Text style={styles.settingsGroupTitle}>隐私</Text>
          <ProfileMakeRow Icon={MapPin} onPress={() => void toggleUserSetting('fuzzyLocation', '模糊定位')} title="模糊定位" value={userSettings.fuzzyLocation ? '1km 范围' : '已关闭'} />
          <ProfileMakeRow Icon={Users} onPress={() => void toggleUserSetting('nearbyVisible', '附近可见')} title="附近可见" value={userSettings.nearbyVisible ? '已开启' : '已关闭'} />
          <ProfileMakeRow Icon={MessageCircle} onPress={() => void toggleUserSetting('interactionMessages', '互动消息提醒')} title="互动消息提醒" value={userSettings.interactionMessages ? '已开启' : '已关闭'} />
        </View>
        <View style={styles.settingsFootnoteMake}>
          <Shield color={palette.teal} size={14} strokeWidth={2.4} />
          <Text style={styles.chatSafetyText}>开启模糊定位后，附近的人只能看到大致距离，不会显示精确坐标。</Text>
        </View>
        <View style={styles.settingsGroupMake}>
          <Text style={styles.settingsGroupTitle}>通用</Text>
          <ProfileMakeRow Icon={Bell} onPress={() => void toggleUserSetting('pushNotifications', '通知')} title="通知" value={userSettings.pushNotifications ? '开启' : '关闭'} />
          <ProfileMakeRow Icon={Settings} title="语言" value="简体中文" />
        </View>
        <View style={styles.settingsGroupMake}>
          <Text style={styles.settingsGroupTitle}>安全与账号</Text>
          <ProfileMakeRow Icon={Shield} onPress={() => go('accountSecurity')} title="账号安全" value="已实名" />
          <ProfileMakeRow Icon={Shield} onPress={() => go('safety')} title="黑名单与举报" />
          <View style={styles.apiModeMake}>
            <Text style={styles.timelineTitleMake}>接口模式</Text>
            <Text style={styles.timelineSubMake}>{apiConfig.mode === 'mock' ? 'Mock 服务' : apiConfig.baseUrl}</Text>
          </View>
          <Pressable onPress={() => openConfirm('退出当前账号', '退出后会清除本机登录缓存，下次需要重新获取验证码登录。', () => void logout(), '退出')} style={styles.logoutButton}>
            <LogOut color={palette.danger} size={18} strokeWidth={2.3} />
            <Text style={styles.logoutText}>退出当前账号</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  function renderPetDetail() {
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    const genderText = pet?.gender === 'female' ? '妹妹' : pet?.gender === 'male' ? '弟弟' : '待补充';
    const vaccineValue = pendingVaccines.length ? `${pendingVaccines.length} 项待提醒` : vaccines.length ? '已完成' : '待添加';
    return (
      <Screen title="宠物档案">
        {pet ? (
          <View style={styles.petDetailMakePage}>
            <View style={styles.petDetailHeroMake}>
              <PetAvatar uri={pet.avatarUrl ?? generatedGoldenAvatarUri} size={160} />
              <Pressable onPress={startPetAvatarRefresh} style={styles.petDetailCamera}>
                <Camera color="#fff" size={12} strokeWidth={2.3} />
                <Text style={styles.petDetailCameraText}>更换</Text>
              </Pressable>
              <View style={styles.petDetailHeroText}>
                <Text style={styles.petDetailHeroName}>{pet.name}</Text>
                <Text style={styles.petDetailHeroMeta}>{pet.breed || speciesLabels[pet.species]} · {formatPetAge(pet.birthday)}</Text>
              </View>
              <Pressable onPress={() => go('editPet')} style={styles.petDetailEdit}>
                <Edit3 color={palette.orange} size={12} strokeWidth={2.4} />
                <Text style={styles.petDetailEditText}>编辑</Text>
              </Pressable>
            </View>
            <View style={styles.petDetailStats}>
              {[
                ['体重', formatWeightKg(pet.weightKg)],
                ['生日', pet.birthday ? pet.birthday.replace(/-/g, '.') : '待补充'],
                ['体型', '待补充'],
              ].map(([label, value]) => (
                <View key={label} style={styles.petDetailStatCard}>
                  <Text style={styles.petDetailStatLabel}>{label}</Text>
                  <Text style={styles.petDetailStatValue}>{value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.settingsGroupMake}>
              <Text style={styles.settingsGroupTitle}>基础信息</Text>
              <MakeDetailRow inset label="昵称" value={pet.name} />
              <View style={styles.makeDivider} />
              <MakeDetailRow inset label="品种" value={pet.breed || speciesLabels[pet.species]} />
              <View style={styles.makeDivider} />
              <MakeDetailRow inset label="性别 / 绝育" value={`${genderText} / 待补充`} />
              <View style={styles.makeDivider} />
              <MakeDetailRow inset label="毛色" value="待识别" />
            </View>
            <View style={styles.settingsGroupMake}>
              <Text style={styles.settingsGroupTitle}>健康</Text>
              <ProfileMakeRow Icon={HeartPulse} onPress={() => go('health')} title="健康分" value={`${pet.healthScore} / 100`} />
              <ProfileMakeRow Icon={Syringe} onPress={() => go('vaccine')} title="疫苗计划" value={vaccineValue} />
            </View>
          </View>
        ) : (
          renderEmptyPet()
        )}
      </Screen>
    );
  }

  function renderDailyPost() {
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    return (
      <Screen title="记录今天的小事">
        <View style={styles.dailyPostHero}>
          <PetAvatar uri={pet?.avatarUrl ?? generatedGoldenAvatarUri} size={64} />
          <View style={styles.flex}>
            <Text style={styles.timelineTitleMake}>{pet?.name ?? '灵伴'}今天过得怎么样？</Text>
            <Text style={styles.timelineSubMake}>这会同步到健康备忘，也能让灵伴更懂它。</Text>
          </View>
        </View>
        <View style={styles.composerCardMake}>
          <Text style={styles.settingsGroupTitle}>今日记录</Text>
          <TextInput
            multiline
            onChangeText={setDailyPostText}
            placeholder="例如：今天在公园玩得很开心，回家后食欲很好。"
            placeholderTextColor="#b6aca3"
            style={[styles.longTextInput, webTextInputReset]}
            value={dailyPostText}
          />
          <View style={styles.dailyMoodRow}>
            {['开心', '活跃', '正常', '有点累'].map((item) => (
              <Text key={item} style={styles.ownerTagMake}>{item}</Text>
            ))}
          </View>
        </View>
        <View style={styles.actionRow}>
          <Button onPress={() => setDailyPostText('今天在滨江绿地散步 40 分钟，精神很好，喝水正常。')} tone="secondary">AI 帮我写</Button>
          <Button loading={dailyPostSaving} onPress={() => void publishDailyPost()}>发布记录</Button>
        </View>
      </Screen>
    );
  }

  function renderWalkInvite() {
    const owner = selectedOwner ?? owners[0];
    return (
      <Screen title="约遛邀请">
        {owner ? (
          <>
            <View style={styles.ownerInviteHero}>
              <PetAvatar uri={owner.imageUrl} size={76} />
              <View style={styles.flex}>
                <View style={styles.rowBetween}>
                  <Text style={styles.ownerPetNameMake}>{owner.petName}</Text>
                  <Text style={styles.ownerDistanceMake}>{owner.distance}</Text>
                </View>
                <Text style={styles.timelineSubMake}>{owner.species === 'dog' ? '狗狗' : '猫咪'} · 主人 {owner.ownerName}</Text>
                <View style={styles.ownerTagRowMake}>
                  {owner.tags.slice(0, 3).map((tag) => (
                    <Text key={tag} style={styles.ownerTagMake}>{tag}</Text>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.settingsGroupMake}>
              <Text style={styles.settingsGroupTitle}>邀请信息</Text>
              <View style={styles.walkFieldWrap}>
                <Field label="地点" onChangeText={setWalkInvitePlace} placeholder="例如：滨江绿地" value={walkInvitePlace} />
                <Field label="时间" onChangeText={setWalkInviteTime} placeholder="例如：今天 19:00" value={walkInviteTime} />
              </View>
            </View>
            <View style={styles.composerCardMake}>
              <Text style={styles.settingsGroupTitle}>邀请留言</Text>
              <TextInput
                multiline
                onChangeText={setWalkInviteNote}
                placeholder="写一句轻松自然的邀请"
                placeholderTextColor="#b6aca3"
                style={[styles.longTextInput, webTextInputReset]}
                value={walkInviteNote}
              />
            </View>
            <View style={styles.actionRow}>
              <Button loading={socialActionSavingIds.includes(`greet:${owner.id}`)} onPress={() => void sendGreeting(owner.id)} tone="secondary">先打招呼</Button>
              <Button loading={walkInviteSaving} onPress={() => void createWalkInvite()}>发送邀请</Button>
            </View>
          </>
        ) : (
          <View style={styles.mapEmptyCard}>
            <Text style={styles.cardTitle}>暂无可邀请对象</Text>
            <Text style={styles.mutedText}>回到发现页刷新附近宠物主人。</Text>
          </View>
        )}
      </Screen>
    );
  }

  function renderGreetingRequests() {
    const pet = activePet ?? lumiiApi.pets.getActivePet();
    return (
      <Screen title="招呼请求">
        <View style={styles.chatSafetyTip}>
          <Shield color={palette.teal} size={14} strokeWidth={2.4} />
          <Text style={styles.chatSafetyText}>接受招呼后才会进入聊天，未接受前不会暴露精确位置。</Text>
        </View>
        <View style={styles.requestStackMake}>
          {greetingRequestOwners.length ? greetingRequestOwners.map((owner, index) => (
            <View key={owner.id} style={styles.greetingRequestCard}>
              <PetAvatar uri={owner.imageUrl} size={54} />
              <View style={styles.flex}>
                <Text style={styles.timelineTitleMake}>{owner.ownerName}和{owner.petName}</Text>
                <Text style={styles.timelineSubMake}>{index === 0 ? `想认识你和${pet?.name ?? '你的宠物'}，今晚也在附近散步。` : '向你发送了友好的招呼。'}</Text>
                <View style={styles.requestActionRow}>
                  <Button loading={socialActionSavingIds.includes(`reject:${owner.id}`)} onPress={() => void rejectGreeting(owner)} tone="ghost">婉拒</Button>
                  <Button loading={socialActionSavingIds.includes(`accept:${owner.id}`)} onPress={() => void acceptGreeting(owner)}>接受</Button>
                </View>
              </View>
            </View>
          )) : (
            <View style={styles.emptyStateMake}>
              <MessageCircle color={palette.orange} size={24} strokeWidth={2.4} />
              <Text style={styles.emptyStateTitleMake}>暂无新的招呼</Text>
              <Text style={styles.emptyStateTextMake}>新的附近互动会出现在这里。</Text>
            </View>
          )}
        </View>
      </Screen>
    );
  }

  function renderAddPlaceReview() {
    return (
      <Screen title="新增地点与点评">
        <View style={styles.addPlaceHero}>
          <MapPin color="#fff" size={26} strokeWidth={2.5} />
          <View style={styles.flex}>
            <Text style={styles.addPlaceHeroTitle}>分享一个宠物友好地点</Text>
            <Text style={styles.addPlaceHeroSub}>提交后会进入审核，审核通过再展示给附近用户。</Text>
          </View>
        </View>
        <View style={styles.settingsGroupMake}>
          <Text style={styles.settingsGroupTitle}>地点信息</Text>
          <View style={styles.walkFieldWrap}>
            <Field label="地点名称" onChangeText={setPlaceDraftName} placeholder="例如：阳光宠物公园" value={placeDraftName} />
            <Field label="地址" onChangeText={setPlaceDraftAddress} placeholder="搜索或输入地址" value={placeDraftAddress} />
          </View>
        </View>
        <View style={styles.composerCardMake}>
          <Text style={styles.settingsGroupTitle}>宠物友好体验</Text>
          <TextInput
            multiline
            onChangeText={setPlaceReview}
            placeholder="例如：草坪很大，有饮水点，牵引绳友好。"
            placeholderTextColor="#b6aca3"
            style={[styles.longTextInput, webTextInputReset]}
            value={placeReview}
          />
          <View style={styles.dailyMoodRow}>
            {['可遛狗', '饮水点', '室内友好', '停车方便'].map((item) => (
              <Text key={item} style={styles.ownerTagMake}>{item}</Text>
            ))}
          </View>
        </View>
        {placeReviewStatus === 'pending_review' ? (
          <View style={styles.reviewStatusCard}>
            <Check color={palette.teal} size={15} strokeWidth={3} />
            <Text style={styles.reviewStatusText}>已提交审核。后续真实接口会返回审核单号和预计处理时间。</Text>
          </View>
        ) : null}
        <Button loading={placeReviewSaving} onPress={() => void submitPlaceDraft()}>提交审核</Button>
      </Screen>
    );
  }

  function renderAccountSecurity() {
    return (
      <Screen title="账号安全">
        <View style={styles.placeholderHeroMake}>
          <Shield color={palette.teal} size={28} strokeWidth={2.5} />
          <View style={styles.flex}>
            <Text style={styles.timelineTitleMake}>账号已实名 · 安全等级高</Text>
            <Text style={styles.timelineSubMake}>当前登录方式为手机号验证码，微信/苹果登录后续接入。</Text>
          </View>
        </View>
        <View style={styles.settingsGroupMake}>
          <Text style={styles.settingsGroupTitle}>登录方式</Text>
          <ProfileMakeRow Icon={Phone} title="手机号" value={formatMaskedPhone(session?.phone)} />
          <ProfileMakeRow Icon={Shield} title="登录保护" value="已开启" />
          <ProfileMakeRow Icon={Bell} title="异常登录提醒" value="已开启" />
        </View>
        <View style={styles.settingsGroupMake}>
          <Text style={styles.settingsGroupTitle}>危险操作</Text>
          <ProfileMakeRow Icon={LogOut} onPress={() => openConfirm('退出当前账号', '退出后会清除本机登录缓存，下次需要重新获取验证码登录。', () => void logout(), '退出')} title="退出当前账号" value="清除本机登录" />
          <ProfileMakeRow Icon={LogOut} title="注销账号" value="后续开放" />
        </View>
      </Screen>
    );
  }

  function renderSafety() {
    return (
      <Screen title="安全中心">
        <View style={styles.placeholderHeroMake}>
          <Shield color={palette.teal} size={28} strokeWidth={2.5} />
          <View style={styles.flex}>
            <Text style={styles.timelineTitleMake}>社区安全中心</Text>
            <Text style={styles.timelineSubMake}>举报、拉黑和隐私保护会集中在这里，上线前接入二次确认和审核流程。</Text>
          </View>
        </View>
        <View style={styles.settingsGroupMake}>
          <Text style={styles.settingsGroupTitle}>快速处理</Text>
          <ProfileMakeRow Icon={AlertTriangle} title="举报不当内容" value="后续开放" />
          <ProfileMakeRow Icon={Shield} title="拉黑用户" value="后续开放" />
          <ProfileMakeRow Icon={Users} title="黑名单管理" value="0 人" />
        </View>
        <View style={styles.settingsFootnoteMake}>
          <Shield color={palette.teal} size={14} strokeWidth={2.4} />
          <Text style={styles.chatSafetyText}>MVP 阶段先展示安全入口，不提交 mock 操作；后续需要后端提供举报、拉黑、黑名单和审核接口。</Text>
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
              <Text style={styles.timelineTitleMake}>{isAccount ? '账号已实名 · 安全等级高' : isSafety ? '社区安全中心' : title}</Text>
              <Text style={styles.timelineSubMake}>{body}</Text>
            </View>
          </View>
          <View style={styles.settingsGroupMake}>
            <Text style={styles.settingsGroupTitle}>{isAccount ? '登录方式' : isSafety ? '安全工具' : '功能入口'}</Text>
            <ProfileMakeRow Icon={Phone} title="手机号" value={formatMaskedPhone(session?.phone)} />
            <ProfileMakeRow Icon={Shield} title={isSafety ? '举报与拉黑' : '登录保护'} value={isSafety ? '后续开放' : '已开启'} />
            <ProfileMakeRow Icon={LogOut} title={isAccount ? '注销账号' : '危险操作'} value="后续开放" />
          </View>
        </View>
      </Screen>
    );
  }

  function renderScreen() {
    if (sessionBootstrapping) return renderSessionBootstrapping();

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
      case 'healthMemos':
        return renderHealthMemos();
      case 'home':
        return renderHome();
      case 'login':
        return renderLogin();
      case 'map':
        return renderMap();
      case 'messages':
        return renderMessages();
      case 'notifications':
        return renderNotifications();
      case 'otp':
        return renderOtp();
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.appWrap}>
        <View style={[styles.phoneFrame, nativeTopInset ? { paddingTop: nativeTopInset } : null]}>
          {renderScreen()}
          {showBottomTabs ? (
            <View style={styles.tabBar}>
              {tabItems.map(({ Icon, ...item }) => {
                const selected = currentTab === item.route;
                return (
                  <Pressable key={item.route} onPress={() => resetTo(item.route)} style={[styles.tabItem, selected && styles.tabItemActive, webPressableReset]}>
                    <Icon color={selected ? palette.orange : palette.muted} size={20} strokeWidth={selected ? 2.4 : 2} />
                    <Text style={[styles.tabText, selected && styles.tabTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <Toast message={toast} />
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

function Mascot({ size = 96 }: { size?: number }) {
  return (
    <View style={[styles.mascot, { borderRadius: size / 2, height: size, width: size }]}>
      <PawPrint color="#8a5226" size={Math.max(30, size * 0.38)} strokeWidth={2.4} />
    </View>
  );
}

function PetAvatar({ size = 96, uri }: { size?: number; uri?: null | string }) {
  const remoteUri = uri && !isGeneratedAvatarUri(uri) ? uri : null;
  const [loading, setLoading] = useState(Boolean(remoteUri));

  useEffect(() => {
    setLoading(Boolean(remoteUri));
  }, [remoteUri]);

  return (
    <View style={[styles.petAvatar, { borderRadius: size / 2, height: size, width: size }]}>
      {remoteUri ? <Image resizeMode="cover" source={generatedGoldenAvatarSource} style={styles.avatarImage} /> : null}
      <Image
        onError={() => setLoading(false)}
        onLoadEnd={() => setLoading(false)}
        onLoadStart={() => {
          if (remoteUri) setLoading(true);
        }}
        resizeMode="cover"
        source={remoteUri ? { uri: remoteUri } : generatedGoldenAvatarSource}
        style={[styles.avatarImage, remoteUri && styles.avatarImageRemote]}
      />
      {loading ? (
        <View pointerEvents="none" style={styles.avatarLoadingOverlay}>
          <ActivityIndicator color={palette.orange} size="small" />
        </View>
      ) : null}
    </View>
  );
}

function MetricCard({
  Icon,
  label,
  onPress,
  tag,
  tagTone = 'orange',
  value,
}: {
  Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
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
  const iconPalette = tagTone === 'teal'
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
        <Star color={palette.orange} fill={palette.orange} size={13} strokeWidth={2} />
        <Text style={styles.ratingText}>{place.rating}</Text>
      </View>
    </Pressable>
  );
}

function PlaceSheetRow({ active, onPress, place, rank }: { active?: boolean; onPress: () => void; place: Place; rank: number }) {
  return (
    <Pressable onPress={onPress} style={[styles.placeSheetRow, active && styles.placeSheetRowActive]}>
      <View style={[styles.placeRankBadge, active && styles.placeRankBadgeActive]}>
        <Text style={[styles.placeRankText, active && styles.placeRankTextActive]}>{rank}</Text>
      </View>
      <View style={styles.flex}>
        <View style={styles.rowBetween}>
          <Text numberOfLines={1} style={styles.placeSheetTitle}>{place.name}</Text>
          <View style={styles.ratingPill}>
            <Star color={palette.orange} fill={palette.orange} size={12} strokeWidth={2} />
            <Text style={styles.ratingText}>{place.rating}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.placeSheetMeta}>{place.address} · {place.distance}</Text>
        <View style={styles.placeSheetTags}>
          {place.tags.slice(0, 2).map((tag) => (
            <Text key={tag} style={styles.placeSheetTag}>{tag}</Text>
          ))}
        </View>
      </View>
      <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} />
    </Pressable>
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
  onPress,
  title,
  value,
}: {
  Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  onPress?: () => void;
  title: string;
  value?: string;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.profileMakeRow, !onPress && styles.profileMakeRowStatic]}>
      <View style={styles.profileMakeRowIcon}>
        <Icon color={palette.orange} size={16} strokeWidth={2.4} />
      </View>
      <Text numberOfLines={1} style={styles.profileMakeRowTitle}>
        {title}
      </Text>
      {value ? (
        <Text numberOfLines={1} style={styles.profileMakeRowValue}>
          {value}
        </Text>
      ) : null}
      {onPress ? <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

function MakeDetailRow({ inset, label, value }: { inset?: boolean; label: string; value: string }) {
  return (
    <View style={[styles.makeDetailRow, inset && styles.makeDetailRowInset]}>
      <Text numberOfLines={1} style={styles.makeDetailLabel}>
        {label}
      </Text>
      <Text numberOfLines={2} style={styles.makeDetailValue}>
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

function HealthMakeRow({
  Icon,
  badge,
  onPress,
  subtitle,
  title,
  tone,
}: {
  Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  badge: string;
  onPress: () => void;
  subtitle: string;
  title: string;
  tone: 'cool' | 'warm';
}) {
  const isCool = tone === 'cool';
  return (
    <Pressable onPress={onPress} style={styles.healthMakeRow}>
      <View style={[styles.healthMakeIcon, isCool && styles.healthMakeIconCool]}>
        <Icon color={isCool ? palette.teal : palette.orange} size={17} strokeWidth={2.5} />
      </View>
      <View style={styles.flex}>
        <View style={styles.rowBetween}>
          <Text style={styles.healthMakeTitle}>{title}</Text>
          <Text style={[styles.healthMakeBadge, isCool && styles.healthMakeBadgeCool]}>{badge}</Text>
        </View>
        <Text style={styles.healthMakeSub}>{subtitle}</Text>
      </View>
      <ChevronRight color={palette.muted} size={16} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', gap: 12 },
  addPlaceHero: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 22, flexDirection: 'row', gap: 13, paddingHorizontal: 18, paddingVertical: 18, shadowColor: '#8b5e3c', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.16, shadowRadius: 30 },
  addPlaceHeroSub: { color: 'rgba(255,255,255,0.88)', flex: 1, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  addPlaceHeroTitle: { color: '#fff', fontFamily: appFontFamily, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  agreementRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4 },
  agreementText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500' },
  appWrap: { alignItems: 'center', backgroundColor: '#e8e2d9', flex: 1, justifyContent: 'center' },
  avatarImage: { height: '100%', width: '100%' },
  avatarImageRemote: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  avatarLoadingOverlay: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
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
  chatComposer: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 8, padding: 8 },
  chatDateChip: { alignSelf: 'center', backgroundColor: 'rgba(122,121,114,0.12)', borderRadius: 12, color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 4 },
  chatInput: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, minHeight: 40, paddingHorizontal: 10 },
  chatInputDisabled: { color: palette.muted },
  chatList: { gap: 10, minHeight: 520 },
  chatMakeBubble: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#50371e', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.06, shadowRadius: 14 },
  chatMakeBubbleMe: { backgroundColor: palette.orange, borderBottomLeftRadius: 18, borderBottomRightRadius: 4, borderColor: palette.orange, shadowColor: palette.orange, shadowOpacity: 0.18 },
  chatMakeBubbleRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  chatMakeBubbleRowMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  chatMakeHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 0 },
  chatMakeList: { gap: 10, marginTop: 14, minHeight: 480 },
  chatMakeName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  chatMakeText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, lineHeight: 22 },
  chatFeedbackChip: { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  chatFeedbackChipActive: { backgroundColor: palette.orangeSoft, borderColor: 'rgba(255,138,92,0.42)' },
  chatFeedbackRow: { flexDirection: 'row', gap: 6, marginLeft: 2, marginTop: 5 },
  chatFeedbackText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '700' },
  chatFeedbackTextActive: { color: palette.orange },
  chatOnlineRow: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 2 },
  chatOnlineText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  chatQuotaHint: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 8, textAlign: 'center' },
  chatSafetyText: { color: palette.teal, flex: 1, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17 },
  chatSafetyTip: { alignItems: 'flex-start', backgroundColor: 'rgba(77,182,172,0.10)', borderColor: 'rgba(77,182,172,0.22)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 9, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10 },
  chatTopicChip: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chatTopicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chatTopicText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600' },
  chatText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, lineHeight: 20 },
  chatTextMe: { color: '#fff', fontWeight: '600' },
  chatTypingBubble: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 42 },
  chatTypingText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700' },
  checkbox: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 7, borderWidth: 1.2, height: 18, justifyContent: 'center', width: 18 },
  checkboxChecked: { backgroundColor: palette.orange, borderColor: palette.orange },
  content: { gap: 16, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 18 },
  contentWithTabs: { paddingBottom: 110 },
  conversationRow: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 70, padding: 14 },
  countryCode: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '700', minWidth: 34 },
  dangerText: { color: palette.danger, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  emptyStateMake: { alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 24 },
  emptyStateTextMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 19, textAlign: 'center' },
  emptyStateTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '700' },
  flex: { flex: 1, minWidth: 0 },
  aiGeneratingImage: { borderRadius: 120, height: 240, opacity: 0.9, width: 240 },
  aiGeneratingOrb: { alignItems: 'center', alignSelf: 'center', height: 286, justifyContent: 'center', marginTop: 28, position: 'relative', width: 286 },
  aiGeneratingPage: { alignItems: 'center', paddingHorizontal: 6 },
  aiGeneratingRing: { backgroundColor: 'rgba(255,138,92,0.18)', borderColor: palette.orange, borderRadius: 136, borderWidth: 3, height: 272, opacity: 0.75, position: 'absolute', width: 272 },
  aiGeneratingSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13.5, lineHeight: 22, marginTop: 10, textAlign: 'center' },
  aiGeneratingTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 22, fontWeight: '700', letterSpacing: 0, lineHeight: 29, marginTop: 30, textAlign: 'center' },
  aiOriginalThumb: { borderColor: '#fff', borderRadius: 31, borderWidth: 3, height: 62, left: 7, overflow: 'hidden', position: 'absolute', top: 12, width: 62 },
  aiPhotoChip: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.82)', borderColor: palette.border, borderRadius: 30, borderWidth: 1, flexDirection: 'row', gap: 10, marginLeft: 2, marginTop: 4, paddingBottom: 6, paddingLeft: 6, paddingRight: 14, paddingTop: 6 },
  aiPhotoChipImage: { borderColor: '#fff', borderRadius: 18, borderWidth: 2, height: 36, width: 36 },
  aiPhotoChipStrong: { color: palette.ink, fontWeight: '700' },
  aiPhotoChipText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700', lineHeight: 15 },
  aiQuotaHint: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', lineHeight: 18, marginTop: 12, textAlign: 'center' },
  aiResultActions: { gap: 12, marginTop: 28, width: '100%' },
  aiResultDesc: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13.5, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  aiResultHero: { alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  aiResultName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 24, fontWeight: '700', letterSpacing: 0, lineHeight: 32, marginTop: 22, textAlign: 'center' },
  aiResultPage: { alignItems: 'center', paddingHorizontal: 6 },
  aiScanLine: { backgroundColor: palette.orange, borderRadius: 999, height: 2, left: 28, opacity: 0.88, position: 'absolute', right: 28, top: 135 },
  aiStepsCard: { backgroundColor: 'rgba(255,255,255,0.76)', borderColor: palette.border, borderRadius: 18, borderWidth: 1, marginTop: 22, paddingHorizontal: 16, paddingVertical: 10, width: '100%' },
  aiWorkingBadge: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, bottom: 34, flexDirection: 'row', gap: 5, paddingHorizontal: 12, paddingVertical: 6, position: 'absolute', right: 2, shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.15, shadowRadius: 18 },
  aiWorkingText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  formCard: { gap: 12 },
  goldIcon: { backgroundColor: '#f2b441' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  greetButtonMake: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 17, height: 34, justifyContent: 'center', position: 'absolute', right: 14, top: 70, width: 34 },
  header: { backgroundColor: palette.background, paddingHorizontal: 16, paddingTop: 0 },
  headerRow: { alignItems: 'center', flexDirection: 'row', height: 44, justifyContent: 'space-between' },
  headerSpacer: { height: 36, width: 36 },
  headerTitle: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  healthScore: { color: palette.ink, fontFamily: appFontFamily, fontSize: 44, fontWeight: '700', lineHeight: 50 },
  healthHeroAvatar: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 38, height: 76, justifyContent: 'center', padding: 6, width: 76 },
  healthHeroCopy: { flex: 1, minWidth: 0 },
  healthHeroDesc: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700', lineHeight: 19, marginTop: 8 },
  healthHeroLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  healthHeroLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  healthHeroMake: { alignItems: 'center', backgroundColor: '#ffd2a8', borderRadius: 24, flexDirection: 'row', gap: 12, overflow: 'hidden', paddingHorizontal: 20, paddingVertical: 18, shadowColor: '#8b5e3c', shadowOffset: { height: 18, width: 0 }, shadowOpacity: 0.16, shadowRadius: 36 },
  healthHeroScore: { color: palette.ink, fontFamily: appFontFamily, fontSize: 44, fontWeight: '700', letterSpacing: 0, lineHeight: 48 },
  healthHeroScoreRow: { alignItems: 'baseline', flexDirection: 'row', gap: 6, marginTop: 6 },
  healthHeroTotal: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, fontWeight: '600' },
  healthMakeBadge: { backgroundColor: palette.orangeSoft, borderRadius: 12, color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 3 },
  healthMakeBadgeCool: { backgroundColor: 'rgba(77,182,172,0.14)', color: palette.teal },
  healthMakeIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  healthMakeIconCool: { backgroundColor: 'rgba(77,182,172,0.18)' },
  healthMakeRow: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.07, shadowRadius: 24 },
  healthMakeSub: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, marginTop: 3 },
  healthMakeTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14.5, fontWeight: '700' },
  healthMemoEditorMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, gap: 14, padding: 16, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.07, shadowRadius: 24 },
  healthMemoIconMake: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  healthMemoMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, gap: 12, marginTop: 14, padding: 16 },
  healthReminderCard: { alignItems: 'center', backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.26)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.08, shadowRadius: 22 },
  healthReminderIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  healthReminderText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17, marginTop: 2 },
  healthReminderTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700', lineHeight: 19 },
  healthSectionStack: { gap: 10, marginTop: 14 },
  healthTimelineCard: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, marginTop: 14, paddingHorizontal: 16, paddingVertical: 14 },
  heroCard: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 16 },
  homeBellButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.78)', borderColor: palette.border, borderRadius: 19, borderWidth: 1, height: 38, justifyContent: 'center', position: 'relative', width: 38 },
  homeBellDot: { backgroundColor: palette.orange, borderColor: '#fff', borderRadius: 4, borderWidth: 1.5, height: 7, position: 'absolute', right: 9, top: 8, width: 7 },
  homeChatHint: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, marginTop: 5, maxWidth: '88%', minHeight: 34, paddingHorizontal: 13, paddingVertical: 7, shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.12, shadowRadius: 18 },
  homeChatHintText: { color: palette.ink, flexShrink: 1, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  homeHealthCard: { alignItems: 'center', backgroundColor: '#ffe3cb', borderColor: 'rgba(255,255,255,0.7)', borderRadius: 22, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#8b5e3c', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.12, shadowRadius: 24 },
  homeHealthDelta: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.22)', borderRadius: 10, flexDirection: 'row', gap: 2, marginLeft: 6, paddingHorizontal: 8, paddingVertical: 3 },
  homeHealthDeltaText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600' },
  homeHealthDesc: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 17, marginTop: 8 },
  homeHealthLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500' },
  homeHealthRing: { alignItems: 'center', backgroundColor: palette.teal, borderRadius: 32, height: 64, justifyContent: 'center', width: 64 },
  homeHealthRingInner: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
  homeHealthScore: { color: palette.ink, fontFamily: appFontFamily, fontSize: 36, fontWeight: '700', letterSpacing: 0, lineHeight: 38 },
  homeHealthScoreRow: { alignItems: 'baseline', flexDirection: 'row', gap: 2, marginTop: 4 },
  homeHealthTotal: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '500' },
  homeMakeGreeting: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12, minWidth: 0 },
  homeMakeHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingTop: 6 },
  homeMakeHeadline: { color: palette.ink, fontFamily: appFontFamily, fontSize: 17, fontWeight: '700', letterSpacing: 0, lineHeight: 22 },
  homeMakeKicker: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '500' },
  homeMakePage: { gap: 0 },
  homeOnlineBadge: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.16)', borderRadius: 14, bottom: 6, flexDirection: 'row', gap: 5, left: 36, paddingHorizontal: 11, paddingVertical: 5, position: 'absolute' },
  homeOnlineDot: { backgroundColor: palette.teal, borderRadius: 3, height: 6, width: 6 },
  homeOnlineText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600' },
  homePetMeta: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500' },
  homePetName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 22, fontWeight: '700', letterSpacing: 0, lineHeight: 27 },
  homePetNameRow: { alignItems: 'center', flexDirection: 'row', gap: 2, justifyContent: 'center', marginTop: 10 },
  homePetStage: { alignItems: 'center', justifyContent: 'center', marginTop: 8, position: 'relative' },
  homeQuickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10, rowGap: 10 },
  homeStoryIcon: { alignItems: 'center', backgroundColor: 'rgba(255,138,92,0.14)', borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  homeStoryStrip: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, paddingHorizontal: 14, paddingVertical: 9, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.08, shadowRadius: 24 },
  homeStorySub: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, marginTop: 2 },
  homeStoryTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
  homeIndicator: { alignSelf: 'center', backgroundColor: palette.ink, borderRadius: 999, bottom: 9, height: 4, opacity: 0.9, position: 'absolute', width: 134 },
  iconButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderColor: 'transparent', borderRadius: 18, borderWidth: 0, height: 36, justifyContent: 'center', width: 36 },
  inlineError: { color: palette.danger, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600' },
  inlineActionRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  inlineDeleteButton: { alignItems: 'center', backgroundColor: 'rgba(122,121,114,0.12)', borderRadius: 999, justifyContent: 'center', paddingHorizontal: 9, paddingVertical: 5 },
  inlineDeleteText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  inlineNotice: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600' },
  inlineRetryButton: { alignItems: 'center', backgroundColor: '#ffdad6', borderRadius: 999, justifyContent: 'center', paddingHorizontal: 9, paddingVertical: 5 },
  inlineRetryText: { color: palette.danger, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  infoChip: { backgroundColor: palette.background, borderRadius: 14, color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 10, textAlign: 'center' },
  infoChipRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  label: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '500' },
  loginForm: { gap: 14, marginTop: 42 },
  loginHero: { marginTop: 88 },
  loginContent: { flex: 1 },
  loginSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, lineHeight: 21, marginTop: 10 },
  loginTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 29, fontWeight: '700', includeFontPadding: false, letterSpacing: 0, lineHeight: 37 },
  loginTitleBlock: { maxWidth: '100%' },
  loginTitleLine: { color: palette.ink, fontFamily: appFontFamily, fontSize: 27, fontWeight: '700', includeFontPadding: false, letterSpacing: 0, lineHeight: 35, maxWidth: '100%' },
  logoMark: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 13, height: 38, justifyContent: 'center', width: 38 },
  logoRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 22 },
  logoText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 18, fontWeight: '700' },
  longTextInput: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, lineHeight: 21, minHeight: 118, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' },
  logoutButton: { alignItems: 'center', backgroundColor: '#ffdad6', borderRadius: 18, flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 52 },
  logoutText: { color: palette.danger, fontFamily: appFontFamily, fontSize: 15, fontWeight: '700' },
  mapCanvas: { backgroundColor: '#eef2ec', borderRadius: 24, height: 330, overflow: 'hidden', position: 'relative' },
  mapLabel: { backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 999, color: '#5e7d75', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', left: 18, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, position: 'absolute', top: 18 },
  mapMarker: { alignItems: 'center', backgroundColor: palette.orange, borderColor: '#fff', borderRadius: 999, borderWidth: 3, height: 50, justifyContent: 'center', left: '48%', position: 'absolute', top: '48%', width: 50 },
  mapPatchA: { backgroundColor: '#cfe7d2', borderRadius: 44, height: 128, left: -20, position: 'absolute', top: 32, transform: [{ rotate: '-18deg' }], width: 160 },
  mapPatchB: { backgroundColor: '#cfe8e7', borderRadius: 52, bottom: -26, height: 132, position: 'absolute', right: -34, transform: [{ rotate: '16deg' }], width: 190 },
  mapRoad: { backgroundColor: '#fffaf4', borderColor: 'rgba(218,206,192,0.8)', borderRadius: 999, borderWidth: 1, height: 24, left: -40, position: 'absolute', right: -40, top: 144, transform: [{ rotate: '-11deg' }] },
  mapAreaLabel: { backgroundColor: 'rgba(255,255,255,0.74)', borderRadius: 999, color: '#5e7d75', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', left: 22, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5, position: 'absolute', top: 116 },
  mapBottomSheet: { backgroundColor: 'rgba(255,253,249,0.98)', borderColor: 'rgba(234,223,210,0.9)', borderRadius: 28, borderWidth: 1, gap: 10, marginTop: -56, padding: 14, shadowColor: '#50371e', shadowOffset: { height: -10, width: 0 }, shadowOpacity: 0.12, shadowRadius: 24 },
  mapBottomSheetMake: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 82, gap: 10, left: 0, maxHeight: 360, overflow: 'hidden', paddingBottom: 18, paddingHorizontal: 14, paddingTop: 10, position: 'absolute', right: 0, shadowColor: '#000', shadowOffset: { height: -18, width: 0 }, shadowOpacity: 0.16, shadowRadius: 40 },
  mapChipFloat: { alignItems: 'center', backgroundColor: 'rgba(255,253,249,0.92)', borderColor: 'rgba(234,223,210,0.78)', borderRadius: 999, borderWidth: 1, height: 34, justifyContent: 'center', paddingHorizontal: 13 },
  mapChipFloatActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  mapChipText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  mapChipTextActive: { color: '#fff' },
  mapChipMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: palette.border, borderRadius: 16, borderWidth: 1, height: 34, justifyContent: 'center', paddingHorizontal: 14, shadowColor: '#000', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.12, shadowRadius: 18 },
  mapChipMakeActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  mapChipMakeText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  mapChipMakeTextActive: { color: '#fff', fontWeight: '600' },
  mapContent: { flex: 1, position: 'relative' },
  mapControlStack: { gap: 8, position: 'absolute', right: 16, top: 118 },
  mapCtrlButton: { alignItems: 'center', backgroundColor: 'rgba(255,253,249,0.94)', borderColor: 'rgba(234,223,210,0.86)', borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', shadowColor: '#50371e', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.1, shadowRadius: 10, width: 36 },
  mapCtrlButtonActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  mapEmptyCard: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 18, gap: 4, padding: 18 },
  mapFauxFull: { backgroundColor: '#eef2ec', height: 620, overflow: 'hidden', position: 'relative' },
  mapFauxFullNight: { backgroundColor: '#17222b' },
  mapFauxFullSatellite: { backgroundColor: '#2b3b32' },
  mapFauxFullStandard: { backgroundColor: '#edf1ec' },
  mapFilterFloat: { gap: 8, paddingHorizontal: 14 },
  mapFilterFloatMake: { gap: 8, paddingHorizontal: 16 },
  mapFilterScroller: { left: 0, position: 'absolute', right: 0, top: 74, zIndex: 2 },
  mapFilterScrollerMake: { left: 0, position: 'absolute', right: 0, top: 64, zIndex: 4 },
  mapGreenPatchA: { backgroundColor: '#cfe7d2', borderRadius: 36, height: 122, left: -26, opacity: 0.96, position: 'absolute', top: 34, transform: [{ rotate: '-18deg' }], width: 150 },
  mapGreenPatchB: { backgroundColor: '#dcefd8', borderRadius: 46, bottom: 44, height: 126, opacity: 0.96, position: 'absolute', right: -34, transform: [{ rotate: '16deg' }], width: 184 },
  mapGreenPatchNight: { backgroundColor: '#244238', opacity: 0.88 },
  mapGreenPatchSatellite: { backgroundColor: '#385f3d', opacity: 0.9 },
  mapHero: { backgroundColor: '#eef2ec', borderRadius: 26, height: 456, marginHorizontal: -6, overflow: 'hidden', position: 'relative' },
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
  mapSearchFloat: { alignItems: 'center', backgroundColor: 'rgba(255,253,249,0.96)', borderColor: 'rgba(234,223,210,0.86)', borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 9, left: 14, minHeight: 48, paddingLeft: 14, paddingRight: 6, position: 'absolute', right: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.1, shadowRadius: 18, top: 14, zIndex: 3 },
  mapSearchFloatMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(255,255,255,0.85)', borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 8, height: 48, left: 16, paddingLeft: 16, paddingRight: 10, position: 'absolute', right: 16, shadowColor: '#000', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.14, shadowRadius: 30, top: 6, zIndex: 5 },
  mapSearchInput: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, minHeight: 40 },
  mapSheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  mapStyleCurrent: { backgroundColor: palette.orangeSoft, borderRadius: 999, color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  mapStyleCloseButton: { alignItems: 'center', backgroundColor: palette.background, borderColor: palette.border, borderRadius: 999, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  mapStyleDismissLayer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 6 },
  mapStyleHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  mapStyleHeaderActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  mapStyleOption: { alignItems: 'center', backgroundColor: palette.background, borderColor: palette.border, borderRadius: 14, borderWidth: 1, flex: 1, minHeight: 34, justifyContent: 'center', paddingHorizontal: 8 },
  mapStyleOptionActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  mapStyleOptions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  mapStyleOptionText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  mapStyleOptionTextActive: { color: '#fff' },
  mapStylePanel: { backgroundColor: 'rgba(255,255,255,0.96)', borderColor: 'rgba(255,255,255,0.9)', borderRadius: 22, borderWidth: 1, left: 16, padding: 12, position: 'absolute', right: 16, shadowColor: '#000', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.14, shadowRadius: 30, top: 78, zIndex: 7 },
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
  makeDetailLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', lineHeight: 19, width: 84 },
  makeDetailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, minHeight: 44, paddingVertical: 10 },
  makeDetailRowInset: { paddingHorizontal: 16 },
  makeDetailValue: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '600', lineHeight: 20, minWidth: 0, textAlign: 'right' },
  makeDivider: { backgroundColor: palette.border, height: 1 },
  makeIntroCopy: { flex: 1, gap: 4, minWidth: 0 },
  makeIntroHeader: { alignItems: 'center', flexDirection: 'row', gap: 13, marginTop: 4, paddingHorizontal: 6 },
  makeIntroSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 19 },
  makeIntroTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 20, fontWeight: '700', lineHeight: 27 },
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
  makeStepTextMuted: { color: palette.muted, fontWeight: '700' },
  menuIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  menuRow: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 60, paddingHorizontal: 14 },
  menuTitle: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, fontWeight: '700' },
  conversationMakeRow: { alignItems: 'center', borderBottomColor: palette.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 12 },
  conversationMakeText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 18 },
  conversationMakeTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  conversationMetaCol: { alignItems: 'flex-end', gap: 7 },
  conversationSystemBubble: { alignSelf: 'center', backgroundColor: 'rgba(122,121,114,0.10)', borderRadius: 14, maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 7 },
  conversationSystemText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '600', lineHeight: 17, textAlign: 'center' },
  composerCardMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, gap: 8, padding: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 18 },
  dailyMoodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  dailyPostHero: { alignItems: 'center', backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.22)', borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 13, padding: 16 },
  greetingRequestCard: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 18 },
  messagesAvatarOverlap: { marginLeft: -10 },
  messagesAvatarStack: { flexDirection: 'row', width: 60 },
  messagesHeaderActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  messagesListMake: { marginTop: 14 },
  messagesMakeHeader: { alignItems: 'center', flexDirection: 'row', height: 50, justifyContent: 'space-between', paddingHorizontal: 20 },
  messagesMakePage: { paddingTop: 0 },
  messagesRequestMake: { alignItems: 'center', backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.22)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.1, shadowRadius: 22 },
  messagesRequestText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  messagesRequestTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700', lineHeight: 19 },
  messagesTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end' },
  metaText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  metricCard: { backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexGrow: 0, flexShrink: 0, minHeight: 94, minWidth: 0, paddingHorizontal: 13, paddingVertical: 10, shadowColor: '#50371e', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.06, shadowRadius: 20, width: '48%' },
  metricIcon: { alignItems: 'center', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  metricLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '500', minWidth: 0 },
  metricTag: { borderRadius: 10, flexShrink: 1, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '600', maxWidth: 76, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  metricTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, minWidth: 0 },
  metricValue: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600', lineHeight: 20, marginTop: 2, minWidth: 0 },
  mutedText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, lineHeight: 19 },
  notificationButton: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', position: 'relative', width: 44 },
  notificationCardMake: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  notificationCardUnreadMake: { backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.25)' },
  notificationDot: { backgroundColor: palette.danger, borderColor: '#fff', borderRadius: 5, borderWidth: 1, height: 10, position: 'absolute', right: 10, top: 10, width: 10 },
  notificationIconMake: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  notificationListMake: { gap: 12 },
  optionWrap: { gap: 8 },
  otpCursor: { backgroundColor: palette.orange, borderRadius: 1, height: 24, position: 'absolute', width: 2 },
  otpDigitBox: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 14, borderWidth: 1, height: 56, justifyContent: 'center', shadowColor: '#50371e', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.06, shadowRadius: 8, width: 46 },
  otpDigitBoxActive: { borderColor: palette.orange, shadowColor: palette.orange, shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.18, shadowRadius: 10 },
  otpDigitBoxError: { borderColor: palette.danger },
  otpDigitBoxFilled: { borderColor: palette.ink },
  otpDigitText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  otpDigitTextError: { color: palette.danger },
  otpGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, position: 'relative' },
  otpHiddenInput: { height: 1, left: 0, opacity: 0, position: 'absolute', top: 0, width: 1 },
  otpHeader: { paddingTop: 0 },
  otpHeaderRow: { height: 44 },
  otpHeaderSpacer: { height: 36, width: 36 },
  otpIconButton: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 0, height: 36, width: 36 },
  otpInlineError: { color: palette.danger, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', marginTop: 14 },
  otpInlineNotice: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', marginTop: 14 },
  otpContent: { flex: 1, paddingBottom: 0, paddingHorizontal: 22, paddingTop: 16, position: 'relative' },
  otpPage: { paddingHorizontal: 6, paddingTop: 0 },
  otpSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, lineHeight: 21, marginTop: 10 },
  otpSubtitleStrong: { color: palette.ink, fontWeight: '700' },
  otpTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 26, fontWeight: '600', letterSpacing: 0, lineHeight: 34 },
  otpVerifyingOverlay: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(255,253,249,0.96)', borderColor: palette.border, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, position: 'absolute', top: 110 },
  otpVerifyingText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  ownerCard: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  discoverCardsMake: { gap: 12, marginTop: 14 },
  discoverMakeHeader: { alignItems: 'center', flexDirection: 'row', height: 50, justifyContent: 'space-between' },
  filterChipMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8 },
  filterChipMakeActive: { backgroundColor: palette.orange, borderColor: palette.orange, color: '#fff' },
  filterChipsMake: { gap: 8, paddingRight: 20, paddingVertical: 2 },
  locationChipMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 9 },
  locationChipText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600' },
  locationPrivacyPill: { backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 9, color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  ownerBioMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 18, marginTop: 8 },
  ownerCardMake: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14, position: 'relative', shadowColor: '#50371e', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.08, shadowRadius: 30 },
  ownerDistanceMake: { backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 9, color: palette.teal, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  ownerInviteHero: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 16, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.08, shadowRadius: 24 },
  ownerMetaMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, marginTop: 2 },
  ownerPetNameMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700', letterSpacing: 0 },
  ownerTagMake: { backgroundColor: palette.orangeSoft, borderRadius: 10, color: palette.orange, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  ownerTagRowMake: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  pageSubtitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  pageTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 24, fontWeight: '700', lineHeight: 31 },
  permissionDeniedHero: { alignItems: 'center', backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.22)', borderRadius: 24, borderWidth: 1, gap: 8, marginTop: 22, padding: 18 },
  permissionDeniedIcon: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  permissionDeniedText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, lineHeight: 19, textAlign: 'center' },
  permissionDeniedTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700' },
  permissionMakeRow: { alignItems: 'flex-start', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 18 },
  permissionMakeRowDenied: { borderColor: 'rgba(216,70,53,0.26)' },
  permissionMakeRowGranted: { backgroundColor: '#f2fbfa', borderColor: 'rgba(77,182,172,0.32)' },
  permissionMakeStack: { gap: 12, marginTop: 26 },
  permissionStatusDenied: { color: palette.danger, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  permissionStatusLoading: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  permissionStatusOn: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 12, flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  permissionStatusOnText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700' },
  permissionSwitchOff: { alignItems: 'center', backgroundColor: '#e9e7e2', borderRadius: 12, height: 24, justifyContent: 'center', paddingHorizontal: 3, width: 42 },
  permissionSwitchThumb: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 9, height: 18, width: 18 },
  petInfoFormMake: { gap: 18, marginTop: 24, paddingHorizontal: 6 },
  petTypeCheck: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 10, height: 20, justifyContent: 'center', position: 'absolute', right: 11, top: 11, width: 20 },
  petTypeEmoji: { fontSize: 25, lineHeight: 31 },
  petTypeMakeButton: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 8, minHeight: 64, paddingHorizontal: 16, position: 'relative' },
  petTypeMakeButtonActive: { backgroundColor: 'rgba(255,138,92,0.10)', borderColor: palette.orange, borderWidth: 1.5 },
  petTypeMakeText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  petTypeMakeTextActive: { color: palette.orange, fontWeight: '700' },
  petAvatar: { backgroundColor: '#f6dfbf', overflow: 'hidden' },
  petGreeting: { color: palette.ink, fontFamily: appFontFamily, fontSize: 19, fontWeight: '700', lineHeight: 25 },
  petHero: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 28, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 18 },
  petHeroCopy: { flex: 1, gap: 8 },
  petDetailCamera: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 10, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 6, position: 'absolute', right: 16, top: 16 },
  petDetailCameraText: { color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  petDetailEdit: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, bottom: 14, flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingVertical: 7, position: 'absolute', right: 16 },
  petDetailEditText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  petDetailHeroMake: { alignItems: 'center', backgroundColor: '#f4b879', borderRadius: 22, height: 220, justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  petDetailHeroMeta: { color: 'rgba(255,255,255,0.9)', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', marginTop: 2 },
  petDetailHeroName: { color: '#fff', fontFamily: appFontFamily, fontSize: 24, fontWeight: '700', lineHeight: 31 },
  petDetailHeroText: { bottom: 14, left: 18, position: 'absolute' },
  petDetailMakePage: { gap: 14 },
  petDetailStatCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 12, borderWidth: 1, flex: 1, paddingHorizontal: 10, paddingVertical: 10 },
  petDetailStatLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700' },
  petDetailStatValue: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '700', marginTop: 4 },
  petDetailStats: { flexDirection: 'row', gap: 10 },
  petGenderButton: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 16, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  petGenderButtonActive: { backgroundColor: 'rgba(255,138,92,0.10)', borderColor: palette.orange, borderWidth: 1.5 },
  petGenderText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13.5, fontWeight: '700' },
  petGenderTextActive: { color: palette.orange },
  phoneDivider: { backgroundColor: '#eadfd2', height: 24, width: 1 },
  phoneFrame: { backgroundColor: palette.background, borderRadius: Platform.OS === 'web' ? 44 : 0, flex: 1, height: Platform.OS === 'web' ? 844 : undefined, maxHeight: Platform.OS === 'web' ? 844 : undefined, maxWidth: Platform.OS === 'web' ? 390 : undefined, overflow: 'hidden', shadowColor: '#50371e', shadowOffset: { height: 30, width: 0 }, shadowOpacity: 0.18, shadowRadius: 60, width: '100%' },
  phoneInput: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 15, minHeight: 58, paddingHorizontal: 12 },
  phoneInputShell: { alignItems: 'center', backgroundColor: '#fffdf9', borderColor: 'rgba(234,223,210,0.95)', borderRadius: 20, borderWidth: 1.2, flexDirection: 'row', minHeight: 58, paddingLeft: 16, paddingRight: 8 },
  phoneInputShellFocused: { borderColor: palette.orange, shadowColor: palette.orange, shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.24, shadowRadius: 12 },
  phoneStatusBar: { alignItems: 'center', backgroundColor: palette.background, flexDirection: 'row', height: 44, justifyContent: 'space-between', paddingBottom: 4, paddingHorizontal: 28, paddingTop: 12 },
  phoneStatusIcons: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  phoneStatusTime: { color: palette.ink, fontFamily: appFontFamily, fontSize: 15, fontWeight: '600' },
  permissionCard: { alignItems: 'flex-start', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 },
  permissionCardGranted: { backgroundColor: '#f2fbfa', borderColor: 'rgba(77,182,172,0.32)' },
  placeRankBadge: { alignItems: 'center', backgroundColor: palette.pale, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  placeRankBadgeActive: { backgroundColor: palette.orange },
  placeRankText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  placeRankTextActive: { color: '#fff' },
  placeRow: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  placeSheetMeta: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  placeSheetRow: { alignItems: 'center', borderColor: 'rgba(234,223,210,0.72)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 76, paddingHorizontal: 10, paddingVertical: 10 },
  placeSheetRowActive: { backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.32)' },
  placeSheetTag: { backgroundColor: palette.orangeSoft, borderRadius: 999, color: palette.orange, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  placeSheetTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  placeSheetTitle: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  placeAddressMake: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 9, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10 },
  placeAddressMeta: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, marginTop: 5 },
  placeAddressText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  placeBackButtonMake: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 19, height: 38, justifyContent: 'center', shadowColor: '#000', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.18, shadowRadius: 14, width: 38 },
  placeDetailPageMake: { marginHorizontal: -22, marginTop: -18 },
  placeDistanceMake: { color: palette.teal, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', marginLeft: 'auto' },
  placeHeroActions: { flexDirection: 'row', gap: 8, position: 'absolute', right: 16, top: 44 },
  placeHeroMake: { backgroundColor: '#9fc8a4', height: 280, overflow: 'hidden', position: 'relative' },
  placeHeroOverlay: { backgroundColor: 'rgba(31,33,29,0.18)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  placePhotoCount: { backgroundColor: 'rgba(31,33,29,0.65)', borderRadius: 11, bottom: 18, color: '#fff', fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', left: 16, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4, position: 'absolute' },
  placeRatingRowMake: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 7 },
  placeReviewPreviewMake: { alignItems: 'flex-start', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 16, paddingHorizontal: 14, paddingVertical: 12 },
  placeSectionLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11, fontWeight: '700', letterSpacing: 0, marginTop: 14 },
  placeSheetMake: { backgroundColor: palette.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -28, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 18 },
  placeTitleMake: { color: palette.ink, flexShrink: 1, fontFamily: appFontFamily, fontSize: 21, fontWeight: '700', letterSpacing: 0, lineHeight: 28 },
  placeTitleRowMake: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  placeVerifyMake: { backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 8, color: palette.teal, fontFamily: appFontFamily, fontSize: 10, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
  placeholderHeroMake: { alignItems: 'center', backgroundColor: '#e8f5f3', borderRadius: 18, flexDirection: 'row', gap: 12, padding: 16 },
  placeholderMake: { gap: 14 },
  previewPhoto: { backgroundColor: palette.pale, borderRadius: 24, height: 330, width: '100%' },
  recognitionBadgeText: { color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  recognitionHeroMake: { alignItems: 'center', backgroundColor: '#f4b879', borderRadius: 28, height: 280, justifyContent: 'center', marginTop: 2, overflow: 'hidden', position: 'relative' },
  recognitionQuality: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 5, position: 'absolute', right: 14, top: 14 },
  recognitionSuccessBadge: { alignItems: 'center', backgroundColor: 'rgba(77,182,172,0.95)', borderRadius: 14, flexDirection: 'row', gap: 5, left: 14, paddingHorizontal: 12, paddingVertical: 6, position: 'absolute', top: 14 },
  profileCard: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  profileCurrentWrap: { marginBottom: 18, marginTop: 16, paddingHorizontal: 16 },
  profileHeroContent: { alignItems: 'center', flexDirection: 'row', gap: 14, position: 'relative' },
  profileHeroMake: { backgroundColor: '#ffe3d1', borderRadius: 22, marginHorizontal: 16, marginTop: 16, overflow: 'hidden', padding: 18, position: 'relative' },
  profileHeroOrb: { backgroundColor: 'rgba(255,255,255,0.42)', borderRadius: 70, height: 140, position: 'absolute', right: -30, top: -20, width: 140 },
  profileMakeHeader: { alignItems: 'center', flexDirection: 'row', height: 50, justifyContent: 'space-between', paddingHorizontal: 20 },
  profileMakeMenuRowValue: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  profileMakePage: { paddingTop: 0 },
  profileMakeRow: { alignItems: 'center', borderBottomColor: palette.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 58, paddingHorizontal: 16, paddingVertical: 12 },
  profileMakeRowIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 12, height: 34, justifyContent: 'center', width: 34 },
  profileMakeRowStatic: { opacity: 0.92 },
  profileMakeRowTitle: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 20, minWidth: 0 },
  profileMakeRowValue: { color: palette.muted, flexShrink: 1, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600', lineHeight: 18, maxWidth: '42%', minWidth: 0, textAlign: 'right' },
  profileManageLink: { color: palette.teal, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  profileMenuGroup: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, marginHorizontal: 16, overflow: 'hidden' },
  profileOwnerAvatar: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#fff', borderRadius: 32, borderWidth: 3, height: 64, justifyContent: 'center', shadowColor: '#000', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.08, shadowRadius: 10, width: 64 },
  profileOwnerName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  profilePetBadge: { backgroundColor: '#e8f5f3', borderRadius: 6, color: palette.teal, fontFamily: appFontFamily, fontSize: 10, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 1 },
  profilePetCardMake: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 14 },
  profilePetEmptyIcon: { alignItems: 'center', backgroundColor: palette.orangeSoft, borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  profilePetMeta: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, lineHeight: 17, marginTop: 4 },
  profilePetName: { color: palette.ink, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700' },
  profilePetNameRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  profilePetTag: { backgroundColor: '#f4efe6', borderRadius: 6, color: palette.muted, fontFamily: appFontFamily, fontSize: 10, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2 },
  profilePetTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  profilePhoneRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 4 },
  profilePhoneText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12 },
  profileSectionLabel: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  profileSectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, paddingHorizontal: 4 },
  profileSettingsButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 12, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
  profileVerifyPill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, flexDirection: 'row', gap: 4, marginTop: 8, paddingHorizontal: 8, paddingVertical: 3 },
  profileVerifyText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 11, fontWeight: '600' },
  progressFill: { backgroundColor: palette.orange, borderRadius: 999, height: '100%' },
  progressTrack: { backgroundColor: palette.pale, borderRadius: 999, height: 10, overflow: 'hidden', width: '100%' },
  ratingPill: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  ratingText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  requestCard: { alignItems: 'center', backgroundColor: '#fff7ef', borderColor: 'rgba(255,138,92,0.24)', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 },
  requestActionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  requestStackMake: { gap: 12 },
  resendAction: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  resendActionDisabled: { color: '#b8b5ac' },
  resendRow: { alignItems: 'center', flexDirection: 'row', gap: 4, justifyContent: 'center', marginTop: 24 },
  resendText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
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
  settingsFootnoteMake: { alignItems: 'flex-start', backgroundColor: 'rgba(77,182,172,0.10)', borderColor: 'rgba(77,182,172,0.20)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  settingsGroupMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 16, borderWidth: 1, gap: 0, overflow: 'hidden', paddingTop: 8 },
  settingsGroupTitle: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 8 },
  segmentButton: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 16, borderWidth: 1, flex: 1, minHeight: 48, justifyContent: 'center' },
  segmentButtonActive: { backgroundColor: palette.orange, borderColor: palette.orange },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentText: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  sendButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  sheetHandle: { alignSelf: 'center', backgroundColor: 'rgba(31,33,29,0.22)', borderRadius: 999, height: 4, marginBottom: 2, width: 46 },
  smallIconButton: { alignItems: 'center', backgroundColor: palette.orange, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  stack: { gap: 12 },
  statusText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, fontWeight: '600' },
  successText: { color: palette.teal, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700' },
  switchOff: { backgroundColor: palette.pale, borderRadius: 12, height: 24, width: 40 },
  detailCardMake: { backgroundColor: palette.card, borderColor: palette.border, borderRadius: 20, borderWidth: 1, marginTop: 18, paddingHorizontal: 18, paddingVertical: 16, shadowColor: '#50371e', shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.06, shadowRadius: 18 },
  emptyPetCta: { marginTop: 18, width: '100%' },
  emptyPetGlow: { alignItems: 'center', backgroundColor: 'rgba(255,138,92,0.12)', borderRadius: 100, height: 200, justifyContent: 'center', marginBottom: 8, position: 'relative', width: 200 },
  emptyPetPlus: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.orange, borderRadius: 14, borderStyle: 'dashed', borderWidth: 2, bottom: 14, height: 28, justifyContent: 'center', position: 'absolute', right: 12, width: 28 },
  emptyPetStage: { alignItems: 'center', justifyContent: 'center', minHeight: 580, paddingHorizontal: 22 },
  failedAlertCircle: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 34, height: 68, justifyContent: 'center', position: 'absolute', width: 68 },
  failedBadgeMake: { backgroundColor: 'rgba(216,70,53,0.94)', borderRadius: 14, color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', left: 16, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 5, position: 'absolute', top: 16 },
  failedBlurOrb: { backgroundColor: '#8b7b64', borderRadius: 100, height: 200, opacity: 0.45, width: 200 },
  failedPhotoMake: { alignItems: 'center', backgroundColor: '#c8c0af', borderRadius: 28, height: 320, justifyContent: 'center', marginTop: 2, overflow: 'hidden', position: 'relative' },
  failedTipsIntro: { marginTop: 8 },
  featureChipCool: { backgroundColor: 'rgba(77,182,172,0.14)', borderRadius: 12, color: palette.teal, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 6 },
  featureChipWarm: { backgroundColor: palette.orangeSoft, borderRadius: 12, color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 6 },
  featureChipsMake: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 18 },
  scanCornerLb: { borderColor: palette.orange, borderLeftWidth: 3, borderRadius: 4, borderTopWidth: 3, bottom: 18, height: 22, left: 18, position: 'absolute', transform: [{ rotate: '270deg' }], width: 22 },
  scanCornerLt: { borderColor: palette.orange, borderLeftWidth: 3, borderRadius: 4, borderTopWidth: 3, height: 22, left: 18, position: 'absolute', top: 18, width: 22 },
  scanCornerRb: { borderColor: palette.orange, borderLeftWidth: 3, borderRadius: 4, borderTopWidth: 3, bottom: 18, height: 22, position: 'absolute', right: 18, transform: [{ rotate: '180deg' }], width: 22 },
  scanCornerRt: { borderColor: palette.orange, borderLeftWidth: 3, borderRadius: 4, borderTopWidth: 3, height: 22, position: 'absolute', right: 18, top: 18, transform: [{ rotate: '90deg' }], width: 22 },
  tabBar: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.86)', borderColor: 'rgba(255,255,255,0.9)', borderRadius: 28, borderWidth: 1, bottom: 18, flexDirection: 'row', justifyContent: 'space-between', left: 14, padding: 7, position: 'absolute', right: 14, shadowColor: '#50371e', shadowOffset: { height: 16, width: 0 }, shadowOpacity: 0.16, shadowRadius: 32 },
  tabItem: { alignItems: 'center', borderRadius: 18, flex: 1, gap: 3, minHeight: 44, justifyContent: 'center', paddingVertical: 5 },
  tabItemActive: { backgroundColor: 'rgba(255,138,92,0.10)' },
  tabText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 10.5, fontWeight: '500' },
  tabTextActive: { color: palette.orange, fontWeight: '600' },
  tag: { backgroundColor: palette.orangeSoft, borderRadius: 999, color: palette.orange, fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tealIcon: { backgroundColor: palette.teal },
  textAction: { alignItems: 'center', paddingVertical: 8 },
  textActionDisabled: { color: '#b8aca0' },
  textActionText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  unreadBadge: { backgroundColor: palette.orange, borderRadius: 999, color: '#fff', fontFamily: appFontFamily, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  uploadFrame: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: 28, borderStyle: 'dashed', borderWidth: 1.4, gap: 10, minHeight: 300, justifyContent: 'center', padding: 24, width: '100%' },
  uploadActionsMake: { flexDirection: 'row', gap: 12, marginTop: 18 },
  uploadBoxMake: { alignItems: 'center', backgroundColor: '#fff0df', borderRadius: 28, height: 340, justifyContent: 'center', marginTop: 22, overflow: 'hidden', position: 'relative' },
  uploadDashedFrame: { borderColor: 'rgba(255,138,92,0.55)', borderRadius: 28, borderStyle: 'dashed', borderWidth: 2, bottom: 14, left: 14, position: 'absolute', right: 14, top: 14 },
  uploadHintMake: { bottom: 18, color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '700', position: 'absolute', textAlign: 'center' },
  tipsCardMake: { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: palette.border, borderRadius: 18, borderWidth: 1, gap: 8, marginTop: 14, padding: 14 },
  tipBulletDot: { backgroundColor: palette.orange, borderRadius: 3, height: 6, width: 6 },
  tipBulletRow: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingVertical: 4 },
  tipBulletText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  tipMakeRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  tipMakeText: { color: palette.ink, flex: 1, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  voiceLink: { color: palette.orange, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  voiceRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  voiceText: { color: palette.muted, fontFamily: appFontFamily, fontSize: 13, fontWeight: '700' },
  timelineDateMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  timelineDotCool: { backgroundColor: palette.teal },
  timelineDotMake: { backgroundColor: palette.orange, borderRadius: 3, height: 6, width: 6 },
  timelineRowMake: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 11 },
  timelineSubMake: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12, lineHeight: 18, marginTop: 2 },
  timelineTitleMake: { color: palette.ink, fontFamily: appFontFamily, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  vaccineDuePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 10, color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 3 },
  vaccineHeroIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  vaccineHeroMake: { alignItems: 'center', backgroundColor: '#ffd2a8', borderRadius: 22, flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 16, shadowColor: '#8b5e3c', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.14, shadowRadius: 30 },
  vaccineHeroMeta: { color: palette.muted, fontFamily: appFontFamily, fontSize: 12.5, fontWeight: '600' },
  vaccineHeroTitle: { color: palette.ink, fontFamily: appFontFamily, fontSize: 20, fontWeight: '700', letterSpacing: 0, lineHeight: 27, marginTop: 10 },
  walkFieldWrap: { gap: 12, paddingBottom: 14, paddingHorizontal: 14 },
  walkInviteInline: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: palette.orangeSoft, borderRadius: 12, flexDirection: 'row', gap: 5, marginTop: 10, paddingHorizontal: 10, paddingVertical: 6 },
  walkInviteInlineText: { color: palette.orange, fontFamily: appFontFamily, fontSize: 11.5, fontWeight: '700' },
  weightHeroMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 22, borderWidth: 1, paddingHorizontal: 22, paddingVertical: 20, shadowColor: '#50371e', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.08, shadowRadius: 30 },
  weightInputMake: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 20, borderWidth: 1, gap: 12, marginTop: 14, padding: 16 },
  apiModeMake: { borderBottomColor: palette.border, borderBottomWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
});
