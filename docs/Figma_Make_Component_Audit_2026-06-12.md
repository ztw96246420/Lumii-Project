# Figma Make Component Audit 2026-06-12

## Source

- 新版源码包：`C:/Users/Administrator/Downloads/Lumii Project - Opus4.7 (2).zip`
- 解压目录：`figma-make-source-opus47-2`
- 本轮重点页面：Screen81-101

## 本轮确认的统一组件语言

- `Button`：主按钮以暖橙 `#FF8A5C` 为主，圆角约 14，48px 左右高度，loading 使用小转圈加中文状态；危险操作使用红色 `#E5573F`。
- `Toast`：顶部浮层，白底、14px 圆角、轻阴影、左侧小色块/图标；不再优先使用黑底系统 Toast。
- `Dialog`：危险确认以白底圆角卡片或底部 Sheet 呈现，背景半透明深色遮罩，按钮分“取消/确认删除”。
- `Bottom Sheet`：底部圆角 24，顶部有短 handle；用于体重编辑、地图样式、后续筛选/打招呼等复杂操作。
- `Field/Input`：白底、14px 圆角、1.5px 边框；focus/错误态用橙色/红色边框，底部有 hint 与字数计数。
- `Tag/Pill`：小圆角标签，橙色用于宠物/主操作状态，青绿色用于健康/成功状态，黄色用于温和异常提醒。
- `Toggle/Switch`：继续保持轻量，不作为页面主要视觉中心。

## 已落地

- `mobile/src/mvp/ui.tsx`
  - `Button` 调整为更接近 Make 的 14px 圆角、48px 高度、loading 视觉。
  - `Toast` 调整为顶部白底浮层。
  - `ConfirmDialog` 调整遮罩、圆角和危险按钮口径。
- `mobile/src/mvp/LumiiMvpApp.tsx`
  - 新增多宠、个人资料、备忘编辑、体重编辑相关表单、Sheet、危险确认和趋势卡样式。

## 后续注意

- 新页面必须优先找 Figma Make 源码里的同类组件，不再临时手写另一套视觉。
- 若源码导出中文乱码，不直接复制文案；只抽取布局、颜色、间距和状态结构，再用项目中文文案重建。
- 打招呼 Bottom Sheet、筛选 Bottom Sheet、富消息长按菜单仍未有本轮可用设计，继续按缺失清单等待 Figma Make。
