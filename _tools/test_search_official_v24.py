#!/usr/bin/env python3
"""SEARCH 표 2층 검증 (GB-V24-6 (d), 2026-09-07 Codex 협의).
1층 공식 실재: 전형명이 2027 학종 감사 원장(fixtures/admissions_ledger_2027_a58b7d76.json, conducted) 또는
   search_official_extra.json(status conducted, 요강 근거) 에 있어야 빌드 통과. blocked/absent/not_conducted/pending/미분류 = 정지.
2층 상품 수록범위: 책 1부·2부(meta v3 tracks = v24 qualifying)에 있는 전형만 상품 title/description/keywords/FAQ 에 쓴다.
   hub 는 검증된 전 전형을 싣되 수록 여부 표식을 단다. 상세면은 수록 범위 고지 문장을 낸다.
실행: ~/venvs/pdfbuild/bin/python -m unittest _tools/test_search_official_v24.py -v
"""
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_guidebook as B  # noqa: E402


def T(n, f, **kw):
    d = {"n": n, "f": f}
    d.update(kw)
    return d


class Norm(unittest.TestCase):
    def test_roman_numerals_map_to_digits_and_stay_distinct(self):
        self.assertEqual(B._norm("광운참빛인재전형Ⅰ-면접형"), B._norm("광운참빛인재전형 I(면접형)"))
        self.assertNotEqual(B._norm("학생부종합전형Ⅰ(면접형)"), B._norm("학생부종합전형Ⅱ(면접형)"))
        self.assertEqual(B._norm("기회균형전형Ⅱ"), B._norm("기회균형전형 II"))

    def test_norm_t_ignores_jeonhyeong_suffix_only(self):
        self.assertEqual(B._norm_t("SSU미래인재(면접형)"), B._norm_t("SSU미래인재전형(면접형)"))
        self.assertNotEqual(B._norm_t("탐구형인재"), B._norm_t("CAU탐구형인재"))

    def test_roman_one_is_not_prefix_of_two(self):
        # '학생부종합전형Ⅰ' 이 '학생부종합전형Ⅱ(면접형)' 안에 부분일치로 걸리면 안 된다
        self.assertFalse(B._track_match("학생부종합전형Ⅰ", "학생부종합전형Ⅱ(면접형)"))
        self.assertTrue(B._track_match("학생부종합전형Ⅰ(면접형)", "학생부종합전형Ⅰ(면접형)"))
        self.assertTrue(B._track_match("의예과", "학생부종합전형(의예과)"))
        self.assertTrue(B._track_match("잠재역량전형", "잠재역량전형-간호학과"))


class Ledger(unittest.TestCase):
    def test_ledger_loads_and_is_pinned(self):
        L = B.load_ledger()
        self.assertEqual(len(L), 38)
        self.assertIn("가천대학교", L)
        self.assertEqual(L["가천대학교"]["tracks"][0]["name"], "가천바람개비전형")

    def test_ledger_sha_mismatch_stops(self):
        with self.assertRaises(SystemExit):
            B.load_ledger(HERE / "search_official_extra.json")

    def test_extra_loads_and_validates(self):
        X = B.load_extra()
        self.assertTrue(any(e["slug"] == "gachon" and e["name"] == "가천의약학" and e["status"] == "conducted" for e in X))
        for e in X:
            self.assertIn(e["status"], {"conducted", "not_conducted", "absent", "pending", "blocked"})
            if e["status"] == "conducted":
                self.assertTrue(e.get("form_evidence"))
                self.assertTrue(e.get("quote") or e.get("source", "").startswith("ledger:"))


class OfficialCheck(unittest.TestCase):
    def test_every_search_entry_passes(self):
        v = B.official_check()
        self.assertEqual(len(v), sum(len(B._entries(s)) for s in B.SEARCH.values()))
        self.assertEqual(v[("gachon", "가천바람개비")]["source"], "ledger")
        self.assertEqual(v[("gachon", "가천의약학")]["source"], "extra")

    def test_unknown_name_stops(self):
        search = {"gachon": {"u": "가천대", "rep": [T("없는전형", "서류기반 면접")]}}
        with self.assertRaises(SystemExit):
            B.official_check(search=search, slugs=[("gachon", "가천대학교")])

    def test_not_conducted_ledger_track_stops(self):
        search = {"catholic": {"u": "가톨릭대", "rep": [T("잠재능력우수자(서류)전형", "서류기반 면접")]}}
        with self.assertRaises(SystemExit):
            B.official_check(search=search, slugs=[("catholic", "가톨릭대학교")])

    def test_blocked_campus_stops(self):
        search = {"dankook": {"u": "단국대", "rep": [T("DKU인재(면접형)", "서류기반 면접"), T("SW인재", "서류기반 면접")]}}
        with self.assertRaises(SystemExit):
            B.official_check(search=search, slugs=[("dankook", "단국대학교(죽전)")])

    def test_absent_and_pending_and_no_interview_stop(self):
        for slug, univ, name in (("incheon", "인천대학교", "INU교과전형"), ("ulsan", "울산대학교", "학생부교과 면접"), ("donga", "동아대학교", "학교생활우수자")):
            search = {slug: {"u": "x", "rep": [T(name, "면접")]}}
            with self.assertRaises(SystemExit):
                B.official_check(search=search, slugs=[(slug, univ)])

    def test_roman_confusion_stops(self):
        search = {"uos": {"u": "서울시립대", "rep": [T("학생부종합전형Ⅱ(면접형)", "서류기반 면접")]}}
        with self.assertRaises(SystemExit):
            B.official_check(search=search, slugs=[("uos", "서울시립대학교")])

    def test_ulsan_general_unit_is_not_claimed(self):
        # 2027 잠재역량전형 면접은 아산아너스 자율전공·간호·의예과뿐. rep 에 모집단위가 붙어 있어야 한다
        rep = B.SEARCH["ulsan"]["rep"][0]
        self.assertEqual(rep["n"], "잠재역량전형")
        self.assertEqual(rep.get("u"), ["아산아너스칼리지 자율전공학부", "간호학과"])
        self.assertIn("아산아너스칼리지 자율전공학부", B._disp(rep))

    def test_removed_names_are_gone(self):
        names = {(slug, x["n"]) for slug, s in B.SEARCH.items() for _, x in B._entries(s)}
        for gone in (("donga", "학교생활우수자"), ("incheon", "INU교과전형"), ("dankook", "SW인재"), ("ulsan", "학생부교과 면접"),
                     ("cau", "CAU탐구형인재"), ("kwangwoon", "광운참빛인재전형 I(면접형)"), ("ulsan", "학생부종합(면접형)")):
            self.assertNotIn(gone, names)
        for kept in (("cau", "탐구형인재전형"), ("kwangwoon", "광운참빛인재전형Ⅰ(면접형)"), ("soongsil", "SSU미래인재전형(면접형)"), ("uos", "기회균형전형Ⅰ"), ("gachon", "가천의약학"), ("snu", "일반전형")):
            self.assertIn(kept, names)


class Coverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.meta = B.load_meta()

    def test_coverage_gachon(self):
        cov = B.coverage(self.meta["gachon"], B.SEARCH["gachon"])
        self.assertEqual(cov, {"가천바람개비": True, "가천의약학": False})

    def test_coverage_renamed_names_hit_book_pool(self):
        for slug, n in (("cau", "탐구형인재전형"), ("kwangwoon", "광운참빛인재전형Ⅰ(면접형)"), ("soongsil", "SSU미래인재전형(면접형)"), ("ulsan", "잠재역량전형")):
            self.assertTrue(B.coverage(self.meta[slug], B.SEARCH[slug])[n], (slug, n))

    def test_nonsale_gets_no_hub_marker(self):
        # 비판매·스튜디오 대학은 meta 에 08-28 판 tracks 가 남아 있어도 "책 수록" 표식을 달지 않는다
        import build_interview_hub as H
        self.assertEqual(H.cov_mark("yonsei", "활동우수형", self.meta, False), "")
        self.assertIn("책 수록", H.cov_mark("gachon", "가천바람개비", self.meta, True))
        self.assertIn("미수록", H.cov_mark("gachon", "가천의약학", self.meta, True))

    def test_covered_search_filters_roles(self):
        s2 = B.covered_search(B.SEARCH["gachon"], B.coverage(self.meta["gachon"], B.SEARCH["gachon"]))
        self.assertNotIn("med", s2)
        self.assertEqual([x["n"] for x in s2["rep"]], ["가천바람개비"])
        s3 = B.covered_search(B.SEARCH["catholic"], B.coverage(self.meta["catholic"], B.SEARCH["catholic"]))
        self.assertEqual([x["n"] for x in s3["rep"]], ["잠재능력우수자면접전형"])
        self.assertNotIn("med", s3)

    def test_covered_search_keeps_covered_med(self):
        s2 = B.covered_search(B.SEARCH["ajou"], B.coverage(self.meta["ajou"], B.SEARCH["ajou"]))
        self.assertIn("med", s2)


class ProductCopy(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.meta = B.load_meta()
        cls.cat = json.load(open(B.CATALOG, encoding="utf-8"))
        cls.items = {e["slug"]: e for e in cls.cat["items"]}

    def _seo(self, slug):
        return B.seo_texts(self.items[slug], self.meta[slug], self.cat)

    def test_gachon_product_copy_uses_book_tracks_only(self):
        t = self._seo("gachon")
        for s in (t["title"], t["description"], t["answer"]):
            self.assertNotIn("가천의약학", s)
            self.assertNotIn("한 권에", s)
        self.assertIn("가천바람개비", t["title"])

    def test_catholic_and_snu_drop_uncovered(self):
        self.assertNotIn("학교장추천", self._seo("catholic")["title"])
        self.assertNotIn("일반전형", self._seo("snu")["title"])

    def test_ajou_keeps_covered_med(self):
        self.assertIn("ACE전형 의학과", self._seo("ajou")["title"])

    def test_ulsan_title_names_units(self):
        self.assertIn("잠재역량전형(아산아너스칼리지 자율전공학부, 간호학과)", self._seo("ulsan")["title"])

    def test_keywords_covered_only(self):
        kws = B.kw_of(self.items["gachon"], self.meta["gachon"])
        self.assertNotIn("가천대 가천의약학 면접", kws)
        self.assertIn("가천대 가천바람개비 면접", kws)

    def test_scope_note_discloses_uncovered_official_tracks(self):
        n = B.scope_note(self.items["gachon"], self.meta["gachon"])
        self.assertIn("가천바람개비전형", n)
        self.assertIn("가천의약학", n)
        self.assertIn("3부", n)
        n2 = B.scope_note(self.items["khu"], self.meta["khu"])
        self.assertIn("네오르네상스전형", n2)

    def test_faq_first_answer_covered_only(self):
        e = self.items["gachon"]
        faq = B.faq_of(e, self.meta["gachon"], 33000, True, 0)
        self.assertNotIn("가천의약학", faq[0]["a"])


if __name__ == "__main__":
    unittest.main()
