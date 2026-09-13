# 버그 스윕 수리 스펙 (2026-09-14 00:2x) — 확인 결함 124건 중 사이트·스튜디오 앱 분 수리, API 분은 결재 큐

원천 = `_docs/sweep_confirmed_by_file_20260913.json` (파일별 결함, id·line·evidence·fix_hint·votes). 각 그룹은 자기 파일의 항목을 전부 읽고 아래 결정에 따라 고친다. 같은 결함이 여러 id 로 중복돼 있다(예: 만료 이용권 버튼 = R1-01·C1·C3·JS-1). 한 번만 고치면 된다.
공통 규칙: 정확 치환, 표적 편집, 다른 파일 금지, git 금지, 가운뎃점·em대시·본문 화살표 금지, 문안은 사실만. 새 문장은 합니다체.

## 어휘 결정 (전 그룹 공통)
- D1 "MY 응시 기록 / MY 내 강의 / MY 이용권 / MY 에서" 처럼 새 문안에 쓴 "MY" 는 전부 "마이페이지" 로 (C5). 하단 탭 라벨 "MY" 자체는 그대로 둔다.
- D2 무료 응시 이름 = "체험 응시" 하나로 (C6·JS-7·R1-08·NAV-07). my.html 의 "맛보기" 는 인강 미리보기에만 남긴다.
- D3 가이드북 뷰어 이름 = "보안 리더" 하나로 (R4-READER-NAME). "보안 뷰어" 를 바꾼다.
- D4 해설 강의 안내에서 "채점 뒤" 를 뺀다 (R1-09). 예: "해설 강의는 아래 내 강의에서 봅니다." / owned.js 인강 행 st = "해설 강의, 공개된 편부터 시청". 체험 응시만 있는 회원의 안내 5단계 = "해설 강의는 이용권을 구매하면 내 강의에 들어옵니다." (C8)
- D5 스튜디오 판매 문안 "기출 제시문 150세트" → "기출 규격 제시문 150세트" (C11, 자료실 기출 체험판과 어휘 충돌). r2_copy.json 원천에서 고치고 index.html 손편집 span 도 같이.
- D6 인강 시청 3개월 기산점 = "지급일부터" 로 통일 (copy-lecture-validity-start-date).
- D7 만료 권리 = 살아 있는 버튼을 주지 않는다. 스튜디오 = "응시 기간 종료" 또는 "응시 횟수 소진" 텍스트 + `<a class="tlink" href="studio.html">다시 구매</a>`. 가이드북 = "열람 기간 종료" + 다시 구매 링크. 인강 = "시청 기간 종료".

## G1 my.html (35건 전부 검토)
필수: R2-API-01/R2-JS-01 item_ids 정수(P0, `.map(Number).filter(Number.isInteger)`, 400 분기 사용자 문구) · R1-01/C1/C3/JS-1 + R2-05 만료·소진 이용권 카드(D7, sr-h·summary 도 만료 문안) · R1-02/C2/C5/JS-2 .hgo 를 `HH.studioGo(btn)` 경유(버튼에 `data-view="history"`; owned.js 가 이 속성을 body.view 로 실음, G2 와 계약) · C2(683) 주문 상태 waiting_deposit=입금 대기, partial_canceled=부분 취소, 환불 링크 predicate paid|partial_canceled · C4(458) 가이드북 만료 문안(D7) · C3(591) scope common 인강 권리 카드 · JS-R3-01 attempts 실패 시 PDF 행·첫사용 안내 유지 · R4-02 환불 모달 "응시 시작"→"제공 개시" · C8/R1-09 안내 5단계(D4) · JS-5/R1-04 만료 lecture 권리 제외 · R4-CONTRACT-2 meta.trial download 권리 = "2026 기출 체험판" 카드 1장(문서 N건, 만료 시 제외; trial.js 의 meta 형태를 hyunhak-api/src/trial.js 에서 확인) · D1·D2·D3 어휘 · R1-05 .sr-ops .tlink min-height 40px · R1-07 summary 표식 · R3-A11Y-05 체크박스·닫기 44px · R4-CTA-04 href terms.html#art6 (G4 가 id 를 단다) + target=_blank · R4-MYLEC-LABEL 버튼 "강의 목록" · C12 빈 상태 korea-hum 하드코딩 제거.
보류(큐): R4-01(PDF 발급=제공 개시 정책), NAV-02(nav 셸 교체), R3-NAV-04(바닥글).

## G2 assets/owned.js (16건)
필수: studioGo 가 `el.dataset.view` 를 body.view 로 실음(G1 계약) + JS-6 in-flight 플래그(pending 이면 return) + `<a>` 에도 aria-busy · R3-NAV-01/02/R3-2/R4-CLASSROOM-SELFLINK/owned-block-self-links 현재 경로와 같은 목적지 행은 버튼 대신 앵커("아래 목록에서 보기" → 같은 면의 목록 id, 없으면 버튼 생략) · R4-CONTRACT-1 meta.trial download 권리는 "2026 기출 체험판, 열람 중" 한 줄로 접고 slug 를 상품명으로 띄우지 않음 · R4-04 전권 PDF 소장판 행(g.file 있으면 st 에 "PDF 소장판", op 에 마이페이지 내려받기 링크; g.view 비면 자료실 버튼 생략) · NAV-06 링크 my.html#passList, 라벨 "마이페이지에서 PDF 내려받기" · R2-JS-04 applyEntry `if(o.error) return;` 선행 · NAV-01/JS-3 게스트 next = `'/'+pathname` 루트 상대(login.html safeNext 의 `^/` 분기 확인) · R3-3 400px 이하 SHOW=2 · R2-04 낱권 2편 이상 단위 카드 = 첫 편 버튼 + "보유 지문 N편, 마이페이지에서 고르기" tlink(my.html#passList) · D1·D3·D4 어휘 · JS-4 살아 있는 권리 있는 회원의 [data-owned-entry] = href '#ownedT' 로 바꾸고 `data-owned-scroll="1"` 표식(G4 의 studio.html 핸들러가 이 표식이면 studioGo 대신 스크롤) · 새 `HH.ownedApplySetTable(root)` 신설: `#setRows tr[data-set]` 의 담기 버튼을 o.sets[set] 또는 단위 전권이 덮는 세트면 "보유 중" + goBtn(data-set-id) 로 교체(R2-03; studio.html 이 호출).

## G3 library.html + pastexam.html + assets/pastexam.js (10건)
필수: JS-R3-02 library.html:370 `st.error` 3분기(오류 = 안내 + reader.html 로 보내 서버 판정) · JS-R3-03 pastexam.js who.error 분기(비회원 문안 대신 "상태를 지금 확인할 수 없습니다. 다시 시도" + 목록 버튼은 reader.html 로) · NAV-01/R4-COPY-02/R3-L1-LIB-38 facts "38" → "31" (라벨 유지) · R4-NAV-01 열람 방식 상자의 로그인 버튼에 `data-owned-guest-only` 를 달고 G2 mount 가 회원이면 hidden 처리(G2 계약: owned.js 는 `[data-owned-guest-only]` 를 member 면 hidden) · NAV-06 31행 열람 버튼 aria-label="<대학명> 열람하기" + pastexam.js 목록 버튼도 · R4-TERM-03 "구매"/"상품 안내" → "상품 안내" 통일 · D1 어휘(data-readonly-note 두 문장의 "MY 이용권" → "마이페이지 이용권").
보류: R3-L1-OT-DURATION/R4-OT-LENGTH(10분 vs 5분 실길이 미상 → 큐).

## G4 studio.html + index.html + _tools/r2_copy.json + faq.html + privacy.html + login.html + terms.html + reader.html + classroom 은 G5 (정적 잡면)
필수: C11(D5) r2_copy.json studio_room_lead/studio_card_1 류 "기출 제시문" → "기출 규격 제시문" + index.html 같은 span 손편집 + `python3 _tools/build_programs.py` 재생성(다른 programs/*.html 회귀는 `git show HEAD:` 로 되돌리기, 앞선 S-4 방식) · NAV-03 studio.html 의 programs/studio.html 탭 aria-current/on 제거 · JS-4 studio.html:548 핸들러: `this.dataset.ownedScroll` 이면 `#ownedT` 로 스크롤(preventDefault) 아니면 studioGo · R2-03 studio.html 세트 표 렌더 뒤 `HH.ownedApplySetTable && HH.ownedApplySetTable()` 호출(더 보기·필터 재렌더 자리마다) · copy-lecture-validity-start-date studio.html:229 "구매일부터"→"지급일부터"(D6) · NAV-02 index.html:195~203 죽은 #heroTrial 핸들러 삭제 · D1 어휘(studio.html 04 "MY 내 강의"→"마이페이지 내 강의", r2_copy flow_4 도) · C4 faq.html:146 첨삭 위치 문장 = "리포트는 채점 뒤 스튜디오 앱에서 열리고, 점수는 마이페이지 응시 기록에, 영상과 첨삭은 스튜디오 내 기록에 90일 동안 남습니다." · R2-API-02 privacy.html:184 탈퇴 문면을 faq.html:189 와 같게(이메일 요청) · R3-API-03 login.html:115 "로그인 유지" 체크박스 제거(서버가 항상 30일) · R4-CTA-04 terms.html 제6조에 id="art6" · NAV-05 reader.html #bar 에 "자료실로" 링크(href=library.html) · NAV-05(index.html:92) 대학 찾기 탭: 판매 중 필터가 전체와 같으므로 탭 2개 중 "가이드북 판매 중" 탭 제거(단순화) 또는 role 정리 중 하나.
FAQ JSON-LD 는 `python3 _tools/seo_inject.py --only <면>` 으로 재생성(손편집 금지). 
보류: R3-API-01/02 pay_done(API 계약), 

## G5 _tools/build_lectures.py (+재생성) — lectures.html·classroom.html·lectures/*.html 원천
필수: R3-L1-OT-DEAD/R4-OT-DEAD-PROMISE 먼저 실측(classroom.html 의 OT 영상 블록이 비회원 분기에만 있고 회원에겐 빈 화면인지; 영상 파일이 실재하는지). 사실이면 "인강실에서 OT 보기"/"회원 무료 0강"/"무료로 봅니다" 문안을 "OT 대본 PDF 제공, 영상은 준비 중" 으로 내리고 classroom 링크 CTA 를 뺀다 · D6 "구매일부터 3개월 시청" → "지급일부터 3개월 시청" · NAV-04/R3-NAV-03 classroom.html 헤더·모바일 nav 의 lectures.html 링크 aria-current="page" 제거(.on 은 유지) · R4-TAP-05 강좌 카드 제목 링크 min-height var(--tap) · D1 어휘(OT 문장 "마이페이지 이용권" 은 이미 그 표현). 재생성 뒤 diff 가 기대 행만인지 확인.

## G6 assets/app.js + assets/lectures.js + assets/lecture.js + assets/reader.js
필수: JS-R4-02 HH.me() 오류 결과 미캐시 · JS-R4-04 app.js:198 promo id 대조 · JS-R4-03 lectures.js:140 recent = entitled && status==='ready' · R2-JS-02/R3-1 lectures.js:102 기출 해설 행 단위 역매핑(gichulOf) 없으면 studio.html#plans · JS-R4-01 lecture.js:510 loadedmetadata 일회 seek 해제(pendingSeek 변수) · R2-API-04 reader.js:182 403=block(d.error)·503=toast+재시도 · NAV-07 reader.js:571 복귀 링크 .btn 계열 48px + "자료실"→library.html / "마이페이지"→my.html · D3 어휘.
보류(API 필요): R2-JS-03·R4-03 만료 code 구분.

## G7 interview-studio web/index.html (31건) — 2단 순차. sets/·docs/ 의 미커밋 변경은 절대 손대지 않음
G7a (논리, 먼저): STUDIO-R2-01(P0 startRecording try/catch + 가시 오류) · STUDIO-R2-02(P0 POST 중 이동 잠금, 생성된 응시 폐기 금지, gen 바뀌면 "응시 1회가 사용되었습니다" 안내) · R1-03/ST-06 bridgeBound 이면 #chip-speed 와 데모 배속 prefrow 숨김 · R2-01/STUDIO-R2-05 history 입장 = 제목 "내 응시 기록", #setgrid 숨김, 세트 카드 핸들러 미부착, #btn-start 선두 가드 · R4-03 report fetch r.ok 검사(401=재입장 안내) · STUDIO-R2-03 403 외 409/401/404/500 detail.message 표시 · STUDIO-R2-04 업로드 실패 시 rec 상태 정지 표시 + 인라인 오류 · STUDIO-S3-03 finalizeAndReport gen·aid 캡처 가드 · R4-05 AudioContext 단일 재사용 + 오류 분기 · R4-06 startPrep 에서 #memo 초기화 · R4-08 loadUnivs 배열 보장 · ST-05 응시 종료 confirm("이 응시는 이미 1회 사용되었습니다. 나가면 답변이 사라집니다.") + prep/answer/analyze 활성 중 beforeunload · ST-08 타이머 wall-clock(deadline 기준, speedOn 은 배속 유지) · STUDIO-S3-02 transcript_scope==='full' 렌더 · STUDIO-S3-04 show() 에서 closeHistPlayer · STUDIO-S3-07 TERM 상수(bridgeBound ? '응시' : '연습')로 랭킹·브리핑 문안 포함 치환 · R2-06 history 빈 상태 문안.
G7b (표현, 다음): ST-03 `.btn[hidden]{display:none}` 일반화(기존 #btn-lecture 규칙 대체) · ST-02 .rpt-cta flex-wrap · ST-01 sticky 타이머 top = appbar 실높이(CSS 변수 + ResizeObserver) · ST-04 briefError scrollIntoView · R1-06/ST-09 .chip·#btn-exit min-height 40px, .switch 36px · R4-07/STUDIO-S3-05 400px 셀프뷰를 .recrow 옆 플렉스 아이템으로 · ST-07 채점 시간 문안 3~6분 통일 · STUDIO-R2-06 #alias/#aspiration aria-labelledby, mic/cam aria-label · STUDIO-S3-06 안내 문안 q.no 어휘 따라("문항 N번" 세트면 그대로) · R2-02 "이 기기에서만 처리됩니다" 3곳 → "답변 녹음과 녹화는 채점을 위해 스튜디오 서버로 전송되고, 응시일부터 90일 동안 내 기록에서만 다시 볼 수 있습니다."
각 단 끝: 인라인 JS node --check, `.venv/bin/python -m pytest -q` GREEN.

## G8 interview-studio/src/interview_studio/api.py (STUDIO-S3-01, P0) + 필요 시 bridge.py
history scope 토큰의 /api/sets 는 전 세트 전문을 돌려주면 안 된다. set_re 부재 = fail-closed(_DENY_ALL_RE) 또는 history scope 에서 /api/sets 를 빈 목록으로. 기존 테스트(test_bridge.py 등) 를 읽고 회귀 없이 통과시키며, history 케이스 테스트 1건 추가. `.venv/bin/python -m pytest -q` GREEN.

## 큐(결재)로 보내는 것 (수리 안 함)
- API P0: R3-API-01 가상계좌 새로고침 시 계좌 소실(pay.js 멱등 분기 vaccount) · R4-01(trial.js:170) 체험 redeem 멱등 키 jti → 2시간 무제한 · R3-API-02 은행명 · R2-JS-03/R4-03 만료 code · R3-API-04 summary hidden 집계 · R3-API-03 remember 쿠키(서버)
- 정책: R4-01(my.html:500) 세트 PDF 발급 = 청약철회 제한 근거인가(약관 vs support.js:155) · 데모 배속 칩 존치 범위 · 10분/5분 OT 길이 · MY nav 셸 교체
