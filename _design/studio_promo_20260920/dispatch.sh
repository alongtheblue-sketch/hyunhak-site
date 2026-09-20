#!/bin/zsh
# astra(codex gpt-6-astra, ultra) 발주 러너. 사용: ./dispatch.sh r2 [최대시도=3]
# - stdin 으로 BRIEF_<round>.md 전달 (긴 프롬프트 인자 금지 룰)
# - 프록시 env 해제 (codex CLI 는 rustls 라 프록시 MITM 인증서를 모른다)
# - "Selected model is at capacity" 로 끝나고 결과 파일이 없으면 90초 뒤 재시도 (r1 실측 2026-09-20)
set -u
ROUND="${1:?round}"; MAX="${2:-3}"
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE" || exit 2
BRIEF="BRIEF_${ROUND}.md"; OUT="${ROUND}/astra_${ROUND}_result.md"; LOG="${ROUND}/astra_${ROUND}_run.log"
[ -f "$BRIEF" ] || { echo "no $BRIEF"; exit 2; }
mkdir -p "$ROUND"
for i in $(seq 1 "$MAX"); do
  echo "=== attempt $i $(date '+%H:%M:%S') ===" >> "$LOG"
  CODEX_HOME="$HOME/.codex_leg" env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy \
    codex exec --skip-git-repo-check -s workspace-write -C "$HERE" -m gpt-6-astra -c model_reasoning_effort=ultra \
    -o "$OUT" - < "$BRIEF" >> "$LOG" 2>&1
  rc=$?
  echo "EXIT $rc attempt $i $(date '+%H:%M:%S')" >> "$LOG"
  if [ -s "$OUT" ]; then echo "DONE attempt $i rc=$rc"; exit 0; fi
  if tail -5 "$LOG" | grep -q "at capacity\|stream disconnected\|reconnect"; then
    echo "capacity/네트워크 오류, 90초 뒤 재시도 ($i/$MAX)"; sleep 90; continue
  fi
  echo "FAIL attempt $i rc=$rc (재시도 조건 아님)"; exit $rc
done
echo "FAIL: $MAX attempts"; exit 1
