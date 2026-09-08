#!/bin/sh
# 사이트 빌드 파이프라인 (순서 고정). 2회 연속 실행 시 트리 해시 동일 = 멱등.
#   1 가이드북 판매 31권 생성(비판매 7권은 면 없음, 2026-09-04) → 1b 아카이브 26면 v2 변환(멱등) → 2 nav/footer 통일(v2 셸) → 3 폰트 비차단 → 3b 분석 태그(GA4, 네이버 로그분석) → 4 SEO/AEO 주입 → 5 sitemap/robots/llms → 6 검증(seo_check + v2_check … 6i link_check + 6j worker_check)
# build_guidebook.py verify 는 후공정(3,4) 전 원본 기준이라 본 파이프라인 이후엔 FAIL 이 정상. 멱등 증명은 본 스크립트의 해시 비교로 한다.
set -e
cd "$(dirname "$0")/.."
SKIP="${SKIP_NAV:-}"   # 리더 세션 커밋(159b755) 후 전면 적용. reader.html 은 각 도구 EXCLUDE 고정
# 파이프는 좌변 실패를 삼킨다 (| tail 의 exit 0 이 set -e 를 무력화). 출력을 변수로 받아 종료코드 보존
# 실패하면 마지막 줄 대신 전체 출력을 낸다 (2026-09-09: 종전엔 실패한 게이트의 FAIL 줄이 _o 안에 갇혀 무엇이 죽였는지 안 보였다)
tail1() { _o=$("$@") || { printf '%s\n' "$_o"; return 1; }; printf '%s\n' "$_o" | tail -1; }
head1() { _o=$("$@"); printf '%s\n' "$_o" | head -1; }
python3 _tools/build_guidebook.py build >/dev/null
python3 _tools/build_interview_hub.py >/dev/null   # 1c 38개 대학 면접 형태 판정표 (SEARCH 표 원장, 2026-09-04)
python3 _tools/build_lectures.py >/dev/null   # 1d 인강 상품면 9종 = 목록 1 + 강좌 상세 6 + 인강실 1 (sets.json + lecture_catalog.json 스냅샷, 2026-09-06)
python3 _tools/apply_nav.py --skip "$SKIP"
python3 _tools/apply_footer.py --skip "$SKIP"
python3 _tools/apply_promo.py   # 2b 행사 배너: 상세 LP 4면 띠 + 홈 밴드 (v2 셸 밖 자리, _tools/promo.json 기간 안에서만. 2026-09-07)
python3 _tools/apply_fonts.py
python3 _tools/apply_noscript_rv.py   # 3c GS-24-1 스크립트 차단 시 .rv 폴백(base.css 면 전부, 멱등)
python3 _tools/apply_analytics.py
tail1 python3 _tools/seo_inject.py
tail1 python3 _tools/build_sitemap.py
tail1 python3 _tools/build_rss.py
tail1 python3 _tools/seo_check.py
head1 python3 _tools/v2_check.py
tail1 python3 _tools/guidebook_aeo_check.py   # 6b 답변엔진 대응 + 판매 방어선 (유료 본문 유출 0)
tail1 python3 _tools/apply_checkout_legal.py --check   # 6c 결제 면에 실린 약관 전문이 원천과 같은가
tail1 python3 _tools/apply_counts.py --check   # 6d 홈, about 의 문항 수와 면수가 meta v3 합과 같은가
tail1 python3 _tools/seo_keyword_census.py   # 6e 면접 검색어 포획 (면당 필수 구절 + 계열별 커버리지, 2026-09-04)
tail1 python3 _tools/build_samples.py --check   # 6f 상품면 지면 표본 13장이 현 판 clean PDF(sha)와 지면 참조에 맞는가 (2026-09-07 GB-V24-5 (C))
tail1 python3 _tools/build_brand_captions_v2.py --check   # 6g 브랜드 필름 v2(히어로 24s·정본 43s) 자막이 현 배포본(sha 봉인)의 텍스트 층 시각과 맞는가 (2026-09-08. v1 생성기 build_brand_captions.py 는 존치, 대본 슬롯이 v2 로 넘어가 --check 는 더 이상 안 돈다)
tail1 python3 _tools/caption_check.py   # 6h 사이트 영상 전건에 자막 트랙이 붙었고 그 파일이 실재하는가 (2026-09-07)
tail1 python3 _tools/link_check.py   # 6i 내부 링크·sitemap·llms·rss 깨짐 0 + git 삭제 면 전건이 워커 301 표에 있고 목적지가 실재하는가 (2026-09-09, GA4 「없는 면」 51회 재발 방지)
tail1 node _tools/worker_check.mjs   # 6j 워커 로컬 판정: 301 표 전건·정규화·favicon 200·404 원장 배선·UA 분류 (2026-09-09)
find . -name "*.html" -o -name "*.xml" -o -name "*.txt" | grep -v "^./.git/" | sort | xargs shasum -a 256 | shasum -a 256 | cut -c1-16
