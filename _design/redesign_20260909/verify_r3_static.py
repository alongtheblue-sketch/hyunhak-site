#!/usr/bin/env python3
"""R3b source checks. No browser, network, or file mutations."""
import json
import re
import subprocess
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

from check_r2 import CopyParser
from faq_ld_check import check_page

ROOT = Path(__file__).resolve().parents[2]
BASE = "98b5ff1"


def read(rel):
    return (ROOT / rel).read_text()


def old(rel):
    return subprocess.check_output(["git", "show", f"{BASE}:{rel}"], cwd=ROOT).decode()


def main_body(source):
    return re.search(r"<main\b.*?</main>", source, re.S)[0]


def without_scripts(source):
    return re.sub(r"<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->", "", source, flags=re.S)


def main():
    protected = ["_worker/index.js", "_tools/link_check.py", "_tools/link_check_exempt.json",
                 "_tools/worker_check.mjs", "_tools/not_found_report.py", "_tools/indexnow_ping.py",
                 "_tools/edge_smoke.py", "404.html", "_tools/build_all.sh", "_tools/seo_check.py",
                 "_tools/v2_check.py", "_tools/guidebook_aeo_check.py", "_tools/apply_counts.py",
                 "_tools/build_samples.py", "_tools/build_brand_captions_v2.py", "_tools/caption_check.py",
                 "_tools/apply_checkout_legal.py", "_tools/apply_fonts.py", "_tools/build_sitemap.py",
                 "_tools/promo.json", "_tools/promo_strip.html", "_tools/promo_band.html",
                 "_tools/promo_popup.html", "robots.txt", "llms.txt", "assets/app.js",
                 "programs/korea.html", "programs/yonsei.html", "checkout.html"]
    for rel in protected:
        assert read(rel) == old(rel), f"protected file changed: {rel}"
    for rel in ["terms.html", "privacy.html"]:
        assert main_body(read(rel)) == main_body(old(rel)), f"legal body changed: {rel}"
    print(f"PASS protected files={len(protected)} legal bodies=2 bytes identical")
    before_manifest = json.loads(old("_tools/seo_manifest.json"))
    manifest = json.loads(read("_tools/seo_manifest.json"))
    remaining = json.loads(read("_tools/seo_manifest.json"))
    del remaining["pages"]["ranking.html"]
    assert before_manifest == remaining, "existing manifest entries changed"
    assert 'https://hyunhak.com/ranking.html' in read("sitemap.xml")
    assert not manifest["pages"]["ranking.html"].get("noindex")
    for rel in before_manifest["pages"]:
        source, baseline = read(rel), old(rel)
        for pattern in [r'<title\b.*?</title>', r'<meta\b[^>]*(?:name="description"|property="og:[^"]+")[^>]*>',
                        r'<link\b[^>]*rel="canonical"[^>]*>', r'<!-- analytics:begin -->.*?<!-- analytics:end -->',
                        r'<link\b[^>]*href="https://(?:fonts\.[^"]+|cdn\.jsdelivr\.net/(?:gh/orioncactus|npm/pretendard)[^"]+)"[^>]*>',
                        r'<figure class="herofilm">.*?</figure>']:
            assert re.findall(pattern, source, re.S) == re.findall(pattern, baseline, re.S), f"preserved block: {rel} {pattern}"
        ld_pattern = r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>'
        previous = re.findall(ld_pattern, baseline, re.S)
        current = re.findall(ld_pattern, source, re.S)
        if rel in ["programs/guidebook.html", "programs/studio.html"]:
            def omit_faq(blocks):
                return [{**json.loads(s), "@graph": [n for n in json.loads(s)["@graph"] if n.get("@type") != "FAQPage"]} for s in blocks]
            assert omit_faq(previous) == omit_faq(current), f"non-FAQ JSON-LD changed: {rel}"
        else:
            assert previous == current, f"JSON-LD bytes changed: {rel}"
    print("PASS existing SEO, analytics, fonts, brand film; only two FAQ graphs expanded")
    copies = json.loads(read("_tools/r2_copy.json"))
    ledger = read("_design/redesign_20260909/copy_ledger_v6.md")
    for key, (text, refs) in copies.items():
        assert f"`{key}` | {text} | {refs} | {len(text)} |" in ledger, f"copy ledger: {key}"
        assert refs and not any(ch in text for ch in ["·", "—"]), f"copy policy: {key}"
    core = ["index.html", "programs/guidebook.html", "programs/studio.html", "studio.html", "ranking.html", "my.html"]
    count = 0
    for rel in core:
        parser = CopyParser()
        parser.feed(read(rel))
        for key, text in parser.copies:
            assert key in copies and text.strip() == copies[key][0], f"visible copy: {rel} {key} {text!r}"
            count += 1
    for rel, n in [("index.html", 4), ("programs/guidebook.html", 6), ("programs/studio.html", 6)]:
        check_page(read(rel), n, copies)
    print(f"PASS copy ledger={len(copies)} rendered={count}; FAQ HTML=JSON-LD 4/6/6")
    for kind in ["guidebook", "studio"]:
        source = main_body(read(f"programs/{kind}.html"))
        ids = re.findall(r'<section class="r2-section r3-section" id="([^"]+)"', source)
        assert ids == (["receive", "preview", "parts", "compare", "books", "maker", "faq", "close"] if kind == "guidebook" else ["receive", "preview", "flow", "compare", "units", "maker", "faq", "close"])
        assert source.index('<h1>') < source.index('id="buy"') < source.index('id="receive"')
        assert source.count('data-primary') == 1
        assert '__C_' not in source
        for table in re.findall(r'<table\b.*?</table>', source, re.S):
            assert '<caption>' in table
        assert 'shared.css' not in source
    guide = main_body(read("programs/guidebook.html"))
    grid = re.search(r'<ul class="r3-covers">.*?</ul>', guide, re.S)[0]
    assert grid.count('<img ') == 12
    assert len(re.findall(r'href="../guidebook/[^/]+\.html"', re.search(r'id="books".*?</section>', guide, re.S)[0])) == 31
    assert 'data-product-buy="guidebook"' in guide and 'value="pdf"' in guide
    studio = read("studio.html")
    assert 'data-rank-board' not in studio and 'data-rank-widget' in studio
    ranking = main_body(read("ranking.html"))
    assert ranking.count('role="tab"') == 4 and ranking.count('data-view=') == 3
    assert ranking.index('<table') < ranking.index('data-rank-views') < ranking.index('data-rank-dist')
    foot = r'<p class="foot" data-rank-foot>.*?</p>'
    assert re.findall(foot, old("studio.html"), re.S) == re.findall(foot, ranking, re.S)
    assert 'href="my.html#rank"' in ranking and 'id="rank"' in read("my.html")
    print("PASS nine sections, first-block DOM, 12 covers/31 links, tables, ranking DOM, legal foot")
    css = read("assets/base.css").split('/* R3: 상세면 수령물, 표본, 비교표.')[1]
    assert not re.search(r'\dpx\b', css)
    assert all(line.strip().startswith(':where(body.v2)') for line in css.splitlines() if '{' in line and not line.strip().startswith('@'))
    print("PASS new CSS scoped, token sizes, no literal px")
    for rel in core:
        source = without_scripts(main_body(read(rel)))
        print(f"13년차 {rel}: {source.count('13년차')}")
        assert source.count('13년차') <= 1
        assert '3,865' not in source
        if rel in ["programs/studio.html", "studio.html", "ranking.html"]:
            assert '실제 기출' not in source
        assert '7일 이내' not in source
    amounts = set()
    for rel in core:
        source = re.sub(r'<[^>]+>', '', without_scripts(main_body(read(rel))))
        amounts.update(re.findall(r'\d{1,3}(?:,\d{3})+원', source))
    allowed = {f"{n:,}원" for n in [33000, 495000, 220000, 511500, 1705000, 16500, 990000, 1023000, 3410000, 110000, 3000, 50000]}
    outside = sorted(amounts - allowed)
    for amount in outside:
        print("FAIL 원장 밖 금액 " + amount)
    assert not outside
    print("PASS 원장 밖 금액 0줄; 3,865=0; 스튜디오 실제 기출=0; 디지털 7일 이내=0")
    print("verify_r3_static: PASS")


if __name__ == "__main__":
    main()
