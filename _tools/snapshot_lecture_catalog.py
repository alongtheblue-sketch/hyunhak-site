#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""snapshot_lecture_catalog.py — _tools/lecture_catalog.json (D1 lectures 스냅샷) 재생성기 (2026-09-08 신설).

왜: build_lectures.py 가 읽는 이 스냅샷은 09-06 에 한 번 손으로 떠진 뒤 생성기가 없었다. D1 이 바뀌면(기출 5편 길이 갱신,
강의 추가) 오류 0 으로 낡는다(feedback_derived_site_artifacts_stale_on_canonical_update). 생성기를 두고 변경 내역을 지면에 남긴다.

형식 = 기존 파일과 같은 키 순서·indent 1·ensure_ascii False. duration_sec 은 정수(round). published_at 은 날짜 10자.
정렬 = kind, unit_code, seq (기존 파일 실측 순서).

사용:
  python3 _tools/snapshot_lecture_catalog.py                 # 원격 D1 읽기 → 변경 요약 출력 → 파일 갱신
  python3 _tools/snapshot_lecture_catalog.py --check         # 갱신 없이 원격 대 파일 차이만 (rc 0 = 같음, 1 = 낡음, 2 = 검사불가)
  python3 _tools/snapshot_lecture_catalog.py --rows-json r.json   # 오프라인 (테스트)
"""
import argparse, datetime, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAT = ROOT / "_tools/lecture_catalog.json"
API = Path.home() / "Workspace/hyunhak-api"
UNPROXY = ["env", "-u", "NODE_OPTIONS", "-u", "HTTP_PROXY", "-u", "HTTPS_PROXY", "-u", "http_proxy", "-u", "https_proxy", "NO_PROXY=*"]
FIELDS = ["id", "kind", "unit_code", "passage_set_id", "seq", "title", "subtitle", "duration_sec", "status", "published_at", "access"]
SQL = ("SELECT id, kind, unit_code, passage_set_id, seq, title, subtitle, duration_sec, status, published_at, access "
       "FROM lectures ORDER BY kind, unit_code, seq")


def d1(sql):
    p = subprocess.run([*UNPROXY, "npx", "wrangler", "d1", "execute", "hyunhak", "--remote", "--json", "--command", sql],
                       cwd=str(API), capture_output=True, text=True)
    if p.returncode != 0:
        print(f"D1 조회 실패 rc={p.returncode}\n{p.stderr[-800:]}", file=sys.stderr)
        sys.exit(2)   # 2 = 검사불가 (1 = 낡음 과 가른다)
    s = p.stdout
    try:
        return json.loads(s[s.find("["):])[0]["results"]
    except Exception as e:
        print(f"D1 응답 파싱 실패: {e}\n{s[:300]}", file=sys.stderr)
        sys.exit(2)


def norm(r):
    o = {k: r.get(k) for k in FIELDS}
    o["duration_sec"] = int(round(float(r["duration_sec"]))) if r.get("duration_sec") is not None else None
    o["published_at"] = (r.get("published_at") or None) and str(r["published_at"])[:10]
    return o


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--rows-json")
    a = ap.parse_args()
    rows = json.loads(Path(a.rows_json).read_text(encoding="utf-8")) if a.rows_json else d1(SQL)
    new = [norm(r) for r in rows]
    old = json.loads(CAT.read_text(encoding="utf-8")) if CAT.exists() else {"lectures": []}
    om = {l["id"]: l for l in old["lectures"]}
    nm = {l["id"]: l for l in new}
    added = [i for i in nm if i not in om]
    removed = [i for i in om if i not in nm]
    changed = []
    for i in nm:
        if i in om and om[i] != nm[i]:
            diff = {k: (om[i].get(k), nm[i].get(k)) for k in FIELDS if om[i].get(k) != nm[i].get(k)}
            changed.append((i, diff))
    print(f"원격 n={len(new)} · 파일 n={old.get('n', len(old['lectures']))} ({old.get('snapshot_at', '?')}) · 추가 {len(added)} · 삭제 {len(removed)} · 변경 {len(changed)}")
    for i in added: print(f"  + {i}")
    for i in removed: print(f"  - {i}")
    for i, d in changed: print(f"  ~ {i} {d}")
    stale = bool(added or removed or changed)
    if a.check:
        return 1 if stale else 0
    if not stale:
        print("변경 없음, 파일 유지")
        return 0
    kst = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%dT%H:%M+09:00")
    out = {"snapshot_at": kst, "source": "D1 hyunhak.lectures (remote, read-only)", "n": len(new), "lectures": new}
    CAT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"갱신 → {CAT} snapshot_at={kst}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
