// 내가 산 것 (owned) — 구매한 회원이 판매 면 위에서 바로 다음 행동을 고른다.
// Why (2026-09-13 학생 피드백): 스튜디오 탭이 판매 면(programs/studio.html)으로 열리고, 그 면은 회원이 무엇을 샀는지 모른다.
//   산 단위 카드에 "구매하러 가기" 가 다시 보여 "또 사라는 건가" 로 읽혔고, 응시 진입은 MY 의 "응시하러 가기" 하나뿐이라 못 찾았다.
// 원천 = HH.me().entitlements (/api/auth/me 한 방, 읽기만). 응시 진입 = POST /api/studio/token (my.html .sgo 와 같은 계약).
// 마운트 = <div data-owned [data-owned-prefix="../"] [data-owned-guest="none"] hidden></div>. 카드 = article[data-r3-unit] (판매 면, 앱 면 공용).
(function(){
  if(!window.HH) return;
  var esc=HH.esc;
  var ENT_ID_RE=/^ent[A-Za-z0-9_]{1,80}$/;
  // 단위 코드 → 표시 이름. app.js UNITS(판매 5종) 밖의 9/14 개시 단위도 권리가 오면 이름을 붙인다
  var UNIT_LABEL={'korea-hum':'고려대 계열적합 인문','korea-sci':'고려대 계열적합 자연','yonsei-hum':'연세대 활동우수 인문통합','yonsei-sci':'연세대 활동우수 자연','yonsei-intl':'연세대 국제형','korea-eq-hum':'고려대 고른기회 인문','korea-eq-sci':'고려대 고른기회 자연','yonsei-mirae':'연세대 미래캠퍼스'};
  var BD_TITLE={'guide-all-view':'2027 서류기반면접 가이드북 전권 열람권','guide-all-pdf':'2027 서류기반면접 가이드북 전권 PDF 소장판'};
  var KIND={studio_passage:'지문 낱권 이용권',studio_school:'단위 전권 이용권'};

  // set_id → 단위 코드. app.js SET_ID_RE 와 같은 접두 어휘 (korea_2027_h, korea_gorun_2027_s, yonsei_intl_2027_i ...)
  function unitOfSet(id){
    id=String(id||'');
    if(/^korea_gorun_2027_h/.test(id)) return 'korea-eq-hum';
    if(/^korea_gorun_2027_s/.test(id)) return 'korea-eq-sci';
    if(/^korea_2027_h/.test(id)) return 'korea-hum';
    if(/^korea_2027_s/.test(id)) return 'korea-sci';
    if(/^yonsei_intl_2027_/.test(id)) return 'yonsei-intl';
    if(/^yonsei_2027_h/.test(id)) return 'yonsei-hum';
    if(/^yonsei_2027_s/.test(id)) return 'yonsei-sci';
    return '';
  }
  // 권리 행 → 단위 코드. 전권은 meta.unit_code 또는 sku pass-<unit> (서버 pay.js entSetRe 와 같은 순서), 낱권은 결속 세트로 역산
  function unitOfEnt(e){
    var m=e._meta||{}, u=String(m.unit_code||'');
    if(!u && /^pass-/.test(String(m.sku||''))) u=String(m.sku).slice(5);
    if(!u && m.set_id) u=unitOfSet(m.set_id);
    return UNIT_LABEL[u]?u:'';
  }
  function slugOf(meta){ return (meta.slug)||String(meta.file_key||'').replace(/^library\//,'').replace(/\.pdf$/,''); }
  function live(e){ return !!e._live; }
  function day(s){ return String(s||'').slice(0,10); }

  var _owned=null;
  async function owned(force){
    if(_owned && !force) return _owned;
    var st=await HH.me(force);
    var o={member:st.member||null, error:st.error||null, trial:!!st.trial_available, studio:[], lecture:[], guide:{singles:[],bundles:{}}, units:{}, sets:{}, slugs:{}, any:false};
    if(!o.member){ _owned=o; return o; }
    var now=Date.now();
    (st.entitlements||[]).forEach(function(e){
      var meta={}; try{ meta=JSON.parse(e.meta||'{}'); }catch(err){}
      if(!meta||typeof meta!=='object') meta={};
      e._meta=meta;
      e._expired=!!(e.expires_at && Date.parse(e.expires_at)<=now);
      // 만료된 권리는 서버가 거절한다 (lecture.js, reader.js). 행동 목록과 보유 표시에서 뺀다 (astra r1 M1)
      if(e.kind==='lecture'){ if(!e._expired) o.lecture.push(e); return; }
      if(e.kind==='studio_school'||e.kind==='studio_passage'){
        e._unit=unitOfEnt(e);
        e._set=HH.okSetId(meta.set_id)?String(meta.set_id):'';
        // 서버 trial.js 가 여는 권리 = 미만료 + (전권 또는 잔여 > 0). 같은 기준으로만 "응시하러 가기" 를 단다
        e._live=!e._expired && (e.kind==='studio_school' || e.uses_left==null || HH.intIn(e.uses_left,0,9999,0)>0);
        o.studio.push(e);
        if(e._unit){ var u=o.units[e._unit]=o.units[e._unit]||{school:[],passage:[]}; u[e.kind==='studio_school'?'school':'passage'].push(e); }
        if(e._set) o.sets[e._set]=e;
        return;
      }
      if(e.kind==='download'||e.kind==='file_download'){
        if(e._expired) return;
        e._slug=slugOf(meta);
        if(meta.bundle){ var g=o.guide.bundles[meta.bundle]=o.guide.bundles[meta.bundle]||{view:[],file:[]}; g[e.kind==='file_download'?'file':'view'].push(e); }
        else o.guide.singles.push(e);
        if(e._slug) o.slugs[e._slug]=e;
      }
    });
    o.any=!!(o.studio.length||o.lecture.length||o.guide.singles.length||Object.keys(o.guide.bundles).length);
    _owned=o; return o;
  }

  // 스튜디오 진입. 휴대폰(coarse pointer)은 같은 탭으로 간다: fetch 뒤의 window.open 은 iOS Safari 가 팝업으로 막고,
  // 학생은 대부분 휴대폰이다. 데스크톱은 새 탭 (이용권 면을 뒤에 남긴다)
  async function studioGo(el){
    var sid=(el&&el.dataset.setId)||'', eid=(el&&el.dataset.ent)||'', body={};
    if(HH.okSetId(sid)) body.set_id=sid;
    if(ENT_ID_RE.test(eid)) body.entitlement_id=eid;
    var opt=Object.keys(body).length?{method:'POST',body:JSON.stringify(body)}:{method:'POST'};
    var coarse=!!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
    // 데스크톱은 클릭 시점(사용자 제스처 안)에 빈 창을 먼저 연다. fetch 뒤에 열면 Safari 가 팝업으로 막고,
    // 'noopener' 는 성공해도 null 을 돌려줘 차단을 가릴 수 없다. 창을 못 열면 같은 탭으로 간다
    var w=null; if(!coarse){ try{ w=window.open('','_blank'); }catch(e){ w=null; } if(w){ try{ w.opener=null; }catch(e){} } }
    var t0=el&&el.textContent; if(el){ el.disabled=true; el.setAttribute('aria-busy','true'); }
    try{
      var r=await HH.api('/api/studio/token',opt);
      if(!r||!/^https:\/\//.test(String(r.url||''))) throw new Error('스튜디오 주소를 받지 못했습니다');
      if(w && !w.closed){ w.location.replace(r.url); return; }
      location.assign(r.url);
    }catch(e){ if(w && !w.closed){ try{ w.close(); }catch(err){} } alert((e&&e.message)||'이용권을 확인하지 못했습니다'); }
    finally{ if(el){ el.disabled=false; el.removeAttribute('aria-busy'); if(t0!=null) el.textContent=t0; } }
  }
  function bind(root){
    (root||document).querySelectorAll('[data-owned-go]:not([data-owned-bound])').forEach(function(b){
      b.dataset.ownedBound='1';
      b.addEventListener('click',function(ev){ ev.preventDefault(); studioGo(b); });
    });
  }

  function studioTitle(e){
    if(e._meta.title) return String(e._meta.title);
    var u=UNIT_LABEL[e._unit];
    return u ? u+(e.kind==='studio_school'?' 전권 이용권':' 지문 낱권') : (KIND[e.kind]||e.kind);
  }
  function goBtn(e, cls){
    return '<button type="button" class="'+(cls||'btn sm')+'" data-owned-go'
      +(e._set&&e.kind==='studio_passage'?' data-set-id="'+esc(e._set)+'"':'')
      +(e.id?' data-ent="'+esc(e.id)+'"':'')+'>응시하러 가기</button>';
  }
  function items(o, pre){
    var out=[];
    o.studio.filter(live).forEach(function(e){
      var st=[];
      if(e.kind==='studio_passage'&&e.uses_left!=null) st.push('잔여 응시 '+HH.intIn(e.uses_left,0,9999,0)+'회');
      if(e.expires_at) st.push(day(e.expires_at)+'까지');
      out.push({nm:esc(studioTitle(e)), st:st.join(', '), op:goBtn(e)});
    });
    if(o.lecture.length) out.push({nm:'풀이법 해설 인강', st:'공개된 편부터 시청, 이어보기', op:'<a class="btn sm" href="'+pre+'classroom.html">인강 보기</a>'});
    Object.keys(o.guide.bundles).forEach(function(sku){
      var g=o.guide.bundles[sku], n=g.file.length||g.view.length;
      out.push({nm:esc(BD_TITLE[sku]||'가이드북 전권 이용권'), st:n+'권, 보안 뷰어 열람', op:'<a class="btn sm" href="'+pre+'library.html">자료실에서 열람</a>'});
    });
    // 낱권 PDF 소장판은 열람(download)과 파일(file_download) 두 행으로 온다. 같은 slug 는 한 줄, 버튼은 열람 하나 + 내려받기 링크
    var bySlug={}, order=[];
    o.guide.singles.forEach(function(e){ var k=e._slug||e.id; if(!bySlug[k]){ bySlug[k]={view:null,file:null,title:e._meta.title||e._slug}; order.push(k); } bySlug[k][e.kind==='file_download'?'file':'view']=e; });
    order.forEach(function(k){
      var g=bySlug[k], view=g.view||g.file;
      var op=g.view
        ? '<a class="btn sm" href="'+pre+'reader.html?slug='+encodeURIComponent(view._slug)+'">열람하기</a>'+(g.file?'<a class="tlink" href="'+pre+'my.html">PDF 내려받기</a>':'')
        : '<a class="btn sm" href="'+pre+'my.html">MY에서 내려받기</a>';
      out.push({nm:esc(g.title), st:g.file?'보안 뷰어 열람, PDF 소장판':'보안 뷰어 열람', op:op});
    });
    if(o.trial && !o.studio.some(live)) out.push({nm:'스튜디오 무료 체험', st:'신규 회원 무료 응시 1회', op:'<button type="button" class="btn ghost sm" data-owned-go>체험 응시</button>'});
    return out;
  }

  async function mount(el){
    var pre=el.dataset.ownedPrefix||'', guest=el.dataset.ownedGuest||'line';
    var o=await owned();
    if(!o.member){
      if(guest==='none'||o.error){ el.hidden=true; return; }
      var here=location.pathname.replace(/^\/+/,'')||'index.html';
      el.innerHTML='<p class="owned-guest">이미 구매하셨나요? <a class="tlink" href="'+pre+'login.html?next='+encodeURIComponent(here)+'">로그인</a>하면 산 것과 응시 버튼이 여기에 보입니다.</p>';
      el.hidden=false; return;
    }
    var list=items(o,pre);
    if(!list.length){ el.hidden=true; return; }
    // 첫 항목만 채움 버튼, 둘째부터는 괘선 버튼 (무게 차등, critic P1). 4건째부터는 접는다 (400 에서 첫 화면을 다 먹지 않게, critic P2)
    var SHOW=3;
    function row(i,idx){ var op=idx?i.op.replace(/class="btn sm"/g,'class="btn ghost sm"'):i.op; return '<li><div><p class="nm">'+i.nm+'</p>'+(i.st?'<p class="st">'+esc(i.st)+'</p>':'')+'</div><div class="ops">'+op+'</div></li>'; }
    var head=list.slice(0,SHOW).map(row).join(''), rest=list.slice(SHOW).map(function(i,k){ return row(i,k+SHOW); }).join('');
    el.innerHTML='<section class="owned" aria-labelledby="ownedT"><div class="owned-h"><h2 id="ownedT">내가 산 것</h2><a class="tlink" href="'+pre+'my.html">MY에서 전체 보기</a></div>'
      +'<ul class="owned-list">'+head+'</ul>'
      +(rest?'<details class="owned-more"><summary>나머지 '+(list.length-SHOW)+'개 펼치기</summary><ul class="owned-list">'+rest+'</ul></details>':'')
      +(o.studio.some(live)?'<p class="owned-note">응시 순서는 응시하러 가기, 세트 고르기, 면접 시작입니다. 점수와 첨삭은 MY 응시 기록에서 봅니다.</p>':'')
      +'</section>';
    el.hidden=false;
    bind(el);
  }

  // 단위 카드: 산 단위는 "구매하러 가기" 나 "담기" 대신 "응시하러 가기" 를, 배지는 "판매 중" 대신 보유 상태를 보인다.
  // 낱권만 보유한 단위는 나머지 지문을 더 살 수 있으니 구매 경로를 남긴다. 만료된 권리만 있는 단위는 그대로 둔다 (다시 사야 한다)
  function applyUnits(root){
    var o=_owned; if(!o||!o.member) return;
    (root||document).querySelectorAll('article[data-r3-unit]:not([data-owned-applied])').forEach(function(card){
      var u=o.units[card.dataset.r3Unit]; if(!u) return;
      var school=u.school.filter(live)[0], passages=u.passage.filter(live);
      if(!school && !passages.length) return;
      card.dataset.ownedApplied='1';
      var badge=card.querySelector('.r3-unit-badge');
      if(badge){ badge.textContent=school?('보유 중'+(school.expires_at?', '+day(school.expires_at)+'까지':'')):('지문 '+passages.length+'편 보유'); badge.classList.add('own'); }
      var foot=card.querySelector('.foot'); if(!foot) return;
      var buy=foot.querySelector('[data-r3-unit-buy],[data-r3-unit-cart]');
      // 판매 면 카드는 "출제 유형과 풀이법 보기" 가 채움 버튼이다. 산 단위에서는 응시가 1차 행동이므로 나머지 채움 버튼을 괘선으로 낮춘다
      foot.querySelectorAll('.btn:not(.ghost)').forEach(function(x){ x.classList.add('ghost'); });
      var tmp=document.createElement('div'); tmp.innerHTML=goBtn(school||passages[0]); var go=tmp.firstChild;
      if(school && buy) buy.remove();
      foot.insertBefore(go, foot.firstChild);   // 응시가 1차 행동: foot 첫 자리, 채움 버튼은 이것 하나 (critic P1)
    });
    bind(root);
  }
  // 자료실 목록: 산 권은 "구매" 링크 대신 "보유 중" 을 보인다 (열람하기 버튼은 그대로)
  function applyLibrary(){
    var o=_owned; if(!o||!o.member) return;
    document.querySelectorAll('.liblist .lf').forEach(function(li){
      var b=li.querySelector('.dl[data-slug]'); if(!b) return;
      if(!o.slugs[b.dataset.slug]) return;
      li.classList.add('own');
      var a=li.querySelector('.meta .m a');
      if(a){ var s=document.createElement('span'); s.className='own-tag'; s.textContent='보유 중'; a.replaceWith(s); }
      b.classList.remove('ghost');
    });
  }
  // 면 머리의 체험 링크(studio.html #trialGo): 산 회원에게 "체험 응시" 라고 쓰면 무료 상품으로 읽힌다. 상태에 맞는 이름만 바꾼다 (핸들러는 면의 것)
  function applyEntry(){
    var o=_owned; if(!o) return;
    document.querySelectorAll('[data-owned-entry]').forEach(function(el){
      if(!o.member){ el.textContent='가입하고 체험 응시 1회'; return; }
      if(o.studio.some(live)){ el.textContent='응시하러 가기'; return; }
      if(!o.trial) el.hidden=true;
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    var mounts=document.querySelectorAll('[data-owned]');
    owned().then(function(){
      mounts.forEach(function(el){ mount(el); });
      applyUnits(); applyLibrary(); applyEntry();
    }).catch(function(){ mounts.forEach(function(el){ el.hidden=true; }); });
  });
  HH.owned=owned; HH.studioGo=studioGo; HH.ownedApplyUnits=applyUnits; HH.ownedBind=bind;
})();
