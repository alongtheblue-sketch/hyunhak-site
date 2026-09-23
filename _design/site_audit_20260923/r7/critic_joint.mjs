// critic 7회차 독립 재실측: 접합 슬릿/겹선. 메인 세션 프로브(dsf 1, 2, 3)에 없던 분수 배율 1.25, 1.5 와 N=3 셋째 장(짧은 공지)을 더한다.
// 판정(장치 px 행): 활성 .pop bottom-3 ~ .pbar top+3 CSS px 창에서 카드 안쪽 폭(좌우 12 CSS px 제외) 픽셀의 max 채널 < 190 비율 >= 30% = 슬릿 행.
// 선 행 = 행 중앙값 max 채널 < 240. 선 행 묶음(연속) 수 = 선 개수(2 이상이면 겹선).
// 사용: node critic_joint.mjs → 표준 출력 JSON. 크롭은 스크래치패드에 저장(리포 밖).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const BASE = "http://localhost:8092/", APIB = "http://localhost:8799";
const TMP = "/private/tmp/claude-501/-Users-gregory/a498102d-d8da-423d-950c-f2201bb2189d/scratchpad/cj";
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const NOTICE3 = { items: [{ id: "ntc_critic_n3", title: "critic 공지: 세 장 확인용", body_md: "셋째 장 접합을 재려고 route 로 더한 공지입니다." }] };
const VPS = [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [430, 932], [390, 844]];
const DSFS = [1, 1.25, 1.5, 2];
const b = await chromium.launch({ channel: "chrome", headless: true });
const geo = () => { const on = document.querySelector(".pslot[data-on] .pop"), bar = document.querySelector(".pbar"); if (!on || !bar) return null;
  const a = on.getBoundingClientRect(), c = bar.getBoundingClientRect(); return { onB: a.bottom, barT: c.top, x0: a.left, x1: a.right, cur: document.querySelector("[data-ppop-cur]")?.textContent || "n1" }; };
const recs = [];
async function crop(page, dsf, tag) {
  const g = await page.evaluate(geo); if (!g) return { tag, missing: true };
  const y0 = Math.floor(Math.min(g.onB, g.barT)) - 3, y1 = Math.ceil(Math.max(g.onB, g.barT)) + 3;
  const file = `${TMP}/${tag}.png`;
  await page.screenshot({ path: file, clip: { x: Math.floor(g.x0) + 12, y: y0, width: Math.floor(g.x1 - g.x0) - 24, height: y1 - y0 } });
  return { tag, dsf, onB: +g.onB.toFixed(2), barT: +g.barT.toFixed(2), cur: g.cur, file };
}
for (const dsf of DSFS) for (const [w, h] of VPS) {
  for (const target of ["index", "about"]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, locale: "ko-KR", ...(w < 600 ? { hasTouch: true, isMobile: true } : {}) });
    if (target === "index") await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(NOTICE3) }));
    const p = await ctx.newPage();
    await p.goto(BASE + target + ".html", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await p.evaluate(() => document.fonts.ready);
    try { await p.waitForSelector(".pdim", { timeout: 15000 }); } catch { recs.push({ tag: `${target}_${w}_${dsf}`, noPopup: true }); await ctx.close(); continue; }
    await p.waitForTimeout(800);
    if (target === "index") {
      for (let k = 1; k <= 3; k++) { recs.push(await crop(p, dsf, `index_cur${k}_${w}_d${dsf}`)); if (k < 3) { await p.keyboard.press("ArrowRight"); await p.waitForTimeout(1000); } }
    } else recs.push(await crop(p, dsf, `about_n1_${w}_d${dsf}`));
    await ctx.close();
  }
}
await Promise.race([b.close(), new Promise((r) => setTimeout(r, 5000))]);
const code = `
import json, sys, statistics
from PIL import Image
recs = json.load(open(sys.argv[1]))
out = []
for r in recs:
    if "file" not in r: out.append(r); continue
    im = Image.open(r["file"]).convert("RGB"); W, H = im.size
    slit = []; lines = []; prev = False; clusters = 0; lineColors = []
    for y in range(H):
        px = [max(im.getpixel((x, y))) for x in range(W)]
        dark = sum(1 for v in px if v < 190) / W
        med = statistics.median(px)
        if dark >= 0.30: slit.append((y, round(dark, 2)))
        isl = med < 240
        if isl and not prev: clusters += 1
        if isl: lineColors.append((y, med))
        prev = isl
    r.update({"slitRows": slit, "lineClusters": clusters, "lineRows": lineColors, "H": H})
    del r["file"]; out.append(r)
print(json.dumps(out))
`;
const inF = `${TMP}/recs.json`; fs.writeFileSync(inF, JSON.stringify(recs));
const judged = JSON.parse(execFileSync("python3", ["-c", code, inF], { maxBuffer: 64 << 20 }).toString());
const slitN = judged.filter((r) => r.slitRows && r.slitRows.length).length, dbl = judged.filter((r) => r.lineClusters > 1).length, tot = judged.filter((r) => r.slitRows).length;
console.log(JSON.stringify({ total: tot, slitStates: slitN, doubleLineStates: dbl, noPopup: judged.filter((r) => r.noPopup).map((r) => r.tag),
  bad: judged.filter((r) => (r.slitRows && r.slitRows.length) || r.lineClusters > 1), sample: judged.filter((r) => /1440|390/.test(r.tag)).map((r) => [r.tag, r.onB, r.barT, r.lineClusters, r.lineRows]) }));
process.exit(0);
