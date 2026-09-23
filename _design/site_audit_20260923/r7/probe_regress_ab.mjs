// 2026-09-23 critic 7회차 regress 프로브: ab9160d(현재 서빙, 워크트리 hh-studio12 fix/popup-bar-r7) 가 라이브 96be167 대비 의도 밖을 바꾸지 않았는지 본다.
// r6/probe_regress_ab.mjs 복사본. 7회차에서 바뀐 것:
//   REPO = 워크트리 /Users/gregory/Workspace/_wt/hh-studio12 (8092 가 이 워크트리 루트를 서빙). 수리 전 판 = 96be167(라이브), 수리 후 판 = ab9160d(HEAD, 현재 서빙).
//     route 대상 = git diff --name-only 96be167 ab9160d 중 _design/ 와 _tools/ 를 뺀 서빙 파일 = assets/app.js, assets/base.css.
//   홈 팝업(N=2) 은 첫 장(index_popup_<폭>) 을 찍은 뒤 ArrowRight 1회 + 1000ms(전이 .5s) 뒤 둘째 장(index_popup_cur2_<폭>) 을 찍는다.
//   N=3(공지 1건 route) 도 첫 장(index_popup_n3_<폭>) 뒤 ArrowRight 1회 + 1000ms 뒤 둘째 장(index_popup_n3_cur2_<폭>) 을 찍는다(layout() 의 칸 2 이동 전이 없음 경로).
//   짧은 화면 390x640 홈 팝업 첫 장(index_popup_short_390x640) 을 더한다. 카드 max-height 가 하단바 자리를 남기는 것(ab9160d) 이 의도 차이.
//   measurePop 에 카드 max-height, scrollHeight/clientHeight, --pbar-h, 하단바 bottom 과 innerHeight, data-far 수, 현재 장 번호를 더했다.
// 아래는 6회차 머리말(그대로 둔다):
// r5/probe_regress_ab.mjs 복사본. 바뀐 것:
//   수리 전 판 = 94f577b, 수리 후 판 = 3d2ada3. route 대상 = git diff --name-only 94f577b 3d2ada3 중 _design/ 와 _tools/ 를 뺀 서빙 파일 전부
//     (assets/app.js, assets/base.css = 2개).
//   면 = shoot_r2.mjs PAGES 20면(compact 셸 4면은 이번 발주 대상 밖이라 뺐다).
//   홈 팝업에 N=3 판을 더한다: r5/probe_popnav.mjs 의 NOTICE3(공지 1건)를 /api/notices/active route 로 돌려주는 새 컨텍스트에서
//     같은 시점(DOMContentLoaded + networkidle 최대 5초 + 글꼴 + 300ms)에 찍는다 → index_popup_n3_<폭>.png. 팝업만 찍고 닫는다.
//   입구 면 5곳(about, lectures, interview, studio, guidebook/index)의 행사 카드 1장 팝업(N=1)도 닫기 전에 찍는다 → <면>_popup_<폭>.png
//   팝업 측정(measurePop)에 하단바 부모(.pstage 직계인지), 하단바 top - 활성 .pop bottom, 활성 .pop border-bottom-color, 문서 초점 위치를 더했다.
//   .wf_stop 이 보이면 다음 면으로 넘어가지 않고 지금까지 찍은 것으로 끝낸다(stopped 기록).
// 수리 전 판 = Playwright route 가 위 2개 파일만 git show 94f577b:<path> 내용으로 바꿔 응답한다. 리포 파일은 건드리지 않는다.
// 결정론 조건(두 판 동일, r3, r4, r5 와 같음): 팝업은 DOMContentLoaded + networkidle(최대 5초) + 글꼴 준비 + 300ms 에 찍고 ESC. 본문은 애니메이션과 전환 정지, 영상 숨김,
//   lazy 이미지 eager 전환 후 로드 완료와 decode 대기, .rv 강제 표시. Chrome LNA 검사 끔(route 서빙 문서의 8799 모킹 API 호출 허용, 두 판 같은 플래그).
// 사용: node probe_regress_ab.mjs [면,면|all] [pre,post,postr] [폴더 접미사]
//   postr = 대조 판. 수리 후(3d2ada3) 내용을 pre 와 똑같이 route.fulfill 로 서빙한다. post(서버) 와 postr 의 차이 = route 서빙 자체의 영향.
//   기본 = 전 면, pre 와 post, shots/ab_pre + shots/ab_post + tiles_ab.json + locate_ab.json.
//   재촬영 예 = node probe_regress_ab.mjs index,programs/guidebook post rep1 → shots/ab_post_rep1
// 비교 = python3 ../r3/probe_regress_compare.py shots/ab_pre shots/ab_post regress_ab.json diff_ab
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = "/Users/gregory/Workspace/_wt/hh-studio12";
const PRE = "96be167";
const POST = "ab9160d";
const BASE = "http://localhost:8092/";
const APIB = "http://localhost:8799";
const STOP = path.join(HERE, ".wf_stop");
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const NOTICE3 = { items: [{ id: "ntc_probe_n3", title: "프로브 공지: 세 장 순환 확인용 카드", body_md: "세 장 순환과 좌우 측면 카드 클릭을 재려고 route 로 더한 공지입니다." }] };   // r5/probe_popnav.mjs 와 같은 값
const CHANGED = execFileSync("git", ["-C", REPO, "diff", "--name-only", PRE, POST]).toString().split("\n").filter(p => p && !/^(_design|_tools)\//.test(p));
const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", html: "text/html; charset=utf-8" };
const preBody = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${PRE}:${p}`])]));
const postBody = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${POST}:${p}`])]));   // 대조 판 postr = 수리 후 내용을 route 로 서빙(route 자체의 영향 분리용)
const CHANGED_SET = new Set(CHANGED);
// 서빙 파일이 3d2ada3 과 같은지 확인(현재 서빙 = 수리 후 판이어야 post 가 3d2ada3 이다). 디스크와 8092 응답 둘 다 본다.
const drift = CHANGED.filter(p => !fs.readFileSync(path.join(REPO, p)).equals(postBody[p]));
const servedDrift = [];
for (const p of CHANGED) { const b = Buffer.from(await (await fetch(BASE + p)).arrayBuffer()); if (!b.equals(postBody[p])) servedDrift.push(p); }
process.stdout.write(`route files = ${CHANGED.length} (${CHANGED.join(",")}); disk != ${POST}: ${drift.length} ${drift.join(",")}; served != ${POST}: ${servedDrift.length} ${servedDrift.join(",")}\n`);
const PAGES = ["index", "request", "guidebook/index", "programs/guidebook", "programs/studio", "studio", "lectures", "interview", "interview/yonsei-hum", "about", "faq", "notice", "support", "b2b", "join", "login", "terms", "library", "ranking", "pastexam"];
const ONLY = process.argv[2] && process.argv[2] !== "all" ? process.argv[2].split(",") : null;
const VARIANTS = process.argv[3] ? process.argv[3].split(",") : ["pre", "post"];
const SUFFIX = process.argv[4] ? `_${process.argv[4]}` : "";
const WIDTHS = [[1440, 900], [390, 844]];
const TILE_WIDTHS = [[1440, 900], [390, 844], [1024, 768], [768, 1024], [600, 900], [430, 900]];
const FREEZE = ".rv{opacity:1!important;transform:none!important;transition:none!important} *,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}";
const CAP = 16384;
let routed = { pre: 0 };
let stopped = false;

async function open(browser, variant, w, h, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR" });
  if (variant === "pre" || variant === "postr") {
    const body = variant === "pre" ? preBody : postBody;
    await ctx.route(u => u.host === "localhost:8092" && CHANGED_SET.has(decodeURIComponent(u.pathname.slice(1))), async (route) => {
      const p = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
      routed.pre++;
      await route.fulfill({ status: 200, headers: { "content-type": TYPES[p.split(".").pop()], "cache-control": "no-store" }, body: body[p] });
    });
  }
  if (o.notices) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(o.notices) }));
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
  const ae = document.activeElement;
  const onR = on && on.getBoundingClientRect(), barR = bar && bar.getBoundingClientRect();
  return { n: document.querySelectorAll(".pdim .pslot").length, stage: R(document.querySelector(".pstage")),
    on: R(on), onBB: on && getComputedStyle(on).borderBottomWidth, onBBC: on && getComputedStyle(on).borderBottomColor, onBg: on && getComputedStyle(on).backgroundColor,
    bar: R(bar), barBT: bar && getComputedStyle(bar).borderTopWidth, barParent: bar && bar.parentElement && bar.parentElement.className,
    barTop_minus_onBottom: onR && barR ? +(barR.top - onR.bottom).toFixed(2) : null,
    focus: ae ? `${ae.tagName.toLowerCase()}${ae.className ? "." + String(ae.className).split(" ")[0] : ""}${ae.getAttribute("aria-label") ? "[" + ae.getAttribute("aria-label") + "]" : ""}` : null,
    sides: [...document.querySelectorAll(".pslot[data-side] .pop")].map(e => ({ r: R(e), bb: getComputedStyle(e).borderBottomWidth, bg: getComputedStyle(e).backgroundColor, visible: e.getClientRects().length > 0 })),
    pause: btn && [btn.textContent, btn.getAttribute("aria-label"), btn.getAttribute("aria-pressed")],
    // 7회차 추가
    cur: (document.querySelector("[data-ppop-cur]") || {}).textContent || null,
    onMaxH: on && getComputedStyle(on).maxHeight, onSH: on && on.scrollHeight, onCH: on && on.clientHeight,
    pbarH: (document.querySelector(".pdim") && document.querySelector(".pdim").style.getPropertyValue("--pbar-h")) || null,
    barBottom_vs_innerH: barR ? [+(barR.bottom).toFixed(1), innerHeight] : null,
    far: document.querySelectorAll(".pslot[data-far]").length,
    slotsD: [...document.querySelectorAll(".pdim .pslot")].map(s => [s.dataset.i, s.dataset.d === undefined ? null : s.dataset.d, s.hasAttribute("data-on") ? "on" : s.getAttribute("data-side")]) };
};
// 첫 장을 찍은 뒤 ArrowRight 1회 + 1000ms(전이 --dur-2 .5s) 뒤 둘째 장을 찍는다. 두 판 같은 조작.
async function shotNext(page, variant, OUT, key) {
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, `${key}.png`) });
  const pm = await page.evaluate(measurePop);
  (loc[key] ||= {})[variant] = pm;
  process.stdout.write(`${variant} ${key} pop=${JSON.stringify(pm)}\n`);
}

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
outer:
for (const variant of VARIANTS) {
  const OUT = path.join(HERE, "shots", `ab_${variant}${SUFFIX}`);
  fs.mkdirSync(OUT, { recursive: true });
  for (const [w, h] of WIDTHS) {
    for (const p of PAGES) {
      if (ONLY && !ONLY.includes(p)) continue;
      if (fs.existsSync(STOP)) { stopped = true; process.stdout.write(`STOP seen before ${variant} ${p}_${w}\n`); break outer; }
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
            await shotNext(page, variant, OUT, `index_popup_cur2_${w}`);
          } else {
            // 입구 면(about, lectures, interview, studio, guidebook/index)은 빌드가 넣은 행사 카드 1장 팝업이 뜬다(N=1). 같은 무대 코드라 같이 찍는다 → <면>_popup_<폭>.png
            await page.screenshot({ path: path.join(OUT, `${name}_popup_${w}.png`) });
            const pm = await page.evaluate(measurePop);
            (loc[`${name}_popup_${w}`] ||= {})[variant] = pm;
            process.stdout.write(`${variant} ${name}_popup_${w} pop=${JSON.stringify(pm)}\n`);
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
      // N=3 홈 팝업: 공지 1건 route. 팝업만 찍는다.
      if (p === "index") {
        const ctx3 = await open(browser, variant, w, h, { notices: NOTICE3 });
        const page3 = await ctx3.newPage();
        try {
          await page3.goto(BASE + "index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
          await page3.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
          await page3.evaluate(() => document.fonts.ready);
          await page3.waitForTimeout(300);
          if (await page3.$(".pdim")) {
            await page3.screenshot({ path: path.join(OUT, `index_popup_n3_${w}.png`) });
            const pm = await page3.evaluate(measurePop);
            (loc[`index_popup_n3_${w}`] ||= {})[variant] = pm;
            process.stdout.write(`${variant} popup_n3_${w} pop=${JSON.stringify(pm)}\n`);
            await shotNext(page3, variant, OUT, `index_popup_n3_cur2_${w}`);
          } else process.stdout.write(`${variant} popup_n3_${w} NO .pdim\n`);
        } catch (e) {
          process.stdout.write(`${variant} popup_n3_${w} FAIL ${e.message.split("\n")[0]}\n`);
        }
        await ctx3.close();
        // 짧은 화면 390x640 홈 팝업 첫 장(390 차례에 한 번). 카드 max-height 가 하단바 자리를 남기는 것이 의도 차이.
        if (w === 390) {
          const ctxS = await open(browser, variant, 390, 640);
          const pageS = await ctxS.newPage();
          try {
            await pageS.goto(BASE + "index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
            await pageS.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
            await pageS.evaluate(() => document.fonts.ready);
            await pageS.waitForTimeout(300);
            if (await pageS.$(".pdim")) {
              await pageS.screenshot({ path: path.join(OUT, `index_popup_short_390x640.png`) });
              const pm = await pageS.evaluate(measurePop);
              (loc[`index_popup_short_390x640`] ||= {})[variant] = pm;
              process.stdout.write(`${variant} popup_short_390x640 pop=${JSON.stringify(pm)}\n`);
            } else process.stdout.write(`${variant} popup_short_390x640 NO .pdim\n`);
          } catch (e) {
            process.stdout.write(`${variant} popup_short_390x640 FAIL ${e.message.split("\n")[0]}\n`);
          }
          await ctxS.close();
        }
      }
    }
  }
  if (!stopped && (!ONLY || ONLY.includes("index"))) {
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
process.stdout.write(`routed responses = ${routed.pre}${stopped ? " (stopped)" : ""}\n`);
fs.writeFileSync(path.join(HERE, `locate_ab${SUFFIX}.json`), JSON.stringify({ pre: PRE, post: POST, variants: VARIANTS, route_files: CHANGED, disk_drift: drift, served_drift: servedDrift, stopped, loc }, null, 1));
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
  fs.writeFileSync(path.join(HERE, `tiles_ab${SUFFIX}.json`), JSON.stringify({ pre: PRE, post: POST, variants: VARIANTS, route_files: CHANGED, raw: tileRes, cmp }, null, 1));
}
process.exit(0);
