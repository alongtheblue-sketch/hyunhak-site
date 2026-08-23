// 로컬 스크린샷: node _tools/shot.mjs <out_dir> <w> <path...>   (서버 http://127.0.0.1:8811)
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const [out, w, ...paths] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, deviceScaleFactor: 1 });
for (const p of paths) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://127.0.0.1:8811/' + p, { waitUntil: 'networkidle' }).catch(e => errs.push('nav ' + e));
  // 리빌 애니메이션 트리거: 끝까지 스크롤 후 복귀
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(900);
  const ox = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const name = p.replace(/[\/?=]/g, '_') + '_' + w + '.png';
  await pg.screenshot({ path: out + '/' + name, fullPage: true });
  console.log(p, 'overflowX', ox, 'errors', errs.length ? errs : 0);
  await pg.close();
}
await b.close();
