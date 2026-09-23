# hyunhak.com 릴리스 전 외부 검토 (Codex X1, 읽기 전용)

## 역할
너는 hyunhak.com 릴리스 전 외부 검토자다. 읽기 전용이다. 파일을 만들거나 고치지 말고, 빌드와 git 쓰기를 하지 않는다. 리포는 현재 작업 디렉터리(/Users/gregory/Workspace/hyunhak-site)다.

## 대상
`git show 87106d8` 의 4건 수리.
1. 모션 감소 정지 단추 (홈 팝업의 [data-ppop-pause], prefers-reduced-motion 시 로드 직후 「재생」 aria-pressed=true 로 멈춘 상태에서 시작하고, 단추로 재생과 정지를 토글)
2. 대학 목록 2열 구간 괘선 리셋 (.tiles 의 nth-child border-top 과 padding-right 리셋, 2열 구간 min-width 37.501em 하한)
3. 가입 약관 행 줄바꿈 (join.html 의 label.check-choice flex-wrap 과 span flex, 체크박스가 글자와 같은 줄에 남도록)
4. 가이드북 #books 링크 문구 (programs/guidebook.html 과 템플릿 _tools/program_guidebook_v2.html 의 「담기」 → 「구매할 상품 고르기」, data-copy="return_buy")

## 배경
/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/critic_r2_20260923.md §4 (design-critic 2차가 지적한 P1 4건). 먼저 이 절을 읽고 4건 각각의 원래 증상을 확인한 뒤 수리 diff 와 대조한다.

## 이번 실측 프로브 요약 (3회차, 헤드리스 Chromium 실측 원자료 요약)
```json
[
 {
  "probe": "motion",
  "pass": true,
  "checks": [
   {
    "name": "1-1 reduce: 로드 직후 단추 「재생」 aria-pressed=true",
    "pass": true,
    "evidence": "1440: reduceMatches=true, btnText=재생, aria-pressed=true, cur=1 (팝업이 열리고 440ms 뒤 측정). 390: reduceMatches=true, 재생, true, cur=1 (448ms 뒤)"
   },
   {
    "name": "1-2 reduce: 9.5초 대기 뒤 칸 고정(자동 넘김 없음)",
    "pass": true,
    "evidence": "1440: 9504ms 동안 1→1, 칸 변화 0건. 390: 9503ms 동안 1→1, 변화 0건 (MutationObserver 기록)"
   },
   {
    "name": "1-3 reduce: 단추 클릭 → 「정지」 aria-pressed=false",
    "pass": true,
    "evidence": "마우스 클릭 직후 1440과 390 모두 btnText=정지, aria-pressed=false, cur=1. 키보드(초점을 둔 뒤 Enter)로 눌러도 두 폭 모두 정지, false"
   },
   {
    "name": "1-4 reduce: 클릭 뒤 9.5초 안에 칸 넘어감",
    "pass": true,
    "evidence": "키보드: 1440은 8000ms에 1→2, 390도 8000ms에 1→2. 마우스: 포인터를 딤(4,4)으로 옮긴 뒤 1440은 7968ms, 390은 8000ms에 1→2. 포인터를 단추 위에 둔 9.5초 동안은 두 폭 모두 변화 0건 (호버 정지 규칙, issues 참조)"
   },
   {
    "name": "2-1 no-preference: 로드 직후 「정지」 aria-pressed=false",
    "pass": true,
    "evidence": "1440과 390 모두 reduceMatches=false, btnText=정지, aria-pressed=false, cur=1 (마우스 컨텍스트와 키보드 컨텍스트 모두 같음)"
   },
   {
    "name": "2-2 no-preference: 9.5초 안에 칸 넘어감(8초 주기)",
    "pass": true,
    "evidence": "팝업이 열린 시점부터 잼. 1440: 8003ms에 1→2 (두 컨텍스트 모두 8003ms). 390: 8003ms, 8004ms에 1→2. 측정 창은 9502~9503ms"
   },
   {
    "name": "2-3 no-preference: 단추 클릭 → 「재생」 aria-pressed=true",
    "pass": true,
    "evidence": "마우스 클릭 직후 1440과 390 모두 재생, true, cur=2. 키보드: 단추로 초점을 옮긴 뒤에도 정지, false로 남아 있다가(focusin 제외 규칙 동작) Enter 뒤 재생, true"
   },
   {
    "name": "2-4 no-preference: 클릭 뒤 9.5초 동안 칸 고정",
    "pass": true,
    "evidence": "마우스(포인터를 딤 4,4로 옮겨 호버 정지와 분리): 1440은 9508ms 동안 2→2, 390은 9503ms 동안 2→2, 둘 다 변화 0건. 키보드: 1440은 9503ms, 390은 9502ms 동안 변화 0건"
   },
   {
    "name": "3-1 카드 수와 단추 존재",
    "pass": true,
    "evidence": "두 폭 모두 N=2 (.pslot 2개), .pcnt=1/2, [data-ppop-pause] 있음, 48x48. 위치는 1440에서 x805 y641, 390에서 x240 y652이고 둘 다 뷰포트 안에 있음"
   },
   {
    "name": "3-2 키보드 Tab으로 단추에 초점 도달",
    "pass": true,
    "evidence": "두 폭과 두 모드 모두 6번째 Tab에서 도달. 첫 초점은 H2 제목. Tab 순서는 1 A.btn(의뢰하기), 2 A.btn.ghost(자세히), 3 INPUT(오늘 하루 보지 않기), 4 BUTTON.parr(이전), 5 BUTTON.parr(다음), 6 BUTTON.ppause"
   },
   {
    "name": "4 스크린샷(reduce, 클릭 전 「재생」 보임)",
    "pass": true,
    "evidence": "popup_reduce_1440.png, popup_reduce_390.png 두 장 모두 하단바에 「1/2 ← → 재생」이 보이는 것을 눈으로 확인함"
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/popup_reduce_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/popup_reduce_390.png"
  ],
  "issues": [
   "관찰 사항이며 결함은 아님(설계된 호버 정지 규칙): reduce 모드에서 마우스로 「재생」을 누르면 표기는 즉시 「정지」 aria-pressed=false로 바뀐다. 그러나 포인터가 무대(.pstage 자식) 위에 있는 동안은 hover=true 때문에 넘어가지 않는다. 두 폭 모두 9.5초 동안 변화 0건이었고, 포인터가 딤으로 나간 뒤 약 8초 만에 넘어갔다. 단추 표기는 재생 중이라고 하는데 화면은 멈춰 있는 구간이 생긴다. critic 이 판단할 사항으로 남긴다.",
   "관찰 사항이며 결함은 아님(설계): no-preference 모드에서 첫 Tab(의뢰하기 CTA)의 focusin 이 벨트를 멈춰, 단추가 1번째 Tab 부터 「재생」 true 가 된다. 키보드 사용자가 6번째 Tab 으로 단추에 닿을 때는 이미 멈춘 상태다.",
   "측정 원자료: /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/motion.json. 리포 추적 파일은 수정하지 않았고, 빌드와 git 쓰기도 하지 않았다."
  ]
 },
 {
  "probe": "tiles",
  "pass": false,
  "checks": [
   {
    "name": "3열 구간 1440, 1280, 1101 (행 괘선 연속, 첫 행만 border-top 0, 행 끝만 padding-right 0, 간격 > 0)",
    "pass": true,
    "evidence": "세 폭 모두 grid 3열(1440: 336px x3). bt8=0,0,0,1,1,1,1,1, pr8=40,40,0,40,40,0,40,40. 4개 행 bts=[0,0,0],[1,1,1],[1,1,1],[1,1,1], 이음매 maxSeam 0. 화살표와 다음 열 글자 사이 최소 간격 40px. .n 넘침 0/12"
   },
   {
    "name": "2열 구간 1100, 1024, 900, 768, 601 (P1-2 수리 대상)",
    "pass": true,
    "evidence": "다섯 폭 모두 2열(1024: 457.047px x2, 768: 353.281px x2). bt8=0,0,1,1,1,1,1,1, pr8=40,0,40,0,40,0,40,0. 6개 행 모두 같은 행 안에서 bt가 같고 maxSeam 0. 최소 간격 40px. 1024 에서 건국대학교(서울)과 경기대학교 사이 간격 40px. 넘침 0"
   },
   {
    "name": "1024 회귀 전후 비교 (c5dff51 base.css 를 route 로 끼워 같은 조건 측정)",
    "pass": true,
    "evidence": "c5dff51: bt8=0,0,0,1,1,1,1,1, pr8=40,40,0,40,40,0,40,40, minGap 0. HEAD 87106d8: bt8=0,0,1,1,1,1,1,1, pr8=40,0,40,0,..., minGap 40. 2차 증상(3번 타일 bt 0, 화살표 열 경계에 붙음)이 없어졌다"
   },
   {
    "name": "정수 폭 600 (판정 폭 목록 안)",
    "pass": false,
    "evidence": "grid 2열(276px x2)인데 1열 리셋이 걸린다. mq max-width:37.5em=true, min-width:37.501em=false. bt8=0,1,1,1,1,1,1,1(첫 행 [0,1]이라 행 안에서 다르고, 2번 타일 1px 선이 목록 윗선 바로 밑에 겹쳐 이중선이 된다). pr8 전부 0. 화살표와 다음 열 글자 간격 6쌍 모두 0px(tiles_600.png 의 「가천대학교 →가톨릭대학교」). 보조 스캔 599/560/480/421 동일(421: 190.5px x2, 간격 0). 420 에서 1열(380px)이 되어 정상"
   },
   {
    "name": "1열 구간 390, 360 (보조 420)",
    "pass": true,
    "evidence": "1열(390: 350px, 360: 320px, 420: 380px). bt8=0,1,1,1,1,1,1,1, pr8 전부 0. 12개 행 [0],[1]x11. 다음 열이 없어 간격 측정은 해당 없음. 넘침 0"
   },
   {
    "name": "200% 확대 (viewport 720x450, deviceScaleFactor 2)",
    "pass": true,
    "evidence": "dpr 2, vw 720, 2열(331.203px x2). bt8=0,0,1,1,1,1,1,1, pr8=40,0,40,0,40,0,40,0. 행 괘선 연속, 최소 간격 40px, 넘침 0. 2차 L9 증상은 재현되지 않는다"
   },
   {
    "name": ".tile .n 텍스트 넘침(scrollWidth > clientWidth)",
    "pass": true,
    "evidence": "정수 폭 11개, 보조 폭 5개, 200% 확대, 배율 소수 폭 3조건 모두 overflowCount 0/12"
   },
   {
    "name": "소수 폭 iframe 트릭 1100.5, 600.5",
    "pass": true,
    "evidence": "iframe 1100.5px: 문서 폭 docW=1101, min-width:1101px=true, 3열, bt8=0,0,0,1..., pr8=40,40,0,..., 간격 40. iframe 600.5px: docW=601, 2열 규칙 적용, 간격 40. Chrome 이 iframe 내부 뷰포트를 정수로 반올림해서 이 방법으로는 소수 폭이 재현되지 않았다(600.01 은 600 으로 반올림되어 정수 600 과 같은 결함이 나왔다)"
   },
   {
    "name": "실제 소수 폭 1100<w<1101 (창 1100 DIP에 기기 배율 1.125 또는 1.333 적용, 판정 밖 추가 측정)",
    "pass": false,
    "evidence": "배율 1.125: visualViewport 1100.444, 배율 1.333: 1100.525. 두 경우 모두 min-width:1101px=false이고 max-width:1100px=false. 그래서 기본 3열(328.139px x3)이 그대로 남는다. 첫 행 bts=[0.889,0.889,0.889](1.333 배율에서는 0.750, 기기 픽셀 1개)이 목록 윗선 밑에 겹쳐 이중선이 된다. pr8 전부 40이어서 3열 끝 화살표가 오른쪽 괘선 끝보다 40px 안쪽에 있다(tiles_1100frac.png). 간격은 40px 라 글자 충돌은 없다. 배율 1.333 에 창 600 이면 vv 600.15 이고 2열 규칙이 정상 적용된다(bt8=0,0,…, 간격 40)"
   },
   {
    "name": "검색 필터 상태 '서' (1440, 1024): 첫 행 괘선 중복이나 빠짐",
    "pass": true,
    "evidence": "숨김 방식: hidden 속성도 display:none 도 아니다. render() 가 innerHTML 을 걸러낸 목록으로 다시 쓴다(자식 5, hiddenKids 0). 그래서 nth-child 가 보이는 타일 기준으로 맞는다. 1440: 행 bts=[0,0,0],[1,1], 간격 40. 1024: [0,0],[1,1],[1], 간격 40. 첫 행 중복과 빠짐 0. c5dff51 비교: 1440 은 같고, 1024 는 [0,0],[0,1],[1], 간격 0이었다(2차 회귀, 이번에 고쳐짐). 44aea38(라이브)은 상자형 타일(repeat(4,1fr), gap var(--s3))이라 괘선 구조 자체가 없다"
   },
   {
    "name": "팝업 ESC 닫기",
    "pass": true,
    "evidence": "정수 폭 11개, 보조 5개, 200%, iframe 3개, 배율 3조건 모두 had=true, closedByEsc=true, 강제 제거 0"
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_1024.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_768.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_720z2.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_600.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_480.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_1100frac.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_filter_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/tiles_filter_1024.png"
  ],
  "issues": [
   "[결함, 판정 FAIL 원인] 421~600px 구간(정수 폭 600 포함)에서 목록은 2열인데 1열 리셋이 적용된다. 원인: base.css 374행 @media (max-width:37.5em) 이 grid-template-columns:minmax(0,1fr) 로 1열을 만들지만, 소스 순서가 뒤인 465행 @media (max-width:1100px) 와 487행 @media (max-width:900px) 의 .tiles repeat(2,1fr) 이 같은 특이도로 덮는다. 실제 1열은 506행 max-width:420px 부터다. 결과(600 실측): pr8 전부 0, 화살표와 다음 열 글자 간격 6쌍 모두 0px(2차와 같은 「→가톨릭대학교」 붙음), 첫 행 bt=[0,1] 로 2번 타일 선이 목록 윗선 밑에 겹쳐 이중선. 599/560/480/421 에서도 같다. c5dff51 base.css 로 재도 600 결과가 같다. 즉 87106d8 신규 회귀가 아니라 c5dff51 괘선 목록 도입 때부터 있던 결함이고, 87106d8 의 37.501em 하한이 이 구간을 덮지 못했다. 라이브 44aea38 은 상자형 타일이라 미배포 결함이다(tiles_600.png, tiles_480.png)",
   "[결함, 정수 폭 판정 밖] 1100<w<1101 소수 폭에서 min-width:1101px 과 max-width:1100px 이 둘 다 맞지 않아 3열 리셋이 빠진다. 기기 배율 1.125(vv 1100.444)와 1.333(vv 1100.525)으로 재현: 첫 행 3타일 border-top 이 기기 픽셀 1개(0.889, 0.750)로 목록 윗선 밑에 이중선이 되고, 모든 타일 padding-right 40 이어서 3열 끝 화살표가 오른쪽 괘선 끝보다 40px 안쪽에 선다. 글자 충돌은 없다(간격 40). 문서 지시의 iframe 트릭은 Chrome 이 iframe 뷰포트를 정수로 반올림해(1100.5 -> 1101, 600.5 -> 601) 재현하지 못했다. 600 경계(37.5em 과 37.501em)는 vv 600.15 에서 정상이다. 600~600.016 틈은 흔한 배율에서는 닿기 어려운 폭이다(tiles_1100frac.png)",
   "[관찰, 회귀 아님] 검색 필터로 마지막 행이 덜 찰 때 빈 칸 위의 행 괘선이 없다. '서' 5건 기준으로 1440 에서는 2행 윗선 오른쪽 336px, 1024 에서는 3행 윗선 오른쪽 457.05px 가 비고, 목록 아랫선(rule-strong)만 전폭으로 이어진다. c5dff51 1440 과 구조가 같다(tiles_filter_1440.png)",
   "[관찰, 회귀 아님] 검색 결과가 0건일 때 p.empty 가 .tiles 격자 한 칸만 차지한다(gridColumn auto, 폭 1440 에서 336px, 1024 에서 457.05px). 행 전폭으로 펼쳐지지 않는다. 44aea38 에서도 p.empty 는 같은 .tiles 격자 안에 있었다"
  ]
 },
 {
  "probe": "join",
  "pass": true,
  "checks": [
   {
    "name": "수리 CSS 적용 (label.check-choice flex-wrap, span flex)",
    "pass": true,
    "evidence": "5폭 x 5행 = 25건 전부 computed flex-wrap=nowrap, span flex='1 1 0%', min-width=0px. 우선순위: #joinForm .check .check-choice (1,2,0) 가 base.css:574 .check label (0,1,1) 을 이긴다"
   },
   {
    "name": "같은 줄 320",
    "pass": true,
    "evidence": "5행 모두 sameLine=true. 체크박스 x20~42, span.left=50 (8px 간격). 체크박스 세로 중심이 첫 줄 박스 안: ck-all 760.58 in [750.58,765.58], ck-terms 834.58 in [824.58,839.58], ck-priv 908.58 in [898.58,913.58], ck-age 1002.08 in [992.08,1007.08], ck-mkt 1095.58 in [1085.58,1100.58]. 첫 줄 글자 = '전체 동의','이용약관 동의','개인정보 수집과 이용 동의','만 14세 이상 확인','광고성 정보 수신 동의'"
   },
   {
    "name": "같은 줄 360",
    "pass": true,
    "evidence": "5행 모두 sameLine=true. cb 20~42, span.left 50. 세로 중심/첫 줄: 760.58/[750.58,765.58], 834.58/[824.58,839.58], 908.58/[898.58,913.58], 1002.08/[992.08,1007.08], 1076.08/[1066.08,1081.08]"
   },
   {
    "name": "같은 줄 390 (회귀가 났던 폭)",
    "pass": true,
    "evidence": "5행 모두 sameLine=true. cb 20~42, span.left 50. 전문 링크 행 3개: ck-terms 834.58/[824.58,839.58], ck-priv 908.58/[898.58,913.58], ck-mkt 1076.08/[1066.08,1081.08]. span.top - cb.top = -1.0 (전 행). 2차 회귀(체크박스 혼자 한 줄) 재현 0"
   },
   {
    "name": "같은 줄 768",
    "pass": true,
    "evidence": "5행 모두 sameLine=true. cb 64~86, span.left 94. 세로 중심/첫 줄: 737.83/[727.83,742.83], 811.83/[801.83,816.83], 885.83/[875.83,890.83], 959.83/[949.83,964.83], 1033.83/[1023.83,1038.83]"
   },
   {
    "name": "같은 줄 1440",
    "pass": true,
    "evidence": "5행 모두 sameLine=true. cb 400~422, span.left 430. 세로 중심/첫 줄: 832.48/[822.48,837.48], 906.48/[896.48,911.48], 980.48/[970.48,985.48], 1054.48/[1044.48,1059.48], 1128.48/[1118.48,1133.48]"
   },
   {
    "name": "전체 동의 행 (.check.all)",
    "pass": true,
    "evidence": "5폭 모두 sameLine=true, 행 높이 75. 390 에서 span 글자('체') 클릭 시 ck-all 켜짐, 나머지 4개 항목도 함께 true (allPropagatesOn=true), 700ms 뒤 재클릭 시 꺼짐"
   },
   {
    "name": ".view 전문 링크 48x48",
    "pass": true,
    "evidence": "3개 링크(terms.html, privacy.html, privacy.html#ads) x 5폭 = 15건 전부 48x48, ge48=true. 15건 모두 라벨과 같은 행에 있고 span 오른쪽 끝보다 오른쪽 (sameRowAsLabel=true, rightOfSpan=true)"
   },
   {
    "name": "행 높이",
    "pass": true,
    "evidence": "320: 75/74/93.5/93.5/153. 360: 75/74/93.5/74/133.5. 390: 75/74/93.5/74/114. 768: 75/74/74/74/94.5. 1440: 75/74/74/74/94.5 (all/terms/priv/age/mkt 순서). 한 줄 행 74~75 = 라벨 min-height 48 + padding"
   },
   {
    "name": "가로 넘침 0",
    "pass": true,
    "evidence": "document scrollWidth = 320/360/390/768/1440 로 폭과 같음 (body scrollWidth 도 같음). 25행 모두 row scrollWidth=clientWidth (320:280, 360:320, 390:350, 768:640, 1440:640)"
   },
   {
    "name": "390 span 글자 클릭 토글",
    "pass": true,
    "evidence": "5행 모두 첫 텍스트 노드 가운데 글자를 클릭(ck-all '체', ck-terms '관', ck-priv '과', ck-age '세', ck-mkt '보'). elementFromPoint=SPAN, 체크박스 아님, 체크박스 오른쪽 끝보다 24.56~82.85px 오른쪽. 1회 클릭 false→true, 700ms 뒤 2회 클릭 true→false, 5/5. 두 클릭 사이 스크롤 이동 0"
   },
   {
    "name": "390 .view 클릭은 체크를 바꾸지 않음",
    "pass": true,
    "evidence": "(A) document 단계에서 이동 막음: 3/3 모두 해당 행 checked 변화 없음, 전 체크박스 상태 변화 없음, 페이지 수 1→1, URL은 join.html 그대로. (B) 새 창 허용: 3/3 모두 새 창이 terms.html, privacy.html, privacy.html#ads 로 열림, 원래 창은 join.html, checked 변화 없음"
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/join_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/join_360.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/join_1440.png"
  ],
  "issues": [
   "참고, 판정 영향 없음: .check 가 align-items:center 라서 여러 줄 행에서는 「전문」 링크가 제목 줄이 아니라 행 가운데에 놓인다. 링크 세로 중심에서 첫 줄 세로 중심을 뺀 값: ck-mkt 는 320 에서 +50, 360 에서 +40.25, 390 에서 +30.5, 768과 1440 에서 +20.75. ck-priv 는 320, 360, 390 에서 +20.75. 한 줄 행은 +11. 스크린샷에서는 링크가 설명(small) 줄 옆에 있다. 링크는 행 안에 있고 48x48 이며 겹침도 없다.",
   "측정 방법 참고: base.css:80 의 html{scroll-behavior:smooth} 때문에 scrollIntoView 가 부드럽게 스크롤하는 도중 좌표를 재면 두 번째 클릭이 p.ckfoot 에 떨어져 토글이 안 된 것처럼 보였다. 사이트 결함이 아니다. 스크립트는 behavior:'instant' 로 옮기고 400ms 기다린 뒤 좌표를 다시 잰다. 요소 스크린샷도 블록 위쪽을 72px 에 맞춘다. 그러지 않으면 폰 폭에서 하단 고정 탭 바가 약관 끝 문단(ckfoot)을 덮은 채 찍힌다.",
   "원자료: /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/join.json"
  ]
 },
 {
  "probe": "books",
  "pass": true,
  "checks": [
   {
    "name": "1a. #books link copy, href and #close button match (built programs/guidebook.html)",
    "pass": true,
    "evidence": "Static parse: the #books a.tlink has href=\"#buy\", data-copy=\"return_buy\" and text \"구매할 상품 고르기\". The #close a.btn has the same href, key and text. The browser DOM agrees at both widths: linkText and closeText are both \"구매할 상품 고르기\" and both copy keys are return_buy."
   },
   {
    "name": "1b. href target id=\"buy\" exists",
    "pass": true,
    "evidence": "The static count of id=\"buy\" is 1: section.r2-buy.r3-buy. document.querySelectorAll('#buy').length is 1 at both 1440 and 390."
   },
   {
    "name": "1c. No __C_ placeholders left in built HTML",
    "pass": true,
    "evidence": "Scanned 81 *.html files, excluding node_modules, _design, _docs, _tools and .git. __C_ matches: 0. Other __UPPER__ placeholders: 0. At runtime, the regex over document.body.innerHTML also finds none (placeholderInDom=false). The template _tools/program_guidebook_v2.html keeps its 22 placeholder lines, which is expected."
   },
   {
    "name": "2. Template matches built output (87106d8)",
    "pass": true,
    "evidence": "git show 87106d8 changes one line in each file. Template line 92: data-copy=\"add\" __C_add__ became data-copy=\"return_buy\" __C_return_buy__. Built programs/guidebook.html line 166: data-copy=\"add\">담기 became data-copy=\"return_buy\">구매할 상품 고르기. The template92 key parsed by the probe is return_buy."
   },
   {
    "name": "3. No 「담기」→#buy pattern on other product pages",
    "pass": true,
    "evidence": "All 81 files scanned: 0 <a href=\"#buy\"> links whose text contains 담기 or whose copy key is add. #buy links found: programs/studio.html has 12 btn.sm links reading 구매하러 가기 (data-r3-unit-buy) plus 1 btn reading 구매할 상품 고르기. programs/korea.html, programs/yonsei.html, studio.html and guidebook/index.html have none. data-copy=\"add\" survives only on the #buy [data-primary] cart button. Its static text is 담기, and product_buy.js update() rewrites it to 장바구니 담기 / 지문 고르기 at runtime (primaryBtnText in DOM = 장바구니 담기)."
   },
   {
    "name": "4a. Clicking the #books link scrolls to #buy (1440x900)",
    "pass": true,
    "evidence": "Before the click: scrollY=8206, #buy top=-7935.3, link top=450.3, elementFromPoint on the link center returns the link itself. After the click (1972ms to settle, smooth scroll): scrollY=183, #buy top=87.7. The #buy scroll-margin-top is 88px, so the difference is -0.3. location.hash=#buy. The sticky header bottom is at 72, so #buy is not covered."
   },
   {
    "name": "4b. Clicking the #books link scrolls to #buy (390x844)",
    "pass": true,
    "evidence": "Before the click: scrollY=8319, #buy top=-8079.6, link top=422.1, and the link center hits the link itself. After the click (1996ms to settle): scrollY=151, #buy top=88.4 against scroll-margin-top 88px, a difference of +0.4. location.hash=#buy. Sticky header bottom=65, so #buy is not covered."
   },
   {
    "name": "4c. Link tap size (at least 48 high)",
    "pass": true,
    "evidence": "At both 1440 and 390 the link's getBoundingClientRect is 94.2x48, with display inline-flex and min-height 48px (--tap)."
   },
   {
    "name": "5. (record only) Full-page captures with lazy images triggered",
    "pass": true,
    "evidence": "Loaded/total, broken, pending: programs/guidebook 1440 = 34/34, 0 broken, 0 pending. programs/guidebook 390 = 22/34, 0 broken, 12 pending, all 12 display:none (the covers in the #books .r3-covers img{display:none} rule from astra D P1-4 under @media max-width 47.499em). programs/studio = 9/9 at both widths. guidebook/index and studio = 0 imgs at both widths (the only raw <img> is the Facebook pixel inside <noscript>). Image HTTP errors: 0 on every page. scrollW equals the viewport width on all 8 captures. Scrolling vertically alone left 3 images unloaded at 1440 and 2 at 390 (gbd_gachon_part5 in .openers, gbd_sample_F and gbd_sample_C in .r2-samples), because they sit off-screen in horizontal scroll lists. triggerLazy therefore also steps the horizontal scrollers (2 on guidebook, 1 on studio); after that the wait for images took 2 to 21ms."
   },
   {
    "name": "6. #books element capture",
    "pass": true,
    "evidence": "books_1440.png is 1008x1663: 12 covers loaded, 19 names in 2 columns, and the 구매할 상품 고르기 link. books_390.png is 350x1682: 31 ruled rows and the link. The sticky header and the 390 nav.fix were moved aside during capture only, so they do not overlap the middle of the section."
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/books_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/books_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/lazy_programs_guidebook_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/lazy_programs_studio_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/lazy_guidebook_index_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/lazy_studio_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/lazy_programs_guidebook_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/lazy_programs_studio_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/lazy_guidebook_index_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/lazy_studio_390.png"
  ],
  "issues": [
   "Record only, not a defect: vertical scrolling alone does not load the lazy images inside the horizontal scroll lists .r2-samples and .openers (3 left unloaded at 1440, 2 at 390 on programs/guidebook). Browsers do this by design and the images load once the list is scrolled sideways. Anyone reusing lazy capture should import triggerLazy from probe_books.mjs; its horizontal=true default also steps those lists. The raw output is at /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/books.json.",
   "Record only: the 12 cover images on programs/guidebook 390 are hidden by the page's own @media (max-width:47.499em) #books .r3-covers img{display:none} rule (astra D P1-4, intended), so lazy loading never fetches them. They count as pending 12, of which 12 are hidden. They are not failures.",
   "Capture method note: fullPage and long element captures paint the 390 fixed bottom tab (nav.fix) at the bottom of the first viewport, on top of the content (seen on the first attempt over the sample images). The sticky header also lands in the middle of a long element capture. The final captures move them aside only for the shot, using unstick() and restick(): fixed elements get visibility:hidden and sticky elements become static, which does not change the layout. The critic should not read either overlap as a site defect.",
   "For reference: the scroll-margin-top on #buy at 390 uses --hd-h(72)+s3, which gives 88px. The phone header is 65px, so #buy stops 23.4px below the header. It is not covered, so this is not a defect."
  ]
 },
 {
  "probe": "regress",
  "pass": true,
  "checks": [
   {
    "name": "about_1440",
    "pass": true,
    "evidence": "기준 mtime 08:40:22, 크기 1440x5428→1440x5428, 차이 px r2→r3 495238, r2→재촬영 495911, r3→재촬영 13035, A/B(c2adf08→87106d8) 0. 분류 b: 브랜드 영상 프레임(y3433-4000). 재촬영에서 값이 바뀌었고, 영상을 숨긴 A/B 에서는 0"
   },
   {
    "name": "about_390",
    "pass": true,
    "evidence": "기준 08:41:26, 390x6491 동일, r2→r3 1968, r2→재 60126, r3→재 59788, A/B 0. 분류 b: 영상 프레임(y4605-4802)과 글자 안티에일리어싱"
   },
   {
    "name": "b2b_1440",
    "pass": true,
    "evidence": "기준 08:40:35, 1440x4910 동일, r2→r3 0, r2→재 0, r3→재 0, A/B 0. 차이 없음"
   },
   {
    "name": "b2b_390",
    "pass": true,
    "evidence": "기준 08:41:39, 390x6280 동일, r2→r3 0, r2→재 0, r3→재 0, A/B 0. 차이 없음"
   },
   {
    "name": "faq_1440",
    "pass": true,
    "evidence": "기준 08:40:25, 1440x8031 동일, r2→r3 0, r2→재 10, r3→재 10, A/B 0. 차이 없음(재촬영에서만 둥근 모서리 10px, b)"
   },
   {
    "name": "faq_390",
    "pass": true,
    "evidence": "기준 08:41:30, 390x7626 동일, r2→r3 0, r2→재 2, r3→재 2, A/B 0. 차이 없음(재촬영에서만 2px, b)"
   },
   {
    "name": "guidebook_index_1440",
    "pass": true,
    "evidence": "기준 08:39:57, 1440x5045 동일, r2→r3 0, r2→재 0, r3→재 0, A/B 0. 차이 없음"
   },
   {
    "name": "guidebook_index_390",
    "pass": true,
    "evidence": "기준 08:41:03, 390x6495 동일, r2→r3 10, r2→재 0, r3→재 10, A/B 0. 분류 b: 朱 점 안티에일리어싱 8px+2px. 재촬영하니 r2 와 같아짐"
   },
   {
    "name": "index_nopop_1440",
    "pass": true,
    "evidence": "기준 08:39:50, 1440x4842 동일, r2→r3 107852, r2→재 92382, r3→재 38042, A/B 0. 분류 b: 영상 프레임 한 곳뿐(bbox y2457-2729 x740-1224). 대학 목록 #find(y1380-1922) crop 은 r2→r3 0, r2→재 0"
   },
   {
    "name": "index_nopop_390",
    "pass": true,
    "evidence": "기준 08:53:35(수리 뒤 재촬영본), 390x6623 동일, r2→r3 0, r2→재 0, r3→재 0, A/B 0. #find(y2151-3088) crop 0"
   },
   {
    "name": "index_popup_1440",
    "pass": true,
    "evidence": "기준 08:39:49, 1440x900 동일, r2→r3 356682, r2→재 0, r3→재 356682, A/B 0. 분류 b: 팝업 자동 넘김(r3 = 2/2, r2 = 1/2). 재촬영하니 r2 와 같아짐"
   },
   {
    "name": "index_popup_390",
    "pass": true,
    "evidence": "기준 08:53:34, 390x844 동일, r2→r3 0, r2→재 66456, r3→재 66456, A/B 0. r2→r3 차이 없음. 재촬영의 66456 은 자동 넘김(2/2)이라 b"
   },
   {
    "name": "interview_1440",
    "pass": true,
    "evidence": "기준 08:40:15, 1440x11837 동일, r2→r3 0, r2→재 36, r3→재 36, A/B 0. 차이 없음(재촬영에서만 둥근 모서리와 朱 점 36px, b)"
   },
   {
    "name": "interview_390",
    "pass": true,
    "evidence": "기준 08:41:20, 390x14396 동일, r2→r3 13, r2→재 0, r3→재 13, A/B 0. 분류 b: 안티에일리어싱 13px. 재촬영하니 r2 와 같아짐"
   },
   {
    "name": "interview_yonsei-hum_1440",
    "pass": true,
    "evidence": "기준 08:40:18, 1440x7956 동일, r2→r3 0, r2→재 0, r3→재 0, A/B 0. 차이 없음"
   },
   {
    "name": "interview_yonsei-hum_390",
    "pass": true,
    "evidence": "기준 08:41:23, 390x10986 동일, r2→r3 0, r2→재 0, r3→재 0, A/B 0. 차이 없음"
   },
   {
    "name": "join_1440",
    "pass": true,
    "evidence": "기준 08:40:37, 크기 1440x3198→1440x3167(31px 줄어듦). 위 정렬 AE 347256(첫 차이 y1119), 아래 정렬 AE 194865(마지막 차이 y1172, 새 판 좌표). 따라서 바뀐 곳은 새 판 y1119-1172 한 구간: 광고성 정보 수신 동의 행의 체크박스가 혼자 줄을 차지하다 글자 옆으로 올라옴. r3→재 0, A/B 위 347256/아래 194865(r2→r3 과 같은 수치). 분류 a(가입 약관 행)"
   },
   {
    "name": "join_390",
    "pass": true,
    "evidence": "기준 08:53:38(수리 뒤 재촬영본), 390x3684 동일, r2→r3 0, r2→재 0, r3→재 0. A/B 에서 3746→3684, 바뀐 곳은 새 판 y900-1142 한 구간(약관 5행의 체크박스가 글자 옆으로). 분류 a"
   },
   {
    "name": "lectures_1440",
    "pass": true,
    "evidence": "기준 08:40:11, 1440x6347 동일, r2→r3 30, r2→재 30, r3→재 0, rep1-3 에서도 r2 대비 30/30/30, A/B 0. 30px 는 페이지 둥근 모서리 네 곳(x14-18, x1421-1425)과 朱 점(x216-222 y139-145)의 안티에일리어싱. 같은 픽셀이 studio_1440 에서는 반대 방향으로 바뀌고 A/B 에서 수리 전과 후가 같음. 분류 b"
   },
   {
    "name": "lectures_390",
    "pass": true,
    "evidence": "기준 08:41:16, 390x8253 동일, r2→r3 0, r2→재 0, r3→재 0, A/B 0. 차이 없음"
   },
   {
    "name": "library_1440",
    "pass": true,
    "evidence": "기준 08:40:47, 1440x5416 동일, r2→r3 28968(띠 14개, x221-259), r2→재 0, r3→재 28968, A/B 0. 분류 b: lazy 표지 썸네일 14개가 로드됐는지 여부. 재촬영하니 r2 와 같아짐"
   },
   {
    "name": "library_390",
    "pass": true,
    "evidence": "기준 08:41:51, 390x8663 동일, r2→r3 0, r2→재 0, r3→재 0, A/B 0. 차이 없음"
   },
   {
    "name": "login_1440",
    "pass": true,
    "evidence": "기준 08:40:40, 1440x1433 동일, 전 비교 0, A/B 0. 차이 없음"
   },
   {
    "name": "login_390",
    "pass": true,
    "evidence": "기준 08:41:45, 390x1381 동일, 전 비교 0, A/B 0. 차이 없음"
   },
   {
    "name": "notice_1440",
    "pass": true,
    "evidence": "기준 08:40:28, 1440x1211 동일, r2→r3 0, r2→재 229, r3→재 229, A/B 0. 차이 없음(재촬영에서만 행사 띠 가격 글자 229px, b)"
   },
   {
    "name": "notice_390",
    "pass": true,
    "evidence": "기준 08:41:33, 390x1217 동일, 전 비교 0, A/B 0. 차이 없음"
   },
   {
    "name": "pastexam_1440",
    "pass": true,
    "evidence": "기준 08:40:53, 1440x1962 동일, r2→r3 0, r2→재 0, r3→재 0, A/B 0(앞선 A/B 실행에서는 둥근 모서리 18px). 차이 없음"
   },
   {
    "name": "pastexam_390",
    "pass": true,
    "evidence": "기준 08:41:57, 390x2309 동일, r2→r3 8, r2→재 8, rep3 8, A/B 0. 8px 는 朱 점(x20-25 y86-91)의 안티에일리어싱. 같은 점이 guidebook_index_390 에서는 재촬영 때 r2 값으로 돌아감. 분류 b"
   },
   {
    "name": "programs_guidebook_1440",
    "pass": true,
    "evidence": "기준 08:40:00, 1440x10609 동일, r2→r3 144170 = #books 링크 724px(y8457-8474, 담기→구매할 상품 고르기) + lazy 표본 면 143446(y1655-2105 등). r2→재 144170, rep2 는 r2 대비 724 만 남음, rep3 는 다른 표본 면이 로드돼 r3 대비 1579500. A/B 는 724(링크 문구)뿐. 분류 a + b"
   },
   {
    "name": "programs_guidebook_390",
    "pass": true,
    "evidence": "기준 08:41:06, 390x10603 동일, r2→r3 265835(lazy 표본 면 y2029-2809, y4119-4292 + 링크 724), r2→재 724(링크 문구만), r3→재 265111, A/B 724. 분류 a(#books 링크 문구) + b(lazy 표본 면)"
   },
   {
    "name": "programs_studio_1440",
    "pass": true,
    "evidence": "기준 08:40:04, 1440x8518 동일, r2→r3 0, r2→재 161320, r3→재 161320, A/B 0. 차이 없음(재촬영에서만 lazy 표본 면이 로드돼 161320, b)"
   },
   {
    "name": "programs_studio_390",
    "pass": true,
    "evidence": "기준 08:41:09, 390x12090 동일, r2→r3 0, r2→재 0, r3→재 0. A/B 2494 는 표본 이미지 축소 안티에일리어싱(수리 후 판끼리 다시 찍어도 2644 차이, b)"
   },
   {
    "name": "ranking_1440",
    "pass": true,
    "evidence": "기준 08:40:50, 1440x1856 동일, 전 비교 0, A/B 0"
   },
   {
    "name": "ranking_390",
    "pass": true,
    "evidence": "기준 08:41:54, 390x2123 동일, 전 비교 0, A/B 0"
   },
   {
    "name": "request_1440",
    "pass": true,
    "evidence": "기준 08:39:54, 1440x4345 동일, 전 비교 0, A/B 0"
   },
   {
    "name": "request_390",
    "pass": true,
    "evidence": "기준 08:40:59, 390x5229 동일, 전 비교 0, A/B 0"
   },
   {
    "name": "studio_1440",
    "pass": true,
    "evidence": "기준 08:40:08, 1440x11977 동일, r2→r3 10, r2→재 0, r3→재 10, A/B 0. 분류 b: 둥근 모서리 안티에일리어싱 10px. 재촬영하니 r2 와 같아짐"
   },
   {
    "name": "studio_390",
    "pass": true,
    "evidence": "기준 08:41:12, 390x17749 동일, 전 비교 0, A/B 0"
   },
   {
    "name": "support_1440",
    "pass": true,
    "evidence": "기준 08:40:31, 1440x3900 동일, 전 비교 0, A/B 0"
   },
   {
    "name": "support_390",
    "pass": true,
    "evidence": "기준 08:41:35, 390x4889 동일, 전 비교 0, A/B 0"
   },
   {
    "name": "terms_1440",
    "pass": true,
    "evidence": "기준 08:40:44, 1440x4659 동일, 전 비교 0, A/B 0"
   },
   {
    "name": "terms_390",
    "pass": true,
    "evidence": "기준 08:41:48, 390x6064 동일, 전 비교 0, A/B 0"
   },
   {
    "name": "tiles_1440_3col_same_as_prefix",
    "pass": true,
    "evidence": "A/B 계산값(tiles_ab.json): 수리 전과 후 모두 grid 336px x3, 열 수 3, 타일 12개. border-top 0 = 타일 1,2,3, padding-right 0 = 타일 3,6,9,12. 전과 후의 12개 타일 x/y/w/h/괘선/패딩이 완전히 같음(identical true). #tiles 요소 캡처 AE 0"
   },
   {
    "name": "tiles_390_1col_same_as_prefix",
    "pass": true,
    "evidence": "A/B: 수리 전과 후 모두 grid 350px, 열 수 1, border-top 0 = 타일 1 만, padding-right 0 = 12개 전부. identical true, #tiles 요소 캡처 AE 0"
   },
   {
    "name": "find_section_crop_r2_vs_r3",
    "pass": true,
    "evidence": "index_nopop_1440 #find crop 1440x542+0+1380: r2→r3 0, r2→재촬영 0. index_nopop_390 #find crop 390x937+0+2151: r2→r3 0, r2→재촬영 0. 1440 목록 3열, 첫 행 괘선 없음을 눈으로 확인"
   },
   {
    "name": "tiles_1024_768_intended_change_only",
    "pass": true,
    "evidence": "참고용(판정 범위 밖). 1024 와 768 모두 2열. 수리 전에는 border-top 0 이 1,2,3, padding-right 0 이 3,6,9,12 로 3열 규칙이 새어 들어와 있었고, 수리 후에는 border-top 0 이 1,2, padding-right 0 이 2,4,...,12. 차이가 나는 타일은 0-based 1,2,3,7,8,9 로 의도한 2열 수리"
   },
   {
    "name": "ab_prefix_vs_postfix_all_pages",
    "pass": true,
    "evidence": "수리가 바꾼 서빙 파일 4개(base.css, app.js, join.html, programs/guidebook.html)만 git show c2adf08 로 되돌려 같은 브라우저에서 두 판을 찍음(애니메이션 정지, 영상 숨김, lazy 이미지 eager+decode). 44쌍 가운데 AE 0 이 39쌍. 0 이 아닌 5쌍은 join_1440, join_390(a 약관 행), programs_guidebook_1440 724, programs_guidebook_390 724(a 링크 문구), programs_studio_390 2494(b, 수리 후 판끼리도 2644)"
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots_all/",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots_again/",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots_rep1/",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots_rep2/",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots_rep3/",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/ab_pre/",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/ab_post/",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/find_r2_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/find_r3_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/find_r2_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/shots/find_r3_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/pair/index_nopop_1440__band0_y2457-2729.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/pair/index_nopop_1440__find_r2_over_r3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/pair/index_popup_1440__band0_y198-701.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/pair/join_1440__ctx_y760-1320.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/pair/library_1440__ctx_y2170-2530.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/pair/programs_guidebook_1440__ctx_books_y8360.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/pair/programs_guidebook_390__band1_y2317-2809.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/pair/lectures_1440__marks_zoom.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff/pair/about_1440__band0_y3433-4000.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff_again_vs_r2/pair/index_popup_390__band0_y115-729.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff_again_vs_r2/pair/programs_studio_1440__band0_y1749-2029.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff_ab/",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff_ab/pair/join_390__ctx_y760-1280.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/diff_ab/pair/programs_studio_390__post_rep1_vs_rep2.png"
  ],
  "issues": [
   "회귀(c) 0건. 87106d8 가 바꾼 곳은 join 약관 행(1440 과 390)과 programs/guidebook #books 링크 문구 두 가지뿐이고, 1024/768 의 타일 2열 괘선 수리는 의도한 변화다.",
   "촬영 흔들림 3종(3회차 critic 에 알릴 것): shoot_r2 방식으로 찍은 사진에는 사이트 결함이 아닌 흔들림이 섞여 있다. (1) networkidle 대기가 8초 자동 넘김보다 길어질 때가 있어 홈 팝업이 1/2 또는 2/2 로 찍힌다(r3 index_popup_1440 = 2/2). (2) loading=lazy 인 표본 면과 자료실 표지가 로드되기도 하고 빈 판으로 찍히기도 한다(shots_all/programs_guidebook_390 의 y2029-2809 표본 면이 빈 판). (3) 브랜드 영상 프레임이 매번 다르다.",
   "판정 근거 참고: lectures_1440(30px)과 pastexam_390(8px)은 5번 다시 찍어도 r2 대비 차이가 사라지지 않아 '재촬영하면 사라지거나 바뀐다'는 기준을 그대로 채우지는 못했다. 그래도 b 로 분류한 이유는 두 가지다. 해당 픽셀은 페이지 둥근 모서리와 朱 점의 안티에일리어싱이고 같은 픽셀이 studio_1440, guidebook_index_390 에서는 반대 방향으로 바뀐다. 또 같은 실행에서 찍은 A/B 에서 수리 전과 후가 AE 0 이다.",
   "기존 이상(이번 수리와 무관, r2 에도 있음): library_1440 목록의 「열람하기」 단추 글자가 48px 상자 안에서 세로 가운데가 아니라 위쪽에 붙어 있다.",
   "프로브 기법 메모: route.fulfill 로 되돌린 HTML 문서는 Chrome Local Network Access 가 8799 모킹 API 호출을 막아 행사 띠와 가격이 빠진다. 그래서 A/B 는 수리 전과 후 모두 --disable-features=LocalNetworkAccessChecks 로 띄웠다. 이 플래그 없이 돌린 1회차 A/B 결과는 diff_ab_run1_lna_blocked 에 폐기본으로 남아 있다."
  ]
 }
]
```

첨부 이미지: tiles_1024.png, tiles_768.png (2열 구간 괘선), popup_reduce_1440.png (reduce 모드 팝업 하단바), join_390.png (가입 약관 행), books_390.png (#books 링크).

## 요구
프로브 요약을 그대로 믿지 말고 리포 코드(base.css, app.js, join.html, programs/guidebook.html, _tools/program_guidebook_v2.html 등)와 `git show 87106d8` 를 직접 읽어 확인한다.

(a) 4건 각각 해결 여부와 근거(파일:행). 4건 = motion(모션 감소 정지 단추), tiles(대학 목록 2열 구간 괘선 리셋), join(가입 약관 행 줄바꿈), books(가이드북 #books 링크 문구). 각 건마다 「해결」 또는 「미해결」 또는 「부분 해결」 한 단어로 먼저 판정하고 근거를 붙인다.

(b) 수리가 만든 새 회귀 후보. 최소한 아래를 확인한다.
- 다른 폭(특히 421~600px 구간의 2열과 1열 리셋 충돌, 프로브가 FAIL 로 보고함)
- 다른 면(대학 목록 .tiles 를 쓰는 다른 페이지, join 외 .check 를 쓰는 폼, app.js 팝업 로직을 쓰는 다른 페이지)
- 소수 폭 1100~1101px 틈 (min-width:1101px 과 max-width:1100px 사이)
- 검색 필터로 타일이 숨겨질 때 nth-child 괘선
- 토글 단추 라벨과 aria-pressed 동시 변경의 접근성 의미 (라벨이 「재생」과 「정지」로 바뀌면서 aria-pressed 도 바뀌면 스크린리더가 상태를 이중으로 또는 반대로 읽는지)
각 후보마다 「신규 회귀」인지 「기존 결함」인지 구분하고, 릴리스를 막아야 하는지 적는다.

(c) 릴리스 판정. 라이브(44aea38)보다 나빠지는지를 기준으로 판단하되, 판정 근거를 1~2문장으로 적는다.

## 출력 형식
- 한국어, 500단어 이내.
- 절 제목은 (a), (b), (c).
- 마지막 줄은 정확히 「RELEASE: YES」 또는 「RELEASE: NO」 둘 중 하나만 적는다(따옴표와 괄호 없이).
