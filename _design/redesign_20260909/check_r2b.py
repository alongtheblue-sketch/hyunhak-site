#!/usr/bin/env python3
"""R2b 승인 변경만 허용하면서 기존 R2 보존 검사 전부를 재사용한다."""
import json
import re
import subprocess
from pathlib import Path

import check_r2 as r2

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def main():
    # R2의 전 파일 app.js 동결에서 이번 발주 D2 필수1의 정확한 실패 분기만 예외다.
    # 기존 검증기는 수정하지 않는다. 승인된 diff를 뺀 전체 바이트가 이전 정본과 같아야 한다.
    original = r2.old
    old_branch = '    if (cfg._failed) return undefined;   // 두 번 다 실패 = 미확정. 배너·가격·장바구니 단가 그대로'
    new_branch = '''    if (cfg._failed) {
      renderPromoPrices();   // 미확정이면 행사만 숨기고 정가와 저장 장바구니 단가를 보존한다.
      document.querySelectorAll("[data-promo-popup]").forEach((el) => { el.hidden = true; });
      return undefined;
    }'''
    current = (ROOT / 'assets/app.js').read_text()
    assert current.count(new_branch) == 1
    assert current.replace(new_branch, old_branch).encode() == original('assets/app.js'), 'APP_JS_REQUEST 밖 변경'
    approved = original('assets/app.js').replace(old_branch.encode(), new_branch.encode())
    r2.old = lambda rel: approved if rel == 'assets/app.js' else original(rel)
    try:
        result = r2.main()
    finally:
        r2.old = original
    assert not result, 'R2 보존 검사 실패'
    copy = json.loads((ROOT / '_tools/r2_copy.json').read_text())
    assert copy['home_h1'][0] == '대학마다 다른 면접을 그 대학의 요강과 기출로 준비합니다.'
    home = (ROOT / 'index.html').read_text()
    for kind, prices in [('guidebook', ['33000', '511500']), ('studio', ['495000', '33000'])]:
        card = re.search(r'<article[^>]*data-product="'+kind+r'".*?</article>', home, re.S)[0]
        assert card.count('class="r2-card-price"') == 2
        assert re.findall(r'data-list-price="(\d+)"', card) == prices
    find = re.search(r'<section[^>]*id="find".*?</section>', home, re.S)[0]
    more = re.search(r'<div class="more">(.*?)</div>', find, re.S)[1]
    assert re.findall(r'href="([^"]+)"', more) == ['guidebook/index.html']
    assert home.count('data-copy="studio_link"') == 1
    assert copy['faq_source_a'][0] in home
    assert len(re.findall(r'13년차', re.search(r'<main.*?</main>', home, re.S)[0])) == 1
    studio = (ROOT / 'studio.html').read_text()
    assert 'class="promo r2-promo"' in studio and 'class="promo rule"' not in studio
    assert 'class="tlink" href="#trialGo" id="trialGo"' in studio
    # 고정된 R2b 시작점과 비교하므로 stage/대리 커밋 뒤에도 검사 범위가 유지된다.
    changed = set(subprocess.check_output(['git', 'diff', '--name-only', 'b69f07e', '--', '*.html'], cwd=ROOT, text=True).splitlines())
    changed.update(subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '--', '*.html'], cwd=ROOT, text=True).splitlines())
    allowed = {33000, 495000, 220000, 511500, 1705000, 16500, 110000, 1023000, 3410000, 990000}
    amounts = set()
    for rel in changed:
        if rel.startswith(('_tools/', '_design/')):
            continue
        source = (ROOT / rel).read_text()
        source = re.sub(r'<script\b[^>]*type="application/ld\+json"[^>]*>.*?</script>|<style\b.*?</style>|<!--.*?-->', '', source, flags=re.S)
        source = re.sub(r'<[^>]+>', '', source)
        found = {int(n.replace(',', '')) for n in re.findall(r'(?<![\d.,])(\d{1,3}(?:,\d{3})+|\d+)\s*원', source)}
        assert found <= allowed, f'{rel}: 원장 밖 금액 {found - allowed}'
        amounts |= found
    print('r2b_static: approved_app_diff=PASS price_rows=2/2 find_link=1 copy=PASS campaign=PASS')
    print('amounts: ' + ', '.join(f'{n:,}' for n in sorted(amounts)) + '; new_amounts=0 (JSON-LD 제외, HTML/inline JS의 원 표기)')
    missing = []
    for kind in ('guidebook', 'studio', 'korea', 'yonsei'):
        rel = f'programs/{kind}.html'
        source = (ROOT / rel).read_text()
        if not re.search(r'<label\b[^>]*class="ph"', source) or 'assets/app.js' not in source:
            missing.append(rel)
            print(f'FAIL B1/C prerequisite: {rel}: shared label.ph / app.js absent in supplied R2 baseline')
    print(f'r2b_program_prerequisites: targets=4 ready={4-len(missing)} FAIL={len(missing)}')
    return bool(missing)


if __name__ == '__main__':
    raise SystemExit(main())
