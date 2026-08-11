# -*- coding: utf-8 -*-
"""Vibecoding Orchestration 三场景全景图生成器（zh / en 双版）
运行: python tools/draw-flow-panorama.py
输出: 产品到落地-三场景全景图.png / product-to-delivery-three-scenarios-en.png
风格: pil-diagram skill（浅色背景、微软雅黑、圆角卡片、语义色板、2x 导出）
"""
from PIL import Image, ImageDraw, ImageFont
import math

S = 2
W, H = 1560 * S, 1320 * S
FONT_REG = r"C:\Windows\Fonts\msyh.ttc"
FONT_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"

_cache = {}


def fr(sz):
    k = ("r", sz)
    if k not in _cache:
        _cache[k] = ImageFont.truetype(FONT_REG, round(sz * S))
    return _cache[k]


def fb(sz):
    k = ("b", sz)
    if k not in _cache:
        _cache[k] = ImageFont.truetype(FONT_BOLD, round(sz * S))
    return _cache[k]


INK = (34, 48, 63)
SUB = (102, 114, 127)
GRAY = (91, 107, 123)
PRODUCT = (45, 58, 79)
PSUB = (200, 210, 223)
RED = (231, 76, 60)
RED_F = (253, 236, 234)
BLUE = (74, 127, 181)
BLUE_F = (238, 244, 251)
BLUE2_F = (232, 240, 251)
GREEN = (46, 158, 91)
GREEN_F = (237, 248, 240)
GREEN_F2 = (240, 250, 242)
DGREEN = (46, 125, 91)
DGREEN_T = (220, 239, 228)
ORANGE = (230, 126, 34)
ORANGE_F = (253, 243, 231)
PURPLE = (91, 110, 225)
PURPLE_F = (238, 241, 251)
VIOLET = (142, 108, 192)
VIOLET_F = (244, 240, 250)
CARD_LN = (215, 222, 232)
WHITE = (255, 255, 255)


T = {
    "zh": {
        "title": "Vibecoding Orchestration · 三场景全景图",
        "subtitle": "同一套门禁与契约底线，按改动规模自动选择流程深度：快速 → 标准 → 大型",
        "legend": [("需求/门禁", RED), ("设计", BLUE), ("实现/集成", GREEN), ("快速", ORANGE), ("大型/并行", PURPLE)],
        "l1_label": "快速模式",
        "l1_desc": ["小改动 · 修 bug / 小接口 / 小重构", "不跨模块 · 不碰契约 · 通常 <200 行"],
        "l1": [
            ("一句话需求", "验收口径直接写", ORANGE, ORANGE_F),
            ("任务书", "Scope Lock + 心跳", ORANGE, ORANGE_F),
            ("实现", "总控或执行 agent", GREEN, GREEN_F),
            ("独立评审", "评审不可免", BLUE, BLUE_F),
            ("G-quick PASS", "提交 + STATE 一行", RED, RED_F),
            ("提交", "改动即交付", GREEN, GREEN_F2),
        ],
        "l1_note": "不产出 PRD / HLD / LLD；触碰契约或跨模块 → 自动升级标准模式",
        "l2_label": "标准模式",
        "l2_desc": ["中型功能 · 完整门禁 + 契约", "适合绝大多数功能开发"],
        "l2_stages": [
            ("A0 需求锚定", "REQ 可测无废案", RED, RED_F),
            ("PRD", "覆盖全部 REQ", BLUE, BLUE_F),
            ("HLD", "方案 + 风险", BLUE, BLUE_F),
            ("模块拆解", "3–8 模块 + 边界", BLUE, BLUE_F),
            ("LLD", "接口落契约", BLUE, BLUE2_F),
            ("契约冻结 G4", "禁止原地改", ORANGE, ORANGE_F),
            ("开发实现", "单测 + 契约测试", GREEN, GREEN_F),
            ("集成交付", "全量回归 + 发布", DGREEN, None),
        ],
        "gates": ["G0", "G1", "G2", "G3", "G5"],
        "l2_note": "门禁 G0–G5：评审通过才继续；G4 冻结后变更走版本升级，任何 agent 不得自评",
        "l3_label": "大型模式",
        "l3_desc": ["新系统 / 大史诗 · 史诗切分 + 模块并行 + 里程碑", "适合大型项目和长期迭代"],
        "l3a": [
            ("产品", "整个系统", PRODUCT, None),
            ("史诗切分", "EPIC-01 · 02 · 03 · 04 · 05", PURPLE, PURPLE_F),
            ("每个史诗独立跑标准流程", "只通过契约注册表衔接", BLUE, BLUE_F),
        ],
        "l3b": [
            ("模块并行", "B-4/B-5 每批 2–3 个", VIOLET, VIOLET_F),
            ("契约注册表", "跨史诗唯一衔接", BLUE, BLUE_F),
            ("里程碑 M1→M3", "可发布增量 · 人拍板", ORANGE, ORANGE_F),
            ("交付", "产品完整可用", DGREEN, None),
        ],
        "l3_note": "史诗之间不共享上下文；并行 agent 独立任务书 + 独立心跳文件，禁止递归 spawn",
        "l4_label": "跨平台",
        "l4_desc": ["同一套流程，任意 agent 平台", "核心与适配分层，平台差异只在适配层"],
        "l4": [
            ("Codex", "官方原生 · Windows/macOS", BLUE, BLUE_F),
            ("opencode", "官方样板 · 角色卡 + Node 脚本", GREEN, GREEN_F),
            ("其他平台", "社区模板 + 六能力验收", ORANGE, ORANGE_F),
        ],
        "bottom_left_title": "三档通用底线",
        "bottom_left": [
            "需求先蒸馏：噪声留在锚点之前",
            "产出的节点不能当自己的裁判：独立评审",
            "契约冻结后变更走版本升级",
            "文件即真相：交接 = 路径 + 一页摘要",
        ],
        "bottom_right_title": "自动升降级",
        "bottom_right": [
            "快速 → 标准：触碰契约 / 跨模块 / 涉架构",
            "标准 → 大型：单史诗 >8 模块 / 需并行与里程碑",
            "大型 → 快速：单点小改动",
            "任何模式：心跳 + 账本可复盘",
        ],
    },
    "en": {
        "title": "Vibecoding Orchestration · Three Modes Overview",
        "subtitle": "One set of gates and contract discipline; depth auto-selects by change size: Quick → Standard → Enterprise",
        "legend": [("Gates", RED), ("Design", BLUE), ("Build/Integrate", GREEN), ("Quick", ORANGE), ("Enterprise/Parallel", PURPLE)],
        "l1_label": "Quick Mode",
        "l1_desc": ["Small changes · bugfix / small API / refactor", "no cross-module · no contract touch · usually <200 LOC"],
        "l1": [
            ("One-line requirement", "acceptance criteria inline", ORANGE, ORANGE_F),
            ("Task book", "Scope Lock + heartbeat", ORANGE, ORANGE_F),
            ("Implement", "controller or executor agent", GREEN, GREEN_F),
            ("Independent review", "review is mandatory", BLUE, BLUE_F),
            ("G-quick PASS", "commit + STATE line", RED, RED_F),
            ("Ship", "change delivered", GREEN, GREEN_F2),
        ],
        "l1_note": "No PRD / HLD / LLD; touching contracts or crossing modules auto-upgrades to Standard",
        "l2_label": "Standard Mode",
        "l2_desc": ["Medium features · full gates + contracts", "covers most feature work"],
        "l2_stages": [
            ("A0 Anchor", "testable REQs", RED, RED_F),
            ("PRD", "covers all REQs", BLUE, BLUE_F),
            ("HLD", "design + risks", BLUE, BLUE_F),
            ("Split", "3-8 modules + boundaries", BLUE, BLUE_F),
            ("LLD", "interfaces to contracts", BLUE, BLUE2_F),
            ("Freeze G4", "no in-place edits", ORANGE, ORANGE_F),
            ("Build", "unit + contract tests", GREEN, GREEN_F),
            ("Integrate", "full regression + release", DGREEN, None),
        ],
        "gates": ["G0", "G1", "G2", "G3", "G5"],
        "l2_note": "Gates G0-G5: proceed only after review; after G4 freeze, changes go through version upgrade; no agent reviews itself",
        "l3_label": "Enterprise Mode",
        "l3_desc": ["New system / big epic · epic split + module parallelism + milestones", "for large projects and long-term iteration"],
        "l3a": [
            ("Product", "whole system", PRODUCT, None),
            ("Epic split", "EPIC-01 · 02 · 03 · 04 · 05", PURPLE, PURPLE_F),
            ("Standard flow per epic", "linked via contract registry", BLUE, BLUE_F),
        ],
        "l3b": [
            ("Parallel modules", "B-4/B-5 batches of 2-3", VIOLET, VIOLET_F),
            ("Contract registry", "single cross-epic link", BLUE, BLUE_F),
            ("Milestones M1-M3", "shippable increments", ORANGE, ORANGE_F),
            ("Deliver", "product fully usable", DGREEN, None),
        ],
        "l3_note": "Epics share no context; parallel agents get separate task books and heartbeat files; recursive spawn is forbidden",
        "l4_label": "Cross-Platform",
        "l4_desc": ["Same flow on any agent platform", "core vs adaptation layer; only adapters differ"],
        "l4": [
            ("Codex", "native · Windows/macOS", BLUE, BLUE_F),
            ("opencode", "sample adapter · role cards + Node scripts", GREEN, GREEN_F),
            ("Other platforms", "community template + 6-capability acceptance", ORANGE, ORANGE_F),
        ],
        "bottom_left_title": "Universal Rules",
        "bottom_left": [
            "Distill requirements first: noise stays before the anchor",
            "Producers never judge their own output: independent review",
            "After contract freeze, changes ship as version upgrades",
            "Files are the source of truth: handoff = path + one-page summary",
        ],
        "bottom_right_title": "Auto Escalation",
        "bottom_right": [
            "Quick → Standard: contracts / cross-module / architecture",
            "Standard → Enterprise: >8 modules / parallelism + milestones",
            "Enterprise → Quick: one-off small change",
            "Every mode: heartbeat + ledgers for replay",
        ],
    },
}


def draw(lang, out):
    img = Image.new("RGB", (W, H), (250, 251, 253))
    d = ImageDraw.Draw(img)
    t = T[lang]

    def rect(x, y, w, h, fill=None, outline=None, width=2, r=12):
        d.rounded_rectangle([x * S, y * S, (x + w) * S, (y + h) * S], radius=r * S,
                            fill=fill, outline=outline, width=max(1, round(width * S)))

    def text(x, y, s, font, fill=INK, anchor="mm"):
        d.text((x * S, y * S), s, font=font, fill=fill, anchor=anchor)

    def fits(s, size, bold, max_w):
        f = fb(size) if bold else fr(size)
        bb = d.textbbox((0, 0), s, font=f)
        return (bb[2] - bb[0]) <= max_w * S

    def auto_text(x, y, s, size, bold, max_w, fill=INK, anchor="mm", min_size=9):
        sz = size
        while sz > min_size and not fits(s, sz, bold, max_w):
            sz -= 0.5
        text(x, y, s, fb(sz) if bold else fr(sz), fill, anchor)

    def line(x1, y1, x2, y2, color=GRAY, width=1.5):
        d.line([x1 * S, y1 * S, x2 * S, y2 * S], fill=color, width=max(1, round(width * S)))

    def arrow(x1, y1, x2, y2, color=GRAY, width=1.5):
        line(x1, y1, x2, y2, color, width)
        ang = math.atan2(y2 - y1, x2 - x1)
        L = 9 * S
        a1, a2 = ang + math.radians(150), ang - math.radians(150)
        p1 = (x2 * S + L * math.cos(a1), y2 * S + L * math.sin(a1))
        p2 = (x2 * S + L * math.cos(a2), y2 * S + L * math.sin(a2))
        d.polygon([(x2 * S, y2 * S), p1, p2], fill=color)

    # title
    text(780, 44, t["title"], fb(26), INK)
    text(780, 72, t["subtitle"], fr(14), SUB)

    # legend
    lx = 1020
    for label, color in t["legend"]:
        d.rectangle([lx * S, 32 * S, (lx + 10) * S, 42 * S], fill=color)
        text(lx + 14, 37, label, fr(11), INK, anchor="lm")
        lx += 14 + fr(11).getlength(label) / S + 22

    # ---- lane 1: quick ----
    text(90, 112, t["l1_label"], fb(18), INK, anchor="lm")
    text(90, 138, t["l1_desc"][0], fr(12), SUB, anchor="lm")
    text(90, 158, t["l1_desc"][1], fr(12), SUB, anchor="lm")
    xs1 = [330, 510, 700, 900, 1080, 1260]
    ws1 = [160, 170, 180, 160, 160, 180]
    for (title1, sub1, bcol, fcol), x, w in zip(t["l1"], xs1, ws1):
        rect(x, 132, w, 66, fill=fcol, outline=bcol, width=2, r=10)
        auto_text(x + w / 2, 154, title1, 13.5, True, w - 20)
        auto_text(x + w / 2, 176, sub1, 11, False, w - 20, SUB)
    for i in range(len(xs1) - 1):
        arrow(xs1[i] + ws1[i] - 2, 165, xs1[i + 1] + 2, 165)
    text(780, 216, t["l1_note"], fr(12), GRAY)

    # ---- lane 2: standard ----
    text(90, 248, t["l2_label"], fb(18), INK, anchor="lm")
    text(90, 274, t["l2_desc"][0], fr(12), SUB, anchor="lm")
    text(90, 294, t["l2_desc"][1], fr(12), SUB, anchor="lm")
    x0, cw, gap = 268, 126, 24
    ys = 268
    for i, (title2, sub2, bcol, fcol) in enumerate(t["l2_stages"]):
        x = x0 + i * (cw + gap)
        if fcol is None:
            rect(x, ys, cw, 70, fill=bcol, width=0, r=10)
            auto_text(x + cw / 2, ys + 27, title2, 12.5, True, cw - 14, WHITE)
            auto_text(x + cw / 2, ys + 49, sub2, 10.5, False, cw - 14, DGREEN_T)
        else:
            rect(x, ys, cw, 70, fill=fcol, outline=bcol, width=2, r=10)
            auto_text(x + cw / 2, ys + 27, title2, 12.5, True, cw - 14)
            auto_text(x + cw / 2, ys + 49, sub2, 10.5, False, cw - 14, SUB)
    gate_pos = {0: "G0", 1: "G1", 2: "G2", 3: "G3", 6: "G5"}
    for gi in range(7):
        if gi not in gate_pos:
            continue
        chip_x = x0 + (gi + 1) * (cw + gap) - gap + 1
        rect(chip_x, ys + 26, 22, 18, fill=RED_F, outline=RED, width=1.5, r=6)
        auto_text(chip_x + 11, ys + 35, gate_pos[gi], 9.5, True, 18, RED)
        arrow(x0 + gi * (cw + gap) + cw - 1, ys + 35, chip_x, ys + 35)
        arrow(chip_x + 22, ys + 35, x0 + (gi + 1) * (cw + gap) + 1, ys + 35)
    text(780, 362, t["l2_note"], fr(12), GRAY)

    # ---- lane 3: enterprise ----
    text(90, 398, t["l3_label"], fb(18), INK, anchor="lm")
    text(90, 424, t["l3_desc"][0], fr(12), SUB, anchor="lm")
    text(90, 444, t["l3_desc"][1], fr(12), SUB, anchor="lm")
    xs3a = [268, 438, 678]
    ws3a = [150, 220, 250]
    for (title3, sub3, bcol, fcol), x, w in zip(t["l3a"], xs3a, ws3a):
        if fcol is None:
            rect(x, 420, w, 70, fill=bcol, width=0, r=10)
            auto_text(x + w / 2, 442, title3, 13, True, w - 20, WHITE)
            auto_text(x + w / 2, 464, sub3, 11, False, w - 20, PSUB)
        else:
            rect(x, 420, w, 70, fill=fcol, outline=bcol, width=2, r=10)
            auto_text(x + w / 2, 442, title3, 13, True, w - 20)
            auto_text(x + w / 2, 464, sub3, 11, False, w - 20, SUB)
    arrow(418, 455, 438, 455)
    arrow(658, 455, 678, 455)
    xs3b = [268, 488, 708, 948]
    ws3b = [200, 200, 220, 180]
    for (title3, sub3, bcol, fcol), x, w in zip(t["l3b"], xs3b, ws3b):
        if fcol is None:
            rect(x, 520, w, 70, fill=bcol, width=0, r=10)
            auto_text(x + w / 2, 542, title3, 13, True, w - 20, WHITE)
            auto_text(x + w / 2, 564, sub3, 11, False, w - 20, DGREEN_T)
        else:
            rect(x, 520, w, 70, fill=fcol, outline=bcol, width=2, r=10)
            auto_text(x + w / 2, 542, title3, 13, True, w - 20)
            auto_text(x + w / 2, 564, sub3, 11, False, w - 20, SUB)
    arrow(418, 555, 488, 555)
    arrow(688, 555, 708, 555)
    arrow(928, 555, 948, 555)
    arrow(803, 490, 803, 520)
    text(780, 610, t["l3_note"], fr(12), GRAY)

    # ---- lane 4: platforms ----
    text(90, 650, t["l4_label"], fb(18), INK, anchor="lm")
    text(90, 676, t["l4_desc"][0], fr(12), SUB, anchor="lm")
    text(90, 696, t["l4_desc"][1], fr(12), SUB, anchor="lm")
    xs4 = [330, 540, 800]
    ws4 = [190, 330, 300]
    for (title4, sub4, bcol, fcol), x, w in zip(t["l4"], xs4, ws4):
        rect(x, 680, w, 62, fill=fcol, outline=bcol, width=2, r=10)
        auto_text(x + w / 2, 700, title4, 13.5, True, w - 20)
        auto_text(x + w / 2, 722, sub4, 11, False, w - 20, SUB)

    # ---- bottom cards ----
    rect(90, 1160, 690, 128, fill=WHITE, outline=CARD_LN, width=1.5, r=12)
    text(110, 1188, t["bottom_left_title"], fb(15), INK, anchor="lm")
    ly = 1212
    for ln in t["bottom_left"]:
        text(110, ly, ln, fr(12.5), (68, 84, 106), anchor="lm")
        ly += 23

    rect(800, 1160, 690, 128, fill=WHITE, outline=CARD_LN, width=1.5, r=12)
    text(820, 1188, t["bottom_right_title"], fb(15), INK, anchor="lm")
    ly = 1212
    for ln in t["bottom_right"]:
        text(820, ly, ln, fr(12.5), (68, 84, 106), anchor="lm")
        ly += 23

    img.save(out)
    print("saved:", out, img.size)


if __name__ == "__main__":
    draw("zh", r"D:\Agent\work space\services\codex树形标准开发流程\产品到落地-三场景全景图.png")
    draw("en", r"D:\Agent\work space\services\codex树形标准开发流程\product-to-delivery-three-scenarios-en.png")
