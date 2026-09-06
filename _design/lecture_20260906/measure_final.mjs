import { createRequire } from 'module'; const require = createRequire('/Users/gregory/Workspace/iruri_6mo_thumb/package.json');
const { chromium } = require('playwright'); const b = await chromium.launch(); const BASE = 'http://127.0.0.1:8813/'; const out = {};
const pg = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(BASE + 'lectures/common.html', { waitUntil: 'load' });
await pg.evaluate(() => localStorage.removeItem('hh_cart_v1')); await pg.click('.buybox .acts button[data-cart-sku]'); await pg.waitForTimeout(80); await pg.click('.buybox .acts button[data-cart-sku]'); await pg.waitForTimeout(80);
out.commonTwice = await pg.evaluate(() => ({ cart: JSON.parse(localStorage.getItem('hh_cart_v1')).map(x => x.sku + ':' + x.qty), msg: document.querySelector('.cartmsg').textContent.trim() }));
await pg.evaluate(() => localStorage.setItem('hh_cart_v1', JSON.stringify([{ sku: 'lecture-common', title: 'x', price: 220000, qty: 3 }])));
out.normalizeStored = await pg.evaluate(() => HH.cart().map(x => x.sku + ':' + x.qty));
await pg.goto(BASE + 'lectures/yonsei-hum.html', { waitUntil: 'load' });
await pg.evaluate(() => localStorage.removeItem('hh_cart_v1')); await pg.click('.buybox .acts button[data-cart-sku]'); await pg.click('.buybox .acts button[data-cart-sku]'); await pg.waitForTimeout(80);
out.passTwice = await pg.evaluate(() => JSON.parse(localStorage.getItem('hh_cart_v1')).map(x => x.sku + ':' + x.qty));
out.unitCnt = await pg.evaluate(() => document.querySelectorAll('.lgrp')[1].querySelector('.cnt').textContent);
for (const w of [390, 360]) { const p2 = await b.newPage({ viewport: { width: w, height: 844 } }); await p2.goto(BASE + 'lectures/yonsei-hum.html', { waitUntil: 'load' }); await p2.addStyleTag({ content: 'html{scroll-behavior:auto!important}' }); await p2.evaluate(() => window.scrollTo(0, 1500)); await p2.waitForTimeout(200); out['anch' + w] = await p2.evaluate(() => { const a = document.querySelector('.anch a.pl'), bb = a.querySelector('b').getBoundingClientRect(); return { name: a.textContent.trim(), bRect: [Math.round(bb.width), Math.round(bb.height)], overflow: document.querySelector('.anch').scrollWidth - document.querySelector('.anch').clientWidth, visibleText: a.innerText.trim() }; }); await p2.close(); }
out.errs = errs; console.log(JSON.stringify(out)); await b.close();
