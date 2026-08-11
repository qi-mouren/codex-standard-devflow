# -*- coding: utf-8 -*-
"""Vibecoding Orchestration 模式全景图生成器（zh / en 双版，每档模式一张图）
运行: python tools/draw-flow-panorama.py
输出:
  flow-quick-zh.png / flow-quick-en.png
  flow-standard-zh.png / flow-standard-en.png
  flow-enterprise-zh.png / flow-enterprise-en.png
风格: 对齐「产品到落地-切分全景图」（pil-diagram skill：浅底、微软雅黑、
      圆角卡片、语义色板、叙事分节、底部白卡、2x 导出）
"""
from PIL import Image, ImageDraw, ImageFont
import math

S = 2
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


class Cv:
    def __init__(self, w, h):
        self.img = Image.new("RGB", (w * S, h * S), (250, 251, 253))
        self.d = ImageDraw.Draw(self.img)

    def rect(self, x, y, w, h, fill=None, outline=None, width=2, r=12):
        self.d.rounded_rectangle([x * S, y * S, (x + w) * S, (y + h) * S], radius=r * S,
                                 fill=fill, outline=outline, width=max(1, round(width * S)))

    def text(self, x, y, s, font, fill=INK, anchor="mm"):
        self.d.text((x * S, y * S), s, font=font, fill=fill, anchor=anchor)

    def text_w(self, s, size, bold):
        f = fb(size) if bold else fr(size)
        bb = self.d.textbbox((0, 0), s, font=f)
        return (bb[2] - bb[0]) / S

    def auto_text(self, x, y, s, size, bold, max_w, fill=INK, anchor="mm", min_size=8.5):
        sz = size
        while sz > min_size and self.text_w(s, sz, bold) > max_w:
            sz -= 0.5
        if sz < size - 1.0:
            print(f"  [shrink] {s[:40]!r}: {size} -> {sz}px (max_w={max_w})")
        self.text(x, y, s, fb(sz) if bold else fr(sz), fill, anchor)

    def line(self, x1, y1, x2, y2, color=GRAY, width=1.5):
        self.d.line([x1 * S, y1 * S, x2 * S, y2 * S], fill=color, width=max(1, round(width * S)))

    def arrow(self, x1, y1, x2, y2, color=GRAY, width=1.5):
        self.line(x1, y1, x2, y2, color, width)
        ang = math.atan2(y2 - y1, x2 - x1)
        L = 9 * S
        a1, a2 = ang + math.radians(150), ang - math.radians(150)
        p1 = (x2 * S + L * math.cos(a1), y2 * S + L * math.sin(a1))
        p2 = (x2 * S + L * math.cos(a2), y2 * S + L * math.sin(a2))
        self.d.polygon([(x2 * S, y2 * S), p1, p2], fill=color)

    def save(self, out):
        self.img.save(out)
        print("saved:", out, self.img.size)


TQ = {
    "zh": {
        "title": "快速模式 · 小改动直通交付",
        "subtitle": "修 bug / 小接口 / 小重构（<200 行、不跨模块、不碰契约）：需求一句话 → 任务书 → 实现 → 独立评审 → 提交",
        "step1": "第一步 · 流程：六步轻量闭环",
        "cards": [
            ("一句话需求", "验收口径直接写", ORANGE, ORANGE_F),
            ("任务书", "Scope Lock + 心跳", ORANGE, ORANGE_F),
            ("实现", "总控或执行 agent", GREEN, GREEN_F),
            ("独立评审", "评审不可免", BLUE, BLUE_F),
            ("G-quick PASS", "提交 + STATE 一行", RED, RED_F),
            ("提交", "改动即交付", GREEN, GREEN_F2),
        ],
        "note1": "不产出 PRD / HLD / LLD；触碰契约或跨模块 → 自动升级标准模式",
        "step2": "第二步 · 产出边界：什么留、什么不留",
        "left_title": "快速模式只产出",
        "left": ["任务书（含 Scope Lock + 心跳命令）", "代码变更 + 提交", "评审记录 + STATE 变更一行"],
        "right_title": "快速模式不产出",
        "right": ["PRD / HLD / LLD", "契约变更（碰契约即不属于快速）", "门禁产物与追踪矩阵增量"],
        "step3": "第三步 · 不豁免项（小改动也是可追溯的）",
        "bottom": ["心跳 + watchdog + 账本记录照常", "独立评审不可免：产出的节点不能当自己的裁判"],
    },
    "en": {
        "title": "Quick Mode · Small Changes, Straight to Delivery",
        "subtitle": "bugfix / small API / refactor (<200 LOC, no cross-module, no contract touch): one-line requirement → task book → implement → independent review → commit",
        "step1": "Step 1 · Pipeline: six-step lightweight loop",
        "cards": [
            ("One-line requirement", "acceptance criteria inline", ORANGE, ORANGE_F),
            ("Task book", "Scope Lock + heartbeat", ORANGE, ORANGE_F),
            ("Implement", "controller or executor agent", GREEN, GREEN_F),
            ("Independent review", "review is mandatory", BLUE, BLUE_F),
            ("G-quick PASS", "commit + STATE line", RED, RED_F),
            ("Ship", "change delivered", GREEN, GREEN_F2),
        ],
        "note1": "No PRD / HLD / LLD; touching contracts or crossing modules auto-upgrades to Standard",
        "step2": "Step 2 · Output boundary: what stays, what doesn't",
        "left_title": "Quick Mode produces",
        "left": ["Task book (Scope Lock + heartbeat command)", "Code changes + commit", "Review record + one STATE line"],
        "right_title": "Quick Mode does NOT produce",
        "right": ["PRD / HLD / LLD", "Contract changes (contracts are out of Quick scope)", "Gate artifacts and traceability increments"],
        "step3": "Step 3 · Never waived (small changes stay traceable)",
        "bottom": ["Heartbeat + watchdog + ledgers as usual", "Independent review is mandatory: producers never judge their own output"],
    },
}


def draw_quick(lang, out):
    t = TQ[lang]
    cv = Cv(1560, 1000)
    cv.text(780, 46, t["title"], fb(26), INK)
    cv.text(780, 74, t["subtitle"], fr(14), SUB)

    cv.text(90, 112, t["step1"], fb(16), INK, anchor="lm")
    xs = [145, 365, 585, 805, 1025, 1245]
    ws = [190, 190, 190, 190, 190, 190]
    for (title, sub, bcol, fcol), x, w in zip(t["cards"], xs, ws):
        cv.rect(x, 138, w, 84, fill=fcol, outline=bcol, width=2, r=10)
        cv.auto_text(x + w / 2, 162, title, 14.5, True, w - 24)
        cv.auto_text(x + w / 2, 188, sub, 11.5, False, w - 24, SUB)
    for i in range(len(xs) - 1):
        cv.arrow(xs[i] + ws[i] - 3, 180, xs[i + 1] + 3, 180)
    cv.text(780, 252, t["note1"], fr(12.5), GRAY)

    cv.text(90, 300, t["step2"], fb(16), INK, anchor="lm")
    cv.rect(110, 330, 630, 156, fill=GREEN_F, outline=GREEN, width=2, r=12)
    cv.text(130, 358, t["left_title"], fb(15), INK, anchor="lm")
    ly = 388
    for ln in t["left"]:
        cv.auto_text(130, ly, ln, 12.5, False, 590, (68, 84, 106), anchor="lm")
        ly += 28
    cv.rect(830, 330, 630, 156, fill=RED_F, outline=RED, width=2, r=12)
    cv.text(850, 358, t["right_title"], fb(15), INK, anchor="lm")
    ly = 388
    for ln in t["right"]:
        cv.auto_text(850, ly, ln, 12.5, False, 590, (68, 84, 106), anchor="lm")
        ly += 28

    cv.text(90, 540, t["step3"], fb(16), INK, anchor="lm")
    cv.rect(110, 570, 1340, 128, fill=WHITE, outline=CARD_LN, width=1.5, r=12)
    ly = 606
    for ln in t["bottom"]:
        cv.auto_text(130, ly, ln, 13, False, 1280, (68, 84, 106), anchor="lm")
        ly += 30
    cv.save(out)


TS = {
    "zh": {
        "title": "标准模式 · 中型功能完整门禁",
        "subtitle": "A0 需求锚定 → PRD → HLD → 模块拆解 → LLD → 契约冻结 G4 → 开发实现 → 集成交付；门禁 G0-G5 逐关把关",
        "step1": "第一步 · 流程：八步 + 六门禁（评审通过才继续）",
        "stages": [
            ("A0 需求锚定", "REQ 可测无废案", RED, RED_F),
            ("PRD", "覆盖全部 REQ", BLUE, BLUE_F),
            ("HLD", "方案 + 风险", BLUE, BLUE_F),
            ("模块拆解", "3–8 模块 + 边界", BLUE, BLUE_F),
            ("LLD", "接口落契约", BLUE, BLUE2_F),
            ("契约冻结 G4", "禁止原地改", ORANGE, ORANGE_F),
            ("开发实现", "单测 + 契约测试", GREEN, GREEN_F),
            ("集成交付", "全量回归 + 发布", DGREEN, None),
        ],
        "gates": {0: "G0", 1: "G1", 2: "G2", 3: "G3", 6: "G5"},
        "note1": "门禁 G0-G5：评审通过才继续；G4 冻结后变更走版本升级；任何 agent 不得自评",
        "step2": "第二步 · 每步的三件事与门禁 owner",
        "cards": [
            ("产物落盘", ["每步完成时三件事同时发生", "产物 + Git tag + STATE 更新"], GREEN, GREEN_F),
            ("门禁 owner 明确", ["G0/G1 人类 · G2 人类+架构评审", "G3/G4 总控 · G5 独立 QA"], BLUE, BLUE_F),
            ("文档治理", ["INDEX 地图 + 门禁摘要收敛", "检索优先：会话只吃一小片"], ORANGE, ORANGE_F),
        ],
        "step3": "第三步 · 边界",
        "bottom": ["单史诗 3–8 个模块，超过 8 必须再切一刀", "每个里程碑/史诗独立跑完整流程，产品层不重复"],
        "step4": "第四步 · 执行纪律（进入子 agent 阶段必守）",
        "discipline": ["任务书自包含 + current.md 兜底；心跳 60s / watchdog 3-8-15 判卡死", "子 agent 禁止递归；spawn 失败重试 ≤2 次后上报，禁止主会话代做"],
    },
    "en": {
        "title": "Standard Mode · Full Gates for Medium Features",
        "subtitle": "A0 Anchor → PRD → HLD → Module Split → LLD → Contract Freeze G4 → Build → Integrate; gates G0-G5 check every step",
        "step1": "Step 1 · Pipeline: eight steps + six gates (proceed only after review)",
        "stages": [
            ("A0 Anchor", "testable REQs", RED, RED_F),
            ("PRD", "covers all REQs", BLUE, BLUE_F),
            ("HLD", "design + risks", BLUE, BLUE_F),
            ("Split", "3-8 modules + boundaries", BLUE, BLUE_F),
            ("LLD", "interfaces to contracts", BLUE, BLUE2_F),
            ("Freeze G4", "no in-place edits", ORANGE, ORANGE_F),
            ("Build", "unit + contract tests", GREEN, GREEN_F),
            ("Integrate", "full regression + release", DGREEN, None),
        ],
        "gates": {0: "G0", 1: "G1", 2: "G2", 3: "G3", 6: "G5"},
        "note1": "Gates G0-G5: proceed only after review; after G4 freeze, changes ship as version upgrades; no agent reviews itself",
        "step2": "Step 2 · Three things per step + gate owners",
        "cards": [
            ("Artifacts land", ["all three happen at once per step", "artifact + Git tag + STATE update"], GREEN, GREEN_F),
            ("Gate owners", ["G0/G1 human · G2 human + architect", "G3/G4 controller · G5 independent QA"], BLUE, BLUE_F),
            ("Doc governance", ["INDEX map + gate summary convergence", "search-first: sessions load a slice"], ORANGE, ORANGE_F),
        ],
        "step3": "Step 3 · Boundaries",
        "bottom": ["3-8 modules per epic; split again beyond 8", "every milestone/epic runs the full flow; the product layer never repeats it"],
        "step4": "Step 4 · Discipline (mandatory once sub-agents start)",
        "discipline": ["Self-contained task books + current.md fallback; heartbeat 60s / watchdog 3-8-15 stale detection", "Sub-agents must not spawn; after ≤2 failed retries, report to the human instead of doing the work in the main session"],
    },
}


def draw_standard(lang, out):
    t = TS[lang]
    cv = Cv(1560, 1180)
    cv.text(780, 46, t["title"], fb(26), INK)
    cv.text(780, 74, t["subtitle"], fr(14), SUB)

    cv.text(90, 112, t["step1"], fb(16), INK, anchor="lm")
    x0, cw, gap = 110, 150, 26
    ys = 138
    for i, (title, sub, bcol, fcol) in enumerate(t["stages"]):
        x = x0 + i * (cw + gap)
        if fcol is None:
            cv.rect(x, ys, cw, 86, fill=bcol, width=0, r=10)
            cv.auto_text(x + cw / 2, ys + 30, title, 13.5, True, cw - 14, WHITE)
            cv.auto_text(x + cw / 2, ys + 56, sub, 11, False, cw - 14, DGREEN_T)
        else:
            cv.rect(x, ys, cw, 86, fill=fcol, outline=bcol, width=2, r=10)
            cv.auto_text(x + cw / 2, ys + 30, title, 13.5, True, cw - 14)
            cv.auto_text(x + cw / 2, ys + 56, sub, 11, False, cw - 14, SUB)
    for gi, label in t["gates"].items():
        chip_x = x0 + (gi + 1) * (cw + gap) - gap + 1
        cv.rect(chip_x, ys + 34, 24, 20, fill=RED_F, outline=RED, width=1.5, r=6)
        cv.auto_text(chip_x + 12, ys + 44, label, 10, True, 20, RED)
        cv.arrow(x0 + gi * (cw + gap) + cw - 2, ys + 44, chip_x, ys + 44)
        cv.arrow(chip_x + 24, ys + 44, x0 + (gi + 1) * (cw + gap) + 2, ys + 44)
    cv.text(780, 262, t["note1"], fr(12.5), GRAY)

    cv.text(90, 316, t["step2"], fb(16), INK, anchor="lm")
    xs = [110, 580, 1050]
    ws = [440, 440, 440]
    for (title, lines, bcol, fcol), x, w in zip(t["cards"], xs, ws):
        cv.rect(x, 346, w, 122, fill=fcol, outline=bcol, width=2, r=12)
        cv.text(x + 20, 372, title, fb(15), INK, anchor="lm")
        ly = 404
        for ln in lines:
            cv.auto_text(x + 20, ly, ln, 12.5, False, w - 40, (68, 84, 106), anchor="lm")
            ly += 28

    cv.text(90, 530, t["step3"], fb(16), INK, anchor="lm")
    cv.rect(110, 560, 1340, 116, fill=WHITE, outline=CARD_LN, width=1.5, r=12)
    ly = 594
    for ln in t["bottom"]:
        cv.auto_text(130, ly, ln, 13, False, 1280, (68, 84, 106), anchor="lm")
        ly += 30

    cv.text(90, 740, t["step4"], fb(16), INK, anchor="lm")
    cv.rect(110, 770, 1340, 116, fill=BLUE2_F, outline=BLUE, width=1.5, r=12)
    ly = 804
    for ln in t["discipline"]:
        cv.auto_text(130, ly, ln, 13, False, 1280, (68, 84, 106), anchor="lm")
        ly += 30
    cv.save(out)


TE = {
    "zh": {
        "title": "大型模式 · 新系统 / 大史诗",
        "subtitle": "产品 → 史诗 → 模块 → 里程碑：每个史诗独立跑标准流程，只通过契约注册表衔接",
        "s1": "第一步 · 产品按业务能力切分成史诗（人定边界，agent 提候选）",
        "product": ("产品（整个系统）", "= 所有业务能力的总和"),
        "split_label": "按业务能力切分",
        "epics": [
            ("EPIC-01 账户与认证", ["契约奠基 · 第一个做", "定义用户/会话共享契约", "最小可验证路径（薄片）"], ORANGE, ORANGE_F),
            ("EPIC-02 商品目录", ["完整跑一遍标准流程", "引用 EPIC-01 契约", "↓ 下方展开模块并行"], GREEN, GREEN_F2),
            ("EPIC-03 购物车", ["独立跑标准流程", "依赖 EPIC-01/02 契约", "引入购物车契约"], BLUE, BLUE_F),
            ("EPIC-04 订单与支付", ["独立跑标准流程", "依赖购物车契约", "核心交易闭环"], PURPLE, PURPLE_F),
            ("EPIC-05 后台管理", ["独立跑标准流程", "依赖全部前置契约", "最后一个做"], VIOLET, VIOLET_F),
        ],
        "s1_note": "每个史诗都是一次完整的 A0→G0→PRD→G1→HLD→G2→拆解→G3→LLD→G4→开发→G5→集成 循环；史诗之间不共享上下文，只通过契约注册表衔接",
        "s2": "第二步 · 单史诗内部：标准流程 + 模块并行（无依赖模块每批 2–3 个）",
        "pipe": [
            ("A0 需求锚定", "REQ 清单 · 可测 · 无废案", RED, RED_F),
            ("PRD", "覆盖全部 REQ", BLUE, BLUE_F),
            ("HLD", "技术方案 · 风险", BLUE, BLUE_F),
            ("模块拆解", "3–8 个模块 + 边界", BLUE, BLUE2_F),
        ],
        "pipe_labels": ["PRD", "HLD", "模块范围"],
        "b4_title": "模块设计员",
        "b4": ["B-4-1 LLD · 模块A", "B-4-2 LLD · 模块B", "B-4-3 LLD · 模块C"],
        "b4_note": "接口登记契约注册表",
        "b4_max": "…最多 8 个",
        "b5_title": "模块开发员",
        "b5": ["B-5-1 实现 · 模块A", "B-5-2 实现 · 模块B", "B-5-3 实现 · 模块C"],
        "b5_note": "单测 + 契约测试",
        "integration": ("集成：CI 编译 + 契约测试 + 全量回归", "代码合入 main · 产出可交付史诗增量"),
        "s2_note": "门禁 G0-G5：评审通过才继续；契约冻结（G4）后变更走版本升级，禁止原地改已冻结文档；每 agent 独立任务书 + 独立心跳文件，禁止递归 spawn",
        "s3": "第三步 · 史诗汇合 → 里程碑（可发布增量；依赖图由总控推导，范围与日期由人拍板）",
        "milestones": [
            ("里程碑 M1", ORANGE, ORANGE_F, ["EPIC-01", "EPIC-02"],
             "可发布增量1：注册 / 登录 / 浏览商品 —— 薄片验证架构，契约奠基（先做）"),
            ("里程碑 M2", GREEN, (237, 247, 239), ["EPIC-01", "EPIC-02", "EPIC-03", "EPIC-04"],
             "可发布增量2：购物车 / 下单 / 支付 —— 核心交易闭环（依赖 M1）"),
            ("里程碑 M3", PURPLE, (238, 241, 251), ["EPIC-01", "EPIC-02", "EPIC-03", "EPIC-04", "EPIC-05"],
             "可发布增量3：后台管理 —— 产品完整可用（对外交付承诺：范围 + 日期由人签字）"),
        ],
        "b1_title": "④ 谁负责切分（委托度可配置）",
        "b1": [
            "产品 → 史诗：人定业务能力边界，agent 提候选（业务判断）",
            "史诗 → 模块：B-3 按冻结 HLD 拆 3–8 个（可全委托）",
            "史诗 → 里程碑：agent 推导依赖图，人定范围与日期（承诺签字）",
            "全委托前提：优先级 / 硬日期 / 约束已写成输入文档",
        ],
        "b2_title": "⑤ 拆得太大的红线信号",
        "b2": [
            "薄片先行：先跑通最小可验证路径，再横向铺开",
            "单史诗 > 8 个模块 / 单模块实现 > 3 周 → 再切一刀",
            "A0 蒸馏一个会话未收敛 / PRD 超过十几页 → 史诗过大",
            "契约奠基史诗（EPIC-01）必须最先跑，其余引用其契约",
        ],
    },
    "en": {
        "title": "Enterprise Mode · New System / Big Epic",
        "subtitle": "Product → Epics → Modules → Milestones: every epic runs the Standard flow independently, linked only through the contract registry",
        "s1": "Step 1 · Split the product into epics by business capability (humans set boundaries, agents propose candidates)",
        "product": ("Product", "= sum of all business capabilities"),
        "split_label": "split by capability",
        "epics": [
            ("EPIC-01 Account & Auth", ["contract foundation · do first", "defines user/session contracts", "smallest verifiable slice"], ORANGE, ORANGE_F),
            ("EPIC-02 Catalog", ["full Standard flow", "references EPIC-01 contracts", "parallel modules below"], GREEN, GREEN_F2),
            ("EPIC-03 Cart", ["independent Standard flow", "depends on EPIC-01/02", "introduces cart contract"], BLUE, BLUE_F),
            ("EPIC-04 Order & Pay", ["independent Standard flow", "depends on cart contract", "core transaction loop"], PURPLE, PURPLE_F),
            ("EPIC-05 Admin", ["independent Standard flow", "depends on all prior", "done last"], VIOLET, VIOLET_F),
        ],
        "s1_note": "Every epic is a full A0→G0→PRD→G1→HLD→G2→Split→G3→LLD→G4→Build→G5→Integrate loop; epics share no context, only the contract registry",
        "s2": "Step 2 · Inside one epic: Standard flow + parallel modules (independent modules run in batches of 2-3)",
        "pipe": [
            ("A0 Anchor", "REQs · testable · no junk", RED, RED_F),
            ("PRD", "covers all REQs", BLUE, BLUE_F),
            ("HLD", "design · risks", BLUE, BLUE_F),
            ("Split", "3-8 modules + boundaries", BLUE, BLUE2_F),
        ],
        "pipe_labels": ["PRD", "HLD", "module scope"],
        "b4_title": "Module Designers",
        "b4": ["B-4-1 LLD · Module A", "B-4-2 LLD · Module B", "B-4-3 LLD · Module C"],
        "b4_note": "interfaces → contract registry",
        "b4_max": "…up to 8",
        "b5_title": "Module Developers",
        "b5": ["B-5-1 Build · Module A", "B-5-2 Build · Module B", "B-5-3 Build · Module C"],
        "b5_note": "unit + contract tests",
        "integration": ("Integrate: CI build + contract tests + full regression", "merge to main · shippable epic increment"),
        "s2_note": "Gates G0-G5: proceed only after review; after freeze (G4), changes ship as version upgrades — no in-place edits; each agent gets its own task book and heartbeat file; recursive spawn is forbidden",
        "s3": "Step 3 · Epics converge → milestones (shippable increments; the controller derives the dependency graph, humans sign scope and dates)",
        "milestones": [
            ("Milestone M1", ORANGE, ORANGE_F, ["EPIC-01", "EPIC-02"],
             "Increment 1: sign-up / login / browse catalog — thin slice validates architecture, lays contract foundation"),
            ("Milestone M2", GREEN, (237, 247, 239), ["EPIC-01", "EPIC-02", "EPIC-03", "EPIC-04"],
             "Increment 2: cart / checkout / payment — core transaction loop (depends on M1)"),
            ("Milestone M3", PURPLE, (238, 241, 251), ["EPIC-01", "EPIC-02", "EPIC-03", "EPIC-04", "EPIC-05"],
             "Increment 3: admin — product fully usable (scope + dates signed by humans)"),
        ],
        "b1_title": "④ Who splits (delegation is configurable)",
        "b1": [
            "Product → epics: humans set capability boundaries, agents propose candidates",
            "Epic → modules: B-3 splits 3-8 from the frozen HLD (fully delegable)",
            "Epic → milestones: agents derive the graph, humans sign scope and dates",
            "Full delegation requires priorities / hard dates / constraints as input docs",
        ],
        "b2_title": "⑤ Red flags for oversized splits",
        "b2": [
            "Thin slice first: prove the smallest path before spreading out",
            "Epic > 8 modules / module build > 3 weeks → split again",
            "A0 not converged in one session / PRD beyond a dozen pages → epic too big",
            "Contract foundation epic (EPIC-01) must run first; everything else references its contracts",
        ],
    },
}


def draw_enterprise(lang, out):
    t = TE[lang]
    cv = Cv(1560, 1320)
    cv.text(780, 46, t["title"], fb(26), INK)
    cv.text(780, 74, t["subtitle"], fr(14), SUB)

    # legend
    lx = 1150
    for label, color in [("需求锚定", RED), ("设计", BLUE), ("实现/集成", GREEN)] if lang == "zh" else [("Anchor", RED), ("Design", BLUE), ("Build/Integrate", GREEN)]:
        cv.d.rectangle([lx * S, 32 * S, (lx + 10) * S, 42 * S], fill=color)
        cv.text(lx + 14, 37, label, fr(11), INK, anchor="lm")
        lx += 14 + cv.text_w(label, 11, False) + 22

    # section 1: product -> epics
    cv.text(90, 108, t["s1"], fb(15), INK, anchor="lm")
    cv.rect(640, 120, 280, 64, fill=PRODUCT, width=0, r=12)
    cv.text(780, 147, t["product"][0], fb(18), WHITE)
    cv.text(780, 170, t["product"][1], fr(12.5), PSUB)
    cv.arrow(780, 184, 780, 212)
    cv.text(792, 204, t["split_label"], fr(12), GRAY, anchor="lm")
    xs = [115, 385, 655, 925, 1195]
    for (title, lines, bcol, fcol), x in zip(t["epics"], xs):
        cv.rect(x, 222, 250, 120, fill=fcol, outline=bcol, width=2, r=12)
        cx = x + 125
        cv.auto_text(cx, 250, title, 14.5, True, 230)
        cv.auto_text(cx, 275, lines[0], 12, False, 230, (68, 84, 106))
        cv.auto_text(cx, 296, lines[1], 12, False, 230, (68, 84, 106))
        cv.auto_text(cx, 317, lines[2], 12, False, 230, (68, 84, 106))
    cv.text(780, 363, t["s1_note"], fr(12.5), GRAY)

    # section 2: standard flow + parallel modules
    cv.text(90, 400, t["s2"], fb(15), INK, anchor="lm")
    pxs = [90, 274, 458, 642]
    for (t1, t2, bcol, fcol), x in zip(t["pipe"], pxs):
        cv.rect(x, 424, 150, 66, fill=fcol, outline=bcol, width=2, r=10)
        cv.auto_text(x + 75, 451, t1, 13.5, True, 130)
        cv.auto_text(x + 75, 473, t2, 11, False, 130, SUB)
    for i in range(3):
        cv.arrow(pxs[i] + 150, 457, pxs[i + 1], 457)
    for i, lbl in enumerate(t["pipe_labels"]):
        cv.text(pxs[i] + 167, 446, lbl, fr(11), GRAY)
    cv.arrow(717, 490, 270, 540)
    cv.arrow(717, 490, 710, 540)
    cv.arrow(717, 490, 1150, 540)
    cv.text(733, 505, t["b4_title"], fr(11.5), GRAY, anchor="lm")
    cv.text(733, 590, t["b5_title"], fr(11.5), GRAY, anchor="lm")
    b4x = [140, 580, 1020]
    for x, name in zip(b4x, t["b4"]):
        cv.rect(x, 540, 260, 52, fill=BLUE2_F, outline=BLUE, width=2, r=10)
        cv.auto_text(x + 130, 562, name, 13.5, True, 240)
        cv.auto_text(x + 130, 582, t["b4_note"], 11, False, 240, SUB)
    cv.text(1300, 562, t["b4_max"], fr(11), SUB, anchor="lm")
    for x in b4x:
        cv.arrow(x + 130, 592, x + 130, 640)
    b5x = [140, 580, 1020]
    for x, name in zip(b5x, t["b5"]):
        cv.rect(x, 640, 260, 52, fill=GREEN_F, outline=GREEN, width=2, r=10)
        cv.auto_text(x + 130, 662, name, 13.5, True, 240)
        cv.auto_text(x + 130, 682, t["b5_note"], 11, False, 240, SUB)
    cv.arrow(270, 692, 620, 748)
    cv.arrow(710, 692, 780, 748)
    cv.arrow(1150, 692, 940, 748)
    cv.rect(560, 748, 440, 60, fill=DGREEN, width=0, r=12)
    cv.auto_text(780, 774, t["integration"][0], 13.5, True, 420, WHITE)
    cv.auto_text(780, 794, t["integration"][1], 12, False, 420, DGREEN_T)
    cv.text(780, 828, t["s2_note"], fr(12), SUB)

    # section 3: milestones
    cv.text(90, 866, t["s3"], fb(15), INK, anchor="lm")
    my = 884
    epic_border = {"EPIC-01": ORANGE, "EPIC-02": GREEN, "EPIC-03": BLUE, "EPIC-04": PURPLE, "EPIC-05": VIOLET}
    for label, bcol, fcol, chips, desc in t["milestones"]:
        cv.rect(190, my, 1180, 74, fill=fcol, outline=bcol, width=2, r=12)
        cv.rect(206, my + 14, 120, 40, fill=bcol, width=0, r=8)
        cv.auto_text(266, my + 34, label, 13, True, 104, WHITE)
        cx = 350
        for c in chips:
            cv.rect(cx, my + 16, 96, 30, fill=WHITE, outline=epic_border[c], width=2, r=6)
            cv.auto_text(cx + 48, my + 31, c, 12, True, 88)
            cx += 112
        cv.auto_text(780, my + 58, desc, 12.5, False, 640, (68, 84, 106))
        my += 88

    # bottom cards
    cv.rect(90, 1164, 690, 126, fill=WHITE, outline=CARD_LN, width=1.5, r=12)
    cv.text(110, 1190, t["b1_title"], fb(15), INK, anchor="lm")
    ly = 1215
    for ln in t["b1"]:
        cv.auto_text(110, ly, ln, 12.5, False, 650, (68, 84, 106), anchor="lm")
        ly += 23
    cv.rect(800, 1164, 690, 126, fill=WHITE, outline=CARD_LN, width=1.5, r=12)
    cv.text(820, 1190, t["b2_title"], fb(15), INK, anchor="lm")
    ly = 1215
    for ln in t["b2"]:
        cv.auto_text(820, ly, ln, 12.5, False, 650, (68, 84, 106), anchor="lm")
        ly += 23
    cv.save(out)


def main():
    base = r"D:\Agent\work space\services\codex树形标准开发流程"
    draw_quick("zh", base + r"\flow-quick-zh.png")
    draw_quick("en", base + r"\flow-quick-en.png")
    draw_standard("zh", base + r"\flow-standard-zh.png")
    draw_standard("en", base + r"\flow-standard-en.png")
    draw_enterprise("zh", base + r"\flow-enterprise-zh.png")
    draw_enterprise("en", base + r"\flow-enterprise-en.png")


if __name__ == "__main__":
    main()
