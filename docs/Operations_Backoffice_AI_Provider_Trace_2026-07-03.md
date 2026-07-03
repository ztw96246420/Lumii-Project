# AI 供应商调用轨迹

日期：2026-07-03

## 目标

让运营后台能解释灵伴形象生成为什么卡住、失败、变慢或成本异常。新建任务和后续刷新任务状态时，后端会沉淀供应商调用摘要，后台 AI 灵伴页可直接查看。

## 已实现

- gpt-image2 灵伴形象生成：
  - 提交任务 `POST /v1/images/generations`。
  - 查询任务 `GET /v1/tasks/{taskId}`。
- TTAPI Flux / Midjourney 历史备用链路：
  - 提交任务。
  - 查询任务。
  - Midjourney upsample 动作。
- Doubao Seedance 灵伴动效：
  - 提交视频任务。
  - 查询视频任务。
- 后台 `GET /admin/ai/avatar-jobs` 返回每个任务的：
  - `providerTraceCount`
  - `providerTraceLatest`
  - `providerCost`
  - `slaTimeline`
  - 最近 8 条脱敏 `providerTrace`
- AI 灵伴页新增“调用轨迹”列；供应商明细新增 trace 统计。
- AI 用量页 summary 新增 trace 覆盖率和 trace 成本快照。
- AI 灵伴任务 CSV 导出新增供应商任务 ID、调用轨迹数、最近调用阶段/状态/时间、Prompt 版本和成本快照。

## 脱敏规则

不会保存或展示：

- API Key。
- Authorization header。
- base64 原图。
- 完整图片 URL。
- 完整 prompt 原文。

会保存：

- endpoint、method、provider、stage。
- 调用耗时。
- 供应商状态和任务 ID。
- prompt 长度、行数和 hash。
- 图片输入数量和输入类型。
- 返回状态、错误摘要、是否有结果图/视频。
- cost、credits、quota 等供应商返回的成本快照。

## 移动端联动

移动端不直接读取 trace。trace 用于后台排查移动端体验问题：

- loading 卡住。
- 生成失败。
- 视频/图片生成质量或耗时异常。
- 成本或 credits 突增。

后台刷新任务状态后，任务本身的 `status/progress/resultUrl/errorMessage` 仍会影响移动端轮询结果。

## 当前边界

- 历史任务没有调用轨迹，只有新任务和后续刷新动作会写入。
- trace 不是上游完整原始报文，而是脱敏摘要；如需完整原始报文，需要单独设计更严格的加密存储、留存周期和访问审批。
- queued/running/completed 等细粒度 SLA 节点依赖上游返回；当前先记录 submit/status/action 调用耗时。

## 验证

```bash
node scripts/smoke-ai-provider-trace.cjs
```

该脚本启动本地 fake gpt-image2 服务，走真实上传、生成、刷新和后台查询流程，并确认 trace 不泄露 base64 原图。
