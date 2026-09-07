#!/usr/bin/env python3
"""사이트 영상 자막 배선 게이트.

배포되는 html 의 <video> 를 전부 세고, 각각 자막 트랙이 붙었는지와 그 파일이 실재하는지 본다.
자막이 필요 없다고 판정한 영상은 아래 EXEMPT 에 사유와 함께 적는다. 목록에도 면제에도 없으면 실패한다.
자막이 없는 영상을 조용히 늘리지 않게 하는 것이 이 게이트의 목적이다.

동적으로 붙는 자막(회원 강의 플레이어)은 파일이 아니라 배선 코드가 살아 있는지로 본다.

사용: python3 _tools/caption_check.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def skip_dirs():
    """건너뛸 디렉터리는 손으로 적지 않는다. 배포에서 빠지는 것과 같아야 사각이 안 생긴다.
    .assetsignore 의 디렉터리 항목을 그대로 쓴다."""
    out = {".git", "node_modules", ".wrangler", "__pycache__"}
    f = ROOT / ".assetsignore"
    if not f.exists():
        sys.exit(".assetsignore 없음. 배포 제외 목록을 알 수 없으면 검사 범위를 정할 수 없다")
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "*" in line:
            continue
        if line.endswith("/"):
            out.add(line.rstrip("/"))
    return out


SKIP_DIRS = skip_dirs()

# 자막을 붙이지 않기로 한 영상. 키는 "파일:영상소스", 값은 사유.
EXEMPT = {}

# 코드가 자막을 붙이는 자리. 파일과 그 안에 반드시 살아 있어야 하는 조각.
WIRED = [
    ("assets/lecture.js", ['tr.kind = "subtitles"', "/api/lecture/track"],
     "회원 강의 플레이어. D1 vtt_key 로 트랙을 받아 Blob 으로 붙인다"),
]

VIDEO_RE = re.compile(r"<video\b[^>]*>.*?</video>", re.S | re.I)
TRACK_RE = re.compile(r"<track\b[^>]*>", re.I)
ATTR_RE = re.compile(r'(\w[\w-]*)\s*=\s*"([^"]*)"')


def attrs(tag):
    return {k.lower(): v for k, v in ATTR_RE.findall(tag)}


def sources(block):
    out = []
    for m in re.finditer(r"<source\b[^>]*>", block, re.I):
        a = attrs(m.group(0))
        if a.get("src"):
            out.append(a["src"])
    a = attrs(block.split(">", 1)[0] + ">")
    if a.get("src"):
        out.append(a["src"])
    return out


def html_files():
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in rel.parts[:-1]):
            continue
        if ".bak" in p.name or p.name.endswith(".orig"):
            continue
        yield p


def main():
    fails, rows = [], []
    for p in html_files():
        text = p.read_text(encoding="utf-8", errors="replace")
        for block in VIDEO_RE.findall(text):
            rel = p.relative_to(ROOT).as_posix()
            srcs = sources(block) or ["(소스 없음)"]
            key = f"{rel}:{srcs[0]}"
            tracks = [attrs(t) for t in TRACK_RE.findall(block)]
            caps = [t for t in tracks if t.get("kind", "").lower() in ("captions", "subtitles")]
            if not caps:
                if key in EXEMPT:
                    rows.append(f"  면제  {key}  ({EXEMPT[key]})")
                else:
                    fails.append(f"자막 트랙 없음: {key}")
                continue
            for t in caps:
                src = t.get("src", "")
                f = (p.parent / src).resolve() if src else None
                if not src:
                    fails.append(f"track 에 src 없음: {key}")
                elif not f.exists():
                    fails.append(f"자막 파일 없음: {key} -> {src}")
                elif not f.read_text(encoding="utf-8", errors="replace").lstrip().startswith("WEBVTT"):
                    fails.append(f"WEBVTT 머리글 아님: {src}")
                else:
                    rows.append(f"  확인  {key}  -> {src}")

    for relpath, needles, why in WIRED:
        f = ROOT / relpath
        if not f.exists():
            fails.append(f"배선 파일 없음: {relpath}")
            continue
        body = f.read_text(encoding="utf-8", errors="replace")
        missing = [n for n in needles if n not in body]
        if missing:
            fails.append(f"자막 배선이 사라졌다: {relpath} 에서 {missing}")
        else:
            rows.append(f"  배선  {relpath}  ({why})")

    for r in rows:
        print(r)
    if fails:
        print("자막 게이트 실패:")
        for f in fails:
            print("  " + f)
        sys.exit(1)
    print(f"자막 게이트 통과: 영상 배선 {len(rows)}건, 면제 {len(EXEMPT)}건")


if __name__ == "__main__":
    main()
