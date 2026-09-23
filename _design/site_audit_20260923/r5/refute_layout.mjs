// 2026-09-23 critic 5회차 반증(렌즈 = 레이아웃 회귀). 이번 배포(라이브 44aea38 → 507edf1) 가 바꾸는 서빙 파일 79개를
// 같은 브라우저, 같은 조건에서 pre(= route 로 git show 44aea38:<path> 서빙) 와 post(= localhost:8092 디스크, HEAD 507edf1) 로 열어
// 면마다 가로 넘침, 뷰포트 밖 요소, 글자 겹침, 조작 요소 겹침, 잘림(overflow hidden, 말줄임), 큰 빈 구간, 콘솔 오류, 4xx/5xx 자원, 깨진 이미지를 잰다.
// 리포 추적 파일은 건드리지 않는다. 팝업은 sessionStorage hh_popup_shown=1 로 막고 본문만 잰다(팝업은 popup 모드에서 따로).
// 사용:
//   node refute_layout.mjs scan [폭,폭] [면,면|all]      → refute_scan.json (pre/post 원자료 + diff)
//   node refute_layout.mjs popup                          → refute_popup.json (입구 6면 팝업 무대, 1440/390, post)
//   node refute_layout.mjs shot 면 폭 [pre|post] [selector] → shots/refute_<면>_<폭>_<판>.png
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const PRE = "44aea38";
const POST = "507edf1";
const BASE = "http://localhost:8092/";
const MODE = process.argv[2] || "scan";
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { maxBuffer: 1 << 28 });
const CHANGED = git("diff", "--name-only", PRE, POST).toString().split("\n").filter(p => p && !/^(_design|_tools|_docs)\//.test(p));
const CHANGED_SET = new Set(CHANGED);
const preBody = Object.fromEntries(CHANGED.map(p => [p, git("show", `${PRE}:${p}`)]));
const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", html: "text/html; charset=utf-8", xml: "application/xml; charset=utf-8" };
const drift = CHANGED.filter(p => !fs.readFileSync(path.join(REPO, p)).equals(git("show", `${POST}:${p}`)));
const ALL_PAGES = git("ls-files", "-z", "*.html").toString().split("\0").filter(p => p && !/^(_design|_tools|_docs)\//.test(p)).map(p => p.replace(/\.html$/, ""));
const FREEZE = ".rv{opacity:1!important;transform:none!important;transition:none!important} *,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}";
process.stdout.write(`mode=${MODE} route files=${CHANGED.length} disk!=${POST}: ${drift.length} pages=${ALL_PAGES.length}\n`);

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });

async function openCtx(variant, w, h, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", ...extra });
  if (variant === "pre") {
    await ctx.route(u => u.host === "localhost:8092" && CHANGED_SET.has(decodeURIComponent(u.pathname.slice(1))), async (route) => {
      const p = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
      await route.fulfill({ status: 200, headers: { "content-type": TYPES[p.split(".").pop()] || "application/octet-stream", "cache-control": "no-store" }, body: preBody[p] });
    });
  }
  return ctx;
}

function hookLogs(page) {
  const log = { console: [], pageerror: [], bad: [], failed: [] };
  page.on("console", m => { if (m.type() === "error" || m.type() === "warning") log.console.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  page.on("pageerror", e => log.pageerror.push(String(e.message || e).slice(0, 300)));
  page.on("response", r => { if (r.status() >= 400) log.bad.push(`${r.status()} ${r.url()}`); });
  page.on("requestfailed", r => { if (!/google-analytics|googletagmanager/.test(r.url())) log.failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 200)}`); });
  return log;
}

async function load(page, url, h) {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.addStyleTag({ content: FREEZE });
  // 끝까지 스크롤해 지연 로드와 IntersectionObserver 를 깨운 뒤 맨 위로
  await page.evaluate(async (vh) => {
    document.documentElement.style.scrollBehavior = "auto";
    for (const im of document.querySelectorAll("img[loading=lazy]")) im.loading = "eager";
    for (let y = 0; y < document.documentElement.scrollHeight; y += vh) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
    window.scrollTo(0, 0);
    const imgs = [...document.images];
    await Promise.race([Promise.all(imgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; }))), new Promise(r => setTimeout(r, 8000))]);
    await document.fonts.ready;
  }, h);
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  return resp ? resp.status() : null;
}

// 면 하나의 레이아웃 측정. 좌표는 문서 기준(px, 소수 1자리).
const scanFn = () => {
  const de = document.documentElement, vw = de.clientWidth;
  const f1 = (v) => Math.round(v * 10) / 10;
  const sel = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "");
  const pth = (el) => { const a = []; for (let e = el; e && e !== document.body && a.length < 5; e = e.parentElement) a.unshift(sel(e)); return a.join(" > "); };
  const csCache = new Map();
  const CS = (el) => { let c = csCache.get(el); if (!c) { c = getComputedStyle(el); csCache.set(el, c); } return c; };
  const hiddenUp = (el) => { for (let e = el; e && e !== de; e = e.parentElement) { const c = CS(e); if (c.display === "none" || c.visibility === "hidden" || c.opacity === "0" || e.hasAttribute("hidden")) return true; if (e.classList && (e.classList.contains("sr-only") || e.classList.contains("visually-hidden") || e.classList.contains("blind") || e.classList.contains("sr"))) return true; if (c.position === "absolute" && ((c.clip && c.clip !== "auto") || /inset\(50%|inset\(100%/.test(c.clipPath) || (parseFloat(c.width) <= 1 && parseFloat(c.height) <= 1))) return true; } return false; };
  const clipAnc = (el) => { for (let p = el.parentElement; p && p !== document.body && p !== de; p = p.parentElement) { const c = CS(p); if (c.overflowX !== "visible" || c.overflowY !== "visible" || c.contain.includes("paint")) return p; } return null; };
  const fixedUp = (el) => { for (let e = el; e && e !== de; e = e.parentElement) { const p = CS(e).position; if (p === "fixed" || p === "sticky") return e; } return null; };
  // 모든 잘라내는 조상(overflow != visible)과 교집합. 닫힌 details 안(요약 제외)은 안 보이는 것으로 본다.
  const clipAll = (el, r0) => { let l = r0.left, t = r0.top, rr = r0.right, b = r0.bottom; for (let p = el.parentElement; p && p !== document.body && p !== de; p = p.parentElement) { const c = CS(p); if (c.overflowX !== "visible" || c.overflowY !== "visible" || c.contain.includes("paint")) { const q = p.getBoundingClientRect(); l = Math.max(l, q.left); t = Math.max(t, q.top); rr = Math.min(rr, q.right); b = Math.min(b, q.bottom); } } return { l, t, r: rr, b }; };
  const inClosedDetails = (el) => { for (let e = el; e && e !== de; e = e.parentElement) { const d = e.parentElement; if (d && d.tagName === "DETAILS" && !d.open && e.tagName !== "SUMMARY") return true; } return false; };
  const out = { cw: vw, sw: de.scrollWidth, bodySW: document.body.scrollWidth, docH: de.scrollHeight, title: document.title };
  const all = [...document.body.querySelectorAll("*")].filter(el => !el.closest(".pdim,[data-hh-popup],script,style,noscript,template"));
  // 1. 뷰포트 가로 밖으로 나간 보이는 요소(조상 overflow 로 잘리지 않는 것). 가장 바깥 것만.
  const offSet = new Set();
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right <= 0) continue;   // 왼쪽 화면 밖 전체(건너뛰기 링크 -9999 등) = 의도된 숨김, 가로 스크롤 없음
    if (r.right > vw + 1 || r.left < -1) {
      if (hiddenUp(el) || clipAnc(el) || inClosedDetails(el)) continue;
      const c = CS(el);
      if (c.clip && c.clip !== "auto") continue;
      if (c.clipPath && c.clipPath !== "none" && /inset\(50%|inset\(100%/.test(c.clipPath)) continue;
      offSet.add(el);
    }
  }
  out.offenders = [...offSet].filter(el => !offSet.has(el.parentElement)).map(el => { const r = el.getBoundingClientRect(); return { p: pth(el), l: f1(r.left), r: f1(r.right), y: f1(r.top + scrollY), w: f1(r.width), txt: (el.textContent || "").trim().slice(0, 40) }; });
  // 2. 글자 겹침: 서로 다른 글자 노드의 줄 상자가 2px 넘게 겹치는 쌍(고정, sticky 하위 제외, 스크롤 상자 안은 상자 범위로 자름)
  const trs = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const rg = document.createRange();
  let tn, ti = 0;
  while ((tn = tw.nextNode())) {
    if (!tn.data.trim()) continue;
    const el = tn.parentElement;
    if (!el || el.closest(".pdim,[data-hh-popup],script,style,noscript,template,select,option,textarea")) continue;
    if (hiddenUp(el) || fixedUp(el) || inClosedDetails(el)) continue;
    rg.selectNodeContents(tn);
    for (const r0 of rg.getClientRects()) {
      const { l, t, r: rr, b } = clipAll(el, r0);
      if (rr - l < 1 || b - t < 1) continue;
      trs.push({ i: ti, el, l, t: t + scrollY, r: rr, b: b + scrollY, s: tn.data.trim().slice(0, 24) });
    }
    ti++;
  }
  trs.sort((a, b) => a.t - b.t);
  const tover = [];
  for (let i = 0; i < trs.length && tover.length < 60; i++) {
    const a = trs[i];
    for (let j = i + 1; j < trs.length && trs[j].t < a.b - 2; j++) {
      const b = trs[j];
      if (a.i === b.i) continue;
      const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (ix > 2 && iy > 2) tover.push({ a: pth(a.el), at: a.s, b: pth(b.el), bt: b.s, ix: f1(ix), iy: f1(iy), y: f1(Math.max(a.t, b.t)) });
    }
  }
  out.textOverlaps = tover;
  out.textRects = trs.length;
  // 3. 조작 요소 겹침(조상/자손, label-입력 쌍 제외)
  const inter = all.filter(el => el.matches('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[tabindex]:not([tabindex="-1"])') && !hiddenUp(el) && !fixedUp(el) && !inClosedDetails(el));
  const ib = inter.map(el => { const { l, t, r: rr, b } = clipAll(el, el.getBoundingClientRect()); return { el, l, t: t + scrollY, r: rr, b: b + scrollY }; }).filter(o => o.r - o.l >= 1 && o.b - o.t >= 1);
  ib.sort((a, b) => a.t - b.t);
  const iover = [];
  for (let i = 0; i < ib.length && iover.length < 60; i++) {
    const a = ib[i];
    for (let j = i + 1; j < ib.length && ib[j].t < a.b - 2; j++) {
      const b = ib[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const lab = (x, y) => x.tagName === "LABEL" && (x.control === y);
      if (lab(a.el, b.el) || lab(b.el, a.el)) continue;
      if (a.el.closest("label") && a.el.closest("label") === b.el.closest("label")) continue;
      const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (ix > 2 && iy > 2) iover.push({ a: pth(a.el), at: (a.el.textContent || a.el.value || "").trim().slice(0, 20), b: pth(b.el), bt: (b.el.textContent || b.el.value || "").trim().slice(0, 20), ix: f1(ix), iy: f1(iy), y: f1(Math.max(a.t, b.t)) });
    }
  }
  out.interOverlaps = iover;
  out.interCount = ib.length;
  // 4. 잘림: overflow hidden/clip 인 보이는 상자에서 내용이 넘침(말줄임 따로)
  const clip = [], ell = [];
  for (const el of all) {
    const c = CS(el);
    if (c.overflowX === "visible" && c.overflowY === "visible") continue;
    if (el.clientWidth < 8 || el.clientHeight < 8) continue;
    if (hiddenUp(el)) continue;
    const scrollable = /auto|scroll/.test(c.overflowX + c.overflowY);
    const txt = (el.textContent || "").trim();
    if (c.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) { ell.push({ p: pth(el), txt: txt.slice(0, 40), sw: el.scrollWidth, cw: el.clientWidth }); continue; }
    if (scrollable) continue;
    if (!txt) continue;
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) clip.push({ p: pth(el), txt: txt.slice(0, 40), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight });
  }
  out.clipped = clip.slice(0, 40);
  out.ellipsis = ell.slice(0, 60);
  // 5. 깨진 이미지
  out.brokenImg = [...document.images].filter(im => !hiddenUp(im) && im.getBoundingClientRect().width > 0 && im.complete && im.naturalWidth === 0).map(im => im.getAttribute("src"));
  // 6. 세로 빈 구간: 글자, 이미지, 도형, 입력 상자가 하나도 없는 문서 y 구간 중 큰 것(본문 영역만, 푸터 아래 제외)
  const ys = trs.map(t => [t.t, t.b]);
  for (const el of all) {
    if (!el.matches("img,svg,video,canvas,iframe,picture,input,select,textarea,button,hr")) continue;
    if (hiddenUp(el) || inClosedDetails(el)) continue;
    const r = clipAll(el, el.getBoundingClientRect()); if (r.r - r.l < 2 || r.b - r.t < 2) continue;
    ys.push([r.t + scrollY, r.b + scrollY]);
  }
  // 배경색이나 테두리가 있는 상자도 내용으로 본다(빈 색면은 결함이 아닐 수 있음 → 따로 셈)
  ys.sort((a, b) => a[0] - b[0]);
  const gaps = []; let cur = 0;
  for (let [t, b] of ys) { t = Math.min(t, de.scrollHeight); b = Math.min(b, de.scrollHeight); if (t - cur > 0) gaps.push([f1(cur), f1(t), f1(t - cur)]); cur = Math.max(cur, b); }
  if (de.scrollHeight - cur > 0) gaps.push([f1(cur), f1(de.scrollHeight), f1(de.scrollHeight - cur)]);
  out.gaps = gaps.filter(g => g[2] >= 240).map(g => { const mid = (g[0] + g[1]) / 2 - scrollY; const e = document.elementFromPoint(Math.floor(vw / 2), Math.max(0, Math.min(innerHeight - 1, mid))); return [...g, e ? pth(e) : null]; });
  return out;
};

// 스크롤하며 창마다: (1) 고정/sticky 요소끼리 겹침 (2) 글자 줄 상자 가운데를 다른 요소가 덮는지(elementFromPoint), (3) 이미지 위에 겹친 글자
const obscureFn = async () => {
  const de = document.documentElement, vh = innerHeight, vw = de.clientWidth;
  const f1 = (v) => Math.round(v * 10) / 10;
  const sel = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "");
  const pth = (el) => { const a = []; for (let e = el; e && e !== document.body && a.length < 4; e = e.parentElement) a.unshift(sel(e)); return a.join(" > "); };
  const hid = (el) => { for (let e = el; e && e !== de; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === "none" || c.visibility === "hidden" || c.opacity === "0" || e.hasAttribute("hidden")) return true; if (e.classList && (e.classList.contains("sr") || e.classList.contains("sr-only"))) return true; if (c.position === "absolute" && ((c.clip && c.clip !== "auto") || /inset\(50%|inset\(100%/.test(c.clipPath))) return true; const d = e.parentElement; if (d && d.tagName === "DETAILS" && !d.open && e.tagName !== "SUMMARY") return true; } return false; };
  const fixedEls = [...document.body.querySelectorAll("*")].filter(el => { const p = getComputedStyle(el).position; return (p === "fixed" || p === "sticky") && !el.closest(".pdim"); });
  const texts = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let tn;
  while ((tn = tw.nextNode())) { if (!tn.data.trim()) continue; const el = tn.parentElement; if (!el || el.closest(".pdim,[data-hh-popup],script,style,noscript,template,select,option,textarea") || hid(el)) continue; if (fixedEls.some(f => f.contains(el))) continue; texts.push({ tn, el }); }
  const out = { fixedOverlap: [], obscured: [], steps: 0 };
  const seenF = new Set(), seenO = new Set();
  const rg = document.createRange();
  const H = de.scrollHeight;
  for (let y = 0; y < H; y += Math.floor(vh * 0.8)) {
    scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); out.steps++;
    const fr = fixedEls.filter(el => !hid(el)).map(el => ({ el, r: el.getBoundingClientRect() })).filter(o => o.r.width > 0 && o.r.height > 0 && o.r.bottom > 0 && o.r.top < vh);
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) {
      const a = fr[i], b = fr[j]; if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ix > 2 && iy > 2) { const k = pth(a.el) + "|" + pth(b.el); if (!seenF.has(k)) { seenF.add(k); out.fixedOverlap.push({ a: pth(a.el), b: pth(b.el), ix: f1(ix), iy: f1(iy), scrollY: scrollY }); } }
    }
    for (const { tn, el } of texts) {
      rg.selectNodeContents(tn);
      for (const r of rg.getClientRects()) {
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cy < 0 || cy >= vh || cx < 0 || cx >= vw || r.width < 2) continue;
        if (fr.some(o => cx >= o.r.left - 2 && cx <= o.r.right + 2 && cy >= o.r.top - 2 && cy <= o.r.bottom + 2)) continue;   // 고정 상자 가장자리 1px 반올림 오차 제외
        const hit = document.elementFromPoint(cx, cy);
        if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue;
        // 같은 label/a/button 안 형제(예 글자 위 아이콘)는 같은 조작 단위로 본다
        const unit = el.closest("a,button,label,summary"); if (unit && unit.contains(hit)) continue;
        const k = pth(el) + "|" + tn.data.trim().slice(0, 20) + "|" + pth(hit);
        if (seenO.has(k)) continue; seenO.add(k);
        const hc = getComputedStyle(hit);
        out.obscured.push({ text: tn.data.trim().slice(0, 30), el: pth(el), hit: pth(hit), hitBg: hc.backgroundColor, docY: f1(cy + scrollY), x: f1(cx), cy: f1(cy), fr: fr.map(o => sel(o.el) + "@" + f1(o.r.top) + "-" + f1(o.r.bottom)).join(",") });
        if (out.obscured.length > 80) break;
      }
    }
  }
  scrollTo(0, 0);
  return out;
};

async function obscureOne(variant, p, w, h) {
  const ctx = await openCtx(variant, w, h);
  await ctx.addInitScript(() => { try { sessionStorage.setItem("hh_popup_shown", "1"); } catch (e) {} });
  const page = await ctx.newPage();
  let res;
  try { await load(page, BASE + p + ".html", h); res = await page.evaluate(obscureFn); }
  catch (e) { res = { error: e.message.split("\n")[0] }; }
  await ctx.close();
  return res;
}

async function scanOne(variant, p, w, h) {
  const ctx = await openCtx(variant, w, h);
  await ctx.addInitScript(() => { try { sessionStorage.setItem("hh_popup_shown", "1"); } catch (e) {} });
  const page = await ctx.newPage();
  const log = hookLogs(page);
  let res;
  try {
    const status = await load(page, BASE + p + ".html", h);
    // 긴 면에서는 elementFromPoint 가 창 안만 보므로 gaps 의 원인 요소는 참고용
    res = await page.evaluate(scanFn);
    res.status = status;
  } catch (e) {
    res = { error: e.message.split("\n")[0] };
  }
  res.log = log;
  await ctx.close();
  return res;
}

async function pool(items, n, fn) {
  const out = []; let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const i = k++; out[i] = await fn(items[i], i); } }));
  return out;
}

const key = {
  offenders: o => o.p,
  textOverlaps: o => `${o.a}|${o.at}|${o.b}|${o.bt}`,
  interOverlaps: o => `${o.a}|${o.at}|${o.b}|${o.bt}`,
  clipped: o => `${o.p}|${o.txt}`,
  ellipsis: o => `${o.p}|${o.txt}`,
};

if (MODE === "scan") {
  const widths = (process.argv[3] || "1440,390").split(",").map(Number);
  const only = process.argv[4] && process.argv[4] !== "all" ? process.argv[4].split(",") : ALL_PAGES;
  const H = { 1440: 900, 390: 844, 320: 640, 360: 740, 1024: 768, 768: 1024 };
  const jobs = [];
  for (const p of only) for (const w of widths) for (const v of ["pre", "post"]) jobs.push({ p, w, v });
  const t0 = Date.now();
  const results = await pool(jobs, 6, async (j, i) => {
    const r = await scanOne(j.v, j.p, j.w, H[j.w] || 900);
    if (i % 20 === 0) process.stdout.write(`${i}/${jobs.length} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
    return { ...j, r };
  });
  const raw = {};
  for (const { p, w, v, r } of results) ((raw[`${p}@${w}`] ||= {})[v] = r);
  const diff = {}, absolute = {};
  const norm = s => s.replace(/:\d+:\d+/g, "").replace(/\?[^ ]*/g, "");
  for (const [k, { pre, post }] of Object.entries(raw)) {
    const d = {};
    if (post.error || pre.error) d.error = { pre: pre.error || null, post: post.error || null };
    if (post.sw > post.cw) d.docOverflow = { pre: pre.sw - pre.cw, post: post.sw - post.cw };
    for (const f of Object.keys(key)) {
      const ps = new Set((pre[f] || []).map(key[f]));
      const add = (post[f] || []).filter(o => !ps.has(key[f](o)));
      if (add.length) d[f] = add;
    }
    for (const f of ["console", "pageerror", "bad", "failed"]) {
      const ps = new Set((pre.log?.[f] || []).map(norm));
      const add = (post.log?.[f] || []).filter(s => !ps.has(norm(s)));
      if (add.length) d[f] = add;
      if ((post.log?.[f] || []).length) (absolute[k] ||= {})[f] = post.log[f];
    }
    const pg = new Set((pre.gaps || []).map(g => Math.round(g[2] / 20)));
    const ng = (post.gaps || []).filter(g => !pg.has(Math.round(g[2] / 20)));
    if (ng.length) d.gapsNew = { post: ng, pre: pre.gaps };
    if (post.brokenImg?.length) d.brokenImg = post.brokenImg;
    if (post.status !== 200) d.status = post.status;
    if (Object.keys(d).length) diff[k] = d;
    if (post.sw > post.cw || (post.offenders || []).length || (post.textOverlaps || []).length || (post.interOverlaps || []).length) (absolute[k] ||= {}).layout = { sw: post.sw, cw: post.cw, offenders: post.offenders, textOverlaps: post.textOverlaps, interOverlaps: post.interOverlaps };
  }
  const fn = path.join(HERE, `refute_scan${widths.join("_") === "1440_390" ? "" : "_" + widths.join("_")}.json`);
  fs.writeFileSync(fn, JSON.stringify({ pre: PRE, post: POST, routeFiles: CHANGED.length, drift, pages: only.length, widths, jobs: jobs.length, diff, absolute, raw }, null, 1));
  const cnt = {};
  for (const d of Object.values(diff)) for (const f of Object.keys(d)) cnt[f] = (cnt[f] || 0) + 1;
  process.stdout.write(`done ${((Date.now() - t0) / 1000).toFixed(0)}s → ${fn}\nfaces with diffs: ${Object.keys(diff).length} ${JSON.stringify(cnt)}\n`);
}

if (MODE === "popup") {
  const pages = ["index", "about", "guidebook/index", "interview", "lectures", "studio"];
  const out = {};
  for (const p of pages) for (const [w, h, opt] of [[1440, 900, {}], [390, 844, { hasTouch: true, isMobile: true }], [320, 568, { hasTouch: true, isMobile: true }], [1440, 640, {}]]) {
    const ctx = await openCtx("post", w, h, opt);
    const page = await ctx.newPage();
    const log = hookLogs(page);
    await page.goto(BASE + p + ".html", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10, Math.round(r.right * 10) / 10, Math.round(r.bottom * 10) / 10]; };
      const dim = document.querySelector(".pdim");
      if (!dim) return { open: false };
      const on = document.querySelector(".pslot[data-on] .pop"), bar = document.querySelector(".pbar");
      const kids = bar ? [...bar.children].map(k => ({ c: k.className, r: R(k) })) : [];
      const ctrls = bar ? [...bar.querySelectorAll("button,label,input")].map(k => ({ t: (k.textContent || "").trim().slice(0, 12), r: R(k) })) : [];
      const overl = [];
      for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) { const a = ctrls[i].r, b = ctrls[j].r; const ix = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), iy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); if (ix > 1 && iy > 1 && !(ctrls[i].t.includes(ctrls[j].t) || ctrls[j].t.includes(ctrls[i].t))) overl.push([ctrls[i].t, ctrls[j].t, ix, iy]); }
      return { open: true, n: document.querySelectorAll(".pslot").length, iw: innerWidth, ih: innerHeight, on: R(on), onScroll: on && [on.scrollHeight, on.clientHeight], bar: R(bar), barSW: bar && [bar.scrollWidth, bar.clientWidth], kids, overl,
        sideVisible: [...document.querySelectorAll(".pslot[data-side]")].map(s => ({ r: R(s), op: getComputedStyle(s).opacity })), docSW: document.documentElement.scrollWidth, kind: [...document.querySelectorAll(".pslot .prib .k")].map(k => k.textContent.trim()) };
    });
    m.log = log;
    const tag = `${p.replace(/\//g, "_")}_${w}x${h}`;
    await page.screenshot({ path: path.join(HERE, "shots", `refute_popup_${tag}.png`) });
    out[tag] = m;
    process.stdout.write(`${tag} ${JSON.stringify({ open: m.open, n: m.n, on: m.on, bar: m.bar, ih: m.ih, barSW: m.barSW, overl: m.overl, err: log.pageerror.length + log.console.length })}\n`);
    await ctx.close();
  }
  fs.writeFileSync(path.join(HERE, "refute_popup.json"), JSON.stringify(out, null, 1));
}

if (MODE === "shot") {
  const [p, w, v = "post", selector] = process.argv.slice(3);
  const W = Number(w), H = { 1440: 900, 390: 844, 320: 640 }[W] || 900;
  const ctx = await openCtx(v, W, H);
  await ctx.addInitScript(() => { try { sessionStorage.setItem("hh_popup_shown", "1"); } catch (e) {} });
  const page = await ctx.newPage();
  await load(page, BASE + p + ".html", H);
  const fn = path.join(HERE, "shots", `refute_${p.replace(/\//g, "_")}_${W}_${v}${selector ? "_el" : ""}.png`);
  if (selector) { await page.addStyleTag({ content: "nav.fix{visibility:hidden!important} header.hd,.setnav{position:static!important}" }); await page.locator(selector).first().screenshot({ path: fn }); }
  else await page.screenshot({ path: fn, fullPage: true });
  process.stdout.write(`${fn}\n`);
  await ctx.close();
}

if (MODE === "obscure") {
  const widths = (process.argv[3] || "1440,390").split(",").map(Number);
  const only = process.argv[4] && process.argv[4] !== "all" ? process.argv[4].split(",") : ALL_PAGES;
  const H = { 1440: 900, 390: 844, 320: 640, 360: 740, 1024: 768, 768: 1024 };
  const jobs = [];
  for (const p of only) for (const w of widths) for (const v of ["pre", "post"]) jobs.push({ p, w, v });
  const t0 = Date.now();
  const results = await pool(jobs, 6, async (j, i) => { const r = await obscureOne(j.v, j.p, j.w, H[j.w] || 900); if (i % 20 === 0) process.stdout.write(`${i}/${jobs.length} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`); return { ...j, r }; });
  const raw = {};
  for (const { p, w, v, r } of results) ((raw[`${p}@${w}`] ||= {})[v] = r);
  const diff = {};
  for (const [k, { pre, post }] of Object.entries(raw)) {
    const d = {};
    if (pre.error || post.error) d.error = [pre.error, post.error];
    const pf = new Set((pre.fixedOverlap || []).map(o => o.a + "|" + o.b));
    const nf = (post.fixedOverlap || []).filter(o => !pf.has(o.a + "|" + o.b)); if (nf.length) d.fixedOverlap = nf;
    const po = new Set((pre.obscured || []).map(o => o.el + "|" + o.text + "|" + o.hit));
    const no = (post.obscured || []).filter(o => !po.has(o.el + "|" + o.text + "|" + o.hit)); if (no.length) d.obscured = no;
    if (Object.keys(d).length) diff[k] = d;
  }
  const fn = path.join(HERE, `refute_obscure${widths.join("_") === "1440_390" ? "" : "_" + widths.join("_")}.json`);
  fs.writeFileSync(fn, JSON.stringify({ pre: PRE, post: POST, widths, pages: only.length, diff, raw }, null, 1));
  process.stdout.write(`done ${((Date.now() - t0) / 1000).toFixed(0)}s → ${fn} faces with diffs: ${Object.keys(diff).length}\n`);
}

await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]);
process.exit(0);
