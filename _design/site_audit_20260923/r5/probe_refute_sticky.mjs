import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const [pg, w, h, y, sel] of [["faq", 1440, 900, 6480, "aside.side"], ["support", 1440, 900, 2880, "aside.side"], ["library", 1440, 900, 3600, "aside.side"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem("hh_popup_shown", "1"); } catch (e) {} });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:8092/${pg}.html`, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: ".rv{opacity:1!important;transform:none!important;transition:none!important}" });
  await p.evaluate((y) => { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, y); }, y);
  await p.waitForTimeout(200);
  const r = await p.evaluate((sel) => { const hd = document.querySelector("header#hd"), a = document.querySelector(sel); const hr = hd.getBoundingClientRect(), ar = a.getBoundingClientRect(); const cx = ar.left + 20, cy = Math.max(ar.top, hr.top) + 5; const hit = document.elementFromPoint(cx, cy); return { hd: [hr.top, hr.bottom, getComputedStyle(hd).zIndex, getComputedStyle(hd).position], aside: [ar.top, ar.bottom, getComputedStyle(a).zIndex, getComputedStyle(a).top], hit: hit && (hit.closest("header#hd") ? "header" : hit.closest(sel) ? "aside" : hit.tagName + "." + hit.className), scrollY }; }, sel);
  console.log(pg, JSON.stringify(r));
  await p.screenshot({ path: `shots/refute_sticky_${pg}_${w}_y${y}.png` });
  await ctx.close();
}
await b.close();
