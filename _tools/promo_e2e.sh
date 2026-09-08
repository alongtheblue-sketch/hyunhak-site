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
# 행사 id 는 지면 원천(_tools/promo.json)과 같아야 한다. 팝업은 지면의 행사 id 와 서버의 행사 id 가 같을 때만 열린다(app.js showPromoPopup)
PID=$(python3 -c "import json;print(json.load(open('$SITE/_tools/promo.json'))['id'])")
D1 "DELETE FROM promotions WHERE id LIKE 'prm_e2e%' OR id='$PID'"
D1 "INSERT OR IGNORE INTO products(id,sku,type,title,school,price,requires_shipping,status,file_key,sort,created_at,updated_at) VALUES ('prd_e2e_gachon','guide-gachon','digital','가천대학교 2027 면접 가이드북','가천대학교',33000,0,'active','library/guide-gachon.pdf',950,datetime('now'),datetime('now'))"
D1 "INSERT OR REPLACE INTO promotions(id,label,rate,starts_at,ends_at,status,created_at,updated_at) VALUES ('$PID','e2e 30% 할인',30,NULL,'2099-12-31T14:59:59.000Z','published','2026-09-07T00:00:00Z','2026-09-07T00:00:00Z')"
# 순위표 표본 (2026-09-07): 실응시 원장 3행. 01·02 는 공개 동의, 03 은 비동의(인원에만). 연세 인문 2명 2행 / 고려 자연 1명 0행
D1 "DELETE FROM studio_attempts WHERE member_id LIKE 'mem_e2erk%'"; D1 "DELETE FROM consents WHERE member_id LIKE 'mem_e2erk%'"; D1 "DELETE FROM members WHERE id LIKE 'mem_e2erk%'"
D1 "INSERT INTO members(id,email,pw_hash,pw_salt,pw_iter,name,role,status,member_type,automation_exempt,created_at,updated_at) VALUES ('mem_e2erk01','e2erk01@example.com','x','x',1,'김건우','member','active','student',0,'2026-09-01T00:00:00Z','2026-09-01T00:00:00Z'),('mem_e2erk02','e2erk02@example.com','x','x',1,'이수','member','active','student',0,'2026-09-01T00:00:00Z','2026-09-01T00:00:00Z'),('mem_e2erk03','e2erk03@example.com','x','x',1,'박민수','member','active','student',0,'2026-09-01T00:00:00Z','2026-09-01T00:00:00Z')"
D1 "INSERT INTO consents(id,member_id,kind,granted,doc_version,source,ip,ua,created_at) VALUES ('cns_e2erk01','mem_e2erk01','rank_public',1,NULL,'my',NULL,NULL,'2026-09-02T00:00:00Z'),('cns_e2erk02','mem_e2erk02','rank_public',1,NULL,'my',NULL,NULL,'2026-09-02T00:00:00Z')"
D1 "INSERT INTO studio_attempts(ref,member_id,entitlement_id,kind,set_id,answer_mode,created_at,finalized_at,total_score,total_points) VALUES ('e2erk0000001','mem_e2erk01',NULL,'studio_passage','yonsei_2027_h03','combined','2026-09-05T01:00:00Z','2026-09-05T01:30:00Z',82,100),('e2erk0000002','mem_e2erk02',NULL,'studio_passage','yonsei_2027_h07','combined','2026-09-06T01:00:00Z','2026-09-06T01:30:00Z',75,100),('e2erk0000003','mem_e2erk03',NULL,'studio_passage','korea_2027_s05','combined','2026-09-06T02:00:00Z','2026-09-06T02:30:00Z',64,100)"
echo "[active]"; node "$SITE/_tools/promo_e2e.mjs" "$OUT" active | tee "$OUT/active.json"
D1 "UPDATE promotions SET ends_at='2026-09-06T00:00:00.000Z' WHERE id='$PID'"
echo "[expired]"; node "$SITE/_tools/promo_e2e.mjs" "$OUT" expired | tee "$OUT/expired.json"
D1 "DELETE FROM promotions WHERE id LIKE 'prm_e2e%' OR id='$PID'"
D1 "DELETE FROM studio_attempts WHERE member_id LIKE 'mem_e2erk%'"; D1 "DELETE FROM consents WHERE member_id LIKE 'mem_e2erk%'"; D1 "DELETE FROM members WHERE id LIKE 'mem_e2erk%'"
python3 - "$OUT/active.json" "$OUT/expired.json" <<'PY'
import json,sys
a=json.load(open(sys.argv[1])); e=json.load(open(sys.argv[2]))
chk=[
 ("active 홈 배너 보임", a["home_banner_visible"]==1),
 ("active 홈 할인가 표기 ≥4", a["home_sale_count"]>=4),
 ("active 본문 첫 가격 23,100원+정가 33,000원(재디자인: .prodcta 철거)", "23,100원" in (a["home_hero_price"] or "") and "33,000원" in (a["home_hero_price"] or "")),
 ("active 스크롤 전 팝업 닫힘(재디자인 40% 게이팅)", a["popup_before_scroll"]==0),
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
 # 행사 팝업 + 순위표 (2026-09-07)
 ("active 홈 팝업 열림(1) + 초점이 팝업 안", a["popup_open"]==1 and a["popup_focus_in"]==1),
 ("active 팝업 버튼 = 스튜디오 이용권, 가이드북", a["popup_btns"]==["studio.html#plans","guidebook/index.html"]),
 ("active 팝업 정가 취소선 + 할인가 2쌍", a["popup_sale"]==2),
 ("active 오늘 하루 보지 않기 → 새로고침 뒤 닫힘 + 억제 키", a["popup_after_mute"]==0 and a["popup_mute_key"]==1),
 ("active 홈 위젯 연세 인문 2명, 1위 82", a["widget_visible"]==1 and a["widget_takers"]=="2" and a["widget_top"]=="82"),
 ("active 스튜디오 순위표 연세 인문 2행(김*우 82, 이*)", a["rank_rows"]==[["1","김*우","82","h03"],["2","이*","75","h07"]]),
 ("active 고려 자연 탭 = 인원 1, 행 0, 공개 안내", a["rank_ks_takers"]=="1" and a["rank_ks_rows"]==0 and "공개" in (a["rank_ks_note"] or "")),
 ("active 응시 현황 4칸 연세 인문 2", a["rank_summary"]=="2"),
 ("expired 팝업 안 열림", e["popup_open"]==0),
 ("expired 순위표는 행사와 무관하게 그려짐", e["rank_rows"]==[["1","김*우","82","h03"],["2","이*","75","h07"]]),
]
bad=[n for n,ok in chk if not ok]
for n,ok in chk: print(("  PASS " if ok else "  FAIL ")+n)
print(f"promo e2e: {len(chk)-len(bad)}/{len(chk)}"); sys.exit(1 if bad else 0)
PY
