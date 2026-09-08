#!/usr/bin/env python3
"""브라우저 없는 R2 보존/카피/가격 계약 검증. 기준은 불변 git 객체다."""
import html
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = json.loads((Path(__file__).parent / "BASELINE.json").read_text())["base"]
FAIL = []


def old(path):
    return subprocess.check_output(["git", "show", f"{BASE}:{path}"], cwd=ROOT)


def check(condition, message):
    if not condition:
        FAIL.append(message)


def matches(pattern, source):
    return re.findall(pattern, source, re.S | re.I)


class CopyParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.active = []
        self.copies = []

    def handle_starttag(self, tag, attrs):
        if tag in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            return
        self.depth += 1
        attrs = dict(attrs)
        if "data-copy" in attrs:
            self.active.append([self.depth, attrs["data-copy"], ""])

    def handle_endtag(self, tag):
        for item in self.active[:]:
            if item[0] == self.depth:
                self.copies.append(item[1:])
                self.active.remove(item)
        self.depth -= 1

    def handle_data(self, data):
        for item in self.active:
            item[2] += data


def main():
    protected = ["_worker/index.js", "_tools/link_check.py", "_tools/link_check_exempt.json",
                 "_tools/worker_check.mjs", "_tools/not_found_report.py", "404.html",
                 "_tools/indexnow_ping.py", "_tools/edge_smoke.py", "assets/app.js",
                 "_tools/build_all.sh", "_tools/seo_check.py", "_tools/v2_check.py",
                 "_tools/guidebook_aeo_check.py", "_tools/apply_counts.py", "_tools/build_samples.py",
                 "_tools/build_brand_captions_v2.py", "_tools/caption_check.py",
                 "_tools/apply_checkout_legal.py", "_tools/apply_fonts.py",
                 "_tools/build_sitemap.py", "robots.txt", "llms.txt", "llms-full.txt",
                 "_tools/promo.json", "_tools/promo_strip.html", "_tools/promo_band.html", "_tools/promo_popup.html",
                 "cart.html", "checkout.html", "join.html", "login.html", "my.html", "pay_done.html"]
    for rel in protected:
        check((ROOT / rel).read_bytes() == old(rel), f"보존 파일 변경: {rel}")
    manifest = json.loads((ROOT / "_tools/seo_manifest.json").read_text())
    pages = sorted(manifest["pages"])
    patterns = {
        "title": r"<title\b[^>]*>.*?</title>",
        "SEO": r"<!-- seo:begin -->.*?<!-- seo:end -->",
        "JSON-LD": r'<script type="application/ld\+json">.*?</script>',
        "analytics": r"<!-- analytics:begin -->.*?<!-- analytics:end -->",
        "fonts": r'<link\b[^>]*href="https://(?:fonts\.[^"]+|cdn\.jsdelivr\.net/(?:gh/orioncactus|npm/pretendard)[^"]+)"[^>]*>',
        "business": r'<address class="bizinfo">.*?</address>',
    }
    for rel in pages:
        before, after = old(rel).decode(), (ROOT / rel).read_text()
        for label, pattern in patterns.items():
            check(matches(pattern, before) == matches(pattern, after), f"{label} 바이트 변경: {rel}")
        check(not re.search(r'class="[^"]*\bfolio\b', after), f"folio 잔류: {rel}")
    for rel in ("terms.html", "privacy.html"):
        check(matches(r"<main\b.*?</main>", old(rel).decode()) == matches(r"<main\b.*?</main>", (ROOT / rel).read_text()), f"법률 본문 변경: {rel}")
    for rel in ("about.html",):
        check(matches(r"<h1\b.*?</h1>", old(rel).decode()) == matches(r"<h1\b.*?</h1>", (ROOT / rel).read_text()), f"H1 변경: {rel}")
    home = (ROOT / "index.html").read_text()
    check(matches(r'<figure class="herofilm">.*?</figure>', old("index.html").decode()) == matches(r'<figure class="herofilm">.*?</figure>', home), "필름 마크업 변경")
    check(matches(r'<aside class="rwid rwid--gwak".*?</aside>', old("index.html").decode()) == matches(r'<aside class="rwid rwid--gwak".*?</aside>', home), "홈 순위 위젯 변경")
    copy = json.loads((ROOT / "_tools/r2_copy.json").read_text())
    ledger = (Path(__file__).parent / "copy_ledger_v6.md").read_text()
    for key, (text, refs) in copy.items():
        check(f"`{key}` | {text} | {refs} | {len(text)} |" in ledger, f"카피 원장 불일치: {key}")
        check(not any(x in text for x in ("·", "—")), f"금지 문자: {key}")
    copies = 0
    for rel in pages:
        parser = CopyParser()
        parser.feed((ROOT / rel).read_text())
        for key, text in parser.copies:
            copies += 1
            check(key in copy and text.strip() == copy[key][0], f"지면 카피 불일치: {rel} {key}")
    check(copies >= 100, "지면 카피 검증 범위 누락")
    for kind, n in (("guidebook", 31), ("studio", 5)):
        s = (ROOT / f"programs/{kind}.html").read_text()
        block = re.search(r'<section class="r2-buy".*?</section>', s, re.S)[0]
        check(len(matches(r"<option\b", block)) == n, f"선택지 개수: {kind}")
        check(len(matches(r"data-primary\b", block)) == 1, f"primary 개수: {kind}")
        check(len(matches(r"data-list-price=", block)) >= 2, f"가격 계약: {kind}")
        check('__C_' not in s, f"자리표시 잔류: {kind}")
    check(home.index('class="pband') > home.index('id="maker"'), "홈 가격표 위치")
    check(len(matches('data-product="(?:guidebook|studio)"', home)) == 2, "홈 두 상품")
    for rel in ("index.html", "programs/guidebook.html", "programs/studio.html"):
        s = (ROOT / rel).read_text()
        prices = {int(x) for x in matches(r'data-list-price="(\d+)"', s)}
        check(prices <= {33000, 495000, 220000, 511500, 1705000}, f"새 정가: {rel} {prices}")
    print(f"r2_static: pages={len(pages)} protected_files={len(protected)} copy_nodes={copies} FAIL={len(FAIL)}")
    for item in FAIL:
        print("FAIL", item)
    return bool(FAIL)


if __name__ == "__main__":
    raise SystemExit(main())
