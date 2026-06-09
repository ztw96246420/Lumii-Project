# Lumii / 灵伴 文档索引

维护日期：2026-06-10

## 阅读顺序

1. 产品范围：`PRD_v0.md`
2. 当前开发支持：`MVP_Development_Support_Checklist_v0.md`
3. 设计门禁：`Design_Gate_Rule_2026-06-06.md`
4. 接口契约：`API_Contract_MVP_v0.md`
5. 最近开发记录：`MVP_Development_Update_2026-06-10.md`

## 当前原则

- 新页面、新弹窗、新复杂状态必须先由用户在 Figma Make 补设计，前端不自行发挥视觉风格。
- 日常开发不频繁打 APK；优先本地模拟器、Android Studio、云端接口热更新。
- 腾讯云服务器只承载测试后端；APK 不常驻云端下载，避免消耗流量包。
- 历史设计源和旧测试记录不删除；过期内容统一用 `~~删除线~~` 标记。

## 需求与产品

| 文档 | 状态 | 用途 |
| --- | --- | --- |
| `PRD_v0.md` | 当前主文档 | 产品定位、MVP 范围、核心闭环、风险 |
| `Development_Roadmap_v0.md` | 当前路线 + 历史假设 | 技术路线、阶段规划、数据模型草案 |
| `AI_Feature_Design_v0.md` | 当前参考 | AI 形象、AI 对话、健康 AI、社交 AI 方向 |
| `Visual_Style_Guide_v0.md` | 当前参考 | 真实卡通化风格、宠物形象生成提示词、视觉基调 |

## 设计与视觉

| 文档/目录 | 状态 | 用途 |
| --- | --- | --- |
| `Design_Gate_Rule_2026-06-06.md` | 当前强约束 | 新页面和新状态的设计门禁 |
| `Figma_Make_To_RN_Migration_2026-06-02.md` | 当前参考 | Figma Make 源码到 React Native 的迁移规则 |
| `Figma_Make_Missing_Page_Prompts_2026-06-06.md` | 当前待补设计提示词 | 后续需要用户在 Figma Make 生成的页面/状态 |
| `Figma_Make_Audit_2026-05-30.md` | 历史参考 | 早期 Figma Make 还原质量审计 |
| `Figma_Make_Parity_Audit_2026-06-03.md` | 历史参考 | Figma Make 对齐审计记录 |
| `Figma_Make_Parity_Audit_Update_2026-06-05.md` | 历史参考 | Figma Make 对齐补充记录 |
| `Stitch_Page_And_Interaction_Gap_v0.md` | 历史参考 | Stitch 阶段页面/交互缺口 |
| `Stitch_QA_Checklist_v0.md` | 历史参考 | Stitch 中文、导航、状态 QA 清单 |
| `docs/stitch/` | 历史设计产物 | Stitch 导出的 HTML/图片页面 |
| `stitch-*.html` / `stitch-*.png` | 历史设计产物 | 早期根目录 Stitch 快照 |

## 开发与接口

| 文档 | 状态 | 用途 |
| --- | --- | --- |
| `API_Contract_MVP_v0.md` | 当前主文档 | 前端 API 门面、云端测试后端、接口契约 |
| `MVP_Development_Support_Checklist_v0.md` | 当前主文档 | 需要用户/后端/设计继续支持的事项 |
| `MVP_Implementation_Status_2026-05-30.md` | 历史参考 | 早期原生化实现状态 |
| `SMS_Integration_Testing_v0.md` | 历史参考 + 测试记录 | Spug 短信通道测试和当前后端替代策略 |

## 测试与部署

| 文档 | 状态 | 用途 |
| --- | --- | --- |
| `Android_APK_Testing_2026-06-06.md` | 历史参考 + 真机策略 | APK 真机测试流程、当前省流量策略 |
| `Android_APK_Build_v2_2026-06-06.md` | 历史参考 | 旧版 APK 构建记录 |
| `MVP_Development_Update_2026-06-09.md` | 开发记录 | 本地/云端后端、社交接口同步 |
| `MVP_Development_Update_2026-06-10.md` | 最新开发记录 | 招呼请求、会话、未读闭环 |
| `qa-screenshots/` | 历史测试资产 | 页面 QA 截图证据 |

## 开发日志

| 文档 | 状态 | 内容 |
| --- | --- | --- |
| `MVP_Development_Update_2026-06-05.md` | 历史开发记录 | Figma Make 后续页面、健康/聊天/地图待补 |
| `MVP_Development_Update_2026-06-09.md` | 开发记录 | 本地后端、云 API、打招呼/约遛/消息接口 |
| `MVP_Development_Update_2026-06-10.md` | 最新开发记录 | 发现、招呼请求、接受/婉拒、聊天未读闭环 |

## 已知过期内容处理

- ~~Stitch 是唯一设计源。~~ 当前主设计源是 Figma Make / Figma 源码包；Stitch 只保留历史参考。
- ~~前端依赖 iframe 文案识别触发业务动作。~~ 当前为 React Native 状态机 + API 门面。
- ~~每次真机验证都从云服务器下载 APK。~~ 当前只在里程碑包或原生配置变化时打 APK；日常不用云端下载。
- ~~生产 App 内直接暴露 Spug 短信 URL。~~ 当前要求由后端代理短信或使用固定测试码；App 不保存短信服务密钥。
