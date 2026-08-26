// http 계측: node _tools/shot_v2.mjs <out_dir> <width> <path...>  (서버 http://127.0.0.1:8811)
// 출력: overflowX, pageerror, 44px 미달 인터랙티브, 리빌, h1, 가운뎃점/em대시, 습니다(마케팅 면 참고용)
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const [out, w, ...paths] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, deviceScaleFactor: 1 });
for (const p of paths) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://127.0.0.1:8811/' + p, { waitUntil: 'networkidle' }).catch(e => errs.push('nav ' + e));
  await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}' }).catch(() => {});
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); } await new Promise(r => setTimeout(r, 250)); window.scrollTo(0, 0); });
  await pg.waitForTimeout(600);
  const m = await pg.evaluate(() => {
    const de = document.documentElement;
    const ox = de.scrollWidth - de.clientWidth;
    const small = [];
    for (const el of document.querySelectorAll('a[href],button,input,select,textarea,summary')) {
      let r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (el.closest('[hidden]')) continue;
      // 체크박스/라디오의 실효 타깃 = 감싸는 label 또는 .check 행 (WCAG 2.5.8 동등 타깃)
      if (el.matches('input[type=checkbox],input[type=radio]')) {
        const host = el.closest('label') || (el.id && document.querySelector('label[for="' + el.id + '"]') && el.closest('.check')) || el.closest('.check');
        if (host) r = host.getBoundingClientRect();
      }
      if (r.height < 44 && r.width < 44) small.push((el.textContent || el.tagName).trim().slice(0, 20) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    const h1 = document.querySelector('h1');
    const h1cs = h1 ? getComputedStyle(h1) : null;
    const rvAll = document.querySelectorAll('.rv').length, rvIn = document.querySelectorAll('.rv.in').length;
    return { ox, smallN: small.length, small: small.slice(0, 8), height: de.scrollHeight, reveal: rvIn + '/' + rvAll,
      h1: h1cs ? h1cs.fontSize + ' ' + h1cs.fontFamily.split(',')[0] : null,
      dots: (document.body.innerText.match(/[·—]/g) || []).length };
  });
  const name = p.replace(/[\/?=]/g, '_') + '_' + w + '.png';
  await pg.screenshot({ path: out + '/' + name, fullPage: true });
  console.log(JSON.stringify({ p, w: +w, ...m, errors: errs }));
  await pg.close();
}
await b.close();
