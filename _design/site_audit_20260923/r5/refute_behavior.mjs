// critic 5회차 반증(렌즈 = 동작과 접근성, 2026-09-23). 대상 HEAD 507edf1, 대조 c342aff(route 로 git show 판 서빙).
//   popup    하단바 안 클릭(오늘 하루 보지 않기 라벨, 닫기, 하단바 빈 곳)과 넘김(→, 측면, 스와이프, 키보드)이 서로 간섭하는지. 1440 마우스, 390 터치, N=2/3
//   a11y     넘긴 뒤 초점과 AX 이름, aria-live 유무, 자동 넘김이 초점을 옮기는지(입력 없이), 정지 단추 label-in-name, ← → 이름,
//            키보드로 → 를 다시 누르려면 Tab 몇 번인지, 390 터치 재개 뒤 넘김 수. 전부 HEAD 와 c342aff 두 판
//   checkout 홈 → (팝업 가이드북 바로가기 | 대학 타일) → 상품 → 담기 → cart → checkout 진입(결제 단추는 누르지 않음). /api/auth/me 만 route 로 회원
//   request  request.html 의뢰서 빈 제출부터 한 칸씩 채우며 오류 문구, aria-invalid, 필드 아래 문구, 초점. 마지막 POST 는 mock 404 와 route 200 두 경우
// 사용: node refute_behavior.mjs [popup|a11y|checkout|request|extra|all] → r5/refute_behavior.json, r5/shots/refute_*.png
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "../../..");
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const OUT = path.join(HERE, "refute_behavior.json");
const STOP = path.join(HERE, ".wf_stop");
const BASE = "http://localhost:8092/";
const APIB = "http://localhost:8799";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const which = process.argv[2] || "all";
const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
const stopped = () => fs.existsSync(STOP);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
const sel = (k) => `.pdim [data-ppop-${k}]`;
const git = (rev, f) => execFileSync("git", ["-C", REPO, "show", rev + ":" + f], { maxBuffer: 64 << 20 }).toString();
const PRE = { "assets/app.js": git("c342aff", "assets/app.js"), "assets/base.css": git("c342aff", "assets/base.css") };
{
  const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
  const served = {};
  for (const f of ["assets/app.js", "assets/base.css", "index.html", "request.html", "cart.html", "checkout.html", "programs/guidebook.html"]) {
    const live = Buffer.from(await (await fetch(BASE + f)).arrayBuffer());
    served[f] = sha(live) === sha(Buffer.from(git("HEAD", f)));
  }
  result.meta = { head: execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]).toString().trim(), at: new Date().toISOString(), servedEqualsHead: served };
}
const NOTICE3 = { items: [{ id: "ntc_probe_n3", title: "프로브 공지: 세 장 순환 확인용 카드", body_md: "세 장 순환과 좌우 측면 카드 클릭을 재려고 route 로 더한 공지입니다." }] };
const MEMBER = { member: { id: "m_probe", name: "프로브회원", email: "probe@example.com", phone: "01012345678" } };

const browser = await chromium.launch({ channel: "chrome", headless: true });
const MUT = () => {
  window.__mut = [];
  const st = document.querySelector(".pdim .pstage");
  new MutationObserver((ms) => ms.forEach((m) => window.__mut.push({ i: +m.target.dataset.i, old: m.oldValue, t: +performance.now().toFixed(1) })))
    .observe(st, { subtree: true, attributes: true, attributeFilter: ["data-on"], attributeOldValue: true });
  window.__focus = [];
  document.addEventListener("focusin", (e) => { const t = e.target; window.__focus.push({ t: +performance.now().toFixed(1), el: t.tagName.toLowerCase() + (t.id ? "#" + t.id : "") }); }, true);
};
async function open(w, o = {}) {
  const h = w >= 600 ? 900 : 844;
  const co = { viewport: { width: w, height: h }, locale: "ko-KR", reducedMotion: o.reduce ? "reduce" : "no-preference" };
  if (w < 600) Object.assign(co, { hasTouch: true, isMobile: true });
  const ctx = await browser.newContext(co);
  if (o.notices) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(o.notices) }));
  if (o.member) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/auth/me", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(MEMBER) }));
  if (o.pre) for (const [f, body] of Object.entries(PRE)) await ctx.route(BASE + f, (r) => r.fulfill({ status: 200, contentType: f.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8", body }));
  // 외부 계측, 결제 SDK 는 끊는다(하네스 소음 제거). 끊은 수는 기록
  const blocked = [];
  await ctx.route((u) => !/^(localhost|127\.0\.0\.1)$/.test(u.hostname) && !(o.allowPg && u.hostname === "cdn.portone.io"), (r) => { blocked.push(new URL(r.request().url()).hostname); r.abort(); });
  const page = await ctx.newPage();
  const errors = [], consoleErr = [], http = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErr.push(m.text().slice(0, 200)); });
  page.on("response", (r) => { const u = r.url(); if (r.status() >= 400 && /localhost/.test(u)) http.push(r.status() + " " + u.replace(/^https?:\/\/localhost:\d+/, "")); });
  const env = { ctx, page, errors, consoleErr, http, blocked };
  if (o.url === null) return env;
  await page.goto(BASE + (o.url || "index.html"), { waitUntil: "networkidle", timeout: 30000 }).catch((e) => errors.push("goto " + e.message));
  await page.addStyleTag({ content: RV });
  if (o.waitPopup !== false) { await page.waitForSelector(".pdim", { timeout: 20000 }); await page.waitForTimeout(o.settle ?? 900); await page.evaluate(MUT); }
  return env;
}
const ST = () => {
  const root = document.querySelector(".pdim");
  if (!root) return { open: false };
  const slots = [...root.querySelectorAll(".pslot")];
  const on = slots.findIndex((s) => s.hasAttribute("data-on"));
  const bar = root.querySelector(".pbar"), ae = document.activeElement;
  const pb = root.querySelector("[data-ppop-pause]"), cur = root.querySelector("[data-ppop-cur]"), mute = root.querySelector("[data-ppop-mute-all]");
  const d = (e) => (e ? e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).join(".") : "") : null);
  return { open: true, n: slots.length, cur: cur ? +cur.textContent : null, on, barSlot: bar ? slots.indexOf(bar.parentElement) : null,
    mute: mute ? mute.checked : null, pause: pb ? pb.textContent + "/" + pb.getAttribute("aria-label") : null, focus: d(ae), focusInDialog: root.contains(ae) };
};
const center = (p, s) => p.evaluate((q) => { const e = document.querySelector(q); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y); return { x: +x.toFixed(1), y: +y.toFixed(1), hit: h ? h.tagName.toLowerCase() + "." + (h.className || "") : null }; }, s);
async function cdpSwipe(p, from, dx) {
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
  for (let k = 1; k <= 6; k++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (dx * k) / 6, y: from.y, id: 1 }] }); await p.waitForTimeout(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach().catch(() => {});
}
async function axOf(page, pred) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach().catch(() => {});
  return nodes.filter((n) => !n.ignored && pred(n)).map((n) => ({ role: n.role && n.role.value, name: n.name && n.name.value, props: (n.properties || []).map((p) => p.name + "=" + JSON.stringify(p.value && p.value.value)) }));
}

// ───────── popup: 하단바 안 클릭과 넘김 간섭 ─────────
async function popupCase(name, w, N, pre, steps) {
  const env = await open(w, { notices: N === 3 ? NOTICE3 : null, pre });
  const { ctx, page, errors } = env;
  const trace = [];
  try {
    trace.push({ step: "load", ...(await page.evaluate(ST)) });
    for (const [label, fn] of steps) {
      await page.evaluate(() => window.__mut && window.__mut.splice(0));
      const info = await fn(page);
      await page.waitForTimeout(750);
      const s = await page.evaluate(ST);
      const mut = await page.evaluate(() => (window.__mut ? window.__mut.splice(0) : []));
      const store = await page.evaluate(() => { try { return localStorage.getItem("hh_popup_mute_v1"); } catch { return "ERR"; } });
      trace.push({ step: label, info: info || null, ...s, newlyOn: mut.filter((m) => m.old === null).map((m) => m.i), muteStore: store });
    }
    return { name, w, N, pre: !!pre, trace, errors };
  } finally { await ctx.close(); }
}
const clickSel = (s) => async (p) => { const c = await center(p, s); await p.mouse.click(c.x, c.y); return c; };
const tapSel = (s) => async (p) => { const c = await center(p, s); await p.touchscreen.tap(c.x, c.y); return c; };
const barBlank = async (p) => {
  // 하단바 안에서 자식이 아닌 점(하단바 자신이 맞는 점)을 찾는다
  const pt = await p.evaluate(() => {
    const bar = document.querySelector(".pdim .pbar"), r = bar.getBoundingClientRect();
    for (let y = r.top + 2; y < r.bottom - 1; y += 3) for (let x = r.left + 2; x < r.right - 1; x += 3) { const h = document.elementFromPoint(x, y); if (h === bar) return { x, y }; }
    return null;
  });
  if (pt) await p.mouse.click(pt.x, pt.y);
  return pt;
};
const sideClick = (dir) => async (p) => {
  const t = await p.evaluate((d) => { const s = document.querySelector(`.pdim .pslot[data-side="${d}"]`); if (!s) return null; const r = s.getBoundingClientRect(); const x = Math.min(Math.max(r.left + r.width / 2, 4), innerWidth - 4), y = r.top + r.height / 2; const h = document.elementFromPoint(x, y); return { i: +s.dataset.i, x, y, hit: h && h.closest(".pslot") ? +h.closest(".pslot").dataset.i : null }; }, dir);
  if (t) await p.mouse.click(t.x, t.y);
  return t;
};
async function runPopup() {
  const cases = [];
  for (const pre of [false, true]) {
    cases.push(await popupCase("label_click_1440", 1440, 2, pre, [["click label", clickSel(".pdim label.pmute")], ["click label again", clickSel(".pdim label.pmute")]]));
    cases.push(await popupCase("next_label_close_1440", 1440, 2, pre, [["click next", clickSel(sel("next"))], ["click label", clickSel(".pdim label.pmute")], ["click close", clickSel(sel("close"))]]));
    cases.push(await popupCase("next_close_1440", 1440, 2, pre, [["click next", clickSel(sel("next"))], ["click close", clickSel(sel("close"))]]));
    cases.push(await popupCase("next_pause_blank_1440", 1440, 2, pre, [["click next", clickSel(sel("next"))], ["click pause", clickSel(sel("pause"))], ["click bar blank", barBlank], ["click side", sideClick("-1")], ["click bar blank", barBlank]]));
    cases.push(await popupCase("n3_side_label_prev_1440", 1440, 3, pre, [["click left side", sideClick("-1")], ["click label", clickSel(".pdim label.pmute")], ["click prev", clickSel(sel("prev"))], ["click right side", sideClick("1")]]));
    cases.push(await popupCase("tap_label_next_390", 390, 2, pre, [["tap label", tapSel(".pdim label.pmute")], ["tap next", tapSel(sel("next"))], ["tap label", tapSel(".pdim label.pmute")]]));
    cases.push(await popupCase("swipe_from_label_390", 390, 2, pre, [["swipe -80 from label", async (p) => { const c = await center(p, ".pdim label.pmute"); await cdpSwipe(p, c, -80); return c; }]]));
    cases.push(await popupCase("swipe_from_close_390", 390, 2, pre, [["swipe -80 from 닫기", async (p) => { const c = await center(p, sel("close")); await cdpSwipe(p, c, -80); return c; }]]));
    cases.push(await popupCase("swipe_from_next_390", 390, 3, pre, [["swipe +80 from →", async (p) => { const c = await center(p, sel("next")); await cdpSwipe(p, c, 80); return c; }]]));
    cases.push(await popupCase("kbd_space_mute_arrow_1440", 1440, 2, pre, [["focus mute + Space", async (p) => { await p.focus(".pdim [data-ppop-mute-all]"); await p.keyboard.press("Space"); }], ["ArrowRight", (p) => p.keyboard.press("ArrowRight")], ["Enter on close", async (p) => { await p.focus(sel("close")); await p.keyboard.press("Enter"); }]]));
    if (stopped()) break;
  }
  // 판정: 라벨/닫기/빈 곳 클릭은 cur 불변, 넘김은 기대 방향 1칸, 라벨은 체크 토글, 스와이프는 체크 불변과 열린 상태 유지
  const judge = (c) => {
    const bad = [];
    for (let k = 1; k < c.trace.length; k++) {
      const a = c.trace[k - 1], b = c.trace[k], st = b.step;
      if (!b.open) { if (!/close/.test(st)) bad.push(st + ": closed"); continue; }
      if (/label|blank|pause|Space/.test(st) && !/swipe/.test(st)) { if (b.cur !== a.cur || b.newlyOn.length) bad.push(st + `: cur ${a.cur}->${b.cur}`); }
      if (/label/.test(st) && !/swipe/.test(st) && b.mute === a.mute) bad.push(st + ": mute not toggled");
      if (/Space/.test(st) && b.mute !== true) bad.push(st + ": mute not checked");
      if (/swipe/.test(st) && b.mute !== a.mute) bad.push(st + ": mute toggled by swipe");
      if (/next|ArrowRight|swipe -80/.test(st) && b.cur !== (a.cur % c.N) + 1) bad.push(st + `: expected ${(a.cur % c.N) + 1} got ${b.cur}`);
      if (/prev|swipe \+80/.test(st) && b.cur !== ((a.cur - 2 + c.N) % c.N) + 1) bad.push(st + `: prev expected got ${b.cur}`);
      if (/side/.test(st) && b.info && b.cur !== b.info.i + 1) bad.push(st + `: side expected ${b.info.i + 1} got ${b.cur}`);
      if (b.open && b.barSlot !== b.on) bad.push(st + ": bar not in active slot");
    }
    const last = c.trace.at(-1);
    if (c.trace.some((t) => /close/.test(t.step))) {
      if (last.open) bad.push("close did not close");
      const checkedAtClose = c.trace.at(-2).mute;
      if (checkedAtClose && !last.muteStore) bad.push("mute checked but not stored");
      if (!checkedAtClose && last.muteStore) bad.push("mute stored without check");
    }
    if (c.errors.length) bad.push("pageerror " + c.errors.join("|"));
    return bad;
  };
  cases.forEach((c) => { c.bad = judge(c); c.pass = c.bad.length === 0; });
  result.popup = { cases, summary: cases.map((c) => `${c.pre ? "c342aff" : "HEAD"} ${c.name}: ${c.pass ? "PASS" : "FAIL " + c.bad.join("; ")} | ` + c.trace.map((t) => `${t.step}=>${t.open ? t.cur + (t.mute ? "✓" : "") : "closed"}`).join(" , ")) };
  save();
  result.popup.summary.forEach((l) => log(l));
}

// ───────── a11y ─────────
async function runA11y() {
  const out = {};
  for (const pre of [false, true]) {
    const tag = pre ? "c342aff" : "HEAD";
    // 1 넘긴 뒤 초점, AX, live 영역
    {
      const { ctx, page, errors } = await open(1440, { pre });
      const live = await page.evaluate(() => [...document.querySelectorAll(".pdim [aria-live], .pdim [role=status], .pdim [role=alert], .pdim [role=log]")].map((e) => e.outerHTML.slice(0, 80)));
      const dialog = await page.evaluate(() => { const d = document.querySelector(".pdim"); return { role: d.getAttribute("role"), modal: d.getAttribute("aria-modal"), label: d.getAttribute("aria-label"), roledesc: d.querySelectorAll("[aria-roledescription]").length }; });
      const loadFocus = await page.evaluate(ST);
      await page.click(sel("next")); await page.waitForTimeout(700);
      const afterNext = await page.evaluate(ST);
      const axFocused = await axOf(page, (n) => (n.properties || []).some((p) => p.name === "focused" && p.value && p.value.value === true));
      const btns = await axOf(page, (n) => n.role && n.role.value === "button" && n.name && /자동 넘김|이전 안내|다음 안내|닫기/.test(n.name.value));
      const vis = await page.evaluate(() => [...document.querySelectorAll(".pdim .pbar button")].map((b) => ({ text: b.textContent.trim(), label: b.getAttribute("aria-label") })));
      // 음성 명령 대용: 보이는 글자로 역할 조회(부분 일치 = 기본, 완전 일치)
      const byVisible = {};
      for (const t of ["정지", "재생", "닫기"]) byVisible[t] = { substring: await page.getByRole("button", { name: t }).count(), exact: await page.getByRole("button", { name: t, exact: true }).count() };
      // 키보드: → 를 다시 누르려면 h2 에서 Tab 몇 번
      let tabs = null;
      for (let k = 1; k <= 12; k++) { await page.keyboard.press("Tab"); const f = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-ppop-next")); if (f) { tabs = k; break; } }
      out[tag + "_turn"] = { live, dialog, loadFocus: loadFocus.focus, afterNext: { cur: afterNext.cur, focus: afterNext.focus }, axFocused, btns, vis, byVisible, tabsFromTitleToNext: tabs, errors };
      await ctx.close();
    }
    // 2 입력 없이 자동 넘김이 초점을 옮기는지(1440, 마우스 이동 0, 키 0). 18초
    {
      const { ctx, page, errors } = await open(1440, { pre, settle: 100 });
      const t0 = await page.evaluate(() => performance.now());
      await page.waitForTimeout(18000);
      const s = await page.evaluate(ST);
      const focus = await page.evaluate(() => window.__focus.slice());
      const mut = await page.evaluate(() => window.__mut.filter((m) => m.old === null));
      out[tag + "_autofocus"] = { t0: +t0.toFixed(0), focusMoves: focus.map((f) => ({ ...f, dt: +(f.t - t0).toFixed(0) })), turns: mut.map((m) => ({ i: m.i, dt: +(m.t - t0).toFixed(0) })), end: { cur: s.cur, focus: s.focus, pause: s.pause }, errors };
      await ctx.close();
    }
    // 3 390 터치: 정지 탭 → 재생 탭 → 10초 관찰
    {
      const { ctx, page, errors } = await open(390, { pre });
      await page.tap(sel("pause")); await page.waitForTimeout(400);
      const a = await page.evaluate(ST);
      await page.tap(sel("pause")); await page.waitForTimeout(200);
      const b = await page.evaluate(ST);
      await page.evaluate(() => window.__mut.splice(0));
      await page.waitForTimeout(10000);
      const c = await page.evaluate(ST);
      const turns = await page.evaluate(() => window.__mut.filter((m) => m.old === null).length);
      out[tag + "_touchResume390"] = { afterFirstTap: a.pause, afterSecondTap: b.pause, after10s: { cur: c.cur, pause: c.pause }, turnsIn10s: turns, errors };
      await ctx.close();
    }
    if (stopped()) break;
  }
  result.a11y = out; save();
  log(JSON.stringify(out, null, 1).slice(0, 6000));
}

// ───────── checkout 스모크 ─────────
async function runCheckout() {
  const out = {};
  for (const [name, w, route] of [["popup_link_1440", 1440, "popup"], ["tile_1440", 1440, "tile"], ["popup_link_390", 390, "popup"], ["tile_390", 390, "tile"]]) {
    const env = await open(w, { url: null, member: true, allowPg: true });
    const { ctx, page, errors, consoleErr, http, blocked } = env;
    const steps = [];
    const note = async (s, extra = {}) => steps.push({ s, url: page.url().replace(BASE, "/"), ...extra });
    try {
      await page.goto(BASE + "index.html", { waitUntil: "networkidle" });
      await page.waitForSelector(".pdim", { timeout: 20000 }); await page.waitForTimeout(900);
      if (route === "popup") {
        // 행사 카드가 활성이 될 때까지 → (최대 N 회)
        for (let k = 0; k < 3; k++) { const ok = await page.evaluate(() => !!document.querySelector(".pdim .pslot[data-on] [data-ppop-go=guidebook]")); if (ok) break; if (w < 600) await page.tap(sel("next")); else await page.click(sel("next")); await page.waitForTimeout(700); }
        const link = page.locator(".pdim .pslot[data-on] [data-ppop-go=guidebook]");
        await note("popup link visible", { visible: await link.isVisible() });
        await Promise.all([page.waitForURL(/programs\/guidebook\.html/, { timeout: 15000 }), w < 600 ? link.tap() : link.click()]);
      } else {
        await page.keyboard.press("Escape"); await page.waitForTimeout(300);
        const tile = page.locator("#tiles a", { hasText: "경희" }).first();
        await tile.scrollIntoViewIfNeeded();
        await Promise.all([page.waitForURL(/guidebook\/khu\.html/, { timeout: 15000 }), w < 600 ? tile.tap() : tile.click()]);
      }
      await page.waitForLoadState("networkidle"); await page.addStyleTag({ content: RV });
      await note("product page");
      if (route === "popup") {
        await page.selectOption("#buy select", "guide-khu").catch(async (e) => { await note("select failed " + e.message.slice(0, 80)); });
        const btn = page.locator("#buy [data-cart-sku]");
        await btn.scrollIntoViewIfNeeded();
        const bi = await btn.evaluate((b) => ({ sku: b.dataset.cartSku, price: b.dataset.cartPrice, text: b.textContent.trim(), disabled: b.disabled }));
        w < 600 ? await btn.tap() : await btn.click();
        await page.waitForTimeout(400);
        const status = await page.locator("#buy [role=status]").textContent();
        const cartLinkVisible = await page.locator("#buy [data-cart-link]").isVisible();
        await note("added", { bi, status, cartLinkVisible });
        const cl = page.locator("#buy [data-cart-link]");
        await Promise.all([page.waitForURL(/cart\.html/, { timeout: 15000 }), w < 600 ? cl.tap() : cl.click()]);
      } else {
        const btn = page.locator("[data-cart-sku=guide-khu]").first();
        await btn.scrollIntoViewIfNeeded();
        w < 600 ? await btn.tap() : await btn.click();
        await page.waitForTimeout(400);
        const toast = await page.evaluate(() => [...document.querySelectorAll("[role=status],[aria-live]")].map((e) => (e.textContent || "").trim()).filter(Boolean).slice(0, 4));
        await note("added", { toast, cart: await page.evaluate(() => HH.cart().map((x) => x.sku + ":" + x.price)) });
        const cl = page.locator("a.btn.ghost[href='../cart.html']").first();
        await cl.scrollIntoViewIfNeeded();
        await Promise.all([page.waitForURL(/cart\.html/, { timeout: 15000 }), w < 600 ? cl.tap() : cl.click()]);
      }
      await page.waitForLoadState("networkidle"); await page.waitForTimeout(400);
      const cartInfo = await page.evaluate(() => ({ rows: document.querySelectorAll("#cartRows li").length, total: document.getElementById("billTotal").textContent, go: { tag: document.getElementById("toCheckout").tagName, href: document.getElementById("toCheckout").getAttribute("href"), ariaDisabled: document.getElementById("toCheckout").getAttribute("aria-disabled") }, items: HH.cart().map((x) => x.sku + ":" + x.price + "/" + x.list_price) }));
      await note("cart", cartInfo);
      const go = page.locator("#toCheckout");
      await go.scrollIntoViewIfNeeded();
      await Promise.all([page.waitForURL(/checkout\.html/, { timeout: 15000 }), w < 600 ? go.tap() : go.click()]);
      await page.waitForLoadState("networkidle"); await page.waitForTimeout(1200);
      const co1 = await page.evaluate(() => ({ notice: !!document.querySelector(".hh-popup[role=dialog]"), focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName), payBtn: { text: document.getElementById("payBtn").textContent, disabled: document.getElementById("payBtn").disabled }, total: document.getElementById("sumTotal").textContent, auth: document.getElementById("authStatus") && !document.getElementById("authStatus").hidden ? document.getElementById("authStatus").textContent : null }));
      await note("checkout loaded", co1);
      const shot = path.join(SHOTS, `refute_checkout_${name}.png`);
      await page.screenshot({ path: shot });
      if (co1.notice) { const ok = page.locator("#gbNoticeOk"); w < 600 ? await ok.tap() : await ok.click(); await page.waitForTimeout(500); }
      const co2 = await page.evaluate(() => ({ notice: !!document.querySelector(".hh-popup[role=dialog]"), focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName), payBtn: { text: document.getElementById("payBtn").textContent, disabled: document.getElementById("payBtn").disabled }, pm: (document.getElementById("payment-method") || {}).textContent, msgs: [...document.querySelectorAll(".msgs,[role=alert]")].map((e) => e.textContent.trim()).filter(Boolean) }));
      await note("after notice ack", co2);
    } catch (e) { steps.push({ s: "EXC " + e.message.slice(0, 200), url: page.url() }); }
    out[name] = { steps, errors, consoleErr, http, blockedHosts: [...new Set(blocked)] };
    await ctx.close();
    if (stopped()) break;
  }
  result.checkout = out; save();
  log(JSON.stringify(out, null, 1).slice(0, 8000));
}

// ───────── request 의뢰서 검증 ─────────
async function runRequest() {
  const out = {};
  for (const [w, post] of [[1440, "mock"], [390, "mock"], [1440, "ok200"]]) {
    const env = await open(w, { url: null });
    const { ctx, page, errors, consoleErr, http } = env;
    if (post === "ok200") await ctx.route((u) => u.origin === APIB && u.pathname === "/api/service-requests", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ id: "RQ-PROBE-1" }) }));
    await page.goto(BASE + "request.html#form", { waitUntil: "networkidle" }); await page.addStyleTag({ content: RV });
    const snap = () => page.evaluate(() => {
      const ae = document.activeElement;
      const fes = [...document.querySelectorAll("#reqForm .fe")].filter((p) => !p.hidden).map((p) => p.id + ":" + p.textContent);
      const inv = [...document.querySelectorAll("#reqForm [aria-invalid=true]")].map((e) => e.id);
      const fe = ae && ae.getAttribute("aria-describedby") ? document.getElementById(ae.getAttribute("aria-describedby")) : null;
      return { msg: document.getElementById("rqMsg").textContent, focus: ae && ae.id, invalid: inv, fes, focusDescribedText: fe && !fe.hidden ? fe.textContent : null, sendDisabled: document.getElementById("rqSend").disabled, formHidden: document.getElementById("reqForm").hidden, done: !document.getElementById("rqDone").hidden, doneFocus: ae && ae.id === "rqDone" };
    });
    const send = async () => { const b = page.locator("#rqSend"); await b.scrollIntoViewIfNeeded(); w < 600 ? await b.tap() : await b.click(); await page.waitForTimeout(500); return snap(); };
    const seq = [];
    seq.push(["empty", await send()]);
    await page.fill("#rqName", "프로브"); seq.push(["name", await send()]);
    await page.fill("#rqPhone", "010"); seq.push(["phone short", await send()]);
    await page.fill("#rqPhone", "010-1234-5678"); await page.fill("#rqEmail", "abc"); seq.push(["email bad", await send()]);
    await page.fill("#rqEmail", ""); seq.push(["email empty ok", await send()]);
    await page.fill("#rqUni1", "고려대학교"); seq.push(["uni", await send()]);
    await page.selectOption("#rqStatus", "nsu"); seq.push(["status nsu", await send()]);
    await page.fill("#rqSchool", "가나고등학교"); seq.push(["school", await send()]);
    const agree = page.locator("#rqAgree"); w < 600 ? await agree.tap() : await agree.check();
    seq.push(["agree -> POST", await send()]);
    // AX: 오류 상태 필드의 이름과 설명
    const axName = await axOf(page, (n) => n.role && ["textbox", "combobox", "checkbox"].includes(n.role.value) && n.name && /이름|휴대전화|지원 학교 1|구분|고교|수집/.test(n.name.value));
    out[`${w}_${post}`] = { seq: seq.map(([k, v]) => ({ k, ...v })), ax: axName, errors, consoleErr, http };
    const shot = path.join(SHOTS, `refute_request_${w}_${post}.png`);
    await page.screenshot({ path: shot });
    await ctx.close();
    if (stopped()) break;
  }
  result.request = out; save();
  for (const [k, v] of Object.entries(out)) { log("== " + k); v.seq.forEach((s) => log(`  ${s.k}: msg=「${s.msg}」 focus=${s.focus} invalid=${s.invalid} fes=${s.fes.join("|")} disabled=${s.sendDisabled} done=${s.done}`)); log("  errors=" + v.errors.length + " console=" + v.consoleErr.length + " http=" + v.http.join(",")); }
}

// ───────── extra: 의뢰 실패 뒤 초점, 팝업 CTA 이동, 390 자동 넘김 초점 이동 ─────────
async function runExtra() {
  const out = {};
  // a 의뢰서 POST 실패(mock 404) 뒤 초점: 단추 클릭 vs 입력칸 Enter. HEAD 와 c342aff(request.html 은 두 판 같음 여부 기록)
  out.requestSameInC342 = git("c342aff", "request.html").split("<script>").slice(-1)[0] === git("HEAD", "request.html").split("<script>").slice(-1)[0];
  for (const how of ["click", "enter"]) {
    const { ctx, page } = await open(1440, { url: null });
    await page.goto(BASE + "request.html#form", { waitUntil: "networkidle" });
    await page.fill("#rqName", "프로브"); await page.fill("#rqPhone", "010-1234-5678"); await page.fill("#rqUni1", "고려대학교");
    await page.selectOption("#rqStatus", "hs3"); await page.fill("#rqSchool", "가나고등학교"); await page.check("#rqAgree");
    if (how === "click") await page.click("#rqSend"); else { await page.focus("#rqSchool"); await page.keyboard.press("Enter"); }
    await page.waitForTimeout(800);
    const s = await page.evaluate(() => ({ msg: document.getElementById("rqMsg").textContent, ae: document.activeElement.tagName.toLowerCase() + (document.activeElement.id ? "#" + document.activeElement.id : ""), disabled: document.getElementById("rqSend").disabled }));
    await page.keyboard.press("Tab");
    const next = await page.evaluate(() => { const a = document.activeElement; return a.tagName.toLowerCase() + (a.id ? "#" + a.id : "") + " " + (a.textContent || "").trim().slice(0, 20); });
    out["requestFail_" + how] = { ...s, afterTab: next };
    await ctx.close();
  }
  // b 팝업 의뢰하기 → request.html#form
  for (const w of [1440, 390]) {
    const { ctx, page, errors } = await open(w);
    const cta = page.locator(".pdim .pslot[data-on] [data-ppop-go=request]");
    const has = await cta.count();
    if (has) await Promise.all([page.waitForURL(/request\.html/, { timeout: 15000 }).catch(() => {}), w < 600 ? cta.tap() : cta.click()]);
    await page.waitForTimeout(600);
    out["cta_request_" + w] = { had: has, url: page.url().replace(BASE, "/"), formInView: await page.evaluate(() => { const f = document.getElementById("form"); if (!f) return null; const r = f.getBoundingClientRect(); return { top: Math.round(r.top), vis: r.top < innerHeight && r.bottom > 0 }; }), errors };
    await ctx.close();
  }
  // c 390 입력 없이 20초: 초점 이동
  for (const pre of [false, true]) {
    const { ctx, page } = await open(390, { pre, settle: 100 });
    const t0 = await page.evaluate(() => performance.now());
    await page.waitForTimeout(20000);
    const f = await page.evaluate(() => window.__focus.slice());
    out[(pre ? "c342aff" : "HEAD") + "_autofocus390"] = f.map((x) => ({ el: x.el, dt: Math.round(x.t - t0) }));
    await ctx.close();
  }
  // d 비회원(401) 장바구니 → checkout: 로그인 안내가 서는지
  for (const w of [1440, 390]) {
    const { ctx, page, errors } = await open(w, { url: null });
    await ctx.route((u) => u.origin === APIB && u.pathname === "/api/auth/me", (r) => r.fulfill({ status: 401, headers: CORS, body: JSON.stringify({ error: "unauthorized" }) }));
    await page.goto(BASE + "guidebook/khu.html", { waitUntil: "networkidle" });
    await page.evaluate(() => HH.addToCart({ sku: "guide-khu", title: "경희대학교 2027 면접 가이드북", price: 33000, qty: 1, ship: false }));
    await page.goto(BASE + "cart.html", { waitUntil: "networkidle" });
    const go = page.locator("#toCheckout");
    await Promise.all([page.waitForURL(/checkout\.html/, { timeout: 15000 }), w < 600 ? go.tap() : go.click()]);
    await page.waitForLoadState("networkidle"); await page.waitForTimeout(600);
    out["guest_checkout_" + w] = await page.evaluate(() => { const a = document.querySelector("#main a[href='login.html?next=checkout.html']"); const r = a && a.getBoundingClientRect(); return { login: a ? a.getAttribute("href") : null, loginVisible: !!(r && r.width && r.height), layHidden: getComputedStyle(document.querySelector(".lay")).display === "none", notice: !!document.querySelector(".hh-popup") }; });
    out["guest_checkout_" + w].errors = errors;
    await ctx.close();
  }
  result.extra = out; save();
  log(JSON.stringify(out, null, 1));
}

const t = setTimeout(() => { log("TIMEOUT"); process.exit(2); }, 15 * 60 * 1000);
try {
  if (stopped()) { log("STOP"); }
  else {
    if (which === "popup" || which === "all") await runPopup();
    if (!stopped() && (which === "a11y" || which === "all")) await runA11y();
    if (!stopped() && (which === "checkout" || which === "all")) await runCheckout();
    if (!stopped() && (which === "request" || which === "all")) await runRequest();
    if (!stopped() && (which === "extra" || which === "all")) await runExtra();
  }
} finally {
  clearTimeout(t);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
  process.exit(0);
}
