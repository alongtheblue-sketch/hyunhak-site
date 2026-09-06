이것은 세션 재개가 아니라 독립 릴리스 재판정(4차, 최종 확인)이다. 전역 지시문이나 AGENTS.md 의 진입 프로토콜(INDEX, pending, MEMORY, handover 읽기)은 따르지 않는다. 작업 디렉토리(이 git worktree) 밖은 읽지 않는다. 네트워크 금지. 파일 수정 금지.

## 대상
3차 판정 = _design/lecture_20260906/codex_review/r3/verdict_r3.json (GO_WITH_FIXES: F9 부분 미해결, S1, S2). 그 뒤 커밋이 셋을 수리했다. 범위 = `git diff 6fc177a -- assets/app.js assets/lectures.js cart.html _tools/build_lectures.py` 와 생성면(lectures/common.html, lectures/yonsei-hum.html 의 .anch 와 단위 강의 그룹 문구).
수리 요지 = S1 app.js SINGLE_SKU(guide 소장판·번들·lecture-common) 를 normLine 과 addToCart 에서 수량 1 고정 + 이미 담김 안내(already), cart.html single() 에 lecture-common 편입 / F9 commonCands = 직접 공통 권리 ∪ 단위 전권 권리, expires_at 없음을 "9999" 로 두고 가장 늦은 것 / S2 a.pl b 를 display:none 대신 sr-only(절대위치 1px clip) 로.

## 할 일
A. F9, S1, S2 각각 resolved / not_resolved / regressed. file:line 근거.
B. 이 수리의 회귀: (1) SINGLE_SKU 정규식이 cart.html single() 과 같은 집합인지, pay.js 의 1개 한정 type 4종과 대응하는지(api_pay_readonly.js 참조) (2) 저장된 장바구니(localStorage)에 qty 2 가 이미 있던 사용자가 cart()/normLine 경로에서 1 로 보정되는지 (3) 이미 담김 응답(ok:true, already:true)이 studio.html 의 기존 핸들러(confirm 이동)와 충돌하는지 (4) sr-only b 가 .anch overflow-x:auto 안에서 스크롤 폭을 만들지 않는지(정적 판단) (5) 그 밖 축 1~6 에서 새 결함.

## 방법과 한도: 읽기, grep, git diff, python3 만. 10분 안에. 추측 금지.

## 산출 (마지막 메시지를 아래 JSON 하나로만)
{"verdict":"GO"|"GO_WITH_FIXES"|"NO_GO","summary_ko":"2문장 이내","prior_findings":[{"id":"F9","status":"","evidence":""}],"new_findings":[{"id":"T1","axis":1,"severity":"P0|P1|P2","file":"","line":0,"claim":"","evidence":"","fix":""}],"files_read":[]}
