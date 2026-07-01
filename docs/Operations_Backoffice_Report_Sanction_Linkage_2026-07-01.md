# 运营后台举报处罚联动验收说明

日期：2026-07-01

## 1. 目标

举报处理不能停在“有效/无效”的状态标记。对确认为有效的举报，后台需要给运营一个可复核、可审计、可影响移动端的作者治理动作。

当前实现采用“建议处罚 + 人工确认”的方式：

- 系统不自动处罚，避免误杀。
- 有效举报自动生成处罚建议。
- admin 在举报中心点击“按建议处罚”后才创建处罚。
- 处罚会关联举报、模板、被举报对象和证据快照。
- 移动端会按处罚类型限制写接口，并保留申诉入口。

## 2. 后端闭环

涉及接口：

- `GET /admin/social/reports`
- `POST /admin/social/reports/{reportId}/resolve`
- `POST /admin/social/reports/{reportId}/sanction`
- `GET /admin/sanctions`
- `GET /sanction-appeals`
- `POST /sanction-appeals`

核心状态：

- 举报 `pending` 时不生成处罚建议。
- 举报处理为 `valid` 后生成 `sanctionSuggestion.status=suggested`。
- 按建议创建处罚后变为 `sanctionSuggestion.status=applied`。
- 同一举报重复创建处罚会被后端拒绝。

处罚建议默认模板：

- 首次有效举报：`report_valid_mute_24h`。
- 已有生效限制时：`repeat_violation_freeze_72h`。
- 内容证据不足但需留痕时：`warning_community_notice`。

## 3. 后台展示

举报中心展示：

- 内容证据快照。
- 处理结果通知状态。
- 处罚建议类型、时长和“按建议处罚”按钮。
- 已处罚后的处罚 ID。

处罚中心展示：

- 处罚来源 `social_report`。
- 原举报 ID。
- 被举报对象 ID 和类型。
- 处罚模板和原因。

审计日志：

- 处理举报写入 `social.report.resolve` 或 `moderation.report.resolve`。
- 按建议处罚写入 `social.report.sanction`。

## 4. 移动端联动

有效举报通知：

- 举报人收到处理结果。
- 被举报作者收到安全中心通知。
- 通知 payload 携带 `reportId`、`targetType`、`targetId`。

处罚后移动端影响：

- `accountStatus` 和 `sanctions` 会出现在 `/me` 账号快照。
- 禁言会限制发布小事、评论、点赞、打招呼、约遛、私信、宠友圈封面、地点投稿、地点点评。
- 冻结/封禁会限制大多数写操作。
- 安全中心保留申诉入口，冻结/封禁后仍允许提交 `/sanction-appeals`。

## 5. 验收

新增 smoke：

```bash
node scripts/smoke-report-sanction-linkage.cjs
```

覆盖内容：

- 两个用户建档并发布/举报宠友圈小事。
- 后台把举报处理为有效。
- 有效举报生成处罚建议并复用同一份证据快照。
- 被举报作者收到带 `targetType` / `targetId` 的处理通知。
- 按建议创建处罚。
- 重复处罚被拒绝。
- 作者 `/me` 显示 `muted`。
- 作者再次发布小事被 `ACCOUNT_MUTED` 拦截。
- 作者仍可提交处罚申诉。
- 后台审计存在 `social.report.sanction`。

## 6. 仍未完成

- 多管理员双人审批。
- 批量处罚审批。
- 处罚建议命中率复盘。
- 自动升级策略。
- 生产级独立证据表和图片证据长期归档。
