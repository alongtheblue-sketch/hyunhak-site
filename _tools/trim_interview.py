#!/usr/bin/env python3
"""면접 아카이브(interview/*.html) 무료 노출 감량.

건우 지시(2026-08-23 s11 ⓪): "팔아야 하는 사람들이라 사이트에서 너무 구체적인
정보 줄 필요 없음. 디테일 빼고 AEO/GEO/SEO 에 딱 적합한 정도만."

보존: 제원표, 유형 판정, 유형 분포 통계, 타 대학 대비 특징, 준비 전략, AEO 직답, meta.
감량: 질문 아카이브 노출 문항 수, 그리고 문항별 출처 자료집·페이지.

감량 규칙
  1) 유형 그룹(div.qgh + ol.aol)당 대표 1문. 학교당 상한 KEEP_MAX 문.
  2) 그룹이 상한보다 적으면 앞 그룹부터 1문씩 더 채워 KEEP_MIN 을 맞춘다.
  3) 그룹 내 대표문 = 가장 짧은 문항. 긴 문항일수록 제시문 원문을 통째로
     담고 있어 그대로 내주면 안 된다.
  4) <span class='cite'>출처: …</span> 는 전량 제거 (자료집명·페이지 = 내부 자산).
  5) 감량된 그룹에는 "나머지 N건" 잠금 표기를 남긴다. 총량은 계속 주장하되
     본문만 감춘다 (SEO 상 수치 근거는 유지).

멱등: 이미 감량된 파일은 재실행해도 바뀌지 않는다 (LOCK_MARK 로 판정).
"""
import argparse
import glob
import io
import os
import re
import sys

KEEP_MAX = 4          # 학교당 노출 상한
KEEP_MIN = 3          # 학교당 노출 하한
MAX_LEN = 200         # 대표문 길이 상한(실텍스트). 넘으면 제시문 원문을 통째로
                      # 담은 문항이라 무료 노출 대상이 아니다 → 그룹 전량 잠금
LOCK_MARK = "qlock"   # 잠금 표기 클래스 = 멱등 판정자

GROUP_RE = re.compile(
    r"(?P<head><div class='qgh'>.*?</div>)\s*(?P<ol><ol class='aol'[^>]*>)(?P<body>.*?)(?P<end></ol>)",
    re.S,
)
LI_RE = re.compile(r"<li>(?P<inner>.*?)</li>", re.S)
CITE_RE = re.compile(r"<span class='cite'>.*?</span>", re.S)
TAG_RE = re.compile(r"<[^>]+>")
# "…(105건, 26.8%): 이 대학 최대 유형, 15건 수록" 과
# "…(55건, 14.0%): 12건 수록" 두 형태를 모두 잡는다.
# 앞 괄호 안의 총계는 유형 분포 통계라 보존하고, 뒤 '수록' 수만 갈아끼운다.
CNT_RE = re.compile(r"(?P<pre>\d+건, [\d.]+%\).*?)(?P<n>\d+)건 수록")
LEAD_RE = re.compile(r"(<p class='ap gray'>)(.*?)(</p>)", re.S)

# 가이드북을 "무료 제공"이라 적은 잔존 카피. 실제로는 권당 16,500원 판매다.
FREE_RE = re.compile(r"자료실에서\s*회원에게\s*무료로\s*제공합니다\.?")
CTA_RE = re.compile(r"<a class='textlink' href='\.\./library\.html'>자료실에서 가이드북 받기</a>")

QLOCK_CSS = (".arc .qlock{font-size:12.5px;letter-spacing:.02em;color:var(--gray);"
             "margin:10px 0 2px;padding-left:2px}")

LEAD_NEW = ("아래는 관측 빈도 상위 유형의 대표 문항입니다. "
            "유형별 전체 문항과 출처는 해당 학교 가이드북에 수록되어 있습니다.")


_ONSALE = None


def onsale_slugs():
    """판매 중 가이드북 slug 집합. 카탈로그가 SoT 라 값을 여기 박지 않는다."""
    global _ONSALE
    if _ONSALE is None:
        try:
            import json
            cat = json.load(io.open("_tools/guidebook_catalog.json", encoding="utf-8"))
            items = cat if isinstance(cat, list) else (cat.get("items") or list(cat.values())[0])
            _ONSALE = {i["slug"] for i in items if i.get("onsale")}
        except Exception as e:                      # 카탈로그를 못 읽으면
            print("경고: 카탈로그 읽기 실패(%s). 전 학교를 '준비 중' 문구로 처리한다." % e,
                  file=sys.stderr)
            _ONSALE = set()
    return _ONSALE


def plain_len(html):
    """태그를 걷어낸 실텍스트 길이. 대표문 선정 기준."""
    return len(TAG_RE.sub("", html).strip())


def pick_indexes(groups, keep_max, keep_min):
    """그룹별로 남길 li 인덱스를 정한다. 반환 = [set(idx), ...] 그룹 순."""
    picks = [set() for _ in groups]
    budget = keep_max

    # 1순위: 그룹마다 대표 1문 = 가장 짧은 것. 단 그 최단문마저 MAX_LEN 을
    # 넘으면 그 그룹은 제시문 원문 덩어리라 통째로 잠근다 (0문 노출).
    for gi, items in enumerate(groups):
        if not items or budget <= 0:
            continue
        shortest = min(range(len(items)), key=lambda i: plain_len(items[i]))
        if plain_len(items[shortest]) > MAX_LEN:
            continue
        picks[gi].add(shortest)
        budget -= 1

    # 2순위: 상한까지 채운다. MAX_LEN 이하 문항만, 짧은 것부터.
    def candidates():
        out = []
        for gi, items in enumerate(groups):
            for i, it in enumerate(items):
                if i not in picks[gi] and plain_len(it) <= MAX_LEN:
                    out.append((plain_len(it), gi, i))
        return sorted(out)

    while budget > 0:
        cand = candidates()
        if not cand:
            break
        _, gi, i = cand[0]
        picks[gi].add(i)
        budget -= 1

    # 3순위: MAX_LEN 때문에 전 그룹이 잠겨 한 문항도 안 남았으면,
    # 그래도 최소 1문은 보인다. 전체에서 가장 짧은 것 하나.
    if sum(len(p) for p in picks) == 0:
        best = None
        for gi, items in enumerate(groups):
            for i, it in enumerate(items):
                L = plain_len(it)
                if best is None or L < best[0]:
                    best = (L, gi, i)
        if best:
            picks[best[1]].add(best[2])
    return picks


def trim_html(src, path=""):
    """(새 html, 통계dict). 변경 없으면 새 html 은 src 와 동일."""
    if LOCK_MARK in src:
        return src, {"skipped": True}

    matches = list(GROUP_RE.finditer(src))
    if not matches:
        return src, {"skipped": True}

    groups = [LI_RE.findall(m.group("body")) for m in matches]
    picks = pick_indexes(groups, KEEP_MAX, KEEP_MIN)

    before = sum(len(g) for g in groups)
    after = sum(len(p) for p in picks)

    out, cursor = [], 0
    for gi, m in enumerate(matches):
        out.append(src[cursor:m.start()])
        items, keep = groups[gi], picks[gi]

        kept_html = "".join(
            "<li>%s</li>" % CITE_RE.sub("", items[i]) for i in sorted(keep)
        )
        dropped = len(items) - len(keep)

        head = m.group("head")
        if dropped:
            label = ("%d건 수록" % len(keep)) if keep else "전량 가이드북 수록"
            head = CNT_RE.sub(lambda x: x.group("pre") + label, head)

        if keep:
            # 남긴 문항이 있을 때만 목록을 낸다. 빈 <ol> 은 내지 않는다.
            body = m.group("ol") + kept_html + m.group("end")
            lock = ("<p class='%s'>이 유형의 나머지 %d건은 해당 학교 가이드북에 "
                    "수록되어 있습니다.</p>" % (LOCK_MARK, dropped)) if dropped else ""
        else:
            body = ""
            lock = ("<p class='%s'>이 유형 %d건은 전량 해당 학교 가이드북에 "
                    "수록되어 있습니다.</p>" % (LOCK_MARK, dropped))

        out.append(head + body + lock)
        cursor = m.end()
    out.append(src[cursor:])
    new = "".join(out)

    new = LEAD_RE.sub(lambda x: x.group(1) + LEAD_NEW + x.group(3), new, count=1)

    # 잠금 표기 스타일. 각 면 인라인 <style> 안, .arc .locked 규칙 옆에 1회 주입.
    # 전역 *{margin:0} 이라 규칙이 없으면 목록에 그대로 붙어 버린다.
    if QLOCK_CSS not in new:
        anchor = ".arc .locked{"
        i = new.find(anchor)
        if i >= 0:
            new = new[:i] + QLOCK_CSS + "\n" + new[i:]

    # 가격 모순 정정: 같은 가이드북을 16,500원에 팔면서 "무료 제공"이라 적혀 있었다.
    # 링크도 자료실(구매자 열람용) 대신 해당 학교 가이드북 상품면으로 돌린다.
    # 26교 중 14교만 판매 중이다. 준비 중인 12교에 "판매합니다"라고 쓰면
    # 그것도 사실과 다르므로 카탈로그 onsale 을 읽어 문구를 가른다.
    slug = os.path.basename(path)[:-5] if path else ""
    price_line = ("권당 16,500원에 판매합니다." if slug in onsale_slugs()
                  else "권당 16,500원으로 판매를 준비하고 있습니다.")
    free_hits = len(FREE_RE.findall(new))
    new = FREE_RE.sub(price_line, new)
    cta_hits = len(CTA_RE.findall(new))
    if slug:
        new = CTA_RE.sub(
            "<a class='textlink' href='../guidebook/%s.html'>가이드북 보기</a>" % slug, new)

    return new, {"before": before, "after": after, "groups": len(groups),
                 "cites": len(CITE_RE.findall(src)),
                 "free": free_hits, "cta": cta_hits, "skipped": False}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="파일에 실제로 쓴다 (없으면 dry-run)")
    ap.add_argument("--sample", help="이 파일의 감량 후 아카이브 절을 텍스트로 출력")
    args = ap.parse_args()

    paths = sorted(p for p in glob.glob("interview/*.html")
                   if not p.endswith("index.html"))
    if not paths:
        print("interview/*.html 없음. 저장소 루트에서 실행하십시오.", file=sys.stderr)
        return 1

    tot_b = tot_a = tot_c = 0
    rows = []
    for p in paths:
        src = io.open(p, encoding="utf-8").read()
        new, st = trim_html(src, p)
        if st.get("skipped"):
            rows.append((os.path.basename(p), "-", "-", "-", "이미 감량됨/대상 아님"))
            continue
        tot_b += st["before"]; tot_a += st["after"]; tot_c += st["cites"]
        rows.append((os.path.basename(p), st["before"], st["after"],
                     st["cites"], "그룹 %d · 무료문구 %d · CTA %d"
                     % (st["groups"], st["free"], st["cta"])))
        if args.apply:
            io.open(p, "w", encoding="utf-8").write(new)
        if args.sample and os.path.basename(p) == args.sample:
            i = new.find("실제 면접 질문 아카이브")
            seg = new[i:]
            end = seg.find("</section>")
            txt = TAG_RE.sub(" ", seg[:end if end > 0 else 4000])
            print("=== 감량 후 미리보기: %s ===" % p)
            print(re.sub(r"[ \t]{2,}", " ", txt).strip()[:1800])
            print("=== /미리보기 ===\n")

    print("%-24s %7s %7s %7s  %s" % ("파일", "감량전", "감량후", "출처제거", "비고"))
    for r in rows:
        print("%-24s %7s %7s %7s  %s" % r)
    print()
    print("합계: 노출 문항 %d → %d (%d건 잠금, %.0f%% 감량) / 출처 표기 %d건 제거"
          % (tot_b, tot_a, tot_b - tot_a,
             (tot_b - tot_a) * 100.0 / tot_b if tot_b else 0, tot_c))
    print("모드: %s" % ("APPLY (파일 기록됨)" if args.apply else "DRY-RUN (파일 무변경)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
