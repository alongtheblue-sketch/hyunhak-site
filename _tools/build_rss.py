#!/usr/bin/env python3
"""rss.xml 재생성 (manifest 기준, 멱등). 네이버 서치어드바이저 RSS 제출용.

항목 = sitemap 과 같은 색인 페이지 전부. 제목과 description 은 manifest 의 SEO 값, pubDate 는 sitemap 과 같은 산식
(git 마지막 커밋일, 미커밋 변경은 오늘)을 RFC 822 로 적는다. 최신 갱신이 위로 오도록 pubDate 내림차순, 같은 날은 sitemap 정렬.
채널 description 은 llms 요약. RSS 2.0, 항목 상한 없음(색인 페이지 53면).
사용: python3 _tools/build_rss.py   (build_all 5단계에서 build_sitemap 다음에 돈다)
"""
import datetime
import email.utils
import os

import seo_common as C
from build_sitemap import git_lastmod, indexable, sort_key


def rfc822(day):
    """YYYY-MM-DD → RFC 822 (KST 09:00 고정: 날짜 단위 원천이라 시각은 임의, 시간대는 사이트 운영 지역)."""
    d = datetime.datetime.strptime(day, "%Y-%m-%d").replace(hour=9, tzinfo=datetime.timezone(datetime.timedelta(hours=9)))
    return email.utils.format_datetime(d)


def build_rss(m, pages):
    site = m["site"]
    base = C.base_url(m)
    rows = []
    for rel, e in pages:
        rows.append((git_lastmod(rel), rel, e))
    rows.sort(key=lambda r: (r[0], ), reverse=True)
    rows.sort(key=lambda r: r[0], reverse=True)
    # 같은 날짜 안에서는 sitemap 정렬(홈 → 얕은 경로 → 이름)
    grouped = {}
    for day, rel, e in rows:
        grouped.setdefault(day, []).append((rel, e))
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
           "  <channel>",
           f"    <title>{C.attr(site['name'])}</title>",
           f"    <link>{C.attr(base + '/')}</link>",
           f"    <description>{C.attr(site['llms']['summary'])}</description>",
           "    <language>ko</language>",
           f"    <atom:link href=\"{C.attr(base + '/rss.xml')}\" rel=\"self\" type=\"application/rss+xml\"/>"]
    newest = rows[0][0] if rows else datetime.date.today().isoformat()
    out.append(f"    <lastBuildDate>{rfc822(newest)}</lastBuildDate>")
    for day in sorted(grouped, reverse=True):
        for rel, e in sorted(grouped[day], key=lambda x: sort_key(x[0])):
            url = C.canonical_url(m, rel)
            out += ["    <item>",
                    f"      <title>{C.attr(e['title'])}</title>",
                    f"      <link>{C.attr(url)}</link>",
                    f"      <guid isPermaLink=\"true\">{C.attr(url)}</guid>",
                    f"      <description>{C.attr(e['description'])}</description>",
                    f"      <pubDate>{rfc822(day)}</pubDate>",
                    "    </item>"]
    out += ["  </channel>", "</rss>"]
    return "\n".join(out) + "\n"


def main():
    m = C.load_manifest()
    pages = indexable(m)
    with open(os.path.join(C.ROOT, "rss.xml"), "w", encoding="utf-8") as f:
        f.write(build_rss(m, pages))
    print(f"rss.xml {len(pages)} 항목 기록")


if __name__ == "__main__":
    main()
