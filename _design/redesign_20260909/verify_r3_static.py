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
# r3c (2026-09-09 HR3-4 A 완결, 건우 결재 17:3x): 디지털 상품 JSON-LD merchantReturnDays 7(공급일 7일 사본) → 상품 이용 기간.
# 승인 표는 여기 고정한다 (manifest 에서 유도하면 manifest 가 7 로 되돌아가도 초록). 그 밖의 JSON-LD 노드는 여전히 바이트 불변이어야 한다.
APPROVED_DAYS = {"view": 90, "pass": 365, "lecture": 90}
LD_PATTERN = r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>'
sys.path.insert(0, str(ROOT / "_tools"))
import seo_common  # noqa: E402  (return_kind 는 프로덕션 resolver 로 푼다, 재구현 금지)


def read(rel):
    return (ROOT / rel).read_text()


def old(rel):
    return subprocess.check_output(["git", "show", f"{BASE}:{rel}"], cwd=ROOT).decode()


def main_body(source):
    return re.search(r"<main\b.*?</main>", source, re.S)[0]


def without_scripts(source):
    return re.sub(r"<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->", "", source, flags=re.S)


def strip_days(blocks):
    """ld+json 문자열 목록 → merchantReturnDays 를 뗀 그래프와, 뗀 값 목록. 그 밖의 노드는 그대로."""
    graphs, days = [], []
    for block in blocks:
        g = json.loads(block)
        for node in g.get("@graph", []):
            offers = node.get("offers")
            for offer in (offers if isinstance(offers, list) else [offers] if offers else []):
                pol = offer.get("hasMerchantReturnPolicy")
                if pol and "merchantReturnDays" in pol:
                    days.append(pol.pop("merchantReturnDays"))
        graphs.append(g)
    return graphs, days


def assert_ld_days_only(rel, manifest, source, baseline):
    """JSON-LD 는 merchantReturnDays 만 달라야 하고, 새 값은 면의 return_kind 로 승인 표에서 정해진 값, 옛 값은 전부 7."""
    prev_g, prev_d = strip_days(re.findall(LD_PATTERN, baseline, re.S))
    cur_g, cur_d = strip_days(re.findall(LD_PATTERN, source, re.S))
    assert prev_g == cur_g, f"JSON-LD changed beyond merchantReturnDays: {rel}"
    if not prev_d and not cur_d:
        return 0
    entry = seo_common.resolve_entry(manifest, rel)
    kind = (entry or {}).get("schema", {}).get("return_kind")
    assert entry and entry.get("type") == "product" and kind in APPROVED_DAYS, f"return days on non-product or unclassified page: {rel} kind={kind!r}"
    assert set(prev_d) == {7}, f"baseline days not 7: {rel} {prev_d}"
    assert len(cur_d) == len(prev_d) and set(cur_d) == {APPROVED_DAYS[kind]}, f"merchantReturnDays not approved value: {rel} kind={kind} got={cur_d}"
    return len(cur_d)


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
    # _tools/build_all.sh 는 세션 커밋 990e738 의 해시 정렬 로케일 고정(`| sort |` → `| LC_ALL=C sort |` + 주석) 한 줄만 허용 (2026-09-09)
    def normalized(rel, text):
        if rel != "_tools/build_all.sh":
            return text
        lines = []
        for line in text.splitlines(keepends=True):
            if line.startswith('find . -name "*.html"') and "LC_ALL=C sort" in line:
                line = line.split("   # LC_ALL=C:")[0].replace("| LC_ALL=C sort |", "| sort |") + "\n"
            lines.append(line)
        return "".join(lines)
    manifest = json.loads(read("_tools/seo_manifest.json"))
    r3c_pages = ["programs/korea.html", "programs/yonsei.html"]   # 보호 파일 중 상품 면: r3c 로 JSON-LD 일수만 바뀐다
    for rel in protected:
        if rel in r3c_pages:
            assert re.sub(LD_PATTERN, "", read(rel), flags=re.S) == re.sub(LD_PATTERN, "", old(rel), flags=re.S), f"protected file changed outside JSON-LD: {rel}"
            assert_ld_days_only(rel, manifest, read(rel), old(rel))
            continue
        assert normalized(rel, read(rel)) == old(rel), f"protected file changed: {rel}"
    for rel in ["terms.html", "privacy.html"]:
        assert main_body(read(rel)) == main_body(old(rel)), f"legal body changed: {rel}"
    print(f"PASS protected files={len(protected)} legal bodies=2 bytes identical")
    before_manifest = json.loads(old("_tools/seo_manifest.json"))
    remaining = json.loads(read("_tools/seo_manifest.json"))
    del remaining["pages"]["ranking.html"]
    # r3c: schema.return_kind(면·defaults)와 site.merchant 의 반품 일수 키만 달라도 된다. 그 둘을 떼면 baseline 과 같아야 한다.
    for group in (remaining["pages"], remaining["defaults"]):
        for e in group.values():
            if isinstance(e.get("schema"), dict):
                e["schema"].pop("return_kind", None)
    mc_now, mc_old = remaining["site"]["merchant"], before_manifest["site"]["merchant"]
    assert "digital_return_days" not in mc_now, "stale scalar digital_return_days still present"
    assert mc_now.get("digital_return_days_by_kind") == APPROVED_DAYS, f"digital_return_days_by_kind != approved: {mc_now.get('digital_return_days_by_kind')}"
    assert {k for k in set(mc_now) ^ set(mc_old)} == {"digital_return_days", "digital_return_days_by_kind"}, "merchant keys changed beyond r3c"
    assert {k for k in mc_now if k in mc_old and mc_now[k] != mc_old[k]} <= {"_note"}, "merchant values changed beyond r3c"
    remaining["site"]["merchant"] = mc_old
    assert before_manifest == remaining, "existing manifest entries changed"
    # 상품 면 전건에 return_kind 가 있고 승인 표 안이어야 한다 (미분류 = seo_inject 가 빌드를 멈추지만 정적으로도 잡는다)
    for rel in manifest["pages"]:
        entry = seo_common.resolve_entry(manifest, rel)
        if entry.get("type") == "product":
            assert entry["schema"].get("return_kind") in APPROVED_DAYS, f"product page without approved return_kind: {rel}"
    assert 'https://hyunhak.com/ranking.html' in read("sitemap.xml")
    assert not manifest["pages"]["ranking.html"].get("noindex")
    days_changed, pages_with_days = 0, set()
    for rel in before_manifest["pages"]:
        source, baseline = read(rel), old(rel)
        for pattern in [r'<title\b.*?</title>', r'<meta\b[^>]*(?:name="description"|property="og:[^"]+")[^>]*>',
                        r'<link\b[^>]*rel="canonical"[^>]*>', r'<!-- analytics:begin -->.*?<!-- analytics:end -->',
                        r'<link\b[^>]*href="https://(?:fonts\.[^"]+|cdn\.jsdelivr\.net/(?:gh/orioncactus|npm/pretendard)[^"]+)"[^>]*>',
                        r'<figure class="herofilm">.*?</figure>']:
            assert re.findall(pattern, source, re.S) == re.findall(pattern, baseline, re.S), f"preserved block: {rel} {pattern}"
        if rel in ["programs/guidebook.html", "programs/studio.html"]:
            def omit_faq(text):
                return "".join(json.dumps({**json.loads(b), "@graph": [n for n in json.loads(b)["@graph"] if n.get("@type") != "FAQPage"]}, ensure_ascii=False) for b in re.findall(LD_PATTERN, text, re.S))
            wrap = lambda t: '<script type="application/ld+json">' + omit_faq(t) + '</script>'
            n = assert_ld_days_only(rel, manifest, wrap(source), wrap(baseline))
        else:
            n = assert_ld_days_only(rel, manifest, source, baseline)
        days_changed += n
        if n:
            pages_with_days.add(rel)
    # 일수가 실린 면 집합 == 상품 면 집합(프로덕션 resolver), 계수는 파일 자체의 문자열 계수와 교차 (JSON 파싱과 다른 술어)
    product_pages = {rel for rel in manifest["pages"] if seo_common.resolve_entry(manifest, rel).get("type") == "product"}
    assert pages_with_days == product_pages, f"days pages != product pages: only_days={sorted(pages_with_days - product_pages)} only_product={sorted(product_pages - pages_with_days)}"
    regex_count = sum(len(re.findall(r'"merchantReturnDays":\d+', read(rel))) for rel in product_pages)
    assert regex_count == days_changed and len(product_pages) >= 42, f"days count mismatch: parsed={days_changed} regex={regex_count} pages={len(product_pages)}"
    print(f"PASS existing SEO, analytics, fonts, brand film; only two FAQ graphs expanded; JSON-LD differs only in merchantReturnDays ({days_changed} offers, approved table)")
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
