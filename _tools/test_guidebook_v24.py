#!/usr/bin/env python3
"""가이드북 사이트 v24 동기 계약 (GB-V24-5 (B), 2026-09-07 s51).
실행: ~/venvs/pdfbuild/bin/python -m unittest _tools/test_guidebook_v24.py -v
실파일 대조는 v24 승자 HTML·08-28 out2 HTML 이 디스크에 있을 때만 돈다(없으면 skip 으로 표시, 통과로 세지 않는다).
"""
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

V24_ROOT = Path("/Users/gregory/Documents/Codex/2026-08-27/chatgpt-docs-prompts-p6src-1-standalone/work/part6_builds/s24-v24-r1")
V24_HTML_GACHON = V24_ROOT / "가천대학교/c00/가천대학교_R.html"
V24_MANIFEST_GACHON = V24_ROOT / "가천대학교/c00/가천대학교_R.manifest.json"
V24_HTML_KWANGWOON = V24_ROOT / "광운대학교/c00/광운대학교_R.html"
OLD_HTML_GACHON = Path.home() / "Workspace/interview_guidebook_2027/out2/가천대학교_R.html"
OLD_EXPORT_GACHON = Path.home() / "Workspace/interview_guidebook_2027/export/site/가천대학교.json"
META_V3 = HERE / "guidebook_meta_v3.json"
# 08-28 판 파서 대조군. 살아 있는 meta 는 v24 로 갱신되므로 픽스처로 고정 (2026-09-07 s51, 원천 = meta v3 08-28 gachon 항목).
FIXTURE_GACHON_0828 = HERE / "fixtures" / "guidebook_meta_v3_gachon_0828.json"

RULES_V24 = (
    '<body><section class="part" id="pt4"><div class="pbig">4</div></section>'
    '<section class="p4-taxonomy">'
    '<section class="p4-area"><h3>교과학습</h3>'
    '<section class="p4-intent"><h4>과정·역할</h4>'
    '<div class="rule" data-rule-id="s6-t0-r0"><div class="rt"><b>언제</b> 화학 개념 탐구 기재</div><div class="rq">Q1</div>'
    '<div class="rtail"><b>이어질 꼬리질문</b><div class="rtq">T1</div></div></div></section>'
    '<section class="p4-intent"><h4>개념·이해</h4>'
    '<div class="rule" data-rule-id="s6-t0-r1"><div class="rt"><b>언제</b> 산화환원 심화</div><div class="rq">Q2</div></div></section>'
    '</section>'
    '<section class="p4-area"><h3>창의적 체험활동</h3>'
    '<section class="p4-intent"><h4>사실확인</h4>'
    '<div class="rule" data-rule-id="s6-t1-r0"><div class="rt"><b>언제</b> 전교 회장 기재</div><div class="rq">Q3</div></div></section>'
    '</section></section></body>'
)

SPEC_DCARD = (
    '<body><section><h2 class="sec"><span class="n">2-1</span>면접 기본 제원</h2><h3 class="sub">전형별 공식 제원</h3>'
    '<div class="dcard"><div class="dch">가천바람개비전형</div><table class="dcb"><tbody>'
    '<tr><th>대상 모집단위</th><td>요강상 모집단위</td></tr><tr><th>면접 실시여부</th><td>실시</td></tr>'
    '<tr><th>반영비율</th><td>50%</td></tr></tbody></table></div></section>'
    '<section><h2 class="sec"><span class="n">2-2</span>인재상</h2>'
    '<table class="mtx"><thead><tr><th class="rh"></th><th>간호학과<br>(82건)</th><th>컴퓨터공학과<br>(38건)</th></tr></thead>'
    '<tbody><tr><th class="rh">확인하는 것</th><td>a</td><td>b</td></tr></tbody></table></section></body>'
)

SPEC_MTX_IN_21 = (
    '<body><section><h2 class="sec"><span class="n">2-1</span>면접 기본 제원</h2><h3 class="sub">전형별 공식 제원</h3>'
    '<table class="mtx mtxlast"><thead><tr><th class="rh"></th><th>KGU학생부종합전형</th><th>SW우수자전형</th></tr></thead>'
    '<tbody><tr><th class="rh">대상 모집단위</th><td>x</td><td>y</td></tr><tr><th class="rh">면접 실시여부</th><td>실시</td><td>실시</td></tr>'
    '</tbody></table></section>'
    '<section><h2 class="sec"><span class="n">2-2</span>인재상</h2>'
    '<table class="mtx"><thead><tr><th class="rh"></th><th>디자인학부<br>(9건)</th></tr></thead>'
    '<tbody><tr><th class="rh">확인하는 것</th><td>a</td></tr></tbody></table></section></body>'
)

SPEC_NONE = (
    '<body><section><h2 class="sec"><span class="n">2-1</span>면접 기본 제원</h2><p class="plain">공식 요강 미확인</p></section>'
    '<section><h2 class="sec"><span class="n">2-2</span>인재상</h2>'
    '<table class="mtx"><thead><tr><th class="rh"></th><th>간호학과</th></tr></thead><tbody><tr><th class="rh">확인하는 것</th><td>a</td></tr></tbody></table>'
    '</section></body>'
)


def _need(*paths):
    missing = [str(p) for p in paths if not p.is_file()]
    if missing:
        raise unittest.SkipTest("실파일 부재(검사 불가): " + ", ".join(missing))


# ---------------------------------------------------------------- guidebook_sources
class SourcesV24(unittest.TestCase):
    def test_v24_inputs_resolves_winner_dir_c00(self):
        _need(V24_HTML_GACHON)
        from guidebook_sources import v24_inputs
        d = v24_inputs("가천대학교")
        self.assertEqual(d["winner_dir"], "c00")
        self.assertEqual(d["html"], V24_HTML_GACHON)
        self.assertEqual(d["manifest"], V24_MANIFEST_GACHON)
        self.assertTrue(d["pdf"].is_file(), d["pdf"])
        self.assertIn("dist_hyunhak_protected_2027final_v24_20260907", str(d["pdf"]))
        self.assertTrue(d["clean_pdf"].is_file(), d["clean_pdf"])
        self.assertIn("dist_hyunhak_clean_2027final_v24_20260907", str(d["clean_pdf"]))

    def test_v24_inputs_resolves_winner_dir_c01(self):
        _need(V24_ROOT / "서울과학기술대학교/winner.json")
        from guidebook_sources import v24_inputs
        d = v24_inputs("서울과학기술대학교")
        self.assertEqual(d["winner_dir"], "c01")
        self.assertTrue(d["html"].is_file(), d["html"])

    def test_v24_inputs_none_for_volume_outside_v24(self):
        _need(V24_ROOT / "가천대학교/winner.json")
        from guidebook_sources import v24_inputs
        self.assertIsNone(v24_inputs("경북대학교"))

    def test_counts_from_manifest(self):
        _need(V24_MANIFEST_GACHON)
        from guidebook_sources import counts_from_manifest
        self.assertEqual(counts_from_manifest(V24_MANIFEST_GACHON), {"questions": 142, "rules": 53, "types": 14})

    def test_type_label_strips_review_suffix_and_warning(self):
        from guidebook_sources import type_label
        self.assertEqual(type_label("지원동기·대학이해 — 선배 후기 확인"), "지원동기,대학이해")
        self.assertEqual(type_label("자기소개 — 선배 후기 확인 (현행에서는 거의 나오지 않음)"), "자기소개")
        self.assertEqual(type_label("블라인드 저촉 질문 — 선배 후기 확인 (현행 블라인드에서는 나오지 않음)"), "블라인드 저촉 질문")
        self.assertEqual(type_label("공식 예시문항"), "공식 예시문항")
        self.assertEqual(type_label("데이터사이언스학과 — 선배 후기 확인"), "데이터사이언스학과")

    def test_detect_profile(self):
        from guidebook_sources import detect_profile
        self.assertEqual(detect_profile(RULES_V24), "v24")
        self.assertEqual(detect_profile('<body><div class="rule"><div class="rh">R01<span class="it">교과 세특</span></div></div></body>'), "v21")

    def test_parse_rules_v24_codes_areas_when(self):
        from guidebook_sources import parse_rules_v24
        rules, areas = parse_rules_v24(RULES_V24)
        self.assertEqual(rules, [
            {"code": "R01", "area": "교과학습 (과정·역할)", "when": "화학 개념 탐구 기재"},
            {"code": "R02", "area": "교과학습 (개념·이해)", "when": "산화환원 심화"},
            {"code": "R03", "area": "창의적 체험활동 (사실확인)", "when": "전교 회장 기재"},
        ])
        self.assertEqual(areas, ["교과학습", "창의적 체험활동"])

    def test_parse_spec_v24_prefers_dcard_over_later_mtx(self):
        from guidebook_sources import parse_spec_v24
        tracks, items = parse_spec_v24(SPEC_DCARD)
        self.assertEqual(tracks, ["가천바람개비전형"])
        self.assertEqual(items, ["대상 모집단위", "면접 실시여부", "반영비율"])

    def test_parse_spec_v24_mtx_inside_21_only(self):
        from guidebook_sources import parse_spec_v24
        tracks, items = parse_spec_v24(SPEC_MTX_IN_21)
        self.assertEqual(tracks, ["KGU학생부종합전형", "SW우수자전형"])
        self.assertEqual(items, ["대상 모집단위", "면접 실시여부"])

    def test_parse_spec_v24_empty_when_21_has_no_table(self):
        from guidebook_sources import parse_spec_v24
        self.assertEqual(parse_spec_v24(SPEC_NONE), ([], []))


# ---------------------------------------------------------------- build_previews
class PreviewsV24(unittest.TestCase):
    def test_parse_html_v24_gachon_real(self):
        _need(V24_HTML_GACHON)
        import build_previews as bp
        m = bp.parse_html("가천대학교", V24_HTML_GACHON, {"questions": 142, "rules": 53})
        self.assertEqual((m["questions"], m["rules"], m["vol"]), (142, 53, 20))
        self.assertEqual(len(m["rule_list"]), 53)
        self.assertEqual(m["rule_list"][0], {"code": "R01", "area": "교과학습 (과정·역할)", "when": "화학 개념 탐구 기재"})
        self.assertEqual(m["rule_areas"][0], "교과학습")
        self.assertGreaterEqual(len(m["rule_areas"]), 9)
        self.assertEqual(m["spec_tracks"], ["가천바람개비전형"])
        self.assertEqual(m["spec_items"][:3], ["대상 모집단위", "면접 실시여부", "반영비율"])
        self.assertEqual([t["track"] for t in m["tracks"]], ["가천바람개비전형"])
        self.assertEqual(len(m["parts"]), 5)
        self.assertGreaterEqual(len(m["strategies"]), 3)
        self.assertEqual(m["strategies"][0], "생기부 전수 구두화 (최우선)")

    def test_parse_html_v24_six_part_volume(self):
        _need(V24_HTML_KWANGWOON)
        import build_previews as bp
        m = bp.parse_html("광운대학교", V24_HTML_KWANGWOON, {"questions": 148, "rules": 67})
        self.assertEqual([p["no"] for p in m["parts"]], [1, 2, 3, 4, 5, 6])

    def test_parse_html_old_profile_unchanged_control(self):
        _need(OLD_HTML_GACHON, OLD_EXPORT_GACHON, FIXTURE_GACHON_0828)
        import build_previews as bp
        m = bp.parse_html("가천대학교", OLD_HTML_GACHON, OLD_EXPORT_GACHON)
        live = json.loads(FIXTURE_GACHON_0828.read_text(encoding="utf-8"))
        for k in ("questions", "rules", "vol", "parts", "toc_subs", "usage", "forms", "tracks", "spec_tracks", "spec_items",
                  "groups", "years", "units_n", "rule_list", "rule_areas", "rule_tail_n", "rule_ev_n", "strategies", "sections"):
            self.assertEqual(json.loads(json.dumps(m[k], ensure_ascii=False)), live[k], k)   # meta 는 JSON 왕복(tuple→list) 뒤 값

    def test_build_one_v24_dry_paths(self):
        _need(V24_HTML_GACHON)
        import build_previews as bp
        d = bp.build_one("gachon", "가천대학교", dry=True, edition="v24")
        self.assertIn("dist_hyunhak_protected_2027final_v24_20260907", d["paths"]["pdf"])
        self.assertEqual(d["paths"]["html"], str(V24_HTML_GACHON))
        self.assertEqual(d["paths"]["manifest"], str(V24_MANIFEST_GACHON))
        self.assertIsNone(bp.build_one("knu", "경북대학교", dry=True, edition="v24"))

    def test_merge_meta_entry_carries_legacy_search_pool_once(self):
        import build_previews as bp
        old = {"tracks": [{"track": "가천바람개비, 가천의약학, 기회균형", "form": "서류확인형"}],
               "spec_tracks": ["가천바람개비 (437명)", "지역균형 (358명)"], "pages": 40}
        new = {"tracks": [{"track": "가천바람개비전형", "form": "서류확인형"}], "spec_tracks": ["가천바람개비전형"], "pages": 35}
        out = bp.merge_meta_entry(old, dict(new))
        self.assertEqual(out["pages"], 35)
        self.assertEqual(out["edition"], "v24")
        self.assertEqual(out["search_pool_legacy"], ["가천바람개비 (437명)", "가천바람개비, 가천의약학, 기회균형", "지역균형 (358명)"])
        # 이미 v24 인 항목을 다시 병합해도 legacy 는 v24 값으로 덮이지 않는다
        again = bp.merge_meta_entry(out, dict(new))
        self.assertEqual(again["search_pool_legacy"], out["search_pool_legacy"])


# ---------------------------------------------------------------- build_guidebook
class GuidebookV24(unittest.TestCase):
    def test_ground_check_legacy_pool_warns_not_exits(self):
        import build_guidebook as B
        search = {"x": {"u": "X", "rep": [{"n": "알파전형", "f": ""}]}}
        slugs = [("x", "X")]
        meta = {"x": {"tracks": [{"track": "베타전형", "form": "서류확인형"}], "spec_tracks": []}}
        with self.assertRaises(SystemExit):
            B.ground_check(meta, search=search, slugs=slugs)
        meta["x"]["search_pool_legacy"] = ["알파전형"]
        self.assertEqual(B.ground_check(meta, search=search, slugs=slugs), ["x: '알파전형'"])
        meta["x"]["tracks"].append({"track": "알파전형", "form": "서류확인형"})
        self.assertEqual(B.ground_check(meta, search=search, slugs=slugs), [])

    def test_parts_word_and_template_placeholder(self):
        import build_guidebook as B
        self.assertEqual(B._parts_word({"parts": [{}] * 6}), "여섯")
        self.assertEqual(B._parts_word({"parts": [{}] * 5}), "다섯")
        self.assertEqual(B._parts_word({}), "다섯")
        tpl = B.PAGE_TPL.read_text(encoding="utf-8")
        self.assertIn("__PARTS_WORD__ 부로 끝나는 구성", tpl)
        self.assertNotIn("다섯 부로 끝나는 구성", tpl)

    def test_parts_html_sixth_part_has_fixed_sub(self):
        import build_guidebook as B
        mv = {"parts": [{"no": 6, "title": "학과가 하는 일과 그 앞의 배경지식"}]}
        html = B._parts_html(mv)
        self.assertIn("학과가 다루는 문제와 면접 전에 연결해 둘 배경지식", html)
        self.assertNotIn('<p class="d"></p>', html)

    def test_facts_part_count_word(self):
        import build_guidebook as B
        e = {"types": ["a"]}
        mv = {"years": [2020, 2026], "forms": [], "tracks": [], "questions": 1, "rules": 1, "pages": 97, "parts": [{}] * 6}
        rows = dict(B._facts(e, mv, {}, 33000, False, None))
        self.assertEqual(rows["분량"], "97면, 여섯 부")
        mv["parts"] = [{}] * 5
        self.assertEqual(dict(B._facts(e, mv, {}, 33000, False, None))["분량"], "97면, 다섯 부")

    def test_extract_v24_gachon_real(self):
        _need(V24_HTML_GACHON, V24_MANIFEST_GACHON)
        import build_guidebook as B
        e = B.extract_v24("가천대학교")
        self.assertEqual((e["pages"], e["questions"], e["rules"], e["types_n"]), (35, 142, 53, 14))
        self.assertEqual(len(e["types"]), 14)
        self.assertEqual(e["types"][0], "지원동기,대학이해")
        self.assertFalse(any("선배 후기" in t for t in e["types"]))
        self.assertEqual(len(e["samples"]), 4)
        self.assertEqual(e["samples"][0]["type"], "지원동기,대학이해")
        self.assertTrue(e["samples"][0]["q"].startswith("학교에서 많은 활동들을 했는데"))
        self.assertFalse(any("<" in s["q"] or "간호학과 2022" in s["q"] for s in e["samples"]))
        self.assertEqual(e["file"], "가천대학교_2027면접가이드북.pdf")


if __name__ == "__main__":
    unittest.main()
