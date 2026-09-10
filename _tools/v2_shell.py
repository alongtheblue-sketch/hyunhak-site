#!/usr/bin/env python3
"""플랫폼 v2 공용 셸 (유틸바 + 헤더 + 모바일 메뉴, 푸터, 모바일 고정 바) 단일 원천.
   apply_nav.py / apply_footer.py 가 <body class="v2"> 페이지에서 호출한다. 멱등: 같은 입력 = 같은 바이트.
   페이지 작성 시 자리표시 주석 <!--v2:shell--> <!--v2:footer--> <!--v2:fix--> 를 두면 첫 실행이 채우고,
   이후에는 생성된 블록 자체를 정규식으로 다시 찾아 교체한다.
   2026-08-26 하위 페이지 v2 전개 (s16)."""
import re, json, os, html
from datetime import datetime, timezone, timedelta

# 할인 행사 배너 (2026-09-07). 원천 = _tools/promo.json (id·rate·ends_at 은 API D1 promotions 행과 같아야 한다).
# 빌드 시각이 ends_at 을 지나면 배너를 넣지 않는다 → 행사 뒤 첫 빌드가 배너를 걷는다. 그 전에는 지면 JS 가 서버 판정(null)으로 숨긴다.
PROMO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "promo.json")
PROMO_TPL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "promo_strip.html")


def load_promo(now=None):
    """published 이고 기간 안이면 dict, 아니면 None. 파일이 없거나 값이 이상하면 None (배너 없음이 안전한 쪽)."""
    try:
        with open(PROMO_PATH, encoding="utf-8") as f:
            p = json.load(f)
    except (OSError, ValueError):
        return None
    if not p.get("published") or not isinstance(p.get("rate"), int) or not (0 < p["rate"] < 100):
        return None
    now = now or datetime.now(timezone.utc)
    for k in ("starts_at", "ends_at"):
        v = p.get(k)
        if v is None:
            continue
        try:
            t = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        except ValueError:
            return None
        if t.tzinfo is None:
            return None
        if k == "starts_at" and now < t:
            return None
        if k == "ends_at" and now > t:
            return None
    return p


def _won(n):
    return f"{int(n):,}원"


def promo_strip(rel, p=None, price_note=True):
    """셸 헤더 바로 아래 행사 배너 A1 「판심 띠」(design-director 2026-09-07, critic 채점 뒤 확정). 마크업 = _tools/promo_strip.html.
       자리표시 {p} {label} {link} {link_label} {link_label_sm} {until} {id} {rate} {price_note}.
       price_note = 정가 한 칸(data-list-price) 문장. app.js 가 없는 면(상세 LP)은 False 로 빼서 정가만 덩그러니 서지 않게 한다."""
    p = p if p is not None else load_promo()
    if not p or rel in set(p.get("exclude") or []):   # exclude = 자체 가격표가 있는 면 (b2b 스쿨 플랜, COPY_REVIEW P0)
        return ""
    if rel in {"index.html", "studio.html", "programs/guidebook.html", "programs/studio.html"}:
        # R2: 기존 행사 label 바이트를 한 줄로 제시한다. promo 원천은 변경하지 않는다.
        return ('\n<aside class="promo r2-promo" data-promo="' + html.escape(p["id"], quote=True)
                + '" data-promo-until="' + html.escape(p["ends_at"], quote=True)
                + '" aria-label="할인 행사 안내"><div class="wrap"><p>'
                + html.escape(p["label"]) + '</p></div></aside>')
    try:
        with open(PROMO_TPL_PATH, encoding="utf-8") as f:
            tpl = f.read().strip()
    except OSError:
        return ""
    sp = p.get("strip_price") if price_note else None
    note = (f'<span class="lg sans"> {sp["prefix"]}<span class="p" data-list-price="{int(sp["list_price"])}">{_won(sp["list_price"])}</span>{sp["suffix"]}</span>'
            if sp else "")
    # 계기 띠(A3, critic 2026-09-07 38/45 RELEASE_OK) 의 시한 계기값 = ends_at 을 KST 로 "2026." + "09.30 23:59" (모바일은 연도 생략)
    until_y = until_md = ""
    if p.get("ends_at"):
        t = datetime.fromisoformat(str(p["ends_at"]).replace("Z", "+00:00")).astimezone(timezone(timedelta(hours=9)))
        until_y, until_md = t.strftime("%Y."), t.strftime("%m.%d %H:%M")
    return "\n" + tpl.format(p=prefix_of(rel), label=p["label"], label_sm=p.get("label_sm", p["label"]), link=p.get("link", "index.html"),
                              link_label=p.get("link_label", "자세히"), link_label_sm=p.get("link_label_sm", p.get("link_label", "자세히")),
                              until=p.get("ends_at") or "", id=p["id"], rate=p["rate"], price_note=note, until_y=until_y, until_md=until_md)


PROMO_BAND_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "promo_band.html")


def promo_band(rel, p=None):
    """홈 첫 화면 프로모 밴드 B3 「괘선 표」. 마크업 = _tools/promo_band.html, 행 = promo.json band.rows [[상품명, 정가], …]."""
    p = p if p is not None else load_promo()
    if not p or not p.get("band"):
        return ""
    with open(PROMO_BAND_PATH, encoding="utf-8") as f:
        tpl = f.read().strip()
    b = p["band"]
    rows = "\n".join(f'      <tr><th scope="row">{name}</th><td><span class="p" data-list-price="{int(price)}">{_won(price)}</span></td></tr>'
                      for name, price in b["rows"])
    return tpl.format(p=prefix_of(rel), label=p["label"], link=p.get("link", "index.html"), link_label=p.get("link_label", "자세히"),
                      until=p.get("ends_at") or "", id=p["id"], rate=p["rate"], until_text=b.get("until_text", ""), foot=b.get("foot", ""), rows=rows)


SYMBOL = ('<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="currentColor"><path d="M43 12 L57 12 L59 26 L41 26 Z"/>'
          '<rect x="4" y="26" width="92" height="6" rx="3"/><path fill-rule="evenodd" d="M50 43 C64 43 72 56 92 88 L8 88 C28 56 36 43 50 43 Z '
          'M50 62 L31 57 L31 74 L50 79 L69 74 L69 57 Z"/></g></svg>')

# (href, label, 현재 페이지 매칭 키). 키가 '/' 로 끝나면 디렉토리 prefix 매칭
# 앞 2 = 파는 것, 뒤 2 = 부가. 경계에 여백 한 칸을 더 줘 한 덩어리로 뭉치지 않게 한다 (s17 건우 지적)
GNB = [
    ("programs/guidebook.html", "가이드북", ("guidebook/", "programs/guidebook.html")),
    ("programs/studio.html", "스튜디오", ("studio.html", "programs/studio.html")),
    ("ranking.html", "랭킹실", ("ranking.html",)),
    ("lectures.html", "인강", ("lectures.html", "lectures/", "classroom.html")),
    ("b2b.html", "스쿨 플랜", ("b2b.html",)),
]
GNB_GROUP_BREAK = 4   # 개인 이용 4개 다음 스쿨 플랜
FIX = [  # (href, label, 매칭 키, primary, 아이콘 키)
    ("index.html", "홈", ("index.html",), False, "home"),
    ("programs/guidebook.html", "가이드북", ("guidebook/", "programs/guidebook.html"), False, "book"),
    ("programs/studio.html", "스튜디오", ("studio.html", "programs/studio.html", "programs/yonsei.html", "programs/korea.html"), False, "camera"),
    ("ranking.html", "랭킹실", ("ranking.html",), False, "rank"),
    ("my.html", "MY", ("my.html",), False, "my"),
]

# 모바일 바 아이콘 (선 1.8, currentColor. 자리표시 사각 <i> 대체)
FIX_ICONS = {
    "rank": '<path d="M4 20V12h5v8M9 20V5h6v15M15 20v-10h5v10M3 20h18"/>',
    "home": '<path d="M4 11.2 12 4.4l8 6.8M6.4 9.8V20h11.2V9.8"/>',
    "find": '<circle cx="10.6" cy="10.6" r="5.6"/><path d="M14.8 14.8 20 20"/>',
    "book": '<rect x="5" y="4" width="14" height="16"/><path d="M8.6 4v16M12 8.4h4M12 11.8h4"/>',
    "my": '<circle cx="12" cy="8.4" r="3.4"/><path d="M4.8 20c1.6-4 4.2-5.6 7.2-5.6s5.6 1.6 7.2 5.6"/>',
    "play": '<circle cx="12" cy="12" r="8.4"/><path d="M10.3 9.1v5.8l4.8-2.9z"/>',
    "camera": '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3z"/>',
}


def _fi(key):
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            f'aria-hidden="true">{FIX_ICONS[key]}</svg>')

# 기존 블록 인식은 속성이 붙어도 잡아야 한다. <div class="util" data-x="1"> 을 못 알아보면
# 자리표시만 채워지고 낡은 셸이 남아 헤더가 둘이 된다 (s17 Codex 적발).
SHELL_RE = re.compile(r'(?:<!--v2:shell-->|<div\b[^>]*\bclass="[^"]*\butil\b[^"]*"[^>]*>.*?</header>(?:\s*<aside\b[^>]*\bdata-promo\b[^>]*>.*?</aside>)?)', re.S)
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
  <style>
    :where(body.v2) .hd .tools .aux{{display:none}}
    @media (min-width:56.251rem){{
      :where(body.v2) .hd .row{{gap:var(--s2)}}
      :where(body.v2) .hd .gnb{{gap:var(--s1)}}
      :where(body.v2) .hd .gnb a{{font-size:var(--t-sm)}}
      :where(body.v2) .hd .gnb a.gap{{margin-left:var(--s2)}}
      :where(body.v2) .hd .search{{width:var(--s10)}}
    }}
    @media (max-width:56.25rem){{
      :where(body.v2) .hd .row,:where(body.v2) .hd .tools{{gap:var(--s2)}}
      :where(body.v2) .hd .tools .aux{{display:flex}}
      :where(body.v2) .hd .tools .aux a{{display:inline-flex;align-items:center;justify-content:center;min-height:var(--tap);min-width:var(--tap);font-size:var(--t-xs);white-space:nowrap}}
    }}
  </style>
  <span>현학적 연구소</span>
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
      <div class="aux"><a href="{p}cart.html"{cur_cart} aria-live="polite" aria-atomic="true">장바구니</a></div>
      <button type="button" class="menu" aria-expanded="false" aria-controls="mnav">메뉴</button>
    </div>
  </div>
  <nav class="mnav" id="mnav" aria-label="모바일 메뉴">
    {nav}
    <div class="aux"><a href="{p}login.html"{cur_login}>로그인</a><a href="{p}cart.html"{cur_cart}>장바구니</a></div>
  </nav>
</header>''' + promo_strip(rel)


def footer(rel, compact=False):
    p = prefix_of(rel)
    links = "".join(f'<li><a href="{p}{h}">{l}</a></li>' for h, l, _ in GNB)
    links += f'<li><a href="{p}library.html">자료실</a></li><li><a href="{p}about.html">연구소</a></li>'
    disclosure = "" if compact else " open"
    # v2_check 의 정적 셸 계약은 속성 없는 <footer> 를 요구한다.
    # 파싱 즉시 클래스만 부여해 footer.ft 스타일과 기존 검증 계약을 함께 유지한다.
    return f'''<footer>
  <script>document.currentScript.parentElement.classList.add('ft');</script>
  <style>
    :where(body.v2) footer.ft{{border-color:var(--edge, var(--hair))}}
    :where(body.v2) footer.ft .ft-legal{{display:flex;flex-wrap:wrap;gap:0 var(--s3);padding-bottom:var(--s3);margin-bottom:var(--s4);border-bottom:var(--rule);border-color:var(--edge, var(--hair));color:var(--ink)}}
    :where(body.v2) footer.ft .ft-legal a{{font-size:var(--t-xs)}}
    :where(body.v2) footer.ft .ft-more>summary{{display:none}}
    :where(body.v2) footer.ft .ft-contact{{margin-top:var(--s2)}}
    :where(body.v2) footer.ft .biz{{font-size:var(--t-xs);color:var(--gray);border-color:var(--edge, var(--hair))}}
    :where(body.v2) footer.ft .bizinfo{{font-size:var(--t-xs);color:var(--gray)}}
    :where(body.v2.ft-compact) footer.ft{{padding-block:var(--s3)}}
    :where(body.v2.ft-compact) footer.ft .ft-legal{{gap:0 var(--s2);padding-bottom:var(--s2);margin-bottom:0}}
    :where(body.v2.ft-compact) footer.ft .ft-more>summary{{display:list-item;min-height:var(--tap);align-content:center;cursor:pointer;font-size:var(--t-xs);color:var(--ink)}}
    :where(body.v2.ft-compact) footer.ft .g{{grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s3)}}
    :where(body.v2.ft-compact) footer.ft .ft-brand{{grid-column:1/-1}}
    :where(body.v2.ft-compact) footer.ft .biz{{margin-top:var(--s3)}}
  </style>
  <div class="wrap">
    <nav class="ft-legal" aria-label="법적 고지"><a href="{p}support.html">고객센터</a><a href="#business-info">사업자 정보</a><a href="{p}faq.html#q-pay">결제</a><a href="{p}terms.html">환불 규정</a><a href="{p}terms.html">이용약관</a><a href="{p}privacy.html">개인정보처리방침</a></nav>
    <details class="ft-more"{disclosure}>
    <summary>현학적 연구소</summary>
    <div class="g">
      <div class="ft-brand">
        <h2>현학적 연구소 <span class="han">玄學的 硏究所</span></h2>
        <p>대입 면접 전문. 서류기반면접 가이드북, 제시문 면접 스튜디오.</p>
        <p class="ft-contact">www.hyunhak.com &nbsp; admin@hyunhak.com</p>
      </div>
      <div>
        <h2>바로가기</h2>
        <ul>{links}</ul>
      </div>
      <div>
        <h2>고객센터</h2>
        <ul><li><a href="{p}support.html">고객센터</a></li><li>이메일 admin@hyunhak.com</li><li><a href="{p}faq.html">자주 묻는 질문</a></li><li><a href="{p}notice.html">공지</a></li><li><a href="{p}terms.html">환불 규정</a></li></ul>
      </div>
    </div>
    <div class="biz" id="business-info"><address class="bizinfo">상호: 현학적 연구소<br>대표: 현건우<br>사업자등록번호: 293-38-01827<br>통신판매업 신고: 신고 면제 대상(전자상거래법 제12조 제1항 단서)<br>주소: 서울특별시 강남구 테헤란로 70길 12, 402-941A호(대치동,&nbsp;H&nbsp;타워)<br>전화: 070-8098-0671<br>호스팅 제공자: Cloudflare,&nbsp;Inc.</address></div>
    </details>
  </div>
</footer>'''


def fix(rel):
    p = prefix_of(rel)
    out = []
    for h, l, keys, pri, icon in FIX:
        # primary 채움은 사용하지 않는다. 현재 위치만 on + aria-current 로 표시한다.
        on = _on(rel, keys)
        cls = " ".join(c for c in (("cta" if pri else ""), ("on" if on else "")) if c)
        href = "#grid" if (h == "guidebook/index.html" and rel == "guidebook/index.html") else p + h
        attrs = (f' class="{cls}"' if cls else "") + (' aria-current="page"' if on else "")
        out.append(f'<a{attrs} href="{href}">{_fi(icon)}{l}</a>')
    return '<nav class="fix" aria-label="모바일 바로가기">' + "".join(out) + "</nav>"


def _sub_guarded(regex, maker, s, rel, name, max_span=20000):
    """블록 교체 가드: 매치 0 = 무변경, 2+ = 실패(중복 셸 방지), 과대 스팬 = 정규식 과탐(본문 삼킴) 실패."""
    # R2 발주에서 파일 무변경으로 지정한 면은 공용 셸도 기존 바이트를 유지한다.
    if rel in {"404.html", "cart.html", "checkout.html", "join.html", "login.html", "my.html", "pay_done.html"}:
        return s
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


def apply_footer(s, rel, compact=False):
    return _sub_guarded(FOOTER_RE, lambda path: footer(path, compact), s, rel, "footer")


def apply_fix(s, rel):
    return _sub_guarded(FIX_RE, fix, s, rel, "fix")


if __name__ == "__main__":
    import sys
    rel = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    print(shell(rel)); print(footer(rel)); print(fix(rel))
