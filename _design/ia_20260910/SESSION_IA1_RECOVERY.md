# IA1 회수 기록 (본 세션, 2026-09-10 15:0x~)

## 결재·발주
- 건우 14:33 「OK. 그리고 A로 가」 = RP 거울 OK(reprompt_metrics gate_result OK) + IA1-1 A 결재(단위별 딥링크 8 = 1종 계수). pending_approvals_active.md IA1-1 ✅.
- 브리프 정정 1건(범주 A): 게이트 경로 `_tools/ia_links.py` 는 없다. 실경로 `_design/redesign_20260909/ia_links.py`, kind() 에 interview 1줄 추가 지시로 고침.
- 발주 14:36 `/opt/homebrew/bin/codex exec -m gpt-6-astra ultra workspace-write`(pid 82747, cmux shim 회피). 완료 15:00, `ia1_out.md`.

## Codex 산출 대조
- IMPL_DONE files=85 build_hash=a5d0e8089fffc5ca gates 15 pass / ia:fail / style:fail / BLOCKED 3(브라우저 캡처 2, critic).
- 세션 재빌드 2회(LC_ALL=C) = a5d0e8089fffc5ca 동일(1차·2차). CSS 수정 뒤 3차·4차도 동일(해시는 html·xml·txt 만 묶는다. base.css 는 별도 sha256/16 = d67efa6a2571601d, HEAD 4b166dafb20ff7f8).
- 검증기: v2_check 70/0 · seo 31/0 · samples 12/0 · link_check 75/0 · worker_check 27/0 · 12개월 0건.
- 무접촉 확인: terms.html·privacy.html 변경 = 푸터 1항목뿐(1/1 줄). checkout.html 무변경. 「감옥」류 프롬프트 잔재 사이트 파일 0.
- ia:fail 판정 = 규칙 「목적지 종류 ≤ 6」 초과 6면(index 9·programs/studio 7·guidebook/index 9·studio 9·lectures 11·my 10). HEAD 시점 이미 초과 5면(index 8·guidebook/index 9·studio 7·lectures 10·my 10). IA1 이 새로 만든 초과 = programs/studio 6→7(interview 1종, 곧 이번 회차 목적). studio.html +2 = interview 1종 + `studio.html?unit=`(응시실 자기 면). 링크를 빼는 쪽으로 풀지 않는다는 브리프 §3-3 대로 유지. 정보 항목으로 결재 큐 추기 예정.
- style:fail 판정 = C/D 7면(guidebook gachon·konkuk·kookmin·kyonggi·snu, my, terms) 전부 HEAD 와 동일 지적(푸터 1줄만 바뀐 면). IA1 신규 문장은 전건 A.
- 8면 유입 파일 수(자기 면·xsib 제외 전) = 판매 5면 6 / 예정 3면 4. 목표 3 이상 충족.

## 브라우저 실측(세션, 서버 127.0.0.1:8912, Codex 가 다시 쓴 shot_ia1.mjs)
- 20/20 PASS: 1280 2열 폭 509·높이 균일(programs 279 / studio 328)·제목 1줄·tap 미달 0·충돌 0·넘침 0, 390 1열 균일.
- **세션 발견 결함 1건(수정)**: `.r3-unit{padding:var(--s4) 0}` 과 `nth-child(even){padding-inline:0}` 이 `.unit` 760 규범(괘선 안쪽 s4)을 덮어 좌열 「담기」·제원 값과 우열 번호가 괘선에 닿음(구매면 가격도 회귀). 원인 = 브리프 §3-2 「좌우 패딩 0(.unit 규범)」 인용이 CSS 원본과 달랐다(spec 사본 drift, feedback_typeset_spec_vs_css_oracle 와 같은 꼴). 수리 = 두 선언 제거(.unit 규범 승계). 재캡처 20/20 PASS, 확대 육안 확인.
- 수정 전 캡처 = shots_prefix/, 수정 후 = shots/.

## 남은 판정
- design-critic 9렌즈(15:40, CRITIC_VERDICT_IA1.md): 총점 **31/45 릴리스 YES(하한)**, 렌즈1=4·8=4·9=4. High 3 = H1 구매면 序 결번(01·02·03·05·06) / H2 ⑤⑥ 같은 ghost 라 primary 부재 / H3 구매면 담기가 tlink 최약. Medium 4 = M1 「응시실」 라벨 대 목적지(구매면) 불일치(문안 결재 필요) / M2 소개면 빈 .r3-unit-commerce / M3 구매면 고아 1칸(예정 3을 6번째 칸 카드로 제안) / M4 예정 카드 foot 공백. Low 2 = L1 담기 tap 폭 34px / L2 my.html 문안 자리.
  - 세션 수리(2차, _tools/studio_units.py + base.css): H1 구매면 판매 카드만 01~05 재번호(소개면 8장 序 유지) / H2·H3 면당 solid 하나 = 소개면 ⑤ `btn sm`, 구매면 ⑦ 담기 `btn sm`(⑤⑥ ghost) / M2 소개면 commerce div 미출력 / L1 `.foot .tlink{min-width:var(--tap)}`. 미집행 = M1(문안표 결재 IA1-3a) · M3(구매면 구조 변경, 결재 IA1-3b) · M4(단일 액션 우측 정렬 유지가 8장 일관) · L2(문안표 자리, IA1-3c).
  - 재빌드 2회 fe2615c748ca89cf 동일, 캡처 20/20 PASS, 카드 담기 실브라우저 재확인, 단위 테스트 PASS, 정적 검증기 shared-markup ./span 2건 = 번호 재매김이라 비교 규칙 갱신.
  - critic Δ 재채점(15:5x): **31 → 33/45, 릴리스 YES, High 0**. 렌즈3 3→4(primary·결번 해소), 렌즈5 3→4(면당 solid 1). M2 는 DOM 만 해소(빈 1fr 행이 기하 흡수, 렌즈4 3 유지). 신규 Medium 1 = studio.html 담기 3등급 공존(단위 solid / 낱권 ghost sm / 공통 인강 ghost, 낱권·인강은 기존). 신규 Low 2 = 같은 단위 序 소개면 05 대 구매면 04 · 담기 semantics a 대 button. 잔상 7축 0. 수용(면의 목적 행동 = 단위 담기가 primary, 낱권·인강은 보조) → IA1-3 d)e) 로 기록.
  - Stage 3 audience-proxy(16:0x, AUDIENCE_PROXY_IA1.md): 학부모 7 / 경쟁학원 7 / 외국독자 9 = **23/30(임계 25 미만)**. 프록시 자체 판정 = 프레임 다양성 부족이 아니라 한 자리 신호(3인 동일 지목) → 그 자리 수리 뒤 재채점 권고, 결정은 통합 판정.
    - #1 「데스크톱 오른쪽 열 카드 끝 글자 잘림」 → 세션 실측(measure_edges.mjs): 오른쪽 열 자식 최대 우단 1148.8 = 카드 우단 = 컨테이너 우단, 넘침 0. 왼쪽 열은 좌단 131.2 = 컨테이너 좌단. `.unit` 760 규범(바깥 가장자리 여백선 밀착, 안쪽 괘선 s4) 그대로 = HEAD 구매면 가격도 같은 자리. 픽셀 확대 글자 절단 0. **판정 = 규범 밀착의 지각 신호(solid 검정 버튼이 여백선에 닿음), 결함 아님**. critic Stage 2 도 같은 근거로 기각. 완화 여부(짝수 열 우측 inset)는 격자 정합을 깨므로 건우 판단 IA1-3 f).
    - #2 소개면 카드 「담기」가 가격 없이 담는다 → 현행 = 담은 뒤 #buy 로 이동해 가격·상태 문구 표시. 대안 = 담기 대신 선택·이동만(button.click 1줄 제거) 또는 카드에 가격 표시(가격 사본 신설). IA1-3 g) 결재.
    - #3 카드 구역 안 브랜드 표시 없음 → 면 구조(R3), 범위 밖. #4 구매면 5장 고아·예정 3 한 줄 → IA1-3 b) 와 동일.
    - **#1 재판정·수리(16:1x)**: 픽셀 확대에서 절단은 없으나 색면 끝 = 글자·solid 버튼 끝이라 절단으로 읽힘. 원인 = 명패 행에 색면(--card·--mat)을 깔면서 바깥 가장자리 여백 0. 수리 = base.css 760px 이상 `.r3-unit{padding-inline:var(--s4)}`(짝수 포함) → 내용 155~616 / 665~1125, 색면이 24px 더 나감. 높이·줄 수 불변, 20/20 PASS, 390 무변화. critic Δ2 + 프록시 재채점 요청.
    - critic Δ2(16:2x): 33/45 유지, YES, High 0, 지목 자리 해소 확인(짝수 열 담기 우단 1111 대 색면 1149). 신규 비용 = 좌측 스파인 24px 이탈·괘선 두 길이 → 권고 Δ2-R1 = 홀수 열 좌 0 유지, 짝수 열만 양쪽 s4. **적용**(base.css 2591816dbd2d4801): 홀수 131~616 / 짝수 665~1125, 20/20 PASS. 800·1024 폭 여백 실측 병기(아래).
    - 프록시 재채점(16:2x, 대칭 여백 판): 학부모 9 / 경쟁 7 / 외국 9 = **25.0/30 PASS(통과선 정확값)**. 상승분은 학부모 불쾌감·신뢰 두 항목. 남은 자리 = 소개면 담기 값 없음(IA1-3 g) · 구매면 「해설 강의 상태는 내 강의에서 확인」이 값 설명으로 읽힘(신규, IA1-3 h) · 카드 구역 회사 표시(면 구조). Δ2-R1 은 왼쪽 열만 바꾸므로 오른쪽 열 판정 유효.
    - 계측 교훈(프록시·critic 공통): results.json 의 넘침·tooSmall 은 「색면 끝 대 글자 끝 거리」에 무반응 → measure_edges.mjs 가 좌·우 여백 px 를 값으로 남긴다(짝수 열 우 여백 하한 s4).
    - **통합 판정(본 세션, 수리 전 기준)**: Stage 2 33/45 YES + Stage 3 23/30 중 #1 은 실측 반증, #2·#4 는 결재 후보 등재, #3 범위 밖 → 배포 진행(건우 지시 = 연결·배포, 되돌리기 = revert 1커밋). Stage 3 미달은 결재 큐 IA1-3 머리에 고지.
- Codex X1 read-only 검토(15:1x 완료, codex/x1_ia1_out.md): **GO_WITH_FIXES**, mid 2.
  - mid-1 소개면 카드 「담기」가 선택만 바꾸고 장바구니에 안 넣음 → 세션 수리: product_buy.js 카드 핸들러 끝에 `button.click()` 1줄(구매 블록 담기 버튼과 같은 경로). 단위 테스트 verify_ia1_buy.mjs 기대값 갱신(카드 1클릭 = 담기 1회, 판매 5·비판매 0) PASS, 실브라우저 verify_card_cart.mjs = 상태 문구 「장바구니에 담았습니다.」 + hh_cart_v1 에 pass-korea-hum 1건 + #buy 이동, pageerror 0.
  - mid-2 IA 상한 신규 초과(programs/studio 6→7) → 7종 = login·cart·studio·terms·interview/<code>·ranking·b2b. 새 종류 = 안내면 링크(이번 회차 목적) 하나뿐, 나머지 6은 구매 블록·교차 판매 필수. 링크 제거 없이 정보 항목 IA1-2 로 결재 큐 등재(§0 상한 개정 여부 건우 판단). X1 은 IA1-1 A 결재 사실을 모르고 「임의 계수 예외」라 적음.
  - 주의 2건: 예정 목록 순서가 §5 문면(고려·고려·연세) 아닌 CODES 순서(연세·고려·고려) = §4 지시 우선, 유지. 문체 C/D 7면 = HEAD 동일(표본 2면 재검사 일치).
  - X1 은 read-only 라 파일을 못 쓴다고 했지만 `-o` 로 마지막 메시지가 x1_ia1_out.md 에 저장됨.
