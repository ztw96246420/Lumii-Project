# 运营后台地点审核模板说明

日期：2026-06-30

## 1. 目标

地点点评和新增地点都属于先审后发内容。第一版后台已经支持通过/驳回，但如果每次都让运营临时手写原因，会出现三个问题：

- 对用户解释不一致。
- 审计记录难以按原因归类。
- 新人运营处理地点内容时缺少判断锚点。

本次落地的是“内置审核原因模板”：运营在通过或驳回地点点评、新增地点时，可以先套用模板，再二次编辑最终原因。最终原因会写入审核记录、App 通知中心和审计日志。

## 2. 覆盖对象

### 地点点评

对象：`placeReviews`

状态：

- `pending_review`
- `approved`
- `rejected`

动作：

- 点评通过。
- 点评驳回。

### 新增地点

对象：`placeSubmissions`

状态：

- `pending_review`
- `approved`
- `rejected`

动作：

- 新增地点通过。
- 新增地点驳回。

新增地点通过后仍沿用现有逻辑：创建 `manual` 来源地点，`petFriendlyStatus` 为 `candidate`。

## 3. 内置模板

### 点评通过

- `place_review_approve_relevant`
- 标题：点评内容有效
- 原因：感谢分享，点评内容完整且与地点体验相关，已通过审核。

### 点评驳回

- `place_review_reject_irrelevant`
- 标题：内容与地点无关
- 原因：点评内容与该地点体验关联不足，请补充更具体的到店体验后再提交。

- `place_review_reject_unclear`
- 标题：体验信息不足
- 原因：点评信息不够清晰，暂无法确认真实体验，请补充宠物友好设施、服务或到店细节后再提交。

- `place_review_reject_unsafe`
- 标题：内容不适合公开
- 原因：点评内容包含不适合公开展示的信息，请修改后重新提交。

### 新增地点通过

- `place_submission_approve_complete`
- 标题：新增地点信息完整
- 原因：感谢补充宠物友好地点，名称、地址和体验描述清晰，已通过审核。

### 新增地点驳回

- `place_submission_reject_incomplete`
- 标题：地点信息不完整
- 原因：地点名称或地址信息不够完整，暂无法确认地点，请补充准确名称和地址后再提交。

- `place_submission_reject_duplicate`
- 标题：疑似重复地点
- 原因：该地点疑似已存在于地图中，暂不重复创建。如信息有误，可在已有地点下补充点评。

- `place_submission_reject_not_pet_friendly`
- 标题：宠物友好信息不足
- 原因：暂未发现该地点具备明确宠物友好特征，建议补充宠物可进入区域、规则或现场照片后再提交。

## 4. 后端接口

### 获取模板

`GET /admin/places/moderation-templates`

返回字段：

- `id`
- `kind`：`review` / `submission`
- `action`：`approve` / `reject`
- `title`
- `reason`

### 点评审核

`POST /admin/places/reviews/{reviewId}/approve`

`POST /admin/places/reviews/{reviewId}/reject`

请求体：

```json
{
  "templateId": "place_review_reject_irrelevant",
  "reason": "最终展示给用户和写入审计的审核原因"
}
```

规则：

- `templateId` 可选。
- `reason` 可选；如果未传且传了合法模板，则使用模板默认原因。
- 如果 `templateId` 不存在，返回 `ADMIN_PLACE_REVIEW_REASON_INVALID`。
- 如果模板类型或动作不匹配当前操作，返回 `ADMIN_PLACE_REVIEW_REASON_INVALID`。
- 最终 `reason` 最长保留 240 字。

### 新增地点审核

`POST /admin/places/submissions/{submissionId}/approve`

`POST /admin/places/submissions/{submissionId}/reject`

请求体：

```json
{
  "templateId": "place_submission_reject_duplicate",
  "reason": "最终展示给用户和写入审计的审核原因"
}
```

规则：

- `templateId` 可选。
- `reason` 可选；如果未传且传了合法模板，则使用模板默认原因。
- 如果 `templateId` 不存在，返回 `ADMIN_PLACE_SUBMISSION_REASON_INVALID`。
- 如果模板类型或动作不匹配当前操作，返回 `ADMIN_PLACE_SUBMISSION_REASON_INVALID`。
- 最终 `reason` 最长保留 240 字。

## 5. 数据写入

审核完成后，地点点评和新增地点记录会写入：

- `reviewReason`：最终审核原因。
- `reviewTemplateId`：套用的模板 ID，未套用则为空。
- `reviewTemplateLabel`：套用的模板标题，未套用则为空。
- `reviewedAt`：审核时间。
- `reviewedBy`：审核管理员。

后台数据导出新增字段：

- `审核模板ID`
- `审核模板`

覆盖导出：

- `place_reviews.csv`
- `place_submissions.csv`

## 6. 后台页面交互

地图地点页面新增“审核原因模板”说明区，展示当前内置模板。

运营点击以下按钮时会进入模板选择：

- 地点点评：通过 / 驳回。
- 新增地点：通过 / 驳回。

同一套模板也适用于内容安全任务池中的地点点评、新增地点审核任务。

交互规则：

1. 弹窗列出当前对象和动作可用的模板。
2. 输入编号则套用模板。
3. 直接输入文字则使用自定义原因。
4. 套用模板后仍弹出确认框，允许编辑最终原因。
5. 提交后刷新地点审核列表、审核任务池、通知和审计缓存。

## 7. 移动端影响

移动端不需要改接口。

已有结果通知仍沿用：

- `place_review`
- `place_submission`

通知文案使用最终 `reviewReason`，不是固定模板原因。因此运营编辑过的原因会同步展示给提交人。

## 8. 当前边界

已落地：

- 内置地点审核模板。
- 模板和动作强校验。
- 最终原因可编辑。
- 审核记录保存模板 ID 和模板标题。
- App 通知中心使用最终原因。
- 审计日志使用最终原因。
- CSV 导出模板字段。

暂未落地：

- 后台自定义模板维护。
- 模板启用/停用、排序、分组。
- 多角色模板权限。
- 重复地点相似度自动判断。
- 新增地点“关联已有地点”动作。
- 地点贡献者、积分或奖励。
- 地点详情编辑和地点合并。
- 地点图片审核。

## 9. 后续建议

第二版可以把模板抽成后台配置资源：

- 支持运营编辑模板标题和原因。
- 支持按 `review/submission`、`approve/reject` 筛选。
- 支持启用、停用和排序。
- 写入模板变更审计。
- 对每个模板统计使用次数、通过率、申诉率。
- 与重复地点候选、内容安全命中原因联动。
