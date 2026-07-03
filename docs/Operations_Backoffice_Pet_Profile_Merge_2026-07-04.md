# 运营后台：合并重复宠物档案

日期：2026-07-04

## 目标

给运营后台补齐“同一用户下重复宠物档案合并”能力，避免真实业务数据被分散在两只重复宠物上。该动作不是删除宠物，而是先迁移移动端会读取的业务引用，再移除源宠物档案。

## 后台入口

- 页面：运营后台 `/admin` -> 宠物档案
- 行内操作：`合并`
- 接口：`POST /admin/pets/{sourcePetId}/merge`
- 必填参数：
  - `targetPetId`：合并到的目标宠物 ID
  - `reason`：合并原因
  - `confirmation`：必须等于源宠物 ID，用于高风险确认

## 合并规则

- 只允许同一用户下的宠物档案合并。
- 不支持跨用户合并，不支持争议归属合并。
- 目标宠物保留现有资料。
- 源宠物只补齐目标宠物的空字段，例如头像、封面、生日、品种、性别、物种、体重等。
- 如果源宠物是当前默认宠物，合并后默认宠物切换到目标宠物。
- 合并完成后源宠物从 `users.pets` 移除。

## 引用迁移范围

当前已迁移：

- 宠物日历：体重、疫苗/驱虫、备忘、疫苗提醒、已删除记录恢复索引。
- AI 灵伴任务：`avatarJobs.petId` 会迁移到目标宠物；只有目标宠物继承了源头像或头像 URL 本来一致时，`acceptedPetId` 才继续指向目标宠物，否则会解除已应用状态，避免把目标现有头像误判成 AI 形象。
- 灵伴动效任务：只有目标宠物继承了源头像或动效 URL 本来一致时，`avatarAnimationJobs.petId` 才继续指向目标宠物，否则动效任务会从活动宠物引用中摘除，避免首页播放和目标头像不匹配的视频。
- AI 对话：`petChatMessages` 从 `phone:sourcePetId` 迁移到 `phone:targetPetId`。
- 宠友圈小事：`socialMoments.petId`。
- 通知：`notifications[].petId` 以及常见嵌套 `properties.petId` / `data.petId`。
- 移动端事件：`appEvents.petId` 和常见嵌套属性。
- 媒体上传记录：若存在 `petId` 或 `analysis.petId`，同步迁移。
- 他人会话卡片：若他人会话列表引用该用户，会刷新为目标宠物的名称和头像。

## 移动端影响

合并后移动端下一次刷新会体现：

- `/pets` 不再返回源宠物。
- `/me.activePet` 指向目标宠物。
- 首页宠物卡片读取目标宠物资料和头像。
- 宠物日历读取目标宠物下的合并记录。
- AI 对话读取目标宠物下的合并消息。
- 宠友圈个人主页展示目标宠物信息，并保留合并前的小事。
- 通知中心不再保留源宠物 ID。

## 审计和通知

- 写入 `adminAuditLogs`：
  - `action=pet.profile.merge`
  - `targetType=pet`
  - `targetId=targetPetId`
  - `before` 保存源宠物、目标宠物和用户摘要
  - `after` 保存迁移摘要、移除的源宠物 ID 和目标宠物快照
- 给用户写入系统通知：
  - `kind=system`
  - `actionRoute=profile`
  - `petId=targetPetId`

## 当前边界

- 仍不支持跨用户合并。
- 仍不支持后台直接删除宠物档案。
- 仍不支持双人审批流；当前 admin 权限可操作，后续多角色后台应收敛到 `pet_ops` 高权限。
- 合并不会主动重新生成灵伴动效；如果目标宠物继承或保留了静态形象，动效仍按现有动效链路处理。

## 验证

新增 smoke：

```bash
node scripts/smoke-admin-pet-profile-merge.cjs
```

覆盖：

- 禁止跨用户合并。
- 同一用户内合并成功。
- 源宠物从移动端 `/pets` 消失。
- 默认宠物切换到目标宠物。
- 源宠物 AI 形象迁移到目标宠物。
- 源宠物宠友圈小事迁移到目标宠物主页。
- 源宠物 AI 对话迁移到目标宠物。
- 源宠物体重、疫苗/驱虫、备忘迁移到目标宠物日历。
- AI 任务的 `petId` / `acceptedPetId` 迁移到目标宠物。
- 通知不再保留源宠物 ID，并新增合并通知。
- 后台审计记录 `pet.profile.merge`。
