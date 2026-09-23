// regress 프로브 보조: route.fulfill 로 서빙한 HTML 에서 행사 띠가 사라지는 원인 확인용
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const body = execFileSync("git", ["-C", "/Users/gregory/Workspace/hyunhak-site", "show", "c2adf08:programs/guidebook.html"]);
const browser = await chromium.launch({ channel: "chrome", headless: true, args: process.argv[2] === "flag" ? ["--disable-features=LocalNetworkAccessChecks"] : [] });
for (const mode of ["fetchfulfill", "flag"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/programs\/guidebook\.html/, async r => { if (mode === "fetchfulfill") { const resp = await r.fetch(); await r.fulfill({ response: resp, body }); } else await r.fulfill({ status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body }); });
  const page = await ctx.newPage();
  page.on("console", m => console.log(mode, "console", m.type(), m.text().slice(0, 200)));
  page.on("requestfailed", r => console.log(mode, "fail", r.url(), r.failure()?.errorText));
  page.on("response", r => { if (r.url().includes("8799")) console.log(mode, "api", r.status(), r.url()); });
  await page.goto("http://localhost:8092/programs/guidebook.html", { waitUntil: "networkidle" });
  console.log(mode, "promo bar:", await page.evaluate(() => { const e = document.querySelector(".promo"); return e ? [e.hidden, getComputedStyle(e).display, e.textContent.trim().slice(0,40)] : null; }));
  await ctx.close();
}
await browser.close();
