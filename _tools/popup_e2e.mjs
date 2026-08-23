// 공지 팝업 e2e: localhost:8788(site) + localhost:8799(api). 팝업 표시 → 오늘 하루 닫기 → 재로드 시 미표시 → notice.html 목록/상세
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const out = process.argv[2];
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
const res = {};
await pg.goto('http://localhost:8788/index.html', { waitUntil: 'networkidle' });
res.popup_shown = await pg.locator('.hh-popup').count();
res.popup_title = await pg.locator('#hhPopupTitle').textContent().catch(() => null);
res.popup_strong = await pg.locator('.hh-popup-body strong').count();
await pg.screenshot({ path: out + '/popup_index.png' });
res.notice_strip = await pg.locator('#notices:not([hidden]) li').count();
// 포커스 트랩: Tab 6회 동안 activeElement 가 팝업 안에 머문다
let inside = 0; for (let i = 0; i < 6; i++) { await pg.keyboard.press('Tab'); inside += await pg.evaluate(() => !!document.activeElement.closest('.hh-popup')); }
res.focus_trap_6tabs = inside;
await pg.check('#hhPopupMute'); await pg.click('#hhPopupClose');
res.popup_after_close = await pg.locator('.hh-popup').count();
await pg.reload({ waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
res.popup_after_mute_reload = await pg.locator('.hh-popup').count();
const pg2 = await ctx.newPage(); // 새 탭 = 새 sessionStorage, mute 는 localStorage 라 유지
await pg2.goto('http://localhost:8788/about.html', { waitUntil: 'networkidle' }); await pg2.waitForTimeout(500);
res.popup_new_tab_muted = await pg2.locator('.hh-popup').count();
await pg2.goto('http://localhost:8788/notice.html', { waitUntil: 'networkidle' }); await pg2.waitForTimeout(500);
res.notice_list = await pg2.locator('.ntc .rows li').count();
await pg2.click('.ntc .rows li a'); await pg2.waitForTimeout(800);
res.notice_view_title = await pg2.locator('#vTitle').textContent();
res.notice_view_url = pg2.url();
await pg2.screenshot({ path: out + '/notice_view.png' });
// 모바일 메뉴
await pg2.setViewportSize({ width: 390, height: 800 }); await pg2.goto('http://localhost:8788/faq.html', { waitUntil: 'networkidle' });
await pg2.click('.nav .menu'); await pg2.waitForTimeout(300);
res.mobile_menu_open = await pg2.locator('.nav.open nav a').count();
await pg2.screenshot({ path: out + '/mobile_menu.png' });
res.errors = errs;
console.log(JSON.stringify(res, null, 1));
await b.close();
