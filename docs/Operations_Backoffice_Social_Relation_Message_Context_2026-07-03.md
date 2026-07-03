# 运营后台：关系消息上下文与违规私信隐藏

日期：2026-07-03

## 背景

关系消息页原本只展示招呼、约遛、会话、拉黑、通知和消息数摘要。运营能判断链路是否存在，但遇到骚扰、客服争议或通知跳转异常时，只能从举报中心处理私信上下文，无法从既有关系行快速核对最近消息。

本次补齐“带原因查看最近私信窗口”和“隐藏违规私信”能力，同时保留隐私边界：不做任意全文检索，不默认展示完整私信正文。

## 已实现

- 后台关系消息页的会话行新增“上下文”操作。
- 点击“上下文”必须填写查看原因。
- 后端接口 `POST /admin/social-relations/{relationId}/message-context` 返回该关系最近 5-50 条消息，默认 20 条。
- 查看动作写入审计日志 `social.relation.message_context.view`。
- 上下文窗口内非系统消息可执行“隐藏”。
- 后端接口 `POST /admin/social-relations/messages/{messageId}/hide` 隐藏对应私信。
- 隐藏动作写入审计日志 `social.relation.message.hide`。
- 隐藏后同步处理双方移动端消息副本。
- 隐藏后重新计算双方 `/conversations` 会话摘要，避免列表继续显示被隐藏文本。

## 移动端联动

- `/conversations/{conversationId}/messages` 会过滤 `hidden/deleted/adminHiddenAt` 私信。
- `/conversations` 的 `lastMessage` 在后台隐藏后重新取最新仍可公开展示的消息。
- 若该会话没有可公开展示的消息，摘要降级为“暂无消息摘要”，未读数清零。
- 私信举报中心原有处理链路复用同一隐藏工具函数，因此举报处理和关系页隐藏的移动端效果一致。

## 权限与审计

权限目录新增：

- `message.view_content`：带原因查看私信上下文。
- `message.moderate`：隐藏违规私信消息。

审计动作：

- `social.relation.message_context.view`
- `social.relation.message.hide`

审计记录包含关系 ID、会话 ID、双方手机号、消息数量、查看或隐藏原因、before/after 快照。

## 隐私边界

- 默认列表仍只展示摘要和脱敏后的风险信息。
- 不支持任意关键词搜索私信全文。
- 不支持打开全量历史私信，只返回当前关系行最近消息窗口。
- 系统消息不能被隐藏。
- 已隐藏或已删除消息不能重复隐藏。

## 测试

- `node --check scripts/lumii-backend.cjs`
- `node --check admin/admin.js`
- `node --check scripts/smoke-social-relation-message-context.cjs`
- `node scripts/smoke-social-relation-message-context.cjs`
- `node scripts/smoke-social-evidence-detail.cjs`
- `node scripts/smoke-report-sanction-linkage.cjs`
- `node scripts/smoke-social-author-sanction.cjs`
- `node scripts/smoke-pet-chat-quality-review.cjs`

## 后续未开放

- 后台直接修复异常招呼/约遛状态。
- 后台直接新增、改写或补发用户私信。
- 隐藏私信后自动创建处罚；当前仍需从举报中心、内容安全任务或用户处罚页人工处理。
- 更细粒度的双人审批或审批单制度，可在生产期高风险权限收口时追加。
