# Lumii 运营后台媒体 CDN 探测

日期：2026-07-02

## 背景

`media.lumiiapp.cn` 接入腾讯云 CDN 后，曾出现 `HEAD` 请求返回 `200 OK`，但真实 `GET` 请求被 CDN `302` 到 `dnspod.qcloud.com/static/webblock.html` 的情况。

移动端加载图片、视频和灵伴动效时使用真实 `GET` 请求，因此只检查 `HEAD` 会误判 CDN 可用。

## 本次实现

- 后端 `GET /admin/system/health` 新增 `mediaProbe` 字段。
- 系统健康检查新增 `media_cdn_get`。
- 后台系统健康页新增「媒体 CDN 探测」卡片。
- 探测会选取当前 state 中最新的公开媒体对象，优先覆盖：
  - `avatarAnimationJobs.videoUrl`
  - `avatarAnimationJobs.preparedSourceAvatarUrl`
  - `avatarJobs.resultUrl`
  - `mediaUploads.objectKey`
  - 宠物 `avatarAnimationUrl`、`avatarUrl`、宠友圈封面
- 探测同时发起：
  - `HEAD`
  - 带 `Range: bytes=0-0` 的 `GET`
- 请求关闭自动跳转，用于直接捕获 CDN `302` 和 `Location`。

## 后台展示口径

- `ok`：`GET` 返回 `200` 或 `206`。
- `warn`：公开 base URL 已配置但没有可探测对象，或 `HEAD` 正常但 `GET` 状态需要复核。
- `bad`：`GET` 超时、返回 `4xx/5xx`，或被 `302` 到 `webblock.html`。

页面会展示：

- Base URL
- 样本来源
- 对象 key
- `HEAD` 状态
- `GET` 状态
- CDN 缓存头
- `X-NWS-LOG-UUID`
- `GET Location`
- 完整探测 URL

## 环境变量

- `PET_AVATAR_PUBLIC_BASE_URL`：优先使用的公开媒体 base URL。
- `LUMII_PUBLIC_BASE_URL`：公开媒体 base URL 的兼容兜底。
- `MEDIA_PUBLIC_PROBE_TIMEOUT_MS`：单次探测超时时间，默认 `6000`，最低 `1000`。

## 和移动端的关联

该探测不是独立后台假数据。它使用后端 state 中真实生成过的媒体对象，探测结果会影响：

- 系统健康整体状态。
- 上线台账读取的系统健康状态。
- 运营判断 App 图片、视频、灵伴形象和灵伴动效是否能通过 CDN 正常加载。

## 验证

新增烟测：

```bash
node scripts/smoke-media-cdn-probe.cjs
```

该脚本会启动本地模拟 CDN：`HEAD` 返回 `200`，`GET` 返回 `302 webblock.html`，并确认后台系统健康把 `media_cdn_get` 判定为 `bad`。

## 当前仍需外部确认

如果后台显示 `GET` 被 `302` 到 `webblock.html`，需要腾讯云 CDN 工单继续排查域名策略或节点配置；代码侧只能准确暴露问题，不能绕过 CDN 节点拦截策略。
