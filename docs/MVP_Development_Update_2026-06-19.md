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
