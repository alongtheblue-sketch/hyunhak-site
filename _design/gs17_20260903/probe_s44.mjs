// s44 P2 묶음 사전·사후 계측. node probe_s44.mjs <base_url> <label>
//  (a) 가이드북 mono 한글 공백: JetBrains Mono 로 계산된 텍스트 노드 중 한글 8자 이상. 공백 폭(Range) 대 Pretendard 같은 크기 공백 폭.
//  (b) 가이드북 .price>li 죽은 하단(px, 카드 높이 비율)
//  (c) 스튜디오 1440 그리드 빈 열: .hero .wrap, #p1 .body, #p5 .body 직계 자식 트랙 폭 대 잉크 폭
//  (d) 가이드북 h 도약 수  (e) .bk .mt font-size, skip 링크, 390 고정 요소  (f) 390 .grid 마지막 행 타일 수
//  (g) 스크립트 차단 시 v2 면 .rv 비가시 수
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const [baseArg, label = 'probe'] = process.argv.slice(2);
const base = baseArg.endsWith('/') ? baseArg : baseArg + '/';
const b = await chromium.launch({ channel: 'chrome' });
const out = { label, base, ts: new Date().toISOString() };
async function open(ctx, path, w, h = 900) {
  const pg = await ctx.newPage(); await pg.setViewportSize({ width: w, height: h });
  await pg.goto(base + path, { waitUntil: 'load', timeout: 30000 });
  await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}' }).catch(() => {});
  await pg.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 8000))])).catch(() => {});
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(500);
  return pg;
}
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
{
  const pg = await open(ctx, 'programs/guidebook.html', 1440);
  out.gb1440 = await pg.evaluate(() => {
    const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '');
    const hidden = el => { for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return true; } return false; };
    // (a)
    const tmp = document.createElement('span'); tmp.style.cssText = "position:absolute;left:-9999px;top:0;font-family:'Pretendard Variable','Pretendard',sans-serif;white-space:pre"; tmp.textContent = ' '; document.body.appendChild(tmp);
    const sansSpace = fs => { tmp.style.fontSize = fs + 'px'; return tmp.getBoundingClientRect().width; };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const nodes = []; let n; const bySel = {};
    while ((n = walker.nextNode())) {
      const el = n.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || hidden(el)) continue;
      const fam = getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '');
      if (!/JetBrains/.test(fam)) continue;
      const ko = (n.data.match(/[가-힣]/g) || []).length; if (ko < 8) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const si = n.data.indexOf(' '); let sp = null;
      if (si >= 0) { const r = document.createRange(); r.setStart(n, si); r.setEnd(n, si + 1); sp = r.getBoundingClientRect().width; }
      const ss = sansSpace(fs);
      const s = sel(el); bySel[s] = (bySel[s] || 0) + 1;
      nodes.push({ sel: s, ko, fs, space: sp && +sp.toFixed(2), sansSpace: +ss.toFixed(2), ratio: sp ? +(sp / ss).toFixed(2) : null, text: n.data.replace(/\s+/g, ' ').trim().slice(0, 40) });
    }
    tmp.remove();
    const ratios = nodes.map(x => x.ratio).filter(Boolean);
    // (b)
    const cards = [...document.querySelectorAll('.price > li')].map(li => { const r = li.getBoundingClientRect(); const cs = getComputedStyle(li); const kids = [...li.children]; const last = kids[kids.length - 1]; const lb = last ? last.getBoundingClientRect().bottom : r.top; const dead = r.bottom - parseFloat(cs.paddingBottom) - lb; return { h: Math.round(r.height), dead: Math.round(dead), deadPct: +(dead / r.height * 100).toFixed(1), kids: kids.length }; });
    // (d)
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]; const jumps = [];
    for (let i = 1; i < heads.length; i++) { const a = +heads[i - 1].tagName[1], c = +heads[i].tagName[1]; if (c > a + 1) jumps.push(`h${a}→h${c} "${heads[i].textContent.trim().slice(0, 20)}"`); }
    const counts = {}; for (const h of heads) counts[h.tagName.toLowerCase()] = (counts[h.tagName.toLowerCase()] || 0) + 1;
    // (e)
    const mt = document.querySelector('.bk .mt'); const mtFs = mt ? parseFloat(getComputedStyle(mt).fontSize) : null;
    const skip = !!document.querySelector('a.skip');
    const tl = document.querySelector('.tolist a'); const tlInfo = tl ? { cls: tl.className, h: Math.round(tl.getBoundingClientRect().height), bg: getComputedStyle(tl).backgroundColor, border: getComputedStyle(tl).borderBottom } : null;
    return { monoKo: { nodes: nodes.length, koChars: nodes.reduce((s, x) => s + x.ko, 0), maxRatio: Math.max(0, ...ratios), minRatio: Math.min(9, ...ratios), bySel, sample: nodes.slice(0, 6) }, priceCards: cards, headingJumps: jumps, headingCounts: counts, mtFontSize: mtFs, skipLink: skip, tolist: tlInfo };
  });
  await pg.close();
  const pg2 = await open(ctx, 'programs/guidebook.html', 390, 844);
  out.gb390 = await pg2.evaluate(() => {
    const fixed = [...document.querySelectorAll('body *')].filter(el => /fixed|sticky/.test(getComputedStyle(el).position) && getComputedStyle(el).display !== 'none').map(el => el.tagName.toLowerCase() + '.' + el.className);
    const tiles = [...document.querySelectorAll('.grid > *')]; const tops = tiles.map(t => Math.round(t.getBoundingClientRect().top + scrollY)); const maxTop = Math.max(...tops); const lastRow = tops.filter(t => t === maxTop).length; const cols = new Set(tiles.map(t => Math.round(t.getBoundingClientRect().left))).size;
    const cards = [...document.querySelectorAll('.price > li')].map(li => { const r = li.getBoundingClientRect(); const cs = getComputedStyle(li); const kids = [...li.children]; const last = kids[kids.length - 1]; const dead = r.bottom - parseFloat(cs.paddingBottom) - (last ? last.getBoundingClientRect().bottom : r.top); return { h: Math.round(r.height), dead: Math.round(dead) }; });
    return { fixedSticky: fixed, gridTiles: tiles.length, gridCols: cols, lastRowTiles: lastRow, priceCards: cards, docH: document.documentElement.scrollHeight };
  });
  await pg2.close();
}
{
  const pg = await open(ctx, 'programs/studio.html', 1440);
  out.st1440 = await pg.evaluate(() => {
    const ink = el => { let l = 1e9, r = -1e9, cnt = 0; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
      while ((n = w.nextNode())) { let rects = []; if (n.nodeType === 3) { if (!n.data.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); rects = [...rg.getClientRects()]; } else if (/^(IMG|SVG|VIDEO)$/.test(n.tagName) || getComputedStyle(n).backgroundImage !== 'none' || getComputedStyle(n).borderTopWidth !== '0px') { rects = [n.getBoundingClientRect()]; } for (const x of rects) { if (x.width === 0) continue; l = Math.min(l, x.left); r = Math.max(r, x.right); cnt++; } }
      return cnt ? { left: Math.round(l), right: Math.round(r), w: Math.round(r - l) } : null; };
    const res = {};
    for (const q of ['.hero .wrap', '#p1 .body', '#p2 .body', '#p3 .body', '#p4 .body', '#p5 .body', '#p1 .head', '#p5 .head']) {
      const g = document.querySelector(q); if (!g) { res[q] = null; continue; }
      const tracks = getComputedStyle(g).gridTemplateColumns.split(' ').map(parseFloat);
      res[q] = { tracks: tracks.map(Math.round), kids: [...g.children].map(k => { const r = k.getBoundingClientRect(); const i = ink(k); return { sel: k.tagName.toLowerCase() + '.' + [...k.classList].slice(0, 2).join('.'), boxW: Math.round(r.width), inkW: i ? i.w : 0, emptyPx: i ? Math.round(r.width - i.w) : Math.round(r.width) }; }) };
    }
    const skip = !!document.querySelector('a.skip');
    const won = [...document.querySelectorAll('#units .unit .won')].length;
    const nm = document.querySelector('.buybar .nm'); const nmDeco = nm ? getComputedStyle(nm).textDecorationColor : null;
    const pivot = document.querySelector('.rail.anchor li.pivot .go'); const others = [...document.querySelectorAll('.rail.anchor li:not(.pivot):not(.core) .go')];
    const goLeft = { pivot: pivot ? Math.round(pivot.getBoundingClientRect().left - pivot.closest('li').getBoundingClientRect().left) : null, others: others.map(o => Math.round(o.getBoundingClientRect().left - o.closest('li').getBoundingClientRect().left)) };
    return { grids: res, skipLink: skip, unitWonCount: won, buybarNmDecoColor: nmDeco, goLeftOffset: goLeft };
  });
  await pg.close();
}
await ctx.close();
{
  const nctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const pages = ['about.html', 'b2b.html', 'faq.html', 'library.html', 'notice.html', 'privacy.html', 'support.html', 'terms.html', 'guidebook/index.html', 'guidebook/ewha.html', 'programs/studio.html', 'programs/guidebook.html'];
  out.nojs = {};
  for (const p of pages) {
    const pg = await nctx.newPage(); let err = null;
    try { await pg.goto(base + p, { waitUntil: 'load', timeout: 30000 }); } catch (e) { err = String(e).slice(0, 60); }
    out.nojs[p] = err ? { err } : await pg.evaluate(() => { const all = [...document.querySelectorAll('.rv')]; return { rv: all.length, hidden: all.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.5).length }; });
    await pg.close();
  }
  await nctx.close();
}
await b.close();
writeFileSync(`/Users/gregory/Workspace/hyunhak-site/_design/gs17_20260903/probe_s44_${label}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
