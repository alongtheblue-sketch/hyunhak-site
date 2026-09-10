# -*- coding: utf-8 -*-
# board.html 생성기. 시안 6본을 iframe 으로 그대로 싣는다(srcdoc 사본을 만들지 않는다).
# 보드와 실측이 같은 파일을 보므로 보드가 낡을 자리가 없다.
# 실행: python3 _design/exam_pages_20260910/build_board.py
import os
D = os.path.dirname(os.path.abspath(__file__))

GROUPS = [
 ("A 문서형", "xa",
  "괘선 표 위주. 1단 판면과 --measure 를 지키고 유형 지도는 네 칸 괘선 표. "
  "시험지는 이중 괘선 테두리라 인쇄물을 인용한 꼴로 읽힌다. 규격표는 390 에서도 2열을 유지한다.",
  ("tpl_A.html", "tpl_A_open.html")),
 ("B 카드형", "xb",
  "유형 지도를 카드 격자로 세우고 규격표는 좁아지면 카드로 전환한다. "
  "시험지는 지면 배경(--card). 훑어보기가 빠른 대신 괘선 위계가 약해진다.",
  ("tpl_B.html", "tpl_B_open.html")),
 ("C 절차형", "xc",
  "준비 시간 배분을 세로 타임라인으로 세우고 유형 지도와 풀이 골격을 같은 축에 붙인다. "
  "시험지는 왼쪽 잉크 레일. 시간이 지배 차원이 되는 대신 지면이 길어진다.",
  ("tpl_C.html", "tpl_C_open.html")),
]

LABEL = {"tpl_A.html": "korea-hum 판매중", "tpl_A_open.html": "korea-eq-hum 오픈 예정",
         "tpl_B.html": "korea-hum 판매중", "tpl_B_open.html": "korea-eq-hum 오픈 예정",
         "tpl_C.html": "korea-hum 판매중", "tpl_C_open.html": "korea-eq-hum 오픈 예정"}

cards = []
for name, mod, note, files in GROUPS:
    rows = []
    for fn in files:
        rows.append('''
<article class="card">
  <header class="ch"><p class="tag">{mod}</p><h3>{lb}</h3><p class="src">{fn}</p></header>
  <div class="views">
    <figure><figcaption>데스크톱 1280</figcaption><div class="vp d"><iframe title="{lb} 데스크톱 1280" width="1280" src="{fn}" loading="eager"></iframe></div></figure>
    <figure><figcaption>모바일 390</figcaption><div class="vp m"><iframe title="{lb} 모바일 390" width="390" src="{fn}" loading="eager"></iframe></div></figure>
  </div>
</article>'''.format(mod=mod, lb=LABEL[fn], fn=fn))
    cards.append('<section class="grp"><h2>%s</h2><p class="gnote">%s</p>%s</section>' % (name, note, "".join(rows)))

board = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>전형별 면접 상세면 3안 보드, 현학적 연구소 2026-09-10</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="../../assets/base.css">
<style>
  html{background:#312E2E}
  body.board{background:#312E2E;color:#F4EFE3;font-family:var(--sans);padding:40px 40px 96px;line-height:1.6}
  .board h1{font-size:28px;font-weight:800;letter-spacing:-0.032em;line-height:1.32}
  .board .note{max-width:52em;color:rgba(244,239,227,.72);font-size:14px;margin-top:16px}
  .board .note b{color:#D0AC6E;font-weight:600}
  .board .grp{margin-top:72px}
  .board .grp>h2{font-size:22px;font-weight:800;letter-spacing:-0.032em;padding-bottom:12px;border-bottom:1px solid rgba(244,239,227,.45)}
  .board .gnote{font-size:13px;color:rgba(244,239,227,.72);margin-top:12px;max-width:52em}
  .board .card{margin-top:40px;padding-top:24px;border-top:1px solid rgba(244,239,227,.28)}
  .board .tag{font-family:var(--mono);font-size:11px;letter-spacing:.10em;color:#D0AC6E}
  .board .ch h3{font-size:20px;font-weight:800;letter-spacing:-0.032em;margin-top:4px}
  .board .src{font-family:var(--mono);font-size:11px;color:rgba(244,239,227,.5);margin-top:8px}
  .board .views{display:grid;grid-template-columns:minmax(0,1fr) 328px;gap:24px;margin-top:24px;align-items:start}
  @media (max-width:1000px){.board .views{grid-template-columns:minmax(0,1fr)}}
  @media (max-width:700px){body.board{padding:24px 16px 64px}.board .vp.m{max-width:100%}}
  .board figcaption{font-family:var(--mono);font-size:11px;letter-spacing:.10em;color:rgba(244,239,227,.6);margin-bottom:8px}
  .board .vp{overflow:hidden;background:#312E2E}
  .board .vp iframe{border:0;display:block;transform-origin:0 0;background:#F4EFE3}
</style></head>
<body class="board">
<h1>전형별 면접 출제 유형과 풀이법 상세면, 3안 보드 2026-09-10</h1>
<p class="note">한 템플릿(<b>tpl.html</b>)에서 <b>build_pages.py</b> 가 낸 여섯 본이다. 안 사이 차이는 <b>exam_page.css</b> 의
modifier <b>.xa .xb .xc</b> 뿐이고 마크업은 같다. 갈리는 자리는 셋이다.
<b>① 유형 지도</b>(괘선 표 / 카드 격자 / 세로 타임라인), <b>② 예시 문항 상자</b>(이중 괘선 / 지면 배경 / 잉크 레일),
<b>③ 규격표 모바일 처리</b>(2열 유지 / 카드 전환).
미리보기는 실제 <b>assets/base.css</b> 를 그대로 링크한 iframe 이다. 데스크톱 칸은 1280 폭을 축소해 보여 주므로
글자 크기는 실제가 아니다(모바일 칸은 390 실측 폭). 셸과 푸터와 모바일 바는 자리표 주석만 두고 그리지 않았다.
점선 밑줄 친 모노 글자는 <b>빌드가 채울 값 자리표</b>다.</p>
""" + "".join(cards) + """
<script>
function fit(f){
  var box=f.parentNode, w=+f.getAttribute('width'), s=Math.min(1, box.clientWidth/w);
  f.style.width=w+'px'; f.style.transform='scale('+s+')';
  try{
    var d=f.contentDocument, h=Math.max(d.documentElement.scrollHeight, d.body.scrollHeight);
    f.style.height=h+'px'; box.style.height=Math.ceil(h*s)+'px';
  }catch(e){ f.style.height='2400px'; box.style.height=Math.ceil(2400*s)+'px'; }
}
function fitAll(){ document.querySelectorAll('.vp iframe').forEach(fit); }
document.querySelectorAll('.vp iframe').forEach(function(f){ f.addEventListener('load', function(){ fit(f); setTimeout(function(){fit(f)},500); }); });
window.addEventListener('load', function(){ fitAll(); setTimeout(fitAll, 900); });
window.addEventListener('resize', fitAll);
</script>
</body></html>"""
open(os.path.join(D, "board.html"), "w", encoding="utf-8").write(board)
print("board.html", len(board), "자 ·", sum(len(g[3]) for g in GROUPS), "본")
