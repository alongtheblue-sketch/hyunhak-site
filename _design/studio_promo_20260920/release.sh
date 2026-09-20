#!/bin/zsh
# 릴리스 사본 생성. 사용: ./release.sh r3 dirG [dirI]   (3번째 인자 = 스토리 방향, 생략 시 2번째와 같음)
# 산출 = ~/Desktop/디자인_산출/현학적연구소_면접스튜디오_홍보물_20260920/ (라우터 §6 기타 도메인 경로)
set -eu
ROUND="${1:?round}"; DIR="${2:?dir}"; SDIR="${3:-$DIR}"
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
SRC="$ROUND/render"; DEST="$HOME/Desktop/디자인_산출/현학적연구소_면접스튜디오_홍보물_20260920"
mkdir -p "$DEST/_시안_r1_3방향" "$DEST/_소스"

cp "$SRC/${SDIR}_story.png"        "$DEST/인스타스토리_면접스튜디오_1080x1920.png"
cp "$SRC/${SDIR}_story@2x.png"     "$DEST/인스타스토리_면접스튜디오_2160x3840.png"
magick "$SRC/${SDIR}_story.png" -quality 92 -colorspace sRGB "$DEST/인스타스토리_면접스튜디오_1080x1920.jpg"
if [ -f "$SRC/${SDIR}_story_promo.png" ]; then
  cp "$SRC/${SDIR}_story_promo.png" "$DEST/인스타스토리_면접스튜디오_할인문구_1080x1920.png"
  magick "$SRC/${SDIR}_story_promo.png" -quality 92 -colorspace sRGB "$DEST/인스타스토리_면접스튜디오_할인문구_1080x1920.jpg"
fi
cp "$SRC/${DIR}_brochure.pdf"     "$DEST/브로슈어_면접스튜디오_A4_2면_216x303_블리드3mm.pdf"
cp "$SRC/${DIR}_brochure_p-1.png" "$DEST/브로슈어_미리보기_1면.png"
cp "$SRC/${DIR}_brochure_p-2.png" "$DEST/브로슈어_미리보기_2면.png"
# 인쇄소 입고용(블리드 포함)과 별도로, 화면 공유용 A4 트림판 (블리드 3mm 를 CropBox/TrimBox 로 제거). pypdf 는 uv 임시 환경으로 빌린다
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy \
uv run --quiet --with pypdf python3 - "$SRC/${DIR}_brochure.pdf" "$DEST/브로슈어_면접스튜디오_A4_트림_화면공유용.pdf" <<'EOF'
import sys
from pypdf import PdfReader, PdfWriter
r=PdfReader(sys.argv[1]); w=PdfWriter()
b=3/25.4*72
for p in r.pages:
    mb=p.mediabox
    p.cropbox.lower_left=(float(mb.left)+b, float(mb.bottom)+b)
    p.cropbox.upper_right=(float(mb.right)-b, float(mb.top)-b)
    p.trimbox.lower_left=p.cropbox.lower_left; p.trimbox.upper_right=p.cropbox.upper_right
    w.add_page(p)
w.write(sys.argv[2]); print("trim pdf ok")
EOF

cp r1/render/story_sheet_r1.png       "$DEST/_시안_r1_3방향/스토리_3안.png"
cp r1/render/brochure_p1_sheet_r1.png "$DEST/_시안_r1_3방향/브로슈어_1면_3안.png"
cp r1/render/brochure_p2_sheet_r1.png "$DEST/_시안_r1_3방향/브로슈어_2면_3안.png"
# r3 (디자이너 Fable 재설계) 3방향 시트. 시트 파일이 있을 때만
if [ -f "$ROUND/render/story_sheet_${ROUND}.png" ]; then
  mkdir -p "$DEST/_시안_${ROUND}_3방향"
  cp "$ROUND/render/story_sheet_${ROUND}.png"       "$DEST/_시안_${ROUND}_3방향/스토리_3안.png"
  cp "$ROUND/render/brochure_p1_sheet_${ROUND}.png" "$DEST/_시안_${ROUND}_3방향/브로슈어_1면_3안.png"
  cp "$ROUND/render/brochure_p2_sheet_${ROUND}.png" "$DEST/_시안_${ROUND}_3방향/브로슈어_2면_3안.png"
fi
[ -f build_r3.py ] && cp build_r3.py "$DEST/_소스/"
cp "$ROUND/$DIR/brochure.html" "$DEST/_소스/brochure_${DIR}.html"; cp "$ROUND/$DIR/style.css" "$DEST/_소스/style_${DIR}.css"
cp "$ROUND/$SDIR/story.html" "$DEST/_소스/story_${SDIR}.html"; cp "$ROUND/$SDIR/style.css" "$DEST/_소스/style_${SDIR}.css"
[ -f "$ROUND/$SDIR/story_promo.html" ] && cp "$ROUND/$SDIR/story_promo.html" "$DEST/_소스/story_promo_${SDIR}.html"
[ -f "$ROUND/DESIGN_NOTES.md" ] && cp "$ROUND/DESIGN_NOTES.md" "$DEST/_소스/"
cp "$SRC/report.json" "$DEST/_소스/gate_report_${ROUND}.json"

cd "$DEST" && find . -type f -not -name "MANIFEST.sha256" -not -name ".DS_Store" | sort | xargs shasum -a 256 > MANIFEST.sha256
echo "release -> $DEST"; ls -la "$DEST" | awk '{print $5, $9}'
