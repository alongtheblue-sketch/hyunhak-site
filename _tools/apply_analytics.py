#!/usr/bin/env python3
"""GA4(gtag.js)와 네이버 프리미엄 로그분석(wcs) 태그를 전 페이지 head 에 주입. 멱등.
   원장 = _tools/analytics.json. 마커 <!-- analytics:begin --> ... <!-- analytics:end --> 사이를 통째로 교체한다.
   제외 = reader.html(리더 셸), _design/ _tools/ design/ 및 백업(*.bak*). noindex 면(장바구니, 결제 등)도 전환 계측을 위해 주입한다.
   전환 이벤트: pay_done.html 은 자체 스크립트에서 HH.track('purchase', ...) 를 부른다(apply 대상 아님)."""
import json, glob, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "_tools", "analytics.json"), encoding="utf-8"))
GA4 = (CFG.get("ga4") or "").strip()
WCS = (CFG.get("naver_wcs") or "").strip()
SKIP = {"reader.html"}
BEGIN, END = "<!-- analytics:begin -->", "<!-- analytics:end -->"
BLOCK_RE = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END) + r"\n?", re.S)

def block():
    if not GA4 and not WCS:
        return ""
    parts = [BEGIN]
    if GA4:
        if not re.fullmatch(r"G-[A-Z0-9]{6,12}", GA4):
            sys.exit("analytics.json ga4 형식 오류: " + GA4)
        parts.append(f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA4}"></script>')
        parts.append("<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());"
                     f"gtag('config','{GA4}',{{send_page_view:true}});"
                     "window.HH_TRACK=function(n,p){try{gtag('event',n,p||{});}catch(e){}};</script>")
    if WCS:
        if not re.fullmatch(r"[0-9a-f]{20,40}", WCS):
            sys.exit("analytics.json naver_wcs 형식 오류: " + WCS)
        parts.append('<script src="//wcs.naver.net/wcslog.js"></script>')
        parts.append("<script>if(!window.wcs_add)window.wcs_add={};"
                     f"wcs_add['wa']='{WCS}';if(window.wcs){{wcs_do();}}</script>")
    parts.append(END)
    return "\n".join(parts) + "\n"

def main():
    b = block()
    n = 0
    for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(p, ROOT)
        if rel in SKIP or ".bak" in rel or rel.startswith(("design/", "_design/", "_tools/", "node_modules/", ".git/")):
            continue
        s = open(p, encoding="utf-8").read()
        t = BLOCK_RE.sub("", s)
        if b:
            # <head> 바로 다음 줄에 둔다(charset 뒤가 이상적이나 charset 은 첫 1KB 안에 있으므로 무방)
            m = re.search(r"<meta charset=[^>]+>\n?", t)
            if m:
                t = t[:m.end()] + b + t[m.end():]
            elif "<head>" in t:
                t = t.replace("<head>", "<head>\n" + b, 1)
            else:
                continue
        if t != s:
            open(p, "w", encoding="utf-8").write(t); n += 1
    print("analytics 주입", n, "ga4=" + (GA4 or "없음"), "wcs=" + ("있음" if WCS else "없음"))

if __name__ == "__main__":
    main()
