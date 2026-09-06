#!/usr/bin/env python3
"""인강 맛보기 6본 재절단 (2026-09-06 s6, LC-2).

원천 = 판매 정본 영상 디렉터리(s23)의 <stem>.mp4 와 <stem>.srt. 절 경계는 audio/align_map.json 의 by_lecture 에서 읽는다.
매니페스트(JSON) 한 파일이 강좌 code 마다 {stem, section, target_sec, tol_sec, poster_offset_sec} 를 정한다. 시작 시각은 절 시작(초)이다.
종료 시각 = 시작 뒤 target_sec 에 가장 가까운 완결 문장 끝(자막 큐 끝이고 문면이 . ? ! 」 ” " 로 끝남), 허용 ±tol_sec, 동률이면 이른 쪽
(Codex r5 후속 판정 2026-09-06 22:5x: 75초 고정은 6본 전부 문장 중간). 실길이는 samples_manifest.json 에 박히고 빌더가 캡션에 쓴다.
산출 = assets/video/sample_<code>.{mp4,vtt,jpg} + assets/video/samples_manifest.json (sha256, 길이, 첫 큐).

게이트 (--check 만으로도 돈다):
  G1 길이 = 매니페스트 실길이(문장 끝 스냅) ±0.15s (ffprobe format.duration)
  G2 첫 자막 큐 시작 ≤ 0.5s 이고 첫 큐 문면이 절 첫 큐(srt) 문면과 같다 (문장 중간 시작 0)
  G3 mp4 크기 ≤ 2.5MB, 해상도 960x540, moov 선두(faststart)
  G4 포스터 960x540
멱등: 같은 매니페스트로 2회 돌리면 산출 sha256 동일(ffmpeg 메타데이터 시각 제거 -map_metadata -1, -fflags +bitexact).
"""
import argparse, hashlib, json, os, re, subprocess, sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "assets" / "video"
META = Path.home() / "Workspace" / "interview_meta_lecture_2027"
ALIGN = META / "audio" / "align_map.json"
SRC_DEFAULT = Path.home() / "Desktop" / "디자인_산출" / "현학적연구소_면접메타인강_슬라이드_20260905_s23" / "영상"

TS = re.compile(r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})")
SENT_END = re.compile(r'[.?!」”"]$')


def snap_end(cues, start: float, target: float, tol: float):
    """start 기준 target 초에 가장 가까운 완결 문장 끝. 후보 없으면 None."""
    cands = []
    for a, b, text in cues:
        rel = b - start
        if abs(rel - target) <= tol and SENT_END.search(text.strip()):
            cands.append((abs(rel - target), rel, text))
    if not cands:
        return None
    cands.sort(key=lambda c: (round(c[0], 3), c[1]))   # 거리 같으면 이른 쪽
    return cands[0][1], cands[0][2]


def sec(ts: str) -> float:
    h, m, s, ms = TS.match(ts).groups()
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def fmt(t: float) -> str:
    t = max(0.0, t)
    ms = int(round(t * 1000))
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def parse_srt(p: Path):
    cues = []
    for block in re.split(r"\n\s*\n", p.read_text(encoding="utf-8").strip()):
        lines = [l for l in block.splitlines() if l.strip()]
        if len(lines) < 2:
            continue
        i = 0
        if lines[0].strip().isdigit():
            i = 1
        m = re.match(r"(\S+)\s*-->\s*(\S+)", lines[i])
        if not m:
            continue
        text = " ".join(l.strip() for l in lines[i + 1:])
        cues.append((sec(m.group(1)), sec(m.group(2)), text))
    return cues


def section_start(stem: str, sec_idx: int):
    m = json.load(open(ALIGN, encoding="utf-8"))["by_lecture"][stem]
    for s in m:
        if s["sec"] == sec_idx:
            return float(s["start"]), s["sec_title"]
    raise SystemExit(f"절 {sec_idx} 없음: {stem}")


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()[:16]


def probe(p: Path):
    j = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,codec_type",
         "-of", "json", str(p)], capture_output=True, text=True, check=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    return float(j["format"]["duration"]), int(v["width"]), int(v["height"])


def moov_first(p: Path) -> bool:
    b = p.read_bytes()[:64]
    return b.find(b"moov") != -1 and (b.find(b"mdat") == -1 or b.find(b"moov") < b.find(b"mdat"))


def build_one(code, spec, src_dir: Path, dry: bool):
    stem = spec["stem"]
    start, title = section_start(stem, int(spec["section"]))
    poster_at = start + float(spec.get("poster_offset_sec", 1.0))
    src = src_dir / f"{stem}.mp4"
    srt = src_dir / f"{stem}.srt"
    if not src.exists() or not srt.exists():
        raise SystemExit(f"원천 없음: {src} / {srt}")
    mp4 = OUT / f"sample_{code}.mp4"
    vtt = OUT / f"sample_{code}.vtt"
    jpg = OUT / f"sample_{code}.jpg"
    cues = parse_srt(srt)
    first_src = next((c for c in cues if c[0] >= start - 0.05), None)
    snapped = snap_end(cues, start, float(spec.get("target_sec", 75)), float(spec.get("tol_sec", 5)))
    if snapped is None:
        raise SystemExit(f"{code}: 목표 ±허용 안에 완결 문장 끝 없음")
    length, last_text = round(snapped[0], 3), snapped[1]
    if dry:
        print(f"[dry] {code:12s} {stem} 절{spec['section']} {title} start={start:.3f} end=+{length:.1f}s 첫큐={first_src[2][:30] if first_src else '?'} 끝문장={last_text[-16:]}")
        return None
    common = ["-y", "-hide_banner", "-loglevel", "error", "-fflags", "+bitexact"]
    subprocess.run(["ffmpeg", *common, "-ss", f"{start:.3f}", "-t", f"{length:.3f}", "-i", str(src),
                    "-vf", "scale=960:-2", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-ar", "44100",
                    "-map_metadata", "-1", "-flags:v", "+bitexact", "-flags:a", "+bitexact",
                    "-movflags", "+faststart", str(mp4)], check=True)
    subprocess.run(["ffmpeg", *common, "-ss", f"{poster_at:.3f}", "-i", str(src), "-frames:v", "1",
                    "-vf", "scale=960:-2", "-q:v", "3", "-map_metadata", "-1", str(jpg)], check=True)
    out = ["WEBVTT", ""]
    kept = []
    for a, b, text in cues:
        a2, b2 = a - start, b - start
        if b2 <= 0 or a2 >= length:
            continue
        a2, b2 = max(0.0, a2), min(length, b2)
        if b2 - a2 < 0.2:
            continue
        kept.append((a2, b2, text))
        out += [f"{fmt(a2)} --> {fmt(b2)}", text, ""]
    vtt.write_text("\n".join(out), encoding="utf-8")
    return {"code": code, "stem": stem, "section": spec["section"], "section_title": title,
            "start_sec": round(start, 3), "length_sec": length, "target_sec": spec.get("target_sec", 75), "last_cue": last_text,
            "poster_sec": round(poster_at, 3),
            "first_cue": kept[0][2] if kept else "", "first_cue_src": first_src[2] if first_src else "",
            "cues": len(kept)}


def check(manifest: dict, spec_all: dict):
    fails = []
    for code, rec in manifest["samples"].items():
        mp4, vtt, jpg = (OUT / f"sample_{code}.{e}" for e in ("mp4", "vtt", "jpg"))
        dur, w, h = probe(mp4)
        L = float(rec["length_sec"])
        if abs(dur - L) > 0.15:
            fails.append(f"G1 {code} 길이 {dur:.3f} != {L}")
        vt = vtt.read_text(encoding="utf-8").split("\n")
        first = next((i for i, l in enumerate(vt) if "-->" in l), None)
        if first is None:
            fails.append(f"G2 {code} 큐 0")
        else:
            t0 = sec(vt[first].split("-->")[0].strip())
            txt = vt[first + 1].strip()
            if t0 > 0.5:
                fails.append(f"G2 {code} 첫 큐 {t0:.3f}s > 0.5")
            if txt != rec["first_cue_src"]:
                fails.append(f"G2 {code} 첫 큐 문면 불일치: {txt[:30]} / {rec['first_cue_src'][:30]}")
        if mp4.stat().st_size > 2_500_000 or (w, h) != (960, 540) or not moov_first(mp4):
            fails.append(f"G3 {code} size={mp4.stat().st_size} {w}x{h} moov_first={moov_first(mp4)}")
        pw, ph = probe(jpg)[1:]
        if (pw, ph) != (960, 540):
            fails.append(f"G4 {code} 포스터 {pw}x{ph}")
    return fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True, help="강좌 code → {stem, section, target_sec, tol_sec, poster_offset_sec}")
    ap.add_argument("--src", default=str(SRC_DEFAULT))
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--only", default=None, help="강좌 code 하나만")
    ap.add_argument("--check", action="store_true", help="산출 게이트만")
    ap.add_argument("--out", default=None, help="산출 디렉터리(기본 assets/video). 시험 절단용")
    a = ap.parse_args()
    global OUT
    if a.out:
        OUT = Path(a.out); OUT.mkdir(parents=True, exist_ok=True)
    spec_all = json.load(open(a.manifest, encoding="utf-8"))
    mpath = OUT / "samples_manifest.json"
    if a.check:
        man = json.load(open(mpath, encoding="utf-8"))
        f = check(man, spec_all)
        print("\n".join(f) if f else f"GATE PASS {len(man['samples'])}본 (G1~G4)")
        sys.exit(1 if f else 0)
    recs = {}
    for code, spec in spec_all.items():
        if a.only and code != a.only:
            continue
        r = build_one(code, spec, Path(a.src), a.dry)
        if r:
            recs[code] = r
    if a.dry:
        return
    for code in recs:
        for e in ("mp4", "vtt", "jpg"):
            recs[code][f"sha_{e}"] = sha(OUT / f"sample_{code}.{e}")
            recs[code][f"bytes_{e}"] = (OUT / f"sample_{code}.{e}").stat().st_size
    man = {"source_dir": a.src, "align_map": str(ALIGN), "samples": recs}
    mpath.write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding="utf-8")
    f = check(man, spec_all)
    for code, r in recs.items():
        print(f"{code:12s} {r['stem']} 절{r['section']} {r['start_sec']:.3f}s +{r['length_sec']:.1f}s 큐{r['cues']} mp4 {r['bytes_mp4']:,}B sha {r['sha_mp4']} 첫큐 {r['first_cue'][:22]} 끝 {r['last_cue'][-12:]}")
    print("\n".join(f) if f else f"GATE PASS {len(recs)}본 (G1~G4)")
    sys.exit(1 if f else 0)


if __name__ == "__main__":
    main()
