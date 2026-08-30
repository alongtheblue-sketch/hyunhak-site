#!/usr/bin/env python3
"""엣지 스모크: 배포 뒤 라이브 URL 이 GitHub Pages 시절과 같은 해석을 하는지, 보호층 헤더와 봇 정책이 살아 있는지 실측.
사용: python3 _tools/edge_smoke.py [--base https://hyunhak.com] [--no-policy]
--no-policy = CF AI bot policies 적용 전(GPTBot 403 검사는 WARN 으로 강등)
"""
import sys, urllib.request, urllib.error, urllib.parse

BASE = "https://hyunhak.com"
if "--base" in sys.argv: BASE = sys.argv[sys.argv.index("--base") + 1].rstrip("/")
POLICY = "--no-policy" not in sys.argv
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
opener_nr = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

def get(path, ua="Mozilla/5.0 (Macintosh) hyunhak-smoke", follow=True, base=None):
    req = urllib.request.Request((base or BASE) + urllib.parse.quote(path, safe="/?=&%"), headers={"User-Agent": ua, "Accept": "text/html"})
    try:
        r = (opener if follow else opener_nr).open(req, timeout=20)
        return r.status, dict(r.headers), r.read(4096)
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read(4096)

rows, fails, warns = [], [], []
def chk(name, ok, detail, warn=False):
    rows.append(("PASS" if ok else ("WARN" if warn else "FAIL"), name, detail))
    if not ok: (warns if warn else fails).append(name)

s, h, b = get("/"); chk("/ 200 html", s == 200 and b"<html" in b.lower() or b"<!doctype" in b.lower(), f"{s}")
s, h, b = get("/guidebook/"); chk("/guidebook/ index", s == 200, f"{s}")
s, h, b = get("/guidebook", follow=False); chk("/guidebook → 301 슬래시", s == 301 and h.get("Location", "").endswith("/guidebook/"), f"{s} {h.get('Location')}")
s, h, b = get("/guidebook/korea.html"); chk("/guidebook/korea.html 200", s == 200, f"{s}")
s, h, b = get("/faq"); chk("/faq 확장자 없는 경로", s == 200, f"{s}")
s, h, b = get("/robots.txt"); chk("robots GPTBot 그룹", s == 200 and b"GPTBot" in b and b"Content-Signal" in b, f"{s}")
s, h, b = get("/llms.txt"); chk("llms.txt", s == 200, f"{s}")
s, h, b = get("/reader.html"); chk("reader.html X-Robots-Tag noindex", "noindex" in h.get("X-Robots-Tag", ""), h.get("X-Robots-Tag", "-"))
s, h, b = get("/my.html"); chk("my.html noindex", "noindex" in h.get("X-Robots-Tag", ""), h.get("X-Robots-Tag", "-"))
s, h, b = get("/없는페이지"); chk("404 페이지", s == 404, f"{s}")
s, h, b = get("/_tools/seo_manifest.json"); chk("_tools 비공개", s == 404, f"{s}")
s, h, b = get("/wrangler.toml"); chk("wrangler.toml 비공개", s == 404, f"{s}")
if BASE.endswith("hyunhak.com"):
    s, h, b = get("/", base="https://www.hyunhak.com", follow=False); chk("www → apex 301", s == 301 and "hyunhak.com" in h.get("Location", ""), f"{s} {h.get('Location')}")
    s, h, b = get("/", ua="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"); chk("Googlebot UA 200", s == 200, f"{s}")
    s, h, b = get("/", ua="Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)")
    chk("GPTBot UA 차단(403)", s == 403, f"{s}", warn=not POLICY)
    s, h, b = get("/", ua="Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)")
    chk("OAI-SearchBot UA 통과(200)", s == 200, f"{s}", warn=not POLICY)

for st, name, d in rows: print(f"{st:4} {name:34} {d}")
print(f"FAIL {len(fails)} / WARN {len(warns)} / {len(rows)} 항목")
sys.exit(1 if fails else 0)
