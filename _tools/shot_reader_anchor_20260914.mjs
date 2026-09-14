// 열람 경로가 없는 download 권리 행 재현 (2026-09-14, 건우 실측 "읽는 자료, 디지털 자료 카드의 열람하기 → 잘못된 접근").
// 원인 = master 계정 인강 앵커 ent_master_lecture 가 kind download + meta {note} 로 남아 있고(tools/master_grant_lecture_20260828.sql),
//   my.html 과 owned.js 가 slugOf(meta) 가 빈 값이어도 reader.html?slug= 링크를 그렸다. reader.js boot 는 빈 slug 를 "잘못된 접근입니다" 로 막는다.
// 스텁 회원 = 앵커 행 1 + 정상 가이드북 1 + 제목만 있고 파일이 없는 행 1. 면 = my.html(카드), studio.html(owned.js 마운트), 앵커 링크 실클릭.
// 판정: 빈 slug 링크 0, 앵커 카드 0, 파일 없는 행은 열람 버튼 없이 안내만. 실패면 exit 1.
//   node _tools/shot_reader_anchor_20260914.mjs <out_dir>   (정적 서버는 스크립트가 :8813 으로 직접 띄운다. 8811 은 API 테스트 스텁과 충돌)
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
const [out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 8813;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const BASE = `http://localhost:${PORT}/`;

const MEMBER = { id: 'm_stub', email: 'master@hyunhak.com', name: '마스터', marketing_opt_in: false };
const ME = { member: MEMBER, trial_available: false, entitlements: [
  // 원격 실재 형식 그대로 (handover 현학적_인강_상품면 s7 09-07 D1 읽기: kind lecture 행 0, ent_master_lecture 는 download)
  { id: 'ent_master_lecture', kind: 'download', meta: JSON.stringify({ note: 'master test: all lecture access' }), uses_left: null, expires_at: null },
  { id: 'ent_g1', kind: 'download', meta: JSON.stringify({ slug: 'guide-gachon', title: '가천대학교 2027 면접가이드북' }), uses_left: null, expires_at: null },
  // pay.js:320 은 file_key 가 NULL 인 digital 상품에도 제목 있는 download 행을 만든다. 열람 버튼 대신 안내가 서야 한다
  { id: 'ent_nofile', kind: 'download', meta: JSON.stringify({ sku: 'guide-x', file_key: null, title: '파일 미연결 상품' }), uses_left: null, expires_at: null },
] };
const STUB = { '/api/config': { oauth: {} }, '/api/orders': { orders: [] }, '/api/lectures': { lectures: [] }, '/api/lectures/public': { lectures: [] },
  '/api/lectures/summary': { ready: 0, total: 0, as_of: '2026-09-14' }, '/api/studio/attempts': { attempts: [], usage: [], set_uses: 5, retention_days: 90 },
  '/api/studio/sets/downloads/me': { downloads: [] }, '/api/reader/downloads/me': { downloads: [] }, '/api/products': { products: [] },
  '/api/trial/reader/catalog': { catalog: [], hours: 48 }, '/api/trial/reader': { status: 'none', hours: 48 } };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route((u) => !/^(http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/|https:\/\/(api|studio)\.hyunhak\.com\/)/.test(u.href), (route) => route.fulfill({ status: 204, body: '' }));
for (const host of ['http://localhost:8799/**', 'https://api.hyunhak.com/**']) await ctx.route(host, (route) => {
  const req = route.request(); const p = new URL(req.url()).pathname;
  const cors = { 'access-control-allow-origin': req.headers()['origin'] || BASE.slice(0, -1), 'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (p === '/api/auth/me') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(ME) });
  return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(STUB[p] || {}) });
});

const report = {}; const fails = [];
const probe = () => {
  const q = (s) => Array.from(document.querySelectorAll(s)), tx = (el) => el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
  const links = q('a[href*="reader.html"]').map((a) => ({ href: a.getAttribute('href'), text: tx(a), card: tx(a.closest('.subcard,.owned-row,li,article')) }));
  return { readerLinks: links, emptySlugLinks: links.filter((l) => /reader\.html\?slug=$/.test(l.href)).length,
    cardNames: q('#passList .subcard .nm').map(tx), owned: tx(document.querySelector('[data-owned]')), errs: [] };
};
for (const p of ['my.html', 'studio.html']) {
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  await pg.goto(BASE + p, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1200);
  const r = await pg.evaluate(probe); r.errs = errs; report[p] = r;
  await pg.screenshot({ path: `${out}/${p.replace(/[\/.]/g, '_')}.png`, fullPage: true });
  if (r.emptySlugLinks) fails.push(`${p}: 빈 slug reader 링크 ${r.emptySlugLinks}`);
  if (p === 'my.html') {
    if (r.cardNames.some((n) => n === '읽는 자료, 디지털 자료')) fails.push('my.html: 앵커 행이 종류 이름 카드로 섰다');
    if (!r.cardNames.some((n) => n === '가천대학교 2027 면접가이드북')) fails.push('my.html: 정상 가이드북 카드가 없다');
    const nofile = r.readerLinks.find((l) => /파일 미연결 상품/.test(l.card || ''));
    if (nofile) fails.push('my.html: 파일 없는 행에 열람 링크가 있다 ' + nofile.href);
    if (!r.cardNames.some((n) => n === '파일 미연결 상품')) fails.push('my.html: 파일 없는 행(제목 있음)이 목록에서 사라졌다');
  }
  if (p === 'studio.html' && /읽는 자료, 디지털 자료/.test(r.owned || '')) fails.push('studio.html: owned.js 가 앵커 행을 그렸다');
  // 앵커 링크가 있으면 실클릭해 리더의 문구를 잡는다 (수리 전 = "잘못된 접근입니다")
  const a = await pg.$('a[href$="reader.html?slug="]');
  if (a) { await a.click(); await pg.waitForTimeout(800); r.clickedTo = pg.url(); r.readerText = (await pg.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200))); }
  await pg.close();
}
await b.close(); srv.close();
report.fails = fails; report.ts = new Date().toISOString();
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(fails.length ? `FAIL ${fails.length}` : 'PASS');
process.exit(fails.length ? 1 : 0);
