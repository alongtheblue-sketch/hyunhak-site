// 2026-09-03 건우 지시 5건 실측: 홈 레일 0·영상 재생·첫 화면 4버튼, 스튜디오 단계 앵커·AI 0, 가이드북 실물 표본 5·AI 0
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const SITE = '/Users/gregory/Workspace/hyunhak-site'; const out = process.argv[2] || SITE + '/_design/home_hero_20260903/shots'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' }); const R = {};
const rect = 'e=>{const r=e.getBoundingClientRect();return {t:Math.round(r.top),b:Math.round(r.bottom),l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)}}';
for (const [w, h] of [[1280, 800], [1440, 900], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('file://' + SITE + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const m = await p.evaluate((rs) => {
    const rect = eval(rs); const v = document.querySelector('.herofilm video'); const vh = innerHeight;
    const btns = [...document.querySelectorAll('.prodcta a')].map(a => { const r = rect(a); return { t: a.textContent.trim().replace(/\s+/g, ' '), href: a.getAttribute('href'), r, inView: r.t >= 0 && r.b <= vh }; });
    const vr = v ? rect(v) : null;
    return { rail: !!document.querySelector('nav.rail'), video: v ? { paused: v.paused, ct: v.currentTime, rs: v.readyState, muted: v.muted, loop: v.loop, autoplay: v.autoplay, src: v.currentSrc.split('/').pop(), r: vr, inView: vr.t < vh && vr.b > 0 } : null, btns, h1: rect(document.querySelector('.hero h1')), scrollW: document.documentElement.scrollWidth, vw: innerWidth, vh };
  }, rect);
  await p.waitForTimeout(1500);
  const ct2 = await p.evaluate(() => { const v = document.querySelector('.herofilm video'); return v ? v.currentTime : null; });
  if (m.video) { m.video.ct2 = ct2; m.video.advancing = ct2 > m.video.ct; }
  await p.screenshot({ path: `${out}/home_first_${w}.png` });
  await p.screenshot({ path: `${out}/home_full_${w}.png`, fullPage: true });
  R['index_' + w] = m; await p.close();
}
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('file://' + SITE + '/programs/studio.html', { waitUntil: 'load' });
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important} .rv{opacity:1!important;transform:none!important}' });
  const s = { openers: await p.locator('.openers').count(), aiRefs: await p.evaluate(() => [...document.images].filter(i => /aigen|std_desk/.test(i.src)).length), ogImage: await p.evaluate(() => (document.querySelector('meta[property="og:image"]') || {}).content), anchors: [] };
  const n = await p.locator('ol.rail li a').count();
  for (let i = 0; i < n; i++) {
    const a = p.locator('ol.rail li a').nth(i); const href = await a.getAttribute('href');
    await p.evaluate(() => scrollTo(0, 0)); await a.click(); await p.waitForTimeout(300);
    const r = await p.evaluate((id) => { const e = document.querySelector(id); const t = e.getBoundingClientRect().top; return { top: Math.round(t), h2: e.querySelector('h2').textContent.trim(), sy: Math.round(scrollY) }; }, href);
    s.anchors.push({ href, ...r });
  }
  R.studio = s; await p.close();
}
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('file://' + SITE + '/programs/guidebook.html', { waitUntil: 'load' });
  await p.addStyleTag({ content: '.rv{opacity:1!important;transform:none!important}' });
  await p.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => i.removeAttribute('loading')));
  await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
  R.guidebook = await p.evaluate(() => ({ pgv: document.querySelectorAll('.pgv').length, marks: document.querySelectorAll('.pgv .mk').length, sampleImgs: [...document.querySelectorAll('.pgv img, .sample img')].map(i => ({ src: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0 })), aiRefs: [...document.images].filter(i => /aigen|gbd_hero|gbd_p\d_/.test(i.src)).length, heroBg: !!document.querySelector('.hero .bg'), closecovers: document.querySelectorAll('.closecovers img').length, ogImage: (document.querySelector('meta[property="og:image"]') || {}).content }));
  await p.close();
}
await b.close(); fs.writeFileSync(out + '/verify.json', JSON.stringify(R, null, 2)); console.log(JSON.stringify(R));
