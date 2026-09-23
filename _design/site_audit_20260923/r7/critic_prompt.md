제2 평가자 채점 7회차. hyunhak.com 팝업 무대의 하단바 고정 재작업(e1955be = 3d2ada3 + 6차 지적 수리 + Codex 7차 P2 수리)을 채점하고 배포 4차 릴리스 판정을 내라. 리포 = /Users/gregory/Workspace/_wt/hh-studio12 (git 워크트리, 브랜치 fix/popup-bar-r7). 대학 목록은 이번에 바뀌지 않았다(5차 37/45 YES 유지, A/B 로 확인).

[용도 식별 G1] 매체 = 반응형 웹사이트(1440 데스크톱, 1024와 768 태블릿, 430과 390 폰). 용도 = 상품 판매 지면의 첫 진입 안내 팝업(의뢰 개시 카드, 행사 카드, 공지 카드). 대상 = 학부모와 고3 수험생. 토큰 SSOT = assets/base.css 1~80행(--ink 玄墨, --paper 楮紙, --seal 朱印은 가격과 인장과 폼 오류만, 그림자 대신 괘선, 리터럴 px 금지).

[이전 회차] 6차 회신 = /Users/gregory/Workspace/_wt/hh-studio12/_design/site_audit_20260923/critic_r6_20260923.md (팝업 35/45 YES, L7=3, P1 0, §5 P2 접합 슬릿, 반증 렌즈 P2 5건). Codex 6차 = /Users/gregory/Workspace/_wt/hh-studio12/_design/site_audit_20260923/r6/codex_x1_20260923.md (RELEASE: NO, 접합 슬릿 5/18 회귀). 라이브 = 96be167(팝업 코드 = 94f577b, 하단바가 활성 슬롯 안에 붙어 넘길 때 움직이는 판).
[이번 수리] git show 3d2ada3(cherry-pick da0bc47: 하단바 무대 둘째 행 고정, 슬롯 아래 맞춤, N>1 첫 초점 = 대화상자 틀, 활성 카드 아래 선 투명) + git show ab9160d 와 git show e1955be(접합 슬릿 = .pbar margin-top -1px 겹침 / 짧은 화면 = fitBar 가 하단바 높이를 --pbar-h 로 두고 .pop max-height = min(72vh, 100vh - 32px - --pbar-h) / N≥3 감아 도는 슬롯 transition none + |d|≥2 data-far opacity 0 / .pdim 초점에서 ArrowDown ArrowUp PageDown PageUp Space 로 활성 카드 스크롤). 고치지 않은 것 = 아래 맞춤 빈 공간(짧은 카드가 활성일 때 위쪽 공백): 고정 하단바(→ 위치 불변)와 양립하지 않아 받아들인 trade-off. 이 판단이 맞는지 L4, L6 에서 말하라.
[이번 회차 실측 = 프로브 2종 결과 + 메인 세션 자기 점검, 수치는 스크립트 실측]
{
 "head": "c-keypause = ab9160d + Codex 7차 P2 수리(onArrow setPause, rAF 세대). 프로브 2종은 ab9160d 서빙에서 측정, 수리 delta = app.js onArrow 1줄 + layout() rAF 세대 검사 3줄(CSS 무변경)",
 "probe:popnav (ab9160d, pass)": {
  "nav": "96/96, 되돌아감 0, 조작 뒤 초점 = 새 제목 96/96, 700ms 뒤 barGap -1 x96, 하단바 이동 0, 단추 초점 Space 16/16 누름(dp false)",
  "seq+sweep": "seq 23/23; sweep 64/64 클릭 160 넘김 160 → 명중 160, 닫힘 0, 체크 0, 간격 50~700ms 8/8, hit-test 50/50 x4",
  "restpos": "→ 정지 위치 X/Y 차이 0/0, barGap -1 전행, 활성 카드 위 빈 공간 1440 [14.3, 0, 282.4] 390 [48.5, 0, 332.5] (아래 맞춤, 의도)",
  "pause": "자동 8002/8001ms, 재개 8001/8003/8039ms, reduce 9507/9501 넘김 0, 390 탭 20초 2회, aria-pressed 없음",
  "focus": "로드 직후 dialog 「안내 2건/3건」, 자동 넘김 20초 focusin div.pdim 1회, Tab → a.btn 의뢰하기, 순환 [0..6,0]/[6..0,6], ESC → a.skip 4/4, N=1 제목",
  "short": "14/14 조합 35카드: 하단바 bottom ≤ vh-16.5, 활성 top ≥ 16.5, --pbar-h = offsetHeight 35/35(107/58px), max-height 일치 35/35, 넘치는 21카드 끝까지 스크롤 21/21, 측면 겹침 0",
  "wrap": "8/8 실행 56단계 1616프레임: 교차 0, 측면 최대 겹침 0px, 감아 도는 슬롯 56회 none@키직후+첫프레임 → 둘째 프레임 복구, 먼 슬롯 opacity 0 pointer-events none(1920 230px 자리 elementFromPoint = div.pback), reduce 동일",
  "keys": "1440x420 0>48, 0>129, 0>129(Space), 129>81, 129>0(Shift+Space), 129>0(PageUp), dp true, 초점 pdim 유지; 1440x320 +48 +194 -48 -194; ArrowRight/Left 넘김+제목 초점; Tab 으로 ← 초점 뒤 Space = 단추 클릭 1, 스크롤 0",
  "visual": "접합 crop 5장 선 1개(3장치px, 206,204,200), 딤 행 0, 그림자 행 0; 측면 radius 4; 넘김 0/150/300/500ms 하단바 이동 0; rAF 41프레임 이동 0; reduce 전이 0",
  "observations": [
   "카드 안 조작은 a.btn 링크라 Space 는 브라우저 기본(스크롤), 이전부터",
   "390x640 의뢰 카드 넘침 없음(456=456)",
   "320x256/568x320 하단바 2줄 107px 라 카드 보이는 높이 117/181px, 안 스크롤 387~418/258~272px (ab9160d 신규 결과)"
  ]
 },
 "probe:regress (ab9160d vs 라이브 96be167, pass)": "64장 = 차이 0 49, (a) 의도 14(홈 팝업 무대 안: N=2 첫 장 1440 100302/390 60769 = 카드와 하단바 아래로 7.1/24.2px, 둘째 장 활성 카드 영역 0, N=3 측면 아래 맞춤, 390x640 1.2px, N=1 390 하단바 글자 1px), (b) 흔들림 1(programs_studio 1440 표본 이미지 4889, rep1 대조 0), (c) 의도 밖 0. 팝업 없는 면 40쌍 AE 0. 접합 38장 선 1행 슬릿 0, barTop-onBottom pre 0 post -1",
 "selfcheck (메인 세션)": {
  "quick_check(1440x900,390x844,1440x700)": "→ 단추 위치 카드 3회 전환 동안 이동 0px, barTop = popBottom - 1.0 (margin-top -1 겹침), 같은 좌표 3연타 100/150/250ms 닫힘 0 체크 0, 터치 재개 9.3초 1→2, 자동 넘김 17.5초 focusin = pdim 1회",
  "regress_joint(6폭 × index cur1/cur2 + about N=1 = 18상태)": "post 슬릿 0/18 (dsf 1), 0/18 (dsf 2). pre(94f577b) 0/18",
  "short(하단바 bottom ≤ innerHeight, 카드별)": [
   [
    "390x640",
    [
     [
      "1",
      603.4,
      640,
      true
     ],
     [
      "2",
      603.4,
      640,
      true
     ]
    ]
   ],
   [
    "360x640",
    [
     [
      "1",
      603.4,
      640,
      true
     ],
     [
      "2",
      603.4,
      640,
      true
     ]
    ]
   ],
   [
    "844x390",
    [
     [
      "1",
      363.9,
      390,
      true
     ],
     [
      "2",
      363.9,
      390,
      true
     ]
    ]
   ],
   [
    "568x320",
    [
     [
      "1",
      303.5,
      320,
      true
     ],
     [
      "2",
      303.5,
      320,
      true
     ]
    ]
   ],
   [
    "320x256",
    [
     [
      "1",
      239.5,
      256,
      true
     ],
     [
      "2",
      239.5,
      256,
      true
     ]
    ]
   ],
   [
    "1440x600",
    [
     [
      "1",
      544.5,
      600,
      true
     ],
     [
      "2",
      544.5,
      600,
      true
     ]
    ]
   ],
   [
    "390x844",
    [
     [
      "1",
      728.4,
      844,
      true
     ],
     [
      "2",
      728.4,
      844,
      true
     ]
    ]
   ]
  ],
  "wrap(N=4 복제 카드, 폭, N, data-far 슬롯 [i,d,opacity], 전이 중 활성 영역과 겹친 표본 수, 그 슬롯 i)": [
   [
    1920,
    4,
    [
     [
      "2",
      "2",
      "0"
     ]
    ],
    2,
    [
     "0",
     "0"
    ]
   ],
   [
    1440,
    4,
    [
     [
      "2",
      "2",
      "0"
     ]
    ],
    2,
    [
     "0",
     "0"
    ]
   ]
  ],
  "wrap 해석": "겹친 표본은 전부 i=0 = 나가는 활성 카드(d 0→-1)로 정상. 감아 도는 슬롯 3(d -1→2)은 transition none 으로 즉시 이동 + data-far opacity 0",
  "keys(1440x420, 첫 초점 .pdim)": {
   "start": {
    "st": 0,
    "sh": 429,
    "ch": 300,
    "active": "pdim"
   },
   "arrowDown": {
    "st": 48,
    "sh": 429,
    "ch": 300,
    "active": "pdim"
   },
   "pageDown": {
    "st": 129,
    "sh": 429,
    "ch": 300,
    "active": "pdim"
   },
   "arrowUp": {
    "st": 81,
    "sh": 429,
    "ch": 300,
    "active": "pdim"
   },
   "space": {
    "st": 129,
    "sh": 429,
    "ch": 300,
    "active": "pdim"
   },
   "ok": true
  }
 },
 "keys_pause_check (수리 후 c-keypause)": {
  "short_1440x420": {
   "start": {
    "cur": "1",
    "pause": "정지",
    "st": 0,
    "scrollable": true,
    "active": "pdim"
   },
   "afterKey": {
    "cur": "1",
    "pause": "재생",
    "st": 48,
    "scrollable": true,
    "active": "pdim"
   },
   "after9_5s": {
    "cur": "1",
    "pause": "재생",
    "st": 48,
    "scrollable": true,
    "active": "pdim"
   },
   "ok": true
  },
  "tall_1440x900": {
   "start": {
    "cur": "1",
    "pause": "정지",
    "st": 0,
    "scrollable": false,
    "active": "pdim"
   },
   "afterKey": {
    "cur": "1",
    "pause": "정지",
    "st": 0,
    "scrollable": false,
    "active": "pdim"
   },
   "after9_5s": {
    "cur": "2",
    "pause": "정지",
    "st": 0,
    "scrollable": false,
    "active": "pdim"
   },
   "ok": true
  },
  "rapidWrap": {
   "N": 4,
   "transitions": [
    [
     "0",
     "1",
     ""
    ],
    [
     "1",
     "-2",
     ""
    ],
    [
     "2",
     "-1",
     ""
    ],
    [
     "3",
     "0",
     ""
    ]
   ],
   "ok": true
  }
 },
 "codex 7차 (ab9160d)": "RELEASE: NO. 6차 슬릿 해결(36 crop 독립 재검사 0), 반증 P2 4 해결 + 빈 공간 수용 가능, 차단 P2 1 = .pdim 초점 키 스크롤이 자동 넘김을 안 멈춤 → 본 수리로 setPause. 비차단 관찰: --pbar-h 폴백은 최초 동기 측정 + resize, rAF 세대 검사 없음(→ 본 수리로 추가), Space 는 .pdim 초점일 때만, 스크린리더 가상 커서 실낭독 미검증"
}
[스크린샷] r7/shots/ 의 popnav_*.png, popup_pinned_1440.png, popup_pinned_390.png, joint_dsf2/joint_post_*.png. A/B 전후 = r7/shots/ab_pre, ab_post, 차이 crop = r7/diff_ab/. 6회차 스크린샷 = r6/shots/, 라이브 캡처 = r5/live/.

[채점 대상]
1. 팝업 무대 9렌즈 재채점(6차 35/45). 특히 L4(접합 단일선, 그림자), L6(넘김 안정), L7(짧은 화면, N≥3), L8(조작부 안정), L9(연타, 터치, 초점, 키 스크롤) 변화.
2. 대학 목록은 A/B 가 0 이면 5차 점수 유지로 적는다(tiles 필드에 5차 L 과 total 을 그대로, release true).
3. 6차 §5 P2(슬릿), Codex 6차 P2(슬릿), 반증 6차 P2 5건(아래 맞춤 빈 공간, 짧은 화면 하단바 잘림, N≥3 감아 돌기, 초점 틀 스크롤, 폭 600 미만 높이 330 이하 하단바 둘째 줄) 각각 resolved 여부 + 근거.
4. 프로브 issues 를 릴리스 차단(P1)인지 다음 회차(P2)인지 판정.
릴리스 기준 = 각 면 총점 31 이상 + 렌즈1 ≥ 4 + 렌즈8 ≥ 3 + 렌즈9 ≥ 3, 그리고 릴리스 전 P1 0건.

[출력] 700단어 이내 markdown, §1 팝업 무대 점수와 판정 / §2 대학 목록(유지 근거 한 줄) / §3 수리 확인 표 / §4 릴리스 전 P1(파일:행과 수정안 한 줄, 없으면 「없음」) / §5 P2 / §6 슬롭 16뿌리와 잔상 7축 / §7 토큰 위배. §1 말미에 「Codex X1 병렬 채점 = 메인 세션이 CLI 로 별도 발주, 메인 세션이 병합」 한 줄. 산문 은유와 가운뎃점 금지. 말미에 JSON 코드 블록 1개: {"popup":{"L":[9정수],"total":합,"release":bool,"top_defect":"..."},"tiles":{...},"fixes":[{"id":"...","resolved":bool,"evidence":"..."}],"p1":[],"p2":[],"slop_afterimage":"...","token_violations":[]}. 파일 수정 금지, 점수 없는 평가 금지. 리포 추적 파일 수정과 git 쓰기 금지, 서버(8092 워크트리, 8799 모킹)는 그대로 쓴다. Playwright 로 직접 재실측할 때는 r7/critic_*.mjs 로 저장.
