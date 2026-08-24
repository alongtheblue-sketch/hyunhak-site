#!/usr/bin/env python3
"""유형 그룹 머리글(span.cnt)을 표준 형식으로 재조립한다.

문제: trim_interview.py 가 문항을 줄인 뒤 머리글의 '몇 건 보여준다' 주장이
실제와 어긋났다. 그 주장의 표기가 학교마다 제각각이라(아래) 개별 수선은
반드시 빠뜨린다.

  … , 15건 수록      … ) — 15건 수록      … , 수록 15건
  … , 인용 11건       … / 노출 표본 33건    … / 원문 노출 13건
  … , 전량 수록 중 15건                     … ) 12건 전량 수록

방침: 형식을 맞춰 고치지 말고 **표준 형식으로 다시 쓴다.**
  {유형명} (관측 {총계}건, {비율}%{, 설명}) · 대표 {실제}건 공개

보존: 총계와 비율(=건우가 남기라고 한 유형 분포 통계), 숫자 없는 설명 문구.
버림: 낡은 노출 주장 전량. 노출 수는 실제 <li> 개수에서만 만든다.

--check 는 재조립 결과가 실제와 어긋나면 종료코드 2.
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
PCT_RE = re.compile(r"([\d.]+)\s*%")
# 숫자가 든 조각은 낡은 주장일 수 있어 버리고, 순수 설명만 남긴다.
SPLIT_RE = re.compile(r"\s*[,/—·]\s*|\s*\+\s*")


def rebuild(txt, actual):
    """span.cnt 안 텍스트를 표준형으로. 실패하면 None (원문 유지)."""
    plain = re.sub(r"<[^>]+>", "", txt).strip()
    i = plain.find("(")
    if i < 0:
        return None
    name = plain[:i].strip()
    rest = plain[i + 1:]
    j = rest.rfind(")")
    inner = rest[:j] if j >= 0 else rest
    trailer = rest[j + 1:] if j >= 0 else ""

    m = COUNT_RE.search(inner)
    if not m:
        # 총계 숫자가 없는 머리글(예: "공식 예시문항 (가이드북 및 …, 신뢰도 A)").
        # 통계가 없으니 괄호는 원문 그대로 두고 공개 수만 덧붙인다.
        tail = (" · 대표 %d건 공개" % actual) if actual else " · 전량 가이드북 수록"
        return "%s (%s)%s" % (name, inner.strip(), tail)
    total = m.group(1)
    p = PCT_RE.search(inner)
    pct = p.group(1) if p else None

    # 설명 = 숫자·비율이 없는 조각만. 낡은 노출 주장은 전부 숫자를 달고 있다.
    notes = []
    for seg in SPLIT_RE.split(inner + " " + trailer):
        s = seg.strip().strip("()").strip()
        s = s.replace("**", "")            # 원문에 남은 마크다운 강조 누출
        if not s or COUNT_RE.search(s) or PCT_RE.search(s):
            continue
        if s in {"관측", "전체의", "전체", "관측 태그", "관측 분류", "전량"}:
            continue
        # 숫자가 빠진 노출 주장 잔해. 공개 수는 아래 tail 이 단독으로 만든다.
        if re.search(r"수록|노출|인용|공개|대표|표본", s):
            continue
        notes.append(s)

    head = "%s (관측 %s건" % (name, total)
    if pct:
        head += ", %s%%" % pct
    if notes:
        head += ", " + ", ".join(notes)
    head += ")"
    tail = (" · 대표 %d건 공개" % actual) if actual else " · 전량 가이드북 수록"
    return head + tail


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
