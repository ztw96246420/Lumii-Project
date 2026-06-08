# Lumii Figma Make 1:1 还原审计

日期：2026-06-03

## 当前结论

当前 React Native MVP 已完成一轮“按 Figma Make / Opus4.7 源码结构转译”的批量修复，但尚不能宣称全页面逐像素 1:1。原因是：本轮主要完成 JSX 结构、中文文案、重复 Header、底部导航避让、主要交互链路和 DOM 抽检；关键坐标、截图像素、动效细节仍需继续逐屏复核。

本轮已复核并修正：
- `Screen6 · 验证码页 默认`：绿色提示卡已恢复到手机画布内左 20、右 20、底部 40；标题、验证码输入格纵向坐标按源码对齐。
- 全局状态栏：右侧从简化符号改为信号、Wi-Fi、电池图标，避免所有页面顶部都偏离 Figma Make。
- `Screen10-20 · 权限/建档/上传/识别/AI 生成链路`：已按源码结构重写，浏览器主链路 DOM 抽检通过。
- `Screen26-32 · 首页/聊天/健康/体重/疫苗`：已按源码结构重写，首页、聊天、健康、体重、疫苗 DOM 抽检通过；聊天重复 Header 已修。
- `Screen35/41/45/48/54/55/58`：发现、消息、地图、地点详情、我的、宠物档案、设置已按源码结构重写；发现页和地点详情重复 Header 已修；宠物档案底部导航已移除。
- 短信发送逻辑：修复“发送过频错误带 data 被误判为成功”的隐患；倒计时显示钳制在 60 秒内。
- `npm run typecheck`：通过。
- 浏览器实测：登录 -> 验证码 -> 权限 -> 空宠物 -> 建档 -> 上传 -> 识别 -> AI 生成 -> AI 结果 -> 首页 -> 发现 -> 地图 -> 地点详情 -> 消息 -> 我的 -> 宠物档案 -> 设置 -> 健康 -> 体重 -> 疫苗，主链路可走通。

## 还原规则

- Figma Make 源码目录：`figma-make-source/opus47/src/app/components`
- 手机画布基准：`390 x 844`
- 视觉源优先级：Figma Make 源码内联样式与组件结构 > 运行截图 > 当前 RN 实现
- 每页只有同时满足以下条件才标记为 `1:1 已复核`：
  - RN 页面结构对应源码页面或组件。
  - 关键坐标、间距、圆角、字号、颜色、阴影已对照。
  - 浏览器截图或 DOM 坐标已验证。
  - 中文文案无乱码、无英文漏出。
  - 交互状态不靠文案推断，且不会产生闪烁、误跳、重复标题。

## P0 主链路审计

| Figma Make 页面 | 当前 RN 对应 | 当前状态 | 结论/下一步 |
|---|---|---:|---|
| Screen1 登录页 默认 | `renderLogin` | 部分还原 | 需要重新按 `LoginScaffold/BrandHeader/PhoneInput/Agreement/PrimaryButton` 核对高度、边距、字重、状态栏图标。手机号输入焦点已修过，但仍需 1:1 视觉复核。 |
| Screen2 手机号格式错误 | `renderLogin` 内联错误 | 未 1:1 复核 | 需核对 InlineError 位置、红色、协议/按钮状态。 |
| Screen3 未勾选协议 | `renderLogin` toast/协议状态 | 未 1:1 复核 | 需核对 toast 顶部位置、协议红色 shake 状态。 |
| Screen4 验证码发送中 | `renderLogin` loading | 未 1:1 复核 | 需核对按钮 loading 文案、spinner、按钮宽高。 |
| Screen5 发送过频倒计时 | `renderLogin` cooldown | 逻辑已修，待视觉复核 | 已修复错误 data 被误判成功的问题，并将倒计时钳制在 60s 内；仍需按源码复核按钮视觉。 |
| Screen6 验证码页 默认 | `renderOtp` | 1:1 关键布局已复核 | 已修复绿色提示卡、TopBar 高度、输入格布局、状态栏右侧信号/Wi-Fi/电池图标；需继续复核错误/过期/loading 变体。 |
| Screen7 验证码错误 | `renderOtp` inline error | 未 1:1 复核 | 需核对错误输入格边框、错误文案位置。 |
| Screen8 验证码过期 | `renderOtp` inline error | 未 1:1 复核 | 需核对过期文案、重新发送状态。 |
| Screen9 登录成功 loading | `verifyLoading` overlay | 未 1:1 复核 | 当前为简化 overlay，需按源码 loading 页/状态重做。 |
| Screen10 权限引导页 | `renderPermissions` | 源码结构已转译，DOM 抽检通过 | 已按头部 mascot、三权限卡、底部 CTA 重写；拒绝态有提示 hero；待截图坐标复核。 |
| Screen11 定位权限被拒 | `renderPermissions` | 结构已覆盖，待状态专项复核 | 拒绝/blocked 会进入提示 hero 和“去系统设置”路径；需真机权限专项复核。 |
| Screen12 相册/相机权限被拒 | `renderPermissions` | 结构已覆盖，待状态专项复核 | 同上，需 iOS/Android 授权态验证。 |
| Screen13 通知权限被拒 | `renderPermissions` | 结构已覆盖，待状态专项复核 | 同上，需通知权限真机验证。 |
| Screen14 未添加宠物空状态 | `renderEmptyPet` | 源码结构已转译，DOM 抽检通过 | 已恢复大 mascot、加号标记、底部 CTA、浮动 TabBar；待截图坐标复核。 |
| Screen15 宠物基础信息 | `renderPetInfo` | 源码结构已转译，DOM 抽检通过 | 已重写标题区、字段、狗狗/猫咪分段按钮、底部 CTA；待截图坐标复核。 |
| Screen16 上传宠物照片 | `renderUpload` | 源码结构已转译，DOM 抽检通过 | 已还原取景框、扫描角、tips、相册/拍照按钮；待截图坐标复核。 |
| Screen17 上传失败 未识别 | `renderUploadNoPet` | 源码结构已转译，待浏览器专项抽检 | 已还原失败图像块、原因建议、重传 CTA；需通过失败开关专项进入验证。 |
| Screen18 上传识别详情 | `renderUploadDetail` | 源码结构已转译，DOM 抽检通过 | 已还原识别成功徽标、质量徽标、详情行、特征 chips、确认生成 CTA。 |
| Screen19 AI 灵伴生成中 | `renderGenerating` | 源码结构已转译，DOM 抽检通过 | 已还原生成圆形预览、原图角标、AI 徽标、进度和步骤卡；动效仍待补。 |
| Screen20 生成结果 默认 | `renderAiResult` | 源码结构已转译，DOM 抽检通过 | 已还原原图 chip、大形象、标签、保存/重生成 CTA；待截图坐标复核。 |
| Screen21 生成结果 多候选 | 无独立路由 | 缺失 | 需补候选切换状态。 |
| Screen22 不满意反馈面板 | 无独立路由 | 缺失 | 需补 Bottom Sheet。 |
| Screen23 重新生成确认弹窗 | `confirm` 通用弹窗 | 非 1:1 | 需按源码弹窗样式重做。 |
| Screen24 保存成功 Toast | `showToast` | 未 1:1 复核 | 需核对 toast 样式。 |
| Screen25 保存失败 Toast | `showToast` | 未 1:1 复核 | 需核对失败 toast 与重试入口。 |
| Screen26 电子宠物首页 | `renderHome` | 源码结构已转译，DOM 抽检通过 | 已按源码改为问候头、中心灵伴舞台、气泡提示、在线状态、健康渐变卡、快捷入口；还需截图/坐标复核。 |
| Screen27 电子宠物 AI 对话 | `renderChat` | 源码结构已转译，DOM 抽检通过 | 已按源码重写自定义聊天头、安全提示、消息气泡、快捷话题、输入栏；重复 Header 已修。 |
| Screen28 AI 对话异常状态 | `renderChat` failed | 非 1:1 | 需按源码异常状态重做。 |
| Screen29 健康管理首页 | `renderHealth` | 源码结构已转译，DOM 抽检通过 | 已还原健康分 hero、功能 row、快速备忘和近期记录；待截图坐标复核。 |
| Screen30 体重记录 | `renderWeight` | 源码结构已转译，DOM 抽检通过 | 已还原今日体重卡、记录输入区、历史列表；无底部导航遮挡。 |
| Screen31 体重趋势 | 无独立路由 | 缺失 | 需补趋势详情页。 |
| Screen32 疫苗计划 | `renderVaccine` | 源码结构已转译，DOM 抽检通过 | 已还原即将到期 hero、提醒/标记按钮、计划列表和说明卡。 |
| Screen33 新增健康备忘 | `renderHealth` 部分 | 缺失 | 需独立新增/编辑备忘状态。 |
| Screen34 发布今日小事 | `dailyPost` placeholder | 缺失 | 需补发布页。 |

## P1 社交、地图、我的审计

| Figma Make 页面 | 当前 RN 对应 | 当前状态 | 结论/下一步 |
|---|---|---:|---|
| Screen35 社交发现页 | `renderDiscover` | 源码结构已转译，DOM 抽检通过 | 已按源码重写大标题、定位胶囊、筛选 chip、宠物主人卡、模糊距离；重复 Header 已修。 |
| Screen36 筛选无结果 | `renderDiscover` empty | 未 1:1 复核 | 需独立空状态。 |
| Screen37 定位未授权 | 无独立路由 | 缺失 | 需补定位未授权状态。 |
| Screen38 打招呼 Bottom Sheet | 无独立 UI | 缺失 | 需补 sheet 与发送成功/失败。 |
| Screen39 约遛邀请 | 无独立 UI | 缺失 | 需补邀请表单。 |
| Screen40 招呼请求 | 无独立 UI | 缺失 | 需补请求处理。 |
| Screen41 消息列表 | `renderMessages` | 源码结构已转译，DOM 抽检通过 | 已去掉通用 Header，按源码改为大标题、搜索/通知按钮、招呼请求卡、会话列表；还需补足更多会话样例和坐标复核。 |
| Screen42 聊天详情 | `renderPlaceholder`/chat | 缺失 | 需补真实会话详情页。 |
| Screen43 消息发送失败 | chat failed | 未 1:1 复核 | 需补失败消息样式。 |
| Screen44 通知中心 | `renderNotifications` | 源码结构已转译，待浏览器专项抽检 | 已重写通知卡、未读/已读状态；需从消息页通知入口专项打开复核。 |
| Screen45 宠物友好地图 | `renderMap` | 源码结构已转译，DOM 抽检通过 | 已去掉通用 Header，按源码改为全屏地图、浮动搜索、筛选 chip、右侧控件、底部地点 sheet；底部 sheet 已避让 TabBar。 |
| Screen46 地图搜索与筛选 | `renderMap` 部分 | 非 1:1 | 需补搜索/筛选展开状态。 |
| Screen47 地图定位失败 | 无独立状态 | 缺失 | 需补定位失败页/状态。 |
| Screen48 地点详情 | `renderPlaceDetail` | 源码结构已转译，DOM 抽检通过 | 已重写详情 hero、返回/分享/收藏按钮、照片计数、详情 sheet、评价预览、收藏/导航/点评；重复 Header 已修。 |
| Screen49 新增地点 / 点评 | 无独立路由 | 缺失 | 需补新增地点/点评表单。 |
| Screen50 点评提交成功 等待审核 | 无独立状态 | 缺失 | 需补成功审核中状态。 |
| Screen51 点评提交失败 | 无独立状态 | 缺失 | 需补失败状态。 |
| Screen52 收藏 / 取消收藏 | `renderPlaceDetail` 部分 | 未 1:1 复核 | 需补收藏切换 toast/状态。 |
| Screen53 高德导航确认弹窗 | `showToast` 简化 | 缺失 | 需补确认弹窗，真实地图选高德。 |
| Screen54 我的 | `renderProfile` | 源码结构已转译，DOM 抽检通过 | 已去掉重复标题，按源码改为大标题、设置按钮、渐变用户卡、当前宠物卡、分组菜单；还需截图/坐标复核。 |
| Screen55 宠物档案详情 | `renderPetDetail` | 源码结构已转译，DOM 抽检通过 | 已按源码重写形象 hero、统计 tile、基础信息、健康分组；底部导航已移除。 |
| Screen56 多宠管理 | 无独立路由 | 缺失 | 需补多宠列表和切换。 |
| Screen57 编辑宠物资料 | `renderPetInfo editPet` | 非 1:1 | 需补编辑态视觉和字段。 |
| Screen58 设置与隐私 | `renderSettings` | 源码结构已转译，DOM 抽检通过 | 已按源码重写隐私、通用、安全与账号分组，退出登录保留二次确认。 |
| Screen59 账号安全 | `renderPlaceholder` | MVP 骨架已补，非 1:1 | 已补账号安全风格化骨架和危险操作二次确认；仍需完整源码页字段。 |
| Screen60 安全中心 | `renderPlaceholder` | MVP 骨架已补，非 1:1 | 已补安全中心风格化骨架；仍需补完整举报、拉黑、黑名单流程。 |
| Screen61 黑名单管理 | 无独立路由 | 缺失 | 需补黑名单页。 |
| Screen62 退出登录确认 | `confirm` 通用弹窗 | 非 1:1 | 需按源码确认弹窗重做。 |
| Screen63 注销账号 | 无独立路由 | 缺失 | 需补注销流程。 |

## 组件规范审计

| Figma Make 页面 | 当前 RN 对应 | 当前状态 | 结论/下一步 |
|---|---|---:|---|
| Screen64 Button 按钮 | `Button` | 未 1:1 复核 | 需统一按钮高度、圆角、loading、disabled、countdown。 |
| Screen65 Input 输入框 | `Field`/TextInput | 未 1:1 复核 | 需统一输入框视觉。 |
| Screen66 Toast · Tag · Toggle | `Toast`/Tag/权限控件 | 未 1:1 复核 | 需抽公共组件。 |
| Screen67 Dialog 弹窗 | `confirm` | 非 1:1 | 需重做 Dialog。 |
| Screen68 BottomSheet 底部弹层 | 无公共组件 | 缺失 | 需新增 BottomSheet。 |
| Screen69 TabBar 底部导航 | `tabBar` | 未 1:1 复核 | 需核对浮动胶囊、激活态、图标、Home Indicator 避让。 |
| Screen70 Card 卡片 | `Card`/多处内联 | 未 1:1 复核 | 需统一卡片 token。 |
| Screen71 Empty State 空状态 | 多处简化 | 非 1:1 | 需抽 EmptyState。 |
| Screen72 Error State 错误页 | 多处简化 | 非 1:1 | 需抽 ErrorState。 |
| Screen73 Loading & Skeleton | 多处简化 | 非 1:1 | 需抽 Loading/Skeleton。 |

## 最高优先级修复顺序

1. 登录/验证码全状态：因为这是用户第一眼看到的页面，且已有多次交互问题。
2. 电子宠物首页 Screen26：用户已明确指出添加宠物后的宠物页粗糙。
3. 地图 Screen45：用户已明确指出地图页糟糕。
4. 我的/消息 Screen41/54：用户已指出重复标题，需彻底按源码重做。
5. 权限/建档主链路 Screen10-20：确保 MVP 首次使用流程视觉统一。
6. 社交/地点/设置缺失状态：补齐 P1 和异常态。

## 执行纪律

- 每改一屏，必须记录：
  - 源页面编号和源码文件。
  - RN 文件和函数。
  - 已核对的关键尺寸。
  - 浏览器验证结果。
- 不允许再写“整体完成/全部转完”，除非审计表中该页变为 `1:1 已复核`。
