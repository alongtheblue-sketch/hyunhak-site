# design-critic 2회차 발주 브리프 (2026-09-23 08:42 발주, opus, subagent_type=design-critic)

세션 소멸로 회신을 못 받으면 아래를 그대로 다시 발주한다. 회신은 `critic_r2_20260923.md` 로 보존한다.

---

제2 평가자 채점 2회차. hyunhak.com 웹사이트(현학적 연구소, 대입 면접 상품 판매) astra 전면 검열 수정분을 9렌즈로 채점하고 릴리스 판정을 내라. 리포 = ~/Workspace/hyunhak-site.

[용도 식별 G1] 매체 = 반응형 웹사이트(1440 데스크톱, 390 폰). 용도 = 상품 판매 지면(가이드북 31권, 스튜디오, 의뢰)과 안내 지면. 대상 = 학부모와 고3 수험생. 토큰 SSOT = assets/base.css 1~80행(--ink 玄墨, --paper 楮紙, --seal 朱印은 가격과 인장과 폼 오류만, 그림자 대신 괘선, 리터럴 px 금지).

[1회차 회신] `_design/site_audit_20260923/critic_stage_tiles_20260923-0028.md` (팝업 무대 32/45 NO: L4=2 측면 슬롯 opacity .55 로 지면 글자 관통 / 타일 33/45 YES 조건부: aria-describedby, aria-live, 검색폭, 괘선 문법 둘, 리터럴 px 6, 600px 단위, .pacts 50:50, 자동 넘김 5초).

[이번 회차 수정과 실측] `_design/site_audit_20260923/measure_r2_20260923.md` (전 항목 수치 실측 표 + 보류 4건 사유). astra 원 지적 = `_design/site_audit_20260923/astra/out_A.md`~`out_D.md`.

[스크린샷 = `_design/site_audit_20260923/shots_r2/`] 1440 과 390 두 폭, fullPage, `.rv` 강제 표시. 반드시 볼 것: index_popup_1440.png, index_popup_390.png, index_nopop_1440.png, index_nopop_390.png, request_390.png, guidebook_index_1440.png, guidebook_index_390.png, programs_guidebook_1440.png, programs_studio_390.png, lectures_1440.png, interview_1440.png, interview_yonsei-hum_1440.png, about_1440.png, faq_390.png, notice_1440.png, support_390.png, join_390.png, login_1440.png, terms_1440.png, library_1440.png. 모킹 API 라 공지 목록과 랭킹 표와 강의 상태는 비어 있다(결함 아님).

[채점 대상 3건, 각각 9렌즈 점수 + 최대 결함 근거(파일:행 또는 스크린샷 좌표)]
1. 팝업 무대 (측면 슬롯 opacity 1, 카드 바탕 --mat 불투명, 내용 .pfr 만 .55. 정지 단추 역전 수리, 8초, .pacts 3:2, 리터럴 px 토큰화, 체크 글리프, scrollbar-gutter, role=group)
2. 홈 대학 목록 (검색 폭 28em, 행 괘선 연속 + 닫는 rule-strong, a11y 3건, 37.5em, 죽은 코드 제거)
3. 전면 라운드: astra P0 12건과 P1 25건 수정분. 면별 1줄. 보류 4건(ledger §5) 사유 타당성 판정.

[출력 형식, 700단어 이내] §1 팝업 무대 점수와 릴리스 판정 / §2 대학 목록 점수와 판정 / §3 전면 면별 표(면, 확인, 잔여) / §4 릴리스 전 P1(파일:행과 수정안 한 줄) / §5 P2 / §6 슬롭 16뿌리와 잔상 7축 / §7 토큰 위배. 파일 수정 금지, 점수 없는 평가 금지. Codex 병렬 채점은 메인 세션이 건너뛴다, 그 사실을 §1 말미에 한 줄 표기.
