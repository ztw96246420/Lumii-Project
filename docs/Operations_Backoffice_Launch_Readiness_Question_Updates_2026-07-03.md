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
  - `status` 支持 `open`、`reviewing`、`ready`、`deferred`、`closed`。
  - 可提交 `owner` 作为负责人或决策来源。
  - `reset=true` 会删除人工覆盖记录，恢复动态默认口径。
- `POST /admin/launch/readiness/signoff`
  - 必须提交 `reason`、`releaseVersion`、`conclusion` 和 `note`。
  - `conclusion` 支持 `not_ready`、`conditional`、`ready_for_test`、`ready_for_production`。
  - 签署会保存当前 P0 数、待确认问题数、模块状态和生产风险快照。
  - 存在未关闭 P0 时，后端拒绝签署 `ready_for_production`。
  - `reset=true` 会清空当前签署结论，但保留审计日志。

## 审计

- 更新写入 `adminAuditLogs`，action 为 `launch.readiness.question.update`。
- 重置写入 `adminAuditLogs`，action 为 `launch.readiness.question.reset`。
- 签署写入 `adminAuditLogs`，action 为 `launch.readiness.signoff`。
- 重置签署写入 `adminAuditLogs`，action 为 `launch.readiness.signoff.reset`。
- 审计目标类型为 `launch_readiness_question`，目标 ID 为问题 ID。

## 页面联动

- 上线台账页面的“上线前必须确认”表格新增“决策记录”和“操作”列。
- “更新”会记录状态、负责人、备注和原因。
- “重置”会清空人工记录，让问题恢复系统动态计算状态。
- “上线结论签署”卡片会展示签署版本、结论、说明、签署快照和快照是否已被当前台账变化打旧。
- 人工决策只影响上线台账展示和汇总计数，不直接改变移动端业务行为；真正影响移动端的配置仍必须通过配置中心发布。

## 验收

- `scripts/smoke-launch-readiness-question-update.cjs`
  - 读取默认上线台账。
  - 更新 `q-domain` 为已确认。
  - 再次读取能看到人工决策备注、负责人和更新时间。
  - 审计日志存在 `launch.readiness.question.update`。
  - 将问题更新为 `closed` 后，待确认问题数不再计入该问题，并返回关闭人和关闭时间。
  - 存在未关闭 P0 时，签署 `ready_for_production` 会返回 409。
  - 签署 `ready_for_test` 会保存版本、结论、说明和当前快照。
  - 审计日志存在 `launch.readiness.signoff`。
  - 重置签署后返回未签署状态。
  - 重置后恢复默认状态。
  - 审计日志存在 `launch.readiness.question.reset`。

## 2026-07-10 首发决策固化

以下三项已由当前首发范围直接确定，不再作为待澄清问题：

- 后台入口：首发沿用 `https://api.lumiiapp.cn/admin`，共用已验证的 HTTPS 证书与 Nginx；以强密码、TOTP MFA 和 IP 白名单控制访问，后续如需再拆分独立运维域名。
- 用户数据清理：入口只保留在后台；必须具备 `data.clear` 权限并完成高风险双人会签，执行结果进入独立审计链，移动端不开放该能力。
- 地点贡献奖励：首发只展示积分、轻量等级、我的排名和匿名排行榜，不承诺现金、实物或兑换权益；未来活动另行配置规则。

`scripts/smoke-launch-readiness-question-update.cjs` 会验证三项默认状态均为 `ready`，同时保留人工覆盖、重置和签署回归。
