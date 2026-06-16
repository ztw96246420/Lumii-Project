# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Android APK packaging rule

- When the user asks to build or 打 APK for real-device testing, always build a local release APK for `arm64-v8a` only.
- Use `cd mobile && npm run build:android:apk`; do not manually run a full multi-ABI `assembleRelease` unless the user explicitly asks for a universal package.
- Keep native capabilities intact: do not enable extra minify/resource shrink steps just to reduce package size unless that exact tradeoff is explicitly requested and re-tested.
- After building, report the local `dist` APK path, size, SHA256, package name, versionCode, and ABI.
