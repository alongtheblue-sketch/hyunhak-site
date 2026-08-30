#!/bin/bash
# JSON-LD availability 원천 내보내기 (READER-FOLLOWUP 3, 2026-08-30)
# 원격 D1 products 를 읽기 전용 실측해 products_status.json 을 만든다. seo_inject.py 가 소비.
# 사용: bash _tools/export_products_status.sh   (API_DIR 로 api 저장소 경로 재지정 가능)
# 임시 파일에 만들어 검증 통과 후 mv — 실패가 기존 snapshot 을 0바이트로 절단하지 않게 (Codex 후속 r1 #23)
set -euo pipefail
API_DIR="${API_DIR:-$HOME/Workspace/hyunhak-api}"
OUT="$(cd "$(dirname "$0")" && pwd)/products_status.json"
TMP="$OUT.tmp.$$"
trap 'rm -f "$TMP"' EXIT
cd "$API_DIR"
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy npx wrangler d1 execute hyunhak --remote --json \
  --command "SELECT sku,status,price,type FROM products WHERE sku LIKE 'guide-%' ORDER BY sku" \
  | python3 -c "
import sys, json, datetime
d = json.load(sys.stdin)
rows = d[0]['results']
# 집합 검증 (Codex 후속 r1 #24): 행 수만 보면 base 만 남은 낡은 snapshot 도 통과한다.
skus = [r['sku'] for r in rows]
dup = sorted({s for s in skus if skus.count(s) > 1})
assert not dup, f'중복 sku: {dup}'
bases = {s for s in skus if not s.endswith('-pdf') and not s.startswith('guide-all')}
pdfs = {s[:-4] for s in skus if s.endswith('-pdf') and not s.startswith('guide-all')}
assert len(bases) >= 38, f'base 상품 {len(bases)} < 38 (원격 실측 이상)'
missing = sorted(bases - pdfs)
assert not missing, f'-pdf 짝 없는 base: {missing} (원격 실측 이상 또는 카탈로그 변경 — 의도면 본 검증 갱신)'
out = {'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'products': rows}
print(json.dumps(out, ensure_ascii=False, indent=1))
" > "$TMP"
mv "$TMP" "$OUT"
trap - EXIT
echo "products_status.json: $(python3 -c "import json,sys; print(len(json.load(open('$OUT'))['products']))") rows -> $OUT"
