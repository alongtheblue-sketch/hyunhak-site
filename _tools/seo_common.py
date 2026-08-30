#!/usr/bin/env python3
"""SEO 도구 공용 모듈. 표준 라이브러리만 사용.

manifest 로딩, 페이지 열거, 경로 -> canonical URL, head 영역 판별, 본문 추출 헬퍼.
"""
import glob
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(ROOT, "_tools", "seo_manifest.json")

SEO_BEGIN = "<!-- seo:begin -->"
SEO_END = "<!-- seo:end -->"
AEO_BEGIN = "<!-- aeo -->"
AEO_END = "<!-- /aeo -->"

TYPES = ("home", "hub", "product", "article", "faq", "utility", "legal")
EXCLUDE_DIRS = ("_tools", "_design", "tools", "design", "node_modules", ".git")


def list_pages():
    """사이트 내 *.html 상대경로 정렬 목록 (tools/, design/, _ 접두 제외)."""
    out = []
    for path in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        parts = rel.split("/")
        if parts[0] in EXCLUDE_DIRS or any(p.startswith("_") for p in parts):
            continue
        out.append(rel)
    return sorted(out)


def load_manifest(path=MANIFEST_PATH):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_manifest(data, path=MANIFEST_PATH):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def write(rel, s):
    with open(os.path.join(ROOT, rel), "w", encoding="utf-8") as f:
        f.write(s)


def base_url(manifest):
    return manifest["site"]["base_url"].rstrip("/")


def canonical_url(manifest, rel):
    """index.html 은 디렉토리 URL 로. 그 외는 파일명 그대로."""
    base = base_url(manifest)
    if rel == "index.html":
        return base + "/"
    if rel.endswith("/index.html"):
        return base + "/" + rel[: -len("index.html")]
    return base + "/" + rel


def abs_url(manifest, path):
    """manifest 내부 경로('/x.html', 'x.html', 'https://...') -> 절대 URL."""
    if re.match(r"^https?://", path):
        return path
    p = path.lstrip("/")
    if p == "" or p == "index.html":
        return base_url(manifest) + "/"
    if p.endswith("/index.html"):
        p = p[: -len("index.html")]
    return base_url(manifest) + "/" + p


def match_default(manifest, rel):
    """defaults 키('interview/*')와 경로 매칭. 가장 긴 prefix 우선."""
    best = None
    for pat in manifest.get("defaults", {}):
        if pat.endswith("/*"):
            prefix = pat[:-1]
            if rel.startswith(prefix) and "/" not in rel[len(prefix):]:
                if best is None or len(pat) > len(best):
                    best = pat
        elif pat == rel:
            best = pat
    return best


def resolve_entry(manifest, rel):
    """디렉토리 기본값 + 개별 오버라이드 병합. 등재되지 않은 경로면 None."""
    pages = manifest.get("pages", {})
    if rel not in pages:
        return None
    merged = {}
    pat = match_default(manifest, rel)
    if pat:
        for k, v in manifest["defaults"][pat].items():
            if k.startswith("_"):
                continue
            merged[k] = v
    for k, v in pages[rel].items():
        if k == "schema" and isinstance(v, dict) and isinstance(merged.get("schema"), dict):
            merged["schema"] = {**merged["schema"], **v}
        else:
            merged[k] = v
    merged.setdefault("type", "utility")
    merged.setdefault("noindex", False)
    merged.setdefault("priority", 0.5)
    merged.setdefault("changefreq", "monthly")
    merged.setdefault("breadcrumb", [])
    merged.setdefault("schema", {})
    merged["_path"] = rel
    return merged


def is_skipped(manifest, rel):
    return rel in set(manifest["site"].get("skip_inject", []))


# ---------- HTML 헬퍼 ----------

HEAD_END_TAGS = re.compile(r"<(style|body|div|main|header|section|nav|article)\b", re.I)


def head_region(s):
    """(start, end) = head 영역 인덱스. <head>..</head> 가 없으면(프로그램 LP 등)
    파일 선두부터 첫 style/body/div 류 태그 직전까지."""
    m1 = re.search(r"<head[^>]*>", s, re.I)
    m2 = re.search(r"</head>", s, re.I)
    if m1 and m2:
        return m1.end(), m2.start()
    m = HEAD_END_TAGS.search(s)
    return 0, (m.start() if m else len(s))


def strip_tags(s):
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def get_title(s):
    m = re.search(r"<title[^>]*>(.*?)</title>", s, re.S | re.I)
    return strip_tags(m.group(1)) if m else ""


def get_h1(s):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S | re.I)
    if not m:
        return ""
    inner = re.sub(r"<br\s*/?>", " ", m.group(1), flags=re.I)
    return strip_tags(inner)


def get_first_paragraph(s):
    """h1 다음 첫 <p> 텍스트. 없으면 본문 첫 <p>."""
    body = s.split("</head>", 1)[1] if "</head>" in s else s
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", body, flags=re.S | re.I)
    m = re.search(r"</h1>(.*?)<p[^>]*>(.*?)</p>", body, re.S | re.I)
    if m:
        return strip_tags(m.group(2))
    m = re.search(r"<p[^>]*>(.*?)</p>", body, re.S | re.I)
    return strip_tags(m.group(1)) if m else ""


def get_meta_description(s):
    hs, he = head_region(s)
    m = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']\s*/?>', s[hs:he], re.S | re.I)
    return html.unescape(m.group(1)).strip() if m else ""


def get_canonicals(s):
    hs, he = head_region(s)
    return re.findall(r'<link[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', s[hs:he], re.I)


def extract_faq(s):
    """<details class="faq"><summary>Q</summary>A</details> 또는
    data-faq="q" / data-faq="a" 속성 쌍에서 Q/A 추출."""
    body = s.split("</head>", 1)[1] if "</head>" in s else s
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", body, flags=re.S | re.I)
    out = []
    for m in re.finditer(r'<details[^>]*class=["\'][^"\']*\bfaq\b[^"\']*["\'][^>]*>(.*?)</details>', body, re.S | re.I):
        inner = m.group(1)
        sm = re.search(r"<summary[^>]*>(.*?)</summary>(.*)", inner, re.S | re.I)
        if not sm:
            continue
        q, a = strip_tags(sm.group(1)), strip_tags(sm.group(2))
        if q and a:
            out.append({"q": q, "a": a})
    qs = re.findall(r'<([a-z0-9]+)[^>]*data-faq=["\']q["\'][^>]*>(.*?)</\1>', body, re.S | re.I)
    ans = re.findall(r'<([a-z0-9]+)[^>]*data-faq=["\']a["\'][^>]*>(.*?)</\1>', body, re.S | re.I)
    for (_, q), (_, a) in zip(qs, ans):
        q, a = strip_tags(q), strip_tags(a)
        if q and a:
            out.append({"q": q, "a": a})
    return out


def attr(s):
    return html.escape(s, quote=True)


def clean_text(s):
    """description 용 정리: 마크다운 별표 제거, 가운뎃점/em대시 치환, 공백 정규화."""
    s = s.replace("**", "")
    s = s.replace(" — ", ", ").replace("—", ", ").replace("·", ", ")
    s = re.sub(r"\s*,\s*,", ",", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

# ---------- 원격 D1 products snapshot (READER-FOLLOWUP 3 / Codex 후속 r2 R11) ----------
# export_products_status.sh 가 만드는 실측 원장. 소비처(seo_inject, build_guidebook)가 공용으로 쓴다.
# 부재 = {} (required=True 면 정지) / 손상·낡음(14일)·미래 시각 = 빌드 정지 — 낡은 가격·판매상태로
# 조용히 굽는 회귀를 소비처 공통으로 차단한다. 나이 비교는 timedelta 전체(초 단위) — days 내림이
# 15일째를 통과시키거나 미래 timestamp 가 무기한 통과하는 구멍을 막는다 (r2 N1).
SNAPSHOT_MAX_AGE_DAYS = 14
PRODUCTS_STATUS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "products_status.json")


def load_products_status(required=False):
    import datetime
    import sys as _sys
    try:
        with open(PRODUCTS_STATUS_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except OSError:
        if required:
            _sys.exit("products_status.json 부재 — bash _tools/export_products_status.sh 로 실측 후 빌드")
        return {}
    try:
        gen = datetime.datetime.fromisoformat(data["generated_at"])
        products = {r["sku"]: r for r in data["products"]}
    except (ValueError, KeyError, TypeError) as e:
        _sys.exit(f"products_status.json 손상({e}) — bash _tools/export_products_status.sh 로 재실측 후 빌드")
    age = datetime.datetime.now(datetime.timezone.utc) - gen
    if age > datetime.timedelta(days=SNAPSHOT_MAX_AGE_DAYS):
        _sys.exit(f"products_status.json {age.days}일 경과 — bash _tools/export_products_status.sh 로 재실측 후 빌드")
    if age < datetime.timedelta(minutes=-5):
        _sys.exit("products_status.json generated_at 이 미래 시각 — 재실측 후 빌드")
    return products

