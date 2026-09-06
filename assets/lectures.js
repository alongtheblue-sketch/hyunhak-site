/* 인강 상품면 공용 런타임 (2026-09-06). lectures.html, lectures/<code>.html, classroom.html 이 같이 쓴다.
   원칙 (LECTURE_SPEC §6): 공개 편수와 상태는 /api/lectures/summary 와 /api/lectures/public 실값만. 지면에 박힌 편수는
   빌드 시점 카탈로그 스냅샷이고, API 가 살아 있으면 여기서 덮어쓴다. API 가 죽으면 "상태 미상" 으로 적고 0편으로 읽지 않는다.
   로그인 회원은 /api/lectures 로 권리와 시청 위치를 받아 행마다 시청, 이어보기 버튼을 세운다. */
(function () {
  "use strict";
  if (!window.HH) return;
  var HH = window.HH;
  var P = (document.body.getAttribute("data-p") || "");   // 하위 디렉토리 면은 "../"
  var UNITS = ["korea-hum", "korea-sci", "yonsei-hum", "yonsei-sci", "yonsei-intl"];
  function okUnit(v) { return UNITS.indexOf(String(v == null ? "" : v)) >= 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n0(v, hi) { var n = Number(v); if (!isFinite(n) || n < 0) return 0; n = Math.trunc(n); return hi != null && n > hi ? hi : n; }
  function fmt(sec) {
    var m = Math.round(n0(sec, 360000) / 60);
    if (m >= 60) return Math.floor(m / 60) + "시간 " + (m % 60 ? (m % 60) + "분" : "");
    return m + "분";
  }
  function fmtPos(sec) { var s = n0(sec, 360000); var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r; }
  // COPY §3-3 해설 강의 상태 3분기
  function statusText(ready, total) {
    ready = n0(ready, 999); total = n0(total, 999);
    if (ready <= 0) return "해설 강의 준비 중";
    if (total && ready >= total) return "해설 강의 " + total + "편 전편 공개";
    return "해설 강의 " + ready + "편 공개, 순차 업로드";
  }

  var _units = null, _pub = {}, _mine = null, _sum = {};
  function units() {
    if (_units) return _units;
    _units = fetch(P + "assets/data/sets.json", { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (d) { return (d.units || []).filter(function (u) { return okUnit(u.code); }); })
      .catch(function () { return []; });
    return _units;
  }
  function pub(code) {
    if (!okUnit(code)) return Promise.resolve(null);
    if (_pub[code]) return _pub[code];
    _pub[code] = HH.api("/api/lectures/public?unit=" + encodeURIComponent(code))
      .then(function (d) { return Array.isArray(d.lectures) ? d.lectures : null; })
      .catch(function () { delete _pub[code]; return null; });
    return _pub[code];
  }
  function summary(q) {
    if (_sum[q]) return _sum[q];
    _sum[q] = HH.api("/api/lectures/summary?" + q).then(function (d) { return d && typeof d.total === "number" ? d : null; }).catch(function () { return null; });
    return _sum[q];
  }
  // 회원 목록: 권리와 시청 위치 포함. 비회원이면 null, 오류면 null (상태 미상)
  function mine() {
    if (_mine) return _mine;
    _mine = HH.me().then(function (st) {
      if (!st || !st.member) return null;
      return HH.api("/api/lectures").then(function (d) { return Array.isArray(d.lectures) ? d.lectures : null; }).catch(function () { return null; });
    });
    return _mine;
  }
  function byId(list) { var m = {}; (list || []).forEach(function (l) { m[l.id] = l; }); return m; }

  // ---------- 목차 행 갱신: 지면에 박힌 행(data-lec) 을 실값으로 덮는다 ----------
  // 행 구조: .row[data-lec=<id>] > .n / span(.t .m) / .a . 비회원 = 공개 여부만, 회원 = 시청, 이어보기, 완료
  function paintRows(root, pubList, mineList, sampleIds) {
    var pm = byId(pubList), mm = byId(mineList);
    var rows = root.querySelectorAll("[data-lec]");
    Array.prototype.forEach.call(rows, function (row) {
      var id = row.getAttribute("data-lec");
      var l = mm[id] || pm[id];
      var a = row.querySelector(".a"), m = row.querySelector(".m");
      if (!a) return;
      var sample = sampleIds && sampleIds.indexOf(id) >= 0;
      if (!l) return;   // API 응답에 없음 = 상태 미상. 지면 표기(이용권 뱃지)를 그대로 둔다. 요약 줄이 상태 미상을 적는다
      var st = [];
      if (l.status !== "ready") {
        row.classList.add("slot"); row.classList.remove("row"); row.setAttribute("aria-disabled", "true");
        a.innerHTML = '<span class="badge mute" aria-disabled="true">준비 중</span>';
        if (m) m.innerHTML = "<span>준비 중. 공개되면 추가 비용 없이 이 이용권으로 시청합니다.</span>";
        return;
      }
      if (l.duration_sec) st.push("<span>" + fmt(l.duration_sec) + "</span>");
      var p = l.progress;
      if (mm[id]) {
        if (l.entitled) {
          if (p && p.completed) st.push('<span class="badge">완료</span>');
          if (p && p.view_count) st.push("<span>" + n0(p.view_count) + "회 시청</span>");
          if (p && p.position_sec > 0 && !p.completed) st.push("<span>" + fmtPos(p.position_sec) + " 부터 이어보기</span>");
          a.innerHTML = '<a class="btn sm" href="' + P + "lecture.html?id=" + encodeURIComponent(id) + '">' + (p && p.position_sec > 0 && !p.completed ? "이어보기" : "시청") + "</a>";
          var pct = (p && l.duration_sec) ? n0(Math.round(n0(p.position_sec) / n0(l.duration_sec, 100000) * 100), 100) : 0;
          var bar = row.querySelector(".prog");
          if (pct > 0) { if (!bar) { bar = document.createElement("span"); bar.className = "prog"; bar.setAttribute("aria-hidden", "true"); bar.innerHTML = "<i></i>"; row.children[1].appendChild(bar); } bar.firstChild.style.width = pct + "%"; }
        } else if (!sample) {
          st.push('<span class="badge line">이용권 필요</span>');
          a.innerHTML = '<a class="btn ghost sm" href="' + P + "studio.html" + (l.unit_code ? "?unit=" + encodeURIComponent(l.unit_code) : "#lecture") + '">이용권</a>';
        }
      } else if (!sample) {
        a.innerHTML = '<span class="badge line">이용권</span>';
      }
      if (m) m.innerHTML = st.join("") + (sample ? '<span class="badge seal">맛보기</span>' : "");
    });
  }

  // ---------- 요약 문구: [data-lec-summary="unit=korea-hum&kind=passage"] 에 실값 ----------
  function paintSummaries(root) {
    var els = root.querySelectorAll("[data-lec-summary]");
    Array.prototype.forEach.call(els, function (el) {
      var q = el.getAttribute("data-lec-summary"), total = n0(el.getAttribute("data-total"), 999) || null;
      summary(q).then(function (sm) {
        if (!sm) { return; }  // 미도달 = 정적 스냅샷 문안(날짜 병기) 그대로 둔다. 오류 문안으로 덮지 않는다
        el.innerHTML = esc(statusText(sm.ready, sm.total || total)) + (sm.as_of ? ' <span class="mono">' + esc(sm.as_of) + " 기준</span>" : "");
      });
    });
  }

  // ---------- 인강실 ----------
  function classroom(view) {
    HH.me(true).then(function (st) {
      if (!st || !st.member) { view.setAttribute("data-state", st && st.error ? "down" : "guest"); return; }   // 401 만 비회원, 네트워크와 5xx 는 down
      var ents = (st.entitlements || []).filter(function (e) { return e.kind === "lecture"; });
      ents.forEach(function (e) { if (!e._meta) { var m = {}; try { m = JSON.parse(e.meta || "{}"); } catch (err) {} e._meta = m; } });   // /api/auth/me 는 meta 를 문자열로 준다 (my.html 과 같은 변환)
      Promise.all([units(), mine()]).then(function (r) {
        var us = r[0], all = r[1];
        if (all === null) { view.setAttribute("data-state", "down"); return; }
        view.setAttribute("data-state", "member");   // 데이터가 온 뒤에만 member. 그 전은 loading 이라 12초 가드가 전 경로를 덮는다
        var owned = {};
        ents.forEach(function (e) { var m = e._meta || {}; if (m.unit_code && okUnit(m.unit_code)) { if (!owned[m.unit_code] || String(e.expires_at || "9999") > String(owned[m.unit_code].expires_at || "9999")) owned[m.unit_code] = e; /* 만료 없음("9999") 이 최상, 같은 단위에 무기한과 유기한 공존 시 무기한 유지 */ } });
        var common = all.filter(function (l) { return l.kind === "common"; });
        var commonCands = ents.filter(function (e) { return (e._meta || {}).scope === "common" || !((e._meta || {}).unit_code || (e._meta || {}).set_id); })
          .concat(Object.keys(owned).map(function (k) { return owned[k]; }));   // 직접 공통 권리 + 단위 전권 권리(공통 접근 포함, pay.js). 중첩 구매 시 둘 다 후보
        var commonEnt = commonCands.sort(function (a, b) { return String(b.expires_at || "9999").localeCompare(String(a.expires_at || "9999")); })[0] || null;   // 만료 없음 > 가장 늦은 만료
        var cards = [], recent = [];
        all.forEach(function (l) { if (l.progress && l.progress.updated_at) recent.push(l); });
        recent.sort(function (a, b) { return String(b.progress.updated_at).localeCompare(String(a.progress.updated_at)); });
        function card(code, label, ls, ent, href) {
          var ready = ls.filter(function (l) { return l.status === "ready"; });
          var ent_ok = ls.some(function (l) { return l.entitled; });
          var done = ls.filter(function (l) { return l.progress && l.progress.completed; }).length;
          var started = ls.filter(function (l) { return l.progress && l.progress.position_sec > 0; }).length;
          var pct = ready.length ? Math.round(done / ready.length * 100) : 0;
          var last = ls.filter(function (l) { return l.progress && l.progress.updated_at; }).sort(function (a, b) { return String(b.progress.updated_at).localeCompare(String(a.progress.updated_at)); })[0];
          var untilTx = ent && ent.expires_at ? String(ent.expires_at).slice(0, 10) + " 까지" : "";
          return '<article class="cr' + (ent_ok ? "" : " off") + '"><div class="ch"><h2>' + esc(label) + "</h2><span class=\"cnt\">공개 <b>" + ready.length + "</b> 준비 <b>" + (ls.length - ready.length) + "</b></span></div>"
            + '<p class="st">완료 ' + done + "편, 시작 " + started + "편" + (untilTx ? ", " + esc(untilTx) : "") + "</p>"
            + '<span class="prog big" aria-label="완료 ' + pct + '%"><i style="width:' + pct + '%"></i></span>'
            + '<div class="acts">' + (last && !last.progress.completed ? '<a class="btn sm" href="' + P + "lecture.html?id=" + encodeURIComponent(last.id) + '">이어보기, ' + esc(last.title).slice(0, 28) + "</a>" : "")
            + '<a class="btn ghost sm" href="' + href + '">강의 목록</a></div></article>';
        }
        if (common.length && common.some(function (l) { return l.entitled; })) cards.push(card("common", "공통 풀이", common, commonEnt, P + "lecture.html"));   // 권리 없는 회원은 none 상태로
        us.forEach(function (u) {
          var ls = all.filter(function (l) { return l.unit_code === u.code; });
          if (!ls.some(function (l) { return l.entitled; })) return;
          cards.push(card(u.code, u.label + " 풀이법 인강", ls, owned[u.code], P + "lecture.html?unit=" + encodeURIComponent(u.code)));
        });
        var box = view.querySelector("#crCards");
        if (!cards.length) { view.setAttribute("data-state", "none"); }
        else box.innerHTML = cards.join("");
        var rb = view.querySelector("#crRecent");
        if (rb) {
          var rows = recent.slice(0, 6).map(function (l) {
            var p = l.progress, pct = l.duration_sec ? n0(Math.round(n0(p.position_sec) / n0(l.duration_sec, 100000) * 100), 100) : 0;
            return '<div class="row" role="listitem" data-lec="' + esc(l.id) + '"><span class="n">' + esc(String(l.seq || "").padStart(2, "0")) + '</span><span><span class="t">' + esc(l.title) + '</span><span class="m"><span>' + esc(String(p.updated_at).slice(0, 10)) + "</span>" + (p.completed ? '<span class="badge">완료</span>' : "<span>" + fmtPos(p.position_sec) + " 부터</span>") + "</span>" + (pct > 0 && !p.completed ? '<span class="prog" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' : "") + '</span><span class="a"><a class="btn sm" href="' + P + "lecture.html?id=" + encodeURIComponent(l.id) + '">' + (p.completed ? "다시 보기" : "이어보기") + "</a></span></div>";
          });
          rb.innerHTML = rows.length ? rows.join("") : '<p class="note">아직 시청 기록이 없습니다. 강의 목록에서 첫 편을 여세요.</p>';
        }
      });
    });
  }

  // ---------- 담기: [data-cart-sku] 클릭 위임 (studio.html 과 같은 HH.addToCart. confirm 대신 버튼 옆 안내와 장바구니 링크) ----------
  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest("[data-cart-sku]") : null;
    if (!el || !window.HH || !HH.addToCart) return;
    ev.preventDefault();
    var r = HH.addToCart({ sku: el.dataset.cartSku, title: el.dataset.cartTitle, price: +el.dataset.cartPrice, set_id: el.dataset.setId || undefined });
    var box = el.closest(".acts") || el.parentNode, msg = box.nextElementSibling && box.nextElementSibling.classList.contains("cartmsg") ? box.nextElementSibling : null;
    if (!msg) { msg = document.createElement("p"); msg.className = "cartmsg note"; msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite"); box.insertAdjacentElement("afterend", msg); }
    if (!r.ok) { msg.textContent = r.message || "담지 못했습니다."; return; }
    if (HH.updateNav) { try { HH.updateNav(); } catch (e) {} }
    if (r.already) { msg.innerHTML = esc(r.message) + ' <a href="' + P + 'cart.html">장바구니로 <span class="ar" aria-hidden="true">→</span></a>'; return; }
    var cnt = 0; try { cnt = HH.cart().filter(function (x) { return x.sku === el.dataset.cartSku; }).reduce(function (s, x) { return s + (x.qty || 1); }, 0); } catch (e) {}
    msg.innerHTML = '담았습니다' + (cnt > 1 ? ' (' + cnt + '개)' : '') + '. <a href="' + P + 'cart.html">장바구니로 <span class="ar" aria-hidden="true">→</span></a>';
  });
  window.LEC = { units: units, pub: pub, summary: summary, mine: mine, paintRows: paintRows, paintSummaries: paintSummaries, classroom: classroom, fmt: fmt, statusText: statusText, esc: esc, okUnit: okUnit, P: P };
})();
