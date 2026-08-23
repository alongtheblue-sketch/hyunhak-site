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
  function addToCart(item) { // {sku,title,price,qty,ship}
    const items = cart();
    const hit = items.find((x) => x.sku === item.sku);
    if (hit) hit.qty = Math.min(10, hit.qty + (item.qty || 1));
    else items.push(Object.assign({ qty: 1 }, item));
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
    rate: "요청이 너무 잦습니다. 잠시 후 다시 시도하십시오",
    state: "로그인 요청이 만료되었습니다. 다시 시도하십시오",
    token: "제공사 인증에 실패했습니다. 다시 시도하십시오",
    denied: "간편 로그인 동의를 취소했습니다",
    profile: "제공사에서 계정 정보를 받지 못했습니다",
    status: "이용할 수 없는 계정입니다. 문의해 주십시오",
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
    const aux = document.querySelector(".nav .aux");
    if (!aux) return;
    const n = cart().reduce((s, x) => s + x.qty, 0);
    const cartLink = aux.querySelector('a[href$="cart.html"]');
    if (cartLink) cartLink.textContent = n ? `장바구니 ${n}` : "장바구니";
    const st = await me();
    const loginLink = aux.querySelector('a[href$="login.html"]');
    if (loginLink && st.member) { loginLink.textContent = st.member.name || "마이페이지"; loginLink.href = loginLink.href.replace("login.html", "my.html"); }
  }

  document.addEventListener("DOMContentLoaded", updateNav);
  window.HH = { API, api, me, cart, saveCart, addToCart, cartTotal, won, updateNav,
    config, oauthStart, oauthButtons, OAUTH_LABEL, OAUTH_ERR };
})();
