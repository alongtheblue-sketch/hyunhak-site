# X1 독립 검토 (read-only) — hyunhak.com R2 회차 구현 (2026-09-09)

너는 구현자가 아니라 검토자다. 파일을 고치지 말고 판정만 낸다. 작업 트리 = 이 저장소(브랜치 redesign/20260909-two-products, HEAD 842bcf7 = Codex astra 구현 대리 커밋, 기준 커밋 8f9afab = 라이브 8210f4b + 404 수습 병합 + 브리프). `git diff 8f9afab..HEAD --stat` 부터 보고 필요한 파일을 읽어라.

브리프(요구 사항 원문) = _design/redesign_20260909/codex/r2_brief.md, 사실 원장 = FACTS_LEDGER.md, 구현 보고 = IMPL_REPORT.md, 카피 원장 = copy_ledger_v6.md, 마케팅 메모 = MARKETING_NOTES.md. 공통 불변 조항 = _design/redesign_20260908/codex/impl_brief_invariants.md.

검토 축 (각 축마다 PASS / REVISE(p0·p1·p2) 와 파일:줄 근거):
1. 구매 계약 회귀: assets/product_buy.js 가 HH.addToCart 계약(sku·title·price·ship·set_id)을 정확히 재사용하는가. guide-<slug>·guide-all-view·pass-<unit>·lecture-common sku 가 기존 카탈로그(app.js·studio.html·guidebook_page_v3.html·_tools/guidebook_catalog.json)와 1:1 인가. 지문 낱권 분기(studio.html?unit=<code>#sets)가 실제 studio.html 의 unit 쿼리·앵커를 읽는가. 로그인 필요 시 동작. 장바구니 가격이 정가(D1 판정) 기준인지.
2. 사실 회귀: 새 카피(r2_copy.json 135항목)의 수치·주장이 FACTS_LEDGER 밖인 것, RD-4 미확정 6건(G5·G8·S2·S9·S11·A4)을 단정한 것. 응시 단위 5곳 명칭(korea_hum 등)이 studio.html 원장과 같은가.
3. 보존 바이트: title·description·canonical·og·JSON-LD(가격 포함)·robots·sitemap·llms.txt, terms/privacy/checkout 약관 본문, promo.json label·rate·ends_at·rows, 가격 숫자, 인강 카피, 사업자 정보, 분석 태그 블록, 폰트 블록, 404 수습분(_worker/index.js 301 표·link_check·worker_check·not_found_report·404.html). 어긋난 것 전부.
4. SEO: FAQPage JSON-LD 를 seo_manifest.json 으로 고정하고 본문 FAQ 를 바꾼 결과, 가시 본문과 JSON-LD 문답이 어긋나는 면이 있는가(구글 FAQ 리치 결과 정책상 문제). H1 유일성, 내부 링크 깨짐(link_check 는 통과), programs 4면이 생성면으로 바뀐 뒤 build_interview_hub.py 경로에서 재생성되는지.
5. 접근성·동작: select·radio 라벨 결속, 포커스 순서, 담기 실패 문구 경로, JS 비활성 시 폴백(구매 블록이 링크로 남는가), data-list-price 렌더 경로(app.js 가 새 요소도 잡는가).
6. 셸 변경 파급: GNB·모바일 탭 목적지 변경이 66면 전체에 적용됐는지, 푸터 ft-legal 첫 행 변경이 짧은 면(ft-compact)에서도 깨지지 않는지, 상단 바 한자 → 한글 교체가 about·푸터 예외를 지켰는지.
7. 브리프 요구 5개(두 카드 동격 / 학원 신뢰 / 상세면 우선 / 구매 상단 / 카피 전면) 각각 충족·미충족과 근거.

보고: 축별 표(축 | 판정 | 근거 파일:줄 | 수정 제안 1줄) + 마지막 줄 `X1_DONE verdict=RELEASE|REVISE p0=<n> p1=<n> p2=<n>`. 600단어 이내.
