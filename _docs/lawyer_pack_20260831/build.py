#!/usr/bin/env python3
"""현학적 연구소 변호사 검토 의뢰 PDF 빌드.
HTML(source.html) -> Pretendard 서브셋 base64 임베드 -> Chrome headless -> 쪽번호 합성.
재현: python3 build.py  (venv: fonttools, pypdf 필요)
"""
import base64, io, re, subprocess, sys, os
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "source.html")
OUT  = os.path.join(HERE, "현학적연구소_약관8조의2_검토의뢰_20260831.html")
PDF  = os.path.join(HERE, "현학적연구소_약관8조의2_검토의뢰_20260831.pdf")
FDIR = "/Users/gregory/Workspace/dna_survey_v2_20260828/fonts"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WEIGHTS = [("Pretendard-Regular.ttf", 400), ("Pretendard-SemiBold.ttf", 600), ("Pretendard-Bold.ttf", 700)]

def visible_text(html):
    body = html.split("<body>", 1)[1]
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", body)
    return t.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")

def subset_b64(path, chars):
    font = TTFont(path)
    cmap = set(font.getBestCmap())
    miss = sorted(c for c in chars if ord(c) not in cmap)
    opts = Options()
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.drop_tables += ["DSIG"]
    ss = Subsetter(options=opts)
    ss.populate(text="".join(sorted(chars)))
    ss.subset(font)
    buf = io.BytesIO()
    font.flavor = None          # 순수 TTF (Chrome 이 CIDFontType2 로 임베드)
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode(), miss

def main():
    html = open(SRC, encoding="utf-8").read()
    chars = set(visible_text(html)) - set(" \n\t")
    chars |= set("0123456789/ ")
    faces, allmiss = [], set()
    for fn, w in WEIGHTS:
        b64, miss = subset_b64(os.path.join(FDIR, fn), chars)
        allmiss |= set(miss)
        faces.append(
            '@font-face{font-family:"PretendardEmb";font-style:normal;font-weight:%d;'
            'src:url(data:font/ttf;base64,%s) format("truetype");}' % (w, b64))
        print(f"  {fn}: base64 {len(b64)/1024:.0f} KB")
    if allmiss:
        print("GLYPH MISSING (FAIL):", "".join(sorted(allmiss)), file=sys.stderr)
        sys.exit(1)
    out = html.replace("/*FONTFACE*/", "\n".join(faces))
    open(OUT, "w", encoding="utf-8").write(out)
    print(f"html: {os.path.getsize(OUT)/1024:.0f} KB")

    raw = os.path.join(HERE, "_raw.pdf")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
                    f"--print-to-pdf={raw}", "--no-pdf-header-footer",
                    "--virtual-time-budget=5000", "file://" + OUT],
                   check=True, capture_output=True)

    from pypdf import PdfReader, PdfWriter
    n = len(PdfReader(raw).pages)
    rows = "\n".join(f'<div class="pg"><span class="num">{i} / {n}</span></div>' for i in range(1, n + 1))
    numhtml = os.path.join(HERE, "_pagenum.html")
    open(numhtml, "w", encoding="utf-8").write(
        '<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>'
        + "\n".join(faces) +
        '@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}'
        '.pg{position:relative;width:210mm;height:296.9mm;break-after:page}'
        '.pg:last-child{break-after:auto}'
        '.num{position:absolute;bottom:12mm;left:0;right:0;text-align:center;'
        'font-family:"PretendardEmb";font-weight:400;font-size:8.5pt;color:#666}'
        f'</style></head><body>{rows}</body></html>')
    numpdf = os.path.join(HERE, "_pagenum.pdf")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
                    f"--print-to-pdf={numpdf}", "--no-pdf-header-footer",
                    "--virtual-time-budget=2000", "file://" + numhtml],
                   check=True, capture_output=True)

    base, num = PdfReader(raw), PdfReader(numpdf)
    w = PdfWriter()
    for bp, np_ in zip(base.pages, num.pages):
        bp.merge_page(np_); w.add_page(bp)
    w.add_metadata({"/Title": "변호사 검토 의뢰서 — 이용약관 제8조의2 정지 시 정산 조항 개정안",
                    "/Author": "현학적 연구소 (담당 현건우)",
                    "/Subject": "자문준비용 검토 의뢰 (2026-08-31)",
                    "/Creator": "hyunhak doc-publisher (HTML-first / Chrome headless)"})
    with open(PDF, "wb") as f:
        w.write(f)
    print(f"pdf: {n} pages, {os.path.getsize(PDF)/1024:.0f} KB -> {PDF}")

if __name__ == "__main__":
    main()
