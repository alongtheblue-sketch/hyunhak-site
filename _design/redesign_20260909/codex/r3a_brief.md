# R3a 브리프 — RD-4 사실 확정 6건 문면 수리 (hyunhak.com, 2026-09-09, base = 라이브 420f2ed)

## 0. 건우 확정 원문 (13:03) — 이것이 채점 기준이다
1. 스튜디오 제시문 = 기출 규격으로 새로 직접 저작 (「실제 기출 제시문」 아님)
2. 응시 영상 열람 범위 = 이번 회차 무변경 (약관 제13조 ⑤ 와 API 가 미제공을 강제, 별 결재 행)
3. 스쿨 플랜 할인율 비교 기준 = 정가 495,000원
4. 후기 수집 연도 범위 = 무변경
5. 청약철회 = 「제공 개시 전까지」 로 통일 (「7일 이내」 제거)
6. 수록 질문 수 = 3,934 (원천 재계산 일치)

## 1. 작업 환경
- 작업 트리 = 이 저장소(git worktree `~/Workspace/_wt/hh-r3`, 브랜치 `redesign/20260909-r3`, base = 라이브 420f2ed). 다른 경로에 쓰지 않는다. 읽기는 `~/Workspace/interview_guidebook_2027/export/site/*.json` 만 밖에서 허용(원천, 쓰기 금지).
- 샌드박스 workspace-write. 브라우저(Playwright/Chromium)는 막혀 있다. 브라우저 검증은 `BLOCKED: <명령 1줄>` 로 보고(skip·PASS 처리 금지).
- 공통 조항 = `_design/redesign_20260909/codex/impl_brief_invariants.md` 를 그대로 따른다(절대 보존·생성면 규칙·base.css 규범·보고 형식). 단 이번 회차는 사실 정정이라, 아래 §2 가 지정한 자리에 한해 JSON-LD·meta description 안의 같은 주장도 고친다(변경 자리 전건 보고).
- 사실 원장 = `_design/redesign_20260909/FACTS_LEDGER.md` v2 (본 세션이 13:4x 갱신). G5·G8·S2·S9·S11·A4 항목을 먼저 읽는다. 문장의 수치·주장은 원장 항목만.
- 변경 단위(아래 §2 의 단계)마다 커밋. 커밋 메시지 한국어, 무엇을 왜. .bak 금지.
- 무접촉: terms.html, privacy.html, checkout.html 약관 전문, promo.json, lectures*.html·lectures/, `_worker/index.js`, `_tools/link_check*.py`, `404.html`, `_tools/edge_smoke.py`, `_tools/build_all.sh`(순서·검증기 목록).

## 2. 순서 (반드시 이 순서, 각 단계 끝에 커밋)

### 단계 A — ⑥ 수록 질문 수 원천 갱신 (3,865 → 3,934)
현상: `_tools/guidebook_meta_v3.json` 과 `_tools/guidebook_catalog.json` 의 questions 가 원천보다 낡았다(14권, 합 3,865 대 3,934). 홈 `index.html` 의 `var HH_GB=[...]` 는 2026-08-26 정적 사본(합 3,934 이지만 pages 도 낡음)이고, `guidebook/index.html` 의 HH_GB 는 meta v3 에서 생성(3,865).
1. `python3 _tools/build_guidebook.py refresh` 를 실행하고 `git diff --stat` 과 `git diff _tools/guidebook_meta_v3.json _tools/guidebook_catalog.json` 을 본다. 판매 31권 questions 합이 3,934 가 되어야 한다.
   - questions·pages 필드 외의 필드(types, samples, rules, 파일명 등)가 바뀌면 그 변경은 되돌리고(해당 필드만 원복) 보고서에 무엇이 바뀌려 했는지 적는다. 이유: build_samples --check(표본 sha)와 유형명 계약을 이번 회차에서 흔들지 않는다.
   - pages 합이 1,198 에서 달라지면 그대로 받아들이되(PDF 면수가 원장), before/after 를 보고서에 적는다.
2. `_tools/apply_counts.py` 확장: (a) ANCHORS 에 `interview.html` 의 「면접 기출문제 ([\d,]+)문」 등 3,865 가 문면으로 박힌 자리를 전부 추가(먼저 `grep -rn "3,865\|3865" --include=*.html --include=*.json --include=*.py --include=*.js . | grep -v "_design\|_docs\|\.git/"` 로 전건 목록화해 보고서에 verbatim). JSON-LD 안의 3,865 도 같은 앵커로 잡는다. (b) 홈 `index.html` 의 `var HH_GB=[...]` 배열을 meta v3 + catalog 에서 다시 생성해 바꾸는 기능을 apply_counts 에 넣는다(`--check` 면 대조만: 배열의 slug·q·pages·sale 이 원장과 같은가, 다르면 낡음 rc 1). 필드 집합은 현재 배열 그대로(slug·name·short·pages·q·sale). `build_all.sh` 는 수정하지 않는다(이미 apply_counts --check 를 부른다). 반영은 `python3 _tools/apply_counts.py` 로.
3. `_tools/r2_copy.json` 의 「3,865」 4항목(source_title·guide_questions·faq_source_q·guide_count)을 「3,934」 로. `_design/redesign_20260909/copy_ledger_v6.md` 의 해당 문장도 갱신(근거 G5).
4. `sh _tools/build_all.sh` 로 전 면 재생성. 그 뒤 `grep -rn "3,865\|3865"` 가 사이트 산출(html·json·js·xml·txt)에서 0건이어야 한다(_design·_docs·.git 제외). guidebook/<slug>.html 의 「실제 기출 N문」이 새 meta 값과 같은지 14권 표로 대조.

### 단계 B — ⑤ 청약철회 「7일 이내」 → 「제공이 개시되기 전까지」
1. 먼저 `grep -rn "7일" --include=*.html . | grep -v "_design\|_docs\|\.git/\|lectures"` 전건을 보고서에 verbatim 으로 싣고 셋으로 가른다: (a) 디지털 콘텐츠의 청약철회 기한 문면(교체 대상) (b) 실물 상품 7일(terms·checkout·faq 실물 문장, 유지) (c) 전자상거래법 제17조 제3항 등 법조문 인용·기타(유지).
2. (a) 교체 대상 — 생성면은 템플릿에서: `_tools/guidebook_page_v3.html`(권별 note 「아직 열지 않은 권은 공급받은 날부터 7일 이내 청약철회 가능」), `_tools/guidebook_index_v2.html`(목록 안내 문단). 정적면: `faq.html`(환불 문답 3곳), `studio.html`(FAQ dd), `my.html`(청약철회 안내 ②), `support.html`(청약철회 안내 ②), 홈 `index.html` 「환불 규정」 문면(있으면), `_tools/r2_copy.json`·`_tools/program_*_v2.html` 의 관련 문장.
   - 새 문장은 FACTS_LEDGER G8·S9 문면을 그대로 쓴다. 예: 「아직 열지 않은 권은 제공이 개시되기 전까지 청약철회하실 수 있고 그만큼 환불됩니다.」 「응시하지 않은 지문은 제공이 개시되기 전까지 청약철회하실 수 있습니다.」 「내려받기 전이라면 제공이 개시되기 전까지 청약철회하실 수 있습니다.」 faq.html 「열지 않은 상품은 언제까지 환불할 수 있습니까」 답도 같은 규칙으로. 「공급받은 날부터」 구절은 디지털 콘텐츠 자리에서 같이 뺀다.
   - my.html·support.html 의 ② 문단은 청약철회 기한 부분만 바꾸고 제17조 제3항 문장은 그대로.
3. 빌드 뒤 `grep -rn "7일 이내"` 잔존 전건이 (b)(c) 뿐임을 표로 보고.

### 단계 C — ① 스튜디오 「실제 기출 제시문」 정정
1. `grep -rn "실제 기출" --include=*.html --include=*.json . | grep -v "_design\|_docs\|\.git/"` 전건 목록화. 가이드북의 「실제 기출 N문」(G5, 기출 질문)은 유지. 스튜디오 제시문을 「실제 기출」이라 하는 자리만 교체.
2. 확인된 자리: `studio.html` 응시 절차 step 「학교의 실제 기출 제시문으로 응시.」 → 「기출 규격으로 새로 저작한 제시문으로 응시.」 studio.html·programs/studio.html·programs/korea.html·programs/yonsei.html 의 JSON-LD·meta description 에 같은 주장이 있으면 함께 교체하고 자리를 보고.

### 단계 D — ③ 스쿨 플랜 「정가 대비」 재계산
1. `b2b.html` 좌석 표 4행의 「정가 대비」 20% / 24% / 29% / 34% → 36% / 39% / 43% / 47% (평균 좌석가 315,000 / 300,000 / 280,000 / 260,000 ÷ 정가 495,000, 반올림. FACTS S11). 다른 열·숫자는 그대로.
2. b2b.html 의 meta·JSON-LD·aeo-answer 에 할인율 숫자가 있으면 같은 값으로. `grep -n "%" b2b.html` 전건을 보고서에.

### 단계 E — 무변경 확인
- ② 응시 영상 열람 범위, ④ 연도 범위: 파일 무변경. `git diff` 에 b2b.html 의 영상 문장·about.html 연도 문장이 없음을 확인해 보고.

## 3. 자체 검증 (전건 실행, 결과 verbatim)
- `sh _tools/build_all.sh` 2회 연속: exit 0, 마지막 줄 해시 동일. 검증기 전건 PASS(v2_check, seo_check FAIL 0, apply_counts --check 「지면 = 원장」, guidebook_aeo_check, build_samples --check, caption_check, link_check, worker_check).
- `python3 ~/unjang/_shared/style_gate/style_gate.py scan --gate-only <file>` 변경 html 전건 등급 A 또는 B(생성면 guidebook/*.html 은 표본 3권만).
- 금액 자기검사: `_design/redesign_20260909/chain_r2.sh` 의 마지막 grep(원장 밖 금액)을 같은 명령으로 실행해 0줄.
- 계수표(before → after): 「3,865」 「7일 이내」 「실제 기출」 「20% 할인」 각각 사이트 산출 안 건수.
- `_design/redesign_20260909/verify_r2.mjs` 는 브라우저라 BLOCKED 로 적는다.

## 4. 보고
- `_design/redesign_20260909/IMPL_REPORT_R3a.md`: 변경 파일:줄 표, 단계별 커밋 해시, §2 의 grep 전건 verbatim, §3 결과 verbatim, 되돌린 refresh 필드(있으면), 판단이 필요했던 자리(있으면 「판단 보류: …」 로 남기고 변경하지 않는다).
- 마지막 줄 `IMPL_DONE files=<n> commits=<n> build_hash=<16hex> gates=<pass/fail 목록> BLOCKED=<브라우저 검증 명령 목록>`.
