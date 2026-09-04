#!/usr/bin/env python3
"""수록 질문 수와 본문 면수를 원장(meta v3 + catalog)에서 유도해 지면에 반영한다.

지면의 숫자는 손으로 적혀 있어 원장이 바뀌면 조용히 낡는다. 이 패처는 앵커 문구
옆 숫자만 바꾸고, 앵커별 기대 매치 수를 대조해 문면이 바뀌면 멈춘다(fail closed).

  python3 _tools/apply_counts.py --check   낡음 판정만 (rc 1 = 낡음)
  python3 _tools/apply_counts.py           반영
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STUDIO = {"yonsei", "korea"}


def ledger():
    """판매 권수, 기출 문항 합, 본문 면수 합. 빌더 seo_hub_texts 와 같은 모집단."""
    cat = json.loads((ROOT / "_tools/guidebook_catalog.json").read_text(encoding="utf-8"))
    meta = json.loads((ROOT / "_tools/guidebook_meta_v3.json").read_text(encoding="utf-8"))
    items = cat["items"] if isinstance(cat, dict) and "items" in cat else cat
    sale = [e for e in items if e.get("onsale", True) and e["slug"] not in STUDIO]
    return {
        "n": len(sale),
        "q": sum(meta[e["slug"]]["questions"] for e in sale),
        "p": sum(meta[e["slug"]]["pages"] for e in sale),
    }


# (파일, 정규식, 채울 키, 기대 매치 수). 정규식의 그룹 1 이 교체 대상 숫자다.
ANCHORS = [
    ("index.html", r"질문 ([\d,]+)개", "q", 2),
    ("index.html", r"질문 <b>([\d,]+)개</b>", "q", 2),
    ("index.html", r"수록 질문 ([\d,]+)\.", "q", 1),
    ("index.html", r"31권, ([\d,]+)면", "p", 1),
    ("index.html", r"본문 ([\d,]+)면", "p", 1),
    ("about.html", r"질문 ([\d,]+)개", "q", 2),
    ("about.html", r"수록 질문 ([\d,]+)\.", "q", 1),
    ("about.html", r"<b>([\d,]+)</b><span>수록 질문</span>", "q", 1),
    ("about.html", r"가이드북, ([\d,]+)면", "p", 1),
    ("about.html", r"31권 ([\d,]+)면", "p", 1),
    ("about.html", r"31개 대학, ([\d,]+)면", "p", 1),
    ("about.html", r"31권, ([\d,]+)면", "p", 1),
]


def main():
    check = "--check" in sys.argv
    L = ledger()
    want = {"q": f"{L['q']:,}", "p": f"{L['p']:,}", "n": f"{L['n']:,}"}
    stale, changed, errors = [], [], []
    edits = {}
    old_values = {}

    for fname, pat, key, expect in ANCHORS:
        path = ROOT / fname
        s = edits.get(fname, path.read_text(encoding="utf-8"))
        hits = list(re.finditer(pat, s))
        if len(hits) != expect:
            errors.append(f"{fname}: /{pat}/ 매치 {len(hits)}건, 기대 {expect}건 (문면 변경? 앵커 갱신 필요)")
            continue
        bad = [m.group(1) for m in hits if m.group(1) != want[key]]
        if bad:
            stale.append(f"{fname}: /{pat}/ = {', '.join(sorted(set(bad)))} → {want[key]}")
            old_values.setdefault(fname, set()).update(bad)
            s = re.sub(pat, lambda m: m.group(0).replace(m.group(1), want[key]), s)
            edits[fname] = s
            changed.append(fname)

    if errors:
        for e in errors:
            print("FAIL", e)
        return 2

    print(f"원장: 판매 {L['n']}권, 기출 {L['q']:,}문, 본문 {L['p']:,}면")
    if not stale:
        print("지면 = 원장 (낡음 0)")
        return 0

    for s in stale:
        print(("낡음 " if check else "수정 ") + s)
    if check:
        return 1
    for fname, s in edits.items():
        (ROOT / fname).write_text(s, encoding="utf-8")
    print(f"반영 {len(edits)}파일")

    # 자기검사: 바꾼 구값이 그 파일에 남아 있으면 앵커가 놓친 자리가 있다는 뜻이다.
    leak = []
    for fname in edits:
        text = (ROOT / fname).read_text(encoding="utf-8")
        for old in old_values.get(fname, set()):
            for i, line in enumerate(text.split("\n"), 1):
                if old in line:
                    leak.append(f"{fname}:{i} 구값 {old} 잔존 — {line.strip()[:90]}")
    if leak:
        print("FAIL 앵커가 놓친 자리:")
        for x in leak:
            print("  " + x)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
