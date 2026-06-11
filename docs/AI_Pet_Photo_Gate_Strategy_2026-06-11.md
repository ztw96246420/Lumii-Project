# Lumii 宠物照片准入与识别闸门策略

## 为什么需要闸门

AI 宠物形象生成不能直接把用户上传图丢给 Flux。否则遇到人物合照、多宠物、其他动物、复杂道具、无宠物图片时，模型容易把特征混在一起，生成结果既不像真实宠物，也可能带来隐私风险。

MVP 的策略是：上传后先返回结构化识别结果，再决定是否进入生成。

## 处理规则

### 1. 单只宠物，主体清晰

处理：允许生成。

App 表现：
- 进入“识别结果”页。
- 显示质量分、识别状态、生成建议。
- 按钮：确认并生成灵伴。

### 2. 人 + 宠物

处理：默认阻止生成，要求重新上传或后续裁剪。

原因：
- 人脸/身体会干扰生成。
- 有隐私风险。
- Flux 可能把人与宠物的特征、姿态或道具混在一起。

后续优化：
- 补 Figma 页面：宠物主体裁剪/选择页。
- 若人物很小且宠物主体极清晰，可降级为 warning，但 MVP 先保守阻止。

### 3. 多只宠物

处理：默认阻止生成。

原因：
- 无法知道用户想生成哪一只。
- 多只宠物的毛色、耳朵、五官特征可能混合。

后续优化：
- 支持“选择目标宠物”或“裁剪其中一只”。

### 4. 宠物 + 其他动物

处理：默认阻止生成。

原因：
- 其他动物可能被模型误认为目标宠物。
- 猫狗同框、多动物同框容易混特征。

### 5. 宠物 + 复杂背景 / 道具

处理：允许生成，但显示 warning。

原则：
- 宠物主体清晰则可继续。
- Prompt 要求优先保留宠物，弱化背景和道具。
- 若用户不满意，引导换一张背景干净的正脸照。

### 6. 无宠物

处理：阻止生成。

App 表现：
- 进入“识别失败”页。
- 提示“未检测到宠物”。
- 提供重新选择/重新拍照。

### 7. 低清晰度 / 文件缺失

处理：
- 文件缺失：阻止生成。
- 清晰度偏低：允许尝试，但 warning。

## 当前接口字段

`POST /media/uploads` 返回：

```ts
type UploadedPetMedia = {
  mediaId: string;
  previewUrl: string;
  quality: 'good' | 'warning' | 'blocked';
  analysis: {
    canGenerate: boolean;
    code:
      | 'single_pet_clear'
      | 'human_and_pet'
      | 'multiple_pets'
      | 'other_animals'
      | 'busy_scene'
      | 'no_pet'
      | 'low_quality'
      | 'missing_file'
      | 'unclear';
    status: 'accepted' | 'warning' | 'blocked';
    qualityScore: number;
    title: string;
    message: string;
    tags: string[];
    suggestions: string[];
    petCount?: number;
    humanPresent?: boolean;
    otherAnimalPresent?: boolean;
    needsCrop?: boolean;
  };
};
```

`POST /ai/pet-avatar/jobs` 会二次校验：如果 `analysis.canGenerate=false`，后端拒绝生成，避免前端绕过。

## 当前实现状态

- 已补结构化 `analysis` 字段。
- 前端已根据 `analysis.canGenerate` 分流：
  - 可生成：进入识别结果页。
  - 不可生成：进入识别失败页。
  - warning：允许继续，但展示优化建议。
- 后端已预留 `analysisCode/debugAnalysisCode` 用于本地 QA 模拟不同识别结果。

## 后续需要接入的真实能力

当前 MVP 先完成规则和产品闭环。真正精准识别需要接入视觉模型或图像检测服务，输出上述结构化 JSON。

推荐识别模型输出：

```json
{
  "petDetected": true,
  "petCount": 1,
  "primarySpecies": "dog",
  "humanPresent": false,
  "otherAnimalPresent": false,
  "petFaceVisible": true,
  "primaryPetOccupancy": 0.72,
  "qualityScore": 91,
  "backgroundComplexity": "low",
  "recommendedAction": "accept"
}
```

上线前必须补：
- 宠物主体检测。
- 多宠物检测。
- 人脸/人物检测。
- 低清晰度/遮挡检测。
- 后续裁剪页或目标宠物选择页。

