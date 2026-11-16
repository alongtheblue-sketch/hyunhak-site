#!/usr/bin/env python3
"""대학별 면접 정보 면 30면 계약 (2026-11-16, 건우 결재 SEO2-1 ②, SEO2-11 ②, SEO2-12 ②).
실행: python3 -m unittest _tools/test_interview_info.py -v   (저장소 루트에서)
원천(요강 사실 파일, v24 판매 정본 HTML)은 저장소 밖에 있다. 그 원천과 대조하는 시험은 파일이 디스크에 있을 때만 돈다
(없으면 skip 으로 표시하고 통과로 세지 않는다). 나머지는 저장소 안 묶음(_tools/fixtures/interview_info_2027.json)만 읽는다.
"""
import copy
import datetime
import hashlib
import html as _html
import json
import re
import shutil
import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

BUNDLE = HERE / "fixtures" / "interview_info_2027.json"
CATALOG = HERE / "guidebook_catalog.json"
FACTS_DIR = Path.home() / "unjang/_shared/ops/20261116_SEO_GEO_AEO_재부양/s2_facts"
WD = "월화수목금토일"
BANNED = ("·", "—", "–", "∙", "‧", "・", "•", "→", "십시오")


def _onsale():
    cat = json.loads(CATALOG.read_text(encoding="utf-8"))
    return {e["slug"]: e for e in cat["items"] if e.get("onsale")}


def _is_sample(q, samples):
    for s in samples:
        if q == s or (s.endswith("…") and q.startswith(s[:-1].rstrip())):
            return True
    return False


def _visible(html):
    """본문 글자. script, style, head 를 걷고 태그를 지운다."""
    body = html.split("</head>", 1)[-1]
    body = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", body)
    body = re.sub(r"<[^>]+>", " ", body)
    body = body.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#x27;", "'")
    return re.sub(r"\s+", " ", body)


def _section(html, sid):
    m = re.search(r'<section[^>]*id="%s"[^>]*>(.*?)</section>' % re.escape(sid), html, re.S)
    return m.group(1) if m else ""


def _facts(slug):
    return json.loads((FACTS_DIR / f"{slug}.json").read_text(encoding="utf-8"))


def _guide_pdf(slug):
    """사실 파일 doc 이 가리키는 요강 PDF 와 pdftotext. 원천이나 도구가 없으면 skip(통과로 세지 않는다). sha 가 사실 파일 값과 다르면 실패."""
    if not FACTS_DIR.is_dir():
        raise unittest.SkipTest(f"사실 파일 부재(검사 불가): {FACTS_DIR}")
    exe = shutil.which("pdftotext")
    if not exe:
        raise unittest.SkipTest("pdftotext 없음(검사 불가)")
    doc = _facts(slug)["doc"]
    p = Path(doc["local_path"])
    if not p.is_file():
        raise unittest.SkipTest(f"요강 PDF 부재(검사 불가): {p}")
    if hashlib.sha256(p.read_bytes()).hexdigest() != doc["sha256_actual"]:
        raise AssertionError(f"{slug}: 요강 PDF sha 가 사실 파일 값과 다르다 {p}")
    return exe, p


_PDF = {}


def _pdf_page(slug, page):
    """요강 PDF 한 쪽 글(pdftotext -layout, 연속 공백은 한 칸)."""
    if (slug, page) not in _PDF:
        exe, p = _guide_pdf(slug)
        out = subprocess.run([exe, "-q", "-layout", "-f", str(page), "-l", str(page), str(p), "-"],
                             capture_output=True, text=True, check=True).stdout
        _PDF[(slug, page)] = re.sub(r"\s+", " ", out)
    return _PDF[(slug, page)]


_PDF_RAW = {}


def _pdf_page_reading(slug, page):
    """요강 PDF 한 쪽의 읽기 순서 글(pdftotext 기본 모드, -layout 없음). 표의 칸은 칸마다 따로 나온다."""
    if (slug, page) not in _PDF_RAW:
        exe, p = _guide_pdf(slug)
        _PDF_RAW[(slug, page)] = subprocess.run([exe, "-q", "-f", str(page), "-l", str(page), str(p), "-"],
                                                capture_output=True, text=True, check=True).stdout
    return _PDF_RAW[(slug, page)]


def _pdf_words(slug, page):
    """요강 PDF 한 쪽의 낱말 [(x, y, 글)] (pdftotext -bbox)."""
    exe, p = _guide_pdf(slug)
    out = subprocess.run([exe, "-q", "-bbox", "-f", str(page), "-l", str(page), str(p), "-"],
                         capture_output=True, text=True, check=True).stdout
    return [(float(x), float(y), _html.unescape(w)) for x, y, w in
            re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">(.*?)</word>', out)]


# ---------------------------------------------------------------- 컴파일러 순수 함수
class CompilerUnits(unittest.TestCase):
    def setUp(self):
        import compile_interview_info as K
        self.K = K

    def test_weekday_ko(self):
        self.assertEqual(self.K.weekday_ko("2026-11-28"), "토")
        self.assertEqual(self.K.weekday_ko("2026-12-14"), "월")

    def test_src_wd_reads_mark_for_that_day(self):
        K = self.K
        self.assertEqual(K.src_wd("2026-11-22", ["면접전형 공과대학, 첨단ICT융합대학 2026.11.22.(일)"]), "일")
        self.assertEqual(K.src_wd("2026-12-06", ["2026. 12. 5.(토) ~ 6.(일)"]), "일")
        self.assertEqual(K.src_wd("2026-12-11", ["12월 11일(금) 인문계열 모집단위"]), "금")
        self.assertEqual(K.src_wd("2026-12-05", ["2026. 12. 5(토) 서울캠퍼스 09:00"]), "토")
        with self.assertRaises(ValueError):
            K.src_wd("2026-12-07", ["2026. 12. 5.(토) ~ 6.(일)"])   # 그 날짜 표기가 없다

    def test_compile_day_stops_on_weekday_mismatch(self):
        K = self.K
        self.assertEqual(K.day("2026-11-28", ["2026. 11. 28.(토)"]), {"iso": "2026-11-28", "wd": "토"})
        with self.assertRaises(ValueError):
            K.day("2026-11-28", ["2026. 11. 28.(일)"])   # 요강 표기와 달력이 다르면 멈춘다

    def test_grade_thirds_and_ties(self):
        g = self.K.grade_types([("A", 30), ("B", 28), ("C", 19), ("D", 19), ("E", 5), ("F", 3)])
        self.assertEqual([x["name"] for x in g], ["A", "B", "C", "D", "E", "F"])
        self.assertEqual([x["grade"] for x in g], ["자주 나옴", "자주 나옴", "보통", "보통", "가끔 나옴", "가끔 나옴"])
        # 같은 수는 같은 등급, 순서는 원래 순서(동률 안정)
        g = self.K.grade_types([("x", 15), ("y", 15), ("z", 15), ("w", 2)])
        self.assertEqual({x["grade"] for x in g if x["name"] in "xyz"}, {"자주 나옴"})
        self.assertEqual([x["name"] for x in g], ["x", "y", "z", "w"])
        self.assertTrue(all(x["grade"] in self.K.GRADES for x in g))
        self.assertFalse(any(k for x in g for k in x if k not in ("name", "grade")))   # 수치 칸을 싣지 않는다

    def test_pick_four_skips_sample_types_and_fills_short_books(self):
        K = self.K
        groups = [("가유형", ["가유형 첫 질문은 어떤 내용이었나요?", "가유형 두번째 질문은 어떤 내용이었나요?", "가유형 세번째 질문은 어떤 내용이었나요?"], True),
                  ("나유형", ["나유형 첫 질문은 어떤 내용이었나요?", "나유형 두번째 질문은 어떤 내용이었나요?", "나유형 세번째 질문은 어떤 내용이었나요?"], True),
                  ("다유형", ["다유형 첫 질문은 어떤 내용이었나요?"], True)]
        samples = ["가유형 첫 질문은 어떤 내용이었나요?", "나유형 첫 질문은 어떤 내용이었나요?", "다유형 첫 질문은 어떤…"]
        out = K.pick_questions(groups, samples, set())
        self.assertEqual(len(out), 4)
        qs = [x["q"] for x in out]
        self.assertFalse(any(_is_sample(q, samples) for q in qs))
        self.assertEqual(len(set(qs)), 4)
        self.assertEqual(out, K.pick_questions(groups, samples, set()))   # 결정적

    def test_pick_prefers_unused_types_by_weight(self):
        K = self.K
        groups = [("s1", ["샘플 질문 하나는 무엇이었나요?", "s1 다른 질문은 무엇이었나요?"], True),
                  ("u1", ["u1 질문 첫번째는 무엇이었을까요?"], True),
                  ("u2", ["u2 질문 첫번째는 무엇이었나요?", "u2 질문 두번째는 무엇이었나요?", "u2 질문 세번째는 무엇이었나요?"], True),
                  ("u3", ["u3 질문 첫번째는 무엇이었나요?", "u3 질문 두번째는 무엇이었나요?"], True),
                  ("u4", ["u4 질문 첫번째는 무엇이었나요?"], True),
                  ("u5", ["u5 질문 첫번째는 무엇이었나요?"], True)]
        out = K.pick_questions(groups, ["샘플 질문 하나는 무엇이었나요?"], set())
        self.assertEqual([x["type"] for x in out], ["u2", "u3", "u1", "u4"])

    def test_eligible_rejects_fragments(self):
        K = self.K
        self.assertTrue(K.eligible("독서활동이 우수한데 읽은 책 중 가장 기억에 남는 책은?"))
        for bad in ("(꼬리) 원리를 설명해보세요", "○○교과에서 실험을 진행했는데 설명해 주세요.", "학년 때 진행한 프로젝트에서 무엇을 했는지 말해주세요",
                    "가장 큰 비중은 30%인가요 아니면 다른가요?", "네 그러면 그걸 심화시키기 위해서는요?", "짧은 질문?",
                    "미래과학 스피치대회 발표내용 4. 중환자실 간호사에게 필요한 자질?"):
            self.assertFalse(K.eligible(bad), bad)

    def test_register_filters(self):
        K = self.K
        self.assertFalse(K.eligible("지원자의 장점은 무엇이라고 생각하는가?"))         # 해라체 문항은 합쇼체 지면과 섞인다
        self.assertFalse(K.eligible("5G가 좋은 평가를 못 듣는 것 같다. 이유는 무엇인가요?"))
        self.assertTrue(K.eligible("동아리 활동 중 가장 기억에 남는 일을 설명해 주시겠습니까?"))
        self.assertIsNone(K.clean_quote("지원자 1명을 대상으로 하여 복수의 면접위원이 실시함(10분 내외)"))   # 개조식 종결 인용
        self.assertIsNone(K.clean_quote("면접평가 위원 구성 | 2인 1조 | 10분 내외"))                      # 표 칸 이어 붙인 인용
        self.assertEqual(K.clean_quote("•면접관 2인과 개별(블라인드)면접, 면접 10분 내외"), "면접관 2인과 개별(블라인드)면접, 면접 10분 내외")
        self.assertEqual(K.clean_title("2027학년도 수시모집요강 (가천대학교, 쪽 머리글 표기)"), "2027학년도 수시모집요강")

    def test_clean_scope_strips_working_notes(self):
        K = self.K
        self.assertEqual(K.clean_scope("전형 전체 모집단위(오전 08:30 또는 오후 14:00 입실, 모집단위별 오전/오후 배정은 official_notices 참조)"),
                         "전형 전체 모집단위")
        self.assertEqual(K.clean_scope("전체(인문계, 자연계). 모집단위별 일자는 요강에 없고 official_notices 참조"), "전체(인문계, 자연계)")
        self.assertEqual(K.clean_scope("12월 11일(금) 인문계열 모집단위"), "인문계열 모집단위")
        self.assertEqual(K.clean_scope("자연과학대학(통계학과, 화학·나노과학과)"), "자연과학대학(통계학과, 화학, 나노과학과)")
        self.assertEqual(K.clean_scope("서울캠퍼스 오전 <인문계열>: 문과대학(국어국문학과) (시각은 표의 시간대 칸이며 개인별 시작 시각 아님, 면접은 지원 모집단위가 속한 캠퍼스에서 진행)"),
                         "서울캠퍼스 오전 인문계열: 문과대학(국어국문학과)")
        for s in ("의과대학 의예과 (15쪽 '모집단위별 면접고사 일정' 표에서도 2026.11.22.(일) 의과대학 의예과)",
                  "인문계열 (물리 p.32 모집인원 표의 계열 '인문': 국어국문학과, 사학과)"):
            self.assertIsNone(K.META.search(K.clean_scope(s)), K.clean_scope(s))

    def test_eligible_rejects_transcript_fragments(self):
        """검토 지적(2026-11-16): 앞 문답에 기대는 머리말, 숫자 빠진 머리, 화자 표지, 끝이 잘린 꼴, 두 문항이 붙은 전사 조각."""
        K = self.K
        for bad in ("왜 수학 성적이 상대적으로 낮다고 생각?", "년간 반장, 부반장을 했는데 공공인재학부에 어떤 도움이 될까?",
                    "오 자신이 있군요. 그럼 어떤 부분이 특히 자신 있나요?",
                    "마지막으로 하나만 질문하고 마칠께요. 1학년 때 과학송 불렀네요. 무슨 내용인가요?",
                    "L : 경영학에 관해 읽은 책 중 가장 기억에 남는 책은?", "축구 관련 문제를 학급회의로 해결한 경험 밝힘마지막 하고 싶은 말?",
                    "봉사할동을 많이 했는데 어떤 봉사활동?", "봉사 시간이 많은데, 기억에 남는 봉사 활동?",
                    "식품영양학과에서 가장 중요한 과목이 뭐라고 생각하는지.", "한 번 듣고 싶네요. 불러줄 수 있어요?",
                    "<질문> AI가 기업경영에 활용될 수 있는 사례를 하나만 제시하세요"):
            self.assertFalse(K.eligible(bad), bad)
        for good in ("독서활동이 우수한데 읽은 책 중 가장 기억에 남는 책은?", "지금까지 했던 봉사활동 중 가장 기억에 남는 봉사활동이 있다면?",
                     "학교생활에서 리더쉽을 발휘한 사례가 있었나요?", "마사 누스바움의 책 중 가장 인상 깊은 책과 그 이유를 말해주세요."):
            self.assertTrue(K.eligible(good), good)

    def test_pick_skips_non_review_groups(self):
        """군 제목에 '선배 후기 확인' 꼬리표가 없는 군(대학 공식 예시 문항)은 대표 기출로 뽑지 않는다."""
        K = self.K
        groups = [("s1", ["샘플 질문 하나는 무엇이었나요?"], True),
                  ("공식 예시", ["공식 예시 질문 첫번째는 무엇이었나요?", "공식 예시 질문 두번째는 무엇이었나요?",
                             "공식 예시 질문 세번째는 무엇이었나요?", "공식 예시 질문 네번째는 무엇이었나요?"], False),
                  ("u1", ["u1 질문 첫번째는 무엇이었나요?", "u1 질문 두번째는 무엇이었나요?"], True),
                  ("u2", ["u2 질문 첫번째는 무엇이었나요?", "u2 질문 두번째는 무엇이었나요?"], True)]
        out = K.pick_questions(groups, ["샘플 질문 하나는 무엇이었나요?"], set())
        self.assertEqual(len(out), 4)
        self.assertNotIn("공식 예시", [x["type"] for x in out])

    def test_type_name_and_unit_names(self):
        K = self.K
        self.assertEqual(K.type_name("식품영양학과,학과 미기재"), "식품영양학과 외")
        self.assertEqual(K.type_name("탐구,세특심화"), "탐구,세특심화")
        for unit in ("사이버보안학과,SW인재", "글로벌융합대학 (유아교육과 제외)", "국어국문학과,국어국문학전공", "문예창작과", "과학기술대학"):
            self.assertTrue(K.is_unit_name(unit), unit)
        for typ in ("전공지식확인", "지원동기,대학이해", "탐구,세특,전공지식", "보완,확장,상황 질문", "전공 국가,지역 지식", "기타", "마무리"):
            self.assertFalse(K.is_unit_name(typ), typ)

    def test_quota_scope_excluded_part(self):
        """전형 이름이 'OO 제외' 인데 인원 근거가 그 OO 를 포함한 전형 전체 값이면 이 줄의 값이 아니다(인하대 939명)."""
        K = self.K
        inha = {"value": 939, "basis": "합계 줄의 인하미래인재 면접형 열. 전형 전체 인원이며 의예과 16명을 포함한다. 의예과 제외 부분만의 합계 줄은 요강에 없다."}
        self.assertIsNone(K.quota_value("인하미래인재(면접형)-의예과 제외", inha))
        self.assertEqual(K.quota_value("인하미래인재(면접형)-의예과", {"value": 16, "basis": "의예과 행"}), 16)
        self.assertEqual(K.quota_value("융합형인재전형-의학부", {"value": 7, "basis": "전형 총계 378 은 면접이 없는 의학부 외 모집단위를 포함"}), 7)
        self.assertEqual(K.quota_value("학생부종합전형(일반 모집단위)", {"value": 778, "basis": "의예과 칸이 비어 있어 778 은 의예과를 포함하지 않는다"}), 778)
        self.assertIsNone(K.quota_value("x", None))

    def test_minutes_note_reads_facts_when_ledger_null(self):
        """원장 면접 시간이 null 이면(범위 값이라 정수로 못 적은 경우 포함) 사실 파일 interview_format 의 시간 표기를 본다."""
        K = self.K
        self.assertEqual(K.minutes_note(None, "평가항목은 기초학업역량이고 평가시간은 8~10분 내외다."), ("8~10분 내외", False))
        self.assertEqual(K.minutes_note(None, "공동 출제 문항은 면접 15분 내외. 간호대학 30분 내외, 의과대학 60분 내외."), (None, True))
        self.assertEqual(K.minutes_note(None, "면접 시간과 평가자 수는 요강에 적혀 있지 않다."), (None, False))
        self.assertEqual(K.minutes_note(10, "평가시간은 8~10분 내외다."), (None, False))   # 원장 값이 있으면 원장만 쓴다

    def _pusan_med(self):
        return {"name": "학생부종합전형(의예과)", "quota": None,
                "interview_format": {"text": "의예과는 준비실에서 공통문제 답변 준비 10분, 고사실A에서 공통문제 답변 면접 10분, 고사실B에서 학생부 기반 면접 10분 순서다."},
                "null_reasons": {"quota": "의예과의 학생부종합 칸은 비어 있고 지역인재Ⅰ 칸이 30이다. 의예과는 그 밖에 지역의사선발전형 합계 31(p.39)로 모집한다.",
                                 "dates_basis": "의예과 면접 대상 전형(지역인재전형Ⅰ, 지역의사선발전형)의 전형일정"}}

    def test_track_fix_requires_facts_wording(self):
        """원장 전형명이 요강 구분과 다른 줄(부산대 의예과)은 사실 파일 근거 문구가 그대로일 때만 요강 이름과 전형별 인원으로 바꾼다."""
        K = self.K
        t = self._pusan_med()
        fx = K.track_fix("pusan", t)
        self.assertEqual(fx["name"], "의예과(지역인재전형Ⅰ, 지역의사선발전형)")
        self.assertEqual([(x["label"], x["value"]) for x in fx["quota_parts"]], [("지역인재전형Ⅰ", 30), ("지역의사선발전형", 31)])
        t2 = copy.deepcopy(t)
        t2["null_reasons"]["quota"] = "지역인재Ⅰ 칸이 32이다"
        with self.assertRaises(ValueError):
            K.track_fix("pusan", t2)
        self.assertIsNone(K.track_fix("ajou", {"name": "ACE전형-의학과", "quota": {"value": 17}}))

    def test_track_fix_values_carry_page_and_quote(self):
        """결정 2, 3(2026-11-16 추가 명세): 보정 값(전형명, 전형별 인원, 면접 시간)마다 요강 쪽 번호와 인용이 붙는다."""
        fx = self.K.track_fix("pusan", self._pusan_med())
        evs = fx["name_evidence"] + fx["time_evidence"] + [e for x in fx["quota_parts"] for e in x["evidence"]]
        self.assertTrue(fx["name_evidence"] and fx["time_evidence"])
        for x in fx["quota_parts"]:
            self.assertTrue(x["evidence"], x["label"])
        for e in evs:
            self.assertEqual(set(e), {"page", "quote"})
            self.assertIsInstance(e["page"], int)
            self.assertGreaterEqual(len(e["quote"]), 4)
        self.assertEqual({e["page"] for e in fx["quota_parts"][0]["evidence"]}, {36})
        self.assertEqual({e["page"] for e in fx["quota_parts"][1]["evidence"]}, {39})
        # 원장 면접 시간 20분은 공통문제 답변 면접 10분과 학생부 기반 면접 10분의 합이라 요강에 없는 값이다. 요강 표기 그대로 싣는다
        self.assertNotIn("20분", fx["time_text"])
        self.assertEqual(re.findall(r"\d+분", fx["time_text"]), ["10분", "10분", "10분"])

    def test_stage1_none_needs_lump_sum_wording(self):
        """결정 6: 요강이 일괄합산이라고 적은 전형만 1단계 발표 칸을 「1단계 없음(일괄합산)」으로 적는다."""
        K = self.K
        t = {"name": "군위탁전형", "stage1_announce": None,
             "null_reasons": {"stage1_announce": "군위탁전형은 일괄합산 전형이라 1단계 합격자 발표가 없다(p63)"}}
        s = K.stage1_none("seoultech", t)
        self.assertEqual(s["text"], "1단계 없음(일괄합산)")
        self.assertIn(63, {e["page"] for e in s["evidence"]})
        t2 = copy.deepcopy(t)
        t2["null_reasons"]["stage1_announce"] = "요강에 1단계 발표일이 없다"
        with self.assertRaises(ValueError):
            K.stage1_none("seoultech", t2)
        t3 = copy.deepcopy(t)
        t3["stage1_announce"] = {"iso": "2026-11-20"}
        with self.assertRaises(ValueError):
            K.stage1_none("seoultech", t3)
        self.assertIsNone(K.stage1_none("seoultech", {"name": "학교생활우수자전형", "stage1_announce": {"iso": "2026-11-20"}}))

    def test_quote_in_text_reading_order(self):
        """검토 지적 수리(2026-11-16): 요강 문구는 요강 쪽 읽기 순서 글에 이어진 글일 때만 싣는다.
        표의 다른 칸을 이은 인용(부산대 67쪽 평가기준 칸 「논리적 의사표현능력」과 소요시간 칸)은 읽기 순서 글에서 끊긴다."""
        K = self.K
        page = "평가기준 소요시간\n논리적 의사표현능력\n공통문제 답변\n준비 10분 내외, 면접 10분 내외\n학생부 기반 면접 10분 내외"
        self.assertFalse(K.quote_in_text("논리적 의사표현능력 준비 10분 내외, 면접 10분 내외", page))
        self.assertTrue(K.quote_in_text("공통문제 답변 준비 10분 내외, 면접 10분 내외", page))   # 한 칸 안의 줄바꿈은 잇는다
        self.assertTrue(K.quote_in_text("교직적성, 인성면접", "사범대학은 교직적성·인성면접 포함"))   # san 의 쉼표 바꿈은 같은 글
        self.assertFalse(K.quote_in_text("", page))

    def test_clean_ratio_drops_quota_segments(self):
        K = self.K
        self.assertEqual(K.clean_ratio("모집 244명; 1단계 서류 100%(3배수), 2단계 1단계 70%+면접 30%"),
                         "1단계 서류 100%(3배수), 2단계 1단계 70%+면접 30%")
        self.assertEqual(K.clean_ratio("추천 인원 대상 모집; 서류 70%+면접 30% 일괄합산, 지원자 전원 면접"),
                         "서류 70%+면접 30% 일괄합산, 지원자 전원 면접")
        self.assertNotIn("·", K.clean_ratio("공식 일반전형 총괄 1,529명; 1단계 서류평가 100%, 2단계 1단계 성적+면접·구술(모집단위별 상이)"))


# ---------------------------------------------------------------- 묶음 (저장소 안)
class BundleContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = json.loads(BUNDLE.read_text(encoding="utf-8"))
        cls.u = {x["slug"]: x for x in cls.b["univs"]}

    def test_thirty_onsale(self):
        self.assertEqual(set(self.u), set(_onsale()))
        self.assertEqual(len(self.b["univs"]), 30)

    def test_four_questions_no_sample_overlap(self):
        sale = _onsale()
        seen = set()
        for slug, u in self.u.items():
            qs = [x["q"] for x in u["questions"]]
            self.assertEqual(len(qs), 4, slug)
            self.assertEqual(len(set(qs)), 4, slug)
            samples = [s["q"] for s in sale[slug]["samples"]]
            hit = [q for q in qs if _is_sample(q, samples)]
            self.assertEqual(hit, [], f"{slug}: 맛보기와 같은 문항 {hit}")
            self.assertFalse(seen & set(qs), f"{slug}: 다른 대학 면과 같은 문항")
            seen |= set(qs)

    def test_no_counts_stored(self):
        raw = BUNDLE.read_text(encoding="utf-8")
        for k in ('"count"', '"n"', '"pct"', '"percent"', '"questions_n"'):
            self.assertNotIn(k, raw)
        for u in self.b["univs"]:
            for t in u["types"]:
                self.assertIn(t["grade"], ("자주 나옴", "보통", "가끔 나옴"))
                self.assertEqual(set(t), {"name", "grade"})

    def test_review_feedback_20261116(self):
        """검토 지적 수리 단언: 인하대 의예과 제외 인원, 공식 예시 군, 분류 표지, 모집단위 묶음 대학, 부산대 의예과 줄 이름."""
        inha = {t["name"]: t for t in self.u["inha"]["tracks"]}
        self.assertIsNone(inha["인하미래인재(면접형)-의예과 제외"]["quota"])
        self.assertEqual(inha["인하미래인재(면접형)-의예과 제외"]["minutes_text"], "8~10분 내외")
        raw = BUNDLE.read_text(encoding="utf-8")
        self.assertNotIn("학과 미기재", raw)
        for slug, u in self.u.items():
            self.assertFalse([t["name"] for t in u["types"] if "공식" in t["name"] or "예시" in t["name"]], slug)
            self.assertFalse([q["type"] for q in u["questions"] if "공식" in q["type"] or "예시" in q["type"]], slug)
            self.assertEqual(u["group_kind"], "unit" if slug in ("dankook", "dongduk", "duksung") else "type", slug)
        pusan = [t["name"] for t in self.u["pusan"]["tracks"]]
        self.assertNotIn("학생부종합전형(의예과)", pusan)
        med = next(t for t in self.u["pusan"]["tracks"] if t["name"].startswith("의예과"))
        self.assertEqual([(x["label"], x["value"]) for x in med["quota_parts"]], [("지역인재전형Ⅰ", 30), ("지역의사선발전형", 31)])

    def test_weekdays_match_calendar(self):
        n = 0
        for u in self.b["univs"]:
            for t in u["tracks"]:
                days = [d for d in t["interviews"]] + t["stage1"] + t["final"]
                for d in days:
                    for iso_k, wd_k in (("iso", "wd"), ("iso_end", "wd_end")):
                        if d.get(iso_k):
                            n += 1
                            self.assertEqual(WD[datetime.date.fromisoformat(d[iso_k]).weekday()], d[wd_k], (u["slug"], t["name"], d))
        self.assertGreater(n, 150)


# ---------------------------------------------------------------- 생성기 (묶음만 읽는다)
class GeneratorContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import build_interview_info as G
        cls.G = G
        cls.b = G.load_bundle()
        cls.pages = {u["slug"]: G.render(u, cls.b) for u in cls.b["univs"]}
        cls.sale = _onsale()

    def test_thirty_pages(self):
        self.assertEqual(set(self.pages), set(self.sale))

    def test_page_shell_and_slots(self):
        for slug, (html, entry) in self.pages.items():
            self.assertIn('<body class="v2 exam', html)
            for slot in ("<!--v2:shell-->", "<!--v2:footer-->", "<!--v2:fix-->", "<!-- aeo-slot -->"):
                self.assertIn(slot, html, slug)
            self.assertNotIn("application/ld+json", html)   # JSON-LD 는 seo_inject 가 head 에 1개만
            self.assertIsNone(re.search(r"__[A-Z_]+__|\{[a-z_]+\}", html), slug)
            self.assertIn(f'href="../guidebook/{slug}.html"', html)
            self.assertIn('href="../interview.html', html)

    def test_four_questions_on_page_not_samples(self):
        for slug, (html, _) in self.pages.items():
            sec = _section(html, "questions")
            qs = [re.sub(r"<[^>]+>", "", x) for x in re.findall(r'<span class="q">(.*?)</span>', sec, re.S)]
            self.assertEqual(len(qs), 4, slug)
            samples = [s["q"] for s in self.sale[slug]["samples"]]
            vis = _visible(html)
            for s in samples:
                core = s[:-1].rstrip() if s.endswith("…") else s
                self.assertNotIn(core, vis, f"{slug}: 맛보기 문항이 면에 있다")

    def test_no_type_shares(self):
        for slug, (html, _) in self.pages.items():
            sec = re.sub(r"<[^>]+>", " ", _section(html, "types"))
            self.assertIsNone(re.search(r"\d", sec), f"{slug}: 유형 절에 숫자")
            vis = _visible(html)
            self.assertIsNone(re.search(r"\d[\d,]*\s*(문항|문|건)(?![가-힣])", vis), f"{slug}: 문항 수 표기")
            u = next(x for x in self.b["univs"] if x["slug"] == slug)
            allowed = {p for t in u["tracks"] for p in re.findall(r"\d+%", t["ratio"])}
            got = set(re.findall(r"\d+%", vis))
            self.assertTrue(got <= allowed, f"{slug}: 반영 비율 밖 퍼센트 {sorted(got - allowed)}")

    def test_dates_weekday_consistent(self):
        for slug, (html, _) in self.pages.items():
            vis = _visible(html)
            ds = re.findall(r"(\d{4})년 (\d{1,2})월 (\d{1,2})일\(([월화수목금토일])\)", vis)
            self.assertTrue(ds, slug)
            for y, m, d, w in ds:
                self.assertEqual(WD[datetime.date(int(y), int(m), int(d)).weekday()], w, (slug, y, m, d, w))
            # 범위 꼴 끝날짜(월 일만 적는 꼴)도 요일이 맞아야 한다
            for m, d, w in re.findall(r"~(\d{1,2})월 (\d{1,2})일\(([월화수목금토일])\)", vis):
                self.assertEqual(WD[datetime.date(2026, int(m), int(d)).weekday()], w, (slug, m, d, w))

    def test_render_stops_on_bad_weekday(self):
        u = copy.deepcopy(self.b["univs"][0])
        d = u["tracks"][0]["interviews"][0]
        d["wd"] = WD[(WD.index(d["wd"]) + 1) % 7]
        with self.assertRaises(SystemExit):
            self.G.render(u, self.b)

    def test_titles_unique_and_desc_len(self):
        import seo_common as C
        m = C.load_manifest()
        others = {e.get("title") for rel, e in m["pages"].items() if not (rel.startswith("interview/") and rel[10:-5] in self.sale)}
        titles = [e["title"] for _, e in self.pages.values()]
        self.assertEqual(len(set(titles)), 30)
        self.assertFalse(set(titles) & others)
        for slug, (html, e) in self.pages.items():
            self.assertTrue(e["title"].startswith(f"{self.G.short(slug, self.b)} 면접 일정, 방식, 기출 유형 (2027학년도 수시)"), e["title"])
            self.assertTrue(70 <= len(e["description"]) <= 110, (slug, len(e["description"]), e["description"]))
            self.assertTrue(40 <= len(e["answer"]) <= 110, (slug, len(e["answer"]), e["answer"]))
            self.assertEqual(e["type"], "article")
            self.assertEqual(e.get("group"), "interview_info")
            self.assertFalse(any(ch in e["description"] + e["answer"] + e["title"] for ch in ("·", "—")))
        descs = [e["description"] for _, e in self.pages.values()]
        self.assertEqual(len(set(descs)), 30)

    def test_null_cells_text(self):
        NULL = "요강에 따로 적혀 있지 않습니다"
        cases = [("ajou", "ACE전형-의학과 제외", "quota"), ("inha", "인하미래인재(면접형)-의예과 제외", "quota"),
                 ("seoultech", "군위탁전형", "quota"), ("gachon", "가천바람개비전형", "final")]
        for slug, track, col in cases:
            sec = _section(self.pages[slug][0], "schedule")
            rows = re.findall(r"<tr[^>]*>(.*?)</tr>", sec, re.S)
            row = next((r for r in rows if f">{track}<" in r), None)
            self.assertIsNotNone(row, (slug, track))
            cell = re.search(r'<td[^>]*data-c="%s"[^>]*>(.*?)</td>' % col, row, re.S)
            self.assertIsNotNone(cell, (slug, track, col))
            self.assertIn(NULL, cell.group(1), (slug, track, col))

    def _faq(self, slug):
        import seo_common as C
        return {x["q"]: x["a"] for x in C.extract_faq(self.pages[slug][0])}

    def test_inha_time_and_quota(self):
        html = self.pages["inha"][0]
        self.assertNotIn("면접 시간은 요강에 따로 적혀 있지 않습니다", html)
        self.assertIn("면접 시간은 8~10분 내외입니다", self._faq("inha")["인하대 면접은 어떤 방식인가요?"])
        self.assertIn("면접 8~10분 내외", _section(html, "format"))
        for slug in ("ewha", "gachon", "hufs", "kyonggi"):   # 사실 파일도 요강에 시간 표기가 없다고 적은 곳
            self.assertIn("면접 시간은 요강에 따로 적혀 있지 않습니다", self._faq(slug)[f"{self.G.short(slug, self.b)} 면접은 어떤 방식인가요?"], slug)

    def test_desc_and_answer_follow_split_schedule(self):
        """1단계 발표가 모집단위로 갈린 첫 전형은 description 에 한 날짜로 적지 않는다. 면접일 사이가 빈 전형은 기간으로 잇지 않는다."""
        for u in self.b["univs"]:
            e = self.pages[u["slug"]][1]
            t0 = u["tracks"][0]
            if len(t0["stage1"]) > 1:
                self.assertNotIn("1단계", e["description"], u["slug"])
        e = self.pages["catholic"][1]
        self.assertNotIn("10월 30일(금)~12월 5일(토)", e["description"] + e["answer"])
        self.assertIn("10월 30일(금), 12월 5일(토)", e["description"])
        self.assertIn("모집단위별로 2026년 10월 30일(금), 12월 5일(토)", e["answer"])
        self.assertNotIn("11월 17일(화)", self.pages["ajou"][1]["description"])

    def test_desc_interview_not_before_stage1(self):
        """description 의 1단계 발표일은 면접 첫날보다 앞서야 한다(가톨릭대 10-30 면접, 11-27 발표 꼴 금지)."""
        for slug, (_, e) in self.pages.items():
            d = e["description"]
            m1 = re.search(r"1단계 (?:합격자 )?발표는 (\d+)월 (\d+)일", d)
            mi = re.search(r"면접은 (?:모집단위별로 )?(\d+)월 (\d+)일", d)
            if m1 and mi:
                self.assertLess((int(m1.group(1)), int(m1.group(2))), (int(mi.group(1)), int(mi.group(2))), (slug, d))

    def test_faq_when_names_every_track(self):
        """FAQPage 만 읽는 쪽도 모든 전형의 면접일을 받는다('위 표' 참조 금지)."""
        for u in self.b["univs"]:
            a = self._faq(u["slug"])[f"{u['short']} 면접은 언제인가요?"]
            self.assertNotIn("위 표", a, u["slug"])
            for t in u["tracks"]:
                self.assertIn(t["name"], a, (u["slug"], t["name"]))
        a = self._faq("snu")["서울대 면접은 언제인가요?"]
        self.assertIn("11월 27일(금)", a)

    def test_gichul_phrase(self):
        for u in self.b["univs"]:
            html, e = self.pages[u["slug"]]
            self.assertIn("기출", e["description"], u["slug"])
            self.assertIn(f"{u['short']} 면접 기출", _visible(html), u["slug"])

    def test_unit_grouped_books_say_so(self):
        """질문 군이 모집단위인 책(단국대, 동덕여대, 덕성여대)은 유형 절을 모집단위 묶음으로 적는다."""
        for u in self.b["univs"]:
            sec = _section(self.pages[u["slug"]][0], "types")
            if u["group_kind"] == "unit":
                self.assertIn("모집단위", sec, u["slug"])
                self.assertNotIn("질문을 유형으로 나눠", sec, u["slug"])
            else:
                self.assertIn("자주 나오는 질문 유형", sec, u["slug"])

    def test_pusan_medical_row(self):
        sec = _section(self.pages["pusan"][0], "schedule")
        self.assertNotIn("학생부종합전형(의예과)", self.pages["pusan"][0])
        row = next(r for r in re.findall(r"<tr[^>]*>(.*?)</tr>", sec, re.S) if "의예과(지역인재전형Ⅰ, 지역의사선발전형)" in r)
        self.assertIn("지역인재전형Ⅰ 30명", row)
        self.assertIn("지역의사선발전형 31명", row)

    def _row(self, slug, track):
        sec = _section(self.pages[slug][0], "schedule")
        return next(r for r in re.findall(r"<tr[^>]*>(.*?)</tr>", sec, re.S) if f">{track}<" in r)

    def _cell(self, row, col):
        m = re.search(r'<td[^>]*data-c="%s"[^>]*>(.*?)</td>' % col, row, re.S)
        return m.group(1) if m else None

    def test_stage1_none_lump_sum_cell_and_faq(self):
        """결정 6(2026-11-16 추가 명세): 요강이 일괄합산이라고 적은 전형의 1단계 발표 칸은 「1단계 없음(일괄합산)」. FAQ 답(FAQPage 원천)에도 같은 글."""
        TXT = "1단계 없음(일괄합산)"
        self.assertEqual(self._cell(self._row("seoultech", "군위탁전형"), "stage1"), TXT)
        a = self._faq("seoultech")["서울과기대 1단계 합격자 발표는 언제인가요?"]
        self.assertIn(f"군위탁전형은 {TXT}", a)
        self.assertIn("학교생활우수자전형 1단계 합격자 발표는 2026년 11월 20일(금)입니다.", a)
        n_none = 0
        for u in self.b["univs"]:
            for t in u["tracks"]:
                if t.get("stage1_none"):
                    n_none += 1
                    self.assertEqual(t["stage1_none"]["text"], TXT)
                    self.assertEqual(t["stage1"], [])
                    self.assertTrue(t["stage1_none"]["evidence"], (u["slug"], t["name"]))
                    self.assertIn(TXT, self._faq(u["slug"])[f"{u['short']} 1단계 합격자 발표는 언제인가요?"])
                else:
                    self.assertTrue(t["stage1"], (u["slug"], t["name"]))   # 일괄합산이 아닌 전형은 1단계 발표일이 있다
        self.assertEqual(n_none, 1)

    def test_source_notice_wording(self):
        """결정 5: 출처 안내 끝맺음을 「다시 확인하시기 바랍니다」로(면 전체 합쇼체 한 단계)."""
        for slug, (html, _) in self.pages.items():
            self.assertIn("면접 시간과 고사장은 대학 입학처 공지로 다시 확인하시기 바랍니다.", _section(html, "source"), slug)
            own = _visible(re.sub(r'(?s)<span class="q">.*?</span>', "", html))   # 기출 원문(span.q) 밖 지면 글
            self.assertNotIn("주세요", own, slug)

    def test_past_interview_dates_kept_without_build_time_words(self):
        """결정 4: 면접일이 지난 대학도 날짜를 그대로 싣고, 빌드 시각에 따라 달라지는 글은 넣지 않는다."""
        past = 0
        for u in self.b["univs"]:
            html, e = self.pages[u["slug"]]
            text = _visible(html) + e["description"] + e["answer"]
            for w in ("종료", "지났", "지남", "마감", "남았", "D-", "예정입니다"):
                self.assertNotIn(w, text, (u["slug"], w))
            for t in u["tracks"]:
                for x in t["interviews"]:
                    if x["iso"] < self.b["checked"]:
                        past += 1
                        self.assertIn(self.G.fmt_item(x), _visible(html), (u["slug"], x["iso"]))
        self.assertGreater(past, 0)

    def test_pusan_medical_time_from_guide_wording(self):
        """결정 3: 면접 시간은 사실 파일 값이나 근거가 붙은 보정 값만. 부산대 의예과는 요강 67쪽 표기(공통문제 답변 준비, 면접, 학생부 기반 면접 각 10분 내외)."""
        sec = _section(self.pages["pusan"][0], "format")
        self.assertNotIn("20분", sec)
        self.assertIn("공통문제 답변 준비 10분 내외, 공통문제 답변 면접 10분 내외, 학생부 기반 면접 10분 내외", sec)

    def test_pusan_medical_no_column_joined_quote(self):
        """검토 지적 수리: 부산대 의예과 묶음에 평가기준 칸과 소요시간 칸을 이은 「요강 문구」를 싣지 않는다. 근거 쪽 번호는 남는다."""
        sec = _section(self.pages["pusan"][0], "format")
        self.assertNotIn("논리적 의사표현능력", sec)
        blk = sec.split("의예과(지역인재전형Ⅰ, 지역의사선발전형)</h3>", 1)[1].split("</dl>", 1)[0]
        self.assertNotIn("요강 문구", blk)
        self.assertIn("요강 PDF 67쪽", blk)

    def test_roman_numeral_particle(self):
        """검토 지적 수리: 로마 숫자로 끝나는 전형명 뒤 조사는 읽는 소리(Ⅰ 일, Ⅱ 이, Ⅲ 삼, Ⅳ 사)의 받침을 따른다."""
        G = self.G
        self.assertEqual(G._eun("덕성인재전형Ⅱ"), "는")
        self.assertEqual(G._iga("덕성인재전형Ⅱ"), "가")
        self.assertEqual(G._eun("지역인재전형Ⅰ"), "은")
        self.assertEqual(G._eun("기회균형전형Ⅲ"), "은")
        self.assertEqual(G._eun("전형Ⅳ"), "는")
        self.assertEqual(G._eun("학생부종합전형Ⅰ(면접형)"), "은")   # 괄호 뒤 글자가 끝 소리
        self.assertIn("덕성인재전형Ⅱ는", self.pages["duksung"][0])
        for slug, (h, _) in self.pages.items():
            vis = _visible(h)
            self.assertEqual(re.findall(r"[ⅡⅣⅤⅨⅫ](?:은|이|을|과)(?![가-힣])", vis), [], slug)
            self.assertEqual(re.findall(r"[ⅠⅢⅥⅦⅧⅩⅪ](?:는|가|를|와)(?![가-힣])", vis), [], slug)

    def test_render_stops_on_sale_defense_breach(self):
        """판매 방어선(SEO2-11 ② 4문, 맛보기 겹침 0, SEO2-12 ② 수치 없음)은 생성기도 빌드마다 막는다(build_all 과 deploy.sh 경로)."""
        sale = _onsale()
        base = next(x for x in self.b["univs"] if x["slug"] == "gachon")
        smp = sale["gachon"]["samples"][0]["q"]
        breaches = []
        u = copy.deepcopy(base); u["questions"].append({"type": "기타", "q": "다섯째 문항은 무엇이었나요?", "src": [0, 0]}); breaches.append(u)
        u = copy.deepcopy(base); u["questions"][0]["q"] = smp; breaches.append(u)
        u = copy.deepcopy(base); u["questions"][0]["q"] = "이 유형에는 문항이 15문 실려 있나요?"; breaches.append(u)
        u = copy.deepcopy(base); u["types"][0]["name"] = "탐구 30"; breaches.append(u)
        for u in breaches:
            with self.assertRaises(SystemExit):
                self.G.render(u, self.b)

    def test_prose_rules(self):
        for slug, (html, e) in self.pages.items():
            body = html.split("<body", 1)[1]
            body = re.sub(r"(?is)<(script|style)\b.*?</\1>", "", body)
            for ch in BANNED:
                self.assertNotIn(ch, body, f"{slug}: 금지 문자 {ch!r}")
            for w in ("나란히", "견주", "견준", "지남", "D-"):
                self.assertNotIn(w, _visible(html), f"{slug}: {w}")

    def test_faq_three_or_four_distinct(self):
        import seo_common as C
        all_a = []
        for slug, (html, _) in self.pages.items():
            faq = C.extract_faq(html)
            self.assertTrue(3 <= len(faq) <= 4, (slug, len(faq)))
            all_a += [x["a"] for x in faq]
        self.assertEqual(len(all_a), len(set(all_a)))   # 문답 글이 대학마다 다르다

    def test_deterministic(self):
        u = self.b["univs"][3]
        self.assertEqual(self.G.render(u, self.b), self.G.render(u, self.b))


# ---------------------------------------------------------------- 원천 대조 (저장소 밖 파일이 있을 때만)
class SourceContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import build_interview_info as G
        cls.b = G.load_bundle()
        cls.pages = {u["slug"]: G.render(u, cls.b)[0] for u in cls.b["univs"]}

    def test_official_notice_values_absent(self):
        if not FACTS_DIR.is_dir():
            raise unittest.SkipTest(f"사실 파일 부재(검사 불가): {FACTS_DIR}")
        n = 0
        for slug, html in self.pages.items():
            f = json.loads((FACTS_DIR / f"{slug}.json").read_text(encoding="utf-8"))
            vis = _visible(html)
            track_days = set()
            for t in f["tracks"]:
                for d in t["interview_dates"]:
                    track_days |= {d["iso_start"], d["iso_end"]}
                for k in ("stage1_announce", "final_announce"):
                    if t.get(k):
                        track_days.add(t[k]["iso"])
                        track_days |= {x["iso"] for x in t[k].get("by_scope", [])}
                for k in ("stage1_announce_split", "final_announce_by_scope"):
                    track_days |= {x["iso"] for x in t.get(k, [])}
            for nt in f["official_notices"]:
                for k, v in nt.items():
                    if k in ("url", "attachment_url", "board_url", "body_image_url", "attachment_local_path", "body_image_local",
                             "attachment_sha256", "fetched", "posted", "provenance_check", "checked_against", "note", "what"):
                        continue
                    for s in re.findall(r"[^|\n]{12,}", json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v):
                        s = s.strip(' "[]{},')
                        if len(s) >= 12:
                            n += 1
                            self.assertNotIn(s, vis, f"{slug}: 요강 밖 공지 값 {s[:40]}")
                for y, mo, d in re.findall(r"(20\d\d)[.\-]\s?(\d{1,2})[.\-]\s?(\d{1,2})", json.dumps(nt, ensure_ascii=False)):
                    iso = f"{y}-{int(mo):02d}-{int(d):02d}"
                    if iso not in track_days and iso != self.b["checked"]:   # 확인일은 이 면의 날짜
                        self.assertNotIn(f"{y}년 {int(mo)}월 {int(d)}일", vis, f"{slug}: 공지에만 있는 날짜 {iso}")
        self.assertGreater(n, 20)

    def test_questions_verbatim_in_v24(self):
        try:
            from guidebook_sources import v24_inputs
            import compile_interview_info as K
        except ImportError as ex:
            raise unittest.SkipTest(str(ex))
        sale = _onsale()
        for u in self.b["univs"]:
            inp = v24_inputs(sale[u["slug"]]["name"])
            if inp is None or not inp["html"].is_file():
                raise unittest.SkipTest("v24 HTML 부재(검사 불가)")
            groups = K.v24_groups(inp["html"])
            for q in u["questions"]:
                gi, li = q["src"]
                self.assertEqual(K.type_name(groups[gi][0]), q["type"], u["slug"])
                self.assertEqual(groups[gi][1][li], q["q"], u["slug"])
                self.assertTrue(groups[gi][2], (u["slug"], q["type"]))   # 후기 군에서만 뽑는다

    def test_fix_evidence_quotes_in_guide_pdf(self):
        """결정 2, 6: 묶음의 보정 값과 일괄합산 칸에 붙은 인용이 요강 PDF 그 쪽에 글자 그대로 있다(사실 파일 doc 의 PDF, sha 대조)."""
        n = 0
        for u in self.b["univs"]:
            for t in u["tracks"]:
                evs = list(t.get("name_evidence", [])) + list(t.get("time_evidence", []))
                evs += [e for x in t.get("quota_parts", []) for e in x["evidence"]]
                evs += list((t.get("stage1_none") or {}).get("evidence", []))
                for e in evs:
                    n += 1
                    self.assertIn(e["quote"], _pdf_page(u["slug"], e["page"]), (u["slug"], t["name"], e))
        self.assertGreaterEqual(n, 8)

    def test_format_quotes_contiguous_in_reading_order(self):
        """검토 지적 수리: 면접 방식 절의 요강 문구는 요강 PDF 그 쪽 읽기 순서 글에 이어진 글로 있다(공백, 쉼표, 글머리표 차이만 허용).
        사실 파일 인용 가운데 거기 없는 것(표의 다른 칸을 이은 글)은 묶음에서 빠진다. 글자 층이 없는 쪽은 대조할 수 없어 따로 센다."""
        norm = lambda s: re.sub(r"[\s,·∙•‧・]", "", s)
        import compile_interview_info as K
        shown = dropped = blind = 0
        for u in self.b["univs"]:
            f = _facts(u["slug"])
            for ft, t in zip(f["tracks"], u["tracks"]):
                where = (u["slug"], ft["name"])
                q0 = K.clean_quote(ft["interview_format"]["quote"])
                if not q0:
                    self.assertIsNone(t["quote"], where)
                    continue
                txt = _pdf_page_reading(u["slug"], t["page"])
                if not txt.strip():
                    blind += 1
                    self.assertEqual(t["quote"], q0, where)
                elif norm(q0) in norm(txt):
                    shown += 1
                    self.assertEqual(t["quote"], q0, where)
                else:
                    dropped += 1
                    self.assertIsNone(t["quote"], where)
        med = next(t for t in {x["slug"]: x for x in self.b["univs"]}["pusan"]["tracks"] if t["name"].startswith("의예과"))
        self.assertIsNone(med["quote"])
        self.assertEqual(med["page"], 67)
        self.assertGreaterEqual(shown, 30)
        self.assertGreaterEqual(dropped, 1)
        self.assertLessEqual(blind, 2)   # 경기대 53쪽(렌더 그림 판독)

    def test_pusan_medical_30_is_regional_column(self):
        """결정 2: 부산대 2차 수정판 36쪽 의예과 줄의 30 은 지역인재Ⅰ 열에 있고 학생부종합 열은 비어 있다(글자 위치로 대조)."""
        words = _pdf_words("pusan", 36)
        row = [w for w in words if w[2] == "의예과" and w[0] > 350]
        self.assertEqual(len(row), 1)
        y = row[0][1]
        nums = [w for w in words if abs(w[1] - y) < 1.5 and w[0] > row[0][0] and re.fullmatch(r"\d+", w[2])]
        self.assertEqual([w[2] for w in nums], ["30"])
        heads = [w for w in words if w[2] in ("학생부", "지역") and w[0] > 450]
        self.assertEqual(sorted(w[2] for w in heads), ["지역", "학생부"])
        nearest = min(heads, key=lambda w: abs(w[0] - nums[0][0]))
        self.assertEqual(nearest[2], "지역")
        t39 = _pdf_page("pusan", 39)
        for q in ("전형 4. 학생부종합(지역의사선발전형)", "의과대학 의예과", "합계 31"):
            self.assertIn(q, t39)

    def test_page_values_trace_to_facts_or_evidence(self):
        """결정 3: 면에 싣는 날짜, 인원, 면접 시간은 사실 파일 tracks 값이거나 쪽과 인용이 붙은 보정 값이다."""
        if not FACTS_DIR.is_dir():
            raise unittest.SkipTest(f"사실 파일 부재(검사 불가): {FACTS_DIR}")
        for u in self.b["univs"]:
            f = _facts(u["slug"])
            self.assertEqual(len(f["tracks"]), len(u["tracks"]), u["slug"])
            for ft, t in zip(f["tracks"], u["tracks"]):
                where = (u["slug"], ft["name"])
                ivs = {d["iso_start"] for d in ft["interview_dates"]} | {d["iso_end"] for d in ft["interview_dates"]}
                for x in t["interviews"]:
                    self.assertIn(x["iso"], ivs, where)
                    if x.get("iso_end"):
                        self.assertIn(x["iso_end"], ivs, where)
                for key, split in (("stage1", ("stage1_announce", "stage1_announce_split")), ("final", ("final_announce", "final_announce_by_scope"))):
                    isos = set()
                    if ft.get(split[0]):
                        isos.add(ft[split[0]]["iso"])
                        isos |= {x["iso"] for x in ft[split[0]].get("by_scope", [])}
                    isos |= {x["iso"] for x in ft.get(split[1]) or []}
                    for x in t[key]:
                        self.assertIn(x["iso"], isos, (where, key))
                fq = (ft.get("quota") or {}).get("value")
                if t.get("quota_parts"):
                    self.assertIsNone(t["quota"], where)
                    for x in t["quota_parts"]:
                        self.assertTrue(x["evidence"], where)
                elif t["quota"] is not None:
                    self.assertEqual(t["quota"], fq, where)
                fmt = json.dumps(ft["interview_format"], ensure_ascii=False)
                mins = {int(m) for m in re.findall(r"(\d+)\s*분", fmt)}
                if t.get("time_text"):
                    self.assertTrue(t.get("time_evidence"), where)
                    self.assertIsNone(t["minutes"], where)
                    for m in re.findall(r"(\d+)분", t["time_text"]):
                        self.assertIn(int(m), mins, where)
                if t["minutes"] is not None:
                    self.assertIn(t["minutes"], mins, where)
                if t["prep"] == 0:
                    self.assertRegex(ft["interview_format"]["text"], r"준비 ?시간 ?없", where)
                elif t["prep"] is not None:
                    self.assertIn(t["prep"], mins, where)
                if t.get("minutes_text"):   # 사실 파일 면접 방식 글이나 그 인용(원장 꾸밈말 「약 10분간」은 성신여대 44쪽 인용에 있다)
                    fx_all = " ".join([ft["interview_format"]["text"], str(ft["interview_format"].get("quote") or "")]
                                      + [str(x.get("quote") or "") for x in ft["interview_format"].get("quotes_extra") or []])
                    self.assertIn(t["minutes_text"], re.sub(r"\s*~\s*", "~", re.sub(r"\s+", " ", fx_all)), where)

    def test_bundle_recompiles_identically(self):
        try:
            import compile_interview_info as K
        except ImportError as ex:
            raise unittest.SkipTest(str(ex))
        if not FACTS_DIR.is_dir() or not K.V24_ROOT.is_dir():
            raise unittest.SkipTest("원천 부재(검사 불가)")
        self.assertEqual(K.compile_bundle(), json.loads(BUNDLE.read_text(encoding="utf-8")))


# ---------------------------------------------------------------- 원장 재대조 반영 생성기 (2026-11-16 명세 E 4절 3, 4항)
PUSAN_MED_TIME = "학생부 기반 면접 10분 내외 / 공통문제 답변 준비 10분 내외, 면접 10분 내외"


class ReauditGenerator(unittest.TestCase):
    """요강 꾸밈말(interview_time_text)을 판매 면 카드와 정보 면이 그대로 싣고, 판매 면 조사가 로마 숫자를 읽는 소리로 받침을 고른다."""

    @classmethod
    def setUpClass(cls):
        import build_guidebook as B
        import build_interview_info as G
        import compile_interview_info as K
        cls.B, cls.G, cls.K = B, G, K

    def test_guidebook_eun_reads_roman_numerals(self):
        B = self.B
        self.assertEqual(B._eun("덕성인재전형Ⅱ"), "는")   # 이(二): 받침 없음
        self.assertEqual(B._eun("기회균형전형Ⅰ"), "은")   # 일(一): 받침 있음
        self.assertEqual(B._eun("전형Ⅳ"), "는")
        self.assertEqual(B._eun("전형Ⅲ"), "은")
        self.assertEqual(B._eun("학생부종합전형Ⅰ(면접형)"), "은")   # 괄호 앞 글자가 아니라 마지막 한글 '형'
        self.assertEqual(B._eun("ACE전형"), "은")

    def test_guidebook_card_time_uses_guide_wording(self):
        f = self.B._minutes_ko
        self.assertEqual(f({"interview_minutes": 10, "prep_minutes": None}), "면접 10분")   # 꾸밈말이 없으면 지금 표기 그대로
        self.assertEqual(f({"interview_minutes": 10, "prep_minutes": None, "interview_time_text": "10분 내외"}), "면접 10분 내외")
        self.assertEqual(f({"interview_minutes": 10, "prep_minutes": None, "interview_time_text": "약 10분간"}), "면접 약 10분간")
        self.assertEqual(f({"interview_minutes": 12, "prep_minutes": None, "interview_time_text": "약 12분 내외"}), "면접 약 12분 내외")
        self.assertEqual(f({"interview_minutes": 9, "prep_minutes": 0, "interview_time_text": "9분 내외"}), "준비시간 없이 면접 9분 내외")
        self.assertEqual(f({"interview_minutes": 9, "prep_minutes": 40, "interview_time_text": "9분 내외"}), "준비 40분, 면접 9분 내외")
        self.assertEqual(f({"interview_minutes": None, "prep_minutes": None, "interview_time_text": "8~10분 내외"}), "면접 8~10분 내외")
        self.assertEqual(f({"interview_minutes": None, "prep_minutes": None}), "요강에 시간 미기재")
        # 요강이 면접을 둘로 나눠 적은 전형(부산대 의예과 67쪽)은 칸 이름이 붙은 표기를 그대로 싣는다(합산 값을 만들지 않는다)
        self.assertEqual(f({"interview_minutes": None, "prep_minutes": 10, "interview_time_text": PUSAN_MED_TIME}), PUSAN_MED_TIME)
        for bad in ({"interview_minutes": 10, "interview_time_text": "12분 내외"},       # 정수 칸과 다른 수
                    {"interview_minutes": 20, "interview_time_text": PUSAN_MED_TIME},     # 나눠 적은 표기인데 정수 칸이 남음
                    {"interview_minutes": 10, "interview_time_text": "10분쯤"}):          # 요강 꾸밈말 꼴이 아님
            with self.assertRaises(SystemExit, msg=bad):
                f(bad)

    def test_info_time_uses_guide_wording(self):
        G = self.G
        t = {"minutes": 10, "prep": None, "minutes_text": "10분 내외"}
        self.assertEqual(G.minutes_ko(t), "면접 10분 내외")
        self.assertEqual(G.time_sentence(t), "면접 시간은 10분 내외입니다.")
        t = {"minutes": 9, "prep": 0, "minutes_text": "9분 내외"}
        self.assertEqual(G.minutes_ko(t), "준비시간 없이 면접 9분 내외")
        self.assertEqual(G.time_sentence(t), "준비 시간 없이 면접 시간 9분 내외입니다.")
        t = {"minutes": 9, "prep": 40, "minutes_text": "9분 내외"}
        self.assertEqual(G.minutes_ko(t), "준비 40분, 면접 9분 내외")
        self.assertEqual(G.time_sentence(t), "준비 시간 40분, 면접 시간 9분 내외입니다.")
        t = {"minutes": 10, "prep": None, "minutes_text": None}
        self.assertEqual(G.minutes_ko(t), "면접 10분")
        self.assertEqual(G.time_sentence(t), "면접 시간은 10분입니다.")
        t = {"minutes": None, "prep": None, "minutes_text": "8~10분 내외"}
        self.assertEqual(G.minutes_ko(t), "면접 8~10분 내외")

    def test_compile_time_text_needs_facts_wording(self):
        K = self.K
        fmt = {"text": "2인 대 1인 개별면접을 10분 내외 진행한다.", "page": 12, "quote": "지원자 1인당 면접시간은 10분 내외"}
        self.assertEqual(K.ledger_time_text({"interview_minutes": 10, "interview_time_text": "10분 내외"}, fmt), "10분 내외")
        self.assertIsNone(K.ledger_time_text({"interview_minutes": 10}, fmt))
        fmt2 = {"text": "약 10분 진행한다.", "page": 44, "quote": "2:1 평가이며 약 10분간 진행합니다.", "quotes_extra": []}
        self.assertEqual(K.ledger_time_text({"interview_minutes": 10, "interview_time_text": "약 10분간"}, fmt2), "약 10분간")   # 인용에 있는 글자도 사실 파일 글이다
        with self.assertRaises(ValueError):
            K.ledger_time_text({"interview_minutes": 10, "interview_time_text": "10분 이내"}, fmt)   # 사실 파일 글에 없는 표기
        with self.assertRaises(ValueError):
            K.ledger_time_text({"interview_minutes": None, "interview_time_text": PUSAN_MED_TIME}, fmt)   # 나눠 적은 표기는 줄 단위 보정(TRACK_FIX)만 싣는다


# ---------------------------------------------------------------- 묶음과 판매 면 원장 맞대기 (2026-11-17 명세 E 검토 지적 수리)
class LedgerBundleGate(unittest.TestCase):
    """정보 면 묶음은 판매 면과 같은 원장으로 컴파일돼야 하고, 두 면은 같은 전형을 같은 이름으로 부른다.
    원장만 고치고 묶음을 다시 컴파일하지 않으면 빌드가 멈춘다(build_interview_info.check_ledger, build_all 1f)."""

    @classmethod
    def setUpClass(cls):
        import build_guidebook as B
        import build_interview_info as G
        cls.B, cls.G = B, G
        cls.b = json.loads(BUNDLE.read_text(encoding="utf-8"))

    def test_bundle_pin_is_sales_pin(self):
        self.assertEqual(self.b["sources"]["ledger_sha16"], self.B.LEDGER_SHA16)
        self.G.check_ledger(self.b)   # 지금 묶음은 통과한다

    def test_build_stops_on_stale_bundle(self):
        import copy
        b = copy.deepcopy(self.b)
        b["sources"]["ledger_sha16"] = "0" * 16
        with self.assertRaises(SystemExit):
            self.G.check_ledger(b)

    def test_build_stops_on_name_drift(self):
        import copy
        b = copy.deepcopy(self.b)
        u = next(x for x in b["univs"] if x["slug"] == "catholic")
        u["tracks"][0]["name"] = "잠재능력우수자(면접)전형"   # 고치기 전 원장 이름(요강에 없는 표기)
        with self.assertRaises(SystemExit):
            self.G.check_ledger(b)
        b = copy.deepcopy(self.b)
        u = next(x for x in b["univs"] if x["slug"] == "ajou")
        u["tracks"] = u["tracks"][:-1]
        with self.assertRaises(SystemExit):
            self.G.check_ledger(b)

    def test_sales_and_info_cards_share_names(self):
        """판매 30곳 전수: 판매 면 요강 제원 절의 면접 실시 카드 이름과 정보 면 면접 방식 절 카드 이름이 같다.
        요강 쪽 인용이 붙은 줄 단위 보정 이름(부산대 의예과, 판매 면 이름은 재대조에서 두 대조가 갈려 원장을 고치지 않았다)만 다를 수 있다."""
        cat = {e["slug"]: e for e in json.loads(CATALOG.read_text(encoding="utf-8"))["items"]}
        n = 0
        for u in self.b["univs"]:
            h = self.B._official_html(cat[u["slug"]])
            sales = [_html.unescape(x) for x in re.findall(r'<div class="o"><h3>([^<]*)</h3>', h)]
            info = [t["name"] for t in u["tracks"]]
            fixed = [t["name"] for t in u["tracks"] if t.get("name_evidence")]
            self.assertEqual(len(sales), len(info), u["slug"])
            self.assertEqual(sorted(set(info) - set(fixed)), sorted(set(sales) & set(info)), u["slug"])
            self.assertEqual(len(set(sales) - set(info)), len(fixed), u["slug"])
            n += 1
        self.assertEqual(n, 30)


# ---------------------------------------------------------------- 판매 면 요강 원장 정정 (2026-11-16 추가 명세 결정 7)
class LedgerCorrection(unittest.TestCase):
    """판매 면이 쓰는 2027 학종 원장의 두 값을 요강과 다시 대조해 고친다. 중앙대 융합형인재 의학부 모집 15명(요강 31쪽 7명),
    인하대 인하미래인재(면접형) 의예과 15명(지금 요강 10쪽 16명). 원장 파일 이름은 내용 sha256 앞 8자, 빌드 핀은 앞 16자다."""

    @classmethod
    def setUpClass(cls):
        import build_guidebook as B
        cls.B = B
        cls.L = B.load_ledger()

    def _track(self, univ, name):
        return next(t for t in self.L[univ]["tracks"] if t["name"] == name)

    def test_ledger_file_named_by_content_hash(self):
        files = sorted((HERE / "fixtures").glob("admissions_ledger_2027_*.json"))
        self.assertEqual(len(files), 1, files)
        p = files[0]
        sha = hashlib.sha256(p.read_bytes()).hexdigest()
        self.assertEqual(p.name, f"admissions_ledger_2027_{sha[:8]}.json")
        self.assertEqual(Path(self.B.LEDGER_2027).resolve(), p.resolve())
        self.assertEqual(self.B.LEDGER_SHA16, sha[:16])
        raw = p.read_bytes()
        self.assertEqual(json.dumps(json.loads(raw), ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode() + b"\n", raw)
        for rel in ("_tools/build_guidebook.py", "_tools/compile_interview_info.py", "_tools/search_official_extra.json", "_tools/test_search_official_v24.py"):
            names = set(re.findall(r"admissions_ledger_2027_[0-9a-f]{8}\.json", (ROOT / rel).read_text(encoding="utf-8")))
            self.assertEqual(names, {p.name}, rel)

    def test_cau_fusion_medical_quota(self):
        t = self._track("중앙대학교", "융합형인재전형-의학부")
        self.assertEqual(t["selection_ratio"], "모집 7명; 1단계 서류 100%(3.5배수), 2단계 1단계 70%+면접 30%")   # 3.5배수 = 명세 E 4절 4항(요강 32쪽)
        ev = json.dumps(t["evidence"], ensure_ascii=False)
        self.assertNotIn("15명", ev)
        self.assertTrue(any(e["page"] == 31 and "의학부 모집인원은 7명" in e["claim"] for e in t["evidence"]))
        doc = self.L["중앙대학교"]["documents"][0]
        self.assertEqual(doc["sha256"], _facts("cau")["doc"]["sha256_actual"])   # 원장 판 = 받은 판
        self.assertIn("의과 의학부 7", _pdf_page("cau", 31))
        self.assertIn("학생부종합(융합형인재) 총계", _pdf_page("cau", 31))

    def test_inha_tracks_match_current_guide(self):
        u = self.L["인하대학교"]
        doc = u["documents"][0]
        self.assertEqual(doc["sha256"], _facts("inha")["doc"]["sha256_actual"])
        self.assertEqual(doc["checked_at"], "2026-11-16")
        t1 = self._track("인하대학교", "인하미래인재(면접형)-의예과 제외")
        t2 = self._track("인하대학교", "인하미래인재(면접형)-의예과")
        t3 = self._track("인하대학교", "지역의사선발전형")
        self.assertEqual(t2["selection_ratio"], "전형 총 모집 939명 중 의예과 16명; 1단계 서류 100%(3배수), 2단계 1단계 70%+면접 30%")
        self.assertNotIn("15명", json.dumps(u["tracks"], ensure_ascii=False))
        # 인원 밖의 값(면접 근거, 시간, 선발 비율)은 지금 판에서도 같다. 의예과 제외 면접 시간은 범위(15쪽 평가시간 8~10분 내외)라
        # 정수 칸은 null 이고 요강 표기는 interview_time_text 에 둔다(검토 지적 수리: 판매 면이 「요강에 시간 미기재」로 적던 값)
        self.assertEqual([(t["interview_basis"], t["interview_minutes"], t["prep_minutes"]) for t in (t1, t2, t3)],
                         [("record_based", None, None), ("record_based", 15, None), ("record_based", 15, None)])
        self.assertEqual(t1.get("interview_time_text"), "8~10분 내외")
        self.assertNotIn("interview_time_text", t2)
        self.assertNotIn("interview_time_text", t3)
        self.assertEqual(t1["selection_ratio"], "전형 총 모집 939명 중 의예과를 제외한 모집단위; 1단계 서류 100%(3.5배수), 2단계 1단계 70%+면접 30%")
        self.assertEqual(t3["selection_ratio"], "모집 6명; 1단계 서류 100%(3배수), 2단계 1단계 70%+면접 30%")
        self.assertEqual([sorted({e["page"] for e in t["evidence"]}) for t in (t1, t2, t3)], [[14, 15], [10, 14, 15], [19, 20]])
        p10, p14, p15, p19, p20 = (_pdf_page("inha", n) for n in (10, 14, 15, 19, 20))
        self.assertIn("의과대학 의예과 16", p10)
        self.assertIn("합계 939", p10)
        for q in ("1. 모집단위 및 모집인원: 939명", "3.5배수", "(의예과: 3배수)", "반영비율 70% 30%"):
            self.assertIn(q, p14)
        for q in ("면접위원 2인과 지원자 1인의 개별 면접", "(2개의 면접실을 이동하면서 진행)", "8~10분 내외", "15분 내외(각 면접실별 7~8분 내외)",
                  "전 모집단위(의예과 제외)", "평가시간 8~10분 내외"):
            self.assertIn(q, p15)
        self.assertIn("1. 모집단위 및 모집인원: 의예과 6명", p19)
        for q in ("3배수", "반영비율 70% 30%", "평가시간 15분 내외", "(2개의 면접실을 이동하면서 진행)"):
            self.assertIn(q, p20)

    def test_null_minutes_with_guide_time_carry_text(self):
        """검토 지적 수리: 원장 면접 시간이 null 인데 근거 글에 분 표기가 있는 전형은 그 요강 표기를 interview_time_text 로 갖는다
        (판매 면이 「요강에 시간 미기재」로 적지 않게). 그런 전형은 인하대 의예과 제외(범위 8~10분 내외)와
        부산대 의예과(요강이 두 면접을 따로 적어 합산 20분을 지움, 명세 E 4절 4항) 둘이다.
        명세 E 4절 3항부터 interview_time_text 는 정수 시간이 있는 전형에도 요강 꾸밈말을 싣고, 그때 표기 속 수는 정수 칸과 같다."""
        n = 0
        for univ, u in self.L.items():
            for t in u.get("tracks", []):
                txt = t.get("interview_time_text")
                if txt is not None:
                    if t["interview_minutes"] is None:
                        self.assertTrue(re.fullmatch(r"\d+~\d+분(?: 내외| 이내)?", txt) or self.B._time_text(t)[1] == "labeled", (univ, t["name"], txt))
                    else:
                        self.assertRegex(txt, r"^(?:약 )?\d+분(?: 내외| 이내|간)?$", (univ, t["name"]))
                        self.assertEqual([int(x) for x in re.findall(r"\d+", txt)], [t["interview_minutes"]], (univ, t["name"]))
                if t.get("interview_status") != "conducted" or t.get("interview_minutes") is not None:
                    continue
                claims = " ".join(e["claim"] for e in t.get("evidence", []))
                if re.search(r"\d+\s*(?:~\s*\d+\s*)?분", claims):
                    n += 1
                    self.assertTrue(txt, (univ, t["name"]))
                    for m in re.findall(r"\d+(?:~\d+)?분", txt):
                        self.assertIn(m, re.sub(r"\s*~\s*", "~", claims), (univ, t["name"]))
        self.assertEqual(n, 2)

    def test_cau_tracks_match_guide_on_check_date(self):
        """검토 지적 수리: 중앙대 원장 문서(받은 PDF 와 같은 sha)의 세 전형 값 전부를 2026-11-16 에 다시 대조했으므로 대조일을 그날로 둔다."""
        u = self.L["중앙대학교"]
        doc = u["documents"][0]
        self.assertEqual(doc["checked_at"], "2026-11-16")
        self.assertEqual(doc["sha256"], _facts("cau")["doc"]["sha256_actual"])
        tr = {t["name"]: t for t in u["tracks"]}
        self.assertEqual(sorted(tr), ["성장형인재전형", "융합형인재전형-의학부", "탐구형인재전형"])
        self.assertEqual({(t["interview_basis"], t["interview_minutes"], t["prep_minutes"]) for t in tr.values()}, {("record_based", 10, None)})
        self.assertEqual(tr["탐구형인재전형"]["selection_ratio"], "모집 512명; 1단계 서류 100%, 2단계 1단계 70%+면접 30%")
        self.assertEqual(tr["성장형인재전형"]["selection_ratio"], "모집 108명; 1단계 서류 100%, 2단계 1단계 70%+면접 30%")
        p = {n: _pdf_page("cau", n) for n in (26, 28, 31, 32, 36, 37, 95)}
        self.assertIn("학생부종합(탐구형인재) 총계 512", p[26])
        self.assertIn("1단계 100 - -", p[28])
        self.assertIn("2단계 - - 70 30", p[28])
        self.assertIn("학생부종합(융합형인재) 총계 378", p[31])
        self.assertIn("의과 의학부 7", p[31])
        self.assertIn("1단계 (3.5배수) 100 - -", p[32])
        self.assertIn("2단계 - 70 30", p[32])
        self.assertIn("학생부종합(성장형인재) 총계 108", p[36])
        self.assertIn("1단계(5배수) 100 - -", p[37])
        self.assertIn("2단계 - 70 30", p[37])
        for q in ("면접방식 학교생활기록부 기반 면접평가", "지원자 1인당 10분 이내", "입학사정관 2인이 평가"):
            self.assertIn(q, p[95])

    def test_sales_page_official_cards(self):
        cat = {e["slug"]: e for e in json.loads(CATALOG.read_text(encoding="utf-8"))["items"]}
        cau = self.B._official_html(cat["cau"])
        self.assertIn("모집 7명, 1단계 서류 100%(3.5배수), 2단계 1단계 70%+면접 30%", cau)
        self.assertNotIn("모집 15명", cau)
        self.assertIn("원문 대조 2026-11-16.", cau)
        inha = self.B._official_html(cat["inha"])
        self.assertIn("전형 총 모집 939명 중 의예과 16명, 1단계 서류 100%(3배수)", inha)
        self.assertNotIn("의예과 15명", inha)
        self.assertIn("원문 대조 2026-11-16.", inha)
        self.assertIn("<dt>요강 쪽수</dt><dd>10, 14, 15쪽</dd>", inha)
        card = inha.split("<h3>인하미래인재(면접형)-의예과 제외</h3>", 1)[1].split("</dl>", 1)[0]
        self.assertIn("<dt>면접 시간</dt><dd>면접 8~10분 내외</dd>", card)
        self.assertNotIn("요강에 시간 미기재", inha)
        # 정보 면과 판매 면이 같은 전형의 면접 시간을 같게 적는다
        b = json.loads(BUNDLE.read_text(encoding="utf-8"))
        info = {t["name"]: t for u in b["univs"] if u["slug"] == "inha" for t in u["tracks"]}
        self.assertEqual(info["인하미래인재(면접형)-의예과 제외"]["minutes_text"], "8~10분 내외")


# ---------------------------------------------------------------- 원장 재대조 반영 (2026-11-16 명세 E 4절)
AUDIT_DIR = Path.home() / "unjang/_shared/ops/20261116_SEO_GEO_AEO_재부양/s2_ledger"
# 원장 evidence.page 와 지금 요강 PDF 쪽 차례의 차이(PDF 쪽 = 원장 쪽 + 값). 대학마다 원장이 인쇄 쪽 번호를 쓰기도 하고 PDF 쪽 차례를 쓰기도 한다
# (대조 파일 page_numbering). 반영한 쪽도 그 대학 원장이 쓰던 체계로 적었다
PAGE_OFF = {"ajou": 2, "catholic": 2, "dankook": 2, "donga": 0, "dongduk": 4, "dongguk": 2, "duksung": 0, "ewha": -1, "gachon": 0,
            "hufs": 2, "incheon": 0, "khu": 2, "konkuk": 0, "kookmin": 4, "kwangwoon": 0, "myongji": 0, "sahmyook": 2, "sejong": 0,
            "seoultech": 0, "snu": 4, "sookmyung": 0, "soongsil": 0, "sungshin": 0, "swu": 0, "ulsan": 0, "uos": 0}
RENAMED = {("catholic", "잠재능력우수자(면접)전형"): "잠재능력우수자면접전형",
           ("ulsan", "지역인재전형(저소득층)-의예과"): "지역인재(기초생활/차상위)전형-의예과"}
# 두 파일이 일치했으나 명세 2절 인용 규칙(그 쪽 pdftotext 기본 모드 글에 이어진 글)을 채울 수 없어 반영하지 않은 칸(글자 층 없는 쪽)
HELD = {("kyonggi", "KGU학생부종합전형", "evidence[0]"), ("kyonggi", "SW우수자전형", "evidence[0]"), ("donga", "잠재능력우수자전형", "time_text")}
# 문서 sha 가 달랐고 대조 칸이 모두 same 이거나 반영된 differs 인 대학(4절 2항: 문서 sha 와 대조일을 지금 판으로)
RESOLVED = {"ajou", "gachon", "hufs", "konkuk", "kookmin", "sookmyung", "swu", "uos"}
# 반영 뒤 전형별 근거 쪽(원장 체계)과 그 쪽 요강 글에서 다시 확인하는 글(명세 5절 5항)
REAUDIT_PAGES = {
    ("ajou", "ACE전형-의학과"): [9, 10], ("catholic", "잠재능력우수자면접전형"): [30, 56], ("duksung", "덕성인재전형Ⅱ"): [29, 74],
    ("ewha", "미래인재전형-면접형"): [19, 20, 40], ("hufs", "학생부종합전형(면접형)"): [14, 23], ("incheon", "자기추천전형"): [27, 49],
    ("khu", "네오르네상스전형"): [38, 62], ("konkuk", "KU자기추천전형"): [72], ("myongji", "명지인재면접전형"): [64],
    ("sahmyook", "세움인재전형"): [27, 54], ("sejong", "세종인재전형(면접형)-인문·자연계열"): [51],
    ("sejong", "세종인재전형(면접형)-디자인이노베이션·만화애니메이션텍"): [51],
    **{("seoultech", n): [11, 62, 63] for n in ("학교생활우수자전형", "창의융합인재전형", "기회균형전형(국가보훈대상자)", "기회균형전형(기회균등)",
                                                "기회균형전형(농어촌학생)", "기회균형전형(평생학습자)", "기회균형전형(특수교육대상자)", "군위탁전형")},
    ("snu", "학생부종합(일반전형)-면접 실시 모집단위"): [20, 21, 23, 24], ("sookmyung", "숙명인재(면접형)전형"): [18, 19],
    ("sookmyung", "소프트웨어인재전형"): [20, 21], ("soongsil", "SSU미래인재전형(면접형)"): [19, 20, 66],
    ("sungshin", "자기주도인재전형"): [9, 18, 19, 44], ("sungshin", "특수교육대상자전형(정원외)"): [10, 28, 44],
    ("ulsan", "잠재역량전형-아산아너스칼리지 자율전공학부"): [62, 81], ("ulsan", "잠재역량전형-간호학과"): [62, 81],
    ("ulsan", "잠재역량전형-의예과"): [62, 81], ("ulsan", "지역인재전형-의예과"): [64, 81],
    ("ulsan", "지역인재(기초생활/차상위)전형-의예과"): [24, 66, 81], ("uos", "기회균형전형Ⅰ"): [31, 32], ("kyonggi", "KGU학생부종합전형"): [42],
}
PDF_FACTS = {   # (대학, PDF 쪽 차례): 그 쪽 글에 있어야 하는 글(공백은 한 칸으로 줄여 대조, 기본 모드와 -layout 어느 한쪽)
    ("ajou", 11): ["1. 모집단위 및 모집인원: 519명", "의과대학 의학과 17", "서류평가 100% (3배수 선발)", "1단계 성적 70% 면접평가 30%"],
    ("ajou", 12): ["4) 지원자의 제출서류를 바탕으로 한 면접(10분), 윤리의식 등 인성을 확인하기 위한 제시문 활용 면접(10분)"],
    ("catholic", 57): ["학생부종합(잠재능력우수자면접전형)"],
    ("catholic", 58): ["지원자 제출서류 내용의 진실성 및 가치를 확인하기 위한 10분 내외 개별 면접"],
    ("duksung", 74): ["10분 내외, 개별면접(면접평가위원 2인)"],
    ("ewha", 18): ["학생부종합[미래인재전형-면접형] 209명"],
    ("ewha", 19): ["1단계(5배수) 서류 100%", "1단계 성적 70%", "면접 30%", "나. 면접 평가방법: 제출서류를 기반으로 한 일반면접"],
    ("hufs", 16): ["1단계 : 서류 100% (3배수 선발)", "학생부종합전형(면접형) 478", "2단계 : 서류 50%[1단계 성적] + 면접 50%"],
    ("incheon", 27): ["1단계 사정에서 서류평가 산출점수 순으로 모집인원의 3배수"],
    ("incheon", 49): ["나. 전형자료: 학교생활기록부", "나. 면접형식: 개별면접(면접위원 2인이 지원자 1인 평가)", "라. 소요시간: 지원자 1인당 10분 내외"],
    ("khu", 40): ["1단계 성적(70%)과 면접평가 성적(30%)을 합산하여 총점 순으로"],
    ("konkuk", 72): ["면접평가자(2인) 대(對) 지원자(1인) / 개인당 10분 내외"],
    ("myongji", 64): ["1) 1단계 합격자(면접대상자)는 서류평가 성적 순으로 모집인원의 4배수 선발"],
    ("sahmyook", 56): ["서류평가 내용 확인 및", "개별질문", "8분 이내"],
    ("sejong", 51): ["서류평가와 연계된 질의응답을 통해 제출서류의 진실성 확인", "총 9분 내외 소요",
                     "면접 준비시간 동안 작성한 자료를 토대로 3~5분 발표 및 질의응답"],
    ("seoultech", 62): ["2인의 면접위원이 학생 1명당 10분 내외로 면접 시행"],
    ("seoultech", 63): ["제출서류에 기초하여 개별면접 진행", "다수의 면접위원(2인)이 면접대상자(1인) 평가"],
    ("snu", 24): ["서류평가 1단계 성적 면접 및 구술고사", "(2배수)"],
    ("snu", 25): ["관련 제시문을 활용하여"],
    ("snu", 27): ["상황/제시문 기반 면접과 서류 기반 면접을 복수의 면접실에서 진행함"],
    ("snu", 28): ["다양한 상황 제시와 제출서류 내용을 확인함"],
    ("sookmyung", 18): ["총 361명", "모집단위별 4배수", "1단계 성적 70 30"],
    ("sookmyung", 20): ["총 35명", "모집단위별 4배수", "1단계 성적 70 30"],
    ("soongsil", 19): ["모집인원 522명"],
    ("soongsil", 20): ["(3~3.5배수 선발)", "1단계 성적 50%", "면접평가 50%"],
    ("soongsil", 66): ["면접위원 2인, 지원자 1인의 서류 기반 블라인드 면접", "지원자 1인당 12분 내외"],
    ("sungshin", 9): ["합계 533"], ("sungshin", 10): ["합계 23명"],
    ("sungshin", 18): ["(3배수 선발)", "60%(60점)", "40%(40점)"], ("sungshin", 28): ["(3배수 선발)", "60%(60점)", "40%(40점)"],
    ("ulsan", 62): ["아산아너스칼리지 자율전공학부 20", "간호학과 18", "의예과 10", "1단계 400% 100%(500점)", "1단계 500% 100%(500점)",
                    "2단계 100% 50%(500점) 50%(500점)"],
    ("ulsan", 64): ["의예과 13", "1단계 500% 100%(500점)", "2단계 100% 50%(500점) 50%(500점)"],
    ("ulsan", 66): ["지역인재(기초생활/차상위) 특별전형 학생부종합형"],
    ("ulsan", 81): ["제출서류 기반 다대일 개인별 종합면접", "10분 이내", "다양한 상황 제시 및 제출서류 기반 면접을 복수의 면접실에서 진행",
                    "30분 내외", "지역인재(기초생활/차상위_의예과)"],
    ("uos", 31): ["가. 모집인원: 132명"], ("uos", 32): ["1단계(3배수) 100%(500점)", "2단계 50%(500점) 50%(500점)"],
}


def _audit(slug):
    if not AUDIT_DIR.is_dir():
        raise unittest.SkipTest(f"재대조 파일 부재(검사 불가): {AUDIT_DIR}")
    a = json.loads((AUDIT_DIR / f"{slug}.json").read_text(encoding="utf-8"))
    c = json.loads((AUDIT_DIR / f"{slug}.check.json").read_text(encoding="utf-8"))
    return a, c


def _both_text(slug, page):
    return _pdf_page(slug, page) + " | " + re.sub(r"\s+", " ", _pdf_page_reading(slug, page))


class LedgerReaudit(unittest.TestCase):
    """28곳 원장 값을 지금 요강 PDF 에 다시 대조한 결과(s2_ledger 대조와 독립 대조)에서 두 파일이 같은 값으로 일치한 것만 원장에 실었다."""

    @classmethod
    def setUpClass(cls):
        import build_guidebook as B
        cls.B = B
        cls.L = B.load_ledger()
        cls.slugs = sorted(p.name[:-11] for p in AUDIT_DIR.glob("*.check.json")) if AUDIT_DIR.is_dir() else []

    def _univ(self, slug):
        return self.L[dict(self.B.SLUGS)[slug]]

    def _track(self, slug, name):
        name = RENAMED.get((slug, name), name)
        return next(t for t in self._univ(slug)["tracks"] if t["name"] == name)

    def test_twenty_eight_audited(self):
        if not AUDIT_DIR.is_dir():
            raise unittest.SkipTest(f"재대조 파일 부재(검사 불가): {AUDIT_DIR}")
        self.assertEqual(len(self.slugs), 28)
        self.assertEqual(set(self.slugs), set(PAGE_OFF) | {"kyonggi", "pusan"})
        self.assertNotIn("cau", self.slugs)
        self.assertNotIn("inha", self.slugs)

    def test_time_text_follows_reaudit(self):
        """4절 3항: 대조와 독립 대조가 같은 글자로 일치한 꾸밈말만 interview_time_text 로 싣는다. 요강 쪽 글에서 그 인용을 다시 찾는다."""
        n = 0
        for slug in self.slugs:
            a, c = _audit(slug)
            ct = {x["track"]: x for x in c["time_text_items"]}
            for at in a["tracks"]:
                t = self._track(slug, at["ledger_name"])
                tt = at.get("time_text")
                x = ct.get(at["ledger_name"]) or {}
                mine = x.get("my_text", x.get("my_time_text"))
                if not tt or (slug, at["ledger_name"], "time_text") in HELD:
                    self.assertNotIn("interview_time_text", t, (slug, t["name"]))
                    continue
                self.assertTrue(x.get("agree"), (slug, t["name"]))
                self.assertEqual(mine, tt["text"], (slug, t["name"]))
                self.assertEqual(t.get("interview_time_text"), tt["text"], (slug, t["name"]))
                self.assertIn(re.sub(r"\s+", " ", tt["quote"]).strip(), re.sub(r"\s+", " ", _pdf_page_reading(slug, tt["page"])), (slug, t["name"]))
                n += 1
        self.assertEqual(n, 47)   # 두 파일이 일치한 48칸 가운데 글자 층 없는 동아대 1칸을 뺀 수

    def test_applied_differs_are_agreed_and_in_pdf(self):
        """4절 1항, 5절 5항: 반영한 칸은 두 파일이 같은 값의 differs 로 일치했고, 원장 근거 쪽의 요강 글에서 값이 다시 확인된다."""
        agreed = set()
        for slug in self.slugs:
            a, c = _audit(slug)
            ci = {(x["track"], x["field"]): x for x in c["items"]}
            for at in a["tracks"]:
                for f in at["fields"]:
                    x = ci[(at["ledger_name"], f["field"])]
                    if f["verdict"] == "differs" and x["my_verdict"] == "differs" and x["agree"]:
                        agreed.add((slug, at["ledger_name"], f["field"]))
        self.assertEqual(len(agreed), 46)
        ev_touched = {(s, RENAMED.get((s, n), n)) for s, n, f in agreed if f.startswith("evidence") and (s, n, f) not in HELD}
        self.assertEqual(ev_touched - set(REAUDIT_PAGES), set())   # 반영한 근거 칸은 모두 아래 쪽 표에 있다
        for (slug, name), pages in REAUDIT_PAGES.items():
            orig = next((o for (s, o), new in RENAMED.items() if s == slug and new == name), name)
            t = self._track(slug, orig)
            self.assertEqual(sorted({e["page"] for e in t["evidence"]}), pages, (slug, name))
            if (slug, name) in ev_touched:   # 반영한 쪽 가운데 적어도 하나는 아래 요강 글 표로 다시 확인한다
                self.assertTrue({p + PAGE_OFF[slug] for p in pages} & {pg for (s, pg) in PDF_FACTS if s == slug}, (slug, name))
        for (slug, pg), needles in PDF_FACTS.items():
            txt = _both_text(slug, pg)
            for nd in needles:
                self.assertIn(nd, txt, (slug, pg))
        # 값 칸
        ace = self._track("ajou", "ACE전형-의학과 제외")
        self.assertEqual(ace["selection_ratio"], "ACE 총 519명 중 의학과 17명을 제외한 모집단위; 1단계 서류 100%(3배수), 2단계 1단계 70%+면접 30%")
        self.assertNotIn("502", json.dumps(self._univ("ajou"), ensure_ascii=False))
        self.assertTrue(any(t["name"] == "잠재능력우수자면접전형" for t in self._univ("catholic")["tracks"]))
        self.assertFalse(any(t["name"] == "잠재능력우수자(면접)전형" for t in self._univ("catholic")["tracks"]))
        self.assertTrue(any(t["name"] == "지역인재(기초생활/차상위)전형-의예과" for t in self._univ("ulsan")["tracks"]))
        low = self._track("ulsan", "지역인재전형(저소득층)-의예과")
        # 근거 [0](모집 1명, 단계별 비율)은 두 파일이 고칠 쪽을 66 과 67 로 달리 적어 반영하지 않았다(쪽 24, 글 그대로)
        self.assertEqual((low["evidence"][0]["page"], "저소득" in low["evidence"][0]["claim"]), (24, True))
        self.assertNotIn("저소득", json.dumps({**self._univ("ulsan"), "tracks": [{**low, "evidence": low["evidence"][1:]}]}, ensure_ascii=False))
        # 고친 이름의 요강 표기가 그 전형의 근거 쪽 가운데 하나의 요강 글에 있다(5절 5항)
        for ((slug, _), new0), (new, needle) in zip(RENAMED.items(), (("잠재능력우수자면접전형", "잠재능력우수자면접전형"),
                                                             ("지역인재(기초생활/차상위)전형-의예과", "지역인재(기초생활/차상위) 특별전형 학생부종합형"))):
            self.assertEqual(new0, new)
            t = next(x for x in self._univ(slug)["tracks"] if x["name"] == new)
            self.assertTrue(any(needle in _both_text(slug, e["page"] + PAGE_OFF[slug]) for e in t["evidence"]), (slug, new))
        sah = self._track("sahmyook", "세움인재전형")
        self.assertNotIn("전공적합", json.dumps(sah["evidence"], ensure_ascii=False))
        # 반영하지 않은 칸은 그대로(경기대 근거 쪽 42)
        for name in ("KGU학생부종합전형", "SW우수자전형"):
            self.assertEqual([e["page"] for e in self._track("kyonggi", name)["evidence"]], [42])

    def test_pusan_medical_time_is_guide_wording(self):
        """4절 4항: 부산대 의예과 면접 시간 20분은 요강에 없는 합산 값이다. 요강 67쪽 표기를 싣고 정수 칸은 null."""
        t = self._track("pusan", "학생부종합전형(의예과)")
        self.assertIsNone(t["interview_minutes"])
        self.assertEqual(t["interview_time_text"], PUSAN_MED_TIME)
        self.assertEqual(t["prep_minutes"], 10)
        _, c = _audit("pusan")
        x = next(i for i in c["items"] if i["track"] == "학생부종합전형(의예과)" and i["field"] == "interview_minutes")
        self.assertTrue(x["agree"] and x["my_verdict"] == "differs")
        p67 = _both_text("pusan", 67)
        for q in ("학생부 기반 면접 10분 내외", "공통문제 답변", "준비 10분 내외, 면접 10분 내외"):
            self.assertIn(q, p67)
        self.assertNotRegex(p67, r"(?<!\d)20\s*분")
        # 원장 문서는 원장판(풀리지 않은 칸이 있어 그대로 둔다). 원장 근거 72쪽 = 원장판 PDF 쪽 차례 73 에서도 같은 표기다
        doc = self._univ("pusan")["documents"][0]
        old = FACTS_DIR / "_dl" / "pusan" / "pusan_2027_susi.pdf"
        if not old.is_file() or not shutil.which("pdftotext"):
            raise unittest.SkipTest(f"원장판 PDF 부재(검사 불가): {old}")
        self.assertEqual(hashlib.sha256(old.read_bytes()).hexdigest(), doc["sha256"])
        self.assertEqual([e["page"] for e in t["evidence"]], [72])
        t73 = re.sub(r"\s+", " ", subprocess.run([shutil.which("pdftotext"), "-q", "-layout", "-f", "73", "-l", "73", str(old), "-"],
                                                 capture_output=True, text=True, check=True).stdout)
        for q in ("학생부 기반 면접 10분 내외", "준비 10분 내외, 면접 10분 내외"):
            self.assertIn(q, t73)

    def test_cau_fusion_medical_ratio_has_multiple(self):
        """4절 4항: 중앙대 융합형인재 의학부 1단계 3.5배수(요강 32쪽)."""
        t = next(x for x in self.L["중앙대학교"]["tracks"] if x["name"] == "융합형인재전형-의학부")
        self.assertEqual(t["selection_ratio"], "모집 7명; 1단계 서류 100%(3.5배수), 2단계 1단계 70%+면접 30%")
        self.assertTrue(any(e["page"] == 32 for e in t["evidence"]))
        self.assertIn("1단계 (3.5배수) 100 - -", _pdf_page("cau", 32))

    def test_documents_follow_reaudit(self):
        """4절 2항: 문서 sha 가 달랐던 대학은 칸이 모두 풀렸을 때만 문서 sha 와 대조일을 지금 판으로. 풀리지 않은 대학과 sha 가 같던 대학은 그대로."""
        for slug in self.slugs:
            a, _ = _audit(slug)
            doc = self._univ(slug)["documents"][0]
            pdf = Path(a["pdf_path"])
            self.assertEqual(hashlib.sha256(pdf.read_bytes()).hexdigest(), a["pdf_sha256"], slug)
            if slug in RESOLVED:
                self.assertFalse(a["pdf_sha_same"], slug)
                self.assertEqual((doc["sha256"], doc["checked_at"]), (a["pdf_sha256"], "2026-11-16"), slug)
            else:
                self.assertEqual((doc["sha256"], doc["checked_at"]), (a["ledger_doc_sha256"], "2026-08-30"), slug)
        self.assertEqual({s for s in self.slugs if not _audit(s)[0]["pdf_sha_same"]} - RESOLVED,
                         {"incheon", "pusan", "sejong", "snu", "soongsil", "ulsan"})

    def test_sales_cards_follow_reaudit(self):
        cat = {e["slug"]: e for e in json.loads(CATALOG.read_text(encoding="utf-8"))["items"]}
        B = self.B
        for slug in self.slugs:
            h = B._official_html(cat[slug])
            for t in self._univ(slug)["tracks"]:
                if t.get("interview_status") != "conducted":
                    continue
                card = h.split(f"<h3>{B.esc(B.clean(t['name']))}</h3>", 1)[1].split("</dl>", 1)[0]
                if t.get("interview_time_text"):
                    self.assertIn(f"<dt>면접 시간</dt><dd>{B.esc(B._minutes_ko(t))}</dd>", card, (slug, t["name"]))
                    self.assertIn(B.esc(t["interview_time_text"]), card, (slug, t["name"]))
                pages = ", ".join(str(p) for p in sorted({e["page"] for e in t["evidence"]}))
                self.assertIn(f"<dt>요강 쪽수</dt><dd>{pages}쪽</dd>", card, (slug, t["name"]))
            if slug in RESOLVED:
                self.assertIn("원문 대조 2026-11-16.", h, slug)
            else:
                self.assertIn("원문 대조 2026-08-30.", h, slug)
        pusan = B._official_html(cat["pusan"])
        self.assertNotIn("면접 20분", pusan)
        self.assertIn(f"<dt>면접 시간</dt><dd>{PUSAN_MED_TIME}</dd>", pusan)
        self.assertIn("<h3>잠재능력우수자면접전형</h3>", B._official_html(cat["catholic"]))
        self.assertIn("ACE 총 519명 중 의학과 17명을 제외한 모집단위, 1단계 서류 100%(3배수)", B._official_html(cat["ajou"]))
        self.assertIn("모집 7명, 1단계 서류 100%(3.5배수), 2단계 1단계 70%+면접 30%", B._official_html(cat["cau"]))
        q, a = B._official_faq(cat["duksung"])
        self.assertTrue(a.startswith("덕성인재전형Ⅱ는 "), a)

    def test_info_bundle_follows_reaudit(self):
        """정보 면 묶음: 원장 꾸밈말이 있는 전형은 minutes_text 가 그 글자다(부산대 의예과는 줄 단위 보정 표기). 중앙대 의학부 선발 방식에 3.5배수."""
        import build_interview_info as G
        b = json.loads(BUNDLE.read_text(encoding="utf-8"))
        self.assertEqual(b["sources"]["ledger_sha16"], self.B.LEDGER_SHA16)
        n = 0
        for u in b["univs"]:
            ld = {t["name"]: t for t in self.L[dict(self.B.SLUGS)[u["slug"]]]["tracks"]}
            f = _facts(u["slug"]) if FACTS_DIR.is_dir() else None
            for i, t in enumerate(u["tracks"]):
                name = f["tracks"][i]["name"] if f else t["name"]
                L = ld.get(RENAMED.get((u["slug"], name), name))
                if t.get("time_text"):
                    continue
                if L and L.get("interview_time_text"):
                    self.assertEqual(t["minutes_text"], L["interview_time_text"], (u["slug"], name))
                    self.assertIn(L["interview_time_text"], G.minutes_ko(t), (u["slug"], name))
                    n += 1
        self.assertEqual(n, 47)   # 반영한 꾸밈말 47칸 가운데 부산대 의예과(줄 단위 보정 표기)를 뺀 46 + 인하대 의예과 제외 1
        cau = next(u for u in b["univs"] if u["slug"] == "cau")
        med = next(t for t in cau["tracks"] if "의학부" in t["name"])
        self.assertEqual(med["ratio"], "1단계 서류 100%(3.5배수), 2단계 1단계 70%+면접 30%")


# ---------------------------------------------------------------- 허브, llms, 워커
class SiteWiring(unittest.TestCase):
    def test_worker_table_frees_info_paths(self):
        import link_check as L
        removed, legacy = L.worker_tables((ROOT / "_worker/index.js").read_text(encoding="utf-8"))
        for slug in _onsale():
            self.assertNotIn(f"/interview/{slug}.html", legacy, slug)
        for k in ("/interview/index.html", "/interview/korea.html", "/interview/yonsei.html", "/interview/knu.html", "/interview/skku.html"):
            self.assertIn(k, legacy)

    def test_hub_lists_thirty_info_pages(self):
        import build_interview_hub as H
        html = H.build()[0]
        sec = _section(html, "info")
        for slug in _onsale():
            self.assertIn(f'href="interview/{slug}.html"', sec, slug)
        self.assertEqual(re.findall(r"면접 기출문제 ([\d,]+)문", sec), [])   # apply_counts 앵커(지면 전체 2개)에 새 절이 보태지 않는다
        self.assertNotIn("→", sec)

    def test_hub_date_follows_content(self):
        """허브 dateModified 는 허브 본문 해시 원장에서 온다. 판매 면 손 갱신일(B.CONTENT_DATE)과 묶지 않는다."""
        import os
        import tempfile
        import build_interview_hub as H
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "dates.json"
            old = os.environ.get("HH_TODAY")
            try:
                os.environ["HH_TODAY"] = "2026-11-16"
                a = H.hub_date("<p>본문</p>", {"title": "t"}, p)
                os.environ["HH_TODAY"] = "2026-11-20"
                self.assertEqual(H.hub_date("<p>본문</p>", {"title": "t"}, p), a)          # 본문이 같으면 날짜 그대로
                self.assertEqual(H.hub_date("<p>본문 2</p>", {"title": "t"}, p), "2026-11-20")   # 바뀐 날만 오른다
            finally:
                if old is None:
                    os.environ.pop("HH_TODAY", None)
                else:
                    os.environ["HH_TODAY"] = old
        import seo_common as C
        led = json.loads((HERE / "interview_hub_dates.json").read_text(encoding="utf-8"))
        self.assertEqual(C.load_manifest()["pages"]["interview.html"]["date_modified"], led["interview.html"]["date"])

    def test_llms_has_info_section(self):
        import build_sitemap as S
        import seo_common as C
        m = C.load_manifest()
        pages = [("interview/ajou.html", {"title": "아주대 면접 일정", "description": "d", "group": "interview_info", "type": "article"}),
                 ("interview/korea-hum.html", {"title": "고려대 인문", "description": "d2", "type": "article"}),
                 ("programs/korea.html", {"title": "고려대 스튜디오", "description": "d3", "type": "product"})]
        txt = S.build_llms(m, pages)
        self.assertIn("## 대학별 면접 정보", txt)
        studio = txt.split("## 제시문 면접 스튜디오 (학교별)", 1)[1].split("\n## ", 1)[0]
        info = txt.split("## 대학별 면접 정보", 1)[1].split("\n## ", 1)[0]
        self.assertIn("interview/korea-hum.html", studio)
        self.assertNotIn("interview/ajou.html", studio)
        self.assertIn("interview/ajou.html", info)


if __name__ == "__main__":
    unittest.main()
