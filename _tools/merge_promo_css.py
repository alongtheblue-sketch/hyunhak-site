#!/usr/bin/env python3
"""assets/base.css 안 promo_popup_20260907 표식 블록을 design 원천에서 다시 만든다.

블록 = _design/promo_popup_20260907/promo_popup.css
     + _design/promo_popup_20260907/ranking.css
     + 메인 세션 보강(TAIL)

TAIL 은 design 폴더에 없고 사이트에만 필요한 규칙이다. 손으로 옮기면 다음 재병합에서
조용히 사라지므로 여기 한 자리에 둔다.

  python3 _tools/merge_promo_css.py          블록 교체(멱등)
  python3 _tools/merge_promo_css.py --check  블록이 원천과 다르면 exit 1
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DESIGN = ROOT / "_design" / "promo_popup_20260907"
BASE = ROOT / "assets" / "base.css"
BEGIN = "/* ==== promo_popup_20260907 begin (design-director promo_popup.css + ranking.css 사본, 재병합 = 이 블록 교체) ==== */"
END = "/* ==== promo_popup_20260907 end ==== */"

TAIL = """
/* --- 메인 세션 보강 (design 원천에 없다. 재병합은 merge_promo_css.py) --- */
/* 행사 팝업이 열린 동안 본문 스크롤을 잠근다 (app.js openPromoPopup / closePromoPopup) */
html.ppop-open{overflow:hidden}
"""


def build() -> str:
    parts = []
    for name in ("promo_popup.css", "ranking.css"):
        src = DESIGN / name
        if not src.exists():
            sys.exit(f"원천 없음: {src}")
        parts.append(src.read_text(encoding="utf-8").rstrip("\n"))
    return BEGIN + "\n" + "\n\n".join(parts) + "\n" + TAIL + END + "\n"


def main() -> int:
    css = BASE.read_text(encoding="utf-8")
    if BEGIN not in css or END not in css:
        sys.exit("base.css 에 표식 블록이 없다")
    b = css.index(BEGIN)
    e = css.index(END) + len(END) + 1  # 끝 개행까지
    cur = css[b:e]
    new = build()
    if cur == new:
        print("변경 0 (블록이 원천과 같다)")
        return 0
    if "--check" in sys.argv:
        print("FAIL: base.css 블록이 design 원천과 다르다. merge_promo_css.py 실행 필요")
        return 1
    BASE.write_text(css[:b] + new + css[e:], encoding="utf-8")
    print(f"블록 교체: {len(cur)} -> {len(new)} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
