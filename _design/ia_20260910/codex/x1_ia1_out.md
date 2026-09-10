**X1_VERDICT: GO_WITH_FIXES**

HEAD `44f918f` 대비 미커밋 변경을 검토했습니다. 수정할 결함은 mid 2건입니다. 읽기 전용 제한으로 `x1_ia1_out.md`는 작성하지 않았으며, 아래에 보고서 본문을 제공합니다.

| 항목 | 판정 | 근거 파일:줄 | 한 줄 사유 |
|---|---|---|---|
| 1. 규격 편차 | PASS | [studio_units.py:43](/Users/gregory/Workspace/_wt/hh-ia/_tools/studio_units.py:43), [base.css:1403](/Users/gregory/Workspace/_wt/hh-ia/assets/base.css:1403) | 요소 순서, CTA 클래스, 예정 처리, 원장 제원과 공용 마크업이 일치합니다. |
| 2. 문안 게이트 | 주의 | [r2_copy.json:136](/Users/gregory/Workspace/_wt/hh-ia/_tools/r2_copy.json:136), [studio_units.py:80](/Users/gregory/Workspace/_wt/hh-ia/_tools/studio_units.py:80) | 미승인 새 문장과 금지 문자는 없으나 예정 목록 순서는 §5 표와 다릅니다. |
| 3. 무접촉 위반 | PASS | [terms.html:256](/Users/gregory/Workspace/_wt/hh-ia/terms.html:256), [privacy.html:261](/Users/gregory/Workspace/_wt/hh-ia/privacy.html:261), [build_lectures.py:455](/Users/gregory/Workspace/_wt/hh-ia/_tools/build_lectures.py:455) | 보호 본문과 계약은 보존했으며 푸터와 허용된 강좌 안내 링크만 추가했습니다. |
| 4. 동선 재계수 | PASS | [IMPL_REPORT_IA1.md:950](/Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/codex/IMPL_REPORT_IA1.md:950), [build_exam_pages.py:133](/Users/gregory/Workspace/_wt/hh-ia/_tools/exam_pages/build_exam_pages.py:133) | 직접 재계수한 유입 수와 8면 CTA가 보고서 및 승인안과 일치합니다. |
| 5. 회귀 위험 | FAIL | [product_buy.js:34](/Users/gregory/Workspace/_wt/hh-ia/assets/product_buy.js:34), [studio.html:507](/Users/gregory/Workspace/_wt/hh-ia/studio.html:507) | 소개면의 카드 「담기」는 선택만 변경하며 장바구니에 담지 않습니다. |
| 6. IA 상한 | FAIL | [ia_before.log:4](/Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/codex/ia_before.log:4), [ia_after.log:5](/Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/codex/ia_after.log:5) | 초과 6면 중 `programs/studio.html`의 6→7은 이번 구현에서 새로 발생했습니다. |
| 7. 문체 게이트 | 주의 | [guidebook/kyonggi.html:286](/Users/gregory/Workspace/_wt/hh-ia/guidebook/kyonggi.html:286), [my.html:667](/Users/gregory/Workspace/_wt/hh-ia/my.html:667) | 표본 2면의 HEAD와 현행 지적은 같지만 전체 A/B 조건은 여전히 미충족입니다. |

**1. 규격 상세**

| 확인 대상 | 결과 |
|---|---|
| ① 대학명 → ② h3 → ③ 배지 → ④ 제원 → ⑤ 안내 → ⑥ 응시실 → ⑦ 담기 | 일치합니다. 번호는 별도 `.kn`이며 제원 뒤 수량 또는 예정 안내가 들어갑니다. |
| ⑤ primary, ⑥ ghost, ⑦ tlink | 브리프가 지정한 ⑤⑥ `btn ghost sm`, ⑦ `tlink`와 순서가 일치합니다. 별도 `data-primary` 추가 요구는 없습니다. |
| 예정 3단위 | 배지, 안내 한 줄, `--mat` 배경을 출력하며 ⑥⑦은 DOM에 생성하지 않습니다. |
| 식별자와 순서 | 소개면 8개 모두 `id="u-<code>"`를 갖고 CODES 순서를 따릅니다. 구매면은 판매 5개와 예정 목록입니다. |
| 제원 | 연세 판매 3개는 8분/5분/2개, 미래캠퍼스는 10분/5분/3개, 고려 계열적합은 21분/7분/3개, 고른기회는 12분/6분/3개로 facts와 일치합니다. |
| CSS | 신규 토큰 0개, 신규 고정 px 높이 0개입니다. 새 클래스는 `.r3-` 접두사이며 규칙은 `:where(body.v2)` 안에 있습니다. |
| 격자와 간격 | 기존 760px 경계의 2열/1열을 사용합니다. CTA는 `--s3` 간격과 `--tap` 최소 높이를 적용합니다. |

제공된 [results.json:1](/Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/shots/results.json:1)의 20건은 모두 PASS입니다. 1280에서 제목 한 줄과 카드 너비 약 508.8px를 확인했습니다. 이 결과는 클릭 후 구매 동작까지 검증한 증거는 아닙니다.

**2. 문안 상세**

변경 HTML과 템플릿, `r2_copy.json`, 미추적 `studio_units.py`를 대조했습니다. 기존 문장 이동과 원장 제목을 제외하면 §5 밖 신규 문장은 발견하지 못했습니다. 가운뎃점과 em대시 신규 사용도 0건이며 새 서술문은 합쇼체입니다.

예정 목록은 §5의 「고려 인문, 고려 자연, 연세 미래」 대신 「연세 미래, 고려 인문, 고려 자연」입니다. §4의 CODES 순서 지시에는 일치하므로 문안 순서 편차로 기록합니다.

**3. 무접촉 상세**

문자 단위 diff에서 가이드북 32면과 기타 푸터 변경 12면은 전부 안내 링크 1항목 추가뿐입니다. `terms.html`과 `privacy.html`의 본문은 그대로입니다.

강좌 상세 판매 5면은 각각 본문 안내 링크 1개와 푸터 1항목만 추가했습니다. `lectures/common.html`은 푸터만 변경했습니다.

`checkout.html`, promo 원본, 가격 숫자, API 호출 경로, `assets/app.js`, `_worker/`, drafts, facts, codes 원장은 변경되지 않았습니다. 판매 화이트리스트도 기존 5개입니다.

**4. 8면 유입과 CTA 전수 확인**

요청한 grep을 코드별로 실행했습니다. zsh에서는 `--include='*.html'`로 패턴만 인용했습니다.

| 코드 | 원시 파일 수 | 자기면 제외 유입 수 | 보고서 대조 | CTA 근거 |
|---|---:|---:|---|---|
| yonsei-hum | 6 | 5 | 일치합니다. | `interview/yonsei-hum.html:161` |
| yonsei-sci | 6 | 5 | 일치합니다. | `interview/yonsei-sci.html:161` |
| yonsei-intl | 6 | 5 | 일치합니다. | `interview/yonsei-intl.html:161` |
| yonsei-mirae | 4 | 3 | 일치합니다. | `interview/yonsei-mirae.html:161` |
| korea-hum | 6 | 5 | 일치합니다. | `interview/korea-hum.html:162` |
| korea-sci | 6 | 5 | 일치합니다. | `interview/korea-sci.html:161` |
| korea-eq-hum | 4 | 3 | 일치합니다. | `interview/korea-eq-hum.html:163` |
| korea-eq-sci | 4 | 3 | 일치합니다. | `interview/korea-eq-sci.html:161` |

판매 5면의 유입은 소개면, 구매면, 허브, 인강 목록, 해당 강좌 상세입니다. 예정 3면은 소개면, 구매면, 허브입니다. 원시 수에는 자기면 canonical이 포함되고, 상대경로로 적힌 형제 링크는 잡히지 않습니다.

판매 5면 모두 다음과 일치합니다.

- 「응시실 열기」 → `../studio.html?unit=<code>`
- 「이용권 보기」 → `../programs/studio.html#u-<code>`
- 「풀이법 인강」 → `../lectures/<code>.html`

예정 3면 모두 다음과 일치합니다.

- 「9월 14일 오픈, 공지 보기」 → `../notice.html?id=ntc_0914a001`
- 「면접 형태 판정표」 → `../interview.html#exam`

화면 crumb는 8면 모두 97행에서 `../interview.html#exam`을 사용합니다. 29행 JSON-LD와 BreadcrumbList는 변경되지 않았습니다.

**5. 사용자 경로 추적**

`studio.html:369`의 `renderUnits`는 공용 template을 복제하고, 판매 카탈로그 및 `okUnit`과 교차 확인합니다. `[data-r3-unit-cart]`에 기존 `data-cart-*`를 부여하면 508행의 위임 이벤트가 소비하여 `HH.addToCart`를 호출합니다.

`data-unit-go`도 507행에서 소비합니다. 기본 이동을 막고 해당 단위를 선택한 다음 `#sets`로 이동합니다. 외부 안내면의 `?unit=` 진입 역시 523행에서 단위를 선택하고 세트 영역으로 이동합니다.

소개면의 `[data-r3-unit-buy]`는 `product_buy.js:34`에서 소비하지만 상품 선택과 전권 모드 변경까지만 수행합니다. 가이드북에서는 `isGuide` 조건으로 즉시 반환하므로 기존 구매 동작을 건드리지 않습니다. 기존 `#buy` 버튼의 담기 처리는 유지됩니다.

생성 연결도 확인했습니다. `build_programs.py`가 소개면과 구매 template을 함께 갱신하고, `build_lectures.py`가 안내 링크를 생성합니다. `build_sitemap.py:130`은 공유 색인 목록에서 interview 8면을 llms에 포함하며, `v2_shell.py:217`은 공통 푸터 링크를 생성합니다.

**6. IA 전후 판정**

기존 로그와 HEAD diff를 대조했습니다. 금지된 계수 프로그램 재실행은 하지 않았습니다.

| core 면 | HEAD | 현 구현, 기존 규칙 | 현 구현, 승인 규칙 | IA1 추가 종류와 귀속 |
|---|---:|---:|---:|---|
| index.html | 8 | 9 | 9 | `interview.html` 추가로 기존 초과가 증가했습니다. |
| programs/guidebook.html | 5 | 5 | 5 | 본문 추가가 없습니다. |
| programs/studio.html | 6 | 14 | 7 | `interview/<code>.html` 추가로 새로 초과했습니다. |
| guidebook/index.html | 9 | 9 | 9 | 기존 초과 그대로입니다. |
| studio.html | 7 | 16 | 9 | 안내면 종류와 자기면 `studio.html`이 추가되었습니다. |
| ranking.html | 4 | 5 | 5 | `interview.html` 추가 후에도 상한 이내입니다. |
| b2b.html | 4 | 4 | 4 | 본문 추가가 없습니다. |
| lectures.html | 10 | 15 | 11 | 안내면 종류 추가로 기존 초과가 증가했습니다. |
| my.html | 10 | 10 | 10 | 정적 계수는 그대로이며 동적 카드에는 안내면 종류를 추가했습니다. |
| cart.html | 6 | 6 | 6 | 변경이 없습니다. |

근거는 `ia_before.log:2`, `ia_rule_before.log:3`, `ia_after.log:3`부터의 core 표입니다.

계수기의 기존 한계도 있습니다. `ia_links.py:8`은 script를 제외하여 `my.html:532`와 540행의 새 동적 링크를 세지 않습니다. 반면 studio의 새 정적 template은 세므로 자기면 링크가 추가 종류로 잡힙니다. 따라서 `my 10→10`을 실제 동선 불변으로 해석하면 안 됩니다.

**7. 문체 표본 재검사**

요청한 `git show HEAD:<file> | python3 ... scan --gate-only -`와 현행 파일 검사를 각각 실행했습니다.

| 표본 | HEAD | 현행 | 대조 |
|---|---|---|---|
| guidebook/kyonggi.html | D, S1 3건, S2 2건 | 동일합니다. | 규칙, 문면, 위치가 같습니다. |
| my.html | C, S1 1건, S2 2건 | 동일합니다. | 규칙, 문면, 위치가 같습니다. |

표본에서 신규 문체 회귀는 없습니다. 나머지 5면은 보고서의 HEAD 대조 기록을 확인했으며 직접 재실행하지 않았습니다.

**결함 목록**

| 심각도 | 결함 | 재현 방법 | 수리 제안 |
|---|---|---|---|
| mid | 소개면 카드 「담기」의 동작 불일치 | `programs/studio.html#units`에서 판매 카드의 「담기」를 누르면 `#buy` 선택만 바뀝니다. `product_buy.js:34`에는 장바구니 호출이 없습니다. | 카드 담기도 기존 담기 함수를 공유하여 한 번의 클릭으로 처리하십시오. |
| mid | IA1이 새로 만든 상한 초과 | `ia_before.log:4`의 6과 `ia_after.log:5`의 7을 비교하면 소개면 신규 초과가 확인됩니다. | 필수 안내 링크를 유지하면서 상한과 요구 동선의 충돌을 명시적으로 해소하십시오. 임의 계수 예외로 통과시키면 안 됩니다. |

**X1_VERDICT: GO_WITH_FIXES**

카드 규격, 보호 영역, 8면 연결은 요구 사항과 일치합니다.  
소개면 카드 담기와 신규 IA 상한 초과를 배포 전에 해소해야 합니다.  
문체 표본 실패는 기존 지적이며, 브라우저 20건 PASS가 위 두 결함을 해소하지는 않습니다.

```text
===== 이어가기 트리거 (새 Claude 용) =====
thread: 현학적연구소_사이트_전수감사_재디자인_20260908
phase: IA1 X1 읽기 전용 검토 완료
context: HEAD 44f918f 대비 검토, GO_WITH_FIXES, mid 2건
last_done: 항목 1~7 검토와 문체 표본 2면 재검사를 완료했습니다.
next: 카드 담기 동작과 IA 신규 초과를 해소한 뒤 재검토합니다.
resume_cmd: "현학 IA1 X1 수리 검토 이어가"
handover: /Users/gregory/Workspace/_wt/hh-ia/_design/ia_20260910/codex/IMPL_REPORT_IA1.md
index: ~/.codex/handover/INDEX.md
memory: ~/.codex/projects/-Users-gregory/memory/MEMORY.md
pending_approvals: ~/.codex/pending_approvals.md
ts: 2026-09-10
===== /이어가기 트리거 =====
```