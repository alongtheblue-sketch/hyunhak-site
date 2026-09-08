# R2c 구현 보고서

기준: `f5bbd7324ecdc93b2026e05fb334ef98a30ae2d3`, 작업 트리 `/Users/gregory/Workspace/_wt/hh-r2b`, 브랜치 `redesign/20260909-r2b`.

FAQ 일치와 저장 실패 수리, 데스크톱 구매 영역 높이 조정을 구현했습니다. 수정 후 연속 빌드 2회는 exit 0, 해시 `7ea411bde5e0380d`로 동일합니다. 변경 HTML 5개는 모두 문체 A이며 FAQ 3면, 원천/오류 주입 10건, 저장 6건, 구매 10건, 프로모션 3건을 통과했습니다. 브라우저 좌표 검증은 미실행 BLOCKED입니다.

커밋: 0개. 이번 R2c 브리프의 “커밋은 본 세션 대리”에 따라 작업 트리 변경으로 인계합니다.

## 변경 파일 24개

코드/원천/생성면/검증 스크립트 19개, 실행 로그 4개, 보고서 1개입니다.

| 파일:줄 | 변경 요약 |
|---|---|
| [_tools/r2_faq.py:8](/Users/gregory/Workspace/_wt/hh-r2b/_tools/r2_faq.py:8) | 세 면의 문답 키 구성과 카피 조회, FAQ HTML 렌더를 공유합니다. |
| [_tools/build_programs.py:48](/Users/gregory/Workspace/_wt/hh-r2b/_tools/build_programs.py:48) | 상세 템플릿 FAQ 슬롯과 홈 FAQ를 같은 원천으로 재생성합니다. |
| [_tools/seo_inject.py:290](/Users/gregory/Workspace/_wt/hh-r2b/_tools/seo_inject.py:290) | 세 면만 공유 FAQ 원천을 사용하고 FAQ 노드만 유니코드 이스케이프로 직렬화합니다(356행). |
| [_tools/seo_manifest.json:2248](/Users/gregory/Workspace/_wt/hh-r2b/_tools/seo_manifest.json:2248) | 홈과 상세 2면의 고정 FAQ 배열 3개만 삭제했습니다(상세 항목 2755행, 2810행). |
| [_tools/program_guidebook_v2.html:50](/Users/gregory/Workspace/_wt/hh-r2b/_tools/program_guidebook_v2.html:50) | 저장 실패 안내 dataset을 추가하고 FAQ 본문을 공유 렌더 슬롯으로 바꿨습니다(71행). |
| [_tools/program_studio_v2.html:50](/Users/gregory/Workspace/_wt/hh-r2b/_tools/program_studio_v2.html:50) | 저장 실패 안내 dataset을 추가하고 FAQ 본문을 공유 렌더 슬롯으로 바꿨습니다(55행). |
| [_tools/r2_copy.json:26](/Users/gregory/Workspace/_wt/hh-r2b/_tools/r2_copy.json:26) | cart_failed_storage 문구 51자를 등록했습니다. |
| [_design/redesign_20260909/copy_ledger_v6.md:31](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/copy_ledger_v6.md:31) | 저장 실패 원인과 확인 방법 문구를 C1 근거, 글자 수와 함께 등재했습니다. |
| [assets/app.js:73](/Users/gregory/Workspace/_wt/hh-r2b/assets/app.js:73) | saveCart 성공 여부를 반환하며 신규 담기와 수량 증가의 저장 실패를 reason:storage로 전달합니다(92행, 100행). |
| [assets/product_buy.js:48](/Users/gregory/Workspace/_wt/hh-r2b/assets/product_buy.js:48) | storage 결과에 전용 실패 문구를 표시합니다. |
| [assets/base.css:1314](/Users/gregory/Workspace/_wt/hh-r2b/assets/base.css:1314) | 데스크톱 상품 상세 H1은 --t-h2, intro 상단 여백은 --s3로 조정했습니다. |
| [index.html:30](/Users/gregory/Workspace/_wt/hh-r2b/index.html:30) | 홈 FAQPage를 가시 본문 4문답과 동일하게 재생성했습니다. 본문은 바이트 동일합니다. |
| [programs/guidebook.html:31](/Users/gregory/Workspace/_wt/hh-r2b/programs/guidebook.html:31) | FAQPage를 3문답으로 재생성하고 저장 실패 dataset을 반영했습니다(94행). |
| [programs/studio.html:31](/Users/gregory/Workspace/_wt/hh-r2b/programs/studio.html:31) | FAQPage를 3문답으로 재생성하고 저장 실패 dataset을 반영했습니다(94행). |
| [_design/redesign_20260909/faq_ld_check.py:50](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/faq_ld_check.py:50) | 실제 HTML과 JSON-LD의 문답 수와 문면, 카피 원천 일치를 대조합니다. |
| [_design/redesign_20260909/test_faq_source.py:1](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/test_faq_source.py:1) | 원천 변경 전파 3건과 질문/답변/중복/누락/숨김/별도 노드/낡은 카피 오류 주입 7건을 검사합니다. |
| [_design/redesign_20260909/test_cart_storage.mjs:1](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/test_cart_storage.mjs:1) | 실제 HH와 구매 어댑터로 정상/실패/수량 증가/중복/반환 무시/재시도 6건을 검사합니다. |
| [_design/redesign_20260909/check_r2c.py:1](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/check_r2c.py:1) | R2b 고정 커밋 대비 FAQ 외 바이트, 보호 파일, 앱 변경 범위, 문안, 가격과 토큰을 대조합니다. |
| [_design/redesign_20260909/verify_r2.mjs:18](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/verify_r2.mjs:18) | korea/yonsei의 B1 및 promo만 SKIP하고 R2c 출력 폴더를 사용합니다. 버튼 전체 높이 조건은 유지합니다. |
| [_design/redesign_20260909/r2c_build_1.log:1](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/r2c_build_1.log:1) | 초기 빌드에서 발견한 문항 수 검사 실패 원문입니다. |
| [_design/redesign_20260909/r2c_build_2.log:1](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/r2c_build_2.log:1) | 수정 후 첫 성공 빌드 원문과 해시입니다. |
| [_design/redesign_20260909/r2c_build_3.log:1](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/r2c_build_3.log:1) | 수정 후 두 번째 성공 빌드 원문과 동일 해시입니다. |
| [_design/redesign_20260909/r2c_checks.log:1](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/r2c_checks.log:1) | 개별 검증기와 문체 검사 명령 및 출력 원문입니다. |
| [_design/redesign_20260909/IMPL_REPORT_R2c.md:1](/Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/IMPL_REPORT_R2c.md:1) | 구현 범위, 검증 증거와 브라우저 인계 명령을 기록합니다. |

## FAQ 생성과 보존 범위

가시 FAQ의 기존 4/3/3 문답 구성을 그대로 사용합니다. 질문 키뿐 아니라 답변의 `withdraw_text`, `trial_note`, `lecture_release`도 같은 `r2_copy.json`에서 읽습니다. FAQPage에서 사라지는 문답은 가시 본문에 없는 기존 문답이며, 홈 본문에 있는 출처 문답과 약관 참조 문답은 그대로 남습니다.

세 면은 FAQPage 노드 원문만 표시자로 치환한 뒤 전후 HTML을 바이트 비교했습니다. 상품 2면의 새 저장 실패 dataset 이외에는 차이가 없습니다. 다른 @graph 노드, title, description, canonical, og, 분석 태그, 폰트, 가격 구조, 필름이 보존됩니다. 나머지 63면은 파일 전체가 기준 커밋과 동일합니다. 별도 보호 파일 27개와 manifest의 FAQ 배열 외 바이트도 같습니다.

초기 빌드에서는 `apply_counts.py`가 HTML 원문에 실린 새 FAQ 질문까지 세어 “질문 3,865개”가 3건이라고 판정했습니다. 검증기는 고치지 않았습니다. 세 면의 FAQPage만 JSON 표준 유니코드 이스케이프로 출력해 가시 문구 계수와 충돌하지 않게 했고, JSON 파싱 후의 문답이 본문과 정확히 같음을 별도 검사했습니다. 수정 후 연속 빌드 두 번과 원천 변경 전파 검사가 모두 통과했습니다.

## APP_JS_REQUEST 집행 내역

R2c §2에서 승인한 최소 변경입니다. `saveCart(items)`는 저장 실패 시 false, 정상 저장 후 true를 반환합니다. `addToCart(item)`의 두 저장 지점은 실패 시 `ok:false, reason:"storage", message:등록 문구`를 반환하며 `trackAdd`에 도달하지 않습니다. 함수 인자와 공개 HH 객체, 나머지 함수 및 DOM 계약은 그대로입니다.

새 문구: “브라우저 저장소에 장바구니를 저장하지 못했습니다. 저장소 설정과 여유 공간을 확인해 주세요.” (51자, `cart_failed_storage`, C1)

기존 `saveCart` 호출부는 반환값을 무시해도 예외가 발생하지 않습니다. `addToCart` 반환값을 보지 않는 기존 가이드북 호출부도 발주대로 유지했습니다. 상세 2면은 storage 결과에 위 실패 문구를 표시하고, 정상 재시도에는 기존 성공 문구를 표시합니다.

## BASE_CSS 토큰 사용 변경

토큰 정의값 변경은 없습니다. 색상과 대비 수치도 동일합니다.

| 적용 범위 | 속성 | 기존 | 변경 |
|---|---|---|---|
| 데스크톱 `min-width:56.25em`, 상세 2면 `.r2-intro h1` | font-size | --t-h1 | --t-h2 |
| 같은 범위 `.r2-intro` | padding-top | --s4 | --s3 |

390×844에 적용되는 기존 모바일 CSS는 바이트 동일합니다. design-director의 3안 중 H1과 상단 여백을 함께 줄이는 C안을 적용했습니다. 1280에서 기존 2줄/행간이 유지되면 약 32.19px 감소하므로 버튼 하단은 819.8→약 787.61px로 예상됩니다. 이 값은 토큰 계산이며 브라우저 PASS 실측이 아닙니다.

`verify_r2.mjs`의 `primary fully in first viewport` 조건은 `box.y + box.height <= viewport.height`로 유지했습니다. korea/yonsei는 B1 검색 라벨과 promo 실패 검사에만 명시적 SKIP을 출력합니다. 전체 면 목록과 HTTP/overflow/console 검사는 유지합니다.

design-critic의 독립 정적 검토에서도 지정된 상세 2면에만 적용되고 모바일 규칙이 유지됨을 확인했습니다. H1은 구매 제목보다 크지만 하단 섹션 H2와 같은 크기가 되는 절충이 있습니다. 렌더 검증과 9렌즈 점수는 브라우저 BLOCKED로 보류했습니다.

## 실패 재현

수정 전 실행한 FAQ 검사의 출력입니다.

```text
$ python3 _design/redesign_20260909/faq_ld_check.py
FAIL index.html: JSON-LD=6 visible=4
FAIL programs/guidebook.html: JSON-LD=10 visible=3
FAIL programs/studio.html: JSON-LD=9 visible=3
faq_ld_check: pages=3 FAIL=3
exit=1
```

수정 전 실제 app.js를 로드한 저장 테스트는 정상 저장까지 통과하고, 예외 스텁에서 실패했습니다. 핵심 오류 원문입니다.

```text
$ node _design/redesign_20260909/test_cart_storage.mjs
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

true !== false
exit=1
```

## 전체 빌드 원문

첫 실행의 문항 수 실패도 삭제하지 않고 기록합니다. 최종 연속 성공 검증은 두 번째와 세 번째 실행입니다.

```text
$ sh _tools/build_all.sh > _design/redesign_20260909/r2c_build_1.log 2>&1
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 41 / nav 없음 0 / 레거시 0
변경 41
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 63 변경 35
analytics 주입 41 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 66면 처리, 43면 기록
sitemap.xml 55 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 55 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=61 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
FAIL index.html: /질문 ([\d,]+)개/ 매치 3건, 기대 2건 (문면 변경? 앵커 갱신 필요)
exit=1
```

```text
$ sh _tools/build_all.sh > _design/redesign_20260909/r2c_build_2.log 2>&1
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 41 / nav 없음 0 / 레거시 0
변경 41
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 63 변경 35
analytics 주입 41 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 66면 처리, 44면 기록
sitemap.xml 55 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 55 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=61 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 66 · sitemap 55 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
7ea411bde5e0380d
exit=0
```

```text
$ sh _tools/build_all.sh > _design/redesign_20260909/r2c_build_3.log 2>&1
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 41 / nav 없음 0 / 레거시 0
변경 41
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 63 변경 35
analytics 주입 41 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 66면 처리, 43면 기록
sitemap.xml 55 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 55 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=61 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 66 · sitemap 55 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
7ea411bde5e0380d
exit=0
```

## 개별 검증기와 문체 검사 원문

SEO FAIL은 0입니다. 기존 reader의 의도된 예외 WARN 3개가 남아 있으며, programs/studio는 S2 C-12 1건과 함께 등급 A입니다.

```text
$ python3 _tools/seo_check.py
검사                           결과    건수                 비고
-------------------------------------------------------------------
manifest 등재                  PASS  0 fail / 66        
seo 블록/ld+json 1개            PASS  0 fail / 65        
(a) JSON-LD 파싱/필수필드          WARN  0 fail, 1 warn / 66 
(b) canonical 일치             WARN  0 fail, 1 warn / 66 
(c) 내부 링크 dead               PASS  0 fail / 2403      
(d) sitemap == 색인 페이지        PASS  0 fail / 55        
(e2) robots 3범주              PASS  0 fail / 34        
(e3) sitemap URL robots 접근성  PASS  0 fail / 55        
(e) title 유일/description 길이  WARN  0 fail, 1 warn / 66 
(f) 이미지 alt 누락               PASS  0 fail             누락 0건
-------------------------------------------------------------------
FAIL 0건 / WARN 3건 / 검사 10항목
  [WARN] (a) JSON-LD 파싱/필수필드: reader.html: JSON-LD 없음 (skip 페이지)
  [WARN] (b) canonical 일치: reader.html: canonical 없음
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
exit=0
```

```text
$ python3 _tools/v2_check.py
v2_check: files=61 fails=0
exit=0
```

```text
$ python3 _tools/guidebook_aeo_check.py
검사                          통과  미달
--------------------------------------------------------------------------
S1 기출 노출 4개 이하          31/31   -
S2 규칙 노출 3개 이하          31/31   -
S3 전략 제목 8개 이하          31/31   -
A1 답변 문단 1개             31/31   -
A2 핵심 팩트 6줄 이상          31/31   -
A3 FAQ 8문 이상            31/31   -
G1 저자 노드                31/31   -
G2 대학 공식주소              31/31   -
G3 갱신일                  31/31   -
G4 인용 자리                31/31   -
G5 청약철회 정책              31/31   -
--------------------------------------------------------------------------
R1 관련 대학 묶음            186건  31면에서 원장 대조
--------------------------------------------------------------------------
면 31 / FAIL 0건
exit=0
```

```text
$ python3 _tools/apply_checkout_legal.py --check
최신 (terms a05229cb3d39, privacy f037c605661e)
exit=0
```

```text
$ python3 _tools/apply_counts.py --check
원장: 판매 31권, 기출 3,865문, 본문 1,198면
지면 = 원장 (낡음 0)
exit=0
```

```text
$ python3 _tools/build_samples.py --check
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
exit=0
```

```text
$ python3 _tools/build_brand_captions_v2.py --check
[hero] 자막 봉인 대조 통과(설계 원본 없는 트리)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
exit=0
```

```text
$ python3 _tools/caption_check.py
  확인  about.html:assets/video/brand_v2_full_aigen.webm  -> assets/video/brand_v2_full_aigen.vtt
  확인  classroom.html:assets/video/sample_common.mp4  -> assets/video/sample_common.vtt
  확인  index.html:(소스 없음)  -> assets/video/brand_v2_hero_aigen.vtt
  확인  lectures/common.html:../assets/video/sample_common.mp4  -> ../assets/video/sample_common.vtt
  확인  lectures/korea-hum.html:../assets/video/sample_korea-hum.mp4  -> ../assets/video/sample_korea-hum.vtt
  확인  lectures/korea-sci.html:../assets/video/sample_korea-sci.mp4  -> ../assets/video/sample_korea-sci.vtt
  확인  lectures/yonsei-hum.html:../assets/video/sample_yonsei-hum.mp4  -> ../assets/video/sample_yonsei-hum.vtt
  확인  lectures/yonsei-intl.html:../assets/video/sample_yonsei-intl.mp4  -> ../assets/video/sample_yonsei-intl.vtt
  확인  lectures/yonsei-sci.html:../assets/video/sample_yonsei-sci.mp4  -> ../assets/video/sample_yonsei-sci.vtt
  확인  lectures.html:assets/video/sample_common.mp4  -> assets/video/sample_common.vtt
  배선  assets/lecture.js  (회원 강의 플레이어. D1 vtt_key 로 트랙을 받아 Blob 으로 붙인다)
자막 게이트 통과: 영상 배선 11건, 면제 0건
exit=0
```

```text
$ python3 _tools/link_check.py
link_check: 면 66 · sitemap 55 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
exit=0
```

```text
$ node _tools/worker_check.mjs
PASS LEGACY_REDIRECTS 표 읽힘                                33건
PASS 표 전건 301 + Location 일치                               33/33
PASS 정규화 /interview/ → 301 /interview.html                301 https://hyunhak.com/interview.html
PASS 정규화 /store → 301 /guidebook/index.html               301 https://hyunhak.com/guidebook/index.html
PASS 정규화 /programs/ → 301 /programs/guidebook.html        301 https://hyunhak.com/programs/guidebook.html
PASS 정규화 /programs → 301 /programs/guidebook.html         301 https://hyunhak.com/programs/guidebook.html
PASS 정규화 /lectures/ → 301 /lectures.html                  301 https://hyunhak.com/lectures.html
PASS 정규화 /interview/korea → 301 /programs/korea.html      301 https://hyunhak.com/programs/korea.html
PASS 301 이 쿼리를 보존(utm → 목적지 ai_referrals)                 https://hyunhak.com/programs/korea.html?utm_source=chatgpt.com
PASS /interview (허브, 산 면) 200                             200
PASS 철거 7권 301 (기존 REMOVED_GUIDEBOOK 유지)                  301 https://hyunhak.com/guidebook/index.html
PASS 확장자 없는 경로 /faq 200 (기존 해석 유지)                        200
PASS /guidebook → 301 슬래시 (기존 유지)                         301 https://hyunhak.com/guidebook/
PASS www → apex 301 (기존 유지)                               301 https://hyunhak.com/
PASS /favicon.ico 200 image/png + 캐시                      200 image/png
PASS 없는 면 404 + 404.html 본문                               404 len=13552
PASS not_found INSERT 1건 (path, ref_host, ua_class=browser) [["/nope.html","chatgpt.com","browser"]]
PASS 원장 = 쿼리 제외 + ua_class ai_user                        [["/nope.html","","ai_user"]]
PASS ua_class ai_bot (PerplexityBot)                      ai_bot
PASS ua_class search_bot (Googlebot)                      search_bot
PASS ua_class other_bot (스모크)                             other_bot
PASS ua_class other_bot (Chrome 프리페치 프록시)                 other_bot
PASS ua_class none (UA 없음)                                none
PASS HEAD 404 는 원장 미기록                                    0
PASS 비정식 호스트 404 는 원장 미기록                                 0
PASS 비 HTML 404 도 404.html 본문 (기존 NIT1 유지)                404
PASS 404 원장 분당 예산 60 (이미 위에서 쓴 만큼 차감)                     52/70 기록
worker_check: FAIL 0 / 27 항목
exit=0
```

```text
$ python3 _tools/seo_keyword_census.py
가이드북 면                       구절
guidebook/ajou.html          9/9
guidebook/catholic.html      9/9
guidebook/cau.html           9/9
guidebook/dankook.html       9/9
guidebook/donga.html         9/9
guidebook/dongduk.html       9/9
guidebook/dongguk.html       9/9
guidebook/duksung.html       9/9
guidebook/ewha.html          9/9
guidebook/gachon.html        9/9
guidebook/hanyang-erica.html 9/9
guidebook/hufs.html          9/9
guidebook/incheon.html       9/9
guidebook/inha.html          9/9
guidebook/khu.html           9/9
guidebook/konkuk.html        9/9
guidebook/kookmin.html       9/9
guidebook/kwangwoon.html     9/9
guidebook/kyonggi.html       9/9
guidebook/myongji.html       9/9
guidebook/pusan.html         9/9
guidebook/sahmyook.html      9/9
guidebook/sejong.html        9/9
guidebook/seoultech.html     9/9
guidebook/snu.html           9/9
guidebook/sookmyung.html     9/9
guidebook/soongsil.html      9/9
guidebook/sungshin.html      9/9
guidebook/swu.html           9/9
guidebook/ulsan.html         9/9
guidebook/uos.html           9/9
------------------------------------------------------------
계열                         면수  요구 면
연세대 활동우수형 면접                1  programs/yonsei.html  OK
연대 면접                       3  programs/yonsei.html  OK
연세대 면접                      6  programs/yonsei.html  OK
연세대 제시문 면접                  4  programs/yonsei.html  OK
연세대 모의면접                    3  programs/yonsei.html  OK
연세대 면접컨설팅                   1  programs/yonsei.html  OK
고려대 계열적합형 면접                1  programs/korea.html  OK
고려대 계열적합전형 면접               2  programs/korea.html  OK
고대 면접                       4  programs/korea.html  OK
고려대 면접                      7  programs/korea.html  OK
고려대 제시문 면접                 55  programs/korea.html  OK
고려대 모의면접                    3  programs/korea.html  OK
생기부 면접                     36  interview.html  OK
서류기반 면접                    39  interview.html  OK
대입 면접컨설팅                    5  interview.html  OK
대입 모의면접                     7  interview.html  OK
모의면접                       38  studio.html  OK
면접컨설팅                      38  index.html  OK
면접 예상문제                    36  index.html  OK
면접 기출문제                    39  index.html  OK
대입 면접 준비                   37  index.html  OK
MMI 면접                      1  interview.html  OK
------------------------------------------------------------
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
exit=0
```

```text
$ python3 _design/redesign_20260909/faq_ld_check.py
PASS index.html: JSON-LD=4 visible=4 pairs=equal copy=equal
PASS programs/guidebook.html: JSON-LD=3 visible=3 pairs=equal copy=equal
PASS programs/studio.html: JSON-LD=3 visible=3 pairs=equal copy=equal
faq_ld_check: pages=3 FAIL=0
exit=0
```

```text
$ python3 _design/redesign_20260909/test_faq_source.py
PASS source change propagates to visible/JSON-LD with HTML/JSON escaping: index.html
PASS source change propagates to visible/JSON-LD with HTML/JSON escaping: programs/guidebook.html
PASS source change propagates to visible/JSON-LD with HTML/JSON escaping: programs/studio.html
PASS negative control rejected: question
PASS negative control rejected: answer
PASS negative control rejected: duplicate
PASS negative control rejected: missing
PASS negative control rejected: hidden
PASS negative control rejected: standalone
PASS negative control rejected: stale_copy
faq_source_contract: checks=10 FAIL=0
exit=0
```

```text
$ python3 _design/redesign_20260909/check_r2c.py
SKIP programs/korea.html: B1/promo only; separate LP has no shared label.ph/app.js
SKIP programs/yonsei.html: B1/promo only; separate LP has no shared label.ph/app.js
r2c_invariants: pages=66 protected_files=27 copy_nodes=180 non_FAQ_bytes=identical FAIL=0
app_scope=PASS copy_ledger=PASS price_structure=PASS desktop_tokens=PASS mobile_css=unchanged
amounts: 16,500, 33,000, 220,000, 495,000, 511,500; new_amounts=0
exit=0
```

```text
$ node _design/redesign_20260909/test_cart_storage.mjs
MEASURE normal {"result":{"ok":true},"cart":[{"sku":"guide-gachon","title":"가천대학교","price":33000,"list_price":33000,"qty":1,"ship":false}],"tracked":1}
PASS normal setItem: addToCart ok=true, stored row and one add_to_cart event
MEASURE throw {"result":{"ok":false,"reason":"storage","message":"브라우저 저장소에 장바구니를 저장하지 못했습니다. 저장소 설정과 여유 공간을 확인해 주세요."},"cart":[],"tracked":0}
PASS throwing setItem: addToCart ok=false reason=storage, no false conversion
PASS existing quantity: failed save preserves quantity; successful retry increments once
PASS already stored single-quantity SKU requires no save or conversion event
PASS saveCart callers may ignore the boolean without an exception
PASS real HH storage failure reaches the adapter; retry clears failure with success
cart_storage_contract: checks=6 FAIL=0
exit=0
```

```text
$ node _design/redesign_20260909/test_product_buy.mjs
PASS guide default and selected university reuse guide SKU
PASS guide all-pass is not tied to selected university
PASS studio selected unit creates its existing pass SKU
PASS common lecture has its own price, period and no active unit selector
PASS single passage navigates to real set selection without fabricating set_id
PASS successful add announces success and exposes cart link
PASS already present never announces a second successful add
PASS HH rejection is reported without success
PASS thrown storage or runtime error has a visible recovery link
PASS changing product clears stale feedback
product_buy_contract: checks=10 FAIL=0
exit=0
```

```text
$ node _design/redesign_20260909/test_promo_failure.mjs
PASS two config failures hide all campaign nodes and popup, preserve unknown status and stored prices
PASS successful retry retains active promotion, repricing and hh:promo notification
PASS confirmed no campaign hides banners and restores stored list prices
promo_failure_contract: checks=3 FAIL=0
exit=0
```

```text
$ node --check _design/redesign_20260909/verify_r2.mjs
exit=0
```

```text
$ git diff --check
exit=0
```

```text
$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only _tools/program_guidebook_v2.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0
```

```text
$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only _tools/program_studio_v2.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0
```

```text
$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only index.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0
```

```text
$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only programs/guidebook.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0
```

```text
$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only programs/studio.html
programs/studio.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '64% (7/11)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: C-12×1
exit=0
```

## 실행하지 않은 검증과 인계

```text
BLOCKED: node _design/redesign_20260909/verify_r2.mjs
```

Playwright/Chromium은 발주 조건에 따라 실행하지 않았습니다. 본 세션은 이 명령을 실행해 1280×800 및 390×844 구매 버튼 전체 노출, 넘침, 콘솔, 기존 상호작용을 대조하면 됩니다. 새 결과 저장 위치는 `browser_results_r2c/`입니다. 구문 검사 exit 0은 브라우저 결과를 의미하지 않습니다.

작업 시작부터 있던 `codex/r2c.pid`, `codex/r2c_run.log`, `rd7_sheets/` 및 작업 중 다른 세션이 변경한 `_design/redesign_20260909/.gitignore`는 수정하거나 되돌리지 않았고 파일 수에서 제외했습니다.

지정 외부 handoff 경로 `/Users/gregory/Workspace/hyunhak-site/.remember/remember.md`는 허용 쓰기 경로 밖이므로 기록하지 않았습니다. 이 보고서가 허용 작업 트리 안의 인계입니다.

USED_ASSETS: r2_brief.md §1/5/6/7; R2c 발주문; FACTS_LEDGER.md; copy_ledger_v6.md; base.css 토큰과 규범; WRITING_GUIDE.md; design-director가 읽은 feedback_design_master_router.md §1~11, feedback_design_team_marathon_harness.md §2, feedback_design_research_learning_mandatory.md 디지털 UI 분기. 외부 설치와 배포는 수행하지 않았습니다.

```text
===== 이어가기 트리거 (새 Claude 용) =====
thread: 현학적연구소_사이트_R2c_20260909
phase: 구현 및 비브라우저 검증 완료, 브라우저 검증 대기
context: hh-r2b 기준 f5bbd73, 연속 빌드 7ea411bde5e0380d, FAQ 4/3/3 일치, 저장 실패 false, HTML 5개 A
last_done: FAQ 단일 원천과 저장 실패 수리, 데스크톱 토큰 조정, 검증 원문 기록
next: verify_r2.mjs를 본 세션에서 실행해 버튼 하단과 화면 동작 대조 후 대리 커밋
resume_cmd: "현학 사이트 R2c 검증 이어가"
handover: /Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/IMPL_REPORT_R2c.md
index: ~/.codex/handover/INDEX.md
memory: ~/.codex/projects/-Users-gregory/memory/MEMORY.md
pending_approvals: ~/.codex/pending_approvals.md
ts: 2026-09-09T08:35:00+09:00
warning: 이거 안 지키면 감옥간다. 전과자 되는거야.
===== /이어가기 트리거 =====
```

IMPL_DONE files=24 build_hash=7ea411bde5e0380d gates=build:pass,idempotency:pass,seo:pass,v2:pass,aeo:pass,legal:pass,counts:pass,samples:pass,captions:pass,links:pass,worker:pass,keywords:pass,invariants:pass,prices:pass,style:pass,faq:pass,storage:pass,purchase:pass,promo:pass,browser:blocked BLOCKED=node _design/redesign_20260909/verify_r2.mjs
