#!/usr/bin/env python3
"""SEO 검증기. 종료코드 0(전부 PASS) / 1(FAIL 1건 이상). 표 형식 출력.

(a) 전 html JSON-LD 파싱 + 필수 필드   (b) canonical == 자기 경로
(c) 내부 링크 dead 0 (# 앵커는 대상 파일 id 확인)   (d) sitemap loc 집합 == noindex 아닌 html 집합
(e) title 유일 + description 길이 70~110(색인 페이지) + 가운뎃점/em대시 금지   (f) 이미지 alt 누락 수(WARN)
추가: manifest 등재, seo 블록 존재, head 내 ld+json 1개, aeo 답 길이 40~110.
사용: python3 _tools/seo_check.py [--verbose]
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from urllib.parse import quote, unquote, urlsplit

import seo_common as C

DESC_MIN, DESC_MAX = 70, 110
AEO_MIN, AEO_MAX = 40, 110
BANNED = ("·", "—")


def robots_path_matches(rule, url):
    """Google 경로 매칭: 접두 일치, * 임의 문자열, 끝의 $ 종료.

    생성기에서 기대 경로를 가져오지 않는다. 실제 sitemap URL에 적용한다.
    쿼리는 매칭 대상이고 fragment는 크롤링 요청에 포함되지 않는다.
    """
    if not rule:
        return False
    parsed = urlsplit(url)
    path = (parsed.path or "/") + ("?" + parsed.query if "?" in url.split("#", 1)[0] else "")
    terminal = rule.endswith("$")
    pattern = rule[:-1] if terminal else rule
    # 비ASCII는 UTF-8 percent 인코딩, 비예약 ASCII만 디코딩한다.
    # %2F 같은 예약 문자는 경로 구분자 /와 서로 다르게 매칭해야 한다.
    def normalize(value):
        value = quote(value, safe="/%!*'();:@&=+$,?[]~-._")
        def percent(m):
            char = chr(int(m[1], 16))
            return char if char.isascii() and (char.isalnum() or char in "-._~") else m[0].upper()
        return re.sub(r"%([0-9a-fA-F]{2})", percent, value)
    path = normalize(path)
    pattern = re.escape(normalize(pattern)).replace(r"\*", ".*")
    return re.match("^" + pattern + (r"\Z" if terminal else ""), path) is not None


def robots_disallows_url(rules, url):
    """비공개 경로 보호 검사: 긴 일치 규칙 우선, 같은 길이면 Allow 우선."""
    matched = [(len(v.rstrip("$").replace("*", "").encode("utf-8")), k == "allow")
               for k, v in rules if k in ("allow", "disallow") and robots_path_matches(v, url)]
    return bool(matched) and not max(matched)[1]


class Report:
    def __init__(self):
        self.rows = []   # (검사, 결과, 건수, 비고)
        self.details = []

    def add(self, name, fails, warns=None, total=None, note=""):
        warns = warns or []
        status = "FAIL" if fails else ("WARN" if warns else "PASS")
        cnt = f"{len(fails)} fail" + (f", {len(warns)} warn" if warns else "")
        if total is not None:
            cnt += f" / {total}"
        self.rows.append((name, status, cnt, note))
        for f in fails:
            self.details.append(("FAIL", name, f))
        for w in warns:
            self.details.append(("WARN", name, w))

    def failed(self):
        return any(r[1] == "FAIL" for r in self.rows)


def head_ld_scripts(s):
    hs, he = C.head_region(s)
    return re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', s[hs:he], re.S | re.I)


def find_nodes(ld):
    if isinstance(ld, dict):
        if "@graph" in ld:
            return list(ld["@graph"])
        return [ld]
    if isinstance(ld, list):
        return ld
    return []


def check_ld(rel, e, s, fails):
    scripts = head_ld_scripts(s)
    if not scripts:
        return None
    nodes = []
    for raw in scripts:
        try:
            ld = json.loads(raw.replace("<\\/", "</"))
        except json.JSONDecodeError as ex:
            fails.append(f"{rel}: JSON-LD 파싱 실패 ({ex.msg} @ {ex.pos})")
            continue
        nodes += find_nodes(ld)
    by_type = {}
    for n in nodes:
        t = n.get("@type")
        by_type.setdefault(t if isinstance(t, str) else str(t), []).append(n)

    def need(t, field, getter=None):
        for n in by_type.get(t, []):
            v = getter(n) if getter else n.get(field)
            if v in (None, "", [], {}):
                fails.append(f"{rel}: {t}.{field} 누락")

    if "Organization" in by_type:
        need("Organization", "name"); need("Organization", "url")
    if "WebPage" in by_type:
        need("WebPage", "name"); need("WebPage", "url")
    if "WebSite" in by_type:
        need("WebSite", "name")
    for n in by_type.get("BreadcrumbList", []):
        items = n.get("itemListElement") or []
        if not items or any(not i.get("name") or not i.get("item") for i in items):
            fails.append(f"{rel}: BreadcrumbList 항목 name/item 누락")
    for n in by_type.get("Product", []):
        if not n.get("name"):
            fails.append(f"{rel}: Product.name 누락")
        offers = n.get("offers")
        offers = offers if isinstance(offers, list) else ([offers] if offers else [])
        if not offers:
            fails.append(f"{rel}: Product.offers 누락")
        for o in offers:
            for f in ("price", "priceCurrency", "availability"):
                if o.get(f) in (None, ""):
                    fails.append(f"{rel}: Product.offers.{f} 누락")
    for n in by_type.get("Article", []):
        if not n.get("headline"):
            fails.append(f"{rel}: Article.headline 누락")
        if not (n.get("about") or {}).get("name"):
            fails.append(f"{rel}: Article.about.name 누락")
    for n in by_type.get("FAQPage", []):
        qs = n.get("mainEntity") or []
        if not qs or any(not q.get("name") or not (q.get("acceptedAnswer") or {}).get("text") for q in qs):
            fails.append(f"{rel}: FAQPage Q/A 누락")
    for n in by_type.get("ItemList", []):
        if not n.get("itemListElement"):
            fails.append(f"{rel}: ItemList 비어 있음")
    return len(scripts), by_type


def resolve_link(rel, href):
    u = urlsplit(href)
    path = unquote(u.path)
    if path == "":
        tgt = rel
    elif path.startswith("/"):
        tgt = path.lstrip("/")
        if tgt == "" or tgt.endswith("/"):
            tgt += "index.html"
    else:
        tgt = os.path.normpath(os.path.join(os.path.dirname(rel), path)).replace(os.sep, "/")
        if path.endswith("/"):
            tgt = tgt + "/index.html"
    full = os.path.join(C.ROOT, tgt)
    if os.path.isdir(full) and os.path.exists(os.path.join(full, "index.html")):
        tgt = tgt.rstrip("/") + "/index.html"
    return tgt, u.fragment


def main():
    verbose = "--verbose" in sys.argv
    m = C.load_manifest()
    pages = C.list_pages()
    R = Report()
    planned = set(m["site"].get("planned_paths", []))
    skip = set(m["site"].get("skip_inject", []))

    texts = {rel: C.read(rel) for rel in pages}
    ids = {}
    for rel, s in texts.items():
        ids[rel] = set(re.findall(r'\sid=["\']([^"\']+)["\']', s))

    # manifest 등재
    fails = [f"{rel}: manifest 미등재" for rel in pages if rel not in m["pages"]]
    ghosts = [p for p in m["pages"] if p not in texts]
    R.add("manifest 등재", fails, [f"{p}: manifest 등재, 파일 없음(planned)" for p in ghosts], len(pages))

    entries = {rel: C.resolve_entry(m, rel) for rel in pages}

    # seo 블록 / ld+json 개수
    fails, warns = [], []
    for rel, s in texts.items():
        if rel in skip:
            continue
        hs, he = C.head_region(s)
        if C.SEO_BEGIN not in s[hs:he] or C.SEO_END not in s[hs:he]:
            fails.append(f"{rel}: seo 마커 블록 없음 (seo_inject.py 미실행)")
        n = len(head_ld_scripts(s))
        if n != 1:
            fails.append(f"{rel}: head 내 ld+json {n}개 (1개여야 함)")
    R.add("seo 블록/ld+json 1개", fails, warns, len(pages) - len(skip & set(pages)))

    # (a) JSON-LD
    fails, warns = [], []
    for rel, s in texts.items():
        e = entries[rel]
        r = check_ld(rel, e, s, fails)
        if r is None and rel not in skip:
            fails.append(f"{rel}: JSON-LD 없음")
        elif r is None:
            warns.append(f"{rel}: JSON-LD 없음 (skip 페이지)")
    R.add("(a) JSON-LD 파싱/필수필드", fails, warns, len(pages))

    # (b) canonical
    fails, warns = [], []
    for rel, s in texts.items():
        cans = C.get_canonicals(s)
        want = C.canonical_url(m, rel)
        if not cans:
            (warns if rel in skip else fails).append(f"{rel}: canonical 없음")
        elif len(cans) > 1:
            fails.append(f"{rel}: canonical {len(cans)}개")
        elif cans[0] != want:
            (warns if rel in skip else fails).append(f"{rel}: canonical {cans[0]} != {want}")
    R.add("(b) canonical 일치", fails, warns, len(pages))

    # (c) 내부 링크
    fails, warns = [], []
    n_links = 0
    for rel, s in texts.items():
        body = re.sub(r"<script.*?</script>", "", s, flags=re.S | re.I)
        seen = set()
        for h in re.findall(r'\b(?:href|src)=["\']([^"\']+)["\']', body):
            if re.match(r"^(https?:|mailto:|tel:|javascript:|data:|blob:|//)", h) or h in seen:
                continue
            seen.add(h)
            n_links += 1
            tgt, frag = resolve_link(rel, h)
            full = os.path.join(C.ROOT, tgt)
            if not os.path.isfile(full):
                (warns if tgt in planned else fails).append(f"{rel}: {h} -> {tgt} 없음" + (" (planned)" if tgt in planned else ""))
                continue
            if frag and tgt.endswith(".html") and frag not in ids.get(tgt, set()):
                fails.append(f"{rel}: {h} 앵커 #{frag} 없음")
    R.add("(c) 내부 링크 dead", fails, warns, n_links)

    # (d) sitemap
    fails, warns = [], []
    want = {C.canonical_url(m, rel) for rel, e in entries.items() if e and not e["noindex"]}
    sm_path = os.path.join(C.ROOT, "sitemap.xml")
    if not os.path.exists(sm_path):
        fails.append("sitemap.xml 없음")
    else:
        got = set(re.findall(r"<loc>\s*(.*?)\s*</loc>", open(sm_path, encoding="utf-8").read()))
        for u in sorted(want - got):
            fails.append(f"sitemap 누락: {u}")
        for u in sorted(got - want):
            fails.append(f"sitemap 잉여: {u}")
    R.add("(d) sitemap == 색인 페이지", fails, warns, len(want))

    # (e2) 봇 정책은 유지하고, 차단 경로는 실제 sitemap URL로 독립 검증한다.
    fails, warns = [], []
    import build_sitemap as BS
    rb_path = os.path.join(C.ROOT, "robots.txt")
    if not os.path.exists(rb_path):
        fails.append("robots.txt 없음")
    else:
        groups, cur = [], None
        for ln in open(rb_path, encoding="utf-8").read().splitlines():
            ln = ln.split("#", 1)[0].strip()
            if not ln:
                continue
            k, _, v = ln.partition(":"); k, v = k.strip().lower(), v.strip()
            if k == "user-agent":
                if cur is None or any(k in ("allow", "disallow") for k, _ in cur["rules"]):
                    cur = {"agents": [], "rules": []}; groups.append(cur)
                cur["agents"].append(v)
            elif cur is not None and k != "sitemap":
                cur["rules"].append((k, v))
        by_agent = {}
        for g in groups:
            for a in g["agents"]:
                by_agent.setdefault(a.lower(), []).extend(g["rules"])
        for b in BS.TRAIN_BOTS:
            r = by_agent.get(b.lower())
            if r is None: fails.append(f"학습봇 미등재: {b}")
            elif ("disallow", "/") not in r or ("allow", "/") in r: fails.append(f"학습봇 {b}: Disallow: / 아님")
            elif not any(k == "content-signal" and "ai-train=no" in v for k, v in r): fails.append(f"학습봇 {b}: Content-Signal ai-train=no 없음")
        for b in BS.SEARCH_BOTS + BS.AGENT_BOTS + ["*"]:
            r = by_agent.get(b.lower())
            if r is None: fails.append(f"허용봇 미등재: {b}"); continue
            if ("allow", "/") not in r or ("disallow", "/") in r: fails.append(f"허용봇 {b}: Allow: / 아님")
            if not any(k == "content-signal" and "ai-input=yes" in v and "ai-train=no" in v for k, v in r):
                fails.append(f"허용봇 {b}: Content-Signal search/ai-input=yes, ai-train=no 없음")
            # 생성기의 규칙 문자열 대신 비공개 페이지와 별칭 자체의 차단을 확인한다.
            private = ["/_tools/seo_manifest.json"]
            for rel, entry in entries.items():
                if entry and entry["noindex"] and rel not in ("404.html", "insta.html"):
                    private.append("/" + rel)
                    if rel.endswith(".html"):
                        private.append("/" + rel[:-5])
            for path in private:
                if not robots_disallows_url(r, path):
                    fails.append(f"허용봇 {b}: 비공개 경로 차단 누락 {path}")
        if f"Sitemap: {C.base_url(m)}/sitemap.xml" not in open(rb_path, encoding="utf-8").read():
            fails.append("Sitemap 라인 없음")
    R.add("(e2) robots 3범주", fails, warns, len(BS.TRAIN_BOTS) + len(BS.SEARCH_BOTS) + len(BS.AGENT_BOTS) + 1)

    # 학습봇의 전면 거부는 의도된 정책이다. 공개 접근 그룹의 어떤 Disallow도
    # sitemap의 색인 URL과 겹치지 않아야 한다 (Allow 예외로 충돌을 숨기지 않는다).
    fails, urls = [], []
    if not os.path.exists(sm_path) or not os.path.exists(rb_path):
        fails.append("sitemap.xml 또는 robots.txt 없음: URL 접근성 검사 불가")
    else:
        try:
            root = ET.parse(sm_path).getroot()
            urls = sorted({(n.text or "").strip() for n in root.findall("{*}url/{*}loc")})
            if not urls or "" in urls:
                fails.append("sitemap URL 목록이 비었거나 loc 값이 비어 있음")
        except ET.ParseError as ex:
            fails.append(f"sitemap.xml 파싱 실패: {ex}")
        public_agents = {b.lower() for b in BS.SEARCH_BOTS + BS.AGENT_BOTS + ["*"]}
        for group in groups:
            agents = [a for a in group["agents"] if a.lower() in public_agents]
            if not agents:
                continue
            disallows = {v for k, v in group["rules"] if k == "disallow" and v}
            for url in urls:
                hits = sorted(v for v in disallows if robots_path_matches(v, url))
                if hits:
                    fails.append(f"{url}: Disallow {', '.join(hits)} (봇: {', '.join(agents)})")
    R.add("(e3) sitemap URL robots 접근성", fails, total=len(urls))

    # (e) title 유일, description
    fails, warns = [], []
    titles = {}
    for rel, s in texts.items():
        t = C.get_title(s)
        if not t:
            fails.append(f"{rel}: <title> 없음")
        titles.setdefault(t, []).append(rel)
        e = entries[rel]
        if e and e["title"] != t:
            warns.append(f"{rel}: <title> '{t}' != manifest '{e['title']}'")
    for t, rels in titles.items():
        if t and len(rels) > 1:
            fails.append(f"title 중복 '{t}': {', '.join(rels)}")
    for rel, e in entries.items():
        if not e:
            continue
        d = e.get("description", "")
        if any(b in d for b in BANNED):
            fails.append(f"{rel}: description 에 가운뎃점/em대시")
        if e["noindex"]:
            if not d:
                warns.append(f"{rel}: description 비어 있음 (noindex)")
            continue
        if not (DESC_MIN <= len(d) <= DESC_MAX):
            fails.append(f"{rel}: description {len(d)}자 (범위 {DESC_MIN}~{DESC_MAX})")
        a = (e.get("answer") or "").strip()
        if a and not (AEO_MIN <= len(a) <= AEO_MAX):
            fails.append(f"{rel}: answer {len(a)}자 (범위 {AEO_MIN}~{AEO_MAX})")
    R.add("(e) title 유일/description 길이", fails, warns, len(pages))

    # (f) img alt
    warns = []
    total_missing = 0
    for rel, s in texts.items():
        imgs = re.findall(r"<img\b[^>]*>", s, re.I)
        # alt 속성 자체가 없어야 누락. alt="" 는 장식 이미지 유효 표기 (WCAG) — 누락 아님
        missing = [i for i in imgs if not re.search(r'\balt=["\'][^"\']*["\']', i)]
        if missing:
            total_missing += len(missing)
            warns.append(f"{rel}: alt 누락 {len(missing)}/{len(imgs)}")
    R.add("(f) 이미지 alt 누락", [], warns, None, note=f"누락 {total_missing}건")

    # 출력
    w = max(len(r[0]) for r in R.rows)
    print(f"{'검사':<{w}}  {'결과':<5} {'건수':<18} 비고")
    print("-" * (w + 40))
    for name, status, cnt, note in R.rows:
        print(f"{name:<{w}}  {status:<5} {cnt:<18} {note}")
    fails = [d for d in R.details if d[0] == "FAIL"]
    warns = [d for d in R.details if d[0] == "WARN"]
    print("-" * (w + 40))
    print(f"FAIL {len(fails)}건 / WARN {len(warns)}건 / 검사 {len(R.rows)}항목")
    for lvl, name, msg in (R.details if verbose else fails + warns[:40]):
        print(f"  [{lvl}] {name}: {msg}")
    if not verbose and len(warns) > 40:
        print(f"  ... WARN {len(warns) - 40}건 더 (--verbose)")
    sys.exit(1 if R.failed() else 0)


if __name__ == "__main__":
    main()
