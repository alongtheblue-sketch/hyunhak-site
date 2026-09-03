#!/bin/sh
# 배포 형상 게이트 (2026-09-04 신설). 사고 = GS-17 세션이 01:27 철거 커밋(ffcc5fe) 없는 로컬 main(0b9ad03) 에서 deploy.sh 로 배포해 라이브가 38권 세대로 회귀.
# deploy.sh 가 source 한다. 시험 = test_gate.sh (live_gen 을 스텁으로 갈아 끼워 7 케이스 양방향).
#   gate_pre [HEAD]   : (1) origin/main 이 HEAD 의 조상인가  (2) 라이브 _gen.txt 의 커밋이 HEAD 의 조상인가. 하나라도 아니면 1.
#                       우회 = ALLOW_BEHIND=1 (origin 뒤처짐 허용), ALLOW_NO_GEN=1 (라이브 마커 없음/모름 허용, 첫 도입 1회).
#   gen_write         : _gen.txt = HEAD sha(추적 미커밋 있으면 -dirty). 배포 자산으로 실린다(.assetsignore 미해당, git 추적 안 함). gen_cleanup 이 지운다.
#   gate_post [want]  : 라이브 _gen.txt 가 방금 쓴 값과 같아질 때까지 5초 간격 재시도(최대 GEN_WAIT 초, 기본 90). 끝내 다르면 1 (부분 실패, 전파 지연 검출).
GEN_FILE="_gen.txt"
GEN_URL="${GEN_URL:-https://hyunhak.com/_gen.txt}"
GEN_UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 hyunhak-deploy'
GEN_EXPECT=""

gate_fail() { echo "GATE FAIL: $*" >&2; return 1; }

# 라이브 마커 읽기: 200 이면 본문 첫 줄(공백 제거), 아니면 빈 문자열. 항상 0 반환. 시험에서 덮어쓴다.
live_gen() {
  _b=$(curl -s -A "$GEN_UA" -H 'Cache-Control: no-cache' --max-time 20 -w '\n%{http_code}' "$GEN_URL?g=$(date +%s)" 2>/dev/null) || { printf ''; return 0; }
  _c=$(printf '%s' "$_b" | tail -1)
  _v=$(printf '%s' "$_b" | sed '$d' | head -1 | tr -d '[:space:]')
  if [ "$_c" = 200 ]; then printf '%s' "$_v"; fi
  return 0
}

gate_pre() {
  head=${1:-$(git rev-parse HEAD)}
  if ! git fetch -q origin main; then gate_fail "origin fetch 실패(네트워크). 조상 검사 불가, 배포 중단"; return 1; fi
  om=$(git rev-parse origin/main)
  if git merge-base --is-ancestor "$om" "$head"; then
    echo "[0] origin/main $(git rev-parse --short "$om") 은 HEAD $(git rev-parse --short "$head") 의 조상 OK"
  elif [ -n "${ALLOW_BEHIND:-}" ]; then
    echo "[0] WARN: origin/main $(git rev-parse --short "$om") 이 HEAD 조상 아님, ALLOW_BEHIND=1 로 진행"
  else
    gate_fail "origin/main $(git rev-parse --short "$om") 이 HEAD $(git rev-parse --short "$head") 의 조상이 아님. 다른 세션이 배포하고 push 한 커밋이 빠진 채 나가면 라이브가 되돌아간다. git pull --rebase 뒤 재배포 (우회 ALLOW_BEHIND=1)"; return 1
  fi
  lg=$(live_gen)
  if [ -n "$lg" ] && ! printf '%s' "$lg" | grep -Eq '^[0-9a-f]{40}(-dirty)?$'; then
    gate_fail "라이브 $GEN_FILE 응답이 커밋 sha 형식이 아님: '$(printf '%s' "$lg" | cut -c1-60)'. 캐시·차단 페이지·잘못된 자산 여부 확인"; return 1
  fi
  case "$lg" in *-dirty) echo "[0] WARN: 라이브 세대가 -dirty(미커밋 내용 포함 배포). 그 미커밋분은 이번 배포로 덮인다";; esac
  lg=${lg%-dirty}
  if [ -z "$lg" ]; then
    if [ -n "${ALLOW_NO_GEN:-}" ]; then echo "[0] WARN: 라이브 $GEN_FILE 없음, ALLOW_NO_GEN=1 로 진행(첫 도입 또는 deploy.sh 밖 배포 뒤)"
    else gate_fail "라이브 $GEN_FILE 없음(404 또는 무응답). 마지막 배포가 deploy.sh 밖에서 나갔거나 첫 도입. 라이브 형상을 눈으로 확인한 뒤 ALLOW_NO_GEN=1"; return 1; fi
  elif git cat-file -e "$lg^{commit}" 2>/dev/null; then
    if git merge-base --is-ancestor "$lg" "$head"; then echo "[0] 라이브 세대 $(git rev-parse --short "$lg") 은 HEAD 의 조상 OK"
    else gate_fail "라이브 세대 $(git rev-parse --short "$lg") 가 HEAD 의 조상이 아님. 이 배포는 라이브에 있는 커밋을 되돌린다. 그 커밋을 병합한 뒤 재배포"; return 1; fi
  else
    if [ -n "${ALLOW_NO_GEN:-}" ]; then echo "[0] WARN: 라이브 세대 $lg 를 로컬 리포가 모름, ALLOW_NO_GEN=1 로 진행"
    else gate_fail "라이브 세대 $lg 를 로컬 리포가 모름(fetch 뒤에도). push 없이 다른 리포/worktree 에서 나간 커밋. 출처 확인 뒤 ALLOW_NO_GEN=1"; return 1; fi
  fi
  return 0
}

gen_write() {
  _sha=$(git rev-parse HEAD); _d=""
  if [ -n "$(git status --porcelain | grep -v '^??')" ]; then _d="-dirty"; fi
  printf '%s%s\n' "$_sha" "$_d" > "$GEN_FILE"; GEN_EXPECT="$_sha$_d"
  echo "[gen] $GEN_FILE = $GEN_EXPECT"
}
gen_cleanup() { rm -f "$GEN_FILE"; }

gate_post() {
  want=${1:-$GEN_EXPECT}; wait=${GEN_WAIT:-90}; t=0
  while :; do
    got=$(live_gen)
    if [ "$got" = "$want" ]; then echo "[post] 라이브 $GEN_FILE = $(printf '%s' "$got" | cut -c1-7) 일치 (${t}s)"; return 0; fi
    if [ "$t" -ge "$wait" ]; then gate_fail "라이브 $GEN_FILE = '${got:-없음}' 이 기대 $want 와 다름(${wait}s 대기). 배포가 안 실렸거나 부분 실패. wrangler 출력과 routes 확인"; return 1; fi
    sleep 5; t=$((t+5))
  done
}
