#!/usr/bin/env python3
"""대학별 면접 정보 면 30면의 자료 묶음 컴파일러 (2026-11-16, 건우 결재 SEO2-1 ②, SEO2-11 ②, SEO2-12 ②).

저장소 밖 원천을 한 번 읽어 _tools/fixtures/interview_info_2027.json 을 만든다. 빌드(build_interview_info.py)는 그 묶음만 읽는다.
  원천 1  요강 사실 파일 ~/unjang/_shared/ops/20261116_SEO_GEO_AEO_재부양/s2_facts/<slug>.json 30개 (면접일, 발표일, 모집 인원, 면접 방식 인용)
  원천 2  2027 학종 감사 원장 _tools/fixtures/admissions_ledger_2027_90be4fd6.json (sha 핀. interview_basis, interview_minutes, selection_ratio)
  원천 3  v24 판매 정본 승자 HTML (guidebook_sources.V24_BUILD_ROOT, winner.json) 3부 유형 군과 문항
  원천 4  _tools/guidebook_catalog.json (판매 30곳, 판매 면 맛보기 samples)
  원천 5  사실 파일 doc.local_path 의 요강 PDF (줄 단위 보정 TRACK_FIX, STAGE1_NONE 의 인용 대조와 면접 방식 절 요강 문구 대조에만. pdftotext 필요)
싣지 않는 것: 사실 파일의 official_notices, unresolved, notes, null_reasons(요강 밖 공지 값과 작업 메모), 원장의 모집 인원 문구,
유형별 문항 수와 비율(등급 세 단계만 남긴다, SEO2-12 ②). null_reasons 는 TRACK_FIX, STAGE1_NONE 의 근거 문구 대조에만 읽는다.
면에 싣는 날짜, 인원, 면접 시간은 사실 파일 tracks 값이거나 요강 쪽 번호와 인용이 붙은 보정 값뿐이다(2026-11-16 추가 명세 결정 3).
요일: 요강 표기의 요일과 달력에서 계산한 요일이 다르면 멈춘다.
사용: python3 _tools/compile_interview_info.py [--check]   (--check = 다시 만들어 저장소 묶음과 바이트 대조만)
"""
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from guidebook_sources import V24_BUILD_ROOT as V24_ROOT, text, type_label, v24_inputs   # noqa: E402

OUT = HERE / "fixtures" / "interview_info_2027.json"
FACTS_DIR = Path.home() / "unjang" / "_shared" / "ops" / "20261116_SEO_GEO_AEO_재부양" / "s2_facts"
CATALOG = HERE / "guidebook_catalog.json"
META_V3 = HERE / "guidebook_meta_v3.json"
CHECKED = "2026-11-16"   # 요강 사실 파일 대조일 (s2_facts 수집, 2026-11-16)
WD = "월화수목금토일"
GRADES = ("자주 나옴", "보통", "가끔 나옴")
BAN = ("·", "—", "–", "∙", "‧", "・", "•", "→")

# 표에 싣는 모집단위 범위 글에서 걷어 낼 작업 메모의 표지. 걷은 뒤에도 남으면 컴파일이 멈춘다.
META = re.compile(r"official|notices|p\.\s?\d|\d+\s*쪽|요강|참조|렌더|그림|트랙|별도 행|행 표기|같은 칸|모집인원 표|시각은|표의|표에서|"
                  r"입실|배정은|물리 ?(?:p|\d|쪽)|확인|아래 항목|아래 두|면접 장소|수능|최저")


# ---------------------------------------------------------------- 날짜와 요일
def weekday_ko(iso):
    return WD[date.fromisoformat(iso).weekday()]


_MARK = re.compile(r"(?<!\d)(?:(\d{1,2})\s*[.월/]\s*)?(\d{1,2})\s*[.일]?\s*\(\s*([월화수목금토일])\s*\)")


def wd_marks(s):
    """요강 표기의 (월 또는 None, 일, 요일) 목록. '2026. 12. 5.(토) ~ 6.(일)', '12월 11일(금)', '26.12.11.(금)' 꼴."""
    return [(int(m.group(1)) if m.group(1) else None, int(m.group(2)), m.group(3)) for m in _MARK.finditer(str(s or ""))]


def src_wd(iso, texts):
    """iso 날짜에 해당하는 요강 표기 요일. 그 날짜의 표기가 없으면 ValueError (대조할 수 없는 날짜는 싣지 않는다)."""
    d = date.fromisoformat(iso)
    for s in texts:
        for mo, dd, w in wd_marks(s):
            if dd == d.day and (mo is None or mo == d.month):
                return w
    raise ValueError(f"{iso}: 요강 표기에서 이 날짜의 요일을 찾지 못함 {texts!r}")


def day(iso, texts):
    """{'iso','wd'}. 요강 표기 요일과 달력 요일이 다르면 ValueError (빌드를 멈춘다)."""
    w = src_wd(iso, texts)
    if w != weekday_ko(iso):
        raise ValueError(f"{iso}: 요강 표기 요일 {w} 와 달력 요일 {weekday_ko(iso)} 가 다르다 {texts!r}")
    return {"iso": iso, "wd": w}


# ---------------------------------------------------------------- 글 정리
def san(s):
    """지면 금지 문자(가운뎃점, 줄표류)를 사이트 관행대로 쉼표로, 공백 정리."""
    s = str(s or "")
    s = re.sub(r"\s*·\s*", ", ", s)
    for ch in BAN:
        s = s.replace(ch, ", ")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s*,\s*,\s*", ", ", s)
    s = re.sub(r"\s+,", ",", s)
    return s.strip(" ,")


def _drop_meta_parens(s):
    """괄호 묶음 가운데 작업 메모 표지가 든 것을 통째로 지운다. 「」 안의 괄호는 짝 셈에서 뺀다."""
    out, i, n = [], 0, len(s)
    while i < n:
        if s[i] == "(":
            depth, j, q = 0, i, 0
            while j < n:
                c = s[j]
                if c == "「":
                    q += 1
                elif c == "」":
                    q = max(0, q - 1)
                elif not q and c == "(":
                    depth += 1
                elif not q and c == ")":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            inner = s[i + 1:j]
            if j < n and META.search(inner):
                i = j + 1
                continue
            if j >= n:   # 짝 없는 괄호는 그대로
                out.append(s[i:]); break
            out.append("(" + _drop_meta_parens(inner) + ")")
            i = j + 1
            continue
        out.append(s[i])
        i += 1
    return "".join(out)


REWRITE = [   # 표지 걷기만으로 뜻이 사라지는 꼴 (사실 파일의 범위 글 원문 꼴 그대로 대응)
    (re.compile(r"\s*\(물리 p\.\d+ 모집인원 표의 계열 '[^']+': (.*)\)$"), r": \1"),
    (re.compile(r"\(모집단위 (\S+) \d+명, 물리 \d+쪽\)"), r" \1"),
    (re.compile(r"^\[\*\] 표시 양일 모집단위"), "양일 중 하루 배정 모집단위"),
    (re.compile(r"^전체 모집단위\(신학과 제외, 신학과는 별도 행\)$"), "신학과 외 전체 모집단위"),
    # 개조식 꼬리('포함')로 끝나는 범위 글은 지면 합쇼체와 섞인다(문체 게이트 R-1). 같은 사실을 명사구로
    (re.compile(r"^인문계/예체능계 \[경영대학 자연계 모집 단위 포함\]$"), "인문계, 예체능계와 경영대학 자연계 모집단위"),
    (re.compile(r"^전 모집단위\(수의과대학, 의과대학 제외\), 사범대학은 교직적성·인성면접 포함$"),
     "전 모집단위(수의과대학, 의과대학 제외)와 사범대학 교직적성, 인성면접"),
]


def clean_scope(s):
    """사실 파일의 모집단위 범위 글에서 작업 메모(쪽 번호, 대조 경위, 공지 참조)를 걷고 지면 꼴로."""
    s = str(s or "").strip()
    for pat, rep in REWRITE:
        s = pat.sub(rep, s)
    s = _drop_meta_parens(s)
    m = re.match(r"^(.*?[^\d\s])\.\s+(.*)$", s)
    if m and META.search(m.group(2)):
        s = m.group(1)
    s = re.sub(r"^\d{1,2}\.\s*\d{1,2}\.\s*\([월화수목금토일]\)\s*", "", s)
    s = re.sub(r"^\d{1,2}월\s*\d{1,2}일\s*\([월화수목금토일]\)\s*", "", s)
    s = re.sub(r"^면접 모집단위\s*:\s*", "", s)
    s = re.sub(r"<([^<>]+)>", r"\1", s)
    s = re.sub(r"\s+:", ":", s)
    return san(s)


LABEL_FIX = {   # 발표일 갈래 표시. 수능 최저 같은 요강의 다른 사항은 싣지 않는다
    "ACE전형 의학과, 약학과 제외 전 모집단위": "약학과 제외 모집단위",
    "약학과(ACE전형)": "약학과",
    "일반학과(부), 약학과 제외(수능최저 없음)": "약학과 제외 모집단위",
    "약학과(수능최저 적용)": "약학과",
}
MAIN_LABEL_FIX = {("catholic", "전체 모집단위"): "신학과 외 전체 모집단위"}


def clean_ratio(s):
    """원장 selection_ratio 에서 선발 방식만. 모집 인원 문구 조각(세미콜론으로 갈린 앞 조각)은 버린다(인원은 사실 파일 값만 싣는다)."""
    segs = [x.strip() for x in re.split(r";\s*", str(s or "")) if x.strip()]
    keep = [x for x in segs if "%" in x]
    if not keep:
        raise ValueError(f"선발 방식에 반영 비율이 없다: {s!r}")
    return san(", ".join(keep))


# 개조식 종결(-함, -음, -임, -됨)로 끝나는 문장이 든 인용은 지면 합쇼체와 섞인다(문체 게이트 R-1). 그런 인용은 싣지 않고 쪽 번호만 남긴다
_GAEJO = re.compile(r"(?:함|음|임|됨)(?=\s*(?:\([^()]*\))?\s*(?:[.\]]|$|\s\d\)|\s[가-하]\)))")


def clean_quote(s):
    """요강 인용 한 줄: 머리 글머리표를 떼고 금지 문자를 쉼표로. 표 칸을 이어 붙인 인용(' | ', ' - ')은 문장이 아니라 싣지 않는다(None)."""
    s = str(s or "")
    if " | " in s or " - " in s or _GAEJO.search(s):
        return None
    s = re.sub(r"^[\s•∙·–\-]+", "", s)
    return san(s)


_TITLE_NOTE = re.compile(r"파일명|표기|공고|첨부|수정")


def clean_title(s):
    """요강 문서 제목에서 수집 메모 괄호(첨부 파일명, 표지 표기, 공고 이력)를 걷는다."""
    out, depth, start, keep = [], 0, None, []
    s = str(s or "")
    i = 0
    while i < len(s):
        c = s[i]
        if c == "(":
            if depth == 0:
                start = i
            depth += 1
        elif c == ")" and depth:
            depth -= 1
            if depth == 0:
                grp = s[start:i + 1]
                if not _TITLE_NOTE.search(grp):
                    keep.append(grp)
                start = None
                i += 1
                continue
        if depth == 0:
            keep.append(c)
        i += 1
    return san("".join(keep))


# ---------------------------------------------------------------- 유형과 문항
REVIEW_TAG = "선배 후기 확인"   # v24 3부 군 제목의 꼬리표. 이 표가 없는 군(경희대 '공식 예시문항', 부산대 '학종 공식 면접문항 예시')은 대학이 낸 예시 문항이다


def v24_groups(html_path):
    """v24 승자 HTML 3부 → [(유형명, [문항 글, ...], 후기 군 여부), ...]. 문항 글 = li 에서 학과 연도(qm)와 현행 주의(qnote)를 뺀 글.
    후기 군 = 군 제목에 '선배 후기 확인' 꼬리표가 붙은 군(선배 면접 후기에서 회수한 기출). 예시 군은 등급 목록과 대표 기출에서 뺀다."""
    s = Path(html_path).read_text(encoding="utf-8").replace("⁠", "")
    out = []
    for gh, ol in re.findall(r'<div class="qgrp[^"]*">\s*<div class="gh">(.*?)</div>\s*<ol class="qs">(.*?)</ol>', s, flags=re.S):
        lis = re.findall(r"<li>(.*?)</li>", ol, flags=re.S)
        qs = [text(re.sub(r'<span class="(?:qm|qnote)">.*?</span>', "", li, flags=re.S)) for li in lis]
        out.append((type_label(gh), qs, REVIEW_TAG in text(gh)))
    return out


def type_name(label):
    """지면에 싣는 군 이름. 원천의 분류 표지 '학과 미기재'(학과가 적히지 않은 질문을 같은 군에 넣었다는 표지)는 앞 이름에 '외'를 붙이는 꼴로."""
    out = []
    for p in (x.strip() for x in str(label).split(",")):
        if p == "학과 미기재":
            if out:
                out[-1] += " 외"
            continue
        out.append(p)
    return ",".join(out)


_UNIT_END = ("과", "학부", "대학", "전공")


def is_unit_name(name):
    """군 이름이 모집단위(학과, 학부, 단과대학, 전공) 이름인가. 앞 조각에서 괄호를 걷고 끝말로 본다."""
    head = re.sub(r"\s*\([^()]*\)", "", str(name).split(",")[0]).strip()
    return head.endswith(_UNIT_END)


def grade_types(groups):
    """[(유형명, 문항 수)] (v24 순서) → 비중 큰 순서의 [{'name','grade'}]. 등급 = 경쟁 순위(같은 수는 같은 순위)를 셋으로 나눈 칸.
    순위가 ceil(n/3) 이하 자주 나옴, ceil(2n/3) 이하 보통, 그 밖 가끔 나옴. 수치는 싣지 않는다."""
    n = len(groups)
    order = sorted(range(n), key=lambda i: (-groups[i][1], i))
    a, b = math.ceil(n / 3), math.ceil(2 * n / 3)
    out = []
    for i in order:
        name, c = groups[i]
        rank = 1 + sum(1 for _, x in groups if x > c)
        out.append({"name": name, "grade": GRADES[0] if rank <= a else GRADES[1] if rank <= b else GRADES[2]})
    return out


# 앞 문답에 기대는 머리말(오, 마지막으로 포함)과 숫자가 빠진 단위 머리(년간, 개월, 번째)
_LEAD = re.compile(r"^(n |Q\d|네[ ,.]|아[ ,.]|오[ ,.]|좋습니다|그렇지만|그럼|그러면|그래|그렇군요|그렇다면|그 |그중|이제|더 |또 |두 |앞서|그런데|근데|음|자,|"
                   r"라고|라는|이라고|학년|학기|년간|년 |개월|번째|마지막으로|한 ?번 |아까|방금|구체적으로)")
_SPEAKER = re.compile(r"^\S{1,4}\s*:")   # 화자 표지(「L : 」, 「Q:」)
_QBAD = ("·", "—", "–", "∙", "‧", "・", "•", "…", "○", "꼬리", "[", "]", "(", ")", "<", ">", "*", '"', "“", "”", "'", "~", "%", "..", "→", "십시오")
# 물음표로 끝나는 문항의 마지막 글자. 이 밖(「…생각?」, 「…봉사활동?」, 「…하고 싶은 말?」)은 끝이 잘렸거나 두 문항이 붙은 전사 조각이다
_Q_END = "요까죠가나지은는면데다니냐"


# 해라체와 개조식 종결 문항은 지면 합쇼체와 섞인다(문체 게이트 R-1). 합쇼체 '-니다' 는 뺀다
_HAERA = re.compile(r"(?:는가|은가|인가|한가|던가|느냐|냐|니|(?<!니)다|함|음|임|됨)\s*[?.!]?(?=\s|$)")


def eligible(q):
    """대표 기출로 옮길 수 있는 문항인가. 앞 질문에 기대는 꼬리 꼴, 원문 표기 기호, 전사 조각, 수치 표기를 거른다(결정적 규칙)."""
    if not 18 <= len(q) <= 60:
        return False
    if _LEAD.match(q) or _SPEAKER.match(q) or re.match(r"^[A-Za-z]\S*[가-힣]", q):
        return False
    if any(b in q for b in _QBAD) or re.search(r"[ㄱ-ㅎㅏ-ㅣ]", q):
        return False
    if q.count("?") > 1 or " ?" in q or _HAERA.search(q):
        return False
    if re.search(r"\d+\.\s", q) or re.search(r"\d[\d,]*\s*(문항|문|건)(?![가-힣])", q):
        return False
    if q.endswith("?"):
        return q[-2] in _Q_END
    return bool(re.search(r"(?:[요까가나죠]|니다)\.?$", q))


PICK_SKIP = ("꼬리", "블라인드", "마무리")   # 앞 문답이나 면접 진행에 기대는 유형은 대표 문항으로 뽑지 않는다(목록에는 싣는다)


def _is_sample(q, samples):
    for s in samples:
        if q == s or s.startswith(q) or (s.endswith("…") and q.startswith(s[:-1].rstrip())):
            return True
    return False


def pick_questions(groups, samples, used, want=4):
    """대표 기출 want 문. groups = [(유형명, [문항 글], 후기 군 여부)] v24 순서, samples = 판매 면 맛보기 글(앞 len(samples) 유형의 첫 문항).
    1차: 맛보기에 쓰이지 않은 후기 군을 비중 큰 순서로 돌며 군마다 첫 적격 문항 하나.
    2차(모자라면): 모든 후기 군을 비중 큰 순서로 돌아가며 같은 군의 다른 적격 문항(맛보기 자리인 첫 문항 제외).
    대학 공식 예시 군(후기 군 아님)은 고르지 않는다. used = 앞 대학에서 이미 쓴 문항(면끼리 같은 문항 금지)."""
    k = len(samples)
    order = sorted(range(len(groups)), key=lambda i: (-len(groups[i][1]), i))
    picked, taken = [], set()

    def ok(q):
        return eligible(q) and not _is_sample(q, samples) and q not in used and q not in taken

    def skip(gi):
        t, _, review = groups[gi]
        return not review or any(w in t for w in PICK_SKIP)

    for gi in order:
        t, qs, _ = groups[gi]
        if gi < k or skip(gi):
            continue
        for li, q in enumerate(qs):
            if ok(q):
                picked.append({"type": type_name(t), "q": q, "src": [gi, li]}); taken.add(q)
                break
        if len(picked) == want:
            return picked
    while len(picked) < want:
        grew = False
        for gi in order:
            t, qs, _ = groups[gi]
            if skip(gi):
                continue
            for li, q in enumerate(qs):
                if gi < k and li == 0:
                    continue
                if ok(q):
                    picked.append({"type": type_name(t), "q": q, "src": [gi, li]}); taken.add(q); grew = True
                    break
            if len(picked) == want:
                return picked
        if not grew:
            break
    return picked


# ---------------------------------------------------------------- 인원, 시간, 전형명 보정
def quota_value(name, quota):
    """사실 파일 quota 의 값. 전형 이름이 'OO 제외' 인데 근거가 그 OO 를 포함한 전형 전체 값이라고 적으면 이 줄의 값이 아니다(None).
    인하대 「인하미래인재(면접형)-의예과 제외」 939명 = 의예과 16명을 포함한 면접형 전체, 요강에 제외 부분 합계 줄 없음."""
    if not quota:
        return None
    basis = str(quota.get("basis") or "")
    if "제외" in name and "포함" in basis and "포함하지 않" not in basis:
        return None
    return quota.get("value")


_MIN_SPOT = re.compile(r"(?:평가시간|면접 ?시간)[은는이가]?\s*(\d+\s*(?:~\s*\d+\s*)?분(?:\s*(?:내외|이내))?)")
_MIN_ANY = re.compile(r"\d+\s*(?:~\s*\d+\s*)?분(?:\s*(?:내외|이내))?")


_TIME_SIMPLE = re.compile(r"(?:약 )?\d+(?:~\d+)?분(?: 내외| 이내|간)?")


def _time_norm(s):
    return re.sub(r"\s*~\s*", "~", re.sub(r"\s+", " ", str(s or "")))


def ledger_time_text(L, fmt):
    """원장 interview_time_text(요강이 면접 시간에 붙인 글자 그대로, 「10분 내외」, 「약 10분간」) 또는 None.
    면에 싣는 시간은 사실 파일 글에 있는 값만이라(결정 3) 그 표기가 사실 파일 면접 방식 글이나 인용에 없으면 멈춘다.
    칸 이름이 붙은 여러 시간 표기(부산대 의예과)는 여기서 받지 않는다. 그런 줄은 TRACK_FIX 의 쪽과 인용이 붙은 표기만 싣는다.
    2026-11-16 명세 E 4절 3항(원장 재대조 s2_ledger 의 대조와 독립 대조가 일치한 꾸밈말)."""
    txt = L.get("interview_time_text")
    if txt is None:
        return None
    if not _TIME_SIMPLE.fullmatch(txt):
        raise ValueError(f"원장 interview_time_text {txt!r} 는 수 하나와 꾸밈말 꼴이 아니다. 줄 단위 보정(TRACK_FIX)으로만 싣는다")
    hay = _time_norm(" ".join([str(fmt.get("text") or ""), str(fmt.get("quote") or "")]
                              + [str(x.get("quote") or "") for x in fmt.get("quotes_extra") or []]))
    if _time_norm(txt) not in hay:
        raise ValueError(f"원장 interview_time_text {txt!r} 가 사실 파일 면접 방식 글과 인용에 없다")
    return txt


def minutes_note(ledger_minutes, fmt_text):
    """(면접 시간 표기, 모집단위마다 다름 여부). 원장 interview_minutes 가 있으면 원장만 쓴다((None, False)).
    원장이 null 이면 사실 파일 interview_format 글에서 「평가시간은 8~10분 내외」처럼 시간 낱말에 붙은 표기가 하나뿐일 때 그 표기를,
    분 표기가 여럿이면 모집단위마다 다름, 하나도 없으면 요강에 없음((None, False))."""
    if ledger_minutes is not None:
        return None, False
    s = str(fmt_text or "")
    spot = list(dict.fromkeys(re.sub(r"\s*~\s*", "~", m) for m in _MIN_SPOT.findall(s)))
    if len(spot) == 1:
        return spot[0], False
    return None, len(set(_MIN_ANY.findall(s))) > 1


# 줄 단위 보정. 면에 싣는 값은 사실 파일 tracks 값이거나, 여기 적은 값처럼 요강 쪽 번호와 인용이 붙은 값뿐이다(2026-11-16 추가 명세 결정 3).
# 인용은 컴파일 때 사실 파일 doc 의 요강 PDF(sha 대조) 그 쪽 글에 글자 그대로 있는지 본다(check_evidence, 없으면 멈춘다).
TRACK_FIX = {   # 원장 전형명이 요강 구분과 맞지 않는 줄. 사실 파일 unresolved 가 「트랙명 재정의가 필요하다」고 적었다
    ("pusan", "학생부종합전형(의예과)"): {
        # 요강 2차 수정판(sha e68314ac) 36쪽: 의예과의 학생부종합 칸은 비고 지역인재Ⅰ 30. 39쪽: 지역의사선발전형 의예과 합계 31.
        # 37, 40, 67쪽: 두 전형 의예과 모두 4배수, 1단계 80%+면접 20%, 면접일 12-05(원장 선발 방식과 같다). 2026-11-16 본 세션 결정 2 로 재대조
        "name": "의예과(지역인재전형Ⅰ, 지역의사선발전형)",
        "name_evidence": [(67, "1. 대상자 : 학생부종합(학생부종합전형, 지역인재전형Ⅰ, 지역의사선발전형) 1단계 합격자")],
        "dates_basis": "지역인재전형Ⅰ, 지역의사선발전형",
        "parts": [("지역인재전형Ⅰ", 30, "지역인재Ⅰ 칸이 30",
                   [(36, "전형 3. 학생부종합(학생부종합전형/지역인재전형Ⅰ)"), (36, "의과대학 의예과 30")]),   # 30 은 지역인재Ⅰ 열(시험이 글자 위치로 본다)
                  ("지역의사선발전형", 31, "지역의사선발전형 합계 31",
                   [(39, "전형 4. 학생부종합(지역의사선발전형)"), (39, "의과대학 의예과"), (39, "합계 31")])],
        # 원장 면접 시간 20분은 공통문제 답변 면접 10분과 학생부 기반 면접 10분의 합이라 요강에 없는 값이다. 요강 표의 소요시간 표기를 싣는다
        "time_text": "공통문제 답변 준비 10분 내외, 공통문제 답변 면접 10분 내외, 학생부 기반 면접 10분 내외",
        "time_facts": "공통문제 답변 준비 10분, 고사실A에서 공통문제 답변 면접 10분, 고사실B에서 학생부 기반 면접 10분",
        "time_evidence": [(67, "의과대학 의예과"), (67, "공통문제 답변"), (67, "준비 10분 내외, 면접 10분 내외"), (67, "학생부 기반 면접 10분 내외")],
    },
}


def _evs(pairs):
    return [{"page": p, "quote": q} for p, q in pairs]


def track_fix(slug, t):
    """줄 단위 보정 {'name', 'name_evidence', 'quota_parts', 'time_text', 'time_evidence'} 또는 None.
    고친 줄은 사실 파일의 근거 문구(null_reasons, interview_format)가 그대로일 때만 쓰고, 다르면 멈춘다."""
    fx = TRACK_FIX.get((slug, t["name"]))
    if not fx:
        return None
    nr = t.get("null_reasons") or {}
    if t.get("quota") is not None or fx["dates_basis"] not in str(nr.get("dates_basis", "")):
        raise ValueError(f"{slug} {t['name']}: 사실 파일이 바뀌었다. 전형명 보정(TRACK_FIX)을 요강과 다시 대조한다")
    for _, _, ev, _ in fx["parts"]:
        if ev not in str(nr.get("quota", "")):
            raise ValueError(f"{slug} {t['name']}: 사실 파일 인원 근거에 {ev!r} 가 없다. 전형명 보정(TRACK_FIX)을 다시 대조한다")
    if fx["time_facts"] not in str((t.get("interview_format") or {}).get("text", "")):
        raise ValueError(f"{slug} {t['name']}: 사실 파일 면접 방식 글에 {fx['time_facts']!r} 가 없다. 시간 보정(TRACK_FIX)을 다시 대조한다")
    return {"name": fx["name"], "name_evidence": _evs(fx["name_evidence"]),
            "quota_parts": [{"label": a, "value": v, "evidence": _evs(pq)} for a, v, _, pq in fx["parts"]],
            "time_text": fx["time_text"], "time_evidence": _evs(fx["time_evidence"])}


STAGE1_NONE_TEXT = "1단계 없음(일괄합산)"
STAGE1_NONE = {   # 요강이 일괄합산(1단계 선발 없음)이라고 적은 전형. 30곳 60전형 가운데 1단계 발표일이 없는 줄은 이것 하나다(2026-11-16 결정 6)
    ("seoultech", "군위탁전형"): [(63, "※ 학생부종합(군위탁전형)은 일괄합산 전형으로 지원자 전원이 면접 대상"),
                              (51, "10. 학생부종합(군위탁전형)"), (51, "일괄합산 1,000점")],
}


def stage1_none(slug, t):
    """일괄합산 전형의 1단계 칸 {'text', 'evidence'} 또는 None. 사실 파일에 1단계 발표일이 있거나 null 사유가 일괄합산이 아니면 멈춘다."""
    ev = STAGE1_NONE.get((slug, t["name"]))
    if not ev:
        return None
    why = str((t.get("null_reasons") or {}).get("stage1_announce", ""))
    if t.get("stage1_announce") or t.get("stage1_announce_split") or "일괄합산" not in why:
        raise ValueError(f"{slug} {t['name']}: 사실 파일의 1단계 칸이 일괄합산 근거와 맞지 않는다. STAGE1_NONE 을 요강과 다시 대조한다")
    return {"text": STAGE1_NONE_TEXT, "evidence": _evs(ev)}


_PDF_TEXT = {}


def pdf_page_text(doc, page, layout=True):
    """사실 파일 doc 의 요강 PDF 한 쪽 글(연속 공백 한 칸). layout=True 는 pdftotext -layout(같은 높이의 칸을 한 줄로 잇는다),
    False 는 기본 읽기 순서(칸마다 따로 나온다). PDF sha 가 사실 파일 값과 다르면 멈춘다."""
    p = Path(doc["local_path"])
    key = (str(p), page, layout)
    if key not in _PDF_TEXT:
        if hashlib.sha256(p.read_bytes()).hexdigest() != doc["sha256_actual"]:
            raise ValueError(f"요강 PDF sha 가 사실 파일 값과 다르다: {p}")
        exe = shutil.which("pdftotext")
        if not exe:
            raise ValueError("pdftotext 가 없어 요강 PDF 글을 대조할 수 없다")
        out = subprocess.run([exe, "-q"] + (["-layout"] if layout else []) + ["-f", str(page), "-l", str(page), str(p), "-"],
                             capture_output=True, text=True, check=True).stdout
        _PDF_TEXT[key] = re.sub(r"\s+", " ", out)
    return _PDF_TEXT[key]


def check_evidence(slug, doc, evs):
    for e in evs:
        if e["quote"] not in pdf_page_text(doc, e["page"]):
            raise ValueError(f"{slug}: 보정 근거 인용이 요강 {e['page']}쪽에 없다 {e['quote']!r}")


_QNORM = re.compile(r"[\s,·∙•‧・]")


def quote_in_text(q, page_text):
    """인용 q 가 요강 쪽 글 page_text 에 이어진 글로 있는가. 공백, 쉼표, 글머리표 차이는 보지 않는다(san 이 가운뎃점을 쉼표로 바꾼다)."""
    q = _QNORM.sub("", str(q or ""))
    return bool(q) and q in _QNORM.sub("", str(page_text or ""))


def page_quote(doc, page, q):
    """면접 방식 절에 싣는 요강 문구. 요강 PDF 그 쪽 읽기 순서 글에 이어진 글로 없으면 싣지 않는다(None, 근거 쪽 번호는 남는다).
    표의 서로 다른 칸을 이은 사실 파일 인용(부산대 67쪽 평가기준 칸 「논리적 의사표현능력」과 소요시간 칸 「준비 10분 내외, 면접 10분 내외」)은
    -layout 글에서는 같은 높이라 한 줄로 이어 보이지만 읽기 순서 글에서는 끊긴다(2026-11-16 검토 지적).
    글자 층이 없는 쪽(경기대 53쪽, 사실 파일이 렌더 그림에서 읽음)은 대조할 수 없어 사실 파일 인용을 그대로 둔다."""
    if not q:
        return None
    txt = pdf_page_text(doc, page, layout=False)
    if not txt.strip():
        return q
    return q if quote_in_text(q, txt) else None


# ---------------------------------------------------------------- 대학 한 곳
def _texts(x):
    out = [x.get("text"), x.get("quote")]
    cc = x.get("cross_check")
    if isinstance(cc, dict):
        out += [cc.get("quote"), cc.get("date_line")]
    return [s for s in out if s]


def _announce(slug, t, key, split_key):
    """발표일 칸: [{'label','iso','wd'}]. 빈 목록 = 요강에 값 없음. 전형 단위 갈래 목록이 있으면 그것이 전부, 안쪽 by_scope 는 덧붙는 갈래."""
    main = t.get(key)
    lst = t.get(split_key)
    if lst:
        items = [(LABEL_FIX.get(x["scope"], x["scope"]), x) for x in lst]
    elif main:
        items = [(None, main)]
        if main.get("by_scope"):
            ml = MAIN_LABEL_FIX.get((slug, main.get("scope")), main.get("scope") or "그 밖의 모집단위")
            items = [(ml, main)] + [(LABEL_FIX.get(x["scope"], x["scope"]), x) for x in main["by_scope"]]
    else:
        return []
    out = []
    for label, x in items:
        lab = clean_scope(label) if label else None
        if lab and META.search(lab):
            raise ValueError(f"{slug} {t['name']} {key}: 표시 글에 작업 메모 {lab!r}")
        out.append({"label": lab, **day(x["iso"], _texts(x))})
    return out


def _interviews(slug, t):
    ds = t["interview_dates"]
    if not ds:
        raise ValueError(f"{slug} {t['name']}: 면접일 없음")

    def inside(a, b):
        return b["iso_start"] >= a["iso_start"] and b["iso_end"] <= a["iso_end"]

    keep = []
    for i, d in enumerate(ds):
        others = [x for j, x in enumerate(ds) if j != i]
        summary = (others and d["scope"].startswith(("전체", "전형 전체")) and d["iso_start"] < d["iso_end"]
                   and all(inside(d, x) for x in others))
        if not summary:
            keep.append(d)
    out = []
    for d in keep:
        lab = clean_scope(d["scope"])
        if META.search(lab) or any(ch in lab for ch in BAN):
            raise ValueError(f"{slug} {t['name']}: 모집단위 글에 작업 메모 {lab!r} (원문 {d['scope']!r})")
        x = {"label": lab, **day(d["iso_start"], _texts(d))}
        if d["iso_end"] != d["iso_start"]:
            e = day(d["iso_end"], _texts(d))
            x["iso_end"], x["wd_end"] = e["iso"], e["wd"]
        out.append(x)
    return out


# 원장 전형 이름을 요강 표기로 고친 줄(2026-11-16 명세 E 4절 1항, 재대조 name 칸의 대조와 독립 대조 일치). 사실 파일 이름은 그대로라
# 원장 쪽 새 이름으로 잇는다. 새 이름의 요강 표기가 그 쪽 글에 있는지 컴파일 때 본다(check_evidence). 정보 면 표기도 원장 새 이름을 쓴다
# (2026-11-17 검토 지적 수리: 판매 면 카드와 정보 면이 같은 전형을 다른 이름으로 불렀다. build_interview_info.check_ledger 가 이름을 맞대 본다)
LEDGER_RENAMED = {
    ("catholic", "잠재능력우수자(면접)전형"): ("잠재능력우수자면접전형", [(57, "학생부종합(잠재능력우수자면접전형)")]),
}   # 울산대 지역인재(기초생활/차상위)는 4절 2항 보류로 원장 이름을 고치지 않았다(2026-11-17)


def ledger_track(slug, doc, lt, name):
    """사실 파일 전형 이름에 맞는 원장 전형. 원장이 이름을 요강 표기로 고친 줄은 LEDGER_RENAMED 로 잇는다."""
    if name in lt:
        return lt[name]
    if (slug, name) in LEDGER_RENAMED:
        new, ev = LEDGER_RENAMED[(slug, name)]
        check_evidence(slug, doc, _evs(ev))
        return lt.get(new)
    return None


def compile_univ(f, ledger_u, groups, samples, used, short):
    slug = f["slug"]
    lt = {t["name"]: t for t in ledger_u["tracks"]}
    tracks = []
    for t in f["tracks"]:
        L = ledger_track(slug, f["doc"], lt, t["name"])
        if L is None or L.get("interview_status") != "conducted":
            raise ValueError(f"{slug}: 원장에 면접 실시 전형 {t['name']!r} 없음")
        fmt = t["interview_format"]
        fx = track_fix(slug, t)
        s1none = stage1_none(slug, t)
        ltext = None if fx else ledger_time_text(L, fmt)   # 원장이 요강 꾸밈말을 적었으면 그 글자(정수 칸과 함께 둔다)
        mtext, mvaries = (ltext, False) if ltext else minutes_note(L.get("interview_minutes"), fmt.get("text"))
        tr = {
            "name": san(fx["name"] if fx else L["name"]),   # 원장 이름(이름을 고친 줄은 새 이름). 줄 단위 보정은 요강 쪽 인용이 붙은 이름
            "interviews": _interviews(slug, t),
            "stage1": _announce(slug, t, "stage1_announce", "stage1_announce_split"),
            "final": _announce(slug, t, "final_announce", "final_announce_by_scope"),
            "quota": quota_value(t["name"], t.get("quota")),
            "basis": L.get("interview_basis"),
            "minutes": L.get("interview_minutes"),
            "minutes_text": mtext,
            "minutes_varies": mvaries,
            "prep": L.get("prep_minutes"),
            "ratio": clean_ratio(L.get("selection_ratio")),
            "quote": page_quote(f["doc"], fmt["page"], clean_quote(fmt["quote"])),
            "page": fmt["page"],
        }
        if fx:
            tr["name_evidence"] = fx["name_evidence"]
            tr["quota_parts"] = fx["quota_parts"]
            tr.update(minutes=None, prep=None, minutes_text=None, minutes_varies=False,
                      time_text=fx["time_text"], time_evidence=fx["time_evidence"])
            check_evidence(slug, f["doc"], fx["name_evidence"] + fx["time_evidence"] + [e for x in fx["quota_parts"] for e in x["evidence"]])
        else:   # 원장 시간 값도 사실 파일 면접 방식 글에 있는 값만 싣는다(결정 3)
            mins = {int(m) for m in re.findall(r"(\d+)\s*분", json.dumps(fmt, ensure_ascii=False))}
            for what, v in (("면접 시간", tr["minutes"]), ("준비 시간", tr["prep"])):
                if v is None or v in mins or (v == 0 and what == "준비 시간" and re.search(r"준비 ?시간 ?없", str(fmt.get("text", "")))):
                    continue
                raise ValueError(f"{slug} {t['name']}: 원장 {what} {v}분이 사실 파일 면접 방식 글에 없다. TRACK_FIX 에 근거를 붙이거나 값을 뺀다")
        if s1none:
            tr["stage1_none"] = s1none
            check_evidence(slug, f["doc"], s1none["evidence"])
        tracks.append(tr)
    qs = pick_questions(groups, samples, used)
    if len(qs) != 4:
        raise ValueError(f"{slug}: 대표 기출 {len(qs)}문 (4문이어야 함)")
    review = [(t, q) for t, q, rv in groups if rv]
    doc = f["doc"]
    return {
        "slug": slug, "short": short, "full": re.sub(r"\(.*?\)", "", f["univ"]).strip(),
        "doc": {"title": clean_title(doc["title"]), "url": doc["url"]},
        "tracks": tracks,
        # 질문 군이 전부 모집단위 이름인 책(단국대, 동덕여대, 덕성여대)은 지면이 유형 대신 모집단위 묶음으로 적는다
        "group_kind": "unit" if all(is_unit_name(t) for t, _ in review) else "type",
        "types": grade_types([(type_name(t), len(q)) for t, q in review]),
        "questions": qs,
    }


def _sha16(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()[:16]


def compile_bundle():
    import build_guidebook as B   # 원장 sha 핀 검사와 짧은 대학명(SEARCH) 원장. 판매 상품 상태 스냅샷 검사를 물려받는다
    cat = json.loads(CATALOG.read_text(encoding="utf-8"))
    meta = json.loads(META_V3.read_text(encoding="utf-8"))
    ledger = B.load_ledger()
    sale = sorted((e for e in cat["items"] if e.get("onsale")), key=lambda e: e["slug"])
    if len(sale) != 30:
        raise ValueError(f"판매 {len(sale)}곳 (30곳이어야 함)")
    used, univs, src = set(), [], {"ledger_sha16": B.LEDGER_SHA16, "facts_sha16": {}, "v24_html_sha16": {}}
    for e in sale:
        slug, name = e["slug"], e["name"]
        fp = FACTS_DIR / f"{slug}.json"
        f = json.loads(fp.read_text(encoding="utf-8"))
        if f["slug"] != slug or f["univ"] != name:
            raise ValueError(f"{slug}: 사실 파일 대학 불일치 {f['univ']!r} != {name!r}")
        inp = v24_inputs(name)
        if inp is None:
            raise ValueError(f"{slug}: v24 승자 없음")
        h = hashlib.sha256(inp["html"].read_bytes()).hexdigest()
        if h != meta[slug].get("source_html_sha256"):
            raise ValueError(f"{slug}: v24 HTML sha 가 meta v3 source_html_sha256 과 다르다")
        groups = v24_groups(inp["html"])
        if [g[0] for g in groups] != list(e["types"]):
            raise ValueError(f"{slug}: v24 유형 목록이 카탈로그 types 와 다르다")
        samples = [s["q"] for s in e["samples"]]
        if [s["type"] for s in e["samples"]] != [g[0] for g in groups[:len(samples)]]:
            raise ValueError(f"{slug}: 맛보기 유형이 앞 유형 순서와 다르다")
        u = compile_univ(f, ledger[name], groups, samples, used, B.SEARCH[slug]["u"])
        used |= {q["q"] for q in u["questions"]}
        univs.append(u)
        src["facts_sha16"][slug] = _sha16(fp)
        src["v24_html_sha16"][slug] = h[:16]
    return {
        "_note": "compile_interview_info.py 가 만든다(손으로 고치지 않는다). build_interview_info.py 가 이 파일만 읽어 interview/<slug>.html 30면을 쓴다.",
        "academic_year": 2027,
        "checked": CHECKED,
        "sources": src,
        "univs": univs,
    }


def dump(b):
    return json.dumps(b, ensure_ascii=False, indent=1) + "\n"


def main():
    b = compile_bundle()
    s = dump(b)
    if "--check" in sys.argv:
        cur = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        print("compile_interview_info --check:", "같음" if cur == s else "다름")
        sys.exit(0 if cur == s else 1)
    OUT.write_text(s, encoding="utf-8")
    nq = sum(len(u["questions"]) for u in b["univs"])
    nt = sum(len(u["tracks"]) for u in b["univs"])
    print(f"compile_interview_info: {len(b['univs'])}곳, 전형 {nt}, 대표 기출 {nq}문 -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
