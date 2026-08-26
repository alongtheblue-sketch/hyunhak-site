#!/usr/bin/env python3
"""면접 아카이브 26면 (interview/<slug>.html) 을 전람 v1 → 플랫폼 v2 로 변환한다. 멱등 (이미 v2 면 무변경).
   본문(제원표, 유형 판정, 특징, 전략, 대표 문항)은 그대로 두고 셸, 페이지 머리, 숫자 밴드, 하단 CTA, 스타일만 바꾼다.
   가운뎃점(·)과 em 대시(—)는 사이트 규범(AI slop 0)에 따라 ', ' 로 치환한다 (script, style, JSON-LD 제외).
   2026-08-26 s16. build_all 4단계 앞에서 실행."""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = json.load(open(os.path.join(ROOT, "_tools", "guidebook_catalog.json"), encoding="utf-8"))
ONSALE = {e["slug"]: bool(e.get("onsale", True)) for e in CAT["items"]}
PRICE = int(CAT["price"])

FONT_HEAD = '''<link rel="icon" href="../assets/favicon_32.png">
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></noscript>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;500;700&display=swap" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;500;700&display=swap"></noscript>
<link rel="stylesheet" href="../assets/base.css">'''

STYLE = '''<style>
/* 면접 아카이브 전용 (플랫폼 v2). 본문 클래스는 원문 유지 */
.arcwrap{max-width:900px}
.arc{padding:0 0 var(--s5)}
.arc h2{font-size:var(--t-h2);font-weight:700;letter-spacing:-0.025em;line-height:1.2;margin-top:var(--s7);padding-top:var(--s6);border-top:1px solid var(--hair)}
.arcwrap>.arc:first-child h2{margin-top:var(--s4);padding-top:0;border-top:0}
.arc .ah3{font-size:var(--t-h4);font-weight:700;letter-spacing:-0.02em;margin:var(--s5) 0 12px}
.arc .ap{font-size:15px;line-height:1.85;color:var(--body);margin:12px 0;max-width:72ch}
.arc .ap,.arc .aq,.arc .aol li,.arc .cite,.arc .ic{overflow-wrap:anywhere}
.arc .gray{color:var(--gray)}
.arc .aq{border-left:2px solid var(--hair);padding:4px 0 4px 18px;color:var(--gray);font-size:14px;line-height:1.8;margin:16px 0;max-width:72ch}
.arc .ahr{display:none}
.arc .aol{margin:14px 0;counter-reset:n;max-width:72ch}
.arc .aol li{counter-increment:n;font-size:14.5px;line-height:1.8;color:var(--body);padding:10px 0;border-bottom:1px solid var(--hairs);display:flex;gap:14px}
.arc .aol li::before{content:counter(n,decimal-leading-zero);font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--seal);padding-top:5px;flex:0 0 22px}
.arc .cite{display:block;font-size:12px;color:var(--gray);margin-top:4px}
.arc .ic{font-size:.92em;border-bottom:1px dotted var(--hair)}
.arc .tblwrap{margin:16px 0}
.arc .atbl{border-collapse:collapse;font-size:13px;min-width:760px;width:100%}
.arc .atbl th{font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--gray);text-align:left;padding:10px 12px 10px 0;border-bottom:1px solid var(--hair);white-space:nowrap}
.arc .atbl td{padding:10px 12px 10px 0;border-bottom:1px solid var(--hairs);vertical-align:top;line-height:1.7;color:var(--body)}
.arc .qgh{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:var(--s5) 0 6px;flex-wrap:wrap}
.arc .qgh h3{font-size:var(--t-h4);font-weight:700;letter-spacing:-0.02em}
.arc .qgh .cnt{font-size:12.5px;color:var(--gray)}
.arc .qlock{font-size:13px;color:var(--gray);margin:8px 0 2px}
.arc .locked{background:var(--mat);border-radius:6px;padding:var(--s4);margin:var(--s6) 0 8px}
.arc .locked .u{font-size:13px;font-weight:600;letter-spacing:.04em;color:var(--gray)}
.arc .locked ul{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px 18px}
.arc .locked li{font-size:13.5px;color:var(--body)}
.arc .locked .ap{margin-top:14px}
.arc .locked .btn{margin-top:var(--s3)}
</style>'''

BANNED = str.maketrans({"·": ", ", "—": ", "})


def clean_visible(s):
    """script, style, seo 블록 밖의 가운뎃점, em 대시만 치환. ', ,' 중복은 정리."""
    parts = re.split(r"(<script.*?</script>|<style.*?</style>|<!-- seo:begin -->.*?<!-- seo:end -->)", s, flags=re.S | re.I)
    out = []
    for i, part in enumerate(parts):
        if i % 2 == 0:
            part = part.translate(BANNED)
            part = re.sub(r"\s*,\s*,\s*", ", ", part)
            part = part.replace(" , ", ", ")
        out.append(part)
    return "".join(out)


def convert(rel, s):
    slug = os.path.basename(rel)[:-5]
    if '<body class="v2">' in s:
        return s
    # head: base.css 링크 + 구 스타일 → 폰트 프리로드 + v2 스타일
    s = re.sub(r'<link rel="stylesheet" href="\.\./assets/base\.css">\s*<style>.*?</style>', lambda m: FONT_HEAD + "\n" + STYLE, s, count=1, flags=re.S)
    s = s.replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
                  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', 1)
    # 셸
    s = re.sub(r'<body>\s*<a class="skip" href="#hhMain">본문으로 건너뛰기</a>\s*<header class="nav[^"]*">.*?</header>\s*<main id="hhMain" class="page">',
               '<body class="v2">\n<a class="skip" href="#main">본문으로 건너뛰기</a>\n<div class="frame"><div class="sheet">\n\n<!--v2:shell-->\n\n<main id="main">', s, count=1, flags=re.S)
    assert "<!--v2:shell-->" in s, rel
    # 페이지 머리 + 숫자 밴드
    m = re.search(r'<div class="pagehead">\s*<p class="crumb u gray"><a href="index\.html">면접 아카이브</a> / (.*?)</p>\s*<h1>(.*?)</h1>\s*<p class="han">(.*?)</p>\s*(<!-- aeo -->.*?<!-- /aeo -->)?\s*</div>\s*<div class="facts">(.*?)</div>\s*</div>\s*<div style="max-width:1080px;margin:0 auto">', s, re.S)
    assert m, rel
    name, h1, han, aeo, facts_inner = m.group(1), m.group(2), m.group(3), m.group(4) or "", m.group(5)
    fs = re.findall(r'<span class="n">(.*?)</span><span class="k">(.*?)</span>', facts_inner)
    facts = "".join(f"<div><b>{n}</b><span>{k}</span></div>" for n, k in fs)
    facts += f'<div><b>26</b><span>무료 아카이브 대학</span></div><div><b>{PRICE:,}</b><span>원, 가이드북 권당</span></div>'
    head = (f'<section class="phead">\n  <div class="wrap">\n   <div class="pagehead">\n'
            f'    <nav class="crumb rv" aria-label="위치"><a href="../index.html">현학적 연구소</a><span aria-hidden="true">/</span><a href="index.html">무료 아카이브</a><span aria-hidden="true">/</span><span>{name}</span></nav>\n'
            f'    <h1 class="rv">{h1}</h1>\n    <p class="lede rv">{han}</p>\n' + (f"    {aeo}\n" if aeo else "") +
            f'   </div>\n    <div class="facts rv">{facts}</div>\n  </div>\n</section>\n<div class="wrap"><div class="arcwrap">')
    s = s[:m.start()] + head + s[m.end():]
    # 섹션 인라인 스타일 제거
    s = s.replace("<section class='arc' style='margin:56px auto 0'>", '<section class="arc">')
    s = re.sub(r'<h2 style="font-family:var\(--serif\);[^"]*">', "<h2>", s)
    s = s.replace("<a class='textlink' href='../guidebook/", '<a class="btn sm" href="../guidebook/')
    # 하단 CTA (먹 반전) → final. 스튜디오는 연세대, 고려대 지문만 판매하므로 학교별로 정확히
    m2 = re.search(r'</div>\s*<section class="invert"[^>]*>.*?</section>\s*</main>', s, re.S)
    assert m2, rel
    studio = slug in ("yonsei", "korea")
    sale = ONSALE.get(slug, False)
    if studio:
        h2, p = "이 학교 지문으로 촬영 응시", f"{name} 기출 지문으로 촬영, 전사, 첨삭. 지문 1편 22,000원, 전권 330,000원. 신규 회원 맛보기 응시 1회."
        acts = '<a class="btn" href="../studio.html">면접 스튜디오 안내 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="../join.html">회원가입하고 맛보기 받기</a>'
    elif sale:
        h2, p = "전체 질문과 유형 해설은 가이드북에", f"{name} 2027 면접 가이드북, 권당 {PRICE:,}원. 보안 리더 열람."
        acts = f'<a class="btn" href="../guidebook/{slug}.html">가이드북 보기 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="../studio.html">면접 스튜디오</a>'
    else:
        h2, p = "가이드북은 준비 중", f"{name} 2027 면접 가이드북은 판매 준비 중. 개시는 공지로. 제시문 면접 스튜디오는 연세대와 고려대 지문으로 촬영 응시."
        acts = f'<a class="btn" href="../guidebook/{slug}.html">가이드북 안내 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="../studio.html">면접 스튜디오</a>'
    final = (f'</div></div>\n\n<section class="sec tight">\n  <div class="wrap">\n    <div class="final rv">\n      <div><h2>{h2}</h2><p>{p}</p></div>\n'
             f'      <div class="acts">{acts}</div>\n    </div>\n  </div>\n</section>\n\n</main>')
    s = s[:m2.start()] + final + s[m2.end():]
    # 푸터, 모바일 바, 스크립트
    s = re.sub(r'<footer class="u">.*?</footer>\s*<script src="\.\./assets/app\.js"></script>',
               '<!--v2:footer-->\n\n</div></div>\n\n<!--v2:fix-->\n\n<script src="../assets/app.js"></script>', s, count=1, flags=re.S)
    assert "<!--v2:footer-->" in s and "hhMain" not in s and 'class="nav u"' not in s, rel
    return clean_visible(s)


def main():
    check = "--check" in sys.argv
    changed = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "interview", "*.html"))):
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        if rel.endswith("/index.html"):
            continue
        s = open(path, encoding="utf-8").read()
        new = convert(rel, s)
        if new != s:
            changed += 1
            if not check:
                open(path, "w", encoding="utf-8").write(new)
    print(f"v2_interview {'변경 필요' if check else '변경'} {changed}")
    return 1 if (check and changed) else 0


if __name__ == "__main__":
    sys.exit(main())
