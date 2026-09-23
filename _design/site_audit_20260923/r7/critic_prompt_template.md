제2 평가자 채점 7회차. hyunhak.com 팝업 무대의 하단바 고정 재작업(ab9160d = 3d2ada3 + 6차 지적 수리)을 채점하고 배포 4차 릴리스 판정을 내라. 리포 = /Users/gregory/Workspace/_wt/hh-studio12 (git 워크트리, 브랜치 fix/popup-bar-r7). 대학 목록은 이번에 바뀌지 않았다(5차 37/45 YES 유지, A/B 로 확인).

[용도 식별 G1] 매체 = 반응형 웹사이트(1440 데스크톱, 1024와 768 태블릿, 430과 390 폰). 용도 = 상품 판매 지면의 첫 진입 안내 팝업(의뢰 개시 카드, 행사 카드, 공지 카드). 대상 = 학부모와 고3 수험생. 토큰 SSOT = assets/base.css 1~80행(--ink 玄墨, --paper 楮紙, --seal 朱印은 가격과 인장과 폼 오류만, 그림자 대신 괘선, 리터럴 px 금지).

[이전 회차] 6차 회신 = /Users/gregory/Workspace/_wt/hh-studio12/_design/site_audit_20260923/critic_r6_20260923.md (팝업 35/45 YES, L7=3, P1 0, §5 P2 접합 슬릿, 반증 렌즈 P2 5건). Codex 6차 = /Users/gregory/Workspace/_wt/hh-studio12/_design/site_audit_20260923/r6/codex_x1_20260923.md (RELEASE: NO, 접합 슬릿 5/18 회귀). 라이브 = 96be167(팝업 코드 = 94f577b, 하단바가 활성 슬롯 안에 붙어 넘길 때 움직이는 판).
[이번 수리] git show 3d2ada3(cherry-pick da0bc47: 하단바 무대 둘째 행 고정, 슬롯 아래 맞춤, N>1 첫 초점 = 대화상자 틀, 활성 카드 아래 선 투명) + git show ab9160d(접합 슬릿 = .pbar margin-top -1px 겹침 / 짧은 화면 = fitBar 가 하단바 높이를 --pbar-h 로 두고 .pop max-height = min(72vh, 100vh - 32px - --pbar-h) / N≥3 감아 도는 슬롯 transition none + |d|≥2 data-far opacity 0 / .pdim 초점에서 ArrowDown ArrowUp PageDown PageUp Space 로 활성 카드 스크롤). 고치지 않은 것 = 아래 맞춤 빈 공간(짧은 카드가 활성일 때 위쪽 공백): 고정 하단바(→ 위치 불변)와 양립하지 않아 받아들인 trade-off. 이 판단이 맞는지 L4, L6 에서 말하라.
[이번 회차 실측 = 프로브 2종 결과 + 메인 세션 자기 점검, 수치는 스크립트 실측]
__PROBE_DIGEST__
[스크린샷] r7/shots/ 의 popnav_*.png, popup_pinned_1440.png, popup_pinned_390.png, joint_dsf2/joint_post_*.png. A/B 전후 = r7/shots/ab_pre, ab_post, 차이 crop = r7/diff_ab/. 6회차 스크린샷 = r6/shots/, 라이브 캡처 = r5/live/.

[채점 대상]
1. 팝업 무대 9렌즈 재채점(6차 35/45). 특히 L4(접합 단일선, 그림자), L6(넘김 안정), L7(짧은 화면, N≥3), L8(조작부 안정), L9(연타, 터치, 초점, 키 스크롤) 변화.
2. 대학 목록은 A/B 가 0 이면 5차 점수 유지로 적는다(tiles 필드에 5차 L 과 total 을 그대로, release true).
3. 6차 §5 P2(슬릿), Codex 6차 P2(슬릿), 반증 6차 P2 5건(아래 맞춤 빈 공간, 짧은 화면 하단바 잘림, N≥3 감아 돌기, 초점 틀 스크롤, 폭 600 미만 높이 330 이하 하단바 둘째 줄) 각각 resolved 여부 + 근거.
4. 프로브 issues 를 릴리스 차단(P1)인지 다음 회차(P2)인지 판정.
릴리스 기준 = 각 면 총점 31 이상 + 렌즈1 ≥ 4 + 렌즈8 ≥ 3 + 렌즈9 ≥ 3, 그리고 릴리스 전 P1 0건.

[출력] 700단어 이내 markdown, §1 팝업 무대 점수와 판정 / §2 대학 목록(유지 근거 한 줄) / §3 수리 확인 표 / §4 릴리스 전 P1(파일:행과 수정안 한 줄, 없으면 「없음」) / §5 P2 / §6 슬롭 16뿌리와 잔상 7축 / §7 토큰 위배. §1 말미에 「Codex X1 병렬 채점 = 메인 세션이 CLI 로 별도 발주, 메인 세션이 병합」 한 줄. 산문 은유와 가운뎃점 금지. 말미에 JSON 코드 블록 1개: {"popup":{"L":[9정수],"total":합,"release":bool,"top_defect":"..."},"tiles":{...},"fixes":[{"id":"...","resolved":bool,"evidence":"..."}],"p1":[],"p2":[],"slop_afterimage":"...","token_violations":[]}. 파일 수정 금지, 점수 없는 평가 금지. 리포 추적 파일 수정과 git 쓰기 금지, 서버(8092 워크트리, 8799 모킹)는 그대로 쓴다. Playwright 로 직접 재실측할 때는 r7/critic_*.mjs 로 저장.
