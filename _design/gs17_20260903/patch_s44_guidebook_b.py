#!/usr/bin/env python3
"""s44 후속 b: GS-24-2 계측에서 PDF 소장판 카드 죽은 하단 60px(21.8%) 잔존 → 약관 §6 ②③ 사실에 맞는 항목 1개를 더해 세 카드 내용량을 맞춘다. 멱등."""
import sys, shutil, datetime
from pathlib import Path
P = Path('/Users/gregory/Workspace/hyunhak-site/_design/guidebook_detail_20260903/build/build_page.py')
s = P.read_text(encoding='utf-8')
old = '<ul><li>워터마크 파일 발급, 구매 계정 각인</li><li>파일 내려받기와 열람</li><li>파일이 발급된 뒤에는 청약철회가 제한됩니다</li></ul></li>'
new = '<ul><li>워터마크 파일 발급, 구매 계정 각인</li><li>파일 내려받기와 열람</li><li>발급 전에는 7일 이내 청약철회</li><li>파일이 발급된 뒤에는 청약철회가 제한됩니다</li></ul></li>'
if new in s: print('already applied, no-op'); sys.exit(0)
assert s.count(old) == 1
shutil.copy2(P, P.with_name(P.name + '.bak.' + datetime.datetime.now().strftime('%Y%m%d_%H%M') + '_pre_s44b'))
P.write_text(s.replace(old, new), encoding='utf-8'); print('applied')
