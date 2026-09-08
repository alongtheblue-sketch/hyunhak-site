// Node VM regression: exercise the real app.js callback without a browser or network.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../../assets/app.js', import.meta.url), 'utf8');
let checks = 0;
async function fixture(responses, initialPrice = 23100) {
  const callbacks = [], events = [], banners = [false, true].map(hidden => ({ hidden, getAttribute: () => null }));
  const popup = { hidden: false };
  const saved = JSON.stringify([{ sku: 'guide-gachon', price: initialPrice, list_price: 33000, qty: 1 }]);
  let cart = saved, attempts = 0, priceReads = 0;
  const document = {
    querySelector: () => null,
    addEventListener: (name, callback) => { if (name === 'DOMContentLoaded') callbacks.push(callback); },
    querySelectorAll: selector => {
      if (selector === '[data-promo]') return banners;
      if (selector === '[data-promo-popup]') return [popup];
      if (selector === '[data-list-price]') priceReads++;
      return [];
    },
    dispatchEvent: event => events.push(event.type),
  };
  const window = { addEventListener() {} };
  vm.runInNewContext(source, {
    window, document, addEventListener() {}, location: { hostname: 'localhost', protocol: 'http:', pathname: '/index.html' },
    localStorage: { getItem: key => key === 'hh_cart_v1' ? cart : null, setItem: (key, value) => { if (key === 'hh_cart_v1') cart = value; } },
    fetch: async () => {
      const response = responses[Math.min(attempts++, responses.length - 1)];
      if (response instanceof Error) throw response;
      return { ok: true, json: async () => response };
    },
    setTimeout: callback => { callback(); return 0; },
    CustomEvent: class { constructor(type) { this.type = type; } }, console,
  });
  const callback = callbacks.find(fn => fn.toString().includes('loadPromo().then'));
  assert.ok(callback, 'real promoReady DOM callback exists');
  callback();
  const result = await window.HH.promoReady;
  return { window, result, banners, popup, events, saved, cart, attempts, priceReads };
}
async function test(name, fn) { await fn(); checks++; console.log('PASS', name); }
const active = { id: 'prm_2609_30', rate: 30, starts_at: null, ends_at: new Date(Date.now() + 86400000).toISOString() };
await test('two config failures hide all campaign nodes and popup, preserve unknown status and stored prices', async () => {
  const x = await fixture([new Error('network')]);
  assert.equal(x.attempts, 2); assert.equal(x.result, undefined); assert.equal(x.window.HH.promo(), undefined);
  assert.ok(x.banners.every(n => n.hidden)); assert.equal(x.popup.hidden, true);
  assert.equal(x.priceReads, 0); assert.equal(x.cart, x.saved); assert.deepEqual(x.events, []);
});
await test('successful retry retains active promotion, repricing and hh:promo notification', async () => {
  const x = await fixture([new Error('network'), { promo: active }], 33000);
  assert.equal(x.attempts, 2); assert.equal(x.result.rate, 30);
  assert.ok(x.banners.every(n => !n.hidden)); assert.equal(x.priceReads, 1);
  assert.equal(x.window.HH.salePrice(33000), 23100); assert.ok(x.events.includes('hh:promo'));
  assert.equal(JSON.parse(x.cart)[0].price, 23100);
});
await test('confirmed no campaign hides banners and restores stored list prices', async () => {
  const x = await fixture([{ promo: null }]);
  assert.equal(x.attempts, 1); assert.equal(x.result, null); assert.ok(x.banners.every(n => n.hidden));
  assert.equal(JSON.parse(x.cart)[0].price, 33000); assert.equal(x.priceReads, 0);
});
console.log(`promo_failure_contract: checks=${checks} FAIL=0`);
