#!/usr/bin/env python3
"""대학별 면접 정보 면 30면 생성기 (2026-11-16, 건우 결재 SEO2-1 ②, SEO2-11 ②, SEO2-12 ②).

입력은 저장소 안 묶음 _tools/fixtures/interview_info_2027.json 하나다(만드는 쪽 = compile_interview_info.py).
산출 = interview/<slug>.html 30면(판매 30곳) + seo_manifest.json 30항목 + _tools/interview_info_dates.json(본문 해시 기준 수정일).
셸, SEO 머리, aeo 단락, FAQ JSON-LD 는 build_all.sh 후공정이 붙인다. 이 파일은 마크업과 manifest 값만 낸다.
요일: 묶음의 요강 표기 요일이 달력 요일과 다르면 어떤 면도 쓰지 않고 멈춘다.
사용: python3 _tools/build_interview_info.py   (build_all.sh 1f)
"""
import hashlib
import html
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import seo_common as C   # noqa: E402

BUNDLE = HERE / "fixtures" / "interview_info_2027.json"
TPL = HERE / "interview_info_v1.html"
DATES = HERE / "interview_info_dates.json"
TODAY = os.environ.get("HH_TODAY") or date.today().isoformat()
WD = "월화수목금토일"
GROUP = "interview_info"
NULL = "요강에 따로 적혀 있지 않습니다"
TAIL = " | 현학적 연구소"
BASIS_KO = {"record_based": "서류기반 면접", "prompt_based": "제시문 면접", "mixed": "서류기반과 제시문 혼합 면접",
            "practical_only": "실기 중심", "unknown": "면접 형태 요강 미기재"}
BANNED = ("·", "—", "–", "∙", "‧", "・", "•", "→")

E = lambda s: html.escape(str(s), quote=True)


def load_bundle(path=BUNDLE):
    if not Path(path).is_file():
        sys.exit(f"build_interview_info: 묶음 없음 {path} (먼저 python3 _tools/compile_interview_info.py)")
    return json.loads(Path(path).read_text(encoding="utf-8"))


def short(slug, b):
    return next(u["short"] for u in b["univs"] if u["slug"] == slug)


# ---------------------------------------------------------------- 날짜
def _ymd(iso):
    d = date.fromisoformat(iso)
    return d.year, d.month, d.day, WD[d.weekday()]


def _check(iso, wd, where):
    w = _ymd(iso)[3]
    if w != wd:
        sys.exit(f"build_interview_info: 요일 불일치 {where} {iso} 요강 표기 {wd} / 달력 {w}. 사실 파일을 다시 확인한다")


def fmt_day(iso, wd, where="", year=True):
    _check(iso, wd, where)
    y, m, d, w = _ymd(iso)
    return (f"{y}년 " if year else "") + f"{m}월 {d}일({w})"


def fmt_item(x, where="", year=True):
    s = fmt_day(x["iso"], x["wd"], where, year)
    if x.get("iso_end"):
        s += "~" + fmt_day(x["iso_end"], x["wd_end"], where, year=False)
    return s


def _eun(word):
    for ch in reversed(str(word)):
        o = ord(ch)
        if 0xAC00 <= o <= 0xD7A3:
            return "은" if (o - 0xAC00) % 28 else "는"
        if ch.isdigit():
            return "은" if ch in "013678" else "는"
        if ch.isalpha():
            return "는"
    return "는"


def _iga(word):
    return "이" if _eun(word) == "은" else "가"


def day_runs(t, where):
    """전형의 면접일을 이어진 날끼리 묶은 [(시작 iso, 시작 요일, 끝 iso, 끝 요일)]. 줄마다의 기간을 날짜 집합으로 펴서 빈 날에서 끊는다.
    묶음의 양 끝은 늘 어떤 줄의 시작일이나 끝일이라 요강 표기 요일이 있다."""
    wd, days = {}, set()
    for x in t["interviews"]:
        fmt_item(x, where)   # 모든 날짜의 요일 검사
        a = date.fromisoformat(x["iso"])
        b = date.fromisoformat(x.get("iso_end") or x["iso"])
        wd[x["iso"]] = x["wd"]
        if x.get("iso_end"):
            wd[x["iso_end"]] = x["wd_end"]
        days |= {date.fromordinal(o) for o in range(a.toordinal(), b.toordinal() + 1)}
    runs, cur = [], []
    for d in sorted(days):
        if cur and d.toordinal() != cur[-1].toordinal() + 1:
            runs.append(cur); cur = []
        cur.append(d)
    runs.append(cur)
    return [(r[0].isoformat(), wd[r[0].isoformat()], r[-1].isoformat(), wd[r[-1].isoformat()]) for r in runs]


def track_span(t, where, year=True):
    """(전형의 면접일 글, 꼴). 꼴 = 'one' 한 줄, 'range' 모집단위별 줄이 이어진 기간 하나, 'runs' 빈 날을 사이에 둔 날짜 묶음 여럿.
    'runs' 는 처음과 끝을 ~ 로 잇지 않고 묶음을 쉼표로 늘어놓는다(가톨릭대 10월 30일, 12월 5일. 연도는 첫 묶음에만)."""
    iv = t["interviews"]
    runs = day_runs(t, where)
    if len(iv) == 1 and len(runs) == 1:
        return fmt_item(iv[0], where, year), "one"
    out = []
    for i, (a, aw, b, bw) in enumerate(runs):
        s = fmt_day(a, aw, where, year and i == 0)
        if b != a:
            s += "~" + fmt_day(b, bw, where, year=False)
        out.append(s)
    return ", ".join(out), ("range" if len(runs) == 1 else "runs")


def minutes_ko(t):
    if t.get("time_text"):   # 줄 단위 보정(요강 쪽과 인용이 붙은 값, 부산대 의예과)
        return t["time_text"]
    p, m = t.get("prep"), t.get("minutes")
    if m is None:
        return f"면접 {t['minutes_text']}" if t.get("minutes_text") else None
    if p == 0:
        return f"준비시간 없이 면접 {m}분"
    return f"준비 {p}분, 면접 {m}분" if p else f"면접 {m}분"


def time_sentence(t):
    if t.get("time_text"):
        return f"면접 시간은 {t['time_text']}입니다."
    p, m = t.get("prep"), t.get("minutes")
    if m is None:
        if t.get("minutes_text"):
            return f"면접 시간은 {t['minutes_text']}입니다."
        if t.get("minutes_varies"):
            return "면접 시간은 모집단위마다 다릅니다."
        return f"면접 시간은 {NULL}."
    if p == 0:
        return f"준비 시간 없이 면접 시간 {m}분입니다."
    return f"준비 시간 {p}분, 면접 시간 {m}분입니다." if p else f"면접 시간은 {m}분입니다."


def interview_pct(t):
    m = re.search(r"면접 (\d+)%", t["ratio"])
    return m.group(1) if m else None


# ---------------------------------------------------------------- 지면 조각
def _ann_cell(lst, where, none=None):
    if none:   # 요강이 일괄합산이라고 적은 전형(1단계 선발 없음)
        return E(none["text"])
    if not lst:
        return E(NULL)
    if len(lst) == 1 and not lst[0]["label"]:
        return E(fmt_item(lst[0], where))
    return "<br>".join(E(f"{x['label']} {fmt_item(x, where)}" if x["label"] else fmt_item(x, where)) for x in lst)


def rows_html(u):
    out = []
    for t in u["tracks"]:
        where = f"{u['slug']} {t['name']}"
        iv = t["interviews"]
        n = len(iv)
        rs = f' rowspan="{n}"' if n > 1 else ""
        if t.get("quota_parts"):   # 한 줄이 두 전형을 묶은 경우(부산대 의예과) 전형별 인원을 줄을 나눠 적는다
            quota_html = "<br>".join(E(f"{x['label']} {x['value']:,}명") for x in t["quota_parts"])
            qcls = ""
        else:
            quota_html = E(f"{t['quota']:,}명" if t["quota"] is not None else NULL)
            qcls = ' class="num"' if t["quota"] is not None else ""
        for i, x in enumerate(iv):
            date_s = E(fmt_item(x, where))
            label = f'<br><small>{E(x["label"])}</small>' if x.get("label") else ""
            cell = f'<td data-c="interview">{date_s}{label}</td>'
            if i == 0:
                out.append(f'     <tr><td data-c="track"{rs}><b>{E(t["name"])}</b></td><td data-c="stage1"{rs}>{_ann_cell(t["stage1"], where, t.get("stage1_none"))}</td>'
                           f'{cell}<td data-c="final"{rs}>{_ann_cell(t["final"], where)}</td><td data-c="quota"{qcls}{rs}>{quota_html}</td></tr>')
            else:
                out.append(f"     <tr>{cell}</tr>")
    return "\n".join(out)


def format_html(u):
    groups, order = {}, []
    for t in u["tracks"]:
        k = (t["basis"], t["minutes"], t.get("minutes_text"), t.get("time_text"), t["prep"], t["ratio"], t["quote"], t["page"])
        if k not in groups:
            groups[k] = []
            order.append(k)
        groups[k].append(t["name"])
    out = []
    for k in order:
        basis, _, _, _, _, ratio, quote, page = k
        t = next(x for x in u["tracks"] if x["name"] == groups[k][0])
        rows = [("면접 형태", BASIS_KO.get(basis, BASIS_KO["unknown"]))]
        mk = minutes_ko(t)
        if mk:
            rows.append(("면접 시간", mk))
        rows.append(("선발 방식", ratio))
        if quote:
            rows.append(("요강 문구", f"「{quote}」"))
        rows.append(("근거", f"요강 PDF {page}쪽"))
        dl = "".join(f'<div class="r"><dt>{E(a)}</dt><dd>{E(b)}</dd></div>' for a, b in rows)
        out.append(f'  <h3>{E(", ".join(groups[k]))}</h3>\n  <dl class="xspec">{dl}</dl>')
    return "\n".join(out)


def faq_pairs(u):
    S = u["short"]
    tr = u["tracks"]
    t0 = tr[0]
    qa = []
    # 모든 전형의 면접일을 적는다(FAQPage 만 읽는 쪽에는 지면의 표가 없다). 같은 날짜 글의 전형은 한 문장으로 묶는다
    groups, order = {}, []
    for t in tr:
        span, kind = track_span(t, f"{u['slug']} {t['name']}")
        if kind == "runs":
            tail = f" 모집단위별로 {span}에 면접을 봅니다."
        elif kind == "range" and "~" in span:
            tail = f" {span} 사이에 모집단위별로 면접을 봅니다."
        else:
            tail = f" {span}에 면접을 봅니다."
        if tail not in groups:
            groups[tail] = []
            order.append(tail)
        groups[tail].append(t["name"])
    when = [", ".join(groups[k]) + _eun(groups[k][-1]) + k for k in order]
    qa.append((f"{S} 면접은 언제인가요?", " ".join(when)))
    b0 = BASIS_KO.get(t0["basis"], BASIS_KO["unknown"])
    mk = minutes_ko(t0)
    a = f"{t0['name']}{_eun(t0['name'])} {b0}입니다. " + time_sentence(t0)
    other = next((t for t in tr[1:] if t["basis"] != t0["basis"]), None)
    if other:
        a += f" {other['name']}{_eun(other['name'])} {BASIS_KO.get(other['basis'], BASIS_KO['unknown'])}입니다."
    qa.append((f"{S} 면접은 어떤 방식인가요?", a))
    qa.append((f"{S} 면접 반영 비율은 얼마인가요?", f"{t0['name']}{_eun(t0['name'])} {t0['ratio']}로 선발합니다."))
    lump = [t for t in tr if t.get("stage1_none")]   # 일괄합산 전형은 표의 1단계 칸과 같은 글을 FAQ 답(FAQPage 원천)에도 적는다
    parts = []
    if t0["stage1"]:
        s1 = ", ".join(f"{x['label']} {fmt_item(x, u['slug'])}" if x["label"] else fmt_item(x, u["slug"]) for x in t0["stage1"])
        fa = ", ".join(f"{x['label']} {fmt_item(x, u['slug'])}" if x["label"] else fmt_item(x, u["slug"]) for x in t0["final"]) or None
        parts.append(f"{t0['name']} 1단계 합격자 발표는 {s1}입니다." + (f" 최초 합격자 발표는 {fa}입니다." if fa else ""))
    for t in lump:
        parts.append(f"{t['name']}{_eun(t['name'])} {t['stage1_none']['text']} 전형이라 1단계 합격자 발표가 없습니다.")
    if parts:
        qa.append((f"{S} 1단계 합격자 발표는 언제인가요?", " ".join(parts)))
    return qa


def _pick_len(cands, lo, hi, what, slug):
    for c in cands:
        if lo <= len(c) <= hi:
            return c
    sys.exit(f"build_interview_info: {slug} {what} 길이 {lo}~{hi} 후보 없음: " + " / ".join(f"{len(c)}자 {c}" for c in cands))


def seo_entry(u):
    S, F, slug = u["short"], u["full"], u["slug"]
    t0 = u["tracks"][0]
    where = f"{slug} {t0['name']}"
    span_y, kind = track_span(t0, where)
    span_n, _ = track_span(t0, where, year=False)
    by = "모집단위별로 " if kind == "runs" else ""   # 빈 날을 사이에 둔 면접일은 한 기간으로 읽히지 않게
    # 1단계 발표가 모집단위로 갈리면(아주대 약학과, 가톨릭대 신학과) 한 날짜로 적지 않는다. 표와 FAQ 는 갈래를 나눠 적는다
    s1 = fmt_item(t0["stage1"][0], where, year=False) if len(t0["stage1"]) == 1 else None
    b0 = BASIS_KO.get(t0["basis"], BASIS_KO["unknown"])
    pct = interview_pct(t0)
    title = f"{S} 면접 일정, 방식, 기출 유형 (2027학년도 수시){TAIL}"
    desc = _pick_len([
        f"{S} 2027학년도 수시 면접 일정입니다. {t0['name']} 면접은 {by}{span_n}" + (f", 1단계 합격자 발표는 {s1}입니다." if s1 else "입니다.")
        + " 면접 방식과 자주 나오는 기출 질문 유형을 함께 정리했습니다.",
        f"{S} 2027학년도 수시 면접 일정입니다. {t0['name']} 면접은 {by}{span_n}" + (f", 1단계 발표는 {s1}입니다." if s1 else "입니다.")
        + " 면접 방식과 기출 질문 유형도 정리했습니다.",
        f"{S} 2027학년도 수시 {t0['name']} 면접은 {by}{span_n}입니다. 면접 방식과 자주 나오는 기출 질문 유형을 함께 정리했습니다.",
        f"{S} {t0['name']} 면접은 {by}{span_n}입니다. 면접 방식과 기출 질문 유형도 정리했습니다.",
    ], 70, 110, "description", slug)
    answer = _pick_len([
        f"{S} {t0['name']} 면접은 {by}{span_y}에 봅니다. {b0}이며 면접 반영 비율은 {pct}%입니다." if pct else "",
        f"{S} {t0['name']} 면접은 {by}{span_y}에 봅니다. {b0}입니다.",
        f"{S} {t0['name']} 면접은 {by}{span_n}에 봅니다.",
    ], 40, 110, "answer", slug)
    kws = [f"{S} 면접 일정", f"{S} 면접 일정 2027", f"{F} 면접 일정", f"{S} 면접 날짜", f"{S} {t0['name']} 면접",
           f"{S} 면접 방식", f"{S} 면접 기출", f"{S} 면접 기출 유형", f"{S} 면접 질문", f"{S} 1단계 발표", f"2027 {S} 수시 면접"]
    return {"title": title, "description": desc, "answer": answer, "keywords": list(dict.fromkeys(kws)),
            "type": "article", "priority": 0.7, "changefreq": "weekly", "noindex": False,
            "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "면접 형태 판정표", "path": "/interview.html"},
                           {"name": f"{S} 면접 일정과 기출 유형", "path": f"/interview/{slug}.html"}],
            "schema": {"about": F, "about_type": "CollegeOrUniversity"},
            "speakable": [".aeo-answer", ".tbl"], "group": GROUP}


def render(u, b):
    """(지면 HTML, manifest 항목). 날짜 요일이 묶음 표기와 다르면 SystemExit."""
    S, F, slug = u["short"], u["full"], u["slug"]
    t0 = u["tracks"][0]
    unit = {"type": False, "unit": True}[u["group_kind"]]
    entry = seo_entry(u)
    faq = faq_pairs(u)
    links = (f'<a class="btn" href="../guidebook/{E(slug)}.html">{E(S)} 면접 가이드북 2027</a>'
             f'<a class="tlink" href="../interview.html#info">대학별 면접 일정 목록</a>')
    sib = "".join(f'<li><a href="{E(x["slug"])}.html"' + (' aria-current="page"' if x["slug"] == slug else "") + f'>{E(x["short"])}</a></li>'
                  for x in sorted(b["univs"], key=lambda x: x["short"]))
    y, m, d, w = _ymd(b["checked"])
    sources = [
        f'{E(F)} 「{E(u["doc"]["title"])}」, <a href="{E(u["doc"]["url"])}" target="_blank" rel="noopener">대학 입학처 원문</a>. 확인일 {y}년 {m}월 {d}일({w}).',
        f"질문 유형과 대표 기출은 {E(S)} 면접 가이드북 2027(현학적 연구소 편집)에서 옮겼습니다.",
        "면접 시간과 고사장은 대학 입학처 공지로 다시 확인하시기 바랍니다.",
    ]
    vals = {
        "__TITLE__": E(entry["title"]),
        "__CRUMB__": E(f"{S} 면접 일정과 기출 유형"),
        "__H1__": E(f"{S} 면접 일정과 기출 유형"),
        "__LEDE__": E(f"{F} 2027학년도 수시 학생부종합 면접의 전형별 날짜, 면접 방식, 자주 나오는 질문 유형입니다."),
        "__SCHED_NOTE__": E(f"{F} 2027학년도 수시모집요강에 적힌 날짜입니다. 모집단위에 따라 면접일이 다르면 줄을 나눴습니다."),
        "__ROWS__": rows_html(u),
        "__FORMAT_NOTE__": E(f"면접 형태, 시간, 선발 방식은 {F} 요강의 전형별 안내에서 옮겼습니다."),
        "__FORMAT__": format_html(u),
        "__TYPES_NAV__": E("질문 유형" if unit is False else "모집단위별 질문"),
        "__TYPES_H2__": E("자주 나오는 질문 유형" if unit is False else "질문이 많이 실린 모집단위"),
        "__TYPES_NOTE__": E(f"{S} 면접 가이드북에 실린 질문을 유형으로 나눠 많이 실린 유형부터 적었습니다." if unit is False else
                            f"{S} 면접 가이드북은 질문을 유형 대신 모집단위별로 묶어 싣습니다. 질문이 많이 실린 묶음부터 적었습니다."),
        "__TYPES__": "".join(f'<div class="r"><dt>{E(x["name"])}</dt><dd>{E(x["grade"])}</dd></div>' for x in u["types"]),
        "__Q_NOTE__": E(f"{S} 면접 기출 질문은 {S} 면접 가이드북 2027에 실린 질문에서 옮겼고 "
                        + ("유형 이름을 함께 적었습니다." if unit is False else "모집단위 묶음 이름을 함께 적었습니다.")),
        "__QUESTIONS__": "".join(f'<li><span><b>{E(q["type"])}</b> <span class="q">{E(q["q"])}</span></span></li>' for q in u["questions"]),
        "__PREP__": E(f"{S} {t0['name']} 면접 준비 자료는 아래 {S} 면접 가이드북 2027 면에 있습니다."),
        "__LINKS__": links,
        "__FAQ__": "".join(f'<details class="faq"><summary>{E(q)}</summary><div class="a"><p>{E(a)}</p></div></details>' for q, a in faq),
        "__SOURCES__": "".join(f"<li><span>{i}</span><span>{s}</span></li>" for i, s in enumerate(sources, 1)),
        "__SIBLINGS__": sib,
    }
    tpl = TPL.read_text(encoding="utf-8")
    i = tpl.find("<!doctype")
    if i < 0:
        sys.exit("build_interview_info: 템플릿에 <!doctype 없음")
    out = tpl[i:]
    for k, v in vals.items():
        out = out.replace(k, v)
    left = re.findall(r"__[A-Z_]+__", out)
    if left:
        sys.exit(f"build_interview_info: {slug} 자리표 잔존 {sorted(set(left))}")
    body = out.split("<body", 1)[1]
    for ch in BANNED:
        if ch in re.sub(r"(?is)<script\b.*?</script>", "", body):
            sys.exit(f"build_interview_info: {slug} 지면에 금지 문자 {ch!r}")
    if "십시오" in body:
        sys.exit(f"build_interview_info: {slug} 십시오체")
    defense(u, out)
    return out, entry


# ---------------------------------------------------------------- 판매 방어선 (build_all, deploy.sh 경로에서 빌드마다)
COUNT_RX = re.compile(r"\d[\d,]*\s*(문항|문|건)(?![가-힣])")
CATALOG = HERE / "guidebook_catalog.json"
_SAMPLES = {}


def _samples(slug):
    if not _SAMPLES:
        cat = json.loads(CATALOG.read_text(encoding="utf-8"))
        _SAMPLES.update({e["slug"]: [s["q"] for s in e.get("samples", [])] for e in cat["items"]})
    return _SAMPLES.get(slug, [])


def _visible(page):
    body = page.split("</head>", 1)[-1]
    body = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", body)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", body)))


def defense(u, page):
    """면마다 대표 기출 정확히 4문(SEO2-11 ②), 판매 면 맛보기와 같은 글 0, 유형 절 숫자 0, 문항 수 표기 0,
    반영 비율 밖 퍼센트 0(SEO2-12 ②). 하나라도 어기면 어떤 면도 쓰지 않고 멈춘다(묶음을 손으로 고치거나 맛보기가 바뀐 뒤 재컴파일을 빠뜨린 경우)."""
    slug = u["slug"]
    qs = [q["q"] for q in u["questions"]]
    if len(qs) != 4 or len(set(qs)) != 4:
        sys.exit(f"build_interview_info: {slug} 대표 기출 {len(qs)}문 (서로 다른 4문이어야 함, SEO2-11 ②)")
    vis = _visible(page)
    for s in _samples(slug):
        core = s[:-1].rstrip() if s.endswith("…") else s
        if core in vis or any(q == s or s.startswith(q) or q.startswith(core) for q in qs):
            sys.exit(f"build_interview_info: {slug} 판매 면 맛보기와 같은 문항 {core[:30]!r}")
    m = re.search(r'<section[^>]*id="types"[^>]*>(.*?)</section>', page, re.S)
    if m is None or re.search(r"\d", re.sub(r"<[^>]+>", " ", m.group(1))):
        sys.exit(f"build_interview_info: {slug} 유형 절이 없거나 숫자가 있다 (SEO2-12 ②)")
    hit = COUNT_RX.search(vis)
    if hit:
        sys.exit(f"build_interview_info: {slug} 문항 수 표기 {hit.group(0)!r} (SEO2-12 ②)")
    allowed = {p for t in u["tracks"] for p in re.findall(r"\d+%", t["ratio"])}
    extra = set(re.findall(r"\d+%", vis)) - allowed
    if extra:
        sys.exit(f"build_interview_info: {slug} 반영 비율 밖 퍼센트 {sorted(extra)} (SEO2-12 ②)")


def build(write=True):
    b = load_bundle()
    m = C.load_manifest()
    dates = json.loads(DATES.read_text(encoding="utf-8")) if DATES.exists() else {}
    sys.path.insert(0, str(HERE / "exam_pages"))
    import codes as EX
    codes = {c for c, _, _ in EX.CODES}
    pages = []
    for u in b["univs"]:   # 먼저 전부 그린다. 한 면이라도 멈추면 아무 면도 쓰지 않는다
        if u["slug"] in codes:
            sys.exit(f"build_interview_info: {u['slug']} 가 전형별 상세면 코드와 겹친다")
        pages.append((u, *render(u, b)))
    if not write:
        return pages
    (ROOT / "interview").mkdir(exist_ok=True)
    changed = 0
    for u, page, entry in pages:
        rel = f"interview/{u['slug']}.html"
        (ROOT / rel).write_text(page, encoding="utf-8")   # 후공정이 셸과 SEO 를 덧씌우므로 매번 다시 쓴다. 멱등은 build_all.sh 2회 해시
        ent = m["pages"].setdefault(rel, {})
        h = hashlib.sha256((page + json.dumps(entry, ensure_ascii=False, sort_keys=True)).encode("utf-8")).hexdigest()[:16]
        rec = dates.get(u["slug"])
        if not (rec and rec["sha"] == h):
            rec = dates[u["slug"]] = {"sha": h, "date": TODAY}
        entry["date_modified"] = rec["date"]
        entry["date_published"] = ent.get("date_published") or TODAY
        if ent != entry:
            ent.clear(); ent.update(entry); changed += 1
    C.save_manifest(m)
    DATES.write_text(json.dumps(dict(sorted(dates.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"build_interview_info: {len(pages)}면, manifest 갱신 {changed}건")
    return pages


if __name__ == "__main__":
    build()
