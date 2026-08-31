// 로컬 file:// 계측 + 스크린샷. usage: node shot.mjs <out_dir> <width> <html...>
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import { resolve, basename } from 'node:path';
const [out, w, ...files] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, deviceScaleFactor: 1 });
for (const f of files) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('file://' + resolve(f), { waitUntil: 'networkidle' }).catch(e => errs.push('nav ' + e));
  await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important} .rv{opacity:1!important;transform:none!important}' });
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(500);
  const m = await pg.evaluate(() => {
    const de = document.documentElement;
    const ox = de.scrollWidth - de.clientWidth;
    const small = [];
    for (const el of document.querySelectorAll('a[href],button,input')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.height < 44 && r.width < 44) small.push((el.textContent || el.tagName).trim().slice(0, 20) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    const mk = document.querySelector('.maker, .makerband');
    const mkr = mk ? mk.getBoundingClientRect() : null;
    return { ox, small: small.slice(0, 6), nSmall: small.length, makerW: mkr ? Math.round(mkr.width) : null, h: de.scrollHeight };
  });
  const name = basename(f).replace('.html', '') + '_' + w;
  await pg.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log(name, JSON.stringify({ ...m, errs: errs.slice(0, 2) }));
  await pg.close();
}
await b.close();
