#!/usr/bin/env python3
"""가이드북 판매 정본 원천 해석 (build_previews · build_guidebook 공용, fitz 무의존).

v24 = 2026-09-07 판매 정본. 봉인 세대 part6-s23-official3-v23-a-20260906-09014456f889 + 어댑터 사본 층
(3부 군 제목 "<분류> — 선배 후기 확인", 같은 제목 군 병합), 31권 1,198면. 건우 결재 GB-V24-1~5.
  보호본 PDF = ~/Workspace/interview_guidebook_2027/dist_hyunhak_protected_2027final_v24_20260907/<대학>_2027면접가이드북.pdf
  clean PDF  = ~/Workspace/interview_guidebook_2027/dist_hyunhak_clean_2027final_v24_20260907/<대학>_2027면접가이드북.pdf (면수 원장)
  HTML·manifest = <BUILD_ROOT>/<대학>/<winner_dir>/<대학>_R.{html,manifest.json}. winner.json 이 승자 시도를 지목한다
                  (09-07 실측 30권 c00, 서울과학기술대학교 c01).
수치 원장 = manifest s16_content_gate (source_question_count · part4_rule_count · category_group_count).
지면 HTML 의 qgrp · div.rule 수와 31/31 일치 실측(09-07 s51).

v24 HTML(profile r-hyunhak-s16-v1) 이 08-28 판과 다른 자리:
  2부 2-1 제원 = dcard(dch 전형명 + dcb th 항목) 또는 2-1 안의 mtx 표. 2-2 는 학과별 mtx 표라 문서 첫 mtx 를 집으면 학과가 전형으로 둔갑한다.
  4부 규칙 = section.p4-area>h3(영역) > section.p4-intent>h4(의도) > div.rule[data-rule-id] (rt 언제 · rq · rtail). R코드·rev 없음.
  3부 군 제목 = "<분류> — 선배 후기 확인" (+ 현행 경고 괄호). "공식 예시문항"(경희·부산) 은 꼬리표 없음.
"""
import html as htmlmod
import json
import re
from pathlib import Path

V24_EDITION = "v24"
V24_GENERATION_HINT = "part6-s23-official3-v23-a-20260906-09014456f889"
V24_BUILD_ROOT = Path("/Users/gregory/Documents/Codex/2026-08-27/chatgpt-docs-prompts-p6src-1-standalone/work/part6_builds/s24-v24-r1")
V24_WORKSPACE = Path.home() / "Workspace" / "interview_guidebook_2027"
V24_PROTECTED = V24_WORKSPACE / "dist_hyunhak_protected_2027final_v24_20260907"
V24_CLEAN = V24_WORKSPACE / "dist_hyunhak_clean_2027final_v24_20260907"
REVIEW_SUFFIX = " — 선배 후기 확인"


def text(s):
    """태그 제거 + 엔티티 복원 + 단어결합자(U+2060) 제거 + 공백 정리."""
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = htmlmod.unescape(s).replace("⁠", "")
    return re.sub(r"\s+", " ", s).strip()


def v24_inputs(univ):
    """v24 승자 산출 경로. v24 에 없는 권(비판매 7권)은 None."""
    wj = V24_BUILD_ROOT / univ / "winner.json"
    if not wj.is_file():
        return None
    w = json.loads(wj.read_text(encoding="utf-8"))
    if w.get("univ") != univ:
        raise ValueError(f"{univ}: winner.json univ 불일치: {w.get('univ')!r}")
    if w.get("status") != "verified":
        raise ValueError(f"{univ}: winner status={w.get('status')!r} (verified 아님)")
    d = w["winner_dir"]
    base = V24_BUILD_ROOT / univ / d
    return {
        "winner_dir": d,
        "html": base / f"{univ}_R.html",
        "manifest": base / f"{univ}_R.manifest.json",
        "pdf": V24_PROTECTED / f"{univ}_2027면접가이드북.pdf",
        "clean_pdf": V24_CLEAN / f"{univ}_2027면접가이드북.pdf",
    }


def counts_from_manifest(path):
    m = json.loads(Path(path).read_text(encoding="utf-8"))
    g = m.get("s16_content_gate")
    if not isinstance(g, dict):
        raise ValueError(f"{path}: s16_content_gate 없음")
    q, r, t = g.get("source_question_count"), g.get("part4_rule_count"), g.get("category_group_count")
    for k, v in (("source_question_count", q), ("part4_rule_count", r), ("category_group_count", t)):
        if not isinstance(v, int):
            raise ValueError(f"{path}: {k} 정수 누락")
    if g.get("rendered_question_count") != q:
        raise ValueError(f"{path}: rendered_question_count={g.get('rendered_question_count')} != source {q}")
    return {"questions": q, "rules": r, "types": t}


def type_label(gh):
    """3부 군 제목 → 사이트 유형명. 꼬리표와 그 뒤 현행 경고 괄호만 걷고, 가운뎃점은 export/site 관행대로 쉼표."""
    t = text(gh)
    m = re.match(r"^(.*?)\s+—\s+선배 후기 확인(\s*\(.*\))?$", t)
    if m:
        t = m.group(1)
    return t.replace("·", ",").strip()


def detect_profile(html):
    return "v24" if 'class="p4-taxonomy"' in html else "v21"


def parse_rules_v24(body):
    """(rule_list, rule_areas). 코드는 문서 순서 R01.., area = '영역 (의도)', when = rt 의 '언제' 뒤 문장."""
    rules, areas = [], []
    for seg in body.split('<section class="p4-area">')[1:]:
        h3 = re.search(r"<h3>(.*?)</h3>", seg, flags=re.S)
        area = text(h3.group(1)) if h3 else ""
        if area and area not in areas:
            areas.append(area)
        chunks = seg.split('<section class="p4-intent">')
        for j, chunk in enumerate(chunks):
            intent = ""
            if j > 0:
                h4 = re.search(r"<h4>(.*?)</h4>", chunk, flags=re.S)
                intent = text(h4.group(1)) if h4 else ""
            for rt in re.findall(r'<div class="rule"[^>]*>\s*<div class="rt">(.*?)</div>', chunk, flags=re.S):
                when = text(rt)
                when = re.sub(r"^언제\s*", "", when)
                rules.append({"code": f"R{len(rules) + 1:02d}",
                              "area": f"{area} ({intent})" if intent else area,
                              "when": when})
    return rules, areas


def _section_21(body):
    i = body.find('<span class="n">2-1</span>')
    if i < 0:
        return ""
    j = body.find('<h2 class="sec">', i + 1)
    return body[i:j] if j > 0 else body[i:]


def parse_spec_v24(body):
    """(spec_tracks, spec_items) — 2-1 절 안에서만. dcard 우선, 없으면 2-1 안의 mtx 표, 둘 다 없으면 빈 값."""
    seg = _section_21(body)
    if not seg:
        return [], []
    dch = [text(x) for x in re.findall(r'<div class="dch">(.*?)</div>', seg, flags=re.S)]
    if dch:
        first = re.search(r'<table class="dcb">(.*?)</table>', seg, flags=re.S)
        items = [text(x) for x in re.findall(r"<th[^>]*>(.*?)</th>", first.group(1), flags=re.S)] if first else []
        return dch, [x for x in items if x]
    mtx = re.search(r'<table class="mtx[^"]*">(.*?)</table>', seg, flags=re.S)
    if not mtx:
        return [], []
    head = re.search(r"<thead>(.*?)</thead>", mtx.group(1), flags=re.S)
    tracks = [text(x) for x in re.findall(r"<th[^>]*>(.*?)</th>", head.group(1), flags=re.S)] if head else []
    rows = re.findall(r"<tbody>(.*?)</tbody>", mtx.group(1), flags=re.S)
    items = [text(x) for x in re.findall(r'<th class="rh">(.*?)</th>', rows[0], flags=re.S)] if rows else []
    return [x for x in tracks if x], [x for x in items if x]
