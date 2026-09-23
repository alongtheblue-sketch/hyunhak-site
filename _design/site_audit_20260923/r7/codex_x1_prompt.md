# hyunhak.com 릴리스 전 외부 검토 (7회차, 읽기 전용)

## 역할
너는 hyunhak.com 릴리스 전 외부 검토자다. 읽기 전용이다. 파일을 만들거나 고치지 않는다. 저장소 루트 = /Users/gregory/Workspace/_wt/hh-studio12 (git 워크트리, 브랜치 fix/popup-bar-r7, HEAD ab9160d).

## 대상
1. `git show ab9160d` : 재작업. 3d2ada3(하단바 무대 둘째 행 고정 + N>1 첫 초점 = 대화상자 틀, cherry-pick da0bc47) 위에 네 6차 지적과 반증 렌즈 P2 를 수리했다.
   - base.css .pbar margin-top:-1px (하단바 윗선이 활성 카드의 투명 아래 선 자리를 덮어 슬롯 합성 레이어와 하단바 사이 딤 1px 슬릿 제거)
   - app.js fitBar: 하단바 높이를 .pdim 의 --pbar-h 로 두고(ResizeObserver) base.css .pop max-height = min(72vh, 100vh - 2*16px - --pbar-h). 짧은 화면에서 카드 + 하단바가 뷰포트 안
   - app.js layout(): 칸 2 이상 옮기는 슬롯(N≥3 감아 돌기)은 transition none, |d|≥2 슬롯은 data-far(opacity 0)
   - app.js onArrow: 초점이 .pdim 일 때 ArrowDown/ArrowUp/PageDown/PageUp/Space 로 활성 카드 scrollBy
2. `git show 3d2ada3` : 기반 수리(이번 판에 그대로 포함). 라이브 96be167 의 팝업 코드는 94f577b 와 같다.

## 배경 (먼저 읽는다)
- 너의 6차 회신: /Users/gregory/Workspace/_wt/hh-studio12/_design/site_audit_20260923/r6/codex_x1_20260923.md (RELEASE: NO, 접합 슬릿 5/18 P2, 최소 수리안 = 카드 아래 테두리 폭 0 통일 + 측면 선 inset. 이번 판은 대신 하단바 margin-top -1px 겹침으로 풀었다. 이 선택의 위험을 판정하라)
- critic 6차: /Users/gregory/Workspace/_wt/hh-studio12/_design/site_audit_20260923/critic_r6_20260923.md (35/45 YES, §5 P2 슬릿 margin-top 안, 반증 렌즈 P2 5건: 아래 맞춤 빈 공간, 짧은 화면 하단바 잘림, N≥3 감아 돌기, 초점 틀 스크롤 불가, 폭 600 미만 높이 330 이하 하단바 둘째 줄)
- 아래 맞춤 빈 공간(짧은 카드가 활성일 때 위쪽 공백)은 이번에 고치지 않았다. 고정 하단바(→ 위치 불변)와 양립하지 않아 받아들인 trade-off 다. 이 판단이 맞는지도 말하라.

## 이번 자기 점검 실측 (메인 세션, 스크립트 = r7/quick_check.mjs, r7/probe_regress_joint.mjs, r7/extra_check.mjs)
첨부 이미지 = r7/shots/popup_pinned_1440.png, popup_pinned_390.png, 접합 crop r7/shots/joint_dsf2/joint_post_index_cur1_1440.png
```json
{
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
}
```

## 요구
(a) 6차 지적(접합 슬릿)과 반증 P2 5건이 각각 해결됐는지, 근거(파일:행)
(b) 이번 수리가 만든 새 회귀 후보: margin-top -1px 겹침이 카드 그림자·모서리·포커스 윤곽·하단바 첫 줄 hit 영역에 주는 영향, --pbar-h 가 0px 폴백일 때(ResizeObserver 없는 브라우저, 하단바 높이 변동 시점), transition none 이 reduce 설정·측면 카드 클릭·스와이프와 겹칠 때, data-far 슬롯의 pointer-events/inert, onArrow 의 Space 가 대화상자 안 버튼 초점과 충돌하는지(초점이 .pdim 일 때만 가로채는지), ArrowDown 가로채기가 스크린리더 가상 커서와 충돌하는지
(c) 릴리스 판정. 500단어 이내. 마지막 줄은 정확히 「RELEASE: YES」 또는 「RELEASE: NO」.
