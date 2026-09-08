// No browser: checks the UI adapter's decisions and the existing HH return contract.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../../assets/product_buy.js', import.meta.url), 'utf8');
let checks = 0;
function fixture(kind) {
  let mode = kind === 'guidebook' ? 'single' : 'pass';
  const callbacks = {}, events = {}, calls = [], navigations = [];
  let result = { ok: true }, error = null;
  const options = kind === 'guidebook'
    ? [{ value: 'guide-gachon', dataset: { cartTitle: '가천대학교 2027 서류기반면접 가이드북', cartPrice: '33000' }, textContent: '가천대학교' }, { value: 'guide-snu', dataset: { cartTitle: '서울대학교 2027 서류기반면접 가이드북', cartPrice: '33000' }, textContent: '서울대학교' }]
    : [{ value: 'korea-hum', textContent: '고려대 계열적합 인문' }, { value: 'yonsei-intl', textContent: '연세대 국제형' }];
  const select = { options, selectedIndex: 0, disabled: false, get value() { return options[this.selectedIndex].value; } };
  const button = { dataset: {}, disabled: true, addEventListener: (name, fn) => { events[name] = fn; } };
  const status = { textContent: '' }, cartLink = { hidden: true };
  const plans = ['single', 'pass', 'lecture'].map(x => ({ dataset: { plan: x }, hidden: true }));
  const block = {
    dataset: { productBuy: kind, allTitle: '2027 서류기반면접 가이드북 전권 열람권, 31권', lectureTitle: '공통 풀이 인강', added: '장바구니에 담았습니다.', failed: '장바구니에 담지 못했습니다. 장바구니를 확인해 주세요.' },
    querySelector: selector => ({ select, '[data-cart-sku]': button, '[role="status"]': status, '[data-cart-link]': cartLink, 'input[type="radio"]:checked': { value: mode } })[selector],
    querySelectorAll: () => plans,
    addEventListener: (name, fn) => { callbacks[name] = fn; }
  };
  const HH = { addToCart: item => { calls.push(item); if (error) throw error; return result; } };
  const window = { HH, location: { assign: url => navigations.push(url) } };
  vm.runInNewContext(source, { window, HH, document: { querySelector: () => block } });
  return { select, button, status, cartLink, calls, navigations, plans,
    mode(value) { mode = value; callbacks.change(); }, click() { events.click(); },
    setResult(value) { result = value; }, setError(value) { error = value; } };
}
function test(name, fn) { fn(); checks++; console.log('PASS', name); }
test('guide default and selected university reuse guide SKU', () => {
  const x = fixture('guidebook'); assert.equal(x.button.disabled, false); x.click();
  assert.equal(x.calls[0].sku, 'guide-gachon'); assert.equal(x.calls[0].price, 33000);
  x.select.selectedIndex = 1; x.mode('single'); x.click(); assert.equal(x.calls[1].sku, 'guide-snu');
});
test('guide all-pass is not tied to selected university', () => {
  const x = fixture('guidebook'); x.mode('all'); x.click();
  assert.equal(x.select.disabled, true); assert.equal(x.calls[0].sku, 'guide-all-view'); assert.equal(x.calls[0].price, 511500);
  x.mode('single'); assert.equal(x.select.disabled, false);
});
test('studio selected unit creates its existing pass SKU', () => {
  const x = fixture('studio'); x.select.selectedIndex = 1; x.mode('pass'); x.click();
  assert.equal(x.calls[0].sku, 'pass-yonsei-intl'); assert.equal(x.calls[0].price, 495000);
  assert.deepEqual(x.plans.filter(p => !p.hidden).map(p => p.dataset.plan), ['pass']);
});
test('common lecture has its own price, period and no active unit selector', () => {
  const x = fixture('studio'); x.mode('lecture'); x.click();
  assert.equal(x.calls[0].sku, 'lecture-common'); assert.equal(x.calls[0].price, 220000); assert.equal(x.select.disabled, true);
  assert.deepEqual(x.plans.filter(p => !p.hidden).map(p => p.dataset.plan), ['lecture']);
});
test('single passage navigates to real set selection without fabricating set_id', () => {
  const x = fixture('studio'); x.mode('single'); x.click();
  assert.equal(x.calls.length, 0); assert.equal(x.navigations[0], '../studio.html?unit=korea-hum#sets');
});
test('successful add announces success and exposes cart link', () => {
  const x = fixture('guidebook'); x.click(); assert.equal(x.status.textContent, '장바구니에 담았습니다.'); assert.equal(x.cartLink.hidden, false);
});
test('already present never announces a second successful add', () => {
  const x = fixture('guidebook'); x.setResult({ ok: true, already: true, message: '이미 담겨 있습니다.' }); x.click(); assert.equal(x.status.textContent, '이미 담겨 있습니다.');
});
test('HH rejection is reported without success', () => {
  const x = fixture('guidebook'); x.setResult({ ok: false, message: '담을 수 없는 상품입니다.' }); x.click(); assert.equal(x.status.textContent, '담을 수 없는 상품입니다.');
});
test('thrown storage or runtime error has a visible recovery link', () => {
  const x = fixture('guidebook'); x.setError(new Error('storage')); x.click();
  assert.match(x.status.textContent, /담지 못했습니다/); assert.equal(x.cartLink.hidden, false);
});
test('changing product clears stale feedback', () => {
  const x = fixture('guidebook'); x.click(); x.mode('all'); assert.equal(x.status.textContent, ''); assert.equal(x.cartLink.hidden, true);
});
console.log(`product_buy_contract: checks=${checks} FAIL=0`);
