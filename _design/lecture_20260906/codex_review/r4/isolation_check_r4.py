#!/usr/bin/env python3
"""Codex 판정 레그 격리 검출기. r2/run_events.jsonl 의 exec command 문자열에서 worktree 밖 절대경로 접근을 잡는다.
출력 문자열(output)은 보지 않는다(원장 본문이 원천 경로를 담아 거짓 양성). 결과는 이벤트 로그 밖 파일에 쓴다."""
import io, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
WT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
EV = os.path.join(HERE, 'run_events.jsonl')
ALLOWED = (WT + '/', WT)
TOOL_OK = ('/usr/', '/bin/', '/opt/homebrew/', '/Library/', '/System/', '/dev/', '/tmp/', '/private/tmp/')

def cmds(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == 'command' and isinstance(v, str):
                yield v
            elif k == 'command' and isinstance(v, list):
                yield ' '.join(str(x) for x in v)
            else:
                yield from cmds(v)
    elif isinstance(obj, list):
        for x in obj:
            yield from cmds(x)

outside, n_exec, n = [], 0, 0
if os.path.exists(EV):
    for line in io.open(EV, encoding='utf-8'):
        n += 1
        try:
            e = json.loads(line)
        except Exception:
            continue
        for c in cmds(e):
            n_exec += 1
            for p in re.findall(r'(/Users/gregory/[^\s"\'\\`;|),]+|~/[^\s"\'\\`;|),]+)', c):
                p = os.path.expanduser(p)
                if not p.startswith(ALLOWED) and not p.startswith(TOOL_OK):
                    outside.append(p)
# 분류: 가설 원천(handover, INDEX, pending, memory, .claude/projects) 은 경로만으로 FAIL.
# 그 밖(스킬 지시문 등)은 문면 grep 으로 이 판의 토큰이 0 이어야 soft 통과. 검출기 자기 완화 금지: hard 목록은 좁히지 않는다.
HARD = ('/.claude/handover', '/.claude/pending', '/.claude/projects', '/handover/INDEX', 'MEMORY.md', '/.codex/AGENTS.md', '/.codex_leg')
TOK = re.compile(r'hyunhak|현학|인강|lecture_|201d261|34/45|critic|stage2|lectures\.html', re.I)
hard, soft = [], []
for p in sorted(set(outside)):
    if any(h in p for h in HARD):
        hard.append({'path': p, 'reason': 'hypothesis_source'})
        continue
    hits = -1
    try:
        hits = len(TOK.findall(io.open(p, encoding='utf-8', errors='replace').read())) if os.path.isfile(p) else -1
    except Exception:
        hits = -1
    (hard if hits != 0 else soft).append({'path': p, 'token_hits': hits})
res = {'worktree': WT, 'events': n, 'exec': n_exec, 'outside_hard': hard, 'outside_soft': soft,
       'pass': n_exec > 0 and not hard}
json.dump(res, open(os.path.join(HERE, 'isolation_check.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False))
sys.exit(0 if res['pass'] else 1)
