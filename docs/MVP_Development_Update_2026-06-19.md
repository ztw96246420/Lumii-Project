# Lumii MVP Development Update - 2026-06-19

## Nearby pet moments real-data pass

- 宠物首页「附近宠友小事」保留已确认的四态视觉：
  - 附近宠友有分享小事：沿用轮播卡片样式，只在有 2 条及以上真实小事时自动轮播并显示圆点。
  - 附近有伙伴但暂无小事：展示附近伙伴头像栈和「去宠友圈」入口，不轮播。
  - 附近无伙伴/暂无小事：展示静态空态和刷新附近入口，不轮播。
  - 小事接口加载失败：展示静态错误态，点击重试小事接口。
- 删除首页附近模块的演示用户兜底，不再用前端 mock 用户撑页面；正常 HTTP 模式只展示后端真实附近伙伴和真实附近小事。
- 发布「今日小事」现在会同时写入健康日历记录，并调用 `POST /social/moments` 同步到附近小事流。
- 当前用户自己发布的小事不会回灌成首页「附近宠友小事」，只会被其他附近用户通过 `GET /social/nearby-moments` 看到。
- 测试后端新增 `socialMoments` 持久化字段，按当前定位、默认 3km、在线窗口、7 天有效期、猫狗物种和附近可见状态过滤。
- mock API 保留同名接口用于本地离线开发，但默认云端测试包仍走 HTTP 后端。

## API contract

- `GET /social/nearby-moments`：读取附近宠友小事，复用发现页定位策略和模糊距离。
- `POST /social/moments`：发布今日小事到附近小事流，MVP 暂只记录文本、心情和照片数量。
- 详见 `API_Contract_MVP_v0.md` 的「社交与消息」章节。

## Verification

- 待本轮完成后执行：
  - `npm run typecheck`
  - `node --check scripts/lumii-backend.cjs`
  - 云端后端热更新与 `/social/nearby-moments` smoke test
  - Android `arm64-v8a` release APK 构建

## Android login keyboard hotfix

- 修复 Android 登录页手机号输入框点击后键盘秒闪/无法唤起的问题。
- 根因是键盘弹起时全局 `keyboardHeight` 状态变化会让 `Screen` 包装组件身份变化，导致登录页 `TextInput` 被卸载重建并丢失焦点。
- 处理方式：键盘高度改为 ref 驱动布局读取，避免键盘事件改变 `Screen` 组件身份；手机号输入框外层从 `Pressable` 改为普通 `View` 触摸聚焦，避免安卓原生输入和父级触摸容器抢事件。
- 验证：`npm run typecheck` 通过；已重新构建 Android `arm64-v8a` APK。

## Android bottom background hotfix

- 修复真机底部偶发灰色区域：输入手机号后收起键盘、首页跳转其他页面再返回时，底部可能露出灰米色背景。
- 根因是 Web 手机外框背景 `#e8e2d9` 被复用到 native 根容器；同时 Android 已用 `adjustResize`，外层 `KeyboardAvoidingView behavior="height"` 会二次调整窗口高度，键盘收起后容易短暂露出根背景。
- 处理方式：native `SafeAreaView`、`appWrap`、Android `windowBackground`、`navigationBarColor` 统一改为页面底色 `#FBF7F1`；安卓外层 `KeyboardAvoidingView` 不再使用 `height` 行为，交给系统 `adjustResize` 和页面滚动 inset 处理。
- `app.json` 同步增加 `androidNavigationBar` 配置，避免后续重新 prebuild 时导航栏颜色回退。
- 验证：`npm run typecheck` 通过；`app.json` JSON 解析通过。该项涉及 Android 原生资源，需重新构建 APK 后真机复测。
