#!/usr/bin/env python3
"""apply_p2.py 뒤 design-critic 재채점(가이드북 32/45 조건부 YES)이 짚은 신규 결함 수리. 멱등.
반드시 apply_p2.py 다음에 돌린다.

N1 2단 괘선 붕괴 — --hairs 를 .12→.24 로 올리자 --hair(.28)와 렌더 차가 rgb 8 로 줄어
        약선 21곳과 강선 7곳이 눈에 같아졌다. --hair 를 .40 으로 벌려 옛 차(rgb 32)를 복원.
        실측 대비 hairs 1.57:1 / hair 2.22:1, rgb 차 31.
N2 off-token — apply_p2 가 심은 14px 3곳과 12px 2곳이 토큰 사다리 밖. --t-md:14px, --t-cap:12px 신설.
N3 부분 적용 분열 — 같은 성격인데 .aud p 14 대 .pr p 13, .pgv .cap 12 대 .openers-cap 11(3절 산문).
N5 법률 문안 계급 — GS-10 의 "합산 금액은 따로 파는 상품이 아닙니다" 가 혜택 불릿과 같은 줄에 들어가
        소구를 강등시켰다. 불릿 밖 각주로 내린다(문면과 산식은 그대로).
"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
GB   = ROOT / "_design/guidebook_detail_20260903/build/build_page.py"
STC  = ROOT / "_design/studio_detail_20260903/build/page.css"
BASE = ROOT / "assets/base.css"

TOKENS_OLD = "--t-xs:11px;--t-sm:13px;--t-base:16px;"
TOKENS_NEW = "--t-xs:11px;--t-cap:12px;--t-sm:13px;--t-md:14px;--t-base:16px;"
HAIR_OLD = "--hair:rgba(49,46,46,.28)"
HAIR_NEW = "--hair:rgba(49,46,46,.40)"

EDITS = [
    # ── N1 강선 분리 (3자리)
    (GB,   HAIR_OLD, HAIR_NEW),
    (STC,  HAIR_OLD, HAIR_NEW),
    (BASE, HAIR_OLD, HAIR_NEW),
    # ── N2 토큰 승격 (3자리)
    (GB,   TOKENS_OLD, TOKENS_NEW),
    (STC,  TOKENS_OLD, TOKENS_NEW),
    (BASE, TOKENS_OLD, TOKENS_NEW),
    # ── N2 off-token 을 토큰으로 (가이드북 5곳)
    (GB, ".aud p{font-size:14px;line-height:1.7}",      ".aud p{font-size:var(--t-md);line-height:1.7}"),
    (GB, ".rail p{font-size:14px;line-height:1.7}",     ".rail p{font-size:var(--t-md);line-height:1.7}"),
    (GB, ".price ul li{font-size:14px;",                ".price ul li{font-size:var(--t-md);"),
    (GB, ".qs .src{font-family:var(--mono);font-size:12px",
         ".qs .src{font-family:var(--mono);font-size:var(--t-cap)"),
    (GB, ".pgv .cap{display:block;font-family:var(--mono);font-size:12px",
         ".pgv .cap{display:block;font-family:var(--mono);font-size:var(--t-cap)"),
    # ── N3 같은 성격 정합
    (GB, ".pr p{font-size:var(--t-sm);line-height:1.65}",
         ".pr p{font-size:var(--t-md);line-height:1.7}"),
    (GB, ".openers-cap{font-family:var(--mono);font-size:var(--t-xs)",
         ".openers-cap{font-family:var(--mono);font-size:var(--t-cap)"),
    # ── N5 법률 문안을 불릿에서 각주로
    (GB, "<li>합산 금액은 따로 파는 상품이 아닙니다</li><li>여러 대학에 지원하는 학생, 학교와 학원 단위</li></ul>",
         "<li>여러 대학에 지원하는 학생, 학교와 학원 단위</li></ul>"
         "<p class=\"pricefoot\">합산 금액은 따로 파는 상품이 아닙니다.</p>"),
    (GB, ".price ul{margin-top:var(--s2)}",
         ".price ul{margin-top:var(--s2)}\n"
         ".price .pricefoot{font-size:var(--t-cap);color:var(--gray);line-height:1.6;margin-top:var(--s2);"
         "padding-top:var(--s2);border-top:var(--rule)}"),
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
    # 2단 괘선이 실제로 갈렸는지 자체검사
    for p in (GB, STC, BASE):
        t = p.read_text(encoding="utf-8")
        if HAIR_OLD in t:
            sys.exit(f"FAIL --hair .28 잔존: {p.name}")
        if "--t-md:14px" not in t:
            sys.exit(f"FAIL --t-md 미신설: {p.name}")
    # 가이드북 빌더에 off-token 잔존 0
    gb = GB.read_text(encoding="utf-8")
    for bad in ("font-size:14px", "font-size:12px"):
        if bad in gb:
            sys.exit(f"FAIL off-token 잔존: {bad}")
    print("괘선 2단 분리 + 토큰 승격 + off-token 잔존 0")

# ── N2 꼬리: apply_p2 가 홈과 스튜디오에 심은 12px 3곳도 토큰으로 (본 파일 실행 후 별도 반영분)
#   index.html .hero .prodcta .k / page.css .price>li.pick .tag / page.css .viscap → var(--t-cap)


# ─────────────────────────────────────────────────────────────
# 2차: 스튜디오 critic(33/45 조건부 YES) 신규 결함 2건. 위 EDITS 적용 뒤 별도 반영분.
#  S1 배지가 position:static 이라 pick 카드 내용을 39px 아래로 밀어 495,000원이
#     형제 세 가격과 다른 줄에 앉았다(가격 비교표의 수평 판독선 절단) → 흐름 밖 절대 배치.
#  S2 캡션 "후원받은 / 바 없습니다" 의존명사 고립 → nbsp 로 묶음.
STUDIO2 = [
    (".price>li{background:var(--card);border:var(--rule-strong)",
     ".price>li{position:relative;background:var(--card);border:var(--rule-strong)"),
    (".price>li.pick .tag{align-self:flex-start;font-size:var(--t-cap);font-weight:600;letter-spacing:0;",
     ".price>li.pick .tag{position:absolute;top:var(--s3);right:var(--s3);font-size:var(--t-cap);font-weight:600;letter-spacing:0;"),
]
STUDIO2_BUILDER = [
    ("후원받은 바 없습니다", "후원받은&nbsp;바 없습니다"),
]
