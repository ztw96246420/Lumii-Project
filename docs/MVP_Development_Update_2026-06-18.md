# Lumii MVP Development Update - 2026-06-18

## Tencent COS storage

- 已确认 COS 桶 `lumii-1252262119` 位于 `ap-guangzhou`，读写权限验证通过。
- 本轮先接入 3 类资源：
  - 宠物上传原图：`pet-source/{ownerHash}/{petId}/{mediaId}.{ext}`。
  - 用户最终确认的灵伴形象：`pet-avatar/{ownerHash}/{petId}/avatar-*.{ext}`。
  - 主人头像 / 宠物普通头像：`owner-avatar/...`、`pet-profile-avatar/...`。
- AI 生成候选图暂不落 COS；只有用户点击保存/确认后的最终图才转存 COS。
- COS 桶保持私有；App 展示图片时使用后端稳定代理 URL `/storage/objects/{objectKey}`，避免直接公开桶或依赖短期签名 URL。
- 本地 smoke test 已通过：
  - `POST /media/uploads` 上传宠物原图后，`GET /media/uploads/{mediaId}/file` 可从 COS 读回。
  - `PATCH /me` 保存主人头像可落 COS，并通过代理 URL 读回。
  - `PATCH /pets/{petId}` 保存宠物普通头像可落 COS，并通过代理 URL 读回。
  - `POST /pets/{petId}/avatar` 保存最终灵伴形象可转存 COS，并通过代理 URL 读回。
- smoke test 产生的临时 COS 对象已删除。

## Notes

- COS Secret 仅配置在服务端环境变量，不写入代码和文档。
- 当前图片仍保留后端兼容回退：COS 未配置时不会阻塞本地 mock/开发流程。

## No-new-page logic pass

- 发现页定位失败不再一直转圈或静默失败：定位/接口失败会保留当前页，展示“定位失败”提示、错误原因和“重新定位/刷新附近”入口。
- 发现页刷新状态补齐：下拉刷新、按钮刷新、进入发现页自动刷新、App 回到前台刷新都统一走真实定位和附近列表接口；成功后记录最近刷新时间。
- 约遛邀请补齐结构化地点信息：发送时携带地点名、地址、placeId、经纬度；后端保存 invite 记录，并把地址写入双方会话消息。
- 聊天页约遛卡片已能解析并展示地址行；接收方通知仍归类为 `walk_invite`，优先进入对应会话。
- 本地双账号 smoke test 已通过：A 账号发布定位后可发现 B 账号，发送约遛后双方会话可见，接收方消息包含地点地址，通知类型为 `walk_invite`。
