#!/usr/bin/env python3
"""GS-24-1 (2026-09-04): base.css 의 .rv 는 opacity 0 으로 시작하고 인라인 스크립트가 .in 을 붙여야 보인다.
   스크립트가 막히면 v2 면(about, faq, terms, guidebook/* 등)의 리빌 요소가 통째로 빈다(실측 10면 전건 비가시, probe_s44_before.json).
   base.css 를 링크하는 모든 면의 그 <link> 바로 뒤에 <noscript><style>.rv{opacity:1;transform:none}</style></noscript> 한 줄. 멱등.
   programs/*.html 은 base.css 를 안 쓰고 각 빌더 head 에 같은 noscript 를 이미 둔다(GS-17 critic P1)."""
import re, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {"reader.html"}
NOSCRIPT = '<noscript><style>.rv{opacity:1;transform:none}</style></noscript>'
PAT = re.compile(r'(<link rel="stylesheet" href="(?:\.\./)*assets/base\.css">)(?!' + re.escape(NOSCRIPT) + ')')
n = 0; seen = 0
for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
    rel = os.path.relpath(p, ROOT)
    if rel in SKIP or rel.startswith(("design/", "_design/", "_tools/", "node_modules/", ".wrangler/")) or '.bak' in rel: continue
    s = open(p, encoding="utf-8").read()
    if 'assets/base.css' not in s: continue
    seen += 1
    t = PAT.sub(lambda m: m.group(1) + NOSCRIPT, s)
    if t != s:
        open(p, "w", encoding="utf-8").write(t); n += 1
print("base.css 면", seen, "변경", n)
