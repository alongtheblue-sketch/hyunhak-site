// 스튜디오 구매면 실브라우저 실측: select option 12 + 카드 12 클릭 → 담기 → HH.cart() sku = pass-<code> 12/12 + 콘솔 오류 0.
// 사용: node _design/studio_units_20260923/local_check.mjs [BASE] [OUT.json]   (기본 http://localhost:8093/ → local_check.json)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const BASE = process.argv[2] || "http://localhost:8093/";
const OUT = process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname), "local_check.json");
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" });
const p = await ctx.newPage();
const errors = [], net = [];   // net = 자원 404 (로컬 정적 서버엔 /api, /_gen.txt 가 없다). 라이브에서는 0 이어야 한다
p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") (/Failed to load resource/.test(m.text()) ? net : errors).push("console: " + m.text()); });
p.on("requestfailed", (r) => net.push("requestfailed: " + r.url()));
p.on("response", (r) => { if (r.status() >= 400) net.push(r.status() + " " + r.url()); });
await p.goto(BASE + "programs/studio.html", { waitUntil: "networkidle" });
await p.waitForTimeout(400);
const close = p.locator("[data-ppop-close]");
if (await close.count()) { await close.first().click(); await p.waitForTimeout(300); }
const res = { base: BASE, gen: null, options: [], cards: [], errors: [] };
try { const t = (await (await fetch(BASE + "_gen.txt")).text()).trim(); res.gen = /^[0-9a-f]{40}(-dirty)?$/.test(t) ? t : null; } catch (e) { res.gen = null; }
res.options = await p.$$eval("#studio-unit option", (os) => os.map((o) => [o.value, o.textContent]));
const codes = await p.$$eval("[data-r3-unit-buy]", (as) => as.map((a) => a.dataset.r3UnitBuy));
for (const code of codes) {
  await p.evaluate(() => { try { localStorage.removeItem("hh_cart_v1"); } catch (e) {} });
  await p.locator(`[data-r3-unit-buy="${code}"]`).click();
  await p.waitForTimeout(150);
  const st = await p.evaluate(() => {
    const s = document.querySelector("#studio-unit"), b = document.querySelector("[data-product-buy] [data-cart-sku]");
    return { select: s.value, idx: s.selectedIndex, disabled: b.disabled, sku: b.dataset.cartSku, title: b.dataset.cartTitle, price: b.dataset.cartPrice,
      mode: document.querySelector('[data-product-buy] input[name="product"]:checked').value, hash: location.hash };
  });
  await p.locator("[data-product-buy] [data-cart-sku]").click();
  await p.waitForTimeout(150);
  const cart = await p.evaluate(() => (window.HH && HH.cart ? HH.cart() : []).map((x) => [x.sku, x.title, x.price, x.qty]));
  const status = await p.locator("[data-product-buy] [role=status]").textContent();
  res.cards.push({ code, ...st, cart, status: status.trim(), ok: st.select === code && st.sku === "pass-" + code && !st.disabled && cart.length === 1 && cart[0][0] === "pass-" + code });
}
res.errors = errors; res.net = net;
res.summary = { options: res.options.length, cards: res.cards.length, ok: res.cards.filter((c) => c.ok).length, errors: errors.length, net: net.length };
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res.summary), "gen=" + res.gen);
for (const c of res.cards) console.log((c.ok ? "OK " : "BAD") + " " + c.code + " select=" + c.select + " sku=" + c.sku + " cart=" + JSON.stringify(c.cart[0] || null) + " status=" + c.status);
if (errors.length) console.log("ERRORS", errors);
if (net.length) console.log("NET(비치명, 라이브는 0 기대)", [...new Set(net)].slice(0, 8));
await b.close();
process.exit(res.summary.ok === res.summary.cards && res.summary.options === 12 && res.summary.cards === 12 && !errors.length ? 0 : 1);
