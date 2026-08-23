#!/usr/bin/env python3
"""공용 footer 통일 (약관·개인정보처리방침 링크 전면 배치). 멱등. 제외 = programs/(자체 LP 푸터), reader.html, --skip."""
import re, sys, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE = {"reader.html", "insta.html"}   # insta = 링크 허브, nav/footer 없음
F = re.compile(r'<footer\b[^>]*>.*?</footer>', re.S)
def build(prefix):
    return ('<footer class="u">\n  <span>현학적 연구소 <span class="han">玄學的 硏究所</span></span>\n'
            '  <span>www.hyunhak.com</span>\n  <span>admin@hyunhak.com</span>\n'
            f'  <span class="bizline">대표, 사업자등록번호, 통신판매업신고 [정식 오픈 전 기재]</span>\n'
            f'  <span><a href="{prefix}terms.html">이용약관</a> <a href="{prefix}privacy.html">개인정보처리방침</a></span>\n</footer>')
def main():
    skip = set(EXCLUDE); check = "--check" in sys.argv
    for i, a in enumerate(sys.argv):
        if a == "--skip": skip |= set(sys.argv[i + 1].split(","))
    changed = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        if rel in skip or rel.startswith("_"): continue   # programs 포함(footer 이동만 적용돼도 무해)
        s = open(path, encoding="utf-8").read()
        if not F.search(s): print("footer 없음:", rel); continue
        prefix = "/" if rel == "404.html" else "../" * rel.count("/")
        if rel.startswith("programs/"):
            new = s          # LP 는 자체 푸터 유지 (RELEASE_OK 지면) — 위치 이동만
        else:
            new = F.sub(lambda m: build(prefix), s, count=1)
        # footer 가 </main> 앞이면 뒤로 이동 (contentinfo 랜드마크)
        fm = F.search(new)
        if fm and "</main>" in new[fm.end():]:
            blk = fm.group(0)
            rest = new[fm.end():]
            new = new[:fm.start()] + rest.replace("</main>", "</main>\n" + blk, 1)
        # 가이드북: footer 가 main 안 → main 밖으로
        new = new.replace("</footer>\n</main>", "</footer>\n</main>") if False else new
        if new != s: changed += 1; open(path, "w", encoding="utf-8").write(new) if not check else None
    print(("변경 필요" if check else "변경"), changed)
    return 1 if (check and changed) else 0
if __name__ == "__main__": sys.exit(main())
