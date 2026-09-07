#!/usr/bin/env python3
"""상품면(programs/guidebook.html) 지면 표본 생성기, 판(edition) 인자형 (GB-V24-5 (C), 2026-09-07).

구판 생성기(_design/guidebook_detail_20260903/build/make_sample_page.py)는 PDF 경로와 칸 좌표(pt)가 v21 clean 기준으로
하드코딩돼 정본이 v24 로 바뀌자 표본이 낡았다(면번호, 군 제목, 문구). 이 생성기는
  1) 원천 = guidebook_sources.v24_inputs(가천대학교)["clean_pdf"] (판매 정본 v24 clean, sha 기록)
  2) 면과 칸을 좌표가 아니라 본문 텍스트 앵커로 잡는다(앵커 미검출 = 정지)
  3) 차례, 부 간지 6장 + 흐림 표본 6장 + A 확대 1장 = 13장을 굽는다(선명 칸 밖은 픽셀에 가우시안 블러)
  4) 저장된 JPEG 를 다시 읽어 OCR 누출을 잰다. 흐린 판 OCR 의 원문 단어 일치 3% 초과 또는 원문 2-gram 일치 15% 초과 = 정지(게이트).
     대조군 = 같은 면의 선명 렌더(OCR 이 글자를 읽을 수 있음을 증명, 한글 30자 미만이면 검출기 불신으로 정지)
  5) programs/guidebook.html 의 표본 마크업(src, width, height, alt, 번호 배지 위치, 범례, 캡션 면번호)을 제자리에서 갱신
  6) 원장 _tools/sample_regions_v24.json (판, PDF sha, 면, 칸 %, 파일 sha) 기록
--check: 원장의 PDF sha 가 현 판 clean 과 같고, 원장의 파일 sha 와 지면 참조(src, alt 면번호, 캡션 면번호)가 일치하는지만 본다(fitz 불요).
실행:  ~/Workspace/pdf_armor/.venv/bin/python _tools/build_samples.py --edition v24        (생성, pymupdf, Pillow, tesseract kor)
       python3 _tools/build_samples.py --check                                             (build_all 6f)
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
sys.path.insert(0, str(HERE))
import guidebook_sources as S  # noqa: E402

PAGE_HTML = SITE / "programs" / "guidebook.html"
ASSET_DIR = SITE / "assets" / "photo" / "gbd"
REGIONS = HERE / "sample_regions_v24.json"
UNIV = "가천대학교"
DPI = 150
SIGMA = 7        # 150dpi 기준. 9pt 본문 x-height 약 9px, sigma 7 이면 획이 남지 않는다 (구 생성기 실측 승계)
PAD_PT = 7
FEATHER = 3
LEAK_WORD_MAX = 0.03      # 흐린 판 OCR 에서 살아남은 원문 단어 비율
LEAK_BIGRAM_MAX = 0.15    # 흐린 판 OCR 한글 2-gram 중 원문에 있는 비율 (무작위 바닥 약 5%)
CONTROL_MIN_HANGUL = 30

OPENERS = [("toc", "차례", "차례와 쓰는 법"), ("part1", "PART 1", "1부 들어가는 면"), ("part2", "PART 2", "2부 들어가는 면"),
           ("part3", "PART 3", "3부 들어가는 면"), ("part4", "PART 4", "4부 들어가는 면"), ("part5", "PART 5", "5부 들어가는 면")]

# 표본 본. page_anchors = 그 면에 전부 있어야 하는 문구(면 판별, 미검출 = 정지).
# regions = (start 앵커, end 앵커, 범례[, xmax pt]). 읽기 순서로 start 블록부터 end 블록까지 합집합이 칸. end 가 None 이면 start 블록 하나. xmax 는 다른 열 제외.
VARIANTS = {
    "D": dict(title="1부 면접 형태 판정 면", crop=0.47, zoom=None, page_anchors=["형태는 세 가지입니다", "전형별 형태"],
              regions=[("서류기반 내 생활기록부가 문제지입니다", "이 대학에 있음", "세 형태 중 서류기반. 정의와 이 대학에 있음 표시"),
                       ("전형과 모집단위", "가천바람개비전형 서류확인형", "전형별 형태 판정표. 가천바람개비전형은 서류확인형")]),
    "E": dict(title="2부 학과별 인재상 면", crop=1.0, zoom=None, page_anchors=["학과(계열)별 인재상", "간호학과"],
              regions=[("아래는 전부 확인 질문에서 역추론한", "36개 학과를 전부 수록", "확인 질문에서 역추론한 학과별 초점. 질문 5건 이상 확인된 36개 학과 수록"),
                       ("간호학과", "실제 질문", "간호학과 82건. 확인하는 것과 실제 질문 두 건", 240)]),   # xmax 240pt = 간호학과 열만
    "B": dict(title="3부 실제로 나온 질문 면", crop=1.0, zoom=None, page_anchors=["독서 — 선배 후기 확인", "공동체·인성 — 선배 후기 확인"],
              regions=[("독서 — 선배 후기 확인", "책을 많이 읽지 않았는데", "유형 이름과 질문. 끝의 작은 글씨가 모집단위와 연도"),
                       ("공동체·인성 — 선배 후기 확인", "봉사활동을 많이 하셨는데", "공동체와 인성 유형. 첫 두 질문"),
                       ("센서에 대해서 알아본 거 있어요", None, "한 줄 질문. 전자공학과, 2021년")]),
    "A": dict(title="4부 교과학습 규칙 면", crop=1.0, zoom=1, full=True, page_anchors=["교과학습 과정·역할", "언제 실험 수행 기재"],
              regions=[("교과학습 과정·역할", "평가 축 진학의지 中 탐구학습경험", "영역 이름과 규칙 한 건. 언제, 질문 틀, 꼬리질문, 평가 축"),
                       ("사실확인", "평가 축 진학의지 中 탐구학습경험", "실험 기재가 있을 때의 규칙. 4부 표본으로 든 그 규칙")]),
    "F": dict(title="4부 창의적 체험활동 규칙 면", crop=1.0, zoom=None, page_anchors=["언제 전교 회장, 부회장 기재", "언제 영재학급, 심화과정 등 기재"],
              regions=[("과정·역할", "평가 축 인성 中 공동체 역량 / 공동체역량 中 리더십", "영역 이름과 규칙 한 건. 전교 회장, 부회장 기재 때의 질문 틀, 꼬리질문, 평가 축"),
                       ("언제 영재학급, 심화과정 등 기재", "평가 축 진학의지 中 교과학습경험(계열적합성)", "영재학급, 심화과정 기재 때의 규칙")]),
    "C": dict(title="5부 공식 대비 범위와 전체 평균 대비 차이 면", crop=1.0, zoom=None, page_anchors=["가천대학교 2027학년도 공식 대비 범위", "면접시간 10분 계열 비중"],
              regions=[("가천대학교 2027학년도 공식 대비 범위", None, "절 제목. 2027 공식 대비 범위"),
                       ("항목 면접시간 10분 계열 비중", "차이 +21.5%p", "전체 평균 대비 차이 6지표 중 4~6번. 면접시간 10분 계열 63.2% 대 전체 41.7%"),
                       ("해석 10분이 사실상 표준입니다", None, "해석. 답변 1건당 40초 안팎")]),
}
# 상품면 표본 목록 순서(표본 D E B F A C 는 각각 1부 2부 3부 4부 4부 5부 절)

HANGUL = lambda s: [c for c in s if "가" <= c <= "힣"]  # noqa: E731


def sha16(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()[:16]


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


# ---------------------------------------------------------------- 생성
def blocks_of(page):
    out = []
    for b in page.get_text("blocks"):
        t = norm(b[4])
        if t:
            out.append((b[0], b[1], b[2], b[3], t))
    out.sort(key=lambda b: (round(b[1]), b[0]))
    return out


def find_page(doc, anchors):
    hits = [i + 1 for i in range(doc.page_count) if all(a in norm(doc[i].get_text()) for a in anchors)]
    if len(hits) != 1:
        sys.exit(f"면 판별 실패: {anchors} 를 전부 가진 면 = {hits} (정확히 1면이어야 한다)")
    return hits[0]


def span_rect(blocks, start, end, xmax=None):
    """읽기 순서로 start 블록부터 end 블록까지의 합집합. xmax(pt)가 있으면 그 오른쪽에서 시작하는 블록(다른 열)은 뺀다."""
    si = next((i for i, b in enumerate(blocks) if b[4].startswith(start)), None)
    if si is None:
        sys.exit(f"앵커 미검출(start): {start!r}")
    if end is None:
        sel = [blocks[si]]
    else:
        ei = next((i for i in range(si, len(blocks)) if end in blocks[i][4]), None)
        if ei is None:
            sys.exit(f"앵커 미검출(end): {end!r} (start {start!r} 뒤)")
        sel = blocks[si:ei + 1]
    if xmax is not None:
        sel = [b for b in sel if b[0] < xmax]
        if not sel:
            sys.exit(f"칸 비어 있음: {start!r}~{end!r} xmax={xmax}")
    return (min(b[0] for b in sel), min(b[1] for b in sel), max(b[2] for b in sel), max(b[3] for b in sel))


def render(page, dpi=DPI, clip=None):
    from PIL import Image
    pix = page.get_pixmap(dpi=dpi, alpha=False, clip=clip)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def to_px(rect, scale):
    x0, y0, x1, y1 = rect
    return (round((x0 - PAD_PT) * scale), round((y0 - PAD_PT) * scale), round((x1 + PAD_PT) * scale), round((y1 + PAD_PT) * scale))


def bake(im, boxes):
    from PIL import Image, ImageDraw, ImageFilter
    blurred = im.filter(ImageFilter.GaussianBlur(SIGMA))
    mask = Image.new("L", im.size, 0)
    dr = ImageDraw.Draw(mask)
    for b in boxes:
        dr.rounded_rectangle(b, radius=10, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
    return Image.composite(im, blurred, mask)


def ocr(im):
    if not shutil.which("tesseract"):
        sys.exit("tesseract 없음: 누출 게이트를 잴 수 없다 (brew install tesseract tesseract-lang)")
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "x.png"
        im.save(p)
        r = subprocess.run(["tesseract", str(p), "-", "-l", "kor", "--psm", "6"], capture_output=True, text=True)
        return r.stdout


def leak_gate(name, clean_im, saved_path, boxes_pct, source_text=None):
    """저장된 JPEG(검사 대상)와 선명 렌더(대조군)에서 선명 칸을 흰색으로 지운 뒤 OCR. 한글 글자 비율, 원문 단어 일치 비율."""
    from PIL import Image, ImageDraw

    def mask_out(im):
        im = im.copy()
        dr = ImageDraw.Draw(im)
        W, H = im.size
        for r in boxes_pct:
            dr.rectangle((r["x"] / 100 * W, r["y"] / 100 * H, (r["x"] + r["w"]) / 100 * W, (r["y"] + r["h"]) / 100 * H), fill=(255, 255, 255))
        return im
    test = Image.open(saved_path).convert("RGB")
    ctrl = clean_im.resize(test.size)
    a, b = ocr(mask_out(ctrl)), ocr(mask_out(test))
    ha, hb = HANGUL(a), HANGUL(b)
    wa = {w for w in a.split() if len(HANGUL(w)) >= 2}
    wb = {w for w in b.split() if len(HANGUL(w)) >= 2}
    # tesseract 는 흐린 획에서 무작위 한글을 낸다(09-07 실측 B: 흐린 판 183자인데 원문 단어 0, 원문 2-gram 4.9%). 글자 수는 정보로만 두고
    # 판정은 원문 단어 일치 비율과 원문 2-gram 일치 비율(무작위 바닥 약 5%)로 한다.
    src = re.sub(r"\s+", "", source_text or "")
    hb_s = "".join(hb)
    grams = [hb_s[i:i + 2] for i in range(len(hb_s) - 1)]
    g_hit = sum(1 for g in grams if g in src) if src else 0
    m = dict(control_hangul=len(ha), test_hangul=len(hb), char_ratio=round(len(hb) / max(1, len(ha)), 3),
             control_words=len(wa), matched_words=len(wa & wb), word_ratio=round(len(wa & wb) / max(1, len(wa)), 3),
             bigram_hit=g_hit, bigram_n=len(grams), bigram_ratio=round(g_hit / max(1, len(grams)), 3))
    if m["control_hangul"] < CONTROL_MIN_HANGUL:
        sys.exit(f"{name}: 대조군 OCR 한글 {m['control_hangul']}자 < {CONTROL_MIN_HANGUL} (검출기가 글자를 못 읽는다, 게이트 불신)")
    if m["word_ratio"] > LEAK_WORD_MAX or m["bigram_ratio"] > LEAK_BIGRAM_MAX:
        sys.exit(f"{name}: 누출 게이트 실패 {m} (원문 단어 일치 ≤ {LEAK_WORD_MAX}, 원문 2-gram 일치 ≤ {LEAK_BIGRAM_MAX})")
    return m


def save_jpg(im, path, width=None, quality=82):
    from PIL import Image
    if width and im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    return im.size


def generate(edition):
    import fitz  # pymupdf (pdf_armor venv)
    if edition != S.V24_EDITION and edition != "v24":
        sys.exit(f"edition {edition!r}: 현 원천 해석기는 v24 만 안다 (guidebook_sources.V24_EDITION={S.V24_EDITION})")
    inp = S.v24_inputs(UNIV)
    pdf = inp["clean_pdf"]
    if not pdf.is_file():
        sys.exit(f"v24 clean PDF 없음: {pdf}")
    doc = fitz.open(pdf)
    scale = DPI / 72
    ledger = {"edition": "v24", "univ": UNIV, "pdf": str(pdf), "pdf_sha16": sha16(pdf), "pages": doc.page_count, "dpi": DPI, "sigma": SIGMA,
              "generated": subprocess.run(["date", "+%Y-%m-%dT%H:%M:%S"], capture_output=True, text=True).stdout.strip(), "openers": {}, "samples": {}}
    # 1) 차례, 간지
    for key, anchor, cap in OPENERS:
        pno = None
        for i in range(doc.page_count):
            t = norm(doc[i].get_text())
            if anchor == "차례":
                if t.startswith("차례"):
                    pno = i + 1
                    break
            elif re.search(r"P\s*A\s*R\s*T\s*" + anchor[-1] + r"(?!\d)", t) and len(t) < 600:
                pno = i + 1
                break
        if pno is None:
            sys.exit(f"간지 미검출: {anchor}")
        im = render(doc[pno - 1])
        out = ASSET_DIR / f"gbd_gachon_{key}.jpg"
        w, h = save_jpg(im, out, 720, 80)
        ledger["openers"][key] = {"file": out.name, "page": pno, "cap": cap, "w": w, "h": h, "sha16": sha16(out)}
        print(f"opener {key}: p{pno} -> {out.name} {w}x{h}")
    # 2) 흐림 표본
    for key, v in VARIANTS.items():
        pno = find_page(doc, v["page_anchors"])
        page = doc[pno - 1]
        blocks = blocks_of(page)
        rects = [span_rect(blocks, r[0], r[1], r[3] if len(r) > 3 else None) for r in v["regions"]]
        im = render(page)
        if v["crop"] < 1:
            im = im.crop((0, 0, im.width, round(im.height * v["crop"])))
        boxes = [to_px(r, scale) for r in rects]
        for b in boxes:
            if b[3] > im.height:
                sys.exit(f"{key}: 칸이 자른 면 밖 {b} (crop {v['crop']})")
        baked = bake(im, boxes)
        out = ASSET_DIR / f"gbd_sample_{key}.jpg"
        w, h = save_jpg(baked, out, None if v.get("full") else 1000, 84 if v.get("full") else 82)
        W, H = im.size
        pct = [dict(x=round(b[0] / W * 100, 2), y=round(b[1] / H * 100, 2), w=round((b[2] - b[0]) / W * 100, 2), h=round((b[3] - b[1]) / H * 100, 2), label=lab)
               for b, lab in zip(boxes, [r[2] for r in v["regions"]])]
        leak = leak_gate(key, im, out, pct, page.get_text())
        rec = {"file": out.name, "page": pno, "title": v["title"], "crop": v["crop"], "w": w, "h": h, "regions": pct, "sha16": sha16(out), "leak": leak}
        zi = v.get("zoom")
        if zi is not None:
            zx0, zy0, zx1, zy1 = rects[zi]
            zpad = 4
            zim = render(page, dpi=220, clip=fitz.Rect(zx0 - zpad, zy0 - zpad, zx1 + zpad, zy1 + zpad))
            zout = ASSET_DIR / f"gbd_sample_{key}_zoom.jpg"
            zw, zh = save_jpg(zim, zout, None, 88)
            rec["zoom"] = {"file": zout.name, "region": zi + 1, "w": zw, "h": zh, "sha16": sha16(zout)}
        ledger["samples"][key] = rec
        print(f"sample {key}: p{pno} {len(pct)}칸 -> {out.name} {w}x{h} leak={leak['char_ratio']}/{leak['word_ratio']}")
    REGIONS.write_text(json.dumps(ledger, ensure_ascii=False, indent=1), encoding="utf-8")
    patch_html(ledger)
    print(f"원장 -> {REGIONS}")
    return ledger


# ---------------------------------------------------------------- 지면 갱신
def alt_of(rec, n):
    return f"가천대학교 판 {rec['page']}면{' 상단' if rec['crop'] < 1 else ''}, {rec['title']}. 표시한 {n}칸만 선명하고 나머지는 흐림"


def badges(rec):
    out = []
    for i, r in enumerate(rec["regions"], 1):
        left = min(r["x"] + r["w"] + 2.2, 95)
        top = r["y"] + r["h"] / 2
        out.append(f'<span class="mk" style="left:{left:.2f}%;top:{top:.2f}%" aria-hidden="true">{i}</span>')
    return "".join(out)


def legend(rec):
    return "".join(f'<li><span class="n">{i}</span><p>{r["label"]}</p></li>' for i, r in enumerate(rec["regions"], 1))


def patch_html(ledger):
    s = PAGE_HTML.read_text(encoding="utf-8")
    n = 0
    # 차례, 간지 6장: 옛 이름(gbd_gachon_pN)이든 새 이름이든 <li> 를 통째로 교체
    li_re = re.compile(r'<li class="rv"><img src="\.\./assets/photo/gbd/gbd_gachon_[a-z0-9]+\.jpg"[^>]*><span>[^<]*</span></li>')
    lis = li_re.findall(s)
    if len(lis) != 6:
        sys.exit(f"상품면 차례/간지 <li> 가 6개가 아님: {len(lis)}")
    new_lis = [f'<li class="rv"><img src="../assets/photo/gbd/{o["file"]}" width="360" height="509" alt="{o["cap"]}" loading="lazy" decoding="async"><span>{o["cap"]}</span></li>'
               for _, o in ledger["openers"].items()]
    for old, new in zip(lis, new_lis):
        s = s.replace(old, new, 1)
        n += 1
    for key, rec in ledger["samples"].items():
        img_re = re.compile(rf'(<img src="\.\./assets/photo/gbd/gbd_sample_{key}\.jpg" width=")\d+(" height=")\d+(" alt=")[^"]*(")')
        s, c = img_re.subn(lambda m: f'{m.group(1)}{rec["w"]}{m.group(2)}{rec["h"]}{m.group(3)}{alt_of(rec, len(rec["regions"]))}{m.group(4)}', s)
        if c != 1:
            sys.exit(f"{key}: img 태그 {c}개 (1개여야)")
        n += 1
        bd_re = re.compile(rf'(gbd_sample_{key}\.jpg"[^>]*></a>)((?:<span class="mk"[^>]*>\d</span>)+)')
        s, c = bd_re.subn(lambda m: m.group(1) + badges(rec), s)
        if c != 1:
            sys.exit(f"{key}: 번호 배지 묶음 {c}개 (1개여야)")
        n += 1
        # 범례: img 뒤 첫 <ol ...>...</ol>
        i = s.index(f'gbd_sample_{key}.jpg"')
        j = s.index("<ol", i)
        k = s.index("</ol>", j)
        head = s[j:s.index(">", j) + 1]
        s = s[:j] + head + legend(rec) + s[k:]
        n += 1
        # 캡션 면번호
        if key == "A":
            cap_re = re.compile(r"(<span>판매본 지면 한 면 그대로, 4부 교과학습 규칙 면</span><span>가천대학교 판 )\d+(면</span>)")
            s, c = cap_re.subn(lambda m: f"{m.group(1)}{rec['page']}{m.group(2)}", s)
            if c != 1:
                sys.exit("A: 캡션 면번호 자리 미검출")
            z = rec["zoom"]
            zr = re.compile(r'(<img src="\.\./assets/photo/gbd/gbd_sample_A_zoom\.jpg" width=")\d+(" height=")\d+(")')
            s, c = zr.subn(lambda m: f'{m.group(1)}{z["w"]}{m.group(2)}{z["h"]}{m.group(3)}', s)
            if c != 1:
                sys.exit("A: 확대 img 미검출")
            n += 2
        else:
                # 표본별 캡션은 img 뒤 첫 <span class="cap"> 에 있다
            i = s.index(f'gbd_sample_{key}.jpg"')
            j = s.index('<span class="cap">판매본 지면 그대로. ', i)
            k = s.index("</span>", j)
            old = s[j:k]
            new = f'<span class="cap">판매본 지면 그대로. 가천대학교 판 {rec["page"]}면{" 상단" if rec["crop"] < 1 else ""}, {rec["title"]}. 번호 칸만 원문이고 나머지는 판매본 보호를 위해 흐림'
            s = s[:j] + new + s[k:]
            n += 1
    PAGE_HTML.write_text(s, encoding="utf-8")
    print(f"programs/guidebook.html 갱신 {n}곳")


# ---------------------------------------------------------------- 검사
def check():
    if not REGIONS.exists():
        sys.exit("sample_regions_v24.json 없음: 먼저 --edition v24 로 생성")
    L = json.loads(REGIONS.read_text(encoding="utf-8"))
    fails = []
    pdf = Path(L["pdf"])
    if pdf.is_file():
        if sha16(pdf) != L["pdf_sha16"]:
            fails.append(f"표본 원천 PDF sha 변경: 원장 {L['pdf_sha16']} vs 현재 {sha16(pdf)} ({pdf.name}). 표본 재생성 필요")
    else:
        inp = S.v24_inputs(UNIV)
        if inp and inp["clean_pdf"].is_file() and sha16(inp["clean_pdf"]) != L["pdf_sha16"]:
            fails.append(f"표본 원천 PDF 가 현 판 clean 과 다름: 원장 {L['pdf_sha16']} vs {sha16(inp['clean_pdf'])}")
    s = PAGE_HTML.read_text(encoding="utf-8")
    for key, o in L["openers"].items():
        p = ASSET_DIR / o["file"]
        if not p.is_file() or sha16(p) != o["sha16"]:
            fails.append(f"opener {key}: 파일 없음 또는 sha 불일치 {o['file']}")
        if f'gbd/{o["file"]}" width="360" height="509" alt="{o["cap"]}"' not in s:
            fails.append(f"opener {key}: 지면 참조 불일치 {o['file']}")
    for key, r in L["samples"].items():
        p = ASSET_DIR / r["file"]
        if not p.is_file() or sha16(p) != r["sha16"]:
            fails.append(f"sample {key}: 파일 없음 또는 sha 불일치")
        if f'gbd/{r["file"]}" width="{r["w"]}" height="{r["h"]}" alt="{alt_of(r, len(r["regions"]))}"' not in s:
            fails.append(f"sample {key}: img 참조(크기, alt 면번호) 불일치")
        if badges(r) not in s:
            fails.append(f"sample {key}: 번호 배지 위치 불일치")
        if legend(r) not in s:
            fails.append(f"sample {key}: 범례 불일치")
        if key == "A":
            if f"가천대학교 판 {r['page']}면</span>" not in s:
                fails.append("sample A: 캡션 면번호 불일치")
            z = r["zoom"]
            zp = ASSET_DIR / z["file"]
            if not zp.is_file() or sha16(zp) != z["sha16"]:
                fails.append("sample A: 확대 파일 sha 불일치")
        else:
            if f'가천대학교 판 {r["page"]}면{" 상단" if r["crop"] < 1 else ""}, {r["title"]}. 번호 칸만' not in s:
                fails.append(f"sample {key}: 캡션 면번호/제목 불일치")
    refs = set(re.findall(r"assets/photo/gbd/(gbd_[a-z0-9_]+\.jpg)", s))
    known = {o["file"] for o in L["openers"].values()} | {r["file"] for r in L["samples"].values()} | {r["zoom"]["file"] for r in L["samples"].values() if "zoom" in r} | {"gbd_og.jpg"}
    for f in sorted(refs - known):
        fails.append(f"지면이 원장 밖 표본을 참조: {f}")
    for f in fails:
        print("  FAIL", f)
    print(f"build_samples --check: 표본 {len(L['openers']) + len(L['samples'])}장 + 확대 {sum('zoom' in r for r in L['samples'].values())} / FAIL {len(fails)}건 (v24 PDF {L['pdf_sha16']})")
    if fails:
        sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--edition")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    if a.check:
        check()
    elif a.edition:
        generate(a.edition)
        check()
    else:
        ap.error("--edition v24 또는 --check")


if __name__ == "__main__":
    main()
