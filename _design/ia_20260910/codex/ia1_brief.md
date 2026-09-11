# IA1 브리프 — 전형별 안내 8면 연결 + 스튜디오 단위 카드 재설계 (hyunhak.com, 2026-09-10, base = main 44f918f = 라이브 6fae76e + 원장 커밋 2)

## 0. 건우 지시 원문 (14:15, 채점 기준)
「(programs/studio.html 응시 단위 고르기 스크린샷) 아직 이것들밖에 없어. 바로 연결해서 볼 수가 없어. 이 부분 깔끔하게 연결되어야 해. 지금 저기로 들어갈 수 있는 방법이 없거나 직관적이지 않고, 디자인, 줄바꿈 등등도 예쁘지 않아. 전체 사이트맵 똑바로 깔끔하게 만들고 동선도 깔끔하게 만들어야 해」
해석(본 세션): ① 스튜디오 단위 카드에 9월 14일 오픈 3단위가 없고 ② 새로 배포한 전형별 안내 8면(`interview/<code>.html`)이 카드·메뉴·인강·홈 어디서도 이어지지 않으며 ③ 카드 제목 줄바꿈과 높이가 들쭉날쭉하고 「담기」가 외따로 있다. 메뉴 5개(가이드북·스튜디오·랭킹실·인강·스쿨 플랜)는 R3 확정이라 바꾸지 않는다.

## 1. 작업 환경
- 작업 트리 = `~/Workspace/_wt/hh-ia` (브랜치 `ia/20260910-units-links`, base 44f918f). 이 트리 밖에 쓰지 않는다. **커밋은 본 세션이 대리한다. `git commit`·`git add` 를 시도하지 않는다** (워크트리 안 Codex 커밋은 실패 실측). 변경 단위 끝마다 보고서에 「단계 N 끝」과 `git status --short` 원문을 적는다.
- 샌드박스 workspace-write. 브라우저(Playwright/Chromium)는 막혀 있다. 브라우저 검증은 `BLOCKED: <명령 1줄>` 로 보고(skip·PASS 처리 금지). 본 세션이 돌린다.
- 공통 조항 = `_design/redesign_20260909/codex/impl_brief_invariants.md` 그대로(절대 보존·생성면 규칙·base.css 규범·보고 형식). 디자인 참조 자산 = `_design/redesign_20260909/codex/DESIGN_KIT.md`(필요할 때만). R3 섹션 사양 = `_design/redesign_20260909/SECTION_SPEC_R3.md`, 사실 원장 = `_design/redesign_20260909/FACTS_LEDGER.md`.
- 단위 원장(단일 원천) = `_tools/exam_pages/codes.py` CODES 8행(코드·표시명·상태 라벨) + `_tools/exam_pages/facts/<code>.json` spec(passages, prep_sec, answer_sec, questions, status on_sale|opening, open_date) + `EX.OPEN_DATE`. 카드 수치·상태는 이 원장에서만 읽는다(문면에 숫자를 손으로 적지 않는다).
- 무접촉: `terms.html`, `privacy.html`, `checkout.html` 약관 전문, `_tools/promo.json`·`promo_*.html`, 가격 숫자, D1·API 호출 경로, `assets/app.js` DOM 계약, `_worker/`, `_tools/exam_pages/drafts/*`·`facts/*`(읽기만), `lectures/*.html` 본문(생성기 `build_lectures.py` 의 링크 1줄 추가만 허용), 판매 5단위 밖 상품 활성화(9/14 판매 개시 코드는 별건 S9-3).
- 언어 = 한국어 합쇼체. 가운뎃점(·)과 em대시(—)를 쓰지 않는다. 새 문장은 §5 승인 문안표에 있는 것만.

## 2. 사이트맵(IA) 목표 — 메뉴는 그대로, 스튜디오 축 4면의 역할과 이음새를 고정
| 면 | 역할 | 여기서 나가는 길(목표) |
|---|---|---|
| `programs/studio.html` | 스튜디오 소개(LP). 메뉴 「스튜디오」 착지 | #units 카드 8장(판매 5 + 9/14 예정 3) → 각 카드에서 「출제 유형과 풀이법」(interview/<code>.html) + 「응시실」(studio.html?unit=<code>, 판매 중만). 예정 카드는 안내 면 + 공지 링크 |
| `interview/<code>.html` ×8 | 전형별 출제 유형과 풀이법(안내) | 판매 중: 「면접 스튜디오 이용권 보기」(studio.html?unit=<code>) + 「풀이법 인강」(lectures/<code>.html) [현행 유지] · 예정 3면: xsoon 블록에 공지(`notice.html?id=ntc_0914a001`) 링크 추가 · 형제 8면 xsib [유지] · breadcrumb 는 §3 결정에 따름 |
| `studio.html` | 구매 면(단위 카드·세트 표·담기) | 단위 카드마다 「출제 유형과 풀이법」 텍스트 링크 1개 추가. 카드 아래에 9/14 예정 3단위 한 줄 목록(안내 면 링크, 구매 요소 없음) |
| `lectures.html`, `lectures/<code>.html` ×5 | 인강 | 단위 항목마다 「출제 유형과 풀이법」 링크 1개(생성기 `_tools/build_lectures.py` 에서) |
| `interview.html` | 면접 형태 판정표 허브 | 머리(요약 4칸 아래)에 「제시문 면접 8전형의 출제 유형과 풀이법 →」(#exam) 점프 링크 1개. #exam 카드 8장 [유지] |
| `index.html` | 홈 | 스튜디오 카드에 보조 링크 「전형별 출제 유형과 풀이법」(programs/studio.html#units) 1개 |
| `ranking.html`, `my.html` | 랭킹실, 마이페이지 | 단위 이름 옆 「출제 유형과 풀이법」 링크 1개(있는 자리만, 구조 변경 없음) |
| 푸터(`_tools/v2_shell.py`) | 전 면 공통 | 「서비스」 열에 「전형별 면접 안내」 → `interview.html#exam` 1항목 (메뉴 5개는 무변경) |
| `llms.txt` | 답변엔진 색인 | 8면 등재(현재 0건. 생성기가 sitemap 과 같은 목록을 쓰도록) |
- 8면 진입 경로 목표 = 면마다 **3경로 이상**(상세면 카드, 구매 면 카드, 인강 또는 허브, 홈, 푸터). `_tools/link_check.py` 0 유지.

## 3. 카드 재설계 (programs/studio.html #units, studio.html #units)
design-director 디렉션(2026-09-10 14:2x, 3안 중 **B 「명패 행」 채택**). 아래를 그대로 구현한다.

### 3-1. 선행 정정: 두 면이 같은 5단위를 서로 다른 컴포넌트로 그린다 → **공용 컴포넌트 1개로 수렴**
- `programs/studio.html#units`(`.r3-units`, 5장 하드코딩)과 `studio.html#unitCards`(JS `renderUnits`, `.units` 판본 행)를 **같은 마크업·같은 CSS(`.units` 판본 행 패턴, base.css 806~817)** 로 맞춘다. 상세면은 `build_programs.py` 가 단위 원장에서 8장을 생성해 정적으로 넣고, 구매 면은 JS 가 같은 마크업을 그린다(구매 면은 판매 5장 + 아래 예정 3단위 한 줄).
- 줄바꿈 3줄의 원인 실측 = `.r3-units h3{font-size:var(--t-h4)}`(1280 에서 27.99px) × `auto-fit minmax(11rem)` 5열(내부 156.7px) → 5.6자/줄. 문안이 아니라 사다리 단 오배정. 구조(행 폭 500px)로 고친다.

### 3-2. B안 규격 (두 면 공통)
- 격자: `.units` 재사용. ≥760 **2열**(`nth-child(even)` 좌 괘선) / <760 1열. 1280 에서 칸 500px. 8장 = **4행×2열, 고아 0**. 순서 = codes.py CODES 순서(연세 4 → 고려 4). 대학 그룹은 괘선으로 드러난다.
- 제목 분해: `<p class="uni">연세대</p>` + `<h3>활동우수형 인문통합</h3>`. h3 = `--t-h4` 유지(폭 500px 에서 1줄 확정). `.kn` mono 序 번호 01~08 유지. `word-break:keep-all`. 「인문·통합」 가운뎃점 형 금지, 「인문통합」.
- 요소 순서: ① `.uni` ② h3 ③ 상태 배지(「판매 중」/「9월 14일 오픈」) = 좌 열 / ④ 제원 3(dl: 준비 N분 · 답변 N분 · 질문 N개, mono 정렬, 값은 facts 초→분 변환) = 우 열 / ⑤ 「출제 유형과 풀이법 보기」 ⑥ 「응시실」 ⑦ 「담기」 = `.foot` 행 끝.
- 위계: **⑤ btn ghost sm(primary, 8장 공통)** · ⑥ btn ghost sm · ⑦ tlink. 인접 CTA gap ≥ `--s3`, 링크 `min-height:var(--tap)`.
- 오픈 예정 3(korea-eq-hum·korea-eq-sci·yonsei-mirae): 배지 「9월 14일 오픈」 + 행 배경 `--mat`(괘선 동일, 색 단독 신호 금지 = 문면 병기) + 안내 1줄 「이 단위는 9월 14일에 엽니다」 + ⑤ 만 활성, **⑥⑦ 은 DOM 미출력**(disabled 버튼 금지). 상세면 카드에 `id="u-<code>"` 부여(8면 CTA 착지).
- 높이: 행이라 원리적으로 균일. 고정 px 높이 금지. 토큰 = 좌우 패딩 0(`.unit` 규범), 테두리 `--rule-ui`, 배경 `--card`, 제원 `--mono`/`--t-mono`, 라벨 `--t-sm`/`--gray`, 제목 자간 `--tr-head`, 행간 `--lh-tight`/`--lh-ui`. 신규 토큰 없음. 새 클래스는 `.r3-` 접두사로 base.css 정의부에만, `:where(body.v2)` 스코프.
- 외톨이 `<a href="#buy">담기</a>` 는 제거(담기는 카드 ⑦ 로 흡수).

### 3-3. 동선(IA) 확정 (§2 표를 이 표로 덮는다)
| 진입로 | 수 | 배치 | 문안 |
|---|---|---|---|
| `programs/studio.html#units` 카드 | 8 | 카드마다 1, primary | 출제 유형과 풀이법 보기 |
| `studio.html#unitCards` 카드 | 5(+예정 3 한 줄) | 같은 컴포넌트, 카드마다 1 | 동 |
| `interview.html` 하단 8카드(기존) | 8 | 유지, 구역 `id="exam"` 확인 | 동 |
| `lectures.html` 단위 머리 | 5 | 단위 제목 옆 tlink 1 | 동 |
| `ranking.html` 탭 아래 | 1 | → `interview.html#exam` | 전형별 출제 유형과 풀이법 |
| `index.html` 스튜디오 카드 하단 | 1 | tlink → `interview.html#exam` | 동 |
| 푸터 「상품」 열 | 1 | → `interview.html#exam` | 동 |
- 8면 CTA 교체: 판매 중 5 = btn 「응시실 열기」→`../studio.html?unit=<code>` · tlink 「이용권 보기」→`../programs/studio.html#u-<code>` · tlink 「풀이법 인강」 유지. 예정 3 = btn 「9월 14일 오픈, 공지 보기」→`../notice.html?id=ntc_0914a001` 를 xcta 자리로 · tlink 「면접 형태 판정표」→`../interview.html#exam`.
- breadcrumb 문면은 현행 유지(JSON-LD BreadcrumbList 불변). 화면 crumb 의 href 만 `../interview.html` → `../interview.html#exam`(JSON-LD item 은 canonical 유지).
- 허브 신설 없음, `interview.html#exam` 단일 착지. GNB 5·모바일 탭 5 무변경(6번째 메뉴·드롭다운은 비권장, 집행 금지).
- **규칙 판정(IA1-1 A 결재 확정, 건우 2026-09-10 14:33)**: `SECTION_SPEC_R3 §0` 「본문 목적지 종류 ≤ 6」에서 **단위별 딥링크 8개 = 1종으로 계수**한다. 게이트 = `_design/redesign_20260909/ia_links.py` (`_tools/` 에는 없다). 그 `kind()` 는 이미 `guidebook/<univ>.html`·`lectures/<lecture>.html` 을 한 종류로 접는다(2026-09-09 판정). 같은 자리에 `if re.match(r'interview/(?!index\.html)[a-z-]+\.html$', t): return 'interview/<code>.html'` 1줄을 사유 주석(IA1-1 A 결재 2026-09-10)과 함께 추가하고, `python3 _design/redesign_20260909/ia_links.py` 의 변경 전·후 출력 전문(kinds 값 포함)을 보고서에 적는다. exit 0 을 PASS 로 읽지 않고 core 면 전건 kinds ≤ 6 을 확인해 적는다. 예외를 넣지 않고 링크를 빼는 쪽으로 풀지 않는다.

## 4. 순서 (반드시 이 순서, 각 단계 끝에 보고서 「단계 N 끝」 + git status)
### 단계 A — 상세면 카드 8장 생성화 (§3 B안 공용 컴포넌트, `.units` 판본 행 패턴)
1. `_tools/program_studio_v2.html` 의 `.r3-units` 안 하드코딩 5 `<article>` 을 자리표 1개(`__UNITS__` 류)로 바꾸고 `_tools/build_programs.py` 가 §1 단위 원장에서 8장을 생성한다(순서 = codes.py CODES 순서 = 연세 4 → 고려 4. 판매 중이 앞이어야 하면 §3 결정에 따른다). 문안 키는 `_tools/r2_copy.json` 에 두되 카드 제목 신규 3키(`korea_eq_hum`, `korea_eq_sci`, `yonsei_mirae`)는 §5 표 문면으로 추가한다. 제원 문장은 facts 값으로 조립(예: 「제시문 4편, 준비 12분, 답변 6분, 질문 3개」). `r3_yonsei_spec`·`r3_korea_spec` 는 남는 참조가 없으면 지운다(`grep` 으로 소비자 0 확인 뒤).
2. `assets/base.css` `.r3-units` 규칙을 §3 대로(격자·높이 통일·제목 2줄 고정·배지·행동 위계). `:where(body.v2)` 스코프, 토큰만.
3. 카드 아래 외톨이 `<a href="#buy">담기</a>` 는 §3 결정대로(카드 안으로 옮기거나 「구매할 상품 고르기」 버튼으로 바꾼다).
### 단계 B — 구매 면 카드 링크 + 예정 단위 목록
4. `studio.html` renderUnits 템플릿의 `.foot` 앞에 「출제 유형과 풀이법 →」 tlink(`interview/<code>.html`) 1개. `okUnit` 화이트리스트는 그대로(판매 5). 카드 격자 아래 `<p class="note">` 1개로 9/14 예정 3단위를 이름 + 안내 면 링크로 나열(§5 문면, 코드 원장에서 생성하려면 build 단계가 없으므로 정적 3링크 허용하되 `codes.py` 순서·표시명과 일치).
### 단계 C — 8면·허브·인강·홈·랭킹·마이·푸터·llms
5. `_tools/exam_pages/build_exam_pages.py`: 예정 3면 xsoon 블록에 공지 링크 1개(`../notice.html?id=ntc_0914a001`, 문면 §5). breadcrumb 는 §3 결정(현행 「현학적 연구소 / 면접 형태 판정표 / <전형>」 유지 또는 변경)대로 `tpl.html` 과 `_tools/seo_manifest.json` breadcrumb 를 같이.
6. `_tools/build_interview_hub.py`(또는 `interview_hub_v1.html`): 머리 점프 링크 1개.
7. `_tools/build_lectures.py`: 목록 면 단위 항목 + 강좌 상세 6면(common 제외 5면)에 링크 1개.
8. `index.html` 스튜디오 카드 보조 링크 1개. `ranking.html`·`my.html` 은 단위 이름이 그려지는 자리에 링크 1개(JS 템플릿이면 그 안에).
9. `_tools/v2_shell.py` 푸터 「서비스」 열 1항목. `_tools/build_sitemap.py` 의 llms.txt 생성부가 8면을 포함하도록(제외 규칙이면 예외 추가).
### 단계 D — 빌드·검증
10. `sh _tools/build_all.sh` 2회, 마지막 줄 해시 동일. 검증기 전건 PASS(seo_check·v2_check·aeo·counts·samples·captions·link_check·worker_check). `python3 ~/unjang/_shared/style_gate/style_gate.py scan --gate-only <변경 html·템플릿>` 등급 A 또는 B.
11. `grep -rn "12개월" --include=*.html . | grep -v "_design\|_docs\|b2b.html"` 0건 유지(3개월 문면 회귀 금지). 8면 각각의 유입 링크 수를 `grep -rl "interview/<code>.html" --include=*.html . | grep -v _design | wc -l` 로 세어 표로 보고(목표 면당 3 이상, 8면 자기 자신·xsib 제외).

## 5. 승인 문안표 (이 문장만, 그대로)
| 자리 | 문안 |
|---|---|
| 카드 primary 링크 | 출제 유형과 풀이법 보기 |
| 카드 보조 링크 (소개면 ⑥ → `studio.html?unit=<code>` 구매면) | 이용권 보기 |
| 카드 보조 링크 (구매면 ⑥ → 같은 면 `#sets` 세트 표, 그 단위 선택) | 세트 고르기 |
| ~~카드 보조 링크~~ | ~~응시실~~ (IA2 폐지 2026-09-11. 두 면 모두 목적지는 구매면과 세트 표다. 정적 빌드에 보유 판정이 없어 보유자 전용 문면으로도 쓰지 않는다. `r2_copy.json` 키 `r3_room` 삭제) |
| 카드 보조 링크 | 담기 |
| 8면 primary 버튼(판매 중) | 응시실 열기 |
| 8면 보조 링크 | 이용권 보기 |
| 8면 보조 링크 | 풀이법 인강 |
| 8면 primary 버튼(대기) | 9월 14일 오픈, 공지 보기 |
| 8면 보조 링크(대기) | 면접 형태 판정표 |
| 상태 배지(판매) | 판매 중 |
| 상태 배지(대기) | 9월 14일 오픈 |
| 대기 카드 안내 1줄 | 이 단위는 9월 14일에 엽니다 |
| 허브 링크(랭킹실, 홈, 푸터, 인강) → `interview.html#exam` | 전형별 출제 유형과 풀이법 |
| 마이페이지 단위 행 안 링크 (`my.html` 보유 단위와 응시 기록) → `interview/<code>.html` | 출제 유형과 풀이법 보기 (IA2 현행 승인 2026-09-11, critic L2) |
| 제원 라벨 3 | 준비 / 답변 / 질문 |
| 제원 단위 | 분 / 개 |
| 수량 행 | 지문 30편 |
| 카드 제목 신규 3(r2_copy 키 korea_eq_hum·korea_eq_sci·yonsei_mirae) | 고려대 고른기회 인문 / 고려대 고른기회 자연 / 연세대 미래캠퍼스 |
| 구매 면 예정 단위 한 줄 | 9월 14일에 여는 단위: 고려대 고른기회 인문, 고려대 고른기회 자연, 연세대 미래캠퍼스 (각각 안내 면 링크) |
제원 값 원장 = `_tools/exam_pages/facts/<code>.json` 의 prep_sec·answer_sec·questions 만(초→분 변환은 빌더, 화면 하드코딩 금지). 대학명은 codes.py 라벨.

## 6. 자체 검증 (전건, verbatim 으로 보고서에)
- 빌드 2회 해시 · 검증기 전건 · style_gate 등급 · 12개월 0 · 8면 유입 링크 표 · `git status --short` 전문 · `git diff --stat` 전문.
- BLOCKED 로 넘길 것(본 세션이 돌림): `node _design/exam_pages_20260910/shot_prod.mjs`(8면 넘침), programs/studio.html#units · studio.html#units 1280/390 캡처, design-critic 9렌즈.

## 7. 보고
`_design/ia_20260910/codex/IMPL_REPORT_IA1.md` 에 파일별 변경 1줄 요약 + 검증 원문 + BLOCKED 목록 + USED_ASSETS. 마지막 줄 `IMPL_DONE files=<n> build_hash=<16hex> gates=<pass/fail 목록> BLOCKED=<명령 목록>`.
