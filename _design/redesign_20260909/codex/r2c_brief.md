# R2c 브리프 — Codex X1 검토 p1 2건 수리 (hyunhak.com, 2026-09-09, base = R2b 산출 대리 커밋 HEAD)

공통 조항(impl_brief_invariants.md, r2_brief.md §1·§5·§6·§7)은 그대로다. 아래 2건만 고친다. 변경 파일:줄을 보고서에 적는다(커밋은 본 세션 대리).

## 1. FAQ JSON-LD 와 가시 본문 불일치 (X1 축4 p1)
- 현상: 홈(index.html:30↔129) 6/4, programs/guidebook.html(31↔146) 10/3, programs/studio.html(31↔100) 9/3 으로 FAQPage JSON-LD 문답과 지면 FAQ 가 다르다. 구글 구조화 데이터 정책(가시 본문 일치)에 걸린다. FAQ 리치결과 자체는 2026-05-07 종료됐으므로 목적은 "정책 위반 0" 이다.
- 수리: 이 세 면에 한해 `_tools/seo_manifest.json` 의 FAQPage 고정을 풀고, FAQPage 노드를 **지면 FAQ 문답과 같은 원천(r2_copy.json 의 faq_* 항목)에서 생성**한다. @graph 의 다른 노드(Organization·WebSite·WebPage·BreadcrumbList·Product·Person 등)는 바이트 보존. FAQPage 의 문답 수 = 지면 문답 수, 문면 동일. 지면에서 뺀 문답(출처·환불·첨삭 주장)은 JSON-LD 에서도 뺀다.
- 검증: 세 면에서 JSON-LD FAQPage 의 (name, text) 집합 == 지면 FAQ (dt/dd 또는 h3/p) 집합 임을 스크립트로 대조(`_tools/seo_check.py` 에 검사 1건 추가하거나 `_design/redesign_20260909/faq_ld_check.py` 신설, 결과 verbatim). seo_check FAIL 0 유지.

## 2. 장바구니 저장 실패가 성공으로 안내됨 (X1 축5 p1, 기존 결함 승계)
- 현상: `assets/app.js:74` saveCart 가 localStorage 예외를 삼켜 `ok:true, cart:[]` 를 돌려주고 `assets/product_buy.js:48` 이 「장바구니에 담았습니다」를 표시한다(사파리 프라이빗·저장소 가득 참 등).
- 수리: app.js 의 saveCart 가 저장 실패를 반환하게(반환값 또는 예외) 최소 diff 로 고치고, addToCart 결과에 `ok:false, reason:"storage"` 가 오면 product_buy.js 가 실패 문구(원인 포함, copy_ledger `cart_failed` 계열 새 문장은 원장에 등재)를 보여 준다. app.js 의 다른 DOM 계약·함수 시그니처는 무변경. 기존 호출부(cart.html·studio.html·guidebook_page_v3.html)가 반환값을 안 보는 경우는 그대로 동작해야 한다.
- 검증: 브라우저 없이 node vm 으로 HH 함수를 로드해 localStorage.setItem 이 throw 하는 스텁에서 addToCart → ok:false 를 실측(IMPL_REPORT 에 명령·출력 verbatim). 정상 스텁에서는 ok:true 유지.

## 검증·보고
- build_all 2회 해시 동일, 검증기 전건 PASS, style_gate 변경 html A/B, 금액 자기검사.
- 마지막 줄 `IMPL_DONE files=<n> build_hash=<16hex> gates=<…> BLOCKED=<…>`.
