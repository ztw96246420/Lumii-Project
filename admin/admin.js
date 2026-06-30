const state = {
  admin: null,
  aiFeedbackQ: '',
  aiFeedbackReason: 'all',
  aiFeedbackStatus: 'all',
  aiMediaQ: '',
  aiMediaQuality: 'all',
  appealQ: '',
  appealStatus: 'open',
  cache: {},
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
  { key: 'tickets', label: '工单中心' },
  { key: 'notifications', label: '通知运营' },
  { key: 'config', label: '配置中心' },
  { key: 'audit', label: '审计日志' },
  { key: 'sanctions', label: '用户处罚' },
  { key: 'sanctionAppeals', label: '申诉中心' },
  { key: 'exports', label: '数据导出' },
];

const titles = {
  analytics: ['数据看板', '增长、AI、社交和安全趋势'],
  audit: ['系统审计', '后台所有写操作都会沉淀为审计记录'],
  avatarJobs: ['AI 灵伴', '生成任务、上传素材、用户反馈和额度处理'],
  config: ['配置中心', '这些配置会被移动端 /app/config 读取'],
  dashboard: ['总览', '运营工作台'],
  exports: ['数据导出', '可审计的运营 CSV 下载'],
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
  tickets: ['工单中心', '用户反馈、客服备注和回复闭环'],
  users: ['用户管理', '账号、宠物、设置和风险排查'],
};

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
  const tone = /ready|approved|active|published|valid|closed|success|done/.test(value)
    ? 'ok'
    : /failed|rejected|deleted|hidden|invalid|bad|ban|banned|freeze|frozen|muted|禁言|冻结|封禁/.test(value)
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
    throw new Error(message);
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
    $('loginError').textContent = error.message;
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
    if (action === 'save-config') await saveConfig();
    if (action === 'config-rollback') {
      await rollbackConfigRevision(id);
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
    if (action === 'report-sanction') {
      await applyReportSanction(button);
      return;
    }
    if (action === 'review-approve') await post(`/admin/places/reviews/${id}/approve`, { reason });
    if (action === 'review-reject') await post(`/admin/places/reviews/${id}/reject`, { reason });
    if (action === 'submission-approve') await post(`/admin/places/submissions/${id}/approve`, { reason });
    if (action === 'submission-reject') await post(`/admin/places/submissions/${id}/reject`, { reason });
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
  if (button.dataset.confirm === 'true' && !window.confirm(`确认${label}：${title}？`)) return false;
  const reason = window.prompt('请输入处理原因', `${label}：${title}`);
  if (reason === null) return false;
  await post(`/admin/moderation/tasks/${encodeURIComponent(taskId)}/${encodeURIComponent(op)}`, {
    reason: reason.trim() || `${label}：${title}`,
  });
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
  ['aiMedia', 'audit', 'avatarFeedback', 'avatarJobs', 'feedback', 'moderation', 'notifications', 'petCalendar', 'petChat', 'pets', 'placeReviews', 'placeSubmissions', 'reports', 'sanctionAppeals', 'sanctionTemplates', 'sanctions', 'socialComments', 'socialPosts', 'socialRelations', 'summary', 'ticketReplyTemplates', 'tickets', 'users'].forEach((key) => {
    state.cache[key] = null;
  });
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
    analytics: renderAnalytics,
    audit: renderAudit,
    avatarJobs: renderAvatarJobs,
    config: renderConfig,
    dashboard: renderDashboard,
    exports: renderExports,
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
    <div class="switch-row"><span>宠友圈开关</span>${statusPill(config.features.petCircle ? 'active' : 'closed')}</div>
    <div class="switch-row"><span>地图地点开关</span>${statusPill(config.features.places ? 'active' : 'closed')}</div>
    <div class="switch-row"><span>App 公告</span>${statusPill(config.app?.announcement?.enabled ? 'active' : 'closed')}</div>
    <div class="switch-row"><span>版本更新</span>${statusPill(config.app?.update?.enabled ? 'active' : 'closed')}</div>
    <div class="switch-row"><span>启动提示</span>${statusPill(config.app?.splash?.enabled ? 'active' : 'closed')}</div>
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
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('新增用户', numberText(users.newUsers), `${numberText(users.activeUsers)} 位窗口内活跃`, '基于用户注册时间和 lastSeenAt 聚合，默认 14 天窗口。')}
      ${metric('建档率', percentText(users.withPetRate), `${numberText(users.total)} 个账号`, '当前用户中至少有一只宠物档案的比例。')}
      ${metric('AI 形象成功率', percentText(ai.avatarSuccessRate), `${numberText(ai.avatarReady)} 成功 / ${numberText(ai.avatarFailed)} 失败`, '按窗口内 ready 与 failed 任务计算；处理中任务不进入分母。')}
      ${metric('AI 平均耗时', secondsText(ai.avatarAverageSeconds), `成本累计 ${moneyText(ai.gptImage2Cost)}`, '使用任务创建到更新时间估算，适合发现卡住和异常耗时。')}
      ${metric('宠友圈小事', numberText(social.posts), `${numberText(social.images)} 张图 · ${numberText(social.comments)} 条评论`, '来自移动端发布、图片、评论和点赞的当前业务数据。')}
      ${metric('安全任务', numberText(safety.moderationTasks), `${numberText(safety.handledModerationTasks)} 已处理`, '统一内容安全任务池：举报、被举报内容、地点点评和新增地点。')}
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
            <h2>运营处理压力</h2>
            <div class="section-sub">审核任务、地点内容和工单</div>
          </div>
          ${help('地点审核通过率基于已审核的点评和新增地点提交，不含待审核项。')}
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
          <div><span>地点审核通过率</span><strong>${percentText(places.approvalRate)}</strong></div>
          <div><span>举报有效率</span><strong>${percentText(safety.reportValidRate)}</strong></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>数据口径缺口</h2>
            <div class="section-sub">这些指标需要移动端补事件埋点后才能精确统计</div>
          </div>
          ${help('这里不是后台缺陷，而是当前业务链路尚未采集的事件。后续补埋点后可直接进入本看板。')}
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
        ['运营', (row) => `<div>审核 ${escapeHtml(row.moderationTasks)}</div><div class="cell-sub">举报 ${escapeHtml(row.reports)} · 工单 ${escapeHtml(row.tickets)}</div>`],
      ], '暂无日汇总')}
    </div>
  `;
  renderAnalyticsCharts(data);
}

function renderAnalyticsCharts(data) {
  const buckets = data.buckets || [];
  const labels = buckets.map((item) => item.label);
  const chartIds = ['analyticsGrowthChart', 'analyticsAiChart', 'analyticsSocialChart', 'analyticsOpsChart'];
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
  renderChart('analyticsOpsChart', {
    series: [
      { barMaxWidth: 20, name: '审核任务', type: 'bar', data: buckets.map((item) => item.moderationTasks) },
      { barMaxWidth: 20, name: '地点点评', type: 'bar', data: buckets.map((item) => item.placeReviews) },
      { barMaxWidth: 20, name: '新增地点', type: 'bar', data: buckets.map((item) => item.placeSubmissions) },
      { name: '工单', smooth: true, type: 'line', data: buckets.map((item) => item.tickets) },
    ],
  });
}

async function renderModeration(force) {
  const query = new URLSearchParams({
    q: state.moderationQ,
    status: state.moderationStatus,
  });
  const data = await load('moderation', `/admin/moderation/tasks?${query.toString()}`, force);
  const tasks = data.tasks || [];
  const samples = data.samples || [];
  const summary = data.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('待处理', summary.pending || 0, `${summary.escalated || 0} 个已升级`, 'pending / reviewing / escalated 都算作待处理任务。')}
      ${metric('举报任务', summary.reports || 0, '来自用户举报', '用户举报会自动关联被举报动态或评论。')}
      ${metric('社交内容', summary.social || 0, '动态/评论聚合', '被举报内容会聚合为内容级任务，便于一次隐藏或删除。')}
      ${metric('地点审核', summary.places || 0, '点评/新增地点', '地点点评和新增地点共用这套审核视角。')}
      ${metric('规则命中', summary.ruleHits || 0, '关键词样本', '来自配置中心内容安全规则的命中样本，用于后续调规则和接模型。')}
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
          <h2>规则命中样本</h2>
          <div class="section-sub">最近 12 条命中，用来回看规则质量；关键词只在后台展示</div>
        </div>
        ${help('命中样本来自小事、地点点评、地点提交等用户内容。后续接入第三方内容安全模型时，可把这里作为人工样本池的基础。')}
      </div>
      ${samples.length ? `<div class="moderation-list compact">${samples.map(renderModerationSample).join('')}</div>` : '<div class="placeholder"><div><strong>暂无规则命中</strong><div>开启规则并命中后，这里会沉淀样本。</div></div></div>'}
    </div>
  `;
}

function moderationStatusOption(value, label) {
  return `<option value="${value}" ${state.moderationStatus === value ? 'selected' : ''}>${label}</option>`;
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
  const riskTypes = (sample.riskTypes || []).map(riskBadge).join('') || riskBadge('规则命中');
  const keywords = (sample.matchedKeywords || []).slice(0, 4).map((item) => riskBadge(`命中：${item}`)).join('');
  return `
    <article class="moderation-card">
      <div class="moderation-card-main">
        <div class="moderation-title-row">
          <div>
            <div class="cell-title">${escapeHtml(sample.scope || '内容样本')}</div>
            <div class="cell-sub">${escapeHtml(sample.id)} · ${formatTime(sample.createdAt)}</div>
          </div>
          <div class="moderation-status">${statusPill(sample.action || 'review')}</div>
        </div>
        <div class="moderation-text">${escapeHtml(sample.contentText || '无正文内容')}</div>
        <div class="moderation-meta">
          <span>用户：${shortPhone(sample.ownerPhone)}</span>
          <span>对象：${escapeHtml(sample.targetId || '-')}</span>
        </div>
        <div class="risk-row">
          <span class="risk-score">风险 ${sample.riskScore || 0}</span>
          ${riskTypes}
          ${keywords}
        </div>
      </div>
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
      ['最近活跃', (u) => formatTime(u.lastSeenAt)],
      ['操作', (u) => `
        <div class="actions">
          <button class="small-button" data-action="quick-mute" data-phone="${escapeHtml(u.phone)}">禁言24h</button>
          <button class="small-button danger" data-action="quick-freeze" data-phone="${escapeHtml(u.phone)}">冻结72h</button>
        </div>
      `],
    ],
  });
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
          <div class="section-sub">全局只读排查：宠物资料、头像、AI 形象、宠友圈和日历关联记录</div>
        </div>
        ${help('这页直接聚合 users.pets 和关联业务数据，不会修改用户宠物档案。头像、AI 形象和封面只展示状态，不导出图片二进制。')}
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
            <h2>后续动作预留</h2>
            <div class="section-sub">资料修复属于高影响操作，先不在单 admin 第一版开放</div>
          </div>
          ${help('需求文档里的修正宠物资料、隐藏违规头像、清空 AI 形象、替换宠友圈封面都需要原因、before/after 审计和更细权限。')}
        </div>
        <div class="gap-list">
          <div><strong>修正档案</strong><span>只处理明显错误字段，例如物种识别错、生日格式异常、体重离谱。</span></div>
          <div><strong>媒体处理</strong><span>隐藏头像、清空 AI 形象、换封面都应保留原图和处理记录。</span></div>
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
      ${avatarPreview(row.previewUrl || row.fileUrl, '原')}
      <div>
        <div class="cell-title">${escapeHtml(row.mediaId || '-')}</div>
        <div class="cell-sub">${escapeHtml(row.fileName || row.mimeType || '-')}</div>
        <div class="cell-sub">${row.sizeKb ? `${numberText(row.sizeKb)} KB` : '大小未知'}</div>
      </div>
    </div>
  `;
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
  const [jobs, feedbackData, mediaData] = await Promise.all([
    load('avatarJobs', '/admin/ai/avatar-jobs', force),
    load('avatarFeedback', `/admin/ai/avatar-feedback?${feedbackQuery.toString()}`, force),
    load('aiMedia', `/admin/ai/media?${mediaQuery.toString()}`, force),
  ]);
  const jobRows = Array.isArray(jobs) ? jobs : [];
  const feedbackRows = feedbackData.items || [];
  const feedbackSummary = feedbackData.summary || {};
  const mediaRows = mediaData.items || [];
  const mediaSummary = mediaData.summary || {};
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
            <h2>运营口径</h2>
            <div class="section-sub">从任务、反馈和素材一起判断问题来源</div>
          </div>
        </div>
        <div class="gap-list">
          <div><strong>卡住优先看任务</strong><span>processing 超过 5 分钟未更新，先刷新 provider 状态，再判断是否重试或标记失败。</span></div>
          <div><strong>不像宠物优先看反馈</strong><span>毛色、脸型、表情和不像同一只宠物，都会进入生成反馈，后续可沉淀为提示词样本。</span></div>
          <div><strong>清晰度优先看素材</strong><span>warning 和 blocked 通常来自图片太小、多宠、人物入镜或主体不清晰。</span></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h2>下一阶段预留</h2>
            <div class="section-sub">成本和供应商监控还需要更完整的上游回传</div>
          </div>
          ${help('当前已有请求次数、任务状态和错误信息；若要做成本看板，还需要记录每次调用的价格、模型、尺寸和供应商原始状态。')}
        </div>
        <div class="gap-list">
          <div><strong>成本估算</strong><span>按 provider、模型、尺寸和成功率统计每只宠物生成成本。</span></div>
          <div><strong>供应商 SLA</strong><span>记录提交、轮询、完成、失败和超时节点，用于对比 gpt-image-2 和历史供应商。</span></div>
          <div><strong>样本集</strong><span>把已处理反馈沉淀成身份不一致、风格不满意、素材质量差等训练/评估样本。</span></div>
        </div>
      </div>
    </div>
  `;
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
      ['内容快照', (r) => `<div class="cell-title">${escapeHtml(r.evidenceSnapshot?.targetLabel || '-')}</div><div class="cell-sub">${escapeHtml(r.evidenceSnapshot?.contentText || '无文本内容').slice(0, 90)}</div>`],
      ['状态', (r) => `${statusPill(r.status)}<div class="cell-sub">举报人：${r.resultNotifiedAt ? formatTime(r.resultNotifiedAt) : '未通知'}</div><div class="cell-sub">作者：${r.ownerResultNotifiedAt ? formatTime(r.ownerResultNotifiedAt) : '未通知'}</div>`],
      ['处罚建议', renderReportSanctionSuggestion],
      ['时间', (r) => formatTime(r.createdAt)],
      ['操作', (r) => `
        <div class="actions">
          <button class="small-button" data-action="report-valid" data-id="${r.id}">有效</button>
          <button class="small-button" data-action="report-invalid" data-id="${r.id}">无效</button>
        </div>
      `],
    ],
  });
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

async function renderPlaces(force) {
  const [reviews, submissions] = await Promise.all([
    load('placeReviews', '/admin/places/reviews', force),
    load('placeSubmissions', '/admin/places/submissions', force),
  ]);
  $('content').innerHTML = `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>地点点评审核</h2>
          <div class="section-sub">点评默认 pending_review，审核后才适合公开展示</div>
        </div>
      </div>
      ${tableHtml(reviews, [
        ['点评', (r) => `<div class="cell-title">${escapeHtml(r.placeName)}</div><div class="cell-sub">${escapeHtml(r.content).slice(0, 90)}</div>`],
        ['用户', (r) => `<div>${escapeHtml(r.ownerName)}</div><div class="cell-sub">${shortPhone(r.ownerPhone)}</div>`],
        ['状态', (r) => `${statusPill(r.status)}<div class="cell-sub">${r.resultNotifiedAt ? '已通知：' + formatTime(r.resultNotifiedAt) : '未通知用户'}</div>`],
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
        ['用户', (s) => `<div>${escapeHtml(s.ownerName)}</div><div class="cell-sub">${shortPhone(s.ownerPhone)}</div>`],
        ['状态', (s) => `${statusPill(s.status)}<div class="cell-sub">${s.resultNotifiedAt ? '已通知：' + formatTime(s.resultNotifiedAt) : '未通知用户'}</div>`],
        ['时间', (s) => formatTime(s.createdAt)],
        ['操作', (s) => `
          <div class="actions">
            <button class="small-button" data-action="submission-approve" data-id="${s.id}">通过</button>
            <button class="small-button danger" data-action="submission-reject" data-id="${s.id}">驳回</button>
          </div>
        `],
      ])}
    </div>
  `;
}

async function renderFeedback(force) {
  const rows = await load('feedback', '/admin/feedback', force);
  renderTable({
    empty: '暂无反馈',
    rows,
    columns: [
      ['反馈', (f) => `<div class="cell-title">${escapeHtml(f.category)}</div><div class="cell-sub">${escapeHtml(f.content).slice(0, 120)}</div>`],
      ['用户', (f) => `<div>${escapeHtml(f.ownerName || '-')}</div><div class="cell-sub">${shortPhone(f.phone)}</div>`],
      ['联系', (f) => escapeHtml(f.contact || '-')],
      ['状态', (f) => statusPill(f.status)],
      ['时间', (f) => formatTime(f.createdAt)],
      ['操作', (f) => `
        <div class="actions">
          <button class="small-button" data-action="feedback-reviewing" data-id="${f.id}">处理中</button>
          <button class="small-button" data-action="feedback-close" data-id="${f.id}">关闭</button>
        </div>
      `],
    ],
  });
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
          <span>${campaign.respectUserSettings ? '尊重用户通知开关' : '重要通知强制入站'}</span>
        </div>
        <div class="risk-row">
          <span class="risk-badge">跳过 ${campaign.skippedCount || 0}</span>
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
    ...toggles,
  ].join(' · ');
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

async function renderNotifications(force) {
  const data = await load('notifications', '/admin/notifications', force);
  const summary = data.summary || {};
  const campaigns = data.campaigns || [];
  const devices = data.devices || [];
  const templates = data.templates || [];
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('发送批次', summary.campaigns || 0, '系统通知历史', '每次后台发送系统通知都会形成一条发送记录，并写入审计日志。')}
      ${metric('用户总数', summary.users || 0, `${summary.activeToday || 0} 今日活跃`, '“今日活跃用户”目标按 lastSeenAt 近 24 小时计算。')}
      ${metric('推送设备', summary.devices || 0, '已登记 token', '当前只是设备登记和站内通知记录；真实厂商推送服务后续可接入。')}
      ${metric('待处理', (summary.drafts || 0) + (summary.scheduled || 0), `${summary.drafts || 0} 草稿 · ${summary.scheduled || 0} 预约`, '草稿不会触达用户；预约通知到点后由服务自动写入 App 通知中心。')}
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
  const moderation = config.moderation || {};
  const revisions = config.revisions || [];
  const splash = config.app?.splash || {};
  const update = config.app?.update || {};
  $('content').innerHTML = `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>移动端联动配置</h2>
          <div class="section-sub">保存后，移动端下次启动会读取 /app/config 并影响对应功能</div>
        </div>
        ${help('当前第一版已接入：图片上限、附近半径、附近小事有效天数、AI 额度、功能开关、维护、公告、版本更新、启动提示和内容安全规则。')}
      </div>
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
            <h2>内容安全规则</h2>
            <div class="section-sub">保存后立即影响小事、评论、地点点评和新增地点提交</div>
          </div>
          ${help('阻断词会直接拒绝提交；高风险词和复审词会让小事/地点进入审核池。评论命中规则时会提示用户修改，避免出现“发了但看不到”。')}
        </div>
        <div class="switch-panel">
          ${featureCheckbox('cfgModerationEnabled', '启用内容安全规则', moderation.enabled)}
          ${featureCheckbox('cfgModerationTextRulesEnabled', '启用文本关键词规则', moderation.textRulesEnabled !== false)}
        </div>
        <div class="config-grid announcement-grid">
          <label class="wide">阻断关键词<textarea id="cfgModerationBlockKeywords" maxlength="1200" placeholder="一行一个，命中后直接拒绝提交">${escapeHtml(keywordTextareaValue(moderation.blockKeywords))}</textarea></label>
          <label class="wide">高风险关键词<textarea id="cfgModerationHighRiskKeywords" maxlength="1200" placeholder="一行一个，命中后进入人工审核">${escapeHtml(keywordTextareaValue(moderation.highRiskKeywords))}</textarea></label>
          <label class="wide">复审关键词<textarea id="cfgModerationReviewKeywords" maxlength="1200" placeholder="一行一个，命中后进入人工审核">${escapeHtml(keywordTextareaValue(moderation.reviewKeywords))}</textarea></label>
          <label>阻断提示<input id="cfgModerationBlockMessage" maxlength="80" value="${escapeHtml(moderation.blockMessage || '')}" /></label>
          <label>复审提示<input id="cfgModerationReviewMessage" maxlength="80" value="${escapeHtml(moderation.reviewMessage || '')}" /></label>
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
      <button class="primary-button" data-action="save-config">保存配置</button>
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

async function saveConfig() {
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
  const payload = {
    ai: {
      petAvatarDailyLimit: Number($('cfgPetAvatarDailyLimit').value),
      petChatDailyLimit: Number($('cfgPetChatDailyLimit').value),
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
      reviewKeywords: $('cfgModerationReviewKeywords').value,
      reviewMessage: $('cfgModerationReviewMessage').value,
      textRulesEnabled: $('cfgModerationTextRulesEnabled').checked,
    },
    reason: '配置中心保存',
    social: {
      discoverRadiusKm: Number($('cfgDiscoverRadiusKm').value),
      nearbyMomentTtlDays: Number($('cfgNearbyMomentTtlDays').value),
      petCircleMaxPhotos: Number($('cfgPetCircleMaxPhotos').value),
    },
  };
  state.cache.config = await patch('/admin/config', payload);
  state.cache.summary = null;
  showToast('配置已保存');
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

async function renderExports(force) {
  const rows = await load('exports', '/admin/exports', force);
  const totalRows = rows.reduce((sum, item) => sum + Number(item.rowCount || 0), 0);
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('可导出数据集', rows.length, 'CSV 下载', '导出接口需要管理员登录，并会写入审计日志。')}
      ${metric('当前总行数', totalRows, '按数据集独立统计', '页面展示的是当前后端状态里可导出的业务行数。')}
      ${metric('单次上限', rows[0]?.limit || 1000, '每个 CSV 最多行数', '防止误导出过大文件；后续可增加审批和异步导出。')}
    </div>
    <div class="card">
      <div class="section-head">
        <div>
          <h2>导出数据</h2>
          <div class="section-sub">下载会生成 CSV 文件，并记录到系统审计</div>
        </div>
        ${help('当前不导出图片二进制、设备 token、完整审计 before/after 快照等大字段或敏感字段。')}
      </div>
      ${tableHtml(rows, [
        ['数据集', (row) => `<div class="cell-title">${escapeHtml(row.label)}</div><div class="cell-sub">${escapeHtml(row.type)}</div><div class="cell-sub">${escapeHtml(row.description)}</div>`],
        ['当前行数', (row) => `<div class="cell-title">${escapeHtml(row.rowCount)}</div><div class="cell-sub">上限 ${escapeHtml(row.limit)}</div>`],
        ['字段', (row) => `<div class="export-fields">${(row.columns || []).slice(0, 8).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}${(row.columns || []).length > 8 ? `<span>+${(row.columns || []).length - 8}</span>` : ''}</div>`],
        ['操作', (row) => `<button class="small-button" data-action="download-export" data-id="${escapeHtml(row.type)}">下载 CSV</button>`],
      ], '暂无可导出数据')}
    </div>
  `;
}

async function downloadExport(type) {
  if (!type) return;
  const response = await fetch(`/admin/exports/${encodeURIComponent(type)}.csv`, {
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
  showToast('导出已开始下载');
}

async function renderAudit(force) {
  const rows = await load('audit', '/admin/audit-logs', force);
  renderTable({
    empty: '暂无审计日志',
    rows,
    columns: [
      ['动作', (r) => `<div class="cell-title">${escapeHtml(r.action)}</div><div class="cell-sub">${escapeHtml(r.targetType)} · ${escapeHtml(r.targetId)}</div>`],
      ['管理员', (r) => escapeHtml(r.adminName)],
      ['原因', (r) => escapeHtml(r.reason || '-')],
      ['时间', (r) => formatTime(r.createdAt)],
    ],
  });
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
