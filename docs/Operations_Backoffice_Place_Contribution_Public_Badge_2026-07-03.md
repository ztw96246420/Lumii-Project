# 运营后台：地点贡献公开身份

日期：2026-07-03

## 背景

地点审核流程已经有基础贡献账本：

- 发现新地点：`+10` 贡献分。
- 补充已有地点：`+5` 贡献分。
- 后台地图地点页可查看贡献者、贡献分、贡献来源、状态和关联地点，并支持手动调整或撤销贡献记录。
- 新增地点审核通过或关联已有地点后，移动端通知中心会提示贡献分。

此前贡献分只停留在后台账本和通知提示，没有形成“后台配置影响移动端展示”的闭环。本轮新增公开身份开关，让运营可以决定是否在用户自己的“我的”页展示地点共建者身份。

## 已实现

### 后台配置

配置中心新增“地点贡献身份”模块：

- `places.contributionBadgesEnabled`
  - 控制移动端是否展示地点共建者徽章。
  - 默认关闭，避免未确认激励策略前突然改变用户预期。
- `places.contributionBadgeMinPoints`
  - 控制展示最低贡献分。
  - 取值范围：`1-1000`。

配置发布后会进入配置版本、配置联动体检、草稿、审批、预约发布和回滚体系。

### 后端接口

- `/app/config`
  - 新增返回：
    - `places.contributionBadgesEnabled`
    - `places.contributionBadgeMinPoints`
- `/me`
  - 新增返回 `placeContributionSummary`：
    - `points`
    - `rawPoints`
    - `total`
    - `created`
    - `linkedExisting`
    - `manualAdjustments`
    - `voided`
    - `level`
    - `minPublicPoints`
    - `publicEligible`

等级目前只用于轻量展示，不对应权益：

- `starter`：地点新星，`1` 分起。
- `guide`：社区向导，`20` 分起。
- `expert`：地点达人，`50` 分起。
- `guardian`：城市守护者，`100` 分起。

### 移动端

移动端“我的”页读取：

- `remoteConfig.places.contributionBadgesEnabled`
- `remoteConfig.places.contributionBadgeMinPoints`
- `session.account.placeContributionSummary`

同时满足以下条件才展示徽章：

- 地图地点功能未关闭。
- 后台开启地点贡献身份展示。
- 用户已有至少一条地点贡献。
- 用户贡献分达到后台配置的最低展示门槛。

展示内容：

- 地点共建者身份。
- 当前等级。
- 贡献分。
- 通过审核次数。

### 回归验证

`scripts/smoke-place-contributions.cjs` 已扩展：

- 用户提交新增地点。
- 管理员审核通过并记录 `+10`。
- 用户再提交新增地点，管理员关联已有地点并记录 `+5`。
- 验证后台贡献汇总。
- 验证 `/me.placeContributionSummary`。
- 验证后台手动调整贡献分后，`/me.placeContributionSummary` 实时重算。
- 验证后台撤销贡献记录后，已撤销记录不再计入移动端身份。
- 验证 `/app/config` 默认关闭贡献徽章。
- 后台 PATCH 配置打开贡献徽章并设置门槛。
- 验证 `/app/config` 下发新配置。
- 验证 `/me` 的展示门槛和 `publicEligible`。

## 明确不做

本轮不做：

- 全站排行榜。
- 他人主页公开贡献分。
- 贡献分兑换。
- 现金、余额、提现或虚拟资产映射。
- 活动奖励自动发放。

原因：贡献分当前是运营账本，贸然做奖励会引入财务、风控、活动规则、反作弊和用户申诉复杂度。

## 关联文档

- `docs/Operations_Backoffice_Place_Contribution_Adjustment_2026-07-04.md`：记录本轮手动调整、撤销、审计和移动端汇总重算规则。

## 待澄清

- 是否需要公开排行榜？如果需要，是全量榜、城市榜、附近榜，还是只做活动榜？
- 贡献分是否只作为荣誉身份，还是接活动奖励？
- 如果接奖励，是否需要反作弊规则，例如同一地点重复提交、恶意刷点、低质量补充等？
- 他人查看用户主页时，是否展示贡献身份？当前只展示给用户本人。
