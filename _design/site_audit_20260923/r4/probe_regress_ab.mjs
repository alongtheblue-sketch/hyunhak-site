// 2026-09-23 critic 4회차 regress 프로브: c342aff 수리 전(87106d8) 과 후(c342aff = 현재 서빙) 를 같은 브라우저, 같은 시각, 결정론 조건으로 찍어 비교한다.
// r3/probe_regress_ab.mjs 복사본. 바뀐 것 = 수리 전 판(87106d8), route 대상 = git diff --name-only 87106d8 c342aff 중 _design/ 와 _tools/ 를 뺀 서빙 파일 전부(72개),
//   대학 목록 계산값 폭에 600, 430 추가(수리 전 2열 → 수리 후 1열 의도 구간), 인자로 판과 출력 폴더를 고를 수 있게 함(같은 판 재촬영용).
// 수리 전 판 = Playwright route 가 위 72개 파일만 git show 87106d8:<path> 내용으로 바꿔 응답한다. 리포 파일은 건드리지 않는다.
// 결정론 조건(두 판 동일, r3 와 같음): 팝업은 DOMContentLoaded + networkidle(최대 5초) + 글꼴 준비 + 300ms 에 찍고 ESC. 본문은 애니메이션과 전환 정지, 영상 숨김,
//   lazy 이미지 eager 전환 후 로드 완료와 decode 대기, .rv 강제 표시.
// 사용: node probe_regress_ab.mjs [면,면|all] [pre,post,postr] [폴더 접미사]
//   postr = 대조 판. 수리 후(c342aff) 내용을 pre 와 똑같이 route.fulfill 로 서빙한다. post(서버) 와 postr 의 차이 = route 서빙 자체의 영향.
//   기본 = 전 면, pre 와 post, shots/ab_pre + shots/ab_post + tiles_ab.json.
//   재촬영 예 = node probe_regress_ab.mjs index,join post rep1 → shots/ab_post_rep1 (대학 목록 계산값은 tiles_ab_rep1.json)
// 비교 = python3 ../r3/probe_regress_compare.py shots/ab_pre shots/ab_post regress_ab.json diff_ab
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const PRE = "87106d8";
const POST = "c342aff";
const BASE = "http://localhost:8092/";
const CHANGED = execFileSync("git", ["-C", REPO, "diff", "--name-only", PRE, POST]).toString().split("\n").filter(p => p && !/^(_design|_tools)\//.test(p));
const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", html: "text/html; charset=utf-8" };
const preBody = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${PRE}:${p}`])]));
const postBody = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${POST}:${p}`])]));   // 대조 판 postr = 수리 후 내용을 route 로 서빙(route 자체의 영향 분리용)
const CHANGED_SET = new Set(CHANGED);
process.stdout.write(`route files = ${CHANGED.length}\n`);
const PAGES = ["index", "request", "guidebook/index", "programs/guidebook", "programs/studio", "studio", "lectures", "interview", "interview/yonsei-hum", "about", "faq", "notice", "support", "b2b", "join", "login", "terms", "library", "ranking", "pastexam"];
const ONLY = process.argv[2] && process.argv[2] !== "all" ? process.argv[2].split(",") : null;
const VARIANTS = process.argv[3] ? process.argv[3].split(",") : ["pre", "post"];
const SUFFIX = process.argv[4] ? `_${process.argv[4]}` : "";
const WIDTHS = [[1440, 900], [390, 844]];
const TILE_WIDTHS = [[1440, 900], [390, 844], [1024, 768], [768, 1024], [600, 900], [430, 900]];
const FREEZE = ".rv{opacity:1!important;transform:none!important;transition:none!important} *,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}";
let routed = { pre: 0 };

async function open(browser, variant, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR" });
  if (variant === "pre" || variant === "postr") {
    const body = variant === "pre" ? preBody : postBody;
    await ctx.route(u => u.host === "localhost:8092" && CHANGED_SET.has(decodeURIComponent(u.pathname.slice(1))), async (route) => {
      const p = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
      routed.pre++;
      await route.fulfill({ status: 200, headers: { "content-type": TYPES[p.split(".").pop()], "cache-control": "no-store" }, body: body[p] });
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
    const help = document.querySelector("#find .top .help");
    return { cols: cs.gridTemplateColumns, ncol: new Set(ts.map(t => t[0])).size, count: ts.length, tiles: ts,
      boxTop: Math.round(box.getBoundingClientRect().top + scrollY), boxH: Math.round(box.getBoundingClientRect().height),
      helpBottom: help ? Math.round(help.getBoundingClientRect().bottom + scrollY) : null, helpMB: help ? getComputedStyle(help).marginBottom : null,
      findTop: Math.round(document.querySelector("#find").getBoundingClientRect().top + scrollY), findH: Math.round(document.querySelector("#find").getBoundingClientRect().height) };
  });
}

// route.fulfill 로 서빙한 문서는 Chrome Local Network Access 가 loopback(8799 모킹 API) 호출을 막아 행사 띠와 가격이 빠진다 → 두 판 모두 같은 플래그로 띄운다
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });
const tileRes = {};
for (const variant of VARIANTS) {
  const OUT = path.join(HERE, "shots", `ab_${variant}${SUFFIX}`);
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
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      if (await page.$(".pdim")) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await settle(page);
      tileRes[`${variant}_${w}`] = await tiles(page);
      await ctx.close();
    }
  }
}
await browser.close();
process.stdout.write(`routed pre responses = ${routed.pre}\n`);
if (Object.keys(tileRes).length) {
  const cmp = {};
  for (const [w] of TILE_WIDTHS) {
    const a = tileRes[`pre_${w}`], b = tileRes[`post_${w}`];
    if (!a || !b) continue;
    const diffIdx = a.tiles.map((t, i) => JSON.stringify(t) === JSON.stringify(b.tiles[i]) ? null : i).filter(i => i !== null);
    // 캡션 간격(16px) 로 목록 전체가 내려간 만큼을 빼고 타일 rect 를 비교
    const dy = b.boxTop - a.boxTop;
    const diffIdxShift = a.tiles.map((t, i) => { const u = b.tiles[i]; return u && t[0] === u[0] && t[1] + dy === u[1] && t[2] === u[2] && t[3] === u[3] && t[4] === u[4] && t[5] === u[5] ? null : i; }).filter(i => i !== null);
    cmp[w] = { pre_cols: a.cols, post_cols: b.cols, pre_ncol: a.ncol, post_ncol: b.ncol, pre_count: a.count, post_count: b.count, identical: JSON.stringify(a.tiles) === JSON.stringify(b.tiles), diff_tiles: diffIdx.length,
      box_dy: dy, diff_tiles_after_shift: diffIdxShift,
      pre_bt0: a.tiles.map((t, i) => t[4] === "0px" ? i + 1 : null).filter(Boolean), post_bt0: b.tiles.map((t, i) => t[4] === "0px" ? i + 1 : null).filter(Boolean),
      pre_pr0: a.tiles.map((t, i) => t[5] === "0px" ? i + 1 : null).filter(Boolean), post_pr0: b.tiles.map((t, i) => t[5] === "0px" ? i + 1 : null).filter(Boolean),
      pre_tile0: a.tiles[0], post_tile0: b.tiles[0], pre_tile1: a.tiles[1], post_tile1: b.tiles[1],
      pre_help: [a.helpBottom, a.helpMB, a.boxTop], post_help: [b.helpBottom, b.helpMB, b.boxTop],
      pre_find: [a.findTop, a.findH], post_find: [b.findTop, b.findH] };
    process.stdout.write(`tiles ${w}: ${JSON.stringify(cmp[w])}\n`);
  }
  fs.writeFileSync(path.join(HERE, `tiles_ab${SUFFIX}.json`), JSON.stringify({ pre: PRE, post: POST, route_files: CHANGED.length, raw: tileRes, cmp }, null, 1));
}
