#!/usr/bin/env python3
"""학교별 2027 면접 가이드북 상품군 페이지 생성기 (결정론).

서브커맨드
  refresh  원천(interview_guidebook_2027/export/site/*.json + PDF 면수)을 읽어
           _tools/guidebook_catalog.json 을 재박제한다. 가격(price) 필드는 보존.
  build    카탈로그만 읽어 guidebook/index.html + 판매 중(onsale) 권만 guidebook/<slug>.html 로 쓴다 (비판매는 면 자체를 만들지 않는다, 2026-09-04 건우 지시). 플랫폼 v2 템플릿 2종.
  verify   산출 검증: 멱등(재생성 바이트 동일), 상대 링크 실재, <style> 금지 속성,
           hex 색상, 금지 문자, 명단(roster) 문자열 0 건.
  seo      검색 유입 축(SEARCH 표 + 유형별 골격)으로 _tools/seo_manifest.json 의 guidebook/ 39면
           title, description, answer 를 재박제한다 (--dry-run 은 표만 출력).

가격: 카탈로그 최상위 "price" 한 곳이 전 권 기본값. 개별 항목 "price" 가 null 이면 상속.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
CATALOG = SITE / "_tools" / "guidebook_catalog.json"
OUT = SITE / "guidebook"
SRC_DEFAULT = Path.home() / "Workspace" / "interview_guidebook_2027"

# slug ↔ 학교명 (고정). 앞 26 = 면접 아카이브(interview/<slug>.html) 보유, 뒤 12 = 신규.
SLUGS = [
    ("ajou", "아주대학교"), ("catholic", "가톨릭대학교"), ("cau", "중앙대학교"),
    ("dongguk", "동국대학교"), ("ewha", "이화여자대학교"), ("gachon", "가천대학교"),
    ("hufs", "한국외국어대학교"), ("inha", "인하대학교"), ("khu", "경희대학교"),
    ("knu", "경북대학교"), ("konkuk", "건국대학교(서울)"), ("kookmin", "국민대학교"),
    ("korea", "고려대학교(서울)"), ("kwangwoon", "광운대학교"), ("kyonggi", "경기대학교"),
    ("myongji", "명지대학교"), ("pusan", "부산대학교"), ("sejong", "세종대학교"),
    ("seoultech", "서울과학기술대학교"), ("skku", "성균관대학교"), ("snu", "서울대학교"),
    ("sookmyung", "숙명여자대학교"), ("soongsil", "숭실대학교"), ("sungshin", "성신여자대학교"),
    ("uos", "서울시립대학교"), ("yonsei", "연세대학교(서울)"),
    ("dgist", "DGIST(대구경북과학기술원)"), ("dankook", "단국대학교(죽전)"),
    ("duksung", "덕성여자대학교"), ("dongduk", "동덕여자대학교"), ("donga", "동아대학교"),
    ("pknu", "부경대학교"), ("sahmyook", "삼육대학교"), ("swu", "서울여자대학교"),
    ("ulsan", "울산대학교"), ("incheon", "인천대학교"), ("hanyang-erica", "한양대학교(ERICA)"),
    ("hongik", "홍익대학교(서울)"),
]
ARCHIVE = {s for s, _ in SLUGS[:26]}
DEFAULT_PRICE = 33000
SAMPLE_MAX = 4
SAMPLE_LEN = 120

# ---------------------------------------------------------------- 검색 유입 축 (2026-09-03)
# 검색어 "OO대 면접", "OO대 [전형명] 면접" 정합. slug -> 짧은 대학명(u), 대표 전형 1~2개(rep), 의약학 전형(med),
# 교과 면접 전형(edu), 제시문 또는 MMI 병행 전형(alt). n = 검색어형 짧은 전형명 (seo 서브커맨드가 meta v3 의
# tracks/spec_tracks 문자열에 실재하는지 대조한다), f = 면접 형태 라벨 (meta tracks[].form 요약), k = title 용 형태 키워드.
# 유형 판정 seo_type(): 스튜디오 2권(e1) -> 비판매 준비 중(e2) -> med(b) -> edu(d) -> alt(c) -> 서류기반 단일(a).
# 유형별 title/description/answer 골격은 seo_texts() 에, 표는 _docs/SEO_TITLE_LEDGER_20260903.md 에.
STUDIO = ("yonsei", "korea")
AUTHOR = "13년차 대치동 입시 컨설턴트"   # about.html "대치OOO학원 부원장, 입시 컨설턴트 13년차" 근거


def T(n, f, k=None):
    d = {"n": n, "f": f}
    if k:
        d["k"] = k
    return d


SEARCH = {
    "ajou": {"u": "아주대", "rep": [T("ACE전형", "서류기반 면접"), T("첨단융합인재전형", "서류기반 면접")],
             "med": T("ACE전형 의학과", "서류기반과 제시문 혼합 면접")},
    "catholic": {"u": "가톨릭대", "rep": [T("잠재능력우수자면접전형", "서류기반 면접"), T("학교장추천전형", "서류기반 면접")],
                 "med": T("학교장추천전형 의예과", "서류기반과 인적성 제시문 혼합 면접")},
    "cau": {"u": "중앙대", "rep": [T("CAU탐구형인재", "서류기반 면접"), T("성장형인재", "서류기반 면접")],
            "med": T("융합형인재 의학부", "서류기반 면접")},
    "dongguk": {"u": "동국대", "rep": [T("Do Dream", "서류기반 면접"), T("불교추천인재", "서류기반 면접")]},
    "ewha": {"u": "이화여대", "rep": [T("미래인재전형(면접형)", "서류기반 면접"), T("예체능서류전형", "서류기반 면접")]},
    "gachon": {"u": "가천대", "rep": [T("가천바람개비", "서류기반 면접")], "med": T("가천의약학", "서류기반 면접")},
    "hufs": {"u": "한국외대", "rep": [T("학생부종합전형(면접형)", "서류기반 면접")]},
    "inha": {"u": "인하대", "rep": [T("인하미래인재(면접형)", "서류기반 면접")], "med": T("의예과", "서류기반 면접")},
    "khu": {"u": "경희대", "rep": [T("네오르네상스전형", "서류기반 면접")]},
    "knu": {"u": "경북대", "rep": [T("지역인재전형", "서류기반 면접"), T("지역의사선발전형", "서류기반과 인적성 혼합 면접")]},
    "konkuk": {"u": "건국대", "rep": [T("KU자기추천", "서류기반 면접")]},
    "kookmin": {"u": "국민대", "rep": [T("국민프런티어", "서류기반 면접"), T("국제인재", "서류기반 면접")]},
    "korea": {"u": "고려대", "rep": [T("계열적합전형", "제시문 면접"), T("고른기회전형", "제시문 면접")]},
    "kwangwoon": {"u": "광운대", "rep": [T("광운참빛인재전형 I(면접형)", "서류기반 면접"), T("소프트웨어우수인재전형", "서류기반 면접")]},
    "kyonggi": {"u": "경기대", "rep": [T("KGU학생부종합전형", "서류기반 면접"), T("SW우수자전형", "서류기반 면접")],
                "alt": T("디자인학부", "과제 제시 발표와 서류기반 혼합 면접", k="과제 발표 혼합형")},
    "myongji": {"u": "명지대", "rep": [T("명지인재면접전형", "서류기반 면접"), T("크리스천리더전형", "서류기반 면접")],
                "edu": T("교과면접전형", "인적성 면접(인성면접)")},
    "pusan": {"u": "부산대", "rep": [T("학생부종합전형", "서류기반 면접"), T("지역인재전형", "서류기반 면접")],
              "med": T("의예과", "서류기반과 제시문 혼합 면접")},
    "sejong": {"u": "세종대", "rep": [T("세종인재전형(면접형)", "서류기반 면접")],
               "alt": T("창의소프트학부", "제시문과 서류기반 혼합 면접", k="제시문 혼합형")},
    "seoultech": {"u": "서울과기대", "rep": [T("학교생활우수자전형", "서류기반 면접"), T("창의융합인재전형", "서류기반 면접")]},
    "skku": {"u": "성균관대", "rep": [T("성균인재전형", "모집단위별로 서류기반, 혼합형, 제시문 면접"), T("과학인재전형", "제시문 면접(교과형)")]},
    "snu": {"u": "서울대", "rep": [T("지역균형전형", "서류기반 면접")],
            "alt": T("일반전형", "제시문 면접, 의대 등은 MMI", k="제시문, MMI")},
    "sookmyung": {"u": "숙명여대", "rep": [T("숙명인재(면접형)", "서류기반 면접"), T("소프트웨어인재전형", "서류기반 면접")]},
    "soongsil": {"u": "숭실대", "rep": [T("SSU미래인재(면접형)", "서류기반 면접"), T("SW우수자", "서류기반 면접")]},
    "sungshin": {"u": "성신여대", "rep": [T("자기주도인재", "서류기반 면접")]},
    "uos": {"u": "서울시립대", "rep": [T("학생부종합전형Ⅰ(면접형)", "서류기반 면접"), T("기회균형전형Ⅰ(면접형)", "서류기반 면접")]},
    "yonsei": {"u": "연세대", "rep": [T("활동우수형", "제시문 면접"), T("국제형", "제시문 면접(영어 제시문 가능)")]},
    "dgist": {"u": "DGIST", "rep": [T("과학인재전형", "서류기반 면접")]},
    "dankook": {"u": "단국대", "rep": [T("DKU인재(면접형)", "서류기반 면접"), T("SW인재", "서류기반 면접")]},
    "duksung": {"u": "덕성여대", "rep": [T("덕성인재전형Ⅱ", "서류기반 면접")]},
    "dongduk": {"u": "동덕여대", "rep": [T("동덕창의리더전형", "서류기반 면접")]},
    "donga": {"u": "동아대", "rep": [T("잠재능력우수자", "서류기반 면접"), T("학교생활우수자", "서류기반 면접")]},
    "pknu": {"u": "부경대", "rep": [T("학교생활우수인재", "서류기반 면접"), T("창의인재", "제시문 면접(택일 구상형)")]},
    "sahmyook": {"u": "삼육대", "rep": [T("세움인재", "서류기반 면접"), T("S/W인재", "서류기반 면접")],
                 "alt": T("예체능인재", "제시문 면접(선택형)과 개별질문", k="제시문")},
    "swu": {"u": "서울여대", "rep": [T("바롬인재면접전형", "서류기반 면접"), T("SW융합인재", "서류기반 면접")]},
    "ulsan": {"u": "울산대", "rep": [T("학생부종합(면접형)", "서류기반 면접")], "med": T("의예과", "서류기반과 제시문 혼합 면접"),
              "edu": T("학생부교과 면접", "서류기반과 인적성 혼합 면접")},
    "incheon": {"u": "인천대", "rep": [T("자기추천전형", "서류기반 면접")], "edu": T("INU교과전형", "제시문 면접(공통문제형)")},
    "hanyang-erica": {"u": "한양대 ERICA", "rep": [T("학생부종합(면접형)", "서류기반 면접")]},
    "hongik": {"u": "홍익대", "rep": [T("미술우수자전형", "제시문과 서류기반 혼합 면접")]},
}
SEO_TYPES = {"a": "서류기반 단일", "b": "의약학 병기", "c": "제시문/MMI 병행", "d": "교과 면접 병행",
             "e1": "비판매, 스튜디오 안내", "e2": "비판매, 2027 판 준비 중", "f": "스튜디오 LP"}


def seo_type(slug, sale):
    if slug in STUDIO:
        return "e1"
    if not sale:
        return "e2"
    s = SEARCH[slug]
    return "b" if "med" in s else "d" if "edu" in s else "c" if "alt" in s else "a"


def _norm(s):
    return re.sub(r"[^가-힣A-Za-z0-9]", "", str(s))


def ground_check(meta):
    """SEARCH 표의 전형명이 meta v3 tracks/spec_tracks 문자열에 실재하는지 대조 (공백, 괄호, 로마숫자 무시)."""
    bad = []
    for slug, s in SEARCH.items():
        pool = _norm(" ".join([t["track"] for t in meta[slug].get("tracks", [])] + list(meta[slug].get("spec_tracks", []))))
        for x in s["rep"] + [s[k] for k in ("med", "edu", "alt") if k in s]:
            if _norm(x["n"]) not in pool:
                bad.append(f"{slug}: {x['n']!r}")
    if bad:
        sys.exit("SEARCH 전형명이 meta v3 에 없음: " + "; ".join(bad))
    missing = [s for s, _ in SLUGS if s not in SEARCH]
    if missing:
        sys.exit(f"SEARCH 누락: {missing}")


def _fit(cands, lo, hi):
    """길이 범위에 드는 첫 후보. 없으면 정지 (조용한 초과 금지)."""
    for c in cands:
        if lo <= len(c) <= hi:
            return c
    sys.exit(f"길이 {lo}~{hi} 후보 없음: " + " / ".join(f"{len(c)}자" for c in cands) + f" :: {cands[-1]}")


def _wa(word):
    return "과" if _eun(word) == "은" else "와"


def studio_prices(slug):
    """스튜디오 LP 의 manifest offers 에서 전권(pass-*)과 지문 1편(passage-single) 가격. 가격 SoT 는 manifest 한 곳."""
    import seo_common as _C
    offers = ((_C.load_manifest()["pages"].get(f"programs/{slug}.html") or {}).get("schema") or {}).get("offers") or []
    pas = next((o["price"] for o in offers if str(o.get("sku") or "").startswith("pass-")), None)
    single = next((o["price"] for o in offers if o.get("sku") == "passage-single"), None)
    if pas is None or single is None:
        sys.exit(f"programs/{slug}.html manifest offers 에 pass-*/passage-single 가격 없음")
    return int(pas), int(single)


def seo_texts(e, mv, cat):
    """유형별 title / description(70~110) / answer(40~110). 가운뎃점, em대시 0. 수치는 meta v3 와 카탈로그 실측만."""
    slug = e["slug"]
    s = SEARCH[slug]
    U = s["u"]
    sale = bool(e.get("onsale", True))
    kind = seo_type(slug, sale)
    q, r = mv["questions"], mv["rules"]
    y = f"{mv['years'][0]}~{mv['years'][1]}" if mv["years"][0] != mv["years"][1] else str(mv["years"][0])
    price = won(price_of(cat, e))
    reps = s["rep"]
    R1, F1 = reps[0]["n"], reps[0]["f"]
    R2 = reps[1]["n"] if len(reps) > 1 else ""
    r12 = R1 + (f", {R2}" if R2 else "")
    au = f"{AUTHOR} 편집"
    if kind == "a":
        title = f"{U} {R1} 면접 가이드북 2027, 서류기반 면접 기출 {q}문과 생기부 질문 규칙 {r}개"
        desc = _fit([
            f"{U} {r12} 서류기반 면접 가이드북. 선배 후기 {y} 기출 {q}문과 생기부에서 질문을 뽑는 규칙 {r}개, 전형별 제원과 준비 전략. 권당 {price}, {au}.",
            f"{U} {r12} 서류기반 면접 가이드북. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개, 전형별 제원과 준비 전략. 권당 {price}, {au}.",
            f"{U} {r12} 서류기반 면접 가이드북. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개, 준비 전략. 권당 {price}, {au}.",
            f"{U} {R1} 서류기반 면접 가이드북. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개, 준비 전략. 권당 {price}, {au}.",
            f"{U} {R1} 서류기반 면접 가이드북. 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
        ], 70, 110)
        answer = f"{U} {R1} 면접은 {F1}입니다. 이 가이드북은 기출 {q}문과 생기부 질문 규칙 {r}개를 담았고 권당 {price}입니다."
    elif kind == "b":
        M, FM = s["med"]["n"], s["med"]["f"]
        title = f"{U} {R1}, {M} 면접 가이드북 2027, 기출 {q}문과 생기부 질문 규칙 {r}개, {price}"
        desc = _fit([
            f"{U} {R1} 면접과 {M} 면접을 한 권에. 전형별 면접 형태 판정표, 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개, 준비 전략. 권당 {price}, {au}.",
            f"{U} {R1} 면접과 {M} 면접을 한 권에. 전형별 면접 형태 판정표, 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
            f"{U} {R1}, {M} 면접 가이드북. 전형별 판정표, 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
            f"{U} {R1}, {M} 면접 가이드북. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
            f"{U} {R1}, {M} 면접 가이드북. 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
        ], 70, 110)
        if F1 == FM:
            answer = f"{U} {R1}{_wa(R1)} {M} 면접은 모두 {F1}입니다. 기출 {q}문과 생기부 질문 규칙 {r}개를 담은 가이드북, 권당 {price}."
        else:
            answer = _fit([
                f"{U} {R1} 면접은 {F1}, {M} 면접은 {FM}입니다. 기출 {q}문과 생기부 질문 규칙 {r}개를 담은 가이드북, 권당 {price}.",
                f"{U} {R1} 면접은 {F1}, {M} 면접은 {FM}입니다. 기출 {q}문, 생기부 질문 규칙 {r}개, 권당 {price}.",
            ], 40, 110)
    elif kind == "c":
        A, FA, K = s["alt"]["n"], s["alt"]["f"], s["alt"]["k"]
        title = f"{U} {R1}, {A} 면접 가이드북 2027, 서류기반, {K} 전형별 판정과 기출 {q}문"
        desc = _fit([
            f"{U} 면접은 전형에 따라 갈립니다. {R1}{_eun(R1)} {F1}, {A}{_eun(A)} {FA}. 전형별 판정표와 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
            f"{U} {R1}{_eun(R1)} {F1}, {A}{_eun(A)} {FA}. 전형별 판정표, 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
            f"{U} {R1}, {A} 면접 가이드북. 전형별 형태 판정표, 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
            f"{U} {R1}, {A} 면접 가이드북. 전형별 판정표, 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
        ], 70, 110)
        answer = _fit([
            f"{U} {R1} 면접은 {F1}, {A} 면접은 {FA}입니다. 전형별 판정표와 기출 {q}문, 생기부 질문 규칙 {r}개, 권당 {price}.",
            f"{U} {R1} 면접은 {F1}, {A} 면접은 {FA}입니다. 기출 {q}문, 생기부 질문 규칙 {r}개, 권당 {price}.",
        ], 40, 110)
    elif kind == "d":
        E, FE = s["edu"]["n"], s["edu"]["f"]
        title = f"{U} {R1}, {E} 면접 가이드북 2027, 학종과 교과 면접 기출 {q}문과 생기부 질문 규칙 {r}개"
        desc = _fit([
            f"{U} {R1}(학종)과 {E}(교과)의 면접 형태를 전형별로 판정합니다. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개, 준비 전략. 권당 {price}, {au}.",
            f"{U} {R1}(학종)과 {E}(교과)의 면접 형태를 전형별로 판정합니다. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
            f"{U} {R1}(학종), {E}(교과) 면접 가이드북. 기출 {q}문, 생기부 질문 규칙 {r}개. 권당 {price}, {au}.",
        ], 70, 110)
        answer = _fit([
            f"{U} {R1} 면접은 {F1}, {E} 면접은 {FE}입니다. 기출 {q}문과 생기부 질문 규칙 {r}개를 담은 가이드북, 권당 {price}.",
            f"{U} {R1} 면접은 {F1}, {E} 면접은 {FE}입니다. 기출 {q}문, 생기부 질문 규칙 {r}개, 권당 {price}.",
        ], 40, 110)
    elif kind == "e1":
        title = f"{U} {R1} 면접 준비, 2027 서류기반 가이드북 없음, 제시문 면접 스튜디오 안내"
        desc = _fit([
            f"{U} {r12} 면접은 제시문형이라 2027 서류기반 가이드북을 내지 않습니다. 기출 지문으로 실전 규격 응시와 촬영 첨삭을 받는 {U} 제시문 면접 스튜디오로 안내합니다. {AUTHOR} 운영.",
            f"{U} {R1} 면접은 제시문형이라 2027 서류기반 가이드북을 내지 않습니다. 기출 지문 응시와 촬영 첨삭의 {U} 제시문 면접 스튜디오로 안내합니다. {AUTHOR} 운영.",
            f"{U} {R1} 면접은 제시문형이라 2027 서류기반 가이드북을 내지 않습니다. {U} 제시문 면접 스튜디오로 안내합니다. {AUTHOR} 운영.",
        ], 70, 110)
        answer = f"{U} 2027 서류기반 면접 가이드북은 없습니다. {R1} 제시문 면접은 기출 지문 응시와 촬영 첨삭의 {U} 제시문 면접 스튜디오에서 준비합니다."
    else:  # e2
        title = f"{U} {R1} 면접 가이드북 2027 판 준비 중, 기출 {q}문과 생기부 질문 규칙 {r}개 구성"
        desc = _fit([
            f"{U} {r12} 면접 가이드북 2027 판은 준비 중입니다. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개, 전형별 제원 구성. 판매 개시는 공지로 알립니다. {au}.",
            f"{U} {r12} 면접 가이드북 2027 판은 준비 중입니다. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개 구성. 판매 개시는 공지로 알립니다. {au}.",
            f"{U} {r12} 면접 가이드북 2027 판은 준비 중입니다. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개 구성, 판매 개시는 공지로. {au}.",
            f"{U} {R1} 면접 가이드북 2027 판은 준비 중입니다. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개 구성, 판매 개시는 공지로. {au}.",
            f"{U} {R1} 면접 가이드북 2027 판은 준비 중입니다. 선배 후기 {y} 기출 {q}문, 생기부 질문 규칙 {r}개 구성. {au}.",
        ], 70, 110)
        answer = f"{U} {R1} 면접 가이드북 2027 판은 준비 중이며 판매 개시는 공지로 알립니다. 기출 {q}문과 생기부 질문 규칙 {r}개 구성."
    out = {"type": kind, "rep": r12, "title": title, "description": desc, "answer": answer}
    for k, v in out.items():
        if any(ch in v for ch in ("·", "—")):
            sys.exit(f"{slug} {k}: 가운뎃점/em대시 포함")
    if not 40 <= len(answer) <= 110:
        sys.exit(f"{slug} answer {len(answer)}자: {answer}")
    return out


def seo_hub_texts(cat, items, meta):
    sale = [e for e in items if e.get("onsale", True)]
    n = len(sale)
    price = won(int(cat["price"]))
    Q = sum(meta[e["slug"]]["questions"] for e in sale)
    R = sum(meta[e["slug"]]["rules"] for e in sale)
    au = f"{AUTHOR} 편집"
    return {"type": "hub", "rep": f"{n}개 대학, 기출 {Q:,}문, 규칙 {R:,}개 (meta v3 합, 지면 미인용)",
            "title": f"대학별 면접 가이드북 2027, {n}개 대학 면접 기출과 생기부 질문 규칙, 권당 {price}",
            # 총 문항 수는 싣지 않는다: 홈(index.html)과 about.html 의 "질문 3,065개, 1,178면" 은 구 실측이고 meta v3 합은
            # 3,934문, 1,139면 (2026-09-03 실측). 두 값이 지면에 같이 서면 거짓 문장이 된다. 정합 후 건우 결재로 복원.
            "description": _fit([
                f"대학별 면접 가이드북 2027, {n}개 대학 판매 중. 대학마다 전형별 면접 형태 판정, 선배 후기 실제 기출, 생기부에서 질문을 뽑는 규칙, 준비 전략. 권당 {price}, {au}.",
                f"대학별 면접 가이드북 2027, {n}개 대학 판매 중. 전형별 면접 형태 판정, 실제 기출, 생기부 질문 규칙, 준비 전략. 권당 {price}, {au}.",
            ], 70, 110),
            "answer": f"대학별 면접 가이드북 2027은 {n}개 대학, 권당 {price}입니다. 대학마다 면접 형태 판정, 실제 기출, 생기부 질문 규칙, 준비 전략을 담았고 보안 리더로 열람합니다."}



# ---------------------------------------------------------------- 텍스트 정리
def clean(s):
    """가운뎃점, em 대시, 마크다운 강조, 화살표 제거. 결정론."""
    if s is None:
        return ""
    s = s.replace("**", "")
    s = re.sub(r"\s*\(?\s*★?\s*엔진 핵심\s*\)?", "", s)
    s = s.replace("★", "")
    s = re.sub(r"[➊-➓①-⑳]\s*", "", s)
    s = re.sub(r"\s*→\s*", "에서 ", s)
    for ch in ("·", "∙", "‧", "・", "•", "—", "–"):
        s = s.replace(ch, ", ")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s*,\s*,\s*", ", ", s)
    return s


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def won(n):
    return f"{n:,}원"


# ---------------------------------------------------------------- refresh
def pdf_pages(path):
    if not path.is_file():
        raise FileNotFoundError(f"PDF 없음: {path}")
    r = subprocess.run(["mdls", "-name", "kMDItemNumberOfPages", "-raw", str(path)],
                       capture_output=True, text=True)
    raw = r.stdout.strip()
    if r.returncode == 0 and raw.isdigit():
        return int(raw)
    # 외부 저장소는 Spotlight 메타데이터가 없어도 PDF 자체는 정상일 수 있다.
    r = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True)
    m = re.search(r"^Pages:\s+(\d+)\s*$", r.stdout, flags=re.M)
    if r.returncode != 0 or not m:
        raise RuntimeError(f"PDF 면수 판독 실패: {path}: {r.stderr.strip()}")
    return int(m.group(1))


def extract(univ, src):
    site_json = src / "export" / "site" / f"{univ}.json"
    if not site_json.is_file():
        raise FileNotFoundError(f"site export 없음: {site_json}")
    d = json.load(open(site_json, encoding="utf-8"))
    if d.get("univ") != univ:
        raise ValueError(f"{univ}: export/site univ 불일치: {d.get('univ')!r}")
    qgroups = d.get("qgroups")
    counts = d.get("counts")
    if not isinstance(qgroups, list) or not isinstance(counts, dict):
        raise ValueError(f"{univ}: export/site qgroups 또는 counts 계약 누락")
    for key in ("questions", "rules", "types"):
        if not isinstance(counts.get(key), int):
            raise ValueError(f"{univ}: export/site counts.{key} 정수 누락")
    if counts["types"] != len(qgroups):
        raise ValueError(f"{univ}: counts.types={counts['types']} != qgroups={len(qgroups)}")

    pdf = src / "dist_hyunhak_clean" / f"{univ}_2027면접가이드북.pdf"
    types = []
    samples = []
    for i, g in enumerate(qgroups):
        name = g.get("type")
        items = g.get("items")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"{univ}: qgroups[{i}].type 누락")
        if not isinstance(items, list) or not items:
            raise ValueError(f"{univ}: qgroups[{i}].items 비어 있음")
        q = items[0].get("q") if isinstance(items[0], dict) else None
        if not isinstance(q, str) or not q.strip():
            raise ValueError(f"{univ}: qgroups[{i}].items[0].q 누락")
        public_type = clean(name)
        # 원류의 일부 임시 유형명 끝에 붙은 문항 개수는 화면용 유형명이 아니다.
        public_type = re.sub(r"\s+[—–]\s+.*\d+\s*(?:문|건|개|종|세트).*$", "", public_type).strip()
        types.append(public_type)
        if len(samples) < SAMPLE_MAX:
            q = clean(q)
            if len(q) > SAMPLE_LEN:
                q = q[:SAMPLE_LEN].rstrip() + "…"
            samples.append({"type": public_type, "q": q})
    return {
        "name": univ,
        "file": pdf.name,
        "pages": pdf_pages(pdf),
        "questions": counts["questions"],
        "types_n": counts["types"],
        "types": types,
        "samples": samples,
    }


def cmd_refresh(args):
    src = Path(args.src).expanduser()
    old = json.load(open(CATALOG, encoding="utf-8")) if CATALOG.exists() else {}
    old_items = {e["slug"]: e for e in old.get("items", [])}
    items = []
    for slug, univ in SLUGS:
        e = extract(univ, src)
        e = {"slug": slug, "sku": f"guide-{slug}", "price": old_items.get(slug, {}).get("price"),
             "onsale": old_items.get(slug, {}).get("onsale", True),
             "archive": slug in ARCHIVE, **e}
        items.append(e)
    cat = {
        "_note": "_tools/build_guidebook.py refresh 가 박제. price 최상위 1 곳 = 전 권 기본값, 항목 price null = 상속.",
        "year": 2027,
        "price": old.get("price", DEFAULT_PRICE),
        "items": items,
    }
    CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"catalog: {len(items)} items, pages={sum(i['pages'] for i in items)}, "
          f"questions={sum(i['questions'] for i in items)} -> {CATALOG}")


# ---------------------------------------------------------------- build
# 상품 면 = v3 템플릿 (2026-08-26 현학적 연구소 편집본). 셸(헤더, 푸터, 모바일 바)은 자리표시를
# apply_nav/apply_footer 가 채우고, seo 블록과 aeo 단락은 seo_inject 가 manifest 로 넣는다.
# 소구 수치·구조·미리보기 목록 = _tools/guidebook_meta_v3.json (build_previews.py 가 박제).
PAGE_TPL = Path(__file__).with_name("guidebook_page_v3.html")
META_V3 = Path(__file__).with_name("guidebook_meta_v3.json")


def load_meta():
    if not META_V3.exists():
        sys.exit("guidebook_meta_v3.json 없음: 먼저 _tools/build_previews.py")
    return json.load(open(META_V3, encoding="utf-8"))


def fill(tpl, m):
    for k, v in m.items():
        tpl = tpl.replace(k, v)
    left = tpl.replace("__proto__", "")
    if "__" in left:
        raise RuntimeError("템플릿 placeholder 잔존: " + left[left.find("__"):left.find("__") + 30])
    return tpl


def price_of(cat, e):
    return e["price"] if e.get("price") is not None else cat["price"]


# 개별 PDF 소장판 가격 = 원격 D1 실측 snapshot (2026-08-30 건우 결재: 상세면에 소장판 담기 버튼 신설 —
# JSON-LD 가 선언한 -pdf offer 의 실구매 동선). 로더 = seo_common 공용 strict 게이트 (r2 R11):
# 부재·손상·낡음이면 빌드가 서고, type 이 digital_file 이 아닌 -pdf 는 버튼을 만들지 않는다.
def _pdf_prices():
    import seo_common as _C
    status = _C.load_products_status(required=True)
    # 짝 있는 낱권 -pdf(기저 guide-<slug> 가 digital)의 type 이 digital_file 이 아니면 정합 붕괴 —
    # 조용히 버튼만 빼면 SEO(JSON-LD offer)와 지면이 서로 다른 이야기를 한다 (Codex r3 REQ8). 빌드를 세운다.
    # 전권 번들(guide-all-pdf 등 기저가 번들형)은 낱권 버튼 대상이 아니라 검사 밖.
    bad = [sku for sku, r in status.items()
           if sku.endswith("-pdf") and r.get("status") == "active" and r.get("type") != "digital_file"
           and status.get(sku[:-4], {}).get("type") == "digital"]
    if bad:
        sys.exit(f"products_status 정합 붕괴: active -pdf 의 type 이 digital_file 이 아님 → {', '.join(sorted(bad))}")
    return {sku: int(r["price"]) for sku, r in status.items()
            if sku.endswith("-pdf") and r.get("status") == "active"
            and r.get("type") == "digital_file" and r.get("price") is not None}


PDF_PRICES = _pdf_prices()


def _part_of(page, dividers):
    """면 번호가 속한 부 (1~5). 간지 면 자신도 그 부에 속한다."""
    part = 0
    for i, d in enumerate(dividers, 1):
        if page >= d:
            part = i
    return part


def _previews_html(mv):
    out = []
    labels = {"cover": "표지", "toc": "차례와 쓰는 법"}
    for i, pv in enumerate(mv["previews"]):
        kind = pv["kind"]
        part = _part_of(pv["page"], mv["dividers"])
        if kind in labels:
            label = labels[kind]
        elif kind == "part":
            label = f"{part}부 들어가는 면"
        else:
            label = f"{part}부 본문, 흐림"
        lock = '<span class="lk">구매 후 선명</span>' if kind == "body" else ""
        lazy = ' loading="lazy"' if i > 1 else ""
        alt = f"{clean(mv['name'])} 가이드북 {pv['page']}면 {label}"
        out.append(
            f'      <figure class="pv"><a href="../{pv["file"]}" target="_blank" rel="noopener" aria-label="{esc(label)} 크게 보기">'
            f'<img src="../{pv["file"]}" alt="{esc(alt)}" width="{pv["w"]}" height="{pv["h"]}"{lazy}></a>{lock}'
            f'<figcaption><span>{esc(label)}</span><span>p.{pv["page"]}</span></figcaption></figure>')
    return "\n".join(out)


def _parts_html(mv):
    out = []
    # meta_v3.toc_subs에는 질문·규칙 카운트가 섞여 있으므로 화면 문구로 쓰지 않는다.
    # 부 제목의 의미만 남긴 고정 설명을 사용하고, 원천 수치는 내부 메타에 보존한다.
    subs = {
        1: "서류기반｜제시문｜MMI, 전형별 형태 판정",
        2: "전형별 제원｜이 대학이 찾는 학생",
        3: "선배 후기에서 회수한 실제 질문, 유형별, 모집단위와 연도",
        4: "생기부에서 질문 뽑는 전환 규칙",
        5: "타 대학 대비 차이｜준비 전략",
    }
    for i, pt in enumerate(mv["parts"]):
        sub = subs.get(int(pt["no"]), "")
        out.append(
            f'      <div class="p5"><span class="no">{pt["no"]}</span><div><h3>{esc(clean(pt["title"]))}</h3>'
            f'<p class="d">{esc(sub)}</p></div></div>')
    return "\n".join(out)


def _forms_html(mv):
    out = []
    for f in mv.get("forms", []):
        if "확인 필요" in f["form"]:
            continue
        on = f["has"]
        out.append(f'      <div class="f {"on" if on else "off"}"><b>{esc(clean(f["form"]))}</b>'
                   f'<span>{"이 대학에 있음" if on else "이 대학에 없음"}</span></div>')
    return "\n".join(out)


def _tracks_html(mv):
    out = []
    for t in mv.get("tracks", [])[:6]:
        out.append(f'      <li><span class="t">{esc(clean(t["track"]))}</span><span class="f">{esc(clean(t["form"]))}</span></li>')
    return "\n".join(out)


def _chips(items, limit):
    return "\n".join(f'      <span>{esc(clean(x))}</span>' for x in items[:limit])


def _rules3_html(mv):
    out = []
    for r in mv.get("rule_list", [])[:3]:
        out.append(f'      <div class="r"><span class="cd">{esc(r["code"])}</span><span class="ar">{esc(clean(r["area"]))}</span>'
                   f'<p><b>언제</b> {esc(clean(r["when"]))}</p></div>')
    return "\n".join(out)


def _strat_sec_html(mv):
    strat = mv.get("strategies", [])
    if not strat:
        return ""
    out = []
    for i, stt in enumerate(strat[:8], 1):
        m = re.match(r"(S\d+)\.\s*(.*)", stt)
        no, txt = (m.group(1), m.group(2)) if m else (f"{i:02d}", stt)
        out.append(f'      <li><span class="sn">{esc(no)}</span><span>{esc(clean(txt))}</span></li>')
    more = len(strat) - len(strat[:8])
    tail = '\n    <p class="rlock">전략의 제목 일부입니다. 본문과 근거는 책에서.</p>' if more > 0 else ""
    return ('  <section class="sec">\n'
            '    <div class="sh rv"><div><h2>5부 준비 전략</h2><p>이 대학만의 차이에서 나온 전략. 제목만 싣습니다.</p></div></div>\n'
            '    <ol class="strat rv">\n' + "\n".join(out) + '\n    </ol>' + tail + '\n  </section>')


def _eun(word):
    """은/는 조사: 마지막 한글 음절의 받침 유무 (괄호, 공백 등 뒤꼬리는 건너뛴다)."""
    for ch in reversed(str(word)):
        o = ord(ch)
        if 0xAC00 <= o <= 0xD7A3:
            return "은" if (o - 0xAC00) % 28 else "는"
        if ch.isdigit():
            return "은" if ch in "013678" else "는"
        if ch.isalpha():
            return "는"
    return "는"


def faq_of(e, mv, price, sale, pdfp):
    """학교별 FAQ 4~5문항 (2026-09-03 검색 유입 축 개편, 구 3문항 대체). 값은 meta v3, 카탈로그, SEARCH 표, manifest 가격에서만 뽑는다.
    답 40~110자 (seo_check 의 AEO 범위와 동일, 범위 밖이면 정지). 반환 = [{"q","a"}] (seo_inject 가 details.faq 에서 FAQPage 로 추출)."""
    slug = e["slug"]
    s = SEARCH[slug]
    name, U = e["name"], s["u"]
    R1 = s["rep"][0]["n"]
    forms = [(x["n"], x["f"]) for x in s["rep"][:2]] + [(s[k]["n"], s[k]["f"]) for k in ("med", "edu", "alt") if k in s]

    def a1_of(n, tail=True):
        part = forms[:n]
        if len(part) > 1 and len({b for _, b in part}) == 1:   # 형태가 전부 같으면 한 문장으로 묶는다
            names = ", ".join(a for a, _ in part)
            body = f"{names}{_eun(part[-1][0])} 모두 {part[0][1]}입니다."
        else:
            body = ", ".join(f"{a}{_eun(a)} {b}" for a, b in part) + "입니다."
        return body + (" 1부 판정표에서 지원 전형의 면접 형태를 확인합니다." if tail else "")
    a1 = _fit([a1_of(3), a1_of(2), a1_of(1), a1_of(2, False), a1_of(3, False)], 40, 110)
    y0, y1 = mv["years"]
    ys = f"{y0}~{y1}년" if y0 != y1 else f"{y0}년"
    q, r, units, ntypes = mv["questions"], mv["rules"], mv.get("units_n"), len(e["types"])
    units_s = f"{units}개 모집단위, " if units else ""
    q1 = f"{name} {R1} 면접은 어떤 형태인가요?"
    if slug in STUDIO:
        pas, single = studio_prices(slug)
        faq = [(q1, a1),
               (f"{name} 면접 기출은 몇 문항 정리돼 있나요?", f"선배 후기 {ys} 기출 {q}문을 {units_s}{ntypes}개 유형으로 정리했습니다."),
               ("생기부에서 질문을 뽑는 규칙은 몇 개인가요?", f"생기부 기재를 질문으로 바꾸는 전환 규칙 {r}개를 정리했습니다. 규칙마다 실제 질문과 꼬리질문이 붙습니다."),
               (f"{name}{_eun(name)} 왜 2027 가이드북이 없나요?", f"{R1} 면접이 제시문형이라 서류기반 가이드북 대신 기출 지문으로 응시하고 촬영 첨삭을 받는 제시문 면접 스튜디오를 운영합니다."),
               (f"{name} 면접은 어디서 준비하나요?", f"{U} 제시문 면접 스튜디오에서 기출 지문 응시와 촬영 첨삭을 받습니다. 전권 {won(pas)} 인강 포함, 지문 1편 {won(single)}.")]
    else:
        a2 = f"선배 후기 {ys}에서 회수한 기출 {q}문을 {units_s}{ntypes}개 유형으로 나눠 3부에 실었습니다."
        a3 = f"4부에 전환 규칙 {r}개가 있습니다. 규칙마다 생기부 기재 조건과 실제 질문, 꼬리질문이 붙습니다."
        if sale:
            q4 = "가격과 열람 기간은 어떻게 되나요?"
            a4 = (f"보안 리더 열람판 {won(price)}" + (f", PDF 소장판 {won(pdfp)}" if pdfp else "")
                  + "입니다. 열람 기간은 구매일부터 1개월, 인쇄는 권당 3회, 원본 파일은 제공하지 않습니다.")
        else:
            q4 = "2027 판은 언제 판매하나요?"
            a4 = f"{name} 2027 판은 보안 리더 준비 중입니다. 판매 개시는 공지에 기록하며, 판매 중인 다른 대학 가이드북은 권당 {won(price)}입니다."
        faq = [(q1, a1), (f"{name} 면접 기출은 몇 문항 실려 있나요?", a2), ("생기부에서 질문을 뽑는 규칙은 몇 개인가요?", a3), (q4, a4)]
    for qq, aa in faq:
        if not 40 <= len(aa) <= 110 or any(ch in qq + aa for ch in ("·", "—")):
            sys.exit(f"{slug} FAQ 답 {len(aa)}자 또는 금지 문자: {qq} / {aa}")
    return [{"q": qq, "a": aa} for qq, aa in faq]


def _faq_html(name, faq, sub="이 가이드북"):
    rows = "\n".join(f'      <details class="faq"><summary>{esc(x["q"])}</summary><div class="a"><p>{esc(x["a"])}</p></div></details>'
                      for x in faq)
    return ('  <section class="sec">\n'
            f'    <div class="sh rv"><div><h2>자주 묻는 질문</h2><p>{esc(name)} 면접과 {sub}에 대해.</p></div></div>\n'
            '    <div class="faqp rv">\n' + rows + '\n    </div>\n  </section>')


def render_page(cat, items, i, meta):
    e = items[i]
    mv = meta[e["slug"]]
    name = e["name"]
    price = price_of(cat, e)
    sale = bool(e.get("onsale", True))
    pdfp = PDF_PRICES.get(e["sku"] + "-pdf")
    h1 = f"{name} 2027 면접 가이드북"
    title = seo_texts(e, mv, cat)["title"]   # manifest 와 같은 골격 (seo 서브커맨드가 같은 함수로 박제)
    studio = e["slug"] in STUDIO
    years = f'{mv["years"][0]}~{mv["years"][1]}' if mv.get("years") else "복수 연도"
    lede = (f"{name} 면접에서 실제로 나온 질문과, 내 생기부에서 질문을 뽑는 전환 규칙. "
            f"선배 후기 {years} 관측과 2027 공식 요강으로 재구성한 현학적 연구소 편집본.")
    if sale:
        pdf_btn = (f'<button type="button" class="btn ghost" data-cart-sku="{esc(e["sku"])}-pdf" data-cart-title="{esc(h1)} PDF 소장판" data-cart-price="{pdfp}">PDF 소장판 담기, {won(pdfp)}</button>\n      '
                   if pdfp else "")
        acts = (f'<button type="button" class="btn" data-cart-sku="{esc(e["sku"])}" data-cart-title="{esc(h1)}" data-cart-price="{price}">담기 <span class="ar" aria-hidden="true">→</span></button>\n'
                f'      {pdf_btn}<a class="btn ghost" href="../cart.html">장바구니 보기</a>')
        badge = '<span class="badge seal">판매 중</span>'
        note = ("결제 후 마이페이지에서 브라우저 보안 리더로 바로 열림. 열람 기간은 구매일부터 1개월. 아직 열지 않은 권은 공급받은 날부터 7일 이내 청약철회 가능."
                + (" PDF 소장판은 워터마크 파일을 발급해 소장." if pdfp else ""))
        final_h2, final_p = "이 학교부터 담기", f"{name} 2027 면접 가이드북, {won(price)}. 보안 리더 열람 1개월."
        final_acts = (f'<button type="button" class="btn" data-cart-sku="{esc(e["sku"])}" data-cart-title="{esc(h1)}" data-cart-price="{price}">담기 <span class="ar" aria-hidden="true">→</span></button>'
                      + (f'<button type="button" class="btn ghost" data-cart-sku="{esc(e["sku"])}-pdf" data-cart-title="{esc(h1)} PDF 소장판" data-cart-price="{pdfp}">PDF 소장판 담기</button>' if pdfp else "")
                      + f'<a class="btn ghost" href="index.html">다른 대학 보기</a>')
        price_block = f'<span class="price">{price:,}원<small>부가세 포함, 보안 리더 열람 1개월</small></span>'
    elif studio:
        # 연세대, 고려대 = 제시문형이라 2027 서류기반 판을 내지 않는다. 착지 = /programs/<slug>.html 면접 스튜디오 (2026-09-03).
        sr = SEARCH[e["slug"]]
        pas, single = studio_prices(e["slug"])
        studio_btn = f'<a class="btn" href="../programs/{e["slug"]}.html">제시문 면접 스튜디오 <span class="ar" aria-hidden="true">→</span></a>'
        acts = studio_btn + '\n      <a class="btn ghost" href="index.html">판매 중인 가이드북</a>'
        badge = '<span class="badge mute">2027 판 없음</span>'
        note = (f"{sr['u']} {sr['rep'][0]['n']} 면접은 제시문형이라 2027 서류기반 가이드북을 내지 않습니다. "
                "기출 지문 응시와 촬영 첨삭은 제시문 면접 스튜디오에서.")
        final_h2, final_p = "제시문 면접 스튜디오로", f"{name} 면접은 스튜디오에서 준비합니다. 전권 {won(pas)} 인강 포함, 지문 1편 {won(single)}."
        final_acts = studio_btn + '<a class="btn ghost" href="index.html">다른 대학 보기</a>'
        price_block = '<span class="price mute">2027 판 없음<small>제시문 면접은 스튜디오에서 준비</small></span>'
    else:
        acts = ('<span class="btn" aria-disabled="true">입고 예정</span>\n'
                '      <a class="btn ghost" href="index.html">판매 중인 가이드북</a>')
        badge = '<span class="badge mute">준비 중</span>'
        note = "보안 리더 준비 중. 준비되는 대로 이 면에서 판매하고 공지에 기록."
        final_h2, final_p = "준비 중인 동안", "판매 중인 다른 대학 가이드북 먼저. 판매 개시는 공지로."
        final_acts = ('<a class="btn" href="index.html">판매 중인 가이드북 <span class="ar" aria-hidden="true">→</span></a>'
                      '<a class="btn ghost" href="../notice.html">공지 보기</a>')
        price_block = f'<span class="price mute">{price:,}원<small>부가세 포함, 보안 리더 열람 1개월</small></span>'
    # 유형명 역시 export/site 계약을 사용한다. 카운트·관측 주석은 원류 단계에서 제외한다.
    type_chips = "\n".join(f'      <span>{esc(clean(label))}</span>' for label in e["types"])
    samples = "\n".join(f'      <li><span class="ty">{esc(clean(s["type"]))}</span><p class="q">{esc(clean(s["q"]))}</p></li>'
                         for s in e["samples"])
    prev_e = items[i - 1] if i > 0 else None
    next_e = items[i + 1] if i + 1 < len(items) else None
    m = {"__TITLE__": esc(title), "__NAME__": esc(name), "__H1__": esc(h1), "__LEDE__": esc(lede), "__SLUG__": e["slug"],
         "__SKU__": esc(e["sku"]), "__VOL__": str(mv.get("vol") or ""), "__YEARS__": years,
         "__PRICE_RAW__": str(price), "__PRICE__": f"{price:,}",
         "__TRACKS_N__": str(len(mv.get("spec_tracks", [])) or len(mv.get("tracks", []))),
         "__SPEC_N__": str(len(mv.get("spec_items", []))),
         "__STATUS_BADGE__": badge, "__ACTS__": acts, "__NOTE__": note,
         "__PREVIEWS__": _previews_html(mv), "__PARTS__": _parts_html(mv), "__FORMS__": _forms_html(mv),
         "__TRACKS__": _tracks_html(mv), "__SPEC_CHIPS__": _chips(mv.get("spec_items", []), 12),
         "__RULES3__": _rules3_html(mv), "__RULE_CHIPS__": _chips(mv.get("rule_areas", []), 14),
         "__STRAT_SEC__": _strat_sec_html(mv),
         "__FAQ__": _faq_html(name, faq_of(e, mv, price, sale, pdfp), "준비 방법" if studio else "이 가이드북"),
         "__TYPE_CHIPS__": type_chips,
         "__PRICE_BLOCK__": price_block,
         "__SAMPLES__": samples,
         "__PREV__": (f'<a class="tlink" href="{prev_e["slug"]}.html">이전, {esc(prev_e["name"])}</a>' if prev_e else ""),
         "__NEXT__": (f'<a class="tlink" href="{next_e["slug"]}.html">다음, {esc(next_e["name"])}</a>' if next_e else ""),
         "__FINAL_H2__": final_h2, "__FINAL_P__": esc(final_p), "__FINAL_ACTS__": final_acts}
    return fill(PAGE_TPL.read_text(encoding="utf-8"), m)


INDEX_TPL = Path(__file__).with_name("guidebook_index_v2.html")


def render_index(cat, items, meta):
    """목록 = 플랫폼 v2 템플릿. meta v3 수치는 내부 데이터로만 유지한다."""
    n = len(items)
    sale = sum(1 for e in items if e.get("onsale", True))
    price = int(cat["price"])
    gb = [{"slug": e["slug"], "sku": e.get("sku") or f"guide-{e['slug']}", "name": e["name"],
           "short": e["name"].replace("학교", "").replace("(서울)", ""),
           "pages": meta[e["slug"]]["pages"], "q": meta[e["slug"]]["questions"], "r": meta[e["slug"]]["rules"],
           "sale": bool(e.get("onsale", True))} for e in items]
    h1 = "학교별 2027 면접 가이드북"
    fillmap = {"__TITLE__": esc(seo_hub_texts(cat, items, meta)["title"]), "__N__": str(n), "__SALE__": str(sale), "__READY__": str(n - sale),
               "__PRICE_RAW__": str(price), "__PRICE__": f"{price:,}",
               "__HH_GB__": json.dumps(gb, ensure_ascii=False, separators=(",", ":"))}
    t = INDEX_TPL.read_text(encoding="utf-8")
    for k, v in fillmap.items():
        t = t.replace(k, v)
    if "__" in t.replace("__proto__", ""):
        raise RuntimeError("템플릿 placeholder 잔존 (index)")
    return t


def build_to(out_dir):
    cat = json.load(open(CATALOG, encoding="utf-8"))
    meta = load_meta()
    missing = [s for s, _ in SLUGS if s not in meta]
    if missing:
        sys.exit(f"meta v3 누락 {len(missing)}권: {missing[:5]}")
    items = sorted([e for e in cat["items"] if e.get("onsale", True)], key=lambda e: e["name"])   # 비판매 제외 (2026-09-04)
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    p = out_dir / "index.html"
    p.write_text(render_index(cat, items, meta), encoding="utf-8")
    written.append(p)
    for i in range(len(items)):
        p = out_dir / f"{items[i]['slug']}.html"
        p.write_text(render_page(cat, items, i, meta), encoding="utf-8")
        written.append(p)
    return written


def cmd_build(args):
    if not CATALOG.exists():
        sys.exit("catalog 없음: 먼저 refresh")
    ground_check(load_meta())
    w = build_to(OUT)
    print(f"build: {len(w)} files -> {OUT}")


def cmd_seo(args):
    """seo_manifest.json 의 guidebook/<slug>.html 판매 중 면 + guidebook/index.html 의 title/description/answer 를 유형별 골격으로 재박제."""
    import seo_common as _C
    cat = json.load(open(CATALOG, encoding="utf-8"))
    meta = load_meta()
    ground_check(meta)
    m = _C.load_manifest()
    items = sorted([e for e in cat["items"] if e.get("onsale", True)], key=lambda e: e["name"])   # 비판매 제외 (2026-09-04)
    rows = []
    for e in items:
        rel = f"guidebook/{e['slug']}.html"
        if rel not in m["pages"]:
            sys.exit(f"manifest 미등재: {rel}")
        t = seo_texts(e, meta[e["slug"]], cat)
        m["pages"][rel].update({"title": t["title"], "description": t["description"], "answer": t["answer"]})
        rows.append((rel, t))
    hub = seo_hub_texts(cat, items, meta)
    m["pages"]["guidebook/index.html"].update({"title": hub["title"], "description": hub["description"], "answer": hub["answer"]})
    rows.append(("guidebook/index.html", hub))
    titles = [t["title"] for _, t in rows]
    if len(set(titles)) != len(titles):
        sys.exit("title 중복")
    for rel, t in rows:
        print(f"{rel:28s} {t['type']:3s} {len(t['title']):3d}자 {len(t['description']):3d}자 {len(t['answer']):3d}자  {t['title']}")
    if args.dry_run:
        print(f"-- dry-run: {len(rows)}면 (manifest 미기록)")
        return
    _C.save_manifest(m)
    print(f"-- {len(rows)}면 -> {_C.MANIFEST_PATH}")


# ---------------------------------------------------------------- verify
ALLOWED_HEX = {"#312e2e", "#f6f2e9", "#696561", "#bc3529", "#f1ebdd", "#efe9dc", "#fbf9f4", "#4a4644", "#3b2c20", "#d0ac6e"}


def cmd_verify(args):
    fails = []
    files = sorted(OUT.glob("*.html"))
    n_sale = sum(1 for e in json.load(open(CATALOG, encoding="utf-8"))["items"] if e.get("onsale", True))
    if len(files) != n_sale + 1:
        fails.append(f"파일 수 {len(files)} != {n_sale + 1} (판매 중 + index)")
    # 멱등
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "guidebook"
        build_to(tmp)
        for f in files:
            if f.read_bytes() != (tmp / f.name).read_bytes():
                fails.append(f"멱등 실패: {f.name}")
    # 링크, 스타일, 문자
    link_n = 0
    for f in files:
        html = f.read_text(encoding="utf-8")
        html_noscript = re.sub(r"<script.*?</script>", "", html, flags=re.S)
        for m in re.finditer(r'(?:href|src)="([^"]+)"', html_noscript):
            u = m.group(1)
            if u.startswith(("http", "#", "mailto:", "data:")):
                continue
            link_n += 1
            target = (f.parent / u.split("#")[0]).resolve()
            if not target.exists():
                fails.append(f"링크 부재: {f.name} -> {u}")
        for style in re.findall(r"<style>(.*?)</style>", html, flags=re.S):
            # v2 규범: 곡률 6px, 먹 틴트 그림자 1단 허용 (2026-08-26). 팔레트 밖 hex 만 금지
            for hx in re.findall(r"#[0-9a-fA-F]{3,8}\b", style):
                if hx.lower() not in ALLOWED_HEX:
                    fails.append(f"hex {hx}: {f.name}")
        body = re.sub(r"<script.*?</script>", "", html, flags=re.S)
        for ch in ("·", "—", "衒"):
            if ch in body:
                fails.append(f"금지 문자 {ch!r}: {f.name} x{body.count(ch)}")
    # 명단 (학생 실명) 0 건
    roster_hits = None
    roster = Path(args.roster).expanduser() if args.roster else None
    if roster and roster.exists():
        names = json.load(open(roster, encoding="utf-8"))
        roster_hits = 0
        for f in files:
            html = f.read_text(encoding="utf-8")
            roster_hits += sum(html.count(nm) for nm in names if nm)
        if roster_hits:
            fails.append(f"명단 문자열 노출 {roster_hits}건")
    print(f"files={len(files)} links={link_n} roster_hits={roster_hits} fails={len(fails)}")
    for x in fails:
        print("  FAIL", x)
    sys.exit(1 if fails else 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("refresh")
    r.add_argument("--src", default=str(SRC_DEFAULT))
    r.set_defaults(fn=cmd_refresh)
    b = sub.add_parser("build")
    b.set_defaults(fn=cmd_build)
    v = sub.add_parser("verify")
    v.add_argument("--roster", default=str(SRC_DEFAULT / "data" / "roster.json"))
    v.set_defaults(fn=cmd_verify)
    o = sub.add_parser("seo")
    o.add_argument("--dry-run", action="store_true")
    o.set_defaults(fn=cmd_seo)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
