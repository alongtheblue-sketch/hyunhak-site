#!/usr/bin/env python3
# S30-4 (1/3) 구 상품명 정리. 건우 결재 2026-09-02 "지금 수리 후 재리뷰".
# 멱등: 두 번 돌려도 같은 결과(치환 대상이 이미 신명이면 0건). 실행 = python3 이 파일.
#
# 규칙 두 가지만 쓴다.
#  A 가이드북: 정본 = "서류기반면접 가이드북" (index.html 이 정본, 첫 화면 문안)
#  B 스튜디오: 정본 = "제시문 면접 스튜디오". 한 문장 안에서 이미 "제시문 면접" 이 선행하면
#             뒤따르는 "면접 스튜디오" 는 2차 언급이라 그대로 둔다(반복 회피).
#
# 손대지 않는 것 (의도적 제외, 재리뷰 근거로 남긴다)
#  - terms.html 약관 조항, privacy.html 처리 표 = 법적 문안
#  - guidebook/ 38권 카탈로그 제목 "OO대학교 2027 면접 가이드북" = 상품 카탈로그 개명(D1 products) 별도 결재
#  - programs/*.html 서술문 = 같은 문장에 "제시문 면접" 선행. 링크 라벨만 고친다
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[3]

# (파일, 옛 문자열, 새 문자열, 기대 건수 하한)
EDITS = [
    # A 가이드북
    ("about.html",   "학교별 2027 면접 가이드북", "학교별 2027 서류기반면접 가이드북", 1),
    ("about.html",   "학교별 면접 가이드북",      "서류기반면접 가이드북",            1),
    ("insta.html",   "대학별 면접 가이드북",      "서류기반면접 가이드북",            1),
    ("insta.html",   "학교별 면접 가이드북",      "서류기반면접 가이드북",            1),
    ("faq.html",     "학교별 면접 가이드북",      "서류기반면접 가이드북",            1),
    ("faq.html",     "면접 가이드북 열람 방식",   "서류기반면접 가이드북 열람 방식",   1),
    ("notice.html",  "학교별 면접 가이드북",      "서류기반면접 가이드북",            1),
    ("library.html", "대학별 2027 면접 가이드북", "학교별 2027 서류기반면접 가이드북", 1),
    # B 스튜디오 (첫 언급 자리만)
    ("faq.html",     "<summary>면접 스튜디오는",  "<summary>제시문 면접 스튜디오는",   1),
    ("join.html",    "전환, 면접 스튜디오 맛보기", "전환, 제시문 면접 스튜디오 맛보기", 2),
    ("library.html", "회원에게는 면접 스튜디오",   "회원에게는 제시문 면접 스튜디오",   1),
    ("programs/korea.html",  '>면접 스튜디오 안내<', '>제시문 면접 스튜디오 안내<',     1),
    ("programs/yonsei.html", '>면접 스튜디오 안내<', '>제시문 면접 스튜디오 안내<',     1),
    # FAQ 질문은 JSON-LD Question name 으로도 나가는 첫 언급 자리다
    ("faq.html",     "<summary>면접 가이드북은",  "<summary>서류기반면접 가이드북은",  1),
    # llms.txt 절 제목은 카탈로그 제목이 아니라 사이트 자기 문안이다
    ("_tools/build_sitemap.py", '"## 학교별 2027 면접 가이드북"', '"## 학교별 2027 서류기반면접 가이드북"', 1),
]

# seo_manifest.json (meta·JSON-LD 의 단일 출처). 문자열 값 전체를 대상으로 한다.
MANIFEST_EDITS = [
    ("학교별 2027 면접 가이드북", "학교별 2027 서류기반면접 가이드북"),
    ("대학별 2027 면접 가이드북", "학교별 2027 서류기반면접 가이드북"),
    ("학교별 면접 가이드북",      "서류기반면접 가이드북"),
    ("대학별 면접 가이드북",      "서류기반면접 가이드북"),
    ("면접 가이드북 열람 방식",   "서류기반면접 가이드북 열람 방식"),
    # 스튜디오 면 설명: "기출 제시문으로 … 대입 면접 스튜디오" → 이름을 앞세우고 길이는 그대로(±0자)
    ("학교별 기출 제시문으로 온라인으로 치르는 대입 면접 스튜디오",
     "학교별 기출로 온라인으로 치르는 대입 제시문 면접 스튜디오"),
    ("회원 가입, 면접 스튜디오 이용권", "회원 가입, 제시문 면접 스튜디오 이용권"),
]
BREADCRUMB_OLD, BREADCRUMB_NEW = "면접 스튜디오", "제시문 면접 스튜디오"


# 새 문자열이 옛 문자열을 부분문자열로 품는 규칙("면접 가이드북 열람 방식" -> "서류기반면접 가이드북 열람 방식")이
# 있어서, 단순 replace 는 재실행 때 "서류기반서류기반…" 으로 이중 적용된다(2026-09-02 실측 5건).
# 이미 반영된 자리를 파수꾼으로 가린 뒤 치환하고 되돌린다. 이 함수가 멱등의 유일한 근거다.
SENTINEL = "\x00S30-4\x00"

def sub_once(s, old, new):
    guarded = s.replace(new, SENTINEL)
    n = guarded.count(old)
    return n, guarded.replace(old, new).replace(SENTINEL, new)

def main():
    total = 0
    for rel, old, new, floor in EDITS:
        p = ROOT / rel
        s = p.read_text(encoding="utf-8")
        n, s2 = sub_once(s, old, new)
        if n == 0:
            if new not in s:
                print(f"FAIL  {rel}: 옛 문자열도 새 문자열도 없음 — {old!r}")
                sys.exit(1)
            print(f"skip  {rel}: 이미 반영 — {old!r}")
            continue
        if n < floor:
            print(f"FAIL  {rel}: {old!r} {n}건, 기대 {floor}건 이상")
            sys.exit(1)
        p.write_text(s2, encoding="utf-8")
        total += n
        print(f"fix   {rel}: {n}건  {old!r} -> {new!r}")

    mp = ROOT / "_tools/seo_manifest.json"
    m = json.loads(mp.read_text(encoding="utf-8"))
    cnt = [0]
    def walk(o, key=None):
        if isinstance(o, dict):
            return {k: walk(v, k) for k, v in o.items()}
        if isinstance(o, list):
            return [walk(v, key) for v in o]
        if isinstance(o, str):
            s = o
            for old, new in MANIFEST_EDITS:
                n, s = sub_once(s, old, new)
                cnt[0] += n
            # programs 빵부스러기 이름은 단독 값이라 완전일치로만 바꾼다
            if key == "name" and s == BREADCRUMB_OLD:
                s = BREADCRUMB_NEW; cnt[0] += 1
            return s
        return o
    m2 = walk(m)
    if cnt[0]:
        mp.write_text(json.dumps(m2, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"manifest: {cnt[0]}건 치환")
    print(f"합계 {total + cnt[0]}건")

main()
