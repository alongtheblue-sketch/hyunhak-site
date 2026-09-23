// 반증 6회차 (동작과 접근성 렌즈, 2026-09-23): 3d2ada3(HEAD) 대 94f577b(라이브) 팝업 무대 동작 대조.
//   판 = head(8092 서버가 내는 3d2ada3 그대로) / old(assets/app.js, assets/base.css 두 파일만 git show 94f577b 내용으로 route).
//   A focus   첫 초점(activeElement, CDP 초점 노드 역할과 이름과 modal), 초점 윤곽, 첫 Tab, 첫 Shift+Tab, 대화상자 밖 초점 복귀
//   B kscroll 넘치는 활성 카드(짧은 화면, 확대 200% 상당)에서 첫 Tab 전 ArrowDown / PageDown / Space 가 카드를 스크롤하는지
//   C barfocus 하단바 정지 단추에 초점을 둔 채 재생: 자동 넘김 뒤 초점 자리, 그 자리에서 Enter 로 다시 멈출 수 있는지
//   D pin     하단바 안 각 조작에 초점(focusin) 또는 pointerdown 이 들어올 때 벨트 정지 여부(정지 단추 자신은 제외)
//   E swipe   390 터치 스와이프를 하단바 위 여러 점에서 시작(CDP touch): 넘김 수, 닫힘, 체크, 클릭 발생
//   F touch   390 터치 재개(94f577b 수리): 정지→재생, → 탭 뒤 재생, 하단바 빈 곳 탭 뒤 재생 → 다음 넘김까지 ms
//   G slit    접합 슬릿 상태에서 카드와 하단바 사이 hit-test(0.1px 간격) 에 딤(.pback)이 잡히는지
//   H ax      자동 넘김 전후 CDP 초점 노드와 활성 제목 노드 상태, live 영역 수
//   I tiny    아주 낮은 화면(568x320, 375x300, 320x256 등)에서 하단바, 닫기, 정지, ←/→ 가 화면 안이고 눌리는지(head 대 old)
// 사용: node refute_behavior.mjs [A|B|C|D|E|F|G|H|I|all] (쉼표로 여러 구획) → r6/refute_behavior.json
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "../../..");
const OUT = path.join(HERE, "refute_behavior.json");
const STOP = path.join(HERE, ".wf_stop");
const BASE = "http://localhost:8092/";
const APIB = "http://localhost:8799";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const NOTICE3 = { items: [{ id: "ntc_probe_n3", title: "프로브 공지: 세 장 순환 확인용 카드", body_md: "세 장 순환과 좌우 측면 카드 클릭을 재려고 route 로 더한 공지입니다." }] };
const which = (process.argv[2] || "all").split(",");
const want = (k) => which.includes("all") || which.includes(k);
const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
const stopped = () => fs.existsSync(STOP);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
const git = (spec) => execFileSync("git", ["-C", REPO, "show", spec], { maxBuffer: 64 << 20 });
const OLD = { "assets/app.js": git("94f577b:assets/app.js"), "assets/base.css": git("94f577b:assets/base.css") };
{
  const served = {};
  for (const f of ["assets/app.js", "assets/base.css"]) {
    const live = Buffer.from(await (await fetch(BASE + f)).arrayBuffer());
    served[f] = { served: sha(live), head: sha(git("HEAD:" + f)), old94f577b: sha(OLD[f]) };
  }
  result.meta = { head: execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]).toString().trim(), at: new Date().toISOString(), served };
  log("meta", JSON.stringify(result.meta));
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
const INIT = () => {
  window.__cur = []; window.__openT = null; window.__clicks = []; let last;
  const rec = () => {
    const d = document.querySelector(".pdim");
    if (d && window.__openT === null) window.__openT = +performance.now().toFixed(1);
    const c = document.querySelector(".pdim [data-ppop-cur]");
    const v = c ? c.textContent : d ? "(n1)" : "(closed)";
    if (v !== last) { last = v; window.__cur.push({ t: +performance.now().toFixed(1), v }); }
  };
  document.addEventListener("DOMContentLoaded", () => new MutationObserver(rec).observe(document.body, { childList: true, subtree: true, characterData: true }));
  document.addEventListener("click", (e) => window.__clicks.push({ t: +performance.now().toFixed(1), el: e.target.tagName + "." + (typeof e.target.className === "string" ? e.target.className : "") }), true);
};
async function open(ver, w, h, o = {}) {
  const co = { viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", reducedMotion: o.reduce ? "reduce" : "no-preference" };
  if (o.touch) Object.assign(co, { hasTouch: true, isMobile: true });
  const ctx = await browser.newContext(co);
  await ctx.addInitScript(INIT);
  if (o.notices) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(o.notices) }));
  if (ver === "old") for (const [f, body] of Object.entries(OLD)) await ctx.route(BASE + f, (r) => r.fulfill({ status: 200, contentType: f.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8", body }));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  await page.goto(BASE + (o.url || "index.html"), { waitUntil: "networkidle", timeout: 30000 }).catch((e) => errors.push("goto " + e.message));
  await page.addStyleTag({ content: RV });
  await page.waitForSelector(".pdim", { timeout: 20000 });
  await page.waitForTimeout(o.settle ?? 600);
  return { ctx, page, errors };
}
const S = () => {
  const root = document.querySelector(".pdim");
  if (!root) return { open: false };
  const ae = document.activeElement, cs = ae ? getComputedStyle(ae) : null;
  const slots = [...root.querySelectorAll(".pslot")], on = root.querySelector(".pslot[data-on]"), pop = on && on.querySelector(":scope > .pop");
  const pb = root.querySelector("[data-ppop-pause]"), cur = root.querySelector("[data-ppop-cur]"), mute = root.querySelector("[data-ppop-mute-all]");
  const d = (e) => (e ? e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).join(".") : "") + (e.getAttribute && e.getAttribute("aria-label") ? "[" + e.getAttribute("aria-label") + "]" : "") : null);
  return {
    open: true, cur: cur ? +cur.textContent : null, pause: pb ? pb.textContent : null, muted: mute ? mute.checked : null,
    ae: d(ae), aeText: ae ? (ae.textContent || "").trim().slice(0, 24) : null, aeIsRoot: ae === root, aeInBar: !!ae && !!ae.closest && !!ae.closest(".pbar"), aeInActive: !!on && on.contains(ae), aeInInert: !!(ae && ae.closest && ae.closest("[inert]")),
    aeOutline: cs ? cs.outlineStyle + " " + cs.outlineWidth : null, aeFocusVisible: !!ae && ae.matches(":focus-visible"),
    pop: pop ? { scrollTop: pop.scrollTop, scrollH: pop.scrollHeight, clientH: pop.clientHeight, overflows: pop.scrollHeight > pop.clientHeight + 1 } : null,
    onIdx: slots.indexOf(on),
  };
};
const st = (p) => p.evaluate(S);
const pnow = (p) => p.evaluate(() => +performance.now().toFixed(1));
const curLog = (p) => p.evaluate(() => window.__cur.filter((e) => /^\d+$/.test(e.v) || e.v === "(closed)"));
async function axFocused(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach().catch(() => {});
  const f = nodes.filter((n) => !n.ignored && !(n.role && n.role.value === "RootWebArea") && (n.properties || []).some((p) => p.name === "focused" && p.value && p.value.value === true));
  const live = nodes.filter((n) => (n.properties || []).some((p) => p.name === "live" && p.value && p.value.value && p.value.value !== "off")).length;
  const heads = nodes.filter((n) => n.role && n.role.value === "heading" && n.name && /면접|행사|공지|프로브|할인|질문지/.test(n.name.value || "")).map((n) => ({ name: (n.name.value || "").slice(0, 30), ignored: !!n.ignored }));
  return { focused: f.map((n) => ({ role: n.role && n.role.value, name: n.name && n.name.value, props: (n.properties || []).filter((p) => ["focused", "modal", "focusable"].includes(p.name)).map((p) => p.name + "=" + JSON.stringify(p.value && p.value.value)) })), liveRegions: live, popupHeadings: heads };
}
async function runAll(tasks, par = 6) {
  const out = {}; const q = Object.entries(tasks);
  const worker = async () => { while (q.length) { if (stopped()) return; const [k, fn] = q.shift(); try { out[k] = await fn(); } catch (e) { out[k] = { error: String(e.message || e) }; } } };
  await Promise.all(Array.from({ length: par }, worker));
  return out;
}
// 다음 넘김(cur 값 변화)까지 기다린다. 상한 ms
async function waitTurn(p, t0, max) {
  const end = Date.now() + max;
  while (Date.now() < end) { const l = await curLog(p); const a = l.filter((e) => e.t > t0); if (a.length) return +(a[0].t - t0).toFixed(0); await p.waitForTimeout(100); }
  return null;
}

// A focus -----------------------------------------------------------------
if (want("A") && !stopped()) {
  const T = {};
  for (const ver of ["head", "old"]) for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const k = `${ver}_${w}`;
    T[k + "_load_tab"] = async () => {
      const { ctx, page, errors } = await open(ver, w, h, { touch });
      try {
        const s0 = await st(page), ax0 = await axFocused(page);
        await page.keyboard.press("Tab"); await page.waitForTimeout(150);
        const s1 = await st(page);
        return { load: s0, axLoad: ax0.focused, afterTab: { ae: s1.ae, text: s1.aeText, inActive: s1.aeInActive, outline: s1.aeOutline, focusVisible: s1.aeFocusVisible, pause: s1.pause }, errors };
      } finally { await ctx.close(); }
    };
    T[k + "_shift"] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try {
        await page.keyboard.press("Shift+Tab"); await page.waitForTimeout(150);
        const s1 = await st(page);
        return { ae: s1.ae, inBar: s1.aeInBar, outline: s1.aeOutline, focusVisible: s1.aeFocusVisible, pause: s1.pause };
      } finally { await ctx.close(); }
    };
    // 대화상자 밖 초점: 팝업이 뜬 뒤 body 에 붙은 단추(배경 inert 목록 밖)에 초점 → onFocus 가 initial 로 되돌리는지
    T[k + "_escape"] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try {
        const r = await page.evaluate(() => { const b = document.createElement("button"); b.textContent = "late widget"; b.id = "lateBtn"; document.body.appendChild(b); b.focus(); const a = document.activeElement; return { ae: a.id || a.className || a.tagName }; });
        await page.waitForTimeout(100);
        const s1 = await st(page);
        return { immediately: r, after: s1.ae, isRoot: s1.aeIsRoot };
      } finally { await ctx.close(); }
    };
  }
  const out = await runAll(T);
  const v = {
    headRootFirst: ["head_1440_load_tab", "head_390_load_tab"].every((k) => out[k].load && out[k].load.aeIsRoot && out[k].axLoad.length === 1 && out[k].axLoad[0].role === "dialog" && /modal=true/.test(out[k].axLoad[0].props.join(","))),
    headFirstTabInActive: ["head_1440_load_tab", "head_390_load_tab"].every((k) => out[k].afterTab.inActive && out[k].afterTab.focusVisible && /solid 2px/.test(out[k].afterTab.outline) && out[k].afterTab.pause === "재생"),
    headShiftToClose: ["head_1440_shift", "head_390_shift"].every((k) => out[k].inBar && /pclose/.test(out[k].ae) && out[k].focusVisible && out[k].pause === "재생"),
    headEscapeReturns: ["head_1440_escape", "head_390_escape"].every((k) => out[k].isRoot),
    visibleMarkerBeforeTab: { head: ["head_1440_load_tab", "head_390_load_tab"].map((k) => out[k].load.aeOutline + " fv=" + out[k].load.aeFocusVisible), old: ["old_1440_load_tab", "old_390_load_tab"].map((k) => out[k].load.ae + " " + out[k].load.aeOutline + " fv=" + out[k].load.aeFocusVisible) },
  };
  result.A = { out, v }; save(); log("A", JSON.stringify(v));
}

// B kscroll ----------------------------------------------------------------
if (want("B") && !stopped()) {
  const T = {};
  const VPS = [[844, 390], [360, 640], [640, 360], [720, 450], [683, 384]];   // 640x360 = 1280x720 at 200%, 720x450 = 1440x900 at 200%, 683x384 = 1366x768 at 200%
  for (const ver of ["head", "old"]) for (const [w, h] of VPS) for (const key of ["ArrowDown", "PageDown", "Space"]) {
    T[`${ver}_${w}x${h}_${key}`] = async () => {
      const { ctx, page } = await open(ver, w, h, {});
      try {
        await page.mouse.move(1, 1);
        const s0 = await st(page); const t0 = await pnow(page);
        for (let i = 0; i < 3; i++) { await page.keyboard.press(key); await page.waitForTimeout(250); }
        const s1 = await st(page);
        const turns = (await curLog(page)).filter((e) => e.t > t0).length;
        return { ae0: s0.ae, pop0: s0.pop, scrollTopAfter3: s1.pop.scrollTop, maxScroll: s1.pop.scrollH - s1.pop.clientH, cur0: s0.cur, cur1: s1.cur, turns, pause: s1.pause };
      } finally { await ctx.close(); }
    };
  }
  // 대안 경로: HEAD 에서 Tab 1회 뒤 ArrowUp 3회 → 카드 위로 스크롤되는지(Tab 이 CTA 로 카드를 끝까지 내린 뒤)
  for (const [w, h] of VPS) T[`head_${w}x${h}_TabThenArrowUp`] = async () => {
    const { ctx, page } = await open("head", w, h, {});
    try {
      await page.keyboard.press("Tab"); await page.waitForTimeout(250);
      const s1 = await st(page);
      for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowUp"); await page.waitForTimeout(250); }
      const s2 = await st(page);
      return { afterTab: { ae: s1.ae, scrollTop: s1.pop.scrollTop }, afterUp3: { ae: s2.ae, scrollTop: s2.pop.scrollTop }, pause: s2.pause };
    } finally { await ctx.close(); }
  };
  const out = await runAll(T);
  const rows = [];
  for (const [w, h] of VPS) for (const key of ["ArrowDown", "PageDown", "Space"]) {
    const a = out[`head_${w}x${h}_${key}`], b = out[`old_${w}x${h}_${key}`];
    rows.push({ vp: `${w}x${h}`, key, overflowPx: a.pop0 ? a.pop0.scrollH - a.pop0.clientH : null, head: a.scrollTopAfter3, old: b.scrollTopAfter3, headAe: a.ae0, oldAe: b.ae0, headTurns: a.turns, oldTurns: b.turns });
  }
  const over = rows.filter((r) => r.overflowPx > 0);
  const v = { rows, overflowingCells: over.length, headScrolled: over.filter((r) => r.head > 0).length, oldScrolled: over.filter((r) => r.old > 0).length };
  result.B = { out, v }; save(); log("B", JSON.stringify(v));
}

// C barfocus ---------------------------------------------------------------
if (want("C") && !stopped()) {
  const T = {};
  for (const ver of ["head", "old"]) for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    T[`${ver}_${w}`] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try {
        await page.mouse.move(1, 1);
        // 키보드만: Shift+Tab → 닫기(정지됨), Shift+Tab → 정지 단추(표기 재생), Enter → 재생
        await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Shift+Tab");
        const s0 = await st(page);
        await page.keyboard.press("Enter"); const t0 = await pnow(page);
        const s1 = await st(page);
        const turnMs = await waitTurn(page, t0, 9500);
        await page.waitForTimeout(200);
        const s2 = await st(page);
        // 넘김 직후 그 자리에서 Enter: 정지 단추에 초점이 남아 있으면 멈춘다
        await page.keyboard.press("Enter"); const t1 = await pnow(page);
        await page.waitForTimeout(200);
        const s3 = await st(page);
        await page.waitForTimeout(9300);
        const turnsAfterEnter = (await curLog(page)).filter((e) => e.t > t1).length;
        return { beforeEnter: { ae: s0.ae, pause: s0.pause }, afterResume: { ae: s1.ae, pause: s1.pause }, turnMs, afterTurn: { ae: s2.ae, inBar: s2.aeInBar, pause: s2.pause, cur: s2.cur }, afterEnter2: { ae: s3.ae, pause: s3.pause }, turnsIn9_5sAfterEnter2: turnsAfterEnter };
      } finally { await ctx.close(); }
    };
  }
  const out = await runAll(T);
  const v = {
    headFocusStaysOnPause: ["head_1440", "head_390"].every((k) => out[k].turnMs !== null && /ppause/.test(out[k].afterTurn.ae) && out[k].afterEnter2.pause === "재생" && out[k].turnsIn9_5sAfterEnter2 === 0),
    old: ["old_1440", "old_390"].map((k) => ({ k, afterTurnAe: out[k].afterTurn.ae, turnsAfterEnter2: out[k].turnsIn9_5sAfterEnter2, pauseAfterEnter2: out[k].afterEnter2.pause })),
  };
  result.C = { out, v }; save(); log("C", JSON.stringify(v));
}

// D pin (focusin, pointerdown) ---------------------------------------------
if (want("D") && !stopped()) {
  const T = {};
  const CTRL = { mute: "[data-ppop-mute-all]", prev: "[data-ppop-prev]", next: "[data-ppop-next]", pause: "[data-ppop-pause]", close: "[data-ppop-close]" };
  for (const ver of ["head", "old"]) {
    for (const [n, sel] of Object.entries(CTRL)) T[`${ver}_focusin_${n}`] = async () => {
      const { ctx, page } = await open(ver, 1440, 900, {});
      try {
        await page.mouse.move(1, 1);
        await page.evaluate((s) => document.querySelector(".pdim " + s).focus(), sel);
        await page.waitForTimeout(100);
        const s1 = await st(page);
        return { ae: s1.ae, pause: s1.pause, cur: s1.cur };
      } finally { await ctx.close(); }
    };
    for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) T[`${ver}_pdown_pcnt_${w}`] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try {
        const b = await page.locator(".pdim .pcnt").boundingBox();
        if (touch) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        else { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.up(); await page.mouse.move(1, 1); }
        const t0 = await pnow(page);
        await page.waitForTimeout(9500);
        const s1 = await st(page);
        return { pause: s1.pause, open: s1.open, turnsIn9_5s: (await curLog(page)).filter((e) => e.t > t0).length };
      } finally { await ctx.close(); }
    };
  }
  const out = await runAll(T, 8);
  const v = {
    headFocusinPauses: Object.fromEntries(Object.keys(CTRL).map((n) => [n, out[`head_focusin_${n}`].pause])),
    oldFocusinPauses: Object.fromEntries(Object.keys(CTRL).map((n) => [n, out[`old_focusin_${n}`].pause])),
    headPointerdown: ["1440", "390"].map((w) => out[`head_pdown_pcnt_${w}`]),
    oldPointerdown: ["1440", "390"].map((w) => out[`old_pdown_pcnt_${w}`]),
  };
  result.D = { out, v }; save(); log("D", JSON.stringify(v));
}

// E swipe from the bar -----------------------------------------------------
if (want("E") && !stopped()) {
  const T = {};
  const PTS = { mute: ".pdim .pmute", pcnt: ".pdim .pcnt", close: ".pdim [data-ppop-close]", next: ".pdim [data-ppop-next]", prev: ".pdim [data-ppop-prev]", pause: ".pdim [data-ppop-pause]" };
  for (const ver of ["head", "old"]) for (const [n, sel] of Object.entries(PTS)) for (const dir of [-1, 1]) {
    T[`${ver}_${n}_${dir < 0 ? "left" : "right"}`] = async () => {
      const { ctx, page } = await open(ver, 390, 844, { touch: true });
      try {
        const b = await page.locator(sel).boundingBox();
        const x0 = Math.min(Math.max(b.x + b.width / 2, 110), 280), y0 = b.y + b.height / 2;
        const s0 = await st(page); const t0 = await pnow(page);
        const cdp = await ctx.newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
        for (let i = 1; i <= 6; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + dir * 15 * i, y: y0 + i * 0.5 }] }); await page.waitForTimeout(16); }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(700);
        const s1 = await st(page);
        const clicks = await page.evaluate((t) => window.__clicks.filter((c) => c.t > t), t0);
        await cdp.detach().catch(() => {});
        const exp = s0.cur ? (((s0.cur - 1 + dir) % 2) + 2) % 2 + 1 : null;
        return { start: [+x0.toFixed(1), +y0.toFixed(1)], cur0: s0.cur, cur1: s1.cur, expCur: exp, open: s1.open, muted: s1.muted, pause: s1.pause, clicks, ae: s1.ae };
      } finally { await ctx.close(); }
    };
  }
  const out = await runAll(T, 8);
  const rows = Object.entries(out).map(([k, r]) => ({ k, ok: !!r.open && r.cur1 === r.expCur && r.muted === false && (r.clicks || []).length === 0, cur: `${r.cur0}->${r.cur1}`, open: r.open, muted: r.muted, clicks: (r.clicks || []).length, pause: r.pause }));
  const v = { head: rows.filter((r) => r.k.startsWith("head")), old: rows.filter((r) => r.k.startsWith("old")), headOk: rows.filter((r) => r.k.startsWith("head") && r.ok).length, headN: rows.filter((r) => r.k.startsWith("head")).length, oldOk: rows.filter((r) => r.k.startsWith("old") && r.ok).length };
  result.E = { out, v }; save(); log("E", JSON.stringify({ headOk: v.headOk, headN: v.headN, oldOk: v.oldOk }));
}

// F touch resume ------------------------------------------------------------
if (want("F") && !stopped()) {
  const T = {};
  for (const ver of ["head", "old"]) {
    T[`${ver}_pausePlay`] = async () => {
      const { ctx, page } = await open(ver, 390, 844, { touch: true });
      try {
        const pb = page.locator("[data-ppop-pause]");
        await pb.tap(); await page.waitForTimeout(400); const a = (await st(page)).pause;
        await pb.tap(); const t0 = await pnow(page); const b = (await st(page)).pause;
        const ms = await waitTurn(page, t0, 10000);
        const t1 = await pnow(page); const ms2 = await waitTurn(page, t1, 10000);
        return { afterTap1: a, afterTap2: b, firstTurnMs: ms, secondTurnMs: ms2, ae: (await st(page)).ae };
      } finally { await ctx.close(); }
    };
    T[`${ver}_nextThenPlay`] = async () => {
      const { ctx, page } = await open(ver, 390, 844, { touch: true });
      try {
        await page.locator("[data-ppop-next]").tap(); await page.waitForTimeout(500); const a = await st(page);
        await page.locator("[data-ppop-pause]").tap(); const t0 = await pnow(page);
        const ms = await waitTurn(page, t0, 10000);
        return { afterNext: { cur: a.cur, pause: a.pause }, firstTurnMs: ms };
      } finally { await ctx.close(); }
    };
    T[`${ver}_pcntThenPlay`] = async () => {
      const { ctx, page } = await open(ver, 390, 844, { touch: true });
      try {
        const b = await page.locator(".pdim .pcnt").boundingBox();
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(500); const a = (await st(page)).pause;
        await page.locator("[data-ppop-pause]").tap(); const t0 = await pnow(page);
        const ms = await waitTurn(page, t0, 10000);
        return { afterPcnt: a, firstTurnMs: ms };
      } finally { await ctx.close(); }
    };
    T[`${ver}_cardTapThenPlay`] = async () => {
      const { ctx, page } = await open(ver, 390, 844, { touch: true });
      try {
        const b = await page.locator(".pdim .pslot[data-on] .pop h2").boundingBox();
        await page.touchscreen.tap(b.x + 10, b.y + b.height / 2); await page.waitForTimeout(500); const a = await st(page);
        await page.locator("[data-ppop-pause]").tap(); const t0 = await pnow(page);
        const ms = await waitTurn(page, t0, 10000);
        return { afterCardTap: { pause: a.pause, ae: a.ae }, firstTurnMs: ms };
      } finally { await ctx.close(); }
    };
  }
  const out = await runAll(T, 8);
  const ok = (r) => typeof r.firstTurnMs === "number" && r.firstTurnMs >= 7800 && r.firstTurnMs <= 8600;
  const v = { head: Object.fromEntries(Object.entries(out).filter(([k]) => k.startsWith("head")).map(([k, r]) => [k, r.firstTurnMs])), old: Object.fromEntries(Object.entries(out).filter(([k]) => k.startsWith("old")).map(([k, r]) => [k, r.firstTurnMs])), headAllResume: Object.entries(out).filter(([k]) => k.startsWith("head")).every(([, r]) => ok(r)), headSecond: out.head_pausePlay.secondTurnMs };
  result.F = { out, v }; save(); log("F", JSON.stringify(v));
}

// G slit hit-test -----------------------------------------------------------
if (want("G") && !stopped()) {
  const T = {};
  for (const [w, h, act] of [[1440, 900, "next"], [1280, 800, "next"], [1024, 768, "none"], [1440, 900, "none"]]) for (const ver of ["head", "old"]) {
    T[`${ver}_${w}x${h}_${act}`] = async () => {
      const { ctx, page } = await open(ver, w, h, { reduce: true });
      try {
        if (act === "next") { await page.locator("[data-ppop-next]").click(); await page.waitForTimeout(500); }
        await page.mouse.move(1, 1);
        const r = await page.evaluate(() => {
          const pop = document.querySelector(".pdim .pslot[data-on] > .pop"), bar = document.querySelector(".pdim .pbar");
          const pr = pop.getBoundingClientRect(), br = bar.getBoundingClientRect();
          const x = (pr.left + pr.right) / 2, hits = {};
          for (let y = br.top - 1.5; y <= br.top + 1.5; y += 0.1) { const e = document.elementFromPoint(x, y); const k = e ? (e.closest(".pback") ? "pback" : e.closest(".pbar") ? "pbar" : e.closest(".pop") ? "pop" : e.className) : "null"; hits[k] = (hits[k] || 0) + 1; }
          const ints = [Math.floor(br.top) - 1, Math.floor(br.top), Math.ceil(br.top)].map((y) => { const e = document.elementFromPoint(x, y); return [y, e ? (e.closest(".pback") ? "pback" : e.closest(".pbar") ? "pbar" : e.closest(".pop") ? "pop" : e.className) : "null"]; });
          return { popBottom: +pr.bottom.toFixed(2), barTop: +br.top.toFixed(2), hits, ints };
        });
        return r;
      } finally { await ctx.close(); }
    };
  }
  const out = await runAll(T, 8);
  const v = { pbackHits: Object.fromEntries(Object.entries(out).map(([k, r]) => [k, r.hits ? r.hits.pback || 0 : null])) };
  result.G = { out, v }; save(); log("G", JSON.stringify(v));
}

// H ax during rotation ----------------------------------------------------
if (want("H") && !stopped()) {
  const T = {};
  for (const ver of ["head", "old"]) T[ver] = async () => {
    const { ctx, page } = await open(ver, 1440, 900, {});
    try {
      await page.mouse.move(1, 1);
      const a0 = await axFocused(page); const openT = await page.evaluate(() => window.__openT);
      await page.waitForTimeout(Math.max(0, 8800 - ((await pnow(page)) - openT)));
      const a1 = await axFocused(page); const s1 = await st(page);
      return { t0: a0, t8_8s: a1, cur8_8s: s1.cur, ae8_8s: s1.ae };
    } finally { await ctx.close(); }
  };
  const out = await runAll(T, 2);
  result.H = { out }; save(); log("H", JSON.stringify({ head: { t0: out.head.t0.focused, t8: out.head.t8_8s.focused, live: out.head.t8_8s.liveRegions }, old: { t0: out.old.t0.focused, t8: out.old.t8_8s.focused, live: out.old.t8_8s.liveRegions } }));
}

// I extreme short viewports: 하단바와 닫기가 화면 안인지(head 대 old) ------------------------
if (want("I") && !stopped()) {
  const T = {};
  const VPS = [[568, 320, true], [375, 300, true], [320, 480, true], [640, 320, false], [320, 256, false], [1280, 400, false], [667, 375, true]];
  for (const ver of ["head", "old"]) for (const [w, h, touch] of VPS) T[`${ver}_${w}x${h}`] = async () => {
    const { ctx, page } = await open(ver, w, h, { touch });
    try {
      const rows = [];
      if (ver === "head" && ((w === 568 && h === 320) || (w === 320 && h === 256))) await page.screenshot({ path: path.join(HERE, "shots", `refute_${w}x${h}_head.png`) });
      const n = await page.evaluate(() => document.querySelectorAll(".pdim .pslot").length);
      for (let i = 0; i < n; i++) {
        const r = await page.evaluate(() => {
          const R = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { t: +b.top.toFixed(1), b: +b.bottom.toFixed(1), l: +b.left.toFixed(1), r: +b.right.toFixed(1) }; };
          const bar = document.querySelector(".pdim .pbar"), cl = document.querySelector(".pdim [data-ppop-close]"), pop = document.querySelector(".pdim .pslot[data-on] > .pop");
          const c = R(cl), cx = (c.l + c.r) / 2, cy = (c.t + c.b) / 2;
          const hit = document.elementFromPoint(cx, cy);
          const ctl = (s) => { const e = document.querySelector(".pdim " + s); if (!e) return null; const r = R(e), y = (r.t + r.b) / 2, hh = document.elementFromPoint((r.l + r.r) / 2, y); return { t: r.t, b: r.b, centerInView: y >= 0 && y <= innerHeight, hittable: !!hh && e.contains(hh) }; };
          return { vh: innerHeight, bar: R(bar), close: c, pop: R(pop), closeHittable: !!hit && !!hit.closest("[data-ppop-close]"), closeInView: c.t >= 0 && c.b <= innerHeight, popTopInView: R(pop).t >= 0, pause: ctl("[data-ppop-pause]"), next: ctl("[data-ppop-next]"), prev: ctl("[data-ppop-prev]"), pdimScrollTop: document.querySelector(".pdim").scrollTop };
        });
        rows.push({ slot: i, ...r });
        if (n > 1) { await page.evaluate(() => document.querySelector(".pdim [data-ppop-next]").click()); await page.waitForTimeout(700); }
      }
      return { n, rows };
    } finally { await ctx.close(); }
  };
  // 키보드로 정지 단추까지 가면(Shift+Tab 2회: 닫기 → 정지) 초점 이동이 .pdim(overflow:hidden)을 스크롤해 단추가 보이게 되는지
  for (const ver of ["head", "old"]) for (const [w, h] of [[568, 320], [320, 256]]) T[`${ver}_${w}x${h}_kbdPause`] = async () => {
    const { ctx, page } = await open(ver, w, h, {});
    try {
      await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Shift+Tab"); await page.waitForTimeout(200);
      const r = await page.evaluate(() => { const e = document.activeElement, b = e.getBoundingClientRect(); return { ae: e.className, t: +b.top.toFixed(1), b: +b.bottom.toFixed(1), vh: innerHeight, inView: b.top >= 0 && b.bottom <= innerHeight, pdimScrollTop: document.querySelector(".pdim").scrollTop }; });
      return r;
    } finally { await ctx.close(); }
  };
  const out = await runAll(T, 8);
  const v = Object.fromEntries(Object.entries(out).map(([k, r]) => [k, !r.rows ? r : r.rows.map((x) => `s${x.slot}: bar ${x.bar.t}-${x.bar.b}/${x.vh} close ${x.closeInView ? "in" : "OUT"} hit=${x.closeHittable} pause ${x.pause ? x.pause.t + "-" + x.pause.b + (x.pause.hittable ? " hit" : " NOHIT") : "-"} next ${x.next ? (x.next.hittable ? "hit" : "NOHIT") : "-"} popTop ${x.pop.t}`)]));
  result.I = { out, v }; save(); log("I", JSON.stringify(v, null, 1));
}

result.stopped = stopped();
save();
const t = setTimeout(() => process.exit(0), 5000); await browser.close().catch(() => {}); clearTimeout(t);
process.exit(0);
