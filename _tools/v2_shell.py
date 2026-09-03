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

# (href, label, 현재 페이지 매칭 키). 키가 '/' 로 끝나면 디렉토리 prefix 매칭
# 앞 2 = 파는 것, 뒤 2 = 부가. 경계에 여백 한 칸을 더 줘 한 덩어리로 뭉치지 않게 한다 (s17 건우 지적)
GNB = [
    ("guidebook/index.html", "가이드북", ("guidebook/",)),
    ("studio.html", "제시문 면접 스튜디오", ("studio.html",)),
    ("library.html", "자료실", ("library.html",)),
    ("about.html", "연구소", ("about.html", "faq.html", "notice.html")),
]
GNB_GROUP_BREAK = 2   # 이 인덱스 항목부터 부가 묶음 (파는 것 2, 부가 2. 무료 아카이브 폐지 2026-08-26, 봉투 모의고사 판매 중단 2026-08-31)
FIX = [  # (href, label, 매칭 키, primary, 아이콘 키)
    ("index.html", "홈", ("index.html",), False, "home"),
    ("index.html#find", "대학 찾기", (), False, "find"),
    ("guidebook/index.html", "가이드북", ("guidebook/",), True, "book"),
    ("my.html", "MY", ("my.html",), False, "my"),
]

# 모바일 바 아이콘 (선 1.8, currentColor. 자리표시 사각 <i> 대체)
FIX_ICONS = {
    "home": '<path d="M4 11.2 12 4.4l8 6.8M6.4 9.8V20h11.2V9.8"/>',
    "find": '<circle cx="10.6" cy="10.6" r="5.6"/><path d="M14.8 14.8 20 20"/>',
    "book": '<rect x="5" y="4" width="14" height="16"/><path d="M8.6 4v16M12 8.4h4M12 11.8h4"/>',
    "my": '<circle cx="12" cy="8.4" r="3.4"/><path d="M4.8 20c1.6-4 4.2-5.6 7.2-5.6s5.6 1.6 7.2 5.6"/>',
}


def _fi(key):
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            f'aria-hidden="true">{FIX_ICONS[key]}</svg>')

# 기존 블록 인식은 속성이 붙어도 잡아야 한다. <div class="util" data-x="1"> 을 못 알아보면
# 자리표시만 채워지고 낡은 셸이 남아 헤더가 둘이 된다 (s17 Codex 적발).
SHELL_RE = re.compile(r'(?:<!--v2:shell-->|<div\b[^>]*\bclass="[^"]*\butil\b[^"]*"[^>]*>.*?</header>)', re.S)
FOOTER_RE = re.compile(r'(?:<!--v2:footer-->|<footer\b[^>]*>.*?</footer>)', re.S)
FIX_RE = re.compile(r'(?:<!--v2:fix-->|<nav\b[^>]*\bclass="[^"]*\bfix\b[^"]*"[^>]*>.*?</nav>)', re.S)


def prefix_of(rel):
    """404.html 은 임의 경로에서 서빙되므로 절대경로. 그 외는 깊이만큼 ../"""
    if rel == "404.html":
        return "/"
    return "../" * rel.count("/")


def _on(rel, keys):
    return any(rel == k or (k.endswith("/") and rel.startswith(k)) for k in keys)


def gnb(rel, p):
    out = []
    for i, (h, l, keys) in enumerate(GNB):
        cls = " ".join(c for c in (("on" if _on(rel, keys) else ""), ("gap" if i == GNB_GROUP_BREAK else "")) if c)
        attrs = (f' class="{cls}"' if cls else "") + (' aria-current="page"' if _on(rel, keys) else "")
        out.append(f'<a href="{p}{h}"{attrs}>{l}</a>')
    return "".join(out)


def shell(rel):
    p = prefix_of(rel)
    nav = gnb(rel, p)
    # GNB 밖 현재 위치 (홈, 장바구니, 로그인) 도 표시한다
    cur_home = ' aria-current="page"' if rel == "index.html" else ""
    cur_cart = ' aria-current="page"' if rel == "cart.html" else ""
    cur_login = ' aria-current="page"' if rel == "login.html" else ""
    return f'''<div class="util">
  <span class="han">玄學的 硏究所</span>
  <nav aria-label="계정"><a href="{p}login.html"{cur_login}>로그인</a><a href="{p}cart.html"{cur_cart}>장바구니</a></nav>
</div>

<header class="hd" id="hd">
  <div class="row wrap">
    <a class="brand" href="{p}index.html" aria-label="현학적 연구소 홈"{cur_home}>
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
    <div class="aux"><a href="{p}login.html"{cur_login}>로그인</a><a href="{p}cart.html"{cur_cart}>장바구니</a></div>
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
        <p>대입 면접 전문. 서류기반면접 가이드북, 제시문 면접 스튜디오.</p>
        <p style="margin-top:8px">www.hyunhak.com &nbsp; admin@hyunhak.com</p>
      </div>
      <div>
        <h4>바로가기</h4>
        <ul>{links}</ul>
      </div>
      <div>
        <h4>고객센터</h4>
        <ul><li><a href="{p}support.html">고객센터</a></li><li>이메일 admin@hyunhak.com</li><li><a href="{p}faq.html">자주 묻는 질문</a></li><li><a href="{p}notice.html">공지</a></li><li><a href="{p}terms.html">환불 규정</a></li></ul>
      </div>
    </div>
    <div class="biz"><address class="bizinfo">상호: 현학적 연구소<br>대표: 현건우<br>사업자등록번호: 293-38-01827<br>통신판매업 신고: 신고 면제 대상(전자상거래법 제12조 제1항 단서)<br>주소: 서울특별시 강남구 테헤란로 70길 12, 402-941A호(대치동,&nbsp;H&nbsp;타워)<br>전화: 070-8098-0671<br>호스팅 제공자: Cloudflare,&nbsp;Inc.</address><nav aria-label="법적 고지"><a href="{p}terms.html">이용약관</a> &nbsp; <a href="{p}privacy.html">개인정보처리방침</a></nav></div>
  </div>
</footer>'''


def fix(rel):
    p = prefix_of(rel)
    out = []
    for h, l, keys, pri, icon in FIX:
        # cta = 전환 유도 채움, on + aria-current = 현재 위치. 둘을 갈라야 다른 면에서도
        # 가이드북 항목이 활성으로 읽히는 일이 없다 (라이브 재채점 보완 2)
        on = _on(rel, keys)
        cls = " ".join(c for c in (("cta" if pri else ""), ("on" if on else "")) if c)
        href = "#grid" if (pri and rel == "guidebook/index.html") else p + h
        attrs = (f' class="{cls}"' if cls else "") + (' aria-current="page"' if on else "")
        out.append(f'<a{attrs} href="{href}">{_fi(icon)}{l}</a>')
    return '<nav class="fix" aria-label="모바일 바로가기">' + "".join(out) + "</nav>"


def _sub_guarded(regex, maker, s, rel, name, max_span=20000):
    """블록 교체 가드: 매치 0 = 무변경, 2+ = 실패(중복 셸 방지), 과대 스팬 = 정규식 과탐(본문 삼킴) 실패."""
    ms = list(regex.finditer(s))
    if not ms:
        return s
    if len(ms) > 1:
        raise SystemExit(f"{rel}: {name} 블록/자리표시 {len(ms)}개, 1개만 허용 (중복 주입 위험)")
    m = ms[0]
    if m.end() - m.start() > max_span:
        raise SystemExit(f"{rel}: {name} 매치 스팬 {m.end() - m.start()}B, 정규식이 본문을 삼킨 것으로 판단해 중단")
    return s[:m.start()] + maker(rel) + s[m.end():]


def apply_shell(s, rel):
    """util+header 블록 교체. 자리표시도 블록도 없으면 원문 반환 (변경 없음)."""
    return _sub_guarded(SHELL_RE, shell, s, rel, "shell")


def apply_footer(s, rel):
    return _sub_guarded(FOOTER_RE, footer, s, rel, "footer")


def apply_fix(s, rel):
    return _sub_guarded(FIX_RE, fix, s, rel, "fix")


if __name__ == "__main__":
    import sys
    rel = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    print(shell(rel)); print(footer(rel)); print(fix(rel))
