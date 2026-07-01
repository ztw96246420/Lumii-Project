# 举报处理结果申诉说明

版本：2026-07-01

## 1. 目标

补齐“举报提交 - 后台处理 - 通知结果 - 用户异议 - 后台复核 - 通知结果”的闭环。

适用对象：

- 举报人：当举报被判定为无效或关闭时，可以对处理结果提出申诉。
- 被举报方：当举报被判定为有效时，可以对处理结果提出申诉。

第一版申诉结果只代表运营对异议的复核结论，不自动恢复内容、不自动撤销处罚、不自动改写原举报状态。需要恢复内容、撤销处罚或补充处理时，由运营继续在对应模块执行。

## 2. 移动端接口

复用安全中心申诉读取入口：

- `GET /sanction-appeals`

返回：

- `appeals`：账号限制申诉和举报处理申诉的统一记录。
- `reportAppealTargets`：当前用户可申诉的举报处理结果。

提交举报处理申诉：

- `POST /report-appeals`

请求字段：

- `reportId`：举报 ID。
- `content`：申诉说明，8-1000 字。

移动端展示：

- 安全中心新增“举报处理申诉”卡片。
- 用户可从可申诉的举报结果中选择一条，填写说明后提交。
- 举报处理结果通知携带 `reportId`，点击通知会跳转到安全中心并选中对应申诉目标。

受限账号规则：

- 冻结/封禁用户仍允许读取 `/sanction-appeals` 和提交 `/report-appeals`。
- 维护模式下也允许提交举报申诉，避免用户没有争议处理入口。

## 3. 后台处理

后台仍使用左侧一级菜单“申诉中心”：

- `GET /admin/sanction-appeals?type=report`
- `POST /admin/sanction-appeals/{appealId}/review`
- `POST /admin/sanction-appeals/{appealId}/approve`
- `POST /admin/sanction-appeals/{appealId}/reject`

页面能力：

- 按状态筛选：未关闭、待处理、处理中、已通过、未通过、全部。
- 按类型筛选：全部、账号限制、举报处理。
- 搜索手机号、申诉内容、举报 ID、举报对象、原处理原因。
- 举报处理申诉卡片展示申诉人、角色、举报对象、举报 ID、原处理结果和处理说明。

通过/驳回后：

- 写入 `reviewReason`、`reviewedAt`、`handledBy`。
- 向申诉人写入 App 通知中心，`actionRoute=safety`。
- 原举报记录写入最近申诉状态快照：`lastAppealStatus`、`lastAppealReviewedAt`。
- 不自动改变原举报状态。

## 4. 审计

举报处理申诉写入以下审计动作：

- `report.appeal.review`
- `report.appeal.approve`
- `report.appeal.reject`

审计对象：

- `targetType=report_appeal`
- `targetId=appealId`

账号限制申诉仍使用原动作：

- `sanction.appeal.review`
- `sanction.appeal.approve`
- `sanction.appeal.reject`

## 5. 回归

新增 smoke：

- `node scripts/smoke-report-appeals.cjs`

覆盖：

- 举报人对无效举报结果申诉。
- 被举报方对有效举报结果申诉。
- 重复提交同一开放申诉返回原记录。
- 后台按 `type=report` 查询。
- 后台通过/驳回举报申诉。
- 移动端通知中心收到申诉处理结果并携带 `reportId`。
- 用户时间线出现 `report_appeal`。
- 审计日志记录 `report.appeal.approve` 和 `report.appeal.reject`。

## 6. 当前限制

- 第一版不自动恢复动态、评论、地点点评或私信消息。
- 第一版不自动撤销由举报建议创建的处罚。
- 第一版不做多管理员复核或双人审批。
- 后续如要把“申诉通过”联动到恢复内容/撤销处罚，需要在对应内容模块加明确的二次确认和 before/after 审计。
