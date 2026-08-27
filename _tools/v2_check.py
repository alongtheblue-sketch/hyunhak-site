#!/usr/bin/env python3
"""플랫폼 v2 전개 게이트 (2026-08-26 s16). 종료코드 0 = PASS.
  (1) 대상 html 전부 <body class="v2">  (2) 레거시 클래스·구조 0 (nav u, act, textlink, invert, hhMain, aeo 밖의 .han 제목)
  (3) v2 자리표시 주석 잔존 0  (4) href="#" 0 (script 제외)  (5) 금지 문자 가운뎃점, em대시 0 (衒 은 브랜드 설명에 의도 사용) (script/style/JSON-LD 제외)
  (6) pagehead 는 v2 pagehead 구조(section.phead > .wrap > .pagehead) 또는 없음
  (7) base.css 에 레거시 [3] 섹션 0
대상 제외 = programs/ (독립 LP, base.css 미링크), reader.html (뷰어, base.css 미링크), _*/, design/."""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_PREFIX = ("programs/", "design/", "_design/", "_tools/")
SKIP = {"reader.html"}
LEGACY = [r'class="nav u"', r'class="(?:[^"]*\s)?act(?:\s[^"]*)?"', r'class="(?:[^"]*\s)?textlink(?:\s[^"]*)?"',
          r'class="(?:[^"]*\s)?invert(?:\s[^"]*)?"', r'id="hhMain"', r'id="hhNav"', r'class="seal-dot"',
          r'class="(?:[^"]*\s)?checkrow(?:\s[^"]*)?"', r'class="facts">\s*<div class="f">']
PLACEHOLDER = re.compile(r"<!--v2:(shell|footer|fix)-->")
STRIP = re.compile(r"<script.*?</script>|<style.*?</style>|<!-- seo:begin -->.*?<!-- seo:end -->", re.S | re.I)
# 자료집 원문이 쓰는 구분, 나열 기호. 관측 인용 안에서는 verbatim 보존, 산문에서는 금지.
DOT_SRC = ("∙", "‧", "・", "–", "•")


def body_of(s):
    i = s.find("<body")
    return s[i:] if i >= 0 else s


BLOCK_OPEN = re.compile(r"<(?:td|th|p|li|dd|h[1-6])\b", re.I)


def text_only(s):
    """태그를 제거하고 텍스트 노드만 남긴다.
    ★ 정규식 <[^>]*> 로는 안 된다 — 속성값 안의 '>' 에서 태그가 끊겨(<p title=">">) 속성 따옴표가
      본문으로 새고, 인용 판정이 뒤집힌다 (s17 Codex 적발). 인용 상태를 추적하며 훑는다."""
    out, i, n = [], 0, len(s)
    while i < n:
        c = s[i]
        if c == "<":
            i += 1
            q = ""
            while i < n:
                ch = s[i]
                if q:
                    if ch == q:
                        q = ""
                elif ch in "\"'":
                    q = ch
                elif ch == ">":
                    i += 1
                    break
                i += 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def in_quote(s, idx):
    """idx 위치가 본문 큰따옴표 쌍 안인지. 속성값 따옴표는 세지 않는다."""
    starts = [m.start() for m in BLOCK_OPEN.finditer(s, 0, idx)]
    start = starts[-1] if starts else 0
    return text_only(s[start:idx]).count('"') % 2 == 1


def text_files():
    """문자 정책은 v2 구조 대상이 아닌 면(programs LP 3, reader)에도 적용한다 — 계측 범위 누락 방지 (s17)."""
    out = []
    for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        if "/_" in "/" + rel or rel.startswith("."): continue
        out.append(rel)
    return out


def main():
    fails = []
    files = []
    for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        if rel in SKIP or rel.startswith(SKIP_PREFIX) or "/_" in "/" + rel or rel.startswith("."): continue
        files.append(rel)
    # 문자 정책 전수 (v2 대상 밖 면 포함)
    for rel in text_files():
        if rel in files: continue
        s = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        b = body_of(STRIP.sub("", s))
        for ch in ("·", "—"):
            n = b.count(ch)
            if n: fails.append(f"{rel}: 금지 문자 {ch!r} x{n}")
        for ch in DOT_SRC:
            for m in re.finditer(re.escape(ch), b):
                if not in_quote(b, m.start()):
                    fails.append(f"{rel}: 인용 밖 원문 표기 문자 {ch!r}")
        # 말투 게이트 (2026-08-27 건우): 하십시오체 명령형 금지 — 공손체(주세요체)로. verbatim 인용 안만 허용
        for m in re.finditer("십시오", b):
            if not in_quote(b, m.start()):
                fails.append(f"{rel}: 십시오체 (공손체로 전환)")
    for rel in files:
        s = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        if '<body class="v2' not in s:
            fails.append(f"{rel}: body.v2 아님"); continue
        vis = STRIP.sub("", s)
        for pat in LEGACY:
            n = len(re.findall(pat, vis))
            if n: fails.append(f"{rel}: 레거시 {pat} x{n}")
        m = PLACEHOLDER.findall(s)
        if m: fails.append(f"{rel}: 자리표시 잔존 {m}")
        n = len(re.findall(r'href="#"', vis))
        if n: fails.append(f"{rel}: href=\"#\" x{n}")
        for ch in ("·", "—"):
            n = vis.count(ch)
            if n: fails.append(f"{rel}: 금지 문자 {ch!r} x{n}")
        # 점 문자 정책 선언 (2026-08-26 s17): 관측 원문 verbatim 인용 안에서만 ∙ ‧ ・ – 허용,
        # 인용 밖(사이트 산문)에서는 전부 금지. 인용 판정 = 큰따옴표 쌍 안.
        for ch in DOT_SRC:
            for m in re.finditer(re.escape(ch), body_of(vis)):
                if not in_quote(body_of(vis), m.start()):
                    fails.append(f"{rel}: 인용 밖 원문 표기 문자 {ch!r} (verbatim 인용 안에서만 허용)")
        # 말투 게이트 (2026-08-27 건우): 하십시오체 명령형 금지 — 공손체(주세요체)로.
        # 예외 = verbatim 인용: 큰따옴표 안 + 기출 질문 .q 요소 (관측 원문은 고치지 않는다)
        vq = re.sub(r'<(p|span) class="q">.*?</\1>', "", body_of(vis), flags=re.S)
        for m in re.finditer("십시오", vq):
            if not in_quote(vq, m.start()):
                fails.append(f"{rel}: 십시오체 (공손체로 전환)")
        if 'class="pagehead"' in vis and not re.search(r'<div class="pagehead">', vis):
            fails.append(f"{rel}: pagehead 구조 (div.pagehead 여야 함)")
        if rel not in ("insta.html",):
            # 셸 3요소 각 정확히 1개 (주입 누락, 중복 모두 침묵 통과 방지 — X1 P2-6)
            for pat, name in ((r'<div class="util">', "util"), (r'<header class="hd"', "header"),
                              (r'<footer>', "footer"), (r'<nav class="fix"', "fix")):
                n = len(re.findall(pat, s))
                if n != 1: fails.append(f"{rel}: 셸 {name} x{n} (1개여야 함)")
    css = open(os.path.join(ROOT, "assets/base.css"), encoding="utf-8").read()
    if "body:not(.v2)" in css:
        fails.append(f"base.css: 레거시 [3] 잔존 (body:not(.v2) x{css.count('body:not(.v2)')})")
    print(f"v2_check: files={len(files)} fails={len(fails)}")
    for f in fails: print("  FAIL", f)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
