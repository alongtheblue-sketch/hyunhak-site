#!/usr/bin/env python3
"""세트 카탈로그 빌더 (assets/data/sets.json).

원천 = 세 은행의 sets/*.json 읽기 전용. 단위 5종 x 30세트 = 150세트만 담는다.
정원 밖 세트(korea s31 이상 등)와 .bak 파일은 카탈로그에서 제외한다.
generated_at 은 고정 문자열이고 입력 변화는 catalog_hash 로 드러나므로
두 번 실행해도 바이트가 같다.

실행: python3 _tools/build_sets_catalog.py
"""
import hashlib
import json
import os
import re
import sys

HOME = os.path.expanduser("~")
SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(SITE_ROOT, "assets", "data", "sets.json")
SCRIPT_SETS_DIR = os.path.join(HOME, "Workspace", "interview_meta_lecture_2027", "scripts", "sets")

GENERATED_AT = "2026-09-02T00:00:00Z"
PRICE = 396000
SINGLE_PRICE = 33000

# 단위 5종 정의. bank_dir = 은행 저장소, prefix = 세트 id 접두, script_bank = 해설 대본 디렉토리명
UNITS = [
    {"code": "korea-hum", "label": "고려대 계열적합 인문", "univ_short": "고려대",
     "bank_dir": "korea_interview_bank_2027", "prefix": "korea_2027_h", "script_bank": "korea"},
    {"code": "korea-sci", "label": "고려대 계열적합 자연", "univ_short": "고려대",
     "bank_dir": "korea_interview_bank_2027", "prefix": "korea_2027_s", "script_bank": "korea"},
    {"code": "yonsei-hum", "label": "연세대 활동우수 인문통합", "univ_short": "연세대",
     "bank_dir": "yonsei_interview_bank_2027", "prefix": "yonsei_2027_h", "script_bank": "yonsei"},
    {"code": "yonsei-sci", "label": "연세대 활동우수 자연", "univ_short": "연세대",
     "bank_dir": "yonsei_interview_bank_2027", "prefix": "yonsei_2027_s", "script_bank": "yonsei"},
    {"code": "yonsei-intl", "label": "연세대 국제형", "univ_short": "연세대",
     "bank_dir": "yonsei_intl_interview_bank_2027", "prefix": "yonsei_intl_2027_i", "script_bank": "intl"},
]

# Global 5 세트 id 정규식 (서버 검증과 같은 문자열)
SET_ID_RE = re.compile(r"^(korea_2027_[hs]|yonsei_2027_[hs]|yonsei_intl_2027_i)(0[1-9]|[12][0-9]|30)$")

# 난이도 폐쇄 어휘. 원천 실측이 네 값이라 최상을 포함한다 (2026-09-02 실측: 하 30, 중 50, 상 50, 최상 20)
DIFFICULTY_VOCAB = ("하", "중", "상", "최상")

EM_DASHES = ("—", "―")            # em dash, horizontal bar
MIDDLE_DOTS = ("·", "‧", "・", "ㆍ")  # 가운뎃점 계열


def normalize_title(text):
    """제목 정규화. em대시는 콜론으로, 가운뎃점은 쉼표로 바꾼다. 원천 파일은 건드리지 않는다."""
    out = text
    for ch in EM_DASHES:
        out = out.replace(ch, ": ")
    for ch in MIDDLE_DOTS:
        out = out.replace(ch, ", ")
    out = re.sub(r"\s+", " ", out).strip()
    out = re.sub(r"\s+([,:])", r"\1", out)
    return out


def bank_sets_dir(bank_dir):
    return os.path.join(HOME, "Workspace", bank_dir, "sets")


def build():
    units_out = []
    hash_parts = []
    for unit in UNITS:
        sets_dir = bank_sets_dir(unit["bank_dir"])
        univ = None
        track = None
        sets_out = []
        for n in range(1, 31):
            set_id = "%s%02d" % (unit["prefix"], n)
            path = os.path.join(sets_dir, set_id + ".json")
            if not os.path.exists(path):
                sys.exit("원천 세트 없음: %s" % path)
            raw = open(path, "rb").read()
            hash_parts.append("%s:%s" % (set_id, hashlib.sha256(raw).hexdigest()))
            data = json.loads(raw.decode("utf-8"))
            meta = data.get("bank_meta", {})
            if univ is None:
                univ, track = data.get("univ"), data.get("track")
            elif data.get("univ") != univ or data.get("track") != track:
                sys.exit("단위 %s 안에서 univ/track 이 갈린다: %s" % (unit["code"], set_id))

            script_path = os.path.join(SCRIPT_SETS_DIR, unit["script_bank"], set_id + ".md")
            has_script = os.path.exists(script_path)
            hash_parts.append("%s:script=%d" % (set_id, 1 if has_script else 0))

            entry = {
                "id": data.get("id"),
                "n": n,
                "title": normalize_title(data.get("title") or ""),
                "difficulty": meta.get("difficulty"),
                "axes": meta.get("difficulty_axes", {}),
                "passages": len(data.get("passages", [])),
                "questions": len(data.get("questions", [])),
                "prep_seconds": data.get("prep_seconds"),
            }
            if data.get("interview_seconds") is not None:
                entry["interview_seconds"] = data.get("interview_seconds")
            entry["explain_script"] = has_script
            sets_out.append(entry)

        units_out.append({
            "code": unit["code"],
            "sku": "pass-" + unit["code"],
            "univ": univ,
            "univ_short": unit["univ_short"],
            "track": track,
            "label": unit["label"],
            "price": PRICE,
            "single_price": SINGLE_PRICE,
            "set_count": len(sets_out),
            "sets": sets_out,
        })

    catalog_hash = hashlib.sha256("\n".join(hash_parts).encode("utf-8")).hexdigest()
    return {"generated_at": GENERATED_AT, "catalog_hash": catalog_hash, "units": units_out}


def self_check(catalog):
    """FAIL 이 하나라도 있으면 exit 1. 결과는 표로 stdout 에 낸다."""
    all_sets = [s for u in catalog["units"] for s in u["sets"]]
    ids = [s["id"] for s in all_sets]
    checks = [
        ("단위 수", 5, len(catalog["units"])),
        ("세트 수 (5 x 30)", 150, len(all_sets)),
        ("난이도 폐쇄어휘 적합", 150, sum(1 for s in all_sets if s["difficulty"] in DIFFICULTY_VOCAB)),
        ("id 중복", 0, len(ids) - len(set(ids))),
        ("id 정규식 적합", 150, sum(1 for i in ids if SET_ID_RE.match(i or ""))),
        ("제목 빈 값", 0, sum(1 for s in all_sets if not (s["title"] or "").strip())),
        ("제목 em대시, 가운뎃점", 0,
         sum(1 for s in all_sets if any(c in s["title"] for c in EM_DASHES + MIDDLE_DOTS))),
        ("단위별 30세트", 5, sum(1 for u in catalog["units"] if u["set_count"] == 30)),
    ]
    width = max(len(c[0]) for c in checks)
    print("%-*s %8s %8s %6s" % (width, "검사", "기대", "실측", "판정"))
    print("-" * (width + 26))
    failed = 0
    for name, want, got in checks:
        ok = want == got
        if not ok:
            failed += 1
        print("%-*s %8s %8s %6s" % (width, name, want, got, "PASS" if ok else "FAIL"))
    print("-" * (width + 26))

    from collections import Counter
    diff = Counter(s["difficulty"] for s in all_sets)
    print("난이도 분포: " + ", ".join("%s %d" % (k, diff[k]) for k in DIFFICULTY_VOCAB))
    print("해설 대본 보유 세트: %d / 150" % sum(1 for s in all_sets if s["explain_script"]))
    for u in catalog["units"]:
        cnt = sum(1 for s in u["sets"] if s["explain_script"])
        print("  %-12s %2d세트 대본, 난이도 %s" % (
            u["code"], cnt,
            ", ".join("%s %d" % (k, Counter(s["difficulty"] for s in u["sets"])[k]) for k in DIFFICULTY_VOCAB)))
    print("catalog_hash: %s" % catalog["catalog_hash"])
    return failed


def main():
    catalog = build()
    failed = self_check(catalog)
    if failed:
        sys.exit(1)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    text = json.dumps(catalog, ensure_ascii=False, indent=1, sort_keys=False) + "\n"
    open(OUT_PATH, "w", encoding="utf-8").write(text)
    print("wrote %s (%d bytes)" % (OUT_PATH, len(text.encode("utf-8"))))


if __name__ == "__main__":
    main()
