#!/usr/bin/env python3
"""G-4 (2026-08-27 건우 결재): guidebook_catalog.json 전권 onsale=true 일괄 전환.
   전제 = G-2 리더 인제스트 38권 + G-3 상품 활성 (리더 타일과 판매 파일이 같은 판이 된 뒤에만 push)."""
import json, os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guidebook_catalog.json")
with open(P, encoding="utf-8") as f:
    c = json.load(f)

items = c["items"] if isinstance(c, dict) else c
if not isinstance(items, list):
    raise SystemExit(f"예상 밖 구조: {type(c)} / items {type(items)}")
flipped = [e["slug"] for e in items if not e.get("onsale", True)]
for e in items:
    e["onsale"] = True
with open(P, "w", encoding="utf-8") as f:
    json.dump(c, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(f"flipped {len(flipped)}: {flipped}")
print(f"onsale {sum(1 for e in items if e['onsale'])}/{len(items)}")
