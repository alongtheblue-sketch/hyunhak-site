#!/bin/sh
# 개정 약관 게시 뒤 라이브 채증. 인자 = 공지일(YYYY-MM-DD). 토큰 3종 + 구 문안 0 + 공지 목록 제목 1.
set -e
PUB="$1"; [ -n "$PUB" ] || { echo "usage: verify_live.sh <publish-date>"; exit 2; }
T=$(curl -sf --max-time 15 https://hyunhak.com/terms.html)
fail=0
for tok in "제17조 제2항 각 호" "제1호 단서" "제17조 제5항" "생성형 인공지능 도구로 제작하고" "개정 공지: $PUB"; do
  n=$(printf '%s' "$T" | grep -c "$tok" || true); echo "$tok = $n"; [ "$n" -ge 1 ] || fail=1
done
n=$(printf '%s' "$T" | grep -c "상품이 훼손되지 않은 경우" || true); echo "구 문안 잔존 = $n"; [ "$n" -eq 0 ] || fail=1
N=$(curl -sf --max-time 15 'https://api.hyunhak.com/api/notices?kind=notice&limit=50')
n=$(printf '%s' "$N" | grep -c "이용약관 개정 안내" || true); echo "공지 목록 제목 = $n"; [ "$n" -ge 1 ] || fail=1
[ "$fail" -eq 0 ] && echo "LIVE PASS" || { echo "LIVE FAIL"; exit 1; }
