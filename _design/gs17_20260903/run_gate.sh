#!/bin/zsh
# GS-17 게이트 실행기. 로컬 정적 서버를 PID 파일로 띄우고 게이트를 돌린 뒤 PID 로 죽인다.
#   zsh run_gate.sh [label]      (label 기본 before)
# 포트 8931 이 점유돼 있으면 8933 을 쓴다. pgrep -f 자기매칭은 쓰지 않는다.
set -u
DIR=/Users/gregory/Workspace/hyunhak-site/_design/gs17_20260903
ROOT=/Users/gregory/Workspace/hyunhak-site
LABEL=${1:-before}
PORT=8931
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[run_gate] port $PORT busy -> 8933" >&2
  PORT=8933
fi
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "[run_gate] port $PORT busy too, abort" >&2; exit 2; fi
PIDF="$DIR/server.pid"
nohup python3 -m http.server $PORT --bind 127.0.0.1 --directory "$ROOT" > "$DIR/server_$LABEL.log" 2>&1 &
echo $! > "$PIDF"
SPID=$(cat "$PIDF")
echo "[run_gate] server pid $SPID port $PORT" >&2
READY=0
for i in {1..50}; do
  if curl --noproxy '*' -s -o /dev/null "http://127.0.0.1:$PORT/index.html"; then READY=1; break; fi
  sleep 0.2
done
if [ $READY -ne 1 ]; then echo "[run_gate] server not ready" >&2; kill "$SPID" 2>/dev/null; rm -f "$PIDF"; exit 3; fi
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy node "$DIR/gate_gs17.mjs" "http://127.0.0.1:$PORT/" "$LABEL"
RC=$?
kill "$SPID" 2>/dev/null
sleep 0.5
if kill -0 "$SPID" 2>/dev/null; then kill -9 "$SPID" 2>/dev/null; sleep 0.3; fi
rm -f "$PIDF"
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[run_gate] WARN port $PORT still listening" >&2
else
  echo "[run_gate] server $SPID stopped, port $PORT free (gate rc=$RC)" >&2
fi
exit $RC
