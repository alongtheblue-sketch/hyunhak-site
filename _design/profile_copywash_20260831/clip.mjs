// 요소 단위 클립 채증. usage: node clip.mjs <out_dir> <width> <file> <selector> <name>
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
const [out, w, f, sel, name] = process.argv.slice(2);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: +w, height: 900 }, deviceScaleFactor: 2 });
await pg.goto('file://' + resolve(f), { waitUntil: 'networkidle' });
await pg.addStyleTag({ content: '.rv{opacity:1!important;transform:none!important}' });
const el = pg.locator(sel).first();
await el.scrollIntoViewIfNeeded();
await pg.waitForTimeout(400);
const box = await el.boundingBox();
console.log(name, JSON.stringify(box));
await el.screenshot({ path: `${out}/${name}.png` });
await b.close();
