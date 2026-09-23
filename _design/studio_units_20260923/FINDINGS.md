# 스튜디오 12단위 조사 결과 (2026-09-23 14:56, wf_ab1cb0d0-2f1 inv:select, inv:owned, inv:api)

> **수리 배포 완료 2026-09-23 15:4x (s9, 커밋 96be167, 배포 3차)**: §1 돈 결함은 코드 수리로 닫혔다. 라이브 실측 = `live_check.json`(hyunhak.com _gen 96be167, select option 12, 카드 12 클릭 → 담기 → HH.cart() sku pass-<code> 12/12, pageerror 0, 서빙 4파일 sha256 로컬 일치). §3 마스터 이용권 2행은 D1 쓰기라 SQL 파일만 작성(`~/Workspace/hyunhak-api/tools/qa_seed_master_missing_units_20260923.sql` SU-1, `fix_master_meta_title_20260923.sql` SU-2), 실행은 건우 결재 큐 §HH-STUDIO-UNITS-20260923.

원문 = 원 세션 journal `~/.claude/projects/-Users-gregory/5c6b0109-9488-4ecf-a4c6-00b1f0381299/subagents/workflows/wf_ab1cb0d0-2f1/journal.jsonl` (type=result 줄 3개). 재현 스크립트 = 이 폴더 아래 owned/, repro_buy_stale_sku.mjs 등(에이전트 산출).

## 1. 🔴 라이브 돈 결함 (09-14 f65b096 부터 운영, 09-23 96be167 배포로 수리 완료)
- programs/studio.html 구매 블록 select#studio-unit 에 option 5개만 있다(템플릿 `_tools/program_studio_v2.html:51` 하드코딩, 842bcf7 09-09 이후 불변). 09-14 미래캠 5단위, 09-15 고른기회 2단위 판매 개시 때 카드(studio_units.py), app.js UNITS(13), sets.json, facts 는 12단위로 늘었지만 select 는 빌더 자리가 아니어서 남았다.
- 같은 면 카드 04~08(미래 5), 11~12(고른기회 2)의 「구매하러 가기」 → `assets/product_buy.js:39` select.value 에 없는 값 → selectedIndex -1 → `:14/:21` TypeError 로 update() 가 멈춰 담기 버튼에 **직전 단위 SKU 가 남는다**. 담기를 누르면 고른 것과 다른 단위 전권이 장바구니에 들어간다(Playwright 실측: mirae-design 클릭 → sku pass-korea-hum, 제목 「고려대 계열적합 인문 전권 이용권」).
- 실피해: 09-14 이후 pass-korea-hum 주문 2건 모두 0원(관리자 부여). 유료 단위 전권 주문 0건이라 오결제 0. 30% 행사(9/30 종료) 중 유입이 늘면 발생 가능.
- 게이트가 못 잡은 이유: `_design/ia_20260911/verify_ia2_buy.mjs:11-12, 30, 48` 이 5단위를 정답으로 고정(고른기회를 판매 아님으로 검사), `_tools/units_vocab_check.py` 는 이 템플릿을 안 본다. 둘 다 deploy_gate/build_all 에 미연결.
- API/D1 은 결함 없음: 12단위 전부 활성 상품 495,000원(tools/seed.sql:8-24, 원격 D1, 라이브 /api/products 실측), pay.js 주문·부여·권한 정규식이 12코드 전부 처리, 코드 표기 사이트=API=D1 바이트 동일. **option 추가에 API 변경, 가격 결정, 상품 신설 불필요.**

## 2. 수리 (코드, 결재 불필요 — 워크트리 → 빌드 → 실측 → 배포) ✅ 96be167 로 1~6 전건 집행
1. `_tools/program_studio_v2.html:51` option 5줄 → 자리표시 `__STUDIO_OPTIONS__`.
2. `_tools/studio_units.py` 에 options(): units() 의 판매 행(12, 카드 01~12 순서, yonsei-mirae-common 제외) → `<option value="{code}">{label}</option>`. 12개 아니거나 sets.json sku 보유 단위와 다르면 ValueError.
3. `_tools/build_programs.py:77-80` studio 분기에서 `__STUDIO_OPTIONS__` 1회 확인 후 치환, `:90` 잔여 자리표시 정규식에 추가.
4. `assets/product_buy.js` fail closed: 클릭 위임(:36-40)에서 해당 option 이 없으면 select 를 건드리지 않고 담기 disabled + dataset 비움. update()(:13-23) 에서 option 없으면 disabled 후 return.
5. 게이트: units_vocab_check.py 에 「programs/studio.html select option 집합 == 판매 12단위」 검사 추가, verify_ia2_buy.mjs 를 12단위 + app.js UNITS 읽기 + 12단위 카드 클릭 sku=pass-<code> 검사로 고치고 둘 다 build_all 또는 deploy_gate 에 연결.
6. 실측: 로컬 8093 + 라이브 https://hyunhak.com 에서 12카드 클릭 → 담기 → HH.cart() sku = pass-<해당 코드> 12/12, select option 12, pageerror 0 (`local_check.mjs` → `local_check.json`, `live_check.json`). 게이트 6k units_vocab_check + 6l studio_buy_check 는 build_all 에 연결됐고 deploy.sh 가 build_all 을 돌리므로 배포 게이트에도 들어간다. 오라클은 구 `_design/ia_20260911/verify_ia2_buy.mjs` 를 `_tools/studio_buy_check.mjs` 로 이관(기대값을 app.js UNITS 에서 읽는다).

## 3. 첨단만 「판매 중」 (건우 계정) = 데이터 공백, 코드 결함 아님
- 보유 판정(owned.js:34-39, :218-243) 은 /api/auth/me entitlements(auth.js:391) 의 단위 코드와 카드 data-r3-unit 대조뿐이고 정상.
- 마스터 계정 mem_0c3c32fe0a0c 는 08-28 스냅샷(tools/master_grant_20260828.sql:10-18)으로 부여받았고, 09-14 미래 3→5 분할 때 합본 「첨단 보건」 pu0007 이 sku pass-yonsei-mirae-health(보건 전용)로 남고 첨단은 새 pu0012 로 분리됐다. 보충 시드는 자율융합(09-15), 고른기회 인문(09-16)만 넣었다 → **첨단(prd_pu0012), 고른기회 자연(prd_pu0010) 2행 없음**(실측 10곳 보유 / 2곳 판매 중. 캡처는 11번까지만 보임).
- 「내가 산 것」 은 pu0006/pu0007 옛 meta.title(「자율융합 디자인」「첨단 보건」)을 그대로 보여 첨단을 가진 것처럼 읽힌다.
- 수리 = D1 원격 쓰기 → **결재 큐 §HH-STUDIO-UNITS-20260923 SU-1**(표적 2행 INSERT OR IGNORE + 같은 회원·상품·kind NOT EXISTS 가드, 형식 tools/qa_seed_master_mirae_20260914.sql:14-17. master_grant_20260828.sql 재실행 금지 = id 규칙이 달라 중복 행과 digital 권리 대량 생성). SQL 작성 완료 = `hyunhak-api/tools/qa_seed_master_missing_units_20260923.sql`(커밋 9880cae). meta.title 정정은 SU-2 = `tools/fix_master_meta_title_20260923.sql`(마스터 한 계정 pass_school 행, products.title 로 json_set). 실행·사후검사 명령은 각 파일 머리 주석.
- 재발 방지: 새 pass_school SKU 개시 핸드오프의 마스터 1행 검사(handoff_mirae_open_20260914.sh:107, handoff_korea_eq_open_20260915.sh:93)를 「활성 pass SKU 중 마스터 미보유 = 0행」 질의로.
- QA 시드 88계정(entq_*)도 서울 5단위만 보유(같은 공백 모양). 검수 시 참고.

## 4. 곁가지 (표시만)
- my.html:635 UNIT_OF 에 고른기회 2단위 없음 → 고른기회 전권 보유자 개별 세트 중복 표시(추정).
- 낡은 주석: assets/lecture.js:84 「허용 단위 5종만」, assets/owned.js:10 「판매 11종」.
