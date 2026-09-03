// GS-17 기계 항목(S2 S3 G2 G3 A2) 사본 빌드 실측기. 게이트(gate_gs17.mjs)의 측정식을 그대로 옮기고, G3 는 span 분리 뒤 요소 기준 측정을 덧붙인다.
//   node verify_mech.mjs --studio <html> --guidebook <html> --out <dir> --label <before|after> [--shot]
//   file:// 로 연다. 출력 <out>/<label>.json (+ --shot 이면 <out>/<label>_price_1440.png, <out>/<label>_hero_<w>.png)
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const STUDIO = arg('--studio'), GUIDE = arg('--guidebook'), OUT = arg('--out'), LABEL = arg('--label', 'x'), SHOT = process.argv.includes('--shot');
if (!STUDIO || !GUIDE || !OUT) { console.error('usage: --studio <html> --guidebook <html> --out <dir> --label <l>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const HELPERS = `window.__g = {
  hidden(el){ for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return true; } return false; },
  sel(el){ return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : ''); },
  txt(el, n = 40){ return (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, n); },
  own(el){ let s = ''; for (const c of el.childNodes) if (c.nodeType === 3) s += c.data; return s.replace(/\\s+/g, ' ').trim(); },
};`;

const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
async function open(file, width, height = 900) {
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width, height });
  await pg.goto('file://' + file, { waitUntil: 'load', timeout: 60000 });
  await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await pg.addScriptTag({ content: HELPERS });
  await pg.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 8000))]));
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 20)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(400);
  return pg;
}
const R = { label: LABEL, studio: STUDIO, guidebook: GUIDE, ts: new Date().toISOString() };

// ---------------------------------------------------------------- 스튜디오 (S2 S3 A2)
R.studio_r = {};
for (const w of [1440, 390]) {
  const pg = await open(STUDIO, w, w === 390 ? 844 : 900);
  R.studio_r[w] = await pg.evaluate(() => {
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    const jumps = [];
    for (let i = 1; i < heads.length; i++) { const a = +heads[i - 1].tagName[1], c = +heads[i].tagName[1]; if (c > a + 1) jumps.push(`h${a} "${__g.txt(heads[i - 1], 24)}" → h${c} "${__g.txt(heads[i], 24)}"`); }
    const counts = {}; for (const h of heads) counts[h.tagName.toLowerCase()] = (counts[h.tagName.toLowerCase()] || 0) + 1;
    // S2 시각 불변: 승격 대상 컨테이너 안 표제(h3|h4)의 계산값
    const styles = [];
    for (const c of ['forms', 'aud', 'pr', 'rail', 'flow', 'price', 'unit']) {
      document.querySelectorAll(`.${c} h3, .${c} h4`).forEach((h, i) => {
        if (c === 'price' && h.closest('.unit')) return;
        const cs = getComputedStyle(h); const r = h.getBoundingClientRect();
        styles.push({ c, i, tag: h.tagName, text: __g.txt(h, 20), fontSize: cs.fontSize, fontWeight: cs.fontWeight, family: cs.fontFamily.split(',')[0], lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, textWrap: cs.textWrapStyle || cs.textWrap, color: cs.color, marginBottom: cs.marginBottom, h: +r.height.toFixed(1), w: +r.width.toFixed(1) });
      });
    }
    const tables = [...document.querySelectorAll('table')];
    const ths = [...document.querySelectorAll('th')];
    const s3 = { tables: tables.length, noCap: tables.filter(t => !t.querySelector(':scope > caption')).length, th: ths.length, thNoScope: ths.filter(t => !t.hasAttribute('scope')).length,
      captions: tables.map(t => { const c = t.querySelector(':scope > caption'); if (!c) return null; const cs = getComputedStyle(c); return { table: __g.sel(t), text: c.textContent, fontSize: cs.fontSize, color: cs.color, textAlign: cs.textAlign, side: cs.captionSide, h: +c.getBoundingClientRect().height.toFixed(1) }; }),
      scopes: [...new Set(ths.map(t => __g.sel(t.closest('table')) + ':' + (t.getAttribute('scope') || '-')))].sort() };
    const t = document.body.innerText;
    const biz = document.querySelector('.ft .biz');
    const a2 = { biz: t.includes('사업자등록번호'), mail: t.includes('통신판매업'), bizBlock: !!biz, bizText: biz ? __g.txt(biz, 200) : null, links: biz ? [...biz.querySelectorAll('a')].map(a => a.getAttribute('href') + '|' + __g.txt(a, 12)) : null,
      bizinfo: biz ? (() => { const cs = getComputedStyle(biz.querySelector('.bizinfo')); return { fontStyle: cs.fontStyle, fontSize: cs.fontSize, lineHeight: cs.lineHeight }; })() : null };
    return { s2: { jumps, counts, styles }, s3, a2, docOver: document.documentElement.scrollWidth - innerWidth };
  });
  await pg.close();
}

// ---------------------------------------------------------------- 가이드북 1440 (G3 A2)
{
  const pg = await open(GUIDE, 1440, 900);
  const g3 = await pg.evaluate(() => {
    // 게이트 원식 그대로 (단일 텍스트 노드 Range)
    const re = /\d{1,3}(\s*,\s*\d{3})+/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const out = []; const seen = new Set(); let n;
    while ((n = walker.nextNode())) {
      const m = n.data.match(re); if (!m) continue;
      const el = n.parentElement; if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || __g.hidden(el)) continue;
      const start = m.index, seg = m[0]; const ci = start + seg.indexOf(',');
      let di = ci - 1; while (di > start && /\s/.test(n.data[di])) di--;
      const rng = document.createRange();
      rng.setStart(n, ci); rng.setEnd(n, ci + 1); const cw = rng.getBoundingClientRect().width;
      rng.setStart(n, di); rng.setEnd(n, di + 1); const dw = rng.getBoundingClientRect().width;
      const key = __g.sel(el) + '|' + seg; if (seen.has(key)) continue; seen.add(key);
      const cs = getComputedStyle(el);
      out.push({ sel: __g.sel(el), seg, family: cs.fontFamily.split(',')[0].replace(/['"]/g, ''), fontSize: parseFloat(cs.fontSize), commaW: +cw.toFixed(2), digitW: +dw.toFixed(2), ratio: dw ? +(cw / dw).toFixed(3) : null, wsAroundComma: /\d\s+,|,\s+\d/.test(seg) });
    }
    // 확장식: span.c 로 분리된 쉼표 = span 상자 폭 / 바로 앞 텍스트 노드 마지막 글자(숫자) Range 폭
    const ext = [];
    for (const c of document.querySelectorAll('span.c')) {
      const host = c.parentElement; if (__g.hidden(host)) continue;
      const prev = c.previousSibling; if (!prev || prev.nodeType !== 3 || !/\d$/.test(prev.data)) { ext.push({ sel: __g.sel(host), err: 'prev not digit text' }); continue; }
      const rng = document.createRange(); rng.setStart(prev, prev.data.length - 1); rng.setEnd(prev, prev.data.length);
      const dw = rng.getBoundingClientRect().width; const cr = c.getBoundingClientRect(); const cs = getComputedStyle(host);
      const glyph = document.createRange(); glyph.selectNodeContents(c); const gw = glyph.getBoundingClientRect().width;
      const ccs = getComputedStyle(c);
      ext.push({ sel: __g.sel(host), text: __g.txt(host, 24), family: cs.fontFamily.split(',')[0].replace(/['"]/g, ''), fontSize: parseFloat(cs.fontSize), spanFontSize: parseFloat(ccs.fontSize), spanDisplay: ccs.display, commaBoxW: +cr.width.toFixed(2), commaGlyphW: +gw.toFixed(2), digitW: +dw.toFixed(2), ratio: dw ? +(cr.width / dw).toFixed(3) : null, boxH: +cr.height.toFixed(1), hostH: +host.getBoundingClientRect().height.toFixed(1) });
    }
    const t = document.body.innerText; const biz = document.querySelector('.ft .biz');
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]; const jumps = [];
    for (let i = 1; i < heads.length; i++) { const a = +heads[i - 1].tagName[1], c = +heads[i].tagName[1]; if (c > a + 1) jumps.push(`h${a}→h${c} "${__g.txt(heads[i], 20)}"`); }
    return { gateRows: out, monoLoaded: document.fonts.check('13px "JetBrains Mono"'), ext,
      a2: { biz: t.includes('사업자등록번호'), mail: t.includes('통신판매업'), bizBlock: !!biz, bizText: biz ? __g.txt(biz, 200) : null, links: biz ? [...biz.querySelectorAll('a')].map(a => a.getAttribute('href') + '|' + __g.txt(a, 12)) : null },
      headingJumps: jumps.length, docOver: document.documentElement.scrollWidth - innerWidth,
      titleHasSpan: /class="c"/.test(document.querySelector('title')?.innerHTML || ''), headHasSpan: /class="c"/.test(document.head.innerHTML), altHasSpan: [...document.images].some(i => /class="c"/.test(i.alt)) };
  });
  const monoRows = g3.gateRows.filter(o => /Mono/i.test(o.family) && o.ratio != null);
  const maxGate = monoRows.length ? Math.max(...monoRows.map(o => o.ratio)) : null;
  const extMono = g3.ext.filter(o => /Mono/i.test(o.family || '') && o.ratio != null);
  R.guidebook_1440 = { g3_gate_formula: { monoRows: monoRows.length, maxCommaDigitRatio: maxGate, rows: monoRows, nonMono: g3.gateRows.filter(o => !/Mono/i.test(o.family)).length, monoLoaded: g3.monoLoaded },
    g3_element_formula: { spans: g3.ext.length, monoSpans: extMono.length, maxRatio: extMono.length ? Math.max(...extMono.map(o => o.ratio)) : null, minRatio: extMono.length ? Math.min(...extMono.map(o => o.ratio)) : null,
      cascadeOk: g3.ext.every(o => o.spanDisplay === 'inline-block' && o.spanFontSize === o.fontSize), rows: g3.ext },
    a2: g3.a2, headingJumps: g3.headingJumps, docOver: g3.docOver, contamination: { title: g3.titleHasSpan, head: g3.headHasSpan, alt: g3.altHasSpan } };
  if (SHOT) {
    const el = pg.locator('.price').first(); await el.scrollIntoViewIfNeeded(); await pg.waitForTimeout(900);
    await el.screenshot({ path: `${OUT}/${LABEL}_price_1440.png` });
    const f = pg.locator('.facts').first(); await f.scrollIntoViewIfNeeded(); await pg.waitForTimeout(600);
    await f.screenshot({ path: `${OUT}/${LABEL}_facts_1440.png` });
  }
  await pg.close();
}

// ---------------------------------------------------------------- 가이드북 G2 (폭별)
{
  const per = [];
  for (const w of [901, 940, 960, 1000, 1024, 1030, 1050, 1079, 1088, 1100, 1101, 1440]) {
    const pg = await open(GUIDE, w, 900);
    const r = await pg.evaluate(() => {
      const fans = [...document.querySelectorAll('.hero .fan')].map(img => { const bb = img.getBoundingClientRect(); const cs = getComputedStyle(img); return { cls: img.className.replace('fan ', ''), left: +bb.left.toFixed(1), right: +bb.right.toFixed(1), display: cs.display, over: cs.display !== 'none' && bb.right > innerWidth }; });
      const hero = document.querySelector('.hero'); const f2 = fans[2]; const O = (f2.left + f2.right) / 2;
      const say = document.querySelector('.hero .say').getBoundingClientRect();
      return { W: innerWidth, f0left: fans[0].left, f4right: fans[4].right, overCount: fans.filter(x => x.over).length, heroOver: hero.scrollWidth - hero.clientWidth, docOver: document.documentElement.scrollWidth - innerWidth,
        symL: +(O - fans[0].left).toFixed(1), symR: +(fans[4].right - O).toFixed(1), sayRight: +say.right.toFixed(1), rights: fans.map(x => x.display === 'none' ? 'hidden' : x.right) };
    });
    per.push(r);
    if (SHOT && (w === 901 || w === 1024 || w === 1440)) await pg.locator('.hero').screenshot({ path: `${OUT}/${LABEL}_hero_${w}.png` });
    await pg.close();
  }
  R.g2 = { overTotal: per.reduce((s, r) => s + r.overCount, 0), gateWidthsOver: per.filter(r => [901, 960, 1000, 1024, 1030].includes(r.W)).reduce((s, r) => s + r.overCount, 0), perWidth: per };
}
await b.close();
writeFileSync(`${OUT}/${LABEL}.json`, JSON.stringify(R, null, 1));

// 요약 출력
const s = R.studio_r[1440];
console.log(`[${LABEL}] S2 jumps=${s.s2.jumps.length} counts=${JSON.stringify(s.s2.counts)} | S3 tables=${s.s3.tables} noCap=${s.s3.noCap} th=${s.s3.th} thNoScope=${s.s3.thNoScope} | A2 studio biz=${s.a2.biz}&${s.a2.mail} block=${s.a2.bizBlock} links=${JSON.stringify(s.a2.links)} | docOver ${s.docOver}/${R.studio_r[390].docOver}`);
const g = R.guidebook_1440;
console.log(`[${LABEL}] G3 gate-formula monoRows=${g.g3_gate_formula.monoRows} max=${g.g3_gate_formula.maxCommaDigitRatio} | element-formula spans=${g.g3_element_formula.spans} mono=${g.g3_element_formula.monoSpans} max=${g.g3_element_formula.maxRatio} min=${g.g3_element_formula.minRatio} cascadeOk=${g.g3_element_formula.cascadeOk} | contamination ${JSON.stringify(g.contamination)} | A2 guide biz=${g.a2.biz}&${g.a2.mail} block=${g.a2.bizBlock} links=${JSON.stringify(g.a2.links)} | jumps ${g.headingJumps} docOver ${g.docOver}`);
console.log(`[${LABEL}] G2 overTotal=${R.g2.overTotal} (gate 5폭 ${R.g2.gateWidthsOver})`);
for (const r of R.g2.perWidth) console.log(`  ${r.W}\tf0.left=${r.f0left}\tf4.right=${r.f4right}\tmargin=${(r.W - r.f4right).toFixed(1)}\theroOver=${r.heroOver}\tdocOver=${r.docOver}\tsym=${r.symL}/${r.symR}\tsay.right=${r.sayRight}\trights=${r.rights.join(',')}`);
