# 上线台账待澄清问题决策记录

日期：2026-07-03

## 目标

让运营后台不只展示“还需要澄清什么”，也能沉淀每轮业务决策。后台继续动态读取系统健康、配置联动和账号安全状态，同时允许管理员给每个待澄清问题记录人工状态、负责人和备注。

## 后台能力

- `GET /admin/launch/readiness`
  - 返回动态问题列表和人工决策覆盖记录。
- `POST /admin/launch/readiness/questions/{questionId}`
  - 必须提交 `reason`。
  - 更新时必须提交 `note`。
  - `status` 支持 `open`、`reviewing`、`ready`、`deferred`。
  - 可提交 `owner` 作为负责人或决策来源。
  - `reset=true` 会删除人工覆盖记录，恢复动态默认口径。

## 审计

- 更新写入 `adminAuditLogs`，action 为 `launch.readiness.question.update`。
- 重置写入 `adminAuditLogs`，action 为 `launch.readiness.question.reset`。
- 审计目标类型为 `launch_readiness_question`，目标 ID 为问题 ID。

## 页面联动

- 上线台账页面的“上线前必须确认”表格新增“决策记录”和“操作”列。
- “更新”会记录状态、负责人、备注和原因。
- “重置”会清空人工记录，让问题恢复系统动态计算状态。
- 人工决策只影响上线台账展示和汇总计数，不直接改变移动端业务行为；真正影响移动端的配置仍必须通过配置中心发布。

## 验收

- `scripts/smoke-launch-readiness-question-update.cjs`
  - 读取默认上线台账。
  - 更新 `q-domain` 为已确认。
  - 再次读取能看到人工决策备注、负责人和更新时间。
  - 审计日志存在 `launch.readiness.question.update`。
  - 重置后恢复默认状态。
  - 审计日志存在 `launch.readiness.question.reset`。
