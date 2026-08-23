/* 현학적 연구소 보안 뷰어 — 페이지 타일을 캔버스에 그리며 계정 워터마크를 같은 캔버스에 합성.
   원본 PDF 는 절대 받지 않는다. <img> 가 아닌 캔버스라 워터마크는 DOM 제거로 지울 수 없다(T5/T9). */
(function () {
  "use strict";
  var API = location.hostname === "localhost" || location.protocol === "file:"
    ? "http://localhost:8799" : "https://api.hyunhak.com";
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), msg = $("msg"), titleEl = $("title"), whoEl = $("who"),
      printBtn = $("printBtn"), curtain = $("curtain");

  var slug = new URLSearchParams(location.search).get("slug");
  var state = { token: null, pages: 0, email: "", drawn: {}, printing: false };

  // ---------- 자동화/AI 에이전트 지문 (T14) ----------
  // 정당 세션 에이전트를 물리 차단할 수는 없으나, 나이브한 headless·webdriver 는 거르고 서버에 신고한다.
  function automationSignals() {
    var s = [];
    try { if (navigator.webdriver) s.push("webdriver"); } catch (e) {}
    // headless Chrome 지문
    try { if (/headless/i.test(navigator.userAgent)) s.push("headless-ua"); } catch (e) {}
    try { if (navigator.languages && navigator.languages.length === 0) s.push("no-langs"); } catch (e) {}
    try { if (!navigator.plugins || (navigator.plugins.length === 0 && /Chrome/.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent))) s.push("no-plugins"); } catch (e) {}
    // CDP(Chrome DevTools Protocol) 흔적 — 일부 자동화가 남기는 전역
    try { if (window.cdc_adoQpoasnfa76pfcZLmcfl_Array || window.__playwright || window.__puppeteer_evaluation_script__ || window.__nightmare) s.push("cdp"); } catch (e) {}
    return s;
  }
  function reportEvent(kind) {
    try {
      fetch(API + "/api/reader/event", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug, platform: "web", kind: kind }),
        keepalive: true,
      });
    } catch (e) {}
  }
  function block(text) {
    curtain.textContent = text;
    curtain.style.display = "flex";
  }

  // ---------- 저수준 페이지 fetch (토큰은 Authorization 헤더) ----------
  function fetchPage(p, res) {
    return fetch(API + "/api/reader/page?slug=" + encodeURIComponent(slug) + "&p=" + p + "&res=" + res, {
      credentials: "include",
      headers: { "Authorization": "Bearer " + state.token },
    });
  }

  // ---------- 캔버스 렌더 + 워터마크 합성 ----------
  function drawPage(canvas, bitmap) {
    var maxW = Math.min(window.innerWidth * 0.94, 900);
    var scale = maxW / bitmap.width;
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    canvas.style.width = Math.round(bitmap.width * scale) + "px";
    var ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    // 계정 워터마크 — 페이지와 같은 캔버스에 구움 (분리 불가)
    var W = canvas.width, H = canvas.height;
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#6b6560";
    ctx.font = Math.round(W / 42) + "px 'Apple SD Gothic Neo',sans-serif";
    ctx.textBaseline = "middle";
    var stamp = "현학적 연구소  " + state.email;
    var stampB = "玄學的 硏究所  무단복제금지";
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-28 * Math.PI / 180);
    var stepX = W / 2.2, stepY = H / 7;
    for (var y = -H; y < H; y += stepY) {
      for (var x = -W; x < W; x += stepX) {
        ctx.fillText(stamp, x, y);
        ctx.fillText(stampB, x, y + stepY / 2);
      }
    }
    ctx.restore();
    // 우하단 진한 표식 1개 (스크린샷 crop 대비)
    ctx.save();
    ctx.globalAlpha = 0.5; ctx.fillStyle = "#312E2E";
    ctx.font = "bold " + Math.round(W / 55) + "px sans-serif";
    ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.fillText("© 현학적 연구소 · " + state.email, W - 14, H - 10);
    ctx.restore();
  }

  function makeCanvas() {
    var c = document.createElement("canvas");
    c.className = "pg";
    c.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    return c;
  }

  // 지연 로드: 화면 근처 페이지만 fetch (전량 선수집 방지)
  function loadInto(canvas, p) {
    if (state.drawn[p]) return;
    state.drawn[p] = true;
    var res = window.devicePixelRatio > 1.3 ? 2400 : 1600;
    fetchPage(p, res).then(function (r) {
      if (r.status === 401) { state.drawn[p] = false; return reopen().then(function () { loadInto(canvas, p); }); }
      if (!r.ok) throw new Error("page " + p + " " + r.status);
      return r.blob();
    }).then(function (blob) {
      if (!blob) return;
      return createImageBitmap(blob).then(function (bmp) {
        drawPage(canvas, bmp); bmp.close && bmp.close();
      });
    }).catch(function (e) { state.drawn[p] = false; console.error(e); });
  }

  // 토큰 만료 시 재발급 (세션 살아있는 동안)
  function reopen() {
    return fetch(API + "/api/reader/open", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: slug }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.token) state.token = d.token; else block("세션이 만료되었습니다. 다시 로그인해 주세요.");
    });
  }

  // ---------- 인쇄 (공식 경로) ----------
  function doPrint() {
    if (state.printing) return; state.printing = true;
    printBtn.disabled = true; printBtn.textContent = "인쇄본 준비 중…";
    var idem = "web-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    fetch(API + "/api/reader/print", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: slug, idem: idem }),
    }).then(function (r) {
      if (r.status === 403) return r.json().then(function (d) { throw new Error(d.error || "인쇄할 수 없습니다"); });
      if (!r.ok) throw new Error("인쇄 생성 실패");
      return r.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var f = document.createElement("iframe");
      f.style.position = "fixed"; f.style.right = "0"; f.style.bottom = "0";
      f.style.width = "0"; f.style.height = "0"; f.style.border = "0";
      f.src = url; document.body.appendChild(f);
      f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} };
      printBtn.textContent = "인쇄";
    }).catch(function (e) {
      alert(e.message || "인쇄에 실패했습니다");
      printBtn.textContent = "인쇄";
    }).finally(function () { state.printing = false; printBtn.disabled = false; });
  }

  // ---------- 부팅 ----------
  function boot() {
    if (!slug) { msg.textContent = "잘못된 접근입니다."; return; }
    var sig = automationSignals();
    if (sig.length >= 2) { reportEvent("automation"); block("지원하지 않는 접속 환경입니다.\n일반 브라우저에서 로그인 후 이용해 주세요."); return; }

    fetch(API + "/api/reader/open", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: slug }),
    }).then(function (r) {
      if (r.status === 401) { location.href = "login.html?next=" + encodeURIComponent("reader.html?slug=" + slug); throw "redirect"; }
      return r.json().then(function (d) { d._status = r.status; return d; });
    }).then(function (d) {
      if (d._status === 403) { msg.innerHTML = "구매 후 열람할 수 있는 자료입니다. <a href='store.html'>스토어로</a>"; return; }
      if (!d.token) { msg.textContent = d.error || "열 수 없습니다."; return; }
      state.token = d.token; state.pages = d.pages; state.email = d.email || "";
      titleEl.textContent = d.title || "현학적 연구소";
      whoEl.textContent = state.email;
      printBtn.hidden = false;
      printBtn.addEventListener("click", doPrint);
      render();
    }).catch(function (e) { if (e !== "redirect") { msg.textContent = "불러오지 못했습니다."; console.error(e); } });
  }

  function render() {
    msg.remove();
    var canvases = [];
    for (var p = 1; p <= state.pages; p++) {
      var c = makeCanvas(); c.dataset.p = p; stage.appendChild(c); canvases.push(c);
    }
    // 뷰포트 근처만 로드
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) loadInto(en.target, Number(en.target.dataset.p));
      });
    }, { root: stage, rootMargin: "800px 0px" });
    canvases.forEach(function (c) { io.observe(c); });
  }

  // 앱 스위처·백그라운드 미리보기 대비: 숨김 시 커튼
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { document.getElementById("stage").style.filter = "blur(22px)"; }
    else { document.getElementById("stage").style.filter = ""; }
  });
  // 런타임 자동화 재검사(지연 주입 대비)
  setInterval(function () {
    if (automationSignals().length >= 2 && curtain.style.display !== "flex") {
      reportEvent("automation"); block("지원하지 않는 접속 환경입니다.");
    }
  }, 4000);

  boot();
})();
