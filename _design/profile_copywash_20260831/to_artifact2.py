#!/usr/bin/env python3
"""프리뷰 HTML → 아티팩트용 단일 파일 (CSP 대응).
- doctype/html/head/body 래퍼와 meta, base 제거. <title> 선두 유지
- base.css + profile.css 인라인 (CSS 내 url(assets/...) 도 data URI)
- Pretendard jsdelivr(CSP 차단) → Google Fonts Noto Sans KR 폴백 + --sans 스택 보강
- 이미지 data URI, 내부 링크 → https://hyunhak.com/ 절대화
- app.js 제거, .rv 강제 표시 + 타일 안내 문구
usage: to_artifact2.py <in.html> <out.html>
"""
import re, sys, os, base64, mimetypes

src, dst = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, "..", ".."))
s = open(src, encoding="utf-8").read()

m = re.search(r"<title>(.*?)</title>", s, re.S)
title = m.group(1).strip() if m else "untitled"
s = re.sub(r"<title>.*?</title>", "", s, flags=re.S)
s = re.sub(r"<!doctype[^>]*>", "", s, flags=re.I)
for t in ("html", "head", "body"):
    s = re.sub(rf"</?{t}[^>]*>", "", s)
s = re.sub(r"<meta[^>]*>", "", s)
s = re.sub(r"<base[^>]*>", "", s)
s = re.sub(r'<link rel="icon"[^>]*>', "", s)
s = re.sub(r"<script src=\"assets/app\.js\"></script>", "", s)

total = 0
def uri(path):
    global total
    p = os.path.join(SITE, path)
    if not os.path.exists(p):
        return None
    mt = mimetypes.guess_type(p)[0] or "application/octet-stream"
    b = open(p, "rb").read()
    total += len(b)
    return f"data:{mt};base64,{base64.b64encode(b).decode()}"

def css_inline(text):
    return re.sub(r"url\((assets/[^)]+)\)", lambda mm: f"url({uri(mm.group(1)) or mm.group(1)})", text)

def link_css(mm):
    href = mm.group(1)
    p = os.path.join(SITE, href)
    if not os.path.exists(p):
        return mm.group(0)
    return "<style>\n" + css_inline(open(p, encoding="utf-8").read()) + "\n</style>"

s = re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>', link_css, s)
# 폰트: Pretendard CDN 차단 → Noto Sans KR (preload 라인 포함 전부 치환)
s = re.sub(r"<link[^>]*cdn\.jsdelivr\.net[^>]*>", "", s)
s = re.sub(r"<noscript><link[^>]*></noscript>", "", s)
s = re.sub(r"<link[^>]*preconnect[^>]*>", "", s)
s = re.sub(r"<link[^>]*preload[^>]*fonts\.googleapis[^>]*>",
           '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;500;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap">', s)
s = s.replace("--sans:'Pretendard Variable','Pretendard',", "--sans:'Pretendard Variable','Pretendard','Noto Sans KR',")

# 이미지 data URI
s = re.sub(r'(src|poster)="(assets/[^"]+\.(?:jpg|jpeg|png|webp|svg))"',
           lambda mm: f'{mm.group(1)}="{uri(mm.group(2)) or mm.group(2)}"', s)
# 내부 링크 절대화 (data:, http, # 제외)
s = re.sub(r'href="(?!https?:|data:|#|mailto:)([^"]+)"', r'href="https://hyunhak.com/\1"', s)

s = f"""<title>{title}</title>
{s}
<style>.rv{{opacity:1!important;transform:none!important}} #tiles::before{{content:"대학 타일은 라이브에서 상품 API 로 채워집니다. 프리뷰 생략.";font-size:13px;color:#696561}}</style>
"""
open(dst, "w", encoding="utf-8").write(s)
kb = len(s.encode()) / 1024
assert kb < 16000, f"16MB 초과: {kb:.0f}KB"
print(f"{os.path.basename(dst)} {kb:.0f}KB (자산 {total//1024}KB) title={title}")
