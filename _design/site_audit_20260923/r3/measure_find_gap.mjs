// 홈 대학 목록 캡션(#q2h)과 목록 윗선(.tiles) 간격, 푸터 「결제」 링크 폭 실측 (s8 P2 수리 전후 비교용)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:8092/index.html", { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.keyboard.press("Escape");
  const r = await p.evaluate(() => {
    const h = document.querySelector("#q2h"), t = document.querySelector("#tiles"), top = h.parentElement;
    const cs = (e) => getComputedStyle(e);
    const a = [...document.querySelectorAll("footer .ft-legal a")].map((x) => ({ t: x.textContent, w: Math.round(x.getBoundingClientRect().width), tw: Math.round((() => { const r = document.createRange(); r.selectNodeContents(x); return r.getBoundingClientRect().width; })()) }));
    return { helpBottom: h.getBoundingClientRect().bottom, tilesTop: t.getBoundingClientRect().top, gap: t.getBoundingClientRect().top - h.getBoundingClientRect().bottom,
      helpMargin: cs(h).margin, topDisplay: cs(top).display, topGap: cs(top).gap, topMargin: cs(top).margin, topCls: top.className, findGap: cs(top.parentElement).gap, findDisplay: cs(top.parentElement).display, legal: a };
  });
  console.log(w, JSON.stringify(r));
  await ctx.close();
}
await b.close();
