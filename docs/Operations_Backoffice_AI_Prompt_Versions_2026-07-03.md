# Lumii 运营后台 AI Prompt 版本库

日期：2026-07-03

## 目标

把 AI 灵伴形象的提示词从“配置中心里的一段线上文本”升级为“可沉淀候选、可关联样本、可生成配置草稿、可追溯到移动端生成任务”的运营闭环。

这项能力解决三个问题：

- AI 样本池只能记录问题，不能承载具体的 prompt 方案。
- 直接在配置中心改线上 prompt 缺少候选版本、样本来源和变更理由。
- 某个用户生成结果异常时，需要知道当时到底用了哪一版 prompt 和哪个 hash。

## 后台能力

配置中心 -> AI 外围系统配置 -> GPT Image 2 Prompt 版本库：

- 查看当前线上 `promptVersion` 和 prompt hash。
- 保存当前编辑区的 GPT Image 2 prompt 为候选版本。
- 存档当前线上 prompt。
- 填写候选名称、备注、关联 AI 样本 ID。
- 按状态和关键词筛选候选版本。
- 对候选版本执行“生成配置草稿”。
- 归档不再使用的候选版本。

候选版本状态：

- `candidate`：候选中，只在后台可见，不影响移动端。
- `drafted`：已经生成配置草稿，但仍需发布草稿或走审批后才会影响新生成任务。
- `archived`：已归档，保留审计和导出记录，不能再生成配置草稿。

## 后端接口

- `GET /admin/ai/prompt-versions`
- `POST /admin/ai/prompt-versions`
- `POST /admin/ai/prompt-versions/{versionId}/draft`
- `POST /admin/ai/prompt-versions/{versionId}/archive`

数据导出新增：

- `ai_prompt_versions`

系统健康 collections 新增：

- `aiPromptVersions`

## 配置中心联动

Prompt 候选版本不会直接修改线上配置。

点击“生成配置草稿”时，后端会创建一条普通配置草稿：

```json
{
  "ai": {
    "avatar": {
      "gptImage2": {
        "promptTemplate": "...",
        "promptVersion": "prompt-version-..."
      }
    }
  }
}
```

后续仍沿用配置中心既有治理链路：

- 草稿保存不影响移动端。
- 草稿发布后才更新当前配置。
- 如果开启强制审批，发布草稿需要先走配置审批。
- 高风险确认、预约发布、回滚和审计仍复用配置中心机制。

## 移动端联动边界

- 移动端不读取 Prompt 版本库。
- `/app/config` 不下发 prompt/provider/model 细节。
- 新建 AI 灵伴形象任务时，后端读取当前正式配置里的 `ai.avatar.gptImage2.promptTemplate` 和 `promptVersion`。
- 生成任务会记录 `promptVersion#promptHash`，用于后续后台排查。

因此，后台和移动端不是割裂系统，但移动端只受“已发布配置”和真实生成任务结果影响。

## 和样本池的关系

AI 样本池负责沉淀真实问题：

- 用户反馈“不像我家宠物”。
- 供应商提交失败、状态刷新异常、任务超时。
- 素材质量问题。

Prompt 版本库负责沉淀解决方案：

- 候选 prompt 文本。
- 关联样本 ID。
- 候选说明和创建人。
- 生成配置草稿记录。

建议运营流程：

1. 在 AI 灵伴页查看样本池，筛出 prompt 质量问题。
2. 复制样本 ID，回到配置中心。
3. 修改 GPT Image 2 prompt 编辑区。
4. 保存为 Prompt 候选，填写关联样本 ID 和备注。
5. 对候选版本生成配置草稿。
6. 复核草稿变更摘要后发布或提交审批。
7. 新用户生成任务会记录该版本 ID 和 hash。

## 待澄清

- 是否需要在后台支持候选版本之间的差异对比。
- 是否需要把某个候选版本绑定到小流量灰度，而不是直接成为全量配置。
- 是否需要为每个候选版本维护离线评测结果，例如通过样本池批量重跑对比。
- 是否需要单独区分“静态形象 prompt 版本”和“动效 prompt 版本”的统一版本库。

## 验证

```bash
node --check scripts/lumii-backend.cjs
node --check admin/admin.js
node --check scripts/smoke-ai-prompt-versions.cjs
node scripts/smoke-ai-prompt-versions.cjs
```

烟测覆盖：

- 创建 Prompt 候选。
- 从候选生成配置草稿。
- 发布配置草稿。
- 新建移动端 AI 灵伴生成任务。
- 验证 fake GPT Image 2 provider 收到候选 prompt。
- 验证后台任务记录 `promptVersion#hash`。
- 验证 `ai_prompt_versions` 导出目录和审计记录。
