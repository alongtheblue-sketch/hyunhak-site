# hyunhak.com 릴리스 전 외부 검토 (Codex X1, 5회차)

## 역할
너는 hyunhak.com 릴리스 전 외부 검토자다. 읽기 전용이다. 파일을 고치지 말고, 리포 안의 코드와 기록을 읽어 판단만 한다.

## 대상
`git show 507edf1` (critic 4차 P1 팝업 하단바 ←/→ 넘김 수리 + P2). 리포 = /Users/gregory/Workspace/hyunhak-site. 직전 커밋은 c342aff 이다(`git diff c342aff 507edf1 -- assets/` 로 CSS/JS 변경만 볼 수 있다).

## 배경
- critic 4차 판정: /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/critic_r4_20260923.md 의 §4, §5
- 너의 4차 회신: /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/codex_x1_20260923.md

먼저 4차에 네가 지적한 다섯 가지가 507edf1 에서 어떻게 되었는지 확인하라.
1. 팝업 하단바 ←/→ 클릭이 넘기지 못하던 P1
2. 정지/재생 토글 단추의 의미(aria-pressed, 보이는 글자, aria-label)
3. 큰 기본 글꼴(em 미디어쿼리)에서 대학 목록 열 수와 괘선 경계
4. compact 셸 7면(404, cart, checkout, join, login, my, pay_done) 푸터 법적 고지 정렬
5. 검색 0건 안내(.tiles .empty)의 점선 테두리

첨부 이미지: popnav_1440.png(1440 팝업), popnav_390.png(390 팝업, → 탭 뒤), popnav_join_x3.png(활성 카드와 하단바 접합 3배 확대), tiles_font32_1150.png(기본 글꼴 32px, 폭 1150 대학 목록), footer_join_390.png(390 join 푸터).

## 이번 실측 프로브 요약 (localhost:8092, 서빙판 = HEAD 507edf1)

```json
[
 {
  "probe": "popnav",
  "pass": false,
  "checks": [
   {
    "name": "0 하네스 서빙판 = HEAD 507edf1",
    "pass": true,
    "evidence": "localhost:8092 가 내는 assets/app.js, assets/base.css, index.html 의 sha256 앞 16자리가 git show HEAD 와 같다(41aefa0c9bf4676d, 6b9ab35c5d2cd5ed, 31a373e8d2768d89). 리포 추적 파일 수정 0건."
   },
   {
    "name": "1 넘김 경로 전수(critic 4차 P1 수리 검증)",
    "pass": true,
    "evidence": "58/58 PASS. N=2 조합: 1440 기본/reduce 각 10경로(→/← 클릭, Enter →/←, Space →/←, ArrowRight/Left, 오른쪽/왼쪽 측면 카드 클릭), 390 기본/reduce 각 14경로(클릭, 탭 →/←, Enter, Space, Arrow, JS 합성 스와이프 dx -60/+60, CDP 터치 스와이프). N=3 확장 10경로(공지 1건을 route 로 추가). 모든 경로에서 한 동작 안에 data-on 이 새로 붙은 슬롯은 기대한 1개이고(예: click_next@1440 newlyOn=[1], side_left@1440_n3 1→3 newlyOn=[2]) 되돌아감은 0, 700ms 뒤 추가 변화 0. activeElement 는 새 활성 카드 h2(#ppopT, #rpopT, #hhPopupTitle_ntc_probe_n3)이고 inert 안에 남은 경우 0. 레이아웃은 활성 1, 측면 N-1, 하단바 = 활성 슬롯, 측면 .pop 만 inert. 조작 뒤 단추는 「재생」/「자동 넘김 재생」, pageerror 0."
   },
   {
    "name": "2a 연속 조작 순환(→ ×3 뒤 ← ×3, 650ms 간격)",
    "pass": true,
    "evidence": "1440/390 N=2: 2>1>2>1>2>1(기대와 같음), N=3: 2>3>1>3>2>1. reduce 1440 N=2, 390 N=3 도 같음. 매 단계 newlyOn 1개(기대 슬롯), 초점 = 활성 제목, 접합 gap 0/dL 0/dR 0."
   },
   {
    "name": "2b 빠른 연타 50ms ×3, 요소 기준 입력",
    "pass": true,
    "evidence": "키 ArrowRight, 스크립트 el.click(), 단추 현재 위치에 강제 클릭/탭, 10조합 전부 PASS. N=2 1→2, N=3 1→1(한 바퀴), newlyOn=[1,0,1]/[1,2,0], 실측 간격 51.7~83ms. 60ms 뒤와 900ms 뒤 모두 활성 1, 측면 N-1, 하단바 = 활성 슬롯, 접합 gap 0."
   },
   {
    "name": "2c 빠른 연타, 같은 좌표 실포인터(사용자가 → 를 연달아 누르는 경우)",
    "pass": false,
    "evidence": "기본 모션에서 실패. fixed_mouse@1440 N=2/N=3: 두 번째 클릭(53ms 뒤)이 div.pback 에 맞아 팝업이 닫히고, 세 번째 클릭은 뒤 지면 article.r2-card 에 맞음. fixed_tap@390 N=2: 두 번째 탭은 div.pnav, 세 번째 탭은 ← 에 맞아 1→2→1. N=3 은 닫힘. reduce 에서는 3/3 PASS. 간격 스윕 56회(100~700ms, 2/3회, 1440/390, N=2/3): ok 30, 팝업 닫힘 9, 「오늘 하루 보지 않기」 체크됨 6, 열린 상태의 레이아웃 어긋남 0. 간격별 ok: 100ms 2/8, 150ms 2/8, 200ms 2/8, 300~700ms 각 6/8. → 클릭 뒤 같은 좌표(776.5, 664.9)의 hit-test 시간표(1440): 0~17ms 옛 슬롯(측면), 17~67ms div.pback, 67~100ms label.pmute, 117~167ms ←, 183ms pcnt, 250ms 부터 → 복귀. 390: 0~57ms pback, 90~140ms ←, 223ms 부터 →. 카드별 → 정지 위치 y: 1440 N=2 664.9/672.1(7.2px 차), 390 N=2 675.1/699.4(24.3px 차), 짧은 공지 카드가 끼면 1440 530.8(141.3px 차), 390 533.1(166.3px 차). 그래서 N=3 에서는 300ms 이상 간격에서도 세 번째 클릭이 딤에 맞아 닫힌다."
   },
   {
    "name": "3a 정지 단추: 1440 마우스, 키보드, reduce, 접근성 트리",
    "pass": true,
    "evidence": "기본 로드 = 「정지」/aria-label 「자동 넘김 정지」, aria-pressed 속성 없음. 자동 넘김 8002ms(390 8002~8003ms). 클릭 → 「재생」/「자동 넘김 재생」, 무대 밖으로 마우스를 치운 뒤 9.5초 동안 넘김 0. 다시 클릭 → 「정지」, 마우스가 무대를 떠난 뒤 8002ms 에 넘어감(클릭 기준 8034~8052ms, 차이는 호버 멈춤 설계). 키보드 Enter 로 정지 뒤 9.5초 0, 재개 뒤 8003~8004ms. reduce 1440/390 = 「재생」/「자동 넘김 재생」, 9502/9518ms 동안 넘김 0. →, ← 클릭, ArrowRight, 390 → 탭, reduce → 클릭 5경우 모두 조작 뒤 「재생」이고 9.5초 동안 넘김 0. CDP Accessibility.getFullAXTree: 단추 이름이 「자동 넘김 정지」↔「자동 넘김 재생」으로 바뀌고 properties 는 invalid, focusable, focused 뿐이며 pressed 는 없다(로드, 정지 뒤, 재개 뒤, reduce 1440/390). 마우스를 단추 위에 둔 채 재개하면 9초 동안 넘김 0(호버 멈춤), 떠난 뒤 8000~8002ms."
   },
   {
    "name": "3b 정지 단추: 390 터치로 재개",
    "pass": false,
    "evidence": "탭으로 정지 → 「재생」, 9.5초 동안 넘김 0(정상). 다시 탭 → 표기는 「정지」/「자동 넘김 정지」인데 8.8초 안에 넘김 0, 20초 연장 관찰에서도 0(tap390long). → 탭으로 멈춘 뒤 「재생」 탭도 20초 동안 0(tapNextThenPlay390). .pstage 이벤트 기록 = 첫 탭 때 mouseenter 1회뿐이고 mouseleave 는 0. 같은 390 폭에서 키보드로 재개하면 8003ms 에 넘어감. 원인: app.js 541행의 mouseenter 가 터치 호환 이벤트로 hover=true 를 남기고, 터치에는 mouseleave(542행)가 오지 않아 tick() 이 504행 `if (stopped || hover) return` 에서 돌아간다."
   },
   {
    "name": "4 카드 1장(N=1) 경로",
    "pass": true,
    "evidence": "/api/config 를 route 로 promo null 로 준 1440/390, ends_at 2026-09-01 만료로 준 1440 모두 n=1(의뢰 카드), dialog aria-label 「안내」. 하단바 자식 = [label.pmute, button.pclose], 단추는 [닫기] 하나, prev/next/pause/.pnav/.pcnt 없음, 체크박스 data-ppop-mute-all 있음. 활성 .pop border-bottom 0px none, .pbar border-top 1px solid rgba(49,46,46,0.24), gap 0, dL 0, dR 0, radius pop 4/4/0/0, bar 0/0/4/4. ArrowRight 는 상태와 초점을 바꾸지 않음. dsf3 픽셀 열 2개(204, 384): 선 1개, 3 device px(188,186,182), y=90."
   },
   {
    "name": "5a 활성 카드와 하단바 접합(1440 dsf3 crop)",
    "pass": true,
    "evidence": "활성 .pop computed border-bottom-width 0px, .pbar border-top 1px solid rgba(49,46,46,0.24)(1440, 390, → 뒤 모두). 픽셀 열 2개 모두 바탕보다 25 넘게 어두운 행 = 3 device px 한 덩어리(188,186,182), 선 위 pop 쪽 차이 0. → 한 번 넘긴 뒤(행사 카드)도 같음. 대조(route 로 c342aff base.css): 6 device px(142,139,137 ×3 + 188,186,182 ×3) = 수리 전 2px 겹선이 1px 로 줄었다."
   },
   {
    "name": "5b 측면 카드 radius 네 모서리",
    "pass": true,
    "evidence": "1440 측면 .pop border-radius 4/4/4/4(로드, → 뒤 모두), 390 측면 4/4/4/4. 활성 카드 4/4/0/0, 하단바 0/0/4/4. popnav_side_corner_x3.png."
   },
   {
    "name": "5c 넘김 전이: 바탕과 .pfr 명도가 transform 과 같이 변하는지",
    "pass": true,
    "evidence": "→ 단추 el.click 직후 .pdim 안 전이 6개(slot0/1 transform, pop0/1 background-color, pfr0/1 opacity) 모두 500ms, 같은 easing. pause 뒤 currentTime 고정 진행률(scale, translateX, 바탕 RGB 합, .pfr opacity): 0ms 0/0/0/0; 150ms 0.861/0.861/0.864/0.861(이론 ease 0.861, 새 활성 a=0.9861 bg=252,250,243 pfr=0.9375); 300ms 0.974/0.974/0.963/0.974(이론 0.974); 500ms 1/1/1/1(새 활성 bg=255,253,248 pfr=1, 새 측면 bg=235,228,212 pfr=0.55). 최대 편차 0.011. 실시간 rAF 40~41프레임 최대 편차 0.013."
   },
   {
    "name": "5d reduce 에서 전이 0",
    "pass": true,
    "evidence": "reduce 1440/390: .pslot, .pslot > .pop, .pfr 의 transition-property none, 넘김 직후 이 셋의 애니메이션 0개, 첫 프레임 진행률 1/1/1. 전역 규칙 base.css 107행 *{transition-duration:.01ms!important} 때문에 duration 표기는 1e-05s 이고, h2 outline-offset 0.01ms 전이 2개만 따로 생긴다(무대와 무관). 기본 모션 대조: slot 0.5s(transform, opacity), pop 0.5s background-color, pfr 0.5s opacity."
   },
   {
    "name": "6 닫기, ESC, 딤, 오늘 하루 보지 않기",
    "pass": true,
    "evidence": "1440/390 × 닫기, ESC, 딤(8,8 hit = div.pback, 390 은 탭) 6경우 모두 .pdim 제거, html.ppop-open 해제, body 자식 inert 5→0, 초점 body, pageerror 0. 체크 → 닫기: localStorage hh_popup_mute_v1.all = 1790175600000(2026-09-23T15:00:00Z, KST 자정 기대값과 같음). 같은 탭 새로고침 안 뜸, 같은 컨텍스트 새 탭에서도 안 뜸(1440/390). 대조군(체크 없이 닫기): 같은 탭 새로고침은 세션 1회 규칙으로 안 뜨고, 새 탭에서는 뜸. 억제는 체크가 만든 것으로 확인."
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_join_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_turn_0.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_turn_150.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_turn_300.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_n1_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_turn_500.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_join_x3_after_next.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_join_x3_c342aff.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_side_corner_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/popnav_n1_join_x3.png"
  ],
  "issues": [
   "결함(P1 후보, 390 터치): 정지 단추로 재개하면 표기는 「정지」/「자동 넘김 정지」(도는 중)인데 자동 넘김이 다시 돌지 않는다. 20초 관찰에서 2개 시나리오 모두 넘김 0. 첫 탭의 호환 mouseenter 가 .pstage 에 hover=true 를 남기고(app.js 541행), 터치에는 mouseleave(542행)가 오지 않아 tick() 이 504행에서 돌아간다. 단추 이름이 실제 상태와 어긋난다. 같은 폭에서 키보드로 재개하면 8003ms 에 넘어간다. hover 로직은 507edf1 이전부터 있던 것이다. 수리 방향 예: pointerenter/pointerleave 에서 pointerType === 'mouse' 일 때만 hover 로 셈.",
   "결함(P2, 507edf1 이 넘김을 살리면서 드러남): 넘김 500ms 동안 하단바가 새 활성 카드와 함께 옆에서 미끄러져 들어온다. 그래서 → 를 같은 자리에서 100~250ms 안에 다시 누르면 딤(팝업 닫힘), 「오늘 하루 보지 않기」 라벨(체크됨), ←, 재생 단추가 눌린다. 스윕 56회 중 닫힘 9, 체크 6, 간격 100~200ms 성공 2/8. 1440 hit-test 시간표: 17~67ms pback, 67~100ms pmute, 117~167ms ←, 250ms 부터 →. 기본 두 장(N=2)에서 300ms 이상 간격이면 성공한다. reduce 에서는 50ms 연타도 성공한다.",
   "결함(P2 후보, 공지 팝업을 게시할 때 영향): 카드 높이에 따라 하단바의 → 위치가 오르내린다. 실제 두 장은 7.2px(1440)/24.3px(390) 차이지만, 짧은 공지 카드가 끼면 141.3px(1440)/166.3px(390) 차이가 난다. 그래서 N=3 에서는 300~700ms 간격으로 천천히 눌러도 세 번째 클릭이 딤에 맞아 팝업이 닫힌다. 현재 목 API 의 공지는 0건이다.",
   "관찰(회귀 아님): 활성 .pop 의 box-shadow(0 1px 0 .06, 0 12px 28px .07)가 position:relative 때문에 하단바 위에 칠해진다. 선 아래 하단바 윗부분 약 11px(33 device px)이 바탕 255,253,248 대비 최대 11 어둡다(244,242,237→248,246,241). 선 자체는 1px 하나(188,186,182)이고 c342aff 에서도 그림자 띠는 같다.",
   "관찰(P3): 390 에서 → 를 탭한 뒤 단추에 :hover 가 남아 바탕 rgb(235,228,212)(--mat)가 칠해진다. (hover:hover) 는 false 이고 base.css 946행 .pbar .parr:hover 가 (hover:hover) 로 묶이지 않았다(popnav_390.png).",
   "부수 관찰: tap_next@390 한 회차는 networkidle 이 늦어 로드 중에 자동 넘김(1→2)이 먼저 일어났다. 자동 넘김은 초점을 새 제목 h2#ppopT 로 옮기고 「정지」 표기를 유지했다(정상). 경로 판정은 2→1 wrap 으로 통과했다.",
   "원자료: /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/popnav.json (구획 nav, seq, sweep, restpos, pause, n1, visual, close). 재현: node probe_popnav.mjs [nav|seq|sweep|restpos|pause|n1|visual|close|all]."
  ]
 },
 {
  "probe": "layout",
  "pass": true,
  "checks": [
   {
    "name": "1. 큰 기본 글꼴(CDP Page.setFontSizes) 대학 목록",
    "pass": true,
    "evidence": "The setting took effect: at 1150, max-width:37.5em matched false at 16px and true at 32px (html computed font-size 32px). 32px@1150: 1 column (gtc 1028px), bt8 0,1,1,1,1,1,1,1, pr8 all 0, all 12 tiles padding-right 0. 32px@1200: 1 column (1024px), same bt8/pr8. 32px@1024: 1 column (914.094px), same. 32px@1201: 3 columns, bt8 0,0,0,1,1,1,1,1, pr8 40,40,0,... minGap 40. 32px@1250: 3 columns (340px x3), same pattern. 20px@700: 1 column (644px), bt8 0,1,1,..., pr 0. 20px@760: 2 columns (349.609px x2), bt8 0,0,1,..., pr8 40,0,... minGap 40. 20px@1024: 2 columns (457.047px x2), same. No horizontal overflow (scrollW=clientW). Negative path: pre-fix base.css (507edf1~1) at 32px@1150 and @1200 gave bt8 0,1,0,1,... (3rd tile top border 0, the Codex round-4 finding reproduced) and the judge returned FAIL, so the judge catches the defect."
   },
   {
    "name": "2. 보통 글꼴 폭 회귀(r4/tiles.json 대조)",
    "pass": true,
    "evidence": "390: 1 column 350px, bt8 0,1,1,1,1,1,1,1, pr 0. 430: 1 column 390px. 600: 1 column 552px. 601: 2 columns 276.469px x2, bt8 0,0,1,..., pr8 40,0,..., minGap 40. 1024: 2 columns 457.047px x2, minGap 40. 1100: 2 columns 492px x2, minGap 40. 1101: 3 columns 328.312px x3, bt8 0,0,0,1,..., pr8 40,40,0,..., minGap 40. 1440: 3 columns 336px x3, minGap 40. All 8 widths pass the r4 judge. ncols, gtc, bt8, pr8, minGap, nTiles and btAll all match r4 exactly (sameAsR4=true, 8/8)."
   },
   {
    "name": "3. 푸터 법적 고지 전수",
    "pass": true,
    "evidence": "Pages: git ls-files *.html outside _design/_tools/_docs that contain ft-legal = 77. Measured 154 of 154 page x width loads (1440 and 390), 900 links in total. Max |left blank - right blank| = 0.02px. Min link height = 48. justify-content on every link = center. Failures: 0. All 7 compact-shell pages (404, cart, checkout, join, login, my, pay_done) included, each with maxAbsDiff 0.02 and minH 48 at both widths. 결제 link on index/join/login/cart at 1440 and 390: box 48 / text 20.36, L13.81 R13.83."
   },
   {
    "name": "4. 검색 0건(없는대학) 1440/1024/390",
    "pass": true,
    "evidence": "At all 3 widths: 0 tiles; p.empty borders t/r/b/l = 0px, style none, radius 0px; p width = #tiles width (1008/1008, 914.09/914.09, 350/350, diff 0). #tiles border top/bottom 1px, left/right 0. Pixel analysis of the #tiles capture: full-width line bands = 2, exactly at the list top and bottom borders ([8,8],[89,89] at 1440 and 1024; [8,8],[112,112] at 390). Line-pixel ratio on the p edges (left column, right column, top row, bottom row) = 0,0,0,0. After clearing the input: 1440 back to 3 columns bt8 0,0,0,1,... pr8 40,40,0,..., 1024 back to 2 columns bt8 0,0,1,..., 390 back to 1 column bt8 0,1,1,... All pass the judge and btAll/prAll/gtc match the state before searching. Negative path: pre-fix CSS at 1440 gave p border 1px dashed radius 4px, edge line ratios 0.795/0.795/0.763/0.744, and the pixel judge returned FAIL, so it catches the dashed border."
   },
   {
    "name": "5. 가입 약관 행",
    "pass": true,
    "evidence": "At 320, 390 and 1440: all 5 rows (ck-all, ck-terms, ck-priv, ck-age, ck-mkt) sameLine=true. .view (ck-terms, ck-priv, ck-mkt) 48x48, same row, right of span, center offset dCenter 6.5 (r4 6.5, difference 0). No document horizontal overflow. 3/3 widths match round 4."
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/tiles_font32_1150.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/tiles_430.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/tiles_1024.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/tiles_empty_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/tiles_empty_1024.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/tiles_empty_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/tiles_empty_1440_pre507edf1.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/footer_join_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/footer_login_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/footer_index_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/footer_index_390_boxes.png"
  ],
  "issues": [
   "Observation (probe, not a site defect): at 32px 1150, #find is 942px tall, more than the 900px viewport. The first element capture then went through a capture-beyond-viewport pass and shot a different section (the makers and discount table). Measurements were unaffected. I fixed it in the probe by growing only the viewport height before the capture (width unchanged) and re-shot; the tiles are now captured correctly.",
   "Observation: the site's font sizes are px-based, so raising the browser default font to 32px leaves visible text about the same size. Only em-based media queries (37.5em = 1200px) and the html computed value (32px) change.",
   "Observation: among the compact-shell pages, my.html has 6 legal footer links while the other 6 pages have 4. All 6 are centered (maxAbsDiff 0.02) and 48px tall.",
   "Served base.css sha256/16 = 6b9ab35c5d2cd5ed, identical to HEAD (507edf1). I made no changes to tracked files (assets, *.html, _tools, programs). Raw data: /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/layout.json"
  ]
 },
 {
  "probe": "regress",
  "pass": true,
  "checks": [
   {
    "name": "route 대상과 서빙 판",
    "pass": true,
    "evidence": "git diff --name-only c342aff 507edf1 에서 _design/ 과 _tools/ 를 빼면 72개(css 1, js 1, html 70). 디스크 파일과 507edf1 내용이 다른 파일 0개. 첫 실행 route 응답 150건, rep1 실행 36건. 캡처 96/96 ok, FAIL 0, HTTP 200. 추적 파일 수정 0(git status -uno 0행)"
   },
   {
    "name": "404_1440",
    "pass": true,
    "evidence": "1440x900, 전후 크기 같음. AE=920, 띠 1개(y652-663 x216-373 920px). 분류 a-footer: compact 셸 법적 고지 링크의 글자 x 가 이동. 상자 rect 는 같다(결제 [216,264]). 글자 시작 x 216→229.8, 환불 규정 272→274.2, 이용약관 328→331.6. justify-content normal→center"
   },
   {
    "name": "404_390",
    "pass": true,
    "evidence": "390x844, 전후 같음. AE=920, 띠 1개(y571-582 x20-177 920px), a-footer(법적 고지 글자 x 이동)"
   },
   {
    "name": "cart_1440",
    "pass": true,
    "evidence": "1440x1105, 전후 같음. AE=920, 띠 1개(y988-999 x216-373 920px), a-footer"
   },
   {
    "name": "cart_390",
    "pass": true,
    "evidence": "390x1299, 전후 같음. AE=920, 띠 1개(y1124-1135 x20-177 920px), a-footer. 결제 글자 x 20→33.8, 상자 [20,68] 그대로. crop 을 3배 확대해 눈으로 확인함"
   },
   {
    "name": "checkout_1440",
    "pass": true,
    "evidence": "1440x2646, 전후 같음. AE=920, 띠 1개(y1956-1967 x216-389 920px), a-footer"
   },
   {
    "name": "checkout_390",
    "pass": true,
    "evidence": "390x3152, 전후 같음. AE=920, 띠 1개(y2298-2309 x20-193 920px), a-footer"
   },
   {
    "name": "join_1440",
    "pass": true,
    "evidence": "1440x3167, 전후 같음. AE=920, 띠 1개(y2477-2488 x216-389 920px), a-footer. 약관 행 띠는 0개"
   },
   {
    "name": "join_390",
    "pass": true,
    "evidence": "390x3684, 전후 같음. AE=920, 띠 1개(y2830-2841 x20-193 920px), a-footer. 결제 글자 x 20→33.8"
   },
   {
    "name": "login_1440",
    "pass": true,
    "evidence": "1440x1433, 전후 같음. AE=920, 띠 1개(y1315-1326 x216-373 920px), a-footer"
   },
   {
    "name": "login_390",
    "pass": true,
    "evidence": "390x1381, 전후 같음. AE=920, 띠 1개(y1206-1217 x20-177 920px), a-footer"
   },
   {
    "name": "my_1440",
    "pass": true,
    "evidence": "1440x1210, 전후 같음. AE=1225, 띠 1개(y520-531 x216-523 1225px), a-footer. 링크 6개: 고객센터 글자 x 216→219.6, 결제 349.7→363.5. crop 확대 확인"
   },
   {
    "name": "my_390",
    "pass": true,
    "evidence": "390x1366, 전후 같음. AE=1225, 띠 1개(y464-475 x20-327 1225px), a-footer"
   },
   {
    "name": "index_popup_1440",
    "pass": true,
    "evidence": "1440x900, 전후 같음. AE=3141, 띠 2개: y207-209 x501-939 4px, y636-695 x500-940 3137px. 재촬영 A/B 도 3141(결정적). 같은 판 재촬영은 0. 분류 a-popup: 활성 .pop border-bottom 1px→0px, 높이 430.8→429.8. 세로 가운데 정렬이라 rect 가 y 205.6→206.1, 아래 636.4→635.9 로 바뀐다. 이동 검사(popup_shift.json): 카드 본문 dy0 에서 AE 0, 하단바 dy-1 에서 AE 2 = 하단바만 1px 위로 옮겨짐. 윗테 4px 는 소수 좌표 테두리 안티에일리어싱. 접합부 명도 프로파일은 pre 139,185(선 2줄), post 185(선 1줄)"
   },
   {
    "name": "index_popup_390",
    "pass": true,
    "evidence": "390x844, 전후 같음. AE=15222, 띠 4개: y139-143 715px, y168-180 232px, y204-439 11452px, y468-597 2823px. 재촬영 A/B 15222(결정적), 같은 판 재촬영 0. 분류 a-popup: 카드 높이 458.2→457.2, top 139.4→139.9 가 정수 픽셀로 스냅되어 카드 내용이 1px 아래로 옮겨졌다. 이동 검사: 카드 본문 dy+1 에서 AE 0, 하단바 dy0 에서 AE 0. 윗테 차이는 카드 테두리가 정지한 배경 위에서 1px 옮겨진 것(확대 crop 확인). 접합부 pre 139,185, post 185. 본문 crop 을 눈으로 보니 글자와 가격이 같다"
   },
   {
    "name": "index_nopop_1440 / 390",
    "pass": true,
    "evidence": "1440x4858 AE=0, 390x6639 AE=0, 띠 0. 재촬영 A/B 도 0"
   },
   {
    "name": "index_tiles_1440 / 390 + 목록 계산값 6폭",
    "pass": true,
    "evidence": "#tiles 요소 캡처 1008x195 AE=0, 350x579 AE=0. tiles_ab.json 6폭(1440, 1024, 768, 600, 430, 390) 모두 identical=true, diff_tiles=[], box_dy=0. 열 3/2/2/1/1/1, 윗선 0 타일 [1,2,3]/[1,2]/[1,2]/[1]/[1]/[1] 전후 같음(검색 0건이 아닌 상태의 목록 변화 0)"
   },
   {
    "name": "programs_guidebook_390",
    "pass": true,
    "evidence": "390x11187, 전후 같음. AE=106, 띠 5개(y2092-2098 44px, y2205-2210 27px, y4443-4448 2px, y4747-4751 25px, y4838-4841 8px). 분류 b: post 대 post_rep1 에서 5개가 같은 좌표로 다시 나오고, 재촬영 A/B 는 0. crop 은 흐림 처리된 표본 이미지(표 본문) 구역이다"
   },
   {
    "name": "programs_guidebook_1440",
    "pass": true,
    "evidence": "1440x10825 AE=0, 띠 0. 재촬영 A/B 0"
   },
   {
    "name": "support_390",
    "pass": true,
    "evidence": "390x4889, 전후 같음. AE=8, 띠 1개(y86-92 x20-26 8px). 분류 b: 朱 점. pre 대 pre_rep1 에서 같은 좌표 8px, 재촬영 A/B 0"
   },
   {
    "name": "support_1440",
    "pass": true,
    "evidence": "1440x3900 AE=0, 재촬영 A/B 0"
   },
   {
    "name": "studio_390(꼬리)",
    "pass": true,
    "evidence": "390x17749 는 16384 캡처 한도를 넘어 전체 캡처 AE=0 이 무효. 꼬리 캡처로 대체: footer 요소 390x1005 AE=0, 스크롤 16384 창 AE=0, 스크롤 16905 창 AE=0(unstick = header.hd, div.setnav sticky, nav.fix fixed). 4회차 같은 비교의 1225 가 0 이 되었다 = 인라인에서 base.css 로 옮긴 뒤 렌더가 같다"
   },
   {
    "name": "studio_1440",
    "pass": true,
    "evidence": "1440x11977 AE=0, 띠 0"
   },
   {
    "name": "about_1440 / 390",
    "pass": true,
    "evidence": "1440x5428 AE=0, 390x6491 AE=0. 법적 고지 글자 x 전후 같음(결제 167.5, jc center 그대로)"
   },
   {
    "name": "b2b_1440 / 390",
    "pass": true,
    "evidence": "1440x4910 AE=0, 390x6280 AE=0"
   },
   {
    "name": "faq_1440 / 390",
    "pass": true,
    "evidence": "1440x8031 AE=0, 390x7626 AE=0"
   },
   {
    "name": "guidebook_index_1440 / 390",
    "pass": true,
    "evidence": "1440x5045 AE=0, 390x6495 AE=0"
   },
   {
    "name": "interview_1440 / 390",
    "pass": true,
    "evidence": "1440x11837 AE=0, 390x14396 AE=0"
   },
   {
    "name": "interview_yonsei-hum_1440 / 390",
    "pass": true,
    "evidence": "1440x7956 AE=0, 390x10986 AE=0"
   },
   {
    "name": "lectures_1440 / 390",
    "pass": true,
    "evidence": "1440x6347 AE=0, 390x8253 AE=0"
   },
   {
    "name": "library_1440 / 390",
    "pass": true,
    "evidence": "1440x5416 AE=0, 390x8663 AE=0"
   },
   {
    "name": "notice_1440 / 390",
    "pass": true,
    "evidence": "1440x1211 AE=0, 390x1217 AE=0"
   },
   {
    "name": "pastexam_1440 / 390",
    "pass": true,
    "evidence": "1440x1962 AE=0, 390x2309 AE=0"
   },
   {
    "name": "programs_studio_1440 / 390",
    "pass": true,
    "evidence": "1440x8518 AE=0, 390x12793 AE=0"
   },
   {
    "name": "ranking_1440 / 390",
    "pass": true,
    "evidence": "1440x1856 AE=0, 390x2123 AE=0"
   },
   {
    "name": "request_1440 / 390",
    "pass": true,
    "evidence": "1440x4345 AE=0, 390x5229 AE=0"
   },
   {
    "name": "terms_1440 / 390",
    "pass": true,
    "evidence": "1440x4659 AE=0, 390x6064 AE=0"
   },
   {
    "name": "70면 푸터 이관 렌더 동일",
    "pass": true,
    "evidence": "route html 70개에 드는 캡처 면(index 와 PAGES 중 비compact 면 17개 × 2폭 = 34장 + studio_390 꼬리 3장) 모두 AE=0. 4회차에 면마다 나오던 1225px 푸터 띠가 이번에는 0"
   },
   {
    "name": "분류 집계",
    "pass": true,
    "evidence": "52쌍 중 AE 0 = 38쌍. a-footer 12쌍(compact 6면 × 2폭), a-popup 2쌍, b 2쌍(programs_guidebook_390, support_390). c = 0(regress_summary.json c_count 0)"
   }
  ],
  "shots": [
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_pre/index_popup_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_post/index_popup_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_pre/index_popup_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_post/index_popup_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/index_popup_1440.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/index_popup_390.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/index_popup_1440_junction_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/index_popup_390_junction_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/index_popup_390_toprim_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/index_popup_1440_toprim_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/cart_390__band0_y1124-1135_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/my_1440__band0_y520-531_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/login_390__band0_y1206-1217_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/404_1440__band0_y652-663_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/programs_guidebook_390__band0_y2092-2098_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/programs_guidebook_390__band3_y4747-4751_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/zoom/support_390__band0_y86-92_x3.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/pair/index_popup_1440__band1_y636-695.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/pair/index_popup_390__band2_y204-439.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_tail_pre/studio_390_footer.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_tail_post/studio_390_footer.png",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_pre",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_post",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_pre_rep1",
   "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/shots/ab_post_rep1"
  ],
  "issues": [
   "관찰(의도의 부수 효과): 활성 카드 border-bottom 을 0 으로 하면 카드가 1px 짧아진다. 무대가 세로 가운데 정렬이라 폰 폭(390)에서는 카드 내용 전체가 1px 아래로 스냅되고(AE 15222), 1440 에서는 하단바가 1px 위로 옮겨진다(AE 3137). 둘 다 정수 픽셀 평행 이동뿐이며 dy 보정 후 AE 는 0 또는 2다. 결함 아님",
   "관찰: 대상 목록에 없던 pay_done.html 은 이번에 찍지 않았다. 같은 compact 셸 푸터라 cart, checkout, my, 404, join, login 과 같은 a-footer 이동이 예상되지만 실측값은 없다",
   "관찰: 검색 0건 상태(.tiles .empty 테두리 0)는 기본 캡처에 나오지 않는다. regress 범위에서는 목록 변화 0 만 확인했다",
   "재현 보조 스크립트: 비교 = /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3/probe_regress_compare.py(→ /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/regress_ab.json, /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/diff_ab/). 띠 분류 = /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/probe_regress_bands.py. 팝업 이동 검사 = /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/probe_popup_shift.py. 집계 = /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/probe_regress_summary.py(→ regress_summary.json, regress_summary.txt). 같은 판 재촬영 비교 = /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/ctrl/"
  ]
 }
]
```

## 요구
(a) 4차 P1(팝업 하단바 ←/→ 넘김) 해결 여부와 근거. 근거는 파일:행으로 적는다.
(b) P2 각각의 해결 여부. 아래 표기 키로 항목을 구분해 적는다.
   - popnav_p1: 4차 P1 하단바 ←/→ 넘김
   - pause_semantics: 정지/재생 토글 단추 의미(aria-pressed, 보이는 글자, aria-label)
   - font_boundary: 큰 기본 글꼴 em 경계에서 대학 목록 열 수와 괘선
   - footer_all: compact 7면 포함 전 면 푸터 법적 고지 정렬
   - empty_border: 검색 0건 안내 점선 테두리
   - junction: 활성 카드와 하단바 접합 겹선
   - transition: 넘김 전이(바탕, .pfr 명도와 transform 동기)
(c) 수리가 만든 새 회귀 후보. 최소한 다음을 검토한다.
   - .pbar 제외 조건이 측면 카드 클릭이나 스와이프를 막는 경로가 있는지
   - aria-label 과 보이는 글자가 어긋나는지(WCAG 2.5.3 Label in Name)
   - 전이 추가가 prefers-reduced-motion: reduce 설정과 reduce 미지원 환경에 주는 영향
   - 푸터 규칙을 base.css 로 옮기면서 생긴 선택자 특이도 문제
   - 위 프로브가 보고한 결함(390 터치 재개 뒤 자동 넘김 정지, 같은 좌표 연타가 딤/체크박스에 맞는 문제, 카드 높이에 따른 → 위치 이동)의 심각도 판단
(d) 릴리스 판정과 그 이유.

500단어 이내로 쓴다. 마지막 줄은 정확히 「RELEASE: YES」 또는 「RELEASE: NO」 한 줄이다(괄호나 다른 글자 없이).
