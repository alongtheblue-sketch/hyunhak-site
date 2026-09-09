#!/usr/bin/env python3
"""R2 상세면 두 장. build_interview_hub에서 호출하며 공통 빌드 순서는 유지한다."""
import html
import json
import re
from pathlib import Path

import v2_shell as V
import r2_faq
from apply_counts import ledger as count_ledger

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def copy_text(key):
    return json.loads((HERE / "r2_copy.json").read_text(encoding="utf-8"))[key][0]


def render_copy(source):
    copy = json.loads((HERE / "r2_copy.json").read_text(encoding="utf-8"))
    def render(match):
        text = html.escape(copy[match[1]][0])
        # 문안은 평문 원장에 보관하고 승인된 H1의 줄바꿈만 마크업으로 표현한다.
        return text.replace(" 실전", " <br>실전", 1) if match[1] == "studio_h1" else text
    return re.sub(r"__C_([a-z0-9_]+)__", render, source)


def guide_options():
    catalog = json.loads((HERE / "guidebook_catalog.json").read_text(encoding="utf-8"))
    items = sorted((x for x in catalog["items"] if x.get("onsale", True)
                    and x["slug"] not in {"yonsei", "korea"}), key=lambda x: x["name"])
    if len(items) != 31:
        raise ValueError(f"R2 대학 선택지: {len(items)}개, 31개 기대")
    return "\n".join(
        f'<option value="{html.escape(x["sku"], quote=True)}" '
        f'data-cart-title="{html.escape(x["name"], quote=True)} 2027 서류기반면접 가이드북" '
        f'data-cart-price="{int(x.get("price") or catalog["price"])}">{html.escape(x["name"])}</option>'
        for x in items
    )


def guide_catalog():
    catalog = json.loads((HERE / "guidebook_catalog.json").read_text(encoding="utf-8"))
    items = sorted((x for x in catalog["items"] if x.get("onsale", True)
                    and x["slug"] not in {"yonsei", "korea"}), key=lambda x: x["name"])
    if len(items) != 31:
        raise ValueError("R3 대학 목록은 판매 31권이어야 합니다")
    covers, names = [], []
    for i, item in enumerate(items):
        slug, name = html.escape(item["slug"]), html.escape(item["name"])
        label = f'<span data-copy="r3_univ_{slug}">{name}</span>'
        cover = (f'<img src="../assets/covers/{slug}.jpg" alt="{name} 가이드북 표지" '
                 'loading="lazy" decoding="async">') if i < 12 else ""
        entry = (f'<li><a href="../guidebook/{slug}.html">{cover}{label}'
                 '<span class="r3-view" data-copy="r3_view">__C_r3_view__</span></a></li>')
        (covers if i < 12 else names).append(entry)
    return '<ul class="r3-covers">' + ''.join(covers) + '</ul><ul class="r3-book-names">' + ''.join(names) + '</ul>'


def build():
    counts = count_ledger()
    expected = {"r3_questions": f"{counts['n']}권 합계 {counts['q']:,}개",
                "r3_pages": f"{counts['n']}권 합계 {counts['p']:,}면",
                "r3_guide_metric_1": f"{counts['p']:,}면",
                "r3_guide_metric_2": f"{counts['q']:,}개"}
    for key, value in expected.items():
        if copy_text(key) != value:
            raise ValueError(f"R3 원장 계수 불일치: {key} != {value}")
    for kind in ("guidebook", "studio", "yonsei", "korea"):
        rel = f"programs/{kind}.html"
        source = (HERE / f"program_{kind}_v2.html").read_text(encoding="utf-8")
        if kind == "guidebook":
            source = source.replace("__GUIDE_OPTIONS__", guide_options())
            source = source.replace("__GUIDE_CATALOG__", guide_catalog())
        if kind in {"guidebook", "studio"}:
            if source.count("__R2_FAQ__") != 1:
                raise ValueError(f"{rel}: expected one R2 FAQ slot")
            source = source.replace("__R2_FAQ__", r2_faq.render_faq(rel))
        source = render_copy(source)
        if kind in {"guidebook", "studio"}:
            source = V.apply_shell(source, rel)
            source = V.apply_footer(source, rel)
            source = V.apply_fix(source, rel)
        if re.search(r"__(?:C_|GUIDE_)", source):
            raise ValueError(f"{rel}: 치환되지 않은 자리표시")
        (ROOT / rel).write_text(source, encoding="utf-8")
    home = ROOT / "index.html"
    home.write_text(r2_faq.sync_home(home.read_text(encoding="utf-8")), encoding="utf-8")


if __name__ == "__main__":
    build()
