#!/usr/bin/env python3
"""학교별 2027 면접 가이드북 상품군 페이지 생성기 (결정론).

서브커맨드
  refresh  원천(interview_guidebook_2027/export/site/*.json + PDF 면수)을 읽어
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
DEFAULT_PRICE = 33000
SAMPLE_MAX = 4
SAMPLE_LEN = 120


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
    for ch in ("·", "∙", "‧", "・", "•", "—", "–"):
        s = s.replace(ch, ", ")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s*,\s*,\s*", ", ", s)
    return s


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def won(n):
    return f"{n:,}원"


# ---------------------------------------------------------------- refresh
def pdf_pages(path):
    if not path.is_file():
        raise FileNotFoundError(f"PDF 없음: {path}")
    r = subprocess.run(["mdls", "-name", "kMDItemNumberOfPages", "-raw", str(path)],
                       capture_output=True, text=True)
    raw = r.stdout.strip()
    if r.returncode == 0 and raw.isdigit():
        return int(raw)
    # 외부 저장소는 Spotlight 메타데이터가 없어도 PDF 자체는 정상일 수 있다.
    r = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True)
    m = re.search(r"^Pages:\s+(\d+)\s*$", r.stdout, flags=re.M)
    if r.returncode != 0 or not m:
        raise RuntimeError(f"PDF 면수 판독 실패: {path}: {r.stderr.strip()}")
    return int(m.group(1))


def extract(univ, src):
    site_json = src / "export" / "site" / f"{univ}.json"
    if not site_json.is_file():
        raise FileNotFoundError(f"site export 없음: {site_json}")
    d = json.load(open(site_json, encoding="utf-8"))
    if d.get("univ") != univ:
        raise ValueError(f"{univ}: export/site univ 불일치: {d.get('univ')!r}")
    qgroups = d.get("qgroups")
    counts = d.get("counts")
    if not isinstance(qgroups, list) or not isinstance(counts, dict):
        raise ValueError(f"{univ}: export/site qgroups 또는 counts 계약 누락")
    for key in ("questions", "rules", "types"):
        if not isinstance(counts.get(key), int):
            raise ValueError(f"{univ}: export/site counts.{key} 정수 누락")
    if counts["types"] != len(qgroups):
        raise ValueError(f"{univ}: counts.types={counts['types']} != qgroups={len(qgroups)}")

    pdf = src / "dist_hyunhak_clean" / f"{univ}_2027면접가이드북.pdf"
    types = []
    samples = []
    for i, g in enumerate(qgroups):
        name = g.get("type")
        items = g.get("items")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"{univ}: qgroups[{i}].type 누락")
        if not isinstance(items, list) or not items:
            raise ValueError(f"{univ}: qgroups[{i}].items 비어 있음")
        q = items[0].get("q") if isinstance(items[0], dict) else None
        if not isinstance(q, str) or not q.strip():
            raise ValueError(f"{univ}: qgroups[{i}].items[0].q 누락")
        public_type = clean(name)
        # 원류의 일부 임시 유형명 끝에 붙은 문항 개수는 화면용 유형명이 아니다.
        public_type = re.sub(r"\s+[—–]\s+.*\d+\s*(?:문|건|개|종|세트).*$", "", public_type).strip()
        types.append(public_type)
        if len(samples) < SAMPLE_MAX:
            q = clean(q)
            if len(q) > SAMPLE_LEN:
                q = q[:SAMPLE_LEN].rstrip() + "…"
            samples.append({"type": public_type, "q": q})
    return {
        "name": univ,
        "file": pdf.name,
        "pages": pdf_pages(pdf),
        "questions": counts["questions"],
        "types_n": counts["types"],
        "types": types,
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
# 상품 면 = v3 템플릿 (2026-08-26 현학적 연구소 편집본). 셸(헤더, 푸터, 모바일 바)은 자리표시를
# apply_nav/apply_footer 가 채우고, seo 블록과 aeo 단락은 seo_inject 가 manifest 로 넣는다.
# 소구 수치·구조·미리보기 목록 = _tools/guidebook_meta_v3.json (build_previews.py 가 박제).
PAGE_TPL = Path(__file__).with_name("guidebook_page_v3.html")
META_V3 = Path(__file__).with_name("guidebook_meta_v3.json")


def load_meta():
    if not META_V3.exists():
        sys.exit("guidebook_meta_v3.json 없음: 먼저 _tools/build_previews.py")
    return json.load(open(META_V3, encoding="utf-8"))


def fill(tpl, m):
    for k, v in m.items():
        tpl = tpl.replace(k, v)
    left = tpl.replace("__proto__", "")
    if "__" in left:
        raise RuntimeError("템플릿 placeholder 잔존: " + left[left.find("__"):left.find("__") + 30])
    return tpl


def price_of(cat, e):
    return e["price"] if e.get("price") is not None else cat["price"]


# 개별 PDF 소장판 가격 = 원격 D1 실측 snapshot (2026-08-30 건우 결재: 상세면에 소장판 담기 버튼 신설 —
# JSON-LD 가 선언한 -pdf offer 의 실구매 동선. snapshot 에 active 로 없으면 버튼을 만들지 않는다)
def _pdf_prices():
    try:
        data = json.loads(Path(__file__).with_name("products_status.json").read_text(encoding="utf-8"))
        return {r["sku"]: int(r["price"]) for r in data["products"]
                if r["sku"].endswith("-pdf") and r.get("status") == "active" and r.get("price") is not None}
    except (OSError, ValueError, KeyError, TypeError):
        return {}


PDF_PRICES = _pdf_prices()


def _part_of(page, dividers):
    """면 번호가 속한 부 (1~5). 간지 면 자신도 그 부에 속한다."""
    part = 0
    for i, d in enumerate(dividers, 1):
        if page >= d:
            part = i
    return part


def _previews_html(mv):
    out = []
    labels = {"cover": "표지", "toc": "차례와 쓰는 법"}
    for i, pv in enumerate(mv["previews"]):
        kind = pv["kind"]
        part = _part_of(pv["page"], mv["dividers"])
        if kind in labels:
            label = labels[kind]
        elif kind == "part":
            label = f"{part}부 들어가는 면"
        else:
            label = f"{part}부 본문, 흐림"
        lock = '<span class="lk">구매 후 선명</span>' if kind == "body" else ""
        lazy = ' loading="lazy"' if i > 1 else ""
        alt = f"{clean(mv['name'])} 가이드북 {pv['page']}면 {label}"
        out.append(
            f'      <figure class="pv"><a href="../{pv["file"]}" target="_blank" rel="noopener" aria-label="{esc(label)} 크게 보기">'
            f'<img src="../{pv["file"]}" alt="{esc(alt)}" width="{pv["w"]}" height="{pv["h"]}"{lazy}></a>{lock}'
            f'<figcaption><span>{esc(label)}</span><span>p.{pv["page"]}</span></figcaption></figure>')
    return "\n".join(out)


def _parts_html(mv):
    out = []
    # meta_v3.toc_subs에는 질문·규칙 카운트가 섞여 있으므로 화면 문구로 쓰지 않는다.
    # 부 제목의 의미만 남긴 고정 설명을 사용하고, 원천 수치는 내부 메타에 보존한다.
    subs = {
        1: "서류기반｜제시문｜MMI, 전형별 형태 판정",
        2: "전형별 제원｜이 대학이 찾는 학생",
        3: "선배 후기에서 회수한 실제 질문, 유형별, 모집단위와 연도",
        4: "생기부에서 질문 뽑는 전환 규칙",
        5: "타 대학 대비 차이｜준비 전략",
    }
    for i, pt in enumerate(mv["parts"]):
        sub = subs.get(int(pt["no"]), "")
        out.append(
            f'      <div class="p5"><span class="no">{pt["no"]}</span><div><h3>{esc(clean(pt["title"]))}</h3>'
            f'<p class="d">{esc(sub)}</p></div></div>')
    return "\n".join(out)


def _forms_html(mv):
    out = []
    for f in mv.get("forms", []):
        if "확인 필요" in f["form"]:
            continue
        on = f["has"]
        out.append(f'      <div class="f {"on" if on else "off"}"><b>{esc(clean(f["form"]))}</b>'
                   f'<span>{"이 대학에 있음" if on else "이 대학에 없음"}</span></div>')
    return "\n".join(out)


def _tracks_html(mv):
    out = []
    for t in mv.get("tracks", [])[:6]:
        out.append(f'      <li><span class="t">{esc(clean(t["track"]))}</span><span class="f">{esc(clean(t["form"]))}</span></li>')
    return "\n".join(out)


def _chips(items, limit):
    return "\n".join(f'      <span>{esc(clean(x))}</span>' for x in items[:limit])


def _rules3_html(mv):
    out = []
    for r in mv.get("rule_list", [])[:3]:
        out.append(f'      <div class="r"><span class="cd">{esc(r["code"])}</span><span class="ar">{esc(clean(r["area"]))}</span>'
                   f'<p><b>언제</b> {esc(clean(r["when"]))}</p></div>')
    return "\n".join(out)


def _strat_sec_html(mv):
    strat = mv.get("strategies", [])
    if not strat:
        return ""
    out = []
    for i, stt in enumerate(strat[:8], 1):
        m = re.match(r"(S\d+)\.\s*(.*)", stt)
        no, txt = (m.group(1), m.group(2)) if m else (f"{i:02d}", stt)
        out.append(f'      <li><span class="sn">{esc(no)}</span><span>{esc(clean(txt))}</span></li>')
    more = len(strat) - len(strat[:8])
    tail = '\n    <p class="rlock">전략의 제목 일부입니다. 본문과 근거는 책에서.</p>' if more > 0 else ""
    return ('  <section class="sec">\n'
            '    <div class="sh rv"><div><h2>5부 준비 전략</h2><p>이 대학만의 차이에서 나온 전략. 제목만 싣습니다.</p></div></div>\n'
            '    <ol class="strat rv">\n' + "\n".join(out) + '\n    </ol>' + tail + '\n  </section>')


def render_page(cat, items, i, meta):
    e = items[i]
    mv = meta[e["slug"]]
    name = e["name"]
    price = price_of(cat, e)
    sale = bool(e.get("onsale", True))
    h1 = f"{name} 2027 면접 가이드북"
    title = f"{h1}, 현학적 연구소"
    years = f'{mv["years"][0]}~{mv["years"][1]}' if mv.get("years") else "복수 연도"
    lede = (f"{name} 면접에서 실제로 나온 질문과, 내 생기부에서 질문을 뽑는 전환 규칙. "
            f"선배 후기 {years} 관측과 2027 공식 요강으로 재구성한 현학적 연구소 편집본.")
    if sale:
        pdfp = PDF_PRICES.get(e["sku"] + "-pdf")
        pdf_btn = (f'<button type="button" class="btn ghost" data-cart-sku="{esc(e["sku"])}-pdf" data-cart-title="{esc(h1)} PDF 소장판" data-cart-price="{pdfp}">PDF 소장판 담기, {won(pdfp)}</button>\n      '
                   if pdfp else "")
        acts = (f'<button type="button" class="btn" data-cart-sku="{esc(e["sku"])}" data-cart-title="{esc(h1)}" data-cart-price="{price}">담기 <span class="ar" aria-hidden="true">→</span></button>\n'
                f'      {pdf_btn}<a class="btn ghost" href="../cart.html">장바구니 보기</a>')
        badge = '<span class="badge seal">판매 중</span>'
        note = ("결제 후 마이페이지에서 브라우저 보안 리더로 바로 열림. 열람 기간은 구매일부터 3개월. 열람 시작 전 취소 가능."
                + (" PDF 소장판은 워터마크 파일을 발급해 소장." if pdfp else ""))
        final_h2, final_p = "이 학교부터 담기", f"{name} 2027 면접 가이드북, {won(price)}. 보안 리더 열람 3개월."
        final_acts = (f'<button type="button" class="btn" data-cart-sku="{esc(e["sku"])}" data-cart-title="{esc(h1)}" data-cart-price="{price}">담기 <span class="ar" aria-hidden="true">→</span></button>'
                      + (f'<button type="button" class="btn ghost" data-cart-sku="{esc(e["sku"])}-pdf" data-cart-title="{esc(h1)} PDF 소장판" data-cart-price="{pdfp}">PDF 소장판 담기</button>' if pdfp else "")
                      + f'<a class="btn ghost" href="index.html">다른 대학 보기</a>')
    else:
        acts = ('<span class="btn" aria-disabled="true">입고 예정</span>\n'
                '      <a class="btn ghost" href="index.html">판매 중인 가이드북</a>')
        badge = '<span class="badge mute">준비 중</span>'
        note = "보안 리더 준비 중. 준비되는 대로 이 면에서 판매하고 공지에 기록."
        final_h2, final_p = "준비 중인 동안", "판매 중인 다른 대학 가이드북 먼저. 판매 개시는 공지로."
        final_acts = ('<a class="btn" href="index.html">판매 중인 가이드북 <span class="ar" aria-hidden="true">→</span></a>'
                      '<a class="btn ghost" href="../notice.html">공지 보기</a>')
    # 유형명 역시 export/site 계약을 사용한다. 카운트·관측 주석은 원류 단계에서 제외한다.
    type_chips = "\n".join(f'      <span>{esc(clean(label))}</span>' for label in e["types"])
    samples = "\n".join(f'      <li><span class="ty">{esc(clean(s["type"]))}</span><p class="q">{esc(clean(s["q"]))}</p></li>'
                         for s in e["samples"])
    prev_e = items[i - 1] if i > 0 else None
    next_e = items[i + 1] if i + 1 < len(items) else None
    m = {"__TITLE__": esc(title), "__NAME__": esc(name), "__H1__": esc(h1), "__LEDE__": esc(lede), "__SLUG__": e["slug"],
         "__SKU__": esc(e["sku"]), "__VOL__": str(mv.get("vol") or ""), "__YEARS__": years,
         "__PRICE_RAW__": str(price), "__PRICE__": f"{price:,}",
         "__TRACKS_N__": str(len(mv.get("spec_tracks", [])) or len(mv.get("tracks", []))),
         "__SPEC_N__": str(len(mv.get("spec_items", []))),
         "__STATUS_BADGE__": badge, "__ACTS__": acts, "__NOTE__": note,
         "__PREVIEWS__": _previews_html(mv), "__PARTS__": _parts_html(mv), "__FORMS__": _forms_html(mv),
         "__TRACKS__": _tracks_html(mv), "__SPEC_CHIPS__": _chips(mv.get("spec_items", []), 12),
         "__RULES3__": _rules3_html(mv), "__RULE_CHIPS__": _chips(mv.get("rule_areas", []), 14),
         "__STRAT_SEC__": _strat_sec_html(mv),
         "__TYPE_CHIPS__": type_chips,
         "__PRICE_CLS__": "price" if sale else "price mute",
         "__SAMPLES__": samples,
         "__PREV__": (f'<a class="tlink" href="{prev_e["slug"]}.html">이전, {esc(prev_e["name"])}</a>' if prev_e else ""),
         "__NEXT__": (f'<a class="tlink" href="{next_e["slug"]}.html">다음, {esc(next_e["name"])}</a>' if next_e else ""),
         "__FINAL_H2__": final_h2, "__FINAL_P__": esc(final_p), "__FINAL_ACTS__": final_acts}
    return fill(PAGE_TPL.read_text(encoding="utf-8"), m)


INDEX_TPL = Path(__file__).with_name("guidebook_index_v2.html")


def render_index(cat, items, meta):
    """목록 = 플랫폼 v2 템플릿. meta v3 수치는 내부 데이터로만 유지한다."""
    n = len(items)
    sale = sum(1 for e in items if e.get("onsale", True))
    price = int(cat["price"])
    gb = [{"slug": e["slug"], "sku": e.get("sku") or f"guide-{e['slug']}", "name": e["name"],
           "short": e["name"].replace("학교", "").replace("(서울)", ""),
           "pages": meta[e["slug"]]["pages"], "q": meta[e["slug"]]["questions"], "r": meta[e["slug"]]["rules"],
           "sale": bool(e.get("onsale", True))} for e in items]
    h1 = "학교별 2027 면접 가이드북"
    fillmap = {"__TITLE__": esc(f"{h1} {n}권, 현학적 연구소"), "__N__": str(n), "__SALE__": str(sale), "__READY__": str(n - sale),
               "__PRICE_RAW__": str(price), "__PRICE__": f"{price:,}",
               "__HH_GB__": json.dumps(gb, ensure_ascii=False, separators=(",", ":"))}
    t = INDEX_TPL.read_text(encoding="utf-8")
    for k, v in fillmap.items():
        t = t.replace(k, v)
    if "__" in t.replace("__proto__", ""):
        raise RuntimeError("템플릿 placeholder 잔존 (index)")
    return t


def build_to(out_dir):
    cat = json.load(open(CATALOG, encoding="utf-8"))
    meta = load_meta()
    missing = [s for s, _ in SLUGS if s not in meta]
    if missing:
        sys.exit(f"meta v3 누락 {len(missing)}권: {missing[:5]}")
    items = sorted(cat["items"], key=lambda e: e["name"])
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    p = out_dir / "index.html"
    p.write_text(render_index(cat, items, meta), encoding="utf-8")
    written.append(p)
    for i in range(len(items)):
        p = out_dir / f"{items[i]['slug']}.html"
        p.write_text(render_page(cat, items, i, meta), encoding="utf-8")
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
        html_noscript = re.sub(r"<script.*?</script>", "", html, flags=re.S)
        for m in re.finditer(r'(?:href|src)="([^"]+)"', html_noscript):
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
