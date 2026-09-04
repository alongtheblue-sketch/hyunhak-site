# hyunhak.com SEO / GEO / AEO 운영 문서 (2026-08-23 s10)

## 1. 구조
- 정적 HTML(GitHub Pages) + 결정론 도구 `_tools/`. 원장 = `_tools/seo_manifest.json`(87면, 경로별 title, description, type, priority, breadcrumb, schema, answer).
- 페이지 head 의 `<!-- seo:begin -->…<!-- seo:end -->` 블록 1개가 SEO 전부를 담는다. 손편집 금지, 원장 수정 후 `_tools/seo_inject.py`.
- 파이프라인 = `_tools/build_all.sh` (가이드북 생성 → nav → 폰트 → SEO/AEO 주입 → sitemap/robots/llms → 검증). 2회 실행 트리 해시 동일.

## 2. SEO
- canonical 절대 URL, og/twitter, robots(noindex 7면: cart, checkout, login, join, my, pay_done, reader, 404).
- JSON-LD @graph: Organization(玄學的 硏究所 alternateName) + WebSite + WebPage + BreadcrumbList + 타입별(Product = 가이드북 38, 전권 3 / Article = 아카이브 26 / FAQPage = faq 14문답 / ItemList = 홈).
- sitemap.xml 79 URL(lastmod = git 커밋 시각), priority 홈 1.0 > 허브 0.9 > 상품 0.8 > 아카이브 0.7 > 유틸 0.3.
- 성능: 외부 폰트 CSS preload 승격. Lighthouse(로컬) 홈·가이드북·FAQ 100/100/100/100.

## 3. GEO (생성형 검색 인용)
- `llms.txt`(서비스 요약, 상품 3군, 가격, 경로) + `llms-full.txt`(79면 제목·설명·URL).
- 사실 문장 원칙: 숫자는 실측(판매 31권, 1,139면, 3,934문항, 26교, 3교), 출처 구분(공식/관측), 은유·대구 0.
- about.html = 조직 설명 정본(이름 한자 玄, 만드는 방식, 한계).

## 4. AEO (답변 엔진)
- 주요 69면 pagehead 끝에 `<p class="aeo-answer">` 직답 40~110자(가시 텍스트, 숨김 금지). 홈·LP·커머스는 히어로 리드가 직답.
- faq.html `<details class="faq">` → FAQPage 자동 추출.

## 5. 검증 (`_tools/seo_check.py`, 8항목)
manifest 등재 / seo 블록·ld+json 1개 / JSON-LD 파싱·필수필드 / canonical 일치 / 내부 링크 dead 0 / sitemap == 색인 / title 유일·description 70~110·answer 40~110·가운뎃점 0 / img alt.

## 6. 남은 일
- `site.same_as`(SNS 개설 시), `date_published`(아카이브·가이드북 갱신일), Google Search Console·네이버 서치어드바이저 등록(사이트맵 제출), GA4(HS-10 선행), 사업자 표기 실값(HS-9) 후 Organization 에 address/telephone 추가.
