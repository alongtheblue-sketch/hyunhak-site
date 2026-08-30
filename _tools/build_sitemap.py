#!/usr/bin/env python3
"""sitemap.xml / robots.txt / llms.txt / llms-full.txt 재생성 (manifest 기준, 멱등).

lastmod = git log -1 --format=%cI -- <file> (미추적/미커밋 신규 파일은 오늘), priority/changefreq = manifest.
robots.txt = Allow / + noindex 경로 Disallow + /_tools/ Disallow + Sitemap 라인.
llms.txt = 서비스 요약, 상품 3군, 가격, 경로 목록, 연락처(admin@hyunhak.com).
llms-full.txt = 색인 페이지마다 제목 | description | URL 한 줄.
사용: python3 _tools/build_sitemap.py
"""
import datetime
import os
import subprocess

import seo_common as C

TYPE_ORDER = {"home": 0, "hub": 1, "product": 2, "faq": 3, "article": 4, "utility": 5, "legal": 6}


def git_lastmod(rel):
    """마지막 커밋일. 단 아직 커밋되지 않은 변경이 있으면 오늘로 본다.

    커밋 전에 빌드하면 lastmod 가 한 커밋 뒤처지는 함정이 있었다.
    '내용 커밋 → 재빌드 → sitemap 커밋' 순서를 사람이 매번 지키게 하는 대신,
    작업 트리에 변경이 있으면 오늘 날짜를 쓰도록 해서 순서에 의존하지 않게 한다.
    """
    try:
        dirty = subprocess.run(["git", "status", "--porcelain", "--", rel], cwd=C.ROOT,
                               capture_output=True, text=True, timeout=10).stdout.strip()
        if dirty:
            return datetime.date.today().isoformat()
        out = subprocess.run(["git", "log", "-1", "--format=%cI", "--", rel], cwd=C.ROOT,
                             capture_output=True, text=True, timeout=10).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        out = ""
    return out[:10] if out else datetime.date.today().isoformat()


def indexable(m):
    out = []
    for rel in C.list_pages():
        e = C.resolve_entry(m, rel)
        if e and not e["noindex"]:
            out.append((rel, e))
    return out


def sort_key(rel):
    return (0 if rel == "index.html" else 1, rel.count("/"), rel)


def write_text(name, text):
    with open(os.path.join(C.ROOT, name), "w", encoding="utf-8") as f:
        f.write(text)


def build_sitemap(m, pages):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for rel, e in sorted(pages, key=lambda x: sort_key(x[0])):
        lines.append("  <url>")
        lines.append(f"    <loc>{C.attr(C.canonical_url(m, rel))}</loc>")
        lines.append(f"    <lastmod>{git_lastmod(rel)}</lastmod>")
        lines.append(f"    <changefreq>{e['changefreq']}</changefreq>")
        lines.append(f"    <priority>{float(e['priority']):.1f}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


# ---------- robots.txt: 크롤러 3범주 분리 (2026-08-30 AI 접근통제 + GEO) ----------
# 공개층(이 사이트의 모든 색인 페이지)은 "인용해도 된다"가 정책이다. 검색 색인봇과 사용자 대행 fetcher 는 허용하고
# 모델 학습 크롤러만 전면 거부한다. 보호층(가이드북 본문, 인강, 스튜디오)은 로그인 뒤라 robots 의 대상이 아니다.
# robots 는 권고이고 강제는 Cloudflare 존 정책(AI bot policies + WAF 룰)이 한다. 목록 갱신 시 seo_check (e2) 가 같이 검사한다.
SEARCH_BOTS = ["Googlebot", "Googlebot-Image", "Bingbot", "Yeti", "Daum", "Applebot",
               "OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "DuckAssistBot", "YouBot"]
AGENT_BOTS = ["ChatGPT-User", "Claude-User", "Perplexity-User", "Meta-ExternalFetcher", "MistralAI-User", "Google-CloudVertexBot"]
TRAIN_BOTS = ["GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Google-Extended", "Applebot-Extended", "Bytespider",
              "meta-externalagent", "Amazonbot", "cohere-ai", "Diffbot", "omgili", "ImagesiftBot", "AI2Bot", "PanguBot", "Timpibot"]
SIGNAL_PUBLIC = "Content-Signal: search=yes, ai-input=yes, ai-train=no"
SIGNAL_TRAIN = "Content-Signal: search=no, ai-input=no, ai-train=no"


def robots_disallows(m):
    out = []
    for rel in C.list_pages():
        e = C.resolve_entry(m, rel)
        if e and e["noindex"] and rel != "404.html":
            if rel == "insta.html": continue   # meta noindex 로 충분 — IG/FB 링크 미리보기 크롤러(robots 준수)의 og 수집 허용
            out.append(f"Disallow: /{rel}")
            # 워커는 확장자 없는 별칭(/reader 등)도 같은 셸로 해석한다 — 별칭도 함께 막는다 (Codex aigate REQ12)
            if rel.endswith(".html"):
                out.append(f"Disallow: /{rel[:-5]}")
    out.append("Disallow: /_tools/")
    return out


def build_robots(m):
    dis = robots_disallows(m)
    lines = ["# 현학적 연구소 robots.txt — _tools/build_sitemap.py 가 생성한다 (직접 편집 금지)",
             "# 공개 페이지 = 검색 색인과 답변엔진 인용 허용(search, ai-input). 모델 학습(ai-train)만 거부.",
             "# 본문(가이드북, 인강, 스튜디오)은 로그인 뒤 보안 리더에 있어 여기 없다.", ""]
    lines += ["# 검색 색인봇 (허용)"] + [f"User-agent: {b}" for b in SEARCH_BOTS] + [SIGNAL_PUBLIC, "Allow: /"] + dis + [""]
    lines += ["# 사용자 대행 fetcher (허용 — 사람이 물어본 페이지를 읽어 답한다)"] + [f"User-agent: {b}" for b in AGENT_BOTS] + [SIGNAL_PUBLIC, "Allow: /"] + dis + [""]
    lines += ["# 모델 학습 크롤러 (전면 거부)"] + [f"User-agent: {b}" for b in TRAIN_BOTS] + [SIGNAL_TRAIN, "Disallow: /", ""]
    lines += ["# 그 외"] + ["User-agent: *", SIGNAL_PUBLIC, "Allow: /"] + dis + [""]
    lines.append(f"Sitemap: {C.base_url(m)}/sitemap.xml")
    return "\n".join(lines) + "\n"


def build_llms(m, pages):
    site, L = m["site"], m["site"]["llms"]
    by_path = {rel: e for rel, e in pages}
    out = [f"# {site['name']} ({C.base_url(m).split('//')[1]})", "",
           f"> {L['summary']}", "",
           "## 상품 3군"]
    for i, p in enumerate(L["products"], 1):
        out.append(f"{i}. [{p['name']}]({C.abs_url(m, p['path'])}): {p['desc']} 가격: {p['price']}")
    if L["free"]:
        out += ["", "## 무료 콘텐츠"]
        for p in L["free"]:
            out.append(f"- [{p['name']}]({C.abs_url(m, p['path'])}): {p['desc']}")
    out += ["", "## 핵심 페이지"]
    core = ["index.html", "studio.html", "guidebook/index.html", "store.html",
            "library.html", "about.html", "faq.html", "notice.html", "terms.html", "privacy.html"]
    for rel in core:
        if rel in by_path:
            out.append(f"- [{by_path[rel]['title']}]({C.canonical_url(m, rel)}): {by_path[rel]['description']}")
    out += ["", "## 제시문 면접 스튜디오 (학교별)"]
    for rel, e in sorted(pages, key=lambda x: x[0]):
        if rel.startswith("programs/"):
            out.append(f"- [{e['title']}]({C.canonical_url(m, rel)}): {e['description']}")
    out += ["", "## 학교별 2027 면접 가이드북"]
    for rel, e in sorted(pages, key=lambda x: x[0]):
        if rel.startswith("guidebook/") and rel != "guidebook/index.html":
            out.append(f"- [{e['title']}]({C.canonical_url(m, rel)})")
    out += ["", "## 검색 키워드", "- " + ", ".join(L["keywords"]), "",
            "## 연락처", f"- {L['contact']}", "",
            f"## 전체 목록", f"- {C.base_url(m)}/llms-full.txt", ""]
    return "\n".join(out)


def build_llms_full(m, pages):
    site = m["site"]
    out = [f"# {site['name']} 전체 색인 페이지", "",
           "형식: 제목 | description | URL", ""]
    for rel, e in sorted(pages, key=lambda x: (TYPE_ORDER.get(x[1]["type"], 9), sort_key(x[0]))):
        out.append(f"{e['title']} | {e['description']} | {C.canonical_url(m, rel)}")
    out.append("")
    return "\n".join(out)


def main():
    m = C.load_manifest()
    pages = indexable(m)
    write_text("sitemap.xml", build_sitemap(m, pages))
    write_text("robots.txt", build_robots(m))
    write_text("llms.txt", build_llms(m, pages))
    write_text("llms-full.txt", build_llms_full(m, pages))
    print(f"sitemap.xml {len(pages)} URL / robots.txt / llms.txt / llms-full.txt 기록")


if __name__ == "__main__":
    main()
