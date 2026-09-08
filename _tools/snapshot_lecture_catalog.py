#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""snapshot_lecture_catalog.py — _tools/lecture_catalog.json (D1 lectures 스냅샷) 재생성기 (2026-09-08 신설).

왜: build_lectures.py 가 읽는 이 스냅샷은 09-06 에 한 번 손으로 떠진 뒤 생성기가 없었다. D1 이 바뀌면(기출 5편 길이 갱신,
강의 추가) 오류 0 으로 낡는다(feedback_derived_site_artifacts_stale_on_canonical_update). 생성기를 두고 변경 내역을 지면에 남긴다.

형식 = 기존 파일과 같은 키 순서·indent 1·ensure_ascii False. duration_sec 은 정수(round). published_at 은 날짜 10자.
정렬 = kind, unit_code, seq (기존 파일 실측 순서).

부분 갱신 (--only id,id,…): 지정 강의만 원천 값으로 바꾸고 나머지 행·n·snapshot_at 은 파일 그대로 둔다. 한 결재의 범위가 몇 편일 때
쓴다(2026-09-08 실측: 전체 재스냅샷은 다른 스레드의 길이 변경 20건과 OT 0강(L0-0, 회원 무료·API 가 덮는 강의)을 끌고 와
"공통 풀이 4편" 문면과 v2_check 금지 문자 게이트를 깼다). 부분 갱신 이력은 partial_updates 에 남는다.

사용:
  python3 _tools/snapshot_lecture_catalog.py                 # 원격 D1 읽기 → 변경 요약 출력 → 파일 갱신
  python3 _tools/snapshot_lecture_catalog.py --only lec_a,lec_b   # 그 강의만 갱신 (원격 또는 --rows-json)
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
    ap.add_argument("--rows-json", help="원격 대신 읽을 원천: 원시 행 리스트 또는 {lectures:[…]} 카탈로그 꼴")
    ap.add_argument("--only", help="쉼표 구분 강의 id. 이 강의만 갱신(부분 갱신)")
    a = ap.parse_args()
    if a.rows_json:
        src = json.loads(Path(a.rows_json).read_text(encoding="utf-8"))
        rows = src["lectures"] if isinstance(src, dict) else src
    else:
        rows = d1(SQL)
    new = [norm(r) for r in rows]
    old = json.loads(CAT.read_text(encoding="utf-8")) if CAT.exists() else {"lectures": []}
    only = [x.strip() for x in a.only.split(",") if x.strip()] if a.only else None
    if only:
        src_map = {l["id"]: l for l in new}
        missing = [i for i in only if i not in src_map]
        if missing:
            print(f"--only 강의가 원천에 없다: {missing}", file=sys.stderr); return 2
        merged = [src_map[l["id"]] if l["id"] in only else l for l in old["lectures"]]
        absent = [i for i in only if i not in {l["id"] for l in old["lectures"]}]
        if absent:
            print(f"--only 강의가 파일에 없다(부분 갱신은 추가를 안 한다): {absent}", file=sys.stderr); return 2
        new = merged
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
    if only:
        out = dict(old); out["lectures"] = new; out["n"] = len(new)
        out["partial_updates"] = (old.get("partial_updates") or []) + [{"at": kst, "ids": only, "source": "D1 hyunhak.lectures (remote, read-only)" if not a.rows_json else f"offline {a.rows_json}"}]
        note = f"부분 갱신 {len(only)}편, snapshot_at 유지 {old.get('snapshot_at')}"
    else:
        out = {"snapshot_at": kst, "source": "D1 hyunhak.lectures (remote, read-only)", "n": len(new)}
        # 전체 재스냅샷은 부분 갱신을 값으로 흡수하지만 이력까지 흡수하지는 않는다.
        # 그냥 덮어쓰면 "언제 무엇을 몇 편만 고쳤나" 가 사라지므로 옮겨 적는다 (GE-4).
        if old.get("partial_updates"):
            out["partial_updates_superseded"] = old["partial_updates"]
        out["lectures"] = new
        note = f"snapshot_at={kst}" + (f", 부분 갱신 이력 {len(old['partial_updates'])}건 이월" if old.get("partial_updates") else "")
    CAT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"갱신 → {CAT} {note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
