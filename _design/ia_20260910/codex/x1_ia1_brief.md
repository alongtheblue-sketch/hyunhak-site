# X1 독립 검토 (read-only) — hyunhak.com IA1 회차 구현 (2026-09-10)

너는 구현자가 아니라 검토자다. 파일을 고치지 말고 판정만 낸다. 작업 트리 = 이 저장소(git worktree `~/Workspace/_wt/hh-ia`, 브랜치 ia/20260910-units-links, HEAD 44f918f). 구현은 아직 커밋되지 않은 워킹트리 변경이다. `git diff --stat`, `git diff <file>`, `git status --short`(미추적 `_tools/studio_units.py`, `_design/ia_20260910/`)로 본다.

브리프(요구 사항 원문) = `_design/ia_20260910/codex/ia1_brief.md`(§3 카드 규격, §3-3 동선, §5 승인 문안표, §1 무접촉 목록). 구현 보고 = `_design/ia_20260910/codex/IMPL_REPORT_IA1.md`. 공통 불변 조항 = `_design/redesign_20260909/codex/impl_brief_invariants.md`. 단위 원장 = `_tools/exam_pages/codes.py` + `_tools/exam_pages/facts/<code>.json`. 브라우저 실측(본 세션이 이미 돌림) = `_design/ia_20260910/shots/results.json`(20건 PASS).

## 판정 항목 (전건, 번호 그대로 보고)
1. **규격 편차**: 브리프 §3-2 요소 순서 ①~⑦, 위계(⑤ primary, ⑥ ghost, ⑦ tlink), 예정 3단위 처리(배지·안내 1줄·⑥⑦ DOM 미출력·`--mat` 배경·문면 병기), `id="u-<code>"`, 토큰만 사용(신규 토큰 0, 고정 px 높이 0), `.r3-` 접두사·`:where(body.v2)` 스코프. 항목별 일치/편차.
2. **문안 게이트**: 변경 HTML·템플릿·`r2_copy.json`·`studio_units.py` 에 §5 표 밖 **새 문장**이 있는지(기존 문장 이동은 제외). 가운뎃점(·)·em대시(—) 신규 0 확인. 합쇼체 유지.
3. **무접촉 위반**: §1 목록(terms·privacy·checkout 약관 전문, promo, 가격 숫자, D1·API 경로, `assets/app.js` DOM 계약, `_worker/`, drafts·facts, `lectures/*.html` 본문 링크 1줄 외, 판매 5단위 밖 상품 활성화). `git diff` 로 각 파일의 변경이 푸터 1항목뿐인지 확인.
4. **동선 재계수**: 8면 각각의 유입 파일 수를 네가 직접 `grep -rl "interview/<code>.html" --include=*.html . | grep -v _design` 로 다시 세고 보고서 표와 대조. 8면 CTA 문면(응시실 열기·이용권 보기·풀이법 인강 / 9월 14일 오픈, 공지 보기·면접 형태 판정표)과 목적지 href 를 8면 전건 확인. crumb href `#exam` 과 JSON-LD BreadcrumbList 불변 확인.
5. **회귀 위험**: `studio.html` renderUnits 와 `<template id="r3-unit-template">` 계약, `okUnit` 화이트리스트 유지, `assets/product_buy.js` 신규 click 위임이 가이드북 면(isGuide)과 기존 `#buy` 동작을 깨지 않는지, `data-unit-go`·`data-r3-unit-cart` 의 소비자 존재, `build_lectures.py` 링크 1줄, `build_sitemap.py` llms.txt 8면 등재, `v2_shell.py` 푸터. 사용자가 실제로 밟는 경로를 코드로 따라가 끊긴 자리를 찾아라.
6. **IA 상한 판정**: `_design/redesign_20260909/ia_links.py` 변경 전·후 core 면 kinds(보고서 ia_before/after/rule_before 로그). 6 초과 면 중 IA1 이 새로 만든 초과와 HEAD 부터 있던 초과를 가르고, IA1 이 더한 종류가 무엇인지 면별로 적어라.
7. **문체 게이트 판정**: style_gate C/D 7면이 HEAD 와 동일 지적인지 `git show HEAD:<file> | python3 ~/unjang/_shared/style_gate/style_gate.py scan --gate-only -` 로 2면만 표본 재확인.

## 출력
`_design/ia_20260910/codex/x1_ia1_out.md` 에 항목 1~7 표(항목 / 판정 PASS·FAIL·주의 / 근거 파일:줄 / 한 줄 사유) + **결함 목록**(심각도 high·mid·low, 재현 방법, 수리 제안 1줄) + 최종 판정 한 줄 `X1_VERDICT: GO | GO_WITH_FIXES | NO_GO` + 근거 3줄. 한국어 합쇼체, 가운뎃점·em대시 금지. 파일 수정·커밋·빌드 실행 금지(읽기·grep·git show·style_gate scan 만).
