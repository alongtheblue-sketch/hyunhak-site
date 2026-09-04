// 결제 동의줄 실측 (C 완료기준 ⑤). 대조군은 수정 전 백업 파일을 같은 자로 잰다.
//   python3 -m http.server 8871 --bind 127.0.0.1  후  node _tools/measure_agree.mjs <page> [port]
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const [page_, port_] = process.argv.slice(2);
const PAGE = page_ || 'checkout.html';
const PORT = port_ || '8871';

const FIX = {
  me: { member: { id: 'm_stub', email: 'stub@hyunhak.com', name: '검수용', phone: '01012345678' }, entitlements: [], trial_available: true },
  config: { provider: 'portone', portoneStoreId: 'store-stub', portoneChannelKey: 'channel-key-stub', testMode: true },
};
// 포트원 SDK 는 결제 호출 때만 쓰인다. 로드만 되면 동의줄은 우리 코드가 그린다.
const PORTONE_STUB = 'window.PortOne={requestPayment:async function(){return{}}};';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try { localStorage.setItem('hh_cart_v1', JSON.stringify([{ sku: 'guide-kookmin', title: '국민대학교 2027 면접 가이드북', price: 33000, qty: 1, ship: false }])); } catch (e) {}
});
const api = (u) => { const p = new URL(u).pathname;
  if (p === '/api/auth/me') return FIX.me;
  if (p === '/api/config') return FIX.config;
  return {}; };
for (const host of [`http://localhost:8799/**`, 'https://api.hyunhak.com/**'])
  await ctx.route(host, (route) => {
    const req = route.request();
    const cors = { 'access-control-allow-origin': req.headers()['origin'] || `http://localhost:${PORT}`,
                   'access-control-allow-credentials': 'true',
                   'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
                   'access-control-allow-headers': 'content-type' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(api(req.url())) });
  });
await ctx.route('https://cdn.portone.io/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: PORTONE_STUB }));

const pg = await ctx.newPage();
const errs = [];
pg.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await pg.goto(`http://localhost:${PORT}/${PAGE}`, { waitUntil: 'networkidle' });
await pg.waitForSelector('.agree', { timeout: 8000 });
await pg.waitForTimeout(400);

const m = await pg.evaluate(() => {
  const lab = document.querySelector('.agree');
  const body = getComputedStyle(document.querySelector('main')).color;
  const as = [...lab.querySelectorAll('a')];
  // 앵커 바로 뒤 글자마디("과", "에")의 첫 글자 좌표를 Range 로 잰다.
  function nextGap(a) {
    let n = a.nextSibling;
    while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
    if (!n || n.nodeType !== 3) return null;
    const off = n.textContent.length - n.textContent.replace(/^\s+/, '').length;
    const r = document.createRange(); r.setStart(n, off); r.setEnd(n, off + 1);
    const rect = r.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return { text: n.textContent.trim().slice(0, 2), gap: +(rect.left - ar.right).toFixed(2) };
  }
  const links = as.map((a) => {
    const cs = getComputedStyle(a);
    return { text: a.textContent, color: cs.color, weight: cs.fontWeight,
             deco: cs.textDecorationLine, after: nextGap(a) };
  });
  const boxes = [...document.querySelectorAll('.legalbox .lgb')].map((s) => {
    const bdy = s.querySelector('.lgb-b');
    return { title: s.querySelector('h3').textContent,
             chars: bdy.innerText.replace(/\s+/g, '').length,
             h3: bdy.querySelectorAll('h3').length,
             scrollable: bdy.scrollHeight > bdy.clientHeight + 1,
             clientH: bdy.clientHeight };
  });
  const de = document.documentElement;
  return { bodyColor: body, links, boxes, labLines: lab.getClientRects().length,
           overflowX: de.scrollWidth - de.clientWidth };
});
console.log(JSON.stringify({ page: PAGE, ...m, pageerrors: errs }, null, 1));
await b.close();
