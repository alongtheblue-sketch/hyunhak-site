// Browser-free contract tests against the actual purchase module.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../../assets/product_buy.js', import.meta.url), 'utf8');
function scenario(kind, mode, result = { ok: true }) {
  const handlers = {}, plans = ['single', 'all', 'pdf', 'pass', 'lecture'].map(plan => ({ dataset: { plan }, hidden: false }));
  const select = { value: 'korea-hum', selectedIndex: 0, options: [{ value: kind === 'guidebook' ? 'guide-snu' : 'korea-hum', textContent: '고려대 인문', dataset: { cartTitle: '서울대학교 가이드북', cartPrice: '33000' } }] };
  const button = { dataset: {}, addEventListener: (name, cb) => { handlers['button:' + name] = cb; } };
  const status = {}, cartLink = {}, calls = [], redirects = [];
  const dataset = { productBuy: kind, pdfTitle: 'PDF 소장판', allTitle: '전권 열람권', lectureTitle: '공통 풀이 인강', added: '담았습니다', failed: '실패', failedStorage: '저장소 오류' };
  const nodes = { select, '[data-cart-sku]': button, '[role="status"]': status, '[data-cart-link]': cartLink, 'input[type="radio"]:checked': { value: mode } };
  const block = { dataset, querySelector: s => nodes[s], querySelectorAll: () => plans, addEventListener: (name, cb) => { handlers[name] = cb; } };
  const HH = { addToCart: line => { calls.push(line); return result; } };
  const window = { HH, location: { assign: url => redirects.push(url) } };
  vm.runInNewContext(source, { window, HH, document: { querySelector: () => block } });
  handlers['button:click']();
  return { select, button, status, cartLink, calls, redirects, plans };
}
let checks = 0;
for (const [kind, mode, sku, price] of [
  ['guidebook', 'single', 'guide-snu', 33000], ['guidebook', 'all', 'guide-all-view', 511500],
  ['guidebook', 'pdf', 'guide-all-pdf', 1705000], ['studio', 'pass', 'pass-korea-hum', 495000],
  ['studio', 'lecture', 'lecture-common', 220000]
]) {
  const x = scenario(kind, mode);
  assert.equal(x.calls.length, 1); assert.equal(x.calls[0].sku, sku); assert.equal(x.calls[0].price, price);
  assert.equal(x.calls[0].qty, 1); assert.equal(x.calls[0].ship, false);
  assert.equal(x.plans.find(p => p.dataset.plan === mode).hidden, false);
  assert.equal(x.select.disabled, kind === 'guidebook' ? mode !== 'single' : mode === 'lecture');
  console.log(`PASS ${kind}/${mode} SKU=${sku} list_price=${price} qty=1 plan and select state`); checks++;
}
const single = scenario('studio', 'single');
assert.equal(single.calls.length, 0); assert.equal(single.redirects[0], '../studio.html?unit=korea-hum#sets');
console.log('PASS studio/single routes to the selected unit sets before cart'); checks++;
const storage = scenario('guidebook', 'pdf', { ok: false, reason: 'storage' });
assert.equal(storage.status.textContent, '저장소 오류'); assert.equal(storage.cartLink.hidden, false);
console.log('PASS storage failure surfaces the registered message and cart recovery link'); checks++;
console.log(`test_r3_product_buy: PASS ${checks}/${checks}`);
