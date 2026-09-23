#!/usr/bin/env python3
# 2026-09-23 critic 4회차 regress 집계: A/B(87106d8 → c342aff, 결정론 조건) 차이 띠를 면별 한 줄로 묶는다.
# 입력 = regress_bands.json(probe_regress_bands.py: 띠 + 자동 1차 분류 ft/join/?), 같은 판 재촬영 비교(regress_post_vs_post_rep1.json,
#   regress_pre_vs_pre_rep1.json, ctrl/*.json), 재촬영 A/B(regress_ab_rep1.json, ctrl/pre_rep3__post_rep3.json), 꼬리 비교(regress_tail_ab.json).
# 분류: a = 의도(푸터 법적 고지 줄 글자 가운데 정렬 / 홈 캡션 16px / 가입 약관 행 「전문」 / 팝업 측면 카드 아래 모서리)
#       b = 타이밍 흔들림(같은 판 재촬영 비교에서 같은 좌표 띠가 나옴)
#       c = 의도 밖(회귀 후보)
# ? 띠는 같은 판 재촬영 비교의 띠 좌표(y0, y1, x0, x1)와 정확히 같으면 b 로 확정한다. 그 밖은 CLASS 표(눈으로 본 결과)로 적는다.
import json, os
H = os.path.dirname(os.path.abspath(__file__))
J = lambda f: json.load(open(os.path.join(H, f)))
BANDS = J("regress_bands.json")
SAME = {}   # 같은 판 재촬영 비교 띠 좌표 집합: 면 → {(y0,y1,x0,x1): 출처}
SAME_FILES = ["regress_post_vs_post_rep1.json", "regress_pre_vs_pre_rep1.json", "ctrl/pre__pre_rep2.json", "ctrl/post__post_rep2.json",
              "ctrl/pre_rep2__pre_rep3.json", "ctrl/post_rep2__post_rep3.json", "ctrl/postr_rep2__postr_rep3.json",
              "ctrl/post_rep2__postr_rep2.json", "ctrl/post_rep3__postr_rep3.json"]   # 마지막 둘 = 같은 내용, 서빙 방식만 다름(route 영향 대조)
for f in SAME_FILES:
    tag = os.path.basename(f)[:-5]
    for k, r in J(f)["pairs"].items():
        for bd in r.get("bands", []):
            SAME.setdefault(k, {})[(bd["y0"], bd["y1"], bd["x0"], bd["x1"])] = tag
AB2 = {**J("regress_ab_rep1.json")["pairs"]}
for f in ["ctrl/pre_rep3__post_rep3.json"]:
    for k, r in J(f)["pairs"].items():
        AB2[k + "@rep3"] = r
TAIL = J("regress_tail_ab.json")["pairs"]
CLASS = {
    "index_popup_1440": "a 팝업 측면 카드 아래 두 모서리가 각에서 둥근 4px 로(y647-650 x986-1382, 12px). 재촬영 A/B 도 12 로 같음",
    "index_popup_390": "0 (폰 폭은 측면 카드 숨김)",
    "index_tiles_1440": "0 (#tiles 요소 캡처, 3열 그대로)",
    "index_tiles_390": "0 (#tiles 요소 캡처, 1열 그대로)",
    "join_1440": "a 약관 행 3개의 「전문」 이 행 가운데에서 제목 줄 옆으로(행 rect 동일, .view y -5/-5/-15px). 푸터는 compact 셸이라 빌드 제외(가운데 정렬 미적용, 차이 0)",
    "join_390": "a 약관 행 3개의 「전문」 이 제목 줄 옆으로(행 rect 동일, .view y -4/-14/-24px). 푸터 차이 0(compact 셸 빌드 제외)",
    "login_1440": "0 (compact 셸이라 푸터 빌드 제외, justify-content normal 그대로)",
    "login_390": "0 (compact 셸이라 푸터 빌드 제외)",
    "studio_390": "전체 캡처 0 은 무효(문서 17749px > 16384px, 16384 아래가 반복 판). 꼬리 비교: footer 요소 1225 = a, 스크롤 16384 창 1225(y16748-16759 = 법적 고지 줄) = a, 스크롤 16905 창 0",
}
rows = []
nc = 0
for name, r in sorted(BANDS.items()):
    bl = r.get("bands", [])
    cls_b = []
    for bd in bl:
        key = (bd["y0"], bd["y1"], bd["x0"], bd["x1"])
        if bd["cls"] == "ft":
            cls_b.append("a-footer")
        elif bd["cls"] == "join":
            cls_b.append("a-join")
        elif key in SAME.get(name, {}):
            cls_b.append("b(" + SAME[name][key] + ")")
        elif name in CLASS and CLASS[name].startswith("a"):
            cls_b.append("a")
        else:
            cls_b.append("c?")
            nc += 1
    size = "x".join(map(str, r["pre_size"])) + ("" if r["pre_size"] == r["post_size"] else "->" + "x".join(map(str, r["post_size"])))
    ae = r.get("ae", r.get("ae_shifted"))
    rep = AB2.get(name, {})
    rep3 = AB2.get(name + "@rep3", {})
    row = {"name": name, "size": size, "ae": ae, "n_bands": len(bl), "bands": [[bd.get("pre_y", [bd["y0"], bd["y1"]])[0], bd.get("pre_y", [bd["y0"], bd["y1"]])[1], bd["x0"], bd["x1"], bd["px"], c] for bd, c in zip(bl, cls_b)],
           "rep_ab": rep.get("ae") if rep else None, "rep3_ab": rep3.get("ae") if rep3 else None, "note": CLASS.get(name, "")}
    if "dy" in r:
        row["shift"] = {"dy": r["dy"], "split_pre_y": r["split_pre_y"], "above_ae": r["above"]["ae"], "below_ae": r["below"]["ae"]}
    rows.append(row)
tail = {k: {"ae": v["ae"], "bands": [[b["y0"], b["y1"], b["x0"], b["x1"], b["px"]] for b in v.get("bands", [])]} for k, v in TAIL.items()}
out = {"pre": "87106d8", "post": "c342aff", "c_count": nc, "rows": rows, "tail_studio_390": tail}
json.dump(out, open(os.path.join(H, "regress_summary.json"), "w"), ensure_ascii=False, indent=1)
for x in rows:
    print(f"{x['name']}\t{x['size']}\tAE={x['ae']}{' shift' + str(x['shift']) if 'shift' in x else ''}\tbands={x['n_bands']}\t{[b[5] for b in x['bands']]}\trepAB={x['rep_ab']}\trep3AB={x['rep3_ab']}\t{x['note']}")
print("tail studio_390:", tail)
print("c_count =", nc)
