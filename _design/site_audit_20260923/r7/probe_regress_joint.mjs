// 2026-09-23 critic 6회차 regress 부속 프로브: 활성 카드(.pop) 아래 선과 하단바(.pbar) 윗선 사이 접합 행을 픽셀로 잰다.
// probe_regress_ab.mjs 에서 입구 면 N=1 팝업 1440 수리 후(3d2ada3) 판에 카드와 하단바 사이 1px 행이 딤 색으로 비치는 것을 보고 범위를 잰다.
// 판 = pre(94f577b, route) / post(3d2ada3, 서버). 창 = 1440x900, 1280x800, 1024x768, 768x1024, 430x932, 390x844.
// 상태 = 홈 팝업(N=2) 첫 장, → 1회 뒤 둘째 장(전이 1000ms 대기), 입구 면 about N=1. 결정론 조건은 probe_regress_ab.mjs 팝업 캡처와 같다(DOMContentLoaded + networkidle 5초 + 글꼴 + 300ms).
// 접합 구역 = 활성 카드 bottom-4 ~ 하단바 top+4 를 카드 폭으로 clip 캡처 → shots/joint_<판>_<상태>_<폭>.png, 판정은 python PIL(행별 최빈색, 카드 안쪽 폭 기준).
// 슬릿 = 카드 bottom-1 ~ 하단바 top+1 사이 행 중 R<200 인 픽셀(카드 바탕 255 도 하단바 윗선 206 도 아닌 딤 비침)이 폭의 50% 이상인 행. 딤 너머 지면 글자에 따라 색이 달라 최빈색 대신 어두운 픽셀 비율로 본다.
// r7 사본(s9): 서빙 = 8093 워크트리(fix/popup-bar-r7). 사용: node probe_regress_joint.mjs [dsf] → r6/regress_joint.json (dsf 1), dsf 2 이상이면 r6/regress_joint_dsf<N>.json, shots/joint_dsf<N>/. 행 좌표는 CSS px(= 캡처 행 / dsf).
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = "/Users/gregory/Workspace/hyunhak-site";
const PRE = "94f577b", POST = "r7";
const BASE = "http://localhost:8093/";
const STOP = path.join(HERE, ".wf_stop");
const DSF = +(process.argv[2] || 1);
const TAG = DSF === 1 ? "" : `_dsf${DSF}`;
const SHOTS = path.join(HERE, "shots", `joint${TAG}`);
fs.mkdirSync(SHOTS, { recursive: true });
const FILES = ["assets/app.js", "assets/base.css"];
const preBody = Object.fromEntries(FILES.map(p => [p, execFileSync("git", ["-C", REPO, "show", `${PRE}:${p}`])]));
const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8" };
const VPS = [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [430, 932], [390, 844]];
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });
const rec = [];
const geo = () => {
  const on = document.querySelector(".pslot[data-on] .pop"), bar = document.querySelector(".pbar");
  if (!on || !bar) return null;
  const a = on.getBoundingClientRect(), b = bar.getBoundingClientRect();
  const cur = document.querySelector("[data-ppop-cur]");
  return { onTop: +a.top.toFixed(2), onBottom: +a.bottom.toFixed(2), barTop: +b.top.toFixed(2), x0: +a.left.toFixed(2), x1: +a.right.toFixed(2), cur: cur ? cur.textContent : "n1",
    slotTransform: getComputedStyle(on.parentElement).transform, barParent: bar.parentElement.className };
};
async function shot(page, variant, state, w) {
  const g = await page.evaluate(geo);
  if (!g) return { variant, state, w, missing: true };
  const y0 = Math.floor(g.onBottom) - 4, y1 = Math.ceil(g.barTop) + 4;
  const file = path.join(SHOTS, `joint_${variant}_${state}_${w}.png`);
  await page.screenshot({ path: file, clip: { x: Math.floor(g.x0), y: y0, width: Math.ceil(g.x1) - Math.floor(g.x0), height: y1 - y0 } });
  return { variant, state, w, dsf: DSF, ...g, clipY0: y0, file };
}
outer:
for (const variant of ["pre", "post"]) {
  for (const [w, h] of VPS) {
    if (fs.existsSync(STOP)) { rec.push({ stopped: true }); break outer; }
    for (const target of ["index", "about"]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DSF, locale: "ko-KR" });
      if (variant === "pre") await ctx.route(u => u.host === "localhost:8093" && FILES.includes(u.pathname.slice(1)), r => r.fulfill({ status: 200, headers: { "content-type": TYPES[r.request().url().split(".").pop()], "cache-control": "no-store" }, body: preBody[new URL(r.request().url()).pathname.slice(1)] }));
      const page = await ctx.newPage();
      await page.goto(BASE + target + ".html", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      if (await page.$(".pdim")) {
        if (target === "index") {
          rec.push(await shot(page, variant, "index_cur1", w));
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(1000);
          rec.push(await shot(page, variant, "index_cur2", w));
        } else rec.push(await shot(page, variant, "about_n1", w));
      } else rec.push({ variant, state: target, w, noPopup: true });
      await ctx.close();
    }
  }
}
await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]);
// 판정: python PIL
const code = `
import json, sys
from PIL import Image
from collections import Counter
recs = json.loads(sys.argv[1])
out = []
for r in recs:
    if "file" not in r: out.append(r); continue
    im = Image.open(r["file"]).convert("RGB")
    W, H = im.size
    rows = []
    for y in range(H):
        px = [im.getpixel((x, y)) for x in range(3, W - 3)]
        c, n = Counter(px).most_common(1)[0]
        dark = sum(1 for q in px if q[0] < 200)
        rows.append({"y": r["clipY0"] + y / r["dsf"], "row": y, "mode": list(c), "share": round(n / len(px), 3), "dark": round(dark / len(px), 3)})
    lo, hi = r["onBottom"] - 1, r["barTop"] + 1
    slit = [row for row in rows if lo <= row["y"] <= hi and row["dark"] >= 0.5]
    r["rows"] = rows
    r["slit_rows"] = [(s["y"], s["mode"], s["dark"]) for s in slit]
    r["slit"] = bool(slit)
    out.append(r)
print(json.dumps(out))
`;
const judged = JSON.parse(execFileSync("python3", ["-c", code, JSON.stringify(rec)], { maxBuffer: 64 << 20 }).toString());
for (const r of judged) process.stdout.write(`${r.variant} ${r.state} ${r.w} ${r.missing ? "MISSING" : r.noPopup ? "NO POPUP" : `onTop=${r.onTop} onBottom=${r.onBottom} barTop=${r.barTop} cur=${r.cur} slit=${r.slit} ${JSON.stringify(r.slit_rows)}`}\n`);
fs.writeFileSync(path.join(HERE, `regress_joint${TAG}.json`), JSON.stringify({ pre: PRE, post: POST, dsf: DSF, at: new Date().toISOString(), recs: judged }, null, 1));
process.exit(0);
