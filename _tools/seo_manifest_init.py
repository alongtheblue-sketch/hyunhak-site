#!/usr/bin/env python3
"""tools/seo_manifest.json 생성·갱신.

- 최초 실행: site/defaults/pages 전체를 기존 페이지(<title>, description, h1)에서 채워 생성.
- 재실행: 이미 등재된 페이지는 건드리지 않고, 새로 생긴 html 만 디렉토리 기본값 + h1 로 추가.
- --force: 전부 재생성 (수동 편집분 소실).
사용: python3 _tools/seo_manifest_init.py [--force]
"""
import os
import re
import sys

import seo_common as C

BASE = "https://hyunhak.com"

# 지표 포함 수기 description (70~110자, 가운뎃점/em대시 없음). 빈 페이지는 h1/첫 문단 템플릿.
HAND = {
    "index.html": {
        "title": "현학적 연구소",
        "description": "현학적 연구소는 대입 제시문 면접 준비를 다룹니다. 연세대, 고려대, 성균관대 기출 지문 해제와 촬영 첨삭, 학교별 2027 면접 가이드북, 26개 대학 면접 기출 아카이브.",
        "type": "home", "priority": 1.0, "changefreq": "weekly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}],
        "schema": {"items": ["programs/yonsei.html", "programs/korea.html", "programs/skku.html", "studio.html", "guidebook/index.html", "store.html", "interview/index.html"]},
    },
    "interview/index.html": {
        "description": "26개 대학 수시 면접의 유형 판정과 실제 면접 기출 질문 3,733건, 학종 면접 질문과 준비 전략. 면접 후기와 2027 공식 요강으로 재구성한 무료 아카이브입니다.",
        "type": "hub", "priority": 0.8, "changefreq": "weekly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "면접 아카이브", "path": "/interview/"}],
        "schema": {"list_dir": "interview/", "list_name": "대학별 면접 아카이브"},
    },
    "programs/yonsei.html": {
        "description": "연세대 활동우수형 제시문 면접을 준비 8분과 답변 5분의 실전 규격으로 훈련하는 면접 스튜디오. 기출 지문 해제와 촬영 첨삭, 전권 330,000원, 지문 1편 22,000원.",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "면접 스튜디오", "path": "/studio.html"}, {"name": "연세대 제시문 면접 스튜디오", "path": "/programs/yonsei.html"}],
        "schema": {"product_name": "연세대학교 제시문 면접 스튜디오 (활동우수형)", "about": "연세대학교",
                   "offers": [{"name": "학교 전권 (지문 60편)", "price": 330000, "sku": "STUDIO-YONSEI-FULL"},
                              {"name": "지문 1편 (응시 5회)", "price": 22000, "sku": "STUDIO-YONSEI-ONE"}]},
    },
    "programs/korea.html": {
        "description": "고려대 계열적합전형 제시문 면접을 준비 21분과 발화 7분의 실전 규격으로 훈련하는 면접 스튜디오. 기출 지문 해제와 촬영 첨삭, 전권 330,000원, 지문 1편 22,000원.",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "면접 스튜디오", "path": "/studio.html"}, {"name": "고려대 제시문 면접 스튜디오", "path": "/programs/korea.html"}],
        "schema": {"product_name": "고려대학교 제시문 면접 스튜디오 (계열적합전형)", "about": "고려대학교",
                   "offers": [{"name": "학교 전권 (지문 60편)", "price": 330000, "sku": "STUDIO-KOREA-FULL"},
                              {"name": "지문 1편 (응시 5회)", "price": 22000, "sku": "STUDIO-KOREA-ONE"}]},
    },
    "studio.html": {
        "description": "학교별 기출 제시문으로 치르는 대입 면접 스튜디오. 지문 1편 22,000원에 5회 응시, 학교 전권 330,000원. 전면 카메라 녹화와 전사, 진단, 재구성의 첨삭 세 단.",
        "type": "product", "priority": 0.9, "changefreq": "weekly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "면접 스튜디오", "path": "/studio.html"}],
        "schema": {"product_name": "제시문 면접 스튜디오",
                   "offers": [{"name": "학교 전권", "price": 330000, "sku": "STUDIO-FULL"},
                              {"name": "지문 1편 (응시 5회)", "price": 22000, "sku": "STUDIO-ONE"}]},
    },
    "store.html": {
        "description": "현학적 연구소 스토어. 인문, 사회, 자연 계열 제시문 해제집과 구술 노트, 영어 봉투 모의고사를 판매합니다. 평일 오후 2시 이전 주문은 당일 출고합니다.",
        "type": "hub", "priority": 0.8, "changefreq": "weekly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "스토어", "path": "/store.html"}],
        "schema": {"items": ["store_item.html"], "list_name": "스토어 상품"},
    },
    "store_item.html": {
        "description": "수리 구술의 뼈대는 자연 계열 구술 면접 해제집 2쇄, 296면입니다. 구술 전환 90편과 채점자 시점 해설, 백지 연습 24회로 답변이 서는 순서를 다룹니다. 32,000원.",
        "type": "product", "priority": 0.7, "changefreq": "monthly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "스토어", "path": "/store.html"}, {"name": "수리 구술의 뼈대", "path": "/store_item.html"}],
        "schema": {"product_name": "수리 구술의 뼈대 (자연 계열 구술 해제집, 2쇄)",
                   "offers": [{"name": "단권", "price": 32000, "sku": "BOOK-04-3"}]},
    },
    "about.html": {
        "type": "utility", "noindex": False, "priority": 0.6, "changefreq": "monthly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "연구소 소개", "path": "/about.html"}],
    },
    "faq.html": {
        "description": "면접 가이드북 열람 방식, 제시문 면접 스튜디오 응시와 첨삭, 가격과 환불, 자료 출처에 대한 답을 모았습니다. 현학적 연구소 자주 묻는 질문.",
        "type": "faq", "noindex": False, "priority": 0.7, "changefreq": "monthly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "자주 묻는 질문", "path": "/faq.html"}],
    },
    "notice.html": {
        "description": "현학적 연구소 공지. 학교별 면접 가이드북 갱신 내역, 제시문 면접 스튜디오 일정, 결제와 열람에 관한 서비스 안내를 날짜순으로 게시합니다.",
        "type": "utility", "noindex": False, "priority": 0.5, "changefreq": "weekly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "공지", "path": "/notice.html"}],
    },
    "library.html": {
        "type": "hub", "priority": 0.8, "changefreq": "weekly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "자료실", "path": "/library.html"}],
    },
    "terms.html": {
        "description": "현학적 연구소 이용약관. 회원 가입, 면접 스튜디오 이용권과 가이드북 구매, 결제, 청약철회와 환불, 지식재산권에 관한 조건을 안내합니다.",
        "type": "legal", "priority": 0.3, "changefreq": "yearly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "이용약관", "path": "/terms.html"}],
    },
    "privacy.html": {
        "description": "현학적 연구소 개인정보처리방침. 수집 항목과 목적, 보유 기간, 처리 위탁, 학생 음성과 영상의 처리, 정보주체의 권리와 안전성 확보 조치를 안내합니다.",
        "type": "legal", "priority": 0.3, "changefreq": "yearly",
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "개인정보처리방침", "path": "/privacy.html"}],
    },
}

NOINDEX = {"cart.html", "checkout.html", "login.html", "join.html", "my.html", "pay_done.html", "reader.html", "404.html"}

SITE = {
    "base_url": BASE,
    "name": "현학적 연구소",
    "alternate_name": "玄學的 硏究所",
    "logo": "/assets/photo/art_figure.png",
    "default_image": "/assets/photo/art_figure.png",
    "locale": "ko_KR",
    "language": "ko-KR",
    "email": "admin@hyunhak.com",
    "twitter_card": "summary_large_image",
    "skip_inject": ["library.html", "my.html", "reader.html"],
    "planned_paths": ["programs/skku.html"],
    "llms": {
        "summary": "현학적 연구소(玄學的 硏究所)는 대입 면접 준비 서비스입니다. 연세대, 고려대, 성균관대 제시문 면접을 기출 지문 해제와 촬영 첨삭으로 훈련하는 면접 스튜디오, 학교별 2027 면접 가이드북 38권, 제시문 해제집 스토어를 운영하고, 26개 대학 면접 기출 아카이브를 무료로 공개합니다. 이름의 한자는 검을 현 玄을 씁니다(衒 아님).",
        "products": [
            {"name": "학교별 2027 면접 가이드북 (디지털, 38권)", "path": "/guidebook/", "price": "1권 16,500원 (보안 리더 열람, 원본 PDF 비제공)",
             "desc": "대학별 면접 제원, 유형 판정, 실제 기출 질문, 생기부 기반 예상 질문과 준비 전략. 보안 리더로 열람하는 디지털 가이드북."},
            {"name": "제시문 면접 스튜디오 (연세대, 고려대, 성균관대)", "path": "/studio.html", "price": "학교 전권 330,000원, 지문 1편 22,000원(응시 5회)",
             "desc": "학교별 기출 제시문으로 실전 규격 온라인 응시, 전면 카메라 녹화, 전사와 진단과 재구성의 첨삭 세 단."},
            {"name": "스토어", "path": "/store.html", "price": "해제집 26,000원부터, 영어 봉투 모의고사 1부 38,500원",
             "desc": "인문, 사회, 자연 계열 제시문 해제집과 구술 노트, 영어 봉투 모의고사 실물 배송."},
        ],
        "free": [{"name": "면접 아카이브 26교", "path": "/interview/", "desc": "대학별 면접 유형 판정, 실제 기출 질문, 준비 전략. 회원 가입 없이 열람."}],
        "keywords": ["연세대 면접", "고려대 계열적합 면접", "성균관대 면접", "제시문 면접", "구술면접", "대입 면접 준비", "면접 기출", "면접가이드북", "학종 면접 질문"],
        "contact": "admin@hyunhak.com",
    },
}

DEFAULTS = {
    "interview/*": {
        "_note": "면접 아카이브 26교. title/description 은 init 템플릿, 개별 수정은 pages 에서.",
        "type": "article", "priority": 0.7, "changefreq": "monthly", "noindex": False,
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "면접 아카이브", "path": "/interview/"}],
    },
    "guidebook/*": {
        "_note": "학교별 2027 면접 가이드북 38권 (디지털 상품). price/sku 는 init 이 페이지 data-cart-* 에서 읽음. guidebook/index.html 은 hub 로 개별 오버라이드.",
        "type": "product", "priority": 0.8, "changefreq": "monthly", "noindex": False,
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "가이드북", "path": "/guidebook/"}],
        "schema": {"offers": [{"name": "디지털 가이드북 (보안 리더 열람)", "price": None, "sku": None}]},
    },
    "programs/*": {
        "_note": "제시문 면접 스튜디오 학교별 LP. 전권 330,000원, 지문 1편 22,000원.",
        "type": "product", "priority": 0.9, "changefreq": "monthly", "noindex": False,
        "breadcrumb": [{"name": "현학적 연구소", "path": "/"}, {"name": "면접 스튜디오", "path": "/studio.html"}],
        "schema": {"offers": [{"name": "학교 전권", "price": 330000, "sku": None},
                              {"name": "지문 1편 (응시 5회)", "price": 22000, "sku": None}]},
    },
}


def archive_stats():
    """interview/index.html 허브에서 slug -> (질문 수, 유형 수)."""
    stats = {}
    try:
        s = C.read("interview/index.html")
    except FileNotFoundError:
        return stats
    for m in re.finditer(r"href=['\"]([a-z]+)\.html['\"][^>]*>.*?([\d,]+)건.*?유형\s*(\d+)종", s, re.S):
        stats[m.group(1)] = (m.group(2), m.group(3))
    return stats


def desc_ok(d):
    return 70 <= len(d) <= 110 and "·" not in d and "—" not in d


def school_from_h1(h1):
    m = re.match(r"(.+?대학교)", h1)
    if m:
        return m.group(1)
    w = h1.split(" ")[0]
    return w + "학교" if w.endswith("대") else w


def build_entry(rel, s, stats):
    title = C.get_title(s)
    h1 = C.get_h1(s)
    desc = C.clean_text(C.get_meta_description(s))
    entry = {"title": title}
    hand = HAND.get(rel, {})
    pat = C.match_default({"defaults": DEFAULTS}, rel)

    if pat == "interview/*":
        school = school_from_h1(h1)
        n, k = stats.get(os.path.basename(rel)[:-5], ("", ""))
        cnt = f"기출 및 예상 질문 {n}건, 유형 {k}종, " if n else "기출 질문과 유형 판정, "
        desc = f"{school} 면접 {cnt}준비 전략. 2016~2025 면접 후기와 2027 수시 요강으로 재구성한 아카이브입니다."
        entry["breadcrumb"] = DEFAULTS[pat]["breadcrumb"] + [{"name": f"{school} 면접", "path": "/" + rel}]
        entry["schema"] = {"about": school}
    elif pat == "guidebook/*":
        school = re.sub(r"\s*2027.*$", "", h1).strip() if h1 else os.path.basename(rel)[:-5]
        if not title:
            entry["title"] = f"{school} 2027 면접 가이드북 | 현학적 연구소"
        if not desc_ok(desc):
            desc = f"{school} 2027 면접 가이드북. 전형별 면접 제원과 유형 판정, 실제 기출 질문, 생기부 기반 예상 질문과 준비 전략을 담은 디지털 가이드북입니다."
        entry["breadcrumb"] = DEFAULTS[pat]["breadcrumb"] + [{"name": f"{school} 2027 면접 가이드북", "path": "/" + rel}]
        pm = re.search(r'data-cart-price="(\d+)"', s)
        sm = re.search(r'data-cart-sku="([^"]+)"', s)
        entry["schema"] = {"about": school, "product_name": f"{school} 2027 면접 가이드북",
                           "offers": [{"name": "디지털 가이드북 (보안 리더 열람)",
                                       "price": int(pm.group(1)) if pm else None,
                                       "sku": sm.group(1) if sm else None}]}
        if rel == "guidebook/index.html":
            entry.update({"type": "hub", "priority": 0.9, "changefreq": "weekly",
                          "breadcrumb": DEFAULTS[pat]["breadcrumb"],
                          "schema": {"list_dir": "guidebook/", "list_name": "학교별 2027 면접 가이드북"}})
            page_desc = C.clean_text(C.get_meta_description(s))
            desc = page_desc if desc_ok(page_desc) else "학교별 2027 면접 가이드북 38권. 전형별 면접 제원과 유형 판정, 실제 기출 질문, 생기부 기반 예상 질문과 준비 전략을 담은 디지털 가이드북입니다. 1권 16,500원."
    elif pat == "programs/*" and rel not in HAND:
        name = title or h1
        school = school_from_h1(name) if name else os.path.basename(rel)[:-5]
        if not desc_ok(desc):
            desc = f"{name}. 기출 지문 해제와 촬영 첨삭, 전사와 진단과 재구성의 첨삭 세 단. 학교 전권 330,000원, 지문 1편 22,000원."
        entry["breadcrumb"] = DEFAULTS[pat]["breadcrumb"] + [{"name": name, "path": "/" + rel}]
        pm = re.search(r'data-cart-price="(\d+)"', s)
        sm = re.search(r'data-cart-sku="([^"]+)"', s)
        entry["schema"] = {"about": school, "product_name": name}
        if pm:
            entry["schema"]["offers"] = [{"name": "학교 전권", "price": int(pm.group(1)), "sku": sm.group(1) if sm else None}]

    if not desc:
        para = C.clean_text(C.get_first_paragraph(s))
        desc = (f"{h1}. {para}" if h1 else para)[:110]
    entry["description"] = desc
    if rel in NOINDEX:
        entry.update({"type": "utility", "noindex": True, "priority": 0.1, "changefreq": "yearly"})
        entry.setdefault("breadcrumb", [{"name": "현학적 연구소", "path": "/"}, {"name": h1 or title, "path": "/" + rel}])
    for k, v in hand.items():
        entry[k] = v
    if not pat and "type" not in entry:
        entry["type"] = "utility"
    entry.setdefault("answer", "")
    return entry


def main():
    force = "--force" in sys.argv
    exists = os.path.exists(C.MANIFEST_PATH) and not force
    manifest = C.load_manifest() if exists else {"site": SITE, "defaults": DEFAULTS, "pages": {}}
    stats = archive_stats()
    added = []
    for rel in C.list_pages():
        if rel in manifest["pages"]:
            continue
        manifest["pages"][rel] = build_entry(rel, C.read(rel), stats)
        added.append(rel)
    manifest["pages"] = dict(sorted(manifest["pages"].items()))
    C.save_manifest(manifest)
    print(f"manifest {'갱신' if exists else '생성'}: {C.MANIFEST_PATH}  추가 {len(added)}건")
    for r in added:
        print("  +", r)


if __name__ == "__main__":
    main()
