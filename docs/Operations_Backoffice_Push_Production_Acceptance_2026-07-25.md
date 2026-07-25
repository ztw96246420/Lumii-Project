# Android Push 生产验收

## 目的

通知代码、Expo ticket 和 receipt 已接入并不等于当前正式安装包已经可用。后台现在基于同一台 Android 设备的实际证据计算生产验收状态，避免状态被硬编码为 `partial`，也避免一条历史失效 token 永久阻塞后续版本。

## 验收口径

以下条件必须同时满足，`notifications` 模块和 `push_provider` 上线缺口才会自动转为 `ready`：

1. `EXPO_PUSH_ENABLED=true`。
2. Expo receipt 轮询已启用。
3. 后台已观测到不低于 `LUMII_PUSH_ACCEPTANCE_MIN_ANDROID_BUILD` 的 Android 构建。
4. 该最新构建至少一台设备完成 Firebase/FCM 原生 token、Expo token 和业务后端登记。
5. 该构建在近期失败窗口内没有仍处于 `failed` 的登记记录。
6. 同一台有效设备在证据有效期内取得成功 Expo ticket。
7. 同一台设备在证据有效期内取得成功 Expo receipt。

默认完整证据有效期为 30 天，近期登记失败窗口为 24 小时。历史失效 token、历史 ticket/receipt 失败继续保留在通知台账和审计中，但只要当前正式构建形成新的完整成功链路，就不会永久锁死上线状态。

## 环境变量

- `LUMII_PUSH_ACCEPTANCE_MIN_ANDROID_BUILD`：本次允许发布的最低 Android `versionCode`。每次正式发版应更新为该包的构建号。
- `LUMII_PUSH_ACCEPTANCE_MAX_AGE_MS`：登记、ticket、receipt 证据最长有效时间，默认 30 天。
- `LUMII_PUSH_ACCEPTANCE_FAILURE_WINDOW_MS`：仍视为当前登记失败的时间窗口，默认 24 小时。

## 后台证据

- `GET /admin/notifications` 返回 `productionAcceptance` 和汇总字段 `productionAcceptanceReady`、`productionAcceptanceStatus`。
- `GET /admin/notifications/production-acceptance` 单独返回验收口径、缺项、正式构建号、成功设备数和证据时间。
- 通知运营页展示“生产 Push 验收”指标。
- 系统健康 `expo_push`、上线模块 `notifications` 和上线缺口 `push_provider` 共用同一份结果。

## 真机步骤

1. 安装本次最终 Android APK。
2. 登录测试账号，允许系统通知，并保持 App 内通知开关开启。
3. 在通知运营页确认设备已登记，构建号不低于本次最低构建号。
4. 向该账号发送一条测试系统通知或触发一条业务通知。
5. 等待 Expo receipt 轮询完成，确认“生产 Push 验收”转为“Android 正式 Push 已验收”。
6. 在 App 通知中心查看通知并点击，另外检查 `notification.impression` / `notification.open`，作为 App 展示和点击证据。

Expo receipt 只证明 Expo 已将消息交付至 FCM/APNs，不代表用户一定看见或点击；后台不会把 receipt 表述为 OS 级展示回执。iOS 未包含在当前 Android 首发验收内，未来发布 iOS 时必须单独完成 APNs 真机验收。
