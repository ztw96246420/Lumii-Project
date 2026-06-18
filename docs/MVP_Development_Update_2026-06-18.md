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

## Pet-scoped business logic pass

- 多宠切换、删除当前宠物、新建宠物后会先清空旧宠物的健康、体重、疫苗、备忘、AI 对话、上传/生成草稿和本地提醒状态，再拉取新当前宠物的数据。
- 切宠完成提示改为等待宠物维度数据刷新后再出现；如果刷新部分失败，会提示“部分数据稍后刷新”，避免用户误以为旧数据就是新宠物数据。
- `refreshPetScopedData` 已纳入灵伴对话历史刷新；切宠后再进入对话页不应短暂显示上一只宠物的聊天记录。
- 猫狗 MVP 健康模板补齐：狗默认 `犬四联/犬六联`、`狂犬疫苗`、`体内驱虫`、`体外驱虫`；猫默认 `猫三联`、`狂犬疫苗`、`体内驱虫`、`体外驱虫`。
- 测试后端会在读取疫苗计划时为老账号自动补齐缺失模板；mock API 也同步模板，避免本地预览和云端行为不一致。
- 本地 smoke test 已通过：狗/猫各返回 4 条基础模板；狗的体重记录不会泄漏到猫；切回狗后狗的体重记录仍存在。

## Avatar upload hardening

- 主人头像和宠物普通头像选图时，App 会校验图片类型、大小和 base64 上传内容；不再允许“本地能预览但无法上传”的头像进入保存流程。
- 支持头像格式：JPG、PNG、WebP、HEIC/HEIF；单图上限 9MB。
- 后端拒绝单独持久化 `file://`、`content://`、`ph://`、`assets-library://`、`data:` 等本机临时地址；如果没有对应 base64 上传内容，返回 400。
- 如果 COS 上传服务暂不可用，后端不会把本机临时地址保存成成功头像，而是返回可重试错误。
- 验证：`npm run typecheck`、`node --check scripts/lumii-backend.cjs` 通过。
