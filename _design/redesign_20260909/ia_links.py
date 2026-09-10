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
def targets(p, s, keep_query=False):
    out = []
    for h, q in re.findall(r'href="([^"#?]+)((?:[#?][^"]*)?)"', s):
        if h.startswith(('http', 'mailto', 'tel', '//', 'data:')): continue
        t = os.path.normpath(os.path.join(os.path.dirname(p), h)).replace('\\', '/')
        if t.endswith('/'): t += 'index.html'
        if t.endswith('.html'): out.append(t + (q.split('#')[0] if keep_query and q.startswith('?') else ''))
    return out
# 목적지 「종류」: 대학별 안내면(guidebook/<slug>)·강의별 면(lectures/<slug>)은 한 종류로 접는다 (SECTION_SPEC_R3 §0 「목적지 종류」 = 면의 역할 단위. 2026-09-09 세션 판정, 원시 계수와 병기)
def kind(t):
    t = t.split('?')[0]
    if re.match(r'guidebook/(?!index\.html)[a-z-]+\.html$', t): return 'guidebook/<univ>.html'
    if re.match(r'lectures/[a-z-]+\.html$', t): return 'lectures/<lecture>.html'
    # IA1-1 A 결재 2026-09-10: 전형별 안내 8면은 같은 목적지 종류다.
    if re.match(r'interview/(?!index\.html)[a-z-]+\.html$', t): return 'interview/<code>.html'
    return t
graph, body, bodyq = {}, {}, {}
for p in pages:
    s = open(p, encoding='utf-8').read()
    graph[p] = set(targets(p, s)); body[p] = targets(p, strip(s)); bodyq[p] = targets(p, strip(s), keep_query=True)
d = {'index.html': 0}; q = ['index.html']
while q:
    u = q.pop(0)
    for v in graph.get(u, ()):
        if v in graph and v not in d: d[v] = d[u] + 1; q.append(v)
core = ['index.html', 'programs/guidebook.html', 'programs/studio.html', 'guidebook/index.html', 'studio.html', 'ranking.html', 'b2b.html', 'lectures.html', 'my.html', 'cart.html']
print(f'pages={len(pages)} dist(home→cart)={d.get("cart.html")} dist(home→checkout)={d.get("checkout.html")}')
for p in core:
    if p not in body: print(f'{p}: (없음)'); continue
    c = collections.Counter(body[p]); k = collections.Counter(kind(t) for t in body[p]); cq = collections.Counter(bodyq[p])
    print(f'{p}: body_links={len(body[p])} targets={len(c)} max_repeat={max(c.values()) if c else 0} dist={d.get(p)}'
          f' | kinds={len(k)} max_repeat_query_distinct={max(cq.values()) if cq else 0}')
