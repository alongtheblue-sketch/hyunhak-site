# R2b 다듬기 브리프 — 카피 마케팅 축·카드 가격 행·결함 수리 (hyunhak.com, 2026-09-09, base = HEAD 842bcf7 R2 구현 대리 커밋)

R2 구현(네 산출, IMPL_REPORT.md)은 구조 요구 5개를 충족했고 게이트도 초록이다(build 2회 동일 ab370f964ac0863f, 검증기 전건 PASS, 브라우저 verify_r2 실결함 0 — 콘솔 FAIL 126건은 전부 로컬 origin CORS 잡음). 이번 회차는 아래 항목만 고친다. 공통 조항(impl_brief_invariants.md, r2_brief.md §1·§5·§6·§7)은 그대로다. 변경 단위마다 보고서에 파일:줄을 적는다(커밋은 본 세션이 대리).

## A. 카피 마케팅 축 (본 세션 검토 session_copy_review.md + 검출기 결과)
A1. `home_h1` 「대입 면접 준비」는 범주 라벨이라 학원 사이트 H1 로 약하다. 무엇을 어떻게 하는 곳인지 한 문장으로. 후보 두 개를 copy_ledger_v6 에 등재하고 하나를 구현: (가) 「면접은 대학마다 다릅니다. / 그 대학의 요강과 기출로 준비합니다.」(승인 v5 문장, 2줄, G5·S2) (나) 「대학마다 다른 면접을 그 대학의 요강과 기출로 준비합니다.」(1줄 30자). 선택 이유 1줄을 MARKETING_NOTES 에.
A2. 홈 두 카드 가격 행을 2행으로(대칭 유지): 가이드북 = 「권당 33,000원」 + 「31권 전권 열람권 511,500원」(G1·G2) / 스튜디오 = 「응시 단위 전권 495,000원」을 첫 행, 「지문 1편 33,000원」 둘째 행(S3b·S3a). 각 행 data-list-price. 카드 높이는 두 카드 동일 유지.
A3. 카드 본문에 구매 동기 문장 1줄 추가(사실 원장 안): 가이드북 = 「내 생기부에서 나올 질문을 그 대학 기준으로 뽑습니다.」(G4) / 스튜디오 = 「고사장과 같은 규격으로 응시하고 첨삭 세 단을 받습니다.」(S1·S4). 기존 목차형 2줄은 1줄로 합쳐도 된다.
A4. `faq_source_a` 「질문 3,865개를 수록했습니다.」는 출처 질문의 답이 아니다 → 「대학 공개 자료와 면접 후기에서 고른 질문입니다.」(G5).
A5. `studio_h1` 「연세대, 고려대 제시문 면접 스튜디오」(상품명 반복) → 승인 문장 「연세대, 고려대 제시문 면접을 / 실전 규격으로 연습합니다」(2줄). 가이드북 상세 H1 「서류기반 면접 가이드북」 → 「2027 대학별 서류기반 면접 가이드북」(G1).
A6. `maker_text` 「현학자가 두 상품을 같은 기준으로 편집합니다.」 → 「입시 컨설턴트 한 사람이 31권과 150세트를 같은 기준으로 편집합니다.」(A1, 13년차는 만든 사람 절 1곳 유지 A3).
A7. 아래 §D 의 검출기(critic·ai-slop·X1) 지적 중 카피 항목.

## B. 결함 수리
B1. programs 4면(guidebook·studio·korea·yonsei)에서 헤더 검색 라벨 `label.ph`(「대학 검색」)의 computed font-family 가 JetBrains Mono 로 잡혀 한글이 깨져 보인다(홈은 Pretendard). Playwright 실측: `getComputedStyle(document.querySelector('label.ph')).fontFamily`. 원인 규칙(promo_lp.css 또는 program_*_v2 템플릿의 label/form 규칙)을 찾아 구매 블록 안으로 스코프를 좁힌다. 헤더·푸터 셸은 base.css 만 받아야 한다.
B2. index.html `#find .more` 의 링크 두 개(「31개 대학 전체 보기」「스튜디오 상세 소개」)가 붙어 렌더된다(간격 0). gap 토큰으로 띄우거나 두 링크를 줄로 나눈다.
B3. 홈 `#find` 리드 「지원 대학의 가이드북을 찾습니다.」는 유지하되 아래 「스튜디오 상세 소개」 링크는 이 절과 무관하니 #flow 절 끝의 같은 링크만 남긴다(중복 제거).

## C. 검증 (R2 §7 과 동일 + 추가)
- build_all 2회 해시 동일, 검증기 전건 PASS, style_gate 변경 html 등급 A/B, 금액 자기검사(원장 밖 금액 0, 55,000 은 기존 JSON-LD 라 제외).
- verify_r2.mjs 에 검사 추가(BLOCKED 규약): ① programs 4면 label.ph fontFamily 에 'Pretendard' 포함 ② 홈 두 카드 `.r2-card-price` 행 수 각 2, 카드 높이 차 ≤ 2px(1280) ③ `#find .more a` 사이 간격 ≥ 12px ④ H1 텍스트가 copy_ledger_v6 의 선택 문장과 일치.
- 보고 마지막 줄 `IMPL_DONE files=<n> build_hash=<16hex> gates=<…> BLOCKED=<…>`.

## D. 검출기 지적 (본 세션이 도착 순으로 붙인다)
### D1. ai-slop-detector (COPY 24뿌리, 08:03) — High 1 · Med 3 · Low 2. DESIGN 위반 0(신뢰 4칸·절차 4열의 밋밋함은 학원 신뢰 커머스 용도에서 적합 판정)
- High `home_h1` 「대입 면접 준비」 = 카테고리 라벨 헤드라인(4U 미충족) → §A1 로 해소.
- Med `home_lead` 「서류기반 면접 가이드북과 제시문 면접 스튜디오입니다.」 = 자기소개형(benefit 0) → 리드에 대상·효과 1개를 넣는다. 예: 「31개 대학 서류기반 면접과 연세대, 고려대 제시문 면접을 그 대학 기준으로 준비합니다.」(G1·S1·G5, 원장 안에서 네가 다듬어라).
- Med `guide_card_1`·`guide_card_2`, Low `studio_card_1/2` = Feature 만 나열(FAB 위반) → §A3 의 동기 문장으로 Benefit 을 넣되 원장 밖 효과 약속(합격·점수 상승) 금지. 형식 = 「무엇을 (Feature) → 그래서 무엇이 되는가 (원장 안 사실: 내 질문지가 된다 G4 / 첨삭 세 단을 돌려받는다 S4)」.
- Low `cart_failed` 「장바구니에 담지 못했습니다. 장바구니를 확인해 주세요.」 = 원인 생략 → 「로그인 상태와 장바구니를 확인해 주세요.」처럼 원인 1개 포함(product_buy.js 의 실패 분기가 원인을 알면 그 원인을).
### D2. design-critic 9렌즈 (08:04) — 32/45 조건부 YES(렌즈1 4·8 4·9 3). 필수 5건 → 이번 회차 전건 수리
- 필수1 `assets/app.js` loadPromo(): config 두 번 실패 시 `return undefined` 로 배너·가격이 그대로 남아 「30% 할인합니다」 문장만 보이고 할인가는 안 보인다(표시광고 오인 소지). 실패 분기에서 `[data-promo]` 요소(홈 r2-promo·pband, studio.html aside.promo, 팝업 시트)를 `hidden` 처리하고 data-list-price 는 정가 그대로 둔다. app.js 의 다른 계약은 무변경. 검증: verify_r2 에 「API 차단 상태(로컬)에서 [data-promo] 가시 요소 0」 추가 — 이 검사는 로컬 CORS 실패가 곧 실패 분기라 로컬에서 실측 가능하다.
- 필수2 `programs/studio.html` 구매 블록 기본 선택 = 응시 단위 전권(495,000원)인데 홈 카드 광고 가격이 33,000원 → §A2 로 홈 카드 첫 행을 단위 전권 495,000원으로 맞춘다(기본 선택은 전권 유지). 가이드북도 같은 원리로 카드 첫 행 = 권당 33,000원, 구매 블록 기본 선택 = 선택 대학 한 권.
- 필수3 `assets/base.css:1295` `.r2-buy .btn:disabled{color:var(--paper)}` 삭제, `:disabled` 는 배경 --mat + 테두리 --edge + 글자 --gray 로 활성과 구분.
- 필수4 `studio.html:113` 구형 `aside.promo.rule` 배너를 홈과 같은 신형 `r2-promo` 한 줄로 통일(문장 P1 보존). 같은 화면의 채움 CTA 2개 중 1개는 .tlink 로 강등.
- 필수5 `assets/base.css:1230` 홈 `.r2-hero>h1{font-size:var(--t-h4)}` → §A1 의 명제형 H1 에 맞춰 `--t-h2` 이상(카드 h2 --t-h3 보다 크게). 1280×800 첫 뷰포트 안에 두 카드 CTA, 390×844 안에 두 카드 머리가 남아야 한다(verify_r2 기존 검사로 확인).
- 권고(선택, 시간 되면): 홈 타일 12장의 「33,000원」 반복 축소(타일에서 가격 제거, 카드 가격 행이 담당) / 카드 본문 13px→14px(--t-sm) / studio.html·guidebook/index.html 리드를 copy_ledger_v6 에 편입.
