#!/usr/bin/env python3
"""면접 검색어 포획 게이트 (2026-09-04 건우 "OO대 면접, 전형명 면접, 대학교 면접, 면접컨설팅, 모의면접, 생기부 면접, 서류기반 면접, 기출문제, 예상문제 싹 다").

두 층을 잰다. 지면끼리 대조하지 않고 SEARCH 표(빌더 원장)에서 요구 구절을 되유도한다.
  (1) 가이드북 판매 31면: 면마다 필수 구절 9종이 title, 본문, FAQ(JSON-LD 포함) 어딘가에 문자 그대로 있는가 + meta keywords 존재
  (2) 계열 커버리지: 검색어 계열 20종이 각각 요구 면(있으면)과 1면 이상에 있는가
탈락 1건이면 rc 1. 출력 마지막 줄이 요약이라 build_all.sh 의 tail1 에 걸린다.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guidebook as B   # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def page_text(rel):
    s = (ROOT / rel).read_text(encoding="utf-8")
    ld = " ".join(re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S))
    title = re.search(r"<title>(.*?)</title>", s, re.S)
    metas = " ".join(re.findall(r'<meta name="(?:description|keywords)" content="([^"]*)"', s))
    body = s.split("</head>", 1)[1] if "</head>" in s else s
    body = re.sub(r"<script.*?</script>|<style.*?</style>", " ", body, flags=re.S)
    body = re.sub(r"<[^>]+>", " ", body)
    txt = " ".join(x for x in ((title.group(1) if title else ""), metas, body, ld) if x)
    txt = txt.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#x27;", "'")
    return re.sub(r"\s+", " ", txt), (title.group(1) if title else ""), ('<meta name="keywords"' in s)


FAMILIES = [   # (계열, 구절, 반드시 있어야 하는 면 또는 None)
    ("연세대 활동우수형 면접", "연세대 활동우수형 면접", "programs/yonsei.html"),
    ("연대 면접", "연대 면접", "programs/yonsei.html"),
    ("연세대 면접", "연세대 면접", "programs/yonsei.html"),
    ("연세대 제시문 면접", "연세대 제시문 면접", "programs/yonsei.html"),
    ("연세대 모의면접", "연세대 모의면접", "programs/yonsei.html"),
    ("연세대 면접컨설팅", "연세대 면접컨설팅", "programs/yonsei.html"),
    ("고려대 계열적합형 면접", "고려대 계열적합형 면접", "programs/korea.html"),
    ("고려대 계열적합전형 면접", "고려대 계열적합전형 면접", "programs/korea.html"),
    ("고대 면접", "고대 면접", "programs/korea.html"),
    ("고려대 면접", "고려대 면접", "programs/korea.html"),
    ("고려대 제시문 면접", "고려대 제시문 면접", "programs/korea.html"),
    ("고려대 모의면접", "고려대 모의면접", "programs/korea.html"),
    ("생기부 면접", "생기부 면접", "interview.html"),
    ("서류기반 면접", "서류기반 면접", "interview.html"),
    ("대입 면접컨설팅", "대입 면접컨설팅", "interview.html"),
    ("대입 모의면접", "대입 모의면접", "interview.html"),
    ("모의면접", "모의면접", "studio.html"),
    ("면접컨설팅", "면접컨설팅", "index.html"),
    ("면접 예상문제", "면접 예상문제", "index.html"),
    ("면접 기출문제", "면접 기출문제", "index.html"),
    ("대입 면접 준비", "대입 면접 준비", "index.html"),
    ("MMI 면접", "MMI 면접", "interview.html"),
]


def main():
    cat = json.load(open(B.CATALOG, encoding="utf-8"))
    sale = [e for e in cat["items"] if e.get("onsale", True) and e["slug"] not in B.STUDIO]
    fails, rows = [], []
    for e in sorted(sale, key=lambda x: x["slug"]):
        rel = f"guidebook/{e['slug']}.html"
        s = B.SEARCH[e["slug"]]
        U, full, R1 = s["u"], B.full_name(e), s["rep"][0]["n"]
        need = [f"{U} 면접", f"{full} 면접", f"{U} {R1} 면접", f"{U} 서류기반 면접", f"{U} 면접 기출문제", f"{U} 면접 예상문제",
                f"{U} 면접컨설팅", f"{U} 모의면접", "생기부 면접"]
        txt, title, has_kw = page_text(rel)
        miss = [k for k in need if k not in txt]
        if not title.startswith(f"{U} 면접"):
            miss.append(f"title 이 '{U} 면접' 으로 시작하지 않음")
        if not has_kw:
            miss.append("meta keywords 없음")
        rows.append((rel, len(need) - len([k for k in miss if k in need]), len(need)))
        if miss:
            fails.append(f"{rel}: {', '.join(miss)}")
    # 계열 커버리지: 색인 면 전수
    pages = [p for p in sorted(ROOT.glob("**/*.html")) if "/_" not in "/" + str(p.relative_to(ROOT)) and not p.name.startswith(".")]
    texts = {}
    for p in pages:
        rel = str(p.relative_to(ROOT))
        if rel.startswith("_") or ".bak" in rel:
            continue
        s = p.read_text(encoding="utf-8")
        if 'name="robots" content="noindex' in s:
            continue
        texts[rel] = page_text(rel)[0]
    fam_rows = []
    for name, phrase, must in FAMILIES:
        hits = [rel for rel, t in texts.items() if phrase in t]
        ok = bool(hits) and (must is None or must in hits)
        fam_rows.append((name, len(hits), must, ok))
        if not ok:
            fails.append(f"계열 '{name}': {len(hits)}면" + (f", 요구 면 {must} 에 없음" if must and must not in hits else ""))
    print(f"{'가이드북 면':28s} 구절")
    for rel, got, tot in rows:
        print(f"{rel:28s} {got}/{tot}")
    print("-" * 60)
    print(f"{'계열':24s} {'면수':>4s}  요구 면")
    for name, n, must, ok in fam_rows:
        print(f"{name:24s} {n:4d}  {must or '-'}  {'OK' if ok else 'FAIL'}")
    print("-" * 60)
    for f in fails[:20]:
        print("  [FAIL]", f)
    print(f"seo_keyword_census: 가이드북 {sum(1 for r in rows if r[1] == r[2])}/{len(rows)}면 전 구절, 계열 {sum(1 for r in fam_rows if r[3])}/{len(fam_rows)} / FAIL {len(fails)}건")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
