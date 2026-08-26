#!/usr/bin/env python3
"""공용 nav 일괄 적용. 멱등.
   플랫폼 v2 (<body class="v2">): v2_shell.shell() 로 유틸바+헤더+모바일 메뉴 블록을 교체한다
     (자리표시 <!--v2:shell--> 또는 기존 <div class="util">…</header>). 현재 페이지 항목 class="on".
   전람 v1 레거시 (<header class="nav …">): 2026-08-26 하위 페이지 v2 전개로 대상 0. 잔존 시 보고만.
   제외 = programs/*.html(자체 LP 헤더, base.css 미링크), reader.html(뷰어), insta.html(링크 허브), --skip.
   사용: python3 _tools/apply_nav.py [--skip a.html,b.html] [--check]"""
import re, sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v2_shell as V

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE = {"reader.html", "insta.html"}   # insta = 링크 허브, nav/footer 없음
HDR_LEGACY = re.compile(r'<header class="nav[^"]*">.*?</header>', re.S)


def main():
    skip = set(EXCLUDE); check = "--check" in sys.argv
    for i, a in enumerate(sys.argv):
        if a == "--skip": skip |= set(x for x in sys.argv[i + 1].split(",") if x)
    changed = missing = legacy = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        if rel in skip or rel.startswith("programs/") or rel.startswith(("design/", "_design/", "_tools/")) or "/_" in "/" + rel: continue
        s = open(path, encoding="utf-8").read()
        if '<body class="v2' in s:
            new = V.apply_shell(s, rel)
            if not V.SHELL_RE.search(s): missing += 1; print("v2 셸 없음:", rel)
        elif HDR_LEGACY.search(s):
            legacy += 1; print("레거시 nav 잔존 (v2 전환 필요):", rel); continue
        else:
            missing += 1; print("nav 없음:", rel); continue
        if new != s:
            changed += 1
            if not check: open(path, "w", encoding="utf-8").write(new)
    print(f"{'변경 필요' if check else '변경'} {changed} / nav 없음 {missing} / 레거시 {legacy}")
    return 1 if (check and changed) or legacy else 0


if __name__ == "__main__": sys.exit(main())
