# R3b 구현 보고서

층: 런타임. 작업 트리: /Users/gregory/Workspace/_wt/hh-r3. 브랜치: redesign/20260909-r3. 기준 커밋: 98b5ff1.

상세면 2면, 랭킹실, 별명 저장, 공통 메뉴를 반영했습니다. 최종 build_all 두 실행은 모두 exit 0이며 해시가 `6fc4b6998b40b462`로 같습니다. 브라우저 검증은 실행하지 않았습니다. **전체 종료 판정은 미충족입니다. IA 원시 계수 2항목과 기존 보존 문안의 문체 6면이 남아 있습니다.** 커밋은 0건이며 시도하지 않았습니다.

**미충족 항목과 사양 간 충돌**

- 가이드북의 31권 개별 보기 링크를 유지했습니다. `ia_links.py`는 대학마다 다른 HTML 경로를 별도 목적지로 세므로 상세면 목적지가 35종입니다. 명시된 31권 개별 링크와 목적지 6종 이하를 동시에 만족할 수 없습니다. 작업 중 선택 질문을 전달했으며 응답이 없어 기본안인 개별 링크 보존으로 진행했습니다. 범주를 합쳐 원시 계수를 낮추거나 PASS로 표기하지 않았습니다.
- 스튜디오 상세의 무료 응시 링크 1개와 5단위 응시실 링크는 서로 다른 query를 쓰지만 같은 페이지로 집계됩니다. 원시 반복 최댓값은 6입니다. 단위 카드의 담기는 공통 `#buy` 링크 1개로 제공합니다. 맺음 CTA를 제외하면 `#buy` 반복은 1회입니다.
- 홈은 11종에서 8종, 응시실은 12종에서 6종으로 감소했습니다. `ia_links.py`는 main 바깥 유틸 링크를 세고 script 동적 링크와 자체 앵커를 빼므로 실제 본문 URL 검사는 브라우저 스크립트에도 별도로 넣었습니다.
- 문체 검사 59파일 중 53파일 A, 6파일 C/D입니다. C/D 6면은 기준 커밋에서도 등급과 S1/S2 건수가 같고 main 바이트가 동일합니다. 법률 본문과 기존 기출 문면을 고쳐 게이트를 통과시키지 않았습니다. 새로 구성한 핵심 6면과 상세면 템플릿 2개는 A입니다.
- 별명 규칙의 승인 표기 `2~12자, 한글·영문·숫자`는 v2_check 금지 문자 검사와 충돌했습니다. `2~12자, 한글, 영문, 숫자`로 구두점만 보정했습니다. 의미, 길이 제한, 서버 검증 규칙은 같습니다.
- 초기 개발 빌드 2건은 FAIL이었습니다. 랭킹실 title 누락, 응시실의 제거된 #ranking을 가리키는 CSS, 별명 안내의 가운뎃점을 산출에서 수정했습니다. 실패 로그는 보존하고, 최종 검증은 이후의 연속 2회 실행입니다.

**구현과 보존**

두 상세면은 H1, 리드, 구매 블록을 먼저 배치했습니다. 데스크톱은 구매 블록 옆에 기존 표지 또는 응시 화면을 배치하고 계기 6칸을 이어 둡니다. 수령물 요약, 표본 확대, 구성과 절차, 이용권 비교, 선택 목록, 제작 근거, FAQ, 맺음 CTA를 생성 원천에 반영했습니다. 표는 caption을 갖춘 실제 table이며 가로 넘침은 표와 갤러리 안에서 처리합니다.

가이드북은 12장 표지와 19권 이름 목록을 사용합니다. 기존 13장 표본의 이미지, alt, 배지, 범례, 캡션은 보존합니다. 확대 표본은 1부, 3부, 4부 3개입니다. PDF 선택 시 파일 발급 안내가 나오며 기존 상품 코드와 정가로 장바구니에 담깁니다. 스튜디오는 준비, 답변, 첨삭 3개 스프레드와 4단 절차, 연세대 8분/5분/2문항과 고려대 21분/7분/3문항 제원을 제시합니다.

랭킹실은 표를 보기 버튼과 분포 앞에 배치했습니다. 이름 셀의 DOM 키는 `data-c="name"`을 보존하고 표제만 별명으로 바꿨습니다. `masked:true`는 서버 값을 그대로 표시하고 지정 title을 붙입니다. 응시 0, 집계 중, 공개 기록 없음, 통신 실패에도 독립 면의 안내를 유지합니다. 세트 자료만 수신하지 못하면 난이도 미확인 그룹에 응시 행을 유지합니다.

MY는 GET 프로필의 nickname을 초기값으로 사용합니다. 별명 저장과 공개 체크는 기존 `/api/auth/me` PATCH 경로이며, 공개 활성화 때 nickname과 rank_public을 함께 전송합니다. 별명 없는 공개 해제는 가능합니다. 400/409와 invalid 사유 4종을 문장으로 처리하며 한글 조합 중 Enter는 저장하지 않습니다. 공통 app.js는 바이트 불변입니다.

기존 29개 보호 파일, 법률 본문 2개, 기존 SEO, 분석 태그, 폰트, 브랜드 필름, 순위표 법률 foot을 대조했습니다. 상세면 2개의 FAQPage만 공통 FAQ 원천에 따라 6문답으로 확장됐습니다. programs/korea.html과 programs/yonsei.html, _worker/index.js, robots.txt와 llms.txt는 바이트 불변입니다. 새 이미지와 외부 쓰기는 없습니다. 색 토큰은 바꾸지 않아 기존 대비 수치가 그대로 유효합니다.

**대리 커밋용 변경 묶음**

실제 커밋과 git 인덱스 접근은 하지 않았습니다. 아래는 단계별 파일 책임이며 공통 파일은 여러 단계에 걸칩니다.

| 단계 | 변경 파일 | 권장 커밋 메시지 |
|---|---|---|
| 2.1 상세면 | _tools/program_guidebook_v2.html, _tools/program_studio_v2.html, _tools/build_programs.py, _tools/r2_copy.json, _tools/r2_faq.py, assets/base.css, assets/product_buy.js, programs/guidebook.html, programs/studio.html, copy_ledger_v6.md | 상세면 수령물과 표본을 복원해 상품 구성을 명확히 안내 |
| 2.2 랭킹과 별명 | ranking.html, studio.html, my.html, assets/rank.js, assets/rank_profile.js, _tools/seo_manifest.json, 공통 카피와 CSS, sitemap.xml, rss.xml, llms-full.txt | 랭킹실을 분리하고 별명 공개와 저장을 연결 |
| 2.3 IA | _tools/v2_shell.py, 공통 셸이 바뀐 HTML 전건, ia_before_r3b.log, ia_after_r3b.log | 메뉴를 다섯 개로 줄이고 랭킹실과 상품 동선을 정리 |
| 2.4 홈과 검증 | index.html, verify_r3.mjs, verify_r3_static.py, test_r3_product_buy.mjs, 보고서와 실행 로그 | 홈 연결을 단순화하고 보존 및 상호작용 검증을 기록 |

**변경 파일 90개**

시작 시 존재한 codex/*.pid 및 *_run.log 4개는 작업 산출 수에서 제외했습니다. 아래 개수에는 보고서, 테스트, 실행 로그를 포함합니다.

| 파일 | 변경 내용 |
|---|---|
| [_design/redesign_20260909/IMPL_REPORT_R3b.md](../../_design/redesign_20260909/IMPL_REPORT_R3b.md) | 구현 내용, 검증 원문, 미충족 항목, 대리 커밋 파일 목록을 기록합니다. |
| [_design/redesign_20260909/build_r3b_1.log](../../_design/redesign_20260909/build_r3b_1.log) | 보정 전 빌드 또는 검사 실패 원문을 보존합니다. |
| [_design/redesign_20260909/build_r3b_2.log](../../_design/redesign_20260909/build_r3b_2.log) | 보정 전 빌드 또는 검사 실패 원문을 보존합니다. |
| [_design/redesign_20260909/build_r3b_final_1.log](../../_design/redesign_20260909/build_r3b_final_1.log) | 검증 실행 결과 원문을 보존합니다. |
| [_design/redesign_20260909/build_r3b_final_2.log](../../_design/redesign_20260909/build_r3b_final_2.log) | 검증 실행 결과 원문을 보존합니다. |
| [_design/redesign_20260909/copy_ledger_v6.md](../../_design/redesign_20260909/copy_ledger_v6.md) | 377개 문안의 원문, 근거 ID, 글자 수를 기록합니다. |
| [_design/redesign_20260909/ia_after_r3b.log](../../_design/redesign_20260909/ia_after_r3b.log) | 검증 실행 결과 원문을 보존합니다. |
| [_design/redesign_20260909/ia_before_r3b.log](../../_design/redesign_20260909/ia_before_r3b.log) | 검증 실행 결과 원문을 보존합니다. |
| [_design/redesign_20260909/nickname_r3b.log](../../_design/redesign_20260909/nickname_r3b.log) | 검증 실행 결과 원문을 보존합니다. |
| [_design/redesign_20260909/product_buy_r3b.log](../../_design/redesign_20260909/product_buy_r3b.log) | 검증 실행 결과 원문을 보존합니다. |
| [_design/redesign_20260909/seo_r3b.log](../../_design/redesign_20260909/seo_r3b.log) | 검증 실행 결과 원문을 보존합니다. |
| [_design/redesign_20260909/static_r3b.log](../../_design/redesign_20260909/static_r3b.log) | 검증 실행 결과 원문을 보존합니다. |
| [_design/redesign_20260909/style_baseline_r3b.log](../../_design/redesign_20260909/style_baseline_r3b.log) | 기준 커밋의 기존 문체 C/D 판정을 기록합니다. |
| [_design/redesign_20260909/style_preserved_r3b.log](../../_design/redesign_20260909/style_preserved_r3b.log) | 기존 문체 미통과 6면의 본문 바이트 보존을 기록합니다. |
| [_design/redesign_20260909/style_r3b.log](../../_design/redesign_20260909/style_r3b.log) | 검증 실행 결과 원문을 보존합니다. |
| [_design/redesign_20260909/test_r3_product_buy.mjs](../../_design/redesign_20260909/test_r3_product_buy.mjs) | 실제 구매 모듈의 7개 모드 및 실패 계약을 Node VM으로 검증합니다. |
| [_design/redesign_20260909/v2_r3b.log](../../_design/redesign_20260909/v2_r3b.log) | 보정 전 빌드 또는 검사 실패 원문을 보존합니다. |
| [_design/redesign_20260909/verify_r3.mjs](../../_design/redesign_20260909/verify_r3.mjs) | 브라우저에서 2개 해상도, 첫 화면, 탭, 별명, 높이, 여백, IA, overflow를 검사합니다. |
| [_design/redesign_20260909/verify_r3_static.py](../../_design/redesign_20260909/verify_r3_static.py) | 보존 바이트, SEO, 문안, FAQ, 섹션, 가격, 숫자와 CSS 계약을 정적으로 대조합니다. |
| [_tools/build_programs.py](../../_tools/build_programs.py) | 판매 31권의 12표지와 19이름 목록을 생성하고 질문 수와 면수를 원장에 대조합니다. |
| [_tools/program_guidebook_v2.html](../../_tools/program_guidebook_v2.html) | 수령물, 1/3/4부 표본, 다섯 부, 비교표, 대학 목록, FAQ의 9절 구조를 구성합니다. |
| [_tools/program_studio_v2.html](../../_tools/program_studio_v2.html) | 수령물, 준비/답변/첨삭 화면, 절차와 제원, 비교표, 단위 카드, 랭킹 요약을 구성합니다. |
| [_tools/r2_copy.json](../../_tools/r2_copy.json) | 기존 문안을 유지하고 R3b 새 문장, 표제, 안내, 근거 ID를 등재합니다. |
| [_tools/r2_faq.py](../../_tools/r2_faq.py) | 홈 4문답과 상세면 각 6문답의 HTML 및 JSON-LD 공통 원천을 유지합니다. |
| [_tools/seo_manifest.json](../../_tools/seo_manifest.json) | ranking.html의 SEO, WebPage, BreadcrumbList, 색인 설정만 추가합니다. |
| [_tools/v2_shell.py](../../_tools/v2_shell.py) | GNB와 모바일 탭을 5개로 재편하고 자료실과 연구소를 푸터에 유지합니다. |
| [about.html](../../about.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [assets/base.css](../../assets/base.css) | 토큰을 유지한 R3 표, 표본, 목록, 위젯 배치와 page.wrap 거터를 정의합니다. |
| [assets/product_buy.js](../../assets/product_buy.js) | 가이드북 PDF 소장판 선택을 guide-all-pdf와 1,705,000원에 연결합니다. |
| [assets/rank.js](../../assets/rank.js) | 독립 랭킹실, 별명과 masked 행, 빈 상태, 키보드 탭, 미분류 난이도를 처리합니다. |
| [assets/rank_profile.js](../../assets/rank_profile.js) | MY 별명 저장과 공개 동의, 오류 사유, 한글 조합 Enter를 처리합니다. |
| [b2b.html](../../b2b.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [classroom.html](../../classroom.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [faq.html](../../faq.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/ajou.html](../../guidebook/ajou.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/catholic.html](../../guidebook/catholic.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/cau.html](../../guidebook/cau.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/dankook.html](../../guidebook/dankook.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/donga.html](../../guidebook/donga.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/dongduk.html](../../guidebook/dongduk.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/dongguk.html](../../guidebook/dongguk.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/duksung.html](../../guidebook/duksung.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/ewha.html](../../guidebook/ewha.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/gachon.html](../../guidebook/gachon.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/hanyang-erica.html](../../guidebook/hanyang-erica.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/hufs.html](../../guidebook/hufs.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/incheon.html](../../guidebook/incheon.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/index.html](../../guidebook/index.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/inha.html](../../guidebook/inha.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/khu.html](../../guidebook/khu.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/konkuk.html](../../guidebook/konkuk.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/kookmin.html](../../guidebook/kookmin.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/kwangwoon.html](../../guidebook/kwangwoon.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/kyonggi.html](../../guidebook/kyonggi.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/myongji.html](../../guidebook/myongji.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/pusan.html](../../guidebook/pusan.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/sahmyook.html](../../guidebook/sahmyook.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/sejong.html](../../guidebook/sejong.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/seoultech.html](../../guidebook/seoultech.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/snu.html](../../guidebook/snu.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/sookmyung.html](../../guidebook/sookmyung.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/soongsil.html](../../guidebook/soongsil.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/sungshin.html](../../guidebook/sungshin.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/swu.html](../../guidebook/swu.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/ulsan.html](../../guidebook/ulsan.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [guidebook/uos.html](../../guidebook/uos.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [index.html](../../index.html) | 첫 화면 대학 찾기와 랭킹실 링크를 연결하고 본문 목적지를 8종으로 줄입니다. |
| [interview.html](../../interview.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [lecture.html](../../lecture.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [lectures.html](../../lectures.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [lectures/common.html](../../lectures/common.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [lectures/korea-hum.html](../../lectures/korea-hum.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [lectures/korea-sci.html](../../lectures/korea-sci.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [lectures/yonsei-hum.html](../../lectures/yonsei-hum.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [lectures/yonsei-intl.html](../../lectures/yonsei-intl.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [lectures/yonsei-sci.html](../../lectures/yonsei-sci.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [library.html](../../library.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [llms-full.txt](../../llms-full.txt) | 기존 생성 규칙으로 랭킹실을 포함한 상세 색인 문서를 재생성합니다. |
| [my.html](../../my.html) | 별명 입력과 저장 버튼, 프로필 초기값, 공개 전 필수 안내를 연결합니다. |
| [notice.html](../../notice.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [pastexam.html](../../pastexam.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [privacy.html](../../privacy.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [programs/guidebook.html](../../programs/guidebook.html) | 가이드북 템플릿에서 재생성한 상세면입니다. |
| [programs/studio.html](../../programs/studio.html) | 스튜디오 템플릿에서 재생성한 상세면입니다. |
| [ranking.html](../../ranking.html) | 기존 순위표 계약과 법률 foot을 옮긴 독립 랭킹실을 추가합니다. |
| [rss.xml](../../rss.xml) | 기존 생성 규칙으로 랭킹실 항목을 추가합니다. |
| [sitemap.xml](../../sitemap.xml) | 기존 생성 규칙으로 랭킹실 URL을 추가합니다. |
| [studio.html](../../studio.html) | 상세 순위표를 요약 위젯으로 바꾸고 본문 목적지를 6종으로 줄입니다. |
| [support.html](../../support.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |
| [terms.html](../../terms.html) | 공통 GNB, 모바일 탭, 푸터 변경을 재생성하며 기존 본문을 보존합니다. |

**검증 명령과 결과 원문**

`sh _tools/build_all.sh > _design/redesign_20260909/build_r3b_final_1.log 2>&1`, exit 0:

```text
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 41 / nav 없음 0 / 레거시 0
변경 41
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 64 변경 35
analytics 주입 41 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 67면 처리, 43면 기록
sitemap.xml 56 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 56 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=62 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 67 · sitemap 56 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
6fc4b6998b40b462
```

`sh _tools/build_all.sh > _design/redesign_20260909/build_r3b_final_2.log 2>&1`, exit 0:

```text
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 41 / nav 없음 0 / 레거시 0
변경 41
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 64 변경 35
analytics 주입 41 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 67면 처리, 43면 기록
sitemap.xml 56 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 56 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=62 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 67 · sitemap 56 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
6fc4b6998b40b462
```

build_all은 seo_check 마지막 줄만 출력하므로 전건 표를 별도로 수록합니다. `python3 _tools/seo_check.py`, exit 0:

```text
검사                           결과    건수                 비고
-------------------------------------------------------------------
manifest 등재                  PASS  0 fail / 67        
seo 블록/ld+json 1개            PASS  0 fail / 66        
(a) JSON-LD 파싱/필수필드          WARN  0 fail, 1 warn / 67 
(b) canonical 일치             WARN  0 fail, 1 warn / 67 
(c) 내부 링크 dead               PASS  0 fail / 2478      
(d) sitemap == 색인 페이지        PASS  0 fail / 56        
(e2) robots 3범주              PASS  0 fail / 34        
(e3) sitemap URL robots 접근성  PASS  0 fail / 56        
(e) title 유일/description 길이  WARN  0 fail, 1 warn / 67 
(f) 이미지 alt 누락               PASS  0 fail             누락 0건
-------------------------------------------------------------------
FAIL 0건 / WARN 3건 / 검사 10항목
  [WARN] (a) JSON-LD 파싱/필수필드: reader.html: JSON-LD 없음 (skip 페이지)
  [WARN] (b) canonical 일치: reader.html: canonical 없음
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
```

`python3 _design/redesign_20260909/verify_r3_static.py`, exit 0:

```text
PASS protected files=29 legal bodies=2 bytes identical
PASS existing SEO, analytics, fonts, brand film; only two FAQ graphs expanded
PASS copy ledger=377 rendered=448; FAQ HTML=JSON-LD 4/6/6
PASS nine sections, first-block DOM, 12 covers/31 links, tables, ranking DOM, legal foot
PASS new CSS scoped, token sizes, no literal px
13년차 index.html: 1
13년차 programs/guidebook.html: 0
13년차 programs/studio.html: 0
13년차 studio.html: 0
13년차 ranking.html: 0
13년차 my.html: 0
PASS 원장 밖 금액 0줄; 3,865=0; 스튜디오 실제 기출=0; 디지털 7일 이내=0
verify_r3_static: PASS
```

`node _design/redesign_20260909/test_r3_product_buy.mjs`, exit 0:

```text
PASS guidebook/single SKU=guide-snu list_price=33000 qty=1 plan and select state
PASS guidebook/all SKU=guide-all-view list_price=511500 qty=1 plan and select state
PASS guidebook/pdf SKU=guide-all-pdf list_price=1705000 qty=1 plan and select state
PASS studio/pass SKU=pass-korea-hum list_price=495000 qty=1 plan and select state
PASS studio/lecture SKU=lecture-common list_price=220000 qty=1 plan and select state
PASS studio/single routes to the selected unit sets before cart
PASS storage failure surfaces the registered message and cart recovery link
test_r3_product_buy: PASS 7/7
```

별명과 랭킹 실패 경계의 독립 Node VM 검증입니다. 실제 소스를 읽어 DOM과 fetch를 대체했으며 브라우저 검증이 아닙니다. 표준입력 harness는 파일로 작성하지 않았습니다:

```text
$ node <<'JS'  (Node VM harness, actual assets/rank_profile.js and my.html datasets; read-only delegated test)
PASS initial nickname and public state
PASS initial null nickname
PASS save success trims nickname and sends authenticated PATCH
PASS enable blank makes zero API calls and restores checkbox
PASS enable valid saves nickname and public consent in one payload
PASS disable legacy blank nickname sends only rank_public false
PASS save 400 nickname_required maps message and preserves saved state
PASS enable 400 nickname_required maps message and preserves saved state
PASS save 409 nickname_taken maps message and preserves saved state
PASS enable 409 nickname_taken maps message and preserves saved state
PASS save 400 nickname_invalid/too_short maps message and preserves saved state
PASS enable 400 nickname_invalid/too_short maps message and preserves saved state
PASS save 400 nickname_invalid/too_long maps message and preserves saved state
PASS enable 400 nickname_invalid/too_long maps message and preserves saved state
PASS save 400 nickname_invalid/charset maps message and preserves saved state
PASS enable 400 nickname_invalid/charset maps message and preserves saved state
PASS save 400 nickname_invalid/forbidden maps message and preserves saved state
PASS enable 400 nickname_invalid/forbidden maps message and preserves saved state
PASS network failure during public-on restores prior state
PASS network failure during public-off restores prior state
RESULT cases=20 passed=20 failed=0 browser=NOT_RUN files_written=0
exit=0

$ node <<'JS'  (Node VM regression harness, actual rank_profile.js and rank.js; read-only delegated test)
PASS composing Enter and keyCode 229: PATCH=0, preventDefault=0
PASS completed composition Enter: PATCH=1
PASS sets.json failure difficulty view: unknown group=난이도 미확인, retained rows=1, score=90, table visible
RESULT prior_P2_reproductions=2 resolved=2 failed=0 browser=NOT_RUN files_written=0
exit=0
```

`python3 _design/redesign_20260909/ia_links.py`, 변경 전/후 각각 exit 0. 스크립트 자체는 계수 출력만 하므로 exit 0을 IA 상한 PASS로 해석하지 않습니다.

변경 전:

```text
pages=60 dist(home→cart)=1 dist(home→checkout)=2
index.html: body_links=21 targets=11 max_repeat=5 dist=0
programs/guidebook.html: body_links=9 targets=6 max_repeat=2 dist=1
programs/studio.html: body_links=10 targets=6 max_repeat=3 dist=1
guidebook/index.html: body_links=11 targets=9 max_repeat=2 dist=1
studio.html: body_links=14 targets=12 max_repeat=2 dist=1
ranking.html: (없음)
b2b.html: body_links=5 targets=4 max_repeat=2 dist=1
lectures.html: body_links=28 targets=14 max_repeat=3 dist=1
my.html: body_links=11 targets=10 max_repeat=2 dist=1
cart.html: body_links=7 targets=6 max_repeat=2 dist=1
```

변경 후:

```text
pages=61 dist(home→cart)=1 dist(home→checkout)=2
index.html: body_links=17 targets=8 max_repeat=5 dist=0
programs/guidebook.html: body_links=36 targets=35 max_repeat=2 dist=1
programs/studio.html: body_links=12 targets=6 max_repeat=6 dist=1
guidebook/index.html: body_links=11 targets=9 max_repeat=2 dist=1
studio.html: body_links=8 targets=6 max_repeat=2 dist=2
ranking.html: body_links=4 targets=4 max_repeat=1 dist=1
b2b.html: body_links=5 targets=4 max_repeat=2 dist=1
lectures.html: body_links=28 targets=14 max_repeat=3 dist=1
my.html: body_links=11 targets=10 max_repeat=2 dist=1
cart.html: body_links=7 targets=6 max_repeat=2 dist=1
```

`python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only <변경 HTML>`. 각 실행의 등급 줄 원문입니다. 전체 원문과 exit는 style_r3b.log에 있습니다:

```text
_tools/program_guidebook_v2.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
_tools/program_studio_v2.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
about.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
b2b.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
classroom.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
faq.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/ajou.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/catholic.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/cau.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/dankook.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/donga.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/dongduk.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/dongguk.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/duksung.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/ewha.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/gachon.html: [deliverable/general] 등급 C  |  게이트 S1 2건 S2 2건  |  권고 0건
guidebook/hanyang-erica.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/hufs.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/incheon.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/index.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
guidebook/inha.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/khu.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/konkuk.html: [deliverable/general] 등급 C  |  게이트 S1 2건 S2 2건  |  권고 0건
guidebook/kookmin.html: [deliverable/general] 등급 C  |  게이트 S1 0건 S2 8건  |  권고 0건
guidebook/kwangwoon.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/kyonggi.html: [deliverable/general] 등급 D  |  게이트 S1 3건 S2 2건  |  권고 0건
guidebook/myongji.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/pusan.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/sahmyook.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/sejong.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/seoultech.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/snu.html: [deliverable/general] 등급 D  |  게이트 S1 3건 S2 2건  |  권고 0건
guidebook/sookmyung.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/soongsil.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/sungshin.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/swu.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/ulsan.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
guidebook/uos.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
index.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
interview.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
lecture.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
lectures.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
lectures/common.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
lectures/korea-hum.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
lectures/korea-sci.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
lectures/yonsei-hum.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
lectures/yonsei-intl.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
lectures/yonsei-sci.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
library.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
my.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
notice.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
pastexam.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
privacy.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
programs/guidebook.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
programs/studio.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
studio.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
support.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
terms.html: [deliverable/general] 등급 C  |  게이트 S1 0건 S2 9건  |  권고 0건
ranking.html: [deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
```

기준 커밋 대조 명령은 `git show 98b5ff1:<file> | python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only -`입니다. 6건 모두 기존과 같은 C/D이며 각 exit 1입니다. 전문은 style_baseline_r3b.log에 있습니다. 본문 바이트 대조 결과:

```text
PASS guidebook/gachon.html baseline/current main bytes identical; existing style grade preserved
PASS guidebook/konkuk.html baseline/current main bytes identical; existing style grade preserved
PASS guidebook/kookmin.html baseline/current main bytes identical; existing style grade preserved
PASS guidebook/kyonggi.html baseline/current main bytes identical; existing style grade preserved
PASS guidebook/snu.html baseline/current main bytes identical; existing style grade preserved
PASS terms.html baseline/current main bytes identical; existing style grade preserved
```

`node --check assets/rank.js`, `node --check assets/rank_profile.js`, `node --check _design/redesign_20260909/verify_r3.mjs`, `git diff --check`: 모두 exit 0, stdout 없음. 핵심 6면의 인라인 일반 JavaScript를 `node --check` 표준입력으로 대조한 결과:

```text
PASS inline JavaScript syntax 27 blocks
```

**브라우저 실행 대기**

BLOCKED: node _design/redesign_20260909/verify_r3.mjs

기존 Playwright 설치를 쓰며 필요하면 PLAYWRIGHT_MODULE과 PLAYWRIGHT_CHANNEL을 지정합니다. 390×844, 1280×800에서 구매 버튼 첫 화면, 계기 밴드, 표 헤더, 4탭, masked 행, 3보기, 빈 상태, GNB/모바일 href 5개, 본문 목적지, 여백, CTA 높이와 간격, 문서 높이, overflow를 실측합니다. 알려진 가이드북 원시 목적지 상한 충돌은 이 검사에서도 FAIL로 나옵니다. 결과를 보기 전 치수나 브라우저 동작을 PASS로 간주하지 않습니다.

참조한 설계 자산은 SECTION_SPEC_R3.md, FACTS_LEDGER.md, 외부 hh-r2b의 r3_design A/B/C 구조와 shared.css입니다. 외부 목업 문안과 수치는 옮기지 않았습니다.

===== 이어가기 트리거 (새 Claude 용) =====
thread:   현학적연구소_사이트_전수감사_재디자인_20260908
phase:    R3b 구현 반영, 본 세션 대리 검증 대기
context:  hh-r3 기준 98b5ff1, 변경 90파일, 커밋 0, 최종 빌드 2회 6fc4b6998b40b462
last_done: 상세면 2면, 랭킹실, 별명, 메뉴 구현과 비브라우저 검증
next:     verify_r3.mjs 실행, IA 충돌과 기존 문체 6면 처분, 대리 커밋
resume_cmd: "현학 사이트 R3b 검증 이어가"
handover: /Users/gregory/.codex/handover/active/현학적연구소_사이트_전수감사_재디자인_20260908_s5_20260909-1350.md
index:    ~/.codex/handover/INDEX.md
memory:   ~/.codex/projects/-Users-gregory/memory/MEMORY.md
pending_approvals: ~/.codex/pending_approvals.md
ts: 2026-09-09T15:18:53+09:00
warning: 이거 안 지키면 감옥간다. 전과자 되는거야.
===== /이어가기 트리거 =====

IMPL_DONE files=90 commits=0 build_hash=6fc4b6998b40b462 gates=build:PASS,seo:PASS,v2:PASS,aeo:PASS,counts:PASS,samples:PASS,captions:PASS,legal:PASS,links:PASS,worker:PASS,copy:PASS,static:PASS,purchase:PASS,nickname:PASS,style_core:PASS,style_all:FAIL(6_baseline),ia:FAIL BLOCKED="node _design/redesign_20260909/verify_r3.mjs"
