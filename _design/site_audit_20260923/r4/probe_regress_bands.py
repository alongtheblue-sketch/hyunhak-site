#!/usr/bin/env python3
# 2026-09-23 critic 4회차 regress 보조: A/B(87106d8 → c342aff) 차이 띠를 의도 구역 좌표(locate_ab.json)와 대조해 자동 1차 분류한다.
# 입력 = regress_ab.json(r3/probe_regress_compare.py 산출), locate_ab.json(probe_regress_locate.mjs 산출), shots/ab_pre, shots/ab_post.
# 크기가 다른 면(홈 캡션 간격 +16px, 가입 면)은 이동 비교: pre 를 분할선 ys 에서 자르고 위는 그대로, 아래는 post 를 dy 만큼 내려 잘라 비교한다
#   (= post 를 dy 위로 crop). 두 조각의 차이 픽셀과 띠를 따로 적는다. 차이 수 = magick compare -metric AE -fuzz 2% (compare 스크립트와 같음).
# 분류 규칙(1차, 최종은 crop 을 눈으로 본 뒤 CLASS 표로 확정):
#   ft   = 띠가 post(또는 pre) 푸터 .ft-legal rect(위아래 4px 여유) 안
#   join = 띠가 가입 면 약관 행(.check) rect 안
#   ?    = 그 밖(눈으로 볼 대상)
# 사용: python3 probe_regress_bands.py [PRE_DIR] [POST_DIR] [OUT_JSON] [DIFF_DIR]
import json, os, subprocess, sys
from PIL import Image

H = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(H, "shots", "ab_pre"))
POST = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(H, "shots", "ab_post"))
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(H, "regress_bands.json")
DIFF = os.path.abspath(sys.argv[4] if len(sys.argv) > 4 else os.path.join(H, "diff_ab", "shift"))
os.makedirs(os.path.join(DIFF, "pair"), exist_ok=True)
GAP, PAD = 24, 16
REG = json.load(open(os.path.join(H, "regress_ab.json")))["pairs"]
LOC = json.load(open(os.path.join(H, "locate_ab.json")))


def ae(a, b, mask):
    r = subprocess.run(["magick", "compare", "-metric", "AE", "-fuzz", "2%", a, b, "null:"], capture_output=True, text=True)
    n = int(float((r.stderr or r.stdout).strip().split()[0]))
    subprocess.run(["magick", "compare", "-fuzz", "2%", a, b, "-compose", "src", "-highlight-color", "white", "-lowlight-color", "black", mask], capture_output=True, text=True)
    return n


def bands(mask):
    m = Image.open(mask).convert("L").point(lambda v: 255 if v > 127 else 0)
    w, h = m.size
    data = m.tobytes()
    rows = [y for y in range(h) if data[y * w:(y + 1) * w].count(0) != w]
    out = []
    for y in rows:
        if out and y - out[-1][1] <= GAP:
            out[-1][1] = y
        else:
            out.append([y, y])
    res = []
    for y0, y1 in out:
        bb = m.crop((0, y0, w, y1 + 1)).getbbox()
        x0, x1 = (bb[0], bb[2]) if bb else (0, w)
        res.append({"y0": y0, "y1": y1 + 1, "x0": x0, "x1": x1, "px": sum(1 for v in m.crop((x0, y0, x1, y1 + 1)).tobytes() if v)})
    return res


def inside(bd, rect, oy=0, pad=4):
    return rect is not None and bd["y0"] + oy >= rect[1] - pad and bd["y1"] + oy <= rect[3] + pad


def classify(bd, loc_pre, loc_post, oy_pre=0, oy_post=0):
    for v, oy in (("post", oy_post), ("pre", oy_pre)):
        L = loc_post if v == "post" else loc_pre
        if L and inside(bd, L.get("ftLegal"), oy):
            return "ft"
        if L and any(inside(bd, c["row"], oy) for c in L.get("checks", [])):
            return "join"
    return "?"


def pair_png(ia, ib, bd, key, idx, oa, ob):
    x0, x1 = max(0, bd["x0"] - PAD), min(ia.width, bd["x1"] + PAD)
    y0, y1 = max(0, bd["y0"] - PAD), min(bd["y1"] + PAD, bd["y0"] - PAD + 900)
    ca = ia.crop((x0, y0 + oa, x1, min(ia.height, y1 + oa)))
    cb = ib.crop((x0, y0 + ob, x1, min(ib.height, y1 + ob)))
    c = Image.new("RGB", (ca.width + cb.width + 12, max(ca.height, cb.height)), (255, 0, 255))
    c.paste(ca, (0, 0)); c.paste(cb, (ca.width + 12, 0))
    p = os.path.join(DIFF, "pair", f"{key}__band{idx}_y{bd['y0'] + oa}-{bd['y1'] + oa}.png")
    c.save(p)
    return p


def seg(name, ia, ib, ya0, ya1, dy, tag, loc_pre, loc_post):
    """pre 의 [ya0, ya1) 과 post 의 [ya0+dy, ya1+dy) 비교."""
    w = min(ia.width, ib.width)
    a = os.path.join(DIFF, f"{name}__{tag}_a.png"); b = os.path.join(DIFF, f"{name}__{tag}_b.png"); m = os.path.join(DIFF, f"{name}__{tag}_mask.png")
    ia.crop((0, ya0, w, ya1)).save(a); ib.crop((0, ya0 + dy, w, ya1 + dy)).save(b)
    n = ae(a, b, m)
    rec = {"tag": tag, "pre_y": [ya0, ya1], "post_y": [ya0 + dy, ya1 + dy], "ae": n}
    if n:
        bl = bands(m)
        for i, bd in enumerate(bl):
            bd["pre_y"] = [bd["y0"] + ya0, bd["y1"] + ya0]
            bd["cls"] = classify(bd, loc_pre, loc_post, ya0, ya0 + dy)
            if i < 12:
                bd["pair"] = pair_png(ia, ib, bd, f"{name}__{tag}", i, ya0, ya0 + dy)
        rec["bands"] = bl
    for f in (a, b, m):
        os.remove(f)
    return rec


out = {}
for name, r in sorted(REG.items()):
    loc = LOC.get(name, {})
    lp, lq = loc.get("pre"), loc.get("post")
    rec = {"name": name, "pre_size": r.get("base_size"), "post_size": r.get("new_size")}
    if r.get("same_size"):
        rec["ae"] = r["ae"]
        bl = r.get("bands", [])
        rec["bands"] = [{**bd, "cls": classify(bd, lp, lq), "pair": (r.get("pairs") or [None] * 99)[i] if i < 12 else None} for i, bd in enumerate(bl)]
    else:
        ia = Image.open(os.path.join(PRE, name + ".png")).convert("RGB")
        ib = Image.open(os.path.join(POST, name + ".png")).convert("RGB")
        dy = ib.height - ia.height
        # 분할선: 홈 = 캡션(.help) 아래 끝(pre), 그 밖 = 첫 차이가 나는 약관 행 위 끝(pre). 좌표를 못 구하면 위 정렬 첫 띠 시작.
        ys = None
        if name.startswith("index_nopop") and lp and lp.get("help"):
            ys = lp["help"][3]
        elif lp and lp.get("checks"):
            # 높이가 달라진 약관 행 = pre 와 post rect 높이가 다른 첫 행
            for cp, cq in zip(lp["checks"], lq["checks"]):
                if (cp["row"][3] - cp["row"][1]) != (cq["row"][3] - cq["row"][1]):
                    ys = cp["row"][3]; break
        if ys is None:
            ys = r["top"]["bands"][0]["y0"] if r["top"].get("bands") else ia.height
        rec.update({"dy": dy, "split_pre_y": ys, "above": seg(name, ia, ib, 0, ys, 0, "above", lp, lq), "below": seg(name, ia, ib, ys, ia.height, dy, "below", lp, lq)})
        rec["ae_shifted"] = rec["above"]["ae"] + rec["below"]["ae"]
        rec["bands"] = [dict(b, part="above") for b in rec["above"].get("bands", [])] + [dict(b, part="below") for b in rec["below"].get("bands", [])]
    rec["n_bands"] = len(rec["bands"])
    rec["cls_count"] = {k: sum(1 for b in rec["bands"] if b["cls"] == k) for k in ("ft", "join", "?")}
    out[name] = rec
    size = "x".join(map(str, rec["pre_size"] or [])) + ("" if r.get("same_size") else " -> " + "x".join(map(str, rec["post_size"] or [])))
    ae_s = rec.get("ae", f"shift dy={rec.get('dy')} ys={rec.get('split_pre_y')} above={rec.get('above', {}).get('ae')} below={rec.get('below', {}).get('ae')}")
    print(f"{name}\t{size}\tAE={ae_s}\tbands={rec['n_bands']}\t{rec['cls_count']}\t" + " ".join(f"[{b.get('pre_y', [b['y0'], b['y1']])[0]}-{b.get('pre_y', [b['y0'], b['y1']])[1]} x{b['x0']}-{b['x1']} {b['px']}px {b['cls']}]" for b in rec["bands"]))
json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)
