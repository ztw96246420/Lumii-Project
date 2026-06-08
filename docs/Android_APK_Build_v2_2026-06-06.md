# Lumii Android APK v2 真机测试记录

## 构建信息
- 时间：2026-06-06 10:54 +08:00
- EAS Build ID：`91693d9b-4b85-416f-93bf-38958aa51203`
- Android versionCode：`2`
- 构建页：`https://expo.dev/accounts/ztw962464/projects/lumii-lingban/builds/91693d9b-4b85-416f-93bf-38958aa51203`
- APK：`https://expo.dev/artifacts/eas/iXrVzvuGLc3TiZX7JgTdC4.apk`

## 本版修复
- 修复 Android 真机登录页点击手机号输入框后键盘秒闪/无法输入的问题。
- 登录页不再使用 `ScrollView` 承载输入区域，避免 Android 键盘弹出时被滚动容器抢焦点。
- Android 聚焦手机号输入框时不再触发输入框焦点态重绘，降低焦点被打断的概率。
- 其他滚动页统一设置 `keyboardDismissMode="none"` 和 `keyboardShouldPersistTaps="always"`，减少输入时误收起键盘。

## 已验证
- `npm run typecheck` 通过。
- `npx expo config --type public` 通过。
- EAS preview APK 构建成功。

## 请真机重点验收
- 登录页点击手机号输入框后，键盘是否稳定弹起。
- 连续输入 11 位手机号时，输入框是否不丢焦点。
- 勾选协议、获取验证码、验证码页输入是否正常。
