// 반증(레이아웃 렌즈) 보조: 홈 팝업이 처음 열릴 때 무대 안에서 도는 전이/애니메이션 목록(507edf1 이 넣은 .pop 바탕, .pfr 명도 전이가 여는 순간 튀는지)
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const b = await chromium.launch({ channel: "chrome", headless: true });
const out = {};
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => {
    window.__anims = [];
    let seen = false, frames = 0;
    const snap = (tag) => window.__anims.push({ tag, t: Math.round(performance.now()), a: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest(".pdim")).map(a => ({ prop: a.transitionProperty || a.animationName, el: String(a.effect.target.className), dur: a.effect.getTiming().duration, t: Math.round(a.currentTime || 0) })) });
    const loop = () => { const d = document.querySelector(".pdim"); if (d) { snap(seen ? "f" + frames : "first"); seen = true; frames++; } if (frames < 8) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const p = await ctx.newPage();
  await p.goto("http://localhost:8092/index.html", { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  out[w] = await p.evaluate(() => window.__anims);
  console.log(w, JSON.stringify(out[w]));
  await ctx.close();
}
fs.writeFileSync(new URL("./refute_openanim.json", import.meta.url), JSON.stringify(out, null, 1));
await Promise.race([b.close(), new Promise(r => setTimeout(r, 5000))]);
process.exit(0);
