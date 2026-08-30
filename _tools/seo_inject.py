#!/usr/bin/env python3
"""각 html <head> 에 <!-- seo:begin --> ... <!-- seo:end --> 블록 1개를 삽입/교체 (멱등).

블록 = canonical, description, robots(noindex), og:*, twitter:*, JSON-LD @graph 1개.
head 에 남아 있는 기존 canonical/og/description/twitter/robots/ld+json 은 블록으로 흡수(원본 제거).
manifest.answer 가 있으면 main 내 .pagehead 끝(없으면 <main> 첫 자식)에 <!-- aeo --><p class="aeo-answer">…</p><!-- /aeo --> 삽입.
manifest.title 이 <title> 과 다르면 <title> 텍스트를 manifest 로 맞춘다.

사용: python3 _tools/seo_inject.py [--dry-run] [--only path.html,...]
"""
import json
import os
import re
import sys

import seo_common as C

# READER-FOLLOWUP 3 (2026-08-30): JSON-LD availability DB 연동.
# products_status.json = 원격 D1 products 실측 내보내기 (export_products_status.sh 가 생성).
# 있으면 offer 의 availability 와 price 를 DB 값으로 덮고, 소장판(-pdf) offer 가 manifest 에 빠졌으면 채운다.
# 없으면 manifest 값 그대로 (오프라인 빌드 무해). 수기 카드가 재빌드에 소실되던 함정과 같은 계열이라
# 소장판 offer 는 manifest 가 아니라 DB 를 원장으로 삼는다.
PRODUCTS_STATUS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "products_status.json")


# 로더는 seo_common 공용 (Codex 후속 r1 #24 낡음 게이트, r2 R11 소비처 공통화, r2 N1 미래·내림 구멍)
PRODUCTS = C.load_products_status()


def db_avail(p):
    return "InStock" if p.get("status") == "active" else "OutOfStock"

DUP_PATTERNS = [
    re.compile(r'[ \t]*<link[^>]*rel=["\']canonical["\'][^>]*>[ \t]*\r?\n?', re.I),
    re.compile(r'[ \t]*<meta[^>]*(?:property|name)=["\']og:[^"\']*["\'][^>]*>[ \t]*\r?\n?', re.I),
    re.compile(r'[ \t]*<meta[^>]*name=["\']description["\'][^>]*>[ \t]*\r?\n?', re.I),
    re.compile(r'[ \t]*<meta[^>]*name=["\']twitter:[^"\']*["\'][^>]*>[ \t]*\r?\n?', re.I),
    re.compile(r'[ \t]*<meta[^>]*name=["\']robots["\'][^>]*>[ \t]*\r?\n?', re.I),
    re.compile(r'[ \t]*<script[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>[ \t]*\r?\n?', re.I | re.S),
]
BLOCK_RE = re.compile(re.escape(C.SEO_BEGIN) + r".*?" + re.escape(C.SEO_END), re.S)
AEO_RE = re.compile(r"^[ \t]*" + re.escape(C.AEO_BEGIN) + r".*?" + re.escape(C.AEO_END) + r"[ \t]*\n?", re.S | re.M)

OG_TYPE = {"home": "website", "hub": "website", "product": "product", "article": "article",
           "faq": "website", "utility": "website", "legal": "website"}


def org_id(m):
    return C.base_url(m) + "/#organization"


def site_id(m):
    return C.base_url(m) + "/#website"


def page_image(m, e):
    return C.abs_url(m, e.get("image") or m["site"]["default_image"])


def shipping_details(m, delivery, price):
    """terms.html 제5조 전사. 실물 = 3,000원(5만원 이상 무료), 디지털 = 배송 없음(0원, 0일)."""
    mc = m["site"].get("merchant") or {}
    country = mc.get("country", "KR")
    dest = {"@type": "DefinedRegion", "addressCountry": country}
    if delivery == "physical":
        free_over = mc.get("free_shipping_over")
        fee = mc.get("shipping_fee", 0)
        if free_over is not None and price is not None and price >= free_over:
            fee = 0
        d = {"@type": "OfferShippingDetails",
             "shippingRate": {"@type": "MonetaryAmount", "value": fee, "currency": "KRW"},
             "shippingDestination": dest}
        def days(lo_key, hi_key):
            lo, hi = mc.get(lo_key), mc.get(hi_key)
            if lo is None or hi is None:
                return None
            return {"@type": "QuantitativeValue", "minValue": lo, "maxValue": hi, "unitCode": "DAY"}
        # handlingTime = 주문에서 발송까지, transitTime = 발송에서 도착까지
        dt = {k: v for k, v in (("handlingTime", days("physical_handling_days_min", "physical_handling_days_max")),
                                ("transitTime", days("physical_transit_days_min", "physical_transit_days_max")))
              if v is not None}
        if dt:
            dt["@type"] = "ShippingDeliveryTime"
            d["deliveryTime"] = {"@type": dt.pop("@type"), **dt}
        return d
    zero = {"@type": "QuantitativeValue", "minValue": 0, "maxValue": 0, "unitCode": "DAY"}
    return {"@type": "OfferShippingDetails",
            "shippingRate": {"@type": "MonetaryAmount", "value": 0, "currency": "KRW"},
            "shippingDestination": dest,
            "deliveryTime": {"@type": "ShippingDeliveryTime", "handlingTime": zero, "transitTime": zero}}


def return_policy(m, delivery):
    """terms.html 제6조 전사. 근거 없는 값은 만들지 않는다 -> manifest 미기재면 None(속성 생략)."""
    mc = m["site"].get("merchant") or {}
    country = mc.get("country", "KR")
    if delivery == "physical":
        days = mc.get("physical_return_days")
        fees = mc.get("physical_return_fees")
        if days is None or fees is None:
            return None
        pol = {"@type": "MerchantReturnPolicy",
               "applicableCountry": country,
               "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
               "merchantReturnDays": days,
               "returnMethod": "https://schema.org/ReturnByMail",
               "returnFees": "https://schema.org/" + fees}
        amt = mc.get("physical_return_fee_amount")
        if fees == "ReturnShippingFees" and amt is not None:
            pol["returnShippingFeesAmount"] = {"@type": "MonetaryAmount", "value": amt, "currency": "KRW"}
        return pol
    cat = mc.get("digital_return_category")
    if not cat:
        return None
    pol = {"@type": "MerchantReturnPolicy", "applicableCountry": country,
           "returnPolicyCategory": "https://schema.org/" + cat}
    if cat == "MerchantReturnFiniteReturnWindow":
        days = mc.get("digital_return_days")
        if days is None:
            return None
        pol["merchantReturnDays"] = days
        pol["returnMethod"] = "https://schema.org/ReturnByMail"
        pol["returnFees"] = "https://schema.org/FreeReturn"
    return pol


def build_graph(m, rel, e, page_html):
    site = m["site"]
    url = C.canonical_url(m, rel)
    title = e["title"]
    desc = e.get("description", "")
    image = page_image(m, e)
    lang = site.get("language", "ko-KR")
    sch = e.get("schema", {})
    graph = []

    org = {"@type": "Organization", "@id": org_id(m), "name": site["name"],
           "alternateName": site["alternate_name"], "url": C.base_url(m) + "/",
           "logo": {"@type": "ImageObject", "url": C.abs_url(m, site["logo"])}}
    if site.get("email"):
        org["email"] = site["email"]
    org["sameAs"] = list(site.get("same_as", []))
    graph.append(org)

    graph.append({"@type": "WebSite", "@id": site_id(m), "url": C.base_url(m) + "/",
                  "name": site["name"], "alternateName": site["alternate_name"],
                  "publisher": {"@id": org_id(m)}, "inLanguage": lang})

    crumbs = e.get("breadcrumb") or []
    bc_id = None
    if crumbs:
        bc_id = url + "#breadcrumb"
        graph.append({"@type": "BreadcrumbList", "@id": bc_id, "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": c["name"], "item": C.abs_url(m, c["path"])}
            for i, c in enumerate(crumbs)]})

    page = {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": title,
            "description": desc, "isPartOf": {"@id": site_id(m)}, "inLanguage": lang,
            "primaryImageOfPage": {"@type": "ImageObject", "url": image}}
    if bc_id:
        page["breadcrumb"] = {"@id": bc_id}
    if e.get("date_published"):
        page["datePublished"] = e["date_published"]
    if e.get("date_modified"):
        page["dateModified"] = e["date_modified"]
    graph.append(page)

    t = e["type"]
    if t == "product":
        offers = sch.get("offers")
        if not offers and sch.get("price") is not None:
            offers = [{"name": sch.get("offer_name"), "price": sch["price"], "sku": sch.get("sku")}]
        if PRODUCTS and offers:
            offers = [dict(o) for o in offers]
            for o in offers:
                p = PRODUCTS.get(o.get("sku"))
                if p:
                    o["availability"] = db_avail(p)
                    if p.get("price") is not None:
                        o["price"] = p["price"]
            base = offers[0].get("sku")
            pdf = PRODUCTS.get(base + "-pdf") if base else None
            if pdf and pdf.get("type") != "digital_file":   # 오타입 -pdf 는 광고하지 않는다 (r3 REQ8 — 빌더 게이트와 정합)
                pdf = None
            if pdf and all(o.get("sku") != base + "-pdf" for o in offers):
                offers.append({"name": "PDF 소장판 (파일 내려받기)", "price": pdf.get("price"),
                               "sku": base + "-pdf", "availability": db_avail(pdf)})
        prod = {"@type": "Product", "@id": url + "#product", "name": sch.get("product_name") or title,
                "description": desc, "url": url, "image": image,
                "brand": {"@type": "Brand", "name": site["name"]}}
        if sch.get("sku"):
            prod["sku"] = sch["sku"]
        if sch.get("about"):
            prod["about"] = {"@type": sch.get("about_type", "CollegeOrUniversity"), "name": sch["about"]}
        delivery = sch.get("delivery", "digital")
        ret = return_policy(m, delivery)
        out = []
        for o in offers or []:
            # 살 수 있는 곳이 이 면이 아니면 offer_url 로 실제 결제 동선을 가리킨다.
            # (구조화 데이터의 InStock 은 그 url 에서 실제로 살 수 있어야 참이다 — s17 critic 적발)
            offer = {"@type": "Offer", "priceCurrency": sch.get("currency", "KRW"),
                     "availability": "https://schema.org/" + o.get("availability", sch.get("availability", "InStock")),
                     "url": C.abs_url(m, o["offer_url"]) if o.get("offer_url") else url}
            if o.get("name"):
                offer["name"] = o["name"]
            if o.get("price") is not None:
                offer["price"] = o["price"]
            if o.get("sku"):
                offer["sku"] = o["sku"]
            offer["shippingDetails"] = shipping_details(m, delivery, o.get("price"))
            if ret:
                offer["hasMerchantReturnPolicy"] = dict(ret)
            out.append(offer)
        if out:
            prod["offers"] = out[0] if len(out) == 1 else out
        graph.append(prod)
    elif t == "article":
        art = {"@type": "Article", "@id": url + "#article", "headline": title, "description": desc,
               "url": url, "mainEntityOfPage": {"@id": url + "#webpage"}, "image": image,
               "author": {"@id": org_id(m)}, "publisher": {"@id": org_id(m)}, "inLanguage": lang}
        if sch.get("about"):
            art["about"] = {"@type": sch.get("about_type", "CollegeOrUniversity"), "name": sch["about"]}   # about_type: 비대학 페이지(b2b 등)는 manifest 가 지정
        if e.get("date_published"):
            art["datePublished"] = e["date_published"]
        if e.get("date_modified"):
            art["dateModified"] = e["date_modified"]
        graph.append(art)

    faq = list(e.get("faq") or [])
    if t == "faq" or rel.startswith("guidebook/"):   # 학교별 FAQ 3문항 (build_guidebook faq_of, 2026-08-30)
        faq = faq or C.extract_faq(page_html)
    if faq:
        graph.append({"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
            {"@type": "Question", "name": q["q"], "acceptedAnswer": {"@type": "Answer", "text": q["a"]}}
            for q in faq]})

    items = None
    if t in ("home", "hub"):
        if sch.get("items"):
            items = [p for p in sch["items"]]
        elif sch.get("list_dir"):
            d = sch["list_dir"]
            items = [p for p in sorted(m["pages"]) if p.startswith(d) and p != d + "index.html"
                     and not C.resolve_entry(m, p)["noindex"]]
    if items:
        elems = []
        for p in items:
            pe = C.resolve_entry(m, p.lstrip("/"))
            if pe is None:  # 미생성(planned) 경로는 등재 후 자동 편입
                continue
            name = pe.get("schema", {}).get("product_name") or pe.get("short_name")
            if not name:
                bc = pe.get("breadcrumb") or []
                if bc and C.abs_url(m, bc[-1]["path"]) == C.abs_url(m, p):
                    name = bc[-1]["name"]
            name = name or pe["title"]
            elems.append({"@type": "ListItem", "position": len(elems) + 1, "name": name, "url": C.abs_url(m, p)})
        graph.append({"@type": "ItemList", "@id": url + "#itemlist",
                      "name": sch.get("list_name") or ("주요 상품" if t == "home" else title),
                      "itemListElement": elems})

    if e.get("video"):
        v = {"@type": "VideoObject", "@id": url + "#video"}
        for k in ("name", "description", "thumbnailUrl", "uploadDate", "contentUrl", "embedUrl", "duration"):
            if e["video"].get(k):
                v[k] = e["video"][k]
        graph.append(v)

    return {"@context": "https://schema.org", "@graph": graph}


def build_block(m, rel, e, page_html):
    site = m["site"]
    url = C.canonical_url(m, rel)
    title, desc = e["title"], e.get("description", "")
    image = page_image(m, e)
    lines = [C.SEO_BEGIN,
             f'<link rel="canonical" href="{C.attr(url)}">',
             f'<meta name="description" content="{C.attr(desc)}">']
    if e["noindex"]:
        lines.append(f'<meta name="robots" content="{C.attr(e.get("robots", "noindex, follow"))}">')
    lines += [f'<meta property="og:type" content="{OG_TYPE.get(e["type"], "website")}">',
              f'<meta property="og:title" content="{C.attr(title)}">',
              f'<meta property="og:description" content="{C.attr(desc)}">',
              f'<meta property="og:url" content="{C.attr(url)}">',
              f'<meta property="og:image" content="{C.attr(image)}">',
              f'<meta property="og:locale" content="{site["locale"]}">',
              f'<meta property="og:site_name" content="{C.attr(site["name"])}">',
              f'<meta name="twitter:card" content="{site.get("twitter_card", "summary_large_image")}">',
              f'<meta name="twitter:title" content="{C.attr(title)}">',
              f'<meta name="twitter:description" content="{C.attr(desc)}">',
              f'<meta name="twitter:image" content="{C.attr(image)}">']
    ld = json.dumps(build_graph(m, rel, e, page_html), ensure_ascii=False, separators=(",", ":"))
    ld = ld.replace("</", "<\\/")
    lines.append(f'<script type="application/ld+json">{ld}</script>')
    lines.append(C.SEO_END)
    return "\n".join(lines)


def inject_head(s, block):
    hs, he = C.head_region(s)
    head = s[hs:he]
    m = BLOCK_RE.search(head)
    if m:
        before, after = head[:m.start()], head[m.end():]
    else:
        before, after = head, ""
    for p in DUP_PATTERNS:
        before = p.sub("", before)
        after = p.sub("", after)
    if m:
        new_head = before + block + after
    else:
        tm = re.search(r"</title>[ \t]*\r?\n?", before, re.I)
        if tm:
            pos = tm.end()
            sep = "" if before[tm.start():pos].endswith("\n") else "\n"
            new_head = before[:pos] + sep + block + "\n" + before[pos:] + after
        else:
            new_head = "\n" + block + "\n" + before + after
    return s[:hs] + new_head + s[he:]


def inject_aeo(s, answer, rel, warnings):
    s = AEO_RE.sub("", s)
    if not answer:
        return s
    mm = re.search(r"<main\b[^>]*>", s, re.I)
    if not mm:
        warnings.append(f"{rel}: <main> 없음, aeo 단락 미삽입")
        return s
    aeo = f'{C.AEO_BEGIN}<p class="aeo-answer">{C.attr(answer)}</p>{C.AEO_END}'
    # pagehead 가 main 안에 있으면 그 블록 끝(부제 뒤)에, 없으면 main 첫 자식으로
    ph = re.search(r'<(div|section) class="pagehead"[^>]*>', s[mm.end():], re.I)
    if ph:
        start = mm.end() + ph.start()
        close = re.search(r"</" + ph.group(1) + ">", s[start:], re.I)
        if close:
            at = start + close.start()
            return s[:at] + "  " + aeo + "\n" + s[at:]
    return s[:mm.end()] + "\n" + aeo + s[mm.end():]


def sync_title(s, title):
    m = re.search(r"(<title[^>]*>)(.*?)(</title>)", s, re.S | re.I)
    if not m or not title or C.strip_tags(m.group(2)) == title:
        return s
    return s[:m.start()] + m.group(1) + C.attr(title) + m.group(3) + s[m.end():]


def process(m, rel, dry):
    e = C.resolve_entry(m, rel)
    if e is None:
        return "manifest 미등재 (seo_manifest_init.py 실행 필요)", False
    if C.is_skipped(m, rel):
        return "skip (병행 세션 파일)", False
    s0 = C.read(rel)
    warnings = []
    s = sync_title(s0, e["title"])
    s = inject_head(s, build_block(m, rel, e, s))
    s = inject_aeo(s, (e.get("answer") or "").strip(), rel, warnings)
    changed = s != s0
    if changed and not dry:
        C.write(rel, s)
    note = "변경" if changed else "동일"
    if warnings:
        note += "; " + "; ".join(warnings)
    return note, changed


def main():
    dry = "--dry-run" in sys.argv
    only = None
    for i, a in enumerate(sys.argv):
        if a == "--only":
            only = set(sys.argv[i + 1].split(","))
    m = C.load_manifest()
    pages = [p for p in C.list_pages() if not only or p in only]
    n_changed = 0
    for rel in pages:
        note, changed = process(m, rel, dry)
        n_changed += changed
        print(f"{rel:32s} {note}")
    print(f"-- {len(pages)}면 처리, {n_changed}면 {'변경 예정' if dry else '기록'}")


if __name__ == "__main__":
    main()
