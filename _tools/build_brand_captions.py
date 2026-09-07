#!/usr/bin/env python3
"""브랜드 영상(brand_60s_aigen) 캡션 트랙 생성기.

이 영상은 말소리가 없다. 오디오는 음악 한 트랙이고, 뜻은 화면에 태운 타이틀 카드가 나른다.
그래서 캡션은 (1) 음악이 흐른다는 표시와 (2) 타이틀 카드 문면을 나른다.

문면과 시각의 원장은 두 곳이다.
  - 문면: _design/brand_video_20260902/titles/spec.json 의 cuts (eyebrow, headline, sub)
  - 시각: 같은 프로젝트 assemble.py 의 조립 규칙 + out/stage_c*.mp4 실측 길이
          컷 4개를 xfade 0.5초로 잇고, 로고 컷은 body 뒤에 하드 컷으로 붙는다.
          카드 등장은 컷 기준 t_in=0.6, 퇴장은 t_out=10.7 뒤 dur_out=0.45.

로고 컷(c5)만 spec.json 에 없다. 이 컷의 문면 등장 시각은 배포본 화소를 직접 재서 넣었다
(2026-09-07 실측: 국문 49.5초, 한자 50.5초, 도메인 55.0초. 잉크 비율 창별 계수).

봉인: 대상 mp4 의 sha256 이 아래 SEALED_SHA 와 다르면 멈춘다. 필름이 교체되면 시각이 통째로
바뀌므로 캡션을 그대로 두면 조용히 어긋난다. 새 필름이면 실측을 다시 하고 이 상수를 갱신할 것.

사용: python3 _tools/build_brand_captions.py [--check]
  --check 는 쓰지 않고 현재 파일과 대조만 한다 (배포 게이트용, 어긋나면 exit 1).
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO = ROOT / "assets/video/brand_60s_aigen.mp4"
OUT = ROOT / "assets/video/brand_60s_aigen.vtt"
SPEC = ROOT / "_design/brand_video_20260902/titles/spec.json"
STAGE_DIR = ROOT / "_design/brand_video_20260902/out"

SEALED_SHA = "ea356fd5c5410216a8470ea38805b8e181b92ecacd0d9924ef2e41c27fb0931e"
SEALED_DURATION = 59.958333
# 자막 파일 자체의 봉인. 설계 원본(_design)은 저장소에 추적되지 않아 깨끗한 체크아웃이나 배포
# 워크트리에는 없다. 그때는 자막을 다시 만드는 대신 이 해시로 대조한다.
SEALED_VTT_SHA = "7a29de06916264d36670ae160b5a9cdc0985a4854fe1c3f10f5a22086c5a3ca1"

XFADE = 0.5          # assemble.py 의 xfade duration
T_IN = 0.6           # spec.json tokens.t_in
T_OUT = 10.7         # spec.json tokens.t_out
DUR_OUT = 0.45       # spec.json tokens.dur_out
BODY_DURATION = 46.75  # out/body.mp4 실측. xfade 계산값 46.625 를 인코더가 프레임 경계로 올림

# 카드 하나를 두 자막으로 나눈다. 화면에는 세 줄이 한꺼번에 떠 있지만 10초를 한 자막으로
# 주면 읽기 부담이 크다. 두 자막 모두 카드가 떠 있는 창 안에 있으므로 없는 것을 말하지 않는다.
SPLIT_A = 5.0        # 앞 자막 길이
SPLIT_GAP = 0.2      # 두 자막 사이 간격

# 타이틀 카드가 화면 어느 쪽에 붙는지. 자막은 반대쪽에 둔다 (spec.json 의 anchor).
#   tl = 좌상단 → 자막은 아래(기본)   bl = 좌하단 → 자막은 위(line:0)
ANCHOR_TO_CUE_SETTING = {"tl": "", "bl": " line:0"}

# 로고 컷: spec.json 에 없다. 배포본 화소 실측값.
LOGO_CUES = [
    (49.5, 54.9, ["현학적 연구소", "玄學的 研究所"], " line:0"),
    (55.0, 59.9, ["hyunhak.com"], " line:0"),
]

# 음악 표시는 넣지 않는다. webm 에는 오디오 스트림이 아예 없고(vp9 단독) 두 지면 모두 muted 로
# 재생하므로, 소리가 난다고 적으면 대부분의 시청 경로에서 거짓이 된다. 2026-09-07 ffprobe 실측.
MUSIC_CUE = None


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def probe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def stage_durations():
    """조립 단계 mp4 의 실측 길이. 없으면 멈춘다 (짐작한 길이로 자막을 박지 않는다)."""
    d = {}
    for cid in ("c1", "c2", "c3", "c4", "c5"):
        p = STAGE_DIR / f"stage_{cid}.mp4"
        if not p.exists():
            sys.exit(f"조립 단계 파일 없음: {p}. 시각을 재구성할 수 없다")
        d[cid] = probe_duration(p)
    return d


def cut_offsets(durs):
    """assemble.py 의 이음 규칙 그대로 컷 시작 시각을 다시 계산한다."""
    pre = ["c1", "c2", "c3", "c4"]
    off = {pre[0]: 0.0}
    total = durs[pre[0]]
    for cid in pre[1:]:
        o = total - XFADE
        off[cid] = o
        total = o + durs[cid]
    off["c5"] = BODY_DURATION   # 로고 컷은 body 뒤 하드 컷
    return off


def card_lines(cut):
    """카드 한 장을 앞 자막(윗글 + 큰글)과 뒤 자막(설명)으로 가른다."""
    head = []
    if cut.get("eyebrow"):
        head.append(cut["eyebrow"])
    if cut.get("headline"):
        text = cut["headline"]
        if cut.get("glyph"):
            text = f'{text} {cut["glyph"]}'
        head.append(text)
    elif cut.get("headline_num"):
        # 쉼표로 잇는다. 지면 문면 규약이고 apply_counts 의 면수 앵커도 이 형태를 본다.
        # 그래서 필름이 태운 수치가 meta 원장과 어긋나면 면수 게이트가 먼저 빨강을 낸다.
        head.append(", ".join(num + unit for num, unit in cut["headline_num"]))
    tail = [cut["sub"]] if cut.get("sub") else []
    return head, tail


def ts(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def build():
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    durs = stage_durations()
    off = cut_offsets(durs)

    cues = [MUSIC_CUE] if MUSIC_CUE else []
    for cut in spec["cuts"]:
        cid = cut["id"]
        base = off[cid]
        setting = ANCHOR_TO_CUE_SETTING[cut.get("anchor", "tl")]
        card_in = base + T_IN
        card_out = base + T_OUT + DUR_OUT
        head, tail = card_lines(cut)
        if head:
            a_end = min(card_in + SPLIT_A, card_out)
            cues.append((card_in, a_end, head, setting))
            if tail:
                b_in = a_end + SPLIT_GAP
                if b_in < card_out:
                    cues.append((b_in, card_out, tail, setting))
        elif tail:
            cues.append((card_in, card_out, tail, setting))
    cues.extend(LOGO_CUES)
    cues.sort(key=lambda c: c[0])
    return deoverlap(cues)


MIN_CUE = 1.5


def deoverlap(cues):
    """앞 자막과 겹치면 뒤 자막 시작을 민다. 카드가 떠 있는 창 안이라 없는 것을 말하지 않는다.
    밀어서 1.5초보다 짧아지면 멈춘다. 조용히 읽을 수 없는 자막을 만들지 않는다."""
    out = []
    for start, end, lines, setting in cues:
        if out:
            floor = out[-1][1] + SPLIT_GAP
            if start < floor:
                start = floor
        if end - start < MIN_CUE:
            sys.exit(f"자막이 너무 짧아진다: {lines} ({start:.3f} -> {end:.3f})")
        out.append((start, end, lines, setting))
    return out


def render(cues):
    parts = ["WEBVTT", ""]
    for i, (start, end, lines, setting) in enumerate(cues, 1):
        parts.append(str(i))
        parts.append(f"{ts(start)} --> {ts(end)}{setting}")
        parts.extend(lines)
        parts.append("")
    return "\n".join(parts)


def selfcheck(cues, duration):
    """자막이 영상 밖을 가리키거나 서로 겹치면 멈춘다."""
    bad = []
    for i, (start, end, lines, _) in enumerate(cues):
        if not lines or not all(l.strip() for l in lines):
            bad.append(f"#{i + 1} 빈 줄")
        if end <= start:
            bad.append(f"#{i + 1} 끝이 시작보다 앞 ({start} -> {end})")
        if end > duration + 0.001:
            bad.append(f"#{i + 1} 영상 길이 {duration:.3f} 초과 ({end})")
        if i and start < cues[i - 1][1] - 0.001:
            bad.append(f"#{i + 1} 앞 자막과 겹침 ({cues[i - 1][1]} -> {start})")
        if len(lines) > 3:
            bad.append(f"#{i + 1} 네 줄 이상")
    if bad:
        sys.exit("자막 자체검사 실패:\n  " + "\n  ".join(bad))


# 지면의 숨은 대본 문단. 자막과 같은 원장에서 나와야 둘이 어긋나지 않는다.
TRANSCRIPT_SLOTS = [
    ("index.html", "hero-film-tx"),
    ("about.html", "film-tx"),
]
TRANSCRIPT_HEAD = "영상에 나오는 글자."


def parse(text):
    """자막 파일을 다시 큐 목록으로 읽는다. 설계 원본이 없는 트리에서 대본을 유도할 때 쓴다."""
    cues, block = [], []
    for line in text.split("\n")[1:] + [""]:
        if line.strip() == "":
            if len(block) >= 2 and "-->" in block[1]:
                a, b = block[1].split("-->")
                setting = ""
                bb = b.strip().split(" ", 1)
                if len(bb) == 2:
                    setting = " " + bb[1]
                cues.append((a.strip(), bb[0], block[2:], setting))
            block = []
        else:
            block.append(line)
    return cues


def transcript(cues):
    parts = [TRANSCRIPT_HEAD]
    for _, _, lines, _ in cues:
        for line in lines:
            if line.startswith("["):      # 음악 표시는 대본이 아니다
                continue
            parts.append(line if line.endswith(".") else line + ".")
    return " ".join(parts)


def sync_transcript(text, check):
    """지면의 대본 문단을 자막에서 파생시킨다. --check 면 대조만 한다."""
    bad = []
    for name, slot in TRANSCRIPT_SLOTS:
        p = ROOT / name
        body = p.read_text(encoding="utf-8")
        pat = re.compile(r'(<p id="' + re.escape(slot) + r'"[^>]*>)(.*?)(</p>)', re.S)
        m = pat.search(body)
        if not m:
            bad.append(f"{name}: id={slot} 문단 없음")
            continue
        if m.group(2) == text:
            continue
        if check:
            bad.append(f"{name}: 대본 문단이 자막과 다르다")
        else:
            p.write_text(body[:m.start(2)] + text + body[m.end(2):], encoding="utf-8")
            print(f"대본 문단 갱신: {name}#{slot}")
    if bad:
        sys.exit("대본 대조 실패:\n  " + "\n  ".join(bad))


def main():
    check = "--check" in sys.argv
    if not VIDEO.exists():
        sys.exit(f"영상 없음: {VIDEO}")
    got = sha256(VIDEO)
    if got != SEALED_SHA:
        sys.exit(
            "봉인 불일치. 배포 영상이 캡션을 잰 그 파일이 아니다.\n"
            f"  기대 {SEALED_SHA}\n  실측 {got}\n"
            "새 필름이면 타이틀 시각을 다시 재고 SEALED_SHA 와 로고 컷 실측값을 갱신할 것")
    duration = probe_duration(VIDEO)
    if abs(duration - SEALED_DURATION) > 0.01:
        sys.exit(f"길이 불일치: 기대 {SEALED_DURATION} 실측 {duration}")

    if not SPEC.exists() or not (STAGE_DIR / "stage_c1.mp4").exists():
        if not check:
            sys.exit(f"설계 원본 없음: {SPEC}. 자막을 다시 만들려면 원본이 있는 트리에서 돌릴 것")
        if not OUT.exists():
            sys.exit(f"자막 파일 없음: {OUT}")
        got_vtt = sha256(OUT)
        if got_vtt != SEALED_VTT_SHA:
            sys.exit(f"자막 봉인 불일치\n  기대 {SEALED_VTT_SHA}\n  실측 {got_vtt}")
        sync_transcript(transcript(parse(OUT.read_text(encoding="utf-8"))), True)
        print(f"자막 봉인 대조 통과(설계 원본 없는 트리): {OUT.name}")
        return

    cues = build()
    selfcheck(cues, duration)
    text = render(cues)

    tx = transcript(cues)
    if check:
        if not OUT.exists():
            sys.exit(f"자막 파일 없음: {OUT}")
        cur = OUT.read_text(encoding="utf-8")
        if cur != text:
            sys.exit(f"자막 파일이 생성기 산출과 다르다: {OUT}. 생성기를 다시 돌릴 것")
        sync_transcript(tx, True)
        print(f"자막 대조 통과: {OUT.name} 자막 {len(cues)}개, 대본 문단 {len(TRANSCRIPT_SLOTS)}곳")
        return
    OUT.write_text(text, encoding="utf-8")
    sync_transcript(tx, False)
    print(f"생성: {OUT.relative_to(ROOT)}  자막 {len(cues)}개  마지막 {cues[-1][1]:.3f}초 / 영상 {duration:.3f}초")


if __name__ == "__main__":
    main()
