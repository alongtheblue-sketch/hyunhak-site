// 반증 보조: sticky .setnav/.anch 가 sticky 헤더 아래에 제대로 붙는지(겹침 px) 폭별, 스크롤 위치별로 잰다. pre = 44aea38 route, post = 디스크.
import { createRequire } from "node:module";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const CHANGED = execFileSync("git", ["-C", REPO, "diff", "--name-only", "44aea38", "507edf1"]).toString().split("\n").filter(p => p && !/^(_design|_tools|_docs)\//.test(p));
const S = new Set(CHANGED);
const pre = Object.fromEntries(CHANGED.map(p => [p, execFileSync("git", ["-C", REPO, "show", `44aea38:${p}`])]));
const T = { css: "text/css", js: "text/javascript", html: "text/html; charset=utf-8" };
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });
const out = {};
for (const [pg, sel] of [["ranking", ".setnav"], ["studio", ".setnav"], ["interview/korea-eq-sci", "nav.anch"]]) for (const w of [1440, 900, 899, 768, 390, 320]) for (const v of ["pre", "post"]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
  if (v === "pre") await ctx.route(u => u.host === "localhost:8092" && S.has(decodeURIComponent(u.pathname.slice(1))), r => { const p = decodeURIComponent(new URL(r.request().url()).pathname.slice(1)); return r.fulfill({ status: 200, headers: { "content-type": T[p.split(".").pop()] }, body: pre[p] }); });
  await ctx.addInitScript(() => { try { sessionStorage.setItem("hh_popup_shown", "1"); } catch (e) {} });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:8092/${pg}.html`, { waitUntil: "networkidle" });
  const r = await p.evaluate(async (sel) => {
    document.documentElement.style.scrollBehavior = "auto";
    const hd = document.querySelector("header#hd"), el = document.querySelector(sel);
    if (!el) return null;
    const res = []; const H = document.documentElement.scrollHeight;
    for (let y = 0; y < H; y += 150) { scrollTo(0, y); await new Promise(r => setTimeout(r, 20)); const a = hd.getBoundingClientRect(), c = el.getBoundingClientRect(); if (c.top < 200 && c.bottom > 0) res.push([y, Math.round(a.bottom * 10) / 10, Math.round(c.top * 10) / 10]); }
    const stuck = res.filter(x => Math.abs(x[2] - res[res.length - 1][2]) < 0.5 || true);
    const ov = res.map(x => Math.round((x[1] - x[2]) * 10) / 10);
    const cs = getComputedStyle(el);
    return { top: cs.top, hdH: Math.round(hd.getBoundingClientRect().height * 10) / 10, samples: res.length, overlapMaxPx: Math.max(...ov), overlapModePx: ov.sort((a, b) => ov.filter(v => v === a).length - ov.filter(v => v === b).length).pop(), nOverlap: ov.filter(v => v > 0.5).length };
  }, sel);
  out[`${pg}@${w}_${v}`] = r;
  console.log(pg, w, v, JSON.stringify(r));
  await ctx.close();
}
fs.writeFileSync(new URL("./refute_setnav.json", import.meta.url), JSON.stringify(out, null, 1));
await Promise.race([b.close(), new Promise(r => setTimeout(r, 5000))]);
process.exit(0);
