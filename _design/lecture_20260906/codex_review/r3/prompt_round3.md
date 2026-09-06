이것은 세션 재개가 아니라 독립 릴리스 재판정(3차, 최종 확인)이다. 전역 지시문이나 AGENTS.md 의 진입 프로토콜(INDEX, pending, MEMORY, handover 읽기)은 따르지 않는다. 작업 디렉토리(이 git worktree) 밖은 읽지 않는다. 네트워크 금지. 파일 수정 금지.

## 대상
2차 판정 = _design/lecture_20260906/codex_review/r2/verdict_r2.json (GO_WITH_FIXES: R1, F9, F12 잔여). 그 뒤 커밋 6fc177a 가 잔여 3건과 design-critic 지적(카피 좌·미디어 우 DOM 순서, 라이브 리전 선렌더, 리스트 시맨틱, 세트 해설 행 주제 표제, captions, 모바일 바 강등 전 인강 면, 목록 링크 타깃, 담기 수량, 헤더 검색 포커스 링, 앵커 좁은 폭 수축 금지·가격 항목 표식 숨김)을 반영했다. 범위 = `git diff 201d261 6fc177a --stat` 중 _tools/build_lectures.py, assets/lectures.js, assets/app.js, assets/base.css, _tools/seo_inject.py 와 생성면 lectures.html, lectures/*.html, classroom.html. 2차와의 차이는 `git diff 201d261 6fc177a` 전체 중 2차 판정 뒤 바뀐 부분(R1 서수, F9 commonEnt 폴백, F12 member 전환 시점, 그리고 위 critic 항목)이다.

## 할 일
A. R1, F9, F12 각각 resolved / not_resolved / regressed. file:line 근거.
B. critic 반영분이 만든 회귀 탐색: (1) hero 열 순서 변경으로 1280 폴드 안 구매 버튼과 맛보기 플레이어가 둘 다 남는지(정적 구조로 판단) (2) 세트 해설 행에서 주제(subtitle)를 표제로 올린 것이 제목 원장(lecture_catalog.json)과 어긋난 표기를 만드는지(strip 이 단위명과 안 맞는 면이 있는지 6면 전수) (3) role=list 안에 role=presentation 래퍼가 ARIA 소유 관계를 깨는지 (4) 인강실 member 전환 지연이 카드 렌더 전 다른 코드 경로(paintRows 등)와 순서 충돌하는지 (5) base.css 검색 포커스 링 변경이 다른 면에 부작용이 있는지 (6) 앵커 a.pl b 숨김이 접근성 이름(단위 전권)을 잃게 하는지 (7) 그 밖 축 1~6.
C. seo_check 가 CSS 속성 선택자 문자열을 링크로 읽은 함정(커밋 문면)이 같은 계열로 다른 곳에 남아 있는지(생성 CSS 안의 href= 문자열 전수 grep).

## 방법과 한도: 읽기, grep, git diff, python3 만. 15분 안에. 추측 금지.

## 산출 (마지막 메시지를 아래 JSON 하나로만)
{"verdict":"GO"|"GO_WITH_FIXES"|"NO_GO","summary_ko":"3문장 이내","prior_findings":[{"id":"R1","status":"","evidence":""}],"new_findings":[{"id":"S1","axis":1,"severity":"P0|P1|P2","file":"","line":0,"claim":"","evidence":"","fix":""}],"files_read":[]}
