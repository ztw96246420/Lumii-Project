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
  - `Button` 调整为 Screen64 的 44px 高度、14px 圆角、14px/600 字号；loading 现在显示小转圈 + “处理中...”中文状态，disabled 文案改为浅灰。
  - `Toast` 按 Screen66/90/94 改为默认顶部白底浮层：top 70、14px 圆角、26px 状态图标块、轻阴影；`dark` 仅保留为兼容变体。
  - `ConfirmDialog` 按 Screen67 补齐 48px 状态图标块、居中标题/描述、普通/危险确认按钮分型；删除、移除、退出、注销类文案自动走危险态。
  - `BottomSheet` 按 Screen68 统一 36x4 handle、白底、顶部 24px 圆角、浅边框和向上阴影。
  - `StatusPill` 字重收敛为 500，更贴近 Screen66 的轻量 Tag。
- `mobile/src/mvp/LumiiMvpApp.tsx`
  - 新增多宠、个人资料、备忘编辑、体重编辑相关表单、Sheet、危险确认和趋势卡样式。
  - Screen81-101 二次收敛：多宠管理 hero 增加源码同款底部分割健康提示，体重历史从时间线改为独立圆角记录卡，个人资料/备忘编辑表单去掉多余外层卡片，宠物档案详情字段改为左对齐以解决贴边/不齐。
  - Screen1-19 主链路二次收敛：登录页改用源码 52px 胶囊短信按钮，手机号输入框/协议行贴近 PhoneInput/Agreement；权限行、上传卡、识别详情卡和生成进度条继续按 Figma Make 源码收敛。
  - Screen20 生成结果二次收敛：补 Figma Make 的 PageBg 暖色/青色氛围层、AI 形象 halo/ring、原图浮层 chip、AI 灵伴 badge 和 54px 结果页 CTA。
  - Screen26 电子宠物首页二次收敛：补宠物舞台 halo/ring、浮层聊天提示、在线徽标、健康分圆环和 2x2 快捷卡间距，使首页更接近 Figma Make 源码。
  - Screen27 AI 对话页二次收敛：改为固定底部输入结构、横向快捷话题、头像在线点、安全提示和点状 typing 气泡，减少自写流程感。
  - Screen29 健康首页二次收敛：改回 Figma Make 总览页结构，补顶部右侧新增入口、健康分渐变 Hero、体重趋势小图、三条入口卡和近期记录样式。
  - Screen97-101 体重链路二次收敛：主页面改为趋势卡 + 健康提示 + 历史记录结构，新增/编辑统一走 Screen99 风格 Bottom Sheet，补 Screen101 空状态插画与 CTA。

## 后续注意

- 新页面必须优先找 Figma Make 源码里的同类组件，不再临时手写另一套视觉。
- 若源码导出中文乱码，不直接复制文案；只抽取布局、颜色、间距和状态结构，再用项目中文文案重建。
- 打招呼 Bottom Sheet、筛选 Bottom Sheet、富消息长按菜单仍未有本轮可用设计，继续按缺失清单等待 Figma Make。
