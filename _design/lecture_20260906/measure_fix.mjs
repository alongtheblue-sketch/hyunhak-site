// 수리 실측: 크기 3값, 스파이 스윕, 착지 가림, 표제 순서, 390 폴드 솔리드 CTA, 서수, 담기, AEO 자리, 자막 track
import { createRequire } from 'module'; const require = createRequire('/Users/gregory/Workspace/iruri_6mo_thumb/package.json');
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8813/';
const b = await chromium.launch(); const out = {};
for (const [vw, vh] of [[1280, 900], [390, 844]]) {
  const pg = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + 'lectures/yonsei-hum.html', { waitUntil: 'load' }); await pg.addStyleTag({ content: '.rv{opacity:1!important;transform:none!important}html{scroll-behavior:auto!important}' });
  const r = await pg.evaluate(() => {
    const px = el => el ? parseFloat(getComputedStyle(el).fontSize) : null;
    const rect = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
    const heads = [...document.querySelectorAll('h1,h2,h3')].slice(0, 8).map(h => h.tagName + ':' + h.textContent.trim().slice(0, 14));
    const stickyOff = document.querySelector('.sticky')?.classList.contains('off'); const solid = [...document.querySelectorAll('a,button')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 40 && r.height > 30 && r.top >= 0 && r.bottom <= innerHeight && cs.backgroundColor === 'rgb(49, 46, 46)'; }).map(e => e.textContent.trim().slice(0, 12) + '@' + Math.round(e.getBoundingClientRect().y));
    const ords = [...document.querySelectorAll('.lgrp')].map(g => g.querySelector('.gh h3, .gh h2').textContent.trim() + ':' + [...g.querySelectorAll('.toc .row .n')].map(n => n.textContent).join(','));
    const aeo = document.querySelector('.aeo-answer'); const aeoIn = aeo ? (aeo.closest('.wrap') ? 'in-wrap' : 'out-wrap') + '/' + (aeo.previousElementSibling ? aeo.previousElementSibling.className : '-') : 'none';
    const steps = document.querySelector('.steps.three'); const stepCols = steps ? getComputedStyle(steps).gridTemplateColumns : null;
    const sc = getComputedStyle(document.querySelector('#toc')).scrollMarginTop;
    return { h1: px(document.querySelector('.hero2 h1')), h2: px(document.querySelector('#toc h2.t')), price: px(document.querySelector('.buybox .price')), h1rect: rect('.hero2 h1'), cta: rect('.buybox .acts .btn'), heads, solid, ords, aeoIn, stepCols, scrollMargin: sc, stickyOff, track: !!document.querySelector('video track[src$=".vtt"]'), anchTerm: document.querySelector('.anch a[href="#plan"]').textContent.trim(), kLabel: document.querySelector('.buybox .k').textContent, dataTotal: document.querySelector('[data-lec-summary][data-total]').getAttribute('data-total'), setRowsVisible: document.querySelectorAll('.lgrp:last-of-type .toc > .row').length };
  });
  // 스파이 스윕 + 착지
  const sweep = [];
  for (const y of [0, 300, 900, 1500, 3000, 4500]) { await pg.evaluate(y => window.scrollTo(0, y), y); await pg.waitForTimeout(250); sweep.push(y + ':' + await pg.evaluate(() => [...document.querySelectorAll('.anch a')].map(a => a.getAttribute('aria-current') ? '●' : '-').join(''))); }
  const land = {};
  for (const id of ['toc', 'intro', 'faq', 'plan']) { await pg.evaluate(id => { location.hash = ''; document.querySelector('.anch a[href="#' + id + '"]').click(); }, id); await pg.waitForTimeout(400); land[id] = await pg.evaluate(id => { const s = document.getElementById(id).getBoundingClientRect().top, bar = document.querySelector('.anch').getBoundingClientRect().bottom, hd = document.querySelector('header, .hd')?.getBoundingClientRect().bottom || 0; return { secTop: Math.round(s), barBottom: Math.round(bar), hdBottom: Math.round(hd) }; }, id); }
  // 담기
  await pg.evaluate(() => { localStorage.removeItem('hh_cart_v1'); window.scrollTo(0, 0); });
  await pg.click('.buybox .acts button[data-cart-sku]'); await pg.waitForTimeout(100);
  const cart = await pg.evaluate(() => ({ cart: JSON.parse(localStorage.getItem('hh_cart_v1') || 'null'), msg: document.querySelector('.cartmsg')?.textContent.trim() }));
  out[vw] = { ...r, sweep, land, cart, errs };
  await pg.close();
}
// 목록면 facts, 인강실 noscript, korea-sci, vtt 200
const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
await pg.goto(BASE + 'lectures.html'); out.list = await pg.evaluate(() => ({ title: document.title, facts: [...document.querySelectorAll('.facts b')].map(b => b.textContent), aeo: document.querySelector('.aeo-answer') ? document.querySelector('.aeo-answer').parentElement.className : 'none' }));
await pg.goto(BASE + 'lectures/korea-sci.html'); out.koreaSci = await pg.evaluate(() => ({ dataTotal: [...document.querySelectorAll('[data-total]')].map(e => e.getAttribute('data-total')), heads: [...document.querySelectorAll('h1,h2,h3')].slice(0, 3).map(h => h.tagName) }));
const html = await (await pg.goto(BASE + 'classroom.html')).text(); out.classroom = { noscript: html.includes('<noscript><div class="ot">'), watchdog: html.includes('12000') };
out.vtt = (await pg.goto(BASE + 'assets/video/sample_yonsei-hum.vtt')).status();
for (const k of ['390','1280']) { const o=out[k]; console.log(k, JSON.stringify({h:[o.h1,o.h2,o.price], solid:o.solid, stickyOff:o.stickyOff, sweep:o.sweep, land:o.land, ords:o.ords, aeo:o.aeoIn, steps:o.stepCols, sm:o.scrollMargin, track:o.track, cart:!!(o.cart.cart&&o.cart.cart.length)+'/'+o.cart.msg, errs:o.errs})); }
console.log('list', JSON.stringify(out.list)); console.log('koreaSci', JSON.stringify(out.koreaSci)); console.log('classroom', JSON.stringify(out.classroom), 'vtt', out.vtt); await b.close();
