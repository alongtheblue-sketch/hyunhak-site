#!/usr/bin/env python3
"""고객센터(support.html) 레이아웃 3안 + 본체 조립기 (2026-09-03).
   같은 콘텐츠 조각을 A(세로 단일 컬럼 편집 문서형), B(좌측 rail 목차 + 우측 본문형), C(상단 카드 3열 + 아래 2단형) 로 조립한다.
   support.html 본체 = B 안 구조 (critic 33/45, 2026-09-03. 종전 C 23/45). 셸(유틸바, 헤더, 푸터, 모바일 바)은 _tools/v2_shell.py 에서 그대로 가져와 apply_* 재실행과 바이트가 같다.
   실행: python3 _design/support_20260903/build_variants.py  (사이트 루트 기준 상대경로 자동)"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "_tools"))
import v2_shell as V  # noqa: E402

MAIL = "admin@hyunhak.com"

# ── 법률 검토 반영 문안 (2026-09-03 코디네이터 지시, verbatim). my.html 모달과 같은 문장 ──
POLICY = [
    "① 가이드북과 인강, 스튜디오는 가분적 디지털 콘텐츠입니다. 이미 연 권, 재생한 강의, 응시한 지문, 발급된 PDF 소장판은 제공이 개시되어 단순 변심에 따른 청약철회가 제한됩니다(전자상거래법 제17조 제2항 제5호, 이용약관 제6조). 제공 개시 시점은 가이드북은 보안 리더에서 열람을 시작한 때, PDF 소장판은 파일이 발급된 때, 스튜디오는 응시를 시작한 때입니다.",
    "② 아직 열지 않은 권, 재생하지 않은 강의, 응시하지 않은 지문은 공급받은 날부터 7일 이내에 청약철회하실 수 있고, 그만큼 환불됩니다. 표시 내용과 실제가 다르거나 계약과 다르게 이행된 경우에는 공급받은 날부터 3개월, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회하실 수 있습니다(전자상거래법 제17조 제3항).",
    "③ 청약철회는 요청을 보내신 때에 효력이 생기며 연구소의 승인을 요건으로 하지 않습니다. 환불 대금은 청약철회일부터 3영업일 이내에 결제 수단으로 돌려드리고, 환급이 늦어지면 지연이자를 더해 지급합니다(전자상거래법 제18조 제2항).",
]

PRIVACY_NOTICE = [
    "문의를 받고 답하기 위해 아래 정보를 수집합니다.",
    "목적: 문의 접수와 답변, 처리 기록의 보관",
    "항목: 이름, 이메일, 문의 내용",
    "보유 기간: 답변을 마친 뒤 1년. 거래에 관한 불만과 분쟁 처리 기록은 전자상거래법 제6조에 따라 3년간 보관합니다.",
    "거부할 권리: 동의를 거부하실 수 있습니다. 다만 이름과 이메일이 없으면 답을 보내 드릴 수 없습니다.",
    "문의 내용에는 주민등록번호, 성적표처럼 민감한 정보를 적지 말아 주세요. 만 14세 미만은 법정대리인의 동의를 받은 뒤 문의해 주세요.",
]

CSS = """/* 고객센터 전용. 크기는 토큰만 */
.sup{padding-block:var(--s5) var(--s8)}
.sup .top{margin-bottom:var(--s7)}
.sup .card .bd{gap:var(--s2)}
.sup .card .eyebrow{margin-bottom:2px}
.sup .card .tlink{margin-top:auto;align-self:flex-start}
.sup .blk{margin-bottom:var(--s7)}
.sup .blk:last-child{margin-bottom:0}
.sup .sh{margin-bottom:var(--s4)}
.sup .sh h2{font-size:var(--t-h3)}
.sup .grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 var(--s4)}
.sup .acts{display:flex;align-items:center;gap:var(--s3);flex-wrap:wrap}
.sup .msgs{font-size:var(--t-sm);color:var(--gray);min-height:1.5em;max-width:none}
.sup .msgs.err{color:var(--ink);font-weight:600}
.sup .who{font-size:var(--t-sm);color:var(--gray);margin-bottom:var(--s3)}
.sup .pn{margin-bottom:var(--s4);border-top:var(--rule-strong);border-bottom:var(--rule-strong)}
.sup .pn summary{list-style:none;cursor:pointer;min-height:var(--tap);display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:var(--t-sm);font-weight:600}
.sup .pn summary::-webkit-details-marker{display:none}
.sup .pn summary::after{content:"+";font-family:var(--mono);font-weight:400;font-size:var(--t-h4);color:var(--gray);width:24px;text-align:center}
.sup .pn[open] summary::after{content:"\\2212"}
.sup .pn .body{padding:0 0 var(--s3);font-size:var(--t-sm);line-height:var(--lh-body);color:var(--body)}
.sup .pn .body p+p{margin-top:6px}
.sup .agree{margin-bottom:var(--s4);border-bottom:var(--rule-strong)}
.sup .agree input{width:24px;height:24px}
.sup .agree label span{font-weight:600}
.sup .done{background:var(--mat);border-radius:var(--r-md);padding:var(--s4);margin-top:var(--s3)}
.sup .done .k{display:block;font-family:var(--mono);font-size:var(--t-xs);letter-spacing:var(--tr-label);color:var(--gray);margin-bottom:8px}
.sup .done .no{font-family:var(--mono);font-size:var(--t-h4);font-weight:500;letter-spacing:.02em}
.sup .done p{font-size:var(--t-sm);color:var(--body);margin-top:8px}
.sup .rows a{grid-template-columns:minmax(0,1fr) auto auto}
.sup .th{margin-top:var(--s4);border-top:2px solid var(--ink);padding-top:var(--s4)}
.sup .th:focus{outline:none}
.sup .th h3{font-size:var(--t-h4)}
.sup .th .meta{margin-top:6px;font-size:var(--t-sm);color:var(--gray);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sup .th .msg{margin-top:var(--s3);padding:var(--s3) var(--s4);border-radius:var(--r-md);background:var(--card);box-shadow:inset 0 0 0 1px var(--hairs);font-size:var(--t-base);line-height:var(--lh-body);color:var(--body);white-space:pre-wrap;max-width:none}
.sup .th .msg.admin{background:var(--mat);box-shadow:none}
.sup .th .msg .who{display:block;font-family:var(--mono);font-size:var(--t-xs);letter-spacing:var(--tr-label);color:var(--gray);margin-bottom:6px;white-space:normal}
.sup .th .rf{margin-top:var(--s4)}
.sup .th .back{margin-top:var(--s3)}
.sup .notice a span{font-weight:600;min-width:0}
.sup .panel h2{font-size:var(--t-h4);margin-bottom:var(--s3)}
.sup .panel .dl{margin-top:4px}
.sup .panel .dl dd a{text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--hair)}
.sup .pol p{font-size:var(--t-sm);line-height:var(--lh-body);color:var(--body)}
.sup .pol p+p{margin-top:10px}
.sup .pol .tlink{margin-top:var(--s2)}
.sup .quick{display:flex;gap:var(--s4);flex-wrap:wrap;margin-bottom:var(--s6);padding-bottom:var(--s3);border-bottom:var(--rule-strong)}
.sup .docno{font-family:var(--mono);font-size:var(--t-xs);letter-spacing:var(--tr-label);color:var(--gray);display:block;margin-bottom:var(--s2)}
.sup .doc .blk{padding-top:var(--s4);border-top:var(--rule-strong)}
/* 서체 위계: h1 세리프 800, h2 이하 700 (design-critic P2-4). 주인은 환불 규정 제목 인장 1점 (P2-3) */
.sup-head h1{font-family:var(--serif);font-weight:800}
.sup .sh h2,.sup .panel h2,.sup .th h3{font-weight:700}
.sup #refund h2::before{content:"";display:inline-block;width:8px;height:8px;background:var(--seal);border-radius:50%;margin-right:10px;vertical-align:middle}
/* rail 은 DOM 상 본문 뒤에 두고 데스크톱에서만 좌측 칸으로 (P1-3: 390 에서 목차가 폼 앞을 막지 않는다) */
.sup.lay.rev>.main{grid-column:2;grid-row:1}
.sup.lay.rev>.side{grid-column:1;grid-row:1}
@media (max-width:900px){.sup.lay.rev>.main,.sup.lay.rev>.side{grid-column:auto;grid-row:auto}}
.menu2{display:flex;flex-direction:column}
.menu2 a{min-height:var(--tap);font-size:var(--t-sm);font-weight:600;border-top:var(--rule);display:flex;align-items:center;gap:10px}
.menu2 a:first-child{border-top:0}
.menu2 a:hover{color:var(--gray)}
.menu2 a.cur{text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:2px;text-decoration-color:var(--ink)}
@media (max-width:700px){.sup .grid2{grid-template-columns:1fr}.sup .rows a{grid-template-columns:1fr;gap:4px}.sup .quick{gap:var(--s2) var(--s3)}}"""


def head(p, title, extra_css=""):
    return f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<!-- seo:begin -->
<!-- seo:end -->
<link rel="icon" href="{p}assets/favicon_32.png">
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></noscript>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;500;700&family=JetBrains+Mono:wght@400;500&display=swap" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;500;700&family=JetBrains+Mono:wght@400;500&display=swap"></noscript>
<link rel="stylesheet" href="{p}assets/base.css">
<style>
{CSS}{extra_css}
</style>
</head>
<body class="v2">
<a class="skip" href="#main">본문으로 건너뛰기</a>
<div class="frame"><div class="sheet">

'''


def pagehead(p):
    return f'''<main id="main">

<section class="phead tight sup-head">
  <div class="wrap">
   <div class="pagehead">
    <nav class="crumb rv" aria-label="위치"><a href="{p}index.html">현학적 연구소</a><span aria-hidden="true">/</span><span>고객센터</span></nav>
    <h1 class="rv">고객센터</h1>
    <p class="lede rv">1:1 문의와 답변, 자주 묻는 질문, 환불 규정을 한곳에 모았습니다.</p>
  <!-- aeo --><!-- /aeo -->
</div>
  </div>
</section>
'''


def cards(p):
    return f'''  <section class="cards top rv" aria-label="안내">
    <article class="card"><div class="bd"><span class="eyebrow">01</span><h3>1:1 문의</h3><p>분류와 제목, 내용을 적어 보내면 접수번호가 발급됩니다. 회원은 내 문의 목록에서 답변을 봅니다.</p><a class="tlink" href="#inquiry">문의 보내기 →</a></div></article>
    <article class="card"><div class="bd"><span class="eyebrow">02</span><h3>자주 묻는 질문</h3><p>가이드북과 스튜디오, 결제와 환불, 열람 기기, 계정, 스쿨 플랜, 인강 문답을 모았습니다.</p><a class="tlink" href="{p}faq.html">문답 보기 →</a></div></article>
    <article class="card"><div class="bd"><span class="eyebrow">03</span><h3>환불 규정</h3><p>열지 않은 상품은 공급받은 날부터 7일 이내에 청약철회할 수 있습니다. 요청은 마이페이지 주문 내역에서 보냅니다.</p><a class="tlink" href="{p}terms.html">이용약관 제6조 →</a></div></article>
  </section>
'''


def quick(p):
    return f'''  <nav class="quick rv" aria-label="바로가기"><a class="tlink" href="#inquiry">1:1 문의</a><a class="tlink" href="{p}faq.html">자주 묻는 질문</a><a class="tlink" href="{p}terms.html">환불 규정</a><a class="tlink" href="{p}notice.html">공지</a></nav>
'''


def pn_block():
    ps = "".join(f"<p>{t}</p>" for t in PRIVACY_NOTICE)
    return f'''        <details class="pn" id="inqPn"><summary>개인정보 수집 안내</summary>
          <div class="body">{ps}</div>
        </details>
        <div class="check agree" id="inqAgreeRow"><input type="checkbox" id="inqAgree"><label for="inqAgree"><span>위 안내를 읽고 동의합니다 (필수)</span></label></div>
'''


def inquiry(p, no=""):
    return f'''    <section class="blk" id="inquiry">
      <div class="sh"><div>{no}<h2>1:1 문의</h2><p>영업일 기준 순차 답변</p></div></div>
      <form id="inqForm" novalidate>
        <p class="who" id="inqWho" hidden></p>
{pn_block()}        <div class="grid2" id="inqGuest">
          <div class="field"><label for="inqEmail">이메일</label><input id="inqEmail" type="email" autocomplete="email" placeholder="답변을 받을 주소"></div>
          <div class="field"><label for="inqName">이름</label><input id="inqName" type="text" autocomplete="name" placeholder="선택"></div>
        </div>
        <div class="field"><label for="inqCat">분류</label>
          <select id="inqCat">
            <option value="">분류 선택</option>
            <option value="guide">가이드북</option><option value="studio">면접 스튜디오</option><option value="pay">결제</option><option value="refund">환불</option><option value="account">계정</option><option value="etc">기타</option>
          </select></div>
        <div class="field"><label for="inqTitle">제목</label><input id="inqTitle" type="text" maxlength="120"></div>
        <div class="field"><label for="inqBody">내용</label><textarea id="inqBody" rows="6" maxlength="3000" placeholder="주문번호나 대학 이름이 있으면 함께 적어 주세요"></textarea></div>
        <div class="acts"><button type="submit" class="btn sm" id="inqSend">문의 보내기</button><p class="msgs" id="inqMsg" role="status" aria-live="polite"></p></div>
      </form>
      <div class="done" id="inqDone" hidden tabindex="-1"><span class="k">접수번호</span><span class="no" id="inqDoneNo"></span><p>문의를 접수했습니다. 답변은 영업일 기준으로 순서대로 보냅니다.</p><p><button type="button" class="tlink" id="inqAgain">다른 문의 보내기</button></p></div>
    </section>
'''


def mine(p, no=""):
    return f'''    <section class="blk" id="mineBlk">
      <div class="sh"><div>{no}<h2>내 문의</h2><p>접수한 문의와 답변</p></div></div>
      <p class="note" id="mineNote" hidden><a class="tlink" href="{p}login.html?next=support.html">로그인</a>하면 접수한 문의와 답변을 여기서 봅니다.</p>
      <ul class="rows" id="mineList"></ul>
      <div class="empty" id="mineEmpty" hidden>접수한 문의가 없습니다.</div>
      <article class="th" id="thread" hidden tabindex="-1">
        <h3 id="thTitle"></h3>
        <p class="meta" id="thMeta"></p>
        <div class="msg" id="thBody"></div>
        <div id="thReplies"></div>
        <form class="rf" id="thReplyForm" hidden>
          <div class="field"><label for="thReply">답글</label><textarea id="thReply" rows="4" maxlength="3000"></textarea></div>
          <div class="acts"><button type="submit" class="btn sm" id="thSend">답글 보내기</button><p class="msgs" id="thMsg" role="status" aria-live="polite"></p></div>
        </form>
        <p class="back"><button type="button" class="tlink" id="thBack">목록으로</button></p>
      </article>
    </section>
'''


def notices(p, no=""):
    return f'''    <section class="blk" id="notices">
      <div class="sh"><div>{no}<h2>최근 공지</h2></div><a class="tlink" href="{p}notice.html">공지 전체 →</a></div>
      <ul class="notice" id="ntcList"></ul>
      <div class="empty" id="ntcEmpty" hidden>등록된 공지가 없습니다.</div>
    </section>
'''


def contact(p, no=""):
    return f'''    <section class="blk" id="contact">
      <div class="panel">{no}<h2>연락처</h2>
        <dl class="dl">
          <dt>이메일</dt><dd><a href="mailto:{MAIL}">{MAIL}</a></dd>
          <dt>답변</dt><dd>영업일 기준 순차 답변</dd>
          <dt>환불 요청</dt><dd><a href="{p}my.html">마이페이지 주문 내역</a>에서 보냅니다</dd>
        </dl>
      </div>
    </section>
'''


def refund(p, no=""):
    ps = "".join(f"<p>{t}</p>" for t in POLICY)
    return f'''    <section class="blk pol" id="refund">
      <div class="sh"><div>{no}<h2>환불 규정 요약</h2></div></div>
      {ps}
      <a class="tlink" href="{p}terms.html">이용약관 제6조 전문 →</a>
    </section>
'''


def tail(p, rel):
    return f'''
</main>

{V.footer(rel)}

</div></div>

{V.fix(rel)}

<script src="{p}assets/app.js"></script>
<script src="{p}assets/support.js"></script>
</body>
</html>
'''


def layout_A(p, rel):
    """세로 단일 컬럼 편집 문서형. 목차 없이 번호 붙은 절이 위에서 아래로."""
    n = lambda i: f'<span class="docno">{i:02d}</span>'
    body = pagehead(p) + '\n<div class="wrap lay narrow sup doc">\n  <div>\n' + quick(p) \
        + inquiry(p, n(1)) + mine(p, n(2)) + notices(p, n(3)) + contact(p, n(4)) + refund(p, n(5)) \
        + '  </div>\n</div>\n'
    return head(p, "고객센터 A안 세로 단일 컬럼, 현학적 연구소") + V.shell(rel) + "\n\n" + body + tail(p, rel)


def layout_B(p, rel, title="고객센터 B안 좌측 rail 목차, 현학적 연구소"):
    """좌측 rail 목차 + 우측 본문형 (design-critic 33/45 채택안). DOM 은 본문이 먼저, rail 은 데스크톱 grid 로 좌측.
       목차 5앵커 = 자기 페이지, 약관 링크는 #refund 하단 .tlink 1곳만 (P0-2)."""
    rail = f'''  <aside class="side">
    <div class="box rv">
      <h3>목차</h3>
      <nav class="menu2" data-spy aria-label="고객센터 목차">
        <a href="#inquiry">1:1 문의</a>
        <a href="#mineBlk">내 문의</a>
        <a href="#notices">최근 공지</a>
        <a href="#contact">연락처</a>
        <a href="#refund">환불 규정 요약</a>
      </nav>
    </div>
    <div class="box rv">
      <h3>다른 도움</h3>
      <nav class="menu2" aria-label="다른 도움">
        <a href="{p}faq.html">자주 묻는 질문</a>
        <a href="{p}notice.html">공지</a>
      </nav>
    </div>
  </aside>
'''
    body = pagehead(p) + '\n<div class="wrap lay rev sup">\n  <section class="main">\n' \
        + inquiry(p) + mine(p) + notices(p) + contact(p) + refund(p) + '  </section>\n' + rail + '</div>\n'
    return head(p, title) + V.shell(rel) + "\n\n" + body + tail(p, rel)


def layout_C(p, rel, title="고객센터, 현학적 연구소"):
    """상단 카드 3열 + 아래 2단형. 왼쪽 = 문의와 내 문의, 오른쪽 = 공지, 연락처, 환불 규정."""
    body = pagehead(p) + '\n<div class="wrap sup">\n' + cards(p) + '  <div class="two">\n    <div>\n' \
        + inquiry(p) + mine(p) + '    </div>\n    <aside>\n' + notices(p) + contact(p) + refund(p) + '    </aside>\n  </div>\n</div>\n'
    return head(p, title) + V.shell(rel) + "\n\n" + body + tail(p, rel)


def write(rel, s):
    path = os.path.join(ROOT, rel)
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print(f"{rel}: {len(s.encode('utf-8'))} bytes")


if __name__ == "__main__":
    d = "_design/support_20260903/"
    if "--site" in sys.argv:   # 본체 = B 안 구조 (2026-09-03 critic 33/45). 3안 파일은 채점된 원본이라 다시 쓰지 않는다
        write("support.html", layout_B("", "support.html", "고객센터, 현학적 연구소"))
    else:
        write(d + "A.html", layout_A("../../", d + "A.html"))
        write(d + "B.html", layout_B("../../", d + "B.html"))
        write(d + "C.html", layout_C("../../", d + "C.html", "고객센터 C안 카드 3열 + 2단, 현학적 연구소"))
