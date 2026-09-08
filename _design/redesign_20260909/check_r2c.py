#!/usr/bin/env python3
"""R2c-specific byte preservation against the supplied R2b commit."""
import json
import re
import subprocess
from pathlib import Path

from check_r2 import CopyParser
from faq_ld_check import PAGES

ROOT = Path(__file__).resolve().parents[2]
BASE = "f5bbd7324ecdc93b2026e05fb334ef98a30ae2d3"


def old(rel):
    return subprocess.check_output(["git", "show", f"{BASE}:{rel}"], cwd=ROOT).decode()


def read(rel):
    return (ROOT / rel).read_text()


def mask_faq(source):
    """Replace just FAQPage node bytes; keep all surrounding JSON and HTML bytes."""
    def mask(match):
        raw = match[0]
        graph = re.search(r'"@graph"\s*:\s*\[', raw)
        assert graph, "missing @graph"
        pos = graph.end()
        spans = []
        decoder = json.JSONDecoder()
        while True:
            while raw[pos].isspace() or raw[pos] == ',':
                pos += 1
            if raw[pos] == ']':
                break
            node, end = decoder.raw_decode(raw, pos)
            if node.get("@type") == "FAQPage":
                spans.append((pos, end))
            pos = end
        assert len(spans) == 1, f"FAQPage nodes={len(spans)}"
        start, end = spans[0]
        return raw[:start] + "<FAQPage>" + raw[end:]
    return re.sub(r'<script\b[^>]*type="application/ld\+json"[^>]*>.*?</script>', mask, source, flags=re.S)


def main():
    manifest = json.loads(read("_tools/seo_manifest.json"))
    before_manifest = json.loads(old("_tools/seo_manifest.json"))
    for rel in PAGES:
        del before_manifest["pages"][rel]["faq"]
    assert read("_tools/seo_manifest.json") == json.dumps(before_manifest, ensure_ascii=False, indent=2) + '\n', "manifest outside three FAQ arrays changed"
    protected = ["_worker/index.js", "_tools/link_check.py", "_tools/link_check_exempt.json",
                 "_tools/worker_check.mjs", "_tools/not_found_report.py", "_tools/indexnow_ping.py",
                 "_tools/edge_smoke.py", "_tools/build_all.sh", "_tools/seo_check.py",
                 "_tools/v2_check.py", "_tools/guidebook_aeo_check.py", "_tools/apply_counts.py",
                 "_tools/build_samples.py", "_tools/build_brand_captions_v2.py", "_tools/caption_check.py",
                 "_tools/apply_checkout_legal.py", "_tools/apply_fonts.py", "_tools/build_sitemap.py",
                 "_tools/promo.json", "_tools/promo_strip.html", "_tools/promo_band.html",
                 "_tools/promo_popup.html", "robots.txt", "llms.txt", "llms-full.txt",
                 "sitemap.xml", "rss.xml"]
    for rel in protected:
        assert read(rel) == old(rel), f"protected file changed: {rel}"
    patterns = [r"<title\b[^>]*>.*?</title>", r"<!-- seo:begin -->.*?<!-- seo:end -->",
                r"<!-- analytics:begin -->.*?<!-- analytics:end -->",
                r'<link\b[^>]*href="https://(?:fonts\.[^"]+|cdn\.jsdelivr\.net/(?:gh/orioncactus|npm/pretendard)[^"]+)"[^>]*>',
                r'<address class="bizinfo">.*?</address>', r'<figure class="herofilm">.*?</figure>',
                r'<aside class="rwid rwid--gwak".*?</aside>',
                r'<(?:[^>]+\s)?data-list-price="[^"]+"[^>]*>']
    copies = json.loads(read("_tools/r2_copy.json"))
    ledger = read("_design/redesign_20260909/copy_ledger_v6.md")
    for key, (text, refs) in copies.items():
        assert f"`{key}` | {text} | {refs} | {len(text)} |" in ledger, f"copy ledger: {key}"
        assert not any(c in text for c in ('·', '—')), f"forbidden copy character: {key}"
    count = 0
    for rel in manifest["pages"]:
        before, after = old(rel), read(rel)
        if rel not in PAGES:
            assert before == after, f"page outside R2c changed: {rel}"
        else:
            before_masked, after_masked = mask_faq(before), mask_faq(after)
            for pattern in patterns:
                assert re.findall(pattern, before_masked, re.S) == re.findall(pattern, after_masked, re.S), f"protected block changed: {rel} {pattern}"
            # The home body is unchanged; product bodies add only the new error dataset.
            new_attr = ' data-failed-storage="' + copies['cart_failed_storage'][0] + '"'
            assert before_masked == after_masked.replace(new_attr, ''), f"page outside FAQ/storage changed: {rel}"
        parser = CopyParser()
        parser.feed(after)
        for key, text in parser.copies:
            count += 1
            assert key in copies and text.strip() == copies[key][0], f"visible copy: {rel} {key}"
    assert count >= 100, "no copy coverage"
    before, after = old("assets/app.js"), read("assets/app.js")
    for name, arg in [('saveCart', 'items'), ('addToCart', 'item')]:
        pattern = r'  function ' + name + r'\(' + arg + r'\) \{.*?\n  \}'
        assert len(re.findall(pattern, before, re.S)) == len(re.findall(pattern, after, re.S)) == 1
        before = re.sub(pattern, f'<{name}>', before, flags=re.S)
        after = re.sub(pattern, f'<{name}>', after, flags=re.S)
    before = before.replace('담기를 거절하는 세 경우(규격 밖 sku, 세트 없는 낱권, 같은 상품 10줄 초과)는',
                            '담기 거절(규격 밖 sku, 세트 없는 낱권, 같은 상품 10줄 초과, 저장 실패)은')
    assert before == after, "app.js outside approved functions changed"
    assert read('assets/app.js').count('message: "' + copies['cart_failed_storage'][0] + '"') == 2
    css_addition = '  :where(body.v2) .r2-intro{padding-top:var(--s3)}\n  :where(body.v2) .r2-intro h1{font-size:var(--t-h2)}\n'
    assert read('assets/base.css').count(css_addition) == 1
    assert read('assets/base.css').replace(css_addition, '') == old('assets/base.css'), "CSS outside desktop token usage changed"
    amounts = set()
    for rel in PAGES:
        source = re.sub(r'<script\b[^>]*type="application/ld\+json"[^>]*>.*?</script>|<style\b.*?</style>|<!--.*?-->', '', read(rel), flags=re.S)
        source = re.sub(r'<[^>]+>', '', source)
        found = {int(n.replace(',', '')) for n in re.findall(r'(?<![\d.,])(\d{1,3}(?:,\d{3})+|\d+)\s*원', source)}
        assert found <= {33000, 495000, 220000, 511500, 1705000, 16500, 990000}, f"unexpected amounts: {rel} {found}"
        amounts |= found
    for kind in ('guidebook', 'studio'):
        page = read(f'programs/{kind}.html')
        assert 'data-failed-storage="' + copies['cart_failed_storage'][0] + '"' in page
        assert 'assets/app.js' in page and 'class="ph"' in page
    for kind in ('korea', 'yonsei'):
        rel = f'programs/{kind}.html'
        assert read(rel) == old(rel)
        print(f'SKIP {rel}: B1/promo only; separate LP has no shared label.ph/app.js')
    print(f'r2c_invariants: pages={len(manifest["pages"])} protected_files={len(protected)} copy_nodes={count} non_FAQ_bytes=identical FAIL=0')
    print('app_scope=PASS copy_ledger=PASS price_structure=PASS desktop_tokens=PASS mobile_css=unchanged')
    print('amounts: ' + ', '.join(f'{n:,}' for n in sorted(amounts)) + '; new_amounts=0')


if __name__ == '__main__':
    main()
