#!/usr/bin/env python3
"""없는 면(404) 유입 보고 (2026-09-09). 두 원천을 같은 표로 낸다.
  ① D1 not_found 원장 (워커가 hyunhak.com 404 마다 기록: 경로·리퍼러 호스트·UA 분류) — 기본
  ② Cloudflare 존 분석 GraphQL (--cf): 표본 추정치, 하루 단위·최근 8일까지만 허용되는 플랜이라 날짜별로 나눠 합산. 리퍼러는 못 준다.
사용: python3 _tools/not_found_report.py [--days 7] [--cf] [--all] [--json]
  --all = 스캐너 경로(wp-, .env, .git 등)도 표시. 기본은 사람·답변엔진이 실제로 부를 만한 HTML 경로만.
D1 접근 = npx wrangler d1 execute hyunhak --remote (wrangler.toml 의 DB 바인딩). CF 토큰 = wrangler OAuth(zone:read, 분석은 존 소유 계정이면 열린다).
"""
import datetime, json, os, re, subprocess, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZONE = "hyunhak.com"
SCANNER = re.compile(r"wp-|wordpress|xmlrpc|\.env|\.git|phpinfo|\.php$|/\.|aws|credentials|config\.json|actuator|_api|\[|\*$|/cms/|/shop/|/news/|/sito/|/site/|/web/|/test/|/blog/|/feed|/vendor|/admin|nexmo|stripe|laravel|mandrill|s3/|backend|server/|core/|tmp/|_profiler|console|terraform|amplify|gitlab|oci|traffic-advice", re.I)
HTMLISH = re.compile(r"(/|\.html)$|^/[^.]*$")

def arg(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        return sys.argv[i + 1] if i + 1 < len(sys.argv) else default
    return default

def d1(sql):
    r = subprocess.run(["npx", "wrangler", "d1", "execute", "hyunhak", "--remote", "--json", "--command", sql], cwd=ROOT, capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        sys.exit("d1 실패: " + (r.stderr or r.stdout)[-400:])
    txt = r.stdout[r.stdout.index("["):]
    return json.loads(txt)[0]["results"]

def from_d1(days):
    since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = d1(f"SELECT path, ua_class, COUNT(*) n FROM not_found WHERE ts >= '{since}' GROUP BY path, ua_class ORDER BY n DESC LIMIT 2000")
    refs = d1(f"SELECT path, ref_host, COUNT(*) n FROM not_found WHERE ts >= '{since}' AND ref_host != '' GROUP BY path, ref_host ORDER BY n DESC LIMIT 2000")
    out = {}
    for r in rows:
        o = out.setdefault(r["path"], {"total": 0, "cls": {}, "ref": {}})
        o["total"] += r["n"]; o["cls"][r["ua_class"]] = r["n"]
    for r in refs:
        if r["path"] in out:
            out[r["path"]]["ref"][r["ref_host"]] = r["n"]
    return out

def from_cf(days):
    cfg = os.path.expanduser("~/Library/Preferences/.wrangler/config/default.toml")
    if not os.path.exists(cfg):
        cfg = os.path.expanduser("~/.wrangler/config/default.toml")
    tok = re.search(r'oauth_token\s*=\s*"([^"]+)"', open(cfg, encoding="utf-8").read()).group(1)
    H = {"Authorization": "Bearer " + tok, "Content-Type": "application/json"}
    def api(url, data=None):
        req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None, headers=H, method="POST" if data else "GET")
        return json.load(urllib.request.urlopen(req, timeout=40))
    z = api(f"https://api.cloudflare.com/client/v4/zones?name={ZONE}")["result"][0]["id"]
    Q = """query($z:String!,$s:Time!,$e:Time!){ viewer { zones(filter:{zoneTag:$z}) {
      httpRequestsAdaptiveGroups(limit:300, filter:{datetime_geq:$s, datetime_lt:$e, edgeResponseStatus:404, requestSource:"eyeball", clientRequestHTTPHost:"%s"}, orderBy:[count_DESC]) {
        count dimensions { clientRequestPath userAgent } } } } }""" % ZONE
    UA = [(re.compile(r"ChatGPT-User|Claude-User|Perplexity-User|Meta-ExternalFetcher|MistralAI-User", re.I), "ai_user"),
          (re.compile(r"OAI-SearchBot|Claude-SearchBot|PerplexityBot|DuckAssistBot|YouBot|GPTBot|ClaudeBot|CCBot|Bytespider|Amazonbot", re.I), "ai_bot"),
          (re.compile(r"Googlebot|Bingbot|Yeti|Daum|Applebot|Yandex", re.I), "search_bot"),
          (re.compile(r"bot|crawl|spider|scan|curl|wget|python|go-http|httpx|headless|smoke|audit|Prefetch Proxy|leakix", re.I), "other_bot")]
    def cls(ua):
        if not ua: return "none"
        for rx, c in UA:
            if rx.search(ua): return c
        return "browser"
    today = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    out = {}
    for i in range(min(days, 8), -1, -1):
        s = today - datetime.timedelta(days=i); e = s + datetime.timedelta(days=1)
        r = api("https://api.cloudflare.com/client/v4/graphql", {"query": Q, "variables": {"z": z, "s": s.strftime("%Y-%m-%dT%H:%M:%SZ"), "e": e.strftime("%Y-%m-%dT%H:%M:%SZ")}})
        if r.get("errors"):
            print("cf", s.date(), r["errors"][0]["message"][:100], file=sys.stderr); continue
        for x in r["data"]["viewer"]["zones"][0]["httpRequestsAdaptiveGroups"]:
            p = x["dimensions"]["clientRequestPath"]; c = cls(x["dimensions"]["userAgent"])
            o = out.setdefault(p, {"total": 0, "cls": {}, "ref": {}})
            o["total"] += x["count"]; o["cls"][c] = o["cls"].get(c, 0) + x["count"]
        time.sleep(0.3)
    return out

def show(title, data, all_paths):
    print(f"\n=== {title} ===")
    print(f"{'total':>6} {'browser':>7} {'ai_user':>7} {'ai_bot':>6} {'search':>6} {'other':>5}  path   (리퍼러 호스트 top)")
    n = 0
    for p, o in sorted(data.items(), key=lambda kv: -kv[1]["total"]):
        if not all_paths and (SCANNER.search(p) or not HTMLISH.search(p)):
            continue
        c = o["cls"]
        ref = ", ".join(f"{h} {k}" for h, k in sorted(o["ref"].items(), key=lambda kv: -kv[1])[:3])
        print(f"{o['total']:6d} {c.get('browser', 0):7d} {c.get('ai_user', 0):7d} {c.get('ai_bot', 0):6d} {c.get('search_bot', 0):6d} {c.get('other_bot', 0) + c.get('none', 0):5d}  {p[:60]:60s} {ref}")
        n += 1
        if n >= 40: break
    if n == 0:
        print("(표시할 경로 없음)")

def main():
    days = int(arg("--days", 7)); all_paths = "--all" in sys.argv
    res = {}
    try:
        res["d1"] = from_d1(days)
    except SystemExit as e:
        print("D1:", e, file=sys.stderr)
    if "--cf" in sys.argv:
        res["cf"] = from_cf(days)
    if "--json" in sys.argv:
        print(json.dumps(res, ensure_ascii=False, indent=1)); return
    if "d1" in res:
        show(f"D1 not_found 원장 최근 {days}일 (전수, 예산 60/분/isolate)", res["d1"], all_paths)
    if "cf" in res:
        show(f"Cloudflare 존 분석 최근 {min(days, 8)}일 ({ZONE} eyeball 404, 표본 추정)", res["cf"], all_paths)

if __name__ == "__main__":
    main()
