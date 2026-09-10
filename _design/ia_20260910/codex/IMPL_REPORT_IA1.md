IA1 구현 보고서

작업 트리: /Users/gregory/Workspace/_wt/hh-ia
브랜치: ia/20260910-units-links
기준: 44f918f
커밋: 0건. 발주 지시에 따라 git add와 git commit을 실행하지 않았습니다.
소속: 제품 구현과 생성 산출은 런타임 층, 인수 검증과 본 보고서는 메타 층입니다.

구현은 반영했습니다. 최종 빌드 2회는 exit 0, 해시 a5d0e8089fffc5ca로 일치했습니다. 기존 빌드 검증기는 모두 실패 0건입니다. 전체 인수 판정은 FAIL입니다. core 면의 목적지 종류 상한과 전체 변경 HTML의 문체 A/B 조건을 만족하지 못했고, 브라우저와 design-critic 검증은 BLOCKED입니다.

요구 사항 적용: §3의 확정 동선과 §5 승인 문안이 앞선 표보다 우선합니다. 화면 breadcrumb의 href만 바꾸고 JSON-LD와 SEO manifest는 보존했습니다. 허브 점프는 승인된 “전형별 출제 유형과 풀이법”을 사용했습니다. 실제 푸터 열 제목은 “바로가기”라 그 이름을 유지하고 GNB에서 복제한 해당 열에만 링크를 넣었습니다. 예정 목록은 CODES 순서인 연세대 미래캠퍼스, 고려대 고른기회 인문, 고려대 고른기회 자연입니다. 판매 카드 번호도 원장 번호 01, 02, 03, 05, 06을 유지합니다.

남은 FAIL

- IA: 구현 전에도 5개 core 면이 kinds > 6입니다. 승인한 딥링크 묶음 규칙을 적용한 최종 결과에서도 6개 면이 초과합니다. index 9, programs/studio 7, guidebook/index 9, studio 9, lectures 11, my 10입니다. IA 도구 exit 0을 PASS로 판독하지 않았습니다. 기존 목적지를 빼거나 승인 범위 밖 계수 예외를 추가하지 않았습니다.
- 문체: 변경 HTML과 템플릿 68개에서 A 61개, C 5개, D 2개입니다. C는 guidebook/gachon.html, guidebook/konkuk.html, guidebook/kookmin.html, my.html, terms.html이고 D는 guidebook/kyonggi.html, guidebook/snu.html입니다. 7개 모두 HEAD와 등급 및 지적의 규칙과 문면이 동일합니다. 승인표 밖 본문과 법률 문구를 바꾸지 않았으며 전체 style_gate는 FAIL로 남겼습니다.

변경 파일 목록

files는 추적 변경 80개와 신규 구현, 인수 코드, 본 보고서 5개를 합한 85개입니다. 별도 증거 로그와 발주 당시 이미 존재한 ia1_brief.md, ia1_run.log, ia1.pid는 이 수에 포함하지 않습니다.

| 파일 | 변경 요약 |
|---|---|
| [_design/ia_20260910/codex/IMPL_REPORT_IA1.md](/Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/codex/IMPL_REPORT_IA1.md) | 파일별 변경과 검증 원문, 실패와 BLOCKED 인수 항목을 기록했습니다. |
| [_design/ia_20260910/codex/verify_ia1_buy.mjs](/Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/codex/verify_ia1_buy.mjs) | 실제 product_buy.js 이벤트를 DOM 대역으로 실행해 판매 단위 선택, 가격, 수량과 예정 단위 거절을 검사합니다. |
| [_design/ia_20260910/codex/verify_ia1_static.py](/Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/codex/verify_ia1_static.py) | 원장 제원, 공용 마크업, CTA와 유입 경로, SEO와 법률 및 가격의 보존을 대조합니다. |
| [_design/ia_20260910/shot_ia1.mjs](/Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/shot_ia1.mjs) | 8면과 스튜디오 2면의 1280/390 캡처와 넘침, 제목, 열수, 높이, 탭 타깃 검사 명령을 준비했습니다. 브라우저 미실행입니다. |
| [_design/redesign_20260909/ia_links.py](/Users/gregory/Workspace/_wt/hh-ia/_design/redesign_20260909/ia_links.py) | IA1-1 A 결재에 따른 interview 딥링크 1종 계수와 사유 주석만 추가했습니다. |
| [_tools/build_lectures.py](/Users/gregory/Workspace/_wt/hh-ia/_tools/build_lectures.py) | common 제외 목록 5항목과 상세 5면에 전형 안내 링크만 추가했습니다. |
| [_tools/build_programs.py](/Users/gregory/Workspace/_wt/hh-ia/_tools/build_programs.py) | 소개면 8카드와 구매면 template를 기존 빌드 진입점에서 함께 생성합니다. |
| [_tools/build_sitemap.py](/Users/gregory/Workspace/_wt/hh-ia/_tools/build_sitemap.py) | llms 생성부가 sitemap과 공유하는 색인 목록에서 interview 8면도 출력합니다. |
| [_tools/exam_pages/build_exam_pages.py](/Users/gregory/Workspace/_wt/hh-ia/_tools/exam_pages/build_exam_pages.py) | 판매 5면의 응시실과 이용권 CTA, 예정 3면의 공지 버튼과 허브 링크를 생성합니다. |
| [_tools/exam_pages/tpl.html](/Users/gregory/Workspace/_wt/hh-ia/_tools/exam_pages/tpl.html) | 화면 breadcrumb의 href에만 #exam을 추가했습니다. |
| [_tools/interview_hub_v1.html](/Users/gregory/Workspace/_wt/hh-ia/_tools/interview_hub_v1.html) | 요약 4칸 아래에 기존 #exam으로 가는 승인 문안 링크를 추가했습니다. |
| [_tools/program_studio_v2.html](/Users/gregory/Workspace/_wt/hh-ia/_tools/program_studio_v2.html) | 하드코딩 5카드를 __UNITS__ 자리표로 교체하고 카드 밖 담기를 제거했습니다. |
| [_tools/r2_copy.json](/Users/gregory/Workspace/_wt/hh-ia/_tools/r2_copy.json) | 승인한 신규 제목 3키와 카드 라벨을 추가하고 소비자 0인 종전 제원 2키를 제거했습니다. |
| [_tools/studio_units.py](/Users/gregory/Workspace/_wt/hh-ia/_tools/studio_units.py) | CODES와 facts에서 공용 명패 마크업, 초의 분 변환, 판매 5개 template와 예정 3개 목록을 생성합니다. |
| [_tools/v2_shell.py](/Users/gregory/Workspace/_wt/hh-ia/_tools/v2_shell.py) | GNB 원장을 유지하고 푸터 바로가기 열에 허브 링크 1개를 추가했습니다. |
| [about.html](/Users/gregory/Workspace/_wt/hh-ia/about.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [assets/base.css](/Users/gregory/Workspace/_wt/hh-ia/assets/base.css) | 공용 2열 명패, 모바일 1열, 상태와 제원, CTA 간격과 공지 버튼 대비를 기존 토큰으로 정의했습니다. |
| [assets/product_buy.js](/Users/gregory/Workspace/_wt/hh-ia/assets/product_buy.js) | 카드 담기가 해당 판매 단위와 전권 모드를 상단 구매 선택란에 반영합니다. |
| [b2b.html](/Users/gregory/Workspace/_wt/hh-ia/b2b.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [classroom.html](/Users/gregory/Workspace/_wt/hh-ia/classroom.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [faq.html](/Users/gregory/Workspace/_wt/hh-ia/faq.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/ajou.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/ajou.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/catholic.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/catholic.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/cau.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/cau.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/dankook.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/dankook.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/donga.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/donga.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/dongduk.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/dongduk.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/dongguk.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/dongguk.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/duksung.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/duksung.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/ewha.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/ewha.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/gachon.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/gachon.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/hanyang-erica.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/hanyang-erica.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/hufs.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/hufs.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/incheon.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/incheon.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/index.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/index.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/inha.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/inha.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/khu.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/khu.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/konkuk.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/konkuk.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/kookmin.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/kookmin.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/kwangwoon.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/kwangwoon.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/kyonggi.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/kyonggi.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/myongji.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/myongji.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/pusan.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/pusan.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/sahmyook.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/sahmyook.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/sejong.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/sejong.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/seoultech.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/seoultech.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/snu.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/snu.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/sookmyung.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/sookmyung.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/soongsil.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/soongsil.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/sungshin.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/sungshin.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/swu.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/swu.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/ulsan.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/ulsan.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [guidebook/uos.html](/Users/gregory/Workspace/_wt/hh-ia/guidebook/uos.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [index.html](/Users/gregory/Workspace/_wt/hh-ia/index.html) | 스튜디오 상품 카드 하단에 허브 보조 링크를 추가하고 공통 푸터를 재생성했습니다. |
| [interview.html](/Users/gregory/Workspace/_wt/hh-ia/interview.html) | 머리의 #exam 점프와 공통 푸터를 생성했습니다. 기존 8카드는 유지했습니다. |
| [interview/korea-eq-hum.html](/Users/gregory/Workspace/_wt/hh-ia/interview/korea-eq-hum.html) | CTA와 화면 breadcrumb 및 공통 푸터를 재생성했습니다. SEO와 안내 본문은 보존했습니다. |
| [interview/korea-eq-sci.html](/Users/gregory/Workspace/_wt/hh-ia/interview/korea-eq-sci.html) | CTA와 화면 breadcrumb 및 공통 푸터를 재생성했습니다. SEO와 안내 본문은 보존했습니다. |
| [interview/korea-hum.html](/Users/gregory/Workspace/_wt/hh-ia/interview/korea-hum.html) | CTA와 화면 breadcrumb 및 공통 푸터를 재생성했습니다. SEO와 안내 본문은 보존했습니다. |
| [interview/korea-sci.html](/Users/gregory/Workspace/_wt/hh-ia/interview/korea-sci.html) | CTA와 화면 breadcrumb 및 공통 푸터를 재생성했습니다. SEO와 안내 본문은 보존했습니다. |
| [interview/yonsei-hum.html](/Users/gregory/Workspace/_wt/hh-ia/interview/yonsei-hum.html) | CTA와 화면 breadcrumb 및 공통 푸터를 재생성했습니다. SEO와 안내 본문은 보존했습니다. |
| [interview/yonsei-intl.html](/Users/gregory/Workspace/_wt/hh-ia/interview/yonsei-intl.html) | CTA와 화면 breadcrumb 및 공통 푸터를 재생성했습니다. SEO와 안내 본문은 보존했습니다. |
| [interview/yonsei-mirae.html](/Users/gregory/Workspace/_wt/hh-ia/interview/yonsei-mirae.html) | CTA와 화면 breadcrumb 및 공통 푸터를 재생성했습니다. SEO와 안내 본문은 보존했습니다. |
| [interview/yonsei-sci.html](/Users/gregory/Workspace/_wt/hh-ia/interview/yonsei-sci.html) | CTA와 화면 breadcrumb 및 공통 푸터를 재생성했습니다. SEO와 안내 본문은 보존했습니다. |
| [lecture.html](/Users/gregory/Workspace/_wt/hh-ia/lecture.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [lectures.html](/Users/gregory/Workspace/_wt/hh-ia/lectures.html) | 단위 머리 5곳의 안내 링크와 공통 푸터를 생성했습니다. |
| [lectures/common.html](/Users/gregory/Workspace/_wt/hh-ia/lectures/common.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [lectures/korea-hum.html](/Users/gregory/Workspace/_wt/hh-ia/lectures/korea-hum.html) | 제목 아래 안내 링크 1개와 공통 푸터를 생성했습니다. 기존 강좌 본문과 가격은 보존했습니다. |
| [lectures/korea-sci.html](/Users/gregory/Workspace/_wt/hh-ia/lectures/korea-sci.html) | 제목 아래 안내 링크 1개와 공통 푸터를 생성했습니다. 기존 강좌 본문과 가격은 보존했습니다. |
| [lectures/yonsei-hum.html](/Users/gregory/Workspace/_wt/hh-ia/lectures/yonsei-hum.html) | 제목 아래 안내 링크 1개와 공통 푸터를 생성했습니다. 기존 강좌 본문과 가격은 보존했습니다. |
| [lectures/yonsei-intl.html](/Users/gregory/Workspace/_wt/hh-ia/lectures/yonsei-intl.html) | 제목 아래 안내 링크 1개와 공통 푸터를 생성했습니다. 기존 강좌 본문과 가격은 보존했습니다. |
| [lectures/yonsei-sci.html](/Users/gregory/Workspace/_wt/hh-ia/lectures/yonsei-sci.html) | 제목 아래 안내 링크 1개와 공통 푸터를 생성했습니다. 기존 강좌 본문과 가격은 보존했습니다. |
| [library.html](/Users/gregory/Workspace/_wt/hh-ia/library.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [llms.txt](/Users/gregory/Workspace/_wt/hh-ia/llms.txt) | 색인 가능한 전형 안내 8면을 기존 학교별 스튜디오 구역에 등재했습니다. |
| [my.html](/Users/gregory/Workspace/_wt/hh-ia/my.html) | 보유 단위와 낱권 해설의 실제 단위 이름 옆에 허용 단위 안내 링크를 추가했습니다. |
| [notice.html](/Users/gregory/Workspace/_wt/hh-ia/notice.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [pastexam.html](/Users/gregory/Workspace/_wt/hh-ia/pastexam.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [privacy.html](/Users/gregory/Workspace/_wt/hh-ia/privacy.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [programs/guidebook.html](/Users/gregory/Workspace/_wt/hh-ia/programs/guidebook.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [programs/studio.html](/Users/gregory/Workspace/_wt/hh-ia/programs/studio.html) | 원장 순서의 명패 8장과 카드별 안내, 응시실, 담기 및 공통 푸터를 생성했습니다. |
| [ranking.html](/Users/gregory/Workspace/_wt/hh-ia/ranking.html) | 탭 바로 아래에 허브 링크 1개를 추가하고 공통 푸터를 재생성했습니다. |
| [rss.xml](/Users/gregory/Workspace/_wt/hh-ia/rss.xml) | 기존 생성 규칙으로 수정일과 항목 순서를 재생성했습니다. |
| [sitemap.xml](/Users/gregory/Workspace/_wt/hh-ia/sitemap.xml) | 기존 생성 규칙으로 변경 면의 lastmod를 재생성했습니다. |
| [studio.html](/Users/gregory/Workspace/_wt/hh-ia/studio.html) | 공용 template로 판매 5카드를 렌더하고 가격과 담기 계약을 연결하며 예정 3개 안내 링크를 표시합니다. |
| [support.html](/Users/gregory/Workspace/_wt/hh-ia/support.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |
| [terms.html](/Users/gregory/Workspace/_wt/hh-ia/terms.html) | 공통 푸터 안내 링크 1개만 재생성했습니다. 본문은 보존했습니다. |

단계별 종료 상태 원문


```text
단계 A 끝
$ rg -n 'r3_yonsei_spec|r3_korea_spec' _tools programs --glob '*.py' --glob '*.html'
(출력 없음: 소비자 0, 미사용 문안 키 삭제)
$ git status --short
 M _tools/build_programs.py
 M _tools/program_studio_v2.html
 M _tools/r2_copy.json
 M assets/base.css
 M assets/product_buy.js
 M programs/guidebook.html
 M programs/korea.html
 M programs/studio.html
 M programs/yonsei.html
?? _design/ia_20260910/
?? _tools/studio_units.py
```


```text
단계 B 끝
$ git status --short
 M _tools/build_programs.py
 M _tools/program_studio_v2.html
 M _tools/r2_copy.json
 M assets/base.css
 M assets/product_buy.js
 M programs/guidebook.html
 M programs/korea.html
 M programs/studio.html
 M programs/yonsei.html
 M studio.html
?? _design/ia_20260910/
?? _tools/studio_units.py
```


```text
단계 C 끝
$ git status --short
 M _design/redesign_20260909/ia_links.py
 M _tools/build_lectures.py
 M _tools/build_programs.py
 M _tools/build_sitemap.py
 M _tools/exam_pages/build_exam_pages.py
 M _tools/exam_pages/tpl.html
 M _tools/interview_hub_v1.html
 M _tools/program_studio_v2.html
 M _tools/r2_copy.json
 M _tools/v2_shell.py
 M assets/base.css
 M assets/product_buy.js
 M classroom.html
 M index.html
 M interview.html
 M interview/korea-eq-hum.html
 M interview/korea-eq-sci.html
 M interview/korea-hum.html
 M interview/korea-sci.html
 M interview/yonsei-hum.html
 M interview/yonsei-intl.html
 M interview/yonsei-mirae.html
 M interview/yonsei-sci.html
 M lectures.html
 M lectures/common.html
 M lectures/korea-hum.html
 M lectures/korea-sci.html
 M lectures/yonsei-hum.html
 M lectures/yonsei-intl.html
 M lectures/yonsei-sci.html
 M my.html
 M programs/guidebook.html
 M programs/korea.html
 M programs/studio.html
 M programs/yonsei.html
 M ranking.html
 M studio.html
?? _design/ia_20260910/
?? _tools/studio_units.py
```


```text
단계 D 끝
$ git status --short
 M _design/redesign_20260909/ia_links.py
 M _tools/build_lectures.py
 M _tools/build_programs.py
 M _tools/build_sitemap.py
 M _tools/exam_pages/build_exam_pages.py
 M _tools/exam_pages/tpl.html
 M _tools/interview_hub_v1.html
 M _tools/program_studio_v2.html
 M _tools/r2_copy.json
 M _tools/v2_shell.py
 M about.html
 M assets/base.css
 M assets/product_buy.js
 M b2b.html
 M classroom.html
 M faq.html
 M guidebook/ajou.html
 M guidebook/catholic.html
 M guidebook/cau.html
 M guidebook/dankook.html
 M guidebook/donga.html
 M guidebook/dongduk.html
 M guidebook/dongguk.html
 M guidebook/duksung.html
 M guidebook/ewha.html
 M guidebook/gachon.html
 M guidebook/hanyang-erica.html
 M guidebook/hufs.html
 M guidebook/incheon.html
 M guidebook/index.html
 M guidebook/inha.html
 M guidebook/khu.html
 M guidebook/konkuk.html
 M guidebook/kookmin.html
 M guidebook/kwangwoon.html
 M guidebook/kyonggi.html
 M guidebook/myongji.html
 M guidebook/pusan.html
 M guidebook/sahmyook.html
 M guidebook/sejong.html
 M guidebook/seoultech.html
 M guidebook/snu.html
 M guidebook/sookmyung.html
 M guidebook/soongsil.html
 M guidebook/sungshin.html
 M guidebook/swu.html
 M guidebook/ulsan.html
 M guidebook/uos.html
 M index.html
 M interview.html
 M interview/korea-eq-hum.html
 M interview/korea-eq-sci.html
 M interview/korea-hum.html
 M interview/korea-sci.html
 M interview/yonsei-hum.html
 M interview/yonsei-intl.html
 M interview/yonsei-mirae.html
 M interview/yonsei-sci.html
 M lecture.html
 M lectures.html
 M lectures/common.html
 M lectures/korea-hum.html
 M lectures/korea-sci.html
 M lectures/yonsei-hum.html
 M lectures/yonsei-intl.html
 M lectures/yonsei-sci.html
 M library.html
 M llms.txt
 M my.html
 M notice.html
 M pastexam.html
 M privacy.html
 M programs/guidebook.html
 M programs/studio.html
 M ranking.html
 M rss.xml
 M sitemap.xml
 M studio.html
 M support.html
 M terms.html
?? _design/ia_20260910/
?? _tools/studio_units.py

$ git diff --stat
 _design/redesign_20260909/ia_links.py |   2 +
 _tools/build_lectures.py              |   6 +-
 _tools/build_programs.py              |   9 +-
 _tools/build_sitemap.py               |   2 +-
 _tools/exam_pages/build_exam_pages.py |   6 +-
 _tools/exam_pages/tpl.html            |   2 +-
 _tools/interview_hub_v1.html          |   1 +
 _tools/program_studio_v2.html         |   2 +-
 _tools/r2_copy.json                   |  15 +-
 _tools/v2_shell.py                    |   1 +
 about.html                            |   2 +-
 assets/base.css                       |  41 +++-
 assets/product_buy.js                 |   7 +
 b2b.html                              |   2 +-
 classroom.html                        |   2 +-
 faq.html                              |   2 +-
 guidebook/ajou.html                   |   2 +-
 guidebook/catholic.html               |   2 +-
 guidebook/cau.html                    |   2 +-
 guidebook/dankook.html                |   2 +-
 guidebook/donga.html                  |   2 +-
 guidebook/dongduk.html                |   2 +-
 guidebook/dongguk.html                |   2 +-
 guidebook/duksung.html                |   2 +-
 guidebook/ewha.html                   |   2 +-
 guidebook/gachon.html                 |   2 +-
 guidebook/hanyang-erica.html          |   2 +-
 guidebook/hufs.html                   |   2 +-
 guidebook/incheon.html                |   2 +-
 guidebook/index.html                  |   2 +-
 guidebook/inha.html                   |   2 +-
 guidebook/khu.html                    |   2 +-
 guidebook/konkuk.html                 |   2 +-
 guidebook/kookmin.html                |   2 +-
 guidebook/kwangwoon.html              |   2 +-
 guidebook/kyonggi.html                |   2 +-
 guidebook/myongji.html                |   2 +-
 guidebook/pusan.html                  |   2 +-
 guidebook/sahmyook.html               |   2 +-
 guidebook/sejong.html                 |   2 +-
 guidebook/seoultech.html              |   2 +-
 guidebook/snu.html                    |   2 +-
 guidebook/sookmyung.html              |   2 +-
 guidebook/soongsil.html               |   2 +-
 guidebook/sungshin.html               |   2 +-
 guidebook/swu.html                    |   2 +-
 guidebook/ulsan.html                  |   2 +-
 guidebook/uos.html                    |   2 +-
 index.html                            |   4 +-
 interview.html                        |   3 +-
 interview/korea-eq-hum.html           |   6 +-
 interview/korea-eq-sci.html           |   6 +-
 interview/korea-hum.html              |   6 +-
 interview/korea-sci.html              |   6 +-
 interview/yonsei-hum.html             |   6 +-
 interview/yonsei-intl.html            |   6 +-
 interview/yonsei-mirae.html           |   6 +-
 interview/yonsei-sci.html             |   6 +-
 lecture.html                          |   2 +-
 lectures.html                         |  12 +-
 lectures/common.html                  |   2 +-
 lectures/korea-hum.html               |   4 +-
 lectures/korea-sci.html               |   4 +-
 lectures/yonsei-hum.html              |   4 +-
 lectures/yonsei-intl.html             |   4 +-
 lectures/yonsei-sci.html              |   4 +-
 library.html                          |   2 +-
 llms.txt                              |   8 +
 my.html                               |   4 +-
 notice.html                           |   2 +-
 pastexam.html                         |   2 +-
 privacy.html                          |   2 +-
 programs/guidebook.html               |   2 +-
 programs/studio.html                  |  11 +-
 ranking.html                          |   3 +-
 rss.xml                               | 358 +++++++++++++++++-----------------
 sitemap.xml                           |  80 ++++----
 studio.html                           |  42 ++--
 support.html                          |   2 +-
 terms.html                            |   2 +-
 80 files changed, 434 insertions(+), 343 deletions(-)
```


빌드 실행 원문

A에서 C 반영 후 최초 2회, 공지 버튼 수리 후 2회, 기존 data-primary 단일 표식 계약 보존 후 최종 2회를 모두 보존합니다. 첫 실행부터 exit 0입니다. 1, 2회 해시는 92a7c9efb572bc4f, 3, 4회 해시는 95bd1a1816307192, 최종 5, 6회 해시는 a5d0e8089fffc5ca입니다.

실행 1: `sh _tools/build_all.sh`

```text
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 49 / nav 없음 0 / 레거시 0
변경 62
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 72 변경 43
analytics 주입 49 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 75면 처리, 53면 기록
sitemap.xml 64 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 64 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=70 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 75 · sitemap 64 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
92a7c9efb572bc4f

exit=0
```

실행 2: `sh _tools/build_all.sh`

```text
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 49 / nav 없음 0 / 레거시 0
변경 49
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 72 변경 43
analytics 주입 49 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 75면 처리, 53면 기록
sitemap.xml 64 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 64 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=70 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 75 · sitemap 64 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
92a7c9efb572bc4f

exit=0
```

실행 3: `sh _tools/build_all.sh`

```text
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 49 / nav 없음 0 / 레거시 0
변경 49
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 72 변경 43
analytics 주입 49 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 75면 처리, 53면 기록
sitemap.xml 64 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 64 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=70 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 75 · sitemap 64 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
95bd1a1816307192

exit=0
```

실행 4: `sh _tools/build_all.sh`

```text
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 49 / nav 없음 0 / 레거시 0
변경 49
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 72 변경 43
analytics 주입 49 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 75면 처리, 53면 기록
sitemap.xml 64 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 64 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=70 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 75 · sitemap 64 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
95bd1a1816307192

exit=0
```

실행 5: `sh _tools/build_all.sh`

```text
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 49 / nav 없음 0 / 레거시 0
변경 49
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 72 변경 43
analytics 주입 49 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 75면 처리, 53면 기록
sitemap.xml 64 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 64 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=70 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 75 · sitemap 64 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
a5d0e8089fffc5ca

exit=0
```
실행 6: `sh _tools/build_all.sh`

```text
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
경고: 후공정 산물이 지워졌다 (analytics:begin, bizinfo, class="fix"). sh _tools/build_all.sh 로 복구할 것.
정보: SEARCH 공식 검증 통과. 책 1부·2부 미수록 전형 20건은 상품 문구에서 빼고 hub 에 표식: catholic: '학교장추천전형'; catholic: '학교장추천전형 의예과'; dongguk: '불교추천인재'; ewha: '예체능서류전형'; gachon: '가천의약학'; kookmin: '국제인재'; kwangwoon: '소프트웨어우수인재전형'; kyonggi: '디자인학부'; myongji: '크리스천리더전형'; myongji: '교과면접전형'; pusan: '지역인재전형'; pusan: '의예과'; sejong: '세종인재전형(면접형) 창의소프트학부'; snu: '일반전형'; uos: '기회균형전형Ⅰ'; dgist: '일반전형'; pknu: '학교생활우수인재'; sahmyook: 'S/W인재'; sahmyook: '예체능인재'; ulsan: '의예과'
[build_lectures] 상품 구성에서 제외한 OT 1편: lec_common_L0-0
변경 49 / nav 없음 0 / 레거시 0
변경 49
promo 적용: LP 4 + 홈 1 + 팝업 6 / 변경 3 ['guidebook/index.html', 'lectures.html', 'interview.html'] / 행사 중
변경 41
base.css 면 72 변경 43
analytics 주입 49 ga4=G-2ZM01XDLNT meta_pixel=1788228408971711 wcs=없음
-- 75면 처리, 53면 기록
sitemap.xml 64 URL / robots.txt / llms.txt / llms-full.txt 기록
rss.xml 64 항목 기록
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
v2_check: files=70 fails=0
면 31 / FAIL 0건
최신 (terms a05229cb3d39, privacy f037c605661e)
지면 = 원장 (낡음 0)
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
자막 게이트 통과: 영상 배선 11건, 면제 0건
link_check: 면 75 · sitemap 64 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
worker_check: FAIL 0 / 27 항목
a5d0e8089fffc5ca

exit=0
```

검증기 독립 실행 원문

seo_check의 reader.html 관련 WARN 3건은 원문 그대로 기록합니다. 실패는 0건입니다.

```text
$ python3 _tools/seo_check.py
검사                           결과    건수                 비고
-------------------------------------------------------------------
manifest 등재                  PASS  0 fail / 75        
seo 블록/ld+json 1개            PASS  0 fail / 74        
(a) JSON-LD 파싱/필수필드          WARN  0 fail, 1 warn / 75 
(b) canonical 일치             WARN  0 fail, 1 warn / 75 
(c) 내부 링크 dead               PASS  0 fail / 2910      
(d) sitemap == 색인 페이지        PASS  0 fail / 64        
(e2) robots 3범주              PASS  0 fail / 34        
(e3) sitemap URL robots 접근성  PASS  0 fail / 64        
(e) title 유일/description 길이  WARN  0 fail, 1 warn / 75 
(f) 이미지 alt 누락               PASS  0 fail             누락 0건
-------------------------------------------------------------------
FAIL 0건 / WARN 3건 / 검사 10항목
  [WARN] (a) JSON-LD 파싱/필수필드: reader.html: JSON-LD 없음 (skip 페이지)
  [WARN] (b) canonical 일치: reader.html: canonical 없음
  [WARN] (e) title 유일/description 길이: reader.html: description 비어 있음 (noindex)
exit=0

$ python3 _tools/v2_check.py
v2_check: files=70 fails=0
exit=0

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

$ python3 _tools/apply_counts.py --check
원장: 판매 31권, 기출 3,934문, 본문 1,198면
지면 = 원장 (낡음 0)
exit=0

$ python3 _tools/build_samples.py --check
build_samples --check: 표본 12장 + 확대 1 / FAIL 0건 (v24 PDF 100417407367be5d)
exit=0

$ python3 _tools/build_brand_captions_v2.py --check
[hero] 자막 봉인 대조 통과(설계 원본 없는 트리)
[full] 자막 봉인 대조 통과(설계 원본 없는 트리)
exit=0

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

$ python3 _tools/apply_checkout_legal.py --check
최신 (terms a05229cb3d39, privacy f037c605661e)
exit=0

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
연세대 활동우수형 면접                3  programs/yonsei.html  OK
연대 면접                       3  programs/yonsei.html  OK
연세대 면접                      9  programs/yonsei.html  OK
연세대 제시문 면접                  5  programs/yonsei.html  OK
연세대 모의면접                    3  programs/yonsei.html  OK
연세대 면접컨설팅                   1  programs/yonsei.html  OK
고려대 계열적합형 면접                1  programs/korea.html  OK
고려대 계열적합전형 면접               4  programs/korea.html  OK
고대 면접                       4  programs/korea.html  OK
고려대 면접                      9  programs/korea.html  OK
고려대 제시문 면접                 64  programs/korea.html  OK
고려대 모의면접                    3  programs/korea.html  OK
생기부 면접                     36  interview.html  OK
서류기반 면접                    39  interview.html  OK
대입 면접컨설팅                    5  interview.html  OK
대입 모의면접                     7  interview.html  OK
모의면접                       41  studio.html  OK
면접컨설팅                      38  index.html  OK
면접 예상문제                    38  index.html  OK
면접 기출문제                    39  index.html  OK
대입 면접 준비                   37  index.html  OK
MMI 면접                      1  interview.html  OK
------------------------------------------------------------
seo_keyword_census: 가이드북 31/31면 전 구절, 계열 22/22 / FAIL 0건
exit=0

$ python3 _tools/link_check.py
link_check: 면 75 · sitemap 64 · 삭제 이력 37 · 워커 301 표 7+33 · fails=0
exit=0

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

$ git diff --check
exit=0
```


IA 계수 원문

구현 전 기준선: `python3 _design/redesign_20260909/ia_links.py`

```text
pages=69 dist(home→cart)=1 dist(home→checkout)=2
index.html: body_links=18 targets=8 max_repeat=5 dist=0 | kinds=8 max_repeat_query_distinct=5
programs/guidebook.html: body_links=36 targets=35 max_repeat=2 dist=1 | kinds=5 max_repeat_query_distinct=2
programs/studio.html: body_links=12 targets=6 max_repeat=6 dist=1 | kinds=6 max_repeat_query_distinct=2
guidebook/index.html: body_links=12 targets=9 max_repeat=2 dist=1 | kinds=9 max_repeat_query_distinct=2
studio.html: body_links=9 targets=7 max_repeat=2 dist=2 | kinds=7 max_repeat_query_distinct=2
ranking.html: body_links=4 targets=4 max_repeat=1 dist=1 | kinds=4 max_repeat_query_distinct=1
b2b.html: body_links=5 targets=4 max_repeat=2 dist=1 | kinds=4 max_repeat_query_distinct=2
lectures.html: body_links=29 targets=15 max_repeat=3 dist=1 | kinds=10 max_repeat_query_distinct=3
my.html: body_links=11 targets=10 max_repeat=2 dist=1 | kinds=10 max_repeat_query_distinct=2
cart.html: body_links=7 targets=6 max_repeat=2 dist=1 | kinds=6 max_repeat_query_distinct=2
exit=0
```

최종 산출에 기존 kind()를 적용한 결과입니다. 링크 변경 효과와 승인한 계수 변경 효과를 구별하기 위해 함께 기록합니다.

```text
$ git show HEAD:_design/redesign_20260909/ia_links.py | python3 -
pages=69 dist(home→cart)=1 dist(home→checkout)=2
index.html: body_links=19 targets=9 max_repeat=5 dist=0 | kinds=9 max_repeat_query_distinct=5
programs/guidebook.html: body_links=36 targets=35 max_repeat=2 dist=1 | kinds=5 max_repeat_query_distinct=2
programs/studio.html: body_links=20 targets=14 max_repeat=6 dist=1 | kinds=14 max_repeat_query_distinct=2
guidebook/index.html: body_links=12 targets=9 max_repeat=2 dist=1 | kinds=9 max_repeat_query_distinct=2
studio.html: body_links=22 targets=16 max_repeat=5 dist=2 | kinds=16 max_repeat_query_distinct=2
ranking.html: body_links=5 targets=5 max_repeat=1 dist=1 | kinds=5 max_repeat_query_distinct=1
b2b.html: body_links=5 targets=4 max_repeat=2 dist=1 | kinds=4 max_repeat_query_distinct=2
lectures.html: body_links=34 targets=20 max_repeat=3 dist=1 | kinds=15 max_repeat_query_distinct=3
my.html: body_links=11 targets=10 max_repeat=2 dist=1 | kinds=10 max_repeat_query_distinct=2
cart.html: body_links=7 targets=6 max_repeat=2 dist=1 | kinds=6 max_repeat_query_distinct=2
exit=0
```

최종 산출과 승인한 kind()의 결과입니다. core 10면 중 4면만 kinds <= 6이며 전건 조건은 FAIL입니다.

```text
$ python3 _design/redesign_20260909/ia_links.py
pages=69 dist(home→cart)=1 dist(home→checkout)=2
index.html: body_links=19 targets=9 max_repeat=5 dist=0 | kinds=9 max_repeat_query_distinct=5
programs/guidebook.html: body_links=36 targets=35 max_repeat=2 dist=1 | kinds=5 max_repeat_query_distinct=2
programs/studio.html: body_links=20 targets=14 max_repeat=6 dist=1 | kinds=7 max_repeat_query_distinct=2
guidebook/index.html: body_links=12 targets=9 max_repeat=2 dist=1 | kinds=9 max_repeat_query_distinct=2
studio.html: body_links=22 targets=16 max_repeat=5 dist=2 | kinds=9 max_repeat_query_distinct=2
ranking.html: body_links=5 targets=5 max_repeat=1 dist=1 | kinds=5 max_repeat_query_distinct=1
b2b.html: body_links=5 targets=4 max_repeat=2 dist=1 | kinds=4 max_repeat_query_distinct=2
lectures.html: body_links=34 targets=20 max_repeat=3 dist=1 | kinds=11 max_repeat_query_distinct=3
my.html: body_links=11 targets=10 max_repeat=2 dist=1 | kinds=10 max_repeat_query_distinct=2
cart.html: body_links=7 targets=6 max_repeat=2 dist=1 | kinds=6 max_repeat_query_distinct=2
exit=0
```


원장, 보존 계약과 유입 경로 정적 검증 원문

```text
$ python3 _design/ia_20260910/codex/verify_ia1_static.py
PASS LP 8 cards in CODES order
PASS purchase templates only 5 sale units
PASS LP standalone cart link removed
PASS LP keeps single purchase data-primary marker
PASS yonsei-hum title from approved source
PASS yonsei-hum facts to minutes: ['8분', '5분', '2개']
PASS yonsei-hum primary guide
PASS yonsei-hum allowed actions
PASS yonsei-hum shared markup ./span
PASS yonsei-hum shared markup ./div[1]
PASS yonsei-hum shared markup ./dl
PASS yonsei-hum shared markup ./p
PASS yonsei-hum CTA routes
PASS yonsei-hum screen breadcrumb
PASS yonsei-hum llms entry
PASS yonsei-sci title from approved source
PASS yonsei-sci facts to minutes: ['8분', '5분', '2개']
PASS yonsei-sci primary guide
PASS yonsei-sci allowed actions
PASS yonsei-sci shared markup ./span
PASS yonsei-sci shared markup ./div[1]
PASS yonsei-sci shared markup ./dl
PASS yonsei-sci shared markup ./p
PASS yonsei-sci CTA routes
PASS yonsei-sci screen breadcrumb
PASS yonsei-sci llms entry
PASS yonsei-intl title from approved source
PASS yonsei-intl facts to minutes: ['8분', '5분', '2개']
PASS yonsei-intl primary guide
PASS yonsei-intl allowed actions
PASS yonsei-intl shared markup ./span
PASS yonsei-intl shared markup ./div[1]
PASS yonsei-intl shared markup ./dl
PASS yonsei-intl shared markup ./p
PASS yonsei-intl CTA routes
PASS yonsei-intl screen breadcrumb
PASS yonsei-intl llms entry
PASS yonsei-mirae title from approved source
PASS yonsei-mirae facts to minutes: ['10분', '5분', '3개']
PASS yonsei-mirae primary guide
PASS yonsei-mirae allowed actions
PASS yonsei-mirae opening status and no commerce
PASS yonsei-mirae CTA routes
PASS yonsei-mirae screen breadcrumb
PASS yonsei-mirae llms entry
PASS korea-hum title from approved source
PASS korea-hum facts to minutes: ['21분', '7분', '3개']
PASS korea-hum primary guide
PASS korea-hum allowed actions
PASS korea-hum shared markup ./span
PASS korea-hum shared markup ./div[1]
PASS korea-hum shared markup ./dl
PASS korea-hum shared markup ./p
PASS korea-hum CTA routes
PASS korea-hum screen breadcrumb
PASS korea-hum llms entry
PASS korea-sci title from approved source
PASS korea-sci facts to minutes: ['21분', '7분', '3개']
PASS korea-sci primary guide
PASS korea-sci allowed actions
PASS korea-sci shared markup ./span
PASS korea-sci shared markup ./div[1]
PASS korea-sci shared markup ./dl
PASS korea-sci shared markup ./p
PASS korea-sci CTA routes
PASS korea-sci screen breadcrumb
PASS korea-sci llms entry
PASS korea-eq-hum title from approved source
PASS korea-eq-hum facts to minutes: ['12분', '6분', '3개']
PASS korea-eq-hum primary guide
PASS korea-eq-hum allowed actions
PASS korea-eq-hum opening status and no commerce
PASS korea-eq-hum CTA routes
PASS korea-eq-hum screen breadcrumb
PASS korea-eq-hum llms entry
PASS korea-eq-sci title from approved source
PASS korea-eq-sci facts to minutes: ['12분', '6분', '3개']
PASS korea-eq-sci primary guide
PASS korea-eq-sci allowed actions
PASS korea-eq-sci opening status and no commerce
PASS korea-eq-sci CTA routes
PASS korea-eq-sci screen breadcrumb
PASS korea-eq-sci llms entry
PASS purchase opening list order
PASS hub summary jump
PASS yonsei-hum lectures list/detail ingress
PASS yonsei-sci lectures list/detail ingress
PASS yonsei-intl lectures list/detail ingress
PASS korea-hum lectures list/detail ingress
PASS korea-sci lectures list/detail ingress
PASS SEO byte preservation: []
PASS analytics byte preservation: []
PASS font loading byte preservation: []
PASS brand film byte preservation: []
PASS terms.html legal main byte preservation
PASS privacy.html legal main byte preservation
PASS literal list prices and order preserved: []
PASS protected source files
INGRESS excluding interview/*.html, _tools templates, design/docs and scripts; purchase templates render verified above
PASS yonsei-hum >=3 inbound pages: 5 interview.html, lectures.html, lectures/yonsei-hum.html, programs/studio.html, studio.html
PASS yonsei-sci >=3 inbound pages: 5 interview.html, lectures.html, lectures/yonsei-sci.html, programs/studio.html, studio.html
PASS yonsei-intl >=3 inbound pages: 5 interview.html, lectures.html, lectures/yonsei-intl.html, programs/studio.html, studio.html
PASS yonsei-mirae >=3 inbound pages: 3 interview.html, programs/studio.html, studio.html
PASS korea-hum >=3 inbound pages: 5 interview.html, lectures.html, lectures/korea-hum.html, programs/studio.html, studio.html
PASS korea-sci >=3 inbound pages: 5 interview.html, lectures.html, lectures/korea-sci.html, programs/studio.html, studio.html
PASS korea-eq-hum >=3 inbound pages: 3 interview.html, programs/studio.html, studio.html
PASS korea-eq-sci >=3 inbound pages: 3 interview.html, programs/studio.html, studio.html
IA1_STATIC failures=0
exit=0
```


구매 이벤트 시험 원문

실제 assets/product_buy.js를 실행하되 DOM 표면을 대역으로 제공했습니다. 브라우저 렌더링 검증은 포함하지 않습니다.

```text
$ node _design/ia_20260910/codex/verify_ia1_buy.mjs
PASS card korea-hum: selects sale unit, restores pass, preserves cart price and quantity
PASS card korea-sci: selects sale unit, restores pass, preserves cart price and quantity
PASS card yonsei-hum: selects sale unit, restores pass, preserves cart price and quantity
PASS card yonsei-sci: selects sale unit, restores pass, preserves cart price and quantity
PASS card yonsei-intl: selects sale unit, restores pass, preserves cart price and quantity
PASS rejects non-sale card "yonsei-mirae"
PASS rejects non-sale card "korea-eq-hum"
PASS rejects non-sale card "korea-eq-sci"
PASS rejects non-sale card "unknown"
PASS rejects non-sale card "\"><script>"
IA1_BUY failures=0 (DOM event unit test; browser acceptance remains BLOCKED)
exit=0
```


12개월 회귀 검사 원문

검색 결과는 0건입니다. grep exit 1은 일치 문면 0건을 뜻합니다.

```text
$ grep -rn "12개월" --include=*.html . | grep -v "_design\|_docs\|b2b.html"
exit=1
match_lines=0
```


8면 유입 링크 수

| 면 코드 | 요청 grep 원시 수 | 자기 면과 xsib를 제외한 실제 유입 면 | 판정 |
|---|---:|---:|---|
| yonsei-hum | 6 | 5 | PASS |
| yonsei-sci | 6 | 5 | PASS |
| yonsei-intl | 6 | 5 | PASS |
| yonsei-mirae | 4 | 3 | PASS |
| korea-hum | 6 | 5 | PASS |
| korea-sci | 6 | 5 | PASS |
| korea-eq-hum | 4 | 3 | PASS |
| korea-eq-sci | 4 | 3 | PASS |

원시 grep은 각 안내 면 자신의 canonical 경로도 1건 세므로 해당 1건을 제외했습니다. 정적 검증은 interview/*.html 전체와 _tools, _design, _docs 및 스크립트를 제외합니다. 판매 면은 programs/studio, studio, interview 허브, lectures 목록, 해당 강좌 상세의 5곳이고 예정 면은 앞의 3곳입니다. 구매면 판매 링크는 공용 template에서 실제 렌더되는 5카드를 검증한 뒤 계수했습니다.

```text
$ grep -rl "interview/yonsei-hum.html" --include=*.html . | grep -v _design | wc -l
       6
exit=0

$ grep -rl "interview/yonsei-sci.html" --include=*.html . | grep -v _design | wc -l
       6
exit=0

$ grep -rl "interview/yonsei-intl.html" --include=*.html . | grep -v _design | wc -l
       6
exit=0

$ grep -rl "interview/yonsei-mirae.html" --include=*.html . | grep -v _design | wc -l
       4
exit=0

$ grep -rl "interview/korea-hum.html" --include=*.html . | grep -v _design | wc -l
       6
exit=0

$ grep -rl "interview/korea-sci.html" --include=*.html . | grep -v _design | wc -l
       6
exit=0

$ grep -rl "interview/korea-eq-hum.html" --include=*.html . | grep -v _design | wc -l
       4
exit=0

$ grep -rl "interview/korea-eq-sci.html" --include=*.html . | grep -v _design | wc -l
       4
exit=0
```


style_gate 전체 실행 원문

요청한 기본 deliverable/general 프로파일을 그대로 사용했습니다. A/B 외 등급을 예외 처리하지 않았습니다.

```text
$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only _tools/exam_pages/tpl.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only _tools/interview_hub_v1.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only _tools/program_studio_v2.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only about.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only b2b.html
b2b.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '55% (27/49)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
b2b.html:138:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 7문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only classroom.html
classroom.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '69% (11/16)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: C-12×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only faq.html
faq.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '57% (58/102)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
faq.html:155:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 21문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/ajou.html
guidebook/ajou.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '67% (34/51)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/ajou.html:381:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/catholic.html
guidebook/catholic.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '67% (35/52)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/catholic.html:377:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/cau.html
guidebook/cau.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '71% (34/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/cau.html:377:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/dankook.html
guidebook/dankook.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '67% (34/51)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/dankook.html:373:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/donga.html
guidebook/donga.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '64% (32/50)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/donga.html:383:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/dongduk.html
guidebook/dongduk.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '65% (31/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/dongduk.html:372:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/dongguk.html
guidebook/dongguk.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '69% (33/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/dongguk.html:378:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/duksung.html
guidebook/duksung.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '62% (30/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/duksung.html:372:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/ewha.html
guidebook/ewha.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '64% (32/50)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/ewha.html:380:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/gachon.html
guidebook/gachon.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '60% (32/53)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/gachon.html:285:112  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/gachon.html:360:59  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/gachon.html:380:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 C  |  게이트 S1 2건 S2 2건  |  권고 0건
상위 규칙: C-8×2, C-12×1, E-2×1
exit=1

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/hanyang-erica.html
guidebook/hanyang-erica.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '60% (28/47)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/hanyang-erica.html:354:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/hufs.html
guidebook/hufs.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '67% (33/49)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/hufs.html:379:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/incheon.html
guidebook/incheon.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '66% (31/47)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/incheon.html:379:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/index.html
guidebook/index.html:199:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 5문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/inha.html
guidebook/inha.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '71% (35/49)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/inha.html:378:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/khu.html
guidebook/khu.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '67% (32/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/khu.html:377:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/konkuk.html
guidebook/konkuk.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '67% (32/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/konkuk.html:285:70  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/konkuk.html:356:54  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '가 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/konkuk.html:376:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 C  |  게이트 S1 2건 S2 2건  |  권고 0건
상위 규칙: C-8×2, C-12×1, E-2×1
exit=1

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/kookmin.html
guidebook/kookmin.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '69% (33/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/kookmin.html:353:78  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
guidebook/kookmin.html:355:68  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
guidebook/kookmin.html:355:93  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
guidebook/kookmin.html:356:83  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
guidebook/kookmin.html:357:60  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
guidebook/kookmin.html:359:80  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
guidebook/kookmin.html:375:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 C  |  게이트 S1 0건 S2 8건  |  권고 0건
상위 규칙: C-11×6, C-12×1, E-2×1
exit=1

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/kwangwoon.html
guidebook/kwangwoon.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '62% (33/53)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/kwangwoon.html:385:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/kyonggi.html
guidebook/kyonggi.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '69% (34/49)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/kyonggi.html:286:123  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/kyonggi.html:356:57  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/kyonggi.html:358:63  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/kyonggi.html:379:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 D  |  게이트 S1 3건 S2 2건  |  권고 0건
상위 규칙: C-8×3, C-12×1, E-2×1
exit=1

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/myongji.html
guidebook/myongji.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '67% (33/49)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/myongji.html:374:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/pusan.html
guidebook/pusan.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '69% (33/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/pusan.html:382:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/sahmyook.html
guidebook/sahmyook.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '62% (31/50)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/sahmyook.html:368:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/sejong.html
guidebook/sejong.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '71% (34/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/sejong.html:380:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/seoultech.html
guidebook/seoultech.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '68% (34/50)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/seoultech.html:376:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/snu.html
guidebook/snu.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '63% (33/52)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/snu.html:285:124  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/snu.html:359:53  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/snu.html:360:57  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
guidebook/snu.html:378:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 D  |  게이트 S1 3건 S2 2건  |  권고 0건
상위 규칙: C-8×3, C-12×1, E-2×1
exit=1

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/sookmyung.html
guidebook/sookmyung.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '71% (35/49)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/sookmyung.html:380:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/soongsil.html
guidebook/soongsil.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '73% (35/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/soongsil.html:377:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/sungshin.html
guidebook/sungshin.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '64% (32/50)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/sungshin.html:379:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/swu.html
guidebook/swu.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '71% (34/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/swu.html:381:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/ulsan.html
guidebook/ulsan.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '69% (34/49)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/ulsan.html:375:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only guidebook/uos.html
guidebook/uos.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '65% (32/49)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
guidebook/uos.html:385:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only index.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only interview.html
interview.html:273:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 11문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only interview/korea-eq-hum.html
interview/korea-eq-hum.html:127:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 5문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only interview/korea-eq-sci.html
interview/korea-eq-sci.html:127:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 7문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only interview/korea-hum.html
interview/korea-hum.html:127:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 7문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only interview/korea-sci.html
interview/korea-sci.html:127:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 6문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only interview/yonsei-hum.html
interview/yonsei-hum.html:127:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 5문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only interview/yonsei-intl.html
interview/yonsei-intl.html:127:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 7문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only interview/yonsei-mirae.html
interview/yonsei-mirae.html:127:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 6문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only interview/yonsei-sci.html
interview/yonsei-sci.html:127:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 5문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only lecture.html
lecture.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '56% (9/16)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: C-12×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only lectures.html
lectures.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '60% (21/35)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
lectures.html:245:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 6문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only lectures/common.html
lectures/common.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '71% (17/24)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
lectures/common.html:186:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 7문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only lectures/korea-hum.html
lectures/korea-hum.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '70% (16/23)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
lectures/korea-hum.html:186:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 6문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only lectures/korea-sci.html
lectures/korea-sci.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '70% (16/23)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
lectures/korea-sci.html:186:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 6문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only lectures/yonsei-hum.html
lectures/yonsei-hum.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '70% (16/23)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
lectures/yonsei-hum.html:186:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 6문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only lectures/yonsei-intl.html
lectures/yonsei-intl.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '70% (16/23)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
lectures/yonsei-intl.html:186:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 6문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only lectures/yonsei-sci.html
lectures/yonsei-sci.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '70% (16/23)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
lectures/yonsei-sci.html:186:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 6문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only library.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only my.html
my.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '63% (68/108)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
my.html:265:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 8문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배
my.html:667:292  [S1 K-1 게이트] 가운뎃점 (건우 standing)  ← '·'
    → 쉼표 또는 '와/과'로. 산문 나열은 쉼표, UI 크롬 구분자는 전각 세로막대, 불릿은 정식 불릿: feedback_middledot_ai_slop_avoid

[deliverable/general] 등급 C  |  게이트 S1 1건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1, K-1×1
exit=1

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only notice.html
notice.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '53% (8/15)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: C-12×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only pastexam.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only privacy.html
privacy.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '56% (30/54)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
privacy.html:152:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 7문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only programs/guidebook.html
programs/guidebook.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '57% (8/14)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: C-12×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only programs/studio.html
programs/studio.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '58% (7/12)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: C-12×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only ranking.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only studio.html

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 0건  |  권고 0건
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only support.html
support.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '73% (16/22)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%

[deliverable/general] 등급 A  |  게이트 S1 0건 S2 1건  |  권고 0건
상위 규칙: C-12×1
exit=0

$ python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only terms.html
terms.html:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '63% (26/41)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
terms.html:134:39  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '이며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
terms.html:141:36  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
terms.html:157:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 7문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배
terms.html:163:52  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
terms.html:166:25  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '이며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
terms.html:177:39  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
terms.html:178:53  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
terms.html:218:43  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호

[deliverable/general] 등급 C  |  게이트 S1 0건 S2 9건  |  권고 0건
상위 규칙: C-11×7, C-12×1, E-2×1
exit=1
```


문체 실패 7면의 HEAD 대조 원문

HEAD의 원문을 같은 scan --gate-only와 같은 기본 프로파일에 표준입력으로 제공했습니다. 이 도구의 cmd_scan은 경로가 아닌 읽은 텍스트를 R.scan에 넘기므로 확장자에 따른 검사 차이가 없습니다. 규칙 id와 matched 문면의 순서가 동일한지 추가 대조했습니다.

```text
$ git show HEAD:guidebook/gachon.html | python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only -
-:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '60% (32/53)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
-:285:112  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:360:59  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:380:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 C  |  게이트 S1 2건 S2 2건  |  권고 0건
상위 규칙: C-8×2, C-12×1, E-2×1
exit=1

$ git show HEAD:guidebook/konkuk.html | python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only -
-:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '67% (32/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
-:285:70  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:356:54  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '가 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:376:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 C  |  게이트 S1 2건 S2 2건  |  권고 0건
상위 규칙: C-8×2, C-12×1, E-2×1
exit=1

$ git show HEAD:guidebook/kookmin.html | python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only -
-:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '69% (33/48)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
-:353:78  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:355:68  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:355:93  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:356:83  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:357:60  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:359:80  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:375:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 C  |  게이트 S1 0건 S2 8건  |  권고 0건
상위 규칙: C-11×6, C-12×1, E-2×1
exit=1

$ git show HEAD:guidebook/kyonggi.html | python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only -
-:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '69% (34/49)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
-:286:123  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:356:57  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:358:63  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:379:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 D  |  게이트 S1 3건 S2 2건  |  권고 0건
상위 규칙: C-8×3, C-12×1, E-2×1
exit=1

$ git show HEAD:guidebook/snu.html | python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only -
-:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '63% (33/52)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
-:285:124  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:359:53  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:360:57  [S1 C-8 게이트] 대구 공식 'A가 아니라 B'  ← '이 아니라'
    → 한 번만 살리고 나머지는 비대칭 평서문, 직접 단언으로. 전멸 금지
-:378:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 9문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배

[deliverable/general] 등급 D  |  게이트 S1 3건 S2 2건  |  권고 0건
상위 규칙: C-8×3, C-12×1, E-2×1
exit=1

$ git show HEAD:my.html | python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only -
-:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '63% (68/108)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
-:265:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 8문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배
-:667:292  [S1 K-1 게이트] 가운뎃점 (건우 standing)  ← '·'
    → 쉼표 또는 '와/과'로. 산문 나열은 쉼표, UI 크롬 구분자는 전각 세로막대, 불릿은 정식 불릿: feedback_middledot_ai_slop_avoid

[deliverable/general] 등급 C  |  게이트 S1 1건 S2 2건  |  권고 0건
상위 규칙: C-12×1, E-2×1, K-1×1
exit=1

$ git show HEAD:terms.html | python3 /Users/gregory/unjang/_shared/style_gate/style_gate.py scan --gate-only -
-:1:0  [S2 C-12 게이트] 쉼표 포함 문장 비율 과다  ← '63% (26/41)'
    → 일부 문장의 쉼표를 마침표 분할·연결어미 흡수·삭제로. KatFish: 사람 26% vs AI 61%
-:134:39  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '이며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:141:36  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:157:0  [S2 E-2 게이트] 동일 종결어미 연속  ← "'니다' 류 7문장 연속"
    → '~다·~았다·~ㄴ다·~기 마련이다·명사형' 섞기. 상류 실측 '~한다' 편중 AI 1.8배
-:163:52  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:166:25  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '이며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:177:39  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:178:53  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하고,'
    → 쉼표 제거. 6회 이상이면 강한 신호
-:218:43  [S2 C-11 게이트] 연결어미 뒤 쉼표  ← '하며,'
    → 쉼표 제거. 6회 이상이면 강한 신호

[deliverable/general] 등급 C  |  게이트 S1 0건 S2 9건  |  권고 0건
상위 규칙: C-11×7, C-12×1, E-2×1
exit=1
PASS: all 7 non-A/B pages have identical HEAD findings
```


독립 QA

code-architect 읽기 검토로 기존 구매 이벤트와 단위 순서 계약을 확인했습니다. dt-qa는 원장 8개, 예정 구매 요소 0개, 구매 template 5개와 멱등, 잘못된 초와 상태, 생성 자리표 결손을 독립 확인했습니다. 예정 공지 버튼의 기존 배경 동색 문제 1건을 찾아 --card 배경과 --ink 글자로 수정했고, 대비 13.23:1을 재계산했습니다. 토큰 값 자체의 변경은 0건입니다. QA 재검토에서 신규 차단 결함은 발견되지 않았지만 시각 릴리스 판정은 수행하지 않았습니다.


기존 구매 영역의 data-primary 표식은 1개를 유지했습니다. 안내 카드의 우선 행동은 링크 순서와 btn ghost sm 표현으로 두고 구매 UI 표식은 확장하지 않았습니다.

```text
$ node --check _design/ia_20260910/shot_ia1.mjs
exit=0
```

BLOCKED 인수 목록

브리프가 Playwright와 Chromium 실행을 금지하므로 아래 브라우저 명령은 실행하지 않았습니다. skip 또는 PASS가 아닙니다. 인수 스크립트의 node --check만 exit 0으로 확인했습니다.

```text
BLOCKED: node _design/exam_pages_20260910/shot_prod.mjs
BLOCKED: node _design/exam_pages_20260910/shot_prod.mjs yonsei-hum yonsei-sci yonsei-intl yonsei-mirae korea-hum korea-sci korea-eq-hum korea-eq-sci
BLOCKED: node _design/ia_20260910/shot_ia1.mjs
BLOCKED: design-critic 9렌즈 (1280/390 캡처 회수 후 판정)
```

기존 shot_prod.mjs는 기본값이 4면이며 출력 경로가 hyunhak-site 트리로 고정되어 있어 그대로 보존했습니다. 8면 전수를 위한 인자 명령도 위에 적었습니다. 새 shot_ia1.mjs는 현 트리 안 _design/ia_20260910/shots/에 저장하며 8면과 두 스튜디오 면을 모두 검사합니다. 이 새 명령의 기본 서버는 http://127.0.0.1:8911이고 IA1_BASE로 변경할 수 있습니다. 인수 세션의 별도 터미널에서 `python3 -m http.server 8911 --bind 127.0.0.1`로 현재 작업 트리를 제공한 뒤 실행합니다. programs/studio.html#units와 studio.html#units 각각 1280/390 캡처, 2열과 1열, 1280 제목 한 줄, 행 높이, CTA 간격과 높이 및 내부 넘침을 판정합니다. 브라우저 실패 시 고칠 실제 측정값을 결과 JSON에 남깁니다.


USED_ASSETS

- IA1 사용자 브리프의 채택 B안과 승인 문안표. 이미 채택된 안을 구현했으며 신규 디자인안이나 카피를 발주하지 않았습니다.
- _design/redesign_20260909/codex/impl_brief_invariants.md
- _design/redesign_20260909/SECTION_SPEC_R3.md 및 FACTS_LEDGER.md
- _tools/exam_pages/codes.py의 CODES, OPEN_DATE, NOTICE_ID와 facts 8개 읽기 원장
- assets/base.css의 .units, .unit, .kn, .foot 및 기존 타입, 색, 간격 토큰
- _tools/r2_copy.json, build_programs.py, build_interview_hub.py, build_lectures.py, v2_shell.py, build_sitemap.py
- assets/app.js의 기존 HH.okUnit, 가격과 프로모션, 장바구니 계약과 assets/product_buy.js의 구매 처리
- 기존 build_all.sh와 전 검증기, 외부 style_gate.py 읽기 실행
- 새 이미지, 영상, 폰트, 패키지 설치 0건. 디자인 참조 자산 DESIGN_KIT.md는 추가 사용하지 않았습니다.


증거 로그 목록

- _design/ia_20260910/codex/build_5.log: 최종 실행 원문입니다.
- _design/ia_20260910/codex/build_6.log: 최종 실행 원문입니다.
- _design/ia_20260910/codex/syntax.log: 최종 실행 원문입니다.
- _design/ia_20260910/codex/12months.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/build_1.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/build_2.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/build_3.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/build_4.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/buy.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/gates.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/ia_after.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/ia_before.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/ia_rule_before.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/ingress_grep.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/stage_A.log: 단계 종료 원문입니다.
- _design/ia_20260910/codex/stage_B.log: 단계 종료 원문입니다.
- _design/ia_20260910/codex/stage_C.log: 단계 종료 원문입니다.
- _design/ia_20260910/codex/stage_D.log: 단계 종료 원문입니다.
- _design/ia_20260910/codex/static.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/style_baseline.log: 실행 명령, 출력 및 종료 상태 증거입니다.
- _design/ia_20260910/codex/style_gate.log: 실행 명령, 출력 및 종료 상태 증거입니다.


```text
===== 이어가기 트리거 (새 Claude 용) =====
thread:   현학적연구소_사이트_전수감사_재디자인_20260908
phase:    IA1 구현 반영, 인수 검증 FAIL 및 BLOCKED 남음
context:  ia/20260910-units-links, 커밋 0, 최종 빌드 2회 a5d0e8089fffc5ca
last_done: 원장 8카드, 판매5 구매 보존, 8면 유입3~5, 빌드 검증기와 보존 대조
next:     IA 상한 초과6면과 기존 style C/D7면 판정, 브라우저 인수 명령 실행, design-critic 9렌즈 회수
resume_cmd: "현학 사이트 전수감사 이어가"
handover: /Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/codex/IMPL_REPORT_IA1.md
index:    ~/.codex/handover/INDEX.md
memory:   ~/.codex/projects/-Users-gregory/memory/MEMORY.md
pending_approvals: ~/.codex/pending_approvals.md
ts: 2026-09-10T14:59:52+09:00
warning: 이거 안 지키면 감옥간다. 전과자 되는거야.
===== /이어가기 트리거 =====
```


IMPL_DONE files=85 build_hash=a5d0e8089fffc5ca gates=build:pass,idempotency:pass,seo:pass,v2:pass,aeo:pass,counts:pass,samples:pass,captions:pass,legal:pass,links:pass,worker:pass,preservation:pass,buy:pass,12months:pass,ingress:pass,ia:fail,style:fail BLOCKED=[node _design/exam_pages_20260910/shot_prod.mjs; node _design/ia_20260910/shot_ia1.mjs; design-critic 9렌즈]
