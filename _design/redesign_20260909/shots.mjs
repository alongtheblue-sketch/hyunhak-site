// 용법: node shots.mjs <base_url> <out_dir>  — 5면 × 2뷰포트 첫 화면 + 전체면 캡처 + 계측 JSON
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [base, out] = process.argv.slice(2);
const pages = ['index.html','programs/guidebook.html','programs/studio.html','studio.html','guidebook/index.html'];
const vps = [{n:'m390',w:390,h:844},{n:'d1280',w:1280,h:800}];
fs.mkdirSync(out,{recursive:true});
const browser = await chromium.launch();
const rows=[];
for (const vp of vps){
  const ctx = await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:1,locale:'ko-KR'});
  for (const p of pages){
    const pg = await ctx.newPage(); const errs=[];
    pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,120)); });
    await pg.goto(base+p,{waitUntil:'networkidle',timeout:60000}).catch(e=>errs.push('goto '+e.message.slice(0,80)));
    await pg.waitForTimeout(800);
    const slug=p.replace(/[\/.]/g,'_');
    await pg.screenshot({path:`${out}/${vp.n}_${slug}_fold.png`});
    await pg.screenshot({path:`${out}/${vp.n}_${slug}_full.png`,fullPage:true});
    const m = await pg.evaluate((vh)=>{
      const q=s=>document.querySelector(s);
      const top=el=>el?Math.round(el.getBoundingClientRect().top+window.scrollY):null;
      const gnb=[...document.querySelectorAll('nav.gnb a, nav.mnav a, nav.fix a')].map(a=>a.textContent.trim().replace(/\s+/g,' ')+'>'+a.getAttribute('href')).slice(0,20);
      return {h1:(q('h1')||{}).textContent?.trim().replace(/\s+/g,' ').slice(0,60), docH:document.documentElement.scrollHeight, scrollW:document.documentElement.scrollWidth, pband_top:top(q('section.pband')), buy_top:top(q('#buy')), buy_cta_top:top(q('#buy .btn, #buy a.btn, #buy button')), listprice_n:document.querySelectorAll('[data-list-price]').length, gnb};
    }, vp.h);
    rows.push({vp:vp.n,page:p,errors:errs,...m});
    await pg.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${out}/metrics.json`,JSON.stringify(rows,null,1));
for(const r of rows) console.log(r.vp,r.page,'h1=',r.h1,'docH=',r.docH,'scrollW=',r.scrollW,'pband_top=',r.pband_top,'buy_top=',r.buy_top,'buy_cta=',r.buy_cta_top,'lp=',r.listprice_n,'err=',r.errors.length);
