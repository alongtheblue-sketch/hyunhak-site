#!/usr/bin/env python3
# 2026-09-23 critic 7회차 regress 분류 보조: pre(96be167) vs post(ab9160d) 차이 픽셀을 같은 판 재촬영(rep1) 과 대조해 나눈다.
# 입력 = shots/ab_pre, ab_post, ab_pre_rep1, ab_post_rep1 (같은 이름 PNG), locate_ab.json(팝업 사각형).
# 픽셀 단위 규칙(fuzz 2% = 채널 차 최대값 > 255*0.02 를 차이로 본다, magick compare -fuzz 2% 와 같은 문턱을 근사):
#   D  = pre vs post 차이 마스크
#   J  = (pre vs pre_rep1) ∪ (post vs post_rep1) 를 3x3 팽창한 마스크 = 같은 판 안에서 흔들린 자리
#   X  = pre_rep1 vs post_rep1 차이 마스크 = 판 차이가 다시 찍어도 나오는지
#   stable = D ∩ X ∖ J  (두 번 다 나오고 같은 판 안에서는 안 흔들린 차이 = 코드 차이)
#   jitter = D ∖ stable
# 팝업 샷은 stable 픽셀을 팝업 사각형(두 판 활성 카드, 하단바, 측면 카드 합집합 + 여유 4px) 안과 밖으로 나눈다.
# 사용: python3 classify_regress.py  → classify_raw.json (분류 판정은 사람이 띠 crop 을 열어 보고 regress_classify.json 에 적는다)
import json, os, sys
from PIL import Image, ImageChops, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(HERE, "shots")
PRE, POST, PRE1, POST1 = (os.path.join(S, d) for d in ("ab_pre", "ab_post", "ab_pre_rep1", "ab_post_rep1"))
TH = int(255 * 0.02)
loc = json.load(open(os.path.join(HERE, "locate_ab.json")))["loc"]


def mask(a, b):
    """두 PNG 의 차이 마스크(L, 255 = 차이). 크기가 다르면 위 정렬 공통 영역."""
    ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    w, h = min(ia.width, ib.width), min(ia.height, ib.height)
    if ia.size != (w, h): ia = ia.crop((0, 0, w, h))
    if ib.size != (w, h): ib = ib.crop((0, 0, w, h))
    d = ImageChops.difference(ia, ib)
    r, g, bb = d.split()
    m = ImageChops.lighter(ImageChops.lighter(r, g), bb).point(lambda v: 255 if v > TH else 0)
    return m, (ia.size != Image.open(a).size or ib.size != Image.open(b).size)


def count(m):
    return m.histogram()[255]


def andm(a, b):
    return ImageChops.multiply(a, b)


def subm(a, b):
    return ImageChops.subtract(a, b)


def fit(m, size):
    if m.size == size: return m
    c = Image.new("L", size, 0); c.paste(m.crop((0, 0, min(m.width, size[0]), min(m.height, size[1]))), (0, 0)); return c


def rects_for(name):
    rec = loc.get(name) or {}
    out = []
    for v in rec.values():
        if not isinstance(v, dict): continue
        for k in ("on", "bar"):
            if v.get(k): out.append(v[k])
        for s in v.get("sides") or []:
            if s.get("r"): out.append(s["r"])
    return out


def bands(m, gap=24):
    w, h = m.size
    data = m.tobytes()
    rows = [y for y in range(h) if data[y * w:(y + 1) * w].count(0) != w]
    out = []
    for y in rows:
        if out and y - out[-1][1] <= gap: out[-1][1] = y
        else: out.append([y, y])
    res = []
    for y0, y1 in out:
        bb = m.crop((0, y0, w, y1 + 1)).getbbox()
        res.append([bb[0], y0, bb[2], y1 + 1, count(m.crop((bb[0], y0, bb[2], y1 + 1)))])
    return res


res = {}
names = sorted(f[:-4] for f in os.listdir(POST) if f.endswith(".png"))
for n in names:
    a, b = os.path.join(PRE, n + ".png"), os.path.join(POST, n + ".png")
    if not os.path.exists(a): res[n] = {"status": "no_pre"}; continue
    D, cropped = mask(a, b)
    r = {"D": count(D), "size_pre": list(Image.open(a).size), "size_post": list(Image.open(b).size), "cropped_top": cropped}
    a1, b1 = os.path.join(PRE1, n + ".png"), os.path.join(POST1, n + ".png")
    if os.path.exists(a1) and os.path.exists(b1):
        Jp, _ = mask(a, a1); Jq, _ = mask(b, b1); X, _ = mask(a1, b1)
        Jp, Jq, X = fit(Jp, D.size), fit(Jq, D.size), fit(X, D.size)
        J = ImageChops.lighter(Jp, Jq).filter(ImageFilter.MaxFilter(3))
        stable = subm(andm(D, X), J)
        r.update({"rep_pre": count(Jp), "rep_post": count(Jq), "rep_cross": count(X), "stable": count(stable), "jitter": count(D) - count(stable)})
        if count(stable):
            r["stable_bbox"] = stable.getbbox()
            r["stable_bands"] = bands(stable)[:20]
        rs = rects_for(n) if "popup" in n else []
        if rs:
            inside = Image.new("L", D.size, 0)
            from PIL import ImageDraw
            dr = ImageDraw.Draw(inside)
            for x0, y0, x1, y1 in rs:
                dr.rectangle([x0 - 4, y0 - 4, x1 + 4, y1 + 4], fill=255)
            st_out = subm(stable, inside)
            r["stable_inside_popup"] = count(stable) - count(st_out)
            r["stable_outside_popup"] = count(st_out)
            if count(st_out): r["outside_bands"] = bands(st_out)[:20]
            r["popup_rects"] = rs
    else:
        r["rep"] = "missing"
    if count(D): r["D_bands"] = bands(D)[:20]
    res[n] = r
    print(n, {k: r[k] for k in r if k in ("D", "rep_pre", "rep_post", "rep_cross", "stable", "stable_inside_popup", "stable_outside_popup", "cropped_top")})
json.dump(res, open(os.path.join(HERE, "classify_raw.json"), "w"), ensure_ascii=False, indent=1)
