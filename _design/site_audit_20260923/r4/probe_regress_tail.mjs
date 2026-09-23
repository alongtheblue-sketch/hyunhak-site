// 2026-09-23 critic 4회차 regress 보조: 문서 높이가 16384px 를 넘는 면(studio_390 = 17749px)은 전체 캡처가 16384px 아래를 다시 그린 판으로 채워
//   푸터가 찍히지 않는다(ab_post/studio_390.png 의 y16700 에 본문이 반복됨). 그 면의 16384px 아래를 따로 두 판 비교한다.
// 방법: probe_regress_ab.mjs 와 같은 route 와 settle 뒤, sticky 는 static, fixed(고정 탭 바 nav.fix 등)는 visibility:hidden 으로 촬영용 처리하고
//   (1) 창을 16384 와 문서 끝-창높이 로 스크롤해 창 캡처 2장, (2) footer.ft 요소 캡처 1장. 출력 = shots/ab_tail_pre, shots/ab_tail_post
// 사용: node probe_regress_tail.mjs [면] [폭] [높이]   기본 = studio 390 844
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const PRE = "87106d8", POST = "c342aff";
const CHANGED = execFileSync("git", ["-C", REPO, "diff", "--name-only", PRE, POST]).toString().split("\n").filter(p => p && !/^(_design|_tools)\//.test(p));
const CHANGED_SET = new Set(CHANGED);
const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", html: "text/html; charset=utf-8" };
const preBody = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${PRE}:${p}`])]));
const P = process.argv[2] || "studio", W = +(process.argv[3] || 390), Hh = +(process.argv[4] || 844);
const FREEZE = ".rv{opacity:1!important;transform:none!important;transition:none!important} *,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });
const res = {};
for (const variant of ["pre", "post"]) {
  const OUT = path.join(HERE, "shots", `ab_tail_${variant}`);
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: Hh }, deviceScaleFactor: 1, locale: "ko-KR" });
  if (variant === "pre") await ctx.route(u => u.host === "localhost:8092" && CHANGED_SET.has(decodeURIComponent(u.pathname.slice(1))), async (route) => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
    await route.fulfill({ status: 200, headers: { "content-type": TYPES[p.split(".").pop()], "cache-control": "no-store" }, body: preBody[p] });
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:8092/${P}.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  if (await page.$(".pdim")) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(async () => {
    for (const v of document.querySelectorAll("video")) { try { v.pause(); v.removeAttribute("autoplay"); } catch (e) {} }
    for (const im of document.querySelectorAll("img[loading=lazy]")) im.loading = "eager";
    const imgs = [...document.images];
    await Promise.race([Promise.all(imgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; }))), new Promise(r => setTimeout(r, 15000))]);
    await Promise.race([Promise.all(imgs.map(im => im.decode ? im.decode().catch(() => {}) : 0)), new Promise(r => setTimeout(r, 10000))]);
    await document.fonts.ready;
    document.documentElement.style.scrollBehavior = "auto";
  });
  // r3/probe_books.mjs unstick 관례: sticky = static, fixed = visibility:hidden (촬영용)
  const unstuck = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const p = getComputedStyle(el).position;
      if (p === "sticky" || p === "fixed") { el.setAttribute("data-probe-unstick", p); out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}:${p}`); }
    }
    return out;
  });
  await page.addStyleTag({ content: '[data-probe-unstick="sticky"]{position:static!important}[data-probe-unstick="fixed"]{visibility:hidden!important}' });
  (res[variant] ||= {}).unstuck = unstuck;
  await page.waitForTimeout(400);
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  const name = P.replace(/\//g, "_") + "_" + W;
  for (const y of [16384, docH - Hh]) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
    await page.waitForTimeout(400);
    const sy = await page.evaluate(() => scrollY);
    await page.screenshot({ path: path.join(OUT, `${name}_scroll${y}.png`) });
    (res[variant] ||= {})[`scroll${y}`] = sy;
  }
  await page.locator("footer.ft").screenshot({ path: path.join(OUT, `${name}_footer.png`) });
  res[variant].docH = docH;
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(HERE, "tail_ab.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
