#!/usr/bin/env python3
"""브랜드 필름 v2 「대답의 편집실」 캡션 트랙 생성기 (히어로 24초 + 정본 43초). v1 build_brand_captions.py 의 규약 승계.

말소리 없는 영상이라 캡션은 화면에 태운 텍스트 층 문면을 나른다(웹판 무음, 음악 표시 없음).
문면·시각 원장 = _design/brand_film_v2_20260907/titles/titles_timeline.json (블록별 절대 시각 t_in/t_out, version master|hero).
  - lines 블록: headline 줄은 띄어쓰기로 잇고 sub 줄은 쉼표로 잇는다(3줄 이하). anchor tl(좌상단 타이틀) → 자막은 아래 line:-4(버튼 위).
  - svg 블록(엔드카드 로고) → 「현학적 연구소 / 玄學的 研究所」 line:0(위). address 블록(hyunhak.com, 좌하단) → line:0. 두 블록이 같은 창을 쓰면 겹침을 반으로 가른다.
  - dot 블록(朱印 녹화 점)은 문면이 아니다.
봉인: 배포 mp4 sha256 가 SEALED 와 다르면 멈춘다(필름 교체 = 시각 전면 변경). 설계 원본(_design)이 없는 트리(배포 워크트리)에서는 vtt sha 로 대조한다.
지면 대본 문단(index #hero-film-tx = 히어로, about #film-tx = 정본)은 자막에서 파생한다.

사용: python3 _tools/build_brand_captions_v2.py [--check]
"""
import hashlib, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "_design/brand_film_v2_20260907/titles/titles_timeline.json"
FILMS = {
    "hero": {"video": "assets/video/brand_v2_hero_aigen.mp4", "out": "assets/video/brand_v2_hero_aigen.vtt", "version": "hero",
             "sha": "563274e0016d5a3256bd4c32c8923e75adfc403ff2eb04ed91553b01370e2018", "duration": 24.0, "slots": [("index.html", "hero-film-tx")]},
    "full": {"video": "assets/video/brand_v2_full_aigen.mp4", "out": "assets/video/brand_v2_full_aigen.vtt", "version": "master",
             "sha": "dde885680494d520c9fbf9e9d69adeabc9712d5a99f07fbf064b708932af7b95", "duration": 43.0, "slots": [("about.html", "film-tx")]},
}
SEALED_VTT_SHA = {"hero": "937b39ad579aaf27f5ca3f1ff5af5eb7321182a62d86dd2e5315cd81944bd6c6", "full": "244715cb0c71a1daa446ecbe3da7eb4d9c9b667c385b85d258a4f5bfecbdf7ed"}   # 첫 생성 뒤 박제(설계 원본 없는 트리 대조용)
LOGO_LINES = ["현학적 연구소", "玄學的 研究所"]
GAP, MIN_CUE = 0.2, 1.5
TRANSCRIPT_HEAD = "영상에 나오는 글자."


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def probe_duration(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True).stdout.strip())


def ts(sec):
    ms = int(round(sec * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def block_lines(b):
    if b.get("svg"):
        return list(LOGO_LINES), " line:0"
    lines, buf, role_prev = [], [], None
    for ln in b.get("lines", []):
        role = "sub" if ln.get("role") == "sub" else ("address" if ln.get("role") == "address" else "headline")
        if buf and role != role_prev:
            lines.append((" " if role_prev == "headline" else ", ").join(buf)); buf = []
        buf.append(ln["text"]); role_prev = role
    if buf:
        lines.append((" " if role_prev == "headline" else ", ").join(buf))
    bottom = any(ln.get("role") == "address" for ln in b.get("lines", [])) or int(b.get("y", 120)) > 540
    return lines, (" line:0" if bottom else " line:-4")


def build(version):
    blocks = [b for b in json.loads(SPEC.read_text(encoding="utf-8")) if b.get("version") == version and not b.get("dot")]
    cues = []
    for b in sorted(blocks, key=lambda b: float(b["t_in"])):
        lines, setting = block_lines(b)
        cues.append([float(b["t_in"]), float(b["t_out"]), lines, setting])
    # 겹침: 같은 끝(엔드카드 로고 + 주소)이면 반으로 가르고, 아니면 뒤를 민다(v1 규약)
    out = []
    for c in cues:
        if out and c[0] < out[-1][1] + GAP:
            if abs(c[1] - out[-1][1]) < 0.001:
                mid = (c[0] + c[1]) / 2; out[-1][1] = mid - GAP / 2; c[0] = mid + GAP / 2
            else:
                c[0] = out[-1][1] + GAP
        out.append(c)
    return [tuple(c) for c in out]


def selfcheck(cues, duration):
    bad = []
    for i, (s, e, lines, _) in enumerate(cues):
        if not lines or not all(l.strip() for l in lines): bad.append(f"#{i+1} 빈 줄")
        if e - s < MIN_CUE: bad.append(f"#{i+1} {MIN_CUE}s 미만 ({s:.3f}->{e:.3f})")
        if e > duration + 0.001: bad.append(f"#{i+1} 영상 길이 {duration:.3f} 초과 ({e})")
        if i and s < cues[i-1][1] - 0.001: bad.append(f"#{i+1} 앞 자막과 겹침")
        if len(lines) > 3: bad.append(f"#{i+1} 네 줄 이상")
    if bad: sys.exit("자막 자체검사 실패:\n  " + "\n  ".join(bad))


def render(cues):
    parts = ["WEBVTT", ""]
    for i, (s, e, lines, setting) in enumerate(cues, 1):
        parts += [str(i), f"{ts(s)} --> {ts(e)}{setting}", *lines, ""]
    return "\n".join(parts)


def parse(text):
    cues, block = [], []
    for line in text.split("\n")[1:] + [""]:
        if line.strip() == "":
            if len(block) >= 2 and "-->" in block[1]:
                a, b = block[1].split("-->"); bb = b.strip().split(" ", 1)
                cues.append((a.strip(), bb[0], block[2:], (" " + bb[1]) if len(bb) == 2 else ""))
            block = []
        else:
            block.append(line)
    return cues


def transcript(cues):
    parts = [TRANSCRIPT_HEAD]
    for _, _, lines, _ in cues:
        parts += [l if l.endswith(".") else l + "." for l in lines]
    return " ".join(parts)


def sync_transcript(text, slots, check):
    bad = []
    for name, slot in slots:
        p = ROOT / name; body = p.read_text(encoding="utf-8")
        m = re.compile(r'(<p id="' + re.escape(slot) + r'"[^>]*>)(.*?)(</p>)', re.S).search(body)
        if not m: bad.append(f"{name}: id={slot} 문단 없음"); continue
        if m.group(2) == text: continue
        if check: bad.append(f"{name}: 대본 문단이 자막과 다르다")
        else:
            p.write_text(body[:m.start(2)] + text + body[m.end(2):], encoding="utf-8"); print(f"대본 문단 갱신: {name}#{slot}")
    if bad: sys.exit("대본 대조 실패:\n  " + "\n  ".join(bad))


def main():
    check = "--check" in sys.argv
    for key, f in FILMS.items():
        video, out = ROOT / f["video"], ROOT / f["out"]
        if not video.exists(): sys.exit(f"영상 없음: {video}")
        got = sha256(video)
        if got != f["sha"]: sys.exit(f"[{key}] 봉인 불일치. 배포 영상이 캡션을 잰 파일이 아니다.\n  기대 {f['sha']}\n  실측 {got}\n새 필름이면 titles_timeline.json 과 sha 를 갱신할 것")
        dur = probe_duration(video)
        if abs(dur - f["duration"]) > 0.01: sys.exit(f"[{key}] 길이 불일치: 기대 {f['duration']} 실측 {dur}")
        if not SPEC.exists():
            if not check: sys.exit(f"설계 원본 없음: {SPEC}. 원본이 있는 트리에서 생성할 것")
            if not out.exists(): sys.exit(f"자막 파일 없음: {out}")
            if SEALED_VTT_SHA[key] and sha256(out) != SEALED_VTT_SHA[key]: sys.exit(f"[{key}] 자막 봉인 불일치")
            sync_transcript(transcript(parse(out.read_text(encoding="utf-8"))), f["slots"], True)
            print(f"[{key}] 자막 봉인 대조 통과(설계 원본 없는 트리)"); continue
        cues = build(f["version"]); selfcheck(cues, dur); text = render(cues); tx = transcript(cues)
        if check:
            if not out.exists() or out.read_text(encoding="utf-8") != text: sys.exit(f"[{key}] 자막 파일이 생성기 산출과 다르다: {out}")
            sync_transcript(tx, f["slots"], True); print(f"[{key}] 자막 대조 통과: {out.name} {len(cues)}개, 대본 {len(f['slots'])}곳"); continue
        out.write_text(text, encoding="utf-8"); sync_transcript(tx, f["slots"], False)
        print(f"[{key}] 생성: {f['out']} 자막 {len(cues)}개 마지막 {cues[-1][1]:.3f}s / 영상 {dur:.3f}s")


if __name__ == "__main__":
    main()
