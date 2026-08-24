#!/usr/bin/env python3
"""면접 아카이브 본문의 내부 용어 '팩(pack)' 을 독자 언어로 바꾼다.

'팩', '팩 §1', '팩 통계' 는 내부 데이터 구조 표기다. 방문자에게 의미가 없고
내부 파이프라인 구성만 드러낸다. 사실 관계는 그대로 두고 표기만 바꾼다.

  팩 §1 분류 기준   → 관측 자료 분류 기준
  팩 통계 계산      → 관측 통계 계산
  팩에 원문 나열된  → 관측 자료에 원문 나열된
  팩 17건           → 관측 17건

기계 치환이 '관측 관측' 같은 중복을 만들 수 있어 정리 규칙을 뒤에 둔다.
멱등: '팩' 이 없으면 아무것도 하지 않는다.
"""
import argparse
import glob
import io
import re
import sys

# 내부 용어 '팩' 만 센다. 핫팩·아티팩트·팩트는 정상 단어라 계측에서 뺀다.
GENUINE = re.compile(r"(?<![가-힣])팩(?![트])")

RULES = [
    # §N 표기 제거. 여러 절을 묶어 부르는 형태부터 먼저 소진한다.
    (r"팩\s*§\s*\d+\s*(?:과|와)\s*팩\s*§\s*\d+", "관측 자료"),
    (r"팩\s*§\s*\d+\s*[·,]\s*§?\s*\d+", "관측 자료"),
    (r"팩\s*§\s*\d+\s*:", "관측 자료:"),
    (r"팩\s*§\s*\d+", "관측 자료"),
    # 관용 결합
    (r"팩\s*통계", "관측 통계"),
    (r"팩\s*자체", "자체"),
    (r"팩에", "관측 자료에"),
    # 조사가 붙은 형태. 앞이 한글이면(핫팩) 건드리지 않고,
    # 팩트·아티팩트는 뒤에 한글이 이어져 아래 단독 규칙에도 안 걸린다.
    (r"(?<![가-힣])팩의", "관측 자료의"),
    (r"(?<![가-힣])팩이(?![가-힣])", "관측 자료가"),
    # 수식어가 뒤따르는 단독 '팩'
    (r"팩\s+(?=[가-힣\"0-9])", "관측 "),
    (r"(?<![가-힣])팩(?![가-힣])", "관측 자료"),
    # 중복 정리 — 위 치환이 만든 겹말을 없앤다
    (r"관측 자료 관측", "관측"),
    (r"관측 관측", "관측"),
    (r"관측\s+(\"[^\"]+\")\s*관측", r"\1 관측"),

    # 비문 교정. '팩' 은 문서 묶음을 뜻하는 명사였는데 행위명 '관측' 으로
    # 바꾸면 "관측 공식문서", "관측 수록 409건" 같은 비문이 된다.
    # 묶음을 가리키던 자리는 '수집 자료' 계열로 돌린다.
    (r"관측 자료\s+([가-힣]+)\s*관측", r"\1 관측"),
    (r"관측\s+([가-힣]+)\s*관측(?=\s|\d|[”\"])", r"\1 관측"),
    (r"관측 수록 공식문서", "수집한 공식문서"),
    (r"관측 공식문서", "수집한 공식문서"),
    (r"관측 수록\s+(\d+건)", r"수집 자료 \1"),
    (r"관측 발췌", "수집 자료 발췌"),
    (r"관측 내(?=\s)", "수집 자료"),
    (r"관측 자료에 관측된", "자료에 기록된"),
]


def convert(text):
    for pat, rep in RULES:
        text = re.sub(pat, rep, text)
    return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    paths = sorted(p for p in glob.glob("interview/*.html")
                   if not p.endswith("index.html"))
    changed = before = after = 0
    for p in paths:
        src = io.open(p, encoding="utf-8").read()
        before += len(GENUINE.findall(src))
        new = convert(src)
        after += len(GENUINE.findall(new))
        if new != src:
            changed += 1
            if args.apply:
                io.open(p, "w", encoding="utf-8").write(new)

    print("'팩' 표기 %d건 → %d건 / 변경된 면 %d개" % (before, after, changed))
    print("모드: %s" % ("APPLY (파일 기록됨)" if args.apply else "DRY-RUN (파일 무변경)"))
    return 0 if after == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
