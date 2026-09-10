// 소개면 카드 「담기」 실브라우저 검증: 클릭 1회 → 구매 블록 상태 문구 + 장바구니 저장(HH 계약) 확인
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const base = process.env.IA1_BASE || 'http://127.0.0.1:8912';
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(`${base}/programs/studio.html`, { waitUntil: 'load' });
const before = await pg.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))));
await pg.click('#u-korea-hum [data-r3-unit-buy]');
await pg.waitForTimeout(500);
const r = await pg.evaluate(() => ({
  status: document.querySelector('[data-product-buy] [role="status"]')?.textContent,
  cartLinkHidden: document.querySelector('[data-product-buy] [data-cart-link]')?.hidden,
  select: document.querySelector('[data-product-buy] select')?.value,
  mode: document.querySelector('[data-product-buy] input[type="radio"]:checked')?.value,
  hash: location.hash, scrollY: Math.round(scrollY),
  storage: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)?.slice(0, 200)]))
}));
console.log('before storage keys:', Object.keys(JSON.parse(before)));
console.log(JSON.stringify(r, null, 1)); console.log('errors:', errs);
await pg.click('#u-korea-hum [data-r3-unit-buy]'); await pg.waitForTimeout(300);
console.log('second click status:', await pg.evaluate(() => document.querySelector('[data-product-buy] [role="status"]')?.textContent));
await b.close();
