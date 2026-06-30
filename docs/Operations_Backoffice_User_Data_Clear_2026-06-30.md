# 运营后台用户业务数据清理说明

版本：2026-06-30

## 1. 目标

把测试阶段反复需要 SSH 手工清理用户数据的动作，迁移到运营后台中，并保证：

- 操作前能看到清理预览。
- 操作时必须填写原因。
- 操作时必须再次输入完整手机号确认。
- 操作后移动端真实受影响，用户重新进入 App 时不再带旧宠物、旧动态、旧 AI 任务和旧通知。
- 后台审计日志保留动作证据。

## 2. 后台入口

页面：用户管理。

入口：用户列表操作列中的“清理业务数据”按钮。

接口：

- `GET /admin/users/{phone}/business-data-summary`
- `POST /admin/users/{phone}/clear-business-data`

执行接口 body：

```json
{
  "confirmation": "目标完整手机号",
  "reason": "清理原因"
}
```

`confirmation` 必须与目标手机号完全一致，否则接口拒绝执行。

## 3. 清理范围

当前版本清理的是用户业务数据，不删除账号壳。

会清理：

- 宠物档案：`users[phone].pets`、`activePetId`
- 附近状态：`location`、`lastSeenAt`
- 地点收藏：`favoritePlaceIds`
- 宠物日历：`health.weights`、`health.vaccines`、`health.memos`、`health.vaccineReminders`
- AI 灵伴：`mediaUploads`、`avatarJobs`、`petAvatarDailyUsage`
- AI 对话：`petChatMessages`、`petChatDailyUsage`
- 宠友圈：`socialMoments`
- 宠友圈互动：`socialLikes`、`socialComments`、`socialReports`
- 社交关系：`socialBlocks`、`greetings`、`invites`
- 会话：`conversations`、`conversationMessages`
- 用户通知：`notifications[phone]`
- 其他用户侧与该用户相关的通知：例如该用户发起的招呼、约遛、点赞、评论、小事相关通知
- 推送设备：`pushDevices[phone]`
- 地点内容：`placeReviews[phone]`、`placeSubmissions[phone]`
- 反馈和工单：`feedback`、`supportTickets`
- 内容安全沉淀：与该用户内容相关的 `moderationSamples` 和 `moderationTaskMeta`

## 4. 保留范围

当前版本保留：

- 账号本身：`users[phone]`
- 手机号
- 主人昵称、头像、简介
- 权限状态：定位、相册、通知
- 用户设置：附近可见、消息开关、推送开关等
- 短信登录记录和刷新 token 记录
- 后台审计日志
- 后台配置
- 系统通知批次记录
- 用户处罚和申诉记录

保留处罚和申诉的原因：这些属于账号风控证据，不应被普通测试清理动作顺手抹掉。如果后续需要“测试账号完全重置”，应增加更高危的独立入口，并要求更强确认或双人审批。

## 5. 移动端影响

清理后：

- `/me` 返回的 `activePet` 为 `null`。
- `/pets` 返回空列表。
- 宠物日历、AI 灵伴、AI 对话、宠友圈、关系消息、地点提交、反馈进度等接口不再返回该用户旧业务数据。
- 用户重新打开 App 后，应进入无宠物/重新建档相关流程，而不是继续看到旧宠物或旧首页业务状态。

## 6. 审计

执行清理会写入 `adminAuditLogs`：

- `action`: `user.clear_business_data`
- `targetType`: `user`
- `targetId`: 目标手机号
- `reason`: 管理员填写的原因
- `before`: 清理前摘要和用户概览
- `after`: 清理后摘要和用户概览

审计日志只保留摘要，不把被清理的正文、聊天内容、图片 base64、附件二进制写进审计。

## 7. 待澄清

1. 是否需要增加“完全重置测试账号”入口，连昵称、头像、权限、设置、处罚、申诉也一起清理？
2. 是否需要全站业务数据清理入口，用于每轮真机测试前重置所有普通用户？
3. 全站清理是否需要只允许服务器本机或白名单 IP 使用？
4. 处罚和申诉是否应允许被测试重置清理，还是必须永久保留？
5. 后续正式上线后，该能力是否仅保留在测试环境，生产环境隐藏或改成双人审批？
