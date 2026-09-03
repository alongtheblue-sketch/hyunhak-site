#!/bin/sh
# 배포 형상 게이트 (2026-09-04 신설, 같은 날 07시 Codex 2차 검토 8건 + 자체 1건 반영 = v2.1).
# 사고 = GS-17 세션이 01:27 철거 커밋(ffcc5fe) 없는 로컬 main(0b9ad03) 에서 deploy.sh 로 배포해 라이브가 38권 세대로 회귀.
# deploy.sh 가 source 한다. 시험 = _tools/deploy_gate_test.sh (5군 59건 양방향, 사본 ~/Workspace/hyunhak_deploy_gate_20260904/test_gate.sh).
#   lock_acquire      : 공용 .git/deploy.lock 을 mkdir 로 원자 잠금(worktree 끼리도 공유). 이미 있으면 1. lock_release 가 지운다(deploy.sh EXIT trap).
#   gate_pre [HEAD]   : (1) origin/main 이 HEAD 의 조상인가  (2) 라이브 _gen.txt 의 커밋이 HEAD 의 조상인가. 하나라도 아니면 1.
#                       우회 = ALLOW_BEHIND=1 (origin 뒤처짐 허용), ALLOW_NO_GEN=1 (라이브 마커 없음/모름/-dirty 허용, 기반 커밋 조상 검사는 유지).
#                       ALLOW_* 값은 1 만 인정한다. 0, yes, true 같은 다른 값은 오타로 보고 중단(fail closed).
#   gen_write         : 배포 트리가 HEAD 와 같은지 검사 = 추적 변경 + .assetsignore 밖의 미추적/무시 파일(wrangler 는 그 파일도 싣는다).
#                       다르면 1, ALLOW_DIRTY=1 이면 -dirty 접미사로 진행. _gen.txt = HEAD sha[-dirty] 를 자산으로 싣는다(git 추적 안 함). gen_cleanup 이 지운다.
#   gate_post [want]  : 라이브 _gen.txt 가 방금 쓴 값과 같아질 때까지 5초 간격 재시도(최대 GEN_WAIT 초, 기본 90, 0 이상 정수만). 끝내 다르면 1.
GEN_FILE="_gen.txt"
GEN_URL="${GEN_URL:-https://hyunhak.com/_gen.txt}"
GEN_UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 hyunhak-deploy'
GEN_EXPECT=""
GEN_LOCK=""

gate_fail() { echo "GATE FAIL: $*" >&2; return 1; }

# ALLOW_* 값 검사: 미설정(빈값) 또는 1 만 통과. 그 외는 중단.
allow_check() { case "$2" in ''|1) return 0;; *) gate_fail "$1 은 1 만 허용(받은 값 '$2'). 우회 의도면 $1=1"; return 1;; esac; }
allow_on() { [ "$1" = 1 ]; }

# 라이브 마커 읽기: 200 이면 본문(정확히 1줄, CR 제거)을, 본문이 2줄 이상이면 INVALID 를, 그 외(비200, curl 실패, 빈 본문)는 빈 문자열을 낸다. 항상 0 반환. 시험에서 덮어쓴다.
# curl -q = ~/.curlrc 무시(첫 인자여야 함). -L 없음 = 3xx 는 빈값(fail closed).
live_gen() {
  _b=$(curl -q -s -A "$GEN_UA" -H 'Cache-Control: no-cache' --max-time 20 -w '\n%{http_code}' "$GEN_URL?g=$(date +%s)" 2>/dev/null) || { printf ''; return 0; }
  _c=$(printf '%s' "$_b" | tail -1)
  _v=$(printf '%s' "$_b" | sed '$d' | awk '
    NR==1 { v=$0; sub(/\r$/, "", v) }
    NR==2 && $0!="" { bad=1 }
    NR>2 { bad=1 }
    END { if (bad) printf "INVALID"; else if (NR) printf "%s", v }')
  if [ "$_c" = 200 ]; then printf '%s' "$_v"; fi
  return 0
}

lock_acquire() {
  _cd=$(git rev-parse --git-common-dir) || { gate_fail "git 디렉터리를 찾을 수 없음"; return 1; }
  GEN_LOCK="$_cd/deploy.lock"
  if mkdir "$GEN_LOCK" 2>/dev/null; then
    printf 'pid=%s pwd=%s at=%s\n' "$$" "$PWD" "$(date '+%Y-%m-%dT%H:%M:%S')" > "$GEN_LOCK/owner"
    echo "[lock] $GEN_LOCK"
    return 0
  fi
  _o=$(cat "$GEN_LOCK/owner" 2>/dev/null || :)   # owner 없어도 set -e 로 죽지 않게(|| :). 없으면 아래 '소유자 미상'
  GEN_LOCK=""
  gate_fail "다른 배포 실행 중(잠금 .git/deploy.lock, ${_o:-소유자 미상}). 끝나길 기다리거나, 그 프로세스가 죽은 게 확실하면 잠금 디렉터리를 지우고 재실행"
}
lock_release() {
  if [ -n "$GEN_LOCK" ] && [ -d "$GEN_LOCK" ]; then rm -f "$GEN_LOCK/owner"; rmdir "$GEN_LOCK" 2>/dev/null || :; fi
  GEN_LOCK=""
  return 0
}

gate_pre() {
  head=$(git rev-parse --verify "${1:-HEAD}^{commit}" 2>/dev/null) || { gate_fail "'${1:-HEAD}' 를 커밋으로 풀 수 없음"; return 1; }
  allow_check ALLOW_BEHIND "${ALLOW_BEHIND:-}" || return 1
  allow_check ALLOW_NO_GEN "${ALLOW_NO_GEN:-}" || return 1
  if ! git fetch -q origin '+refs/heads/main:refs/remotes/origin/main'; then gate_fail "origin fetch 실패(네트워크). 조상 검사 불가, 배포 중단"; return 1; fi
  om=$(git rev-parse --verify 'refs/remotes/origin/main^{commit}' 2>/dev/null) || { gate_fail "origin/main 을 풀 수 없음(fetch 뒤에도)"; return 1; }
  if git merge-base --is-ancestor "$om" "$head"; then mb=0; else mb=$?; fi
  case "$mb" in
    0) echo "[0] origin/main $(git rev-parse --short "$om") 은 HEAD $(git rev-parse --short "$head") 의 조상 OK";;
    1) if allow_on "${ALLOW_BEHIND:-}"; then echo "[0] WARN: origin/main $(git rev-parse --short "$om") 이 HEAD 조상 아님, ALLOW_BEHIND=1 로 진행"
       else gate_fail "origin/main $(git rev-parse --short "$om") 이 HEAD $(git rev-parse --short "$head") 의 조상이 아님. 다른 세션이 배포하고 push 한 커밋이 빠진 채 나가면 라이브가 되돌아간다. git pull --rebase 뒤 재배포 (우회 ALLOW_BEHIND=1)"; return 1; fi;;
    *) gate_fail "merge-base 오류(rc $mb). 조상 판정 불가, 배포 중단"; return 1;;
  esac
  lg=$(live_gen)
  if [ -n "$lg" ] && ! printf '%s' "$lg" | grep -Eq '^[0-9a-f]{40}(-dirty)?$'; then
    gate_fail "라이브 $GEN_FILE 응답이 커밋 sha 1줄이 아님: '$(printf '%s' "$lg" | cut -c1-60)'. 캐시, 차단 페이지, 잘못된 자산 여부 확인"; return 1
  fi
  case "$lg" in *-dirty)
    if allow_on "${ALLOW_NO_GEN:-}"; then echo "[0] WARN: 라이브 세대가 -dirty(미커밋 내용 포함 배포). ALLOW_NO_GEN=1 로 기반 커밋만 조상 검사, 그 미커밋분은 이번 배포로 덮인다"; lg=${lg%-dirty}
    else gate_fail "라이브 세대가 -dirty(미커밋 내용 포함 배포). 라이브에 무엇이 실려 있는지 검증 불가. 그 배포를 낸 세션의 커밋 여부를 확인한 뒤 ALLOW_NO_GEN=1"; return 1; fi;;
  esac
  if [ -z "$lg" ]; then
    if allow_on "${ALLOW_NO_GEN:-}"; then echo "[0] WARN: 라이브 $GEN_FILE 없음, ALLOW_NO_GEN=1 로 진행(첫 도입 또는 deploy.sh 밖 배포 뒤)"
    else gate_fail "라이브 $GEN_FILE 없음(404 또는 무응답). 마지막 배포가 deploy.sh 밖에서 나갔거나 첫 도입. 라이브 형상을 눈으로 확인한 뒤 ALLOW_NO_GEN=1"; return 1; fi
  elif git cat-file -e "$lg^{commit}" 2>/dev/null; then
    if git merge-base --is-ancestor "$lg" "$head"; then mb=0; else mb=$?; fi
    case "$mb" in
      0) echo "[0] 라이브 세대 $(git rev-parse --short "$lg") 은 HEAD 의 조상 OK";;
      1) gate_fail "라이브 세대 $(git rev-parse --short "$lg") 가 HEAD 의 조상이 아님. 이 배포는 라이브에 있는 커밋을 되돌린다. 그 커밋을 병합한 뒤 재배포"; return 1;;
      *) gate_fail "merge-base 오류(rc $mb). 조상 판정 불가, 배포 중단"; return 1;;
    esac
  else
    if allow_on "${ALLOW_NO_GEN:-}"; then echo "[0] WARN: 라이브 세대 $lg 를 로컬 리포가 모름, ALLOW_NO_GEN=1 로 진행"
    else gate_fail "라이브 세대 $lg 를 로컬 리포가 모름(fetch 뒤에도). push 없이 다른 리포/worktree 에서 나간 커밋. 출처 확인 뒤 ALLOW_NO_GEN=1"; return 1; fi
  fi
  return 0
}

gen_write() {
  allow_check ALLOW_DIRTY "${ALLOW_DIRTY:-}" || return 1
  _sha=$(git rev-parse --verify 'HEAD^{commit}' 2>/dev/null) || { gate_fail "HEAD 를 커밋으로 풀 수 없음"; return 1; }
  _t=$(git status --porcelain --untracked-files=no) || { gate_fail "git status 실패"; return 1; }
  [ -f .assetsignore ] || { gate_fail ".assetsignore 없음. 어떤 파일이 실리는지 판정 불가"; return 1; }
  _u=$(git ls-files --others --exclude-from=.assetsignore) || { gate_fail "git ls-files 실패"; return 1; }
  _u=$(printf '%s\n' "$_u" | grep -vx "$GEN_FILE" || :)
  _d=""
  if [ -n "$_t$_u" ]; then
    if allow_on "${ALLOW_DIRTY:-}"; then _d="-dirty"; echo "[gen] WARN: 배포 트리가 HEAD 와 다름, ALLOW_DIRTY=1 로 -dirty 배포"
    else
      gate_fail "배포 트리가 HEAD 와 다름(wrangler 는 워킹트리 전체를 싣는다). 커밋하거나 지우고 재배포 (우회 ALLOW_DIRTY=1, 마커에 -dirty)"
      { [ -n "$_t" ] && printf '%s\n' "$_t"; [ -n "$_u" ] && printf '%s\n' "$_u" | sed 's/^/?? /'; } | head -20 >&2
      return 1
    fi
  fi
  printf '%s%s\n' "$_sha" "$_d" > "$GEN_FILE"; GEN_EXPECT="$_sha$_d"
  echo "[gen] $GEN_FILE = $GEN_EXPECT"
}
gen_cleanup() { rm -f "$GEN_FILE"; }

gate_post() {
  want=${1:-$GEN_EXPECT}; wait=${GEN_WAIT:-90}; t=0
  printf '%s' "$want" | grep -Eq '^[0-9a-f]{40}(-dirty)?$' || { gate_fail "기대 마커가 sha 형식이 아님('${want:-빈값}'). gen_write 뒤에 호출해야 한다"; return 1; }
  case "$wait" in ''|*[!0-9]*) gate_fail "GEN_WAIT 는 0 이상 정수만('$wait')"; return 1;; esac
  [ ${#wait} -le 6 ] || { gate_fail "GEN_WAIT 가 너무 큼('$wait', 최대 999999)"; return 1; }
  while :; do
    got=$(live_gen)
    if [ "$got" = "$want" ]; then echo "[post] 라이브 $GEN_FILE = $(printf '%s' "$got" | cut -c1-7) 일치 (${t}s)"; return 0; fi
    if [ "$t" -ge "$wait" ]; then gate_fail "라이브 $GEN_FILE = '${got:-없음}' 이 기대 $want 와 다름(${wait}s 대기). 배포가 안 실렸거나 부분 실패. wrangler 출력과 routes 확인"; return 1; fi
    sleep 5; t=$((t+5))
  done
}
