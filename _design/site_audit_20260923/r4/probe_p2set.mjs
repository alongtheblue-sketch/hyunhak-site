// critic 4회차 프로브 p2set (2026-09-23): c342aff 가 고친 P2 5건 검증. 대상 HEAD c342aff, 빌드 fc6cd2680c652190.
//   1 popup   팝업 측면 카드 네 모서리 radius, 활성 카드 위 두 모서리만, 하단바 접합(틈, 좌우 어긋남), 하단바 ←/→ 클릭 동작(MutationObserver),
//             넘김 순간 0/150/400ms 캡처(→ 키로 넘김, 전이 동결) + rAF 실시간 표본, 390 측면 숨김
//   2 caption 홈 #q2h 박스 아래 ~ #tiles 윗선 = 16px(s3) 인지, 검색창 ~ 캡션 간격 (1440/1024/390)
//   3 footer  footer .ft-legal a: 상자 폭, 글자 폭(Range), 좌우 빈칸, 높이, 줄바꿈 뒤 행 정렬 (index/faq/support/terms/programs/guidebook/join/login × 1440/390)
//             + 기준선: 87106d8 판 index.html 을 route 로 서빙해 수리 전 「결제」 빈칸을 같은 방식으로 잰다
//   4 join    가입 약관 행 .view 세로 중심 - span 첫 줄 세로 중심 (320/390/1440), 같은 줄, 글자 클릭 토글, .view 48x48. r3/join.json 과 대조
//   5 empty   검색 0건 p.empty 안 링크 탭 높이와 줄바꿈 (1440/1024/390/320)
// 캡처 시각 고정 방식: 0/150/400ms 는 실시간 스크린샷 지연(수십~수백 ms)이 끼지 않도록 넘김(→ 키) 직후 .pdim 안 CSS 전이(Web Animations)를
//   pause 하고 currentTime 을 t 로 세운 뒤 찍는다. 실시간 전개는 rAF 표본(별도 컨텍스트, 700ms)으로 따로 잰다.
// 사용: node _design/site_audit_20260923/r4/probe_p2set.mjs [popup|caption|footer|join|empty|all]   → r4/p2set.json (구획별 병합), r4/shots/*.png
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "../../..");
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const OUT = path.join(HERE, "p2set.json");
const STOP = path.join(HERE, ".wf_stop");
const BASE = "http://localhost:8092/";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const UNSTICK = "nav.fix{visibility:hidden!important} header,.hd,.r2-hd{position:static!important}";
const which = process.argv[2] || "all";
const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
result.meta = { head: execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]).toString().trim(), at: new Date().toISOString() };
const shots = new Set(result.shots || []);
const save = () => { result.shots = [...shots]; fs.writeFileSync(OUT, JSON.stringify(result, null, 2)); };
const stopped = () => fs.existsSync(STOP);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function open(url, w, h, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opt.dsf || 1, locale: "ko-KR" });
  if (opt.route) await ctx.route(opt.route.url, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: opt.route.body }));
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  if (opt.waitPopup) await page.waitForSelector(".pdim", { timeout: 20000 });
  await page.addStyleTag({ content: RV });
  await page.waitForTimeout(opt.settle ?? 900);
  if (opt.closePopup && (await page.$(".pdim"))) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  return { ctx, page };
}

// ───────── 1 팝업 ─────────
const POP = () => {
  const rad = (el) => { const s = getComputedStyle(el); return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map(parseFloat); };
  const R = (el) => { const b = el.getBoundingClientRect(); return { l: +b.left.toFixed(2), t: +b.top.toFixed(2), r: +b.right.toFixed(2), b: +b.bottom.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
  const bw = (el) => { const s = getComputedStyle(el); return { t: s.borderTopWidth, r: s.borderRightWidth, b: s.borderBottomWidth, l: s.borderLeftWidth, tc: s.borderTopColor, bc: s.borderBottomColor }; };
  const slots = [...document.querySelectorAll(".pdim .pslot")];
  return {
    n: slots.length, cur: document.querySelector("[data-ppop-cur]")?.textContent ?? null, vw: innerWidth,
    slots: slots.map((s) => {
      const pop = s.querySelector(":scope > .pop"), bar = s.querySelector(":scope > .pbar"), cs = getComputedStyle(s);
      const pr = pop.getBoundingClientRect();
      const o = { i: s.dataset.i, on: s.hasAttribute("data-on"), side: s.getAttribute("data-side"), d: s.style.getPropertyValue("--d") || null,
        opacity: cs.opacity, visibility: cs.visibility, pointerEvents: cs.pointerEvents, transform: cs.transform, slot: R(s), pop: R(pop), popRadius: rad(pop), popBg: getComputedStyle(pop).backgroundColor, popBorder: bw(pop),
        pfrOpacity: getComputedStyle(pop.querySelector(".pfr")).opacity, inert: pop.hasAttribute("inert"),
        inViewportPx: Math.max(0, Math.min(pr.right, innerWidth) - Math.max(pr.left, 0)) };
      if (bar) { const br = bar.getBoundingClientRect(); o.bar = { rect: R(bar), radius: rad(bar), border: bw(bar), gapTop: +(br.top - pr.bottom).toFixed(2), dLeft: +(br.left - pr.left).toFixed(2), dRight: +(br.right - pr.right).toFixed(2) }; }
      return o;
    }),
  };
};
function popVerdict(m) {
  const on = m.slots.filter((s) => s.on), side = m.slots.filter((s) => !s.on);
  const eq = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 0.01);
  return {
    oneActive: on.length === 1,
    activeTopOnly: on.every((s) => eq(s.popRadius, [4, 4, 0, 0])),
    sideAllFour: side.every((s) => eq(s.popRadius, [4, 4, 4, 4])),
    barOnActiveOnly: on.every((s) => !!s.bar) && side.every((s) => !s.bar),
    barRadius: on.map((s) => s.bar && s.bar.radius),
    barBottomOnly: on.every((s) => s.bar && eq(s.bar.radius, [0, 0, 4, 4])),
    barGap: on.map((s) => s.bar && s.bar.gapTop), barDL: on.map((s) => s.bar && s.bar.dLeft), barDR: on.map((s) => s.bar && s.bar.dRight),
    barJoinOk: on.every((s) => s.bar && Math.abs(s.bar.gapTop) < 0.5 && Math.abs(s.bar.dLeft) < 0.5 && Math.abs(s.bar.dRight) < 0.5),
  };
}
async function popupPart() {
  const out = {};
  // 1440 정지 상태
  {
    const { ctx, page } = await open("index.html", 1440, 900, { waitPopup: true });
    const m = await page.evaluate(POP);
    out.still1440 = { m, v: popVerdict(m) };
    const p = path.join(SHOTS, "popup_1440.png"); await page.screenshot({ path: p }); shots.add(p);
    log("popup 1440", JSON.stringify(out.still1440.v), m.slots.map((s) => `${s.i}:${s.on ? "on" : "side" + s.side} r=${s.popRadius} bg=${s.popBg}`).join(" | "));
    await ctx.close();
  }
  // 모서리 확대(DSF 3): 측면 카드 아래 두 모서리, 활성 카드와 하단바 접합 왼쪽
  {
    const { ctx, page } = await open("index.html", 1440, 900, { waitPopup: true, dsf: 3 });
    const m = await page.evaluate(POP);
    const side = m.slots.find((s) => !s.on), on = m.slots.find((s) => s.on);
    const crops = [];
    if (side) { const c = { x: side.pop.l - 6, y: side.pop.b - 24, width: 48, height: 30 }; const p = path.join(SHOTS, "popup_1440_side_corner_x3.png"); await page.screenshot({ path: p, clip: c }); shots.add(p); crops.push({ p, c }); }
    if (on && on.bar) { const c = { x: on.pop.l - 6, y: on.pop.b - 24, width: 60, height: 48 }; const p = path.join(SHOTS, "popup_1440_join_x3.png"); await page.screenshot({ path: p, clip: c }); shots.add(p); crops.push({ p, c }); }
    out.zoom = crops;
    await ctx.close();
  }
  // 하단바 ←/→ 클릭이 실제로 칸을 넘기는지(MutationObserver 로 data-on 변화 순서 기록). 1440/390, 실제 마우스 클릭.
  out.navClick = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page } = await open("index.html", w, h, { waitPopup: true });
    await page.evaluate(() => { window.__mut = []; new MutationObserver((ms) => ms.forEach((m) => window.__mut.push(`${m.target.dataset.i}:${m.attributeName}=${m.target.getAttribute(m.attributeName)}`))).observe(document.querySelector(".pstage"), { subtree: true, attributes: true, attributeFilter: ["data-on"] }); });
    const st = () => page.evaluate(() => ({ cur: document.querySelector(".pdim [data-ppop-cur]").textContent, onSlot: [...document.querySelectorAll(".pdim .pslot")].findIndex((s) => s.hasAttribute("data-on")), pause: document.querySelector("[data-ppop-pause]").textContent, focus: document.activeElement ? document.activeElement.tagName + "#" + (document.activeElement.id || "") : null, mut: window.__mut.splice(0) }));
    const r = { init: await st() };
    await page.click(".pdim [data-ppop-next]"); await page.waitForTimeout(150); r.nextClick = await st();
    await page.click(".pdim [data-ppop-prev]"); await page.waitForTimeout(150); r.prevClick = await st();
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(150); r.arrowKey = await st();
    if (w === 1440) { await page.waitForTimeout(600); await page.click(".pdim .pslot[data-side]", { position: { x: 30, y: 100 } }); await page.waitForTimeout(150); r.sideCardClick = await st(); }
    r.nextClickTurns = r.nextClick.cur !== r.init.cur;
    r.prevClickTurns = r.prevClick.cur !== r.nextClick.cur;
    out.navClick[w] = r;
    log(`popup navClick ${w}`, JSON.stringify(r));
    await ctx.close();
  }
  // 넘김 순간 0/150/400ms (전이 동결). 하단바 → 클릭은 위 navClick 처럼 칸이 되돌아와 넘김이 일어나지 않으므로, 넘김은 같은 go(cur+1) 경로인 → 키(document keydown)로 일으킨다.
  out.turn = {};
  for (const t of [0, 150, 400]) {
    const { ctx, page } = await open("index.html", 1440, 900, { waitPopup: true });
    const before = await page.evaluate(POP);
    const anims = await page.evaluate((t) => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      document.querySelectorAll(".pdim .pslot").forEach((s) => getComputedStyle(s).transform);
      const root = document.querySelector(".pdim");
      const list = document.getAnimations().filter((a) => a.effect && a.effect.target && root.contains(a.effect.target));
      list.forEach((a) => { a.pause(); a.currentTime = t; });
      return list.map((a) => ({ prop: a.transitionProperty || null, slot: a.effect.target.dataset ? a.effect.target.dataset.i : null, dur: a.effect.getTiming().duration, ct: a.currentTime }));
    }, t);
    await page.waitForTimeout(120);
    const m = await page.evaluate(POP);
    const p = path.join(SHOTS, `popup_turn_${t}.png`); await page.screenshot({ path: p }); shots.add(p);
    out.turn[t] = { beforeCur: before.cur, anims, m, v: popVerdict(m) };
    log(`popup turn ${t}ms`, "cur", before.cur, "→", m.cur, JSON.stringify(out.turn[t].v), m.slots.map((s) => `${s.i}:${s.on ? "on" : "side"} r=${s.popRadius} tf=${s.transform}`).join(" | "), "anims", JSON.stringify(anims));
    await ctx.close();
  }
  // 실시간 rAF 표본 700ms
  {
    const { ctx, page } = await open("index.html", 1440, 900, { waitPopup: true });
    await page.evaluate((POPsrc) => {
      const POPf = eval("(" + POPsrc + ")");   // 이 스크립트 안의 측정 함수 POP 소스(외부 입력 아님)를 페이지 안에서 매 프레임 부르려고 되살린다
      window.__samp = []; const t0 = performance.now();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      const f = () => { const m = POPf(); window.__samp.push({ t: +(performance.now() - t0).toFixed(1), slots: m.slots.map((s) => ({ i: s.i, on: s.on, r: s.popRadius, bar: s.bar ? { gap: s.bar.gapTop, dl: s.bar.dLeft, dr: s.bar.dRight, r: s.bar.radius } : null, tf: s.transform, bg: s.popBg })) }); if (performance.now() - t0 < 700) requestAnimationFrame(f); };
      f();
    }, POP.toString());
    await page.waitForTimeout(1000);
    const samp = await page.evaluate(() => window.__samp);
    const eq = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 0.01);
    const bad = samp.filter((f) => f.slots.some((s) => (s.on ? !(eq(s.r, [4, 4, 0, 0]) && s.bar && Math.abs(s.bar.gap) < 0.5 && Math.abs(s.bar.dl) < 0.5 && Math.abs(s.bar.dr) < 0.5 && eq(s.bar.r, [0, 0, 4, 4])) : !(eq(s.r, [4, 4, 4, 4]) && !s.bar))));
    const radiusSeq = {};
    for (const f of samp) for (const s of f.slots) { const k = s.i; const v = s.r.join(","); (radiusSeq[k] ||= []); if (radiusSeq[k].at(-1)?.v !== v) radiusSeq[k].push({ t: f.t, v, on: s.on }); }
    out.raf = { frames: samp.length, firstT: samp[0]?.t, lastT: samp.at(-1)?.t, badFrames: bad.length, radiusChanges: radiusSeq, maxAbsGap: Math.max(...samp.flatMap((f) => f.slots.filter((s) => s.bar).map((s) => Math.abs(s.bar.gap)))), maxAbsEdge: Math.max(...samp.flatMap((f) => f.slots.filter((s) => s.bar).map((s) => Math.max(Math.abs(s.bar.dl), Math.abs(s.bar.dr))))), sample0: samp[0], sampleMid: samp[Math.floor(samp.length / 2)], sampleLast: samp.at(-1) };
    log("popup raf frames", samp.length, "bad", bad.length, "radiusSeq", JSON.stringify(radiusSeq), "maxGap", out.raf.maxAbsGap, "maxEdge", out.raf.maxAbsEdge);
    await ctx.close();
  }
  // 390 측면 숨김
  {
    const { ctx, page } = await open("index.html", 390, 844, { waitPopup: true });
    const m = await page.evaluate(POP);
    out.still390 = { m, v: popVerdict(m), sideHidden: m.slots.filter((s) => !s.on).map((s) => ({ i: s.i, opacity: s.opacity, pointerEvents: s.pointerEvents, inViewportPx: s.inViewportPx, radius: s.popRadius })) };
    const p = path.join(SHOTS, "popup_390.png"); await page.screenshot({ path: p }); shots.add(p);
    log("popup 390", JSON.stringify(out.still390.v), JSON.stringify(out.still390.sideHidden));
    await ctx.close();
  }
  result.popup = out; save();
}

// ───────── 2 캡션 간격 ─────────
const CAP = () => {
  const R = (b) => ({ t: +b.top.toFixed(2), b: +b.bottom.toFixed(2), l: +b.left.toFixed(2), r: +b.right.toFixed(2), h: +b.height.toFixed(2) });
  const q = document.getElementById("q2h"), tiles = document.getElementById("tiles"), top = q.closest(".top"), search = top.querySelector(".search"), input = document.getElementById("q2"), label = top.querySelector("label[for=q2]"), q2n = document.getElementById("q2n");
  const qr = q.getBoundingClientRect(), tr = tiles.getBoundingClientRect(), sr = search.getBoundingClientRect();
  const rg = document.createRange(); rg.selectNodeContents(q); const qt = rg.getBoundingClientRect();
  const qcs = getComputedStyle(q), tcs = getComputedStyle(tiles), topcs = getComputedStyle(top);
  return {
    vw: innerWidth, caption: q.textContent.trim(), qBox: R(qr), qGlyph: R(qt), qMarginTop: qcs.marginTop, qMarginBottom: qcs.marginBottom, qLineHeight: qcs.lineHeight, qFontSize: qcs.fontSize,
    tilesTop: +tr.top.toFixed(2), tilesBorderTop: `${tcs.borderTopWidth} ${tcs.borderTopStyle}`, tilesMarginTop: tcs.marginTop,
    topDisplay: topcs.display, topPaddingBottom: topcs.paddingBottom, topBottom: +top.getBoundingClientRect().bottom.toFixed(2),
    searchBox: R(sr), inputBox: R(input.getBoundingClientRect()), labelBox: label ? R(label.getBoundingClientRect()) : null, q2nBox: R(q2n.getBoundingClientRect()),
    gapCaptionBoxToTiles: +(tr.top - qr.bottom).toFixed(2), gapCaptionGlyphToTiles: +(tr.top - qt.bottom).toFixed(2),
    gapSearchToCaptionBox: +(qr.top - sr.bottom).toFixed(2), gapSearchToCaptionGlyph: +(qt.top - sr.bottom).toFixed(2),
    captionBelowSearch: qr.top >= sr.bottom - 0.5,
  };
};
async function captionPart() {
  const out = {};
  for (const w of [1440, 1024, 390]) {
    const { ctx, page } = await open("index.html", w, 900, { closePopup: true });
    await page.evaluate(() => document.getElementById("find").scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(200);
    const m = await page.evaluate(CAP);
    m.pass16 = Math.abs(m.gapCaptionBoxToTiles - 16) < 0.5;
    out[w] = m;
    log(`caption ${w}`, "box→tiles", m.gapCaptionBoxToTiles, "glyph→tiles", m.gapCaptionGlyphToTiles, "search→box", m.gapSearchToCaptionBox, "search→glyph", m.gapSearchToCaptionGlyph, "mb", m.qMarginBottom, "lh", m.qLineHeight, "top", m.topDisplay);
    await ctx.close();
  }
  result.caption = out; save();
}

// ───────── 3 푸터 법적 고지 ─────────
const FT = () => {
  const nav = document.querySelector("footer .ft-legal");
  const footer = document.querySelector("footer");
  const base = { footerPresent: !!footer, footerClass: footer ? footer.className : null, bodyClass: document.body.className, legalPresent: !!nav };
  if (!nav) return base;
  const ncs = getComputedStyle(nav);
  const links = [...nav.querySelectorAll("a")].map((a) => {
    const b = a.getBoundingClientRect(), cs = getComputedStyle(a);
    const rg = document.createRange(); rg.selectNodeContents(a);
    const rects = [...rg.getClientRects()].filter((r) => r.width > 0);
    const t = rg.getBoundingClientRect();
    const lines = []; for (const r of rects.sort((x, y) => x.top - y.top)) { if (!lines.length || r.top >= lines.at(-1).b - 2) lines.push({ t: r.top, b: r.bottom }); else lines.at(-1).b = Math.max(lines.at(-1).b, r.bottom); }
    const lb = +(t.left - b.left).toFixed(2), rb = +(b.right - t.right).toFixed(2);
    return { text: a.textContent.trim(), boxL: +b.left.toFixed(2), boxT: +b.top.toFixed(2), boxW: +b.width.toFixed(2), boxH: +b.height.toFixed(2), textW: +t.width.toFixed(2), textLines: lines.length,
      leftBlank: lb, rightBlank: rb, diff: +(lb - rb).toFixed(2), centered: Math.abs(lb - rb) <= 1, h48: b.height >= 48, w48: b.width >= 48,
      display: cs.display, justify: cs.justifyContent, minW: cs.minWidth, padL: cs.paddingLeft, padR: cs.paddingRight };
  });
  const rows = [];
  for (const l of links) { const r = rows.find((x) => Math.abs(x.top - l.boxT) < 1); if (r) r.items.push(l); else rows.push({ top: l.boxT, items: [l] }); }
  const nb = nav.getBoundingClientRect();
  return { ...base, nav: { l: +nb.left.toFixed(2), r: +nb.right.toFixed(2), w: +nb.width.toFixed(2), justify: ncs.justifyContent, gap: `${ncs.rowGap} / ${ncs.columnGap}`, wrap: ncs.flexWrap },
    links, rows: rows.map((r) => ({ top: r.top, n: r.items.length, texts: r.items.map((x) => x.text), firstLeft: r.items[0].boxL, leftFromNav: +(r.items[0].boxL - nb.left).toFixed(2), lastRight: +(r.items.at(-1).boxL + r.items.at(-1).boxW).toFixed(2), rightSlack: +(nb.right - (r.items.at(-1).boxL + r.items.at(-1).boxW)).toFixed(2), height: Math.max(...r.items.map((x) => x.boxH)) })),
    allCentered: links.every((l) => l.centered), allH48: links.every((l) => l.h48), maxAbsDiff: Math.max(...links.map((l) => Math.abs(l.diff))) };
};
async function footerPart() {
  const out = {};
  const pages = ["index.html", "faq.html", "support.html", "terms.html", "programs/guidebook.html", "join.html", "login.html"];
  for (const u of pages) {
    for (const w of [1440, 390]) {
      const { ctx, page } = await open(u, w, 900, { closePopup: true });
      await page.addStyleTag({ content: UNSTICK });
      const m = await page.evaluate(FT);
      out[`${u}@${w}`] = m;
      if (!m.legalPresent) { log(`footer ${u}@${w} legal=absent footer=${m.footerClass}`); await ctx.close(); continue; }
      const pay = m.links.find((l) => l.text === "결제");
      log(`footer ${u}@${w}`, "rows", m.rows.map((r) => `[${r.texts.join(",")}] L${r.leftFromNav}`).join(" "), "maxDiff", m.maxAbsDiff, "h48", m.allH48, "결제", pay ? `${pay.boxW}/${pay.textW} L${pay.leftBlank} R${pay.rightBlank}` : "-", "lines", m.links.map((l) => l.textLines).join(""));
      if (u === "index.html") {
        await page.evaluate(() => document.querySelector("footer .ft-legal").scrollIntoView({ block: "center", behavior: "instant" }));
        await page.waitForTimeout(300);
        const nb = await page.evaluate(() => { const b = document.querySelector("footer .ft-legal").getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
        const clip = { x: Math.max(0, nb.x - 16), y: Math.max(0, nb.y - 16), width: Math.min(w - Math.max(0, nb.x - 16), nb.w + 32), height: nb.h + 32 };
        const p = path.join(SHOTS, `footer_index_${w}.png`); await page.screenshot({ path: p, clip }); shots.add(p);
        await page.addStyleTag({ content: "footer .ft-legal a{outline:1px solid #d33;outline-offset:-1px}" });
        const p2 = path.join(SHOTS, `footer_index_${w}_boxes.png`); await page.screenshot({ path: p2, clip }); shots.add(p2);
      }
      await ctx.close();
    }
  }
  // 기준선: 수리 전(87106d8) index.html 을 같은 URL 로 서빙
  const pre = execFileSync("git", ["-C", REPO, "show", "87106d8:index.html"], { maxBuffer: 64 << 20 }).toString();
  out.baseline_87106d8 = {};
  for (const w of [1440, 390]) {
    const { ctx, page } = await open("index.html", w, 900, { closePopup: true, route: { url: BASE + "index.html", body: pre } });
    const m = await page.evaluate(FT);
    const pay = m.links && m.links.find((l) => l.text === "결제");
    out.baseline_87106d8[w] = { justify: m.links && m.links[0].justify, pay, maxAbsDiff: m.maxAbsDiff, links: m.links && m.links.map((l) => ({ text: l.text, boxW: l.boxW, textW: l.textW, leftBlank: l.leftBlank, rightBlank: l.rightBlank })) };
    log(`footer baseline 87106d8 index@${w}`, "justify", out.baseline_87106d8[w].justify, "결제", pay ? `${pay.boxW}/${pay.textW} L${pay.leftBlank} R${pay.rightBlank}` : "-");
    await ctx.close();
  }
  result.footer = out; save();
}

// ───────── 4 가입 약관 행 ─────────
const JOIN = () => {
  // 줄 수 = 글자 노드의 줄 상자만 모아 센다(Range 가 요소 상자(small) 전체를 한 사각형으로 돌려주는 것을 피한다)
  const lines = (el) => { const rs = []; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (!n.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); rs.push(...[...rg.getClientRects()].filter((r) => r.width > 0)); } rs.sort((a, b) => a.top - b.top); const L = []; for (const r of rs) { if (!L.length || r.top >= L.at(-1).b - 2) L.push({ t: r.top, b: r.bottom }); else { L.at(-1).t = Math.min(L.at(-1).t, r.top); L.at(-1).b = Math.max(L.at(-1).b, r.bottom); } } return L; };
  return [...document.querySelectorAll("#joinForm .check")].map((row) => {
    const label = row.querySelector("label.check-choice"), cb = label.querySelector("input[type=checkbox]"), span = label.querySelector(":scope > span"), view = row.querySelector(".view");
    const tw = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
    const tn = tw.nextNode(); const lead = tn.nodeValue.search(/\S/);
    const rg = document.createRange(); rg.setStart(tn, lead); rg.setEnd(tn, lead + 1); const fc = rg.getBoundingClientRect();
    const rg2 = document.createRange(); rg2.selectNodeContents(tn); const first = [...rg2.getClientRects()].filter((x) => x.width > 0 && Math.abs(x.top - fc.top) < 1);
    const fl = { t: Math.min(...first.map((x) => x.top)), b: Math.max(...first.map((x) => x.bottom)), l: Math.min(...first.map((x) => x.left)) };
    const cbb = cb.getBoundingClientRect(), spb = span.getBoundingClientRect(), rb = row.getBoundingClientRect(), lb = label.getBoundingClientRect();
    const cbMid = (cbb.top + cbb.bottom) / 2;
    const sm = span.querySelector("small");
    const o = { id: cb.id, spanLines: lines(span).length, smallLines: sm ? lines(sm).length : 0, smallDisplay: sm ? getComputedStyle(sm).display : null, rowH: +rb.height.toFixed(2), rowTop: +rb.top.toFixed(2), labelTop: +lb.top.toFixed(2), firstLine: { t: +fl.t.toFixed(2), b: +fl.b.toFixed(2) },
      cb: { l: +cbb.left.toFixed(2), r: +cbb.right.toFixed(2), t: +cbb.top.toFixed(2), b: +cbb.bottom.toFixed(2) },
      sameLine: cbMid >= fl.t && cbMid <= fl.b && spb.left > cbb.right, labelWrap: getComputedStyle(label).flexWrap, rowOverflowX: row.scrollWidth > row.clientWidth };
    if (view) { const vb = view.getBoundingClientRect(); o.view = { w: +vb.width.toFixed(2), h: +vb.height.toFixed(2), t: +vb.top.toFixed(2), alignSelf: getComputedStyle(view).alignSelf, ge48: vb.width >= 48 && vb.height >= 48, dCenter: +((vb.top + vb.bottom) / 2 - (fl.t + fl.b) / 2).toFixed(2), viewTopMinusRowContentTop: +(vb.top - (rb.top + parseFloat(getComputedStyle(row).paddingTop))).toFixed(2), rightOfSpan: vb.left >= spb.right - 0.5, sameRow: vb.top < lb.bottom && vb.bottom > lb.top }; }
    return o;
  });
};
async function joinPart() {
  const r3 = JSON.parse(fs.readFileSync(path.join(HERE, "../r3/join.json"), "utf8"));
  const out = {};
  for (const w of [320, 390, 1440]) {
    const { ctx, page } = await open("join.html", w, 900, { settle: 1200 });
    const rows = await page.evaluate(JOIN);
    const prev = Object.fromEntries((r3.widths[w]?.rows || []).map((r) => [r.id, r.view ? r.view.centerYMinusFirstLineCenterY : null]));
    for (const r of rows) if (r.view) { r.view.r3dCenter = prev[r.id] ?? null; r.view.improvedOrSame = r.view.r3dCenter == null ? null : Math.abs(r.view.dCenter) <= Math.abs(r.view.r3dCenter) + 0.01; }
    // 글자 클릭 토글(각 행 span 첫 텍스트 가운데 글자, 두 번)
    const ids = rows.map((r) => r.id);
    const clicks = [];
    for (const id of ids) {
      await page.$$eval("#joinForm .check input[type=checkbox]", (els) => els.forEach((e) => { e.checked = false; }));
      await page.evaluate((id) => document.getElementById(id).closest("label").querySelector(":scope > span").scrollIntoView({ block: "center", behavior: "instant" }), id);
      await page.waitForTimeout(400);
      const locate = () => page.evaluate((id) => { const cb = document.getElementById(id); const span = cb.closest("label").querySelector(":scope > span"); const tn = [...span.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim()); const lead = tn.nodeValue.search(/\S/); let k = lead + Math.floor(tn.nodeValue.trim().length / 2); if (!tn.nodeValue[k].trim()) k -= 1; const rg = document.createRange(); rg.setStart(tn, k); rg.setEnd(tn, k + 1); const b = rg.getBoundingClientRect(); const x = b.left + b.width / 2, y = b.top + b.height / 2; const hit = document.elementFromPoint(x, y); return { x, y, ch: tn.nodeValue[k], hitInSpan: !!(hit && span.contains(hit)) }; }, id);
      const p1 = await locate(); await page.mouse.click(p1.x, p1.y); await page.waitForTimeout(80);
      const a1 = await page.evaluate((id) => document.getElementById(id).checked, id);
      await page.evaluate(() => window.getSelection().removeAllRanges()); await page.waitForTimeout(700);
      const p2 = await locate(); await page.mouse.click(p2.x, p2.y); await page.waitForTimeout(80);
      const a2 = await page.evaluate((id) => document.getElementById(id).checked, id);
      clicks.push({ id, ch: p1.ch, hitInSpan: p1.hitInSpan, on: a1 === true, off: a2 === false });
    }
    // .view 클릭은 체크 상태를 바꾸지 않는다(이동 차단)
    await page.evaluate(() => document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest(".view")) e.preventDefault(); }));
    const viewClicks = [];
    for (const v of await page.$$("#joinForm .check .view")) {
      await page.$$eval("#joinForm .check input[type=checkbox]", (els) => els.forEach((e) => { e.checked = false; }));
      await v.scrollIntoViewIfNeeded();
      const before = await page.$$eval("#joinForm .check input[type=checkbox]", (els) => els.map((e) => e.checked).join(""));
      await v.click(); await page.waitForTimeout(200);
      const after = await page.$$eval("#joinForm .check input[type=checkbox]", (els) => els.map((e) => e.checked).join(""));
      viewClicks.push({ row: await v.evaluate((x) => x.closest(".check").querySelector("input").id), changed: before !== after });
    }
    const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    out[w] = { rows, clicks, viewClicks, docOverflow };
    log(`join ${w}`, rows.map((r) => `${r.id}:L${r.spanLines}/s${r.smallLines} same=${r.sameLine}${r.view ? ` d=${r.view.dCenter}(r3 ${r.view.r3dCenter}) ${r.view.w}x${r.view.h} ${r.view.alignSelf}` : ""}`).join(" | "), "clicks", clicks.map((c) => `${c.id}:${c.on && c.off}`).join(","), "view", viewClicks.map((c) => `${c.row}:${c.changed}`).join(","), "overflow", docOverflow);
    if (w === 320 || w === 390) {
      await page.addStyleTag({ content: UNSTICK });
      await page.evaluate(() => { const el = document.querySelector("section.step.terms"); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 72, behavior: "instant" }); });
      await page.$$eval("#joinForm .check input[type=checkbox]", (els) => els.forEach((e) => { e.checked = false; }));
      await page.waitForTimeout(300);
      const p = path.join(SHOTS, `join_${w}.png`); await page.locator("section.step.terms").screenshot({ path: p }); shots.add(p);
    }
    await ctx.close();
  }
  result.join = out; save();
}

// ───────── 5 검색 0건 ─────────
const EMPTY = () => {
  const box = document.getElementById("tiles"), p = box.querySelector("p.empty");
  if (!p) return { present: false };
  const lineTexts = (root) => { const out = []; const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { for (let i = 0; i < n.nodeValue.length; i++) { const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1); const b = rg.getBoundingClientRect(); if (!b.width && !b.height) continue; const L = out.find((x) => Math.abs(x.t - b.top) < 4); if (L) L.s += n.nodeValue[i]; else out.push({ t: b.top, s: n.nodeValue[i] }); } } return out.sort((a, b) => a.t - b.t).map((x) => x.s.trim()).filter(Boolean); };
  const pb = p.getBoundingClientRect(), bb = box.getBoundingClientRect();
  const links = [...p.querySelectorAll("a")].map((a) => { const b = a.getBoundingClientRect(); const cs = getComputedStyle(a); return { text: a.textContent.trim(), w: +b.width.toFixed(2), h: +b.height.toFixed(2), l: +b.left.toFixed(2), r: +b.right.toFixed(2), h48: b.height >= 48, lines: lineTexts(a), display: cs.display, wordBreak: cs.wordBreak, whiteSpace: cs.whiteSpace }; });
  return { present: true, vw: innerWidth, pW: +pb.width.toFixed(2), tilesW: +bb.width.toFixed(2), fullWidth: Math.abs(pb.width - bb.width) < 1, gridColumn: getComputedStyle(p).gridColumn, pLines: lineTexts(p), pWordBreak: getComputedStyle(p).wordBreak, links, overflowX: p.scrollWidth > p.clientWidth || document.documentElement.scrollWidth > innerWidth };
};
async function emptyPart() {
  const out = {};
  for (const w of [1440, 1024, 390, 320]) {
    const { ctx, page } = await open("index.html", w, 900, { closePopup: true });
    await page.fill("#q2", "zzqx");
    await page.waitForTimeout(200);
    const m = await page.evaluate(EMPTY);
    out[w] = m;
    log(`empty ${w}`, JSON.stringify({ full: m.fullWidth, pW: m.pW, tilesW: m.tilesW, pLines: m.pLines, links: m.links && m.links.map((l) => [l.text, l.w, l.h, l.lines]) }));
    if (w === 320) {
      await page.addStyleTag({ content: UNSTICK });
      await page.evaluate(() => document.getElementById("tiles").scrollIntoView({ block: "center", behavior: "instant" }));
      await page.waitForTimeout(250);
      const p = path.join(SHOTS, "p2set_empty_320.png"); await page.locator("#find .find").screenshot({ path: p }); shots.add(p);
    }
    await ctx.close();
  }
  result.empty = out; save();
}

const parts = { popup: popupPart, caption: captionPart, footer: footerPart, join: joinPart, empty: emptyPart };
for (const [k, fn] of Object.entries(parts)) {
  if (which !== "all" && which !== k) continue;
  if (stopped()) { log("STOP seen before", k); result.stopped = true; break; }
  await fn();
}
// 전 구획을 한 브라우저로 돈 뒤 browser.close() 가 돌아오지 않은 사례(09-23 all 실행, 자료는 구획마다 저장된 뒤)가 있어 5초 상한을 둔다
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
save();
log("wrote", OUT);
process.exit(0);
