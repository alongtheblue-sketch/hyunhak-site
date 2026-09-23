// 반증 7회차 (동작과 접근성 렌즈, 2026-09-23): e1955be(HEAD) 대 96be167(라이브, 팝업 코드 94f577b) 팝업 무대 동작 대조.
//   판 = head(8092 서버가 내는 e1955be 그대로) / old(assets/app.js, assets/base.css 두 파일만 git show 96be167 내용으로 route).
//   A focus   첫 초점(CDP 초점 노드), 윤곽, 첫 Tab, 첫 Shift+Tab, 대화상자 밖 초점 복귀, 창 전환(blur 뒤 focus), 자동 넘김 뒤 Tab, N=3 조작 요소 없는 공지 카드에서 Tab
//   B keys    .pdim 초점 키 반복(30ms x 20) setPause 호출 수와 스크롤량, Shift+Space, 끝에서 preventDefault 와 문서 스크롤, 조작 요소별 Space/ArrowDown 가로채기,
//             체크박스 Space 토글, isComposing 합성 이벤트, reduce, 제목 초점 키 스크롤, Home/End
//   C resume  키 스크롤 정지 뒤 재생(마우스, 키보드) → 벨트 재개 ms, 그 뒤 키 스크롤이 다시 정지시키는지
//   D bar     하단바 조작 focusin/pointerdown 정지, 하단바 단추 초점 유지(자동 넘김), 하단바 위 스와이프, 측면 카드와 하단바 hit-test 겹침
//   E wrap    N=3/4/5 → ← 30ms 섞어 20회: 감아 도는 슬롯 transition none 누락, rAF 프레임 교차, 잔류, data-far 클릭과 inert (old N=3 = 검출기 양성 대조)
//   F close   전이 중 ESC/닫기/딤 → 리스너 잔류(CDP getEventListeners 대 기준선), RO disconnect 와 닫은 뒤 콜백, 창 크기 변경 오류, 닫은 뒤 ArrowRight,
//             새로고침 재진입, 오늘 하루 보지 않기 → 새 탭, 체크 뒤 CTA 이동
//   G touch   390 탭 정지 → 재생 → 8초 넘김 (94f577b 수리 회귀)
//   H resize  연 채 창 크기 변경(1440x420→390x420, 390x844→844x390, 1440x900→320x256): 하단바 뷰포트 안, --pbar-h = 실측, RO 루프 오류
// 사용: node refute_behavior.mjs [A|B|C|D|E|F|G|H|all] (쉼표로 여러 구획) → r7/refute_behavior.json, r7/shots/refute_behavior_*.png
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
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
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
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
const git = (spec) => execFileSync("git", ["-C", REPO, "show", spec], { maxBuffer: 64 << 20 });
const OLD = { "assets/app.js": git("96be167:assets/app.js"), "assets/base.css": git("96be167:assets/base.css") };
{
  const served = {};
  for (const f of ["assets/app.js", "assets/base.css"]) {
    const live = Buffer.from(await (await fetch(BASE + f)).arrayBuffer());
    served[f] = { served: sha(live), head: sha(git("HEAD:" + f)), old96be167: sha(OLD[f]), old94f577b: sha(git("94f577b:" + f)) };
  }
  result.meta = { head: execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]).toString().trim(), at: new Date().toISOString(), served };
  log("meta", JSON.stringify(result.meta));
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
const INIT = () => {
  window.__cur = []; window.__openT = null; window.__clicks = []; window.__err = []; window.__kd = []; window.__paint = []; window.__fev = [];
  let last;
  const now = () => +performance.now().toFixed(1);
  addEventListener("error", (e) => window.__err.push(String(e.message || e)));
  addEventListener("unhandledrejection", (e) => window.__err.push("rej " + String(e.reason)));
  const desc = (e) => (!e ? null : e === window ? "window" : e === document ? "document" : e === document.body ? "body" : !e.tagName ? String(e) : e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).join(".") : "") + (e.hasAttribute && e.hasAttribute("data-ppop-pause") ? "[pause]" : ""));
  window.__desc = desc;
  const RO = window.ResizeObserver;
  window.__ro = { made: 0, observe: 0, disconnect: 0, cb: [] };
  if (RO) window.ResizeObserver = class extends RO {
    constructor(cb) { super((en, o) => { window.__ro.cb.push(now()); cb(en, o); }); window.__ro.made++; }
    observe(...a) { window.__ro.observe++; return super.observe(...a); }
    disconnect() { window.__ro.disconnect++; return super.disconnect(); }
  };
  const rec = (muts) => {
    const d = document.querySelector(".pdim");
    if (d && window.__openT === null) window.__openT = now();
    const c = document.querySelector(".pdim [data-ppop-cur]");
    const v = c ? c.textContent : d ? "(n1)" : "(closed)";
    if (v !== last) { last = v; window.__cur.push({ t: now(), v }); }
    for (const m of muts || []) if (m.type === "childList" && m.target.nodeType === 1 && m.target.hasAttribute("data-ppop-pause")) window.__paint.push({ t: now(), v: m.target.textContent });
  };
  document.addEventListener("DOMContentLoaded", () => new MutationObserver(rec).observe(document.body, { childList: true, subtree: true, characterData: true }));
  document.addEventListener("click", (e) => window.__clicks.push({ t: now(), el: desc(e.target) }), true);
  // window 버블 = document 의 onKey/onArrow 뒤. defaultPrevented 는 팝업 처리기 결과
  addEventListener("keydown", (e) => window.__kd.push({ t: now(), key: e.key, rep: e.repeat, dp: e.defaultPrevented, ae: desc(document.activeElement) }));
  addEventListener("focus", (e) => window.__fev.push({ t: now(), ty: "focus", tg: desc(e.target) }), true);
  addEventListener("blur", (e) => window.__fev.push({ t: now(), ty: "blur", tg: desc(e.target) }), true);
};
const CLONES = (n) => `document.addEventListener("DOMContentLoaded", () => { const src = document.querySelector('[data-hh-popup]:not([data-promo-popup])'); if (!src) return; for (let k = 1; k <= ${n}; k++) { const c = src.cloneNode(true); c.setAttribute("data-hh-popup", "c" + k); c.removeAttribute("data-popup-until"); c.id = "clone" + k; const h = c.querySelector("h2"); if (h) { h.id = "cloneT" + k; h.textContent = "복제 카드 " + k; } document.body.appendChild(c); } });`;
async function open(ver, w, h, o = {}) {
  const co = { viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR", reducedMotion: o.reduce ? "reduce" : "no-preference" };
  if (o.touch) Object.assign(co, { hasTouch: true, isMobile: true });
  const ctx = o.ctx || (await browser.newContext(co));
  if (!o.ctx) {
    await ctx.addInitScript(INIT);
    if (o.preShown) await ctx.addInitScript(() => { try { sessionStorage.setItem("hh_popup_shown", "1"); } catch {} });
    if (o.clones) await ctx.addInitScript(CLONES(o.clones));
    if (o.notices) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(o.notices) }));
    if (ver === "old") for (const [f, body] of Object.entries(OLD)) await ctx.route(BASE + f, (r) => r.fulfill({ status: 200, contentType: f.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8", body }));
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errors.push("console " + m.text()); });
  await page.goto(BASE + (o.url || "index.html"), { waitUntil: "networkidle", timeout: 30000 }).catch((e) => errors.push("goto " + e.message));
  await page.addStyleTag({ content: RV });
  if (o.noWait) { await page.waitForTimeout(o.settle ?? 1500); return { ctx, page, errors }; }
  await page.waitForSelector(".pdim", { timeout: 20000 });
  await page.waitForTimeout(o.settle ?? 600);
  return { ctx, page, errors };
}
const S = () => {
  const root = document.querySelector(".pdim");
  const desc = window.__desc;
  if (!root) return { open: false, ae: desc(document.activeElement), htmlLocked: document.documentElement.classList.contains("ppop-open"), inertBg: document.querySelectorAll("body > [inert]").length, scrollY };
  const ae = document.activeElement, cs = ae ? getComputedStyle(ae) : null;
  const slots = [...root.querySelectorAll(".pslot")], on = root.querySelector(".pslot[data-on]"), pop = on && on.querySelector(":scope > .pop");
  const pb = root.querySelector("[data-ppop-pause]"), cur = root.querySelector("[data-ppop-cur]"), mute = root.querySelector("[data-ppop-mute-all]");
  return {
    open: true, cur: cur ? +cur.textContent : null, pause: pb ? pb.textContent : null, muted: mute ? mute.checked : null,
    ae: desc(ae), aeText: ae ? (ae.textContent || "").trim().slice(0, 20) : null, aeIsRoot: ae === root, aeInBar: !!ae && !!ae.closest && !!ae.closest(".pbar"), aeInActive: !!on && on.contains(ae), aeInInert: !!(ae && ae.closest && ae.closest("[inert]")),
    aeOutline: cs ? cs.outlineStyle + " " + cs.outlineWidth : null, aeShadow: cs ? cs.boxShadow : null, aeFocusVisible: !!ae && ae.matches(":focus-visible"),
    pop: pop ? { st: pop.scrollTop, sh: pop.scrollHeight, ch: pop.clientHeight, max: pop.scrollHeight - pop.clientHeight } : null,
    onIdx: slots.indexOf(on), scrollY, pdimST: root.scrollTop, htmlLocked: document.documentElement.classList.contains("ppop-open"),
  };
};
const st = (p) => p.evaluate(S);
const pnow = (p) => p.evaluate(() => +performance.now().toFixed(1));
const curLog = (p) => p.evaluate(() => window.__cur.filter((e) => /^\d+$/.test(e.v) || e.v === "(closed)"));
const turnsAfter = async (p, t0) => (await curLog(p)).filter((e) => e.t > t0 && /^\d+$/.test(e.v)).length;
const paintsAfter = (p, t0) => p.evaluate((t) => window.__paint.filter((e) => e.t > t).map((e) => e.v), t0);
const kdAfter = (p, t0) => p.evaluate((t) => window.__kd.filter((e) => e.t > t), t0);
async function waitTurn(p, t0, max) {
  const end = Date.now() + max;
  while (Date.now() < end) { const l = await curLog(p); const a = l.filter((e) => e.t > t0 && /^\d+$/.test(e.v)); if (a.length) return +(a[0].t - t0).toFixed(0); await p.waitForTimeout(100); }
  return null;
}
async function axFocused(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach().catch(() => {});
  const f = nodes.filter((n) => !n.ignored && !(n.role && n.role.value === "RootWebArea") && (n.properties || []).some((p) => p.name === "focused" && p.value && p.value.value === true));
  return f.map((n) => ({ role: n.role && n.role.value, name: n.name && n.name.value, props: (n.properties || []).filter((p) => ["focused", "modal"].includes(p.name)).map((p) => p.name + "=" + JSON.stringify(p.value && p.value.value)) }));
}
async function listeners(page) {
  const cdp = await page.context().newCDPSession(page);
  const out = {};
  for (const expr of ["document", "window"]) {
    const { result: r } = await cdp.send("Runtime.evaluate", { expression: expr });
    const { listeners: ls } = await cdp.send("DOMDebugger.getEventListeners", { objectId: r.objectId });
    const c = {}; for (const l of ls) if (["keydown", "focusin", "resize"].includes(l.type)) c[l.type] = (c[l.type] || 0) + 1;
    out[expr] = c;
  }
  await cdp.detach().catch(() => {});
  return out;
}
async function runAll(tasks, par = 8) {
  const out = {}; const q = Object.entries(tasks);
  const worker = async () => { while (q.length) { const [k, fn] = q.shift(); try { out[k] = await fn(); } catch (e) { out[k] = { error: String(e.message || e).slice(0, 300) }; } } };
  await Promise.all(Array.from({ length: par }, worker));
  return out;
}
const press = async (p, k, n = 1, gap = 80) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(gap); } };

// A focus -----------------------------------------------------------------
if (want("A")) {
  const T = {};
  for (const ver of ["head", "old"]) for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const k = `${ver}_${w}`;
    T[k + "_load_tab"] = async () => {
      const { ctx, page, errors } = await open(ver, w, h, { touch });
      try {
        await page.mouse.move(1, 1);
        const s0 = await st(page), ax0 = await axFocused(page);
        if (w === 1440) await page.screenshot({ path: path.join(SHOTS, `refute_behavior_load_${ver}_1440.png`) });
        await page.keyboard.press("Tab"); await page.waitForTimeout(150);
        const s1 = await st(page), ax1 = await axFocused(page);
        return { load: { ae: s0.ae, isRoot: s0.aeIsRoot, outline: s0.aeOutline, shadow: s0.aeShadow, fv: s0.aeFocusVisible, pause: s0.pause }, axLoad: ax0, afterTab: { ae: s1.ae, text: s1.aeText, inActive: s1.aeInActive, outline: s1.aeOutline, fv: s1.aeFocusVisible, pause: s1.pause }, axTab: ax1, errors };
      } finally { await ctx.close(); }
    };
    T[k + "_shift"] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try { await page.keyboard.press("Shift+Tab"); await page.waitForTimeout(150); const s1 = await st(page); return { ae: s1.ae, inBar: s1.aeInBar, fv: s1.aeFocusVisible, outline: s1.aeOutline, pause: s1.pause }; } finally { await ctx.close(); }
    };
    T[k + "_escape"] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try {
        await page.evaluate(() => { const b = document.createElement("button"); b.textContent = "late"; b.id = "lateBtn"; document.body.appendChild(b); b.focus(); });
        await page.waitForTimeout(100); const s1 = await st(page);
        return { after: s1.ae, isRoot: s1.aeIsRoot };
      } finally { await ctx.close(); }
    };
    // 창 전환: 초점 에뮬레이션을 끄고 새 탭을 앞으로 → 원래 탭을 앞으로
    T[k + "_blurfocus"] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try {
        await page.mouse.move(1, 1);
        const cdp = await ctx.newCDPSession(page);
        await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false }).catch(() => {});
        const s0 = await st(page); const h0 = await page.evaluate(() => document.hasFocus()); const t0 = await pnow(page);
        const p2 = await ctx.newPage(); await p2.goto("about:blank"); await p2.bringToFront(); await page.waitForTimeout(400);
        const h1 = await page.evaluate(() => document.hasFocus()); const aeMid = (await st(page)).ae;
        await page.bringToFront(); await page.waitForTimeout(400);
        const h2 = await page.evaluate(() => document.hasFocus()); const s2 = await st(page);
        const fev = await page.evaluate((t) => window.__fev.filter((e) => e.t > t), t0);
        await p2.close();
        return { hasFocus: [h0, h1, h2], ae0: s0.ae, aeMid, ae2: s2.ae, isRoot2: s2.aeIsRoot, pause0: s0.pause, pause2: s2.pause, fev };
      } finally { await ctx.close(); }
    };
    // 자동 넘김 뒤 Tab: 초점이 틀(head) 또는 제목(old)인 채 한 번 넘긴 뒤 첫 Tab 이 새 활성 카드 첫 조작 요소로 가는지
    T[k + "_autoTab"] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try {
        await page.mouse.move(1, 1);
        const t0 = await pnow(page); const ms = await waitTurn(page, t0, 9500); await page.waitForTimeout(300);
        const s1 = await st(page);
        await page.keyboard.press("Tab"); await page.waitForTimeout(150); const s2 = await st(page);
        const first = await page.evaluate(() => { const on = document.querySelector(".pdim .pslot[data-on]"); const f = on && on.querySelector("a[href],button,input"); return f ? window.__desc(f) + " " + (f.textContent || "").trim().slice(0, 16) : null; });
        return { turnMs: ms, afterTurn: { cur: s1.cur, ae: s1.ae }, afterTab: { ae: s2.ae, text: s2.aeText, inActive: s2.aeInActive, pause: s2.pause }, expectFirst: first };
      } finally { await ctx.close(); }
    };
  }
  // N=3: 조작 요소 없는 공지 카드. → 2회 뒤 공지 본문(비조작) 클릭 → 초점 → Tab / Shift+Tab
  for (const ver of ["head", "old"]) T[`${ver}_n3notice`] = async () => {
    const { ctx, page } = await open(ver, 1440, 900, { notices: NOTICE3 });
    try {
      await press(page, "ArrowRight", 2, 700);
      const b = await page.locator(".pdim .pslot[data-on] .pbody").boundingBox();
      await page.mouse.click(b.x + 20, b.y + b.height / 2); await page.waitForTimeout(200);
      const s1 = await st(page);
      await page.keyboard.press("Tab"); await page.waitForTimeout(150); const s2 = await st(page);
      await page.keyboard.press("Shift+Tab"); await page.waitForTimeout(150); const s3 = await st(page);
      return { cur: s1.cur, afterClick: { ae: s1.ae, isRoot: s1.aeIsRoot, pause: s1.pause }, tab: { ae: s2.ae, inBar: s2.aeInBar }, shiftTab: { ae: s3.ae } };
    } finally { await ctx.close(); }
  };
  const out = await runAll(T);
  const v = {
    firstFocus: Object.fromEntries(["head_1440", "head_390", "old_1440", "old_390"].map((k) => [k, out[k + "_load_tab"].error || `${out[k + "_load_tab"].load.ae} outline=${out[k + "_load_tab"].load.outline} shadow=${out[k + "_load_tab"].load.shadow} fv=${out[k + "_load_tab"].load.fv} ax=${JSON.stringify(out[k + "_load_tab"].axLoad)}`])),
    firstTab: Object.fromEntries(["head_1440", "head_390", "old_1440", "old_390"].map((k) => [k, out[k + "_load_tab"].error || `${out[k + "_load_tab"].afterTab.ae} "${out[k + "_load_tab"].afterTab.text}" inActive=${out[k + "_load_tab"].afterTab.inActive} fv=${out[k + "_load_tab"].afterTab.fv} pause=${out[k + "_load_tab"].afterTab.pause}`])),
    firstShiftTab: Object.fromEntries(["head_1440", "head_390", "old_1440", "old_390"].map((k) => [k, out[k + "_shift"].error || `${out[k + "_shift"].ae} fv=${out[k + "_shift"].fv} pause=${out[k + "_shift"].pause}`])),
    escapeReturn: Object.fromEntries(["head_1440", "head_390", "old_1440", "old_390"].map((k) => [k, out[k + "_escape"].after])),
    blurfocus: Object.fromEntries(["head_1440", "head_390", "old_1440", "old_390"].map((k) => [k, out[k + "_blurfocus"].error || `hasFocus=${out[k + "_blurfocus"].hasFocus} ae ${out[k + "_blurfocus"].ae0} -> ${out[k + "_blurfocus"].ae2} pause ${out[k + "_blurfocus"].pause0} -> ${out[k + "_blurfocus"].pause2}`])),
    autoTab: Object.fromEntries(["head_1440", "head_390", "old_1440", "old_390"].map((k) => [k, out[k + "_autoTab"].error || `turn ${out[k + "_autoTab"].turnMs}ms cur=${out[k + "_autoTab"].afterTurn.cur} ae=${out[k + "_autoTab"].afterTurn.ae} tab=${out[k + "_autoTab"].afterTab.ae} "${out[k + "_autoTab"].afterTab.text}" expect=${out[k + "_autoTab"].expectFirst}`])),
    n3notice: { head: out.head_n3notice, old: out.old_n3notice },
  };
  result.A = { out, v }; save(); log("A", JSON.stringify(v, null, 1));
}

// B keys -------------------------------------------------------------------
if (want("B")) {
  const T = {};
  // 키 반복: .pdim 초점, ArrowDown keydown 20회(30ms, repeat=true) → paintPause 수, 스크롤량, 9.5초 뒤 cur
  for (const ver of ["head", "old"]) T[`${ver}_repeat_ArrowDown`] = async () => {
    const { ctx, page } = await open(ver, 1440, 420, {});
    try {
      await page.mouse.move(1, 1);
      const s0 = await st(page); const t0 = await pnow(page);
      for (let i = 0; i < 20; i++) { await page.keyboard.down("ArrowDown"); await page.waitForTimeout(30); }
      await page.keyboard.up("ArrowDown"); await page.waitForTimeout(100);
      const s1 = await st(page); const kd = await kdAfter(page, t0); const paints = await paintsAfter(page, t0);
      await page.waitForTimeout(9500); const s2 = await st(page);
      return { ae0: s0.ae, pop0: s0.pop, st1: s1.pop.st, max: s1.pop.max, keydowns: kd.length, repeats: kd.filter((e) => e.rep).length, dpCount: kd.filter((e) => e.dp).length, paintPauseCalls: paints.length, paints, pause1: s1.pause, cur0: s0.cur, cur9_5s: s2.cur, turns: await turnsAfter(page, t0), scrollY: s1.scrollY, errors: [] };
    } finally { await ctx.close(); }
  };
  // Space 반복과 Shift+Space, 끝을 넘는 ArrowDown 30회(문서 스크롤, .pdim scrollTop, 배경 inert)
  T.head_space_shiftspace_end = async () => {
    const { ctx, page } = await open("head", 1440, 420, {});
    try {
      await page.mouse.move(1, 1);
      const t0 = await pnow(page);
      const seq = [];
      for (const k of ["Space", "Space", "Shift+Space", "PageDown", "PageUp", "ArrowUp"]) { await page.keyboard.press(k); await page.waitForTimeout(120); seq.push([k, (await st(page)).pop.st]); }
      for (let i = 0; i < 30; i++) { await page.keyboard.press("ArrowDown"); await page.waitForTimeout(15); }
      await page.waitForTimeout(150);
      const s1 = await st(page); const kd = await kdAfter(page, t0);
      const bg = await page.evaluate(() => ({ bodyKids: [...document.body.children].filter((e) => !e.classList.contains("pdim") && !/^(SCRIPT|STYLE|LINK)$/.test(e.tagName)).length, inert: [...document.body.children].filter((e) => e.hasAttribute("inert")).length, htmlOverflow: getComputedStyle(document.documentElement).overflow, docMaxScroll: document.documentElement.scrollHeight - innerHeight }));
      return { seq, atEnd: { st: s1.pop.st, max: s1.pop.max }, dpLast30: kd.slice(-30).filter((e) => e.dp).length, scrollY: s1.scrollY, pdimST: s1.pdimST, bg, paints: await paintsAfter(page, t0), ae: s1.ae };
    } finally { await ctx.close(); }
  };
  // 조작 요소별 Space / ArrowDown: .pdim 에서 Tab k 회로 초점(f 순서 = 의뢰하기, 자세히, 체크박스, ←, →, 정지, 닫기)
  const CTRL = [["cta", 1], ["ghost", 2], ["mute", 3], ["prev", 4], ["next", 5], ["pause", 6], ["close", 7]];
  for (const [name, n] of CTRL) for (const key of ["Space", "ArrowDown"]) T[`head_ctrl_${name}_${key}`] = async () => {
    const { ctx, page } = await open("head", 1440, 420, {});
    try {
      await page.mouse.move(1, 1);
      await press(page, "Tab", n, 60);
      const s0 = await st(page); const t0 = await pnow(page);
      await page.keyboard.press(key); await page.waitForTimeout(250);
      const s1 = await st(page); const kd = await kdAfter(page, t0);
      const clicks = await page.evaluate((t) => window.__clicks.filter((c) => c.t > t).map((c) => c.el), t0);
      let second = null;
      if (name === "mute" && key === "Space") { await page.keyboard.press("Space"); await page.waitForTimeout(150); second = (await st(page)).muted; }
      return { ae0: s0.ae, ae1: s1.ae, open1: s1.open, dp: kd.map((e) => e.dp), st: [s0.pop && s0.pop.st, s1.pop && s1.pop.st], cur: [s0.cur, s1.cur], pause: [s0.pause, s1.pause], muted: [s0.muted, s1.muted, second], clicks };
    } finally { await ctx.close(); }
  };
  // isComposing 합성 keydown(.pdim 에 dispatch): 조합 중 표지를 보는지
  T.head_ime = async () => {
    const { ctx, page } = await open("head", 1440, 420, {});
    try {
      await page.mouse.move(1, 1);
      const r = await page.evaluate(() => {
        const root = document.querySelector(".pdim"), pop = root.querySelector(".pslot[data-on] > .pop"), out = [];
        for (const [key, kc] of [[" ", 229], ["ArrowDown", 229], ["ArrowRight", 229]]) {
          const before = { st: pop.scrollTop, cur: root.querySelector("[data-ppop-cur]").textContent };
          const ev = new KeyboardEvent("keydown", { key, keyCode: kc, isComposing: true, bubbles: true, cancelable: true });
          root.dispatchEvent(ev);
          out.push({ key, dp: ev.defaultPrevented, st: [before.st, pop.scrollTop], cur: [before.cur, root.querySelector("[data-ppop-cur]").textContent], pause: root.querySelector("[data-ppop-pause]").textContent });
        }
        return { aeIsRoot: document.activeElement === root, out };
      });
      return r;
    } finally { await ctx.close(); }
  };
  // reduce: 멈춘 채 시작, 키 스크롤, paintPause 0
  for (const ver of ["head", "old"]) T[`${ver}_reduce`] = async () => {
    const { ctx, page } = await open(ver, 1440, 420, { reduce: true });
    try {
      await page.mouse.move(1, 1);
      const s0 = await st(page); const t0 = await pnow(page);
      await press(page, "ArrowDown", 3, 120);
      const s1 = await st(page); await page.waitForTimeout(9000);
      return { ae0: s0.ae, pause0: s0.pause, st: [s0.pop.st, s1.pop.st], paints: await paintsAfter(page, t0), turns: await turnsAfter(page, t0), pause1: s1.pause };
    } finally { await ctx.close(); }
  };
  // 제목 초점(→ 뒤) 에서 ArrowDown: 브라우저 기본 스크롤, 가로채기 없음
  for (const ver of ["head", "old"]) T[`${ver}_titleFocus`] = async () => {
    const { ctx, page } = await open(ver, 1440, 420, {});
    try {
      await page.mouse.move(1, 1);
      await page.keyboard.press("ArrowRight"); await page.waitForTimeout(700);
      const s0 = await st(page); const t0 = await pnow(page);
      await press(page, "ArrowDown", 3, 150);
      const s1 = await st(page); const kd = await kdAfter(page, t0);
      return { ae: s0.ae, cur: s0.cur, st: [s0.pop.st, s1.pop.st], max: s1.pop.max, dp: kd.map((e) => e.dp), pause: s1.pause };
    } finally { await ctx.close(); }
  };
  for (const ver of ["head", "old"]) T[`${ver}_homeEnd`] = async () => {
    const { ctx, page } = await open(ver, 1440, 420, {});
    try {
      await page.mouse.move(1, 1);
      const a = (await st(page)).pop.st; await page.keyboard.press("End"); await page.waitForTimeout(200); const b = (await st(page)).pop;
      await page.keyboard.press("ArrowDown"); await page.waitForTimeout(100); await page.keyboard.press("Home"); await page.waitForTimeout(200); const c = (await st(page)).pop.st;
      const ae = (await st(page)).ae;
      return { ae, start: a, afterEnd: b.st, max: b.max, afterDownHome: c };
    } finally { await ctx.close(); }
  };
  const out = await runAll(T);
  const v = {
    repeat: Object.fromEntries(["head", "old"].map((ver) => { const r = out[`${ver}_repeat_ArrowDown`]; return [ver, r.error || `ae=${r.ae0} kd=${r.keydowns} rep=${r.repeats} dp=${r.dpCount} paintPause=${r.paintPauseCalls} st 0->${r.st1}/${r.max} pause=${r.pause1} cur ${r.cur0}->${r.cur9_5s} turns=${r.turns}`]; })),
    spaceEnd: out.head_space_shiftspace_end,
    ctrl: Object.fromEntries(Object.entries(out).filter(([k]) => k.startsWith("head_ctrl_")).map(([k, r]) => [k.replace("head_ctrl_", ""), r.error || `ae=${r.ae0} dp=${JSON.stringify(r.dp)} st=${JSON.stringify(r.st)} cur=${JSON.stringify(r.cur)} pause=${JSON.stringify(r.pause)} muted=${JSON.stringify(r.muted)} clicks=${JSON.stringify(r.clicks)} open=${r.open1}`])),
    ime: out.head_ime,
    reduce: { head: out.head_reduce, old: out.old_reduce },
    titleFocus: { head: out.head_titleFocus, old: out.old_titleFocus },
    homeEnd: { head: out.head_homeEnd, old: out.old_homeEnd },
  };
  result.B = { out, v }; save(); log("B", JSON.stringify(v, null, 1));
}

// C resume -----------------------------------------------------------------
if (want("C")) {
  const T = {};
  T.head_mouseResume = async () => {
    const { ctx, page } = await open("head", 1440, 420, {});
    try {
      await page.mouse.move(1, 1);
      await page.keyboard.press("ArrowDown"); await page.waitForTimeout(150);
      const s0 = await st(page);
      await page.screenshot({ path: path.join(SHOTS, "refute_behavior_keypause_1440x420.png") });
      const pb = await page.locator(".pdim [data-ppop-pause]").boundingBox();
      await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 2); await page.mouse.move(1, 1);
      const t0 = await pnow(page); const s1 = await st(page);
      const ms = await waitTurn(page, t0, 9500); await page.waitForTimeout(200);
      const s2 = await st(page); const t1 = await pnow(page);
      await press(page, "ArrowDown", 2, 150);
      const s3 = await st(page); const kd = await kdAfter(page, t1);
      await page.waitForTimeout(8500); const turnsAfterKeys = await turnsAfter(page, t1);
      // 카드 본문(비조작) 클릭 → 초점 → 키 스크롤
      const tb = await page.locator(".pdim .pslot[data-on] .ptxt h2").boundingBox();
      await page.mouse.click(tb.x + 10, tb.y + tb.height / 2); await page.mouse.move(1, 1); await page.waitForTimeout(150);
      const s4 = await st(page);
      await press(page, "ArrowDown", 2, 150); const s5 = await st(page);
      return { afterKey: { pause: s0.pause, st: s0.pop.st }, afterPlayClick: { ae: s1.ae, pause: s1.pause }, firstTurnMs: ms, afterTurn: { cur: s2.cur, ae: s2.ae, st: s2.pop.st, max: s2.pop.max }, keysAfterResume: { ae: s3.ae, st: [s2.pop.st, s3.pop.st], pause: s3.pause, dp: kd.map((e) => e.dp) }, turnsIn9sAfterKeys: turnsAfterKeys, cardClick: { ae: s4.ae, isRoot: s4.aeIsRoot, pause: s4.pause }, keysAfterCardClick: { st: [s4.pop.st, s5.pop.st], pause: s5.pause } };
    } finally { await ctx.close(); }
  };
  T.head_kbdResume = async () => {
    const { ctx, page } = await open("head", 1440, 420, {});
    try {
      await page.mouse.move(1, 1);
      await page.keyboard.press("ArrowDown"); await page.waitForTimeout(150);
      const s0 = await st(page);
      await press(page, "Shift+Tab", 2, 80); const s1 = await st(page);
      await page.keyboard.press("Enter"); const t0 = await pnow(page); const s2 = await st(page);
      const ms = await waitTurn(page, t0, 9500); await page.waitForTimeout(200);
      const t1 = await pnow(page);
      await press(page, "ArrowDown", 2, 150); const s3 = await st(page);
      await page.waitForTimeout(8500);
      return { afterKey: s0.pause, onPause: { ae: s1.ae, pause: s1.pause }, afterEnter: s2.pause, firstTurnMs: ms, afterKeysAe: s3.ae, pauseAfterKeys: s3.pause, turnsIn9sAfterKeys: await turnsAfter(page, t1) };
    } finally { await ctx.close(); }
  };
  const out = await runAll(T, 2);
  result.C = { out }; save(); log("C", JSON.stringify(out, null, 1));
}

// D bar --------------------------------------------------------------------
if (want("D")) {
  const T = {};
  const CTRL = { mute: "[data-ppop-mute-all]", prev: "[data-ppop-prev]", next: "[data-ppop-next]", pause: "[data-ppop-pause]", close: "[data-ppop-close]" };
  for (const ver of ["head", "old"]) {
    for (const [n, sel] of Object.entries(CTRL)) T[`${ver}_focusin_${n}`] = async () => {
      const { ctx, page } = await open(ver, 1440, 900, {});
      try { await page.mouse.move(1, 1); await page.evaluate((s) => document.querySelector(".pdim " + s).focus(), sel); await page.waitForTimeout(100); const s1 = await st(page); return { ae: s1.ae, pause: s1.pause }; } finally { await ctx.close(); }
    };
    for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) T[`${ver}_pdown_pcnt_${w}`] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try {
        const b = await page.locator(".pdim .pmute").boundingBox();
        // 빈 곳: 체크박스 글자 오른쪽 끝 바깥이 아닌 pcnt 대신 pmute 라벨 = 누르면 체크된다 → pcnt 사용
        const c = await page.locator(".pdim .pcnt").boundingBox();
        if (touch) await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2); else { await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await page.mouse.down(); await page.mouse.up(); await page.mouse.move(1, 1); }
        const t0 = await pnow(page); await page.waitForTimeout(9500);
        const s1 = await st(page);
        return { pause: s1.pause, open: s1.open, muted: s1.muted, turns: await turnsAfter(page, t0), muteBox: [b.x, b.y] };
      } finally { await ctx.close(); }
    };
    // 하단바 정지 단추에 초점 두고 재생 → 넘김 뒤 초점 자리 → Enter 로 다시 정지
    for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) T[`${ver}_barfocus_${w}`] = async () => {
      const { ctx, page } = await open(ver, w, h, { touch });
      try {
        await page.mouse.move(1, 1);
        await press(page, "Shift+Tab", 2, 80); const s0 = await st(page);
        await page.keyboard.press("Enter"); const t0 = await pnow(page);
        const ms = await waitTurn(page, t0, 9500); await page.waitForTimeout(200); const s1 = await st(page);
        await page.keyboard.press("Enter"); const t1 = await pnow(page); await page.waitForTimeout(9300);
        return { onPause: s0.ae, turnMs: ms, afterTurnAe: s1.ae, afterTurnInBar: s1.aeInBar, turnsAfterEnter2: await turnsAfter(page, t1), pause: (await st(page)).pause };
      } finally { await ctx.close(); }
    };
    // 하단바 위에서 시작하는 스와이프(390, CDP touch)
    for (const [n, sel] of Object.entries({ mute: ".pdim .pmute", pcnt: ".pdim .pcnt", close: ".pdim [data-ppop-close]" })) for (const dir of [-1, 1]) T[`${ver}_swipe_${n}_${dir < 0 ? "L" : "R"}`] = async () => {
      const { ctx, page } = await open(ver, 390, 844, { touch: true });
      try {
        const b = await page.locator(sel).boundingBox();
        const x0 = Math.min(Math.max(b.x + b.width / 2, 110), 280), y0 = b.y + b.height / 2;
        const s0 = await st(page); const t0 = await pnow(page);
        const cdp = await ctx.newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
        for (let i = 1; i <= 6; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + dir * 15 * i, y: y0 + i * 0.5 }] }); await page.waitForTimeout(16); }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(700); await cdp.detach().catch(() => {});
        const s1 = await st(page); const clicks = await page.evaluate((t) => window.__clicks.filter((c) => c.t > t).map((c) => c.el), t0);
        return { cur: [s0.cur, s1.cur], open: s1.open, muted: s1.muted, clicks, pause: s1.pause };
      } finally { await ctx.close(); }
    };
  }
  // 측면 카드와 하단바: 하단바 사각형 4px 격자 hit-test 가 하단바 밖을 잡는지, 측면 슬롯 사각형이 하단바를 잡는지, 하단바 좌우 끝 클릭과 측면 카드 아래 끝 클릭
  for (const ver of ["head", "old"]) for (const [w, h, n3] of [[1440, 900, false], [1440, 900, true], [1024, 768, true], [768, 1024, true]]) T[`${ver}_sidebar_${w}x${h}_${n3 ? "n3" : "n2"}`] = async () => {
    const { ctx, page } = await open(ver, w, h, { notices: n3 ? NOTICE3 : null, reduce: true });
    try {
      await page.mouse.move(1, 1);
      const r = await page.evaluate(() => {
        const bar = document.querySelector(".pdim .pbar"), br = bar.getBoundingClientRect();
        const cls = (e) => (!e ? "null" : e.closest(".pbar") ? "pbar" : e.closest(".pslot[data-side]") ? "side" : e.closest(".pslot[data-on]") ? "on" : e.closest(".pback") ? "pback" : e.className);
        const inBar = {}; for (let y = br.top + 1; y < br.bottom - 0.5; y += 4) for (let x = br.left + 1; x < br.right - 0.5; x += 4) { const k = cls(document.elementFromPoint(x, y)); inBar[k] = (inBar[k] || 0) + 1; }
        const sides = [...document.querySelectorAll(".pdim .pslot[data-side]")].map((s) => { const r = s.getBoundingClientRect(); const hits = {}; for (let y = r.top + 1; y < r.bottom - 0.5; y += 6) for (let x = r.left + 1; x < r.right - 0.5; x += 6) { const k = cls(document.elementFromPoint(x, y)); hits[k] = (hits[k] || 0) + 1; } return { d: s.dataset.d, rect: [r.left, r.top, r.right, r.bottom].map((v) => +v.toFixed(1)), hits, op: getComputedStyle(s).opacity }; });
        return { bar: [br.left, br.top, br.right, br.bottom].map((v) => +v.toFixed(1)), inBar, sides };
      });
      // 측면 카드 아래 끝 2px 위 클릭(보이는 측면이 있을 때) → 그 카드로 넘어가고 체크 0
      let sideClick = null;
      const vis = r.sides.find((s) => +s.op > 0.5);
      if (vis) {
        const x = (vis.rect[0] + vis.rect[2]) / 2, y = vis.rect[3] - 2;
        const s0 = await st(page);
        await page.mouse.click(x, y); await page.waitForTimeout(300); const s1 = await st(page);
        sideClick = { at: [x, y], cur: [s0.cur, s1.cur], muted: s1.muted, open: s1.open };
      }
      return { ...r, sideClick };
    } finally { await ctx.close(); }
  };
  const out = await runAll(T);
  const v = {
    focusin: Object.fromEntries(["head", "old"].map((ver) => [ver, Object.fromEntries(Object.keys(CTRL).map((n) => [n, out[`${ver}_focusin_${n}`].pause]))])),
    pointerdown: Object.fromEntries(Object.entries(out).filter(([k]) => k.includes("_pdown_")).map(([k, r]) => [k, r.error || `pause=${r.pause} turns9.5s=${r.turns} muted=${r.muted}`])),
    barfocus: Object.fromEntries(Object.entries(out).filter(([k]) => k.includes("_barfocus_")).map(([k, r]) => [k, r.error || `on=${r.onPause} turn=${r.turnMs} afterTurnAe=${r.afterTurnAe} turnsAfterEnter2=${r.turnsAfterEnter2} pause=${r.pause}`])),
    swipe: Object.fromEntries(Object.entries(out).filter(([k]) => k.includes("_swipe_")).map(([k, r]) => [k, r.error || `cur ${r.cur.join("->")} open=${r.open} muted=${r.muted} clicks=${r.clicks.length} pause=${r.pause}`])),
    sidebar: Object.fromEntries(Object.entries(out).filter(([k]) => k.includes("_sidebar_")).map(([k, r]) => [k, r.error || { inBar: r.inBar, sides: r.sides.map((s) => ({ d: s.d, op: s.op, hits: s.hits })), sideClick: r.sideClick }])),
  };
  result.D = { out, v }; save(); log("D", JSON.stringify(v, null, 1));
}

// E wrap -------------------------------------------------------------------
if (want("E")) {
  const T = {};
  const SEQ = "RRLRLLRRRLRLLLRRLRLR".split("").map((c) => (c === "R" ? "ArrowRight" : "ArrowLeft"));
  const cases = [["head", 1440, 900, { notices: NOTICE3 }, 3], ["head", 1440, 900, { clones: 2 }, 4], ["head", 1920, 1080, { clones: 2 }, 4], ["head", 1920, 1080, { clones: 3 }, 5], ["head", 1920, 1080, { clones: 2, reduce: true }, 4], ["old", 1440, 900, { notices: NOTICE3 }, 3], ["old", 1920, 1080, { clones: 2 }, 4]];
  for (const [ver, w, h, o, N] of cases) T[`${ver}_${w}_N${N}${o.reduce ? "_reduce" : ""}`] = async () => {
    const { ctx, page, errors } = await open(ver, w, h, o);
    try {
      await page.mouse.move(1, 1);
      await page.evaluate(() => {
        const root = document.querySelector(".pdim"), stage = root.querySelector(".pstage");
        const slots = [...root.querySelectorAll(".pslot")];
        const t = () => performance.now();
        const W = { keys: [], viol: [], frames: 0, cross: [], lastActive: slots.map((s) => (s.hasAttribute("data-on") ? t() : -1e9)), prevD: slots.map((s) => s.dataset.d) };
        window.__W = W;
        addEventListener("keydown", (e) => {
          const nw = t();
          const snap = slots.map((s, i) => {
            const d = s.dataset.d, pd = W.prevD[i];
            const jump = pd !== undefined && d !== undefined && Math.abs(Number(d) - Number(pd)) > 1;
            if (jump && s.style.transition !== "none") W.viol.push({ k: W.keys.length, i, pd, d, tr: s.style.transition });
            if (d === "0") W.lastActive[i] = nw;
            W.prevD[i] = d;
            return [d, s.style.transition || "", s.hasAttribute("data-far") ? 1 : 0];
          });
          W.keys.push({ t: +nw.toFixed(1), key: e.key, cur: (root.querySelector("[data-ppop-cur]") || {}).textContent, snap });
        });
        const loop = () => {
          if (!root.isConnected) return;
          const nw = t();
          const sr = stage.getBoundingClientRect(), scx = (sr.left + sr.right) / 2;
          slots.forEach((s, i) => {
            if (s.dataset.d === "0") W.lastActive[i] = nw;
            const r = s.getBoundingClientRect(), cx = (r.left + r.right) / 2, op = +getComputedStyle(s).opacity;
            if (op > 0.05 && Math.abs(cx - scx) < r.width * 0.25 && nw - W.lastActive[i] > 400) W.cross.push({ t: +nw.toFixed(1), i, d: s.dataset.d, dx: +(cx - scx).toFixed(1), op: +op.toFixed(2) });
          });
          W.frames++;
          if (!W.stop) requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
      const t0 = await pnow(page);
      for (const k of SEQ) { await page.keyboard.press(k); await page.waitForTimeout(30); }
      await page.waitForTimeout(900);
      const fin = await page.evaluate((N) => {
        window.__W.stop = true;
        const root = document.querySelector(".pdim"), slots = [...root.querySelectorAll(".pslot")];
        const cur = +root.querySelector("[data-ppop-cur]").textContent - 1;
        const rows = slots.map((s, i) => { let d = i - cur; if (N > 2) { if (d > N / 2) d -= N; else if (d < -N / 2) d += N; } return { i, expD: d, d: s.dataset.d, tr: s.style.transition || "", far: s.hasAttribute("data-far"), on: s.hasAttribute("data-on"), inert: s.firstElementChild.hasAttribute("inert"), op: getComputedStyle(s).opacity, pe: getComputedStyle(s).pointerEvents }; });
        const W = window.__W;
        return { cur: cur + 1, rows, keys: W.keys.length, viol: W.viol, frames: W.frames, cross: W.cross.slice(0, 12), crossN: W.cross.length, crossSlots: [...new Set(W.cross.map((c) => c.i))] };
      }, N);
      const R = SEQ.filter((k) => k === "ArrowRight").length, L = SEQ.length - R;
      const expCur = ((((R - L) % N) + N) % N) + 1;
      // data-far 슬롯 hit-test 와 inert
      const far = await page.evaluate(() => [...document.querySelectorAll(".pdim .pslot[data-far]")].map((s) => { const r = s.getBoundingClientRect(); const x = Math.min(Math.max((r.left + r.right) / 2, 2), innerWidth - 2), y = (r.top + r.bottom) / 2; const e = document.elementFromPoint(x, y); return { d: s.dataset.d, at: [+x.toFixed(0), +y.toFixed(0)], hit: e ? (e.closest(".pslot") === s ? "FAR-SLOT" : window.__desc(e)) : null, inert: s.firstElementChild.hasAttribute("inert"), focusables: s.querySelectorAll("a[href],button,input").length }; }));
      if (ver === "head" && w === 1920 && N === 4 && !o.reduce) await page.screenshot({ path: path.join(SHOTS, "refute_behavior_wrap_1920_n4.png") });
      const residue = fin.rows.filter((r) => r.tr !== "").length;
      const mism = fin.rows.filter((r) => String(r.expD) !== r.d || (Math.abs(r.expD) >= 2) !== r.far || (r.expD === 0) !== r.on || (r.expD !== 0) !== r.inert).length;
      return { N, expCur, cur: fin.cur, residue, mismatch: mism, violations: fin.viol.length, viol: fin.viol.slice(0, 6), frames: fin.frames, crossN: fin.crossN, crossSlots: fin.crossSlots, cross: fin.cross, far, rows: fin.rows, errors: errors.concat(await page.evaluate(() => window.__err)), elapsedMs: +((await pnow(page)) - t0).toFixed(0) };
    } finally { await ctx.close(); }
  };
  const out = await runAll(T, 4);
  const v = Object.fromEntries(Object.entries(out).map(([k, r]) => [k, r.error || `N=${r.N} cur ${r.cur}/${r.expCur} residue=${r.residue} mismatch=${r.mismatch} noneMissing=${r.violations} frames=${r.frames} crossFrames=${r.crossN} crossSlots=${JSON.stringify(r.crossSlots)} far=${JSON.stringify(r.far)} errors=${r.errors.length}`]));
  result.E = { out, v }; save(); log("E", JSON.stringify(v, null, 1));
}

// F close ------------------------------------------------------------------
if (want("F")) {
  const T = {};
  for (const ver of ["head", "old"]) {
    T[`${ver}_baseline`] = async () => {
      const { ctx, page } = await open(ver, 1440, 900, { preShown: true, noWait: true });
      try { return { pdim: await page.evaluate(() => !!document.querySelector(".pdim")), listeners: await listeners(page), ro: await page.evaluate(() => window.__ro) }; } finally { await ctx.close(); }
    };
    for (const how of ["esc", "closeBtn", "backdrop"]) T[`${ver}_close_${how}`] = async () => {
      const { ctx, page, errors } = await open(ver, 1440, 900, {});
      try {
        await page.mouse.move(1, 1);
        const lOpen = await listeners(page);
        const roOpen = await page.evaluate(() => ({ ...window.__ro, cb: window.__ro.cb.length }));
        await page.keyboard.press("ArrowRight"); await page.waitForTimeout(60);   // 전이 중
        if (how === "esc") await page.keyboard.press("Escape");
        else if (how === "closeBtn") await page.locator(".pdim [data-ppop-close]").click();
        else await page.mouse.click(8, 8);
        const tc = await pnow(page);
        await page.waitForTimeout(700);
        const s1 = await st(page); const lClosed = await listeners(page);
        const roClosed = await page.evaluate(() => ({ made: window.__ro.made, observe: window.__ro.observe, disconnect: window.__ro.disconnect, cb: window.__ro.cb.length }));
        for (const [w, h] of [[390, 844], [1024, 600], [1440, 900]]) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(250); }
        const roAfterResize = await page.evaluate((t) => window.__ro.cb.filter((x) => x > t).length, tc);
        const t2 = await pnow(page);
        await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Space"); await page.waitForTimeout(200);
        const kd = await kdAfter(page, t2); const s2 = await st(page);
        const err = errors.concat(await page.evaluate(() => window.__err));
        // 같은 탭 새로고침 = 세션 1회 규칙
        await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(2500);
        const reloadPdim = await page.evaluate(() => !!document.querySelector(".pdim"));
        return { listenersOpen: lOpen, listenersClosed: lClosed, roOpen, roClosed, roCbAfterClose: roAfterResize, closed: { open: s1.open, htmlLocked: s1.htmlLocked, inertBg: s1.inertBg, ae: s1.ae }, afterKeys: { dp: kd.map((e) => e.dp), open: s2.open, scrollY: s2.scrollY }, errors: err, reloadPdim };
      } finally { await ctx.close(); }
    };
    // 오늘 하루 보지 않기 → 닫기 방식별 → 같은 컨텍스트 새 탭. 대조 = 체크 없이 닫기
    for (const how of ["esc", "closeBtn", "backdrop", "none"]) T[`${ver}_mute_${how}`] = async () => {
      const { ctx, page } = await open(ver, 1440, 900, {});
      try {
        await page.mouse.move(1, 1);
        if (how !== "none") { await page.locator(".pdim .pmute").click(); await page.waitForTimeout(100); }
        const muted = (await st(page)).muted;
        if (how === "esc") await page.keyboard.press("Escape"); else if (how === "backdrop") await page.mouse.click(8, 8); else await page.locator(".pdim [data-ppop-close]").click();
        await page.waitForTimeout(300);
        const ls = await page.evaluate(() => localStorage.getItem("hh_popup_mute_v1"));
        const { page: p2 } = await open(ver, 1440, 900, { ctx, noWait: true, settle: 3000 });
        const p2pdim = await p2.evaluate(() => !!document.querySelector(".pdim"));
        return { muted, ls, newTabPopup: p2pdim };
      } finally { await ctx.close(); }
    };
    // 체크 뒤 CTA(의뢰하기) 로 떠남 → 새 탭
    T[`${ver}_mute_cta`] = async () => {
      const { ctx, page } = await open(ver, 1440, 900, {});
      try {
        await page.mouse.move(1, 1);
        await page.locator(".pdim .pmute").click(); await page.waitForTimeout(100);
        await Promise.all([page.waitForNavigation({ timeout: 10000 }).catch(() => {}), page.locator(".pdim .pslot[data-on] a.btn").first().click()]);
        await page.waitForTimeout(500);
        const url = page.url(); const ls = await page.evaluate(() => localStorage.getItem("hh_popup_mute_v1"));
        const { page: p2 } = await open(ver, 1440, 900, { ctx, noWait: true, settle: 3000 });
        return { url, ls, newTabPopup: await p2.evaluate(() => !!document.querySelector(".pdim")) };
      } finally { await ctx.close(); }
    };
  }
  const out = await runAll(T);
  const v = {
    listeners: Object.fromEntries(["head", "old"].map((ver) => [ver, { baseline: out[`${ver}_baseline`].listeners, ...Object.fromEntries(["esc", "closeBtn", "backdrop"].map((h) => [h, out[`${ver}_close_${h}`].error || { open: out[`${ver}_close_${h}`].listenersOpen.document, closed: out[`${ver}_close_${h}`].listenersClosed.document }])) }])),
    ro: Object.fromEntries(["head", "old"].map((ver) => [ver, Object.fromEntries(["esc", "closeBtn", "backdrop"].map((h) => { const r = out[`${ver}_close_${h}`]; return [h, r.error || `made=${r.roClosed.made} disconnect=${r.roClosed.disconnect} cbAfterClose+resize=${r.roCbAfterClose}`]; }))])),
    closedState: Object.fromEntries(Object.entries(out).filter(([k]) => k.includes("_close_")).map(([k, r]) => [k, r.error || `open=${r.closed.open} htmlLocked=${r.closed.htmlLocked} inertBg=${r.closed.inertBg} ae=${r.closed.ae} keysAfter dp=${JSON.stringify(r.afterKeys.dp)} open=${r.afterKeys.open} errors=${r.errors.length} reloadPopup=${r.reloadPdim}`])),
    mute: Object.fromEntries(Object.entries(out).filter(([k]) => k.includes("_mute_")).map(([k, r]) => [k, r.error || `muted=${r.muted} ls=${r.ls ? "set" : "null"} newTabPopup=${r.newTabPopup}${r.url ? " url=" + r.url.replace(BASE, "") : ""}`])),
  };
  result.F = { out, v }; save(); log("F", JSON.stringify(v, null, 1));
}

// G touch resume -----------------------------------------------------------
if (want("G")) {
  const T = {};
  for (const ver of ["head", "old"]) {
    T[`${ver}_pausePlay`] = async () => {
      const { ctx, page } = await open(ver, 390, 844, { touch: true });
      try {
        const pb = page.locator("[data-ppop-pause]");
        await pb.tap(); await page.waitForTimeout(400); const a = (await st(page)).pause;
        await pb.tap(); const t0 = await pnow(page); const b = (await st(page)).pause;
        const ms = await waitTurn(page, t0, 10000); const t1 = await pnow(page); const ms2 = await waitTurn(page, t1, 10000);
        return { afterTap1: a, afterTap2: b, firstTurnMs: ms, secondTurnMs: ms2 };
      } finally { await ctx.close(); }
    };
    T[`${ver}_nextThenPlay`] = async () => {
      const { ctx, page } = await open(ver, 390, 844, { touch: true });
      try {
        await page.locator("[data-ppop-next]").tap(); await page.waitForTimeout(500); const a = await st(page);
        await page.locator("[data-ppop-pause]").tap(); const t0 = await pnow(page);
        return { afterNext: { cur: a.cur, pause: a.pause }, firstTurnMs: await waitTurn(page, t0, 10000) };
      } finally { await ctx.close(); }
    };
    T[`${ver}_cardTapThenPlay`] = async () => {
      const { ctx, page } = await open(ver, 390, 844, { touch: true });
      try {
        const b = await page.locator(".pdim .pslot[data-on] .pop h2").boundingBox();
        await page.touchscreen.tap(b.x + 10, b.y + b.height / 2); await page.waitForTimeout(500); const a = await st(page);
        await page.locator("[data-ppop-pause]").tap(); const t0 = await pnow(page);
        return { afterCardTap: { pause: a.pause, ae: a.ae }, firstTurnMs: await waitTurn(page, t0, 10000) };
      } finally { await ctx.close(); }
    };
  }
  const out = await runAll(T);
  result.G = { out }; save(); log("G", JSON.stringify(out, null, 1));
}

// H resize while open ------------------------------------------------------
if (want("H")) {
  const T = {};
  for (const ver of ["head", "old"]) for (const [[w0, h0], [w1, h1], touch] of [[[1440, 420], [390, 420], false], [[390, 844], [844, 390], true], [[1440, 900], [320, 256], false], [[390, 420], [1440, 420], false]]) T[`${ver}_${w0}x${h0}_to_${w1}x${h1}`] = async () => {
    const { ctx, page, errors } = await open(ver, w0, h0, { touch });
    try {
      await page.mouse.move(1, 1);
      const m = () => page.evaluate(() => { const root = document.querySelector(".pdim"), bar = root.querySelector(".pbar"), pop = root.querySelector(".pslot[data-on] > .pop"); const br = bar.getBoundingClientRect(), pr = pop.getBoundingClientRect(); return { vh: innerHeight, barTop: +br.top.toFixed(1), barBottom: +br.bottom.toFixed(1), barH: bar.offsetHeight, pbarH: root.style.getPropertyValue("--pbar-h") || null, popTop: +pr.top.toFixed(1), popMaxH: getComputedStyle(pop).maxHeight, inView: br.bottom <= innerHeight + 0.5 && pr.top >= -0.5 }; });
      const a = await m();
      await page.setViewportSize({ width: w1, height: h1 }); await page.waitForTimeout(500);
      const b = await m();
      return { before: a, after: b, pbarMatches: b.pbarH === null ? null : b.pbarH === b.barH + "px", errors: errors.concat(await page.evaluate(() => window.__err)), roCb: await page.evaluate(() => window.__ro.cb.length) };
    } finally { await ctx.close(); }
  };
  const out = await runAll(T);
  const v = Object.fromEntries(Object.entries(out).map(([k, r]) => [k, r.error || `after: bar ${r.after.barTop}-${r.after.barBottom}/${r.after.vh} barH=${r.after.barH} --pbar-h=${r.after.pbarH} popTop=${r.after.popTop} inView=${r.after.inView} errors=${r.errors.length}`]));
  result.H = { out, v }; save(); log("H", JSON.stringify(v, null, 1));
}

// I extras: 재생 뒤 키(old 대조), N=1 틀 초점, 뒤로 가기(bfcache) ---------------------------
if (want("I")) {
  const T = {};
  const realCfg = await (await fetch(APIB + "/api/config")).json();
  for (const ver of ["head", "old"]) {
    // 마우스로 정지 → 재생 뒤 ArrowDown 2회: 스크롤, 정지 여부, 9초 넘김 수
    T[`${ver}_resumeThenKeys`] = async () => {
      const { ctx, page } = await open(ver, 1440, 420, {});
      try {
        const pb = await page.locator(".pdim [data-ppop-pause]").boundingBox();
        const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
        await page.mouse.click(cx, cy); await page.waitForTimeout(150); await page.mouse.click(cx, cy); await page.mouse.move(1, 1); await page.waitForTimeout(150);
        const s0 = await st(page); const t0 = await pnow(page);
        await press(page, "ArrowDown", 2, 150);
        const s1 = await st(page); const kd = await kdAfter(page, t0);
        await page.waitForTimeout(8800);
        return { ae: s0.ae, pause0: s0.pause, st: [s0.pop.st, s1.pop.st], max: s1.pop.max, dp: kd.map((e) => e.dp), pause1: s1.pause, turnsIn9s: await turnsAfter(page, t0) };
      } finally { await ctx.close(); }
    };
    // N=1(행사 판정 없음 → 의뢰 카드 한 장): 첫 초점, ArrowDown, 본문 클릭 뒤 틀 초점에서 ArrowDown/End
    T[`${ver}_n1`] = async () => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 420 }, locale: "ko-KR" });
      await ctx.addInitScript(INIT);
      await ctx.route((u) => u.origin === APIB && u.pathname === "/api/config", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ ...realCfg, promo: null }) }));
      if (ver === "old") for (const [f, body] of Object.entries(OLD)) await ctx.route(BASE + f, (r) => r.fulfill({ status: 200, contentType: f.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8", body }));
      const { page } = await open(ver, 1440, 420, { ctx });
      const servedSha = await page.evaluate(async () => { const b = await (await fetch("/assets/app.js")).arrayBuffer(); const h = await crypto.subtle.digest("SHA-256", b); return [...new Uint8Array(h)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join(""); });
      try {
        await page.mouse.move(1, 1);
        const s0 = await st(page);
        await press(page, "ArrowDown", 2, 150); await page.waitForTimeout(400); const s1 = await st(page);
        const b = await page.locator(".pdim .pslot[data-on] .pnote").boundingBox();
        await page.mouse.click(b.x + 10, b.y + 5); await page.mouse.move(1, 1); await page.waitForTimeout(150);
        const s2 = await st(page);
        await page.evaluate(() => { document.querySelector(".pdim .pslot[data-on] > .pop").scrollTop = 0; });
        await press(page, "ArrowDown", 2, 150); const s3 = await st(page);
        await page.keyboard.press("End"); await page.waitForTimeout(150); const s4 = await st(page);
        return { servedSha, slots: await page.evaluate(() => document.querySelectorAll(".pdim .pslot").length), ae0: s0.ae, keysOnTitle: [s0.pop.st, s1.pop.st], max: s1.pop.max, afterTextClick: s2.ae, keysOnRoot: s3.pop.st, endOnRoot: s4.pop.st };
      } finally { await ctx.close(); }
    };
    // CTA 로 떠난 뒤 뒤로 가기: 팝업이 열린 채 복원되는지(bfcache), 벨트와 오류
    T[`${ver}_back`] = async () => {
      const { ctx, page, errors } = await open(ver, 1440, 900, {});
      try {
        await page.mouse.move(1, 1);
        await Promise.all([page.waitForNavigation({ timeout: 10000 }).catch(() => {}), page.locator(".pdim .pslot[data-on] a.btn").first().click()]);
        await page.waitForTimeout(600);
        await page.goBack({ waitUntil: "load" }).catch((e) => errors.push("back " + e.message));
        await page.waitForTimeout(1500);
        const r = await page.evaluate(() => ({ pdim: !!document.querySelector(".pdim"), locked: document.documentElement.classList.contains("ppop-open"), persisted: performance.getEntriesByType("navigation")[0] && performance.getEntriesByType("navigation")[0].type, cur: (document.querySelector(".pdim [data-ppop-cur]") || {}).textContent || null, pause: (document.querySelector(".pdim [data-ppop-pause]") || {}).textContent || null, ae: window.__desc ? window.__desc(document.activeElement) : null }));
        return { ...r, url: page.url().replace(BASE, ""), errors };
      } finally { await ctx.close(); }
    };
  }
  const out = await runAll(T);
  result.I = { out }; save(); log("I", JSON.stringify(out, null, 1));
}

save();
const t = setTimeout(() => process.exit(0), 5000); await browser.close().catch(() => {}); clearTimeout(t);
process.exit(0);
