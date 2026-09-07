#!/usr/bin/env bash
# 할인 행사 e2e 실행기 (2026-09-07). 로컬 site(8788) + api(8799, 로컬 D1) 를 띄우고 active/expired 두 상태를 잰다.
# 산출 = _design/promo_30_20260907/e2e/{active,expired}.json + png. 실행 중 다른 wrangler 로컬 러너(테스트 스위트)와 D1 을 공유하니 동시 실행 금지.
set -euo pipefail
SITE="$HOME/Workspace/hyunhak-site"; API="$HOME/Workspace/hyunhak-api"
OUT="$SITE/_design/promo_30_20260907/e2e"; mkdir -p "$OUT"
export NO_PROXY='*'
D1(){ (cd "$API" && npx wrangler d1 execute hyunhak --local --command "$1" >/dev/null); }
cleanup(){ kill "${SP:-}" "${AP:-}" 2>/dev/null || true; }
trap cleanup EXIT
(cd "$SITE" && python3 -m http.server 8788 >/dev/null 2>&1) & SP=$!
(cd "$API" && npx wrangler dev --local --port 8799 >/dev/null 2>&1) & AP=$!
for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:8799/api/health && break; sleep 1; done
curl -s -o /dev/null http://localhost:8799/api/health || { echo "api 기동 실패"; exit 1; }
(cd "$API" && npx wrangler d1 execute hyunhak --local --file=schema.sql >/dev/null)
D1 "DELETE FROM promotions WHERE id LIKE 'prm_e2e%'"
D1 "INSERT OR IGNORE INTO products(id,sku,type,title,school,price,requires_shipping,status,file_key,sort,created_at,updated_at) VALUES ('prd_e2e_gachon','guide-gachon','digital','가천대학교 2027 면접 가이드북','가천대학교',33000,0,'active','library/guide-gachon.pdf',950,datetime('now'),datetime('now'))"
D1 "INSERT OR REPLACE INTO promotions(id,label,rate,starts_at,ends_at,status,created_at,updated_at) VALUES ('prm_e2e_30','e2e 30% 할인',30,NULL,'2099-12-31T14:59:59.000Z','published','2026-09-07T00:00:00Z','2026-09-07T00:00:00Z')"
echo "[active]"; node "$SITE/_tools/promo_e2e.mjs" "$OUT" active | tee "$OUT/active.json"
D1 "UPDATE promotions SET ends_at='2026-09-06T00:00:00.000Z' WHERE id='prm_e2e_30'"
echo "[expired]"; node "$SITE/_tools/promo_e2e.mjs" "$OUT" expired | tee "$OUT/expired.json"
D1 "DELETE FROM promotions WHERE id LIKE 'prm_e2e%'"
python3 - "$OUT/active.json" "$OUT/expired.json" <<'PY'
import json,sys
a=json.load(open(sys.argv[1])); e=json.load(open(sys.argv[2]))
chk=[
 ("active 홈 배너 보임", a["home_banner_visible"]==1),
 ("active 홈 할인가 표기 ≥4", a["home_sale_count"]>=4),
 ("active 히어로 권당 23,100원", "23,100원" in (a["home_hero_price"] or "") and "33,000원" in (a["home_hero_price"] or "")),
 ("active 타일 23,100원", "23,100원" in (a["home_tile_price"] or "")),
 ("active 스튜디오 단위 카드 346,500원(늦은 렌더)", a["studio_unit_sale"]>=1 and "346,500원" in (a["studio_unit_price"] or "")),
 ("active 가이드북 23,100원 + PDF 77,000원", "23,100원" in (a["gb_price"] or "") and "77,000원" in (a["gb_pdf_btn"] or "")),
 ("active 장바구니 줄 [정가 33000, 현재가 23100]", a["cart_line"]==[["guide-gachon",33000,23100]]),
 ("active 장바구니 합계 23,100원", a["cart_total"]=="23,100원"),
 ("active LP 배너 실림", a["lp_banner_visible"]==1),
 ("active 390 가로 넘침 0", a["home_390_overflow"]==0),
 ("expired 홈 배너 숨김", e["home_banner_visible"]==0),
 ("expired 할인가 표기 0", e["home_sale_count"]==0 and e["studio_unit_sale"]==0),
 ("expired 장바구니 합계 33,000원(정가 복귀)", e["cart_total"]=="33,000원"),
 ("pageerror 0", not a["errors"] and not e["errors"]),
]
bad=[n for n,ok in chk if not ok]
for n,ok in chk: print(("  PASS " if ok else "  FAIL ")+n)
print(f"promo e2e: {len(chk)-len(bad)}/{len(chk)}"); sys.exit(1 if bad else 0)
PY
