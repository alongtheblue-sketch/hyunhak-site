// 배포 뒤 라이브 실측 (비로그인 공개 축). 사용: node _design/lecture_20260906/measure_live.mjs <기대 HEAD sha 7자 이상>
// 로그인 축(master 계정 인강실 카드, 담기 → 장바구니 1개 고정, 결제 400 재현 없음)은 gunwoobrowser(로그인 상속)로 별도.
import { createRequire } from 'module'; const require = createRequire('/Users/gregory/Workspace/iruri_6mo_thumb/package.json');
const { chromium } = require('playwright'); const want = (process.argv[2] || '').trim(); const B = 'https://hyunhak.com'; const A = 'https://api.hyunhak.com';   // 사이트는 assets/app.js HH.API = api.hyunhak.com 으로 API 를 부른다
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 hyunhak-measure';
const b = await chromium.launch(); const ctx = await b.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } }); const out = { pass: [], fail: [] };
const ok = (c, m) => (c ? out.pass : out.fail).push(m);
const head = async (u) => { const r = await ctx.request.head(u); return r.status(); };
const gen = (await (await ctx.request.get(B + '/_gen.txt?g=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } })).text()).trim();
ok(want && gen.startsWith(want), '_gen.txt=' + gen.slice(0, 12) + ' 기대=' + want);
for (const p of ['/lectures.html', '/lectures/common.html', '/lectures/yonsei-hum.html', '/classroom.html', '/faq.html', '/assets/video/sample_common.mp4', '/assets/video/sample_common.vtt', '/assets/docs/lecture_ot_script.pdf'])
  { const s = await head(B + p); ok(s === 200, p + ' ' + s); }
const pg = await ctx.newPage();
await pg.goto(B + '/index.html', { waitUntil: 'load' });
ok(await pg.locator('header nav a[href="lectures.html"]').count() >= 1, 'GNB 인강 항목');
await pg.goto(B + '/lectures.html', { waitUntil: 'networkidle' }).catch(e => ok(false, 'lectures.html goto ' + e.message.slice(0, 60))); await pg.waitForTimeout(800);
const api = await (await ctx.request.get(A + '/api/lectures/summary?unit=korea-sci')).json().catch(() => null);
const page = await pg.evaluate(() => [...document.querySelectorAll('[data-total]')].map(e => ({ code: e.getAttribute('data-code') || e.closest('[data-code]')?.getAttribute('data-code') || '', total: e.getAttribute('data-total'), text: e.textContent.trim().slice(0, 40) })));
out.summary_api = api; out.summary_page = page;
ok(api && typeof api.total === 'number', 'summary API 실값 total=' + (api && api.total));
await pg.goto(B + '/lectures/yonsei-hum.html', { waitUntil: 'load' });
ok(await pg.locator('video track[kind="captions"]').count() >= 1, '맛보기 자막 track');
await pg.goto(B + '/classroom.html', { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500);
const st = await pg.evaluate(() => (document.getElementById('crView') || {getAttribute(){return 'no-crView'}}).getAttribute('data-state')); ok(st === 'guest', '인강실 비로그인 상태=' + st);
await pg.goto(B + '/faq.html', { waitUntil: 'load' });
ok(await pg.locator('#q-lecture + details summary:has-text("맛보기를 볼 수 있습니까"), #q-lecture ~ details summary:has-text("맛보기를 볼 수 있습니까")').count() >= 1, 'FAQ 인강 신설 문항');
const m = await ctx.newPage({ viewport: { width: 320, height: 700 } }); await m.goto(B + '/lectures/korea-sci.html', { waitUntil: 'load' });
const an = await m.evaluate(() => { const n = document.querySelector('.anch'); return n ? n.scrollWidth - n.clientWidth : -1; }); ok(an === 0, '320px 앵커 넘침=' + an);
await b.close(); console.log(JSON.stringify(out, null, 1)); process.exit(out.fail.length ? 1 : 0);
