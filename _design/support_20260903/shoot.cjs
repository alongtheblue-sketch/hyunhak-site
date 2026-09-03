/* 고객센터, 환불 모달 검증 스크린샷 (2026-09-03). file:// 로 열고 API(localhost:8799) 는 route 로 흉내낸다.
   실행: NODE_PATH=/Users/gregory/Workspace/iruri_6mo_thumb/node_modules node _design/support_20260903/shoot.cjs
   산출: _design/support_20260903/shots/*.png + 콘솔 요약(pageerror 0 이어야 PASS) */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const url = (rel) => 'file://' + path.join(ROOT, rel);
const API = 'http://localhost:8799';
const CORS = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
const json = (route, status, body) => route.fulfill({ status, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS), body: JSON.stringify(body) });

const MEMBER = { member: { id: 1, name: '홍길동', email: 'hong@example.com', member_type: 'student', marketing_opt_in: false, has_password: true, school: '판곡고등학교', grade: '고3' }, entitlements: [], trial_available: false };
const ORDERS = { orders: [
  { id: 'ord_a1', status: 'paid', amount: 66000, paid_at: '2026-09-01T10:00:00Z', receipt_url: 'https://example.com/receipt/a1',
    items: [{ title: '서울대학교 2027 면접가이드북', qty: 1 }, { title: '경희대학교 2027 면접가이드북', qty: 1 }] },
  { id: 'ord_b2', status: 'paid', amount: 33000, paid_at: '2026-08-20T09:00:00Z', items: [{ title: '지문 낱권 (연세대 활동우수 인문통합 03)', qty: 1 }] },
  { id: 'ord_c3', status: 'canceled', amount: 33000, created_at: '2026-08-01T09:00:00Z', items: [{ title: '가천대학교 2027 면접가이드북', qty: 1 }] },
] };
const ELIG = { order: { id: 'ord_a1', amount: 66000, status: 'paid', paid_at: '2026-09-01T10:00:00Z' },
  items: [
    { id: 'it1', title: '서울대학교 2027 면접가이드북', sku: 'guide-snu', type: 'download', unit_price: 33000, qty: 1, opened: false, opened_at: null, eligible: true, reason: null },
    { id: 'it2', title: '경희대학교 2027 면접가이드북', sku: 'guide-khu', type: 'download', unit_price: 33000, qty: 1, opened: true, opened_at: '2026-09-02T03:00:00Z', eligible: false, reason: '열람 시작(제공 개시)' },
  ], refundable_amount: 33000, window_until: '2026-09-08T10:00:00Z', policy: { version: '2026-09-03', deadline_days: 7 }, existing_request: null };
const INQ = [
  { id: 'inq_7', category: 'refund', title: '전권 열람권 중 두 권만 열었는데 나머지 환불되나요', status: 'answered', created_at: '2026-09-02T11:20:00Z', reply_count: 1 },
  { id: 'inq_5', category: 'guide', title: '연세대 가이드북은 언제 나오나요', status: 'open', created_at: '2026-08-30T08:05:00Z', reply_count: 0 },
];
const THREAD = { inquiry: { id: 'inq_7', category: 'refund', title: INQ[0].title, body: '전권 열람권을 샀고 서울대와 경희대만 열었습니다. 나머지 29권은 환불이 되는지요.', status: 'answered', created_at: INQ[0].created_at },
  replies: [{ author: 'admin', body: '열지 않은 29권은 잔여 권수 비율로 환불됩니다. 마이페이지 주문 내역의 환불 요청에서 보내 주시면 3영업일 이내에 결제 수단으로 돌려드립니다.', created_at: '2026-09-02T15:40:00Z' }] };
const NOTICES = { items: [
  { id: 'n5', title: '가이드북 갱신: 서울대학교 2027 모집요강 반영', starts_at: '2026-09-01' },
  { id: 'n4', title: '결제 수단 안내: 계좌이체와 간편결제 10월 오픈 예정', starts_at: '2026-08-28' },
  { id: 'n3', title: '제시문 면접 스튜디오 연세대 국제형 세트 추가', starts_at: '2026-08-25' },
  { id: 'n2', title: '고객센터 1:1 문의 개설', starts_at: '2026-08-20' },
  { id: 'n1', title: '2027 서류기반면접 가이드북 판매 개시', starts_at: '2026-08-12' },
] };

function mock(page, mode) {
  // mode: 'down' = 전 API 실패, 'member' = 로그인 + 정상 응답, 'guest' = 비로그인 + 공지만 정상
  return page.route(API + '/**', (route) => {
    const req = route.request(); const u = new URL(req.url()); const p = u.pathname; const m = req.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (mode === 'down') return json(route, 500, { error: '일시 장애' });
    if (p === '/api/auth/me') return json(route, 200, mode === 'guest' ? { member: null } : MEMBER);
    if (p === '/api/orders') return json(route, 200, ORDERS);
    if (p === '/api/orders/ord_a1/refund-request' && m === 'GET') return json(route, 200, null);
    if (p === '/api/orders/ord_b2/refund-request' && m === 'GET') return json(route, 200, { id: 'rr_1', status: 'pending', requested_at: '2026-08-21T09:00:00Z' });
    if (p === '/api/orders/ord_a1/refund-eligibility') return json(route, 200, ELIG);
    if (p === '/api/orders/ord_a1/refund-request' && m === 'POST') return json(route, 201, { id: 'rr_2', status: 'pending', refundable_amount: 33000 });
    if (p === '/api/b2b/consents') return json(route, 200, { consents: [] });
    if (p.startsWith('/api/notices')) return json(route, 200, u.searchParams.get('kind') === 'notice' ? NOTICES : { items: [] });   // 팝업 공지(kind=popup)는 비워 hh-popup 이 클릭을 가리지 않게
    if (p === '/api/inquiries' && m === 'GET') return json(route, 200, INQ);
    if (p === '/api/inquiries' && m === 'POST') return json(route, 201, { id: 'inq_9' });
    if (p === '/api/inquiries/inq_7' && m === 'GET') return json(route, 200, THREAD);
    if (p === '/api/inquiries/inq_7/replies' && m === 'POST') return json(route, 201, { id: 'rp_2' });
    if (p === '/api/config') return json(route, 200, { oauth: {} });
    return json(route, 404, { error: 'not found' });
  });
}

const errors = [];
async function fresh(browser, mode, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 900 }, deviceScaleFactor: 1, locale: 'ko-KR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror ${mode}] ${e.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error' && !/net::ERR|Failed to load resource|CORS/.test(msg.text())) errors.push(`[console ${mode}] ${msg.text()}`); });
  await mock(page, mode);
  return { ctx, page };
}
const reveal = (page) => page.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in')));
async function shot(page, name, opt) { await page.screenshot(Object.assign({ path: path.join(OUT, name) }, opt || {})); console.log('shot', name); }
async function clip(page, sel, name) {
  const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: path.join(OUT, name) }); console.log('shot', name);
}

(async () => {
  const browser = await chromium.launch();
  const results = [];

  // ── my.html: 주문 행 버튼과 배지, 모달 4상태 ──
  {
    const { ctx, page } = await fresh(browser, 'member');
    await page.goto(url('my.html'), { waitUntil: 'load' });
    await page.waitForSelector('#orderRows li');
    await page.waitForFunction(() => document.querySelector('li[data-oid="ord_b2"] .rfst'));   // 기존 요청 = 배지
    await reveal(page);
    results.push('rows: ' + await page.$$eval('#orderRows li', (ls) => ls.map((l) => l.querySelector('.s').textContent.trim().replace(/\s+/g, ' ')).join(' | ')));
    await clip(page, '#orderRows', 'my_orders_before.png');
    await page.click('li[data-oid="ord_a1"] .rfgo');
    await page.waitForSelector('#rfDlg[open] .tbl');
    results.push('modal open: ' + await page.$eval('#rfDlg', (d) => d.open) + ', focus=' + await page.evaluate(() => document.activeElement.id));
    results.push('table: ' + await page.$$eval('#rfDlg .tbl tbody tr', (rs) => rs.map((r) => r.textContent.trim().replace(/\s+/g, ' ')).join(' | ')));
    results.push('sum: ' + await page.$eval('#rfSum', (e) => e.textContent) + ' / header: ' + await page.$$eval('#rfDlg .tbl th', (hs) => hs.map((h) => h.textContent).join(',')));
    await shot(page, 'my_modal_open.png');
    // 포커스 트랩: Tab 을 여러 번 눌러도 dialog 안에 머문다
    let inside = true;
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); inside = inside && await page.evaluate(() => document.getElementById('rfDlg').contains(document.activeElement)); }
    results.push('focus trap (12 tabs inside): ' + inside);
    // 빈 사유 → 오류 문구
    await page.click('#rfSend');
    results.push('empty reason msg: ' + await page.$eval('#rfMsg', (e) => e.textContent));
    await page.fill('#rfReason', '아직 열지 않은 권이라 청약철회합니다.');
    await page.click('#rfSend');
    await page.waitForSelector('#rfDlg .state .badge');
    results.push('after send: ' + await page.$eval('#rfDlg .state', (e) => e.textContent.trim().replace(/\s+/g, ' ')));
    await shot(page, 'my_modal_done.png');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('rfDlg').open);
    results.push('ESC closed: ' + !(await page.$eval('#rfDlg', (d) => d.open)) + ', focus back=' + await page.evaluate(() => document.activeElement.className));
    results.push('row after: ' + await page.$eval('li[data-oid="ord_a1"] .s', (e) => e.textContent.trim().replace(/\s+/g, ' ')));
    await clip(page, '#orderRows', 'my_orders_after.png');
    await ctx.close();
  }
  {
    // 기존 요청이 있는 주문(ord_b2)에서 eligibility 가 existing_request 를 돌려주는 경우 + API 실패 폴백
    const { ctx, page } = await fresh(browser, 'member');
    await page.route(API + '/api/orders/ord_b2/refund-eligibility', (r) => json(r, 200, Object.assign({}, ELIG, { existing_request: { id: 'rr_1', status: 'pending', requested_at: '2026-08-21T09:00:00Z' } })));
    await page.route(API + '/api/orders/ord_b2/refund-request', (r) => json(r, 200, null));   // 행은 버튼으로 두고 모달에서 기존 요청을 본다
    await page.goto(url('my.html'), { waitUntil: 'load' });
    await page.waitForSelector('li[data-oid="ord_b2"] .rfgo');
    await page.click('li[data-oid="ord_b2"] .rfgo');
    await page.waitForSelector('#rfDlg[open] .state .badge');
    results.push('existing: ' + await page.$eval('#rfDlg .state', (e) => e.textContent.trim().replace(/\s+/g, ' ')) + ' | send hidden=' + await page.$eval('#rfSend', (b) => b.hidden));
    await shot(page, 'my_modal_existing.png');
    await page.keyboard.press('Escape');
    await page.unroute(API + '/api/orders/ord_a1/refund-eligibility');
    await page.route(API + '/api/orders/ord_a1/refund-eligibility', (r) => json(r, 500, { error: '일시 장애' }));
    await page.click('li[data-oid="ord_a1"] .rfgo');
    await page.waitForSelector('#rfDlg[open] .state');
    results.push('fallback: ' + await page.$eval('#rfDlg .state', (e) => e.textContent.trim()));
    await shot(page, 'my_modal_fallback.png');
    await ctx.close();
  }

  // ── support.html: API 전 실패(비회원 폴백) ──
  {
    const { ctx, page } = await fresh(browser, 'down');
    await page.goto(url('support.html'), { waitUntil: 'load' });
    await page.waitForSelector('#ntcEmpty:not([hidden])');
    await reveal(page);
    results.push('support down: guest=' + await page.$eval('#inqGuest', (e) => !e.hidden) + ', pn open=' + await page.$eval('#inqPn', (d) => d.open)
      + ', notices=' + await page.$eval('#ntcEmpty', (e) => e.textContent.trim()) + ', mine note=' + await page.$eval('#mineNote', (e) => !e.hidden));
    await shot(page, 'support_guest_down_full.png', { fullPage: true });
    await clip(page, '.cards.top', 'support_cards.png');
    await clip(page, '#inquiry', 'support_form_guest.png');
    await clip(page, '#notices', 'support_notices_fallback.png');
    await clip(page, '#contact', 'support_contact.png');
    await clip(page, '#refund', 'support_refund.png');
    // 동의 없이 보내기 → 안내
    await page.selectOption('#inqCat', 'guide'); await page.fill('#inqTitle', '테스트'); await page.fill('#inqBody', '내용');
    await page.fill('#inqEmail', 'guest@example.com');
    await page.click('#inqSend');
    results.push('guest no-agree msg: ' + await page.$eval('#inqMsg', (e) => e.textContent));
    await page.check('#inqAgree'); await page.click('#inqSend');
    await page.waitForFunction(() => document.getElementById('inqMsg').textContent.includes('접수할 수 없습니다'));
    results.push('guest send while down: ' + await page.$eval('#inqMsg', (e) => e.textContent));
    await clip(page, '#inquiry', 'support_form_guest_error.png');
    await ctx.close();
  }
  // ── support.html: 회원 + 정상 응답 ──
  {
    const { ctx, page } = await fresh(browser, 'member');
    await page.goto(url('support.html'), { waitUntil: 'load' });
    await page.waitForSelector('#mineList li');
    await page.waitForSelector('#ntcList li');
    await reveal(page);
    results.push('support member: who=' + await page.$eval('#inqWho', (e) => e.textContent) + ' | pn open=' + await page.$eval('#inqPn', (d) => d.open) + ' agreeRow hidden=' + await page.$eval('#inqAgreeRow', (e) => e.hidden)
      + ' | mine=' + await page.$$eval('#mineList li', (ls) => ls.length) + ' | notices=' + await page.$$eval('#ntcList li', (ls) => ls.length));
    await shot(page, 'support_member_full.png', { fullPage: true });
    await clip(page, '#mineBlk', 'support_mylist.png');
    await page.click('#mineList a[data-id="inq_7"]');
    await page.waitForSelector('#thread:not([hidden]) #thReplies .msg');
    results.push('thread: ' + await page.$eval('#thTitle', (e) => e.textContent) + ' | replies=' + await page.$$eval('#thReplies .msg', (ms) => ms.length) + ' | reply form=' + await page.$eval('#thReplyForm', (f) => !f.hidden));
    await clip(page, '#thread', 'support_thread.png');
    await page.fill('#thReply', '감사합니다. 요청 보냈습니다.'); await page.click('#thSend');
    await page.waitForFunction(() => document.getElementById('thMsg').textContent.includes('보냈습니다'));
    results.push('reply sent: ' + await page.$eval('#thMsg', (e) => e.textContent));
    await page.selectOption('#inqCat', 'pay'); await page.fill('#inqTitle', '영수증 재발급'); await page.fill('#inqBody', '카드 영수증을 다시 받을 수 있나요.');
    await page.click('#inqSend');
    await page.waitForSelector('#inqDone:not([hidden])');
    results.push('inquiry done no: ' + await page.$eval('#inqDoneNo', (e) => e.textContent));
    await clip(page, '#inquiry', 'support_form_done.png');
    await ctx.close();
  }
  // ── 모바일 폭 ──
  {
    const { ctx, page } = await fresh(browser, 'guest', { width: 390, height: 844 });
    await page.goto(url('support.html'), { waitUntil: 'load' });
    await page.waitForSelector('#ntcList li');
    await reveal(page);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    results.push('mobile 390 scrollWidth=' + sw + (sw <= 390 ? ' OK' : ' OVERFLOW'));
    await shot(page, 'support_mobile_390.png', { fullPage: true });
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh(browser, 'member', { width: 390, height: 844 });
    await page.goto(url('my.html'), { waitUntil: 'load' });
    await page.waitForSelector('li[data-oid="ord_a1"] .rfgo');
    await page.click('li[data-oid="ord_a1"] .rfgo');
    await page.waitForSelector('#rfDlg[open] .tbl');
    await shot(page, 'my_modal_mobile_390.png');
    await ctx.close();
  }
  // ── 3안 ──
  for (const v of ['A', 'B', 'C']) {
    const { ctx, page } = await fresh(browser, 'guest');
    await page.goto(url(`_design/support_20260903/${v}.html`), { waitUntil: 'load' });
    await page.waitForSelector('#ntcList li');
    await reveal(page);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    results.push(`variant ${v}: scrollWidth=${sw}, sections=` + await page.$$eval('main section.blk, main .blk', (s) => s.length));
    await shot(page, `variant_${v}.png`, { fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log('\n--- results ---');
  results.forEach((r) => console.log(r));
  console.log('\n--- errors (' + errors.length + ') ---');
  errors.forEach((e) => console.log(e));
  process.exit(errors.length ? 1 : 0);
})();
