# 구현 발주 불변 조항 (Codex astra 구현 레그 공통, 2026-09-08)

## 작업 환경
- 작업 트리 = 이 저장소(git worktree, 브랜치 redesign/20260908). 다른 경로에 쓰지 않는다.
- 샌드박스 = workspace-write. 브라우저(Playwright/Chromium)는 막혀 있다. 브라우저가 필요한 검증은 실행하지 말고 보고서에 `BLOCKED: <명령 1줄>` 로 적는다(skip·PASS 처리 금지). 본 세션이 그 명령을 돌려 대조한다.
- 변경 단위마다 커밋한다. 커밋 메시지 한국어, 무엇을 왜. 파일 백업 사본(.bak) 은 만들지 않는다(git 이 백업이다).

## 절대 보존 (바이트 단위)
1. 법률·가격 문안: terms.html, privacy.html 본문, checkout.html 의 약관 전문(apply_checkout_legal.py 가 대조), 행사 배너·팝업 카피(_tools/promo.json, promo_*.html), 순위표 법률 표시, 가격 숫자와 정가·할인가 표기 구조.
2. SEO 자산: 전 면의 <title>, meta description, canonical, og:*, JSON-LD, robots.txt 의 봇 그룹 구조(수정은 §과제에 명시된 1줄만), sitemap 생성 규칙, llms.txt.
3. 동작 계약: assets/app.js 의 DOM 계약(data-list-price, data-promo, aside[data-promo], HH.promo, HH_TRACK, .rv/.in 리빌, 순위표 위젯 data-rank-*, 장바구니·결제 폼 name/id), api.hyunhak.com 호출 경로, 분석 태그 블록(<!-- analytics:begin --> ~ end), 폰트 로딩 블록(apply_fonts.py 가 관리).
4. 빌드 파이프라인: _tools/build_all.sh 순서와 각 검증기(seo_check, v2_check, guidebook_aeo_check, apply_counts --check, build_samples --check, build_brand_captions_v2 --check, caption_check, apply_checkout_legal --check)는 수정하지 않는다. 검증기가 FAIL 하면 검증기가 아니라 산출을 고친다.
5. 브랜드 필름 v2 마크업(figure.herofilm, track, 자막 버튼)은 위치·표시 방식만 바꿀 수 있고 파일·자막 배선은 유지.

## 생성면 규칙
- guidebook/*.html, lectures*.html, programs/*.html 의 스타일·마크업 변경은 반드시 _tools 의 템플릿과 생성기(guidebook_page_v3.html, guidebook_index_v2.html, build_lectures.py, build_interview_hub.py, apply_nav.py, apply_footer.py)에서 한다. 생성 결과를 직접 고치면 다음 빌드에서 사라진다.
- 변경 뒤 `sh _tools/build_all.sh` 를 2회 연속 실행해 마지막 줄 해시가 같아야 한다(멱등). 첫 실행 exit 0, 검증기 전건 PASS.

## base.css 규범 (파일 상단 주석이 원문)
- 전역 요소 셀렉터 추가 금지, 모든 규칙은 :where(body.v2) 스코프 안. 타입은 토큰 사다리(--t-*)만, 리터럴 px 금지(토큰 정의부 제외). 곡률·그림자·괘선은 토큰. 좌우 여백은 --gut 과 .wrap.
- 토큰 값 자체는 §과제의 토큰 변경표대로 바꿀 수 있다. 값을 바꾸면 주석의 대비 수치도 다시 계산해 적는다(WCAG 본문 4.5:1, 대형 3:1 이상).

## 카피 규칙
- 카피 변경은 §과제의 승인 문안표에 있는 문장만 그 문장 그대로 넣는다. 표에 없는 문장을 새로 쓰지 않는다. 가운뎃점(·)과 em대시(—)는 쓰지 않는다.

## 보고 형식
- 마지막에 `IMPL_DONE files=<n> commits=<n> build_hash=<16hex> gates=<pass/fail 목록> BLOCKED=<브라우저 검증 명령 목록>` 1줄. 그 위에 변경 파일 목록과 각 파일 1줄 요약, 검증기 실행 명령과 결과 verbatim.
