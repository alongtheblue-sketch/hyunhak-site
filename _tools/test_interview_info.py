#!/usr/bin/env python3
"""대학별 면접 정보 면 30면 계약 (2026-11-16, 건우 결재 SEO2-1 ②, SEO2-11 ②, SEO2-12 ②).
실행: python3 -m unittest _tools/test_interview_info.py -v   (저장소 루트에서)
원천(요강 사실 파일, v24 판매 정본 HTML)은 저장소 밖에 있다. 그 원천과 대조하는 시험은 파일이 디스크에 있을 때만 돈다
(없으면 skip 으로 표시하고 통과로 세지 않는다). 나머지는 저장소 안 묶음(_tools/fixtures/interview_info_2027.json)만 읽는다.
"""
import copy
import datetime
import json
import re
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

    def test_track_fix_requires_facts_wording(self):
        """원장 전형명이 요강 구분과 다른 줄(부산대 의예과)은 사실 파일 근거 문구가 그대로일 때만 요강 이름과 전형별 인원으로 바꾼다."""
        K = self.K
        t = {"name": "학생부종합전형(의예과)", "quota": None,
             "null_reasons": {"quota": "의예과의 학생부종합 칸은 비어 있고 지역인재Ⅰ 칸이 30이다. 의예과는 그 밖에 지역의사선발전형 합계 31(p.39)로 모집한다.",
                              "dates_basis": "의예과 면접 대상 전형(지역인재전형Ⅰ, 지역의사선발전형)의 전형일정"}}
        name, parts = K.track_fix("pusan", t)
        self.assertEqual(name, "의예과(지역인재전형Ⅰ, 지역의사선발전형)")
        self.assertEqual(parts, [{"label": "지역인재전형Ⅰ", "value": 30}, {"label": "지역의사선발전형", "value": 31}])
        t2 = copy.deepcopy(t)
        t2["null_reasons"]["quota"] = "지역인재Ⅰ 칸이 32이다"
        with self.assertRaises(ValueError):
            K.track_fix("pusan", t2)
        self.assertEqual(K.track_fix("ajou", {"name": "ACE전형-의학과", "quota": {"value": 17}}), ("ACE전형-의학과", None))

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
                 ("seoultech", "군위탁전형", "stage1"), ("gachon", "가천바람개비전형", "final")]
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

    def test_bundle_recompiles_identically(self):
        try:
            import compile_interview_info as K
        except ImportError as ex:
            raise unittest.SkipTest(str(ex))
        if not FACTS_DIR.is_dir() or not K.V24_ROOT.is_dir():
            raise unittest.SkipTest("원천 부재(검사 불가)")
        self.assertEqual(K.compile_bundle(), json.loads(BUNDLE.read_text(encoding="utf-8")))


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
