#!/bin/sh
# 사이트 빌드 파이프라인 (순서 고정). 2회 연속 실행 시 트리 해시 동일 = 멱등.
#   1 가이드북 판매 31권 생성(비판매 7권은 면 없음, 2026-09-04) → 1b 아카이브 26면 v2 변환(멱등) → 2 nav/footer 통일(v2 셸) → 3 폰트 비차단 → 3b 분석 태그(GA4, 네이버 로그분석) → 4 SEO/AEO 주입 → 5 sitemap/robots/llms → 6 검증(seo_check + v2_check)
# build_guidebook.py verify 는 후공정(3,4) 전 원본 기준이라 본 파이프라인 이후엔 FAIL 이 정상. 멱등 증명은 본 스크립트의 해시 비교로 한다.
set -e
cd "$(dirname "$0")/.."
SKIP="${SKIP_NAV:-}"   # 리더 세션 커밋(159b755) 후 전면 적용. reader.html 은 각 도구 EXCLUDE 고정
# 파이프는 좌변 실패를 삼킨다 (| tail 의 exit 0 이 set -e 를 무력화). 출력을 변수로 받아 종료코드 보존
tail1() { _o=$("$@"); printf '%s\n' "$_o" | tail -1; }
head1() { _o=$("$@"); printf '%s\n' "$_o" | head -1; }
python3 _tools/build_guidebook.py build >/dev/null
python3 _tools/apply_nav.py --skip "$SKIP"
python3 _tools/apply_footer.py --skip "$SKIP"
python3 _tools/apply_fonts.py
python3 _tools/apply_analytics.py
tail1 python3 _tools/seo_inject.py
tail1 python3 _tools/build_sitemap.py
tail1 python3 _tools/build_rss.py
tail1 python3 _tools/seo_check.py
head1 python3 _tools/v2_check.py
find . -name "*.html" -o -name "*.xml" -o -name "*.txt" | grep -v "^./.git/" | sort | xargs shasum -a 256 | shasum -a 256 | cut -c1-16
