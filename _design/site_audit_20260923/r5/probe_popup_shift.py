#!/usr/bin/env python3
# 2026-09-23 critic 5회차 regress 보조: 홈 팝업 A/B 차이가 활성 카드 border-bottom 1px 제거로 카드가 1px 짧아져(세로 가운데 정렬) 생긴 정수 픽셀 평행 이동인지 확인한다.
# 방법: 차이 띠 구역을 pre 에서 잘라, post 의 같은 구역을 dy = -2..+2 로 옮겨 잘라 AE(fuzz 2%) 를 잰다. 어느 dy 에서 0 이 되면 = 그 만큼 평행 이동뿐.
# 사용: python3 probe_popup_shift.py [PRE_DIR] [POST_DIR] [OUT_JSON]
import json, os, subprocess, sys
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
PRE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(H, "shots", "ab_pre")
POST = sys.argv[2] if len(sys.argv) > 2 else os.path.join(H, "shots", "ab_post")
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(H, "popup_shift.json")
TMP = os.path.join(H, "diff_ab", "shift_tmp"); os.makedirs(TMP, exist_ok=True)
# 구역 = (이름, x0, y0, x1, y1): 띠 bbox 에서 위아래 2px 안쪽(이동 여유)
ZONES = {
    "index_popup_1440": [("card_top_rim", 500, 204, 941, 212), ("card_body", 501, 212, 939, 630), ("bar", 500, 638, 941, 694)],
    "index_popup_390": [("card_top_rim", 16, 137, 375, 146), ("card_body", 17, 146, 373, 594), ("bar", 16, 600, 375, 703)],
}
def ae(a, b):
    r = subprocess.run(["magick", "compare", "-metric", "AE", "-fuzz", "2%", a, b, "null:"], capture_output=True, text=True)
    return int(float((r.stderr or r.stdout).strip().split()[0]))
res = {}
for name, zones in ZONES.items():
    ia = Image.open(os.path.join(PRE, name + ".png")).convert("RGB"); ib = Image.open(os.path.join(POST, name + ".png")).convert("RGB")
    for z, x0, y0, x1, y1 in zones:
        a = os.path.join(TMP, "a.png"); ia.crop((x0, y0, x1, y1)).save(a)
        row = {}
        for dy in (-2, -1, 0, 1, 2):
            b = os.path.join(TMP, "b.png"); ib.crop((x0, y0 + dy, x1, y1 + dy)).save(b)
            row[dy] = ae(a, b)
        res[f"{name}:{z}"] = {"box": [x0, y0, x1, y1], "ae_by_dy": row}
        print(name, z, [x0, y0, x1, y1], row)
json.dump(res, open(OUT, "w"), indent=1)
