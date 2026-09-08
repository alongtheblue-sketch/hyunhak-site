# R2 마스터 브리프 — 홈 두 상품 동격 + 상세면 우선 + 구매 블록 상단 + 카피 전면 재작성 (hyunhak.com, 2026-09-09)

너 한 명이 정보구조, 마케팅 구조, 카피, 구현, 자체 검증까지 끝낸다(건우 지시 "A부터 Z까지 GPT"). 산출은 커밋과 아래 보고 파일이다.

## 0. 건우 지시 원문 요지 (이것이 채점 기준이다)
1. 홈 맨 위에 「서류기반 면접 가이드북」과 「제시문 면접 스튜디오」가 같은 무게로 나란히 들어가야 한다. 지금은 가이드북만 파는 가게처럼 보인다(첫 화면 아래가 30% 가격표 4행이고, 스튜디오 구매 진입은 studio.html 하단 #plans 뿐이다).
2. 브랜딩 연출은 중요하지 않다. 신뢰감 가는 학원 사이트여야 한다.
3. GNB 에서 가이드북·스튜디오로 들어가면 상세 페이지가 먼저 나오고, 그 상세 페이지 맨 위에 구매가 온다.
4. 마케팅적으로 제대로 생각해라. 카피는 지금 많이 구리다. 전면 재작성.
5. 404 수습분(이미 base 에 병합)은 건드리지 않는다.

## 1. 작업 환경
- 작업 트리 = 이 저장소(git worktree, 브랜치 redesign/20260909-two-products). base = 라이브 8210f4b + 404 수습(a8b49a0) 병합. `sh _tools/build_all.sh` 2회 해시 fc47977c9b3cc42e 로 초록이다.
- 샌드박스 workspace-write. 브라우저(Playwright/Chromium)는 막혀 있다. 브라우저 검증은 실행하지 말고 `BLOCKED: <명령 1줄>` 로 보고(skip·PASS 처리 금지). 본 세션이 돌려 대조한다.
- 변경 단위마다 커밋. 커밋 메시지 한국어, 무엇을 왜. .bak 사본 금지(git 이 백업).
- 절대 보존, 생성면 규칙, base.css 규범, 보고 형식의 공통 조항은 `_design/redesign_20260908/codex/impl_brief_invariants.md` 를 그대로 따른다. 단 아래 §5 카피 규칙이 그 파일의 「카피 규칙」(승인 문장만) 을 대체한다: 이번 회차는 새 문장을 쓸 수 있다.
- 우리 디자인 스킬·지식·도구 매니페스트 = `_design/redesign_20260908/codex/DESIGN_KIT.md` (필요한 것만 열기, USED_ASSETS 줄에 열거).
- 사실 원장 = `_design/redesign_20260909/FACTS_LEDGER.md`. 카피의 모든 수치·주장은 이 원장 항목 id 로 근거를 단다.
- 404 병합분 무접촉: `_worker/index.js`(301 표), `_tools/link_check.py`, `_tools/link_check_exempt.json`, `_tools/worker_check.mjs`, `_tools/not_found_report.py`, `404.html`, `_tools/indexnow_ping.py`, `_tools/edge_smoke.py`. 빌드 사슬(build_all.sh)은 무수정.

## 2. 순서 (반드시 이 순서, 각 단계 끝에 커밋)
1. **IA_PLAN.md** (`_design/redesign_20260909/IA_PLAN.md`): 면 목록·GNB 목적지·홈 섹션 순서·상세면 첫 화면 구성·구매 블록 동작(어떤 기존 담기 계약을 재사용하는지 app.js/studio.html/guidebook 템플릿에서 확인한 선택자·data 속성을 적는다)·제거하는 것(卷 folio, 가격표 4행 위치 등). 1면 이내.
2. **MARKETING_NOTES.md** (같은 디렉터리): 세그먼트(학종 서류기반 면접 준비생과 학부모 / 연세대·고려대 제시문 응시생 / 학원·단체) 별로 첫 화면에서 자기 상품을 어떻게 고르게 하는지, 가격 제시 방식(정가 취소선+할인가+마감, 전권 앵커 = 절반 값), CTA 위계(primary 담기·구매, secondary 자세히·체험·목록), 신뢰 요소 배치(출처·만든 사람·첨삭 세 단·환불·사업자 정보·고객센터), 카피 결정 이유. 건우가 읽는다. 1면 이내, 사실 진술만.
3. **copy_ledger_v6.md** (같은 디렉터리): 면별·자리별 새 문장 전량. 각 문장 옆에 근거 항목 id(G1, S3b …)와 글자 수. 이 원장에 없는 문장은 지면에 넣지 않는다. 여기까지 먼저 커밋한다(본 세션이 중간에 읽는다).
4. 구현 (§3·§4). 단위별 커밋.
5. 자체 검증 (§7) → 보고 (§8).

## 3. 정보구조 요구 (강제)
### 홈 index.html
- 첫 화면(390×844 모바일에서 스크롤 없이, 1280 데스크톱에서 첫 뷰포트): 헤더 → 행사 스트립 한 줄(P1 label 문장 바이트 보존, 얇게) → 한 줄 리드(무엇을 하는 곳인지, 승인 리드 재사용 가능) → **두 상품 카드 동격**(데스크톱 2열 같은 폭·같은 높이, 모바일 세로 2장 모두 첫 화면 안에 카드 머리가 보이게). 카드 하나 = 상품명 / 누구를 위한 것인지 1줄 / 무엇이 들어있는지 최대 3줄(원장) / 가격(정가에 `data-list-price`, app.js 가 취소선+할인가 렌더, P2) / CTA 2개 = primary 「구매」(→ 상세면 #buy) + secondary 「자세히」(→ 상세면 상단). 두 카드의 시각 무게가 같아야 한다(색·크기·CTA 종류 동일).
- 현 히어로(브랜드 필름 herofilm, 한자, 卷 folio, "두 상품 1" 표기)는 강등한다: 필름은 홈 아래쪽 「만든 사람」 근처로 옮기거나 제거(마크업·자막 배선은 보존, 위치·표시만 변경 가능), 卷 folio 는 전 면에서 제거(CSS 잔여 정리), 玄學的 硏究所 한자는 푸터·about 에만.
- 30% 가격표 4행 섹션(section.pband 卷三)은 홈 첫 화면에서 뺀다. 표 자체는 홈 하단(FAQ 위) 또는 각 상세면 구매 블록 곁으로 옮긴다. band.until_text·foot 문장과 행 라벨·숫자 보존(P4). data-promo 속성·app.js 계약 유지.
- 이후 섹션 순서(제안, 근거 있으면 바꿔도 된다): 두 상품 → 신뢰 4칸(출처·청약철회·보안 리더·만든 사람, v5 문구 재사용) → 대학별로 찾기(#find, 기존 위젯 유지) → 스튜디오 응시 절차 → 만든 사람 → 자주 묻는 질문 → 공지. 학원 사이트답게 사업자 정보·고객센터·환불 규정으로의 진입이 푸터 첫 행에 있어야 한다(현행 유지).
### GNB·모바일 탭 (_tools/v2_shell.py, apply_nav.py)
- 「가이드북」 → `programs/guidebook.html`, 「제시문 면접 스튜디오」 → `programs/studio.html`. 모바일 하단 탭 「가이드북」「스튜디오」도 같은 목적지. 라벨은 유지.
- 목록·응시실 면(`guidebook/index.html`, `studio.html`)은 상세면 구매 블록과 부가 링크에서 들어간다. 그 면들의 URL·title·JSON-LD 는 보존.
### 상세면 programs/guidebook.html
- 첫 화면 = H1 + 리드 1줄 + **구매 블록 `<section id="buy">`** (모바일 첫 뷰포트 안에 구매 CTA 가 보이도록, 데스크톱은 첫 뷰포트 안). 구매 블록 = ① 대학 고르기(31권 select 또는 검색. 선택하면 그 권의 `guidebook/<slug>.html` 로 가거나 그 자리에서 담기. 어느 쪽이든 기존 담기 계약 재사용, app.js 무수정이 원칙. 수정이 필요하면 최소 diff 와 사유를 APP_JS_REQUEST 로 보고) ② 권당 정가 33,000원(data-list-price) ③ 전권 열람권 511,500원(data-list-price)과 「31권 전권」 진입 ④ 열람 방식 1줄(G7)과 청약철회 1줄(약관 참조, G8 주의) ⑤ 「목록에서 고르기 →」(guidebook/index.html).
- 그 아래 = 다섯 부 구성, 지면 표본, 누구를 위한 것인가, 만든 사람 1줄, FAQ 발췌, 마지막 CTA. 기존 섹션은 줄이고 합쳐도 된다. 표제·카피는 §5 로 전면 재작성.
### 상세면 programs/studio.html
- 첫 화면 = H1(승인 문장 재사용 가능) + 리드 + **구매 블록 `<section id="buy">`** = ① 응시 단위 5곳 고르기 ② 이용권 세 가지(S3a/S3b/S3c) 정가 data-list-price 로, 전권의 「한 편에 16,500원」 앵커(S3b) ③ primary 「담기」(studio.html 의 기존 담기 흐름 재사용. 그 흐름이 studio.html 안 위젯에 묶여 있으면 구매 블록 CTA 는 `studio.html#units`(단위 선택)로 보내되 첫 화면 안에 있어야 한다) ④ secondary 「체험 응시 1회」(S8, studio.html#trialGo) ⑤ 청약철회 1줄(약관 참조).
- 그 아래 = 응시 절차 4단(S4), 첨삭 세 단(S5), 해설 강의(S7), 순위표 진입, 스쿨 플랜 진입(S11, 숫자 금지), FAQ 발췌, 마지막 CTA.
### 기타 면
- studio.html: 첫 화면에 「상세 소개 보기」(programs/studio.html) 링크 1개 추가 외 구조 유지. guidebook/index.html: 리드 문단을 copy_ledger_v6 로 교체(생성 템플릿 guidebook_index_v2.html 에서), 「상세 소개 보기」 링크 유지.
- about.html H1 무변경(RD-5 대기). lectures*.html 카피 무변경(L1). cart·checkout·join·login·my·pay_done 무변경(W3 산출, X1 통과분).

## 4. 마케팅 구조 요구
- 방문자가 첫 화면에서 「내 상품」을 고르게 한다: 카드마다 「누구를 위한 것인지」 1줄이 첫 줄. 서류기반(학종 면접, 31개 대학) 대 제시문(연세대·고려대) 의 차이를 그 한 줄로 가른다.
- 가격은 숨기지 않는다: 정가 취소선 + 할인가 + 마감(app.js 렌더). 전권·단위 전권은 「절반 값」「한 편에 16,500원」 앵커(G2, S3b).
- 신뢰 요소는 첫 화면 바로 아래: 출처(G5), 첨삭 세 단(S4), 환불 규정(약관 링크), 만든 사람(A1, 13년차 노출 수 현행 유지 A3), 사업자 정보·고객센터(푸터).
- CTA 위계: 면마다 primary 1종(담기·구매), secondary 는 텍스트 링크. 같은 화면에 primary 버튼 2개 이상 금지(홈 두 카드는 예외: 카드당 primary 1개).
- 과장·감탄·최상급·비교 우위 주장·"합격" 약속 금지. 숫자와 절차로 말한다.

## 5. 카피 규칙 (전면 재작성)
- 새 문장을 쓸 수 있다. 단 수치·주장은 FACTS_LEDGER 항목만, RD-4 미확정 6건(G5·G8·S2·S9·S11·A4)은 어느 쪽도 단정하지 않는다.
- 문체: 합쇼체(…합니다/…입니다), 사실 진술. 가운뎃점(·)과 em대시(—) 0. 은유·비유·대구·경구·감탄 0. 문두 접속사·당위 결말·균형 어휘("하지만 동시에") 회피. 한 문장 한 뜻, 40자 안팎. 표제는 명사구 또는 짧은 서술문.
- 게이트: `python3 ~/unjang/_shared/style_gate/style_gate.py scan --gate-only <file>` 를 변경한 html 마다 돌려 등급 A 또는 B. 쓰기 지침 `~/unjang/_shared/style_gate/WRITING_GUIDE.md` 를 먼저 읽는다. 결과 verbatim 보고.
- 보존 바이트: `<title>`·meta description·canonical·og·JSON-LD(가격 포함)·robots·sitemap 규칙·llms.txt, terms/privacy/checkout 약관 전문, promo.json 의 label·rate·ends_at·rows 숫자, 가격 숫자, 순위표 법률 표시, 인강 카피, 사업자 정보, 분석 태그 블록, 폰트 블록.
- 승인 카피 v5(FACTS_LEDGER 하단)는 그대로 재사용해도 되고 바꿔도 된다(바꾸면 copy_ledger_v6 에 새 문장으로 등재).

## 6. 디자인 규범
- B안 「종이와 표」 토큰 체계 유지(base.css 상단 주석이 원문): :where(body.v2) 스코프, 타입은 --t-* 사다리, 리터럴 px 금지, 괘선·곡률·그림자 토큰. 새 토큰은 base.css 정의부에 추가 가능(대비 수치 주석 재계산, 본문 4.5:1, 대형 3:1).
- 두 카드·구매 블록은 표와 괘선 언어로(카드 배경 --card, 경계 --edge, 가격은 표 행). 장식 이미지·그라데이션·아이콘 남발 금지. AI 생성 워드마크 poster 이미지는 첫 화면에서 뺀다.
- 참고(DESIGN_KIT): pricing-page, landing-page, high-end-visual-design, redesign-existing-projects, 05_digital_ui_ux(Toss·Stripe 가격 표기), 08_optical_antipatterns, reference_design_marathon_20260612_e2e_commercial(CRO·WCAG 2.2). 읽은 것만 USED_ASSETS 에.
- 접근성: 포커스 가시, 탭 순서 = 시각 순서, 버튼 최소 --tap, 대비 준수.

## 7. 자체 검증 (전건 실행, 결과 verbatim)
- `sh _tools/build_all.sh` 2회 연속 마지막 줄 해시 동일, exit 0. 검증기 전건 PASS(v2_check files=61 fails=0, seo_check FAIL 0, apply_counts --check, guidebook_aeo_check, caption_check, link_check fails=0, worker_check FAIL 0).
- style_gate 등급 A/B (변경 html 전건).
- `_design/redesign_20260909/verify_r2.mjs` 작성(BLOCKED 규약, Playwright): 390×844·1280×800 에서 ① 홈 두 카드 요소의 getBoundingClientRect().top < viewport height, 두 카드 폭 차 ≤ 2px(1280) ② GNB 「가이드북」 href = programs/guidebook.html, 「제시문 면접 스튜디오」 href = programs/studio.html, 모바일 탭 동일 ③ programs/guidebook.html·programs/studio.html 의 `#buy` 안 primary CTA top < viewport height ④ 홈에 section.pband 가 첫 뷰포트 밖 ⑤ 전 면 document.scrollWidth ≤ viewport(overflow 0) ⑥ 콘솔 오류 0 ⑦ data-list-price 요소 수 ≥ 홈 2 + 상세면 각 2.
- 다섯 부·이용권·가격 숫자가 원장과 같은지 grep 으로 자기 검사(33,000 / 495,000 / 220,000 / 511,500 / 1,705,000 / 16,500 외 새 금액 0).

## 8. 보고 (`-o` 로 받는 마지막 메시지)
- 변경 파일 목록과 각 1줄 요약, 커밋 목록, 검증 명령과 결과 verbatim, BLOCKED 목록, APP_JS_REQUEST(있으면), BASE_CSS 토큰 변경표, USED_ASSETS 줄.
- 마지막 줄 `IMPL_DONE files=<n> commits=<n> build_hash=<16hex> gates=<pass/fail 목록> BLOCKED=<명령 목록>`.
