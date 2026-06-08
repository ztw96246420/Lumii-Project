# Lumii Figma Make 审计记录

日期：2026-05-30

Figma Make 文件：
- `Lumii Project`
- `https://www.figma.com/make/426uXOLACQyFF5ThILiqKV/Lumii-Project`

## 1. 当前可读取结论

该链接是 Figma Make 文件，不是标准 Figma Design 文件。

当前 Figma MCP 能识别到 Make 项目的源码与资产清单，但没有直接返回普通 Design 文件那种页面图层树、Frame 节点元数据和截图。

因此当前它更适合作为：
- 交互原型参考。
- Web/React 组件结构参考。
- 文案、页面覆盖范围和组件命名参考。

暂不适合作为：
- 可直接映射 React Native 的 Figma 图层源。
- 可直接做 Code Connect 的组件源。
- 可直接按 node-id 抽取设计截图与 Auto Layout 的标准设计稿。

## 2. 已识别到的 Lumii 页面

账号与验证码：
- `LoginPage.tsx`
- `VerifyCodePage.tsx`
- `LoadingPage.tsx`

新用户建档：
- `NoPetEmptyStatePage.tsx`
- `PermissionDeniedPage.tsx`
- `PermissionGuidePage.tsx`
- `PetInfoPage.tsx`
- `RecognitionDetailPage.tsx`
- `UploadFailedPage.tsx`
- `UploadPetPhotoPage.tsx`

展示/索引：
- `ComponentShowcase.tsx`
- `OnboardingShowcase.tsx`

## 3. 已识别到的 Lumii 组件

基础组件：
- `Button.tsx`
- `Input.tsx`
- `Checkbox.tsx`
- `CodeInput.tsx`
- `Card.tsx`
- `Avatar.tsx`
- `Tag.tsx`

反馈与容器：
- `Toast.tsx`
- `BottomSheet.tsx`
- `Dialog.tsx`
- `EmptyState.tsx`
- `ErrorState.tsx`
- `LoadingSpinner.tsx`

业务组件：
- `TabBar.tsx`
- `PetStatusBadge.tsx`
- `PermissionCard.tsx`
- `PhotoUploadArea.tsx`

## 4. 初步覆盖判断

你这次新增的范围基本覆盖了：
- 登录页。
- 验证码页。
- 登录成功 loading。
- 权限引导。
- 权限拒绝。
- 未添加宠物。
- 宠物基础信息。
- 上传宠物照片。
- 上传失败。
- 识别详情。

目前从文件名看，还没有覆盖：
- AI 生成中。
- AI 生成结果。
- AI 结果不满意反馈。
- 重新生成确认弹窗。
- 保存成功/失败状态。

如果这些已经在 Make 预览里但没有独立文件名，需要后续确认路由或页面组织。

## 5. 建议下一步

优先把当前 Make 原型沉淀为 Figma Design 文件：

1. 在 Figma Design 中创建或复制主链路页面 Frame。
2. 页面用中文命名，例如：
   - `登录页 - 默认`
   - `验证码页 - 倒计时`
   - `权限页 - 默认`
   - `上传宠物照片 - 默认`
   - `上传失败 - 未检测到宠物`
3. Frame 使用移动端尺寸，建议 `390 x 844`。
4. 尽量使用 Auto Layout 和组件/变体。
5. 把 `Button/Input/CodeInput/Card/Toast/Dialog/PermissionCard/PhotoUploadArea` 做成 Design 组件。
6. 再把 Figma Design 的 `/design/...node-id=...` 链接发给 Codex。

## 6. Codex 后续处理策略

短期：
- 继续把 Figma Make 当作页面覆盖范围和组件命名参考。
- 不直接把 Make 生成的 Web React 代码塞进 React Native。

中期：
- 等 Figma Design 文件可读后，按 node/frame 拉取设计上下文。
- 抽取 tokens 和组件变体。
- 建立 Lumii React Native 组件库。
- 逐屏替换当前 MVP 页面。

长期：
- Figma Design 作为唯一视觉源。
- Figma Make 作为交互原型或方案探索工具。
- React Native/Expo 作为生产 App 实现。
