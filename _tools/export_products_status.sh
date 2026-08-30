#!/bin/bash
# JSON-LD availability 원천 내보내기 (READER-FOLLOWUP 3, 2026-08-30)
# 원격 D1 products 를 읽기 전용 실측해 products_status.json 을 만든다. seo_inject.py 가 소비.
# 사용: bash _tools/export_products_status.sh   (API_DIR 로 api 저장소 경로 재지정 가능)
set -euo pipefail
API_DIR="${API_DIR:-$HOME/Workspace/hyunhak-api}"
OUT="$(cd "$(dirname "$0")" && pwd)/products_status.json"
cd "$API_DIR"
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy npx wrangler d1 execute hyunhak --remote --json \
  --command "SELECT sku,status,price,type FROM products WHERE sku LIKE 'guide-%' ORDER BY sku" \
  | python3 -c "
import sys, json, datetime
d = json.load(sys.stdin)
rows = d[0]['results']
assert len(rows) >= 38, f'products {len(rows)} < 38 (원격 실측 이상)'
out = {'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'products': rows}
print(json.dumps(out, ensure_ascii=False, indent=1))
" > "$OUT"
echo "products_status.json: $(python3 -c "import json,sys; print(len(json.load(open('$OUT'))['products']))") rows -> $OUT"
