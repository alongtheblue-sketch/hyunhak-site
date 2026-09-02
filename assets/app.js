/* 현학적 연구소 — 공용 프론트 (세션·장바구니·네비 상태) */
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

  function cart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
  }
  function saveCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {}
    updateNav();
  }
  // 같은 sku 라도 set_id 가 다르면 별 줄 (PLAN s30: passage-single 은 세트 결속, 줄마다 수량 1)
  function sameLine(a, b) { return a.sku === b.sku && String(a.set_id || "") === String(b.set_id || ""); }
  function addToCart(item) { // {sku,title,price,qty,ship,set_id}
    const items = cart();
    const line = Object.assign({ qty: 1 }, item);
    if (!line.set_id) delete line.set_id;
    const hit = items.find((x) => sameLine(x, line));
    if (hit) hit.qty = line.set_id ? 1 : Math.min(10, hit.qty + (item.qty || 1));
    else items.push(line.set_id ? Object.assign(line, { qty: 1 }) : line);
    saveCart(items);
  }
  function cartTotal() { return cart().reduce((s, x) => s + x.price * x.qty, 0); }

  let _me = null;
  async function me(force) {
    if (_me !== null && !force) return _me;
    try { _me = (await api("/api/auth/me")); } catch { _me = { member: null }; }
    return _me;
  }

  // ── 간편 로그인 (구글·카카오·네이버) ──
  let _cfg = null;
  async function config() {
    if (_cfg) return _cfg;
    try { _cfg = await api("/api/config"); } catch { _cfg = { oauth: {} }; }
    return _cfg;
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

  const won = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";

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
      if (loginLink && st.member) { loginLink.textContent = st.member.name || "마이페이지"; loginLink.href = loginLink.href.replace("login.html", "my.html"); }
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
    const opener = document.activeElement;
    const focusables = () => Array.from(root.querySelectorAll("a[href],button,input,[tabindex]:not([tabindex='-1'])"));
    const close = () => {
      if (root.querySelector("#hhPopupMute").checked) mutePopup(it.id, 24);
      root.remove();
      document.removeEventListener("keydown", onKey);
      if (opener && opener.focus) opener.focus();   // 포커스 복귀
    };
    const onKey = (e) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;                       // 포커스 트랩
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    root.querySelector("#hhPopupClose").addEventListener("click", close);
    root.querySelector(".hh-popup-back").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    root.querySelector("#hhPopupClose").focus();
    try { sessionStorage.setItem("hh_popup_shown", "1"); } catch {}
  }
  async function showPopup() {
    if (document.body.dataset.noPopup !== undefined) return;   // body[data-no-popup] = 결제·리더 화면 제외
    let data;
    try { data = await api("/api/notices/active?kind=popup"); } catch { return; }
    const items = Array.isArray(data) ? data : (data.items || data.notices || []);
    const it = pickPopup(items);
    if (it) renderPopup(it);
  }
  document.addEventListener("DOMContentLoaded", showPopup);

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

  window.HH = { API, api, me, cart, saveCart, addToCart, cartTotal, won, updateNav,
    config, oauthStart, oauthButtons, OAUTH_LABEL, OAUTH_ERR, showPopup, pickPopup, esc, sanitizeHtml };
})();
