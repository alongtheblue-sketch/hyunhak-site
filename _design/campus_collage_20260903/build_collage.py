#!/usr/bin/env python3
"""캠퍼스 콜라주 재생성 (결정론, 0 크레딧).

옛 assets/photo/campus_collage.jpg 는 38권 시절 표지 JPG 에서 잘라낸 것이라
자사 워터마크 타일이 하늘에 함께 딸려 왔다(확대 시 판독, critic P2).
본 스크립트는 같은 표지의 워터마크 없는 원천(dist_hyunhak_clean PDF 1면)에서
같은 크롭 띠를 다시 떠서 붙인다. 옛 판과의 세로 프로파일 상관 = 연세 0.9883 / 고려 0.9877.
"""
import json, pathlib, subprocess, sys
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SRC = pathlib.Path.home() / "Workspace/interview_guidebook_2027/dist_hyunhak_clean"
OUT = ROOT / "assets/photo/campus_collage.jpg"
W, H, GAP_TOP, GAP_BOT = 1200, 800, 395, 404
SEAM = (241, 235, 221)          # 옛 판 이음선 실측 평균색
# 원천을 폭 1200 으로 맞춘 뒤의 크롭 띠 (옛 판과 상관 최대 지점)
BANDS = [
    ("연세대학교(서울)_2027면접가이드북.pdf", 409, 808, 0,       GAP_TOP),
    ("고려대학교(서울)_2027면접가이드북.pdf", 429, 828, GAP_BOT, H),
]


def main():
    canvas = Image.new("RGB", (W, H), SEAM)
    prov = []
    for pdf_name, y0, y1, dst_top, dst_bot in BANDS:
        pdf = SRC / pdf_name
        if not pdf.exists():
            sys.exit(f"원천 PDF 없음: {pdf}")
        stem = HERE / pathlib.Path(pdf_name).stem
        jpg = pathlib.Path(str(stem) + ".jpg")
        if not jpg.exists():
            subprocess.run(["pdftoppm", "-r", "150", "-f", "1", "-l", "1", "-jpeg",
                            "-jpegopt", "quality=92", "-singlefile", str(pdf), str(stem)], check=True)
        im = Image.open(jpg).convert("RGB")
        im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
        band = im.crop((0, y0, W, y1)).resize((W, dst_bot - dst_top), Image.LANCZOS)
        canvas.paste(band, (0, dst_top))
        prov.append({"pdf": pdf_name, "src_band": [y0, y1], "dst": [dst_top, dst_bot]})
    canvas.save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
    (HERE / "provenance.json").write_text(json.dumps(
        {"out": str(OUT.relative_to(ROOT)), "source_dir": str(SRC), "dpi": 150,
         "bands": prov, "seam_rgb": list(SEAM),
         "note": "워터마크 없는 원천에서만 뜬다. 옛 판(assets/covers/*.jpg, 38권 시절)에서 자르면 타일이 딸려 온다"},
        ensure_ascii=False, indent=2), encoding="utf-8")
    print(OUT, OUT.stat().st_size, "B")


if __name__ == "__main__":
    main()
