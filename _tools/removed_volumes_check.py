#!/usr/bin/env python3
"""비판매 가이드북 완전 제거 검출기 (2026-09-04 건우 지시 "31권 말고 나머지 7권은 아예 내려").

원천 = guidebook_catalog.json 의 onsale=false 집합. 이 집합이 사이트 어느 층(면 파일, 목록 데이터, 홈 선택기, 사이트맵,
RSS, llms, SEO 매니페스트, FAQ 문안, 표지·미리보기 자산)에도 남아 있지 않고 워커 301 표에는 있어야 PASS.
검출기는 빌더와 독립이다(빌더 코드를 import 하지 않고 산출 파일만 읽는다). 사용: python3 _tools/removed_volumes_check.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXPECTED = {"knu", "korea", "skku", "yonsei", "dgist", "pknu", "hongik", "hanyang-erica"}   # 2026-09-04 결재 7권 + 2026-10-26 한양대 ERICA(건우 「그냥 닫아」). 카탈로그와 어긋나면 FAIL
N_SALE = 30

def main():
    cat = json.load(open(ROOT / "_tools/guidebook_catalog.json", encoding="utf-8"))
    off = {e["slug"] for e in cat["items"] if e.get("onsale", True) is False}
    on = [e for e in cat["items"] if e.get("onsale", True)]
    fails = []
    if off != EXPECTED:
        fails.append(f"카탈로그 onsale=false 집합 {sorted(off)} != 결재 집합 {sorted(EXPECTED)}")
    if len(on) != N_SALE:
        fails.append(f"판매 권수 {len(on)} != {N_SALE}")
    # 1 면 파일
    for s in off:
        if (ROOT / f"guidebook/{s}.html").exists():
            fails.append(f"guidebook/{s}.html 존재")
    # 2 목록 데이터 (guidebook/index.html HH_GB) + 준비 중 문안
    gi = (ROOT / "guidebook/index.html").read_text(encoding="utf-8")
    m = re.search(r"var HH_GB=(\[.*?\]);", gi, re.S)
    if not m:
        fails.append("guidebook/index.html HH_GB 없음")
    else:
        slugs = {o["slug"] for o in json.loads(m.group(1))}
        if slugs & off:
            fails.append(f"guidebook/index.html HH_GB 에 제거 대상 {sorted(slugs & off)}")
        if len(slugs) != N_SALE:
            fails.append(f"guidebook/index.html HH_GB {len(slugs)}권 != {N_SALE}")
    if "준비 중" in gi:
        fails.append("guidebook/index.html 에 '준비 중' 잔존")
    # 3 홈 선택기
    hi = (ROOT / "index.html").read_text(encoding="utf-8")
    m = re.search(r"var HH_GB=(\[.*?\]);", hi, re.S)
    if not m:
        fails.append("index.html HH_GB 없음")
    else:
        arr = json.loads(m.group(1))
        slugs = {o["slug"] for o in arr}
        if slugs & off:
            fails.append(f"index.html HH_GB 에 제거 대상 {sorted(slugs & off)}")
        if len(slugs) != N_SALE:
            fails.append(f"index.html HH_GB {len(slugs)}권 != {N_SALE}")
        if any(not o.get("sale", True) for o in arr):
            fails.append("index.html HH_GB 에 sale=false 항목 잔존")
    # 4 색인 산출물
    for rel in ["sitemap.xml", "rss.xml", "llms.txt", "llms-full.txt", "robots.txt"]:
        p = ROOT / rel
        if not p.exists():
            fails.append(f"{rel} 없음"); continue
        t = p.read_text(encoding="utf-8")
        hit = [s for s in off if f"guidebook/{s}.html" in t]
        if hit:
            fails.append(f"{rel} 에 제거 대상 {sorted(hit)}")
    # 2026-10-26: 전체 loc 수 고정(46)은 사이트가 늘며 낡았다. 가이드북 loc = 판매 권수 + 목록 1 로 본다
    sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8") if (ROOT / "sitemap.xml").exists() else ""
    n_gb_loc = len(re.findall(r"<loc>https://hyunhak\.com/guidebook/", sm))
    if n_gb_loc != N_SALE + 1:
        fails.append(f"sitemap 가이드북 loc {n_gb_loc} != {N_SALE + 1} (판매 {N_SALE} + 목록 1)")
    # 5 SEO 매니페스트
    man = json.load(open(ROOT / "_tools/seo_manifest.json", encoding="utf-8"))
    hit = [s for s in off if f"guidebook/{s}.html" in man["pages"]]
    if hit:
        fails.append(f"seo_manifest pages 에 제거 대상 {sorted(hit)}")
    # 6 FAQ 문안
    faq = (ROOT / "faq.html").read_text(encoding="utf-8")
    for needle in ["준비 중인 7권", "38권", "38개 대학 가이드북"]:   # '38개 대학 면접 형태 판정표'는 판정표 대학 수라 정상 (2026-10-26)
        if needle in faq:
            fails.append(f"faq.html 에 '{needle}' 잔존")
    # 7 워커 301 표
    w = (ROOT / "_worker/index.js").read_text(encoding="utf-8")
    miss = [s for s in off if f'"/guidebook/{s}.html"' not in w]
    if miss:
        fails.append(f"_worker/index.js 301 표에 없음 {sorted(miss)}")
    # 7b 정적 면의 잔존 링크 (library 자료실 목록, 스튜디오 면의 가이드북 링크)
    lib = (ROOT / "library.html").read_text(encoding="utf-8")
    hit = [s for s in off if f'data-slug="guide-{s}"' in lib or f"guidebook/{s}.html" in lib or f"assets/covers/{s}.jpg" in lib]
    if hit:
        fails.append(f"library.html 에 제거 대상 {sorted(hit)}")
    for rel in ["programs/korea.html", "programs/yonsei.html", "programs/guidebook.html", "programs/studio.html", "studio.html", "about.html", "notice.html", "support.html"]:
        q = ROOT / rel
        if q.exists():
            hit = [s for s in off if f"guidebook/{s}.html" in q.read_text(encoding="utf-8")]
            if hit:
                fails.append(f"{rel} 에 제거 대상 링크 {sorted(hit)}")
    # 8 자산
    for s in off:
        if (ROOT / f"assets/covers/{s}.jpg").exists():
            fails.append(f"assets/covers/{s}.jpg 존재")
        if (ROOT / f"assets/preview/{s}").exists():
            fails.append(f"assets/preview/{s}/ 존재")
    for f in fails:
        print("FAIL", f)
    print(f"removed_volumes_check: off={len(off)} on={len(on)} fails={len(fails)}")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
