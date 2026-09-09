# R3b 브리프 — 상세면 2면 재구성 + 랭킹실 + 별명 + IA 단순화 (hyunhak.com, 2026-09-09, base = r3a 완료 HEAD)

## 0. 건우 지시 원문 (13:03, 채점 기준)
- 「가이드북이랑 면접스튜디오 원래 되게 상세하게 상세페이지 있었는데 사라졌어. 해당 상세페이지 보고 아 이런거구나 하고 딱 느낌 올 수 있게, 정확히 내가 어떤걸 받아볼 수 있는지 이해가 딱 되도록 해줘야 해. 이건 다시 만들고 구성 생각해봐. 소구점 빵빵하게 넣고. 마케팅 측면에서 강화 많이 되어야 할거야」
- 「랭킹실은 맨 위 메뉴에도 올려주고, 랭킹 노출은 실명에 마스킹이 아니라 별명으로 해줘」
- 「지금 사이트 내에서 여기저기 왔다갔다 하는 동선이 되게 복잡해. 동선 단순하게 디자인 똑바로 해」

## 1. 작업 환경
- 작업 트리 = `~/Workspace/_wt/hh-r3`(브랜치 redesign/20260909-r3). base = r3a 커밋 완료 HEAD. 공통 조항 = `_design/redesign_20260909/codex/impl_brief_invariants.md`. 사실 원장 = `_design/redesign_20260909/FACTS_LEDGER.md` v2(수치·주장은 항목 id 만, RD-4 ② 강사 영상 열람 단정 금지, 「13년차」 면당 1곳). 카피 규칙 = r2_brief §5(합쇼체, 가운뎃점·em대시·은유·대구 0, style_gate A/B).
- 채택 설계 = `__DESIGN_DIR__`(목업 HTML + SECTION_MAP). 목업의 구조·섹션 순서·요소·카피를 그대로 옮긴다. 목업이 원장 밖 수치를 담고 있으면 그 수치는 뺀다(보고).
- 브라우저 BLOCKED 규약. 변경 단위마다 커밋. 무접촉 목록 = r3a 와 동일 + `_worker/index.js`(301 표는 §2.4 의 1건만 추가).

## 2. 순서 (각 단계 끝에 커밋)
### 2.1 상세면 2면 재구성 (programs/guidebook.html, programs/studio.html)
- 생성 원천은 그대로: `_tools/program_guidebook_v2.html`, `_tools/program_studio_v2.html`(템플릿) + `_tools/build_programs.py` + `_tools/r2_copy.json`(문장은 전부 이 원장에 key 로, 값 옆에 FACTS 항목 id). `build_interview_hub.py` 가 `build_programs.build()` 를 부르므로 build_all 순서 무변경.
- 첫 화면 규칙 유지: H1 → 리드 → `section#buy`(select + 가격 행 + 담기 1개). 그 아래에 채택 안의 섹션을 SECTION_MAP 순서대로. 구 판(1f9db81) 자산 재사용: 표지 `assets/covers/*.jpg` 31, 지면 표본 `assets/photo/gbd_*.jpg` 13(현 `#samples` 의 캡션·검사 build_samples --check 보존), 스튜디오 화면 `assets/photo/std/*.jpg` 9. 새 이미지 생성 금지, AI 워드마크 poster 첫 화면 금지.
- 표는 실제 `<table>`(괘선 토큰)로, 비교표·제원표·가격표는 `<caption>` 필수. 접근성: 탭 순서 = 시각 순서, 포커스 가시, 버튼 --tap.
- programs/korea.html·yonsei.html(단위 상세)은 이번 회차 무변경(링크만 정리).
### 2.2 랭킹실 독립 면 `ranking.html` + 별명 노출
- 새 면 `ranking.html`(루트, body.v2 셸). `studio.html#ranking` 의 마크업(data-rank-* 계약, 4단위 탭, 보기 3종, 분포, 표, foot, my 링크)을 옮겨 독립 면으로 만들고, `studio.html` 에는 요약 위젯(`data-rank-widget`/`data-rank-top`)과 「랭킹실 →」 링크만 남긴다. `assets/rank.js` 는 두 면에서 같은 스크립트로 동작(면 판별은 DOM 존재로).
- 표 「이름」 열 → 「별명」. API 응답 행의 `name` 은 별명(없으면 종전 마스킹, `masked:true`). `masked:true` 행은 별명 열에 종전 마스킹 값을 그대로 보이고 행 title 속성에 「별명을 정하기 전 회원」. 안내 문장(note)의 「이름은 가운데 글자를 가립니다」 → 「별명으로 싣습니다. 별명을 정하기 전 회원은 이름 가운데 글자를 가려 싣습니다.」(r2_copy 등재).
- SEO: title·description·canonical·og·BreadcrumbList·WebPage JSON-LD 를 `_tools/seo_manifest.json` 에 등재(seo_inject 가 주입), sitemap 포함, robots 허용. 표 본문은 동적이라 noscript 안내 1줄.
- `my.html` 순위표 공개 블록에 별명 입력(`<input id="nickname" maxlength="12">` + 저장 버튼 + 규칙 안내 「2~12자, 한글·영문·숫자」) 추가. 공개 체크 시 별명이 비어 있으면 저장 전에 안내(「별명을 먼저 정해 주세요」)하고 API 400 `nickname_required`·409 `nickname_taken`·400 `nickname_invalid`(reason) 를 각각 문장으로. 프로필 응답의 `nickname` 을 입력 초기값으로. small 안내의 「가린 이름(김*우)」 → 「별명」.
### 2.3 IA 단순화 (`_tools/v2_shell.py`)
- GNB(데스크톱) 5개: 가이드북(programs/guidebook.html) · 스튜디오(programs/studio.html) · 랭킹실(ranking.html) · 인강(lectures.html) · 스쿨 플랜(b2b.html). 자료실·연구소는 GNB 에서 빼고 푸터 열에 둔다(about·faq·notice·library 링크 유지). GNB_GROUP_BREAK 재조정.
- 모바일 탭 5개: 홈 · 가이드북 · 스튜디오 · 랭킹실 · MY. 「대학 찾기」는 홈 `#find` 앵커를 홈 첫 화면 안에 두는 것으로 대체(FIX 에서 제거, 아이콘 키 신설 rank 는 FIX_ICONS 에 선 아이콘 추가).
- 교차 링크 정리 규칙: 상세면 본문의 목적지 종류 ≤ 6(구매·목록/응시실·약관·FAQ·랭킹실·스쿨플랜), 같은 목적지 반복 ≤ 2. 홈 본문 링크 21건 → 목적지 종류 ≤ 8. 응시실(studio.html) 본문 목적지 12종 → ≤ 7. before/after 계수는 `_design/redesign_20260909/ia_links.py`(본 세션이 준 스크립트) 로 산출해 보고.
- 워커 301 표(`_worker/index.js`)에 `/studio.html#ranking` 은 앵커라 표 불요. `link_check_exempt.json` 무변경.
### 2.4 홈(index.html) 최소 변경
- 두 상품 카드는 유지. 「스튜디오 순위표 →」 링크를 `ranking.html` 로. GNB·탭 변경은 셸이 반영. 다른 섹션 무변경.

## 3. 자체 검증 (전건, verbatim)
- build_all 2회 해시 동일·검증기 전건 PASS(v2_check 파일 수 +1, seo_check FAIL 0, apply_counts, aeo, samples, captions, link_check, worker_check).
- style_gate 변경 html 전건 A/B. 금액 자기검사 0줄. 「13년차」 면당 ≤1 grep 표. 「실제 기출」(스튜디오 문맥) 0, 「7일 이내」 디지털 문맥 0, 3,865 0.
- `_design/redesign_20260909/verify_r3.mjs` 작성(BLOCKED, Playwright): 390×844·1280×800 ① programs 2면 `#buy` primary 첫 뷰포트 안 ② ranking.html 표 헤더 「별명」·탭 4·API 응답 masked 행 처리 ③ GNB 5·모바일 탭 5 href 대조 ④ 상세면 본문 목적지 종류 계수 ⑤ overflow 0.
- 새 문장 전건 r2_copy.json 등재 + copy_ledger_v6.md 갱신(문장·근거 id·글자 수).

## 4. 보고
- `_design/redesign_20260909/IMPL_REPORT_R3b.md` + 마지막 줄 `IMPL_DONE files=<n> commits=<n> build_hash=<16hex> gates=<…> BLOCKED=<…>`.
