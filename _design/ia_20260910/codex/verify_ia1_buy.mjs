// 실제 product_buy.js의 이벤트를 실행한다. DOM 표면만 대역이며 브라우저 검증을 대체하지 않는다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../../../', import.meta.url);
const script = readFileSync(new URL('assets/product_buy.js', root), 'utf8');
const html = readFileSync(new URL('programs/studio.html', root), 'utf8');
const options = [...html.match(/<select id="studio-unit">([\s\S]*?)<\/select>/)[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(m => ({ value: m[1], textContent: m[2] }));
const allowed = ['korea-hum', 'korea-sci', 'yonsei-hum', 'yonsei-sci', 'yonsei-intl'];
assert.deepEqual(options.map(o => o.value), allowed);
let mode = 'pass';
const select = { options, selectedIndex: 0, disabled: false,
  get value() { return options[this.selectedIndex]?.value; },
  set value(value) { this.selectedIndex = options.findIndex(o => o.value === value); } };
const listeners = {}, buttonListeners = {}, blockListeners = {}, calls = [];
const button = { dataset: {}, addEventListener: (event, fn) => { buttonListeners[event] = fn; }, click: () => buttonListeners.click() };  // 세션 수정: 카드 담기가 버튼 경로를 호출한다
const status = { textContent: '' }, cartLink = { hidden: true };
const passRadio = { set checked(on) { if (on) mode = 'pass'; } };
const block = {
  dataset: { productBuy: 'studio', lectureTitle: '공통 풀이 인강', added: 'added', failed: 'failed' },
  querySelector(selector) {
    return { select, '[data-cart-sku]': button, '[role="status"]': status, '[data-cart-link]': cartLink,
      'input[type="radio"]:checked': { value: mode }, 'input[name="product"][value="pass"]': passRadio }[selector];
  },
  querySelectorAll: () => [],
  addEventListener: (event, fn) => { blockListeners[event] = fn; }
};
const HH = { okUnit: code => allowed.includes(code), addToCart: payload => { calls.push(payload); return { ok: true }; } };
vm.runInNewContext(script, { HH, window: { HH }, document: {
  querySelector: () => block,
  addEventListener: (event, fn) => { listeners[event] = fn; }
} });
function clickCard(code) { listeners.click({ target: { closest: () => ({ dataset: { r3UnitBuy: code } }) } }); }
assert.equal(button.dataset.cartPrice, '495000');
for (const code of allowed) {
  mode = 'lecture';
  clickCard(code);
  assert.equal(select.value, code);
  assert.equal(mode, 'pass');
  assert.equal(button.dataset.cartSku, `pass-${code}`);
  assert.equal(button.dataset.cartPrice, '495000');
  assert.equal(calls.at(-1).sku, `pass-${code}`);   // 카드 클릭 한 번으로 담긴다 (X1 mid-1 수리)
  assert.equal(calls.at(-1).price, 495000);
  assert.equal(calls.at(-1).qty, 1);
  console.log(`PASS card ${code}: selects sale unit, restores pass, adds to cart once, preserves cart price and quantity`);
}
for (const code of ['yonsei-mirae', 'korea-eq-hum', 'korea-eq-sci', 'unknown', '"><script>']) {
  const before = select.value;
  clickCard(code);
  assert.equal(select.value, before);
  assert.equal(calls.length, 5);   // 판매 5 카드 = 5회, 예정·비정상 카드는 추가 0
  console.log(`PASS rejects non-sale card ${JSON.stringify(code)}`);
}
assert.equal(cartLink.hidden, false);
console.log('IA1_BUY failures=0 (DOM event unit test; browser acceptance remains BLOCKED)');
