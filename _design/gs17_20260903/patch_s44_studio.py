#!/usr/bin/env python3
"""s44 스튜디오 소개 면 GS-24-5 묶음 패치. (a) 단위 카드 495,000 5회 반복 → 절 리드 한 줄 (b) 3단계 카드 링크 정렬(.tail 세로) (c) 구매 바 밑줄 먹색 (d) 배경 토큰 --paper-rgb. 멱등."""
import sys, shutil, datetime
from pathlib import Path
B = Path('/Users/gregory/Workspace/hyunhak-site/_design/studio_detail_20260903/build')
PY, CSS = B / 'build_page.py', B / 'page.css'
py, css = PY.read_text(encoding='utf-8'), CSS.read_text(encoding='utf-8')
if 'GS-24-5' in css:
    print('already applied, no-op'); sys.exit(0)
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M')
for p in (PY, CSS): shutil.copy2(p, p.with_name(p.name + f'.bak.{ts}_pre_s44'))
def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, (old[:70], 'expected', n, 'got', c); return s.replace(old, new)
# (a)
py = rep(py, '''<span class="won">495,000<small>원, 전권. 인강 포함</small></span><a class="tl" href="{href}">이 단위 보기</a></li>''',
             '''<a class="tl" href="{href}">이 단위 보기</a></li>''')
py = rep(py, '''<p class="lede" style="margin-top:var(--s4)">단위마다 지문 30편. 단위를 누르면 그 단위의 지문 목록과 담기가 있는 스튜디오 면으로 갑니다.</p>''',
             '''<p class="lede" style="margin-top:var(--s4)">단위마다 지문 30편, 전권 495,000원에 풀이법 인강 포함, 다섯 단위 같은 값. 단위를 누르면 그 단위의 지문 목록과 담기가 있는 스튜디오 면으로 갑니다.</p><!-- GS-24-5: 전권가는 카드 5장에 반복하지 않고 여기 한 번 -->''')
css = rep(css, '.unit .tl{margin-top:var(--s2);align-self:flex-start}',
               '.unit .tl{margin-top:auto;padding-top:var(--s3);align-self:flex-start}  /* GS-24-5: 카드 안 .won 을 걷어 링크가 바닥 정렬을 이어받는다 */')
# (b)
css = rep(css, '.rail.anchor .tail{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--s2) var(--s3);width:100%;margin-top:auto;padding-top:var(--s3);border-top:var(--rule)}',
               '.rail.anchor .tail{display:flex;flex-direction:column;align-items:flex-start;gap:var(--s2);width:100%;margin-top:auto;padding-top:var(--s3);border-top:var(--rule)}  /* GS-24-5: 3단계 카드만 링크가 오른쪽(225px)에 있어 5장 중 1장 이탈. .foot 과 같은 세로 배열로 정렬, DOM 은 그대로(S5 카드 변주 유지) */')
# (c)
css = rep(css, '.buybar .nm{font-size:var(--t-xs);line-height:1.3;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--hair)}',
               '.buybar .nm{font-size:var(--t-xs);line-height:1.3;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--ink)}  /* GS-24-5: 탭 단서 밑줄을 --hair 에서 먹색으로(GS-23 확대 안내와 같은 처분) */')
# (d)
css = rep(css, '--seal:#BC3529;--brown:#3B2C20;--gold:#D0AC6E;--hair:rgba(49,46,46,.40);--hairs:rgba(49,46,46,.24);',
               '--seal:#BC3529;--brown:#3B2C20;--gold:#D0AC6E;--hair:rgba(49,46,46,.40);--hairs:rgba(49,46,46,.24);--paper-rgb:244,239,227;')
css = rep(css, 'background:rgba(244,239,227,.96);', 'background:rgba(var(--paper-rgb),.96);')
PY.write_text(py, encoding='utf-8'); CSS.write_text(css, encoding='utf-8')
print('applied; backups .bak.' + ts + '_pre_s44')
