#!/usr/bin/env python3
"""할인 행사 배너를 v2 셸 밖 자리에 넣는다 (2026-09-07).
   ① 상세 LP 4면(programs/*.html): <header class="top"> 를 쓰고 base.css 를 안 실어 apply_nav 가 못 닿는다 → 첫 </header> 뒤 띠(A1, 가격 문장 없음) + </head> 앞 <style data-promo-css>(_tools/promo_lp.css).
   ② 홈(index.html): 卷三 상품 구역, <div class="duo"> 바로 앞에 밴드 B3(괘선 표, _tools/promo_band.html).
   원천 = _tools/promo.json (v2_shell.load_promo 와 같은 판정). 멱등: 넣은 블록을 정규식으로 찾아 교체, 행사 밖이면 걷는다.
   python3 _tools/apply_promo.py [--check]   --check = 바꿀 것이 있으면 rc 1"""
import re, sys, os, glob, html, json
from datetime import datetime, timezone
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v2_shell as V

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LP = sorted(glob.glob(os.path.join(ROOT, "programs", "*.html")))
HOME = os.path.join(ROOT, "index.html")
ASIDE_RE = re.compile(r'\n?<aside\b[^>]*\bdata-promo\b[^>]*>.*?</aside>', re.S)
STYLE_RE = re.compile(r'\n<style data-promo-css>.*?</style>\n', re.S)   # 넣는 형태와 정확히 같은 범위 (개행 누적 방지)
BAND_RE = re.compile(r'<section\b[^>]*\bclass="pband\b[^>]*\bdata-promo\b[^>]*>.*?</section>\n', re.S)
CSS_PATH = os.path.join(ROOT, "_tools", "promo_lp.css")
# ③ 행사 팝업 (2026-09-07): promo.json popup.pages 의 입구 면 </body> 앞에 마크업 1블록. 여는 판정은 app.js(서버 config.promo). 행사 밖이면 걷는다.
POPUP_TPL = os.path.join(ROOT, "_tools", "promo_popup.html")
POPUP_RE = re.compile(r'\n?<!--promo:popup-->.*?<!--/promo:popup-->\n?', re.S)
# ④ 공지 띠 (2026-10-07): _tools/notice.json pages 면의 <main 바로 앞(셸 헤더와 행사 띠 뒤)에 aside 한 줄. 할인 행사와 별개라 data-promo 를 달지 않는다.
#    SHELL_RE 는 </header> 바로 뒤 data-promo aside 만 먹으므로 이 블록은 apply_nav 재실행에 남는다. 행사 밖이면 걷는다.
NOTICE_PATH = os.path.join(ROOT, "_tools", "notice.json")
NOTICE_RE = re.compile(r'<aside\b[^>]*\bdata-notice=[^>]*>.*?</aside>\n', re.S)


def load_notice(now=None):
    """published 이고 기간 안이면 dict, 아니면 None. v2_shell.load_promo 와 같은 판정에서 rate 검사만 뺐다."""
    try:
        with open(NOTICE_PATH, encoding="utf-8") as f:
            n = json.load(f)
    except (OSError, ValueError):
        return None
    if not n.get("published") or not n.get("id") or not n.get("text"):
        return None
    now = now or datetime.now(timezone.utc)
    for k in ("starts_at", "ends_at"):
        v = n.get(k)
        if v is None:
            continue
        try:
            t = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        except ValueError:
            return None
        if t.tzinfo is None:
            return None
        if (k == "starts_at" and now < t) or (k == "ends_at" and now > t):
            return None
    return n


def notice_block(rel, n):
    """공지 띠 마크업. 겉모양은 행사 띠 .r2-promo(판 바탕, 아래 괘선, 가운데 작은 글)와 같고 링크 한 개를 덧붙인다.
       스타일과 만료 숨김 스크립트를 블록 안에 둬 블록을 걷으면 흔적이 남지 않는다 (셸 util 블록, 푸터와 같은 방식)."""
    link = n.get("link") or ""
    a = ""
    if link:
        ext = link.startswith(("http://", "https://"))
        href = link if ext else V.prefix_of(rel) + link
        tgt = ' target="_blank" rel="noopener"' if ext else ""
        a = f' <a class="tlink" href="{html.escape(href, quote=True)}"{tgt}>{html.escape(n.get("link_label") or "자세히")}</a>'
    until = html.escape(n.get("ends_at") or "", quote=True)
    return (f'<aside class="r2-notice" data-notice="{html.escape(n["id"], quote=True)}" data-notice-until="{until}" aria-label="공지">\n'
            '  <style>:where(body.v2) .r2-notice{border-bottom:var(--rule-ui);background:var(--mat)}'
            ':where(body.v2) .r2-notice p{max-width:none;padding-block:var(--s2);font-size:var(--t-xs);line-height:var(--lh-ui);text-align:center;word-break:keep-all;text-wrap:balance}'
            ':where(body.v2) .r2-notice .tlink{white-space:nowrap}</style>\n'
            f'  <div class="wrap"><p>{html.escape(n["text"])}{a}</p></div>\n'
            "  <script>(function(e){var u=Date.parse(e.getAttribute('data-notice-until'));if(u&&Date.now()>u)e.hidden=true;})(document.currentScript.parentElement);</script>\n"
            '</aside>\n')


def apply_notice(s, rel, n):
    s = NOTICE_RE.sub("", s, count=1)
    if not n or rel not in (n.get("pages") or []):
        return s
    anchor = '<main id="main"'
    if s.count(anchor) != 1:
        raise SystemExit(f'{rel}: 공지 띠 자리 {anchor} {s.count(anchor)}개')
    return s.replace(anchor, notice_block(rel, n) + anchor, 1)


def popup_block(rel, p):
    """팝업 마크업 = _tools/promo_popup.html (design-director popup_tpl.html 사본). 자리표 = {mod} {rate} {label} {until_text}
       {promo_id} {ends_at} {img} {rows} {p}. 안 교체 = promo.json popup.variant 한 낱말(pop--gwak | pop--muk | pop--simm),
       도판(popup.img) 이 비면 pop--noimg 를 덧붙여 도판 칸을 통째로 안 그린다. 가격 행은 정가만 적고 data-list-price 를 단다."""
    pop = (p or {}).get("popup") or {}
    if not p or not pop.get("pages"):
        return ""
    with open(POPUP_TPL, encoding="utf-8") as f:
        tpl = f.read()
    tpl = re.sub(r"^\s*<!--.*?-->\s*", "", tpl, count=1, flags=re.S).strip()   # 머리 주석은 지면에 싣지 않는다
    pre = V.prefix_of(rel)
    # 행사 문안은 그대로 두고 구매 링크만 R2 상세면의 구매 블록으로 연결한다.
    tpl = tpl.replace('{p}studio.html#plans', '{p}programs/studio.html#buy')
    tpl = tpl.replace('{p}guidebook/index.html', '{p}programs/guidebook.html#buy')
    img = pop.get("img") or ""
    mod = pop.get("variant") or "pop--gwak"
    if not img:
        mod += " pop--noimg"
        tpl = re.sub(r"\s*<figure class=\"pkv\">.*?</figure>", "", tpl, count=1, flags=re.S)   # 빈 src 의 img 는 문서 자신을 다시 요청한다. 칸을 통째로 뺀다
    rows = pop.get("rows") or [r for r in ((p.get("band") or {}).get("rows") or [])][:2]
    rows_html = "".join(f'\n            <tr><th scope="row">{html.escape(str(name))}</th><td><span data-list-price="{int(price)}">{int(price):,}원</span></td></tr>' for name, price in rows)
    # 안내 한 줄 (2026-09-10): popup.notice 가 있으면 마감 줄 아래에 사실 문장 + 텍스트 링크 하나. 행사 문안과 같은 층이 아니라 별 단락.
    nt = pop.get("notice") or {}
    notice_line = ""
    if nt.get("text"):
        href = nt.get("href") or ""
        link = f' <a class="tlink" href="{pre}{html.escape(href)}">{html.escape(nt.get("label") or "안내 보기")}</a>' if href else ""
        notice_line = f'        <p class="pnote" id="ppopN">{html.escape(nt["text"])}{link}</p>\n'
    return "\n" + tpl.format(
        mod=mod, rate=f"{p['rate']}%", label=html.escape(pop.get("title") or p.get("label") or ""),
        until_text=html.escape((p.get("band") or {}).get("until_text") or ""),
        promo_id=p["id"], ends_at=p["ends_at"], img=(pre + img) if img else "", rows=rows_html, p=pre,
        link_studio_label=html.escape(pop.get("link_studio_label") or "면접 스튜디오 구매 바로가기"),
        link_guidebook_label=html.escape(pop.get("link_guidebook_label") or "가이드북 바로가기"),
        mute_label=html.escape(pop.get("mute_label") or "오늘 하루 보지 않기"),
        notice_line=notice_line,
    ) + "\n"


def apply_popup(s, rel, p):
    s = POPUP_RE.sub("\n", s, count=1)
    pop = (p or {}).get("popup") or {}
    if not p or rel not in (pop.get("pages") or []) or rel in (p.get("exclude") or []):
        return s
    block = popup_block(rel, p)
    if not block:
        return s
    if s.count("</body>") != 1:
        raise SystemExit(f"{rel}: </body> {s.count('</body>')}개")
    return s.replace("</body>", "<!--promo:popup-->\n" + block.strip("\n") + "\n<!--/promo:popup-->\n</body>", 1)


def apply_lp(s, rel, p):
    s = ASIDE_RE.sub("", s, count=1)
    s = STYLE_RE.sub("", s, count=1)
    if not p:
        return s
    if rel in {"programs/guidebook.html", "programs/studio.html"}:
        # R2 상세면은 base.css와 공용 셸을 쓴다. 구 LP CSS를 재주입하지 않는다.
        return s.replace('</header>', '</header>' + V.promo_strip(rel, p, price_note=False), 1)
    aside = V.promo_strip(rel, p, price_note=False)   # app.js 가 없는 면: 정가 문장을 빼고 문구 + 링크만
    if not aside:
        return s
    with open(CSS_PATH, encoding="utf-8") as f:
        css = f.read().strip()
    hs = list(re.finditer(r"</header>", s))
    if not hs:
        raise SystemExit(f"{rel}: </header> 없음")
    h = hs[0]
    s = s[:h.end()] + aside + s[h.end():]
    if s.count("</head>") != 1:
        raise SystemExit(f"{rel}: </head> {s.count('</head>')}개")
    return s.replace("</head>", f"\n<style data-promo-css>\n{css}\n</style>\n</head>", 1)


def apply_home(s, p):
    # 상단 공지는 바로 앞 행사 띠 한 층으로 통합한다. 해당 홈 블록만 제거한다.
    s = re.sub(r'<div class="strip"><div class="in wrap">.*?</div></div>\n?', "", s, count=1, flags=re.S)
    s = BAND_RE.sub("", s, count=1)
    if not p:
        return s
    band = V.promo_band("index.html", p)
    if not band:
        return s
    anchor = '<!--r2:promo-band-->'
    if s.count(anchor) != 1:
        raise SystemExit('index.html: R2 행사 가격표 자리표시는 1개여야 합니다')
    return s.replace(anchor, band + '\n' + anchor, 1)


def main():
    check = "--check" in sys.argv
    p = V.load_promo()
    changed = []
    pop_pages = [os.path.join(ROOT, r) for r in ((p or {}).get("popup") or {}).get("pages") or []]
    # 행사 밖에서도 팝업 블록을 걷어야 하므로 원천 파일의 pages 가 비면 직전 적용면을 정규식으로 찾는다
    if not pop_pages:
        pop_pages = [f for f in glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "guidebook", "index.html")) if "<!--promo:popup-->" in open(f, encoding="utf-8").read()]
    n = load_notice()
    # 공지도 걷을 자리를 찾아야 하므로 pages 밖에서 data-notice 가 남은 면을 같이 훑는다
    notice_pages = [os.path.join(ROOT, r) for r in (n or {}).get("pages") or []]
    notice_pages += [f for f in glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "*", "*.html"))
                     if f not in notice_pages and "data-notice=" in open(f, encoding="utf-8").read()]
    targets = []
    for path in LP + [HOME] + pop_pages + notice_pages:
        if path not in targets:
            targets.append(path)
    for path in targets:
        rel = os.path.relpath(path, ROOT)
        with open(path, encoding="utf-8") as f:
            s = f.read()
        new = s
        if path in LP:
            new = apply_lp(new, rel, p)
        if path == HOME:
            new = apply_home(new, p)
        if path in pop_pages or "<!--promo:popup-->" in new:
            new = apply_popup(new, rel, p)
        if path in notice_pages:
            new = apply_notice(new, rel, n)
        if new != s:
            changed.append(rel)
            if not check:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new)
    print(f"promo {'점검' if check else '적용'}: LP {len(LP)} + 홈 1 + 팝업 {len(pop_pages)} + 공지 {len(notice_pages)} / 변경 {len(changed)} {changed if changed else ''} / 행사 {'중' if p else '없음'} / 공지 {n['id'] if n else '없음'}")
    if check and changed:
        sys.exit(1)


if __name__ == "__main__":
    main()
