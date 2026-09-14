# 8축 코드 교차검토 s3 r2 (2026-09-14 15:5x) — 구매한 회원의 이용 진입 UX, API P0 2건 + 계약 4건 + 약관 개시 시점 + 잔여 패치 7건

당신(gpt-6-astra)은 s2 에서 r1 NO-GO 9건 → r4 GO 로 닫았다. s3 는 s2 가 결재 큐로 보낸 것들의 집행분이다. 아래 diff 3개 리포(hyunhak-api, hyunhak-site, interview-studio)만 읽고 판정한다. 다른 파일을 열지 않는다.

## 이번 변경이 닫으려는 결함 (버그 스윕 2026-09-13 원장 id)
- R4-01 (P0, hyunhak-api trial.js): 무료 맛보기 1회가 2시간 무제한 — redeem 멱등 판정이 attempt_id(=토큰 jti, 수명 내 상수) 일치라 두 번째 응시도 already 통과. 수리 = UPDATE(소진)+INSERT(원장, changes()>0 결속) 한 batch, already 는 같은 ref 원장 실재만, 그 밖 409 code trial_used. bridge.py 는 안 바꿈 (409 → 기존 redeem_rejected 403 문안으로 학생에게 보임).
- R3-API-01 (P0, pay.js): 가상계좌 성공 화면 새로고침 시 계좌·기한 소실 — 멱등 재방문 분기와 GET /api/orders 에 vaccount 를 PG 주문 조회(adapter.getByOrder 정규형 virtualAccount)로 복구. 서버는 저장하지 않는다 (orders 열 없음, 원격 DDL 은 사람 집행 클래스). 조회 실패 = null, 사이트 pay_done.html 은 "주문 내역에서 확인" 폴백.
- R3-API-02 (P1): vaccount.bank 가 원시 bankCode 였음 → bankName() 이름 + bankCode 병기. pay_done.html 이 은행명을 계좌 앞에 그린다.
- R2-JS-03 / R4-03 (P1): 리더·인강 open 이 만료와 미구매를 같은 403 으로 뭉갬 → 서버 code expired + expires_at, 사이트 reader.js·lecture.js 가 갈라 적음.
- R3-API-04 (P2, lecture.js summary): total 이 hidden 을 셈 → where 초기값 status<>'hidden'.
- R3-API-03: 로그인 유지 체크박스는 s2 에서 사이트가 제거함 (API 변경 없음, 확인만).
- STUDIO-S3-01 API 분: history 토큰에 보유 권리(만료 포함) 허용 세트 합집합 + 맛보기 세트를 set_re 로 실음. 스튜디오 set_re_pattern 은 200자 초과 = fail-closed 라 접두어별 압축(historySetRe). 단위검사 6사례 len ≤176, 누락 0, 초과 0.
- OU-6(1) 결재 A: 세트 문제지·해설지 PDF 발급 = 제공 개시를 약관 제6조·checkout 고지·FAQ·고객센터·MY 환불 모달에 명시(서버 support.js 판정 유지). my.html 은 응시 0회 이용권의 PDF 버튼을 2단계(첫 클릭 = 경고 + 문구 교체, 둘째 클릭 = 발급)로.
- OU-7: 만료·무제목 이용권 카드 제목에 단위 라벨(HH.studioTitle 공유), 응시 기록 행 "리포트 다시 보기"(.hgo 위임), owned-note 6면 반복 → details(스튜디오 면만 open), MY 바닥글 고객센터·사업자 정보 링크 + #business-info, 같은 단위 낱권 다편 = owned-picks 목록(R2-04), 스튜디오 앱 :root 팔레트를 사이트 토큰으로 정렬.


## r1 판정과 처분 (당신의 r1 = NO-GO, real 5)
1. [보안] HIGH trial.js historySetRe 폴백 넓힘 → **수용·수리**: build(15)·build(1) 폐기. 번호 집합을 십의 자리 문자 클래스로 정확히 표현(넓힘 0)하고, 200자를 넘으면 보유 세트가 적은 접두어부터 빼는 fail-closed 절단(dropped 로그). 접두어 하나도 못 넣으면 set_re 없이(스튜디오 history = 세트 0). 단위검사 신설 `test/history_set_re.test.js` 7건(전권·흩어짐·범위 묶음·당신의 4접두어×15 사례 = 상한 안·미보유 허용 0·무작위 300건 넓힘 0) 7/7 ✔.
2. [경계] MEDIUM my.html 원장 실패 시 확인 단계 생략 → **수용·수리**: arm = `!expired && (noLedger || 미응시)`. 원장 없음 문안도 "두 번 눌러 받습니다"로.
3. [접근성] MEDIUM 경고 role/aria 부재 → **수용·수리**: #passList 앞에 미리 둔 `<p id="sdlLive" class="vh" role="status" aria-live="polite">` 를 갱신(50ms 뒤 텍스트 교체로 재알림)하고, 행의 .sr-warn 에 id 를 주어 버튼 `aria-describedby` 로 연결. base.css 에 `.vh` 일반 규칙(기존 .r2-maker .vh 와 같은 선언) 추가.
4. [계약] MEDIUM faq.html "응시를 시작하기 전이면" → **수용·수리**: 본문+JSON-LD 각 "응시를 시작하거나 세트 문제지나 해설지 PDF 를 발급받기 전이면". 같은 결의 "한 권이라도 열면 이용권 전체" 도 "열거나 지문 하나라도 응시하거나 세트 PDF 를 하나라도 발급받으면" 으로(본문+JSON-LD). my.html 환불 모달 ② 도 같은 문장으로.
5. [문안] MEDIUM "이 주문의 청약철회" → **수용·수리**: data-sdl-arm 값을 범위('school'|'passage')로 두고 경고를 "이 전권 이용권 전체" / "이 이용권" 으로 가른다. 전권 카드 안내문도 "이 전권 이용권 전체".
6. (r1 밖, 렌더가 잡음) 400px studio.html·programs/studio.html 가로 넘침 31px = 자리 없는 ul.owned-picks 가 .r3-unit grid 의 auto 열(번호)에 자동 배치되어 열이 344px 로 넓어지고 제목 열이 0 이 된 것. 수리 = `.r3-unit .owned-picks{grid-column:2/-1;grid-row:4}` + 카드 `.owned-multi` 표식으로 foot 를 한 행 아래(모바일 5/6행). 재렌더 68면 넘침 0.

## 검증 실측 (r2 시점)
- API: 전 스위트 156/156 (r1 시점) + history_set_re 7/7 + studio_ledger 10/10 재실행 ✔. 전 스위트는 배포 스크립트가 다시 돈다.
- 사이트: build_all 재실행, Playwright 68면 넘침 0·오류 0(guest 401 은 설계), owner studio.html picks 2행, my.html 2단계 버튼·경고·live 영역 프로브.

## 요청
r1 의 5건이 닫혔는지와, 수리가 새로 연 결함이 있는지를 같은 8축으로 본다. 특히:
1. historySetRe 새 판: numClass 의 십의 자리 클래스가 fullmatch 전제에서 정확히 보유 집합만 받는가(digitRuns 범위 표기, `0[1-9]`, 단일 번호). 절단 순서(보유 적은 접두어부터)와 dropped 로그가 회원 id 외 PII 를 남기지 않는가. 접두어 그룹 `(p1|p2)pat` 에서 접두어끼리 접두 관계(korea_2027_h 와 korea_gorun_2027_h)가 fullmatch 아래 새는 경로가 있는가.
2. my.html: noLedger 에서 arm 을 켜는 것이 응시한 회원에게 불필요한 경고를 보이는 정도(수용 가능한가), setTimeout 50ms live 갱신이 연속 클릭에서 꼬이는가, aria-describedby 대상 id 가 set_id 문자에서 안전한가(okSetId 통과 뒤 [^a-z0-9_] 제거).
3. base.css grid 자리: 데스크톱 rows `auto auto 1fr auto` 에서 ul 을 4행·foot 를 5행(암시적)으로 보낼 때 1fr 행(commerce)이 여전히 남은 높이를 먹어 foot 가 바닥에 붙는가. 모바일 5/6행도 같은가. picks 없는 카드는 영향 0 인가.
4. faq JSON-LD 와 본문, my.html 모달, 약관 제6조, checkout 고지가 이제 서로 같은 개시 기준을 말하는가.

출력: [축][real|nit] SEVERITY(HIGH/MEDIUM/LOW) 파일:행 — 한 줄 결함 + 한 줄 수정. real 만 세고 nit 는 뒤에. r1 5건 각각 "닫힘/미닫힘" 한 줄. 마지막 줄 "VERDICT: GO|NO-GO" 와 근거 1줄. 한국어, 24줄 상한.

## r1 당신의 판정 원문
```
[보안][real] HIGH `hyunhak-api/src/trial.js:46` — fallback이 history 권한을 확대한다. 첫 4접두어에 각각 01~15·02~16·03~17·04~18 보유 시 미보유 60세트까지 허용한다.  
수정: 허용 집합을 보존하는 압축만 사용하고, 표현이 불가능하면 소비자와 길이 상한·전달 계약을 함께 변경한다.  
[경계][real] MEDIUM `hyunhak-site/my.html:559,577` — 원장 조회 실패 시 `!noLedger`가 확인 단계를 꺼 미응시 이용권도 첫 클릭에 PDF가 발급된다.  
수정: 응시 여부가 불명확하면 2단계 확인을 유지한다.  
[접근성][real] MEDIUM `hyunhak-site/my.html:723` — 추가 경고에 알림 역할·버튼 설명 연결이 없어 스크린리더에 환불 제한 설명이 자동 전달되지 않는다.  
수정: 미리 마련한 `role="status"` 영역을 갱신하고 버튼의 `aria-describedby`로 연결한다.  
[계약][real] MEDIUM `hyunhak-site/faq.html:29` — JSON-LD에 “응시를 시작하기 전이면 … 청약철회”가 남아 PDF 발급 후 미응시자의 개시 기준과 충돌한다.  
수정: 해당 답변을 “응시·세트 PDF 발급 등 제공이 개시되기 전”으로 맞추고 본문도 동기화한다.  
[문안][real] MEDIUM `hyunhak-site/my.html:566,723` — “이 주문의 청약철회”는 약관의 해당 이용권보다 범위가 넓어 함께 구매한 미사용 상품까지 제한한다고 읽힌다.  
수정: “이 이용권”, 전권은 “이 전권 이용권 전체”로 바꾼다.  
집계: real 5건, nit 0건.  
동시성: 제시된 단일 grant 전제에서 batch와 `changes()` 결속은 성립하며 다른 ref 두 건의 원장 삽입 경로는 없다. [D1](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch), [SQLite](https://www.sqlite.org/c3ref/changes.html).  
정합성: NULL 우선·동일 형식 ISO의 최신 만료 정렬은 맞으며, 만료 조회는 본인 `member_id`로 제한된다. [정렬 규칙](https://www.sqlite.org/lang_select.html#orderby).  
경계: PG Promise rejection은 개별 `catch`가 흡수한다. `fullmatch` 전제에서 앵커 없는 소스 자체는 안전하다.  
회귀: `.hgo` 직접 결속은 비동기 행 생성 전에 실행되어 제시된 초기화 흐름에서는 이중 실행되지 않는다. summary의 hidden 제외도 일치한다.  
확인 한계: confirm 소유자 SQL·PortOne `paymentId` 결속·owned `bind` 정의는 diff에 없어 확정 검증할 수 없다.  
약관 제6조의 PDF 개시 항과 전권 전체 개시 항 자체는 서로 일치한다.  
근거: history 권한 확대와 PDF 확인 우회, 접근성·환불 고지 불일치 3건이 남아 있다.  
VERDICT: NO-GO
```

## diff — hyunhak-api (src/pay.js, src/trial.js, src/reader.js, src/lecture.js + 신설 test/history_set_re.test.js)
```diff
diff --git a/src/lecture.js b/src/lecture.js
index f91ca2d..d9dd7cd 100644
--- a/src/lecture.js
+++ b/src/lecture.js
@@ -137,18 +137,22 @@ function coversLecture(rows, lec) {
   }
   return false;
 }
-async function hasAccess(c, memberId, lec) {
-  if (lec.access === "member") return true;
+// 권리 행 (R4-03, 2026-09-14): includeExpired 면 만료된 권리도 찾는다 — open 이 "권리 없음"과 "기간 종료"를 가르는 데 쓴다.
+// 가장 늦게 끝나는 행 하나 (무기한 NULL 우선). hasAccess 는 이 행의 유효 여부다 (스트림·갱신·책갈피 재판정도 같은 함수).
+async function accessRow(c, memberId, lec, { includeExpired = false } = {}) {
+  if (lec.access === "member") return { expires_at: null };
   const row = await c.env.DB.prepare(
-    `SELECT 1 AS ok FROM lecture_access la JOIN entitlements e ON e.id = la.entitlement_id
-     WHERE e.member_id=? AND (e.expires_at IS NULL OR e.expires_at > ?)
+    `SELECT e.expires_at FROM lecture_access la JOIN entitlements e ON e.id = la.entitlement_id
+     WHERE e.member_id=? AND (${includeExpired ? "1=1" : "e.expires_at IS NULL OR e.expires_at > ?"})
        AND ( (la.scope='common'        AND ?='common')
           OR (la.scope='unit'          AND ?='unit'    AND la.unit_code=?)
           OR (la.scope='unit_passages' AND ?='passage' AND la.unit_code=?)
-          OR (la.scope='passage'       AND ?='passage' AND la.set_id=?) ) LIMIT 1`
-  ).bind(memberId, nowISO(), lec.kind, lec.kind, lec.unit_code || "", lec.kind, lec.unit_code || "", lec.kind, lec.passage_set_id || "").first();
-  return !!row;
+          OR (la.scope='passage'       AND ?='passage' AND la.set_id=?) )
+     ORDER BY (e.expires_at IS NULL) DESC, e.expires_at DESC LIMIT 1`
+  ).bind(...(includeExpired ? [memberId] : [memberId, nowISO()]), lec.kind, lec.kind, lec.unit_code || "", lec.kind, lec.unit_code || "", lec.kind, lec.passage_set_id || "").first();
+  return row || null;
 }
+async function hasAccess(c, memberId, lec) { return !!(await accessRow(c, memberId, lec)); }
 // 이어보기 지점: 완주했고 끝 근처면 처음부터
 function resumeOf(p, dur) {
   if (!p) return 0;
@@ -188,7 +192,8 @@ lecture.get("/lectures", requireMember(async (c) => {
 // 공개 요약 (SPEC §6 문구 3단 분기: N=0 준비 중 / 0<N<전체 순차 공개 / N=전체 전체 포함). hidden 은 ready 에서 제외
 lecture.get("/lectures/summary", async (c) => {
   const unit = c.req.query("unit") || null, set = c.req.query("set") || null, kind = c.req.query("kind") || null;
-  let where = "1=1"; const binds = [];
+  // hidden 은 total 에서도 뺀다 (R3-API-04): /api/lectures 및 /api/lectures/public 과 같은 모집단. 종전 total 이 hidden 을 세어 한 편만 숨겨도 "전편 공개"가 영영 안 떴다
+  let where = "status<>'hidden'"; const binds = [];
   if (unit) { where += " AND unit_code=?"; binds.push(unit); }
   if (set) { where += " AND passage_set_id=?"; binds.push(set); }
   if (kind) { where += " AND kind=?"; binds.push(kind); }
@@ -234,7 +239,12 @@ lecture.post("/lecture/open", requireMember(async (c) => {
   }
   const lec = await loadLecture(c, id);
   if (!lec || lec.status === "hidden") return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
-  if (!(await hasAccess(c, m.id, lec))) return c.json({ error: "이용권이 있는 회원만 시청할 수 있습니다" }, 403);
+  if (!(await hasAccess(c, m.id, lec))) {
+    // 만료는 "권리 없음"과 다른 사유 (R4-03): 계정 확인 문구와 구매 버튼 대신 기간 종료를 말해야 한다. 사이트 lecture.js 가 code 로 가른다
+    const past = await accessRow(c, m.id, lec, { includeExpired: true });
+    if (past) return c.json({ error: "인강 시청 기간이 끝났습니다", code: "expired", expires_at: past.expires_at }, 403);
+    return c.json({ error: "이용권이 있는 회원만 시청할 수 있습니다" }, 403);
+  }
   if (lec.status !== "ready" || !lec.r2_key)
     return c.json({ error: "영상을 준비하고 있습니다", status: "empty", has_script: !!lec.script_path }, 409);
   if (!(await rateLimit(c.env.DB, `lcopen:${m.id}`, 30, 3600)))
diff --git a/src/pay.js b/src/pay.js
index ec45eaa..693376f 100644
--- a/src/pay.js
+++ b/src/pay.js
@@ -9,6 +9,17 @@ import { report, fmt as tgFmt } from "./tg.js";
 import { pg, pgName } from "./pg/index.js";
 import { activePromo, salePrice } from "./promo.js";
 
+// 가상계좌 안내 복구 (R3-API-01·R3-API-02, 2026-09-14 OU-5 A): 서버는 계좌·기한을 저장하지 않는다 (orders 에 열이 없고 원격 DDL 은 건우 수동 집행 클래스).
+// 재방문(멱등 분기)과 주문 내역은 PG 주문 조회(adapter.getByOrder → 정규형 virtualAccount)로 같은 값을 다시 받는다. 조회 실패 = null (화면은 주문 내역 안내로 폴백).
+// 은행은 사람이 읽는 이름(bank)과 원시 코드(bankCode) 둘 다 싣는다 — 알림톡·TG 보고(bankName)와 같은 어휘. 종전 bank 는 원시 코드였다.
+export const vaccountView = (va) => va && (va.accountNumber || va.dueDate)
+  ? { bank: va.bankCode ? bankName(va.bankCode) : null, bankCode: va.bankCode || null, accountNumber: va.accountNumber || null, dueDate: va.dueDate || null }
+  : null;
+async function vaccountOf(adapter, env, orderId) {
+  const qd = await adapter.getByOrder(env, orderId).catch(() => null);
+  return vaccountView(qd?.virtualAccount);
+}
+
 const SHIP_FEE = 3000;
 const SHIP_FREE_OVER = 50000;
 // 지문 낱권 세트 id 형식, Global 5(PLAN s30). 서버 검증에 그대로 쓴다.
@@ -588,14 +599,15 @@ pay.post("/payments/confirm", requireMember(async (c) => {
     }
     return c.json({ error: "이미 결제된 주문입니다" }, 409);
   }
-  // 가상계좌 발급 후 성공 페이지 재방문 = 같은 안내 재반환 (입금 확정은 웹훅 몫)
+  const adapter = pg(c.env);
+  // 가상계좌 발급 후 성공 페이지 재방문 = 같은 안내 재반환 (입금 확정은 웹훅 몫). 계좌·기한도 PG 재조회로 다시 싣는다
+  // (R3-API-01: 새로고침하면 계좌·기한이 영영 사라지고, 휴대폰 없는 회원은 알림톡도 없어 어디에도 남지 않던 결함)
   if (order.status === "waiting_deposit" && sameRef(order.payment_key))
-    return c.json({ ok: true, status: "waiting_deposit", amount: order.amount });
+    return c.json({ ok: true, status: "waiting_deposit", amount: order.amount, vaccount: await vaccountOf(adapter, c.env, orderId) });
   if (order.status !== "pending") return c.json({ error: `승인 불가 상태입니다: ${order.status}` }, 409);
   // 금액 불일치 = 요청 거부만, 주문 상태는 건드리지 않음 (Codex 2차 #5: stale 탭이 주문을 죽이는 사고 차단)
   if (hasAmount && order.amount !== amount) return c.json({ error: "결제 금액이 주문 금액과 다릅니다" }, 400);
 
-  const adapter = pg(c.env);
   // 조회 검증, 상태만이 아니라 주문, 금액, 결제참조 3중 대조 (Codex 2차 #6)
   // status 는 호출부에서 판정 (DONE 승인 확인 / PARTIAL_CANCELED pending 고착 방지, Codex r4 NEW-B1 T2)
   const verifyByQuery = async () => {
@@ -655,7 +667,7 @@ pay.post("/payments/confirm", requireMember(async (c) => {
         report(c, "waiting_deposit", tgFmt.waitingDeposit(c.env, order, items, m, { bank: bankName(va.bankCode), due: fmtDue(va.dueDate) }), order.id);   // TG 운영 보고
       }
       return c.json({ ok: true, status: "waiting_deposit", amount: order.amount,
-        vaccount: { bank: va.bankCode || null, accountNumber: va.accountNumber || null, dueDate: va.dueDate || null } });
+        vaccount: vaccountView(va) || { bank: null, bankCode: null, accountNumber: null, dueDate: null } });
     }
     // 그 밖의 미확정 상태 = pending 유지 (웹훅, 재시도가 확정)
     return c.json({ error: `승인 상태가 확정되지 않았습니다: ${data.status || "unknown"}` }, 409);
@@ -856,5 +868,11 @@ pay.get("/orders", requireMember(async (c) => {
   ).bind(m.id).all()).results;
   for (const r of rows)
     r.items = (await c.env.DB.prepare("SELECT title, unit_price, qty FROM order_items WHERE order_id=?").bind(r.id).all()).results;
+  // 입금 대기 주문은 계좌·기한을 PG 조회로 복구해 MY 에서도 보인다 (R3-API-01). 대기 주문은 드물어 조회 수가 작다 (상한 5, 최신순)
+  const waiting = rows.filter((r) => r.status === "waiting_deposit").slice(0, 5);
+  if (waiting.length) {
+    const adapter = pg(c.env);
+    await Promise.all(waiting.map(async (r) => { r.vaccount = await vaccountOf(adapter, c.env, r.id); }));
+  }
   return c.json({ orders: rows });
 }));
diff --git a/src/reader.js b/src/reader.js
index aa91a2e..4ab334c 100644
--- a/src/reader.js
+++ b/src/reader.js
@@ -39,16 +39,20 @@ async function loadDoc(c, slug) {
   ).bind(slug).first();
   return f;
 }
-async function hasEntitlement(c, memberId, doc) {
-  if (doc.requires !== "entitled") return true;
-  // 만료된 권리는 무효 (Codex r2 M4: 종전엔 expires_at 을 보지 않았다)
-  // json_extract 정확 비교 — 종전 meta LIKE 는 '_' '%' 가 와일드카드로 읽혀 타 문서 권리가 오매칭됐다 (READER-FOLLOWUP 4)
-  // json_valid 가드 — 비정상 meta 한 행이 권리 확인 전체를 500 으로 만들지 않게 (Codex 후속 r1 #18)
-  const ent = await c.env.DB.prepare(
-    "SELECT id FROM entitlements WHERE member_id=? AND kind='download' AND json_valid(meta) AND json_extract(meta,'$.file_key')=? AND (expires_at IS NULL OR expires_at > ?)"
-  ).bind(memberId, doc.r2_key, nowISO()).first();
-  return !!ent;
+// 권리 상태 3분기 (R2-JS-03, 2026-09-14): 미구매 / 만료 / 유효. 만료를 미구매와 같은 403 으로 뭉개면 산 회원에게 "구매 후 열람" 이라고 말한다.
+// 가장 늦게 끝나는 권리 하나로 판정한다 (무기한 NULL 우선). 만료된 권리는 무효 (Codex r2 M4: 종전엔 expires_at 을 보지 않았다)
+// json_extract 정확 비교 — 종전 meta LIKE 는 '_' '%' 가 와일드카드로 읽혀 타 문서 권리가 오매칭됐다 (READER-FOLLOWUP 4)
+// json_valid 가드 — 비정상 meta 한 행이 권리 확인 전체를 500 으로 만들지 않게 (Codex 후속 r1 #18)
+async function entitlementState(c, memberId, doc) {
+  if (doc.requires !== "entitled") return { ok: true };
+  const row = await c.env.DB.prepare(
+    "SELECT expires_at FROM entitlements WHERE member_id=? AND kind='download' AND json_valid(meta) AND json_extract(meta,'$.file_key')=? ORDER BY (expires_at IS NULL) DESC, expires_at DESC LIMIT 1"
+  ).bind(memberId, doc.r2_key).first();
+  if (!row) return { ok: false };
+  if (row.expires_at && row.expires_at <= nowISO()) return { ok: false, code: "expired", expires_at: row.expires_at };
+  return { ok: true };
 }
+async function hasEntitlement(c, memberId, doc) { return (await entitlementState(c, memberId, doc)).ok; }
 
 // HMAC-SHA256 hex (리더 비밀 파생 키). 세션 지문, 질의 해시에 쓴다
 async function hmacHex(env, data) {
@@ -133,7 +137,11 @@ reader.post("/reader/open", requireMember(async (c) => {
     if (!exempt) return c.json({ error: "지원하지 않는 접속 환경입니다", code: "automation" }, 403);
   }
   if (!doc || !doc.enabled) return c.json({ error: "자료를 찾을 수 없습니다" }, 404);
-  if (!(await hasEntitlement(c, m.id, doc))) return c.json({ error: "구매 후 열람할 수 있는 자료입니다" }, 403);
+  // 만료는 미구매와 다른 사유 (R2-JS-03): code expired + 만료일. 사이트 reader.js 가 재구매 안내로 가른다
+  const est = await entitlementState(c, m.id, doc);
+  if (!est.ok) return c.json(est.code === "expired"
+    ? { error: "열람 기간이 끝난 자료입니다. 다시 구매하면 이어서 볼 수 있습니다", code: "expired", expires_at: est.expires_at }
+    : { error: "구매 후 열람할 수 있는 자료입니다" }, 403);
   // 발급 레이트리밋 (Codex 축1: 무한 재발급 방어)
   if (!(await rateLimit(c.env.DB, `rdopen:${m.id}`, 30, 3600)))
     return c.json({ error: "잠시 후 다시 시도해 주세요" }, 429);
diff --git a/src/trial.js b/src/trial.js
index ea36e83..70ce1bb 100644
--- a/src/trial.js
+++ b/src/trial.js
@@ -20,6 +20,58 @@ export const TRIAL_SET_IDS = Object.freeze([
 for (const id of TRIAL_SET_IDS) if (!SET_ID_RE.test(id)) throw new Error(`TRIAL_SET_IDS 에 Global 5 정규식 밖 id: ${id}`);
 export const TRIAL_SET_RE = new RegExp(`^(${TRIAL_SET_IDS.join("|")})$`);   // id 는 [a-z0-9_] 뿐이라 이스케이프 불요
 
+// 기록 열람 토큰의 세트 범위 (STUDIO-S3-01 API 분, 2026-09-14): 스튜디오 set_re_pattern 은 200자 초과를 fail-closed(세트 0)로 보므로
+// 보유 세트 id 를 접두어별로 접어 짧게 만든다. 30개 전부 = (0[1-9]|[12][0-9]|30), 일부 = (07|12). 같은 번호 묶음의 접두어는 한 그룹.
+// 접두어 표는 pay.js SET_ID_RE 의 단위 접두어와 같다 (아래 자기검사가 어긋남을 기동 시점에 잡는다). 스튜디오는 fullmatch 라 앵커를 두지 않는다.
+const SET_PREFIXES = Object.freeze(["korea_2027_h", "korea_2027_s", "korea_gorun_2027_h", "korea_gorun_2027_s", "yonsei_2027_h", "yonsei_2027_s", "yonsei_intl_2027_i"]);
+for (const p of SET_PREFIXES) if (!SET_ID_RE.test(`${p}01`) || !SET_ID_RE.test(`${p}30`)) throw new Error(`SET_PREFIXES 에 Global 5 정규식 밖 접두어: ${p}`);
+const SET_NO_ALL = "(0[1-9]|[12][0-9]|30)";
+// 번호 집합 → 정확히 그 집합만 받는 정규식 조각 (넓힘 0). 십의 자리별 문자 클래스로 줄인다: {01,03,05,13,17} → (0[135]|1[37])
+function digitRuns(units) {   // ['1','2','3','5','7'] → '1-357'
+  let out = "", i = 0;
+  while (i < units.length) {
+    let j = i;
+    while (j + 1 < units.length && units[j + 1].charCodeAt(0) === units[j].charCodeAt(0) + 1) j++;
+    out += j - i >= 2 ? `${units[i]}-${units[j]}` : units.slice(i, j + 1).join("");
+    i = j + 1;
+  }
+  return out;
+}
+function numClass(set) {   // set = Set<"01".."30">
+  if (set.size === 30) return SET_NO_ALL;
+  const byTens = new Map();
+  for (const no of [...set].sort()) { if (!byTens.has(no[0])) byTens.set(no[0], []); byTens.get(no[0]).push(no[1]); }
+  const alts = [];
+  for (const [t, units] of byTens) {
+    const full = t === "0" ? 9 : t === "3" ? 1 : 10;
+    if (units.length === 1) alts.push(t + units[0]);
+    else if (units.length === full) alts.push(t === "0" ? "0[1-9]" : `${t}[0-9]`);
+    else alts.push(`${t}[${digitRuns(units)}]`);
+  }
+  return alts.length === 1 ? alts[0] : `(${alts.join("|")})`;
+}
+// 상한 안에서 보유 집합을 정확히 표현한다. 넘치면 넓히지 않고 보유 세트가 적은 접두어부터 뺀다 (fail-closed: 기록 화면에서 그 단위만 안 보이고
+// 남의 세트는 열리지 않는다. 종전 build(15)·build(1) 폴백은 미보유 세트를 허용해 astra s3 r1 HIGH). dropped = 뺀 접두어.
+export function historySetReDetail(res, { maxLen = 200 } = {}) {
+  const nums = new Map();   // 접두어 → Set(번호 2자리)
+  for (const p of SET_PREFIXES) for (let n = 1; n <= 30; n++) {
+    const no = String(n).padStart(2, "0");
+    if (res.some((re) => re.test(`${p}${no}`))) { if (!nums.has(p)) nums.set(p, new Set()); nums.get(p).add(no); }
+  }
+  if (!nums.size) return { src: null, dropped: [] };
+  const order = [...nums].sort((a, b) => b[1].size - a[1].size || (a[0] < b[0] ? -1 : 1));
+  const build = (entries) => {
+    const groups = new Map();   // 번호 패턴 → [접두어]
+    for (const [p, set] of entries) { const pat = numClass(set); if (!groups.has(pat)) groups.set(pat, []); groups.get(pat).push(p); }
+    return [...groups].map(([pat, ps]) => `${ps.length > 1 ? `(${ps.join("|")})` : ps[0]}${pat}`).join("|");
+  };
+  let keep = order, src = build(keep);
+  while (src.length > maxLen && keep.length > 1) { keep = keep.slice(0, -1); src = build(keep); }
+  if (src.length > maxLen) return { src: null, dropped: order.map(([p]) => p) };   // 접두어 하나도 안 들어가면 set_re 없이 = 스튜디오 fail-closed 세트 0
+  return { src, dropped: order.slice(keep.length).map(([p]) => p) };
+}
+export function historySetRe(res, opts) { return historySetReDetail(res, opts).src; }
+
 // 권리 id 형식 (ent_… 구매 지급, entq_… QA seed, ent_ldg_… 테스트). 카드가 보낸 값은 이 형식일 때만 질의에 쓴다.
 const ENT_ID_RE = /^ent[A-Za-z0-9_]{1,80}$/;
 // 단위 대조 거부 응답 (HSE-1). unit_unknown = 권리 자체에 허용 세트가 없다 (미래캠·미분류·결속 없는 낱권, fail closed).
@@ -57,8 +109,15 @@ trial.post("/studio/token", requireMember(async (c) => {
   // 0) 응시 기록 열람 토큰 (2026-09-07): 이용권·맛보기가 없어도(다 쓴 회원도) 본인 응시 기록은 본다.
   // scope history 는 스튜디오에서 응시 생성(POST /api/attempts)이 막힌다 (bridge.py 게이트). 권리를 고르지 않으므로 소진도 없다.
   if (!!body && typeof body === "object" && body.view === "history") {
+    // 보유 권리(만료분 포함)의 허용 세트 합집합 + 맛보기 세트 (STUDIO-S3-01 API 분, 2026-09-14): 스튜디오는 history 토큰의 set_re 로 /api/sets 를
+    // 자르고 set_re 부재는 fail-closed(세트 0)라, 기록 화면이 응시한 세트를 그리려면 그 회원의 범위를 실어야 한다. 새 응시는 여전히 막힌다 (bridge.py 게이트).
+    const ents = (await c.env.DB.prepare("SELECT kind, meta FROM entitlements WHERE member_id=? AND kind IN ('studio_passage','studio_school')").bind(m.id).all()).results || [];
+    const res = ents.map(entSetRe).filter(Boolean);
+    if (await c.env.DB.prepare("SELECT 1 AS ok FROM trial_grants WHERE member_id=?").bind(m.id).first()) res.push(TRIAL_SET_RE);
+    const { src: setRe, dropped } = historySetReDetail(res);
+    if (dropped.length) console.warn(`history set_re 상한 초과로 접두어 제외 (fail-closed): member=${m.id} dropped=${dropped.join(",")}`);
     const token = await signToken(
-      { sub: m.id, name: m.name || "", scope: "history", jti: uid("jt"), iat: now, exp: now + 7200 },
+      { sub: m.id, name: m.name || "", scope: "history", ...(setRe ? { set_re: setRe } : {}), jti: uid("jt"), iat: now, exp: now + 7200 },
       c.env.STUDIO_BRIDGE_HMAC
     );
     return c.json({ url: `${c.env.STUDIO_ORIGIN}/?hh=${token}#history`, scope: "history" });
@@ -157,18 +216,22 @@ trial.post("/trial/redeem", async (c) => {
   if (p.kind === "trial") {
     // 원자 소비, used_at IS NULL + jti 정확 일치 (Codex 2차 #8: NULL 결속 해제 제거)
     if (!p.jti) return c.json({ error: "bad token" }, 400);
-    const ledger = c.env.DB.prepare(
-      "INSERT OR IGNORE INTO studio_attempts(ref,member_id,entitlement_id,kind,set_id,answer_mode,created_at) VALUES(?,?,NULL,'trial',?,?,?)"
-    ).bind(ref, p.sub, setId, mode, now);
-    const r = await c.env.DB.prepare(
-      "UPDATE trial_grants SET used_at=?, attempt_id=? WHERE member_id=? AND used_at IS NULL AND token_jti=?"
-    ).bind(now, String(p.attempt_id || ""), p.sub, p.jti).run();
-    if (r.meta.changes > 0) { await ledger.run(); return c.json({ ok: true }); }
-    const t = await c.env.DB.prepare("SELECT used_at, attempt_id FROM trial_grants WHERE member_id=?").bind(p.sub).first();
+    // 소진과 원장 행을 한 트랜잭션에 (R4-01, 2026-09-14): 원장 INSERT 는 직전 UPDATE 가 행을 바꿨을 때만 (changes() 결속, 유료 분기와 같은 패턴)
+    const rs = await c.env.DB.batch([
+      c.env.DB.prepare("UPDATE trial_grants SET used_at=?, attempt_id=? WHERE member_id=? AND used_at IS NULL AND token_jti=?")
+        .bind(now, String(p.attempt_id || ""), p.sub, p.jti),
+      c.env.DB.prepare(
+        "INSERT OR IGNORE INTO studio_attempts(ref,member_id,entitlement_id,kind,set_id,answer_mode,created_at) SELECT ?,?,NULL,'trial',?,?,? WHERE changes() > 0"
+      ).bind(ref, p.sub, setId, mode, now),
+    ]);
+    if (rs[0].meta.changes > 0) return c.json({ ok: true });
+    const t = await c.env.DB.prepare("SELECT used_at FROM trial_grants WHERE member_id=?").bind(p.sub).first();
     if (!t) return c.json({ error: "no grant" }, 404);
-    // 멱등 재시도는 같은 attempt 만 인정, 다른 attempt 의 재진입은 거부 (Codex 2차 #8)
-    if (t.used_at && t.attempt_id === String(p.attempt_id || "")) { await ledger.run(); return c.json({ ok: true, already: true }); }
-    return c.json({ error: "trial already used" }, 409);
+    // 멱등 재시도 = 같은 ref 가 원장에 실재할 때만 (유료 분기와 같은 판정). 종전 attempt_id 대조는 브리지가 attempt_id 에 토큰 jti(수명 내 상수)를
+    // 실어 항상 참이었고, 새 ref 의 두 번째 응시가 already 로 통과해 맛보기 1회가 2시간 무제한이 됐다 (버그 스윕 R4-01 P0, 2026-09-13)
+    const dup = await c.env.DB.prepare("SELECT 1 AS ok FROM studio_attempts WHERE ref=? AND member_id=? AND kind='trial'").bind(ref, p.sub).first();
+    if (dup) return c.json({ ok: true, already: true });
+    return c.json({ error: "무료 체험 응시 1회를 이미 사용하였습니다. 이용권 구매 후 이용해 주세요", code: "trial_used" }, 409);
   }
   if (p.kind === "entitlement" && p.ent) {
     const ent = await c.env.DB.prepare(
diff --git a/test/history_set_re.test.js b/test/history_set_re.test.js
new file mode 100644
index 0000000..607ed78
--- /dev/null
+++ b/test/history_set_re.test.js
@@ -0,0 +1,74 @@
+// history 토큰 set_re 압축 (2026-09-14 s3, astra r1 HIGH 수리): 보유 집합을 정확히 표현하고, 상한을 넘으면 넓히지 않고 접두어를 뺀다 (fail-closed).
+// 실행: node --test test/history_set_re.test.js (워커 기동 없음, 순수 함수)
+import { test } from "node:test";
+import assert from "node:assert/strict";
+import { historySetRe, historySetReDetail } from "../src/trial.js";
+
+const PREFIXES = ["korea_2027_h", "korea_2027_s", "korea_gorun_2027_h", "korea_gorun_2027_s", "yonsei_2027_h", "yonsei_2027_s", "yonsei_intl_2027_i"];
+const ALL_IDS = PREFIXES.flatMap((p) => Array.from({ length: 30 }, (_, i) => p + String(i + 1).padStart(2, "0")));
+const NON_IDS = ["korea_2027_h00", "korea_2027_h31", "korea_2027_h010", "xkorea_2027_h01", "korea_2027_h1", "korea_2027_h01x", ""];
+const ownedRe = (ids) => [new RegExp(`^(?:${ids.join("|")})$`)];
+const allowedBy = (src) => { const re = new RegExp(`^(?:${src})$`); return new Set([...ALL_IDS, ...NON_IDS].filter((id) => re.test(id))); };
+const nos = (from, step, count) => Array.from({ length: count }, (_, i) => String(from + i * step).padStart(2, "0"));
+function check(ids, { maxLen = 200 } = {}) {
+  const owned = new Set(ids);
+  const { src, dropped } = historySetReDetail(ownedRe(ids), { maxLen });
+  if (src === null) { assert.ok(dropped.length > 0 || !ids.length); return { src, dropped, allowed: new Set() }; }
+  assert.ok(src.length <= maxLen, `상한 초과 ${src.length}: ${src}`);
+  const allowed = allowedBy(src);
+  for (const id of allowed) assert.ok(owned.has(id), `미보유 세트 허용 (넓힘): ${id} ← ${src}`);
+  for (const id of owned) if (!dropped.some((p) => id.startsWith(p))) assert.ok(allowed.has(id), `보유 세트 누락 (좁힘): ${id} ← ${src}`);
+  return { src, dropped, allowed };
+}
+
+test("전권 하나 = 종전과 같은 30 전부 패턴", () => {
+  const { src } = check(nos(1, 1, 30).map((n) => "korea_2027_h" + n));
+  assert.equal(src, "korea_2027_h(0[1-9]|[12][0-9]|30)");
+});
+
+test("낱권 흩어짐 = 십의 자리 클래스로 정확히 그 집합만", () => {
+  const { src } = check(["korea_2027_h01", "korea_2027_h03", "korea_2027_h05", "korea_2027_h13", "korea_2027_h17", "yonsei_2027_s02"]);
+  assert.equal(src, "korea_2027_h(0[135]|1[37])|yonsei_2027_s02");
+});
+
+test("연속 번호는 범위로, 같은 패턴 접두어는 묶는다", () => {
+  const ids = [...nos(1, 1, 9).map((n) => "yonsei_2027_h" + n), ...nos(1, 1, 9).map((n) => "yonsei_2027_s" + n), "korea_2027_s21", "korea_2027_s22", "korea_2027_s23", "korea_2027_s25"];
+  const { src } = check(ids);
+  assert.equal(src, "(yonsei_2027_h|yonsei_2027_s)0[1-9]|korea_2027_s2[1-35]");
+});
+
+test("astra r1 사례: 4접두어 × 홀수 15편 = 상한 안, 미보유 60세트 허용 0", () => {
+  const ids = PREFIXES.slice(0, 4).flatMap((p) => nos(1, 2, 15).map((n) => p + n));
+  const { src, dropped, allowed } = check(ids);
+  assert.deepEqual(dropped, []);
+  assert.equal(allowed.size, 60);
+  assert.ok(!allowed.has("korea_2027_h02") && !allowed.has("korea_gorun_2027_s30"), src);
+});
+
+test("상한을 넘으면 넓히지 않고 보유가 적은 접두어부터 뺀다 (fail-closed)", () => {
+  // 접두어마다 다른 불규칙 집합 → 묶이지 않아 200자를 넘긴다
+  const ids = PREFIXES.flatMap((p, i) => nos(1 + (i % 3), 2, 13 + (i % 4)).filter((n) => Number(n) <= 30).map((n) => p + n));
+  const full = historySetReDetail(ownedRe(ids), { maxLen: 10_000 }).src;
+  assert.ok(full.length > 200, `사례가 상한을 못 넘김 ${full.length}`);
+  const { src, dropped, allowed } = check(ids);
+  assert.ok(dropped.length >= 1 && src.length <= 200);
+  for (const p of dropped) for (const id of ALL_IDS) if (id.startsWith(p)) assert.ok(!allowed.has(id), `뺀 접두어 세트 허용: ${id}`);
+  // 뺀 접두어의 보유 수 ≤ 남긴 접두어의 보유 수
+  const cnt = (p) => ids.filter((id) => id.startsWith(p)).length;
+  const keptMin = Math.min(...PREFIXES.filter((p) => !dropped.includes(p)).map(cnt));
+  for (const p of dropped) assert.ok(cnt(p) <= keptMin, `보유 많은 접두어를 뺌 ${p}`);
+});
+
+test("무작위 300건: 넓힘 0, 상한 안이면 좁힘 0", () => {
+  let seed = 20260914; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
+  for (let k = 0; k < 300; k++) {
+    const ids = ALL_IDS.filter(() => rnd() < (k % 5 === 0 ? 0.9 : 0.25));
+    if (!ids.length) continue;
+    check(ids);
+  }
+});
+
+test("보유 없음 = null (set_re 없이 = 스튜디오 fail-closed)", () => {
+  assert.equal(historySetRe([]), null);
+  assert.equal(historySetRe([/^nothing_matches$/]), null);
+});
```

## diff — hyunhak-site
```diff
diff --git a/assets/base.css b/assets/base.css
index 3eddfcd..2838271 100644
--- a/assets/base.css
+++ b/assets/base.css
@@ -1281,6 +1281,7 @@ html.ppop-open{overflow:hidden}
 :where(body.v2) .r2-maker .vcc[aria-pressed="true"]{background:var(--paper);color:var(--ink)}
 :where(body.v2) .r2-maker :is(.vpause,.vcc):focus-visible{outline-color:var(--paper)}
 :where(body.v2) .r2-maker .herofilm:not([data-playing-enabled]) :is(.vpause,.vcc){display:none}
+:where(body.v2) .vh{position:absolute;width:var(--line);height:var(--line);overflow:hidden;clip-path:inset(50%);white-space:nowrap}
 :where(body.v2) .r2-maker .vh{position:absolute;width:var(--line);height:var(--line);overflow:hidden;clip-path:inset(50%);white-space:nowrap}
 :where(body.v2) .r2-maker video::cue{background:var(--ink);color:var(--paper);font-size:var(--t-sm)}
 :where(body.v2) .r2-faq dt{font-size:var(--t-base);font-weight:700;margin-top:var(--s4)}
@@ -1505,6 +1506,18 @@ html.ppop-open{overflow:hidden}
 :where(body.v2) .r3-unit-badge.own{color:var(--ink);border-color:var(--ink);font-weight:600}   /* 朱印은 가격과 인장에만. 보유 배지는 먹 */
 :where(body.v2) .liblist .lf.own .own-tag{color:var(--ink);font-weight:600}
 :where(body.v2) .owned-h .tlink{color:var(--gray);font-weight:500;text-decoration-color:var(--hairs)}
+:where(body.v2) details.owned-note>summary{cursor:pointer;min-height:var(--tap);display:flex;align-items:center;font-weight:600;color:var(--body)}
+:where(body.v2) details.owned-note>p{margin:var(--s2) 0 0}
+:where(body.v2) .owned-picks{list-style:none;margin:var(--s3) 0 0;padding:0;display:grid;gap:var(--s2)}
+:where(body.v2) .owned-picks li{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--s2);font-size:var(--t-sm);color:var(--ink);word-break:keep-all}
+:where(body.v2) .owned-picks li .t{flex:1 1 160px;min-width:0}
+:where(body.v2) .owned-picks li .st{color:var(--gray)}
+:where(body.v2) .r3-unit .owned-picks{grid-column:2 / -1;grid-row:4;margin:0}   /* 단위 카드는 grid: 자리 없는 ul 이 auto 열(번호)에 들어가 열을 넓혀 제목 열이 0 이 됐다 (400px 넘침 31px, s3 렌더). 상단 헤더 열 아래, foot 위 */
+:where(body.v2) .r3-unit.owned-multi .foot{grid-row:5}
+@media(max-width:63.999em){
+  :where(body.v2) .r3-unit .owned-picks{grid-row:5}
+  :where(body.v2) .r3-unit.owned-multi .foot{grid-row:6}
+}
 :where(body.v2) .owned-more{margin-top:var(--s2)}
 :where(body.v2) .owned-more summary{cursor:pointer;min-height:var(--tap);display:flex;align-items:center;font-size:var(--t-sm);font-weight:600;color:var(--body)}
 :where(body.v2) .owned-more .owned-list li:first-child{border-top:0}
diff --git a/assets/lecture.js b/assets/lecture.js
index 6c6bc4d..0e7be4b 100644
--- a/assets/lecture.js
+++ b/assets/lecture.js
@@ -822,6 +822,8 @@
     apiFetch("/api/lecture/open", { method: "POST", body: JSON.stringify({ id: lectureId, sig: sig }) }).then(function (d) {
       if (d._status === 401) return loginRedirect();
       if (d._status === 403 && d.code === "automation") { block("지원하지 않는 접속 환경입니다.\n일반 브라우저에서 로그인 후 이용해 주세요."); return; }
+      // 만료는 "권리 없음"과 다른 사유 (R4-03): 계정 확인 문구와 구매 버튼 대신 기간 종료를 말한다. expires_at 은 서버 ISO, 숫자와 '-' 만 남긴다
+      if (d._status === 403 && d.code === "expired") return notice("인강 시청 기간이 끝났습니다", "이 강의의 시청 기간이 " + String(d.expires_at || "").slice(0, 10).replace(/[^0-9-]/g, "") + " 에 끝났습니다. 이용권을 다시 구매하면 이어서 볼 수 있고, 궁금한 점은 고객센터로 문의해 주세요.", '<a class="btn ghost sm" href="my.html">마이페이지 이용권</a><a class="btn ghost sm" href="support.html">고객센터</a>');
       if (d._status === 403) return notice("이용권이 있는 회원만 시청할 수 있습니다", "이 강의는 해당 지문 이용권이나 강의 상품에 포함됩니다. 구매한 계정으로 로그인했는지 확인해 주세요.", '<a class="btn sm" href="studio.html">제시문 면접 스튜디오 이용권</a><a class="btn ghost sm" href="lecture.html">내 강의</a>');
       if (d._status === 404) return notice("강의를 찾을 수 없습니다", "주소가 바뀌었거나 공개가 끝난 강의입니다.");
       if (d._status === 409) return notice("영상을 준비하고 있습니다", d.has_script ? "대본은 준비되었고 영상을 제작하는 중입니다. 공개되면 이 자리에서 바로 재생됩니다. 공개 일정은 확정되지 않았습니다." : "이 강의는 아직 제작 전입니다. 공개되면 이 자리에서 바로 재생됩니다.");
diff --git a/assets/owned.js b/assets/owned.js
index 57b01a9..68e6e3e 100644
--- a/assets/owned.js
+++ b/assets/owned.js
@@ -175,7 +175,7 @@
   }
 
   async function mount(el){
-    var pre=el.dataset.ownedPrefix||'', guest=el.dataset.ownedGuest||'line';
+    var pre=el.dataset.ownedPrefix||'', guest=el.dataset.ownedGuest||'line', here=selfFile();
     var o=await owned();
     // 비회원 전용 안내(자료실 열람 방식 상자의 로그인 버튼 등)는 회원에게 감춘다
     if(o.member) document.querySelectorAll('[data-owned-guest-only]').forEach(function(x){ x.hidden=true; });
@@ -196,8 +196,9 @@
     el.innerHTML='<section class="owned" aria-labelledby="ownedT"><div class="owned-h"><h2 id="ownedT">내가 산 것</h2><a class="tlink" href="'+pre+'my.html">마이페이지에서 전체 보기</a></div>'
       +'<ul class="owned-list">'+head+'</ul>'
       +(rest?'<details class="owned-more"><summary>나머지 '+(list.length-SHOW)+'개 펼치기</summary><ul class="owned-list">'+rest+'</ul></details>':'')
-      +(o.studio.some(live)?'<p class="owned-note">응시는 응시하러 가기, 세트 선택, 면접 시작 순서이고 제시문과 문제는 준비 화면에 나오므로 따로 풀어 올 자료가 없습니다. 답변은 그 화면에서 녹음과 녹화가 됩니다. 채점 뒤 점수는 마이페이지 응시 기록에, 해설 강의는 마이페이지 내 강의에 있습니다. 자료실의 가이드북과 기출 체험판은 읽는 자료이고 응시와 별개입니다.</p>'
-        :(o.trial&&!o.studio.some(live))?'<p class="owned-note">체험 응시도 같은 순서입니다. 체험 응시 버튼, 세트 선택, 면접 시작. 제시문과 문제는 준비 화면에 나오므로 따로 풀어 올 자료가 없고, 답변은 그 화면에서 녹음과 녹화가 됩니다. 자료실의 가이드북과 기출 체험판은 읽는 자료이고 응시와 별개입니다.</p>':'')
+      // 안내 문단은 6면에서 같은 글이 반복돼 접는다 (critic P2, OU-7). 구매가 일어나는 스튜디오 면만 펼친 채로, 그 밖은 요약 한 줄에서 펼친다
+      +(o.studio.some(live)?'<details class="owned-note"'+(here==='studio.html'?' open':'')+'><summary>응시 순서와 자료 구분</summary><p>응시는 응시하러 가기, 세트 선택, 면접 시작 순서이고 제시문과 문제는 준비 화면에 나오므로 따로 풀어 올 자료가 없습니다. 답변은 그 화면에서 녹음과 녹화가 됩니다. 채점 뒤 점수는 마이페이지 응시 기록에, 해설 강의는 마이페이지 내 강의에 있습니다. 자료실의 가이드북과 기출 체험판은 읽는 자료이고 응시와 별개입니다.</p></details>'
+        :(o.trial&&!o.studio.some(live))?'<details class="owned-note"'+(here==='studio.html'?' open':'')+'><summary>체험 응시 순서와 자료 구분</summary><p>체험 응시도 같은 순서입니다. 체험 응시 버튼, 세트 선택, 면접 시작. 제시문과 문제는 준비 화면에 나오므로 따로 풀어 올 자료가 없고, 답변은 그 화면에서 녹음과 녹화가 됩니다. 자료실의 가이드북과 기출 체험판은 읽는 자료이고 응시와 별개입니다.</p></details>':'')
       +'</section>';
     el.hidden=false;
     bind(el);
@@ -220,14 +221,13 @@
       foot.querySelectorAll('.btn:not(.ghost)').forEach(function(x){ x.classList.add('ghost'); });
       var tmp=document.createElement('div'); tmp.innerHTML=goBtn(school||passages[0]); var go=tmp.firstChild;
       if(school && buy) buy.remove();
-      foot.insertBefore(go, foot.firstChild);   // 응시가 1차 행동: foot 첫 자리, 채움 버튼은 이것 하나 (critic P1)
-      // 낱권을 두 편 이상 가진 단위에서 이 버튼은 첫 편만 연다. 나머지를 고를 자리를 같이 준다 (R2-04)
+      // 낱권을 두 편 이상 가진 단위: 버튼 하나는 첫 편만 열어 나머지가 안 보였다 (R2-04, OU-7 다편 UI). 편마다 제목·잔여·응시 버튼을 목록으로 그린다
       if(!school && passages.length>1){
-        var pick=document.createElement('a');
-        pick.className='tlink';
-        pick.href=prefix()+'my.html#passList';
-        pick.textContent='보유 지문 '+passages.length+'편, 마이페이지에서 고르기';
-        foot.insertBefore(pick, go.nextSibling);
+        var ul=document.createElement('ul'); ul.className='owned-picks'; card.classList.add('owned-multi');   // base.css 가 grid 자리를 준다 (foot 한 칸 아래로)
+        ul.innerHTML=passages.map(function(e){ return '<li><span class="t">'+esc(studioTitle(e))+(e.uses_left!=null?' <span class="st">잔여 응시 '+HH.intIn(e.uses_left,0,9999,0)+'회</span>':'')+'</span>'+goBtn(e,'btn ghost sm')+'</li>'; }).join('');
+        foot.parentNode.insertBefore(ul, foot);
+      } else {
+        foot.insertBefore(go, foot.firstChild);   // 응시가 1차 행동: foot 첫 자리, 채움 버튼은 이것 하나 (critic P1)
       }
     });
     bind(root);
@@ -289,4 +289,6 @@
     }).catch(function(){ mounts.forEach(function(el){ el.hidden=true; }); });
   });
   HH.owned=owned; HH.studioGo=studioGo; HH.ownedApplyUnits=applyUnits; HH.ownedApplySetTable=applySetTable; HH.ownedBind=bind;
+  // 이용권 제목 규칙 공유 (my.html 카드, OU-7): 제목 없는 권리는 단위 라벨 + 종류. _unit 이 없는 행(my.html 의 /api/entitlements 원행)은 여기서 역산한다
+  HH.studioTitle=function(e){ var x=Object.assign({},e); x._meta=x._meta||e.meta||{}; if(typeof x._meta==='string'){ try{ x._meta=JSON.parse(x._meta); }catch(err){ x._meta={}; } } if(!x._unit) x._unit=unitOfEnt(x); return studioTitle(x); };
 })();
diff --git a/assets/reader.js b/assets/reader.js
index 5a4183f..9bed38e 100644
--- a/assets/reader.js
+++ b/assets/reader.js
@@ -602,6 +602,8 @@
       return r.json().then(function (d) { d._status = r.status; return d; });
     }).then(function (d) {
       if (d._status === 403 && d.code === "automation") { block("지원하지 않는 접속 환경입니다.\n일반 브라우저에서 로그인 후 이용해 주세요."); return; }
+      // 만료는 미구매와 다른 사유 (R2-JS-03): 산 회원에게 "구매 후 열람" 이라고 말하지 않는다. 서버가 code expired + 만료일을 준다
+      if (d._status === 403 && d.code === "expired") { fail("열람 기간이 " + String(d.expires_at || "").slice(0, 10) + " 에 끝났습니다. 다시 구매하면 이어서 볼 수 있고, 주문 내역은 마이페이지에 남아 있습니다."); return; }
       if (d._status === 403) { fail("구매 후 열람할 수 있는 자료입니다."); return; }
       if (!d.token) { fail(String(d.error || "열 수 없습니다.")); return; }
       state.token = d.token; state.pages = d.pages; state.email = String(d.email || ""); state.exempt = !!d.exempt;
diff --git a/checkout.html b/checkout.html
index ffb46d3..626ae99 100644
--- a/checkout.html
+++ b/checkout.html
@@ -233,11 +233,12 @@
     제공이 개시된 후에는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항에 따라
     청약철회가 제한될 수 있습니다. 이 경우 가입, 구매 화면에 그 사실을 표시합니다.</li>
     <li>제공 개시 시점은 다음과 같습니다. 가이드북 열람 상품은 보안 리더에서 열람을 시작한 때,
-    PDF 소장판은 소장본 파일이 발급(내려받기)된 때, 스튜디오 이용권은 응시를 시작한 때입니다.
-    PDF 소장판은 파일 발급 후에는 청약철회가 제한됩니다.</li>
+    PDF 소장판은 소장본 파일이 발급(내려받기)된 때, 스튜디오 이용권은 응시를 시작한 때 또는
+    세트 문제지나 해설지 PDF 가 발급(내려받기)된 때입니다.
+    PDF 소장판과 세트 문제지, 해설지 PDF 는 파일 발급 후에는 청약철회가 제한됩니다.</li>
     <li>전권, 단위 전권처럼 여러 구성으로 이루어진 이용권은 구성 가운데 하나의 제공이 개시되면
     이용권 전체의 제공이 개시된 것으로 봅니다. 31권 전권은 한 권이라도 열람을 시작한 때,
-    스튜디오 단위 전권은 지문 하나라도 응시를 시작한 때입니다.</li>
+    스튜디오 단위 전권은 지문 하나라도 응시를 시작하거나 세트 문제지나 해설지 PDF 를 하나라도 발급받은 때입니다.</li>
     <li>출고 전 취소는 전액 환불합니다. 환불 대금은 청약철회일부터 3영업일 이내에 결제 수단으로 돌려드립니다.
     환급이 늦어지면 지연이자를 더해 지급합니다(「전자상거래 등에서의 소비자보호에 관한 법률」 제18조 제2항).</li>
   </ol>
@@ -616,7 +617,7 @@ document.addEventListener('DOMContentLoaded', async function(){
   $('#refundNote').textContent = '결제와 동시에 주문이 확정됩니다. '
     + (needShip ? '실물은 출고 전 취소 시 전액 환불되며, 출고 후에는 수령 7일 이내에 청약철회하실 수 있습니다(내용 확인을 위해 포장을 연 경우는 훼손으로 보지 않습니다). ' : '')
     + (hasDigital ? '디지털 상품(이용권, PDF)은 제공이 시작되기 전까지 취소할 수 있고, 제공이 시작된 뒤에는 청약철회가 제한됩니다(전자상거래법 제17조 제2항). '
-        + '제공 시작 시점은 가이드북 열람 상품은 보안 리더에서 열람을 시작한 때, PDF 소장판은 파일이 발급된 때, 스튜디오 이용권은 응시를 시작한 때입니다. ' : '')
+        + '제공 시작 시점은 가이드북 열람 상품은 보안 리더에서 열람을 시작한 때, PDF 소장판은 파일이 발급된 때, 스튜디오 이용권은 응시를 시작하거나 세트 문제지나 해설지 PDF 를 발급받은 때입니다. ' : '')
     + '전자상거래법의 청약철회 규정이 적용됩니다.';
   if(st.member.name && !$('#nm').value) $('#nm').value = st.member.name;
 
diff --git a/faq.html b/faq.html
index a0becd2..7e99d32 100644
--- a/faq.html
+++ b/faq.html
@@ -26,7 +26,7 @@
 <meta name="twitter:title" content="자주 묻는 질문, 현학적 연구소">
 <meta name="twitter:description" content="면접 준비(서류기반 면접과 제시문 면접, 면접 기출문제와 예상문제, 면접컨설팅과 모의면접), 가이드북 열람, 스튜디오 응시와 첨삭, 가격과 환불에 대한 답. 현학적 연구소 자주 묻는 질문.">
 <meta name="twitter:image" content="https://hyunhak.com/assets/photo/og_aigen.jpg">
-<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://hyunhak.com/#organization","name":"현학적 연구소","alternateName":"玄學的 硏究所","url":"https://hyunhak.com/","logo":{"@type":"ImageObject","url":"https://hyunhak.com/assets/photo/art_figure.png"},"email":"admin@hyunhak.com","telephone":"+82-70-8098-0671","taxID":"293-38-01827","address":{"@type":"PostalAddress","streetAddress":"테헤란로 70길 12, 402-941A호","addressLocality":"강남구","addressRegion":"서울특별시","addressCountry":"KR"},"founder":{"@id":"https://hyunhak.com/#author"},"sameAs":[]},{"@type":"Person","@id":"https://hyunhak.com/#author","name":"현건우","url":"https://hyunhak.com/about.html","worksFor":{"@id":"https://hyunhak.com/#organization"},"alternateName":"현학자","jobTitle":"입시 컨설턴트","description":"입시 컨설턴트 13년차. 대학별 서류기반면접 가이드북 31권과 연세대, 고려대 제시문 면접 스튜디오를 한 사람이 편집한다.","alumniOf":{"@type":"CollegeOrUniversity","name":"고려대학교"}},{"@type":"WebSite","@id":"https://hyunhak.com/#website","url":"https://hyunhak.com/","name":"현학적 연구소","alternateName":"玄學的 硏究所","publisher":{"@id":"https://hyunhak.com/#organization"},"inLanguage":"ko-KR"},{"@type":"BreadcrumbList","@id":"https://hyunhak.com/faq.html#breadcrumb","itemListElement":[{"@type":"ListItem","position":1,"name":"현학적 연구소","item":"https://hyunhak.com/"},{"@type":"ListItem","position":2,"name":"자주 묻는 질문","item":"https://hyunhak.com/faq.html"}]},{"@type":"WebPage","@id":"https://hyunhak.com/faq.html#webpage","url":"https://hyunhak.com/faq.html","name":"자주 묻는 질문, 현학적 연구소","description":"면접 준비(서류기반 면접과 제시문 면접, 면접 기출문제와 예상문제, 면접컨설팅과 모의면접), 가이드북 열람, 스튜디오 응시와 첨삭, 가격과 환불에 대한 답. 현학적 연구소 자주 묻는 질문.","isPartOf":{"@id":"https://hyunhak.com/#website"},"inLanguage":"ko-KR","primaryImageOfPage":{"@type":"ImageObject","url":"https://hyunhak.com/assets/photo/og_aigen.jpg"},"breadcrumb":{"@id":"https://hyunhak.com/faq.html#breadcrumb"},"author":{"@id":"https://hyunhak.com/#author"},"publisher":{"@id":"https://hyunhak.com/#organization"},"keywords":"대입 면접 준비, 서류기반 면접, 생기부 면접, 제시문 면접, 면접 기출문제, 면접 예상문제, 대입 면접컨설팅, 모의면접, 면접 가이드북, 제시문 면접 스튜디오"},{"@type":"FAQPage","@id":"https://hyunhak.com/faq.html#faq","mainEntity":[{"@type":"Question","name":"서류기반 면접과 제시문 면접은 무엇이 다릅니까","acceptedAnswer":{"@type":"Answer","text":"서류기반 면접은 내 생활기록부가 문제지라 생기부 면접, 학종 면접으로도 부릅니다. 제시문 면접은 면접장에서 받은 글과 발문이 문제지입니다. 어느 대학 어느 전형이 어느 쪽인지는 38개 대학 면접 형태 판정표 에서 확인합니다."}},{"@type":"Question","name":"생기부 면접은 어떻게 준비합니까","acceptedAnswer":{"@type":"Answer","text":"대학별 면접 가이드북 2027의 순서 그대로입니다. 1부 형태 판정, 2부 전형별 제원, 3부 면접 기출문제, 4부 내 생기부에서 예상 질문을 뽑는 전환 규칙, 5부 준비 전략."}},{"@type":"Question","name":"면접 기출문제는 어디에서 봅니까","acceptedAnswer":{"@type":"Answer","text":"가이드북 3부에 선배 후기에서 회수한 대학별 면접 기출문제가 유형별, 모집단위별로 실려 있습니다. 연세대와 고려대 2026 면접 기출은 기출 체험판 에서 48시간 무료로 봅니다."}},{"@type":"Question","name":"면접 예상문제는 어떻게 만듭니까","acceptedAnswer":{"@type":"Answer","text":"가이드북 4부의 전환 규칙이 내 생기부 기재를 면접 예상 질문으로 바꿉니다. 규칙마다 기재 조건과 실제 기출, 꼬리질문이 붙어 그대로 내 질문지가 됩니다."}},{"@type":"Question","name":"대입 면접컨설팅을 합니까","acceptedAnswer":{"@type":"Answer","text":"별도 1:1 면접컨설팅 상품은 없습니다. 서류기반 면접은 입시 컨설턴트 13년차가 편집한 대학별 가이드북으로 준비합니다. 제시문 면접은 스튜디오의 촬영 응시와 첨삭 세 단으로 준비합니다."}},{"@type":"Question","name":"모의면접을 볼 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"연세대와 고려대 제시문 면접은 스튜디오에서 실제 고사장 규격으로 촬영 응시하는 대입 모의면접입니다. 회원 체험 응시 1회는 무료입니다. 회차마다 전사, 진단, 재구성 첨삭이 붙습니다."}},{"@type":"Question","name":"서류기반면접 가이드북은 무엇을 담고 있습니까","acceptedAnswer":{"@type":"Answer","text":"학교 한 곳의 면접을 한 권으로 정리한 문서입니다. 전형별 면접 제원(실시 여부, 반영 비율, 시간, 형태), 질문 유형별 기출과 예상 질문, 답변 설계 순서가 들어 있습니다. 2027학년도 대비판이며 31개 대학이 있습니다."}},{"@type":"Question","name":"한 권은 어떻게 구성됩니까","acceptedAnswer":{"@type":"Answer","text":"다섯 부 구성. 1부 내 면접은 어느 형태인가, 2부 이 대학은 무엇을 묻는가, 3부 실제 질문, 4부 내 생기부에서 질문 뽑기와 전환 규칙, 5부 이 대학의 특징과 준비 전략입니다."}},{"@type":"Question","name":"몇 개 대학이 있습니까","acceptedAnswer":{"@type":"Answer","text":"31개 대학, 31권을 판매합니다. 대학이 추가되면 공지에 기록합니다."}},{"@type":"Question","name":"연세대와 고려대 가이드북은 왜 없습니까","acceptedAnswer":{"@type":"Answer","text":"두 대학은 2027 판이 없어 판매 목록에 없습니다. 연세대와 고려대 면접은 제시문 면접 스튜디오에서 준비합니다."}},{"@type":"Question","name":"가이드북은 어떻게 읽습니까","acceptedAnswer":{"@type":"Answer","text":"구매 후 회원 계정으로 사이트의 보안 리더에서 읽습니다. 원본 PDF 파일은 제공하지 않으며, 인쇄는 권당 3회까지 계정 정보가 찍힌 상태로 가능합니다."}},{"@type":"Question","name":"인쇄할 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"보안 리더에서 권당 3회까지 인쇄할 수 있습니다. 인쇄본에는 계정 정보가 담긴 복제 금지 워터마크가 자동으로 들어갑니다."}},{"@type":"Question","name":"가이드북은 언제 갱신됩니까","acceptedAnswer":{"@type":"Answer","text":"2027학년도 모집요강 공개분을 기준으로 편집하며 변경 사항과 갱신 내역은 공지에 기록합니다."}},{"@type":"Question","name":"전권 상품이 있습니까","acceptedAnswer":{"@type":"Answer","text":"31권 전권 열람권 511,500원과 전권 PDF 소장판 1,705,000원이 있습니다. 낱권 31권 합산 금액의 절반 값이며 열람권의 열람 기간은 구매일부터 3개월입니다."}},{"@type":"Question","name":"자료의 출처는 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"대학 모집요강, 선행학습영향평가 보고서, 시도 진로진학센터 자료집, 2016~2025 수험생 후기입니다. 페이지마다 (공식)과 (관측)을 구분해 표기하고, 출처 없는 질문은 싣지 않습니다."}},{"@type":"Question","name":"학생 개인정보가 들어 있지 않습니까","acceptedAnswer":{"@type":"Answer","text":"후기에서 수집한 질문은 개인 식별 정보를 제거한 뒤 수록합니다. 스튜디오 응시 영상은 본인 계정에서만 열람하며 외부에 공개하지 않습니다."}},{"@type":"Question","name":"제시문 면접 스튜디오는 어떤 서비스입니까","acceptedAnswer":{"@type":"Answer","text":"연세대, 고려대의 제시문 면접을 촬영 응시하고 첨삭받는 온라인 과정입니다. 지문 1편을 고르면 실제 고사장과 같은 규격으로 온라인 응시하고, 회차마다 말한 그대로의 전사, 오독과 비약 진단, 구술체 재구성 세 단의 첨삭이 붙습니다. 지문 1편에 5회까지 응시합니다."}},{"@type":"Question","name":"어느 대학 면접에 대응합니까","acceptedAnswer":{"@type":"Answer","text":"연세대 활동우수형 인문통합, 자연, 국제형과 고려대 계열적합전형 인문, 자연의 다섯 단위입니다. 단위마다 지문 30편, 모두 150세트입니다."}},{"@type":"Question","name":"응시는 어떻게 진행됩니까","acceptedAnswer":{"@type":"Answer","text":"세트를 고르고 준비 시간에 제시문과 발문을 읽은 뒤 전면 카메라로 답변을 촬영합니다. 연세대는 준비 8분과 답변 5분, 고려대는 준비 21분과 발화 7분 규격 그대로입니다."}},{"@type":"Question","name":"응시에 무엇이 필요합니까","acceptedAnswer":{"@type":"Answer","text":"카메라와 마이크가 있는 브라우저. 응시 시간은 대학 규격과 같고, 전면 카메라를 끄면 음성으로 기록됩니다."}},{"@type":"Question","name":"실전형과 연습형은 무엇이 다릅니까","acceptedAnswer":{"@type":"Answer","text":"실전형은 문항을 나누지 않고 한 번에 답하고 연습형은 문항마다 따로 답합니다. 한 지문에 5회까지 응시하며 막힌 문항만 연습형으로 다시 할 수 있습니다."}},{"@type":"Question","name":"지문 낱권과 단위 전권의 차이는 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"낱권은 지문 1편 33,000원이고 그 지문으로 5회 응시합니다. 전권은 응시 단위 1곳의 지문 30편 495,000원이며 지문마다 5회 응시, 응시 유효 기간은 구매일부터 3개월, 기간 안의 추가 지문이 포함됩니다. 세트별 풀이법 인강 30편과 공통 풀이 인강이 딸려 있고 인강 시청 기간은 3개월입니다. 낱권 33,000원 × 30편 = 990,000원이고 전권은 495,000원, 한 편에 16,500원 꼴입니다. 990,000원은 합산 금액이며 따로 파는 상품이 아닙니다. 낱권에도 그 세트 풀이법 인강 1편이 딸려 있고, 공통 풀이 인강만 따로는 220,000원입니다. 고려대는 인문과 자연 2단위, 연세대는 신촌 인문 통합, 자연, 국제 3단위입니다."}},{"@type":"Question","name":"첨삭은 무엇을 받습니까","acceptedAnswer":{"@type":"Answer","text":"회차마다 세 단이 붙습니다. 말한 그대로의 전사, 오독과 비약을 짚는 진단, 내 답변을 살려 다시 세운 구술체 재구성입니다. 리포트는 채점 뒤 스튜디오 앱에서 열리고, 점수는 마이페이지 응시 기록에, 영상과 첨삭은 스튜디오 내 기록에 90일 동안 남습니다."}},{"@type":"Question","name":"응시 영상은 어떻게 보관됩니까","acceptedAnswer":{"@type":"Answer","text":"응시 음성과 영상, 전사문은 채점과 첨삭에만 쓰고 응시일로부터 90일 후 파기합니다. 본인 계정에서만 다시 볼 수 있습니다."}},{"@type":"Question","name":"체험 응시가 있습니까","acceptedAnswer":{"@type":"Answer","text":"회원 가입 후 체험 응시 1회를 제공합니다. 스튜디오 페이지의 체험 응시 링크에서 시작합니다."}},{"@type":"Question","name":"인강은 어떤 종류가 있습니까","acceptedAnswer":{"@type":"Answer","text":"네 묶음입니다. 다섯 단위에 모두 걸리는 공통 풀이 인강 4편, 응시 단위마다 5편에서 9편인 단위 강의, 지문마다 1편씩 단위마다 30편인 세트 해설, 단위마다 1편인 2026 기출 해설입니다. 고려대 자연은 보충 해설 10편이 더 있습니다. 편수와 시간은 강좌 목록 에 열람 시점 값으로 표시됩니다."}},{"@type":"Question","name":"인강은 어디에서 봅니까","acceptedAnswer":{"@type":"Answer","text":"로그인한 뒤 인강실 에서 봅니다. 마이페이지의 내 강의에서도 들어갑니다. 시청 기간은 지급일부터 3개월이고 응시 이용 기간은 구매일부터 3개월입니다."}},{"@type":"Question","name":"인강만 따로 살 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"공통 풀이 인강만 따로는 220,000원이며 시청 3개월입니다. 단위 전권에는 이미 포함되어 있고 낱권에는 그 세트 풀이법 인강 1편이 딸려 있습니다."}},{"@type":"Question","name":"단위 전권을 사면 어떤 강의가 들어옵니까","acceptedAnswer":{"@type":"Answer","text":"그 단위의 단위 강의 전편과 세트 해설 30편, 공통 풀이 인강 4편, 그 대학 계열의 2026 기출 해설 1편이 인강실에 섭니다. 다른 단위의 강의는 들어오지 않습니다. 지문 낱권은 그 세트의 해설 1편만 들어옵니다."}},{"@type":"Question","name":"맛보기를 볼 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"강좌 상세 여섯 면마다 로그인 없이 보는 1분 15초 안팎의 발췌가 있고 자막이 붙어 있습니다. 절이 시작하는 자리에서 잘라 문장이 끊기지 않습니다. 로그인 전 인강실 화면에도 공통 풀이 맛보기가 있습니다."}},{"@type":"Question","name":"플레이어에는 어떤 기능이 있습니까","acceptedAnswer":{"@type":"Answer","text":"배속, 장별 목차, 책갈피, 이어보기가 있고 전편에 우리말 자막이 붙어 있습니다. 시청 위치는 계정에 저장되어 다른 기기에서 열어도 그 자리부터입니다. 화면의 흐린 글자는 계정 워터마크라 지울 수 없습니다."}},{"@type":"Question","name":"인강이 준비 중으로 표시됩니다","acceptedAnswer":{"@type":"Answer","text":"해설 강의는 공개되는 대로 순차 업로드되며 공개 편수는 열람 시점 기준으로 강좌 목록과 인강실에 표시됩니다. 공개되면 추가 비용 없이 같은 이용권으로 봅니다."}},{"@type":"Question","name":"인강 동시 시청 한도가 있습니까","acceptedAnswer":{"@type":"Answer","text":"계정당 3기기까지. 가이드북 열람과 같은 세션 한도입니다."}},{"@type":"Question","name":"결제 수단은 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"결제창에서 카드 결제(일시불)를 지원합니다. 계좌이체, 가상계좌, 간편결제, 할부는 10월 중 오픈 예정입니다. 결제 완료 즉시 이용권이 계정에 부여됩니다."}},{"@type":"Question","name":"결제는 어디에서 처리됩니까","acceptedAnswer":{"@type":"Answer","text":"포트원을 통한 KG이니시스와 NHN KCP 결제창에서 처리합니다. 결제수단 정보는 연구소가 보관하지 않고 결제대행사가 보관합니다."}},{"@type":"Question","name":"영수증은 어디에서 확인합니까","acceptedAnswer":{"@type":"Answer","text":"마이페이지 주문 내역의 영수증 링크. 결제 완료 주문에 붙습니다."}},{"@type":"Question","name":"결제 후 이용권은 언제 쓸 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"결제 완료 즉시 계정에 부여됩니다. 가이드북은 자료실에서 열람하고 스튜디오 이용권과 PDF 소장판은 마이페이지 이용권에서 바로 씁니다."}},{"@type":"Question","name":"환불은 어떻게 됩니까","acceptedAnswer":{"@type":"Answer","text":"가이드북과 인강, 면접 스튜디오는 디지털 콘텐츠입니다. 낱권으로 사신 권과 지문, 재생하지 않은 강의는 제공이 개시되기 전까지 청약철회하실 수 있습니다. 이미 연 권, 재생한 강의, 응시한 지문은 제공이 개시되어 전자상거래법 제17조 제2항 제5호에 따라 청약철회가 제한됩니다. 31권 전권과 단위 전권은 묶음 하나로 제공되기 때문에 한 권이라도 열람하거나 지문 하나라도 응시하면 이용권 전체의 청약철회가 제한됩니다. 표시 내용과 실제가 다른 경우에는 공급받은 날부터 3개월, 그 사실을 안 날부터 30일 이내에 청약철회하실 수 있습니다. 실물 배송 상품은 수령 후 7일 이내에 청약철회할 수 있습니다. 내용을 확인하려고 포장을 연 경우는 훼손으로 보지 않으며, 소비자 책임으로 상품이 멸실되거나 훼손된 경우 등 전자상거래법 제17조 제2항의 사유가 있으면 제한될 수 있습니다. 환불 대금은 청약철회일부터 3영업일 이내에 돌려드립니다."}},{"@type":"Question","name":"어떤 경우에 환불이 제한됩니까","acceptedAnswer":{"@type":"Answer","text":"이미 연 권, 재생한 강의, 응시한 지문, 발급된 PDF 소장판은 제공이 개시되어 단순 변심에 따른 청약철회가 제한됩니다(전자상거래법 제17조 제2항 제5호, 이용약관 제6조)."}},{"@type":"Question","name":"제공 개시 시점은 언제입니까","acceptedAnswer":{"@type":"Answer","text":"가이드북은 보안 리더에서 열람을 시작한 때. PDF 소장판은 파일이 발급된 때. 스튜디오는 응시를 시작한 때."}},{"@type":"Question","name":"열지 않은 상품은 언제까지 환불할 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"제공이 개시되기 전까지 청약철회하실 수 있고 그만큼 환불됩니다. 표시 내용과 실제가 다르거나 계약과 다르게 이행된 경우에는 공급받은 날부터 3개월, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내입니다."}},{"@type":"Question","name":"환불 대금은 언제 돌려받습니까","acceptedAnswer":{"@type":"Answer","text":"청약철회는 요청을 보내신 때에 효력이 생기며 연구소의 승인을 요건으로 하지 않습니다. 환불 대금은 청약철회일부터 3영업일 이내에 결제 수단으로 돌려드리고, 환급이 늦어지면 지연이자를 더해 지급합니다."}},{"@type":"Question","name":"환불 요청은 어디에서 합니까","acceptedAnswer":{"@type":"Answer","text":"마이페이지 주문 내역에서 결제 완료 주문의 환불 요청을 누르면 청약철회할 수 있는 상품과 금액이 표시됩니다. 사유를 적어 보내면 접수되고 접수 상태는 같은 자리에 배지로 표시됩니다."}},{"@type":"Question","name":"여러 권을 함께 샀는데 일부만 열었습니다","acceptedAnswer":{"@type":"Answer","text":"낱권으로 여러 권을 사신 경우에는 열지 않은 권만 환불됩니다. 31권 전권과 단위 전권은 묶음 하나라서 한 권이라도 열면 이용권 전체의 청약철회가 제한됩니다."}},{"@type":"Question","name":"여러 기기에서 볼 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"같은 계정으로 로그인한 기기에서 열람합니다. 열람 기록은 계정 단위로 남으며, 계정 공유는 이용약관 위반입니다."}},{"@type":"Question","name":"열람 기간은 얼마입니까","acceptedAnswer":{"@type":"Answer","text":"가이드북 열람은 구매일부터 3개월. 스튜디오 응시 이용권은 구매일부터 3개월이고 인강 시청은 3개월입니다. 응시를 시작하기 전이면 응시 기간이 지났더라도 청약철회할 수 있습니다."}},{"@type":"Question","name":"동시에 몇 대까지 열 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"동시 열람은 계정당 3개 세션까지. 초과하면 가장 오래된 세션이 자동 종료되고 인강 동시 시청에도 같은 한도를 적용합니다."}},{"@type":"Question","name":"특정 기기에 묶입니까","acceptedAnswer":{"@type":"Answer","text":"기기 제한은 없습니다. 같은 계정으로 로그인한 브라우저에서 열람하며 동시 세션 3개 한도만 적용됩니다."}},{"@type":"Question","name":"화면 캡처나 녹화를 해도 됩니까","acceptedAnswer":{"@type":"Answer","text":"이용약관 제8조의2에 따라 화면 촬영, 캡처, 녹화, 자동화 수집은 금지됩니다. 확인되면 사전 통지 후 열람 제한이나 이용 정지가 될 수 있습니다."}},{"@type":"Question","name":"PDF 소장판은 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"가이드북을 파일로 발급받아 소장하는 상품입니다. 권당 110,000원이며 구매 계정 이메일과 시리얼이 새겨진 파일을 마이페이지 이용권에서 내려받습니다."}},{"@type":"Question","name":"열람권과 소장판은 무엇이 다릅니까","acceptedAnswer":{"@type":"Answer","text":"열람권 33,000원은 보안 리더에서 구매일부터 3개월 열람합니다. 소장판 110,000원은 파일을 발급받아 소장하며 보안 리더 열람 상품의 원본 파일은 따로 제공하지 않습니다."}},{"@type":"Question","name":"PDF 소장판도 환불이 됩니까","acceptedAnswer":{"@type":"Answer","text":"파일이 발급된 뒤에는 청약철회가 제한됩니다. 내려받기 전이라면 제공이 개시되기 전까지 청약철회하실 수 있습니다."}},{"@type":"Question","name":"전권 PDF 소장판은 얼마입니까","acceptedAnswer":{"@type":"Answer","text":"31권 전권 PDF 소장판은 1,705,000원입니다. 권당 110,000원의 31권 합산 3,410,000원의 절반 값이며 31권 파일 내려받기와 열람이 포함됩니다."}},{"@type":"Question","name":"간편 로그인은 무엇을 지원합니까","acceptedAnswer":{"@type":"Answer","text":"구글, 카카오, 네이버를 지원합니다. 제공사 등록 절차가 끝나는 대로 버튼이 열리며, 그 전까지는 이메일 가입으로 이용합니다."}},{"@type":"Question","name":"간편 로그인 계정도 비밀번호가 있습니까","acceptedAnswer":{"@type":"Answer","text":"간편 로그인 전용 계정은 비밀번호가 없습니다. 로그인은 간편 로그인으로 계속 이용합니다."}},{"@type":"Question","name":"비밀번호는 어떻게 바꿉니까","acceptedAnswer":{"@type":"Answer","text":"마이페이지 계정 정보에서 바꿉니다. 새 비밀번호는 10자 이상에 문자와 숫자를 포함하며 바꾸면 지금 이 기기 외의 로그인은 모두 풀립니다."}},{"@type":"Question","name":"가입 나이 제한이 있습니까","acceptedAnswer":{"@type":"Answer","text":"만 14세 이상. 만 14세 미만의 가입 신청은 승낙하지 않습니다."}},{"@type":"Question","name":"학생회원과 강사회원은 무엇이 다릅니까","acceptedAnswer":{"@type":"Answer","text":"가입 때 고른 회원 구분입니다. 학생회원은 학교와 학년을, 강사회원은 소속 학원을 적습니다. 가입 후 구분 변경은 admin@hyunhak.com 으로 문의합니다."}},{"@type":"Question","name":"광고성 정보 수신은 어떻게 해지합니까","acceptedAnswer":{"@type":"Answer","text":"마이페이지 수신 설정에서 언제든 해지합니다. 해지해도 이용에 제한이 없으며, 주문과 결제, 이용권 만료 안내는 수신 설정과 무관하게 보냅니다."}},{"@type":"Question","name":"회원 탈퇴는 어떻게 합니까","acceptedAnswer":{"@type":"Answer","text":"admin@hyunhak.com 으로 요청해 주세요. 탈퇴하면 계정 정보는 지체 없이 파기하고 결제 기록은 전자상거래법에 따라 5년 보관합니다."}},{"@type":"Question","name":"스쿨 플랜은 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"학원이 제시문 면접 스튜디오 좌석을 5개 이상 도입하는 플랜입니다. 강사 계정과 학생 리포트 관리가 포함되고 4좌석 이하는 개인 구매로 안내합니다."}},{"@type":"Question","name":"좌석 가격은 얼마입니까","acceptedAnswer":{"@type":"Answer","text":"1~5석째 315,000원, 6~10석째 285,000원, 11~20석째 260,000원, 21~40석째 240,000원이며 41석째부터는 별도 견적입니다. 부가세 포함이고 이미 산 좌석의 가격은 그대로입니다."}},{"@type":"Question","name":"스쿨 플랜 결제는 어떻게 합니까","acceptedAnswer":{"@type":"Answer","text":"계약 후 계좌이체와 세금계산서, 100% 선결제. 입금 후 2영업일 안에 좌석을 지급합니다."}},{"@type":"Question","name":"좌석 이용 기간은 어떻게 됩니까","acceptedAnswer":{"@type":"Answer","text":"지급 즉시 시작해 해당 입시학년도 시즌 종료일(예: 2027년 2월 28일)에 전 좌석이 종료됩니다. 이월은 없고, 신규 계약은 매 시즌 12월 31일까지 받습니다."}},{"@type":"Question","name":"강사 계정은 무엇을 봅니까","acceptedAnswer":{"@type":"Answer","text":"배정 학생의 응시 진행과 잔여 횟수, 학생이 동의한 범위의 첨삭 리포트를 봅니다. 원본 음성과 영상은 제공하지 않으며 유효 좌석 5개당 1개가 무상입니다."}},{"@type":"Question","name":"스쿨 플랜 좌석은 환불됩니까","acceptedAnswer":{"@type":"Answer","text":"미배정 좌석은 지급 후 14일 이내 1회 반환할 수 있고 잔존 좌석을 정상 누진가로 다시 셈해 정산합니다. 응시를 시작한 좌석은 잔여 이용량 기준으로 정산합니다."}},{"@type":"Question","name":"현학적의 뜻이 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"검을 현 玄에 배울 학 學입니다. 『천자문』 첫 구절 天地玄黃의 그 글자이며, 아득히 깊은 배움이라는 뜻으로 씁니다. 사전의 衒學的(학식을 뽐냄)과는 다른 글자입니다."}},{"@type":"Question","name":"문의는 어디로 합니까","acceptedAnswer":{"@type":"Answer","text":"admin@hyunhak.com 앞으로 보내 주세요. 확인 후 답합니다."}},{"@type":"Question","name":"1:1 문의는 어디에서 합니까","acceptedAnswer":{"@type":"Answer","text":"고객센터의 1:1 문의에서 분류와 제목, 내용을 적어 보냅니다. 회원은 내 문의 목록에서 답변을 확인하고 비회원은 답변받을 이메일을 적어 보냅니다."}}]}]}</script>
+<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://hyunhak.com/#organization","name":"현학적 연구소","alternateName":"玄學的 硏究所","url":"https://hyunhak.com/","logo":{"@type":"ImageObject","url":"https://hyunhak.com/assets/photo/art_figure.png"},"email":"admin@hyunhak.com","telephone":"+82-70-8098-0671","taxID":"293-38-01827","address":{"@type":"PostalAddress","streetAddress":"테헤란로 70길 12, 402-941A호","addressLocality":"강남구","addressRegion":"서울특별시","addressCountry":"KR"},"founder":{"@id":"https://hyunhak.com/#author"},"sameAs":[]},{"@type":"Person","@id":"https://hyunhak.com/#author","name":"현건우","url":"https://hyunhak.com/about.html","worksFor":{"@id":"https://hyunhak.com/#organization"},"alternateName":"현학자","jobTitle":"입시 컨설턴트","description":"입시 컨설턴트 13년차. 대학별 서류기반면접 가이드북 31권과 연세대, 고려대 제시문 면접 스튜디오를 한 사람이 편집한다.","alumniOf":{"@type":"CollegeOrUniversity","name":"고려대학교"}},{"@type":"WebSite","@id":"https://hyunhak.com/#website","url":"https://hyunhak.com/","name":"현학적 연구소","alternateName":"玄學的 硏究所","publisher":{"@id":"https://hyunhak.com/#organization"},"inLanguage":"ko-KR"},{"@type":"BreadcrumbList","@id":"https://hyunhak.com/faq.html#breadcrumb","itemListElement":[{"@type":"ListItem","position":1,"name":"현학적 연구소","item":"https://hyunhak.com/"},{"@type":"ListItem","position":2,"name":"자주 묻는 질문","item":"https://hyunhak.com/faq.html"}]},{"@type":"WebPage","@id":"https://hyunhak.com/faq.html#webpage","url":"https://hyunhak.com/faq.html","name":"자주 묻는 질문, 현학적 연구소","description":"면접 준비(서류기반 면접과 제시문 면접, 면접 기출문제와 예상문제, 면접컨설팅과 모의면접), 가이드북 열람, 스튜디오 응시와 첨삭, 가격과 환불에 대한 답. 현학적 연구소 자주 묻는 질문.","isPartOf":{"@id":"https://hyunhak.com/#website"},"inLanguage":"ko-KR","primaryImageOfPage":{"@type":"ImageObject","url":"https://hyunhak.com/assets/photo/og_aigen.jpg"},"breadcrumb":{"@id":"https://hyunhak.com/faq.html#breadcrumb"},"author":{"@id":"https://hyunhak.com/#author"},"publisher":{"@id":"https://hyunhak.com/#organization"},"keywords":"대입 면접 준비, 서류기반 면접, 생기부 면접, 제시문 면접, 면접 기출문제, 면접 예상문제, 대입 면접컨설팅, 모의면접, 면접 가이드북, 제시문 면접 스튜디오"},{"@type":"FAQPage","@id":"https://hyunhak.com/faq.html#faq","mainEntity":[{"@type":"Question","name":"서류기반 면접과 제시문 면접은 무엇이 다릅니까","acceptedAnswer":{"@type":"Answer","text":"서류기반 면접은 내 생활기록부가 문제지라 생기부 면접, 학종 면접으로도 부릅니다. 제시문 면접은 면접장에서 받은 글과 발문이 문제지입니다. 어느 대학 어느 전형이 어느 쪽인지는 38개 대학 면접 형태 판정표 에서 확인합니다."}},{"@type":"Question","name":"생기부 면접은 어떻게 준비합니까","acceptedAnswer":{"@type":"Answer","text":"대학별 면접 가이드북 2027의 순서 그대로입니다. 1부 형태 판정, 2부 전형별 제원, 3부 면접 기출문제, 4부 내 생기부에서 예상 질문을 뽑는 전환 규칙, 5부 준비 전략."}},{"@type":"Question","name":"면접 기출문제는 어디에서 봅니까","acceptedAnswer":{"@type":"Answer","text":"가이드북 3부에 선배 후기에서 회수한 대학별 면접 기출문제가 유형별, 모집단위별로 실려 있습니다. 연세대와 고려대 2026 면접 기출은 기출 체험판 에서 48시간 무료로 봅니다."}},{"@type":"Question","name":"면접 예상문제는 어떻게 만듭니까","acceptedAnswer":{"@type":"Answer","text":"가이드북 4부의 전환 규칙이 내 생기부 기재를 면접 예상 질문으로 바꿉니다. 규칙마다 기재 조건과 실제 기출, 꼬리질문이 붙어 그대로 내 질문지가 됩니다."}},{"@type":"Question","name":"대입 면접컨설팅을 합니까","acceptedAnswer":{"@type":"Answer","text":"별도 1:1 면접컨설팅 상품은 없습니다. 서류기반 면접은 입시 컨설턴트 13년차가 편집한 대학별 가이드북으로 준비합니다. 제시문 면접은 스튜디오의 촬영 응시와 첨삭 세 단으로 준비합니다."}},{"@type":"Question","name":"모의면접을 볼 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"연세대와 고려대 제시문 면접은 스튜디오에서 실제 고사장 규격으로 촬영 응시하는 대입 모의면접입니다. 회원 체험 응시 1회는 무료입니다. 회차마다 전사, 진단, 재구성 첨삭이 붙습니다."}},{"@type":"Question","name":"서류기반면접 가이드북은 무엇을 담고 있습니까","acceptedAnswer":{"@type":"Answer","text":"학교 한 곳의 면접을 한 권으로 정리한 문서입니다. 전형별 면접 제원(실시 여부, 반영 비율, 시간, 형태), 질문 유형별 기출과 예상 질문, 답변 설계 순서가 들어 있습니다. 2027학년도 대비판이며 31개 대학이 있습니다."}},{"@type":"Question","name":"한 권은 어떻게 구성됩니까","acceptedAnswer":{"@type":"Answer","text":"다섯 부 구성. 1부 내 면접은 어느 형태인가, 2부 이 대학은 무엇을 묻는가, 3부 실제 질문, 4부 내 생기부에서 질문 뽑기와 전환 규칙, 5부 이 대학의 특징과 준비 전략입니다."}},{"@type":"Question","name":"몇 개 대학이 있습니까","acceptedAnswer":{"@type":"Answer","text":"31개 대학, 31권을 판매합니다. 대학이 추가되면 공지에 기록합니다."}},{"@type":"Question","name":"연세대와 고려대 가이드북은 왜 없습니까","acceptedAnswer":{"@type":"Answer","text":"두 대학은 2027 판이 없어 판매 목록에 없습니다. 연세대와 고려대 면접은 제시문 면접 스튜디오에서 준비합니다."}},{"@type":"Question","name":"가이드북은 어떻게 읽습니까","acceptedAnswer":{"@type":"Answer","text":"구매 후 회원 계정으로 사이트의 보안 리더에서 읽습니다. 원본 PDF 파일은 제공하지 않으며, 인쇄는 권당 3회까지 계정 정보가 찍힌 상태로 가능합니다."}},{"@type":"Question","name":"인쇄할 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"보안 리더에서 권당 3회까지 인쇄할 수 있습니다. 인쇄본에는 계정 정보가 담긴 복제 금지 워터마크가 자동으로 들어갑니다."}},{"@type":"Question","name":"가이드북은 언제 갱신됩니까","acceptedAnswer":{"@type":"Answer","text":"2027학년도 모집요강 공개분을 기준으로 편집하며 변경 사항과 갱신 내역은 공지에 기록합니다."}},{"@type":"Question","name":"전권 상품이 있습니까","acceptedAnswer":{"@type":"Answer","text":"31권 전권 열람권 511,500원과 전권 PDF 소장판 1,705,000원이 있습니다. 낱권 31권 합산 금액의 절반 값이며 열람권의 열람 기간은 구매일부터 3개월입니다."}},{"@type":"Question","name":"자료의 출처는 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"대학 모집요강, 선행학습영향평가 보고서, 시도 진로진학센터 자료집, 2016~2025 수험생 후기입니다. 페이지마다 (공식)과 (관측)을 구분해 표기하고, 출처 없는 질문은 싣지 않습니다."}},{"@type":"Question","name":"학생 개인정보가 들어 있지 않습니까","acceptedAnswer":{"@type":"Answer","text":"후기에서 수집한 질문은 개인 식별 정보를 제거한 뒤 수록합니다. 스튜디오 응시 영상은 본인 계정에서만 열람하며 외부에 공개하지 않습니다."}},{"@type":"Question","name":"제시문 면접 스튜디오는 어떤 서비스입니까","acceptedAnswer":{"@type":"Answer","text":"연세대, 고려대의 제시문 면접을 촬영 응시하고 첨삭받는 온라인 과정입니다. 지문 1편을 고르면 실제 고사장과 같은 규격으로 온라인 응시하고, 회차마다 말한 그대로의 전사, 오독과 비약 진단, 구술체 재구성 세 단의 첨삭이 붙습니다. 지문 1편에 5회까지 응시합니다."}},{"@type":"Question","name":"어느 대학 면접에 대응합니까","acceptedAnswer":{"@type":"Answer","text":"연세대 활동우수형 인문통합, 자연, 국제형과 고려대 계열적합전형 인문, 자연의 다섯 단위입니다. 단위마다 지문 30편, 모두 150세트입니다."}},{"@type":"Question","name":"응시는 어떻게 진행됩니까","acceptedAnswer":{"@type":"Answer","text":"세트를 고르고 준비 시간에 제시문과 발문을 읽은 뒤 전면 카메라로 답변을 촬영합니다. 연세대는 준비 8분과 답변 5분, 고려대는 준비 21분과 발화 7분 규격 그대로입니다."}},{"@type":"Question","name":"응시에 무엇이 필요합니까","acceptedAnswer":{"@type":"Answer","text":"카메라와 마이크가 있는 브라우저. 응시 시간은 대학 규격과 같고, 전면 카메라를 끄면 음성으로 기록됩니다."}},{"@type":"Question","name":"실전형과 연습형은 무엇이 다릅니까","acceptedAnswer":{"@type":"Answer","text":"실전형은 문항을 나누지 않고 한 번에 답하고 연습형은 문항마다 따로 답합니다. 한 지문에 5회까지 응시하며 막힌 문항만 연습형으로 다시 할 수 있습니다."}},{"@type":"Question","name":"지문 낱권과 단위 전권의 차이는 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"낱권은 지문 1편 33,000원이고 그 지문으로 5회 응시합니다. 전권은 응시 단위 1곳의 지문 30편 495,000원이며 지문마다 5회 응시, 응시 유효 기간은 구매일부터 3개월, 기간 안의 추가 지문이 포함됩니다. 세트별 풀이법 인강 30편과 공통 풀이 인강이 딸려 있고 인강 시청 기간은 3개월입니다. 낱권 33,000원 × 30편 = 990,000원이고 전권은 495,000원, 한 편에 16,500원 꼴입니다. 990,000원은 합산 금액이며 따로 파는 상품이 아닙니다. 낱권에도 그 세트 풀이법 인강 1편이 딸려 있고, 공통 풀이 인강만 따로는 220,000원입니다. 고려대는 인문과 자연 2단위, 연세대는 신촌 인문 통합, 자연, 국제 3단위입니다."}},{"@type":"Question","name":"첨삭은 무엇을 받습니까","acceptedAnswer":{"@type":"Answer","text":"회차마다 세 단이 붙습니다. 말한 그대로의 전사, 오독과 비약을 짚는 진단, 내 답변을 살려 다시 세운 구술체 재구성입니다. 리포트는 채점 뒤 스튜디오 앱에서 열리고, 점수는 마이페이지 응시 기록에, 영상과 첨삭은 스튜디오 내 기록에 90일 동안 남습니다."}},{"@type":"Question","name":"응시 영상은 어떻게 보관됩니까","acceptedAnswer":{"@type":"Answer","text":"응시 음성과 영상, 전사문은 채점과 첨삭에만 쓰고 응시일로부터 90일 후 파기합니다. 본인 계정에서만 다시 볼 수 있습니다."}},{"@type":"Question","name":"체험 응시가 있습니까","acceptedAnswer":{"@type":"Answer","text":"회원 가입 후 체험 응시 1회를 제공합니다. 스튜디오 페이지의 체험 응시 링크에서 시작합니다."}},{"@type":"Question","name":"인강은 어떤 종류가 있습니까","acceptedAnswer":{"@type":"Answer","text":"네 묶음입니다. 다섯 단위에 모두 걸리는 공통 풀이 인강 4편, 응시 단위마다 5편에서 9편인 단위 강의, 지문마다 1편씩 단위마다 30편인 세트 해설, 단위마다 1편인 2026 기출 해설입니다. 고려대 자연은 보충 해설 10편이 더 있습니다. 편수와 시간은 강좌 목록 에 열람 시점 값으로 표시됩니다."}},{"@type":"Question","name":"인강은 어디에서 봅니까","acceptedAnswer":{"@type":"Answer","text":"로그인한 뒤 인강실 에서 봅니다. 마이페이지의 내 강의에서도 들어갑니다. 시청 기간은 지급일부터 3개월이고 응시 이용 기간은 구매일부터 3개월입니다."}},{"@type":"Question","name":"인강만 따로 살 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"공통 풀이 인강만 따로는 220,000원이며 시청 3개월입니다. 단위 전권에는 이미 포함되어 있고 낱권에는 그 세트 풀이법 인강 1편이 딸려 있습니다."}},{"@type":"Question","name":"단위 전권을 사면 어떤 강의가 들어옵니까","acceptedAnswer":{"@type":"Answer","text":"그 단위의 단위 강의 전편과 세트 해설 30편, 공통 풀이 인강 4편, 그 대학 계열의 2026 기출 해설 1편이 인강실에 섭니다. 다른 단위의 강의는 들어오지 않습니다. 지문 낱권은 그 세트의 해설 1편만 들어옵니다."}},{"@type":"Question","name":"맛보기를 볼 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"강좌 상세 여섯 면마다 로그인 없이 보는 1분 15초 안팎의 발췌가 있고 자막이 붙어 있습니다. 절이 시작하는 자리에서 잘라 문장이 끊기지 않습니다. 로그인 전 인강실 화면에도 공통 풀이 맛보기가 있습니다."}},{"@type":"Question","name":"플레이어에는 어떤 기능이 있습니까","acceptedAnswer":{"@type":"Answer","text":"배속, 장별 목차, 책갈피, 이어보기가 있고 전편에 우리말 자막이 붙어 있습니다. 시청 위치는 계정에 저장되어 다른 기기에서 열어도 그 자리부터입니다. 화면의 흐린 글자는 계정 워터마크라 지울 수 없습니다."}},{"@type":"Question","name":"인강이 준비 중으로 표시됩니다","acceptedAnswer":{"@type":"Answer","text":"해설 강의는 공개되는 대로 순차 업로드되며 공개 편수는 열람 시점 기준으로 강좌 목록과 인강실에 표시됩니다. 공개되면 추가 비용 없이 같은 이용권으로 봅니다."}},{"@type":"Question","name":"인강 동시 시청 한도가 있습니까","acceptedAnswer":{"@type":"Answer","text":"계정당 3기기까지. 가이드북 열람과 같은 세션 한도입니다."}},{"@type":"Question","name":"결제 수단은 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"결제창에서 카드 결제(일시불)를 지원합니다. 계좌이체, 가상계좌, 간편결제, 할부는 10월 중 오픈 예정입니다. 결제 완료 즉시 이용권이 계정에 부여됩니다."}},{"@type":"Question","name":"결제는 어디에서 처리됩니까","acceptedAnswer":{"@type":"Answer","text":"포트원을 통한 KG이니시스와 NHN KCP 결제창에서 처리합니다. 결제수단 정보는 연구소가 보관하지 않고 결제대행사가 보관합니다."}},{"@type":"Question","name":"영수증은 어디에서 확인합니까","acceptedAnswer":{"@type":"Answer","text":"마이페이지 주문 내역의 영수증 링크. 결제 완료 주문에 붙습니다."}},{"@type":"Question","name":"결제 후 이용권은 언제 쓸 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"결제 완료 즉시 계정에 부여됩니다. 가이드북은 자료실에서 열람하고 스튜디오 이용권과 PDF 소장판은 마이페이지 이용권에서 바로 씁니다."}},{"@type":"Question","name":"환불은 어떻게 됩니까","acceptedAnswer":{"@type":"Answer","text":"가이드북과 인강, 면접 스튜디오는 디지털 콘텐츠입니다. 낱권으로 사신 권과 지문, 재생하지 않은 강의는 제공이 개시되기 전까지 청약철회하실 수 있습니다. 이미 연 권, 재생한 강의, 응시한 지문, 발급받은 세트 문제지나 해설지 PDF 는 제공이 개시되어 전자상거래법 제17조 제2항 제5호에 따라 청약철회가 제한됩니다. 31권 전권과 단위 전권은 묶음 하나로 제공되기 때문에 한 권이라도 열람하거나 지문 하나라도 응시하거나 세트 PDF 를 하나라도 발급받으면 이용권 전체의 청약철회가 제한됩니다. 표시 내용과 실제가 다른 경우에는 공급받은 날부터 3개월, 그 사실을 안 날부터 30일 이내에 청약철회하실 수 있습니다. 실물 배송 상품은 수령 후 7일 이내에 청약철회할 수 있습니다. 내용을 확인하려고 포장을 연 경우는 훼손으로 보지 않으며, 소비자 책임으로 상품이 멸실되거나 훼손된 경우 등 전자상거래법 제17조 제2항의 사유가 있으면 제한될 수 있습니다. 환불 대금은 청약철회일부터 3영업일 이내에 돌려드립니다."}},{"@type":"Question","name":"어떤 경우에 환불이 제한됩니까","acceptedAnswer":{"@type":"Answer","text":"이미 연 권, 재생한 강의, 응시한 지문, 발급된 PDF 소장판과 세트 문제지나 해설지 PDF 는 제공이 개시되어 단순 변심에 따른 청약철회가 제한됩니다(전자상거래법 제17조 제2항 제5호, 이용약관 제6조)."}},{"@type":"Question","name":"제공 개시 시점은 언제입니까","acceptedAnswer":{"@type":"Answer","text":"가이드북은 보안 리더에서 열람을 시작한 때. PDF 소장판은 파일이 발급된 때. 스튜디오는 응시를 시작한 때 또는 세트 문제지나 해설지 PDF 를 발급받은 때."}},{"@type":"Question","name":"열지 않은 상품은 언제까지 환불할 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"제공이 개시되기 전까지 청약철회하실 수 있고 그만큼 환불됩니다. 표시 내용과 실제가 다르거나 계약과 다르게 이행된 경우에는 공급받은 날부터 3개월, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내입니다."}},{"@type":"Question","name":"환불 대금은 언제 돌려받습니까","acceptedAnswer":{"@type":"Answer","text":"청약철회는 요청을 보내신 때에 효력이 생기며 연구소의 승인을 요건으로 하지 않습니다. 환불 대금은 청약철회일부터 3영업일 이내에 결제 수단으로 돌려드리고, 환급이 늦어지면 지연이자를 더해 지급합니다."}},{"@type":"Question","name":"환불 요청은 어디에서 합니까","acceptedAnswer":{"@type":"Answer","text":"마이페이지 주문 내역에서 결제 완료 주문의 환불 요청을 누르면 청약철회할 수 있는 상품과 금액이 표시됩니다. 사유를 적어 보내면 접수되고 접수 상태는 같은 자리에 배지로 표시됩니다."}},{"@type":"Question","name":"여러 권을 함께 샀는데 일부만 열었습니다","acceptedAnswer":{"@type":"Answer","text":"낱권으로 여러 권을 사신 경우에는 열지 않은 권만 환불됩니다. 31권 전권과 단위 전권은 묶음 하나라서 한 권이라도 열거나 지문 하나라도 응시하거나 세트 PDF 를 하나라도 발급받으면 이용권 전체의 청약철회가 제한됩니다."}},{"@type":"Question","name":"여러 기기에서 볼 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"같은 계정으로 로그인한 기기에서 열람합니다. 열람 기록은 계정 단위로 남으며, 계정 공유는 이용약관 위반입니다."}},{"@type":"Question","name":"열람 기간은 얼마입니까","acceptedAnswer":{"@type":"Answer","text":"가이드북 열람은 구매일부터 3개월. 스튜디오 응시 이용권은 구매일부터 3개월이고 인강 시청은 3개월입니다. 응시를 시작하거나 세트 문제지나 해설지 PDF 를 발급받기 전이면 응시 기간이 지났더라도 청약철회할 수 있습니다."}},{"@type":"Question","name":"동시에 몇 대까지 열 수 있습니까","acceptedAnswer":{"@type":"Answer","text":"동시 열람은 계정당 3개 세션까지. 초과하면 가장 오래된 세션이 자동 종료되고 인강 동시 시청에도 같은 한도를 적용합니다."}},{"@type":"Question","name":"특정 기기에 묶입니까","acceptedAnswer":{"@type":"Answer","text":"기기 제한은 없습니다. 같은 계정으로 로그인한 브라우저에서 열람하며 동시 세션 3개 한도만 적용됩니다."}},{"@type":"Question","name":"화면 캡처나 녹화를 해도 됩니까","acceptedAnswer":{"@type":"Answer","text":"이용약관 제8조의2에 따라 화면 촬영, 캡처, 녹화, 자동화 수집은 금지됩니다. 확인되면 사전 통지 후 열람 제한이나 이용 정지가 될 수 있습니다."}},{"@type":"Question","name":"PDF 소장판은 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"가이드북을 파일로 발급받아 소장하는 상품입니다. 권당 110,000원이며 구매 계정 이메일과 시리얼이 새겨진 파일을 마이페이지 이용권에서 내려받습니다."}},{"@type":"Question","name":"열람권과 소장판은 무엇이 다릅니까","acceptedAnswer":{"@type":"Answer","text":"열람권 33,000원은 보안 리더에서 구매일부터 3개월 열람합니다. 소장판 110,000원은 파일을 발급받아 소장하며 보안 리더 열람 상품의 원본 파일은 따로 제공하지 않습니다."}},{"@type":"Question","name":"PDF 소장판도 환불이 됩니까","acceptedAnswer":{"@type":"Answer","text":"파일이 발급된 뒤에는 청약철회가 제한됩니다. 내려받기 전이라면 제공이 개시되기 전까지 청약철회하실 수 있습니다."}},{"@type":"Question","name":"전권 PDF 소장판은 얼마입니까","acceptedAnswer":{"@type":"Answer","text":"31권 전권 PDF 소장판은 1,705,000원입니다. 권당 110,000원의 31권 합산 3,410,000원의 절반 값이며 31권 파일 내려받기와 열람이 포함됩니다."}},{"@type":"Question","name":"간편 로그인은 무엇을 지원합니까","acceptedAnswer":{"@type":"Answer","text":"구글, 카카오, 네이버를 지원합니다. 제공사 등록 절차가 끝나는 대로 버튼이 열리며, 그 전까지는 이메일 가입으로 이용합니다."}},{"@type":"Question","name":"간편 로그인 계정도 비밀번호가 있습니까","acceptedAnswer":{"@type":"Answer","text":"간편 로그인 전용 계정은 비밀번호가 없습니다. 로그인은 간편 로그인으로 계속 이용합니다."}},{"@type":"Question","name":"비밀번호는 어떻게 바꿉니까","acceptedAnswer":{"@type":"Answer","text":"마이페이지 계정 정보에서 바꿉니다. 새 비밀번호는 10자 이상에 문자와 숫자를 포함하며 바꾸면 지금 이 기기 외의 로그인은 모두 풀립니다."}},{"@type":"Question","name":"가입 나이 제한이 있습니까","acceptedAnswer":{"@type":"Answer","text":"만 14세 이상. 만 14세 미만의 가입 신청은 승낙하지 않습니다."}},{"@type":"Question","name":"학생회원과 강사회원은 무엇이 다릅니까","acceptedAnswer":{"@type":"Answer","text":"가입 때 고른 회원 구분입니다. 학생회원은 학교와 학년을, 강사회원은 소속 학원을 적습니다. 가입 후 구분 변경은 admin@hyunhak.com 으로 문의합니다."}},{"@type":"Question","name":"광고성 정보 수신은 어떻게 해지합니까","acceptedAnswer":{"@type":"Answer","text":"마이페이지 수신 설정에서 언제든 해지합니다. 해지해도 이용에 제한이 없으며, 주문과 결제, 이용권 만료 안내는 수신 설정과 무관하게 보냅니다."}},{"@type":"Question","name":"회원 탈퇴는 어떻게 합니까","acceptedAnswer":{"@type":"Answer","text":"admin@hyunhak.com 으로 요청해 주세요. 탈퇴하면 계정 정보는 지체 없이 파기하고 결제 기록은 전자상거래법에 따라 5년 보관합니다."}},{"@type":"Question","name":"스쿨 플랜은 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"학원이 제시문 면접 스튜디오 좌석을 5개 이상 도입하는 플랜입니다. 강사 계정과 학생 리포트 관리가 포함되고 4좌석 이하는 개인 구매로 안내합니다."}},{"@type":"Question","name":"좌석 가격은 얼마입니까","acceptedAnswer":{"@type":"Answer","text":"1~5석째 315,000원, 6~10석째 285,000원, 11~20석째 260,000원, 21~40석째 240,000원이며 41석째부터는 별도 견적입니다. 부가세 포함이고 이미 산 좌석의 가격은 그대로입니다."}},{"@type":"Question","name":"스쿨 플랜 결제는 어떻게 합니까","acceptedAnswer":{"@type":"Answer","text":"계약 후 계좌이체와 세금계산서, 100% 선결제. 입금 후 2영업일 안에 좌석을 지급합니다."}},{"@type":"Question","name":"좌석 이용 기간은 어떻게 됩니까","acceptedAnswer":{"@type":"Answer","text":"지급 즉시 시작해 해당 입시학년도 시즌 종료일(예: 2027년 2월 28일)에 전 좌석이 종료됩니다. 이월은 없고, 신규 계약은 매 시즌 12월 31일까지 받습니다."}},{"@type":"Question","name":"강사 계정은 무엇을 봅니까","acceptedAnswer":{"@type":"Answer","text":"배정 학생의 응시 진행과 잔여 횟수, 학생이 동의한 범위의 첨삭 리포트를 봅니다. 원본 음성과 영상은 제공하지 않으며 유효 좌석 5개당 1개가 무상입니다."}},{"@type":"Question","name":"스쿨 플랜 좌석은 환불됩니까","acceptedAnswer":{"@type":"Answer","text":"미배정 좌석은 지급 후 14일 이내 1회 반환할 수 있고 잔존 좌석을 정상 누진가로 다시 셈해 정산합니다. 응시를 시작한 좌석은 잔여 이용량 기준으로 정산합니다."}},{"@type":"Question","name":"현학적의 뜻이 무엇입니까","acceptedAnswer":{"@type":"Answer","text":"검을 현 玄에 배울 학 學입니다. 『천자문』 첫 구절 天地玄黃의 그 글자이며, 아득히 깊은 배움이라는 뜻으로 씁니다. 사전의 衒學的(학식을 뽐냄)과는 다른 글자입니다."}},{"@type":"Question","name":"문의는 어디로 합니까","acceptedAnswer":{"@type":"Answer","text":"admin@hyunhak.com 앞으로 보내 주세요. 확인 후 답합니다."}},{"@type":"Question","name":"1:1 문의는 어디에서 합니까","acceptedAnswer":{"@type":"Answer","text":"고객센터의 1:1 문의에서 분류와 제목, 내용을 적어 보냅니다. 회원은 내 문의 목록에서 답변을 확인하고 비회원은 답변받을 이메일을 적어 보냅니다."}}]}]}</script>
 <!-- seo:end -->
 <link rel="icon" href="assets/favicon_32.png">
 <link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></noscript>
@@ -161,16 +161,16 @@
     <details class="faq"><summary>영수증은 어디에서 확인합니까</summary><div class="a"><p>마이페이지 주문 내역의 영수증 링크. 결제 완료 주문에 붙습니다.</p></div></details>
     <details class="faq"><summary>결제 후 이용권은 언제 쓸 수 있습니까</summary><div class="a"><p>결제 완료 즉시 계정에 부여됩니다. 가이드북은 자료실에서 열람하고 스튜디오 이용권과 PDF 소장판은 마이페이지 이용권에서 바로 씁니다.</p></div></details>
     <h2 id="q-refund">환불</h2>
-    <details class="faq"><summary>환불은 어떻게 됩니까</summary><div class="a"><p>가이드북과 인강, 면접 스튜디오는 디지털 콘텐츠입니다. 낱권으로 사신 권과 지문, 재생하지 않은 강의는 제공이 개시되기 전까지 청약철회하실 수 있습니다. 이미 연 권, 재생한 강의, 응시한 지문은 제공이 개시되어 전자상거래법 제17조 제2항 제5호에 따라 청약철회가 제한됩니다. 31권 전권과 단위 전권은 묶음 하나로 제공되기 때문에 한 권이라도 열람하거나 지문 하나라도 응시하면 이용권 전체의 청약철회가 제한됩니다. 표시 내용과 실제가 다른 경우에는 공급받은 날부터 3개월, 그 사실을 안 날부터 30일 이내에 청약철회하실 수 있습니다. 실물 배송 상품은 수령 후 7일 이내에 청약철회할 수 있습니다. 내용을 확인하려고 포장을 연 경우는 훼손으로 보지 않으며, 소비자 책임으로 상품이 멸실되거나 훼손된 경우 등 전자상거래법 제17조 제2항의 사유가 있으면 제한될 수 있습니다. 환불 대금은 청약철회일부터 3영업일 이내에 돌려드립니다.</p></div></details>
-    <details class="faq"><summary>어떤 경우에 환불이 제한됩니까</summary><div class="a"><p>이미 연 권, 재생한 강의, 응시한 지문, 발급된 PDF 소장판은 제공이 개시되어 단순 변심에 따른 청약철회가 제한됩니다(전자상거래법 제17조 제2항 제5호, 이용약관 제6조).</p></div></details>
-    <details class="faq"><summary>제공 개시 시점은 언제입니까</summary><div class="a"><p>가이드북은 보안 리더에서 열람을 시작한 때. PDF 소장판은 파일이 발급된 때. 스튜디오는 응시를 시작한 때.</p></div></details>
+    <details class="faq"><summary>환불은 어떻게 됩니까</summary><div class="a"><p>가이드북과 인강, 면접 스튜디오는 디지털 콘텐츠입니다. 낱권으로 사신 권과 지문, 재생하지 않은 강의는 제공이 개시되기 전까지 청약철회하실 수 있습니다. 이미 연 권, 재생한 강의, 응시한 지문, 발급받은 세트 문제지나 해설지 PDF 는 제공이 개시되어 전자상거래법 제17조 제2항 제5호에 따라 청약철회가 제한됩니다. 31권 전권과 단위 전권은 묶음 하나로 제공되기 때문에 한 권이라도 열람하거나 지문 하나라도 응시하거나 세트 PDF 를 하나라도 발급받으면 이용권 전체의 청약철회가 제한됩니다. 표시 내용과 실제가 다른 경우에는 공급받은 날부터 3개월, 그 사실을 안 날부터 30일 이내에 청약철회하실 수 있습니다. 실물 배송 상품은 수령 후 7일 이내에 청약철회할 수 있습니다. 내용을 확인하려고 포장을 연 경우는 훼손으로 보지 않으며, 소비자 책임으로 상품이 멸실되거나 훼손된 경우 등 전자상거래법 제17조 제2항의 사유가 있으면 제한될 수 있습니다. 환불 대금은 청약철회일부터 3영업일 이내에 돌려드립니다.</p></div></details>
+    <details class="faq"><summary>어떤 경우에 환불이 제한됩니까</summary><div class="a"><p>이미 연 권, 재생한 강의, 응시한 지문, 발급된 PDF 소장판과 세트 문제지나 해설지 PDF 는 제공이 개시되어 단순 변심에 따른 청약철회가 제한됩니다(전자상거래법 제17조 제2항 제5호, 이용약관 제6조).</p></div></details>
+    <details class="faq"><summary>제공 개시 시점은 언제입니까</summary><div class="a"><p>가이드북은 보안 리더에서 열람을 시작한 때. PDF 소장판은 파일이 발급된 때. 스튜디오는 응시를 시작한 때 또는 세트 문제지나 해설지 PDF 를 발급받은 때.</p></div></details>
     <details class="faq"><summary>열지 않은 상품은 언제까지 환불할 수 있습니까</summary><div class="a"><p>제공이 개시되기 전까지 청약철회하실 수 있고 그만큼 환불됩니다. 표시 내용과 실제가 다르거나 계약과 다르게 이행된 경우에는 공급받은 날부터 3개월, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내입니다.</p></div></details>
     <details class="faq"><summary>환불 대금은 언제 돌려받습니까</summary><div class="a"><p>청약철회는 요청을 보내신 때에 효력이 생기며 연구소의 승인을 요건으로 하지 않습니다. 환불 대금은 청약철회일부터 3영업일 이내에 결제 수단으로 돌려드리고, 환급이 늦어지면 지연이자를 더해 지급합니다.</p></div></details>
     <details class="faq"><summary>환불 요청은 어디에서 합니까</summary><div class="a"><p>마이페이지 주문 내역에서 결제 완료 주문의 환불 요청을 누르면 청약철회할 수 있는 상품과 금액이 표시됩니다. 사유를 적어 보내면 접수되고 접수 상태는 같은 자리에 배지로 표시됩니다.</p></div></details>
-    <details class="faq"><summary>여러 권을 함께 샀는데 일부만 열었습니다</summary><div class="a"><p>낱권으로 여러 권을 사신 경우에는 열지 않은 권만 환불됩니다. 31권 전권과 단위 전권은 묶음 하나라서 한 권이라도 열면 이용권 전체의 청약철회가 제한됩니다.</p></div></details>
+    <details class="faq"><summary>여러 권을 함께 샀는데 일부만 열었습니다</summary><div class="a"><p>낱권으로 여러 권을 사신 경우에는 열지 않은 권만 환불됩니다. 31권 전권과 단위 전권은 묶음 하나라서 한 권이라도 열거나 지문 하나라도 응시하거나 세트 PDF 를 하나라도 발급받으면 이용권 전체의 청약철회가 제한됩니다.</p></div></details>
     <h2 id="q-access">열람 기간과 기기</h2>
     <details class="faq"><summary>여러 기기에서 볼 수 있습니까</summary><div class="a"><p>같은 계정으로 로그인한 기기에서 열람합니다. 열람 기록은 계정 단위로 남으며, 계정 공유는 이용약관 위반입니다.</p></div></details>
-    <details class="faq"><summary>열람 기간은 얼마입니까</summary><div class="a"><p>가이드북 열람은 구매일부터 3개월. 스튜디오 응시 이용권은 구매일부터 3개월이고 인강 시청은 3개월입니다. 응시를 시작하기 전이면 응시 기간이 지났더라도 청약철회할 수 있습니다.</p></div></details>
+    <details class="faq"><summary>열람 기간은 얼마입니까</summary><div class="a"><p>가이드북 열람은 구매일부터 3개월. 스튜디오 응시 이용권은 구매일부터 3개월이고 인강 시청은 3개월입니다. 응시를 시작하거나 세트 문제지나 해설지 PDF 를 발급받기 전이면 응시 기간이 지났더라도 청약철회할 수 있습니다.</p></div></details>
     <details class="faq"><summary>동시에 몇 대까지 열 수 있습니까</summary><div class="a"><p>동시 열람은 계정당 3개 세션까지. 초과하면 가장 오래된 세션이 자동 종료되고 인강 동시 시청에도 같은 한도를 적용합니다.</p></div></details>
     <details class="faq"><summary>특정 기기에 묶입니까</summary><div class="a"><p>기기 제한은 없습니다. 같은 계정으로 로그인한 브라우저에서 열람하며 동시 세션 3개 한도만 적용됩니다.</p></div></details>
     <details class="faq"><summary>화면 캡처나 녹화를 해도 됩니까</summary><div class="a"><p>이용약관 제8조의2에 따라 화면 촬영, 캡처, 녹화, 자동화 수집은 금지됩니다. 확인되면 사전 통지 후 열람 제한이나 이용 정지가 될 수 있습니다.</p></div></details>
diff --git a/my.html b/my.html
index 31753a1..262a488 100644
--- a/my.html
+++ b/my.html
@@ -79,6 +79,7 @@
 .setrows .r .sr-ops,.bd-list .r .sr-ops{display:flex;gap:12px;white-space:nowrap}
 .setrows .r .sr-ops .tlink,.bd-list .r .sr-ops .tlink{min-height:40px;font-size:var(--t-sm)}
 .setrows .r .sr-ops .tlink.done,.bd-list .r .sr-ops .tlink.done{color:var(--gray)}
+.setrows .r .sr-warn,.bd-list .r .sr-warn{flex-basis:100%;width:100%;margin:var(--s1) 0 0;font-size:var(--t-xs);color:var(--seal);white-space:normal;word-break:keep-all}
 .setrows .sr-h{font-size:var(--t-sm);color:var(--gray);margin-top:10px}
 @media (max-width:700px){.setrows .r,.bd-list .r{flex-wrap:wrap}.setrows .r .sr-u,.bd-list .r .sr-u{white-space:normal}}
 details.bd summary{cursor:pointer;font-size:var(--t-sm);color:var(--gray);margin-top:8px;min-height:44px;display:list-item;list-style-position:inside;padding-block:12px}
@@ -213,6 +214,7 @@ dialog.rf::backdrop{background:rgba(49,46,46,.42)}
         </ol>
         <p class="fu-n">자료실의 가이드북과 기출 체험판은 읽는 자료이고 응시와 별개입니다.</p>
       </div>
+      <p id="sdlLive" class="vh" role="status" aria-live="polite"></p>
       <div class="subcards" id="passList"><div class="empty">불러오는 중</div></div>
     </div>
 
@@ -321,8 +323,8 @@ dialog.rf::backdrop{background:rgba(49,46,46,.42)}
     <p class="kind">환불 요청</p>
     <h2 id="rfTitle">환불 규정 안내</h2>
     <div class="pol">
-      <p>① 가이드북과 인강, 스튜디오는 디지털 콘텐츠입니다. 이미 연 권, 재생한 강의, 응시한 지문, 발급된 PDF 소장판은 제공이 개시되어 단순 변심에 따른 청약철회가 제한됩니다(전자상거래법 제17조 제2항 제5호, 이용약관 제6조). 제공 개시 시점은 가이드북은 보안 리더에서 열람을 시작한 때, PDF 소장판은 파일이 발급된 때, 스튜디오는 응시를 시작한 때입니다.</p>
-      <p>② 낱권으로 사신 권과 지문, 재생하지 않은 강의는 제공이 개시되기 전까지 청약철회하실 수 있습니다. 31권 전권과 단위 전권은 묶음 하나로 제공되기 때문에 한 권이라도 열람하거나 지문 하나라도 응시하면 이용권 전체의 청약철회가 제한됩니다. 표시 내용과 실제가 다르거나 계약과 다르게 이행된 경우에는 공급받은 날부터 3개월, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회하실 수 있습니다(전자상거래법 제17조 제3항).</p>
+      <p>① 가이드북과 인강, 스튜디오는 디지털 콘텐츠입니다. 이미 연 권, 재생한 강의, 응시한 지문, 발급된 PDF 소장판과 세트 문제지나 해설지 PDF 는 제공이 개시되어 단순 변심에 따른 청약철회가 제한됩니다(전자상거래법 제17조 제2항 제5호, 이용약관 제6조). 제공 개시 시점은 가이드북은 보안 리더에서 열람을 시작한 때, PDF 소장판은 파일이 발급된 때, 스튜디오는 응시를 시작한 때 또는 세트 문제지나 해설지 PDF 를 발급받은 때입니다.</p>
+      <p>② 낱권으로 사신 권과 지문, 재생하지 않은 강의는 제공이 개시되기 전까지 청약철회하실 수 있습니다. 31권 전권과 단위 전권은 묶음 하나로 제공되기 때문에 한 권이라도 열람하거나 지문 하나라도 응시하거나 세트 문제지나 해설지 PDF 를 하나라도 발급받으면 이용권 전체의 청약철회가 제한됩니다. 표시 내용과 실제가 다르거나 계약과 다르게 이행된 경우에는 공급받은 날부터 3개월, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회하실 수 있습니다(전자상거래법 제17조 제3항).</p>
       <p>③ 청약철회는 요청을 보내신 때에 효력이 생기며 연구소의 승인을 요건으로 하지 않습니다. 환불 대금은 청약철회일부터 3영업일 이내에 결제 수단으로 돌려드리고, 환급이 늦어지면 지연이자를 더해 지급합니다(전자상거래법 제18조 제2항).</p>
       <p><a href="terms.html#art6" target="_blank" rel="noopener">이용약관 제6조 보기</a></p>
     </div>
@@ -357,7 +359,7 @@ dialog.rf::backdrop{background:rgba(49,46,46,.42)}
     :where(body.v2.ft-compact) footer.ft .biz{margin-top:var(--s3)}
   </style>
   <div class="wrap">
-    <nav class="ft-legal" aria-label="법적 고지"><a href="faq.html#q-pay">결제</a><a href="terms.html">환불 규정</a><a href="terms.html">이용약관</a><a href="privacy.html">개인정보처리방침</a></nav>
+    <nav class="ft-legal" aria-label="법적 고지"><a href="support.html">고객센터</a><a href="#business-info">사업자 정보</a><a href="faq.html#q-pay">결제</a><a href="terms.html">환불 규정</a><a href="terms.html">이용약관</a><a href="privacy.html">개인정보처리방침</a></nav>
     <details class="ft-more" open>
     <summary>현학적 연구소</summary>
     <div class="g">
@@ -375,7 +377,7 @@ dialog.rf::backdrop{background:rgba(49,46,46,.42)}
         <ul><li><a href="support.html">고객센터</a></li><li>이메일 admin@hyunhak.com</li><li><a href="faq.html">자주 묻는 질문</a></li><li><a href="notice.html">공지</a></li><li><a href="terms.html">환불 규정</a></li></ul>
       </div>
     </div>
-    <div class="biz"><address class="bizinfo">상호: 현학적 연구소<br>대표: 현건우<br>사업자등록번호: 293-38-01827<br>통신판매업 신고: 신고 면제 대상(전자상거래법 제12조 제1항 단서)<br>주소: 서울특별시 강남구 테헤란로 70길 12, 402-941A호(대치동,&nbsp;H&nbsp;타워)<br>전화: 070-8098-0671<br>호스팅 제공자: Cloudflare,&nbsp;Inc.</address></div>
+    <div class="biz" id="business-info"><address class="bizinfo">상호: 현학적 연구소<br>대표: 현건우<br>사업자등록번호: 293-38-01827<br>통신판매업 신고: 신고 면제 대상(전자상거래법 제12조 제1항 단서)<br>주소: 서울특별시 강남구 테헤란로 70길 12, 402-941A호(대치동,&nbsp;H&nbsp;타워)<br>전화: 070-8098-0671<br>호스팅 제공자: Cloudflare,&nbsp;Inc.</address></div>
     </details>
   </div>
 </footer>
@@ -485,13 +487,15 @@ document.addEventListener('DOMContentLoaded', async function(){
     var attrs = isStudio ? ' data-ent="'+esc(e.id||'')+'" data-kind="'+esc(e.kind)+'" data-sku="'+esc(meta.sku||'')+'"'
       +(HH.okSetId(meta.set_id)?' data-set-id="'+esc(meta.set_id)+'"':'')+(expired?' data-expired="1"':'') : '';
     var st = '<p class="st">'+esc(KIND[e.kind]||e.kind)+usesTx+'<span class="stuse"></span>'+(e.expires_at?', '+esc(e.expires_at.slice(0,10))+' 까지'+(expired?(isStudio?' (응시 기간 종료)':' (열람 기간 종료)'):''):'')+'</p>';
+    // 제목이 없는 권리(구 지급·QA seed)는 종류 이름만 남아 어느 대학 것인지 안 보였다 (critic P2, OU-7). owned.js 와 같은 규칙으로 단위 라벨을 붙인다
+    var nm=isStudio&&HH.studioTitle?HH.studioTitle(e):(meta.title||KIND[e.kind]||e.kind);
     if(e.kind==='studio_school')
-      return '<div class="subcard" style="grid-template-columns:1fr"'+attrs+'><div><p class="nm">'+esc(meta.title||KIND[e.kind]||e.kind)+'</p>'+st+'</div>'
+      return '<div class="subcard" style="grid-template-columns:1fr"'+attrs+'><div><p class="nm">'+esc(nm)+'</p>'+st+'</div>'
         +'<div class="ops">'+op+'</div>'
         +'<div class="setrows"></div>'
         +'<details class="bd stsets" hidden><summary>세트별 사용과 잔여 펼치기</summary><div class="bd-list"></div></details></div>';
     if(e.kind==='studio_passage')
-      return '<div class="subcard" style="grid-template-columns:1fr"'+attrs+'><div><p class="nm">'+esc(meta.title||KIND[e.kind]||e.kind)+'</p>'+st+'</div>'
+      return '<div class="subcard" style="grid-template-columns:1fr"'+attrs+'><div><p class="nm">'+esc(nm)+'</p>'+st+'</div>'
         +'<div class="ops">'+op+'</div><div class="setrows"></div></div>';
     return '<div class="subcard"'+attrs+'><div><p class="nm">'+esc(meta.title||KIND[e.kind]||e.kind)+'</p>'+st+'</div>'
       +'<div class="ops">'+op+'</div></div>';
@@ -522,13 +526,14 @@ document.addEventListener('DOMContentLoaded', async function(){
     // 받은 적 있는 세트 파일 (set_id:doc). 원장 = /api/studio/sets/downloads/me. 실패해도 행은 그린다
     var got={}; try{ ((await HH.api('/api/studio/sets/downloads/me')).downloads||[]).forEach(function(d){ got[d.set_id+':'+d.doc]=1; }); }catch(e){}
     // 세트 1행: 제목 · 응시 n회와 잔여 · 문제지·해설지 PDF. expired 면 PDF 링크 대신 종료 문구 (서버도 만료 권리는 403)
-    function setRow(setId, n, expired){
-      var did=n>0, left=Math.max(0,SET_USES-n);
+    // arm = 이 이용권으로 아직 한 번도 응시하지 않았을 때. 그때의 PDF 발급은 제공 개시라 청약철회가 제한되므로 (이용약관 제6조, OU-6(1) 2026-09-14) 버튼을 2단계로 둔다
+    function setRow(setId, n, expired, arm){
+      var did=n>0, left=Math.max(0,SET_USES-n), armAttr=arm?' data-sdl-arm="'+arm+'"':'';
       // 원장을 못 받은 화면에서는 횟수를 지어내지 않는다 (JS-R3-01)
       var use = noLedger ? '응시 횟수 미상' : did ? '응시 <b>'+n+'회</b>, 잔여 '+left+'회' : '미응시, 5회 가능';
       var ops = expired ? '<span class="sr-u">응시 기간 종료</span>'
-        : '<span class="sr-ops"><button type="button" class="tlink sdl'+(got[setId+':exam']?' done':'')+'" data-set-id="'+esc(setId)+'" data-doc="exam">문제지 PDF'+(got[setId+':exam']?' (받음)':'')+'</button>'
-          +'<button type="button" class="tlink sdl'+(got[setId+':key']?' done':'')+'" data-set-id="'+esc(setId)+'" data-doc="key">해설지 PDF'+(got[setId+':key']?' (받음)':'')+'</button></span>';
+        : '<span class="sr-ops"><button type="button" class="tlink sdl'+(got[setId+':exam']?' done':'')+'" data-set-id="'+esc(setId)+'" data-doc="exam"'+armAttr+'>문제지 PDF'+(got[setId+':exam']?' (받음)':'')+'</button>'
+          +'<button type="button" class="tlink sdl'+(got[setId+':key']?' done':'')+'" data-set-id="'+esc(setId)+'" data-doc="key"'+armAttr+'>해설지 PDF'+(got[setId+':key']?' (받음)':'')+'</button></span>';
       return '<div class="r'+(did?' did':'')+'"><span class="sr-t">'+esc(setTitle(setId))+'</span><span class="sr-u">'+use+'</span>'+ops+'</div>';
     }
     var MODE={combined:'실전형',per_question:'연습형'}, KINDS={trial:'체험',studio_passage:'낱권',studio_school:'전권'};
@@ -552,24 +557,25 @@ document.addEventListener('DOMContentLoaded', async function(){
         var all=unitSets[card.dataset.sku]||[];
         var didIds=Object.keys(nOf).sort(function(a,b){ return nOf[b]-nOf[a]; });
         var restIds=all.filter(function(s){ return !nOf[s]; });
+        var arm=!expired&&(noLedger||didIds.length===0)?'school':'';   // 응시 0회 전권 = 첫 PDF 발급이 제공 개시. 원장을 못 받아 응시 여부가 불명확해도 확인 단계를 유지한다 (astra s3 r1)
         if(rowsEl) rowsEl.innerHTML=(expired
             ? '<p class="sr-h">응시 기간이 끝나 문제지와 해설지 PDF 를 받을 수 없습니다. 다시 구매하면 열립니다</p>'+didIds.map(function(s){ return setRow(s,nOf[s],expired); }).join('')
             : noLedger
-            ? '<p class="sr-h">응시 기록을 지금 불러오지 못해 세트별 응시 횟수를 비워 둡니다. 문제지와 해설지 PDF 는 아래에서 받습니다</p>'
+            ? '<p class="sr-h">응시 기록을 지금 불러오지 못해 세트별 응시 횟수를 비워 둡니다. 아래 문제지와 해설지 PDF 는 응시 여부를 확인하지 못한 상태라 버튼을 두 번 눌러 받습니다</p>'
             : didIds.length
             ? '<p class="sr-h">응시한 세트 '+didIds.length+'개. 문제지와 해설지는 복습용 구매자 각인 보안본 PDF 입니다</p>'+didIds.map(function(s){ return setRow(s,nOf[s],expired); }).join('')
-            : '<p class="sr-h">아직 응시한 세트가 없습니다. 응시하러 가기로 시작하면 제시문과 문제가 앱 화면에 나옵니다. 세트마다 '+SET_USES+'회 응시할 수 있고, 아래 문제지와 해설지 PDF 는 응시한 뒤 복습용입니다</p>');
+            : '<p class="sr-h">아직 응시한 세트가 없습니다. 응시하러 가기로 시작하면 제시문과 문제가 앱 화면에 나옵니다. 세트마다 '+SET_USES+'회 응시할 수 있고, 아래 문제지와 해설지 PDF 는 응시한 뒤 복습용입니다. 응시 전에 발급받으면 이 전권 이용권 전체의 청약철회가 제한됩니다(이용약관 제6조)</p>');
         var d=card.querySelector('.stsets');
         if(d&&(restIds.length||all.length===0)){
           d.hidden=false;
-          d.querySelector('.bd-list').innerHTML=restIds.map(function(s){ return setRow(s,0,expired); }).join('')
+          d.querySelector('.bd-list').innerHTML=restIds.map(function(s){ return setRow(s,0,expired,arm); }).join('')
             ||'<div class="r"><span class="sr-t">세트 목록을 지금 불러올 수 없습니다</span></div>';
           d.querySelector('summary').textContent=(didIds.length?'나머지 세트 ':'세트 ')+restIds.length+'개 '+(expired?'펼치기':'복습용 문제지와 해설지 PDF 펼치기');
         }
       } else if(kind==='studio_passage'){
         if(used) el.textContent=', 응시 '+used+'회';
         var sid=card.dataset.setId;
-        if(rowsEl&&HH.okSetId(sid)) rowsEl.innerHTML=setRow(sid,nOf[sid]||0,expired);
+        if(rowsEl&&HH.okSetId(sid)) rowsEl.innerHTML=setRow(sid,nOf[sid]||0,expired,!expired&&(noLedger||!(nOf[sid]>0))?'passage':'');
       }
     });
     // 응시 기록 표 (최신순, 원장 그대로)
@@ -604,13 +610,17 @@ document.addEventListener('DOMContentLoaded', async function(){
       var k=r.set_id||'?', nth=ordinal[r.ref||r.attempt_id||k+cnt[k]], tot=cnt[k]||0;
       return '<li><div class="row"><span class="d">'+esc(d)+'</span><span class="t">'+esc(setTitle(r.set_id))+(tot>1?' <span class="badge line">이 세트 '+nth+'번째 / '+tot+'회</span>':'')+(r.answer_mode?', '+esc(MODE[r.answer_mode]||r.answer_mode):'')
         +(KINDS[r.kind]?' <span class="badge line">'+esc(KINDS[r.kind])+'</span>':'')+'</span>'
-        +'<span class="s'+(done?'':' red')+'">'+esc(sc)+(old?' <span class="badge line">영상 보관 종료</span>':'')+((done||r.finalized_at)&&lecSet[r.set_id]?' <a class="tlink" href="lecture.html?set='+encodeURIComponent(r.set_id)+'">해설 강의</a>':'')+'</span></div></li>';
+        +'<span class="s'+(done?'':' red')+'">'+esc(sc)+(old?' <span class="badge line">영상 보관 종료</span>':'')+((done||r.finalized_at)&&lecSet[r.set_id]?' <a class="tlink" href="lecture.html?set='+encodeURIComponent(r.set_id)+'">해설 강의</a>':'')
+        // 채점된 응시는 행에서 바로 기록 열람으로 (critic P2, OU-7). 90일 지난 행은 영상·첨삭이 없어 버튼을 내지 않는다
+        +(done&&!old?' <button type="button" class="tlink hgo" data-view="history">리포트 다시 보기</button>':'')+'</span></div></li>';
     }).join('');
   })();
   // 스튜디오 기록 열람 (view history 토큰): 이용권이 없거나 다 써도 본인 기록은 연다.
   // 진입은 응시 버튼과 같은 HH.studioGo 로 통일한다. fetch 뒤의 window.open 은 iOS Safari 가 팝업으로 막는다.
   // 버튼의 data-view="history" 를 owned.js 가 토큰 요청 본문에 싣는다 (G2 계약)
   document.querySelectorAll('.hgo').forEach(function(b){b.addEventListener('click', function(ev){ ev.preventDefault(); HH.studioGo(b); })});
+  // 응시 기록 행의 리포트 다시 보기는 원장이 온 뒤 그려지므로 위임 (헤더 .hgo 는 #stuRows 밖이라 이중 결속 없음)
+  document.getElementById('stuRows').addEventListener('click', function(ev){ var b=ev.target.closest('.hgo'); if(!b) return; ev.preventDefault(); HH.studioGo(b); });
 
   // ── 내 강의: 보유 단위별 공개/준비 편수 + 바로가기 (공개 편수 = /api/lectures/summary 실값) ──
   (async function(){
@@ -707,6 +717,18 @@ document.addEventListener('DOMContentLoaded', async function(){
     var b=ev.target.closest('.sdl'); if(!b||b.disabled) return;
     var sid=b.dataset.setId, doc=b.dataset.doc;
     if(!HH.okSetId(sid)||!SDL_DOC[doc]) return;
+    // 미응시 이용권의 첫 발급 = 제공 개시 (약관 제6조, 서버 support.js 는 발급 원장을 개시로 본다). 한 번 더 눌러야 받는다 (OU-6(1) A, 2026-09-14)
+    if(b.dataset.sdlArm&&b.dataset.sdlArmed!=='1'){
+      b.dataset.sdlArmed='1'; b.textContent=SDL_DOC[doc]+' PDF, 제한에 동의하고 받기';
+      var row=b.closest('.r'), wid='sdlw_'+sid.replace(/[^a-z0-9_]/g,'')+'_'+doc;
+      // 범위는 약관 제6조와 같게: 낱권은 그 이용권, 전권은 전권 이용권 전체 (astra s3 r1 문안). 경고는 행에 보이고, 미리 둔 role=status 영역에도 실어 스크린리더가 읽는다 (접근성)
+      var scope=b.dataset.sdlArm==='school'?'이 전권 이용권 전체':'이 이용권';
+      var msg='아직 응시하지 않은 이용권입니다. 문제지나 해설지 PDF 를 발급받으면 제공이 개시되어 '+scope+'의 청약철회가 제한됩니다(이용약관 제6조). 받으려면 버튼을 한 번 더 누르세요.';
+      if(row&&!row.querySelector('.sr-warn')){ var w=document.createElement('p'); w.className='sr-warn'; w.id=wid; w.textContent=msg; row.appendChild(w); }
+      b.setAttribute('aria-describedby', wid);
+      var live=document.getElementById('sdlLive'); if(live){ live.textContent=''; setTimeout(function(){ live.textContent=msg; },50); }
+      return;
+    }
     b.disabled=true; var t0=b.textContent; b.textContent=SDL_DOC[doc]+' 준비 중…';
     var ik='hh_sdl_idem_'+sid+'_'+doc, idem=null;
     try{ idem=sessionStorage.getItem(ik); }catch(e){}
@@ -753,6 +775,8 @@ document.addEventListener('DOMContentLoaded', async function(){
       return '<li data-oid="'+esc(o.id||'')+'"><div class="row"><span class="d">'+esc((o.paid_at||o.created_at||'').slice(0,10))+'</span>'
         +'<span class="t">'+esc(o.items.map(function(i){return i.title+(i.qty>1?' x'+i.qty:'')}).join(', '))+', '+HH.won(o.amount)+'</span>'
         +'<span class="s'+(o.status==='paid'?'':' red')+'">'+(ST[o.status]||o.status)
+        // 입금 대기 주문은 서버가 PG 재조회로 계좌·기한을 실어 준다 (R3-API-01: 성공 화면을 새로고침하면 계좌가 사라지던 결함의 복구 경로)
+        +(o.status==='waiting_deposit'&&o.vaccount&&o.vaccount.accountNumber?', 입금 계좌 '+esc((o.vaccount.bank?o.vaccount.bank+' ':'')+o.vaccount.accountNumber)+(o.vaccount.dueDate?', 기한 '+esc(String(o.vaccount.dueDate).slice(0,16).replace('T',' ')):''):'')
         +(o.receipt_url?', <a class="tlink" target="_blank" rel="noopener" href="'+esc(o.receipt_url)+'">영수증</a>':'')+rf+'</span></div></li>';
     }).join('');
     // 주문 응답에 요청 상태가 없으면 주문별로 최신 요청을 물어 배지로 바꾼다. 실패하면 버튼을 그대로 둔다 (모달에서 다시 확인)
diff --git a/pay_done.html b/pay_done.html
index 8f83210..77743a5 100644
--- a/pay_done.html
+++ b/pay_done.html
@@ -220,8 +220,10 @@ document.addEventListener('DOMContentLoaded', async function(){
       lines.hidden = false;
       lines.innerHTML = '<div><dt>주문 번호</dt><dd>' + esc(orderId) + '</dd></div>'
         + '<div><dt>결제 금액</dt><dd>' + HH.won(amount) + '</dd></div>'
-        + (va.accountNumber ? '<div><dt>입금 계좌</dt><dd>' + esc(va.accountNumber) + '</dd></div>' : '')
-        + (va.dueDate ? '<div><dt>입금 기한</dt><dd>' + esc(va.dueDate) + '</dd></div>' : '');
+        // 은행명은 서버가 사람이 읽는 이름으로 준다 (R3-API-02). 재방문(멱등 분기)도 PG 재조회로 같은 값을 받고, 조회가 안 되면 주문 내역 안내로 폴백 (R3-API-01)
+        + (va.accountNumber ? '<div><dt>입금 계좌</dt><dd>' + esc((va.bank ? va.bank + ' ' : '') + va.accountNumber) + '</dd></div>'
+                            : '<div><dt>입금 계좌</dt><dd>계좌와 기한은 마이페이지 주문 내역에서 확인합니다</dd></div>')
+        + (va.dueDate ? '<div><dt>입금 기한</dt><dd>' + esc(String(va.dueDate).slice(0, 16).replace('T', ' ')) + '</dd></div>' : '');
       acts.hidden = false;
       acts.innerHTML = '<a class="btn" href="my.html">마이페이지 <span class="ar" aria-hidden="true">→</span></a>';
       return;
diff --git a/support.html b/support.html
index e47a642..7129751 100644
--- a/support.html
+++ b/support.html
@@ -228,7 +228,7 @@
     </section>
     <section class="blk pol" id="refund">
       <div class="sh"><div><h2>환불 규정 요약</h2></div></div>
-      <p>① 가이드북과 인강, 스튜디오는 디지털 콘텐츠입니다. 이미 연 권, 재생한 강의, 응시한 지문, 발급된 PDF 소장판은 제공이 개시되어 단순 변심에 따른 청약철회가 제한됩니다(전자상거래법 제17조 제2항 제5호, 이용약관 제6조). 제공 개시 시점은 가이드북은 보안 리더에서 열람을 시작한 때, PDF 소장판은 파일이 발급된 때, 스튜디오는 응시를 시작한 때입니다.</p><p>② 낱권으로 사신 권과 지문, 재생하지 않은 강의는 제공이 개시되기 전까지 청약철회하실 수 있습니다. 31권 전권과 단위 전권은 묶음 하나로 제공되기 때문에 한 권이라도 열람하거나 지문 하나라도 응시하면 이용권 전체의 청약철회가 제한됩니다. 표시 내용과 실제가 다르거나 계약과 다르게 이행된 경우에는 공급받은 날부터 3개월, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회하실 수 있습니다(전자상거래법 제17조 제3항).</p><p>③ 청약철회는 요청을 보내신 때에 효력이 생기며 연구소의 승인을 요건으로 하지 않습니다. 환불 대금은 청약철회일부터 3영업일 이내에 결제 수단으로 돌려드리고, 환급이 늦어지면 지연이자를 더해 지급합니다(전자상거래법 제18조 제2항).</p>
+      <p>① 가이드북과 인강, 스튜디오는 디지털 콘텐츠입니다. 이미 연 권, 재생한 강의, 응시한 지문, 발급된 PDF 소장판과 세트 문제지나 해설지 PDF 는 제공이 개시되어 단순 변심에 따른 청약철회가 제한됩니다(전자상거래법 제17조 제2항 제5호, 이용약관 제6조). 제공 개시 시점은 가이드북은 보안 리더에서 열람을 시작한 때, PDF 소장판은 파일이 발급된 때, 스튜디오는 응시를 시작한 때 또는 세트 문제지나 해설지 PDF 를 발급받은 때입니다.</p><p>② 낱권으로 사신 권과 지문, 재생하지 않은 강의는 제공이 개시되기 전까지 청약철회하실 수 있습니다. 31권 전권과 단위 전권은 묶음 하나로 제공되기 때문에 한 권이라도 열람하거나 지문 하나라도 응시하거나 세트 PDF 를 하나라도 발급받으면 이용권 전체의 청약철회가 제한됩니다. 표시 내용과 실제가 다르거나 계약과 다르게 이행된 경우에는 공급받은 날부터 3개월, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회하실 수 있습니다(전자상거래법 제17조 제3항).</p><p>③ 청약철회는 요청을 보내신 때에 효력이 생기며 연구소의 승인을 요건으로 하지 않습니다. 환불 대금은 청약철회일부터 3영업일 이내에 결제 수단으로 돌려드리고, 환급이 늦어지면 지연이자를 더해 지급합니다(전자상거래법 제18조 제2항).</p>
       <a class="tlink" href="terms.html">이용약관 제6조 전문 →</a>
     </section>
   </section>
diff --git a/terms.html b/terms.html
index 466aa83..9ba13d7 100644
--- a/terms.html
+++ b/terms.html
@@ -152,11 +152,12 @@
     제공이 개시된 후에는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항에 따라
     청약철회가 제한될 수 있습니다. 이 경우 가입, 구매 화면에 그 사실을 표시합니다.</li>
     <li>제공 개시 시점은 다음과 같습니다. 가이드북 열람 상품은 보안 리더에서 열람을 시작한 때,
-    PDF 소장판은 소장본 파일이 발급(내려받기)된 때, 스튜디오 이용권은 응시를 시작한 때입니다.
-    PDF 소장판은 파일 발급 후에는 청약철회가 제한됩니다.</li>
+    PDF 소장판은 소장본 파일이 발급(내려받기)된 때, 스튜디오 이용권은 응시를 시작한 때 또는
+    세트 문제지나 해설지 PDF 가 발급(내려받기)된 때입니다.
+    PDF 소장판과 세트 문제지, 해설지 PDF 는 파일 발급 후에는 청약철회가 제한됩니다.</li>
     <li>전권, 단위 전권처럼 여러 구성으로 이루어진 이용권은 구성 가운데 하나의 제공이 개시되면
     이용권 전체의 제공이 개시된 것으로 봅니다. 31권 전권은 한 권이라도 열람을 시작한 때,
-    스튜디오 단위 전권은 지문 하나라도 응시를 시작한 때입니다.</li>
+    스튜디오 단위 전권은 지문 하나라도 응시를 시작하거나 세트 문제지나 해설지 PDF 를 하나라도 발급받은 때입니다.</li>
     <li>출고 전 취소는 전액 환불합니다. 환불 대금은 청약철회일부터 3영업일 이내에 결제 수단으로 돌려드립니다.
     환급이 늦어지면 지연이자를 더해 지급합니다(「전자상거래 등에서의 소비자보호에 관한 법률」 제18조 제2항).</li>
   </ol>
```

## diff — interview-studio web/index.html (팔레트)
```diff
diff --git a/web/index.html b/web/index.html
index aef5402..8e5ee73 100644
--- a/web/index.html
+++ b/web/index.html
@@ -5,15 +5,17 @@
 <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
 <title>현학적 연구소 면접 스튜디오</title>
 <style>
+  /* 팔레트 = hyunhak.com assets/base.css 토큰 정렬 (critic P2, OU-7, 2026-09-14): 바탕 楮紙 #F4EFE3, 지면 #FFFDF8, 玄墨 #312E2E, 본문 #4A4644, 灰墨 #696561, 링크 #1B4E9B.
+     대비(WCAG, 사이트 실측 그대로): ink/bg 11.73, ink2/bg 8.13, ink3/bg 5.04, accent/bg 7.01, accent/surface 7.92. 학교색·상태색은 앱 고유 어휘라 유지 */
   :root{
-    --bg:#F8F7F4; --surface:#FFFFFF; --paper:#FBFAF4; --paper-edge:#E8E5D8;
-    --ink:#191D26; --ink2:#4A5060; --ink3:#6B7180; --line:#E4E2DA; --line2:#D4D2C8;
-    --accent:#274B93; --accent-soft:#EAEFF9; --accent-line:#B9C8E6;
+    --bg:#F4EFE3; --surface:#FFFDF8; --paper:#FFFDF8; --paper-edge:#E0D9C8;
+    --ink:#312E2E; --ink2:#4A4644; --ink3:#696561; --line:#DDD8CB; --line2:#CFC8B8;
+    --accent:#1B4E9B; --accent-soft:#E9EEF7; --accent-line:#B7C6E3;
     --yonsei:#0E4A84; --yonsei-soft:#E7EFF7; --korea:#8C1538; --korea-soft:#F6EAEE;
     --good:#1E7A4C; --good-soft:#E6F2EB; --warn:#A85E00; --warn-soft:#F8EFDE;
-    --crit:#B3261E; --rec:#D23B2E;
+    --crit:#9E2B22; --rec:#D23B2E;
     --mark-filler:#9AA0AC;
-    --chart:#3055A8; --btn-ink:#FFFFFF;
+    --chart:#1B4E9B; --btn-ink:#FFFFFF;
     --shadow:0 1px 2px rgba(20,24,35,.05),0 8px 24px rgba(20,24,35,.06);
     --radius:14px;
   }
```
