const fs = require('fs');
const os = require('os');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const defaultArtifactsDir = path.join(rootDir, 'artifacts', 'pet-circle-frontend');
const baseUrl = (process.env.FRONTEND_BASE_URL || 'http://localhost:19031').replace(/\/+$/, '');
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

async function clickExactText(page, text, options = {}) {
  await page.getByText(text, { exact: true }).last().click(options);
}

async function waitExactText(page, text, options = {}) {
  await page.getByText(text, { exact: true }).first().waitFor({ timeout: 30_000, ...options });
}

async function screenshot(page, name) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  await page.screenshot({ fullPage: true, path: path.join(artifactsDir, name) });
}

function collectPageErrors(page, pageErrors) {
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
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

async function main() {
  const playwright = requirePlaywright();
  const executablePath = browserExecutablePath();
  if (!executablePath) throw new Error('No Chromium/Edge executable found. Set PLAYWRIGHT_BROWSER_EXECUTABLE.');

  const browser = await playwright.chromium.launch({ executablePath, headless: true });
  const pageErrors = [];
  try {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const page = await context.newPage();
    collectPageErrors(page, pageErrors);

    await page.goto(`${baseUrl}/?route=memoNew`, { timeout: 60_000, waitUntil: 'networkidle' });
    await waitExactText(page, '新增健康备忘');
    await page.getByPlaceholder('例如：洗澡记录、复诊提醒').fill('洗澡记录');
    await page.getByPlaceholder('今天有什么值得记录的小事？').fill('今天洗澡后精神很好');
    await clickExactText(page, '保存备忘');
    await waitExactText(page, '健康日历');
    await screenshot(page, 'smoke-frontend-01-memo-saved.png');

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
    await page.getByRole('button', { name: '删除评论' }).first().click();
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
    await waitExactText(interactionPage, '金毛 · 主人 林然 · 1km 内');
    await interactionPage.getByLabel('向资料卡宠友打招呼').click();
    await waitExactText(interactionPage, '和奶油打个招呼');
    await clickExactText(interactionPage, '取消');
    await interactionPage.getByText('和奶油打个招呼', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
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

    const realContext = await browser.newContext({
      deviceScaleFactor: 1,
      geolocation: { latitude: 31.2304, longitude: 121.4737 },
      permissions: ['geolocation'],
      viewport: { height: 920, width: 430 },
    });
    const realPage = await realContext.newPage();
    collectPageErrors(realPage, pageErrors);

    await realPage.goto(baseUrl, { timeout: 60_000, waitUntil: 'networkidle' });
    await realPage.getByPlaceholder('请输入中国大陆手机号').fill('13900009991');
    await realPage.getByLabel('同意用户协议与隐私政策').click();
    await clickExactText(realPage, '获取验证码');
    await waitExactText(realPage, '输入验证码');
    await realPage.keyboard.type('962464');
    const permissionAction = await clickFirstVisibleText(realPage, ['一键开启全部权限', '下一步，添加宠物'], { timeout: 30_000 });
    if (permissionAction === '一键开启全部权限') {
      await clickFirstVisibleText(realPage, ['下一步，添加宠物', '稍后再说'], { timeout: 30_000 });
    }
    await waitExactText(realPage, '添加我的宠物');
    await clickExactText(realPage, '发现');
    await waitExactText(realPage, '宠友圈');
    await realPage.getByText('分享 Lucky 的今日小事', { exact: true }).waitFor({ state: 'hidden', timeout: 8_000 });
    await waitFirstVisibleText(realPage, ['附近伙伴还没发布小事', '附近暂时还没有小事'], { timeout: 30_000 });
    await screenshot(realPage, 'smoke-frontend-06-real-session-empty-circle.png');
    await realContext.close();

    if (pageErrors.length) {
      throw new Error(`Frontend console/page errors:\n${pageErrors.join('\n')}`);
    }

    console.log('frontend playwright smoke passed');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
