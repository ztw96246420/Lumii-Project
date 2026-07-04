# 运营后台：灵伴动效任务处置闭环

日期：2026-07-04

## 背景

灵伴静态形象生成成功后，后端会异步创建灵伴动效任务。移动端首页通过 `/ai/pet-avatar/animation/latest` 和 `/ai/pet-avatar/animation/{jobId}` 轮询任务状态。

原链路的问题是：动效任务的 20 分钟超时和上游状态刷新主要依赖移动端继续轮询。如果用户离开首页、杀掉 App 或不再进入该宠物首页，`avatarAnimationJobs` 可能长期停在 `processing`，系统健康页会提示“动效任务可能卡住”，但运营后台没有单独处置入口。

## 本次新增

后台 AI 灵伴页新增「动效任务」表格：

- 展示任务 ID、关联静态形象任务、用户、宠物、provider、进度、上游状态、调用轨迹、宠物档案当前动效状态、错误信息和时间。
- 标记处理中超过 10 分钟未更新的任务为“可能卡住”。
- 支持三个操作：
  - `刷新`：同步上游 Seedance 状态；若任务 ready，会继续触发本地转存/后处理。
  - `重试`：基于当前宠物静态灵伴形象新建动效任务，并把新任务写回宠物档案。
  - `失败`：运营手动结束异常任务，并同步宠物档案 `avatarAnimationStatus=failed`，避免移动端一直显示生成中。

## 后台接口

```http
GET /admin/ai/avatar-animation-jobs
```

返回全部动效任务，按更新时间倒序。

```http
POST /admin/ai/avatar-animation-jobs/{jobId}/refresh
POST /admin/ai/avatar-animation-jobs/{jobId}/retry
POST /admin/ai/avatar-animation-jobs/{jobId}/mark-failed
```

所有写操作都需要管理员登录和 `reason`，并写入 `adminAuditLogs`：

- `ai.avatar_animation.refresh`
- `ai.avatar_animation.retry`
- `ai.avatar_animation.mark-failed`

## 移动端联动

后台操作不是只改后台展示：

- `refresh` 会把最新任务状态同步到宠物档案。
- `retry` 会创建新动效任务，并更新宠物档案的 `avatarAnimationJobId/avatarAnimationStatus/avatarAnimationUrl`。
- `mark-failed` 会清空当前失败任务对应的 `avatarAnimationUrl`，让首页回退到静态灵伴，而不是继续显示动效生成中。

移动端下一次拉取 `/me`、`/pets` 或 `/ai/pet-avatar/animation/latest` 后会读取到新状态。

## 验证

```bash
node scripts/smoke-avatar-animation.cjs
```

该脚本覆盖：

- 用户保存静态灵伴形象后创建 mock 动效任务。
- 后台列表能看到 ready 动效任务。
- 后台标记失败后，移动端 latest 接口返回 failed。
- 后台重试后，移动端 latest 接口返回新的 ready 任务。
- 清理用户业务数据会删除该用户所有动效任务。
