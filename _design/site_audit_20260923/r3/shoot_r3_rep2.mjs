// 2026-09-23 astra 수정 2차 실측 스크린샷 (로컬 8092 정적 + 8799 모킹 API). 세션 재시작 뒤에도 재현되게 리포에 둔다.
// .rv 는 스크롤 표시 애니메이션이라 fullPage 캡처에서 아래쪽이 빈 종이로 남는다 → 캡처 전 강제 표시.
// 홈은 팝업 무대 상태를 먼저 찍고 ESC 로 닫은 뒤 본문을 찍는다. 세션당 1회 팝업이라 컨텍스트를 면마다 새로 연다.
// 사용: node _design/site_audit_20260923/shoot_r2.mjs [1440|390|all]
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "shots_rep2");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:8092/";
const PAGES = ["index", "request", "guidebook/index", "programs/guidebook", "programs/studio", "studio", "lectures", "interview", "interview/yonsei-hum", "about", "faq", "notice", "support", "b2b", "join", "login", "terms", "library", "ranking", "pastexam"];
const which = process.argv[2] || "all";
const WIDTHS = which === "all" ? [[1440, 900], [390, 844]] : which === "1440" ? [[1440, 900]] : [[390, 844]];
const ONLY = process.argv[3] ? process.argv[3].split(",") : null;   // 3번째 인자 = 면 필터 (예: guidebook/index,about)
const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const [w, h] of WIDTHS) {
  for (const p of PAGES) {
    if (ONLY && !ONLY.includes(p)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "ko-KR" });
    const page = await ctx.newPage();
    const name = p.replace(/\//g, "_");
    try {
      await page.goto(BASE + p + ".html", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.addStyleTag({ content: ".rv{opacity:1!important;transform:none!important;transition:none!important}" });
      if (p === "index") {
        if (await page.$(".pdim")) {
          await page.screenshot({ path: path.join(OUT, `index_popup_${w}.png`) });
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
        }
        await page.screenshot({ path: path.join(OUT, `index_nopop_${w}.png`), fullPage: true });
      } else {
        if (await page.$(".pdim")) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
        await page.screenshot({ path: path.join(OUT, `${name}_${w}.png`), fullPage: true });
      }
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      process.stdout.write(`${name}_${w} scrollW=${sw}${sw > w ? " OVERFLOW" : ""}\n`);
    } catch (e) {
      process.stdout.write(`${name}_${w} FAIL ${e.message.split("\n")[0]}\n`);
    }
    await ctx.close();
  }
}
await browser.close();
