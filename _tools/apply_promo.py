#!/usr/bin/env python3
"""할인 행사 배너를 v2 셸 밖 자리에 넣는다 (2026-09-07).
   ① 상세 LP 4면(programs/*.html): <header class="top"> 를 쓰고 base.css 를 안 실어 apply_nav 가 못 닿는다 → 첫 </header> 뒤 띠(A1, 가격 문장 없음) + </head> 앞 <style data-promo-css>(_tools/promo_lp.css).
   ② 홈(index.html): 히어로 다음, <div class="duo"> 바로 앞에 밴드 B3(괘선 표, _tools/promo_band.html).
   원천 = _tools/promo.json (v2_shell.load_promo 와 같은 판정). 멱등: 넣은 블록을 정규식으로 찾아 교체, 행사 밖이면 걷는다.
   python3 _tools/apply_promo.py [--check]   --check = 바꿀 것이 있으면 rc 1"""
import re, sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v2_shell as V

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LP = sorted(glob.glob(os.path.join(ROOT, "programs", "*.html")))
HOME = os.path.join(ROOT, "index.html")
ASIDE_RE = re.compile(r'\n?<aside\b[^>]*\bdata-promo\b[^>]*>.*?</aside>', re.S)
STYLE_RE = re.compile(r'\n<style data-promo-css>.*?</style>\n', re.S)   # 넣는 형태와 정확히 같은 범위 (개행 누적 방지)
BAND_RE = re.compile(r'<section\b[^>]*\bclass="pband\b[^>]*\bdata-promo\b[^>]*>.*?</section>\n', re.S)
CSS_PATH = os.path.join(ROOT, "_tools", "promo_lp.css")


def apply_lp(s, rel, p):
    s = ASIDE_RE.sub("", s, count=1)
    s = STYLE_RE.sub("", s, count=1)
    if not p:
        return s
    aside = V.promo_strip(rel, p, price_note=False)   # app.js 가 없는 면: 정가 문장을 빼고 문구 + 링크만
    if not aside:
        return s
    with open(CSS_PATH, encoding="utf-8") as f:
        css = f.read().strip()
    hs = list(re.finditer(r"</header>", s))
    if not hs:
        raise SystemExit(f"{rel}: </header> 없음")
    h = hs[0]
    s = s[:h.end()] + aside + s[h.end():]
    if s.count("</head>") != 1:
        raise SystemExit(f"{rel}: </head> {s.count('</head>')}개")
    return s.replace("</head>", f"\n<style data-promo-css>\n{css}\n</style>\n</head>", 1)


def apply_home(s, p):
    s = BAND_RE.sub("", s, count=1)
    if not p:
        return s
    band = V.promo_band("index.html", p)
    if not band:
        return s
    if s.count('<div class="duo">') != 1:
        raise SystemExit(f'index.html: <div class="duo"> {s.count(chr(60)+"div class=" + chr(34) + "duo" + chr(34) + ">")}개, 1개 기대')
    return s.replace('<div class="duo">', band + '\n<div class="duo">', 1)


def main():
    check = "--check" in sys.argv
    p = V.load_promo()
    changed = []
    for path in LP + [HOME]:
        rel = os.path.relpath(path, ROOT)
        with open(path, encoding="utf-8") as f:
            s = f.read()
        new = apply_home(s, p) if path == HOME else apply_lp(s, rel, p)
        if new != s:
            changed.append(rel)
            if not check:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new)
    print(f"promo {'점검' if check else '적용'}: LP {len(LP)} + 홈 1 / 변경 {len(changed)} {changed if changed else ''} / 행사 {'중' if p else '없음'}")
    if check and changed:
        sys.exit(1)


if __name__ == "__main__":
    main()
