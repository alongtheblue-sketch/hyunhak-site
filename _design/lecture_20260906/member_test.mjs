import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const ORIGIN = 'http://127.0.0.1:8813';
const cat = JSON.parse(fs.readFileSync('/Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/_tools/lecture_catalog.json','utf8')).lectures;
const mine = cat.map((l, i) => ({ ...l, entitled: l.kind === 'common' || l.unit_code === 'korea-hum', progress: (l.unit_code === 'korea-hum' && l.kind === 'unit' && l.seq <= 3) ? { position_sec: l.seq === 3 ? 400 : l.duration_sec, view_count: l.seq, completed: l.seq < 3, updated_at: '2026-09-0' + (3 + l.seq) + 'T10:00:00Z' } : null }));
const me = { member: { id: 'm1', name: '테스트' }, entitlements: [ { id: 'e1', kind: 'lecture', expires_at: '2026-12-05T00:00:00Z', _meta: { unit_code: 'korea-hum', scope: 'unit_passages' } }, { id: 'e2', kind: 'lecture', expires_at: '2026-12-05T00:00:00Z', _meta: { scope: 'common' } } ] };
const browser = await chromium.launch();
const R = '/Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/_design/lecture_20260906/';
for (const [tag, path, w] of [['room_member','/classroom.html',1280],['room_member','/classroom.html',390],['detail_member','/lectures/korea-hum.html',1280],['list_member','/lectures.html',1280]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
  await ctx.route('https://api.hyunhak.com/**', async (route) => {
    const u = new URL(route.request().url()); const H = { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    let body = {};
    if (u.pathname === '/api/auth/me') body = me;
    else if (u.pathname === '/api/lectures') body = { lectures: mine };
    else if (u.pathname === '/api/lectures/public') body = { unit: u.searchParams.get('unit'), lectures: cat.filter(l => l.unit_code === u.searchParams.get('unit')) };
    else if (u.pathname === '/api/lectures/summary') { const unit = u.searchParams.get('unit'), kind = u.searchParams.get('kind'); const rows = cat.filter(l => (!unit || l.unit_code === unit) && (!kind || l.kind === kind)); body = { unit, kind, total: rows.length, ready: rows.filter(l => l.status === 'ready').length, as_of: '2026-09-06' }; }
    else if (u.pathname === '/api/config') body = { oauth: {} };
    else if (u.pathname === '/api/notices') body = { notices: [] };
    else body = {};
    return route.fulfill({ status: 200, headers: H, body: JSON.stringify(body) });
  });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(ORIGIN + path, { waitUntil: 'load' }); await pg.waitForTimeout(2500);
  await pg.addStyleTag({ content: '.rv{opacity:1!important;transform:none!important}' });
  const state = await pg.evaluate(() => { const v = document.getElementById('crView'); return v ? v.getAttribute('data-state') + ' cards=' + document.querySelectorAll('#crCards .cr').length + ' recent=' + document.querySelectorAll('#crRecent .row').length : 'btns=' + document.querySelectorAll('[data-lec] .a .btn').length + ' resume=' + [...document.querySelectorAll('[data-lec] .a .btn')].filter(b => /이어보기/.test(b.textContent)).length + ' sum=' + [...document.querySelectorAll('[data-lec-summary]')].map(e => e.textContent.trim()).slice(0,2).join(' / '); });
  await pg.screenshot({ path: R + `pg_${tag}_${w}.png`, fullPage: true });
  console.log(tag, w, state, errs.length ? 'ERR ' + errs.join(' | ') : 'errs=0');
  await ctx.close();
}
await browser.close();
