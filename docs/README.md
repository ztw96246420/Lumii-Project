# Lumii / 灵伴 文档索引

维护日期：2026-06-12

## 阅读顺序

1. 产品范围：[PRD_v0.md](./PRD_v0.md)
2. 开发路线：[Development_Roadmap_v0.md](./Development_Roadmap_v0.md)
3. 当前开发记录：[MVP_Development_Update_2026-06-12.md](./MVP_Development_Update_2026-06-12.md)
4. 设计门禁：[Design_Gate_Rule_2026-06-06.md](./Design_Gate_Rule_2026-06-06.md)
5. 缺失设计提示词：[Figma_Make_Missing_Page_Prompts_2026-06-06.md](./Figma_Make_Missing_Page_Prompts_2026-06-06.md)
6. 接口契约：[API_Contract_MVP_v0.md](./API_Contract_MVP_v0.md)
7. 需要用户/后端继续支持的事项：[MVP_Development_Support_Checklist_v0.md](./MVP_Development_Support_Checklist_v0.md)

## 当前协作原则

- 新页面、新弹层、新复杂状态、新卡片样式，先补 Figma Make 设计，再进入前端实现。
- 已有页面内的逻辑、状态、接口、缓存、Bug 修复可以直接开发。
- 尽量先做不依赖新增页面、不依赖外部模型/接口的闭环。
- 不自动频繁打 APK；代码完成后先说明结果，需要真机包时再打。
- 服务器流量尽量省，日常优先本地模拟器、Android Studio 或云端接口热更新。
- 历史设计源和旧测试记录不删除；过期内容统一用 `~~删除线~~` 标注。

## 需求与产品

| 文档 | 状态 | 用途 |
| --- | --- | --- |
| [PRD_v0.md](./PRD_v0.md) | 当前主文档 | 产品定位、MVP 范围、核心闭环、风险 |
| [Development_Roadmap_v0.md](./Development_Roadmap_v0.md) | 当前路线 + 历史假设 | 技术路线、阶段规划、数据模型草案 |
| [AI_Feature_Design_v0.md](./AI_Feature_Design_v0.md) | 参考 | AI 形象、AI 对话、健康 AI、社交 AI 方向 |
| [Visual_Style_Guide_v0.md](./Visual_Style_Guide_v0.md) | 参考 | 真实卡通化风格、宠物形象提示词、视觉基调 |

## 设计与视觉

| 文档/目录 | 状态 | 用途 |
| --- | --- | --- |
| [Design_Gate_Rule_2026-06-06.md](./Design_Gate_Rule_2026-06-06.md) | 当前强约束 | 新页面和复杂状态的设计门禁 |
| [Figma_Make_Missing_Page_Prompts_2026-06-06.md](./Figma_Make_Missing_Page_Prompts_2026-06-06.md) | 当前待补设计提示词 | 后续需要用户在 Figma Make 生成的页面/状态 |
| [Figma_Make_To_RN_Migration_2026-06-02.md](./Figma_Make_To_RN_Migration_2026-06-02.md) | 参考 | Figma Make 源码到 React Native 的迁移规则 |
| [Figma_Make_Parity_Audit_2026-06-03.md](./Figma_Make_Parity_Audit_2026-06-03.md) | 历史参考 | Figma Make 对齐审计记录 |
| [Figma_Make_Parity_Audit_Update_2026-06-05.md](./Figma_Make_Parity_Audit_Update_2026-06-05.md) | 历史参考 | Figma Make 对齐补充记录 |
| [Stitch_Page_And_Interaction_Gap_v0.md](./Stitch_Page_And_Interaction_Gap_v0.md) | 历史参考 | Stitch 阶段页面/交互缺口 |
| [Stitch_QA_Checklist_v0.md](./Stitch_QA_Checklist_v0.md) | 历史参考 | Stitch 中文、导航、状态 QA 清单 |
| [stitch/](./stitch/) | 历史设计产物 | Stitch 导出的 HTML 页面 |

## 开发与接口

| 文档 | 状态 | 用途 |
| --- | --- | --- |
| [API_Contract_MVP_v0.md](./API_Contract_MVP_v0.md) | 当前主文档 | 前端 API 门面、测试后端、接口契约 |
| [MVP_Development_Support_Checklist_v0.md](./MVP_Development_Support_Checklist_v0.md) | 当前主文档 | 需要用户/后端/设计继续支持的事项 |
| [MVP_Implementation_Status_2026-05-30.md](./MVP_Implementation_Status_2026-05-30.md) | 历史参考 | 早期原生化实现状态 |
| [SMS_Integration_Testing_v0.md](./SMS_Integration_Testing_v0.md) | 历史测试记录 | Spug 短信通道测试和后端代理策略 |

## 测试与部署

| 文档/目录 | 状态 | 用途 |
| --- | --- | --- |
| [Android_APK_Testing_2026-06-06.md](./Android_APK_Testing_2026-06-06.md) | 真机策略 | APK 真机测试流程、省流量策略 |
| [Android_APK_Build_v2_2026-06-06.md](./Android_APK_Build_v2_2026-06-06.md) | 历史构建记录 | 旧版 APK 构建记录 |
| [Android_Back_Gesture_Behavior_2026-06-11.md](./Android_Back_Gesture_Behavior_2026-06-11.md) | 当前说明 | Android 返回手势和退出行为 |
| [qa-screenshots/](./qa-screenshots/) | 历史测试资产 | 页面 QA 截图证据 |

## AI 专题

| 文档 | 状态 | 用途 |
| --- | --- | --- |
| [AI_Pet_Chat_DeepSeek_Strategy_2026-06-10.md](./AI_Pet_Chat_DeepSeek_Strategy_2026-06-10.md) | 当前策略 | DeepSeek 宠物对话、隐藏提示词、token 控制 |
| [AI_Pet_Photo_Gate_Strategy_2026-06-11.md](./AI_Pet_Photo_Gate_Strategy_2026-06-11.md) | 当前策略 | 人宠同框、多宠、无宠物等上传拦截策略 |
| [AI_Pet_Avatar_Visual_Gate_Decision_2026-06-11.md](./AI_Pet_Avatar_Visual_Gate_Decision_2026-06-11.md) | 当前策略 | 视觉识别模型暂缓后的替代门禁 |
| [AI_Pet_Avatar_TTAPI_Flux_Strategy_2026-06-10.md](./AI_Pet_Avatar_TTAPI_Flux_Strategy_2026-06-10.md) | 当前参考 | TTAPI Flux 形象生成方案 |
| [AI_Pet_Avatar_TTAPI_Midjourney_Strategy_2026-06-10.md](./AI_Pet_Avatar_TTAPI_Midjourney_Strategy_2026-06-10.md) | 历史参考 | TTAPI Midjourney 形象生成方案 |

## 开发日志

| 文档 | 状态 | 内容 |
| --- | --- | --- |
| [MVP_Development_Update_2026-06-12.md](./MVP_Development_Update_2026-06-12.md) | 最新开发记录 | token 刷新、二次登录会话恢复、推送 token 登记、用户资料同步、缺失设计清单清理 |
| [MVP_Development_Update_2026-06-11.md](./MVP_Development_Update_2026-06-11.md) | 历史开发记录 | 宠物编辑、会话缓存、返回手势、健康提醒、通知已读 |
| [MVP_Development_Update_2026-06-10.md](./MVP_Development_Update_2026-06-10.md) | 历史开发记录 | 发现、招呼请求、接口、聊天未读闭环 |
| [MVP_Development_Update_2026-06-09.md](./MVP_Development_Update_2026-06-09.md) | 历史开发记录 | 本地/云端后端、社交接口同步 |
| [MVP_Development_Update_2026-06-05.md](./MVP_Development_Update_2026-06-05.md) | 历史开发记录 | Figma Make 页面、健康/聊天/地图待补 |

## 已知过期内容处理

- ~~Stitch 是唯一设计源。~~ 当前主设计源是 Figma Make / Figma 源码包；Stitch 只保留历史参考。
- ~~前端依赖 iframe 文案识别触发业务动作。~~ 当前为 React Native 状态机 + API 门面。
- ~~每次真机验证都从云服务器下载 APK。~~ 当前只在里程碑包或原生配置变化时打 APK，日常不从云端下载。
- ~~生产 App 内直接暴露 Spug 短信 URL。~~ 当前要求由后端代理短信或使用固定测试码；App 不保存短信服务密钥。
