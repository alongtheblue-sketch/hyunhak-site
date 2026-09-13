// "내가 산 것" (assets/owned.js) 실렌더 증거 (2026-09-13). 로컬 서버 :8811 필요 (hostname localhost → app.js 가 :8799 API 를 본다).
//   python3 -m http.server 8811 --bind 127.0.0.1  후  node _tools/shot_owned.mjs <out_dir>
// API 를 route 로 스텁: 회원(전권 1, 낱권 1, 만료 전권 1, 인강 1, 가이드북 1) 과 비회원(401) 두 상태 × 400/1280 폭.
import { chromium, devices } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const EXP = '2026-12-13T14:59:59Z';
const OWNER = { member: { id: 'm_stub', email: 'stub@hyunhak.com', name: '검수용', marketing_opt_in: true }, trial_available: false,
  entitlements: [
    { id: 'ent_school_yh', kind: 'studio_school', meta: JSON.stringify({ sku: 'pass-yonsei-hum', unit_code: 'yonsei-hum', title: '연세대 활동우수 인문통합 전권 이용권' }), expires_at: EXP },
    { id: 'ent_pass_kh', kind: 'studio_passage', meta: JSON.stringify({ set_id: 'korea_2027_h03', title: '고려대 계열적합 인문 3번 지문 낱권' }), uses_left: 4, expires_at: EXP },
    { id: 'ent_old_ys', kind: 'studio_school', meta: JSON.stringify({ sku: 'pass-yonsei-sci' }), expires_at: '2026-01-01T00:00:00Z' },
    { id: 'ent_lec', kind: 'lecture', meta: JSON.stringify({ unit_code: 'yonsei-hum' }), expires_at: EXP },
    { id: 'ent_g1', kind: 'download', meta: JSON.stringify({ slug: 'guide-gachon', title: '가천대학교 2027 면접가이드북' }) },
  ] };
const STUB = {
  '/api/config': { oauth: {} }, '/api/orders': { orders: [] }, '/api/lectures': { lectures: [] }, '/api/lectures/public': { lectures: [] },
  '/api/lectures/summary': { ready: 4, total: 30, as_of: '2026-09-13' }, '/api/studio/attempts': { attempts: [], usage: [], set_uses: 5, retention_days: 90 },
  '/api/studio/sets/downloads/me': { downloads: [] }, '/api/reader/downloads/me': { downloads: [] }, '/api/products': { products: [] },
  '/api/studio/token': { url: 'https://studio.hyunhak.com/?hh=stub', scope: 'studio_school' } };
const PAGES = ['index.html', 'studio.html', 'programs/studio.html', 'library.html', 'lectures.html', 'my.html'];
const b = await chromium.launch(); const report = {};
for (const state of ['owner', 'guest']) for (const w of [400, 1280]) {
  const ctx = await b.newContext(w === 400 ? { ...devices['Pixel 7'], viewport: { width: 400, height: 860 } } : { viewport: { width: 1280, height: 900 } });
  const tokenCalls = [];
  for (const host of ['http://localhost:8799/**', 'https://api.hyunhak.com/**']) await ctx.route(host, (route) => {
    const req = route.request(); const p = new URL(req.url()).pathname;
    const cors = { 'access-control-allow-origin': req.headers()['origin'] || 'http://localhost:8811', 'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (p === '/api/auth/me') return state === 'owner' ? route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(OWNER) })
      : route.fulfill({ status: 401, contentType: 'application/json', headers: cors, body: '{"error":"unauthorized"}' });
    if (p === '/api/studio/token') tokenCalls.push(req.postData());
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(STUB[p] || {}) });
  });
  await ctx.route('https://studio.hyunhak.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>studio stub</title>stub' }));
  for (const p of PAGES) {
    const key = `${state}_${w}_${p.replace(/[\/.]/g, '_')}`;
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    pg.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
    await pg.goto('http://localhost:8811/' + p, { waitUntil: 'networkidle' }).catch((e) => errs.push('nav ' + e));
    await pg.waitForTimeout(1200);
    const m = await pg.evaluate(() => {
      const de = document.documentElement, q = (s) => Array.from(document.querySelectorAll(s));
      const ownedEl = document.querySelector('[data-owned]');
      const own = ownedEl && !ownedEl.hidden ? ownedEl.innerText.replace(/\s+/g, ' ').slice(0, 400) : null;
      const cards = q('article[data-r3-unit]').map((c) => ({ unit: c.dataset.r3Unit, applied: !!c.dataset.ownedApplied, badge: (c.querySelector('.r3-unit-badge') || {}).textContent,
        foot: Array.from(c.querySelectorAll('.foot a,.foot button')).map((x) => x.textContent.trim()) }));
      const tg = document.getElementById('trialGo');
      return { ox: de.scrollWidth - de.clientWidth, height: de.scrollHeight, coarse: matchMedia('(pointer:coarse)').matches, own, cards,
        trialGo: tg ? (tg.hidden ? '(hidden)' : tg.textContent.trim()) : null, libOwn: q('.liblist .lf.own').length,
        libOwnTag: q('.liblist .lf.own .own-tag').map((x) => x.textContent).slice(0, 3), passList: (document.getElementById('passList') || { innerText: '' }).innerText.replace(/\s+/g, ' ').slice(0, 300),
        tapSmall: q('[data-owned-go],.owned .btn,.owned .tlink').filter((x) => { const r = x.getBoundingClientRect(); return r.height && r.height < 24; }).length };
    });
    await pg.screenshot({ path: `${out}/${key}.png`, fullPage: true });
    // 응시하러 가기 실클릭: 회원 상태에서 첫 버튼. 휴대폰(coarse) 은 같은 탭 이동, 데스크톱은 새 창.
    // ★ fullPage 스크린샷 뒤에는 Chromium 터치 에뮬레이션이 풀려 (pointer:coarse) 가 false 로 바뀐다 (2026-09-13 실측). 클릭은 새 페이지에서 한다
    let click = null;
    if (state === 'owner') {
      await pg.close();
      const pg2 = await ctx.newPage(); await pg2.goto('http://localhost:8811/' + p, { waitUntil: 'networkidle' }); await pg2.waitForTimeout(800);
      const coarseAtClick = await pg2.evaluate(() => matchMedia('(pointer:coarse)').matches);
      const go = await pg2.$('[data-owned-go]');
      if (go) {
        // 데스크톱은 클릭 시점에 빈 창을 열고 토큰을 받은 뒤 옮긴다. 새 창의 최종 주소를 기다린다
        const popup = ctx.waitForEvent('page', { timeout: 2500 }).then((np) => np.waitForURL(/studio\.hyunhak\.com/, { timeout: 3000 }).then(() => np.url())).catch(() => null);
        await go.click(); await pg2.waitForTimeout(1500);
        click = { coarseAtClick, tokenBody: tokenCalls[tokenCalls.length - 1] || null, sameTabUrl: pg2.url(), popupUrl: await popup };
      }
      await pg2.close();
    }
    report[key] = { ...m, errs, click };
    if (state !== 'owner') await pg.close();
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) console.log(k, JSON.stringify({ ox: v.ox, errs: v.errs, coarse: v.coarse, own: v.own && v.own.slice(0, 160), trialGo: v.trialGo, libOwn: v.libOwn, tapSmall: v.tapSmall,
  cards: v.cards.filter((c) => c.applied).map((c) => c.unit + '|' + c.badge + '|' + c.foot.join('/')), click: v.click }));
