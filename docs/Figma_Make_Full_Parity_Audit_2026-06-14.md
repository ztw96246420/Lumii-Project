# Figma Make 全量 1:1 还原审计 2026-06-14

## 审计基准

- 设计源：`C:/Users/Administrator/Downloads/Lumii Project - Opus4.7 (2).zip`
- 本地解压：`figma-make-source-opus47-2/`
- Figma Make 屏幕总数：101 屏。
- RN 主实现：`mobile/src/mvp/LumiiMvpApp.tsx`
- RN 基础组件：`mobile/src/mvp/ui.tsx`

说明：Figma Make 源码里部分中文在终端显示为乱码，但样式、布局、尺寸、状态结构可读。前端还原时以 Figma Make 的结构/尺寸/颜色为准，中文文案沿用 App 中已校正的中文。

## 本轮已修基础组件

| 组件 | Figma Make 规则 | 本轮 RN 调整 |
| --- | --- | --- |
| Button | 高 44、圆角 14、14px/600，primary `#FF8A5C`，secondary `#FFF1E5`，ghost 透明描边，danger `#E5573F`，loading 显示小转圈+中文状态 | `ui.tsx` 已调整高度、圆角、字号、secondary/ghost/disabled/loading 视觉 |
| Input | 高 46、圆角 12、1.5px 边框，focus 使用主色边框 | `Field` 输入框已调整高度、圆角、边框、字号 |
| Toast | 主要业务 Toast 为顶部白底浮层，top 70、圆角 14、26px 状态图标块、轻阴影；dark 只作为兼容变体 | `Toast` 已按 Screen66/90/94 改为默认白底浮层，并支持 success/error/warning/info |
| Tag/Pill | 高 22、圆角 8、11px/600 | `StatusPill` 基础尺寸已收敛 |
| Toggle | 44×26，thumb 22，on 为 `#4DB6AC`，off 为 `#D9D5CB` | `ToggleRow` 已从原生 Switch 改为自定义 Make 风格 |
| Dialog | 宽 290、圆角 20、黑色 50% 遮罩、48px 状态图标块、按钮 40-44 高 | `ConfirmDialog` 已补图标块、居中标题/描述、普通/危险确认按钮分型 |

## 全量屏幕覆盖审计

状态定义：

- `已接入-需视觉复核`：RN 有对应业务页/状态，但还未逐像素对照。
- `部分接入`：业务逻辑有，但 Figma 的独立状态/弹层/视觉结构未完整落地。
- `缺失`：RN 当前没有对应页面或状态。
- `本轮组件已修`：属于系统组件页，本轮已优先修基础组件。

| Figma 屏 | 设计内容 | RN 对应 | 当前状态 | 主要差异/下一步 |
| --- | --- | --- | --- | --- |
| 1 | 登录页 默认 | `renderLogin` | 已接入-需视觉复核 | 本轮已按 Screen1-5 收敛手机号输入框 56px/16px 圆角、登录专用 52px 胶囊按钮、协议行圆形勾选与间距；标题位置仍需截图复核 |
| 2 | 手机号格式错误 | `renderLogin` | 已接入-需视觉复核 | 输入框基础样式已按 PhoneInput 收敛，错误 InlineError 图标行仍需继续按 Screen2 补齐 |
| 3 | 未勾选协议 | `renderLogin` | 已接入-需视觉复核 | 协议行视觉已接近 Agreement；shake/红色状态仍需复核 |
| 4 | 验证码发送中 | `renderLogin` | 已接入-需视觉复核 | 本轮已修发送中按钮保持橙色 loading，不再套禁用灰色；仍需真机复核 |
| 5 | 发送过频倒计时 | `renderLogin` | 已接入-需视觉复核 | 本轮已按 PrimaryButton countdown 使用浅底灰字胶囊按钮；倒计时逻辑仍沿用现有状态机 |
| 6 | 验证码页 默认 | `renderOtp` | 已接入-需视觉复核 | OTP 格子位置和焦点框需复核 |
| 7 | 验证码错误 | `renderOtp` | 已接入-需视觉复核 | 错误格子红色、提示文案需复核 |
| 8 | 验证码过期 | `renderOtp` | 已接入-需视觉复核 | 过期态和重新发送区域需复核 |
| 9 | 登录成功 loading | session/loading 状态 | 部分接入 | Figma 独立成功 loading 屏未 1:1 |
| 10 | 权限引导页 | `renderPermissions` | 已接入-需视觉复核 | 本轮已按 PermissionRow 收敛权限卡 20px 圆角、16px padding、轻阴影和 40x24 关闭开关；拒绝态独立页仍需复核 |
| 11 | 定位权限被拒 | `renderPermissions` | 部分接入 | 独立拒绝页未完全按 Screen11 展示 |
| 12 | 相册/相机权限被拒 | `renderPermissions` | 部分接入 | 独立拒绝页未完全按 Screen12 展示 |
| 13 | 通知权限被拒 | `renderPermissions` | 部分接入 | 独立拒绝页未完全按 Screen13 展示 |
| 14 | 未添加宠物空状态 | `renderEmptyPet` | 已接入-需视觉复核 | 空态插图、CTA、卡片层级需复核 |
| 15 | 宠物基础信息 | `renderPetInfo` | 已接入-需视觉复核 | 表单控件和选择 chip 需复核 |
| 16 | 上传宠物照片 | `renderUpload` | 已接入-需视觉复核 | 本轮已按 UploadBox/TipsList 收敛上传卡渐变、340px 高度、轻阴影、tips 白底卡间距；按钮图标/底部固定位置仍需复核 |
| 17 | 上传失败 未识别 | `renderUploadNoPet` | 已接入-需视觉复核 | 已按 Screen17 首轮细调失败图卡渐变、警示浮层、原因卡间距和建议列表；仍需截图复核 |
| 18 | 上传识别详情 | `renderUploadDetail` | 已接入-需视觉复核 | 本轮已将识别信息卡改为识别页专用右对齐值列，同时保留宠物档案左对齐；Hero 渐变和标签仍需截图复核 |
| 19 | AI 灵伴生成中 | `renderGenerating` | 已接入-需视觉复核 | 本轮已按 Screen19 收敛进度条为 6px 暖橙底，并在 Web 端补 conic ring/扫描线渐变；动态粒子仍需后续截图复核 |
| 20 | 生成结果 默认 | `renderAiResult` | 已接入-需视觉复核 | 本轮已按 Screen20 补 PageBg 氛围层、AI 形象 halo/ring、原图浮层 chip、AI 灵伴 badge 和 54px 结果页 CTA；按钮底部固定位置仍需真机截图复核 |
| 21 | 生成结果 多候选 | `renderAiResult` | 部分接入 | 多候选选择 UI 未完整落地 |
| 22 | 不满意反馈面板 | 形象重试逻辑 | 缺失 | 需按 Figma bottom sheet 做反馈原因面板 |
| 23 | 重新生成确认弹窗 | `ConfirmDialog` + 重试逻辑 | 部分接入 | 弹窗样式本轮已收敛，内容结构还需按 Screen23 |
| 24 | 保存成功 Toast | `Toast` + 保存成功 | 部分接入 | Toast 样式本轮已修，成功副标题结构未完全落地 |
| 25 | 保存失败 Toast | `Toast` + 保存失败 | 部分接入 | Toast 样式本轮已修，失败图标/副文案需补 |
| 26 | 电子宠物首页 | `renderHome` | 已接入-需视觉复核 | 本轮按 Screen26 收敛宠物舞台 halo/ring、浮层聊天提示、在线徽标、健康分 conic 圆环和 2x2 快捷卡间距；仍需真机截图复核是否遮挡宠物脸部 |
| 27 | 电子宠物 AI 对话 | `renderChat` | 已接入-需视觉复核 | 本轮按 Screen27 改为顶部 56px 对话栏、头像在线点、轻量安全提示、消息列表独立滚动、底部横向快捷话题和 48px 输入/发送栏；AI 反馈小 chip 作为 MVP 额外功能保留，仍需真机截图复核 |
| 28 | AI 对话异常状态 | `renderChat` | 已接入-需视觉复核 | 已按 Screen28 补 AI 对话错误 banner 和失败消息重试卡；气泡、离线卡仍需截图复核 |
| 29 | 健康管理首页 | `renderHealth` | 已接入-需视觉复核 | 本轮按 Screen29 收敛为健康总览结构：顶部右侧新增入口、渐变健康分 Hero、体重趋势小图、疫苗/备忘入口和近期记录卡；已移除首页内联“快速备忘”表单，避免偏离 Figma 总览页 |
| 30 | 体重记录 | `renderWeight` | 已接入-需视觉复核 | 本轮将页面中部自写输入表单收敛为 Screen97/99 的“历史记录 + 添加入口 + 底部弹层”结构，保留体重记录能力 |
| 31 | 体重趋势 | `renderWeight` | 已接入-需视觉复核 | 本轮补趋势卡顶部摘要、健康区间、面积趋势图、统计 tile 和健康提示卡；仍需真机截图复核曲线密度 |
| 32 | 疫苗计划 | `renderVaccine` | 已接入-需视觉复核 | 本轮按 Screen32 收敛为暖橙渐变 Hero、40px 胶囊操作按钮、计划列表卡、状态 tag 和接种提示卡；仍需真机截图复核列表行距 |
| 33 | 新增健康备忘 | `renderMemoNew` | 已接入-需视觉复核 | 本轮拆出独立新增备忘页，按 Screen33 补 4 等分备忘类型、52px 提醒时间行、重复选项、备注输入、提醒开关和 52px 底部 CTA |
| 34 | 发布今日小事 | `renderDailyPost` | 已接入-需视觉复核 | 发布卡片、图片区域、按钮需复核 |
| 35 | 社交发现页 | `renderDiscover` | 已接入-需视觉复核 | 卡片、筛选、刷新、距离 chip 需复核 |
| 36 | 筛选无结果 | `renderDiscover` + `EmptyState` | 本轮已迁移-需视觉复核 | 已改为统一 EmptyState 并带刷新/查看全部 CTA；仍需截图对齐 Screen36 的插画层 |
| 37 | 定位未授权 | `renderDiscover` + `ErrorState`/权限状态 | 部分接入 | 附近可见关闭已改 ErrorState；系统定位未授权的模糊预览面板仍需按 Screen37 精修 |
| 38 | 打招呼 Bottom Sheet | `renderGreetingSheet` + `sendGreeting` | 本轮已补-需视觉复核 | 已改为先弹底部面板再确认发送，需截图对齐 Screen38 |
| 39 | 约遛邀请 | `renderWalkInvite` | 已接入-需视觉复核 | 表单布局、时间 chip、发送态需复核 |
| 40 | 招呼请求 | `renderGreetingRequests` | 已接入-需视觉复核 | 请求卡片、接受/拒绝按钮需复核 |
| 41 | 消息列表 | `renderMessages` | 已接入-需视觉复核 | 已补 AI 灵伴会话入口、头像角标、无消息 EmptyState，并修正消息页内边距；分组/未读点仍需截图复核 |
| 42 | 聊天详情 | `renderConversation` + `ErrorState` | 已接入-需视觉复核 | 会话失效状态已迁移 ErrorState；输入区、气泡、约遛卡片仍需复核 |
| 43 | 消息发送失败 | `renderConversation` | 已接入-需视觉复核 | 已按 Screen43 补网络错误 banner、消息未送达重试/删除卡；仍需真机截图复核间距 |
| 44 | 通知中心 | `renderNotifications` | 已接入-需视觉复核 | 已补通知空态；filter chip、通知分组和未读卡片仍需复核 |
| 45 | 宠物友好地图 | `renderMap` | 已接入-需视觉复核 | 自定义地图已做，需继续对齐 Make 地图层次 |
| 46 | 地图搜索与筛选 | `renderMap` + `BottomSheet` | 部分接入 | 地图样式面板已迁移统一 Bottom Sheet；搜索/地点筛选仍需按 Screen46 精修 |
| 47 | 地图定位失败 | `renderMap` | 已接入-需视觉复核 | 已按 Screen47 在搜索框下补定位失败 banner、原因文案和重试按钮；中心空态仍需后续复核 |
| 48 | 地点详情 | `renderPlaceDetail` | 已接入-需视觉复核 | Hero 图、信息块、操作按钮需复核 |
| 49 | 新增地点 / 点评 | `renderAddPlaceReview` | 部分接入 | 基础表单有，提交状态需按 Figma 补齐 |
| 50 | 点评提交成功 等待审核 | `renderAddPlaceReview` + `Toast` | 部分接入 | 已改 warning surface Toast；独立等待审核成功页仍未 1:1 |
| 51 | 点评提交失败 | `renderAddPlaceReview` + `Toast` | 部分接入 | 已改 error surface Toast；独立失败状态仍需按 Screen51 精修 |
| 52 | 收藏 / 取消收藏 | 地点收藏逻辑 + `Toast` | 本轮已迁移-需视觉复核 | 已按 Screen52 分 dark 收藏 Toast / surface 取消 Toast；图标与副文案仍需截图复核 |
| 53 | 高德导航确认弹窗 | 外部导航确认 | 部分接入 | 弹窗组件已收敛，内容/按钮需按 Screen53 |
| 54 | 我的 | `renderProfile` | 已接入-需视觉复核 | 本轮按 Screen54 收敛为 5 个菜单入口，补通知红色未读徽标、不同入口图标底色和末行无分割线；顶部资料卡仍需真机截图复核 |
| 55 | 宠物档案详情 | `renderPetDetail` | 已接入-需视觉复核 | 本轮按 Screen55 改为全宽 220px 照片 Hero、暗色渐隐、右上更换、右下白色编辑胶囊；基础信息保持左对齐，健康区改为疫苗与驱虫/健康备忘 |
| 56 | 多宠管理 | `renderMultiPet` | 已接入-需视觉复核 | 本轮已按 Screen81 增加 hero 底部健康提示分割线、调整列表 row 高度和当前宠物 badge 字重；仍需截图复核 |
| 57 | 编辑宠物资料 | `renderPetInfo` edit mode | 部分接入 | 复用建档表单，编辑态样式需单独对齐 |
| 58 | 设置与隐私 | `renderSettings` | 已接入-需视觉复核 | Toggle 本轮已修，菜单行还需复核 |
| 59 | 账号安全 | `renderAccountSecurity` | 部分接入 | 账号安全详情未完全按 Screen59 |
| 60 | 安全中心 | `renderSafety` | 部分接入 | 入口展示有，举报/拉黑逻辑暂未做 |
| 61 | 黑名单管理 | 无 | 缺失 | 用户曾降级优先级，仍记录为缺失 |
| 62 | 退出登录确认 | `ConfirmDialog` + logout | 部分接入 | 弹窗样式本轮已收敛，Screen62 内容需复核 |
| 63 | 注销账号 | 无 | 缺失 | 用户曾降级优先级，仍记录为缺失 |
| 64 | Button 按钮 | `ui.tsx/Button` | 本轮组件已修 | 已按 Screen64 补 loading 中文状态和 disabled 文案色；仍需截图复核 |
| 65 | Input 输入框 | `ui.tsx/Field` | 本轮组件已修 | 仍需截图复核 |
| 66 | Toast · Tag · Toggle | `ui.tsx/Toast/StatusPill/ToggleRow` | 本轮组件已增强-需视觉复核 | Toast 默认改为白底 `surface`，状态图标块和 Tag 字重已按 Screen66 收敛；仍需截图复核 |
| 67 | Dialog 弹窗 | `ui.tsx/ConfirmDialog` | 本轮组件已修 | 已补信息/危险 icon card 分型；成功单按钮 Dialog 仍可后续抽象 |
| 68 | BottomSheet 底部弹层 | `ui.tsx/BottomSheet` | 本轮组件已补-需视觉复核 | 已按 Screen68 收敛 handle、圆角、边框和阴影；打招呼、体重编辑、地图样式面板继续截图复核 |
| 69 | TabBar 底部导航 | bottom tabs | 已接入-需视觉复核 | 图标、红点、选中态需复核 |
| 70 | Card 卡片 | 多处 card | 部分接入 | 基础 card 圆角/边框/阴影需继续统一 |
| 71 | Empty State 空状态 | `ui.tsx/EmptyState` + 多处空态 | 本轮组件已补-部分页面已迁移 | 已迁移备忘、体重、多宠、招呼请求、发现无结果、地图无结果、消息列表、通知中心；上传等空态仍需继续替换 |
| 72 | Error State 错误页 | `ui.tsx/ErrorState` + 多处错误态 | 本轮组件已补-部分页面已迁移 | 已迁移会话失效、地点失效、约遛对象失效、附近可见关闭、AI 生成失败、AI/普通聊天发送失败、地图定位失败；上传失败仍需逐处接入 |
| 73 | Loading & Skeleton | `ui.tsx/LoadingState/SkeletonLine` + 多处 loading | 本轮组件已补-待迁移 | Loading 与 Skeleton 基础组件已补齐，页面骨架仍需逐屏替换 |
| 74 | App 图标 | assets/app icon | 已接入-需复核 | 已替换过图标，需核对最新包是否一致 |
| 75 | 健康日历 默认月视图 | API 有 `/health/calendar` | 缺失 | RN 尚无健康日历 route |
| 76 | 选中日期 有事件 | 无 | 缺失 | 依赖健康日历 route |
| 77 | 选中日期 空状态 | 无 | 缺失 | 依赖健康日历 route |
| 78 | 即将到期 / 逾期提醒 | `renderHealth`/`renderVaccine` | 部分接入 | 本轮在疫苗计划页补 Screen78 风格逾期红卡与临近暖黄提醒卡；健康日历独立屏仍缺失 |
| 79 | 加载中 下拉刷新 | 无 | 缺失 | 健康日历加载态缺失 |
| 80 | 读取失败 | 无 | 缺失 | 健康日历错误态缺失 |
| 81 | 我的宠物 默认列表 | `renderMultiPet` | 已接入-需视觉复核 | 本轮已按源码细化当前宠物 hero、健康提示分割区和独立宠物列表卡；仍需截图复核 |
| 82 | 还没有宠物 空状态 | `renderMultiPet`/`renderEmptyPet` | 部分接入 | 多宠管理内空态需按 Screen82 |
| 83 | 切换中 loading | `renderMultiPet` | 已接入-需视觉复核 | loading 样式需复核 |
| 84 | 切换成功 Toast | `Toast` + switch | 部分接入 | Toast 本轮已修，成功内容需复核 |
| 85 | 删除宠物 二次确认 | `ConfirmDialog` | 部分接入 | Dialog 本轮已修，内容和危险按钮需复核 |
| 86 | 编辑个人资料 默认态 | `renderOwnerEdit` | 已接入-需视觉复核 | 本轮已按源码去掉多余外层表单卡，头像改为 96px，输入框/简介 textarea 回到 14px 圆角白底描边体系；仍需截图复核 |
| 87 | 头像上传中 | `renderOwnerEdit` | 已接入-需视觉复核 | loading overlay 需复核 |
| 88 | 昵称错误 | `renderOwnerEdit` | 部分接入 | 校验有，错误态样式需对齐 |
| 89 | 保存中 | `renderOwnerEdit` | 已接入-需视觉复核 | 保存按钮 loading 需复核 |
| 90 | 保存成功 | `Toast` + owner save | 部分接入 | Toast 本轮已修，成功态内容需复核 |
| 91 | 保存失败 | `Toast` + owner save | 部分接入 | 失败 Toast 类型化需补 |
| 92 | 编辑备忘 默认态 | `renderMemoEdit` | 已接入-需视觉复核 | 本轮已按 Screen92 改为无外层卡轻表单，补 14px 圆角输入框、内容计数、日期/分类双行元信息卡和居中删除入口 |
| 93 | 保存中 | `renderMemoEdit` | 已接入-需视觉复核 | 保存按钮保留 loading，编辑页不再立即跳回列表；顶部 loading Toast 仍可后续按 Screen93 独立增强 |
| 94 | 保存成功 | `Toast` + memo save | 已接入-需视觉复核 | 编辑保存成功后停留在编辑页并显示 surface 成功 Toast，更接近 Screen94；Toast 副文案仍可继续复刻 |
| 95 | 删除备忘 二次确认 | `ConfirmDialog` | 已接入-需视觉复核 | Dialog 走危险态图标块和红色确认按钮，文案按当前宠物备忘标题生成；仍需截图核对宽度 |
| 96 | 删除成功 备忘空状态 | `renderHealthMemos` | 已接入-需视觉复核 | 本轮补 Screen96 风格暖色提示卡、大号圆形备忘插画、空状态文案和“新建备忘”主 CTA |
| 97 | 体重趋势 正常 | `renderWeight` | 已接入-需视觉复核 | 本轮按 Screen97 强化趋势卡、稳定提示、历史记录标题右侧“添加”和独立圆角记录卡，首条高亮 |
| 98 | 体重趋势 异常 | `renderWeight` | 已接入-需视觉复核 | 本轮异常态已使用 Screen98 的暖黄提示卡、体重下降 pill 和记录卡高亮方向；仍需真机截图复核文案折行 |
| 99 | 编辑体重 弹层 | `renderWeight` + `BottomSheet` | 已接入-需视觉复核 | 本轮将新增和编辑体重统一迁移到 Screen99 风格 Bottom Sheet：大数字输入、快捷 +/- chip、日期/备注元信息卡、删除入口 |
| 100 | 删除体重记录 二次确认 | `ConfirmDialog` | 部分接入 | Dialog 本轮已修，内容需复核 |
| 101 | 体重记录 空状态 | `renderWeight` | 已接入-需视觉复核 | 本轮补 Screen101 风格趋势插画、主 CTA 和提示卡；仍需截图核对垂直居中 |

## 下一轮 1:1 优先级

1. 继续迁移统一 Empty/Error/Loading：消息列表、上传失败、健康日历等页面仍有自写空态/错误态；AI/聊天/地图定位失败已完成首轮迁移但需截图复核。
2. 继续检查所有 Toast 文案和触发位置：组件默认已是 `surface`，但普通聊天发送失败、上传/生成失败、发布失败等仍需按 Screen24/25/66/90/91/94 分型复核。
3. 重点精修高频主链路：Screen1-20、26、35、41、45、54、55。
4. 建立视觉验收：每次改完一组屏幕，用 Web/模拟器截图和 Figma Make 源码对应屏做并排复核。
