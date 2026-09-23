// 배포 3차 라이브 실측 (s8, 2026-09-23, r6 판: 하단바 고정 위치 + 첫 초점 추가). https://hyunhak.com 실브라우저(system Chrome, 프록시 환경 그대로).
// 1) 팝업 무대 2폭 캡처 + 측면 카드 불투명(슬롯 opacity 1, 카드 바탕 불투명, .pfr .55) + 정지 단추 표기
// 2) 모션 감소 설정에서 단추 「재생」 aria-pressed=true
// 3) 홈 대학 목록 폭별 열 수와 괘선(430, 600, 601, 1024, 1440)
// 4) 가입 약관 행 같은 줄(390), 푸터 「결제」 가운데
// 사용: node _design/site_audit_20260923/r4/live_check.mjs [BASE]   → r4/live/*.png, r4/live_check.json
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const BASE = process.argv[2] || "https://hyunhak.com/";
const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(DIR, "live");   // r5/live
fs.mkdirSync(OUT, { recursive: true });
const res = { base: BASE, popup: {}, reduce: {}, tiles: {}, join: null, footer: null };
const browser = await chromium.launch({ channel: "chrome", headless: true });
const open = async (w, h, extra = {}) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", ...extra });
  const page = await ctx.newPage();
  return { ctx, page };
};
const popupState = () => {
  const btn = document.querySelector("[data-ppop-pause]");
  const slots = [...document.querySelectorAll(".pslot")].map((s) => {
    const pop = s.querySelector(".pop"), pfr = s.querySelector(".pfr");
    return { on: s.hasAttribute("data-on"), side: s.hasAttribute("data-side"), slotOpacity: getComputedStyle(s).opacity, popBg: pop && getComputedStyle(pop).backgroundColor, pfrOpacity: pfr && getComputedStyle(pfr).opacity, radius: pop && getComputedStyle(pop).borderRadius };
  });
  return { open: !!document.querySelector(".pdim"), cards: slots.length, btn: btn && { text: btn.textContent.trim(), label: btn.getAttribute("aria-label"), pressed: btn.getAttribute("aria-pressed") }, cur: document.querySelector("[data-ppop-cur]")?.textContent, slots };
};
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const { ctx, page } = await open(w, h);
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1500);
  res.popup[w] = await page.evaluate(popupState);
  await page.screenshot({ path: path.join(OUT, `live_popup_${w}.png`) });
  await ctx.close();
}
res.nav = {};
for (const [w, h, opt, how] of [[1440, 900, {}, "click"], [390, 844, { hasTouch: true, isMobile: true }, "tap"]]) {
  const { ctx, page } = await open(w, h, opt);
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const cur = () => page.evaluate(() => document.querySelector("[data-ppop-cur]")?.textContent || null);
  const r = { before: await cur(), initialFocus: await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName) };
  const next = page.locator("[data-ppop-next]"), prev = page.locator("[data-ppop-prev]");
  const npos = async () => { const bb = await next.boundingBox(); return bb && [Math.round(bb.x * 10) / 10, Math.round(bb.y * 10) / 10]; };
  if (await next.count()) {
    r.nextPos0 = await npos();
    if (how === "tap") await next.tap(); else await next.click();
    await page.waitForTimeout(700); r.afterNext = await cur(); r.nextPos1 = await npos();
    r.barAttach = await page.evaluate(() => { const b = document.querySelector(".pbar").getBoundingClientRect(), p = document.querySelector(".pslot[data-on] .pop").getBoundingClientRect(); return [+b.top.toFixed(1), +p.bottom.toFixed(1)]; });
    await page.screenshot({ path: path.join(OUT, `live_popup_next_${w}.png`) });
    if (how === "tap") await prev.tap(); else await prev.click();
    await page.waitForTimeout(400); r.afterPrev = await cur();
  }
  res.nav[w] = r;
  await ctx.close();
}
for (const w of [1440, 390]) {
  const { ctx, page } = await open(w, 844, { reducedMotion: "reduce" });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const before = await page.evaluate(popupState);
  await page.waitForTimeout(9500);
  const after = await page.evaluate(popupState);
  res.reduce[w] = { btn: before.btn, curBefore: before.cur, curAfter9s: after.cur };
  await ctx.close();
}
const tileM = () => {
  const box = document.querySelector("#tiles"); const tiles = [...box.querySelectorAll(".tile")];
  const gaps = [];
  for (let i = 0; i < tiles.length - 1; i++) {
    const a = tiles[i].getBoundingClientRect(), b = tiles[i + 1].getBoundingClientRect();
    if (Math.abs(a.top - b.top) < 1) gaps.push(+(tiles[i + 1].querySelector(".n").getBoundingClientRect().left - (tiles[i].querySelector(".ar") || tiles[i].lastElementChild).getBoundingClientRect().right).toFixed(1));
  }
  return { cols: getComputedStyle(box).gridTemplateColumns.split(" ").length, bt: tiles.slice(0, 6).map((t) => parseFloat(getComputedStyle(t).borderTopWidth)), pr: tiles.slice(0, 6).map((t) => parseFloat(getComputedStyle(t).paddingRight)), minGap: gaps.length ? Math.min(...gaps) : null, n: tiles.length, sw: document.documentElement.scrollWidth };
};
for (const w of [430, 600, 601, 1024, 1440]) {
  const { ctx, page } = await open(w, 900);
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelectorAll("#tiles .tile").length > 0, null, { timeout: 15000 }).catch(() => {});
  res.tiles[w] = await page.evaluate(tileM);
  if (w === 430 || w === 1024) { await page.addStyleTag({ content: ".rv{opacity:1!important;transform:none!important}" }); await page.locator("#find").screenshot({ path: path.join(OUT, `live_tiles_${w}.png`) }); }
  if (w === 1440) {
    res.footer = await page.evaluate(() => [...document.querySelectorAll("footer .ft-legal a")].map((a) => { const r = a.getBoundingClientRect(); const g = document.createRange(); g.selectNodeContents(a); const t = g.getBoundingClientRect(); return { t: a.textContent, left: +(t.left - r.left).toFixed(1), right: +(r.right - t.right).toFixed(1), h: Math.round(r.height) }; }));
  }
  await ctx.close();
}
{
  const { ctx, page } = await open(390, 844);
  await page.goto(BASE + "join.html", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(800);
  res.join = await page.evaluate(() => [...document.querySelectorAll("#joinForm .check")].map((row) => { const cb = row.querySelector("input[type=checkbox]"), sp = row.querySelector(".check-choice > span"); if (!cb || !sp) return null; const c = cb.getBoundingClientRect(), s = sp.getBoundingClientRect(); return { sameLine: s.left > c.right && (c.top + c.height / 2) < s.top + 30, cbTop: Math.round(c.top), spTop: Math.round(s.top) }; }).filter(Boolean));
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(DIR, "live_check.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
