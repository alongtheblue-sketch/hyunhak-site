#!/usr/bin/env python3
# 2026-09-23 critic 5회차 regress 보조: A/B(c342aff -> 507edf1) 차이 띠를 의도 구역 좌표(locate_ab.json)와 대조해 자동 1차 분류한다.
# r4/probe_regress_bands.py 파생. 입력 = regress_ab.json(r3/probe_regress_compare.py 산출), locate_ab.json(probe_regress_ab.mjs 산출).
# 분류 규칙(1차. 최종은 crop 을 눈으로 본 뒤 요약표에 적는다):
#   ft   = 띠가 post(또는 pre) 푸터 .ft-legal rect(위아래 4px 여유) 안
#   pop  = 홈 팝업 캡처에서 띠가 활성 카드 .pop 아래 끝(= 하단바 윗선) 위아래 3px 안
#   join = 띠가 가입 면 약관 행(.check) rect 안
#   ?    = 그 밖(눈으로 볼 대상)
# 크기가 다른 면은 위 정렬과 아래 정렬 결과를 그대로 적고 ? 로 둔다(이번 수리는 높이를 바꾸지 않아야 한다).
# 사용: python3 probe_regress_bands.py [REGRESS_JSON] [LOCATE_JSON] [OUT_JSON]
import json, os, sys

H = os.path.dirname(os.path.abspath(__file__))
REG = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(H, "regress_ab.json")))["pairs"]
LOC = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(H, "locate_ab.json")))["loc"]
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(H, "regress_bands.json")


def inside(bd, rect, pad=4):
    return rect is not None and bd["y0"] >= rect[1] - pad and bd["y1"] <= rect[3] + pad


def classify(name, bd):
    L = LOC.get(name, {})
    if name.startswith("index_popup"):
        for v in ("post", "pre"):
            m = L.get(v)
            if m and m.get("on"):
                yb = m["on"][3]
                if bd["y0"] >= yb - 3 and bd["y1"] <= yb + 3:
                    return "pop"
        return "?"
    for v in ("post", "pre"):
        m = L.get(v)
        if not m:
            continue
        if inside(bd, m.get("ftLegal")):
            return "ft"
        if any(inside(bd, c["row"]) for c in m.get("checks", [])):
            return "join"
    return "?"


out = {}
for name, r in sorted(REG.items()):
    rec = {"name": name, "pre_size": r.get("base_size"), "post_size": r.get("new_size"), "same_size": r.get("same_size")}
    if r.get("same_size"):
        rec["ae"] = r["ae"]
        bl = r.get("bands", [])
        pairs = r.get("pairs") or []
        rec["bands"] = [{**bd, "cls": classify(name, bd), "pair": pairs[i] if i < len(pairs) else None} for i, bd in enumerate(bl)]
    else:
        rec["top_ae"], rec["bot_ae"] = r["top"]["ae"], r["bottom"]["ae"]
        rec["bands"] = [{**bd, "cls": "?", "part": "top"} for bd in r["top"].get("bands", [])]
    rec["n_bands"] = len(rec["bands"])
    rec["cls_count"] = {k: sum(1 for b in rec["bands"] if b["cls"] == k) for k in ("ft", "pop", "join", "?")}
    out[name] = rec
    size = "x".join(map(str, rec["pre_size"] or [])) + ("" if r.get("same_size") else " -> " + "x".join(map(str, rec["post_size"] or [])))
    ae_s = rec.get("ae", f"top={rec.get('top_ae')} bot={rec.get('bot_ae')}")
    print(f"{name}\t{size}\tAE={ae_s}\tbands={rec['n_bands']}\t{rec['cls_count']}\t" + " ".join(f"[{b['y0']}-{b['y1']} x{b['x0']}-{b['x1']} {b['px']}px {b['cls']}]" for b in rec["bands"]))
json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)
