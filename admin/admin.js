const state = {
  admin: null,
  aiFeedbackQ: '',
  aiFeedbackReason: 'all',
  aiFeedbackStatus: 'all',
  aiMediaQ: '',
  aiMediaQuality: 'all',
  aiSampleQ: '',
  aiSampleStatus: 'open',
  aiSampleType: 'all',
  aiPromptQ: '',
  aiPromptStatus: 'all',
  auditAction: 'all',
  auditAdmin: 'all',
  auditFrom: '',
  auditQ: '',
  auditTargetType: 'all',
  auditTo: '',
  appealQ: '',
  appealStatus: 'open',
  appealType: 'all',
  analyticsDays: '14',
  analyticsEventName: 'all',
  analyticsPlatform: 'all',
  analyticsQ: '',
  analyticsRoute: 'all',
  analyticsSource: 'all',
  cache: {},
  exportFrom: '',
  exportPhone: '',
  exportQ: '',
  exportApprovalStatus: 'open',
  exportReason: '',
  exportStatus: 'all',
  exportTo: '',
  exportType: 'all',
  feedbackCategory: 'all',
  feedbackQ: '',
  feedbackStatus: 'open',
  mediaModerationQ: '',
  mediaModerationStatus: 'pending_review',
  moderationQ: '',
  moderationStatus: 'pending',
  petAvatar: 'all',
  petBirthday: 'all',
  petCalendarFrom: '',
  petCalendarQ: '',
  petCalendarRecordState: 'active',
  petCalendarSource: 'all',
  petCalendarStatus: 'all',
  petCalendarTo: '',
  petCalendarType: 'all',
  petChatDetails: {},
  petChatFlag: 'all',
  petChatQ: '',
  petQ: '',
  petSpecies: 'all',
  reportMessageContexts: {},
  socialEvidenceDetail: null,
  socialRelationContexts: {},
  socialRelationKind: 'all',
  socialRelationQ: '',
  socialRelationStatus: 'all',
  route: 'dashboard',
  ticketPriority: 'all',
  ticketQ: '',
  ticketStatus: 'open',
  token: localStorage.getItem('lumii-admin-token') || '',
  userTimeline: null,
  userTimelineKind: 'all',
};

const navItems = [
  { key: 'dashboard', label: '工作台' },
  { key: 'analytics', label: '数据看板' },
  { key: 'users', label: '用户管理' },
  { key: 'pets', label: '宠物档案' },
  { key: 'petCalendar', label: '宠物日历' },
  { key: 'avatarJobs', label: 'AI 灵伴' },
  { key: 'petChat', label: 'AI 对话' },
  { key: 'moderation', label: '内容安全' },
  { key: 'socialPosts', label: '宠友圈' },
  { key: 'socialRelations', label: '关系消息' },
  { key: 'reports', label: '举报中心' },
  { key: 'places', label: '地图地点' },
  { key: 'feedback', label: '反馈收集' },
  { key: 'tickets', label: '工单中心' },
  { key: 'notifications', label: '通知运营' },
  { key: 'config', label: '配置中心' },
  { key: 'systemHealth', label: '系统健康' },
  { key: 'launchReadiness', label: '上线台账' },
  { key: 'adminAccounts', label: '账号权限' },
  { key: 'audit', label: '审计日志' },
  { key: 'sanctions', label: '用户处罚' },
  { key: 'sanctionAppeals', label: '申诉中心' },
  { key: 'exports', label: '数据导出' },
];

const titles = {
  analytics: ['数据看板', '增长、AI、社交和安全趋势'],
  adminAccounts: ['账号权限', '当前管理员、权限边界和安全预留'],
  audit: ['系统审计', '后台所有写操作都会沉淀为审计记录'],
  avatarJobs: ['AI 灵伴', '生成任务、上传素材、用户反馈和额度处理'],
  config: ['配置中心', '这些配置会被移动端 /app/config 读取'],
  dashboard: ['总览', '运营工作台'],
  exports: ['数据导出', '可审计的运营 CSV 下载'],
  feedback: ['反馈收集', 'App 原始反馈、自动工单和客服处理入口'],
  launchReadiness: ['上线台账', '生产前缺口、待澄清问题和移动端联动复核'],
  moderation: ['内容安全', '举报、动态、评论和地点审核任务池'],
  notifications: ['通知运营', '系统通知、定向触达和移动端通知中心联动'],
  petCalendar: ['宠物日历', '体重、疫苗/驱虫、备忘和自动写入排查'],
  petChat: ['AI 对话', '宠物第一人称回复、医疗风险和自动写入排查'],
  pets: ['宠物档案', '宠物资料、头像、AI 形象和关联记录排查'],
  places: ['地图地点', '地点点评与新增地点审核'],
  reports: ['举报中心', '宠友圈举报处理闭环'],
  sanctionAppeals: ['申诉中心', '账号处罚申诉、举报处理申诉和复核通知'],
  sanctions: ['用户处罚', '禁言、冻结、封禁与撤销记录'],
  socialRelations: ['关系消息', '招呼、约遛、会话和通知链路排查'],
  socialPosts: ['宠友圈', '动态与评论内容安全'],
  systemHealth: ['系统健康', '服务、配置、存储和运营积压体检'],
  tickets: ['工单中心', '用户反馈、客服备注和回复闭环'],
  users: ['用户管理', '账号、宠物、设置和风险排查'],
};

const userRiskTagOptions = [
  { key: 'test_account', label: '测试账号' },
  { key: 'key_user', label: '重点用户' },
  { key: 'needs_followup', label: '需要回访' },
  { key: 'complaint', label: '投诉处理中' },
  { key: 'watch', label: '违规观察' },
  { key: 'suspected_harassment', label: '疑似骚扰' },
  { key: 'suspected_abuse', label: '疑似违规' },
  { key: 'frequently_blocked', label: '被频繁拉黑' },
  { key: 'ai_sample', label: 'AI 异常样本' },
];
const userRiskTagLabelMap = Object.fromEntries(userRiskTagOptions.map((item) => [item.key, item.label]));
const userRiskTagKeyMap = Object.fromEntries(userRiskTagOptions.flatMap((item) => [[item.key, item.key], [item.label, item.key]]));
const CONFIG_HIGH_RISK_CONFIRM_TEXT = '确认发布高风险配置';

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTime(value) {
  if (!value) return '-';
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function numberText(value, digits = 0) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function percentText(value) {
  const number = Number(value || 0);
  return `${Number.isInteger(number) ? number : number.toFixed(1)}%`;
}

function secondsText(value) {
  const number = Number(value || 0);
  if (!number) return '-';
  return number >= 60 ? `${Math.round(number / 60)} 分钟` : `${Math.round(number)} 秒`;
}

function durationMsText(value) {
  const number = Number(value || 0);
  if (!number) return '-';
  if (number < 1000) return `${Math.round(number)} ms`;
  return secondsText(number / 1000);
}

function durationText(value) {
  const seconds = Number(value || 0);
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days} 天 ${hours} 小时`;
  if (hours) return `${hours} 小时 ${minutes} 分钟`;
  return `${Math.max(1, minutes)} 分钟`;
}

function bytesText(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 B';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function moneyText(value) {
  const number = Number(value || 0);
  if (!number) return '$0';
  return `$${number.toFixed(number < 1 ? 4 : 2)}`;
}

function centsMoneyText(value, currency = 'CNY') {
  const number = Number(value || 0) / 100;
  const prefix = currency === 'CNY' ? '¥' : `${currency} `;
  return `${prefix}${number.toLocaleString('zh-CN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function shortPhone(value) {
  const text = String(value || '');
  return text.length === 11 ? `${text.slice(0, 3)}****${text.slice(7)}` : text || '-';
}

function statusPill(status) {
  const value = String(status || '-');
  const tone = /ready|approved|active|published|valid|closed|success|done|稳定|已通过|通过|已处理|已配置|已启用/.test(value)
    ? 'ok'
    : /failed|rejected|deleted|hidden|invalid|bad|ban|banned|freeze|frozen|muted|禁言|冻结|封禁|已隐藏|已驳回|驳回/.test(value)
      ? 'bad'
      : 'warn';
  return `<span class="pill ${tone}">${escapeHtml(value)}</span>`;
}

function option(value, label, selected) {
  return `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function help(text) {
  return `<span class="help" data-tip="${escapeHtml(text)}">?</span>`;
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('visible'), 2200);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.state === 'error') {
    const message = payload?.error?.message || `请求失败（${response.status}）`;
    const error = new Error(message);
    error.code = payload?.error?.code || '';
    error.data = payload?.data || null;
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

function setChrome() {
  const [title, eyebrow] = titles[state.route] || titles.dashboard;
  $('pageTitle').textContent = title;
  $('pageEyebrow').textContent = eyebrow;
  $('nav').innerHTML = navItems.map((item) => `
    <button class="${state.route === item.key ? 'active' : ''}" data-route="${item.key}">
      <span>${item.label}</span>
      ${item.reserved ? '<span class="reserved">预留</span>' : ''}
    </button>
  `).join('');
}

function setLoggedIn(loggedIn) {
  $('loginPanel').classList.toggle('visible', !loggedIn);
  $('content').style.display = loggedIn ? 'grid' : 'none';
  document.querySelector('.top-actions').style.display = loggedIn ? 'flex' : 'none';
}

async function login() {
  $('loginError').textContent = '';
  try {
    const data = await api('/admin/auth/login', {
      body: JSON.stringify({
        password: $('passwordInput').value,
        username: $('usernameInput').value,
      }),
      method: 'POST',
    });
    state.token = data.token;
    state.admin = data.admin;
    localStorage.setItem('lumii-admin-token', state.token);
    setLoggedIn(true);
    await render();
    showToast('已进入运营后台');
  } catch (error) {
    const lockText = error.data?.lockedUntil ? `（锁定到 ${formatTime(error.data.lockedUntil)}）` : '';
    $('loginError').textContent = `${error.message || '登录失败'}${lockText}`;
  }
}

function logout() {
  state.token = '';
  state.admin = null;
  localStorage.removeItem('lumii-admin-token');
  setLoggedIn(false);
}

async function bootstrap() {
  bindEvents();
  setChrome();
  if (!state.token) {
    setLoggedIn(false);
    return;
  }
  try {
    state.admin = await api('/admin/me');
    setLoggedIn(true);
    await render();
  } catch {
    logout();
  }
}

function bindEvents() {
  $('loginBtn').addEventListener('click', login);
  $('passwordInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
  $('logoutBtn').addEventListener('click', logout);
  $('refreshBtn').addEventListener('click', () => render(true));
  $('nav').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-route]');
    if (!button) return;
    state.route = button.dataset.route;
    setChrome();
    render();
  });
  $('content').addEventListener('click', onContentClick);
}

async function onContentClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  const phone = button.dataset.phone || '';
  const reason = button.dataset.reason || '运营后台处理';
  try {
    if (action === 'analytics-filter') {
      state.analyticsDays = $('analyticsDays').value;
      state.analyticsEventName = $('analyticsEventName').value;
      state.analyticsPlatform = $('analyticsPlatform').value;
      state.analyticsRoute = $('analyticsRoute').value;
      state.analyticsSource = $('analyticsSource').value;
      state.analyticsQ = $('analyticsQ').value.trim();
      clearCachePrefix('analytics');
      await render(true);
      return;
    }
    if (action === 'analytics-clear') {
      state.analyticsDays = '14';
      state.analyticsEventName = 'all';
      state.analyticsPlatform = 'all';
      state.analyticsRoute = 'all';
      state.analyticsSource = 'all';
      state.analyticsQ = '';
      clearCachePrefix('analytics');
      await render(true);
      return;
    }
    if (action === 'launch-question-update') {
      await updateLaunchReadinessQuestion(button);
      return;
    }
    if (action === 'launch-question-reset') {
      await resetLaunchReadinessQuestion(button);
      return;
    }
    if (action === 'admin-account-create') {
      await handleAdminAccountCreate();
      return;
    }
    if (action === 'admin-account-disable') {
      await handleAdminAccountStatus(button, 'disable');
      return;
    }
    if (action === 'admin-account-enable') {
      await handleAdminAccountStatus(button, 'enable');
      return;
    }
    if (action === 'admin-account-reset-password') {
      await handleAdminAccountPasswordReset(button);
      return;
    }
    if (action === 'moderation-filter') {
      state.moderationStatus = $('moderationStatus').value;
      state.moderationQ = $('moderationQ').value.trim();
      state.cache = { ...state.cache, moderation: null };
      await render(true);
      return;
    }
    if (action === 'moderation-clear') {
      state.moderationStatus = 'pending';
      state.moderationQ = '';
      state.cache = { ...state.cache, moderation: null };
      await render(true);
      return;
    }
    if (action === 'media-moderation-filter') {
      state.mediaModerationStatus = $('mediaModerationStatus').value;
      state.mediaModerationQ = $('mediaModerationQ').value.trim();
      state.cache = { ...state.cache, mediaModeration: null };
      await render(true);
      return;
    }
    if (action === 'media-moderation-clear') {
      state.mediaModerationStatus = 'pending_review';
      state.mediaModerationQ = '';
      state.cache = { ...state.cache, mediaModeration: null };
      await render(true);
      return;
    }
    if (action === 'media-moderate') {
      await moderateMediaUpload(button);
      return;
    }
    if (action === 'moderation-task-action') {
      const handled = await handleModerationTaskAction(button);
      if (!handled) return;
    }
    if (action === 'moderation-task-assign') {
      const handled = await assignModerationTask(button);
      if (!handled) return;
    }
    if (action === 'moderation-batch') {
      const handled = await handleModerationBatch();
      if (!handled) return;
    }
    if (action === 'moderation-sample-review') {
      const handled = await reviewModerationSample(button);
      if (!handled) return;
      return;
    }
    if (action === 'pet-chat-filter') {
      state.petChatFlag = $('petChatFlag').value;
      state.petChatQ = $('petChatQ').value.trim();
      state.cache = { ...state.cache, petChat: null };
      await render(true);
      return;
    }
    if (action === 'pet-chat-clear') {
      state.petChatFlag = 'all';
      state.petChatQ = '';
      state.cache = { ...state.cache, petChat: null };
      await render(true);
      return;
    }
    if (action === 'pet-chat-view') {
      await viewPetChatDetail(id);
      return;
    }
    if (action === 'pet-chat-tag') {
      await tagPetChatMessage(button);
      return;
    }
    if (action === 'pet-chat-review') {
      await reviewPetChatMessage(button);
      return;
    }
    if (action === 'pet-chat-hide') {
      await hidePetChatMessage(button);
      return;
    }
    if (action === 'pets-filter') {
      state.petSpecies = $('petSpecies').value;
      state.petBirthday = $('petBirthday').value;
      state.petAvatar = $('petAvatar').value;
      state.petQ = $('petQ').value.trim();
      state.cache = { ...state.cache, pets: null };
      await render(true);
      return;
    }
    if (action === 'pets-clear') {
      state.petSpecies = 'all';
      state.petBirthday = 'all';
      state.petAvatar = 'all';
      state.petQ = '';
      state.cache = { ...state.cache, pets: null };
      await render(true);
      return;
    }
    if (action === 'pet-media-clear') {
      await clearPetMedia(button);
      return;
    }
    if (action === 'pet-media-replace') {
      await replacePetMedia(button);
      return;
    }
    if (action === 'pet-profile-edit') {
      await editPetProfile(button);
      return;
    }
    if (action === 'pet-profile-merge') {
      await mergePetProfile(button);
      return;
    }
    if (action === 'pet-calendar-filter') {
      state.petCalendarType = $('petCalendarType').value;
      state.petCalendarStatus = $('petCalendarStatus').value;
      state.petCalendarSource = $('petCalendarSource').value;
      state.petCalendarRecordState = $('petCalendarRecordState').value;
      state.petCalendarFrom = $('petCalendarFrom').value;
      state.petCalendarTo = $('petCalendarTo').value;
      state.petCalendarQ = $('petCalendarQ').value.trim();
      state.cache = { ...state.cache, petCalendar: null };
      await render(true);
      return;
    }
    if (action === 'pet-calendar-clear') {
      state.petCalendarType = 'all';
      state.petCalendarStatus = 'all';
      state.petCalendarSource = 'all';
      state.petCalendarRecordState = 'active';
      state.petCalendarFrom = '';
      state.petCalendarTo = '';
      state.petCalendarQ = '';
      state.cache = { ...state.cache, petCalendar: null };
      await render(true);
      return;
    }
    if (action === 'pet-calendar-edit') {
      await editPetCalendarRecord(button);
      return;
    }
    if (action === 'pet-calendar-create') {
      await createPetCalendarRecord();
      return;
    }
    if (action === 'pet-calendar-delete') {
      await deletePetCalendarRecord(button);
      return;
    }
    if (action === 'pet-calendar-restore') {
      await restorePetCalendarRecord(button);
      return;
    }
    if (action === 'pet-calendar-batch') {
      await batchPetCalendarRecords();
      return;
    }
    if (action === 'social-relations-filter') {
      state.socialRelationKind = $('socialRelationKind').value;
      state.socialRelationStatus = $('socialRelationStatus').value;
      state.socialRelationQ = $('socialRelationQ').value.trim();
      state.cache = { ...state.cache, socialRelations: null };
      state.socialRelationContexts = {};
      await render(true);
      return;
    }
    if (action === 'social-relations-clear') {
      state.socialRelationKind = 'all';
      state.socialRelationStatus = 'all';
      state.socialRelationQ = '';
      state.cache = { ...state.cache, socialRelations: null };
      state.socialRelationContexts = {};
      await render(true);
      return;
    }
    if (action === 'social-relation-context') {
      await loadSocialRelationContext(button);
      return;
    }
    if (action === 'social-relation-message-hide') {
      await hideSocialRelationMessage(button);
      return;
    }
    if (action === 'social-relation-repair') {
      await repairSocialRelation(button);
      return;
    }
    if (action === 'feedback-filter') {
      state.feedbackStatus = $('feedbackStatus').value;
      state.feedbackCategory = $('feedbackCategory').value;
      state.feedbackQ = $('feedbackQ').value.trim();
      state.cache = { ...state.cache, feedback: null };
      await render(true);
      return;
    }
    if (action === 'feedback-clear') {
      state.feedbackStatus = 'open';
      state.feedbackCategory = 'all';
      state.feedbackQ = '';
      state.cache = { ...state.cache, feedback: null };
      await render(true);
      return;
    }
    if (action === 'feedback-status') {
      await updateFeedbackStatus(button);
      return;
    }
    if (action === 'audit-filter') {
      state.auditAction = $('auditAction').value;
      state.auditAdmin = $('auditAdmin').value;
      state.auditTargetType = $('auditTargetType').value;
      state.auditFrom = $('auditFrom').value;
      state.auditTo = $('auditTo').value;
      state.auditQ = $('auditQ').value.trim();
      state.cache = { ...state.cache, audit: null };
      await render(true);
      return;
    }
    if (action === 'audit-clear') {
      state.auditAction = 'all';
      state.auditAdmin = 'all';
      state.auditTargetType = 'all';
      state.auditFrom = '';
      state.auditTo = '';
      state.auditQ = '';
      state.cache = { ...state.cache, audit: null };
      await render(true);
      return;
    }
    if (action === 'ticket-filter') {
      state.ticketStatus = $('ticketStatus').value;
      state.ticketPriority = $('ticketPriority').value;
      state.ticketQ = $('ticketQ').value.trim();
      state.cache = { ...state.cache, tickets: null };
      await render(true);
      return;
    }
    if (action === 'ticket-clear') {
      state.ticketStatus = 'open';
      state.ticketPriority = 'all';
      state.ticketQ = '';
      state.cache = { ...state.cache, tickets: null };
      await render(true);
      return;
    }
    if (action === 'ticket-batch') {
      const handled = await handleTicketBatch();
      if (!handled) return;
    }
    if (action === 'ticket-batch-reply') {
      const handled = await submitTicketBatchReply();
      if (!handled) return;
    }
    if (action === 'ticket-batch-reply-approve') {
      await approveTicketBatchReply(id);
      return;
    }
    if (action === 'ticket-batch-reply-cancel') {
      await cancelTicketBatchReply(id);
      return;
    }
    if (action === 'ticket-quality-review') {
      await reviewTicketQuality(button);
      return;
    }
    if (action === 'ticket-assign') await assignTicket(id);
    if (action === 'ticket-related-save') await saveTicketRelatedObjects(id);
    if (action === 'ticket-status') await saveTicketStatus(id);
    if (action === 'ticket-note') await addTicketNote(id);
    if (action === 'ticket-reply') await replyTicket(id);
    if (action === 'ticket-reply-template-use') {
      fillTicketReplyTemplate(button);
      showToast('已套用回复模板');
      return;
    }
    if (action === 'ticket-reply-template-save') await saveTicketReplyTemplate();
    if (action === 'ticket-reply-template-delete') await confirmPost(`/admin/tickets/reply-templates/${encodeURIComponent(id)}/delete`, { reason: '删除客服回复模板' }, '确认删除这个客服回复模板？');
    if (action === 'appeal-filter') {
      state.appealStatus = $('appealStatus').value;
      state.appealType = $('appealType').value;
      state.appealQ = $('appealQ').value.trim();
      state.cache = { ...state.cache, sanctionAppeals: null };
      await render(true);
      return;
    }
    if (action === 'appeal-clear') {
      state.appealStatus = 'open';
      state.appealType = 'all';
      state.appealQ = '';
      state.cache = { ...state.cache, sanctionAppeals: null };
      await render(true);
      return;
    }
    if (action === 'appeal-review' || action === 'appeal-approve' || action === 'appeal-reject') await handleSanctionAppealAction(button);
    if (action === 'notification-template-use' || action === 'notification-campaign-use' || action === 'notification-audience-use') {
      fillNotificationFormFromDataset(button);
      showToast('已套用到发送表单');
      return;
    }
    if (action === 'notification-template-save') await saveNotificationTemplate();
    if (action === 'notification-template-delete') await confirmPost(`/admin/notifications/templates/${encodeURIComponent(id)}/delete`, { reason: '删除通知模板' }, '确认删除这个通知模板？');
    if (action === 'notification-audience-save') await saveNotificationAudiencePackage();
    if (action === 'notification-audience-delete') await confirmPost(`/admin/notifications/audience-packages/${encodeURIComponent(id)}/delete`, { reason: '删除通知人群包' }, '确认删除这个通知人群包？');
    if (action === 'notification-approve') await approveNotificationCampaign(id);
    if (action === 'notification-cancel') await cancelNotificationCampaign(id, button.dataset.status);
    if (action === 'send-notification') await sendSystemNotification('send');
    if (action === 'submit-notification-approval') await sendSystemNotification('approval');
    if (action === 'submit-notification-schedule-approval') await sendSystemNotification('approval_scheduled');
    if (action === 'save-notification-draft') await sendSystemNotification('draft');
    if (action === 'schedule-notification') await sendSystemNotification('scheduled');
    if (action === 'save-config') {
      await saveConfig('publish');
      return;
    }
    if (action === 'schedule-config') {
      await saveConfig('schedule');
      return;
    }
    if (action === 'submit-config-approval') {
      await saveConfig('approval');
      return;
    }
    if (action === 'save-config-draft') {
      await saveConfig('draft');
      return;
    }
    if (action === 'config-draft-publish') {
      await publishConfigDraft(id);
      return;
    }
    if (action === 'config-draft-schedule') {
      await scheduleConfigDraft(id);
      return;
    }
    if (action === 'config-draft-approval') {
      await requestConfigApprovalForDraft(id);
      return;
    }
    if (action === 'config-draft-discard') {
      await discardConfigDraft(id);
      return;
    }
    if (action === 'config-rollback') {
      await rollbackConfigRevision(id);
      return;
    }
    if (action === 'config-rollback-schedule') {
      await scheduleConfigRollback(id);
      return;
    }
    if (action === 'config-rollback-approval') {
      await requestConfigApprovalForRollback(id);
      return;
    }
    if (action === 'config-approval-approve') {
      await approveConfigApproval(id);
      return;
    }
    if (action === 'config-approval-cancel') {
      await cancelConfigApproval(id);
      return;
    }
    if (action === 'config-schedule-cancel') {
      await cancelConfigSchedule(id);
      return;
    }
    if (action === 'export-filter') {
      state.exportType = $('exportType').value;
      state.exportStatus = $('exportStatus').value;
      state.exportPhone = $('exportPhone').value.trim();
      state.exportFrom = $('exportFrom').value;
      state.exportTo = $('exportTo').value;
      state.exportQ = $('exportQ').value.trim();
      state.exportReason = $('exportReason').value.trim();
      state.cache = { ...state.cache, exports: null };
      await render(true);
      return;
    }
    if (action === 'export-approval-filter') {
      state.exportApprovalStatus = $('exportApprovalStatus').value;
      state.cache = { ...state.cache, exports: null };
      await render(true);
      return;
    }
    if (action === 'export-clear') {
      state.exportType = 'all';
      state.exportStatus = 'all';
      state.exportPhone = '';
      state.exportFrom = '';
      state.exportTo = '';
      state.exportQ = '';
      state.exportApprovalStatus = 'open';
      state.exportReason = '';
      state.cache = { ...state.cache, exports: null };
      await render(true);
      return;
    }
    if (action === 'request-export-approval') {
      await requestExportApproval(id);
      return;
    }
    if (action === 'approve-export-approval') {
      await approveExportApproval(id);
      return;
    }
    if (action === 'cancel-export-approval') {
      await cancelExportApproval(id);
      return;
    }
    if (action === 'download-approved-export') {
      state.exportReason = button.dataset.exportReason || state.exportReason;
      try {
        const filters = JSON.parse(button.dataset.filters || '{}');
        state.exportStatus = filters.status || 'all';
        state.exportPhone = filters.phone || '';
        state.exportFrom = filters.from || '';
        state.exportTo = filters.to || '';
        state.exportQ = filters.q || '';
      } catch {
        // Keep current filters if legacy approval rows do not expose filter data.
      }
      await downloadExport(button.dataset.exportType, id);
      return;
    }
    if (action === 'download-export') {
      await downloadExport(id);
      return;
    }
    if (action === 'sanction-template-apply') {
      applySanctionTemplate();
      return;
    }
    if (action === 'sanction-create') await createSanction();
    if (action === 'sanction-approval-approve') await approveSanctionApproval(id);
    if (action === 'sanction-approval-cancel') await cancelSanctionApproval(id);
    if (action === 'sanction-revoke') await confirmPost(`/admin/users/${encodeURIComponent(phone)}/sanctions/${encodeURIComponent(id)}/revoke`, { reason }, '确认撤销这条处罚？');
    if (action === 'quick-mute') await post(`/admin/users/${encodeURIComponent(phone)}/sanctions`, { durationHours: 24, reason: '用户列表快捷禁言', type: 'mute' });
    if (action === 'quick-freeze') await post(`/admin/users/${encodeURIComponent(phone)}/sanctions`, { durationHours: 72, reason: '用户列表快捷冻结', type: 'freeze' });
    if (action === 'user-note-add') {
      await addUserAdminNote(phone);
      return;
    }
    if (action === 'user-risk-tags') {
      await editUserRiskTags(button);
      return;
    }
    if (action === 'clear-user-business-data') {
      await clearUserBusinessData(phone);
      return;
    }
    if (action === 'data-clear-approval-approve') {
      await approveDataClearApproval(id);
      return;
    }
    if (action === 'data-clear-approval-cancel') {
      await cancelDataClearApproval(id);
      return;
    }
    if (action === 'user-timeline-load') {
      await loadUserTimeline(phone);
      return;
    }
    if (action === 'user-timeline-close') {
      state.userTimeline = null;
      await render();
      return;
    }
    if (action === 'user-timeline-filter') {
      state.userTimelineKind = $('userTimelineKind')?.value || 'all';
      await loadUserTimeline(phone || state.userTimeline?.user?.phone || '');
      return;
    }
    if (action === 'avatar-feedback-filter') {
      state.aiFeedbackStatus = $('aiFeedbackStatus').value;
      state.aiFeedbackReason = $('aiFeedbackReason').value;
      state.aiFeedbackQ = $('aiFeedbackQ').value.trim();
      state.cache = { ...state.cache, avatarFeedback: null };
      await render(true);
      return;
    }
    if (action === 'avatar-feedback-clear') {
      state.aiFeedbackStatus = 'all';
      state.aiFeedbackReason = 'all';
      state.aiFeedbackQ = '';
      state.cache = { ...state.cache, avatarFeedback: null };
      await render(true);
      return;
    }
    if (action === 'avatar-sample-filter') {
      state.aiSampleStatus = $('aiSampleStatus').value;
      state.aiSampleType = $('aiSampleType').value;
      state.aiSampleQ = $('aiSampleQ').value.trim();
      state.cache = { ...state.cache, avatarSamples: null };
      await render(true);
      return;
    }
    if (action === 'avatar-sample-clear') {
      state.aiSampleStatus = 'open';
      state.aiSampleType = 'all';
      state.aiSampleQ = '';
      state.cache = { ...state.cache, avatarSamples: null };
      await render(true);
      return;
    }
    if (action === 'avatar-sample-add') {
      await addAvatarSample(button);
      return;
    }
    if (action === 'avatar-sample-review') {
      await reviewAvatarSample(button);
      return;
    }
    if (action === 'ai-prompt-filter') {
      state.aiPromptStatus = $('aiPromptStatus')?.value || 'all';
      state.aiPromptQ = $('aiPromptQ')?.value.trim() || '';
      state.cache.aiPromptVersions = null;
      await render(true);
      return;
    }
    if (action === 'ai-prompt-clear') {
      state.aiPromptStatus = 'all';
      state.aiPromptQ = '';
      state.cache.aiPromptVersions = null;
      await render(true);
      return;
    }
    if (action === 'ai-prompt-save-current') {
      await saveAiPromptVersion('current_config');
      return;
    }
    if (action === 'ai-prompt-save-candidate') {
      await saveAiPromptVersion('manual');
      return;
    }
    if (action === 'ai-prompt-draft') {
      await draftAiPromptVersion(id);
      return;
    }
    if (action === 'ai-prompt-archive') {
      await archiveAiPromptVersion(id);
      return;
    }
    if (action === 'ai-media-filter') {
      state.aiMediaQuality = $('aiMediaQuality').value;
      state.aiMediaQ = $('aiMediaQ').value.trim();
      state.cache = { ...state.cache, aiMedia: null };
      await render(true);
      return;
    }
    if (action === 'ai-media-clear') {
      state.aiMediaQuality = 'all';
      state.aiMediaQ = '';
      state.cache = { ...state.cache, aiMedia: null };
      await render(true);
      return;
    }
    if (action === 'avatar-feedback-review') {
      const note = window.prompt('请输入处理备注', button.dataset.defaultNote || '已记录为生成质量反馈');
      if (note === null) return;
      await post(`/admin/ai/avatar-feedback/${encodeURIComponent(id)}/review`, { reason: note.trim() || '标记 AI 生成反馈已处理' });
      state.cache = { ...state.cache, avatarFeedback: null, avatarJobs: null, audit: null };
      showToast('反馈已标记处理');
      await render(true);
      return;
    }
    if (action === 'avatar-apply') {
      await applyAvatarJobToPet(button);
      return;
    }
    if (action === 'avatar-refresh') await post(`/admin/ai/avatar-jobs/${id}/refresh`, { reason });
    if (action === 'avatar-retry') await post(`/admin/ai/avatar-jobs/${id}/retry`, { reason });
    if (action === 'avatar-fail') await post(`/admin/ai/avatar-jobs/${id}/mark-failed`, { reason });
    if (action === 'avatar-refund') await post(`/admin/ai/avatar-jobs/${id}/refund-quota`, { reason });
    if (action === 'avatar-animation-refresh') await post(`/admin/ai/avatar-animation-jobs/${id}/refresh`, { reason });
    if (action === 'avatar-animation-retry') await post(`/admin/ai/avatar-animation-jobs/${id}/retry`, { reason });
    if (action === 'avatar-animation-fail') await post(`/admin/ai/avatar-animation-jobs/${id}/mark-failed`, { reason });
    if (action === 'post-hide') await post(`/admin/social/posts/${id}/hide`, { reason });
    if (action === 'post-restore') await post(`/admin/social/posts/${id}/restore`, { reason });
    if (action === 'post-delete') await confirmPost(`/admin/social/posts/${id}/delete`, { reason }, '确认删除这条动态？');
    if (action === 'comment-hide') await post(`/admin/social/comments/${id}/hide`, { reason });
    if (action === 'comment-restore') await post(`/admin/social/comments/${id}/restore`, { reason });
    if (action === 'social-evidence-load') {
      await loadSocialEvidenceDetail(button);
      return;
    }
    if (action === 'social-evidence-close') {
      state.socialEvidenceDetail = null;
      await render(false);
      return;
    }
    if (action === 'social-author-sanction') {
      await applySocialAuthorSanction(button);
      return;
    }
    if (action === 'report-valid') await post(`/admin/social/reports/${id}/resolve`, { reason, status: 'valid' });
    if (action === 'report-invalid') await post(`/admin/social/reports/${id}/resolve`, { reason, status: 'invalid' });
    if (action === 'report-place-correct') {
      await handleReportPlaceCorrection(button);
      return;
    }
    if (action === 'report-message-context') {
      await loadReportMessageContext(button);
      return;
    }
    if (action === 'report-mark-harassment') {
      await markReportMessageHarassment(button);
      return;
    }
    if (action === 'report-sanction') {
      await applyReportSanction(button);
      return;
    }
    if (action === 'place-edit') {
      await handlePlaceEdit(button);
      return;
    }
    if (action === 'place-merge') {
      await handlePlaceMerge(button);
      return;
    }
    if (action === 'place-contribution-adjust') {
      await handlePlaceContributionAdjust();
      return;
    }
    if (action === 'place-contribution-void') {
      await handlePlaceContributionVoid(button);
      return;
    }
    if (action === 'place-template-create') {
      await handlePlaceTemplateCreate();
      return;
    }
    if (action === 'place-template-edit') {
      await handlePlaceTemplateEdit(button);
      return;
    }
    if (action === 'place-template-toggle') {
      await handlePlaceTemplateToggle(button);
      return;
    }
    if (action === 'place-template-delete') {
      await handlePlaceTemplateDelete(button);
      return;
    }
    if (action === 'review-approve' || action === 'review-reject' || action === 'submission-approve' || action === 'submission-reject') {
      await handlePlaceModerationAction(button);
      return;
    }
    if (action === 'submission-link-existing') {
      await handlePlaceSubmissionLinkExisting(button);
      return;
    }
    if (action !== 'save-config') {
      clearOperationalCaches();
      showToast('处理完成');
      await render(true);
    }
  } catch (error) {
    showToast(error.message);
  }
}

async function handleModerationTaskAction(button) {
  const taskId = button.dataset.id;
  const op = button.dataset.op;
  const label = button.textContent.trim() || op;
  const title = button.dataset.title || '审核任务';
  const taskKind = String(taskId || '').split(':')[0];
  if ((taskKind === 'placeReview' || taskKind === 'placeSubmission') && (op === 'approve' || op === 'reject')) {
    const body = await buildPlaceModerationBody(taskKind === 'placeReview' ? 'review' : 'submission', op);
    if (!body) return false;
    await post(`/admin/moderation/tasks/${encodeURIComponent(taskId)}/${encodeURIComponent(op)}`, body);
    return true;
  }
  if (button.dataset.confirm === 'true' && !window.confirm(`确认${label}：${title}？`)) return false;
  const reason = window.prompt('请输入处理原因', `${label}：${title}`);
  if (reason === null) return false;
  await post(`/admin/moderation/tasks/${encodeURIComponent(taskId)}/${encodeURIComponent(op)}`, {
    reason: reason.trim() || `${label}：${title}`,
  });
  return true;
}

async function reviewModerationSample(button) {
  const sampleId = button.dataset.id || '';
  const reviewStatus = button.dataset.status || '';
  const label = button.textContent.trim() || reviewStatus;
  const title = button.dataset.title || '内容安全样本';
  if (!sampleId || !reviewStatus) return false;
  const reason = window.prompt('请输入样本复审说明', `${label}：${title}`);
  if (reason === null) return false;
  await post(`/admin/moderation/samples/${encodeURIComponent(sampleId)}/review`, {
    reason: reason.trim() || `${label}：${title}`,
    reviewStatus,
  });
  state.cache = { ...state.cache, audit: null, moderation: null };
  showToast('样本复审已记录');
  await render(true);
  return true;
}

async function moderateMediaUpload(button) {
  const mediaId = button.dataset.id || '';
  const op = button.dataset.op || '';
  const label = button.textContent.trim() || op;
  const title = button.dataset.title || mediaId || '图片素材';
  if (!mediaId || !op) return;
  if ((op === 'hide' || op === 'reject') && !window.confirm(`确认${label}这张图片：${title}？`)) return;
  const reason = window.prompt('请输入图片审核原因', `${label}：${title}`);
  if (reason === null) return;
  await post(`/admin/media/${encodeURIComponent(mediaId)}/moderate`, {
    action: op,
    reason: reason.trim() || `${label}：${title}`,
  });
  state.cache = {
    ...state.cache,
    aiMedia: null,
    audit: null,
    mediaModeration: null,
    moderation: null,
    socialPosts: null,
  };
  showToast('图片审核已处理');
  await render(true);
}

function placeModerationActionLabel(action) {
  if (action === 'approve') return '通过';
  if (action === 'reject') return '驳回';
  return action || '-';
}

function placeModerationKindLabel(kind) {
  if (kind === 'review') return '地点点评';
  if (kind === 'submission') return '新增地点';
  return '地点内容';
}

function placeModerationTemplatesFor(templates, kind, action) {
  return (Array.isArray(templates) ? templates : [])
    .filter((template) => template.enabled !== false && template.kind === kind && template.action === action);
}

function placeModerationTemplateBadges(templates) {
  if (!templates?.length) return '<div class="cell-sub">暂无地点审核模板</div>';
  return templates.map((template) => `
    <span class="risk-badge">
      ${escapeHtml(placeModerationKindLabel(template.kind))} · ${escapeHtml(placeModerationActionLabel(template.action))} · ${escapeHtml(template.title)}
    </span>
  `).join('');
}

function placeModerationTemplateMeta(item) {
  return item.reviewTemplateLabel ? `<div class="cell-sub">模板：${escapeHtml(item.reviewTemplateLabel)}</div>` : '';
}

function placeModerationTemplateScene(template) {
  return `${placeModerationKindLabel(template.kind)} · ${placeModerationActionLabel(template.action)}`;
}

function placeModerationTemplateSource(template) {
  return template.builtin ? '内置' : '自定义';
}

function renderPlaceModerationTemplates(templates) {
  return tableHtml(templates, [
    ['模板', (template) => `
      <div class="cell-title">${escapeHtml(template.title)}</div>
      <div class="cell-sub">${escapeHtml(placeModerationTemplateScene(template))} · ${escapeHtml(placeModerationTemplateSource(template))}</div>
      <div class="cell-sub">${escapeHtml(template.id)}</div>
    `],
    ['状态', (template) => `
      <div>${statusPill(template.enabled === false ? '停用' : '启用')} ${template.builtin ? '<span class="risk-badge">内置</span>' : '<span class="risk-badge">自定义</span>'}</div>
      <div class="cell-sub">排序 ${numberText(template.sortOrder || 0)} · 使用 ${numberText(template.usageCount || 0)} 次</div>
      <div class="cell-sub">${template.lastUsedAt ? `最近使用 ${formatTime(template.lastUsedAt)}` : '暂未使用'}</div>
    `],
    ['默认原因', (template) => `<div class="template-reason">${escapeHtml(template.reason)}</div>`],
    ['操作', (template) => template.builtin ? '<span class="cell-sub">内置模板不可改</span>' : `
      <div class="actions">
        <button
          class="small-button"
          data-action="place-template-edit"
          data-action-value="${escapeHtml(template.action)}"
          data-enabled="${template.enabled === false ? 'false' : 'true'}"
          data-id="${escapeHtml(template.id)}"
          data-kind="${escapeHtml(template.kind)}"
          data-reason="${escapeHtml(template.reason)}"
          data-sort-order="${escapeHtml(template.sortOrder || 0)}"
          data-title="${escapeHtml(template.title)}"
        >编辑</button>
        <button
          class="small-button ${template.enabled === false ? '' : 'ghost'}"
          data-action="place-template-toggle"
          data-enabled="${template.enabled === false ? 'false' : 'true'}"
          data-id="${escapeHtml(template.id)}"
          data-title="${escapeHtml(template.title)}"
        >${template.enabled === false ? '启用' : '停用'}</button>
        <button class="small-button danger" data-action="place-template-delete" data-id="${escapeHtml(template.id)}" data-title="${escapeHtml(template.title)}">删除</button>
      </div>
    `],
  ], '暂无地点审核模板');
}

function promptPlaceTemplatePayload(existing = {}) {
  const title = window.prompt('模板标题', existing.title || '');
  if (title === null) return null;
  const kind = window.prompt('适用对象：review / submission', existing.kind || 'review');
  if (kind === null) return null;
  const action = window.prompt('审核动作：approve / reject', existing.action || 'reject');
  if (action === null) return null;
  const reason = window.prompt('默认审核原因', existing.reason || '');
  if (reason === null) return null;
  const sortOrder = window.prompt('排序值：数字越小越靠前', existing.sortOrder || '100');
  if (sortOrder === null) return null;
  const trimmedTitle = title.replace(/\s+/g, ' ').trim();
  const trimmedReason = reason.replace(/\s+/g, ' ').trim();
  const numericSortOrder = Number(sortOrder);
  if (!trimmedTitle) throw new Error('请填写模板标题');
  if (!trimmedReason) throw new Error('请填写默认审核原因');
  return {
    action: action.trim(),
    kind: kind.trim(),
    reason: trimmedReason,
    sortOrder: Number.isFinite(numericSortOrder) ? numericSortOrder : Number(existing.sortOrder || 100),
    title: trimmedTitle,
  };
}

async function handlePlaceTemplateCreate() {
  const payload = promptPlaceTemplatePayload({ action: 'reject', kind: 'review', sortOrder: 100 });
  if (!payload) return;
  await post('/admin/places/moderation-templates', { ...payload, enabled: true });
  clearPlaceAdminCaches();
  showToast('地点审核模板已新增');
  await render(true);
}

async function handlePlaceTemplateEdit(button) {
  const payload = promptPlaceTemplatePayload({
    action: button.dataset.actionValue || 'reject',
    kind: button.dataset.kind || 'review',
    reason: button.dataset.reason || '',
    sortOrder: button.dataset.sortOrder || '100',
    title: button.dataset.title || '',
  });
  if (!payload) return;
  await patch(`/admin/places/moderation-templates/${encodeURIComponent(button.dataset.id || '')}`, payload);
  clearPlaceAdminCaches();
  showToast('地点审核模板已更新');
  await render(true);
}

async function handlePlaceTemplateToggle(button) {
  const id = button.dataset.id || '';
  const currentlyEnabled = button.dataset.enabled !== 'false';
  const nextEnabled = !currentlyEnabled;
  const title = button.dataset.title || '地点审核模板';
  if (!window.confirm(`确认${nextEnabled ? '启用' : '停用'}「${title}」？`)) return;
  await patch(`/admin/places/moderation-templates/${encodeURIComponent(id)}`, { enabled: nextEnabled });
  clearPlaceAdminCaches();
  showToast(nextEnabled ? '地点审核模板已启用' : '地点审核模板已停用');
  await render(true);
}

async function handlePlaceTemplateDelete(button) {
  const id = button.dataset.id || '';
  const title = button.dataset.title || '地点审核模板';
  if (!window.confirm(`确认删除「${title}」？已使用过的审核记录会保留当时写入的模板标题。`)) return;
  await post(`/admin/places/moderation-templates/${encodeURIComponent(id)}/delete`, { reason: `删除地点审核模板：${title}` });
  clearPlaceAdminCaches();
  showToast('地点审核模板已删除');
  await render(true);
}

async function buildPlaceModerationBody(kind, action) {
  const kindLabel = placeModerationKindLabel(kind);
  const actionLabel = placeModerationActionLabel(action);
  const templates = await load('placeModerationTemplates', '/admin/places/moderation-templates');
  const choices = placeModerationTemplatesFor(templates, kind, action);
  const promptLines = [
    `选择${kindLabel}${actionLabel}原因模板：`,
    ...choices.map((template, index) => `${index + 1}. ${template.title} - ${template.reason}`),
    '',
    '输入编号使用模板，或直接输入自定义审核原因。',
  ];
  const selection = window.prompt(promptLines.join('\n'), choices.length ? '1' : '');
  if (selection === null) return null;
  const rawSelection = selection.trim();
  let template = null;
  let reason = rawSelection;
  if (/^\d+$/.test(rawSelection)) {
    template = choices[Number(rawSelection) - 1] || null;
    if (!template) throw new Error('审核模板编号不存在');
    reason = template.reason;
  } else if (!reason && choices.length) {
    template = choices[0];
    reason = template.reason;
  }
  const finalReason = window.prompt(`确认${kindLabel}${actionLabel}原因`, reason);
  if (finalReason === null) return null;
  const trimmedReason = finalReason.replace(/\s+/g, ' ').trim();
  if (!trimmedReason) throw new Error('请填写审核原因');
  return {
    reason: trimmedReason,
    ...(template ? { templateId: template.id } : {}),
  };
}

async function handlePlaceModerationAction(button) {
  const id = button.dataset.id;
  const configMap = {
    'review-approve': {
      action: 'approve',
      endpoint: (value) => `/admin/places/reviews/${encodeURIComponent(value)}/approve`,
      kind: 'review',
    },
    'review-reject': {
      action: 'reject',
      endpoint: (value) => `/admin/places/reviews/${encodeURIComponent(value)}/reject`,
      kind: 'review',
    },
    'submission-approve': {
      action: 'approve',
      endpoint: (value) => `/admin/places/submissions/${encodeURIComponent(value)}/approve`,
      kind: 'submission',
    },
    'submission-reject': {
      action: 'reject',
      endpoint: (value) => `/admin/places/submissions/${encodeURIComponent(value)}/reject`,
      kind: 'submission',
    },
  };
  const config = configMap[button.dataset.action];
  if (!id || !config) return false;
  const kindLabel = placeModerationKindLabel(config.kind);
  const actionLabel = placeModerationActionLabel(config.action);
  const body = await buildPlaceModerationBody(config.kind, config.action);
  if (!body) return false;
  await post(config.endpoint(id), body);
  state.cache = {
    ...state.cache,
    audit: null,
    moderation: null,
    notifications: null,
    places: null,
    placeReviews: null,
    placeSubmissions: null,
    summary: null,
  };
  showToast(`${kindLabel}${actionLabel}已处理`);
  await render(true);
  return true;
}

function cachedAdminPlaces() {
  const cached = state.cache.places;
  if (!cached) return [];
  return Array.isArray(cached) ? cached : cached.places || [];
}

async function adminPlaceById(placeId) {
  const id = String(placeId || '');
  let place = cachedAdminPlaces().find((item) => item.id === id);
  if (place) return place;
  const catalog = await load('places', '/admin/places', true);
  const places = Array.isArray(catalog) ? catalog : catalog.places || [];
  place = places.find((item) => item.id === id);
  return place || null;
}

function clearPlaceAdminCaches() {
  ['audit', 'exports', 'moderation', 'notifications', 'places', 'placeContributions', 'placeModerationTemplates', 'placeReviews', 'placeSubmissions', 'socialRelations', 'summary'].forEach((key) => {
    state.cache[key] = null;
  });
}

function placeMergeCandidateText(place) {
  const candidates = Array.isArray(place?.duplicateCandidates) ? place.duplicateCandidates : [];
  if (!candidates.length) return '暂无算法候选，可手动输入明确重复的目标地点 ID。';
  return candidates.slice(0, 6).map((candidate, index) => {
    const distance = Number.isFinite(Number(candidate.distanceMeters)) ? `，距离 ${numberText(candidate.distanceMeters)}m` : '';
    const reasons = Array.isArray(candidate.reasons) && candidate.reasons.length ? `，证据：${candidate.reasons.join(' / ')}` : '';
    return `${index + 1}. ${candidate.name || candidate.id} (${candidate.id})，相似 ${numberText(candidate.score)}${distance}${reasons}`;
  }).join('\n');
}

async function handlePlaceEdit(button) {
  const place = await adminPlaceById(button.dataset.id);
  if (!place) throw new Error('地点不存在或已被合并');
  const name = window.prompt('地点名称', place.name || '');
  if (name === null) return false;
  const address = window.prompt('地点地址', place.address || '');
  if (address === null) return false;
  const category = window.prompt('分类：cafe / clinic / other / park / shop', place.category || 'other');
  if (category === null) return false;
  const petFriendlyStatus = window.prompt('宠物友好状态：candidate / rejected / unknown / verified', place.petFriendlyStatus || 'unknown');
  if (petFriendlyStatus === null) return false;
  const supportedSpecies = window.prompt('支持宠物：dog,cat', (place.supportedSpecies || []).join(','));
  if (supportedSpecies === null) return false;
  const tags = window.prompt('标签，用逗号分隔', (place.tags || []).join(','));
  if (tags === null) return false;
  const latitude = window.prompt('纬度，可留空', place.latitude ?? '');
  if (latitude === null) return false;
  const longitude = window.prompt('经度，可留空', place.longitude ?? '');
  if (longitude === null) return false;
  const coverImageUrl = window.prompt('封面图 URL，可留空', place.coverImageUrl || '');
  if (coverImageUrl === null) return false;
  const reason = window.prompt('请输入编辑原因', `编辑地点资料：${place.name}`);
  if (reason === null) return false;
  await patch(`/admin/places/${encodeURIComponent(place.id)}`, {
    address,
    category,
    coverImageUrl,
    latitude,
    longitude,
    name,
    petFriendlyStatus,
    reason: reason.trim() || `编辑地点资料：${place.name}`,
    supportedSpecies,
    tags,
  });
  clearPlaceAdminCaches();
  showToast('地点资料已更新');
  await render(true);
  return true;
}

async function handleReportPlaceCorrection(button) {
  const reportId = button.dataset.id || '';
  const placeId = button.dataset.targetId || '';
  const place = await adminPlaceById(placeId);
  if (!place) throw new Error('被举报地点不存在或已被合并');
  const name = window.prompt('根据举报修正地点名称', place.name || '');
  if (name === null) return false;
  const address = window.prompt('根据举报修正地点地址', place.address || '');
  if (address === null) return false;
  const category = window.prompt('分类：cafe / clinic / other / park / shop', place.category || 'other');
  if (category === null) return false;
  const petFriendlyStatus = window.prompt('宠物友好状态：candidate / rejected / unknown / verified', place.petFriendlyStatus || 'unknown');
  if (petFriendlyStatus === null) return false;
  const supportedSpecies = window.prompt('支持宠物：dog,cat', (place.supportedSpecies || []).join(','));
  if (supportedSpecies === null) return false;
  const tags = window.prompt('标签，用逗号分隔', (place.tags || []).join(','));
  if (tags === null) return false;
  const phone = window.prompt('联系电话，可留空', place.phone || '');
  if (phone === null) return false;
  const openingHoursToday = window.prompt('营业时间，可留空', place.openingHoursToday || '');
  if (openingHoursToday === null) return false;
  const reason = window.prompt('请输入修正原因', `根据地点信息举报修正：${place.name}`);
  if (reason === null) return false;
  await post(`/admin/social/reports/${encodeURIComponent(reportId)}/correct-place`, {
    address,
    category,
    name,
    openingHoursToday,
    petFriendlyStatus,
    phone,
    reason: reason.trim() || `根据地点信息举报修正：${place.name}`,
    supportedSpecies,
    tags,
  });
  state.cache = {
    ...state.cache,
    audit: null,
    moderation: null,
    places: null,
    reports: null,
    summary: null,
  };
  showToast('地点资料已修正，举报已标记有效');
  await render(true);
  return true;
}

async function handlePlaceMerge(button) {
  const source = await adminPlaceById(button.dataset.id);
  if (!source) throw new Error('源地点不存在或已被合并');
  const candidates = Array.isArray(source.duplicateCandidates) ? source.duplicateCandidates : [];
  const defaultTargetId = candidates[0]?.id || '';
  const targetPlaceId = window.prompt(
    `把「${source.name}」合并到哪个目标地点？\n\n${placeMergeCandidateText(source)}\n\n请输入目标地点 ID：`,
    defaultTargetId,
  );
  if (targetPlaceId === null) return false;
  const trimmedTargetId = targetPlaceId.trim();
  if (!trimmedTargetId) throw new Error('请填写目标地点 ID');
  if (trimmedTargetId === source.id) throw new Error('不能把地点合并到自身');
  const target = await adminPlaceById(trimmedTargetId);
  if (!target) throw new Error('目标地点不存在');
  if (!window.confirm(`确认把「${source.name}」合并到「${target.name}」？\n\n旧地点会从目录移除，点评、收藏、通知、约溜等引用会迁移到目标地点。`)) return false;
  const reason = window.prompt('请输入合并原因', `合并重复地点：${source.name} -> ${target.name}`);
  if (reason === null) return false;
  await post(`/admin/places/${encodeURIComponent(source.id)}/merge`, {
    reason: reason.trim() || `合并重复地点：${source.name} -> ${target.name}`,
    targetPlaceId: trimmedTargetId,
  });
  clearPlaceAdminCaches();
  showToast('地点已合并并迁移引用');
  await render(true);
  return true;
}

async function handlePlaceSubmissionLinkExisting(button) {
  const submissionId = button.dataset.id || '';
  const submissionName = button.dataset.name || '新增地点';
  const defaultTargetId = button.dataset.defaultTargetId || '';
  const targetPlaceId = window.prompt(`把「${submissionName}」关联到哪个已有地点？\n\n请输入目标地点 ID：`, defaultTargetId);
  if (targetPlaceId === null) return false;
  const trimmedTargetId = targetPlaceId.trim();
  if (!trimmedTargetId) throw new Error('请填写目标地点 ID');
  const target = await adminPlaceById(trimmedTargetId);
  if (!target) throw new Error('目标地点不存在');
  if (!window.confirm(`确认把「${submissionName}」关联到「${target.name}」？\n\n这会把提交审核视为通过，并给提交人记录地点贡献。`)) return false;
  const body = await buildPlaceModerationBody('submission', 'approve');
  if (!body) return false;
  await post(`/admin/places/submissions/${encodeURIComponent(submissionId)}/link-existing`, {
    ...body,
    placeId: trimmedTargetId,
  });
  clearPlaceAdminCaches();
  showToast('新增地点已关联到已有地点，并已记录贡献');
  await render(true);
  return true;
}

async function handlePlaceContributionAdjust() {
  const phone = window.prompt('用户手机号');
  if (phone === null) return false;
  const trimmedPhone = phone.replace(/\D/g, '');
  if (!/^1\d{10}$/.test(trimmedPhone)) throw new Error('请填写 11 位用户手机号');
  const pointsText = window.prompt('调整贡献分，正数补分、负数扣分，范围 -1000 到 1000', '5');
  if (pointsText === null) return false;
  const points = Number(pointsText);
  if (!Number.isFinite(points) || Math.round(points) !== points || points === 0 || points < -1000 || points > 1000) {
    throw new Error('调整分值必须是 -1000 到 1000 之间的非 0 整数');
  }
  const placeId = window.prompt('关联地点 ID，可留空', '');
  if (placeId === null) return false;
  const reason = window.prompt('调整原因，会进入审计并通知用户', '运营手动纠正地点贡献分');
  if (reason === null) return false;
  const trimmedReason = reason.replace(/\s+/g, ' ').trim();
  if (trimmedReason.length < 4) throw new Error('请填写 4 个字以上的调整原因');
  await post('/admin/places/contributions/adjust', {
    phone: trimmedPhone,
    placeId: placeId.trim(),
    points,
    reason: trimmedReason,
  });
  clearPlaceAdminCaches();
  showToast('地点贡献分已调整');
  await render(true);
  return true;
}

async function handlePlaceContributionVoid(button) {
  const id = button.dataset.id || '';
  const title = button.dataset.title || '地点贡献记录';
  const reason = window.prompt(`撤销「${title}」的原因`, '运营撤销误记地点贡献');
  if (reason === null) return false;
  const trimmedReason = reason.replace(/\s+/g, ' ').trim();
  if (trimmedReason.length < 4) throw new Error('请填写 4 个字以上的撤销原因');
  if (!window.confirm('确认撤销这条地点贡献记录？撤销后该分数不会再计入移动端地点共建身份。')) return false;
  await post(`/admin/places/contributions/${encodeURIComponent(id)}/void`, {
    reason: trimmedReason,
  });
  clearPlaceAdminCaches();
  showToast('地点贡献记录已撤销');
  await render(true);
  return true;
}

async function assignModerationTask(button) {
  const taskId = button.dataset.id;
  const title = button.dataset.title || '审核任务';
  const assignee = window.prompt(`认领给谁？`, state.admin?.username || 'admin');
  if (assignee === null) return false;
  await post(`/admin/moderation/tasks/${encodeURIComponent(taskId)}/assign`, {
    assignee: assignee.trim() || state.admin?.username || 'admin',
    reason: `认领：${title}`,
  });
  return true;
}

async function handleModerationBatch() {
  const taskIds = Array.from(document.querySelectorAll('.moderation-batch-check:checked')).map((item) => item.value).filter(Boolean);
  if (!taskIds.length) {
    showToast('请先勾选要批量处理的任务');
    return false;
  }
  const action = $('moderationBulkAction')?.value || 'assign';
  const reason = window.prompt(`批量处理 ${taskIds.length} 个任务`, `批量 ${action}`);
  if (reason === null) return false;
  const result = await post('/admin/moderation/tasks/batch', {
    action,
    assignee: state.admin?.username || 'admin',
    reason: reason.trim() || `批量 ${action}`,
    taskIds,
  });
  showToast(`批量完成：成功 ${result.successCount || 0}，失败 ${result.errorCount || 0}`);
  return true;
}

async function viewPetChatDetail(id) {
  if (!id) return;
  const reason = window.prompt('请输入查看完整 AI 对话的原因', `排查 AI 对话 ${id}`);
  if (reason === null) return;
  const detail = await post(`/admin/ai/pet-chat/messages/${encodeURIComponent(id)}/view`, {
    reason: reason.trim(),
  });
  state.petChatDetails[id] = detail;
  state.cache.audit = null;
  showToast('已加载完整对话');
  await render(false);
}

async function tagPetChatMessage(button) {
  const id = button.dataset.id;
  const tag = button.dataset.tag;
  if (!id || !tag) return;
  const label = petChatTagLabel(tag);
  const reason = window.prompt('请输入标记原因', `${label}：${id}`);
  if (reason === null) return;
  await post(`/admin/ai/pet-chat/messages/${encodeURIComponent(id)}/tag`, {
    reason: reason.trim() || `${label}：${id}`,
    tag,
  });
  state.cache.petChat = null;
  state.cache.petChatQualityReview = null;
  state.cache.audit = null;
  showToast('已标记 AI 回复');
  await render(true);
}

async function reviewPetChatMessage(button) {
  const id = button.dataset.id;
  const reviewStatus = button.dataset.status;
  if (!id || !reviewStatus) return;
  const label = button.textContent.trim() || petChatQualityReviewStatusLabel(reviewStatus);
  const reason = window.prompt('请输入 AI 对话复核说明', `${label}：${id}`);
  if (reason === null) return;
  await post(`/admin/ai/pet-chat/messages/${encodeURIComponent(id)}/quality-review`, {
    reason: reason.trim() || `${label}：${id}`,
    reviewStatus,
  });
  state.cache.petChat = null;
  state.cache.petChatQualityReview = null;
  state.cache.audit = null;
  showToast('AI 对话复核已记录');
  await render(true);
}

async function hidePetChatMessage(button) {
  const id = button.dataset.id;
  if (!id) return;
  const reason = window.prompt('请输入隐藏原因；隐藏后移动端不再展示这条 AI 回复', `隐藏 AI 回复：${id}`);
  if (reason === null) return;
  await post(`/admin/ai/pet-chat/messages/${encodeURIComponent(id)}/hide`, {
    reason: reason.trim(),
  });
  delete state.petChatDetails[id];
  state.cache.petChat = null;
  state.cache.petChatQualityReview = null;
  state.cache.audit = null;
  showToast('AI 回复已隐藏');
  await render(true);
}

function clearOperationalCaches() {
  ['aiMedia', 'aiPromptVersions', 'aiUsage', 'audit', 'avatarAnimationJobs', 'avatarFeedback', 'avatarJobs', 'avatarSamples', 'dataClearApprovals', 'feedback', 'mediaModeration', 'moderation', 'notifications', 'petCalendar', 'petChat', 'petChatQualityReview', 'pets', 'places', 'placeContributions', 'placeReviews', 'placeSubmissions', 'reports', 'sanctionAppeals', 'sanctionApprovals', 'sanctionPolicy', 'sanctionTemplates', 'sanctions', 'socialComments', 'socialPosts', 'socialRelations', 'summary', 'ticketReplyTemplates', 'tickets', 'users'].forEach((key) => {
    state.cache[key] = null;
  });
}

function userRiskTagHelpText() {
  return userRiskTagOptions.map((item) => `${item.key}=${item.label}`).join('，');
}

function parseUserRiskTagInput(value) {
  const tags = [];
  String(value || '')
    .split(/[\s,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((token) => {
      const key = userRiskTagKeyMap[token];
      if (key && !tags.includes(key)) tags.push(key);
    });
  return tags;
}

async function addUserAdminNote(phone) {
  if (!phone) return;
  const content = window.prompt(`给 ${shortPhone(phone)} 添加运营备注`, '');
  if (content === null) return;
  const trimmed = content.trim();
  if (!trimmed) throw new Error('请填写运营备注');
  await post(`/admin/users/${encodeURIComponent(phone)}/notes`, { content: trimmed });
  state.cache.users = null;
  state.cache.audit = null;
  showToast('运营备注已添加');
  await render(true);
}

async function editUserRiskTags(button) {
  const phone = button.dataset.phone || '';
  if (!phone) return;
  const current = button.dataset.tags || '';
  const input = window.prompt(
    `更新 ${shortPhone(phone)} 的运营风险标签\n\n可用标签：${userRiskTagHelpText()}\n\n输入多个标签请用逗号或空格分隔；留空表示清空。`,
    current,
  );
  if (input === null) return;
  const tags = parseUserRiskTagInput(input);
  const unknown = String(input || '')
    .split(/[\s,，、]+/)
    .map((item) => item.trim())
    .filter((item) => item && !userRiskTagKeyMap[item]);
  if (unknown.length) throw new Error(`无法识别标签：${unknown.join('、')}`);
  await post(`/admin/users/${encodeURIComponent(phone)}/risk-tags`, {
    reason: '更新用户风险标签',
    tags,
  });
  state.cache.users = null;
  state.cache.audit = null;
  showToast(tags.length ? '风险标签已更新' : '风险标签已清空');
  await render(true);
}

function userBusinessSummaryText(summary = {}) {
  const groups = [
    ['宠物/日历', Number(summary.pets || 0) + Number(summary.healthStores || 0)],
    ['AI', Number(summary.avatarJobs || 0) + Number(summary.mediaUploads || 0) + Number(summary.petChatMessages || 0)],
    ['宠友圈', Number(summary.socialMoments || 0) + Number(summary.socialComments || 0) + Number(summary.socialLikes || 0) + Number(summary.socialReports || 0)],
    ['关系消息', Number(summary.greetings || 0) + Number(summary.invites || 0) + Number(summary.conversations || 0) + Number(summary.conversationMessages || 0)],
    ['地点/工单', Number(summary.placeReviews || 0) + Number(summary.placeSubmissions || 0) + Number(summary.feedback || 0) + Number(summary.supportTickets || 0)],
    ['通知/设备', Number(summary.notifications || 0) + Number(summary.pushDevices || 0)],
  ];
  return groups.map(([label, value]) => `${label} ${value}`).join(' · ');
}

function dataClearApprovalTone(status) {
  return status === 'approved' ? 'ok' : status === 'pending_approval' ? 'warn' : status === 'canceled' ? 'bad' : '';
}

function renderDataClearApprovals(approvals = {}) {
  const items = approvals.items || [];
  const summary = approvals.summary || {};
  return `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>用户业务数据清理审批</h2>
          <div class="section-sub">待审批 ${numberText(summary.pending || 0)} · 已执行 ${numberText(summary.approved || 0)} · 已取消 ${numberText(summary.canceled || 0)}</div>
        </div>
        ${help('清理申请提交后不会立刻影响移动端；只有审批通过才会删除该用户的宠物、AI、宠友圈、关系消息、地点、通知、工单等业务数据，并保留账号与审计日志。当前是单 admin 审批版本，生产多管理员后可升级为双人审批。')}
      </div>
      ${items.length ? tableHtml(items, [
        ['用户', (row) => `<div class="cell-title">${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.phone)}</div>`],
        ['清理范围', (row) => `<div class="cell-sub clamp">${escapeHtml(userBusinessSummaryText(row.beforeSummary || {}))}</div>`],
        ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.reason || '-')}</div><div class="cell-sub">提交人：${escapeHtml(row.createdBy || '-')}</div>`],
        ['状态', (row) => `${tonePill(row.statusLabel || row.status, dataClearApprovalTone(row.status))}<div class="cell-sub">${row.approvedAt ? `执行 ${formatTime(row.approvedAt)}` : row.canceledAt ? `取消 ${formatTime(row.canceledAt)}` : `提交 ${formatTime(row.createdAt)}`}</div>`],
        ['结果', (row) => row.status === 'approved'
          ? `<div class="cell-sub clamp">已清理：${escapeHtml(userBusinessSummaryText(row.beforeSummary || {}))}</div>`
          : row.status === 'canceled'
            ? `<div class="cell-sub clamp">${escapeHtml(row.cancelReason || '已取消')}</div>`
            : '<div class="cell-sub">等待审批，不影响移动端</div>'],
        ['操作', (row) => row.status === 'pending_approval' ? `
          <div class="actions">
            <button class="small-button" data-action="data-clear-approval-approve" data-id="${escapeHtml(row.id)}">审批执行</button>
            <button class="small-button danger" data-action="data-clear-approval-cancel" data-id="${escapeHtml(row.id)}">取消</button>
          </div>
        ` : '-'],
      ], '暂无待审批的数据清理申请') : '<div class="placeholder"><div><strong>暂无待审批的数据清理申请</strong><div>从用户列表提交申请后会出现在这里。</div></div></div>'}
    </div>
  `;
}

function invalidateDataClearCaches() {
  clearOperationalCaches();
  state.cache.dataClearApprovals = null;
}

async function clearUserBusinessData(phone) {
  if (!phone) return;
  const preview = await api(`/admin/users/${encodeURIComponent(phone)}/business-data-summary`);
  const summary = preview.summary || {};
  const summaryText = userBusinessSummaryText(summary);
  const reason = window.prompt(
    `这是高危操作，会保留账号和审计日志，但清理该用户的宠物、AI、宠友圈、关系消息、地点、通知、工单等业务数据。\n\n${shortPhone(phone)}：${summaryText}\n\n请输入清理原因：`,
    '测试重置用户业务数据',
  );
  if (reason === null) return;
  const confirmation = window.prompt(`请再次输入完整手机号 ${phone} 确认清理`, '');
  if (confirmation === null) return;
  await post('/admin/data-clear-approvals', {
    confirmation: confirmation.trim(),
    phone,
    reason: reason.trim() || '测试重置用户业务数据',
  });
  invalidateDataClearCaches();
  showToast(`业务数据清理审批已提交：${shortPhone(phone)}`);
  await render(true);
}

async function approveDataClearApproval(id) {
  if (!id) return;
  const reason = window.prompt('请输入审批说明', '审批并执行用户业务数据清理');
  if (reason === null) return;
  const result = await post(`/admin/data-clear-approvals/${encodeURIComponent(id)}/approve`, {
    reason: reason.trim() || '审批并执行用户业务数据清理',
  });
  invalidateDataClearCaches();
  const phone = result.approval?.phone;
  if (phone && state.userTimeline?.user?.phone === phone) state.userTimeline = null;
  showToast(`数据清理已执行：${shortPhone(phone)}`);
  if (state.route === 'users') await render(true);
}

async function cancelDataClearApproval(id) {
  if (!id) return;
  const reason = window.prompt('请输入取消原因', '取消用户业务数据清理审批');
  if (reason === null) return;
  await post(`/admin/data-clear-approvals/${encodeURIComponent(id)}/cancel`, {
    reason: reason.trim() || '取消用户业务数据清理审批',
  });
  invalidateDataClearCaches();
  showToast('数据清理审批已取消');
  if (state.route === 'users') await render(true);
}

function valueOf(id) {
  return $(id)?.value?.trim() || '';
}

async function assignTicket(id) {
  const assignee = valueOf(`ticketAssignee-${id}`) || state.admin?.username || 'admin';
  await post(`/admin/tickets/${encodeURIComponent(id)}/assign`, { assignee, reason: '工单分配' });
}

function parseTicketRelatedObjects(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('关联对象 JSON 必须是数组');
    return parsed.map((item) => ({ id: String(item.id || '').trim(), type: String(item.type || '').trim() })).filter((item) => item.id && item.type);
  }
  return text
    .split(/[\n,，]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^:\s]+)\s*[:：]\s*(.+)$/) || line.match(/^(\S+)\s+(.+)$/);
      if (!match) throw new Error(`关联对象格式不正确：${line}`);
      return { id: match[2].trim(), type: match[1].trim() };
    })
    .filter((item) => item.id && item.type);
}

function formatTicketRelatedObjects(relatedObjects = []) {
  return (Array.isArray(relatedObjects) ? relatedObjects : []).map((item) => `${item.type}:${item.id}`).join('\n');
}

async function saveTicketRelatedObjects(id) {
  const relatedObjects = parseTicketRelatedObjects(valueOf(`ticketRelated-${id}`));
  await patch(`/admin/tickets/${encodeURIComponent(id)}`, {
    reason: '更新工单关联对象',
    relatedObjects,
  });
}

async function saveTicketStatus(id) {
  const status = valueOf(`ticketStatus-${id}`);
  const priority = valueOf(`ticketPriority-${id}`);
  await post(`/admin/tickets/${encodeURIComponent(id)}/status`, { priority, reason: '工单状态更新', status });
}

async function addTicketNote(id) {
  const content = valueOf(`ticketNote-${id}`);
  if (!content) throw new Error('请先填写内部备注');
  await post(`/admin/tickets/${encodeURIComponent(id)}/notes`, { content });
}

async function replyTicket(id) {
  const content = valueOf(`ticketReply-${id}`);
  if (!content) throw new Error('请先填写客服回复');
  const notifyUser = Boolean($(`ticketNotify-${id}`)?.checked);
  const nextStatus = valueOf(`ticketReplyStatus-${id}`) || 'waiting_user';
  await post(`/admin/tickets/${encodeURIComponent(id)}/reply`, { content, nextStatus, notifyUser, reason: '客服回复用户' });
}

async function handleTicketBatch() {
  const ticketIds = Array.from(document.querySelectorAll('.ticket-batch-check:checked')).map((item) => item.value).filter(Boolean);
  if (!ticketIds.length) {
    showToast('请先勾选要批量处理的工单');
    return false;
  }
  const action = valueOf('ticketBulkAction') || 'assign';
  const assignee = valueOf('ticketBulkAssignee') || state.admin?.username || 'admin';
  const status = valueOf('ticketBulkStatus') || undefined;
  const priority = valueOf('ticketBulkPriority') || undefined;
  const reason = window.prompt(`批量处理 ${ticketIds.length} 个工单`, `批量 ${action}`);
  if (reason === null) return false;
  const result = await post('/admin/tickets/batch', {
    action,
    assignee,
    priority: priority === 'keep' ? undefined : priority,
    reason: reason.trim() || `批量 ${action}`,
    status: status === 'keep' ? undefined : status,
    ticketIds,
  });
  showToast(`批量完成：成功 ${result.successCount || 0}，失败 ${result.errorCount || 0}`);
  return true;
}

async function submitTicketBatchReply() {
  const ticketIds = Array.from(document.querySelectorAll('.ticket-batch-check:checked')).map((item) => item.value).filter(Boolean);
  if (!ticketIds.length) {
    showToast('请先在工单队列勾选要回复的工单');
    return false;
  }
  const content = valueOf('ticketBatchReplyContent');
  if (!content) throw new Error('请先填写批量回复内容');
  const nextStatus = valueOf('ticketBatchReplyStatus') || 'waiting_user';
  const notifyUser = Boolean($('ticketBatchReplyNotify')?.checked);
  const reason = window.prompt(`提交 ${ticketIds.length} 个工单的批量回复审批`, '提交批量客服回复审批');
  if (reason === null) return false;
  const result = await post('/admin/tickets/batch-replies', {
    content,
    nextStatus,
    notifyUser,
    reason: reason.trim() || '提交批量客服回复审批',
    ticketIds,
  });
  showToast(result.successCount ? `批量回复已发送：${result.successCount} 成功` : '批量回复已提交审批');
  state.cache = { ...state.cache, tickets: null, audit: null, summary: null };
  await render(true);
  return true;
}

async function approveTicketBatchReply(id) {
  const reason = window.prompt('请输入审批说明', '审批发送批量客服回复');
  if (reason === null) return;
  const result = await post(`/admin/tickets/batch-replies/${encodeURIComponent(id)}/approve`, {
    reason: reason.trim() || '审批发送批量客服回复',
  });
  showToast(`批量回复发送完成：成功 ${result.successCount || 0}，失败 ${result.errorCount || 0}`);
  state.cache = { ...state.cache, tickets: null, audit: null, notifications: null, summary: null };
  await render(true);
}

async function cancelTicketBatchReply(id) {
  const reason = window.prompt('请输入取消原因', '取消批量客服回复');
  if (reason === null) return;
  await post(`/admin/tickets/batch-replies/${encodeURIComponent(id)}/cancel`, {
    reason: reason.trim() || '取消批量客服回复',
  });
  showToast('批量回复申请已取消');
  state.cache = { ...state.cache, tickets: null, audit: null, summary: null };
  await render(true);
}

async function reviewTicketQuality(button) {
  const ticketId = button.dataset.ticketId || '';
  const status = button.dataset.status || 'reviewed';
  const defaultNote = status === 'needs_followup' ? '需要继续跟进用户问题' : status === 'waived' ? '业务判断可豁免' : '质检已复核';
  const note = window.prompt('请输入质检说明', defaultNote);
  if (note === null) return;
  await post(`/admin/tickets/quality-reviews/${encodeURIComponent(ticketId)}`, {
    note: note.trim() || defaultNote,
    status,
  });
  showToast('质检状态已更新');
  state.cache = { ...state.cache, tickets: null, audit: null };
  await render(true);
}

function fillTicketReplyTemplate(button) {
  const ticketId = button.dataset.ticketId || '';
  const content = button.dataset.content || '';
  const nextStatus = button.dataset.nextStatus || 'waiting_user';
  const notifyUser = button.dataset.notifyUser !== 'false';
  if (ticketId && $(`ticketReply-${ticketId}`)) {
    $(`ticketReply-${ticketId}`).value = content;
    const statusSelect = $(`ticketReplyStatus-${ticketId}`);
    if (statusSelect) statusSelect.value = nextStatus;
    const notify = $(`ticketNotify-${ticketId}`);
    if (notify) notify.checked = notifyUser;
    return;
  }
  if ($('ticketTemplateContent')) $('ticketTemplateContent').value = content;
  if ($('ticketTemplateStatus')) $('ticketTemplateStatus').value = nextStatus;
  if ($('ticketTemplateNotify')) $('ticketTemplateNotify').checked = notifyUser;
}

async function saveTicketReplyTemplate() {
  const name = valueOf('ticketTemplateName');
  const content = valueOf('ticketTemplateContent');
  if (!name) throw new Error('请先填写模板名称');
  if (!content) throw new Error('请先填写模板内容');
  await post('/admin/tickets/reply-templates', {
    content,
    name,
    nextStatus: valueOf('ticketTemplateStatus') || 'waiting_user',
    notifyUser: Boolean($('ticketTemplateNotify')?.checked),
  });
}

async function handleSanctionAppealAction(button) {
  const id = button.dataset.id;
  const op = button.dataset.action === 'appeal-approve' ? 'approve' : button.dataset.action === 'appeal-reject' ? 'reject' : 'review';
  const title = button.dataset.title || '账号申诉';
  const defaultReason = op === 'approve' ? `申诉通过：${title}` : op === 'reject' ? `申诉未通过：${title}` : `接手申诉：${title}`;
  const reason = op === 'review' ? defaultReason : window.prompt('请输入处理说明，会同步给用户', defaultReason);
  if (reason === null) return;
  const revokeSanction = op === 'approve' ? Boolean($(`appealRevoke-${id}`)?.checked ?? true) : undefined;
  await post(`/admin/sanction-appeals/${encodeURIComponent(id)}/${op}`, { reason, revokeSanction });
  state.cache = { ...state.cache, audit: null, sanctionAppeals: null, sanctionPolicy: null, sanctions: null, summary: null, users: null };
}

function fillNotificationFormFromDataset(button) {
  const fields = [
    ['notifyTitle', 'title'],
    ['notifyText', 'text'],
    ['notifyActionRoute', 'actionRoute'],
    ['notifyTarget', 'target'],
    ['notifyPhones', 'phones'],
    ['notifyAudiencePackageId', 'audiencePackageId'],
    ['notifyDeepLinkType', 'deepLinkType'],
    ['notifyDeepLinkId', 'deepLinkId'],
  ];
  fields.forEach(([inputId, dataKey]) => {
    const element = $(inputId);
    if (element && Object.prototype.hasOwnProperty.call(button.dataset, dataKey)) element.value = button.dataset[dataKey] || '';
  });
  if (Object.prototype.hasOwnProperty.call(button.dataset, 'respectUserSettings')) {
    const checkbox = $('notifyRespectSettings');
    if (checkbox) checkbox.checked = button.dataset.respectUserSettings !== 'false';
  }
}

async function saveNotificationTemplate() {
  const title = valueOf('notifyTitle');
  const text = valueOf('notifyText');
  const name = valueOf('notifyTemplateName') || title;
  if (!title) throw new Error('请先填写通知标题');
  if (!text) throw new Error('请先填写通知内容');
  await post('/admin/notifications/templates', {
    actionRoute: valueOf('notifyActionRoute'),
    name,
    respectUserSettings: Boolean($('notifyRespectSettings')?.checked),
    text,
    title,
  });
  state.cache.notifications = null;
}

async function saveNotificationAudiencePackage() {
  const name = valueOf('notifyAudienceName');
  const phones = valueOf('notifyAudiencePhones');
  if (!name) throw new Error('请填写人群包名称');
  if (!phones) throw new Error('请填写人群包手机号');
  await post('/admin/notifications/audience-packages', {
    description: valueOf('notifyAudienceDescription'),
    name,
    phones,
  });
  state.cache.notifications = null;
}

async function cancelNotificationCampaign(id, status) {
  const label = status === 'sent' ? '撤回已发送通知' : status === 'scheduled' ? '取消预约通知' : status === 'pending_approval' ? '作废待审批通知' : '作废通知草稿';
  const reason = window.prompt('请输入处理原因', label);
  if (reason === null) return;
  await post(`/admin/notifications/${encodeURIComponent(id)}/cancel`, { reason: reason.trim() || label });
  state.cache.notifications = null;
}

async function approveNotificationCampaign(id) {
  const reason = window.prompt('请输入审批说明', '审批通过系统通知');
  if (reason === null) return;
  await post(`/admin/notifications/${encodeURIComponent(id)}/approve`, { reason: reason.trim() || '审批通过系统通知' });
  state.cache.notifications = null;
}

async function sendSystemNotification(mode = 'send') {
  const title = valueOf('notifyTitle');
  const text = valueOf('notifyText');
  if (!title) throw new Error('请填写通知标题');
  if (!text) throw new Error('请填写通知内容');
  const target = valueOf('notifyTarget') || 'phones';
  const phones = valueOf('notifyPhones');
  const audiencePackageId = valueOf('notifyAudiencePackageId');
  if (mode !== 'draft' && target === 'phones' && !phones) throw new Error('请填写目标手机号');
  if (mode !== 'draft' && target === 'audience_package' && !audiencePackageId) throw new Error('请选择通知人群包');
  const scheduledAt = valueOf('notifyScheduledAt');
  if ((mode === 'scheduled' || mode === 'approval_scheduled') && !scheduledAt) throw new Error('请选择预约发送时间');
  const postMode = mode === 'approval_scheduled' ? 'approval' : mode;
  const intendedMode = mode === 'approval_scheduled' ? 'scheduled' : mode === 'approval' ? 'send' : '';
  await post('/admin/notifications/system', {
    actionRoute: valueOf('notifyActionRoute'),
    audiencePackageId,
    deepLinkId: valueOf('notifyDeepLinkId'),
    deepLinkType: valueOf('notifyDeepLinkType'),
    intendedMode,
    mode: postMode,
    phones,
    reason: mode === 'approval_scheduled' ? '提交预约系统通知审批' : mode === 'approval' ? '提交系统通知审批' : mode === 'scheduled' ? '预约发送系统通知' : mode === 'draft' ? '保存系统通知草稿' : '发送系统通知',
    respectUserSettings: Boolean($('notifyRespectSettings')?.checked),
    scheduledAt,
    target,
    text,
    title,
  });
  state.cache.notifications = null;
}

async function post(path, body) {
  return api(path, { body: JSON.stringify(body), method: 'POST' });
}

async function patch(path, body) {
  return api(path, { body: JSON.stringify(body), method: 'PATCH' });
}

async function confirmPost(path, body, message) {
  if (!window.confirm(message)) return null;
  return post(path, body);
}

async function render(force = false) {
  setChrome();
  if (navItems.find((item) => item.key === state.route)?.reserved) {
    renderReserved();
    return;
  }
  const renderers = {
    adminAccounts: renderAdminAccounts,
    analytics: renderAnalytics,
    audit: renderAudit,
    avatarJobs: renderAvatarJobs,
    config: renderConfig,
    dashboard: renderDashboard,
    exports: renderExports,
    feedback: renderFeedback,
    launchReadiness: renderLaunchReadiness,
    moderation: renderModeration,
    notifications: renderNotifications,
    petCalendar: renderPetCalendar,
    petChat: renderPetChat,
    pets: renderPets,
    places: renderPlaces,
    reports: renderReports,
    sanctionAppeals: renderSanctionAppeals,
    sanctions: renderSanctions,
    socialRelations: renderSocialRelations,
    socialPosts: renderSocialPosts,
    systemHealth: renderSystemHealth,
    tickets: renderTickets,
    users: renderUsers,
  };
  await renderers[state.route](force);
}

async function load(key, path, force = false) {
  if (!force && state.cache[key]) return state.cache[key];
  state.cache[key] = await api(path);
  return state.cache[key];
}

function clearCachePrefix(prefix) {
  Object.keys(state.cache).forEach((key) => {
    if (key.startsWith(prefix)) state.cache[key] = null;
  });
}

function metric(label, value, foot, tip) {
  return `
    <div class="card metric">
      <div class="metric-label">${label} ${tip ? help(tip) : ''}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
      <div class="metric-foot">${escapeHtml(foot || '')}</div>
    </div>
  `;
}

async function renderDashboard(force) {
  const data = await load('summary', '/admin/dashboard/summary', force);
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('用户总数', data.users.total, `${data.users.withPets} 位已建档`, '来自当前后端 users 状态。')}
      ${metric('生效处罚', data.users.activeSanctions || 0, '禁言/冻结/封禁/警告', '仍处于 active 状态的处罚记录，过期或撤销后不计入。')}
      ${metric('待处理申诉', data.appeals?.open || 0, `${data.appeals?.pending || 0} 条新申诉`, '用户对禁言、冻结、封禁发起的账号申诉，需要运营复核。')}
      ${metric('AI 处理中', data.ai.avatarProcessing, `${data.ai.avatarStuck} 个可能卡住`, '超过 5 分钟未更新会进入卡住计数。')}
      ${metric('审核任务', data.moderation?.pending ?? data.content.pendingReports, `${data.moderation?.escalated || 0} 个升级`, '统一内容安全任务池：举报、被举报动态/评论、地点点评和新增地点。')}
      ${metric('地点待审', data.places.pendingReviews + data.places.pendingSubmissions, `${data.places.total} 个地点`, '地点点评与新增地点提交合计。')}
      ${metric('通知触达', data.notifications?.campaigns || 0, `${data.notifications?.devices || 0} 台设备`, '后台系统通知发送批次和当前注册推送设备数。')}
      ${metric('移动端事件', numberText(data.events?.total || 0), `${numberText(data.events?.uniqueUsers || 0)} 位用户`, '页面、发现、地图、地点和通知点击等移动端行为事件。')}
    </div>
    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>运营压力分布</h2>
            <div class="section-sub">举报、地点、反馈、AI 卡住任务的处理量</div>
          </div>
          ${help('用于判断今天运营优先处理什么。后续会接 SLA 和负责人。')}
        </div>
        <div id="opsChart" class="chart"></div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>移动端配置</h2>
            <div class="section-sub">App 正在读取这些后台配置</div>
          </div>
        </div>
        ${configSnapshot(data.config)}
      </div>
    </div>
  `;
  renderOpsChart(data);
}

function configSnapshot(config) {
  return `
    <div class="switch-row"><span>宠友圈图片上限</span><strong>${config.social.petCircleMaxPhotos}</strong></div>
    <div class="switch-row"><span>附近默认半径</span><strong>${config.social.discoverRadiusKm}km</strong></div>
    <div class="switch-row"><span>私信上下文窗口</span><strong>${config.social?.messageAccess?.contextWindowLimit || 20}条</strong></div>
    <div class="switch-row"><span>形象生成额度</span><strong>${config.ai.petAvatarDailyLimit}/天</strong></div>
    <div class="switch-row"><span>AI 对话额度</span><strong>${config.ai.petChatDailyLimit}/天</strong></div>
    <div class="switch-row"><span>工单紧急 SLA</span><strong>${config.support?.slaHours?.urgent || 2}h</strong></div>
    <div class="switch-row"><span>事件埋点采样</span><strong>${config.analytics?.enabled === false ? '关闭' : `${config.analytics?.sampleRatePercent ?? 100}%`}</strong></div>
    <div class="switch-row"><span>宠友圈开关</span>${statusPill(config.features.petCircle ? 'active' : 'closed')}</div>
    <div class="switch-row"><span>地图地点开关</span>${statusPill(config.features.places ? 'active' : 'closed')}</div>
    <div class="switch-row"><span>App 公告</span>${statusPill(config.app?.announcement?.enabled ? 'active' : 'closed')}</div>
    <div class="switch-row"><span>版本更新</span>${statusPill(config.app?.update?.enabled ? 'active' : 'closed')}</div>
    <div class="switch-row"><span>启动提示</span>${statusPill(config.app?.splash?.enabled ? 'active' : 'closed')}</div>
  `;
}

function readinessStatusPill(status, label) {
  const value = String(status || '');
  const tone = value === 'ready' ? 'ok' : value === 'blocked' ? 'bad' : value === 'reserved' ? '' : 'warn';
  const text = label || ({
    blocked: '生产阻断',
    partial: '部分可用',
    ready: '测试可用',
    reserved: '已预留',
  }[value] || value || '-');
  return tonePill(text, tone);
}

function readinessPriorityPill(priority) {
  const value = String(priority || '-');
  const tone = value === 'P0' ? 'bad' : value === 'P1' ? 'warn' : '';
  return tonePill(value, tone);
}

function launchQuestionDecision(row) {
  if (!row.hasDecisionOverride) {
    return '<div class="cell-sub">尚未记录人工决策</div>';
  }
  return `
    <div class="cell-title">${escapeHtml(row.decisionNote || '-')}</div>
    <div class="cell-sub">${escapeHtml(row.decisionUpdatedBy || '-')} · ${formatTime(row.decisionUpdatedAt)}</div>
  `;
}

function launchQuestionActions(row) {
  return `
    <div class="actions">
      <button
        class="small-button"
        data-action="launch-question-update"
        data-id="${escapeHtml(row.id)}"
        data-note="${escapeHtml(row.decisionNote || '')}"
        data-owner="${escapeHtml(row.owner || '')}"
        data-question="${escapeHtml(row.question || '')}"
        data-status="${escapeHtml(row.status || 'open')}"
      >更新</button>
      ${row.hasDecisionOverride ? `<button class="small-button ghost" data-action="launch-question-reset" data-id="${escapeHtml(row.id)}" data-question="${escapeHtml(row.question || '')}">重置</button>` : ''}
    </div>
  `;
}

async function updateLaunchReadinessQuestion(button) {
  const id = button.dataset.id || '';
  const question = button.dataset.question || id;
  const status = window.prompt(`更新「${question}」状态：open / reviewing / ready / deferred`, button.dataset.status || 'open');
  if (status === null) return;
  const owner = window.prompt('负责人或决策来源', button.dataset.owner || '待业务确认');
  if (owner === null) return;
  const note = window.prompt('决策备注，会显示在上线台账', button.dataset.note || '');
  if (note === null) return;
  const reason = window.prompt('请输入更新原因，会写入审计日志', `更新上线台账问题：${question}`);
  if (reason === null) return;
  if (!note.trim() || !reason.trim()) {
    showToast('请填写决策备注和更新原因');
    return;
  }
  await post(`/admin/launch/readiness/questions/${encodeURIComponent(id)}`, {
    note: note.trim(),
    owner: owner.trim(),
    reason: reason.trim(),
    status: status.trim(),
  });
  state.cache = { ...state.cache, audit: null, launchReadiness: null };
  showToast('上线台账已更新');
  await render(true);
}

async function resetLaunchReadinessQuestion(button) {
  const id = button.dataset.id || '';
  const question = button.dataset.question || id;
  if (!window.confirm(`确认重置「${question}」的人工决策记录？会回到动态台账默认口径。`)) return;
  const reason = window.prompt('请输入重置原因，会写入审计日志', `重置上线台账问题：${question}`);
  if (reason === null) return;
  if (!reason.trim()) {
    showToast('请填写重置原因');
    return;
  }
  await post(`/admin/launch/readiness/questions/${encodeURIComponent(id)}`, {
    reason: reason.trim(),
    reset: true,
  });
  state.cache = { ...state.cache, audit: null, launchReadiness: null };
  showToast('上线台账记录已重置');
  await render(true);
}

async function renderLaunchReadiness(force) {
  const data = await load('launchReadiness', '/admin/launch/readiness', force);
  const summary = data.summary || {};
  const linkageSummary = data.linkage?.summary || {};
  const modules = data.modules || [];
  const questions = data.questions || [];
  const gaps = data.gaps || [];
  const attentionItems = data.linkage?.attentionItems || [];
  const productionBlockers = gaps.filter((gap) => gap.status !== 'ready' && (gap.status === 'blocked' || gap.severity === 'P0'));
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('上线口径', summary.status === 'ready' ? '可复核' : '需治理', `${numberText(summary.readyModules || 0)} 个模块测试可用`, summary.statusLabel || '这里不是宣布生产完成，而是把测试可用、部分可用、生产阻断分开。')}
      ${metric('P0 待处理', numberText(summary.openP0 || 0), '生产前必须确认', 'P0 包含安全、合规、内容安全、数据底座和高风险配置等事项。')}
      ${metric('待澄清问题', numberText(summary.openQuestions || 0), '需要业务拍板', '这些问题来自运营后台 PRD 的上线前确认清单，并在这里持续收口。')}
      ${metric('配置联动', `${numberText(summary.linkedConfigItems || 0)}/${numberText(summary.totalConfigItems || 0)}`, `${numberText(linkageSummary.reserved || 0)} 项预留`, '统计配置中心里真实前后端联动、仅后端、仅移动端和预留项。')}
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>模块上线台账</h2>
            <div class="section-sub">按“测试可用 / 部分可用 / 生产阻断”拆开，不把预留能力误标完成</div>
          </div>
          ${help('测试可用代表当前后台和移动端联动已经能支撑真机测试；生产上线仍要看右侧 P0/P1 缺口。')}
        </div>
        ${tableHtml(modules, [
          ['模块', (row) => `<div class="cell-title">${escapeHtml(row.module)}</div><div class="cell-sub">${escapeHtml(row.group || '-')} · ${escapeHtml(row.key || '-')}</div>`],
          ['状态', (row) => readinessStatusPill(row.status, row.statusLabel)],
          ['后台证据', (row) => `<div class="cell-sub clamp">${escapeHtml(row.evidence || '-')}</div>`],
          ['移动端联动', (row) => `<div class="cell-sub clamp">${escapeHtml(row.mobileLinkage || '-')}</div>`],
          ['下一步', (row) => `<div class="cell-sub clamp">${escapeHtml(row.nextStep || '-')}</div>`],
        ], '暂无模块台账')}
      </div>

      <div class="card">
        <div class="section-head">
          <div>
            <h2>生产阻断</h2>
            <div class="section-sub">P0/P1 风险和必须补齐的治理动作</div>
          </div>
          ${help('这里优先展示会影响生产上线安全、合规、内容安全、数据和高风险操作的缺口。')}
        </div>
        ${tableHtml(productionBlockers, [
          ['级别', (row) => readinessPriorityPill(row.severity)],
          ['领域', (row) => `<div class="cell-title">${escapeHtml(row.area)}</div><div class="cell-sub">${escapeHtml(row.key)}</div>`],
          ['状态', (row) => readinessStatusPill(row.status, row.statusLabel)],
          ['问题', (row) => `<div class="cell-sub clamp">${escapeHtml(row.issue || '-')}</div>`],
          ['动作', (row) => `<div class="cell-sub clamp">${escapeHtml(row.requiredAction || '-')}</div>`],
        ], '暂无生产阻断')}
      </div>
    </div>

    <div class="card">
      <div class="section-head">
        <div>
          <h2>上线前必须确认</h2>
          <div class="section-sub">持续需要你拍板的问题</div>
        </div>
        ${help('这些不是代码 TODO，而是业务、合规或运营策略选择。确认后才能进入对应实现或上线口径。')}
      </div>
      ${tableHtml(questions, [
        ['级别', (row) => readinessPriorityPill(row.priority)],
        ['问题', (row) => `<div class="cell-title">${escapeHtml(row.question)}</div><div class="cell-sub">${escapeHtml(row.id)}</div>`],
        ['当前口径', (row) => `<div class="cell-sub clamp">${escapeHtml(row.currentPolicy || '-')}</div>`],
        ['影响', (row) => `<div class="cell-sub clamp">${escapeHtml(row.impact || '-')}</div>`],
        ['状态', (row) => `${statusPill(row.statusLabel || row.status)}<div class="cell-sub">${escapeHtml(row.owner || '-')}</div>`],
        ['决策记录', (row) => launchQuestionDecision(row)],
        ['操作', (row) => launchQuestionActions(row)],
      ], '暂无待确认问题')}
    </div>

    <div class="card">
      <div class="section-head">
        <div>
          <h2>配置联动关注项</h2>
          <div class="section-sub">非“前后端联动”的配置项</div>
        </div>
        ${help('这里从配置中心联动体检抽取：仅后端、仅移动端、预留或待接入的项目，方便上线前逐项核对。')}
      </div>
      ${tableHtml(attentionItems, [
        ['状态', (item) => configLinkageStatusPill(item.status, item.statusLabel)],
        ['配置', (item) => `<div class="cell-title">${escapeHtml(item.label)}</div><div class="cell-sub">${escapeHtml(item.key)} · ${escapeHtml(item.group || '-')}</div>`],
        ['当前值', (item) => `<div class="cell-sub">${escapeHtml(item.currentValue || '-')}</div>`],
        ['影响', (item) => `<div class="cell-sub clamp">${escapeHtml(item.userImpact || item.operatorNote || '-')}</div>`],
      ], '暂无需要关注的配置项')}
    </div>

    <div class="card">
      <div class="section-head">
        <div>
          <h2>完整生产风险台账</h2>
          <div class="section-sub">保留 P1/P2 和长期治理项，避免后续口头遗漏</div>
        </div>
        ${help('这个表适合每轮上线前回看：哪些已经处理，哪些仍只是测试阶段可接受。')}
      </div>
      ${tableHtml(gaps, [
        ['级别', (row) => readinessPriorityPill(row.severity)],
        ['领域', (row) => `<div class="cell-title">${escapeHtml(row.area)}</div><div class="cell-sub">${escapeHtml(row.key)}</div>`],
        ['状态', (row) => readinessStatusPill(row.status, row.statusLabel)],
        ['问题', (row) => `<div class="cell-sub clamp">${escapeHtml(row.issue || '-')}</div>`],
        ['必须动作', (row) => `<div class="cell-sub clamp">${escapeHtml(row.requiredAction || '-')}</div>`],
        ['证据', (row) => `<div class="cell-sub clamp">${escapeHtml(row.evidence || '-')}</div>`],
      ], '暂无生产风险')}
    </div>

    <div class="cell-sub">生成时间：${formatTime(data.generatedAt)}</div>
  `;
}

function adminAccountActionCell(row) {
  if (row.source === 'env') {
    return '<span class="cell-sub">环境变量账号请在服务器环境变量中维护。</span>';
  }
  const disabled = row.status === 'disabled';
  return `
    <div class="actions">
      <button class="small-button" data-action="${disabled ? 'admin-account-enable' : 'admin-account-disable'}" data-id="${escapeHtml(row.id)}" data-username="${escapeHtml(row.username)}">${disabled ? '启用' : '禁用'}</button>
      <button class="small-button ghost" data-action="admin-account-reset-password" data-id="${escapeHtml(row.id)}" data-username="${escapeHtml(row.username)}">重置密码</button>
    </div>
  `;
}

async function handleAdminAccountCreate() {
  const username = $('adminAccountUsername').value.trim();
  const displayName = $('adminAccountDisplayName').value.trim();
  const password = $('adminAccountPassword').value;
  const reason = $('adminAccountReason').value.trim() || '新增后台管理员账号';
  await post('/admin/accounts', { displayName, password, reason, username });
  ['adminAccountUsername', 'adminAccountDisplayName', 'adminAccountPassword'].forEach((id) => {
    const node = $(id);
    if (node) node.value = '';
  });
  state.cache.adminAccounts = null;
  state.cache.audit = null;
  showToast('后台账号已创建');
  await render(true);
}

async function handleAdminAccountStatus(button, action) {
  const username = button.dataset.username || '该账号';
  const verb = action === 'disable' ? '禁用' : '启用';
  const reason = window.prompt(`请输入${verb} ${username} 的原因`, `${verb}后台管理员账号`);
  if (reason === null) return;
  if (!window.confirm(`确认${verb}后台账号 ${username}？`)) return;
  await post(`/admin/accounts/${encodeURIComponent(button.dataset.id)}/${action}`, { reason: reason.trim() || `${verb}后台管理员账号` });
  state.cache.adminAccounts = null;
  state.cache.audit = null;
  showToast(`账号已${verb}`);
  await render(true);
}

async function handleAdminAccountPasswordReset(button) {
  const username = button.dataset.username || '该账号';
  const password = window.prompt(`请输入 ${username} 的新密码（至少 10 位，含字母和数字）`);
  if (password === null) return;
  const reason = window.prompt('请输入重置密码原因', '重置后台管理员密码');
  if (reason === null) return;
  await post(`/admin/accounts/${encodeURIComponent(button.dataset.id)}/reset-password`, { password, reason: reason.trim() || '重置后台管理员密码' });
  state.cache.adminAccounts = null;
  state.cache.audit = null;
  showToast('账号密码已重置');
  await render(true);
}

async function renderAdminAccounts(force) {
  const data = await load('adminAccounts', '/admin/accounts', force);
  const summary = data.summary || {};
  const session = data.currentSession || {};
  const loginSecurity = data.loginSecurity || {};
  const ipAllowlist = data.security?.ipAllowlist || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('管理员账号', numberText(summary.activeAccounts || 0), `${numberText(summary.stateAccounts || 0)} 个 state 账号`, '后台账号与 App 用户账号分离。环境变量 admin 仍可用，新增账号保存在服务端 state。')}
      ${metric('已开放权限', numberText(summary.activePermissions || 0), 'admin 全量权限', '当前没有细角色拦截，页面明确列出实际开放能力和生产期预留角色。')}
      ${metric('安全关注', numberText(summary.securityWarnings || 0), `${numberText(summary.reservedRoles || 0)} 个预留角色`, '多管理员基础能力已接入；MFA、细角色拦截和密码轮换仍是生产期治理能力。')}
      ${metric('登录保护', loginSecurity.locked ? '已锁定' : `${numberText(loginSecurity.failedAttempts || 0)}/${numberText(loginSecurity.maxAttempts || 5)}`, loginSecurity.locked ? `到 ${formatTime(loginSecurity.lockedUntil)}` : `${numberText(loginSecurity.lockMinutes || 15)} 分钟锁定`, '连续失败达到阈值后，后台会临时锁定登录，并写入审计日志。')}
      ${metric('IP 白名单', ipAllowlist.configured ? '已启用' : '未启用', ipAllowlist.configured ? `${numberText(ipAllowlist.entryCount || 0)} 条规则 · 当前 IP ${ipAllowlist.allowed ? '允许' : '不允许'}` : '配置环境变量后生效', '配置 LUMII_ADMIN_IP_ALLOWLIST 后，/admin 页面和 /admin/* API 都会拦截非白名单 IP。')}
      ${metric('当前会话', session.expiresAt ? formatTime(session.expiresAt) : '-', `${escapeHtml(session.ip || 'IP 未记录')}`, '当前后台 token 的到期时间、请求 IP 和 User-Agent 摘要。')}
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>新增后台账号</h2>
            <div class="section-sub">保存到服务端 state · 当前统一 admin 权限</div>
          </div>
          ${help('这是多管理员底座，不会复用 App 手机号账号。密码只保存 PBKDF2 哈希，不会在后台回显。当前阶段新增账号均按 admin 权限处理，后续再接细角色拦截。')}
        </div>
        <div class="form-grid">
          <label>账号名<input id="adminAccountUsername" maxlength="64" placeholder="例如 ops_admin_01" /></label>
          <label>显示名称<input id="adminAccountDisplayName" maxlength="40" placeholder="例如 运营管理员" /></label>
          <label>初始密码<input id="adminAccountPassword" type="password" autocomplete="new-password" placeholder="至少 10 位，含字母和数字" /></label>
          <label>操作原因<input id="adminAccountReason" maxlength="120" value="新增后台管理员账号" /></label>
          <div class="form-actions">
            <button class="primary-button" data-action="admin-account-create">创建账号</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-head">
          <div>
            <h2>安全检查</h2>
            <div class="section-sub">密码来源、MFA、IP 白名单和多账号状态</div>
          </div>
          ${help('当前已支持单 admin、登录失败锁定和后端 IP 白名单；生产期还要接入 MFA、多管理员和账号禁用/轮换。')}
        </div>
        ${tableHtml(data.security?.checks || [], [
          ['状态', (row) => healthStatusPill(row.status)],
          ['检查项', (row) => `<div class="cell-title">${escapeHtml(row.label)}</div><div class="cell-sub">${escapeHtml(row.key)}</div>`],
          ['说明', (row) => `<div>${escapeHtml(row.detail || '-')}</div><div class="cell-sub">${escapeHtml(row.evidence || '-')}</div>`],
        ], '暂无安全检查')}
      </div>
    </div>

    <div class="card">
      <div class="section-head">
        <div>
          <h2>后台账号列表</h2>
          <div class="section-sub">环境变量账号 + state 账号；禁用后 token 会失效</div>
        </div>
        ${help('环境变量账号不能在页面禁用或重置密码，仍需在服务器环境变量中维护。state 账号可禁用、启用和重置密码，所有操作都会写审计日志。')}
      </div>
      ${tableHtml(data.accounts || [], [
        ['账号', (row) => `<div class="cell-title">${escapeHtml(row.displayName || row.username)}</div><div class="cell-sub">${escapeHtml(row.id)} · ${escapeHtml(row.username)} · ${escapeHtml(row.source || '-')}</div>`],
        ['角色', (row) => `<div>${(row.roleIds || []).map((role) => statusPill(role)).join(' ')}</div><div class="cell-sub">${row.mfaEnabled ? 'MFA 已启用' : 'MFA 未启用'}</div>`],
        ['状态', (row) => `${statusPill(row.status)}<div class="cell-sub">${row.disabledAt ? `禁用：${formatTime(row.disabledAt)}` : row.lastLoginAt ? `最近登录 ${formatTime(row.lastLoginAt)}` : '暂无登录记录'}</div>`],
        ['最近 IP', (row) => `<div class="cell-sub">${escapeHtml(row.lastLoginIp || 'IP 未记录')}</div>`],
        ['密码', (row) => `<div class="cell-sub">${row.passwordUpdatedAt ? `最近更新 ${formatTime(row.passwordUpdatedAt)}` : row.source === 'env' ? '环境变量维护' : '未记录'}</div>`],
        ['操作', (row) => adminAccountActionCell(row)],
      ], '暂无后台账号')}
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>登录保护</h2>
            <div class="section-sub">失败计数、临时锁定和最近失败来源</div>
          </div>
          ${help('当前单 admin 账号共用一套失败计数。连续失败达到阈值会临时锁定登录；成功登录后自动清零。')}
        </div>
        ${tableHtml([loginSecurity], [
          ['状态', (row) => row.locked ? tonePill('已锁定', 'bad') : tonePill('正常', 'ok')],
          ['失败计数', (row) => `<div class="cell-title">${numberText(row.failedAttempts || 0)} / ${numberText(row.maxAttempts || 5)}</div><div class="cell-sub">累计锁定 ${numberText(row.lockCount || 0)} 次</div>`],
          ['策略', (row) => `<div>连续失败锁定 ${numberText(row.lockMinutes || 15)} 分钟</div><div class="cell-sub">环境变量可调阈值和时长</div>`],
          ['最近失败', (row) => `<div>${row.lastFailedAt ? formatTime(row.lastFailedAt) : '-'}</div><div class="cell-sub">${escapeHtml(row.lastFailedIp || 'IP 未记录')}</div>`],
          ['锁定到', (row) => row.locked ? `<div>${formatTime(row.lockedUntil)}</div><div class="cell-sub">剩余约 ${numberText(row.remainingLockMinutes || 0)} 分钟</div>` : '<span class="cell-sub">未锁定</span>'],
        ], '暂无登录保护状态')}
      </div>

      <div class="card">
        <div class="section-head">
          <div>
            <h2>最近失败登录</h2>
            <div class="section-sub">来自 admin.login.failed / locked 审计日志</div>
          </div>
          ${help('失败登录也写审计，方便后续排查撞库、误输密码或异常 IP。')}
        </div>
        ${tableHtml(data.recentFailedLogins || [], [
          ['动作', (row) => `<div class="cell-title">${escapeHtml(row.action || '-')}</div><div class="cell-sub">${escapeHtml(row.id || '-')}</div>`],
          ['账号/IP', (row) => `<div>${escapeHtml(row.adminName || '-')}</div><div class="cell-sub">${escapeHtml(row.ip || 'IP 未记录')}</div>`],
          ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.reason || '-')}</div>`],
          ['时间', (row) => `<div>${formatTime(row.createdAt)}</div><div class="cell-sub clamp">${escapeHtml(row.userAgent || 'UA 未记录')}</div>`],
        ], '暂无失败登录记录')}
      </div>
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>角色边界</h2>
            <div class="section-sub">实际 admin 与生产期预留角色</div>
          </div>
          ${help('预留角色不会影响当前权限判断，只用于标记后续生产治理方向。')}
        </div>
        ${tableHtml(data.roles || [], [
          ['状态', (row) => row.status === 'active' ? tonePill('已启用', 'ok') : tonePill('预留', 'warn')],
          ['角色', (row) => `<div class="cell-title">${escapeHtml(row.label)}</div><div class="cell-sub">${escapeHtml(row.key)}</div>`],
          ['说明', (row) => `<div class="cell-sub clamp">${escapeHtml(row.note || '-')}</div>`],
        ], '暂无角色')}
      </div>

      <div class="card">
        <div class="section-head">
          <div>
            <h2>权限点</h2>
            <div class="section-sub">当前 admin 已开放能力清单</div>
          </div>
          ${help('这一版所有开放的后台功能都由 admin 访问；后续细角色会按这里的权限点拆分。')}
        </div>
        ${tableHtml(data.permissions || [], [
          ['分组', (row) => statusPill(row.group || '-')],
          ['权限点', (row) => `<div class="cell-title">${escapeHtml(row.key)}</div><div class="cell-sub">${escapeHtml(row.label)}</div>`],
          ['状态', (row) => statusPill(row.status || 'active')],
        ], '暂无权限点')}
      </div>
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>最近登录</h2>
            <div class="section-sub">来自 admin.login 审计日志</div>
          </div>
          ${help('登录记录来自审计日志；历史记录若没有 IP 或 UA，说明当时版本尚未记录这些字段。')}
        </div>
        ${tableHtml(data.recentLogins || [], [
          ['管理员', (row) => `<div class="cell-title">${escapeHtml(row.adminName || '-')}</div><div class="cell-sub">${escapeHtml(row.id || '-')}</div>`],
          ['IP', (row) => `<div class="cell-sub">${escapeHtml(row.ip || 'IP 未记录')}</div>`],
          ['时间', (row) => `<div>${formatTime(row.createdAt)}</div><div class="cell-sub clamp">${escapeHtml(row.userAgent || 'UA 未记录')}</div>`],
        ], '暂无登录记录')}
      </div>

      <div class="card">
        <div class="section-head">
          <div>
            <h2>最近高风险动作</h2>
            <div class="section-sub">删除、配置、导出、处罚等动作</div>
          </div>
          ${help('高风险动作来自审计 action 关键词匹配，用于快速复核最近敏感操作，不替代完整审计日志。')}
        </div>
        ${tableHtml(data.recentHighRiskActions || [], [
          ['动作', (row) => `<div class="cell-title">${escapeHtml(row.action || '-')}</div><div class="cell-sub">${escapeHtml(row.id || '-')}</div>`],
          ['目标', (row) => `<div>${statusPill(row.targetType || '-')}</div><div class="cell-sub">${escapeHtml(row.targetId || '-')}</div>`],
          ['原因/时间', (row) => `<div class="cell-sub clamp">${escapeHtml(row.reason || '未填写')}</div><div>${formatTime(row.createdAt)}</div>`],
        ], '暂无高风险动作')}
      </div>
    </div>
  `;
}

function healthStatusPill(status) {
  const value = String(status || 'ok');
  const label = value === 'bad' ? '异常' : value === 'warn' ? '关注' : value === 'ok' ? '正常' : value;
  const tone = value === 'bad' ? 'bad' : value === 'warn' ? 'warn' : 'ok';
  return tonePill(label, tone);
}

function renderMediaProbe(probe = {}) {
  const head = probe.head || {};
  const get = probe.get || {};
  const getHeaders = get.headers || {};
  const headHeaders = head.headers || {};
  const getStatus = get.error ? `ERROR ${get.error}` : `${get.status || '-'} ${get.statusText || ''}`.trim();
  const headStatus = head.error ? `ERROR ${head.error}` : `${head.status || '-'} ${head.statusText || ''}`.trim();
  const location = getHeaders.location || '';
  const title = probe.kind === 'cdn' ? '媒体 CDN 探测' : 'App 媒体探测';
  const helpText = probe.kind === 'cdn'
    ? '这里会用 CDN 域名请求一个真实 COS 对象，并关闭自动跳转。如果 GET 被腾讯 CDN 302 到 webblock，说明 CDN 仍需处理；只要 App 媒体探测正常，当前 App 可继续走源站。'
    : '这里会用 App 实际返回给移动端的媒体 base URL 请求真实 COS 对象，并关闭自动跳转。这个探测失败才代表 App 实际媒体加载不可用。';
  return `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <div class="section-sub">用真实 storage object 做 HEAD + Range GET，不被“HEAD 假通”误导</div>
        </div>
        ${help(helpText)}
      </div>
      <div class="grid two compact-grid">
        <div>
          <div class="switch-row"><span>探测状态</span><strong>${healthStatusPill(probe.status)}</strong></div>
          <div class="switch-row"><span>Base URL</span><strong class="cell-sub clamp">${escapeHtml(probe.baseUrl || '-')}</strong></div>
          <div class="switch-row"><span>样本来源</span><strong>${escapeHtml(probe.source || '-')}</strong></div>
          <div class="switch-row"><span>对象 Key</span><strong class="cell-sub clamp">${escapeHtml(probe.objectKey || '-')}</strong></div>
        </div>
        <div>
          <div class="switch-row"><span>HEAD</span><strong>${escapeHtml(headStatus)}</strong></div>
          <div class="switch-row"><span>GET</span><strong>${escapeHtml(getStatus)}</strong></div>
          <div class="switch-row"><span>缓存</span><strong>${escapeHtml(getHeaders.cacheLookup || headHeaders.cacheLookup || '-')}</strong></div>
          <div class="switch-row"><span>Log UUID</span><strong class="cell-sub clamp">${escapeHtml(getHeaders.xNwsLogUuid || headHeaders.xNwsLogUuid || '-')}</strong></div>
        </div>
      </div>
      <div class="callout ${probe.status === 'bad' ? 'bad' : probe.status === 'ok' ? 'ok' : ''}">
        <strong>${escapeHtml(probe.detail || '-')}</strong>
        <span>${escapeHtml(probe.evidence || '-')}</span>
      </div>
      ${location ? `<div class="switch-row"><span>GET Location</span><strong class="cell-sub clamp">${escapeHtml(location)}</strong></div>` : ''}
      <div class="switch-row"><span>探测 URL</span><strong class="cell-sub clamp">${escapeHtml(probe.url || '-')}</strong></div>
    </div>
  `;
}

async function renderSystemHealth(force) {
  const data = await load('systemHealth', '/admin/system/health', force);
  const summary = data.summary || {};
  const runtime = data.runtime || {};
  const stateFile = data.stateFile || {};
  const memory = data.resources?.memory || {};
  const heapUsed = Number(memory.heapUsed || 0);
  const heapTotal = Number(memory.heapTotal || 0);
  const heapFoot = heapTotal ? `${bytesText(heapUsed)} / ${bytesText(heapTotal)}` : bytesText(heapUsed);
  const mediaProbeCard = [renderMediaProbe(data.mediaProbe || {}), data.mediaCdnProbe ? renderMediaProbe(data.mediaCdnProbe) : ''].join('');
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('整体状态', data.status === 'bad' ? '异常' : data.status === 'warn' ? '需关注' : '正常', `${summary.warn || 0} 关注 · ${summary.bad || 0} 异常`, '系统健康聚合运行、存储、关键外部配置和业务积压。')}
      ${metric('运行时长', durationText(runtime.uptimeSeconds), `${escapeHtml(runtime.nodeVersion || '-')} · PID ${escapeHtml(runtime.pid || '-')}`, '后端 Node 进程当前持续运行时间。')}
      ${metric('状态文件', bytesText(stateFile.sizeBytes), stateFile.exists ? `更新 ${formatTime(stateFile.modifiedAt)}` : '不可读', '当前文件态后端的 JSON state 体积和更新时间。')}
      ${metric('内存堆', heapFoot, `RSS ${bytesText(memory.rss || 0)}`, 'Node.js 进程内存快照，用于排查异常增长。')}
    </div>

    ${mediaProbeCard}

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>健康检查</h2>
            <div class="section-sub">${numberText(summary.checks || 0)} 个检查项 · ${numberText(summary.users || 0)} 个用户</div>
          </div>
          ${help('这里是运营后台内置体检，不替代服务器监控、日志告警或 APM；但能快速发现默认密码、存储、AI、地图和积压问题。')}
        </div>
        ${tableHtml(data.checks || [], [
          ['状态', (row) => healthStatusPill(row.status)],
          ['检查项', (row) => `<div class="cell-title">${escapeHtml(row.label)}</div><div class="cell-sub">${escapeHtml(row.key)}</div>`],
          ['说明', (row) => `<div>${escapeHtml(row.detail || '-')}</div><div class="cell-sub clamp">${escapeHtml(row.evidence || '-')}</div>`],
        ], '暂无健康检查')}
      </div>

      <div class="card">
        <div class="section-head">
          <div>
            <h2>运行环境</h2>
            <div class="section-sub">${escapeHtml(runtime.env || '-')} · ${escapeHtml(runtime.platform || '-')}</div>
          </div>
          ${help('不展示任何密钥值，只展示运行端口、状态文件和 Node 运行信息。')}
        </div>
        <div class="switch-row"><span>服务端口</span><strong>${escapeHtml(runtime.port || '-')}</strong></div>
        <div class="switch-row"><span>Node 版本</span><strong>${escapeHtml(runtime.nodeVersion || '-')}</strong></div>
        <div class="switch-row"><span>运行平台</span><strong>${escapeHtml(runtime.platform || '-')}</strong></div>
        <div class="switch-row"><span>状态文件</span><strong>${stateFile.exists ? '可读' : '不可读'}</strong></div>
        <div class="switch-row"><span>状态路径</span><strong class="cell-sub clamp">${escapeHtml(stateFile.path || '-')}</strong></div>
        <div class="switch-row"><span>生成时间</span><strong>${formatTime(data.generatedAt)}</strong></div>
      </div>
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>业务积压</h2>
            <div class="section-sub">AI、审核、工单、申诉、通知和埋点</div>
          </div>
          ${help('这些不是系统故障，但能提示运营优先处理队列。')}
        </div>
        ${tableHtml(data.queues || [], [
          ['状态', (row) => healthStatusPill(row.status)],
          ['队列', (row) => `<div class="cell-title">${escapeHtml(row.label)}</div><div class="cell-sub">${escapeHtml(row.detail || '-')}</div>`],
          ['数量', (row) => `<div class="cell-title">${numberText(row.value || 0)}</div>`],
        ], '暂无业务积压')}
      </div>

      <div class="card">
        <div class="section-head">
          <div>
            <h2>状态集合</h2>
            <div class="section-sub">JSON state 内关键集合行数</div>
          </div>
          ${help('当前后端仍是文件态联调架构，这里用于观察数据膨胀；生产期应迁移到数据库和独立审计存储。')}
        </div>
        ${tableHtml(data.collections || [], [
          ['集合', (row) => `<div class="cell-title">${escapeHtml(row.label)}</div><div class="cell-sub">${escapeHtml(row.key)}</div>`],
          ['行数', (row) => `<div class="cell-title">${numberText(row.rows || 0)}</div>`],
        ], '暂无集合统计')}
      </div>
    </div>
  `;
}

function renderOpsChart(data) {
  if (!window.echarts) {
    $('opsChart').innerHTML = '<div class="placeholder">图表组件加载中</div>';
    return;
  }
  const chart = echarts.init($('opsChart'));
  chart.setOption({
    color: ['#ff7f4f', '#48b6a8', '#c99637', '#dc604e'],
    grid: { bottom: 28, left: 38, right: 14, top: 20 },
    tooltip: {},
    xAxis: { axisLine: { show: false }, axisTick: { show: false }, data: ['举报', '地点待审', '反馈', 'AI卡住'], type: 'category' },
    yAxis: { splitLine: { lineStyle: { color: 'rgba(91,70,48,.1)' } }, type: 'value' },
    series: [{
      barMaxWidth: 34,
      data: [
        data.moderation?.pending ?? data.content.pendingReports,
        data.places.pendingReviews + data.places.pendingSubmissions,
        data.feedback.open,
        data.ai.avatarStuck,
      ],
      itemStyle: { borderRadius: [10, 10, 0, 0] },
      type: 'bar',
    }],
  });
}

async function renderAnalytics(force) {
  const query = new URLSearchParams({
    days: state.analyticsDays,
    eventName: state.analyticsEventName,
    platform: state.analyticsPlatform,
    q: state.analyticsQ,
    route: state.analyticsRoute,
    source: state.analyticsSource,
  });
  const data = await load(`analytics:${query.toString()}`, `/admin/analytics?${query.toString()}`, force);
  const summary = data.summary || {};
  const users = summary.users || {};
  const ai = summary.ai || {};
  const calendar = summary.calendar || {};
  const social = summary.social || {};
  const places = summary.places || {};
  const safety = summary.safety || {};
  const events = summary.events || {};
  const configPrompts = summary.configPrompts || {};
  const experimentMetrics = data.experimentMetrics || {};
  const eventDetail = data.eventDetail || {};
  const filterOptions = eventDetail.options || {};
  const cohorts = data.cohorts || {};
  const funnels = data.funnels || [];
  const aiFrontendStarts = ai.avatarFrontendStarts ?? 0;
  const aiFrontendSuccesses = ai.avatarFrontendSuccesses ?? 0;
  const aiFrontendFailures = ai.avatarFrontendFailures ?? 0;
  const petCircleFrontendClicks = (social.likeClicks || 0) + (social.commentClicks || 0) + (social.greetingClicks || 0) + (social.walkInviteClicks || 0);
  $('content').innerHTML = `
    <div class="card analytics-filter-card">
      <div class="section-head">
        <div>
          <h2>数据窗口与事件筛选</h2>
          <div class="section-sub">趋势、漏斗和 Cohort 使用同一时间窗口；事件明细额外支持事件名、来源和关键词筛选</div>
        </div>
        ${help('当前仍是 JSON state 测试期口径，适合排查功能链路和埋点是否正常；生产级长期留存建议迁移到独立事件表或数仓。')}
      </div>
      <div class="toolbar moderation-toolbar analytics-toolbar">
        <div class="toolbar-left">
          <label>时间窗口
            <select id="analyticsDays">
              ${option('7', '近 7 天', state.analyticsDays)}
              ${option('14', '近 14 天', state.analyticsDays)}
              ${option('30', '近 30 天', state.analyticsDays)}
              ${option('60', '近 60 天', state.analyticsDays)}
              ${option('90', '近 90 天', state.analyticsDays)}
            </select>
          </label>
          <label>事件名
            <select id="analyticsEventName">
              ${option('all', '全部事件', state.analyticsEventName)}
              ${(filterOptions.names || []).map((item) => option(item.value, item.label, state.analyticsEventName)).join('')}
            </select>
          </label>
          <label>页面
            <select id="analyticsRoute">
              ${option('all', '全部页面', state.analyticsRoute)}
              ${(filterOptions.routes || []).map((item) => option(item, item, state.analyticsRoute)).join('')}
            </select>
          </label>
          <label>来源
            <select id="analyticsSource">
              ${option('all', '全部来源', state.analyticsSource)}
              ${(filterOptions.sources || []).map((item) => option(item, item, state.analyticsSource)).join('')}
            </select>
          </label>
          <label>平台
            <select id="analyticsPlatform">
              ${option('all', '全部平台', state.analyticsPlatform)}
              ${(filterOptions.platforms || []).map((item) => option(item, item, state.analyticsPlatform)).join('')}
            </select>
          </label>
          <label>关键词
            <input id="analyticsQ" placeholder="手机号、宠物名、事件属性" value="${escapeHtml(state.analyticsQ)}" />
          </label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="analytics-filter">筛选</button>
          <button class="small-button ghost" data-action="analytics-clear">清空</button>
        </div>
      </div>
    </div>
    <div class="grid metrics">
      ${metric('AI 前端漏斗', `${numberText(ai.avatarEntryClicks || 0)} / ${numberText(aiFrontendStarts)}`, `${numberText(aiFrontendSuccesses)} 成功 · ${numberText(aiFrontendFailures)} 失败`, '来自移动端入口点击、开始生成、结果成功和结果失败事件；用于排查用户是否卡在前端流程，而不是只看后端任务结果。')}
      ${metric('新增用户', numberText(users.newUsers), `${numberText(users.activeUsers)} 位窗口内活跃`, '基于用户注册时间和 lastSeenAt 聚合，默认 14 天窗口。')}
      ${metric('建档率', percentText(users.withPetRate), `${numberText(users.total)} 个账号`, '当前用户中至少有一只宠物档案的比例。')}
      ${metric('AI 形象成功率', percentText(ai.avatarSuccessRate), `${numberText(ai.avatarReady)} 成功 / ${numberText(ai.avatarFailed)} 失败`, '按窗口内 ready 与 failed 任务计算；处理中任务不进入分母。')}
      ${metric('AI 平均耗时', secondsText(ai.avatarAverageSeconds), `成本累计 ${moneyText(ai.gptImage2Cost)}`, '使用任务创建到更新时间估算，适合发现卡住和异常耗时。')}
      ${metric('宠友圈小事', numberText(social.posts), `${numberText(social.images)} 张图 · ${numberText(social.comments)} 条评论`, '来自移动端发布、图片、评论和点赞的当前业务数据。')}
      ${metric('小事前端互动', numberText(petCircleFrontendClicks), `${numberText(social.cardExposures || events.petCircleCardExposures || 0)} 次卡片曝光`, '来自移动端小事卡片曝光、点赞、评论、招呼和约遛点击事件；用于衡量列表浏览到互动的转化。')}
      ${metric('移动端事件', numberText(events.total), `${numberText(events.uniqueUsers)} 位用户 · ${numberText(events.sampleRatePercent)}%采样`, `埋点${events.enabled === false ? '已关闭' : '已开启'}，保留 ${numberText(events.retentionDays || 30)} 天。`)}
      ${metric('配置触达', numberText(configPrompts.totalImpressions || 0), `${numberText(configPrompts.totalActions || 0)} 次点击 · ${percentText(configPrompts.totalActionRate || 0)}`, '来自公告、启动提示和版本更新弹窗的展示与主按钮点击事件；用于判断后台配置是否真的触达用户。')}
      ${metric('地图行为', numberText(places.mapOpens), `搜索 ${numberText(places.poiSearches)} · 详情 ${numberText(places.placeDetailViews)}`, '来自移动端地图打开、POI 搜索和地点详情查看事件。')}
      ${metric('安全任务', numberText(safety.moderationTasks), `${numberText(safety.handledModerationTasks)} 已处理`, '统一内容安全任务池：举报、被举报内容、地点点评和新增地点。')}
      ${metric('安全样本复审', numberText(safety.sampleUnreviewed || 0), `复审率 ${percentText(safety.sampleReviewRate)} · 误杀/漏杀 ${numberText(safety.falsePositive || 0)}/${numberText(safety.falseNegative || 0)}`, '风险命中和抽样复审沉淀到样本池；待复审越高，说明规则质量需要运营回看。')}
    </div>
    ${renderAnalyticsExperimentPanel(experimentMetrics)}
    <div class="grid two analytics-grid">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>用户增长与活跃</h2>
            <div class="section-sub">新增用户、窗口内活跃用户</div>
          </div>
          ${help('当前没有完整 DAU 事件流水，活跃按 lastSeenAt 落到日期桶。')}
        </div>
        <div id="analyticsGrowthChart" class="analytics-chart"></div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>AI 使用质量</h2>
            <div class="section-sub">形象生成、AI 对话和自动写入</div>
          </div>
          ${help('自动写入包括 AI 对话触发的备忘、体重、疫苗/驱虫、档案更新或医疗风险记录。')}
        </div>
        <div id="analyticsAiChart" class="analytics-chart"></div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>社交互动</h2>
            <div class="section-sub">小事、点赞、评论、招呼和约遛</div>
          </div>
          ${help('会话消息只统计发送方 author=me，避免双方镜像消息重复计算。')}
        </div>
        <div id="analyticsSocialChart" class="analytics-chart"></div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>移动端行为</h2>
            <div class="section-sub">页面、发现、地图、通知和配置触达</div>
          </div>
          ${help('事件只记录计数和非敏感属性；不存搜索词、地址、经纬度、正文、图片 URL。')}
        </div>
        <div id="analyticsEventChart" class="analytics-chart"></div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>运营处理压力</h2>
            <div class="section-sub">审核任务、样本复审、地点内容和工单</div>
          </div>
          ${help('内容安全样本用于回收误杀、漏杀和抽样质检；地点审核通过率基于已审核的点评和新增地点提交，不含待审核项。')}
        </div>
        <div id="analyticsOpsChart" class="analytics-chart"></div>
      </div>
    </div>
    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>核心漏斗</h2>
            <div class="section-sub">按手机号去重并校验事件顺序，帮助定位用户卡在哪一步</div>
          </div>
          ${help('这里统计的是窗口内同一用户按时间顺序完成的步骤，不是简单事件次数；事件次数会在每个步骤下方展示。')}
        </div>
        ${renderAnalyticsFunnels(funnels)}
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>轻量留存 Cohort</h2>
            <div class="section-sub">${numberText(cohorts.summary?.cohorts || 0)} 个注册日队列 · D1 ${percentText(cohorts.summary?.d1Rate || 0)} · D3 ${percentText(cohorts.summary?.d3Rate || 0)} · D7 ${percentText(cohorts.summary?.d7Rate || 0)}</div>
          </div>
          ${help('D0 为注册日用户数；D1/D3/D7 基于移动端事件判断是否回访。当前只适合测试期观察趋势，生产级需要独立事件表。')}
        </div>
        ${renderAnalyticsCohorts(cohorts.rows || [])}
      </div>
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>事件明细</h2>
          <div class="section-sub">匹配 ${numberText(eventDetail.summary?.matched || 0)} / 窗口 ${numberText(eventDetail.summary?.totalInWindow || 0)} 条 · 最近 ${formatTime(eventDetail.summary?.latestAt)}</div>
        </div>
        ${help('事件明细已过滤敏感属性，不保存搜索词、地址、经纬度、正文、图片 URL、token 或密码。')}
      </div>
      ${renderAnalyticsEventDetail(eventDetail.items || [])}
    </div>
    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>业务健康快照</h2>
            <div class="section-sub">当前可从后端状态直接证明的核心比例</div>
          </div>
        </div>
        <div class="insight-list">
          <div><span>附近可见率</span><strong>${percentText(users.nearbyVisibleRate)}</strong></div>
          <div><span>推送开启率</span><strong>${percentText(users.pushEnabledRate)}</strong></div>
          <div><span>推送设备数</span><strong>${numberText(users.pushDeviceCount)}</strong></div>
          <div><span>AI 灵伴完成人群</span><strong>${percentText(ai.readyUserRate)}</strong></div>
          <div><span>宠物日历记录</span><strong>${numberText(calendar.weights + calendar.memos + calendar.vaccines)}</strong></div>
          <div><span>疫苗/驱虫提醒开启</span><strong>${numberText(calendar.reminderEnabled)}</strong></div>
          <div><span>打招呼接受率</span><strong>${percentText(social.greetingAcceptRate)}</strong></div>
          <div><span>发现曝光事件</span><strong>${numberText(events.discoverExposures)}</strong></div>
          <div><span>地图打开事件</span><strong>${numberText(events.mapOpens)}</strong></div>
          <div><span>地点详情事件</span><strong>${numberText(events.placeDetailViews)}</strong></div>
          <div><span>配置触达点击率</span><strong>${percentText(configPrompts.totalActionRate || 0)}</strong></div>
          <div><span>地点审核通过率</span><strong>${percentText(places.approvalRate)}</strong></div>
          <div><span>举报有效率</span><strong>${percentText(safety.reportValidRate)}</strong></div>
          <div><span>安全样本复审率</span><strong>${percentText(safety.sampleReviewRate)}</strong></div>
          <div><span>待复审安全样本</span><strong>${numberText(safety.sampleUnreviewed || 0)}</strong></div>
          <div><span>误杀 / 漏杀样本</span><strong>${numberText(safety.falsePositive || 0)} / ${numberText(safety.falseNegative || 0)}</strong></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>数据口径缺口</h2>
            <div class="section-sub">移动端基础事件已补齐，剩余是更长期或第三方回执口径</div>
          </div>
          ${help('当前已经能看到页面、发现、地图和通知点击趋势；严格留存和 Push 回执需要独立事件表或厂商回执。')}
        </div>
        <div class="gap-list">
          ${(data.dataGaps || []).map((item) => `<div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.reason)}</span></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>最近 7 天明细</h2>
          <div class="section-sub">用于快速核对趋势图背后的原始日汇总</div>
        </div>
      </div>
      ${tableHtml((data.buckets || []).slice(-7).reverse(), [
        ['日期', (row) => `<div class="cell-title">${escapeHtml(row.date)}</div>`],
        ['用户', (row) => `<div>新增 ${escapeHtml(row.newUsers)}</div><div class="cell-sub">活跃 ${escapeHtml(row.activeUsers)}</div>`],
        ['AI', (row) => `<div>形象 ${escapeHtml(row.avatarStarted)}</div><div class="cell-sub">对话 ${escapeHtml(row.petChatRequests)}</div>`],
        ['宠物日历', (row) => `<div>体重 ${escapeHtml(row.healthWeights)}</div><div class="cell-sub">备忘 ${escapeHtml(row.healthMemos)} · 疫苗 ${escapeHtml(row.healthVaccines)}</div>`],
        ['社交', (row) => `<div>小事 ${escapeHtml(row.socialPosts)} · 评论 ${escapeHtml(row.socialComments)}</div><div class="cell-sub">招呼 ${escapeHtml(row.greetings)} · 约遛 ${escapeHtml(row.walkInvites)}</div>`],
        ['事件', (row) => `<div>页面 ${escapeHtml(row.pageViews)} · 发现 ${escapeHtml(row.discoverExposures)}</div><div class="cell-sub">地图 ${escapeHtml(row.mapOpens)} · 配置 ${escapeHtml((row.configAnnouncementImpressions || 0) + (row.configSplashImpressions || 0) + (row.configUpdateImpressions || 0))}/${escapeHtml((row.configAnnouncementActions || 0) + (row.configSplashActions || 0) + (row.configUpdateActions || 0))}</div>`],
        ['运营', (row) => `<div>审核 ${escapeHtml(row.moderationTasks)} · 样本 ${escapeHtml(row.moderationSamples || 0)}</div><div class="cell-sub">复审 ${escapeHtml(row.moderationSampleReviews || 0)} · 工单 ${escapeHtml(row.tickets)}</div>`],
      ], '暂无日汇总')}
    </div>
  `;
  renderAnalyticsCharts(data);
}

function renderAnalyticsExperimentPanel(data = {}) {
  const rows = data.rows || [];
  const summary = data.summary || {};
  const current = summary.currentExperiment || {};
  const best = summary.bestVariant || null;
  const statusText = current.enabled ? `实验开启 · ${numberText(current.rolloutPercent || 0)}% 流量 · B组 ${numberText(current.variantBPercent || 0)}%` : '实验关闭，仅保留配置和历史数据';
  return `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>首页 AI 入口实验观测</h2>
          <div class="section-sub">${escapeHtml(current.name || 'homeAiEntry')} · ${escapeHtml(current.id || '-')} · ${escapeHtml(statusText)}</div>
        </div>
        ${help('配置中心控制 experiments.homeAiEntry；移动端按实验 ID 和手机号稳定分桶。这里聚合 config.experiment_exposure 与 pet_chat.entry_click，后续对话为同一用户点击后产生 AI 对话请求的测试期估算口径。')}
      </div>
      <div class="grid metrics">
        ${metric('实验曝光', numberText(summary.exposures || 0), `${numberText(summary.exposureUsers || 0)} 位用户`, '曝光来自移动端进入首页或展示首页 AI 入口时上报的 config.experiment_exposure。')}
        ${metric('入口点击率', percentText(summary.clickRate || 0), `${numberText(summary.clickUsers || 0)} 位点击 · ${numberText(summary.clicks || 0)} 次`, '点击率按分组去重用户计算：点击用户 / 曝光用户。')}
        ${metric('后续对话估算', percentText(summary.chatConversionRate || 0), `${numberText(summary.chatUsersAfterClick || 0)} 位用户`, '当前 AI 对话请求未直接携带 experimentId；这里按同一用户点击后产生用户消息粗略归因。')}
        ${metric('当前较优组', best ? `${escapeHtml(best.variantLabel)} ${percentText(best.clickRate || 0)}` : '暂无', best ? `${numberText(best.clickUsers || 0)} 位点击用户` : '需要更多曝光', '仅按当前窗口内点击率排序，不自动调整配置；上线前仍需结合样本量和业务判断。')}
      </div>
      <div id="analyticsExperimentChart" class="analytics-chart"></div>
      ${tableHtml(rows, [
        ['实验', (row) => `<div class="cell-title">${escapeHtml(row.experimentName || row.experimentId)}</div><div class="cell-sub">${escapeHtml(row.experimentId)}${row.current ? ' · 当前配置' : ''}</div>`],
        ['分组', (row) => `${statusPill(row.variantLabel || row.variant)}<div class="cell-sub">${escapeHtml(row.variant || '-')}</div>`],
        ['曝光', (row) => `<div>${numberText(row.exposures || 0)} 次</div><div class="cell-sub">${numberText(row.exposureUsers || 0)} 位用户</div>`],
        ['点击', (row) => `<div>${numberText(row.clicks || 0)} 次</div><div class="cell-sub">${numberText(row.clickUsers || 0)} 位用户 · ${percentText(row.clickRate || 0)}</div>`],
        ['后续对话', (row) => `<div>${numberText(row.chatUsersAfterClick || 0)} 位用户</div><div class="cell-sub">估算转化 ${percentText(row.chatConversionRate || 0)}</div>`],
        ['最近事件', (row) => formatTime(row.latestAt)],
      ], '暂无实验事件；开启配置并完成移动端曝光后会显示 A/B 数据。')}
    </div>
  `;
}

function renderAnalyticsFunnels(funnels) {
  if (!funnels.length) return '<div class="placeholder"><div><strong>暂无漏斗数据</strong><div>窗口内还没有可计算的移动端事件。</div></div></div>';
  return `<div class="analytics-funnel-list">${funnels.map((funnel) => `
    <div class="analytics-funnel">
      <div class="analytics-funnel-head">
        <strong>${escapeHtml(funnel.label)}</strong>
        <span>${escapeHtml(funnel.note || '')}</span>
      </div>
      <div class="analytics-funnel-steps">
        ${(funnel.steps || []).map((step, index) => `
          <div class="analytics-funnel-step">
            <div class="analytics-funnel-bar" style="--w:${Number(step.totalRate || 0) ? Math.max(6, Math.min(100, Number(step.totalRate || 0))) : 0}%"></div>
            <div class="analytics-funnel-main">
              <strong>${escapeHtml(step.label)}</strong>
              <span>${numberText(step.users || 0)} 人 · ${index === 0 ? '起点' : `上步 ${percentText(step.previousRate || 0)}`} · 事件 ${numberText(step.eventCount || 0)}</span>
            </div>
            <em>${percentText(step.totalRate || 0)}</em>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}</div>`;
}

function analyticsCohortClass(cell) {
  if (!cell?.eligible) return 'empty';
  const rate = Number(cell.rate || 0);
  if (rate >= 60) return 'hot';
  if (rate >= 30) return 'warm';
  if (rate > 0) return 'cool';
  return 'empty';
}

function analyticsCohortCell(cell) {
  if (!cell?.eligible) return '<span class="analytics-cohort-cell empty">未到期</span>';
  return `<span class="analytics-cohort-cell ${analyticsCohortClass(cell)}"><strong>${percentText(cell.rate || 0)}</strong><em>${numberText(cell.count || 0)} 人</em></span>`;
}

function renderAnalyticsCohorts(rows) {
  return tableHtml(rows, [
    ['注册日', (row) => `<div class="cell-title">${escapeHtml(row.cohortDate)}</div><div class="cell-sub">${escapeHtml(row.label || '')}</div>`],
    ['注册用户', (row) => `<div class="cell-title">${numberText(row.total || 0)}</div><div class="cell-sub">窗口活跃 ${numberText(row.activeInWindow || 0)}</div>`],
    ['D0', (row) => analyticsCohortCell(row.d0)],
    ['D1', (row) => analyticsCohortCell(row.d1)],
    ['D3', (row) => analyticsCohortCell(row.d3)],
    ['D7', (row) => analyticsCohortCell(row.d7)],
  ], '暂无 Cohort 数据');
}

function renderAnalyticsEventDetail(rows) {
  return tableHtml(rows, [
    ['时间', (row) => `<div class="cell-title">${formatTime(row.createdAt)}</div><div class="cell-sub">客户端 ${formatTime(row.occurredAt)}</div>`],
    ['事件', (row) => `<div class="cell-title">${escapeHtml(row.label || row.name)}</div><div class="cell-sub">${escapeHtml(row.name || '-')}</div>`],
    ['用户 / 宠物', (row) => `<div>${shortPhone(row.phone)}</div><div class="cell-sub">${escapeHtml(row.ownerName || '-')} · ${escapeHtml(row.petName || '-')}</div>`],
    ['上下文', (row) => `<div>${escapeHtml(row.route || '-')} · ${escapeHtml(row.source || '-')}</div><div class="cell-sub">${escapeHtml(row.platform || '-')} · ${escapeHtml(row.appVersion || '-')}</div>`],
    ['属性', (row) => `<div class="cell-sub clamp">${escapeHtml(row.propertySummary || '-')}</div>`],
  ], '暂无事件明细');
}

function renderAnalyticsCharts(data) {
  const buckets = data.buckets || [];
  const labels = buckets.map((item) => item.label);
  const chartIds = ['analyticsGrowthChart', 'analyticsAiChart', 'analyticsSocialChart', 'analyticsEventChart', 'analyticsOpsChart', 'analyticsExperimentChart'];
  if (!window.echarts) {
    chartIds.forEach((id) => {
      const node = $(id);
      if (node) node.innerHTML = '<div class="placeholder">图表组件加载中</div>';
    });
    return;
  }
  const axisStyle = {
    axisLine: { show: false },
    axisTick: { show: false },
  };
  const splitLine = { lineStyle: { color: 'rgba(91,70,48,.1)' } };
  const baseGrid = { bottom: 28, left: 38, right: 16, top: 24 };
  const renderChart = (id, option) => {
    const node = $(id);
    if (!node) return;
    const chart = echarts.init(node);
    chart.setOption({
      color: ['#ff7f4f', '#48b6a8', '#c99637', '#dc604e', '#8b79f6'],
      grid: baseGrid,
      legend: { bottom: 0, itemHeight: 8, itemWidth: 12, textStyle: { color: '#7a756d' } },
      tooltip: { trigger: 'axis' },
      xAxis: { ...axisStyle, data: labels, type: 'category' },
      yAxis: { ...axisStyle, splitLine, type: 'value' },
      ...option,
    });
  };
  renderChart('analyticsGrowthChart', {
    series: [
      { name: '新增用户', smooth: true, type: 'line', data: buckets.map((item) => item.newUsers) },
      { name: '活跃用户', smooth: true, type: 'line', data: buckets.map((item) => item.activeUsers) },
    ],
  });
  renderChart('analyticsAiChart', {
    series: [
      { name: '前端开始', smooth: true, type: 'line', data: buckets.map((item) => item.aiAvatarStarts || 0) },
      { barMaxWidth: 20, name: '形象启动', stack: 'avatar', type: 'bar', data: buckets.map((item) => item.avatarStarted) },
      { barMaxWidth: 20, name: '形象成功', stack: 'result', type: 'bar', data: buckets.map((item) => item.avatarReady) },
      { barMaxWidth: 20, name: '形象失败', stack: 'result', type: 'bar', data: buckets.map((item) => item.avatarFailed) },
      { name: 'AI 对话', smooth: true, type: 'line', data: buckets.map((item) => item.petChatRequests) },
    ],
  });
  renderChart('analyticsSocialChart', {
    series: [
      { name: '小事', smooth: true, type: 'line', data: buckets.map((item) => item.socialPosts) },
      { name: '点赞', smooth: true, type: 'line', data: buckets.map((item) => item.socialLikes) },
      { name: '评论', smooth: true, type: 'line', data: buckets.map((item) => item.socialComments) },
      { name: '小事卡片', smooth: true, type: 'line', data: buckets.map((item) => item.petCircleCardExposures || 0) },
      { name: '小事点击', smooth: true, type: 'line', data: buckets.map((item) => (item.petCircleLikeClicks || 0) + (item.petCircleCommentClicks || 0) + (item.petCircleGreetingClicks || 0) + (item.petCircleWalkInviteClicks || 0)) },
      { name: '招呼', smooth: true, type: 'line', data: buckets.map((item) => item.greetings) },
      { name: '约遛', smooth: true, type: 'line', data: buckets.map((item) => item.walkInvites) },
    ],
  });
  renderChart('analyticsEventChart', {
    series: [
      { name: '页面浏览', smooth: true, type: 'line', data: buckets.map((item) => item.pageViews) },
      { name: '首页模块', smooth: true, type: 'line', data: buckets.map((item) => item.homeModuleExposures || 0) },
      { name: '发现曝光', smooth: true, type: 'line', data: buckets.map((item) => item.discoverExposures) },
      { name: '小事卡片', smooth: true, type: 'line', data: buckets.map((item) => item.petCircleCardExposures || 0) },
      { name: '地图打开', smooth: true, type: 'line', data: buckets.map((item) => item.mapOpens) },
      { name: 'POI搜索', smooth: true, type: 'line', data: buckets.map((item) => item.poiSearches) },
      { name: '地点详情', smooth: true, type: 'line', data: buckets.map((item) => item.placeDetailViews) },
      { name: '通知点击', smooth: true, type: 'line', data: buckets.map((item) => item.notificationOpens) },
      { name: '系统通知点击', smooth: true, type: 'line', data: buckets.map((item) => item.systemNotificationOpens || 0) },
      { name: '配置展示', smooth: true, type: 'line', data: buckets.map((item) => (item.configAnnouncementImpressions || 0) + (item.configSplashImpressions || 0) + (item.configUpdateImpressions || 0)) },
      { name: '配置点击', smooth: true, type: 'line', data: buckets.map((item) => (item.configAnnouncementActions || 0) + (item.configSplashActions || 0) + (item.configUpdateActions || 0)) },
    ],
  });
  renderChart('analyticsOpsChart', {
    series: [
      { barMaxWidth: 20, name: '审核任务', type: 'bar', data: buckets.map((item) => item.moderationTasks) },
      { barMaxWidth: 20, name: '样本复审', type: 'bar', data: buckets.map((item) => item.moderationSampleReviews || 0) },
      { barMaxWidth: 20, name: '地点点评', type: 'bar', data: buckets.map((item) => item.placeReviews) },
      { barMaxWidth: 20, name: '新增地点', type: 'bar', data: buckets.map((item) => item.placeSubmissions) },
      { name: '误杀', smooth: true, type: 'line', data: buckets.map((item) => item.moderationFalsePositive || 0) },
      { name: '漏杀', smooth: true, type: 'line', data: buckets.map((item) => item.moderationFalseNegative || 0) },
      { name: '工单', smooth: true, type: 'line', data: buckets.map((item) => item.tickets) },
    ],
  });
  const experimentRows = data.experimentMetrics?.rows || [];
  const experimentLabels = experimentRows.map((row) => `${row.variantLabel || row.variant}${row.current ? '*' : ''}`);
  renderChart('analyticsExperimentChart', {
    xAxis: { ...axisStyle, data: experimentLabels, type: 'category' },
    series: [
      { barMaxWidth: 28, name: '曝光用户', type: 'bar', data: experimentRows.map((row) => row.exposureUsers || 0) },
      { barMaxWidth: 28, name: '点击用户', type: 'bar', data: experimentRows.map((row) => row.clickUsers || 0) },
      { name: '点击率%', smooth: true, type: 'line', data: experimentRows.map((row) => row.clickRate || 0) },
    ],
  });
}

async function renderModeration(force) {
  const query = new URLSearchParams({
    q: state.moderationQ,
    status: state.moderationStatus,
  });
  const mediaQuery = new URLSearchParams({
    q: state.mediaModerationQ,
    status: state.mediaModerationStatus,
  });
  const [data, mediaData] = await Promise.all([
    load('moderation', `/admin/moderation/tasks?${query.toString()}`, force),
    load('mediaModeration', `/admin/media/moderation?${mediaQuery.toString()}`, force),
  ]);
  const tasks = data.tasks || [];
  const samples = data.samples || [];
  const summary = data.summary || {};
  const sampleSummary = data.sampleSummary || {};
  const mediaRows = mediaData.items || [];
  const mediaSummary = mediaData.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('待处理', summary.pending || 0, `${summary.escalated || 0} 个已升级`, 'pending / reviewing / escalated 都算作待处理任务。')}
      ${metric('举报任务', summary.reports || 0, '来自用户举报', '用户举报会自动关联被举报动态或评论。')}
      ${metric('社交内容', summary.social || 0, '动态/评论聚合', '被举报内容会聚合为内容级任务，便于一次隐藏或删除。')}
      ${metric('图片待审', mediaSummary.pending || 0, `${mediaSummary.hidden || 0} 隐藏 / ${mediaSummary.rejected || 0} 驳回`, '上传图片会进入独立审核视角；隐藏或驳回后 App 列表不再展示该图。')}
      ${metric('地点图片', mediaSummary.referencedByPlaces || 0, '点评/新增地点', '地点点评和新增地点上传的图片复用统一图片审核池，处理结果会影响提交与后续展示。')}
      ${metric('地点审核', summary.places || 0, '点评/新增地点', '地点点评和新增地点共用这套审核视角。')}
      ${metric('风险命中', summary.ruleHits || 0, '规则/机审样本', '来自关键词规则和腾讯云机审的命中样本，用于后续调规则和接模型。')}
      ${metric('待复审样本', summary.sampleUnreviewed || 0, `${summary.qualitySamples || 0} 条抽样`, '抽样复审不会直接影响用户内容可见性，用于发现误杀、漏杀和策略偏差。')}
      ${metric('误杀/漏杀', (summary.sampleFalsePositive || 0) + (summary.sampleFalseNegative || 0), `${summary.sampleFalsePositive || 0} 误杀 / ${summary.sampleFalseNegative || 0} 漏杀`, '人工复审样本后沉淀的模型和规则质量信号。')}
      ${metric('SLA 超时', summary.overdue || 0, `${summary.assigned || 0} 已认领`, 'SLA 由任务类型和风险分自动计算，高风险任务会更短。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>审核任务池</h2>
          <div class="section-sub">按风险和时间排序，处理动作会写入审计并实时影响 App 可见性</div>
        </div>
        ${help('这是一张统一运营队列：举报负责判断有效性，内容任务负责隐藏/删除，地点任务负责通过/驳回。')}
      </div>
      <div class="toolbar moderation-toolbar">
        <div class="toolbar-left">
          <label>状态
            <select id="moderationStatus">
              ${moderationStatusOption('pending', '待处理')}
              ${moderationStatusOption('escalated', '已升级')}
              ${moderationStatusOption('reviewing', '处理中')}
              ${moderationStatusOption('handled', '已处理')}
              ${moderationStatusOption('all', '全部')}
            </select>
          </label>
          <label>搜索
            <input id="moderationQ" placeholder="手机号、内容、任务 ID" value="${escapeHtml(state.moderationQ)}" />
          </label>
        </div>
        <div class="actions">
          <select id="moderationBulkAction">
            <option value="assign">批量认领</option>
            <option value="reviewing">批量接手</option>
            <option value="invalid">举报无效</option>
            <option value="hide">隐藏/有效隐藏</option>
            <option value="approve">通过</option>
            <option value="reject">驳回</option>
          </select>
          <button class="small-button" data-action="moderation-batch">批量处理选中</button>
          <button class="small-button" data-action="moderation-filter">应用</button>
          <button class="small-button" data-action="moderation-clear">重置</button>
        </div>
      </div>
      ${tasks.length ? `<div class="moderation-list">${tasks.map(renderModerationTaskCard).join('')}</div>` : '<div class="placeholder"><div><strong>暂无审核任务</strong><div>当前筛选下没有需要处理的内容。</div></div></div>'}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>图片审核</h2>
          <div class="section-sub">上传素材、宠友圈图片和 AI 原图的人工处理入口</div>
        </div>
        ${help('腾讯云图片机审命中 Review 会进入这里；通过后正常展示，隐藏或驳回后，附近小事、我的小事和媒体文件接口都会过滤该图片。')}
      </div>
      <div class="toolbar moderation-toolbar">
        <div class="toolbar-left">
          <label>状态
            <select id="mediaModerationStatus">
              ${mediaModerationStatusOption('pending_review', '待审核')}
              ${mediaModerationStatusOption('approved', '已通过')}
              ${mediaModerationStatusOption('hidden', '已隐藏')}
              ${mediaModerationStatusOption('rejected', '已驳回')}
              ${mediaModerationStatusOption('all', '全部')}
            </select>
          </label>
          <label>搜索
            <input id="mediaModerationQ" placeholder="手机号、宠物、媒体ID、动态ID" value="${escapeHtml(state.mediaModerationQ)}" />
          </label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="media-moderation-filter">应用</button>
          <button class="small-button ghost" data-action="media-moderation-clear">重置</button>
        </div>
      </div>
      ${tableHtml(mediaRows, [
        ['图片', avatarMediaCell],
        ['用户 / 宠物', (row) => `<div>${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.ownerPhone)} · ${escapeHtml(row.petName || '-')}</div>`],
        ['审核', mediaModerationStatusCell],
        ['质量', (row) => `${avatarQualityPill(row)}<div class="cell-sub">${numberText(row.qualityScore)} 分 · ${escapeHtml(row.analysisCode || '-')}</div><div class="cell-sub clamp">${escapeHtml(row.analysisTitle || row.analysisMessage || '')}</div>`],
        ['关联', mediaReferenceCell],
        ['时间', (row) => `<div>上传：${formatTime(row.createdAt)}</div><div class="cell-sub">${row.moderatedAt ? `处理：${formatTime(row.moderatedAt)}` : '暂未人工处理'}</div>`],
        ['操作', mediaModerationActions],
      ], '暂无图片素材')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>内容安全样本复盘</h2>
          <div class="section-sub">${numberText(sampleSummary.unreviewed || 0)} 条待复审 · ${numberText(sampleSummary.riskHits || 0)} 条风险命中 · ${numberText(sampleSummary.qualitySamples || 0)} 条抽样复审</div>
        </div>
        ${help('风险命中样本来自小事、评论、地点内容、资料文本和图片机审；抽样复审样本来自已通过内容的后台抽样。复审结论用于误杀/漏杀回收，不会自动改变用户内容状态。')}
      </div>
      ${samples.length ? `<div class="moderation-list compact">${samples.map(renderModerationSample).join('')}</div>` : '<div class="placeholder"><div><strong>暂无内容安全样本</strong><div>开启规则、机审或抽样复审后，这里会沉淀样本。</div></div></div>'}
    </div>
  `;
}

function moderationStatusOption(value, label) {
  return `<option value="${value}" ${state.moderationStatus === value ? 'selected' : ''}>${label}</option>`;
}

function mediaModerationStatusOption(value, label) {
  return `<option value="${value}" ${state.mediaModerationStatus === value ? 'selected' : ''}>${label}</option>`;
}

function mediaModerationStatusCell(row) {
  const safety = row.contentSafety || {};
  return `
    <div>${statusPill(row.statusLabel || row.moderationStatusLabel || row.status)}</div>
    <div class="cell-sub">${escapeHtml(row.moderatedBy || '未处理')}</div>
    ${safety.bizType ? `<div class="cell-sub">${escapeHtml(safety.bizType)} · ${escapeHtml(safety.requestId || '-')}</div>` : ''}
    ${safety.riskTypes?.length ? `<div class="cell-sub clamp">${escapeHtml(safety.riskTypes.join(' / '))}</div>` : ''}
    ${row.moderationReason ? `<div class="cell-sub clamp">${escapeHtml(row.moderationReason)}</div>` : ''}
  `;
}

function mediaReferenceCell(row) {
  const refs = row.references || {};
  const parts = [
    refs.postCount ? `小事 ${refs.postCount}` : '',
    refs.placeReviewCount ? `地点点评 ${refs.placeReviewCount}` : '',
    refs.placeSubmissionCount ? `新增地点 ${refs.placeSubmissionCount}` : '',
    refs.avatarJobCount ? `AI任务 ${refs.avatarJobCount}` : '',
    refs.coverPetCount ? `封面 ${refs.coverPetCount}` : '',
    refs.avatarPetCount ? `头像 ${refs.avatarPetCount}` : '',
  ].filter(Boolean);
  const postIds = [
    ...(refs.posts || []).slice(0, 2).map((post) => `小事 ${post.id}`),
    ...(refs.placeReviews || []).slice(0, 2).map((review) => `点评 ${review.id}`),
    ...(refs.placeSubmissions || []).slice(0, 2).map((submission) => `新增 ${submission.id}`),
  ].join(' / ');
  return `
    <div>${escapeHtml(parts.join(' · ') || '暂无业务引用')}</div>
    <div class="cell-sub">${escapeHtml(postIds || row.sourceLabel || '-')}</div>
  `;
}

function mediaModerationActions(row) {
  const title = row.petName || row.mediaId || '图片素材';
  const button = (op, label, tone = '') => `
    <button
      class="small-button ${tone}"
      data-action="media-moderate"
      data-id="${escapeHtml(row.mediaId)}"
      data-op="${escapeHtml(op)}"
      data-title="${escapeHtml(title)}"
    >${escapeHtml(label)}</button>
  `;
  if (row.status === 'pending_review') {
    return `<div class="actions">${button('approve', '通过')}${button('hide', '隐藏', 'danger')}${button('reject', '驳回', 'danger')}</div>`;
  }
  if (row.status === 'hidden' || row.status === 'rejected') {
    return `<div class="actions">${button('restore', '恢复')}</div>`;
  }
  return `<div class="actions">${button('hide', '隐藏', 'danger')}${button('reject', '驳回', 'danger')}</div>`;
}

function riskBadge(label) {
  return `<span class="risk-badge">${escapeHtml(label)}</span>`;
}

function moderationSlaBadge(task) {
  const sla = task.sla || {};
  if (!sla.status) return '';
  const status = sla.status;
  const className = status === 'overdue' ? 'overdue' : status === 'due_soon' ? 'soon' : status === 'done' ? 'done' : '';
  let label = 'SLA 正常';
  if (status === 'overdue') label = `SLA 超时 ${Math.abs(sla.remainingMinutes || 0)} 分钟`;
  else if (status === 'due_soon') label = `SLA 临近 ${Math.max(0, sla.remainingMinutes || 0)} 分钟`;
  else if (status === 'done') label = 'SLA 已完成';
  else if (sla.hours) label = `${sla.hours}h SLA`;
  return `<span class="risk-badge sla-badge ${className}">${escapeHtml(label)}</span>`;
}

function moderationAssigneeText(task) {
  return task.assignee ? `负责人：${escapeHtml(task.assignee)}` : '负责人：未认领';
}

function renderModerationTaskCard(task) {
  const riskTypes = (task.riskTypes || []).map(riskBadge).join('') || riskBadge('待人工判断');
  const mediaStrip = (task.mediaUrls || []).length ? `
    <div class="moderation-media-strip">
      ${(task.mediaUrls || []).slice(0, 6).map((url) => `<img src="${escapeHtml(url)}" alt="" loading="lazy" />`).join('')}
    </div>
  ` : '';
  const actions = (task.actions || []).map((item) => `
    <button
      class="small-button ${item.tone === 'danger' ? 'danger' : ''}"
      data-action="moderation-task-action"
      data-confirm="${item.confirm ? 'true' : 'false'}"
      data-id="${escapeHtml(task.id)}"
      data-op="${escapeHtml(item.action)}"
      data-title="${escapeHtml(task.title)}"
    >${escapeHtml(item.label)}</button>
  `).join('');
  const assignAction = `
    <button
      class="small-button"
      data-action="moderation-task-assign"
      data-id="${escapeHtml(task.id)}"
      data-title="${escapeHtml(task.title)}"
    >认领</button>
  `;
  return `
    <article class="moderation-card">
      <div class="moderation-card-main">
        <div class="moderation-title-row">
          <div>
            <label class="moderation-check-row">
              <input class="moderation-batch-check" type="checkbox" value="${escapeHtml(task.id)}" />
              <span>批量</span>
            </label>
            <div class="cell-title">${escapeHtml(task.title)}</div>
            <div class="cell-sub">${escapeHtml(task.kindLabel)} · ${escapeHtml(task.sourceLabel)} · ${escapeHtml(task.id)}</div>
          </div>
          <div class="moderation-status">${statusPill(task.status)}</div>
        </div>
        <div class="moderation-text">${escapeHtml(task.contentText || task.reason || '无正文内容')}</div>
        ${mediaStrip}
        <div class="moderation-meta">
          <span>对象：${escapeHtml(task.targetLabel || task.targetType)} ${task.targetStatus ? `· ${escapeHtml(task.targetStatus)}` : ''}</span>
          <span>作者：${escapeHtml(task.ownerName || '-')} ${shortPhone(task.ownerPhone)}</span>
          ${task.reporterPhone ? `<span>举报人：${escapeHtml(task.reporterName || '-')} ${shortPhone(task.reporterPhone)}</span>` : ''}
          <span>${moderationAssigneeText(task)}</span>
          ${task.sla?.dueAt ? `<span>SLA：${formatTime(task.sla.dueAt)}</span>` : ''}
          <span>时间：${formatTime(task.createdAt)}</span>
        </div>
        <div class="risk-row">
          <span class="risk-score">风险 ${task.riskScore || 0}</span>
          ${moderationSlaBadge(task)}
          ${riskTypes}
          ${task.relatedCount ? `<span class="risk-badge">${task.relatedCount} 条关联</span>` : ''}
        </div>
      </div>
      <div class="moderation-actions">
        ${assignAction}
        ${actions || '<span class="muted">无可用动作</span>'}
      </div>
    </article>
  `;
}

function renderModerationSample(sample) {
  const riskTypes = (sample.riskTypes || []).map(riskBadge).join('') || riskBadge(sample.sampleKindLabel || '规则命中');
  const keywords = (sample.matchedKeywords || []).slice(0, 4).map((item) => riskBadge(`命中：${item}`)).join('');
  const reviewButtons = [
    ['confirmed', '确认风险'],
    ['false_positive', '误杀'],
    ['false_negative', '漏杀'],
    ['ignored', '忽略'],
  ].map(([status, label]) => `
    <button
      class="small-button ${status === 'false_positive' || status === 'false_negative' ? 'danger' : ''}"
      data-action="moderation-sample-review"
      data-id="${escapeHtml(sample.id)}"
      data-status="${escapeHtml(status)}"
      data-title="${escapeHtml(sample.scope || sample.targetId || '内容安全样本')}"
    >${label}</button>
  `).join('');
  return `
    <article class="moderation-card">
      <div class="moderation-card-main">
        <div class="moderation-title-row">
          <div>
            <div class="cell-title">${escapeHtml(sample.scope || '内容样本')}</div>
            <div class="cell-sub">${escapeHtml(sample.id)} · ${escapeHtml(sample.sampleKindLabel || sample.sourceLabel || sample.source || '规则命中')} · ${formatTime(sample.createdAt)}</div>
          </div>
          <div class="moderation-status">
            ${statusPill(sample.reviewStatusLabel || sample.reviewStatus || '待复审')}
            <div class="cell-sub">${escapeHtml(sample.action || 'review')}</div>
          </div>
        </div>
        <div class="moderation-text">${escapeHtml(sample.contentText || '无正文内容')}</div>
        <div class="moderation-meta">
          <span>用户：${shortPhone(sample.ownerPhone)}</span>
          <span>对象：${escapeHtml(sample.targetId || '-')}</span>
          ${sample.bizType ? `<span>Biztype：${escapeHtml(sample.bizType)}</span>` : ''}
          ${sample.requestId ? `<span>RequestId：${escapeHtml(sample.requestId)}</span>` : ''}
          ${sample.reviewedAt ? `<span>复审：${escapeHtml(sample.reviewedBy || '-')} · ${formatTime(sample.reviewedAt)}</span>` : ''}
        </div>
        <div class="risk-row">
          <span class="risk-score">风险 ${sample.riskScore || 0}</span>
          ${riskTypes}
          ${keywords}
        </div>
        ${sample.reviewReason ? `<div class="cell-sub clamp">复审说明：${escapeHtml(sample.reviewReason)}</div>` : ''}
      </div>
      <div class="moderation-actions">${reviewButtons}</div>
    </article>
  `;
}

function petChatFlagLabel(flag) {
  return {
    all: '全部',
    feedback_good: '像它',
    feedback_off: '不像它',
    hidden: '已隐藏',
    medical: '医疗风险',
    safety: '机审拦截',
    tagged: '运营标记',
    writes: '写入记录',
  }[flag] || flag;
}

function petChatTagLabel(tag) {
  return {
    content_safety: '内容安全',
    false_negative: '漏触发',
    false_positive: '误触发',
    medical_sample: '医疗样本',
    quality_issue: '质量问题',
    safety_block: '机审阻断',
    safety_review: '机审复审',
  }[tag] || tag;
}

function petChatQualityReviewStatusLabel(status) {
  return {
    ignored: '豁免',
    needs_fix: '需修正',
    reviewed: '已复核',
    safe: '样本正常',
  }[status] || '待复核';
}

async function renderPetChat(force) {
  const query = new URLSearchParams({
    flag: state.petChatFlag,
    q: state.petChatQ,
  });
  const rows = await load('petChat', `/admin/ai/pet-chat/messages?${query.toString()}`, force);
  const qualityReview = await load('petChatQualityReview', '/admin/ai/pet-chat/quality-review', force);
  const medicalCount = rows.filter((row) => row.hasMedicalAlert).length;
  const writeCount = rows.filter((row) => row.hasCalendarWrite || row.updatedPet).length;
  const offCount = rows.filter((row) => row.feedback === 'off').length;
  const reviewSummary = qualityReview.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('AI 回复', rows.length, `${petChatFlagLabel(state.petChatFlag)}筛选`, '后台默认只展示摘要；查看完整正文必须填写原因并写审计。')}
      ${metric('医疗风险', medicalCount, '自动写入备忘/提醒', 'AI 对话命中医疗风险门禁后，会记录备忘并提示就医。')}
      ${metric('业务写入', writeCount, '备忘/体重/疫苗/档案', 'AI 对话触发的结构化业务动作，用于排查自动写入是否合理。')}
      ${metric('不像它反馈', offCount, '用户点了“不像它”', '这些反馈会进入后续提示词上下文，也适合运营抽查。')}
    </div>
    <div class="grid metrics compact-metrics">
      ${metric('待抽检', numberText(reviewSummary.unreviewed || 0), `${numberText(reviewSummary.queueCount || 0)} 条进入队列`, '队列优先展示隐藏、质量问题、误触发/漏触发、用户“不像它”、医疗风险和业务写入回复。')}
      ${metric('已复核', numberText(reviewSummary.reviewed || 0), `${numberText(reviewSummary.needsFix || 0)} 条需修正`, '复核结论只在后台沉淀；标为需修正会自动加质量问题标签。')}
      ${metric('移动端隐藏', numberText(reviewSummary.hidden || 0), '隐藏后用户侧不可见', '隐藏 AI 回复会立即从移动端 AI 对话列表和后续模型上下文中移除。')}
      ${metric('机审拦截', numberText(reviewSummary.safetyIntercepted || 0), '自动隐藏并进复核', 'AI 回复命中文本内容安全 Review/Block 后，原文只进后台复核，移动端不会展示。')}
    </div>
    ${renderPetChatQualityReviewPanel(qualityReview)}
    <div class="card">
      <div class="section-head">
        <div>
          <h2>AI 对话排查</h2>
          <div class="section-sub">摘要默认可见，完整正文需要填写查看原因</div>
        </div>
        ${help('隐藏 AI 回复后，移动端消息列表不再返回这条 AI 消息；服务端后续生成回复也会跳过被隐藏消息。')}
      </div>
      <div class="toolbar moderation-toolbar">
        <div class="toolbar-left">
          <label>状态筛选
            <select id="petChatFlag">
              ${['all', 'medical', 'writes', 'safety', 'feedback_off', 'feedback_good', 'tagged', 'hidden'].map((flag) => `<option value="${flag}" ${state.petChatFlag === flag ? 'selected' : ''}>${petChatFlagLabel(flag)}</option>`).join('')}
            </select>
          </label>
          <label>搜索
            <input id="petChatQ" value="${escapeHtml(state.petChatQ)}" placeholder="手机号、宠物名、摘要、消息ID" />
          </label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="pet-chat-filter">筛选</button>
          <button class="small-button" data-action="pet-chat-clear">清空</button>
        </div>
      </div>
      <div class="moderation-list">
        ${rows.length ? rows.map(renderPetChatRow).join('') : '<div class="placeholder"><div><strong>暂无 AI 对话记录</strong><div>切换筛选或刷新后再看。</div></div></div>'}
      </div>
    </div>
  `;
}

function renderPetChatQualityReviewPanel(data = {}) {
  const items = data.items || [];
  const policy = data.policy || {};
  return `
    <div class="card pet-chat-review-panel">
      <div class="section-head">
        <div>
          <h2>AI 对话质量抽检</h2>
          <div class="section-sub">${escapeHtml(policy.sampling || '按风险和反馈自动排序，帮助运营优先看高价值样本。')}</div>
        </div>
        ${help(policy.mobileImpact || '复核标签仅后台可见；隐藏回复会影响移动端可见性。')}
      </div>
      ${items.length ? `
        <div class="moderation-list compact">
          ${items.slice(0, 8).map(renderPetChatQualityReviewItem).join('')}
        </div>
      ` : '<div class="placeholder"><div><strong>暂无待抽检 AI 对话</strong><div>有新 AI 回复、用户反馈或运营标签后会自动进入这里。</div></div></div>'}
    </div>
  `;
}

function renderPetChatQualityReviewItem(row) {
  const tags = (row.adminTags || []).map((tag) => riskBadge(petChatTagLabel(tag))).join('');
  const status = row.adminQualityReviewStatus ? petChatQualityReviewStatusLabel(row.adminQualityReviewStatus) : '待复核';
  const safety = row.contentSafetyAction && row.contentSafetyAction !== 'allow'
    ? riskBadge(`机审：${row.contentSafetyAction === 'block' ? '阻断' : '复审'} ${numberText(row.contentSafetyRiskScore || 0)}`)
    : '';
  return `
    <article class="moderation-card pet-chat-review-card">
      <div class="moderation-card-main">
        <div class="moderation-title-row">
          <div>
            <div class="cell-title">${escapeHtml(row.petName || row.ownerName || '-')} · ${escapeHtml(status)}</div>
            <div class="cell-sub">${shortPhone(row.ownerPhone)} · 风险 ${numberText(row.queueScore || 0)} · ${formatTime(row.time)}</div>
          </div>
          <div class="moderation-status">${tonePill(status, row.adminQualityReviewStatus === 'needs_fix' || row.adminHiddenAt ? 'bad' : row.adminQualityReviewedAt ? 'ok' : 'warn')}</div>
        </div>
        <div class="pet-chat-pair compact">
          <div><strong>主人</strong><span>${escapeHtml(row.userSummary || '无用户输入摘要')}</span></div>
          <div><strong>AI</strong><span>${escapeHtml(row.aiSummary || '无 AI 回复摘要')}</span></div>
        </div>
        <div class="risk-row">
          ${riskBadge(row.queueReason || '抽样复核')}
          ${safety}
          ${row.feedback ? riskBadge(`反馈：${row.feedback === 'good' ? '像它' : '不像它'}`) : ''}
          ${tags}
          ${row.adminHiddenAt ? riskBadge(`隐藏：${formatTime(row.adminHiddenAt)}`) : ''}
        </div>
        ${row.adminQualityReviewReason ? `<div class="cell-sub clamp">复核说明：${escapeHtml(row.adminQualityReviewReason)}</div>` : ''}
      </div>
      <div class="moderation-actions">
        <button class="small-button" data-action="pet-chat-view" data-id="${escapeHtml(row.id)}">查看全文</button>
        <button class="small-button" data-action="pet-chat-review" data-id="${escapeHtml(row.id)}" data-status="reviewed">已复核</button>
        <button class="small-button" data-action="pet-chat-review" data-id="${escapeHtml(row.id)}" data-status="safe">样本正常</button>
        <button class="small-button danger" data-action="pet-chat-review" data-id="${escapeHtml(row.id)}" data-status="needs_fix">需修正</button>
        ${row.adminHiddenAt ? '<span class="muted">已隐藏</span>' : `<button class="small-button danger" data-action="pet-chat-hide" data-id="${escapeHtml(row.id)}">隐藏回复</button>`}
      </div>
    </article>
  `;
}

function renderPetChatRow(row) {
  const actionLabels = (row.actionLabels || []).map(riskBadge).join('');
  const tags = (row.adminTags || []).map((tag) => riskBadge(petChatTagLabel(tag))).join('');
  const reviewStatus = row.adminQualityReviewStatus ? petChatQualityReviewStatusLabel(row.adminQualityReviewStatus) : '';
  const detail = state.petChatDetails[row.id];
  const safety = row.contentSafetyAction && row.contentSafetyAction !== 'allow'
    ? riskBadge(`机审：${row.contentSafetyAction === 'block' ? '阻断' : '复审'} ${numberText(row.contentSafetyRiskScore || 0)}`)
    : '';
  return `
    <article class="moderation-card pet-chat-card">
      <div class="moderation-card-main">
        <div class="moderation-title-row">
          <div>
            <div class="cell-title">${escapeHtml(row.ownerName || '-')} ${row.petName ? `· ${escapeHtml(row.petName)}` : ''}</div>
            <div class="cell-sub">${shortPhone(row.ownerPhone)} · ${escapeHtml(row.id)} · ${formatTime(row.time)}</div>
          </div>
          <div class="moderation-status">${statusPill(row.adminHiddenAt ? 'hidden' : row.feedback || 'normal')}</div>
        </div>
        <div class="pet-chat-pair">
          <div><strong>主人</strong><span>${escapeHtml(row.userSummary || '无用户输入摘要')}</span></div>
          <div><strong>AI</strong><span>${escapeHtml(row.aiSummary || '无 AI 回复摘要')}</span></div>
        </div>
        <div class="risk-row">
          ${actionLabels || riskBadge('普通回复')}
          ${safety}
          ${row.feedback ? riskBadge(`反馈：${row.feedback === 'good' ? '像它' : '不像它'}`) : ''}
          ${tags}
          ${reviewStatus ? riskBadge(`复核：${reviewStatus}`) : ''}
          ${row.adminHiddenAt ? riskBadge(`隐藏：${formatTime(row.adminHiddenAt)}`) : ''}
        </div>
        ${row.adminQualityReviewReason ? `<div class="cell-sub clamp">复核说明：${escapeHtml(row.adminQualityReviewReason)}</div>` : ''}
        ${detail ? renderPetChatDetail(detail) : ''}
      </div>
      <div class="moderation-actions">
        <button class="small-button" data-action="pet-chat-view" data-id="${escapeHtml(row.id)}">查看全文</button>
        <button class="small-button" data-action="pet-chat-review" data-id="${escapeHtml(row.id)}" data-status="reviewed">已复核</button>
        <button class="small-button" data-action="pet-chat-tag" data-id="${escapeHtml(row.id)}" data-tag="quality_issue">质量问题</button>
        <button class="small-button" data-action="pet-chat-tag" data-id="${escapeHtml(row.id)}" data-tag="medical_sample">医疗样本</button>
        <button class="small-button" data-action="pet-chat-tag" data-id="${escapeHtml(row.id)}" data-tag="false_positive">误触发</button>
        <button class="small-button" data-action="pet-chat-tag" data-id="${escapeHtml(row.id)}" data-tag="false_negative">漏触发</button>
        ${row.adminHiddenAt ? '<span class="muted">已隐藏</span>' : `<button class="small-button danger" data-action="pet-chat-hide" data-id="${escapeHtml(row.id)}">隐藏回复</button>`}
      </div>
    </article>
  `;
}

function renderPetChatDetail(detail) {
  const context = (detail.context || []).map((message) => `
    <div class="pet-chat-line ${message.author === 'ai' ? 'ai' : 'me'}">
      <strong>${message.author === 'ai' ? 'AI' : '主人'}</strong>
      <span>${formatTime(message.time)}</span>
      <p>${escapeHtml(message.text || '')}</p>
      ${message.adminHiddenAt ? `<em>已隐藏：${formatTime(message.adminHiddenAt)}</em>` : ''}
    </div>
  `).join('');
  const actionSummary = [
    detail.medicalAlert ? `医疗风险：${detail.medicalAlert.reason || '-'}` : '',
    detail.moderatedOriginalText ? '内容安全：原回复已自动隐藏' : '',
    detail.createdMemo ? `写入备忘：${detail.createdMemo.title || '-'}` : '',
    detail.createdWeight ? `写入体重：${detail.createdWeight.kg || '-'}kg` : '',
    detail.updatedVaccine ? `更新疫苗/驱虫：${detail.updatedVaccine.name || '-'}` : '',
    detail.updatedPet ? '更新宠物档案' : '',
  ].filter(Boolean);
  return `
    <div class="pet-chat-detail">
      <div class="cell-title">完整上下文</div>
      <div class="cell-sub">查看动作已写入审计日志</div>
      ${actionSummary.length ? `<div class="risk-row">${actionSummary.map(riskBadge).join('')}</div>` : ''}
      ${detail.moderatedOriginalText ? `<div class="pet-chat-line ai"><strong>机审原文</strong><span>仅后台可见</span><p>${escapeHtml(detail.moderatedOriginalText)}</p></div>` : ''}
      <div class="pet-chat-context">${context}</div>
    </div>
  `;
}

async function loadUserTimeline(phone) {
  if (!phone) return;
  const query = new URLSearchParams({
    kind: state.userTimelineKind || 'all',
    limit: '160',
  });
  state.userTimeline = await api(`/admin/users/${encodeURIComponent(phone)}/timeline?${query.toString()}`);
  showToast('用户时间线已加载');
  await render(false);
}

function userTimelineTone(item) {
  const tone = String(item?.tone || '');
  if (['ok', 'warn', 'bad'].includes(tone)) return tone;
  const status = String(item?.status || '').toLowerCase();
  if (/failed|rejected|hidden|deleted|overdue|muted|frozen|banned|valid|medical/.test(status)) return 'bad';
  if (/pending|review|processing|unread|未读|待/.test(status)) return 'warn';
  return 'ok';
}

function renderUserTimelinePanel(data) {
  if (!data) {
    return `
      <div class="card user-timeline-card">
        <div class="section-head">
          <div>
            <h2>用户时间线</h2>
            <div class="section-sub">从用户列表点击“时间线”，聚合账号、宠物、内容、安全、客服、通知和移动端事件</div>
          </div>
          ${help('时间线用于运营排查单个用户的完整业务链路；不展示私信正文，只展示关系、计数、状态和关联对象。')}
        </div>
        <div class="placeholder"><div><strong>未选择用户</strong><div>先在用户列表里点时间线。</div></div></div>
      </div>
    `;
  }
  const summary = data.summary || {};
  const filters = data.filters || {};
  const user = data.user || {};
  const options = (filters.kindOptions || [])
    .map((item) => option(item.key, `${item.label}${item.key !== 'all' && summary[item.key] !== undefined ? `（${summary[item.key]}）` : ''}`, filters.kind || state.userTimelineKind))
    .join('');
  const items = data.items || [];
  return `
    <div class="card user-timeline-card">
      <div class="section-head">
        <div>
          <h2>用户时间线 · ${escapeHtml(user.ownerName || '-')}</h2>
          <div class="section-sub">${shortPhone(user.phone)} · ${escapeHtml(user.status || '-')} · 最新 ${numberText(summary.shown || 0)} / 全部 ${numberText(summary.total || 0)} 条</div>
        </div>
        ${help('时间线按事件时间倒序。内容、备忘和反馈只展示短摘要；会话类记录不展示私信正文，避免后台排查时过度暴露隐私。')}
      </div>
      <div class="timeline-summary-strip">
        <span>内容 ${numberText(summary.content || 0)}</span>
        <span>安全 ${numberText(summary.safety || 0)}</span>
        <span>客服 ${numberText(summary.support || 0)}</span>
        <span>AI ${numberText(summary.ai || 0)}</span>
        <span>通知 ${numberText(summary.notification || 0)}</span>
        <span>事件 ${numberText(summary.event || 0)}</span>
      </div>
      <div class="toolbar moderation-toolbar user-timeline-toolbar">
        <div class="toolbar-left">
          <label>类型
            <select id="userTimelineKind">${options}</select>
          </label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="user-timeline-filter" data-phone="${escapeHtml(user.phone || '')}">筛选</button>
          <button class="small-button ghost" data-action="user-timeline-load" data-phone="${escapeHtml(user.phone || '')}">刷新</button>
          <button class="small-button ghost" data-action="user-timeline-close">收起</button>
        </div>
      </div>
      ${tableHtml(items, [
        ['时间', (item) => `<div>${formatTime(item.createdAt)}</div><div class="cell-sub">${escapeHtml(item.id || '-')}</div>`],
        ['类型', (item) => `${tonePill(item.kindLabel || item.kind || '-', userTimelineTone(item))}${item.status ? `<div class="cell-sub">${statusPill(item.status)}</div>` : ''}`],
        ['事件', (item) => `<div class="cell-title">${escapeHtml(item.title || '-')}</div><div class="cell-sub clamp">${escapeHtml(item.detail || '-')}</div>${item.actor ? `<div class="cell-sub">操作者：${escapeHtml(item.actor)}</div>` : ''}`],
        ['对象', (item) => `<div>${escapeHtml(item.targetLabel || item.targetId || '-')}</div><div class="cell-sub">${escapeHtml(item.targetType || '-')} · ${escapeHtml(item.targetId || '-')}</div>`],
      ], '暂无时间线记录')}
    </div>
  `;
}

async function renderUsers(force) {
  const [users, dataClearApprovals] = await Promise.all([
    load('users', '/admin/users', force),
    load('dataClearApprovals', '/admin/data-clear-approvals', force),
  ]);
  const dataClearSummary = dataClearApprovals.summary || {};
  const activeSanctions = users.reduce((sum, user) => sum + Number(user.sanctions?.activeCount || 0), 0);
  const withTags = users.filter((user) => (user.adminRiskTags || []).length).length;
  const withNotes = users.filter((user) => Number(user.adminNoteCount || 0) > 0).length;
  const activeToday = users.filter((user) => {
    const time = new Date(user.lastSeenAt || user.createdAt || 0).getTime();
    return Number.isFinite(time) && Date.now() - time <= 24 * 60 * 60 * 1000;
  }).length;
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('用户账号', numberText(users.length), `${numberText(users.filter((user) => user.petCount).length)} 位已建档`, '当前后台最多展示最近 200 位用户。')}
      ${metric('24h 活跃', numberText(activeToday), '按最近活跃时间估算', 'lastSeenAt 来自登录、发现刷新、埋点等移动端行为。')}
      ${metric('生效处罚', numberText(activeSanctions), '禁言 / 冻结 / 封禁 / 警告', '统计当前仍处于 active 的处罚记录，方便从用户列表快速发现风险。')}
      ${metric('运营标记', `${numberText(withTags)} / ${numberText(withNotes)}`, '风险标签 / 备注', '运营内部标签和备注只在后台展示，并写审计。')}
      ${metric('清理审批', numberText(dataClearSummary.pending || 0), '用户业务数据清理', '清理业务数据需先提交申请；审批通过才会真正影响移动端用户数据。')}
    </div>
    ${renderDataClearApprovals(dataClearApprovals)}
    <div class="card">
      <div class="section-head">
        <div>
          <h2>用户列表</h2>
          <div class="section-sub">账号、宠物、内容、处罚和运营标记；点“时间线”可查看单用户完整业务轨迹</div>
        </div>
        ${help('时间线聚合账号、宠物、宠物日历、宠友圈、关系、地点、AI、安全、客服、通知和移动端事件，适合客服排查和举报复核。')}
      </div>
      ${tableHtml(users, [
        ['用户', (u) => `<div class="cell-title">${escapeHtml(u.ownerName)}</div><div class="cell-sub">${shortPhone(u.phone)}</div>`],
        ['宠物', (u) => `${u.activePet ? `<div class="cell-title">${escapeHtml(u.activePet.name)}</div><div class="cell-sub">${escapeHtml(u.activePet.species)} · ${escapeHtml(u.activePet.breed || '-')}</div>` : '-'}`],
        ['设置', (u) => `${statusPill(u.settings.nearbyVisible ? 'nearby on' : 'nearby off')} ${statusPill(u.settings.pushNotifications ? 'push on' : 'push off')}`],
        ['内容', (u) => `<div>${u.socialPostCount} 条小事</div><div class="cell-sub">${u.reportsAgainstCount} 次被举报</div>`],
        ['账号状态', (u) => `${statusPill(u.status)}<div class="cell-sub">${(u.sanctions?.activeTypes || []).map((type) => statusPill(type)).join(' ') || '无生效处罚'}</div>`],
        ['运营标记', renderUserOpsMark],
        ['最近活跃', (u) => formatTime(u.lastSeenAt)],
        ['操作', (u) => `
          <div class="actions">
            <button class="small-button" data-action="user-timeline-load" data-phone="${escapeHtml(u.phone)}">时间线</button>
            <button class="small-button" data-action="user-note-add" data-phone="${escapeHtml(u.phone)}">备注</button>
            <button class="small-button" data-action="user-risk-tags" data-phone="${escapeHtml(u.phone)}" data-tags="${escapeHtml((u.adminRiskTags || []).join(','))}">标签</button>
            <button class="small-button" data-action="quick-mute" data-phone="${escapeHtml(u.phone)}">禁言24h</button>
            <button class="small-button danger" data-action="quick-freeze" data-phone="${escapeHtml(u.phone)}">冻结72h</button>
            <button class="small-button danger" data-action="clear-user-business-data" data-phone="${escapeHtml(u.phone)}">清理业务数据</button>
          </div>
        `],
      ], '暂无用户')}
    </div>
    ${renderUserTimelinePanel(state.userTimeline)}
  `;
}

function renderUserOpsMark(user) {
  const tags = (user.adminRiskTagLabels || (user.adminRiskTags || []).map((tag) => userRiskTagLabelMap[tag] || tag)).filter(Boolean);
  const tagHtml = tags.length ? `<div class="risk-row compact">${tags.map(riskBadge).join('')}</div>` : '<div class="cell-sub">无风险标签</div>';
  const noteCount = Number(user.adminNoteCount || 0);
  const latestNote = user.adminLatestNote ? escapeHtml(user.adminLatestNote) : '';
  const blockStats = user.socialBlockStats || {};
  const blockLine = Number(blockStats.blockedByCount || 0)
    ? `<div class="cell-sub">被拉黑 ${numberText(blockStats.blockedByCount)} 次 / ${numberText(blockStats.uniqueBlockerCount || 0)} 人${blockStats.topReasonLabel ? ` · ${escapeHtml(blockStats.topReasonLabel)}` : ''}</div>`
    : '';
  return `
    ${tagHtml}
    ${blockLine}
    <div class="cell-sub">${noteCount ? `${noteCount} 条备注${user.adminLatestNoteAt ? ` · ${formatTime(user.adminLatestNoteAt)}` : ''}` : '暂无运营备注'}</div>
    ${latestNote ? `<div class="cell-sub clamp">最近：${latestNote}</div>` : ''}
  `;
}

function petFilterOption(current, value, label) {
  return `<option value="${escapeHtml(value)}" ${String(current) === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function petProfileCell(row) {
  const avatar = row.avatarUrl
    ? `<img src="${escapeHtml(row.avatarUrl)}" alt="${escapeHtml(row.name || '宠物头像')}" />`
    : '<span>宠</span>';
  return `
    <div class="pet-profile-cell">
      <div class="pet-avatar-thumb">${avatar}</div>
      <div>
        <div class="cell-title">${escapeHtml(row.name || '-')} ${row.isActivePet ? statusPill('默认') : ''}</div>
        <div class="cell-sub">${escapeHtml(row.id || '-')}</div>
      </div>
    </div>
  `;
}

function petAvatarStatus(row) {
  const tags = [statusPill(row.avatarStatusLabel || '缺头像')];
  if (row.latestAvatarJobStatus && row.latestAvatarJobStatus !== 'none') tags.push(statusPill(`AI ${row.latestAvatarJobStatus}`));
  if (row.hasPetCircleCover) tags.push(statusPill('有封面'));
  return `${tags.join(' ')}<div class="cell-sub">${row.avatarJobId ? escapeHtml(row.avatarJobId) : '暂无 AI 任务关联'}</div>`;
}

function renderPetMediaActions(row) {
  const buttons = [
    `<button class="small-button" data-action="pet-profile-edit" data-id="${escapeHtml(row.id)}">修正资料</button>`,
    `<button class="small-button" data-action="pet-media-replace" data-id="${escapeHtml(row.id)}" data-kind="avatar" data-name="${escapeHtml(row.name || '')}" data-current-url="${escapeHtml(row.avatarUrl || '')}">换头像</button>`,
    `<button class="small-button" data-action="pet-media-replace" data-id="${escapeHtml(row.id)}" data-kind="ai-avatar" data-name="${escapeHtml(row.name || '')}" data-current-url="${escapeHtml(row.avatarUrl || '')}">换AI形象</button>`,
    `<button class="small-button" data-action="pet-media-replace" data-id="${escapeHtml(row.id)}" data-kind="cover" data-name="${escapeHtml(row.name || '')}" data-current-url="${escapeHtml(row.petCircleCoverImageUrl || '')}">换封面</button>`,
    `<button class="small-button danger" data-action="pet-profile-merge" data-id="${escapeHtml(row.id)}" data-name="${escapeHtml(row.name || '')}" data-phone="${escapeHtml(row.phone || '')}">合并</button>`,
  ];
  if (row.avatarStatusKey === 'ai') {
    buttons.push(`<button class="small-button danger" data-action="pet-media-clear" data-id="${escapeHtml(row.id)}" data-kind="ai-avatar" data-name="${escapeHtml(row.name || '')}">清AI形象</button>`);
  } else if (row.hasAvatar) {
    buttons.push(`<button class="small-button danger" data-action="pet-media-clear" data-id="${escapeHtml(row.id)}" data-kind="avatar" data-name="${escapeHtml(row.name || '')}">清头像</button>`);
  }
  if (row.hasPetCircleCover) {
    buttons.push(`<button class="small-button danger" data-action="pet-media-clear" data-id="${escapeHtml(row.id)}" data-kind="cover" data-name="${escapeHtml(row.name || '')}">清封面</button>`);
  }
  return `<div class="actions pet-profile-actions">${buttons.join('')}</div>`;
}

function cachedPetProfileRow(petId) {
  return (state.cache.pets?.items || []).find((item) => item.id === petId) || null;
}

async function adminPetProfileRowById(petId) {
  const id = String(petId || '').trim();
  if (!id) return null;
  const cached = cachedPetProfileRow(id);
  if (cached) return cached;
  const data = await load('pets', `/admin/pets?q=${encodeURIComponent(id)}`, true);
  return (data.items || []).find((item) => item.id === id) || null;
}

function clearPetProfileCaches() {
  ['aiMedia', 'audit', 'avatarJobs', 'avatarSamples', 'exports', 'notifications', 'petCalendar', 'petChat', 'pets', 'socialPosts', 'socialRelations', 'summary', 'users'].forEach((key) => {
    state.cache[key] = null;
  });
}

function normalizeAdminPetWeightInput(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const number = Number(text);
  return Number.isFinite(number) ? number : text;
}

async function editPetProfile(button) {
  const petId = button.dataset.id;
  const row = cachedPetProfileRow(petId);
  if (!petId || !row) {
    showToast('请刷新宠物档案列表后再操作');
    return;
  }
  const name = window.prompt('宠物昵称', row.name || '');
  if (name === null) return;
  const species = window.prompt('宠物类型：dog / cat', row.species === 'cat' ? 'cat' : 'dog');
  if (species === null) return;
  const breed = window.prompt('品种，可填“待完善”', row.breed || '');
  if (breed === null) return;
  const gender = window.prompt('性别：male / female / unknown', row.gender || 'unknown');
  if (gender === null) return;
  const birthday = window.prompt('生日：YYYY / YYYY-MM / YYYY-MM-DD；留空表示未知', row.birthday || '');
  if (birthday === null) return;
  const weightKg = window.prompt('体重 kg；留空表示未知', row.weightKg || '');
  if (weightKg === null) return;
  const reason = window.prompt('请输入修正原因，会写入审计并通知用户', `修正宠物资料：${row.name}`);
  if (reason === null) return;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    showToast('请填写修正原因');
    return;
  }
  const profile = {
    birthday: birthday.trim(),
    breed: breed.trim(),
    gender: gender.trim() || 'unknown',
    name: name.trim(),
    species: species.trim(),
    weightKg: normalizeAdminPetWeightInput(weightKg),
  };
  if (!window.confirm(`确认修正「${row.name}」的宠物资料？该操作会影响移动端首页、宠物日历、AI 对话上下文，并写入审计。`)) return;
  const result = await patch(`/admin/pets/${encodeURIComponent(petId)}`, {
    profile,
    reason: trimmedReason,
  });
  state.cache = { ...state.cache, audit: null, petCalendar: null, pets: null, users: null };
  showToast(`宠物资料已修正：${(result.changedFields || []).map((field) => ({
    birthday: '生日',
    breed: '品种',
    gender: '性别',
    name: '昵称',
    species: '类型',
    weightKg: '体重',
  }[field] || field)).join('、') || '已更新'}`);
  await render(true);
}

async function mergePetProfile(button) {
  const sourcePetId = button.dataset.id || '';
  const source = await adminPetProfileRowById(sourcePetId);
  if (!source) {
    showToast('源宠物档案不存在或已被合并，请刷新列表');
    return;
  }
  const targetPetIdInput = window.prompt(
    `把「${source.name || source.id}」合并到哪只目标宠物？\n\n只允许合并同一用户下的重复宠物。请输入目标宠物 ID：`,
    '',
  );
  if (targetPetIdInput === null) return;
  const targetPetId = targetPetIdInput.trim();
  if (!targetPetId) {
    showToast('请填写目标宠物 ID');
    return;
  }
  if (targetPetId === source.id) {
    showToast('不能把宠物档案合并到自身');
    return;
  }
  const target = await adminPetProfileRowById(targetPetId);
  if (!target) {
    showToast('目标宠物档案不存在，请确认 ID');
    return;
  }
  if (target.phone !== source.phone) {
    showToast('当前只允许合并同一用户下的宠物档案');
    return;
  }
  const reason = window.prompt('请输入合并原因，系统会写入审计并通知用户', `合并重复宠物档案：${source.name || source.id} -> ${target.name || target.id}`);
  if (reason === null) return;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    showToast('请填写合并原因');
    return;
  }
  const confirmation = window.prompt(
    `高风险操作确认\n\n源宠物「${source.name || source.id}」会从用户宠物列表移除；日历、AI任务、宠友圈、AI对话、通知和会话卡片会迁移到「${target.name || target.id}」。\n\n请输入源宠物 ID 以确认：`,
    '',
  );
  if (confirmation === null) return;
  if (confirmation.trim() !== source.id) {
    showToast('确认 ID 不匹配，已取消合并');
    return;
  }
  const result = await post(`/admin/pets/${encodeURIComponent(source.id)}/merge`, {
    confirmation: confirmation.trim(),
    reason: trimmedReason,
    targetPetId,
  });
  clearPetProfileCaches();
  const summary = result.summary || {};
  const calendar = summary.calendar || {};
  showToast(`宠物档案已合并：迁移小事 ${summary.socialMoments || 0} 条、日历 ${(calendar.weights || 0) + (calendar.vaccines || 0) + (calendar.memos || 0)} 条、AI任务 ${(summary.avatarJobs || 0) + (summary.avatarAnimationJobs || 0)} 个`);
  await render(true);
}

async function clearPetMedia(button) {
  const petId = button.dataset.id;
  const kind = button.dataset.kind || '';
  const petName = button.dataset.name || '这只宠物';
  const kindLabel = kind === 'cover' ? '宠友圈封面' : kind === 'ai-avatar' ? 'AI 灵伴形象' : '宠物头像';
  const reason = window.prompt(`请输入清空「${petName}」${kindLabel}的原因`, `${kindLabel}不符合平台规则`);
  if (reason === null) return;
  const trimmed = reason.trim();
  if (!trimmed) {
    showToast('请填写处理原因');
    return;
  }
  if (!window.confirm(`确认清空「${petName}」的${kindLabel}？该操作会影响移动端展示，并写入审计日志。`)) return;
  await post(`/admin/pets/${encodeURIComponent(petId)}/media/${encodeURIComponent(kind)}/clear`, { reason: trimmed });
  state.cache = { ...state.cache, audit: null, pets: null, users: null };
  showToast(`${kindLabel}已清空`);
  await render(true);
}

async function replacePetMedia(button) {
  const petId = button.dataset.id;
  const kind = button.dataset.kind || '';
  const petName = button.dataset.name || '这只宠物';
  const currentUrl = button.dataset.currentUrl || '';
  const kindLabel = kind === 'cover' ? '宠友圈封面' : kind === 'ai-avatar' ? 'AI 灵伴形象' : '宠物头像';
  const imageUrl = window.prompt(`请输入「${petName}」新的${kindLabel}图片 URL`, currentUrl || 'https://');
  if (imageUrl === null) return;
  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) {
    showToast(`请填写新的${kindLabel}图片 URL`);
    return;
  }
  const reason = window.prompt(`请输入替换「${petName}」${kindLabel}的原因`, `${kindLabel}运营替换`);
  if (reason === null) return;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    showToast('请填写替换原因');
    return;
  }
  const impact = kind === 'cover'
    ? '该操作会影响移动端宠友圈主页封面，并写入审计日志。'
    : kind === 'ai-avatar'
      ? '该操作会影响移动端首页、AI 对话头像和宠友圈头像；会登记为已应用的 AI 灵伴形象，解除旧 AI 任务关联和旧动效，并写入审计日志。'
      : '该操作会影响移动端首页、宠物档案、宠友圈头像；若原头像是 AI 形象，会解除旧 AI 任务关联和旧动效，并写入审计日志。';
  if (!window.confirm(`确认替换「${petName}」的${kindLabel}？${impact}`)) return;
  await post(`/admin/pets/${encodeURIComponent(petId)}/media/${encodeURIComponent(kind)}/replace`, {
    imageUrl: trimmedUrl,
    reason: trimmedReason,
  });
  state.cache = { ...state.cache, aiMedia: null, audit: null, pets: null, users: null };
  showToast(`${kindLabel}已替换`);
  await render(true);
}

async function renderPets(force) {
  const query = new URLSearchParams({
    avatar: state.petAvatar,
    birthday: state.petBirthday,
    q: state.petQ,
    species: state.petSpecies,
  });
  const data = await load('pets', `/admin/pets?${query.toString()}`, force);
  const rows = data.items || [];
  const summary = data.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('宠物档案', numberText(summary.all), `${numberText(summary.totalPets)} 只全量`, '当前筛选下的宠物档案数量；全量不受筛选影响。')}
      ${metric('狗狗 / 猫咪', `${numberText(summary.dogs)} / ${numberText(summary.cats)}`, 'MVP 支持物种', '用于观察当前测试用户的宠物结构。')}
      ${metric('AI 形象', numberText(summary.aiAvatar), `${numberText(summary.missingAvatar)} 只缺头像`, 'AI 形象已应用表示有 ready 且 acceptedPetId 关联该宠物的生成任务。')}
      ${metric('生日完整', numberText(summary.fullBirthday), `${numberText(summary.partialBirthday)} 只部分日期`, '生日可能只知道年份或年月，本页按完整度拆开排查。')}
      ${metric('未知生日', numberText(summary.unknownBirthday), '主人未填写或不清楚', '这能帮助后续决定是否做生日补全引导。')}
      ${metric('宠友圈内容', numberText(summary.socialPosts), `${numberText(summary.cover)} 只有封面`, '按宠物维度统计已发布且未删除的小事。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>宠物档案</h2>
          <div class="section-sub">全局排查与媒体治理：宠物资料、头像、AI 形象、宠友圈和日历关联记录</div>
        </div>
        ${help('这页直接聚合 users.pets 和关联业务数据。替换或清空头像、AI 形象、封面会写审计、通知用户，并影响移动端下一次刷新后的展示；不导出图片二进制。')}
      </div>
      <div class="toolbar moderation-toolbar pet-profile-toolbar">
        <div class="toolbar-left">
          <label>物种
            <select id="petSpecies">
              ${petFilterOption(state.petSpecies, 'all', '全部')}
              ${petFilterOption(state.petSpecies, 'dog', '狗狗')}
              ${petFilterOption(state.petSpecies, 'cat', '猫咪')}
              ${petFilterOption(state.petSpecies, 'other', '其他')}
            </select>
          </label>
          <label>生日完整度
            <select id="petBirthday">
              ${petFilterOption(state.petBirthday, 'all', '全部')}
              ${petFilterOption(state.petBirthday, 'unknown', '未知')}
              ${petFilterOption(state.petBirthday, 'year', '仅年份')}
              ${petFilterOption(state.petBirthday, 'month', '年月')}
              ${petFilterOption(state.petBirthday, 'full', '完整日期')}
              ${petFilterOption(state.petBirthday, 'invalid', '格式异常')}
            </select>
          </label>
          <label>形象状态
            <select id="petAvatar">
              ${petFilterOption(state.petAvatar, 'all', '全部')}
              ${petFilterOption(state.petAvatar, 'missing', '缺头像')}
              ${petFilterOption(state.petAvatar, 'basic', '普通头像')}
              ${petFilterOption(state.petAvatar, 'ai', 'AI 形象已应用')}
              ${petFilterOption(state.petAvatar, 'cover', '有宠友圈封面')}
            </select>
          </label>
          <label>搜索<input id="petQ" placeholder="手机号、主人、宠物、品种、宠物ID、任务ID" value="${escapeHtml(state.petQ)}" /></label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="pets-filter">筛选</button>
          <button class="small-button ghost" data-action="pets-clear">清空</button>
        </div>
      </div>
      ${tableHtml(rows, [
        ['宠物', petProfileCell],
        ['主人', (r) => `<div class="cell-title">${escapeHtml(r.ownerName || '-')}</div><div class="cell-sub">${shortPhone(r.phone)} · ${escapeHtml(r.ownerStatus || 'active')}</div>`],
        ['档案', (r) => `<div>${statusPill(r.speciesLabel || r.species)} ${escapeHtml(r.breed || '-')}</div><div class="cell-sub">${escapeHtml(r.genderLabel || '未知')} · ${escapeHtml(r.birthday || '生日未知')} · ${escapeHtml(r.ageLabel || '-')}</div><div class="cell-sub">${r.weightKg ? `${escapeHtml(r.weightKg)} kg` : '体重待记录'}</div>`],
        ['形象', petAvatarStatus],
        ['关联记录', (r) => `<div>${numberText(r.calendarCount)} 条日历</div><div class="cell-sub">${numberText(r.socialPostCount)} 条小事 · ${numberText(r.placeReviewCount)} 条地点点评</div>`],
        ['时间', (r) => `<div>建档：${formatTime(r.createdAt)}</div><div class="cell-sub">最近关联：${formatTime(r.latestActivityAt)}</div>`],
        ['操作', renderPetMediaActions],
      ], '暂无宠物档案')}
    </div>
    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>运营口径</h2>
            <div class="section-sub">宠物档案是用户、AI、日历和社交的共同底座</div>
          </div>
          ${help('同一主人可以有多只宠物；默认宠物会影响首页、AI 对话、宠友圈和约遛展示，所以这里单独标出默认宠物。')}
        </div>
        <div class="gap-list">
          <div><strong>生日可不完整</strong><span>支持未知、仅年份、年月、完整日期，后台不要把未知误当作异常。</span></div>
          <div><strong>AI 形象不是普通头像</strong><span>只有已接受并应用到宠物的 ready 任务，才标为 AI 形象已应用。</span></div>
          <div><strong>关联排查</strong><span>日历、小事、地点点评和 AI 任务都可以通过宠物维度串起来。</span></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>媒体治理动作</h2>
            <div class="section-sub">已开放替换头像/封面，以及清空违规头像、AI 形象和封面</div>
          </div>
          ${help('媒体动作会保留 before/after 审计，并给用户写入站内通知；后台替换要求图片 URL，头像替换会解除旧 AI 形象关联和旧动效，避免继续播放过期素材。')}
        </div>
        <div class="gap-list">
          <div><strong>替换头像</strong><span>用于用户申诉或运营修正头像，移动端首页、宠物档案、AI 对话头像和宠友圈头像会随刷新更新。</span></div>
          <div><strong>替换封面</strong><span>用于修正宠友圈主页封面，移动端宠友圈主页会直接读取新封面。</span></div>
          <div><strong>清空头像</strong><span>用于普通头像违规，移动端会回到现有兜底头像展示。</span></div>
          <div><strong>清空 AI 形象</strong><span>用于 AI 结果不适合展示，会解除已应用任务关联并清空当前头像。</span></div>
          <div><strong>清空封面</strong><span>用于宠友圈封面违规，移动端宠友圈主页回退到小事图片或宠物头像。</span></div>
          <div><strong>资料修正已开放</strong><span>昵称、类型、品种、性别、生日和体重可由后台带原因修正，并同步影响移动端展示。</span></div>
          <div><strong>合并重复宠物已开放</strong><span>仅支持同一用户下合并；会迁移日历、AI、宠友圈、AI 对话、通知和会话卡片引用，并保留 before/after 审计。</span></div>
          <div><strong>合并确认规则</strong><span>目标宠物保留现有资料，源宠物只补齐目标空字段；操作时必须输入目标宠物 ID、原因和源宠物 ID 确认。</span></div>
        </div>
      </div>
    </div>
  `;
}

function petCalendarOption(current, value, label) {
  return `<option value="${escapeHtml(value)}" ${String(current) === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function petCalendarSourceBadge(record) {
  const tone = record.sourceKey === 'ai_chat' ? 'warn' : record.sourceKey === 'pet_circle' ? 'ok' : '';
  return `<span class="pill ${tone}">${escapeHtml(record.sourceLabel || '-')}</span>`;
}

function renderPetCalendarActions(row) {
  if (row.isDeleted) {
    return `<div class="actions pet-calendar-actions"><button class="small-button" data-action="pet-calendar-restore" data-id="${escapeHtml(row.id)}">恢复</button></div>`;
  }
  return `
    <div class="actions pet-calendar-actions">
      <button class="small-button" data-action="pet-calendar-edit" data-id="${escapeHtml(row.id)}">修正</button>
      <button class="small-button danger" data-action="pet-calendar-delete" data-id="${escapeHtml(row.id)}">删除</button>
    </div>
  `;
}

function renderPetCalendarBatchCell(row) {
  return `<label class="inline-check"><input class="pet-calendar-batch-check" type="checkbox" value="${escapeHtml(row.id)}" /> 批量</label>`;
}

function cachedPetCalendarRow(recordId) {
  return (state.cache.petCalendar?.records || []).find((item) => item.id === recordId) || null;
}

function clearPetCalendarCaches() {
  state.cache = { ...state.cache, audit: null, notifications: null, petCalendar: null, pets: null, summary: null, users: null };
}

function parseAdminPromptBoolean(value, fallback = false) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return fallback;
  if (['1', 'true', 'yes', 'y', '开', '开启', '是'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', '关', '关闭', '否'].includes(text)) return false;
  return text === 'true';
}

function petCalendarChangedLabel(field) {
  return {
    content: '内容',
    dueAt: '计划日期',
    kg: '体重',
    name: '名称',
    note: '备注',
    recordedAt: '记录日期',
    reminderAt: '提醒时间',
    reminderEnabled: '提醒开关',
    repeat: '重复频率',
    status: '状态',
    title: '标题',
  }[field] || field;
}

function promptPetCalendarPatch(row) {
  if (row.type === 'weight') {
    const kg = window.prompt('体重 kg', row.kg || '');
    if (kg === null) return null;
    const recordedAt = window.prompt('记录日期：YYYY-MM-DD', row.recordedAt || row.date || '');
    if (recordedAt === null) return null;
    const note = window.prompt('体重备注，可留空', row.note || '');
    if (note === null) return null;
    return {
      kg: normalizeAdminPetWeightInput(kg),
      note: note.trim(),
      recordedAt: recordedAt.trim(),
    };
  }
  if (row.type === 'vaccine') {
    const name = window.prompt('疫苗/驱虫名称', row.name || row.title || '');
    if (name === null) return null;
    const dueAt = window.prompt('计划日期：YYYY-MM-DD', row.dueAt || row.date || '');
    if (dueAt === null) return null;
    const status = window.prompt('状态：due / overdue / done（移动端 due/overdue 都显示计划中）', row.rawStatus || 'due');
    if (status === null) return null;
    const reminderEnabled = window.prompt('是否开启提醒：true / false', row.reminderEnabled ? 'true' : 'false');
    if (reminderEnabled === null) return null;
    return {
      dueAt: dueAt.trim(),
      name: name.trim(),
      reminderEnabled: parseAdminPromptBoolean(reminderEnabled, Boolean(row.reminderEnabled)),
      status: status.trim(),
    };
  }
  const title = window.prompt('备忘标题', row.title || '');
  if (title === null) return null;
  const content = window.prompt('备忘内容', row.content || row.detail || '');
  if (content === null) return null;
  const reminderEnabled = window.prompt('是否开启提醒：true / false', row.reminderEnabled ? 'true' : 'false');
  if (reminderEnabled === null) return null;
  const reminderAt = window.prompt('提醒时间：YYYY-MM-DD HH:mm；关闭提醒可留空', row.reminderAt || '');
  if (reminderAt === null) return null;
  const repeat = window.prompt('重复频率：none / monthly / quarterly / yearly', row.repeat || 'none');
  if (repeat === null) return null;
  return {
    content: content.trim(),
    reminderAt: reminderAt.trim(),
    reminderEnabled: parseAdminPromptBoolean(reminderEnabled, Boolean(row.reminderEnabled)),
    repeat: repeat.trim() || 'none',
    title: title.trim(),
  };
}

function promptPetCalendarCreate() {
  const phone = window.prompt('用户手机号', '');
  if (phone === null) return null;
  const petId = window.prompt('宠物 ID（可从宠物档案或当前列表复制）', '');
  if (petId === null) return null;
  const type = window.prompt('新增类型：weight / vaccine / memo', 'memo');
  if (type === null) return null;
  const normalizedType = type.trim();
  if (!['memo', 'vaccine', 'weight'].includes(normalizedType)) {
    showToast('新增类型只能是 weight / vaccine / memo');
    return null;
  }
  if (normalizedType === 'weight') {
    const kg = window.prompt('体重 kg', '');
    if (kg === null) return null;
    const recordedAt = window.prompt('记录日期：YYYY-MM-DD', new Date().toISOString().slice(0, 10));
    if (recordedAt === null) return null;
    const note = window.prompt('体重备注，可留空', '运营新增体重记录');
    if (note === null) return null;
    return {
      phone: phone.trim(),
      petId: petId.trim(),
      record: {
        kg: normalizeAdminPetWeightInput(kg),
        note: note.trim(),
        recordedAt: recordedAt.trim(),
      },
      type: normalizedType,
    };
  }
  if (normalizedType === 'vaccine') {
    const name = window.prompt('疫苗/驱虫名称', '疫苗/驱虫计划');
    if (name === null) return null;
    const dueAt = window.prompt('计划日期：YYYY-MM-DD', new Date().toISOString().slice(0, 10));
    if (dueAt === null) return null;
    const status = window.prompt('状态：due / overdue / done（移动端 due/overdue 都显示计划中）', 'due');
    if (status === null) return null;
    const reminderEnabled = window.prompt('是否开启提醒：true / false', 'false');
    if (reminderEnabled === null) return null;
    return {
      phone: phone.trim(),
      petId: petId.trim(),
      record: {
        dueAt: dueAt.trim(),
        name: name.trim(),
        reminderEnabled: parseAdminPromptBoolean(reminderEnabled, false),
        status: status.trim() || 'due',
      },
      type: normalizedType,
    };
  }
  const title = window.prompt('备忘标题', '运营备忘');
  if (title === null) return null;
  const content = window.prompt('备忘内容', '');
  if (content === null) return null;
  const reminderEnabled = window.prompt('是否开启提醒：true / false', 'false');
  if (reminderEnabled === null) return null;
  const reminderAt = window.prompt('提醒时间：YYYY-MM-DD HH:mm；关闭提醒可留空', '');
  if (reminderAt === null) return null;
  const repeat = window.prompt('重复频率：none / monthly / quarterly / yearly', 'none');
  if (repeat === null) return null;
  return {
    phone: phone.trim(),
    petId: petId.trim(),
    record: {
      content: content.trim(),
      reminderAt: reminderAt.trim(),
      reminderEnabled: parseAdminPromptBoolean(reminderEnabled, false),
      repeat: repeat.trim() || 'none',
      title: title.trim(),
    },
    type: normalizedType,
  };
}

async function createPetCalendarRecord() {
  const draft = promptPetCalendarCreate();
  if (!draft) return;
  const reason = window.prompt('请输入新增原因，会写入审计并通知用户', `运营新增宠物日历记录：${draft.phone}`);
  if (reason === null) return;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    showToast('请填写新增原因');
    return;
  }
  if (!window.confirm('确认新增这条宠物日历记录？该操作会直接出现在用户移动端宠物日历中，并写入审计。')) return;
  const result = await post('/admin/pet-calendar', {
    ...draft,
    reason: trimmedReason,
  });
  clearPetCalendarCaches();
  showToast(`宠物日历已新增：${result.item?.typeLabel || draft.type}`);
  await render(true);
}

async function editPetCalendarRecord(button) {
  const recordId = button.dataset.id;
  const row = cachedPetCalendarRow(recordId);
  if (!recordId || !row) {
    showToast('请刷新宠物日历列表后再操作');
    return;
  }
  const record = promptPetCalendarPatch(row);
  if (!record) return;
  const reason = window.prompt('请输入修正原因，会写入审计并通知用户', `修正宠物日历记录：${row.petName || row.ownerName}`);
  if (reason === null) return;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    showToast('请填写修正原因');
    return;
  }
  if (!window.confirm(`确认修正「${row.petName || '宠物'}」的${row.typeLabel || '宠物日历'}记录？该操作会影响移动端宠物日历，并写入审计。`)) return;
  const result = await patch(`/admin/pet-calendar/${encodeURIComponent(recordId)}`, {
    reason: trimmedReason,
    record,
  });
  clearPetCalendarCaches();
  showToast(`宠物日历已修正：${(result.changedFields || []).map(petCalendarChangedLabel).join('、') || '已更新'}`);
  await render(true);
}

async function deletePetCalendarRecord(button) {
  const recordId = button.dataset.id;
  const row = cachedPetCalendarRow(recordId);
  if (!recordId || !row) {
    showToast('请刷新宠物日历列表后再操作');
    return;
  }
  const reason = window.prompt('请输入删除原因，会写入审计并通知用户', `删除宠物日历记录：${row.petName || row.ownerName}`);
  if (reason === null) return;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    showToast('请填写删除原因');
    return;
  }
  if (!window.confirm(`确认删除「${row.petName || '宠物'}」的${row.typeLabel || '宠物日历'}记录？移动端将不再展示，但后台可恢复。`)) return;
  const result = await post(`/admin/pet-calendar/${encodeURIComponent(recordId)}/delete`, {
    reason: trimmedReason,
  });
  clearPetCalendarCaches();
  showToast(`宠物日历已删除：${result.item?.typeLabel || row.typeLabel || '记录'}`);
  await render(true);
}

async function restorePetCalendarRecord(button) {
  const recordId = button.dataset.id;
  const row = cachedPetCalendarRow(recordId);
  if (!recordId || !row) {
    showToast('请刷新宠物日历列表后再操作');
    return;
  }
  const reason = window.prompt('请输入恢复原因，会写入审计并通知用户', `恢复宠物日历记录：${row.petName || row.ownerName}`);
  if (reason === null) return;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    showToast('请填写恢复原因');
    return;
  }
  if (!window.confirm(`确认恢复「${row.petName || '宠物'}」的${row.typeLabel || '宠物日历'}记录？移动端将重新展示。`)) return;
  const result = await post(`/admin/pet-calendar/${encodeURIComponent(recordId)}/restore`, {
    reason: trimmedReason,
  });
  clearPetCalendarCaches();
  showToast(`宠物日历已恢复：${result.item?.typeLabel || row.typeLabel || '记录'}`);
  await render(true);
}

async function batchPetCalendarRecords() {
  const recordIds = Array.from(document.querySelectorAll('.pet-calendar-batch-check:checked')).map((item) => item.value).filter(Boolean);
  if (!recordIds.length) {
    showToast('请先勾选要批量处理的日历记录');
    return;
  }
  const action = $('petCalendarBulkAction')?.value || 'delete';
  const label = action === 'restore' ? '恢复' : '删除';
  const reason = window.prompt(`请输入批量${label}原因，会写入审计并通知用户`, `批量${label}宠物日历记录`);
  if (reason === null) return;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    showToast(`请填写批量${label}原因`);
    return;
  }
  if (!window.confirm(`确认批量${label} ${recordIds.length} 条宠物日历记录？`)) return;
  const result = await post('/admin/pet-calendar/batch', {
    action,
    reason: trimmedReason,
    recordIds,
  });
  clearPetCalendarCaches();
  showToast(`批量${label}完成：成功 ${result.successCount || 0}，失败 ${result.errorCount || 0}`);
  await render(true);
}

async function renderPetCalendar(force) {
  const query = new URLSearchParams({
    from: state.petCalendarFrom,
    q: state.petCalendarQ,
    recordState: state.petCalendarRecordState,
    source: state.petCalendarSource,
    status: state.petCalendarStatus,
    to: state.petCalendarTo,
    type: state.petCalendarType,
  });
  const data = await load('petCalendar', `/admin/pet-calendar?${query.toString()}`, force);
  const records = data.records || [];
  const summary = data.summary || {};
  const defaultBulkAction = state.petCalendarRecordState === 'deleted' ? 'restore' : 'delete';
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('日历记录', numberText(summary.all), `${numberText(summary.active)} 有效 · ${numberText(summary.deleted)} 已删除`, '当前筛选下的体重、疫苗/驱虫和备忘总数；已删除记录只在选择“已删除/全部”时展示。')}
      ${metric('体重记录', numberText(summary.weights), `${numberText(summary.recorded)} 条已记录`, '体重来自移动端手动记录或 AI 对话自动写入。')}
      ${metric('疫苗/驱虫', numberText(summary.vaccines), `${numberText(summary.overdueVaccines)} 条已逾期`, '后台会区分 due / overdue；移动端统一展示为“计划中”。')}
      ${metric('备忘', numberText(summary.memos), `${numberText(summary.petCircleMemos)} 条宠友圈同步`, '备忘包括手动新增、宠友圈同步和 AI 对话创建。')}
      ${metric('提醒开启', numberText(summary.reminderEnabled), '疫苗/驱虫提醒', '这里统计当前筛选结果中已开启提醒的疫苗/驱虫计划。')}
      ${metric('AI 写入', numberText(summary.aiWrites), '对话自动记录', '来自 AI 对话自动创建的备忘、体重，或医疗门禁创建的就医提醒。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>宠物日历记录</h2>
          <div class="section-sub">展示并修正移动端真实宠物日历数据，体重、疫苗/驱虫、备忘都会写回用户记录</div>
        </div>
        ${help('后台技术字段仍读取 health store，但所有运营文案统一叫“宠物日历”。本页不调用会初始化默认记录的 C 端列表函数；修正记录时必须填写原因，并写入审计与用户通知。')}
      </div>
      <div class="toolbar moderation-toolbar pet-calendar-toolbar">
        <div class="toolbar-left">
          <label>类型
            <select id="petCalendarType">
              ${petCalendarOption(state.petCalendarType, 'all', '全部')}
              ${petCalendarOption(state.petCalendarType, 'weight', '体重')}
              ${petCalendarOption(state.petCalendarType, 'vaccine', '疫苗/驱虫')}
              ${petCalendarOption(state.petCalendarType, 'memo', '备忘')}
            </select>
          </label>
          <label>状态
            <select id="petCalendarStatus">
              ${petCalendarOption(state.petCalendarStatus, 'all', '全部')}
              ${petCalendarOption(state.petCalendarStatus, 'recorded', '已记录')}
              ${petCalendarOption(state.petCalendarStatus, 'due', '计划中')}
              ${petCalendarOption(state.petCalendarStatus, 'overdue', '已逾期')}
              ${petCalendarOption(state.petCalendarStatus, 'done', '已完成')}
            </select>
          </label>
          <label>来源
            <select id="petCalendarSource">
              ${petCalendarOption(state.petCalendarSource, 'all', '全部')}
              ${petCalendarOption(state.petCalendarSource, 'manual', '用户记录')}
              ${petCalendarOption(state.petCalendarSource, 'admin', '运营新增')}
              ${petCalendarOption(state.petCalendarSource, 'pet_circle', '宠友圈同步')}
              ${petCalendarOption(state.petCalendarSource, 'ai_chat', 'AI 对话')}
            </select>
          </label>
          <label>记录状态
            <select id="petCalendarRecordState">
              ${petCalendarOption(state.petCalendarRecordState, 'active', '有效记录')}
              ${petCalendarOption(state.petCalendarRecordState, 'deleted', '已删除')}
              ${petCalendarOption(state.petCalendarRecordState, 'all', '全部')}
            </select>
          </label>
          <label>开始日期<input id="petCalendarFrom" type="date" value="${escapeHtml(state.petCalendarFrom)}" /></label>
          <label>结束日期<input id="petCalendarTo" type="date" value="${escapeHtml(state.petCalendarTo)}" /></label>
          <label>搜索<input id="petCalendarQ" placeholder="手机号、宠物、标题、记录ID" value="${escapeHtml(state.petCalendarQ)}" /></label>
        </div>
        <div class="actions">
          <select id="petCalendarBulkAction">
            ${petCalendarOption(defaultBulkAction, 'delete', '批量删除')}
            ${petCalendarOption(defaultBulkAction, 'restore', '批量恢复')}
          </select>
          <button class="small-button" data-action="pet-calendar-batch">批量处理</button>
          <button class="small-button" data-action="pet-calendar-create">新增记录</button>
          <button class="small-button" data-action="pet-calendar-filter">筛选</button>
          <button class="small-button ghost" data-action="pet-calendar-clear">清空</button>
        </div>
      </div>
      ${tableHtml(records, [
        ['批量', renderPetCalendarBatchCell],
        ['用户 / 宠物', (r) => `<div class="cell-title">${escapeHtml(r.ownerName)}</div><div class="cell-sub">${shortPhone(r.phone)} · ${escapeHtml(r.petName)} ${r.petBreed ? `· ${escapeHtml(r.petBreed)}` : ''}</div>`],
        ['类型', (r) => `<div>${statusPill(r.typeLabel)}</div><div class="cell-sub">${escapeHtml(r.sourceId || '-')}</div>`],
        ['标题 / 内容', (r) => `<div class="cell-title">${escapeHtml(r.title || '-')}</div><div class="cell-sub clamp">${escapeHtml(r.detail || '-')}</div>`],
        ['日期', (r) => `<div>${escapeHtml(r.date || '-')}</div><div class="cell-sub">${r.isDeleted ? `删除：${formatTime(r.deletedAt)}` : `更新：${formatTime(r.updatedAt)}`}</div>`],
        ['状态', (r) => `${statusPill(r.statusLabel || r.status)}${r.isDeleted ? `<div class="cell-sub">${escapeHtml(r.deletionReason || '已进入可恢复区')}</div>` : r.reminderEnabled ? '<div class="cell-sub">已开提醒</div>' : ''}`],
        ['来源', (r) => `${petCalendarSourceBadge(r)}<div class="cell-sub">${escapeHtml(r.id)}</div>`],
        ['操作', renderPetCalendarActions],
      ], '暂无宠物日历记录')}
    </div>
    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>运营口径</h2>
            <div class="section-sub">后台看的是排查视角，移动端看的是主人理解视角</div>
          </div>
          ${help('例如疫苗 due / overdue 在后台分开，方便运营发现逾期提醒；移动端已按你的要求统一显示“计划中”。')}
        </div>
        <div class="gap-list">
          <div><strong>修正留痕</strong><span>后台可修正明显错误的体重、疫苗/驱虫和备忘字段，必须填写原因。</span></div>
          <div><strong>运营新增</strong><span>后台可按手机号和宠物 ID 新增体重、疫苗/驱虫或备忘，来源会标记为运营新增。</span></div>
          <div><strong>来源追踪</strong><span>宠友圈同步、AI 对话写入会被标识出来，方便解释“为什么日历里多了一条”。</span></div>
          <div><strong>软删除</strong><span>后台删除会从移动端真实日历移除，但保留快照、原因和恢复入口。</span></div>
          <div><strong>不制造默认记录</strong><span>本页直接读取持久化 state，不触发移动端健康列表的默认初始化逻辑。</span></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>动作边界</h2>
            <div class="section-sub">新增、修正、删除、恢复都写审计，批量动作额外沉淀汇总</div>
          </div>
          ${help('删除会直接影响移动端宠物日历，但不会硬删数据；恢复会把快照放回原 store。批量处理最多一次 50 条，仍逐条写审计和通知。')}
        </div>
        <div class="gap-list">
          <div><strong>体重修正</strong><span>支持 kg、记录日期和备注；同步更新宠物档案上的最新体重。</span></div>
          <div><strong>疫苗/驱虫修正</strong><span>支持名称、计划日期、状态和提醒开关；完成状态会关闭提醒。</span></div>
          <div><strong>删除与恢复</strong><span>体重会重算最新体重；疫苗/驱虫会同步关闭或恢复提醒；备忘会从移动端列表移除或恢复。</span></div>
        </div>
      </div>
    </div>
  `;
}

function socialRelationOption(current, value, label) {
  return `<option value="${escapeHtml(value)}" ${String(current) === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function socialRelationPair(row) {
  return `
    <div class="relationship-pair">
      <div><strong>${escapeHtml(row.fromName || '-')}</strong><span>${shortPhone(row.fromPhone)} · ${escapeHtml(row.fromPetName || '未建档')}</span></div>
      <div><strong>${escapeHtml(row.targetName || '-')}</strong><span>${shortPhone(row.targetPhone)} · ${escapeHtml(row.targetPetName || '未建档')}</span></div>
    </div>
  `;
}

function socialRelationRisk(row) {
  const risks = [];
  if (row.blocked) risks.push(statusPill('已拉黑'));
  if (row.notificationCount) risks.push(statusPill(`${row.notificationCount} 通知`));
  if (row.messageCount) risks.push(statusPill(`${row.messageCount} 消息`));
  if (row.kind === 'conversation') risks.push(statusPill('可审计查看'));
  const reason = row.blockReasonLabel ? `<div class="cell-sub">原因：${escapeHtml(row.blockReasonLabel)}${row.blockReasonDetail ? ` · ${escapeHtml(row.blockReasonDetail)}` : ''}</div>` : '';
  return `${risks.join(' ') || '<span class="muted">无明显风险</span>'}${reason}`;
}

function renderSocialRelationActions(row) {
  const buttons = [];
  if (row.conversationId && row.messageCount) {
    buttons.push(`<button class="small-button" data-action="social-relation-context" data-id="${escapeHtml(row.id)}">上下文</button>`);
  }
  if ((row.kind === 'greeting' || row.kind === 'walk_invite') && !row.blocked) {
    if (row.status !== 'accepted') {
      buttons.push(`<button class="small-button" data-action="social-relation-repair" data-id="${escapeHtml(row.id)}" data-repair-action="accept">修复接受</button>`);
    }
    if (row.status === 'pending') {
      buttons.push(`<button class="small-button ghost" data-action="social-relation-repair" data-id="${escapeHtml(row.id)}" data-repair-action="close">关闭</button>`);
    }
  }
  if (!buttons.length) return '<span class="muted">无操作</span>';
  return `<div class="actions relationship-actions">${buttons.join('')}</div>`;
}

function renderSocialRelationMessagePolicy(policy = {}) {
  const windowLimit = Number(policy.contextWindowLimit || 20);
  const retentionDays = Number(policy.retentionDays || 180);
  return `
    <div class="switch-panel relationship-policy">
      <div class="switch-row"><span>上下文窗口</span><strong>最近 ${numberText(windowLimit)} 条</strong></div>
      <div class="switch-row"><span>查看原因</span>${statusPill(policy.requireReason === false ? '可免填' : '必填')}</div>
      <div class="switch-row"><span>全文检索</span>${statusPill(policy.fullConversationSearchEnabled ? '已开放' : '未开放')}</div>
      <div class="switch-row"><span>审计保留标记</span><strong>${numberText(retentionDays)} 天</strong></div>
    </div>
  `;
}

function socialRelationContextMessageActions(message) {
  if (!message.canHide) return '';
  return `
    <button class="small-button danger"
      data-action="social-relation-message-hide"
      data-message-id="${escapeHtml(message.id)}"
      data-context-id="${escapeHtml(message.relationId || '')}"
      data-phone="${escapeHtml(message.ownerPhone || '')}"
      data-conversation-id="${escapeHtml(message.conversationId || '')}">
      隐藏
    </button>
  `;
}

function socialRelationMessageStatusLabel(status) {
  const labels = {
    deleted: '已删除',
    hidden: '已隐藏',
    sent: '已发送',
    system: '系统',
  };
  return labels[status] || status;
}

function renderSocialRelationContext(row) {
  const context = state.socialRelationContexts?.[row.id];
  if (!context) return row.messageCount ? '<div class="report-message-placeholder">需填写原因后查看最近消息窗口</div>' : '';
  const messages = (context.messages || []).map((message) => {
    const enriched = { ...message, relationId: row.id };
    return `
      <div class="report-message-row ${message.status === 'hidden' || message.status === 'deleted' ? 'target' : ''}">
        <div class="report-message-meta">
          <strong>${escapeHtml(message.authorLabel || message.author || '-')}</strong>
          <span>${escapeHtml(message.authorName || '-')} ${message.authorPhone ? shortPhone(message.authorPhone) : ''}</span>
          <span>${formatTime(message.time)}</span>
          ${message.status ? statusPill(socialRelationMessageStatusLabel(message.status)) : ''}
          ${socialRelationContextMessageActions(enriched)}
        </div>
        <div class="report-message-text">${escapeHtml(message.text || '无正文内容')}</div>
      </div>
    `;
  }).join('');
  return `
    <div class="report-message-context relationship-message-context">
      <div class="report-message-context-head">
        <strong>最近消息窗口</strong>
        <span>${numberText(context.messageCount || 0)} / ${numberText(context.totalMessages || 0)} 条 · ${formatTime(context.viewedAt)}</span>
      </div>
      <div class="cell-sub">查看原因：${escapeHtml(context.reason || '-')}</div>
      <div class="cell-sub">策略：最近 ${numberText(context.policy?.contextWindowLimit || context.messageCount || 0)} 条 / 审计保留至 ${context.retentionExpiresAt ? formatTime(context.retentionExpiresAt) : '-'}</div>
      ${messages || '<div class="cell-sub">暂无消息</div>'}
    </div>
  `;
}

function socialRelationSummary(row) {
  return `
    <div class="cell-title">${escapeHtml(row.summary || '-')}</div>
    <div class="cell-sub clamp">${escapeHtml(row.postId || row.placeId || row.conversationId || row.id)}</div>
    ${renderSocialRelationContext(row)}
  `;
}

async function loadSocialRelationContext(button) {
  const id = button.dataset.id;
  const policy = state.cache.socialRelations?.messageAccessPolicy || {};
  const reason = window.prompt('查看私信上下文需要填写原因，此操作会写入审计日志。', '关系消息排查，核对最近消息窗口');
  if (reason === null) return;
  const cleanReason = reason.trim();
  if (!cleanReason && policy.requireReason !== false) {
    showToast('请填写查看原因');
    return;
  }
  const context = await post(`/admin/social-relations/${encodeURIComponent(id)}/message-context`, {
    limit: policy.contextWindowLimit || undefined,
    reason: cleanReason,
  });
  state.socialRelationContexts = { ...state.socialRelationContexts, [id]: context };
  state.cache.audit = null;
  showToast('已加载会话上下文');
  await render(false);
}

async function hideSocialRelationMessage(button) {
  const messageId = button.dataset.messageId || '';
  const contextId = button.dataset.contextId || '';
  const phone = button.dataset.phone || '';
  const conversationId = button.dataset.conversationId || '';
  const reason = window.prompt('隐藏这条私信消息？隐藏后双方移动端会话都不再展示，并写入审计。', '关系消息页隐藏违规私信');
  if (reason === null) return;
  const cleanReason = reason.trim();
  if (!cleanReason) {
    showToast('请填写隐藏原因');
    return;
  }
  if (!window.confirm('确认隐藏这条私信消息？该操作会同步影响双方移动端会话。')) return;
  await post(`/admin/social-relations/messages/${encodeURIComponent(messageId)}/hide`, {
    conversationId,
    phone,
    reason: cleanReason,
  });
  state.cache = { ...state.cache, audit: null, reports: null, socialRelations: null };
  if (contextId) delete state.socialRelationContexts[contextId];
  showToast('私信消息已隐藏');
  await render(true);
}

async function repairSocialRelation(button) {
  const id = button.dataset.id || '';
  const repairAction = button.dataset.repairAction || '';
  const isAccept = repairAction === 'accept';
  const reason = window.prompt(
    isAccept
      ? '修复为已接受？后台会补齐双方可发消息关系和会话入口，并写入审计。'
      : '关闭这条待处理关系？后台会清理待处理状态，并写入审计。',
    isAccept ? '运营修复异常关系为已接受' : '运营关闭异常待处理关系',
  );
  if (reason === null) return;
  const cleanReason = reason.trim();
  if (!cleanReason) {
    showToast('请填写修复原因');
    return;
  }
  const confirmText = isAccept
    ? '确认修复为已接受？移动端双方会变为可发消息关系。'
    : '确认关闭这条待处理关系？移动端将不再把它视为可回复的待处理邀请。';
  if (!window.confirm(confirmText)) return;
  await post(`/admin/social-relations/${encodeURIComponent(id)}/repair`, {
    action: repairAction,
    reason: cleanReason,
  });
  state.cache = { ...state.cache, audit: null, socialRelations: null };
  delete state.socialRelationContexts[id];
  showToast(isAccept ? '关系已修复为已接受' : '关系已关闭');
  await render(true);
}

async function renderSocialRelations(force) {
  const query = new URLSearchParams({
    kind: state.socialRelationKind,
    q: state.socialRelationQ,
    status: state.socialRelationStatus,
  });
  const data = await load('socialRelations', `/admin/social-relations?${query.toString()}`, force);
  const rows = data.items || [];
  const messageAccessPolicy = data.messageAccessPolicy || {};
  const summary = data.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('关系记录', numberText(summary.all), `${numberText(summary.totalRecords)} 条全量`, '当前筛选下的招呼、约遛、会话和拉黑记录总数。')}
      ${metric('待处理', numberText(summary.pending), `${numberText(summary.rejected)} 条已拒绝`, 'pending 关系最容易造成用户误解，需要重点排查通知和可回复状态。')}
      ${metric('已接受', numberText(summary.accepted), '可发消息关系', '已接受招呼或约遛回复后建立的可消息关系。')}
      ${metric('招呼', numberText(summary.greetings), '发现页 / 宠友圈', '包括普通招呼和从宠友圈小事发起的招呼。')}
      ${metric('约遛', numberText(summary.walkInvites), '约遛邀请', '用于排查 B 收到 A 约遛后是否可以直接回复。')}
      ${metric('拉黑', numberText(summary.blocks || 0), `${numberText(summary.blockedTargetUsers || 0)} 位被拉黑`, '统计移动端拉黑行为及原因，用于发现疑似骚扰、广告或不安全互动账号。')}
      ${metric('会话消息', numberText(summary.messageCount), `${numberText(summary.notifications)} 条相关通知`, '会话只展示摘要；完整正文查看需要更高权限与审计。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>关系消息记录</h2>
          <div class="section-sub">招呼、约遛、会话、拉黑和通知链路；支持修复异常待处理关系</div>
        </div>
        ${help('默认只展示摘要；点击上下文需要填写原因并写审计。待处理招呼/约遛可修复为已接受或关闭，动作会影响移动端会话、可回复状态和招呼请求。')}
      </div>
      <div class="toolbar moderation-toolbar relationship-toolbar">
        <div class="toolbar-left">
          <label>类型
            <select id="socialRelationKind">
              ${socialRelationOption(state.socialRelationKind, 'all', '全部')}
              ${socialRelationOption(state.socialRelationKind, 'greeting', '招呼')}
              ${socialRelationOption(state.socialRelationKind, 'walk_invite', '约遛')}
              ${socialRelationOption(state.socialRelationKind, 'conversation', '会话')}
              ${socialRelationOption(state.socialRelationKind, 'block', '拉黑')}
            </select>
          </label>
          <label>状态
            <select id="socialRelationStatus">
              ${socialRelationOption(state.socialRelationStatus, 'all', '全部')}
              ${socialRelationOption(state.socialRelationStatus, 'pending', '待处理')}
              ${socialRelationOption(state.socialRelationStatus, 'accepted', '已接受')}
              ${socialRelationOption(state.socialRelationStatus, 'rejected', '已拒绝')}
              ${socialRelationOption(state.socialRelationStatus, 'blocked', '已拉黑')}
            </select>
          </label>
          <label>搜索<input id="socialRelationQ" placeholder="手机号、宠物、地点、动态ID、会话ID" value="${escapeHtml(state.socialRelationQ)}" /></label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="social-relations-filter">筛选</button>
          <button class="small-button ghost" data-action="social-relations-clear">清空</button>
        </div>
      </div>
      ${renderSocialRelationMessagePolicy(messageAccessPolicy)}
      ${tableHtml(rows, [
        ['类型', (r) => `<div>${statusPill(r.typeLabel)}</div><div class="cell-sub">${escapeHtml(r.sourceLabel || '-')}</div>`],
        ['双方', (r) => socialRelationPair(r)],
        ['状态', (r) => `${statusPill(r.statusLabel || r.status)}<div class="cell-sub">${formatTime(r.updatedAt || r.createdAt)}</div>`],
        ['摘要', socialRelationSummary],
        ['通知 / 风险', (r) => socialRelationRisk(r)],
        ['操作', renderSocialRelationActions],
      ], '暂无关系消息记录')}
    </div>
    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>排查口径</h2>
            <div class="section-sub">重点看状态、通知和双方是否能发消息</div>
          </div>
          ${help('约遛邀请产生 pending 会话时，接收方回复会自动接受关系；这里可以看待处理状态是否还存在。')}
        </div>
        <div class="gap-list">
          <div><strong>招呼</strong><span>pending 表示等待接收方处理；必要时可修复为 accepted 或关闭待处理请求。</span></div>
          <div><strong>约遛</strong><span>接收方从约遛会话回复时会转为 accepted；异常 pending 可由后台修复接受或关闭。</span></div>
          <div><strong>会话</strong><span>默认只显示摘要；需要原因后才可查看最近消息窗口，所有查看都会进审计。</span></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>拉黑原因统计</h2>
            <div class="section-sub">用于识别疑似骚扰、广告或不安全互动账号</div>
          </div>
          ${help('当一个账号被 3 个不同用户拉黑时，后端会自动打上“被频繁拉黑”运营风险标签；该标签只用于后台排查，不自动处罚。')}
        </div>
        ${tableHtml(summary.blockReasonRows || [], [
          ['原因', (row) => `<div class="cell-title">${escapeHtml(row.label || '-')}</div><div class="cell-sub">${escapeHtml(row.key || '-')}</div>`],
          ['次数', (row) => `<div class="cell-title">${numberText(row.count || 0)}</div>`],
        ], '暂无拉黑原因统计')}
      </div>
    </div>
  `;
}

function renderSanctionPolicyReview(policy = {}) {
  const summary = policy.summary || {};
  const reportSuggestions = policy.reportSuggestions || {};
  const mobileImpact = policy.mobileImpact || {};
  const activeTypeCounts = mobileImpact.activeTypeCounts || {};
  const recommendations = Array.isArray(policy.recommendations) ? policy.recommendations : [];
  const templateRows = Array.isArray(policy.templateRows) ? policy.templateRows : [];
  const sourceRows = Array.isArray(policy.sourceRows) ? policy.sourceRows : [];
  const repeatOffenders = Array.isArray(policy.repeatOffenders) ? policy.repeatOffenders : [];
  const pendingSuggestions = Array.isArray(reportSuggestions.pending) ? reportSuggestions.pending : [];
  const rules = Array.isArray(mobileImpact.rules) ? mobileImpact.rules : [];
  return `
    <div class="grid metrics">
      ${metric('处罚总数', numberText(summary.total || 0), `${numberText(summary.active || 0)} 条仍生效`, '来自真实处罚流水，包含手动处罚、举报处罚和内容作者快捷处罚。')}
      ${metric('申诉推翻率', percentText(summary.overturnRate || 0), `${numberText(summary.approvedAppeals || 0)} / ${numberText(summary.appeals || 0)} 条申诉通过`, '申诉通过代表原处罚或处理结果被运营认可有问题；比例偏高时应复核模板。')}
      ${metric('受限用户', numberText(summary.activeRestrictiveUsers || 0), `禁言 ${numberText(activeTypeCounts.mute || 0)} · 冻结 ${numberText(activeTypeCounts.freeze || 0)} · 封禁 ${numberText(activeTypeCounts.ban || 0)}`, '只统计当前生效且会限制移动端写操作的账号。')}
      ${metric('举报建议应用率', percentText(reportSuggestions.applyRate || 0), `${numberText(reportSuggestions.applied || 0)} / ${numberText(reportSuggestions.total || 0)} 条建议已应用`, '举报处理为有效后会生成处罚建议；建议长期不处理会造成举报闭环断层。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>处罚策略复盘</h2>
          <div class="section-sub">从处罚流水、申诉、举报处罚建议和移动端限制结果回算策略质量</div>
        </div>
        ${help('这里只做复盘和运营建议，不自动升级处罚。禁言/冻结/封禁是否影响移动端，由后端账号限制中间件实时决定。')}
      </div>
      <div class="grid two">
        <div>
          <div class="mini-section-title">运营建议</div>
          <div class="gap-list">
            ${recommendations.map((item) => {
              const level = item.level === 'bad' ? 'bad' : item.level === 'warn' ? 'warn' : 'ok';
              const label = level === 'bad' ? '高风险' : level === 'warn' ? '关注' : '正常';
              return `<div><strong>${tonePill(label, level)} ${escapeHtml(item.title || '-')}</strong><span>${escapeHtml(item.detail || '-')}</span></div>`;
            }).join('')}
          </div>
        </div>
        <div>
          <div class="mini-section-title">移动端影响</div>
          <div class="switch-panel">
            ${rules.map((rule) => `<div class="switch-row"><span>${escapeHtml(rule.label || rule.key || '-')}</span><strong class="cell-sub clamp">${escapeHtml(rule.effect || '-')}</strong></div>`).join('')}
            <div class="switch-row"><span>当前受限用户</span><strong>${numberText(mobileImpact.affectedRestrictiveUsers || 0)}</strong></div>
          </div>
        </div>
      </div>
      <div class="grid two social-evidence-grid">
        <div>
          <div class="mini-section-title">模板表现</div>
          ${tableHtml(templateRows, [
            ['模板', (row) => `<div class="cell-title">${escapeHtml(row.label || '-')}</div><div class="cell-sub">${escapeHtml(row.templateId || 'manual')} · ${escapeHtml(row.typeLabel || '-')}</div>`],
            ['命中', (row) => `<div>${numberText(row.total || 0)} 次</div><div class="cell-sub">${numberText(row.active || 0)} 生效 · ${numberText(row.revoked || 0)} 撤销</div>`],
            ['申诉', (row) => `<div>${percentText(row.appealRate || 0)} 申诉</div><div class="cell-sub">${percentText(row.overturnRate || 0)} 推翻</div>`],
            ['状态', (row) => statusPill(row.status || '-')],
          ], '暂无处罚模板数据')}
        </div>
        <div>
          <div class="mini-section-title">来源质量</div>
          ${tableHtml(sourceRows, [
            ['来源', (row) => `<div class="cell-title">${escapeHtml(row.label || '-')}</div><div class="cell-sub">${escapeHtml(row.source || '-')}</div>`],
            ['处罚', (row) => `<div>${numberText(row.total || 0)} 次</div><div class="cell-sub">${numberText(row.restrictive || 0)} 条限制型</div>`],
            ['撤销/申诉', (row) => `<div>${percentText(row.revokedRate || 0)} 撤销</div><div class="cell-sub">${percentText(row.overturnRate || 0)} 推翻</div>`],
            ['最新', (row) => formatTime(row.latestAt)],
          ], '暂无处罚来源数据')}
        </div>
      </div>
      <div class="grid two social-evidence-grid">
        <div>
          <div class="mini-section-title">重复违规用户</div>
          ${tableHtml(repeatOffenders, [
            ['用户', (row) => `<div class="cell-title">${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.phone)} ${row.petName ? `· ${escapeHtml(row.petName)}` : ''}</div>`],
            ['次数', (row) => `<div>${numberText(row.total || 0)} 次</div><div class="cell-sub">${numberText(row.active || 0)} 生效 · ${numberText(row.restrictive || 0)} 限制型</div>`],
            ['申诉', (row) => `<div>${numberText(row.appealCount || 0)} 条</div><div class="cell-sub">${numberText(row.approvedAppealCount || 0)} 条通过</div>`],
            ['最近', (row) => `<div>${escapeHtml(row.latestTypeLabel || '-')}</div><div class="cell-sub clamp">${escapeHtml(row.latestReason || '-')}</div>`],
          ], '暂无重复处罚用户')}
        </div>
        <div>
          <div class="mini-section-title">待处理举报处罚建议</div>
          ${tableHtml(pendingSuggestions, [
            ['举报', (row) => `<div class="cell-title">${escapeHtml(row.id || '-')}</div><div class="cell-sub">${escapeHtml(row.targetType || '-')} · ${escapeHtml(row.targetId || '-')}</div>`],
            ['作者', (row) => `<div>${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.ownerPhone || '')}</div>`],
            ['建议', (row) => `<div>${statusPill(row.typeLabel || row.templateId || '-')}</div><div class="cell-sub clamp">${escapeHtml(row.reason || '-')}</div>`],
          ], '暂无待应用处罚建议')}
        </div>
      </div>
    </div>
  `;
}

function sanctionApprovalTone(status) {
  return status === 'approved' ? 'ok' : status === 'pending_approval' ? 'warn' : status === 'canceled' ? 'bad' : '';
}

function renderSanctionApprovals(approvals = {}) {
  const items = approvals.items || [];
  const summary = approvals.summary || {};
  return `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>永久封禁审批</h2>
          <div class="section-sub">${numberText(summary.pending || 0)} 条待审批 · ${numberText(summary.approved || 0)} 条已审批 · ${numberText(summary.canceled || 0)} 条已取消</div>
        </div>
        ${help('永久封禁提交后不会立刻影响移动端账号状态；只有审批通过时才会创建真实处罚、更新用户状态并发送站内通知。当前是单 admin 审批版本，生产多管理员后可升级为双人审批。')}
      </div>
      ${items.length ? tableHtml(items, [
        ['用户', (row) => `<div class="cell-title">${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.phone)} ${row.petName ? `· ${escapeHtml(row.petName)}` : ''}</div>`],
        ['处罚', (row) => `<div>${statusPill(row.typeLabel || row.type || '-')}</div><div class="cell-sub">${row.durationHours ? `${numberText(row.durationHours)}h` : '长期有效'}</div>`],
        ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.reason || '-')}</div><div class="cell-sub">${escapeHtml(row.source || 'manual')} · ${escapeHtml(row.templateId || row.sourceTargetId || '-')}</div>`],
        ['状态', (row) => `${tonePill(row.statusLabel || row.status, sanctionApprovalTone(row.status))}<div class="cell-sub">${row.approvedAt ? `审批 ${formatTime(row.approvedAt)}` : row.canceledAt ? `取消 ${formatTime(row.canceledAt)}` : `提交 ${formatTime(row.createdAt)}`}</div>`],
        ['提交', (row) => `<div>${formatTime(row.createdAt)}</div><div class="cell-sub">${escapeHtml(row.createdBy || '-')}</div>`],
        ['操作', (row) => row.status === 'pending_approval' ? `
          <div class="actions">
            <button class="small-button" data-action="sanction-approval-approve" data-id="${escapeHtml(row.id)}">审批通过</button>
            <button class="small-button danger" data-action="sanction-approval-cancel" data-id="${escapeHtml(row.id)}">取消</button>
          </div>
          <div class="cell-sub">${escapeHtml(row.id || '-')}</div>
        ` : `<div class="cell-sub">${escapeHtml(row.sanctionId || row.approvalReason || row.cancelReason || '-')}</div>`],
      ], '暂无永久封禁审批') : '<div class="placeholder mini"><div><strong>暂无待审批永久封禁</strong><div>创建永久封禁时会先进入这里，审批通过后才会写入处罚流水。</div></div></div>'}
    </div>
  `;
}

async function renderSanctions(force) {
  const [rows, templates, policy, approvals] = await Promise.all([
    load('sanctions', '/admin/sanctions', force),
    load('sanctionTemplates', '/admin/sanction-templates', force),
    load('sanctionPolicy', '/admin/sanction-policy-review', force),
    load('sanctionApprovals', '/admin/sanction-approvals', force),
  ]);
  $('content').innerHTML = `
    ${renderSanctionPolicyReview(policy)}
    <div class="card">
      <div class="section-head">
        <div>
          <h2>创建处罚</h2>
          <div class="section-sub">禁言影响发布、评论、私信、约遛和地点投稿；冻结/封禁会拦截大多数写操作，反馈入口保留</div>
        </div>
        ${help('时长填 0 表示长期有效。警告只记录风险，不限制移动端操作；禁言/冻结/封禁会实时影响后端接口。')}
      </div>
      <div class="form-grid">
        <label>处罚模板
          <select id="sanctionTemplate">
            <option value="">不使用模板</option>
            ${templates.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.label)} · ${escapeHtml(template.typeLabel)}${template.durationHours ? ` ${template.durationHours}h` : ''}</option>`).join('')}
          </select>
        </label>
        <label>用户手机号<input id="sanctionPhone" placeholder="例如 13531850966" inputmode="numeric" /></label>
        <label>处罚类型
          <select id="sanctionType">
            <option value="mute">禁言</option>
            <option value="freeze">冻结</option>
            <option value="ban">封禁</option>
            <option value="warning">警告</option>
          </select>
        </label>
        <label>时长（小时）<input id="sanctionDurationHours" type="number" min="0" max="8760" value="24" /></label>
      </div>
      <label>处罚原因<textarea id="sanctionReason" placeholder="写清楚依据，例如：多次发布广告评论，经举报核实"></textarea></label>
      <div class="actions">
        <button class="small-button" data-action="sanction-template-apply">套用模板</button>
        <button class="primary-button" data-action="sanction-create">创建处罚 / 提交审批</button>
      </div>
    </div>
    ${renderSanctionApprovals(approvals)}
    <div class="card">
      <div class="section-head">
        <div>
          <h2>处罚流水</h2>
          <div class="section-sub">展示最新 300 条处罚、过期、撤销记录</div>
        </div>
        ${help('状态 active 表示仍生效；expired 表示已过期；revoked 表示运营手动撤销。')}
      </div>
      ${tableHtml(rows, [
        ['用户', (r) => `<div class="cell-title">${escapeHtml(r.ownerName)}</div><div class="cell-sub">${shortPhone(r.phone)} ${r.petName ? `· ${escapeHtml(r.petName)}` : ''}</div>`],
        ['处罚', (r) => `<div>${statusPill(r.typeLabel)}</div><div class="cell-sub">${escapeHtml(r.reason || '-')}</div>`],
        ['来源', (r) => `<div>${escapeHtml(r.source || 'manual')}</div><div class="cell-sub">${escapeHtml(r.sourceReportId || r.templateId || '-')}</div>`],
        ['状态', (r) => `${statusPill(r.status)}<div class="cell-sub">${r.expiresAt ? `到期：${formatTime(r.expiresAt)}` : '长期或仅记录'}</div>`],
        ['创建', (r) => `<div>${formatTime(r.createdAt)}</div><div class="cell-sub">${escapeHtml(r.createdBy || '-')}</div>`],
        ['撤销', (r) => r.revokedAt ? `<div>${formatTime(r.revokedAt)}</div><div class="cell-sub">${escapeHtml(r.revokeReason || '-')}</div>` : '-'],
        ['操作', (r) => r.status === 'active' ? `<button class="small-button" data-action="sanction-revoke" data-id="${escapeHtml(r.id)}" data-phone="${escapeHtml(r.phone)}" data-reason="运营后台撤销处罚">撤销</button>` : '-'],
      ], '暂无处罚记录')}
    </div>
  `;
}

async function createSanction() {
  const phone = $('sanctionPhone').value.replace(/\D/g, '');
  const templateId = $('sanctionTemplate')?.value || '';
  const template = (state.cache.sanctionTemplates || []).find((item) => item.id === templateId);
  const type = template?.type || $('sanctionType').value;
  const durationHours = Number(template ? template.durationHours : $('sanctionDurationHours').value);
  const reason = $('sanctionReason').value.trim() || template?.reason || '';
  if (!phone || !reason) {
    throw new Error('请填写手机号和处罚原因');
  }
  if (type === 'ban' && durationHours === 0) {
    await post('/admin/sanction-approvals', { durationHours, phone, reason, templateId, type });
    showToast('永久封禁审批已提交，审批通过后才会生效');
  } else {
    await post(`/admin/users/${encodeURIComponent(phone)}/sanctions`, { durationHours, reason, templateId, type });
    showToast('处罚已创建');
  }
  invalidateSanctionCaches();
  if (state.route === 'sanctions') await render(true);
}

function invalidateSanctionCaches() {
  state.cache = {
    ...state.cache,
    audit: null,
    sanctionApprovals: null,
    sanctionPolicy: null,
    sanctions: null,
    summary: null,
    users: null,
  };
}

async function approveSanctionApproval(id) {
  if (!id) return;
  const reason = window.prompt('请输入审批说明', '审批通过永久封禁处罚');
  if (reason === null) return;
  await post(`/admin/sanction-approvals/${encodeURIComponent(id)}/approve`, {
    reason: reason.trim() || '审批通过永久封禁处罚',
  });
  invalidateSanctionCaches();
  showToast('永久封禁审批已通过，处罚已生效');
  if (state.route === 'sanctions') await render(true);
}

async function cancelSanctionApproval(id) {
  if (!id) return;
  const reason = window.prompt('请输入取消原因', '取消永久封禁审批');
  if (reason === null) return;
  await post(`/admin/sanction-approvals/${encodeURIComponent(id)}/cancel`, {
    reason: reason.trim() || '取消永久封禁审批',
  });
  invalidateSanctionCaches();
  showToast('永久封禁审批已取消');
  if (state.route === 'sanctions') await render(true);
}

function applySanctionTemplate() {
  const templateId = $('sanctionTemplate')?.value || '';
  const template = (state.cache.sanctionTemplates || []).find((item) => item.id === templateId);
  if (!template) {
    showToast('请先选择处罚模板');
    return;
  }
  $('sanctionType').value = template.type;
  $('sanctionDurationHours').value = template.durationHours;
  $('sanctionReason').value = template.reason;
  showToast('已套用处罚模板');
}

async function applyReportSanction(button) {
  const id = button.dataset.id;
  const templateId = button.dataset.templateId || '';
  const defaultReason = button.dataset.reason || '用户举报成立，按处罚建议处理';
  const reason = window.prompt('确认按举报建议创建处罚？请填写处罚原因', defaultReason);
  if (reason === null) return;
  await post(`/admin/social/reports/${encodeURIComponent(id)}/sanction`, {
    reason: reason.trim() || defaultReason,
    templateId,
  });
  state.cache.reports = null;
  state.cache.moderation = null;
  state.cache.sanctionPolicy = null;
  state.cache.sanctions = null;
  state.cache.summary = null;
  state.cache.users = null;
  state.cache.audit = null;
  showToast('已根据举报创建处罚');
  await render(true);
}

async function loadReportMessageContext(button) {
  const id = button.dataset.id;
  const config = state.cache.config || await load('config', '/admin/config', false);
  const policy = config.social?.messageAccess || {};
  const reason = window.prompt('查看私信上下文需要填写原因，此操作会写入审计日志。', '处理私信举报，核对上下文');
  if (reason === null) return;
  const cleanReason = reason.trim();
  if (!cleanReason && policy.requireReason !== false) {
    showToast('请填写查看原因');
    return;
  }
  const context = await post(`/admin/social/reports/${encodeURIComponent(id)}/message-context`, {
    limit: policy.contextWindowLimit || undefined,
    reason: cleanReason,
  });
  state.reportMessageContexts = { ...state.reportMessageContexts, [id]: context };
  state.cache.audit = null;
  showToast('已加载私信上下文');
  await render(false);
}

async function markReportMessageHarassment(button) {
  const id = button.dataset.id;
  const reason = window.prompt('确认标记为疑似骚扰会话？会给被举报用户增加风险标签，并写入审计。', '私信举报核实，标记疑似骚扰');
  if (reason === null) return;
  const cleanReason = reason.trim();
  if (!cleanReason) {
    showToast('请填写标记原因');
    return;
  }
  await post(`/admin/social/reports/${encodeURIComponent(id)}/flag-harassment`, { reason: cleanReason });
  state.cache.reports = null;
  state.cache.users = null;
  state.cache.audit = null;
  showToast('已标记疑似骚扰');
  await render(true);
}

async function renderSanctionAppeals(force) {
  const query = new URLSearchParams({
    q: state.appealQ,
    status: state.appealStatus,
    type: state.appealType,
  });
  const data = await load('sanctionAppeals', `/admin/sanction-appeals?${query}`, force);
  const appeals = data.appeals || [];
  const summary = data.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('待处理', summary.open || 0, `${summary.pending || 0} 条新申诉`, 'pending/reviewing 都属于待处理。')}
      ${metric('处理中', summary.reviewing || 0, '已接手', '接手后代表有运营正在复核。')}
      ${metric('已通过', summary.approved || 0, '可联动撤销处罚', '通过时可选择同时撤销原处罚。')}
      ${metric('未通过', summary.rejected || 0, '保留处罚', '驳回后会把处理说明同步给用户。')}
      ${metric('举报申诉', summary.report || 0, `${summary.sanction || 0} 条账号申诉`, '举报处理申诉只复核处理结果，不自动恢复内容或撤销处罚。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>申诉队列</h2>
          <div class="section-sub">账号限制申诉与举报处理申诉；处理结果会进入 App 通知中心</div>
        </div>
        ${help('账号限制申诉通过时默认撤销对应处罚；举报处理申诉通过只代表运营认可用户异议，需要再按具体内容去恢复、撤销处罚或补充说明。')}
      </div>
      <div class="toolbar">
        <select id="appealType">
          ${option('all', '全部类型', state.appealType)}
          ${option('sanction', '账号限制', state.appealType)}
          ${option('report', '举报处理', state.appealType)}
        </select>
        <select id="appealStatus">
          ${option('open', '未关闭', state.appealStatus)}
          ${option('pending', '待处理', state.appealStatus)}
          ${option('reviewing', '处理中', state.appealStatus)}
          ${option('approved', '已通过', state.appealStatus)}
          ${option('rejected', '未通过', state.appealStatus)}
          ${option('all', '全部', state.appealStatus)}
        </select>
        <input id="appealQ" placeholder="手机号、内容、处罚/举报原因" value="${escapeHtml(state.appealQ)}" />
        <button class="small-button" data-action="appeal-filter">筛选</button>
        <button class="small-button" data-action="appeal-clear">清空</button>
      </div>
      ${appeals.length ? `<div class="ticket-list">${appeals.map(renderSanctionAppealCard).join('')}</div>` : '<div class="placeholder"><div><strong>暂无申诉</strong><div>当前筛选下没有申诉记录。</div></div></div>'}
    </div>
  `;
}

function renderSanctionAppealCard(appeal) {
  const active = appeal.status === 'pending' || appeal.status === 'reviewing';
  const isReportAppeal = appeal.appealType === 'report';
  const sanctionLabel = appeal.sanctionTypeLabel || appeal.sanctionType || '账号限制';
  const title = isReportAppeal
    ? `${appeal.ownerName || appeal.phone} · ${appeal.targetLabel || '举报处理'}申诉`
    : `${appeal.ownerName || appeal.phone} · ${sanctionLabel}`;
  return `
    <div class="ticket-card">
      <div class="ticket-main">
        <div class="ticket-top">
          <div>
            <div class="cell-title">${escapeHtml(title)}</div>
            <div class="cell-sub">${shortPhone(appeal.phone)} ${appeal.petName ? `· ${escapeHtml(appeal.petName)}` : ''} · ${formatTime(appeal.createdAt)}</div>
          </div>
          <div>${statusPill(appeal.status)} ${statusPill(isReportAppeal ? '举报处理' : sanctionLabel)} ${isReportAppeal ? statusPill(appeal.reportRoleLabel || '-') : ''}</div>
        </div>
        <p>${escapeHtml(appeal.content)}</p>
        ${isReportAppeal ? `
          <div class="cell-sub">举报对象：${escapeHtml(appeal.targetLabel || '-')} · ${escapeHtml(appeal.targetId || '-')}</div>
          <div class="cell-sub">原处理结果：${escapeHtml(appeal.reportStatusLabel || appeal.reportStatus || '-')} · ${escapeHtml(appeal.reportReason || '-')}</div>
        ` : `<div class="cell-sub">处罚原因：${escapeHtml(appeal.sanctionReason || appeal.sanction?.reason || '-')}</div>`}
        ${appeal.reviewReason ? `<div class="note-line"><strong>处理说明：</strong>${escapeHtml(appeal.reviewReason)}</div>` : ''}
        <div class="ticket-meta">
          <span>${isReportAppeal ? `举报ID：${escapeHtml(appeal.reportId || '-')}` : `处罚状态：${escapeHtml(appeal.sanctionStatus || appeal.sanction?.status || '-')}`}</span>
          <span>处理人：${escapeHtml(appeal.handledBy || '-')}</span>
          <span>更新时间：${formatTime(appeal.updatedAt || appeal.createdAt)}</span>
        </div>
      </div>
      <div class="ticket-side">
        ${active ? `
          <button class="small-button" data-action="appeal-review" data-id="${escapeHtml(appeal.id)}" data-title="${escapeHtml(title)}">接手</button>
          ${isReportAppeal ? '<span class="cell-sub">通过后需按对象手动恢复/补充处理</span>' : `<label class="inline-check"><input id="appealRevoke-${escapeHtml(appeal.id)}" type="checkbox" checked /> 通过时撤销处罚</label>`}
          <button class="small-button" data-action="appeal-approve" data-id="${escapeHtml(appeal.id)}" data-title="${escapeHtml(title)}">通过</button>
          <button class="small-button danger" data-action="appeal-reject" data-id="${escapeHtml(appeal.id)}" data-title="${escapeHtml(title)}">驳回</button>
        ` : '<span class="cell-sub">已处理</span>'}
      </div>
    </div>
  `;
}

function tonePill(label, tone = '') {
  return `<span class="pill ${tone}">${escapeHtml(label)}</span>`;
}

function avatarQualityPill(row) {
  const tone = row.quality === 'blocked' ? 'bad' : row.quality === 'warning' ? 'warn' : 'ok';
  return tonePill(row.qualityLabel || row.quality || '-', tone);
}

function avatarPreview(url, label = '图') {
  const safeUrl = String(url || '').trim();
  return `
    <div class="ai-media-preview">
      ${safeUrl ? `<img src="${escapeHtml(safeUrl)}" alt="" loading="lazy" />` : `<span>${escapeHtml(label)}</span>`}
    </div>
  `;
}

function avatarTaskCell(job) {
  const appliedText = job.acceptedPetId
    ? `已应用：${escapeHtml(job.acceptedPetName || job.acceptedPetId)}`
    : job.status === 'ready' && job.resultUrl ? '可应用到宠物档案' : '';
  return `
    <div class="ai-job-cell">
      ${avatarPreview(job.resultUrl || job.previewUrl, job.status === 'ready' ? 'AI' : '原')}
      <div>
        <div class="cell-title">${escapeHtml(job.petName || job.id)}</div>
        <div class="cell-sub">${escapeHtml(job.id)}</div>
        <div class="cell-sub">${job.mediaId ? `素材：${escapeHtml(job.mediaId)}` : '无素材ID'}</div>
        ${appliedText ? `<div class="cell-sub">${appliedText}</div>` : ''}
      </div>
    </div>
  `;
}

function avatarJobAction(job) {
  const canApply = job.status === 'ready' && job.resultUrl;
  const canRefund = job.quotaConsumed && !job.quotaRefunded;
  return `
    <div class="actions">
      <button class="small-button" data-action="avatar-refresh" data-id="${escapeHtml(job.id)}">刷新</button>
      <button class="small-button" data-action="avatar-retry" data-id="${escapeHtml(job.id)}">重试</button>
      ${canRefund ? `<button class="small-button" data-action="avatar-refund" data-id="${escapeHtml(job.id)}">返还</button>` : '<span class="cell-sub">额度不可返还</span>'}
      ${canApply ? `<button class="small-button ghost" data-action="avatar-apply" data-id="${escapeHtml(job.id)}" data-pet-id="${escapeHtml(job.acceptedPetId || job.petId || '')}" data-pet-name="${escapeHtml(job.acceptedPetName || job.petName || '')}">应用为AI形象</button>` : ''}
      <button class="small-button" data-action="avatar-sample-add" data-id="${escapeHtml(job.id)}" data-sample-type="prompt_quality" data-sample-type-label="提示词优化样本" data-default-note="${escapeHtml(job.feedback?.reasonLabel || job.lastStatusError || '记录为提示词优化样本')}" data-default-tags="提示词,${escapeHtml(job.provider || 'AI')}">提示词样本</button>
      <button class="small-button" data-action="avatar-sample-add" data-id="${escapeHtml(job.id)}" data-sample-type="provider_anomaly" data-sample-type-label="供应商异常样本" data-default-note="${escapeHtml(job.errorCode || job.providerStatus || job.lastStatusError || '记录为供应商异常样本')}" data-default-tags="供应商,${escapeHtml(job.provider || 'AI')}">供应商样本</button>
      <button class="small-button danger" data-action="avatar-fail" data-id="${escapeHtml(job.id)}">失败</button>
    </div>
  `;
}

function avatarAnimationPreview(job) {
  const videoUrl = String(job.videoUrl || '').trim();
  const imageUrl = String(job.sourceAvatarUrl || job.petAvatarUrl || '').trim();
  return `
    <div class="ai-media-preview">
      ${videoUrl ? `<video src="${escapeHtml(videoUrl)}" muted playsinline preload="metadata"></video>` : imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" />` : '<span>动效</span>'}
    </div>
  `;
}

function avatarAnimationTaskCell(job) {
  return `
    <div class="ai-job-cell">
      ${avatarAnimationPreview(job)}
      <div>
        <div class="cell-title">${escapeHtml(job.petName || job.id)}</div>
        <div class="cell-sub">${escapeHtml(job.id)}</div>
        <div class="cell-sub">${job.avatarJobId ? `静态任务：${escapeHtml(job.avatarJobId)}` : '无静态任务ID'}</div>
        ${job.retryOfJobId ? `<div class="cell-sub">重试自：${escapeHtml(job.retryOfJobId)}</div>` : ''}
      </div>
    </div>
  `;
}

function avatarAnimationStatusCell(job) {
  return `
    ${statusPill(job.status)}
    <div class="cell-sub">${escapeHtml(job.provider || '-')} · ${job.progress || 0}%</div>
    <div class="cell-sub">${escapeHtml(job.providerStatus || '-')}</div>
    ${job.stuck ? '<div class="cell-sub">可能卡住，建议刷新或重试</div>' : ''}
  `;
}

function avatarAnimationTraceCell(job) {
  const trace = job.providerTraceLatest || {};
  if (!job.providerTraceCount) return '<div class="cell-sub">暂无调用轨迹</div>';
  return `
    <div>${escapeHtml(trace.stageLabel || job.providerTraceLatestStageLabel || '-')}</div>
    <div class="cell-sub">${escapeHtml(trace.providerStatus || job.providerTraceLatestStatus || '-')} · ${durationMsText(trace.durationMs)}</div>
    <div class="cell-sub">${numberText(job.providerTraceCount || 0)} 次调用</div>
  `;
}

function avatarAnimationAction(job) {
  return `
    <div class="actions">
      <button class="small-button" data-action="avatar-animation-refresh" data-id="${escapeHtml(job.id)}">刷新</button>
      <button class="small-button" data-action="avatar-animation-retry" data-id="${escapeHtml(job.id)}">重试</button>
      <button class="small-button danger" data-action="avatar-animation-fail" data-id="${escapeHtml(job.id)}">失败</button>
    </div>
  `;
}

function avatarQuotaCell(job) {
  if (!job.quotaConsumed) {
    return '<div class="cell-sub">未扣额度</div>';
  }
  if (job.quotaRefunded) {
    const source = job.quotaRefundSource === 'auto' ? '自动返还' : '人工返还';
    return `
      ${tonePill('已返还', 'ok')}
      <div class="cell-sub">${source} · ${formatTime(job.quotaRefundedAt)}</div>
      <div class="cell-sub clamp">${escapeHtml(job.quotaRefundReason || '')}</div>
    `;
  }
  return `
    ${tonePill('已扣除', job.status === 'failed' ? 'warn' : '')}
    <div class="cell-sub">${job.status === 'failed' ? '未命中自动返还规则' : '处理中或已完成'}</div>
  `;
}

function avatarTraceCell(job) {
  const trace = job.providerTraceLatest || {};
  const cost = job.providerCost || {};
  if (!job.providerTraceCount) {
    return '<div class="cell-sub">尚未记录调用轨迹</div>';
  }
  const hasCost = Number(cost.cost || 0) || Number(cost.creditsCost || 0) || Number(cost.quota || 0);
  return `
    <div>${escapeHtml(trace.stageLabel || job.providerTraceLatestStageLabel || '-')} · ${escapeHtml(trace.method || '-')}</div>
    <div class="cell-sub">${escapeHtml(trace.providerStatus || job.providerTraceLatestStatus || '-')} · ${durationMsText(trace.durationMs)}</div>
    <div class="cell-sub">${numberText(job.providerTraceCount)} 次调用${hasCost ? ` · ${moneyText(cost.cost || 0)} / ${numberText(cost.creditsCost || 0, 2)} credits` : ''}</div>
  `;
}

function avatarFeedbackAction(row) {
  if (row.status === 'reviewed') {
    return `<div class="cell-sub">已由 ${escapeHtml(row.reviewedBy || '-')} 处理</div>`;
  }
  return `<button class="small-button" data-action="avatar-feedback-review" data-id="${escapeHtml(row.jobId)}" data-default-note="记录为${escapeHtml(row.reasonLabel || '生成质量')}反馈">标记处理</button>`;
}

function avatarSampleTypeText(type) {
  if (type === 'provider_anomaly') return '供应商异常样本';
  if (type === 'material_quality') return '素材质量样本';
  return '提示词优化样本';
}

function avatarSampleStatusPill(row) {
  const tone = row.status === 'reviewed' ? 'ok' : row.status === 'ignored' ? '' : 'warn';
  return tonePill(row.statusLabel || row.status || '-', tone);
}

function avatarSampleTypePill(row) {
  const tone = row.type === 'provider_anomaly' ? 'bad' : row.type === 'material_quality' ? 'warn' : 'ok';
  return tonePill(row.typeLabel || avatarSampleTypeText(row.type), tone);
}

function avatarSampleCell(row) {
  return `
    <div class="ai-job-cell">
      ${avatarPreview(row.resultUrl || row.mediaPreviewUrl || row.previewUrl, '样')}
      <div>
        <div class="cell-title">${avatarSampleTypePill(row)}</div>
        <div class="cell-sub clamp">${escapeHtml(row.note || '暂无样本说明')}</div>
        ${row.autoCreated ? `<div class="cell-sub">${tonePill('自动入池', 'warn')} ${numberText(row.autoSignalCount || 1)} 次信号</div>` : ''}
        <div class="cell-sub">${(row.tags || []).slice(0, 4).map((tag) => `#${escapeHtml(tag)}`).join(' ')}</div>
      </div>
    </div>
  `;
}

function avatarSampleEvidenceCell(row) {
  const feedback = row.feedbackReasonLabel ? `${row.feedbackReasonLabel}${row.feedbackContent ? ` · ${row.feedbackContent}` : ''}` : '';
  const error = row.providerStatus || row.providerTraceLatestStatus || row.errorCode || '';
  return `
    <div>${escapeHtml(row.sourceLabel || '-')}</div>
    <div class="cell-sub clamp">${escapeHtml(feedback || error || '来自生成任务')}</div>
    <div class="cell-sub">${numberText(row.providerTraceCount || 0)} 条调用轨迹</div>
  `;
}

function avatarSampleAction(row) {
  if (row.status !== 'open') {
    return `<div class="cell-sub">${escapeHtml(row.reviewedBy || '-')} · ${formatTime(row.reviewedAt)}</div>`;
  }
  return `
    <div class="actions">
      <button class="small-button" data-action="avatar-sample-review" data-id="${escapeHtml(row.id)}" data-next-status="reviewed">复核完成</button>
      <button class="small-button ghost" data-action="avatar-sample-review" data-id="${escapeHtml(row.id)}" data-next-status="ignored">忽略</button>
    </div>
  `;
}

async function addAvatarSample(button) {
  const jobId = button.dataset.id || '';
  const type = button.dataset.sampleType || 'prompt_quality';
  const label = button.dataset.sampleTypeLabel || avatarSampleTypeText(type);
  const note = window.prompt(`请输入${label}说明`, button.dataset.defaultNote || label);
  if (note === null) return;
  const tags = window.prompt('可选：样本标签，用逗号分隔', button.dataset.defaultTags || label);
  if (tags === null) return;
  await post(`/admin/ai/avatar-jobs/${encodeURIComponent(jobId)}/samples`, {
    note: note.trim() || label,
    reason: `加入${label}`,
    tags,
    type,
  });
  state.cache = { ...state.cache, avatarJobs: null, avatarSamples: null, aiUsage: null, audit: null };
  showToast('已加入 AI 样本池');
  await render(true);
}

async function applyAvatarJobToPet(button) {
  const jobId = button.dataset.id || '';
  const defaultPetId = button.dataset.petId || '';
  const petId = window.prompt('请输入要应用到的宠物 ID', defaultPetId);
  if (petId === null) return;
  const targetPetId = petId.trim();
  if (!targetPetId) {
    showToast('请填写宠物 ID');
    return;
  }
  const petName = button.dataset.petName || targetPetId;
  const reason = window.prompt('请输入应用原因', `运营复核后将 AI 形象应用到 ${petName}`);
  if (reason === null) return;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    showToast('请填写应用原因');
    return;
  }
  if (!window.confirm(`确认把这个 AI 形象结果应用到 ${petName}？这会替换该宠物当前首页形象，并清空旧动效。`)) return;
  await post(`/admin/ai/avatar-jobs/${encodeURIComponent(jobId)}/apply`, {
    petId: targetPetId,
    reason: trimmedReason,
  });
  state.cache = { ...state.cache, aiUsage: null, audit: null, avatarJobs: null, notifications: null, pets: null, users: null };
  showToast('AI 形象已应用到宠物档案');
  await render(true);
}

async function reviewAvatarSample(button) {
  const id = button.dataset.id || '';
  const status = button.dataset.nextStatus || 'reviewed';
  const label = status === 'ignored' ? '忽略' : '复核完成';
  const note = window.prompt(`请输入${label}备注`, status === 'ignored' ? '样本暂不进入复盘' : '样本已完成复盘');
  if (note === null) return;
  await post(`/admin/ai/avatar-samples/${encodeURIComponent(id)}/review`, {
    note: note.trim() || label,
    reason: `AI 样本${label}`,
    status,
  });
  state.cache = { ...state.cache, avatarSamples: null, audit: null };
  showToast(`AI 样本已${label}`);
  await render(true);
}

function avatarMediaCell(row) {
  return `
    <div class="ai-job-cell">
      ${avatarPreview(row.adminPreviewUrl || row.previewUrl || row.fileUrl, '原')}
      <div>
        <div class="cell-title">${escapeHtml(row.mediaId || '-')}</div>
        <div class="cell-sub">${escapeHtml(row.fileName || row.mimeType || '-')}</div>
        <div class="cell-sub">${row.sizeKb ? `${numberText(row.sizeKb)} KB` : '大小未知'}</div>
      </div>
    </div>
  `;
}

function aiProviderRolePill(row) {
  const tone = row.roleLabel === '当前启用' ? 'ok' : row.roleLabel === '兜底/测试' ? 'warn' : '';
  return tonePill(row.roleLabel || '-', tone);
}

function aiErrorList(errors = []) {
  if (!errors.length) {
    return '<div class="gap-list"><div><strong>暂无错误码</strong><span>当前没有失败任务或状态刷新错误。</span></div></div>';
  }
  return `
    <div class="gap-list">
      ${errors.map((item) => `
        <div>
          <strong>${escapeHtml(item.code)} · ${numberText(item.count)} 次</strong>
          <span>${escapeHtml((item.providers || []).join(' / ') || '未知供应商')} · ${escapeHtml(item.latestMessage || '暂无错误详情')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAiProviderChart(usage) {
  const node = $('aiProviderChart');
  if (!node) return;
  const providers = usage.providers || [];
  if (!window.echarts) {
    node.innerHTML = '<div class="placeholder">图表组件加载中</div>';
    return;
  }
  const chart = echarts.init(node);
  chart.setOption({
    color: ['#48b6a8', '#dc604e', '#ff7f4f'],
    grid: { bottom: 42, left: 38, right: 14, top: 24 },
    legend: { bottom: 0, itemHeight: 8, itemWidth: 12, textStyle: { color: '#7a756d' } },
    tooltip: { trigger: 'axis' },
    xAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      data: providers.map((item) => item.label),
      type: 'category',
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(91,70,48,.1)' } },
      type: 'value',
    },
    series: [
      { barMaxWidth: 24, data: providers.map((item) => item.ready), name: 'Ready', stack: 'jobs', type: 'bar' },
      { barMaxWidth: 24, data: providers.map((item) => item.failed), name: '失败', stack: 'jobs', type: 'bar' },
      { data: providers.map((item) => item.stuck), name: '卡住', smooth: true, type: 'line' },
    ],
  });
}

async function renderAvatarJobs(force) {
  const feedbackQuery = new URLSearchParams({
    q: state.aiFeedbackQ,
    reason: state.aiFeedbackReason,
    status: state.aiFeedbackStatus,
  });
  const mediaQuery = new URLSearchParams({
    q: state.aiMediaQ,
    quality: state.aiMediaQuality,
  });
  const sampleQuery = new URLSearchParams({
    q: state.aiSampleQ,
    status: state.aiSampleStatus,
    type: state.aiSampleType,
  });
  const [jobs, animationJobs, feedbackData, mediaData, aiUsage, sampleData] = await Promise.all([
    load('avatarJobs', '/admin/ai/avatar-jobs', force),
    load('avatarAnimationJobs', '/admin/ai/avatar-animation-jobs', force),
    load('avatarFeedback', `/admin/ai/avatar-feedback?${feedbackQuery.toString()}`, force),
    load('aiMedia', `/admin/ai/media?${mediaQuery.toString()}`, force),
    load('aiUsage', '/admin/ai/usage?days=14', force),
    load('avatarSamples', `/admin/ai/avatar-samples?${sampleQuery.toString()}`, force),
  ]);
  const jobRows = Array.isArray(jobs) ? jobs : [];
  const animationRows = Array.isArray(animationJobs) ? animationJobs : [];
  const feedbackRows = feedbackData.items || [];
  const feedbackSummary = feedbackData.summary || {};
  const mediaRows = mediaData.items || [];
  const mediaSummary = mediaData.summary || {};
  const sampleRows = sampleData.items || [];
  const sampleSummary = sampleData.summary || {};
  const usageSummary = aiUsage.summary || {};
  const refundPolicy = aiUsage.quotaRefundPolicy || {};
  const providerRows = aiUsage.providers || [];
  const topErrors = aiUsage.topErrors || [];
  const processing = jobRows.filter((job) => job.status === 'processing');
  const failed = jobRows.filter((job) => job.status === 'failed');
  const ready = jobRows.filter((job) => job.status === 'ready');
  const stuck = processing.filter((job) => Date.now() - new Date(job.updatedAt || job.createdAt || 0).getTime() > 5 * 60 * 1000);
  const animationProcessing = animationRows.filter((job) => job.status === 'processing');
  const animationReady = animationRows.filter((job) => job.status === 'ready');
  const animationFailed = animationRows.filter((job) => job.status === 'failed');
  const animationStuck = animationRows.filter((job) => job.stuck);
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('生成任务', numberText(jobRows.length), `${numberText(processing.length)} 个处理中`, 'AI 灵伴生成任务全量计数，包含历史供应商任务。')}
      ${metric('可用结果', numberText(ready.length), `${numberText(failed.length)} 个失败`, 'ready 表示后端已有结果图；是否应用到宠物头像看 acceptedAt。')}
      ${metric('可能卡住', numberText(stuck.length), '处理中超过 5 分钟未更新', '用于排查进度条停在中间或 provider 状态没有刷新。')}
      ${metric('动效任务', numberText(animationRows.length), `${numberText(animationProcessing.length)} 个处理中`, '静态灵伴形象保存后异步生成的动态灵伴任务，移动端首页会读取该状态。')}
      ${metric('动效可用', numberText(animationReady.length), `${numberText(animationFailed.length)} 个失败`, 'ready 后移动端首页可播放视频；失败或卡住时运营可刷新、重试或标失败。')}
      ${metric('动效卡住', numberText(animationStuck.length), '处理中超过 10 分钟未更新', '这里和系统健康页的动效队列报警一致，方便直接在本页处置。')}
      ${metric('调用轨迹', numberText(usageSummary.providerTraceEntries), `${numberText(usageSummary.providerTraceJobs)} 个任务有记录`, '新任务会记录供应商 submit/status/action 调用摘要、耗时、成本快照和错误。')}
      ${metric('额度返还', numberText(usageSummary.avatarQuotaRefunded || 0), `${numberText(usageSummary.avatarQuotaAutoRefunded || 0)} 自动`, '供应商侧失败可按配置自动返还用户当日生成额度；人工返还会防重复并写审计。')}
      ${metric('待处理反馈', numberText(feedbackSummary.received), `${numberText(feedbackSummary.reviewed)} 条已处理`, '用户在 AI 灵伴结果页提交的不满意反馈。')}
      ${metric('样本池', numberText(sampleSummary.open || 0), `${numberText(sampleSummary.all || 0)} 条总样本`, '运营把反馈、异常调用和素材问题沉淀成样本，用于提示词优化和供应商复盘。')}
      ${metric('上传素材', numberText(mediaSummary.totalMedia), `${numberText(mediaSummary.linked)} 张已发起生成`, '移动端上传到 /media/uploads 的宠物原图素材。')}
      ${metric('素材风险', numberText((mediaSummary.warning || 0) + (mediaSummary.blocked || 0)), `${numberText(mediaSummary.blocked)} 张不可生成`, 'warning/blocked 来自上传时的照片质量分析。')}
    </div>

    <div class="card">
      <div class="section-head">
        <div>
          <h2>生成任务</h2>
          <div class="section-sub">任务状态、供应商进度、失败排查和额度返还</div>
        </div>
        ${help('刷新只同步上游任务状态；重试会基于原始 mediaId 新建生成任务；返还额度会写入审计。')}
      </div>
      <div class="switch-panel">
        <div class="switch-row">
          <span>自动返还策略</span>
          <strong>${refundPolicy.enabled === false ? '关闭' : escapeHtml(refundPolicy.label || '供应商失败自动返还')}</strong>
        </div>
        <div class="switch-row">
          <span>今日返还</span>
          <strong>${numberText(usageSummary.todayAvatarQuotaRefunded || 0)} 次</strong>
        </div>
      </div>
      ${tableHtml(jobRows, [
        ['任务', avatarTaskCell],
        ['用户', (job) => `<div>${escapeHtml(job.ownerName || '-')}</div><div class="cell-sub">${shortPhone(job.ownerPhone)}</div>`],
        ['状态', (job) => `${statusPill(job.status)}<div class="cell-sub">${escapeHtml(job.provider || '-')} · ${job.progress || 0}%</div><div class="cell-sub">${escapeHtml(job.providerStatus || '-')}</div>`],
        ['调用轨迹', avatarTraceCell],
        ['额度', avatarQuotaCell],
        ['错误', (job) => `<div>${escapeHtml(job.errorCode || '-')}</div><div class="cell-sub clamp">${escapeHtml(job.lastStatusError || job.errorMessage || '')}</div>`],
        ['时间', (job) => `<div>创建：${formatTime(job.createdAt)}</div><div class="cell-sub">更新：${formatTime(job.updatedAt)}</div>`],
        ['操作', avatarJobAction],
      ], '暂无 AI 形象任务')}
    </div>

    <div class="card">
      <div class="section-head">
        <div>
          <h2>动效任务</h2>
          <div class="section-sub">静态灵伴形象后的异步视频任务，直接影响首页动态灵伴播放</div>
        </div>
        ${help('刷新会同步上游 Seedance 状态；重试会基于当前静态灵伴形象新建动效任务；失败会同步宠物档案状态，移动端不再一直显示生成中。')}
      </div>
      ${tableHtml(animationRows, [
        ['任务', avatarAnimationTaskCell],
        ['用户', (job) => `<div>${escapeHtml(job.ownerName || '-')}</div><div class="cell-sub">${shortPhone(job.ownerPhone)}</div>`],
        ['状态', avatarAnimationStatusCell],
        ['调用轨迹', avatarAnimationTraceCell],
        ['宠物档案', (job) => `<div>${escapeHtml(job.petAvatarAnimationStatus || '-')}</div><div class="cell-sub clamp">${escapeHtml(job.petAvatarAnimationUrl || '')}</div>`],
        ['错误', (job) => `<div>${escapeHtml(job.errorCode || '-')}</div><div class="cell-sub clamp">${escapeHtml(job.lastStatusError || job.errorMessage || '')}</div>`],
        ['时间', (job) => `<div>创建：${formatTime(job.createdAt)}</div><div class="cell-sub">更新：${formatTime(job.updatedAt)}</div>`],
        ['操作', avatarAnimationAction],
      ], '暂无灵伴动效任务')}
    </div>

    <div class="card">
      <div class="section-head">
        <div>
          <h2>AI 样本池</h2>
          <div class="section-sub">提示词优化、供应商异常和素材质量样本沉淀</div>
        </div>
        ${help('样本池不会自动改 prompt 或重跑任务；它用于把真实反馈和异常任务沉淀为运营复盘证据，后续再进入配置中心的提示词版本管理。')}
      </div>
      <div class="toolbar moderation-toolbar ai-toolbar">
        <div class="toolbar-left">
          <label>状态
            <select id="aiSampleStatus">
              ${option('open', '待复盘', state.aiSampleStatus)}
              ${option('reviewed', '已复核', state.aiSampleStatus)}
              ${option('ignored', '已忽略', state.aiSampleStatus)}
              ${option('all', '全部', state.aiSampleStatus)}
            </select>
          </label>
          <label>类型
            <select id="aiSampleType">
              ${option('all', '全部', state.aiSampleType)}
              ${option('prompt_quality', '提示词优化', state.aiSampleType)}
              ${option('provider_anomaly', '供应商异常', state.aiSampleType)}
              ${option('material_quality', '素材质量', state.aiSampleType)}
            </select>
          </label>
          <label>搜索<input id="aiSampleQ" placeholder="手机号、宠物、任务ID、供应商、反馈内容" value="${escapeHtml(state.aiSampleQ)}" /></label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="avatar-sample-filter">筛选</button>
          <button class="small-button ghost" data-action="avatar-sample-clear">清空</button>
        </div>
      </div>
      ${tableHtml(sampleRows, [
        ['样本', avatarSampleCell],
        ['用户 / 宠物', (row) => `<div>${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.ownerPhone)} · ${escapeHtml(row.petName || '-')}</div>`],
        ['任务', (row) => `<div>${statusPill(row.jobStatus || '-')}</div><div class="cell-sub">${escapeHtml(row.jobId || '-')}</div><div class="cell-sub">${escapeHtml(row.provider || '-')} · ${escapeHtml(row.providerStatus || '-')}</div>`],
        ['证据', avatarSampleEvidenceCell],
        ['状态', (row) => `${avatarSampleStatusPill(row)}<div class="cell-sub">${row.reviewedAt ? formatTime(row.reviewedAt) : '等待运营复盘'}</div>`],
        ['时间', (row) => `<div>创建：${formatTime(row.createdAt)}</div><div class="cell-sub">更新：${formatTime(row.updatedAt)}</div>`],
        ['操作', avatarSampleAction],
      ], '暂无 AI 样本')}
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>生成反馈</h2>
            <div class="section-sub">用户不满意原因、内容和后台处理状态</div>
          </div>
          ${help('反馈来自移动端结果页，不会自动重试；运营标记处理后用于复盘提示词、素材质量或供应商表现。')}
        </div>
        <div class="toolbar moderation-toolbar ai-toolbar">
          <div class="toolbar-left">
            <label>状态
              <select id="aiFeedbackStatus">
                ${option('all', '全部', state.aiFeedbackStatus)}
                ${option('received', '待处理', state.aiFeedbackStatus)}
                ${option('reviewed', '已处理', state.aiFeedbackStatus)}
              </select>
            </label>
            <label>原因
              <select id="aiFeedbackReason">
                ${option('all', '全部', state.aiFeedbackReason)}
                ${option('not_same_pet', '不像同一只宠物', state.aiFeedbackReason)}
                ${option('color', '毛色/花纹不像', state.aiFeedbackReason)}
                ${option('face_shape', '脸型不像', state.aiFeedbackReason)}
                ${option('expression', '表情不像', state.aiFeedbackReason)}
                ${option('style', '风格不喜欢', state.aiFeedbackReason)}
                ${option('other', '其他', state.aiFeedbackReason)}
              </select>
            </label>
            <label>搜索<input id="aiFeedbackQ" placeholder="手机号、宠物、任务ID、反馈内容" value="${escapeHtml(state.aiFeedbackQ)}" /></label>
          </div>
          <div class="actions">
            <button class="small-button" data-action="avatar-feedback-filter">筛选</button>
            <button class="small-button ghost" data-action="avatar-feedback-clear">清空</button>
          </div>
        </div>
        ${tableHtml(feedbackRows, [
          ['反馈', (row) => `<div class="cell-title">${escapeHtml(row.reasonLabel)}</div><div class="cell-sub clamp">${escapeHtml(row.content || '用户未填写补充说明')}</div>`],
          ['用户', (row) => `<div>${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.ownerPhone)} · ${escapeHtml(row.petName || '-')}</div>`],
          ['任务', (row) => `<div>${statusPill(row.jobStatus)}</div><div class="cell-sub">${escapeHtml(row.provider || '-')}</div><div class="cell-sub">${escapeHtml(row.jobId)}</div>`],
          ['处理', (row) => `${tonePill(row.statusLabel, row.status === 'reviewed' ? 'ok' : 'warn')}<div class="cell-sub">${row.reviewedAt ? formatTime(row.reviewedAt) : '等待运营处理'}</div>`],
          ['反馈时间', (row) => formatTime(row.createdAt)],
          ['操作', avatarFeedbackAction],
        ], '暂无生成反馈')}
      </div>

      <div class="card">
        <div class="section-head">
          <div>
            <h2>上传素材</h2>
            <div class="section-sub">生成前原图质量、来源和关联任务</div>
          </div>
          ${help('这里不返回 base64 原图，只展示预览地址、质量分析和关联任务，避免后台列表加载过重。')}
        </div>
        <div class="toolbar moderation-toolbar ai-toolbar">
          <div class="toolbar-left">
            <label>质量
              <select id="aiMediaQuality">
                ${option('all', '全部', state.aiMediaQuality)}
                ${option('good', '可生成', state.aiMediaQuality)}
                ${option('warning', '建议优化', state.aiMediaQuality)}
                ${option('blocked', '不可生成', state.aiMediaQuality)}
              </select>
            </label>
            <label>搜索<input id="aiMediaQ" placeholder="手机号、宠物、媒体ID、分析码" value="${escapeHtml(state.aiMediaQ)}" /></label>
          </div>
          <div class="actions">
            <button class="small-button" data-action="ai-media-filter">筛选</button>
            <button class="small-button ghost" data-action="ai-media-clear">清空</button>
          </div>
        </div>
        ${tableHtml(mediaRows, [
          ['素材', avatarMediaCell],
          ['用户 / 宠物', (row) => `<div>${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.ownerPhone)} · ${escapeHtml(row.petName || '-')}</div>`],
          ['质量', (row) => `${avatarQualityPill(row)}<div class="cell-sub">${numberText(row.qualityScore)} 分 · ${escapeHtml(row.analysisCode || '-')}</div><div class="cell-sub clamp">${escapeHtml(row.analysisTitle || row.analysisMessage || '')}</div>`],
          ['来源', (row) => `<div>${escapeHtml(row.sourceLabel || '-')}</div><div class="cell-sub">${escapeHtml(row.mimeType || '-')}</div>`],
          ['关联', (row) => `<div>${numberText(row.avatarJobCount)} 个任务</div><div class="cell-sub">${row.latestAvatarJobId ? `${escapeHtml(row.latestAvatarJobStatus || '-')} · ${escapeHtml(row.latestAvatarJobId)}` : '暂未发起生成'}</div>`],
          ['上传时间', (row) => formatTime(row.createdAt)],
        ], '暂无上传素材')}
      </div>
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>用量成本</h2>
            <div class="section-sub">今日额度消耗、DeepSeek token 和 gpt-image2 累计成本</div>
          </div>
          ${help('累计成本来自 provider 汇总字段；新任务还会记录逐次调用的成本快照，历史任务无法反推逐次费用。')}
        </div>
        <div class="insight-list">
          <div><span>今日灵伴形象</span><strong>${numberText(usageSummary.todayPetAvatarCount)}</strong></div>
          <div><span>今日 AI 对话</span><strong>${numberText(usageSummary.todayPetChatCount)}</strong></div>
          <div><span>DeepSeek 请求</span><strong>${numberText(usageSummary.deepseekRequests)}</strong></div>
          <div><span>DeepSeek Token</span><strong>${numberText(usageSummary.deepseekTokens)}</strong></div>
          <div><span>平均回复字数</span><strong>${numberText(usageSummary.averageReplyLength)}</strong></div>
          <div><span>gpt-image2 累计成本</span><strong>${moneyText(usageSummary.gptImage2Cost)}</strong></div>
          <div><span>gpt-image2 Credits</span><strong>${numberText(usageSummary.gptImage2CreditsCost, 2)}</strong></div>
          <div><span>Trace 成本快照</span><strong>${moneyText(usageSummary.providerTraceCost)}</strong></div>
          <div><span>Trace Credits</span><strong>${numberText(usageSummary.providerTraceCreditsCost, 2)}</strong></div>
          <div><span>形象额度触顶用户</span><strong>${numberText(usageSummary.petAvatarQuotaHitUsers)}</strong></div>
          <div><span>对话额度触顶用户</span><strong>${numberText(usageSummary.petChatQuotaHitUsers)}</strong></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>供应商监控</h2>
            <div class="section-sub">按 provider 对比 ready、失败和卡住任务</div>
          </div>
          ${help('柱状图来自业务任务状态；请求数、累计成本来自 aiUsage，调用轨迹来自新任务的供应商请求快照。')}
        </div>
        <div id="aiProviderChart" class="analytics-chart"></div>
      </div>
    </div>

    <div class="card">
      <div class="section-head">
        <div>
          <h2>供应商明细</h2>
          <div class="section-sub">请求、成功失败、成本、额度、任务健康和最近任务</div>
        </div>
        ${help('当前启用供应商来自后端 PET_AVATAR_PROVIDER；历史供应商保留是为了排查旧任务和迁移前后的成功率变化。')}
      </div>
      ${tableHtml(providerRows, [
        ['供应商', (row) => `<div class="cell-title">${escapeHtml(row.label)}</div><div class="cell-sub">${escapeHtml(row.provider)} · ${aiProviderRolePill(row)}</div>`],
        ['请求 / 成功', (row) => `<div>${numberText(row.requests)} 请求</div><div class="cell-sub">${numberText(row.succeeded)} 成功 · ${numberText(row.failed)} 失败</div>`],
        ['任务健康', (row) => `<div>${numberText(row.jobCount)} 任务</div><div class="cell-sub">${numberText(row.ready)} ready · ${numberText(row.processing)} 处理中 · ${numberText(row.stuck)} 卡住</div>`],
        ['调用轨迹', (row) => `<div>${numberText(row.traceCount)} 条轨迹</div><div class="cell-sub">${numberText(row.tracedJobs)} 个任务 · 最近 ${formatTime(row.latestTraceAt)}</div>`],
        ['成本 / 额度', (row) => `<div>${moneyText(row.cost || 0)}</div><div class="cell-sub">${numberText(row.creditsCost || 0, 2)} credits · ${numberText(row.quota || 0, 2)} quota</div>`],
        ['质量', (row) => `<div>${percentText(row.successRate)} 成功率</div><div class="cell-sub">平均 ${secondsText(row.averageSeconds)} · ${escapeHtml(row.topErrorCode || '无 Top 错误')}</div>`],
        ['最近任务', (row) => formatTime(row.latestJobAt)],
      ], '暂无供应商用量')}
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>Top 错误码</h2>
            <div class="section-sub">失败任务和状态刷新错误的聚合</div>
          </div>
          ${help('错误码用于快速判断是提交失败、上游失败、超时，还是状态查询网络波动。')}
        </div>
        ${aiErrorList(topErrors)}
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>数据口径缺口</h2>
            <div class="section-sub">这些指标还需要后续补上更细事件</div>
          </div>
          ${help('这不是当前后台不可用，而是业务状态里还没有足够强的时间戳或成本快照。')}
        </div>
        <div class="gap-list">
          ${(aiUsage.dataGaps || []).map((item) => `<div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.reason)}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>运营口径</h2>
            <div class="section-sub">从任务、反馈、素材、成本和供应商一起判断问题来源</div>
          </div>
        </div>
        <div class="gap-list">
          <div><strong>卡住优先看任务</strong><span>processing 超过 5 分钟未更新，先刷新 provider 状态，再判断是否重试或标记失败。</span></div>
          <div><strong>不像宠物优先看反馈</strong><span>毛色、脸型、表情和不像同一只宠物，都会进入生成反馈，后续可沉淀为提示词样本。</span></div>
          <div><strong>清晰度优先看素材</strong><span>warning 和 blocked 通常来自图片太小、多宠、人物入镜或主体不清晰。</span></div>
          <div><strong>成本异常看供应商</strong><span>同样任务量下成本或 credits 突增，优先检查 provider 配置、尺寸档位、调用轨迹和重试次数。</span></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>下一阶段预留</h2>
            <div class="section-sub">保留高权限动作，不在单 admin 第一版贸然开放</div>
          </div>
          ${help('成本和供应商监控已可读；后续高风险动作仍需要更细权限、原因、审计和可能的双人审批。')}
        </div>
        <div class="gap-list">
          <div><strong>完整 SLA</strong><span>当前已记录 submit/status/action 调用耗时；queued、running、completed 等细节点仍依赖上游返回。</span></div>
          <div><strong>样本集</strong><span>把已处理反馈沉淀成身份不一致、风格不满意、素材质量差等训练/评估样本。</span></div>
          <div><strong>供应商切换</strong><span>生产阶段应通过配置中心和灰度策略切换，不直接在任务页一键切 provider。</span></div>
        </div>
      </div>
    </div>
  `;
  renderAiProviderChart(aiUsage);
}

async function renderSocialPosts(force) {
  const [posts, comments] = await Promise.all([
    load('socialPosts', '/admin/social/posts', force),
    load('socialComments', '/admin/social/comments', force),
  ]);
  $('content').innerHTML = `
    ${state.socialEvidenceDetail ? renderSocialEvidenceDetail(state.socialEvidenceDetail) : ''}
    <div class="card">
      <div class="section-head">
        <div>
          <h2>宠友圈动态</h2>
          <div class="section-sub">隐藏用于运营处理，删除用于严重违规或用户要求删除</div>
        </div>
        ${help('隐藏后 App 列表不展示，但后台可恢复；删除会同时清理点赞和评论展示。')}
      </div>
      ${tableHtml(posts, [
        ['动态', (p) => `<div class="cell-title">${escapeHtml(p.petName || p.ownerName)}</div><div class="cell-sub">${escapeHtml(p.content).slice(0, 90)}</div>`],
        ['用户', (p) => `<div>${escapeHtml(p.ownerName)}</div><div class="cell-sub">${shortPhone(p.ownerPhone)}</div>`],
        ['状态', (p) => `${statusPill(p.status)}<div class="cell-sub">${p.imageUrls.length} 图 · ${p.commentCount} 评 · ${p.likeCount} 赞</div>`],
        ['举报', (p) => p.reportCount],
        ['发布时间', (p) => formatTime(p.createdAt)],
        ['操作', (p) => `
          <div class="actions">
            <button class="small-button" data-action="social-evidence-load" data-target-type="post" data-id="${escapeHtml(p.id)}">证据</button>
            <button class="small-button" data-action="post-hide" data-id="${p.id}">隐藏</button>
            <button class="small-button" data-action="post-restore" data-id="${p.id}">恢复</button>
            <button class="small-button danger" data-action="post-delete" data-id="${p.id}">删除</button>
            ${socialAuthorSanctionButtons('post', p)}
          </div>
        `],
      ])}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>评论</h2>
          <div class="section-sub">评论隐藏后不再进入 App 评论列表</div>
        </div>
      </div>
      ${tableHtml(comments, [
        ['评论', (c) => `<div class="cell-title">${escapeHtml(c.content)}</div><div class="cell-sub">${escapeHtml(c.postId)}</div>`],
        ['用户', (c) => `<div>${escapeHtml(c.ownerName)}</div><div class="cell-sub">${shortPhone(c.ownerPhone)}</div>`],
        ['状态', (c) => statusPill(c.status)],
        ['举报', (c) => c.reportCount],
        ['时间', (c) => formatTime(c.createdAt)],
        ['操作', (c) => `
          <div class="actions">
            <button class="small-button" data-action="social-evidence-load" data-target-type="comment" data-id="${escapeHtml(c.id)}">证据</button>
            <button class="small-button" data-action="comment-hide" data-id="${c.id}">隐藏</button>
            <button class="small-button" data-action="comment-restore" data-id="${c.id}">恢复</button>
            ${socialAuthorSanctionButtons('comment', c)}
          </div>
        `],
      ])}
    </div>
  `;
}

function renderSocialEvidenceDetail(detail = {}) {
  const isPost = detail.detailType === 'post';
  const item = isPost ? detail.post || {} : detail.comment || {};
  const snapshot = detail.evidenceSnapshot || {};
  const summary = detail.summary || {};
  const title = isPost ? (snapshot.targetLabel || '宠友圈动态') : '宠友圈评论';
  const content = snapshot.contentText || item.content || '';
  const mediaUrls = Array.isArray(snapshot.mediaUrls) ? snapshot.mediaUrls : [];
  const parentPost = detail.parentPost || {};
  return `
    <div class="card social-evidence-panel">
      <div class="section-head">
        <div>
          <h2>证据详情 · ${escapeHtml(title)}</h2>
          <div class="section-sub">${escapeHtml(snapshot.targetId || item.id || '-')} · ${escapeHtml(snapshot.ownerName || item.ownerName || '-')} ${snapshot.ownerPhone ? shortPhone(snapshot.ownerPhone) : ''}</div>
        </div>
        <div class="actions">
          ${help('查看证据会写入审计日志；这里聚合真实动态、评论、举报、处罚和近期后台动作，便于运营判断是否隐藏、删除或处罚。')}
          <button class="small-button" data-action="social-evidence-close">关闭</button>
        </div>
      </div>
      <div class="social-evidence-metrics">
        <span>举报 ${numberText(summary.reports || 0)}</span>
        <span>处罚 ${numberText(summary.relatedSanctions || 0)}</span>
        <span>生效限制 ${numberText(summary.activeSanctions || 0)}</span>
        <span>审计 ${numberText(summary.auditLogs || 0)}</span>
        ${isPost ? `<span>评论 ${numberText(summary.comments || 0)}</span><span>点赞 ${numberText(summary.likes || 0)}</span><span>图片 ${numberText(summary.images || 0)}</span>` : ''}
      </div>
      <div class="grid two social-evidence-grid">
        <div>
          <div class="mini-section-title">内容快照</div>
          <div class="social-evidence-copy">${escapeHtml(content || '无正文内容')}</div>
          ${mediaUrls.length ? `<div class="moderation-media-strip">${mediaUrls.slice(0, 6).map((url) => `<img src="${escapeHtml(url)}" alt="" loading="lazy" />`).join('')}</div>` : '<div class="cell-sub">无图片证据</div>'}
          <div class="switch-panel">
            <div class="switch-row"><span>状态</span><strong>${statusPill(snapshot.targetStatus || item.status || '-')}</strong></div>
            <div class="switch-row"><span>创建时间</span><strong>${formatTime(snapshot.createdAt || item.createdAt)}</strong></div>
            <div class="switch-row"><span>生成时间</span><strong>${formatTime(detail.generatedAt)}</strong></div>
            <div class="switch-row"><span>查看原因</span><strong class="cell-sub clamp">${escapeHtml(detail.reason || '-')}</strong></div>
          </div>
          ${!isPost && parentPost.id ? `
            <div class="mini-section-title">父级小事</div>
            <div class="gap-list compact">
              <div><strong>${escapeHtml(parentPost.petName || parentPost.ownerName || '宠友圈动态')}</strong><span>${escapeHtml(parentPost.content || '').slice(0, 160)}</span></div>
            </div>
          ` : ''}
        </div>
        <div>
          <div class="mini-section-title">作者限制</div>
          ${tableHtml(detail.activeSanctions || [], [
            ['类型', (row) => statusPill(row.typeLabel || row.type)],
            ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.reason || '-')}</div>`],
            ['到期', (row) => row.expiresAt ? formatTime(row.expiresAt) : '长期/警告'],
          ], '暂无生效处罚')}
        </div>
      </div>
      <div class="grid two social-evidence-grid">
        <div>
          <div class="mini-section-title">相关举报</div>
          ${tableHtml(detail.reports || [], [
            ['对象', (row) => `<div class="cell-title">${escapeHtml(row.targetType || '-')}</div><div class="cell-sub">${escapeHtml(row.targetId || '-')}</div>`],
            ['状态', (row) => statusPill(row.status)],
            ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.content || '-')}</div>`],
          ], '暂无相关举报')}
        </div>
        <div>
          <div class="mini-section-title">本内容处罚</div>
          ${tableHtml(detail.relatedSanctions || [], [
            ['处罚', (row) => statusPill(row.typeLabel || row.type)],
            ['状态', (row) => statusPill(row.status)],
            ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.reason || '-')}</div>`],
          ], '暂无直接关联处罚')}
        </div>
      </div>
      ${isPost ? `
        <div class="mini-section-title">评论证据</div>
        ${tableHtml(detail.comments || [], [
          ['评论', (row) => `<div class="cell-title">${escapeHtml(row.content || '-')}</div><div class="cell-sub">${escapeHtml(row.id || '-')}</div>`],
          ['用户', (row) => `<div>${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.ownerPhone || '')}</div>`],
          ['状态', (row) => statusPill(row.status || '-')],
          ['时间', (row) => formatTime(row.createdAt)],
        ], '暂无评论')}
      ` : ''}
      <div class="mini-section-title">近期审计</div>
      ${tableHtml(detail.auditLogs || [], [
        ['动作', (row) => `<div class="cell-title">${escapeHtml(row.action || '-')}</div><div class="cell-sub">${escapeHtml(row.id || '-')}</div>`],
        ['管理员', (row) => escapeHtml(row.adminName || '-')],
        ['原因/时间', (row) => `<div class="cell-sub clamp">${escapeHtml(row.reason || '-')}</div><div>${formatTime(row.createdAt)}</div>`],
      ], '暂无相关审计')}
    </div>
  `;
}

function socialAuthorSanctionButtons(targetType, row) {
  const label = targetType === 'post' ? '小事' : '评论';
  const targetLabel = targetType === 'post' ? `${row.petName || row.ownerName || '宠物'} 的小事` : '宠友圈评论';
  const content = String(row.content || '').slice(0, 40);
  const encodedTargetLabel = escapeHtml(targetLabel);
  const encodedContent = escapeHtml(content);
  return `
    <button class="small-button" data-action="social-author-sanction" data-target-type="${targetType}" data-id="${escapeHtml(row.id)}" data-type="warning" data-duration="0" data-target-label="${encodedTargetLabel}" data-content="${encodedContent}">警告</button>
    <button class="small-button danger" data-action="social-author-sanction" data-target-type="${targetType}" data-id="${escapeHtml(row.id)}" data-type="mute" data-duration="24" data-target-label="${encodedTargetLabel}" data-content="${encodedContent}">禁言24h</button>
    <button class="small-button danger" data-action="social-author-sanction" data-target-type="${targetType}" data-id="${escapeHtml(row.id)}" data-type="freeze" data-duration="72" data-target-label="${encodedTargetLabel}" data-content="${encodedContent}">冻结72h</button>
    <span class="cell-sub">${label}作者处罚</span>
  `;
}

async function applySocialAuthorSanction(button) {
  const targetType = button.dataset.targetType === 'comment' ? 'comment' : 'post';
  const id = button.dataset.id || '';
  const type = button.dataset.type || 'mute';
  const durationHours = Number(button.dataset.duration || 24);
  const targetLabel = button.dataset.targetLabel || (targetType === 'post' ? '宠友圈动态' : '宠友圈评论');
  const content = button.dataset.content || '';
  const typeLabel = type === 'warning' ? '警告' : type === 'freeze' ? '冻结' : type === 'ban' ? '封禁' : '禁言';
  const defaultReason = `${targetLabel}违规处理：${content || id}`;
  const reason = window.prompt(`确认对作者执行${typeLabel}${durationHours > 0 ? `${durationHours}小时` : ''}？请填写处罚原因`, defaultReason);
  if (reason === null) return;
  const endpoint = targetType === 'post'
    ? `/admin/social/posts/${encodeURIComponent(id)}/sanction`
    : `/admin/social/comments/${encodeURIComponent(id)}/sanction`;
  await post(endpoint, {
    durationHours,
    reason: reason.trim() || defaultReason,
    type,
  });
  state.cache = {
    ...state.cache,
    audit: null,
    reports: null,
    sanctionPolicy: null,
    sanctions: null,
    socialComments: null,
    socialPosts: null,
    summary: null,
    users: null,
  };
  showToast('作者处罚已创建');
  await render(true);
}

async function loadSocialEvidenceDetail(button) {
  const targetType = button.dataset.targetType === 'comment' ? 'comment' : 'post';
  const id = button.dataset.id || '';
  if (!id) return;
  const label = targetType === 'comment' ? '评论证据' : '动态证据';
  const reason = window.prompt(`请输入查看${label}的原因`, `排查${label}：${id}`);
  if (reason === null) return;
  const endpoint = targetType === 'comment'
    ? `/admin/social/comments/${encodeURIComponent(id)}/evidence`
    : `/admin/social/posts/${encodeURIComponent(id)}/evidence`;
  const detail = await post(endpoint, { reason: reason.trim() });
  state.socialEvidenceDetail = detail;
  state.cache.audit = null;
  showToast('已加载证据详情');
  await render(false);
}

async function renderReports(force) {
  const rows = await load('reports', '/admin/social/reports', force);
  renderTable({
    empty: '暂无举报',
    rows,
    columns: [
      ['举报对象', (r) => `<div class="cell-title">${escapeHtml(reportTargetTypeLabel(r.targetType))} · ${escapeHtml(r.targetId)}</div><div class="cell-sub">被举报：${escapeHtml(r.ownerName || '-')} ${shortPhone(r.ownerPhone)}</div>`],
      ['举报人', (r) => `<div>${escapeHtml(r.reporterName)}</div><div class="cell-sub">${shortPhone(r.reporterPhone)}</div>`],
      ['原因', (r) => escapeHtml(r.content || '-')],
      ['内容快照', renderReportEvidenceSnapshot],
      ['状态', (r) => `${statusPill(r.status)}<div class="cell-sub">举报人：${r.resultNotifiedAt ? formatTime(r.resultNotifiedAt) : '未通知'}</div><div class="cell-sub">作者：${r.ownerResultNotifiedAt ? formatTime(r.ownerResultNotifiedAt) : '未通知'}</div>`],
      ['处罚建议', renderReportSanctionSuggestion],
      ['时间', (r) => formatTime(r.createdAt)],
      ['操作', (r) => `
        <div class="actions">
          ${r.targetType === 'message' ? `<button class="small-button" data-action="report-message-context" data-id="${escapeHtml(r.id)}">上下文</button>` : ''}
          ${r.targetType === 'message' ? `<button class="small-button" data-action="report-mark-harassment" data-id="${escapeHtml(r.id)}">标记骚扰</button>` : ''}
          ${r.targetType === 'place' ? `<button class="small-button" data-action="report-place-correct" data-id="${escapeHtml(r.id)}" data-target-id="${escapeHtml(r.targetId)}">修正地点</button>` : ''}
          <button class="small-button" data-action="report-valid" data-id="${escapeHtml(r.id)}">有效</button>
          <button class="small-button" data-action="report-invalid" data-id="${escapeHtml(r.id)}">无效</button>
        </div>
      `],
    ],
  });
}

function reportTargetTypeLabel(targetType) {
  return {
    comment: '宠友圈评论',
    message: '私信消息',
    place: '地点信息',
    place_review: '地点点评',
    post: '宠友圈小事',
  }[targetType] || targetType || '-';
}

function renderReportEvidenceSnapshot(report) {
  const snapshot = report.evidenceSnapshot || {};
  const frozen = snapshot.snapshotId && snapshot.snapshotAt;
  const content = escapeHtml(snapshot.contentText || '无文本内容').slice(0, 90);
  return `
    <div class="cell-title">${escapeHtml(snapshot.targetLabel || '-')}</div>
    <div class="cell-sub">${frozen ? `已固化：${formatTime(snapshot.snapshotAt)}` : '动态预览，旧举报待处理时会固化'}</div>
    <div class="cell-sub">状态：${escapeHtml(snapshot.targetStatus || '-')} ${snapshot.mediaUrls?.length ? `· ${snapshot.mediaUrls.length} 张图` : ''}</div>
    <div class="cell-sub">${content}</div>
    ${renderReportMessageContext(report)}
  `;
}

function renderReportMessageContext(report) {
  const context = state.reportMessageContexts?.[report.id];
  if (!context) {
    return report.targetType === 'message'
      ? `<div class="report-message-placeholder">私信上下文需填写原因后查看</div>${report.harassmentFlaggedAt ? `<div class="cell-sub">已标记疑似骚扰：${formatTime(report.harassmentFlaggedAt)}</div>` : ''}`
      : '';
  }
  const rows = (context.messages || []).map((message) => `
    <div class="report-message-row ${message.isTarget ? 'target' : ''}">
      <div class="report-message-meta">
        <strong>${escapeHtml(message.authorLabel || message.author || '-')}</strong>
        <span>${escapeHtml(message.authorName || '-')} ${message.authorPhone ? shortPhone(message.authorPhone) : ''}</span>
        <span>${formatTime(message.time)}</span>
        ${message.status ? statusPill(message.status) : ''}
      </div>
      <div class="report-message-text">${escapeHtml(message.text || '无正文内容')}</div>
    </div>
  `).join('');
  return `
    <div class="report-message-context">
      <div class="report-message-context-head">
        <strong>私信上下文</strong>
        <span>${escapeHtml(context.contextSource || 'conversation')} · ${numberText(context.messageCount || 0)} 条 · ${formatTime(context.viewedAt)}</span>
      </div>
      <div class="cell-sub">查看原因：${escapeHtml(context.reason || '-')}</div>
      <div class="cell-sub">策略：最近 ${numberText(context.policy?.contextWindowLimit || context.messageCount || 0)} 条 / 审计保留至 ${context.retentionExpiresAt ? formatTime(context.retentionExpiresAt) : '-'}</div>
      ${rows || '<div class="cell-sub">暂无上下文消息</div>'}
    </div>
  `;
}

function renderReportSanctionSuggestion(report) {
  const suggestion = report.sanctionSuggestion;
  if (suggestion?.status === 'applied') {
    return `<div>${statusPill('已处罚')}</div><div class="cell-sub">${escapeHtml(suggestion.typeLabel || suggestion.type)} · ${escapeHtml(suggestion.sanctionId || report.sanctionId || '-')}</div>`;
  }
  if (!suggestion) {
    return `<div class="cell-sub">${report.status === 'valid' ? '刷新后生成建议' : '有效举报后生成'}</div>`;
  }
  return `
    <div>${statusPill(suggestion.typeLabel || suggestion.type)}</div>
    <div class="cell-sub">${suggestion.durationHours ? `${suggestion.durationHours} 小时` : '长期或仅警告'}</div>
    <button class="small-button" data-action="report-sanction" data-id="${escapeHtml(report.id)}" data-template-id="${escapeHtml(suggestion.templateId || '')}" data-reason="${escapeHtml(suggestion.reason || '')}">按建议处罚</button>
  `;
}

function placeQualityPill(place) {
  const score = Number(place.qualityScore || 0);
  const tone = score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'bad';
  return `<span class="pill ${tone}">${escapeHtml(place.qualityLabel || '待完善')} ${numberText(score)}分</span>`;
}

function placeDuplicateSummary(place) {
  const candidates = Array.isArray(place.duplicateCandidates) ? place.duplicateCandidates : [];
  if (!candidates.length) return '<div class="cell-sub">暂无重复候选</div>';
  return candidates.slice(0, 3).map((candidate) => {
    const distance = Number.isFinite(Number(candidate.distanceMeters)) ? ` · ${numberText(candidate.distanceMeters)}m` : '';
    const reasons = Array.isArray(candidate.reasons) ? candidate.reasons.join(' / ') : '';
    return `
      <div class="cell-sub">
        <strong>${escapeHtml(candidate.name || candidate.id)}</strong>
        · 相似 ${numberText(candidate.score)}${distance}
      </div>
      <div class="cell-sub">${escapeHtml(reasons || candidate.address || '-')}</div>
    `;
  }).join('');
}

function placeSubmissionDuplicateSummary(submission) {
  const candidates = Array.isArray(submission.duplicateCandidates) ? submission.duplicateCandidates : [];
  if (!candidates.length) return '<div class="cell-sub">暂无相似地点</div>';
  return candidates.slice(0, 3).map((candidate) => {
    const distance = Number.isFinite(Number(candidate.distanceMeters)) ? ` · ${numberText(candidate.distanceMeters)}m` : '';
    return `
      <div class="cell-sub">
        <strong>${escapeHtml(candidate.name || candidate.id)}</strong>
        · 相似 ${numberText(candidate.score)}${distance}
      </div>
      <div class="cell-sub">${escapeHtml(candidate.id || '-')}</div>
    `;
  }).join('');
}

function renderPlaceContributions(contributions) {
  const rows = Array.isArray(contributions) ? contributions.slice(0, 12) : [];
  const signedPoints = (value) => {
    const points = Number(value || 0);
    return `${points > 0 ? '+' : ''}${numberText(points)}`;
  };
  return tableHtml(rows, [
    ['贡献', (row) => `<div class="cell-title">${escapeHtml(row.actionLabel || row.action || '-')} · ${signedPoints(row.points)} 分</div><div class="cell-sub">${escapeHtml(row.id || '-')}</div>`],
    ['用户', (row) => `<div>${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.phone)}</div>`],
    ['地点', (row) => `<div>${escapeHtml(row.placeName || row.placeId || '-')}</div><div class="cell-sub">${escapeHtml(row.placeId || '-')}</div>`],
    ['状态', (row) => `${statusPill(row.statusLabel || row.status || '有效')}<div class="cell-sub">${row.voidedAt ? `撤销：${formatTime(row.voidedAt)}` : '计入移动端身份'}</div>`],
    ['来源', (row) => `<div>${escapeHtml(row.submissionId || row.source || '-')}</div><div class="cell-sub">${formatTime(row.createdAt)}</div><div class="cell-sub clamp">${escapeHtml(row.reason || '-')}</div>`],
    ['操作', (row) => row.canVoid ? `<button class="small-button danger" data-action="place-contribution-void" data-id="${escapeHtml(row.id)}" data-title="${escapeHtml(row.actionLabel || row.id || '')}">撤销</button>` : '<span class="cell-sub">已锁定</span>'],
  ], '暂无地点贡献记录');
}

function placeQualityEvidence(place) {
  const reasons = Array.isArray(place.qualityReasons) ? place.qualityReasons : [];
  return [
    reasons.length ? reasons.join(' / ') : '暂无质量证据',
    `点评 ${numberText(place.reviewCount || 0)} · 已审 ${numberText(place.approvedReviewCount || 0)} · 收藏 ${numberText(place.favoriteCount || 0)}`,
  ].map((line) => `<div class="cell-sub">${escapeHtml(line)}</div>`).join('');
}

function placeImageThumbs(item) {
  const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls : [];
  if (!imageUrls.length) return '<div class="cell-sub">未上传图片</div>';
  return `
    <div class="moderation-media-strip compact">
      ${imageUrls.slice(0, 3).map((url) => `<img src="${escapeHtml(url)}" alt="" loading="lazy" />`).join('')}
    </div>
    <div class="cell-sub">${numberText(imageUrls.length)} 张图</div>
  `;
}

async function renderPlaces(force) {
  const [catalog, reviews, submissions, templates, contributionData] = await Promise.all([
    load('places', '/admin/places', force),
    load('placeReviews', '/admin/places/reviews', force),
    load('placeSubmissions', '/admin/places/submissions', force),
    load('placeModerationTemplates', '/admin/places/moderation-templates', force),
    load('placeContributions', '/admin/places/contributions', force),
  ]);
  const places = Array.isArray(catalog) ? catalog : catalog.places || [];
  const placeSummary = Array.isArray(catalog) ? {} : catalog.summary || {};
  const contributions = contributionData?.contributions || [];
  const contributionSummary = contributionData?.summary || {};
  const signedContributionPoints = (value) => {
    const points = Number(value || 0);
    return `${points > 0 ? '+' : ''}${numberText(points)}`;
  };
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('地点总数', numberText(placeSummary.total || places.length), `${numberText(placeSummary.highQuality || 0)} 个高质量`, '来自 seed、高德回流和用户审核入库的地点目录总数。')}
      ${metric('平均质量分', numberText(placeSummary.averageQualityScore || 0), '实时计算', '质量分由地址、坐标、分类、标签、评分、点评、收藏和宠物友好状态综合计算，不会自动改写地点。')}
      ${metric('重复候选', numberText(placeSummary.duplicatePlaceCount || 0), '需人工确认', '重复候选只给运营证据，不自动合并或隐藏，避免误伤真实不同地点。')}
      ${metric('待治理', numberText(placeSummary.needsReview || 0), '低分/重复/candidate', '质量分低于 60、有重复候选或宠物友好状态仍为 candidate 的地点会进入待治理口径。')}
      ${metric('地点贡献', numberText(contributionSummary.total || placeSummary.contributionRecords || 0), `${signedContributionPoints(contributionSummary.points ?? placeSummary.contributionPoints ?? 0)} 分`, '新增地点审核通过、关联已有地点或运营纠偏后，会重算提交人的地点贡献；当前只是运营积分账本，不等同现金或余额。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>地点质量治理</h2>
          <div class="section-sub">质量分和重复候选会同步进入移动端地点响应，用于排序和后续运营判断；当前不做自动合并</div>
        </div>
        ${help('质量分是运营信号：高分优先展示和排查更可信；重复候选用于提示人工合并，编辑和合并都会写入审计。')}
      </div>
      ${tableHtml(places, [
        ['地点', (row) => `<div class="cell-title">${escapeHtml(row.name)}</div><div class="cell-sub">${escapeHtml(row.address || '-')}</div><div class="cell-sub">${escapeHtml(row.id)}</div>`],
        ['质量', (row) => `${placeQualityPill(row)}${placeQualityEvidence(row)}`],
        ['重复候选', (row) => placeDuplicateSummary(row)],
        ['来源', (row) => `<div>${escapeHtml(row.source || '-')} · ${escapeHtml(row.category || '-')}</div><div class="cell-sub">${escapeHtml(row.petFriendlyStatus || 'unknown')} · 贡献者 ${numberText(row.contributorCount || 0)}</div><div class="cell-sub">${escapeHtml((row.tags || []).slice(0, 4).join(' / ') || '-')}</div>`],
        ['操作', (row) => `
          <div class="actions">
            <button class="small-button" data-action="place-edit" data-id="${escapeHtml(row.id)}">编辑</button>
            <button class="small-button ${row.duplicateCandidateCount ? 'danger' : 'ghost'}" data-action="place-merge" data-id="${escapeHtml(row.id)}">合并</button>
          </div>
        `],
      ], '暂无地点目录')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>审核原因模板</h2>
          <div class="section-sub">通过或驳回地点点评、新增地点时可套用，最终原因仍可编辑并同步给用户通知</div>
        </div>
        <div class="actions">
          <button class="small-button" data-action="place-template-create">新增模板</button>
        </div>
        ${help('模板用于统一运营口径；真正写入审核记录、通知和审计的是最终提交的审核原因。')}
      </div>
      <div class="template-summary-row">
        <span class="risk-badge">启用 ${numberText(templates.filter((item) => item.enabled !== false).length)}</span>
        <span class="risk-badge">自定义 ${numberText(templates.filter((item) => !item.builtin).length)}</span>
        <span class="risk-badge">内置 ${numberText(templates.filter((item) => item.builtin).length)}</span>
      </div>
      ${renderPlaceModerationTemplates(templates)}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>地点贡献者</h2>
          <div class="section-sub">新增地点通过、关联已有地点或运营纠偏后自动重算；移动端“地点共建者”身份只读取有效记录</div>
        </div>
        <div class="actions">
          <button class="small-button" data-action="place-contribution-adjust">手动调整</button>
        </div>
        ${help('手动调整用于误审、刷分、线下活动补分或客服纠偏；撤销会保留审计记录但不再计入移动端地点共建身份。当前贡献分仍只是运营积分账本，不等同现金、余额或可提现资产。')}
      </div>
      <div class="template-summary-row">
        <span class="risk-badge">贡献 ${numberText(contributionSummary.total || 0)}</span>
        <span class="risk-badge">用户 ${numberText(contributionSummary.users || 0)}</span>
        <span class="risk-badge">积分 ${signedContributionPoints(contributionSummary.points || 0)}</span>
        <span class="risk-badge">关联已有 ${numberText(contributionSummary.linkedExisting || 0)}</span>
        <span class="risk-badge">手动 ${numberText(contributionSummary.manualAdjustments || 0)}</span>
        <span class="risk-badge">已撤销 ${numberText(contributionSummary.voided || 0)}</span>
      </div>
      <div class="switch-panel">
        <div class="switch-row"><span>移动端身份</span>${statusPill('已联动')}</div>
        <div class="switch-row"><span>排行榜</span>${statusPill('预留')}</div>
        <div class="switch-row"><span>活动奖励 / 兑换</span>${statusPill('预留')}</div>
      </div>
      ${renderPlaceContributions(contributions)}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>地点点评审核</h2>
          <div class="section-sub">点评默认 pending_review，审核后才适合公开展示</div>
        </div>
      </div>
      ${tableHtml(reviews, [
        ['点评', (r) => `<div class="cell-title">${escapeHtml(r.placeName)}</div><div class="cell-sub">${escapeHtml(r.content).slice(0, 90)}</div>`],
        ['图片', placeImageThumbs],
        ['用户', (r) => `<div>${escapeHtml(r.ownerName)}</div><div class="cell-sub">${shortPhone(r.ownerPhone)}</div>`],
        ['状态', (r) => `${statusPill(r.status)}<div class="cell-sub">${r.resultNotifiedAt ? '已通知：' + formatTime(r.resultNotifiedAt) : '未通知用户'}</div>${placeModerationTemplateMeta(r)}`],
        ['时间', (r) => formatTime(r.createdAt)],
        ['操作', (r) => `
          <div class="actions">
            <button class="small-button" data-action="review-approve" data-id="${r.id}">通过</button>
            <button class="small-button danger" data-action="review-reject" data-id="${r.id}">驳回</button>
          </div>
        `],
      ])}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>新增地点审核</h2>
          <div class="section-sub">通过后会创建 manual 地点，宠物友好状态为 candidate</div>
        </div>
      </div>
      ${tableHtml(submissions, [
        ['地点', (s) => `<div class="cell-title">${escapeHtml(s.name)}</div><div class="cell-sub">${escapeHtml(s.address)}</div>`],
        ['体验', (s) => escapeHtml(s.content).slice(0, 100)],
        ['相似地点', placeSubmissionDuplicateSummary],
        ['图片', placeImageThumbs],
        ['用户', (s) => `<div>${escapeHtml(s.ownerName)}</div><div class="cell-sub">${shortPhone(s.ownerPhone)}</div>`],
        ['状态', (s) => `${statusPill(s.status)}<div class="cell-sub">${s.resultNotifiedAt ? '已通知：' + formatTime(s.resultNotifiedAt) : '未通知用户'}</div>${s.contributionId ? `<div class="cell-sub">贡献：${escapeHtml(s.contributionActionLabel || '-')} +${numberText(s.contributionPoints || 0)}</div>` : ''}${placeModerationTemplateMeta(s)}`],
        ['时间', (s) => formatTime(s.createdAt)],
        ['操作', (s) => `
          <div class="actions">
            <button class="small-button" data-action="submission-approve" data-id="${s.id}">通过</button>
            <button class="small-button ghost" data-action="submission-link-existing" data-id="${escapeHtml(s.id)}" data-name="${escapeHtml(s.name || '')}" data-default-target-id="${escapeHtml((s.duplicateCandidates || [])[0]?.id || '')}">关联已有</button>
            <button class="small-button danger" data-action="submission-reject" data-id="${s.id}">驳回</button>
          </div>
        `],
      ])}
    </div>
  `;
}

function feedbackCategoryLabel(category) {
  return {
    bug: '问题反馈',
    other: '其他反馈',
    safety: '安全投诉',
    suggestion: '产品建议',
  }[category] || category || '其他反馈';
}

function feedbackStatusLabel(status) {
  return {
    all: '全部',
    closed: '已关闭',
    open: '未关闭',
    received: '新反馈',
    reviewing: '处理中',
  }[status] || status || '未关闭';
}

async function updateFeedbackStatus(button) {
  const id = button.dataset.id;
  const status = button.dataset.status || 'reviewing';
  const label = status === 'closed' ? '关闭反馈' : '转为处理中';
  const reason = window.prompt(`请输入${label}的原因`, status === 'closed' ? '反馈已完成处理或已并入工单' : '开始处理用户反馈');
  if (reason === null) return;
  const trimmed = reason.trim();
  if (!trimmed) {
    showToast('请填写处理原因');
    return;
  }
  await patch(`/admin/feedback/${encodeURIComponent(id)}`, { reason: trimmed, status });
  state.cache = { ...state.cache, audit: null, feedback: null, summary: null, tickets: null, users: null };
  showToast(status === 'closed' ? '反馈已关闭' : '反馈已转处理中');
  await render(true);
}

async function renderFeedback(force) {
  const query = new URLSearchParams({
    category: state.feedbackCategory,
    q: state.feedbackQ,
    status: state.feedbackStatus,
  });
  const data = await load('feedback', `/admin/feedback?${query.toString()}`, force);
  const rows = Array.isArray(data) ? data : data.items || [];
  const summary = Array.isArray(data) ? {} : data.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('未关闭反馈', numberText(summary.open || 0), `${numberText(summary.received || 0)} 条新反馈`, '来自 App /feedback 的原始反馈，提交后会自动生成对应客服工单。')}
      ${metric('处理中', numberText(summary.reviewing || 0), '同步到关联工单', '反馈状态和 source=feedback 的工单状态保持同步，避免两个入口各管各的。')}
      ${metric('安全投诉', numberText(summary.safety || 0), '默认 urgent', '安全类反馈会生成更高优先级工单，便于客服优先处理。')}
      ${metric('已关闭', numberText(summary.closed || 0), `${numberText(summary.all || 0)} 条总反馈`, '关闭反馈会同步关闭对应工单；仍会保留审计记录。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>反馈收集</h2>
          <div class="section-sub">App 原始反馈入口，自动关联工单中心</div>
        </div>
        ${help('这页用于快速查看 App 提交的原始反馈。用户提交后后端会自动创建客服工单；在这里改状态会同步到关联工单，正式回复用户仍建议在工单中心完成。')}
      </div>
      <div class="toolbar moderation-toolbar">
        <div class="toolbar-left">
          <label>状态
            <select id="feedbackStatus">
              ${['open', 'received', 'reviewing', 'closed', 'all'].map((status) => `<option value="${status}" ${state.feedbackStatus === status ? 'selected' : ''}>${feedbackStatusLabel(status)}</option>`).join('')}
            </select>
          </label>
          <label>分类
            <select id="feedbackCategory">
              ${['all', 'bug', 'safety', 'suggestion', 'other'].map((category) => `<option value="${category}" ${state.feedbackCategory === category ? 'selected' : ''}>${category === 'all' ? '全部分类' : feedbackCategoryLabel(category)}</option>`).join('')}
            </select>
          </label>
          <input id="feedbackQ" value="${escapeHtml(state.feedbackQ)}" placeholder="手机号 / 内容 / 工单 ID" />
        </div>
        <div class="actions">
          <button class="small-button" data-action="feedback-filter">筛选</button>
          <button class="small-button ghost" data-action="feedback-clear">清空</button>
        </div>
      </div>
      ${tableHtml(rows, [
        ['反馈', (f) => `<div class="cell-title">${escapeHtml(feedbackCategoryLabel(f.category))} ${statusPill(f.priority || 'normal')}</div><div class="cell-sub">${escapeHtml(f.content || '').slice(0, 160)}</div><div class="cell-sub">${escapeHtml(f.id || '-')}</div>`],
        ['用户', (f) => `<div>${escapeHtml(f.ownerName || '-')}</div><div class="cell-sub">${shortPhone(f.phone)}</div>`],
        ['联系', (f) => `<div>${escapeHtml(f.contact || '-')}</div><div class="cell-sub">${numberText(f.attachmentCount || 0)} 个附件</div>`],
        ['工单', (f) => `<div>${escapeHtml(f.supportTicketId || '-')}</div><div class="cell-sub">工单中心继续回复用户</div>`],
        ['状态', (f) => `${statusPill(f.status)}<div class="cell-sub">${formatTime(f.createdAt)}</div>`],
        ['操作', (f) => `
          <div class="actions">
            ${f.status !== 'reviewing' && f.status !== 'closed' ? `<button class="small-button" data-action="feedback-status" data-status="reviewing" data-id="${escapeHtml(f.id)}">处理中</button>` : ''}
            ${f.status !== 'closed' ? `<button class="small-button danger" data-action="feedback-status" data-status="closed" data-id="${escapeHtml(f.id)}">关闭</button>` : '<span class="cell-sub">已关闭</span>'}
          </div>
        `],
      ], '暂无反馈')}
    </div>
  `;
}

async function renderTickets(force) {
  const query = new URLSearchParams({
    priority: state.ticketPriority,
    q: state.ticketQ,
    status: state.ticketStatus,
  });
  const data = await load('tickets', `/admin/tickets?${query.toString()}`, force);
  const templates = await load('ticketReplyTemplates', '/admin/tickets/reply-templates', force);
  const tickets = data.tickets || [];
  const summary = data.summary || {};
  const assignees = data.assignees || [];
  const slaPolicy = data.slaPolicy || {};
  const quality = data.quality || {};
  const qualityKpi = data.qualityKpi || {};
  const qualityPolicy = data.qualityPolicy || {};
  const qualityReview = data.qualityReview || {};
  const rosterConflicts = data.rosterConflicts || [];
  const batchReview = data.batchReview || {};
  const batchReplyApprovals = data.batchReplyApprovals || {};
  const serviceReport = data.serviceReport || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('未关闭工单', summary.open || 0, `${summary.overdue || 0} 个已超 SLA`, '状态不是 closed/resolved 的工单都计入未关闭。')}
      ${metric('首响超时', summary.firstResponseOverdue || 0, `${summary.unassigned || 0} 个未分配`, '首响 SLA 从工单创建时间算到第一条真实客服回复，分配/接单不算首响。')}
      ${metric('解决超时', summary.resolutionOverdue || 0, `${summary.offDutyAssigned || 0} 个负责人离班`, '解决 SLA 从工单创建时间算到 resolved/closed。')}
      ${metric('等待用户', summary.waitingUser || 0, '已发送客服回复', '客服回复后默认进入 waiting_user，可继续备注或关闭。')}
      ${metric('安全投诉', summary.safety || 0, 'safety 分类', '安全投诉建议 2 小时内首次处理。')}
    </div>
    ${renderTicketOpsPanel(assignees, slaPolicy, rosterConflicts)}
    ${renderTicketQualityPanel(quality, batchReview, qualityKpi, qualityReview, batchReplyApprovals, qualityPolicy, serviceReport)}
    <div class="grid two ticket-template-workspace">
      <div class="card ticket-template-compose">
        <div class="section-head">
          <div>
            <h2>客服回复模板</h2>
            <div class="section-sub">保存常用回复，套用到任意工单后仍可二次编辑</div>
          </div>
          ${help('模板只影响后台填写效率；真正触达用户仍取决于每条工单回复时是否勾选通知用户。')}
        </div>
        <div class="notification-form">
          <label>模板名称<input id="ticketTemplateName" maxlength="32" placeholder="例如：请求补充截图" /></label>
          <label>模板内容<textarea id="ticketTemplateContent" maxlength="1000" placeholder="写给用户看的客服回复，可说明处理进度、下一步和需要补充的信息。"></textarea></label>
          <div class="notification-form-row">
            <label>回复后状态
              <select id="ticketTemplateStatus">
                ${ticketStatusOption('waiting_user', 'waiting_user', '等待用户')}
                ${ticketStatusOption('waiting_user', 'reviewing', '处理中')}
                ${ticketStatusOption('waiting_user', 'resolved', '已解决')}
                ${ticketStatusOption('waiting_user', 'closed', '已关闭')}
              </select>
            </label>
            <label class="inline-check notification-check"><input id="ticketTemplateNotify" type="checkbox" checked /> 默认通知用户</label>
          </div>
          <div class="notification-action-row">
            <button class="primary-button" data-action="ticket-reply-template-save">保存模板</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>可用模板</h2>
            <div class="section-sub">内置模板不可删除，自定义模板可维护</div>
          </div>
        </div>
        <div class="notification-template-list">
          ${templates.length ? templates.map((template) => renderTicketReplyTemplate(template)).join('') : '<div class="placeholder mini"><div><strong>暂无模板</strong><div>可先保存一条常用回复。</div></div></div>'}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>工单队列</h2>
          <div class="section-sub">用户反馈会自动进入工单；客服回复可同步生成 App 系统通知</div>
        </div>
        ${help('第一版仅 admin 角色。分配、备注、状态、回复都会写审计；回复通知使用移动端现有通知中心。')}
      </div>
      <div class="toolbar ticket-toolbar">
        <div class="toolbar-left">
          <label>状态
            <select id="ticketStatus">
              ${ticketFilterOption('ticketStatus', 'open', '未关闭')}
              ${ticketFilterOption('ticketStatus', 'received', '新反馈')}
              ${ticketFilterOption('ticketStatus', 'reviewing', '处理中')}
              ${ticketFilterOption('ticketStatus', 'waiting_user', '等待用户')}
              ${ticketFilterOption('ticketStatus', 'resolved', '已解决')}
              ${ticketFilterOption('ticketStatus', 'closed', '已关闭')}
              ${ticketFilterOption('ticketStatus', 'all', '全部')}
            </select>
          </label>
          <label>优先级
            <select id="ticketPriority">
              ${ticketFilterOption('ticketPriority', 'all', '全部')}
              ${ticketFilterOption('ticketPriority', 'urgent', '紧急')}
              ${ticketFilterOption('ticketPriority', 'high', '高')}
              ${ticketFilterOption('ticketPriority', 'normal', '普通')}
              ${ticketFilterOption('ticketPriority', 'low', '低')}
            </select>
          </label>
          <label>搜索
            <input id="ticketQ" placeholder="手机号、内容、工单 ID" value="${escapeHtml(state.ticketQ)}" />
          </label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="ticket-filter">应用</button>
          <button class="small-button" data-action="ticket-clear">重置</button>
        </div>
      </div>
      <div class="toolbar ticket-toolbar">
        <div class="toolbar-left">
          <label>批量动作
            <select id="ticketBulkAction">
              <option value="assign">批量分配</option>
              <option value="reviewing">批量转处理中</option>
              <option value="waiting_user">批量等待用户</option>
              <option value="resolved">批量标记已解决</option>
              <option value="closed">批量关闭</option>
              <option value="priority">批量改优先级</option>
            </select>
          </label>
          <label>负责人
            <select id="ticketBulkAssignee">
              ${ticketAssigneeOptions(assignees, state.admin?.username || 'admin')}
            </select>
          </label>
          <label>状态
            <select id="ticketBulkStatus">
              <option value="keep">跟随动作</option>
              <option value="received">新反馈</option>
              <option value="reviewing">处理中</option>
              <option value="waiting_user">等待用户</option>
              <option value="resolved">已解决</option>
              <option value="closed">已关闭</option>
            </select>
          </label>
          <label>优先级
            <select id="ticketBulkPriority">
              <option value="keep">不变</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="normal">普通</option>
              <option value="low">低</option>
            </select>
          </label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="ticket-batch">处理勾选</button>
        </div>
      </div>
      ${tickets.length ? `<div class="ticket-list">${tickets.map((ticket) => renderTicketCard(ticket, assignees)).join('')}</div>` : '<div class="placeholder"><div><strong>暂无工单</strong><div>当前筛选下没有用户反馈。</div></div></div>'}
    </div>
  `;
}

function ticketFilterOption(field, value, label) {
  const current = field === 'ticketStatus' ? state.ticketStatus : state.ticketPriority;
  return `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
}

function ticketStatusOption(current, value, label) {
  return `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
}

function ticketPriorityOption(current, value, label) {
  return `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
}

function ticketAssigneeOptions(assignees = [], current = '') {
  const rows = Array.isArray(assignees) && assignees.length
    ? assignees
    : [{ active: true, id: state.admin?.username || 'admin', name: state.admin?.username || 'admin', onDuty: true, scheduleLabel: '默认负责人' }];
  const currentValue = String(current || '').trim();
  const hasCurrent = rows.some((item) => item.id === currentValue);
  return [
    '<option value="">未分配</option>',
    ...(!hasCurrent && currentValue ? [`<option value="${escapeHtml(currentValue)}" selected>${escapeHtml(currentValue)}（历史负责人）</option>`] : []),
    ...rows.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === currentValue ? 'selected' : ''} ${item.active === false ? 'disabled' : ''}>${escapeHtml(item.name || item.id)}${item.onDuty ? ' · 值班中' : ' · 离班'}${item.active === false ? ' · 停用' : ''}</option>`),
  ].join('');
}

function ticketSlaConfigLine(label, rows = {}) {
  return ['urgent', 'high', 'normal', 'low']
    .map((priority) => `${label}${{ urgent: '紧急', high: '高', normal: '普通', low: '低' }[priority]} ${numberText(rows[priority] || 0)}h`)
    .join(' · ');
}

function renderTicketOpsPanel(assignees = [], slaPolicy = {}, rosterConflicts = []) {
  const active = assignees.filter((item) => item.active !== false);
  const onDuty = active.filter((item) => item.onDuty);
  return `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>客服值班与 SLA</h2>
          <div class="section-sub">负责人枚举、排班和值班状态来自配置中心，分配工单时会强制校验</div>
        </div>
        ${help('首响 SLA 只看第一条真实客服回复，分配/接单不算首响；解决 SLA 看工单是否 resolved/closed。移动端只展示用户可理解的下一步预计时间。')}
      </div>
      <div class="risk-row">
        <span class="risk-badge">负责人 ${numberText(active.length)}</span>
        <span class="risk-badge">值班中 ${numberText(onDuty.length)}</span>
        <span class="risk-badge">排班冲突 ${numberText(rosterConflicts.length)}</span>
        <span class="risk-badge">${escapeHtml(ticketSlaConfigLine('首响', slaPolicy.firstResponseSlaHours || {}))}</span>
        <span class="risk-badge">${escapeHtml(ticketSlaConfigLine('解决', slaPolicy.resolutionSlaHours || {}))}</span>
      </div>
      ${rosterConflicts.length ? `
        <div class="risk-row">
          ${rosterConflicts.slice(0, 6).map((item) => `<span class="risk-badge">${escapeHtml((item.assigneeNames || []).join(' / '))} · ${escapeHtml(item.dayLabel || '')} ${escapeHtml(item.startTime || '')}-${escapeHtml(item.endTime || '')}</span>`).join('')}
        </div>
      ` : ''}
      ${assignees.length ? tableHtml(assignees, [
        ['负责人', (item) => `<div class="cell-title">${escapeHtml(item.name || item.id)}</div><div class="cell-sub">${escapeHtml(item.id)} · ${escapeHtml(item.role || '客服')}</div>`],
        ['状态', (item) => `${tonePill(item.active === false ? '停用' : item.onDuty ? '值班中' : '离班', item.active === false ? 'bad' : item.onDuty ? 'ok' : 'warn')}`],
        ['排班', (item) => `<div class="cell-sub">${escapeHtml(item.scheduleLabel || '-')}</div>`],
      ], '暂无客服负责人') : '<div class="placeholder mini"><div><strong>暂无客服负责人</strong><div>请先在配置中心维护负责人枚举。</div></div></div>'}
    </div>
  `;
}

function minutesText(value) {
  const minutes = Number(value || 0);
  if (!Number.isFinite(minutes)) return '-';
  if (minutes <= 0) return '<1 分钟';
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  if (minutes < 24 * 60) return `${numberText(minutes / 60, 1)} 小时`;
  return `${numberText(minutes / 1440, 1)} 天`;
}

function ticketBatchActionLabel(action) {
  return {
    assign: '批量分配',
    batch_reply: '批量回复',
    closed: '批量关闭',
    priority: '批量改优先级',
    resolved: '批量标记已解决',
    reviewing: '批量转处理中',
    waiting_user: '批量等待用户',
  }[action] || action || '-';
}

function ticketKpiTone(status) {
  return status === 'bad' ? 'bad' : status === 'warn' ? 'warn' : status === 'empty' ? '' : 'ok';
}

function renderTicketKpiPeriods(kpi = {}) {
  const periods = Array.isArray(kpi.periods) ? kpi.periods : [];
  if (!periods.length) return '';
  return `
    <div class="risk-row">
      ${periods.map((period) => {
        const summary = period.summary || {};
        const tone = ticketKpiTone(period.status);
        return `
          <span class="risk-badge ${tone ? `pill ${tone}` : ''}">
            ${escapeHtml(period.label || '-')} · 首响 ${percentText(summary.firstResponseSlaRate || 0)} · 解决 ${percentText(summary.resolutionSlaRate || 0)} · ${summary.avgRating ? `${numberText(summary.avgRating, 1)}/5` : '未评分'}
          </span>
        `;
      }).join('')}
    </div>
  `;
}

function ticketQualityReviewStatusLabel(status) {
  return {
    needs_followup: '需跟进',
    pending: '待质检',
    reviewed: '已复核',
    waived: '已豁免',
  }[status] || status || '-';
}

function renderTicketQualityReviewQueue(qualityReview = {}) {
  const items = qualityReview.items || [];
  if (qualityReview.enabled === false) {
    return '<div class="placeholder mini"><div><strong>质检队列未开启</strong><div>可在配置中心开启客服质检队列。</div></div></div>';
  }
  if (!items.length) {
    return '<div class="placeholder mini"><div><strong>暂无质检项</strong><div>低分、重开、SLA 未达标等工单会自动进入这里。</div></div></div>';
  }
  return tableHtml(items.slice(0, 8), [
    ['工单', (row) => `<div class="cell-title">${escapeHtml(row.title || row.ticketId)}</div><div class="cell-sub">${escapeHtml(row.ticketId || '-')} · ${escapeHtml(row.assigneeName || '未分配')}</div>`],
    ['原因', (row) => `<div class="cell-sub clamp">${(row.reasons || []).map((item) => escapeHtml(item.label || item.key)).join(' · ')}</div><div class="cell-sub">${escapeHtml(ticketQualityReviewStatusLabel(row.status))}${row.reviewedBy ? ` · ${escapeHtml(row.reviewedBy)}` : ''}</div>`],
    ['操作', (row) => `
      <div class="actions">
        <button class="small-button" data-action="ticket-quality-review" data-ticket-id="${escapeHtml(row.ticketId)}" data-status="reviewed">已复核</button>
        <button class="small-button" data-action="ticket-quality-review" data-ticket-id="${escapeHtml(row.ticketId)}" data-status="needs_followup">需跟进</button>
        <button class="small-button ghost" data-action="ticket-quality-review" data-ticket-id="${escapeHtml(row.ticketId)}" data-status="waived">豁免</button>
      </div>
    `],
  ], '暂无质检项');
}

function ticketBatchReplyStatusLabel(status) {
  return {
    canceled: '已取消',
    pending_approval: '待审批',
    sent: '已发送',
    sent_with_errors: '部分失败',
  }[status] || status || '-';
}

function renderTicketBatchReplyApprovals(batchReplyApprovals = {}, qualityPolicy = {}) {
  const policy = qualityPolicy.batchReply || {};
  const items = batchReplyApprovals.items || [];
  return `
    <div class="notification-form">
      <label>批量回复内容<textarea id="ticketBatchReplyContent" maxlength="1000" placeholder="勾选下方工单后，在这里写批量回复内容；提交后先进入审批，不会立刻触达用户。"></textarea></label>
      <div class="notification-form-row">
        <label>回复后状态
          <select id="ticketBatchReplyStatus">
            ${ticketStatusOption('waiting_user', 'waiting_user', '等待用户')}
            ${ticketStatusOption('waiting_user', 'reviewing', '处理中')}
            ${ticketStatusOption('waiting_user', 'resolved', '已解决')}
            ${ticketStatusOption('waiting_user', 'closed', '已关闭')}
          </select>
        </label>
        <label class="inline-check notification-check"><input id="ticketBatchReplyNotify" type="checkbox" checked /> 通知用户</label>
      </div>
      <div class="notification-action-row">
        <button class="primary-button" data-action="ticket-batch-reply">${policy.requireApproval === false ? '发送批量回复' : '提交批量回复审批'}</button>
        <span class="cell-sub">单次最多 ${numberText(policy.maxTickets || 20)} 个工单</span>
      </div>
    </div>
    ${items.length ? `
      <div class="notification-template-list">
        ${items.map((row) => `
          <article class="notification-template">
            <div>
              <div class="cell-title">${escapeHtml(ticketBatchReplyStatusLabel(row.status))}</div>
              <div class="cell-sub">${escapeHtml(row.id || '-')}</div>
              <div class="cell-sub">${formatTime(row.createdAt)} · ${escapeHtml(row.createdBy || '-')}</div>
            </div>
            <div class="ticket-content">${escapeHtml(row.content || '-')}</div>
            <div class="cell-sub">${numberText(row.ticketCount || 0)} 个工单 · ${row.notifyUser === false ? '不通知' : '通知用户'} · ${numberText(row.successCount || 0)} 成功 / ${numberText(row.errorCount || 0)} 失败${row.approvedAt ? ` · ${formatTime(row.approvedAt)}` : ''}</div>
            <div class="notification-template-actions">
              ${row.status === 'pending_approval' ? `
                <button class="small-button" data-action="ticket-batch-reply-approve" data-id="${escapeHtml(row.id)}">审批发送</button>
                <button class="small-button danger" data-action="ticket-batch-reply-cancel" data-id="${escapeHtml(row.id)}">取消</button>
              ` : `<span class="risk-badge">${escapeHtml(ticketBatchReplyStatusLabel(row.status))}</span>`}
            </div>
          </article>
        `).join('')}
      </div>
    ` : '<div class="placeholder mini"><div><strong>暂无批量回复申请</strong><div>勾选工单并提交后，会在这里等待审批。</div></div></div>'}
  `;
}

function renderTicketSettlementPreview(period = {}, settlementPolicy = {}) {
  const settlement = period.settlement || {};
  const rows = Array.isArray(settlement.rows) ? settlement.rows : [];
  const currency = settlement.currency || settlementPolicy.currency || 'CNY';
  const totals = settlement.totals || {};
  if (settlement.previewEnabled === false || settlementPolicy.previewEnabled === false) {
    return '<div class="placeholder mini"><div><strong>结算预览已关闭</strong><div>可在配置中心开启后查看按负责人聚合的预估金额。</div></div></div>';
  }
  if (!rows.length) {
    return '<div class="placeholder mini"><div><strong>暂无结算预览</strong><div>工单解决、评分或重开后会自动回算。</div></div></div>';
  }
  return `
    <div class="risk-row">
      <span class="risk-badge">工单 ${numberText(totals.tickets || 0)}</span>
      <span class="risk-badge">已解决 ${numberText(totals.resolved || 0)}</span>
      <span class="risk-badge">基础 ${centsMoneyText(totals.baseCents || 0, currency)}</span>
      <span class="risk-badge">奖励 ${centsMoneyText(totals.bonusCents || 0, currency)}</span>
      <span class="risk-badge">扣减 ${centsMoneyText(totals.penaltyCents || 0, currency)}</span>
      <span class="risk-badge pill ok">预估 ${centsMoneyText(totals.estimatedCents || 0, currency)}</span>
    </div>
    ${tableHtml(rows.slice(0, 8), [
      ['负责人', (row) => `<div class="cell-title">${escapeHtml(row.assigneeName || '-')}</div><div class="cell-sub">${escapeHtml(row.assigneeId || '未分配')}</div>`],
      ['服务量', (row) => `<div>${numberText(row.tickets || 0)} 条 · 已解决 ${numberText(row.resolved || 0)}</div><div class="cell-sub">首响达标 ${numberText(row.firstResponseMet || 0)} · 好评 ${numberText(row.positiveRating || 0)} · 质检跟进 ${numberText(row.reviewNeedsFollowup || 0)}</div>`],
      ['风险', (row) => `<div>低分 ${numberText(row.lowRating || 0)} · 重开 ${numberText(row.reopen || 0)}</div><div class="cell-sub">SLA 扣减项 ${numberText(row.breachCount || 0)} · 已质检 ${numberText(row.reviewed || 0)}</div>`],
      ['预估', (row) => `<div class="cell-title">${centsMoneyText(row.estimatedCents || 0, currency)}</div><div class="cell-sub">基础 ${centsMoneyText(row.baseCents || 0, currency)} · 奖励 ${centsMoneyText(row.bonusCents || 0, currency)} · 扣减 ${centsMoneyText(row.penaltyCents || 0, currency)}</div>`],
    ], '暂无结算预览')}
  `;
}

function renderTicketServiceReport(serviceReport = {}) {
  const periods = Array.isArray(serviceReport.periods) ? serviceReport.periods : [];
  const settlementPolicy = serviceReport.settlementPolicy || {};
  if (!periods.length) return '';
  const week = periods.find((period) => period.key === 'week') || periods[0];
  const month = periods.find((period) => period.key === 'month') || periods[periods.length - 1];
  return `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>周/月服务复盘</h2>
          <div class="section-sub">按工单最近活动时间回算，结算预览不直接生成付款凭证</div>
        </div>
        ${help('近 7 天/近 30 天口径与当前 KPI 对齐；外包结算预览来自已解决工单、首响达标、好评奖励、低分、重开和 SLA 未达标扣减。生产期可再切换成自然周、自然月或外包账期。')}
      </div>
      <div class="risk-row">
        ${periods.map((period) => {
          const summary = period.quality || {};
          return `
            <span class="risk-badge">
              ${escapeHtml(period.label || '-')} · 工单 ${numberText(summary.tickets || 0)} · 首响 ${percentText(summary.firstResponseSlaRate || 0)} · 解决 ${percentText(summary.resolutionSlaRate || 0)} · 重开 ${percentText(summary.reopenRate || 0)}
            </span>
          `;
        }).join('')}
        <span class="risk-badge">${settlementPolicy.previewEnabled === false ? '结算预览关闭' : '结算预览开启'}</span>
      </div>
      <h3 class="subsection-title">${escapeHtml(week.label || '近 7 天')}结算预览</h3>
      ${renderTicketSettlementPreview(week, settlementPolicy)}
      <h3 class="subsection-title">${escapeHtml(month.label || '近 30 天')}结算预览</h3>
      ${renderTicketSettlementPreview(month, settlementPolicy)}
    </div>
  `;
}

function renderTicketQualityPanel(quality = {}, batchReview = {}, qualityKpi = {}, qualityReview = {}, batchReplyApprovals = {}, qualityPolicy = {}, serviceReport = {}) {
  const byAssignee = quality.byAssignee || [];
  const batches = batchReview.items || [];
  const targets = qualityPolicy.qualityTargets || {};
  return `
    <div class="grid two ticket-ops-insights">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>客服质量统计</h2>
            <div class="section-sub">从移动端反馈、评分、重开和后台回复实时回算，不单独维护一套数据</div>
          </div>
          ${help('首响率=已有真实客服回复的工单占比；首响达标率把已回复、已超时、已关闭但未回复的工单计入分母。KPI 目标来自配置中心。')}
        </div>
        <div class="risk-row">
          <span class="risk-badge">首响目标 ${percentText(targets.firstResponseSlaRate || 0)}</span>
          <span class="risk-badge">解决目标 ${percentText(targets.resolutionSlaRate || 0)}</span>
          <span class="risk-badge">满意度目标 ${targets.avgRating ? `${numberText(targets.avgRating, 1)}/5` : '-'}</span>
          <span class="risk-badge">重开红线 ${percentText(targets.reopenRateMax || 0)}</span>
        </div>
        ${renderTicketKpiPeriods(qualityKpi)}
        <div class="grid metrics compact-metrics">
          ${metric('首响率', percentText(quality.firstResponseRate || 0), `平均 ${minutesText(quality.avgFirstResponseMinutes)}`, '客服真实回复才算首响。')}
          ${metric('首响达标', percentText(quality.firstResponseSlaRate || 0), `${numberText(quality.firstResponseBreached || 0)} 条未达标`, '按配置中心首响 SLA 判断。')}
          ${metric('解决达标', percentText(quality.resolutionSlaRate || 0), `${numberText(quality.resolutionBreached || 0)} 条未达标`, '仅 resolved/closed 工单进入已解决达标分母，未关闭超时会单独计入未达标风险。')}
          ${metric('满意度', quality.avgRating ? `${numberText(quality.avgRating, 1)}/5` : '-', `${numberText(quality.rated || 0)} 条评分`, '用户在移动端工单结束后评分。')}
          ${metric('重开率', percentText(quality.reopenRate || 0), `${numberText(quality.reopen || 0)} 条重开`, '用户重开代表处理结果仍需复核。')}
          ${metric('未首响开放', numberText(quality.noReplyOpen || 0), `${numberText(quality.open || 0)} 条未关闭`, '开放工单中尚未产生客服回复的数量。')}
        </div>
        ${byAssignee.length ? tableHtml(byAssignee.slice(0, 8), [
          ['负责人', (row) => `<div class="cell-title">${escapeHtml(row.assigneeName || '-')}</div><div class="cell-sub">${escapeHtml(row.assigneeId || '未分配')}</div>`],
          ['工单/评分', (row) => `<div>${numberText(row.tickets)} 条 · ${row.avgRating ? `${numberText(row.avgRating, 1)}/5` : '-'}</div><div class="cell-sub">${numberText(row.open)} 未关闭 · ${numberText(row.closed)} 已结束 · 低分 ${numberText(row.lowRating || 0)}</div>`],
          ['SLA', (row) => `<div>首响 ${percentText(row.firstResponseSlaRate || 0)} · 解决 ${percentText(row.resolutionSlaRate || 0)}</div><div class="cell-sub">平均 ${minutesText(row.avgFirstResponseMinutes)} · ${row.onDuty ? '值班中' : row.assigneeId ? '离班' : '未分配'} · 重开 ${numberText(row.reopen || 0)}</div>`],
        ], '暂无负责人统计') : '<div class="placeholder mini"><div><strong>暂无客服统计</strong><div>产生工单、回复和评分后会自动沉淀。</div></div></div>'}
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>质检与批量触达</h2>
            <div class="section-sub">${numberText(qualityReview.pending || 0)} 条待质检 · ${numberText(batchReplyApprovals.pending || 0)} 条批量回复待审批</div>
          </div>
          ${help('质检队列由低分、重开、SLA 未达标等规则自动生成；批量回复必须先形成申请，审批发送后才会逐条写入客服回复并触达 App 通知中心。')}
        </div>
        <h3 class="subsection-title">质检待看</h3>
        ${renderTicketQualityReviewQueue(qualityReview)}
        <h3 class="subsection-title">批量回复审批</h3>
        ${renderTicketBatchReplyApprovals(batchReplyApprovals, qualityPolicy)}
        <h3 class="subsection-title">批量处理复盘</h3>
        ${batches.length ? tableHtml(batches, [
          ['动作', (row) => `<div class="cell-title">${escapeHtml(ticketBatchActionLabel(row.action))}</div><div class="cell-sub">${escapeHtml(row.id || '-')}</div>`],
          ['结果', (row) => `<div>${numberText(row.successCount || 0)} 成功 / ${numberText(row.errorCount || 0)} 失败</div><div class="cell-sub">${numberText(row.ticketCount || 0)} 条工单</div>`],
          ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.reason || '-')}</div>`],
          ['时间', (row) => `<div>${formatTime(row.createdAt)}</div><div class="cell-sub">${escapeHtml(row.admin || '-')}</div>`],
        ], '暂无批量动作') : '<div class="placeholder mini"><div><strong>暂无批量动作</strong><div>使用批量处理后会在这里形成复盘记录。</div></div></div>'}
      </div>
    </div>
    ${renderTicketServiceReport(serviceReport)}
  `;
}

function ticketSlaPill(ticket) {
  const label = ticket.slaState === 'overdue' ? `${ticket.slaLabel || 'SLA'}超时` : ticket.slaState === 'due_soon' ? `${ticket.slaLabel || 'SLA'}临近` : ticket.slaState === 'done' ? 'SLA 完成' : `${ticket.slaLabel || 'SLA'} ${ticket.slaHours || 72}h`;
  const tone = ticket.slaState === 'overdue' ? 'bad' : ticket.slaState === 'due_soon' ? 'warn' : 'ok';
  return `<span class="pill ${tone}">${escapeHtml(label)}</span>`;
}

function ticketDetailedSlaPills(ticket) {
  const firstTone = ticket.firstResponseSlaState === 'overdue' ? 'bad' : ticket.firstResponseSlaState === 'due_soon' ? 'warn' : ticket.firstResponseSlaState === 'done' ? 'ok' : '';
  const resolveTone = ticket.resolutionSlaState === 'overdue' ? 'bad' : ticket.resolutionSlaState === 'due_soon' ? 'warn' : ticket.resolutionSlaState === 'done' ? 'ok' : '';
  return [
    tonePill(`首响 ${ticket.firstResponseSlaHours || '-'}h`, firstTone),
    tonePill(`解决 ${ticket.resolutionSlaHours || '-'}h`, resolveTone),
  ].join(' ');
}

function renderTicketReplyTemplate(template, ticketId = '') {
  return `
    <article class="notification-template">
      <div>
        <div class="cell-title">${escapeHtml(template.name)}</div>
        <div class="cell-sub">${escapeHtml(template.nextStatus || 'waiting_user')} · ${template.notifyUser === false ? '不默认通知' : '默认通知'}</div>
      </div>
      <div class="ticket-content">${escapeHtml(template.content)}</div>
      <div class="notification-template-actions">
        <button
          class="small-button"
          data-action="ticket-reply-template-use"
          data-content="${escapeHtml(template.content || '')}"
          data-next-status="${escapeHtml(template.nextStatus || 'waiting_user')}"
          data-notify-user="${template.notifyUser === false ? 'false' : 'true'}"
          data-ticket-id="${escapeHtml(ticketId)}"
        >套用</button>
        ${template.builtin ? '<span class="risk-badge">内置</span>' : `<button class="small-button danger" data-action="ticket-reply-template-delete" data-id="${escapeHtml(template.id)}">删除</button>`}
      </div>
    </article>
  `;
}

function renderTicketCard(ticket, assignees = []) {
  const related = (ticket.relatedObjects || []).map((item) => `<span class="risk-badge">${escapeHtml(item.type)} · ${escapeHtml(item.id)}</span>`).join('');
  const satisfaction = ticket.satisfaction?.rating ? `<span class="risk-badge">满意度 ${ticket.satisfaction.rating}/5</span>` : '';
  const templates = state.cache.ticketReplyTemplates || [];
  return `
    <article class="ticket-card">
      <div class="ticket-main">
        <div class="ticket-head">
          <div class="ticket-title-block">
            <label class="inline-check ticket-batch-line"><input class="ticket-batch-check" type="checkbox" value="${escapeHtml(ticket.id)}" /> 批量</label>
            <div class="cell-title">${escapeHtml(ticket.title)}</div>
            <div class="cell-sub">${escapeHtml(ticket.id)} · ${escapeHtml(ticket.category)} · ${escapeHtml(ticket.source)}</div>
          </div>
          <div class="ticket-status-row">
            ${statusPill(ticket.status)}
            ${statusPill(ticket.priority)}
            ${ticketSlaPill(ticket)}
          </div>
        </div>
        <div class="ticket-content">${escapeHtml(ticket.content || '无反馈正文')}</div>
        <div class="moderation-meta">
          <span>用户：${escapeHtml(ticket.ownerName || '-')} ${shortPhone(ticket.phone)}</span>
          <span>联系：${escapeHtml(ticket.contact || '-')}</span>
          <span>负责人：${escapeHtml(ticket.assigneeName || ticket.assignee || '未分配')}${ticket.assigneeScheduleLabel ? ` · ${escapeHtml(ticket.assigneeScheduleLabel)}` : ''}</span>
          <span>创建：${formatTime(ticket.createdAt)}</span>
          <span>更新：${formatTime(ticket.updatedAt)}</span>
          ${ticket.slaDueAt ? `<span>${escapeHtml(ticket.slaLabel || 'SLA')}：${formatTime(ticket.slaDueAt)}</span>` : ''}
        </div>
        <div class="risk-row">
          ${related || '<span class="risk-badge">暂未关联对象</span>'}
          ${ticketDetailedSlaPills(ticket)}
          <span class="risk-badge">${ticket.noteCount || 0} 条备注</span>
          <span class="risk-badge">${ticket.replyCount || 0} 次回复</span>
          <span class="risk-badge">${ticket.attachmentCount || 0} 个附件</span>
          ${ticket.assignee && !ticket.assigneeOnDuty ? '<span class="risk-badge">负责人离班</span>' : ''}
          ${ticket.reopenCount ? `<span class="risk-badge">用户重开 ${ticket.reopenCount} 次</span>` : ''}
          ${satisfaction}
        </div>
        ${ticket.satisfaction?.comment ? `<div class="ticket-thread"><strong>满意度说明</strong><span>${escapeHtml(ticket.satisfaction.comment)}</span></div>` : ''}
        ${ticket.latestNote ? `<div class="ticket-thread"><strong>最近备注</strong><span>${escapeHtml(ticket.latestNote)}</span></div>` : ''}
        ${ticket.latestReply ? `<div class="ticket-thread"><strong>最近回复</strong><span>${escapeHtml(ticket.latestReply)}</span></div>` : ''}
      </div>
      <div class="ticket-panel">
        <div class="ticket-form-row">
          <select id="ticketAssignee-${escapeHtml(ticket.id)}">
            ${ticketAssigneeOptions(assignees, ticket.assignee || '')}
          </select>
          <button class="small-button" data-action="ticket-assign" data-id="${escapeHtml(ticket.id)}">分配</button>
        </div>
        <div class="ticket-form-row two">
          <select id="ticketStatus-${escapeHtml(ticket.id)}">
            ${ticketStatusOption(ticket.status, 'received', '新反馈')}
            ${ticketStatusOption(ticket.status, 'reviewing', '处理中')}
            ${ticketStatusOption(ticket.status, 'waiting_user', '等待用户')}
            ${ticketStatusOption(ticket.status, 'resolved', '已解决')}
            ${ticketStatusOption(ticket.status, 'closed', '已关闭')}
          </select>
          <select id="ticketPriority-${escapeHtml(ticket.id)}">
            ${ticketPriorityOption(ticket.priority, 'urgent', '紧急')}
            ${ticketPriorityOption(ticket.priority, 'high', '高')}
            ${ticketPriorityOption(ticket.priority, 'normal', '普通')}
            ${ticketPriorityOption(ticket.priority, 'low', '低')}
          </select>
          <button class="small-button" data-action="ticket-status" data-id="${escapeHtml(ticket.id)}">保存状态</button>
        </div>
        <textarea id="ticketRelated-${escapeHtml(ticket.id)}" placeholder="关联对象，每行一个：post:xxx、comment:xxx、avatar_job:xxx">${escapeHtml(formatTicketRelatedObjects(ticket.relatedObjects))}</textarea>
        <button class="small-button" data-action="ticket-related-save" data-id="${escapeHtml(ticket.id)}">保存关联对象</button>
        <textarea id="ticketNote-${escapeHtml(ticket.id)}" placeholder="内部备注：排查过程、关联对象、处理判断"></textarea>
        <button class="small-button" data-action="ticket-note" data-id="${escapeHtml(ticket.id)}">添加备注</button>
        <div class="ticket-template-chips">
          ${templates.slice(0, 6).map((template) => `
            <button
              class="small-button ghost"
              data-action="ticket-reply-template-use"
              data-content="${escapeHtml(template.content || '')}"
              data-next-status="${escapeHtml(template.nextStatus || 'waiting_user')}"
              data-notify-user="${template.notifyUser === false ? 'false' : 'true'}"
              data-ticket-id="${escapeHtml(ticket.id)}"
            >${escapeHtml(template.name)}</button>
          `).join('')}
        </div>
        <textarea id="ticketReply-${escapeHtml(ticket.id)}" placeholder="客服回复：用户会在 App 通知中心收到"></textarea>
        <select id="ticketReplyStatus-${escapeHtml(ticket.id)}">
          ${ticketStatusOption('waiting_user', 'waiting_user', '回复后等待用户')}
          ${ticketStatusOption('waiting_user', 'reviewing', '回复后处理中')}
          ${ticketStatusOption('waiting_user', 'resolved', '回复后已解决')}
          ${ticketStatusOption('waiting_user', 'closed', '回复后关闭')}
        </select>
        <label class="inline-check"><input id="ticketNotify-${escapeHtml(ticket.id)}" type="checkbox" checked /> 通知用户</label>
        <button class="small-button" data-action="ticket-reply" data-id="${escapeHtml(ticket.id)}">发送回复</button>
      </div>
    </article>
  `;
}

function notificationTargetLabel(value) {
  return {
    active_today: '今日活跃用户',
    all: '全部用户',
    audience_package: '通知人群包',
    phones: '指定手机号',
  }[value] || value || '-';
}

function notificationActionLabel(value) {
  return {
    discover: '发现',
    home: '首页',
    map: '地图',
    notifications: '通知中心',
    profile: '我的',
    safety: '安全中心',
    settings: '设置',
    supportTickets: '反馈进度',
  }[value] || '无跳转';
}

function notificationDeepLinkTypeLabel(value) {
  return {
    conversation: '会话',
    memo: '备忘',
    place: '地图地点',
    post: '宠友圈小事',
    submission: '地点提交',
    ticket: '客服工单',
    vaccine: '疫苗/驱虫计划',
  }[value] || '';
}

function notificationDeepLinkLabel(item = {}) {
  const type = item.deepLinkType || (item.postId ? 'post' : item.placeId ? 'place' : item.submissionId ? 'submission' : item.ticketId ? 'ticket' : item.conversationId ? 'conversation' : item.memoId ? 'memo' : item.vaccineId ? 'vaccine' : '');
  if (!type) return '';
  const id = item.deepLinkId || item.postId || item.placeId || item.submissionId || item.ticketId || item.conversationId || item.memoId || item.vaccineId || '';
  return `${notificationDeepLinkTypeLabel(type) || '深链'}${id ? ` · ${id}` : ''}`;
}

function notificationCampaignStatusLabel(status) {
  return {
    canceled: '已作废',
    draft: '草稿',
    failed: '失败',
    pending_approval: '待审批',
    scheduled: '已预约',
    sent: '已发送',
  }[status] || status || '-';
}

function renderNotificationTemplate(template) {
  return `
    <article class="notification-template">
      <div>
        <div class="cell-title">${escapeHtml(template.name || template.title)}</div>
        <div class="cell-sub">${escapeHtml(template.title)} · ${escapeHtml(notificationActionLabel(template.actionRoute))}</div>
      </div>
      <div class="ticket-content">${escapeHtml(template.text)}</div>
      <div class="notification-template-actions">
        <button
          class="small-button"
          data-action="notification-template-use"
          data-action-route="${escapeHtml(template.actionRoute || '')}"
          data-respect-user-settings="${template.respectUserSettings !== false ? 'true' : 'false'}"
          data-text="${escapeHtml(template.text || '')}"
          data-title="${escapeHtml(template.title || '')}"
        >套用</button>
        ${template.builtin ? '<span class="risk-badge">内置</span>' : `<button class="small-button danger" data-action="notification-template-delete" data-id="${escapeHtml(template.id)}">删除</button>`}
      </div>
    </article>
  `;
}

function renderNotificationAudiencePackage(item) {
  const samples = (item.samplePhones || item.phones || []).slice(0, 6).map(shortPhone).join('、');
  return `
    <article class="notification-template">
      <div>
        <div class="cell-title">${escapeHtml(item.name)}</div>
        <div class="cell-sub">${numberText(item.reachableCount || 0)} 可触达 / ${numberText(item.phoneCount || 0)} 手机号${item.missingCount ? ` · ${numberText(item.missingCount)} 未注册` : ''}</div>
      </div>
      ${item.description ? `<div class="ticket-content">${escapeHtml(item.description)}</div>` : ''}
      <div class="risk-row">
        ${samples ? `<span class="risk-badge">样本 ${escapeHtml(samples)}</span>` : ''}
        ${item.lastUsedAt ? `<span class="risk-badge">上次送达 ${numberText(item.lastUsedCount || 0)} · ${formatTime(item.lastUsedAt)}</span>` : '<span class="risk-badge">未发送</span>'}
      </div>
      <div class="notification-template-actions">
        <button
          class="small-button"
          data-action="notification-audience-use"
          data-audience-package-id="${escapeHtml(item.id)}"
          data-target="audience_package"
        >套用</button>
        <button class="small-button danger" data-action="notification-audience-delete" data-id="${escapeHtml(item.id)}">删除</button>
      </div>
    </article>
  `;
}

function renderNotificationCampaign(campaign) {
  const failed = (campaign.failedPhones || []).slice(0, 5).map(shortPhone).join('、');
  const phones = (campaign.targetPhones || []).length ? (campaign.targetPhones || []).slice(0, 6).map(shortPhone).join('、') : String(campaign.phonesInput || '').split(/[\s,，;；]+/).filter(Boolean).slice(0, 6).map(shortPhone).join('、');
  const canApprove = campaign.status === 'pending_approval';
  const canCancel = ['draft', 'pending_approval', 'scheduled', 'sent'].includes(campaign.status);
  const cancelLabel = campaign.status === 'sent' ? '撤回' : campaign.status === 'scheduled' ? '取消预约' : campaign.status === 'pending_approval' ? '作废审批' : '作废草稿';
  const deepLinkType = campaign.deepLinkType || (campaign.postId ? 'post' : campaign.placeId ? 'place' : campaign.submissionId ? 'submission' : campaign.ticketId ? 'ticket' : campaign.conversationId ? 'conversation' : campaign.memoId ? 'memo' : campaign.vaccineId ? 'vaccine' : '');
  const deepLinkLabel = notificationDeepLinkLabel(campaign);
  return `
    <article class="notification-campaign">
      <div class="notification-campaign-main">
        <div class="ticket-head">
          <div>
            <div class="cell-title">${escapeHtml(campaign.title)}</div>
            <div class="cell-sub">${escapeHtml(campaign.id)} · ${formatTime(campaign.createdAt)}</div>
          </div>
          <div class="ticket-status-row">
            ${statusPill(notificationCampaignStatusLabel(campaign.status))}
            ${statusPill(notificationTargetLabel(campaign.target))}
          </div>
        </div>
        <div class="ticket-content">${escapeHtml(campaign.text)}</div>
        <div class="moderation-meta">
          <span>发送人：${escapeHtml(campaign.createdBy || '-')}</span>
          ${campaign.approvalRequestedAt ? `<span>提交审批：${formatTime(campaign.approvalRequestedAt)} · ${escapeHtml(campaign.approvalRequestedBy || '-')}</span>` : ''}
          ${campaign.approvedAt ? `<span>审批：${formatTime(campaign.approvedAt)} · ${escapeHtml(campaign.approvedBy || '-')}</span>` : ''}
          ${campaign.audiencePackageName ? `<span>人群包：${escapeHtml(campaign.audiencePackageName)}</span>` : ''}
          <span>目标：${campaign.audienceCount || 0}</span>
          <span>送达：${campaign.deliveredCount || 0}</span>
          <span>Push：${numberText(campaign.pushSentCount || 0)} / ${numberText(campaign.pushAttemptedCount || 0)}${campaign.pushStatus ? ` · ${escapeHtml(campaign.pushStatus)}` : ''}</span>
          <span>回执：${numberText(campaign.pushReceiptOkCount || 0)} / ${numberText(campaign.pushReceiptAttemptedCount || 0)}${campaign.pushReceiptStatus ? ` · ${escapeHtml(campaign.pushReceiptStatus)}` : ''}</span>
          <span>已读：${numberText(campaign.readCount || 0)} / ${percentText(campaign.readRate || 0)}</span>
          <span>点击：${numberText(campaign.uniqueOpenCount || 0)} 人 · ${numberText(campaign.openCount || 0)} 次</span>
          <span>打开率：${percentText(campaign.openRate || 0)}</span>
          <span>跳转：${escapeHtml(notificationActionLabel(campaign.actionRoute))}</span>
          ${deepLinkLabel ? `<span>深链：${escapeHtml(deepLinkLabel)}</span>` : ''}
          ${campaign.scheduledAt ? `<span>预约：${formatTime(campaign.scheduledAt)}</span>` : ''}
          ${campaign.deliveredAt ? `<span>发送：${formatTime(campaign.deliveredAt)}</span>` : ''}
          ${campaign.pushCompletedAt ? `<span>Push 完成：${formatTime(campaign.pushCompletedAt)}</span>` : ''}
          ${campaign.pushReceiptLastCheckedAt ? `<span>回执检查：${formatTime(campaign.pushReceiptLastCheckedAt)}</span>` : ''}
          ${campaign.pushReceiptNextCheckAt ? `<span>下次回执：${formatTime(campaign.pushReceiptNextCheckAt)}</span>` : ''}
          ${campaign.latestOpenAt ? `<span>最近点击：${formatTime(campaign.latestOpenAt)}</span>` : ''}
          ${campaign.canceledAt ? `<span>撤回：${formatTime(campaign.canceledAt)}</span>` : ''}
          ${campaign.rateLimitSnapshot ? `<span>频控：${campaign.rateLimitSnapshot.campaignsLast24h || 0}/${campaign.rateLimitSnapshot.maxCampaignsPerDay || 0} 批</span>` : ''}
          <span>${campaign.respectUserSettings ? '尊重用户通知开关' : '重要通知强制入站'}</span>
        </div>
        <div class="risk-row">
          <span class="risk-badge">跳过 ${campaign.skippedCount || 0}</span>
          ${campaign.rateLimitedCount ? `<span class="risk-badge">频控 ${campaign.rateLimitedCount}</span>` : ''}
          ${campaign.audiencePackageName ? `<span class="risk-badge">人群包 ${escapeHtml(campaign.audiencePackageName)}</span>` : ''}
          ${deepLinkLabel ? `<span class="risk-badge">深链 ${escapeHtml(deepLinkLabel)}</span>` : ''}
          ${phones ? `<span class="risk-badge">样本 ${escapeHtml(phones)}</span>` : ''}
          ${failed ? `<span class="risk-badge">未入站 ${escapeHtml(failed)}</span>` : ''}
          ${campaign.pushFailedCount ? `<span class="risk-badge">Push 失败 ${campaign.pushFailedCount}</span>` : ''}
          ${campaign.pushInvalidTokenCount ? `<span class="risk-badge">无效 token ${campaign.pushInvalidTokenCount}</span>` : ''}
          ${campaign.pushLastError ? `<span class="risk-badge">Push：${escapeHtml(campaign.pushLastError)}</span>` : ''}
          ${campaign.pushReceiptFailedCount ? `<span class="risk-badge">回执失败 ${campaign.pushReceiptFailedCount}</span>` : ''}
          ${campaign.pushReceiptPendingCount ? `<span class="risk-badge">回执待查 ${campaign.pushReceiptPendingCount}</span>` : ''}
          ${campaign.pushReceiptLastError ? `<span class="risk-badge">回执：${escapeHtml(campaign.pushReceiptLastError)}</span>` : ''}
          ${campaign.failedReason ? `<span class="risk-badge">失败：${escapeHtml(campaign.failedReason)}</span>` : ''}
          ${campaign.approvalReason ? `<span class="risk-badge">审批说明 ${escapeHtml(campaign.approvalReason)}</span>` : ''}
          ${campaign.revokedCount ? `<span class="risk-badge">已撤回 ${campaign.revokedCount}</span>` : ''}
        </div>
        <div class="notification-campaign-actions">
          <button
            class="small-button"
            data-action="notification-campaign-use"
            data-action-route="${escapeHtml(campaign.actionRoute || '')}"
            data-audience-package-id="${escapeHtml(campaign.audiencePackageId || '')}"
            data-deep-link-id="${escapeHtml(campaign.deepLinkId || campaign.postId || campaign.placeId || campaign.submissionId || campaign.ticketId || campaign.conversationId || campaign.memoId || campaign.vaccineId || '')}"
            data-deep-link-type="${escapeHtml(deepLinkType)}"
            data-phones="${escapeHtml(campaign.phonesInput || (campaign.targetPhones || []).join('\n'))}"
            data-respect-user-settings="${campaign.respectUserSettings !== false ? 'true' : 'false'}"
            data-target="${escapeHtml(campaign.target || 'phones')}"
            data-text="${escapeHtml(campaign.text || '')}"
            data-title="${escapeHtml(campaign.title || '')}"
          >套用</button>
          ${canApprove ? `<button class="small-button" data-action="notification-approve" data-id="${escapeHtml(campaign.id)}">审批发送</button>` : ''}
          ${canCancel ? `<button class="small-button danger" data-action="notification-cancel" data-id="${escapeHtml(campaign.id)}" data-status="${escapeHtml(campaign.status)}">${cancelLabel}</button>` : ''}
        </div>
      </div>
    </article>
  `;
}

function configRevisionSummaryText(summary = {}) {
  const toggles = [
    summary.maintenanceEnabled ? '维护中' : '正常服务',
    summary.announcementEnabled ? '公告开' : '公告关',
    summary.updateEnabled ? '更新开' : '更新关',
    summary.moderationEnabled ? '审核规则开' : '审核规则关',
  ];
  return [
    `${summary.enabledFeatures || 0}/5 功能开启`,
    `图片 ${summary.petCircleMaxPhotos || 0}`,
    `半径 ${summary.discoverRadiusKm || 0}km`,
    `TTL ${summary.nearbyMomentTtlDays || 0}天`,
    `私信窗口 ${summary.messageAccessContextWindowLimit || 20}条`,
    `埋点 ${summary.analyticsEnabled === false ? '关' : `开/${summary.analyticsSampleRatePercent ?? 100}%`}`,
    `配置审批 ${summary.configApprovalRequireApproval ? `开/${summary.configApprovalExpiresHours || 24}h` : '关'}`,
    `导出审批 ${summary.exportRequireApproval ? `开/${summary.exportApprovalExpiresHours || 24}h` : '关'}`,
    `工单首响 ${summary.supportFirstResponseUrgentSlaHours ?? 1}/${summary.supportFirstResponseHighSlaHours ?? 4}h`,
    `工单解决 ${summary.supportUrgentSlaHours ?? 8}/${summary.supportHighSlaHours ?? 24}h`,
    `客服 ${summary.supportAssigneeCount ?? 0} 人`,
    `批量回复 ${summary.supportBatchReplyRequireApproval === false ? '免审批' : '审批'} / ${summary.supportBatchReplyMaxTickets ?? 20}条`,
    `客服KPI ${summary.supportQualityFirstResponseTarget ?? 90}%/${summary.supportQualityResolutionTarget ?? 85}%`,
    `结算预览 ${summary.supportSettlementPreviewEnabled === false ? '关' : centsMoneyText(summary.supportSettlementResolvedTicketCents ?? 200, 'CNY')}/已解决`,
    `通知频控 ${summary.notificationRateLimitEnabled === false ? '关' : `${summary.notificationMaxCampaignsPerDay || 0}批/${summary.notificationMaxPerUserPerDay || 0}人次`}`,
    `通知审批 ${summary.notificationRequireApproval ? '开' : '关'}`,
    ...toggles,
  ].join(' · ');
}

function configLinkageStatusPill(status, label) {
  const tone = status === 'linked' ? 'ok' : status === 'reserved' ? '' : status === 'pending' ? 'bad' : 'warn';
  return tonePill(label || status || '-', tone);
}

function renderConfigLinkage(config) {
  const linkage = config.linkage || {};
  const items = linkage.items || [];
  const summary = linkage.summary || {};
  return `
    <div class="grid metrics">
      ${metric('联动配置项', numberText(summary.total), `${numberText(summary.linked)} 项前后端联动`, '统计当前 /admin/config 返回的联动体检项。')}
      ${metric('后端强制', numberText(summary.backendEnforced), `${numberText(summary.backendOnly)} 项仅后端`, '后端强制表示接口会按配置阻断、限额、过滤或送审。')}
      ${metric('移动端消费', numberText(summary.mobileApplied), `${numberText(summary.mobileOnly)} 项仅移动端`, '移动端消费表示 App 读取 /app/config 后直接改变入口、弹窗、文案或请求参数。')}
      ${metric('预留能力', numberText(summary.reserved), '待澄清或待埋点', '预留项不会误标为已上线，方便后续继续补齐。')}
    </div>
    <div class="config-section">
      <div class="section-head compact">
        <div>
          <h2>配置联动体检</h2>
          <div class="section-sub">说明每个配置是否被后端强制、移动端消费，或只是后续预留</div>
        </div>
        ${help('这张表是配置中心的验收清单：如果配置保存后用户无感，就需要看它是移动端未消费、后端未强制，还是本来就是预留项。')}
      </div>
      ${tableHtml(items, [
        ['配置项', (item) => `<div class="cell-title">${escapeHtml(item.label)}</div><div class="cell-sub">${escapeHtml(item.key)} · ${escapeHtml(item.group)}</div>`],
        ['当前值', (item) => `<div class="cell-title">${escapeHtml(item.currentValue || '-')}</div>`],
        ['状态', (item) => `${configLinkageStatusPill(item.status, item.statusLabel)}<div class="cell-sub">后端：${item.backendEnforced ? '是' : '否'} · 移动端：${item.mobileApplied ? '是' : '否'}</div>`],
        ['用户影响', (item) => `<div class="cell-sub clamp">${escapeHtml(item.userImpact || '-')}</div>`],
        ['证据', (item) => `<div class="cell-sub clamp">后端：${escapeHtml(item.backendEvidence || '-')}</div><div class="cell-sub clamp">移动端：${escapeHtml(item.mobileEvidence || '-')}</div>`],
        ['备注', (item) => `<div class="cell-sub clamp">${escapeHtml(item.operatorNote || '-')}</div>`],
      ], '暂无配置联动记录')}
    </div>
  `;
}

function renderConfigRevisions(revisions = [], approvalRequired = false) {
  const rows = Array.isArray(revisions) ? revisions.slice(0, 12) : [];
  if (!rows.length) {
    return '<div class="placeholder"><div><strong>暂无配置版本</strong><div>保存配置后会自动生成版本快照，可用于回滚。</div></div></div>';
  }
  return tableHtml(rows, [
    ['版本', (item) => `<div class="cell-title">${escapeHtml(item.id)}</div><div class="cell-sub">${formatTime(item.createdAt)} · ${escapeHtml(item.createdBy || '-')}</div>`],
    ['类型', (item) => statusPill(item.action || 'publish')],
    ['摘要', (item) => `<div class="cell-sub">${escapeHtml(configRevisionSummaryText(item.summary || {}))}</div><div>${escapeHtml(item.reason || '-')}</div>`],
    ['操作', (item) => approvalRequired
      ? `<button class="small-button" data-action="config-rollback-approval" data-id="${escapeHtml(item.id)}">提交回滚审批</button>`
      : `<div class="actions"><button class="small-button" data-action="config-rollback-approval" data-id="${escapeHtml(item.id)}">提交审批</button><button class="small-button" data-action="config-rollback-schedule" data-id="${escapeHtml(item.id)}">预约回滚</button><button class="small-button danger" data-action="config-rollback" data-id="${escapeHtml(item.id)}">回滚到此版本</button></div>`],
  ], '暂无配置版本');
}

function configRiskPills(risks = []) {
  if (!Array.isArray(risks) || !risks.length) return '<span class="cell-sub">无高风险项</span>';
  return risks.slice(0, 4).map((risk) => tonePill(risk.severity || 'P1', risk.severity === 'P0' ? 'bad' : 'warn')).join(' ');
}

function configRiskSummary(risks = []) {
  if (!Array.isArray(risks) || !risks.length) return '<div class="cell-sub">没有命中维护模式、强制更新、功能关闭或内容安全规则等高风险项。</div>';
  return `
    <div class="gap-list compact">
      ${risks.slice(0, 6).map((risk) => `
        <div>
          <strong>${escapeHtml(risk.label || risk.key || '-')} · ${escapeHtml(risk.severity || 'P1')}</strong>
          <span>${escapeHtml(risk.before || '-')} -> ${escapeHtml(risk.after || '-')} · ${escapeHtml(risk.reason || '')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function configChangeSummaryList(changes = []) {
  if (!Array.isArray(changes) || !changes.length) return '<div class="cell-sub">暂无配置差异</div>';
  return `<div class="cell-sub clamp">${changes.slice(0, 5).map((item) => `${item.label}: ${item.before} -> ${item.after}`).join('；')}</div>`;
}

function renderConfigApprovals(approvals = {}) {
  const items = Array.isArray(approvals.items) ? approvals.items : [];
  const summary = approvals.summary || {};
  const policy = approvals.policy || {};
  return `
    <div class="config-section">
      <div class="section-head compact">
        <div>
          <h2>配置发布审批</h2>
          <div class="section-sub">${numberText(summary.pending || 0)} 条待审批 · ${policy.requireApproval ? '强制审批' : '可选审批'} · 有效期 ${numberText(policy.approvalExpiresHours || 24)} 小时</div>
        </div>
        ${help('配置审批单绑定配置快照和申请时的基线配置。审批通过前不会影响移动端；如果期间配置已经变化，审批会被后端拦截，要求重新提交。')}
      </div>
      ${items.length ? tableHtml(items, [
        ['申请', (item) => `<div class="cell-title">${escapeHtml(item.actionLabel || item.action || '-')}</div><div class="cell-sub">${formatTime(item.createdAt)} · ${escapeHtml(item.createdBy || '-')}</div><div class="cell-sub">${escapeHtml(item.sourceDraftId || item.sourceRevisionId || item.id)}</div>`],
        ['状态', (item) => `${statusPill(item.statusLabel || item.status)}<div class="cell-sub">${item.expiresAt ? `有效至 ${formatTime(item.expiresAt)}` : '-'}</div>`],
        ['风险', (item) => `${configRiskPills(item.riskChanges)}<div class="cell-sub clamp">${escapeHtml(item.reason || '-')}</div>`],
        ['变更摘要', (item) => configChangeSummaryList(item.changeSummary)],
        ['风险详情', (item) => configRiskSummary(item.riskChanges)],
        ['操作', (item) => item.status === 'pending_approval' ? `
          <div class="actions">
            <button class="small-button" data-action="config-approval-approve" data-id="${escapeHtml(item.id)}">审批并发布</button>
            <button class="small-button danger" data-action="config-approval-cancel" data-id="${escapeHtml(item.id)}">取消</button>
          </div>
        ` : `<div class="cell-sub">${escapeHtml(item.revisionId || item.approvalReason || '-')}</div>`],
      ], '暂无配置审批') : '<div class="placeholder mini"><div><strong>暂无配置审批</strong><div>提交发布、草稿发布或回滚审批后，会在这里等待处理。</div></div></div>'}
    </div>
  `;
}

function renderConfigSchedules(schedules = {}) {
  const items = Array.isArray(schedules.items) ? schedules.items : [];
  const summary = schedules.summary || {};
  return `
    <div class="config-section">
      <div class="section-head compact">
        <div>
          <h2>配置预约发布</h2>
          <div class="section-sub">${numberText(summary.scheduled || 0)} 条待发布 · 下一个：${summary.nextScheduledAt ? formatTime(summary.nextScheduledAt) : '-'}</div>
        </div>
        ${help('预约发布会锁定创建预约时的配置基线。到点前如果当前配置已经变化，后端会把预约标记为发布失败，避免旧配置覆盖新配置。')}
      </div>
      ${items.length ? tableHtml(items, [
        ['预约', (item) => `<div class="cell-title">${escapeHtml(item.actionLabel || item.action || '-')}</div><div class="cell-sub">${formatTime(item.scheduledAt)} · ${escapeHtml(item.createdBy || '-')}</div><div class="cell-sub">${escapeHtml(item.sourceDraftId || item.sourceRevisionId || item.id)}</div>`],
        ['状态', (item) => `${statusPill(item.statusLabel || item.status)}<div class="cell-sub">${item.publishedAt ? `发布：${formatTime(item.publishedAt)}` : item.failureReason || item.cancelReason || '-'}</div>`],
        ['风险', (item) => `${configRiskPills(item.riskChanges)}<div class="cell-sub clamp">${escapeHtml(item.reason || '-')}</div>`],
        ['变更摘要', (item) => configChangeSummaryList(item.changeSummary)],
        ['风险详情', (item) => configRiskSummary(item.riskChanges)],
        ['操作', (item) => item.status === 'scheduled'
          ? `<button class="small-button danger" data-action="config-schedule-cancel" data-id="${escapeHtml(item.id)}">取消预约</button>`
          : `<div class="cell-sub">${escapeHtml(item.revisionId || item.failureReason || item.cancelReason || '-')}</div>`],
      ], '暂无配置预约') : '<div class="placeholder mini"><div><strong>暂无配置预约</strong><div>选择预约发布时间后，可以把当前配置、草稿或回滚版本安排到未来生效。</div></div></div>'}
    </div>
  `;
}

function renderConfigGovernance(config = {}) {
  const drafts = Array.isArray(config.drafts) ? config.drafts : [];
  const activeDrafts = drafts.filter((draft) => draft.status === 'draft');
  const governance = config.governance || {};
  const approvals = config.approvals || {};
  const schedules = config.schedules || {};
  const approvalRequired = Boolean(config.configApproval?.requireApproval || governance.approvalRequired);
  return `
    <div class="grid metrics">
      ${metric('待发布草稿', numberText(governance.activeDrafts ?? activeDrafts.length), '不会影响 /app/config', '草稿只保存在后台，发布后才会生成版本并影响移动端。')}
      ${metric('高风险草稿', numberText(governance.highRiskDrafts || 0), 'P0 需重点复核', '维护模式、强制更新、内容安全总开关和机审开关属于高风险配置。')}
      ${metric('发布保护', '已启用', 'P0/P1 需确认文案', `命中高风险配置时，需要输入“${escapeHtml(governance.highRiskConfirmText || CONFIG_HIGH_RISK_CONFIRM_TEXT)}”才能发布。`)}
      ${metric('发布审批', approvalRequired ? '强制' : '可选', `${numberText(approvals.summary?.pending || governance.pendingApprovals || 0)} 条待审批`, '强制开启后，立即发布、发布草稿和回滚版本都会先进入审批单，审批通过后才更新 /app/config。')}
      ${metric('预约发布', numberText(schedules.summary?.scheduled || governance.scheduledPublishes || 0), governance.nextScheduledAt ? formatTime(governance.nextScheduledAt) : '暂无预约', '预约发布会在到点后更新 /app/config；如果当前配置已变化，预约会失败并要求重新创建。')}
      ${metric('最近草稿', governance.latestDraftAt ? formatTime(governance.latestDraftAt) : '-', '配置治理记录', '用于确认是否有人保存了待发布变更。')}
      ${metric('版本历史', numberText((config.revisions || []).length), '可回滚', '发布和回滚都会生成配置版本快照。')}
    </div>
    <div class="config-section">
      <div class="section-head compact">
        <div>
          <h2>配置发布治理</h2>
          <div class="section-sub">草稿不会影响移动端；发布后下一次 /app/config 拉取生效</div>
        </div>
        ${help('建议高风险改动先保存草稿，由运营复核影响摘要后再发布。当前单 admin 版本会强制输入确认文案并写审计，双人审批后续可接在同一个入口上。')}
      </div>
      ${activeDrafts.length ? tableHtml(activeDrafts.slice(0, 8), [
        ['草稿', (draft) => `<div class="cell-title">${escapeHtml(draft.id)}</div><div class="cell-sub">${formatTime(draft.updatedAt || draft.createdAt)} · ${escapeHtml(draft.createdBy || '-')}</div>`],
        ['风险', (draft) => `${configRiskPills(draft.riskChanges)}<div class="cell-sub">${escapeHtml(draft.reason || '-')}</div>`],
        ['变更摘要', (draft) => configChangeSummaryList(draft.changeSummary)],
        ['风险详情', (draft) => configRiskSummary(draft.riskChanges)],
        ['操作', (draft) => `
          <div class="actions">
            ${approvalRequired ? `<button class="small-button" data-action="config-draft-approval" data-id="${escapeHtml(draft.id)}">提交审批</button>` : `<button class="small-button" data-action="config-draft-approval" data-id="${escapeHtml(draft.id)}">提交审批</button><button class="small-button" data-action="config-draft-publish" data-id="${escapeHtml(draft.id)}">发布草稿</button>`}
            ${approvalRequired ? '' : `<button class="small-button" data-action="config-draft-schedule" data-id="${escapeHtml(draft.id)}">预约发布</button>`}
            <button class="small-button danger" data-action="config-draft-discard" data-id="${escapeHtml(draft.id)}">废弃</button>
          </div>
        `],
      ], '暂无配置草稿') : '<div class="placeholder"><div><strong>暂无待发布草稿</strong><div>可以先保存草稿复核风险，再发布到移动端配置。</div></div></div>'}
    </div>
    ${renderConfigSchedules(schedules)}
    ${renderConfigApprovals(approvals)}
  `;
}

function aiPromptVersionStatusCell(row) {
  const status = row.current ? '当前线上' : row.statusLabel || row.status || '-';
  const tone = row.current ? 'ok' : row.status === 'archived' ? 'warn' : '';
  return `${tonePill(status, tone)}<div class="cell-sub">${escapeHtml(row.sourceLabel || '-')}</div>`;
}

function renderAiPromptVersionLibrary(data = {}, gptImage2 = {}) {
  const rows = Array.isArray(data.items) ? data.items : [];
  const summary = data.summary || {};
  const current = data.current || {};
  return `
    <div class="config-section prompt-version-panel">
      <div class="section-head compact">
        <div>
          <h2>GPT Image 2 Prompt 版本库</h2>
          <div class="section-sub">候选版本不会直接影响移动端；生成配置草稿并发布后，新生成任务才会使用该版本</div>
        </div>
        ${help('这是一条从样本池到配置中心的治理链路：样本沉淀问题，Prompt 候选沉淀方案，配置草稿负责发布前复核，最终移动端生成任务记录 promptVersion 和 hash，方便按结果反查。')}
      </div>
      <div class="grid metrics">
        ${metric('候选版本', numberText(summary.candidate || 0), `${numberText(summary.all || 0)} 个总版本`, '包含手动创建、从当前线上存档和基于样本池沉淀的 Prompt 候选。')}
        ${metric('已生成草稿', numberText(summary.drafted || 0), '仍需发布才生效', '生成配置草稿不会改变 /app/config，也不会影响移动端新任务。')}
        ${metric('样本关联', numberText(summary.sampleLinked || 0), '来自 AI 样本池', '关联样本 ID 便于回看真实反馈、素材问题或供应商异常。')}
        ${metric('线上 Prompt', current.promptVersion || gptImage2.promptVersion || '-', `hash ${current.promptHash || '-'}`, '当前真正会被后端生成任务读取的配置版本。')}
      </div>
      <div class="config-grid">
        <label>候选名称<input id="aiPromptVersionName" maxlength="80" placeholder="例如 3D透明底-v3" /></label>
        <label>关联样本 ID<input id="aiPromptVersionSampleIds" maxlength="800" placeholder="可粘贴 AI 样本池 ID，逗号分隔" /></label>
        <label class="wide">候选备注<textarea id="aiPromptVersionNote" maxlength="500" placeholder="说明要解决的问题，例如格子背景、宠物不像、视频底色等"></textarea></label>
      </div>
      <div class="toolbar moderation-toolbar ai-toolbar">
        <div class="toolbar-left">
          <label>状态
            <select id="aiPromptStatus">
              ${option('all', '全部', state.aiPromptStatus)}
              ${option('candidate', '候选中', state.aiPromptStatus)}
              ${option('drafted', '已生成草稿', state.aiPromptStatus)}
              ${option('archived', '已归档', state.aiPromptStatus)}
            </select>
          </label>
          <label>搜索<input id="aiPromptQ" placeholder="版本名、ID、hash、样本ID" value="${escapeHtml(state.aiPromptQ)}" /></label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="ai-prompt-save-candidate">保存当前编辑为候选</button>
          <button class="small-button ghost" data-action="ai-prompt-save-current">存档当前线上 Prompt</button>
          <button class="small-button ghost" data-action="ai-prompt-filter">筛选</button>
          <button class="small-button ghost" data-action="ai-prompt-clear">清空</button>
        </div>
      </div>
      ${tableHtml(rows, [
        ['版本', (row) => `<div class="cell-title">${escapeHtml(row.name || row.id)}</div><div class="cell-sub">${escapeHtml(row.id)}</div>`],
        ['状态', aiPromptVersionStatusCell],
        ['Prompt', (row) => `<div>hash ${escapeHtml(row.promptHash || '-')}</div><div class="cell-sub">${numberText(row.promptLength || 0)} 字 / ${numberText(row.promptLineCount || 0)} 行</div><div class="cell-sub clamp">${escapeHtml(row.note || '-')}</div>`],
        ['样本', (row) => `<div>${numberText(row.sampleCount || 0)} 个样本</div><div class="cell-sub clamp">${escapeHtml((row.sampleIds || []).join(', ') || '-')}</div>`],
        ['草稿', (row) => `<div>${escapeHtml(row.lastDraftId || '-')}</div><div class="cell-sub">${row.lastDraftAt ? formatTime(row.lastDraftAt) : '-'}</div>`],
        ['操作', (row) => row.status === 'archived' ? `<div class="cell-sub">${escapeHtml(row.archiveReason || '已归档')}</div>` : `
          <div class="actions">
            <button class="small-button" data-action="ai-prompt-draft" data-id="${escapeHtml(row.id)}">生成配置草稿</button>
            <button class="small-button danger" data-action="ai-prompt-archive" data-id="${escapeHtml(row.id)}">归档</button>
          </div>
        `],
      ], '暂无 Prompt 候选版本')}
    </div>
  `;
}

async function renderNotifications(force) {
  const data = await load('notifications', '/admin/notifications', force);
  const summary = data.summary || {};
  const audiencePackages = data.audiencePackages || [];
  const campaigns = data.campaigns || [];
  const devices = data.devices || [];
  const rateLimit = data.rateLimit || {};
  const templates = data.templates || [];
  const approvalRequired = Boolean(summary.approvalRequired);
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('发送批次', summary.campaigns || 0, '系统通知历史', '每次后台发送系统通知都会形成一条发送记录，并写入审计日志。')}
      ${metric('通知已读', numberText(summary.reads || 0), `${percentText(summary.readRate || 0)} 已读率`, '按系统通知批次写入 App 通知中心后的 read 状态回算，撤回后当前站内通知会减少。')}
      ${metric('通知点击', numberText(summary.opens || 0), `${percentText(summary.openRate || 0)} 打开率`, '来自移动端 notification.open 事件；点击率按系统通知批次的去重点击人数 / 送达数计算。')}
      ${metric('用户总数', summary.users || 0, `${summary.activeToday || 0} 今日活跃`, '“今日活跃用户”目标按 lastSeenAt 近 24 小时计算。')}
      ${metric('推送设备', summary.devices || 0, summary.pushEnabled ? 'Expo Push 已启用' : 'Expo Push 未启用', '用户授权通知后登记设备 token；系统通知可通过 Expo Push 下发，失败 token 会被标记。')}
      ${metric('Push 下发', numberText(summary.pushSent || 0), `${numberText(summary.pushAttempted || 0)} 尝试 · ${percentText(summary.pushSuccessRate || 0)}`, '统计系统通知发起的 Expo Push ticket 结果；不等同于用户点击或最终展示。')}
      ${metric('Push 回执', numberText(summary.pushReceiptOk || 0), `${numberText(summary.pushReceiptAttempted || 0)} 已核验 · ${numberText(summary.pushReceiptPending || 0)} 待查 · ${percentText(summary.pushReceiptSuccessRate || 0)}`, '统计 Expo 向 FCM/APNs 交付后的 receipt 结果；仍不等同于用户实际点击。')}
      ${metric('人群包', summary.audiencePackages || audiencePackages.length, '灰度触达', '保存测试手机号、灰度用户和补偿用户，发送时按当前注册用户重新计算可触达范围。')}
      ${metric('待处理', (summary.drafts || 0) + (summary.scheduled || 0) + (summary.pendingApprovals || 0), `${summary.drafts || 0} 草稿 · ${summary.pendingApprovals || 0} 审批 · ${summary.scheduled || 0} 预约`, '草稿和待审批通知不会触达用户；审批通过后才会写入 App 通知中心或转为预约。')}
      ${metric('审批保护', approvalRequired ? '已开启' : '未开启', approvalRequired ? '直接发送会被拦截' : '可直接发送', '开启后，立即发送和预约发送必须先提交审批，审批通过才触达移动端。')}
      ${metric('频控余量', rateLimit.enabled === false ? '未开启' : numberText(rateLimit.remainingCampaigns || 0), `24h ${numberText(rateLimit.campaignsLast24h || 0)}/${numberText(rateLimit.maxCampaignsPerDay || 0)} 批`, '系统通知发送前会检查 24 小时滚动窗口，超过批次上限会被后端拒绝入站。')}
      ${metric('单用户频控', rateLimit.enabled === false ? '未开启' : `${numberText(rateLimit.maxPerUserPerDay || 0)}/24h`, '超限用户会被跳过', '避免同一用户在一天内被运营系统通知反复打扰；审核、工单、处罚等业务通知不计入这个营销频控。')}
    </div>

    <div class="grid two notification-workspace">
      <div class="card notification-compose">
        <div class="section-head">
          <div>
            <h2>发送系统通知</h2>
            <div class="section-sub">发送后会写入用户 App 通知中心；重要通知可不受用户通知开关影响</div>
          </div>
          ${help('建议只把产品公告、维护提醒、安全提醒放在这里。营销类消息默认尊重用户通知开关。')}
        </div>
        <div class="notification-form">
          <label>模板名称<input id="notifyTemplateName" maxlength="32" placeholder="保存为模板时使用，例如：维护提醒" /></label>
          <label>通知标题<input id="notifyTitle" maxlength="48" placeholder="例如：今晚 23:30 服务维护" /></label>
          <label>通知内容<textarea id="notifyText" maxlength="240" placeholder="用用户能直接理解的话说明发生了什么、影响什么、是否需要操作。"></textarea></label>
          <div class="notification-form-row">
            <label>目标范围
              <select id="notifyTarget">
                <option value="all">全部用户</option>
                <option value="active_today">今日活跃用户</option>
                <option value="audience_package">通知人群包</option>
                <option value="phones">指定手机号</option>
              </select>
            </label>
            <label>点击跳转
              <select id="notifyActionRoute">
                <option value="">无跳转</option>
                <option value="home">首页</option>
                <option value="discover">发现</option>
                <option value="map">地图</option>
                <option value="profile">我的</option>
                <option value="safety">安全中心</option>
                <option value="settings">设置</option>
                <option value="notifications">通知中心</option>
                <option value="supportTickets">反馈进度</option>
              </select>
            </label>
          </div>
          <div class="notification-form-row">
            <label>深链类型
              <select id="notifyDeepLinkType">
                <option value="">不指定对象</option>
                <option value="post">宠友圈小事</option>
                <option value="place">地图地点</option>
                <option value="submission">地点提交</option>
                <option value="ticket">客服工单</option>
                <option value="conversation">会话</option>
                <option value="memo">备忘</option>
                <option value="vaccine">疫苗/驱虫计划</option>
              </select>
            </label>
            <label>对象 ID<input id="notifyDeepLinkId" maxlength="96" placeholder="例如 moment-xxx、place-001、ticket-xxx" /></label>
          </div>
          <label>通知人群包
            <select id="notifyAudiencePackageId">
              <option value="">请选择已保存的人群包</option>
              ${audiencePackages.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${numberText(item.reachableCount || 0)} 可触达</option>`).join('')}
            </select>
          </label>
          <label>指定手机号<textarea id="notifyPhones" placeholder="多个手机号可用换行、逗号或空格分隔；目标范围不是“指定手机号”时可留空。"></textarea></label>
          <label>预约发送时间<input id="notifyScheduledAt" type="datetime-local" /></label>
          <label class="inline-check notification-check"><input id="notifyRespectSettings" type="checkbox" checked /> 尊重用户通知开关</label>
          <div class="notification-action-row">
            <button class="primary-button" data-action="${approvalRequired ? 'submit-notification-approval' : 'send-notification'}">${approvalRequired ? '提交审批' : '立即发送'}</button>
            ${approvalRequired ? '' : '<button class="small-button" data-action="submit-notification-approval">提交审批</button>'}
            <button class="small-button" data-action="${approvalRequired ? 'submit-notification-schedule-approval' : 'schedule-notification'}">${approvalRequired ? '预约审批' : '预约发送'}</button>
            <button class="small-button" data-action="save-notification-draft">保存草稿</button>
            <button class="small-button" data-action="notification-template-save">保存模板</button>
          </div>
        </div>
      </div>

      <div class="card notification-guide">
        <div class="section-head">
          <div>
            <h2>模板与发送前检查</h2>
            <div class="section-sub">模板可一键套用；系统通知会先落 App 通知中心，启用后同步下发 Expo Push 并轮询回执</div>
          </div>
        </div>
        <div class="notification-template-list">
          ${templates.length ? templates.map(renderNotificationTemplate).join('') : '<div class="placeholder mini"><div><strong>暂无模板</strong><div>可把常用标题和正文保存为模板。</div></div></div>'}
        </div>
        <div class="section-head compact">
          <div>
            <h2>灰度人群包</h2>
            <div class="section-sub">保存常用手机号集合，适合灰度、补偿、定向回访</div>
          </div>
        </div>
        <div class="notification-form">
          <div class="notification-form-row">
            <label>人群包名称<input id="notifyAudienceName" maxlength="32" placeholder="例如：安卓灰度测试用户" /></label>
            <label>备注<input id="notifyAudienceDescription" maxlength="120" placeholder="例如：7 月第一批体验用户" /></label>
          </div>
          <label>手机号清单<textarea id="notifyAudiencePhones" placeholder="多个手机号可用换行、逗号或空格分隔。"></textarea></label>
          <div class="notification-action-row">
            <button class="small-button" data-action="notification-audience-save">保存人群包</button>
          </div>
        </div>
        <div class="notification-template-list">
          ${audiencePackages.length ? audiencePackages.map(renderNotificationAudiencePackage).join('') : '<div class="placeholder mini"><div><strong>暂无人群包</strong><div>保存后可在发送表单中选择“通知人群包”。</div></div></div>'}
        </div>
        <div class="notification-rules">
          <div><strong>全部用户</strong><span>适合维护、停服、重要版本提醒。</span></div>
          <div><strong>今日活跃</strong><span>适合短时运营提醒，减少打扰沉默用户。</span></div>
          <div><strong>通知人群包</strong><span>适合灰度测试、补偿和定向回访，发送时只触达已注册手机号。</span></div>
          <div><strong>指定手机号</strong><span>适合客服、灰度验证、单用户补偿通知。</span></div>
          <div><strong>深链对象</strong><span>可指定小事、地点、工单、备忘等对象 ID；后端会校验对象存在，移动端优先打开具体对象。</span></div>
          <div><strong>强制入站</strong><span>仅用于安全、封禁、维护等必须告知的信息。</span></div>
          <div><strong>草稿/预约</strong><span>草稿只保留在后台；预约到点后自动写入目标用户通知中心。</span></div>
          <div><strong>发送审批</strong><span>提交审批不会触达用户；审批通过后才会立即发送或转为预约。</span></div>
          <div><strong>频控保护</strong><span>配置中心可限制 24 小时批次数和单用户入站次数，超限会跳过或失败。</span></div>
        </div>
      </div>
    </div>

    <div class="grid two notification-workspace">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>发送历史</h2>
            <div class="section-sub">最近 200 条系统通知发送记录</div>
          </div>
        </div>
        ${campaigns.length ? `<div class="notification-history">${campaigns.map(renderNotificationCampaign).join('')}</div>` : '<div class="placeholder"><div><strong>暂无系统通知</strong><div>发送后会在这里看到批次、目标和送达统计。</div></div></div>'}
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>最近设备</h2>
            <div class="section-sub">设备 token、最近 Push 状态和失效标记</div>
          </div>
        </div>
        ${devices.length ? tableHtml(devices.slice(0, 8), [
          ['用户', (d) => `<div>${escapeHtml(d.ownerName || '-')}</div><div class="cell-sub">${shortPhone(d.phone)}</div>`],
          ['平台', (d) => statusPill(d.platform)],
          ['Token', (d) => `<span class="cell-sub">...${escapeHtml(d.tokenTail || '-')}</span>`],
          ['状态', (d) => `${statusPill(d.enabled === false ? '已失效' : d.lastPushStatus || '可用')}<div class="cell-sub">${escapeHtml(d.lastPushError || d.disabledReason || '-')}</div><div class="cell-sub">回执：${escapeHtml(d.lastPushReceiptStatus || '-')} ${d.lastPushReceiptAt ? '· ' + formatTime(d.lastPushReceiptAt) : ''}</div>`],
          ['更新', (d) => formatTime(d.updatedAt)],
        ]) : '<div class="placeholder"><div><strong>暂无设备</strong><div>用户授权通知后，App 会登记设备 token。</div></div></div>'}
      </div>
    </div>
  `;
}

async function renderConfig(force) {
  const promptQuery = new URLSearchParams({
    q: state.aiPromptQ,
    status: state.aiPromptStatus,
    target: 'avatar_gpt_image2',
  });
  const [config, aiPromptVersions] = await Promise.all([
    load('config', '/admin/config', force),
    load('aiPromptVersions', `/admin/ai/prompt-versions?${promptQuery.toString()}`, force),
  ]);
  const ai = config.ai || {};
  const aiAvatarAnimation = ai.avatarAnimation || {};
  const aiAvatarAnimationSeedance = aiAvatarAnimation.seedance || {};
  const aiAvatar = ai.avatar || {};
  const aiAvatarFailureRefund = ai.avatarFailureRefund || {};
  const aiAvatarGptImage2 = aiAvatar.gptImage2 || {};
  const aiAvatarFlux = aiAvatar.ttapiFlux || {};
  const aiAvatarMidjourney = aiAvatar.ttapiMidjourney || {};
  const aiPetChat = ai.petChat || {};
  const aiPetChatDeepSeek = aiPetChat.deepseek || {};
  const announcement = config.app?.announcement || {};
  const configApproval = config.configApproval || {};
  const contentSafety = config.contentSafety || {};
  const exportsConfig = config.exports || {};
  const moderation = config.moderation || {};
  const moderationPublicHint = moderation.publicHint || {};
  const notifications = config.notifications || {};
  const placesConfig = config.places || {};
  const placesPublicReviews = placesConfig.publicReviews || {};
  const revisions = config.revisions || [];
  const socialMessageAccess = config.social?.messageAccess || {};
  const splash = config.app?.splash || {};
  const support = config.support || {};
  const supportFirstResponseSlaHours = support.firstResponseSlaHours || {};
  const supportSlaHours = support.resolutionSlaHours || support.slaHours || {};
  const supportAssignees = support.assignees || [];
  const supportBatchReply = support.batchReply || {};
  const supportQualityReview = support.qualityReview || {};
  const supportQualityTargets = support.qualityTargets || {};
  const supportSettlement = support.settlement || {};
  const analytics = config.analytics || {};
  const experiments = config.experiments || {};
  const homeAiEntryExperiment = experiments.homeAiEntry || {};
  const update = config.app?.update || {};
  $('content').innerHTML = `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>移动端联动配置</h2>
          <div class="section-sub">发布后，移动端下次启动会读取 /app/config 并影响对应功能</div>
        </div>
        ${help('当前第一版已接入：图片上限、附近半径、附近小事有效天数、AI 额度、功能开关、事件埋点、维护、公告、版本更新、启动提示和内容安全规则。')}
      </div>
      ${renderConfigGovernance(config)}
      ${renderConfigLinkage(config)}
      <div class="config-grid">
        <label>宠友圈图片上限<input id="cfgPetCircleMaxPhotos" type="number" min="1" max="9" value="${config.social.petCircleMaxPhotos}" /></label>
        <label>附近默认半径 km<input id="cfgDiscoverRadiusKm" type="number" min="1" max="20" value="${config.social.discoverRadiusKm}" /></label>
        <label>附近小事有效天数<input id="cfgNearbyMomentTtlDays" type="number" min="1" max="90" value="${config.social.nearbyMomentTtlDays}" /></label>
        <label>灵伴形象每日额度<input id="cfgPetAvatarDailyLimit" type="number" min="0" max="1000" value="${config.ai.petAvatarDailyLimit}" /></label>
        <label>AI 对话每日额度<input id="cfgPetChatDailyLimit" type="number" min="0" max="1000" value="${config.ai.petChatDailyLimit}" /></label>
        <label>维护提示<input id="cfgMaintenanceMessage" value="${escapeHtml(config.app.maintenanceMessage || '')}" /></label>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>私信上下文查看策略</h2>
            <div class="section-sub">控制关系消息/举报排查时能查看多少最近私信，以及是否必须留下查看原因</div>
          </div>
          ${help('这里不开放任意私信全文检索。后台只能在已有举报或关系消息排查中查看最近窗口；查看动作会写审计，隐藏私信会同步影响双方移动端会话列表和消息列表。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgMessageAccessRequireReason', '查看私信上下文必须填写原因', socialMessageAccess.requireReason !== false)}
          <div class="switch-row"><span>任意私信全文检索</span>${statusPill('未开放')}</div>
          <div class="switch-row"><span>审批模式</span><strong>单 admin 审计自审批</strong></div>
        </div>
        <div class="config-grid">
          <label>最近消息窗口条数<input id="cfgMessageAccessContextWindowLimit" type="number" min="5" max="50" value="${Number.isFinite(Number(socialMessageAccess.contextWindowLimit)) ? socialMessageAccess.contextWindowLimit : 20}" /></label>
          <label>审计保留标记天数<input id="cfgMessageAccessRetentionDays" type="number" min="7" max="365" value="${Number.isFinite(Number(socialMessageAccess.retentionDays)) ? socialMessageAccess.retentionDays : 180}" /></label>
          <label>全文检索状态<input disabled value="未开放，生产期如需启用须另走双人审批设计" /></label>
        </div>
      </div>
      <div class="switch-panel">
        ${featureCheckbox('cfgFeaturePetCircle', '宠友圈', config.features.petCircle)}
        ${featureCheckbox('cfgFeaturePlaces', '地图地点', config.features.places)}
        ${featureCheckbox('cfgFeatureAiAvatar', 'AI 灵伴形象', config.features.aiAvatar)}
        ${featureCheckbox('cfgFeaturePetChat', 'AI 宠物对话', config.features.petChat)}
        ${featureCheckbox('cfgFeatureWalkInvite', '约遛邀请', config.features.walkInvite)}
        ${featureCheckbox('cfgMaintenanceEnabled', '维护模式', config.app.maintenanceEnabled)}
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>地点贡献身份</h2>
            <div class="section-sub">控制用户在移动端“我的”页是否展示地点共建者徽章</div>
          </div>
          ${help('地点审核通过后已经会记录贡献分。这里控制是否把“自己的贡献身份”公开给用户本人；当前不做排行榜、兑换和活动奖励，避免把运营账本误解成现金或余额。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgPlaceContributionBadgesEnabled', '展示地点共建者徽章', Boolean(placesConfig.contributionBadgesEnabled))}
        </div>
        <div class="config-grid">
          <label>展示最低贡献分<input id="cfgPlaceContributionBadgeMinPoints" type="number" min="1" max="1000" value="${Number.isFinite(Number(placesConfig.contributionBadgeMinPoints)) ? placesConfig.contributionBadgeMinPoints : 1}" /></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>地点公开点评</h2>
            <div class="section-sub">控制 App 地点详情公开点评的排序、图片过滤和首屏展示数量</div>
          </div>
          ${help('这里会同时影响后端 /places/{id}/reviews 的返回口径和移动端地点详情的展示条数。超过首屏条数时，移动端会展示“查看更多/收起”，最多展开到后端返回上限。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgPlaceReviewRequirePhotos', '只展示带图片点评', Boolean(placesPublicReviews.requirePhotos))}
          <div class="switch-row"><span>移动端“查看更多”</span>${tonePill('已接入', 'ok')}</div>
        </div>
        <div class="config-grid">
          <label>公开点评排序
            <select id="cfgPlaceReviewSort">
              ${configProviderOption(placesPublicReviews.sort || 'newest', 'newest', '最新优先')}
              ${configProviderOption(placesPublicReviews.sort || 'newest', 'oldest', '最早优先')}
              ${configProviderOption(placesPublicReviews.sort || 'newest', 'with_photos_first', '有图优先')}
            </select>
          </label>
          <label>后端最多返回条数<input id="cfgPlaceReviewApiLimit" type="number" min="3" max="50" value="${Number.isFinite(Number(placesPublicReviews.apiLimit)) ? placesPublicReviews.apiLimit : 20}" /></label>
          <label>详情页首屏展示条数<input id="cfgPlaceReviewDetailDisplayLimit" type="number" min="1" max="12" value="${Number.isFinite(Number(placesPublicReviews.detailDisplayLimit)) ? placesPublicReviews.detailDisplayLimit : 3}" /></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>实验和灰度分流</h2>
            <div class="section-sub">控制首页 AI 对话入口文案实验，移动端按手机号稳定分桶并回收曝光事件</div>
          </div>
          ${help('当前先落一条真实联动实验：/app/config 下发 experiments.homeAiEntry，App 端按实验 ID + 手机号稳定分桶，命中后改变首页两个 AI 对话入口文案，并上报 config.experiment_exposure。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgExperimentHomeAiEntryEnabled', '启用首页 AI 入口实验', Boolean(homeAiEntryExperiment.enabled))}
        </div>
        <div class="config-grid">
          <label>实验 ID<input id="cfgExperimentHomeAiEntryId" maxlength="80" value="${escapeHtml(homeAiEntryExperiment.id || 'home_ai_entry_copy_v1')}" /></label>
          <label>实验名称<input id="cfgExperimentHomeAiEntryName" maxlength="40" value="${escapeHtml(homeAiEntryExperiment.name || '首页 AI 对话入口文案')}" /></label>
          <label>参与流量 %<input id="cfgExperimentHomeAiEntryRollout" type="number" min="0" max="100" value="${Number.isFinite(Number(homeAiEntryExperiment.rolloutPercent)) ? homeAiEntryExperiment.rolloutPercent : 100}" /></label>
          <label>B 组比例 %<input id="cfgExperimentHomeAiEntryVariantB" type="number" min="0" max="100" value="${Number.isFinite(Number(homeAiEntryExperiment.variantBPercent)) ? homeAiEntryExperiment.variantBPercent : 50}" /></label>
          <label>A 组标题<input id="cfgExperimentHomeAiEntryControlTitle" maxlength="32" value="${escapeHtml(homeAiEntryExperiment.controlTitle || '灵伴聊天')}" /></label>
          <label>A 组副文案<input id="cfgExperimentHomeAiEntryControlSubtitle" maxlength="80" value="${escapeHtml(homeAiEntryExperiment.controlSubtitle || '今天想和{petName}聊点什么？')}" /></label>
          <label>B 组标题<input id="cfgExperimentHomeAiEntryTreatmentTitle" maxlength="32" value="${escapeHtml(homeAiEntryExperiment.treatmentTitle || '问问我的小心情')}" /></label>
          <label>B 组副文案<input id="cfgExperimentHomeAiEntryTreatmentSubtitle" maxlength="80" value="${escapeHtml(homeAiEntryExperiment.treatmentSubtitle || '{petName}好像有话想和你说')}" /></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>AI 外围系统配置</h2>
            <div class="section-sub">控制灵伴形象生成、宠物 AI 对话的 provider、模型参数和实际提示词</div>
          </div>
          ${help('这里不保存 API 密钥。密钥仍由服务器环境变量提供；后台只配置 provider、模型、尺寸、prompt 和对话 system prompt。发布后会影响新的 AI 请求，历史任务保留原 provider。')}
        </div>
        ${renderAiRuntimeConfig(config.aiRuntime || {})}
        <div class="config-grid ai-prompt-grid">
          <label>形象生成 provider
            <select id="cfgAiAvatarProvider">
              ${configProviderOption(aiAvatar.provider, 'gpt-image-2', 'GPT Image 2')}
              ${configProviderOption(aiAvatar.provider, 'ttapi-flux-edits', 'TTAPI Flux Edits')}
              ${configProviderOption(aiAvatar.provider, 'ttapi-midjourney', 'TTAPI Midjourney')}
              ${configProviderOption(aiAvatar.provider, 'mock', 'Mock 兜底')}
            </select>
          </label>
          <label>GPT Image 2 model<input id="cfgGptImage2Model" maxlength="80" value="${escapeHtml(aiAvatarGptImage2.model || 'gpt-image-2')}" /></label>
          <label>GPT Image 2 prompt version<input id="cfgGptImage2PromptVersion" maxlength="120" value="${escapeHtml(aiAvatarGptImage2.promptVersion || 'ops-config-gpt-image-2')}" /></label>
          ${featureCheckbox('cfgAvatarFailureRefundEnabled', '供应商失败自动返还额度', aiAvatarFailureRefund.enabled !== false)}
          ${featureCheckbox('cfgAvatarFailureRefundProviderStart', '提交失败返还', aiAvatarFailureRefund.providerStartFailure !== false)}
          ${featureCheckbox('cfgAvatarFailureRefundProviderTimeout', '超时返还', aiAvatarFailureRefund.providerTimeout !== false)}
          ${featureCheckbox('cfgAvatarFailureRefundProviderFailure', '供应商失败返还', aiAvatarFailureRefund.providerFailure !== false)}
          <label>GPT Image 2 分辨率
            <select id="cfgGptImage2Resolution">
              ${configProviderOption(aiAvatarGptImage2.resolution, '1k', '1k')}
              ${configProviderOption(aiAvatarGptImage2.resolution, '2k', '2k')}
              ${configProviderOption(aiAvatarGptImage2.resolution, '4k', '4k')}
            </select>
          </label>
          <label>GPT Image 2 尺寸
            <select id="cfgGptImage2Size">
              ${configProviderOption(aiAvatarGptImage2.size, '1:1', '1:1')}
              ${configProviderOption(aiAvatarGptImage2.size, '16:9', '16:9')}
              ${configProviderOption(aiAvatarGptImage2.size, '9:16', '9:16')}
              ${configProviderOption(aiAvatarGptImage2.size, '4:3', '4:3')}
              ${configProviderOption(aiAvatarGptImage2.size, '3:4', '3:4')}
            </select>
          </label>
          ${featureCheckbox('cfgGptImage2OfficialFallback', 'GPT Image 2 official_fallback', Boolean(aiAvatarGptImage2.officialFallback))}
          <label>TTAPI Flux mode<input id="cfgTtapiFluxMode" maxlength="60" value="${escapeHtml(aiAvatarFlux.mode || 'flux-2-max')}" /></label>
          <label>TTAPI Midjourney mode
            <select id="cfgTtapiMjMode">
              ${configProviderOption(aiAvatarMidjourney.mode, 'fast', 'fast')}
              ${configProviderOption(aiAvatarMidjourney.mode, 'turbo', 'turbo')}
              ${configProviderOption(aiAvatarMidjourney.mode, 'relax', 'relax')}
            </select>
          </label>
          <label>TTAPI Midjourney timeout 秒<input id="cfgTtapiMjTimeout" type="number" min="60" max="1800" value="${Number.isFinite(Number(aiAvatarMidjourney.timeout)) ? aiAvatarMidjourney.timeout : 600}" /></label>
          ${featureCheckbox('cfgTtapiMjAutoUpsample', 'Midjourney 自动 upsample', Boolean(aiAvatarMidjourney.autoUpsample))}
          <label>灵伴动效 provider
            <select id="cfgAiAvatarAnimationProvider">
              ${configProviderOption(aiAvatarAnimation.provider, 'doubao-seedance-1-5-pro', 'Doubao Seedance 1.5 Pro')}
              ${configProviderOption(aiAvatarAnimation.provider, 'mock', 'Mock 兜底')}
              ${configProviderOption(aiAvatarAnimation.provider, 'disabled', '关闭')}
            </select>
          </label>
          ${featureCheckbox('cfgAiAvatarAnimationEnabled', '启用灵伴动效异步生成', aiAvatarAnimation.enabled !== false)}
          <label>Seedance model<input id="cfgSeedanceModel" maxlength="80" value="${escapeHtml(aiAvatarAnimationSeedance.model || 'doubao-seedance-1-5-pro')}" /></label>
          <label>Seedance 固定参数<input disabled value="4s · 1:1 · 480p" /></label>
          ${featureCheckbox('cfgSeedanceCameraFixed', 'Seedance 锁定镜头 camerafixed', aiAvatarAnimationSeedance.cameraFixed !== false)}
          <label>宠物 AI 对话 provider
            <select id="cfgPetChatProvider">
              ${configProviderOption(aiPetChat.provider, 'deepseek', 'DeepSeek')}
              ${configProviderOption(aiPetChat.provider, 'fallback', 'Fallback 兜底')}
            </select>
          </label>
          <label>DeepSeek model<input id="cfgDeepSeekModel" maxlength="80" value="${escapeHtml(aiPetChatDeepSeek.model || 'deepseek-v4-flash')}" /></label>
          <label>DeepSeek thinking
            <select id="cfgDeepSeekThinking">
              ${configProviderOption(aiPetChatDeepSeek.thinking, 'disabled', 'disabled')}
              ${configProviderOption(aiPetChatDeepSeek.thinking, 'enabled', 'enabled')}
            </select>
          </label>
          <label>DeepSeek max_tokens<input id="cfgDeepSeekMaxTokens" type="number" min="80" max="2000" value="${Number.isFinite(Number(aiPetChatDeepSeek.maxTokens)) ? aiPetChatDeepSeek.maxTokens : 420}" /></label>
          <label>DeepSeek temperature<input id="cfgDeepSeekTemperature" type="number" min="0" max="2" step="0.01" value="${Number.isFinite(Number(aiPetChatDeepSeek.temperature)) ? aiPetChatDeepSeek.temperature : 0.7}" /></label>
          <label class="wide">GPT Image 2 灵伴形象 prompt 模板<textarea id="cfgGptImage2PromptTemplate" maxlength="12000" placeholder="支持 {species}、{breed}、{petName}、{speciesLabel}">${escapeHtml(aiAvatarGptImage2.promptTemplate || '')}</textarea></label>
          <div class="wide">${renderAiPromptVersionLibrary(aiPromptVersions, aiAvatarGptImage2)}</div>
          <label class="wide">灵伴动效狗狗 prompt 模板<textarea id="cfgSeedanceDogPromptTemplate" maxlength="12000" placeholder="支持 {species}、{breed}、{petName}、{speciesLabel}">${escapeHtml(aiAvatarAnimationSeedance.dogPromptTemplate || '')}</textarea></label>
          <label class="wide">灵伴动效猫咪 prompt 模板<textarea id="cfgSeedanceCatPromptTemplate" maxlength="12000" placeholder="支持 {species}、{breed}、{petName}、{speciesLabel}">${escapeHtml(aiAvatarAnimationSeedance.catPromptTemplate || '')}</textarea></label>
          <label class="wide">灵伴动效默认 prompt 模板<textarea id="cfgSeedanceDefaultPromptTemplate" maxlength="12000" placeholder="非猫狗或兜底物种会使用这个模板">${escapeHtml(aiAvatarAnimationSeedance.defaultPromptTemplate || '')}</textarea></label>
          <label class="wide">灵伴动效 negative constraints<textarea id="cfgSeedanceNegativePromptTemplate" maxlength="12000" placeholder="当前会合并进主 prompt 的 Avoid 段">${escapeHtml(aiAvatarAnimationSeedance.negativePromptTemplate || '')}</textarea></label>
          <label class="wide">TTAPI Flux prompt 模板<textarea id="cfgTtapiFluxPromptTemplate" maxlength="12000" placeholder="历史备用 provider 的 prompt 模板">${escapeHtml(aiAvatarFlux.promptTemplate || '')}</textarea></label>
          <label class="wide">TTAPI Midjourney prompt 模板<textarea id="cfgTtapiMjPromptTemplate" maxlength="12000" placeholder="支持 {mediaUrl}、{species}、{breed}">${escapeHtml(aiAvatarMidjourney.promptTemplate || '')}</textarea></label>
          <label class="wide">DeepSeek base system prompt<textarea id="cfgDeepSeekBaseSystemPrompt" maxlength="12000" placeholder="宠物 AI 对话的第一条 system prompt">${escapeHtml(aiPetChatDeepSeek.baseSystemPrompt || '')}</textarea></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>移动端事件埋点</h2>
            <div class="section-sub">控制页面、发现、地图、地点和通知点击事件；事件不存正文、搜索词、地址、经纬度和图片 URL</div>
          </div>
          ${help('采样率由移动端按手机号和事件名稳定采样；后端仍会按“启用/关闭”兜底。当前测试后端使用 JSON state，保留期不建议过长。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgAnalyticsEnabled', '启用移动端事件采集', analytics.enabled !== false)}
        </div>
        <div class="config-grid">
          <label>采样率 %<input id="cfgAnalyticsSampleRatePercent" type="number" min="0" max="100" value="${Number.isFinite(Number(analytics.sampleRatePercent)) ? analytics.sampleRatePercent : 100}" /></label>
          <label>保留天数<input id="cfgAnalyticsRetentionDays" type="number" min="7" max="180" value="${Number.isFinite(Number(analytics.retentionDays)) ? analytics.retentionDays : 30}" /></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>配置发布审批</h2>
            <div class="section-sub">控制会影响 /app/config 的发布、草稿发布和回滚是否必须先审批</div>
          </div>
          ${help('草稿保存不影响移动端，因此不需要审批；真正发布到 /app/config 的动作会被这里控制。当前单 admin 可自审批，生产多管理员后可升级为双人审批。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgConfigApprovalRequireApproval', '强制配置发布审批', Boolean(configApproval.requireApproval))}
        </div>
        <div class="config-grid">
          <label>审批有效期小时<input id="cfgConfigApprovalExpiresHours" type="number" min="1" max="168" value="${Number.isFinite(Number(configApproval.approvalExpiresHours)) ? configApproval.approvalExpiresHours : 24}" /></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>数据导出治理</h2>
            <div class="section-sub">控制 CSV 下载是否必须先走导出审批，审批只影响后台，不下发移动端</div>
          </div>
          ${help('开启强制审批后，导出页直接下载会被后端拦截，必须先提交导出审批并审批通过；审批绑定数据集、筛选条件、原因和有效期。当前单 admin 可自审批，生产多管理员后可升级双人审批。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgExportRequireApproval', '强制导出审批', Boolean(exportsConfig.requireApproval))}
        </div>
        <div class="config-grid">
          <label>审批有效期小时<input id="cfgExportApprovalExpiresHours" type="number" min="1" max="168" value="${Number.isFinite(Number(exportsConfig.approvalExpiresHours)) ? exportsConfig.approvalExpiresHours : 24}" /></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>客服工单 SLA 与排班</h2>
            <div class="section-sub">保存后立即影响工单排序、SLA 标记、负责人分配和值班风险提示</div>
          </div>
          ${help('首响 SLA 从创建到首次接手/客服回复；解决 SLA 从创建到 resolved/closed。负责人枚举会限制工单分配，排班用于提示是否值班。')}
        </div>
        <div class="config-grid">
          <label>首响-紧急小时<input id="cfgSupportFirstSlaUrgent" type="number" min="1" max="72" value="${supportFirstResponseSlaHours.urgent || 1}" /></label>
          <label>首响-高优先级小时<input id="cfgSupportFirstSlaHigh" type="number" min="1" max="168" value="${supportFirstResponseSlaHours.high || 4}" /></label>
          <label>首响-普通小时<input id="cfgSupportFirstSlaNormal" type="number" min="1" max="336" value="${supportFirstResponseSlaHours.normal || 12}" /></label>
          <label>首响-低优先级小时<input id="cfgSupportFirstSlaLow" type="number" min="1" max="336" value="${supportFirstResponseSlaHours.low || 24}" /></label>
          <label>解决-紧急小时<input id="cfgSupportSlaUrgent" type="number" min="1" max="168" value="${supportSlaHours.urgent || 8}" /></label>
          <label>解决-高优先级小时<input id="cfgSupportSlaHigh" type="number" min="1" max="336" value="${supportSlaHours.high || 24}" /></label>
          <label>解决-普通小时<input id="cfgSupportSlaNormal" type="number" min="1" max="720" value="${supportSlaHours.normal || 72}" /></label>
          <label>解决-低优先级小时<input id="cfgSupportSlaLow" type="number" min="1" max="720" value="${supportSlaHours.low || 168}" /></label>
          <label class="wide">客服负责人枚举<textarea id="cfgSupportAssignees" maxlength="4000" placeholder="每行：账号|姓名|角色|周几|开始时间|结束时间|启用&#10;admin|Admin|客服|1,2,3,4,5,6,0|09:00|22:00|true">${escapeHtml(formatSupportAssigneeConfig(supportAssignees))}</textarea></label>
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgSupportBatchReplyEnabled', '允许批量回复申请', supportBatchReply.enabled !== false)}
          ${featureCheckbox('cfgSupportBatchReplyRequireApproval', '批量回复必须审批', supportBatchReply.requireApproval !== false)}
          ${featureCheckbox('cfgSupportQualityReviewEnabled', '启用客服质检队列', supportQualityReview.enabled !== false)}
        </div>
        <div class="config-grid">
          <label>批量回复单次上限<input id="cfgSupportBatchReplyMaxTickets" type="number" min="1" max="100" value="${Number.isFinite(Number(supportBatchReply.maxTickets)) ? supportBatchReply.maxTickets : 20}" /></label>
          <label>首响达标目标 %<input id="cfgSupportTargetFirstResponse" type="number" min="0" max="100" step="0.1" value="${Number.isFinite(Number(supportQualityTargets.firstResponseSlaRate)) ? supportQualityTargets.firstResponseSlaRate : 90}" /></label>
          <label>解决达标目标 %<input id="cfgSupportTargetResolution" type="number" min="0" max="100" step="0.1" value="${Number.isFinite(Number(supportQualityTargets.resolutionSlaRate)) ? supportQualityTargets.resolutionSlaRate : 85}" /></label>
          <label>满意度目标<input id="cfgSupportTargetRating" type="number" min="1" max="5" step="0.1" value="${Number.isFinite(Number(supportQualityTargets.avgRating)) ? supportQualityTargets.avgRating : 4}" /></label>
          <label>重开率红线 %<input id="cfgSupportTargetReopenRate" type="number" min="0" max="100" step="0.1" value="${Number.isFinite(Number(supportQualityTargets.reopenRateMax)) ? supportQualityTargets.reopenRateMax : 10}" /></label>
          <label>低分数量红线<input id="cfgSupportTargetLowRating" type="number" min="0" max="1000" value="${Number.isFinite(Number(supportQualityTargets.lowRatingMax)) ? supportQualityTargets.lowRatingMax : 3}" /></label>
          <label>低分质检阈值<input id="cfgSupportReviewLowRating" type="number" min="1" max="5" value="${Number.isFinite(Number(supportQualityReview.lowRatingThreshold)) ? supportQualityReview.lowRatingThreshold : 2}" /></label>
          <label>重开触发次数<input id="cfgSupportReviewReopenThreshold" type="number" min="1" max="20" value="${Number.isFinite(Number(supportQualityReview.reopenThreshold)) ? supportQualityReview.reopenThreshold : 1}" /></label>
        </div>
        <div class="section-head compact">
          <div>
            <h2>客服结算预览规则</h2>
            <div class="section-sub">只用于后台周/月复盘，不会生成真实付款单</div>
          </div>
          ${help('结算预览按已解决工单给基础金额；首响达标和 4-5 分评价给奖励；低分、重开和 SLA 未达标给扣减。金额单位为人民币元，后端以分存储。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgSupportSettlementPreviewEnabled', '启用结算预览', supportSettlement.previewEnabled !== false)}
        </div>
        <div class="config-grid">
          <label>已解决工单基础金额<input id="cfgSupportSettlementResolvedTicket" type="number" min="0" max="10000" step="0.01" value="${(((supportSettlement.resolvedTicketCents ?? 200) / 100)).toFixed(2)}" /></label>
          <label>首响达标奖励<input id="cfgSupportSettlementFirstBonus" type="number" min="0" max="1000" step="0.01" value="${(((supportSettlement.firstResponseBonusCents ?? 50) / 100)).toFixed(2)}" /></label>
          <label>好评奖励<input id="cfgSupportSettlementSatisfactionBonus" type="number" min="0" max="1000" step="0.01" value="${(((supportSettlement.satisfactionBonusCents ?? 50) / 100)).toFixed(2)}" /></label>
          <label>低分扣减<input id="cfgSupportSettlementLowRatingPenalty" type="number" min="0" max="1000" step="0.01" value="${(((supportSettlement.lowRatingPenaltyCents ?? 100) / 100)).toFixed(2)}" /></label>
          <label>重开扣减<input id="cfgSupportSettlementReopenPenalty" type="number" min="0" max="1000" step="0.01" value="${(((supportSettlement.reopenPenaltyCents ?? 100) / 100)).toFixed(2)}" /></label>
          <label>SLA 未达标扣减<input id="cfgSupportSettlementBreachPenalty" type="number" min="0" max="1000" step="0.01" value="${(((supportSettlement.breachPenaltyCents ?? 80) / 100)).toFixed(2)}" /></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>系统通知治理</h2>
            <div class="section-sub">保存后立即影响通知运营页的发送、预约、审批和频控，避免误发或刷屏</div>
          </div>
          ${help('这里只限制后台系统通知，不限制审核结果、工单回复、申诉处理、疫苗提醒等业务通知。开启发送审批后，直接发送和预约发送会被后端拦截，需先提交审批。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgNotificationRateLimitEnabled', '启用系统通知频控', notifications.rateLimitEnabled !== false)}
          ${featureCheckbox('cfgNotificationRequireApproval', '强制系统通知发送审批', Boolean(notifications.requireApproval))}
        </div>
        <div class="config-grid">
          <label>24 小时批次上限<input id="cfgNotificationMaxCampaignsPerDay" type="number" min="1" max="50" value="${Number.isFinite(Number(notifications.maxCampaignsPerDay)) ? notifications.maxCampaignsPerDay : 5}" /></label>
          <label>单用户 24 小时上限<input id="cfgNotificationMaxPerUserPerDay" type="number" min="1" max="20" value="${Number.isFinite(Number(notifications.maxPerUserPerDay)) ? notifications.maxPerUserPerDay : 2}" /></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>内容安全规则</h2>
            <div class="section-sub">保存后立即影响小事、评论、地点点评和新增地点提交</div>
          </div>
          ${help('阻断词会直接拒绝提交；高风险词和复审词会让小事/地点进入审核池。评论命中规则时会提示用户修改，避免出现“发了但看不到”。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgModerationEnabled', '启用内容安全规则', moderation.enabled)}
          ${featureCheckbox('cfgModerationTextRulesEnabled', '启用文本关键词规则', moderation.textRulesEnabled !== false)}
          ${featureCheckbox('cfgModerationMachineTextEnabled', '启用腾讯云文本机审', moderation.machineTextEnabled)}
          ${featureCheckbox('cfgModerationMachineImageEnabled', '启用腾讯云图片机审', moderation.machineImageEnabled)}
          ${featureCheckbox('cfgModerationPublicHintEnabled', '移动端展示公开内容安全轻提示', moderationPublicHint.enabled !== false)}
        </div>
        ${renderContentSafetyStatus(contentSafety)}
        <div class="config-grid announcement-grid">
          <label class="wide">阻断关键词<textarea id="cfgModerationBlockKeywords" maxlength="1200" placeholder="一行一个，命中后直接拒绝提交">${escapeHtml(keywordTextareaValue(moderation.blockKeywords))}</textarea></label>
          <label class="wide">高风险关键词<textarea id="cfgModerationHighRiskKeywords" maxlength="1200" placeholder="一行一个，命中后进入人工审核">${escapeHtml(keywordTextareaValue(moderation.highRiskKeywords))}</textarea></label>
          <label class="wide">复审关键词<textarea id="cfgModerationReviewKeywords" maxlength="1200" placeholder="一行一个，命中后进入人工审核">${escapeHtml(keywordTextareaValue(moderation.reviewKeywords))}</textarea></label>
          <label>阻断提示<input id="cfgModerationBlockMessage" maxlength="80" value="${escapeHtml(moderation.blockMessage || '')}" /></label>
          <label>复审提示<input id="cfgModerationReviewMessage" maxlength="80" value="${escapeHtml(moderation.reviewMessage || '')}" /></label>
          <label>抽样复审率 %<input id="cfgModerationSampleReviewRatePercent" type="number" min="0" max="100" value="${Number.isFinite(Number(moderation.sampleReviewRatePercent)) ? moderation.sampleReviewRatePercent : 0}" /></label>
          <label class="wide">小事发布轻提示<textarea id="cfgModerationPublicHintPostText" maxlength="140" placeholder="展示在发布今日小事页">${escapeHtml(moderationPublicHint.postText || '')}</textarea></label>
          <label class="wide">评论轻提示<textarea id="cfgModerationPublicHintCommentText" maxlength="140" placeholder="展示在宠友圈评论输入区">${escapeHtml(moderationPublicHint.commentText || '')}</textarea></label>
          <label class="wide">地点提交轻提示<textarea id="cfgModerationPublicHintPlaceText" maxlength="140" placeholder="展示在地点点评/新增地点页">${escapeHtml(moderationPublicHint.placeText || '')}</textarea></label>
          <label class="wide">图片审核轻提示<textarea id="cfgModerationPublicHintImageText" maxlength="140" placeholder="预留给头像、封面和上传图片入口">${escapeHtml(moderationPublicHint.imageText || '')}</textarea></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>App 公告弹窗</h2>
            <div class="section-sub">开启后，用户下次拉取 /app/config 会看到弹窗；同一版本每个用户只展示一次</div>
          </div>
          ${help('需要再次触达同一批用户时，请修改公告版本号。按钮跳转为空时，主按钮只关闭弹窗。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgAnnouncementEnabled', '启用公告弹窗', announcement.enabled)}
        </div>
        <div class="config-grid announcement-grid">
          <label>公告版本<input id="cfgAnnouncementVersion" maxlength="40" placeholder="例如 2026-06-30-v1" value="${escapeHtml(announcement.version || '')}" /></label>
          <label>公告标题<input id="cfgAnnouncementTitle" maxlength="40" placeholder="例如 灵伴新功能上线" value="${escapeHtml(announcement.title || '')}" /></label>
          <label>按钮文案<input id="cfgAnnouncementActionLabel" maxlength="16" placeholder="例如 去看看" value="${escapeHtml(announcement.actionLabel || '知道了')}" /></label>
          <label>点击跳转
            <select id="cfgAnnouncementActionRoute">
              ${configRouteOption(announcement.actionRoute || '', '', '无跳转')}
              ${configRouteOption(announcement.actionRoute || '', 'home', '首页')}
              ${configRouteOption(announcement.actionRoute || '', 'discover', '发现')}
              ${configRouteOption(announcement.actionRoute || '', 'map', '地图')}
              ${configRouteOption(announcement.actionRoute || '', 'profile', '我的')}
              ${configRouteOption(announcement.actionRoute || '', 'safety', '安全中心')}
              ${configRouteOption(announcement.actionRoute || '', 'settings', '设置')}
              ${configRouteOption(announcement.actionRoute || '', 'notifications', '通知中心')}
              ${configRouteOption(announcement.actionRoute || '', 'supportTickets', '反馈进度')}
            </select>
          </label>
          <label class="wide">公告正文<textarea id="cfgAnnouncementBody" maxlength="180" placeholder="建议 60 字以内，直接说明发生了什么、用户需要做什么。">${escapeHtml(announcement.body || '')}</textarea></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>版本与启动策略</h2>
            <div class="section-sub">App 每次读取 /app/config 后会按版本、灰度比例和启动提示版本展示对应弹窗</div>
          </div>
          ${help('强制更新需要填写最低可用版本和下载地址；可选更新按最新版本与灰度比例展示。启动提示按用户和提示版本只展示一次，修改版本号即可再次触达。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgUpdateEnabled', '启用版本更新提示', update.enabled)}
          ${featureCheckbox('cfgUpdateForce', '强制更新', update.force)}
          ${featureCheckbox('cfgSplashEnabled', '启用启动提示', splash.enabled)}
        </div>
        <div class="config-grid announcement-grid">
          <label>最低可用版本<input id="cfgUpdateMinVersion" maxlength="32" placeholder="例如 1.0.1" value="${escapeHtml(update.minVersion || '')}" /></label>
          <label>最新版本<input id="cfgUpdateLatestVersion" maxlength="32" placeholder="例如 1.1.0" value="${escapeHtml(update.latestVersion || '')}" /></label>
          <label>灰度比例 %<input id="cfgUpdateRolloutPercent" type="number" min="0" max="100" value="${Number.isFinite(Number(update.rolloutPercent)) ? update.rolloutPercent : 100}" /></label>
          <label>更新标题<input id="cfgUpdateTitle" maxlength="40" placeholder="例如 发现新版本" value="${escapeHtml(update.title || '发现新版本')}" /></label>
          <label class="wide">更新说明<textarea id="cfgUpdateSubtitle" maxlength="140" placeholder="给用户说明为什么需要更新">${escapeHtml(update.subtitle || '')}</textarea></label>
          <label class="wide">Android 下载地址<input id="cfgUpdateAndroidUrl" maxlength="1000" placeholder="https://..." value="${escapeHtml(update.androidUrl || '')}" /></label>
          <label class="wide">iOS 下载地址<input id="cfgUpdateIosUrl" maxlength="1000" placeholder="https://..." value="${escapeHtml(update.iosUrl || '')}" /></label>
          <label>启动提示版本<input id="cfgSplashVersion" maxlength="40" placeholder="例如 2026-06-30-v1" value="${escapeHtml(splash.version || '')}" /></label>
          <label>启动提示标题<input id="cfgSplashTitle" maxlength="40" placeholder="例如 今日灵伴提醒" value="${escapeHtml(splash.title || '')}" /></label>
          <label>启动按钮文案<input id="cfgSplashActionLabel" maxlength="16" placeholder="例如 去看看" value="${escapeHtml(splash.actionLabel || '知道了')}" /></label>
          <label>启动点击跳转
            <select id="cfgSplashActionRoute">
              ${configRouteOption(splash.actionRoute || '', '', '无跳转')}
              ${configRouteOption(splash.actionRoute || '', 'home', '首页')}
              ${configRouteOption(splash.actionRoute || '', 'discover', '发现')}
              ${configRouteOption(splash.actionRoute || '', 'map', '地图')}
              ${configRouteOption(splash.actionRoute || '', 'profile', '我的')}
              ${configRouteOption(splash.actionRoute || '', 'safety', '安全中心')}
              ${configRouteOption(splash.actionRoute || '', 'settings', '设置')}
              ${configRouteOption(splash.actionRoute || '', 'notifications', '通知中心')}
              ${configRouteOption(splash.actionRoute || '', 'supportTickets', '反馈进度')}
            </select>
          </label>
          <label class="wide">启动提示图<input id="cfgSplashImageUrl" maxlength="1000" placeholder="https://..." value="${escapeHtml(splash.imageUrl || '')}" /></label>
          <label class="wide">启动提示正文<textarea id="cfgSplashBody" maxlength="180" placeholder="建议 60 字以内，说明本次运营提示">${escapeHtml(splash.body || '')}</textarea></label>
        </div>
      </div>
      <div class="actions config-actions">
        <button class="small-button" data-action="save-config-draft">保存草稿</button>
        ${configApproval.requireApproval
          ? '<button class="primary-button" data-action="submit-config-approval">提交发布审批</button>'
          : '<button class="small-button" data-action="submit-config-approval">提交审批</button><button class="primary-button" data-action="save-config">立即发布</button>'}
      </div>
      ${configApproval.requireApproval ? '' : `
        <div class="notification-form-row config-schedule-row">
          <label>预约发布时间<input id="cfgPublishScheduledAt" type="datetime-local" /></label>
          <button class="small-button" data-action="schedule-config">预约发布</button>
        </div>
      `}
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>配置版本历史</h2>
            <div class="section-sub">每次保存都会生成版本快照；回滚后移动端下一次读取 /app/config 即生效</div>
          </div>
          ${help('回滚也是一次新的配置发布，会写审计日志，并生成新的 rollback 版本，方便继续追踪。')}
        </div>
        ${renderConfigRevisions(revisions, Boolean(configApproval.requireApproval))}
      </div>
    </div>
  `;
}

function featureCheckbox(id, label, checked) {
  return `<label class="switch-row"><span>${label}</span><input id="${id}" type="checkbox" ${checked ? 'checked' : ''} /></label>`;
}

function configRouteOption(current, value, label) {
  return `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
}

function configProviderOption(current, value, label) {
  return `<option value="${escapeHtml(value)}" ${String(current || '') === value ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function aiPromptVersionFormPayload(source) {
  const sampleIds = $('aiPromptVersionSampleIds')?.value.trim() || '';
  return {
    name: $('aiPromptVersionName')?.value.trim() || '',
    note: $('aiPromptVersionNote')?.value.trim() || '',
    promptTemplate: source === 'current_config' ? undefined : ($('cfgGptImage2PromptTemplate')?.value || ''),
    reason: source === 'current_config' ? '存档当前线上 GPT Image 2 Prompt' : '保存当前编辑为 GPT Image 2 Prompt 候选',
    sampleIds,
    source: source === 'current_config' ? 'current_config' : sampleIds ? 'sample_pool' : 'manual',
    target: 'avatar_gpt_image2',
  };
}

async function saveAiPromptVersion(source = 'manual') {
  const payload = aiPromptVersionFormPayload(source);
  if (source !== 'current_config' && !payload.promptTemplate.trim()) {
    showToast('请先填写 GPT Image 2 prompt 模板');
    return;
  }
  if (!payload.name) {
    const defaultName = source === 'current_config' ? '线上 Prompt 存档' : 'Prompt 候选';
    const name = window.prompt('请输入候选版本名称', defaultName);
    if (name === null) return;
    payload.name = name.trim() || defaultName;
  }
  await post('/admin/ai/prompt-versions', payload);
  state.cache.aiPromptVersions = null;
  state.cache.audit = null;
  showToast(source === 'current_config' ? '线上 Prompt 已存档' : 'Prompt 候选已保存');
  await render(true);
}

async function draftAiPromptVersion(id) {
  if (!id) return;
  const reason = window.prompt('请输入生成配置草稿的原因', `由 Prompt 候选 ${id} 生成配置草稿`);
  if (reason === null) return;
  const result = await post(`/admin/ai/prompt-versions/${encodeURIComponent(id)}/draft`, {
    reason: reason.trim() || `由 Prompt 候选 ${id} 生成配置草稿`,
  });
  state.cache.config = result.config || null;
  state.cache.aiPromptVersions = null;
  state.cache.audit = null;
  state.cache.summary = null;
  showToast('已生成配置草稿，发布后才会影响移动端生成');
  await render(true);
}

async function archiveAiPromptVersion(id) {
  if (!id) return;
  const reason = window.prompt('请输入归档原因', `归档 Prompt 候选 ${id}`);
  if (reason === null) return;
  await post(`/admin/ai/prompt-versions/${encodeURIComponent(id)}/archive`, {
    reason: reason.trim() || `归档 Prompt 候选 ${id}`,
  });
  state.cache.aiPromptVersions = null;
  state.cache.audit = null;
  showToast('Prompt 候选已归档');
  await render(true);
}

function renderAiRuntimeConfig(runtime = {}) {
  const animation = runtime.petAvatarAnimation || {};
  const avatar = runtime.petAvatar || {};
  const chat = runtime.petChat || {};
  const credentials = runtime.credentials || {};
  const notes = Array.isArray(runtime.notes) ? runtime.notes : [];
  const rows = [
    ...(avatar.providers || []).map((row) => ({ ...row, group: '灵伴形象' })),
    ...(animation.providers || []).map((row) => ({ ...row, group: '灵伴动效' })),
    ...(chat.providers || []).map((row) => ({ ...row, group: 'AI 对话' })),
  ];
  const contextRows = (chat.contextPromptStructure || []).map((text, index) => ({ index: index + 1, text }));
  return `
    <div class="ai-runtime-panel">
      <div class="content-safety-status">
        <div><span>GPT Image 2 Key</span>${statusPill(credentials.gptImage2 ? '已配置' : '未配置')}</div>
        <div><span>APIMart Key</span>${statusPill(credentials.apimart ? '已配置' : '未配置')}</div>
        <div><span>TTAPI Key</span>${statusPill(credentials.ttapi ? '已配置' : '未配置')}</div>
        <div><span>DeepSeek Key</span>${statusPill(credentials.deepseek ? '已配置' : '未配置')}</div>
        <div><span>当前形象</span><strong>${escapeHtml(avatar.provider || '-')}</strong></div>
        <div><span>当前动效</span><strong>${escapeHtml(animation.provider || '-')}</strong></div>
        <div><span>当前对话</span><strong>${escapeHtml(chat.provider || '-')}</strong></div>
      </div>
      <div class="ai-runtime-note">
        ${notes.map((note) => `<span>${escapeHtml(note)}</span>`).join('')}
      </div>
      ${tableHtml(rows, [
        ['模块', (row) => `<div>${escapeHtml(row.group)}</div><div class="cell-sub">${escapeHtml(row.provider)}</div>`],
        ['当前/密钥', (row) => `${statusPill(row.current ? '当前启用' : '备用')} ${statusPill(row.credentialsConfigured ? '可调用' : '缺密钥')}`],
        ['参数', (row) => `<div class="cell-sub">${escapeHtml(row.detail || '-')}</div>`],
        ['Prompt 预览', (row) => row.promptPreview ? `<pre class="prompt-preview">${escapeHtml(row.promptPreview)}</pre>` : '<div class="cell-sub">不使用 prompt</div>'],
      ], '暂无 AI provider 配置')}
      ${contextRows.length ? `
        <div class="mini-section-title">AI 对话动态上下文</div>
        ${tableHtml(contextRows, [
          ['顺序', (row) => numberText(row.index)],
          ['服务端追加内容', (row) => `<div>${escapeHtml(row.text)}</div>`],
        ], '暂无动态上下文说明')}
      ` : ''}
    </div>
  `;
}

function keywordTextareaValue(value) {
  return (Array.isArray(value) ? value : []).join('\n');
}

function renderContentSafetyStatus(contentSafety = {}) {
  const text = contentSafety.text || {};
  const image = contentSafety.image || {};
  const rows = [
    ...(text.bizTypes || []).map((row) => ({ ...row, service: '文本内容安全' })),
    ...(image.bizTypes || []).map((row) => ({ ...row, service: '图片内容安全' })),
  ];
  return `
    <div class="content-safety-panel">
      <div class="content-safety-status">
        <div>
          <span>腾讯云凭据</span>
          ${statusPill(contentSafety.credentialsConfigured ? '已配置' : '未配置')}
        </div>
        <div>
          <span>文本机审</span>
          ${statusPill(text.enabled ? '已启用' : '未启用')}
        </div>
        <div>
          <span>图片机审</span>
          ${statusPill(image.enabled ? '已启用' : '未启用')}
        </div>
        <div>
          <span>Region</span>
          <strong>${escapeHtml(contentSafety.region || '-')}</strong>
        </div>
      </div>
      <div class="cell-sub">
        环境变量只在服务器读取：${escapeHtml((contentSafety.requiredEnv || []).join(' / ') || 'TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY')}
      </div>
      ${tableHtml(rows, [
        ['服务', (row) => `<div>${escapeHtml(row.service)}</div><div class="cell-sub">${escapeHtml(row.scope)}</div>`],
        ['Biztype 名称', (row) => `<div class="cell-title">${escapeHtml(row.bizType || '-')}</div>`],
        ['场景', (row) => `<div class="cell-sub">${escapeHtml(row.label || '-')}</div>`],
      ], '暂无腾讯云 Biztype 映射')}
    </div>
  `;
}

function configRiskConfirmationFromError(error, actionLabel) {
  if (error?.code !== 'ADMIN_CONFIG_RISK_CONFIRM_REQUIRED') throw error;
  const data = error.data || {};
  const confirmText = data.confirmText || CONFIG_HIGH_RISK_CONFIRM_TEXT;
  const risks = Array.isArray(data.blockingRisks) ? data.blockingRisks : [];
  const riskSummary = risks.length
    ? risks.slice(0, 6).map((risk) => `${risk.severity || '-'} ${risk.label || risk.key}: ${risk.before} -> ${risk.after}`).join('\n')
    : '命中高风险配置变更。';
  const input = window.prompt(
    `${actionLabel}包含高风险配置，会直接影响移动端用户。\n\n${riskSummary}\n\n如确认继续，请输入：${confirmText}`,
    '',
  );
  if (input === null) return null;
  if (input.trim() !== confirmText) {
    showToast('确认文案不匹配，已取消发布');
    return null;
  }
  return {
    riskAcknowledged: true,
    riskConfirmText: confirmText,
  };
}

async function submitConfigMutationWithRiskConfirmation(send, payload, actionLabel) {
  try {
    return await send(payload);
  } catch (error) {
    const confirmation = configRiskConfirmationFromError(error, actionLabel);
    if (!confirmation) return null;
    return send({ ...payload, ...confirmation });
  }
}

function scheduledAtFromLocalInput(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) throw new Error('请选择预约发布时间');
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error('预约发布时间无效');
  if (date.getTime() <= Date.now() + 1000) throw new Error('预约发布时间必须晚于当前时间');
  return date.toISOString();
}

function promptConfigScheduledAt(defaultMinutes = 30) {
  const defaultDate = new Date(Date.now() + defaultMinutes * 60 * 1000);
  const pad = (value) => String(value).padStart(2, '0');
  const defaultText = `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())} ${pad(defaultDate.getHours())}:${pad(defaultDate.getMinutes())}`;
  const value = window.prompt('请输入预约发布时间（YYYY-MM-DD HH:mm）', defaultText);
  if (value === null) return '';
  const normalized = value.trim().replace(' ', 'T');
  return scheduledAtFromLocalInput(normalized);
}

function formatSupportAssigneeConfig(assignees = []) {
  return (Array.isArray(assignees) ? assignees : [])
    .map((item) => [
      item.id || '',
      item.name || item.id || '',
      item.role || '客服',
      (item.weekdays || [1, 2, 3, 4, 5]).join(','),
      item.startTime || '09:00',
      item.endTime || '18:00',
      item.active === false ? 'false' : 'true',
    ].join('|'))
    .join('\n');
}

function parseSupportAssigneeConfig(value) {
  const rows = String(value || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const assignees = rows.map((line, index) => {
    const [idRaw, nameRaw, roleRaw, weekdaysRaw, startRaw, endRaw, activeRaw] = line.split('|').map((part) => String(part || '').trim());
    const id = idRaw.replace(/\s+/g, '_').replace(/[^0-9A-Za-z._-]/g, '').slice(0, 40);
    if (!id) throw new Error(`第 ${index + 1} 行负责人账号无效`);
    const weekdays = weekdaysRaw.split(/[,，\s]+/).map((item) => Number(item)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    const startTime = startRaw || '09:00';
    const endTime = endRaw || '18:00';
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(endTime)) {
      throw new Error(`第 ${index + 1} 行排班时间应为 HH:mm`);
    }
    return {
      active: !['false', '0', '停用', 'off'].includes(activeRaw.toLowerCase()),
      endTime,
      id,
      name: (nameRaw || id).slice(0, 40),
      role: (roleRaw || '客服').slice(0, 24),
      startTime,
      weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5],
    };
  });
  if (!assignees.length) throw new Error('请至少配置一个客服负责人');
  if (new Set(assignees.map((item) => item.id)).size !== assignees.length) throw new Error('客服负责人账号不能重复');
  return assignees;
}

async function saveConfig(mode = 'publish') {
  const announcementEnabled = $('cfgAnnouncementEnabled').checked;
  if (announcementEnabled && (!$('cfgAnnouncementVersion').value.trim() || !$('cfgAnnouncementTitle').value.trim() || !$('cfgAnnouncementBody').value.trim())) {
    throw new Error('启用公告时，请填写版本、标题和正文');
  }
  const updateEnabled = $('cfgUpdateEnabled').checked;
  const updateForce = $('cfgUpdateForce').checked;
  const updateMinVersion = $('cfgUpdateMinVersion').value.trim();
  const updateLatestVersion = $('cfgUpdateLatestVersion').value.trim();
  const updateAndroidUrl = $('cfgUpdateAndroidUrl').value.trim();
  const updateIosUrl = $('cfgUpdateIosUrl').value.trim();
  const splashEnabled = $('cfgSplashEnabled').checked;
  if (updateEnabled && !updateMinVersion && !updateLatestVersion) {
    throw new Error('启用版本更新时，请至少填写最低可用版本或最新版本');
  }
  if (updateEnabled && !updateForce && !updateLatestVersion) {
    throw new Error('可选更新需要填写最新版本');
  }
  if (updateForce && (!updateMinVersion || (!updateAndroidUrl && !updateIosUrl))) {
    throw new Error('强制更新需要填写最低可用版本，并至少配置一个下载地址');
  }
  if ((updateAndroidUrl && !/^https?:\/\//i.test(updateAndroidUrl)) || (updateIosUrl && !/^https?:\/\//i.test(updateIosUrl))) {
    throw new Error('更新下载地址必须以 http:// 或 https:// 开头');
  }
  if (splashEnabled && (!$('cfgSplashVersion').value.trim() || !$('cfgSplashTitle').value.trim() || !$('cfgSplashBody').value.trim())) {
    throw new Error('启用启动提示时，请填写提示版本、标题和正文');
  }
  const supportFirstResponseSlaHours = {
    high: Number($('cfgSupportFirstSlaHigh').value),
    low: Number($('cfgSupportFirstSlaLow').value),
    normal: Number($('cfgSupportFirstSlaNormal').value),
    urgent: Number($('cfgSupportFirstSlaUrgent').value),
  };
  const supportSlaHours = {
    high: Number($('cfgSupportSlaHigh').value),
    low: Number($('cfgSupportSlaLow').value),
    normal: Number($('cfgSupportSlaNormal').value),
    urgent: Number($('cfgSupportSlaUrgent').value),
  };
  if ([...Object.values(supportFirstResponseSlaHours), ...Object.values(supportSlaHours)].some((value) => !Number.isFinite(value) || value < 1)) {
    throw new Error('工单 SLA 必须填写 1 小时以上的数字');
  }
  if (!(supportFirstResponseSlaHours.urgent <= supportFirstResponseSlaHours.high && supportFirstResponseSlaHours.high <= supportFirstResponseSlaHours.normal && supportFirstResponseSlaHours.normal <= supportFirstResponseSlaHours.low)) {
    throw new Error('首响 SLA 需要保持：紧急 <= 高优先级 <= 普通 <= 低优先级');
  }
  if (!(supportSlaHours.urgent <= supportSlaHours.high && supportSlaHours.high <= supportSlaHours.normal && supportSlaHours.normal <= supportSlaHours.low)) {
    throw new Error('工单 SLA 需要保持：紧急 <= 高优先级 <= 普通 <= 低优先级');
  }
  if (['urgent', 'high', 'normal', 'low'].some((priority) => supportFirstResponseSlaHours[priority] > supportSlaHours[priority])) {
    throw new Error('首响 SLA 不能大于同优先级的解决 SLA');
  }
  const supportAssignees = parseSupportAssigneeConfig($('cfgSupportAssignees').value);
  const supportBatchReplyMaxTickets = Number($('cfgSupportBatchReplyMaxTickets').value);
  const supportTargetFirstResponse = Number($('cfgSupportTargetFirstResponse').value);
  const supportTargetResolution = Number($('cfgSupportTargetResolution').value);
  const supportTargetRating = Number($('cfgSupportTargetRating').value);
  const supportTargetReopenRate = Number($('cfgSupportTargetReopenRate').value);
  const supportTargetLowRating = Number($('cfgSupportTargetLowRating').value);
  const supportReviewLowRating = Number($('cfgSupportReviewLowRating').value);
  const supportReviewReopenThreshold = Number($('cfgSupportReviewReopenThreshold').value);
  const supportSettlementResolvedTicket = Number($('cfgSupportSettlementResolvedTicket').value);
  const supportSettlementFirstBonus = Number($('cfgSupportSettlementFirstBonus').value);
  const supportSettlementSatisfactionBonus = Number($('cfgSupportSettlementSatisfactionBonus').value);
  const supportSettlementLowRatingPenalty = Number($('cfgSupportSettlementLowRatingPenalty').value);
  const supportSettlementReopenPenalty = Number($('cfgSupportSettlementReopenPenalty').value);
  const supportSettlementBreachPenalty = Number($('cfgSupportSettlementBreachPenalty').value);
  if (!Number.isFinite(supportBatchReplyMaxTickets) || supportBatchReplyMaxTickets < 1 || supportBatchReplyMaxTickets > 100) {
    throw new Error('批量回复单次上限必须在 1-100 之间');
  }
  if ([supportTargetFirstResponse, supportTargetResolution, supportTargetReopenRate].some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error('客服 KPI 百分比目标必须在 0-100 之间');
  }
  if (!Number.isFinite(supportTargetRating) || supportTargetRating < 1 || supportTargetRating > 5) {
    throw new Error('满意度目标必须在 1-5 之间');
  }
  if (!Number.isFinite(supportTargetLowRating) || supportTargetLowRating < 0 || supportTargetLowRating > 1000) {
    throw new Error('低分数量红线必须在 0-1000 之间');
  }
  if (!Number.isFinite(supportReviewLowRating) || supportReviewLowRating < 1 || supportReviewLowRating > 5) {
    throw new Error('低分质检阈值必须在 1-5 之间');
  }
  if (!Number.isFinite(supportReviewReopenThreshold) || supportReviewReopenThreshold < 1 || supportReviewReopenThreshold > 20) {
    throw new Error('重开触发次数必须在 1-20 之间');
  }
  const supportSettlementValues = [
    supportSettlementResolvedTicket,
    supportSettlementFirstBonus,
    supportSettlementSatisfactionBonus,
    supportSettlementLowRatingPenalty,
    supportSettlementReopenPenalty,
    supportSettlementBreachPenalty,
  ];
  if (supportSettlementValues.some((value) => !Number.isFinite(value) || value < 0 || value > 10000)) {
    throw new Error('客服结算预览金额必须在 0-10000 元之间');
  }
  const yuanToCents = (value) => Math.round(Number(value || 0) * 100);
  const analyticsSampleRatePercent = Number($('cfgAnalyticsSampleRatePercent').value);
  const analyticsRetentionDays = Number($('cfgAnalyticsRetentionDays').value);
  if (!Number.isFinite(analyticsSampleRatePercent) || analyticsSampleRatePercent < 0 || analyticsSampleRatePercent > 100) {
    throw new Error('事件埋点采样率必须在 0-100 之间');
  }
  if (!Number.isFinite(analyticsRetentionDays) || analyticsRetentionDays < 7 || analyticsRetentionDays > 180) {
    throw new Error('事件保留天数必须在 7-180 之间');
  }
  const messageAccessContextWindowLimit = Number($('cfgMessageAccessContextWindowLimit').value);
  const messageAccessRetentionDays = Number($('cfgMessageAccessRetentionDays').value);
  if (!Number.isFinite(messageAccessContextWindowLimit) || messageAccessContextWindowLimit < 5 || messageAccessContextWindowLimit > 50) {
    throw new Error('私信上下文窗口必须在 5-50 条之间');
  }
  if (!Number.isFinite(messageAccessRetentionDays) || messageAccessRetentionDays < 7 || messageAccessRetentionDays > 365) {
    throw new Error('私信审计保留标记必须在 7-365 天之间');
  }
  const configApprovalExpiresHours = Number($('cfgConfigApprovalExpiresHours').value);
  if (!Number.isFinite(configApprovalExpiresHours) || configApprovalExpiresHours < 1 || configApprovalExpiresHours > 168) {
    throw new Error('配置发布审批有效期必须在 1-168 小时之间');
  }
  const exportApprovalExpiresHours = Number($('cfgExportApprovalExpiresHours').value);
  if (!Number.isFinite(exportApprovalExpiresHours) || exportApprovalExpiresHours < 1 || exportApprovalExpiresHours > 168) {
    throw new Error('导出审批有效期必须在 1-168 小时之间');
  }
  const moderationSampleReviewRatePercent = Number($('cfgModerationSampleReviewRatePercent').value);
  if (!Number.isFinite(moderationSampleReviewRatePercent) || moderationSampleReviewRatePercent < 0 || moderationSampleReviewRatePercent > 100) {
    throw new Error('内容安全抽样复审率必须在 0-100 之间');
  }
  const placeContributionBadgeMinPoints = Number($('cfgPlaceContributionBadgeMinPoints').value);
  if (!Number.isFinite(placeContributionBadgeMinPoints) || placeContributionBadgeMinPoints < 1 || placeContributionBadgeMinPoints > 1000) {
    throw new Error('地点贡献身份展示门槛必须在 1-1000 分之间');
  }
  const placeReviewApiLimit = Number($('cfgPlaceReviewApiLimit').value);
  const placeReviewDetailDisplayLimit = Number($('cfgPlaceReviewDetailDisplayLimit').value);
  if (!Number.isInteger(placeReviewApiLimit) || placeReviewApiLimit < 3 || placeReviewApiLimit > 50) {
    throw new Error('地点公开点评后端返回条数必须是 3-50 之间的整数');
  }
  if (!Number.isInteger(placeReviewDetailDisplayLimit) || placeReviewDetailDisplayLimit < 1 || placeReviewDetailDisplayLimit > 12) {
    throw new Error('地点公开点评首屏展示条数必须是 1-12 之间的整数');
  }
  if (placeReviewDetailDisplayLimit > placeReviewApiLimit) {
    throw new Error('地点公开点评首屏展示条数不能大于后端返回条数');
  }
  const ttapiMjTimeout = Number($('cfgTtapiMjTimeout').value);
  if (!Number.isFinite(ttapiMjTimeout) || ttapiMjTimeout < 60 || ttapiMjTimeout > 1800) {
    throw new Error('TTAPI Midjourney timeout 必须在 60-1800 秒之间');
  }
  const deepSeekMaxTokens = Number($('cfgDeepSeekMaxTokens').value);
  if (!Number.isFinite(deepSeekMaxTokens) || deepSeekMaxTokens < 80 || deepSeekMaxTokens > 2000) {
    throw new Error('DeepSeek max_tokens 必须在 80-2000 之间');
  }
  const deepSeekTemperature = Number($('cfgDeepSeekTemperature').value);
  if (!Number.isFinite(deepSeekTemperature) || deepSeekTemperature < 0 || deepSeekTemperature > 2) {
    throw new Error('DeepSeek temperature 必须在 0-2 之间');
  }
  const homeAiEntryExperimentId = $('cfgExperimentHomeAiEntryId').value.trim();
  if (!homeAiEntryExperimentId) throw new Error('首页 AI 入口实验 ID 不能为空');
  const homeAiEntryRolloutPercent = Number($('cfgExperimentHomeAiEntryRollout').value);
  if (!Number.isFinite(homeAiEntryRolloutPercent) || homeAiEntryRolloutPercent < 0 || homeAiEntryRolloutPercent > 100) {
    throw new Error('首页 AI 入口实验参与流量必须在 0-100 之间');
  }
  const homeAiEntryVariantBPercent = Number($('cfgExperimentHomeAiEntryVariantB').value);
  if (!Number.isFinite(homeAiEntryVariantBPercent) || homeAiEntryVariantBPercent < 0 || homeAiEntryVariantBPercent > 100) {
    throw new Error('首页 AI 入口实验 B 组比例必须在 0-100 之间');
  }
  const payload = {
    ai: {
      avatarAnimation: {
        enabled: $('cfgAiAvatarAnimationEnabled').checked,
        provider: $('cfgAiAvatarAnimationProvider').value,
        seedance: {
          aspectRatio: '1:1',
          cameraFixed: $('cfgSeedanceCameraFixed').checked,
          catPromptTemplate: $('cfgSeedanceCatPromptTemplate').value,
          defaultPromptTemplate: $('cfgSeedanceDefaultPromptTemplate').value,
          dogPromptTemplate: $('cfgSeedanceDogPromptTemplate').value,
          duration: 4,
          model: $('cfgSeedanceModel').value,
          negativePromptTemplate: $('cfgSeedanceNegativePromptTemplate').value,
          resolution: '480p',
        },
      },
      avatar: {
        gptImage2: {
          model: $('cfgGptImage2Model').value,
          officialFallback: $('cfgGptImage2OfficialFallback').checked,
          promptTemplate: $('cfgGptImage2PromptTemplate').value,
          promptVersion: $('cfgGptImage2PromptVersion').value,
          resolution: $('cfgGptImage2Resolution').value,
          size: $('cfgGptImage2Size').value,
        },
        provider: $('cfgAiAvatarProvider').value,
        ttapiFlux: {
          mode: $('cfgTtapiFluxMode').value,
          promptTemplate: $('cfgTtapiFluxPromptTemplate').value,
        },
        ttapiMidjourney: {
          autoUpsample: $('cfgTtapiMjAutoUpsample').checked,
          mode: $('cfgTtapiMjMode').value,
          promptTemplate: $('cfgTtapiMjPromptTemplate').value,
          timeout: ttapiMjTimeout,
        },
      },
      avatarFailureRefund: {
        enabled: $('cfgAvatarFailureRefundEnabled').checked,
        providerFailure: $('cfgAvatarFailureRefundProviderFailure').checked,
        providerStartFailure: $('cfgAvatarFailureRefundProviderStart').checked,
        providerTimeout: $('cfgAvatarFailureRefundProviderTimeout').checked,
      },
      petChat: {
        deepseek: {
          baseSystemPrompt: $('cfgDeepSeekBaseSystemPrompt').value,
          maxTokens: deepSeekMaxTokens,
          model: $('cfgDeepSeekModel').value,
          temperature: deepSeekTemperature,
          thinking: $('cfgDeepSeekThinking').value,
        },
        provider: $('cfgPetChatProvider').value,
      },
      petAvatarDailyLimit: Number($('cfgPetAvatarDailyLimit').value),
      petChatDailyLimit: Number($('cfgPetChatDailyLimit').value),
    },
    analytics: {
      enabled: $('cfgAnalyticsEnabled').checked,
      retentionDays: analyticsRetentionDays,
      sampleRatePercent: analyticsSampleRatePercent,
    },
    configApproval: {
      approvalExpiresHours: configApprovalExpiresHours,
      requireApproval: $('cfgConfigApprovalRequireApproval').checked,
    },
    experiments: {
      homeAiEntry: {
        controlSubtitle: $('cfgExperimentHomeAiEntryControlSubtitle').value,
        controlTitle: $('cfgExperimentHomeAiEntryControlTitle').value,
        enabled: $('cfgExperimentHomeAiEntryEnabled').checked,
        id: homeAiEntryExperimentId,
        name: $('cfgExperimentHomeAiEntryName').value,
        rolloutPercent: homeAiEntryRolloutPercent,
        treatmentSubtitle: $('cfgExperimentHomeAiEntryTreatmentSubtitle').value,
        treatmentTitle: $('cfgExperimentHomeAiEntryTreatmentTitle').value,
        variantBPercent: homeAiEntryVariantBPercent,
      },
    },
    app: {
      announcement: {
        actionLabel: $('cfgAnnouncementActionLabel').value,
        actionRoute: $('cfgAnnouncementActionRoute').value,
        body: $('cfgAnnouncementBody').value,
        enabled: announcementEnabled,
        title: $('cfgAnnouncementTitle').value,
        version: $('cfgAnnouncementVersion').value,
      },
      maintenanceEnabled: $('cfgMaintenanceEnabled').checked,
      maintenanceMessage: $('cfgMaintenanceMessage').value,
      splash: {
        actionLabel: $('cfgSplashActionLabel').value,
        actionRoute: $('cfgSplashActionRoute').value,
        body: $('cfgSplashBody').value,
        enabled: splashEnabled,
        imageUrl: $('cfgSplashImageUrl').value,
        title: $('cfgSplashTitle').value,
        version: $('cfgSplashVersion').value,
      },
      update: {
        androidUrl: updateAndroidUrl,
        enabled: updateEnabled,
        force: updateForce,
        iosUrl: updateIosUrl,
        latestVersion: updateLatestVersion,
        minVersion: updateMinVersion,
        rolloutPercent: Number($('cfgUpdateRolloutPercent').value),
        subtitle: $('cfgUpdateSubtitle').value,
        title: $('cfgUpdateTitle').value,
      },
    },
    features: {
      aiAvatar: $('cfgFeatureAiAvatar').checked,
      petChat: $('cfgFeaturePetChat').checked,
      petCircle: $('cfgFeaturePetCircle').checked,
      places: $('cfgFeaturePlaces').checked,
      walkInvite: $('cfgFeatureWalkInvite').checked,
    },
    exports: {
      approvalExpiresHours: exportApprovalExpiresHours,
      requireApproval: $('cfgExportRequireApproval').checked,
    },
    moderation: {
      blockKeywords: $('cfgModerationBlockKeywords').value,
      blockMessage: $('cfgModerationBlockMessage').value,
      enabled: $('cfgModerationEnabled').checked,
      highRiskKeywords: $('cfgModerationHighRiskKeywords').value,
      machineImageEnabled: $('cfgModerationMachineImageEnabled').checked,
      machineTextEnabled: $('cfgModerationMachineTextEnabled').checked,
      publicHint: {
        commentText: $('cfgModerationPublicHintCommentText').value,
        enabled: $('cfgModerationPublicHintEnabled').checked,
        imageText: $('cfgModerationPublicHintImageText').value,
        placeText: $('cfgModerationPublicHintPlaceText').value,
        postText: $('cfgModerationPublicHintPostText').value,
      },
      reviewKeywords: $('cfgModerationReviewKeywords').value,
      reviewMessage: $('cfgModerationReviewMessage').value,
      sampleReviewRatePercent: moderationSampleReviewRatePercent,
      textRulesEnabled: $('cfgModerationTextRulesEnabled').checked,
    },
    notifications: {
      maxCampaignsPerDay: Number($('cfgNotificationMaxCampaignsPerDay').value),
      maxPerUserPerDay: Number($('cfgNotificationMaxPerUserPerDay').value),
      rateLimitEnabled: $('cfgNotificationRateLimitEnabled').checked,
      requireApproval: $('cfgNotificationRequireApproval').checked,
    },
    places: {
      contributionBadgeMinPoints: placeContributionBadgeMinPoints,
      contributionBadgesEnabled: $('cfgPlaceContributionBadgesEnabled').checked,
      publicReviews: {
        apiLimit: placeReviewApiLimit,
        detailDisplayLimit: placeReviewDetailDisplayLimit,
        requirePhotos: $('cfgPlaceReviewRequirePhotos').checked,
        sort: $('cfgPlaceReviewSort').value,
      },
    },
    reason: mode === 'draft' ? '配置草稿保存' : '配置中心发布',
    social: {
      discoverRadiusKm: Number($('cfgDiscoverRadiusKm').value),
      messageAccess: {
        contextWindowLimit: messageAccessContextWindowLimit,
        fullConversationSearchEnabled: false,
        requireReason: $('cfgMessageAccessRequireReason').checked,
        retentionDays: messageAccessRetentionDays,
      },
      nearbyMomentTtlDays: Number($('cfgNearbyMomentTtlDays').value),
      petCircleMaxPhotos: Number($('cfgPetCircleMaxPhotos').value),
    },
    support: {
      assignees: supportAssignees,
      batchReply: {
        enabled: $('cfgSupportBatchReplyEnabled').checked,
        maxTickets: supportBatchReplyMaxTickets,
        requireApproval: $('cfgSupportBatchReplyRequireApproval').checked,
      },
      firstResponseSlaHours: supportFirstResponseSlaHours,
      qualityReview: {
        closedWithoutReply: true,
        enabled: $('cfgSupportQualityReviewEnabled').checked,
        firstResponseBreach: true,
        lowRatingThreshold: supportReviewLowRating,
        reopenThreshold: supportReviewReopenThreshold,
        resolutionBreach: true,
      },
      qualityTargets: {
        avgRating: supportTargetRating,
        firstResponseSlaRate: supportTargetFirstResponse,
        lowRatingMax: supportTargetLowRating,
        reopenRateMax: supportTargetReopenRate,
        resolutionSlaRate: supportTargetResolution,
      },
      settlement: {
        breachPenaltyCents: yuanToCents(supportSettlementBreachPenalty),
        currency: 'CNY',
        firstResponseBonusCents: yuanToCents(supportSettlementFirstBonus),
        lowRatingPenaltyCents: yuanToCents(supportSettlementLowRatingPenalty),
        previewEnabled: $('cfgSupportSettlementPreviewEnabled').checked,
        reopenPenaltyCents: yuanToCents(supportSettlementReopenPenalty),
        resolvedTicketCents: yuanToCents(supportSettlementResolvedTicket),
        satisfactionBonusCents: yuanToCents(supportSettlementSatisfactionBonus),
      },
      resolutionSlaHours: supportSlaHours,
      slaHours: supportSlaHours,
    },
  };
  const promptLabel = mode === 'draft' ? '请输入草稿说明' : mode === 'approval' ? '请输入审批申请原因' : mode === 'schedule' ? '请输入预约发布原因' : '请输入发布原因';
  const defaultReason = mode === 'draft' ? '配置草稿保存' : mode === 'approval' ? '提交配置发布审批' : mode === 'schedule' ? '预约发布配置' : '配置中心发布';
  const reason = window.prompt(promptLabel, defaultReason);
  if (reason === null) return;
  payload.reason = reason.trim() || defaultReason;
  let nextConfig = null;
  if (mode === 'draft') {
    nextConfig = await post('/admin/config/drafts', payload);
  } else if (mode === 'approval') {
    nextConfig = await submitConfigMutationWithRiskConfirmation(
      (nextPayload) => post('/admin/config/approvals', { ...nextPayload, action: 'publish' }),
      payload,
      '提交配置发布审批',
    );
  } else if (mode === 'schedule') {
    payload.action = 'publish';
    payload.scheduledAt = scheduledAtFromLocalInput($('cfgPublishScheduledAt')?.value);
    nextConfig = await submitConfigMutationWithRiskConfirmation(
      (nextPayload) => post('/admin/config/schedules', nextPayload),
      payload,
      '预约发布配置',
    );
  } else {
    nextConfig = await submitConfigMutationWithRiskConfirmation((nextPayload) => patch('/admin/config', nextPayload), payload, '立即发布配置');
  }
  if (!nextConfig) return;
  state.cache.config = nextConfig;
  state.cache.summary = null;
  state.cache.aiPromptVersions = null;
  showToast(mode === 'draft' ? '配置草稿已保存' : mode === 'approval' ? '配置发布审批已提交' : mode === 'schedule' ? '配置预约发布已创建' : '配置已发布');
  await render(true);
}

async function publishConfigDraft(id) {
  if (!id) return;
  const reason = window.prompt('请输入发布草稿的原因', `发布配置草稿 ${id}`);
  if (reason === null) return;
  const payload = {
    reason: reason.trim() || `发布配置草稿 ${id}`,
  };
  const nextConfig = await submitConfigMutationWithRiskConfirmation(
    (nextPayload) => post(`/admin/config/drafts/${encodeURIComponent(id)}/publish`, nextPayload),
    payload,
    '发布配置草稿',
  );
  if (!nextConfig) return;
  state.cache.config = nextConfig;
  state.cache.summary = null;
  state.cache.aiPromptVersions = null;
  showToast('配置草稿已发布');
  await render(true);
}

async function scheduleConfigDraft(id) {
  if (!id) return;
  let scheduledAt = '';
  try {
    scheduledAt = promptConfigScheduledAt();
  } catch (error) {
    showToast(error.message || '预约发布时间无效');
    return;
  }
  if (!scheduledAt) return;
  const reason = window.prompt('请输入预约发布草稿的原因', `预约发布配置草稿 ${id}`);
  if (reason === null) return;
  const payload = {
    action: 'draft_publish',
    draftId: id,
    reason: reason.trim() || `预约发布配置草稿 ${id}`,
    scheduledAt,
  };
  const nextConfig = await submitConfigMutationWithRiskConfirmation(
    (nextPayload) => post('/admin/config/schedules', nextPayload),
    payload,
    '预约发布配置草稿',
  );
  if (!nextConfig) return;
  state.cache.config = nextConfig;
  state.cache.summary = null;
  state.cache.aiPromptVersions = null;
  showToast('配置草稿预约发布已创建');
  await render(true);
}

async function requestConfigApprovalForDraft(id) {
  if (!id) return;
  const reason = window.prompt('请输入审批申请原因', `提交发布配置草稿 ${id}`);
  if (reason === null) return;
  const payload = {
    action: 'draft_publish',
    draftId: id,
    reason: reason.trim() || `提交发布配置草稿 ${id}`,
  };
  const nextConfig = await submitConfigMutationWithRiskConfirmation(
    (nextPayload) => post('/admin/config/approvals', nextPayload),
    payload,
    '提交配置草稿发布审批',
  );
  if (!nextConfig) return;
  state.cache.config = nextConfig;
  state.cache.summary = null;
  state.cache.aiPromptVersions = null;
  showToast('配置草稿发布审批已提交');
  await render(true);
}

async function discardConfigDraft(id) {
  if (!id) return;
  const reason = window.prompt('请输入废弃草稿的原因', `废弃配置草稿 ${id}`);
  if (reason === null) return;
  state.cache.config = await post(`/admin/config/drafts/${encodeURIComponent(id)}/discard`, {
    reason: reason.trim() || `废弃配置草稿 ${id}`,
  });
  showToast('配置草稿已废弃');
  await render(true);
}

async function rollbackConfigRevision(id) {
  if (!id) return;
  const reason = window.prompt('请输入回滚原因', `回滚到配置版本 ${id}`);
  if (reason === null) return;
  const payload = {
    reason: reason.trim() || `回滚到配置版本 ${id}`,
  };
  const nextConfig = await submitConfigMutationWithRiskConfirmation(
    (nextPayload) => post(`/admin/config/revisions/${encodeURIComponent(id)}/rollback`, nextPayload),
    payload,
    '回滚配置版本',
  );
  if (!nextConfig) return;
  state.cache.config = nextConfig;
  state.cache.summary = null;
  state.cache.aiPromptVersions = null;
  showToast('配置已回滚');
  await render(true);
}

async function scheduleConfigRollback(id) {
  if (!id) return;
  let scheduledAt = '';
  try {
    scheduledAt = promptConfigScheduledAt();
  } catch (error) {
    showToast(error.message || '预约发布时间无效');
    return;
  }
  if (!scheduledAt) return;
  const reason = window.prompt('请输入预约回滚原因', `预约回滚到配置版本 ${id}`);
  if (reason === null) return;
  const payload = {
    action: 'rollback',
    reason: reason.trim() || `预约回滚到配置版本 ${id}`,
    revisionId: id,
    scheduledAt,
  };
  const nextConfig = await submitConfigMutationWithRiskConfirmation(
    (nextPayload) => post('/admin/config/schedules', nextPayload),
    payload,
    '预约回滚配置版本',
  );
  if (!nextConfig) return;
  state.cache.config = nextConfig;
  state.cache.summary = null;
  state.cache.aiPromptVersions = null;
  showToast('配置回滚预约已创建');
  await render(true);
}

async function requestConfigApprovalForRollback(id) {
  if (!id) return;
  const reason = window.prompt('请输入审批申请原因', `提交回滚到配置版本 ${id}`);
  if (reason === null) return;
  const payload = {
    action: 'rollback',
    reason: reason.trim() || `提交回滚到配置版本 ${id}`,
    revisionId: id,
  };
  const nextConfig = await submitConfigMutationWithRiskConfirmation(
    (nextPayload) => post('/admin/config/approvals', nextPayload),
    payload,
    '提交配置回滚审批',
  );
  if (!nextConfig) return;
  state.cache.config = nextConfig;
  state.cache.summary = null;
  state.cache.aiPromptVersions = null;
  showToast('配置回滚审批已提交');
  await render(true);
}

async function approveConfigApproval(id) {
  if (!id) return;
  const reason = window.prompt('请输入审批说明', '审批通过配置发布');
  if (reason === null) return;
  state.cache.config = await post(`/admin/config/approvals/${encodeURIComponent(id)}/approve`, {
    reason: reason.trim() || '审批通过配置发布',
  });
  state.cache.summary = null;
  state.cache.aiPromptVersions = null;
  showToast('配置审批已发布');
  await render(true);
}

async function cancelConfigApproval(id) {
  if (!id) return;
  const reason = window.prompt('请输入取消原因', '取消配置审批');
  if (reason === null) return;
  state.cache.config = await post(`/admin/config/approvals/${encodeURIComponent(id)}/cancel`, {
    reason: reason.trim() || '取消配置审批',
  });
  showToast('配置审批已取消');
  await render(true);
}

async function cancelConfigSchedule(id) {
  if (!id) return;
  const reason = window.prompt('请输入取消预约原因', '取消配置预约发布');
  if (reason === null) return;
  state.cache.config = await post(`/admin/config/schedules/${encodeURIComponent(id)}/cancel`, {
    reason: reason.trim() || '取消配置预约发布',
  });
  state.cache.summary = null;
  state.cache.aiPromptVersions = null;
  showToast('配置预约已取消');
  await render(true);
}

function exportQueryParams(options = {}) {
  const query = new URLSearchParams();
  if (state.exportStatus && state.exportStatus !== 'all') query.set('status', state.exportStatus);
  if (state.exportPhone) query.set('phone', state.exportPhone);
  if (state.exportFrom) query.set('from', state.exportFrom);
  if (state.exportTo) query.set('to', state.exportTo);
  if (state.exportQ) query.set('q', state.exportQ);
  if (options.includeReason && state.exportReason) query.set('reason', state.exportReason);
  return query;
}

function exportHistoryUrl() {
  const query = new URLSearchParams({ limit: '20' });
  if (state.exportType !== 'all') query.set('type', state.exportType);
  return `/admin/exports/history?${query.toString()}`;
}

function exportApprovalsUrl() {
  const query = new URLSearchParams({ limit: '20', status: state.exportApprovalStatus || 'open' });
  if (state.exportType !== 'all') query.set('type', state.exportType);
  return `/admin/exports/approvals?${query.toString()}`;
}

function exportFiltersPayload() {
  return {
    from: state.exportFrom,
    phone: state.exportPhone,
    q: state.exportQ,
    status: state.exportStatus,
    to: state.exportTo,
  };
}

function exportFilterSummary(rows = []) {
  const dataset = rows.find((row) => row.type === state.exportType);
  const parts = [];
  if (state.exportType !== 'all') parts.push(`数据集=${dataset?.label || state.exportType}`);
  if (state.exportStatus !== 'all') parts.push(`状态=${state.exportStatus}`);
  if (state.exportPhone) parts.push(`手机号=${state.exportPhone}`);
  if (state.exportFrom) parts.push(`开始=${state.exportFrom}`);
  if (state.exportTo) parts.push(`结束=${state.exportTo}`);
  if (state.exportQ) parts.push(`关键词=${state.exportQ}`);
  return parts.join('；') || '未筛选';
}

function exportStatusOptions() {
  const options = [
    ['all', '全部状态'],
    ['active', 'active'],
    ['open', 'open'],
    ['pending', 'pending'],
    ['reviewing', 'reviewing'],
    ['escalated', 'escalated'],
    ['approved', 'approved'],
    ['rejected', 'rejected'],
    ['resolved', 'resolved'],
    ['closed', 'closed'],
    ['ready', 'ready'],
    ['processing', 'processing'],
    ['done', 'done'],
    ['failed', 'failed'],
    ['stuck', 'stuck'],
    ['hidden', 'hidden'],
    ['deleted', 'deleted'],
    ['pending_review', 'pending_review'],
    ['revoked', 'revoked'],
    ['expired', 'expired'],
  ];
  return options
    .map(([value, label]) => `<option value="${escapeHtml(value)}" ${state.exportStatus === value ? 'selected' : ''}>${escapeHtml(label)}</option>`)
    .join('');
}

function exportDatasetOptions(rows = []) {
  return [
    `<option value="all" ${state.exportType === 'all' ? 'selected' : ''}>全部数据集</option>`,
    ...rows.map((row) => `<option value="${escapeHtml(row.type)}" ${state.exportType === row.type ? 'selected' : ''}>${escapeHtml(row.label)}</option>`),
  ].join('');
}

function exportApprovalStatusLabel(status) {
  return {
    all: '全部审批',
    approved: '已审批',
    canceled: '已取消',
    expired: '已过期',
    open: '待处理/可下载',
    pending_approval: '待审批',
  }[status] || status || '-';
}

function exportApprovalStatusOptions() {
  return ['open', 'pending_approval', 'approved', 'expired', 'canceled', 'all']
    .map((status) => `<option value="${status}" ${state.exportApprovalStatus === status ? 'selected' : ''}>${escapeHtml(exportApprovalStatusLabel(status))}</option>`)
    .join('');
}

function exportApprovalTone(status) {
  return status === 'approved' ? 'ok' : status === 'pending_approval' ? 'warn' : status === 'expired' || status === 'canceled' ? 'bad' : '';
}

function renderExportApprovals(approvals = {}) {
  const items = approvals.items || [];
  const summary = approvals.summary || {};
  const policy = approvals.policy || {};
  return `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>导出审批</h2>
          <div class="section-sub">${numberText(summary.pending || 0)} 条待审批 · ${numberText(summary.approved || 0)} 条已审批 · 有效期 ${numberText(policy.approvalExpiresHours || 24)} 小时</div>
        </div>
        ${help('开启强制审批后，CSV 下载必须使用已审批且未过期的 approvalId；审批会绑定数据集、筛选条件和导出原因，避免审批一个范围却下载另一个范围。当前仍是单 admin 版本，生产多管理员后可升级为双人审批。')}
      </div>
      <div class="toolbar moderation-toolbar">
        <div class="toolbar-left">
          <label>审批状态<select id="exportApprovalStatus">${exportApprovalStatusOptions()}</select></label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="export-approval-filter">筛选审批</button>
        </div>
      </div>
      ${items.length ? tableHtml(items, [
        ['数据集', (row) => `<div class="cell-title">${escapeHtml(row.datasetLabel || '-')}</div><div class="cell-sub">${escapeHtml(row.datasetType || '-')}</div>`],
        ['状态', (row) => `${tonePill(row.statusLabel || row.status, exportApprovalTone(row.status))}<div class="cell-sub">${row.expiresAt ? `有效至 ${formatTime(row.expiresAt)}` : '待审批后生成有效期'}</div>`],
        ['筛选/行数', (row) => `<div class="cell-sub clamp">${escapeHtml(row.filterSummary || '全部数据')}</div><div class="cell-sub">导出 ${numberText(row.rowCount || 0)} / 匹配 ${numberText(row.matchedRows || 0)} / 原始 ${numberText(row.totalRows || 0)}</div>`],
        ['敏感字段', (row) => `<div class="export-fields">${(row.sensitiveColumns || []).slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join('') || '<span>无明显敏感列</span>'}${(row.sensitiveColumns || []).length > 6 ? `<span>+${(row.sensitiveColumns || []).length - 6}</span>` : ''}</div>`],
        ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.exportReason || '-')}</div><div class="cell-sub">${escapeHtml(row.createdBy || '-')} · ${formatTime(row.createdAt)}</div>`],
        ['操作', (row) => `
          <div class="actions">
            ${row.status === 'pending_approval' ? `<button class="small-button" data-action="approve-export-approval" data-id="${escapeHtml(row.id)}">审批通过</button>` : ''}
            ${row.status === 'approved' ? `<button class="small-button" data-action="download-approved-export" data-id="${escapeHtml(row.id)}" data-export-type="${escapeHtml(row.datasetType)}" data-export-reason="${escapeHtml(row.exportReason || '')}" data-filters="${escapeHtml(JSON.stringify(row.filters || {}))}">下载 CSV</button>` : ''}
            ${row.status === 'pending_approval' || row.status === 'approved' ? `<button class="small-button danger" data-action="cancel-export-approval" data-id="${escapeHtml(row.id)}">取消</button>` : ''}
          </div>
          <div class="cell-sub">${row.downloadCount ? `已下载 ${numberText(row.downloadCount)} 次 · ${formatTime(row.lastDownloadedAt)}` : escapeHtml(row.id || '-')}</div>
        `],
      ], '暂无导出审批') : '<div class="placeholder mini"><div><strong>暂无导出审批</strong><div>在数据集列表点击“提交审批”后，会在这里等待审批。</div></div></div>'}
    </div>
  `;
}

async function renderExports(force) {
  const query = exportQueryParams();
  const exportUrl = query.toString() ? `/admin/exports?${query.toString()}` : '/admin/exports';
  const rows = await load('exports', exportUrl, force);
  const history = await api(exportHistoryUrl());
  const approvals = await api(exportApprovalsUrl());
  const approvalPolicy = approvals.policy || {};
  const visibleRows = state.exportType === 'all' ? rows : rows.filter((row) => row.type === state.exportType);
  const matchedRows = visibleRows.reduce((sum, item) => sum + Number(item.rowCount || 0), 0);
  const originalRows = visibleRows.reduce((sum, item) => sum + Number(item.totalRows ?? item.rowCount ?? 0), 0);
  const activeFilterSummary = exportFilterSummary(rows);
  const historyRows = history.items || [];
  const historySummary = history.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('可导出数据集', visibleRows.length, `${rows.length} 个总数据集`, '导出接口需要管理员登录，并会写入审计日志。')}
      ${metric('匹配行数', matchedRows, `${originalRows} 条原始行`, '按当前筛选条件命中的业务行数；CSV 仍受单次上限保护。')}
      ${metric('单次上限', rows[0]?.limit || 1000, '每个 CSV 最多行数', '防止误导出过大文件；后续可增加审批和异步导出。')}
      ${metric('导出审批', approvalPolicy.requireApproval ? '强制' : '可选', `${numberText(approvals.summary?.pending || 0)} 条待审批`, '开启强制审批后，CSV 下载必须绑定已审批的审批单；审批单会校验数据集、筛选条件、原因和有效期。')}
      ${metric('筛选条件', activeFilterSummary === '未筛选' ? '未开启' : '已开启', activeFilterSummary, '下载 CSV 时会带上这些筛选条件，并写入审计日志。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>导出数据</h2>
          <div class="section-sub">下载会生成 CSV 文件，并记录到系统审计</div>
        </div>
        ${help('当前不导出图片二进制、设备 token、完整审计 before/after 快照等大字段。手机号、内容、地址、经纬度、IP 等列会在审批卡片中提示。')}
      </div>
      <div class="toolbar moderation-toolbar">
        <div class="toolbar-left">
          <label>数据集<select id="exportType">${exportDatasetOptions(rows)}</select></label>
          <label>状态<select id="exportStatus">${exportStatusOptions()}</select></label>
          <label>手机号<input id="exportPhone" value="${escapeHtml(state.exportPhone)}" placeholder="支持部分手机号" /></label>
          <label>开始日期<input id="exportFrom" type="date" value="${escapeHtml(state.exportFrom)}" /></label>
          <label>结束日期<input id="exportTo" type="date" value="${escapeHtml(state.exportTo)}" /></label>
          <input id="exportQ" value="${escapeHtml(state.exportQ)}" placeholder="关键词：ID / 昵称 / 内容 / 原因" />
          <input id="exportReason" value="${escapeHtml(state.exportReason)}" placeholder="导出原因，必填，例如：排查用户反馈" />
        </div>
        <div class="actions">
          <button class="small-button" data-action="export-filter">筛选</button>
          <button class="small-button ghost" data-action="export-clear">清空</button>
        </div>
      </div>
      ${tableHtml(visibleRows, [
        ['数据集', (row) => `<div class="cell-title">${escapeHtml(row.label)}</div><div class="cell-sub">${escapeHtml(row.type)}</div><div class="cell-sub">${escapeHtml(row.description)}</div>`],
        ['当前行数', (row) => `<div class="cell-title">${escapeHtml(row.rowCount)}</div><div class="cell-sub">原始 ${escapeHtml(row.totalRows ?? row.rowCount)} · 上限 ${escapeHtml(row.limit)}</div>`],
        ['字段', (row) => `<div class="export-fields">${(row.columns || []).slice(0, 8).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}${(row.columns || []).length > 8 ? `<span>+${(row.columns || []).length - 8}</span>` : ''}</div><div class="cell-sub">敏感列 ${numberText(row.sensitiveColumnCount || 0)} 个</div>`],
        ['操作', (row) => `
          <div class="actions">
            <button class="small-button" data-action="request-export-approval" data-id="${escapeHtml(row.type)}">提交审批</button>
            ${approvalPolicy.requireApproval ? '' : `<button class="small-button" data-action="download-export" data-id="${escapeHtml(row.type)}">直接下载</button>`}
          </div>
          <div class="cell-sub">${escapeHtml(row.filterSummary || activeFilterSummary)}</div>
          <div class="cell-sub">${escapeHtml(row.governanceLabel || '需原因 · CSV水印')}</div>
        `],
      ], '暂无可导出数据')}
    </div>
    ${renderExportApprovals(approvals)}
    <div class="card">
      <div class="section-head">
        <div>
          <h2>最近导出记录</h2>
          <div class="section-sub">${escapeHtml(state.exportType === 'all' ? '所有数据集' : visibleRows[0]?.label || state.exportType)} · 匹配 ${escapeHtml(historySummary.matched || 0)} 条 · 最近 ${escapeHtml(formatTime(historySummary.lastExportAt))}</div>
        </div>
        ${help('这里复用审计日志里的 data.export.download 记录，展示最近导出的数据集、筛选条件、行数、管理员和 IP；不展示 before/after 大对象。')}
      </div>
      ${tableHtml(historyRows, [
        ['数据集', (row) => `<div class="cell-title">${escapeHtml(row.datasetLabel || '-')}</div><div class="cell-sub">${escapeHtml(row.datasetType || '-')}</div>`],
        ['文件/水印', (row) => `<div class="cell-sub clamp">${escapeHtml(row.filename || '-')}</div><div class="cell-sub">字段 ${escapeHtml(row.columnsCount || 0)} 个 · 水印 ${escapeHtml(row.watermarkId || '-')}</div><div class="cell-sub">审批 ${escapeHtml(row.approvalId || '直接下载')}</div>`],
        ['筛选/行数', (row) => `<div class="cell-sub clamp">${escapeHtml(row.filterSummary || '全部数据')}</div><div class="cell-sub">导出 ${escapeHtml(row.rowCount || 0)} / 匹配 ${escapeHtml(row.matchedRows || 0)} / 原始 ${escapeHtml(row.totalRows || 0)}</div>`],
        ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.exportReason || row.reason || '-')}</div>`],
        ['管理员', (row) => `<div>${escapeHtml(row.adminName || '-')}</div><div class="cell-sub">${escapeHtml(row.ip || 'IP 未记录')}</div>`],
        ['时间', (row) => `<div>${formatTime(row.createdAt)}</div><div class="cell-sub clamp">${escapeHtml(row.userAgent || 'UA 未记录')}</div>`],
      ], '暂无导出记录')}
    </div>
  `;
}

async function requestExportApproval(type) {
  if (!type) return;
  state.exportReason = $('exportReason')?.value.trim() || state.exportReason;
  if (state.exportReason.length < 4) {
    showToast('请先填写导出原因，至少 4 个字');
    return;
  }
  const result = await post('/admin/exports/approvals', {
    filters: exportFiltersPayload(),
    reason: state.exportReason,
    type,
  });
  state.cache.audit = null;
  state.cache.exports = null;
  showToast(`导出审批已提交：${result.approval?.datasetLabel || type}`);
  if (state.route === 'exports') await render(true);
}

async function approveExportApproval(id) {
  if (!id) return;
  const reason = window.prompt('请输入审批说明', '审批通过导出申请');
  if (reason === null) return;
  await post(`/admin/exports/approvals/${encodeURIComponent(id)}/approve`, {
    reason: reason.trim() || '审批通过导出申请',
  });
  state.cache.audit = null;
  state.cache.exports = null;
  showToast('导出审批已通过');
  if (state.route === 'exports') await render(true);
}

async function cancelExportApproval(id) {
  if (!id) return;
  const reason = window.prompt('请输入取消原因', '取消导出审批');
  if (reason === null) return;
  await post(`/admin/exports/approvals/${encodeURIComponent(id)}/cancel`, {
    reason: reason.trim() || '取消导出审批',
  });
  state.cache.audit = null;
  state.cache.exports = null;
  showToast('导出审批已取消');
  if (state.route === 'exports') await render(true);
}

async function downloadExport(type, approvalId = '') {
  if (!type) return;
  if (!approvalId) state.exportReason = $('exportReason')?.value.trim() || state.exportReason;
  if (state.exportReason.length < 4) {
    showToast('请先填写导出原因，至少 4 个字');
    return;
  }
  const query = exportQueryParams({ includeReason: true });
  if (approvalId) query.set('approvalId', approvalId);
  const queryText = query.toString();
  const response = await fetch(`/admin/exports/${encodeURIComponent(type)}.csv${queryText ? `?${queryText}` : ''}`, {
    headers: {
      Accept: 'text/csv',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error?.message || `导出失败：${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : `lumii-${type}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  state.cache.audit = null;
  state.cache.exports = null;
  showToast('导出已开始下载');
  if (state.route === 'exports') await render(true);
}

function auditOptionList(values = [], current = 'all', allLabel = '全部') {
  return [
    `<option value="all" ${current === 'all' ? 'selected' : ''}>${allLabel}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}" ${current === value ? 'selected' : ''}>${escapeHtml(value)}</option>`),
  ].join('');
}

function auditSnapshotSummary(value) {
  if (!value) return '<span class="cell-sub">无</span>';
  if (typeof value !== 'object') return `<div class="cell-sub clamp">${escapeHtml(String(value)).slice(0, 180)}</div>`;
  const keys = Object.keys(value).slice(0, 5);
  if (!keys.length) return '<span class="cell-sub">空对象</span>';
  const parts = keys.map((key) => {
    const raw = value[key];
    const text = raw && typeof raw === 'object' ? Array.isArray(raw) ? `[${raw.length}]` : '{...}' : String(raw ?? '');
    return `${key}: ${text}`.slice(0, 70);
  });
  return `<div class="cell-sub clamp">${escapeHtml(parts.join(' · '))}</div>`;
}

async function renderAudit(force) {
  const query = new URLSearchParams({
    action: state.auditAction,
    admin: state.auditAdmin,
    from: state.auditFrom,
    q: state.auditQ,
    targetType: state.auditTargetType,
    to: state.auditTo,
  });
  const data = await load('audit', `/admin/audit-logs?${query.toString()}`, force);
  const rows = Array.isArray(data) ? data : data.items || [];
  const summary = Array.isArray(data) ? { matched: rows.length, total: rows.length } : data.summary || {};
  const filters = Array.isArray(data) ? { actions: [], admins: [], targetTypes: [] } : data.filters || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('匹配日志', numberText(summary.matched || 0), `${numberText(summary.total || 0)} 条总审计`, '按当前筛选条件命中的审计记录数量。')}
      ${metric('高风险动作', numberText(summary.highRisk || 0), '删除/隐藏/处罚/配置/导出等', '用于快速复核影响用户或系统配置的后台动作。')}
      ${metric('缺少原因', numberText(summary.missingReason || 0), '高风险动作原因为空', '高风险操作应尽量填写原因；历史兼容记录可能为空。')}
      ${metric('可筛动作', numberText((filters.actions || []).length), `${numberText((filters.targetTypes || []).length)} 类对象`, '筛选项来自当前审计日志实际 action 和 targetType。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>审计日志</h2>
          <div class="section-sub">追踪后台谁在什么时候对什么对象做了什么</div>
        </div>
        ${help('审计日志是后台安全底座。所有写操作应留下 action、目标对象、原因和 before/after 摘要；从本版本开始也会记录后台请求 IP 和 User-Agent。')}
      </div>
      <div class="toolbar moderation-toolbar">
        <div class="toolbar-left">
          <label>动作<select id="auditAction">${auditOptionList(filters.actions || [], state.auditAction, '全部动作')}</select></label>
          <label>对象<select id="auditTargetType">${auditOptionList(filters.targetTypes || [], state.auditTargetType, '全部对象')}</select></label>
          <label>管理员<select id="auditAdmin">${auditOptionList(filters.admins || [], state.auditAdmin, '全部管理员')}</select></label>
          <label>开始日期<input id="auditFrom" type="date" value="${escapeHtml(state.auditFrom)}" /></label>
          <label>结束日期<input id="auditTo" type="date" value="${escapeHtml(state.auditTo)}" /></label>
          <input id="auditQ" value="${escapeHtml(state.auditQ)}" placeholder="目标 ID / 手机号 / 原因 / IP" />
        </div>
        <div class="actions">
          <button class="small-button" data-action="audit-filter">筛选</button>
          <button class="small-button ghost" data-action="audit-clear">清空</button>
        </div>
      </div>
      ${tableHtml(rows, [
        ['动作', (r) => `<div class="cell-title">${escapeHtml(r.action || '-')}</div><div class="cell-sub">${escapeHtml(r.id || '-')}</div>`],
        ['目标', (r) => `<div>${statusPill(r.targetType || '-')}</div><div class="cell-sub">${escapeHtml(r.targetId || '-')}</div>`],
        ['管理员', (r) => `<div>${escapeHtml(r.adminName || '-')}</div><div class="cell-sub">${escapeHtml(r.role || '-')}</div><div class="cell-sub">${escapeHtml(r.ip || 'IP 未记录')}</div>`],
        ['原因', (r) => `<div class="cell-sub clamp">${escapeHtml(r.reason || '未填写')}</div>`],
        ['变更摘要', (r) => `<div><strong>Before</strong>${auditSnapshotSummary(r.before)}</div><div style="margin-top:8px"><strong>After</strong>${auditSnapshotSummary(r.after)}</div>`],
        ['时间', (r) => `<div>${formatTime(r.createdAt)}</div><div class="cell-sub clamp">${escapeHtml(r.userAgent || 'UA 未记录')}</div>`],
      ], '暂无审计日志')}
    </div>
  `;
}

function renderReserved() {
  const [title] = titles[state.route] || ['预留能力'];
  $('content').innerHTML = `
    <div class="card placeholder">
      <div>
        <strong>${escapeHtml(title)}已预留</strong>
        <div>菜单入口已经放好，后续会按运营后台需求文档继续补完整逻辑、权限和审计。</div>
      </div>
    </div>
  `;
}

function renderTable({ columns, empty, rows }) {
  $('content').innerHTML = `<div class="card">${tableHtml(rows, columns, empty)}</div>`;
}

function tableHtml(rows, columns, empty = '暂无数据') {
  if (!rows.length) return `<div class="placeholder"><div><strong>${empty}</strong><div>刷新或切换筛选后再看看。</div></div></div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${columns.map(([label]) => `<th>${label}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${columns.map(([, renderCell]) => `<td>${renderCell(row)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

bootstrap();
