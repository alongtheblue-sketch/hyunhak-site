#!/usr/bin/env python3
"""배포 후 라이브 스모크: sitemap 전 URL 200 + 핵심 자산 + API 공개 엔드포인트 + 가격 표기.
사용: python3 _tools/live_smoke.py [--expect-commit <sha7>]
"""
import re, sys, urllib.request, concurrent.futures as cf

SITE = "https://hyunhak.com"
API = "https://api.hyunhak.com"


def get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "hyunhak-smoke/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception as e:
        return -1, str(e).encode()


def main():
    fails = []
    st, body = get(SITE + "/sitemap.xml")
    urls = re.findall(r"<loc>(.*?)</loc>", body.decode("utf-8", "ignore")) if st == 200 else []
    print(f"sitemap {st} urls={len(urls)}")
    if not urls:
        fails.append("sitemap")
    with cf.ThreadPoolExecutor(12) as ex:
        for u, (s, _) in zip(urls, ex.map(lambda u: get(u), urls)):
            if s != 200:
                fails.append(f"{s} {u}")
    print(f"pages 200: {len(urls) - sum(1 for f in fails if f[:3].strip().isdigit() or f.startswith('-1'))}/{len(urls)}")
    for a in ["/assets/video/hero_loop_aigen.mp4", "/assets/video/hero_loop_aigen.webm",
              "/assets/photo/hero_poster_aigen.jpg", "/assets/photo/og_aigen.jpg", "/assets/photo/bg_guidebook_aigen.jpg",
              "/insta.html", "/llms.txt", "/robots.txt"]:
        s, _ = get(SITE + a)
        print(f"asset {s} {a}")
        if s != 200:
            fails.append(f"asset {s} {a}")
    s, b = get(SITE + "/")
    t = b.decode("utf-8", "ignore")
    for needle in ['id="heroFilm"', "og_aigen.jpg", "3400ms"]:
        ok = needle in t
        print(f"home {'ok' if ok else 'MISSING'} {needle}")
        if not ok:
            fails.append(f"home missing {needle}")
    if "__SEALMS__" in t:
        fails.append("home __SEALMS__ residual")
    s, b = get(SITE + "/guidebook/snu.html"); t = b.decode("utf-8", "ignore")
    print(f"guidebook/snu {s} 16,500={'16,500' in t} 29,000={'29,000' in t} 담기={'data-cart-price' in t}")
    if s != 200 or "16,500" not in t or "29,000" in t:
        fails.append("guidebook price")
    s, b = get(SITE + "/guidebook/ajou.html"); t = b.decode("utf-8", "ignore")
    print(f"guidebook/ajou {s} 준비중={'준비 중' in t} 담기버튼={'data-cart-sku=\"guide-ajou\"' in t}")
    for ep in ["/api/health", "/api/notices/active", "/api/notices?kind=notice&limit=3", "/api/products", "/api/library"]:
        s, b = get(API + ep)
        print(f"api {s} {ep} {b[:80]!r}")
        if s != 200:
            fails.append(f"api {s} {ep}")
    print("FAIL" if fails else "PASS", fails)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
