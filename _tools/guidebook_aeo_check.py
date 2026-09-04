#!/usr/bin/env python3
"""가이드북 31면의 답변 엔진 대응(AEO/GEO)과 판매 방어선을 한 번에 잰다.

판매 방어선 = 유료 본문이 공개 지면으로 새지 않았는가.
  S1 기출 질문 원문 노출 = 면당 4개 이하 (맛보기 상한. 유형이 4개 미만인 소권은 유형 수만큼)
  S2 전환 규칙 노출 = 면당 3개, 조건절(when)까지만. 질문 틀과 꼬리질문 0건
  S3 전략 노출 = 제목만, 면당 8개 이하
AEO/GEO = 답변 엔진이 인용할 것이 실려 있는가.
  A1 aeo-answer 1개  A2 핵심 팩트 6줄 이상  A3 FAQ 8문 이상
  G1 Person(author) 노드  G2 about.sameAs  G3 dateModified  G4 speakable  G5 hasMerchantReturnPolicy
값 대조는 meta v3 원장과 직접 한다 (지면끼리 대조하면 같이 틀려도 통과한다).
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
META = json.loads((ROOT / "_tools/guidebook_meta_v3.json").read_text(encoding="utf-8"))


def ld(html):
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    return {n["@type"]: n for n in json.loads(m.group(1))["@graph"]} if m else {}


def main():
    pages = sorted(p for p in (ROOT / "guidebook").glob("*.html") if p.name != "index.html")
    rows, fails = [], []
    for p in pages:
        slug = p.stem
        mv = META.get(slug)
        s = p.read_text(encoding="utf-8")
        g = ld(s)
        r = {"slug": slug}
        r["S1"] = len(re.findall(r'<p class="q">', s))
        r["S2"] = len(re.findall(r'<div class="r"><span class="cd">', s))
        r["S3"] = len(re.findall(r'<li><span class="sn">', s))
        r["A1"] = len(re.findall(r'<p class="aeo-answer">', s))
        r["A2"] = len(re.findall(r"<dt>", s))
        r["A3"] = len(g.get("FAQPage", {}).get("mainEntity", []))
        r["G1"] = 1 if "Person" in g else 0
        prod = g.get("Product", {})
        r["G2"] = 1 if prod.get("about", {}).get("sameAs") else 0
        r["G3"] = 1 if g.get("WebPage", {}).get("dateModified") else 0
        r["G4"] = 1 if g.get("WebPage", {}).get("speakable") else 0
        offers = prod.get("offers")
        offers = offers if isinstance(offers, list) else ([offers] if offers else [])
        r["G5"] = 1 if offers and offers[0].get("hasMerchantReturnPolicy") else 0
        # 유료 본문 유출: 규칙의 조건절 밖 문면이 지면에 있으면 즉시 실패
        if mv:
            for rule in mv.get("rule_list", []):
                for k, v in rule.items():
                    if k in ("code", "area", "when") or not isinstance(v, str) or len(v) < 12:
                        continue
                    if v in s:
                        fails.append(f"{slug}: 규칙 {rule['code']} 의 {k} 본문이 지면에 노출")
            # 수치는 원장과 직접 대조
            for label, val in (("실제 기출", f"{mv['questions']}문"), ("생기부 질문 규칙", f"{mv['rules']}개")):
                if not re.search(rf"<dt>{label}</dt><dd>{re.escape(val)}", s):
                    fails.append(f"{slug}: 팩트 '{label}' 이 원장값 {val} 과 다름")
        rows.append(r)

    # 같은 형태 대학 묶음이 참인지 원장에서 되유도해 대조한다 (지면끼리 대조하면 같이 틀려도 통과한다)
    sys.path.insert(0, str(ROOT / "_tools"))
    import build_guidebook as B
    # 앵커 문면 = "OO대학교 면접" (2026-09-04). 정식 명칭 규칙은 빌더 full_name 하나만 쓴다 (괄호 캠퍼스 처리 두 벌 금지)
    name2slug = {B.full_name({"slug": k, "name": v["name"]}): k for k, v in META.items() if isinstance(v, dict) and "name" in v}
    def forms_on(mv):
        return {f["form"] for f in mv.get("forms", [])
                if f.get("has") and "확인 필요" not in f["form"] and "과 " not in f["form"]}
    rel_n = rel_pages = 0
    for p in pages:
        s2 = p.read_text(encoding="utf-8")
        h = re.search(r"<h2>([^<]+) 면접을 보는 다른 대학</h2>", s2)
        if not h:
            continue
        rel_pages += 1
        mine = forms_on(META[p.stem])
        if {x.strip() for x in h.group(1).split(",")} != mine:
            fails.append(f"{p.stem}: 관련 대학 라벨이 원장 형태와 다름")
        block = re.search(r'<div class="rel rv">(.*?)</div>', s2, re.S)
        for nm in re.findall(r">([^<]+)</a>", block.group(1) if block else ""):
            rel_n += 1
            if not nm.endswith(" 면접"):
                fails.append(f"{p.stem}: 관련 대학 앵커 '{nm}' 가 'OO대학교 면접' 꼴이 아님")
            sl = name2slug.get(nm[:-3])
            if sl is None or forms_on(META[sl]) != mine:
                fails.append(f"{p.stem}: 관련 대학 '{nm}' 의 면접 형태가 다름")

    studio = {"yonsei", "korea"}
    def bad(r, key, lo=None, hi=None, eq=None):
        v = r[key]
        if eq is not None and v != eq: return True
        if lo is not None and v < lo: return True
        if hi is not None and v > hi: return True
        return False

    SKIP_G2 = studio | {"dankook"}          # 공식 주소를 확인하지 못한 대학
    checks = [("S1 기출 노출 4개 이하", lambda r: bad(r, "S1", hi=4)),
              ("S2 규칙 노출 3개 이하", lambda r: bad(r, "S2", hi=3)),
              ("S3 전략 제목 8개 이하", lambda r: bad(r, "S3", hi=8)),
              ("A1 답변 문단 1개", lambda r: bad(r, "A1", eq=1)),
              ("A2 핵심 팩트 6줄 이상", lambda r: bad(r, "A2", lo=6)),
              ("A3 FAQ 8문 이상", lambda r: bad(r, "A3", lo=8)),
              ("G1 저자 노드", lambda r: bad(r, "G1", eq=1)),
              ("G2 대학 공식주소", lambda r: bad(r, "G2", eq=1) and r["slug"] not in SKIP_G2),
              ("G3 갱신일", lambda r: bad(r, "G3", eq=1)),
              ("G4 인용 자리", lambda r: bad(r, "G4", eq=1)),
              ("G5 청약철회 정책", lambda r: bad(r, "G5", eq=1) and r["slug"] not in studio)]
    print(f"{'검사':22s} {'통과':>7s}  미달")
    print("-" * 74)
    for name, f in checks:
        off = [r["slug"] for r in rows if f(r)]
        print(f"{name:22s} {len(rows)-len(off):3d}/{len(rows):<3d}  {', '.join(off[:6]) if off else '-'}")
        if off:
            fails.append(f"{name}: {', '.join(off)}")
    print("-" * 74)
    print(f"{'R1 관련 대학 묶음':22s} {rel_n:3d}건  {rel_pages}면에서 원장 대조")
    print("-" * 74)
    print(f"면 {len(rows)} / FAIL {len(fails)}건")
    for f in fails[:12]:
        print("  [FAIL]", f)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
