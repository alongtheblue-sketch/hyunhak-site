#!/usr/bin/env python3
"""유형 그룹 머리글의 'N건 수록' 을 실제 노출 문항 수와 맞춘다.

trim_interview.py 가 문항을 줄인 뒤에도 머리글 숫자가 남아 "15건 수록"이라
써 놓고 2건만 보이는 상태가 생겼다. 머리글 형식이 학교마다 두 가지라
(예: "(105건, 26.8%): … , 15건 수록" / "(관측 185건, 20.2%, …, 15건 수록)")
형식에 기대지 않고 **실제 <li> 개수에서 역산**한다.

앞의 총계·비율은 유형 분포 통계라 손대지 않는다. 마지막 'N건 수록' 만 고친다.
검증도 겸한다: --check 는 불일치가 남으면 종료코드 2.
"""
import argparse
import glob
import io
import os
import re
import sys

# 머리글 바로 뒤에 <ol> 이 오거나(문항 남김), 아무것도 없다(전량 잠금).
GROUP_RE = re.compile(
    r"(?P<head><div class='qgh'>.*?</div>)"
    r"(?P<rest>(?:<ol class='aol'[^>]*>(?P<body>.*?)</ol>)?)",
    re.S,
)
CLAIM_RE = re.compile(r"\d+건 수록|전량 가이드북 수록")


def repair(src):
    out, cursor, fixed, bad = [], 0, 0, 0
    for m in GROUP_RE.finditer(src):
        head, body = m.group("head"), m.group("body") or ""
        actual = len(re.findall(r"<li>", body))
        claims = CLAIM_RE.findall(head)
        if not claims:
            continue
        want = ("%d건 수록" % actual) if actual else "전량 가이드북 수록"
        if claims[-1] != want:
            bad += 1
            # 마지막 주장만 교체 (앞의 총계·비율은 보존)
            i = head.rfind(claims[-1])
            new_head = head[:i] + want + head[i + len(claims[-1]):]
            out.append(src[cursor:m.start("head")])
            out.append(new_head)
            cursor = m.end("head")
            fixed += 1
    out.append(src[cursor:])
    return "".join(out), fixed, bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--check", action="store_true", help="불일치가 있으면 종료코드 2")
    args = ap.parse_args()

    paths = sorted(p for p in glob.glob("interview/*.html")
                   if not p.endswith("index.html"))
    total_bad = 0
    for p in paths:
        src = io.open(p, encoding="utf-8").read()
        new, fixed, bad = repair(src)
        total_bad += bad
        if bad:
            print("%-24s 불일치 %d건" % (os.path.basename(p), bad))
        if args.apply and new != src:
            io.open(p, "w", encoding="utf-8").write(new)

    print()
    if args.check:
        print("불일치 %d건" % total_bad)
        return 2 if total_bad else 0
    print("불일치 %d건 / %s" % (total_bad,
          "APPLY (파일 기록됨)" if args.apply else "DRY-RUN (파일 무변경)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
