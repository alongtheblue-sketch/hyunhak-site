#!/usr/bin/env python3
"""학교별 2027 면접 가이드북 상품군 페이지 생성기 (결정론).

서브커맨드
  refresh  원천(interview_guidebook_2027/build/*.json + PDF 면수)을 읽어
           _tools/guidebook_catalog.json 을 재박제한다. 가격(price) 필드는 보존.
  build    카탈로그만 읽어 guidebook/index.html + guidebook/<slug>.html 38 개를 쓴다 (플랫폼 v2 템플릿 2종).
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
# 상품 면 = 플랫폼 v2 템플릿 (2026-08-26 s16 하위 페이지 v2 전개). 셸(헤더, 푸터, 모바일 바)은 자리표시를
# apply_nav/apply_footer 가 채우고, seo 블록과 aeo 단락은 seo_inject 가 manifest 로 넣는다.
PAGE_TPL = Path(__file__).with_name("guidebook_page_v2.html")


def fill(tpl, m):
    for k, v in m.items():
        tpl = tpl.replace(k, v)
    assert "__" not in tpl.replace("__proto__", ""), "템플릿 placeholder 잔존: " + tpl[tpl.find("__"):tpl.find("__") + 30]
    return tpl


def price_of(cat, e):
    return e["price"] if e.get("price") is not None else cat["price"]


def render_page(cat, items, i):
    e = items[i]
    name = e["name"]
    price = price_of(cat, e)
    sale = bool(e.get("onsale", True))
    h1 = f"{name} 2027 면접 가이드북"
    title = f"{h1}, 현학적 연구소"
    lede = (f"생기부 기반 면접 예상 프로파일, 2027 대비. 면접 후기와 공식 요강으로 재구성한 {name} 면접의 실제. "
            f"PDF {e['pages']}면, 수록 질문 {e['questions']}건.")
    if sale:
        acts = (f'<button type="button" class="btn" data-cart-sku="{esc(e["sku"])}" data-cart-title="{esc(h1)}" data-cart-price="{price}">담기 <span class="ar" aria-hidden="true">→</span></button>\n'
                f'      <a class="btn ghost" href="../cart.html">장바구니 보기</a>')
        badge = '<span class="badge seal">판매 중</span>'
        note = "결제 후 마이페이지에서 브라우저 보안 리더로 바로 열림. 열람 시작 전 취소 가능."
        final_h2, final_p = "이 학교부터 담기", f"{name} 2027 면접 가이드북, {won(price)}. 보안 리더 열람."
        final_acts = (f'<button type="button" class="btn" data-cart-sku="{esc(e["sku"])}" data-cart-title="{esc(h1)}" data-cart-price="{price}">담기 <span class="ar" aria-hidden="true">→</span></button>'
                      f'<a class="btn ghost" href="index.html">다른 대학 보기</a>')
    else:
        acts = ('<span class="btn" aria-disabled="true">입고 예정</span>\n'
                + (f'      <a class="btn ghost" href="../interview/{e["slug"]}.html">무료 아카이브 열람</a>' if e["archive"]
                   else '      <a class="btn ghost" href="index.html">판매 중인 가이드북</a>'))
        badge = '<span class="badge mute">준비 중</span>'
        note = "보안 리더 준비 중. 준비되는 대로 이 면에서 판매하고 공지에 기록."
        final_h2, final_p = "준비 중인 동안", ("무료 아카이브에서 관측 기록 먼저 열람. 판매 개시는 공지로." if e["archive"]
                                           else "판매 중인 다른 대학 가이드북 먼저. 판매 개시는 공지로.")
        final_acts = ((f'<a class="btn" href="../interview/{e["slug"]}.html">무료 아카이브 열기 <span class="ar" aria-hidden="true">→</span></a>' if e["archive"]
                       else '<a class="btn" href="index.html">판매 중인 가이드북 <span class="ar" aria-hidden="true">→</span></a>')
                      + '<a class="btn ghost" href="../notice.html">공지 보기</a>')
    toc = "\n".join(f'      <li><span class="no">{s["no"]:02d}</span><span class="t">{esc(s["title"])}</span></li>' for s in e["secs"])
    rows = []
    for t in e["types"]:
        obs = f"{t['observed']}건" if t["observed"] is not None else "표기 없음"
        pct = f"{t['pct']:.1f}%" if t["pct"] is not None else "표기 없음"
        rows.append(f'      <tr><td>{esc(t["type"])}</td><td class="num">{obs}</td><td class="num">{pct}</td><td class="num">{t["included"]}건</td></tr>')
    samples = "\n".join(f'      <li><span class="ty">{esc(s["type"])}</span><p class="q">{esc(s["q"])}</p><span class="src">출처: {esc(s["source"])}</span></li>'
                        for s in e["samples"])
    prev_e = items[i - 1] if i > 0 else None
    next_e = items[i + 1] if i + 1 < len(items) else None
    arc = (f'<a class="tlink" href="../interview/{e["slug"]}.html">같은 학교 무료 아카이브</a>' if e["archive"]
           else '<span class="note">이 학교의 무료 아카이브는 준비 중</span>')
    m = {"__TITLE__": esc(title), "__NAME__": esc(name), "__H1__": esc(h1), "__LEDE__": esc(lede), "__SLUG__": e["slug"],
         "__SKU__": esc(e["sku"]), "__PRICE_RAW__": str(price), "__PRICE__": f"{price:,}", "__PAGES__": str(e["pages"]),
         "__QUESTIONS__": str(e["questions"]), "__TYPES_N__": str(e["types_n"]), "__SOURCES_N__": str(e["sources_n"]),
         "__STATUS_BADGE__": badge, "__ACTS__": acts, "__NOTE__": note, "__TOC__": toc, "__TYPES_ROWS__": "\n".join(rows),
         "__SAMPLES__": samples, "__ARCHIVE_LINK__": arc,
         "__PREV__": (f'<a class="tlink" href="{prev_e["slug"]}.html">이전, {esc(prev_e["name"])}</a>' if prev_e else ""),
         "__NEXT__": (f'<a class="tlink" href="{next_e["slug"]}.html">다음, {esc(next_e["name"])}</a>' if next_e else ""),
         "__FINAL_H2__": final_h2, "__FINAL_P__": esc(final_p), "__FINAL_ACTS__": final_acts}
    return fill(PAGE_TPL.read_text(encoding="utf-8"), m)


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
ALLOWED_HEX = {"#312e2e", "#f6f2e9", "#696561", "#bc3529", "#f1ebdd", "#efe9dc", "#fbf9f4", "#4a4644", "#3b2c20", "#d0ac6e"}


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
            # v2 규범: 곡률 6px, 먹 틴트 그림자 1단 허용 (2026-08-26). 팔레트 밖 hex 만 금지
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
