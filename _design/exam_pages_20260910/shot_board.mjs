// 보드 스크린샷 + 시안 6본 실측. 실측 항목은 SELF_CHECK.md 표와 1:1 이다.
//   가로 넘침 · 표 셀이 뷰포트를 넘는지 · 44/48 미달 히트박스 · 포커스 대비 · 본문 대비
//   · 금지 글자 · 조판 오라클(자간 행간 실측) · 8 배수 정합 · 자리표 수 · 잠금 블록과 띠의 오른쪽 끝
// 실행: python3 -m http.server 8911 --bind 127.0.0.1 (사이트 뿌리) 후  node shot_board.mjs
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const OUT  = '/Users/gregory/Workspace/hyunhak-site/_design/exam_pages_20260910';
const BASE = 'http://127.0.0.1:8911/_design/exam_pages_20260910';
const FILES = ['tpl_A.html','tpl_A_open.html','tpl_B.html','tpl_B_open.html','tpl_C.html','tpl_C_open.html'];
const b = await chromium.launch();

// ── 보드 스크린샷 ──
for (const w of [1280, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await pg.goto(`${BASE}/board.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForTimeout(5000);
  await pg.evaluate(() => { document.querySelectorAll('.vp iframe').forEach(f => {
    var box=f.parentNode, w=+f.getAttribute('width'), s=Math.min(1, box.clientWidth/w);
    f.style.width=w+'px'; f.style.transform='scale('+s+')';
    var d=f.contentDocument, h=Math.max(d.documentElement.scrollHeight, d.body.scrollHeight);
    f.style.height=h+'px'; box.style.height=Math.ceil(h*s)+'px'; }); });
  await pg.waitForTimeout(1200);
  await pg.screenshot({ path: `${OUT}/board_${w}.png`, fullPage: true });
  console.log(JSON.stringify({ board: w, errors: errs }));
  await ctx.close();
}

const MEASURE = () => {
  const de = document.documentElement;
  const L = (h) => { const c=[1,3,5].map((i,k)=>parseInt(h.slice(2*k+1,2*k+3),16)/255)
      .map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const hex = (rgb) => { const m=rgb.match(/[\d.]+/g); if(!m) return null;
      return '#'+m.slice(0,3).map(x=>Math.round(+x).toString(16).padStart(2,'0')).join(''); };
  const over = (rgb, bgHex) => { const m=rgb.match(/[\d.]+/g); if(!m) return null;
      const a = m.length>3 ? +m[3] : 1; if(a>=1) return hex(rgb);
      const bb=[1,3,5].map((i,k)=>parseInt(bgHex.slice(2*k+1,2*k+3),16));
      return '#'+[0,1,2].map(i=>Math.round(+m[i]*a + bb[i]*(1-a)).toString(16).padStart(2,'0')).join(''); };
  const cr = (a,b2) => { const la=L(a), lb=L(b2); return +(((Math.max(la,lb)+.05)/(Math.min(la,lb)+.05)).toFixed(2)); };
  const bgOf = (el) => { let n=el; while(n && n!==de){ const c=getComputedStyle(n).backgroundColor;
      const m=c.match(/[\d.]+/g); if(m && (m.length<4 || +m[3]>0.9)) return hex(c); n=n.parentElement; } return '#F4EFE3'; };

  // 1) 히트박스: 한글 하한 48, WCAG 하한 44
  const small = [];
  for (const el of document.querySelectorAll('a[href],button,summary,[tabindex]:not([tabindex="-1"])')) {
    const q = el.getBoundingClientRect();
    if (q.width === 0 && q.height === 0) continue;
    if (q.height < 44) small.push((el.textContent.trim().slice(0,14)||el.className)+' '+Math.round(q.width)+'x'+Math.round(q.height));
  }
  const small48 = [];
  for (const el of document.querySelectorAll('a[href],button,summary')) {
    const q = el.getBoundingClientRect(); if (q.width===0&&q.height===0) continue;
    if (q.height < 48) small48.push((el.textContent.trim().slice(0,14)||el.className)+' h'+Math.round(q.height));
  }
  // 2) 포커스 아웃라인 대비 (:focus-visible 은 2px solid var(--ink))
  // 아웃라인은 outline-offset 만큼 요소 *바깥*에 그려진다. 기준 배경을 대상 자신에서 가져오면
  // 잉크 버튼이 늘 1.00 으로 나와 거짓 결함이 되고, 진짜로 안 보이는 자리는 묻힌다.
  const foc=[]; for (const el of document.querySelectorAll('a[href],button,summary')) {
    const cs=getComputedStyle(el); const off=parseFloat(cs.outlineOffset)||0;
    const ref = off>0 ? bgOf(el.parentElement||el) : bgOf(el);
    const oc=over(cs.outlineColor&&cs.outlineColor!=='rgb(0, 0, 0)'?cs.outlineColor:'rgb(49,46,46)', ref);
    if(oc&&ref) foc.push({t:(el.textContent.trim().slice(0,10)||el.className),oc,ref,cr:cr(oc,ref)}); }
  const focMin = foc.length?Math.min(...foc.map(f=>f.cr)):null;
  const focBad = foc.filter(f=>f.cr<3).map(f=>f.t+' '+f.cr);
  // 3) 본문 대비 표본: 실제 칠해진 배경 위 합성
  const texts=[];
  for (const sel of ['.pagehead .lede','.pagehead .lede b','.aeo-answer','.anch a','.anch a[aria-current="true"]',
      '.page .note','.xspec .r>dt','.xspec .r>dd','.xspec .r>dd .sec','.fnlist li','.fnlist li>span:first-child',
      '.xtype h3','.xtype .def','.xtype .q','.xtype .n .k','.xtype .n b','.xrules li','.xtime .row .st','.xtime .row .sec',
      '.xtime .row .do','.xlock h3','.xlock ul li','.xlock .note','.xdoc .doc_head .t','.xdoc .pass p','.xdoc .qs li',
      '.xsteps li h4','.xsteps li p','.xsteps li.off p','.xfirst p','.xfirst .k','.xtrap .k','.xtrap p',
      '.xpit h3','.xpit p','.xplan .st h3','.xplan .st p','.xplan .st .k','.xmat li','.xmat li b','.ph',
      'details.faq summary','details.faq .a p','.xcon .tel','.xcon p','.xsib a','.xsib a[aria-current="page"]',
      '.xsoon h3','.xsoon p','.xsoon .d','.tlink','.btn','.badge','.badge.mute']) {
    const el=document.querySelector(sel); if(!el) continue;
    const cs=getComputedStyle(el); const bg=bgOf(el); const fg=over(cs.color,bg);
    if(fg&&bg) texts.push({sel,fg,bg,cr:cr(fg,bg),px:+parseFloat(cs.fontSize).toFixed(1),
      w:cs.fontWeight, ls:cs.letterSpacing, lh:cs.lineHeight});
  }
  const txtMin = texts.length?Math.min(...texts.map(t=>t.cr)):null;
  // 큰 글씨(18.66px+ bold 또는 24px+)는 3:1, 그 밖은 4.5:1
  const big = t => (t.px>=24)||(t.px>=18.66 && +t.w>=700);
  const txtBad = texts.filter(t=>t.cr < (big(t)?3:4.5)).map(t=>t.sel+' '+t.fg+'/'+t.bg+' '+t.cr+' @'+t.px+'px/'+t.w);

  // 4) 반응형 바인딩 층: 표 성격 요소의 오른쪽 끝이 뷰포트를 넘는가 (힌트 있는 스크롤은 면제)
  const vw = de.clientWidth;
  const cut = [];
  for (const sel of ['.xspec .r>dd','.xspec .r>dt','.xtype h3','.xtype .def','.xtype .q','.xtype .n',
                     '.xtime .row .do','.xtime .row .sec','.xdoc .pass p','.xdoc .qs li','.xmat li','.xmat li b',
                     '.xsteps li p','.xpit p','.xplan .st p','.xsoon h3','.xcon .tel','.fnlist li']) {
    for (const el of document.querySelectorAll(sel)) {
      const q = el.getBoundingClientRect();
      // 가로 스크롤이 허용된 조상(.anch) 안이면 면제
      let n=el, scrollable=false;
      while(n&&n!==de){ const o=getComputedStyle(n).overflowX; if(o==='auto'||o==='scroll'){scrollable=true;break;} n=n.parentElement; }
      if (!scrollable && q.right > vw + 0.5) cut.push(sel+' right '+Math.round(q.right)+' > vw '+vw);
    }
  }
  // 4b) 세로 깔림: grid 자식 수가 열 수와 어긋나면 글이 한 칸 폭으로 밀려 한 글자씩 쌓인다.
  //     (실측으로 잡은 결함: .xrules 문장 안의 <b>, .xlock 의 잉여 <span> 이 저마다 격자 칸이 됐다)
  //     오라클은 내용에서 유도한다. 글자 4자 이상인데 상자 폭이 글자 크기의 2.5배 미만이면 깔린 것이다.
  const vstack = [];
  for (const el of document.querySelectorAll('main p,main span,main b,main li,main dd,main dt,main h3,main h4')) {
    if (el.children.length) continue;
    const s = (el.textContent||'').trim(); if (s.length < 4) continue;
    const q = el.getBoundingClientRect(); if (!q.width) continue;
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    // 폭/글자크기 비는 숫자 글리프가 좁아 "100%" 같은 정상 문자열을 거짓양성으로 잡는다(실측 24건).
    // 줄 수로 잰다. 글자마다 한 줄이면 깔린 것이고, 이 비는 글리프 폭과 무관하다.
    const lines = Math.round(q.height / lh);
    if (lines >= s.length * 0.8) vstack.push((el.className||el.tagName)+' "'+s.slice(0,10)+'" '+lines+'줄/'+s.length+'자');
  }

  // 5) 요소별 가로 넘침 (scrollWidth > clientWidth, 스크롤 허용 조상 밖)
  const ovf = [];
  for (const el of document.querySelectorAll('main *')) {
    if (el.scrollWidth - el.clientWidth > 1) {
      const o=getComputedStyle(el).overflowX; if(o==='auto'||o==='scroll') continue;
      ovf.push((el.className||el.tagName)+' '+el.scrollWidth+'>'+el.clientWidth);
    }
  }
  // 6) 8 배수 정합 (margin padding gap 실측)
  let tot=0, ok8=0; const off8=[];
  for (const el of document.querySelectorAll('main *')) {
    const cs=getComputedStyle(el);
    for (const p of ['marginTop','marginBottom','paddingTop','paddingBottom','paddingLeft','paddingRight','rowGap','columnGap']) {
      const v=parseFloat(cs[p]); if(!v||Number.isNaN(v)) continue; tot++;
      if (Math.abs(v%8)<0.5||Math.abs(v%8-8)<0.5) ok8++;
      else if (Math.abs(v%4)<0.5||Math.abs(v%4-4)<0.5) ok8++;   // 4pt sub-grid 허용
      else off8.push((el.className||el.tagName)+' '+p+' '+v);
    }
  }
  // 7) 금지 글자와 문안 게이트
  const txt = document.body.innerText;
  const banned = { mid:(txt.match(/·/g)||[]).length, dash:(txt.match(/—/g)||[]).length,
    excl:(txt.match(/!/g)||[]).length,
    sup:(txt.match(/최고|최상|최고의|1위|보장|합격을 보장|무조건/g)||[]).length,
    pass:(txt.match(/합격/g)||[]).length };
  const ph = document.querySelectorAll('.ph').length;
  const habN = (txt.match(/습니다|합니다|입니다/g)||[]).length;
  const daN  = (txt.match(/[가-힣]다\.|[가-힣]다\n/g)||[]).length;

  // 8) 조판 오라클: 역할별 실측 자간 행간
  const roles={};
  for (const [name,sel] of [['h1','.pagehead h1'],['lede','.pagehead .lede p'],['h2','.page h2.t'],
      ['spec_dd','.xspec .r>dd'],['type_def','.xtype .def'],['rule','.xrules li'],['pass','.xdoc .pass p'],
      ['faq_a','details.faq .a p'],['badge','.badge'],['num','.xtime .row .sec']]) {
    const el=document.querySelector(sel); if(!el) continue; const cs=getComputedStyle(el);
    const fs=parseFloat(cs.fontSize); const lh=parseFloat(cs.lineHeight);
    roles[name]={px:+fs.toFixed(1), lh:+(lh/fs).toFixed(3), ls:+(parseFloat(cs.letterSpacing||0)/fs).toFixed(4),
      ff:cs.fontFamily.split(',')[0].replace(/"/g,''), w:cs.fontWeight};
  }
  // 9) 잠금 블록과 오픈 예정 띠가 컨테이너 안에 드는가
  const band=(s)=>{const e=document.querySelector(s); if(!e) return null; const q=e.getBoundingClientRect();
    return {r:Math.round(q.right), b:Math.round(q.bottom), w:Math.round(q.width)};};
  // 10) 앵커 6개, 형제 8개, 이미지 0
  const anch=document.querySelectorAll('.anch a').length;
  const sib=document.querySelectorAll('.xsib li').length;
  const imgs=document.querySelectorAll('img,picture,video').length;
  const svgs=document.querySelectorAll('svg').length;
  const btns=document.querySelectorAll('.btn').length;

  return { vw, ox: de.scrollWidth - de.clientWidth, docH: Math.max(de.scrollHeight, document.body.scrollHeight),
    small, small48n: small48.length, small48: small48.slice(0,6), focMin, focBad, txtMin, txtBad, txtN: texts.length,
    cut, vstack, ovf, p8: +(100*ok8/Math.max(tot,1)).toFixed(1), off8: off8.slice(0,6), tot8: tot,
    banned, ph, habN, daN, textAlive: habN>0, roles,
    lock: band('.xlock'), soon: band('.xsoon'), doc: band('.xdoc'), spec: band('.xspec'),
    anch, sib, imgs, svgs, btns };
};

const rows = [];
for (const w of [1280, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  for (const f of FILES) {
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0,120)));
    await pg.goto(`${BASE}/${f}`, { waitUntil: 'load', timeout: 60000 });
    await pg.waitForTimeout(700);
    const m = await pg.evaluate(MEASURE);
    rows.push({ f, vw: w, err: errs.length, ...m });
    console.log(JSON.stringify({ f, vw: w, err: errs.length, ...m }));
    await pg.close();
  }
  await ctx.close();
}

// ── 결함 주입 대조군: 게이트가 살아 있는지 확인한다 (전건 통과는 팔 사망을 먼저 의심) ──
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 } });
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}/tpl_A.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForTimeout(700);
  const probe = await pg.evaluate((src) => {
    const F = new Function('return (' + src + ')()');
    const before = F();
    // 주입 1: 규격표 값 칸을 뷰포트 밖으로 밀어 표 잘림 검출기를 태운다
    const el = document.querySelector('.xspec .r>dd');
    el.style.width = '900px'; el.style.whiteSpace = 'nowrap'; el.textContent = 'X'.repeat(200);
    // 주입 2: 히트박스를 44 미만으로
    const a = document.querySelector('.xsib a'); a.style.minHeight='20px'; a.style.height='20px';
    // 주입 3: 금지 글자
    document.querySelector('.page .note').textContent = '가운뎃점 · 과 em대시 — 를 넣는다!';
    // 주입 4: 문장을 좁은 칸에 밀어 세로 깔림 검출기를 태운다
    const v = document.querySelector('.xrules li span'); v.style.display='block'; v.style.width='20px';
    const after = F();
    return { vstackBefore: before.vstack.length, vstackAfter: after.vstack.length,
             cutBefore: before.cut.length, cutAfter: after.cut.length,
             smallBefore: before.small.length, smallAfter: after.small.length,
             midBefore: before.banned.mid, midAfter: after.banned.mid,
             dashBefore: before.banned.dash, dashAfter: after.banned.dash,
             exclBefore: before.banned.excl, exclAfter: after.banned.excl };
  }, MEASURE.toString());
  console.log(JSON.stringify({ faultInjection: probe }));
  await ctx.close();
}
await b.close();
