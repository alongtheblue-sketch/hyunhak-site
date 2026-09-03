#!/usr/bin/env python3
"""홈 index.html 히어로 개편 (2026-09-03 건우 지시, 멱등). --check = 변경 없이 상태만.
1) 卷 색인 레일(nav.rail + 가격 foot) 제거 + 그 IntersectionObserver JS 제거, .book 단일 열
2) 히어로 = 좌 문안(eyebrow, h1, 두 상품 4버튼, 리드) + 우 브랜드 영상(autoplay muted loop playsinline, 일시정지 버튼)
3) 첫 화면 상품 접근: 가이드북 [고르기 / 지원대학 가이드북이란?] 스튜디오 [응시 단위 고르기 / 면접 스튜디오란?] + 체험 응시 링크(heroTrial 유지)
재실행 시 변경 0."""
import pathlib, re, sys
SITE = pathlib.Path.home() / 'Workspace/hyunhak-site'
P = SITE / 'index.html'
check = '--check' in sys.argv
t = P.read_text(encoding='utf-8'); orig = t

# 1) rail 제거
t, n_rail = re.subn(r'<nav class="rail" aria-label="차례">.*?</nav>\n\n', '', t, count=1, flags=re.S)
t, n_js = re.subn(r"  // 卷 색인: 보이는 지면에 맞춰 활성 표시\n  var idx=document\.querySelectorAll\('nav\.rail \.idx a'\);\n  if\(idx\.length&&'IntersectionObserver'in window\)\{\n.*?\n  \}\n", '', t, count=1, flags=re.S)

# 2) 히어로 본문
HERO_RE = re.compile(r'  <span class="eyebrow">2027 대입 면접</span>\n  (<h1>.*?</h1>)\n  (<div class="lede2">.*?</div>)\n  <div class="cta"><a class="btn" href="guidebook/index.html">지원 대학 가이드북 보기 <span class="ar" aria-hidden="true">→</span></a><a class="btn" href="studio.html#trialGo" id="heroTrial">체험 응시 1회 시작</a></div>\n', re.S)
m = HERO_RE.search(t)
n_hero = 0
if m:
    h1, lede = m.group(1), m.group(2)
    new = f'''  <div class="herotop">
    <div class="herohead">
      <span class="eyebrow">2027 대입 면접</span>
      {h1}
    </div>
    <div class="herosay">
      <div class="prodcta" aria-label="두 상품 바로 가기">
        <div class="pc">
          <span class="k">서류기반면접 가이드북</span>
          <div class="bs"><a class="btn" href="guidebook/index.html">가이드북 고르기 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="programs/guidebook.html">지원대학 가이드북이란?</a></div>
        </div>
        <div class="pc">
          <span class="k">제시문 면접 스튜디오</span>
          <div class="bs"><a class="btn" href="studio.html#units">응시 단위 고르기 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="programs/studio.html">면접 스튜디오란?</a></div>
          <a class="tlink" href="studio.html#trialGo" id="heroTrial">체험 응시 1회 시작 <span class="ar" aria-hidden="true">→</span></a>
        </div>
      </div>
      {lede}
    </div>
    <figure class="herofilm">
      <video autoplay muted loop playsinline preload="auto" poster="assets/video/brand_60s_poster.png" aria-label="현학적 연구소 브랜드 영상, 60초" aria-describedby="hero-film-tx">
        <source src="assets/video/brand_60s_aigen.webm" type="video/webm">
        <source src="assets/video/brand_60s_aigen.mp4" type="video/mp4">
      </video>
      <button type="button" class="vpause" aria-pressed="false">일시정지</button>
      <p id="hero-film-tx" class="vh">영상 자막 원문. 검을 현 玄. 검되 붉은 기가 도는 것. 그윽하고 멂. 대학이 먼저 공개한 자료. 모집요강, 선행학습영향평가 보고서, 수험생 후기. 31권, 1,178면. 수록 질문 3,065. 말하는 장면을 촬영해 첨삭. 연세대, 고려대 제시문 면접 스튜디오. 현학적 연구소, 玄學的 研究所, hyunhak.com.</p>
    </figure>
  </div>
'''
    t = t[:m.start()] + new + t[m.end():]; n_hero = 1

# 3) CSS
CSS = '''/* 2026-09-03 건우 지시: 卷 레일 제거(단일 열), 히어로 = 브랜드 영상 + 두 상품 4버튼 */
.book{grid-template-columns:1fr}
@media (min-width:1000px){.page{padding-left:0}}
.hero .herotop{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--s5);align-items:start}
@media (min-width:900px){.hero .herotop{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s4) var(--s6);align-items:start}.hero .herohead{grid-column:1/-1}}
@media (max-width:899.98px){.hero .herofilm{order:-1}}
.hero .herofilm{margin:0;position:relative;background:var(--ink);border-radius:var(--r-md);overflow:hidden;box-shadow:0 18px 40px rgba(49,46,46,.18)}
.hero .herofilm video{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--ink)}
.hero .vpause{position:absolute;right:10px;bottom:10px;min-height:var(--tap);padding:0 14px;border:1px solid rgba(239,233,220,.6);border-radius:999px;background:rgba(49,46,46,.55);color:var(--paper);font:500 12px/1 var(--mono);cursor:pointer}
.hero .vpause:hover{background:rgba(49,46,46,.85)}
.hero .vpause:focus-visible{outline:2px solid var(--paper);outline-offset:2px}
.hero .vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.hero .prodcta{display:grid;grid-template-columns:1fr;gap:var(--s4);margin:var(--s4) 0;padding:var(--s4) 0;border-top:var(--rule);border-bottom:var(--rule)}
@media (min-width:600px){.hero .prodcta{grid-template-columns:1fr 1fr}}
.hero .prodcta .k{display:block;font-family:var(--mono);font-size:var(--t-xs);font-weight:500;letter-spacing:var(--tr-label);color:var(--gray);margin-bottom:var(--s2)}
.hero .prodcta .bs{display:flex;flex-wrap:wrap;gap:var(--s2)}
.hero .prodcta .tlink{margin-top:var(--s2)}
@media (max-width:899.98px){.hero .herotop{gap:var(--s3)}.hero .herohead h1{margin-bottom:0}}
@media (max-width:599.98px){.hero .prodcta{gap:var(--s3);margin:0 0 var(--s3);padding:var(--s3) 0}}
'''
n_css = 0
if '.hero .herotop{' not in t:
    t = t.replace('</style>', CSS + '</style>', 1); n_css = 1

# 4) JS (영상 강제 재생 + 일시정지)
JS = '''<script>
// 히어로 브랜드 영상: 항상 자동 무한 재생(muted). 자동재생이 막히면 첫 상호작용·가시성 복귀에서 재시도. 일시정지 버튼 = WCAG 2.2.2 정지 수단
(function(){
  var v=document.querySelector('.herofilm video'), b=document.querySelector('.herofilm .vpause'); if(!v) return;
  v.muted=true; v.defaultMuted=true;
  function go(){ if(v.dataset.paused) return; var p=v.play(); if(p&&p.catch) p.catch(function(){}); }
  go(); v.addEventListener('canplay',go,{once:true});
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) go(); });
  ['pointerdown','keydown','touchstart'].forEach(function(ev){ document.addEventListener(ev,function(){ if(v.paused) go(); },{once:true,passive:true}); });
  if(b) b.addEventListener('click',function(){
    if(v.dataset.paused){ delete v.dataset.paused; go(); b.textContent='일시정지'; b.setAttribute('aria-pressed','false'); }
    else { v.dataset.paused='1'; v.pause(); b.textContent='재생'; b.setAttribute('aria-pressed','true'); }
  });
})();
</script>
'''
n_jsadd = 0
if '.herofilm video' not in t.split('<script>')[-1] if '<script>' in t else True:
    pass
if "querySelector('.herofilm video')" not in t:
    t = t.replace('</body>', JS + '</body>', 1); n_jsadd = 1

changed = t != orig
print(f'rail={n_rail} railjs={n_js} hero={n_hero} css={n_css} js={n_jsadd} changed={changed}')
if check:
    sys.exit(0)
if changed:
    P.write_text(t, encoding='utf-8'); print('written', P)
