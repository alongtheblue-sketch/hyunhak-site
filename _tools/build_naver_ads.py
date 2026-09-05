#!/usr/bin/env python3
"""네이버 파워링크 소재 재작성 (2026-09-04 건우 "소구점이 약하다, 너무 사실 전달이야" + "13년차 대치동 컨설턴트").

구 소재는 38그룹이 같은 틀을 복제해 변별이 없었다. 여기서는 그룹 유형마다 A안 B안의 역할을 나눈다.
  A안 = 증거. 그 대학의 실제 기출 수를 앞세워 자료의 깊이를 보인다
  B안 = 자기 관련성. 내 생기부가 질문이 되는 구조와 만든 사람을 보인다
값은 guidebook_meta_v3.json 과 build_guidebook.SEARCH 표에서만 유도한다 (원장 밖 수치 창작 금지).
게이트 = 제목 15자, 설명 45자, 금지 표현(합격 보장, 최고, 1위, 유일), 가운뎃점, em대시, 중복 문안.
사용: python3 _tools/build_naver_ads.py [--out _docs/naver_ads_20260903/ads_v3.csv]
"""
import argparse
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guidebook as B   # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://hyunhak.com"
MAKER = "13년차 대치동 컨설턴트"   # 건우 2026-09-04 지시. about.html 대치 학원 부원장 근거
TITLE_MAX, DESC_MAX = 15, 45
BANNED = ("합격 보장", "합격보장", "최고", "1위", "유일", "무조건", "확실히")
SHORT = {"hanyang-erica": "한양대ERICA", "seoultech": "서울과기대", "sookmyung": "숙명여대", "sungshin": "성신여대"}
# 네이버 소재는 로마숫자(U+2160~)를 거부한다 (2026-09-05 실측: 덕성인재전형Ⅱ 를 담은 2건만 등록 실패, 74/76).
# 전형명 원장에는 로마숫자가 그대로 있으므로 소재로 나갈 때만 아라비아로 바꾼다.
ROMAN = {"Ⅰ": "1", "Ⅱ": "2", "Ⅲ": "3", "Ⅳ": "4", "Ⅴ": "5", "Ⅵ": "6", "Ⅶ": "7", "Ⅷ": "8", "Ⅸ": "9", "Ⅹ": "10",
         "ⅰ": "1", "ⅱ": "2", "ⅲ": "3", "ⅳ": "4", "ⅴ": "5"}


def ad_safe(s):
    """소재 문면 정규화. 로마숫자를 아라비아로 바꾼다."""
    for a, b in ROMAN.items():
        s = s.replace(a, b)
    return s


def won(n):
    return f"{n:,}원"


def univ_ads(e, mv):
    """판매 중 대학 31개. A = 기출 수, B = 내 생기부 질문화와 편집자."""
    s = B.SEARCH[e["slug"]]
    U, R1 = s["u"], s["rep"][0]["n"]
    q, r = mv["questions"], mv["rules"]
    url = f"{BASE}/guidebook/{e['slug']}.html"
    # A안: 제목에 대학명과 기출 수. 검색어 "OO대면접기출" 과 정면으로 만난다
    U2 = SHORT.get(e["slug"], U)   # 제목 15자 안에 못 드는 긴 이름은 검색어에 쓰이는 짧은 꼴로
    # 기출 수가 소구가 되는 권만 그 수를 앞세운다. 수록이 적은 권은 그 수가 약점이라 형태 판정 축으로 돌린다
    if q >= 100:
        a_titles = [f"{U} 면접 기출 {q}문", f"{U2} 면접 기출 {q}문", f"{U2} 면접 기출 정리", f"{U2} 면접 기출"]
        a_descs = [f"실제 기출 {q}문과 생기부 질문 규칙 {r}개. 열람 33,000원",
                   f"실제 기출 {q}문과 질문 규칙 {r}개. 열람 33,000원",
                   f"실제 기출 {q}문과 질문 규칙 {r}개를 한 권에"]
    else:
        a_titles = [f"{U} 면접 형태부터 판정", f"{U2} 면접 형태 판정", f"{U2} 면접 판정", f"{U2} 면접 준비 순서"]
        a_descs = [f"{R1} 면접 형태와 전형별 제원, 생기부 질문 규칙 {r}개",
                   f"전형별 면접 형태 판정과 실제 기출, 질문 규칙 {r}개",
                   f"전형별 형태 판정과 실제 기출, 질문 규칙 {r}개"]
    # B안: 제목에 내 생기부. 설명에 대표 전형명과 편집자를 넣어 그룹마다 갈린다
    b_titles = [f"{U} 면접 내 질문부터", f"{U2} 생기부 질문 뽑기", f"{U2} 면접 준비 한 권", f"{U2} 면접 준비"]
    b_descs = [f"{R1} 면접, 내 생기부에서 뽑는 질문 규칙 {r}개. {MAKER} 편집",
               f"{R1} 면접, 생기부에서 뽑는 질문 규칙 {r}개. {MAKER} 편집",
               f"{R1} 면접 대비, 생기부 질문 규칙 {r}개. {MAKER} 편집",
               f"{MAKER}가 뽑은 {R1} 면접 기출과 질문 규칙 {r}개",
               f"{MAKER}가 뽑은 기출과 생기부 질문 규칙 {r}개"]
    return [("A", ad_safe(_fit(a_titles, TITLE_MAX)), ad_safe(_fit(a_descs, DESC_MAX)), url),
            ("B", ad_safe(_fit(b_titles, TITLE_MAX)), ad_safe(_fit(b_descs, DESC_MAX)), url)]


def studio_ads(slug):
    """연세대, 고려대. A = 무료 진입, B = 실전 규격과 첨삭."""
    s = B.SEARCH[slug]
    U, R1 = s["u"], s["rep"][0]["n"]
    spec = {"yonsei": "준비 8분 답변 5분", "korea": "준비 21분 발화 7분"}[slug]
    url = f"{BASE}/programs/{slug}.html"
    return [("A", _fit([f"{U} 제시문 면접 체험", f"{U} 면접 무료 체험"], TITLE_MAX),
             _fit([f"2026 기출 48시간 열람과 모의면접 응시 1회 무료",
                   f"2026 기출 48시간 열람과 응시 1회 무료"], DESC_MAX), url),
            ("B", _fit([f"{U} 제시문 실전 응시", f"{U} 면접 실전 응시"], TITLE_MAX),
             _fit([f"{spec} 규격 촬영 응시. 전사와 진단과 재구성 첨삭",
                   f"{spec} 규격 촬영 응시와 첨삭 세 단"], DESC_MAX), url)]


GENERAL = {
    "G0_대입면접일반": [
        ("A", "대학 면접 준비 첫 순서", "31개 대학 실제 기출 3,934문을 지원 대학별 한 권에", "/guidebook/index.html"),
        ("B", "내 생기부가 질문이 된다", f"{MAKER}가 만든 대학별 면접 가이드북 31권", "/guidebook/index.html"),
    ],
    "G1_기출질문": [
        ("A", "대학 면접 기출 3,934문", "선배 후기에서 회수한 실제 질문을 대학별 유형별로", "/guidebook/index.html"),
        ("B", "면접 예상 질문 내 기록서", "생기부 기재를 질문으로 바꾸는 규칙과 꼬리질문까지", "/guidebook/index.html"),
    ],
    "G2_학원컨설팅": [
        ("A", "면접 준비 대학별 한 권", f"{MAKER}가 편집한 기출과 생기부 질문 규칙", "/guidebook/index.html"),
        ("B", "대입 모의면접 촬영 응시", "연세대 고려대 제시문 면접을 실전 규격으로 응시", "/studio.html"),
    ],
    "G3_학종서류": [
        ("A", "서류기반 면접 판정부터", "38개 대학 전형별 면접 형태와 준비 자료를 한 표로", "/interview.html"),
        ("B", "생기부 면접 질문 규칙", "내 기재가 어떤 질문이 되는지 대학별로 정리했습니다", "/guidebook/index.html"),
    ],
    "G4_의대": [
        ("A", "의약학 면접 형태 판정", "의예과 전형별 면접 형태와 실제 기출을 대학별 한 권에", "/guidebook/index.html"),
        ("B", "의대 면접 기출과 규칙", f"{MAKER}가 정리한 전형별 제원과 생기부 질문 규칙", "/guidebook/index.html"),
    ],
}


def _fit(cands, hi):
    for c in cands:
        if len(c) <= hi:
            return c
    sys.exit(f"{hi}자 이내 후보 없음: " + " / ".join(f"{len(c)}자 {c}" for c in cands))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="_docs/naver_ads_20260903/ads_v3.csv")
    args = ap.parse_args()
    cat = json.load(open(B.CATALOG, encoding="utf-8"))
    meta = B.load_meta()
    B.ground_check(meta)
    items = {e["slug"]: e for e in cat["items"]}
    rows = []
    for grp, ads in GENERAL.items():
        for tag, t, d, path in ads:
            rows.append({"adgroup": grp, "ab": tag, "title": t, "desc": d, "url": BASE + path})
    for slug, e in items.items():
        if slug in B.STUDIO:
            if slug in ("yonsei", "korea"):
                for tag, t, d, url in studio_ads(slug):
                    rows.append({"adgroup": f"U_{slug}", "ab": tag, "title": t, "desc": d, "url": url})
            continue
        if not e.get("onsale", True):
            continue
        for tag, t, d, url in univ_ads(e, meta[slug]):
            rows.append({"adgroup": f"U_{slug}", "ab": tag, "title": t, "desc": d, "url": url})
    fails, seen = [], {}
    for r in rows:
        if len(r["title"]) > TITLE_MAX:
            fails.append(f"{r['adgroup']} {r['ab']} 제목 {len(r['title'])}자: {r['title']}")
        if len(r["desc"]) > DESC_MAX:
            fails.append(f"{r['adgroup']} {r['ab']} 설명 {len(r['desc'])}자: {r['desc']}")
        for w in BANNED:
            if w in r["title"] + r["desc"]:
                fails.append(f"{r['adgroup']} {r['ab']} 금지 표현 {w}")
        for ch in ("·", "—"):
            if ch in r["title"] + r["desc"]:
                fails.append(f"{r['adgroup']} {r['ab']} 금지 문자 {ch}")
        # 네이버가 거부하는 문자를 등록 전에 잡는다. 허용 = 한글, ASCII, 공백과 마침표 쉼표 괄호
        for ch in r["title"] + r["desc"]:
            if not (ch.isascii() or "가" <= ch <= "힣" or ch in " .,()"):
                fails.append(f"{r['adgroup']} {r['ab']} 비표준 문자 {ch!r} U+{ord(ch):04X}")
        key = (r["title"], r["desc"])
        if key in seen:
            fails.append(f"중복 문안 {r['adgroup']} = {seen[key]}: {r['title']}")
        seen[key] = r["adgroup"]
    out = ROOT / args.out
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["adgroup", "ab", "title", "desc", "url"])
        w.writeheader()
        w.writerows(rows)
    print(f"{'광고그룹':18s} {'안':2s} {'제목':24s} 자  설명")
    for r in rows[:14]:
        print(f"{r['adgroup']:18s} {r['ab']:2s} {r['title']:24s} {len(r['title']):2d}  {r['desc']} ({len(r['desc'])}자)")
    print(f"... 총 {len(rows)}개 소재 -> {out}")
    print(f"제목 최대 {max(len(r['title']) for r in rows)}자 / 설명 최대 {max(len(r['desc']) for r in rows)}자 / 중복 0")
    if fails:
        print("FAIL:")
        for x in fails[:15]:
            print("  ", x)
        sys.exit(1)
    print(f"build_naver_ads: {len(rows)}개 소재 게이트 PASS")


if __name__ == "__main__":
    main()
