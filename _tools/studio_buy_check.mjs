// 스튜디오 구매 블록 오라클 (build_all 6l). 실제 assets/product_buy.js 를 vm 에서 돌린다. DOM 표면만 대역이라 브라우저 검증을 대체하지 않는다
// (실브라우저 = _design/studio_units_20260923/local_check.mjs, 라이브 = 같은 스크립트에 BASE 인자).
// 2026-09-11 IA2 g① 판(_design/ia_20260911/verify_ia2_buy.mjs)은 판매 5단위를 정답으로 박아 두어 2026-09-14 7단위 추가 뒤 select 누락을 못 봤다
// (카드 7장이 직전 단위 SKU 를 담던 돈 결함, FINDINGS §1). 기대값은 박지 않고 assets/app.js UNITS 에서 읽는다(공통형 = 단독 SKU 없음).
// ① 카드 클릭은 단위만 고르고 담지 않는다(IA2 g①). 담기는 구매 블록 버튼에서만. ② option 없는 단위는 fail closed(select 불변, 담기 disabled, sku 빈값).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const script = readFileSync(new URL('assets/product_buy.js', root), 'utf8');
const app = readFileSync(new URL('assets/app.js', root), 'utf8');
const html = readFileSync(new URL('programs/studio.html', root), 'utf8');
const NO_SKU = ['yonsei-mirae-common'];
const UNITS = [...app.match(/const UNITS = \[([^\]]*)\];/)[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
const sale = UNITS.filter(u => !NO_SKU.includes(u));
assert.equal(sale.length, 12, 'app.js UNITS - 공통형 = 12');
const options = [...html.match(/<select id="studio-unit">([\s\S]*?)<\/select>/)[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(m => ({ value: m[1], textContent: m[2] }));
assert.deepEqual([...options.map(o => o.value)].sort(), [...sale].sort(), 'select option 집합 = 판매 12단위');
const cards = [...html.matchAll(/data-r3-unit-buy="([^"]+)"/g)].map(m => m[1]);
assert.deepEqual(cards, options.map(o => o.value), '카드 01~12 순서 = select 순서');
let mode = 'pass';
const select = { options, selectedIndex: 0, disabled: false,
  get value() { return options[this.selectedIndex]?.value; },
  set value(value) { this.selectedIndex = options.findIndex(o => o.value === value); } };
const listeners = {}, buttonListeners = {}, blockListeners = {}, calls = [];
const button = { dataset: {}, disabled: true, addEventListener: (event, fn) => { buttonListeners[event] = fn; }, click: () => buttonListeners.click() };
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
const HH = { okUnit: code => UNITS.includes(code), addToCart: payload => { calls.push(payload); return { ok: true }; } };
vm.runInNewContext(script, { HH, window: { HH }, document: {
  querySelector: () => block,
  addEventListener: (event, fn) => { listeners[event] = fn; }
} });
function clickCard(code) { listeners.click({ target: { closest: () => ({ dataset: { r3UnitBuy: code } }) } }); }
assert.equal(button.disabled, false);
assert.equal(button.dataset.cartSku, `pass-${options[0].value}`);
assert.equal(button.dataset.cartPrice, '495000');
let n = 0;
for (const { value: code, textContent } of options) {
  mode = 'lecture';
  clickCard(code);
  assert.equal(select.value, code);
  assert.equal(mode, 'pass');
  assert.equal(button.disabled, false);
  assert.equal(button.dataset.cartSku, `pass-${code}`);
  assert.equal(button.dataset.cartTitle, `${textContent} 전권 이용권`);
  assert.equal(button.dataset.cartPrice, '495000');
  assert.equal(calls.length, 0);   // 카드 클릭은 담지 않는다 (IA2 g①)
  assert.equal(cartLink.hidden, true);
  n += 1;
}
console.log(`PASS card click selects its own unit ${n}/${options.length}, restores pass, adds nothing`);
// 판매 단위가 아닌 값 = 무시 (select 와 담기 불변)
for (const code of ['yonsei-mirae', 'korea-eq', 'unknown', '"><script>']) {
  const before = select.value, sku = button.dataset.cartSku;
  clickCard(code);
  assert.equal(select.value, before);
  assert.equal(button.dataset.cartSku, sku);
  assert.equal(button.disabled, false);
  assert.equal(calls.length, 0);
}
console.log('PASS ignores non-unit codes (select and buy button unchanged)');
// UNITS 에는 있으나 option 이 없는 단위(공통형) = fail closed: select 불변, 담기 disabled, sku 빈값
{
  const before = select.value;
  clickCard('yonsei-mirae-common');
  assert.equal(select.value, before);
  assert.equal(button.disabled, true);
  assert.equal(button.dataset.cartSku, '');
  assert.equal(button.dataset.cartPrice, '0');
  assert.notEqual(status.textContent, '');
  assert.equal(calls.length, 0);
  // 담기 버튼은 disabled 라 클릭이 안 들어온다. 들어와도 sku 빈값이 HH.addToCart 로 가지 않게 여기서는 부르지 않는다
  // select 를 직접 고치면(change) 다시 열린다
  select.value = options[3].value; blockListeners.change();
  assert.equal(button.disabled, false);
  assert.equal(button.dataset.cartSku, `pass-${options[3].value}`);
  assert.equal(status.textContent, '');
}
console.log('PASS unit without option fails closed (select unchanged, buy disabled, sku empty), reopens on change');
// update() 자체도 selectedIndex -1 이면 닫는다 (브라우저가 select.value 에 없는 값을 넣으면 -1)
{
  select.selectedIndex = -1; blockListeners.change();
  assert.equal(button.disabled, true);
  assert.equal(button.dataset.cartSku, '');
  select.value = options[11].value; blockListeners.change();
  assert.equal(button.disabled, false);
}
console.log('PASS update() with selectedIndex -1 closes buy');
// 담기는 구매 블록 버튼에서만. 고른 단위가 그대로 담긴다
button.click();
assert.equal(calls.length, 1);
assert.equal(calls[0].sku, `pass-${select.value}`);
assert.equal(calls[0].price, 495000);
assert.equal(calls[0].qty, 1);
assert.equal(cartLink.hidden, false);
console.log('PASS buy block button adds the selected unit once');
console.log(`[studio_buy_check] PASS: select ${options.length} = app.js UNITS - 공통형, 카드 ${n} 클릭 sku ${n}/${options.length}, 없는 단위 fail closed, 담기 1회 (DOM 대역, 실브라우저는 별 스크립트)`);
