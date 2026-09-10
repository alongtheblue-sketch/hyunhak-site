# BRIEF — hyunhak.com 전형별 면접 출제 유형·풀이법 상세면 8본 (템플릿 1 + 인스턴스 8)

> design-director 에 전달된 프롬프트 전문(verbatim). 착수 2026-09-10 10:5x. 산출 폴더 = `~/Workspace/hyunhak-site/_design/exam_pages_20260910/` (이미 있음).
> 사이트 파일(_design 밖)은 읽기만 하고 수정하지 않는다. 힉스필드·이미지 생성 호출은 하지 않는다. 첫 행동 = 이 프롬프트 전문을 BRIEF.md 로 저장(이미 저장돼 있으면 건너뛴다).

## 무엇을 만드나
hyunhak.com(현학적 연구소, 대입 면접 콘텐츠 커머스, 이루리 아님 = 일반 경로)에 `/interview/<code>.html` 8면을 새로 낸다. 검색엔진(SEO)·답변엔진(AEO)·생성엔진(GEO) 유입용 정보면이면서 판매면(스튜디오 이용권)으로 잇는 전환면이다. 8면은 한 템플릿의 인스턴스다.

| code | 면 이름 | 상태 |
|---|---|---|
| yonsei-hum | 연세대 활동우수형 인문·통합 | 판매중 |
| yonsei-sci | 연세대 활동우수형 자연 | 판매중 |
| yonsei-intl | 연세대 국제형 | 판매중 |
| yonsei-mirae | 연세대 미래캠퍼스 학생부종합 | 9월 14일 오픈 예정 |
| korea-hum | 고려대 계열적합전형 인문 | 판매중 |
| korea-sci | 고려대 계열적합전형 자연 | 판매중 |
| korea-eq-hum | 고려대 고른기회전형 인문 | 9월 14일 오픈 예정 |
| korea-eq-sci | 고려대 고른기회전형 자연 | 9월 14일 오픈 예정 |

## 선행 Read (스킵 금지, 각 1줄 보고)
1. `~/.claude/projects/-Users-gregory/memory/feedback_design_master_router.md` §1~§11
2. `~/.claude/projects/-Users-gregory/memory/feedback_design_team_marathon_harness.md` §2 design-director 행 (E JTBD = 04 정보 + 01 전환 이중, U 위계·시선, F 출력 직전 §D 8룰)
3. `~/.claude/projects/-Users-gregory/memory/feedback_design_research_learning_mandatory.md` UI/UX/웹 분기 → `design_references/05_digital_ui_ux.md`, `learning_marathon_20260426_v3/16_digital_uiux_pass2.md`
4. `~/.claude/projects/-Users-gregory/memory/reference_design_5elements_craft_ssot.md`
5. 사이트 실측: `~/Workspace/hyunhak-site/assets/base.css`(:root 토큰·타입 사다리·.page·.t·.steps·.faq·.btn·.badge·.anch), `lectures/yonsei-hum.html` 111~190행(v2 셸 위 인강 상세면 = 가장 가까운 형제 면: hero hcopy·buybox·anch·page 섹션·faq details), `interview.html`(38교 판정표 허브, 이 8면의 상위 허브), `programs/korea.html`(구 LP, 자체 셸이라 상속 대상 아님·참고만), `_design/VISUAL_DIRECTION_20260823.md` §1 규범.
6. `~/.claude/projects/-Users-gregory/memory/feedback_korean_ai_tell_style_gate.md` 요지(문안 자리표는 임시지만 시안에 넣는 예시 문장도 가운뎃점·em대시·은유 0).

무드보드·mood-reference-sourcing 은 생략한다 — 사이트 토큰(base.css)이 명시 제공된 예외 경로다. 대신 형제 면(lectures/*.html)과의 동일 계열 판독을 자체검사에 적는다.

## 브랜드 고정
팔레트 = base.css :root 그대로(--ink 玄墨, --paper 楮紙, --card, --seal 朱印 은 가격·인장·활성 표식·강조 라벨에만, --gold 金泥 는 玄墨 위에서만, --link). 서체 = Pretendard 본문·표제, JetBrains Mono 숫자·라벨·시간·초, 세리프는 워드마크·인용에만. 값은 토큰만(리터럴 px 는 1px 괘선 외 금지). 신규 색 0, 신규 서체 0. 이미지 0(도판은 CSS·SVG 도형과 표만). 곡률·그림자는 base.css 토큰(--r-md 등)만.

## 면의 내용 골격 (템플릿 자리표 = `{...}`, 순서 고정, 섹션 id 고정)
0. 브레드크럼(현학적 연구소 › 면접 형태 판정표 › {전형명}) + `<h1>{대학} {전형명} 면접, 출제 유형과 풀이법 (2027)</h1>` + 리드 2문장(답변엔진용 answer-first: "…은 제시문 N편을 읽고 준비 N분, 답변 N분에 질문 N개에 답하는 제시문 면접입니다. …") + 상태 배지(판매중 / 9월 14일 오픈 예정).
1. `#spec` 전형 규격표: 형태·제시문 수·준비 시간·답변 시간·질문 수·배점 공개 여부·출제 범위·평가 요소·언어(국제형은 영어 제시문 포함)·전형 반영 비율(예: 1단계 서류 100%, 2단계 1단계 60% + 면접 40%)·3개년 기출 세트 수. 각 값에 출처 각주(요강·시행계획·선행학습영향평가 보고서 면수). 표는 모바일 390 에서 2열 유지 또는 카드 전환 둘 중 하나로 안마다 정한다.
2. `#types` 출제 유형 지도: 유형 카드 3~5개(유형명 / 한 줄 정의 / 3개년 기출 빈도 표기 자리 "{n}회" / 대표 발문 꼴 1개 / 우리 은행 세트 수). 유형 카드는 3안에서 갈리는 자리 1(A 괘선 표, B 카드 그리드, C 세로 타임라인).
3. `#method` 풀이 메타: 핵심 원칙 3~5개(번호 목록) + 시간 배분 표(단계 / 초 / 하는 일, 예: 21분 5단계 골격) + "여기서부터는 스튜디오·인강" 경계 표식(비공개 층: 채점 기준 세부·모범답안·세트별 전략은 안 실린다는 것을 시각적으로 드러내는 잠긴 블록 1개 — 회색 자리표+자물쇠 아이콘 금지, 괘선과 라벨로만).
4. `#sample` 예시 문항과 풀이 골격: 시험지 꼴 상자(doc_head 라벨, 제시문 (가)(나)(다) 발췌 각 2~4문장, 문항 2~3개) + 풀이 골격(단계 3~4개: 작업 지도 확정 → 결론 선언 → 근거 배치 → 마지막 단계는 "스튜디오 리포트에서") + 첫 문장 예시 1개 + 자주 갈리는 함정 1개. 시험지 상자와 풀이 골격은 데스크톱 2열, 모바일 1열.
5. `#pitfalls` 자주 하는 실수 3개(짧은 카드 또는 목록).
6. `#plan` 준비 순서 4단계 + 우리 자료 연결(스튜디오 세트 {n}편 · 해설 인강 {n}편 · 2026 기출 해설 · 가이드북) + CTA. 판매중 = `.btn` 주행동 「면접 스튜디오 이용권 보기」(studio.html?unit={code}) + 텍스트 링크 「풀이법 인강」(lectures/{code}.html). 오픈 예정 = 주행동 대신 「9월 14일 오픈, 공지 보기」(notice.html) 텍스트 링크 + 오픈 예정 띠. 마케팅 CTA 는 텍스트 링크, 커머스 확정 행동만 .btn.
7. `#faq` 자주 묻는 질문 5개(`<details class="faq">` 꼴, FAQPage JSON-LD 는 빌드가 붙인다).
8. `#contact` 오프라인 수업 문의: 「오프라인 수업 문의 070-8098-0671」 + 운영 시간 자리표 + 텍스트 링크 「고객센터」(support.html). 전화번호는 `tel:` 링크, 숫자는 mono.
9. 하단: 형제 면 8개로 가는 내부 링크 띠(현재 면은 aria-current) + 허브(interview.html) 링크.

앵커 내비(.anch 계열, 卷 표식은 쓰지 않는다 = 인강 면과의 구분 표지 1)는 #spec #types #method #sample #plan #faq 6개.

## 3안 (한 템플릿, 시안마다 갈리는 자리 = 유형 지도·예시 문항 상자·규격표 모바일 처리)
- A 「문서형」: 괘선 표 위주, 1단 판면 --measure, 시험지 상자는 괘선 이중 테두리(인쇄물 인용 꼴).
- B 「카드형」: 유형 카드 그리드(2~3열), 규격표는 카드 전환, 시험지 상자는 --card 배경.
- C 「절차형」: 풀이 메타의 시간 배분을 세로 타임라인으로 세우고 유형 지도도 같은 축에 붙인다. 예시 문항은 시험지 상자 + 오른쪽 단계 레일.
각 안은 데스크톱 1280 과 모바일 390 둘 다. 한 안에 인스턴스 2개(판매중 korea-hum, 오픈 예정 korea-eq-hum)를 렌더한다.

## 시안 채우기용 사실(임시 문안, 값은 이 표만 쓴다)
고려대 계열적합 인문: 제시문 4편, 준비 21분(1,260초), 답변 7분(420초), 문항 3, 배점 비공개, 평가 3축(분석력·적용력·종합적 사고력), 1단계 서류 100%(5배수), 2단계 1단계 60% + 면접 40%, 3개년 기출 12카드, 우리 은행 30세트, 해설 인강 44편.
고려대 고른기회 인문: 제시문 4편, 준비 12분(720초), 답변 6분(360초), 문항 3, 1단계 서류 100%(3배수), 2단계 1단계 60% + 면접 40%, 수능 최저 없음, 모집 199명, 은행 준비 중(9월 14일 오픈 예정).
발문 예시: "(가)의 ㉠과 (나)의 ㉡에 나타나는 기록에 대한 태도의 공통점과 차이점을 설명하시오."
숫자는 위 값만. 없는 값은 "{n}" 자리표로 둔다. 최상급·감탄부호·"합격"·"보장"·"1위" 금지, 사실 진술만.

## 산출 (전부 폴더 안)
1. BRIEF.md (이 프롬프트)
2. tpl_A.html / tpl_B.html / tpl_C.html — 각 안의 완성 면(korea-hum 인스턴스) + tpl_A_open.html … (korea-eq-hum 오픈 예정 인스턴스). base.css 를 상대경로(`../../assets/base.css`)로 싣고 자족 CSS 는 exam_page.css 하나에 안별 modifier 클래스(.xa .xb .xc)로. 셸(GNB·푸터·모바일 바)은 `<!--v2:shell-->` `<!--v2:footer-->` `<!--v2:fix-->` 자리표 주석만 두고 그리지 않는다(빌드가 넣는다). `<body class="v2 exam xA" data-p="../">`.
3. board.html + shot 1280·390 PNG (직전 폴더 `_design/promo_popup_20260907/build_board.py`, `shot_board.mjs` 방식 재사용).
4. tpl.html — 권고안의 통합용 템플릿(자리표 `{h1}` `{lead}` `{spec_rows}` `{type_cards}` `{method_rules}` `{time_rows}` `{sample_doc}` `{sample_steps}` `{pitfalls}` `{plan_steps}` `{cta}` `{faq}` `{siblings}` `{status_badge}` 등, 자리표 목록을 파일 머리 주석에 전부 적는다). JS 는 메인 세션이 붙인다(앵커 현재 표시·details 만).
5. SELF_CHECK.md = 라우터 §9 통과 라인(§K 5요소 포함) + 16뿌리 표 + 잔상 7축 + Q-K 5요소 + 접근성 실측(대비 값, 터치 44/48, 포커스 가시) + 형제 면(lectures) 동일 계열 판독 근거 + 권고안 1개와 근거 + 갈리는 자리별 판정.

보고 = 400자 이내: 선행 Read 6줄, 권고안 1개와 근거 2줄, 파일 목록, SELF_CHECK 경로. 판단은 위임하지 않고 그대로 보고한다.
