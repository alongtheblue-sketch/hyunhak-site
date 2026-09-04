/* 2026 기출 체험판 랜딩 — 목록과 수치는 전부 서버 원장에서 받는다.
   지면이 "무엇을 몇 권 준다"를 자기 문면에 적으면 코호트가 바뀔 때 지면만 낡아 조용히 거짓이 된다.
   DOM 삽입은 textContent/createElement 만 (서버 문자열을 innerHTML 에 넣지 않는다). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var stateText = $("stateText"), actBtn = $("actBtn"), msgEl = $("msg"), listEl = $("setList");
  var fCount = $("fCount"), fPages = $("fPages"), fHours = $("fHours");
  var catalog = [], hours = null, claiming = false;

  function msg(text, isErr) {
    msgEl.textContent = text || "";
    msgEl.className = "msg" + (isErr ? " err" : "");
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  // 남은 시간은 분까지만. 초 단위는 화면에서 쓸모가 없고 매초 다시 그리게 만든다
  function remain(expiresAt) {
    var ms = new Date(expiresAt).getTime() - Date.now();
    if (!isFinite(ms) || ms <= 0) return null;
    var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? h + "시간 " + m + "분" : m + "분";
  }

  function renderFacts() {
    fCount.textContent = catalog.length ? String(catalog.length) : "—";
    var pages = catalog.reduce(function (s, d) { return s + (Number(d.pages) || 0); }, 0);
    fPages.textContent = pages ? String(pages) : "—";
    fHours.textContent = hours != null ? String(hours) : "—";
  }

  // openable = 지금 열람할 수 있는 상태인가. 목록 자체는 청구 전에도 보여준다
  function renderList(openable) {
    listEl.textContent = "";
    catalog.forEach(function (d) {
      var li = el("li"), row = el("div", "pf"), meta = el("div");
      meta.appendChild(el("p", "t", d.title));
      meta.appendChild(el("p", "m", Number(d.pages) ? d.pages + "면" : ""));
      row.appendChild(meta);
      var btn = el("button", "btn ghost sm", "열람하기");
      btn.type = "button";
      if (openable) {
        btn.addEventListener("click", function () {
          location.href = "reader.html?slug=" + encodeURIComponent(d.slug);
        });
      } else {
        btn.setAttribute("aria-disabled", "true");
      }
      row.appendChild(btn);
      li.appendChild(row);
      listEl.appendChild(li);
    });
  }

  function showAction(label, onClick) {
    actBtn.hidden = false;
    actBtn.textContent = label;
    actBtn.onclick = onClick;
  }
  function hideAction() { actBtn.hidden = true; actBtn.onclick = null; }

  function goLogin() {
    location.href = "login.html?next=" + encodeURIComponent("pastexam.html");
  }

  async function claim() {
    if (claiming) return;              // 연타로 두 번 보내지 않는다
    claiming = true;
    actBtn.setAttribute("aria-disabled", "true");
    msg("체험판을 신청하고 있습니다.");
    try {
      var r = await HH.api("/api/trial/reader", { method: "POST", body: "{}" });
      if (r.docs && r.docs.length) catalog = mergePages(r.docs);
      if (r.hours != null) hours = r.hours;
      renderFacts();
      renderList(true);
      hideAction();
      var left = remain(r.expires_at);
      stateText.textContent = "";
      stateText.appendChild(el("b", null, "열람 중"));
      stateText.appendChild(document.createTextNode(left ? ". 남은 시간 " + left + "." : "."));
      msg("신청되었습니다. 아래 목록에서 열람하실 수 있습니다.");
      if (window.HH_TRACK) HH_TRACK("pastexam_trial_claim", { docs: catalog.length });
    } catch (e) {
      if (e.status === 401) { goLogin(); return; }
      // 409 = 이미 청구한 계정. 상태를 다시 읽어 화면을 원장에 맞춘다
      if (e.status === 409) { msg(e.message, true); await load(); return; }
      msg(e.message || "신청하지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
      actBtn.removeAttribute("aria-disabled");
    } finally {
      claiming = false;
    }
  }

  // 청구 응답의 docs 에는 면수가 없다. 이미 받아 둔 카탈로그에서 slug 로 정확히 맞춰 붙인다
  // (접두사나 순서로 짐작하지 않는다)
  function mergePages(docs) {
    var byslug = {};
    catalog.forEach(function (d) { byslug[d.slug] = d.pages; });
    return docs.map(function (d) { return { slug: d.slug, title: d.title, pages: byslug[d.slug] }; });
  }

  async function load() {
    // 1) 목록은 로그인과 무관하게 먼저 (로그아웃 방문자도 무엇을 받는지 본다)
    try {
      var cat = await HH.api("/api/trial/reader/catalog");
      catalog = cat.catalog || [];
      hours = cat.hours;
    } catch (e) {
      stateText.textContent = "체험판 자료를 불러오지 못했습니다.";
      msg("잠시 후 다시 시도해 주세요.", true);
      return;
    }
    renderFacts();
    if (!catalog.length) {
      stateText.textContent = "체험판 자료가 아직 준비되지 않았습니다.";
      hideAction();
      return;
    }

    // 2) 로그인 상태
    var who = await HH.me(true);
    if (!who.member) {
      renderList(false);
      stateText.textContent = "회원 로그인 후 신청하실 수 있습니다. 신청하면 " + hours + "시간 동안 열람합니다.";
      showAction("로그인하고 신청", goLogin);
      return;
    }

    // 3) 체험 상태
    var st;
    try { st = await HH.api("/api/trial/reader"); }
    catch (e) {
      if (e.status === 401) { renderList(false); showAction("로그인하고 신청", goLogin); return; }
      msg(e.message || "상태를 확인하지 못했습니다.", true);
      renderList(false);
      return;
    }
    if (st.catalog && st.catalog.length) catalog = st.catalog;
    if (st.hours != null) hours = st.hours;
    renderFacts();

    if (st.status === "active") {
      var left = remain(st.expires_at);
      stateText.textContent = "";
      stateText.appendChild(el("b", null, "열람 중"));
      stateText.appendChild(document.createTextNode(left ? ". 남은 시간 " + left + "." : "."));
      renderList(true);
      hideAction();
      return;
    }
    if (st.status === "expired") {
      stateText.textContent = "체험 기간이 끝났습니다. 계정당 한 번이라 다시 신청하실 수 없습니다.";
      renderList(false);
      hideAction();
      return;
    }
    stateText.textContent = "아직 신청하지 않으셨습니다. 신청하면 " + hours + "시간 동안 열람합니다. 계정당 한 번입니다.";
    renderList(false);
    showAction(hours + "시간 체험 신청", claim);
  }

  document.addEventListener("DOMContentLoaded", load);
})();
