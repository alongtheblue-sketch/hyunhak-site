// 2026-09-23 critic 3회차 regress 프로브 보조: 87106d8 수리 전(c2adf08) 과 후(87106d8) 를 같은 브라우저, 같은 시각, 결정론 조건으로 찍어 비교한다.
// 수리 전 판 = Playwright route 가 수리가 바꾼 서빙 파일 4개(assets/base.css, assets/app.js, join.html, programs/guidebook.html) 만
//   git show c2adf08:<path> 내용으로 바꿔 응답한다. 리포 파일은 건드리지 않는다.
// 결정론 조건(두 판 동일): 팝업은 DOMContentLoaded + networkidle(최대 5초) + 글꼴 준비 + 300ms 에 찍고 ESC. 본문은 애니메이션과 전환 정지, 영상 숨김,
//   lazy 이미지 eager 전환 후 로드 완료와 decode 대기, .rv 강제 표시.
// 추가: 홈 대학 목록(.tiles) 계산값(열 수, 타일별 x/y/w/h, border-top, padding-right) 을 1440, 390(판정) 과 1024, 768(참고) 에서 두 판 비교.
// 사용: node probe_regress_ab.mjs   → shots/ab_pre, shots/ab_post, tiles_ab.json. 비교는 python3 probe_regress_compare.py shots/ab_pre shots/ab_post regress_ab.json diff_ab
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const PRE = "c2adf08";
const BASE = "http://localhost:8092/";
const CHANGED = ["assets/base.css", "assets/app.js", "join.html", "programs/guidebook.html"];
const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", html: "text/html; charset=utf-8" };
const preBody = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${PRE}:${p}`])]));
const PAGES = ["index", "request", "guidebook/index", "programs/guidebook", "programs/studio", "studio", "lectures", "interview", "interview/yonsei-hum", "about", "faq", "notice", "support", "b2b", "join", "login", "terms", "library", "ranking", "pastexam"];
const ONLY = process.argv[2] ? process.argv[2].split(",") : null;
const WIDTHS = [[1440, 900], [390, 844]];
const TILE_WIDTHS = [[1440, 900], [390, 844], [1024, 768], [768, 1024]];
const FREEZE = ".rv{opacity:1!important;transform:none!important;transition:none!important} *,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}";

async function open(browser, variant, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR" });
  if (variant === "pre") {
    await ctx.route(/^http:\/\/localhost:8092\/(assets\/base\.css|assets\/app\.js|join\.html|programs\/guidebook\.html)(\?.*)?$/, async (route) => {
      const p = new URL(route.request().url()).pathname.slice(1);
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
    await Promise.race([Promise.all(imgs.map(im => im.decode ? im.decode().catch(() => {}) : 0)), new Promise(r => setTimeout(r, 10000))]);   // decoding=async 표본 면이 빈 판으로 찍히는 것 방지
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
}

async function tiles(page) {
  return page.evaluate(() => {
    const box = document.querySelector("#tiles");
    if (!box) return null;
    const cs = getComputedStyle(box);
    const ts = [...box.querySelectorAll(".tile")].map(t => { const r = t.getBoundingClientRect(), s = getComputedStyle(t); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height), s.borderTopWidth, s.paddingRight]; });
    return { cols: cs.gridTemplateColumns, ncol: new Set(ts.map(t => t[0])).size, count: ts.length, tiles: ts, findTop: Math.round(document.querySelector("#find").getBoundingClientRect().top + scrollY), findH: Math.round(document.querySelector("#find").getBoundingClientRect().height) };
  });
}

// route.fulfill 로 서빙한 문서는 Chrome Local Network Access 가 loopback(8799 모킹 API) 호출을 막아 행사 띠와 가격이 빠진다 → 두 판 모두 같은 플래그로 띄운다
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });
const tileRes = {};
for (const variant of ["pre", "post"]) {
  const OUT = path.join(HERE, "shots", `ab_${variant}`);
  fs.mkdirSync(OUT, { recursive: true });
  for (const [w, h] of WIDTHS) {
    for (const p of PAGES) {
      if (ONLY && !ONLY.includes(p)) continue;
      const ctx = await open(browser, variant, w, h);
      const page = await ctx.newPage();
      const name = p.replace(/\//g, "_");
      try {
        await page.goto(BASE + p + ".html", { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        if (await page.$(".pdim")) {
          if (p === "index") {
            await page.screenshot({ path: path.join(OUT, `index_popup_${w}.png`) });
            const cur = await page.evaluate(() => { const e = document.querySelector("[data-ppop-cur]"); return e ? e.textContent : null; });
            process.stdout.write(`${variant} popup_${w} cur=${cur}\n`);
          }
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
        }
        await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
        await settle(page);
        await page.screenshot({ path: path.join(OUT, `${p === "index" ? "index_nopop" : name}_${w}.png`), fullPage: true });
        if (p === "index") {
          const el = await page.$("#tiles");
          if (el) await el.screenshot({ path: path.join(OUT, `index_tiles_${w}.png`) });
        }
        process.stdout.write(`${variant} ${name}_${w} ok\n`);
      } catch (e) {
        process.stdout.write(`${variant} ${name}_${w} FAIL ${e.message.split("\n")[0]}\n`);
      }
      await ctx.close();
    }
  }
  if (!ONLY || ONLY.includes("index")) {
    for (const [w, h] of TILE_WIDTHS) {
      const ctx = await open(browser, variant, w, h);
      const page = await ctx.newPage();
      await page.goto(BASE + "index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
      if (await page.$(".pdim")) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await settle(page);
      tileRes[`${variant}_${w}`] = await tiles(page);
      await ctx.close();
    }
  }
}
await browser.close();
if (Object.keys(tileRes).length) {
  const cmp = {};
  for (const [w] of TILE_WIDTHS) {
    const a = tileRes[`pre_${w}`], b = tileRes[`post_${w}`];
    const diffIdx = a && b ? a.tiles.map((t, i) => JSON.stringify(t) === JSON.stringify(b.tiles[i]) ? null : i).filter(i => i !== null) : null;
    cmp[w] = { pre_cols: a && a.cols, post_cols: b && b.cols, pre_ncol: a && a.ncol, post_ncol: b && b.ncol, count: b && b.count, identical: JSON.stringify(a) === JSON.stringify(b), diff_tiles: diffIdx,
      pre_bt0: a && a.tiles.map((t, i) => t[4] === "0px" ? i + 1 : null).filter(Boolean), post_bt0: b && b.tiles.map((t, i) => t[4] === "0px" ? i + 1 : null).filter(Boolean),
      pre_pr0: a && a.tiles.map((t, i) => t[5] === "0px" ? i + 1 : null).filter(Boolean), post_pr0: b && b.tiles.map((t, i) => t[5] === "0px" ? i + 1 : null).filter(Boolean),
      find: b && [b.findTop, b.findH] };
    process.stdout.write(`tiles ${w}: ${JSON.stringify(cmp[w])}\n`);
  }
  fs.writeFileSync(path.join(HERE, "tiles_ab.json"), JSON.stringify({ raw: tileRes, cmp }, null, 1));
}
