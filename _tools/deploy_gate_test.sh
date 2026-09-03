#!/bin/sh
# deploy_gate.sh 양방향 시험 v2 (5군). 기대 FAIL 이 PASS 하거나 기대 PASS 가 FAIL 하면 종료 1.
#   1군 live_gen 파싱(curl 을 함수로 스텁)  2군 gate_pre(실 리포 git 객체 읽기 전용 + fetch, 라이브 마커는 STUB_GEN)
#   3군 gate_post(스텁)  4군 gen_write(임시 리포)  5군 잠금 + deploy.sh 흐름(임시 리포, 원격 없음)
REPO="${REPO:-$HOME/Workspace/hyunhak-site}"
HERE="$(cd "$(dirname "$0")" && pwd)"
GATE="$HERE/deploy_gate.sh"
TMPROOT=$(mktemp -d "${TEST_TMP:-${TMPDIR:-/tmp}}/gate_test.XXXXXX")
trap 'rm -rf "$TMPROOT"' EXIT
n=0; bad=0
ok() { n=$((n+1)); if [ "$2" = "$3" ]; then m=ok; else m=MISMATCH; bad=$((bad+1)); fi; printf '%-2s %-52s exp=%-8s got=%-8s %s\n' "$n" "$1" "$2" "$3" "$m"; }

echo "== 1군 live_gen 파싱 (curl 스텁) =="
( . "$GATE"
  curl() { printf '%s' "$CURL_OUT"; return "${CURL_RC:-0}"; }
  SHA=0123456789abcdef0123456789abcdef01234567
  t() { name=$1; exp=$2; CURL_OUT=$3; CURL_RC=${4:-0}; got=$(live_gen); ok "$name" "$exp" "${got:-<빈값>}"; }
  t "P1 본문 sha+개행, 200"            "$SHA"    "$(printf '%s\n\n200' "$SHA")"
  t "P2 본문 sha 개행 없음, 200"        "$SHA"    "$(printf '%s\n200' "$SHA")"
  t "P3 본문 sha CRLF, 200"            "$SHA"    "$(printf '%s\r\n\n200' "$SHA")"
  t "P4 빈 본문, 200"                  "<빈값>"  "$(printf '\n200')"
  t "P5 본문 sha, 404"                 "<빈값>"  "$(printf '%s\n\n404' "$SHA")"
  t "P6 본문 2줄(sha+ERROR), 200"      "INVALID" "$(printf '%s\nERROR\n\n200' "$SHA")"
  t "P7 본문 sha+빈줄 2개, 200"        "INVALID" "$(printf '%s\n\n\n200' "$SHA")"
  t "P8 curl 실패 rc 7"                "<빈값>"  "" 7
  t "P9 본문 sha, 301(리디렉션)"        "<빈값>"  "$(printf '\n301')"
  if grep -q 'curl -q -s' "$GATE"; then g=yes; else g=no; fi; ok "P10 curl -q 가 첫 인자(.curlrc 무시)" yes "$g"
  echo "$n $bad" > "$TMPROOT/c1" )
read n bad < "$TMPROOT/c1"

echo "== 2군 gate_pre (실 리포, STUB_GEN) =="
( cd "$REPO"; . "$GATE"
  live_gen() { printf '%s' "${STUB_GEN:-}"; return 0; }
  OM=$(git fetch -q origin main && git rev-parse origin/main)
  GOOD=$OM; OLD=0b9ad03; UNKNOWN=0123456789abcdef0123456789abcdef01234567
  run() { name=$1; exp=$2; head=$3; stub=$4; shift 4
    if ( export STUB_GEN="$stub"; for kv in "$@"; do export "$kv"; done; gate_pre "$head" >/dev/null 2>&1 ); then got=PASS; else got=FAIL; fi
    ok "$name [HEAD=$(git rev-parse --short "$head") live=$(printf '%s' "$stub" | cut -c1-9)]" "$exp" "$got"; }
  run "A 정상: origin 포함 + 라이브=origin"              PASS "$GOOD" "$OM"
  run "B 회귀 재현: HEAD 가 origin 뒤처짐(0b9ad03)"      FAIL "$OLD"  "$OM"
  run "C 라이브 세대가 HEAD 조상 아님"                    FAIL "$OLD"  "$OM" ALLOW_BEHIND=1
  run "D1 라이브 마커 없음(404)"                          FAIL "$GOOD" ""
  run "D2 라이브 마커 없음 + ALLOW_NO_GEN=1"              PASS "$GOOD" "" ALLOW_NO_GEN=1
  run "E 라이브 세대를 리포가 모름"                       FAIL "$GOOD" "$UNKNOWN"
  run "F1 라이브 -dirty 는 기본 FAIL(검증 불가)"          FAIL "$GOOD" "$OM-dirty"
  run "F2 라이브 -dirty + ALLOW_NO_GEN=1 기반 조상 OK"    PASS "$GOOD" "$OM-dirty" ALLOW_NO_GEN=1
  run "F3 -dirty 우회해도 기반 비조상은 FAIL"             FAIL "$OLD"  "$OM-dirty" ALLOW_NO_GEN=1 ALLOW_BEHIND=1
  run "G 우회 2종으로 B 통과(우회가 살아있는지)"          PASS "$OLD"  "" ALLOW_BEHIND=1 ALLOW_NO_GEN=1
  run "H 라이브 200 인데 본문이 HTML(형식 불일치)"       FAIL "$GOOD" "<!DOCTYPEhtml><html>"
  run "I 우회 변수가 빈 문자열이면 우회 아님"              FAIL "$OLD"  "$OM" ALLOW_BEHIND=
  run "J 라이브 sha 가 축약형(7자)이면 형식 불일치"        FAIL "$GOOD" "$(git rev-parse --short "$OM")"
  run "K1 ALLOW_NO_GEN=0 은 우회 아님(값 검사)"           FAIL "$GOOD" "" ALLOW_NO_GEN=0
  run "K2 ALLOW_BEHIND=yes 는 오타로 중단"                FAIL "$OLD"  "$OM" ALLOW_BEHIND=yes
  run "K3 정상 입력 + ALLOW_NO_GEN=true 도 중단"          FAIL "$GOOD" "$OM" ALLOW_NO_GEN=true
  run "L 라이브 본문 INVALID(2줄) 는 형식 불일치"          FAIL "$GOOD" "INVALID"
  run "M HEAD 인자가 못 푸는 rev"                          FAIL "zzzz_nonexistent" "$OM" 2>/dev/null
  echo "$n $bad" > "$TMPROOT/c2" ) 2>/dev/null
read n bad < "$TMPROOT/c2"

echo "== 3군 gate_post (STUB_GEN) =="
( cd "$REPO"; . "$GATE"
  live_gen() { printf '%s' "${STUB_GEN:-}"; return 0; }
  X=0123456789abcdef0123456789abcdef01234567; Y=fedcba9876543210fedcba9876543210fedcba98
  pt() { name=$1; exp=$2; want=$3; stub=$4; shift 4; s=$(date +%s)
    if ( export STUB_GEN="$stub"; for kv in "$@"; do export "$kv"; done; gate_post "$want" >/dev/null 2>&1 ); then got=PASS; else got=FAIL; fi
    e=$(( $(date +%s) - s )); ok "$name (${e}s)" "$exp" "$got"; }
  pt "Q1 일치 즉시 PASS"                       PASS "$X" "$X"
  pt "Q2 불일치 GEN_WAIT=0 → FAIL"             FAIL "$X" "$Y" GEN_WAIT=0
  pt "Q3 GEN_WAIT=x 비정수 → 즉시 FAIL(무한루프 아님)" FAIL "$X" "$Y" GEN_WAIT=x
  pt "Q4 기대값 빈값 + 라이브 404 → FAIL(거짓 PASS 차단)" FAIL "" ""
  pt "Q5 기대값 축약형 → FAIL"                  FAIL "abc1234" "abc1234"
  pt "Q6 -dirty 기대값 일치 PASS"               PASS "$X-dirty" "$X-dirty"
  echo "$n $bad" > "$TMPROOT/c3" )
read n bad < "$TMPROOT/c3"

echo "== 4군 gen_write (임시 리포) =="
mk_repo() { d=$1; mkdir -p "$d"; ( cd "$d" && git init -q && git config user.email t@t && git config user.name t
  printf '_gen.txt\n*.log\n' > .gitignore; printf '_design/\n*.py\n.DS_Store\n.gitignore\n.assetsignore\n' > .assetsignore
  echo hi > index.html; git add -A && git commit -qm init ); }
( . "$GATE"
  R="$TMPROOT/w"; mk_repo "$R"; cd "$R"; SHA=$(git rev-parse HEAD)
  gw() { name=$1; exp=$2; expm=$3; shift 3; rm -f _gen.txt
    if ( for kv in "$@"; do export "$kv"; done; gen_write >/dev/null 2>&1 ); then got=PASS; else got=FAIL; fi
    m=$(cat _gen.txt 2>/dev/null); [ -z "$expm" ] || ok "$name 마커" "$expm" "${m:-<없음>}"; ok "$name" "$exp" "$got"; }
  gw "W1 clean 트리"                            PASS "$SHA"
  mkdir -p _design; echo x > _design/junk.txt; touch .DS_Store; echo y > tool.py
  gw "W2 미추적이지만 .assetsignore 안(안 실림)" PASS "$SHA"
  echo z > injected.js
  gw "W3 미추적 업로드 파일 injected.js"         FAIL ""
  gw "W3b 같은 상태 + ALLOW_DIRTY=1"             PASS "$SHA-dirty" ALLOW_DIRTY=1
  gw "W3c 같은 상태 + ALLOW_DIRTY=0 은 중단"      FAIL "" ALLOW_DIRTY=0
  rm injected.js; echo a > a.log
  gw "W4 gitignore 된 a.log 도 실리므로 dirty"    FAIL ""
  rm a.log; echo changed > index.html
  gw "W5 추적 파일 수정"                          FAIL ""
  gw "W5b 추적 수정 + ALLOW_DIRTY=1"              PASS "$SHA-dirty" ALLOW_DIRTY=1
  git checkout -q index.html; printf 'stale\n' > _gen.txt
  if ( gen_write >/dev/null 2>&1 ); then got=PASS; else got=FAIL; fi; ok "W6 남은 _gen.txt 는 dirty 로 안 셈" PASS "$got"; ok "W6 마커 덮어씀" "$SHA" "$(cat _gen.txt)"
  rm -f .assetsignore
  gw "W7 .assetsignore 없으면 중단"                FAIL ""
  echo "$n $bad" > "$TMPROOT/c4" )
read n bad < "$TMPROOT/c4"

echo "== 5군 잠금 + deploy.sh 흐름 (임시 리포, 원격 없음) =="
( R="$TMPROOT/l"; mk_repo "$R"; mkdir -p "$R/_tools"; cp "$HERE/deploy.sh" "$HERE/deploy_gate.sh" "$R/_tools/"; cd "$R"
  mkdir .git/deploy.lock; echo "pid=1 test" > .git/deploy.lock/owner
  out=$(sh _tools/deploy.sh 2>&1); rc=$?
  ok "K1 잠금 있으면 즉시 중단 rc=1" 1 "$rc"; if printf '%s' "$out" | grep -q '다른 배포 실행 중'; then g=yes; else g=no; fi; ok "K1 메시지에 잠금 안내" yes "$g"
  if printf '%s' "$out" | grep -q 'fetch'; then g=reached; else g=not; fi; ok "K1 gate_pre 까지 안 감" not "$g"
  ok "K1 남의 잠금은 안 지움" yes "$( [ -d .git/deploy.lock ] && echo yes || echo no )"
  rm -rf .git/deploy.lock
  out=$(sh _tools/deploy.sh 2>&1); rc=$?
  ok "K2 잠금 없음 → gate_pre 진입, 원격 없어 FAIL rc=1" 1 "$rc"; if printf '%s' "$out" | grep -q 'fetch 실패'; then g=yes; else g=no; fi; ok "K2 fetch 실패 메시지" yes "$g"
  ok "K2 실패 종료 뒤 잠금 해제(trap)" no "$( [ -d .git/deploy.lock ] && echo yes || echo no )"
  ok "K2 _gen.txt 잔존 없음" no "$( [ -f _gen.txt ] && echo yes || echo no )"
  # worktree 에서 같은 잠금을 보는가. 이 잠금은 owner 파일 없이(K1 은 있음) = set -e 아래 cat 실패로 조용히 죽던 결함 고정
  git worktree add -q --detach wt HEAD 2>/dev/null; mkdir -p wt/_tools; cp _tools/deploy.sh _tools/deploy_gate.sh wt/_tools/; mkdir .git/deploy.lock
  out=$(cd wt && sh _tools/deploy.sh 2>&1); rc=$?
  ok "K3 worktree 에서도 main 의 잠금을 봄" 1 "$rc"; if printf '%s' "$out" | grep -q '다른 배포 실행 중'; then g=yes; else g=no; fi; ok "K3 메시지" yes "$g"
  rm -rf .git/deploy.lock
  echo "$n $bad" > "$TMPROOT/c5" )
read n bad < "$TMPROOT/c5"

echo "케이스 $n, 불일치 $bad"
[ "$bad" = 0 ]
