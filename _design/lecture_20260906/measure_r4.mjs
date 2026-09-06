import { createRequire } from 'module'; const require = createRequire('/Users/gregory/Workspace/iruri_6mo_thumb/package.json');
const { chromium } = require('playwright'); const b = await chromium.launch(); const BASE = 'http://127.0.0.1:8813/'; const out = {};
// F9: 같은 단위에 무기한(null) + 유기한 권리 공존 → 공통 카드에 만료 표기 없어야
const pg = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.route('**/api/**', r => r.abort());
await pg.addInitScript(() => {
  const ents = [
    { kind: 'lecture', meta: JSON.stringify({ unit_code: 'yonsei-hum', scope: 'unit' }), expires_at: '2026-12-01T00:00:00Z' },
    { kind: 'lecture', meta: JSON.stringify({ unit_code: 'yonsei-hum', scope: 'unit' }), expires_at: null }];
  const lecs = [
    { id: 'c1', kind: 'common', title: '공통1', status: 'ready', entitled: true, seq: 1, duration_sec: 600 },
    { id: 'u1', kind: 'unit', unit_code: 'yonsei-hum', title: '단위1', status: 'ready', entitled: true, seq: 1, duration_sec: 600 }];
  let hh; Object.defineProperty(window, 'HH', { configurable: true, get() { return hh; }, set(v) { hh = v; hh.me = () => Promise.resolve({ member: { id: 'm1' }, entitlements: ents }); hh.api = (p) => (p === '/api/lectures') ? Promise.resolve({ lectures: lecs }) : Promise.reject(new Error('x')); } });
});
await pg.goto(BASE + 'classroom.html', { waitUntil: 'load' }); await pg.waitForTimeout(600);
out.f9 = await pg.evaluate(() => ({ state: document.getElementById('crView').getAttribute('data-state'), cards: [...document.querySelectorAll('#crCards .cr')].map(c => c.querySelector('h2').textContent + ' | ' + c.querySelector('.st').textContent) }));
await pg.close();
// T1: studio.html 공통 인강 2회 담기 → confirm 1회만, 2회째는 안내
const p2 = await b.newPage({ viewport: { width: 1280, height: 900 } }); p2.on('pageerror', e => errs.push(String(e)));
await p2.addInitScript(() => { window.__confirms = 0; window.confirm = () => { window.__confirms++; return false; }; });
await p2.goto(BASE + 'studio.html', { waitUntil: 'load' }); await p2.evaluate(() => localStorage.removeItem('hh_cart_v1'));
await p2.click('button[data-cart-sku="lecture-common"]'); await p2.waitForTimeout(80); await p2.click('button[data-cart-sku="lecture-common"]'); await p2.waitForTimeout(80);
out.t1 = await p2.evaluate(() => ({ confirms: window.__confirms, cart: JSON.parse(localStorage.getItem('hh_cart_v1')).map(x => x.sku + ':' + x.qty), msg: (document.getElementById('cartMsg') || document.querySelector('.cartmsg, [data-cart-msg]') || { textContent: '' }).textContent.trim() }));
out.errs = errs; console.log(JSON.stringify(out)); await b.close();
