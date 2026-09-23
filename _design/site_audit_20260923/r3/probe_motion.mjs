// critic 3회차 프로브 motion (2026-09-23): 87106d8 P1-1 수리 검증.
// 홈 팝업 무대 정지 단추 [data-ppop-pause] 가 모션 감소(reduce) 사용자에게 처음부터 「재생」 aria-pressed="true" 인지,
// 자동 넘김(8초)이 모드별로 기대대로 도는지/멈추는지, Tab 초점 순서에서 단추가 몇 번째인지 잰다.
// 로컬 8092 정적 서버 + 8799 모킹 API 전제. 컨텍스트마다 새로 연다(세션당 1회 팝업).
// 칸 변화는 페이지 안 MutationObserver 가 performance.now() 로 기록한다(폴링 오차 없음).
// 클릭 뒤 판정은 입력 경로 둘로 잰다: (a) 마우스 클릭 후 포인터를 딤(.pback)으로 옮김 (b) 키보드(단추에 초점 + Enter).
// 마우스를 단추 위에 그대로 두면 무대 호버 정지 규칙(hover=true)이 따로 걸리므로 그 경우는 관찰값으로만 기록한다.
// 사용: node _design/site_audit_20260923/r3/probe_motion.mjs [1440|390|all]
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const URL_HOME = "http://localhost:8092/index.html";
const WATCH_MS = 9500;
const which = process.argv[2] || "all";
const WIDTHS = which === "all" ? [[1440, 900], [390, 844]] : which === "1440" ? [[1440, 900]] : [[390, 844]];
const STOP = path.join(HERE, ".wf_stop");

const INIT = () => {
  window.__pp = { open: null, log: [] };
  const mo = new MutationObserver(() => {
    if (window.__pp.open === null && document.querySelector(".pdim")) window.__pp.open = performance.now();
    const c = document.querySelector("[data-ppop-cur]");
    if (c) {
      const v = c.textContent;
      const L = window.__pp.log;
      if (!L.length || L[L.length - 1].v !== v) L.push({ t: performance.now(), v });
    }
  });
  mo.observe(document, { subtree: true, childList: true, characterData: true });
};

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function open(w, h, rm) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", reducedMotion: rm });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  await page.goto(URL_HOME, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(".pdim", { timeout: 20000 });
  await page.addStyleTag({ content: ".rv{opacity:1!important;transform:none!important;transition:none!important}" });
  await page.waitForTimeout(400);
  return { ctx, page };
}

async function state(page) {
  return page.evaluate(() => {
    const b = document.querySelector("[data-ppop-pause]");
    const c = document.querySelector("[data-ppop-cur]");
    const cnt = document.querySelector(".pcnt");
    const r = b ? b.getBoundingClientRect() : null;
    const a = document.activeElement;
    return {
      now: performance.now(),
      openAt: window.__pp.open,
      reduceMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
      N: document.querySelectorAll(".pdim .pslot").length,
      pcnt: cnt ? cnt.textContent : null,
      btnExists: !!b,
      btnText: b ? b.textContent : null,
      btnPressed: b ? b.getAttribute("aria-pressed") : null,
      btnRect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      btnInViewport: r ? r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth : null,
      cur: c ? c.textContent : null,
      active: a ? (a.tagName + (a.className ? "." + String(a.className).split(" ").join(".") : "") + (a.hasAttribute && a.hasAttribute("data-ppop-pause") ? "[data-ppop-pause]" : "")) : null,
    };
  });
}

// since 이후(페이지 시계 ms)에 기록된 칸 변화
async function changesSince(page, since) {
  return page.evaluate((s) => window.__pp.log.filter((e) => e.t > s).map((e) => ({ dt: Math.round(e.t - s), v: e.v })), since);
}

async function watch(page, ms) {
  const s0 = await state(page);
  await page.waitForTimeout(ms);
  const s1 = await state(page);
  const ch = await changesSince(page, s0.now);
  return { from: s0.cur, to: s1.cur, elapsedMs: Math.round(s1.now - s0.now), changes: ch };
}

// 딤(.pback)만 맞는 점을 찾아 포인터를 옮긴다(무대 mouseleave → hover=false)
async function pointerToBackdrop(page) {
  const pt = await page.evaluate(() => {
    const cands = [[4, 4], [innerWidth - 4, 4], [4, innerHeight - 4], [innerWidth - 4, innerHeight - 4], [Math.round(innerWidth / 2), 4], [Math.round(innerWidth / 2), innerHeight - 4]];
    for (const [x, y] of cands) {
      const el = document.elementFromPoint(x, y);
      if (el && el.hasAttribute("data-ppop-back")) return { x, y };
    }
    return null;
  });
  if (pt) await page.mouse.move(pt.x, pt.y, { steps: 4 });
  return pt;
}

async function tabOrder(page, max = 20) {
  const seq = [];
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press("Tab");
    const s = await state(page);
    seq.push({ i, active: s.active, btnText: s.btnText, btnPressed: s.btnPressed });
    if (s.active && s.active.includes("[data-ppop-pause]")) return { reachedAt: i, seq };
  }
  return { reachedAt: null, seq };
}

const out = { run: new Date().toISOString(), url: URL_HOME, autoMsExpected: 8000, watchMs: WATCH_MS, widths: {} };
for (const [w, h] of WIDTHS) {
  if (fs.existsSync(STOP)) { out.stopped = true; break; }
  const R = (out.widths[w] = {});

  // ── 1a. reduce + 마우스 클릭 ──
  {
    const { ctx, page } = await open(w, h, "reduce");
    const s0 = await state(page);
    await page.screenshot({ path: path.join(SHOTS, `popup_reduce_${w}.png`) });
    const idle = await watch(page, WATCH_MS);
    await page.click("[data-ppop-pause]");
    const s1 = await state(page);
    const hoverStay = await watch(page, WATCH_MS);   // 포인터가 단추(무대) 위에 남은 채: 호버 정지 규칙 관찰
    const pt = await pointerToBackdrop(page);
    const s2 = await state(page);
    const afterLeave = await watch(page, WATCH_MS);
    R.reduce_mouse = { s0, idle, s1_afterClick: s1, hoverStay, backdropPoint: pt, s2_afterLeave: s2, afterLeave };
    await ctx.close();
  }
  // ── 1b. reduce + 키보드(초점 + Enter) ──
  {
    const { ctx, page } = await open(w, h, "reduce");
    const s0 = await state(page);
    await page.focus("[data-ppop-pause]");
    await page.keyboard.press("Enter");
    const s1 = await state(page);
    const after = await watch(page, WATCH_MS);
    R.reduce_kbd = { s0, s1_afterEnter: s1, after };
    await ctx.close();
  }
  // ── 2a. no-preference + 마우스 클릭 ──
  {
    const { ctx, page } = await open(w, h, "no-preference");
    const s0 = await state(page);
    const waitLeft = Math.max(0, Math.round(s0.openAt + WATCH_MS - s0.now));
    await page.waitForTimeout(waitLeft);
    const sA = await state(page);
    const autoFromOpen = await changesSince(page, s0.openAt);
    await page.click("[data-ppop-pause]");
    const s1 = await state(page);
    const pt = await pointerToBackdrop(page);   // 호버 정지와 분리: 포인터를 무대 밖으로 뺀 뒤에도 고정인지
    const s2 = await state(page);
    const hold = await watch(page, WATCH_MS);
    R.nopref_mouse = { s0, openToCheckMs: Math.round(sA.now - s0.openAt), sA, autoFromOpen, s1_afterClick: s1, backdropPoint: pt, s2_afterLeave: s2, hold };
    await ctx.close();
  }
  // ── 2b. no-preference + 키보드 ──
  {
    const { ctx, page } = await open(w, h, "no-preference");
    const s0 = await state(page);
    const waitLeft = Math.max(0, Math.round(s0.openAt + WATCH_MS - s0.now));
    await page.waitForTimeout(waitLeft);
    const sA = await state(page);
    const autoFromOpen = await changesSince(page, s0.openAt);
    await page.focus("[data-ppop-pause]");
    const sF = await state(page);
    await page.keyboard.press("Enter");
    const s1 = await state(page);
    const hold = await watch(page, WATCH_MS);
    R.nopref_kbd = { s0, sA, autoFromOpen, s_afterFocus: sF, s1_afterEnter: s1, hold };
    await ctx.close();
  }
  // ── 3. Tab 초점 순서 (모드별 새 컨텍스트) ──
  for (const rm of ["reduce", "no-preference"]) {
    const { ctx, page } = await open(w, h, rm);
    const s0 = await state(page);
    const t = await tabOrder(page);
    R["tab_" + rm] = { s0, ...t };
    await ctx.close();
  }
  process.stdout.write(`${w} done\n`);
}
await browser.close();
fs.writeFileSync(path.join(HERE, "motion.json"), JSON.stringify(out, null, 2));
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
