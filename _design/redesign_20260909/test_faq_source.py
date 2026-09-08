#!/usr/bin/env python3
"""Source propagation and negative controls run in memory; no output pages are edited."""
import copy
import json
import re
import sys
from types import SimpleNamespace
from unittest.mock import patch

from faq_ld_check import ROOT, PAGES, check_page

sys.path.insert(0, str(ROOT / '_tools'))
import r2_faq
import seo_common
import seo_inject

source_copy = json.loads((ROOT / '_tools/r2_copy.json').read_text())
manifest = seo_common.load_manifest()
checks = 0

changed = copy.deepcopy(source_copy)
changed['faq_refund_q'][0] = '질문 & <답변> "원천"'
fake_path = SimpleNamespace(read_text=lambda **kwargs: json.dumps(changed, ensure_ascii=False))
with patch.object(r2_faq, 'COPY_PATH', fake_path):
    for rel, count in PAGES.items():
        source = (ROOT / rel).read_text()
        if rel == 'index.html':
            source = r2_faq.sync_home(source)
        else:
            source = re.sub(r'<dl class="r2-faq">.*?</dl>', lambda _: r2_faq.render_faq(rel), source, flags=re.S)
        entry = seo_common.resolve_entry(manifest, rel)
        source = seo_inject.inject_head(source, seo_inject.build_block(manifest, rel, entry, source))
        check_page(source, count, changed)
        checks += 1
        print(f'PASS source change propagates to visible/JSON-LD with HTML/JSON escaping: {rel}')

rel = 'index.html'
source = (ROOT / rel).read_text()
ld_pattern = r'(<script\b[^>]*type="application/ld\+json"[^>]*>)(.*?)(</script>)'
def change_ld(kind):
    def change(match):
        data = json.loads(match[2])
        node = next(n for n in data['@graph'] if n['@type'] == 'FAQPage')
        if kind == 'question':
            node['mainEntity'][0]['name'] += ' 불일치'
        elif kind == 'answer':
            node['mainEntity'][0]['acceptedAnswer']['text'] += ' 불일치'
        elif kind == 'duplicate':
            node['mainEntity'].append(node['mainEntity'][0])
        elif kind == 'missing':
            node['mainEntity'].pop()
        return match[1] + json.dumps(data, ensure_ascii=False) + match[3]
    return re.sub(ld_pattern, change, source, flags=re.S)

mutations = {kind: change_ld(kind) for kind in ('question', 'answer', 'duplicate', 'missing')}
mutations['hidden'] = source.replace('<dl class="r2-faq">', '<dl class="r2-faq" hidden>')
mutations['standalone'] = source + '<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[]}</script>'
mutations['stale_copy'] = source.replace('>가이드북 열람 방법</span>', '>옛 질문</span>')
for kind, mutated in mutations.items():
    try:
        check_page(mutated, PAGES[rel], source_copy)
    except AssertionError:
        checks += 1
        print(f'PASS negative control rejected: {kind}')
    else:
        raise AssertionError(f'false PASS: {kind}')
print(f'faq_source_contract: checks={checks} FAIL=0')
