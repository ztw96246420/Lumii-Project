# Lumii Android APK 真机测试 2026-06-06

## 当前状态

- 已补 Android 包名：`com.lumii.lingban`
- 已新增 EAS 构建配置：`mobile/eas.json`
- 已新增 npm 脚本：
  - `npm run eas:whoami`
  - `npm run build:android:preview`
- 已验证：
  - `app.json` / `eas.json` / `package.json` JSON 正常
  - `npx expo config --type public` 正常
  - `npm run typecheck` 通过
- 已创建 EAS 项目：`@ztw962464/lumii-lingban`
- 已完成第一版 Android preview APK 构建：
  - Build ID：`9315901e-18b8-4ba0-a85f-305245d698ee`
  - 构建页：`https://expo.dev/accounts/ztw962464/projects/lumii-lingban/builds/9315901e-18b8-4ba0-a85f-305245d698ee`
  - APK：`https://expo.dev/artifacts/eas/jaqWQk2Rpbe4fnxMtapPm3.apk`

## 需要你先做

在项目目录执行 Expo 登录：

```powershell
cd "F:\Users\Administrator\Documents\Lumii Project\mobile"
npx eas-cli login
```

如果没有 Expo 账号，先按命令行提示注册/登录。

登录后检查：

```powershell
npm run eas:whoami
```

能显示账号名后，就可以继续构建。

## 构建 APK

```powershell
cd "F:\Users\Administrator\Documents\Lumii Project\mobile"
npm run build:android:preview
```

第一次构建时，EAS 可能会询问：

- 是否创建 EAS 项目：选择 Yes
- Android Keystore 是否由 EAS 管理：选择 Yes
- 是否生成安装包：选择 APK / preview profile

构建完成后，EAS 会给一个下载链接。用安卓手机打开链接，下载 APK 并安装即可。

## 第一轮真机验收重点

- App 图标和应用名是否正常。
- 启动页是否可接受。
- 安卓返回键/手势是否符合预期。
- 手机号输入是否稳定不丢焦。
- 权限页是否触发系统权限弹窗。
- 相册/相机权限、定位权限、通知权限的拒绝和允许状态。
- 页面滚动是否被底部导航遮挡。
- 电子宠物首页、发现、地图、消息、我的在真机上的尺寸和手感。

## 注意

这次是 APK 真机包，比手机浏览器和 Expo Go 更接近真实 App。但当前地图、AI、后端仍是 mock，重点先验收原生容器、权限、触摸、输入和页面流程。
