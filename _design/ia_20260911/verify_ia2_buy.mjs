// IA2 g① 오라클. 실제 product_buy.js 의 이벤트를 실행한다. DOM 표면만 대역이며 브라우저 검증을 대체하지 않는다.
// IA1 판(_design/ia_20260910/codex/verify_ia1_buy.mjs)은 대안 ②(카드 클릭 = 담기 1회)를 기대값으로 박아 두었다.
// ① 에서는 카드 클릭이 단위만 고르고 담지 않는다. 담기는 구매 블록 버튼에서만 일어난다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../../', import.meta.url);
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
const button = { dataset: {}, addEventListener: (event, fn) => { buttonListeners[event] = fn; }, click: () => buttonListeners.click() };
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
  assert.equal(calls.length, 0);   // 카드 클릭은 담지 않는다 (IA2 g①)
  assert.equal(cartLink.hidden, true);
  console.log(`PASS card ${code}: selects sale unit, restores pass, adds nothing`);
}
for (const code of ['yonsei-mirae', 'korea-eq-hum', 'korea-eq-sci', 'unknown', '"><script>']) {
  const before = select.value;
  clickCard(code);
  assert.equal(select.value, before);
  assert.equal(calls.length, 0);
  console.log(`PASS rejects non-sale card ${JSON.stringify(code)}`);
}
// 담기는 구매 블록 버튼에서만. 카드 클릭으로 고른 단위가 그대로 담긴다
button.click();
assert.equal(calls.length, 1);
assert.equal(calls[0].sku, `pass-${select.value}`);
assert.equal(calls[0].price, 495000);
assert.equal(calls[0].qty, 1);
assert.equal(cartLink.hidden, false);
console.log('PASS buy block button adds the selected unit once');
console.log('IA2_BUY failures=0 (DOM event unit test; browser acceptance는 별 캡처)');
