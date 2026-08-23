#!/bin/sh
# 사이트 빌드 파이프라인 (순서 고정). 2회 연속 실행 시 트리 해시 동일 = 멱등.
#   1 가이드북 38권 생성 → 2 nav 통일 → 3 폰트 비차단 → 4 SEO/AEO 주입 → 5 sitemap/robots/llms → 6 검증
# build_guidebook.py verify 는 후공정(3,4) 전 원본 기준이라 본 파이프라인 이후엔 FAIL 이 정상. 멱등 증명은 본 스크립트의 해시 비교로 한다.
set -e
cd "$(dirname "$0")/.."
SKIP="${SKIP_NAV:-library.html,my.html}"
python3 _tools/build_guidebook.py build >/dev/null
python3 _tools/apply_nav.py --skip "$SKIP"
python3 _tools/apply_fonts.py
python3 _tools/seo_inject.py | tail -1
python3 _tools/build_sitemap.py | tail -1
python3 _tools/seo_check.py | tail -1
find . -name "*.html" -o -name "*.xml" -o -name "*.txt" | grep -v "^./.git/" | sort | xargs shasum -a 256 | shasum -a 256 | cut -c1-16
