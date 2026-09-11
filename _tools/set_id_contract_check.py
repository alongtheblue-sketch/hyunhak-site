#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""세트 id 계약(SET_ID_RE) 사본 동기 게이트 (S9-3 1단계, 2026-09-11).
원문 = hyunhak-api src/pay.js SET_ID_RE. 사이트 안 사본 2곳(assets/app.js, _tools/build_sets_catalog.py)이 같은 문자열이어야 하고,
assets/lecture.js UNIT_OF 는 계약 안 모든 접두를 단위로 풀어야 한다. 하나라도 어긋나면 exit 1.
실행: python3 _tools/set_id_contract_check.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
# hyunhak-api src/pay.js SET_ID_RE 와 같은 문자열 (바꾸면 API 먼저, test/korea_eq_units.test.js 가 API 안 사본을 지킨다)
CONTRACT = r"^(korea_2027_[hs]|korea_gorun_2027_[hs]|yonsei_2027_[hs]|yonsei_intl_2027_i)(0[1-9]|[12][0-9]|30)$"
# 접두 → 단위 (assets/lecture.js UNIT_OF 가 전부 가져야 한다)
PREFIX_UNIT = {
    "korea_2027_h": "korea-hum", "korea_2027_s": "korea-sci",
    "korea_gorun_2027_h": "korea-eq-hum", "korea_gorun_2027_s": "korea-eq-sci",
    "yonsei_2027_h": "yonsei-hum", "yonsei_2027_s": "yonsei-sci", "yonsei_intl_2027_i": "yonsei-intl",
}


def main():
    bad = []
    app = (ROOT / "assets/app.js").read_text("utf-8")
    m = re.search(r"const SET_ID_RE = /(.+?)/;", app)
    if not m or m.group(1) != CONTRACT:
        bad.append(f"assets/app.js SET_ID_RE = {m.group(1) if m else None!r} != 계약")
    cat = (ROOT / "_tools/build_sets_catalog.py").read_text("utf-8")
    m = re.search(r'^SET_ID_RE = re\.compile\(r"([^"]+)"\)', cat, re.M)
    if not m or m.group(1) != CONTRACT:
        bad.append(f"_tools/build_sets_catalog.py SET_ID_RE = {m.group(1) if m else None!r} != 계약")
    lec = (ROOT / "assets/lecture.js").read_text("utf-8")
    for prefix, unit in PREFIX_UNIT.items():
        if f'[/^{prefix}/, "{unit}"]' not in lec:
            bad.append(f"assets/lecture.js UNIT_OF 에 [/^{prefix}/, \"{unit}\"] 없음")
    contract_re = re.compile(CONTRACT)
    for sid in ("korea_gorun_2027_h01", "korea_gorun_2027_s30", "korea_2027_h01", "yonsei_intl_2027_i30"):
        if not contract_re.match(sid):
            bad.append(f"계약이 {sid} 를 거른다")
    for sid in ("korea_gorun_2027_h31", "korea_gorun_2027_h00", "korea_gorun_2027_x01"):
        if contract_re.match(sid):
            bad.append(f"계약이 정원 밖 {sid} 를 받는다")
    if bad:
        print("[set_id_contract_check] FAIL"); [print(" -", b) for b in bad]; sys.exit(1)
    print("[set_id_contract_check] PASS: app.js·build_sets_catalog.py 사본 = 계약, lecture.js UNIT_OF 7접두")


if __name__ == "__main__":
    main()
