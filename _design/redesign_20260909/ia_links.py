#!/usr/bin/env python3
"""IA 동선 계수: 면별 본문(셸·푸터·모바일 탭·script 제외) 내부 링크 건수·목적지 종류, 홈 기준 클릭 거리. 사용: python3 ia_links.py [ROOT]"""
import re, glob, os, sys, collections, json
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
os.chdir(ROOT)
pages = [p for p in glob.glob('**/*.html', recursive=True) if not p.startswith(('_design/', '_docs/', '_tools/', 'design/', 'lectures/')) and '/_' not in '/' + p]
def strip(s):
    for pat in (r'<script.*?</script>', r'<header.*?</header>', r'<footer.*?</footer>', r'<nav class="fix".*?</nav>'):
        s = re.sub(pat, '', s, flags=re.S)
    return s
def targets(p, s):
    out = []
    for h in re.findall(r'href="([^"#?]+)(?:[#?][^"]*)?"', s):
        if h.startswith(('http', 'mailto', 'tel', '//', 'data:')): continue
        t = os.path.normpath(os.path.join(os.path.dirname(p), h)).replace('\\', '/')
        if t.endswith('/'): t += 'index.html'
        if t.endswith('.html'): out.append(t)
    return out
graph, body = {}, {}
for p in pages:
    s = open(p, encoding='utf-8').read()
    graph[p] = set(targets(p, s)); body[p] = targets(p, strip(s))
d = {'index.html': 0}; q = ['index.html']
while q:
    u = q.pop(0)
    for v in graph.get(u, ()):
        if v in graph and v not in d: d[v] = d[u] + 1; q.append(v)
core = ['index.html', 'programs/guidebook.html', 'programs/studio.html', 'guidebook/index.html', 'studio.html', 'ranking.html', 'b2b.html', 'lectures.html', 'my.html', 'cart.html']
print(f'pages={len(pages)} dist(home→cart)={d.get("cart.html")} dist(home→checkout)={d.get("checkout.html")}')
for p in core:
    if p not in body: print(f'{p}: (없음)'); continue
    c = collections.Counter(body[p])
    print(f'{p}: body_links={len(body[p])} targets={len(c)} max_repeat={max(c.values()) if c else 0} dist={d.get(p)}')
