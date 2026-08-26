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


def build_robots(m):
    lines = ["User-agent: *", "Allow: /"]
    for rel in C.list_pages():
        e = C.resolve_entry(m, rel)
        if e and e["noindex"] and rel != "404.html":
            if rel == "insta.html": continue   # meta noindex 로 충분 — IG/FB 링크 미리보기 크롤러(robots 준수)의 og 수집 허용
            lines.append(f"Disallow: /{rel}")
    lines.append("Disallow: /_tools/")
    lines.append("")
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
