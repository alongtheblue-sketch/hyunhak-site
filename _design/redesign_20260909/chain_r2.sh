#!/bin/sh
# R2 회수 게이트 사슬: build 2회 → 검증기 → 로컬 8791 서버 → after 캡처·계측 → verify_r2.mjs → style_gate → 서버 종료. 파이프 금지, 종료 코드 직접.
W="${W:-$HOME/Workspace/_wt/hh-r2}"; D="$W/_design/redesign_20260909"; cd "$W" || exit 9
echo "===== build x2"; sh _tools/build_all.sh > "$D/gate_build1.log" 2>&1; r1=$?; h1=$(tail -1 "$D/gate_build1.log")
sh _tools/build_all.sh > "$D/gate_build2.log" 2>&1; r2=$?; h2=$(tail -1 "$D/gate_build2.log")
echo "build rc=$r1/$r2 hash=$h1/$h2 same=$([ "$h1" = "$h2" ] && echo yes || echo NO)"
grep -E "FAIL|fails=|WARN|PASS" "$D/gate_build2.log" | grep -vE "FAIL 0|fails=0" | head -20
echo "===== server 8791"; (python3 -m http.server 8791 --bind 127.0.0.1 > "$D/http8791.log" 2>&1 & echo $! > "$D/http8791.pid"); sleep 1.5
echo "===== after shots"; node "$D/shots.mjs" http://127.0.0.1:8791/ "$D/after"; echo "shots rc=$?"
if [ -f "$D/verify_r2.mjs" ]; then echo "===== verify_r2"; BASE_URL=http://127.0.0.1:8791/ node "$D/verify_r2.mjs" http://127.0.0.1:8791/; echo "verify_r2 rc=$?"; else echo "verify_r2.mjs 없음"; fi
echo "===== style_gate (변경 html·템플릿)"; for f in $(git diff --name-only 8f9afab..HEAD -- '*.html' | grep -vE '^(terms|privacy|checkout|lectures|lectures/|guidebook/[a-z]+\.html)' ); do printf '%s: ' "$f"; python3 ~/unjang/_shared/style_gate/style_gate.py scan --gate-only "$f" 2>&1 | tail -1; done
echo "===== 금액 자기검사 (원장 밖 금액)"; grep -ohE "[0-9]{1,3}(,[0-9]{3})+원" index.html programs/guidebook.html programs/studio.html studio.html guidebook/index.html | sort | uniq -c | sort -rn | grep -vE "33,000|495,000|220,000|511,500|1,705,000|16,500|990,000|1,023,000|3,410,000|110,000|23,100|346,500|154,000|358,050|1,193,500|3,000|50,000"
kill "$(cat "$D/http8791.pid")" 2>/dev/null; echo "===== done"
