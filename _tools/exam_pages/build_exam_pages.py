#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""전형별 면접 출제 유형·풀이법 상세면 8본 생성기 (2026-09-10).
   interview/<code>.html = tpl.html(자리표 28) × drafts/<code>.json(astra 집필, check_drafts.py 통과분) × facts/<code>.json(요강 실측 원장)
   + assets/exam_page.css(이 폴더의 exam_page.css 사본) + seo_manifest.json 8항목.
   셸(GNB·푸터·모바일 바)·SEO 머리·AEO 단락·FAQ JSON-LD 는 build_all.sh 후공정이 붙인다. 이 파일은 마크업과 manifest 값만 낸다.
   실행: python3 _tools/exam_pages/build_exam_pages.py [--mod xa|xb|xc]   (기본 = MOD 상수, design-critic 권고안)
"""
import argparse, html, json, re, sys
from datetime import date
from pathlib import Path

D = Path(__file__).resolve().parent
ROOT = D.parent.parent
sys.path.insert(0, str(D)); sys.path.insert(0, str(D.parent))
import codes as EX            # noqa: E402
import seo_common as C        # noqa: E402

MOD = "xa"        # design-critic 권고안 (2026-09-10 채점 뒤 고정). xa 문서형 / xb 카드형 / xc 절차형
TPL = (D / "tpl.html").read_text(encoding="utf-8")
CSS_SRC, CSS_DST = D / "exam_page.css", ROOT / "assets" / "exam_page.css"
TODAY = date.today().isoformat()
LOCK = ["채점 기준 세부와 배점 추정", "유형별 모범답안과 첨삭 세 단", "세트별 전략과 시간 재배분"]
CONTACT_HOURS = "전화가 연결되지 않으면 고객센터 1:1 문의로 남겨 주세요. 영업일 기준 순차 답변합니다."   # 운영 시간은 사이트 어디에도 공표된 값이 없다 (2026-09-10 실측) → 결재 큐 정보 항목
SAMPLE_NOTE_BANK = "아래 시험지는 연구소 은행의 자체 저작 예시 세트에서 제시문 일부와 발문을 옮긴 것입니다. 대학 기출 지문이 아닙니다."
SAMPLE_NOTE_CARD = "아래 시험지는 대학이 공개한 선행학습영향평가 보고서의 2026 문항카드에서 옮긴 것입니다. 제시문은 요약이고 발문은 원문 그대로입니다."

E = lambda s: html.escape(str(s), quote=False)
def san(s):
    """facts 원장 문자열의 가운뎃점·줄표는 지면 산문 금지 문자(v2_check). 나열은 쉼표로."""
    return E(str(s).replace("·", ", ").replace("—", ", ").replace("–", ", "))
def num_b(s):
    return re.sub(r"(\d[\d,]*)", r'<b class="num">\1</b>', E(s))

def cut(text, lo, hi):
    """문장 경계에서 hi 이하로 자른다. 첫 문장이 hi 를 넘으면 그대로 두고 경고 (manifest 게이트 범위 = seo_check DESC/AEO)."""
    out = ""
    for sen in re.split(r"(?<=[.?!])\s+", text.strip()):
        cand = (out + " " + sen).strip()
        if len(cand) > hi: break
        out = cand
    if not out: out = text.strip()
    if not lo <= len(out) <= hi: print(f"   경고: 요약 {len(out)}자 (범위 {lo}~{hi}): {out[:40]}…")
    return out

def fn_index(label, notes, ratio_note_idx):
    """규격표 행 → 각주 번호. 각주 문면의 낱말로 잇는다. 없으면 1."""
    keys = {"준비 시간": ("분",), "답변 시간": ("분",), "제시문 수": ("제시문", "편"), "질문 수": ("문항", "질문"),
            "배점 공개": ("배점",), "출제 범위": ("은행", "유형", "범위"), "평가 요소": ("평가",), "언어": ("영어", "언어"),
            "전형 반영": ("반영", "배수", "단계"), "모집 인원": ("모집",), "수능 최저": ("최저",), "형태": ()}
    if label == "전형 반영" and ratio_note_idx: return ratio_note_idx
    for i, n in enumerate(notes, 1):
        if any(k in n for k in keys.get(label, ())): return i
    return 1

def spec_rows(f, notes, ratio_note_idx, opening):
    sp = f["spec"]; bank = f.get("bank") or {}; past = f.get("pastexam") or []
    pm, am = sp["prep_sec"] // 60, sp["answer_sec"] // 60
    rows = [
        ("형태", san(sp["form"])),
        ("제시문 수", f'<b>{sp["passages"]}</b>편'),
        ("준비 시간", f'<b>{pm}</b>분 <span class="xsec">(<b>{sp["prep_sec"]:,}</b>초)</span>'),
        ("답변 시간", f'<b>{am}</b>분 <span class="xsec">(<b>{sp["answer_sec"]:,}</b>초)</span>'),
        ("질문 수", f'<b>{sp["questions"]}</b>개'),
        ("배점 공개", san(sp["points"])),
        ("출제 범위", san(sp["scope"])),
        ("평가 요소", san(", ".join(sp["eval_axes"]))),
        ("언어", san(sp["lang"])),
        ("전형 반영", san(sp["stage"]).replace(" → ", "<br>").replace("→", "<br>")),
    ]
    if sp.get("admission_quota"): rows.append(("모집 인원", f'<b>{sp["admission_quota"]}</b>명'))
    if past: rows.append(("2026 기출 해설", f'<b>{len(past)}</b>세트 (스튜디오 해설 인강)'))
    elif f["code"].startswith("korea-eq"): rows.append(("기출 원문", "2024, 2025, 2026 문항카드 (선행학습영향평가 보고서)"))
    if opening:
        rows.append(("이용권", f'{EX.OPEN_DATE} 오픈 예정'))
    else:
        rows.append(("이용권", f'단위 전권 <b>{sp["price"]:,}</b>원, 지문 낱권 <b>{sp["single_price"]:,}</b>원'))
        rows.append(("스튜디오 세트", f'<b>{bank["n_sets"]}</b>세트, 세트마다 <b>5</b>회 응시'))
        rows.append(("해설 인강", f'<b>{sp["lecture_count"]}</b>편'))
    refs = [(k, v, fn_index(k, notes, ratio_note_idx) if k != "형태" else 0) for k, v in rows]
    used = sorted({fn for _, _, fn in refs if fn})
    remap = {old: i for i, old in enumerate(used, 1)}          # 참조된 각주만 1부터 다시 매긴다 (critic 권고: 고아 각주 3번 5면)
    out = []
    for k, v, fn in refs:
        sup = f'<sup class="fn">{remap[fn]}</sup>' if fn else ""
        out.append(f'<div class="r"><dt>{k}</dt><dd>{v}{sup}</dd></div>')
    return "".join(out), [notes[i - 1] for i in used]

def build_one(code, mod):
    d = json.loads((D / "drafts" / f"{code}.json").read_text(encoding="utf-8"))
    f = json.loads((D / "facts" / f"{code}.json").read_text(encoding="utf-8"))
    sp = f["spec"]; bank = f.get("bank") or {}; past = f.get("pastexam") or []
    opening = sp.get("status") != "on_sale"
    name = dict((c, n) for c, n, _ in EX.CODES)[code]
    pm, am = sp["prep_sec"] // 60, sp["answer_sec"] // 60
    # 각주: 집필 spec_notes(1~3) + 전형 반영 출처(facts.ratio_src, 있으면)
    notes = list(d["spec_notes"])
    ratio_idx = 0
    if sp.get("ratio_src"):
        notes.append(f'전형 반영 비율은 {sp["ratio_src"]}에서 옮겼습니다.'); ratio_idx = len(notes)
    # 유형 카드
    tc = []
    for t in d["types"]:
        ps = t["prompt_shape"]
        q = f"&ldquo;{E(ps)}&rdquo;" if ps.rstrip().endswith("시오.") else E(ps)
        tc.append(f'<li class="xtype"><h3>{E(t["name"])}</h3><p class="def">{E(t["definition"])}</p><p class="q">{q}</p>'
                  f'<p class="n"><span class="k">기출과 은행</span><span>{E(t["frequency_note"])}</span>'
                  f'<span class="k">읽는 열쇠</span><span>{E(t["reading_key"])}</span></p></li>')
    # 시간 배분
    tl = d["method"]["timeline"]; total = sp["prep_sec"]; rows = []
    for i, t in enumerate(tl, 1):
        m = re.search(r"약\s*(\d[\d,]*)\s*초", t["seconds"])
        if m:
            sec = int(m.group(1).replace(",", "")); w = round(sec * 100.0 / total, 1)
            rows.append(f'<div class="row"><span class="st">{i:02d}</span><span class="xsec">약 {sec:,}초</span><span class="do">{E(t["doing"])}</span>'
                        f'<span class="bar" style="--w:{w}%"><i></i></span></div>')
        else:
            rows.append(f'<div class="row"><span class="st">{i:02d}</span><span class="xsec txt">준비 시간 안</span><span class="do">{E(t["doing"])}</span></div>')
    time_cap = f'<span class="k">준비 {pm}분 배분</span><span class="k">{total:,}초, {len(tl)}단계</span>'
    # 예시 문항
    sm = d["sample"]
    doc = (f'<div class="doc_head"><span class="t">{E(sm["doc_head"])}</span><span class="k">준비 {pm}분 / 답변 {am}분</span></div><div class="pass">'
           + "".join(f'<p><span class="lb">{E(p["tag"])}</span>{E(p["excerpt"])}</p>' for p in sm["passages"])
           + '</div><ol class="qs">' + "".join(f'<li><span>{i}</span><span>{E(q)}</span></li>' for i, q in enumerate(sm["questions"], 1)) + "</ol>")
    steps = "".join(f'<li{" class=\"off\"" if i == len(sm["steps"]) else ""}><h4>{E(s["title"])}</h4><p>{E(s["body"])}</p></li>'
                    for i, s in enumerate(sm["steps"], 1))
    # 자료·행동
    if opening:
        mats = [("제시문 면접 스튜디오 세트", f"{EX.OPEN_DATE} 오픈"), ("풀이법 해설 인강", f"{EX.OPEN_DATE} 오픈")]
        if code.startswith("korea-eq"): mats.append(("2024, 2025, 2026 문항카드 원문", "선행학습영향평가 보고서"))
        cta = (f'<div class="xsoon"><div><h3>{E(name)} 응시 단위는 <span class="d">{EX.OPEN_DATE}</span>에 엽니다</h3>'
               f'<p>여는 날에 세트와 해설 인강이 함께 섭니다. 그때까지 이 면의 규격과 풀이 절차는 그대로 봅니다.</p></div>'
               f'<p><a class="tlink" href="../notice.html?id={EX.NOTICE_ID}">{EX.OPEN_DATE} 오픈, 공지 보기 <span class="ar" aria-hidden="true">&rarr;</span></a></p></div>')   # 링크 1개 (critic 권고: 50px 간격 중복)
        badge = f'<span class="badge mute">{EX.OPEN_DATE} 오픈 예정</span><span class="k">2027학년도 기준</span>'
    else:
        mats = [("제시문 면접 스튜디오 세트", f'{bank["n_sets"]}세트'), ("풀이법 해설 인강", f'{sp["lecture_count"]}편')]
        if past: mats.append(("2026 기출 해설", f"{len(past)}세트"))
        cta = (f'<div class="xcta"><a class="btn" href="../studio.html?unit={code}">면접 스튜디오 이용권 보기 <span class="ar" aria-hidden="true">&rarr;</span></a>'
               f'<a class="tlink" href="../lectures/{code}.html">풀이법 인강 <span class="ar" aria-hidden="true">&rarr;</span></a></div>')
        badge = '<span class="badge seal">판매 중</span><span class="k">2027학년도 기준</span>'
    spec_html, used_notes = spec_rows(f, notes, ratio_idx, opening)
    sib = "".join(f'<li><a href="{c}.html"{" aria-current=\"page\"" if c == code else ""}><span>{E(n)}</span><span class="k">{E(s)}</span></a></li>'
                  for c, n, s in EX.CODES)
    title = f'{d["title_tag"]} | 현학적 연구소'
    desc = cut(d["meta_description"], 70, 110)
    answer = cut(d["answer_box"], 40, 110)
    vals = {
        "code": code, "mod": mod, "lang_title": E(title), "canonical": f"https://hyunhak.com/interview/{code}.html", "desc": E(desc), "aeo": E(answer),
        "crumb_name": san(sp["label"]), "status_badge": badge, "h1": E(d["h1"]),
        "lead": "".join(f"<p>{num_b(s)}</p>" for s in d["lead"]),
        "spec_rows": spec_html,
        "spec_notes": "".join(f'<li><span>{i}</span><span>{san(n)}</span></li>' for i, n in enumerate(used_notes, 1)),
        "type_cards": "".join(tc),
        "method_rules": "".join(f'<li><span><b>{E(p["title"])}</b> {E(p["body"])}</span></li>' for p in d["method"]["principles"]),   # li 격자(24px+1fr)라 span 1개로 감싼다 (critic B-2)
        "time_cap": time_cap, "time_rows": "".join(rows),
        "lock_items": "".join(f"<li><span>{E(t)}</span></li>" for t in [d["method"]["boundary"]] + LOCK),   # li 격자(16px+1fr)의 첫 칸은 ::before, 자식은 span 1개 (디렉터 결함4 「격자 자식 수」)
        "sample_note": SAMPLE_NOTE_CARD if code.startswith("korea-eq") else SAMPLE_NOTE_BANK,
        "sample_doc": doc, "sample_src": E(sm["source_note"]), "sample_steps": steps,
        "sample_first": E(sm["first_sentence"]), "sample_trap": E(sm["trap"]),
        "pitfalls": "".join(f'<div><h3>{E(p["title"])}</h3><p>{E(p["body"])}</p></div>' for p in d["pitfalls"]),
        "plan_steps": "".join(f'<div class="st"><span class="k">{i:02d}</span><h3>{E(p["title"])}</h3><p>{E(p["body"])}</p></div>' for i, p in enumerate(d["plan"], 1)),
        "materials": "".join(f'<li><span>{E(a)}</span><b>{E(b)}</b></li>' for a, b in mats),
        "cta": cta,
        "faq": "".join(f'<details class="faq"><summary>{E(q["q"])}</summary><div class="a"><p>{E(q["a"])}</p></div></details>' for q in d["faq"]),
        "contact_hours": E(CONTACT_HOURS), "siblings": sib,
    }
    # 머리 주석(자리표 명세)은 안에 "<!--v2:shell-->" 같은 닫힘 표기가 있어 비탐욕 정규식이 중간에서 끊긴다 → doctype 앞까지 통째로 자른다
    i = TPL.find("<!doctype"); assert i > 0, "tpl.html 에 <!doctype 없음"
    out = TPL[i:]
    for k, v in vals.items(): out = out.replace("{%s}" % k, v)
    left = re.findall(r"\{[a-z_]+\}", out)
    assert not left, f"{code}: 미치환 자리표 {left}"
    for ch in ("·", "—", "–"):
        assert ch not in out.split("<body", 1)[1], f"{code}: 지면 산문에 금지 문자 {ch!r}"
    entry = {"title": title, "description": desc, "answer": answer, "keywords": list(d["keywords"]),
             "type": "article", "priority": 0.8, "changefreq": "weekly", "noindex": False,
             "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "면접 형태 판정표", "path": "/interview.html"},
                            {"name": sp["label"].replace("·", ", "), "path": f"/interview/{code}.html"}],
             "schema": {"about": sp["univ"], "about_type": "CollegeOrUniversity"},
             "speakable": [".aeo-answer", ".xspec"], "date_modified": TODAY}
    return out, entry

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--mod", default=MOD, choices=["xa", "xb", "xc"]); a = ap.parse_args()
    (ROOT / "interview").mkdir(exist_ok=True)
    CSS_DST.write_text(CSS_SRC.read_text(encoding="utf-8"), encoding="utf-8")
    m = C.load_manifest(); changed = 0
    for code, _, _ in EX.CODES:
        page, entry = build_one(code, a.mod)
        rel = f"interview/{code}.html"; p = ROOT / rel
        before = p.read_text(encoding="utf-8") if p.exists() else None
        p.write_text(page, encoding="utf-8")   # 후공정이 셸·SEO 를 덧씌우므로 매번 다시 쓴다 (허브와 같은 방식). 멱등은 build_all.sh 2회 해시
        ent = m["pages"].setdefault(rel, {})
        entry["date_published"] = ent.get("date_published") or TODAY
        if ent != entry: ent.clear(); ent.update(entry); changed += 1
        print(f"{rel}: {len(page):,}자 {'변경' if before != page else '동일'} · manifest {'갱신' if ent == entry else ''}")
    C.save_manifest(m)
    print(f"build_exam_pages: 8면 · manifest 갱신 {changed}건 · css {CSS_DST.relative_to(ROOT)} · mod {a.mod}")

if __name__ == "__main__":
    main()
