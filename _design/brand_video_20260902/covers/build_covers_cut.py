#!/usr/bin/env python3
"""C3 실물 표지 컷 빌더 (0 크레딧, 결정론). 승인판 가이드북 PDF 1면을 200dpi 로 렌더해 楮紙 위에서 좌에서 우로 느리게 흐르게 한다.

- 원천 = ~/Workspace/interview_guidebook_2027/dist_hyunhak_clean/<catalog.file> (라이브 assets/covers 와 같은 판, 72dpi 대조 평균차 4.6)
- 8권 선택 = 아래 PICK 이름을 _tools/guidebook_catalog.json 에서 찾고, 없으면 카탈로그 순으로 채운다.
- 산출 covers_cut.html 은 window.seek(t) 로 프레임을 결정론적으로 세팅한다(선형 팬, 12초).
"""
import json, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CATALOG = ROOT / "_tools" / "guidebook_catalog.json"
SRC = pathlib.Path.home() / "Workspace/interview_guidebook_2027/dist_hyunhak_clean"
OUT_IMG = HERE / "covers_200"
# 판매 중인 31권에서만 고른다(2026-09-03 GS-14a 결재: 미판매 7권이 띠를 지나가 구매 가능으로 오인).
# 홈 히어로 승인 표지(서울·이화·경희·부산·중앙)를 앞에 두고 3권을 잇는다.
PICK = ["서울대학교", "이화여자대학교", "경희대학교", "부산대학교", "중앙대학교", "한국외국어대학교", "서울시립대학교", "인하대학교"]
STAGE_W, STAGE_H = 1920, 1080
COVER_H = 540   # 09-03: 아래 370px 를 타이틀 층 자리로 비운다(표제가 표지 하단 색 블록과 겹치던 결함)
GAP = 36
MARGIN = 60
PAPER, INK = "#EFE9DC", "#312E2E"


def main():
    cat = json.load(open(CATALOG, encoding="utf-8"))
    if isinstance(cat, list):
        items = cat
    elif isinstance(cat.get("items"), list):
        items = cat["items"]
    else:
        items = [v for v in cat.values() if isinstance(v, dict) and "name" in v]
    onsale = [it for it in items if it.get("onsale") is not False]
    if len(onsale) != 31:
        sys.exit(f"판매 목록이 31권이 아니다: {len(onsale)}권. 카탈로그 onsale 을 먼저 확인하라")
    items = onsale
    chosen, missing = [], []
    for n in PICK:
        key = n.replace("학교", "")
        hit = next((it for it in items if key in it["name"] and it not in chosen), None)
        (chosen.append(hit) if hit else missing.append(n))
    for it in items:
        if len(chosen) >= 8:
            break
        if it not in chosen:
            chosen.append(it)
    if len(chosen) != 8:
        sys.exit(f"표지 8권을 못 채웠다: {len(chosen)}권")
    off = [it["name"] for it in chosen if it.get("onsale") is False]
    if off:
        sys.exit(f"미판매 표지가 띠에 들어갔다: {off}")
    OUT_IMG.mkdir(exist_ok=True)
    sizes = []
    for it in chosen:
        pdf = SRC / it["file"]
        if not pdf.exists():
            sys.exit(f"PDF 없음: {pdf}")
        stem = OUT_IMG / it["slug"]
        jpg = pathlib.Path(str(stem) + ".jpg")
        if not jpg.exists():
            subprocess.run(["pdftoppm", "-r", "200", "-f", "1", "-l", "1", "-jpeg", "-jpegopt", "quality=92", "-singlefile", str(pdf), str(stem)], check=True)
        from PIL import Image
        w, h = Image.open(jpg).size
        sizes.append((it["slug"], w, h))
    cover_w = round(COVER_H * sizes[0][1] / sizes[0][2])
    strip_w = len(chosen) * cover_w + (len(chosen) - 1) * GAP
    x_start = MARGIN
    x_end = STAGE_W - MARGIN - strip_w
    top = 150   # 띠 150~690, 아래 여백 390
    imgs = "".join(f'<img src="covers_200/{s}.jpg" alt="" style="width:{cover_w}px;height:{COVER_H}px">' for s, _, _ in sizes)
    html = f'''<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>covers cut C3</title>
<style>
html,body{{margin:0;width:{STAGE_W}px;height:{STAGE_H}px;overflow:hidden;background:{PAPER}}}
#stage{{position:relative;width:{STAGE_W}px;height:{STAGE_H}px;background:{PAPER}}}
#strip{{position:absolute;top:{top:.1f}px;left:{x_start}px;display:flex;gap:{GAP}px;will-change:transform}}
#strip img{{display:block;object-fit:cover;outline:1px solid rgba(49,46,46,.18);outline-offset:-1px}}
*{{transition:none!important;animation:none!important}}
</style></head><body><div id="stage"><div id="strip">{imgs}</div></div>
<script>
const X0={x_start}, X1={x_end}, SEC=11.4;  // 팬은 11.4초에 끝나고 0.6초 정지(xfade 0.5s 가 시작될 때 마지막 표지가 이미 온전히 들어와 있도록, 09-03)
window.seek=function(t){{
  const u=Math.min(1,Math.max(0,t/SEC));
  const x=X0+(X1-X0)*u;
  document.getElementById('strip').style.transform='translateX('+(x-X0).toFixed(2)+'px)';
  document.title='t='+t; return true;
}};
window.seek(0);
</script></body></html>'''
    (HERE / "covers_cut.html").write_text(html, encoding="utf-8")
    prov = {"chosen": [s for s, _, _ in sizes], "missing_pick": missing, "cover_px": [cover_w, COVER_H], "strip_w": strip_w,
            "pan_px": x_start - x_end, "px_per_sec": round((x_start - x_end) / 12, 1), "source_dir": str(SRC), "dpi": 200}
    (HERE / "provenance.json").write_text(json.dumps(prov, ensure_ascii=False, indent=2))
    print(json.dumps(prov, ensure_ascii=False))


if __name__ == "__main__":
    main()
