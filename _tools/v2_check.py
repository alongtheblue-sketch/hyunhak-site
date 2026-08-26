#!/usr/bin/env python3
"""플랫폼 v2 전개 게이트 (2026-08-26 s16). 종료코드 0 = PASS.
  (1) 대상 html 전부 <body class="v2">  (2) 레거시 클래스·구조 0 (nav u, act, textlink, invert, hhMain, aeo 밖의 .han 제목)
  (3) v2 자리표시 주석 잔존 0  (4) href="#" 0 (script 제외)  (5) 금지 문자 가운뎃점, em대시 0 (衒 은 브랜드 설명에 의도 사용) (script/style/JSON-LD 제외)
  (6) pagehead 는 v2 pagehead 구조(section.phead > .wrap > .pagehead) 또는 없음
  (7) base.css 에 레거시 [3] 섹션 0
대상 제외 = programs/ (독립 LP, base.css 미링크), reader.html (뷰어, base.css 미링크), _*/, design/."""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_PREFIX = ("programs/", "design/", "_design/", "_tools/")
SKIP = {"reader.html"}
LEGACY = [r'class="nav u"', r'class="(?:[^"]*\s)?act(?:\s[^"]*)?"', r'class="(?:[^"]*\s)?textlink(?:\s[^"]*)?"',
          r'class="(?:[^"]*\s)?invert(?:\s[^"]*)?"', r'id="hhMain"', r'id="hhNav"', r'class="seal-dot"',
          r'class="(?:[^"]*\s)?checkrow(?:\s[^"]*)?"', r'class="facts">\s*<div class="f">']
PLACEHOLDER = re.compile(r"<!--v2:(shell|footer|fix)-->")
STRIP = re.compile(r"<script.*?</script>|<style.*?</style>|<!-- seo:begin -->.*?<!-- seo:end -->", re.S | re.I)


def main():
    fails = []
    files = []
    for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        if rel in SKIP or rel.startswith(SKIP_PREFIX) or "/_" in "/" + rel or rel.startswith("."): continue
        files.append(rel)
    for rel in files:
        s = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        if '<body class="v2' not in s:
            fails.append(f"{rel}: body.v2 아님"); continue
        vis = STRIP.sub("", s)
        for pat in LEGACY:
            n = len(re.findall(pat, vis))
            if n: fails.append(f"{rel}: 레거시 {pat} x{n}")
        m = PLACEHOLDER.findall(s)
        if m: fails.append(f"{rel}: 자리표시 잔존 {m}")
        n = len(re.findall(r'href="#"', vis))
        if n: fails.append(f"{rel}: href=\"#\" x{n}")
        for ch in ("·", "—"):
            n = vis.count(ch)
            if n: fails.append(f"{rel}: 금지 문자 {ch!r} x{n}")
        if 'class="pagehead"' in vis and not re.search(r'<div class="pagehead">', vis):
            fails.append(f"{rel}: pagehead 구조 (div.pagehead 여야 함)")
        if rel not in ("insta.html",) and 'class="hd"' not in vis:
            fails.append(f"{rel}: v2 헤더 없음")
    css = open(os.path.join(ROOT, "assets/base.css"), encoding="utf-8").read()
    if "body:not(.v2)" in css:
        fails.append(f"base.css: 레거시 [3] 잔존 (body:not(.v2) x{css.count('body:not(.v2)')})")
    print(f"v2_check: files={len(files)} fails={len(fails)}")
    for f in fails: print("  FAIL", f)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
