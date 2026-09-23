// critic 5회차 프로브 layout (2026-09-23): 507edf1 의 CSS 수리 검증. 리포 추적 파일은 건드리지 않는다(읽기, route 대체만).
//   font    브라우저 기본 글꼴을 CDP Page.setFontSizes 로 32px(폭 1150/1200/1201/1250/1024), 20px(700/760/1024) 로 두고 대학 목록 열 수,
//           앞 8 타일 border-top, padding-right. 먼저 matchMedia("(max-width:37.5em)") 가 32px 1150 에서 true 인지로 설정 적용 확인.
//           음성 경로: 수리 전 base.css(507edf1~1) 를 route 로 끼워 32px 1150 에서 3번 타일 윗선 0(Codex 4차 지적)을 판정기가 FAIL 로 잡는지.
//   widths  보통 글꼴(16px) 390/430/600/601/1024/1100/1101/1440. r4/tiles.json 과 열 수, gtc, bt8, pr8, minGap, 판정 대조
//   footer  .ft-legal 이 있는 서빙 면 전수(git ls-files *.html 중 _design/_tools/_docs 밖, 77면) × 1440/390: 링크마다 좌우 빈칸 차 <=1, 높이 >=48
//   empty   검색 「없는대학」 1440/1024/390: p.empty 테두리 0, 폭 = #tiles 폭, #tiles 캡처 픽셀 분석(가로 전폭 괘선 = 위아래 2개, p 가장자리 선 0).
//           입력 지운 뒤 괘선 판정. 음성 경로: 수리 전 base.css 로 1440 점선 테두리를 픽셀 판정이 잡는지
//   join    가입 약관 행 320/390/1440: 같은 줄, .view 48x48, 중심차. r4/p2set.json 과 대조
// 사용: node /Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5/probe_layout.mjs [font|widths|footer|empty|join|all]
// 산출: r5/layout.json (구획별 병합), r5/shots/*.png
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");

const DIR = "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r5";
const R4 = "/Users/gregory/Workspace/hyunhak-site/_design/site_audit_20260923/r4";
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const SHOTS = path.join(DIR, "shots");
const OUT = path.join(DIR, "layout.json");
const STOP = path.join(DIR, ".wf_stop");
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = "http://localhost:8092/";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const UNSTICK = "nav.fix{visibility:hidden!important} header,.hd,.r2-hd{position:static!important}";
const which = process.argv[2] || "all";
const stopped = () => fs.existsSync(STOP);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
const sha16 = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);

const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const shots = new Set(result.shots || []);
result.meta = {
  head: execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]).toString().trim(),
  at: new Date().toISOString(),
  servedCssSha16: sha16(Buffer.from(await (await fetch(BASE + "assets/base.css")).arrayBuffer())),
  headCssSha16: sha16(execFileSync("git", ["-C", REPO, "show", "HEAD:assets/base.css"], { maxBuffer: 16 << 20 })),
};
const save = () => { result.shots = [...shots]; fs.writeFileSync(OUT, JSON.stringify(result, null, 1)); };
const CSS_PRE = execFileSync("git", ["-C", REPO, "show", "507edf1~1:assets/base.css"], { maxBuffer: 16 << 20 }).toString();

const browser = await chromium.launch({ channel: "chrome", headless: true });

// ───────── 대학 목록 측정 (r4/probe_tiles.mjs measure 그대로 + 기본 글꼴) ─────────
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
      nOverflow: n ? n.scrollWidth > n.clientWidth : false,
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
    return { row: ri, count: row.length, bts, same, maxSeam: +maxSeam.toFixed(3) };
  });
  const gaps = [];
  rows.forEach((row) => { for (let k = 0; k + 1 < row.length; k++) gaps.push({ from: row[k].name, to: row[k + 1].name, gap: row[k + 1].textLeft == null ? null : +(row[k + 1].textLeft - row[k].arRight).toFixed(3) }); });
  const arOutside = info.filter((x) => x.arRight > x.contentRight + 0.5).map((x) => ({ name: x.name, arRight: x.arRight, contentRight: x.contentRight }));
  const firstRowBt0 = rows.length ? rows[0].every((x) => x.bt === 0) : null;
  const otherRowsBtPos = rows.slice(1).every((row) => row.every((x) => x.bt > 0));
  const prRule = info.every((x) => (x.col === ncols - 1 ? x.pr === 0 : x.pr > 0));
  const mq = (q) => matchMedia(q).matches;
  const de = document.documentElement;
  let overRight = 0; const overNames = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > de.clientWidth + 1) { const st = getComputedStyle(el); if (st.position === "fixed" && st.visibility === "hidden") continue; overRight++; if (overNames.length < 5) overNames.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${r.right.toFixed(1)}`); }
  }
  return {
    vw: innerWidth, vv: +(visualViewport ? visualViewport.width : innerWidth).toFixed(3), dpr: devicePixelRatio, clientW: de.clientWidth, scrollW: de.scrollWidth,
    htmlFontSize: getComputedStyle(de).fontSize,
    hOverflow: de.scrollWidth > de.clientWidth, overRight, overNames,
    mq: { notMax1100: mq("not all and (max-width:1100px)"), max1100: mq("(max-width:1100px)"), max375em: mq("(max-width:37.5em)") },
    gtc: cs.gridTemplateColumns, ncols, containerBt: parseFloat(cs.borderTopWidth), containerBb: parseFloat(cs.borderBottomWidth),
    tilesRect: { left: +tr.left.toFixed(3), right: +tr.right.toFixed(3), width: +tr.width.toFixed(3), innerW: +(innerR - innerL).toFixed(3) },
    nTiles: tiles.length, nKids: kids.length,
    bt8: info.slice(0, 8).map((x) => x.bt), pr8: info.slice(0, 8).map((x) => x.pr), btAll: info.map((x) => x.bt), prAll: info.map((x) => x.pr),
    rows: rowReport, firstRowBt0, otherRowsBtPos, rowsConsistent: rowReport.every((r) => r.same && r.maxSeam <= 0.5),
    prRule, gaps, minGap: gaps.length ? Math.min(...gaps.map((g) => g.gap)) : null, arOutside,
    overflowCount: info.filter((x) => x.nOverflow).length,
  };
}
// r4 판정기 그대로
function judge(m, exp) {
  const colsOK = m.ncols === exp;
  const col1Rule = exp === 1 ? (m.btAll[0] === 0 && m.btAll.slice(1).every((b) => b > 0)) : null;
  const gapOK = m.minGap == null ? exp === 1 || m.nTiles <= 1 : m.minGap > 0;
  const noHOverflow = !m.hOverflow && m.overRight === 0;
  const ok = colsOK && m.firstRowBt0 !== false && m.otherRowsBtPos && m.rowsConsistent && m.prRule && gapOK && noHOverflow && m.arOutside.length === 0 && col1Rule !== false;
  return { exp, colsOK, firstRowBt0: m.firstRowBt0, otherRowsBtPos: m.otherRowsBtPos, rowsConsistent: m.rowsConsistent, prRule: m.prRule, gapOK, noHOverflow, col1Rule, ok };
}
// 큰 기본 글꼴 판정: 괘선 규칙(열 수, 첫 행 윗선 0, 나머지 >0, 1열이면 패딩 전부 0). 가로 넘침은 괘선과 별개라 관찰로만 적는다
function judgeTiles(m, exp) {
  const colsOK = m.ncols === exp;
  const col1 = exp === 1 ? { t1: m.btAll[0] === 0, restPos: m.btAll.slice(1).every((b) => b > 0), pr0: m.prAll.every((p) => p === 0) } : null;
  const ok = colsOK && m.firstRowBt0 !== false && m.otherRowsBtPos && m.rowsConsistent && m.prRule && (col1 ? col1.t1 && col1.restPos && col1.pr0 : true);
  return { exp, colsOK, firstRowBt0: m.firstRowBt0, otherRowsBtPos: m.otherRowsBtPos, rowsConsistent: m.rowsConsistent, prRule: m.prRule, col1, ok };
}

async function closePopup(page) {
  const had = await page.evaluate(() => !!document.querySelector(".pdim"));
  if (had) { await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(400); }
  const still = await page.evaluate(() => !!document.querySelector(".pdim"));
  if (still) await page.evaluate(() => { document.querySelectorAll(".pdim").forEach((e) => e.remove()); document.querySelectorAll("[inert]").forEach((e) => e.removeAttribute("inert")); document.documentElement.classList.remove("ppop-open"); });
  return { had, closedByEsc: had && !still };
}
// 매번 새 컨텍스트(홈 팝업 세션당 1회). fontPx = CDP 기본 글꼴, css = base.css 대체
async function open(url, w, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: opt.h || 900 }, deviceScaleFactor: 1, locale: "ko-KR" });
  if (opt.css) await ctx.route("**/assets/base.css", (r) => r.fulfill({ status: 200, contentType: "text/css; charset=utf-8", body: opt.css }));
  const page = await ctx.newPage();
  if (opt.fontPx) { const cdp = await ctx.newCDPSession(page); await cdp.send("Page.setFontSizes", { fontSizes: { standard: opt.fontPx } }); }
  await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.addStyleTag({ content: RV });
  await page.waitForTimeout(opt.settle ?? 1200);
  const pop = await closePopup(page);
  await page.waitForTimeout(200);
  return { ctx, page, pop };
}
// 촬영용 unstick (r4 관례): sticky -> static, fixed -> hidden. 측정 뒤에만
async function unstick(page) {
  await page.evaluate(() => { for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if (p === "sticky" || p === "fixed") el.setAttribute("data-probe-unstick", p); } });
  await page.addStyleTag({ content: '[data-probe-unstick="sticky"]{position:static!important}[data-probe-unstick="fixed"]{visibility:hidden!important}' });
}
async function shootFind(page, file) {
  await unstick(page);
  // #find 가 뷰포트보다 길면(32px 1150 = 942 > 900) 요소 캡처가 뷰포트 밖 캡처로 가며 다른 구획이 찍혔다(09-23 실측). 측정은 끝났으므로 높이만 늘린다(폭 불변, 폭 미디어 쿼리 무관)
  const vs = page.viewportSize();
  const fh = await page.evaluate(() => document.getElementById("find").getBoundingClientRect().height);
  if (vs && fh > vs.height - 40) { await page.setViewportSize({ width: vs.width, height: Math.ceil(fh) + 120 }); await page.waitForTimeout(300); }
  await page.evaluate(() => document.getElementById("find").scrollIntoView({ behavior: "instant", block: "start" }));
  await page.waitForTimeout(400);
  const p = path.join(SHOTS, file);
  await page.locator("#find").screenshot({ path: p });
  shots.add(p);
  return p;
}
const tline = (tag, m, j) => `${tag}: font=${m.htmlFontSize} mq37.5em=${m.mq.max375em} cols=${m.ncols}/${j.exp} gtc=${m.gtc} bt8=${m.bt8.join(",")} pr8=${m.pr8.join(",")} minGap=${m.minGap} scrollW=${m.scrollW}/${m.clientW} => ${j.ok ? "OK" : "FAIL"}`;

// ───────── 1 큰 기본 글꼴 ─────────
async function fontPart() {
  const out = { cases: {}, negative: {} };
  const expCols = (w, f) => (w <= 37.5 * f ? 1 : w <= 1100 ? 2 : 3);
  // 설정 적용 확인: 16px 에서는 1150 이 37.5em(600) 밖, 32px 에서는 안(1200)
  for (const f of [16, 32]) {
    const { ctx, page } = await open("index.html", 1150, { fontPx: f === 16 ? null : f });
    out[`apply_${f}`] = await page.evaluate(() => ({ mq375em: matchMedia("(max-width:37.5em)").matches, htmlFontSize: getComputedStyle(document.documentElement).fontSize }));
    log(`font apply ${f}px @1150`, JSON.stringify(out[`apply_${f}`]));
    await ctx.close();
  }
  out.applied = out.apply_32.mq375em === true && out.apply_16.mq375em === false;
  const cases = [[32, 1150], [32, 1200], [32, 1201], [32, 1250], [32, 1024], [20, 700], [20, 760], [20, 1024]];
  for (const [f, w] of cases) {
    if (stopped()) { out.stopped = true; break; }
    const { ctx, page } = await open("index.html", w, { fontPx: f });
    const m = await page.evaluate(measure);
    const j = judgeTiles(m, expCols(w, f));
    out.cases[`${f}px_${w}`] = { fontPx: f, w, vv: m.vv, htmlFontSize: m.htmlFontSize, mq: m.mq, gtc: m.gtc, ncols: m.ncols, nTiles: m.nTiles, bt8: m.bt8, pr8: m.pr8, btAll: m.btAll, prAll: m.prAll, minGap: m.minGap, hOverflow: m.hOverflow, overRight: m.overRight, overNames: m.overNames, overflowCount: m.overflowCount, judge: j };
    log(tline(`font ${f}px w${w}`, m, j));
    if (f === 32 && w === 1150) await shootFind(page, "tiles_font32_1150.png");
    await ctx.close();
  }
  // 음성 경로: 수리 전 base.css(507edf1~1, 1열 블록이 2번만 복원)
  for (const [f, w] of [[32, 1150], [32, 1200]]) {
    if (stopped()) { out.stopped = true; break; }
    const { ctx, page } = await open("index.html", w, { fontPx: f, css: CSS_PRE });
    const m = await page.evaluate(measure);
    const j = judgeTiles(m, expCols(w, f));
    out.negative[`pre_${f}px_${w}`] = { gtc: m.gtc, ncols: m.ncols, bt8: m.bt8, pr8: m.pr8, judge: j };
    log(tline(`NEG pre ${f}px w${w}`, m, j));
    await ctx.close();
  }
  out.negativeCaught = Object.values(out.negative).every((x) => x.judge.ok === false);
  result.font = out; save();
}

// ───────── 2 보통 글꼴 폭 회귀 ─────────
async function widthsPart() {
  const r4 = JSON.parse(fs.readFileSync(path.join(R4, "tiles.json"), "utf8"));
  const out = {};
  const expectCols = (w) => (w <= 600 ? 1 : w <= 1100 ? 2 : 3);
  for (const w of [390, 430, 600, 601, 1024, 1100, 1101, 1440]) {
    if (stopped()) { out.stopped = true; break; }
    const { ctx, page, pop } = await open("index.html", w);
    const m = await page.evaluate(measure);
    const j = judge(m, expectCols(m.vv));
    const p = r4.widths[w];
    const same = p ? { ncols: p.ncols === m.ncols, gtc: p.gtc === m.gtc, bt8: p.bt8.join() === m.bt8.join(), pr8: p.pr8.join() === m.pr8.join(), minGap: p.minGap === m.minGap, nTiles: p.nTiles === m.nTiles, btAll: p.btAll.join() === m.btAll.join(), ok: p.judge.ok === j.ok } : null;
    out[w] = { vv: m.vv, popup: pop, gtc: m.gtc, ncols: m.ncols, nTiles: m.nTiles, bt8: m.bt8, pr8: m.pr8, minGap: m.minGap, scrollW: m.scrollW, clientW: m.clientW, overRight: m.overRight, judge: j, r4: p ? { gtc: p.gtc, ncols: p.ncols, bt8: p.bt8, pr8: p.pr8, minGap: p.minGap, ok: p.judge.ok } : null, sameAsR4: same, allSame: same ? Object.values(same).every(Boolean) : false };
    log(tline(`w${w}`, m, j), "sameAsR4", out[w].allSame);
    if (w === 430) await shootFind(page, "tiles_430.png");
    if (w === 1024) await shootFind(page, "tiles_1024.png");
    await ctx.close();
  }
  result.widths = out; save();
}

// ───────── 3 푸터 법적 고지 전수 ─────────
const FT = () => {
  const nav = document.querySelector("footer .ft-legal");
  const footer = document.querySelector("footer");
  const base = { footerPresent: !!footer, footerClass: footer ? footer.className : null, legalPresent: !!nav };
  if (!nav) return base;
  const links = [...nav.querySelectorAll("a")].map((a) => {
    const b = a.getBoundingClientRect(), cs = getComputedStyle(a);
    const rg = document.createRange(); rg.selectNodeContents(a);
    const rects = [...rg.getClientRects()].filter((r) => r.width > 0);
    const t = rg.getBoundingClientRect();
    const lines = []; for (const r of rects.sort((x, y) => x.top - y.top)) { if (!lines.length || r.top >= lines.at(-1).b - 2) lines.push({ t: r.top, b: r.bottom }); else lines.at(-1).b = Math.max(lines.at(-1).b, r.bottom); }
    const lb = +(t.left - b.left).toFixed(2), rb = +(b.right - t.right).toFixed(2);
    return { text: a.textContent.trim(), boxW: +b.width.toFixed(2), boxH: +b.height.toFixed(2), textW: +t.width.toFixed(2), textLines: lines.length,
      leftBlank: lb, rightBlank: rb, diff: +(lb - rb).toFixed(2), centered: Math.abs(lb - rb) <= 1, h48: b.height >= 48, justify: cs.justifyContent, display: cs.display };
  });
  return { ...base, n: links.length, links, allCentered: links.every((l) => l.centered), allH48: links.every((l) => l.h48),
    maxAbsDiff: links.length ? Math.max(...links.map((l) => Math.abs(l.diff))) : null, minH: links.length ? Math.min(...links.map((l) => l.boxH)) : null,
    justifies: [...new Set(links.map((l) => l.justify))], docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
};
async function footerShot(page, w, file, boxes = false) {
  await page.addStyleTag({ content: UNSTICK });
  await page.evaluate(() => document.querySelector("footer .ft-legal").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(300);
  const nb = await page.evaluate(() => { const b = document.querySelector("footer .ft-legal").getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  const clip = { x: Math.max(0, nb.x - 16), y: Math.max(0, nb.y - 16), width: Math.min(w - Math.max(0, nb.x - 16), nb.w + 32), height: nb.h + 32 };
  const p = path.join(SHOTS, file); await page.screenshot({ path: p, clip }); shots.add(p);
  if (boxes) {
    await page.addStyleTag({ content: "footer .ft-legal a{outline:1px solid #d33;outline-offset:-1px}" });
    const p2 = path.join(SHOTS, file.replace(".png", "_boxes.png")); await page.screenshot({ path: p2, clip }); shots.add(p2);
  }
}
async function footerPart() {
  const pages = execFileSync("git", ["-C", REPO, "-c", "core.quotepath=off", "ls-files", "-z", "*.html"]).toString().split("\0").filter((f) => f && !/^(_design|_tools|_docs|node_modules)\//.test(f))
    .filter((f) => fs.readFileSync(path.join(REPO, f), "utf8").includes("ft-legal")).sort();
  const jobs = []; for (const u of pages) for (const w of [1440, 390]) jobs.push([u, w]);
  const SHOT = { "join.html@390": "footer_join_390.png", "login.html@1440": "footer_login_1440.png", "index.html@390": "footer_index_390.png" };
  const out = { nPages: pages.length, pages, per: {} };
  let k = 0;
  async function worker() {
    while (k < jobs.length) {
      if (stopped()) { out.stopped = true; return; }
      const [u, w] = jobs[k++];
      let tries = 0, m = null;
      while (tries++ < 2) {
        const { ctx, page } = await open(u, w, { settle: 700 });
        try {
          m = await page.evaluate(FT);
          if (SHOT[`${u}@${w}`] && m.legalPresent) await footerShot(page, w, SHOT[`${u}@${w}`], u === "index.html");
        } catch (e) { m = { error: String(e).slice(0, 200) }; }
        await ctx.close();
        if (!m.error) break;
      }
      out.per[`${u}@${w}`] = m;
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  const entries = Object.entries(out.per);
  const bad = entries.filter(([, m]) => m.error || !m.legalPresent || !m.allCentered || !m.allH48);
  let maxDiff = 0, minH = Infinity, nLinks = 0; const justifies = new Set(); const texts = new Set();
  for (const [, m] of entries) if (m.links) { nLinks += m.links.length; maxDiff = Math.max(maxDiff, m.maxAbsDiff); minH = Math.min(minH, m.minH); m.justifies.forEach((j) => justifies.add(j)); m.links.forEach((l) => texts.add(l.text)); }
  const compact = ["404.html", "cart.html", "checkout.html", "join.html", "login.html", "my.html", "pay_done.html"];
  out.summary = { nPages: pages.length, nMeasured: entries.length, nLinks, maxAbsDiff: +maxDiff.toFixed(2), minH, justifies: [...justifies], linkTexts: [...texts], bad: bad.map(([k, m]) => ({ k, err: m.error, legal: m.legalPresent, maxAbsDiff: m.maxAbsDiff, minH: m.minH })),
    compactIncluded: compact.every((c) => pages.includes(c)),
    compact: Object.fromEntries(compact.flatMap((c) => [1440, 390].map((w) => { const m = out.per[`${c}@${w}`]; return [`${c}@${w}`, m ? { footerClass: m.footerClass, n: m.n, maxAbsDiff: m.maxAbsDiff, minH: m.minH, justify: m.justifies } : null]; }))),
    pay: Object.fromEntries(["index.html", "join.html", "login.html", "cart.html"].flatMap((c) => [1440, 390].map((w) => { const l = out.per[`${c}@${w}`]?.links?.find((x) => x.text === "결제"); return [`${c}@${w}`, l ? `${l.boxW}/${l.textW} L${l.leftBlank} R${l.rightBlank}` : null]; }))) };
  out.pass = entries.length === pages.length * 2 && bad.length === 0;
  log("footer", JSON.stringify(out.summary));
  result.footer = out; save();
}

// ───────── 4 검색 0건 ─────────
const EMPTY = () => {
  const box = document.getElementById("tiles"), p = box.querySelector("p.empty");
  const bb = box.getBoundingClientRect(), bcs = getComputedStyle(box);
  if (!p) return { present: false, nKids: box.children.length };
  const pb = p.getBoundingClientRect(), cs = getComputedStyle(p);
  return { present: true, vw: innerWidth, nTiles: box.querySelectorAll(".tile").length, nKids: box.children.length,
    pBorder: { t: cs.borderTopWidth, r: cs.borderRightWidth, b: cs.borderBottomWidth, l: cs.borderLeftWidth, style: cs.borderTopStyle, radius: cs.borderTopLeftRadius },
    pRect: { l: +pb.left.toFixed(2), r: +pb.right.toFixed(2), t: +pb.top.toFixed(2), b: +pb.bottom.toFixed(2), w: +pb.width.toFixed(2) },
    tilesRect: { l: +bb.left.toFixed(2), r: +bb.right.toFixed(2), t: +bb.top.toFixed(2), b: +bb.bottom.toFixed(2), w: +bb.width.toFixed(2) },
    tilesBorder: { t: bcs.borderTopWidth, b: bcs.borderBottomWidth, l: bcs.borderLeftWidth, r: bcs.borderRightWidth, tc: bcs.borderTopColor },
    widthDiff: +(pb.width - bb.width).toFixed(2), gridColumn: cs.gridColumn, text: p.textContent.trim().slice(0, 40) };
};
// PNG 픽셀 분석(PIL): 배경 = 최빈색, 선 화소 = 채널 차 합 > 24. 가로 전폭 괘선 행(coverage >= .9)을 띠로 묶고, p 가장자리 열과 행의 선 화소 비율
const PY = `
import sys, json
from PIL import Image
from collections import Counter
im = Image.open(sys.argv[1]).convert("RGB"); W, H = im.size; px = im.load()
a = json.loads(sys.argv[2])
bg = Counter(px[x, y] for y in range(H) for x in range(0, W, 3)).most_common(1)[0][0]
line = lambda c: sum(abs(c[i] - bg[i]) for i in range(3)) > 24
rowcov = [sum(line(px[x, y]) for x in range(W)) / W for y in range(H)]
bands = []
for y, c in enumerate(rowcov):
    if c >= 0.9:
        if bands and bands[-1][1] == y - 1: bands[-1][1] = y
        else: bands.append([y, y])
def colcov(x, y0, y1):
    x = max(0, min(W - 1, x)); ys = range(max(0, y0), min(H, y1)); return round(sum(line(px[x, y]) for y in ys) / max(1, len(ys)), 3)
def rcov(y, x0, x1):
    y = max(0, min(H - 1, y)); xs = range(max(0, x0), min(W, x1)); return round(sum(line(px[x, y]) for x in xs) / max(1, len(xs)), 3)
pl, pr, pt, pb = a["pl"], a["pr"], a["pt"], a["pb"]
edges = {"pLeftCol": colcov(pl, pt + 2, pb - 2), "pRightCol": colcov(pr - 1, pt + 2, pb - 2), "pTopRow": rcov(pt, pl + 2, pr - 2), "pBottomRow": rcov(pb - 1, pl + 2, pr - 2)}
maxInner = max([rowcov[y] for y in range(max(0, pt), min(H, pb))] or [0])
print(json.dumps({"size": [W, H], "bg": bg, "fullBands": bands, "edges": edges, "maxRowCovInsideP": round(maxInner, 3)}))
`;
function pixelLines(file, rel) { return JSON.parse(execFileSync("python3", ["-c", PY, file, JSON.stringify(rel)]).toString()); }
async function emptyShot(page, w, file) {
  await unstick(page);
  await page.evaluate(() => document.getElementById("tiles").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(300);
  const g = await page.evaluate(() => { const b = document.getElementById("tiles").getBoundingClientRect(), p = document.querySelector("#tiles p.empty").getBoundingClientRect(); return { b: { x: b.left, y: b.top, w: b.width, h: b.height }, p: { l: p.left, r: p.right, t: p.top, b: p.bottom } }; });
  const M = 8;
  const clip = { x: Math.max(0, g.b.x - M), y: Math.max(0, g.b.y - M), width: Math.min(w, g.b.x + g.b.w + M) - Math.max(0, g.b.x - M), height: g.b.h + 2 * M };
  const p = path.join(SHOTS, file); await page.screenshot({ path: p, clip }); shots.add(p);
  const rel = { pl: Math.round(g.p.l - clip.x), pr: Math.round(g.p.r - clip.x), pt: Math.round(g.p.t - clip.y), pb: Math.round(g.p.b - clip.y), tilesTop: Math.round(g.b.y - clip.y), tilesBottom: Math.round(g.b.y + g.b.h - 1 - clip.y) };
  const px = pixelLines(p, rel);
  const bandsAt = px.fullBands.map((b) => b[0]);
  const twoBands = px.fullBands.length === 2 && Math.abs(px.fullBands[0][0] - rel.tilesTop) <= 1 && Math.abs(px.fullBands[1][1] - rel.tilesBottom) <= 1;
  const edgesClean = Object.values(px.edges).every((v) => v < 0.05);
  return { file: p, clip, rel, ...px, bandsAt, twoBands, edgesClean, ok: twoBands && edgesClean };
}
async function emptyPart() {
  const out = {};
  const expectCols = (w) => (w <= 600 ? 1 : w <= 1100 ? 2 : 3);
  for (const w of [1440, 1024, 390]) {
    if (stopped()) { out.stopped = true; break; }
    const { ctx, page } = await open("index.html", w);
    const before = await page.evaluate(measure);
    await page.fill("#q2", "없는대학");
    await page.waitForTimeout(700);
    const e = await page.evaluate(EMPTY);
    const border0 = e.present && ["t", "r", "b", "l"].every((k) => parseFloat(e.pBorder[k]) === 0);
    const fullW = e.present && Math.abs(e.widthDiff) <= 0.5;
    const tilesLines = e.present && parseFloat(e.tilesBorder.t) > 0 && parseFloat(e.tilesBorder.b) > 0 && parseFloat(e.tilesBorder.l) === 0 && parseFloat(e.tilesBorder.r) === 0;
    const pix = e.present ? await emptyShot(page, w, w === 1440 ? "tiles_empty_1440.png" : `tiles_empty_${w}.png`) : null;
    // 결과 복귀: 새 컨텍스트가 아니라 같은 페이지에서 입력을 지운다(촬영 unstick 은 괘선 측정과 무관)
    await page.fill("#q2", "");
    await page.waitForTimeout(700);
    const after = await page.evaluate(measure);
    const ja = judge(after, expectCols(after.vv));
    const restoreSame = after.nTiles === before.nTiles && after.btAll.join() === before.btAll.join() && after.prAll.join() === before.prAll.join() && after.gtc === before.gtc;
    out[w] = { empty: e, border0, fullW, tilesLines, pixels: pix, restore: { nTiles: after.nTiles, gtc: after.gtc, bt8: after.bt8, pr8: after.pr8, minGap: after.minGap, judge: ja, sameAsBefore: restoreSame }, ok: border0 && fullW && tilesLines && !!pix && pix.ok && ja.ok && restoreSame };
    log(`empty ${w}: n=${e.nTiles} pBorder=${JSON.stringify(e.pBorder)} pW=${e.pRect?.w} tilesW=${e.tilesRect?.w} diff=${e.widthDiff} tilesBorder=${JSON.stringify(e.tilesBorder)} bands=${JSON.stringify(pix?.fullBands)} rel=${JSON.stringify(pix?.rel)} edges=${JSON.stringify(pix?.edges)} maxInnerRow=${pix?.maxRowCovInsideP} | restore ${tline("", after, ja)} same=${restoreSame} => ${out[w].ok ? "OK" : "FAIL"}`);
    await ctx.close();
  }
  // 음성 경로: 수리 전 base.css(507edf1~1) 의 점선 테두리를 같은 픽셀 판정이 잡는지
  if (!stopped()) {
    const { ctx, page } = await open("index.html", 1440, { css: CSS_PRE });
    await page.fill("#q2", "없는대학");
    await page.waitForTimeout(700);
    const e = await page.evaluate(EMPTY);
    const pix = await emptyShot(page, 1440, "tiles_empty_1440_pre507edf1.png");
    out.negative_pre_1440 = { pBorder: e.pBorder, widthDiff: e.widthDiff, pixels: pix, caught: !pix.ok };
    log(`NEG empty pre 1440: pBorder=${JSON.stringify(e.pBorder)} bands=${JSON.stringify(pix.fullBands)} edges=${JSON.stringify(pix.edges)} => judge ${pix.ok ? "OK (not caught)" : "FAIL (caught)"}`);
    await ctx.close();
  }
  result.empty = out; save();
}

// ───────── 5 가입 약관 행 (r4 JOIN 그대로) ─────────
const JOIN = () => {
  const lines = (el) => { const rs = []; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (!n.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); rs.push(...[...rg.getClientRects()].filter((r) => r.width > 0)); } rs.sort((a, b) => a.top - b.top); const L = []; for (const r of rs) { if (!L.length || r.top >= L.at(-1).b - 2) L.push({ t: r.top, b: r.bottom }); else { L.at(-1).t = Math.min(L.at(-1).t, r.top); L.at(-1).b = Math.max(L.at(-1).b, r.bottom); } } return L; };
  return [...document.querySelectorAll("#joinForm .check")].map((row) => {
    const label = row.querySelector("label.check-choice"), cb = label.querySelector("input[type=checkbox]"), span = label.querySelector(":scope > span"), view = row.querySelector(".view");
    const tw = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
    const tn = tw.nextNode(); const lead = tn.nodeValue.search(/\S/);
    const rg = document.createRange(); rg.setStart(tn, lead); rg.setEnd(tn, lead + 1); const fc = rg.getBoundingClientRect();
    const rg2 = document.createRange(); rg2.selectNodeContents(tn); const first = [...rg2.getClientRects()].filter((x) => x.width > 0 && Math.abs(x.top - fc.top) < 1);
    const fl = { t: Math.min(...first.map((x) => x.top)), b: Math.max(...first.map((x) => x.bottom)) };
    const cbb = cb.getBoundingClientRect(), spb = span.getBoundingClientRect(), lb = label.getBoundingClientRect();
    const cbMid = (cbb.top + cbb.bottom) / 2;
    const o = { id: cb.id, spanLines: lines(span).length, sameLine: cbMid >= fl.t && cbMid <= fl.b && spb.left > cbb.right };
    if (view) { const vb = view.getBoundingClientRect(); o.view = { w: +vb.width.toFixed(2), h: +vb.height.toFixed(2), ge48: vb.width >= 48 && vb.height >= 48, dCenter: +((vb.top + vb.bottom) / 2 - (fl.t + fl.b) / 2).toFixed(2), sameRow: vb.top < lb.bottom && vb.bottom > lb.top, rightOfSpan: vb.left >= spb.right - 0.5 }; }
    return o;
  });
};
async function joinPart() {
  const r4 = JSON.parse(fs.readFileSync(path.join(R4, "p2set.json"), "utf8")).join;
  const out = {};
  for (const w of [320, 390, 1440]) {
    if (stopped()) { out.stopped = true; break; }
    const { ctx, page } = await open("join.html", w);
    const rows = await page.evaluate(JOIN);
    const prev = Object.fromEntries((r4[w]?.rows || []).map((r) => [r.id, r.view ? r.view.dCenter : null]));
    for (const r of rows) if (r.view) r.view.r4dCenter = prev[r.id] ?? null;
    const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const ok = rows.length === (r4[w]?.rows || []).length && rows.every((r) => r.sameLine && (!r.view || (r.view.ge48 && r.view.sameRow && r.view.rightOfSpan && r.view.r4dCenter != null && Math.abs(r.view.dCenter - r.view.r4dCenter) <= 0.5))) && !docOverflow;
    out[w] = { rows, docOverflow, ok };
    log(`join ${w}`, rows.map((r) => `${r.id}:L${r.spanLines} same=${r.sameLine}${r.view ? ` d=${r.view.dCenter}(r4 ${r.view.r4dCenter}) ${r.view.w}x${r.view.h}` : ""}`).join(" | "), "overflow", docOverflow, ok ? "OK" : "FAIL");
    await ctx.close();
  }
  result.join = out; save();
}

const parts = { font: fontPart, widths: widthsPart, footer: footerPart, empty: emptyPart, join: joinPart };
try {
  for (const [k, fn] of Object.entries(parts)) {
    if (which !== "all" && which !== k) continue;
    if (stopped()) { log("STOP seen before", k); result.stopped = true; save(); break; }
    await fn();
  }
} catch (e) {
  log("ERROR", e && e.stack ? e.stack : String(e));
  process.exitCode = 1;
} finally {
  await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
  process.exit(process.exitCode || 0);
}
