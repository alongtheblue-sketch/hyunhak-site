#!/usr/bin/env python3
"""GS-10 가이드북 번들 합산 표기 3자리 통일 (멱등).

GS-8d 확정 원칙: 산식 명시 + 합산가 고지 + "합산 금액이며 따로 파는 상품이 아닙니다".
자리 3 = ① 카탈로그 템플릿 _tools/guidebook_index_v2.html (생성물 guidebook/index.html)
        ② 소개 면 가격 카드   build_page.py (생성물 programs/guidebook.html)
        ③ 소개 면 FAQ         build_page.py

--check 는 쓰지 않고 잔여 치환 건수만 보고한다(0 이면 이미 적용됨).
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
CHECK = "--check" in sys.argv

TPL = ROOT / "_tools/guidebook_index_v2.html"
BLD = ROOT / "_design/guidebook_detail_20260903/build/build_page.py"

EDITS = [
    # ── 자리 ① 카탈로그 템플릿
    (TPL, "<p>전 대학을 준비하는 학원과 다권 수요를 위한 전권 상품입니다. 개별 구매 합산의 정확히 절반입니다.</p>",
          "<p>전 대학을 준비하는 학원과 다권 수요를 위한 전권 상품입니다.</p>"),
    (TPL, "<small>(개별 합산 1,023,000원)</small>",
          "<small>(권당 33,000원 × 31권 = 1,023,000원의 절반)</small>"),
    (TPL, "<small>(개별 합산 3,410,000원)</small>",
          "<small>(권당 110,000원 × 31권 = 3,410,000원의 절반)</small>"),
    (TPL, ">보안 뷰어 열람 기간은 구매일부터 1개월입니다.",
          ">1,023,000원과 3,410,000원은 낱권 31권의 합산 금액이며 따로 파는 상품이 아닙니다. 보안 뷰어 열람 기간은 구매일부터 1개월입니다."),
    # ── 자리 ② 소개 면 가격 카드
    (BLD, "<ul><li>개별 합산의 절반</li><li>여러 대학에 지원하는 학생, 학교와 학원 단위</li></ul>",
          "<ul><li>권당 33,000원 × 31권 = 1,023,000원의 절반</li>"
          "<li>PDF는 110,000원 × 31권 = 3,410,000원의 절반</li>"
          "<li>합산 금액은 따로 파는 상품이 아닙니다</li>"
          "<li>여러 대학에 지원하는 학생, 학교와 학원 단위</li></ul>"),
    # ── 자리 ③ 소개 면 FAQ
    (BLD, "권당 33,000원. 31개 대학 전권 열람은 511,500원으로 개별 합산의 절반. 학교와 학원 단위 좌석은 문의 이메일로.",
          "권당 33,000원. 31개 대학 전권 열람은 511,500원으로, 33,000원 × 31권 = 1,023,000원의 절반입니다. "
          "PDF 소장판 전권 1,705,000원은 110,000원 × 31권 = 3,410,000원의 절반입니다. "
          "1,023,000원과 3,410,000원은 합산 금액이며 따로 파는 상품이 아닙니다. 학교와 학원 단위 좌석은 문의 이메일로."),
]

changed = 0
for path, old, new in EDITS:
    txt = path.read_text(encoding="utf-8")
    if old in txt:
        n = txt.count(old)
        if n != 1:
            raise SystemExit(f"FAIL 적중 {n}건(1 이어야 함): {path.name} :: {old[:40]}")
        if not CHECK:
            path.write_text(txt.replace(old, new), encoding="utf-8")
        changed += 1
        print(f"  치환 {path.name}: {old[:48]}…")
    elif new not in txt:
        raise SystemExit(f"FAIL 원문도 치환문도 없음: {path.name} :: {old[:48]}")

print(f"{'변경 필요' if CHECK else '적용'} {changed}/{len(EDITS)}")

# 잔여 가드: 산식 없는 옛 문면이 남아 있으면 실패
if not CHECK:
    leftovers = []
    for path in (TPL, BLD):
        t = path.read_text(encoding="utf-8")
        for bad in ("개별 합산의 절반", "개별 합산 1,023,000원", "개별 합산 3,410,000원", "개별 구매 합산의 정확히 절반"):
            if bad in t:
                leftovers.append(f"{path.name}: {bad}")
    if leftovers:
        raise SystemExit("FAIL 잔여 옛 문면: " + ", ".join(leftovers))
    print("잔여 옛 문면 0")
