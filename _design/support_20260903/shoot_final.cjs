/* support.html B 구조 최종 검증 (2026-09-03). 1440/390 캡처 + 실측 4개 (overflow, #inqEmail y, 서체 3종, 목차 현재 위치).
   실행: NODE_PATH=/Users/gregory/Workspace/iruri_6mo_thumb/node_modules node _design/support_20260903/shoot_final.cjs */
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'shots');
const API = 'http://localhost:8799';
const CORS = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (route, status, body) => route.fulfill({ status, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS), body: JSON.stringify(body) });
const NOTICES = { items: [1, 2, 3, 4, 5].map((i) => ({ id: 'n' + i, title: '공지 ' + i + ' 가이드북 갱신 안내', starts_at: '2026-09-0' + i })) };
const MEMBER = { member: { id: 1, name: '홍길동', email: 'hong@example.com', member_type: 'student', has_password: true } };
function mock(page, member) {
  return page.route(API + '/**', (route) => {
    const req = route.request(); const u = new URL(req.url()); const p = u.pathname;
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (p === '/api/auth/me') return json(route, 200, member ? MEMBER : { member: null });
    if (p.startsWith('/api/notices')) return json(route, 200, u.searchParams.get('kind') === 'notice' ? NOTICES : { items: [] });
    if (p === '/api/inquiries') return json(route, 200, [{ id: 'inq_1', category: 'guide', title: '문의 하나', status: 'open', created_at: '2026-09-01T00:00:00Z', reply_count: 0 }]);
    if (p === '/api/config') return json(route, 200, { oauth: {} });
    return json(route, 404, { error: 'not found' });
  });
}
const MEASURE = () => {
  // 요소 대 카드조상 rect overflow: 상자(.box .panel .field .check .done .msg .sheet) 안 요소가 상자 가로 밖으로 나가는 수
  const boxes = '.box,.panel,.field,.check,.done,.msg,.sheet';
  let over = 0; const bad = [];
  document.querySelectorAll('.sup *, .side *').forEach((el) => {
    if (el.offsetParent === null) return;
    const anc = el.parentElement && el.parentElement.closest(boxes); if (!anc) return;
    const r = el.getBoundingClientRect(), a = anc.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.left < a.left - 1 || r.right > a.right + 1) { over++; if (bad.length < 5) bad.push(el.tagName + '.' + el.className + ' ' + Math.round(r.right - a.right)); }
  });
  const em = document.getElementById('inqEmail');
  const emY = em ? Math.round(em.getBoundingClientRect().top + window.scrollY) : null;
  const ag = document.getElementById('inqAgree'); const ar = ag ? ag.getBoundingClientRect() : null;
  const fams = ['Noto Serif KR', 'Pretendard Variable', 'JetBrains Mono'];
  const fonts = {}; fams.forEach((f) => { fonts[f] = document.fonts.check('16px "' + f + '"'); });
  const loaded = []; document.fonts.forEach((ff) => { if (ff.status === 'loaded' && !loaded.includes(ff.family)) loaded.push(ff.family); });
  const h1 = getComputedStyle(document.querySelector('.phead h1'));
  const h2 = getComputedStyle(document.querySelector('.sup .sh h2'));
  return { over, bad, emY, agree: ar ? [Math.round(ar.width), Math.round(ar.height), !document.getElementById('inqAgreeRow').hidden] : null,
    fonts, loaded, scrollWidth: document.documentElement.scrollWidth,
    h1: [h1.fontFamily.split(',')[0], h1.fontWeight], h2: [h2.fontFamily.split(',')[0], h2.fontWeight],
    sideBeforeMain: (() => { const s = document.querySelector('.sup .side'), m = document.querySelector('.sup .main'); return s.getBoundingClientRect().top < m.getBoundingClientRect().top; })(),
    termsLinks: document.querySelectorAll('main a[href$="terms.html"]').length,
    sealUses: (() => { let n = 0; document.querySelectorAll('main *').forEach((el) => { const cs = getComputedStyle(el); const b = getComputedStyle(el, '::before'); if ([cs.color, cs.backgroundColor, b.backgroundColor].some((c) => c === 'rgb(188, 53, 41)')) n++; }); return n; })(),
  };
};
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const out = {};
  for (const [name, vw, member] of [['desk', { width: 1440, height: 900 }, false], ['m390', { width: 390, height: 844 }, false], ['desk_member', { width: 1440, height: 900 }, true]]) {
    const ctx = await browser.newContext({ viewport: vw, deviceScaleFactor: 1, locale: 'ko-KR' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await mock(page, member);
    await page.goto('file://' + path.join(ROOT, 'support.html'), { waitUntil: 'load' });
    await page.waitForSelector('#ntcList li');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in')));
    out[name] = await page.evaluate(MEASURE);
    // 캡처는 스크롤 전(맨 위)에서. 스크롤 뒤 fullPage 캡처는 sticky 헤더가 중간에 찍힌다
    if (!member) await page.screenshot({ path: path.join(OUT, `final_B_${name}.png`), fullPage: true });
    // 목차 현재 위치: #refund 로 스크롤하면 그 링크가 .cur
    await page.evaluate(() => document.getElementById('refund').scrollIntoView({ behavior: 'instant', block: 'start' }));   // base.css 의 scroll-behavior:smooth 를 끄고 정지 위치에서 잰다
    await page.waitForTimeout(700);
    out[name].spyAtRefund = await page.evaluate(() => { const a = document.querySelector('.menu2 a.cur'); return a ? a.getAttribute('href') : null; });
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    await ctx.close();
  }
  await browser.close();
  Object.keys(out).forEach((k) => { const o = out[k]; console.log(k, JSON.stringify({ over: o.over, bad: o.bad, emY: o.emY, agree: o.agree, fonts: o.fonts, loaded: o.loaded, scrollWidth: o.scrollWidth, h1: o.h1, h2: o.h2, sideBeforeMain: o.sideBeforeMain, termsLinks: o.termsLinks, sealUses: o.sealUses, spyAtRefund: o.spyAtRefund })); });
  console.log('pageerrors', errors.length, errors.join(' | '));
  process.exit(errors.length ? 1 : 0);
})();
