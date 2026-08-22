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
  window.HH = { API, api, me, cart, saveCart, addToCart, cartTotal, won, updateNav };
})();
