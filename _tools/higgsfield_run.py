#!/usr/bin/env python3
"""힉스필드 생성 세트 실행기 — _design/higgsfield_jobs.json 의 cmd 를 제출하고 완료 시 out_path 로 내려받는다.

사용:
  higgsfield_run.py submit  [--approved 304]   # 제출 + 폴링 + 다운로드. 원장 없을 때만 제출(이중 소비 차단)
  higgsfield_run.py resume  <ledger.json>      # 기존 원장의 잡만 폴링 + 다운로드(재제출 없음)

원장 = _design/higgsfield_run_<ts>.json, 로그 = _design/higgsfield_run.log
"""
import json, os, re, subprocess, sys, time, datetime, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
JOBS = ROOT / "_design" / "higgsfield_jobs.json"
DESIGN = ROOT / "_design"
LOG = DESIGN / "higgsfield_run.log"
ENV = dict(os.environ, HIGGSFIELD_DISABLE_TELEMETRY="1", HIGGSFIELD_NO_UPDATE_CHECK="1")
HF = os.path.expanduser("~/.local/bin/higgsfield")
POLL_SEC = 20
MAX_WAIT_SEC = 40 * 60


def log(msg):
    line = f"{datetime.datetime.now().strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def submit_cmd(cmd):
    cmd = re.sub(r"\s--wait-timeout\s+\S+", "", cmd)
    cmd = re.sub(r"\s--wait\b", "", cmd)
    return cmd + " --json"


def run(cmd):
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True, env=ENV)
    return p.returncode, p.stdout.strip(), p.stderr.strip()


def parse_ids(out):
    try:
        d = json.loads(out)
    except Exception:
        m = re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", out)
        return list(dict.fromkeys(m))
    if isinstance(d, list):
        ids = []
        for x in d:
            if isinstance(x, str):
                ids.append(x)
            elif isinstance(x, dict) and x.get("id"):
                ids.append(x["id"])
        return ids
    if isinstance(d, dict):
        if d.get("id"):
            return [d["id"]]
        for k in ("ids", "job_ids", "jobs", "data"):
            if isinstance(d.get(k), list):
                return parse_ids(json.dumps(d[k]))
    return []


def get_job(hf_id):
    rc, out, err = run(f"{HF} generate get {hf_id} --json")
    if rc != 0:
        return {"status": "error", "error": err[:300]}
    try:
        return json.loads(out)
    except Exception:
        return {"status": "unparsed", "raw": out[:300]}


def download(url, out_path):
    out_path = pathlib.Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "hyunhak-site-runner/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r, open(out_path, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    return out_path.stat().st_size


def save(ledger_path, ledger):
    tmp = ledger_path.with_suffix(".tmp")
    tmp.write_text(json.dumps(ledger, ensure_ascii=False, indent=2))
    tmp.replace(ledger_path)


def poll(ledger_path, ledger):
    start = time.time()
    while time.time() - start < MAX_WAIT_SEC:
        pending = [k for k, v in ledger["jobs"].items() if v["status"] not in ("downloaded", "failed", "nsfw")]
        if not pending:
            break
        for k in pending:
            v = ledger["jobs"][k]
            if not v.get("hf_ids"):
                v["status"] = "failed"
                continue
            hf_id = v["hf_ids"][0]
            j = get_job(hf_id)
            st = (j.get("status") or "").lower()
            v["last_status"] = st
            if st == "completed" and j.get("result_url"):
                try:
                    size = download(j["result_url"], v["out_path"])
                    v["status"] = "downloaded"
                    v["result_url"] = j["result_url"]
                    v["bytes"] = size
                    log(f"DONE {k} {size/1e6:.2f}MB -> {v['out_path']}")
                except Exception as e:
                    v["status"] = "download_error"
                    v["error"] = str(e)[:200]
                    log(f"DLERR {k} {e}")
            elif st in ("failed", "error", "nsfw", "cancelled"):
                v["status"] = "nsfw" if st == "nsfw" else "failed"
                v["error"] = json.dumps(j, ensure_ascii=False)[:300]
                log(f"FAIL {k} {st} {v['error'][:120]}")
            else:
                v["status"] = st or "pending"
        save(ledger_path, ledger)
        remaining = [k for k, v in ledger["jobs"].items() if v["status"] not in ("downloaded", "failed", "nsfw")]
        if remaining:
            log(f"poll: {len(remaining)} pending {remaining}")
            time.sleep(POLL_SEC)
    done = sum(1 for v in ledger["jobs"].values() if v["status"] == "downloaded")
    log(f"END downloaded {done}/{len(ledger['jobs'])}")
    save(ledger_path, ledger)
    return done


def cmd_submit(approved):
    jobs = json.loads(JOBS.read_text())
    total = sum(j["cost_credits"] for j in jobs)
    if total > approved:
        sys.exit(f"cost {total} > approved {approved}: abort")
    existing = sorted(DESIGN.glob("higgsfield_run_*.json"))
    if existing:
        sys.exit(f"ledger exists ({existing[-1].name}) — use resume to avoid double spend")
    ts = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    ledger_path = DESIGN / f"higgsfield_run_{ts}.json"
    ledger = {"ts": ts, "approved": approved, "cost_total": total, "jobs": {}}
    rc, out, _ = run(f"{HF} account status")
    log(f"SUBMIT start balance='{out}' cost_total={total}")
    for j in jobs:
        rc, out, err = run(submit_cmd(j["cmd"]))
        ids = parse_ids(out) if rc == 0 else []
        ledger["jobs"][j["id"]] = {
            "model": j["model"], "cost": j["cost_credits"], "out_path": j["out_path"],
            "promote_to": j.get("promote_to"), "hf_ids": ids,
            "status": "submitted" if ids else "failed",
            "submit_out": out[:300], "submit_err": err[:300],
        }
        log(f"submitted {j['id']} ids={ids} rc={rc}" + (f" err={err[:120]}" if err else ""))
        save(ledger_path, ledger)
    poll(ledger_path, ledger)
    rc, out, _ = run(f"{HF} account status")
    ledger["balance_after"] = out
    save(ledger_path, ledger)
    log(f"balance after='{out}'")


def cmd_resume(path):
    ledger_path = pathlib.Path(path)
    ledger = json.loads(ledger_path.read_text())
    poll(ledger_path, ledger)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == "submit":
        approved = 304
        if "--approved" in sys.argv:
            approved = float(sys.argv[sys.argv.index("--approved") + 1])
        cmd_submit(approved)
    elif sys.argv[1] == "resume":
        cmd_resume(sys.argv[2])
    else:
        sys.exit(__doc__)
