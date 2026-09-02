#!/usr/bin/env python3
"""힉스필드 gpt_image_2 배치 생성기 (게이트: 캡, 원장, 원본 응답 선저장).

- 집행 경로 = 본 스크립트 하나. dry-run 은 --dry (cost 만 조회, 제출 0).
- 캡 = jobs.json cap_credits. 누적 cost + 다음 cost > 캡이면 제출하지 않고 멈춘다.
- create 응답은 파싱 전에 gen/<id>_create.json 으로 먼저 저장한다.
- 제출 즉시 gen/ledger.jsonl 에 1줄 append. 동시 진행 ≤5.
- 결과 파일명 = gen/<id>_aigen.png (AI 라벨).
"""
import json, os, subprocess, sys, time, datetime, urllib.request, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
GEN = ROOT / 'gen'
GEN.mkdir(exist_ok=True)
LEDGER = GEN / 'ledger.jsonl'
LOG = GEN / 'gen.log'
HF = os.environ.get('HF_BIN', 'higgsfield')
DRY = '--dry' in sys.argv
ONLY = [a.split('=', 1)[1] for a in sys.argv if a.startswith('--only=')]

ENV = dict(os.environ)
for k in ('HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy'):
    ENV.pop(k, None)
ENV['HIGGSFIELD_DISABLE_TELEMETRY'] = '1'
ENV['HIGGSFIELD_NO_UPDATE_CHECK'] = '1'
ENV['NO_PROXY'] = '*'


def log(msg):
    line = f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG, 'a') as f:
        f.write(line + '\n')


def run(args, timeout=120):
    p = subprocess.run([HF] + args, env=ENV, capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout, p.stderr


def cost_of(model, params):
    args = ['generate', 'cost', model]
    for k, v in params.items():
        args += [f'--{k}', str(v)]
    rc, out, err = run(args)
    if rc != 0:
        raise RuntimeError(f'cost failed rc={rc} out={out} err={err}')
    tok = out.strip().split()[0]
    return float(tok)


def spent_so_far():
    s = 0.0
    if LEDGER.exists():
        for line in LEDGER.read_text().splitlines():
            if line.strip():
                s += float(json.loads(line).get('cost', 0))
    return s


def submitted_ids():
    d = {}
    if LEDGER.exists():
        for line in LEDGER.read_text().splitlines():
            if line.strip():
                r = json.loads(line)
                d[r['id']] = r
    return d


def submit(model, job, params):
    args = ['generate', 'create', model, '--json']
    for k, v in params.items():
        args += [f'--{k}', str(v)]
    rc, out, err = run(args)
    raw_path = GEN / f"{job['id']}_create.json"
    raw_path.write_text(json.dumps({'rc': rc, 'stdout': out, 'stderr': err, 'ts': datetime.datetime.now().isoformat()}, ensure_ascii=False, indent=1))
    if rc != 0:
        raise RuntimeError(f"create failed rc={rc} err={err[:300]} out={out[:300]}")
    # 실응답 = 문자열 리스트. 배너 ▲ [WARNING] 대비: 마지막 '[' 부터 파싱
    txt = out.strip()
    i = txt.rfind('[')
    data = json.loads(txt[i:])
    if isinstance(data, list):
        hf_id = data[0] if data else None
    elif isinstance(data, dict):
        hf_id = data.get('id') or (data.get('ids') or [None])[0]
    else:
        hf_id = None
    if not hf_id:
        raise RuntimeError(f'no job id in response: {out[:300]}')
    return hf_id


def get_job(hf_id):
    rc, out, err = run(['generate', 'get', hf_id, '--json'])
    if rc != 0:
        return {'status': 'error', 'err': err[:200]}
    txt = out.strip()
    i = txt.find('{')
    try:
        return json.loads(txt[i:])
    except Exception:
        return {'status': 'parse_error', 'raw': txt[:200]}


def result_url(j):
    for k in ('result_url', 'url', 'output_url'):
        if j.get(k):
            return j[k]
    r = j.get('result') or j.get('results') or {}
    if isinstance(r, dict):
        for k in ('url', 'image_url', 'result_url'):
            if r.get(k):
                return r[k]
        for v in r.values():
            if isinstance(v, str) and v.startswith('http'):
                return v
    if isinstance(r, list) and r:
        x = r[0]
        if isinstance(x, str):
            return x
        if isinstance(x, dict):
            for k in ('url', 'image_url'):
                if x.get(k):
                    return x[k]
    return None


def download(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': 'curl/8.0'})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(req, timeout=120) as r, open(dest, 'wb') as f:
        f.write(r.read())
    return dest.stat().st_size


def main():
    spec = json.loads((HERE / 'jobs.json').read_text())
    model, cap = spec['model'], float(spec['cap_credits'])
    jobs = spec['jobs']
    if ONLY:
        jobs = [j for j in jobs if j['id'] in ONLY]
    done = submitted_ids()
    spent = spent_so_far()
    log(f"start dry={DRY} cap={cap} spent_before={spent} jobs={len(jobs)}")

    # 1) 비용 선계산 (무료)
    plan = []
    for j in jobs:
        params = {'prompt': j['prompt'] + ' ' + spec['style'], 'aspect_ratio': j['aspect_ratio'], **spec['common']}
        c = cost_of(model, params)
        plan.append((j, params, c))
        log(f"cost {j['id']} = {c}")
    total = sum(c for _, _, c in plan)
    log(f"plan total = {total} (+spent {spent} = {spent + total}) cap {cap}")
    if DRY:
        return

    # 2) 제출 (동시 ≤5) + 폴링 + 다운로드
    inflight = {}
    queue = [(j, p, c) for (j, p, c) in plan if j['id'] not in done or done[j['id']].get('status') not in ('downloaded',)]
    results = {}
    while queue or inflight:
        while queue and len(inflight) < 5:
            j, p, c = queue[0]
            if spent + c > cap + 1e-9:
                log(f"CAP STOP: spent {spent} + {c} > {cap}; remaining {[q[0]['id'] for q in queue]}")
                queue = []
                break
            queue.pop(0)
            try:
                hf_id = submit(model, j, p)
            except Exception as e:
                log(f"submit FAIL {j['id']}: {e}")
                continue
            spent += c
            rec = {'id': j['id'], 'hf_id': hf_id, 'model': model, 'cost': c, 'ts': datetime.datetime.now().isoformat(), 'status': 'submitted', 'purpose': j['purpose']}
            with open(LEDGER, 'a') as f:
                f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            inflight[j['id']] = (rec, time.time())
            log(f"submitted {j['id']} hf={hf_id} cost={c} spent={spent}")
        time.sleep(8)
        for jid in list(inflight):
            rec, t0 = inflight[jid]
            info = get_job(rec['hf_id'])
            st = info.get('status')
            if st in ('completed', 'succeeded', 'done'):
                url = result_url(info)
                dest = GEN / f"{jid}_aigen.png"
                try:
                    n = download(url, dest)
                    rec.update(status='downloaded', result_url=url, bytes=n)
                    log(f"downloaded {jid} {n} bytes")
                except Exception as e:
                    rec.update(status='download_failed', result_url=url, err=str(e))
                    log(f"download FAIL {jid}: {e} url={url}")
                results[jid] = rec
                (GEN / f"{jid}_get.json").write_text(json.dumps(info, ensure_ascii=False, indent=1))
                del inflight[jid]
            elif st in ('failed', 'nsfw', 'error', 'cancelled'):
                rec.update(status=st, info=str(info)[:300])
                log(f"job {jid} ended {st}: {str(info)[:200]}")
                results[jid] = rec
                del inflight[jid]
            elif time.time() - t0 > 900:
                rec.update(status='timeout')
                log(f"job {jid} timeout (still {st}); recover with generate get {rec['hf_id']}")
                results[jid] = rec
                del inflight[jid]
    (GEN / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=1))
    rc, out, err = run(['account', 'status'])
    log(f"END spent={spent} balance: {out.strip()[:120]}")


if __name__ == '__main__':
    main()
