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
| 1 | 登录页 默认 | `renderLogin` | 二次收敛-需真机截图复核 | 本轮已按 Screen1-5 收敛手机号输入框 56px/16px 圆角、登录专用 52px 胶囊按钮、协议行圆形勾选与间距；2026-06-16 继续按源码 BrandHeader 收敛默认态：登录页横向 padding 调为 28px，Logo 36px/17px/600，标题 28px/600/35px，副文案 8px 顶距，`loginHero` 从 88 调到 50 以贴近状态栏+TopBar 后的标题起点；手机号输入状态机未改 |
| 2 | 手机号格式错误 | `renderLogin` | 二次收敛-需真机截图复核 | 本轮补 Screen2 行内错误：14px 红色 AlertCircle + 13px 错误文案；手机号校验前移到协议校验之前，错误手机号不发短信、不跳转、不只依赖 Toast |
| 3 | 未勾选协议 | `renderLogin` | 二次收敛-需真机截图复核 | 本轮补 Screen3 协议未勾选红色状态：checkbox 红色描边、协议文案变红，并保留顶部 Toast；不改短信接口调用 |
| 4 | 验证码发送中 | `renderLogin` | 已接入-需视觉复核 | 本轮已修发送中按钮保持橙色 loading，不再套禁用灰色；仍需真机复核 |
| 5 | 发送过频倒计时 | `renderLogin` | 已接入-需视觉复核 | 本轮已按 PrimaryButton countdown 使用浅底灰字胶囊按钮；倒计时逻辑仍沿用现有状态机 |
| 6 | 验证码页 默认 | `renderOtp` | 二次收敛-需真机截图复核 | OTP 仍保持源码式 46x56 格子、14px 圆角、首位 cursor 和倒计时重发逻辑；2026-06-16 继续按 Screen6 降低字重：验证码数字 600、手机号 400、重发说明 400、重新发送 500，并将“语音验证码”恢复为青绿色 accent；输入顺序/粘贴/倒计时逻辑未改 |
| 7 | 验证码错误 | `renderOtp` | 二次收敛-需真机截图复核 | 本轮补 Screen7 同款行内错误图标行，错误格子维持红色描边/红色数字；2026-06-16 同步继承默认态字重收敛；验证码逻辑不变 |
| 8 | 验证码过期 | `renderOtp` | 二次收敛-需真机截图复核 | 过期态复用行内错误图标行，重新发送区域继续由真实倒计时驱动；2026-06-16 同步继承默认态重发/语音入口字重和颜色收敛；Toast 仍按接口错误文案触发 |
| 9 | 登录成功 loading | `renderLoginSuccessLoading` + 验证码成功状态 | 已接入-需视觉复核 | 本轮按 Screen9 接入独立成功 loading 屏：120px 宠物主视觉、`登录中...` 行、两行唤醒说明和 3 点进度；需真机截图复核停留时长与跳转观感 |
| 10 | 权限引导页 | `renderPermissions` | 二次收敛-需真机截图复核 | 本轮按 Screen10 继续收敛权限行原子样式：44px 图标块/14px 圆角、15px/500 标题、12.5px 说明文案、轻量“已开启/授权中”状态；默认底部弱操作改回“稍后再说”，真实权限请求逻辑不变 |
| 11 | 定位权限被拒 | `renderPermissions` | 二次收敛-需真机截图复核 | 本轮保留 Screen11 独立拒绝标题、DeniedHero、68px 定位图标块与红色 X 角标，并同步权限行轻量状态样式；“去系统设置开启定位”真实跳转逻辑不变 |
| 12 | 相册/相机权限被拒 | `renderPermissions` | 二次收敛-需真机截图复核 | 本轮复用 Screen12 的青绿色相机拒绝 Hero 与同款权限行；授权中状态改为小 loading + 灰色“授权中”，不改变相册/相机原生授权调用 |
| 13 | 通知权限被拒 | `renderPermissions` | 二次收敛-需真机截图复核 | 本轮复用 Screen13 的金色通知拒绝 Hero 与同款权限行；通知拒绝后的设置按钮/继续使用逻辑保持现有链路 |
| 14 | 未添加宠物空状态 | `renderEmptyPet` | 二次收敛-需真机截图复核 | 本轮将 Screen14 从多宠管理空态拆为宠物 tab 首页空态：200px 插画区、130px Mascot、右下 28px 虚线 Plus、标题“还没有添加你的毛孩子”、底部 52px“添加我的宠物”CTA；Screen82 多宠空态继续保留原管理场景 |
| 15 | 宠物基础信息 | `renderPetInfo` | 二次收敛-需真机截图复核 | 本轮补新增流程专用 52px/16px 圆角输入框、12.5px 标签、体重 kg suffix 和 52px 底部主按钮；生日/性别作为 MVP 业务字段保留，但统一进同一套 Figma 表单体系 |
| 16 | 上传宠物照片 | `renderUpload` | 二次收敛-需真机截图复核 | 已按 UploadBox/TipsList 收敛上传卡渐变、340px 高度、轻阴影、tips 白底卡间距；本轮补 Screen16/17 共用上传专用双按钮：52px 高、26px 胶囊、相机图标、白底描边/橙色实心与 loading 文案；2026-06-16 追加按 Screen66 分型上传权限/打开失败 Toast：权限缺失为 warning，打开相机/相册失败为 error + 重试提示 |
| 17 | 上传失败 未识别 | `renderUploadNoPet` | 二次收敛-需真机截图复核 | 已按 Screen17 细调失败图卡渐变、警示浮层、原因卡间距和建议列表；本轮补底部“重新选择 / 重新拍照”源码式 52px 胶囊双按钮。该页是独立上传失败设计，不再强行迁移到通用 `ErrorState` |
| 18 | 上传识别详情 | `renderUploadDetail` | 二次收敛-需真机截图复核 | 本轮按 Screen18 将识别信息卡改为专用 18px 顶距/16px 内距白卡，字段名收敛为“宠物主体/毛色特征/五官特征/表情气质”，标签改为左对齐 `#` chip，底部改为源码式 52px 橙色胶囊 CTA；Hero 保留真实上传预览以守住识别业务，但容器渐变、badge 字重和质量角标已按 Figma 收敛 |
| 19 | AI 灵伴生成中 | `renderGenerating` | 二次收敛-需真机截图复核 | 本轮按 Screen19 继续收敛：生成预览图补 5px 白色内圈和轻微 blur、扫描线内补静态粒子层、标题间距改为 54px、标题字重 600、进度条补 28px 顶距、步骤卡改为 14px 纵向内距；真实生成轮询/失败重试逻辑保持不变；2026-06-16 追加照片不适合生成 warning Toast 与启动生成失败 error Toast，均补下一步副文案 |
| 20 | 生成结果 默认 | `renderAiResult` | 二次收敛-需真机截图复核 | 本轮已按候选数量拆出 Screen20 单候选态：无 `candidateUrls` 或仅 1 张结果时展示“遇见你的小灵伴”标题、右上 Heart、原图浮层 chip、260px AI 形象 halo/ring、AI 灵伴 badge、三枚特征 tag 和底部保存/重新生成 CTA；当前 mock 仍返回 3 个候选并继续走 Screen21 主链路 |
| 21 | 生成结果 多候选 | `renderAiResult` | 二次收敛-需真机截图复核 | 本轮按 Screen21 继续收敛当前真实结果页：移除混入的 Screen20 原图 chip 和 hero badge，主形象容器改为 230px，特征标签改为 26px 顶距，候选标题字重改 500；三候选卡、选中勾选角标、保存/重生成/反馈入口和真实保存逻辑保持可用 |
| 22 | 不满意反馈面板 | `renderAvatarFeedbackSheet` + 任务反馈接口 | 二次收敛-需真机截图复核 | 本轮按 Screen22 细调 bottom sheet 文案字重、选中 chip 字重、取消/提交按钮字重；反馈原因多选、卡通程度条和 `sendGenerationFeedback` 后重试生成逻辑保持不变 |
| 23 | 重新生成确认弹窗 | `renderAvatarRegenerateConfirm` + 重试逻辑 | 二次收敛-需真机截图复核 | 本轮按 Screen23 细调弹窗标题/按钮字重，并在 Web 端补 56px 图标圆的橙青渐变背景；额度说明、建议反馈提示卡和取消/重新生成真实逻辑保持不变 |
| 24 | 保存成功 Toast | `Toast` + 保存成功 | 二次收敛-需真机截图复核 | 本轮按 Screen24 增加保存形象专用 Toast 布局：顶部 96px、220px 深色胶囊、30px 青绿色勾选图标、14px/600 主文案和 11.5px 副文案；保存成功仍沿用现有回首页流程 |
| 25 | 保存失败 Toast | `Toast` + 保存失败 | 二次收敛-需真机截图复核 | 本轮按 Screen25 增加保存形象失败专用 Toast 布局：顶部 92px、左右 16px 白底浮层、34px 红色错误图标、橙色浅底“重试”action 和“网络连接异常，灵伴形象未上传”副文案；保存失败状态机不变 |
| 26 | 电子宠物首页 | `renderHome` | 已接入-需视觉复核 | 本轮按 Screen26 收敛宠物舞台 halo/ring、浮层聊天提示、在线徽标、健康分 conic 圆环和 2x2 快捷卡间距；2026-06-16 追加：标题补 `☀️`，浮层聊天提示还原为源码的纯文字气泡、右侧 26dp、12px/500；2026-06-18 追加：四宫格「健康备忘」入口改为「健康日历」，直接进入健康日历；仍需真机截图复核是否遮挡宠物脸部 |
| 27 | 电子宠物 AI 对话 | `renderChat` | 已接入-需视觉复核 | 本轮按 Screen27 改为顶部 56px 对话栏、头像在线点、轻量安全提示、消息列表独立滚动、底部横向快捷话题和 48px 输入/发送栏；AI 反馈小 chip 作为 MVP 额外功能保留，仍需真机截图复核 |
| 28 | AI 对话异常状态 | `renderChat` | 已接入-需视觉复核 | 已按 Screen28 补 AI 对话错误 banner 和失败消息重试卡；2026-06-16 追加：失败态头部改为“连接中断”、头像/在线点/Sparkles 降灰，红色错误 banner 替代安全提示；本轮继续将 AI 对话发送失败 Toast 分型为 error + 重试提示，气泡、离线卡仍需截图复核 |
| 29 | 健康管理首页 | `renderHealth` | 已接入-需视觉复核 | 本轮按 Screen29 收敛为健康总览结构：顶部右侧新增入口、渐变健康分 Hero、体重趋势小图、疫苗/健康日历入口和近期记录卡；2026-06-18 起右上角新增入口直接进入新增健康备忘，近期记录「查看全部」改为「查看日历」；已移除首页内联“快速备忘”表单，避免偏离 Figma 总览页 |
| 30 | 体重记录 | `renderWeight` | 已接入-需视觉复核 | 本轮将页面中部自写输入表单收敛为 Screen97/99 的“历史记录 + 添加入口 + 底部弹层”结构，保留体重记录能力 |
| 31 | 体重趋势 | `renderWeight` | 已接入-需视觉复核 | 本轮补趋势卡顶部摘要、健康区间、面积趋势图、统计 tile 和健康提示卡；仍需真机截图复核曲线密度 |
| 32 | 疫苗计划 | `renderVaccine` | 已接入-需视觉复核 | 本轮按 Screen32 收敛为暖橙渐变 Hero、40px 胶囊操作按钮、计划列表卡、状态 tag 和接种提示卡；仍需真机截图复核列表行距 |
| 33 | 新增健康备忘 | `renderMemoNew` | 已接入-需视觉复核 | 本轮拆出独立新增备忘页，按 Screen33 补 4 等分备忘类型、52px 提醒时间行、重复选项、备注输入、提醒开关和 52px 底部 CTA |
| 34 | 发布今日小事 | `renderDailyPost` | 已二次收敛-需截图复核 | 已按 Screen34 补宠物 chip、130px 正文卡、三格照片 strip、心情/tag chips、AI 润色卡、顶部发布入口和 56px 底部胶囊工具条；本轮按 Screen66/90/91 将草稿生成/发布成功改为 success Toast，发布失败改为 error Toast + 保留内容副文案；今日小事图片上传仍待后续 Figma/接口接入 |
| 35 | 社交发现页 | `renderDiscover` | 已二次收敛-需截图复核 | 已按 Screen35 将发现卡片改为 92px 圆角宠物照片、主人头像叠层、青绿色距离 pill、双按钮行动区，并将顶部右侧恢复为搜索/筛选图标；下拉刷新逻辑保留 |
| 36 | 筛选无结果 | `renderDiscover` | 二次收敛-需真机截图复核 | 本轮不再复用通用 `EmptyState`，改为 Screen36 源码结构：筛选摘要条、156px 搜索插画层、`0 位` badge、双行说明和“清除筛选/查看全部”；无筛选空结果只保留“刷新附近”主 CTA，避免多入口语义混淆 |
| 37 | 定位未授权 | `renderDiscover` + 权限/隐私状态 | 已接入-需视觉复核 | 本轮按 Screen37 改为红色权限 banner、模糊发现卡预览、居中授权 CTA 面板、隐私说明卡和“暂不开启 / 去设置开启”双按钮；系统定位拒绝与附近可见关闭共用结构但文案区分 |
| 38 | 打招呼 Bottom Sheet | `renderGreetingSheet` + `sendGreeting` | 本轮已补-需视觉复核 | 已改为先弹底部面板再确认发送，需截图对齐 Screen38 |
| 39 | 约遛邀请 | `renderWalkInvite` | 已二次收敛-需截图复核 | 已按 Screen39 改为宠物头像叠层配对卡、三日期选择、时间输入行、宠物友好地点图卡、留言卡、安全提示和“保存草稿 / 发送邀请”底部双按钮；真实发送逻辑与 loading 保留 |
| 40 | 招呼请求 | `renderGreetingRequests` | 已二次收敛-需截图复核 | 已按 Screen40 补顶部新招呼摘要条、宠物图+主人头像叠层卡片、忽略/举报/同意&聊天三按钮和底部安全提示；接受/忽略仍走真实接口，举报暂以 toast 占位 |
| 41 | 消息列表 | `renderMessages` | 已二次收敛-需截图复核 | 已按 Screen41 将顶部动作恢复为搜索+通知、刷新迁到下拉刷新；招呼请求卡补暖橙/青绿渐变、AI 会话头像补橙色描边，约遛会话补橙色 `[邀请]` 前缀；分组/静音等后续需真实数据状态支撑 |
| 42 | 聊天详情 | `renderConversation` + `ErrorState` | 已二次收敛-需截图复核 | 已按 Screen42 改为自定义聊天头部、头像叠层、安全提示条、消息区独立滚动、底部附件 chip 与输入 dock；约遛消息可识别为图片邀请卡，普通气泡继续接真实消息 |
| 43 | 消息发送失败 | `renderConversation` | 已二次收敛-需截图复核 | Screen43 的网络错误 banner、发送中提示、消息未送达重试/删除卡继续保留，并随本轮聊天页底部 dock/滚动结构一起收敛；本轮继续将普通聊天发送失败 Toast 分型为 error + 未送达副文案；仍需真机截图复核键盘顶起与间距 |
| 44 | 通知中心 | `renderNotifications` | 已接入-需截图级复核 | 已按 Figma 源码补顶部标题栏、筛选 chip、今天/昨天/更早分组、未读卡片、空态和「全部已读」按钮；前后端通知项已补 `category/createdAt`，约遛单独归类为 `walk`；仍需真机截图复核间距、字体和滚动手感 |
| 45 | 宠物友好地图 | `renderMap` | 已接入-需视觉复核 | 自定义地图已做；本轮继续按 Screen45 收敛地图控件：右侧控制按钮改为 40x40/14px 圆角并下移到地图中段，底部地点 sheet 横向 padding 回到 20px，附近地点列表改为 78px 图片卡 + 评分角标 + 距离 pill 结构；定位/刷新/高德逻辑不变 |
| 46 | 地图搜索与筛选 | `renderMap` | 已接入-需视觉复核 | 本轮按 Screen46 补搜索/筛选模式：地图暗色 veil、顶部搜索框清除按钮、底部 28px 圆角结果面板、筛选 chip、排序 segment、3km 距离条和搜索结果列表；地图样式面板仍保留独立 Bottom Sheet |
| 47 | 地图定位失败 | `renderMap` | 二次收敛-需真机截图复核 | 本轮按 Screen47 补齐定位失败完整状态：地图半透明 veil、搜索框下错误 banner、中心 76px Locate 图标块、“无法获取当前位置”说明，以及底部“手动选地区 / 重新定位或去开启定位”双 48px 胶囊按钮；手动选区先聚焦顶部搜索框，不新增未设计的城市选择页 |
| 48 | 地点详情 | `renderPlaceDetail` | 二次收敛-需真机截图复核 | 本轮按 Screen48 继续收敛：Hero 改为真实地点图片 + 暗色渐变遮罩，照片计数补相机图标，官方认证改为盾牌 pill，评分/距离/地址元信息拆成源码式图标行，最新点评卡补头像、星级和时间；内容区收藏按钮移回 Hero，底部主操作改为“写点评”52px 小卡 + “高德导航”52px 橙色胶囊，分享、收藏、导航、点评真实逻辑保持不变 |
| 49 | 新增地点 / 点评 | `renderAddPlaceReview` | 已接入-需视觉复核 | 本轮按 Screen49 重建为源码式完整表单：顶部发布栏、地点摘要/新增地点输入卡、5 星评分、宠物友好特色 chip、体验 textarea、照片占位和 24 小时审核提示；地点详情写点评入口改为进入完整点评页 |
| 50 | 点评提交成功 等待审核 | `renderPlaceSubmitResult` | 已接入-需视觉复核 | 本轮补独立等待审核成功页：大号时间/审核图标、三步审核进度、返回地点/继续提交操作 |
| 51 | 点评提交失败 | `renderPlaceSubmitResult` | 已接入-需视觉复核 | 本轮补独立失败页：红色警示图标、草稿卡、保存草稿/重新提交操作；仍需真机截图复核 |
| 52 | 收藏 / 取消收藏 | 地点收藏逻辑 + `Toast` | 二次收敛-需真机截图复核 | 本轮按 Screen52 补齐收藏/取消收藏 Toast 细节：收藏成功使用顶部 dark Toast、Bookmark 橙色图标块、副文案“在「我的 · 收藏」中查看”和“管理”action；取消收藏使用底部 surface Toast、灰底 Heart、副文案“将不再出现在「想去」列表”和“撤销”action；收藏接口与乐观更新逻辑不变 |
| 53 | 高德导航确认弹窗 | `renderAmapNavigationConfirm` + 外部导航 | 已接入-需视觉复核 | 本轮按 Screen53 新增地图详情页专用确认弹窗：绿色导航图标、离开 Lumii 提示、地点摘要卡、地图应用三选项和“取消 / 打开导航”双 48px 胶囊按钮 |
| 54 | 我的 | `renderProfile` | 二次收敛-需真机截图复核 | 本轮按 Screen54 继续修正标题 26px、当前宠物入口文案“多宠管理”、宠物性别/品种 badge、fallback 标签、菜单 28px 图标块、15px 常规字重行标题和 14px 右值；我的页已改为 route 级 edge-to-edge 容器，不再靠负边距抵消通用 `Screen` padding；2026-06-16 根据真机反馈继续修正三块主内容宽度：Profile 路由改为独立全宽 `ScrollView`，不再复用通用 `content` 的 20px 横向 padding，用户卡/当前宠物卡/菜单组恢复 Figma Make 源码的 16px 页面边距；手机号/通知未读/跳转逻辑保持现有真实数据 |
| 55 | 宠物档案详情 | `renderPetDetail` | 二次收敛-需真机截图复核 | 本轮按 Screen55 改为全宽 220px 照片 Hero、暗色渐隐、右上更换、右下白色编辑胶囊；基础信息改为源码式 section：标题在卡片外、白底 16px 圆角卡片、字段值右对齐/灰色/常规字重；健康区同样改为外置标题 + 疫苗与驱虫/健康日历卡片 |
| 56 | 多宠管理 | `renderMultiPet` | 已接入-需视觉复核 | 本轮已按 Screen81 增加 hero 底部健康提示分割线、调整列表 row 高度和当前宠物 badge 字重；2026-06-16 追加：当前灵伴 badge 补 Sparkles 图标，列表宠物名/品种 badge/健康状态小胶囊/已选中按钮进一步贴近源码；切换与删除逻辑保持不变，仍需截图复核 |
| 57 | 编辑宠物资料 | `renderPetInfo` edit mode | 已接入-需视觉复核 | 本轮不再复用建档表单，按 Screen57 改为 88px 宠物头像+相机角标、白底 16px 圆角资料列表、80px 标签列、底部保存按钮和居中删除入口 |
| 58 | 设置与隐私 | `renderSettings` | 二次收敛-需真机截图复核 | 本轮按 Screen58 重建为源码式 Section：标题在卡片外、白底 16px 卡片、前三个隐私项使用 44x26 Toggle 和副文案；通用/安全账号区使用同款 Row，退出登录恢复为红色危险行；通知开关仍沿用原生权限触发逻辑 |
| 59 | 账号安全 | `renderAccountSecurity` | 二次收敛-需真机截图复核 | 本轮在保留账号安全 Hero 的基础上统一为 Screen58/59 同款 Section/Row：登录方式、登录与设备、危险操作均为白底 16px 分组；登录保护使用源码式 Toggle，注销账号保留后续开放提示 |
| 60 | 安全中心 | `renderSafety` | 已接入-需视觉复核 | 本轮按 Screen60 补暖色安全 Hero、四张白底动作卡和底部审核说明卡；2026-06-22 已补宠友圈动态/评论举报、拉黑入口与黑名单管理区 |
| 61 | 黑名单管理 | `renderSafety` 黑名单区 | 已接入-需视觉复核 | 2026-06-22 已在安全中心内接入黑名单列表、空态、刷新、解除拉黑确认和接口联动；暂不新增独立路由 |
| 62 | 退出登录确认 | `renderLogoutConfirmSheet` + logout | 已接入-需视觉复核 | 本轮按 Screen62 改为底部 Sheet：红色退出图标块、居中标题/说明、纵向危险确认与取消按钮；不再复用普通 `ConfirmDialog` |
| 63 | 注销账号 | 无 | 缺失 | 用户曾降级优先级，仍记录为缺失 |
| 64 | Button 按钮 | `ui.tsx/Button` | 二次收敛-需截图复核 | 已按 Screen64 补 loading 小转圈 + “处理中…”中文状态、disabled 文案色，并移除全局按钮默认阴影；2026-06-16 追加修正 secondary 按钮文字/加载色为橙色；本轮继续补 disabled 对 ghost/secondary 的边框清理，避免禁用态残留描边；页面级 CTA 阴影仍由各页面专用样式承载 |
| 65 | Input 输入框 | `ui.tsx/Field` | 二次收敛-需截图复核 | 本轮按 Screen65 补齐 `Field` 的已填/错误/禁用状态能力：46px 高、12px 圆角、1.5px 边框、已填绿色 check、错误红色图标与 11px 错误文案、禁用暖灰底色；现有调用保持兼容 |
| 66 | Toast · Tag · Toggle | `ui.tsx/Toast/StatusPill/ToggleRow` | 二次收敛-需视觉复核 | Toast surface 继续按 Screen66 收敛：24px/8px 状态图标块、白底 14px 圆角、轻边框/阴影、action 左分割线和 13px/500 主文案；2026-06-16 追加将 surface Toast 阴影收敛为 4px/14px；本轮为 Screen24/25 增加 `avatarSaveSuccess/avatarSaveError` 专用布局，避免全局 Toast 位置被保存形象状态牵连；`StatusPill` 色值已收敛到 Screen66 Tag：`#F4EFE6`、`#FBE4DE`、`#E8F5F3 + #4DB6AC`；本轮继续给 `ToggleRow` 补 Screen66 disabled/loading 视觉：disabled 轨道 `#EFEAE1` + 0.6 透明度、文案灰化、loading 保持 44x26 轨道和 thumb 内转圈；业务设置开关保存逻辑未改 |
| 67 | Dialog 弹窗 | `ui.tsx/ConfirmDialog` | 二次收敛-需截图复核 | 通用 ConfirmDialog 回到 Screen67 的 290px 宽、20px 圆角、48px 状态图标块、16px/700 标题和危险态分型；本轮将危险态判断改为同时检查标题、正文与按钮文案中的“删除/移除/退出/注销”，确保中文弹窗不会误走普通态；AI/导航等专用弹窗不复用该组件 |
| 68 | BottomSheet 底部弹层 | `ui.tsx/BottomSheet` | 本轮组件已补-需视觉复核 | BottomSheet 按真实业务弹层源码继续收敛为 40x4 handle、28px 顶部圆角、22px 横向 padding、浅边框和向上阴影；打招呼、体重编辑、地图样式面板继续截图复核 |
| 69 | TabBar 底部导航 | bottom tabs | 二次收敛-需真机截图复核 | 本轮按 Screen69 收敛为白底 18px 圆角、1px 描边、`8px 6px` padding；选中态仅使用橙色图标/文字和 600 字重，不再加橙色背景块；地图 tab 改为定位针图标；消息 tab 接入会话未读 + 通知未读红点 |
| 70 | Card 卡片 | `ui.tsx/Card` + 多处 card | 组件已增强-待逐屏迁移 | 本轮按 Screen70 将基础 Card 收敛为白底 14px 圆角轻描边，并新增 `pet/place/message` 变体；页面里仍有大量自写 card 样式，后续需逐屏替换/复核 |
| 71 | Empty State 空状态 | `ui.tsx/EmptyState` + 多处空态 | 本轮组件已补-部分页面已迁移 | 已迁移备忘、体重、多宠、招呼请求、发现无结果、地图无结果、消息列表、通知中心；上传链路当前按 Screen16/17 独立页面设计处理，不作为通用 EmptyState 迁移项 |
| 72 | Error State 错误页 | `ui.tsx/ErrorState` + 多处错误态 | 本轮组件已补-部分页面已迁移 | 已迁移会话失效、地点失效、约遛对象失效、附近可见关闭、AI 生成失败、AI/普通聊天发送失败、地图定位失败；上传失败对应 Screen17 独立上传失败页，不强行套通用 `ErrorState` |
| 73 | Loading & Skeleton | `ui.tsx/LoadingState/SkeletonLine/SkeletonCard` + 多处 loading | 二次收敛-逐屏迁移中 | 本轮继续按 Screen73 收敛：`LoadingState` 改为 32px 橙色加载、12px 常规字重文案和中文省略号；`SkeletonCard` 补 12px 纵向 gap，保持 52px 圆形头像、双行文本与 100/85/70% 三条骨架；健康日历日历格/事件列表骨架已迁移，其他页面骨架仍需逐屏替换 |
| 74 | App 图标 | assets/app icon | 已接入-需复核 | 已替换过图标，需核对最新包是否一致 |
| 75 | 健康日历 默认月视图 | `renderHealthCalendar` + `/health/calendar` | 已接入 需视觉复核 | 本轮按 `health-calendar-screens.tsx` 补独立 `healthCalendar` route：宠物 mini card、月份切换、7 列日历、三色事件点、legend 和月度总结卡；2026-06-18 起宠物 mini card 删除健康分展示，健康分只保留在首页/健康首页；loading 骨架已迁到统一 `SkeletonLine` |
| 76 | 选中日期 有事件 | `renderHealthCalendar` | 已接入 需视觉复核 | 点击日期后展示事件列表，事件卡按体重/疫苗/备忘三类映射图标块、标题、详情和日期；体重/疫苗跳对应业务页，备忘事件进入编辑页 |
| 77 | 选中日期 空状态 | `renderHealthCalendar` | 已接入 需视觉复核 | 选中日期无记录时展示 Figma 风格空状态卡、圆形 PawPrint 插画和“添加一条记录”CTA，点击进入新增健康备忘 |
| 78 | 即将到期 / 逾期提醒 | `renderHealthCalendar`/`renderVaccine` | 已接入 需视觉复核 | 健康日历独立屏已补逾期红卡与临近暖黄卡；疫苗计划页此前已补 Screen78 风格提醒 |
| 79 | 加载中 下拉刷新 | `renderHealthCalendar` | 已接入 需视觉复核 | 初始加载和下拉刷新显示暖橙同步条、日历骨架格和事件列表骨架 |
| 80 | 读取失败 | `renderHealthCalendar` | 已接入 需视觉复核 | 日历读取失败时展示 WifiOff 红色图标块、失败说明、重新加载和稍后再试入口 |
| 81 | 我的宠物 默认列表 | `renderMultiPet` | 已接入-需视觉复核 | 本轮已按源码细化当前宠物 hero、健康提示分割区和独立宠物列表卡；仍需截图复核 |
| 82 | 还没有宠物 空状态 | `renderMultiPet`/`renderEmptyPet` | 已接入-需视觉复核 | 本轮按 Screen82 补 180px 暖色 paw 插画、青绿色 sparkle、居中文案、橙色 46px 主 CTA 和“稍后再说”入口，并复用到未添加宠物页 |
| 83 | 切换中 loading | `renderMultiPet` | 已接入-需视觉复核 | 本轮按 Screen83 补当前宠物 hero 轻透明、顶部状态文字和居中白底 loading puff |
| 84 | 切换成功 Toast | `Toast` + switch | 已接入-需视觉复核 | 切换成功文案已改为“已切换为X，首页内容已更新”，沿用 Screen66/84 的 surface 成功 Toast 样式 |
| 85 | 删除宠物 二次确认 | `renderPetDeleteConfirmSheet` + deletePet | 已接入-需视觉复核 | 本轮按 Screen85 改为底部 Sheet：宠物预览行、危险说明、暖黄提示卡、确认移除 loading 与取消按钮 |
| 86 | 编辑个人资料 默认态 | `renderOwnerEdit` | 二次收敛-需真机截图复核 | 本轮继续按源码去掉多余外层表单卡，页面内容轻校到 16px 栅格，头像保持 96px，输入框/简介 textarea 回到 14px 圆角白底描边体系；真实保存/头像选择逻辑不变 |
| 87 | 头像上传中 | `renderOwnerEdit` | 二次收敛-需真机截图复核 | 本轮按 Screen87 补头像暗层 loading、`62%` 进度文案和暖色上传提示卡“头像还在上传，保存按钮会在上传完成后亮起”；保存按钮继续由真实 `ownerAvatarPicking` 状态禁用 |
| 88 | 昵称错误 | `renderOwnerEdit` | 二次收敛-需真机截图复核 | 昵称为空/超长已在表单内红色 hint 与输入框红色描边呈现；本轮补“昵称为空”时输入框也立即红框，简介超长仍沿用红色 hint/计数 |
| 89 | 保存中 | `renderOwnerEdit` | 二次收敛-需真机截图复核 | 本轮按 Screen89 补顶部白色 loading puff“正在保存资料...”，表单内容 0.88 透明度，保存按钮保留 loading；真实 `saveOwnerProfile` 流程不变 |
| 90 | 保存成功 | `renderOwnerEdit` + owner save Toast | 已接入-需视觉复核 | 本轮按 Screen90 改为保存成功后停留编辑页，显示“资料已保存，新的头像也更新好了”surface Toast，并在头像上覆盖青绿色成功勾选层 |
| 91 | 保存失败 | `Toast` + owner save | 已接入-需视觉复核 | 本轮按 Screen91 补失败 surface Toast action 和“资料已暂存到本地”红色提示卡，含 WifiOff 图标、说明文案与重试按钮 |
| 92 | 编辑备忘 默认态 | `renderMemoEdit` | 二次收敛-需真机截图复核 | 本轮已按 Screen92 改为无外层卡轻表单，补 14px 圆角输入框、内容计数、日期/分类双行元信息卡和居中删除入口；标题/内容为空时输入框立即红框 |
| 93 | 保存中 | `renderMemoEdit` | 二次收敛-需真机截图复核 | 本轮按 Screen93 补顶部白色 loading puff“正在保存备忘...”，表单和底部操作 0.88 透明度；保存按钮保留 loading，真实 `saveMemoEdit` 流程不变 |
| 94 | 保存成功 | `Toast` + memo save | 二次收敛-需真机截图复核 | 编辑保存成功后停留在编辑页并显示 surface 成功 Toast；本轮补副文案“X 的小日记又厚了一页”，更贴近 Screen94 |
| 95 | 删除备忘 二次确认 | `renderMemoDeleteConfirm` + delete memo | 二次收敛-需真机截图复核 | 本轮从通用 `ConfirmDialog` 改为 Screen95 专用居中危险弹窗：50% 暗色遮罩、52px 红色图标块、20px 圆角白卡、取消/确认删除双 46px 按钮；删除接口和失败保留弹窗重试逻辑不变 |
| 96 | 删除成功 备忘空状态 | `renderHealthMemos` | 已接入-兼容保留 | 本轮补 Screen96 风格暖色提示卡、大号圆形备忘插画、空状态文案和“新建备忘”主 CTA；2026-06-18 起健康备忘列表页不再作为主流程入口，删除成功回到健康日历，该页仅做旧路由/调试兼容 |
| 97 | 体重趋势 正常 | `renderWeight` | 已接入-需视觉复核 | 本轮按 Screen97 强化趋势卡、稳定提示、历史记录标题右侧“添加”和独立圆角记录卡，首条高亮 |
| 98 | 体重趋势 异常 | `renderWeight` | 已接入-需视觉复核 | 本轮异常态已使用 Screen98 的暖黄提示卡、体重下降 pill 和记录卡高亮方向；仍需真机截图复核文案折行 |
| 99 | 编辑体重 弹层 | `renderWeight` + `BottomSheet` | 已接入-需视觉复核 | 本轮将新增和编辑体重统一迁移到 Screen99 风格 Bottom Sheet：大数字输入、快捷 +/- chip、日期/备注元信息卡、删除入口 |
| 100 | 删除体重记录 二次确认 | `renderWeightDeleteConfirm` + deleteWeightRecord | 已接入-需视觉复核 | 本轮按 Screen100 改为居中危险弹窗：52px 红色图标块、体重记录预览卡、趋势重算说明、取消/确认删除横向按钮 |
| 101 | 体重记录 空状态 | `renderWeight` | 已接入-需视觉复核 | 本轮补 Screen101 风格趋势插画、主 CTA 和提示卡；仍需截图核对垂直居中 |

## 下一轮 1:1 优先级

1. 继续迁移统一 Empty/Error/Loading：部分业务局部状态仍有自写空态/错误态；健康日历 Screen75-80 已完成首轮接入但需截图复核；AI/聊天/地图定位失败已完成首轮迁移但需截图复核；上传失败已按 Screen17 独立设计处理，不再强行迁移到通用 `ErrorState`。
2. 继续检查所有 Toast 文案和触发位置：Screen24/25 形象保存成功/失败已二次收敛；2026-06-16 已补普通聊天发送失败、上传/生成失败、今日小事发布成功/失败的 Screen66/90/91 分型。后续继续复核收藏/分享/定位/设置保存等低频 toast。
3. 重点精修高频主链路：Screen1-20、26、35、41、45、54、55。
4. 建立视觉验收：每次改完一组屏幕，用 Web/模拟器截图和 Figma Make 源码对应屏做并排复核。
5. 功能保护验收：视觉还原不能只审计页面一致性。每次涉及底部导航、原生能力、定位、地图、消息、上传、登录、建档等入口时，必须补一轮入口冒烟，至少确认页面可进入、核心数据仍显示、无控制台/原生崩溃；发现页和地图页强退已作为反例记录到 `docs/MVP_Development_Update_2026-06-12.md`。
