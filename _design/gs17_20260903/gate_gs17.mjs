// GS-17 12항목 기준선 게이트 (design-critic P2 묶음, 건우 선정 12항목).
//   node gate_gs17.mjs <base_url> [label]
//   base_url 예: http://127.0.0.1:8933/   (서버 기동·종료는 run_gate.sh 가 PID 파일로 맡는다)
// 출력: JSON 한 덩어리 {label, base, items:[{id, metric, value, target, pass, detail}], ts_note}
//   stdout 과 ./baseline_<label>.json 에 동일 내용 저장.
// 뷰포트 규약: S1 은 390x844, G2 는 901/960/1000/1024/1030, A1 은 390 과 1440, 나머지는 1440x900.
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import { g4Eval, g4One, G4_TARGET, G4_METRIC } from './g4_rule.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const [baseArg, labelArg] = process.argv.slice(2);
if (!baseArg) { console.error('usage: node gate_gs17.mjs <base_url> [label]'); process.exit(2); }
const base = baseArg.endsWith('/') ? baseArg : baseArg + '/';
const label = labelArg || 'before';
// 대조군용 면 URL 덮어쓰기: GS17_PAGE_URLS='{"programs/studio.html":"file:///...자족본.html"}' 이면 그 면만 그 URL 로 연다(측정식은 동일).
const PAGE_URLS = (() => { try { return JSON.parse(process.env.GS17_PAGE_URLS || '{}'); } catch { return {}; } })();
const OUT_DIR = '/Users/gregory/Workspace/hyunhak-site/_design/gs17_20260903';
mkdirSync(OUT_DIR, { recursive: true });

// 페이지 안 공용 도우미. addScriptTag 로 주입한다. 템플릿 문자열이라 정규식 역슬래시는 두 번.
const HELPERS = `window.__g = {
  hidden(el){ for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return true; } return false; },
  sel(el){ return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : ''); },
  txt(el, n = 40){ return (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, n); },
  own(el){ let s = ''; for (const c of el.childNodes) if (c.nodeType === 3) s += c.data; return s.replace(/\\s+/g, ' ').trim(); },
};`;

const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const pageErrs = {};
const fontNote = {};

async function open(path, width, height = 900) {
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width, height });
  const key = `${path}@${width}`;
  const errs = (pageErrs[key] = []);
  pg.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  const url = PAGE_URLS[path] || (base + path);
  await pg.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(e => errs.push('nav ' + String(e).slice(0, 80)));
  await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}' }).catch(() => {});
  await pg.addScriptTag({ content: HELPERS });
  await pg.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 8000))])).catch(() => {});
  // 리빌(.rv) 노출을 위해 전체를 한 번 훑고 맨 위로 되돌린다 (measure_v3 와 동일).
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(600);
  fontNote[key] = await pg.evaluate(() => ({ mono: document.fonts.check('13px "JetBrains Mono"'), serif: document.fonts.check('16px "Noto Serif KR"'), sans: document.fonts.check('16px "Pretendard Variable"') })).catch(() => null);
  return pg;
}

const items = [];
const push = (id, metric, value, target, pass, detail) => items.push({ id, metric, value, target, pass, detail });

// ---------------------------------------------------------------- 스튜디오 390 (S1, S6 보조)
{
  const pg = await open('programs/studio.html', 390, 844);
  const r = await pg.evaluate(() => {
    const fixed = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if ((cs.position === 'sticky' || cs.position === 'fixed') && !__g.hidden(el)) fixed.push(__g.sel(el) + ' [' + cs.position + ']');
    }
    const H = innerHeight, W = innerWidth;
    const isBuy = a => /checkout|cart|#units/.test(a.getAttribute('href') || '') || /응시|구매|신청/.test(__g.txt(a, 60));
    const all = [...document.querySelectorAll('a[href],button')].filter(isBuy);
    window.scrollTo(0, 3 * H);
    return new Promise(res => setTimeout(() => {
      const seen = [];
      for (const a of all) {
        if (__g.hidden(a)) continue;
        const r = a.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W) seen.push(__g.sel(a) + ' "' + __g.txt(a, 20) + '" top=' + Math.round(r.top));
      }
      const positions = all.filter(a => !__g.hidden(a)).map(a => __g.sel(a) + ' "' + __g.txt(a, 14) + '" y=' + Math.round(a.getBoundingClientRect().top + scrollY));
      res({ fixed, seenAfter3: seen, buyTotal: all.length, scrollY: Math.round(scrollY), H, docH: document.documentElement.scrollHeight, positions: positions.slice(0, 12) });
    }, 300));
  });
  push('S1', 'studio 390: position sticky|fixed 요소 수 ; 3×innerHeight 스크롤 뒤 뷰포트 안 구매 링크(href checkout|cart|#units 또는 문구 응시|구매|신청) 존재',
    { fixedSticky: r.fixed.length, buyLinkVisibleAfter3Screens: r.seenAfter3.length > 0 },
    'fixedSticky ≥ 1 AND buyLinkVisibleAfter3Screens = true',
    r.fixed.length >= 1 && r.seenAfter3.length > 0,
    { fixedSticky: r.fixed, seenAfter3Screens: r.seenAfter3, buyLinkTotal: r.buyTotal, buyLinkDocY: r.positions, scrolledTo: r.scrollY, innerHeight: r.H, docHeight: r.docH });

  const s6m = await pg.evaluate(() => {
    const hits = [];
    for (const el of document.querySelectorAll('.hero *')) {
      const cs = getComputedStyle(el); const t = cs.transform; const why = [];
      if (t && t !== 'none') { if (t.startsWith('matrix3d')) why.push('matrix3d'); else { const m = t.match(/matrix\(([^)]+)\)/); if (m) { const [, bb, cc] = m[1].split(',').map(Number); if (Math.abs(bb) > 1e-6 || Math.abs(cc) > 1e-6) why.push('rotate/skew'); } } }
      if (cs.perspective && cs.perspective !== 'none') why.push('perspective');
      if (why.length && !__g.hidden(el)) hits.push(__g.sel(el) + ' ' + why.join('+'));
    }
    return hits;
  });
  fontNote['S6@390'] = s6m;
  await pg.close();
}

// ---------------------------------------------------------------- 스튜디오 1440 (S2 S3 S4 S5 S6 A2)
{
  const pg = await open('programs/studio.html', 1440, 900);

  const s2 = await pg.evaluate(() => {
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    const jumps = [];
    for (let i = 1; i < heads.length; i++) {
      const a = +heads[i - 1].tagName[1], c = +heads[i].tagName[1];
      if (c > a + 1) jumps.push(`h${a} "${__g.txt(heads[i - 1], 24)}" → h${c} "${__g.txt(heads[i], 24)}"`);
    }
    const counts = {}; for (const h of heads) counts[h.tagName.toLowerCase()] = (counts[h.tagName.toLowerCase()] || 0) + 1;
    return { jumps, counts, hiddenHeads: heads.filter(h => __g.hidden(h)).length };
  });
  push('S2', 'studio: h1~h6 문서 순서에서 hN 다음 h(N+2) 이상이 오는 도약 수', s2.jumps.length, '0', s2.jumps.length === 0, { jumps: s2.jumps, headingCounts: s2.counts, hiddenHeadings: s2.hiddenHeads });

  const s3 = await pg.evaluate(() => {
    const tables = [...document.querySelectorAll('table')];
    const noCap = tables.filter(t => !t.querySelector(':scope > caption'));
    const ths = [...document.querySelectorAll('th')];
    const noScope = ths.filter(t => !t.hasAttribute('scope'));
    return { tables: tables.length, noCap: noCap.length, th: ths.length, thNoScope: noScope.length,
      tableSel: tables.map(t => __g.sel(t) + ' in ' + __g.sel(t.closest('section') || t.parentElement)),
      thSample: noScope.slice(0, 6).map(t => __g.txt(t, 12) + (t.hasAttribute('rowspan') ? ' rowspan=' + t.getAttribute('rowspan') : '')) };
  });
  push('S3', 'studio: table 수, caption 없는 table 수, scope 없는 th 수', { tables: s3.tables, tablesNoCaption: s3.noCap, thTotal: s3.th, thNoScope: s3.thNoScope }, 'tablesNoCaption = 0 AND thNoScope = 0', s3.noCap === 0 && s3.thNoScope === 0, { tables: s3.tableSel, thNoScopeSample: s3.thSample });

  const s4 = await pg.evaluate(() => {
    const token = getComputedStyle(document.documentElement).getPropertyValue('--seal').trim();
    const probe = document.createElement('span'); probe.style.color = token; document.body.appendChild(probe);
    const seal = getComputedStyle(probe).color; probe.remove();
    const same = c => (c || '').replace(/\s/g, '') === seal.replace(/\s/g, '');
    // 역할 = 허용 4종(price / kicker_dot / pick_border / cmp_dot) + 금지 5종(tag / cta / number / label / line) + 잔여(other / other_pseudo)
    const roles = { price: [], kicker_dot: [], pick_border: [], cmp_dot: [], tag: [], cta: [], number: [], label: [], line: [], other: [], other_pseudo: [] };
    const priceNoAmount = [];
    for (const el of document.querySelectorAll('body *')) {
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
      const r = el.getBoundingClientRect(); if (r.width === 0 && r.height === 0) continue;
      if (__g.hidden(el)) continue;
      const cs = getComputedStyle(el);
      const props = [];
      if (same(cs.color) && __g.own(el)) props.push('color');
      if (same(cs.backgroundColor)) props.push('bg');
      const bc = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor];
      const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth];
      if (bc.some((c, i) => same(c) && parseFloat(bw[i]) > 0)) props.push('border');
      if (props.length) {
        const t = __g.txt(el, 30); const own = __g.own(el);
        // 금액 = 숫자(쉼표 허용) 뒤에 '원' 이 오고 그 뒤가 한글 음절이 아님 ("원칙 1" 배제, "33,000원," 포함)
        const isAmount = /\d[\d,]*\s*원(?![가-힣])/.test(t);
        let role;
        if (el.matches('.tag')) role = 'tag';
        else if (el.matches('a.btn,button.btn,.btn,a.tl,.cta a')) role = 'cta';
        // 가격 = .won 가격 칸(금액 문면이 없는 칸은 priceNoAmount 로 따로 남긴다) 또는 금액 문면을 color 로 가진 요소
        else if (el.matches('.won') || (isAmount && props.includes('color'))) { role = 'price'; if (!isAmount) priceNoAmount.push(__g.sel(el) + ' [' + props.join('+') + '] "' + t.slice(0, 18) + '"'); }
        else if (el.matches('.pick') && props.every(p => p === 'border')) role = 'pick_border';
        else if (el.matches('.n,.num') || /^(원칙[ \t]*)?\d{1,3}$/.test(own)) role = 'number';
        else if (el.matches('.stp,.lab,.mono,.kicker,.cap')) role = 'label';
        else if (props.every(p => p === 'border')) role = 'line';
        else role = 'other';
        roles[role].push(__g.sel(el) + ' [' + props.join('+') + '] "' + t.slice(0, 18) + '"');
      } else if (same(cs.color) && !__g.own(el) && __g.txt(el, 4)) {
        // color 는 seal 인데 직접 텍스트가 없는 요소(자손이 상속받아 칠함). 계수 밖, 근거로만 남긴다.
        (roles.seal_color_no_own_text ||= []).push(__g.sel(el) + ' "' + __g.txt(el, 18) + '"');
      }
      for (const ps of ['::before', '::after']) {
        const pcs = getComputedStyle(el, ps);
        if (!pcs.content || pcs.content === 'none' || pcs.content === 'normal') continue;
        const pp = [];
        if (same(pcs.backgroundColor)) pp.push('bg');
        if (same(pcs.color) && pcs.content !== '""') pp.push('color');
        if (same(pcs.borderTopColor) && parseFloat(pcs.borderTopWidth) > 0) pp.push('border');
        if (!pp.length) continue;
        if (el.matches('.kicker')) roles.kicker_dot.push(__g.sel(el) + ps + ' "' + __g.txt(el, 18) + '"');
        else if (el.matches('.cmp td')) roles.cmp_dot.push(__g.sel(el) + ps + ' [' + pp.join('+') + '] "' + __g.txt(el, 18) + '"');
        else roles.other_pseudo.push(__g.sel(el) + ps + ' [' + pp.join('+') + '] "' + __g.txt(el, 18) + '"');
      }
    }
    const counts = Object.fromEntries(Object.entries(roles).filter(([k]) => k !== 'seal_color_no_own_text').map(([k, v]) => [k, v.length]));
    return { token, seal, counts, roles, priceNoAmount };
  });
  const c4 = s4.counts;
  const s4pass = c4.cta === 0 && c4.tag === 0 && c4.price >= 1 && c4.number === 0 && c4.label === 0 && c4.line === 0 && c4.other === 0 && c4.other_pseudo === 0;
  push('S4', 'studio: --seal 토큰 색을 color|background|border 로 가진 요소 수, 역할별. 허용 = price(.won 칸 또는 금액 문면 color) / kicker_dot(.kicker::before) / pick_border(.pick 테두리만) / cmp_dot(.cmp td::before). 금지 = tag / cta / number(.n .num 또는 문면 "N" 또는 "원칙 N") / label(.stp .lab .mono .kicker .cap) / line(테두리만) / other / other_pseudo', c4,
    'cta = 0 AND tag = 0 AND price ≥ 1 AND number = label = line = 0 AND other = other_pseudo = 0', s4pass, { token: s4.token, sealRgb: s4.seal, priceNoAmount: s4.priceNoAmount, byRole: s4.roles });

  const s5 = await pg.evaluate(() => {
    // 시그니처 = 자식(depth1) 또는 자식+손자(depth2) 의 태그.클래스 시퀀스. rv/in 은 리빌 애니메이션 표지라 제외.
    const sig = (root, depth) => { const walk = (el, d) => [...el.children].map(c => { const cls = [...c.classList].filter(k => k !== 'rv' && k !== 'in').sort().join('.'); return c.tagName.toLowerCase() + (cls ? '.' + cls : '') + (d < depth ? '(' + walk(c, d + 1) + ')' : ''); }).join(','); return walk(root, 1); };
    const maxRep = arr => { const m = {}; for (const s of arr) m[s] = (m[s] || 0) + 1; return Math.max(0, ...Object.values(m)); };
    const cardEls = [...document.querySelectorAll('#parts .rail > li')];
    const partEls = [...document.querySelectorAll('section.part')];
    const cards2 = cardEls.map(li => sig(li.querySelector(':scope > a') || li, 2));
    const parts2 = partEls.map(s => sig(s.querySelector(':scope > .wrap') || s, 2));
    const cards1 = cardEls.map(li => sig(li.querySelector(':scope > a') || li, 1));
    const parts1 = partEls.map(s => sig(s.querySelector(':scope > .wrap') || s, 1));
    return { nCards: cardEls.length, nParts: partEls.length, cardsRep2: maxRep(cards2), partsRep2: maxRep(parts2), cardsRep1: maxRep(cards1), partsRep1: maxRep(parts1), cards1, parts1, cards2, parts2 };
  });
  // 주 지표 = depth1 (브리프의 "자식 태그명 시퀀스 + 클래스"). depth2 는 sample 안 표/타일 종류까지 갈라 critic 의 블록 템플릿 반복을 못 본다(참고값).
  push('S5', 'studio: #parts .rail>li>a 5장과 section.part>.wrap 5개의 자식 DOM 시그니처(태그.클래스, rv/in 제외) 동일 최대 반복 수', { cards: s5.cardsRep1, parts: s5.partsRep1 }, 'cards ≤ 2 AND parts ≤ 2', s5.cardsRep1 <= 2 && s5.partsRep1 <= 2, { nCards: s5.nCards, nParts: s5.nParts, depth2Rep: { cards: s5.cardsRep2, parts: s5.partsRep2 }, cardSignaturesDepth1: s5.cards1, partSignaturesDepth1: s5.parts1, partSignaturesDepth2: s5.parts2 });

  const s6 = await pg.evaluate(() => {
    const hits = [];
    const rules = [];
    for (const ss of document.styleSheets) { let rs; try { rs = ss.cssRules; } catch { continue; } const walk = list => { for (const r of list) { if (r.cssRules) walk(r.cssRules); if (r.style && /rotate|skew|matrix3d|perspective/.test(r.style.transform + ' ' + r.style.perspective)) rules.push(r); } }; walk(rs); }
    for (const el of document.querySelectorAll('.hero *')) {
      const cs = getComputedStyle(el); const t = cs.transform; const why = [];
      if (t && t !== 'none') { if (t.startsWith('matrix3d')) why.push('matrix3d'); else { const m = t.match(/matrix\(([^)]+)\)/); if (m) { const [, bb, cc] = m[1].split(',').map(Number); if (Math.abs(bb) > 1e-6 || Math.abs(cc) > 1e-6) why.push('rotate/skew'); } } }
      if (cs.perspective && cs.perspective !== 'none') why.push('perspective');
      if (!why.length || __g.hidden(el)) continue;
      const authored = rules.filter(r => { try { return el.matches(r.selectorText); } catch { return false; } }).map(r => r.selectorText + '{transform:' + r.style.transform + '}');
      hits.push(__g.sel(el) + ' ' + why.join('+') + ' ' + (authored[0] || t));
    }
    return hits;
  });
  push('S6', 'studio 1440: .hero 하위 요소 중 transform 에 rotate|skew|matrix3d|perspective 가 있는 요소 수', s6.length, '0', s6.length === 0, { at1440: s6, at390: fontNote['S6@390'] });

  const a2s = await pg.evaluate(() => { const t = document.body.innerText; return { biz: t.includes('사업자등록번호'), mail: t.includes('통신판매업'), where: (document.querySelector('footer') ? 'footer' : 'none') }; });
  fontNote['A2.studio'] = a2s;
  await pg.close();
}

// ---------------------------------------------------------------- 가이드북 1440 (G1 G3 G4 A2)
{
  const pg = await open('programs/guidebook.html', 1440, 900);

  const g1 = await pg.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found = []; let n;
    while ((n = walker.nextNode())) {
      if (!/절반/.test(n.data)) continue;
      const el = n.parentElement; if (/^(SCRIPT|STYLE)$/.test(el.tagName)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const card = el.closest('.price > li');
      let cardWon = null, sibWon = null;
      if (card) {
        cardWon = [...card.querySelectorAll('.won')].map(w => +parseFloat(getComputedStyle(w).fontSize).toFixed(1));
        sibWon = [...card.parentElement.children].filter(c => c !== card).map(c => [...c.querySelectorAll('.won')].map(w => +parseFloat(getComputedStyle(w).fontSize).toFixed(1)));
      }
      found.push({ sel: __g.sel(el), text: __g.txt(el, 60), fontSize: +fs.toFixed(1), inPriceCard: !!card, cardWonFs: cardWon, siblingWonFs: sibWon });
    }
    return found;
  });
  const g1card = g1.filter(f => f.inPriceCard);
  const g1ok = g1card.length > 0 && g1card.every(f => f.fontSize >= 16 && f.cardWonFs.length && f.siblingWonFs.flat().every(v => f.cardWonFs.every(c => c === v)));
  push('G1', 'guidebook: "절반" 텍스트 요소 font-size ; 같은 .price>li 카드의 .won font-size ; 형제 카드 .won font-size',
    g1card.length ? { halfFs: g1card.map(f => f.fontSize), cardWonFs: g1card[0].cardWonFs, siblingWonFs: g1card[0].siblingWonFs } : null,
    'halfFs ≥ 16 AND cardWonFs = siblingWonFs', g1ok, { matches: g1 });

  const g3 = await pg.evaluate(() => {
    const fam = el => getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '');
    const rows = [];
    // (a) 한 텍스트 노드 안의 "1,234" (span 분리 전 문면): 쉼표 글자 Range 폭 / 바로 앞 숫자 Range 폭
    const re = /\d{1,3}(\s*,\s*\d{3})+/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set(); let n;
    while ((n = walker.nextNode())) {
      const m = n.data.match(re); if (!m) continue;
      const el = n.parentElement; if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || __g.hidden(el)) continue;
      const start = m.index, seg = m[0]; const ci = start + seg.indexOf(',');
      let di = ci - 1; while (di > start && /\s/.test(n.data[di])) di--;
      const rng = document.createRange();
      rng.setStart(n, ci); rng.setEnd(n, ci + 1); const cw = rng.getBoundingClientRect().width;
      rng.setStart(n, di); rng.setEnd(n, di + 1); const dw = rng.getBoundingClientRect().width;
      const key = __g.sel(el) + '|' + seg; if (seen.has(key)) continue; seen.add(key);
      rows.push({ kind: 'text', sel: __g.sel(el), seg, family: fam(el), fontSize: parseFloat(getComputedStyle(el).fontSize), commaW: +cw.toFixed(2), digitW: +dw.toFixed(2), ratio: dw ? +(cw / dw).toFixed(3) : null, wsAroundComma: /\d\s+,|,\s+\d/.test(seg) });
    }
    // (b) span.c 로 분리된 쉼표(요소 기준): span 상자 폭 / 바로 앞 텍스트 노드 마지막 글자(숫자) Range 폭. 앞이 숫자 텍스트가 아니면 측정 불가(err) 로 남긴다.
    for (const c of document.querySelectorAll('span.c')) {
      const host = c.parentElement; if (!host || __g.hidden(host)) continue;
      const prev = c.previousSibling, next = c.nextSibling;
      if (!prev || prev.nodeType !== 3 || !/\d$/.test(prev.data)) { rows.push({ kind: 'span', sel: __g.sel(host), family: fam(host), err: 'prev not digit text', ratio: null }); continue; }
      const rng = document.createRange(); rng.setStart(prev, prev.data.length - 1); rng.setEnd(prev, prev.data.length);
      const dw = rng.getBoundingClientRect().width; const cr = c.getBoundingClientRect();
      const ws = /\s$/.test(prev.data) || !!(next && next.nodeType === 3 && /^\s/.test(next.data));
      rows.push({ kind: 'span', sel: __g.sel(host), seg: __g.txt(host, 24), family: fam(host), fontSize: parseFloat(getComputedStyle(host).fontSize), spanFontSize: parseFloat(getComputedStyle(c).fontSize), spanDisplay: getComputedStyle(c).display, commaW: +cr.width.toFixed(2), digitW: +dw.toFixed(2), ratio: dw ? +(cr.width / dw).toFixed(3) : null, wsAroundComma: ws });
    }
    return { rows, monoLoaded: document.fonts.check('13px "JetBrains Mono"') };
  });
  // 값은 mono 계열(computed font-family 첫 항이 *Mono*) 요소로만 잰다. 텍스트 노드식(a) 과 span.c 요소식(b) 을 합쳐 최대 비율. 본문/주소(footer "12, 402-941A호") 의 정규식 적중은 참고값으로 분리.
  const monoAll = g3.rows.filter(o => /Mono/i.test(o.family || ''));
  const monoRows = monoAll.filter(o => o.ratio != null);
  const monoErr = monoAll.filter(o => o.err);
  const nonMono = g3.rows.filter(o => !/Mono/i.test(o.family || ''));
  const maxR = monoRows.length ? Math.max(...monoRows.map(o => o.ratio)) : null;
  const wsN = monoRows.filter(o => o.wsAroundComma).length;
  const g3pass = g3.monoLoaded ? (maxR != null && maxR <= 0.6 && wsN === 0 && monoErr.length === 0) : null;
  push('G3', 'guidebook: mono 요소의 천 단위 쉼표 폭 / 인접 숫자 폭 최대 비율. (a) 한 텍스트 노드 안 "1,234" = 쉼표와 숫자의 Range 폭, (b) span.c 로 분리된 쉼표 = span 상자 폭 / 앞 텍스트 노드 마지막 숫자 Range 폭. 쉼표 앞뒤 공백 건수',
    { maxCommaDigitRatio: maxR, wsAroundCommaCount: wsN, monoTextRows: monoRows.filter(o => o.kind === 'text').length, monoSpanRows: monoRows.filter(o => o.kind === 'span').length, monoUnmeasurable: monoErr.length, monoFontLoaded: g3.monoLoaded },
    'maxCommaDigitRatio ≤ 0.6 AND wsAroundCommaCount = 0 AND monoUnmeasurable = 0 AND mono 행 ≥ 1 (JetBrains Mono 미로드면 pass=null)', g3pass,
    { rowsMatched: g3.rows.length, monoRows: [...monoRows].sort((a, b) => b.ratio - a.ratio), monoUnmeasurable: monoErr, nonMonoRows: nonMono });

  // G4 = 구조 술어 + 무회귀 + 절정 범위. 판정식과 계측 함수는 g4_rule.mjs 단일 구현(대조군 g4_controls.mjs 가 같은 것을 쓴다).
  const g4a = await pg.evaluate(g4Eval);
  const pg4b = await open('programs/guidebook.html', 390, 844);
  const g4b = await pg4b.evaluate(g4Eval);
  await pg4b.close();
  const v1440 = g4One(g4a), v390 = g4One(g4b);
  const g4pass = v1440.pass && v390.pass;
  push('G4', G4_METRIC,
    { at1440: { booksPct: g4a.books ? g4a.books.pct : null, p4Pct: g4a.p4 ? g4a.p4.pct : null, booksPrev: g4a.books ? g4a.books.prevId : null, booksNext: g4a.books ? g4a.books.nextId : null },
      at390: { booksPct: g4b.books ? g4b.books.pct : null, p4Pct: g4b.p4 ? g4b.p4.pct : null, booksPrev: g4b.books ? g4b.books.prevId : null, booksNext: g4b.books ? g4b.books.nextId : null } },
    G4_TARGET, g4pass, { at1440: g4a, at390: g4b, why: { at1440: v1440.why, at390: v390.why } });

  fontNote['A2.guidebook'] = await pg.evaluate(() => { const t = document.body.innerText; return { biz: t.includes('사업자등록번호'), mail: t.includes('통신판매업'), where: (document.querySelector('footer') ? 'footer' : 'none') }; });
  await pg.close();
}

// ---------------------------------------------------------------- 가이드북 G2 (5폭)
{
  const per = {}; let over = 0;
  for (const w of [901, 960, 1000, 1024, 1030]) {
    const pg = await open('programs/guidebook.html', w, 900);
    const r = await pg.evaluate(() => [...document.querySelectorAll('.hero .fan')].map(img => { const bb = img.getBoundingClientRect(); const cs = getComputedStyle(img); return { cls: img.className, right: Math.round(bb.right * 10) / 10, W: innerWidth, display: cs.display, over: cs.display !== 'none' && bb.right > innerWidth }; }));
    per[w] = r; over += r.filter(x => x.over).length;
    await pg.close();
  }
  push('G2', 'guidebook 901/960/1000/1024/1030: .hero .fan 표지 5장 중 getBoundingClientRect().right > innerWidth 인 장 수(전 폭 합)', over, '0', over === 0, { perWidth: Object.fromEntries(Object.entries(per).map(([w, r]) => [w, r.filter(x => x.over).map(x => `${x.cls} right=${x.right} W=${x.W}`)])), allRights: Object.fromEntries(Object.entries(per).map(([w, r]) => [w, r.map(x => `${x.cls}:${x.display === 'none' ? 'hidden' : x.right}`)])) });
}

// ---------------------------------------------------------------- FAQ A1 (390, 1440)
{
  const res = {};
  for (const w of [390, 1440]) {
    const pg = await open('faq.html', w, w === 390 ? 844 : 900);
    res[w] = await pg.evaluate(() => {
      const small = []; let excluded = 0, negTab = 0, total = 0; const exclWhy = { hidden: 0, zero: 0, offscreen: 0, srOnly: 0 };
      for (const el of document.querySelectorAll('a,button,summary,input,select,textarea,[role=button],[tabindex]')) {
        if (el.matches('[tabindex="-1"]') && !el.matches('a,button,summary,input,select,textarea,[role=button]')) { negTab++; continue; }
        total++;
        let r = el.getBoundingClientRect();
        if (el.matches('input[type=checkbox],input[type=radio]')) { const host = el.closest('label') || el.closest('.check'); if (host) r = host.getBoundingClientRect(); }
        if (el.matches('.skip,.sr,.sr-only,.visually-hidden')) { excluded++; exclWhy.srOnly++; continue; }
        if (r.width === 0 && r.height === 0) { excluded++; exclWhy.zero++; continue; }
        if (__g.hidden(el)) { excluded++; exclWhy.hidden++; continue; }
        if (r.right + scrollX <= 0 || r.bottom + scrollY <= 0) { excluded++; exclWhy.offscreen++; continue; }
        if (r.height < 44 || r.width < 44) {
          const cs = getComputedStyle(el);
          const inline = cs.display === 'inline' && el.parentElement && __g.own(el.parentElement).length > 0;
          small.push({ sel: __g.sel(el), text: __g.txt(el, 16), w: Math.round(r.width), h: Math.round(r.height), inlineText: inline });
        }
      }
      return { total, small, excluded, exclWhy, tabindexNeg1Skipped: negTab };
    });
    await pg.close();
  }
  const n = res[390].small.length + res[1440].small.length;
  push('A1', 'faq 390 과 1440: 보이는 인터랙티브 요소(a,button,summary,input,select,textarea,[role=button],[tabindex]) 중 폭 또는 높이 44px 미만 수', { at390: res[390].small.length, at1440: res[1440].small.length }, '0 (양 폭)', n === 0,
    { at390: { total: res[390].total, excluded: res[390].excluded, exclWhy: res[390].exclWhy, tabindexNeg1Skipped: res[390].tabindexNeg1Skipped, small: res[390].small }, at1440: { total: res[1440].total, excluded: res[1440].excluded, exclWhy: res[1440].exclWhy, tabindexNeg1Skipped: res[1440].tabindexNeg1Skipped, small: res[1440].small } });
}

// ---------------------------------------------------------------- A2 (index 양성 대조군 + 두 소개 면)
{
  const pg = await open('index.html', 1440, 900);
  const idx = await pg.evaluate(() => { const t = document.body.innerText; const biz = document.querySelector('.biz'); return { biz: t.includes('사업자등록번호'), mail: t.includes('통신판매업'), where: biz ? __g.sel(biz) : 'none' }; });
  await pg.close();
  const pages = { 'index.html': idx, 'programs/studio.html': fontNote['A2.studio'], 'programs/guidebook.html': fontNote['A2.guidebook'] };
  const controlOk = idx.biz && idx.mail;
  const all = Object.values(pages).every(p => p && p.biz && p.mail);
  push('A2', '세 면 body.innerText 에 "사업자등록번호" 와 "통신판매업" 둘 다 존재 (index.html = 검출기 양성 대조군)', Object.fromEntries(Object.entries(pages).map(([k, p]) => [k, !!(p && p.biz && p.mail)])), '세 면 모두 true; index 미검출이면 검출기 결함 FAIL', controlOk && all, { pages, positiveControlIndex: controlOk ? 'PASS' : 'DETECTOR_DEFECT' });
}

await b.close();

const order = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'G1', 'G2', 'G3', 'G4', 'A1', 'A2'];
items.sort((a, z) => order.indexOf(a.id) - order.indexOf(z.id));
const out = { label, base, items, ts_note: { ts: new Date().toISOString(), tool: 'playwright channel=chrome headless, deviceScaleFactor 1', viewports: 'S1 390x844 ; G2 901/960/1000/1024/1030 x900 ; A1 390x844 + 1440x900 ; 나머지 1440x900', fonts: Object.fromEntries(Object.entries(fontNote).filter(([k]) => k.includes('@'))), pageErrors: pageErrs, passSummary: { pass: items.filter(i => i.pass === true).length, fail: items.filter(i => i.pass === false).length, null: items.filter(i => i.pass === null).length } } };
const json = JSON.stringify(out, null, 1);
writeFileSync(`${OUT_DIR}/baseline_${label}.json`, json);
console.log(json);
