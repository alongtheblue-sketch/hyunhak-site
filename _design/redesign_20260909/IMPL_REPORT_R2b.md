# R2b 구현 보고

층: 런타임(사이트 산출 및 회귀 검사). 작업 트리: hh-r2b. 시작 HEAD b69f07e(R2 842bcf7 + R2b 브리프 기록). 커밋 0개: 이번 회차 지시대로 본 세션이 대리합니다.

빌드 2회 연속 exit 0, 해시 **88244e24591b5486** 동일. 기존 빌드 검증기 전건 통과, 변경 HTML 6개 등급 A, 구매 계약 10개와 프로모션 상태 3개 통과. 전체 R2b 판정은 **미완료**: B1/C의 programs 4면 전제조건 중 korea/yonsei 2면이 미충족이며 브라우저는 실행하지 않았습니다.

## 변경 단위

1. 카피와 상품 비교(A1~A6, D1): H1 후보 (나) 선택, 두 가격 행, 기본 구매 선택과 첫 가격 일치, 구매 동기와 출처 답변, 만든 사람 직함을 반영했습니다. 후보 (나)의 실제 글자 수는 공백 포함 32자입니다. studio_room_lead는 기존 문장을 그대로 원장에 등록했습니다.
2. 결함 수리(B1~B3, D2 필수1~5): LP .ph 범위를 제한하고 두 R2 상세면에서 LP CSS를 제거했습니다. #find에는 가이드북 링크 하나를 남겼고 간격은 --s3(16px)입니다. 프로모션 두 번 실패 시 기존 renderPromoPrices를 호출하고 팝업을 숨깁니다. 응시실 P1 띠, 체험 CTA와 비활성 UI를 수정했습니다.
3. 검증과 기록: 브라우저 검증 확장, 3상태 회귀, 금액 대조와 원장 대조를 추가했습니다. 기존 빌드 검증기는 수정하지 않았습니다.

## B1/C 미충족 근거

현재 제공 트리의 programs/korea.html 및 programs/yonsei.html은 독립 LP입니다. `<header class="hero">`를 쓰고 `label.ph`, `assets/base.css`, `assets/app.js`가 모두 없습니다. build_programs.py는 guidebook/studio만 공용 셸에 연결하고 apply_nav.py는 programs 전체를 제외합니다. 이 상태는 시작 HEAD부터 존재합니다.

검색 폰트 충돌은 공용 검색이 있는 guidebook/studio에서 원인 수정했고, CSS 충돌 규칙도 좁혔습니다. 두 독립 LP의 공용 셸 추가 여부는 사용자에게 비동기로 물었으나 응답이 없으므로 기존 구조를 유지했습니다. 이 두 면은 check_r2b.py에서 명시 FAIL, verify_r2.mjs에서도 라벨/공용 런타임 부재를 FAIL로 기록합니다. 스킵하거나 PASS로 치환하지 않습니다. 완전한 4면 요건 충족에는 이 두 면의 공용 셸 편입 결정과 구현이 남습니다.

## 파일 목록

| 파일:줄 | 변경 내용 |
|---|---|
| `_tools/r2_copy.json:2` | H1, 대상 리드, 구매 동기, FAQ 출처와 오류 안내 등 사실 원장 문안 반영. |
| `_tools/build_programs.py:20` | 스튜디오 H1의 승인된 두 줄을 평문 카피에서 렌더. |
| `_tools/program_guidebook_v2.html:43` | 레거시 LP CSS 제거, 가이드북 상세 H1 전용 키로 생성. |
| `_tools/program_studio_v2.html:43` | 공용 컴포넌트 상세면의 불필요한 LP CSS 제거. |
| `_tools/v2_shell.py:54` | 응시실 행사 띠를 승인 P1 원문의 r2-promo로 생성. |
| `assets/app.js:225` | config 2회 실패에서 행사와 팝업을 숨기고 미확정 상태와 저장 가격 보존. |
| `assets/base.css:1230` | H1 --t-h2, 두 가격 행 정렬, 링크 gap, disabled 토큰 반영. |
| `assets/promo_lp.css:351` | 그림 자리표시자 .ph를 콘텐츠로 제한하여 검색 라벨 충돌 제거. |
| `index.html:91` | 후보 나 H1, 구매 동기와 2행 가격, #find 중복 링크 제거, 출처 FAQ 반영. |
| `programs/guidebook.html:94` | 템플릿에서 재생성한 상세 H1과 구매 오류 문안, base.css만 사용. |
| `programs/studio.html:94` | 템플릿에서 재생성한 두 줄 H1과 구매 오류 문안, base.css만 사용. |
| `studio.html:113` | P1 한 줄 행사 띠, 체험 CTA를 텍스트 링크로 변경하고 기존 리드를 원장에 등록. |
| `_design/redesign_20260909/MARKETING_NOTES.md:7` | 홈 두 가격 행 순서, H1 선택 이유와 오류 문구 근거 기록. |
| `_design/redesign_20260909/copy_ledger_v6.md:5` | 138개 문안의 근거와 글자 수를 일치시키고 H1 두 후보 및 채택 기록. |
| `_design/redesign_20260909/test_product_buy.mjs:6` | 실제 카피 사전을 fixture에 연결하여 예외 메시지까지 회귀 검사. |
| `_design/redesign_20260909/verify_r2.mjs:15` | 4면 검색 폰트, 원장 H1, 가격 2행, CTA, 간격, API 실패 검사를 추가. 브라우저 미실행. |
| `_design/redesign_20260909/check_r2b.py:14` | 승인 app.js 분기만 예외로 기존 보존 검사 재사용, 가격/문안 및 4면 전제조건 검증. |
| `_design/redesign_20260909/test_promo_failure.mjs:7` | 실제 app.js의 통신 실패, 재시도 성공, 행사 없음 3개 Node VM 회귀. |
| `_design/redesign_20260909/r2b_build_1.log:1` | 첫 빌드의 문항 수 앵커 FAIL 원문. |
| `_design/redesign_20260909/r2b_build_2.log:1` | 수리 후 첫 성공 빌드와 해시 원문. |
| `_design/redesign_20260909/r2b_build_3.log:1` | 수리 후 두 번째 연속 성공 빌드와 같은 해시 원문. |
| `_design/redesign_20260909/r2b_checks.json:1` | 검증 명령 15개, 종료 코드, stdout/stderr 원문. 4면 전제조건만 FAIL. |
| `_design/redesign_20260909/r2b_style.json:1` | 변경 HTML 6개 문체 게이트 원문, 전부 등급 A. |
| `_design/redesign_20260909/IMPL_REPORT_R2b.md:1` | 단위별 파일:줄, 검증 원문, 남은 사양 불일치와 인계 기록. |

## 구현상 보존과 선택

- APP_JS_REQUEST: 이번 브리프 D2 필수1로 허용된 loadPromo 실패 분기만 수정했습니다. check_r2b.py는 그 정확한 분기만 이전 문장으로 복원하여 기존 app.js와 전체 바이트가 같은지 먼저 검사합니다. 이후 R2 기존 검사 66면/보호 33개를 모두 재사용합니다. API 경로, HH 계약, 분석 태그 및 가격 계산은 동일합니다.
- 제목, SEO 블록, JSON-LD, 분석 블록, 폰트 로딩, 법률 본문, 행사 원천, 순위표 위젯 및 브랜드 필름 마크업 보존 검사 통과. 기존 FAQ JSON-LD는 바이트 보존 조건에 따라 그대로입니다.
- 첫 빌드에서 apply_counts가 FAQ의 옛 수량 문장을 찾지 못해 FAIL했습니다. 답변은 승인 출처 문장으로 유지하고, 질문 제목을 「질문 3,865개의 출처」(G5)로 바꾸어 수량 앵커를 정확한 의미의 가시 제목에서 보존했습니다. 검증기 변경은 없습니다.
- 장바구니의 HH 거절 사유는 기존 product_buy.js가 이미 표시합니다. 예상치 못한 예외에는 「장바구니 처리 중 오류가 발생했습니다. 장바구니를 확인해 주세요.」라고 안내합니다. 로그인은 로컬 담기의 선행 조건이 아니므로 원인으로 넣지 않았습니다.
- BASE_CSS 토큰 값 변경: 없음. H1의 참조 토큰만 --t-h4→--t-h2. disabled는 --mat/--gray/--edge, 기존 대비 gray/mat 4.56을 유지합니다. 본문 14px 권고는 --t-sm 실값이 13px이므로 전역 토큰 파급을 만들지 않고 미적용했습니다. 홈 타일 가격 삭제 권고도 미적용입니다.
- verify_r2는 정상 행사 config를 고정한 배치 레그와 config 요청을 중단하는 실패 레그를 구분합니다. B3로 실제 링크가 한 개인 #find에서 B2 간격은 잠깐 복제한 두 링크의 사각형으로 실측한 뒤 복제 노드를 제거합니다. 정상 레그의 콘솔 오류 검사는 그대로이므로 외부 서비스 오류도 결과에 남습니다. 상류가 보고한 이전 브라우저 PASS를 이번 산출의 PASS로 사용하지 않았습니다.
- design-director와 design-critic 정적 재검토: D2 필수 5건 대응 확인. 기존 B안/토큰/3안 기록을 승계하는 수정이며 신규 무드보드 없음. 9렌즈는 정적 근거만 확인했고 렌즈8 좌표 및 릴리스 판정은 브라우저 실측 전 보류. 신규 과장 약속은 없음. 원장 추가 행의 Markdown 표 분절은 최종 통합으로 수정했습니다.

## 빌드 실행 원문

```text
$ sh _tools/build_all.sh > _design/redesign_20260909/r2b_build_1.log 2>&1
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 42 / nav 없음 0 / 레거시 0
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
FAIL index.html: /질문 ([\d,]+)개/ 매치 1건, 기대 2건 (문면 변경? 앵커 갱신 필요)
exit=1
```

```text
$ sh _tools/build_all.sh > _design/redesign_20260909/r2b_build_2.log 2>&1
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
88244e24591b5486
exit=0
```

```text
$ sh _tools/build_all.sh > _design/redesign_20260909/r2b_build_3.log 2>&1
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
88244e24591b5486
exit=0
```

## 검증기 실행 원문

기존 seo_check WARN 3개(reader의 의도된 예외)는 보존했고 FAIL은 0입니다. 아래 r2b 전제조건 FAIL은 기존 SEO 검사와 별개입니다.

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
$ python3 _design/redesign_20260909/check_r2b.py
r2_static: pages=66 protected_files=33 copy_nodes=180 FAIL=0
r2b_static: approved_app_diff=PASS price_rows=2/2 find_link=1 copy=PASS campaign=PASS
amounts: 16,500, 33,000, 220,000, 495,000, 511,500, 990,000; new_amounts=0 (JSON-LD 제외, HTML/inline JS의 원 표기)
FAIL B1/C prerequisite: programs/korea.html: shared label.ph / app.js absent in supplied R2 baseline
FAIL B1/C prerequisite: programs/yonsei.html: shared label.ph / app.js absent in supplied R2 baseline
r2b_program_prerequisites: targets=4 ready=2 FAIL=2
exit=1
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
$ node --check _design/redesign_20260909/verify_r2.mjs
exit=0
```

```text
$ git diff --check
exit=0
```

## 문체 게이트 원문

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
programs/studio.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '70% (7/10)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: C-12×1
exit=0
```

```text
$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only studio.html
studio.html:407:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'분' 류 5문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0
```

프로모션 테스트에 git show b69f07e:assets/app.js의 수정 전 소스를 주입한 대조군은 첫 숨김 assertion에서 실패했습니다. 출력 원문:

```text
PASS negative control: pre-R2b app.js fails campaign-hidden assertion
```

## 실행하지 않은 검증

```text
BLOCKED: node _design/redesign_20260909/verify_r2.mjs
```

브라우저 실행 금지는 발주 조건입니다. computed font-family, 카드 높이/CTA/첫 화면, 실제 링크 간격, 실패 상태의 computed visibility는 브라우저 결과가 나오기 전까지 미검증입니다. 스크립트 구문 검사는 exit 0이며 브라우저 PASS를 뜻하지 않습니다. 새 출력 경로는 browser_results_r2b/로 분리하여 이전 결과와 혼동하지 않게 했습니다.

USED_ASSETS: FACTS_LEDGER.md; r2_brief.md §1/5/6/7; session_copy_review.md; copy_ledger_v6.md; assets/base.css 규범; WRITING_GUIDE.md; design-director/critic가 읽은 feedback_design_master_router.md, feedback_design_team_marathon_harness.md §2, feedback_design_research_learning_mandatory.md 및 기존 B안 기록. 추가 설치/외부 검색/배포 없음.

## 인계

외부 지정 handoff 경로 /Users/gregory/Workspace/hyunhak-site/.remember/remember.md는 허용 쓰기 경로 밖이라 기록하지 않았습니다. 이 보고서를 작업 트리 안의 인계로 남겼습니다. 최초부터 존재한 codex/r2b.pid와 codex/r2b_run.log, 작업 중 다른 세션에서 생성한 codex/r2c_brief.md는 수정하지 않았으며 파일 수에서 제외했습니다.

```text
===== 이어가기 트리거 (새 Claude 용) =====
thread: 현학적연구소_사이트_R2b_20260909
phase: 구현 및 비브라우저 검증 종료, 4면 전제조건 2면 미충족, 브라우저 미실행
context: hh-r2b 기준 b69f07e, 연속 빌드 88244e24591b5486, 변경 HTML 6개 A, 구매10+프로모션3 PASS
last_done: 카피와 가격2행, 실패행사 숨김, CSS 충돌/disabled, 회귀와 검증 기록
next: korea/yonsei 공용 셸 편입 여부 결정, verify_r2.mjs 브라우저 실행 후 실측 대조, 본 세션 대리 커밋
resume_cmd: "현학 사이트 R2b 다듬기 이어가"
handover: /Users/gregory/Workspace/_wt/hh-r2b/_design/redesign_20260909/IMPL_REPORT_R2b.md
index: ~/.codex/handover/INDEX.md
memory: ~/.codex/projects/-Users-gregory/memory/MEMORY.md
pending_approvals: ~/.codex/pending_approvals.md
ts: 2026-09-09T08:20:26+09:00
warning: 이거 안 지키면 감옥간다. 전과자 되는거야.
===== /이어가기 트리거 =====
```

IMPL_DONE files=24 build_hash=88244e24591b5486 gates=build:pass,idempotency:pass,seo:pass,v2:pass,aeo:pass,legal:pass,counts:pass,samples:pass,captions:pass,links:pass,worker:pass,invariants:pass,prices:pass,style:pass,purchase:pass,promo:pass,font4:fail,browser:blocked BLOCKED=node _design/redesign_20260909/verify_r2.mjs
