// critic 6회차 프로브 popnav (2026-09-23): 3d2ada3 (하단바 = 무대 둘째 행 고정 + N>1 첫 초점 = 대화상자 틀) 검증. 라이브 = 94f577b.
//   r5/probe_popnav.mjs 복사본. 바꾼 것 = 산출 경로(r6/) 와 「하단바 위치」 기대: 5회차 「하단바 = 활성 슬롯 안」 →
//   이번 「하단바 = .pstage 직계 자식, 하단바 top = 활성 .pop bottom(±0.5px), 넘겨도 하단바 rect 불변」.
//   더한 것 = sweep 간격 50ms 와 넘김 수 계수, restpos 빈 공간과 short_390 캡처, focus(초점 모델), short(짧은 화면 5종), visual 하단바 rAF 이동량.
//   1 nav     넘김 경로 전수 × 1440/390 × 모션 기본/reduce × N=2/N=3 (N=3 = 공지 1건을 route 로 더함). 경로마다 새 컨텍스트.
//             전후 [data-ppop-cur], MutationObserver(attributeOldValue) 로 한 동작 안 data-on 이 새로 붙은 슬롯 순서(되돌아감 = 2개 이상이거나 기대와 다름),
//             조작 뒤 activeElement(새 활성 카드 제목인지, inert 안인지), 레이아웃(활성 1, 측면 N-1, 하단바 = 무대 직계, 측면 .pop 만 inert), 700ms 뒤 늦은 변화,
//             하단바 top = 활성 .pop bottom(700ms 뒤), 하단바 rect 조작 전후 불변
//   2 seq     → 3회 / ← 3회 연속(650ms 간격) 순환, 빠른 연타 50ms × 3 (키, 스크립트 el.click, 단추 현재 위치 강제 클릭/탭, 고정 좌표 실마우스/탭)
//   2b sweep  고정 좌표 실포인터 2회/3회 × 간격 100~700ms (seq 의 fixed_mouse/fixed_tap 결함 범위) + 넘김 중 같은 좌표 hit-test 시간표
//   2c restpos 카드별 → 단추 정지 위치(카드 높이에 따라 하단바가 오르내리는 폭)
//   3 pause   정지 단추 표기, aria-label, aria-pressed 부재, CDP 접근성 트리, 9.5초 고정, 재개 뒤 8초 넘김(마우스 치움, 호버 유지, 키보드, 390 탭), ←/→ 뒤 표기와 실제 멈춤
//   4 n1      /api/config promo null, 만료 → 의뢰 카드 1장. 하단바 구성, 접합(dsf3 픽셀), ArrowRight 무반응
//   5 visual  → 1회 뒤 1440, 탭 1회 뒤 390, 접합 dsf3 crop + 픽셀 열 스캔(python PIL), 측면 radius, 넘김 전이 0/150/300/500ms
//             (Web Animations pause 후 currentTime 고정) 진행률 표 + rAF 실시간 표본, reduce 전이 0
//   6 close   닫기, ESC, 딤 클릭(1440 마우스, 390 탭), 오늘 하루 보지 않기 → 같은 탭 새로고침과 같은 컨텍스트 새 탭(대조군 = 체크 없이 닫기)
//   7 focus   (신규) N=2 첫 초점 = .pdim(role=dialog, 「안내 2건」, CDP 초점 노드), 자동 넘김 20초 focusin, Tab 첫 이동, Tab/Shift+Tab 순환,
//             초점이 카드 안에 들면 벨트 정지, ESC 뒤 여는 앞 요소로 복귀, N=1 첫 초점 = 카드 제목
//   8 short   (신규) 390x640, 360x640, 844x390(가로 폰), 1440x600, 1280x720 × N=2/N=3 × 카드별: 하단바 뷰포트 안, 카드 max-height 안 스크롤, 측면 카드와 하단바 겹침
// 사용: node probe_popnav.mjs [nav|seq|sweep|restpos|pause|n1|visual|close|focus|short|all]  → r6/popnav.json (구획별 병합), r6/shots/popnav_*.png
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
const OUT = path.join(HERE, "popnav.json");
const STOP = path.join(HERE, ".wf_stop");
const BASE = "http://localhost:8092/";
const APIB = "http://localhost:8799";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const which = process.argv[2] || "all";
const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const shots = new Set(result.shots || []);
const save = () => { result.shots = [...shots]; fs.writeFileSync(OUT, JSON.stringify(result, null, 2)); };
const stopped = () => fs.existsSync(STOP);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
const sel = (k) => `.pdim [data-ppop-${k}]`;

// 서빙 파일 = HEAD 인지(하네스가 507edf1 을 내는지) 대조
{
  const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
  const served = {};
  for (const f of ["assets/app.js", "assets/base.css", "index.html"]) {
    const live = Buffer.from(await (await fetch(BASE + f)).arrayBuffer());
    const head = execFileSync("git", ["-C", REPO, "show", "HEAD:" + f], { maxBuffer: 64 << 20 });
    served[f] = { live: sha(live), head: sha(head), same: sha(live) === sha(head) };
  }
  result.meta = { head: execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]).toString().trim(), at: new Date().toISOString(), served };
}
const realCfg = await (await fetch(APIB + "/api/config")).json();
const CFG_NULL = { ...realCfg, promo: null };
const CFG_EXPIRED = { ...realCfg, promo: { ...realCfg.promo, ends_at: "2026-09-01T00:00:00.000Z" } };
const NOTICE3 = { items: [{ id: "ntc_probe_n3", title: "프로브 공지: 세 장 순환 확인용 카드", body_md: "세 장 순환과 좌우 측면 카드 클릭을 재려고 route 로 더한 공지입니다." }] };

const browser = await chromium.launch({ channel: "chrome", headless: true });

// 문서 시작부터: 팝업이 뜬 시각(__openT)과 [data-ppop-cur] 값 변화 기록(__cur)
const INIT = () => {
  window.__cur = []; window.__openT = null; let last;
  const rec = () => {
    const d = document.querySelector(".pdim");
    if (d && window.__openT === null) window.__openT = +performance.now().toFixed(1);
    const c = document.querySelector(".pdim [data-ppop-cur]");
    const v = c ? c.textContent : d ? "(n1)" : null;
    if (v !== last) { last = v; window.__cur.push({ t: +performance.now().toFixed(1), v }); }
  };
  document.addEventListener("DOMContentLoaded", () => new MutationObserver(rec).observe(document.body, { childList: true, subtree: true, characterData: true }));
};
const MUT = () => {
  window.__mut = [];
  new MutationObserver((ms) => ms.forEach((m) => window.__mut.push({ i: +m.target.dataset.i, old: m.oldValue, t: +performance.now().toFixed(1) })))
    .observe(document.querySelector(".pdim .pstage"), { subtree: true, attributes: true, attributeFilter: ["data-on"], attributeOldValue: true });
  window.__hov = [];
  const st = document.querySelector(".pdim .pstage");
  for (const ty of ["mouseenter", "mouseleave"]) st.addEventListener(ty, () => window.__hov.push([ty, +performance.now().toFixed(1)]));
};
async function open(w, o = {}) {
  const h = o.h ?? (w >= 600 ? 900 : 844);
  const co = { viewport: { width: w, height: h }, deviceScaleFactor: o.dsf || 1, locale: "ko-KR", reducedMotion: o.reduce ? "reduce" : "no-preference" };
  if (o.touch ?? w < 600) Object.assign(co, { hasTouch: true, isMobile: true });
  const ctx = await browser.newContext(co);
  await ctx.addInitScript(INIT);
  if (o.init) await ctx.addInitScript(o.init);
  if (o.cfg) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/config", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(o.cfg) }));
  if (o.notices) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(o.notices) }));
  else if (o.noticeDelay) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", async (r) => { await new Promise((res) => setTimeout(res, o.noticeDelay)); await r.continue(); });
  for (const [f, body] of Object.entries(o.files || {})) await ctx.route(BASE + f, (r) => r.fulfill({ status: 200, contentType: f.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8", body }));   // 수리 전 판 대조용(git show)
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  await page.goto(BASE + (o.url || "index.html"), { waitUntil: "networkidle", timeout: 30000 }).catch((e) => errors.push("goto " + e.message));
  await page.addStyleTag({ content: RV });
  if (o.waitPopup !== false) await page.waitForSelector(".pdim", { timeout: 20000 });
  await page.waitForTimeout(o.settle ?? 900);
  if (o.waitPopup !== false) await page.evaluate(MUT);
  return { ctx, page, errors };
}
const ST = () => {
  const root = document.querySelector(".pdim");
  if (!root) return { open: false };
  const slots = [...root.querySelectorAll(".pslot")];
  const idx = (f) => slots.map((s, i) => (f(s) ? i : -1)).filter((i) => i >= 0);
  const onIdx = idx((s) => s.hasAttribute("data-on")), sideIdx = idx((s) => s.hasAttribute("data-side"));
  const bar = root.querySelector(".pbar"), onSlot = slots[onIdx[0]], stage = root.querySelector(".pstage");
  const ae = document.activeElement, title = onSlot && onSlot.querySelector(".pop h2"), pop = onSlot && onSlot.querySelector(":scope > .pop");
  const pb = root.querySelector("[data-ppop-pause]"), cur = root.querySelector("[data-ppop-cur]");
  const d = (e) => (e ? e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).join(".") : "") : null);
  const R = (b) => ({ l: +b.left.toFixed(2), t: +b.top.toFixed(2), r: +b.right.toFixed(2), b: +b.bottom.toFixed(2) });
  const br = bar ? bar.getBoundingClientRect() : null, pr = pop ? pop.getBoundingClientRect() : null;
  return {
    open: true, n: slots.length, cur: cur ? +cur.textContent : null, onIdx, sideIdx,
    sideDirs: sideIdx.map((i) => slots[i].getAttribute("data-side") + "/" + slots[i].style.getPropertyValue("--d")),
    // 6회차 기대: 하단바 = .pstage 직계 자식(어느 슬롯 안도 아님). barSlot 은 5회차 대조용(-1 = 슬롯 밖)
    barParent: bar ? (bar.parentElement === stage ? "stage" : bar.parentElement.className) : null, barSlot: bar ? slots.indexOf(bar.parentElement) : null,
    bar: br && R(br), onPop: pr && R(pr),
    barGap: br && pr ? +(br.top - pr.bottom).toFixed(2) : null, barDL: br && pr ? +(br.left - pr.left).toFixed(2) : null, barDR: br && pr ? +(br.right - pr.right).toFixed(2) : null,
    inertOk: slots.every((s, i) => s.querySelector(":scope > .pop").hasAttribute("inert") === (i !== onIdx[0])),
    focus: { el: d(ae), text: ae ? (ae.textContent || "").trim().slice(0, 22) : null, inDialog: root.contains(ae), activeTitle: !!title && ae === title, activePop: ae === pop, isRoot: ae === root,
      inActiveSlot: !!onSlot && onSlot.contains(ae), inBar: !!bar && bar.contains(ae), inInert: !!(ae && ae.closest && ae.closest("[inert]")), slot: slots.findIndex((s) => s.contains(ae)) },
    pause: pb ? { text: pb.textContent, label: pb.getAttribute("aria-label"), hasPressed: pb.hasAttribute("aria-pressed") } : null,
  };
};
// 구조 판정(전이 중에도 성립해야 하는 것). 6회차: 하단바 = 무대 직계 자식(5회차의 barSlot === 활성 슬롯 대신)
const layoutOk = (s) => !!s && s.open && s.onIdx.length === 1 && s.sideIdx.length === s.n - 1 && s.barParent === "stage" && s.inertOk && (s.cur === null || s.cur === s.onIdx[0] + 1);
// 기하 판정(정지 뒤): 하단바 윗선 = 활성 카드 아랫선 ±0.5px, 좌우 끝 ±0.5px
const barAligned = (s) => !!s && s.open && s.barGap !== null && Math.abs(s.barGap) <= 0.5 && Math.abs(s.barDL) <= 0.5 && Math.abs(s.barDR) <= 0.5;
const rectDelta = (a, b) => (a && b ? +Math.max(...["l", "t", "r", "b"].map((k) => Math.abs(a[k] - b[k]))).toFixed(2) : null);
const le = (x, t = 0.5) => typeof x === "number" && x <= t;   // null(닫힘 등) 은 실패로
const GEO = () => {
  const rad = (el) => { const s = getComputedStyle(el); return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map(parseFloat); };
  const R = (b) => ({ l: +b.left.toFixed(2), t: +b.top.toFixed(2), r: +b.right.toFixed(2), b: +b.bottom.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) });
  const on = document.querySelector(".pdim .pslot[data-on]");
  const pop = on.querySelector(":scope > .pop"), bar = document.querySelector(".pdim .pbar");   // 6회차: 하단바는 무대 직계
  const pc = getComputedStyle(pop), bc = bar ? getComputedStyle(bar) : null;
  const pr = pop.getBoundingClientRect(), br = bar ? bar.getBoundingClientRect() : null;
  const sides = [...document.querySelectorAll(".pdim .pslot[data-side] > .pop")].map((p) => { const c = getComputedStyle(p); return { i: +p.parentElement.dataset.i, radius: rad(p), bb: c.borderBottomWidth, bg: c.backgroundColor, rect: R(p.getBoundingClientRect()) }; });
  return {
    pop: R(pr), bar: br && R(br), popRadius: rad(pop), barRadius: bar && rad(bar), barParent: bar ? bar.parentElement.className : null,
    popBorderBottom: pc.borderBottomWidth + " " + pc.borderBottomStyle + " " + pc.borderBottomColor, popBorderTop: pc.borderTopWidth + " " + pc.borderTopColor, popBorderSide: pc.borderLeftWidth + " " + pc.borderLeftColor,
    barBorderTop: bc && bc.borderTopWidth + " " + bc.borderTopStyle + " " + bc.borderTopColor, barBorderSide: bc && bc.borderLeftWidth + " " + bc.borderLeftColor,
    gap: br ? +(br.top - pr.bottom).toFixed(2) : null, dL: br ? +(br.left - pr.left).toFixed(2) : null, dR: br ? +(br.right - pr.right).toFixed(2) : null,
    slotTransform: getComputedStyle(on).transform, popBg: pc.backgroundColor, sides,
  };
};
// 6회차: 활성 .pop 아래 선 = 폭 0 대신 투명(3d2ada3). 둘 중 하나면 겹선 없음
const joinOk = (g) => !!g && (g.popBorderBottom.startsWith("0px") || /rgba\(0, 0, 0, 0\)|transparent/.test(g.popBorderBottom)) && !!g.barBorderTop && g.barBorderTop.startsWith("1px solid") && Math.abs(g.gap) <= 0.5 && Math.abs(g.dL) <= 0.5 && Math.abs(g.dR) <= 0.5;
async function ax(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach().catch(() => {});
  return nodes.filter((n) => !n.ignored && n.role && n.role.value === "button" && n.name && /자동 넘김|이전 안내|다음 안내|^닫기$|^정지$|^재생$/.test(n.name.value))
    .map((n) => ({ name: n.name.value, props: (n.properties || []).map((p) => p.name + "=" + JSON.stringify(p.value && p.value.value)), pressed: (n.properties || []).some((p) => p.name === "pressed") }));
}
// CDP 접근성 트리에서 초점 노드(focused=true) 역할과 이름
async function axFocused(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach().catch(() => {});
  return nodes.filter((n) => !n.ignored && !(n.role && n.role.value === "RootWebArea") && (n.properties || []).some((p) => p.name === "focused" && p.value && p.value.value === true))   // 문서 뿌리(RootWebArea)도 focused=true 라 뺀다
    .map((n) => ({ role: n.role && n.role.value, name: n.name && n.name.value, props: (n.properties || []).map((p) => p.name + "=" + JSON.stringify(p.value && p.value.value)) }));
}
function pixScan(png, cols, y0, y1) {
  const code = "import sys, json\nfrom PIL import Image\nim = Image.open(sys.argv[1]).convert('RGB')\nspec = json.loads(sys.argv[2])\nprint(json.dumps({str(x): [list(im.getpixel((x, y))) for y in range(spec['y0'], spec['y1'])] for x in spec['cols']}))";
  return JSON.parse(execFileSync("python3", ["-c", code, png, JSON.stringify({ cols, y0, y1 })]).toString());
}
function lineRuns(col, y0, bg = [255, 253, 248], thr = 6) {
  const out = [];
  col.forEach((px, k) => {
    const diff = Math.max(...px.map((v, j) => Math.abs(v - bg[j])));
    if (diff <= thr) return;
    const last = out.at(-1);
    if (last && last.end === y0 + k - 1) { last.end = y0 + k; last.colors.push(px.join(",")); } else out.push({ start: y0 + k, end: y0 + k, colors: [px.join(",")] });
  });
  return out.map((r) => ({ startPx: r.start, lenPx: r.end - r.start + 1, colors: r.colors }));
}
// 접합부 dsf3: 활성 .pop 아래 30px ~ 하단바 위 30px, 왼쪽 모서리 포함 140px 폭. 픽셀 열 = pop 왼쪽 +60, +120 (CSS)
async function joinCrop(page, file) {
  const g = await page.evaluate(GEO);
  const clip = { x: g.pop.l - 8, y: g.pop.b - 30, width: 140, height: 60 };
  const p = path.join(SHOTS, file);
  await page.screenshot({ path: p, clip }); shots.add(p);
  const cols = [68 * 3, 128 * 3];
  const y0 = 10 * 3, y1 = 42 * 3;   // pop.b - 20 ~ pop.b + 12 (CSS)
  const px = pixScan(p, cols, y0, y1);
  // 선 = 바탕(--card 255,253,248)보다 25 넘게 어두운 행. 그림자 = 선 아래 바탕과 2 넘게 다른 행(활성 .pop box-shadow 가 하단바 위에 칠해지는지)
  const scan = Object.fromEntries(Object.entries(px).map(([x, col]) => {
    const line = lineRuns(col, y0, [255, 253, 248], 25);
    const diff = (c) => Math.max(Math.abs(c[0] - 255), Math.abs(c[1] - 253), Math.abs(c[2] - 248));
    const lineEnd = line.length ? line.at(-1).startPx + line.at(-1).lenPx : null;
    const below = lineEnd === null ? [] : col.slice(lineEnd - y0);
    const shadowRows = below.filter((c) => diff(c) > 2).length;
    const above = line.length ? col.slice(0, line[0].startPx - y0) : col;
    return [x, { line, aboveMaxDiff: Math.max(0, ...above.map(diff)), belowFirst: below[0] ? below[0].join(",") : null, belowLast: below.at(-1) ? below.at(-1).join(",") : null, belowShadowRowsPx: shadowRows, belowMaxDiff: Math.max(0, ...below.map(diff)) }];
  }));
  const junctionDevY = 30 * 3;
  const ok = Object.values(scan).every((s) => s.line.length === 1 && s.line[0].lenPx === 3 && Math.abs(s.line[0].startPx - junctionDevY) <= 1 && s.aboveMaxDiff <= 2);
  return { file: p, clip, geo: g, junctionDevY, scan, singleLine3px: ok };
}

// ───────── 1 넘김 경로 전수 ─────────
const SWIPE_JS = (dx) => {
  const pop = document.querySelector(".pdim .pslot[data-on] > .pop");
  const r = pop.getBoundingClientRect(); const x0 = r.left + r.width / 2, y = r.top + Math.min(120, r.height / 2);
  const T = (x) => new Touch({ identifier: 7, target: pop, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y });
  const ts = T(x0), te = T(x0 + dx);
  pop.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true, composed: true, touches: [ts], targetTouches: [ts], changedTouches: [ts] }));
  pop.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true, composed: true, touches: [], targetTouches: [], changedTouches: [te] }));
  return { x0: +x0.toFixed(1), y: +y.toFixed(1), dx };
};
async function swipeCdp(p, dx) {
  const pt = await p.evaluate(() => { const r = document.querySelector(".pdim .pslot[data-on] > .pop").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(120, r.height / 2) }; });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y, id: 1 }] });
  for (let k = 1; k <= 6; k++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: pt.x + (dx * k) / 6, y: pt.y, id: 1 }] }); await p.waitForTimeout(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach().catch(() => {});
  return { x0: +pt.x.toFixed(1), y: +pt.y.toFixed(1), dx };
}
const ACT = {
  click_next: { d: 1, run: (p) => p.click(sel("next")) },
  click_prev: { d: -1, run: (p) => p.click(sel("prev")) },
  tap_next: { d: 1, run: (p) => p.tap(sel("next")) },
  tap_prev: { d: -1, run: (p) => p.tap(sel("prev")) },
  enter_next: { d: 1, pre: (p) => p.focus(sel("next")), run: (p) => p.keyboard.press("Enter") },
  enter_prev: { d: -1, pre: (p) => p.focus(sel("prev")), run: (p) => p.keyboard.press("Enter") },
  space_next: { d: 1, pre: (p) => p.focus(sel("next")), run: (p) => p.keyboard.press("Space") },
  space_prev: { d: -1, pre: (p) => p.focus(sel("prev")), run: (p) => p.keyboard.press("Space") },
  key_right: { d: 1, run: (p) => p.keyboard.press("ArrowRight") },
  key_left: { d: -1, run: (p) => p.keyboard.press("ArrowLeft") },
  side_right: { side: "1" },
  side_left: { side: "-1" },
  swipe_next_js: { d: 1, run: (p) => p.evaluate(SWIPE_JS, -60) },
  swipe_prev_js: { d: -1, run: (p) => p.evaluate(SWIPE_JS, 60) },
  swipe_next_cdp: { d: 1, run: (p) => swipeCdp(p, -60) },
  swipe_prev_cdp: { d: -1, run: (p) => swipeCdp(p, 60) },
};
async function runPath(w, reduce, name, N) {
  const A = ACT[name];
  const { ctx, page, errors } = await open(w, { reduce, notices: N === 3 ? NOTICE3 : null });
  try {
    const load = await page.evaluate(ST);
    let setup = null, target = null, info = null;
    if (A.side && !(await page.$(`.pdim .pslot[data-side="${A.side}"]`))) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(800); setup = "ArrowRight 로 반대쪽 측면을 만든 뒤"; }
    if (A.pre) await A.pre(page);
    const before = await page.evaluate(ST);
    await page.evaluate(() => window.__mut.splice(0));
    if (A.side) {
      target = await page.evaluate((dir) => {
        const s = document.querySelector(`.pdim .pslot[data-side="${dir}"]`); const r = s.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y), hs = hit && hit.closest(".pslot");
        return { i: +s.dataset.i, x: +x.toFixed(1), y: +y.toFixed(1), hitSlot: hs ? +hs.dataset.i : null, hit: hit ? hit.tagName.toLowerCase() + "." + (hit.className || "") : null };
      }, A.side);
      await page.mouse.click(target.x, target.y);
    } else info = await A.run(page);
    await page.waitForTimeout(150);
    const after = await page.evaluate(ST);
    const mut = await page.evaluate(() => window.__mut.splice(0));
    await page.waitForTimeout(700);
    const late = await page.evaluate(ST);
    const lateMut = await page.evaluate(() => window.__mut.splice(0));
    const i0 = before.cur - 1;
    const exp = A.side ? target.i : (((i0 + A.d) % N) + N) % N;
    const newlyOn = mut.filter((m) => m.old === null).map((m) => m.i);
    const v = {
      turned: after.cur === exp + 1,
      noRevert: newlyOn.length === 1 && newlyOn[0] === exp,
      noLateChange: late.cur === after.cur && lateMut.every((m) => m.old !== null),
      focusActiveTitle: after.focus.activeTitle && late.focus.activeTitle,
      focusNotInert: !after.focus.inInert && !late.focus.inInert,
      layout: layoutOk(after) && layoutOk(late),
      barAlignedLate: barAligned(late),                       // 700ms 뒤 하단바 top = 새 활성 .pop bottom
      barFixed: le(rectDelta(before.bar, after.bar)) && le(rectDelta(before.bar, late.bar)),   // 조작 전 → 150ms → 850ms 하단바 rect 불변
      pauseShowsStopped: after.pause ? after.pause.text === "재생" && after.pause.label === "자동 넘김 재생" && !after.pause.hasPressed : null,
      noErrors: errors.length === 0,
    };
    if (name.startsWith("key_")) v.focusInDialogBefore = before.focus.inDialog;
    if (A.side) v.sideHitIsSlot = target.hitSlot === target.i;
    const pass = Object.values(v).every((x) => x === null || x === true);
    return { w, reduce, N, setup, load: { cur: load.cur, focus: load.focus.el, pause: load.pause }, before: { cur: before.cur, focus: before.focus.el, pause: before.pause }, target, info,
      after: { cur: after.cur, onIdx: after.onIdx, sideIdx: after.sideIdx, sideDirs: after.sideDirs, barParent: after.barParent, barSlot: after.barSlot, focus: after.focus, pause: after.pause },
      late: { cur: late.cur, focus: late.focus.el, barGap: late.barGap, barDL: late.barDL, barDR: late.barDR },
      bar: { before: before.bar, after: after.bar, late: late.bar, dAfter: rectDelta(before.bar, after.bar), dLate: rectDelta(before.bar, late.bar) },
      exp: exp + 1, newlyOn, mut, lateMut, v, pass, errors };
  } finally { await ctx.close(); }
}
async function navPart() {
  const out = { paths: {} };
  const P1440 = ["click_next", "click_prev", "enter_next", "enter_prev", "space_next", "space_prev", "key_right", "key_left", "side_right", "side_left"];
  const P390 = ["click_next", "click_prev", "tap_next", "tap_prev", "enter_next", "enter_prev", "space_next", "space_prev", "key_right", "key_left", "swipe_next_js", "swipe_prev_js", "swipe_next_cdp", "swipe_prev_cdp"];
  const plan = [];
  // 6회차: N=3 도 전 경로 × 기본/reduce (5회차는 N=3 부분집합)
  for (const N of [2, 3]) for (const reduce of [false, true]) { for (const a of P1440) plan.push([1440, reduce, a, N]); for (const a of P390) plan.push([390, reduce, a, N]); }
  for (const [w, reduce, a, N] of plan) {
    if (stopped()) { out.stopped = true; break; }
    const key = `${a}@${w}${reduce ? "_reduce" : ""}${N === 3 ? "_n3" : ""}`;
    const r = await runPath(w, reduce, a, N);
    out.paths[key] = r;
    log(`nav ${key}`, r.pass ? "PASS" : "FAIL", `cur ${r.before.cur}->${r.after.cur} (exp ${r.exp}) newlyOn=[${r.newlyOn}] focus=${r.after.focus.el} inert=${r.after.focus.inInert} pause=${r.after.pause && r.after.pause.text}/${r.after.pause && r.after.pause.label} barGap=${r.late.barGap} barD=${r.bar.dAfter}/${r.bar.dLate}`, Object.entries(r.v).filter(([, x]) => x === false).map(([k]) => k).join(","));
  }
  const all = Object.entries(out.paths);
  out.summary = { total: all.length, pass: all.filter(([, r]) => r.pass).length, fail: all.filter(([, r]) => !r.pass).map(([k, r]) => ({ k, bad: Object.entries(r.v).filter(([, x]) => x === false).map(([n]) => n) })),
    reverts: all.filter(([, r]) => !r.v.noRevert).length, focusNotTitle: all.filter(([, r]) => !r.v.focusActiveTitle).length,
    maxBarGapLate: Math.max(...all.map(([, r]) => Math.abs(r.late.barGap ?? 99))), maxBarMove: Math.max(...all.map(([, r]) => Math.max(r.bar.dAfter ?? 99, r.bar.dLate ?? 99))) };
  log("nav summary", JSON.stringify(out.summary));
  result.nav = out; save();
}

// ───────── 2 연속 조작, 빠른 연타 ─────────
async function seqPart() {
  const out = { cycle: {}, fast: {} };
  for (const [w, reduce, N] of [[1440, false, 2], [1440, false, 3], [390, false, 2], [390, false, 3], [1440, true, 2], [390, true, 3]]) {
    if (stopped()) { out.stopped = true; break; }
    const key = `${w}${reduce ? "_reduce" : ""}_n${N}`;
    const { ctx, page, errors } = await open(w, { reduce, notices: N === 3 ? NOTICE3 : null });
    const act = (k) => (w < 600 ? page.tap(sel(k)) : page.click(sel(k)));
    const s0 = await page.evaluate(ST), start = s0.cur;
    let cur = start; const steps = [];
    for (const [k, d] of [["next", 1], ["next", 1], ["next", 1], ["prev", -1], ["prev", -1], ["prev", -1]]) {
      await page.evaluate(() => window.__mut.splice(0));
      await act(k); await page.waitForTimeout(650);
      const s = await page.evaluate(ST), m = await page.evaluate(() => window.__mut.splice(0));
      const exp = ((((cur - 1 + d) % N) + N) % N) + 1;
      steps.push({ k, cur: s.cur, exp, newlyOn: m.filter((x) => x.old === null).map((x) => x.i), layout: layoutOk(s), barAligned: barAligned(s), barGap: s.barGap, barMove: rectDelta(s0.bar, s.bar), focusTitle: s.focus.activeTitle, pause: s.pause && s.pause.text });
      cur = exp;
    }
    const geo = await page.evaluate(GEO);
    const pass = steps.every((s) => s.cur === s.exp && s.newlyOn.length === 1 && s.newlyOn[0] === s.exp - 1 && s.layout && s.barAligned && le(s.barMove) && s.focusTitle) && joinOk(geo) && errors.length === 0;
    out.cycle[key] = { start, seq: steps.map((s) => s.cur), exp: steps.map((s) => s.exp), steps, joinOk: joinOk(geo), geo: { gap: geo.gap, dL: geo.dL, dR: geo.dR }, errors, pass };
    log(`seq cycle ${key}`, pass ? "PASS" : "FAIL", "start", start, "seq", steps.map((s) => s.cur).join(">"), "exp", steps.map((s) => s.exp).join(">"), "barMove", steps.map((s) => s.barMove).join(","), "barGap", steps.map((s) => s.barGap).join(","));
    await ctx.close();
  }
  const FAST = [
    [1440, false, 2, "key"], [1440, false, 3, "key"], [390, false, 2, "key"],
    [1440, false, 2, "js"], [1440, false, 3, "js"], [390, false, 2, "js"],
    [1440, false, 2, "force_click"], [1440, false, 3, "force_click"], [390, false, 2, "force_tap"], [390, false, 3, "force_tap"],
    [1440, false, 2, "fixed_mouse"], [1440, false, 3, "fixed_mouse"], [390, false, 2, "fixed_tap"], [390, false, 3, "fixed_tap"],
    [1440, true, 2, "fixed_mouse"], [1440, true, 2, "force_click"], [390, true, 2, "fixed_tap"],
  ];
  for (const [w, reduce, N, kind] of FAST) {
    if (stopped()) { out.stopped = true; break; }
    const key = `${kind}@${w}${reduce ? "_reduce" : ""}_n${N}`;
    const { ctx, page, errors } = await open(w, { reduce, notices: N === 3 ? NOTICE3 : null });
    await page.evaluate(() => {
      window.__clk = [];
      const d = (t) => { const s = t.closest && t.closest(".pslot"); return (t.tagName || "").toLowerCase() + (typeof t.className === "string" && t.className ? "." + t.className.trim().split(/\s+/).join(".") : "") + (t.dataset && t.dataset.ppopNext !== undefined ? "[next]" : "") + (s ? "@slot" + s.dataset.i + (s.hasAttribute("data-on") ? "(on)" : "(side)") : ""); };
      document.addEventListener("click", (e) => window.__clk.push({ t: +performance.now().toFixed(1), tgt: d(e.target), trusted: e.isTrusted }), true);
    });
    const before = await page.evaluate(ST);
    await page.evaluate(() => window.__mut.splice(0));
    const pt = await page.evaluate(() => { const r = document.querySelector(".pdim [data-ppop-next]").getBoundingClientRect(); return { x: +(r.left + r.width / 2).toFixed(1), y: +(r.top + r.height / 2).toFixed(1) }; });
    const ts = [], actErr = [];
    if (kind === "js") {
      ts.push(...(await page.evaluate(() => new Promise((res) => { const out = []; let k = 0; const f = () => { out.push(+performance.now().toFixed(1)); document.querySelector(".pdim [data-ppop-next]").click(); if (++k < 3) setTimeout(f, 50); else res(out); }; f(); }))));
    } else {
      for (let k = 0; k < 3; k++) {
        ts.push(Date.now());
        try {
          if (kind === "key") await page.keyboard.press("ArrowRight");
          else if (kind === "force_click") await page.locator(sel("next")).click({ force: true, timeout: 3000 });
          else if (kind === "force_tap") await page.locator(sel("next")).tap({ force: true, timeout: 3000 });
          else if (kind === "fixed_mouse") await page.mouse.click(pt.x, pt.y);
          else if (kind === "fixed_tap") await page.touchscreen.tap(pt.x, pt.y);
        } catch (e) { actErr.push(e.message.split("\n")[0]); }
        if (k < 2) await page.waitForTimeout(50);
      }
    }
    await page.waitForTimeout(60);
    const imm = await page.evaluate(ST);
    await page.waitForTimeout(900);
    const settled = await page.evaluate(ST);
    const geo = settled.open ? await page.evaluate(GEO) : null;
    const mut = await page.evaluate(() => (window.__mut || []).splice(0));
    const clk = await page.evaluate(() => window.__clk);
    const exp = ((before.cur - 1 + 3) % N) + 1;
    const newlyOn = mut.filter((m) => m.old === null).map((m) => m.i);
    const intervals = ts.slice(1).map((t, i) => +(t - ts[i]).toFixed(1));
    const muteChecked = settled.open ? await page.evaluate(() => { const i = document.querySelector(".pdim [data-ppop-mute-all]"); return i ? i.checked : null; }) : null;
    const v = { curExp: settled.cur === exp, layoutImm: layoutOk(imm), layoutSettled: layoutOk(settled) && barAligned(settled), barFixed: le(rectDelta(before.bar, imm.bar)) && le(rectDelta(before.bar, settled.bar)), join: joinOk(geo), threeTurns: newlyOn.length === 3, muteUnchecked: muteChecked === false, noErrors: errors.length === 0 && actErr.length === 0 };
    const pass = Object.values(v).every(Boolean);
    out.fast[key] = { before: before.cur, exp, immCur: imm.cur, settledCur: settled.cur, open: settled.open, muteChecked, pt, intervals, newlyOn, clicks: clk, barMove: { imm: rectDelta(before.bar, imm.bar), settled: rectDelta(before.bar, settled.bar) }, imm: imm.open ? { onIdx: imm.onIdx, sideIdx: imm.sideIdx, barParent: imm.barParent } : null, settled: settled.open ? { onIdx: settled.onIdx, sideIdx: settled.sideIdx, barParent: settled.barParent, barGap: settled.barGap, focus: settled.focus.el, pause: settled.pause } : null, geo: geo && { gap: geo.gap, dL: geo.dL, dR: geo.dR, popBB: geo.popBorderBottom }, v, pass, actErr, errors };
    log(`seq fast ${key}`, pass ? "PASS" : "FAIL", `cur ${before.cur}->${settled.cur} exp ${exp} open=${settled.open} newlyOn=[${newlyOn}] intervals=${intervals} clicks=${clk.map((c) => c.tgt).join(" | ")}`, Object.entries(v).filter(([, x]) => !x).map(([k]) => k).join(","));
    await ctx.close();
  }
  result.seq = out; save();
}

// ───────── 2b 고정 좌표 연타 간격 스윕 (seq 의 fixed_mouse/fixed_tap 결함 범위) ─────────
//   → 단추 정지 위치(첫 조작 전)에 실포인터 2회/3회. 간격 100~700ms. 두 번째 이후 클릭이 맞은 요소, 팝업 열림, 최종 cur.
//   넘김 중(500ms) 새 활성 카드와 하단바가 옆에서 미끄러져 들어오므로 같은 자리에 무엇이 오는지 시각별 hit-test 도 남긴다.
async function sweepPart() {
  const out = { runs: {}, hitTimeline: {} };
  const GAPS = [50, 100, 150, 200, 300, 400, 550, 700];   // 6회차: 50ms 추가
  for (const [w, N] of [[1440, 2], [1440, 3], [390, 2], [390, 3]]) {
    for (const gap of GAPS) {
      for (const clicks of [2, 3]) {
        if (stopped()) { out.stopped = true; break; }
        const { ctx, page, errors } = await open(w, { notices: N === 3 ? NOTICE3 : null });
        await page.evaluate(() => {
          window.__clk = [];
          const d = (t) => { const s = t.closest && t.closest(".pslot"); const lab = t.getAttribute && (t.getAttribute("aria-label") || ""); return (t.tagName || "").toLowerCase() + (typeof t.className === "string" && t.className ? "." + t.className.trim().split(/\s+/)[0] : "") + (lab ? "[" + lab + "]" : "") + (s ? "@slot" + s.dataset.i + (s.hasAttribute("data-on") ? "(on)" : "(side)") : ""); };
          document.addEventListener("click", (e) => window.__clk.push(d(e.target)), true);
        });
        const s0 = await page.evaluate(ST);
        await page.evaluate(() => window.__mut.splice(0));
        const pt = await page.evaluate(() => { const r = document.querySelector(".pdim [data-ppop-next]").getBoundingClientRect(); return { x: +(r.left + r.width / 2).toFixed(1), y: +(r.top + r.height / 2).toFixed(1) }; });
        for (let k = 0; k < clicks; k++) {
          if (w < 600) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
          if (k < clicks - 1) await page.waitForTimeout(gap);
        }
        await page.waitForTimeout(900);
        const s = await page.evaluate(ST);
        const clk = await page.evaluate(() => window.__clk);
        const mut = await page.evaluate(() => (window.__mut || []).splice(0));
        const turns = mut.filter((m) => m.old === null).length;   // 넘김 수 = data-on 이 새로 붙은 횟수(5회차 cur 대조만으로는 N=2 × 2회 = 제자리와 구별 안 됨)
        const exp = (clicks % N) + 1;
        const muteChecked = s.open ? await page.evaluate(() => { const i = document.querySelector(".pdim [data-ppop-mute-all]"); return i ? i.checked : null; }) : null;
        const muteStored = await page.evaluate(() => localStorage.getItem("hh_popup_mute_v1"));
        const nextHits = clk.filter((t) => t.includes("[다음 안내]")).length;
        const r = { gap, clicks, pt, targets: clk, nextHits, turns, open: s.open, cur: s.open ? s.cur : null, exp, muteChecked, muteStored, pauseLabel: s.open && s.pause ? s.pause.text : null,
          layout: s.open ? layoutOk(s) && barAligned(s) : null, barMove: rectDelta(s0.bar, s.bar),
          ok: s.open && s.cur === exp && turns === clicks && nextHits === clicks && layoutOk(s) && barAligned(s) && le(rectDelta(s0.bar, s.bar)) && muteChecked === false && muteStored === null, errors };
        out.runs[`${w}_n${N}_gap${gap}_x${clicks}`] = r;
        log(`sweep ${w} n${N} gap${gap} x${clicks}`, r.ok ? "OK" : "BAD", `open=${s.open} cur=${r.cur} exp=${exp} turns=${turns}/${clicks} mute=${muteChecked}/${muteStored} pause=${r.pauseLabel} layout=${r.layout} barMove=${r.barMove}`, clk.join(" | "));
        await ctx.close();
      }
    }
    // 넘김 뒤 시각별로 같은 좌표에 무엇이 있는가(transition 실시간, rAF 로 elementFromPoint)
    const { ctx, page } = await open(w, { notices: N === 3 ? NOTICE3 : null });
    const tl = await page.evaluate(() => new Promise((res) => {
      const b = document.querySelector(".pdim [data-ppop-next]"); const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const d = (t) => { if (!t) return null; const s = t.closest(".pslot"); const lab = t.getAttribute("aria-label") || ""; return (t.tagName || "").toLowerCase() + (typeof t.className === "string" && t.className ? "." + t.className.trim().split(/\s+/)[0] : "") + (lab ? "[" + lab + "]" : "") + (s ? "@slot" + s.dataset.i + (s.hasAttribute("data-on") ? "(on)" : "(side)") : ""); };
      const outA = []; const t0 = performance.now(); let frames = 0, nonNext = 0; b.click(); let last = null;
      const f = () => { const t = performance.now() - t0; const e = document.elementFromPoint(x, y); const h = d(e); frames++; if (!(e && e.closest("[data-ppop-next]"))) nonNext++; if (h !== last) { outA.push({ t: +t.toFixed(0), hit: h }); last = h; } if (t < 800) requestAnimationFrame(f); else res({ x: +x.toFixed(1), y: +y.toFixed(1), frames, nonNextFrames: nonNext, seq: outA }); };
      requestAnimationFrame(f);
    }));
    tl.allNext = tl.nonNextFrames === 0;
    out.hitTimeline[`${w}_n${N}`] = tl;
    log(`sweep timeline ${w} n${N}`, JSON.stringify(tl));
    await ctx.close();
  }
  const runs = Object.values(out.runs);
  out.summary = { total: runs.length, ok: runs.filter((r) => r.ok).length, closed: runs.filter((r) => !r.open).length, muteToggled: runs.filter((r) => r.muteChecked || r.muteStored !== null).length, layoutBadWhileOpen: runs.filter((r) => r.open && !r.layout).length,
    clicks: runs.reduce((a, r) => a + r.clicks, 0), turns: runs.reduce((a, r) => a + r.turns, 0), nextHits: runs.reduce((a, r) => a + r.nextHits, 0), missedTurns: runs.filter((r) => r.turns !== r.clicks).length,
    maxBarMove: Math.max(...runs.map((r) => r.barMove ?? 99)),
    hitTimelineAllNext: Object.fromEntries(Object.entries(out.hitTimeline).map(([k, t]) => [k, `${t.frames - t.nonNextFrames}/${t.frames}`])),
    okByGap: Object.fromEntries(GAPS.map((g) => [g, runs.filter((r) => r.gap === g && r.ok).length + "/" + runs.filter((r) => r.gap === g).length])) };
  log("sweep summary", JSON.stringify(out.summary));
  result.sweep = out; save();
}

// ───────── 2c 카드별 → 단추 정지 위치 (카드 높이에 따라 하단바가 오르내리는 폭) ─────────
// 6회차: → 정지 위치 차이 0(x, y), 카드마다 하단바 top = 활성 .pop bottom, 활성 카드 위 빈 공간(무대 1행 높이 - 활성 카드 높이), 390 짧은 카드 활성 캡처
const RESTROW = () => {
  const root = document.querySelector(".pdim"), stage = root.querySelector(".pstage"), on = root.querySelector(".pslot[data-on]"), bar = root.querySelector(".pbar");
  const b = root.querySelector("[data-ppop-next]"), r = b.getBoundingClientRect(), pop = on.querySelector(":scope > .pop"), pr = pop.getBoundingClientRect(), sr = stage.getBoundingClientRect(), br = bar.getBoundingClientRect();
  const row1H = br.top - sr.top;   // 무대 1행 = 슬롯 칸(2행 = 하단바). stage 는 padding 0
  return { slot: +on.dataset.i, title: on.querySelector("h2").textContent.trim().slice(0, 18), popH: +pr.height.toFixed(1), popTop: +pr.top.toFixed(1), popBottom: +pr.bottom.toFixed(1),
    barTop: +br.top.toFixed(1), barBottom: +br.bottom.toFixed(1), barGap: +(br.top - pr.bottom).toFixed(2), row1H: +row1H.toFixed(1), emptyAbove: +(row1H - pr.height).toFixed(1),
    stageTop: +sr.top.toFixed(1), vh: innerHeight, popTopPctOfVh: +((pr.top / innerHeight) * 100).toFixed(1),
    next: { x: +(r.left + r.width / 2).toFixed(1), y: +(r.top + r.height / 2).toFixed(1), top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1) } };
};
async function restposPart() {
  const out = {};
  for (const reduce of [true, false]) {
    for (const [w, N] of [[1440, 2], [1440, 3], [390, 2], [390, 3]]) {
      if (stopped()) { out.stopped = true; break; }
      const { ctx, page } = await open(w, { reduce, notices: N === 3 ? NOTICE3 : null });
      const rows = [];
      for (let k = 0; k < N; k++) {
        rows.push(await page.evaluate(RESTROW));
        if (w === 390 && N === 3 && reduce && rows.at(-1).slot === 2) {   // 짧은 공지 카드가 활성일 때 화면에서 카드가 서는 자리
          const p = path.join(SHOTS, "popnav_short_390.png"); await page.screenshot({ path: p }); shots.add(p); rows.at(-1).shot = p;
        }
        await page.keyboard.press("ArrowRight"); await page.waitForTimeout(reduce ? 200 : 800);
      }
      const xs = rows.map((r) => r.next.x), ys = rows.map((r) => r.next.y);
      const covers = rows.map((r) => rows[0].next.y >= r.next.top && rows[0].next.y <= r.next.bottom);
      const key = `${w}_n${N}${reduce ? "" : "_motion"}`;
      out[key] = { rows, nextXSpread: +(Math.max(...xs) - Math.min(...xs)).toFixed(1), nextYSpread: +(Math.max(...ys) - Math.min(...ys)).toFixed(1), firstPointCoveredBy: covers,
        barGaps: rows.map((r) => r.barGap), barAlignedAll: rows.every((r) => Math.abs(r.barGap) <= 0.5), emptyAbove: rows.map((r) => r.emptyAbove), popTops: rows.map((r) => r.popTop) };
      log(`restpos ${key}`, JSON.stringify({ nextX: out[key].nextXSpread, nextY: out[key].nextYSpread, barGaps: out[key].barGaps, popH: rows.map((r) => r.popH), row1H: rows.map((r) => r.row1H), emptyAbove: out[key].emptyAbove, popTop: out[key].popTops, barTop: rows.map((r) => r.barTop), vh: rows[0].vh }));
      await ctx.close();
    }
  }
  const all = Object.values(out).filter((x) => x && x.rows);
  out.summary = { maxNextXSpread: Math.max(...all.map((x) => x.nextXSpread)), maxNextYSpread: Math.max(...all.map((x) => x.nextYSpread)), barAlignedAll: all.every((x) => x.barAlignedAll), maxAbsBarGap: Math.max(...all.flatMap((x) => x.barGaps.map(Math.abs))) };
  log("restpos summary", JSON.stringify(out.summary));
  result.restpos = out; save();
}

// ───────── 3 정지 단추 ─────────
const pnow = (p) => p.evaluate(() => +performance.now().toFixed(1));
const curStr = (p) => p.evaluate(() => window.__cur.filter((e) => typeof e.v === "string"));
const after = (log_, t) => log_.filter((e) => e.t > t);
const btn = async (p) => (await p.evaluate(ST)).pause;
async function pausePart() {
  const T = {
    // 기본 로드: 표기와 8초 자동 넘김(마우스는 무대 밖 0,0)
    auto1440: [1440, false, async (p) => {
      const r = { load: await btn(p), ax: await ax(p) };
      const openT = await p.evaluate(() => window.__openT);
      await p.waitForTimeout(Math.max(0, 8800 - ((await pnow(p)) - openT)));
      const s = await curStr(p);
      r.firstAdvanceMs = s[1] ? +(s[1].t - openT).toFixed(0) : null; r.seq = s.map((e) => e.v);
      r.afterAdvance = await btn(p);
      return r;
    }],
    auto390: [390, false, async (p) => {
      const r = { load: await btn(p) };
      const openT = await p.evaluate(() => window.__openT);
      await p.waitForTimeout(Math.max(0, 8800 - ((await pnow(p)) - openT)));
      const s = await curStr(p);
      r.firstAdvanceMs = s[1] ? +(s[1].t - openT).toFixed(0) : null; r.seq = s.map((e) => e.v);
      return r;
    }],
    // 마우스 클릭 정지 → 무대 밖으로 치움 → 9.5초 → 다시 클릭 → 치움 → 8초 넘김
    click1440: [1440, false, async (p) => {
      const r = { load: await btn(p) };
      const t1 = await pnow(p); await p.click(sel("pause")); r.paused = await btn(p); r.axPaused = await ax(p);
      await p.mouse.move(5, 5); await p.waitForTimeout(9500);
      r.changesWhilePaused = after(await curStr(p), t1);
      const t2 = await pnow(p); await p.click(sel("pause")); r.resumed = await btn(p); r.axResumed = await ax(p);
      await p.mouse.move(5, 5); const tl = await pnow(p);
      await p.waitForTimeout(8800);
      const ch = after(await curStr(p), t2);
      r.advanceFromResumeClickMs = ch[0] ? +(ch[0].t - t2).toFixed(0) : null; r.advanceFromMouseLeaveMs = ch[0] ? +(ch[0].t - tl).toFixed(0) : null; r.resumeToLeaveMs = +(tl - t2).toFixed(0);
      r.stAfterAdvance = await p.evaluate(ST); r.hov = await p.evaluate(() => window.__hov);
      return r;
    }],
    // 다시 클릭 뒤 마우스를 단추 위에 둔 채(호버 멈춤 설계) → 9초 → 치움 → 8초
    hover1440: [1440, false, async (p) => {
      const r = {};
      await p.click(sel("pause")); await p.waitForTimeout(300);
      const t2 = await pnow(p); await p.click(sel("pause")); r.resumed = await btn(p);
      await p.waitForTimeout(9000);
      r.changesWhileHovering = after(await curStr(p), t2);
      await p.mouse.move(5, 5); const tl = await pnow(p);
      await p.waitForTimeout(8600);
      const ch = after(await curStr(p), tl);
      r.advanceFromLeaveMs = ch[0] ? +(ch[0].t - tl).toFixed(0) : null;
      r.hov = await p.evaluate(() => window.__hov);
      return r;
    }],
    // 키보드: 초점 → Enter 정지 → 9.5초 → Enter 재개 → 8초
    keyboard1440: [1440, false, async (p) => {
      const r = {};
      await p.focus(sel("pause")); r.focused = await btn(p);
      const t1 = await pnow(p); await p.keyboard.press("Enter"); r.paused = await btn(p);
      await p.waitForTimeout(9500);
      r.changesWhilePaused = after(await curStr(p), t1);
      const t2 = await pnow(p); await p.keyboard.press("Enter"); r.resumed = await btn(p);
      await p.waitForTimeout(8600);
      const ch = after(await curStr(p), t2);
      r.advanceFromResumeMs = ch[0] ? +(ch[0].t - t2).toFixed(0) : null;
      const s = await p.evaluate(ST); r.stAfterAdvance = { cur: s.cur, focus: s.focus, pause: s.pause };
      return r;
    }],
    // 390 탭: 정지 → 9.5초 → 탭 재개 → 8.8초 (터치 호환 마우스 이벤트가 호버를 남기는지)
    tap390: [390, false, async (p) => {
      const r = { load: await btn(p) };
      const t1 = await pnow(p); await p.tap(sel("pause")); r.paused = await btn(p);
      await p.waitForTimeout(9500);
      r.changesWhilePaused = after(await curStr(p), t1);
      const t2 = await pnow(p); await p.tap(sel("pause")); r.resumed = await btn(p);
      await p.waitForTimeout(8800);
      const ch = after(await curStr(p), t2);
      r.advanceFromResumeMs = ch[0] ? +(ch[0].t - t2).toFixed(0) : null;
      r.hov = await p.evaluate(() => window.__hov);
      return r;
    }],
    // 390 탭 재개를 20초까지 본다(8초 뒤 늦게라도 도는지) + → 탭으로 멈춘 뒤 「재생」 탭
    tap390long: [390, false, async (p) => {
      const r = {};
      await p.tap(sel("pause")); await p.waitForTimeout(400);
      const t2 = await pnow(p); await p.tap(sel("pause")); r.resumed = await btn(p);
      await p.waitForTimeout(20000);
      r.changesIn20s = after(await curStr(p), t2); r.labelAt20s = await btn(p);
      r.hov = await p.evaluate(() => window.__hov);
      return r;
    }],
    tapNextThenPlay390: [390, false, async (p) => {
      const r = {};
      await p.tap(sel("next")); await p.waitForTimeout(700); r.afterNext = await btn(p);
      const t2 = await pnow(p); await p.tap(sel("pause")); r.afterPlay = await btn(p);
      await p.waitForTimeout(20000);
      r.changesIn20s = after(await curStr(p), t2); r.labelAt20s = await btn(p);
      r.hov = await p.evaluate(() => window.__hov);
      return r;
    }],
    // 대조: 390 에서 키보드로만 정지/재개(터치 없음) → 8초에 도는가
    keyboard390: [390, false, async (p) => {
      const r = {};
      await p.focus(sel("pause")); await p.keyboard.press("Enter"); r.paused = await btn(p); await p.waitForTimeout(400);
      const t2 = await pnow(p); await p.keyboard.press("Enter"); r.resumed = await btn(p);
      await p.waitForTimeout(8800);
      const ch = after(await curStr(p), t2); r.advanceFromResumeMs = ch[0] ? +(ch[0].t - t2).toFixed(0) : null;
      return r;
    }],
    reduce1440: [1440, true, async (p) => {
      const r = { load: await btn(p), ax: await ax(p) };
      const openT = await p.evaluate(() => window.__openT);
      await p.waitForTimeout(Math.max(0, 9500 - ((await pnow(p)) - openT)));
      r.heldMs = +((await pnow(p)) - openT).toFixed(0);
      const s = await curStr(p); r.advances = s.length - 1; r.seq = s.map((e) => e.v);
      return r;
    }],
    reduce390: [390, true, async (p) => {
      const r = { load: await btn(p), ax: await ax(p) };
      const openT = await p.evaluate(() => window.__openT);
      await p.waitForTimeout(Math.max(0, 9500 - ((await pnow(p)) - openT)));
      r.heldMs = +((await pnow(p)) - openT).toFixed(0);
      const s = await curStr(p); r.advances = s.length - 1; r.seq = s.map((e) => e.v);
      return r;
    }],
    // ←/→ 조작 뒤 표기가 실제 멈춤과 맞는지
    afterClickNext1440: [1440, false, async (p) => {
      await p.click(sel("next")); const t = await pnow(p); const r = { label: await btn(p) };
      await p.mouse.move(5, 5); await p.waitForTimeout(9500);
      r.changesAfter = after(await curStr(p), t + 200);
      return r;
    }],
    afterClickPrev1440: [1440, false, async (p) => {
      await p.click(sel("prev")); const t = await pnow(p); const r = { label: await btn(p) };
      await p.mouse.move(5, 5); await p.waitForTimeout(9500);
      r.changesAfter = after(await curStr(p), t + 200);
      return r;
    }],
    afterKey1440: [1440, false, async (p) => {
      await p.keyboard.press("ArrowRight"); const t = await pnow(p); const r = { label: await btn(p) };
      await p.waitForTimeout(9500);
      r.changesAfter = after(await curStr(p), t + 200);
      return r;
    }],
    afterTapNext390: [390, false, async (p) => {
      await p.tap(sel("next")); const t = await pnow(p); const r = { label: await btn(p) };
      await p.waitForTimeout(9500);
      r.changesAfter = after(await curStr(p), t + 200);
      return r;
    }],
    afterClickNextReduce1440: [1440, true, async (p) => {
      await p.click(sel("next")); const t = await pnow(p); const r = { label: await btn(p) };
      await p.mouse.move(5, 5); await p.waitForTimeout(9500);
      r.changesAfter = after(await curStr(p), t + 200);
      return r;
    }],
  };
  const out = {};
  await Promise.all(Object.entries(T).map(async ([k, [w, reduce, fn]]) => {
    const { ctx, page, errors } = await open(w, { reduce });
    try { out[k] = await fn(page); out[k].errors = errors; } catch (e) { out[k] = { error: String(e.message || e) }; }
    finally { await ctx.close(); }
  }));
  const L = (b, t) => !!b && b.text === t && b.label === "자동 넘김 " + t && !b.hasPressed;
  const axOk = (list, t) => Array.isArray(list) && list.some((n) => n.name === "자동 넘김 " + t && !n.pressed) && list.every((n) => !n.pressed);
  const v = {
    loadDefault: L(out.auto1440.load, "정지") && axOk(out.auto1440.ax, "정지"),
    autoAdvance8s: out.auto1440.firstAdvanceMs !== null && out.auto1440.firstAdvanceMs >= 7900 && out.auto1440.firstAdvanceMs <= 8300 && out.auto390.firstAdvanceMs !== null && out.auto390.firstAdvanceMs <= 8300,
    clickPause: L(out.click1440.paused, "재생") && axOk(out.click1440.axPaused, "재생") && out.click1440.changesWhilePaused.length === 0,
    clickResume: L(out.click1440.resumed, "정지") && axOk(out.click1440.axResumed, "정지") && out.click1440.advanceFromMouseLeaveMs !== null && out.click1440.advanceFromMouseLeaveMs <= 8300,
    keyboardPauseResume: L(out.keyboard1440.paused, "재생") && out.keyboard1440.changesWhilePaused.length === 0 && L(out.keyboard1440.resumed, "정지") && out.keyboard1440.advanceFromResumeMs !== null && out.keyboard1440.advanceFromResumeMs <= 8300,
    tapPauseResume390: L(out.tap390.paused, "재생") && out.tap390.changesWhilePaused.length === 0 && L(out.tap390.resumed, "정지") && out.tap390.advanceFromResumeMs !== null && out.tap390.advanceFromResumeMs <= 8300,
    reduceLoad: L(out.reduce1440.load, "재생") && axOk(out.reduce1440.ax, "재생") && out.reduce1440.advances === 0 && L(out.reduce390.load, "재생") && axOk(out.reduce390.ax, "재생") && out.reduce390.advances === 0,
    labelAfterNav: ["afterClickNext1440", "afterClickPrev1440", "afterKey1440", "afterTapNext390", "afterClickNextReduce1440"].every((k) => L(out[k].label, "재생") && out[k].changesAfter.length === 0),
  };
  out.v = v; out.pass = Object.values(v).every(Boolean);
  out.observe = { hoverHoldsAfterResume: out.hover1440.changesWhileHovering.length === 0, hoverLeaveAdvanceMs: out.hover1440.advanceFromLeaveMs,
    touchResumeStuck: { tap390long: { advancesIn20s: out.tap390long.changesIn20s.length, label: out.tap390long.labelAt20s, hov: out.tap390long.hov }, tapNextThenPlay390: { advancesIn20s: out.tapNextThenPlay390.changesIn20s.length, label: out.tapNextThenPlay390.labelAt20s, hov: out.tapNextThenPlay390.hov }, keyboard390AdvanceMs: out.keyboard390.advanceFromResumeMs } };
  v.tapResumeWithin20s = out.tap390long.changesIn20s.length > 0 && out.tapNextThenPlay390.changesIn20s.length > 0;
  out.pass = Object.values(v).every(Boolean);
  log("pause", JSON.stringify(v));
  log("pause touch", JSON.stringify(out.observe.touchResumeStuck));
  log("pause nums", JSON.stringify({ auto1440: out.auto1440.firstAdvanceMs, auto390: out.auto390.firstAdvanceMs, clickLeave: out.click1440.advanceFromMouseLeaveMs, clickResume: out.click1440.advanceFromResumeClickMs, kb: out.keyboard1440.advanceFromResumeMs, tap390: out.tap390.advanceFromResumeMs, hoverHeld: out.hover1440.changesWhileHovering.length, hoverLeave: out.hover1440.advanceFromLeaveMs, reduce: [out.reduce1440.heldMs, out.reduce1440.advances, out.reduce390.heldMs, out.reduce390.advances] }));
  result.pause = out; save();
}

// ───────── 4 카드 1장 ─────────
const N1 = () => {
  const root = document.querySelector(".pdim"), bar = root.querySelector(".pbar");
  return {
    n: root.querySelectorAll(".pslot").length, dialogLabel: root.getAttribute("aria-label"), title: (root.querySelector(".pslot[data-on] h2") || {}).textContent,
    barChildren: [...bar.children].map((c) => c.tagName.toLowerCase() + "." + c.className), buttons: [...bar.querySelectorAll("button")].map((b) => b.textContent.trim()),
    mute: (bar.querySelector(".pmute") || {}).textContent, muteInput: !!bar.querySelector(".pmute input[type=checkbox][data-ppop-mute-all]"),
    has: { prev: !!bar.querySelector("[data-ppop-prev]"), next: !!bar.querySelector("[data-ppop-next]"), pause: !!bar.querySelector("[data-ppop-pause]"), pnav: !!bar.querySelector(".pnav"), pcnt: !!bar.querySelector(".pcnt") },
    promoRootHidden: document.getElementById("promoPopup") ? document.getElementById("promoPopup").hidden : null, promoCardInStage: !!root.querySelector("#ppopT"),
  };
};
async function n1Part() {
  const out = {};
  for (const [name, cfg, w, dsf] of [["null@1440", CFG_NULL, 1440, 1], ["null@390", CFG_NULL, 390, 1], ["expired@1440", CFG_EXPIRED, 1440, 1], ["null@1440_x3", CFG_NULL, 1440, 3]]) {
    if (stopped()) { out.stopped = true; break; }
    const { ctx, page, errors } = await open(w, { cfg, dsf });
    const m = await page.evaluate(N1);
    const geo = await page.evaluate(GEO);
    const st0 = await page.evaluate(ST);
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200);
    const st1 = await page.evaluate(ST);
    const r = { m, geo, joinOk: joinOk(geo), layout: layoutOk(st0) && barAligned(st0), barParent: st0.barParent, barGap: st0.barGap, focus: st0.focus.el, focusTitle: st0.focus.activeTitle, arrowNoop: st1.open && JSON.stringify(st1.onIdx) === JSON.stringify(st0.onIdx) && st1.focus.el === st0.focus.el, errors };
    if (name === "null@1440") { const p = path.join(SHOTS, "popnav_n1_1440.png"); await page.screenshot({ path: p }); shots.add(p); r.shot = p; }
    if (dsf === 3) r.crop = await joinCrop(page, "popnav_n1_join_x3.png");
    r.pass = m.n === 1 && !m.has.prev && !m.has.next && !m.has.pause && !m.has.pnav && !m.has.pcnt && JSON.stringify(m.buttons) === JSON.stringify(["닫기"]) && m.muteInput && r.joinOk && r.layout && r.focusTitle && r.arrowNoop && errors.length === 0 && (!r.crop || r.crop.singleLine3px);
    out[name] = r;
    log(`n1 ${name}`, r.pass ? "PASS" : "FAIL", JSON.stringify({ n: m.n, buttons: m.buttons, children: m.barChildren, has: m.has, label: m.dialogLabel, join: [geo.popBorderBottom, geo.barBorderTop, geo.gap, geo.dL, geo.dR], radius: [geo.popRadius, geo.barRadius], arrowNoop: r.arrowNoop, crop: r.crop && r.crop.scan }));
    await ctx.close();
  }
  result.n1 = out; save();
}

// ───────── 5 시각 ─────────
const TR = () => [...document.querySelectorAll(".pdim .pslot")].map((s) => {
  const cs = getComputedStyle(s); const m = new DOMMatrix(cs.transform === "none" ? "matrix(1,0,0,1,0,0)" : cs.transform);
  const pop = s.querySelector(":scope > .pop"), pfr = pop.querySelector(".pfr");
  return { i: +s.dataset.i, on: s.hasAttribute("data-on"), a: +m.a.toFixed(4), tx: +m.e.toFixed(2), bg: getComputedStyle(pop).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number), op: +parseFloat(getComputedStyle(pfr).opacity).toFixed(4), w: s.offsetWidth, slotOp: +parseFloat(cs.opacity).toFixed(4) };
});
function bez(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax_ = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax_ * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => { let lo = 0, hi = 1; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (X(m) < x) lo = m; else hi = m; } return Y((lo + hi) / 2); };
}
const EASE = bez(0.22, 0.68, 0, 1);
function prog(tr) {
  return tr.map((s) => {
    const X0 = s.w + 24, on = s.on, sum = s.bg[0] + s.bg[1] + s.bg[2];   // --card 255,253,248 합 756 / --mat 235,228,212 합 675
    const pScale = on ? (s.a - 0.9) / 0.1 : (1 - s.a) / 0.1;
    const pTx = on ? 1 - Math.abs(s.tx) / X0 : Math.abs(s.tx) / X0;
    const pBg = on ? (sum - 675) / 81 : (756 - sum) / 81;
    const pOp = on ? (s.op - 0.55) / 0.45 : (1 - s.op) / 0.45;
    const ps = [pScale, pTx, pBg, pOp].map((x) => +x.toFixed(3));
    return { i: s.i, role: on ? "새 활성" : "새 측면", a: s.a, tx: s.tx, bg: s.bg.join(","), pfrOpacity: s.op, pScale: ps[0], pTx: ps[1], pBg: ps[2], pOp: ps[3], spread: +(Math.max(...ps) - Math.min(...ps)).toFixed(3) };
  });
}
async function visualPart() {
  const out = {};
  {
    const { ctx, page, errors } = await open(1440);
    await page.click(sel("next")); await page.mouse.move(5, 5); await page.waitForTimeout(800);
    const st = await page.evaluate(ST), geo = await page.evaluate(GEO);
    const p = path.join(SHOTS, "popnav_1440.png"); await page.screenshot({ path: p }); shots.add(p);
    out.after1440 = { cur: st.cur, layout: layoutOk(st) && barAligned(st), barGap: st.barGap, focus: st.focus.el, pause: st.pause, geo, joinOk: joinOk(geo), errors, shot: p };
    log("visual after1440", st.cur, JSON.stringify({ join: [geo.popBorderBottom, geo.barBorderTop, geo.gap, geo.dL, geo.dR], popR: geo.popRadius, barR: geo.barRadius, sides: geo.sides.map((s) => s.radius) }));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open(390);
    await page.tap(sel("next")); await page.waitForTimeout(800);
    const st = await page.evaluate(ST), geo = await page.evaluate(GEO);
    const p = path.join(SHOTS, "popnav_390.png"); await page.screenshot({ path: p }); shots.add(p);
    // 탭 뒤 → 에 :hover 바탕(--mat)이 남는가(.parr:hover 가 (hover:hover) 로 묶이지 않음)
    const stickyHover = await page.evaluate(() => { const n = document.querySelector(".pdim [data-ppop-next]"); return { nextHover: n.matches(":hover"), nextBg: getComputedStyle(n).backgroundColor, hoverHoverMQ: matchMedia("(hover:hover)").matches }; });
    out.after390 = { cur: st.cur, layout: layoutOk(st) && barAligned(st), barGap: st.barGap, focus: st.focus.el, pause: st.pause, geo, joinOk: joinOk(geo), stickyHover, errors, shot: p };
    log("visual after390", st.cur, JSON.stringify({ join: [geo.popBorderBottom, geo.barBorderTop, geo.gap, geo.dL, geo.dR], sides: geo.sides.map((s) => [s.radius, s.rect.l]), stickyHover }));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(1440, { dsf: 3 });
    out.joinRest = await joinCrop(page, "popnav_join_x3.png");
    const g = out.joinRest.geo, side = g.sides[0];
    if (side) { const c = { x: side.rect.l - 6, y: side.rect.b - 24, width: 48, height: 30 }; const p = path.join(SHOTS, "popnav_side_corner_x3.png"); await page.screenshot({ path: p, clip: c }); shots.add(p); out.sideCorner = { file: p, clip: c, radius: side.radius }; }
    await page.click(sel("next")); await page.mouse.move(5, 5); await page.waitForTimeout(800);
    out.joinAfterNext = await joinCrop(page, "popnav_join_x3_after_next.png");
    log("visual join rest", JSON.stringify(out.joinRest.scan), "single", out.joinRest.singleLine3px, "| after next", JSON.stringify(out.joinAfterNext.scan), out.joinAfterNext.singleLine3px);
    await ctx.close();
  }
  { // N=3 1440 정지 화면(좌우 측면 둘)
    const { ctx, page, errors } = await open(1440, { notices: NOTICE3 });
    await page.mouse.move(5, 5);
    const st = await page.evaluate(ST), geo = await page.evaluate(GEO);
    const p = path.join(SHOTS, "popnav_n3_1440.png"); await page.screenshot({ path: p }); shots.add(p);
    out.n3_1440 = { cur: st.cur, sideDirs: st.sideDirs, layout: layoutOk(st) && barAligned(st), barGap: st.barGap, joinOk: joinOk(geo), sides: geo.sides.map((x) => ({ i: x.i, radius: x.radius, rect: x.rect })), bar: geo.bar, pop: geo.pop, errors, shot: p };
    log("visual n3_1440", JSON.stringify({ cur: st.cur, sideDirs: st.sideDirs, barGap: st.barGap, sides: out.n3_1440.sides.map((x) => [x.i, x.radius, x.rect.l, x.rect.r, x.rect.b]), bar: geo.bar }));
    await ctx.close();
  }
  // 넘김 전이 0/150/300/500ms (→ 단추 el.click 직후 .pdim 안 CSS 전이를 pause, currentTime = t)
  out.turn = {};
  for (const t of [0, 150, 300, 500]) {
    const { ctx, page } = await open(1440);
    const before = await page.evaluate(ST);
    await page.mouse.move(5, 5);
    const anims = await page.evaluate((t) => {
      const root = document.querySelector(".pdim");
      root.querySelector("[data-ppop-next]").click();
      root.querySelectorAll(".pslot, .pslot > .pop, .pslot .pfr").forEach((e) => { const c = getComputedStyle(e); void (c.transform + c.backgroundColor + c.opacity); });
      const list = document.getAnimations().filter((a) => a.effect && a.effect.target && root.contains(a.effect.target));
      list.forEach((a) => { a.pause(); a.currentTime = t; });
      const d = (el) => (el.classList.contains("pslot") ? "slot" + el.dataset.i : el.classList.contains("pop") ? "pop" + el.closest(".pslot").dataset.i : el.classList.contains("pfr") ? "pfr" + el.closest(".pslot").dataset.i : el.className);
      return list.map((a) => ({ prop: a.transitionProperty, target: d(a.effect.target), dur: a.effect.getTiming().duration, easing: a.effect.getTiming().easing, ct: a.currentTime }));
    }, t);
    await page.waitForTimeout(150);
    const tr = await page.evaluate(TR);
    const after_ = await page.evaluate(ST);
    const table = prog(tr);
    const p = path.join(SHOTS, `popnav_turn_${t}.png`); await page.screenshot({ path: p }); shots.add(p);
    const barAnims = anims.filter((a) => /pbar|parr|pnav|pclose|pmute/.test(a.target)).length;
    out.turn[t] = { cur: `${before.cur}->${after_.cur}`, ease: +EASE(t / 500).toFixed(3), anims, barAnims, barRest: before.bar, barAtT: after_.bar, barMove: rectDelta(before.bar, after_.bar), table, maxSpread: Math.max(...table.map((r) => r.spread)), shot: p };
    log(`visual turn ${t}ms ease=${out.turn[t].ease} barMove=${out.turn[t].barMove}`, table.map((r) => `slot${r.i}(${r.role}) scale=${r.pScale} tx=${r.pTx} bg=${r.pBg} op=${r.pOp} spread=${r.spread} [a=${r.a} bg=${r.bg} pfr=${r.pfrOpacity}]`).join(" | "), "anims", anims.map((a) => `${a.target}:${a.prop}:${a.dur}`).join(","));
    await ctx.close();
  }
  // 실시간 rAF 표본 (pause 없이 650ms)
  {
    const { ctx, page } = await open(1440);
    await page.evaluate((src) => {
      const TRf = eval("(" + src + ")");   // 이 스크립트의 측정 함수 TR 소스(외부 입력 아님)를 페이지 안에서 매 프레임 부른다
      window.__raf = []; const bar = document.querySelector(".pdim .pbar"), nx = document.querySelector(".pdim [data-ppop-next]");
      const BR = () => { const b = bar.getBoundingClientRect(), n = nx.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, nl: n.left, nt: n.top }; };
      window.__bar0 = BR(); const t0 = performance.now();
      document.querySelector(".pdim [data-ppop-next]").click();
      const f = () => { const t = performance.now() - t0; window.__raf.push({ t: +t.toFixed(1), s: TRf(), bar: BR() }); if (t < 650) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }, TR.toString());
    await page.waitForTimeout(1000);
    const raf = await page.evaluate(() => window.__raf);
    const bar0 = await page.evaluate(() => window.__bar0);
    const barMoves = raf.map((f) => Math.max(...Object.keys(bar0).map((k) => Math.abs(f.bar[k] - bar0[k]))));
    const rows = raf.map((f) => ({ t: f.t, p: prog(f.s) }));
    const spreads = rows.map((r) => Math.max(...r.p.map((x) => x.spread)));
    out.raf = { frames: rows.length, maxSpread: +Math.max(...spreads).toFixed(3), bar0, barMaxMovePx: +Math.max(...barMoves).toFixed(3), barFramesMoved: barMoves.filter((x) => x > 0).length, sample: rows.filter((_, k) => k % Math.max(1, Math.floor(rows.length / 8)) === 0).map((r) => ({ t: r.t, p: r.p.map((x) => ({ i: x.i, role: x.role, pScale: x.pScale, pTx: x.pTx, pBg: x.pBg, pOp: x.pOp })) })) };
    log("visual raf frames", rows.length, "maxSpread", out.raf.maxSpread, "barMaxMovePx", out.raf.barMaxMovePx, "barFramesMoved", out.raf.barFramesMoved);
    await ctx.close();
  }
  // reduce: 전이 0
  out.reduce = {};
  for (const w of [1440, 390]) {
    const { ctx, page } = await open(w, { reduce: true });
    const r = await page.evaluate(() => {
      const root = document.querySelector(".pdim");
      // 사이트 전역 reduce 규칙(base.css 107행 *{transition-duration:.01ms!important})이 duration 을 .01ms 로 덮으므로 무대 셋은 transition-property none 으로 판정한다
      const tp = (e) => { const c = getComputedStyle(e); return c.transitionProperty + " / " + c.transitionDuration; };
      const dur = () => ({ slot: tp(root.querySelector(".pslot")), pop: tp(root.querySelector(".pslot > .pop")), pfr: tp(root.querySelector(".pslot .pfr")) });
      root.querySelector("[data-ppop-next]").click();
      root.querySelectorAll(".pslot, .pslot > .pop, .pslot .pfr").forEach((e) => { const c = getComputedStyle(e); void (c.transform + c.backgroundColor + c.opacity); });
      const all = document.getAnimations().filter((a) => a.effect && a.effect.target && root.contains(a.effect.target));
      const isStage = (t) => t.classList.contains("pslot") || t.classList.contains("pop") || t.classList.contains("pfr");
      return { anims: all.filter((a) => isStage(a.effect.target)).length, otherAnims: all.filter((a) => !isStage(a.effect.target)).map((a) => a.effect.target.tagName.toLowerCase() + ":" + a.transitionProperty + ":" + a.effect.getTiming().duration + "ms"), dur: dur() };
    });
    const tr = await page.evaluate(TR);
    r.immediate = prog(tr).map((x) => ({ i: x.i, role: x.role, pScale: x.pScale, pBg: x.pBg, pOp: x.pOp }));
    r.pass = r.anims === 0 && Object.values(r.dur).every((d) => d.startsWith("none")) && r.immediate.every((x) => x.pScale === 1 && x.pBg === 1 && x.pOp === 1);
    out.reduce[w] = r;
    log(`visual reduce ${w}`, JSON.stringify(r));
    await ctx.close();
  }
  { // 기본 모션의 전이 시간 대조
    const { ctx, page } = await open(1440);
    out.defaultDur = await page.evaluate(() => { const root = document.querySelector(".pdim"); return { slot: getComputedStyle(root.querySelector(".pslot")).transitionDuration, slotProp: getComputedStyle(root.querySelector(".pslot")).transitionProperty, pop: getComputedStyle(root.querySelector(".pslot > .pop")).transitionDuration + " " + getComputedStyle(root.querySelector(".pslot > .pop")).transitionProperty, pfr: getComputedStyle(root.querySelector(".pslot .pfr")).transitionDuration + " " + getComputedStyle(root.querySelector(".pslot .pfr")).transitionProperty }; });
    await ctx.close();
  }
  result.visual = out; save();
}

// ───────── 6 닫기 ─────────
function kstMidnight(now) { const t = now + 9 * 3600 * 1000; const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - 9 * 3600 * 1000; }
const CLOSED = () => ({ dim: !!document.querySelector(".pdim"), htmlOpen: document.documentElement.classList.contains("ppop-open"), inertN: [...document.body.children].filter((e) => e.hasAttribute("inert")).length, focus: document.activeElement ? document.activeElement.tagName.toLowerCase() : null, shown: sessionStorage.getItem("hh_popup_shown"), mute: localStorage.getItem("hh_popup_mute_v1") });
async function closePart() {
  const out = {};
  for (const w of [1440, 390]) {
    for (const how of ["close_btn", "esc", "dim"]) {
      if (stopped()) { out.stopped = true; break; }
      const { ctx, page, errors } = await open(w);
      const before = await page.evaluate(() => ({ htmlOpen: document.documentElement.classList.contains("ppop-open"), inertN: [...document.body.children].filter((e) => e.hasAttribute("inert")).length }));
      let hit = null;
      if (how === "close_btn") await (w < 600 ? page.tap(sel("close")) : page.click(sel("close")));
      else if (how === "esc") await page.keyboard.press("Escape");
      else { hit = await page.evaluate(() => { const e = document.elementFromPoint(8, 8); return e ? e.tagName.toLowerCase() + "." + e.className : null; }); await (w < 600 ? page.touchscreen.tap(8, 8) : page.mouse.click(8, 8)); }
      await page.waitForTimeout(300);
      const a = await page.evaluate(CLOSED);
      const r = { before, hit, after: a, errors, pass: !a.dim && !a.htmlOpen && a.inertN === 0 && a.mute === null && errors.length === 0 && (how !== "dim" || /pback/.test(hit || "")) };
      out[`${how}@${w}`] = r;
      log(`close ${how}@${w}`, r.pass ? "PASS" : "FAIL", JSON.stringify({ before, hit, after: a }));
      await ctx.close();
    }
    for (const mute of [true, false]) {
      const { ctx, page, errors } = await open(w);
      if (mute) await (w < 600 ? page.tap(".pdim .pmute") : page.click(".pdim .pmute"));
      const checked = await page.$eval(".pdim [data-ppop-mute-all]", (e) => e.checked);
      const tClose = Date.now();
      await (w < 600 ? page.tap(sel("close")) : page.click(sel("close")));
      await page.waitForTimeout(300);
      const a = await page.evaluate(CLOSED);
      const muteAll = a.mute ? JSON.parse(a.mute).all : null;
      await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(2500);
      const reloadDim = !!(await page.$(".pdim"));
      const p2 = await ctx.newPage();
      await p2.goto(BASE + "index.html", { waitUntil: "networkidle" }); await p2.waitForTimeout(2500);
      const newTabDim = !!(await p2.$(".pdim"));
      const p2shown = await p2.evaluate(() => sessionStorage.getItem("hh_popup_shown"));
      const r = { checked, after: a, muteAll, muteAllIso: muteAll ? new Date(muteAll).toISOString() : null, expectKstMidnight: new Date(kstMidnight(tClose)).toISOString(), reloadSameTabDim: reloadDim, newTabSameCtxDim: newTabDim, newTabSessionShown: p2shown, errors };
      r.pass = mute ? checked && muteAll === kstMidnight(tClose) && !reloadDim && !newTabDim && !a.dim : !checked && muteAll === null && !reloadDim && newTabDim;
      out[`${mute ? "mute" : "control_nomute"}@${w}`] = r;
      log(`close ${mute ? "mute" : "control"}@${w}`, r.pass ? "PASS" : "FAIL", JSON.stringify(r));
      await ctx.close();
    }
  }
  result.close = out; save();
}

// ───────── 7 초점 모델 (6회차 신규) ─────────
//   N>1 첫 초점 = .pdim(role=dialog, aria-label 「안내 N건」). 자동 넘김은 초점을 옮기지 않는다. Tab 첫 이동 = 활성 카드 첫 조작 요소, 순환, 카드 안 초점 = 벨트 정지, ESC 복귀.
const FI_INIT = () => {
  window.__fi = [];
  document.addEventListener("focusin", (e) => { const t = e.target; window.__fi.push({ t: +performance.now().toFixed(1), el: (t.tagName || "").toLowerCase() + (typeof t.className === "string" && t.className ? "." + t.className.trim().split(/\s+/)[0] : "") }); }, true);
};
// 팝업이 열리기 전에 지면 링크 하나에 초점을 둔다(ESC 뒤 복귀 대상). 공지 API 를 800ms 늦춰 여는 시점을 뒤로 민다
const PREFOCUS = () => {
  document.addEventListener("DOMContentLoaded", () => {
    const a = [...document.querySelectorAll("a[href]")].find((x) => x.getClientRects().length && !x.closest("[hidden],[inert]") && x.getBoundingClientRect().width > 0);
    if (a) { a.setAttribute("data-probe-pre", "1"); a.focus({ preventScroll: true }); window.__pre = { tag: a.tagName.toLowerCase(), text: a.textContent.trim().slice(0, 24), href: a.getAttribute("href"), focused: document.activeElement === a, t: +performance.now().toFixed(1) }; }
  });
};
const FOCUSABLES = () => {
  const root = document.querySelector(".pdim");
  const d = (e) => e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/)[0] : "") + (e.getAttribute("aria-label") ? "[" + e.getAttribute("aria-label") + "]" : "") + "«" + (e.textContent || "").trim().slice(0, 14) + "»";
  const f = [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.tabIndex >= 0 && !el.closest("[hidden],[inert]") && el.getClientRects().length);
  const on = root.querySelector(".pslot[data-on]"), bar = root.querySelector(".pbar");
  f.forEach((e, i) => { e.dataset.probeF = String(i); });   // 표기(정지↔재생)가 바뀌어도 같은 요소로 대조하려고 번호를 붙인다
  return f.map((e, i) => ({ i, d: d(e), inActive: on.contains(e), inBar: bar.contains(e) }));
};
const AE = () => {
  const ae = document.activeElement, root = document.querySelector(".pdim");
  const d = (e) => (e ? e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/)[0] : "") + (e.getAttribute && e.getAttribute("aria-label") ? "[" + e.getAttribute("aria-label") + "]" : "") + "«" + (e.textContent || "").trim().slice(0, 14) + "»" : null);
  const on = root && root.querySelector(".pslot[data-on]");
  return { d: root && ae === root ? "ROOT" : d(ae), fi: ae && ae.dataset && ae.dataset.probeF !== undefined ? +ae.dataset.probeF : null, isRoot: !!root && ae === root, role: ae && ae.getAttribute("role"), label: ae && ae.getAttribute("aria-label"), inDialog: !!root && root.contains(ae), inActive: !!on && on.contains(ae), inInert: !!(ae && ae.closest && ae.closest("[inert]")), pre: !!(ae && ae.hasAttribute && ae.hasAttribute("data-probe-pre")), open: !!root };
};
async function focusPart() {
  const waitFrom = async (p, ms) => { const openT = await p.evaluate(() => window.__openT); await p.waitForTimeout(Math.max(0, ms - ((await pnow(p)) - openT))); return openT; };
  const T = {
    load1440: [1440, {}, async (p) => ({ ae: await p.evaluate(AE), ax: await axFocused(p), rootLabel: await p.evaluate(() => document.querySelector(".pdim").getAttribute("aria-label")), rootRole: await p.evaluate(() => document.querySelector(".pdim").getAttribute("role")), n: await p.evaluate(() => document.querySelectorAll(".pdim .pslot").length) })],
    load390: [390, {}, async (p) => ({ ae: await p.evaluate(AE), ax: await axFocused(p), rootLabel: await p.evaluate(() => document.querySelector(".pdim").getAttribute("aria-label")), n: await p.evaluate(() => document.querySelectorAll(".pdim .pslot").length) })],
    load1440_n3: [1440, { notices: NOTICE3 }, async (p) => ({ ae: await p.evaluate(AE), ax: await axFocused(p), rootLabel: await p.evaluate(() => document.querySelector(".pdim").getAttribute("aria-label")), n: await p.evaluate(() => document.querySelectorAll(".pdim .pslot").length) })],
    // 자동 넘김 20초: focusin 은 첫 1회(.pdim)뿐이어야
    auto20_1440: [1440, { init: FI_INIT }, async (p) => {
      await p.mouse.move(5, 5);
      const openT = await waitFrom(p, 20500);
      const fi = await p.evaluate(() => window.__fi), s = await curStr(p);
      return { openT, focusins: fi, focusinsAfterOpen: fi.filter((e) => e.t >= openT - 50), advances: s.length - 1, advanceMs: s.slice(1).map((e) => +(e.t - openT).toFixed(0)), seq: s.map((e) => e.v), aeAt20s: await p.evaluate(AE), pause: await btn(p) };
    }],
    auto20_390: [390, { init: FI_INIT }, async (p) => {
      const openT = await waitFrom(p, 20500);
      const fi = await p.evaluate(() => window.__fi), s = await curStr(p);
      return { openT, focusins: fi, focusinsAfterOpen: fi.filter((e) => e.t >= openT - 50), advances: s.length - 1, advanceMs: s.slice(1).map((e) => +(e.t - openT).toFixed(0)), seq: s.map((e) => e.v), aeAt20s: await p.evaluate(AE), pause: await btn(p) };
    }],
    // Tab 첫 이동 + 카드 안 초점 = 벨트 정지(9.5초 무변화)
    tab1440: [1440, {}, async (p) => {
      await p.mouse.move(5, 5);
      const f = await p.evaluate(FOCUSABLES), before = await p.evaluate(AE);
      await p.keyboard.press("Tab"); const t = await pnow(p);
      const ae = await p.evaluate(AE), pause = await btn(p);
      await p.waitForTimeout(9500);
      return { focusables: f, before, afterTab: ae, expFirst: f[0], firstActiveCard: f.find((x) => x.inActive) || null, pause, changesAfterTab: after(await curStr(p), t), aeAt9s: await p.evaluate(AE) };
    }],
    tab390: [390, {}, async (p) => {
      const f = await p.evaluate(FOCUSABLES), before = await p.evaluate(AE);
      await p.keyboard.press("Tab"); const t = await pnow(p);
      const ae = await p.evaluate(AE), pause = await btn(p);
      await p.waitForTimeout(9500);
      return { focusables: f, before, afterTab: ae, expFirst: f[0], firstActiveCard: f.find((x) => x.inActive) || null, pause, changesAfterTab: after(await curStr(p), t) };
    }],
    // 순환: 뿌리에서 Tab × (n+1) → 처음으로, 이어서 Shift+Tab × (n+1). 별도로 뿌리에서 Shift+Tab 첫 이동 = 마지막
    cycle1440: [1440, {}, async (p) => {
      await p.mouse.move(5, 5);
      const f = await p.evaluate(FOCUSABLES); const fwd = [], back = [];
      for (let k = 0; k <= f.length; k++) { await p.keyboard.press("Tab"); fwd.push(await p.evaluate(AE)); }
      for (let k = 0; k <= f.length; k++) { await p.keyboard.press("Shift+Tab"); back.push(await p.evaluate(AE)); }
      return { focusables: f.map((x) => x.d), fwd: fwd.map((x) => x.fi), back: back.map((x) => x.fi), fwdD: fwd.map((x) => x.d), backD: back.map((x) => x.d), allInDialog: [...fwd, ...back].every((x) => x.inDialog && !x.inInert) };
    }],
    shiftFirst1440: [1440, {}, async (p) => {
      const f = await p.evaluate(FOCUSABLES);
      await p.keyboard.press("Shift+Tab");
      return { focusables: f.map((x) => x.d), afterShiftTab: await p.evaluate(AE), expLast: f.at(-1).i, pause: await btn(p) };
    }],
    cycle390: [390, {}, async (p) => {
      const f = await p.evaluate(FOCUSABLES); const fwd = [], back = [];
      for (let k = 0; k <= f.length; k++) { await p.keyboard.press("Tab"); fwd.push(await p.evaluate(AE)); }
      for (let k = 0; k <= f.length; k++) { await p.keyboard.press("Shift+Tab"); back.push(await p.evaluate(AE)); }
      return { focusables: f.map((x) => x.d), fwd: fwd.map((x) => x.fi), back: back.map((x) => x.fi), fwdD: fwd.map((x) => x.d), backD: back.map((x) => x.d), allInDialog: [...fwd, ...back].every((x) => x.inDialog && !x.inInert) };
    }],
    // ESC: 여는 앞 요소(지면 링크)로 복귀
    esc1440: [1440, { init: PREFOCUS, noticeDelay: 800 }, async (p) => {
      const pre = await p.evaluate(() => window.__pre), open_ = await p.evaluate(AE);
      await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      return { pre, atOpen: open_, afterEsc: await p.evaluate(AE) };
    }],
    esc390: [390, { init: PREFOCUS, noticeDelay: 800 }, async (p) => {
      const pre = await p.evaluate(() => window.__pre), open_ = await p.evaluate(AE);
      await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      return { pre, atOpen: open_, afterEsc: await p.evaluate(AE) };
    }],
    escAfterTab1440: [1440, { init: PREFOCUS, noticeDelay: 800 }, async (p) => {
      const pre = await p.evaluate(() => window.__pre);
      await p.keyboard.press("Tab"); await p.keyboard.press("Tab"); const mid = await p.evaluate(AE);
      await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      return { pre, beforeEsc: mid, afterEsc: await p.evaluate(AE) };
    }],
    escN1_1440: [1440, { init: PREFOCUS, noticeDelay: 800, cfg: CFG_NULL }, async (p) => {
      const pre = await p.evaluate(() => window.__pre), open_ = await p.evaluate(AE);
      await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      return { pre, atOpen: open_, afterEsc: await p.evaluate(AE) };
    }],
    // N=1: 첫 초점 = 카드 제목(기존)
    n1_1440: [1440, { cfg: CFG_NULL }, async (p) => ({ ae: await p.evaluate(AE), st: (await p.evaluate(ST)).focus, ax: await axFocused(p), title: await p.evaluate(() => document.querySelector(".pdim .pslot[data-on] h2").textContent.trim()), rootLabel: await p.evaluate(() => document.querySelector(".pdim").getAttribute("aria-label")) })],
    n1_390: [390, { cfg: CFG_NULL }, async (p) => ({ ae: await p.evaluate(AE), st: (await p.evaluate(ST)).focus, ax: await axFocused(p), title: await p.evaluate(() => document.querySelector(".pdim .pslot[data-on] h2").textContent.trim()) })],
  };
  const out = {};
  await Promise.all(Object.entries(T).map(async ([k, [w, o, fn]]) => {
    const { ctx, page, errors } = await open(w, o);
    try { out[k] = await fn(page); out[k].errors = errors; } catch (e) { out[k] = { error: String(e.message || e) }; }
    finally { await ctx.close(); }
  }));
  const axRoot = (r, n) => Array.isArray(r.ax) && r.ax.length === 1 && r.ax[0].role === "dialog" && r.ax[0].name === `안내 ${n}건`;
  const fwdOk = (r) => !!r.fwd && r.fwd.length === r.focusables.length + 1 && r.fwd.slice(0, -1).every((x, i) => x === i) && r.fwd.at(-1) === 0;   // 0,1,..,n-1,0
  const backOk = (r) => { const n = r.focusables ? r.focusables.length : 0; return !!r.back && r.back.length === n + 1 && r.back.every((x, i) => x === (((-1 - i) % n) + n) % n); };   // n-1,..,0,n-1
  const fiAfter = (r) => (r.focusinsAfterOpen || []).length;
  const v = {
    loadRootN2: ["load1440", "load390"].every((k) => out[k].ae && out[k].ae.isRoot && out[k].rootLabel === "안내 2건" && axRoot(out[k], 2)) && out.load1440.rootRole === "dialog",
    loadRootN3: out.load1440_n3.ae && out.load1440_n3.ae.isRoot && out.load1440_n3.rootLabel === "안내 3건" && axRoot(out.load1440_n3, 3),
    autoNoFocusMove: ["auto20_1440", "auto20_390"].every((k) => out[k].advances >= 2 && fiAfter(out[k]) === 1 && out[k].focusinsAfterOpen[0].el === "div.pdim" && out[k].aeAt20s.isRoot),
    tabFirstActiveCard: ["tab1440", "tab390"].every((k) => out[k].afterTab && out[k].expFirst && out[k].afterTab.d === out[k].expFirst.d && out[k].afterTab.inActive),
    focusInCardPauses: ["tab1440", "tab390"].every((k) => out[k].pause && out[k].pause.text === "재생" && out[k].changesAfterTab.length === 0),
    tabCycle: ["cycle1440", "cycle390"].every((k) => fwdOk(out[k]) && backOk(out[k]) && out[k].allInDialog) && out.shiftFirst1440.afterShiftTab.fi === out.shiftFirst1440.expLast,
    escReturns: ["esc1440", "esc390", "escAfterTab1440", "escN1_1440"].every((k) => out[k].pre && out[k].pre.focused && out[k].afterEsc && !out[k].afterEsc.open && out[k].afterEsc.pre),
    n1Title: ["n1_1440", "n1_390"].every((k) => out[k].st && out[k].st.activeTitle && Array.isArray(out[k].ax) && out[k].ax.length === 1 && out[k].ax[0].role === "heading" && out[k].ax[0].name === out[k].title),
  };
  out.v = v; out.pass = Object.values(v).every(Boolean);
  log("focus", JSON.stringify(v));
  log("focus nums", JSON.stringify({ load: [out.load1440.ae && out.load1440.ae.d, out.load1440.ax, out.load390.ax, out.load1440_n3.ax], auto: ["auto20_1440", "auto20_390"].map((k) => [out[k].advances, out[k].advanceMs, out[k].focusinsAfterOpen, out[k].aeAt20s && out[k].aeAt20s.d]),
    tab: ["tab1440", "tab390"].map((k) => [out[k].afterTab && out[k].afterTab.d, out[k].expFirst && out[k].expFirst.d, out[k].pause && out[k].pause.text, out[k].changesAfterTab && out[k].changesAfterTab.length]),
    cycle: ["cycle1440", "cycle390"].map((k) => [out[k].focusables, out[k].fwd, out[k].back]), shiftFirst: out.shiftFirst1440.afterShiftTab && [out.shiftFirst1440.afterShiftTab.d, out.shiftFirst1440.afterShiftTab.fi, out.shiftFirst1440.expLast],
    esc: ["esc1440", "esc390", "escAfterTab1440", "escN1_1440"].map((k) => [out[k].pre, out[k].afterEsc && out[k].afterEsc.d, out[k].afterEsc && out[k].afterEsc.pre]), n1: ["n1_1440", "n1_390"].map((k) => [out[k].ae && out[k].ae.d, out[k].ax]) }));
  result.focus = out; save();
}

// ───────── 8 짧은 화면 (6회차 신규) ─────────
const SHORT = () => {
  const R = (b) => ({ l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1), h: +b.height.toFixed(1) });
  const root = document.querySelector(".pdim"), bar = root.querySelector(".pbar"), on = root.querySelector(".pslot[data-on]"), pop = on.querySelector(":scope > .pop"), stage = root.querySelector(".pstage");
  const br = bar.getBoundingClientRect(), pr = pop.getBoundingClientRect(), cs = getComputedStyle(pop);
  const sides = [...root.querySelectorAll(".pslot[data-side] > .pop")].map((p) => {
    const r = p.getBoundingClientRect(), ix = Math.max(0, Math.min(r.right, br.right) - Math.max(r.left, br.left)), iy = Math.max(0, Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top));
    const op = +getComputedStyle(p.parentElement).opacity;
    return { i: +p.parentElement.dataset.i, rect: R(r), overlapX: +ix.toFixed(1), overlapY: +iy.toFixed(1), overlapArea: +(ix * iy).toFixed(1), slotOpacity: op, gapAboveBar: +(br.top - r.bottom).toFixed(1) };
  });
  const sh = pop.scrollHeight, ch = pop.clientHeight, s0 = pop.scrollTop; pop.scrollTop = 60; const s1 = pop.scrollTop; pop.scrollTop = s0;
  const maxH = parseFloat(cs.maxHeight);
  return { vw: innerWidth, vh: innerHeight, slot: +on.dataset.i, title: on.querySelector("h2").textContent.trim().slice(0, 16), bar: R(br), barInView: br.bottom <= innerHeight + 0.01 && br.top >= -0.01, barOverflowPx: +(br.bottom - innerHeight).toFixed(1),
    pop: R(pr), popTopInView: pr.top >= -0.01, stage: R(stage.getBoundingClientRect()), maxHeight: cs.maxHeight, maxHExpected: +(0.72 * innerHeight).toFixed(1), popWithinMax: pr.height <= (Number.isFinite(maxH) ? maxH : 0.72 * innerHeight) + 0.5,
    overflowY: cs.overflowY, scrollH: sh, clientH: ch, overflows: sh > ch + 1, progScroll: s1 - s0, barGap: +(br.top - pr.bottom).toFixed(2), sides };
};
async function shortPart() {
  const out = {};
  const VPS = [[390, 640, true], [360, 640, true], [844, 390, true], [1440, 600, false], [1280, 720, false]];
  for (const [w, h, touch] of VPS) {
    for (const N of [2, 3]) {
      if (stopped()) { out.stopped = true; break; }
      const key = `${w}x${h}_n${N}`;
      const { ctx, page, errors } = await open(w, { h, touch, reduce: true, notices: N === 3 ? NOTICE3 : null });
      const rows = [];
      for (let k = 0; k < N; k++) {
        const r = await page.evaluate(SHORT);
        // 실제 스크롤 조작: 마우스 휠(데스크톱) 또는 터치 스크롤 제스처(폰). 넘치는 카드만
        if (r.overflows) {
          const c = { x: (r.pop.l + r.pop.r) / 2, y: Math.max(r.pop.t + 40, Math.min(r.pop.b - 40, (r.pop.t + r.pop.b) / 2)) };
          const winY0 = await page.evaluate(() => scrollY);
          if (touch) {
            const cdp = await ctx.newCDPSession(page);
            await cdp.send("Input.synthesizeScrollGesture", { x: c.x, y: c.y, yDistance: -120, speed: 800, gestureSourceType: "touch" }).catch((e) => { r.gestureErr = e.message; });
            await cdp.detach().catch(() => {});
          } else { await page.mouse.move(c.x, c.y); await page.mouse.wheel(0, 120); }
          await page.waitForTimeout(400);
          r.realScroll = await page.evaluate(() => document.querySelector(".pdim .pslot[data-on] > .pop").scrollTop);
          r.pageScrolled = (await page.evaluate(() => scrollY)) - winY0;
          r.stillOpen = !!(await page.$(".pdim"));
          r.curAfterScroll = r.stillOpen ? await page.evaluate(() => { const c = document.querySelector(".pdim [data-ppop-cur]"); return c ? +c.textContent : 1; }) : null;
          await page.evaluate(() => { document.querySelector(".pdim .pslot[data-on] > .pop").scrollTop = 0; });
          if (!touch) await page.mouse.move(5, 5);
        }
        if (k === 0 && N === 2) { const p = path.join(SHOTS, `popnav_${w}x${h}.png`); await page.screenshot({ path: p }); shots.add(p); r.shot = p; }
        rows.push(r);
        if (N > 1 && k < N - 1) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200); }
      }
      const pass = rows.every((r) => r.barInView && r.popTopInView && r.popWithinMax && Math.abs(r.barGap) <= 0.5 && r.sides.every((s) => s.overlapArea === 0) && (!r.overflows || (r.progScroll > 0 && r.realScroll > 0 && r.stillOpen && r.pageScrolled === 0 && r.curAfterScroll === r.slot + 1)));
      out[key] = { rows, pass, errors };
      log(`short ${key}`, pass ? "PASS" : "FAIL", JSON.stringify(rows.map((r) => ({ slot: r.slot, bar: [r.bar.t, r.bar.b, r.vh], barOver: r.barOverflowPx, popT: r.pop.t, popH: r.pop.h, maxH: r.maxHeight, of: r.overflows, prog: r.progScroll, real: r.realScroll, pageSc: r.pageScrolled, cur: r.curAfterScroll, gap: r.barGap, sides: r.sides.map((s) => [s.i, s.overlapArea, s.slotOpacity, s.gapAboveBar]) }))));
      await ctx.close();
    }
  }
  const all = Object.values(out).filter((x) => x && x.rows);
  out.summary = { pass: all.every((x) => x.pass), fail: Object.entries(out).filter(([, x]) => x && x.rows && !x.pass).map(([k]) => k),
    maxBarOverflowPx: Math.max(...all.flatMap((x) => x.rows.map((r) => r.barOverflowPx))), minPopTop: Math.min(...all.flatMap((x) => x.rows.map((r) => r.pop.t))),
    maxSideOverlap: Math.max(0, ...all.flatMap((x) => x.rows.flatMap((r) => r.sides.map((s) => s.overlapArea)))), overflowCards: all.flatMap((x) => x.rows.filter((r) => r.overflows)).length,
    scrolledOk: all.flatMap((x) => x.rows.filter((r) => r.overflows && r.realScroll > 0)).length };
  log("short summary", JSON.stringify(out.summary));
  result.short = out; save();
}

const parts = { nav: navPart, seq: seqPart, sweep: sweepPart, restpos: restposPart, pause: pausePart, n1: n1Part, visual: visualPart, close: closePart, focus: focusPart, short: shortPart };
for (const [k, fn] of Object.entries(parts)) {
  if (which !== "all" && which !== k) continue;
  if (stopped()) { log("STOP seen before", k); result.stopped = true; break; }
  const t0 = Date.now();
  try { await fn(); } catch (e) { log("PART ERROR", k, e.stack || e); result[k + "_error"] = String(e.stack || e); save(); }
  log(`part ${k} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
save();
log("wrote", OUT);
process.exit(0);
