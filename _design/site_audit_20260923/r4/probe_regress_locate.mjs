// 2026-09-23 critic 4회차 regress 보조: A/B 차이 띠를 의도 구역과 대조하려고 두 판(87106d8 / c342aff)의 구역 좌표를 잰다.
// 조건은 probe_regress_ab.mjs 와 같다(같은 route, 같은 settle). 잰 것 = 문서 높이, 푸터 .ft-legal 과 그 링크 rect(글자 x 포함),
//   홈 #find 캡션(.help) 과 #tiles, 가입 면 약관 행(.check) 과 「전문」(.view) rect. 출력 = locate_ab.json
// 사용: node probe_regress_locate.mjs [면,면|all]
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const PRE = "87106d8", POST = "c342aff";
const BASE = "http://localhost:8092/";
const CHANGED = execFileSync("git", ["-C", REPO, "diff", "--name-only", PRE, POST]).toString().split("\n").filter(p => p && !/^(_design|_tools)\//.test(p));
const CHANGED_SET = new Set(CHANGED);
const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", html: "text/html; charset=utf-8" };
const preBody = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${PRE}:${p}`])]));
const PAGES = ["index", "request", "guidebook/index", "programs/guidebook", "programs/studio", "studio", "lectures", "interview", "interview/yonsei-hum", "about", "faq", "notice", "support", "b2b", "join", "login", "terms", "library", "ranking", "pastexam"];
const ONLY = process.argv[2] && process.argv[2] !== "all" ? process.argv[2].split(",") : null;
const WIDTHS = [[1440, 900], [390, 844]];
const FREEZE = ".rv{opacity:1!important;transform:none!important;transition:none!important} *,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}";

async function open(browser, variant, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR" });
  if (variant === "pre") {
    await ctx.route(u => u.host === "localhost:8092" && CHANGED_SET.has(decodeURIComponent(u.pathname.slice(1))), async (route) => {
      const p = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
      await route.fulfill({ status: 200, headers: { "content-type": TYPES[p.split(".").pop()], "cache-control": "no-store" }, body: preBody[p] });
    });
  }
  return ctx;
}
async function settle(page) {
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(async () => {
    for (const v of document.querySelectorAll("video")) { try { v.pause(); v.removeAttribute("autoplay"); } catch (e) {} }
    for (const im of document.querySelectorAll("img[loading=lazy]")) im.loading = "eager";
    const imgs = [...document.images];
    await Promise.race([Promise.all(imgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; }))), new Promise(r => setTimeout(r, 15000))]);
    await Promise.race([Promise.all(imgs.map(im => im.decode ? im.decode().catch(() => {}) : 0)), new Promise(r => setTimeout(r, 10000))]);
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
}
const measure = () => {
  const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.right), Math.round(r.bottom + scrollY)]; };
  const textR = (e) => { const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.right), Math.round(r.bottom + scrollY)]; };
  const legal = document.querySelector("footer.ft .ft-legal");
  return {
    docH: document.documentElement.scrollHeight,
    ftLegal: R(legal),
    ftLegalLinks: legal ? [...legal.querySelectorAll("a")].map(a => ({ t: a.textContent.trim(), box: R(a), text: textR(a), jc: getComputedStyle(a).justifyContent })) : [],
    help: R(document.querySelector("#find .top .help")),
    tiles: R(document.querySelector("#tiles")),
    checks: [...document.querySelectorAll("#joinForm .check")].map(c => ({ row: R(c), view: R(c.querySelector(".view")), viewText: c.querySelector(".view") ? textR(c.querySelector(".view")) : null })),
  };
};
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });
const res = {};
for (const variant of ["pre", "post"]) {
  for (const [w, h] of WIDTHS) {
    for (const p of PAGES) {
      if (ONLY && !ONLY.includes(p)) continue;
      const ctx = await open(browser, variant, w, h);
      const page = await ctx.newPage();
      const name = (p === "index" ? "index_nopop" : p.replace(/\//g, "_")) + "_" + w;
      try {
        await page.goto(BASE + p + ".html", { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        if (await page.$(".pdim")) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
        await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
        await settle(page);
        (res[name] ||= {})[variant] = await page.evaluate(measure);
        process.stdout.write(`${variant} ${name} docH=${res[name][variant].docH}\n`);
      } catch (e) { process.stdout.write(`${variant} ${name} FAIL ${e.message.split("\n")[0]}\n`); }
      await ctx.close();
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(HERE, "locate_ab.json"), JSON.stringify(res, null, 1));
