#!/usr/bin/env python3
"""판매본 지면 표본 제작기: 한 면을 렌더해 지정한 칸만 선명하게 두고 나머지를 가우시안 블러로 굽는다.

블러는 CSS 가 아니라 픽셀에 굽는다. CSS filter 는 개발자도구에서 지우면 원문이 그대로 보이기 때문.
산출 = pages/sample_<본>.jpg + build/sample_regions.json (칸 좌표 % , HTML 배지 위치용) + OCR 누출 실측.

실행:  ~/Workspace/pdf_armor/.venv/bin/python build/make_sample_page.py [A|B|C|all]
의존:  pymupdf, Pillow, tesseract(kor) CLI  — 누출 실측용. tesseract 가 없으면 실측은 건너뛰고 표시한다.
"""
import json, pathlib, shutil, subprocess, sys, tempfile

import fitz  # pymupdf
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF = pathlib.Path('/Users/gregory/Documents/Codex/2026-08-27/chatgpt-docs-prompts-p6src-1-standalone/work/'
                   'dist_hyunhak_clean_s17_2027_f08035c2650d/가천대학교_2027면접가이드북.pdf')
DPI = 150
SIGMA = 7          # 150dpi 기준. 9pt 본문 x-height 약 9px 이라 sigma 7 이면 획이 남지 않는다
PAD_PT = 7         # 선명 칸을 텍스트 bbox 보다 넓혀 잡는 여백 (pt)
FEATHER = 3        # 선명 칸 가장자리 페더 (px)

# 본 정의. rect 는 PDF pt (x0, y0, x1, y1). 가천 판 s17 clean 34면 기준.
VARIANTS = {
    'A': dict(page=18, title='4부 교과학습 규칙 면', zoom=(42.5, 436.9, 262.0, 546.2), regions=[
        dict(rect=(42.5, 43.6, 430.0, 170.7), label='영역 이름과 규칙 한 건. 언제, 질문 틀, 꼬리질문, 평가 축'),
        dict(rect=(42.5, 436.9, 430.0, 546.2), label='실험 기재가 있을 때의 규칙. 4부 표본으로 든 그 규칙'),
    ]),
    'B': dict(page=14, title='3부 실제로 나온 질문 면', zoom=(42.5, 493.7, 362.0, 558.9), regions=[
        dict(rect=(42.5, 149.4, 320.0, 214.6), label='유형 이름과 질문. 끝의 작은 글씨가 모집단위와 연도'),
        dict(rect=(42.5, 493.7, 360.0, 558.9), label='전공지식확인 91건, 17.9%. 첫 두 질문'),
        dict(rect=(42.5, 662.9, 270.0, 675.3), label='한 줄 질문. 전자공학과, 2021년'),
    ]),
    'C': dict(page=31, title='5부 준비 전략 면', zoom=(72.0, 488.9, 520.0, 557.4), regions=[
        dict(rect=(42.5, 106.8, 270.0, 122.9), label='절 제목'),
        dict(rect=(72.0, 488.9, 520.0, 557.4), label='40초 답변 훈련. 근거가 붙은 행동 한 줄'),
        dict(rect=(72.0, 671.2, 520.0, 757.0), label='꼬리질문 2단 대비. 확인된 꼬리 15건에서 나온 규칙'),
    ]),
}

HANGUL = lambda s: [c for c in s if '가' <= c <= '힣']


def render(page):
    pix = page.get_pixmap(dpi=DPI, alpha=False)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)


def to_px(rect, scale):
    x0, y0, x1, y1 = rect
    return (round((x0 - PAD_PT) * scale), round((y0 - PAD_PT) * scale),
            round((x1 + PAD_PT) * scale), round((y1 + PAD_PT) * scale))


def bake(im, boxes):
    """boxes 안은 원본, 밖은 블러. 마스크 가장자리는 페더."""
    blurred = im.filter(ImageFilter.GaussianBlur(SIGMA))
    mask = Image.new('L', im.size, 0)
    dr = ImageDraw.Draw(mask)
    for b in boxes:
        dr.rounded_rectangle(b, radius=10, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
    return Image.composite(im, blurred, mask), blurred


def ocr(im):
    if not shutil.which('tesseract'):
        return None
    with tempfile.TemporaryDirectory() as td:
        p = pathlib.Path(td) / 'x.png'
        im.save(p)
        r = subprocess.run(['tesseract', str(p), '-', '-l', 'kor', '--psm', '6'], capture_output=True, text=True)
        return r.stdout


def leak(im_clean, im_test, boxes):
    """선명 칸을 흰색으로 지운 뒤 OCR. 흐린 판에서 살아남은 한글 글자 비율 + 원문 단어 일치 비율."""
    def mask_out(im):
        im = im.copy()
        dr = ImageDraw.Draw(im)
        for b in boxes:
            dr.rectangle(b, fill=(255, 255, 255))
        return im
    a, b = ocr(mask_out(im_clean)), ocr(mask_out(im_test))
    if a is None:
        return dict(skipped='tesseract 없음')
    ha, hb = HANGUL(a), HANGUL(b)
    wa = {w for w in a.split() if len(HANGUL(w)) >= 2}
    wb = {w for w in b.split() if len(HANGUL(w)) >= 2}
    return dict(clean_hangul=len(ha), test_hangul=len(hb),
                char_ratio=round(len(hb) / max(1, len(ha)), 3),
                clean_words=len(wa), test_words_matched=len(wa & wb),
                word_ratio=round(len(wa & wb) / max(1, len(wa)), 3))


def make(key):
    v = VARIANTS[key]
    doc = fitz.open(PDF)
    page = doc[v['page'] - 1]
    im = render(page)
    scale = DPI / 72
    boxes = [to_px(r['rect'], scale) for r in v['regions']]
    baked, blurred = bake(im, boxes)
    out = ROOT / 'pages' / f'sample_{key}_p{v["page"]}.jpg'
    baked.save(out, 'JPEG', quality=84, optimize=True, progressive=True)
    W, H = im.size
    # 확대 칸: 선명 칸 안쪽(PAD 보다 작은 여백)만 PDF 에서 직접 렌더. 흐림 구역이 섞이지 않는다.
    zx0, zy0, zx1, zy1 = v['zoom']
    zpad = 4
    clip = fitz.Rect(zx0 - zpad, zy0 - zpad, zx1 + zpad, zy1 + zpad)
    zpix = page.get_pixmap(dpi=220, clip=clip, alpha=False)
    zim = Image.frombytes('RGB', (zpix.width, zpix.height), zpix.samples)
    zout = ROOT / 'pages' / f'sample_{key}_zoom.jpg'
    zim.save(zout, 'JPEG', quality=88, optimize=True, progressive=True)
    pct = [dict(x=round(b[0] / W * 100, 2), y=round(b[1] / H * 100, 2),
                w=round((b[2] - b[0]) / W * 100, 2), h=round((b[3] - b[1]) / H * 100, 2),
                label=r['label']) for b, r in zip(boxes, v['regions'])]
    # 누출 실측: 흐린 판(검사 대상) + 원본(양성 대조군, 검출기가 글자를 읽을 수 있음을 증명)
    m_blur = leak(im, blurred, boxes)
    m_ctrl = leak(im, im, boxes)
    meta = dict(variant=key, page=v['page'], title=v['title'], file=str(out.relative_to(ROOT)),
                size=[W, H], dpi=DPI, sigma=SIGMA, regions=pct,
                zoom=dict(file=str(zout.relative_to(ROOT)), size=list(zim.size), rect_pt=list(v['zoom'])),
                leak_blurred=m_blur, leak_control_unblurred=m_ctrl)
    print(json.dumps(meta, ensure_ascii=False, indent=1))
    return meta


if __name__ == '__main__':
    keys = sys.argv[1:] or ['all']
    if keys == ['all']:
        keys = list(VARIANTS)
    metas = {k: make(k) for k in keys}
    reg = ROOT / 'build' / 'sample_regions.json'
    old = json.loads(reg.read_text()) if reg.exists() else {}
    old.update(metas)
    reg.write_text(json.dumps(old, ensure_ascii=False, indent=1))
    print('regions ->', reg)
