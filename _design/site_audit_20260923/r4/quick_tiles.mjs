// s8 critic 3차 P1 수리 직후 빠른 자기 점검: 폭별 열 수, 첫 행 윗선, 행 끝 패딩, 화살표와 다음 열 글자 간격. 소수 폭은 --force-device-scale-factor 창 방식(r3/probe_tiles.mjs 200행과 같은 방식)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const measure = () => {
  const box = document.querySelector("#tiles"); const tiles = [...box.querySelectorAll(".tile")];
  const cols = getComputedStyle(box).gridTemplateColumns.split(" ").length;
  const bt = tiles.slice(0, 8).map((t) => parseFloat(getComputedStyle(t).borderTopWidth));
  const pr = tiles.slice(0, 8).map((t) => parseFloat(getComputedStyle(t).paddingRight));
  const gaps = [];
  for (let i = 0; i < tiles.length - 1; i++) {
    const a = tiles[i].getBoundingClientRect(), b = tiles[i + 1].getBoundingClientRect();
    if (Math.abs(a.top - b.top) < 1) { const ar = tiles[i].querySelector(".ar") || tiles[i].lastElementChild; const nb = tiles[i + 1].querySelector(".n"); gaps.push(+(nb.getBoundingClientRect().left - ar.getBoundingClientRect().right).toFixed(1)); }
  }
  return { vw: +visualViewport.width.toFixed(3), cols, bt, pr, minGap: gaps.length ? Math.min(...gaps) : null, n: tiles.length };
};
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const w of [360, 390, 420, 421, 428, 430, 480, 600, 601, 768, 900, 1024, 1100, 1101, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
  await p.goto("http://localhost:8092/index.html", { waitUntil: "networkidle" }); await p.waitForTimeout(600); await p.keyboard.press("Escape");
  console.log(w, JSON.stringify(await p.evaluate(measure)));
  if ([430, 600, 1024].includes(w)) { await p.locator("#tiles").scrollIntoViewIfNeeded(); await p.locator("#find").screenshot({ path: `shots/quick_tiles_${w}.png` }); }
  await ctx.close();
}
await b.close();
for (const [dsf, win] of [[1.125, 1100], [1.333, 1100], [1.333, 600]]) {
  const b2 = await chromium.launch({ channel: "chrome", headless: true, args: [`--force-device-scale-factor=${dsf}`, `--window-size=${win},900`] });
  const ctx = await b2.newContext({ viewport: null }); const p = await ctx.newPage();
  await p.goto("http://localhost:8092/index.html", { waitUntil: "networkidle" }); await p.waitForTimeout(600); await p.keyboard.press("Escape");
  console.log(`${win}@${dsf}`, JSON.stringify(await p.evaluate(measure)));
  await b2.close();
}
