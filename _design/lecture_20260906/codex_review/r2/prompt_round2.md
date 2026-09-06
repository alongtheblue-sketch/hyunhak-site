이것은 세션 재개가 아니라 독립 릴리스 재판정(2차)이다. 전역 지시문이나 AGENTS.md 의 진입 프로토콜(INDEX, pending, MEMORY, handover 읽기)은 따르지 않는다. 작업 디렉토리(이 git worktree) 밖은 읽지 않는다. 네트워크 금지. 파일 수정 금지.

## 대상
1차 판정 = _design/lecture_20260906/codex_review/verdict_last.json (NO_GO, F1~F14). 그 뒤 작업 트리가 수리됐고 아직 커밋 전이다. `git diff HEAD --stat` 와 `git diff HEAD -- _tools/build_lectures.py assets/lectures.js assets/app.js _tools/seo_inject.py _tools/seo_manifest.json` 로 변경을 잡고, 생성 결과(lectures.html, lectures/*.html, classroom.html)를 읽어라.

## 할 일 A: F3, F4, F6, F7, F8, F9, F10, F11, F12, F13, F14 각각 resolved / not_resolved / regressed 판정. file:line 근거 1줄.
수리 요지 = F3 data-total 을 실제 세트 해설 행 수로, 런타임은 sm.total 우선 / F4 강의 id 고유 합산 / F6 제목 196편 / F7 app.js me() 가 401 만 비회원, 그 밖은 error 필드, 인강실은 error 면 down / F8 공통 카드는 entitled 있을 때만 / F9 e.meta JSON 파싱 / F10 lectures.js 에 [data-cart-sku] 클릭 위임(HH.addToCart + 지면 안내) / F11 <!-- aeo-slot --> 슬롯과 seo_inject 슬롯 우선 삽입 / F12 noscript 폴백 + LEC 부재·12초 지연 시 down / F13 맛보기 6본 WebVTT track(assets/video/sample_*.vtt) / F14 스파이 #plan 제외, rect 기준.

## 할 일 B: F1, F2, F5 처분 검증
내 처분 = "LECTURE_SPEC_20260827 문서가 낡았다. 판매 모델(단위 전권 495,000 인강 포함, 공통 220,000)은 라이브 studio.html 과 같고, 인강 3개월은 api_pay_readonly.js 의 LECTURE_MONTHS(2026-09-03 결재 GS-8f) 와 같다. 단위 강의 편수는 D1 스냅샷(lecture_catalog.json) 실값이다." 이 처분이 codex_review/api_pay_readonly.js, api_patch_lecture_price_20260903_readonly.sql, studio.html, assets/data/sets.json 문면으로 서는지 판정하라. 서지 않으면 어느 문면이 어긋나는지.

## 할 일 C: 이번 diff 가 새로 만든 결함(회귀) 탐색
특히 (1) app.js me() 변경이 HH.me 를 쓰는 다른 면(my.html, lecture.html, studio.html 등, grep)의 분기를 깨는지 (2) lectures.js 의 클릭 위임이 studio.html 의 위임과 이중 결속되는 면이 있는지(어느 면이 두 스크립트를 다 싣는지) (3) seo_inject 슬롯 삽입이 재실행에 멱등인지(AEO_RE 와 슬롯 줄 관계) (4) sticky 바 IntersectionObserver 와 스파이가 무JS 에서 내용 손실 없는지 (5) VTT 큐 시각이 0~75초 안에 있고 첫 큐가 음수로 시작하지 않는지(파일 직접 확인) (6) 그 밖 축 1~6 에서 1차에 없던 결함.

## 방법과 한도
읽기, grep, git diff, python3 만. 서버·브라우저·네트워크 금지. 추측 금지, 근거 없는 것은 쓰지 않는다. 20분 안에.

## 산출 (마지막 메시지를 아래 JSON 하나로만)
{"verdict":"GO"|"GO_WITH_FIXES"|"NO_GO","summary_ko":"3문장 이내",
 "prior_findings":[{"id":"F3","status":"resolved|not_resolved|regressed","evidence":"file:line 문면"}],
 "disposition_F1_F2_F5":{"holds":true|false,"evidence":"문면","note":""},
 "new_findings":[{"id":"R1","axis":1,"severity":"P0|P1|P2","file":"","line":0,"claim":"","evidence":"","fix":""}],
 "files_read":[]}
P0 = 사용자 피해나 잘못된 상거래 정보, P1 = 배포 전 수리, P2 = 배포 뒤. verdict 는 P0 면 NO_GO, P1 만이면 GO_WITH_FIXES, 그 밖 GO.
