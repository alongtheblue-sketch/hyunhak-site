// 렌더 하네스 (발주 세션 실행). astra 산출 rN/dir*/{story,brochure}.html 을 PNG/PDF 로 굽고 기계 게이트를 잰다.
// 사용: node render.mjs r1 [dirA,dirB]   (playwright 는 iruri_6mo_thumb 의 node_modules 를 createRequire 로 빌려 쓴다)
import { createRequire } from 'node:module';
const { chromium } = createRequire('/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/')('playwright');
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const round = process.argv[2] || 'r1';
const only = (process.argv[3] || '').split(',').filter(Boolean);
const roundDir = path.join(HERE, round);
const outDir = path.join(roundDir, 'render');
fs.mkdirSync(outDir, { recursive: true });

const STORY = { w: 1080, h: 1920, safeTop: 250, safeBottom: 340 };
const BLEED_MM = 3, TRIM_W = 210, TRIM_H = 297;

const dirs = fs.readdirSync(roundDir).filter(d => /^dir[A-Z]$/.test(d) && (!only.length || only.includes(d))).sort();
const report = { round, ts: new Date().toISOString(), dirs: {} };

// file:// 는 파일마다 별도 origin 이라 CSS mask-image(url svg) 로딩이 CORS 로 막혀 검은 사각형이 된다 → 파일 간 접근 허용
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
for (const d of dirs) {
  const r = report.dirs[d] = {};
  const dpath = path.join(roundDir, d);

  // ---- 스토리 1080x1920 (story.html + story_*.html 변형 전부) ----
  const storyFiles = fs.readdirSync(dpath).filter(f => /^story.*\.html$/.test(f)).sort();
  for (const sf of storyFiles) {
    const storyHtml = path.join(dpath, sf);
    const tag = sf === 'story.html' ? 'story' : sf.replace(/\.html$/, '');
    const ctx = await browser.newContext({ viewport: { width: STORY.w, height: STORY.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('file://' + storyHtml, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const gate = await page.evaluate(({ w, h, safeTop, safeBottom }) => {
      const de = document.documentElement;
      const overflow = { sw: de.scrollWidth, sh: de.scrollHeight, over: de.scrollWidth > w || de.scrollHeight > h };
      // 세이프존 침범: 글자·로고·버튼 요소의 박스가 상단 safeTop / 하단 h-safeBottom 을 넘는가
      const hits = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; const seen = new Set();
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const range = document.createRange(); range.selectNodeContents(n);
        for (const b of range.getClientRects()) {
          if (b.width < 1 || b.height < 1) continue;
          if (b.top < safeTop || b.bottom > h - safeBottom) { hits.push({ tag: el.tagName, text: n.textContent.trim().slice(0, 30), top: Math.round(b.top), bottom: Math.round(b.bottom) }); break; }
        }
      }
      for (const el of document.querySelectorAll('img, svg, button, a')) {
        const b = el.getBoundingClientRect(); if (b.width < 1 || b.height < 1) continue;
        if (el.dataset.bleed === 'bg') continue; // 배경 사진은 세이프존 예외
        if (b.top < safeTop || b.bottom > h - safeBottom) hits.push({ tag: el.tagName, text: (el.alt || el.className || '').toString().slice(0, 30), top: Math.round(b.top), bottom: Math.round(b.bottom) });
      }
      // 최소 글자 크기
      const small = [];
      for (const el of document.body.querySelectorAll('*')) {
        if (!el.childNodes.length) continue;
        const hasText = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
        if (!hasText) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 32) small.push({ tag: el.tagName, fs, text: el.textContent.trim().slice(0, 24) });
      }
      const fonts = [...new Set([...document.body.querySelectorAll('*')].map(e => getComputedStyle(e).fontFamily))];
      return { overflow, safezoneHits: hits, smallText: small.slice(0, 20), smallCount: small.length, fonts };
    }, STORY);
    const png = path.join(outDir, `${d}_${tag}.png`);
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: STORY.w, height: STORY.h } });
    r[tag] = { png, ...gate };
    await ctx.close();
    // 2배 해상도 사본 (인스타 업로드 재압축 대비 보관용)
    const ctx2 = await browser.newContext({ viewport: { width: STORY.w, height: STORY.h }, deviceScaleFactor: 2 });
    const page2 = await ctx2.newPage();
    await page2.goto('file://' + storyHtml, { waitUntil: 'load' });
    await page2.evaluate(() => document.fonts.ready);
    await page2.waitForTimeout(200);
    await page2.screenshot({ path: path.join(outDir, `${d}_${tag}@2x.png`), clip: { x: 0, y: 0, width: STORY.w, height: STORY.h } });
    await ctx2.close();
  }

  // ---- 브로슈어 A4 2면 (216x303mm 블리드 포함) ----
  const broHtml = path.join(dpath, 'brochure.html');
  if (fs.existsSync(broHtml)) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 1600 } });
    const page = await ctx.newPage();
    await page.goto('file://' + broHtml, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);
    const gate = await page.evaluate(({ bleed, tw, th }) => {
      const pages = [...document.querySelectorAll('section.page')];
      const mm = v => v / 96 * 25.4;
      const res = pages.map((p, i) => {
        const b = p.getBoundingClientRect();
        const inner = { sw: p.scrollWidth, sh: p.scrollHeight, cw: p.clientWidth, ch: p.clientHeight };
        // 안전선(재단선 안 5mm) 침범: 글자 박스가 페이지 가장자리에서 bleed+5mm 안쪽으로 못 들어온 경우
        const margin = (bleed + 5) / 25.4 * 96;
        const hits = [];
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n;
        while ((n = walker.nextNode())) {
          if (!n.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(n);
          for (const rb of range.getClientRects()) {
            if (rb.width < 1) continue;
            if (rb.left < b.left + margin || rb.right > b.right - margin || rb.top < b.top + margin || rb.bottom > b.bottom - margin) { hits.push({ text: n.textContent.trim().slice(0, 30), l: Math.round(rb.left - b.left), r: Math.round(b.right - rb.right), t: Math.round(rb.top - b.top), b: Math.round(b.bottom - rb.bottom) }); break; }
          }
        }
        const small = [];
        for (const el of p.querySelectorAll('*')) {
          const hasText = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()); if (!hasText) continue;
          const pt = parseFloat(getComputedStyle(el).fontSize) * 0.75; if (pt < 6.5) small.push({ pt: +pt.toFixed(1), text: el.textContent.trim().slice(0, 24) });
        }
        // 4방 여백 실측 (재단선 기준): 글자·img·svg 박스 중 배경(data-bleed="bg" 또는 absolute 풀블리드)을 뺀 최외곽
        let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
        const consider = (rb) => { if (rb.width < 1 || rb.height < 1) return; minL = Math.min(minL, rb.left); minT = Math.min(minT, rb.top); maxR = Math.max(maxR, rb.right); maxB = Math.max(maxB, rb.bottom); };
        const w2 = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let t2;
        while ((t2 = w2.nextNode())) { if (!t2.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(t2); for (const rb of rg.getClientRects()) consider(rb); }
        for (const el of p.querySelectorAll('img, svg')) { if (el.dataset.bleed === 'bg') continue; const cs = getComputedStyle(el); if (cs.position === 'absolute' && el.getBoundingClientRect().width >= b.width - 2) continue; consider(el.getBoundingClientRect()); }
        const bl = bleed / 25.4 * 96;
        const margins_mm = isFinite(minL) ? { left: +mm(minL - b.left - bl).toFixed(1), top: +mm(minT - b.top - bl).toFixed(1), right: +mm(b.right - bl - maxR).toFixed(1), bottom: +mm(b.bottom - bl - maxB).toFixed(1) } : null;
        return { i: i + 1, size_mm: [+mm(b.width).toFixed(1), +mm(b.height).toFixed(1)], overflow: inner.sh > inner.ch + 1 || inner.sw > inner.cw + 1, inner, margins_mm, safelineHits: hits.slice(0, 15), safelineCount: hits.length, smallText: small.slice(0, 10) };
      });
      return { pageCount: pages.length, pages: res };
    }, { bleed: BLEED_MM, tw: TRIM_W, th: TRIM_H });
    const pdf = path.join(outDir, `${d}_brochure.pdf`);
    await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    let pdfinfo = {}, fontsInfo = '';
    try { pdfinfo.pages = +execSync(`pdfinfo "${pdf}" | awk '/^Pages:/{print $2}'`).toString().trim(); pdfinfo.size = execSync(`pdfinfo "${pdf}" | awk -F': *' '/^Page size:/{print $2}'`).toString().trim(); } catch {}
    try { fontsInfo = execSync(`pdffonts "${pdf}"`).toString(); } catch {}
    const type3 = (fontsInfo.match(/Type 3/g) || []).length;
    const notEmb = fontsInfo.split('\n').slice(2).filter(l => l.trim() && /\s(no)\s+(yes|no)\s+(yes|no)\s/.test(l)).length;
    try { execSync(`pdftoppm -r 110 -png "${pdf}" "${path.join(outDir, d + '_brochure_p')}"`); } catch {}
    r.brochure = { pdf, ...gate, pdfinfo, type3, notEmbedded: notEmb };
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

// 요약
for (const [d, r] of Object.entries(report.dirs)) {
  for (const [k, s] of Object.entries(r)) if (k.startsWith('story')) console.log(`${d} ${k}: overflow=${s.overflow.over} safezoneHits=${s.safezoneHits.length} small(<32px)=${s.smallCount}`);
  if (r.brochure) console.log(`${d} brochure: pages(dom)=${r.brochure.pageCount} pdfPages=${r.brochure.pdfinfo.pages} size=${r.brochure.pdfinfo.size} type3=${r.brochure.type3} notEmb=${r.brochure.notEmbedded} ` + r.brochure.pages.map(p => `p${p.i}:${p.size_mm.join('x')}mm ovf=${p.overflow} safe=${p.safelineCount} margins=${p.margins_mm ? Object.values(p.margins_mm).join('/') : 'n/a'}`).join(' '));
}
console.log('report:', path.join(outDir, 'report.json'));
