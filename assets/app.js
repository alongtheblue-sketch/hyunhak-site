/* 현학적 연구소 공용 프론트 (세션, 장바구니, 네비 상태) */
(function () {
  const API = location.hostname === "localhost" || location.protocol === "file:"
    ? "http://localhost:8799" : "https://api.hyunhak.com";
  const CART_KEY = "hh_cart_v1";

  async function api(path, opt = {}) {
    const res = await fetch(API + path, Object.assign({
      credentials: "include",
      headers: opt.body ? { "Content-Type": "application/json" } : {},
    }, opt));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || ("오류 " + res.status)); e.status = res.status; e.code = data.code; throw e; }
    return data;
  }

  // 세트 id 계약 (PLAN 1-D, 서버와 같은 문자열): 5 단위 x 01~30.
  // 쿼리, 카탈로그, localStorage 어디서 온 값이든 이 정규식을 통과한 것만 화면과 주문 body 에 쓴다.
  const SET_ID_RE = /^(korea_2027_[hs]|yonsei_2027_[hs]|yonsei_intl_2027_i)(0[1-9]|[12][0-9]|30)$/;
  const UNITS = ["korea-hum", "korea-sci", "yonsei-hum", "yonsei-sci", "yonsei-intl"];
  const okSetId = (v) => SET_ID_RE.test(String(v == null ? "" : v));
  const okUnit = (v) => UNITS.indexOf(String(v == null ? "" : v)) >= 0;
  // 서버는 주문 1건에 같은 product 를 10줄까지 받는다. 11번째 줄은 주문 전체를 400 으로 떨어뜨린다
  const LINE_MAX = 10;

  // 유한 정수 강제 + 범위 절단. 화면에 넣는 수는 전부 이 함수를 지난다
  function intIn(v, lo, hi, dflt) {
    const n = Number(v);
    if (!Number.isFinite(n)) return dflt;
    const i = Math.trunc(n);
    return i < lo ? lo : (i > hi ? hi : i);
  }
  // localStorage 는 사용자가 고칠 수 있다. 읽는 즉시 스키마를 강제해 화면과 주문 body 양쪽을 지킨다.
  // 규격에 안 맞는 줄은 통째로 버린다 (수량에 문자열이 박혀 innerHTML 로 흘러가는 경로 차단)
  // 1개 한정 SKU (서버 pay.js: digital_file, bundle_view, bundle_file, lecture_common 은 qty≠1 → 400). cart.html single() 과 같은 집합
  const SINGLE_SKU = /^(guide-(all-view|all-pdf|.+-pdf)|lecture-common)$/;
  function normLine(x) {
    if (!x || typeof x !== "object" || Array.isArray(x)) return null;
    const sku = String(x.sku == null ? "" : x.sku);
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(sku)) return null;
    const line = {
      sku: sku,
      title: String(x.title == null ? "" : x.title).slice(0, 160),
      price: intIn(x.price, 0, 100000000, 0),
      // 정가. 구 저장분(list_price 없음)은 담을 당시 정가였으므로 price 를 정가로 승계한다 (할인 행사 2026-09-07)
      list_price: intIn(x.list_price == null ? x.price : x.list_price, 0, 100000000, 0),
      qty: intIn(x.qty, 1, LINE_MAX, 1),
      ship: !!x.ship,
    };
    // set_id 는 낱권에만 붙는다. 서버가 다른 상품의 set_id 를 400 으로 막으므로 조작된 줄 하나가
    // 주문 전체를 떨어뜨리지 않게 여기서 떼어 낸다
    if (line.sku === "passage-single" && okSetId(x.set_id)) line.set_id = String(x.set_id);
    if (line.set_id || SINGLE_SKU.test(line.sku)) line.qty = 1;   // 세트 결속 낱권과 1개 한정 상품(소장판, 전권 번들, 공통 풀이 인강)은 수량 1 (서버가 400 으로 강제한다)
    return line;
  }
  function rawCart() {
    let v;
    try { v = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
    if (!Array.isArray(v)) return [];   // 배열이 아니면 통째로 버린다 (객체면 filter 에서 예외가 난다)
    return v.map(normLine).filter((x) => x !== null);
  }
  // 세트가 지정되지 않았거나 계약 밖 set_id 를 단 낱권 줄. 서버가 passage-single 에 set_id 를 필수로
  // 요구해 이 줄 하나가 주문 전체를 400 으로 떨어뜨린다. 읽는 쪽에서 걸러 결제 경로에 닿지 않게 한다.
  function staleLine(x) { return String((x && x.sku) || "") === "passage-single" && !okSetId(x && x.set_id); }
  function cart() { return rawCart().filter((x) => !staleLine(x)).map(repriceLine); }
  // 저장본까지 한 번 정리하고 정리한 줄 수를 돌려준다 (장바구니 면이 안내 한 줄을 띄운다)
  function pruneCart() {
    const all = rawCart(), kept = all.filter((x) => !staleLine(x));
    const dropped = all.length - kept.length;
    if (dropped) saveCart(kept);
    return dropped;
  }
  function saveCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { return false; }
    updateNav();
    return true;
  }
  // 같은 sku 라도 set_id 가 다르면 별 줄 (PLAN s30: passage-single 은 세트 결속, 줄마다 수량 1)
  function sameLine(a, b) { return a.sku === b.sku && String(a.set_id || "") === String(b.set_id || ""); }
  // {sku,title,price,qty,ship,set_id} 를 받아 {ok, reason, message} 를 돌려준다.
  // 담기 거절(규격 밖 sku, 세트 없는 낱권, 같은 상품 10줄 초과, 저장 실패)은 부르는 면이 안내를 띄운다
  function addToCart(item) {
    const line = normLine(Object.assign({ qty: 1 }, item));
    if (!line) return { ok: false, reason: "sku", message: "담을 수 없는 상품입니다." };
    if (line.sku === "passage-single" && !line.set_id)
      return { ok: false, reason: "set", message: "지문 낱권은 지문 목록에서 세트를 고른 뒤 담아 주세요." };
    const items = cart();
    const hit = items.find((x) => sameLine(x, line));
    if (hit) {
      if (line.set_id || SINGLE_SKU.test(line.sku)) return { ok: true, already: true, message: "이미 담겨 있습니다. 이 상품은 1개만 구매합니다." };   // 수량 증가 없음, 결제 400 예방
      hit.qty = intIn(hit.qty + intIn(item.qty, 1, LINE_MAX, 1), 1, LINE_MAX, 1);
      if (!saveCart(items)) return { ok: false, reason: "storage", message: "브라우저 저장소에 장바구니를 저장하지 못했습니다. 저장소 설정과 여유 공간을 확인해 주세요." };
      trackAdd(line);
      return { ok: true };
    }
    if (items.filter((x) => x.sku === line.sku).length >= LINE_MAX)
      return { ok: false, reason: "limit",
        message: "같은 상품은 " + LINE_MAX + "줄까지 담을 수 있습니다. 먼저 결제하시거나 장바구니에서 줄을 빼 주세요." };
    items.push(repriceLine(line));
    if (!saveCart(items)) return { ok: false, reason: "storage", message: "브라우저 저장소에 장바구니를 저장하지 못했습니다. 저장소 설정과 여유 공간을 확인해 주세요." };
    trackAdd(line);
    return { ok: true };
  }
  // 전환 계측(2026-09-04): HH_TRACK 는 apply_analytics 가 head 에 정의(GA4 + Meta 픽셀 동시 발화). 없으면 조용히 건너뛴다
  function lineItem(x) { return { item_id: x.sku, item_name: x.title, price: x.price, quantity: x.qty || 1 }; }
  function track(name, params) { try { if (window.HH_TRACK) HH_TRACK(name, params); } catch (e) {} }
  function trackAdd(line) { track("add_to_cart", { currency: "KRW", value: line.price * (line.qty || 1), items: [lineItem(line)] }); }
  function cartTotal() { return cart().reduce((s, x) => s + x.price * x.qty, 0); }

  let _me = null;
  async function me(force) {
    if (_me !== null && !force) return _me;
    try { _me = (await api("/api/auth/me")); } catch (e) { _me = { member: null, error: (e && e.status === 401) ? null : ((e && e.status) || "network") }; }   // 401 = 비회원. 그 밖(네트워크, 5xx, 403)은 error 에 남겨 호출자가 가른다
    return _me;
  }

  // ── 간편 로그인 (구글, 카카오, 네이버) ──
  let _cfg = null;
  async function config() {
    if (_cfg) return _cfg;
    try { _cfg = await api("/api/config"); return _cfg; } catch { return { oauth: {}, _failed: true }; }   // 실패는 캐시하지 않는다 (다음 호출이 다시 시도)
  }
  const OAUTH_LABEL = { google: "구글", kakao: "카카오", naver: "네이버" };
  function oauthStart(provider, next) {
    location.href = API + "/api/auth/oauth/" + provider + "/start"
      + (next ? "?next=" + encodeURIComponent(next) : "");
  }
  const OAUTH_ERR = {
    provider: "아직 준비 중인 로그인입니다",
    rate: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요",
    state: "로그인 요청이 만료되었습니다. 다시 시도해 주세요",
    token: "제공사 인증에 실패했습니다. 다시 시도해 주세요",
    denied: "간편 로그인 동의를 취소했습니다",
    profile: "제공사에서 계정 정보를 받지 못했습니다",
    status: "이용할 수 없는 계정입니다. 문의해 주세요",
  };
  // 소셜 버튼 3개를 주어진 컨테이너에 그린다 (키 미주입 제공사는 '준비 중'으로 비활성)
  async function oauthButtons(el, next) {
    if (!el) return;
    const cfg = await config();
    const on = (cfg && cfg.oauth) || {};
    el.innerHTML = ["google", "kakao", "naver"].map(function (p) {
      const ok = !!on[p];
      return '<button type="button" class="soc soc-' + p + '"' + (ok ? "" : " disabled")
        + ' data-p="' + p + '">' + SOC_MARK[p]
        + '<span>' + OAUTH_LABEL[p] + (ok ? "로 계속하기" : " 준비 중") + '</span></button>';
    }).join("");
    el.querySelectorAll("button[data-p]").forEach(function (b) {
      b.addEventListener("click", function () { if (!b.disabled) oauthStart(b.dataset.p, next); });
    });
  }
  const SOC_MARK = {
    google: '<svg viewBox="0 0 18 18" width="17" height="17" aria-hidden="true"><path fill="#4285F4" d="M17.6 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.64-3.88 2.64-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.93a9 9 0 0 0 0 8.1l3.04-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .93 4.95l3.04 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>',
    kakao: '<svg viewBox="0 0 18 18" width="17" height="17" aria-hidden="true"><path fill="#191600" d="M9 1.5C4.86 1.5 1.5 4.16 1.5 7.44c0 2.1 1.38 3.94 3.46 4.99-.15.55-.55 2-.63 2.31-.1.39.14.38.3.28.13-.08 2.02-1.37 2.84-1.93.5.07 1.01.11 1.53.11 4.14 0 7.5-2.66 7.5-5.76S13.14 1.5 9 1.5z"/></svg>',
    naver: '<svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true"><path fill="#fff" d="M11.13 9.6 6.63 3H3v12h3.87V8.4l4.5 6.6H15V3h-3.87z"/></svg>',
  };

  // 금액 표기. 유한 정수만 통과시켜 화면에 NaN 이나 문자열이 그대로 실리지 않게 한다
  const won = (n) => intIn(n, 0, 100000000, 0).toLocaleString("ko-KR") + "원";

  // ── 할인 행사 (2026-09-07) ──
  // 원천은 서버 /api/config.promo 하나. 지면의 정가(data-list-price)와 장바구니 단가는 그 값을 따라 그리고,
  // 결제 금액은 서버가 다시 센다(pay.js salePrice 와 같은 산식: 정가 × (100-rate)% 를 10원 단위 내림).
  // _promo === undefined = 아직 모름(저장된 단가 유지) / null = 행사 없음 / 객체 = 행사 중
  let _promo;
  function promoActive(p, now) {
    if (!p || !Number.isInteger(p.rate) || p.rate <= 0 || p.rate >= 100) return false;
    const t = now || Date.now();
    const st = p.starts_at ? Date.parse(p.starts_at) : null, en = p.ends_at ? Date.parse(p.ends_at) : null;
    if (Number.isNaN(st) || Number.isNaN(en)) return false;
    if (st !== null && t < st) return false;
    if (en !== null && t > en) return false;
    return true;
  }
  function promo() { return _promo === undefined ? undefined : (promoActive(_promo) ? _promo : null); }
  function salePrice(price, p) {
    const q = p === undefined ? promo() : p;
    const n = intIn(price, 0, 100000000, 0);
    return q ? Math.floor((n * (100 - q.rate)) / 1000) * 10 : n;
  }
  function repriceLine(line) {
    const p = promo();
    if (p !== undefined) line.price = salePrice(line.list_price, p);
    return line;
  }
  // 지면 가격: [data-list-price] 안에서 처음 나오는 "N원" 텍스트를 정가 취소선 + 현재가로 바꾼다.
  // 표기 숫자와 속성값이 다르면 낡은 지면이므로 손대지 않고 콘솔에 남긴다.
  function renderPromoPrices() {
    const p = promo();
    // 서버 판정을 못 받았으면(undefined) 배너를 숨긴다: 할인을 광고하면서 어떤 가격도 안 깎인 화면이 나가는 것이 더 나쁘다 (critic P1-1).
    // 가격 표기는 손대지 않는다 (정가 그대로). 판정 null(행사 없음)·만료도 숨긴다.
    document.querySelectorAll("[data-promo]").forEach((el) => {
      const until = el.getAttribute("data-promo-until");
      const expired = until && !Number.isNaN(Date.parse(until)) && Date.now() > Date.parse(until);
      el.hidden = !p || expired;
    });
    if (!p) return;
    document.querySelectorAll("[data-list-price]").forEach((el) => {
      if (el.dataset.promoApplied) return;
      const list = intIn(el.dataset.listPrice, 0, 100000000, 0);
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement && n.parentElement.closest("small,s,.sale") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      let t;
      while ((t = w.nextNode())) {
        const m = t.data.match(/(\d{1,3}(?:,\d{3})+|\d+)원/);
        if (!m) continue;
        const shown = parseInt(m[1].replace(/,/g, ""), 10);
        if (shown !== list) { console.warn("promo: 지면 가격과 data-list-price 불일치", shown, list, el); break; }
        const frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode(t.data.slice(0, m.index)));
        const s0 = document.createElement("s"); s0.className = "was"; s0.textContent = won(list);
        const b0 = document.createElement("span"); b0.className = "sale"; b0.textContent = won(salePrice(list, p));
        frag.appendChild(s0); frag.appendChild(document.createTextNode(" ")); frag.appendChild(b0);
        frag.appendChild(document.createTextNode(t.data.slice(m.index + m[0].length)));
        t.parentNode.replaceChild(frag, t);
        el.dataset.promoApplied = "1";
        break;
      }
    });
  }
  // config 도착 → 저장 장바구니 단가 재계산 → 지면 갱신 → 면별 재렌더 신호(hh:promo)
  async function loadPromo() {
    let cfg = await config();
    if (cfg._failed) { await new Promise((r) => setTimeout(r, 800)); cfg = await config(); }
    if (cfg._failed) {
      renderPromoPrices();   // 미확정이면 행사만 숨기고 정가와 저장 장바구니 단가를 보존한다.
      document.querySelectorAll("[data-promo-popup]").forEach((el) => { el.hidden = true; });
      return undefined;
    }
    _promo = cfg.promo ? cfg.promo : null;
    const items = cart();
    saveCart(items);
    renderPromoPrices();
    try { document.dispatchEvent(new CustomEvent("hh:promo", { detail: { promo: promo() } })); } catch (e) {}
    return promo();
  }
  // 스크립트가 나중에 그리는 가격(스튜디오 단위 카드, 가이드북 목록 행, 세트 표)도 같은 규칙으로. 적용 표식이 있어 재진입해도 두 번 그리지 않는다
  function watchPromoPrices() {
    if (!("MutationObserver" in window) || !promo()) return;
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; renderPromoPrices(); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  const promoReady = new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => { loadPromo().then((p) => { watchPromoPrices(); resolve(p); }, () => resolve(null)); });
  });

  async function updateNav() {
    // 전람 v1(.nav .aux) 과 플랫폼 v2(.util nav, .hd .aux) 헤더를 함께 갱신 (2026-08-26)
    const auxes = document.querySelectorAll(".nav .aux, .util nav, .hd .aux");
    if (!auxes.length) return;
    const n = cart().reduce((s, x) => s + x.qty, 0);
    const st = await me();
    auxes.forEach((aux) => {
      const cartLink = aux.querySelector('a[href$="cart.html"]');
      if (cartLink) cartLink.textContent = n ? `장바구니 ${n}` : "장바구니";
      const loginLink = aux.querySelector('a[href$="login.html"]');
      if (loginLink && st.member) {
        loginLink.textContent = st.member.name || "마이페이지";
        loginLink.href = loginLink.href.replace("login.html", "my.html");
        // 링크가 마이페이지로 바뀌면 현재 위치 표기도 따라간다. 다른 면에서는 속성을 남기지 않는다
        if (/(^|\/)my\.html$/.test(location.pathname)) loginLink.setAttribute("aria-current", "page");
        else loginLink.removeAttribute("aria-current");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", updateNav);
  // ── 플랫폼 v2 공통 (2026-08-26 s16): 모바일 메뉴 토글, 리빌, 헤더 검색 위임 ──
  document.addEventListener("DOMContentLoaded", function () {
    const hdr = document.querySelector(".hd"), btn = hdr && hdr.querySelector(".menu");
    if (btn) {
      const setOpen = (open) => {
        hdr.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.textContent = open ? "닫기" : "메뉴";
      };
      btn.addEventListener("click", function () { setOpen(!hdr.classList.contains("open")); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && hdr.classList.contains("open")) { setOpen(false); btn.focus(); } });
    }
    // 리빌: transform/opacity 만. reduced-motion 은 CSS 가 즉시 표시
    const rv = document.querySelectorAll(".rv");
    if (rv.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
      rv.forEach((el) => io.observe(el));
    } else rv.forEach((el) => el.classList.add("in"));
    // 헤더 검색 pill(q1): 같은 면에 목록 검색(q2)이 있으면 위임, 없으면 가이드북 목록으로 ?q= 이동
    const q1 = document.getElementById("q1"), q2 = document.getElementById("q2");
    if (q1) {
      const prefix = ((hdr && hdr.querySelector(".brand")) || { getAttribute: () => "index.html" }).getAttribute("href").replace("index.html", "");
      const target = () => document.querySelector("[data-search-target]") || (q2 && q2.closest("section")) || q2;
      if (q2) q1.addEventListener("input", function () { q2.value = q1.value; q2.dispatchEvent(new Event("input", { bubbles: true })); });
      q1.form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (q2) { q2.value = q1.value; q2.dispatchEvent(new Event("input", { bubbles: true })); const t = target(); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }
        else location.href = prefix + "guidebook/index.html?q=" + encodeURIComponent(q1.value.trim());
      });
    }
    // 전환 계측: 가이드북 상품 면 조회(view_item), 결제 면 진입(begin_checkout, 장바구니 비면 생략), 스튜디오 체험 응시 시작(generate_lead)
    try {
      const path = location.pathname;
      if (/\/guidebook\/(?!index\.html$)[A-Za-z0-9_-]+\.html$/.test(path)) {
        const buy = document.querySelector(".buy [data-cart-sku]") || document.querySelector("[data-cart-sku]");
        if (buy) track("view_item", { currency: "KRW", value: +buy.dataset.cartPrice || 0, items: [{ item_id: buy.dataset.cartSku, item_name: buy.dataset.cartTitle, price: +buy.dataset.cartPrice || 0, quantity: 1 }] });
      }
      if (/(^|\/)checkout\.html$/.test(path)) {
        const lines = cart();
        if (lines.length) track("begin_checkout", { currency: "KRW", value: cartTotal(), items: lines.map(lineItem) });
      }
      const tg = document.getElementById("trialGo");
      if (tg) tg.addEventListener("click", function () { track("generate_lead", { content: "studio_trial" }); });
    } catch (e) {}
  });
  // ── 공지 팝업 (2026-08-23) ──
  // 정책: 관리자가 게시한 popup 중 노출 기간 안의 것을 최대 1건 띄운다.
  // "오늘 하루 보지 않기" = id 별로 24시간 억제(localStorage). 세션 안에서는 1회만.
  const POPUP_KEY = "hh_popup_mute_v1";
  function popupMutes() {
    try { return JSON.parse(localStorage.getItem(POPUP_KEY) || "{}"); } catch { return {}; }
  }
  function mutePopup(id, hours) {
    const m = popupMutes(); m[id] = Date.now() + hours * 3600 * 1000;
    try { localStorage.setItem(POPUP_KEY, JSON.stringify(m)); } catch {}
  }
  // 노출 판정 함수. 건우 선택 지점: 팝업이 여러 건일 때 무엇을 보일지, 얼마나 자주 볼지.
  // 기본 = 억제 안 된 것 중 서버 정렬(pinned, priority) 첫 건, 세션당 1회.
  function pickPopup(items) {
    const m = popupMutes(), now = Date.now();
    let shown = false;
    try { shown = sessionStorage.getItem("hh_popup_shown") === "1"; } catch {}
    if (shown) return null;
    return (items || []).find((it) => !(m[it.id] && m[it.id] > now)) || null;
  }
  function esc(t) { return String(t || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  // 공지 body_html allowlist 정화 (저장형 XSS 차단): 허용 태그 외 언랩, 속성은 a[href https/절대경로] 만 유지
  function sanitizeHtml(html) {
    const ALLOW = new Set(["P", "BR", "B", "STRONG", "I", "EM", "U", "A", "UL", "OL", "LI", "H3", "H4", "SPAN"]);
    let doc;
    try { doc = new DOMParser().parseFromString(String(html || ""), "text/html"); } catch { return esc(html); }
    doc.querySelectorAll("script,style,iframe,object,embed,link,meta,svg,math,template,form,input,button").forEach((n) => n.remove());
    const walk = (root) => {
      Array.from(root.children).forEach((el) => {
        walk(el);
        if (!ALLOW.has(el.tagName)) { el.replaceWith(...Array.from(el.childNodes)); return; }
        const href = el.tagName === "A" ? el.getAttribute("href") : null;
        Array.from(el.attributes).forEach((a) => el.removeAttribute(a.name));
        if (href && /^(https:\/\/|\/)/.test(href)) { el.setAttribute("href", href); el.setAttribute("rel", "noopener"); }
      });
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }
  // 공지와 행사 모달의 제목 초점, Tab 순환, 배경 비활성화와 복귀를 같은 함수로 처리한다.
  function popupFocus(root, title, dismiss) {
    const previous = document.activeElement;
    const locked = document.documentElement.classList.contains("ppop-open");
    const background = Array.from(document.body.children).filter((el) => el !== root && !el.contains(root) && !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName));
    const inertBefore = background.map((el) => el.hasAttribute("inert"));
    let closed = false;
    root.setAttribute("tabindex", "-1");
    if (title) title.setAttribute("tabindex", "-1");
    const initial = title || root;
    const focusables = () => Array.from(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter((el) => el.tabIndex >= 0 && !el.closest('[hidden],[inert]') && el.getClientRects().length);
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      background.forEach((el, i) => { if (!inertBefore[i]) el.removeAttribute("inert"); });
      if (!locked) document.documentElement.classList.remove("ppop-open");
      dismiss();
      if (previous && previous.isConnected && previous.focus) previous.focus({ preventScroll: true });
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const f = focusables(), i = f.indexOf(document.activeElement);
      if (!f.length) { e.preventDefault(); initial.focus({ preventScroll: true }); return; }
      if (i < 0 || (e.shiftKey && i === 0) || (!e.shiftKey && i === f.length - 1)) {
        e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus();
      }
    };
    const onFocus = (e) => { if (!root.contains(e.target)) initial.focus({ preventScroll: true }); };
    background.forEach((el) => el.setAttribute("inert", ""));
    if (document.body.classList.contains("v2")) document.documentElement.classList.add("ppop-open");
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    initial.focus({ preventScroll: true });
    return close;
  }
  function renderPopup(it) {
    const root = document.createElement("div");
    root.className = "hh-popup";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "hhPopupTitle");
    const link = it.link_url && /^(https:\/\/|\/)/.test(it.link_url)
      ? '<a class="tlink" href="' + esc(it.link_url) + '">' + esc(it.link_label || "자세히 보기") + "</a>" : "";
    root.innerHTML =
      '<div class="hh-popup-back"></div>' +
      '<div class="hh-popup-card">' +
        '<p class="hh-popup-kind">공지</p>' +
        '<h2 id="hhPopupTitle" class="hh-popup-title">' + esc(it.title) + "</h2>" +
        '<div class="hh-popup-body">' + (it.body_html ? sanitizeHtml(it.body_html) : esc(it.body_md || "")) + "</div>" +
        (link ? '<p class="hh-popup-link">' + link + "</p>" : "") +
        '<div class="hh-popup-foot">' +
          '<label class="hh-popup-mute"><input type="checkbox" id="hhPopupMute"> 오늘 하루 보지 않기</label>' +
          '<button type="button" class="hh-popup-close" id="hhPopupClose">닫기</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(root);
    const close = popupFocus(root, root.querySelector("#hhPopupTitle"), () => {
      if (root.querySelector("#hhPopupMute").checked) mutePopup(it.id, 24);
      root.remove();
    });
    root.querySelector("#hhPopupClose").addEventListener("click", close);
    root.querySelector(".hh-popup-back").addEventListener("click", close);
    try { sessionStorage.setItem("hh_popup_shown", "1"); } catch {}
  }
  async function showPopup() {
    if (document.body.dataset.noPopup !== undefined) return;   // body[data-no-popup] = 결제, 리더 화면 제외
    let data;
    try { data = await api("/api/notices/active?kind=popup"); } catch { return; }
    const items = Array.isArray(data) ? data : (data.items || data.notices || []);
    const it = pickPopup(items);
    if (it && !document.querySelector('.hh-popup, #promoPopup:not([hidden])')) renderPopup(it);
  }
  // ── 행사 팝업 (2026-09-07) ──
  // 마크업은 빌드가 입구 면에 넣는다(_tools/apply_promo.py, #promoPopup[data-promo-popup=행사 id]). 여는 조건은 배너와 같은 서버 판정 하나:
  // /api/config.promo 가 같은 id 로 살아 있을 때만. 판정 미확정·없음·만료 = 열지 않는다(할인 광고에 정가 화면 차단, critic P1-1).
  // "오늘 하루 보지 않기" = 그 행사 id 를 KST 자정까지 억제(localStorage, 공지 팝업과 같은 저장소). 닫기 = 이 세션에서만 안 뜸.
  // 공지 팝업과 한 세션에 하나만: 행사 팝업이 먼저 판정하고, 떴으면 공지 팝업은 건너뛴다.
  function kstMidnight(now) {
    const t = (now || Date.now()) + 9 * 3600 * 1000;
    const d = new Date(t);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - 9 * 3600 * 1000;
  }
  function promoPopupMuted(id) {
    const m = popupMutes();
    return !!(m["promo:" + id] && m["promo:" + id] > Date.now());
  }
  function mutePromoPopup(id) {
    const m = popupMutes(); m["promo:" + id] = kstMidnight();
    try { localStorage.setItem(POPUP_KEY, JSON.stringify(m)); } catch {}
  }
  function openPromoPopup(root, p) {
    root.hidden = false;
    const close = popupFocus(root, root.querySelector("#ppopT"), () => { root.hidden = true; });
    root.querySelectorAll("[data-ppop-close]").forEach((b) => b.addEventListener("click", close));
    root.querySelectorAll("[data-ppop-back]").forEach((b) => b.addEventListener("click", close));
    root.querySelectorAll("[data-ppop-mute]").forEach((b) => b.addEventListener("click", () => { mutePromoPopup(p.id); track("promo_popup_mute", { promo_id: p.id }); close(); }));
    root.querySelectorAll("[data-ppop-go]").forEach((a) => a.addEventListener("click", () => track("promo_popup_click", { promo_id: p.id, target: a.dataset.ppopGo })));
    try { sessionStorage.setItem("hh_popup_shown", "1"); } catch {}
    track("promo_popup_view", { promo_id: p.id });
  }
  // 첫 40% 스크롤 또는 DOMContentLoaded 뒤 8초. 둘 중 먼저 도달하면 나머지를 정리한다.
  function promoTrigger() {
    let finish, timer;
    const promise = new Promise((resolve) => {
      let done = false;
      finish = (ready) => {
        if (done) return;
        done = true; clearTimeout(timer);
        window.removeEventListener("scroll", onScroll);
        resolve(ready);
      };
      const onScroll = () => {
        const page = document.scrollingElement || document.documentElement;
        const distance = page.scrollHeight - window.innerHeight;
        if (distance > 0 && page.scrollTop / distance >= .4) finish(true);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      timer = setTimeout(() => finish(true), 8000);
    });
    return { promise, cancel: () => finish(false) };
  }
  function canOpenPromoPopup(root) {
    const p = promo();
    if (document.body.dataset.noPopup !== undefined || !p || p.id !== root.getAttribute("data-promo-popup")) return false;
    const until = root.getAttribute("data-promo-until");
    if (until && !Number.isNaN(Date.parse(until)) && Date.now() > Date.parse(until)) return false;
    if (promoPopupMuted(p.id)) return false;
    try { if (sessionStorage.getItem("hh_popup_shown") === "1") return false; } catch {}
    return !document.querySelector('.hh-popup, #promoPopup:not([hidden])');
  }
  let promoPopupPending = null;
  async function attemptPromoPopup() {
    if (document.body.dataset.noPopup !== undefined) return false;
    const root = document.getElementById("promoPopup");
    if (!root || !root.hasAttribute("data-promo-popup")) return false;
    const trigger = promoTrigger();
    try {
      await promoReady;
      if (!canOpenPromoPopup(root)) return false;
      if (!await trigger.promise || !canOpenPromoPopup(root)) return false;
      openPromoPopup(root, promo());
      return true;
    } finally { trigger.cancel(); }
  }
  // 공지가 행사 판정과 지연 노출을 기다리게 하여 두 모달이 겹치지 않는다.
  async function showPromoPopup() {
    if (promoPopupPending) return promoPopupPending;
    promoPopupPending = attemptPromoPopup();
    try { return await promoPopupPending; } finally { promoPopupPending = null; }
  }
  document.addEventListener("DOMContentLoaded", async () => {
    let opened = false;
    try { opened = await showPromoPopup(); } catch { opened = false; }
    if (!opened) showPopup();
  });

  // 가로 스크롤 표: 실제로 넘칠 때만 키보드 초점과 이름을 준다 (WCAG 2.1.1, 1.3.1).
  // 넘치지 않는 표에 tabindex 를 걸면 불필요한 탭 정거장이 되므로 실측 후 부여한다.
  function markScrollableTables() {
    document.querySelectorAll(".tblwrap").forEach((w) => {
      // 안내문은 우리가 넣은 것이므로 제목 탐색 전에 걷어내고 시작한다 (넣은 뒤 다시 재면 자기 자신을 제목으로 오인)
      const prev = w.previousElementSibling;
      if (prev && prev.classList.contains("tblnote")) prev.remove();
      const over = w.scrollWidth > w.clientWidth + 1;
      if (!over) {
        w.removeAttribute("tabindex"); w.removeAttribute("role"); w.removeAttribute("aria-label");
        w.classList.remove("scrollx");
        return;
      }
      w.setAttribute("tabindex", "0");
      w.setAttribute("role", "region");
      // 이름은 caption 이나 표 제목 요소에서만. 앞 형제 산문을 잘라 쓰면
      // "현행 요강에서, 가로로 스크롤할 수 있는 표" 처럼 문장 도중 절단된 이름이 나온다 (s17 critic 적발).
      const cap = w.querySelector("table caption");
      const h = w.previousElementSibling;
      const head = h && /^H[1-6]$/.test(h.tagName) ? h.textContent.trim() : "";
      const name = cap ? cap.textContent.trim() : head;
      w.setAttribute("aria-label", name ? name + ", 가로로 스크롤할 수 있는 표" : "가로로 스크롤할 수 있는 표");
      w.classList.add("scrollx");
      const note = document.createElement("p");
      note.className = "tblnote";
      note.setAttribute("aria-hidden", "true");   // 이름은 aria-label 이 이미 전달
      note.textContent = "옆으로 넘기거나, 표에 초점을 두고 좌우 방향키로 봅니다";
      w.parentNode.insertBefore(note, w);
    });
  }
  document.addEventListener("DOMContentLoaded", markScrollableTables);
  addEventListener("resize", markScrollableTables);

  window.HH = { API, api, me, cart, pruneCart, saveCart, addToCart, cartTotal, won, updateNav,
    config, oauthStart, oauthButtons, OAUTH_LABEL, OAUTH_ERR, showPopup, pickPopup, esc, sanitizeHtml,
    SET_ID_RE, UNITS, LINE_MAX, okSetId, okUnit, intIn,
    promo, promoActive, salePrice, renderPromoPrices, promoReady,
    showPromoPopup, promoPopupMuted, kstMidnight };
})();

// 브랜드 영상 슬롯: 기본은 정지 포스터(reduced-first). 모션 무감 선호가 아닐 때만 자동재생
(function(){
  var films=document.querySelectorAll('.film video');
  if(!films.length) return;
  films.forEach(function(v){v.controls=true});   // 정지 수단은 항상(WCAG 2.2.2, 5초 초과 자동 움직임)
  if(matchMedia('(prefers-reduced-motion: no-preference)').matches){
    films.forEach(function(v){v.autoplay=true;v.play().catch(function(){})});
  }
})();

// 홈 브랜드 필름: 데스크톱에서 데이터 절약과 모션 감소가 꺼져 있을 때만 영상 소스를 연결한다.
(function () {
  const figure = document.querySelector('.herofilm'), video = figure && figure.querySelector('video');
  if (!video) return;
  const wide = matchMedia('(min-width:900px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const pause = figure.querySelector('.vpause'), cc = figure.querySelector('.vcc');
  const eligible = () => wide.matches && !reduce.matches && !(connection && connection.saveData);
  video.muted = true; video.defaultMuted = true;
  function play() {
    if (!eligible() || video.dataset.paused || document.hidden) return;
    const playing = video.play();
    if (playing && playing.catch) playing.catch(() => {});
  }
  function setCc(on) {
    Array.from(video.textTracks || []).forEach((track) => { track.mode = on ? 'showing' : 'hidden'; });
    if (cc) cc.setAttribute('aria-pressed', on ? 'true' : 'false');
    try { localStorage.setItem('hh_film_cc', on ? '1' : '0'); } catch (e) {}
  }
  function sync() {
    if (!eligible()) {
      video.pause();
      video.removeAttribute('autoplay');
      figure.removeAttribute('data-playing-enabled');
      if (video.querySelector('source') || video.hasAttribute('src')) {
        video.querySelectorAll('source').forEach((source) => source.remove());
        video.removeAttribute('src'); video.load();
      }
      return;
    }
    if (!video.querySelector('source')) {
      ['webm', 'mp4'].forEach((format) => {
        const source = document.createElement('source');
        source.src = 'assets/video/brand_v2_hero_aigen.' + format;
        source.type = 'video/' + format;
        video.insertBefore(source, video.querySelector("track"));
      });
      video.load();
    }
    figure.setAttribute('data-playing-enabled', '');
    video.autoplay = !video.dataset.paused;
    play();
  }
  let want = false;
  try { want = localStorage.getItem('hh_film_cc') === '1'; } catch (e) {}
  setCc(want);
  video.addEventListener('loadedmetadata', () => setCc(cc ? cc.getAttribute('aria-pressed') === 'true' : false));
  video.addEventListener('canplay', play);
  document.addEventListener('visibilitychange', play);
  ['pointerdown', 'keydown', 'touchstart'].forEach((event) => document.addEventListener(event, play, { once: true, passive: true }));
  if (pause) pause.addEventListener('click', () => {
    if (!eligible()) return;
    if (video.dataset.paused) {
      delete video.dataset.paused; play(); pause.textContent = '일시정지'; pause.setAttribute('aria-pressed', 'false');
    } else {
      video.dataset.paused = '1'; video.pause(); pause.textContent = '재생'; pause.setAttribute('aria-pressed', 'true');
    }
  });
  if (cc) cc.addEventListener('click', () => setCc(cc.getAttribute('aria-pressed') !== 'true'));
  wide.addEventListener('change', sync); reduce.addEventListener('change', sync);
  if (connection && connection.addEventListener) connection.addEventListener('change', sync);
  sync();
})();
