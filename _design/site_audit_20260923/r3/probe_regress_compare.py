#!/usr/bin/env python3
# 2026-09-23 critic 3회차 regress 프로브: shots_r2(기준) 와 r3/shots_all(87106d8) 같은 이름 PNG 쌍 비교.
# 차이 픽셀 수 = magick compare -metric AE -fuzz 2%. 크기가 다르면 공통 영역을 위 정렬(top)과 아래 정렬(bottom) 두 번 crop 해 비교.
# 차이 마스크(흰 = 차이) 에서 행 단위 띠(band, 간격 GAP 이하 병합)를 구해 띠마다 bbox 와 두 판 crop 을 나란히 저장한다.
# 사용: python3 probe_regress_compare.py [BASE_DIR] [NEW_DIR] [OUT_JSON] [DIFF_DIR]
import json, os, subprocess, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "shots_r2")
NEW = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "shots_all")
OUT_JSON = sys.argv[3] if len(sys.argv) > 3 else os.path.join(HERE, "regress.json")
DIFF = sys.argv[4] if len(sys.argv) > 4 else os.path.join(HERE, "diff")
BASE, NEW, DIFF = map(os.path.abspath, (BASE, NEW, DIFF))
os.makedirs(os.path.join(DIFF, "mask"), exist_ok=True)
os.makedirs(os.path.join(DIFF, "pair"), exist_ok=True)
GAP = 24          # 이 간격(px) 이하로 떨어진 차이 행은 한 띠로 묶는다
PAD = 16          # crop 여유


def ae(a, b, diff_png, mask_png):
    """magick compare AE(fuzz 2%) + 시각 diff + 마스크. 반환 = 차이 픽셀 수(int)."""
    r = subprocess.run(["magick", "compare", "-metric", "AE", "-fuzz", "2%", a, b, diff_png],
                       capture_output=True, text=True)
    raw = (r.stderr or r.stdout).strip().split()[0]
    n = int(float(raw))
    subprocess.run(["magick", "compare", "-fuzz", "2%", a, b, "-compose", "src",
                    "-highlight-color", "white", "-lowlight-color", "black", mask_png],
                   capture_output=True, text=True)
    return n, raw


def bands(mask_png):
    m = Image.open(mask_png).convert("L").point(lambda v: 255 if v > 127 else 0)
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
        cnt = sum(1 for v in m.crop((x0, y0, x1, y1 + 1)).tobytes() if v)
        res.append({"y0": y0, "y1": y1 + 1, "x0": x0, "x1": x1, "px": cnt})
    return res, m.getbbox()


def crop_pair(a, b, name, bd, idx, oy_a=0, oy_b=0):
    """두 판에서 띠를 crop 해 나란히(왼쪽 = r2 기준, 오른쪽 = r3). 높이가 크면 위 900px 만."""
    ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    x0, x1 = max(0, bd["x0"] - PAD), min(ia.width, bd["x1"] + PAD)
    y0, y1 = max(0, bd["y0"] - PAD), bd["y1"] + PAD
    y1 = min(y1, y0 + 900)
    ca = ia.crop((x0, y0 + oy_a, x1, min(ia.height, y1 + oy_a)))
    cb = ib.crop((x0, y0 + oy_b, x1, min(ib.height, y1 + oy_b)))
    W = ca.width + cb.width + 12
    H = max(ca.height, cb.height)
    canvas = Image.new("RGB", (W, H), (255, 0, 255))
    canvas.paste(ca, (0, 0))
    canvas.paste(cb, (ca.width + 12, 0))
    p = os.path.join(DIFF, "pair", f"{name}__band{idx}_y{bd['y0']}-{bd['y1']}.png")
    canvas.save(p)
    return p


def compare(name, a, b, tag="", oy_a=0, oy_b=0, hh=None, ww=None):
    """a, b 는 같은 크기 파일 경로. tag 가 있으면 crop 판."""
    key = name + tag
    diff_png = os.path.join(DIFF, f"{key}.png")
    mask_png = os.path.join(DIFF, "mask", f"{key}.png")
    n, raw = ae(a, b, diff_png, mask_png)
    rec = {"ae": n, "ae_raw": raw, "diff_png": diff_png}
    if n > 0:
        bl, bb = bands(mask_png)
        rec["bbox"] = bb
        rec["bands"] = bl
        rec["pairs"] = [crop_pair(a, b, key, bd, i, oy_a, oy_b) for i, bd in enumerate(bl[:12])]
    else:
        os.remove(mask_png)
    return rec


results = {}
names = sorted(f for f in os.listdir(NEW) if f.endswith(".png"))
for f in names:
    a, b = os.path.join(BASE, f), os.path.join(NEW, f)
    name = f[:-4]
    rec = {"name": name, "new_mtime": os.path.getmtime(b)}
    if not os.path.exists(a):
        rec["status"] = "no_base"
        results[name] = rec
        continue
    rec["base_mtime"] = os.path.getmtime(a)
    ia, ib = Image.open(a), Image.open(b)
    rec["base_size"], rec["new_size"] = list(ia.size), list(ib.size)
    if ia.size == ib.size:
        rec["same_size"] = True
        rec.update(compare(name, a, b))
    else:
        rec["same_size"] = False
        w, h = min(ia.width, ib.width), min(ia.height, ib.height)
        tmp = os.path.join(DIFF, "crop")
        os.makedirs(tmp, exist_ok=True)
        # 위 정렬
        ta, tb = os.path.join(tmp, f"{name}_top_a.png"), os.path.join(tmp, f"{name}_top_b.png")
        ia.crop((0, 0, w, h)).save(ta); ib.crop((0, 0, w, h)).save(tb)
        rec["top"] = compare(name, ta, tb, "__top")
        # 아래 정렬
        ba_, bb_ = os.path.join(tmp, f"{name}_bot_a.png"), os.path.join(tmp, f"{name}_bot_b.png")
        ia.crop((0, ia.height - h, w, ia.height)).save(ba_); ib.crop((0, ib.height - h, w, ib.height)).save(bb_)
        rec["bottom"] = compare(name, ba_, bb_, "__bot")
    results[name] = rec
    s = rec.get("ae", None)
    if rec.get("same_size"):
        print(f"{name}\t{rec['base_size'][0]}x{rec['base_size'][1]}\tAE={s}\tbands={len(rec.get('bands', []))}")
    else:
        print(f"{name}\t{rec['base_size'][0]}x{rec['base_size'][1]} -> {rec['new_size'][0]}x{rec['new_size'][1]}\ttopAE={rec['top']['ae']}\tbotAE={rec['bottom']['ae']}")

extra_base = sorted(set(f for f in os.listdir(BASE) if f.endswith(".png")) - set(names))
json.dump({"base": BASE, "new": NEW, "pairs": results, "base_only": extra_base}, open(OUT_JSON, "w"), ensure_ascii=False, indent=1)
print("base_only:", extra_base)
