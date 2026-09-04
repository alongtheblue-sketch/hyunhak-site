// 가이드북 목록 카드 실측 (B 완료기준 ④). 카드 31장 전수 + 3 뷰포트.
//   python3 -m http.server 8871 --bind 127.0.0.1  후  node _tools/measure_gbcard.mjs [page] [port]
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const PAGE = process.argv[2] || 'guidebook/index.html';
const PORT = process.argv[3] || '8871';
const VIEWS = [[1280, 'desktop'], [1024, 'tablet'], [390, 'mobile']];

const b = await chromium.launch();
const out = { page: PAGE, views: {} };
for (const [w, label] of VIEWS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.route('https://api.hyunhak.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await pg.goto(`http://localhost:${PORT}/${PAGE}`, { waitUntil: 'networkidle' });
  await pg.waitForSelector('.gb', { timeout: 8000 });
  await pg.waitForTimeout(300);
  const m = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.gb')];
    const rows = cards.map((c) => {
      const h = c.querySelector('h3');
      const cs = getComputedStyle(h);
      const px = parseFloat(cs.fontSize);
      // 학교명 본문(small 캠퍼스 표기 제외)의 실제 줄 수와 폭
      const main = [...h.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim())[0];
      let lines = 0, tw = 0;
      if (main) {
        const r = document.createRange(); r.selectNodeContents(main);
        const rects = [...r.getClientRects()];
        lines = rects.length;
        tw = Math.max(...rects.map((x) => x.width));
      }
      const hb = h.getBoundingClientRect();
      return { id: c.id, name: (main ? main.textContent.trim() : ''),
               h3w: +hb.width.toFixed(1), h3em: +(hb.width / px).toFixed(2),
               lines, textW: +tw.toFixed(1), cardH: +c.getBoundingClientRect().height.toFixed(1),
               cardW: +c.getBoundingClientRect().width.toFixed(1) };
    });
    const de = document.documentElement;
    // 카드 조상 기준 가로 넘침 (body overflow-x hidden 아래 무검출 차단)
    const spill = cards.filter((c) => {
      const cr = c.getBoundingClientRect();
      return [...c.querySelectorAll('*')].some((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && (r.right - cr.right > 1 || cr.left - r.left > 1);
      });
    }).map((c) => c.id);
    return { n: cards.length, rows, spill, overflowX: de.scrollWidth - de.clientWidth,
             cols: getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ').length };
  });
  out.views[label] = { width: w, ...m, pageerrors: errs };
  await ctx.close();
}
await b.close();

// 요약
for (const [k, v] of Object.entries(out.views)) {
  const bad = v.rows.filter((r) => r.lines > 2 || r.h3em < 6);
  const worst = [...v.rows].sort((a, b2) => b2.lines - a.lines || a.h3em - b2.h3em)[0];
  console.log(`[${k} ${v.width}px] 카드 ${v.n} · 열 ${v.cols} · 넘침 ${v.spill.length} · 가로스크롤 ${v.overflowX}px`);
  console.log(`   h3 폭 최소 ${Math.min(...v.rows.map(r=>r.h3em)).toFixed(2)}em · 줄수 최대 ${Math.max(...v.rows.map(r=>r.lines))} · 기준미달 ${bad.length}/${v.n}`);
  console.log(`   최악 = ${worst.name} : ${worst.h3em}em, ${worst.lines}줄, 글자폭 ${worst.textW}px`);
  if (v.pageerrors.length) console.log('   pageerror', v.pageerrors);
}
