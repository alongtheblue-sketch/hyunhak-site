#!/usr/bin/env python3
"""가이드북 상세페이지 v3 원천 생성기 — 현학적 연구소 편집본 38권 (2026-08-26).

입력
  PDF  = interview_guidebook_2027/dist_hyunhak_protected/<대학>_2027면접가이드북.pdf
  HTML = interview_guidebook_2027/out2/<대학>_R.html (같은 판의 조판 원천, 텍스트 추출용. 2026-08-28 s26: 테마 H 기각, 승인판 = R 현학 edition)
  JSON = interview_guidebook_2027/export/site/<대학>.json (질문·규칙 내부 카운트)
출력
  assets/covers/<slug>.jpg             표지 (596x842, 판매 파일 1면 렌더)
  assets/preview/<slug>/pNN.webp       미리보기 면. 표지·차례·부 간지는 선명, 본문 면은 픽셀 단계 블러
                                       (상단 머리띠만 선명, 나머지는 복원 불가) — CSS 블러가 아니라 이미지 자체를 흐린다
  _tools/guidebook_meta_v3.json        권별 소구 수치와 구조 (질문 수, 규칙 수, 부 5개, 면접 형태, 전형, 유형, 규칙 코드, 전략 제목, 미리보기 목록)

실행: ~/venvs/pdfbuild/bin/python _tools/build_previews.py [--only slug,slug] [--dry]
결정론: 같은 입력 = 같은 바이트 (PyMuPDF 렌더 + PIL, 시각 정보 없음).
"""
import argparse
import html as htmlmod
import io
import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_guidebook import SLUGS  # noqa: E402  (slug ↔ 학교명 단일 원천)

SITE = Path(__file__).resolve().parent.parent
GUIDEBOOK_SRC = Path("/Users/gregory/Workspace/interview_guidebook_2027")
PDF_DIR = GUIDEBOOK_SRC / "dist_hyunhak_protected"
HTML_DIR = GUIDEBOOK_SRC / "out2"
EXPORT_DIR = GUIDEBOOK_SRC / "export" / "site"
COVERS = SITE / "assets" / "covers"
PREVIEW = SITE / "assets" / "preview"
META = SITE / "_tools" / "guidebook_meta_v3.json"

PREVIEW_W = 880          # 미리보기 폭(px). A4 세로 기준 높이 ≈ 1245
CLEAR_TOP = 0.16         # 상단 선명 띠 비율 (머리띠 + 절 제목 + 첫 줄)
FEATHER = 0.035          # 선명 → 흐림 전이 폭
BLUR_R = 9               # 가우시안 반경(px). 880px 폭에서 본문 10pt 활자는 판독 불가
DARK_MEAN = 0.55         # 부 간지 판정: 평균 휘도(0~1) 이 값 미만 = 짙은 색 전면 (동국대 0.43 실측 포함)
WEBP_Q = 70
COVER_Q = 82


# ---------------------------------------------------------------- HTML 메타
def _t(s):
    """태그 제거 + 엔티티 복원 + 단어결합자(U+2060) 제거 + 공백 정리."""
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = htmlmod.unescape(s).replace("⁠", "")
    return re.sub(r"\s+", " ", s).strip()


def parse_html(univ, p, export_path):
    s = p.read_text(encoding="utf-8").replace("⁠", "")
    body = s[s.find("<body"):]
    site_data = json.loads(export_path.read_text(encoding="utf-8"))
    counts = site_data.get("counts")
    if not isinstance(counts, dict):
        raise ValueError(f"{univ}: export/site counts 계약 누락")
    for key in ("questions", "rules"):
        if not isinstance(counts.get(key), int):
            raise ValueError(f"{univ}: export/site counts.{key} 정수 누락")
    m = {"questions": counts["questions"], "rules": counts["rules"]}
    v = re.search(r"VOL\.(\d+)", body)
    m["vol"] = int(v.group(1)) if v else None

    # 부 5개: 간지 섹션에서 제목·설명·수치 띠
    parts = []
    for sec in re.findall(r'<section class="part".*?</section>', body, flags=re.S):
        no = int(re.search(r'<div class="pbig">(\d+)</div>', sec).group(1))
        title = _t(re.search(r'<div class="pnm">(.*?)</div>', sec, flags=re.S).group(1))
        desc = _t(re.search(r'<div class="pds">(.*?)</div>', sec, flags=re.S).group(1))
        strip = [(_t(b), _t(l)) for b, l in re.findall(r"<span><b>(.*?)</b>(.*?)</span>", sec, flags=re.S)]
        parts.append({"no": no, "title": title, "desc": desc, "strip": strip})
    m["parts"] = parts

    # 차례 부제 (toct 표의 .d span)
    toc = re.search(r'<table class="toct">(.*?)</table>', body, flags=re.S)
    m["toc_subs"] = [_t(x) for x in re.findall(r'<span class="d">(.*?)</span>', toc.group(1), flags=re.S)] if toc else []
    # 이 책을 쓰는 법 (차례 면의 사용 순서 5줄 — 굵은 머리만)
    pl = re.search(r'<ol class="pl">(.*?)</ol>', body, flags=re.S)
    m["usage"] = [_t(x) for x in re.findall(r"<li><b>(.*?)</b>", pl.group(1), flags=re.S)] if pl else []

    # 면접 형태 (이 대학에 있음/없음)
    forms = []
    ft = re.search(r'<table class="tbl forms">(.*?)</table>', body, flags=re.S)
    if ft:
        for tr in re.findall(r"<tr>(.*?)</tr>", ft.group(1), flags=re.S):
            th = re.search(r"<th>(.*?)</th>", tr, flags=re.S)
            here = re.search(r'<td class="here">(.*?)</td>', tr, flags=re.S)
            if th and here:
                forms.append({"form": _t(th.group(1)), "has": "있음" in _t(here.group(1))})
    m["forms"] = forms

    # 전형별 형태 표 (forms 표 다음 첫 표): 행 = (전형과 모집단위, 면접 형태 판정)
    tracks = []
    after = body[body.find('<h3 class="sub">전형별 형태</h3>'):] if "전형별 형태" in body else ""
    tt = re.search(r"<table.*?</table>", after, flags=re.S)
    if tt:
        for tr in re.findall(r"<tr>(.*?)</tr>", tt.group(0), flags=re.S):
            cells = [_t(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.S)]
            if len(cells) >= 2 and cells[0] and not cells[0].startswith("전형"):
                tracks.append({"track": cells[0], "form": cells[1]})
    m["tracks"] = tracks

    # 2부 제원 표: 전형 수 = 헤더 th 수 - 1, 제원 항목 = 행 수
    mtx = re.search(r'<table class="mtx[^"]*">(.*?)</table>', body, flags=re.S)
    if mtx:
        head = re.search(r"<thead>(.*?)</thead>", mtx.group(1), flags=re.S)
        ths = re.findall(r"<th[^>]*>(.*?)</th>", head.group(1), flags=re.S) if head else []
        rows = re.findall(r"<tbody>(.*?)</tbody>", mtx.group(1), flags=re.S)
        m["spec_tracks"] = [_t(x) for x in ths if _t(x)]
        m["spec_items"] = [_t(x) for x in re.findall(r'<th class="rh">(.*?)</th>', rows[0], flags=re.S)] if rows else []
    else:
        m["spec_tracks"], m["spec_items"] = [], []

    # 인재상 note
    notes = [_t(x) for x in re.findall(r'<div class="note">(.*?)</div>', body, flags=re.S)]
    m["ideal"] = [n for n in notes if "인재상" in n][:2]

    # 3부 유형 그룹 (이름, 수록 건수)
    groups = []
    for gh, gn in re.findall(r'<div class="qgrp[^"]*"><div class="gh">(.*?)</div><span class="gn">(.*?)</span>', body, flags=re.S):
        n = re.search(r"(\d+)", _t(gn))
        groups.append({"type": _t(gh), "n": int(n.group(1)) if n else None})
    m["groups"] = groups
    years = sorted({int(y) for y in re.findall(r'class="qm">[^<]*?(20\d\d)', body)})
    m["years"] = [years[0], years[-1]] if years else None
    # 모집단위(qm 라벨에서 연도 제거) 종류 수
    units = set()
    for lab in re.findall(r'class="qm">([^<]*)<', body):
        u = re.sub(r"\s*20\d\d\s*$", "", _t(lab)).strip()
        if u:
            units.add(u)
    m["units_n"] = len(units)

    # 4부 규칙: 코드, 근거 영역, 언제
    rules = []
    for rh, it, rt in re.findall(r'<div class="rh">(R\d+)<span class="it">(.*?)</span></div><div class="rt">(.*?)</div>', body, flags=re.S):
        rules.append({"code": rh, "area": _t(it), "when": _t(rt).replace("언제 ", "", 1)})
    m["rule_list"] = rules
    areas = []
    for r in rules:
        a = re.sub(r"\(.*?\)", "", r["area"]).strip()
        if a and a not in areas:
            areas.append(a)
    m["rule_areas"] = areas
    m["rule_tail_n"] = len(re.findall(r'<div class="rtail">', body))
    m["rule_ev_n"] = len(re.findall(r'<div class="rev">', body))

    # 5부 전략 제목: S번호 plain 형(4권)이 우선, 그 외에는 준비 전략 절의 h3.sub 제목
    strat = []
    for st in re.findall(r'<p class="plain"><strong>(S\d+\.\s*.*?)</strong>', body, flags=re.S):
        strat.append(_t(st))
    if len(strat) < 3:
        idx = body.find("준비 전략</h2>")
        if idx < 0:
            idx = body.find('id="pt5"')
        seg = body[idx:] if idx >= 0 else ""
        cut = seg.find('<section class="colo')
        if cut < 0:
            cut = len(seg)
        seg = seg[:cut]
        strat = [_t(x) for x in re.findall(r'<h3 class="sub"[^>]*>(.*?)</h3>', seg, flags=re.S)]
        if len(strat) < 3:
            # 목록형 (li strong 머리) 또는 번호 plain 형 — 굵은 머리의 첫 문장만
            cands = re.findall(r"<li><strong>(.*?)</strong>", seg, flags=re.S)
            cands += re.findall(r'<p class="plain"><strong>(.*?)</strong>', seg, flags=re.S)
            strat = []
            for c in cands:
                t = _t(c)
                t = re.sub(r"^\d+-\d+\.\s*", "", t).rstrip(".")
                if len(t) >= 8:
                    strat.append(t if len(t) <= 64 else t[:64].rstrip() + "…")
        if len(strat) < 3:
            # 마지막 폴백: 전략 목록 li 의 첫 문장
            strat = []
            for c in re.findall(r"<li>(.*?)</li>", seg, flags=re.S):
                t = _t(c)
                t = re.split(r"(?<=다)\.", t)[0].strip()
                if len(t) >= 10:
                    strat.append(t if len(t) <= 64 else t[:64].rstrip() + "…")
            strat = strat[:8]
    m["strategies"] = strat
    m["sections"] = [_t(x) for x in re.findall(r'<h2 class="sec">(.*?)</h2>', body, flags=re.S)]
    return m


# ---------------------------------------------------------------- PDF 렌더
def page_means(doc):
    """면별 평균 휘도 (0~1). 아주 낮은 해상도로 전 면을 훑는다."""
    out = []
    for pg in doc:
        pix = pg.get_pixmap(dpi=12, colorspace=fitz.csGRAY)
        out.append(sum(pix.samples) / (len(pix.samples) * 255.0))
    return out


def render(doc, i, width):
    pg = doc[i]
    zoom = width / pg.rect.width
    pix = pg.get_pixmap(matrix=fitz.Matrix(zoom, zoom), colorspace=fitz.csRGB, alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def blur_body(img):
    """상단 CLEAR_TOP 만 선명, 아래는 가우시안 블러. 마스크로 합성 — 결정론."""
    w, h = img.size
    blurred = img.filter(ImageFilter.GaussianBlur(BLUR_R))
    mask = Image.new("L", (w, h), 0)
    top = int(h * CLEAR_TOP)
    fe = max(1, int(h * FEATHER))
    px = mask.load()
    for y in range(h):
        if y < top:
            v = 0
        elif y < top + fe:
            v = int(255 * (y - top) / fe)
        else:
            v = 255
        for x in range(w):
            px[x, y] = v
    return Image.composite(blurred, img, mask)


def save_webp(img, path, q):
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=q, method=6)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(buf.getvalue())
    return len(buf.getvalue())


def pick_pages(n_pages, dividers):
    """미리보기 면 선택. (면번호 1-base, 종류) — cover/toc/part 는 선명, body 는 블러."""
    picks = [(1, "cover"), (2, "toc")]
    dset = set(dividers)
    for k, d in enumerate(dividers, 1):
        picks.append((d, "part"))
        want = 2 if k in (3, 4) else 1
        got = 0
        j = d + 1
        while got < want and j < n_pages and j not in dset:   # 마지막 면(판권)은 제외
            picks.append((j, "body"))
            got += 1
            j += 1
    return picks


def build_one(slug, univ, dry=False):
    pdf = PDF_DIR / f"{univ}_2027면접가이드북.pdf"
    html_path = HTML_DIR / f"{univ}_R.html"
    export_path = EXPORT_DIR / f"{univ}.json"
    paths = {"pdf": pdf, "html": html_path, "export": export_path}
    missing = [f"{kind}={path}" for kind, path in paths.items() if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"{univ}: 입력 경로 누락: {', '.join(missing)}")
    if dry:
        return {"slug": slug, "name": univ,
                "paths": {kind: str(path) for kind, path in paths.items()}}

    doc = fitz.open(pdf)
    n = doc.page_count
    means = page_means(doc)
    dividers = [i + 1 for i, v in enumerate(means) if i >= 2 and v < DARK_MEAN]
    if len(dividers) != 5:
        print(f"  ⚠ {univ}: 간지 판정 {len(dividers)}건 (기대 5) means={['%.2f' % v for v in means]}")
    meta = parse_html(univ, html_path, export_path)
    meta.update({"slug": slug, "name": univ, "pages": n, "dividers": dividers,
                 "file": pdf.name, "bytes": pdf.stat().st_size})
    # 표지 jpg (596x842)
    cover = render(doc, 0, 596).resize((596, 842), Image.LANCZOS)
    cover.save(COVERS / f"{slug}.jpg", "JPEG", quality=COVER_Q, optimize=True, progressive=True)
    # 미리보기
    prev_dir = PREVIEW / slug
    prev_dir.mkdir(parents=True, exist_ok=True)
    for old in prev_dir.glob("*.webp"):
        old.unlink()
    previews = []
    for pno, kind in pick_pages(n, dividers):
        img = render(doc, pno - 1, PREVIEW_W)
        if kind == "body":
            img = blur_body(img)
        out = prev_dir / f"p{pno:02d}.webp"
        size = save_webp(img, out, WEBP_Q)
        previews.append({"page": pno, "kind": kind, "file": f"assets/preview/{slug}/p{pno:02d}.webp",
                         "w": img.size[0], "h": img.size[1], "bytes": size})
    meta["previews"] = previews
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    only = {x for x in a.only.split(",") if x}
    out = {}
    for slug, univ in SLUGS:
        if only and slug not in only:
            continue
        print(f"[{slug}] {univ}")
        out[slug] = build_one(slug, univ, dry=a.dry)
        if a.dry:
            print("  paths=ok (pdf, html, export)")
        else:
            print(f"  pages={out[slug]['pages']} q={out[slug]['questions']} rules={out[slug]['rules']} "
                  f"dividers={out[slug]['dividers']} previews={len(out[slug].get('previews', []))}")
    if a.dry:
        print(f"dry: paths={len(out)}/{len(only) if only else len(SLUGS)} ok, render=0, writes=0")
    elif not only:
        META.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        total = sum(p["bytes"] for m in out.values() for p in m["previews"])
        print(f"meta -> {META} ({len(out)} 권, 미리보기 {sum(len(m['previews']) for m in out.values())}면, {total/1e6:.1f} MB)")
    elif only:
        # 부분 실행은 기존 메타에 병합
        cur = json.loads(META.read_text(encoding="utf-8")) if META.exists() else {}
        cur.update(out)
        META.write_text(json.dumps(cur, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"meta 병합 -> {META}")


if __name__ == "__main__":
    main()
