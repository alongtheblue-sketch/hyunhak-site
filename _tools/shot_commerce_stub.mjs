// 커머스 3면 (checkout, my, pay_done) 스텁 렌더 증거 (P0-4, s17).
// 로컬 서버가 http://localhost:8811 에서 사이트를 서빙해야 한다 (hostname 이 localhost 여야 app.js 가 :8799 API 를 본다).
//   python3 -m http.server 8811 --bind 127.0.0.1  후  node _tools/shot_commerce_stub.mjs <out_dir> <width>
// API(:8799, api.hyunhak.com)와 토스 SDK 를 route 로 스텁해 로그인, 장바구니, 승인 성공 상태를 실렌더한다.
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const [out, w] = process.argv.slice(2);

const FIX = {
  me: { member: { id: 'm_stub', email: 'stub@hyunhak.com', name: '검수용', marketing_opt_in: true },
        entitlements: [
          { kind: 'download', meta: JSON.stringify({ slug: 'korea', title: '고려대학교 2027 면접 가이드북' }) },
          { kind: 'studio_passage', meta: '{}', uses_left: 4, expires_at: '2027-08-31T00:00:00Z' }],
        trial_available: true },
  config: { tossClientKey: 'test_stub_key' },
  orders: { orders: [{ created_at: '2026-08-26T12:00:00Z', paid_at: '2026-08-26T12:01:00Z', amount: 33000, status: 'paid',
                       receipt_url: 'https://example.com/receipt', items: [{ title: '고려대학교 2027 면접 가이드북', qty: 1 }] }] },
  confirm: { receipt: 'https://example.com/receipt' },
};
const TOSS_STUB = `window.TossPayments=function(){return{widgets:function(){return{
  setAmount:async function(){},
  renderPaymentMethods:async function(o){var el=document.querySelector(o.selector);if(el)el.innerHTML='<div style="padding:28px;border:1px dashed #b6aa9a;color:#6b625a;text-align:center;font-size:14px">결제수단 위젯 자리 (스텁 렌더)</div>';},
  renderAgreement:async function(o){var el=document.querySelector(o.selector);if(el)el.innerHTML='<div style="padding:14px;border:1px dashed #b6aa9a;color:#6b625a;text-align:center;font-size:13px">약관 동의 위젯 자리 (스텁 렌더)</div>';},
  requestPayment:async function(){}}}}};`;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try { localStorage.setItem('hh_cart_v1', JSON.stringify([{ sku: 'guide-korea', title: '고려대학교 2027 면접 가이드북', price: 33000, qty: 1, ship: false }])); } catch (e) {}
});
const api = (u) => { const p = new URL(u).pathname;
  if (p === '/api/auth/me') return FIX.me;
  if (p === '/api/config') return FIX.config;
  if (p === '/api/orders') return FIX.orders;
  if (p === '/api/payments/confirm') return FIX.confirm;
  return {}; };
for (const host of ['http://localhost:8799/**', 'https://api.hyunhak.com/**'])
  await ctx.route(host, (route) => {
    // credentials 요청은 CORS 에서 '*' origin 이 거부됨 — 요청 origin 을 반사하고 preflight 도 응답
    const req = route.request();
    const cors = { 'access-control-allow-origin': req.headers()['origin'] || 'http://localhost:8811',
                   'access-control-allow-credentials': 'true',
                   'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
                   'access-control-allow-headers': 'content-type' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors,
      body: JSON.stringify(api(req.url())) });
  });
await ctx.route('https://js.tosspayments.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: TOSS_STUB }));

const PAGES = ['checkout.html', 'my.html', 'pay_done.html?paymentKey=stub_pk&orderId=HH-20260826-STUB&amount=33000'];
for (const p of PAGES) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://localhost:8811/' + p, { waitUntil: 'networkidle' }).catch((e) => errs.push('nav ' + e));
  await pg.waitForTimeout(900);
  const m = await pg.evaluate(() => {
    const de = document.documentElement;
    const t = document.body.innerText;
    return { ox: de.scrollWidth - de.clientWidth, height: de.scrollHeight, url: location.pathname + location.search,
      h1: (document.querySelector('h1') || {}).textContent || null,
      marks: ['검수용', '고려대학교 2027 면접 가이드북', '33,000', '결제가 완료되었습니다', '결제 완료', '스텁 렌더'].filter((k) => t.includes(k)) };
  });
  const name = p.replace(/[\/?=&]/g, '_') + '_' + w + '.png';
  await pg.screenshot({ path: out + '/' + name, fullPage: true });
  console.log(JSON.stringify({ p, w: +w, ...m, errors: errs }));
  await pg.close();
}
await b.close();
