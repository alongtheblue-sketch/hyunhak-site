// v3 반응형 실측 (PLAN s30 Task 5 게이트). Playwright channel chrome.
//   node _tools/measure_v3.mjs <shots_dir> <base_url> <width> <path...>
// 판정 4종을 한 번에 잰다 (감사 AUDIT.md D1~D5 의 재발 방지):
//   1 document.documentElement.scrollWidth <= innerWidth
//   2 getBoundingClientRect().right > innerWidth + 1 인 보이는 요소 0 (overflow:hidden 이 가린 이탈까지 잡는다)
//   3 좌우 잉크 여백 대칭 (텍스트 노드와 그림의 최좌 잉크 vs 최우 잉크) 1px 이내
//   4 높이 또는 폭이 44px 미만인 인터랙티브 요소, 그리고 렌더된 font-size 종수 (타입 사다리 실측)
// my.html 과 lecture.html 회원 목록은 로그인 세션이 필요하므로 API 응답을 스텁한다 (레이아웃 측정 목적, 값은 가짜).
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const [out, base, w, ...paths] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, deviceScaleFactor: 1 });
const STUB = {
  me: { member: { id: 'm_test', email: 'test@example.com', name: '측정 계정', member_type: 'student', has_password: true, marketing_opt_in: false }, trial_available: true,
    entitlements: [
      { kind: 'studio_school', meta: JSON.stringify({ sku: 'pass-korea-hum', title: '고려대 인문 전권 이용권' }), uses_left: null, expires_at: null },
      { kind: 'lecture', meta: JSON.stringify({ unit_code: 'korea-hum' }), uses_left: null, expires_at: '2027-09-02T00:00:00.000Z' },
      { kind: 'studio_passage', meta: JSON.stringify({ sku: 'passage-single', title: '지문 낱권, 이름은 누구의 것인가', set_id: 'yonsei_2027_h03' }), uses_left: 5, expires_at: null },
      { kind: 'lecture', meta: JSON.stringify({ set_id: 'yonsei_2027_h03' }), uses_left: null, expires_at: '2027-09-02T00:00:00.000Z' },
      { kind: 'download', meta: JSON.stringify({ slug: 'korea', title: '고려대학교 2027 서류기반면접 가이드북' }), uses_left: null, expires_at: '2026-10-02T00:00:00.000Z' },
    ] },
  lectures: { lectures: [
    { id: 'lec_c1', kind: 'common', unit_code: null, passage_set_id: null, seq: 1, title: '제시문 면접의 규격과 채점', subtitle: '공통', duration_sec: 1264, status: 'ready', entitled: true, progress: { view_count: 2, position_sec: 300, completed: false } },
    { id: 'lec_u1', kind: 'unit', unit_code: 'korea-hum', passage_set_id: null, seq: 1, title: '고려대 인문 계열적합 면접 개관', subtitle: null, duration_sec: 900, status: 'ready', entitled: true, progress: null },
    { id: 'lec_p1', kind: 'passage', unit_code: 'korea-hum', passage_set_id: 'korea_2027_h01', seq: 1, title: '기억은 어떻게 기록이 되는가, 해설', subtitle: null, duration_sec: 1100, status: 'ready', entitled: true, progress: null },
    { id: 'lec_p2', kind: 'passage', unit_code: 'korea-hum', passage_set_id: 'korea_2027_h02', seq: 2, title: '이름은 누구의 것인가, 해설', subtitle: null, duration_sec: null, status: 'empty', entitled: true, progress: null },
    { id: 'lec_y1', kind: 'passage', unit_code: 'yonsei-hum', passage_set_id: 'yonsei_2027_h03', seq: 3, title: '연세 인문 3번 세트 해설', subtitle: null, duration_sec: 980, status: 'ready', entitled: false, progress: null },
  ] },
};
for (const p of paths) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  if (/^(my|lecture)\.html/.test(p)) {
    await pg.route(/\/api\/auth\/me$/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STUB.me) }));
    await pg.route(/\/api\/orders$/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orders: [] }) }));
    await pg.route(/\/api\/b2b\/consents$/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ consents: [] }) }));
    if (p === 'lecture.html') await pg.route(/\/api\/lectures$/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STUB.lectures) }));
  }
  await pg.goto(base + p, { waitUntil: 'networkidle' }).catch(e => errs.push('nav ' + e));
  await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}' }).catch(() => {});
  await pg.evaluate(() => document.fonts.ready).catch(() => {});
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(700);
  const m = await pg.evaluate(() => {
    const de = document.documentElement, W = innerWidth;
    const hidden = (el) => { const cs = getComputedStyle(el); return cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0'; };
    const skip = (el) => !el || el.closest('.skip,.sr,script,style,noscript,template,[hidden]');
    // 이탈 요소 2분류: over = 실제 이탈 (조상에 overflow 클립/스크롤 없음, .sheet 는 감사 D2 의 은폐 사례라 클립으로 안 친다),
    // clipped = 설계된 클립 또는 가로 스크롤 안 (장식 bleed, 탭 스트립). 게이트는 over 로만 서고 clipped 는 따로 보고한다.
    const over = [], clipped = [];
    const clipAncestor = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { if (a.classList.contains('sheet')) continue; const ox = getComputedStyle(a).overflowX; if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') return a; } return null; };
    for (const el of document.querySelectorAll('body *')) {
      if (skip(el) || el.matches('.skip,.sr') || hidden(el)) continue;
      const r = el.getBoundingClientRect(); if (r.width === 0 && r.height === 0) continue;
      if (r.right > W + 1) {
        const a = clipAncestor(el);
        const rec = { tag: el.tagName, cls: String(el.className).slice(0, 28), right: Math.round(r.right * 10) / 10 };
        if (a) { rec.clip = a.tagName + '.' + String(a.className).slice(0, 20); clipped.push(rec); } else over.push(rec);
      }
    }
    const rightmost = [];
    let minL = Infinity, maxR = -Infinity, lEl = '', rEl = '';
    const consider = (r, el) => { if (r.width <= 0 || clipAncestor(el)) return; if (r.left < minL) { minL = r.left; lEl = el.tagName + '.' + String(el.className).slice(0, 18); } if (r.right > maxR) { maxR = r.right; rEl = el.tagName + '.' + String(el.className).slice(0, 18); } };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange(); let n;
    const sizes = new Set();
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement; if (skip(el) || hidden(el) || el.closest('.fix,.hh-popup')) continue;
      sizes.add(parseFloat(getComputedStyle(el).fontSize));
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) consider(r, el);
    }
    for (const el of document.querySelectorAll('img,svg,video,input,button,.search,.btn')) {
      if (skip(el) || hidden(el) || el.closest('.fix,.hh-popup')) continue;
      consider(el.getBoundingClientRect(), el);
    }
    const small = [];
    for (const el of document.querySelectorAll('a[href],button,input,select,textarea,summary')) {
      let r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (skip(el) || hidden(el)) continue;
      if (el.matches('input[type=checkbox],input[type=radio]')) { const host = el.closest('label') || el.closest('.check'); if (host) r = host.getBoundingClientRect(); }
      if (r.height < 44 || r.width < 44) small.push((el.textContent || el.tagName).trim().slice(0, 16) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    const h1 = document.querySelector('h1'); const h1cs = h1 ? getComputedStyle(h1) : null;
    const duo = document.querySelector('#p1 .duo');
    const duoY = duo ? Math.round(duo.getBoundingClientRect().top + scrollY) : null;
    return { scrollWidth: de.scrollWidth, W, ok1: de.scrollWidth <= W, overN: over.length, over: over.slice(0, 6), clipN: clipped.length, clipped: clipped.slice(0, 4),
      inkL: Math.round(minL * 10) / 10, inkR: Math.round((W - maxR) * 10) / 10, lEl, rEl,
      sizes: [...sizes].sort((a, b) => a - b), smallN: small.length, small: small.slice(0, 8),
      h1: h1cs ? h1cs.fontSize + ' ' + h1cs.fontWeight + ' ' + h1cs.fontFamily.split(',')[0] : null, duoY, height: de.scrollHeight,
      dots: (document.body.innerText.match(/[·—]/g) || []).length };
  });
  const name = p.replace(/\.html.*$/, '').replace(/\//g, '_');
  await pg.screenshot({ path: `${out}/live_${name}_${w}.png`, fullPage: true });
  // 판정에 작은 대상, 금지 문자, JS 오류를 포함한다. 재던 값을 PASS 가 무시하면 게이트가 아니다 (Codex r1 #17)
  const pass = m.ok1 && m.overN === 0 && Math.abs(m.inkL - m.inkR) <= 1 && m.smallN === 0 && m.dots === 0 && errs.length === 0;
  console.log(JSON.stringify({ p, w: +w, pass, ...m, errors: errs }));
  await pg.close();
}
await b.close();
