# s44 원장, GS-22, GS-24, GS-17b, GS-20, GS-16, GS-19 집행 (2026-09-04 01:3x~)

> 결재 = 건우 "모두 이어가"(01:28, 트리거 블록 next 항목 전부). 처분 원칙 = 각 항목 권고안 그대로. GS-21 은 권고가 보류라 보류 유지.
> 도구 = probe_s44.mjs(사전, 사후 계측), patch_s44_guidebook.py, _b.py, patch_s44_studio.py(멱등 패치), gate_gs17.mjs(19항목으로 확장), shots_s44.mjs. 서버 8934(본 세션 계측 전용), 8933(run_gate).

## 0. 요약

가이드북 면 8건, 스튜디오 면 4건, 사이트 공용 3건(noscript 50면, bizinfo png, faq 반품 문안), 문서 2건(브랜드 가이드 v1.2, 법률 메모)을 집행했다.
게이트는 12항목에서 19항목이 됐고 로컬 **19/19 PASS**. 같은 게이트를 라이브(구판)에 돌린 대조군에서 신설, 재정의 8항목(S7 S8 G1 G5 G6 G7 G8 A3)이 **전건 FAIL** → 검출기가 양방향으로 일한다.
measure_v3 3면 × 1440/390 = 6조건 PASS. build_all 2회 해시 동일(critic 반영 뒤 최종) `5010eb02b3245e7d`.

## 1. 가이드북 소개 면 (programs/guidebook.html)

| # | 처분 | 원천 | 실측 before → after |
|---|---|---|---|
| GS-22-1 | 전권 카드: 열람 전권 511,500 만 朱印 34px, PDF 전권 1,705,000 은 먹색 `.alt b` 16px 한 줄 | build_page.py `.price` 3번 카드, `.price .alt` | 카드당 `.won` 2 → 1, altFs 16 < primaryFs 34 (G1 재정의) |
| GS-22-2 | "절반" 문장을 카드 밖 `.pricenote` 16px 로. 카드 안은 권당 단가(16,500, 55,000). FAQ "여러 권을 사면" 같은 문안 | `.price .calc` 2줄 → 삭제, `.pricenote` 신설 | 절반 텍스트 fs 16, 16 (G1 하한 유지) |
| GS-22-3 | 열람판 카드 4째 항목 "면수와 질문 수는 권마다 다르고, 값은 어느 대학이든 한 권에 같습니다" + FAQ "얇은 권도 값이 같나" 신설 | `.price` 1번 카드, `#faq` | FAQ details 5 → 6 |
| GS-22-4 | "31개 대학 목록 보기" `.tl` 밑줄 → `.btn.ghost` 테두리 버튼 + ↓ | `#trust .tolist`, `.btn.ghost` 신설 | 48px 높이 유지, 1px 먹 테두리 |
| GS-24-2 | 세 카드 내용량 균형(열람판 4항목, PDF 4항목, 전권 alt+3항목) | 위 카드 재구성 + PDF "발급 전에는 7일 이내 청약철회" 추가 | 죽은 하단 208, 231, 1px(49%, 54.5%) → 14, 37, 1px(5%, **13.4%**, 0.4%). G7 ≤ 15 |
| GS-24-3 | 한글 드는 mono 요소 `word-spacing:-.35em` (JetBrains Mono 공백 0.584em → Pretendard 0.235em) | `.mono,.kicker,...,.close .won` 한 규칙 | 35노드 602자, 공백 비율 2.44~2.99 → **0.99~1.5** (kicker 1.5 = 자간 .10em 분). G8 ≤ 1.6 |
| GS-24-4 | 리스트 항목 `<h4>` 21개 → `<h3>`, 시각 불변 규칙 `.forms h3,...{font-weight:700;text-wrap:inherit}` | HTML 템플릿 + CSS 6 셀렉터 | h2→h4 도약 5 → **0**, h3 10 → 31 (G5) |
| GS-24-6 | `.bk .mt` 11 → 12px / 390 `.grid` 마지막 행 고아 타일 가운데(`:last-child:nth-child(3n+1)`) / `a.skip` / 900px 이하 `.buybar`(권당 33,000원 + 玄墨 "지원 대학 고르기", 배경 `--paper-rgb`) | CSS + HTML | 390 고정 요소 0 → 1(div.buybar), 스킵 링크 false → true, 문서 높이 25,002 → 25,211 (G6) |

곁다리 사고 1건: word-spacing 셀렉터에 sans 인 `.buybar .nm` 을 넣어 "보안리더열람,권당" 으로 붙었다(390 스크린샷에서 발견). 제외하고 재빌드. 규칙은 **mono 로 계산되는 요소에만**.

## 2. 스튜디오 소개 면 (programs/studio.html, GS-24-5 묶음)

| 항목 | 처분 | 실측 |
|---|---|---|
| 495,000 5회 반복 | `#units` 카드 `.won` 제거, 절 리드 한 문장 "단위마다 지문 30편, 전권 495,000원에 풀이법 인강 포함, 다섯 단위 같은 값". `.unit .tl{margin-top:auto}` 로 바닥 정렬 승계 | unitWon 5 → 0 (S7) |
| 3단계 카드 링크 정렬 | `.rail.anchor .tail` 가로 space-between → 세로(`.foot` 과 동일). DOM 불변(S5 카드 변주 유지) | `.go` 왼콽 오프셋 pivot 225 → 0, core 제외 4장 종수 1 (S7) |
| 구매 바 밑줄 | `.buybar .nm` `--hair` → `--ink` | 390 computed rgb(49,46,46) |
| 배경 토큰 | `--paper-rgb:244,239,227` 신설, `.buybar` 배경 `rgba(var(--paper-rgb),.96)` (brand-identity-keeper V8 지적) | 픽셀 동일 |
| mono 한글 공백 | 가이드북과 같은 규칙, 스튜디오 셀렉터 30종 | S8 최대 비율 2.99 → 1.5 |
| 절 머리 빈 폭 | `#p1 .head` 번호 열 잉크 134/397, 제목 열 242/555 (빈 263, 313px), `#p5` 327px. 번호를 시각 열 위에, 제목을 본문 열 위에 맞추는 배열이라 리듬으로 두었고 critic 도 리듬으로 판정. 단 critic P2-1 = `#p2, #p3` 는 head 5fr/7fr 대 body 6fr/6fr 로 제목 좌변 79.3px 어긋남(GS-17 ②③ 잔재) → head 도 6fr/6fr 로 맞춤(patch_s44_studio_d). 히어로 우열 464 는 h1 **박스** 폭이고 잉크는 3줄 452/391(critic 정정), 빈 열 아님 | 실측 |

## 3. 사이트 공용

- **GS-24-1** `_tools/apply_noscript_rv.py` 신설, build_all 3c 단계 편입. base.css 링크 51면 중 50면에 `<noscript><style>.rv{opacity:1;transform:none}</style></noscript>` 삽입(1면은 링크 문면이 달라 미매치, reader.html 은 제외 대상). 멱등(2회째 0 변경). 스크립트 차단 12면 `.rv` 비가시 **90 → 0**(rv 총 223), A3 신설.
- **GS-20** `render_bizinfo.mjs` 문구 "신고 면제 대상(전자상거래법 제12조 제1항 단서)" 로, png 재생성. 치수 330×168 불변(가장 긴 줄이 330px 안에 들어 줄 수 8 유지) → korea, yonsei width/height 갱신 불요(스크립트는 돌려 동일값 확인). 구 png = `bizinfo_before_gs20.png`.
- **GS-16 ①** faq.html "미개봉 상태에서 반품" → "수령 후 7일 이내에 청약철회할 수 있습니다. 내용을 확인하려고 포장을 연 경우는 훼손으로 보지 않으며, 소비자 책임으로 상품이 멸실되거나 훼손된 경우에만 제한됩니다." 본문 + JSON-LD 2곳, 잔존 0. 근거 = 전자상거래법 17조 2항 1호 단서(legal-contract-privacy-analyst, law.go.kr 원문).

## 4. 문서

- **GS-17b** 브랜드 가이드 **v1.2** 발행 (`디자인_산출/현학적연구소_명함_브랜드가이드_20260819/brandbook/현학적연구소_브랜드가이드_v1.2.pdf`, 11면, v1.0, v1.1 병존). §07 구조 행 = brand-identity-keeper 대체 문안(상품 상세 면 두 면만 예외, 결제 흐름 면은 탭 유지, 구매 바 금지, 구매 바는 새 CTA 가 아니라 1차 CTA 복제). 같은 판에서 §07 면 행 hex 를 base.css 실값(#F4EFE3, #FBF7EE, #EBE4D4)으로 재동기, §08 "이 문서" 행과 개정 이력 갱신. 소스 = `_work/build_docs.mjs`(백업 .bak.*_pre_v12), 10면 렌더 확인.
- **GS-16 ②③, GS-19** `_docs/legal_gs16_gs19_20260904.md`. 결재 항목으로 등재(§GBSTD-20260904-L).

## 5. 게이트 확장 (gate_gs17.mjs, 백업 .bak.*_pre_s44)

| id | 계측 | 로컬 s44b | 라이브 대조군 |
|---|---|---|---|
| G1 재정의 | 절반 fs 전건 ≥16, 카드 1차 값 동일, 카드당 .won 1, alt < 1차 | PASS | FAIL (wonPerCard 1,1,2) |
| G5 | 가이드북 제목 도약 | 0 | 5 |
| G6 | 가이드북 390 고정 요소, 3화면 뒤 구매 링크, 스킵 링크 | PASS | FAIL (0, false, false) |
| G7 | 가격 카드 죽은 하단 최대 % | 13.4 | 54.5 |
| G8 | 가이드북 mono 한글 공백 비율 | 1.5 | 2.99 |
| S7 | 단위 카드 .won 수, 링크 오프셋 종수(core 제외) | 0, 1 | 5, 2 |
| S8 | 스튜디오 mono 한글 공백 비율 | 1.5 | 2.99 |
| A3 | 스크립트 차단 12면 .rv 비가시 | 0 | 90 |

기존 11항목(S1~S6, G2~G4, A1, A2) 전건 PASS 유지. G4 390 p4Pct 48.5(하한 47.8) 는 구매 바 body 패딩 80px 로 0.8 내려온 값, 구조 술어 불변.
S7 첫 판은 core(4단계, 2열 grid) 카드까지 세어 종수 2 로 FAIL 했다. core 는 의도된 변주(GS-17 S5)라 제외하고 나머지 4장으로 잰다. 라이브 대조군은 제외 뒤에도 2 로 FAIL(pivot 225).

## 6. 잔여 결재 (pending_approvals_active.md)

- GS-21 절정 위치 = 권고 ③ 보류 유지(판매 영향 미실측). 이번 G4 실측 1440 p4 50.7%, 390 48.5%.
- §GBSTD-20260904-L 법률 4건 = GS-16-1b terms 6조 1항 단서 추가(약관 개정 공지 절차), GS-16-2 학원법 등록(가능성 中, 변호사 + 교육지원청 유권해석), GS-16-3 13년차 실증자료 5종 준비(건우), GS-19 terms 8조 문안 1안 채택 여부.
- 배포 = 건우 `sh _tools/deploy.sh`(routes PUT 503 재발 시 `env -u` 4종).

## 7. 잊지 말 것

- 문자 폭 보정(word-spacing, letter-spacing) 은 계산된 font-family 로 범위를 정한다. 클래스 이름으로 짐작해 sans 요소를 끼우면 조용히 붙는다. 검출은 지면 스크린샷이 잡았고 계측기(mono 노드만 셈)는 못 잡았다 → 보정 규칙을 넓힐 때는 sans 요소에 음수 word-spacing 이 걸렸는지 별도 계수.
- 새 검출기는 반드시 구판(라이브)에도 돌려 FAIL 을 본다. 이번 8항목 전건 확인.
- 검증 에이전트(critic 2, audience 1) 가 8934 를 읽는 동안 산출 바이트를 건드리지 않았다(s43 교훈).

## 8. 외부 시선 (8934 로컬, 파일 수정 0)

| 면 | design-critic | design-audience-proxy |
|---|---|---|
| 가이드북 | **35/45 YES**, P1 0, P2 6 (s43 33). 렌즈 3(도약 5→0), 4(죽은 하단 54.5→13.4%), 8(구매 바) 이동. Stage 1 overflow 0 | **26/30 PASS** (s43 25.5). 학부모 9: ①~④ 전건 해소 확인("5초 보고 한 권 33,000 / 파일 110,000 / 31권 511,500 말할 수 있음"). 경쟁사 8, 비한국 9 |
| 스튜디오 | **35/45 YES**, P1 0, P2 5 (s43 37, Blind 라 델타 귀속 불가). fix③ 밑줄 대비 2.22 → 11.73 실측 정당, fix④ 공백 보정 한글 정상대 안, 3단계 링크 dx 225 → 0 | (s44 미발주, 변경 범위 P2 묶음) |

critic P2 반영(patch_s44_c.py, patch_s44_studio_d.py): 가이드북 `.pricenote` 65.5자/행 → measure 36em / 구매 바 라벨 11 → 12px, `--gray` → `--body`(반투명 바 위 대비 4.60 → 6.9, 두 면) / `.alt` 값 "원" 을 mono b 안으로(16px 통일) / 스튜디오 `#p2, #p3 .head` 트랙 6fr/6fr / 다섯 카드 바닥 규칙선 2/5 → 0/5 / `.unit dd` 행간 1.55.
미반영 P2(기록): 가이드북 카드2 죽은 하단 37px(게이트 15% 안), 결말 절 가격, CTA 가 구매 바와 2중(상시 바의 성질) / 스튜디오 390 단위 카드 구간에서 바가 낱권 33,000 만 표시(바 SKU 는 낱권 고정, 단위 전권은 리드 문장), `.kicker`, `.viscap` 대비 4.56(`--gray` 토큰 전역), 히어로 우열 세로 여백.
반영 뒤 게이트 **19/19**(baseline_s44c.json), measure_v3 6조건 PASS, build_all 해시 `5010eb02b3245e7d` 2회.
