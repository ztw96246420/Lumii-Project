const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const backendScript = path.join(rootDir, 'scripts', 'lumii-backend.cjs');
const defaultArtifactsDir = path.join(rootDir, 'artifacts', 'pet-circle-frontend');
const explicitBaseUrl = Boolean(process.env.FRONTEND_BASE_URL);
let baseUrl = (process.env.FRONTEND_BASE_URL || 'http://localhost:19031').replace(/\/+$/, '');
const artifactsDir = process.env.FRONTEND_SMOKE_ARTIFACTS_DIR || defaultArtifactsDir;

function requirePlaywright() {
  const moduleNames = ['playwright-core', 'playwright'];
  for (const name of moduleNames) {
    try {
      return require(name);
    } catch {}
  }

  const moduleDir = process.env.PLAYWRIGHT_MODULE_DIR || path.join(os.tmpdir(), 'lumii-playwright-core', 'node_modules');
  for (const name of moduleNames) {
    const packagePath = path.join(moduleDir, name);
    try {
      return require(packagePath);
    } catch {}
  }

  throw new Error('Playwright is not available. Install playwright or set PLAYWRIGHT_MODULE_DIR.');
}

function browserExecutablePath() {
  const candidates = [
    process.env.PLAYWRIGHT_BROWSER_EXECUTABLE,
    process.env.EDGE_EXECUTABLE,
    'C:/Users/Administrator/AppData/Local/Microsoft/Edge/Bin/123.0.2420.97/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function frontendPort() {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.port) return parsed.port;
    return parsed.protocol === 'https:' ? '443' : '80';
  } catch {
    return '19031';
  }
}

async function frontendReady() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${baseUrl}/?route=health`, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForFrontend() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await frontendReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Frontend did not become ready at ${baseUrl}`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForBackend(apiBaseUrl) {
  const deadline = Date.now() + 30_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError || new Error(`Frontend smoke backend did not start at ${apiBaseUrl}`);
}

async function startBackendForFrontendSmoke() {
  const configuredApiBaseUrl = String(process.env.FRONTEND_SMOKE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configuredApiBaseUrl) return { apiBaseUrl: configuredApiBaseUrl, process: null, tempDir: null };
  const port = await getFreePort();
  const apiBaseUrl = `http://127.0.0.1:${port}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumii-frontend-smoke-backend-'));
  const statePath = path.join(tempDir, 'state.json');
  const child = spawn(process.execPath, [backendScript, '--port', String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      LUMII_BACKEND_PORT: String(port),
      LUMII_BACKEND_STATE_PATH: statePath,
      SMS_COOLDOWN_MS: '0',
      SMS_DAILY_LIMIT: '1000',
      SMS_DEVICE_DAILY_LIMIT: '1000',
      SMS_IP_DAILY_LIMIT: '1000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => {
    if (process.env.SMOKE_VERBOSE) process.stdout.write(chunk);
  });
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  const runtime = { apiBaseUrl, process: child, tempDir };
  try {
    await waitForBackend(apiBaseUrl);
    return runtime;
  } catch (error) {
    await stopBackendForFrontendSmoke(runtime);
    throw error;
  }
}

async function stopBackendForFrontendSmoke(runtime) {
  const child = runtime?.process;
  if (child && child.exitCode === null) {
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL');
        resolve();
      }, 3000);
      child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      child.kill();
    });
  }
  if (runtime?.tempDir) fs.rmSync(runtime.tempDir, { force: true, recursive: true });
}

async function startFrontendIfNeeded(apiBaseUrl) {
  if (await frontendReady()) return null;
  if (explicitBaseUrl || process.env.FRONTEND_SMOKE_AUTO_START === '0') {
    throw new Error(`Frontend is not reachable at ${baseUrl}`);
  }
  const port = frontendPort();
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(command, ['expo', 'start', '--web', '--port', port, '--non-interactive'], {
    cwd: path.join(rootDir, 'mobile'),
    env: {
      ...process.env,
      BROWSER: 'none',
      EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
      EXPO_PUBLIC_API_MODE: 'http',
      EXPO_PUBLIC_REQUIRE_HTTPS: 'false',
      EXPO_NO_TELEMETRY: '1',
    },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => {
    if (process.env.SMOKE_VERBOSE) process.stdout.write(chunk);
  });
  child.stderr.on('data', (chunk) => {
    if (process.env.SMOKE_VERBOSE) process.stderr.write(chunk);
  });
  await waitForFrontend();
  return child;
}

async function stopFrontend(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      execFile('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], () => resolve());
    });
    return;
  }
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

async function clickExactText(page, text, options = {}) {
  await page.getByText(text, { exact: true }).last().click(options);
}

async function waitExactText(page, text, options = {}) {
  await page.getByText(text, { exact: true }).first().waitFor({ timeout: 30_000, ...options });
}

async function waitInputValue(page, value) {
  await page.waitForFunction(
    (expected) =>
      Array.from(document.querySelectorAll('input, textarea')).some((element) => element.value === expected),
    value,
    { timeout: 30_000 },
  );
}

async function screenshot(page, name) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  await page.screenshot({ fullPage: true, path: path.join(artifactsDir, name) });
}

async function waitBodyIncludes(page, text) {
  await page.waitForFunction((expected) => document.body.innerText.includes(expected), text, { timeout: 30_000 });
}

async function waitBodyExcludes(page, text) {
  await page.waitForFunction((expected) => !document.body.innerText.includes(expected), text, { timeout: 30_000 });
}

async function waitLabelEnabled(page, label) {
  await page.waitForFunction(
    (name) => {
      const element = document.querySelector(`[aria-label="${name}"]`);
      return Boolean(element && !element.disabled && element.getAttribute('aria-disabled') !== 'true');
    },
    label,
    { timeout: 30_000 },
  );
}

function collectPageErrors(page, pageErrors) {
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    const status = response.status();
    if (status < 400) return;
    try {
      const url = new URL(response.url());
      const authClearedPaths = ['/permissions', '/support/tickets', '/sanction-appeals'];
      if (status === 401 && authClearedPaths.some((pathname) => url.pathname === pathname || url.pathname.startsWith(`${pathname}/`))) return;
    } catch {}
    pageErrors.push(`HTTP ${status}: ${response.url()}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (text === 'Failed to load resource: net::ERR_CONNECTION_CLOSED') return;
      if (text.includes('net::ERR_UNKNOWN_URL_SCHEME')) return;
      if (text.includes('Failed to load resource: the server responded with a status of 401')) return;
      pageErrors.push(text);
    }
  });
  page.on('dialog', (dialog) => {
    if (dialog.type() === 'confirm') {
      void dialog.accept();
    } else {
      void dialog.dismiss();
    }
  });
}

async function clickFirstVisibleText(page, texts, options = {}) {
  for (const text of texts) {
    const locator = page.getByText(text, { exact: true }).last();
    try {
      await locator.waitFor({ state: 'visible', timeout: options.timeout ?? 2_000 });
      await locator.click(options);
      return text;
    } catch {}
  }
  throw new Error(`None of these texts became visible: ${texts.join(', ')}`);
}

async function waitFirstVisibleText(page, texts, options = {}) {
  for (const text of texts) {
    try {
      await page.getByText(text, { exact: true }).first().waitFor({ state: 'visible', timeout: options.timeout ?? 2_000 });
      return text;
    } catch {}
  }
  throw new Error(`None of these texts became visible: ${texts.join(', ')}`);
}

function textWindowAround(text, marker, radius = 220) {
  const index = text.indexOf(marker);
  if (index < 0) return text.slice(0, radius * 2);
  return text.slice(Math.max(0, index - radius), index + marker.length + radius);
}

function assertMessageTabBadge(text, expected, context) {
  const badgePattern = new RegExp(`\\n${expected}\\n消息`);
  if (!badgePattern.test(text)) {
    throw new Error(`${context}: expected bottom message tab badge ${expected}.\n${textWindowAround(text, '消息', 320)}`);
  }
}

function conversationRowText(text, conversationName, nextConversationName) {
  const start = text.indexOf(conversationName);
  if (start < 0) return textWindowAround(text, conversationName);
  const nextStart = nextConversationName ? text.indexOf(`\n${nextConversationName}`, start + conversationName.length) : -1;
  return text.slice(start, nextStart > start ? nextStart : start + 180);
}

function assertConversationUnreadBadge(text, conversationName, expected, context, nextConversationName) {
  const aroundConversation = conversationRowText(text, conversationName, nextConversationName);
  const badgePattern = new RegExp(`(?:^|\\n)${expected}(?:\\n|$)`);
  if (!badgePattern.test(aroundConversation)) {
    throw new Error(`${context}: expected ${conversationName} unread badge ${expected}.\n${aroundConversation}`);
  }
}

function assertConversationUnreadBadgeCleared(text, conversationName, clearedValue, context, nextConversationName) {
  const aroundConversation = conversationRowText(text, conversationName, nextConversationName);
  const badgePattern = new RegExp(`(?:^|\\n)${clearedValue}(?:\\n|$)`);
  if (badgePattern.test(aroundConversation)) {
    throw new Error(`${context}: expected ${conversationName} unread badge ${clearedValue} to be cleared.\n${aroundConversation}`);
  }
}

function assertTextBefore(text, earlier, later, context) {
  const earlierIndex = text.indexOf(earlier);
  const laterIndex = text.indexOf(later);
  if (earlierIndex < 0 || laterIndex < 0 || earlierIndex >= laterIndex) {
    throw new Error(`${context}: expected ${earlier} before ${later}.\n${textWindowAround(text, earlierIndex >= 0 ? earlier : later, 360)}`);
  }
}

function isoDateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function selectVaccineQuickDate(page, date) {
  await page.getByLabel(`vaccine-quick-date-${date}`).click();
  await waitBodyIncludes(page, date);
}

async function selectPetBirthday(page, triggerLabel, isoDate) {
  const [year, month, day] = isoDate.split('-').map((part) => Number(part));
  await page.getByLabel(triggerLabel).click();
  await page.getByRole('button', { exact: true, name: `pet-birthday-year-${year}` }).click();
  await page.getByRole('button', { exact: true, name: `pet-birthday-month-${month}` }).click();
  await page.getByRole('button', { exact: true, name: `pet-birthday-day-${day}` }).click();
  await page.getByLabel('confirm-pet-birthday-picker').click();
  await page.getByLabel('confirm-pet-birthday-picker').waitFor({ state: 'hidden', timeout: 30_000 });
}

async function loginMockUser(page, phone) {
  await page.goto(baseUrl, { timeout: 60_000, waitUntil: 'networkidle' });
  await page.getByPlaceholder('请输入中国大陆手机号').fill(phone);
  await page.getByLabel('同意用户协议与隐私政策').click();
  await clickExactText(page, '获取验证码');
  await waitExactText(page, '输入验证码');
  await page.keyboard.type('962464');
  const firstAppState = await waitFirstVisibleText(page, [
    '一键开启全部权限',
    '下一步，添加宠物',
    '稍后再说',
    '添加我的宠物',
    '添加宠物',
    '首页',
    '发现',
    '消息',
  ], { timeout: 30_000 });
  if (firstAppState === '一键开启全部权限') {
    await clickExactText(page, '一键开启全部权限');
    const permissionExit = await waitFirstVisibleText(page, ['下一步，添加宠物', '稍后再说', '添加我的宠物', '首页', '消息'], { timeout: 30_000 });
    if (permissionExit === '下一步，添加宠物' || permissionExit === '稍后再说') await clickExactText(page, permissionExit);
  } else if (firstAppState === '下一步，添加宠物' || firstAppState === '稍后再说') {
    await clickExactText(page, firstAppState);
  }
  await waitFirstVisibleText(page, ['添加我的宠物', '添加宠物', '首页', '发现', '消息'], { timeout: 30_000 });
}

async function main() {
  if (!explicitBaseUrl) baseUrl = `http://127.0.0.1:${await getFreePort()}`;
  const backendRuntime = await startBackendForFrontendSmoke();
  let frontendProcess = null;
  let browser = null;
  const pageErrors = [];
  try {
    frontendProcess = await startFrontendIfNeeded(backendRuntime.apiBaseUrl);
    const playwright = requirePlaywright();
    const executablePath = browserExecutablePath();
    if (!executablePath) throw new Error('No Chromium/Edge executable found. Set PLAYWRIGHT_BROWSER_EXECUTABLE.');
    browser = await playwright.chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const page = await context.newPage();
    collectPageErrors(page, pageErrors);
    await page.addInitScript(() => {
      try {
        Object.defineProperty(window.navigator, 'share', {
          configurable: true,
          value: async (payload) => {
            window.__lumiiLastShare = payload;
          },
        });
      } catch {
        window.navigator.share = async (payload) => {
          window.__lumiiLastShare = payload;
        };
      }
    });

    await page.goto(`${baseUrl}/?route=health`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '近期记录');
    await waitExactText(page, '宠物日历');
    await screenshot(page, 'smoke-frontend-00-health-preview.png');

    await page.goto(`${baseUrl}/?route=home&mockAvatar=missing`, { timeout: 60_000, waitUntil: 'networkidle' });
    await page.getByLabel('pet-avatar-placeholder').first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByLabel('pet-photo-placeholder').first().waitFor({ state: 'visible', timeout: 30_000 });
    await screenshot(page, 'smoke-frontend-00-missing-avatar-placeholder.png');

    const routeRenderCases = [
      { route: 'generating', texts: ['生成灵伴', '正在生成你的小灵伴'] },
      { route: 'petCircleProfile', texts: ['我发布的小事', '更换封面'] },
      { route: 'healthMemos', texts: ['备忘', '还没有备忘'] },
      { route: 'supportTickets', texts: ['我的反馈', '反馈处理进度'] },
      { route: 'emptyPet', texts: ['还没有添加你的毛孩子', '添加我的宠物'] },
      { route: 'upload', texts: ['添加宠物 2/2', '相册选择'] },
      { route: 'uploadDetail', texts: ['识别结果', '确认并生成灵伴'] },
      { route: 'ownerEdit', texts: ['编辑个人资料', '保存资料'] },
      { route: 'petDetail', texts: ['宠物档案', '更换'] },
      { route: 'accountSecurity', texts: ['账号安全', '验证码登录'] },
    ];
    for (const routeCase of routeRenderCases) {
      await page.goto(`${baseUrl}/?route=${routeCase.route}`, { timeout: 60_000, waitUntil: 'networkidle' });
      for (const text of routeCase.texts) await waitExactText(page, text);
    }
    await screenshot(page, 'smoke-frontend-00-route-coverage-account-security.png');

    await page.goto(`${baseUrl}/?route=petCircleProfile`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '我发布的小事');
    await page.getByLabel('更换宠友圈封面').waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByLabel('我的宠友圈标记').waitFor({ state: 'visible', timeout: 30_000 });
    if (await page.getByLabel('我的宠友圈标记').count() !== 1) {
      throw new Error('Own pet circle profile should render exactly one header ownership badge');
    }
    await waitExactText(page, '今天 16:42');
    await waitExactText(page, '今天 10:18');
    await waitExactText(page, '10:18');
    await waitExactText(page, '同日');
    await page.getByLabel('打开小事操作菜单-mock-my-circle-today-evening').click();
    await page.getByLabel('菜单查看评论-mock-my-circle-today-evening').waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByLabel('菜单删除小事-mock-my-circle-today-evening').waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByLabel('菜单查看评论-mock-my-circle-today-evening').click();
    await waitExactText(page, 'Lucky 的评论');
    await waitExactText(page, '奶油：今天也太可爱啦。');
    await screenshot(page, 'smoke-frontend-00-profile-comments.png');
    await page.getByLabel('关闭我的小事评论').click();
    await page.getByText('Lucky 的评论', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    const deletableProfilePostText = '早上吃饭饭很开心，顺手记录一下精神状态。';
    await page.getByLabel('打开小事操作菜单-mock-my-circle-today-morning').click();
    await page.getByLabel('菜单删除小事-mock-my-circle-today-morning').click();
    await waitExactText(page, '删除这条小事？');
    await clickExactText(page, '取消');
    await waitExactText(page, deletableProfilePostText);
    await page.getByLabel('打开小事操作菜单-mock-my-circle-today-morning').click();
    await page.getByLabel('菜单删除小事-mock-my-circle-today-morning').click();
    await waitExactText(page, '删除这条小事？');
    await clickExactText(page, '删除');
    await page.getByText('删除这条小事？', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    await waitBodyExcludes(page, deletableProfilePostText);
    await waitExactText(page, '小事已删除');
    await page.waitForTimeout(350);
    await screenshot(page, 'smoke-frontend-00-profile-post-deleted.png');

    const backdatedHealthDate = isoDateAfterDays(-6);
    await page.goto(`${baseUrl}/?route=healthCalendar&mockHealthCalendar=backdated`, { timeout: 60_000, waitUntil: 'networkidle' });
    await page.getByLabel(`health-calendar-day-${backdatedHealthDate}`).click();
    await page.getByLabel('health-calendar-event-memo-mock-backdated-profile-memo').waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByLabel('health-calendar-event-memo-mock-backdated-social-memo').waitFor({ state: 'visible', timeout: 30_000 });
    await screenshot(page, 'smoke-frontend-00a-health-calendar-backdated.png');

    await page.goto(`${baseUrl}/?route=multiPet&mockMultiPet=interactive`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '我的宠物');
    await waitExactText(page, '全部宠物 · 2 只');
    await waitBodyIncludes(page, 'Lucky');
    await waitBodyIncludes(page, 'Mochi');
    await page.getByLabel('switch-pet-preview-pet-mochi').click();
    await waitExactText(page, '猫咪 · 英短');
    await page.getByLabel('switch-pet-preview-pet-lucky').waitFor({ state: 'visible', timeout: 30_000 });
    await screenshot(page, 'smoke-frontend-00a-multi-pet-switched.png');
    await page.getByLabel('delete-pet-preview-pet-lucky').click();
    await page.getByLabel('confirm-delete-pet-preview-pet-lucky').waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByLabel('confirm-delete-pet-preview-pet-lucky').click();
    await waitExactText(page, '全部宠物 · 1 只');
    await page.getByLabel('confirm-delete-pet-preview-pet-lucky').waitFor({ state: 'hidden', timeout: 30_000 });
    await page.getByLabel('delete-pet-preview-pet-lucky').waitFor({ state: 'hidden', timeout: 30_000 });
    await waitBodyIncludes(page, 'Mochi');
    await page.waitForTimeout(800);
    await screenshot(page, 'smoke-frontend-00a2-multi-pet-deleted.png');

    await page.goto(`${baseUrl}/?route=uploadNoPet&mockUpload=noPet`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '识别失败');
    await waitExactText(page, '未检测到宠物主体');
    await waitExactText(page, '让宠物占画面主体');
    await screenshot(page, 'smoke-frontend-00b-upload-no-pet.png');
    await clickExactText(page, '重新选择');
    await waitExactText(page, '添加宠物 2/2');

    const petChatSmokeText = 'Playwright 想和 Lucky 聊一会儿';
    await page.goto(`${baseUrl}/?route=chat`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '在线 · 心情很好');
    await page.getByLabel('pet-chat-input').fill(petChatSmokeText);
    await page.getByLabel('send-pet-chat-message').click();
    await waitBodyIncludes(page, petChatSmokeText);
    await waitBodyIncludes(page, '我收到啦');
    await page.getByLabel(/^pet-chat-feedback-good-pet-ai-/).last().click();
    await waitExactText(page, '已记录：这个回复像它');
    await screenshot(page, 'smoke-frontend-00a-pet-chat-feedback.png');

    await page.goto(`${baseUrl}/?route=weight`, { timeout: 60_000, waitUntil: 'networkidle' });
    await page.getByLabel('add-weight-record').first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByLabel('add-weight-record').first().click();
    await page.getByLabel('weight-value-input').fill('29.2');
    await page.getByLabel('weight-note-input').fill('PW weight add');
    await page.getByLabel('save-weight-record').click();
    await waitBodyIncludes(page, '29.2 kg');
    await waitBodyIncludes(page, 'PW weight add');
    await screenshot(page, 'smoke-frontend-00b-weight-added.png');

    await page.getByLabel(/^edit-weight-record-/).first().click();
    await page.getByLabel('weight-value-input').fill('29.4');
    await page.getByLabel('weight-note-input').fill('PW weight edit');
    await page.getByLabel('save-weight-edit').click();
    await waitBodyIncludes(page, '29.4 kg');
    await waitBodyIncludes(page, 'PW weight edit');
    await screenshot(page, 'smoke-frontend-00c-weight-edited.png');

    await page.getByLabel(/^edit-weight-record-/).first().click();
    await page.getByLabel('delete-weight-record').click();
    await page.getByLabel('confirm-delete-weight-record').click();
    await waitBodyExcludes(page, 'PW weight edit');
    await screenshot(page, 'smoke-frontend-00d-weight-deleted.png');

    const smokeVaccineName = 'PW vaccine smoke';
    const editedVaccineName = 'PW vaccine edited';
    await page.goto(`${baseUrl}/?route=vaccine`, { timeout: 60_000, waitUntil: 'networkidle' });
    await page.getByLabel('toggle-vaccine-composer').click();
    await page.getByLabel('vaccine-name-input').fill(smokeVaccineName);
    await selectVaccineQuickDate(page, isoDateAfterDays(0));
    await page.getByLabel('save-vaccine-plan').click();
    await waitBodyIncludes(page, smokeVaccineName);
    await screenshot(page, 'smoke-frontend-00e-vaccine-added.png');

    await page.getByLabel(/^edit-vaccine-plan-PW vaccine smoke-/).first().click();
    await waitExactText(page, '编辑计划');
    await page.getByLabel('vaccine-name-input').fill(editedVaccineName);
    await selectVaccineQuickDate(page, isoDateAfterDays(7));
    await page.getByLabel('save-vaccine-edit').click();
    await waitBodyIncludes(page, editedVaccineName);
    await waitBodyExcludes(page, smokeVaccineName);
    await screenshot(page, 'smoke-frontend-00f-vaccine-edited.png');

    await page.getByLabel(/^enable-vaccine-reminder-PW vaccine edited-/).first().click();
    await page.getByLabel(/^vaccine-reminder-enabled-PW vaccine edited-/).first().waitFor({ state: 'visible', timeout: 30_000 });
    await screenshot(page, 'smoke-frontend-00f-vaccine-reminder-enabled.png');

    const smokeVaccineDoneButton = page.getByLabel(/^complete-vaccine-PW vaccine edited-/);
    await smokeVaccineDoneButton.click();
    await smokeVaccineDoneButton.waitFor({ state: 'hidden', timeout: 30_000 });
    await waitBodyIncludes(page, editedVaccineName);
    await screenshot(page, 'smoke-frontend-00g-vaccine-completed.png');

    await page.getByLabel(/^edit-vaccine-plan-PW vaccine edited-/).first().click();
    await page.getByLabel(/^restore-vaccine-plan-/).click();
    await page.getByLabel(/^complete-vaccine-PW vaccine edited-/).waitFor({ state: 'visible', timeout: 30_000 });
    await screenshot(page, 'smoke-frontend-00g2-vaccine-restored.png');

    await page.getByLabel(/^edit-vaccine-plan-PW vaccine edited-/).first().click();
    await page.getByLabel(/^delete-vaccine-plan-/).click();
    await waitExactText(page, '删除这条计划？');
    await clickExactText(page, '取消');
    await waitBodyIncludes(page, editedVaccineName);
    await page.getByLabel(/^delete-vaccine-plan-/).click();
    await waitExactText(page, '删除这条计划？');
    await clickExactText(page, '删除');
    await waitBodyExcludes(page, editedVaccineName);
    await screenshot(page, 'smoke-frontend-00g3-vaccine-deleted.png');

    await page.goto(`${baseUrl}/?route=aiResult`, { timeout: 60_000, waitUntil: 'networkidle' });
    await page.getByLabel('select-avatar-candidate-1').click();
    await page.getByLabel('open-avatar-feedback').click();
    await page.getByLabel('avatar-feedback-chip-color_lighter').click();
    await screenshot(page, 'smoke-frontend-00h-avatar-feedback-open.png');
    await page.getByLabel('cancel-avatar-feedback').click();
    await page.getByLabel('open-avatar-regenerate-confirm').click();
    await screenshot(page, 'smoke-frontend-00i-avatar-regenerate-confirm.png');
    await page.getByLabel('cancel-avatar-regenerate').click();
    await page.getByLabel('save-avatar-result').click();
    await waitExactText(page, '早安，Lucky！');
    await screenshot(page, 'smoke-frontend-00j-avatar-saved-home.png');

    await page.goto(`${baseUrl}/?route=memoNew`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '新增备忘');
    await page.getByPlaceholder('例如：洗澡记录、复诊提醒').fill('洗澡记录');
    await page.getByPlaceholder('今天有什么值得记录的小事？').fill('今天洗澡后精神很好');
    await clickExactText(page, '保存备忘');
    await waitExactText(page, '宠物日历');
    await screenshot(page, 'smoke-frontend-01-memo-saved.png');

    const editedMemoTitle = 'PW备忘编辑';
    const editedMemoContent = 'Playwright 已编辑备忘内容';
    await page.getByLabel(/^health-calendar-event-memo-m-/).first().click();
    await waitExactText(page, '编辑备忘');
    await page.getByLabel('memo-edit-title-input').fill(editedMemoTitle);
    await page.getByLabel('memo-edit-content-input').fill(editedMemoContent);
    await clickExactText(page, '保存修改');
    await waitExactText(page, '宠物日历');
    await waitBodyIncludes(page, editedMemoTitle);
    await screenshot(page, 'smoke-frontend-01b-memo-edited.png');
    await page.getByLabel(/^health-calendar-event-memo-m-/).first().click();
    await waitExactText(page, '编辑备忘');
    await page.getByLabel('delete-health-memo').click();
    await page.getByLabel('confirm-delete-health-memo').click();
    await waitExactText(page, '宠物日历');
    await waitBodyExcludes(page, editedMemoTitle);
    await screenshot(page, 'smoke-frontend-01c-memo-deleted.png');

    await page.goto(`${baseUrl}/?route=discover`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '宠友圈');
    await waitExactText(page, '分享 Lucky 的今日小事');
    await waitExactText(page, '+3');
    await waitExactText(page, '展开');
    await clickExactText(page, '展开');
    await waitExactText(page, '收起');
    await clickExactText(page, '收起');
    await waitExactText(page, '展开');
    await waitExactText(page, '已看到附近最新小事');
    await screenshot(page, 'smoke-frontend-02-discover-circle.png');
    await clickExactText(page, '+3');
    await waitExactText(page, '3/6');
    await screenshot(page, 'smoke-frontend-02b-discover-photo-viewer.png');
    await page.getByLabel('分享宠友圈小事').click();
    await waitExactText(page, '小事已分享');
    const petCircleSharePayload = await page.evaluate(() => window.__lumiiLastShare ?? null);
    const petCircleShareText = petCircleSharePayload?.text ?? '';
    if (!petCircleShareText.includes('Lucky 的今日小事') || !petCircleShareText.includes('照片：6 张') || !petCircleShareText.includes('来自 Lumii 灵伴宠友圈')) {
      throw new Error(`Unexpected pet circle share payload: ${JSON.stringify(petCircleSharePayload)}`);
    }

    const publicPostText = 'Playwright 评论链路小事，今天和 Lucky 在楼下转了一圈。';
    await page.goto(`${baseUrl}/?route=dailyPost`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '今日小事');
    await page
      .getByPlaceholder('写下今天的小事，比如散步、食欲、精神状态，或者一个可爱的瞬间。')
      .fill(publicPostText);
    await clickExactText(page, '发布');
    await waitExactText(page, '早安，Lucky！');

    await clickExactText(page, '发现');
    await waitExactText(page, publicPostText);
    await page.getByLabel('查看小事评论').first().click();
    await page.getByPlaceholder(/回复 .* 的主人/).fill('一起散步呀');
    await page.getByRole('button', { name: '发送宠友圈评论' }).click();
    await waitExactText(page, '一起散步呀');
    await screenshot(page, 'smoke-frontend-02a-discover-comments.png');
    await page.getByRole('button', { name: '删除评论' }).last().click();
    await page.getByText('一起散步呀', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    await page.getByRole('button', { name: '关闭宠友圈评论' }).click();

    await page.goto(`${baseUrl}/?route=notifications`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '通知');
    await waitExactText(page, 'Lucky 的小事有新互动');
    await clickExactText(page, 'Lucky 的小事有新互动');
    await waitExactText(page, '宠友圈');
    await waitExactText(page, '来自通知');
    await waitExactText(page, '分享 Lucky 的今日小事');
    await screenshot(page, 'smoke-frontend-02c-notification-to-circle.png');

    await page.goto(`${baseUrl}/?route=notifications`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, 'AI 形象生成');
    await waitExactText(page, '查看形象');
    const avatarNotificationErrorStart = pageErrors.length;
    await clickExactText(page, 'AI 形象生成');
    await waitExactText(page, '宠物档案');
    await screenshot(page, 'smoke-frontend-02d-notification-to-avatar.png');
    const avatarNotificationErrors = pageErrors.splice(avatarNotificationErrorStart);
    pageErrors.push(...avatarNotificationErrors.filter((message) => !message.includes('net::ERR_UNKNOWN_URL_SCHEME')));

    await page.goto(`${baseUrl}/?route=notifications`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '林然发来新消息');
    await waitExactText(page, '聊天');
    await clickExactText(page, '林然发来新消息');
    await waitExactText(page, '在线 · 模糊距离');
    await waitExactText(page, '林然和奶油');
    await waitExactText(page, '今晚 7 点公园见？');
    await screenshot(page, 'smoke-frontend-02e-notification-to-conversation.png');
    await page.getByLabel('返回').click();
    await waitExactText(page, '通知');
    await page.getByLabel('返回').click();
    await waitExactText(page, '宠物');
    await clickExactText(page, '消息');
    await waitExactText(page, '林然和奶油');
    const notificationReadMessagesText = await page.locator('body').innerText();
    assertMessageTabBadge(notificationReadMessagesText, 1, 'After opening conversation notification');
    assertConversationUnreadBadgeCleared(notificationReadMessagesText, '林然和奶油', 1, 'After opening conversation notification', '地点审核通知');
    await screenshot(page, 'smoke-frontend-02f-notification-conversation-read.png');

    const notificationVaccineName = 'PW notification vaccine';
    await page.goto(`${baseUrl}/?route=notifications&mockVaccineNotification=enabled`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '健康提醒');
    await waitExactText(page, '查看计划');
    await clickExactText(page, '健康提醒');
    await waitExactText(page, '疫苗/驱虫计划');
    await waitExactText(page, notificationVaccineName);
    await screenshot(page, 'smoke-frontend-02g-notification-to-vaccine.png');

    await page.goto(`${baseUrl}/?route=notifications`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '就医提醒');
    await waitExactText(page, '查看备忘');
    await clickExactText(page, '就医提醒');
    await waitExactText(page, '编辑备忘');
    await waitInputValue(page, '驱虫记录');
    await waitInputValue(page, '体外驱虫已完成，下次按计划提醒。');
    await screenshot(page, 'smoke-frontend-02h-notification-to-medical-memo.png');

    await page.goto(`${baseUrl}/?route=map`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '附近宠物友好地点');
    await clickExactText(page, '附近宠物友好地点');
    await waitExactText(page, '云杉宠物友好公园');
    await clickExactText(page, '云杉宠物友好公园');
    await waitExactText(page, '社区共建');
    await waitExactText(page, '滨江路 88 号');
    await page.getByLabel('分享地点').click();
    await waitExactText(page, '地点已分享');
    const placeSharePayload = await page.evaluate(() => window.__lumiiLastShare ?? null);
    const placeShareText = placeSharePayload?.text ?? '';
    if (!placeShareText.includes('云杉宠物友好公园') || !placeShareText.includes('滨江路 88 号') || !placeShareText.includes('来自 Lumii 灵伴')) {
      throw new Error(`Unexpected place share payload: ${JSON.stringify(placeSharePayload)}`);
    }
    await page.getByLabel('收藏地点').click();
    await waitExactText(page, '已收藏到「想去」');
    await page.getByLabel('取消收藏地点').waitFor({ timeout: 30_000 });
    await clickExactText(page, '写点评');
    await waitExactText(page, '写一条点评');
    await page.getByPlaceholder(/草坪很整洁/).fill('Playwright 地点点评：草坪整洁，饮水点清楚。');
    await clickExactText(page, '发布点评');
    await waitExactText(page, '提交成功');
    await waitExactText(page, '点评已提交');
    await screenshot(page, 'smoke-frontend-02i-map-place-review-submitted.png');
    await clickExactText(page, '返回地点');
    await waitExactText(page, '云杉宠物友好公园');
    const placeDetailReviewText = await page.locator('body').innerText();
    if (!placeDetailReviewText.includes('Playwright 地点点评：草坪整洁，饮水点清楚。') || !placeDetailReviewText.includes('已提交，等待审核。通过后会展示在地点详情中。')) {
      throw new Error(`Place review did not render after returning to detail:\n${placeDetailReviewText}`);
    }
    await screenshot(page, 'smoke-frontend-02j-place-review-status.png');

    await page.goto(`${baseUrl}/?route=map`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '附近宠物友好地点');
    await page.getByLabel('open-place-submission-composer').click();
    await waitExactText(page, '新增地点');
    await page.getByLabel('place-draft-name-input').fill('PW新增宠物公园');
    await page.getByLabel('place-draft-address-input').fill('Playwright 路 18 号');
    await clickExactText(page, '饮水点');
    await page.getByLabel('place-draft-experience-input').fill('Playwright 新增地点：草坪宽敞，饮水点清楚，牵引绳友好。');
    await page.getByLabel('submit-place-draft').click();
    await waitExactText(page, '提交成功');
    await waitExactText(page, '地点已提交');
    await waitBodyIncludes(page, 'PW新增宠物公园');
    await waitBodyIncludes(page, 'Playwright 新增地点：草坪宽敞，饮水点清楚，牵引绳友好。');
    await screenshot(page, 'smoke-frontend-02k-place-submission-created.png');
    await clickExactText(page, '回到地图');
    await waitExactText(page, '附近宠物友好地点');

    await page.goto(`${baseUrl}/?route=dailyPost`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '今日小事');
    await page
      .getByPlaceholder('写下今天的小事，比如散步、食欲、精神状态，或者一个可爱的瞬间。')
      .fill('今天在楼下散步，遇到了新的宠友。');
    await clickExactText(page, '仅自己');
    await clickExactText(page, '发布');
    await waitExactText(page, '早安，Lucky！');
    await screenshot(page, 'smoke-frontend-03-daily-private-published.png');

    await page.goto(`${baseUrl}/?route=safety`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '安全中心');
    await waitExactText(page, '黑名单管理');
    await waitExactText(page, '还没有拉黑用户');
    await screenshot(page, 'smoke-frontend-04-safety-blocklist-empty.png');
    await context.close();

    const visibilityContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const visibilityPage = await visibilityContext.newPage();
    collectPageErrors(visibilityPage, pageErrors);

    await visibilityPage.goto(`${baseUrl}/?route=discover&nearbyVisible=false`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(visibilityPage, '宠友圈');
    await waitExactText(visibilityPage, '附近可见未开启，附近朋友暂不可见');
    await waitExactText(visibilityPage, '开启附近可见发现朋友');
    await waitExactText(visibilityPage, '去隐私设置');
    await screenshot(visibilityPage, 'smoke-frontend-04b-discover-visibility-disabled.png');
    await visibilityContext.close();

    const settingsContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const settingsPage = await settingsContext.newPage();
    collectPageErrors(settingsPage, pageErrors);

    await settingsPage.goto(`${baseUrl}/?route=profile`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(settingsPage, '我的');
    await settingsPage.getByLabel('编辑个人资料').click();
    await waitExactText(settingsPage, '编辑个人资料');
    await settingsPage.getByPlaceholder('给自己取个昵称').fill('Playwright主人');
    await settingsPage.getByPlaceholder('写一句介绍你和毛孩子的话').fill('和 Lucky 一起测试资料保存');
    await clickExactText(settingsPage, '保存资料');
    await waitExactText(settingsPage, '资料已保存，新的头像也更新好了');
    await settingsPage.getByLabel('返回').click();
    await waitExactText(settingsPage, '我的');
    await waitExactText(settingsPage, 'Playwright主人');
    await screenshot(settingsPage, 'smoke-frontend-04c-owner-profile-saved.png');

    await settingsPage.goto(`${baseUrl}/?route=editPet`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(settingsPage, '编辑宠物资料');
    await settingsPage.getByLabel('edit-pet-name-input').fill('PW宠物编辑');
    await settingsPage.getByLabel('edit-pet-breed-input').fill('边境牧羊犬');
    await selectPetBirthday(settingsPage, 'edit-pet-birthday-input', '2024-06-01');
    await settingsPage.getByLabel('edit-pet-weight-input').fill('13.6');
    await settingsPage.getByLabel('save-edit-pet-profile').click();
    await waitExactText(settingsPage, '宠物档案');
    await waitExactText(settingsPage, 'PW宠物编辑');
    await waitBodyIncludes(settingsPage, '边境牧羊犬');
    await waitBodyIncludes(settingsPage, '13.6 kg');
    await screenshot(settingsPage, 'smoke-frontend-04c2-pet-profile-edited.png');

    await settingsPage.goto(`${baseUrl}/?route=profile`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(settingsPage, '我的');
    await clickExactText(settingsPage, '设置与隐私');
    await waitExactText(settingsPage, '设置与隐私');
    await settingsPage.getByLabel('账号安全').click();
    await waitExactText(settingsPage, '账号安全');
    await waitExactText(settingsPage, '账号已登录 · 手机号已验证');
    await settingsPage.waitForFunction(() => /1[3-9]\d \*\*\*\* \d{4}/.test(document.body.innerText), undefined, { timeout: 30_000 });
    await waitExactText(settingsPage, 'Web 预览设备');
    await waitExactText(settingsPage, '验证码登录');
    await screenshot(settingsPage, 'smoke-frontend-04d-account-security.png');
    await settingsPage.getByLabel('返回').click();
    await waitExactText(settingsPage, '设置与隐私');
    await settingsPage.getByLabel('附近可见').click();
    await waitExactText(settingsPage, '附近可见已关闭');
    await settingsPage.getByLabel('返回').click();
    await waitExactText(settingsPage, '我的');
    await clickExactText(settingsPage, '发现');
    await waitExactText(settingsPage, '附近可见未开启，附近朋友暂不可见');
    await waitExactText(settingsPage, '去隐私设置');
    await screenshot(settingsPage, 'smoke-frontend-04e-settings-nearby-visible-off.png');

    await settingsPage.goto(`${baseUrl}/?route=profile`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(settingsPage, '我的');
    await clickExactText(settingsPage, '设置与隐私');
    await waitExactText(settingsPage, '设置与隐私');
    await settingsPage.getByLabel('logout-from-settings').click();
    await waitExactText(settingsPage, '确定要退出登录吗？');
    await settingsPage.getByLabel('cancel-logout').click();
    await settingsPage.getByText('确定要退出登录吗？', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    await waitExactText(settingsPage, '设置与隐私');
    await settingsPage.getByLabel('logout-from-settings').click();
    await waitExactText(settingsPage, '确定要退出登录吗？');
    await settingsPage.getByLabel('confirm-logout').click();
    await settingsPage.getByText('确定要退出登录吗？', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    await waitExactText(settingsPage, 'Lumii 灵伴');
    await waitExactText(settingsPage, '准备好遇见你的灵伴了吗？');
    await waitExactText(settingsPage, '获取验证码');
    await screenshot(settingsPage, 'smoke-frontend-04f-logout-confirmed.png');
    await settingsContext.close();

    const deletionContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const deletionPage = await deletionContext.newPage();
    collectPageErrors(deletionPage, pageErrors);

    await deletionPage.goto(`${baseUrl}/?route=profile`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(deletionPage, '我的');
    await clickExactText(deletionPage, '设置与隐私');
    await waitExactText(deletionPage, '设置与隐私');
    await deletionPage.getByLabel('账号安全').click();
    await waitExactText(deletionPage, '账号安全');
    await deletionPage.getByLabel('request-account-deletion').click();
    await waitExactText(deletionPage, '确认注销账号？');
    await deletionPage.getByLabel('account-deletion-code-input').fill('962464');
    await deletionPage.getByLabel('confirm-account-deletion').click();
    await waitExactText(deletionPage, '准备好遇见你的灵伴了吗？');
    await waitExactText(deletionPage, '获取验证码');
    await screenshot(deletionPage, 'smoke-frontend-04g-account-deletion-confirmed.png');
    await deletionContext.close();

    const interactionContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const interactionPage = await interactionContext.newPage();
    collectPageErrors(interactionPage, pageErrors);
    const fixturePostText = 'Playwright 互动夹具：奶油今天在草坪练习等待口令。';
    const blockFixturePostText = 'Playwright 拉黑夹具：豆包想找附近的朋友绕一圈。';

    await interactionPage.goto(`${baseUrl}/?route=discover&mockPetCircle=interactive`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(interactionPage, '宠友圈');
    await waitExactText(interactionPage, fixturePostText);
    await waitExactText(interactionPage, blockFixturePostText);
    await interactionPage.getByLabel('查看奶油的主人资料').first().click();
    await interactionPage.getByLabel('约遛资料卡宠友').waitFor({ state: 'visible', timeout: 30_000 });
    await interactionPage.getByLabel('查看资料卡宠友圈').click();
    await waitExactText(interactionPage, '奶油 的宠友圈');
    if (await interactionPage.getByLabel('我的宠友圈标记').count()) {
      throw new Error('Accepted peer pet circle profile must not render the ownership badge');
    }
    if (await interactionPage.getByLabel('更换宠友圈封面').count()) {
      throw new Error('Accepted peer pet circle profile must not expose cover editing');
    }
    await interactionPage.getByLabel('打开小事操作菜单-mock-fixture-pet-circle-interaction').click();
    await interactionPage.getByLabel('菜单查看评论-mock-fixture-pet-circle-interaction').waitFor({ state: 'visible', timeout: 30_000 });
    if (await interactionPage.getByLabel('菜单删除小事-mock-fixture-pet-circle-interaction').count()) {
      throw new Error('Accepted peer pet circle profile must not expose post deletion');
    }
    await screenshot(interactionPage, 'smoke-frontend-05a-peer-pet-circle.png');
    await interactionPage.getByLabel('返回').click();
    await waitExactText(interactionPage, '宠友圈');
    await interactionPage.getByLabel('查看奶油的主人资料').first().click();
    await interactionPage.getByLabel('约遛资料卡宠友').waitFor({ state: 'visible', timeout: 30_000 });
    const ownerSheetGreeting = interactionPage.getByLabel('向资料卡宠友打招呼');
    if (await ownerSheetGreeting.isVisible()) {
      await ownerSheetGreeting.click();
      await waitExactText(interactionPage, '和奶油打个招呼');
      await clickExactText(interactionPage, '取消');
      await interactionPage.getByText('和奶油打个招呼', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    } else {
      await interactionPage.getByLabel('给资料卡宠友发消息').waitFor({ state: 'visible', timeout: 30_000 });
    }
    try {
      await interactionPage.getByLabel('约遛资料卡宠友').waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
      await interactionPage.getByLabel('查看奶油的主人资料').first().click();
      await interactionPage.getByLabel('约遛资料卡宠友').waitFor({ state: 'visible', timeout: 30_000 });
    }
    await interactionPage.getByLabel('约遛资料卡宠友').click();
    await waitExactText(interactionPage, '约遛邀请');
    await waitExactText(interactionPage, 'Lucky × 奶油');
    await interactionPage.getByLabel('walk-invite-place-input').fill('Playwright 宠物友好公园');
    await interactionPage.getByLabel('walk-invite-note-input').fill('Playwright 约遛邀请：牵引绳和饮水都带好。');
    await interactionPage.getByLabel('send-walk-invite').click();
    await waitExactText(interactionPage, '约遛邀请已发送');
    await waitExactText(interactionPage, '林然和奶油');
    await waitBodyIncludes(interactionPage, '约遛邀请 ·');
    await screenshot(interactionPage, 'smoke-frontend-05a-walk-invite-sent.png');
    await interactionPage.goto(`${baseUrl}/?route=discover&mockPetCircle=interactive`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(interactionPage, fixturePostText);
    await interactionPage.getByLabel('向宠友打招呼').first().click();
    await waitExactText(interactionPage, '和奶油打个招呼');
    await waitExactText(interactionPage, '选一句话开场');
    await interactionPage.getByText('改天一起遛弯？', { exact: true }).click();
    await clickExactText(interactionPage, '发送招呼');
    await waitExactText(interactionPage, '已向奶油打招呼');
    await interactionPage.getByText('和奶油打个招呼', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    await interactionPage.getByLabel('点赞小事').first().click();
    await interactionPage.getByLabel('取消点赞小事').first().waitFor({ state: 'visible', timeout: 30_000 });
    await interactionPage.getByLabel('取消点赞小事').first().click();
    await interactionPage.getByLabel('点赞小事').first().waitFor({ state: 'visible', timeout: 30_000 });
    await interactionPage.getByLabel('查看小事评论').first().click();
    await waitExactText(interactionPage, 'Playwright 评论举报夹具：这个口令练习很稳。');
    await interactionPage.getByLabel('举报评论').first().click();
    await interactionPage.getByText('Playwright 评论举报夹具：这个口令练习很稳。', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    await interactionPage.getByPlaceholder(/回复 .* 的主人/).fill('夹具评论链路正常');
    await interactionPage.getByRole('button', { name: '发送宠友圈评论' }).click();
    await waitExactText(interactionPage, '夹具评论链路正常');
    await interactionPage.getByRole('button', { name: '关闭宠友圈评论' }).click();
    await interactionPage.getByLabel('举报小事').first().click();
    await interactionPage.getByText(fixturePostText, { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    await interactionPage.getByLabel('拉黑用户').first().click();
    await interactionPage.getByText(blockFixturePostText, { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
    await screenshot(interactionPage, 'smoke-frontend-05-pet-circle-interactions.png');
    await interactionContext.close();

    const greetingRequestContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const greetingRequestPage = await greetingRequestContext.newPage();
    collectPageErrors(greetingRequestPage, pageErrors);

    await greetingRequestPage.goto(`${baseUrl}/?route=greetingRequests&mockGreetingRequests=interactive`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(greetingRequestPage, '招呼请求');
    await waitExactText(greetingRequestPage, '1 条新招呼');
    await waitExactText(greetingRequestPage, '小夏 & 豆包');
    await greetingRequestPage.getByLabel('accept-greeting-request-o2').click();
    await waitExactText(greetingRequestPage, '已接受招呼，可以聊天了');
    await waitExactText(greetingRequestPage, '小夏和豆包');
    await waitExactText(greetingRequestPage, '我们已经互相打招呼啦');
    await screenshot(greetingRequestPage, 'smoke-frontend-05b-greeting-request-accepted.png');
    await greetingRequestContext.close();

    const supportContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const supportPage = await supportContext.newPage();
    collectPageErrors(supportPage, pageErrors);

    await supportPage.goto(`${baseUrl}/?route=greetingRequests&mockGreetingRequests=interactive`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(supportPage, '招呼请求');
    await supportPage.getByLabel('report-greeting-request-o2').click();
    await waitExactText(supportPage, '举报已提交，招呼请求已忽略');
    await supportPage.getByLabel('返回').click();
    await waitExactText(supportPage, '早安，Lucky！');
    await clickExactText(supportPage, '我的');
    await waitExactText(supportPage, '我的');
    await clickExactText(supportPage, '设置与隐私');
    await waitExactText(supportPage, '设置与隐私');
    await clickExactText(supportPage, '我的反馈');
    await waitExactText(supportPage, '反馈处理进度');
    await supportPage.getByText(/招呼请求举报/).first().click();
    await waitExactText(supportPage, '反馈详情');
    await waitExactText(supportPage, '处理记录');
    const supportReplyText = 'Playwright 补充：请继续核对这条招呼请求。';
    await supportPage.getByPlaceholder('补充更多现象、截图说明或你希望客服继续处理的内容').fill(supportReplyText);
    await clickExactText(supportPage, '提交补充');
    await waitExactText(supportPage, '已补充反馈');
    await waitExactText(supportPage, supportReplyText);
    await screenshot(supportPage, 'smoke-frontend-05c-support-ticket-reply.png');
    await supportContext.close();

    const messageContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const messagePage = await messageContext.newPage();
    collectPageErrors(messagePage, pageErrors);

    await loginMockUser(messagePage, '13900009992');
    await clickExactText(messagePage, '消息');
    const visibleConversation = await waitFirstVisibleText(messagePage, ['林然和奶油', '小夏和豆包', '地点审核通知', '还没有消息'], { timeout: 30_000 });
    if (visibleConversation === '林然和奶油') {
      await waitExactText(messagePage, '今晚 7 点公园见？');
      const unreadMessagesText = await messagePage.locator('body').innerText();
      assertMessageTabBadge(unreadMessagesText, 2, 'Before opening unread conversation');
      assertConversationUnreadBadge(unreadMessagesText, '林然和奶油', 1, 'Before opening unread conversation', '地点审核通知');
      await screenshot(messagePage, 'smoke-frontend-06-message-unread-before.png');
      await clickExactText(messagePage, '林然和奶油');
      await waitExactText(messagePage, '今晚 7 点公园见？');
      await messagePage.getByLabel('返回').click();
      await waitExactText(messagePage, '林然和奶油');
      const readMessagesText = await messagePage.locator('body').innerText();
      assertMessageTabBadge(readMessagesText, 1, 'After opening unread conversation');
      assertConversationUnreadBadgeCleared(readMessagesText, '林然和奶油', 1, 'After opening unread conversation', '地点审核通知');
      await screenshot(messagePage, 'smoke-frontend-06b-message-unread-cleared.png');
    } else if (visibleConversation === '还没有消息') {
      await screenshot(messagePage, 'smoke-frontend-06-message-empty.png');
    } else {
      await screenshot(messagePage, 'smoke-frontend-06-message-visible-conversation.png');
      await clickExactText(messagePage, visibleConversation);
      await waitExactText(messagePage, visibleConversation);
      await messagePage.getByLabel('返回').click();
      await waitExactText(messagePage, visibleConversation);
      await screenshot(messagePage, 'smoke-frontend-06b-message-visible-conversation-opened.png');
    }
    await messageContext.close();

    const realContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const realPage = await realContext.newPage();
    collectPageErrors(realPage, pageErrors);

    await loginMockUser(realPage, '13900009991');
    await clickExactText(realPage, '发现');
    await waitExactText(realPage, '宠友圈');
    await realPage.getByText('分享 Lucky 的今日小事', { exact: true }).waitFor({ state: 'hidden', timeout: 8_000 });
    await waitFirstVisibleText(realPage, ['附近伙伴近 7 天还没发布小事', '附近近 7 天还没有小事'], { timeout: 30_000 });
    await screenshot(realPage, 'smoke-frontend-06-real-session-empty-circle.png');
    await realContext.close();

    const expiredSessionContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const expiredSessionPage = await expiredSessionContext.newPage();
    collectPageErrors(expiredSessionPage, pageErrors);

    await loginMockUser(expiredSessionPage, '13900009993');
    const persistedSession = await expiredSessionPage.evaluate(() => {
      const raw = globalThis.localStorage?.getItem('lumii.auth.session.v1');
      return raw ? JSON.parse(raw).session : null;
    });
    if (!persistedSession?.token) throw new Error('Runtime session expiry smoke could not read the persisted auth token');
    const revokeResponse = await fetch(`${backendRuntime.apiBaseUrl}/auth/logout`, {
      headers: { Authorization: `Bearer ${persistedSession.token}` },
      method: 'POST',
    });
    if (!revokeResponse.ok) throw new Error(`Runtime session expiry smoke could not revoke the token: ${revokeResponse.status}`);
    const expectedUnauthorizedErrorStart = pageErrors.length;
    await clickExactText(expiredSessionPage, '我的');
    await waitExactText(expiredSessionPage, '准备好遇见你的灵伴了吗？');
    await waitExactText(expiredSessionPage, '登录已失效，请重新登录');
    await expiredSessionPage.waitForFunction(() => !globalThis.localStorage?.getItem('lumii.auth.session.v1'), undefined, { timeout: 30_000 });
    const expiryScenarioErrors = pageErrors.splice(expectedUnauthorizedErrorStart);
    pageErrors.push(...expiryScenarioErrors.filter((message) => !message.startsWith('HTTP 401:')));
    await screenshot(expiredSessionPage, 'smoke-frontend-06c-runtime-session-expired.png');
    await expiredSessionContext.close();

    const loginLockContext = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { height: 920, width: 430 },
    });
    const loginLockPage = await loginLockContext.newPage();
    loginLockPage.on('pageerror', (error) => pageErrors.push(error.message));
    await loginLockPage.goto(baseUrl, { timeout: 60_000, waitUntil: 'networkidle' });
    await loginLockPage.getByPlaceholder('请输入中国大陆手机号').fill('13900009994');
    await loginLockPage.getByLabel('同意用户协议与隐私政策').click();
    await clickExactText(loginLockPage, '获取验证码');
    await waitExactText(loginLockPage, '输入验证码');
    const loginLockInput = loginLockPage.getByLabel('验证码输入框');
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const verifyResponsePromise = loginLockPage.waitForResponse((response) => response.url().endsWith('/auth/sms/verify') && response.request().method() === 'POST');
      await loginLockInput.fill('000000');
      const verifyResponse = await verifyResponsePromise;
      if (verifyResponse.status() !== (attempt === 10 ? 429 : 400)) throw new Error(`Unexpected login lock verify status at attempt ${attempt}: ${verifyResponse.status()}`);
      await waitFirstVisibleText(loginLockPage, attempt === 10
        ? ['登录尝试过多，请 15 分钟后再试']
        : ['验证码错误，请检查后重试', '验证码错误次数过多，请重新获取']);
      await loginLockInput.fill('');
      if (attempt === 5) {
        const resendResponsePromise = loginLockPage.waitForResponse((response) => response.url().endsWith('/auth/sms/send') && response.request().method() === 'POST');
        await clickExactText(loginLockPage, '重新发送');
        await resendResponsePromise;
        await waitExactText(loginLockPage, '输入验证码');
      }
    }
    await waitExactText(loginLockPage, '15 分钟后重新发送');
    await screenshot(loginLockPage, 'smoke-frontend-06d-login-temporarily-locked.png');
    await loginLockContext.close();

    const petOnboardingContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const petOnboardingPage = await petOnboardingContext.newPage();
    collectPageErrors(petOnboardingPage, pageErrors);

    await petOnboardingPage.goto(`${baseUrl}/?route=petInfo`, { timeout: 60_000, waitUntil: 'networkidle' });
    await petOnboardingPage.getByLabel('new-pet-name-input').fill('PW建档Lucky');
    await petOnboardingPage.getByLabel('new-pet-breed-input').fill('边牧');
    await selectPetBirthday(petOnboardingPage, 'new-pet-birthday-input', '2024-05-30');
    await petOnboardingPage.getByLabel('new-pet-weight-input').fill('12.5');
    await petOnboardingPage.getByLabel('save-new-pet-profile').click();
    await waitExactText(petOnboardingPage, '添加宠物 2/2');
    await waitBodyIncludes(petOnboardingPage, 'PW建档Lucky');
    await screenshot(petOnboardingPage, 'smoke-frontend-07-pet-profile-created-upload-step.png');
    await petOnboardingContext.close();

    if (pageErrors.length) {
      throw new Error(`Frontend console/page errors:\n${pageErrors.join('\n')}`);
    }

    console.log('frontend playwright smoke passed');
  } finally {
    if (browser) await browser.close();
    await stopFrontend(frontendProcess);
    await stopBackendForFrontendSmoke(backendRuntime);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
