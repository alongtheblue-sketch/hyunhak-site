#!/usr/bin/env python3
"""GS-12 · GS-14(b) P2 중 '정합·판독' 묶음만 (건우 2026-09-03 결재). 멱등.

① 산문 11~13px 판독 상향 (가이드북 산문 13→14, 내용 담은 11px 캡션 2종 →12, 홈 가격 라벨 →12)
② 표 구분선 --hairs 대비 1.24:1 → 1.55:1 (alpha .12→.24, 1px 폭 불변이라 레이아웃 무영향)
③ 스튜디오 가격 4카드 주 CTA 1개 (응시 단위 전권 = seal 테두리 + 배지 + seal 버튼)
④ 캠퍼스 콜라주 무관 캡션 (제휴 오인 차단). 타일 제거는 _design/campus_collage_20260903/build_collage.py
취향 P2(위계 건너뜀, 죽은 CSS, 자간, 동형 템플릿 등)는 손대지 않는다.
"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
GB  = ROOT / "_design/guidebook_detail_20260903/build/build_page.py"
STB = ROOT / "_design/studio_detail_20260903/build/build_page.py"
STC = ROOT / "_design/studio_detail_20260903/build/page.css"
HOME = ROOT / "index.html"
BASE = ROOT / "assets/base.css"

HAIRS_OLD = "--hairs:rgba(49,46,46,.12)"
HAIRS_NEW = "--hairs:rgba(49,46,46,.24)"

EDITS = [
    # ── ① 판독: 가이드북 산문 13px → 14px
    (GB, ".aud p{font-size:var(--t-sm);line-height:1.65}",
         ".aud p{font-size:14px;line-height:1.7}"),
    (GB, ".rail p{font-size:var(--t-sm);line-height:1.65}",
         ".rail p{font-size:14px;line-height:1.7}"),
    (GB, ".price ul li{font-size:var(--t-sm);color:var(--body);line-height:1.6",
         ".price ul li{font-size:14px;color:var(--body);line-height:1.65"),
    # ── ① 판독: 내용을 담은 11px 두 곳(질문 출처, 흐림 사유 캡션) → 12px. 순수 라벨은 11px 유지
    (GB, ".qs .src{font-family:var(--mono);font-size:var(--t-xs)",
         ".qs .src{font-family:var(--mono);font-size:12px"),
    (GB, ".pgv .cap{display:block;font-family:var(--mono);font-size:var(--t-xs)",
         ".pgv .cap{display:block;font-family:var(--mono);font-size:12px"),
    # ── ① 판독: 홈 히어로 상품 라벨(가격 병기) → 12px
    (HOME, ".hero .prodcta .k{display:block;font-family:var(--mono);font-size:var(--t-xs)",
           ".hero .prodcta .k{display:block;font-family:var(--mono);font-size:12px"),
    # ── ② 표 구분선 대비
    (GB, HAIRS_OLD, HAIRS_NEW),
    (STC, HAIRS_OLD, HAIRS_NEW),
    (BASE, HAIRS_OLD, HAIRS_NEW),
    # ── ③ 스튜디오 가격 주 CTA
    (STB, '<li><h4>응시 단위 전권</h4><div class="won">495,000',
          '<li class="pick"><span class="tag">권하는 구성</span><h4>응시 단위 전권</h4><div class="won">495,000'),
    (STC, ".price>li{background:var(--card);border:var(--rule-strong)",
          ".price>li.pick{border-color:var(--seal)}\n"
          ".price>li.pick .tag{align-self:flex-start;font-size:12px;font-weight:600;letter-spacing:0;"
          "color:var(--paper);background:var(--seal);border-radius:2px;padding:3px 7px;margin-bottom:var(--s1)}\n"
          ".price>li.pick .btn{background:var(--seal)}\n"
          ".price>li.pick .btn:hover{background:#A32C22}\n"
          ".price>li{background:var(--card);border:var(--rule-strong)"),
    # ── ④ 콜라주 무관 캡션
    (STB, '<div class="vis rv">{{IMG_CAMPUS}}</div>',
          '<figure class="vis rv">{{IMG_CAMPUS}}'
          '<figcaption class="viscap">표지 일러스트를 옮긴 그림입니다. 각 대학과 제휴하거나 후원받은 바 없습니다.</figcaption></figure>'),
    (STC, ".pricenote{font-size:var(--t-sm);color:var(--gray);margin-top:var(--s3)}",
          ".pricenote{font-size:var(--t-sm);color:var(--gray);margin-top:var(--s3)}\n"
          ".viscap{font-family:var(--mono);font-size:12px;letter-spacing:.04em;color:var(--gray);"
          "line-height:1.6;margin-top:var(--s2)}"),
]

CHECK = "--check" in sys.argv
changed = 0
for path, old, new in EDITS:
    txt = path.read_text(encoding="utf-8")
    if old in txt:
        n = txt.count(old)
        if n != 1:
            sys.exit(f"FAIL 적중 {n}건(1 이어야 함): {path.name} :: {old[:50]}")
        if not CHECK:
            path.write_text(txt.replace(old, new), encoding="utf-8")
        changed += 1
        print(f"  {path.name}: {old[:56]}…")
    elif new not in txt:
        sys.exit(f"FAIL 원문도 치환문도 없음: {path.name} :: {old[:56]}")

print(f"{'변경 필요' if CHECK else '적용'} {changed}/{len(EDITS)}")
if not CHECK:
    for p in (GB, STC, BASE):
        if HAIRS_OLD in p.read_text(encoding="utf-8"):
            sys.exit(f"FAIL --hairs .12 잔존: {p.name}")
    print("--hairs .12 잔존 0")
