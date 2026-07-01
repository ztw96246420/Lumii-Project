const state = {
  admin: null,
  aiFeedbackQ: '',
  aiFeedbackReason: 'all',
  aiFeedbackStatus: 'all',
  aiMediaQ: '',
  aiMediaQuality: 'all',
  auditAction: 'all',
  auditAdmin: 'all',
  auditFrom: '',
  auditQ: '',
  auditTargetType: 'all',
  auditTo: '',
  appealQ: '',
  appealStatus: 'open',
  cache: {},
  exportFrom: '',
  exportPhone: '',
  exportQ: '',
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
  socialRelationKind: 'all',
  socialRelationQ: '',
  socialRelationStatus: 'all',
  route: 'dashboard',
  ticketPriority: 'all',
  ticketQ: '',
  ticketStatus: 'open',
  token: localStorage.getItem('lumii-admin-token') || '',
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
  sanctionAppeals: ['申诉中心', '账号处罚申诉、复核和撤销联动'],
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
  { key: 'ai_sample', label: 'AI 异常样本' },
];
const userRiskTagLabelMap = Object.fromEntries(userRiskTagOptions.map((item) => [item.key, item.label]));
const userRiskTagKeyMap = Object.fromEntries(userRiskTagOptions.flatMap((item) => [[item.key, item.key], [item.label, item.key]]));

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

function shortPhone(value) {
  const text = String(value || '');
  return text.length === 11 ? `${text.slice(0, 3)}****${text.slice(7)}` : text || '-';
}

function statusPill(status) {
  const value = String(status || '-');
  const tone = /ready|approved|active|published|valid|closed|success|done|已通过|通过|已处理|已配置|已启用/.test(value)
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
    if (action === 'pet-calendar-filter') {
      state.petCalendarType = $('petCalendarType').value;
      state.petCalendarStatus = $('petCalendarStatus').value;
      state.petCalendarSource = $('petCalendarSource').value;
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
      state.petCalendarFrom = '';
      state.petCalendarTo = '';
      state.petCalendarQ = '';
      state.cache = { ...state.cache, petCalendar: null };
      await render(true);
      return;
    }
    if (action === 'social-relations-filter') {
      state.socialRelationKind = $('socialRelationKind').value;
      state.socialRelationStatus = $('socialRelationStatus').value;
      state.socialRelationQ = $('socialRelationQ').value.trim();
      state.cache = { ...state.cache, socialRelations: null };
      await render(true);
      return;
    }
    if (action === 'social-relations-clear') {
      state.socialRelationKind = 'all';
      state.socialRelationStatus = 'all';
      state.socialRelationQ = '';
      state.cache = { ...state.cache, socialRelations: null };
      await render(true);
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
      state.appealQ = $('appealQ').value.trim();
      state.cache = { ...state.cache, sanctionAppeals: null };
      await render(true);
      return;
    }
    if (action === 'appeal-clear') {
      state.appealStatus = 'open';
      state.appealQ = '';
      state.cache = { ...state.cache, sanctionAppeals: null };
      await render(true);
      return;
    }
    if (action === 'appeal-review' || action === 'appeal-approve' || action === 'appeal-reject') await handleSanctionAppealAction(button);
    if (action === 'notification-template-use' || action === 'notification-campaign-use') {
      fillNotificationFormFromDataset(button);
      showToast('已套用到发送表单');
      return;
    }
    if (action === 'notification-template-save') await saveNotificationTemplate();
    if (action === 'notification-template-delete') await confirmPost(`/admin/notifications/templates/${encodeURIComponent(id)}/delete`, { reason: '删除通知模板' }, '确认删除这个通知模板？');
    if (action === 'notification-cancel') await cancelNotificationCampaign(id, button.dataset.status);
    if (action === 'send-notification') await sendSystemNotification('send');
    if (action === 'save-notification-draft') await sendSystemNotification('draft');
    if (action === 'schedule-notification') await sendSystemNotification('scheduled');
    if (action === 'save-config') {
      await saveConfig('publish');
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
    if (action === 'config-draft-discard') {
      await discardConfigDraft(id);
      return;
    }
    if (action === 'config-rollback') {
      await rollbackConfigRevision(id);
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
    if (action === 'export-clear') {
      state.exportType = 'all';
      state.exportStatus = 'all';
      state.exportPhone = '';
      state.exportFrom = '';
      state.exportTo = '';
      state.exportQ = '';
      state.exportReason = '';
      state.cache = { ...state.cache, exports: null };
      await render(true);
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
    if (action === 'avatar-refresh') await post(`/admin/ai/avatar-jobs/${id}/refresh`, { reason });
    if (action === 'avatar-retry') await post(`/admin/ai/avatar-jobs/${id}/retry`, { reason });
    if (action === 'avatar-fail') await post(`/admin/ai/avatar-jobs/${id}/mark-failed`, { reason });
    if (action === 'avatar-refund') await post(`/admin/ai/avatar-jobs/${id}/refund-quota`, { reason });
    if (action === 'post-hide') await post(`/admin/social/posts/${id}/hide`, { reason });
    if (action === 'post-restore') await post(`/admin/social/posts/${id}/restore`, { reason });
    if (action === 'post-delete') await confirmPost(`/admin/social/posts/${id}/delete`, { reason }, '确认删除这条动态？');
    if (action === 'comment-hide') await post(`/admin/social/comments/${id}/hide`, { reason });
    if (action === 'comment-restore') await post(`/admin/social/comments/${id}/restore`, { reason });
    if (action === 'report-valid') await post(`/admin/social/reports/${id}/resolve`, { reason, status: 'valid' });
    if (action === 'report-invalid') await post(`/admin/social/reports/${id}/resolve`, { reason, status: 'invalid' });
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
  state.cache.audit = null;
  showToast('已标记 AI 回复');
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
  state.cache.audit = null;
  showToast('AI 回复已隐藏');
  await render(true);
}

function clearOperationalCaches() {
  ['aiMedia', 'aiUsage', 'audit', 'avatarFeedback', 'avatarJobs', 'feedback', 'mediaModeration', 'moderation', 'notifications', 'petCalendar', 'petChat', 'pets', 'places', 'placeContributions', 'placeReviews', 'placeSubmissions', 'reports', 'sanctionAppeals', 'sanctionTemplates', 'sanctions', 'socialComments', 'socialPosts', 'socialRelations', 'summary', 'ticketReplyTemplates', 'tickets', 'users'].forEach((key) => {
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
  const result = await post(`/admin/users/${encodeURIComponent(phone)}/clear-business-data`, {
    confirmation: confirmation.trim(),
    reason: reason.trim() || '测试重置用户业务数据',
  });
  clearOperationalCaches();
  showToast(`已清理：${userBusinessSummaryText(result.before || {})}`);
  await render(true);
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
}

function fillNotificationFormFromDataset(button) {
  const fields = [
    ['notifyTitle', 'title'],
    ['notifyText', 'text'],
    ['notifyActionRoute', 'actionRoute'],
    ['notifyTarget', 'target'],
    ['notifyPhones', 'phones'],
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

async function cancelNotificationCampaign(id, status) {
  const label = status === 'sent' ? '撤回已发送通知' : status === 'scheduled' ? '取消预约通知' : '作废通知草稿';
  const reason = window.prompt('请输入处理原因', label);
  if (reason === null) return;
  await post(`/admin/notifications/${encodeURIComponent(id)}/cancel`, { reason: reason.trim() || label });
  state.cache.notifications = null;
}

async function sendSystemNotification(mode = 'send') {
  const title = valueOf('notifyTitle');
  const text = valueOf('notifyText');
  if (!title) throw new Error('请填写通知标题');
  if (!text) throw new Error('请填写通知内容');
  const target = valueOf('notifyTarget') || 'phones';
  const phones = valueOf('notifyPhones');
  if (mode !== 'draft' && target === 'phones' && !phones) throw new Error('请填写目标手机号');
  const scheduledAt = valueOf('notifyScheduledAt');
  if (mode === 'scheduled' && !scheduledAt) throw new Error('请选择预约发送时间');
  await post('/admin/notifications/system', {
    actionRoute: valueOf('notifyActionRoute'),
    mode,
    phones,
    reason: mode === 'scheduled' ? '预约发送系统通知' : mode === 'draft' ? '保存系统通知草稿' : '发送系统通知',
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

async function renderLaunchReadiness(force) {
  const data = await load('launchReadiness', '/admin/launch/readiness', force);
  const summary = data.summary || {};
  const linkageSummary = data.linkage?.summary || {};
  const modules = data.modules || [];
  const questions = data.questions || [];
  const gaps = data.gaps || [];
  const attentionItems = data.linkage?.attentionItems || [];
  const productionBlockers = gaps.filter((gap) => gap.status === 'blocked' || gap.severity === 'P0');
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

    <div class="grid two">
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

async function renderAdminAccounts(force) {
  const data = await load('adminAccounts', '/admin/accounts', force);
  const summary = data.summary || {};
  const session = data.currentSession || {};
  const loginSecurity = data.loginSecurity || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('管理员账号', numberText(summary.activeAccounts || 0), '当前仅单 admin', '当前版本只开放一个环境变量后台账号，App 用户账号与后台账号分离。')}
      ${metric('已开放权限', numberText(summary.activePermissions || 0), 'admin 全量权限', '当前没有细角色拦截，页面明确列出实际开放能力和生产期预留角色。')}
      ${metric('安全关注', numberText(summary.securityWarnings || 0), `${numberText(summary.reservedRoles || 0)} 个预留角色`, 'MFA、IP 白名单、多管理员和密码轮换仍是生产期治理能力；登录失败锁定已接入。')}
      ${metric('登录保护', loginSecurity.locked ? '已锁定' : `${numberText(loginSecurity.failedAttempts || 0)}/${numberText(loginSecurity.maxAttempts || 5)}`, loginSecurity.locked ? `到 ${formatTime(loginSecurity.lockedUntil)}` : `${numberText(loginSecurity.lockMinutes || 15)} 分钟锁定`, '连续失败达到阈值后，后台会临时锁定登录，并写入审计日志。')}
      ${metric('当前会话', session.expiresAt ? formatTime(session.expiresAt) : '-', `${escapeHtml(session.ip || 'IP 未记录')}`, '当前后台 token 的到期时间、请求 IP 和 User-Agent 摘要。')}
    </div>

    <div class="grid two">
      <div class="card">
        <div class="section-head">
          <div>
            <h2>当前后台账号</h2>
            <div class="section-sub">环境变量账号 · 单 admin 权限</div>
          </div>
          ${help('这里不展示密码或任何密钥值，只展示后台账号来源、状态、MFA 状态和最近登录证据。')}
        </div>
        ${tableHtml(data.accounts || [], [
          ['账号', (row) => `<div class="cell-title">${escapeHtml(row.displayName || row.username)}</div><div class="cell-sub">${escapeHtml(row.id)} · ${escapeHtml(row.username)}</div>`],
          ['角色', (row) => `<div>${(row.roleIds || []).map((role) => statusPill(role)).join(' ')}</div><div class="cell-sub">${row.mfaEnabled ? 'MFA 已启用' : 'MFA 未启用'}</div>`],
          ['状态', (row) => `${statusPill(row.status)}<div class="cell-sub">${row.lastLoginAt ? `最近登录 ${formatTime(row.lastLoginAt)}` : '暂无登录记录'}</div>`],
          ['最近 IP', (row) => `<div class="cell-sub">${escapeHtml(row.lastLoginIp || 'IP 未记录')}</div>`],
        ], '暂无后台账号')}
      </div>

      <div class="card">
        <div class="section-head">
          <div>
            <h2>安全检查</h2>
            <div class="section-sub">密码来源、MFA、IP 白名单和多账号状态</div>
          </div>
          ${help('当前只做单 admin 能力展示；生产期要接入 MFA、IP 白名单、登录失败锁定和账号禁用。')}
        </div>
        ${tableHtml(data.security?.checks || [], [
          ['状态', (row) => healthStatusPill(row.status)],
          ['检查项', (row) => `<div class="cell-title">${escapeHtml(row.label)}</div><div class="cell-sub">${escapeHtml(row.key)}</div>`],
          ['说明', (row) => `<div>${escapeHtml(row.detail || '-')}</div><div class="cell-sub">${escapeHtml(row.evidence || '-')}</div>`],
        ], '暂无安全检查')}
      </div>
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

async function renderSystemHealth(force) {
  const data = await load('systemHealth', '/admin/system/health', force);
  const summary = data.summary || {};
  const runtime = data.runtime || {};
  const stateFile = data.stateFile || {};
  const memory = data.resources?.memory || {};
  const heapUsed = Number(memory.heapUsed || 0);
  const heapTotal = Number(memory.heapTotal || 0);
  const heapFoot = heapTotal ? `${bytesText(heapUsed)} / ${bytesText(heapTotal)}` : bytesText(heapUsed);
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('整体状态', data.status === 'bad' ? '异常' : data.status === 'warn' ? '需关注' : '正常', `${summary.warn || 0} 关注 · ${summary.bad || 0} 异常`, '系统健康聚合运行、存储、关键外部配置和业务积压。')}
      ${metric('运行时长', durationText(runtime.uptimeSeconds), `${escapeHtml(runtime.nodeVersion || '-')} · PID ${escapeHtml(runtime.pid || '-')}`, '后端 Node 进程当前持续运行时间。')}
      ${metric('状态文件', bytesText(stateFile.sizeBytes), stateFile.exists ? `更新 ${formatTime(stateFile.modifiedAt)}` : '不可读', '当前文件态后端的 JSON state 体积和更新时间。')}
      ${metric('内存堆', heapFoot, `RSS ${bytesText(memory.rss || 0)}`, 'Node.js 进程内存快照，用于排查异常增长。')}
    </div>

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
  const data = await load('analytics', '/admin/analytics?days=14', force);
  const summary = data.summary || {};
  const users = summary.users || {};
  const ai = summary.ai || {};
  const calendar = summary.calendar || {};
  const social = summary.social || {};
  const places = summary.places || {};
  const safety = summary.safety || {};
  const events = summary.events || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('新增用户', numberText(users.newUsers), `${numberText(users.activeUsers)} 位窗口内活跃`, '基于用户注册时间和 lastSeenAt 聚合，默认 14 天窗口。')}
      ${metric('建档率', percentText(users.withPetRate), `${numberText(users.total)} 个账号`, '当前用户中至少有一只宠物档案的比例。')}
      ${metric('AI 形象成功率', percentText(ai.avatarSuccessRate), `${numberText(ai.avatarReady)} 成功 / ${numberText(ai.avatarFailed)} 失败`, '按窗口内 ready 与 failed 任务计算；处理中任务不进入分母。')}
      ${metric('AI 平均耗时', secondsText(ai.avatarAverageSeconds), `成本累计 ${moneyText(ai.gptImage2Cost)}`, '使用任务创建到更新时间估算，适合发现卡住和异常耗时。')}
      ${metric('宠友圈小事', numberText(social.posts), `${numberText(social.images)} 张图 · ${numberText(social.comments)} 条评论`, '来自移动端发布、图片、评论和点赞的当前业务数据。')}
      ${metric('移动端事件', numberText(events.total), `${numberText(events.uniqueUsers)} 位用户 · ${numberText(events.sampleRatePercent)}%采样`, `埋点${events.enabled === false ? '已关闭' : '已开启'}，保留 ${numberText(events.retentionDays || 30)} 天。`)}
      ${metric('地图行为', numberText(places.mapOpens), `搜索 ${numberText(places.poiSearches)} · 详情 ${numberText(places.placeDetailViews)}`, '来自移动端地图打开、POI 搜索和地点详情查看事件。')}
      ${metric('安全任务', numberText(safety.moderationTasks), `${numberText(safety.handledModerationTasks)} 已处理`, '统一内容安全任务池：举报、被举报内容、地点点评和新增地点。')}
      ${metric('安全样本复审', numberText(safety.sampleUnreviewed || 0), `复审率 ${percentText(safety.sampleReviewRate)} · 误杀/漏杀 ${numberText(safety.falsePositive || 0)}/${numberText(safety.falseNegative || 0)}`, '风险命中和抽样复审沉淀到样本池；待复审越高，说明规则质量需要运营回看。')}
    </div>
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
            <div class="section-sub">页面、发现、地图、地点和通知点击</div>
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
        ['事件', (row) => `<div>页面 ${escapeHtml(row.pageViews)} · 发现 ${escapeHtml(row.discoverExposures)}</div><div class="cell-sub">地图 ${escapeHtml(row.mapOpens)} · POI ${escapeHtml(row.poiSearches)}</div>`],
        ['运营', (row) => `<div>审核 ${escapeHtml(row.moderationTasks)} · 样本 ${escapeHtml(row.moderationSamples || 0)}</div><div class="cell-sub">复审 ${escapeHtml(row.moderationSampleReviews || 0)} · 工单 ${escapeHtml(row.tickets)}</div>`],
      ], '暂无日汇总')}
    </div>
  `;
  renderAnalyticsCharts(data);
}

function renderAnalyticsCharts(data) {
  const buckets = data.buckets || [];
  const labels = buckets.map((item) => item.label);
  const chartIds = ['analyticsGrowthChart', 'analyticsAiChart', 'analyticsSocialChart', 'analyticsEventChart', 'analyticsOpsChart'];
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
      { name: '招呼', smooth: true, type: 'line', data: buckets.map((item) => item.greetings) },
      { name: '约遛', smooth: true, type: 'line', data: buckets.map((item) => item.walkInvites) },
    ],
  });
  renderChart('analyticsEventChart', {
    series: [
      { name: '页面浏览', smooth: true, type: 'line', data: buckets.map((item) => item.pageViews) },
      { name: '发现曝光', smooth: true, type: 'line', data: buckets.map((item) => item.discoverExposures) },
      { name: '地图打开', smooth: true, type: 'line', data: buckets.map((item) => item.mapOpens) },
      { name: 'POI搜索', smooth: true, type: 'line', data: buckets.map((item) => item.poiSearches) },
      { name: '地点详情', smooth: true, type: 'line', data: buckets.map((item) => item.placeDetailViews) },
      { name: '通知点击', smooth: true, type: 'line', data: buckets.map((item) => item.notificationOpens) },
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
    tagged: '运营标记',
    writes: '写入记录',
  }[flag] || flag;
}

function petChatTagLabel(tag) {
  return {
    false_negative: '漏触发',
    false_positive: '误触发',
    medical_sample: '医疗样本',
    quality_issue: '质量问题',
  }[tag] || tag;
}

async function renderPetChat(force) {
  const query = new URLSearchParams({
    flag: state.petChatFlag,
    q: state.petChatQ,
  });
  const rows = await load('petChat', `/admin/ai/pet-chat/messages?${query.toString()}`, force);
  const medicalCount = rows.filter((row) => row.hasMedicalAlert).length;
  const writeCount = rows.filter((row) => row.hasCalendarWrite || row.updatedPet).length;
  const offCount = rows.filter((row) => row.feedback === 'off').length;
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('AI 回复', rows.length, `${petChatFlagLabel(state.petChatFlag)}筛选`, '后台默认只展示摘要；查看完整正文必须填写原因并写审计。')}
      ${metric('医疗风险', medicalCount, '自动写入备忘/提醒', 'AI 对话命中医疗风险门禁后，会记录备忘并提示就医。')}
      ${metric('业务写入', writeCount, '备忘/体重/疫苗/档案', 'AI 对话触发的结构化业务动作，用于排查自动写入是否合理。')}
      ${metric('不像它反馈', offCount, '用户点了“不像它”', '这些反馈会进入后续提示词上下文，也适合运营抽查。')}
    </div>
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
              ${['all', 'medical', 'writes', 'feedback_off', 'feedback_good', 'tagged', 'hidden'].map((flag) => `<option value="${flag}" ${state.petChatFlag === flag ? 'selected' : ''}>${petChatFlagLabel(flag)}</option>`).join('')}
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

function renderPetChatRow(row) {
  const actionLabels = (row.actionLabels || []).map(riskBadge).join('');
  const tags = (row.adminTags || []).map((tag) => riskBadge(petChatTagLabel(tag))).join('');
  const detail = state.petChatDetails[row.id];
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
          ${row.feedback ? riskBadge(`反馈：${row.feedback === 'good' ? '像它' : '不像它'}`) : ''}
          ${tags}
          ${row.adminHiddenAt ? riskBadge(`隐藏：${formatTime(row.adminHiddenAt)}`) : ''}
        </div>
        ${detail ? renderPetChatDetail(detail) : ''}
      </div>
      <div class="moderation-actions">
        <button class="small-button" data-action="pet-chat-view" data-id="${escapeHtml(row.id)}">查看全文</button>
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
      <div class="pet-chat-context">${context}</div>
    </div>
  `;
}

async function renderUsers(force) {
  const users = await load('users', '/admin/users', force);
  renderTable({
    empty: '暂无用户',
    rows: users,
    columns: [
      ['用户', (u) => `<div class="cell-title">${escapeHtml(u.ownerName)}</div><div class="cell-sub">${shortPhone(u.phone)}</div>`],
      ['宠物', (u) => `${u.activePet ? `<div class="cell-title">${escapeHtml(u.activePet.name)}</div><div class="cell-sub">${escapeHtml(u.activePet.species)} · ${escapeHtml(u.activePet.breed || '-')}</div>` : '-'}`],
      ['设置', (u) => `${statusPill(u.settings.nearbyVisible ? 'nearby on' : 'nearby off')} ${statusPill(u.settings.pushNotifications ? 'push on' : 'push off')}`],
      ['内容', (u) => `<div>${u.socialPostCount} 条小事</div><div class="cell-sub">${u.reportsAgainstCount} 次被举报</div>`],
      ['账号状态', (u) => `${statusPill(u.status)}<div class="cell-sub">${(u.sanctions?.activeTypes || []).map((type) => statusPill(type)).join(' ') || '无生效处罚'}</div>`],
      ['运营标记', renderUserOpsMark],
      ['最近活跃', (u) => formatTime(u.lastSeenAt)],
      ['操作', (u) => `
        <div class="actions">
          <button class="small-button" data-action="user-note-add" data-phone="${escapeHtml(u.phone)}">备注</button>
          <button class="small-button" data-action="user-risk-tags" data-phone="${escapeHtml(u.phone)}" data-tags="${escapeHtml((u.adminRiskTags || []).join(','))}">标签</button>
          <button class="small-button" data-action="quick-mute" data-phone="${escapeHtml(u.phone)}">禁言24h</button>
          <button class="small-button danger" data-action="quick-freeze" data-phone="${escapeHtml(u.phone)}">冻结72h</button>
          <button class="small-button danger" data-action="clear-user-business-data" data-phone="${escapeHtml(u.phone)}">清理业务数据</button>
        </div>
      `],
    ],
  });
}

function renderUserOpsMark(user) {
  const tags = (user.adminRiskTagLabels || (user.adminRiskTags || []).map((tag) => userRiskTagLabelMap[tag] || tag)).filter(Boolean);
  const tagHtml = tags.length ? `<div class="risk-row compact">${tags.map(riskBadge).join('')}</div>` : '<div class="cell-sub">无风险标签</div>';
  const noteCount = Number(user.adminNoteCount || 0);
  const latestNote = user.adminLatestNote ? escapeHtml(user.adminLatestNote) : '';
  return `
    ${tagHtml}
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
  const buttons = [];
  if (row.avatarStatusKey === 'ai') {
    buttons.push(`<button class="small-button danger" data-action="pet-media-clear" data-id="${escapeHtml(row.id)}" data-kind="ai-avatar" data-name="${escapeHtml(row.name || '')}">清AI形象</button>`);
  } else if (row.hasAvatar) {
    buttons.push(`<button class="small-button danger" data-action="pet-media-clear" data-id="${escapeHtml(row.id)}" data-kind="avatar" data-name="${escapeHtml(row.name || '')}">清头像</button>`);
  }
  if (row.hasPetCircleCover) {
    buttons.push(`<button class="small-button danger" data-action="pet-media-clear" data-id="${escapeHtml(row.id)}" data-kind="cover" data-name="${escapeHtml(row.name || '')}">清封面</button>`);
  }
  if (!buttons.length) return '<span class="cell-sub">无可处理媒体</span>';
  return `<div class="actions">${buttons.join('')}</div>`;
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
        ${help('这页直接聚合 users.pets 和关联业务数据。清空头像、AI 形象或封面会写审计、通知用户，并影响移动端下一次刷新后的展示；不导出图片二进制。')}
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
            <div class="section-sub">已开放清空违规头像、AI 形象和宠友圈封面</div>
          </div>
          ${help('媒体动作会保留 before/after 审计，并给用户写入站内通知；当前只清空，不做后台替换上传。')}
        </div>
        <div class="gap-list">
          <div><strong>清空头像</strong><span>用于普通头像违规，移动端会回到现有兜底头像展示。</span></div>
          <div><strong>清空 AI 形象</strong><span>用于 AI 结果不适合展示，会解除已应用任务关联并清空当前头像。</span></div>
          <div><strong>清空封面</strong><span>用于宠友圈封面违规，移动端宠友圈主页回退到小事图片或宠物头像。</span></div>
          <div><strong>仍预留</strong><span>后台直接修正宠物资料、替换封面和合并重复宠物仍需更细权限。</span></div>
          <div><strong>合并重复宠物</strong><span>生产阶段需要迁移日历、AI、宠友圈和会话引用，不能直接删档。</span></div>
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

async function renderPetCalendar(force) {
  const query = new URLSearchParams({
    from: state.petCalendarFrom,
    q: state.petCalendarQ,
    source: state.petCalendarSource,
    status: state.petCalendarStatus,
    to: state.petCalendarTo,
    type: state.petCalendarType,
  });
  const data = await load('petCalendar', `/admin/pet-calendar?${query.toString()}`, force);
  const records = data.records || [];
  const summary = data.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('日历记录', numberText(summary.all), `${numberText(summary.totalRecords)} 条全量记录`, '当前筛选下的体重、疫苗/驱虫和备忘总数；全量记录不受筛选影响。')}
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
          <div class="section-sub">只读排查页：展示移动端真实宠物日历数据，不在后台直接修改用户记录</div>
        </div>
        ${help('后台技术字段仍读取 health store，但所有运营文案统一叫“宠物日历”。这页不调用会初始化默认记录的 C 端列表函数，避免打开后台制造假记录。')}
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
              ${petCalendarOption(state.petCalendarSource, 'pet_circle', '宠友圈同步')}
              ${petCalendarOption(state.petCalendarSource, 'ai_chat', 'AI 对话')}
            </select>
          </label>
          <label>开始日期<input id="petCalendarFrom" type="date" value="${escapeHtml(state.petCalendarFrom)}" /></label>
          <label>结束日期<input id="petCalendarTo" type="date" value="${escapeHtml(state.petCalendarTo)}" /></label>
          <label>搜索<input id="petCalendarQ" placeholder="手机号、宠物、标题、记录ID" value="${escapeHtml(state.petCalendarQ)}" /></label>
        </div>
        <div class="actions">
          <button class="small-button" data-action="pet-calendar-filter">筛选</button>
          <button class="small-button ghost" data-action="pet-calendar-clear">清空</button>
        </div>
      </div>
      ${tableHtml(records, [
        ['用户 / 宠物', (r) => `<div class="cell-title">${escapeHtml(r.ownerName)}</div><div class="cell-sub">${shortPhone(r.phone)} · ${escapeHtml(r.petName)} ${r.petBreed ? `· ${escapeHtml(r.petBreed)}` : ''}</div>`],
        ['类型', (r) => `<div>${statusPill(r.typeLabel)}</div><div class="cell-sub">${escapeHtml(r.sourceId || '-')}</div>`],
        ['标题 / 内容', (r) => `<div class="cell-title">${escapeHtml(r.title || '-')}</div><div class="cell-sub clamp">${escapeHtml(r.detail || '-')}</div>`],
        ['日期', (r) => `<div>${escapeHtml(r.date || '-')}</div><div class="cell-sub">更新：${formatTime(r.updatedAt)}</div>`],
        ['状态', (r) => `${statusPill(r.statusLabel || r.status)}${r.reminderEnabled ? '<div class="cell-sub">已开提醒</div>' : ''}`],
        ['来源', (r) => `${petCalendarSourceBadge(r)}<div class="cell-sub">${escapeHtml(r.id)}</div>`],
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
          <div><strong>只读优先</strong><span>第一版不在后台编辑/删除日历记录，避免单 admin 误改用户数据。</span></div>
          <div><strong>来源追踪</strong><span>宠友圈同步、AI 对话写入会被标识出来，方便解释“为什么日历里多了一条”。</span></div>
          <div><strong>不制造默认记录</strong><span>本页直接读取持久化 state，不触发移动端健康列表的默认初始化逻辑。</span></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>后续动作预留</h2>
            <div class="section-sub">需要审批和更细审计后再开放</div>
          </div>
          ${help('需求文档里有修复体重、标记疫苗完成、编辑/删除备忘。这里先预留，不直接开放。')}
        </div>
        <div class="gap-list">
          <div><strong>体重修复</strong><span>只处理明显错误值，必须写原因、before/after 和影响范围。</span></div>
          <div><strong>疫苗状态修复</strong><span>后台可分 due / overdue / done，但移动端仍统一简化给用户。</span></div>
          <div><strong>备忘恢复</strong><span>删除、恢复、批量处理应进入高危操作审计。</span></div>
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
  if (row.kind === 'conversation') risks.push(statusPill('正文受限'));
  return risks.join(' ') || '<span class="muted">无明显风险</span>';
}

async function renderSocialRelations(force) {
  const query = new URLSearchParams({
    kind: state.socialRelationKind,
    q: state.socialRelationQ,
    status: state.socialRelationStatus,
  });
  const data = await load('socialRelations', `/admin/social-relations?${query.toString()}`, force);
  const rows = data.items || [];
  const summary = data.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('关系记录', numberText(summary.all), `${numberText(summary.totalRecords)} 条全量`, '当前筛选下的招呼、约遛和会话记录总数。')}
      ${metric('待处理', numberText(summary.pending), `${numberText(summary.rejected)} 条已拒绝`, 'pending 关系最容易造成用户误解，需要重点排查通知和可回复状态。')}
      ${metric('已接受', numberText(summary.accepted), '可发消息关系', '已接受招呼或约遛回复后建立的可消息关系。')}
      ${metric('招呼', numberText(summary.greetings), '发现页 / 宠友圈', '包括普通招呼和从宠友圈小事发起的招呼。')}
      ${metric('约遛', numberText(summary.walkInvites), '约遛邀请', '用于排查 B 收到 A 约遛后是否可以直接回复。')}
      ${metric('会话消息', numberText(summary.messageCount), `${numberText(summary.notifications)} 条相关通知`, '会话只展示摘要；完整正文查看需要更高权限与审计。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>关系消息记录</h2>
          <div class="section-sub">招呼、约遛、会话和通知链路的只读排查视角</div>
        </div>
        ${help('默认只展示会话摘要、状态、通知和拉黑信息，不展示完整私信正文。后续若开放正文查看，需要原因、权限和审计。')}
      </div>
      <div class="toolbar moderation-toolbar relationship-toolbar">
        <div class="toolbar-left">
          <label>类型
            <select id="socialRelationKind">
              ${socialRelationOption(state.socialRelationKind, 'all', '全部')}
              ${socialRelationOption(state.socialRelationKind, 'greeting', '招呼')}
              ${socialRelationOption(state.socialRelationKind, 'walk_invite', '约遛')}
              ${socialRelationOption(state.socialRelationKind, 'conversation', '会话')}
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
      ${tableHtml(rows, [
        ['类型', (r) => `<div>${statusPill(r.typeLabel)}</div><div class="cell-sub">${escapeHtml(r.sourceLabel || '-')}</div>`],
        ['双方', (r) => socialRelationPair(r)],
        ['状态', (r) => `${statusPill(r.statusLabel || r.status)}<div class="cell-sub">${formatTime(r.updatedAt || r.createdAt)}</div>`],
        ['摘要', (r) => `<div class="cell-title">${escapeHtml(r.summary || '-')}</div><div class="cell-sub clamp">${escapeHtml(r.postId || r.placeId || r.conversationId || r.id)}</div>`],
        ['通知 / 风险', (r) => socialRelationRisk(r)],
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
          <div><strong>招呼</strong><span>pending 表示等待接收方处理；accepted 后双方可查看完整宠友圈并发消息。</span></div>
          <div><strong>约遛</strong><span>接收方从约遛会话回复时，会把待处理约遛转为 accepted，避免死循环。</span></div>
          <div><strong>会话</strong><span>默认只显示摘要，不开放完整正文，降低隐私风险。</span></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>后续动作预留</h2>
            <div class="section-sub">写操作需要更细权限和审计</div>
          </div>
          ${help('需求文档中的修复异常状态、标记骚扰会话、隐藏违规消息属于高风险动作，当前仅做只读排查。')}
        </div>
        <div class="gap-list">
          <div><strong>状态修复</strong><span>后续可对死循环关系做人工修复，但必须记录 before/after。</span></div>
          <div><strong>正文查看</strong><span>需填写原因，并写入审计日志；默认客服只能看摘要。</span></div>
          <div><strong>违规处理</strong><span>隐藏消息、封禁、保留证据快照应接内容安全和处罚模块。</span></div>
        </div>
      </div>
    </div>
  `;
}

async function renderSanctions(force) {
  const [rows, templates] = await Promise.all([
    load('sanctions', '/admin/sanctions', force),
    load('sanctionTemplates', '/admin/sanction-templates', force),
  ]);
  $('content').innerHTML = `
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
        <button class="primary-button" data-action="sanction-create">创建处罚</button>
      </div>
    </div>
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
  await post(`/admin/users/${encodeURIComponent(phone)}/sanctions`, { durationHours, reason, templateId, type });
  state.cache.sanctions = null;
  state.cache.summary = null;
  state.cache.users = null;
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
  state.cache.sanctions = null;
  state.cache.summary = null;
  state.cache.users = null;
  state.cache.audit = null;
  showToast('已根据举报创建处罚');
  await render(true);
}

async function loadReportMessageContext(button) {
  const id = button.dataset.id;
  const reason = window.prompt('查看私信上下文需要填写原因，此操作会写入审计日志。', '处理私信举报，核对上下文');
  if (reason === null) return;
  const cleanReason = reason.trim();
  if (!cleanReason) {
    showToast('请填写查看原因');
    return;
  }
  const context = await post(`/admin/social/reports/${encodeURIComponent(id)}/message-context`, { reason: cleanReason });
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
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>账号申诉队列</h2>
          <div class="section-sub">用户对禁言、冻结、封禁发起申诉；处理结果会进入 App 通知中心</div>
        </div>
        ${help('通过申诉时默认撤销对应处罚；如果只认可申诉但不撤销，可取消卡片内的复选框。')}
      </div>
      <div class="toolbar">
        <select id="appealStatus">
          ${option('open', '未关闭', state.appealStatus)}
          ${option('pending', '待处理', state.appealStatus)}
          ${option('reviewing', '处理中', state.appealStatus)}
          ${option('approved', '已通过', state.appealStatus)}
          ${option('rejected', '未通过', state.appealStatus)}
          ${option('all', '全部', state.appealStatus)}
        </select>
        <input id="appealQ" placeholder="手机号、内容、处罚原因" value="${escapeHtml(state.appealQ)}" />
        <button class="small-button" data-action="appeal-filter">筛选</button>
        <button class="small-button" data-action="appeal-clear">清空</button>
      </div>
      ${appeals.length ? `<div class="ticket-list">${appeals.map(renderSanctionAppealCard).join('')}</div>` : '<div class="placeholder"><div><strong>暂无申诉</strong><div>当前筛选下没有账号申诉。</div></div></div>'}
    </div>
  `;
}

function renderSanctionAppealCard(appeal) {
  const active = appeal.status === 'pending' || appeal.status === 'reviewing';
  const sanctionLabel = appeal.sanctionTypeLabel || appeal.sanctionType || '账号限制';
  const title = `${appeal.ownerName || appeal.phone} · ${sanctionLabel}`;
  return `
    <div class="ticket-card">
      <div class="ticket-main">
        <div class="ticket-top">
          <div>
            <div class="cell-title">${escapeHtml(title)}</div>
            <div class="cell-sub">${shortPhone(appeal.phone)} ${appeal.petName ? `· ${escapeHtml(appeal.petName)}` : ''} · ${formatTime(appeal.createdAt)}</div>
          </div>
          <div>${statusPill(appeal.status)} ${statusPill(sanctionLabel)}</div>
        </div>
        <p>${escapeHtml(appeal.content)}</p>
        <div class="cell-sub">处罚原因：${escapeHtml(appeal.sanctionReason || appeal.sanction?.reason || '-')}</div>
        ${appeal.reviewReason ? `<div class="note-line"><strong>处理说明：</strong>${escapeHtml(appeal.reviewReason)}</div>` : ''}
        <div class="ticket-meta">
          <span>处罚状态：${escapeHtml(appeal.sanctionStatus || appeal.sanction?.status || '-')}</span>
          <span>处理人：${escapeHtml(appeal.handledBy || '-')}</span>
          <span>更新时间：${formatTime(appeal.updatedAt || appeal.createdAt)}</span>
        </div>
      </div>
      <div class="ticket-side">
        ${active ? `
          <button class="small-button" data-action="appeal-review" data-id="${escapeHtml(appeal.id)}" data-title="${escapeHtml(title)}">接手</button>
          <label class="inline-check"><input id="appealRevoke-${escapeHtml(appeal.id)}" type="checkbox" checked /> 通过时撤销处罚</label>
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
  return `
    <div class="ai-job-cell">
      ${avatarPreview(job.resultUrl || job.previewUrl, job.status === 'ready' ? 'AI' : '原')}
      <div>
        <div class="cell-title">${escapeHtml(job.petName || job.id)}</div>
        <div class="cell-sub">${escapeHtml(job.id)}</div>
        <div class="cell-sub">${job.mediaId ? `素材：${escapeHtml(job.mediaId)}` : '无素材ID'}</div>
      </div>
    </div>
  `;
}

function avatarFeedbackAction(row) {
  if (row.status === 'reviewed') {
    return `<div class="cell-sub">已由 ${escapeHtml(row.reviewedBy || '-')} 处理</div>`;
  }
  return `<button class="small-button" data-action="avatar-feedback-review" data-id="${escapeHtml(row.jobId)}" data-default-note="记录为${escapeHtml(row.reasonLabel || '生成质量')}反馈">标记处理</button>`;
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
  const [jobs, feedbackData, mediaData, aiUsage] = await Promise.all([
    load('avatarJobs', '/admin/ai/avatar-jobs', force),
    load('avatarFeedback', `/admin/ai/avatar-feedback?${feedbackQuery.toString()}`, force),
    load('aiMedia', `/admin/ai/media?${mediaQuery.toString()}`, force),
    load('aiUsage', '/admin/ai/usage?days=14', force),
  ]);
  const jobRows = Array.isArray(jobs) ? jobs : [];
  const feedbackRows = feedbackData.items || [];
  const feedbackSummary = feedbackData.summary || {};
  const mediaRows = mediaData.items || [];
  const mediaSummary = mediaData.summary || {};
  const usageSummary = aiUsage.summary || {};
  const providerRows = aiUsage.providers || [];
  const topErrors = aiUsage.topErrors || [];
  const processing = jobRows.filter((job) => job.status === 'processing');
  const failed = jobRows.filter((job) => job.status === 'failed');
  const ready = jobRows.filter((job) => job.status === 'ready');
  const stuck = processing.filter((job) => Date.now() - new Date(job.updatedAt || job.createdAt || 0).getTime() > 5 * 60 * 1000);
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('生成任务', numberText(jobRows.length), `${numberText(processing.length)} 个处理中`, 'AI 灵伴生成任务全量计数，包含历史供应商任务。')}
      ${metric('可用结果', numberText(ready.length), `${numberText(failed.length)} 个失败`, 'ready 表示后端已有结果图；是否应用到宠物头像看 acceptedAt。')}
      ${metric('可能卡住', numberText(stuck.length), '处理中超过 5 分钟未更新', '用于排查进度条停在中间或 provider 状态没有刷新。')}
      ${metric('待处理反馈', numberText(feedbackSummary.received), `${numberText(feedbackSummary.reviewed)} 条已处理`, '用户在 AI 灵伴结果页提交的不满意反馈。')}
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
      ${tableHtml(jobRows, [
        ['任务', avatarTaskCell],
        ['用户', (job) => `<div>${escapeHtml(job.ownerName || '-')}</div><div class="cell-sub">${shortPhone(job.ownerPhone)}</div>`],
        ['状态', (job) => `${statusPill(job.status)}<div class="cell-sub">${escapeHtml(job.provider || '-')} · ${job.progress || 0}%</div><div class="cell-sub">${escapeHtml(job.providerStatus || '-')}</div>`],
        ['错误', (job) => `<div>${escapeHtml(job.errorCode || '-')}</div><div class="cell-sub clamp">${escapeHtml(job.lastStatusError || job.errorMessage || '')}</div>`],
        ['时间', (job) => `<div>创建：${formatTime(job.createdAt)}</div><div class="cell-sub">更新：${formatTime(job.updatedAt)}</div>`],
        ['操作', (job) => `
          <div class="actions">
            <button class="small-button" data-action="avatar-refresh" data-id="${escapeHtml(job.id)}">刷新</button>
            <button class="small-button" data-action="avatar-retry" data-id="${escapeHtml(job.id)}">重试</button>
            <button class="small-button" data-action="avatar-refund" data-id="${escapeHtml(job.id)}">返还</button>
            <button class="small-button danger" data-action="avatar-fail" data-id="${escapeHtml(job.id)}">失败</button>
          </div>
        `],
      ], '暂无 AI 形象任务')}
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
          ${help('当前成本字段来自 provider 累计回传；由于缺少每次调用时间，今日成本暂不拆分，只展示累计成本和今日次数。')}
        </div>
        <div class="insight-list">
          <div><span>今日灵伴形象</span><strong>${numberText(usageSummary.todayPetAvatarCount)}</strong></div>
          <div><span>今日 AI 对话</span><strong>${numberText(usageSummary.todayPetChatCount)}</strong></div>
          <div><span>DeepSeek 请求</span><strong>${numberText(usageSummary.deepseekRequests)}</strong></div>
          <div><span>DeepSeek Token</span><strong>${numberText(usageSummary.deepseekTokens)}</strong></div>
          <div><span>平均回复字数</span><strong>${numberText(usageSummary.averageReplyLength)}</strong></div>
          <div><span>gpt-image2 累计成本</span><strong>${moneyText(usageSummary.gptImage2Cost)}</strong></div>
          <div><span>gpt-image2 Credits</span><strong>${numberText(usageSummary.gptImage2CreditsCost, 2)}</strong></div>
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
          ${help('柱状图来自业务任务状态；请求数、成本和 credits 来自 aiUsage 累计字段。')}
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
          <div><strong>成本异常看供应商</strong><span>同样任务量下成本或 credits 突增，优先检查 provider 配置、尺寸档位和重试次数。</span></div>
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
          <div><strong>完整 SLA</strong><span>记录 submit、queued、running、completed 等上游节点，精确评估供应商耗时。</span></div>
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
            <button class="small-button" data-action="post-hide" data-id="${p.id}">隐藏</button>
            <button class="small-button" data-action="post-restore" data-id="${p.id}">恢复</button>
            <button class="small-button danger" data-action="post-delete" data-id="${p.id}">删除</button>
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
            <button class="small-button" data-action="comment-hide" data-id="${c.id}">隐藏</button>
            <button class="small-button" data-action="comment-restore" data-id="${c.id}">恢复</button>
          </div>
        `],
      ])}
    </div>
  `;
}

async function renderReports(force) {
  const rows = await load('reports', '/admin/social/reports', force);
  renderTable({
    empty: '暂无举报',
    rows,
    columns: [
      ['举报对象', (r) => `<div class="cell-title">${escapeHtml(r.targetType)} · ${escapeHtml(r.targetId)}</div><div class="cell-sub">被举报：${escapeHtml(r.ownerName)} ${shortPhone(r.ownerPhone)}</div>`],
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
          <button class="small-button" data-action="report-valid" data-id="${escapeHtml(r.id)}">有效</button>
          <button class="small-button" data-action="report-invalid" data-id="${escapeHtml(r.id)}">无效</button>
        </div>
      `],
    ],
  });
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
  const rows = Array.isArray(contributions) ? contributions.slice(0, 8) : [];
  return tableHtml(rows, [
    ['贡献', (row) => `<div class="cell-title">${escapeHtml(row.actionLabel || row.action || '-')} · +${numberText(row.points || 0)}</div><div class="cell-sub">${escapeHtml(row.id || '-')}</div>`],
    ['用户', (row) => `<div>${escapeHtml(row.ownerName || '-')}</div><div class="cell-sub">${shortPhone(row.phone)}</div>`],
    ['地点', (row) => `<div>${escapeHtml(row.placeName || row.placeId || '-')}</div><div class="cell-sub">${escapeHtml(row.placeId || '-')}</div>`],
    ['来源', (row) => `<div>${escapeHtml(row.submissionId || '-')}</div><div class="cell-sub">${formatTime(row.createdAt)}</div>`],
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
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('地点总数', numberText(placeSummary.total || places.length), `${numberText(placeSummary.highQuality || 0)} 个高质量`, '来自 seed、高德回流和用户审核入库的地点目录总数。')}
      ${metric('平均质量分', numberText(placeSummary.averageQualityScore || 0), '实时计算', '质量分由地址、坐标、分类、标签、评分、点评、收藏和宠物友好状态综合计算，不会自动改写地点。')}
      ${metric('重复候选', numberText(placeSummary.duplicatePlaceCount || 0), '需人工确认', '重复候选只给运营证据，不自动合并或隐藏，避免误伤真实不同地点。')}
      ${metric('待治理', numberText(placeSummary.needsReview || 0), '低分/重复/candidate', '质量分低于 60、有重复候选或宠物友好状态仍为 candidate 的地点会进入待治理口径。')}
      ${metric('地点贡献', numberText(contributionSummary.total || placeSummary.contributionRecords || 0), `+${numberText(contributionSummary.points || placeSummary.contributionPoints || 0)} 分`, '新增地点审核通过或关联已有地点后，会给提交人记录地点贡献；当前只是运营积分账本，不等同现金或余额。')}
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
          <div class="section-sub">新增地点通过或关联已有地点后自动记录，移动端会通过通知中心告知用户贡献结果</div>
        </div>
        ${help('当前贡献分是运营积分账本，用于后续贡献者标记、活动激励或地点生态复盘；暂不等同现金、余额或可提现资产。')}
      </div>
      <div class="template-summary-row">
        <span class="risk-badge">贡献 ${numberText(contributionSummary.total || 0)}</span>
        <span class="risk-badge">用户 ${numberText(contributionSummary.users || 0)}</span>
        <span class="risk-badge">积分 +${numberText(contributionSummary.points || 0)}</span>
        <span class="risk-badge">关联已有 ${numberText(contributionSummary.linkedExisting || 0)}</span>
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
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('未关闭工单', summary.open || 0, `${summary.overdue || 0} 个已超 SLA`, '状态不是 closed/resolved 的工单都计入未关闭。')}
      ${metric('高优先级', summary.urgent || 0, 'urgent/high', '安全投诉默认 urgent，bug 默认 high。')}
      ${metric('等待用户', summary.waitingUser || 0, '已发送客服回复', '客服回复后默认进入 waiting_user，可继续备注或关闭。')}
      ${metric('安全投诉', summary.safety || 0, 'safety 分类', '安全投诉建议 2 小时内首次处理。')}
    </div>
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
          <label>负责人<input id="ticketBulkAssignee" placeholder="默认 admin" value="${escapeHtml(state.admin?.username || 'admin')}" /></label>
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
      ${tickets.length ? `<div class="ticket-list">${tickets.map(renderTicketCard).join('')}</div>` : '<div class="placeholder"><div><strong>暂无工单</strong><div>当前筛选下没有用户反馈。</div></div></div>'}
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

function ticketSlaPill(ticket) {
  const label = ticket.slaState === 'overdue' ? 'SLA 超时' : ticket.slaState === 'due_soon' ? 'SLA 临近' : ticket.slaState === 'done' ? 'SLA 完成' : `${ticket.slaHours || 72}h SLA`;
  const tone = ticket.slaState === 'overdue' ? 'bad' : ticket.slaState === 'due_soon' ? 'warn' : 'ok';
  return `<span class="pill ${tone}">${escapeHtml(label)}</span>`;
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

function renderTicketCard(ticket) {
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
          <span>负责人：${escapeHtml(ticket.assignee || '未分配')}</span>
          <span>创建：${formatTime(ticket.createdAt)}</span>
          <span>更新：${formatTime(ticket.updatedAt)}</span>
        </div>
        <div class="risk-row">
          ${related || '<span class="risk-badge">暂未关联对象</span>'}
          <span class="risk-badge">${ticket.noteCount || 0} 条备注</span>
          <span class="risk-badge">${ticket.replyCount || 0} 次回复</span>
          <span class="risk-badge">${ticket.attachmentCount || 0} 个附件</span>
          ${ticket.reopenCount ? `<span class="risk-badge">用户重开 ${ticket.reopenCount} 次</span>` : ''}
          ${satisfaction}
        </div>
        ${ticket.satisfaction?.comment ? `<div class="ticket-thread"><strong>满意度说明</strong><span>${escapeHtml(ticket.satisfaction.comment)}</span></div>` : ''}
        ${ticket.latestNote ? `<div class="ticket-thread"><strong>最近备注</strong><span>${escapeHtml(ticket.latestNote)}</span></div>` : ''}
        ${ticket.latestReply ? `<div class="ticket-thread"><strong>最近回复</strong><span>${escapeHtml(ticket.latestReply)}</span></div>` : ''}
      </div>
      <div class="ticket-panel">
        <div class="ticket-form-row">
          <input id="ticketAssignee-${escapeHtml(ticket.id)}" placeholder="负责人" value="${escapeHtml(ticket.assignee || '')}" />
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

function renderNotificationCampaign(campaign) {
  const failed = (campaign.failedPhones || []).slice(0, 5).map(shortPhone).join('、');
  const phones = (campaign.targetPhones || []).length ? (campaign.targetPhones || []).slice(0, 6).map(shortPhone).join('、') : String(campaign.phonesInput || '').split(/[\s,，;；]+/).filter(Boolean).slice(0, 6).map(shortPhone).join('、');
  const canCancel = ['draft', 'scheduled', 'sent'].includes(campaign.status);
  const cancelLabel = campaign.status === 'sent' ? '撤回' : campaign.status === 'scheduled' ? '取消预约' : '作废草稿';
  return `
    <article class="notification-campaign">
      <div class="notification-campaign-main">
        <div class="ticket-head">
          <div>
            <div class="cell-title">${escapeHtml(campaign.title)}</div>
            <div class="cell-sub">${escapeHtml(campaign.id)} · ${formatTime(campaign.createdAt)}</div>
          </div>
          <div class="ticket-status-row">
            ${statusPill(campaign.status)}
            ${statusPill(notificationTargetLabel(campaign.target))}
          </div>
        </div>
        <div class="ticket-content">${escapeHtml(campaign.text)}</div>
        <div class="moderation-meta">
          <span>发送人：${escapeHtml(campaign.createdBy || '-')}</span>
          <span>目标：${campaign.audienceCount || 0}</span>
          <span>送达：${campaign.deliveredCount || 0}</span>
          <span>跳转：${escapeHtml(notificationActionLabel(campaign.actionRoute))}</span>
          ${campaign.scheduledAt ? `<span>预约：${formatTime(campaign.scheduledAt)}</span>` : ''}
          ${campaign.deliveredAt ? `<span>发送：${formatTime(campaign.deliveredAt)}</span>` : ''}
          ${campaign.canceledAt ? `<span>撤回：${formatTime(campaign.canceledAt)}</span>` : ''}
          ${campaign.rateLimitSnapshot ? `<span>频控：${campaign.rateLimitSnapshot.campaignsLast24h || 0}/${campaign.rateLimitSnapshot.maxCampaignsPerDay || 0} 批</span>` : ''}
          <span>${campaign.respectUserSettings ? '尊重用户通知开关' : '重要通知强制入站'}</span>
        </div>
        <div class="risk-row">
          <span class="risk-badge">跳过 ${campaign.skippedCount || 0}</span>
          ${campaign.rateLimitedCount ? `<span class="risk-badge">频控 ${campaign.rateLimitedCount}</span>` : ''}
          ${phones ? `<span class="risk-badge">样本 ${escapeHtml(phones)}</span>` : ''}
          ${failed ? `<span class="risk-badge">未入站 ${escapeHtml(failed)}</span>` : ''}
          ${campaign.failedReason ? `<span class="risk-badge">失败：${escapeHtml(campaign.failedReason)}</span>` : ''}
          ${campaign.revokedCount ? `<span class="risk-badge">已撤回 ${campaign.revokedCount}</span>` : ''}
        </div>
        <div class="notification-campaign-actions">
          <button
            class="small-button"
            data-action="notification-campaign-use"
            data-action-route="${escapeHtml(campaign.actionRoute || '')}"
            data-phones="${escapeHtml(campaign.phonesInput || (campaign.targetPhones || []).join('\n'))}"
            data-respect-user-settings="${campaign.respectUserSettings !== false ? 'true' : 'false'}"
            data-target="${escapeHtml(campaign.target || 'phones')}"
            data-text="${escapeHtml(campaign.text || '')}"
            data-title="${escapeHtml(campaign.title || '')}"
          >套用</button>
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
    `埋点 ${summary.analyticsEnabled === false ? '关' : `开/${summary.analyticsSampleRatePercent ?? 100}%`}`,
    `工单 ${summary.supportUrgentSlaHours ?? 2}/${summary.supportHighSlaHours ?? 8}h SLA`,
    `通知频控 ${summary.notificationRateLimitEnabled === false ? '关' : `${summary.notificationMaxCampaignsPerDay || 0}批/${summary.notificationMaxPerUserPerDay || 0}人次`}`,
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

function renderConfigRevisions(revisions = []) {
  const rows = Array.isArray(revisions) ? revisions.slice(0, 12) : [];
  if (!rows.length) {
    return '<div class="placeholder"><div><strong>暂无配置版本</strong><div>保存配置后会自动生成版本快照，可用于回滚。</div></div></div>';
  }
  return tableHtml(rows, [
    ['版本', (item) => `<div class="cell-title">${escapeHtml(item.id)}</div><div class="cell-sub">${formatTime(item.createdAt)} · ${escapeHtml(item.createdBy || '-')}</div>`],
    ['类型', (item) => statusPill(item.action || 'publish')],
    ['摘要', (item) => `<div class="cell-sub">${escapeHtml(configRevisionSummaryText(item.summary || {}))}</div><div>${escapeHtml(item.reason || '-')}</div>`],
    ['操作', (item) => `<button class="small-button danger" data-action="config-rollback" data-id="${escapeHtml(item.id)}">回滚到此版本</button>`],
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

function renderConfigGovernance(config = {}) {
  const drafts = Array.isArray(config.drafts) ? config.drafts : [];
  const activeDrafts = drafts.filter((draft) => draft.status === 'draft');
  const governance = config.governance || {};
  return `
    <div class="grid metrics">
      ${metric('待发布草稿', numberText(governance.activeDrafts ?? activeDrafts.length), '不会影响 /app/config', '草稿只保存在后台，发布后才会生成版本并影响移动端。')}
      ${metric('高风险草稿', numberText(governance.highRiskDrafts || 0), 'P0 需重点复核', '维护模式、强制更新、内容安全总开关和机审开关属于高风险配置。')}
      ${metric('最近草稿', governance.latestDraftAt ? formatTime(governance.latestDraftAt) : '-', '配置治理记录', '用于确认是否有人保存了待发布变更。')}
      ${metric('版本历史', numberText((config.revisions || []).length), '可回滚', '发布和回滚都会生成配置版本快照。')}
    </div>
    <div class="config-section">
      <div class="section-head compact">
        <div>
          <h2>配置发布治理</h2>
          <div class="section-sub">草稿不会影响移动端；发布后下一次 /app/config 拉取生效</div>
        </div>
        ${help('建议高风险改动先保存草稿，由运营复核影响摘要后再发布。当前单 admin 版本先落草稿和审计，双人审批后续可接在同一个入口上。')}
      </div>
      ${activeDrafts.length ? tableHtml(activeDrafts.slice(0, 8), [
        ['草稿', (draft) => `<div class="cell-title">${escapeHtml(draft.id)}</div><div class="cell-sub">${formatTime(draft.updatedAt || draft.createdAt)} · ${escapeHtml(draft.createdBy || '-')}</div>`],
        ['风险', (draft) => `${configRiskPills(draft.riskChanges)}<div class="cell-sub">${escapeHtml(draft.reason || '-')}</div>`],
        ['变更摘要', (draft) => configChangeSummaryList(draft.changeSummary)],
        ['风险详情', (draft) => configRiskSummary(draft.riskChanges)],
        ['操作', (draft) => `
          <div class="actions">
            <button class="small-button" data-action="config-draft-publish" data-id="${escapeHtml(draft.id)}">发布草稿</button>
            <button class="small-button danger" data-action="config-draft-discard" data-id="${escapeHtml(draft.id)}">废弃</button>
          </div>
        `],
      ], '暂无配置草稿') : '<div class="placeholder"><div><strong>暂无待发布草稿</strong><div>可以先保存草稿复核风险，再发布到移动端配置。</div></div></div>'}
    </div>
  `;
}

async function renderNotifications(force) {
  const data = await load('notifications', '/admin/notifications', force);
  const summary = data.summary || {};
  const campaigns = data.campaigns || [];
  const devices = data.devices || [];
  const rateLimit = data.rateLimit || {};
  const templates = data.templates || [];
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('发送批次', summary.campaigns || 0, '系统通知历史', '每次后台发送系统通知都会形成一条发送记录，并写入审计日志。')}
      ${metric('用户总数', summary.users || 0, `${summary.activeToday || 0} 今日活跃`, '“今日活跃用户”目标按 lastSeenAt 近 24 小时计算。')}
      ${metric('推送设备', summary.devices || 0, '已登记 token', '当前只是设备登记和站内通知记录；真实厂商推送服务后续可接入。')}
      ${metric('待处理', (summary.drafts || 0) + (summary.scheduled || 0), `${summary.drafts || 0} 草稿 · ${summary.scheduled || 0} 预约`, '草稿不会触达用户；预约通知到点后由服务自动写入 App 通知中心。')}
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
          <label>指定手机号<textarea id="notifyPhones" placeholder="多个手机号可用换行、逗号或空格分隔；目标范围不是“指定手机号”时可留空。"></textarea></label>
          <label>预约发送时间<input id="notifyScheduledAt" type="datetime-local" /></label>
          <label class="inline-check notification-check"><input id="notifyRespectSettings" type="checkbox" checked /> 尊重用户通知开关</label>
          <div class="notification-action-row">
            <button class="primary-button" data-action="send-notification">立即发送</button>
            <button class="small-button" data-action="schedule-notification">预约发送</button>
            <button class="small-button" data-action="save-notification-draft">保存草稿</button>
            <button class="small-button" data-action="notification-template-save">保存模板</button>
          </div>
        </div>
      </div>

      <div class="card notification-guide">
        <div class="section-head">
          <div>
            <h2>模板与发送前检查</h2>
            <div class="section-sub">模板可一键套用；当前先落 App 通知中心，厂商 Push 后续接入</div>
          </div>
        </div>
        <div class="notification-template-list">
          ${templates.length ? templates.map(renderNotificationTemplate).join('') : '<div class="placeholder mini"><div><strong>暂无模板</strong><div>可把常用标题和正文保存为模板。</div></div></div>'}
        </div>
        <div class="notification-rules">
          <div><strong>全部用户</strong><span>适合维护、停服、重要版本提醒。</span></div>
          <div><strong>今日活跃</strong><span>适合短时运营提醒，减少打扰沉默用户。</span></div>
          <div><strong>指定手机号</strong><span>适合客服、灰度验证、单用户补偿通知。</span></div>
          <div><strong>强制入站</strong><span>仅用于安全、封禁、维护等必须告知的信息。</span></div>
          <div><strong>草稿/预约</strong><span>草稿只保留在后台；预约到点后自动写入目标用户通知中心。</span></div>
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
            <div class="section-sub">用于后续接入厂商 Push 的设备 token 概览</div>
          </div>
        </div>
        ${devices.length ? tableHtml(devices.slice(0, 8), [
          ['用户', (d) => `<div>${escapeHtml(d.ownerName || '-')}</div><div class="cell-sub">${shortPhone(d.phone)}</div>`],
          ['平台', (d) => statusPill(d.platform)],
          ['Token', (d) => `<span class="cell-sub">...${escapeHtml(d.tokenTail || '-')}</span>`],
          ['更新', (d) => formatTime(d.updatedAt)],
        ]) : '<div class="placeholder"><div><strong>暂无设备</strong><div>用户授权通知后，App 会登记设备 token。</div></div></div>'}
      </div>
    </div>
  `;
}

async function renderConfig(force) {
  const config = await load('config', '/admin/config', force);
  const announcement = config.app?.announcement || {};
  const contentSafety = config.contentSafety || {};
  const moderation = config.moderation || {};
  const notifications = config.notifications || {};
  const revisions = config.revisions || [];
  const splash = config.app?.splash || {};
  const support = config.support || {};
  const supportSlaHours = support.slaHours || {};
  const analytics = config.analytics || {};
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
            <h2>客服工单 SLA</h2>
            <div class="section-sub">保存后立即影响工单排序、SLA 标记、工作台统计和移动端预计响应文案</div>
          </div>
          ${help('SLA 从工单创建时间开始计算；closed/resolved 视为已完成。紧急通常用于安全投诉，高优先级通常用于 bug。')}
        </div>
        <div class="config-grid">
          <label>紧急工单小时<input id="cfgSupportSlaUrgent" type="number" min="1" max="72" value="${supportSlaHours.urgent || 2}" /></label>
          <label>高优先级小时<input id="cfgSupportSlaHigh" type="number" min="1" max="168" value="${supportSlaHours.high || 8}" /></label>
          <label>普通工单小时<input id="cfgSupportSlaNormal" type="number" min="1" max="336" value="${supportSlaHours.normal || 24}" /></label>
          <label>低优先级小时<input id="cfgSupportSlaLow" type="number" min="1" max="336" value="${supportSlaHours.low || 72}" /></label>
        </div>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>系统通知频控</h2>
            <div class="section-sub">保存后立即影响通知运营页的立即发送和预约到点发送，避免运营通知刷屏</div>
          </div>
          ${help('这里只限制后台系统通知，不限制审核结果、工单回复、处罚申诉、疫苗提醒等业务通知。批次上限超出时整批失败；单用户上限超出时该用户被跳过。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgNotificationRateLimitEnabled', '启用系统通知频控', notifications.rateLimitEnabled !== false)}
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
        </div>
        ${renderContentSafetyStatus(contentSafety)}
        <div class="config-grid announcement-grid">
          <label class="wide">阻断关键词<textarea id="cfgModerationBlockKeywords" maxlength="1200" placeholder="一行一个，命中后直接拒绝提交">${escapeHtml(keywordTextareaValue(moderation.blockKeywords))}</textarea></label>
          <label class="wide">高风险关键词<textarea id="cfgModerationHighRiskKeywords" maxlength="1200" placeholder="一行一个，命中后进入人工审核">${escapeHtml(keywordTextareaValue(moderation.highRiskKeywords))}</textarea></label>
          <label class="wide">复审关键词<textarea id="cfgModerationReviewKeywords" maxlength="1200" placeholder="一行一个，命中后进入人工审核">${escapeHtml(keywordTextareaValue(moderation.reviewKeywords))}</textarea></label>
          <label>阻断提示<input id="cfgModerationBlockMessage" maxlength="80" value="${escapeHtml(moderation.blockMessage || '')}" /></label>
          <label>复审提示<input id="cfgModerationReviewMessage" maxlength="80" value="${escapeHtml(moderation.reviewMessage || '')}" /></label>
          <label>抽样复审率 %<input id="cfgModerationSampleReviewRatePercent" type="number" min="0" max="100" value="${Number.isFinite(Number(moderation.sampleReviewRatePercent)) ? moderation.sampleReviewRatePercent : 0}" /></label>
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
        <button class="primary-button" data-action="save-config">立即发布</button>
      </div>
      <div class="config-section">
        <div class="section-head compact">
          <div>
            <h2>配置版本历史</h2>
            <div class="section-sub">每次保存都会生成版本快照；回滚后移动端下一次读取 /app/config 即生效</div>
          </div>
          ${help('回滚也是一次新的配置发布，会写审计日志，并生成新的 rollback 版本，方便继续追踪。')}
        </div>
        ${renderConfigRevisions(revisions)}
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
  const supportSlaHours = {
    high: Number($('cfgSupportSlaHigh').value),
    low: Number($('cfgSupportSlaLow').value),
    normal: Number($('cfgSupportSlaNormal').value),
    urgent: Number($('cfgSupportSlaUrgent').value),
  };
  if (Object.values(supportSlaHours).some((value) => !Number.isFinite(value) || value < 1)) {
    throw new Error('工单 SLA 必须填写 1 小时以上的数字');
  }
  if (!(supportSlaHours.urgent <= supportSlaHours.high && supportSlaHours.high <= supportSlaHours.normal && supportSlaHours.normal <= supportSlaHours.low)) {
    throw new Error('工单 SLA 需要保持：紧急 <= 高优先级 <= 普通 <= 低优先级');
  }
  const analyticsSampleRatePercent = Number($('cfgAnalyticsSampleRatePercent').value);
  const analyticsRetentionDays = Number($('cfgAnalyticsRetentionDays').value);
  if (!Number.isFinite(analyticsSampleRatePercent) || analyticsSampleRatePercent < 0 || analyticsSampleRatePercent > 100) {
    throw new Error('事件埋点采样率必须在 0-100 之间');
  }
  if (!Number.isFinite(analyticsRetentionDays) || analyticsRetentionDays < 7 || analyticsRetentionDays > 180) {
    throw new Error('事件保留天数必须在 7-180 之间');
  }
  const moderationSampleReviewRatePercent = Number($('cfgModerationSampleReviewRatePercent').value);
  if (!Number.isFinite(moderationSampleReviewRatePercent) || moderationSampleReviewRatePercent < 0 || moderationSampleReviewRatePercent > 100) {
    throw new Error('内容安全抽样复审率必须在 0-100 之间');
  }
  const payload = {
    ai: {
      petAvatarDailyLimit: Number($('cfgPetAvatarDailyLimit').value),
      petChatDailyLimit: Number($('cfgPetChatDailyLimit').value),
    },
    analytics: {
      enabled: $('cfgAnalyticsEnabled').checked,
      retentionDays: analyticsRetentionDays,
      sampleRatePercent: analyticsSampleRatePercent,
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
    moderation: {
      blockKeywords: $('cfgModerationBlockKeywords').value,
      blockMessage: $('cfgModerationBlockMessage').value,
      enabled: $('cfgModerationEnabled').checked,
      highRiskKeywords: $('cfgModerationHighRiskKeywords').value,
      machineImageEnabled: $('cfgModerationMachineImageEnabled').checked,
      machineTextEnabled: $('cfgModerationMachineTextEnabled').checked,
      reviewKeywords: $('cfgModerationReviewKeywords').value,
      reviewMessage: $('cfgModerationReviewMessage').value,
      sampleReviewRatePercent: moderationSampleReviewRatePercent,
      textRulesEnabled: $('cfgModerationTextRulesEnabled').checked,
    },
    notifications: {
      maxCampaignsPerDay: Number($('cfgNotificationMaxCampaignsPerDay').value),
      maxPerUserPerDay: Number($('cfgNotificationMaxPerUserPerDay').value),
      rateLimitEnabled: $('cfgNotificationRateLimitEnabled').checked,
    },
    reason: mode === 'draft' ? '配置草稿保存' : '配置中心发布',
    social: {
      discoverRadiusKm: Number($('cfgDiscoverRadiusKm').value),
      nearbyMomentTtlDays: Number($('cfgNearbyMomentTtlDays').value),
      petCircleMaxPhotos: Number($('cfgPetCircleMaxPhotos').value),
    },
    support: {
      slaHours: supportSlaHours,
    },
  };
  const promptLabel = mode === 'draft' ? '请输入草稿说明' : '请输入发布原因';
  const defaultReason = mode === 'draft' ? '配置草稿保存' : '配置中心发布';
  const reason = window.prompt(promptLabel, defaultReason);
  if (reason === null) return;
  payload.reason = reason.trim() || defaultReason;
  state.cache.config = mode === 'draft'
    ? await post('/admin/config/drafts', payload)
    : await patch('/admin/config', payload);
  state.cache.summary = null;
  showToast(mode === 'draft' ? '配置草稿已保存' : '配置已发布');
  await render(true);
}

async function publishConfigDraft(id) {
  if (!id) return;
  const reason = window.prompt('请输入发布草稿的原因', `发布配置草稿 ${id}`);
  if (reason === null) return;
  state.cache.config = await post(`/admin/config/drafts/${encodeURIComponent(id)}/publish`, {
    reason: reason.trim() || `发布配置草稿 ${id}`,
  });
  state.cache.summary = null;
  showToast('配置草稿已发布');
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
  state.cache.config = await post(`/admin/config/revisions/${encodeURIComponent(id)}/rollback`, {
    reason: reason.trim() || `回滚到配置版本 ${id}`,
  });
  state.cache.summary = null;
  showToast('配置已回滚');
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

async function renderExports(force) {
  const query = exportQueryParams();
  const exportUrl = query.toString() ? `/admin/exports?${query.toString()}` : '/admin/exports';
  const rows = await load('exports', exportUrl, force);
  const history = await api(exportHistoryUrl());
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
      ${metric('导出治理', '已开启', '原因必填 · CSV水印', '后端强制校验导出原因，CSV 每行追加水印列，审计记录水印 ID、筛选条件、行数和管理员。')}
      ${metric('筛选条件', activeFilterSummary === '未筛选' ? '未开启' : '已开启', activeFilterSummary, '下载 CSV 时会带上这些筛选条件，并写入审计日志。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>导出数据</h2>
          <div class="section-sub">下载会生成 CSV 文件，并记录到系统审计</div>
        </div>
        ${help('当前不导出图片二进制、设备 token、完整审计 before/after 快照等大字段或敏感字段。')}
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
        ['字段', (row) => `<div class="export-fields">${(row.columns || []).slice(0, 8).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}${(row.columns || []).length > 8 ? `<span>+${(row.columns || []).length - 8}</span>` : ''}</div>`],
        ['操作', (row) => `<button class="small-button" data-action="download-export" data-id="${escapeHtml(row.type)}">下载匹配 CSV</button><div class="cell-sub">${escapeHtml(row.filterSummary || activeFilterSummary)}</div><div class="cell-sub">${escapeHtml(row.governanceLabel || '需原因 · CSV水印')}</div>`],
      ], '暂无可导出数据')}
    </div>
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
        ['文件/水印', (row) => `<div class="cell-sub clamp">${escapeHtml(row.filename || '-')}</div><div class="cell-sub">字段 ${escapeHtml(row.columnsCount || 0)} 个 · 水印 ${escapeHtml(row.watermarkId || '-')}</div>`],
        ['筛选/行数', (row) => `<div class="cell-sub clamp">${escapeHtml(row.filterSummary || '全部数据')}</div><div class="cell-sub">导出 ${escapeHtml(row.rowCount || 0)} / 匹配 ${escapeHtml(row.matchedRows || 0)} / 原始 ${escapeHtml(row.totalRows || 0)}</div>`],
        ['原因', (row) => `<div class="cell-sub clamp">${escapeHtml(row.exportReason || row.reason || '-')}</div>`],
        ['管理员', (row) => `<div>${escapeHtml(row.adminName || '-')}</div><div class="cell-sub">${escapeHtml(row.ip || 'IP 未记录')}</div>`],
        ['时间', (row) => `<div>${formatTime(row.createdAt)}</div><div class="cell-sub clamp">${escapeHtml(row.userAgent || 'UA 未记录')}</div>`],
      ], '暂无导出记录')}
    </div>
  `;
}

async function downloadExport(type) {
  if (!type) return;
  state.exportReason = $('exportReason')?.value.trim() || state.exportReason;
  if (state.exportReason.length < 4) {
    showToast('请先填写导出原因，至少 4 个字');
    return;
  }
  const query = exportQueryParams({ includeReason: true });
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
