#!/bin/sh
# 사이트 배포 원클릭: 빌드 → 워킹트리 clean 확인 → wrangler deploy → 엣지 스모크 → IndexNow.
# wrangler deploy 는 워킹트리 전체를 싣는다. 미커밋 변경이 있으면 멈춘다 (ALLOW_DIRTY=1 로 우회).
# 스모크는 SMOKE_BASE 로 대상 변경 가능 (workers.dev 검증용). NO_POLICY=1 = CF AI bot policies 적용 전.
set -e
cd "$(dirname "$0")/.."
sh _tools/build_all.sh
if [ -z "$ALLOW_DIRTY" ] && [ -n "$(git status --porcelain | grep -v '^??')" ]; then
  echo "미커밋 변경 있음 — 커밋 후 배포 (또는 ALLOW_DIRTY=1)"; git status --short; exit 1
fi
npx wrangler deploy
python3 _tools/edge_smoke.py ${SMOKE_BASE:+--base "$SMOKE_BASE"} ${NO_POLICY:+--no-policy}
[ -n "$SKIP_INDEXNOW" ] || python3 _tools/indexnow_ping.py
