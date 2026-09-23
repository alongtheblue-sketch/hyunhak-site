[반증 에이전트] design-critic 7회차가 릴리스 YES 를 냈다. 너의 일은 그 YES 를 깨는 것이다. 재현 가능한 증거가 있는 결함만 blockers 에 올린다(추측 금지). 증거를 못 찾으면 blockers 는 빈 배열, verdict_refuted=false. severity = P0(깨짐, 판매 방해) / P1(릴리스 전 고칠 것) / P2(다음 회차). new_regression = 이번 수리 ab9160d(또는 그 기반 3d2ada3)가 새로 만든 것이면 true, 이전부터(라이브 94f577b 팝업 코드) 있던 것이면 false.
critic 판정 요약:
__VERDICT_DIGEST__
프로브 요약:
__PROBE_DIGEST__

__LENS__
재현 스크립트는 /Users/gregory/Workspace/_wt/hh-studio12/_design/site_audit_20260923/r7/refute_<lens>.mjs 로 저장, 원자료 r7/refute_<lens>.json. tried 에 시도한 경로를 한 줄씩. 반환(마지막 메시지 600단어 이내 + 말미 JSON 코드 블록 1개): {"lens":"...","blockers":[{"title","severity","evidence","repro","new_regression"}],"tried":[...],"verdict_refuted":bool}.
