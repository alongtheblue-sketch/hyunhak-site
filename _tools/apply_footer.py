#!/usr/bin/env python3
"""공용 footer + 모바일 고정 바 통일. 멱등.
   플랫폼 v2 (<body class="v2">): v2_shell.footer()/fix() 로 <footer>…</footer>, <nav class="fix">…</nav> 교체
     (자리표시 <!--v2:footer--> <!--v2:fix--> 허용). 푸터가 </main> 앞이면 뒤로 이동 (contentinfo 랜드마크).
   제외 = programs/(자체 LP 푸터), reader.html, insta.html, --skip."""
import re, sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v2_shell as V

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE = {"reader.html", "insta.html"}
F = re.compile(r'<footer\b[^>]*>.*?</footer>', re.S)
# 짧은 본문 면만 두 행(법적 링크, 펼침 정보)으로 접는다. FAQ/고객센터는 긴 본문이라 제외.
COMPACT = {"notice.html", "pay_done.html", "404.html", "cart.html", "login.html"}


def compact_body(s, rel):
    def replace(m):
        classes = [c for c in m[2].split() if c != "ft-compact"]
        if rel in COMPACT:
            classes.append("ft-compact")
        return m[1] + " ".join(classes) + m[3]
    return re.sub(r'(<body\b[^>]*\bclass=")([^"]*)(")', replace, s, count=1)


def main():
    skip = set(EXCLUDE); check = "--check" in sys.argv
    for i, a in enumerate(sys.argv):
        if a == "--skip": skip |= set(x for x in sys.argv[i + 1].split(",") if x)
    changed = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        if rel in skip or rel.startswith("_") or rel.startswith("programs/") or "/_" in "/" + rel: continue
        s = open(path, encoding="utf-8").read()
        if '<body class="v2' not in s:
            print("v2 아님 (footer 미적용):", rel); continue
        new = V.apply_footer(compact_body(s, rel), rel, compact=rel in COMPACT)
        new = V.apply_fix(new, rel)
        if not V.FOOTER_RE.search(s): print("footer 없음:", rel)
        fm = F.search(new)
        if fm and "</main>" in new[fm.end():]:
            blk = fm.group(0); rest = new[fm.end():]
            new = new[:fm.start()] + rest.replace("</main>", "</main>\n" + blk, 1)
        if new != s:
            changed += 1
            if not check: open(path, "w", encoding="utf-8").write(new)
    print(("변경 필요" if check else "변경"), changed)
    return 1 if (check and changed) else 0


if __name__ == "__main__": sys.exit(main())
