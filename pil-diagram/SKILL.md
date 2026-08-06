---
name: pil-diagram
description: 用 Python PIL 手工绘制清晰美观的架构图、流程图、全景图（浅色背景、微软雅黑、圆角卡片、语义色板、像素级文字校验、2x 高清导出）。当用户要求"好看/清晰/精美"的图示、嫌弃默认 mermaid 或图表库风格、想复刻既有手绘图风格（如产品到落地全景图）、或需要把流程/架构画成 PNG 图片时使用。纯文本模型无需看图即可复刻：风格以 references/style.md 文字规范 + references/panorama-example.py 参考实现为准。
---

# Pil Diagram（PIL 手绘图表）

## 核心流程

1. **规划**：按内容自上而下分段（标题 → 图例 → 主体 → 底部说明），先定逻辑画布（默认 1560×1320）与各块坐标。
2. **绘制**：导入 `scripts/diagram.py` 的 `Canvas`，用 rect / text / line / arrow 助手按逻辑坐标绘制。
3. **校验**：每条文字用 `canvas.fits(text, size, bold, max_w)` 校验不溢出；溢出则缩小字号或扩卡片。
4. **导出**：`canvas.save(path)` 自动 2x 缩放（约 3120×2640），保存到用户工作区。
5. **展示**：在回复中用 Markdown 图片语法（绝对路径）展示。

## 风格规范（必读）

绘制前先读 `references/style.md`：背景色、语义色板、字号、卡片/连线规则、布局纪律。

## 完整参考实现

要复刻"产品到落地"同款视觉语言时，直接读 `references/panorama-example.py`（完整可用脚本），按它的布局结构改内容即可。

## 输出要求

- 保存为 PNG 到用户工作区，路径用绝对路径
- 所有中文用微软雅黑（msyh.ttc / msyhbd.ttc）
- 不允许用 mermaid / matplotlib 默认风格 / AI 生图替代本流程