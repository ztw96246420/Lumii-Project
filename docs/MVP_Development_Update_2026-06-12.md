# MVP Development Update 2026-06-12

## 本次进展

- 启动会话恢复补齐真实刷新口：新增 `POST /auth/token/refresh`。
- App 二次打开时会先用本地 token 刷新账号快照，成功后更新本地 session、当前宠物、权限状态和设置。
- token 失效返回 401 时才清除本地登录缓存并回到登录页；普通网络失败会继续使用本地 session 兜底。
- mock API 同步补齐 `refreshSession`，保证本地 mock 和 HTTP 测试后端接口形态一致。
- 当前用户资料接口补齐：新增 `GET /me`、`PATCH /me`，测试后端支持读取手机号、ownerName、当前宠物、权限和设置，并支持更新 `ownerName`。
- App 通用数据加载时会调用 `GET /me`，让“我的页”和地点点评等展示优先使用服务端 `ownerName`，不再只靠手机号或宠物名推断。
- 多宠管理基础接口补齐：新增 `GET /pets/{petId}`、`DELETE /pets/{petId}`，连同已有列表、创建、编辑、设默认，测试后端已具备多宠 CRUD 基础能力。
- 删除当前宠物时，测试后端会自动把剩余第一只设为当前宠物；如果没有剩余宠物，则清空当前宠物。App 暂不暴露删除入口，等待 Figma 危险操作确认设计。
- 文档同步清理：`Figma_Make_Missing_Page_Prompts_2026-06-06.md` 不再把二次登录免验证码列为待开发项；`MVP_Development_Support_Checklist_v0.md` 不再把当前代码里不存在的“MVP 验收入口”误记为待处理。
- 历史设计迁移文档和 Stitch 缺口文档中关于“MVP 验收入口”的描述已统一删除线标记，避免被当作当前现状或待办。

## 验证

- `npm run typecheck` 通过。
- `node --check scripts/lumii-backend.cjs` 通过。
- `git diff --check` 通过，仅提示 Windows 工作区 LF/CRLF 换行转换 warning。
- 临时本地后端验证通过：短信登录 -> 保存权限和设置 -> 刷新 token -> 读回手机号、权限完成状态和设置快照。
  - 刷新返回手机号：`13900008888`。
  - 权限完成状态：`true`。
  - 定位权限读回：`granted`。
  - `nearbyVisible=false` 设置读回成功。
  - 无效 token 返回 401，App 可据此清除本地 session 回登录。
- 临时本地后端验证通过：短信登录 -> `GET /me` -> `PATCH /me` 更新 ownerName -> `POST /auth/token/refresh` 读回更新后的 ownerName。
  - 初始 ownerName：`用户7777`。
  - 更新后 ownerName：`Serena`。
  - token refresh 读回 ownerName：`Serena`。
  - 空昵称更新返回 400 error。
- 临时本地后端验证通过：创建两只宠物 -> 读取单只详情 -> 设置第二只为当前 -> 删除当前宠物 -> 宠物列表回落到剩余宠物。
  - 详情读取：`Cream`。
  - 删除前当前宠物：`Bean`。
  - 删除后剩余数量：1。
  - 删除后剩余宠物：`Cream`。
  - token refresh 读回当前宠物：`Cream`。
  - 读取已删除宠物返回 404 error。

## 未打包

按协作约定，本次只更新代码和文档，不自动打 APK。需要真机包时再单独打包。
