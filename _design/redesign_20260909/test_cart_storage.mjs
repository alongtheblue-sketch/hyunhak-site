// Real HH runtime and purchase adapter, with storage and DOM boundaries stubbed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const app = readFileSync(new URL('../../assets/app.js', import.meta.url), 'utf8');
const adapter = readFileSync(new URL('../../assets/product_buy.js', import.meta.url), 'utf8');
const copy = JSON.parse(readFileSync(new URL('../../_tools/r2_copy.json', import.meta.url), 'utf8'));
const item = { sku: 'guide-gachon', title: '가천대학교', price: 33000, qty: 1, ship: false };
let checks = 0;
function fixture({ fail = false, initial = [] } = {}) {
  let saved = JSON.stringify(initial), writes = 0;
  const tracks = [];
  const context = {
    document: { querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
    location: { hostname: 'localhost', protocol: 'http:', pathname: '/programs/guidebook.html' },
    localStorage: { getItem: () => saved, setItem(key, value) {
      writes++;
      if (fail) throw new Error('QuotaExceededError');
      saved = value;
    } },
    addEventListener() {},
    HH_TRACK: (name, detail) => tracks.push({ name, detail }),
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(app, context);
  return { context, HH: context.HH, tracks,
    get saved() { return saved; }, get writes() { return writes; },
    storageFails(value) { fail = value; } };
}
function test(name, run) { run(); checks++; console.log('PASS', name); }
test('normal setItem: addToCart ok=true, stored row and one add_to_cart event', () => {
  const x = fixture(), result = x.HH.addToCart(item);
  assert.equal(result.ok, true);
  assert.equal(x.HH.cart()[0].sku, item.sku);
  assert.equal(x.HH.cart()[0].qty, 1);
  assert.equal(x.writes, 1); assert.equal(x.tracks.length, 1);
  assert.equal(x.tracks[0].name, 'add_to_cart');
  console.log('MEASURE normal', JSON.stringify({ result, cart: x.HH.cart(), tracked: x.tracks.length }));
});
test('throwing setItem: addToCart ok=false reason=storage, no false conversion', () => {
  const x = fixture({ fail: true }), before = x.saved, result = x.HH.addToCart(item);
  assert.equal(result.ok, false); assert.equal(result.reason, 'storage');
  assert.equal(result.message, copy.cart_failed_storage[0]);
  assert.equal(x.saved, before); assert.equal(x.tracks.length, 0);
  console.log('MEASURE throw', JSON.stringify({ result, cart: x.HH.cart(), tracked: x.tracks.length }));
});
test('existing quantity: failed save preserves quantity; successful retry increments once', () => {
  const x = fixture({ fail: true, initial: [item] }), before = x.saved;
  assert.equal(x.HH.addToCart(item).reason, 'storage');
  assert.equal(x.saved, before); assert.equal(x.HH.cart()[0].qty, 1);
  assert.equal(x.tracks.length, 0);
  x.storageFails(false);
  assert.equal(x.HH.addToCart(item).ok, true);
  assert.equal(x.HH.cart()[0].qty, 2); assert.equal(x.tracks.length, 1);
});
test('already stored single-quantity SKU requires no save or conversion event', () => {
  const single = { ...item, sku: 'guide-all-view', price: 511500 };
  const x = fixture({ fail: true, initial: [single] }), result = x.HH.addToCart(single);
  assert.equal(result.ok, true); assert.equal(result.already, true);
  assert.equal(x.writes, 0); assert.equal(x.tracks.length, 0);
});
test('saveCart callers may ignore the boolean without an exception', () => {
  const x = fixture(); assert.equal(x.HH.saveCart([item]), true);
  const before = x.saved; x.storageFails(true);
  assert.equal(x.HH.saveCart([]), false); assert.equal(x.saved, before);
});
test('real HH storage failure reaches the adapter; retry clears failure with success', () => {
  const x = fixture({ fail: true });
  const page = readFileSync(new URL('../../programs/guidebook.html', import.meta.url), 'utf8');
  const blockTag = page.match(/<section\b[^>]*data-product-buy="guidebook"[^>]*>/)[0];
  const dataset = Object.fromEntries([...blockTag.matchAll(/data-([\w-]+)="([^"]*)"/g)]
    .map(([, key, value]) => [key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value]));
  assert.equal(dataset.failedStorage, copy.cart_failed_storage[0], 'generated page contains registered storage copy');
  let click;
  const button = { dataset: {}, addEventListener(name, fn) { if (name === 'click') click = fn; } };
  const select = { selectedIndex: 0, options: [{ value: item.sku, dataset: { cartTitle: item.title, cartPrice: '33000' } }] };
  const status = { textContent: '' }, cartLink = { hidden: true };
  const block = { dataset, addEventListener() {}, querySelectorAll: () => [],
    querySelector: key => ({ select, '[data-cart-sku]': button, '[role="status"]': status,
      '[data-cart-link]': cartLink, 'input[type="radio"]:checked': { value: 'single' } })[key] };
  x.context.document.querySelector = key => key === '[data-product-buy]' ? block : null;
  vm.runInContext(adapter, x.context); click();
  assert.equal(status.textContent, copy.cart_failed_storage[0]);
  assert.equal(cartLink.hidden, false); assert.equal(x.tracks.length, 0);
  x.storageFails(false); click();
  assert.equal(status.textContent, copy.added[0]); assert.equal(x.tracks.length, 1);
});
console.log(`cart_storage_contract: checks=${checks} FAIL=0`);
