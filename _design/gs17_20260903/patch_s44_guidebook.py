#!/usr/bin/env python3
"""s44 가이드북 소개 면 P2 묶음 패치 (GS-22-1~4, GS-24-2, GS-24-3, GS-24-4, GS-24-6). 멱등: 이미 적용된 파일이면 0건 치환 뒤 종료.
원천 = _design/guidebook_detail_20260903/build/build_page.py. 백업은 시각까지."""
import re, sys, shutil, datetime
from pathlib import Path
P = Path('/Users/gregory/Workspace/hyunhak-site/_design/guidebook_detail_20260903/build/build_page.py')
s = P.read_text(encoding='utf-8')
if 'GS-24-6 buybar' in s:
    print('already applied, no-op'); sys.exit(0)
bak = P.with_name(P.name + '.bak.' + datetime.datetime.now().strftime('%Y%m%d_%H%M') + '_pre_s44')
shutil.copy2(P, bak)
n_rep = 0
def rep(old, new, n=1):
    global s, n_rep
    c = s.count(old)
    assert c == n, (old[:70], 'expected', n, 'got', c)
    s = s.replace(old, new); n_rep += 1

# ---- GS-24-4 제목 단계: 리스트 항목 h4 21개 → h3 (스튜디오 S2 와 같은 방식). 시각 불변 규칙을 CSS 에 둔다.
html_start = s.index('HTML = ')
head, body = s[:html_start], s[html_start:]
c4 = body.count('<h4>')
assert c4 == 21 and body.count('</h4>') == 21, c4
body = body.replace('<h4>', '<h3>').replace('</h4>', '</h3>')
s = head + body; n_rep += 1
for cls in ['.forms', '.aud', '.pr', '.rail', '.price']:
    rep(f'{cls} h4{{font-size:var(--t-h4)', f'{cls} h3{{font-size:var(--t-h4)')
rep('.flow h4{font-size:var(--t-base);margin-bottom:var(--s1)}', '.flow h3{font-size:var(--t-base);margin-bottom:var(--s1)}')
rep('h4{font-weight:700;line-height:var(--lh-tight);letter-spacing:var(--tr-head)}',
    'h4{font-weight:700;line-height:var(--lh-tight);letter-spacing:var(--tr-head)}\n'
    '.forms h3,.aud h3,.pr h3,.rail h3,.flow h3,.price h3{font-weight:700;text-wrap:inherit}  /* GS-24-4: h2 직후 h4 21곳을 h3 로 승격(스튜디오 S2 와 동일). h4 계산값(weight 700, text-wrap 은 body 상속) 유지로 시각 불변 */')

# ---- GS-24-3 mono 한글 공백: JetBrains Mono 공백 0.584em 대 Pretendard 0.235em. 한글이 드는 mono 요소의 공백을 Pretendard 폭으로.
rep('.mono{font-family:var(--mono);font-size:var(--t-mono);letter-spacing:0}',
    '.mono{font-family:var(--mono);font-size:var(--t-mono);letter-spacing:0}\n'
    '/* GS-24-3: JetBrains Mono 에 한글이 없어 한글 라벨의 공백만 mono 폭(0.584em) 으로 찍혀 Pretendard 공백(0.235em) 의 2.4~3.0배. 한글이 드는 mono 요소의 공백을 -.35em 으로 Pretendard 폭에 맞춘다(계측 probe_s44.mjs monoKo) */\n'
    '.mono,.kicker,.top .tag,.blk h3,.two h3,.rail .n,.rail .pg,.openers span,.openers-cap,.part .sub,.sample .cap,.sample table th,.qs .src,.rule dt,.zoom figcaption,.pgv .cap,.bk .mt,.cmp th,.cmp td:first-child,.diff .d,.close .won{word-spacing:-.35em}  /* .buybar .nm 은 sans 라 제외(s44 실측: 포함하면 "보안리더열람,권당" 으로 붙음) */')

# ---- GS-22-4 목록 우회로를 ghost 버튼으로 (브랜드 가이드 §07: 1차 CTA 玄墨 fill 한 개, 보조는 테두리)
rep('<p class="tolist"><a class="tl" href="#books">31개 대학 목록 보기</a></p>',
    '<p class="tolist"><a class="btn ghost" href="#books">31개 대학 목록 보기 <span class="arr">↓</span></a></p>')
rep('.btn:hover{background:var(--brown);transform:translateY(-1px)}',
    '.btn:hover{background:var(--brown);transform:translateY(-1px)}\n'
    '.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink)}  /* GS-22-4: 보조 CTA 는 테두리(가이드 §07 버튼 행). 목록 우회로가 밑줄 글자만이라 안 띈다는 학부모 페르소나 지적 */\n'
    '.btn.ghost:hover{background:var(--ink);color:var(--paper)}')

# ---- GS-22-1·2·3 + GS-24-2 가격 카드
old_cards = '''    <ul class="price rv">
      <li><h3>보안 리더 열람판</h3><div class="won">33<span class="c">,</span>000<small>원, 권당</small></div>
        <ul><li>열람 기간 구매일부터 1개월</li><li>인쇄 권당 3회, 원본 파일 비제공</li><li>열지 않은 권은 7일 이내 청약철회</li></ul></li>
      <li><h3>PDF 소장판</h3><div class="won">110<span class="c">,</span>000<small>원, 권당</small></div>
        <ul><li>워터마크 파일 발급, 구매 계정 각인</li><li>파일 내려받기와 열람</li></ul></li>
      <li><h3>31개 대학 전권</h3><div class="won two">511<span class="c">,</span>500<small>원, 열람</small></div><div class="won two">1<span class="c">,</span>705<span class="c">,</span>000<small>원, PDF</small></div>
        <p class="calc">권당 33,000원 × 31권 = 1,023,000원의 절반</p>
        <p class="calc">PDF는 110,000원 × 31권 = 3,410,000원의 절반</p>
        <ul><li>여러 대학에 지원하는 학생, 학교와 학원 단위</li></ul><p class="pricefoot">합산 금액은 따로 파는 상품이 아닙니다.</p></li>
    </ul>
'''
new_cards = '''    <!-- GS-22-1: 전권 카드는 열람 전권 하나만 朱印 크기로, PDF 소장판 전권은 먹색 한 줄로 내려 두 상품의 위계를 가른다.
         GS-22-2: 절반 소구는 카드 밖 주석으로 내리고 카드 안은 권당 단가로 말한다(합산 표기는 유지, 문안 완화).
         GS-22-3: 권마다 분량이 달라도 값이 같은 이유를 열람판 카드 한 줄로.  GS-24-2: 세 카드 내용량을 맞춰 죽은 하단을 없앤다(계측 probe_s44.mjs priceCards). -->
    <ul class="price rv">
      <li><h3>보안 리더 열람판</h3><div class="won">33<span class="c">,</span>000<small>원, 권당</small></div>
        <ul><li>열람 기간 구매일부터 1개월</li><li>인쇄 권당 3회, 원본 파일 비제공</li><li>열지 않은 권은 7일 이내 청약철회</li><li>면수와 질문 수는 권마다 다르고, 값은 어느 대학이든 한 권에 같습니다</li></ul></li>
      <li><h3>PDF 소장판</h3><div class="won">110<span class="c">,</span>000<small>원, 권당</small></div>
        <ul><li>워터마크 파일 발급, 구매 계정 각인</li><li>파일 내려받기와 열람</li><li>파일이 발급된 뒤에는 청약철회가 제한됩니다</li></ul></li>
      <li><h3>31개 대학 전권</h3><div class="won two">511<span class="c">,</span>500<small>원, 열람 전권</small></div>
        <p class="alt">PDF 소장판 전권 <b>1<span class="c">,</span>705<span class="c">,</span>000</b>원</p>
        <ul><li>열람 전권은 권당 16,500원, PDF 전권은 권당 55,000원</li><li>여러 대학에 지원하는 학생, 학교와 학원 단위</li><li>환불액은 열지 않은 권수 비율로 산정</li></ul></li>
    </ul>
    <p class="pricenote rv">전권 값은 낱권 값을 31권 더한 금액의 절반입니다. 열람 33,000원 × 31권 = 1,023,000원, PDF 110,000원 × 31권 = 3,410,000원. 두 합산 금액은 낱권 값을 더한 수이며 따로 파는 상품이 아닙니다.</p>
'''
rep(old_cards, new_cards)
rep('.price .calc+.calc{margin-top:var(--s1);padding-top:0;border-top:0}',
    '.price .calc+.calc{margin-top:var(--s1);padding-top:0;border-top:0}\n'
    '.price .alt{font-size:var(--t-md);color:var(--body);line-height:1.5;margin-top:var(--s1)}  /* GS-22-1: 둘째 상품 값은 먹색, 본문 크기. 朱印 은 카드마다 하나 */\n'
    '.price .alt b{font-family:var(--mono);font-weight:500;font-size:var(--t-base);color:var(--ink);white-space:nowrap}\n'
    '.pricenote{font-size:var(--t-base);line-height:1.65;color:var(--body);margin-top:var(--s4);max-width:none}  /* GS-22-2: 절반 근거는 카드 밖 주석 16px (G1 하한) */')

# ---- GS-22-3 FAQ: 분량 질문 신설 + 여러 권 답 문안 완화
rep('''      <details><summary>여러 권을 사면</summary><div class="a">권당 33,000원. 31개 대학 전권 열람은 511,500원으로, 33,000원 × 31권 = 1,023,000원의 절반입니다. PDF 소장판 전권 1,705,000원은 110,000원 × 31권 = 3,410,000원의 절반입니다. 1,023,000원과 3,410,000원은 합산 금액이며 따로 파는 상품이 아닙니다. 학교와 학원 단위 좌석은 문의 이메일로.</div></details>''',
    '''      <details><summary>여러 권을 사면</summary><div class="a">권당 33,000원. 31개 대학 전권 열람은 511,500원으로 권당 16,500원이고, 낱권 값을 31권 더한 1,023,000원의 절반입니다. PDF 소장판 전권 1,705,000원은 권당 55,000원으로 낱권 합산 3,410,000원의 절반입니다. 두 합산 금액은 낱권 값을 더한 수이며 따로 파는 상품이 아닙니다. 학교와 학원 단위 좌석은 문의 이메일로.</div></details>
      <details><summary>얇은 권도 값이 같나</summary><div class="a">같습니다. 면수와 질문 수는 대학이 공개한 자료와 회수된 후기의 양에 따라 다르고, 값은 어느 대학이든 한 권 33,000원입니다. 권마다 면수와 질문 수를 목록에 적어 두었으니 구매 전 확인하실 수 있습니다.</div></details>''')

# ---- GS-24-6 (a) 면수·질문수 11px → 12px  (b) 390 마지막 행 고아 타일은 가운데로  (c) 스킵 링크  (d) 하단 구매 바
rep('.bk .mt{display:block;font-family:var(--mono);font-size:var(--t-xs);color:var(--gray);margin-top:2px;word-break:keep-all;line-height:1.6;height:1.6em}  /* 면수 질문수 1행분 */',
    '.bk .mt{display:block;font-family:var(--mono);font-size:var(--t-cap);color:var(--gray);margin-top:2px;word-break:keep-all;line-height:1.6;height:1.6em}  /* 면수 질문수 1행분. GS-24-6: 구매 변별 정보라 문서 최소 11px 에서 12px 로 */')
rep('  .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3) var(--s2)}\n',
    '  .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3) var(--s2)}\n'
    '  .grid>.bk:last-child:nth-child(3n+1){grid-column:1/-1;justify-self:center;width:calc((100% - 2*var(--s2))/3)}  /* GS-24-6: 31권은 3열에서 마지막 행이 1장. 홀로 남는 타일은 같은 폭으로 가운데에 */\n')
rep('<body>\n\n<header class="top">', '<body>\n<a class="skip" href="#main">본문으로 건너뛰기</a>\n\n<header class="top">')
rep('.btn.ghost:hover{background:var(--ink);color:var(--paper)}',
    '.btn.ghost:hover{background:var(--ink);color:var(--paper)}\n'
    '.skip{position:absolute;left:-9999px;top:0;z-index:100;background:var(--ink);color:var(--paper);padding:12px 18px;font-size:var(--t-sm)}  /* GS-24-6: 스킵 링크(스튜디오와 동일) */\n'
    '.skip:focus{left:0}')
rep('  --ink:#312E2E;--paper:#F4EFE3;--paper-2:#EDE7D8;--mat:#EBE4D4;--card:#FBF7EE;--gray:#696561;--body:#4A4644;',
    '  --ink:#312E2E;--paper:#F4EFE3;--paper-2:#EDE7D8;--mat:#EBE4D4;--card:#FBF7EE;--gray:#696561;--body:#4A4644;--paper-rgb:244,239,227;')
buybar_html = '''</footer>

<!-- 모바일 하단 구매 바 (900px 이하 상시). 왼쪽 가격 한 줄(#format 앵커), 오른쪽은 히어로 1차 CTA 의 복제 玄墨 fill 한 개. GS-24-6 buybar, 스튜디오 GS-17 B 와 같은 구조. 가이드 §07 v1.2 예외 명문화 -->
<div class="buybar" role="region" aria-label="가이드북 가격과 구매">
  <a class="lab" href="#format"><span class="nm">보안 리더 열람, 권당</span><span class="won">33<span class="c">,</span>000원</span></a>
  <a class="btn" href="{{GB}}">지원 대학 고르기 <span class="arr">→</span></a>
</div>

<script>
(function(){
  if(!('IntersectionObserver' in window)){document.querySelectorAll('.rv')'''
rep('''</footer>

<script>
(function(){
  if(!('IntersectionObserver' in window)){document.querySelectorAll('.rv')''', buybar_html)
buybar_css = '''
/* ---- GS-24-6: 900px 이하 하단 구매 바 2칸(스튜디오 GS-17 B 와 동일 구조). 왼쪽 가격 한 줄(#format 앵커), 오른쪽 1차 CTA 복제 玄墨 fill 하나. 배경은 --paper-rgb 토큰 ---- */
.buybar{display:none}
@media (max-width:900px){
  body{padding-bottom:calc(80px + env(safe-area-inset-bottom))}
  .buybar{display:flex;align-items:center;justify-content:space-between;gap:var(--s3);position:fixed;left:0;right:0;bottom:0;z-index:60;
    padding:8px var(--s3) calc(8px + env(safe-area-inset-bottom));background:rgba(var(--paper-rgb),.96);
    -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:var(--rule-strong)}
  .buybar .lab{display:flex;flex-direction:column;justify-content:center;min-height:44px;min-width:0;margin:0;color:var(--gray)}
  .buybar .nm{font-size:var(--t-xs);line-height:1.3;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--ink)}
  .buybar .won{display:block;margin-top:2px;font-family:var(--mono);font-weight:500;font-size:var(--t-h4);line-height:1.15;color:var(--seal);white-space:nowrap}
  .buybar .btn{flex:none;min-height:52px;padding:0 var(--s4);gap:var(--s2);font-size:var(--t-sm);border-radius:var(--r-md)}
}
@media (max-width:360px){
  .buybar .btn{padding:0 var(--s3)}
}
"""
'''
# CSS 문자열의 끝(""" 로 닫힘) 직전에 붙인다. CSS = r"""...""" 형태를 가정하고 첫 닫힘을 찾는다.
html_start = s.index('\nHTML = r"""')
css_end = s.rindex('"""', 0, html_start)   # CSS = r""" ... """ 의 닫는 세 따옴표(HTML 직전)
assert s[css_end - 1] == '\n' and s.index('CSS = r"""') < css_end
s = s[:css_end] + buybar_css.rstrip('\n').removesuffix('"""') + '\n' + s[css_end:]; n_rep += 1
P.write_text(s, encoding='utf-8')
print('applied', n_rep, 'replacements; backup', bak.name)
