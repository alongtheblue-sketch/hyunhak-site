// critic 7회차 독립 재실측 2: (1) .pdim 초점 키 스크롤 → 벨트 정지(e1955be) (2) 568x320 하단바 한 줄 주입 대조
// (3) 짧은 카드 활성 시 무대 무게중심 편차 + 같은 높이 슬롯 주입 대조(고정 하단바 유지 여부) (4) N=3 측면 아랫선.
// 리포 파일 무수정. 주입은 page.addStyleTag 로 이 실행 안에서만. 산출 = 표준 출력 JSON, 스크린샷 = r7/shots/critic_*.png
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const BASE = "http://localhost:8092/", APIB = "http://localhost:8799";
const SH = "/Users/gregory/Workspace/_wt/hh-studio12/_design/site_audit_20260923/r7/shots/";
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const NOTICE3 = { items: [{ id: "ntc_critic_n3", title: "critic 공지: 세 장 확인용", body_md: "셋째 장 위치를 재려고 route 로 더한 짧은 공지입니다." }] };
const b = await chromium.launch({ channel: "chrome", headless: true });
async function open(w, h, notices, extra = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", ...(w < 600 ? { hasTouch: true, isMobile: true } : {}), ...extra });
  if (notices) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(notices) }));
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(BASE + "index.html", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await p.waitForSelector(".pdim", { timeout: 15000 }); await p.waitForTimeout(800);
  return { ctx, p, errs };
}
const st = (p) => p.evaluate(() => { const on = document.querySelector(".pslot[data-on] .pop"); const pb = document.querySelector("[data-ppop-pause]");
  return { cur: document.querySelector("[data-ppop-cur]")?.textContent, pause: pb?.textContent, st: on.scrollTop, sh: on.scrollHeight, ch: on.clientHeight, ae: document.activeElement.className || document.activeElement.tagName }; });
const G = (p) => p.evaluate(() => { const r = (el) => { const q = el.getBoundingClientRect(); return [+q.left.toFixed(1), +q.top.toFixed(1), +q.right.toFixed(1), +q.bottom.toFixed(1)]; };
  const on = document.querySelector(".pslot[data-on] .pop"), bar = document.querySelector(".pbar"), stg = document.querySelector(".pstage");
  const sides = [...document.querySelectorAll(".pslot[data-side]:not([data-far]) .pop")].map(r);
  const o = r(on), bb = r(bar), s = r(stg);
  return { cur: document.querySelector("[data-ppop-cur]")?.textContent, on: o, bar: bb, stage: s, emptyAbove: +(o[1] - s[1]).toFixed(1), groupCenterDy: +(((o[1] + bb[3]) / 2) - innerHeight / 2).toFixed(1), sideBottoms: sides.map((x) => x[3]), barH: bar.offsetHeight, visCard: +(bb[1] - o[1]).toFixed(1) }; });
const out = {};
// (1) 키 스크롤 → 정지
for (const [w, h] of [[1440, 420], [390, 560]]) {
  const { ctx, p, errs } = await open(w, h, null);
  const a = await st(p); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(300); const bK = await st(p);
  await p.waitForTimeout(9500); const c = await st(p);
  await p.keyboard.press("PageDown"); await p.waitForTimeout(300); const d = await st(p);
  out[`keys_${w}x${h}`] = { start: a, afterArrowDown: bK, after9_8s: c, afterPageDown: d, errs };
  await ctx.close();
}
// (2) 568x320 하단바: 현재 vs 폭 472 이상에서 한 줄 주입
{
  const ONE = ".pdim .pbar{gap:var(--s1) var(--s3)!important}.pdim .pbar .pmute,.pdim .pbar .pclose{order:0!important;margin-left:0!important}.pdim .pbar .pnav{order:0!important;width:auto!important;margin-left:auto!important;border-top:0!important;justify-content:flex-start!important}";
  for (const [w, h] of [[568, 320], [540, 720], [480, 320]]) {
    const { ctx, p } = await open(w, h, null);
    const before = await G(p);
    await p.addStyleTag({ content: ONE }); await p.waitForTimeout(400);
    const after = await G(p);
    const oneRow = await p.evaluate(() => { const kids = [...document.querySelector(".pbar").children].map((k) => Math.round(k.getBoundingClientRect().top)); return new Set(kids).size === 1; });
    if (w === 568) await p.screenshot({ path: SH + "critic_568x320_onerow.png" });
    out[`bar_${w}x${h}`] = { before: { barH: before.barH, visCard: before.visCard }, oneRowInjected: { barH: after.barH, visCard: after.visCard, oneRow } };
    await ctx.close();
  }
}
// (3)(4) N=3 짧은 공지: 현재 vs 같은 높이 슬롯 주입
const EQ = ".pdim .pstage>.pslot{align-self:stretch}.pdim .pslot>.pop{flex:1 1 auto;display:flex;flex-direction:column}.pdim .pslot>.pop>.pfr{flex:1 0 auto}.pdim .pslot .pbot{margin-top:auto}";
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const mode of ["current", "equal"]) {
    const { ctx, p } = await open(w, h, NOTICE3);
    if (mode === "equal") { await p.addStyleTag({ content: EQ }); await p.waitForTimeout(400); }
    const rows = [];
    for (let k = 0; k < 3; k++) { rows.push(await G(p)); if (k === 2) await p.screenshot({ path: SH + `critic_${mode}_${w}_cur3.png` }); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(900); }
    out[`n3_${w}_${mode}`] = rows.map((r) => ({ cur: r.cur, emptyAbove: r.emptyAbove, groupCenterDy: r.groupCenterDy, barTop: r.bar[1], nextX: r.bar[2], sideBottoms: r.sideBottoms, onBottom: r.on[3] }));
    await ctx.close();
  }
}
await Promise.race([b.close(), new Promise((r) => setTimeout(r, 5000))]);
console.log(JSON.stringify(out, null, 1));
process.exit(0);
