# hyunhak.com 릴리스 전 외부 검토 4회차 (Codex X1)

## 역할

너는 hyunhak.com 릴리스 전 외부 검토자다. 읽기 전용이다. 어떤 파일도 만들거나 고치지 않는다. 저장소는 /Users/gregory/Workspace/hyunhak-site 이다.

## 대상

`git show c342aff` (critic 3차 P1 대학 목록 열 수와 괘선 리셋 재구성, P2 5건). 필요하면 `git show c342aff -- assets/base.css`, `git show c342aff~1:assets/base.css`, `git diff c342aff~1 c342aff --stat` 로 전후를 비교한다.

## 배경

- critic 3차 판정: /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/critic_r3_20260923.md 의 §4, §5
- 너의 3차 회신: /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/codex_x1_20260923.md

먼저 3차에 네가 지적한 세 가지가 이번에 어떻게 되었는지 확인한다.
1. 421~600px 결함(2열인데 1열 리셋이 걸리던 것)
2. 1100~1101px 소수 폭 틈
3. 토글 단추 라벨과 aria-pressed 의미

## 이번 실측 프로브 요약 (Playwright 실측, 그대로 붙임)

```json
[
 {
  "probe": "tiles",
  "pass": true,
  "checks": [
   {
    "name": "0. 서빙 판 확인",
    "pass": true,
    "evidence": "HEAD c342aff, 서빙 base.css sha256/16 = 2612bbf1fab3c573 = git show HEAD:assets/base.css. index.html, assets/ 추적 파일 수정 없음(git status). 12 타일(LIMIT 12), 팝업은 24폭 전부 had=true, Escape 로 닫힘(closedByEsc=true, 강제 제거 0)."
   },
   {
    "name": "1. 정수 폭 24개 전수",
    "pass": true,
    "evidence": "320~600(13폭) cols=1, bt8=0,1,1,1,1,1,1,1, pr8 전부 0. 601~1100(7폭: 601,640,768,820,900,1024,1100) cols=2, bt8=0,0,1,1,1,1,1,1, pr8=40,0,40,0,40,0,40,0, minGap=40. 1101~1920(4폭) cols=3, bt8=0,0,0,1,1,1,1,1, pr8=40,40,0,40,40,0,40,40, minGap=40. 24폭 전부 rowsConsistent=true(행 내 윗선 같음, 이음새 0), .n 말줄임 0, scrollWidth=clientWidth(예 320/320, 1920/1920), 뷰포트 넘는 요소 0, 화살표가 내용 상자 밖 0. 421~600 띠(421,428,430,480,540,599,600) 전부 1열로 3회차 결함 해소."
   },
   {
    "name": "2. 소수 폭(--force-device-scale-factor 창 방식)",
    "pass": true,
    "evidence": "1100x1.125: vv=1100.444, mq notMax1100=true, gtc 328.139px x3, bt8=0,0,0,0.8889.., pr8=40,40,0,.., minGap=40. 1100x1.333: vv=1100.525, 3열, minGap=39.995. 600x1.333: vv=600.15, max375em=false, max1100=true, 2열(276.069px x2), bt8=0,0,0.7502.., pr8=40,0,.., minGap=39.994. 601x1.25: vv=601.6, 2열, minGap=40, scrollW 602/clientW 602. 1101x1.5: vv=1101.333, 3열, minGap=40. 5건 모두 첫 행만 0, 행 윗선 같음, 말줄임 0, 가로 넘침 0."
   },
   {
    "name": "3. 1440 확대 200/250/300%",
    "pass": true,
    "evidence": "720@dpr2: 2열(331.203px x2), btAll=0,0,1x10, pr 40/0 교대, minGap=40, scrollW 720/720. 576@dpr2.5: 1열(529.938px), btAll=0,1x11, pr 전부 0. 480@dpr3: 1열(440px), btAll=0,1x11, pr 전부 0. 말줄임 0, 가로 넘침 0."
   },
   {
    "name": "4. 검색 필터 서/없는대학",
    "pass": true,
    "evidence": "\"서\" 5건(건국대학교(서울), 서울과학기술대, 서울대, 서울시립대, 서울여자대). 1440: 3열, 행 bts [0,0,0]/[1,1], pr8=40,40,0,40,40, minGap=40. 1024: 2열, 행 bts [0,0]/[1,1]/[1], minGap=40. 390: 1열, bts 0,1,1,1,1. 세 폭 모두 .tiles 윗선 1px 있음, 첫 행 윗선 0이라 겹선 없음, 2행부터 1px 로 빠짐 없음. \"없는대학\" 0건: p.empty 너비 1008=.tiles 1008(1440), 914.094=914.094(1024), 350=350(390), grid-column 1 / -1, 가로 넘침 0."
   },
   {
    "name": "5. 1열 1번 윗선 0, 2번부터 1px",
    "pass": true,
    "evidence": "320~600 13폭 전부 btAll=[0,1,1,1,1,1,1,1,1,1,1,1](12타일), 확대 250%/300% 동일, 필터 390 \"서\" 0,1,1,1,1. 2열 블록 nth-child(-n+2) 리셋을 1열 블록 nth-child(2) 가 되돌림 확인."
   },
   {
    "name": "6. 스크린샷 9장(#find element, unstick 적용)",
    "pass": true,
    "evidence": "tiles_390/430/600/601/1024/1440/1100frac/empty_1440/filter_1024.png 생성(12:15~12:18 이번 실행 mtime). 육안: 600 1열 12행, 601 2열 6행, 1100frac 3열 4행, 1440 3열 4행, 괘선 끊김이나 겹침 없음."
   },
   {
    "name": "음성 경로(판정기 유효성)",
    "pass": true,
    "evidence": "수리 전 base.css(c342aff~1) route 서빙 시 같은 판정기가 FAIL: 480/540/600 = 2열인데 bt8=0,1,1,.. pr8 전부 0, minGap=0, firstRow0=false. 1100x1.125(vv 1100.444) = 3열인데 bt8 전부 0.8889, pr8 전부 40(리셋 없음). HEAD 에서는 같은 조건 전부 OK."
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/tiles_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/tiles_430.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/tiles_600.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/tiles_601.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/tiles_1024.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/tiles_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/tiles_1100frac.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/tiles_empty_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/tiles_filter_1024.png"
  ],
  "issues": [
   "관찰(판정 밖, 결함 후보 P3): 검색 0건 상태에서 .tiles 실선 1px 윗선과 아랫선 바로 안쪽에 p.empty 의 일반 규칙(base.css 543행 :where(body.v2) .empty{border:1px dashed var(--hair);border-radius:var(--r-md)}) 점선 둥근 테두리가 붙는다. 1440 실측 tilesTop 958.39, emptyTop 959.39(간격 0), 아래도 1041.39/1042.39. 실선과 점선이 겹선으로 보인다(tiles_empty_1440.png). 368행 .tiles .empty 는 grid-column 과 padding-block 만 덮고 border 는 덮지 않는다.",
   "관찰(판정 밖): 필터 부분 결과에서 열 수로 나누어떨어지지 않으면 마지막 행 윗선이 타일 있는 칸까지만 그어진다(타일별 border-top 구조). 1440 \"서\" 5건: 2행 선이 1008 중 672px, 오른쪽 336px 빈칸. 1024: 3행 선이 914.094 중 457.047px. 기본 12타일은 1, 2, 3열 모두 나누어떨어져 해당 없음. 3회차 이전부터 같은 구조.",
   "참고: 소수 DPR 에서 타일 윗선 계산값이 1 기기 픽셀(0.8889, 0.7502, 0.8, 0.6667 CSS px)로 스냅된다. 행 안에서 전부 같아 결함 아님.",
   "참고: 601x1.25 창은 vv=601.6 이 나왔다(600.8 아님). 600 초과 601 미만 구간은 600x1.333 = vv 600.15(2열)로 확인."
  ]
 },
 {
  "probe": "p2set",
  "pass": false,
  "checks": [
   {
    "name": "1a 팝업 측면 카드 네 모서리와 활성 카드 하단바 접합 (1440 정지, 390 측면 숨김)",
    "pass": true,
    "evidence": "1440 슬롯 2장. 측면(data-side=1) .pop border-radius TL/TR/BR/BL = 4/4/4/4px(배경 rgb(235,228,212), .pfr opacity .55). 활성 .pop = 4/4/0/0, 하단바 .pbar = 0/0/4/4. 하단바 top - 카드 bottom = 0, 좌 어긋남 0, 우 어긋남 0 (카드 500~940 x 205.56~636.44, 바 500~940 x 636.44~694.44). DSF3 확대 캡처에서 측면 카드 아래 모서리 둥긂 확인. 390: 측면 슬롯 opacity 0, pointer-events none, 뷰포트 안 0px, 활성 카드와 바 접합 gap 0 dL 0 dR 0."
   },
   {
    "name": "1b 넘김 순간 모서리 튐 (0/150/400ms 동결 캡처 + rAF 실시간 표본)",
    "pass": true,
    "evidence": "넘김은 → 키(go(cur+1) 같은 경로)로 일으키고 .pdim 안 transform 전이 2개(dur 500ms)를 currentTime 0/150/400 에 멈춰 찍음. 세 시점 모두 새 활성 카드 4/4/0/0 + 하단바 0/0/4/4 + gap 0 dL 0 dR 0, 나가는 카드 4/4/4/4 에 바 없음. 새 활성 슬롯 transform: 0ms matrix(0.9,..,464,0), 150ms (0.986,..,64.39), 400ms (0.9995,..,2.38). rAF 표본 44프레임(약 700ms): 규칙 위반 프레임 0, 슬롯마다 radius 값이 첫 프레임(t=2.4ms)부터 끝까지 1개로 불변, 하단바 gap 최대 0, 좌우 어긋남 최대 0."
   },
   {
    "name": "1c 하단바 ←/→ 클릭으로 넘김 (→ 클릭 후 캡처 전제)",
    "pass": false,
    "evidence": "실제 마우스 클릭, 1440과 390 동일: → 클릭 뒤 cur 1 그대로, MutationObserver data-on 순서 = 0 해제, 1 부여, 0 부여, 1 해제(한 클릭 안에서 넘겼다 되돌아옴). ← 클릭도 같음. 단추 표기는 정지→재생으로 바뀜(자동 넘김만 멈춤). 같은 페이지에서 ArrowRight 키 = cur 2(변화 2건), 1440 측면 카드 클릭 = 정상 넘김. 원인: app.js:537 슬롯 click 리스너. 클릭 시점 이벤트 경로에 옛 활성 슬롯이 들어 있고, go(cur+1) 뒤 그 슬롯이 data-side 가 되어 버블 단계에서 go(i) 로 되돌린다. e76030a 부터 같은 코드이며 c342aff 는 app.js 를 건드리지 않음."
   },
   {
    "name": "2 캡션 #q2h 아래와 #tiles 윗선 간격 16px(s3)",
    "pass": true,
    "evidence": "#q2h margin-bottom 16px, line-height 28px. 캡션 박스 bottom → #tiles 윗선(1px solid) = 16 / 16 / 16 (1440/1024/390). 글자(Range) bottom → 윗선 = 21 / 21 / 21. 위쪽 리듬: 검색창 bottom → 캡션 박스 top = 0, → 캡션 글자 top = 4 (세 폭 동일). 라벨 bottom → 검색창 top = 5 (1440 179.39→184.39, 1024 174.67→179.67, 390 190.31→195.31)."
   },
   {
    "name": "3a 푸터 .ft-legal 링크 가운데 정렬 (v2_shell 5면: index, faq, support, terms, programs/guidebook × 1440, 390)",
    "pass": true,
    "evidence": "10개 조합 모두 동일. 링크 6개 justify-content center, 높이 48 전부. 「결제」 상자 48, 글자 20.36, 왼쪽 13.81 오른쪽 13.83(차 0.02). 고객센터 48/40.72 3.64/3.64, 환불 규정 48/43.55 2.22/2.23, 이용약관 48/40.72 3.64/3.64, 사업자 정보 53.72, 개인정보처리방침 81.44 (글자=상자). 링크별 |좌-우| 최대 0.02, 링크 글자 줄바꿈 0(전부 1줄). 1440 = 1행, 390 = 2행(5개 + 개인정보처리방침), 두 행 모두 nav 왼쪽 끝에서 0px 시작, 행 사이 간격 0(48 상자 연속). 기준선 87106d8 판 index.html 을 route 로 서빙해 같은 방식 측정: 결제 좌 0 우 27.64(1440, 390)."
   },
   {
    "name": "3b 푸터 join, login",
    "pass": false,
    "evidence": ".ft-legal 존재(join, login 둘 다, login 은 body.ft-compact). 인라인 스타일이 옛 줄 `.ft-legal a{font-size:var(--t-xs)}` 이라 justify-content normal. 링크 4개(결제, 환불 규정, 이용약관, 개인정보처리방침)로 v2_shell 판 6개와 다름. 1440과 390 모두 「결제」 48/20.36 좌 0 우 27.64, 환불 규정 우 4.45, 이용약관 우 7.28. 높이 48 은 충족. c342aff 의 join.html 변경은 .view 한 줄뿐이라 빌드가 이 두 면 푸터를 다시 쓰지 않음."
   },
   {
    "name": "4 가입 약관 행 「전문」 세로 정렬, 같은 줄, 클릭, 48x48",
    "pass": true,
    "evidence": ".view align-self flex-start. .view 중심 - span 첫 줄 중심 = 6.5 (9건 전부: ck-terms, ck-priv, ck-mkt × 320/390/1440). 3차 값 대비: ck-mkt 320 +50 → 6.5, 390 +30.5 → 6.5, 1440 +20.75 → 6.5; ck-priv 320/390 +20.75 → 6.5; 한 줄 행 ck-terms +11 → 6.5(나빠지지 않음). span 줄 수 ck-mkt 320 6줄, 390 4줄, 1440 3줄. 체크박스와 첫 줄 같은 줄 15/15 행(5행 × 3폭), label flex-wrap nowrap. 글자 클릭 켬/끔 5/5 행 × 3폭. .view 48x48 9/9. .view 클릭(이동 차단) 체크 상태 변화 0/3 × 3폭. 문서 가로 넘침 0."
   },
   {
    "name": "5 검색 0건 p.empty 안 링크 탭 높이와 줄바꿈",
    "pass": true,
    "evidence": "검색어 zzqx. 링크 「가이드북 전체 목록에서 확인」 141.22x48 (1440/1024/390/320 동일), inline-flex, word-break keep-all, 링크 안 줄바꿈 0(1줄). p.empty 폭 = #tiles 폭 1008/914.09/350/280 (grid-column 1/-1). 문단은 1440/1024 에서 1줄, 390/320 에서 2줄이며 문장 경계에서 끊김(「일치하는 대학이 없습니다.」/「가이드북 전체 목록에서 확인」). 가로 넘침 0."
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/popup_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/popup_1440_side_corner_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/popup_1440_join_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/popup_turn_0.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/popup_turn_150.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/popup_turn_400.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/popup_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/footer_index_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/footer_index_1440_boxes.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/footer_index_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/footer_index_390_boxes.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/join_320.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/join_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/p2set_empty_320.png"
  ],
  "issues": [
   "결함(c342aff 이전부터, 범위 밖에서 발견): 홈 팝업 하단바 ← / → 단추를 클릭해도 넘어가지 않는다. 1440과 390 모두 해당. 한 번 클릭하면 data-on 이 0→1→0 으로 되돌아오고 자동 넘김만 멈춘다(정지→재생). 원인은 assets/app.js:537 `slots.forEach((s, i) => s.addEventListener(\"click\", (e) => { if (s.hasAttribute(\"data-side\")) { e.preventDefault(); go(i); } }))`. 하단바는 클릭 시점에 옛 활성 슬롯 안에 있으므로 버블이 그 슬롯에 닿는데, 그때는 이미 data-side 가 붙어 있어 go(i) 가 넘김을 취소한다. e76030a 부터 같은 코드. 수리 예: 조건에 `&& !e.target.closest(\".pbar\")` 추가, 또는 prev/next 핸들러에서 stopPropagation. 폰에서는 측면 카드가 숨겨지므로 스와이프와 이 단추가 넘김 수단의 전부다. 키보드 ←/→ 와 1440 측면 카드 클릭은 정상.",
   "결함(잔존): join.html 과 login.html 의 푸터 .ft-legal 은 v2_shell 이 빌드하지 않은 옛 판이다(링크 4개, 인라인 스타일에 justify-content:center 없음). 그래서 「결제」 좌 0 우 27.64px 가 1440과 390 모두에 남았다. 2차 critic P2 「가입과 로그인만 옛 푸터」와 같은 뿌리이며, 이번 P2 수리가 이 두 면에는 닿지 않았다.",
   "관찰: 가운데 정렬의 부작용으로 행 첫 링크 「고객센터」(상자 48, 글자 40.72)의 글자가 열 왼쪽 끝에서 3.64px 들어간다. 390 둘째 행 「개인정보처리방침」은 글자가 곧 상자라 0px 에서 시작하므로 두 행의 글자 왼쪽 끝이 3.64px 어긋난다. 이웃 링크 글자 사이 간격은 19.64/29.81/32.05/21.87/19.64px 로 「결제」 양옆이 넓다. 결제 빈칸 자체는 13.81/13.83 으로 기대대로 나뉘었다.",
   "관찰: 활성 카드와 하단바 접합부는 틈 0, 좌우 어긋남 0 이다. 다만 .pop border-bottom 1px rgba(49,46,46,.55) 위에 .pbar border-top 1px rgba(49,46,46,.24) 가 겹쳐 2px 이중선이 된다. DSF3 픽셀에서 짙은 줄 3행 + 옅은 줄 3행. c342aff 이전부터 있던 것이다.",
   "관찰: 넘길 때 배경(--mat), .pfr .55, 모서리, 하단바 재부착은 0ms 에 한꺼번에 바뀌고 transform 만 500ms 동안 전이한다. 그래서 popup_turn_0 에서는 가운데 카드가 이미 흐려져 있고 오른쪽 카드는 측면 크기인 채 바를 달고 있다. 모서리가 중간값으로 튀는 프레임은 0이다.",
   "관찰: 요청은 → 클릭 뒤 0/150/400ms 캡처였으나 클릭으로는 넘김이 일어나지 않는다(첫 번째 결함). 그래서 같은 go(cur+1) 경로인 → 키로 넘기고, 전이를 currentTime 으로 멈춰 찍었다. 실시간 전개는 rAF 44프레임으로 따로 쟀다.",
   "관찰: 캡션 위아래 리듬은 비대칭이다. 검색창→캡션은 박스 0 / 글자 4px, 캡션→목록 윗선은 박스 16 / 글자 21px 이다. 캡션이 검색 입력의 도움말로 묶여 읽히는 배치라 결함으로 보지 않는다.",
   "관찰(도구): 전 구획을 한 번에 돌리는 all 실행에서 browser.close() 가 돌아오지 않은 일이 1회 있었다. 자료는 구획마다 저장된 뒤였다. 스크립트에 5초 상한과 process.exit 를 넣은 뒤 all 재실행이 1분 58초에 exit 0 으로 끝났고 수치는 같았다. 원자료는 /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/p2set.json 이다."
  ]
 },
 {
  "probe": "regress",
  "pass": true,
  "checks": [
   {
    "name": "준비: route 대상과 서빙 판",
    "pass": true,
    "evidence": "route 대상 72개(git diff --name-only 87106d8 c342aff 에서 _design/ 과 _tools/ 제외) = assets/base.css 1 + html 71. 본 실행에서 pre 로 route 된 응답 90건. 작업 트리의 서빙 파일은 c342aff 와 같음(git diff --stat c342aff 0줄). 대조: 같은 c342aff 내용을 route 로 서빙한 postr 와 서버로 서빙한 post 는 programs_guidebook 1440/390 에서 2회 모두 AE=0 → route 서빙 자체는 픽셀 차이를 만들지 않음"
   },
   {
    "name": "캡처 완결",
    "pass": true,
    "evidence": "ab_pre 44장, ab_post 44장(20면 x 1440/390 = 40, 팝업 2, #tiles 요소 2), FAIL 0. 팝업은 두 판 모두 cur=1(1440, 390)"
   },
   {
    "name": "about_1440",
    "pass": true,
    "evidence": "크기 1440x5428 동일, AE 1225, 띠 1개(y4637-4648 x216-523) = a 푸터 법적 고지 줄"
   },
   {
    "name": "about_390",
    "pass": true,
    "evidence": "크기 390x6491 동일, AE 1225, 띠 1개(y5489-5500) = a 푸터"
   },
   {
    "name": "b2b_1440",
    "pass": true,
    "evidence": "크기 1440x4910 동일, AE 1225, 띠 1개(y4120-4131) = a 푸터"
   },
   {
    "name": "b2b_390",
    "pass": true,
    "evidence": "크기 390x6280 동일, AE 1224, 띠 1개(y5278-5289) = a 푸터"
   },
   {
    "name": "faq_1440",
    "pass": true,
    "evidence": "크기 1440x8031 동일, AE 1225, 띠 1개(y7241-7252) = a 푸터"
   },
   {
    "name": "faq_390",
    "pass": true,
    "evidence": "크기 390x7626 동일, AE 1225, 띠 1개(y6624-6635) = a 푸터"
   },
   {
    "name": "guidebook_index_1440",
    "pass": true,
    "evidence": "크기 1440x5045 동일, AE 1244, 띠 4개: y4254-4265 1225px = a 푸터. y14-19(10px, 페이지 둥근 모서리), y139-145(8px, 朱 점), y507-508(1px) = b: post 끼리 재촬영 비교(post vs post_rep1, AE 19)에 같은 좌표 띠 3개가 나옴. 재촬영 A/B = 1225(푸터만)"
   },
   {
    "name": "guidebook_index_390",
    "pass": true,
    "evidence": "크기 390x6495 동일, AE 1225, 띠 1개(y5494-5505) = a 푸터. 재촬영 A/B 1235 가운데 10px(y86-92, y469-472)은 pre 끼리 재촬영 비교(pre vs pre_rep1, AE 10)에 같은 좌표로 나옴 = b"
   },
   {
    "name": "index_nopop_1440 (홈)",
    "pass": true,
    "evidence": "크기 1440x4842 → 4858(+16). 이동 비교: 캡션(.help) 아래 끝 y1640 을 경계로 윗부분 AE 0, 아랫부분(post 를 16px 위로 잘라 비교) AE 1225 = 띠 1개 y4052-4063 = a 푸터. 캡션 margin-bottom 0px → 16px, #tiles 윗변 1640 → 1656. 그 밖의 차이 0"
   },
   {
    "name": "index_nopop_390 (홈)",
    "pass": true,
    "evidence": "크기 390x6623 → 6639(+16). 경계 y2422 위 AE 0, 아래(16px 이동 뒤) AE 1225 = 띠 1개 y5621-5632 = a 푸터. 대학 목록은 1열 그대로라 캡션 이동 말고는 차이 0"
   },
   {
    "name": "index_popup_1440",
    "pass": true,
    "evidence": "크기 1440x900 동일, AE 12, 띠 1개 y647-650 x986-1382 = a: 측면 카드 아래 두 모서리가 각진 모서리에서 둥근 모서리로 바뀜(4배 확대로 확인). 재촬영 A/B 도 12 로 같음"
   },
   {
    "name": "index_popup_390",
    "pass": true,
    "evidence": "크기 390x844, AE 0(폰 폭에서는 측면 카드 숨김). 재촬영 A/B 0"
   },
   {
    "name": "index_tiles_1440 (#tiles 요소)",
    "pass": true,
    "evidence": "크기 1008x195, AE 0. 재촬영 A/B 0"
   },
   {
    "name": "index_tiles_390 (#tiles 요소)",
    "pass": true,
    "evidence": "크기 350x579, AE 0. 재촬영 A/B 0"
   },
   {
    "name": "interview_1440",
    "pass": true,
    "evidence": "크기 1440x11837 동일, AE 1225, 띠 1개(y11047-11058) = a 푸터"
   },
   {
    "name": "interview_390",
    "pass": true,
    "evidence": "크기 390x14396 동일, AE 1224, 띠 1개(y13394-13405) = a 푸터"
   },
   {
    "name": "interview_yonsei-hum_1440",
    "pass": true,
    "evidence": "크기 1440x7956 동일, AE 1225, 띠 1개(y7165-7176) = a 푸터"
   },
   {
    "name": "interview_yonsei-hum_390",
    "pass": true,
    "evidence": "크기 390x10986 동일, AE 1225, 띠 1개(y9984-9995) = a 푸터"
   },
   {
    "name": "join_1440",
    "pass": true,
    "evidence": "크기 1440x3167 동일, AE 857, 띠 3개 모두 x1005-1027(「전문」 글자) = a. 행 rect 는 두 판이 같고 .view 윗변만 891→886, 965→960, 1123→1108(-5/-5/-15px)로 제목 줄 쪽으로 올라감. 푸터는 compact 셸이라 바뀌지 않아 차이 0"
   },
   {
    "name": "join_390",
    "pass": true,
    "evidence": "크기 390x3684 동일, AE 751, 띠 3개 모두 x335-357 = a 「전문」. .view 윗변 819→815, 903→889, 1080→1056(-4/-14/-24px), 행 rect 같음. 푸터 차이 0"
   },
   {
    "name": "lectures_1440",
    "pass": true,
    "evidence": "크기 1440x6347 동일, AE 1225, 띠 1개(y5556-5567) = a 푸터"
   },
   {
    "name": "lectures_390",
    "pass": true,
    "evidence": "크기 390x8253 동일, AE 1225, 띠 1개(y7252-7263) = a 푸터"
   },
   {
    "name": "library_1440",
    "pass": true,
    "evidence": "크기 1440x5416 동일, AE 1225, 띠 1개(y4625-4636) = a 푸터"
   },
   {
    "name": "library_390",
    "pass": true,
    "evidence": "크기 390x8663 동일, AE 1225, 띠 1개(y7661-7672) = a 푸터"
   },
   {
    "name": "login_1440",
    "pass": true,
    "evidence": "크기 1440x1433 동일, AE 0. login.html 은 route 대상이 아님(compact 셸이라 빌드가 건드리지 않음)"
   },
   {
    "name": "login_390",
    "pass": true,
    "evidence": "크기 390x1381 동일, AE 0"
   },
   {
    "name": "notice_1440",
    "pass": true,
    "evidence": "크기 1440x1211 동일, AE 1225, 띠 1개(y1094-1105 x216-491) = a 푸터"
   },
   {
    "name": "notice_390",
    "pass": true,
    "evidence": "크기 390x1217 동일, AE 1225, 띠 1개(y993-1004) = a 푸터"
   },
   {
    "name": "pastexam_1440",
    "pass": true,
    "evidence": "크기 1440x1962 동일, AE 1225, 띠 1개(y1171-1182) = a 푸터"
   },
   {
    "name": "pastexam_390",
    "pass": true,
    "evidence": "크기 390x2309 동일, AE 1225, 띠 1개(y1308-1319) = a 푸터"
   },
   {
    "name": "programs_guidebook_1440",
    "pass": true,
    "evidence": "크기 1440x10825 동일, AE 1505, 띠 8개: y10035-10046 1224px = a 푸터. y312/458/508/575(라디오 단추 안티에일리어싱, 합계 62px)는 post vs post_rep2 에, y3058/3140/3338(표본 면 축소, 합계 219px)은 pre vs pre_rep2 에 같은 좌표로 나옴 = b. 재촬영 A/B 2회(rep1, rep3) 모두 1224(푸터만)"
   },
   {
    "name": "programs_guidebook_390",
    "pass": true,
    "evidence": "크기 390x11187 동일, AE 1274, 띠 4개: y10185-10196 1224px = a 푸터. y428-441, y495-508, y553-576(라디오 단추 테두리 안티에일리어싱 50px, 명도 13 차이)은 pre_rep2 vs pre_rep3(같은 판, AE 50)에 같은 좌표로 나옴 = b. rep3 A/B = 1224(푸터만)"
   },
   {
    "name": "programs_studio_1440",
    "pass": true,
    "evidence": "크기 1440x8518 동일, AE 3851, 띠 6개: y7728-7739 1224px = a 푸터. y2142-2501 사이 5개(합계 2627px, 표본 이미지 축소)는 post vs post_rep1(같은 판, AE 2637)에 같은 좌표로 나옴 = b. 재촬영 A/B 1234 = 푸터 1224 + 라디오 10px(post vs post_rep1 에 같은 좌표로 나옴 = b)"
   },
   {
    "name": "programs_studio_390",
    "pass": true,
    "evidence": "크기 390x12793 동일, AE 1374, 띠 2개: y11792-11803 1224px = a 푸터. y2313-2374 150px(표본 이미지)는 post vs post_rep1(AE 150)에 같은 좌표로 나옴 = b. 재촬영 A/B 1224"
   },
   {
    "name": "ranking_1440",
    "pass": true,
    "evidence": "크기 1440x1856 동일, AE 1223, 띠 1개(y1065-1076) = a 푸터"
   },
   {
    "name": "ranking_390",
    "pass": true,
    "evidence": "크기 390x2123 동일, AE 1223, 띠 1개(y1121-1132) = a 푸터"
   },
   {
    "name": "request_1440",
    "pass": true,
    "evidence": "크기 1440x4345 동일, AE 1225, 띠 1개(y3555-3566) = a 푸터"
   },
   {
    "name": "request_390",
    "pass": true,
    "evidence": "크기 390x5229 동일, AE 1225, 띠 1개(y4228-4239) = a 푸터"
   },
   {
    "name": "studio_1440",
    "pass": true,
    "evidence": "크기 1440x11977 동일, AE 1225, 띠 1개(y11187-11198) = a 푸터"
   },
   {
    "name": "studio_390",
    "pass": true,
    "evidence": "크기 390x17749 동일, 전체 캡처 AE 0 이지만 이 값은 근거로 쓸 수 없음. 문서 높이가 16384px 을 넘어서 그 아래가 앞쪽 내용을 되풀이한 판으로 찍혔고, 푸터 y16730 자리에 본문이 찍힘. 꼬리 보조 캡처(probe_regress_tail.mjs): footer 요소 AE 1225(띠 y75-86), 스크롤 16384 창 AE 1225(띠 y364-375 = 문서 y16748-16759 = 법적 고지 줄), 스크롤 16905 창 AE 0 → a 만"
   },
   {
    "name": "support_1440",
    "pass": true,
    "evidence": "크기 1440x3900 동일, AE 1225, 띠 1개(y3110-3121) = a 푸터. 재촬영 A/B 1225"
   },
   {
    "name": "support_390",
    "pass": true,
    "evidence": "크기 390x4889 동일, AE 1233, 띠 2개: y3887-3898 1225px = a 푸터. y86-92 x20-26 8px(朱 점)는 pre vs pre_rep1(AE 8)에 같은 좌표로 나옴 = b. 재촬영 A/B 1225"
   },
   {
    "name": "terms_1440",
    "pass": true,
    "evidence": "크기 1440x4659 동일, AE 1225, 띠 1개(y3868-3879) = a 푸터"
   },
   {
    "name": "terms_390",
    "pass": true,
    "evidence": "크기 390x6064 동일, AE 1225, 띠 1개(y5063-5074) = a 푸터"
   },
   {
    "name": "푸터 띠 내용(a) 확인",
    "pass": true,
    "evidence": "푸터 띠 좌표는 모두 locate_ab.json 의 .ft-legal rect 안에 들어감. 홈 1440 링크 글자 x 비교: 고객센터 216→220, 결제 350→364, 환불 규정 414→416, 이용약관 478→481. 사업자 정보와 개인정보처리방침은 48px 보다 넓어서 그대로. 링크 상자 rect 는 같고 justify-content 만 normal 에서 center 로 바뀜. crop 을 직접 열어 확인"
   },
   {
    "name": "대학 목록 계산값 1440/390",
    "pass": true,
    "evidence": "1440: 두 판 모두 336px 336px 336px, 3열, 12타일, border-top 0 = 1,2,3번, padding-right 0 = 3,6,9,12번. 16px 이동을 빼면 타일 rect 차이 0. 390: 두 판 모두 350px 1열, border-top 0 = 1번, padding-right 0 = 12타일 전부. 이동을 빼면 차이 0"
   },
   {
    "name": "대학 목록 계산값 1024/768 (2열 구간이 수리 전과 같은지)",
    "pass": true,
    "evidence": "1024: 두 판 모두 457.047px 457.047px, 2열, border-top 0 = 1,2번, padding-right 0 = 2,4,6,8,10,12번, 타일 0 = [55,y,457,48,0px,40px], 16px 이동을 빼면 타일 12개 차이 0. 768: 두 판 모두 353.281px 353.281px, 같은 리셋, 이동을 빼면 차이 0. 재촬영(tiles_ab_rep1.json)도 같은 값"
   },
   {
    "name": "대학 목록 계산값 600/430 (2열 → 1열 의도)",
    "pass": true,
    "evidence": "600: 수리 전 276px 276px(2열, border-top 0 은 1번뿐이라 2번 타일에 1px 윗선 = 3차 P1 결함) → 수리 후 552px 1열, border-top 0 = 1번, padding-right 0 = 전부. 430: 195px 195px(2열, 2번 윗선 1px) → 390px 1열. #find 높이 649 → 953"
   },
   {
    "name": "분류 집계 (c) = 0",
    "pass": true,
    "evidence": "regress_summary.json c_count = 0. 44장의 띠를 나누면 a 푸터 38, a 가입 「전문」 6, a 팝업 모서리 1, b 23(모두 같은 판 재촬영 비교에서 같은 좌표 y0,y1,x0,x1 로 다시 나옴), c 0. 홈 이동 비교에서 이동 외 차이 0"
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_pre",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_post",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_pre_rep1",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_post_rep1",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_pre_rep2",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_post_rep2",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_postr_rep2",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_pre_rep3",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_post_rep3",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_postr_rep3",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_tail_pre",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ab_tail_post",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ctx/index_1440_caption_pre_post.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ctx/index_390_caption_pre_post.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ctx/join_1440_terms_pre_post.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ctx/join_390_terms_pre_post.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ctx/popup_1440_pre_post.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ctx/popup_1440_sidecard_corners_x4.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ctx/programs_guidebook_390_radio_x4.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ctx/studio_390_footer_pre.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/shots/ctx/studio_390_footer_post.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/diff_ab/pair",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/diff_ab/shift/pair",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/diff_tail_ab/pair"
  ],
  "issues": [
   "관찰(수리 범위 누락, 회귀 아님): 푸터 .ft-legal a 가운데 정렬은 70개 면에만 들어갔다. compact 셸 7면(404, cart, checkout, join, login, my, pay_done)은 _tools/v2_shell.py _sub_guarded 가 'R2 발주 무변경 면'이라며 셸 교체를 건너뛰어 옛 규칙 `ft-legal a{font-size:var(--t-xs)}` 가 그대로 남았다. 실측 login_1440 과 join_1440 에서 「결제」 글자는 48px 상자 216-264 안의 216-236(왼쪽 정렬)이다. 같은 줄이 홈에서는 364-384(가운데)라 면마다 법적 고지 줄 정렬이 다르다. 브리프의 '72개 면' 도 실제로는 72개 파일이다(base.css 1 + 푸터 70면 + join.html 의 .view 1줄).",
   "관찰(측정 도구 한계): studio_390 은 문서 높이 17749px 이 Chrome 전체 캡처 한도 16384px 을 넘는다. 전체 캡처의 16384px 아래는 앞쪽 내용이 되풀이되어 푸터가 찍히지 않는다. 그래서 A/B AE=0 은 근거로 쓸 수 없고 꼬리 보조 캡처로 대신 확인했다(푸터 줄만 차이 = a). 3회차 A/B 의 studio_390 '0' 에도 같은 사각이 있다.",
   "관찰(타이밍 흔들림 출처 추가): 3회차에 적힌 표본 이미지와 朱 점 말고도, programs/guidebook 과 programs/studio 의 라디오 단추 테두리 안티에일리어싱(명도 13 차이, 1회 16px 안팎)이 같은 판을 다시 찍을 때 흔들린다. programs_guidebook_390 에서는 우연히 A/B 2회 연속 같은 쪽으로 나와 결정론 차이처럼 보였다. 하지만 pre_rep2 vs pre_rep3(같은 판) 비교에서 같은 좌표로 50px 이 나왔고, rep3 A/B 는 푸터 1224 만 남았다."
  ]
 }
]
```

첨부 이미지: tiles_430.png, tiles_600.png, tiles_1024.png, popup_1440.png, footer_index_390.png (모두 위 프로브 산출).

## 요구

소스를 직접 읽고 판단한다. 프로브 수치는 참고 근거이며, 소스와 어긋나면 소스를 따르고 어긋남을 적는다.

(a) 3차 P1(대학 목록 열 수와 괘선 리셋) 해결 여부와 근거(파일:행).
(b) P2 5건 각각 해결 여부와 근거(파일:행). 5건 = 팝업 측면 카드 모서리(radius), 캡션과 목록 윗선 간격(caption), 가입 약관 행 「전문」 정렬(view), 푸터 법적 고지 링크 정렬(footer), 검색 0건 안내 링크(empty).
(c) 수리가 만든 새 회귀 후보. 최소한 다음을 본다.
  - `@media not all and (...)` 문법의 브라우저 호환(구형 Safari, 삼성 인터넷 포함)과 range 문법 섞임 여부
  - 1열과 2열 경계를 소스 순서(뒤 블록이 앞 블록 리셋을 되돌림)로 가르는 방식의 취약점(규칙 순서가 바뀌거나 특이도가 달라질 때)
  - 72면 푸터 인라인 스타일 변경(compact 셸 7면 누락 포함)
  - 가입 행 `.view` 의 align-self 변경
  - 측면 카드 모서리 전환 순간(넘김 중 radius 와 하단바 재부착)
  - 그 밖에 네가 찾은 것(예: 프로브가 보고한 하단바 ←/→ 클릭 결함 app.js:537 의 실재 여부와 등급)
(d) 릴리스 판정과 그 이유 한두 문장.

## 형식

- 한국어, 500단어 이내.
- 항목별로 「해결 / 미해결 / 부분」 과 근거 파일:행을 적는다.
- 마지막 줄은 정확히 「RELEASE: YES」 또는 「RELEASE: NO」 한 줄만 쓴다. 그 뒤에 아무것도 쓰지 않는다.
