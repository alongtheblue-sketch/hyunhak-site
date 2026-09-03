#!/usr/bin/env python3
"""현학적 연구소 법률 문서 PDF 빌드 (2026-09-04 묶음). 08-31 build.py 승계, 문서 2종 범용화.
source_*.html(본문, <!--STYLE--> 자리) -> style_frag.css + Pretendard 서브셋 base64 임베드 -> Chrome headless -> 쪽번호 합성.
재현: ~/Workspace/openwebui/.venv/bin/python build.py   (fonttools, pypdf)
"""
import base64, io, re, subprocess, sys, os
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

HERE = os.path.dirname(os.path.abspath(__file__))
FDIR = "/Users/gregory/Workspace/dna_survey_v2_20260828/fonts"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WEIGHTS = [("Pretendard-Regular.ttf", 400), ("Pretendard-SemiBold.ttf", 600), ("Pretendard-Bold.ttf", 700)]
DOCS = [
    ("source_review.html", "현학적연구소_약관개정_학원법_실증_검토의뢰_20260904",
     "변호사 검토 의뢰서: 이용약관 제6조 제1항과 제8조 개정안, 학원법 등록 대상성, 표시광고 실증"),
    ("source_inquiry.html", "현학적연구소_교육지원청_유권해석_질의서_20260904",
     "학원법 원격 교습 등록 대상성 서면 유권해석 질의서 (초안, 변호사 확인 뒤 발송)"),
]

def visible_text(html):
    body = html.split("<body>", 1)[1]
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", body)
    return t.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")

def subset_b64(path, chars):
    font = TTFont(path)
    cmap = set(font.getBestCmap())
    miss = sorted(c for c in chars if ord(c) not in cmap)
    opts = Options(); opts.layout_features = ["*"]; opts.name_IDs = ["*"]; opts.notdef_outline = True
    opts.drop_tables += ["DSIG"]
    ss = Subsetter(options=opts); ss.populate(text="".join(sorted(chars))); ss.subset(font)
    buf = io.BytesIO(); font.flavor = None; font.save(buf)
    return base64.b64encode(buf.getvalue()).decode(), miss

def chrome_pdf(html_path, pdf_path, budget):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", f"--print-to-pdf={pdf_path}",
                    "--no-pdf-header-footer", f"--virtual-time-budget={budget}", "file://" + html_path],
                   check=True, capture_output=True)

def build(src, stem, title):
    from pypdf import PdfReader, PdfWriter
    html = open(os.path.join(HERE, src), encoding="utf-8").read()
    style = open(os.path.join(HERE, "style_frag.css"), encoding="utf-8").read()
    assert "<!--STYLE-->" in html and "/*FONTFACE*/" in style
    chars = set(visible_text(html)) - set(" \n\t"); chars |= set("0123456789/ ")
    faces, allmiss = [], set()
    for fn, w in WEIGHTS:
        b64, miss = subset_b64(os.path.join(FDIR, fn), chars); allmiss |= set(miss)
        faces.append('@font-face{font-family:"PretendardEmb";font-style:normal;font-weight:%d;src:url(data:font/ttf;base64,%s) format("truetype");}' % (w, b64))
    if allmiss:
        print("GLYPH MISSING (FAIL):", "".join(sorted(allmiss)), file=sys.stderr); sys.exit(1)
    out_html = os.path.join(HERE, stem + ".html"); out_pdf = os.path.join(HERE, stem + ".pdf")
    open(out_html, "w", encoding="utf-8").write(html.replace("<!--STYLE-->", "<style>" + style.replace("/*FONTFACE*/", "\n".join(faces)) + "</style>"))
    raw = os.path.join(HERE, "_raw.pdf"); chrome_pdf(out_html, raw, 5000)
    n = len(PdfReader(raw).pages)
    rows = "\n".join(f'<div class="pg"><span class="num">{i} / {n}</span></div>' for i in range(1, n + 1))
    numhtml = os.path.join(HERE, "_pagenum.html")
    open(numhtml, "w", encoding="utf-8").write(
        '<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>' + "\n".join(faces) +
        '@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}.pg{position:relative;width:210mm;height:296.9mm;break-after:page}'
        '.pg:last-child{break-after:auto}.num{position:absolute;bottom:12mm;left:0;right:0;text-align:center;font-family:"PretendardEmb";font-weight:400;font-size:8.5pt;color:#666}'
        f'</style></head><body>{rows}</body></html>')
    numpdf = os.path.join(HERE, "_pagenum.pdf"); chrome_pdf(numhtml, numpdf, 2000)
    base, num = PdfReader(raw), PdfReader(numpdf); w = PdfWriter()
    for bp, np_ in zip(base.pages, num.pages): bp.merge_page(np_); w.add_page(bp)
    w.add_metadata({"/Title": title, "/Author": "현학적 연구소 (담당 현건우)", "/Subject": "자문준비용 (2026-09-04)",
                    "/Creator": "hyunhak doc-publisher (HTML-first / Chrome headless)"})
    with open(out_pdf, "wb") as f: w.write(f)
    for t in (raw, numhtml, numpdf): os.remove(t)
    print(f"{stem}: html {os.path.getsize(out_html)/1024:.0f} KB, pdf {n} 면 {os.path.getsize(out_pdf)/1024:.0f} KB")

if __name__ == "__main__":
    for src, stem, title in DOCS: build(src, stem, title)
