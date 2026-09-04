/* 현학적 연구소 보안 뷰어 v2 — 페이지 타일을 캔버스에 그리며 계정 워터마크를 같은 캔버스에 합성.
   원본 PDF 는 절대 받지 않는다. <img> 가 아닌 캔버스라 워터마크는 DOM 제거로 지울 수 없다(T5/T9).
   v2 (2026-08-28, DESIGN_v2_toc_search.md + Codex r1 반영): 접히는 사이드바(목차 트리, 검색), 페이지 이동, 확대/축소,
   이어읽기, 키보드. 검색은 서버가 스니펫과 좌표만 준다 (전문 텍스트는 내려오지 않는다, T15).
   DOM 삽입은 전부 textContent/createElement (innerHTML 에 서버 문자열 금지). */
(function () {
  "use strict";
  var API = location.hostname === "localhost" || location.protocol === "file:"
    ? "http://localhost:8799" : "https://api.hyunhak.com";
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), msg = $("msg"), titleEl = $("title"), whoEl = $("who"),
      printBtn = $("printBtn"), curtain = $("curtain"), side = $("side"), sideBtn = $("sideBtn"),
      sideClose = $("sideClose"), scrim = $("scrim"), tocEl = $("toc"), tocPane = $("tocPane"),
      findPane = $("findPane"), qEl = $("q"), hitsEl = $("hits"), findMsg = $("findMsg"),
      findCount = $("findCount"), prevBtn = $("prevHit"), nextBtn = $("nextHit"),
      pager = $("pager"), pageIn = $("pageIn"), pageN = $("pageN"), zoomEl = $("zoom"),
      searchBtn = $("searchBtn"), toast = $("toast");

  var slug = new URLSearchParams(location.search).get("slug");
  var state = { token: null, pages: 0, email: "", drawn: {}, printing: false, dead: false,
                toc: [], search: false, wraps: [], cur: 1, zoom: 2,
                hits: [], hitIdx: -1, hitPages: {}, reqSeq: 0, searchCtl: null };
  var ZOOMS = [640, 760, 900, 1040, 1200, 1400, 1600];
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ---------- 자동화/AI 에이전트 지문 (T14) ----------
  // 정당 세션 에이전트를 물리 차단할 수는 없으나, 나이브한 headless·webdriver 는 거르고 서버에 신고한다.
  function automationSignals() {
    var s = [];
    try { if (navigator.webdriver) s.push("webdriver"); } catch (e) {}
    try { if (/headless/i.test(navigator.userAgent)) s.push("headless-ua"); } catch (e) {}
    try { if (navigator.languages && navigator.languages.length === 0) s.push("no-langs"); } catch (e) {}
    try { if (!navigator.plugins || (navigator.plugins.length === 0 && /Chrome/.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent))) s.push("no-plugins"); } catch (e) {}
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
  // terminal latch (Codex r3): block 뒤 IntersectionObserver 재진입이 새 reopen 주기를 시작하지 못하게 잠근다
  function block(text) { state.dead = true; curtain.textContent = text; curtain.style.display = "flex"; }

  // ---------- v3: 동시 세션 밀려남(409) ----------
  // 서버가 401 대신 409 를 주는 이유: 401 은 reopen() 이 조용히 재발급해 상한이 무력화된다.
  // 재진입은 사람 손(버튼 클릭 → 새로고침 → open 재등록)으로만 — 이 마찰이 규모 통제의 본체.
  var evictShown = false;
  function evictOverlay(text) {
    if (evictShown) return; evictShown = true;
    state.dead = true;   // 밀려난 상태도 terminal — 재진입은 버튼(새로고침)만
    var ov = el("div", "evict");
    ov.style.cssText = "position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(22,20,19,.93);color:#fff;text-align:center;padding:28px;font-size:16px;line-height:1.6";
    ov.appendChild(el("p", null, text || "다른 기기에서 열람을 시작하여 이 기기의 열람이 중단되었습니다."));
    var bt = el("button", null, "이 기기에서 계속 보기");
    bt.style.cssText = "padding:10px 24px;font-size:15px;cursor:pointer";
    bt.addEventListener("click", function () { location.reload(); });
    ov.appendChild(bt);
    document.body.appendChild(ov);
  }
  // v3: 페이지 열람 거부 응답 분기 — 409 = 밀려남, 일일 예산 code = 종일 차단, 그 외 429 = 속도 초과(회복 가능)
  // 문자열 매칭 대신 서버의 기계 판별 code 필드로 분기 (Codex E-1)
  function pageDenied(status, d) {
    var text = String((d && d.error) || "");
    if (status === 409) { evictOverlay(text); return; }
    if (d && (d.code === "daily_limit" || d.code === "doc_limit")) block(text);
    else showToast(text || "열람 속도가 너무 빠릅니다. 잠시 후 다시 스크롤해 주세요.");
  }

  // ---------- 공통 ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var toastTimer = null;
  function showToast(text, ms) {
    toast.textContent = text; toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, ms || 2600);
  }
  function authFetch(path, opt) {
    opt = opt || {};
    opt.credentials = "include";
    opt.headers = Object.assign({ "Authorization": "Bearer " + state.token }, opt.headers || {});
    return fetch(API + path, opt);
  }
  // 토큰 만료 시 재발급 (세션 살아있는 동안). singleflight: 동시 401 이 /open 발급 한도를 소진하지 않게 (Codex r1 #14)
  var refreshing = null;
  // auto:true = 자동 갱신 표식 — 서버는 밀려난 세션의 auto 를 409 로 거부한다 (사람 손 재진입만, Codex A-3)
  // 실패는 throw 로 전파 — 옛 토큰으로 재시도하는 무한 루프 차단 (Codex A-4)
  function reopen() {
    if (refreshing) return refreshing;
    refreshing = fetch(API + "/api/reader/open", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: slug, auto: true, sig: automationSignals() }),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (d.token) { state.token = d.token; return; }
        if (r.status === 409) evictOverlay(String(d.error || ""));
        else block(String(d.error || "세션이 만료되었습니다. 다시 로그인해 주세요."));
        throw new Error("reopen " + r.status);
      });
    }).catch(function (e) {
      // 네트워크 실패도 빈 화면 대신 terminal 안내 (Codex r2 #5)
      if (!e || String(e.message).indexOf("reopen ") !== 0) block("연결에 실패했습니다. 네트워크 확인 후 새로고침해 주세요.");
      throw e;
    }).finally(function () { refreshing = null; });
    return refreshing;
  }

  // ---------- 페이지 렌더 + 워터마크 합성 ----------
  function fetchPage(p, res) {
    return authFetch("/api/reader/page?slug=" + encodeURIComponent(slug) + "&p=" + p + "&res=" + res);
  }
  function drawPage(canvas, bitmap) {
    canvas.width = bitmap.width; canvas.height = bitmap.height;
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
  function makeWrap(p) {
    var w = el("div", "pgwrap"); w.dataset.p = p;
    var c = el("canvas", "pg");
    w.appendChild(c); w.appendChild(el("span", "no", String(p)));
    w.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    return w;
  }
  // 지연 로드: 화면 근처 페이지만 fetch (전량 선수집 방지)
  function loadInto(wrap, p, retried) {
    if (state.dead || state.drawn[p]) return;
    state.drawn[p] = true;
    var res = window.devicePixelRatio > 1.3 ? 2400 : 1600;
    fetchPage(p, res).then(function (r) {
      if (state.dead) return;   // dead 전에 출발한 응답의 늦은 reopen 재시작 차단 (Codex r4 nit)
      if (r.status === 401) {
        state.drawn[p] = false;
        if (retried) {   // 재발급 후에도 401 = 빈 화면 대신 terminal 안내로 중단 (Codex A-4, r2 #5)
          block("세션이 만료되었습니다. 다시 로그인해 주세요.");
          throw new Error("page " + p + " 401 twice");
        }
        return reopen().then(function () { loadInto(wrap, p, true); });
      }
      if (r.status === 409 || r.status === 429) {
        state.drawn[p] = false;
        return r.json().catch(function () { return {}; }).then(function (d) { pageDenied(r.status, d); });
      }
      if (!r.ok) throw new Error("page " + p + " " + r.status);
      return r.blob();
    }).then(function (blob) {
      if (!blob) return;
      return createImageBitmap(blob).then(function (bmp) {
        drawPage(wrap.firstChild, bmp); bmp.close && bmp.close();
        wrap.classList.add("ld");
      });
    }).catch(function (e) { state.drawn[p] = false; console.error(e); });
  }

  // ---------- 이동 · 현재 페이지 · 확대 ----------
  function clampPage(n) { n = Math.round(Number(n)); if (!isFinite(n)) return 1; return Math.max(1, Math.min(state.pages, n)); }
  function jump(p, y, instant) {
    p = clampPage(p);
    var w = state.wraps[p - 1]; if (!w) return;
    var top = w.offsetTop - 12 + (y ? Math.max(0, Math.min(1, y)) * w.offsetHeight : 0);
    // 두 화면 넘게 멀면 즉시 이동 (긴 부드러운 스크롤은 어지럽고, 도착까지 1초 넘게 걸린다)
    if (!instant && Math.abs(top - stage.scrollTop) > stage.clientHeight * 2) instant = true;
    if (instant) { var sb = stage.style.scrollBehavior; stage.style.scrollBehavior = "auto"; stage.scrollTop = top; stage.style.scrollBehavior = sb; }
    else stage.scrollTo({ top: top, behavior: "smooth" });
  }
  function setCurrent(p) {
    if (p === state.cur) return;
    state.cur = p;
    if (document.activeElement !== pageIn) pageIn.value = p;
    tocSpy(p);
    savePos(p);
  }
  var spyTick = false;
  // 현재 페이지 = 보이는 세로 픽셀이 가장 큰 래퍼 (rAF 1회/스크롤)
  function computeCurrent() {
    spyTick = false;
    var vt = stage.scrollTop, vb = vt + stage.clientHeight, best = state.cur, bestV = -1;
    for (var i = 0; i < state.wraps.length; i++) {
      var w = state.wraps[i], t = w.offsetTop, b = t + w.offsetHeight;
      var v = Math.min(b, vb) - Math.max(t, vt);
      if (v > bestV) { bestV = v; best = i + 1; }
      if (t > vb) break;
    }
    setCurrent(best);
  }
  var saveTimer = null;
  function savePos(p) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { store.set("hh_reader_pos:" + slug, String(p)); }, 500);
  }
  function applyZoom(idx, fit) {
    var w;
    if (fit) { w = Math.max(480, stage.clientWidth - 24); store.set("hh_reader_zoom", "fit"); }
    else { idx = Math.max(0, Math.min(ZOOMS.length - 1, idx)); w = ZOOMS[idx]; store.set("hh_reader_zoom", String(idx)); }
    state.zoom = fit ? "fit" : idx;
    var keep = state.cur;
    document.documentElement.style.setProperty("--pgw", w + "px");
    // 폭이 바뀌면 같은 페이지가 보이도록 위치 유지
    requestAnimationFrame(function () { jump(keep, 0, true); });
  }
  function zoomStep(d) {
    var cur = state.zoom === "fit" ? 2 : state.zoom;
    applyZoom(cur + d, false);
  }

  // ---------- 사이드바 ----------
  function isNarrow() { return window.innerWidth < 1000; }
  function openSide(tab, remember) {
    side.hidden = false;
    sideBtn.setAttribute("aria-expanded", "true");
    sideBtn.classList.add("on");
    var narrow = isNarrow();
    scrim.hidden = !narrow;
    stage.inert = narrow;                         // 드로어가 본문을 덮는 동안 본문은 포커스 불가 (모달)
    if (tab) showTab(tab);
    if (remember !== false && !narrow) store.set("hh_reader_side", "1");
  }
  function closeSide(remember) {
    side.hidden = true;
    sideBtn.setAttribute("aria-expanded", "false");
    sideBtn.classList.remove("on");
    scrim.hidden = true;
    stage.inert = false;
    if (remember !== false) store.set("hh_reader_side", "0");
  }
  function showTab(tab) {
    var tabs = side.querySelectorAll(".tabs button[data-tab]");
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("on", tabs[i].dataset.tab === tab);
    tocPane.hidden = tab !== "toc";
    findPane.hidden = tab !== "find";
    if (tab === "find") { setTimeout(function () { qEl.focus(); qEl.select(); }, 30); }
  }

  // 목차 트리: l=1~3, 3단은 2단 아래 접힌 채 시작. 전부 textContent (서버 문자열 innerHTML 금지)
  function buildToc() {
    while (tocEl.firstChild) tocEl.removeChild(tocEl.firstChild);
    var items = state.toc || [];
    if (!items.length) {
      var li0 = el("li", null, "이 자료에는 목차 정보가 없습니다.");
      li0.style.cssText = "padding:10px 8px;color:var(--ash);font-size:13px";
      tocEl.appendChild(li0); return;
    }
    var stack = [{ ul: tocEl, l: 0 }];
    items.forEach(function (it, i) {
      var l = Math.min(3, Math.max(1, Number(it.l) || 1));
      var p = Math.max(1, Math.min(state.pages, Number(it.p) || 1));
      while (stack.length > 1 && stack[stack.length - 1].l >= l) stack.pop();
      var parent = stack[stack.length - 1];
      var li = el("li", "l" + l); li.dataset.i = i;
      var row = el("div", "row");
      var tg = el("button", "tg", "▸"); tg.hidden = true; tg.type = "button";
      tg.setAttribute("aria-label", "하위 항목 펼치기");
      var bt = el("button", "it"); bt.type = "button";
      bt.appendChild(document.createTextNode(String(it.t || "")));
      bt.appendChild(el("span", "pn", String(p)));
      bt.dataset.p = p; bt.dataset.y = Math.max(0, Math.min(1, Number(it.y) || 0));
      row.appendChild(tg); row.appendChild(bt); li.appendChild(row);
      var sub = el("ul"); li.appendChild(sub);
      parent.ul.appendChild(li);
      // 부모에 자식이 생기면 토글 표시. 3단 자식은 접힌 채로.
      if (parent.li) {
        var ptg = parent.li.querySelector(":scope > .row > .tg");
        if (ptg.hidden) { ptg.hidden = false; if (l === 3) { parent.li.classList.add("fold"); } }
      }
      stack.push({ ul: sub, l: l, li: li });
    });
  }
  tocEl.addEventListener("click", function (e) {
    var tg = e.target.closest(".tg");
    if (tg) {
      var li = tg.closest("li"); var folded = li.classList.toggle("fold");
      tg.textContent = folded ? "▸" : "▾"; return;
    }
    var bt = e.target.closest(".it");
    if (!bt) return;
    if (isNarrow()) closeSide(false);
    jump(Number(bt.dataset.p), Number(bt.dataset.y));
    stage.focus({ preventScroll: true });
  });
  function tocSpy(p) {
    var bts = tocEl.querySelectorAll(".it"), best = null;
    for (var i = 0; i < bts.length; i++) { if (Number(bts[i].dataset.p) <= p) best = bts[i]; else break; }
    var prev = tocEl.querySelector('.it[aria-current="true"]');
    if (prev === best) return;
    if (prev) prev.removeAttribute("aria-current");
    if (best) {
      best.setAttribute("aria-current", "true");
      // 접힌 3단 안이면 펼친다
      var li = best.closest("li"); var anc = li.parentElement.closest("li");
      while (anc) { if (anc.classList.contains("fold")) { anc.classList.remove("fold"); anc.querySelector(":scope > .row > .tg").textContent = "▾"; } anc = anc.parentElement.closest("li"); }
      if (!side.hidden && !tocPane.hidden) best.scrollIntoView({ block: "nearest" });
    }
  }

  // ---------- 검색 ----------
  function clearHighlights() {
    var hs = stage.querySelectorAll(".hl");
    for (var i = 0; i < hs.length; i++) hs[i].remove();
  }
  function paintHighlights() {
    clearHighlights();
    var byPage = state.hitPages;
    Object.keys(byPage).forEach(function (p) {
      var w = state.wraps[Number(p) - 1]; if (!w) return;
      byPage[p].forEach(function (hi) {
        var h = state.hits[hi];
        h.r.forEach(function (rc) {
          var d = el("div", "hl" + (hi === state.hitIdx ? " on" : ""));
          d.setAttribute("aria-hidden", "true");
          d.style.left = (rc[0] * 100) + "%"; d.style.top = (rc[1] * 100) + "%";
          d.style.width = (Math.max(0.004, rc[2] - rc[0]) * 100) + "%";
          d.style.height = (Math.max(0.004, rc[3] - rc[1]) * 100) + "%";
          w.appendChild(d);
        });
      });
    });
  }
  // 스니펫에 <mark> — 서버는 공백을 무시해 매칭하므로 같은 방식으로 찾는다. 전부 텍스트 노드.
  function snippetNodes(s, q) {
    var frag = document.createDocumentFragment();
    var chars = q.replace(/\s+/g, "").split("").map(function (c) { return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
    var m = null;
    if (chars.length) { try { m = new RegExp(chars.join("\\s*"), "i").exec(s); } catch (e) { m = null; } }
    if (!m) { frag.appendChild(document.createTextNode(s)); return frag; }
    frag.appendChild(document.createTextNode(s.slice(0, m.index)));
    frag.appendChild(el("mark", null, m[0]));
    frag.appendChild(document.createTextNode(s.slice(m.index + m[0].length)));
    return frag;
  }
  function resetHits() {
    while (hitsEl.firstChild) hitsEl.removeChild(hitsEl.firstChild);
    state.hits = []; state.hitPages = {}; state.hitIdx = -1;
    clearHighlights();
    prevBtn.disabled = nextBtn.disabled = true;
    findCount.textContent = "";
  }
  function renderHits(d) {
    resetHits();
    var n = 0;
    (d.pages || []).forEach(function (pg) {
      var shown = pg.hits.length < pg.n ? " (" + pg.hits.length + "건 표시)" : "";
      hitsEl.appendChild(el("li", "ph", pg.p + "면 ｜ " + pg.n + "건" + shown));
      pg.hits.forEach(function (h) {
        var li = el("li");
        var bt = el("button", "hit"); bt.type = "button"; bt.dataset.i = n;
        bt.appendChild(snippetNodes(String(h.s || ""), String(d.q || "")));
        li.appendChild(bt); hitsEl.appendChild(li);
        state.hits.push({ p: pg.p, r: Array.isArray(h.r) ? h.r : [], s: h.s });
        (state.hitPages[pg.p] = state.hitPages[pg.p] || []).push(n);
        n++;
      });
    });
    if (!d.total) findMsg.textContent = "검색 결과가 없습니다.";
    else if (d.truncated) findMsg.textContent = "결과가 많아 일부만 표시합니다. 검색어를 더 구체적으로 입력해 보세요.";
    else findMsg.textContent = "";
    prevBtn.disabled = nextBtn.disabled = !n;
    if (n) gotoHit(0, true);
  }
  function gotoHit(i, quiet) {
    if (!state.hits.length) return;
    i = (i + state.hits.length) % state.hits.length;
    state.hitIdx = i;
    var h = state.hits[i];
    var prev = hitsEl.querySelector(".hit.on"); if (prev) prev.classList.remove("on");
    var cur = hitsEl.querySelector('.hit[data-i="' + i + '"]');
    if (cur) { cur.classList.add("on"); if (!quiet) cur.scrollIntoView({ block: "nearest" }); }
    findCount.textContent = (i + 1) + " / " + state.hits.length;
    paintHighlights();
    var y = h.r.length ? Math.max(0, h.r[0][1] - 0.12) : 0;
    jump(h.p, y, false);
  }
  var qTimer = null;
  // 입력이 바뀌면 그 즉시 진행 중 요청을 버린다 (디바운스 300ms 안에 옛 응답이 그려지는 경쟁 차단, Codex r2 M6)
  function dropInflight() {
    clearTimeout(qTimer);
    state.reqSeq++;
    if (state.searchCtl) { state.searchCtl.abort(); state.searchCtl = null; }
  }
  function onQuery(e) {
    if (e && e.isComposing) { dropInflight(); return; }   // 한글 조합 중에는 보내지 않는다 (compositionend 에서 실행)
    dropInflight();
    var q = qEl.value.trim();
    if (q.replace(/\s+/g, "").length < 2) {
      resetHits();
      findMsg.textContent = q ? "2자 이상 입력해 주세요." : "";
      return;
    }
    qTimer = setTimeout(function () { runSearch(q, false); }, 300);
  }
  function runSearch(q, retried) {
    if (state.dead) return;
    if (state.searchCtl) state.searchCtl.abort();
    var ctl = new AbortController(); state.searchCtl = ctl;
    var seq = ++state.reqSeq;
    findMsg.textContent = "검색 중…";
    authFetch("/api/reader/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slug, q: q }), signal: ctl.signal,
    }).then(function (r) {
      if (state.dead || seq !== state.reqSeq) return null;
      if (r.status === 401 && !retried) return reopen().then(function () { if (seq === state.reqSeq) runSearch(q, true); return null; });
      return r.json().then(function (d) { d._status = r.status; return d; });
    }).then(function (d) {
      if (!d || seq !== state.reqSeq) return;
      if (d._status === 200) { renderHits(d); return; }
      resetHits();
      if (d._status === 409) { evictOverlay(String(d.error || "")); findMsg.textContent = "열람이 중단되었습니다."; }
      else if (d._status === 429) findMsg.textContent = String(d.error || "검색이 너무 잦습니다. 잠시 후 다시 시도해 주세요.");
      else if (d._status === 404) findMsg.textContent = "이 자료는 본문 검색을 지원하지 않습니다.";
      else if (d._status === 503) findMsg.textContent = "검색 색인을 준비하는 중입니다. 잠시 후 다시 시도해 주세요.";
      else findMsg.textContent = String(d.error || "검색에 실패했습니다.");
    }).catch(function (e) {
      if (e && e.name === "AbortError") return;
      if (seq === state.reqSeq) findMsg.textContent = "검색에 실패했습니다.";
      console.error(e);
    });
  }
  qEl.addEventListener("input", onQuery);
  qEl.addEventListener("compositionstart", dropInflight);
  qEl.addEventListener("compositionend", function () { onQuery(null); });
  qEl.addEventListener("keydown", function (e) {
    if (e.isComposing) return;
    if (e.key === "Enter") { e.preventDefault(); if (state.hits.length) gotoHit(state.hitIdx + (e.shiftKey ? -1 : 1)); else runSearch(qEl.value.trim(), false); }
    else if (e.key === "Escape") { e.preventDefault(); if (isNarrow()) closeSide(false); else closeSide(false); stage.focus(); }
  });
  prevBtn.addEventListener("click", function () { gotoHit(state.hitIdx - 1); });
  nextBtn.addEventListener("click", function () { gotoHit(state.hitIdx + 1); });
  hitsEl.addEventListener("click", function (e) {
    var bt = e.target.closest(".hit"); if (!bt) return;
    if (isNarrow()) closeSide(false);
    gotoHit(Number(bt.dataset.i), true);
  });

  // ---------- 인쇄 (공식 경로) ----------
  // 숨은 iframe + contentWindow.print() 는 Safari/Firefox 가 PDF 대신 부모 문서(빈 면)를
  // 인쇄 대상으로 잡는다 → 새 탭에 스탬프 PDF 를 열고 그 탭에서 인쇄하는 단일 경로.
  // 팝업 차단 회피: 클릭 제스처 안에서 동기로 창을 먼저 열고, 응답 후 blob 으로 이동만 한다.
  function doPrint() {
    if (state.printing) return; state.printing = true;
    printBtn.disabled = true; printBtn.textContent = "인쇄본 준비 중…";
    var w = window.open("", "_blank");
    if (w) {
      try {
        w.document.title = "인쇄본 준비 중";
        var msg = w.document.createElement("p");
        msg.textContent = "인쇄본 준비 중입니다. 몇 초 걸립니다.";
        msg.style.cssText = "font:14px sans-serif;padding:24px";
        w.document.body.appendChild(msg);
      } catch (e) {}
    }
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
      if (w && !w.closed) {
        w.location.replace(url);
        showToast("새 탭에 인쇄본을 열었습니다. 그 화면에서 인쇄(⌘P)해 주세요", 5000);
      } else {
        // 팝업이 차단된 경우의 보조 경로 (Chromium 은 iframe 인쇄가 동작한다)
        var f = el("iframe");
        f.style.position = "fixed"; f.style.right = "0"; f.style.bottom = "0";
        f.style.width = "0"; f.style.height = "0"; f.style.border = "0";
        f.src = url; document.body.appendChild(f);
        f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} };
      }
      printBtn.textContent = "인쇄";
    }).catch(function (e) {
      if (w && !w.closed) { try { w.close(); } catch (e2) {} }
      showToast(e.message || "인쇄에 실패했습니다", 3500);
      printBtn.textContent = "인쇄";
    }).finally(function () { state.printing = false; printBtn.disabled = false; });
  }

  // ---------- 키보드 · 바 ----------
  function inInput(e) { return e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA"); }
  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.isComposing) return;
    var k = e.key;
    if ((e.ctrlKey || e.metaKey) && (k === "f" || k === "F")) {          // 브라우저 찾기 대신 뷰어 검색
      if (!state.search) return;
      e.preventDefault(); openSide("find"); return;
    }
    if (k === "Escape") {
      if (!side.hidden && (isNarrow() || inInput(document.activeElement))) { e.preventDefault(); closeSide(false); stage.focus(); }
      return;
    }
    if (inInput(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === "ArrowRight" || (k === "PageDown" && e.shiftKey)) { e.preventDefault(); jump(state.cur + 1, 0); }
    else if (k === "ArrowLeft" || (k === "PageUp" && e.shiftKey)) { e.preventDefault(); jump(state.cur - 1, 0); }
    else if (k === "Home") { e.preventDefault(); jump(1, 0); }
    else if (k === "End") { e.preventDefault(); jump(state.pages, 0); }
    else if (k === "+" || k === "=") { e.preventDefault(); zoomStep(1); }
    else if (k === "-") { e.preventDefault(); zoomStep(-1); }
    else if (k === "t" || k === "T") { e.preventDefault(); if (side.hidden) openSide("toc"); else closeSide(); }
  });
  sideBtn.addEventListener("click", function () { if (side.hidden) openSide("toc"); else closeSide(); });
  sideClose.addEventListener("click", function () { closeSide(); stage.focus(); });
  scrim.addEventListener("click", function () { closeSide(false); });
  searchBtn.addEventListener("click", function () { openSide("find"); });
  side.querySelector(".tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-tab]"); if (b) showTab(b.dataset.tab);
  });
  function goPageInput() {
    var n = clampPage(pageIn.value); pageIn.value = n; jump(n, 0); stage.focus({ preventScroll: true });
  }
  pageIn.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); goPageInput(); } });
  pageIn.addEventListener("change", goPageInput);
  pageIn.addEventListener("focus", function () { pageIn.select(); });
  zoomEl.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-z]"); if (!b) return;
    if (b.dataset.z === "fit") applyZoom(0, true); else zoomStep(b.dataset.z === "+" ? 1 : -1);
  });
  stage.addEventListener("scroll", function () {
    if (!spyTick) { spyTick = true; requestAnimationFrame(computeCurrent); }
  }, { passive: true });
  window.addEventListener("resize", function () {
    if (!side.hidden) { var narrow = isNarrow(); scrim.hidden = !narrow; stage.inert = narrow; }
    if (state.zoom === "fit") applyZoom(0, true);
  });

  // ---------- 부팅 ----------
  // 오류 상태에서도 사이트로 돌아갈 길을 남긴다 (리더는 셸이 없는 단독 표면)
  function fail(text) {
    while (msg.firstChild) msg.removeChild(msg.firstChild);
    msg.appendChild(document.createTextNode(text));
    var p = el("p"); p.style.cssText = "margin-top:20px;font-size:13px";
    [["my.html", "내 자료실"], ["guidebook/index.html", "가이드북 목록"], ["index.html", "연구소 홈"]].forEach(function (x, i) {
      if (i) p.appendChild(document.createTextNode("   "));
      var a = el("a", null, x[1]); a.href = x[0]; p.appendChild(a);
    });
    msg.appendChild(p);
  }

  function boot() {
    if (!slug) { fail("잘못된 접근입니다."); return; }
    // 프레임 안 렌더 금지 (meta CSP 의 frame-ancestors 는 브라우저가 무시한다. Codex r1 #15)
    try { if (window.top !== window.self) { block("프레임 안에서는 열 수 없습니다. hyunhak.com 에서 직접 열어 주세요."); return; } } catch (e) { block("프레임 안에서는 열 수 없습니다."); return; }
    // 자동화 신호는 서버에 실어 보내 서버가 판정한다 (2026-08-30): 예외 회원(automation_exempt, 개발자 QA)은 토큰을 받고,
    // 그 외는 토큰 없이 403 code=automation 으로 막힌다. 신호 2개 이상이어도 토큰 발급 전이라 본문은 새지 않는다.
    var sig = automationSignals();

    fetch(API + "/api/reader/open", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: slug, sig: sig }),
    }).then(function (r) {
      if (r.status === 401) { location.href = "login.html?next=" + encodeURIComponent("reader.html?slug=" + slug); throw "redirect"; }
      return r.json().then(function (d) { d._status = r.status; return d; });
    }).then(function (d) {
      if (d._status === 403 && d.code === "automation") { block("지원하지 않는 접속 환경입니다.\n일반 브라우저에서 로그인 후 이용해 주세요."); return; }
      if (d._status === 403) { fail("구매 후 열람할 수 있는 자료입니다."); return; }
      if (!d.token) { fail(String(d.error || "열 수 없습니다.")); return; }
      state.token = d.token; state.pages = d.pages; state.email = String(d.email || ""); state.exempt = !!d.exempt;
      state.toc = Array.isArray(d.toc) ? d.toc : []; state.search = !!d.search;
      if (Array.isArray(d.size) && d.size.length === 2 && d.size[0] > 0 && d.size[1] > 0)
        document.documentElement.style.setProperty("--pgar", d.size[0] + " / " + d.size[1]);
      titleEl.textContent = d.title || "현학적 연구소";
      document.title = (d.title || "현학적 연구소") + " — 보안 뷰어";
      whoEl.textContent = state.email;
      // 인쇄 한도 0 인 자료(체험판)는 버튼 자체를 띄우지 않는다. 서버는 403 으로 막지만
      // 뷰어가 그것을 모르면 누를 때마다 실패하는 버튼이 남는다.
      // 구 서버 응답에는 printable 이 없다 — 값이 없으면 종전대로 노출한다(하위 호환).
      if (d.printable !== false) {
        printBtn.hidden = false;
        printBtn.addEventListener("click", doPrint);
      }
      render();
    }).catch(function (e) { if (e !== "redirect") { fail("불러오지 못했습니다."); console.error(e); } });
  }

  function render() {
    msg.remove();
    // 확대 상태 복원
    var z = store.get("hh_reader_zoom");
    if (z === "fit") applyZoom(0, true); else applyZoom(z == null ? 2 : Number(z), false);
    state.wraps = [];
    for (var p = 1; p <= state.pages; p++) {
      var w = makeWrap(p); stage.appendChild(w); state.wraps.push(w);
    }
    pageN.textContent = state.pages; pageIn.value = 1; pager.hidden = false; zoomEl.hidden = false;
    searchBtn.hidden = !state.search;
    // 뷰포트 근처만 로드
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) loadInto(en.target, Number(en.target.dataset.p));
      });
    }, { root: stage, rootMargin: "800px 0px" });
    state.wraps.forEach(function (w) { io.observe(w); });

    buildToc();
    if (!state.search) { qEl.disabled = true; qEl.placeholder = "이 자료는 본문 검색을 지원하지 않습니다"; }
    // 사이드바: 기본 접힘. 넓은 화면에서 마지막 상태만 복원 (건우: 본문 보는 데 거슬리면 안 된다)
    if (!isNarrow() && store.get("hh_reader_side") === "1") openSide("toc", false);

    // 이어읽기: 마지막 페이지 복원
    var last = Number(store.get("hh_reader_pos:" + slug) || 0);
    if (last > 1 && last <= state.pages) {
      requestAnimationFrame(function () {
        jump(last, 0, true); setCurrent(last);
        showToast(last + "면부터 이어 봅니다. 처음으로 가려면 Home 키", 3200);
      });
    } else { tocSpy(1); }
    stage.focus({ preventScroll: true });
  }

  // 앱 스위처·백그라운드 미리보기 대비: 숨김 시 커튼
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { stage.style.filter = "blur(22px)"; }
    else { stage.style.filter = ""; }
  });
  // 런타임 자동화 재검사(지연 주입 대비). state.token 게이트 (aigate B3):
  // 초기 /open 응답(exempt 설정)보다 먼저 돌면 한 페이지 로드가 open 판정 + event 로 2회 계수되고
  // 예외 계정도 dead 로 고착된다 — 토큰을 받은 뒤부터만 재검사한다 (그 전 신호는 /open 의 sig 가 나른다).
  setInterval(function () {
    if (state.token && !state.exempt && automationSignals().length >= 2 && curtain.style.display !== "flex") {
      reportEvent("automation"); block("지원하지 않는 접속 환경입니다.");
    }
  }, 4000);

  boot();
})();
