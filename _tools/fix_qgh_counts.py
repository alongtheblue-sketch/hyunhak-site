#!/usr/bin/env python3
"""유형 그룹 머리글(span.cnt)의 노출 주장을 실제 공개 수와 맞춘다.

문제: trim_interview.py 가 문항을 줄인 뒤에도 머리글이 '몇 건 보여준다' 를
낡은 값으로 주장했다. 그 표기가 학교마다 제각각이라 개별 수선은 반드시
빠뜨린다.

  … , 15건 수록      … ) — 15건 수록      … , 수록 15건
  … , 인용 11건       … / 노출 표본 33건    … / 원문 노출 13건
  … , 전량 수록 중 15건                     … ) 12건 전량 수록

방침: **빼는 방식.** 원문을 그대로 두고 낡은 주장만 도려낸 뒤
표준 꼬리 ` · 대표 N건 공개` 를 붙인다. N 은 실제 <li> 개수에서만 만든다.

담는 방식(조각내어 골라 담기)을 먼저 시도했다가 설명이 숫자 조각에 붙어
같이 버려졌다 — '★ 최다 빈도군', '전 코퍼스 5.6%', '이 대학 최대 유형'.
skku 는 총계마저 '관측 분류 7건 + 기타 재배치 4건 = 11건' 에서 7만 집어
틀렸다. 그래서 보존을 기본값으로 두고 제거를 열거하는 쪽으로 뒤집었다.

--check 는 '대표 N건 공개' 가 실제와 어긋나면 종료코드 2.
"""
import argparse
import glob
import io
import os
import re
import sys

GROUP_RE = re.compile(
    r"(?P<head><div class='qgh'>.*?</div>)"
    r"(?:<ol class='aol'[^>]*>(?P<body>.*?)</ol>)?",
    re.S,
)
CNT_RE = re.compile(r"(<span class='cnt'>)(?P<txt>.*?)(</span>)", re.S)
COUNT_RE = re.compile(r"(\d+)\s*건")

# 낡은 '몇 건 보여준다' 주장. 학교마다 표기가 달라 전부 열거한다.
# 이것만 도려내고 나머지 원문(총계·비율·설명·전 코퍼스 비교 등)은 그대로 둔다.
CLAIM_RES = [re.compile(p) for p in (
    r"[,:·]?\s*\d+\s*건\s*전량\s*수록",
    r"[,:·]?\s*전량\s*수록\s*중\s*\d+\s*건",
    r"[,:·]?\s*원문\s*노출\s*\d+\s*건",
    r"\s*/\s*노출\s*표본\s*\d+\s*건",
    r"\s*/\s*표본\s*\d+\s*건",
    r"[,:·]?\s*인용\s*\d+\s*건(?:\s*\+\s*보조\s*\d+\s*건)?",
    r"[,:·]?\s*수록\s*\d+\s*건",
    r"\s*[—-]\s*\d+\s*건\s*수록",
    r"\s*[—-]\s*\d+\s*건(?![가-힣0-9])",
    r"[,:·]?\s*\d+\s*건\s*수록",
    r"[,:·]?\s*대표\s*\d+\s*건(?:\s*공개)?",
    r"[,:·]?\s*전량\s*가이드북\s*수록",
    r"[,:·]\s*전량(?![가-힣])",
)]
# 도려낸 뒤 남는 찌꺼기 (빈 괄호, 매달린 구두점)
TIDY_RES = [
    (re.compile(r"\*\*"), ""),                  # 원문에 남은 마크다운 강조 누출
    (re.compile(r"\s*/\s*(?=[),])"), ""),       # 주장을 떼고 남은 매달린 슬래시
    (re.compile(r"\s*/\s*$"), ""),
    (re.compile(r"\(\s*\)"), ""),
    (re.compile(r"\s*[,:·]\s*\)"), ")"),
    (re.compile(r"\(\s*[,:·]\s*"), "("),
    (re.compile(r"\s*[,:·]\s*$"), ""),
    (re.compile(r"\s{2,}"), " "),
]


def rebuild(txt, actual):
    """원문을 살리고 낡은 노출 주장만 도려낸 뒤 표준 꼬리를 붙인다.

    앞선 판은 조각내어 골라 담다가 설명을 숫자에 붙여 같이 버렸고
    ('★ 최다 빈도군', '전 코퍼스 5.6%'), skku 는 총계마저
    '관측 분류 7건 + 기타 재배치 4건 = 11건' 에서 7건만 집어 틀렸다.
    그래서 담는 방식이 아니라 **빼는 방식**으로 바꾼다.
    """
    plain = re.sub(r"<[^>]+>", "", txt).strip()
    body = plain
    for rx in CLAIM_RES:
        body = rx.sub("", body)
    for rx, rep in TIDY_RES:
        body = rx.sub(rep, body)
    body = body.strip().rstrip(",:·").strip()
    if not body:
        return None
    tail = (" · 대표 %d건 공개" % actual) if actual else " · 전량 가이드북 수록"
    return body + tail


def process(src):
    out, cursor, changed, failed = [], 0, 0, 0
    for m in GROUP_RE.finditer(src):
        head, body = m.group("head"), m.group("body") or ""
        actual = len(re.findall(r"<li>", body))
        cm = CNT_RE.search(head)
        if not cm:
            continue
        new_txt = rebuild(cm.group("txt"), actual)
        if new_txt is None:
            failed += 1
            continue
        new_head = head[:cm.start()] + cm.group(1) + new_txt + cm.group(3) + head[cm.end():]
        if new_head != head:
            changed += 1
        out.append(src[cursor:m.start("head")])
        out.append(new_head)
        cursor = m.end("head")
    out.append(src[cursor:])
    return "".join(out), changed, failed


def audit(src):
    """재조립 후 '대표 N건 공개' 가 실제와 맞는지."""
    bad = []
    for m in GROUP_RE.finditer(src):
        head, body = m.group("head"), m.group("body") or ""
        actual = len(re.findall(r"<li>", body))
        cm = CNT_RE.search(head)
        if not cm:
            continue
        t = re.sub(r"<[^>]+>", "", cm.group("txt"))
        claim = re.search(r"대표 (\d+)건 공개", t)
        want = actual
        if claim:
            if int(claim.group(1)) != want:
                bad.append((t.strip()[:60], want))
        elif "전량 가이드북 수록" in t:
            if want != 0:
                bad.append((t.strip()[:60], want))
        else:
            bad.append((t.strip()[:60], want))
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--preview", action="store_true", help="재조립 결과 전량 출력")
    args = ap.parse_args()

    paths = sorted(p for p in glob.glob("interview/*.html")
                   if not p.endswith("index.html"))

    if args.check:
        total = 0
        for p in paths:
            bad = audit(io.open(p, encoding="utf-8").read())
            for t, a in bad:
                print("%-20s 실제 %d | %s" % (os.path.basename(p), a, t))
            total += len(bad)
        print("\n불일치 %d건" % total)
        return 2 if total else 0

    tot_c = tot_f = 0
    for p in paths:
        src = io.open(p, encoding="utf-8").read()
        new, changed, failed = process(src)
        tot_c += changed
        tot_f += failed
        if args.preview:
            for m in CNT_RE.finditer(new):
                print("%-18s %s" % (os.path.basename(p),
                                    re.sub(r"<[^>]+>", "", m.group("txt")).strip()[:92]))
        if args.apply and new != src:
            io.open(p, "w", encoding="utf-8").write(new)

    print("\n재조립 %d개 / 파싱 실패 %d개" % (tot_c, tot_f))
    print("모드: %s" % ("APPLY (파일 기록됨)" if args.apply else "DRY-RUN (파일 무변경)"))
    return 2 if tot_f else 0


if __name__ == "__main__":
    sys.exit(main())
