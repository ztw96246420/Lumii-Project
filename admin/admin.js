const state = {
  admin: null,
  cache: {},
  moderationQ: '',
  moderationStatus: 'pending',
  route: 'dashboard',
  token: localStorage.getItem('lumii-admin-token') || '',
};

const navItems = [
  { key: 'dashboard', label: '工作台' },
  { key: 'users', label: '用户管理' },
  { key: 'avatarJobs', label: 'AI 灵伴' },
  { key: 'moderation', label: '内容安全' },
  { key: 'socialPosts', label: '宠友圈' },
  { key: 'reports', label: '举报中心' },
  { key: 'places', label: '地图地点' },
  { key: 'feedback', label: '反馈工单' },
  { key: 'config', label: '配置中心' },
  { key: 'audit', label: '审计日志' },
  { key: 'sanctions', label: '用户处罚' },
  { key: 'exports', label: '数据导出', reserved: true },
];

const titles = {
  audit: ['系统审计', '后台所有写操作都会沉淀为审计记录'],
  avatarJobs: ['AI 灵伴', '生成任务、失败排查、额度返还'],
  config: ['配置中心', '这些配置会被移动端 /app/config 读取'],
  dashboard: ['总览', '运营工作台'],
  exports: ['数据导出', '需要审批的生产能力'],
  feedback: ['反馈工单', '用户反馈和客服处理队列'],
  moderation: ['内容安全', '举报、动态、评论和地点审核任务池'],
  places: ['地图地点', '地点点评与新增地点审核'],
  reports: ['举报中心', '宠友圈举报处理闭环'],
  sanctions: ['用户处罚', '禁言、冻结、封禁与撤销记录'],
  socialPosts: ['宠友圈', '动态与评论内容安全'],
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
    if (action === 'save-config') await saveConfig();
    if (action === 'sanction-create') await createSanction();
    if (action === 'sanction-revoke') await confirmPost(`/admin/users/${encodeURIComponent(phone)}/sanctions/${encodeURIComponent(id)}/revoke`, { reason }, '确认撤销这条处罚？');
    if (action === 'quick-mute') await post(`/admin/users/${encodeURIComponent(phone)}/sanctions`, { durationHours: 24, reason: '用户列表快捷禁言', type: 'mute' });
    if (action === 'quick-freeze') await post(`/admin/users/${encodeURIComponent(phone)}/sanctions`, { durationHours: 72, reason: '用户列表快捷冻结', type: 'freeze' });
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
    if (action === 'review-approve') await post(`/admin/places/reviews/${id}/approve`, { reason });
    if (action === 'review-reject') await post(`/admin/places/reviews/${id}/reject`, { reason });
    if (action === 'submission-approve') await post(`/admin/places/submissions/${id}/approve`, { reason });
    if (action === 'submission-reject') await post(`/admin/places/submissions/${id}/reject`, { reason });
    if (action === 'feedback-reviewing') await patch(`/admin/feedback/${id}`, { reason, status: 'reviewing' });
    if (action === 'feedback-close') await patch(`/admin/feedback/${id}`, { reason, status: 'closed' });
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

function clearOperationalCaches() {
  ['audit', 'moderation', 'placeReviews', 'placeSubmissions', 'reports', 'sanctions', 'socialComments', 'socialPosts', 'summary', 'users'].forEach((key) => {
    state.cache[key] = null;
  });
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
    audit: renderAudit,
    avatarJobs: renderAvatarJobs,
    config: renderConfig,
    dashboard: renderDashboard,
    feedback: renderFeedback,
    moderation: renderModeration,
    places: renderPlaces,
    reports: renderReports,
    sanctions: renderSanctions,
    socialPosts: renderSocialPosts,
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
      ${metric('AI 处理中', data.ai.avatarProcessing, `${data.ai.avatarStuck} 个可能卡住`, '超过 5 分钟未更新会进入卡住计数。')}
      ${metric('审核任务', data.moderation?.pending ?? data.content.pendingReports, `${data.moderation?.escalated || 0} 个升级`, '统一内容安全任务池：举报、被举报动态/评论、地点点评和新增地点。')}
      ${metric('地点待审', data.places.pendingReviews + data.places.pendingSubmissions, `${data.places.total} 个地点`, '地点点评与新增地点提交合计。')}
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

async function renderModeration(force) {
  const query = new URLSearchParams({
    q: state.moderationQ,
    status: state.moderationStatus,
  });
  const data = await load('moderation', `/admin/moderation/tasks?${query.toString()}`, force);
  const tasks = data.tasks || [];
  const summary = data.summary || {};
  $('content').innerHTML = `
    <div class="grid metrics">
      ${metric('待处理', summary.pending || 0, `${summary.escalated || 0} 个已升级`, 'pending / reviewing / escalated 都算作待处理任务。')}
      ${metric('举报任务', summary.reports || 0, '来自用户举报', '用户举报会自动关联被举报动态或评论。')}
      ${metric('社交内容', summary.social || 0, '动态/评论聚合', '被举报内容会聚合为内容级任务，便于一次隐藏或删除。')}
      ${metric('地点审核', summary.places || 0, '点评/新增地点', '地点点评和新增地点共用这套审核视角。')}
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
          <button class="small-button" data-action="moderation-filter">应用</button>
          <button class="small-button" data-action="moderation-clear">重置</button>
        </div>
      </div>
      ${tasks.length ? `<div class="moderation-list">${tasks.map(renderModerationTaskCard).join('')}</div>` : '<div class="placeholder"><div><strong>暂无审核任务</strong><div>当前筛选下没有需要处理的内容。</div></div></div>'}
    </div>
  `;
}

function moderationStatusOption(value, label) {
  return `<option value="${value}" ${state.moderationStatus === value ? 'selected' : ''}>${label}</option>`;
}

function riskBadge(label) {
  return `<span class="risk-badge">${escapeHtml(label)}</span>`;
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
  return `
    <article class="moderation-card">
      <div class="moderation-card-main">
        <div class="moderation-title-row">
          <div>
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
          <span>时间：${formatTime(task.createdAt)}</span>
        </div>
        <div class="risk-row">
          <span class="risk-score">风险 ${task.riskScore || 0}</span>
          ${riskTypes}
          ${task.relatedCount ? `<span class="risk-badge">${task.relatedCount} 条关联</span>` : ''}
        </div>
      </div>
      <div class="moderation-actions">
        ${actions || '<span class="muted">无可用动作</span>'}
      </div>
    </article>
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

async function renderSanctions(force) {
  const rows = await load('sanctions', '/admin/sanctions', force);
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
      <button class="primary-button" data-action="sanction-create">创建处罚</button>
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
  const type = $('sanctionType').value;
  const durationHours = Number($('sanctionDurationHours').value);
  const reason = $('sanctionReason').value.trim();
  if (!phone || !reason) {
    throw new Error('请填写手机号和处罚原因');
  }
  await post(`/admin/users/${encodeURIComponent(phone)}/sanctions`, { durationHours, reason, type });
  state.cache.sanctions = null;
  state.cache.summary = null;
  state.cache.users = null;
}

async function renderAvatarJobs(force) {
  const rows = await load('avatarJobs', '/admin/ai/avatar-jobs', force);
  renderTable({
    empty: '暂无 AI 形象任务',
    rows,
    columns: [
      ['任务', (job) => `<div class="cell-title">${escapeHtml(job.petName || job.id)}</div><div class="cell-sub">${escapeHtml(job.id)}</div>`],
      ['用户', (job) => `<div>${escapeHtml(job.ownerName || '-')}</div><div class="cell-sub">${shortPhone(job.ownerPhone)}</div>`],
      ['状态', (job) => `${statusPill(job.status)}<div class="cell-sub">${escapeHtml(job.provider || '-')} · ${job.progress || 0}%</div>`],
      ['错误', (job) => `<div>${escapeHtml(job.errorCode || '-')}</div><div class="cell-sub">${escapeHtml(job.lastStatusError || job.errorMessage || '')}</div>`],
      ['更新时间', (job) => formatTime(job.updatedAt || job.createdAt)],
      ['操作', (job) => `
        <div class="actions">
          <button class="small-button" data-action="avatar-refresh" data-id="${job.id}">刷新</button>
          <button class="small-button" data-action="avatar-retry" data-id="${job.id}">重试</button>
          <button class="small-button" data-action="avatar-refund" data-id="${job.id}">返还</button>
          <button class="small-button danger" data-action="avatar-fail" data-id="${job.id}">失败</button>
        </div>
      `],
    ],
  });
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
      ['状态', (r) => statusPill(r.status)],
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
        ['状态', (r) => statusPill(r.status)],
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
        ['状态', (s) => statusPill(s.status)],
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

async function renderConfig(force) {
  const config = await load('config', '/admin/config', force);
  $('content').innerHTML = `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>移动端联动配置</h2>
          <div class="section-sub">保存后，移动端下次启动会读取 /app/config 并影响对应功能</div>
        </div>
        ${help('当前第一版已接入：图片上限、附近半径、AI 额度、功能开关。未接入项在文档里标注。')}
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
      <button class="primary-button" data-action="save-config">保存配置</button>
    </div>
  `;
}

function featureCheckbox(id, label, checked) {
  return `<label class="switch-row"><span>${label}</span><input id="${id}" type="checkbox" ${checked ? 'checked' : ''} /></label>`;
}

async function saveConfig() {
  const payload = {
    ai: {
      petAvatarDailyLimit: Number($('cfgPetAvatarDailyLimit').value),
      petChatDailyLimit: Number($('cfgPetChatDailyLimit').value),
    },
    app: {
      maintenanceEnabled: $('cfgMaintenanceEnabled').checked,
      maintenanceMessage: $('cfgMaintenanceMessage').value,
    },
    features: {
      aiAvatar: $('cfgFeatureAiAvatar').checked,
      petChat: $('cfgFeaturePetChat').checked,
      petCircle: $('cfgFeaturePetCircle').checked,
      places: $('cfgFeaturePlaces').checked,
      walkInvite: $('cfgFeatureWalkInvite').checked,
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
