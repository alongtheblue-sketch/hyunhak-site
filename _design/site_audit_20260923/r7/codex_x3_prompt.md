# hyunhak.com 릴리스 전 외부 검토 (7회차 3차 확인, 읽기 전용)

너의 7회차 2차 회신 = /Users/gregory/Workspace/_wt/hh-studio12/_design/site_audit_20260923/r7/codex_x2_20260923.md (RELEASE: YES, e1955be). 저장소 루트 = /Users/gregory/Workspace/_wt/hh-studio12 (HEAD de88693). 읽기 전용, 파일 수정 금지.

그 뒤 반증 2렌즈(behavior, layout) 모두 blockers 0 (r7/refute_behavior.json summary, r7/refute_layout_verdict.json). behavior 렌즈가 P2 신규 회귀 1건을 냈다: N>1 첫 초점 .pdim 에서 End/Home 무반응. 라이브(96be167)는 첫 초점이 h2 라 브라우저 기본 End/Home 이 카드 스크롤에 닿았는데, 새 판은 onArrow 가 5종 키만 처리했다.
수리 = `git show de88693` (assets/app.js onArrow: 키 집합에 End|Home 추가, 스크롤 가능한 활성 카드에서 setPause 뒤 scrollTo 0 또는 scrollHeight, preventDefault, return). 실측 = r7/keys_endhome_check.json (1440x420 End 0→129/129 + 정지 단추 「재생」, Home →0, ArrowDown 48 뒤 Home 0 / 1440x900, 390x640 스크롤 불가 카드에서 키 무시 + 벨트 유지 / Tab 으로 카드 안 링크에 초점 뒤 End 는 defaultPrevented false), r7/keys_pause_check.json 3/3 유지.

요구: (a) 이 수리가 만드는 새 회귀 후보 — End/Home 이 .pdim 밖 초점 요소에서 가로채이는지, Shift 조합, isComposing, 스크롤 불가 카드에서 preventDefault 를 안 해 배경 문서가 스크롤되는지(기존 화살표 키와 같은 경로인지), 감아 돌기 go() 와의 상호작용 (b) 근거(파일:행) (c) 릴리스 판정. 250단어 이내. 마지막 줄은 정확히 「RELEASE: YES」 또는 「RELEASE: NO」.
