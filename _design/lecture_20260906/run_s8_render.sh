#!/bin/sh
# s8 렌더 실측 러너: 사이트 루트를 :8813 으로 띄우고 measure_s8_render.mjs 를 돌린 뒤 서버를 내린다. 원격 쓰기 0.
cd "$(dirname "$0")/../.."
python3 -m http.server 8813 >/dev/null 2>&1 &
SP=$!
trap 'kill $SP 2>/dev/null' EXIT
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null http://localhost:8813/index.html && break; sleep 1; done
env -u NODE_OPTIONS -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy node _design/lecture_20260906/measure_s8_render.mjs http://localhost:8813
