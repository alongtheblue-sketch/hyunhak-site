// 2026-09-23 critic 4회차 프로브 tiles: 홈 대학 목록(.tiles > .tile) 열 수와 괘선 리셋 실측 (c342aff critic 3차 P1 수리 검증)
// 로컬 8092 정적 서버 + 8799 모킹 API 전제. 리포 추적 파일은 건드리지 않는다. 3회차 r3/probe_tiles.mjs 의 measure 를 이어 쓴다.
// 사용: node /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4/probe_tiles.mjs
// 산출: r4/tiles.json (원자료), r4/shots/tiles_*.png
// 기대: CSS 폭 <=600(37.5em) 1열, 600 초과 ~ 1100 2열, 1100 초과(소수 포함) 3열. 첫 행만 border-top 0, 열 끝만 padding-right 0,
//       같은 행 윗선 동일, 화살표와 다음 열 글자 간격 > 0, 가로 넘침 0. 1열에서 1번 윗선 0, 2번부터 >0.
// 음성 경로: 수리 전 base.css(c342aff~1) 를 route 로 바꿔 끼워 같은 판정기가 옛 결함(421~600 2열에 1열 리셋, 1100 소수 폭 틈)을 FAIL 로 잡는지 본다.
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");

const DIR = "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4";
const SHOTS = path.join(DIR, "shots");
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const STOP = path.join(DIR, ".wf_stop");
fs.mkdirSync(SHOTS, { recursive: true });
const URL = "http://localhost:8092/index.html";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const WIDTHS = [320, 360, 375, 390, 412, 420, 421, 428, 430, 480, 540, 599, 600, 601, 640, 768, 820, 900, 1024, 1100, 1101, 1280, 1440, 1920];
const SHOT_AT = { 430: "tiles_430.png", 600: "tiles_600.png", 601: "tiles_601.png", 1024: "tiles_1024.png", 1440: "tiles_1440.png", 390: "tiles_390.png" };
const FRAC = [[1100, 1.125, "tiles_1100frac.png"], [1100, 1.333, null], [600, 1.333, null], [601, 1.25, null], [1101, 1.5, null]];
const ZOOM = [[720, 2, 200], [576, 2.5, 250], [480, 3, 300]];
const FILTER_W = [1440, 1024, 390];
const CSS_PRE = execFileSync("git", ["show", "c342aff~1:assets/base.css"], { cwd: REPO, maxBuffer: 16 << 20 }).toString();
const stopped = () => fs.existsSync(STOP);
const expectCols = (w) => (w <= 600 ? 1 : w <= 1100 ? 2 : 3);

// 브라우저 안 측정 (r3 measure + 뷰포트, 가로 넘침, 전 타일 윗선)
function measure() {
  const T = document.getElementById("tiles");
  const cs = getComputedStyle(T);
  const cols = cs.gridTemplateColumns.split(" ").filter(Boolean);
  const tr = T.getBoundingClientRect();
  const kids = [...T.children];
  const tiles = kids.filter((k) => k.classList.contains("tile"));
  const info = tiles.map((t, i) => {
    const r = t.getBoundingClientRect();
    const s = getComputedStyle(t);
    const ar = t.querySelector(".ar") || t.lastElementChild;
    const arR = ar.getBoundingClientRect();
    const n = t.querySelector(".n");
    let textLeft = null;
    const tn = n && [...n.childNodes].find((x) => x.nodeType === 3 && x.textContent.trim());
    if (tn) { const rg = document.createRange(); rg.selectNodeContents(tn); const rr = rg.getClientRects()[0]; textLeft = rr ? rr.left : null; }
    return {
      i, name: t.getAttribute("title") || (n ? n.textContent.trim() : ""),
      left: +r.left.toFixed(3), right: +r.right.toFixed(3), top: +r.top.toFixed(3), bottom: +r.bottom.toFixed(3),
      bt: +parseFloat(s.borderTopWidth).toFixed(4), btStyle: s.borderTopStyle, btColor: s.borderTopColor, pr: parseFloat(s.paddingRight),
      arRight: +arR.right.toFixed(3), contentRight: +(r.right - parseFloat(s.paddingRight) - parseFloat(s.borderRightWidth)).toFixed(3),
      textLeft: textLeft == null ? null : +textLeft.toFixed(3), nLeft: n ? +n.getBoundingClientRect().left.toFixed(3) : null,
      nOverflow: n ? n.scrollWidth > n.clientWidth : false, nSW: n ? n.scrollWidth : null, nCW: n ? n.clientWidth : null,
    };
  });
  const tops = [...new Set(info.map((x) => Math.round(x.top)))].sort((a, b) => a - b);
  const lefts = [...new Set(info.map((x) => Math.round(x.left)))].sort((a, b) => a - b);
  info.forEach((x) => { x.row = tops.indexOf(Math.round(x.top)); x.col = lefts.indexOf(Math.round(x.left)); });
  const ncols = cols.length;
  const rows = tops.map((_, ri) => info.filter((x) => x.row === ri).sort((a, b) => a.left - b.left));
  const innerL = tr.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), innerR = tr.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
  const rowReport = rows.map((row, ri) => {
    const bts = row.map((x) => x.bt);
    const same = bts.every((b) => b === bts[0]) && row.every((x) => x.btStyle === row[0].btStyle && x.btColor === row[0].btColor);
    let maxSeam = 0;
    for (let k = 1; k < row.length; k++) maxSeam = Math.max(maxSeam, Math.abs(row[k].left - row[k - 1].right));
    return { row: ri, count: row.length, bts, same, maxSeam: +maxSeam.toFixed(3), gapLeft: +(row[0].left - innerL).toFixed(3), gapRight: +(innerR - row[row.length - 1].right).toFixed(3) };
  });
  const gaps = [];
  rows.forEach((row) => { for (let k = 0; k + 1 < row.length; k++) gaps.push({ from: row[k].name, to: row[k + 1].name, gap: row[k + 1].textLeft == null ? null : +(row[k + 1].textLeft - row[k].arRight).toFixed(3), gapN: +(row[k + 1].nLeft - row[k].arRight).toFixed(3) }); });
  const arOutside = info.filter((x) => x.arRight > x.contentRight + 0.5).map((x) => ({ name: x.name, arRight: x.arRight, contentRight: x.contentRight }));
  const firstRowBt0 = rows.length ? rows[0].every((x) => x.bt === 0) : null;
  const otherRowsBtPos = rows.slice(1).every((row) => row.every((x) => x.bt > 0));
  const prRule = info.every((x) => (x.col === ncols - 1 ? x.pr === 0 : x.pr > 0));
  const prViol = info.filter((x) => (x.col === ncols - 1 ? x.pr !== 0 : !(x.pr > 0))).map((x) => ({ name: x.name, col: x.col, pr: x.pr }));
  const mq = (q) => matchMedia(q).matches;
  const empty = T.querySelector(".empty");
  const de = document.documentElement;
  // 가로 넘침: 문서 scrollWidth 와 뷰포트 오른쪽을 넘는 요소 수
  const vvW = visualViewport ? visualViewport.width : innerWidth;
  let overRight = 0; const overNames = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > de.clientWidth + 1) { const st = getComputedStyle(el); if (st.position === "fixed" && st.visibility === "hidden") continue; overRight++; if (overNames.length < 5) overNames.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${r.right.toFixed(1)}`); }
  }
  return {
    vw: innerWidth, vv: +vvW.toFixed(3), dpr: devicePixelRatio, clientW: de.clientWidth, scrollW: de.scrollWidth, bodyScrollW: document.body.scrollWidth,
    hOverflow: de.scrollWidth > de.clientWidth, overRight, overNames,
    mq: { notMax1100: mq("not all and (max-width:1100px)"), max1100: mq("(max-width:1100px)"), max375em: mq("(max-width:37.5em)") },
    gtc: cs.gridTemplateColumns, ncols, containerBt: parseFloat(cs.borderTopWidth), containerBtStyle: cs.borderTopStyle, containerBb: parseFloat(cs.borderBottomWidth),
    tilesRect: { left: +tr.left.toFixed(3), right: +tr.right.toFixed(3), width: +tr.width.toFixed(3), innerW: +(innerR - innerL).toFixed(3) },
    nTiles: tiles.length, nKids: kids.length,
    bt8: info.slice(0, 8).map((x) => x.bt), pr8: info.slice(0, 8).map((x) => x.pr), btAll: info.map((x) => x.bt),
    rows: rowReport, firstRowBt0, otherRowsBtPos, rowsConsistent: rowReport.every((r) => r.same && r.maxSeam <= 0.5),
    prRule, prViol, gaps, minGap: gaps.length ? Math.min(...gaps.map((g) => g.gap)) : null, arOutside,
    overflowCount: info.filter((x) => x.nOverflow).length, overflowNames: info.filter((x) => x.nOverflow).map((x) => `${x.name} ${x.nSW}/${x.nCW}`),
    empty: empty ? { width: +empty.getBoundingClientRect().width.toFixed(3), gridColumn: getComputedStyle(empty).gridColumn, text: empty.textContent.trim().slice(0, 40) } : null,
    names: info.map((x) => x.name),
    tiles: info,
  };
}

// 판정: 한 상태(m)에 대해 기대 열 수(exp)로 항목별 합격
function judge(m, exp) {
  const colsOK = m.ncols === exp;
  const t1 = m.btAll.length ? m.btAll[0] === 0 : null;
  const col1Rule = exp === 1 ? (m.btAll[0] === 0 && m.btAll.slice(1).every((b) => b > 0)) : null;
  const gapOK = m.minGap == null ? exp === 1 || m.nTiles <= 1 : m.minGap > 0;
  const noHOverflow = !m.hOverflow && m.overRight === 0;
  const ok = colsOK && m.firstRowBt0 !== false && m.otherRowsBtPos && m.rowsConsistent && m.prRule && gapOK && noHOverflow && m.arOutside.length === 0 && (col1Rule !== false);
  return { exp, colsOK, firstRowBt0: m.firstRowBt0, otherRowsBtPos: m.otherRowsBtPos, rowsConsistent: m.rowsConsistent, prRule: m.prRule, gapOK, noHOverflow, col1Rule, tile1Bt0: t1, ok };
}

async function closePopup(page) {
  const had = await page.evaluate(() => !!document.querySelector(".pdim"));
  if (had) {
    await page.evaluate(() => { const el = document.activeElement || document.body; el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })); });
    await page.waitForTimeout(400);
  }
  const still = await page.evaluate(() => !!document.querySelector(".pdim"));
  if (still) await page.evaluate(() => { document.querySelectorAll(".pdim").forEach((e) => e.remove()); document.querySelectorAll("[inert]").forEach((e) => e.removeAttribute("inert")); document.documentElement.classList.remove("ppop-open"); });
  return { had, closedByEsc: had && !still, removed: still };
}

// 촬영용 unstick (r3 probe_books.mjs 관례): sticky -> static, fixed -> visibility hidden. 측정 뒤에만 건다
async function unstick(page) {
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

async function shoot(page, file) {
  const unstuck = await unstick(page);
  await page.evaluate(() => document.getElementById("find").scrollIntoView({ behavior: "instant", block: "start" }));
  await page.waitForTimeout(400);
  const p = path.join(SHOTS, file);
  await page.locator("#find").screenshot({ path: p });
  return { path: p, unstuck };
}

async function prep(page) {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: RV });
  const pop = await closePopup(page);
  await page.waitForTimeout(200);
  return pop;
}

async function openHome(browser, { w, h = 900, dsf = 1, css = null }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, locale: "ko-KR" });
  if (css) await ctx.route("**/assets/base.css", (route) => route.fulfill({ status: 200, contentType: "text/css; charset=utf-8", body: css }));
  const page = await ctx.newPage();
  const pop = await prep(page);
  return { ctx, page, pop };
}

async function filterState(page, kw) {
  await page.fill("#q2", kw);
  await page.waitForTimeout(700);
  return page.evaluate(measure);
}

const line = (tag, m, j) => `${tag}: vv=${m.vv} dpr=${m.dpr} cols=${m.ncols}/${j.exp} bt8=${m.bt8.join(",")} pr8=${m.pr8.join(",")} firstRow0=${m.firstRowBt0} others>0=${m.otherRowsBtPos} rowsOK=${m.rowsConsistent} prRule=${m.prRule} minGap=${m.minGap} ellip=${m.overflowCount} scrollW=${m.scrollW}/${m.clientW} overR=${m.overRight} => ${j.ok ? "OK" : "FAIL"}\n`;

const out = {
  at: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO }).toString().trim(),
  servedCssSha16: null, headCssSha16: null,
  widths: {}, frac: {}, zoom: {}, filter: {}, negative: {}, shots: [], stopped: false,
};
{
  const crypto = await import("node:crypto");
  const served = await (await fetch("http://localhost:8092/assets/base.css")).text();
  out.servedCssSha16 = crypto.createHash("sha256").update(served).digest("hex").slice(0, 16);
  out.headCssSha16 = crypto.createHash("sha256").update(execFileSync("git", ["show", "HEAD:assets/base.css"], { cwd: REPO, maxBuffer: 16 << 20 })).digest("hex").slice(0, 16);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });

// 1. 정수 폭 전수
for (const w of WIDTHS) {
  if (stopped()) { out.stopped = true; break; }
  const { ctx, page, pop } = await openHome(browser, { w });
  const m = await page.evaluate(measure);
  const j = judge(m, expectCols(m.vv));
  out.widths[w] = { ...m, popup: pop, judge: j };
  process.stdout.write(line(`w${w}`, m, j));
  if (SHOT_AT[w]) out.shots.push((await shoot(page, SHOT_AT[w])));
  await ctx.close();
}

// 2. 소수 폭: --force-device-scale-factor 창 방식 (iframe 은 Chrome 이 정수로 반올림해 무효, r3 확인)
for (const [win, dsf, shot] of FRAC) {
  if (stopped()) { out.stopped = true; break; }
  const b2 = await chromium.launch({ channel: "chrome", headless: true, args: [`--force-device-scale-factor=${dsf}`, `--window-size=${win},900`] });
  const ctx = await b2.newContext({ viewport: null, locale: "ko-KR" });
  const page = await ctx.newPage();
  const pop = await prep(page);
  const m = await page.evaluate(measure);
  const j = judge(m, expectCols(m.vv));
  out.frac[`${win}@${dsf}`] = { ...m, popup: pop, win, dsfArg: dsf, judge: j };
  process.stdout.write(line(`frac ${win}@${dsf}`, m, j) + `   mq=${JSON.stringify(m.mq)}\n`);
  if (shot) out.shots.push(await shoot(page, shot));
  await b2.close();
}

// 3. 1440 확대 200/250/300% = CSS 720/576/480, 배율 2/2.5/3
for (const [w, dsf, pct] of ZOOM) {
  if (stopped()) { out.stopped = true; break; }
  const { ctx, page, pop } = await openHome(browser, { w, h: Math.round(900 / (dsf)), dsf });
  const m = await page.evaluate(measure);
  const j = judge(m, expectCols(m.vv));
  out.zoom[`${pct}`] = { ...m, popup: pop, cssW: w, dsf, judge: j };
  process.stdout.write(line(`zoom ${pct}% (${w}@${dsf})`, m, j));
  await ctx.close();
}

// 4. 검색 필터: "서" 부분 결과, "없는대학" 0건
for (const w of FILTER_W) {
  if (stopped()) { out.stopped = true; break; }
  const { ctx, page } = await openHome(browser, { w });
  const part = await filterState(page, "서");
  const jp = judge(part, expectCols(part.vv));
  out.filter[`${w}_part`] = { ...part, judge: jp };
  process.stdout.write(line(`filter "서" w${w} n=${part.nTiles} [${part.names.join("/")}]`, part, jp));
  if (w === 1024) out.shots.push(await shoot(page, "tiles_filter_1024.png"));
  // 0건: 촬영 unstick 이 걸려 있으면 새 컨텍스트로 다시 연다
  let page2 = page, ctx2 = null;
  if (w === 1024) { const o = await openHome(browser, { w }); page2 = o.page; ctx2 = o.ctx; }
  const em = await filterState(page2, "없는대학");
  const emOK = em.nTiles === 0 && !!em.empty && Math.abs(em.empty.width - em.tilesRect.innerW) <= 0.5 && em.empty.gridColumn.replace(/\s/g, "") === "1/-1" && !em.hOverflow;
  out.filter[`${w}_empty`] = { vv: em.vv, nTiles: em.nTiles, nKids: em.nKids, empty: em.empty, tilesRect: em.tilesRect, gtc: em.gtc, ncols: em.ncols, containerBt: em.containerBt, containerBb: em.containerBb, scrollW: em.scrollW, clientW: em.clientW, hOverflow: em.hOverflow, ok: emOK };
  process.stdout.write(`filter "없는대학" w${w}: n=${em.nTiles} empty=${JSON.stringify(em.empty)} tilesInnerW=${em.tilesRect.innerW} cols=${em.ncols} scrollW=${em.scrollW}/${em.clientW} => ${emOK ? "OK" : "FAIL"}\n`);
  if (w === 1440) out.shots.push(await shoot(page2, "tiles_empty_1440.png"));
  if (ctx2) await ctx2.close();
  await ctx.close();
}

// 음성 경로: 수리 전 base.css(c342aff~1) 로 같은 판정기. 옛 결함을 FAIL 로 잡아야 판정기가 유효
for (const w of [480, 540, 600]) {
  if (stopped()) { out.stopped = true; break; }
  const { ctx, page } = await openHome(browser, { w, css: CSS_PRE });
  const m = await page.evaluate(measure);
  const j = judge(m, expectCols(m.vv));
  out.negative[`pre_w${w}`] = { vv: m.vv, gtc: m.gtc, ncols: m.ncols, bt8: m.bt8, pr8: m.pr8, minGap: m.minGap, judge: j };
  process.stdout.write(line(`NEG pre w${w}`, m, j));
  await ctx.close();
}
if (!stopped()) {
  const b2 = await chromium.launch({ channel: "chrome", headless: true, args: ["--force-device-scale-factor=1.125", "--window-size=1100,900"] });
  const ctx = await b2.newContext({ viewport: null, locale: "ko-KR" });
  await ctx.route("**/assets/base.css", (route) => route.fulfill({ status: 200, contentType: "text/css; charset=utf-8", body: CSS_PRE }));
  const page = await ctx.newPage();
  await prep(page);
  const m = await page.evaluate(measure);
  const j = judge(m, expectCols(m.vv));
  out.negative["pre_1100@1.125"] = { vv: m.vv, gtc: m.gtc, ncols: m.ncols, bt8: m.bt8, pr8: m.pr8, minGap: m.minGap, mq: m.mq, judge: j };
  process.stdout.write(line(`NEG pre 1100@1.125`, m, j));
  await b2.close();
}

await browser.close();
out.shots = out.shots.map((s) => (typeof s === "string" ? s : s.path));
fs.writeFileSync(path.join(DIR, "tiles.json"), JSON.stringify(out, null, 1));
process.stdout.write("wrote " + path.join(DIR, "tiles.json") + (out.stopped ? " (stopped)" : "") + "\n");
