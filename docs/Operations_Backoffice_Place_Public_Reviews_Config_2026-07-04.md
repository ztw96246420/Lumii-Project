# 运营后台：地点公开点评展示策略

日期：2026-07-04

## 背景

地点点评此前已经接入审核、公开展示、举报和隐藏链路：

- 用户发布地点点评后进入 `pending_review`。
- 后台通过后，点评进入 App 地点详情“社区点评”。
- 用户可举报公开点评。
- 运营处理举报后，可隐藏违规地点点评。

缺口是公开点评的展示口径仍是代码固定：后端默认按最新优先返回，移动端详情页固定展示 3 条。运营无法控制是否只展示有图点评，也无法调整首屏条数或排序策略。

## 已实现

### 配置中心

新增“地点公开点评”配置模块：

- `places.publicReviews.sort`
  - `newest`：最新优先，默认值。
  - `oldest`：最早优先。
  - `with_photos_first`：有图优先，同等条件下仍按最新优先。
- `places.publicReviews.requirePhotos`
  - 是否只展示带图片的公开点评。
- `places.publicReviews.apiLimit`
  - 后端 `/places/{id}/reviews` 最多返回条数。
  - 范围：`3-50`。
- `places.publicReviews.detailDisplayLimit`
  - 移动端地点详情首屏展示条数。
  - 范围：`1-12`。
  - 不能大于 `apiLimit`。

配置默认保持旧体验：最新优先、不过滤有图、后端最多返回 20 条、详情页展示 3 条。

### 后端联动

`publicPlaceReviewsForPlace` 现在读取 `currentOpsConfig().places.publicReviews`：

- 强制按配置排序。
- `requirePhotos=true` 时过滤无图点评。
- `apiLimit` 作为后端上限。
- 客户端即使传入 `limit`，也不能超过后台配置上限。

`/app/config` 会下发 `places.publicReviews`，配置中心联动体检已标记为前后端真实联动。

### 移动端联动

地点详情读取 `remoteConfig.places.publicReviews`：

- 按 `detailDisplayLimit` 决定首屏展示几条公开点评。
- 客户端也按 `requirePhotos` 和 `sort` 做兜底过滤/排序，避免缓存数据在配置切换后短暂显示不一致。
- “社区点评”右侧 meta 展示当前口径，例如“最新优先”“有图优先”或“仅有图”。

### 仍然预留

- “查看更多”完整分页 UI 尚未开放。
- 点评排序暂不按评分，因为当前 `PlaceReview` 还没有评分字段。
- 暂不开放用户端筛选控件，第一版由运营统一配置展示口径。

## 回归验证

`scripts/smoke-place-public-reviews.cjs` 已扩展覆盖：

1. 审核通过的地点点评进入公开列表。
2. 默认最新优先。
3. 发布后台配置：只看有图、有图优先、后端最多 5 条、详情页展示 2 条。
4. `/app/config` 下发 `places.publicReviews`。
5. 无图点评在只看有图策略下不再出现在公开列表。
6. 有图点评仍可举报并进入审核任务。
7. 运营隐藏后，点评从其他用户公开列表移除。

## 待确认

- 是否需要移动端“查看更多”页面或底部弹层。
- 是否需要用户自己选择“最新 / 有图 / 只看有图”，还是继续由运营统一控制。
- 如果未来地点点评加入评分字段，是否需要新增“高分优先 / 低分优先 / 推荐优先”。
