#!/usr/bin/env python3
"""외부 폰트 CSS(Google Fonts, Pretendard CDN)를 렌더 비차단으로 전환. 멱등.
   <link rel="stylesheet" href=URL> → preload as=style + onload 승격 + <noscript> 폴백. preconnect 보강."""
import re, glob, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {"library.html", "my.html", "reader.html"}
PAT = re.compile(r'(?<!<noscript>)<link rel="stylesheet" href="(https://(?:fonts\.googleapis\.com|cdn\.jsdelivr\.net)[^"]+)"[^>]*>')
def conv(m):
    u = m.group(1)
    return (f'<link rel="preload" as="style" href="{u}" onload="this.onload=null;this.rel=\'stylesheet\'">'
            f'<noscript><link rel="stylesheet" href="{u}"></noscript>')
n = 0
for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
    rel = os.path.relpath(p, ROOT)
    if rel in SKIP or rel.startswith(("design/", "_design/", "_tools/")): continue
    s = open(p, encoding="utf-8").read()
    t = PAT.sub(conv, s)
    if "cdn.jsdelivr.net" in t and 'rel="preconnect" href="https://cdn.jsdelivr.net"' not in t:
        t = t.replace('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
                      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>', 1)
    if "fonts.googleapis.com" in t and 'rel="preconnect" href="https://fonts.gstatic.com"' not in t:
        t = t.replace("<head>", '<head>\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', 1)
    if t != s:
        open(p, "w", encoding="utf-8").write(t); n += 1
print("변경", n)
