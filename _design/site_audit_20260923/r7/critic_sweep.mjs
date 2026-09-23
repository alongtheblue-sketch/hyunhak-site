// critic 7회차 독립 재실측 3 (e1955be 서빙): 같은 좌표 → 3연타(100/150/250ms) 닫힘, 체크, 단추 이동 + N=4 30ms 3연타 뒤 inline transition 잔류와 cur.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const BASE = "http://localhost:8092/", APIB = "http://localhost:8799";
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const NOTICE3 = { items: [{ id: "ntc_critic_n3", title: "critic 공지", body_md: "연타 확인용 공지입니다." }] };
const b = await chromium.launch({ channel: "chrome", headless: true });
const out = {};
for (const [w, h, N] of [[1440, 900, 2], [1440, 900, 3], [390, 844, 2], [390, 844, 3]]) {
  const res = [];
  for (const gap of [100, 150, 250]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", ...(w < 600 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(N === 3 ? NOTICE3 : { items: [] }) }));
    const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
    await p.goto(BASE + "index.html", { waitUntil: "networkidle" }); await p.waitForSelector(".pdim"); await p.waitForTimeout(800);
    const bb0 = await p.locator("[data-ppop-next]").boundingBox();
    const x = bb0.x + bb0.width / 2, y = bb0.y + bb0.height / 2; const pos = [];
    for (let k = 0; k < 3; k++) { if (w < 600) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); await p.waitForTimeout(gap); const q = await p.locator("[data-ppop-next]").boundingBox().catch(() => null); pos.push(q ? +(q.x - bb0.x).toFixed(1) + "/" + +(q.y - bb0.y).toFixed(1) : "gone"); }
    await p.waitForTimeout(700);
    res.push({ gap, ...(await p.evaluate(() => ({ open: !!document.querySelector(".pdim"), mute: !!document.querySelector("[data-ppop-mute-all]")?.checked, cur: document.querySelector("[data-ppop-cur]")?.textContent }))), shift: pos, errs: errs.length });
    await ctx.close();
  }
  out[`${w}_N${N}`] = res;
}
{ // N=4: 의뢰 카드 복제 2장(첫 슬롯 복제) → 30ms 3연타
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(NOTICE3) }));
  const p = await ctx.newPage(); await p.goto(BASE + "index.html", { waitUntil: "networkidle" }); await p.waitForSelector(".pdim"); await p.waitForTimeout(800);
  const n = await p.evaluate(() => document.querySelectorAll(".pslot").length);
  for (let k = 0; k < 3; k++) { await p.keyboard.press("ArrowRight"); await p.waitForTimeout(30); }
  await p.waitForTimeout(800);
  out.n3_rapid = { n, ...(await p.evaluate(() => ({ cur: document.querySelector("[data-ppop-cur]").textContent, inlineT: [...document.querySelectorAll(".pslot")].map((s) => s.style.transition), far: [...document.querySelectorAll(".pslot[data-far]")].length, pause: document.querySelector("[data-ppop-pause]").textContent }))) };
  await ctx.close();
}
await Promise.race([b.close(), new Promise((r) => setTimeout(r, 5000))]);
console.log(JSON.stringify(out));
process.exit(0);
