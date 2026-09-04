#!/usr/bin/env python3
"""interview.html = 대학별 면접 형태 판정표 (2026-09-04 신설, 건우 "면접 키워드 전량 포획").

원장은 build_guidebook.SEARCH 표 하나다 (전형명은 ground_check 로 meta v3 에 실재 확인된 값). 카탈로그(이름, 판매 여부)와
meta v3(기출 수) 를 곁들여 38개 대학 전형별 행과 FAQ 를 만들고, seo_manifest.json 의 interview.html 항목을 같은 값으로 박제한다.
비판매 7교(경북대, 성균관대, DGIST, 부경대, 홍익대 + 연세대, 고려대)는 가이드북 면이 없어 이 표가 유일한 착지다.
사용: python3 _tools/build_interview_hub.py            (build_all.sh 1c)
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guidebook as B   # noqa: E402
import seo_common as C         # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TPL = Path(__file__).with_name("interview_hub_v1.html")
OUT = ROOT / "interview.html"
REL = "interview.html"


def esc(s):
    return B.esc(s)


def _eun(w):
    return B._eun(w)


def kind_of(form):
    """형태 문자열 -> 배지 종류. 혼합, MMI 가 들어 있으면 mix, 제시문이면 pas, 그 외 서류기반이면 doc."""
    if "혼합" in form or "MMI" in form or ("제시문" in form and "서류기반" in form):
        return "mix"
    if "제시문" in form:
        return "pas"
    if "서류기반" in form:
        return "doc"
    return "etc"   # 인적성 면접 등. 혼합으로 뭉뚱그리지 않는다


BADGE = {"doc": "서류기반", "pas": "제시문", "mix": "혼합, MMI", "etc": "인적성"}


def load():
    cat = json.load(open(B.CATALOG, encoding="utf-8"))
    meta = B.load_meta()
    B.ground_check(meta)
    items = {e["slug"]: e for e in cat["items"]}
    missing = [s for s in B.SEARCH if s not in items]
    if missing:
        sys.exit(f"카탈로그에 없는 SEARCH 대학: {missing}")
    return cat, meta, items


def tracks_of(slug):
    s = B.SEARCH[slug]
    out = [(x["n"], x["f"]) for x in s["rep"]]
    out += [(s[k]["n"], s[k]["f"]) for k in ("med", "edu", "alt") if k in s]
    return out


def prep_link(e):
    slug, sale = e["slug"], bool(e.get("onsale", True))
    U = B.SEARCH[slug]["u"]
    if slug in B.STUDIO:
        return f'<a class="tlink" href="programs/{slug}.html">{esc(U)} 제시문 면접 스튜디오</a>', "studio"
    if sale:
        return f'<a class="tlink" href="guidebook/{slug}.html">{esc(U)} 면접 가이드북 2027</a>', "sale"
    return '<span class="note">2027 판 준비 중</span>', "planned"


def sort_key(e):
    n = e["name"]
    return (n[0].isascii(), n)


def rows_html(items):
    out = []
    for e in sorted(items.values(), key=sort_key):
        slug = e["slug"]
        U, full = B.SEARCH[slug]["u"], B.full_name(e)
        link, _ = prep_link(e)
        tr = tracks_of(slug)
        alias = B.ALIAS.get(slug)
        search_u = " ".join(x for x in (full, U, alias, e["name"]) if x)
        for i, (n, f) in enumerate(tracks_of(slug)):
            k = kind_of(f)
            cls = ' class="first"' if i == 0 else ""
            ucell = (f'<td class="u" rowspan="{len(tr)}">{esc(full)}<small>{esc(U)}{"(" + esc(alias) + ")" if alias else ""}</small></td>' if i == 0 else "")
            rcell = (f'<td class="r" rowspan="{len(tr)}">{link}</td>' if i == 0 else "")
            out.append(f'          <tr{cls} data-slug="{slug}" data-u="{esc(search_u)}">{ucell}<td>{esc(n)}</td>'
                       f'<td class="f"><span class="badge {k}">{BADGE[k]}</span> {esc(f)}</td>{rcell}</tr>')
    return "\n".join(out)


def univ_faq(items):
    out = []
    for e in sorted(items.values(), key=sort_key):
        slug = e["slug"]
        U, full = B.SEARCH[slug]["u"], B.full_name(e)
        alias = B.ALIAS.get(slug)
        tr = tracks_of(slug)
        head = f"{U}({alias})" if alias else U
        body = " ".join(f"{n}{_eun(n)} {f}" + ("입니다." if i == 0 else ".") for i, (n, f) in enumerate(tr))
        _, kind = prep_link(e)
        if kind == "studio":
            tail = f" 준비는 {U} 제시문 면접 스튜디오에서 기출 지문으로 모의면접을 봅니다."
        elif kind == "sale":
            tail = f" 준비는 {U} 면접 가이드북 2027의 기출과 생기부 예상 질문 규칙으로 합니다."
        else:
            tail = f" {U} 2027 면접 가이드북은 준비 중이며 판매 개시는 공지로 알립니다."
        q = f"{full} 면접은 어떤 형태인가요?"
        a = f"{head} {body}{tail}"
        out.append((q, a))
    return out


def generic_faq(n_doc, n_pas, q_total, n_sale):
    return [
        ("서류기반 면접과 생기부 면접은 같은 말인가요?",
         f"같습니다. 내 생활기록부가 문제지인 면접이라 생기부 면접, 학종 면접, 인성 면접으로도 부릅니다. 표의 {n_doc}개 대학이 이 형태입니다. 준비는 대학별 면접 가이드북 2027의 기출과 생기부 예상 질문 규칙으로 합니다."),
        ("제시문 면접은 무엇이 다른가요?",
         "면접장에서 받은 글과 발문을 정해진 시간 안에 읽고 답하는 면접입니다. 연세대 활동우수형과 고려대 계열적합전형이 대표적입니다. 제시문 면접 스튜디오에서 실전 규격으로 모의면접을 보고 첨삭 세 단을 받습니다."),
        ("면접 기출문제는 어디서 보나요?",
         f"판매 중인 {n_sale}개 대학 가이드북 3부에 선배 후기에서 회수한 면접 기출문제 {q_total:,}문이 유형별로 실려 있습니다. 연세대와 고려대 2026 면접 기출은 체험판에서 48시간 무료로 봅니다."),
        ("면접 예상문제는 어떻게 만드나요?",
         "가이드북 4부의 전환 규칙이 내 생기부 기재를 면접 예상 질문으로 바꿉니다. 규칙마다 기재 조건과 실제 기출, 꼬리질문이 붙어 그대로 내 질문지가 됩니다."),
        ("대입 면접컨설팅이나 대입 모의면접도 하나요?",
         "별도 1:1 면접컨설팅 상품은 없습니다. 서류기반 면접은 입시 컨설턴트 13년차가 편집한 가이드북으로, 제시문 면접은 스튜디오에서 촬영 응시와 첨삭 세 단의 모의면접으로 준비합니다."),
        ("MMI 면접도 있나요?",
         "서울대 일반전형 의대 등 일부 전형은 MMI 이고 의약학 계열에는 서류기반과 제시문을 섞는 혼합형이 있습니다. 표에서 전형별 형태를 확인합니다. 해당 대학 가이드북 1부 판정표가 지원 전형의 형태를 가릅니다."),
    ]


def faq_html(faq):
    return "\n".join(f'      <details class="faq"><summary>{esc(q)}</summary><div class="a"><p>{esc(a)}</p></div></details>' for q, a in faq)


def build():
    cat, meta, items = load()
    n = len(items)
    n_tracks = sum(len(tracks_of(s)) for s in items)
    kinds = {s: {kind_of(f) for _, f in tracks_of(s)} for s in items}
    n_doc = sum(1 for s in items if "doc" in kinds[s])
    n_pas = sum(1 for s in items if "pas" in kinds[s] and "doc" not in kinds[s])
    n_mix = sum(1 for s in items if "mix" in kinds[s] or "etc" in kinds[s])
    sale = [e for e in items.values() if e.get("onsale", True) and e["slug"] not in B.STUDIO]
    n_sale = len(sale)
    q_total = sum(meta[e["slug"]]["questions"] for e in sale)
    lede = "<br>".join(esc(x) for x in (
        f"서류기반 면접(생기부 면접)인지 제시문 면접인지, {n}개 대학의 전형별 면접 형태를 한 표로 판정합니다.",
        "대학이 공개한 2027학년도 요강과 선배 후기 관측을 같은 기준으로 다시 읽은 현학적 연구소 편집본."))
    gen = generic_faq(n_doc, n_pas, q_total, n_sale)
    uni = univ_faq(items)
    for q, a in gen + uni:
        if any(ch in q + a for ch in ("·", "—")) or "십시오" in a:
            sys.exit(f"FAQ 금지 문자: {q} / {a}")
    m = {"__TITLE__": esc(seo_entry(n, n_doc, n_sale)["title"]), "__LEDE__": lede,
         "__N__": str(n), "__T__": str(n_tracks), "__N_DOC__": str(n_doc), "__N_PAS__": str(n_pas), "__N_MIX__": str(n_mix),
         "__N_SALE__": str(n_sale), "__ROWS__": rows_html(items),
         "__FAQ_GENERIC__": faq_html(gen), "__FAQ_UNIV__": faq_html(uni)}
    html = B.fill(TPL.read_text(encoding="utf-8"), m)
    left = re.findall(r"__[A-Z_]+__", html)
    if left:
        sys.exit(f"자리표시 잔존: {sorted(set(left))}")
    return html, n, n_doc, n_sale, items


def seo_entry(n, n_doc, n_sale):
    price = B.won(int(json.load(open(B.CATALOG, encoding="utf-8"))["price"]))
    title = f"대학별 면접 형태 판정표 2027, {n}개 대학 서류기반 면접과 제시문 면접, 전형별 판정과 준비 자료"
    desc = (f"{n}개 대학의 전형별 면접 형태를 한 표로 판정합니다. 서류기반 면접(생기부 면접), 제시문 면접, MMI 와 혼합형을 가르고 "
            f"대학마다 면접 가이드북과 스튜디오로 잇습니다. 현학적 연구소 편집.")
    answer = (f"대학 면접은 서류기반 면접(생기부 면접), 제시문 면접, MMI 로 갈립니다. {n}개 대학 중 {n_doc}곳이 서류기반, "
              f"연세대와 고려대는 제시문 면접이며 표에서 전형별로 확인합니다.")
    for label, v, lo, hi in (("description", desc, 70, 110), ("answer", answer, 40, 110)):
        if not lo <= len(v) <= hi:
            sys.exit(f"interview {label} {len(v)}자 (범위 {lo}~{hi}): {v}")
    kws = ["대학 면접 형태", "서류기반 면접", "생기부 면접", "제시문 면접", "MMI 면접", "학종 면접", "대입 면접 준비",
           "대입 면접컨설팅", "대입 모의면접", "모의면접", "면접컨설팅", "면접 기출문제", "면접 예상문제", "면접 예상 질문", "대학별 면접 가이드북 2027"]
    for slug in B.SEARCH:
        U = B.SEARCH[slug]["u"]
        kws.append(f"{U} 면접")
        if slug in B.ALIAS:
            kws.append(f"{B.ALIAS[slug]} 면접")
    return {"title": title, "description": desc, "answer": answer, "keywords": kws}


def write_manifest(n, n_doc, n_sale, items):
    m = C.load_manifest()
    e = seo_entry(n, n_doc, n_sale)
    listed = [f"guidebook/{x['slug']}.html" for x in sorted(items.values(), key=sort_key)
              if x.get("onsale", True) and x["slug"] not in B.STUDIO] + ["programs/yonsei.html", "programs/korea.html"]
    ent = m["pages"].setdefault(REL, {})
    ent.update({"title": e["title"], "description": e["description"], "answer": e["answer"], "keywords": e["keywords"],
                "type": "hub", "priority": 0.9, "changefreq": "weekly", "noindex": False,
                "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "면접 형태 판정표", "path": "/interview.html"}],
                "schema": {"items": listed, "list_name": "대학별 면접 준비 자료"},
                "speakable": [".aeo-answer", ".facts"], "date_modified": B.CONTENT_DATE})
    C.save_manifest(m)


def main():
    html, n, n_doc, n_sale, items = build()
    before = OUT.read_text(encoding="utf-8") if OUT.exists() else None
    # 후공정(nav, footer, seo, analytics)이 실린 기존 산출은 템플릿 원본과 달라 매번 다시 쓴다. 멱등성은 build_all.sh 2회 해시로 잰다
    OUT.write_text(html, encoding="utf-8")
    write_manifest(n, n_doc, n_sale, items)
    print(f"interview.html: {n}개 대학, 서류기반 {n_doc}, 판매 {n_sale}권 -> {'변경' if before != html else '동일'}")


if __name__ == "__main__":
    main()
