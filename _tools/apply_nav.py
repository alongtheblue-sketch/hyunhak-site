#!/usr/bin/env python3
"""공용 nav 일괄 적용. <header class="nav ..."> ... </header> 블록을 정본으로 교체한다.
   깊이에 따라 상대경로 prefix 계산, 현재 페이지 항목에 class="on". 멱등.
   제외 = programs/*.html(자체 LP 헤더), reader.html(뷰어), 인자 --skip 로 추가 제외.
   사용: python3 _tools/apply_nav.py [--skip library.html,my.html] [--check]"""
import re, sys, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITEMS = [  # (href, label, 매칭 파일들)
    ("studio.html", "면접 스튜디오", {"studio.html"}),
    ("guidebook/index.html", "가이드북", {"guidebook/"}),
    ("store.html", "스토어", {"store.html", "store_item.html"}),
    ("interview/index.html", "면접 아카이브", {"interview/"}),
    ("library.html", "자료실", {"library.html"}),
    ("about.html", "연구소", {"about.html", "faq.html", "notice.html"}),
]
AUX = [("login.html", "로그인"), ("join.html", "가입"), ("cart.html", "장바구니")]
EXCLUDE = {"reader.html", "insta.html"}   # insta = 링크 허브, nav/footer 없음
HDR = re.compile(r'<header class="nav[^"]*">.*?</header>', re.S)

def build(rel, prefix):
    on = lambda keys: any(rel == k or (k.endswith("/") and rel.startswith(k)) for k in keys)
    nav = "".join(f'<a href="{prefix}{h}"{" class=\"on\" aria-current=\"page\"" if on(k) else ""}>{l}</a>' for h, l, k in ITEMS)
    aux = "".join(f'<a href="{prefix}{h}">{l}</a>' for h, l in AUX)
    aux += '<button type="button" class="menu" aria-expanded="false" aria-controls="hhNav">메뉴</button>'
    return (f'<header class="nav u">\n  <a class="brand" href="{prefix}index.html">현학적 연구소</a>\n'
            f'  <nav id="hhNav">{nav}</nav>\n  <div class="aux">{aux}</div>\n</header>')

def main():
    skip = set(EXCLUDE); check = "--check" in sys.argv
    for i, a in enumerate(sys.argv):
        if a == "--skip": skip |= set(sys.argv[i + 1].split(","))
    changed = missing = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        if rel in skip or rel.startswith("programs/") or rel.startswith(("design/", "_design/", "_tools/")) or "/_" in "/" + rel: continue
        s = open(path, encoding="utf-8").read()
        if '<body class="v2">' in s: continue   # 플랫폼 v2 페이지는 자체 헤더/푸터 (2026-08-26)
        if not HDR.search(s): missing += 1; print("nav 없음:", rel); continue
        prefix = "/" if rel == "404.html" else "../" * (rel.count("/"))   # 404 는 임의 경로에서 서빙
        new = HDR.sub(lambda m: build(rel, prefix), s, count=1)
        if '<a class="skip"' not in new:
            new = new.replace('<header class="nav u">', '<a class="skip" href="#hhMain">본문으로 건너뛰기</a>\n<header class="nav u">', 1)
        if 'id="hhMain"' not in new:
            new = re.sub(r"<main\b(?![^>]*id=)", '<main id="hhMain"', new, count=1)
        if new != s:
            changed += 1
            if not check: open(path, "w", encoding="utf-8").write(new)
    print(f"{'변경 필요' if check else '변경'} {changed} / nav 없음 {missing}")
    return 1 if (check and changed) else 0

if __name__ == "__main__": sys.exit(main())
