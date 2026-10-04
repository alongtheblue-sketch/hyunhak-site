#!/usr/bin/env python3
"""전형별 면접 상세면의 사실 원장(facts) 생성기. 2026-09-10 8본, 2026-10 연세대 기회균형 추가로 9본.

원천 = 은행(sets/*.json + spec/SPEC_v1.md) + 2026 기출 해설 세트(interview_pastexam_2026) + 요강 실측값(아래 상수, 각 값에 출처).
은행 세트가 0건인 code 가 있으면 산출 전에 멈춘다 (연세대 기회균형은 은행 sets/ 30본 완주 뒤에만 돈다).
산출 = _tools/exam_pages/facts/<code>.json. 지면 생성기(build_exam_pages.py)와 집필 레그(astra 브리프)가 같은 파일을 읽는다.
숫자는 여기서만 나온다 — 지면·집필 문안의 숫자는 전부 이 원장의 값과 대조된다(facts_check).
"""
import json, glob, os, collections, hashlib, sys
from pathlib import Path

W = Path.home() / "Workspace"
OUT = Path(__file__).resolve().parent / "facts"
OUT.mkdir(parents=True, exist_ok=True)

BANKS = {
    "yonsei-hum":  (W / "yonsei_interview_bank_2027/sets", lambda j: "인문" in j.get("track", "")),
    "yonsei-sci":  (W / "yonsei_interview_bank_2027/sets", lambda j: "자연" in j.get("track", "")),
    "yonsei-intl": (W / "yonsei_intl_interview_bank_2027/sets", lambda j: True),
    # 미래캠퍼스는 계열별 sets/ 150 과 전 모집단위 공통형 sets_u/ 30 을 함께 센다 (2026-09-14 판매 개시, n_sets 180)
    "yonsei-mirae": ([W / "yonsei_mirae_interview_bank_2027/sets", W / "yonsei_mirae_interview_bank_2027/sets_u"], lambda j: True),
    "korea-hum":   (W / "korea_interview_bank_2027/sets", lambda j: "인문" in j.get("track", "")),
    "korea-sci":   (W / "korea_interview_bank_2027/sets", lambda j: "자연" in j.get("track", "")),
    "korea-eq-hum": (W / "korea_gorun_interview_bank_2027/sets", lambda j: "인문" in j.get("track", "")),   # track "… 고른기회전형 | 인문" (2026-09-11)
    "korea-eq-sci": (W / "korea_gorun_interview_bank_2027/sets", lambda j: "자연" in j.get("track", "")),
    # 연세대 기회균형 (2026-10). 전 계열 1단위라 계열 판별이 없다. 세트 id 접두로만 거른다 (파일럿, 골든은 sets/ 밖)
    "yonsei-eq":   (W / "yonsei_eq_interview_bank_2027/sets", lambda j: str(j.get("id") or "").startswith("yonsei_eq_2027_")),
}

# 요강·시행계획·선행학습영향평가 실측값. 출처 문자열은 지면 각주로 나간다.
# 연세: 2027 수시모집요강 Ⅸ_3(p.63)·Ⅴ_3(p.27~28) = hyunhak-site/_design/cafe_series_20260907/_src/요강2027/연세대학교.txt, 은행 spec/SPEC_v1.md §0.
# 고려: 2027 수시모집요강 Ⅴ 면접평가 안내 p.29 표(준비·면접 시간) + 전형요소 표 = 같은 폴더 고려대학교.txt, 2027 입학전형시행계획 p.12~13.
# 미래: 2027 수시모집요강 L4535~4562(제시문 1개 질문 3개, 숙지 10분 면접 5분) = yonsei_mirae_interview_bank_2027/spec/SPEC_v1.md §0·§3 + ERRATA 2026-09-09.
SPEC = {
    "yonsei-hum": dict(univ="연세대학교", univ_short="연세대", track="학생부종합 활동우수형", unit="인문·통합", label="연세대 활동우수형 인문·통합",
        form="제시문 기반 면접", passages=4, prep_sec=480, answer_sec=300, questions=2, points="문항별 배점 공개(세트 안 표기)",
        stage="1단계 서류 100%(일정 배수) → 2단계 1단계 성적 60% + 면접 40%", ratio_src="2027 수시모집요강 Ⅸ_3",
        lang="한국어", scope="인문·사회 통합 교과(국어·사회·윤리·역사), 도표 자료 포함", eval_axes=["제시문 이해", "논리 전개", "종합·적용"],
        src=["2027 연세대 수시모집요강 Ⅸ_3(p.63)", "연세대 선행학습영향평가 보고서 2026 p.1295~1301", "은행 spec/SPEC_v1.md"],
        status="on_sale", sku="pass-yonsei-hum", price=495000, single_price=33000, lecture_count=40),
    "yonsei-sci": dict(univ="연세대학교", univ_short="연세대", track="학생부종합 활동우수형", unit="자연", label="연세대 활동우수형 자연",
        form="제시문 기반 면접", passages=4, prep_sec=480, answer_sec=300, questions=2, points="문항별 배점 공개(세트 안 표기)",
        stage="1단계 서류 100%(일정 배수) → 2단계 1단계 성적 60% + 면접 40%", ratio_src="2027 수시모집요강 Ⅸ_3",
        lang="한국어", scope="수학·과학 교과(통합과학·물리·화학·생명과학·지구과학·수학), 계산·도표 자료 포함", eval_axes=["제시문 이해", "논리 전개", "종합·적용"],
        src=["2027 연세대 수시모집요강 Ⅸ_3(p.63)", "연세대 선행학습영향평가 보고서 2026 p.1295~1301", "은행 spec/SPEC_v1.md"],
        status="on_sale", sku="pass-yonsei-sci", price=495000, single_price=33000, lecture_count=40),
    "yonsei-intl": dict(univ="연세대학교", univ_short="연세대", track="학생부종합 국제형", unit="국제계열", label="연세대 국제형",
        form="제시문 기반 면접(영어 제시문 포함)", passages=3, prep_sec=480, answer_sec=300, questions=2, points="문제1 40점, 문제2 60점",
        stage="1단계 서류 100% → 2단계 1단계 성적 60% + 면접 40%", ratio_src="2027 수시모집요강 Ⅴ_3",
        lang="한국어 + 영어 제시문", scope="국제계열(국어·도덕·사회·영어) 통합, 영어 제시문 1편 이상", eval_axes=["제시문 이해(영어 포함)", "비교·분석", "종합·적용"],
        src=["2027 연세대 수시모집요강 Ⅴ_3(p.27~28)·Ⅸ_3", "연세대 문항카드 2024~2026", "은행 spec/SPEC_v1.md"],
        status="on_sale", sku="pass-yonsei-intl", price=495000, single_price=33000, lecture_count=40),
    "yonsei-mirae": dict(univ="연세대학교 미래캠퍼스", univ_short="연세대 미래", track="학생부종합 학교생활우수자·글로벌인재", unit="계열별(자율융합·첨단·보건·디자인·국제)", label="연세대 미래캠퍼스 학생부종합",
        form="제시문 기반 면접", passages=1, prep_sec=600, answer_sec=300, questions=3, points="비공개(질문 3개, 질문당 답변 약 100초)",
        stage="학교생활우수자(면접형) 1단계 서류 100%(350%) → 2단계 서류 70% + 면접 30% / 글로벌인재 면접 = 논리적 사고력 Ⅰ(영어) + Ⅱ(한국어)", ratio_src="2027 미래캠퍼스 입학전형시행계획(2026-05-29)",
        lang="한국어(국제계열은 영어 제시문)", scope="계열별 교과 통합, 시험지 1장(제시문 1개 + 질문 3개)", eval_axes=["제시문 이해", "논리 전개", "계열 적합 적용"],
        src=["2027 연세대 미래캠퍼스 수시모집요강(제시문 1개-질문 3개, 숙지 10분·면접 5분)", "미래캠퍼스 2027 면접예시문항 가이드북", "은행 spec/SPEC_v1.md + ERRATA 2026-09-09"],
        status="on_sale", open_date="2026-09-14", sku="pass-yonsei-mirae-free", price=495000, single_price=33000, lecture_count=180,
        # 판매 단위 5종. 대표 sku 는 위 sku 이고, 실제 구매는 이 다섯 가운데 하나를 고른다 (2026-09-14)
        units=[dict(code="yonsei-mirae-free", label="연세대 미래 자율융합", sku="pass-yonsei-mirae-free"),
               dict(code="yonsei-mirae-design", label="연세대 미래 디자인", sku="pass-yonsei-mirae-design"),
               dict(code="yonsei-mirae-tech", label="연세대 미래 첨단", sku="pass-yonsei-mirae-tech"),
               dict(code="yonsei-mirae-health", label="연세대 미래 보건", sku="pass-yonsei-mirae-health"),
               dict(code="yonsei-mirae-intl", label="연세대 미래 국제", sku="pass-yonsei-mirae-intl")],
        common_unit=dict(code="yonsei-mirae-common", label="연세대 미래 공통형")),
    "korea-hum": dict(univ="고려대학교", univ_short="고려대", track="학생부종합 계열적합전형", unit="인문", label="고려대 계열적합전형 인문",
        form="제시문 기반 면접", passages=4, prep_sec=1260, answer_sec=420, questions=3, points="비공개(역량 3축 등급 평가)",
        stage="1단계 서류 100%(5배수) → 2단계 1단계 성적 60% + 면접 40%", ratio_src="2027 수시모집요강 학생부종합(계열적합전형) 전형요소",
        lang="한국어", scope="국어·사회·윤리·역사 교과 통합, 도표·그래프 의무 포함", eval_axes=["분석력", "적용력", "종합적 사고력"],
        src=["2027 고려대 수시모집요강 Ⅴ 면접평가 안내 p.29(준비 21분·면접 7분)", "고려대 선행학습영향평가 보고서 2024~2026 문항카드", "은행 spec/SPEC_v1.md·PRACTICE_META_v1.md"],
        status="on_sale", sku="pass-korea-hum", price=495000, single_price=33000, lecture_count=44),
    "korea-sci": dict(univ="고려대학교", univ_short="고려대", track="학생부종합 계열적합전형", unit="자연", label="고려대 계열적합전형 자연",
        form="제시문 기반 면접", passages=4, prep_sec=1260, answer_sec=420, questions=3, points="비공개(역량 3축 등급 평가)",
        stage="1단계 서류 100%(5배수) → 2단계 1단계 성적 60% + 면접 40%", ratio_src="2027 수시모집요강 학생부종합(계열적합전형) 전형요소",
        lang="한국어", scope="수학·과학 교과 통합(허브 개념형), 계산·자료 해석 포함", eval_axes=["분석력", "적용력", "종합적 사고력"],
        src=["2027 고려대 수시모집요강 Ⅴ 면접평가 안내 p.29(준비 21분·면접 7분)", "고려대 선행학습영향평가 보고서 2024~2026 문항카드", "은행 spec/SPEC_v1.md·PRACTICE_META_v1.md"],
        status="on_sale", sku="pass-korea-sci", price=495000, single_price=33000, lecture_count=53),
    "korea-eq-hum": dict(univ="고려대학교", univ_short="고려대", track="학생부종합 고른기회전형", unit="인문", label="고려대 고른기회전형 인문",
        form="제시문 기반 면접", passages=4, prep_sec=720, answer_sec=360, questions=3, points="비공개(역량 3축 등급 평가)",
        stage="1단계 서류 100%(3배수) → 2단계 1단계 성적 60% + 면접 40%, 수능 최저 없음", ratio_src="2027 수시모집요강 학생부종합(고른기회전형) 전형요소",
        lang="한국어", scope="국어·사회·윤리·과학 교과 통합(2026 문항카드: 생물 다양성·문화 상대주의·규칙 공리주의·문학)", eval_axes=["분석력", "적용력", "종합적 사고력"],
        src=["2027 고려대 수시모집요강 Ⅴ 면접평가 안내 p.29(준비 12분·면접 6분)", "2027 입학전형시행계획 p.13(모집 199명)", "고려대 선행학습영향평가 보고서 2024~2026 고른기회전형 문항카드"],
        status="on_sale", open_date="2026-09-14", sku="pass-korea-eq-hum", price=495000, single_price=33000, lecture_count=None, admission_quota=199),
    "korea-eq-sci": dict(univ="고려대학교", univ_short="고려대", track="학생부종합 고른기회전형", unit="자연", label="고려대 고른기회전형 자연",
        form="제시문 기반 면접", passages=4, prep_sec=720, answer_sec=360, questions=3, points="비공개(역량 3축 등급 평가)",
        stage="1단계 서류 100%(3배수) → 2단계 1단계 성적 60% + 면접 40%, 수능 최저 없음", ratio_src="2027 수시모집요강 학생부종합(고른기회전형) 전형요소",
        lang="한국어", scope="사회·과학·수학 교과 통합(2026 문항카드: 과학 실험·이론과 비교·설명)", eval_axes=["분석력", "적용력", "종합적 사고력"],
        src=["2027 고려대 수시모집요강 Ⅴ 면접평가 안내 p.29(준비 12분·면접 6분)", "2027 입학전형시행계획 p.13(모집 199명)", "고려대 선행학습영향평가 보고서 2024~2026 고른기회전형 문항카드"],
        status="on_sale", open_date="2026-09-14", sku="pass-korea-eq-sci", price=495000, single_price=33000, lecture_count=None, admission_quota=199),
    # 연세대 기회균형 (2026-10 판매 개시 예정, 인강 없음). 출처 = 2027 연세대 수시모집요강 R3_sources/yonsei_2027_susi_mojip.txt
    # :2489, :2498 (1단계 서류 100 선발 300%, 2단계 1단계 60 + 면접 40), :2497~2501 (현장 녹화 면접, 제시문 기반 논리적 사고력 및 의사소통 능력),
    # :2511 (수능최저 적용하지 않음), :2535, :4002 (면접 11.1.(일)), :4006 (답변 준비 8분, 면접 5분), :4013~4014 (출제 범위), :2395 (모집 합계 195).
    # 2024~2026 기회균형 문항카드 3장 = 전 계열 1세트, 제시문 4/3/4편, 문제 2개, 60점과 40점 (은행 research/PASTEXAM_YEQ.md, _ops/understand/R3_gigyun_exam.md §2-3).
    # passages 는 정수 하나만 받는다(허브 카드 %d). 2026 문항카드 값 4 를 싣고 2025 의 3편은 초안 각주가 밝힌다
    "yonsei-eq": dict(univ="연세대학교", univ_short="연세대", track="학생부종합 기회균형", unit="전 계열", label="연세대 기회균형",
        form="제시문 기반 면접", passages=4, prep_sec=480, answer_sec=300, questions=2, points="문항별 배점 공개(2024~2026 기출 문제 1 60점, 문제 2 40점)",
        stage="1단계 서류 100%(3배수) → 2단계 1단계 성적 60% + 면접 40%, 수능 최저 없음", ratio_src="2027 수시모집요강 Ⅴ_5",
        lang="한국어", scope="전 계열 공통 1세트(2024~2026 문항카드), 인문과 사회 제시문에 과학 제시문 1~2편 통합, 2027 요강상 수리, 통계 자료나 과학 관련 제시문 포함 가능",
        eval_axes=["제시문 기반 논리적 사고력", "의사소통 능력"],
        src=["2027 연세대 수시모집요강 Ⅴ_5(p.38) 전형 방법, Ⅸ_3(p.63) 답변 준비 8분과 면접 5분", "2027 연세대 수시모집요강 모집인원 표(기회균형 합계 195명)",
             "연세대 선행학습영향평가 보고서 2024~2026 기회균형 문항카드(2024 카드 28, 2025 카드 18, 2026 카드 12)"],
        status="on_sale", sku="pass-yonsei-eq", price=495000, single_price=33000, lecture_count=None, admission_quota=195, exam_date="2026-11-01"),
}

PASTEXAM = {
    "yonsei-hum": W / "interview_pastexam_2026/yonsei/sets/yonsei_2026_gichul_hum.json",
    "yonsei-sci": W / "interview_pastexam_2026/yonsei/sets/yonsei_2026_gichul_sci.json",
    "yonsei-intl": W / "interview_pastexam_2026/yonsei/sets/yonsei_2026_gichul_intl.json",
    "korea-hum": [W / "interview_pastexam_2026/korea/sets/korea_2026_gichul_hum_am.json", W / "interview_pastexam_2026/korea/sets/korea_2026_gichul_hum_pm.json"],
    "korea-sci": [W / "interview_pastexam_2026/korea/sets/korea_2026_gichul_sci_am.json", W / "interview_pastexam_2026/korea/sets/korea_2026_gichul_sci_pm.json"],
}


def sha8(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()[:8]


def bank_summary(code):
    if code not in BANKS:
        return None
    d, pred = BANKS[code]
    dirs = d if isinstance(d, list) else [d]
    rows = []
    files = []
    for one in dirs:
        files.extend(sorted(glob.glob(str(one / "*.json"))))
    for f in files:
        j = json.load(open(f, encoding="utf-8"))
        if not pred(j):
            continue
        qs = j.get("questions") or []
        rows.append(dict(id=j.get("id"), file=f, title=j.get("title"), subtype=j.get("subtype"), track=j.get("track"),
                         prep_seconds=j.get("prep_seconds"), interview_seconds=j.get("interview_seconds"),
                         n_passages=len(j.get("passages") or []), n_questions=len(qs),
                         q_texts=[q.get("text") for q in qs], q_points=[q.get("points") or q.get("internal_points") for q in qs],
                         difficulty=(j.get("bank_meta") or {}).get("difficulty") or (j.get("bank_meta") or {}).get("level"),
                         passage_tags=[p.get("tag") for p in (j.get("passages") or [])],
                         passage_langs=[p.get("lang") for p in (j.get("passages") or [])],
                         has_explanation=bool(j.get("explanation"))))
    if not rows:
        # 종전에는 빈 은행이 아래 most_common(1)[0] 에서 IndexError 로 죽었다. 어느 은행이 비었는지 말하고 멈춘다
        sys.exit(f"facts_build: {code} 은행 세트 0건 ({', '.join(str(x) for x in dirs)}). 은행 sets/ 완주 뒤 다시 실행한다")
    sub = collections.Counter(r["subtype"] for r in rows)
    trk = collections.Counter(r["track"] for r in rows)
    diff = collections.Counter(r["difficulty"] for r in rows)
    # 발문 끝 동사(유형 표지) 빈도
    verbs = collections.Counter()
    for r in rows:
        for t in r["q_texts"]:
            t = (t or "").strip().rstrip(".")
            for k in ["설명하시오", "비교하시오", "평가하시오", "말해 보시오", "제시하시오", "논하시오", "서술하시오", "밝히시오", "분석하시오", "추론하시오", "구하시오", "설명하고", "예측하시오", "판단하시오", "찾으시오", "계산하시오"]:
                if t.endswith(k):
                    verbs[k] += 1; break
            else:
                verbs["기타"] += 1
    return dict(dir=", ".join(str(x) for x in dirs), n_sets=len(rows), subtype=dict(sub), track=dict(trk), difficulty=dict(diff), verb_tail=dict(verbs),
                passages_mode=collections.Counter(r["n_passages"] for r in rows).most_common(1)[0][0],
                questions_mode=collections.Counter(r["n_questions"] for r in rows).most_common(1)[0][0],
                sets=rows)


def pastexam_summary(code):
    p = PASTEXAM.get(code)
    if not p:
        return None
    ps = p if isinstance(p, list) else [p]
    out = []
    for f in ps:
        if not os.path.exists(f):
            out.append(dict(file=str(f), missing=True)); continue
        j = json.load(open(f, encoding="utf-8"))
        out.append(dict(file=str(f), id=j.get("id"), title=j.get("title"), n_passages=len(j.get("passages") or []),
                        n_questions=len(j.get("questions") or []), q_texts=[q.get("text") for q in (j.get("questions") or [])],
                        passage_heads=[(p.get("text") or "")[:80] for p in (j.get("passages") or [])]))
    return out


def main():
    idx = {}
    for code, sp in SPEC.items():
        facts = dict(code=code, generated_at="2026-09-10", spec=sp, bank=bank_summary(code), pastexam=pastexam_summary(code))
        if facts["bank"]:
            facts["bank"]["sets"] = [dict((k, v) for k, v in r.items() if k != "file") | {"file": r["file"]} for r in facts["bank"]["sets"]]
        (OUT / f"{code}.json").write_text(json.dumps(facts, ensure_ascii=False, indent=1), encoding="utf-8")
        b = facts["bank"] or {}
        idx[code] = dict(label=sp["label"], status=sp["status"], n_sets=b.get("n_sets"), subtype=b.get("subtype"), verb_tail=b.get("verb_tail"))
        print(f"{code:14s} sets={b.get('n_sets')!s:>4} subtype={b.get('subtype')} prep={sp['prep_sec']} ans={sp['answer_sec']} q={sp['questions']}")
    (OUT / "_index.json").write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
