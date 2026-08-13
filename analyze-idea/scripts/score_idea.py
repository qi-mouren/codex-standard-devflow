#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
score_idea.py - 对六维度评分做加权汇总，输出倾向建议。

用法:
  python score_idea.py --pain 4 --market 3 --model 4 --resources 3 --risk 2 --validate 5
可选:
  --weights pain=0.20,market=0.15,model=0.20,resources=0.15,risk=0.15,validate=0.15

说明:
  - 分数均为 1-5
  - 风险维度分数越高 = 风险越低
  - 分数是决策输入，不是决策本身；任一维度 1 分需先解释
"""

import argparse

DEFAULT_WEIGHTS = {
    "pain": 0.20,      # 客户与痛点
    "market": 0.15,    # 市场与时机
    "model": 0.20,     # 商业模式
    "resources": 0.15, # 资源与竞争
    "risk": 0.15,      # 风险与合规
    "validate": 0.15,  # 验证路径
}

LABELS = {
    "pain": "客户与痛点",
    "market": "市场与时机",
    "model": "商业模式",
    "resources": "资源与竞争",
    "risk": "风险与合规",
    "validate": "验证路径",
}


def parse_weights(raw: str) -> dict:
    weights = dict(DEFAULT_WEIGHTS)
    if not raw:
        return weights
    for item in raw.split(","):
        key, _, val = item.strip().partition("=")
        key = key.strip().lower()
        if key not in DEFAULT_WEIGHTS:
            raise ValueError(f"未知维度: {key}")
        weights[key] = float(val)
    total = sum(weights.values())
    if abs(total - 1.0) > 1e-6:
        raise ValueError(f"权重之和必须为 1，当前为 {total:.2f}")
    return weights


def main() -> None:
    parser = argparse.ArgumentParser(description="六维度想法评分汇总")
    for key in DEFAULT_WEIGHTS:
        parser.add_argument(f"--{key}", type=int, required=True,
                            help=f"{LABELS[key]} (1-5)")
    parser.add_argument("--weights", default="", help="自定义权重，如 pain=0.2,market=0.1,...（和必须为 1）")
    args = parser.parse_args()

    weights = parse_weights(args.weights)
    scores = {}
    for key in DEFAULT_WEIGHTS:
        val = getattr(args, key)
        if val < 1 or val > 5:
            parser.error(f"--{key} 必须在 1-5 之间，收到 {val}")
        scores[key] = val

    total = sum(weights[k] * scores[k] for k in DEFAULT_WEIGHTS)

    print("\n六维度评分汇总")
    print("-" * 46)
    for key in DEFAULT_WEIGHTS:
        print(f"  {LABELS[key]:<8} {scores[key]}/5  (权重 {weights[key]:.0%})")
    print("-" * 46)
    print(f"  加权总分: {total:.2f}/5\n")

    if total >= 3.5:
        advice = "倾向 Go"
    elif total >= 2.5:
        advice = "倾向调整后 Go（列明必须调整项）"
    else:
        advice = "倾向 No-Go"

    print(f"建议: {advice}")

    low = [LABELS[k] for k in DEFAULT_WEIGHTS if scores[k] == 1]
    if low:
        print(f"警告: 维度 {', '.join(low)} 为 1 分，即使总分达标也需先解释。")
    print("注意: 分数是决策输入，最终决策权在人。")


if __name__ == "__main__":
    main()