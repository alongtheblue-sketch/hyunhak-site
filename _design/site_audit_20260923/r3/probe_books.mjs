// 2026-09-23 critic 3회차 프로브 books: critic 2차 §4 P1-4 수리(programs/guidebook.html #books 링크 「담기」 → return_buy) 실브라우저 검증
// + critic 2차 P2 「shoot_r2 가 lazy 이미지를 안 트리거」 대응 lazy 트리거 fullPage 캡처.
// 로컬 하네스 = 8092 정적 + 8799 모킹 API. 리포 추적 파일은 읽기만 한다.
// 사용: node _design/site_audit_20260923/r3/probe_books.mjs
// 재사용: import { triggerLazy, openClean } from "./r3/probe_books.mjs" (아래 main 은 직접 실행할 때만 돈다)
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, "shots");
const BASE = "http://localhost:8092/";
const RV_CSS = ".rv{opacity:1!important;transform:none!important;transition:none!important}";

// 면을 새 컨텍스트로 열고 팝업을 닫은 뒤 .rv 를 강제 표시한다 (shoot_r2 관례).
export async function openClean(browser, p, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR" });
  const page = await ctx.newPage();
  const imgErrors = [];
  page.on("response", (r) => { if (r.request().resourceType() === "image" && r.status() >= 400) imgErrors.push({ url: r.url(), status: r.status() }); });
  page.on("requestfailed", (r) => { if (r.resourceType() === "image") imgErrors.push({ url: r.url(), status: "failed:" + (r.failure()?.errorText || "") }); });
  await page.goto(BASE + p + ".html", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: RV_CSS });
  if (await page.$(".pdim")) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  return { ctx, page, imgErrors };
}

// lazy 이미지 트리거: 끝까지 step px 씩 단계 스크롤(매 단계 pause ms) → 가로 스크롤 목록(표본 갤러리 .r2-samples, 들어가는 면 .openers 등)도
// 단계로 끝까지 민 뒤 0 으로 되돌림 → 렌더되는 img 전부가 complete && naturalWidth>0 이 될 때까지 최대 timeout ms 대기.
// 가로 목록 밖 img 는 세로 스크롤만으로는 lazy 가 안 풀린다(2026-09-23 실측: 1440 guidebook 3장, 390 2장 미로드).
// display:none img(예 390 #books 표지, astra D P1-4 의도) 는 lazy 라 영영 안 받으므로 대기 조건에서 빼고 hiddenLazy 로 따로 센다.
// 반환 = { total, loaded, broken:[{src,visible}], pending:[{src,loading,visible}], hiddenLazy, horizScrollers, waitedMs }.
// broken = complete 인데 naturalWidth 0(깨진 파일), pending = 시한 안에 complete 가 안 된 것(hidden 포함). scroll-behavior:smooth 면이라 스크롤은 behavior:"instant".
export async function triggerLazy(page, { step = 400, pause = 150, timeout = 15000, horizontal = true } = {}) {
  const total = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  for (let y = 0; y <= total + step; y += step) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, left: 0, behavior: "instant" }), y);
    await page.waitForTimeout(pause);
  }
  // 스크롤 도중 높이가 늘었을 수 있어 한 번 더 바닥까지
  const total2 = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  for (let y = total; y <= total2 + step; y += step) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, left: 0, behavior: "instant" }), y);
    await page.waitForTimeout(pause);
  }
  let horizScrollers = 0;
  if (horizontal) {
    horizScrollers = await page.evaluate(async ({ pause }) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const els = [...document.querySelectorAll("*")].filter((el) => {
        const cs = getComputedStyle(el);
        return /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && cs.display !== "none" && el.getClientRects().length > 0 && !!el.querySelector("img");
      });
      for (const el of els) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        await sleep(pause);
        for (let x = 0; x <= el.scrollWidth; x += Math.max(200, el.clientWidth / 2)) { el.scrollTo({ left: x, behavior: "instant" }); await sleep(pause); }
        el.scrollTo({ left: 0, behavior: "instant" });
      }
      return els.length;
    }, { pause });
  }
  const t0 = Date.now();
  await page.waitForFunction(() => [...document.images].filter((i) => getComputedStyle(i).display !== "none" && !i.closest("[hidden],template,noscript")).every((i) => i.complete && i.naturalWidth > 0), null, { timeout, polling: 250 }).catch(() => {});
  const waitedMs = Date.now() - t0;
  const r = await page.evaluate(() => {
    const imgs = [...document.images];
    const vis = (el) => { const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && b.width > 0 && b.height > 0 && !el.closest("[hidden]"); };
    return {
      total: imgs.length,
      loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
      broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => ({ src: i.currentSrc || i.src, visible: vis(i) })),
      pending: imgs.filter((i) => !i.complete).map((i) => ({ src: i.currentSrc || i.src, loading: i.loading, visible: vis(i) })),
      hiddenLazy: imgs.filter((i) => !i.complete && (getComputedStyle(i).display === "none" || i.closest("[hidden]"))).length,
    };
  });
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
  return { ...r, horizScrollers, waitedMs };
}

// 뷰포트보다 긴 element 캡처용: sticky/fixed 요소를 캡처 동안만 치운다. 반환 = 치운 요소 요약.
export async function unstick(page) {
  const list = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const p = getComputedStyle(el).position;
      if (p === "sticky" || p === "fixed") { el.setAttribute("data-probe-unstick", p); out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}:${p}`); }
    }
    return out;
  });
  await page.addStyleTag({ content: '[data-probe-unstick="sticky"]{position:static!important}[data-probe-unstick="fixed"]{visibility:hidden!important}' });
  return list;
}
export async function restick(page) {
  await page.evaluate(() => document.querySelectorAll("[data-probe-unstick]").forEach((el) => el.removeAttribute("data-probe-unstick")));
}

async function waitScrollSettle(page, maxMs = 3000) {
  let last = -1, same = 0; const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) { if (++same >= 4) break; } else same = 0;
    last = y; await page.waitForTimeout(100);
  }
  return Date.now() - t0;
}

// #books 링크 측정 + 클릭 이동 검증
async function probeBooksLink(browser, w, h) {
  const { ctx, page, imgErrors } = await openClean(browser, "programs/guidebook", w, h);
  const lazy = await triggerLazy(page);
  const info = await page.evaluate(() => {
    const books = document.querySelector("#books");
    const link = books && books.querySelector(":scope > a.tlink");
    const closeBtn = document.querySelector("#close .r3-actions a.btn");
    const buy = document.getElementById("buy");
    const b = link && link.getBoundingClientRect();
    const cs = link && getComputedStyle(link);
    return {
      booksExists: !!books,
      linkText: link ? link.textContent.trim() : null,
      linkHref: link ? link.getAttribute("href") : null,
      linkCopyKey: link ? (link.querySelector("[data-copy]") || {}).dataset?.copy : null,
      linkBox: b ? { w: +b.width.toFixed(1), h: +b.height.toFixed(1) } : null,
      linkMinHeight: cs ? cs.minHeight : null,
      linkDisplay: cs ? cs.display : null,
      closeText: closeBtn ? closeBtn.textContent.trim() : null,
      closeHref: closeBtn ? closeBtn.getAttribute("href") : null,
      closeCopyKey: closeBtn ? (closeBtn.querySelector("[data-copy]") || {}).dataset?.copy : null,
      buyCount: document.querySelectorAll("#buy").length,
      buyTag: buy ? buy.tagName + "." + buy.className : null,
      buyScrollMarginTop: buy ? getComputedStyle(buy).scrollMarginTop : null,
      placeholderInDom: /__C_[A-Za-z0-9_-]+__/.test(document.body.innerHTML),
      primaryBtnText: (document.querySelector("#buy [data-primary]") || {}).textContent?.trim() || null,
    };
  });
  // 링크를 화면 가운데로 옮긴 뒤 클릭 (instant 로 옮기고 안착 대기)
  await page.evaluate(() => { const l = document.querySelector("#books > a.tlink"); const b = l.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + b.top - innerHeight / 2, behavior: "instant" }); });
  await waitScrollSettle(page);
  const before = await page.evaluate(() => {
    const l = document.querySelector("#books > a.tlink"); const b = l.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2; const hit = document.elementFromPoint(cx, cy);
    return { scrollY: Math.round(window.scrollY), buyTop: +document.getElementById("buy").getBoundingClientRect().top.toFixed(1), hash: location.hash, linkHitSelf: !!(hit && l.contains(hit)), linkTop: +b.top.toFixed(1) };
  });
  await page.click("#books > a.tlink");
  const settleMs = await waitScrollSettle(page, 4000);
  const after = await page.evaluate(() => {
    const hd = document.querySelector("header.hd, .hd");
    const hb = hd ? hd.getBoundingClientRect() : null; const hcs = hd ? getComputedStyle(hd) : null;
    return { scrollY: Math.round(window.scrollY), buyTop: +document.getElementById("buy").getBoundingClientRect().top.toFixed(1), hash: location.hash,
      headerBottom: hb ? +hb.bottom.toFixed(1) : null, headerPos: hcs ? hcs.position : null };
  });
  // #books element 캡처 (lazy 표지 로드 뒤). 절이 뷰포트보다 길어 sticky 헤더와 고정 하단 탭이 절 중간에 찍히므로
  // 캡처하는 동안만 sticky → static(흐름 자리 그대로라 배치 불변), fixed → visibility:hidden 으로 둔다.
  const shot = path.join(SHOTS, `books_${w}.png`);
  const unstuck = await unstick(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  await page.locator("#books").screenshot({ path: shot });
  await restick(page);
  await ctx.close();
  const smt = parseFloat(info.buyScrollMarginTop);
  return { w, h, info, before, after, settleMs, lazy, imgErrors, shot, unstuck,
    moved: after.scrollY !== before.scrollY,
    buyTopDeltaFromMargin: +(after.buyTop - smt).toFixed(1),
    buyBelowHeader: after.headerBottom == null ? null : after.buyTop >= after.headerBottom - 0.5 };
}

async function lazyShots(browser) {
  const PAGES = ["programs/guidebook", "programs/studio", "guidebook/index", "studio"];
  const out = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    for (const p of PAGES) {
      const { ctx, page, imgErrors } = await openClean(browser, p, w, h);
      const lz = await triggerLazy(page);
      const shot = path.join(SHOTS, `lazy_${p.replace(/\//g, "_")}_${w}.png`);
      // fullPage 캡처는 fixed 요소(390 하단 탭 nav.fix)를 첫 뷰포트 바닥 자리에 그려 본문 위에 얹는다 → 캡처 동안만 치운다(1차 실측에서 390 표본 이미지 위에 겹침).
      const unstuck = await unstick(page);
      await page.waitForTimeout(100);
      await page.screenshot({ path: shot, fullPage: true });
      await restick(page);
      const dims = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight }));
      out.push({ page: p, w, ...lz, imgHttpErrors: imgErrors, shot, unstuckFixed: unstuck.filter((s) => s.endsWith(":fixed")), ...dims });
      process.stdout.write(`lazy ${p} ${w}: img ${lz.loaded}/${lz.total} broken=${lz.broken.length} pending=${lz.pending.length} (hidden ${lz.hiddenLazy}) hscroll=${lz.horizScrollers} waited=${lz.waitedMs}ms httpErr=${imgErrors.length} scrollW=${dims.scrollW} H=${dims.scrollH}\n`);
      await ctx.close();
    }
  }
  return out;
}

// 정적 검사 (파일 읽기만): 1) 산출 #books 링크 문구·href·#close 버튼 일치·id="buy" 수 2) 산출 *.html 의 __C_ 자리표시자 잔존 3) 「담기」 문구가 #buy 로 가는 링크
function staticChecks() {
  const ROOT = path.resolve(HERE, "../../..");
  const EXCL = new Set(["node_modules", "_design", "_docs", "_tools", ".git"]);
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!EXCL.has(e.name) && !(d === ROOT && e.name.startsWith("."))) walk(path.join(d, e.name)); }
      else if (e.name.endsWith(".html")) files.push(path.join(d, e.name));
    }
  })(ROOT);
  const placeholders = [], buyDamgi = [];
  for (const f of files) {
    const s = fs.readFileSync(f, "utf8");
    const m = s.match(/__C_[A-Za-z0-9_-]+__/g); if (m) placeholders.push({ file: path.relative(ROOT, f), n: m.length, first: m[0] });
    for (const a of s.matchAll(/<a\b[^>]*href="#buy"[^>]*>([\s\S]*?)<\/a>/g)) { const t = a[1].replace(/<[^>]+>/g, "").trim(); if (/담기/.test(t) || /data-copy="add"/.test(a[1])) buyDamgi.push({ file: path.relative(ROOT, f), text: t }); }
  }
  const g = fs.readFileSync(path.join(ROOT, "programs/guidebook.html"), "utf8");
  const books = g.match(/<section[^>]*id="books"[\s\S]*?<\/section>/)[0];
  const bl = [...books.matchAll(/<a class="tlink" href="([^"]+)"><span data-copy="([^"]+)">([^<]*)<\/span><\/a><\/section>/g)].map((m) => ({ href: m[1], key: m[2], text: m[3] }));
  const close = g.match(/<section[^>]*id="close"[\s\S]*?<\/section>/)[0].match(/<a class="btn" href="([^"]+)"><span data-copy="([^"]+)">([^<]*)</);
  const t = fs.readFileSync(path.join(ROOT, "_tools/program_guidebook_v2.html"), "utf8").split("\n");
  return {
    htmlFilesScanned: files.length, placeholders, buyDamgi,
    booksLink: bl, closeBtn: close ? { href: close[1], key: close[2], text: close[3] } : null,
    buyIdCount: (g.match(/id="buy"/g) || []).length,
    template92: t[91].match(/<a class="tlink" href="#buy"><span data-copy="([^"]+)">/)?.[1] || null,
  };
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const st = staticChecks();
  process.stdout.write(`static: files=${st.htmlFilesScanned} placeholders=${st.placeholders.length} buyDamgi=${st.buyDamgi.length} booksLink=${JSON.stringify(st.booksLink)} close=${JSON.stringify(st.closeBtn)} buyId=${st.buyIdCount} template92key=${st.template92}\n`);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const links = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const r = await probeBooksLink(browser, w, h);
    links.push(r);
    process.stdout.write(`books ${w}: text="${r.info.linkText}" href=${r.info.linkHref} key=${r.info.linkCopyKey} box=${r.info.linkBox.w}x${r.info.linkBox.h} close="${r.info.closeText}" buyCount=${r.info.buyCount} ` +
      `before.scrollY=${r.before.scrollY} before.buyTop=${r.before.buyTop} after.scrollY=${r.after.scrollY} after.buyTop=${r.after.buyTop} smt=${r.info.buyScrollMarginTop} hash=${r.after.hash} headerBottom=${r.after.headerBottom} settle=${r.settleMs}ms\n`);
  }
  const lazy = await lazyShots(browser);
  await browser.close();
  const out = { at: new Date().toISOString(), static: st, links, lazy };
  fs.writeFileSync(path.join(HERE, "books.json"), JSON.stringify(out, null, 2));
  process.stdout.write("wrote " + path.join(HERE, "books.json") + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
