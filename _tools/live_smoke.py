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
    # 홈 마커 = 플랫폼 v2 (2026-08-26). 구 전람 v1 마커(heroFilm, 3400ms)는 폐기
    for needle in ['<body class="v2">', "og_aigen.jpg", 'id="tiles"', "assets/covers/snu.jpg"]:
        ok = needle in t
        print(f"home {'ok' if ok else 'MISSING'} {needle}")
        if not ok:
            fails.append(f"home missing {needle}")
    if "__SEALMS__" in t:
        fails.append("home __SEALMS__ residual")
    print(f"home 15권잔존={'15권' in t}")
    if "15권" in t:
        fails.append("home 15권 잔존")
    s, b = get(SITE + "/guidebook/snu.html"); t = b.decode("utf-8", "ignore")
    print(f"guidebook/snu {s} 33,000={'33,000' in t} 구가격16,500={'16,500' in t} 29,000={'29,000' in t} 담기={'data-cart-price' in t}")
    if s != 200 or "33,000" not in t or "29,000" in t or "16,500" in t:
        fails.append("guidebook price")
    forbidden = {
        "출처:": "출처 표기",
        "실제 나온 질문": "구 질문 문구",
        'class="facts"': "통계 facts",
    }
    for needle, label in forbidden.items():
        print(f"guidebook/snu {label}잔존={needle in t}")
        if needle in t:
            fails.append(f"guidebook/snu {label} 잔존")
    page_stat = bool(re.search(r"\d+면,", t))
    print(f"guidebook/snu 면수통계잔존={page_stat}")
    if page_stat:
        fails.append("guidebook/snu N면, 잔존")
    # 2026-08-27 go-live 후 세계: 전권 38 onsale (ajou 포함), 푸터 = 래스터 사업자 정보
    s, b = get(SITE + "/guidebook/ajou.html"); t = b.decode("utf-8", "ignore")
    ok_cart = 'data-cart-sku="guide-ajou"' in t
    print(f"guidebook/ajou {s} 담기버튼={ok_cart} 준비중잔존={'준비 중' in t}")
    if s != 200 or not ok_cart:
        fails.append("guidebook/ajou onsale 아님")
    s, _b = get(SITE + "/assets/bizinfo.png")
    print(f"asset {s} /assets/bizinfo.png")
    if s != 200:
        fails.append(f"asset {s} bizinfo.png")
    if "정식 오픈 전 기재" in t:
        fails.append("placeholder 잔존 (ajou)")
    for ep in ["/api/health", "/api/notices/active", "/api/notices?kind=notice&limit=3", "/api/products", "/api/library"]:
        s, b = get(API + ep)
        print(f"api {s} {ep} {b[:80]!r}")
        if s != 200:
            fails.append(f"api {s} {ep}")
    import json as _json
    s, b = get(API + "/api/products")
    if s == 200:
        prods = _json.loads(b)
        if isinstance(prods, dict):
            prods = prods.get("products", [])
        by = {p.get("sku"): p for p in prods}
        # guide- 접두는 기본 38 + 소장판 -pdf 38 + 번들 2 = 78 이라 전부 세면 38 단언이 상시 거짓 FAIL.
        # 세는 대상은 학교별 기본 상품만 (2026-08-31 정정)
        n_guide = sum(1 for p in prods if str(p.get("sku", "")).startswith("guide-")
                      and not str(p.get("sku", "")).endswith("-pdf")
                      and not str(p.get("sku", "")).startswith("guide-all"))
        # 2026-09-03: 단위 전권 5종 495,000 (인강 포함), 공통 풀이 인강 220,000. 가이드북은 31권 판매 (7권 비활성, s32)
        n_pass = sum(1 for p in prods if str(p.get("sku", "")).startswith("pass-") and p.get("price") == 495000)
        print(f"products guide={n_guide} pass495k={n_pass} passage={by.get('passage-single', {}).get('price')} lecture={by.get('lecture-common', {}).get('price')}")
        if n_guide != 31: fails.append(f"guide active {n_guide} != 31")
        if n_pass != 5: fails.append(f"pass 495,000 {n_pass} != 5")
        if by.get("lecture-common", {}).get("price") != 220000: fails.append("lecture-common 220,000 아님")
        if by.get("passage-single", {}).get("price") != 33000: fails.append("passage-single 33,000 아님")
    print("FAIL" if fails else "PASS", fails)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
