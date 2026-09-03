#!/usr/bin/env python3
"""s44 후속 d: 스튜디오 critic(35/45 YES) P2 반영 3건. 멱등.
 P2-1 #p2·#p3 .head 트랙(5fr/7fr)이 .body(6fr/6fr) 와 79.3px 어긋남 → head 도 6fr/6fr
 P2-2 다섯 카드 중 .tail(3단계)·.foot(5단계) 만 바닥 규칙선 → 선을 걷어 0/5 로 대칭
 P2-5 .unit dd 행간 1.5 → 한글 하한 1.55"""
import sys, shutil, datetime
from pathlib import Path
S = Path('/Users/gregory/Workspace/hyunhak-site/_design/studio_detail_20260903/build/page.css'); c = S.read_text()
if 'critic s44 P2-1' in c: print('already applied, no-op'); sys.exit(0)
def rep(s, old, new, n=1):
    k = s.count(old); assert k == n, (old[:70], n, k); return s.replace(old, new)
shutil.copy2(S, S.with_name(S.name + '.bak.' + datetime.datetime.now().strftime('%Y%m%d_%H%M') + '_pre_s44d'))
c = rep(c, '.part#p2 .body,.part#p3 .body{grid-template-columns:minmax(0,6fr) minmax(0,6fr)}',
           '.part#p2 .body,.part#p3 .body,.part#p2 .head,.part#p3 .head{grid-template-columns:minmax(0,6fr) minmax(0,6fr)}  /* critic s44 P2-1: head 를 body 트랙에 맞춰 제목 좌변 79.3px 어긋남 해소 */')
c = rep(c, 'gap:var(--s2);width:100%;margin-top:auto;padding-top:var(--s3);border-top:var(--rule)}  /* GS-24-5: 3단계 카드만',
           'gap:var(--s2);width:100%;margin-top:auto;padding-top:var(--s3);border-top:0}  /* critic s44 P2-2: 바닥 규칙선은 3·5단계에만 있어 2/5, 걷어서 0/5. GS-24-5: 3단계 카드만')
c = rep(c, '.rail.anchor .foot{display:flex;flex-direction:column;align-items:flex-start;gap:var(--s2);width:100%;margin-top:auto;padding-top:var(--s3);border-top:var(--rule)}',
           '.rail.anchor .foot{display:flex;flex-direction:column;align-items:flex-start;gap:var(--s2);width:100%;margin-top:auto;padding-top:var(--s3);border-top:0}')
c = rep(c, '.unit dd{line-height:1.5}', '.unit dd{line-height:1.55}  /* critic s44 P2-5: 한글 행간 하한 */')
S.write_text(c); print('applied d')
