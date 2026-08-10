# Design Genome Schema（提取/评审 schema）

两层结构：`design-genome.md`（原则层）+ `design-dna.json`（token 层）。改编自 [zanwei/design-dna](https://github.com/zanwei/design-dna)（MIT）。

## design-genome.md 必填章节

1. **Personality** — 界面应该给人的感觉 / 必须避免的感觉（形容词，可判定）。
2. **Visual Language** — Prefer / Avoid（对比度策略、色彩克制度、边框/阴影观感）。
3. **Information Philosophy** — 主信息永远可见；次信息通过上下文揭示；复杂度渐进暴露。
4. **Spatial Model** — 空间模型（workspace / document page / canvas…）；密度倾向。
5. **Interaction Philosophy** — 行为应可预测、可逆、平静；禁止的交互（闪烁、无意义转场）。
6. **Component Philosophy** — 指向 `component-philosophy.md`，禁止内嵌参数。
7. **Anti-Patterns** — 本项目禁用清单（从种子/taste-skill 提炼）。

每条原则要求：陈述句、可判定（评审时可判断"违反/符合"）、无 px/hex/CSS。

## design-dna.json 字段（token 层）

改编自 design-dna schema 的 `design_system` + `design_style` 核心字段：

```json
{
  "meta": {
    "name": "",
    "description": "",
    "source_samples": [],
    "created_at": ""
  },
  "design_system": {
    "color": {
      "primary": "#",
      "secondary": "#",
      "accent": "#",
      "neutral_scale": [],
      "semantic": { "success": "", "warning": "", "error": "" },
      "surface": { "background": "", "card": "", "elevated": "" },
      "contrast_strategy": ""
    },
    "typography": {
      "display": { "font": "", "size": "", "weight": "" },
      "body": { "font": "", "size": "", "weight": "" },
      "mono": "",
      "scale_notes": ""
    },
    "spacing": { "base_unit": "", "scale": [], "content_density": "" },
    "layout": {
      "grid_system": "",
      "max_content_width": "",
      "columns": "",
      "alignment_tendency": ""
    },
    "shape": {
      "border_radius": { "small": "", "medium": "", "large": "" },
      "border_usage": ""
    },
    "elevation": {
      "shadow_style": "",
      "levels": { "low": "", "medium": "", "high": "" }
    },
    "motion": {
      "duration_scale": { "micro": "", "normal": "", "macro": "" },
      "easing": "",
      "philosophy": ""
    },
    "components": {
      "button_style": "",
      "input_style": "",
      "card_style": "",
      "navigation_pattern": "",
      "modal_style": "",
      "component_notes": ""
    }
  },
  "design_style": {
    "aesthetic": { "mood": [], "genre": "", "personality_traits": [] },
    "visual_language": {
      "complexity": "",
      "ornamentation": "",
      "whitespace_usage": "",
      "focal_strategy": ""
    },
    "composition": {
      "hierarchy_method": "",
      "balance_type": "",
      "flow_direction": ""
    },
    "interaction_feel": {
      "feedback_style": "",
      "transition_personality": "",
      "microinteraction_density": ""
    },
    "brand_voice_in_ui": {
      "tone": "",
      "cta_style": "",
      "empty_state_approach": "",
      "error_tone": ""
    }
  }
}
```

## 字段取值指导

- `color.contrast_strategy`：high contrast / subtle layers / dark-on-light dominant
- `spacing.content_density`：compact / comfortable / spacious
- `layout.alignment_tendency`：strict grid / centered / asymmetric / mixed
- `shape.border_usage`：none / subtle 1px / bold borders / only on inputs
- `elevation.shadow_style`：none / soft diffused / hard drop / layered
- `motion.philosophy`：minimal functional / playful bouncy / cinematic / none
- `design_style.visual_language.complexity`：minimal / moderate / rich / maximal
- `design_style.aesthetic.mood`：3-5 个形容词，如 ["calm", "professional", "warm"]
- `design_style.composition.hierarchy_method`：scale contrast / color weight / spatial isolation / typographic hierarchy

只填样本中可观察到的值；观察不到的字段写 `null` 并说明原因，禁止编造。完整参考字段见 [zanwei/design-dna/references/schema.md](https://github.com/zanwei/design-dna/blob/main/references/schema.md)。

## 冲突规则

- token 层与原则层冲突时，**原则层优先**（原则管审美，token 管落地）。
- 多张样本冲突时记 dominant pattern + variants，不强行合并。
