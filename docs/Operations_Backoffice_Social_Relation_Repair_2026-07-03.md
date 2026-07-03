# 运营后台：异常招呼/约遛关系修复

日期：2026-07-03

## 背景

关系消息页已经能排查招呼、约遛、会话、通知和拉黑，但此前只能看状态，无法直接处理 pending 卡住、约遛死循环或招呼请求未清理的问题。本次补齐高权限修复入口，让后台动作真实影响移动端关系状态。

## 已实现

- 关系消息页对待处理招呼和约遛新增“修复接受”和“关闭”操作。
- 所有修复动作必须填写原因。
- 后端新增 `POST /admin/social-relations/{relationId}/repair`。
- 修复接受写入 `social.relation.repair.accept` 审计。
- 关闭写入 `social.relation.repair.close` 审计。
- 权限目录新增 `social.relation.repair`。

## 修复接受

适用范围：

- pending / rejected 招呼。
- pending / rejected 约遛。
- 双方未互相拉黑，且双方都有宠物档案。

移动端影响：

- 补齐 accepted 关系。
- 补齐双方 `/conversations` 会话入口。
- 双方会话 `canSendMessage` 变为 true。
- 发送方收到关系恢复通知。
- 待处理招呼请求会从接收方 `/social/greeting-requests` 清理。

## 关闭

适用范围：

- pending 招呼。
- pending 约遛。

移动端影响：

- 招呼状态变为 rejected，并清理接收方待处理招呼请求。
- 约遛状态变为 rejected。
- 约遛接收方不能再通过该 pending 邀请直接回复并自动接受。
- 约遛通知会标记已读。
- 约遛会话补一条系统提示“约遛邀请已关闭”，不改写用户私信正文。

## 边界

- 不允许直接关闭已接受关系；已接受关系需要通过处罚、拉黑或用户安全链路处理。
- 不允许编辑、补发或改写用户私信正文。
- 不提供任意私信全文搜索。
- 双方拉黑时禁止修复关系状态。

## 测试

- `node --check scripts/lumii-backend.cjs`
- `node --check admin/admin.js`
- `node --check scripts/smoke-social-relation-repair.cjs`
- `node scripts/smoke-social-relation-repair.cjs`
- `node scripts/smoke-social-relation-message-context.cjs`
- `node scripts/smoke-social-evidence-detail.cjs`
- `node scripts/smoke-report-sanction-linkage.cjs`
- `node scripts/smoke-social-author-sanction.cjs`

## 后续

- 是否要给“修复接受”增加双人审批，可在生产期高风险权限收口时追加。
- 是否要给用户展示更明确的运营修复文案，当前采用接近正常接受的系统消息，避免造成用户困惑。
