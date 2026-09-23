// popnav 보조 진단 (6회차): 활성 카드 아래 1px(3d2ada3 에서 폭 0 → 투명 선) 띠가 카드 바탕 대신 뒤(딤 지면)를 비추는지.
//   popnav visual 의 joinAfterNext(dsf3, 행사 카드 활성)에서 선 1개 기대가 선 2개(3px 어두운 행 + 3px 하단바 윗선)로 나와 원인을 가른다.
//   행렬 = 1440/390 × dsf 1/2/3 × 카드별 활성(N=3, 공지 route 추가) + 대조(활성 .pop border-bottom-width:0 주입).
//   판정 행 = 활성 .pop 아래 1 CSS px 띠의 가운데 가로 전폭 픽셀. 바탕(--card 255,253,248)과 25 넘게 다른 픽셀 비율.
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const SHOTS = path.join(HERE, "shots");
const OUT = path.join(HERE, "popnav_joindiag.json");
const BASE = "http://localhost:8092/", APIB = "http://localhost:8799";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const NOTICE3 = { items: [{ id: "ntc_probe_n3", title: "프로브 공지: 세 장 순환 확인용 카드", body_md: "세 장 순환과 좌우 측면 카드 클릭을 재려고 route 로 더한 공지입니다." }] };
const browser = await chromium.launch({ channel: "chrome", headless: true });
const PY = "import sys,json\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGB')\ns=json.loads(sys.argv[2])\nW,H=im.size\nres=[]\nfor y in range(H):\n  row=[im.getpixel((x,y)) for x in range(s['x0'],W-s['x0'])]\n  d=sum(1 for p in row if max(abs(p[0]-255),abs(p[1]-253),abs(p[2]-248))>25)\n  res.append([y,round(d/len(row),3),list(row[len(row)//2])])\nprint(json.dumps(res))";
const out = { rows: {} };
for (const w of [1440, 390]) {
  for (const dsf of [1, 2, 3]) {
    for (const ctl of [false, true]) {
      const co = { viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: dsf, locale: "ko-KR", reducedMotion: "reduce" };
      if (w < 600) Object.assign(co, { hasTouch: true, isMobile: true });
      const ctx = await browser.newContext(co);
      await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(NOTICE3) }));
      const page = await ctx.newPage();
      await page.goto(BASE + "index.html", { waitUntil: "networkidle" });
      await page.addStyleTag({ content: RV });
      await page.waitForSelector(".pdim"); await page.waitForTimeout(700);
      if (ctl) await page.addStyleTag({ content: ".pdim .pslot[data-on] .pop{border-bottom-width:0!important}" });
      for (let k = 0; k < 4; k++) {   // 1 → 2 → 3 → 1 (마지막 = 첫 카드로 돌아온 뒤)
        await page.waitForTimeout(150);
        const g = await page.evaluate(() => {
          const on = document.querySelector(".pdim .pslot[data-on]"), pop = on.querySelector(":scope > .pop"), r = pop.getBoundingClientRect(), b = document.querySelector(".pdim .pbar").getBoundingClientRect();
          return { slot: +on.dataset.i, kind: (on.querySelector(".prib .k") || {}).textContent, l: r.left, b: r.bottom, w: r.width, h: +r.height.toFixed(3), barTop: b.top, scrollH: pop.scrollHeight, clientH: pop.clientHeight, bb: getComputedStyle(pop).borderBottomWidth };
        });
        const clip = { x: g.l, y: g.b - 3, width: g.w, height: 6 };   // 경계 = clip 안 CSS 3 → 띠(활성 .pop 아래 1px) = CSS 2~3, 하단바 윗선 = CSS 3~4
        const p = path.join(SHOTS, `popnav_joindiag_${w}_x${dsf}${ctl ? "_ctl" : ""}_k${k}_slot${g.slot}.png`);
        await page.screenshot({ path: p, clip });
        const rows = JSON.parse(execFileSync("python3", ["-c", PY, p, JSON.stringify({ x0: 3 * dsf })]).toString());
        // 띠 = dev 행 [2*dsf, 3*dsf), 하단바 윗선 = [3*dsf, 4*dsf). 행 반올림 여유로 ±1 행
        const band = rows.filter(([y]) => y >= 2 * dsf && y < 3 * dsf), line = rows.filter(([y]) => y >= 3 * dsf && y < 4 * dsf);
        const darkRuns = []; let cur = null;
        rows.forEach(([y, frac, px]) => { if (frac > 0.9) { if (cur && cur.end === y - 1) { cur.end = y; } else { cur = { start: y, end: y, px }; darkRuns.push(cur); } } });
        const key = `${w}_x${dsf}${ctl ? "_ctl" : ""}_k${k}`;
        out.rows[key] = { ...g, clip, shot: p, darkRuns: darkRuns.map((r) => ({ start: r.start, len: r.end - r.start + 1, px: r.px })), bandFrac: band.map((r) => r[1]), bandPx: band.map((r) => r[2]), lineFrac: line.map((r) => r[1]),
          doubleLine: darkRuns.length === 1 ? darkRuns[0].end - darkRuns[0].start + 1 >= 2 * dsf : darkRuns.length > 1 };
        console.log(key, JSON.stringify({ slot: g.slot, kind: g.kind, h: g.h, scroll: [g.scrollH, g.clientH], bb: g.bb, darkRuns: out.rows[key].darkRuns.map((r) => [r.start, r.len, r.px.join(",")]), double: out.rows[key].doubleLine }));
        await page.keyboard.press("ArrowRight");
      }
      await ctx.close();
    }
  }
}
const all = Object.entries(out.rows);
out.summary = {
  doubleByKey: Object.fromEntries(all.map(([k, r]) => [k, `${r.slot}:${r.doubleLine ? "2선" : "1선"}`])),
  doubleCount: all.filter(([k, r]) => !k.includes("_ctl") && r.doubleLine).length, total: all.filter(([k]) => !k.includes("_ctl")).length,
  ctlDoubleCount: all.filter(([k, r]) => k.includes("_ctl") && r.doubleLine).length, ctlTotal: all.filter(([k]) => k.includes("_ctl")).length,
};
console.log("summary", JSON.stringify(out.summary));
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
process.exit(0);
