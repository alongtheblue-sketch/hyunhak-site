#!/usr/bin/env python3
"""IndexNow 핑 (Bing, 네이버 등 IndexNow 참여 엔진). sitemap.xml 의 loc 전부를 한 번에 제출한다.
키 = _tools/indexnow_key.txt, 키 파일 = 사이트 루트 <key>.txt (배포 자산에 포함).
사용: python3 _tools/indexnow_ping.py [--dry-run]
"""
import json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = "hyunhak.com"

def main():
    key = open(os.path.join(ROOT, "_tools", "indexnow_key.txt"), encoding="utf-8").read().strip()
    if not os.path.exists(os.path.join(ROOT, key + ".txt")):
        sys.exit(f"키 파일 없음: {key}.txt")
    sm = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    urls = re.findall(r"<loc>\s*(.*?)\s*</loc>", sm)
    if not urls:
        sys.exit("sitemap loc 0건")
    body = {"host": HOST, "key": key, "keyLocation": f"https://{HOST}/{key}.txt", "urlList": urls[:10000]}
    if "--dry-run" in sys.argv:
        print(f"dry-run: {len(urls)} urls"); return
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json; charset=utf-8"}, method="POST")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(req, timeout=20) as r:
            print(f"indexnow {r.status} ({len(urls)} urls)")
    except urllib.error.HTTPError as e:
        print(f"indexnow HTTP {e.code}: {e.read()[:200]!r}")
        sys.exit(1)

if __name__ == "__main__":
    main()
