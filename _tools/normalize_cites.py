#!/usr/bin/env python3
"""면접 아카이브 보존 섹션의 출처 표기를 '자료 종류'로 일반화한다.

문제: 제원표·유형 판정·특징·준비 전략에 남은 <span class='cite'> 가
원본 파일명과 페이지를 그대로 노출한다. 예)
  가천대_2027.pdf.txt p57
  경북대학교_2026_선행학습영향평가.pdf.txt p253 부록8
  울산교육청_2025 대입 면접후기 자료집.pdf.txt p134
  팩 §2 수험생 유의사항 원문
`.pdf.txt` 는 내부 OCR 파이프라인 산물이고 `팩 §N` 은 내부 표기다.
서지 전량이 공개되면 경쟁사가 원천 자료 목록을 그대로 얻는다.

방침: 근거가 있다는 신호(=AEO·신뢰도)는 유지하고 서지는 감춘다.
     파일명·페이지·내부 표기를 자료 종류 라벨로 바꾼다.

미매칭은 침묵하지 않는다. 규칙에 안 걸린 문구는 전량 출력하고 종료코드 2.
이 페이지들은 상업 페이지라 조용한 오라벨이 서지 노출보다 나쁘다.
"""
import argparse
import glob
import io
import os
import re
import sys
from collections import Counter

CITE_RE = re.compile(r"(<span class='cite'>)(.*?)(</span>)", re.S)

# 순서 중요. 위에서부터 먼저 맞는 규칙을 쓴다.
RULES = [
    (r"선행학습영향평가",                 "대학 선행학습영향평가 보고서"),
    (r"모집요강",                         "대학 수시모집요강"),
    (r"면접구술기출",                     "대학 면접·구술 기출 자료"),
    (r"학종\s*가이드북|학종가이드북",      "대학 학생부종합 안내서"),
    (r"[Qq]\s*&(?:amp;)?\s*A",            "대학 가이드북 Q&amp;A"),
    (r"orbi|커뮤니티",                    "수험생 커뮤니티 면접 후기"),
    (r"교육청|진로진학센터|진학자료실|신명여고|울산고|원광고",
                                          "교육청·진학센터 면접 자료집"),
    (r"면접후기|면접 후기|사례집|면접자료|면접 자료|면접 전략",
                                          "면접 후기 자료집"),
    # 팩 §N = 내부 묶음 표기. 원문이 공식자료인지 후기자료집인지 구분되지
    # 않으므로 공식이라 단정하지 않고 중립 라벨을 쓴다 (Codex C-1).
    (r"^팩\s*§",                          "수집 자료 원문"),
    (r"^같은 문서|^동일 출처",            "같은 자료"),
    (r"^[가-힣]+대(?:학교)?_20\d\d",       "대학 2027 공식 자료"),
]
COMPILED = [(re.compile(p), lab) for p, lab in RULES]


def normalize(text):
    """(라벨, 매칭여부). 태그는 이미 벗겨진 순수 텍스트를 받는다."""
    t = text.strip()
    for rx, lab in COMPILED:
        if rx.search(t):
            return lab, True
    return t, False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="파일에 실제로 쓴다")
    args = ap.parse_args()

    paths = sorted(p for p in glob.glob("interview/*.html")
                   if not p.endswith("index.html"))
    total = 0
    labels = Counter()
    misses = Counter()

    for p in paths:
        src = io.open(p, encoding="utf-8").read()

        def repl(m):
            nonlocal total
            inner = re.sub(r"<[^>]+>", "", m.group(2))
            inner = re.sub(r"^\s*출처\s*[:：]\s*", "", inner)
            lab, ok = normalize(inner)
            total += 1
            if ok:
                labels[lab] += 1
            else:
                misses[inner.strip()[:80]] += 1
            return m.group(1) + "출처: " + lab + m.group(3)

        new = CITE_RE.sub(repl, src)
        if args.apply and new != src:
            io.open(p, "w", encoding="utf-8").write(new)

    print("출처 표기 %d건 처리 / %d면" % (total, len(paths)))
    print()
    for k, v in labels.most_common():
        print("%5d  %s" % (v, k))

    if misses:
        print()
        print("!! 규칙 미매칭 %d종 %d건 — 라벨이 아니라 원문이 그대로 남는다."
              % (len(misses), sum(misses.values())))
        for k, v in misses.most_common():
            print("%5d  %s" % (v, k))
        print("모드: %s" % ("APPLY" if args.apply else "DRY-RUN"))
        return 2

    print()
    print("미매칭 0. 모든 출처가 자료 종류 라벨로 치환됨.")
    print("모드: %s" % ("APPLY (파일 기록됨)" if args.apply else "DRY-RUN (파일 무변경)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
