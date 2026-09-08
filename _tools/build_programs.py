#!/usr/bin/env python3
"""R2 상세면 두 장. build_interview_hub에서 호출하며 공통 빌드 순서는 유지한다."""
import html
import json
import re
from pathlib import Path

import v2_shell as V

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def copy_text(key):
    return json.loads((HERE / "r2_copy.json").read_text(encoding="utf-8"))[key][0]


def render_copy(source):
    copy = json.loads((HERE / "r2_copy.json").read_text(encoding="utf-8"))
    return re.sub(r"__C_([a-z0-9_]+)__", lambda m: html.escape(copy[m[1]][0]), source)


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


def build():
    for kind in ("guidebook", "studio", "yonsei", "korea"):
        rel = f"programs/{kind}.html"
        source = (HERE / f"program_{kind}_v2.html").read_text(encoding="utf-8")
        if kind == "guidebook":
            source = source.replace("__GUIDE_OPTIONS__", guide_options())
        source = render_copy(source)
        if kind in {"guidebook", "studio"}:
            source = V.apply_shell(source, rel)
            source = V.apply_footer(source, rel)
            source = V.apply_fix(source, rel)
        if re.search(r"__(?:C_|GUIDE_)", source):
            raise ValueError(f"{rel}: 치환되지 않은 자리표시")
        (ROOT / rel).write_text(source, encoding="utf-8")


if __name__ == "__main__":
    build()
