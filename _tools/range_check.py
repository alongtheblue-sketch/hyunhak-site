#!/usr/bin/env python3
"""자산 바이트 범위(206) 검사기 (2026-09-07). 워커 withRange 의 계약을 로컬(wrangler dev)·라이브에서 같은 항목으로 잰다.
근거: iOS Safari 는 서버 byte-range 지원 없이는 mp4 를 재생하지 못한다. 본문 바이트는 로컬 파일과 대조한다(라이브 = 로컬 해시 동일 전제).
사용: python3 _tools/range_check.py [--base https://hyunhak.com] [--path assets/video/brand_60s_aigen.mp4]
"""
import pathlib, sys, urllib.request, urllib.error

BASE = "https://hyunhak.com"
if "--base" in sys.argv: BASE = sys.argv[sys.argv.index("--base") + 1].rstrip("/")
PATH = "assets/video/brand_60s_aigen.mp4"
if "--path" in sys.argv: PATH = sys.argv[sys.argv.index("--path") + 1].lstrip("/")
ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = (ROOT / PATH).read_bytes(); SIZE = len(DATA)
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1 hyunhak-range-check"

def req(path, headers=None, method="GET"):
    r = urllib.request.Request(BASE + "/" + path, headers={"User-Agent": UA, **(headers or {})}, method=method)
    try:
        with opener.open(r, timeout=60) as x: return x.status, {k.lower(): v for k, v in x.headers.items()}, x.read()
    except urllib.error.HTTPError as e: return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()

rows = []
def chk(name, ok, detail): rows.append((ok, name, detail)); print(("PASS " if ok else "FAIL ") + name + " — " + detail)

st, h, b = req(PATH, {"Range": "bytes=0-1023"})
chk("R1 bytes=0-1023 → 206 + Content-Range + 앞 1024바이트 일치", st == 206 and h.get("content-range") == f"bytes 0-1023/{SIZE}" and b == DATA[:1024] and h.get("content-length") == "1024", f"{st} cr={h.get('content-range')} len={len(b)}")
st, h, b = req(PATH, {"Range": "bytes=0-1"})
chk("R2 Safari 탐침 bytes=0-1 → 206 2바이트", st == 206 and b == DATA[:2] and h.get("content-range") == f"bytes 0-1/{SIZE}", f"{st} cr={h.get('content-range')} len={len(b)}")
st, h, b = req(PATH, {"Range": "bytes=-1024"})
chk("R3 접미 bytes=-1024 → 206 꼬리 일치", st == 206 and b == DATA[-1024:] and h.get("content-range") == f"bytes {SIZE-1024}-{SIZE-1}/{SIZE}", f"{st} cr={h.get('content-range')}")
st, h, b = req(PATH, {"Range": f"bytes={SIZE-3000}-"})
chk("R4 열린 끝 bytes=N- → 206 끝까지", st == 206 and b == DATA[SIZE-3000:] and h.get("content-length") == "3000", f"{st} len={len(b)}")
st, h, b = req(PATH, {"Range": f"bytes={SIZE+10}-"})
chk("R5 범위 밖 → 416 + Content-Range bytes */size", st == 416 and h.get("content-range") == f"bytes */{SIZE}", f"{st} cr={h.get('content-range')}")
st, h, b = req(PATH, {"Range": "bytes=0-1,5-9"})
chk("R6 다중 범위 → 200 전체(단일 범위만 지원)", st == 200 and len(b) == SIZE, f"{st} len={len(b)}")
st, h, b = req(PATH)
chk("R7 무범위 GET → 200 전체 + Accept-Ranges: bytes", st == 200 and len(b) == SIZE and h.get("accept-ranges") == "bytes" and b == DATA, f"{st} len={len(b)} ar={h.get('accept-ranges')}")
st, h, b = req(PATH, method="HEAD")
chk("R8 HEAD → 200 + Accept-Ranges: bytes", st == 200 and h.get("accept-ranges") == "bytes", f"{st} ar={h.get('accept-ranges')}")
st, h, b = req(PATH, {"Range": "bytes=0-1023", "If-Range": '"nope"'})
chk("R9 If-Range 불일치 → 200 전체", st == 200 and len(b) == SIZE, f"{st} len={len(b)}")
etag = req(PATH, method="HEAD")[1].get("etag")
if etag:
    st, h, b = req(PATH, {"Range": "bytes=0-1023", "If-Range": etag})
    chk("R10 If-Range 일치(ETag) → 206", st == 206 and b == DATA[:1024], f"{st} etag={etag[:12]}")
else:
    chk("R10 ETag 존재", False, "ETag 헤더 없음")
st, h, b = req("about.html", {"Range": "bytes=0-99"})
chk("R11 HTML 은 범위 미적용 200 (종전 그대로)", st == 200 and len(b) > 100, f"{st} len={len(b)}")
for extra in ("assets/video/brand_60s_aigen.webm", "assets/video/sample_common.mp4"):
    d = (ROOT / extra).read_bytes(); st, h, b = req(extra, {"Range": "bytes=0-1023"})
    chk(f"R12 {extra} bytes=0-1023 → 206 일치", st == 206 and b == d[:1024] and h.get("content-range") == f"bytes 0-1023/{len(d)}", f"{st} cr={h.get('content-range')}")
n = sum(1 for ok, *_ in rows if ok)
print(f"== range_check {n}/{len(rows)} PASS @ {BASE}")
sys.exit(0 if n == len(rows) else 1)
