// 푸터 사업자 정보 래스터화 (2026-08-27 건우 지시: 텍스트 대신 이미지 — 크롤러 수집 차단)
// 실행: node _tools/render_bizinfo.mjs  → assets/bizinfo.png (2x) + stdout 에 CSS px 치수
// 내용은 아래 LINES 고정 3행. 문구 변경 시 여기 수정 후 재실행 + v2_shell.py 의 width/height 갱신.
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'assets', 'bizinfo.png');
const LINES = ['대표: 현건우', '사업자등록번호: 293-38-01827', '통신판매업 신고: 면제대상'];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:transparent}
  #biz{display:inline-block;
    font-family:'Pretendard Variable','Pretendard',-apple-system,'Apple SD Gothic Neo',sans-serif;
    font-size:12px;line-height:1.75;color:#696561;letter-spacing:0}
</style></head><body><div id="biz">${LINES.join('<br>')}</div></body></html>`;

const b = await chromium.launch();
const pg = await (await b.newContext({ deviceScaleFactor: 2 })).newPage();
await pg.setContent(html);
await pg.evaluate(() => document.fonts.ready);
const el = pg.locator('#biz');
const box = await el.boundingBox();
await el.screenshot({ path: OUT, omitBackground: true });
console.log(JSON.stringify({ w: Math.ceil(box.width), h: Math.ceil(box.height) }));
await b.close();
