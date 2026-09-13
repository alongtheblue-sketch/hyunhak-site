# 8축 코드 교차검토 r3 (2026-09-13, hyunhak 구매물 활용 UX) — r2 잔여 3건 반영 최종 판정

r2 에서 당신(gpt-6-astra)이 남긴 3건과 조치:
- H5 미흡(지연 loadMe 가 응시 중 마이페이지 링크 재노출) → `syncBridgeChips()` 신설: 현재 `.screen.active` id 로 inSession 판정, show() 와 loadMe() 둘 다 이 함수만 호출. 실측 = 인라인 JS node --check 통과, pytest 전건 GREEN.
- M4 미흡(MY 초기 `me(true)`) → `HH.me()` 로 변경. 실측 = MY 로드 시 /api/auth/me 요청 1건.
- 기존 잔존(MY 맛보기 카드 + 유료권 병존) → `hasLiveStudio` 판정으로 살아 있는 유료권이 있으면 맛보기 카드 미출력. 실측 3케이스 = 유료+체험 → 카드 0 / 체험만 → 카드 1 / 만료 유료+체험 → 카드 1.

요청: 3건 각 닫힘/미흡 1줄 + 이번 diff 가 새로 연 결함이 있으면 [축][real|nit] 파일:위치 — 문제 — 수정안 + 마지막 줄 "VERDICT: GO|NO-GO" 와 근거 1줄. 한국어, 20줄 상한. 아래 diff 만 보면 된다 (전체 맥락은 r2 와 같다).

## diff
diff --git a/my.html b/my.html
--- a/my.html
+++ b/my.html
@@ -192,7 +192,7 @@ dialog.rf::backdrop{background:rgba(49,46,46,.42)}
 
   <section class="main">
     <div class="blk">
-      <div class="sh"><div><h2>이용권</h2><p>스튜디오 이용권과 잔여 응시 횟수, 구매한 가이드북</p></div></div>
+      <div class="sh"><div><h2>이용권</h2><p>스튜디오 이용권과 잔여 응시 횟수, 구매한 가이드북. 응시하러 가기를 누르면 스튜디오가 열리고, 세트를 고른 뒤 면접 시작을 누르면 답변 녹화가 시작됩니다. 점수와 첨삭은 아래 응시 기록에서 봅니다.</p></div></div>
       <div class="subcards" id="passList"><div class="empty">불러오는 중</div></div>
     </div>
 
@@ -365,11 +365,12 @@ dialog.rf::backdrop{background:rgba(49,46,46,.42)}
 <nav class="fix" aria-label="모바일 바로가기"><a href="index.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 11.2 12 4.4l8 6.8M6.4 9.8V20h11.2V9.8"/></svg>홈</a><a href="index.html#find"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.6" cy="10.6" r="5.6"/><path d="M14.8 14.8 20 20"/></svg>대학 찾기</a><a href="guidebook/index.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="4" width="14" height="16"/><path d="M8.6 4v16M12 8.4h4M12 11.8h4"/></svg>가이드북</a><a href="studio.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3z"/></svg>스튜디오</a><a class="on" aria-current="page" href="my.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8.4" r="3.4"/><path d="M4.8 20c1.6-4 4.2-5.6 7.2-5.6s5.6 1.6 7.2 5.6"/></svg>MY</a></nav>
 
 <script src="assets/app.js"></script>
+<script src="assets/owned.js"></script>
 <script src="assets/rank_profile.js"></script>
 <script>
 document.addEventListener('DOMContentLoaded', async function(){
   function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
-  var st = await HH.me(true);
+  var st = await HH.me();   // 헤더가 먼저 부른 같은 요청을 나눠 쓴다. 새 면 로드라 캐시는 어차피 비어 있다 (astra r2 M4)
   if(!st.member){
     document.querySelector('.lay').style.display='none';
     var guest=document.createElement('div'); guest.className='wrap';
@@ -449,7 +450,9 @@ document.addEventListener('DOMContentLoaded', async function(){
     return '<div class="subcard"'+attrs+'><div><p class="nm">'+esc(meta.title||KIND[e.kind]||e.kind)+'</p>'+st+'</div>'
       +'<div class="ops">'+op+'</div></div>';
   }));
-  if(st.trial_available)
+  // 유료 응시권이 살아 있으면 맛보기 카드를 내지 않는다: 인자 없는 토큰 요청은 서버(trial.js)가 유료권을 먼저 골라 체험 대신 유료 횟수를 쓴다 (astra r2)
+  var hasLiveStudio = singles.some(function(e){ return (e.kind==='studio_school'||e.kind==='studio_passage') && !(e.expires_at && Date.parse(e.expires_at)<=Date.now()) && (e.kind==='studio_school' || e.uses_left==null || HH.intIn(e.uses_left,0,9999,0)>0); });
+  if(st.trial_available && !hasLiveStudio)
     rows.push('<div class="subcard"><div><p class="nm">제시문 면접 스튜디오 맛보기</p><p class="st">신규 회원 무료 응시 1회가 남아 있습니다.</p></div>'
       +'<div class="ops"><button type="button" class="btn sm sgo">응시하러 가기</button></div></div>');
   // 강의 권리만 있는 회원에게 "이용권이 없습니다" 를 보이면 산 것이 사라진 것으로 읽힌다.
@@ -595,16 +598,8 @@ document.addEventListener('DOMContentLoaded', async function(){
   // 카드가 가리키는 권리(entitlement_id)와 세트(set_id)를 토큰 요청에 싣는다 (HSE-1 ④, 2026-09-09). 서버는 권리 id 를
   // 우선해 그 권리를 열고 허용 세트 정규식을 토큰에 박는다. 전권 둘 보유자가 둘째 전권을 쓰고, 낱권은 결속 세트만 열린다.
   // 맛보기 카드는 둘 다 없어 인자 없이 보낸다 (서버 현행 동작, 역호환)
-  var ENT_ID_RE=/^ent[A-Za-z0-9_]{1,80}$/;
-  document.querySelectorAll('.sgo').forEach(function(a){a.addEventListener('click', async function(ev){
-    ev.preventDefault();
-    var sid=this.dataset.setId||'', eid=this.dataset.ent||'', body={};
-    if(HH.okSetId(sid)) body.set_id=sid;
-    if(ENT_ID_RE.test(eid)) body.entitlement_id=eid;
-    var opt=Object.keys(body).length?{method:'POST',body:JSON.stringify(body)}:{method:'POST'};
-    try{ var r=await HH.api('/api/studio/token',opt); window.open(r.url,'_blank','noopener'); }
-    catch(e){ alert(e.message||'이용권을 확인하지 못했습니다'); }
-  })});
+  // 진입은 owned.js HH.studioGo 로 통일 (2026-09-13): 휴대폰은 같은 탭, 데스크톱은 새 탭. fetch 뒤 window.open 은 iOS Safari 가 팝업으로 막았다
+  document.querySelectorAll('.sgo').forEach(function(a){a.addEventListener('click', function(ev){ ev.preventDefault(); HH.studioGo(a); })});
   // 소장판 내려받기, 스탬프 PDF (계정 각인, 수 초 소요).
   // 멱등 idem 은 성공 전까지 sessionStorage 보존: 응답 단절 후 재클릭이 새 발급으로 집계되지 않게 (Codex r1 #11)
   document.querySelectorAll('.dlgo').forEach(function(b){b.addEventListener('click', async function(){

diff --git a/web/index.html b/web/index.html
--- a/web/index.html
+++ b/web/index.html
@@ -323,6 +323,7 @@
     <span id="bar-phase"></span>
     <div class="bar-right">
       <button class="chip" id="chip-history" title="내 응시 기록" style="display:none">내 기록</button>
+      <a class="chip" id="chip-my" href="https://hyunhak.com/my.html" style="display:none;text-decoration:none" title="hyunhak.com 마이페이지, 이용권과 응시 기록">마이페이지</a>
       <button class="chip" id="chip-rank" title="연습 랭킹">랭킹</button>
       <button class="chip" id="chip-speed" data-on="false" title="타이머 배속 (검증용)">데모 배속 ×20</button>
       <button id="btn-exit">연습 종료</button>
@@ -334,7 +335,7 @@
       <div class="home-hero">
         <div class="eyebrow">2026 수시 구술면접</div>
         <h1>오늘 연습할 면접 세트를 고르세요</h1>
-        <p>실제 고사장과 같은 시간 규칙으로 진행됩니다. 준비 시간에 제시문을 읽고, 답변 시간에 소리 내어 답하면 자동 채점과 피드백 리포트가 만들어집니다.</p>
+        <p>실제 고사장과 같은 시간 규칙으로 진행됩니다. 준비 시간에 제시문을 읽고, 답변 시간에 소리 내어 답하면 자동 채점과 피드백 리포트가 만들어집니다. 세트 카드를 누르면 시작 화면이 열리고, 거기서 면접 시작을 누르면 준비 시간 뒤 답변 녹화가 시작됩니다.</p>
       </div>
       <div class="setgrid" id="setgrid"><div class="empty-note">세트를 불러오는 중입니다.</div></div>
     </section>
@@ -609,10 +610,18 @@ function show(id){
   const inSession = ["scr-prep","scr-answer","scr-analyze"].includes(id);
   $("#btn-exit").style.display = inSession ? "block" : "none";
   $("#chip-rank").style.display = inSession ? "none" : "inline-flex";
-  $("#chip-history").style.display = (inSession || !bridgeBound) ? "none" : "inline-flex";
+  syncBridgeChips();
   $("#bar-phase").style.display = inSession ? "inline" : "none";
   window.scrollTo({top:0});
 }
+// 회원 칩(내 기록, 마이페이지)은 현재 화면 기준으로만 보인다. 응시 중 이탈 = 미제출 답변 소실이라 show() 와 loadMe() 둘 다 이 함수를 거친다
+function syncBridgeChips(){
+  const act = document.querySelector(".screen.active");
+  const inSession = !!act && ["scr-prep","scr-answer","scr-analyze"].includes(act.id);
+  const v = (inSession || !bridgeBound) ? "none" : "inline-flex";
+  $("#chip-history").style.display = v;
+  $("#chip-my").style.display = v;
+}
 const setPhase = t => $("#bar-phase").textContent = t;
 const overlay = (on, title) => { $("#overlay").classList.toggle("on", on); if(title) $("#ov-title").textContent = title; };
 function briefError(msg){ const b=$("#brief-err"); b.textContent=msg; b.style.display="block"; }
@@ -1637,7 +1646,7 @@ async function loadMe(){
     if(me && me.sub_bound){
       bridgeBound = true; bridgeScope = String(me.scope || "");
       if(me.nick){ bridgeNick = me.nick; if(!$("#alias").value) $("#alias").value = bridgeNick; }
-      $("#chip-history").style.display = "inline-flex";
+      syncBridgeChips();   // hyunhak.com 에서 온 회원은 돌아갈 길이 필요하다 (2026-09-13 학생 피드백). 응시 중이면 숨긴 채 둔다
       if(bridgeScope === "history"){
         // 기록 열람 입장: 세트 목록은 두되 새 응시는 hyunhak.com 마이페이지에서만 시작한다
         $("#setgrid").insertAdjacentHTML("beforebegin", '<div class="notice">기록 열람 입장입니다. 새 응시는 hyunhak.com 마이페이지의 응시하러 가기로 시작합니다.</div>');
