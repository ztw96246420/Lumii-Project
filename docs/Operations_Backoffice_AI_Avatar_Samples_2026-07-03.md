# AI 灵伴样本池
日期：2026-07-03

## 目标

把 AI 灵伴生成中的真实反馈、供应商异常和素材质量问题沉淀为可复盘样本。样本池用于运营判断、提示词优化、供应商排障和后续版本实验，不会自动修改线上 prompt，也不会自动影响移动端展示。

## 已实现

- 后端新增持久化集合 `aiAvatarSamples`。
- 后台 AI 灵伴页新增“AI 样本池”卡片。
- 任务行新增：
  - `提示词样本`：通常用于“不像同一只宠物”、毛色/脸型/表情偏差、风格不满意等反馈。
  - `供应商样本`：通常用于生成失败、卡住、上游状态异常、成本异常或 trace 异常。
- 自动入池：
  - 移动端提交 AI 灵伴生成反馈后，系统自动创建或更新一条 `prompt_quality` 待复盘样本。
  - 供应商提交失败、状态查询连续异常或任务进入超时失败态时，系统自动创建或更新一条 `provider_anomaly` 待复盘样本。
- 样本池支持：
  - 类型筛选：全部、提示词优化、供应商异常、素材质量。
  - 状态筛选：待复盘、已复核、已忽略、全部。
  - 关键词搜索：手机号、宠物名、任务 ID、供应商、反馈内容、标签。
  - 复核完成 / 忽略。
- 数据导出新增 `ai_avatar_samples`。
- 导出字段包含 `autoCreated`、`autoReason` 和 `autoSignalCount`，便于区分系统自动捞出的样本和人工沉淀样本。
- 系统健康 collections 新增 `aiAvatarSamples` 行数。
- 清理用户业务数据时，同步清理该用户关联的 AI 样本。

## 接口

- `GET /admin/ai/avatar-samples`
- `POST /admin/ai/avatar-jobs/{jobId}/samples`
- `POST /admin/ai/avatar-samples/{sampleId}/review`

## 样本状态

- `open`：待复盘，默认状态。
- `reviewed`：已复核，可作为后续 prompt 实验、供应商对账或质量复盘证据。
- `ignored`：已忽略，保留审计和历史，但不进入主要待办。

## 样本字段

样本会保存当前任务的脱敏快照：

- 用户和宠物：`ownerPhone`、`ownerName`、`petId`、`petName`。
- 任务：`jobId`、`jobStatus`、`mediaId`、`resultUrl`。
- 供应商：`provider`、`providerJobId`、`providerStatus`、`providerTraceCount`、`providerCost`。
- 反馈：`feedbackReason`、`feedbackReasonLabel`、`feedbackContent`。
- 运营：`type`、`status`、`note`、`tags`、`reviewNote`、`createdBy`、`reviewedBy`。
- 自动沉淀：`autoCreated`、`autoCreatedAt`、`autoReason`、`autoSignalCount`。

不会保存或导出：

- API Key。
- Authorization header。
- base64 原图。
- 完整 prompt 原文。
- 完整上游原始 request / response。

## 移动端联动边界

- 移动端不直接读取样本池。
- 入样本池、复核、忽略都不会改变用户当前头像、灵伴形象、动效或任务状态。
- 后续如果样本推动 prompt 修改，仍需通过配置中心发布线上 prompt；移动端只受 `/app/config` 和真实生成任务结果影响。

## 后续预留

- Prompt 多版本实验：把样本绑定到 prompt version、实验批次和对照结果。
- 供应商工单闭环：把 provider anomaly 样本导出或汇总为供应商问题单。
- 自动抽样增强：按成本异常、背景异常、视频边缘异常、重复失败码和低满意反馈聚合生成批量复盘队列。
- 样本结论标签：身份不一致、背景不融合、透明通道异常、视频边缘异常、素材过暗、多宠入镜等细分标签。

## 验证

```bash
node --check scripts/lumii-backend.cjs
node --check admin/admin.js
node --check scripts/smoke-ai-avatar-samples.cjs
node scripts/smoke-ai-avatar-samples.cjs
```

烟测会启动临时后端和 fake gpt-image2 provider，覆盖上传、生成、用户反馈、后台入样本池、复核、导出目录和审计日志。
