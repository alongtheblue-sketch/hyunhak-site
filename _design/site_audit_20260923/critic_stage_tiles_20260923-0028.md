# design-critic(opus) 제2 평가자 채점 — 팝업 무대 + 대학 타일 (2026-09-23 00:28 회신, 세션 소멸 직전 회수)

## 1. 팝업 무대 32/45 릴리스 NO
L1 4 / L2 3 / L3 4 / L4 2 / L5 5 / L6 3 / L7 3 / L8 4 / L9 4
- L4=2 최대 결함: base.css .pslot[data-side]{opacity:.55} 가 슬롯 전체를 합성해 측면 카드가 반투명. 카드 본문 rgb(214,210,204). stage_1440_request.png y390~470 에서 지면 h1, 리드, "대학 찾기" 가 카드를 관통해 두 텍스트가 같은 픽셀. "단일 focal" 의도와 반대.
- L1=4: 행사 팝업 h2 가 같은 화면 y134 띠와 완전 동일 문장. 새 소식(의뢰 개시)이 측면으로 밀림.
- L6=3: POPUP_AUTO_MS 5000. 2행 가격표 + 60자 본문 + CTA 2 = 묵독 12초 필요. 진행 표시 없음. (정지, 호버, pointerdown, focusin 정지, reduced-motion 자동 없음 = WCAG 2.2.2 충족)
- 실측 재확인: 1440 활성 카드 중심 719 vs 720, 하단바 폭 = 카드 폭 438, 폰 .pnav 중심 197.5 vs 카드 194.5 (←n/N→ 삼조는 168.5, 26px 좌편)
- P1(릴리스 전): 측면 카드 불투명화. opacity 를 슬롯에서 떼고 불투명 래퍼 또는 색 합성으로.
- P2: pop--gwak 클래스 CSS 전무 · 체크 글리프 없는 체크박스 · html.ppop-open 에 scrollbar-gutter 부재(개폐 시 가로 점프) · .pop 의 aria-labelledby/describedby 가 role 없는 div(카드 이름 AT 미노출) · .pslot 클릭 핸들러에 role/tabindex 없음 · 자동 넘김 8000ms 이상으로.

## 2. 대학 타일 33/45 릴리스 YES (P1 동주 배포 조건)
L1 4 / L2 4 / L3 3 / L4 3 / L5 5 / L6 4 / L7 3 / L8 4 / L9 3
- L4=3: 상단 rule-strong 은 1007px 연속, 행 rule 은 40px 거터에서 끊김(한 블록에 괘선 문법 둘). 닫는 rule-strong 없음(형제 .rows 에는 있음).
- L3=3: 검색칸이 헤더 유틸 .search{width:clamp(180px,17vw,240px)} 상속, .find 오버라이드 0. 1440 = 240/1007, 390 = 180/350. 구역 주 조작이 유틸 크기.
- L9=3: aria-describedby="q2h" 가 목록 성질 "가나다 순입니다." 를 입력칸에 결박 · .tiles aria-live="polite" + 키 입력마다 innerHTML 전면 교체, 디바운스 0 → 링크 12건 반복 낭독.
- 잘된 것: 가격·학년도 12회→1회, 朱印 12점 제거, 행 높이 --tap 48, row-major 가 가나다와 일치.
- P1: aria-describedby 해제(도움말을 목록 캡션으로) + aria-live 를 건수 안내 영역으로 축소 + .find .search 폭 오버라이드.
- P2: 빈 상태 문구에 링크 없음 · .n ellipsis 에 title/aria-label 없음 · 죽은 tabs 코드와 f==='sale' 미도달 분기.

## 3. 슬롭·잔상
- AI 슬롭 16뿌리 1건: #9 균등 50:50 — .pacts{grid-template-columns:1fr 1fr} 가 결제 CTA 와 둘러보기 CTA 에 동일 면적.
- 한국 잔상 7축 2건 적용(#6 한지 색, #1 오방색 부분). Q-D PASS.

## 4. 토큰 위배
- 새 색 0, 새 곡률 0. 딤 rgba(49,46,46,.42) 는 --ink 삼중값 하드코딩(선례 동일, --ink-rgb 부재가 원인).
- 미선언 리터럴 px: base.css 팝업 블록 margin-right:10px · text-underline-offset:4px · width/height:18px (주석은 "셋" 선언, 실제 6) · 타일 블록 gap:8px · translateX(2px) · @media(max-width:600px) (같은 날 팝업 블록은 37.5em, 단위 불일치 → 200% 확대 시 타일 3열 유지).
