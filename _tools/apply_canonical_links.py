#!/usr/bin/env python3
"""내부 링크를 canonical 주소 꼴로 맞춘다 (2026-11-16).

배경: 목록 canonical 은 /guidebook/, 홈 canonical 은 / 인데 면 안의 <a href> 는
guidebook/index.html, index.html 을 가리켰다 (산출 면 기준 385개). 서치 콘솔에는
/guidebook/ 과 /guidebook/index.html 이 따로 잡혔다. 워커는 두 꼴 모두 200 으로 답하므로
동작은 같고, 검색엔진이 받는 내부 링크 신호만 canonical 한쪽으로 모인다.

규칙: <a> 의 href 경로 마지막 조각이 index.html 이면 그 조각을 뗀다.
  index.html            → ./
  index.html#find       → ./#find
  ../index.html         → ../
  guidebook/index.html  → guidebook/
  /index.html           → /
  https://hyunhak.com/guidebook/index.html → https://hyunhak.com/guidebook/
다른 호스트로 가는 링크, <link>, <script>, JSON-LD 는 건드리지 않는다.

사용:
  python3 _tools/apply_canonical_links.py           고쳐 쓴다 (멱등)
  python3 _tools/apply_canonical_links.py --check   남은 옛 꼴이 있으면 종료 코드 1
  python3 _tools/apply_canonical_links.py --selftest
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {"reader.html"}
SKIP_PREFIX = ("design/", "_design/", "_docs/", "_tools/", "node_modules/", ".git/", "outputs/")
OWN_HOSTS = ("https://hyunhak.com", "http://hyunhak.com", "https://www.hyunhak.com", "http://www.hyunhak.com")

# 여는 <a ...> 태그 하나. 속성 값 안의 > 는 이 사이트 산출물에 없다 (seo_check 가 본다).
A_TAG = re.compile(r"<a\b[^>]*>", re.I)
HREF = re.compile(r'(\bhref\s*=\s*)(["\'])(.*?)\2', re.I | re.S)


def canonical_href(href: str) -> str:
    """index.html 로 끝나는 내부 경로면 디렉터리 꼴을 돌려준다. 아니면 받은 값 그대로."""
    m = re.match(r"^([^?#]*)([?#].*)?$", href, re.S)
    path, tail = m.group(1), m.group(2) or ""
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", path) or path.startswith("//"):
        if not path.startswith(OWN_HOSTS):
            return href
    if path != "index.html" and not path.endswith("/index.html"):
        return href
    head = path[: -len("index.html")]
    return (head or "./") + tail


def rewrite(html: str):
    n = 0

    def tag_sub(tm):
        nonlocal n

        def href_sub(hm):
            nonlocal n
            new = canonical_href(hm.group(3))
            if new != hm.group(3):
                n += 1
            return hm.group(1) + hm.group(2) + new + hm.group(2)

        return HREF.sub(href_sub, tm.group(0), count=1)

    return A_TAG.sub(tag_sub, html), n


def pages():
    for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        if rel in SKIP or ".bak" in rel or rel.startswith(SKIP_PREFIX):
            continue
        yield rel, p


def selftest() -> int:
    cases = [
        ("index.html", "./"),
        ("index.html#find", "./#find"),
        ("index.html?utm_source=instagram&utm_content=home", "./?utm_source=instagram&utm_content=home"),
        ("../index.html", "../"),
        ("../index.html#why", "../#why"),
        ("guidebook/index.html", "guidebook/"),
        ("../guidebook/index.html", "../guidebook/"),
        ("/index.html", "/"),
        ("/guidebook/index.html", "/guidebook/"),
        ("https://hyunhak.com/guidebook/index.html", "https://hyunhak.com/guidebook/"),
        # 그대로 두어야 하는 것
        ("./", "./"),
        ("guidebook/", "guidebook/"),
        ("guidebook/ajou.html", "guidebook/ajou.html"),
        ("myindex.html", "myindex.html"),
        ("guidebook/myindex.html", "guidebook/myindex.html"),
        ("index.html.bak", "index.html.bak"),
        ("https://example.com/index.html", "https://example.com/index.html"),
        ("//example.com/index.html", "//example.com/index.html"),
        ("mailto:admin@hyunhak.com", "mailto:admin@hyunhak.com"),
        ("#grid", "#grid"),
        ("faq.html?next=index.html", "faq.html?next=index.html"),
    ]
    bad = [(a, b, canonical_href(a)) for a, b in cases if canonical_href(a) != b]
    doc = ('<link rel="canonical" href="https://hyunhak.com/index.html">'
           '<a class="brand" href="index.html" aria-label="홈">a</a>'
           "<a href='../guidebook/index.html#grid'>b</a>"
           '<a data-x="index.html" href="about.html">c</a>'
           '<script>var u="<a href=\\"index.html\\">";</script>')
    out, n = rewrite(doc)
    want = ('<link rel="canonical" href="https://hyunhak.com/index.html">'
            '<a class="brand" href="./" aria-label="홈">a</a>'
            "<a href='../guidebook/#grid'>b</a>"
            '<a data-x="index.html" href="about.html">c</a>'
            '<script>var u="<a href=\\"index.html\\">";</script>')
    if out != want or n != 2:
        bad.append(("문서 변환", want, out))
    again, n2 = rewrite(out)
    if again != out or n2 != 0:
        bad.append(("멱등", out, again))
    for row in bad:
        print("SELFTEST FAIL", row)
    print(f"apply_canonical_links selftest: {len(cases) + 2 - len(bad)}/{len(cases) + 2}")
    return 1 if bad else 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    check = "--check" in sys.argv
    changed, total, left = 0, 0, []
    for rel, p in pages():
        with open(p, encoding="utf-8") as f:
            src = f.read()
        out, n = rewrite(src)
        if not n:
            continue
        total += n
        if check:
            left.append(f"{rel}: {n}")
            continue
        with open(p, "w", encoding="utf-8") as f:
            f.write(out)
        changed += 1
    if check:
        for row in left[:20]:
            print("FAIL", row)
        print(f"canonical_links check: 옛 꼴 링크 {total}개 ({len(left)}면)" if left else "canonical_links check: PASS (옛 꼴 링크 0)")
        return 1 if left else 0
    print(f"canonical_links: {changed}면 {total}개 링크를 canonical 꼴로")
    return 0


if __name__ == "__main__":
    sys.exit(main())
