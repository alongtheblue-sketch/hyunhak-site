#!/bin/sh
# 사이트 배포 원클릭 (v2, 2026-09-04): [0] 형상 게이트 → 빌드 → 워킹트리 clean 확인 → 세대 마커 → wrangler deploy → 마커 재프로브 → 엣지 스모크 → IndexNow → push.
# wrangler deploy 는 워킹트리 전체를 싣는다. 미커밋 변경이 있으면 멈춘다 (ALLOW_DIRTY=1 로 우회, 마커에 -dirty 가 붙는다).
# [0] 은 origin/main 과 라이브 _gen.txt 세대가 HEAD 의 조상일 때만 통과 (뒤 배포가 앞 배포를 되돌리는 회귀 차단). 우회 = ALLOW_BEHIND=1, ALLOW_NO_GEN=1 (첫 도입 1회).
# 스모크는 SMOKE_BASE 로 대상 변경 가능 (workers.dev 검증용). NO_POLICY=1 = CF AI bot policies 적용 전. NO_PUSH=1 = 배포 뒤 origin/main 갱신 생략.
set -e
cd "$(dirname "$0")/.."
. _tools/deploy_gate.sh
gate_pre
sh _tools/build_all.sh
if [ -z "$ALLOW_DIRTY" ] && [ -n "$(git status --porcelain | grep -v '^??')" ]; then
  echo "미커밋 변경 있음. 커밋 후 배포 (또는 ALLOW_DIRTY=1)"; git status --short; exit 1
fi
gen_write
trap gen_cleanup EXIT
npx wrangler deploy
gate_post
python3 _tools/edge_smoke.py ${SMOKE_BASE:+--base "$SMOKE_BASE"} ${NO_POLICY:+--no-policy}
[ -n "$SKIP_INDEXNOW" ] || python3 _tools/indexnow_ping.py
if [ -z "$NO_PUSH" ]; then
  git push origin HEAD:main || { echo "push 실패: 배포 중 다른 세션이 origin/main 을 밀었을 수 있음. 라이브는 이미 HEAD 다. git fetch 뒤 그 커밋을 병합해 재배포하거나, 그 세션이 이 HEAD 를 pull 하게 할 것"; exit 1; }
fi
