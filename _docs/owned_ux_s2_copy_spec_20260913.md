# 구매물 활용 UX s2 문안 스펙 (2026-09-13 21:3x) — 학생 리뷰 2차 반영

원인 (Understand 합성, 57지점, P0 5건): 자료실 기출 체험판 10권(열람용)을 "녹화 전에 풀 문제"로 읽음. 이용권 → 응시 한 루트(세트 선택, 풀기, 녹화, 채점, 인강)를 첫 안내하는 자리가 없음. 자료실과 응시가 서로를 가리키지 않음.
원칙: 문안은 아래 문장을 그대로 쓴다(어휘 통일). 가운뎃점(·)과 em 대시 금지, 본문 화살표 금지(기존 .ar 링크 장식만 예외). 사실만 쓴다(앱 흐름 = 세트 카드 → 시작 화면 → 면접 시작 → 준비 화면에 제시문과 문제 → 답변 화면 녹음/녹화 → 채점 → 리포트(점수, 첨삭) → 해설 강의는 hyunhak.com MY 내 강의).

## 공통 문장 (verbatim)
- ROUTE: "응시는 응시하러 가기, 세트 선택, 면접 시작 순서이고 제시문과 문제는 준비 화면에 나오므로 따로 풀어 올 자료가 없습니다."
- RECORD: "답변은 그 화면에서 녹음과 녹화가 됩니다."
- GRADE: "답변을 마치면 채점되고 몇 분 뒤 리포트(점수와 첨삭)가 열립니다."
- LECTURE: "해설 강의는 채점 뒤 MY 의 내 강의에서 봅니다."
- READONLY: "자료실의 가이드북과 기출 체험판은 읽는 자료이고 응시와 별개입니다."
- WHERE: "점수는 MY 응시 기록에 남고, 영상과 첨삭은 스튜디오 내 기록에서 90일 동안 다시 봅니다."

## S-1 my.html (파일 1개만 편집)
(a) L195 이용권 lede → "스튜디오 이용권과 잔여 응시 횟수, 구매한 가이드북. " + ROUTE + " " + WHERE
(b) 첫 사용 안내 상자: `<div class="firstuse" data-first-guide hidden>` 를 #passList 바로 위(같은 .blk 안)에 정적 마크업으로 두고, 인라인 스크립트가 조건 충족 시 hidden 해제. 조건 = 회원 AND (살아 있는 studio 권리(studio_school 미만료, 또는 studio_passage 미만료 & uses_left>0) OR trial_available) AND 응시 기록 0건(/api/studio/attempts 결과, 이미 면이 받는 데이터). 구성 = `<p class="fu-t">처음 응시하기 전에</p><ol>` 5항목 + `<p class="fu-n">` READONLY.
   1. "아래 응시하러 가기를 누릅니다. 스튜디오가 열립니다." (체험만 있으면: "아래 응시하러 가기를 누릅니다. 무료 체험 응시 1회가 시작됩니다.")
   2. "세트 카드를 누르고 면접 시작을 누릅니다. 준비 시간 뒤 답변이 시작됩니다."
   3. "제시문과 문제는 준비 화면에 나옵니다. 자료실에서 미리 풀어 올 자료는 없습니다."
   4. "답변 화면에서 말하면 그 자리에서 녹음과 녹화가 됩니다. 답변을 마치면 채점되고 몇 분 뒤 리포트(점수와 첨삭)가 열립니다."
   5. "해설 강의는 채점 뒤 아래 내 강의에서 봅니다."
   스타일 = 기존 .blk 토큰만 사용(테두리 1px var(--line), 배경 없음, 곡률 0, 그림자 0). 400px 에서 넘침 0.
(c) L202 stuEmpty → "아직 응시 기록이 없습니다. 위 이용권의 응시하러 가기로 첫 응시를 시작하면 여기에 쌓입니다. 자료실은 읽는 자료입니다."
(d) L509 → "아직 응시한 세트가 없습니다. 응시하러 가기로 시작하면 제시문과 문제가 앱 화면에 나옵니다. 세트마다 '+SET_USES+'회 응시할 수 있고, 아래 문제지와 해설지 PDF 는 응시한 뒤 복습용입니다"
(e) L508 → "응시한 세트 N개. 문제지와 해설지는 복습용 구매자 각인 보안본 PDF 입니다"
(f) L515 summary → (didIds.length?'나머지 세트 ':'세트 ')+restIds.length+'개 복습용 문제지와 해설지 PDF 펼치기'
(g) L200 stuSum 정적 + L529/530 → "…영상과 첨삭은 응시일부터 90일 안에 스튜디오 내 기록에서 다시 봅니다" (세 곳 동일 문장)
(h) 응시 기록 행(L535~542): 채점 완료(finalized) 행에 `<a class="tlink" href="lecture.html?set=<set_id>">해설 강의</a>` 추가. 조건 = 그 세트 또는 그 단위의 lecture 권리가 있을 때(면이 이미 만드는 내 강의 데이터 재사용). 판정이 복잡하면 lecture 권리 1건 이상이면 표시.

## S-2 assets/owned.js (파일 1개만)
(a) owned-note(L156): 살아 있는 studio 권리 → ROUTE + " " + RECORD + " 채점 뒤 점수는 MY 응시 기록에, 해설 강의는 MY 내 강의에 있습니다. " + READONLY. 체험만(o.trial && 살아 있는 studio 없음) → "체험 응시도 같은 순서입니다. 체험 응시 버튼, 세트 선택, 면접 시작. 제시문과 문제는 준비 화면에 나오므로 따로 풀어 올 자료가 없고, 답변은 그 화면에서 녹음과 녹화가 됩니다. " + READONLY
(b) 가이드북 행 st 앞에 "읽는 자료, " 접두(전권 묶음 행, 낱권 행 모두). 인강 행 st → "채점 뒤 해설 강의, 공개된 편부터 시청"
(c) 게스트 1줄(L144)은 유지.

## S-3 library.html + pastexam.html + assets/pastexam.js (3파일만)
(a) library.html L116 링크 p 다음에 `<p class="rv" data-readonly-note>자료실 자료(가이드북, 기출 체험판, 인강 자료)는 읽는 자료입니다. 제시문 면접 응시 문제는 스튜디오 앱이 세트마다 화면에 내므로 여기서 미리 풀 필요가 없습니다. 응시 시작은 MY 이용권의 응시하러 가기입니다.</p>`
(b) pastexam.html: lede(L119) 끝에 " 2026학년도 실제 기출을 읽어 보는 열람용이며 제출과 채점이 없고, 제시문 면접 스튜디오 응시와 별개입니다." 추가. lede 다음에 `<p class="rv" data-readonly-note>스튜디오 응시는 MY 이용권의 응시하러 가기로 시작하고 응시 문제는 앱이 화면에 냅니다. 여기 문제지를 미리 풀어 갈 필요가 없습니다.</p>`. 열람 조건 ul 첫 li 로 "열람용 자료입니다. 제출과 채점이 없으며 스튜디오 응시와 별개입니다." 삽입. library.html:108 과 같은 자리에 `<div class="wrap"><div data-owned hidden></div></div>` 마운트 + app.js 다음에 `<script src="assets/owned.js"></script>`.
(c) pastexam.js: L136 `HH.me(true)` → `HH.me()`. L86 → "신청되었습니다. 아래 목록에서 열람하실 수 있습니다. 읽는 자료이며 스튜디오 응시와 별개입니다." L84/L150 열람 중 문장 뒤 텍스트 노드 " 읽는 자료이며 응시와 별개입니다." L162 → "아직 신청하지 않으셨습니다. 신청하면 N시간 동안 열람합니다. 계정당 한 번입니다. 읽는 자료이며 스튜디오 응시와 별개입니다."
(d) `<!-- aeo -->` 블록은 `_tools/seo_inject.py` 가 원천을 갖는지 확인하고, 원천이 있으면 거기서만 고친다. 없으면 건드리지 않는다(새 문장은 별 요소).

## S-4 studio.html + index.html + _tools/r2_copy.json + _tools/program_studio_v2.html (+ build_programs.py 재실행)
(a) studio.html 응시 절차(L247~252): 부제 "지문 1편, 응시 5회" → "이용권의 응시하러 가기로 시작, 지문 1편에 5회". 01 p → "앱 안의 세트 카드에서 고릅니다. 제시문과 문제는 준비 화면에 나오므로 따로 풀어 올 자료가 없습니다." 02 p → "문항을 나누지 않고 한 번에, 실제 고사장과 같은 규격. 답변은 그 화면에서 녹음과 녹화가 됩니다." 03 p → "답변을 마치면 채점되고 리포트에 전사, 오독과 비약 진단, 구술체 재구성이 실립니다." 04 p → "막힌 자리만 끊어 다시. 지문 1편에 5회까지. 해설 강의는 MY 내 강의에서."
(b) studio.html FAQ(dl data-faq, L262~267)와 JSON-LD FAQPage(L20~30, 생성 원천이 `_tools/r2_faq.py`/seo_inject 인지 확인 후 같은 원천에서) 동기 편집:
   - "첨삭은 언제 받나요" → "응시 회차마다 채점 뒤 리포트에 전사, 진단, 재구성 세 단이 실립니다. 점수는 마이페이지 응시 기록에, 영상과 첨삭은 스튜디오 내 기록에 90일."
   - "체험 응시는 무엇인가요" → "회원 가입 후 무료 응시 1회. 이 면 상단의 체험 응시 링크에서 시작하며 이용권이 있으면 그 자리가 응시하러 가기로 바뀝니다."
   - 신설 3건: "이용권을 샀는데 어디서 시작하나요" → "마이페이지 이용권의 응시하러 가기, 또는 이 면 상단 내가 산 것의 응시하러 가기. 스튜디오 앱이 열리면 세트 카드를 누르고 면접 시작을 누릅니다." / "자료실 기출 체험판과 응시 문제가 같은가요" → "다릅니다. 기출 체험판은 2026학년도 기출을 읽는 자료이고, 응시 문제는 앱이 세트마다 준비 화면에 냅니다. 자료실에서 미리 풀어 올 것은 없습니다." / "녹화는 어디서 하나요" → "스튜디오 앱의 답변 화면에서 말하면 그 자리에서 녹음과 녹화가 됩니다. 따로 찍어 올리는 절차가 없습니다."
(c) r2_copy.json(index.html #flow 와 programs/studio.html #flow 공용): flow_lead → "이용권의 응시하러 가기로 스튜디오 앱이 열리고, 지문 1편에 5회까지 응시합니다." flow_1 → "앱 안의 세트 카드에서 고릅니다. 제시문과 문제는 준비 화면에 나오므로 따로 풀어 올 자료가 없습니다." flow_2 → "실제 고사장 규격으로 문항을 나누지 않고 응시합니다. 답변은 그 화면에서 녹음과 녹화가 됩니다." flow_3 → "채점 뒤 리포트에 전사, 오독과 비약 진단, 구술체 재구성을 제공합니다." flow_4 → "막힌 자리만 끊어 다시 응시합니다. 해설 강의는 MY 내 강의에서 봅니다." index.html 이 r2_copy.json 에서 생성되지 않으면 index.html L92 의 같은 data-copy span 을 손으로 동일 문장으로 맞춘다(원천 확인 필수). 템플릿 L54 표 셀도 flow_3 을 쓰므로 길이 확인.
(d) programs/studio.html FAQ 에 (b) 신설 3건을 같은 원천(r2_faq.py 또는 템플릿)에서 추가. 재생성 = `python3 _tools/build_programs.py`(다른 면 diff 0 확인).

## S-5 _tools/build_lectures.py (생성기만 편집 후 `python3 _tools/build_lectures.py` 재실행)
(a) L279 OT 3단계 → "응시합니다. 마이페이지 이용권의 응시하러 가기로 스튜디오 앱이 열리고, 제시문과 문제는 앱이 냅니다. 첫 응시는 실전형 한 번, 첨삭을 받습니다."
(b) L360 band p → "강좌별 강의 목차표와 OT 대본은 자료실에 있습니다. 자료실 자료는 읽는 자료이고 응시와 별개입니다."
(c) L352, L463 OT p 끝에 " 응시 시작은 마이페이지 이용권의 응시하러 가기입니다." 추가.
(d) classroom.html 에 `<div class="wrap"><div data-owned hidden></div></div>` 마운트와 owned.js script 가 없으면 lectures.html(L248 패턴)과 같은 자리에 추가.

## S-6 interview-studio web/index.html (파일 1개만, sets/*.json 과 docs/ 는 절대 건드리지 않음)
(a) loadMe: bridged AND scope!=="history" 이면 #setgrid 앞에 `<div class="notice" id="firstUseNote">hyunhak.com 에서 응시하러 들어오셨습니다. 세트 카드를 누르고 면접 시작을 누르면 이 세트의 제시문과 문제가 준비 화면에 나옵니다. 답변은 이 앱 안에서 녹음과 녹화가 되고 채점 뒤 리포트가 열립니다. 면접 시작마다 응시 1회를 씁니다. 해설 강의는 hyunhak.com 마이페이지의 내 강의에서 봅니다.</div>` (history 배너와 같은 .notice 클래스, 중복 삽입 방지).
(b) bridged 문안: scr-home h1 → "응시할 면접 세트를 고르세요", #btn-exit → "응시 종료", #btn-retry → "같은 세트 다시 응시 (응시 1회 사용)". loadMe 에서 bridgeBound 일 때만 textContent 교체.
(c) 리포트 CTA(L525~529): `<a class="btn ghost" id="btn-lecture" hidden target="_blank" rel="noopener">이 세트의 해설 강의</a>` 추가, 리포트 열릴 때(L1253 부근, btn-report-history 표시 로직 옆) bridgeBound 이면 href = "https://hyunhak.com/lecture.html?set=" + encodeURIComponent(세트 id 필드; /api/sets 응답의 id 키를 확인) 하고 hidden 해제. 그 아래 `<p class="rpt-note" id="rptBridgeNote" hidden>점수는 hyunhak.com 마이페이지 응시 기록에 기록됐습니다. 영상과 첨삭은 내 기록에서 90일 동안 다시 봅니다.</p>` 같은 조건으로 표시.
(d) 데모 배속 칩, chip-my title 은 그대로(별 결재).
(e) 검증 = 인라인 JS 추출 `node --check`, `python3 -m pytest -q` 전건 GREEN, `scripts/handoff_owned_chip_20260913.sh` 가 web/index.html 을 실행 시점에 복사하는지 확인(수정 불요면 그대로).

## S-7 _tools/shot_owned.mjs (파일 1개만; 실행은 별 단계)
- PAGES += 'pastexam.html', 'classroom.html'. 상태 = owner(응시 0건, 첫 사용 안내 보여야 함), owner_done(채점 완료 응시 1건 + lecture 권리 → 안내 숨김, 해설 강의 링크 1), trial(trial_available true, entitlements []), guest.
- STUB 추가: /api/trial/reader/catalog = {catalog:[10건 {slug,title,pages}], hours:48}, /api/trial/reader = owner {status:'none',hours:48} / owner_done {status:'active',expires_at:+40h,hours:48,catalog:[…]}. /api/studio/attempts owner_done = 1건 {id, set_id:'korea_2027_h03', status:'done', finalized:true, total_score, max_score, created_at} (my.html 이 읽는 필드명을 my.html L470~545 에서 확인해 맞춘다).
- 프로브 추가: guide = [data-first-guide] 의 hidden 과 innerText, ownedNote = .owned-note innerText, ro = [data-readonly-note] innerText, stateText = #stateText innerText, lecLinks = #stuRows a[href^="lecture.html?set="] 수, faqNew = dt 텍스트에 "어디서 시작" 포함 수. 기존 ox/tapSmall/errs/클릭 테스트 유지(fullPage 뒤 터치 에뮬 소실 주의 = 클릭은 새 page).
- 앱 렌더 루프 추가: interview-studio/web 을 정적 서빙(포트 8812)하고 /api/me = {sub_bound:true,nick:'검수용',scope:''} / /api/sets = interview-studio/sets 의 세트 2건 / 그 외 {} 로 route. 400/1280 에서 scr-home 스크린샷 + 프로브 firstUse = #firstUseNote innerText, h1 = #scr-home h1 innerText, retry = #btn-retry textContent, 그리고 첫 .setcard 클릭 뒤 scr-brief 활성 여부. scope:'history' 상태도 1회(firstUseNote 없어야 함).
- 리포트 = `_docs/owned_ux_render_report_s2_20260913.json`, 스크린샷 디렉터리 = argv.
