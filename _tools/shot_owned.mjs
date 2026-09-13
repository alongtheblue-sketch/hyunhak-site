// "내가 산 것" (assets/owned.js) + 구매물 활용 UX s2 문안 실렌더 증거 (2026-09-13). 로컬 서버 :8811 필요 (hostname localhost → app.js 가 :8799 API 를 본다).
//   python3 -m http.server 8811 --bind 127.0.0.1  후  node _tools/shot_owned.mjs <out_dir>
// API 를 route 로 스텁. 상태 4종 × 400/1280 폭:
//   owner      = 회원(전권 1, 낱권 1, 만료 전권 1, 인강 1, 가이드북 1), 응시 0건, 첫 사용 안내가 보여야 한다
//   owner_done = 같은 회원, 채점 완료 응시 1건 + lecture 권리, 안내 숨김, 응시 기록 행에 해설 강의 링크 1
//   trial      = 회원, trial_available true, entitlements []
//   guest      = 비회원(401)
// 스튜디오 앱(interview-studio/web)은 본 스크립트가 :8812 로 정적 서빙하고 /api/* 는 route 로 스텁한다 (별도 기동 불요).
// 리포트 = _docs/owned_ux_render_report_s2_20260913.json, 스크린샷 = <out_dir>.
import { chromium, devices } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
const [out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const STUDIO = '/Users/gregory/Workspace/interview-studio';
const REPORT = path.join(SITE, '_docs', 'owned_ux_render_report_s2_20260913.json');
const EXP = '2026-12-13T14:59:59Z';
const MEMBER = { id: 'm_stub', email: 'stub@hyunhak.com', name: '검수용', marketing_opt_in: true };
const OWNER = { member: MEMBER, trial_available: false,
  entitlements: [
    { id: 'ent_school_yh', kind: 'studio_school', meta: JSON.stringify({ sku: 'pass-yonsei-hum', unit_code: 'yonsei-hum', title: '연세대 활동우수 인문통합 전권 이용권' }), expires_at: EXP },
    { id: 'ent_pass_kh', kind: 'studio_passage', meta: JSON.stringify({ set_id: 'korea_2027_h03', title: '고려대 계열적합 인문 3번 지문 낱권' }), uses_left: 4, expires_at: EXP },
    { id: 'ent_old_ys', kind: 'studio_school', meta: JSON.stringify({ sku: 'pass-yonsei-sci' }), expires_at: '2026-01-01T00:00:00Z' },
    { id: 'ent_lec', kind: 'lecture', meta: JSON.stringify({ unit_code: 'yonsei-hum' }), expires_at: EXP },
    { id: 'ent_g1', kind: 'download', meta: JSON.stringify({ slug: 'guide-gachon', title: '가천대학교 2027 면접가이드북' }) },
  ] };
const TRIAL = { member: MEMBER, trial_available: true, entitlements: [] };
const ME = { owner: OWNER, owner_done: OWNER, trial: TRIAL };   // guest = 401
// 기출 체험판 카탈로그 10건 (pastexam.js 가 읽는 slug, title, pages). 문제지 2면 + 해설지 4면 × 5 = 30면
const CATALOG = [['yonsei-hum', '2026 연세대 활동우수 인문통합 기출'], ['yonsei-sci', '2026 연세대 활동우수 자연 기출'], ['yonsei-intl', '2026 연세대 국제형 기출'],
  ['korea-hum-am', '2026 고려대 계열적합 인문 오전 기출'], ['korea-sci-pm', '2026 고려대 계열적합 자연 오후 기출']]
  .flatMap(([s, t]) => [{ slug: s + '-exam', title: t + ' 문제지', pages: 2 }, { slug: s + '-key', title: t + ' 해설지', pages: 4 }]);
// 채점 완료 응시 1건. my.html(L490~545) 이 읽는 필드 = set_id, created_at, total_score, total_points, finalized_at, answer_mode, kind, ref/attempt_id.
// 스펙 표기(id, status, finalized, max_score) 도 함께 실어 두 면이 다 읽게 한다
const DONE_AT = '2026-09-10T03:12:00Z';
const ATTEMPT_DONE = { id: 'att_stub_1', attempt_id: 'att_stub_1', ref: 'att_stub_1', set_id: 'yonsei_2027_h03', kind: 'studio_school', answer_mode: 'combined',
  status: 'done', finalized: true, finalized_at: DONE_AT, total_score: 31, total_points: 40, max_score: 40, created_at: DONE_AT };
const STUB = {
  '/api/config': { oauth: {} }, '/api/orders': { orders: [] }, '/api/lectures': { lectures: [] }, '/api/lectures/public': { lectures: [] },
  '/api/lectures/summary': { ready: 4, total: 30, as_of: '2026-09-13' }, '/api/studio/attempts': { attempts: [], usage: [], set_uses: 5, retention_days: 90 },
  '/api/studio/sets/downloads/me': { downloads: [] }, '/api/reader/downloads/me': { downloads: [] }, '/api/products': { products: [] },
  '/api/studio/token': { url: 'https://studio.hyunhak.com/?hh=stub', scope: 'studio_school' },
  '/api/trial/reader/catalog': { catalog: CATALOG, hours: 48 }, '/api/trial/reader': { status: 'none', hours: 48 } };
const STUB_BY_STATE = { owner_done: {
  '/api/studio/attempts': { attempts: [ATTEMPT_DONE], usage: [{ entitlement_id: 'ent_school_yh', set_id: 'yonsei_2027_h03', n: 1 }], set_uses: 5, retention_days: 90 },
  '/api/trial/reader': { status: 'active', expires_at: new Date(Date.now() + 40 * 3600e3).toISOString(), hours: 48, catalog: CATALOG } } };
const stubFor = (state, p) => { const s = STUB_BY_STATE[state] || {}; return p in s ? s[p] : (STUB[p] || {}); };
const PAGES = ['index.html', 'studio.html', 'programs/studio.html', 'library.html', 'lectures.html', 'my.html', 'pastexam.html', 'classroom.html'];
const b = await chromium.launch(); const report = {};
for (const state of ['owner', 'owner_done', 'trial', 'guest']) for (const w of [400, 1280]) {
  const ctx = await b.newContext(w === 400 ? { ...devices['Pixel 7'], viewport: { width: 400, height: 860 } } : { viewport: { width: 1280, height: 900 } });
  const tokenCalls = [];
  for (const host of ['http://localhost:8799/**', 'https://api.hyunhak.com/**']) await ctx.route(host, (route) => {
    const req = route.request(); const p = new URL(req.url()).pathname;
    const cors = { 'access-control-allow-origin': req.headers()['origin'] || 'http://localhost:8811', 'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (p === '/api/auth/me') return state !== 'guest' ? route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(ME[state]) })
      : route.fulfill({ status: 401, contentType: 'application/json', headers: cors, body: '{"error":"unauthorized"}' });
    if (p === '/api/studio/token') tokenCalls.push(req.postData());
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(stubFor(state, p)) });
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
      const de = document.documentElement, q = (s) => Array.from(document.querySelectorAll(s)), tx = (el, n) => el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null;
      const ownedEl = document.querySelector('[data-owned]');
      const own = ownedEl && !ownedEl.hidden ? ownedEl.innerText.replace(/\s+/g, ' ').slice(0, 400) : null;
      const cards = q('article[data-r3-unit]').map((c) => ({ unit: c.dataset.r3Unit, applied: !!c.dataset.ownedApplied, badge: (c.querySelector('.r3-unit-badge') || {}).textContent,
        foot: Array.from(c.querySelectorAll('.foot a,.foot button')).map((x) => x.textContent.trim()) }));
      const tg = document.getElementById('trialGo'), fg = document.querySelector('[data-first-guide]');
      return { ox: de.scrollWidth - de.clientWidth, height: de.scrollHeight, coarse: matchMedia('(pointer:coarse)').matches, own, cards,
        trialGo: tg ? (tg.hidden ? '(hidden)' : tg.textContent.trim()) : null, libOwn: q('.liblist .lf.own').length,
        libOwnTag: q('.liblist .lf.own .own-tag').map((x) => x.textContent).slice(0, 3), passList: (document.getElementById('passList') || { innerText: '' }).innerText.replace(/\s+/g, ' ').slice(0, 300),
        tapSmall: q('[data-owned-go],.owned .btn,.owned .tlink').filter((x) => { const r = x.getBoundingClientRect(); return r.height && r.height < 24; }).length,
        // s2 프로브: 첫 사용 안내, owned-note, 읽는 자료 문구, 체험판 상태문, 응시 기록 행의 해설 강의 링크 수, 신설 FAQ dt 수
        guide: fg ? { hidden: fg.hidden, text: tx(fg, 600) } : null,
        ownedNote: tx(document.querySelector('.owned-note'), 400),
        ro: q('[data-readonly-note]').map((x) => tx(x, 300)),
        stateText: tx(document.getElementById('stateText'), 300),
        lecLinks: q('#stuRows a[href^="lecture.html?set="]').length,
        faqNew: q('dt').filter((d) => d.textContent.indexOf('어디서 시작') >= 0).length };
    });
    await pg.screenshot({ path: `${out}/${key}.png`, fullPage: true });
    // 응시하러 가기 실클릭: 회원 상태에서 첫 버튼. 휴대폰(coarse) 은 같은 탭 이동, 데스크톱은 새 창.
    // ★ fullPage 스크린샷 뒤에는 Chromium 터치 에뮬레이션이 풀려 (pointer:coarse) 가 false 로 바뀐다 (2026-09-13 실측). 클릭은 새 페이지에서 한다
    let click = null;
    if (state !== 'guest') {
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
    if (state === 'guest') await pg.close();
  }
  await ctx.close();
}

// ── 스튜디오 앱 렌더 (interview-studio/web/index.html, S-6 문안): :8812 정적 서빙 + /api/* route 스텁 ──
//   /api/me = 브리지 회원 {sub_bound:true, nick, scope}, /api/sets = 응시 입장은 sets/ 의 세트 2건(student_view 근사 = explanation 제거), history 입장은 서버와 같게 빈 배열, /api/univs = [] (앱이 for..of 로 돈다), 그 외 {}
const WEB = path.join(STUDIO, 'web');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); if (u === '/') u = '/index.html';
  const f = path.join(WEB, u);
  if (!f.startsWith(WEB + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(8812, '127.0.0.1', r));
const APP = 'http://127.0.0.1:8812';
const SETS = ['korea_2027_h03', 'korea_2027_h01'].map((id) => { const s = JSON.parse(fs.readFileSync(path.join(STUDIO, 'sets', id + '.json'), 'utf8')); delete s.explanation; return s; });
for (const scope of ['', 'history']) for (const w of [400, 1280]) {
  const ctx = await b.newContext(w === 400 ? { ...devices['Pixel 7'], viewport: { width: 400, height: 860 } } : { viewport: { width: 1280, height: 900 } });
  await ctx.route(APP + '/api/**', (route) => {
    const p = new URL(route.request().url()).pathname;
    const body = p === '/api/me' ? { sub_bound: true, nick: '검수용', scope } : p === '/api/sets' ? (scope === 'history' ? [] : SETS) : p === '/api/univs' ? [] : {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const key = `app_${scope || 'exam'}_${w}`;
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  await pg.goto(APP + '/', { waitUntil: 'networkidle' }).catch((e) => errs.push('nav ' + e));
  await pg.waitForTimeout(1200);
  const m = await pg.evaluate(() => {
    const de = document.documentElement, q = (s) => Array.from(document.querySelectorAll(s)), tx = (el, n) => el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null;
    const act = document.querySelector('.screen.active');
    return { ox: de.scrollWidth - de.clientWidth, height: de.scrollHeight, active: act ? act.id : null, setcards: q('.setcard').length, notices: q('.notice').length,
      firstUse: tx(document.getElementById('firstUseNote'), 600), h1: tx(document.querySelector('#scr-home h1'), 200),
      retry: (document.getElementById('btn-retry') || { textContent: null }).textContent, exit: (document.getElementById('btn-exit') || { textContent: null }).textContent };
  });
  await pg.screenshot({ path: `${out}/${key}.png`, fullPage: true });
  await pg.close();
  // 첫 세트 카드 클릭 뒤 scr-brief 활성 여부. 클릭은 새 페이지에서 (fullPage 뒤 터치 에뮬 소실). history 입장은 홈이 가려져 카드가 안 보이면 null
  let briefActive = null;
  const pg2 = await ctx.newPage(); await pg2.goto(APP + '/', { waitUntil: 'networkidle' }).catch(() => {}); await pg2.waitForTimeout(800);
  const card = await pg2.$('.setcard');
  if (card && await card.isVisible()) { await card.click(); await pg2.waitForTimeout(400); briefActive = await pg2.evaluate(() => document.getElementById('scr-brief').classList.contains('active')); }
  await pg2.close();
  report[key] = { ...m, errs, briefActive };
  await ctx.close();
}
srv.close();
await b.close();
fs.writeFileSync(REPORT, JSON.stringify(report, null, 1));
console.log('report', REPORT);
for (const [k, v] of Object.entries(report)) console.log(k, JSON.stringify({ ox: v.ox, errs: v.errs, coarse: v.coarse, own: v.own && v.own.slice(0, 160), trialGo: v.trialGo, libOwn: v.libOwn, tapSmall: v.tapSmall,
  guide: v.guide && { hidden: v.guide.hidden, text: v.guide.text.slice(0, 120) }, ownedNote: v.ownedNote && v.ownedNote.slice(0, 120), ro: v.ro && v.ro.length, stateText: v.stateText, lecLinks: v.lecLinks, faqNew: v.faqNew,
  firstUse: v.firstUse && v.firstUse.slice(0, 120), h1: v.h1, retry: v.retry, briefActive: v.briefActive,
  cards: (v.cards || []).filter((c) => c.applied).map((c) => c.unit + '|' + c.badge + '|' + c.foot.join('/')), click: v.click }));
