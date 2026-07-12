# 灵伴 Lumii｜抖音用户招募视频

26 秒、1080 × 1920、30fps 的 Remotion 竖屏成片。叙事聚焦用户招募：真实宠物照片、专属电子灵伴、日常陪伴、健康记录、附近宠友与首批体验 CTA；不包含技术栈介绍。

## 预览与渲染

```powershell
npm install
npm run dev
npm run render
```

最终成片输出到 `out/lumii-douyin-recruitment.mp4`。

`npm run render` 默认采用本机验证通过的低负载模式：单并发、两个逻辑线程、低进程优先级、软件 GL、软件编码且画面渲染与编码串行。这样会更慢，但可避免默认并发渲染造成的瞬时满载。

如需重新生成原创配乐、转场音效和中文旁白：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate_audio.ps1
```

## 可编辑内容

在 Remotion Studio 中打开 `LumiiRecruitment`，可直接修改组合默认参数：

- `recruitmentLabel`：招募主标题
- `cta`：行动号召，默认为“评论「灵伴」申请内测”
- `ctaNote`：适用用户与共创说明
- `withVoiceover`：是否启用中文旁白

核心分镜与动效位于 `src/RecruitmentVideo.tsx`，品牌素材位于 `public/assets`，原创音频位于 `public/audio`。
