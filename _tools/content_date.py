#!/usr/bin/env python3
"""본문 기준 수정일 (2026-10-26 SEO 회복 s2).

사이트맵 lastmod 는 파일의 마지막 커밋일이었다. 운영자 소개(JSON-LD), 분석 태그, 푸터처럼 모든 면에 공통인
층이 바뀌어도 커밋일이 올라 배포마다 70면 중 42~47면이 그날로 찍혔다. 구글은 lastmod 가 꾸준히 정확할 때만 쓴다.
여기서는 body 에서 script, style, noscript, svg, nav, header, footer 와 주석을 뺀 글자만 해시해 원장에 두고,
해시가 바뀐 빌드의 날짜만 새 수정일로 삼는다. 같은 날 다시 빌드하거나 다음 날 내용 없이 빌드하면 날짜가 그대로다.

원장 = _tools/lastmod_ledger.json  {rel: {"sha": 16자, "date": "YYYY-MM-DD"}}
오늘 = 환경변수 HH_TODAY 가 있으면 그 값 (다음 날 빌드 시험용), 없으면 시스템 날짜.
처음 채우기 = python3 _tools/content_date.py seed  (git 이력에서 본문이 마지막으로 바뀐 커밋 날짜)
"""
import datetime
import hashlib
import json
import os
import re
import subprocess
import sys

import seo_common as C

LEDGER = os.path.join(C.ROOT, "_tools", "lastmod_ledger.json")
DROP = re.compile(r"(?is)<(script|style|noscript|svg|nav|header|footer|template)\b[^>]*>.*?</\1\s*>")


def today():
    return os.environ.get("HH_TODAY") or datetime.date.today().isoformat()


def main_text(s):
    """body 의 본문 글자. 공통 틀과 태그 속성(자산 해시, 클래스)은 뺀다."""
    m = re.search(r"(?is)<body\b[^>]*>(.*)</body>", s)
    b = m.group(1) if m else s
    b = re.sub(r"(?s)<!--.*?-->", " ", b)
    prev = None
    while prev != b:   # 같은 태그가 겹쳐 있어도 바깥까지 지운다
        prev, b = b, DROP.sub(" ", b)
    b = re.sub(r"(?s)<[^>]+>", " ", b)
    return re.sub(r"\s+", " ", C.html.unescape(b)).strip()


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def load():
    try:
        with open(LEDGER, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save(ledger):
    with open(LEDGER, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(ledger.items())), f, ensure_ascii=False, indent=1)
        f.write("\n")


def date_for(rel, ledger, fallback=None):
    """현재 파일 본문의 수정일. 원장과 해시가 다르면 오늘로 올리고 원장을 고친다(저장은 호출자)."""
    h = sha(main_text(C.read(rel)))
    rec = ledger.get(rel)
    if rec and rec["sha"] == h:
        return rec["date"]
    d = today() if rec or fallback is None else fallback
    ledger[rel] = {"sha": h, "date": d}
    return d


def _git(*args):
    return subprocess.run(["git", *args], cwd=C.ROOT, capture_output=True, text=True, check=True).stdout


def seed_date(rel):
    """git 이력에서 현재 본문과 같은 본문이 처음 나타난 커밋 날짜(그 뒤 커밋은 틀만 바꿨다)."""
    cur = sha(main_text(C.read(rel)))
    commits = [x.split() for x in _git("log", "--format=%h %cs", "--", rel).strip().split("\n") if x]
    date = None
    for h, d in commits:   # 최신부터
        try:
            old = _git("show", f"{h}:{rel}")
        except subprocess.CalledProcessError:
            break
        if sha(main_text(old)) != cur:
            break
        date = d
    return date or today()


def seed(rels):
    ledger = load()
    for rel in rels:
        if rel in ledger:
            continue
        ledger[rel] = {"sha": sha(main_text(C.read(rel))), "date": seed_date(rel)}
    save(ledger)
    return ledger


if __name__ == "__main__":
    if sys.argv[1:2] == ["seed"]:
        m = C.load_manifest()
        rels = [r for r in C.list_pages() if (e := C.resolve_entry(m, r)) and not e["noindex"]]
        led = seed(rels)
        for r in rels:
            print(led[r]["date"], r)
    else:
        print(__doc__)
