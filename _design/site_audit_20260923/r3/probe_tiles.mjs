// 2026-09-23 critic 3회차 프로브 tiles: 홈 대학 목록(.tiles > .tile) 괘선과 열 경계 실측 (87106d8 P1-2 수리 검증)
// 로컬 8092 정적 서버 + 8799 모킹 API 전제. 리포 추적 파일은 건드리지 않는다.
// 사용: node _design/site_audit_20260923/r3/probe_tiles.mjs
// 산출: r3/tiles.json (원자료), r3/shots/tiles_*.png
// 비교: c5dff51 의 base.css 를 route 로 바꿔 끼워 검색 필터 상태를 같은 조건에서 다시 잰다 (index.html 은 c5dff51 과 HEAD 가 같다).
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");

const DIR = "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r3";
const SHOTS = path.join(DIR, "shots");
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const STOP = path.join(DIR, ".wf_stop");
fs.mkdirSync(SHOTS, { recursive: true });
const URL = "http://localhost:8092/index.html";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const WIDTHS = [1440, 1280, 1101, 1100, 1024, 900, 768, 601, 600, 390, 360];
const SHOT_AT = { 1440: "tiles_1440.png", 1024: "tiles_1024.png", 768: "tiles_768.png", 600: "tiles_600.png", 480: "tiles_480.png", 390: "tiles_390.png" };
// 보조 띠 스캔: 600 에서 2열인데 1열 리셋(374행)이 걸리는 구간의 양 끝을 잡는다 (판정 폭 목록 밖, 원인 추적용)
const BAND = [599, 560, 480, 421, 420];
const CSS_C5 = execFileSync("git", ["show", "c5dff51:assets/base.css"], { cwd: REPO, maxBuffer: 16 << 20 }).toString();

// 브라우저 안에서 도는 측정 함수 (문서 하나 기준)
function measure() {
  const T = document.getElementById("tiles");
  const cs = getComputedStyle(T);
  const cols = cs.gridTemplateColumns.split(" ").filter(Boolean);
  const tr = T.getBoundingClientRect();
  const kids = [...T.children];
  const tiles = kids.filter((k) => k.classList.contains("tile"));
  const hiddenKids = kids.filter((k) => k.hidden || getComputedStyle(k).display === "none").length;
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
      i, name: t.getAttribute("title"),
      left: +r.left.toFixed(2), right: +r.right.toFixed(2), top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2),
      bt: parseFloat(s.borderTopWidth), btStyle: s.borderTopStyle, btColor: s.borderTopColor, pr: parseFloat(s.paddingRight),
      arRight: +arR.right.toFixed(2), contentRight: +(r.right - parseFloat(s.paddingRight) - parseFloat(s.borderRightWidth)).toFixed(2),
      textLeft: textLeft == null ? null : +textLeft.toFixed(2),
      nOverflow: n ? n.scrollWidth > n.clientWidth : false, nSW: n ? n.scrollWidth : null, nCW: n ? n.clientWidth : null,
    };
  });
  // 행과 열 묶기
  const tops = [...new Set(info.map((x) => Math.round(x.top)))].sort((a, b) => a - b);
  const lefts = [...new Set(info.map((x) => Math.round(x.left)))].sort((a, b) => a - b);
  info.forEach((x) => { x.row = tops.indexOf(Math.round(x.top)); x.col = lefts.indexOf(Math.round(x.left)); });
  const ncols = cols.length;
  const rows = tops.map((_, ri) => info.filter((x) => x.row === ri).sort((a, b) => a.left - b.left));
  const innerL = tr.left + parseFloat(cs.borderLeftWidth), innerR = tr.right - parseFloat(cs.borderRightWidth);
  const rowReport = rows.map((row, ri) => {
    const bts = row.map((x) => x.bt);
    const same = bts.every((b) => b === bts[0]) && row.every((x) => x.btStyle === row[0].btStyle);
    let maxSeam = 0;
    for (let k = 1; k < row.length; k++) maxSeam = Math.max(maxSeam, Math.abs(row[k].left - row[k - 1].right));
    const spanL = row[0].left - innerL, spanR = innerR - row[row.length - 1].right;
    return { row: ri, count: row.length, bts, same, maxSeam: +maxSeam.toFixed(2), gapLeft: +spanL.toFixed(2), gapRight: +spanR.toFixed(2) };
  });
  // 화살표 오른쪽 끝과 같은 행 다음 열 글자 시작 사이 간격
  const gaps = [];
  rows.forEach((row) => { for (let k = 0; k + 1 < row.length; k++) gaps.push({ from: row[k].name, to: row[k + 1].name, gap: row[k + 1].textLeft == null ? null : +(row[k + 1].textLeft - row[k].arRight).toFixed(2) }); });
  const arOutside = info.filter((x) => x.arRight > x.contentRight + 0.5).map((x) => ({ name: x.name, arRight: x.arRight, contentRight: x.contentRight }));
  const firstRowBt0 = rows.length ? rows[0].every((x) => x.bt === 0) : null;
  const otherRowsBtPos = rows.slice(1).every((row) => row.every((x) => x.bt > 0));
  const prRule = info.every((x) => (x.col === ncols - 1 ? x.pr === 0 : x.pr > 0));
  const prViol = info.filter((x) => (x.col === ncols - 1 ? x.pr !== 0 : !(x.pr > 0))).map((x) => ({ name: x.name, col: x.col, pr: x.pr }));
  const mq = (q) => matchMedia(q).matches;
  const empty = T.querySelector(".empty");
  return {
    vw: window.innerWidth, docW: +document.documentElement.getBoundingClientRect().width.toFixed(2), clientW: document.documentElement.clientWidth,
    mq: { min1101: mq("(min-width:1101px)"), max1100: mq("(max-width:1100px)"), min37501: mq("(min-width:37.501em)"), max375: mq("(max-width:37.5em)"), max420: mq("(max-width:420px)") },
    gtc: cs.gridTemplateColumns, ncols, containerBt: parseFloat(cs.borderTopWidth), containerBtStyle: cs.borderTopStyle, containerBb: parseFloat(cs.borderBottomWidth),
    tilesRect: { left: +tr.left.toFixed(2), right: +tr.right.toFixed(2), width: +tr.width.toFixed(2) },
    nTiles: tiles.length, nKids: kids.length, hiddenKids,
    bt8: info.slice(0, 8).map((x) => x.bt), pr8: info.slice(0, 8).map((x) => x.pr),
    rows: rowReport, firstRowBt0, otherRowsBtPos, rowsConsistent: rowReport.every((r) => r.same && r.maxSeam <= 0.5),
    prRule, prViol, gaps, minGap: gaps.length ? Math.min(...gaps.map((g) => g.gap)) : null, arOutside,
    overflowCount: info.filter((x) => x.nOverflow).length, overflowNames: info.filter((x) => x.nOverflow).map((x) => `${x.name} ${x.nSW}/${x.nCW}`),
    empty: empty ? { width: +empty.getBoundingClientRect().width.toFixed(2), gridColumn: getComputedStyle(empty).gridColumn } : null,
    tiles: info,
  };
}

async function closePopup(target) {
  // target = page 또는 frame. 팝업은 ESC 로 닫는다(키 이벤트를 활성 요소에 보내 app.js onKey 가 받게 한다). 남으면 제거
  const had = await target.evaluate(() => !!document.querySelector(".pdim"));
  if (had) {
    await target.evaluate(() => { const el = document.activeElement || document.body; el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })); });
    await new Promise((r) => setTimeout(r, 400));
  }
  const still = await target.evaluate(() => !!document.querySelector(".pdim"));
  if (still) await target.evaluate(() => { document.querySelectorAll(".pdim").forEach((e) => e.remove()); document.querySelectorAll("[inert]").forEach((e) => e.removeAttribute("inert")); document.documentElement.classList.remove("ppop-open"); });
  return { had, closedByEsc: had && !still, removed: still };
}

async function shoot(page, file) {
  // 목록 구역(.find: 검색 + 목록 + 전체 보기) 만. 고정 머리말이 겹치지 않게 맨 위로 올린 뒤 fullPage + clip
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const box = await page.evaluate(() => { const r = document.querySelector("#find .find").getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; });
  const pad = 8;
  const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + pad * 2, height: box.h + pad * 2 };
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: true, clip });
  return path.join(SHOTS, file);
}

async function openHome(browser, { w, h, dsf = 1, css = null }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, locale: "ko-KR" });
  if (css) await ctx.route("**/assets/base.css", (route) => route.fulfill({ status: 200, contentType: "text/css; charset=utf-8", body: css }));
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: RV });
  const pop = await closePopup(page);
  await page.waitForTimeout(200);
  return { ctx, page, pop };
}

async function filterState(page, kw) {
  await page.fill("#q2", kw);
  await page.waitForTimeout(600);
  return page.evaluate(measure);
}

const out = { at: new Date().toISOString(), head: execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO }).toString().trim(), widths: {}, band: {}, zoom: null, frac: {}, fracDsf: {}, filter: {}, filter_c5dff51: {}, shots: [] };
const browser = await chromium.launch({ channel: "chrome", headless: true });
const stopped = () => fs.existsSync(STOP);

for (const w of WIDTHS) {
  if (stopped()) { out.stopped = true; break; }
  const { ctx, page, pop } = await openHome(browser, { w, h: 900 });
  const m = await page.evaluate(measure);
  m.popup = pop;
  out.widths[w] = m;
  if (SHOT_AT[w]) out.shots.push(await shoot(page, SHOT_AT[w]));
  if (w === 1440 || w === 1024) {
    const f = await filterState(page, "서");
    out.filter[w] = f;
    out.shots.push(await shoot(page, `tiles_filter_${w}.png`));
    out.filter[`${w}_empty`] = await filterState(page, "없는대학zz");
  }
  process.stdout.write(`${w}: cols=${m.ncols} bt8=${m.bt8.join(",")} pr8=${m.pr8.join(",")} firstRow0=${m.firstRowBt0} others>0=${m.otherRowsBtPos} rowsOK=${m.rowsConsistent} prRule=${m.prRule} minGap=${m.minGap} overflow=${m.overflowCount} popup=${JSON.stringify(pop)}\n`);
  await ctx.close();
}

// 보조 띠 스캔 (421~600)
for (const w of BAND) {
  if (stopped()) { out.stopped = true; break; }
  const { ctx, page, pop } = await openHome(browser, { w, h: 900 });
  const m = await page.evaluate(measure);
  m.popup = pop;
  out.band[w] = m;
  if (SHOT_AT[w]) out.shots.push(await shoot(page, SHOT_AT[w]));
  process.stdout.write(`band ${w}: gtc=${m.gtc} bt8=${m.bt8.join(",")} pr8=${m.pr8.join(",")} firstRow0=${m.firstRowBt0} rowsOK=${m.rowsConsistent} prRule=${m.prRule} minGap=${m.minGap}\n`);
  await ctx.close();
}

// 200% 확대 = CSS 720x450, 배율 2
if (!stopped()) {
  const { ctx, page, pop } = await openHome(browser, { w: 720, h: 450, dsf: 2 });
  const m = await page.evaluate(measure);
  m.popup = pop; m.dpr = await page.evaluate(() => devicePixelRatio);
  out.zoom = m;
  out.shots.push(await shoot(page, "tiles_720z2.png"));
  process.stdout.write(`720z2: cols=${m.ncols} bt8=${m.bt8.join(",")} pr8=${m.pr8.join(",")} firstRow0=${m.firstRowBt0} others>0=${m.otherRowsBtPos} rowsOK=${m.rowsConsistent} prRule=${m.prRule} minGap=${m.minGap} overflow=${m.overflowCount}\n`);
  await ctx.close();
}

// 소수 폭 경계: iframe 안 미디어 쿼리를 소수 폭으로 평가시킨다
for (const fw of [1100.5, 600.5, 600.01]) {
  if (stopped()) { out.stopped = true; break; }
  const ctx = await browser.newContext({ viewport: { width: Math.ceil(fw) + 100, height: 1000 }, deviceScaleFactor: 1, locale: "ko-KR" });
  const page = await ctx.newPage();
  await page.setContent(`<!doctype html><html><body style="margin:0"><iframe id="f" src="${URL}" style="width:${fw}px;height:900px;border:0;display:block"></iframe></body></html>`);
  await page.waitForTimeout(500);
  let frame = null;
  for (let k = 0; k < 40 && !frame; k++) { frame = page.frames().find((f) => f.url().includes("index.html")); if (!frame) await page.waitForTimeout(250); }
  await frame.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
  await frame.addStyleTag({ content: RV });
  const pop = await closePopup(frame);
  const m = await frame.evaluate(measure);
  m.popup = pop; m.iframeCssWidth = fw;
  out.frac[fw] = m;
  process.stdout.write(`iframe ${fw}: docW=${m.docW} mq=${JSON.stringify(m.mq)} cols=${m.ncols} bt8=${m.bt8.join(",")} pr8=${m.pr8.join(",")} firstRow0=${m.firstRowBt0} others>0=${m.otherRowsBtPos} rowsOK=${m.rowsConsistent} prRule=${m.prRule} minGap=${m.minGap}\n`);
  await ctx.close();
}

// 소수 폭 실측 2: iframe 은 Chrome 이 내부 뷰포트를 정수로 반올림해(1100.5 -> 1101, 600.5 -> 601) 소수 폭이 재현되지 않는다.
// 대신 창 크기 정수(DIP) + 소수 배율로 CSS 뷰포트를 소수로 만든다 (Windows 배율 125% 등에서 실제로 생기는 조건).
// 1100 x 1.125 = 1237.5 -> 물리 1238 -> CSS 1100.444 / 1100 x 1.333 -> 1467 -> CSS 1100.525 / 600 x 1.333 -> 800 -> CSS 600.15
for (const [dsf, win, shot] of [[1.125, 1100, "tiles_1100frac.png"], [1.333, 1100, null], [1.333, 600, null]]) {
  if (stopped()) { out.stopped = true; break; }
  const b2 = await chromium.launch({ channel: "chrome", headless: true, args: [`--force-device-scale-factor=${dsf}`, `--window-size=${win},900`] });
  const ctx = await b2.newContext({ viewport: null, locale: "ko-KR" });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: RV });
  const pop = await closePopup(page);
  const m = await page.evaluate(measure);
  m.popup = pop; m.dsf = dsf; m.win = win; m.vv = await page.evaluate(() => visualViewport.width);
  out.fracDsf[`${win}@${dsf}`] = m;
  if (shot) out.shots.push(await shoot(page, shot));
  process.stdout.write(`dsf ${dsf} win ${win}: vv=${m.vv} mq=${JSON.stringify(m.mq)} gtc=${m.gtc} bt8=${m.bt8.join(",")} pr8=${m.pr8.join(",")} firstRow0=${m.firstRowBt0} rowsOK=${m.rowsConsistent} prRule=${m.prRule} minGap=${m.minGap}\n`);
  await b2.close();
}

// 비교: c5dff51 base.css 로 같은 필터 상태 (검색 필터 괘선 구조가 87106d8 신규인지 판정)
// 600 은 421~600 띠 결함이 87106d8 이전(c5dff51)에도 같았는지 보려고 base 만 잰다
for (const w of [1440, 1024, 600]) {
  if (stopped()) { out.stopped = true; break; }
  const { ctx, page } = await openHome(browser, { w, h: 900, css: CSS_C5 });
  const base = await page.evaluate(measure);
  const f = w === 600 ? null : await filterState(page, "서");
  out.filter_c5dff51[w] = { base: { gtc: base.gtc, bt8: base.bt8, pr8: base.pr8, ncols: base.ncols, firstRowBt0: base.firstRowBt0, rowsConsistent: base.rowsConsistent, prRule: base.prRule, minGap: base.minGap }, filter: f };
  process.stdout.write(`c5dff51 ${w}: base cols=${base.ncols} bt8=${base.bt8.join(",")} pr8=${base.pr8.join(",")} minGap=${base.minGap}` + (f ? ` | filter n=${f.nTiles} rows=${JSON.stringify(f.rows.map((r) => r.bts))} minGap=${f.minGap}` : "") + "\n");
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(DIR, "tiles.json"), JSON.stringify(out, null, 1));
process.stdout.write("wrote " + path.join(DIR, "tiles.json") + "\n");
