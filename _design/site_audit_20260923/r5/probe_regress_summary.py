#!/usr/bin/env python3
# 2026-09-23 critic 5회차 regress 집계: A/B(c342aff -> 507edf1, 결정론 조건) 차이 띠를 면별 한 줄로 묶는다. r4/probe_regress_summary.py 파생.
# 입력 = regress_bands.json(probe_regress_bands.py: 띠 + 자동 1차 분류 ft/pop/join/?), 같은 판 재촬영 비교(ctrl/pre__pre_rep1.json, ctrl/post__post_rep1.json),
#   재촬영 A/B(ctrl/pre_rep1__post_rep1.json), 꼬리 비교(regress_tail_ab.json), 팝업 평행 이동 검사(popup_shift.json).
# 분류: a = 의도(compact 셸 면 푸터 법적 고지 줄 글자 x 이동 / 홈 팝업 활성 카드 border-bottom 1px 제거와 그로 인한 1px 평행 이동)
#       b = 타이밍 흔들림(같은 판 재촬영 비교에서 같은 좌표 띠가 나오고, 재촬영 A/B 는 0)
#       c = 의도 밖(회귀 후보)
import json, os
H = os.path.dirname(os.path.abspath(__file__))
J = lambda f: json.load(open(os.path.join(H, f)))
BANDS = J("regress_bands.json")
SAME = {}
for f in ["ctrl/pre__pre_rep1.json", "ctrl/post__post_rep1.json"]:
    tag = os.path.basename(f)[:-5]
    for k, r in J(f)["pairs"].items():
        for bd in r.get("bands", []):
            SAME.setdefault(k, {})[(bd["y0"], bd["y1"], bd["x0"], bd["x1"])] = tag
REP = J("ctrl/pre_rep1__post_rep1.json")["pairs"]
TAIL = J("regress_tail_ab.json")["pairs"]
SHIFT = J("popup_shift.json")
COMPACT = ("join", "login", "cart", "checkout", "my", "404", "pay_done")
rows, nc = [], 0
for name, r in sorted(BANDS.items()):
    cls_b = []
    for bd in r.get("bands", []):
        key = (bd["y0"], bd["y1"], bd["x0"], bd["x1"])
        base = name.rsplit("_", 1)[0]
        if bd["cls"] == "ft" and base in COMPACT:
            cls_b.append("a-footer")
        elif name.startswith("index_popup"):
            sh = {k.split(":")[1]: v["ae_by_dy"] for k, v in SHIFT.items() if k.startswith(name + ":")}
            # 카드 본문과 하단바가 어느 정수 dy 에서 0(또는 2px 이하)이면 평행 이동뿐. 윗테는 소수 좌표 테두리 안티에일리어싱
            ok = all(min(int(x) for x in sh[z].values()) <= 2 for z in ("card_body", "bar"))
            cls_b.append("a-popup" if ok else "c?")
            if not ok:
                nc += 1
        elif key in SAME.get(name, {}):
            cls_b.append("b(" + SAME[name][key] + ")")
        else:
            cls_b.append("c?")
            nc += 1
    rep = REP.get(name, {})
    size = "x".join(map(str, r["pre_size"])) + ("" if r["pre_size"] == r["post_size"] else "->" + "x".join(map(str, r["post_size"])))
    row = {"name": name, "size": size, "ae": r.get("ae"), "n_bands": len(cls_b),
           "bands": [[bd["y0"], bd["y1"], bd["x0"], bd["x1"], bd["px"], c] for bd, c in zip(r.get("bands", []), cls_b)],
           "rep_ab": rep.get("ae")}
    rows.append(row)
    print(f"{name}\t{size}\tAE={row['ae']}\tbands={row['n_bands']}\t{[b[5] for b in row['bands']]}\trepAB={row['rep_ab']}")
tail = {k: {"ae": v["ae"], "bands": len(v.get("bands", []))} for k, v in TAIL.items()}
print("tail studio_390:", tail)
print("c_count =", nc)
json.dump({"pre": "c342aff", "post": "507edf1", "rows": rows, "tail": tail, "shift": SHIFT, "c_count": nc}, open(os.path.join(H, "regress_summary.json"), "w"), ensure_ascii=False, indent=1)
