#!/usr/bin/env python3
"""플랫폼 v2 공용 셸 (유틸바 + 헤더 + 모바일 메뉴, 푸터, 모바일 고정 바) 단일 원천.
   apply_nav.py / apply_footer.py 가 <body class="v2"> 페이지에서 호출한다. 멱등: 같은 입력 = 같은 바이트.
   페이지 작성 시 자리표시 주석 <!--v2:shell--> <!--v2:footer--> <!--v2:fix--> 를 두면 첫 실행이 채우고,
   이후에는 생성된 블록 자체를 정규식으로 다시 찾아 교체한다.
   2026-08-26 하위 페이지 v2 전개 (s16)."""
import re

SYMBOL = ('<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="currentColor"><path d="M43 12 L57 12 L59 26 L41 26 Z"/>'
          '<rect x="4" y="26" width="92" height="6" rx="3"/><path fill-rule="evenodd" d="M50 43 C64 43 72 56 92 88 L8 88 C28 56 36 43 50 43 Z '
          'M50 62 L31 57 L31 74 L50 79 L69 74 L69 57 Z"/></g></svg>')

# (href, label, 현재 페이지 매칭 키) — 키가 '/' 로 끝나면 디렉토리 prefix 매칭
GNB = [
    ("guidebook/index.html", "가이드북", ("guidebook/",)),
    ("studio.html", "면접 스튜디오", ("studio.html",)),
    ("store.html", "봉투 모의고사", ("store.html",)),
    ("interview/index.html", "무료 아카이브", ("interview/",)),
    ("library.html", "자료실", ("library.html",)),
    ("about.html", "연구소", ("about.html", "faq.html", "notice.html")),
]
FIX = [  # (href, label, 매칭 키, primary)
    ("index.html", "홈", ("index.html",), False),
    ("index.html#find", "대학 찾기", (), False),
    ("guidebook/index.html", "가이드북", ("guidebook/",), True),
    ("my.html", "MY", ("my.html",), False),
]

SHELL_RE = re.compile(r'(?:<!--v2:shell-->|<div class="util">.*?</header>)', re.S)
FOOTER_RE = re.compile(r'(?:<!--v2:footer-->|<footer>.*?</footer>)', re.S)
FIX_RE = re.compile(r'(?:<!--v2:fix-->|<nav class="fix"[^>]*>.*?</nav>)', re.S)


def prefix_of(rel):
    """404.html 은 임의 경로에서 서빙되므로 절대경로. 그 외는 깊이만큼 ../"""
    if rel == "404.html":
        return "/"
    return "../" * rel.count("/")


def _on(rel, keys):
    return any(rel == k or (k.endswith("/") and rel.startswith(k)) for k in keys)


def gnb(rel, p):
    out = []
    for h, l, keys in GNB:
        cur = ' class="on" aria-current="page"' if _on(rel, keys) else ""
        out.append(f'<a href="{p}{h}"{cur}>{l}</a>')
    return "".join(out)


def shell(rel):
    p = prefix_of(rel)
    nav = gnb(rel, p)
    return f'''<div class="util">
  <span class="han">玄學的 硏究所</span>
  <nav aria-label="계정"><a href="{p}login.html">로그인</a><a href="{p}cart.html">장바구니</a></nav>
</div>

<header class="hd" id="hd">
  <div class="row wrap">
    <a class="brand" href="{p}index.html" aria-label="현학적 연구소 홈">
      {SYMBOL}
      현학적 연구소
    </a>
    <nav class="gnb" aria-label="주메뉴">
      {nav}
    </nav>
    <div class="tools">
      <form class="search" role="search" onsubmit="return false">
        <label for="q1" class="ph">대학 검색</label>
        <input id="q1" type="search" autocomplete="off">
        <button type="submit" aria-label="검색">→</button>
      </form>
      <button type="button" class="menu" aria-expanded="false" aria-controls="mnav">메뉴</button>
    </div>
  </div>
  <nav class="mnav" id="mnav" aria-label="모바일 메뉴">
    {nav}
    <div class="aux"><a href="{p}login.html">로그인</a><a href="{p}cart.html">장바구니</a></div>
  </nav>
</header>'''


def footer(rel):
    p = prefix_of(rel)
    links = "".join(f'<li><a href="{p}{h}">{l}</a></li>' for h, l, _ in GNB)
    return f'''<footer>
  <div class="wrap">
    <div class="g">
      <div>
        <h4>현학적 연구소 <span class="han">玄學的 硏究所</span></h4>
        <p>대입 면접 전문. 학교별 면접 가이드북, 제시문 면접 스튜디오, 영어 봉투 모의고사.</p>
        <p style="margin-top:8px">www.hyunhak.com &nbsp; admin@hyunhak.com</p>
      </div>
      <div>
        <h4>바로가기</h4>
        <ul>{links}</ul>
      </div>
      <div>
        <h4>고객센터</h4>
        <ul><li>이메일 admin@hyunhak.com</li><li>배송 평일 오후 2시 이전 주문 당일 출고</li><li>배송비 3,000원, 5만원 이상 무료</li><li><a href="{p}faq.html">자주 묻는 질문</a></li><li><a href="{p}notice.html">공지</a></li><li><a href="{p}terms.html">환불 규정</a></li></ul>
      </div>
    </div>
    <div class="biz"><span>대표, 사업자등록번호, 통신판매업신고 [정식 오픈 전 기재]</span><nav aria-label="법적 고지"><a href="{p}terms.html">이용약관</a> &nbsp; <a href="{p}privacy.html">개인정보처리방침</a></nav></div>
  </div>
</footer>'''


def fix(rel):
    p = prefix_of(rel)
    out = []
    for h, l, keys, pri in FIX:
        cls = " ".join(c for c in (("pri" if pri else ""), ("on" if _on(rel, keys) else "")) if c)
        href = "#grid" if (pri and rel == "guidebook/index.html") else p + h
        out.append(f'<a{" class=" + chr(34) + cls + chr(34) if cls else ""} href="{href}"><i aria-hidden="true"></i>{l}</a>')
    return '<nav class="fix" aria-label="모바일 바로가기">' + "".join(out) + "</nav>"


def apply_shell(s, rel):
    """util+header 블록 교체. 자리표시도 블록도 없으면 원문 반환 (변경 없음)."""
    return SHELL_RE.sub(lambda m: shell(rel), s, count=1) if SHELL_RE.search(s) else s


def apply_footer(s, rel):
    return FOOTER_RE.sub(lambda m: footer(rel), s, count=1) if FOOTER_RE.search(s) else s


def apply_fix(s, rel):
    return FIX_RE.sub(lambda m: fix(rel), s, count=1) if FIX_RE.search(s) else s


if __name__ == "__main__":
    import sys
    rel = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    print(shell(rel)); print(footer(rel)); print(fix(rel))
