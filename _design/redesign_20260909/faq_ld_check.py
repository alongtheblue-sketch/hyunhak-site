#!/usr/bin/env python3
"""Compare actual visible FAQ, JSON-LD and registered copy without browser access."""
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGES = {"index.html": 4, "programs/guidebook.html": 3, "programs/studio.html": 3}


class FAQParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_faq = False
        self.tag = None
        self.cells = []
        self.lists = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "dl" and "r2-faq" in attrs.get("class", "").split():
            assert 'hidden' not in attrs and attrs.get('aria-hidden') != 'true', 'FAQ explicitly hidden'
            self.in_faq = True
            self.lists += 1
        if self.in_faq and tag in ("dt", "dd"):
            assert self.tag is None, "nested FAQ cell"
            self.tag = tag
            self.cells.append([tag, "", []])
        if self.tag and "data-copy" in attrs:
            self.cells[-1][2].append(attrs["data-copy"])

    def handle_endtag(self, tag):
        if tag == self.tag:
            self.tag = None
        if tag == "dl":
            self.in_faq = False

    def handle_data(self, data):
        if self.tag:
            self.cells[-1][1] += data


def check_page(source, expected_count, copy):
    parser = FAQParser()
    parser.feed(source)
    assert parser.lists == 1, f"FAQ lists={parser.lists}, expected=1"
    cells = parser.cells
    assert [x[0] for x in cells] == ["dt", "dd"] * expected_count, "visible FAQ count/order"
    for _, text, keys in cells:
        assert len(keys) == 1 and keys[0] in copy, f"FAQ copy key: {keys}"
        assert text.strip() == copy[keys[0]][0], f"visible FAQ differs from copy: {keys[0]}"
    visible = [(cells[i][1].strip(), cells[i + 1][1].strip()) for i in range(0, len(cells), 2)]
    blocks = re.findall(r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', source, re.S)
    nodes = []
    for block in blocks:
        data = json.loads(block)
        roots = data if isinstance(data, list) else [data]
        for root in roots:
            nodes.extend(n for n in [root, *root.get("@graph", [])] if n.get("@type") == "FAQPage")
    assert len(nodes) == 1, f"FAQPage nodes={len(nodes)}, expected=1"
    entities = nodes[0]["mainEntity"]
    structured = [(q["name"], q["acceptedAnswer"]["text"]) for q in entities]
    assert len(entities) == expected_count, f"JSON-LD={len(entities)} visible={expected_count}"
    assert Counter(structured) == Counter(visible), "JSON-LD and visible FAQ differ"
    assert len(set(structured)) == expected_count, "duplicate FAQ pair"
    return len(entities), len(visible)


def main():
    copy = json.loads((ROOT / "_tools/r2_copy.json").read_text())
    failed = 0
    for rel, count in PAGES.items():
        try:
            ld, visible = check_page((ROOT / rel).read_text(), count, copy)
            print(f"PASS {rel}: JSON-LD={ld} visible={visible} pairs=equal copy=equal")
        except (AssertionError, KeyError, ValueError) as error:
            failed += 1
            print(f"FAIL {rel}: {error}")
    print(f"faq_ld_check: pages={len(PAGES)} FAIL={failed}")
    return bool(failed)


if __name__ == "__main__":
    raise SystemExit(main())
