#!/usr/bin/env python3
"""s44 후속 c: critic(가이드북 35/45 YES) P2 반영 3건 + 스튜디오 동일 적용. 멱등.
 (1) .pricenote 행 길이 65.5자 → max-width:var(--measure)  (2) 구매 바 라벨 .nm 11px→12px, 색 --gray→--body(대비 4.60→6.9)  (3) .alt 값의 "원" 을 mono b 안으로(16px 통일)."""
import sys, shutil, datetime
from pathlib import Path
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M')
def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, (old[:70], 'expected', n, 'got', c); return s.replace(old, new)
G = Path('/Users/gregory/Workspace/hyunhak-site/_design/guidebook_detail_20260903/build/build_page.py'); g = G.read_text()
S = Path('/Users/gregory/Workspace/hyunhak-site/_design/studio_detail_20260903/build/page.css'); c = S.read_text()
if 'max-width:var(--measure)}  /* GS-22-2' in g and 'critic s44 P2' in c:
    print('already applied, no-op'); sys.exit(0)
shutil.copy2(G, G.with_name(G.name + f'.bak.{ts}_pre_s44c2')); shutil.copy2(S, S.with_name(S.name + f'.bak.{ts}_pre_s44c'))
g = rep(g, '.pricenote{font-size:var(--t-base);line-height:1.65;color:var(--body);margin-top:var(--s4);max-width:none}  /* GS-22-2: 절반 근거는 카드 밖 주석 16px (G1 하한) */',
           '.pricenote{font-size:var(--t-base);line-height:1.65;color:var(--body);margin-top:var(--s4);max-width:var(--measure)}  /* GS-22-2: 절반 근거는 카드 밖 주석 16px (G1 하한). critic s44 P2: 행 65.5자 → 본문 measure 36em */')
g = rep(g, '<p class="alt">PDF 소장판 전권 <b>1<span class="c">,</span>705<span class="c">,</span>000</b>원</p>',
           '<p class="alt">PDF 소장판 전권 <b>1<span class="c">,</span>705<span class="c">,</span>000원</b></p>')
g = rep(g, '  .buybar .lab{display:flex;flex-direction:column;justify-content:center;min-height:44px;min-width:0;margin:0;color:var(--gray)}\n  .buybar .nm{font-size:var(--t-xs);',
           '  .buybar .lab{display:flex;flex-direction:column;justify-content:center;min-height:44px;min-width:0;margin:0;color:var(--body)}  /* critic s44 P2: 반투명 바 위 대비 4.60 → --body 6.9 */\n  .buybar .nm{font-size:var(--t-cap);')
c = rep(c, '  .buybar .lab{display:flex;flex-direction:column;justify-content:center;min-height:44px;min-width:0;margin:0;color:var(--gray)}\n  .buybar .nm{font-size:var(--t-xs);',
           '  .buybar .lab{display:flex;flex-direction:column;justify-content:center;min-height:44px;min-width:0;margin:0;color:var(--body)}  /* critic s44 P2(가이드북 면 지적, 두 면 동일): 반투명 바 위 대비 4.60 → --body 6.9, 라벨 11 → 12px */\n  .buybar .nm{font-size:var(--t-cap);')
G.write_text(g); S.write_text(c); print('applied c; backups', ts)
