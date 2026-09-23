// 2026-09-23 critic 5회차 regress 프로브: 507edf1 수리 전(c342aff = 4회차 채점 판) 과 후(507edf1 = 현재 서빙) 를 같은 브라우저, 같은 시각, 결정론 조건으로 찍어 비교한다.
// r4/probe_regress_ab.mjs 복사본. 바뀐 것:
//   수리 전 판 = c342aff, 수리 후 판 = 507edf1. route 대상 = git diff --name-only c342aff 507edf1 중 _design/ 와 _tools/ 를 뺀 서빙 파일 전부
//     (assets/app.js, assets/base.css, 푸터 인라인을 되돌린 html 70개 = 72개).
//   면 = shoot_r2.mjs PAGES 20면 + compact 셸 면 cart, checkout, my, 404 (모킹 API 상태 그대로).
//   r4/probe_regress_locate.mjs 의 구역 측정(푸터 .ft-legal 과 링크 글자 rect, 가입 약관 행)을 같은 컨텍스트에서 같이 잰다 → locate_ab<접미사>.json
//     + 팝업 캡처 시점의 활성 카드 .pop, 하단바 .pbar rect 와 border-bottom.
//   문서 높이가 16384px 를 넘는 면(studio_390)은 전체 캡처 뒤 r4/probe_regress_tail.mjs 방식 꼬리 캡처를 같은 페이지에서 이어 찍는다
//     (sticky = static, fixed = visibility:hidden 촬영용, 창 스크롤 16384 와 문서 끝-창높이 2장 + footer.ft 요소 1장) → shots/ab_tail_<판><접미사>/
// 수리 전 판 = Playwright route 가 위 72개 파일만 git show c342aff:<path> 내용으로 바꿔 응답한다. 리포 파일은 건드리지 않는다.
// 결정론 조건(두 판 동일, r3, r4 와 같음): 팝업은 DOMContentLoaded + networkidle(최대 5초) + 글꼴 준비 + 300ms 에 찍고 ESC. 본문은 애니메이션과 전환 정지, 영상 숨김,
//   lazy 이미지 eager 전환 후 로드 완료와 decode 대기, .rv 강제 표시. Chrome LNA 검사 끔(route 서빙 문서의 8799 모킹 API 호출 허용, 두 판 같은 플래그).
// 사용: node probe_regress_ab.mjs [면,면|all] [pre,post,postr] [폴더 접미사]
//   postr = 대조 판. 수리 후(507edf1) 내용을 pre 와 똑같이 route.fulfill 로 서빙한다. post(서버) 와 postr 의 차이 = route 서빙 자체의 영향.
//   기본 = 전 면, pre 와 post, shots/ab_pre + shots/ab_post + tiles_ab.json + locate_ab.json.
//   재촬영 예 = node probe_regress_ab.mjs index,join post rep1 → shots/ab_post_rep1
// 비교 = python3 ../r3/probe_regress_compare.py shots/ab_pre shots/ab_post regress_ab.json diff_ab
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const PRE = "c342aff";
const POST = "507edf1";
const BASE = "http://localhost:8092/";
const CHANGED = execFileSync("git", ["-C", REPO, "diff", "--name-only", PRE, POST]).toString().split("\n").filter(p => p && !/^(_design|_tools)\//.test(p));
const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", html: "text/html; charset=utf-8" };
const preBody = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${PRE}:${p}`])]));
const postBody = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${POST}:${p}`])]));   // 대조 판 postr = 수리 후 내용을 route 로 서빙(route 자체의 영향 분리용)
const CHANGED_SET = new Set(CHANGED);
// 서빙 파일이 507edf1 과 같은지 확인(현재 서빙 = 수리 후 판이어야 post 가 507edf1 이다)
const drift = CHANGED.filter(p => !fs.readFileSync(path.join(REPO, p)).equals(postBody[p]));
process.stdout.write(`route files = ${CHANGED.length} (css ${CHANGED.filter(p => p.endsWith(".css")).length}, js ${CHANGED.filter(p => p.endsWith(".js")).length}, html ${CHANGED.filter(p => p.endsWith(".html")).length}); disk != ${POST}: ${drift.length} ${drift.join(",")}\n`);
const PAGES = ["index", "request", "guidebook/index", "programs/guidebook", "programs/studio", "studio", "lectures", "interview", "interview/yonsei-hum", "about", "faq", "notice", "support", "b2b", "join", "login", "terms", "library", "ranking", "pastexam",
  "cart", "checkout", "my", "404"];
const ONLY = process.argv[2] && process.argv[2] !== "all" ? process.argv[2].split(",") : null;
const VARIANTS = process.argv[3] ? process.argv[3].split(",") : ["pre", "post"];
const SUFFIX = process.argv[4] ? `_${process.argv[4]}` : "";
const WIDTHS = [[1440, 900], [390, 844]];
const TILE_WIDTHS = [[1440, 900], [390, 844], [1024, 768], [768, 1024], [600, 900], [430, 900]];
const FREEZE = ".rv{opacity:1!important;transform:none!important;transition:none!important} *,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}";
const CAP = 16384;
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
    return { cols: cs.gridTemplateColumns, ncol: new Set(ts.map(t => t[0])).size, count: ts.length, tiles: ts,
      boxTop: Math.round(box.getBoundingClientRect().top + scrollY), boxH: Math.round(box.getBoundingClientRect().height) };
  });
}

// r4/probe_regress_locate.mjs measure 와 같음(+ 문서 높이)
const measure = () => {
  const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.right), Math.round(r.bottom + scrollY)]; };
  const textR = (e) => { const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(); return [+(r.x).toFixed(1), Math.round(r.y + scrollY), +(r.right).toFixed(1), Math.round(r.bottom + scrollY)]; };
  const legal = document.querySelector("footer .ft-legal");
  return {
    docH: document.documentElement.scrollHeight,
    ftLegal: R(legal),
    ftLegalLinks: legal ? [...legal.querySelectorAll("a")].map(a => ({ t: a.textContent.trim(), box: R(a), text: textR(a), jc: getComputedStyle(a).justifyContent })) : [],
    footer: R(document.querySelector("footer")),
    help: R(document.querySelector("#find .top .help")),
    tiles: R(document.querySelector("#tiles")),
    checks: [...document.querySelectorAll("#joinForm .check")].map(c => ({ row: R(c), view: R(c.querySelector(".view")), viewText: c.querySelector(".view") ? textR(c.querySelector(".view")) : null })),
  };
};
const measurePop = () => {
  const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [+(r.x).toFixed(1), +(r.y).toFixed(1), +(r.right).toFixed(1), +(r.bottom).toFixed(1)]; };
  const on = document.querySelector(".pslot[data-on] .pop"), bar = document.querySelector(".pbar"), btn = document.querySelector("[data-ppop-pause]");
  return { on: R(on), onBB: on && getComputedStyle(on).borderBottomWidth, onBg: on && getComputedStyle(on).backgroundColor, bar: R(bar), barBT: bar && getComputedStyle(bar).borderTopWidth,
    sides: [...document.querySelectorAll(".pslot[data-side] .pop")].map(e => ({ r: R(e), bb: getComputedStyle(e).borderBottomWidth, bg: getComputedStyle(e).backgroundColor, visible: e.getClientRects().length > 0 })),
    pause: btn && [btn.textContent, btn.getAttribute("aria-label"), btn.getAttribute("aria-pressed")] };
};

async function tail(page, variant, name, h) {
  const OUT = path.join(HERE, "shots", `ab_tail_${variant}${SUFFIX}`);
  fs.mkdirSync(OUT, { recursive: true });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
  const unstuck = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const p = getComputedStyle(el).position;
      if (p === "sticky" || p === "fixed") { el.setAttribute("data-probe-unstick", p); out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}:${p}`); }
    }
    return out;
  });
  await page.addStyleTag({ content: '[data-probe-unstick="sticky"]{position:static!important}[data-probe-unstick="fixed"]{visibility:hidden!important}' });
  await page.waitForTimeout(400);
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  const rec = { unstuck, docH };
  for (const y of [CAP, docH - h]) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
    await page.waitForTimeout(400);
    rec[`scroll${y}`] = await page.evaluate(() => scrollY);
    await page.screenshot({ path: path.join(OUT, `${name}_scroll${y}.png`) });
  }
  await page.locator("footer.ft").screenshot({ path: path.join(OUT, `${name}_footer.png`) });
  return rec;
}

// route.fulfill 로 서빙한 문서는 Chrome Local Network Access 가 loopback(8799 모킹 API) 호출을 막아 행사 띠와 가격이 빠진다 → 두 판 모두 같은 플래그로 띄운다
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });
const tileRes = {};
const loc = {};
for (const variant of VARIANTS) {
  const OUT = path.join(HERE, "shots", `ab_${variant}${SUFFIX}`);
  fs.mkdirSync(OUT, { recursive: true });
  for (const [w, h] of WIDTHS) {
    for (const p of PAGES) {
      if (ONLY && !ONLY.includes(p)) continue;
      const ctx = await open(browser, variant, w, h);
      const page = await ctx.newPage();
      const name = p.replace(/\//g, "_");
      const shotName = `${p === "index" ? "index_nopop" : name}_${w}`;
      try {
        const resp = await page.goto(BASE + p + ".html", { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        if (await page.$(".pdim")) {
          if (p === "index") {
            await page.screenshot({ path: path.join(OUT, `index_popup_${w}.png`) });
            const pm = await page.evaluate(measurePop);
            (loc[`index_popup_${w}`] ||= {})[variant] = pm;
            const cur = await page.evaluate(() => { const e = document.querySelector("[data-ppop-cur]"); return e ? e.textContent : null; });
            process.stdout.write(`${variant} popup_${w} cur=${cur} pop=${JSON.stringify(pm)}\n`);
          }
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
        }
        await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
        await settle(page);
        const m = await page.evaluate(measure);
        m.status = resp ? resp.status() : null;
        (loc[shotName] ||= {})[variant] = m;
        await page.screenshot({ path: path.join(OUT, `${shotName}.png`), fullPage: true });
        if (p === "index") {
          const el = await page.$("#tiles");
          if (el) await el.screenshot({ path: path.join(OUT, `index_tiles_${w}.png`) });
        }
        if (m.docH > CAP) {
          m.tail = await tail(page, variant, shotName, h);
          process.stdout.write(`${variant} ${shotName} tail ${JSON.stringify(m.tail)}\n`);
        }
        process.stdout.write(`${variant} ${shotName} ok docH=${m.docH} status=${m.status}\n`);
      } catch (e) {
        process.stdout.write(`${variant} ${shotName} FAIL ${e.message.split("\n")[0]}\n`);
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
await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]);
process.stdout.write(`routed responses = ${routed.pre}\n`);
fs.writeFileSync(path.join(HERE, `locate_ab${SUFFIX}.json`), JSON.stringify({ pre: PRE, post: POST, variants: VARIANTS, route_files: CHANGED.length, disk_drift: drift, loc }, null, 1));
if (Object.keys(tileRes).length) {
  const cmp = {};
  for (const [w] of TILE_WIDTHS) {
    const a = tileRes[`${VARIANTS[0]}_${w}`], b = tileRes[`${VARIANTS[1]}_${w}`];
    if (!a || !b) continue;
    const diffIdx = a.tiles.map((t, i) => JSON.stringify(t) === JSON.stringify(b.tiles[i]) ? null : i).filter(i => i !== null);
    cmp[w] = { a_cols: a.cols, b_cols: b.cols, a_ncol: a.ncol, b_ncol: b.ncol, a_count: a.count, b_count: b.count, identical: JSON.stringify(a.tiles) === JSON.stringify(b.tiles), diff_tiles: diffIdx,
      box_dy: b.boxTop - a.boxTop,
      a_bt0: a.tiles.map((t, i) => t[4] === "0px" ? i + 1 : null).filter(Boolean), b_bt0: b.tiles.map((t, i) => t[4] === "0px" ? i + 1 : null).filter(Boolean),
      a_pr0: a.tiles.map((t, i) => t[5] === "0px" ? i + 1 : null).filter(Boolean), b_pr0: b.tiles.map((t, i) => t[5] === "0px" ? i + 1 : null).filter(Boolean) };
    process.stdout.write(`tiles ${w}: ${JSON.stringify(cmp[w])}\n`);
  }
  fs.writeFileSync(path.join(HERE, `tiles_ab${SUFFIX}.json`), JSON.stringify({ pre: PRE, post: POST, variants: VARIANTS, route_files: CHANGED.length, raw: tileRes, cmp }, null, 1));
}
process.exit(0);
