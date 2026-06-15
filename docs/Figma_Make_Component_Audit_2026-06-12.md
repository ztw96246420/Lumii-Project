# Figma Make Component Audit 2026-06-12

## Source

- 新版源码包：`C:/Users/Administrator/Downloads/Lumii Project - Opus4.7 (2).zip`
- 解压目录：`figma-make-source-opus47-2`
- 本轮重点页面：Screen81-101

## 本轮确认的统一组件语言

- `Button`：主按钮以暖橙 `#FF8A5C` 为主，圆角约 14，44px 高度，loading 使用小转圈加中文状态；危险操作使用红色 `#E5573F`。
- `Toast`：顶部浮层，白底、14px 圆角、轻阴影、左侧小色块/图标；不再优先使用黑底系统 Toast。
- `Dialog`：危险确认以白底圆角卡片或底部 Sheet 呈现，背景半透明深色遮罩，按钮分“取消/确认删除”。
- `Bottom Sheet`：底部圆角 24，顶部有短 handle；用于体重编辑、地图样式、后续筛选/打招呼等复杂操作。
- `Field/Input`：白底、14px 圆角、1.5px 边框；focus/错误态用橙色/红色边框，底部有 hint 与字数计数。
- `Tag/Pill`：小圆角标签，橙色用于宠物/主操作状态，青绿色用于健康/成功状态，黄色用于温和异常提醒。
- `Toggle/Switch`：继续保持轻量，不作为页面主要视觉中心。

## 已落地

- `mobile/src/mvp/ui.tsx`
  - `Button` 调整为 Screen64 的 44px 高度、14px 圆角、14px/600 字号；loading 现在显示小转圈 + “处理中…”中文状态，disabled 文案改为浅灰，通用按钮默认阴影已移除，页面级 CTA 阴影由专用样式承担；2026-06-16 追加修正 secondary 按钮文字/加载色为橙色；本轮继续补 disabled 对 ghost/secondary 的边框清理，避免禁用态残留描边。
  - `Toast` 按 Screen66/90/94 改为默认顶部白底浮层：top 70、14px 圆角、24px 状态图标块、轻边框/阴影；带 action 的 surface Toast 补左侧分割线，`dark` 仅保留为兼容变体；2026-06-16 追加将 surface Toast 阴影收敛为 Screen66 的轻量 4px/14px。
  - `ConfirmDialog` 按 Screen67 补齐 48px 状态图标块、居中标题/描述、普通/危险确认按钮分型；删除、移除、退出、注销类文案自动走危险态；本轮将危险态判断扩大到标题、正文与按钮文案，避免只看按钮导致中文弹窗误判。
  - `BottomSheet` 按 Screen68 统一 36x4 handle、白底、顶部 24px 圆角、浅边框和向上阴影。
  - `StatusPill` 字重收敛为 500，更贴近 Screen66 的轻量 Tag；本轮继续将 neutral/danger/success 色值收敛到 Screen66 Tag：`#F4EFE6`、`#FBE4DE`、`#E8F5F3 + #4DB6AC`。
- `mobile/src/mvp/LumiiMvpApp.tsx`
  - 新增多宠、个人资料、备忘编辑、体重编辑相关表单、Sheet、危险确认和趋势卡样式。
  - Screen81-101 二次收敛：多宠管理 hero 增加源码同款底部分割健康提示，体重历史从时间线改为独立圆角记录卡，个人资料/备忘编辑表单去掉多余外层卡片，宠物档案详情字段改为源码式右值列对齐以解决贴边/不齐。
  - Screen1-19 主链路二次收敛：登录页改用源码 52px 胶囊短信按钮，手机号输入框/协议行贴近 PhoneInput/Agreement；权限行、上传卡、识别详情卡和生成进度条继续按 Figma Make 源码收敛。2026-06-16 追加：Screen18 保留真实上传预览但按源码重做识别信息字段、左对齐 `#` 标签和 52px CTA；Screen19 补生成图白色内圈、轻微 blur、扫描粒子层、标题/进度/步骤卡间距。
  - Screen10-13 权限链路二次收敛：权限页底部主按钮改为源码 52px 胶囊结构；定位/相册相机/通知拒绝态改为独立标题、横向 denied hero、68px 彩色图标块、红色 X 角标和行内红色系统设置提示。
  - Screen20 生成结果二次收敛：补 Figma Make 的 PageBg 暖色/青色氛围层、AI 形象 halo/ring、原图浮层 chip、AI 灵伴 badge 和 54px 结果页 CTA。
  - Screen20-25 AI 形象结果状态二次收敛：结果页补三候选卡和选中态，新增“不像我家宠物”反馈 Bottom Sheet、重新生成专用确认弹窗，并把保存成功/失败 Toast 改为 Figma 源码的深色成功胶囊与白底错误卡结构。2026-06-16 追加：当前真实 `aiResult` 路由按 Screen21 多候选态收敛，移除混入的 Screen20 原图 chip 和 hero badge，主形象改为 230px；本轮继续补 `AvatarJob.candidateUrls` 契约和单候选分支，无候选数组或仅 1 张结果时走 Screen20 的原图浮层 chip、260px hero、AI 灵伴 badge 和底部双 CTA，当前 mock 仍返回 3 候选保持主链路不变。
  - Screen26 电子宠物首页二次收敛：补宠物舞台 halo/ring、浮层聊天提示、在线徽标、健康分圆环和 2x2 快捷卡间距，使首页更接近 Figma Make 源码；2026-06-16 追加标题 `☀️` 与源码式纯文字聊天提示气泡。
  - Screen27/28 AI 对话页二次收敛：改为固定底部输入结构、横向快捷话题、头像在线点、安全提示和点状 typing 气泡，减少自写流程感；异常态补“连接中断”头部、灰色头像/状态点与红色错误 banner。
  - Screen29 健康首页二次收敛：改回 Figma Make 总览页结构，补顶部右侧新增入口、健康分渐变 Hero、体重趋势小图、三条入口卡和近期记录样式。
  - Screen97-101 体重链路二次收敛：主页面改为趋势卡 + 健康提示 + 历史记录结构，新增/编辑统一走 Screen99 风格 Bottom Sheet，补 Screen101 空状态插画与 CTA。
  - Screen32/78 疫苗链路二次收敛：疫苗计划页改为源码同款暖橙 Hero、双胶囊操作、计划列表卡和状态 Tag，并补逾期/临近提醒卡。
  - Screen33/92-96 健康备忘链路二次收敛：拆出独立新增备忘页，列表页补 Screen96 空状态，编辑页补日期/分类双行元信息卡、居中删除入口，并让保存成功停留在编辑页展示 Toast。
  - Screen54/55 我的与宠物档案二次收敛：我的页菜单行支持 Figma 源码的不同图标底色、通知红色徽标和末行无分割线；本轮进一步修正 Screen54 标题 26px、菜单 28px 图标块、15px 常规字重标题、宠物性别/品种 badge、fallback 标签，并将我的页改为 route 级 edge-to-edge 容器，避免通用 Screen padding 在真机叠加；2026-06-16 根据真机反馈继续补 `flexGrow/minWidth`，并将用户卡/当前宠物卡/菜单组三块横向留白从 16px 调整为 12px，以减少安卓真机上卡片被视觉收窄的问题；宠物档案详情改为源码同款全宽照片 Hero、基础信息右值列和健康区双入口。
  - Screen36 发现筛选无结果二次收敛：从通用 EmptyState 改为 Figma Make 源码式筛选摘要条、搜索插画层、`0 位` badge、说明文案和双 CTA；刷新/清除筛选/查看全部逻辑保持原业务实现。
  - Screen45 地图首页二次收敛：地图右侧控制按钮改为 Figma 源码的 40x40/14px 圆角并下移到地图中段，底部地点 sheet 恢复 20px 横向 padding，地点列表改为 78px 图片卡、评分角标、距离 pill 与分类/地址信息组合；定位、刷新、高德地图真实逻辑保持不变。
  - Screen48 地点详情二次收敛：地点详情 Hero 接入 Figma 源码同款地点照片映射和暗色渐变遮罩，官方认证、评分距离、地址时间电话、最新点评与底部写点评/导航操作区按源码结构重排；收藏、分享、导航、点评入口仍走原业务逻辑。
  - Screen86-91 编辑个人资料状态二次收敛：默认表单轻校到 16px 栅格；头像上传中补暗层 loading、`62%` 进度和暖色提示卡；昵称为空时输入框立即红框；保存中补顶部白色 loading puff 和内容 0.88 透明度；保存成功/失败继续沿用既有 Toast 与本地暂存卡逻辑。
  - Screen92-95 健康备忘编辑状态二次收敛：编辑页标题/内容为空时输入框立即红框；保存中补顶部白色 loading puff 与内容 0.88 透明度；保存成功 Toast 补宠物名副文案；删除备忘从通用 ConfirmDialog 改为 Screen95 专用居中危险弹窗，接口逻辑保持不变。
  - Screen2/3/7/8 登录与验证码错误态二次收敛：手机号格式错误和 OTP 错误/过期统一补 Figma 源码 InlineError 行（14px AlertCircle + 13px 红色文案）；未勾选协议补红色 checkbox 描边与红色协议文案，短信/验证码真实逻辑保持不变。
  - Screen10-13 权限链路二次收敛：权限行改为 Figma 源码同款 44px 图标块、15px/500 标题、12.5px 描述、轻量“已开启/授权中”状态；默认弱操作改回“稍后再说”，拒绝态继续保留真实系统设置/重新授权逻辑。
  - Screen14/15 新用户建档二次收敛：未添加宠物首页空态拆出独立 Screen14 视觉（200px 插画、130px Mascot、底部 52px CTA），不再误用多宠管理空态；宠物基础信息新增流程改用 Screen15 的 52px 表单输入和 52px 主按钮，同时保留 MVP 生日/性别字段。
  - Screen58/59 设置与账号安全二次收敛：设置页不再复用我的页菜单行，改为 Figma 源码同款 Section/Row/Toggle，隐私项补 44x26 Toggle 与副文案，退出登录恢复红色危险行；账号安全页统一同款白底分组，登录保护补源码式 Toggle。
  - Screen60 安全中心二次收敛：安全中心补暖色 Hero、四张动作卡和审核说明卡，入口暂不提交举报/拉黑 mock 操作。
  - Screen57/81-84 宠物资料与多宠状态二次收敛：编辑宠物资料从建档表单拆成源码同款头像区+资料列表+底部操作；多宠列表补 Screen81 的当前灵伴 Sparkles badge、宠物品种 badge、健康状态小胶囊和已选中按钮图标；未添加宠物/多宠空态复用 Screen82 的暖色 paw 插画；切换中补 Screen83 白底 loading puff，切换成功文案对齐 Screen84。
  - Screen75-80 健康日历首轮接入：新增 `healthCalendar` route，复用 `/health/calendar` 聚合数据，按 Figma 源码补宠物 mini card、月份切换、7 列日历、三色事件点、选中日期事件/空状态、逾期/临近提醒卡、加载骨架和读取失败页。
  - Screen37/46/47/91 状态页二次收敛：发现页定位/附近可见异常改为模糊预览 + 授权 CTA 面板；地图搜索/筛选改为暗色 veil + 结果 Sheet；地图定位失败从单 banner 补为 Screen47 完整中心空态和底部双 CTA；个人资料保存失败补本地暂存提示卡和重试入口。
  - Screen62/85/100 危险确认态二次收敛：退出登录改为 Screen62 底部 Sheet，删除宠物改为 Screen85 带宠物预览与暖黄提示卡的底部 Sheet，删除体重记录改为 Screen100 居中危险弹窗；三处不再复用泛化 `ConfirmDialog`。
  - Screen69 TabBar 二次收敛：底部导航从自写半透明胶囊改为 Figma 源码白底 18px 圆角描边卡，选中态仅保留橙色图标/文字和 600 字重，地图入口改为定位针图标，消息入口接入未读红点。
  - Screen65 Input 二次收敛：`Field` 补齐 Figma 源码 5 态中的已填、错误、禁用能力，保留 46px 高/12px 圆角/1.5px 边框，新增已填绿色 check、错误图标与 11px 错误文案。
  - Screen73 Loading/Skeleton 二次收敛：`LoadingState` 改为 32px 橙色 loading、12px 常规字重文案和中文省略号；`SkeletonCard` 补 12px 纵向 gap，避免骨架线贴得过紧。
  - Screen9 登录成功 loading 二次收敛：验证码验证成功后不再只在 OTP 页叠小浮层，改为独立 `renderLoginSuccessLoading` 全屏状态，复用 120px 灵伴头像、`ActivityIndicator + 登录中...`、两行唤醒说明和 3 点进度结构。
  - Screen16/17 上传链路二次收敛：相册/拍照、重新选择/重新拍照改为 Figma 源码 `GhostButton/SolidButton` 同款 52px 胶囊双按钮，带相机图标与 loading 文案；Screen17 是独立上传失败页，不再作为通用 `ErrorState` 待迁移项。
  - Screen90 个人资料保存成功二次收敛：保存成功后停留在编辑页展示 surface Toast，头像区覆盖青绿色成功勾选层，输入再次变化或重选头像会清除成功态。
  - Screen53 高德导航确认二次收敛：地点详情页不再复用普通 `ConfirmDialog`，改为专用导航确认弹窗，补绿色导航图标、地点摘要卡、地图应用选择和 48px 取消/打开导航按钮。
  - Screen50/51 地点与点评提交结果态二次收敛：新增独立 `renderPlaceSubmitResult`，成功页展示等待审核图标、三步进度和返回/继续操作，失败页展示红色警示、草稿卡、保存草稿/重新提交操作。
  - Screen49 新增地点/点评表单二次收敛：`renderAddPlaceReview` 改为 Figma Make 源码式结构，补顶部发布栏、地点摘要卡、5 星评分、特色 chip、体验 textarea、照片占位、审核提示，并让地点详情写点评入口进入完整点评页。
  - Screen52 收藏/取消收藏 Toast 二次收敛：`Toast` 补 `icon/iconTone/placement` 能力，收藏成功使用顶部 dark Bookmark + 橙色图标块 + 管理 action，取消收藏使用底部 surface Heart + 灰底图标块 + 撤销 action；收藏接口和乐观更新逻辑不变。
  - Screen70 Card 基础组件二次收敛：`Card` 默认样式改为白底 14px 圆角轻描边，移除旧的大圆角阴影基底，并新增 `pet/place/message` 变体，供后续页面逐屏替换自写卡片。
  - Screen73 Loading/Skeleton 基础组件二次收敛：`LoadingState` 默认文案改为灵伴场景化文案，`SkeletonLine` 改为 Figma 暖灰渐变基底并支持自定义圆角，新增 `SkeletonCard`，包含 52px 圆形头像、双行文本骨架和 100/85/70% 内容骨架；健康日历日历格/事件列表骨架已率先迁到统一组件。
  - `PetAvatar` 远程图加载态二次收敛：AI 结果页、首页和宠物资料里的远程头像加载时改为圆形 `SkeletonLine` + 小 spinner，避免慢网下只看到白色空框。
  - Screen34 发布今日小事二次收敛：`renderDailyPost` 从旧的简单记录卡改为 Figma 源码结构，补宠物 chip、正文卡、照片 strip、心情/tag chips、AI 润色卡、顶部发布入口和 56px 底部胶囊工具条；图片上传按钮暂以 toast 标记后续接入。
  - Screen35 社交发现页二次收敛：`renderDiscover` 卡片改为源码式 92px 圆角宠物照片、主人头像叠层、距离 pill、底部“打个招呼/约遛”双按钮，并把顶部动作收敛为搜索与筛选；原有下拉刷新、筛选和真实附近数据逻辑保留。
  - Screen39 约遛邀请二次收敛：`renderWalkInvite` 改为源码式宠物头像叠层配对卡、日期三选一、时间输入行、地点图片卡、留言卡、安全提示和底部双按钮；草稿/发送 loading 与原业务逻辑保留。
  - Screen40 招呼请求二次收敛：`renderGreetingRequests` 改为源码式顶部摘要条、宠物照片/主人头像叠层请求卡、忽略/举报/同意&聊天三按钮和底部安全提示；接受/忽略仍接真实接口，举报暂保留 toast 占位。
  - Screen41 消息列表二次收敛：`renderMessages` 顶部动作改回搜索+通知，真实刷新迁到下拉刷新；招呼请求入口补源码渐变卡，AI 会话补橙色头像描边，约遛会话补橙色 `[邀请]` 前缀。
  - Screen42/43 聊天详情二次收敛：`renderConversation` 取消额外系统空白头部，改为源码式自定义聊天头部、安全提示条、消息独立滚动、底部附件 chip 与输入 dock；约遛消息识别为图片邀请卡，发送失败态继续保留网络 banner 和重试/删除卡。
  - 业务 Toast 触发分型二次收敛：上传权限/打开失败、照片不适合生成、启动生成失败、AI 对话发送失败、普通聊天发送失败、今日小事发布成功/失败已按 Screen66/90/91 分型补齐 `success/warning/error`、副文案和重试提示，不改变原接口和重试卡逻辑。

## 后续注意

- 新页面必须优先找 Figma Make 源码里的同类组件，不再临时手写另一套视觉。
- 若源码导出中文乱码，不直接复制文案；只抽取布局、颜色、间距和状态结构，再用项目中文文案重建。
- 富消息长按菜单仍未有本轮可用设计，继续按缺失清单等待 Figma Make。
