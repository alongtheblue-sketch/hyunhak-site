#!/usr/bin/env python3
"""학교별 2027 면접 가이드북 상품군 페이지 생성기 (결정론).

서브커맨드
  refresh  원천(interview_guidebook_2027/build/*.json + PDF 면수)을 읽어
           _tools/guidebook_catalog.json 을 재박제한다. 가격(price) 필드는 보존.
  build    카탈로그만 읽어 guidebook/index.html + guidebook/<slug>.html 38 개를 쓴다.
  verify   산출 검증: 멱등(재생성 바이트 동일), 상대 링크 실재, <style> 금지 속성,
           hex 색상, 금지 문자, 명단(roster) 문자열 0 건.

가격: 카탈로그 최상위 "price" 한 곳이 전 권 기본값. 개별 항목 "price" 가 null 이면 상속.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
CATALOG = SITE / "_tools" / "guidebook_catalog.json"
OUT = SITE / "guidebook"
SRC_DEFAULT = Path.home() / "Workspace" / "interview_guidebook_2027"

# slug ↔ 학교명 (고정). 앞 26 = 면접 아카이브(interview/<slug>.html) 보유, 뒤 12 = 신규.
SLUGS = [
    ("ajou", "아주대학교"), ("catholic", "가톨릭대학교"), ("cau", "중앙대학교"),
    ("dongguk", "동국대학교"), ("ewha", "이화여자대학교"), ("gachon", "가천대학교"),
    ("hufs", "한국외국어대학교"), ("inha", "인하대학교"), ("khu", "경희대학교"),
    ("knu", "경북대학교"), ("konkuk", "건국대학교(서울)"), ("kookmin", "국민대학교"),
    ("korea", "고려대학교(서울)"), ("kwangwoon", "광운대학교"), ("kyonggi", "경기대학교"),
    ("myongji", "명지대학교"), ("pusan", "부산대학교"), ("sejong", "세종대학교"),
    ("seoultech", "서울과학기술대학교"), ("skku", "성균관대학교"), ("snu", "서울대학교"),
    ("sookmyung", "숙명여자대학교"), ("soongsil", "숭실대학교"), ("sungshin", "성신여자대학교"),
    ("uos", "서울시립대학교"), ("yonsei", "연세대학교(서울)"),
    ("dgist", "DGIST(대구경북과학기술원)"), ("dankook", "단국대학교(죽전)"),
    ("duksung", "덕성여자대학교"), ("dongduk", "동덕여자대학교"), ("donga", "동아대학교"),
    ("pknu", "부경대학교"), ("sahmyook", "삼육대학교"), ("swu", "서울여자대학교"),
    ("ulsan", "울산대학교"), ("incheon", "인천대학교"), ("hanyang-erica", "한양대학교(ERICA)"),
    ("hongik", "홍익대학교(서울)"),
]
ARCHIVE = {s for s, _ in SLUGS[:26]}
DEFAULT_PRICE = 16500
SAMPLE_MAX = 4
SAMPLE_LEN = 120

# 출처 문자열 → 기관명. 파일명, 개인 필명, 페이지 번호는 노출하지 않는다.
SOURCE_MAP = [
    (r"신명", "신명여고 자료실"),
    (r"울산고", "울산고 진학자료실"),
    (r"대구동구", "대구동구 진로진학센터"),
    (r"orbi", "오르비 면접후기 모음집"),
    (r"부산교육청|부산광역시교", "부산교육청"),
    (r"제주교육청", "제주교육청"),
    (r"광주교육청", "광주교육청"),
    (r"대구교육청|^대구\d{4}", "대구교육청"),
    (r"울산교육청|^울산\d{4}", "울산교육청"),
    (r"경기도 진학", "경기도 진학연구팀"),
    (r"도교육청", "도교육청 면접자료집"),
    (r"^팩", "대학 공식 요강"),
    (r"요강", "대학 입학 요강"),
    (r"복원", "면접 복원문제 자료집"),
    (r"기출", "면접 기출 자료집"),
    (r"후기", "면접 후기 자료집"),
    (r"대학교|대학|여대", "대학 공식 자료"),
]
SOURCE_FALLBACK = "면접 후기 자료집"


# ---------------------------------------------------------------- 텍스트 정리
def clean(s):
    """가운뎃점, em 대시, 마크다운 강조, 화살표 제거. 결정론."""
    if s is None:
        return ""
    s = s.replace("**", "")
    s = re.sub(r"\s*\(?\s*★?\s*엔진 핵심\s*\)?", "", s)
    s = s.replace("★", "")
    s = re.sub(r"[➊-➓①-⑳]\s*", "", s)
    s = re.sub(r"\s*→\s*", "에서 ", s)
    s = s.replace("·", ", ").replace("—", ", ").replace("–", ", ")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s*,\s*,\s*", ", ", s)
    return s


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def won(n):
    return f"{n:,}원"


def source_label(cite):
    if not cite:
        return None
    for pat, label in SOURCE_MAP:
        if re.search(pat, cite):
            return label
    return SOURCE_FALLBACK


def source_doc(cite):
    """출처 문서 식별자 (면 번호 제거). 출처 건수 집계용."""
    return re.sub(r"\s+p\.?\s*\d+.*$", "", cite).strip()


def parse_group_title(t):
    """'유형명 (관측 N건, P%) ...' 류 제목에서 (유형명, 관측건수, 비율) 추출.
    괄호는 숫자, '팩', '관측' 을 품은 첫 괄호 또는 ' (' 에서 끊고, ' — ' 뒤 설명은 버린다."""
    t = t.replace("**", "")
    cuts = [len(t)]
    i = t.find(" (")
    if i >= 0:
        cuts.append(i)
    for m in re.finditer(r"\(([^)]*)\)", t):
        if re.search(r"\d|팩|관측", m.group(1)):
            cuts.append(m.start())
            break
    for dash in ("—", "–"):
        i = t.find(dash)
        if i >= 0:
            cuts.append(i)
    cut = min(cuts)
    name, rest = t[:cut], t[cut:]
    name = re.sub(r"^\d+-\d+\s+", "", name.strip())
    m = re.search(r"([\d.]+)\s*%", rest)
    pct = float(m.group(1)) if m else None
    first = re.search(r"(\d+)\s*[건행]", rest)
    observed = int(first.group(1)) if first else None
    m = re.search(r"(\d+)\s*[건행]\s*중\s*(\d+)\s*[건행]", rest)
    if m and pct is not None and abs(int(m.group(2)) / int(m.group(1)) * 100 - pct) < 0.2:
        observed = int(m.group(2))          # "관측 693건 중 35건, 5.05%" = 분모 중 관측
    elif re.search(r"(\d+)\s*/\s*(\d+)", rest):
        observed = int(re.search(r"(\d+)\s*/\s*(\d+)", rest).group(1))   # "29/917건 = 3.2%"
    else:
        m = re.search(r"(\d+)\s*[건행]\s*\+\s*(?:재분류\s*)?(\d+)\s*[건행]", rest)
        if m:
            observed = int(m.group(1)) + int(m.group(2))
    return clean(name), observed, pct


# ---------------------------------------------------------------- refresh
def pdf_pages(path):
    r = subprocess.run(["mdls", "-name", "kMDItemNumberOfPages", "-raw", str(path)],
                       capture_output=True, text=True, check=True)
    return int(r.stdout.strip())


def extract(univ, src):
    d = json.load(open(src / "build" / f"{univ}.json", encoding="utf-8"))
    pdf = src / "dist_hyunhak_clean" / f"{univ}_2027면접가이드북.pdf"
    secs = [{"no": s["no"], "title": clean(s["title"])} for s in d["secs"] if s["no"] >= 1]

    types, order = {}, []
    docs = set()
    samples = []
    n_items = 0
    for g in d["qgroups"]:
        name, observed, pct = parse_group_title(g["title"])
        if name not in types:
            types[name] = {"type": name, "observed": observed, "pct": pct, "included": 0}
            order.append(name)
        types[name]["included"] += len(g["items"])
        n_items += len(g["items"])
        prev = None
        picked = any(s["type"] == name for s in samples)
        for it in g["items"]:
            cite = it.get("cite")
            if cite and cite.strip().startswith("동") and prev:
                cite = prev
            if cite:
                prev = cite
                docs.add(source_doc(cite))
            label = source_label(cite)
            if label is None and g.get("sub") and re.search(r"공식|요강|안내서", g["sub"]):
                label = "대학 공식 안내서"
            if not picked and label and len(samples) < SAMPLE_MAX and it.get("q"):
                q = clean(it["q"])
                if len(q) > SAMPLE_LEN:
                    q = q[:SAMPLE_LEN].rstrip() + "…"
                samples.append({"type": name, "q": q, "source": label})
                picked = True
    return {
        "name": univ,
        "file": pdf.name,
        "pages": pdf_pages(pdf),
        "questions": n_items,
        "types_n": len(order),
        "sources_n": len(docs),
        "secs": secs,
        "types": [types[k] for k in order],
        "samples": samples,
    }


def cmd_refresh(args):
    src = Path(args.src).expanduser()
    old = json.load(open(CATALOG, encoding="utf-8")) if CATALOG.exists() else {}
    old_items = {e["slug"]: e for e in old.get("items", [])}
    items = []
    for slug, univ in SLUGS:
        e = extract(univ, src)
        e = {"slug": slug, "sku": f"guide-{slug}", "price": old_items.get(slug, {}).get("price"),
             "onsale": old_items.get(slug, {}).get("onsale", True),
             "archive": slug in ARCHIVE, **e}
        items.append(e)
    cat = {
        "_note": "_tools/build_guidebook.py refresh 가 박제. price 최상위 1 곳 = 전 권 기본값, 항목 price null = 상속.",
        "year": 2027,
        "price": old.get("price", DEFAULT_PRICE),
        "items": items,
    }
    CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"catalog: {len(items)} items, pages={sum(i['pages'] for i in items)}, "
          f"questions={sum(i['questions'] for i in items)} -> {CATALOG}")


# ---------------------------------------------------------------- build
PAGE_CSS = """
/* guidebook 상품 페이지 전용. 전부 클래스 스코프, 곡률 0, 그림자 0, 팔레트 추가 0 */
.gb{--measure:760px;max-width:1080px;padding:0 var(--gut)}
.gb .sec{padding:64px 0 8px}
.gb .sec h2{font-family:var(--serif);font-weight:700;font-size:var(--t-h2);letter-spacing:-0.03em}
.gb .sec .lead{margin-top:12px;font-size:14px;line-height:1.9;color:var(--gray);max-width:60ch}
.gb .toc{margin-top:28px;max-width:var(--measure)}
.gb .toc li{display:grid;grid-template-columns:56px 1fr;gap:18px;align-items:baseline;padding:14px 0}
.gb .toc .no{font-family:var(--serif);font-weight:300;font-size:14px;color:var(--gray)}
.gb .toc .t{font-family:var(--serif);font-weight:500;font-size:16.5px;letter-spacing:-0.01em}
.gb .tblwrap{overflow-x:auto;margin-top:28px;border-top:1px solid var(--ink)}
.gb .tbl{border-collapse:collapse;width:100%;min-width:520px;font-size:13px}
.gb .tbl th{font-size:11px;letter-spacing:.08em;color:var(--gray);font-weight:600;text-align:left;
  padding:10px 14px 10px 0;border-bottom:1px solid var(--hair);white-space:nowrap}
.gb .tbl td{padding:11px 14px 11px 0;border-bottom:1px solid var(--hairs);color:var(--body);line-height:1.7;vertical-align:top}
.gb .tbl .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.gb .tbl th.num{text-align:right}
.gb .taste{margin-top:28px;max-width:var(--measure)}
.gb .taste li{padding:18px 0}
.gb .taste .ty{font-size:11px;letter-spacing:.1em;color:var(--gray);display:block}
.gb .taste .q{margin-top:8px;font-family:var(--serif);font-weight:500;font-size:16px;line-height:1.75;
  letter-spacing:-0.01em;overflow-wrap:anywhere}
.gb .taste .src{margin-top:6px;font-size:11px;letter-spacing:.04em;color:var(--gray);display:block}
.gb .tastenote{margin-top:16px;font-size:12px;color:var(--gray)}
.buy{margin-top:80px;display:grid;grid-template-columns:minmax(300px,40%) 1fr;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.buy .plate{background:var(--mat);border-right:1px solid var(--hair);padding:56px var(--gut);display:flex;align-items:flex-start;justify-content:center}
.buy .cover{border:1px solid var(--hair);padding:38px 30px 34px;width:100%;max-width:340px;aspect-ratio:1/1.4142;
  display:flex;flex-direction:column;justify-content:space-between;background:var(--paper)}
.buy .cover .brand{font-family:var(--serif);font-weight:300;font-size:12px;letter-spacing:.12em;color:var(--gray)}
.buy .cover .ct{font-family:var(--serif);font-weight:700;font-size:clamp(22px,2.4vw,30px);letter-spacing:-0.03em;line-height:1.25;margin-top:auto}
.buy .cover .cy{font-family:var(--serif);font-weight:300;font-size:15px;margin-top:10px;color:var(--gray)}
.buy .cover .foot{display:flex;justify-content:space-between;align-items:center;margin-top:34px}
.buy .cover .foot .han{font-family:var(--serif);font-weight:300;font-size:12px;color:var(--gray)}
.buy .panel{padding:64px var(--gut) 70px}
.buy .panel .cap{font-size:11px;letter-spacing:.1em;display:block}
.buy .panel .pt{font-family:var(--serif);font-weight:700;font-size:var(--t-h2);letter-spacing:-0.03em;margin-top:16px}
.buy .panel .price{margin-top:22px;font-weight:700;font-size:26px;letter-spacing:-0.02em}
.buy .panel .spec{margin-top:30px;max-width:460px;list-style:none}
.buy .panel .spec li{display:flex;justify-content:space-between;gap:20px;padding:11px 0;font-size:13.5px;border-top:1px solid rgba(246,242,233,.16)}
.buy .panel .spec li:last-child{border-bottom:1px solid rgba(246,242,233,.16)}
.buy .panel .spec .k{font-size:12px}
.buy .panel .acts{margin-top:36px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.buy .panel .member{margin-top:22px;font-size:12.5px;line-height:1.9;max-width:52ch}
.after{max-width:1080px;padding:56px var(--gut) 96px;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;align-items:baseline}
.after .nb{display:flex;gap:26px;flex-wrap:wrap}
@media (max-width:900px){
  .buy{grid-template-columns:1fr}
  .buy .plate{border-right:0;border-bottom:1px solid var(--hair)}
}
"""

INDEX_CSS = """
/* guidebook 목록 전용. 전부 클래스 스코프, 곡률 0, 그림자 0, 팔레트 추가 0 */
.gbl{max-width:1080px;padding:48px var(--gut) 96px}
.gbl .lead{font-size:14.5px;line-height:1.9;color:var(--body);max-width:60ch}
.gbl .list{margin-top:40px}
.gbl .list li a{display:grid;grid-template-columns:minmax(0,1fr) 90px 110px 110px;gap:18px;align-items:baseline;padding:18px 0}
.gbl .list li a:hover .t{color:var(--gray)}
.gbl .list .t{font-family:var(--serif);font-weight:500;font-size:17px;letter-spacing:-0.01em}
.gbl .list .m{font-size:12px;color:var(--gray);text-align:right;font-variant-numeric:tabular-nums}
.gbl .list .p{font-size:14px;font-weight:600;text-align:right}
.gbl .list .hd{display:grid;grid-template-columns:minmax(0,1fr) 90px 110px 110px;gap:18px;padding:0 0 10px;
  font-size:11px;letter-spacing:.08em;color:var(--gray)}
.gbl .list .hd span:not(:first-child){text-align:right}
.gbl .note{margin-top:28px;font-size:12px;color:var(--gray);line-height:1.9}
@media (max-width:900px){
  .gbl .list li a,.gbl .list .hd{grid-template-columns:minmax(0,1fr) 70px 80px}
  .gbl .list .hd span:nth-child(3),.gbl .list .m.q{display:none}
}
"""

NAV = """<header class="nav u">
  <a class="brand" href="../index.html">현학적 연구소</a>
  <nav id="hhNav"><a href="../studio.html">면접 스튜디오</a><a href="../guidebook/index.html" class="on">가이드북</a><a href="../store.html">스토어</a><a href="../interview/index.html">면접 아카이브</a><a href="../library.html">자료실</a><a href="../about.html">연구소</a></nav>
  <div class="aux"><a href="../login.html">로그인</a><a href="../join.html">가입</a><a href="../cart.html">장바구니</a><button type="button" class="menu" aria-expanded="false" aria-controls="hhNav">메뉴</button></div>
</header>"""

FOOTER = """<footer class="u">\n<span>현학적 연구소 <span class="han">玄學的 硏究所</span></span>\n</footer>"""

CART_JS = """<script>
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('[data-cart-sku]').forEach(function(el){
    el.addEventListener('click', function(ev){
      ev.preventDefault();
      HH.addToCart({ sku: el.dataset.cartSku, title: el.dataset.cartTitle,
        price: +el.dataset.cartPrice, qty: 1, ship: false });
      if (confirm('장바구니에 담았습니다. 장바구니로 이동하시겠습니까?')) location.href = '../cart.html';
    });
  });
});
</script>"""


def head(title, path, desc, css, crumbs):
    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList",
          "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u}
                              for i, (n, u) in enumerate(crumbs)]}
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<link rel="canonical" href="https://hyunhak.com/guidebook/{path}">
<meta property="og:url" content="https://hyunhak.com/guidebook/{path}">
<meta name="description" content="{esc(desc)}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="product">
<link rel="icon" href="../assets/favicon_32.png">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;500;700&display=swap">
<link rel="stylesheet" href="../assets/base.css">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>{css}</style>
</head>
<body>
"""


def price_of(cat, e):
    return e["price"] if e.get("price") is not None else cat["price"]


def render_page(cat, items, i):
    e = items[i]
    name = e["name"]
    price = price_of(cat, e)
    h1 = f"{name} 2027 면접 가이드북"
    acts = (f'<button class="act" type="button" data-cart-sku="{esc(e["sku"])}" data-cart-title="{esc(h1)}" data-cart-price="{price}">담기</button>\n'
            f'      <a class="textlink" href="../cart.html">장바구니 보기</a>') if e.get("onsale", True) else \
           '<span class="u gray">보안 리더 준비 중입니다. 준비되는 대로 이 면에서 판매합니다</span>'
    title = f"{h1}, 현학적 연구소"
    desc = (f"{name} 생기부 기반 면접 예상 프로파일. PDF {e['pages']}면, 수록 질문 {e['questions']}건, "
            f"유형 {e['types_n']}종. 회원은 보안 리더로 열람합니다.")
    crumbs = [("현학적 연구소", "https://hyunhak.com/"),
              ("가이드북", "https://hyunhak.com/guidebook/"),
              (h1, f"https://hyunhak.com/guidebook/{e['slug']}.html")]
    o = [head(title, f"{e['slug']}.html", desc, PAGE_CSS, crumbs), NAV, '<main class="page">']
    o.append(f"""<div class="pagehead">
  <p class="crumb u gray"><a href="index.html">가이드북</a> / {esc(name)}</p>
  <h1>{esc(h1)}</h1>
  <p class="han">생기부 기반 면접 예상 프로파일, 2027 대비. 면접 후기와 공식 요강으로 재구성한 {esc(name)} 면접의 실제</p>
</div>""")
    o.append(f"""<div class="facts">
  <div class="f"><span class="n">{e['pages']}</span><span class="k">면</span></div>
  <div class="f"><span class="n">{e['questions']}</span><span class="k">수록 질문</span></div>
  <div class="f"><span class="n">{e['types_n']}</span><span class="k">질문 유형</span></div>
  <div class="f"><span class="n">{e['sources_n']}</span><span class="k">출처 자료</span></div>
</div>""")
    # 목차
    o.append('<div class="gb">')
    o.append('<section class="sec"><h2>이 책이 다루는 것</h2>'
             '<p class="lead">본문 장 구성입니다. 머리말은 제외했습니다.</p><ol class="toc rows">')
    for s in e["secs"]:
        o.append(f'<li><span class="no">{s["no"]:02d}</span><span class="t">{esc(s["title"])}</span></li>')
    o.append("</ol></section>")
    # 유형 분포
    o.append('<section class="sec"><h2>질문 유형 분포</h2>'
             '<p class="lead">관측 건수는 이 학교 면접 후기 전체에서 집계한 수, 수록 건수는 책에 실린 수입니다.</p>'
             '<div class="tblwrap"><table class="tbl"><thead><tr><th>유형</th><th class="num">관측</th>'
             '<th class="num">비율</th><th class="num">수록</th></tr></thead><tbody>')
    for t in e["types"]:
        obs = f"{t['observed']}건" if t["observed"] is not None else "표기 없음"
        pct = f"{t['pct']:.1f}%" if t["pct"] is not None else "표기 없음"
        o.append(f'<tr><td>{esc(t["type"])}</td><td class="num">{obs}</td><td class="num">{pct}</td>'
                 f'<td class="num">{t["included"]}건</td></tr>')
    o.append("</tbody></table></div></section>")
    # 맛보기
    o.append('<section class="sec"><h2>맛보기</h2>'
             '<p class="lead">유형별 첫 수록 질문입니다. 출처는 자료집 기관명만 표기합니다.</p><ol class="taste rows">')
    for s in e["samples"]:
        o.append(f'<li><span class="ty">{esc(s["type"])}</span><p class="q">{esc(s["q"])}</p>'
                 f'<span class="src">출처: {esc(s["source"])}</span></li>')
    o.append(f'</ol><p class="tastenote">전체 {e["questions"]}건과 유형 해설은 책 본문에 있습니다.</p></section>')
    o.append("</div>")
    # 구매 블록
    o.append(f"""<section class="buy">
  <div class="plate">
    <div class="cover" aria-label="표지">
      <span class="brand">현학적 연구소</span>
      <p class="ct">{esc(name)}<br>면접 가이드북</p>
      <p class="cy">2027 대비</p>
      <div class="foot"><span class="seal-dot" aria-hidden="true"></span><span class="han">玄學的 硏究所</span></div>
    </div>
  </div>
  <div class="panel invert">
    <span class="cap u">가이드북, {esc(e['sku'])}</span>
    <p class="pt">{esc(h1)}</p>
    <p class="price">{won(price)}</p>
    <ul class="spec">
      <li><span class="k">형태</span><span>PDF {e['pages']}면, 보안 리더 열람</span></li>
      <li><span class="k">수록</span><span>질문 {e['questions']}건, 유형 {e['types_n']}종</span></li>
      <li><span class="k">인쇄</span><span>3회</span></li>
      <li><span class="k">원본 파일</span><span>비제공</span></li>
    </ul>
    <div class="acts">
      {acts}
    </div>
    <p class="member">회원은 보안 리더로 열람합니다. 인쇄 3회, 원본 파일 비제공. 결제 후 자료실에서 바로 열립니다.</p>
  </div>
</section>""")
    # 하단 링크
    prev_e = items[i - 1] if i > 0 else None
    next_e = items[i + 1] if i + 1 < len(items) else None
    o.append('<div class="after">')
    if e["archive"]:
        o.append(f'<a class="textlink u" href="../interview/{e["slug"]}.html">같은 학교 면접 아카이브</a>')
    else:
        o.append('<span class="u gray">이 학교의 면접 아카이브는 준비 중입니다</span>')
    o.append('<div class="nb">')
    if prev_e:
        o.append(f'<a class="textlink u" href="{prev_e["slug"]}.html">이전, {esc(prev_e["name"])}</a>')
    o.append('<a class="textlink u" href="index.html">전체 38권</a>')
    if next_e:
        o.append(f'<a class="textlink u" href="{next_e["slug"]}.html">다음, {esc(next_e["name"])}</a>')
    o.append("</div></div>")
    o.append("</main>")
    o.append(FOOTER)
    o.append('<script src="../assets/app.js"></script>')
    o.append(CART_JS)
    o.append("</body>\n</html>\n")
    return "\n".join(o)


INDEX_TPL = Path(__file__).with_name("guidebook_index_v2.html")


def render_index(cat, items):
    """목록 = 플랫폼 v2 템플릿 (2026-08-26 결재 V2-2). 숫자와 HH_GB 데이터는 카탈로그에서 채운다.
    seo 블록과 aeo 단락은 seo_inject 가 manifest 로 넣는다 (템플릿에 canonical/description 없음)."""
    n = len(items)
    pages = sum(e["pages"] for e in items)
    qs = sum(e["questions"] for e in items)
    sale = sum(1 for e in items if e.get("onsale", True))
    archive = sum(1 for e in items if e.get("archive"))
    price = int(cat["price"])
    gb = [{"slug": e["slug"], "sku": e.get("sku") or f"guide-{e['slug']}", "name": e["name"], "pages": e["pages"],
           "q": e["questions"], "sale": bool(e.get("onsale", True)), "archive": bool(e.get("archive"))} for e in items]
    h1 = "학교별 2027 면접 가이드북"
    fill = {"__TITLE__": esc(f"{h1} {n}권, 현학적 연구소"), "__N__": str(n), "__SALE__": str(sale), "__READY__": str(n - sale),
            "__ARCHIVE__": str(archive), "__PAGES__": f"{pages:,}", "__QS__": f"{qs:,}", "__PRICE_RAW__": str(price),
            "__PRICE__": f"{price:,}", "__HH_GB__": json.dumps(gb, ensure_ascii=False, separators=(",", ":"))}
    t = INDEX_TPL.read_text(encoding="utf-8")
    for k, v in fill.items():
        t = t.replace(k, v)
    assert "__" not in t.replace("__proto__", ""), "템플릿 placeholder 잔존"
    return t


def build_to(out_dir):
    cat = json.load(open(CATALOG, encoding="utf-8"))
    items = sorted(cat["items"], key=lambda e: e["name"])
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    p = out_dir / "index.html"
    p.write_text(render_index(cat, items), encoding="utf-8")
    written.append(p)
    for i in range(len(items)):
        p = out_dir / f"{items[i]['slug']}.html"
        p.write_text(render_page(cat, items, i), encoding="utf-8")
        written.append(p)
    return written


def cmd_build(args):
    if not CATALOG.exists():
        sys.exit("catalog 없음: 먼저 refresh")
    w = build_to(OUT)
    print(f"build: {len(w)} files -> {OUT}")


# ---------------------------------------------------------------- verify
ALLOWED_HEX = {"#312e2e", "#f6f2e9", "#696561", "#bc3529", "#f1ebdd"}


def cmd_verify(args):
    fails = []
    files = sorted(OUT.glob("*.html"))
    if len(files) != len(SLUGS) + 1:
        fails.append(f"파일 수 {len(files)} != {len(SLUGS) + 1}")
    # 멱등
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "guidebook"
        build_to(tmp)
        for f in files:
            if f.read_bytes() != (tmp / f.name).read_bytes():
                fails.append(f"멱등 실패: {f.name}")
    # 링크, 스타일, 문자
    link_n = 0
    for f in files:
        html = f.read_text(encoding="utf-8")
        for m in re.finditer(r'(?:href|src)="([^"]+)"', html):
            u = m.group(1)
            if u.startswith(("http", "#", "mailto:", "data:")):
                continue
            link_n += 1
            target = (f.parent / u.split("#")[0]).resolve()
            if not target.exists():
                fails.append(f"링크 부재: {f.name} -> {u}")
        for style in re.findall(r"<style>(.*?)</style>", html, flags=re.S):
            for bad in ("border-radius", "box-shadow"):
                if bad in style:
                    fails.append(f"{bad}: {f.name}")
            for hx in re.findall(r"#[0-9a-fA-F]{3,8}\b", style):
                if hx.lower() not in ALLOWED_HEX:
                    fails.append(f"hex {hx}: {f.name}")
        body = re.sub(r"<script.*?</script>", "", html, flags=re.S)
        for ch in ("·", "—", "衒"):
            if ch in body:
                fails.append(f"금지 문자 {ch!r}: {f.name} x{body.count(ch)}")
    # 명단 (학생 실명) 0 건
    roster_hits = None
    roster = Path(args.roster).expanduser() if args.roster else None
    if roster and roster.exists():
        names = json.load(open(roster, encoding="utf-8"))
        roster_hits = 0
        for f in files:
            html = f.read_text(encoding="utf-8")
            roster_hits += sum(html.count(nm) for nm in names if nm)
        if roster_hits:
            fails.append(f"명단 문자열 노출 {roster_hits}건")
    print(f"files={len(files)} links={link_n} roster_hits={roster_hits} fails={len(fails)}")
    for x in fails:
        print("  FAIL", x)
    sys.exit(1 if fails else 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("refresh")
    r.add_argument("--src", default=str(SRC_DEFAULT))
    r.set_defaults(fn=cmd_refresh)
    b = sub.add_parser("build")
    b.set_defaults(fn=cmd_build)
    v = sub.add_parser("verify")
    v.add_argument("--roster", default=str(SRC_DEFAULT / "data" / "roster.json"))
    v.set_defaults(fn=cmd_verify)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
