#!/usr/bin/env python3
"""GA4(gtag.js), Meta 픽셀(fbevents.js), 네이버 프리미엄 로그분석(wcs) 태그를 전 페이지 head 에 주입. 멱등.
   원장 = _tools/analytics.json. 마커 <!-- analytics:begin --> ... <!-- analytics:end --> 사이를 통째로 교체한다.
   제외 = reader.html(리더 셸), _design/ _tools/ design/ 및 백업(*.bak*). noindex 면(장바구니, 결제 등)도 전환 계측을 위해 주입한다.
   전환 이벤트: window.HH_TRACK(name, params) 한 번 호출로 GA4 와 Meta 양쪽에 발화한다(이름은 GA4 규약, Meta 표준 이벤트로 대응).
   호출 지점 = assets/app.js(view_item 가이드북 상품 면, add_to_cart 담기 성공, begin_checkout 결제 면, generate_lead 스튜디오 체험 시작), pay_done.html(purchase, 서버 확정 금액)."""
import json, glob, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "_tools", "analytics.json"), encoding="utf-8"))
GA4 = (CFG.get("ga4") or "").strip()
WCS = (CFG.get("naver_wcs") or "").strip()
PIX = (CFG.get("meta_pixel") or "").strip()
SKIP = {"reader.html"}
BEGIN, END = "<!-- analytics:begin -->", "<!-- analytics:end -->"
BLOCK_RE = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END) + r"\n?", re.S)

def block():
    if not GA4 and not WCS and not PIX:
        return ""
    parts = [BEGIN]
    if GA4:
        if not re.fullmatch(r"G-[A-Z0-9]{6,12}", GA4):
            sys.exit("analytics.json ga4 형식 오류: " + GA4)
        parts.append(f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA4}"></script>')
        parts.append("<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());"
                     f"gtag('config','{GA4}',{{send_page_view:true}});</script>")
    if PIX:
        if not re.fullmatch(r"[0-9]{10,20}", PIX):
            sys.exit("analytics.json meta_pixel 형식 오류: " + PIX)
        # Meta 공식 기본 코드(2026-09-04 건우 제공)를 한 줄로. PageView 는 여기서, 표준 이벤트는 HH_TRACK 가 fbq('track') 로 보낸다
        parts.append("<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};"
                     "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];"
                     "s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');"
                     f"fbq('init','{PIX}');fbq('track','PageView');</script>")
        parts.append(f'<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id={PIX}&amp;ev=PageView&amp;noscript=1"></noscript>')
    # HH_TRACK: 이벤트 1회 호출 → GA4 gtag(event) + Meta fbq(track). 파라미터는 GA4 규약(value, currency, items[{item_id,item_name,price,quantity}], transaction_id, content).
    # Meta 대응 = view_item→ViewContent, add_to_cart→AddToCart, begin_checkout→InitiateCheckout, purchase→Purchase(eventID=transaction_id, 전환 API 중복 제거 키), generate_lead→Lead
    ga = "try{gtag('event',n,p);}catch(e){}" if GA4 else ""
    fb = ("try{var M={view_item:'ViewContent',add_to_cart:'AddToCart',begin_checkout:'InitiateCheckout',purchase:'Purchase',generate_lead:'Lead'};"
          "if(window.fbq&&M[n]){var q={currency:p.currency||'KRW'};if(p.value!=null)q.value=p.value;"
          "if(p.items&&p.items.length){q.content_ids=p.items.map(function(i){return String(i.item_id);});q.content_type='product';}"
          "if(p.content)q.content_name=p.content;"
          "if(p.transaction_id!=null){fbq('track',M[n],q,{eventID:String(p.transaction_id)});}else{fbq('track',M[n],q);}}}catch(e){}") if PIX else ""
    parts.append("<script>window.HH_TRACK=function(n,p){p=p||{};" + ga + fb + "};</script>")
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
        if rel in SKIP or ".bak" in rel or rel.startswith(("design/", "_design/", "_docs/", "_tools/", "node_modules/", ".git/")):
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
    print("analytics 주입", n, "ga4=" + (GA4 or "없음"), "meta_pixel=" + (PIX or "없음"), "wcs=" + ("있음" if WCS else "없음"))

if __name__ == "__main__":
    main()
