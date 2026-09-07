// 할인 행사 e2e (2026-09-07): localhost:8788(site) + localhost:8799(api, 로컬 D1 에 행사 행).
//   node _tools/promo_e2e.mjs <out_dir> active|expired
// active  = 배너 보임, [data-list-price] 가 정가 취소선 + 할인가, 담기 → 장바구니 합계 = 할인가, 스튜디오 단위 카드(늦게 그리는 가격)도 적용
// expired = 배너 숨김(hidden), .sale 0, 장바구니 합계 = 정가 (같은 저장 장바구니가 정가로 되돌아온다)
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const [out, mode] = process.argv.slice(2);
const S = 'http://localhost:8788/';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
const cfgHits = []; pg.on('response', r => { if (r.url().includes('/api/config')) cfgHits.push(r.status()); }); pg.on('requestfailed', r => { if (r.url().includes('/api/')) errs.push('reqfail ' + r.url().slice(-40) + ' ' + (r.failure() || {}).errorText); });
const res = { mode };
const txt = async (sel) => (await pg.locator(sel).first().textContent().catch(() => null))?.replace(/\s+/g, ' ').trim() ?? null;
const go = async (p) => { await pg.goto(S + p, { waitUntil: 'networkidle' }); await pg.waitForTimeout(700); };

const logs = []; pg.on('console', m => { if (/promo/.test(m.text())) logs.push(m.text().slice(0, 160)); });
await go('index.html');
res.home_state = await pg.evaluate(() => [String(HH.promo() && HH.promo().rate), document.querySelectorAll('[data-list-price]').length, document.querySelectorAll('[data-list-price][data-promo-applied]').length, document.querySelectorAll('aside[data-promo]').length]);
res.home_console = logs.slice();
res.home_banner_visible = await pg.locator('aside[data-promo]:not([hidden])').count();
res.home_banner_text = await txt('aside[data-promo]');
res.home_sale_count = await pg.locator('[data-list-price] .sale').count();
res.home_hero_price = await txt('.prodcta .pc:first-child .pr');
res.home_tile_price = await txt('#tiles .tile .p');
await pg.screenshot({ path: `${out}/home_${mode}.png`, fullPage: false });
await pg.setViewportSize({ width: 390, height: 800 }); await pg.waitForTimeout(300);
await pg.screenshot({ path: `${out}/home_${mode}_390.png`, fullPage: false });
res.home_390_overflow = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
await pg.setViewportSize({ width: 1280, height: 900 });

await go('studio.html');
await pg.waitForSelector('.unit .price', { timeout: 8000 }).catch(() => {});
await pg.waitForTimeout(600);
res.studio_static_price = await txt('#p1 .price, .price');
res.studio_unit_sale = await pg.locator('.unit .price .sale').count();
res.studio_unit_price = await txt('.unit .price');

await go('guidebook/gachon.html');
res.gb_price = await txt('.buy .price');
res.gb_pdf_btn = await txt('.buy [data-cart-sku="guide-gachon-pdf"]');
await pg.evaluate(() => localStorage.removeItem('hh_cart_v1'));
await pg.click('.buy [data-cart-sku="guide-gachon"]'); await pg.waitForTimeout(400);
res.cart_line = await pg.evaluate(() => JSON.parse(localStorage.getItem('hh_cart_v1') || '[]').map(x => [x.sku, x.list_price, x.price]));

await go('cart.html');
res.cart_total = await txt('#billTotal');
res.cart_banner_visible = await pg.locator('aside[data-promo]:not([hidden])').count();
await pg.screenshot({ path: `${out}/cart_${mode}.png` });

await go('programs/guidebook.html');
res.lp_banner_visible = await pg.locator('aside[data-promo]').count();   // LP 는 app.js 없음 → 빌드 시각 게이트만
res.errors = errs; res.config_status = cfgHits;
console.log(JSON.stringify(res, null, 1));
await b.close();
