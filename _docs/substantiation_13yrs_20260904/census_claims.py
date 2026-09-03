#!/usr/bin/env python3
"""표시광고법 제5조 실증 대상 표현 census (GS-16-3). 사이트 원천에서 매번 재생성한다 (정적 목록 금지).
대상 = 사이트 HTML 전면(_design, _docs, .bak 제외) + 네이버 광고 계획 JSON + 인스타 광고 계획 MD.
출력 = claims_census.md (파일:줄:표현 종류) + claims_census.json
"""
import glob, json, os, re, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CLAIMS = [
    ("연차", re.compile(r"13\s*년\s*차|13<em>년차|<b>13</b><span>입시 컨설턴트 연차|컨설턴트 13년|13년차")),
    ("지역", re.compile(r"대치동")),
    ("직위", re.compile(r"부원장")),
    ("학력", re.compile(r"고려대학교 영어교육과|고려대 영어교육과")),
    ("경력", re.compile(r"데오럭스|학쫑|정교사 대상|대치우리학원|돌풍학원|대성학원|경희고등학교")),
]
def files():
    out = []
    for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(p, ROOT)
        if rel.startswith(("_design/", "_docs/", "_tools/", "design/", "outputs/", "node_modules/")) or ".bak" in rel: continue
        out.append(rel)
    out += [r for r in ("_docs/naver_ads_20260903/adgroups_plan.json", "_docs/INSTAGRAM_AD_PLAN_20260903.md") if os.path.exists(os.path.join(ROOT, r))]
    return out
rows = []
for rel in files():
    for i, line in enumerate(open(os.path.join(ROOT, rel), encoding="utf-8"), 1):
        if "테헤란로" in line or "bizinfo" in line or "streetAddress" in line: continue   # 사업장 주소 표기는 광고 표현이 아니다
        kinds = [k for k, rx in CLAIMS if rx.search(line)]
        if not kinds: continue
        # 종류 판정은 줄 단위. JSON-LD 한 줄에 여러 종류가 섞이면 전부 적는다
        snippet = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", line)).strip()
        m = re.search(r".{0,40}(13\s*년|대치동|부원장|영어교육과|데오럭스|학쫑|정교사|우리학원|돌풍|대성학원|경희고).{0,50}", snippet)
        rows.append({"file": rel, "line": i, "kinds": kinds, "snippet": (m.group(0) if m else snippet[:90])})
by_kind = collections.Counter(k for r in rows for k in r["kinds"])
by_file = collections.Counter(r["file"] for r in rows)
json.dump({"rows": rows, "by_kind": by_kind, "by_file": by_file}, open("claims_census.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
with open("claims_census.md", "w", encoding="utf-8") as f:
    f.write("# 실증 대상 표현 census (자동 생성, census_claims.py)\n\n")
    f.write("| 종류 | 줄 수 |\n|---|---|\n" + "".join(f"| {k} | {v} |\n" for k, v in by_kind.most_common()))
    f.write("\n| 파일 | 줄 수 |\n|---|---|\n" + "".join(f"| {k} | {v} |\n" for k, v in sorted(by_file.items())))
    f.write("\n| 파일 | 줄 | 종류 | 문맥 |\n|---|---|---|---|\n")
    for r in rows: f.write(f"| {r['file']} | {r['line']} | {', '.join(r['kinds'])} | {r['snippet'].replace('|', '/')} |\n")
print("rows", len(rows), dict(by_kind), "files", len(by_file))
