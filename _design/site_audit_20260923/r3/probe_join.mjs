// 2026-09-23 critic 3회차 재실측: join.html 약관 동의 행 (critic 2차 P1-3 수리 검증, 커밋 87106d8).
// 회귀 = 390 에서 전문 링크 행의 체크박스가 혼자 한 줄, 라벨이 아래로. 수리 = join.html 59~60행 .check-choice nowrap + span flex:1 min-width:0.
// 폭 320/360/390/768/1440 (높이 900). 행마다 체크박스와 span 첫 줄 박스, 같은 줄 판정, .view 크기, 행 높이, 가로 넘침.
// 390 에서 span 글자 클릭 토글, .view 클릭 비토글(navigation 차단 판과 새 창 허용 판 둘 다).
// 사용: node _design/site_audit_20260923/r3/probe_join.mjs   → r3/join.json, r3/shots/join_{390,360,1440}.png
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const R3 = path.dirname(new URL(import.meta.url).pathname);
const SHOTS = path.join(R3, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const URL_ = "http://localhost:8092/join.html";
const WIDTHS = [320, 360, 390, 768, 1440];
const SHOT_W = [390, 360, 1440];
const TAP = 48;

async function openPage(browser, w) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, locale: "ko-KR" });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: ".rv{opacity:1!important;transform:none!important;transition:none!important}" });
  if (await page.$(".pdim")) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  return { ctx, page };
}

// 행 측정. 첫 줄 박스 = span 의 첫 텍스트 노드 첫 글자 Range rect 의 줄 (같은 top 을 가진 rect 들의 합).
const MEASURE = () => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(2), left: +b.left.toFixed(2), right: +b.right.toFixed(2), bottom: +b.bottom.toFixed(2), width: +b.width.toFixed(2), height: +b.height.toFixed(2) }; };
  const rows = [...document.querySelectorAll("#joinForm .check")];
  const out = rows.map((row) => {
    const label = row.querySelector("label.check-choice");
    const cb = label.querySelector("input[type=checkbox]");
    const span = label.querySelector(":scope > span");
    const view = row.querySelector(".view");
    // 첫 텍스트 노드
    const tw = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
    const tn = tw.nextNode();
    const lead = tn.nodeValue.search(/\S/);
    const rg = document.createRange();
    rg.setStart(tn, lead); rg.setEnd(tn, lead + 1);
    const fc = rg.getBoundingClientRect();
    // 첫 텍스트 노드 전체의 줄 rect 중 첫 줄
    const rg2 = document.createRange(); rg2.selectNodeContents(tn);
    const lineRects = [...rg2.getClientRects()].filter((x) => x.width > 0);
    const first = lineRects.filter((x) => Math.abs(x.top - fc.top) < 1);
    const fl = { top: Math.min(...first.map((x) => x.top)), bottom: Math.max(...first.map((x) => x.bottom)), left: Math.min(...first.map((x) => x.left)), right: Math.max(...first.map((x) => x.right)) };
    const cbR = r(cb), spR = r(span), rowR = r(row), lbR = r(label);
    const cbMid = (cbR.top + cbR.bottom) / 2;
    const cs = getComputedStyle(label), ss = getComputedStyle(span);
    const firstLineText = (() => {
      // 첫 줄에 놓인 글자 (첫 텍스트 노드 안에서만)
      let s = "";
      for (let i = lead; i < tn.nodeValue.length; i++) {
        const q = document.createRange(); q.setStart(tn, i); q.setEnd(tn, i + 1);
        const b = q.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (Math.abs(b.top - fc.top) < 1) s += tn.nodeValue[i]; else break;
      }
      return s.trim();
    })();
    return {
      id: cb.id,
      isAll: row.classList.contains("all"),
      text: span.textContent.replace(/\s+/g, " ").trim().slice(0, 40),
      label: { flexWrap: cs.flexWrap, display: cs.display, alignItems: cs.alignItems, rect: lbR },
      span: { flex: ss.flex, minWidth: ss.minWidth, rect: spR },
      checkbox: cbR,
      firstLine: { top: +fl.top.toFixed(2), bottom: +fl.bottom.toFixed(2), left: +fl.left.toFixed(2), right: +fl.right.toFixed(2), text: firstLineText, lineCountFirstTextNode: new Set(lineRects.map((x) => Math.round(x.top))).size },
      cbMidY: +cbMid.toFixed(2),
      midInFirstLine: cbMid >= fl.top && cbMid <= fl.bottom,
      spanRightOfCb: spR.left > cbR.right,
      firstLineRightOfCb: fl.left > cbR.right,
      sameLine: cbMid >= fl.top && cbMid <= fl.bottom && spR.left > cbR.right,
      spanTopMinusCbTop: +(spR.top - cbR.top).toFixed(2),
      view: view ? { rect: r(view), ge48: view.getBoundingClientRect().width >= 48 && view.getBoundingClientRect().height >= 48, href: view.getAttribute("href"), sameRowAsLabel: view.getBoundingClientRect().top < lbR.bottom && view.getBoundingClientRect().bottom > lbR.top, rightOfSpan: view.getBoundingClientRect().left >= spR.right - 0.5, centerYMinusFirstLineCenterY: +((view.getBoundingClientRect().top + view.getBoundingClientRect().bottom) / 2 - (fl.top + fl.bottom) / 2).toFixed(2) } : null,
      rowHeight: rowR.height,
      rowOverflowX: row.scrollWidth > row.clientWidth,
      rowScrollW: row.scrollWidth, rowClientW: row.clientWidth,
    };
  });
  return { docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, bodyScrollW: document.body.scrollWidth, rows: out };
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const result = { url: URL_, at: new Date().toISOString(), widths: {}, clicks390: null, shots: [] };

for (const w of WIDTHS) {
  const { ctx, page } = await openPage(browser, w);
  const visible = await page.isVisible("section.step.terms");
  const m = await page.evaluate(MEASURE);
  m.termsVisible = visible;
  m.overflowX = m.docScrollW > w;
  result.widths[w] = m;
  if (SHOT_W.includes(w)) {
    const p = path.join(SHOTS, `join_${w}.png`);
    // 블록 윗변을 뷰포트 위 72px 에 두고 찍는다. 그냥 찍으면 블록 아랫변이 뷰포트 바닥에 붙어 폰 폭 하단 고정 탭 바가 약관 끝 문단을 덮은 채 찍힌다.
    await page.evaluate(() => { const el = document.querySelector("section.step.terms"); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 72, behavior: "instant" }); });
    await page.waitForTimeout(300);
    await page.locator("section.step.terms").screenshot({ path: p });
    result.shots.push(p);
  }
  const line = m.rows.map((r) => `${r.id}:same=${r.sameLine} cb(${r.checkbox.left},${r.checkbox.top})-${r.checkbox.right} sp(${r.span.rect.left},${r.span.rect.top}) fl[${r.firstLine.top},${r.firstLine.bottom}] mid=${r.cbMidY} h=${r.rowHeight}${r.view ? ` view=${r.view.rect.width}x${r.view.rect.height}` : ""} wrap=${r.label.flexWrap}`).join("\n   ");
  process.stdout.write(`w=${w} scrollW=${m.docScrollW} overflow=${m.overflowX} visible=${visible}\n   ${line}\n`);
  await ctx.close();
}

// 390 클릭 동작
{
  const { ctx, page } = await openPage(browser, 390);
  const ids = await page.$$eval("#joinForm .check input[type=checkbox]", (els) => els.map((e) => e.id));
  const states = async () => page.$$eval("#joinForm .check input[type=checkbox]", (els) => Object.fromEntries(els.map((e) => [e.id, e.checked])));
  const reset = async () => page.$$eval("#joinForm .check input[type=checkbox]", (els) => els.forEach((e) => { e.checked = false; }));
  const spanClicks = [];
  for (const id of ids) {
    await reset();
    // span 첫 텍스트 노드 가운데 글자 좌표를 클릭 (체크박스 영역 밖).
    // html 에 scroll-behavior:smooth 가 걸려 있어 scrollIntoView 가 부드럽게 흐르는 동안 좌표를 재면 두 번째 클릭이 다른 요소에 떨어진다 → instant 로 옮기고 멈춘 뒤 좌표를 잰다.
    await page.evaluate((id) => document.getElementById(id).closest("label").querySelector(":scope > span").scrollIntoView({ block: "center", behavior: "instant" }), id);
    await page.waitForTimeout(400);
    const locate = () => page.evaluate((id) => {
      const cb = document.getElementById(id);
      const span = cb.closest("label").querySelector(":scope > span");
      const tn = [...span.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
      const lead = tn.nodeValue.search(/\S/);
      const len = tn.nodeValue.trim().length;
      let k = lead + Math.floor(len / 2);
      if (!tn.nodeValue[k].trim()) k -= 1;   // 공백이면 앞 글자
      const rg = document.createRange(); rg.setStart(tn, k); rg.setEnd(tn, k + 1);
      const b = rg.getBoundingClientRect();
      const cbb = cb.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { x: +x.toFixed(2), y: +y.toFixed(2), scrollY: Math.round(scrollY), ch: tn.nodeValue[k], hitTag: hit ? hit.tagName + (hit.className ? "." + hit.className : "") : null, hitInSpan: !!(hit && span.contains(hit)), hitIsCheckbox: hit === cb, xMinusCbRight: +(x - cbb.right).toFixed(2) };
    }, id);
    const pt = await locate();
    const before = (await states())[id];
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(80);
    const s1 = await states();
    // 두 번째 클릭은 더블클릭 간격(500ms) 밖에서, 좌표를 다시 재고 누른다.
    await page.evaluate(() => window.getSelection().removeAllRanges());
    await page.waitForTimeout(700);
    const pt2 = await locate();
    await page.mouse.click(pt2.x, pt2.y);
    await page.waitForTimeout(80);
    const s2 = await states();
    spanClicks.push({ id, point: pt, point2: pt2, scrolledBetween: pt.scrollY !== pt2.scrollY, before, afterClick1: s1[id], afterClick2: s2[id], statesAfter1: s1, toggledOn: before === false && s1[id] === true, toggledOff: s2[id] === false });
  }
  // .view 클릭: (A) document 버블 단계에서 preventDefault 로 이동 차단, (B) 새 창 허용 후 닫기
  const viewA = [];
  await page.evaluate(() => { window.__viewBlock = (e) => { if (e.target.closest && e.target.closest(".view")) { e.preventDefault(); window.__viewClicked = (window.__viewClicked || 0) + 1; } }; document.addEventListener("click", window.__viewBlock); });
  for (const [i, view] of (await page.$$("#joinForm .check .view")).entries()) {
    await reset();
    const rowCb = await view.evaluate((v) => v.closest(".check").querySelector("input[type=checkbox]").id);
    await view.scrollIntoViewIfNeeded();
    const before = await states();
    const pagesBefore = ctx.pages().length;
    await view.click();
    await page.waitForTimeout(250);
    const after = await states();
    viewA.push({ row: rowCb, before, after, rowCheckedChanged: before[rowCb] !== after[rowCb], anyChanged: JSON.stringify(before) !== JSON.stringify(after), pagesBefore, pagesAfter: ctx.pages().length, url: page.url() });
  }
  await page.evaluate(() => document.removeEventListener("click", window.__viewBlock));
  const viewB = [];
  for (const view of await page.$$("#joinForm .check .view")) {
    await reset();
    const rowCb = await view.evaluate((v) => v.closest(".check").querySelector("input[type=checkbox]").id);
    const before = await states();
    const popP = ctx.waitForEvent("page", { timeout: 4000 }).catch(() => null);
    await view.click();
    const pop = await popP;
    let popUrl = null;
    if (pop) { await pop.waitForURL(/\.html/, { timeout: 5000 }).catch(() => {}); popUrl = pop.url(); await pop.close(); }
    await page.waitForTimeout(150);
    const after = await states();
    viewB.push({ row: rowCb, popupOpened: !!pop, popUrl, openerUrl: page.url(), rowCheckedChanged: before[rowCb] !== after[rowCb], anyChanged: JSON.stringify(before) !== JSON.stringify(after) });
  }
  // 전체 동의 연동 (참고)
  await reset();
  const allPt = spanClicks.find((c) => c.id === "ck-all");
  result.clicks390 = { spanClicks, viewPreventNav: viewA, viewNewTab: viewB, allPropagatesOn: allPt ? Object.values(allPt.statesAfter1).every(Boolean) : null };
  process.stdout.write(`clicks390 span=${JSON.stringify(spanClicks.map((c) => [c.id, c.point.ch, c.point.hitTag, c.point.hitInSpan, c.toggledOn, c.toggledOff]))}\n`);
  process.stdout.write(`view(prevent)=${JSON.stringify(viewA.map((v) => [v.row, v.anyChanged, v.pagesAfter, v.url]))}\n`);
  process.stdout.write(`view(newtab)=${JSON.stringify(viewB.map((v) => [v.row, v.popupOpened, v.popUrl, v.anyChanged]))}\n`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(R3, "join.json"), JSON.stringify(result, null, 2));
process.stdout.write(`wrote ${path.join(R3, "join.json")}\n`);
