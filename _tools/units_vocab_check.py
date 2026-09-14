#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""단위 어휘 동기 게이트 (연세대 미래캠퍼스 판매 개시, 2026-09-14).
판매 11단위(기존 5 + 미래 6, 공통형 포함)가 사이트 안 표 세 곳(app.js, lectures.js, build_sets_catalog)에,
순위 10단위가 rank.js 에, 전형 상세면 원장(facts, codes.py)의 yonsei-mirae 가 on_sale 로 같은 값으로 박혀 있어야 한다.
원문 = hyunhak-api src/pay.js UNIT_SET_RE 키 + src/ranking.js RANK_UNITS 키 순서.
고른기회 2단위(korea-eq)는 본 회차 미개시라 판매 표에 없다. 열 때 이 파일의 UNITS 와 RANK_UNITS 를 함께 고친다.
실행: python3 _tools/units_vocab_check.py  (어긋나면 exit 1)
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

MIRAE = ["yonsei-mirae-free", "yonsei-mirae-design", "yonsei-mirae-tech",
         "yonsei-mirae-health", "yonsei-mirae-intl", "yonsei-mirae-common"]
# app.js, lectures.js, build_sets_catalog UNITS (같은 순서)
UNITS = ["korea-hum", "korea-sci", "yonsei-hum", "yonsei-sci", "yonsei-intl"] + MIRAE
# rank.js UNITS = api src/ranking.js RANK_UNITS 키 순서
RANK_UNITS = ["yonsei-hum", "yonsei-sci", "korea-hum", "korea-sci"] + MIRAE
# 단독 SKU 가 없는 단위 (미래 공통형은 미래 판매 5단위 전권 어디에나 들어간다)
NO_SKU = {"yonsei-mirae-common"}
# 전형 상세면 code → 그 전형의 판매 단위 code (facts spec.units)
EXAM_UNITS = {"yonsei-mirae": [u for u in MIRAE if u not in NO_SKU]}


def js_array(text, name):
    m = re.search(r"(?:const|var)\s+" + name + r"\s*=\s*\[([^\]]*)\];", text)
    return re.findall(r'"([^"]+)"', m.group(1)) if m else None


def main():
    bad = []
    if js_array((ROOT / "assets/app.js").read_text("utf-8"), "UNITS") != UNITS:
        bad.append("assets/app.js UNITS != 판매 11단위")
    if js_array((ROOT / "assets/lectures.js").read_text("utf-8"), "UNITS") != UNITS:
        bad.append("assets/lectures.js UNITS != 판매 11단위")
    if js_array((ROOT / "assets/rank.js").read_text("utf-8"), "UNITS") != RANK_UNITS:
        bad.append("assets/rank.js UNITS != 순위표 10탭")

    cat = (ROOT / "_tools/build_sets_catalog.py").read_text("utf-8")
    m = re.search(r"^UNITS = \[(.*?)^\]", cat, re.S | re.M)
    codes = re.findall(r'\{"code": "([^"]+)"', m.group(1)) if m else []
    if codes != UNITS:
        bad.append(f"_tools/build_sets_catalog.py UNITS codes = {codes} != 판매 11단위")

    # 산출 카탈로그: 11단위, 단위별 30세트, 공통형만 sku null
    cat_json = ROOT / "assets/data/sets.json"
    if not cat_json.exists():
        bad.append("assets/data/sets.json 없음 (build_sets_catalog.py 실행 필요)")
    else:
        units = json.loads(cat_json.read_text("utf-8"))["units"]
        if [u["code"] for u in units] != UNITS:
            bad.append("assets/data/sets.json units 순서가 판매 11단위와 다르다")
        for u in units:
            want = None if u["code"] in NO_SKU else "pass-" + u["code"]
            if u.get("sku") != want:
                bad.append(f"sets.json {u['code']} sku = {u.get('sku')!r} != {want!r}")
            if u.get("set_count") != 30:
                bad.append(f"sets.json {u['code']} set_count = {u.get('set_count')} != 30")

    # 전형 상세면 원장
    fb = (ROOT / "_tools/exam_pages/facts_build.py").read_text("utf-8")
    if 'yonsei_mirae_interview_bank_2027/sets_u' not in fb:
        bad.append("facts_build.py BANKS 의 yonsei-mirae 가 sets_u(공통형 30)를 세지 않는다")
    blk = re.search(r'"yonsei-mirae": dict\((.*?)\),\n    "korea-hum"', fb, re.S)
    body = blk.group(1) if blk else ""
    for need in ('status="on_sale"', 'sku="pass-yonsei-mirae-free"', "price=495000", "single_price=33000", "lecture_count=180"):
        if need not in body:
            bad.append(f"facts_build.py SPEC[yonsei-mirae] 에 {need} 없음")

    codes_py = (ROOT / "_tools/exam_pages/codes.py").read_text("utf-8")
    row = next((l for l in codes_py.splitlines() if '("yonsei-mirae"' in l), "")
    if '"판매 중"' not in row:
        bad.append("codes.py CODES yonsei-mirae 라벨이 「판매 중」이 아니다")

    facts = ROOT / "_tools/exam_pages/facts/yonsei-mirae.json"
    if not facts.exists():
        bad.append("facts/yonsei-mirae.json 없음 (facts_build.py 실행 필요)")
    else:
        f = json.loads(facts.read_text("utf-8"))
        if f["spec"].get("status") != "on_sale":
            bad.append(f"facts/yonsei-mirae.json status = {f['spec'].get('status')!r} (생성물 재빌드 필요)")
        if (f.get("bank") or {}).get("n_sets") != 180:
            bad.append(f"facts/yonsei-mirae.json bank.n_sets = {(f.get('bank') or {}).get('n_sets')} != 180")
        got = [u["code"] for u in (f["spec"].get("units") or [])]
        if got != EXAM_UNITS["yonsei-mirae"]:
            bad.append(f"facts/yonsei-mirae.json spec.units = {got} != 판매 5단위")
        if (f["spec"].get("common_unit") or {}).get("code") != "yonsei-mirae-common":
            bad.append("facts/yonsei-mirae.json spec.common_unit 이 yonsei-mirae-common 이 아니다")

    # 판매 단위마다 인강 상세면이 선다 (공통형은 단독 면 없음)
    for code in UNITS:
        if code in NO_SKU:
            continue
        if not (ROOT / "lectures" / f"{code}.html").exists():
            bad.append(f"lectures/{code}.html 없음 (build_lectures.py 실행 필요)")

    if bad:
        print("[units_vocab_check] FAIL")
        for b in bad:
            print(" -", b)
        sys.exit(1)
    print("[units_vocab_check] PASS: 판매 11단위, 순위표 10탭, facts yonsei-mirae on_sale 180세트")


if __name__ == "__main__":
    main()
