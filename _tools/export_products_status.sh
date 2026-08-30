#!/bin/bash
# JSON-LD availability 원천 내보내기 (READER-FOLLOWUP 3, 2026-08-30)
# 원격 D1 products 를 읽기 전용 실측해 products_status.json 을 만든다. seo_inject.py 가 소비.
# 사용: bash _tools/export_products_status.sh   (API_DIR 로 api 저장소 경로 재지정 가능)
# 임시 파일에 만들어 검증 통과 후 mv — 실패가 기존 snapshot 을 0바이트로 절단하지 않게 (Codex 후속 r1 #23)
set -euo pipefail
API_DIR="${API_DIR:-$HOME/Workspace/hyunhak-api}"
TOOLS_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$TOOLS_DIR/products_status.json"
TMP="$OUT.tmp.$$"
trap 'rm -f "$TMP"' EXIT
cd "$API_DIR"
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy npx wrangler d1 execute hyunhak --remote --json \
  --command "SELECT sku,status,price,type FROM products WHERE sku LIKE 'guide-%' ORDER BY sku" \
  | CATALOG="$TOOLS_DIR/guidebook_catalog.json" python3 -c "
import sys, os, json, datetime
d = json.load(sys.stdin)
rows = d[0]['results']
# 집합 검증 (Codex 후속 r1 #24 + r2 R10): 행 수·자기 짝만 보면 유령 쌍이 정상 쌍을 대체해도 통과한다.
# 기대 집합의 원장 = 사이트 카탈로그(guidebook_catalog.json) — 대학별 sku 전수와 type 까지 대조한다.
skus = [r['sku'] for r in rows]
dup = sorted({s for s in skus if skus.count(s) > 1})
assert not dup, f'중복 sku: {dup}'
by = {r['sku']: r for r in rows}
cat = json.load(open(os.environ['CATALOG'], encoding='utf-8'))
expected = [e['sku'] for e in cat['items']]
assert len(expected) >= 38, f'카탈로그 {len(expected)} < 38'
miss_base = [s for s in expected if s not in by]
miss_pdf = [s for s in expected if s + '-pdf' not in by]
assert not miss_base and not miss_pdf, f'카탈로그 대비 누락 base={miss_base} pdf={miss_pdf}'
bad_type = [s for s in expected if by[s].get('type') != 'digital' or by[s + '-pdf'].get('type') != 'digital_file']
assert not bad_type, f'type 이상 (base=digital, pdf=digital_file 이어야 함): {bad_type}'
out = {'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'products': rows}
print(json.dumps(out, ensure_ascii=False, indent=1))
" > "$TMP"
mv "$TMP" "$OUT"
trap - EXIT
echo "products_status.json: $(python3 -c "import json,sys; print(len(json.load(open('$OUT'))['products']))") rows -> $OUT"
