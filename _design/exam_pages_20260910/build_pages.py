# -*- coding: utf-8 -*-
# tpl.html 자리표를 채워 시안 6본을 낸다. 한 템플릿에서 나오므로 안 사이 조판이 갈리지 않는다.
#   tpl_A.html tpl_B.html tpl_C.html            = korea-hum   (판매중)
#   tpl_A_open.html tpl_B_open.html tpl_C_open.html = korea-eq-hum (9월 14일 오픈 예정)
# 실행: python3 _design/exam_pages_20260910/build_pages.py
import os, re

D = os.path.dirname(os.path.abspath(__file__))
TPL = open(os.path.join(D, "tpl.html"), encoding="utf-8").read()

PH = '<span class="ph">{n}</span>'
def ph(t="{n}"): return '<span class="ph">%s</span>' % t

SIB = [
    ("yonsei-hum",  "연세대 활동우수형 인문통합", "판매 중"),
    ("yonsei-sci",  "연세대 활동우수형 자연",     "판매 중"),
    ("yonsei-intl", "연세대 국제형",              "판매 중"),
    ("yonsei-mirae","연세대 미래캠퍼스 학생부종합","9월 14일"),
    ("korea-hum",   "고려대 계열적합전형 인문",   "판매 중"),
    ("korea-sci",   "고려대 계열적합전형 자연",   "판매 중"),
    ("korea-eq-hum","고려대 고른기회전형 인문",   "9월 14일"),
    ("korea-eq-sci","고려대 고른기회전형 자연",   "9월 14일"),
]

def siblings(cur):
    out = []
    for code, name, st in SIB:
        cu = ' aria-current="page"' if code == cur else ''
        out.append('<li><a href="%s.html"%s><span>%s</span><span class="k">%s</span></a></li>' % (code, cu, name, st))
    return "".join(out)

def spec_rows(rows):
    return "".join('<div class="r"><dt>%s</dt><dd>%s</dd></div>' % (k, v) for k, v in rows)

def fnlist(items):
    return "".join('<li><span>%d</span><span>%s</span></li>' % (i + 1, t) for i, t in enumerate(items))

def types(items):
    out = []
    for name, defn, q, freq, bank in items:
        out.append(
            '<li class="xtype"><h3>%s</h3>'
            '<p class="def">%s</p>'
            '<p class="q">%s</p>'
            '<p class="n"><span class="k">3개년 기출</span><b>%s</b><span class="k">우리 은행</span><b>%s</b></p></li>'
            % (name, defn, q, freq, bank))
    return "".join(out)

def rules(items):
    # li 가 grid 라 문장 안의 <b> 가 저마다 격자 칸이 된다. 문장을 span 하나로 싸서
    # li 의 격자 항목을 ::before 와 span 둘로 고정한다 (실측: 안 싸면 24px 칸에 세로로 깔림)
    return "".join('<li><span>%s</span></li>' % t for t in items)

def time_rows(total, items):
    out = []
    for i, (sec, do) in enumerate(items):
        w = round(sec * 100.0 / total, 1)
        out.append('<div class="row"><span class="st">%02d</span>'
                   '<span class="xsec">%s초</span><span class="do">%s</span>'
                   '<span class="bar" style="--w:%s%%"><i></i></span></div>' % (i + 1, format(sec, ","), do, w))
    return "".join(out)

def steps(items):
    out = []
    for title, body, off in items:
        out.append('<li%s><h4>%s</h4><p>%s</p></li>' % (' class="off"' if off else '', title, body))
    return "".join(out)

def pits(items):
    return "".join('<div><h3>%s</h3><p>%s</p></div>' % (a, b) for a, b in items)

def plan(items):
    return "".join('<div class="st"><span class="k">%02d</span><h3>%s</h3><p>%s</p></div>' % (i + 1, a, b)
                   for i, (a, b) in enumerate(items))

def mats(items):
    return "".join('<li><span>%s</span><b>%s</b></li>' % (a, b) for a, b in items)

def faq(items):
    return "".join('<details class="faq"><summary>%s</summary><div class="a"><p>%s</p></div></details>' % (q, a)
                   for q, a in items)

# ══ 시안 채우기용 사실 (BRIEF 표 + 발주 정정 2건) ══
# 정정 ① 고려대 계열적합 2단계 = 1단계 성적 60% + 면접 40%, 1단계 5배수
# 정정 ② 고려대 고른기회 = 준비 12분(720초), 답변 6분(360초)

TYPE_SET = [
    ("비교 설명형", "두 제시문이 같은 대상을 두고 어디서 만나고 어디서 갈리는지 축을 세워 말한다.",
     "(가)의 ㉠과 (나)의 ㉡에 나타나는 기록에 대한 태도의 공통점과 차이점을 설명하시오."),
    ("적용 판정형", "한 제시문의 관점을 다른 제시문의 사례에 대어 성립하는지 가른다.", None),
    ("자료 해석형", "표나 그래프의 값을 제시문의 개념으로 읽고 그 읽기가 닿지 않는 자리를 밝힌다.", None),
    ("견해 구성형", "쟁점에 자기 입장을 세우고 예상되는 반론에 먼저 답한다.", None),
]

def type_items():
    out = []
    for name, defn, q in TYPE_SET:
        qq = ('&ldquo;%s&rdquo;' % q) if q else ph("{대표 발문 1문장}")
        out.append((name, defn, qq, ph("{n}회"), ph("{n}세트")))
    return out

METHOD_RULES = [
    "발문 끝 동사가 시킬 일을 정한다. <b>설명하시오</b>와 <b>판단하시오</b>와 <b>논하시오</b>는 서로 다른 작업이다.",
    "결론을 먼저 선언하고 그 안에 <b>개수</b>를 박는다. 공통점 하나와 차이점 둘처럼 세어 두면 듣는 쪽이 따라온다.",
    "근거는 제시문의 <b>자리</b>를 지목한다. 제시문을 다시 말하는 것은 근거가 아니다.",
    "남는 시간은 읽기가 아니라 <b>말할 순서</b>를 점검하는 데 쓴다.",
]

LOCK = ["채점 기준 세부와 배점 추정", "유형별 모범답안과 첨삭 세 단", "세트별 전략과 시간 재배분"]

PITS = [
    ("읽기부터 시작한다", "발문을 확인하기 전에 제시문을 읽으면 무엇을 찾는지 모른 채 준비 시간을 쓴다. 발문이 먼저다."),
    ("결론을 마지막에 말한다", "근거를 쌓다가 답변 시간이 끝나면 결론이 잘린다. 개수를 박은 결론을 먼저 세운다."),
    ("근거를 요약으로 대신한다", "제시문을 다시 말하는 것은 근거가 아니다. 어느 자리가 왜 그 주장을 받치는지 밝혀야 한다."),
]

PLAN = [
    ("형태 확정", "지원 전형이 제시문 면접인지 판정표에서 먼저 가른다."),
    ("절차 익히기", "결론 선언과 근거 배치 순서를 공통 풀이로 몸에 붙인다."),
    ("세트 응시", "실전 규격으로 응시하고 촬영본을 남긴다."),
    ("첨삭 반영", "전사와 진단과 재구성 세 단을 받아 다음 세트에 반영한다."),
]

SAMPLE_DOC = (
    '<div class="doc_head"><span class="t">%s 예시 문제지</span><span class="k">준비 %s / 답변 %s</span></div>'
    '<div class="pass">'
    '<p><span class="lb">(가)</span>기록은 일어난 일을 뒤에 남기는 일이다. 남길 것을 고르는 순간 기록은 이미 판단이 된다. '
    '<b>㉠</b>남기는 사람은 무엇을 남길지 정하면서 무엇을 지울지도 함께 정한다.</p>'
    '<p><span class="lb">(나)</span>공동체는 기억을 나누어 가지면서 자기를 유지한다. 그래서 기록은 한 사람의 소유가 아니라 합의의 결과에 가깝다. '
    '<b>㉡</b>합의가 바뀌면 같은 자료도 다르게 읽힌다.</p>'
    '<p><span class="lb">(다)</span>어느 도시는 회의록을 그대로 보관했고, 다른 도시는 결정만 남기고 논의를 지웠다. '
    '두 도시의 시민은 같은 결정을 두고 서로 다른 이야기를 한다.</p>'
    '</div>'
    '<ol class="qs">'
    '<li><span>1</span><span>(가)의 ㉠과 (나)의 ㉡에 나타나는 기록에 대한 태도의 공통점과 차이점을 설명하시오.</span></li>'
    '<li><span>2</span><span>%s</span></li>'
    '<li><span>3</span><span>%s</span></li>'
    '</ol>'
)

SAMPLE_STEPS = [
    ("작업 지도 확정", "발문 끝 동사에서 설명 하나를 확인하고 공통점 칸과 차이점 칸을 만든다. 이 단계가 끝나야 읽기가 시작된다.", False),
    ("결론 선언", "공통점 하나와 차이점 둘로 개수를 박고 그 문장을 먼저 말한다.", False),
    ("근거 배치", "㉠과 ㉡의 자리를 각각 지목하고 (다)를 두 칸 가운데 어디에 대는지 밝힌다.", False),
    ("남은 시간 재배분과 마무리", "스튜디오 리포트에서", True),
]

SAMPLE_FIRST = ("공통점은 기록을 판단이 개입한 결과로 본다는 점 하나이고, "
                "차이점은 그 판단을 누가 하느냐에서 둘로 갈립니다.")
SAMPLE_TRAP = ("(가)와 (나)를 차례로 요약하면 비교가 되지 않습니다. "
               "축을 먼저 세우고 그 축 위에서 두 글을 갈라야 공통점과 차이점이 같은 자리에서 나옵니다.")

FN = ["2027학년도 수시모집 요강 " + ph("p.{p}"),
      "2027학년도 대학입학전형 시행계획 " + ph("p.{p}"),
      "2026학년도 선행학습 영향평가 보고서 " + ph("p.{p}")]

UNITS = {
 "korea-hum": dict(
   sell=True, crumb="고려대 계열적합전형 인문",
   h1="고려대 계열적합전형 인문 면접, 출제 유형과 풀이법 (2027)",
   title="고려대 계열적합전형 인문 면접 출제 유형과 풀이법 2027, 제시문 4편 준비 21분 답변 7분 | 현학적 연구소",
   desc="고려대학교 계열적합전형 인문 면접의 전형 규격과 출제 유형, 풀이 절차를 정리합니다. 제시문 4편, 준비 21분, 답변 7분, 질문 3개. 2단계는 1단계 성적 60%에 면접 40%.",
   lead=('<p>고려대 계열적합전형 인문 면접은 제시문 <b class="num">4</b>편을 읽고 준비 <b class="num">21</b>분, '
         '답변 <b class="num">7</b>분에 질문 <b class="num">3</b>개에 답하는 제시문 면접입니다.</p>'
         '<p>1단계는 서류 <b class="num">100%</b>로 <b class="num">5</b>배수를 뽑고, '
         '2단계는 1단계 성적 <b class="num">60%</b>에 면접 <b class="num">40%</b>를 더해 정합니다.</p>'),
   aeo=("고려대 계열적합전형 인문 면접은 제시문 4편을 읽고 준비 21분, 답변 7분에 질문 3개에 답합니다. "
        "1단계는 서류 100%로 5배수, 2단계는 1단계 성적 60%에 면접 40%입니다."),
   prep_min="21분", ans_min="7분", prep_sec=1260,
   spec=[
     ("형태", "제시문 면접"),
     ("제시문 수", "<b>4</b>편<sup class=\"fn\">1</sup>"),
     ("준비 시간", "<b>21</b>분 <span class=\"xsec\">(<b>1,260</b>초)</span><sup class=\"fn\">1</sup>"),
     ("답변 시간", "<b>7</b>분 <span class=\"xsec\">(<b>420</b>초)</span><sup class=\"fn\">1</sup>"),
     ("질문 수", "<b>3</b>개<sup class=\"fn\">3</sup>"),
     ("배점 공개", "문항별 배점 비공개<sup class=\"fn\">2</sup>"),
     ("출제 범위", ph("{출제 범위}") + "<sup class=\"fn\">3</sup>"),
     ("평가 요소", "분석력, 적용력, 종합적 사고력<sup class=\"fn\">3</sup>"),
     ("언어", "한국어 제시문<sup class=\"fn\">1</sup>"),
     ("전형 반영", "1단계 서류 <b>100%</b> <span class=\"xsec\">(<b>5</b>배수)</span><br>2단계 1단계 성적 <b>60%</b> + 면접 <b>40%</b><sup class=\"fn\">2</sup>"),
     ("3개년 기출", "<b>12</b>세트<sup class=\"fn\">3</sup>"),
   ],
   time=[(180, "발문 끝 동사로 작업을 확정한다"), (420, "제시문 넷의 지도를 그린다"),
         (240, "결론을 선언하고 개수를 박는다"), (300, "근거 자리를 지목해 배치한다"),
         (120, "말할 순서를 소리 내어 점검한다")],
   mats=[("제시문 면접 스튜디오 세트", "30세트"), ("풀이법 해설 인강", "44편"),
         ("2026 기출 해설", ph("{n}편")), ("대학별 면접 가이드북", ph("{n}권"))],
   faq=[
     ("면접 시간이 얼마나 되나요", "준비 21분, 답변 7분입니다. 제시문 4편을 읽고 질문 3개에 답합니다."),
     ("면접 배점은 공개되나요", "문항별 배점은 공개하지 않습니다. 2단계 반영 비율은 1단계 성적 60%에 면접 40%입니다."),
     ("1단계는 몇 배수를 뽑나요", "서류 100%로 모집인원의 5배수를 뽑습니다."),
     ("무엇을 평가하나요", "분석력, 적용력, 종합적 사고력 세 축입니다."),
     ("무엇으로 준비하나요", "제시문 면접 스튜디오에서 30세트를 실전 규격으로 응시하고 첨삭을 받습니다. 풀이법 해설 인강 44편이 같은 절차를 짚습니다."),
   ],
   hours="평일 " + ph("{운영 시간}") + ", 주말과 공휴일 " + ph("{운영 시간}") + ".",
   cta=('<div class="xcta">'
        '<a class="btn" href="../studio.html?unit=korea-hum">면접 스튜디오 이용권 보기 <span class="ar" aria-hidden="true">&rarr;</span></a>'
        '<a class="tlink" href="../lectures/korea-hum.html">풀이법 인강 <span class="ar" aria-hidden="true">&rarr;</span></a>'
        '</div>'),
   badge='<span class="badge seal">판매 중</span><span class="k">2027학년도 기준</span>',
 ),
 "korea-eq-hum": dict(
   sell=False, crumb="고려대 고른기회전형 인문",
   h1="고려대 고른기회전형 인문 면접, 출제 유형과 풀이법 (2027)",
   title="고려대 고른기회전형 인문 면접 출제 유형과 풀이법 2027, 제시문 4편 준비 12분 답변 6분 | 현학적 연구소",
   desc="고려대학교 고른기회전형 인문 면접의 전형 규격과 출제 유형, 풀이 절차를 정리합니다. 제시문 4편, 준비 12분, 답변 6분, 질문 3개. 수능 최저 없음, 모집 199명.",
   lead=('<p>고려대 고른기회전형 인문 면접은 제시문 <b class="num">4</b>편을 읽고 준비 <b class="num">12</b>분, '
         '답변 <b class="num">6</b>분에 질문 <b class="num">3</b>개에 답하는 제시문 면접입니다.</p>'
         '<p>1단계는 서류 <b class="num">100%</b>로 <b class="num">3</b>배수를 뽑고, '
         '2단계는 1단계 성적 <b class="num">60%</b>에 면접 <b class="num">40%</b>를 더하며 수능 최저는 없습니다.</p>'),
   aeo=("고려대 고른기회전형 인문 면접은 제시문 4편을 읽고 준비 12분, 답변 6분에 질문 3개에 답합니다. "
        "1단계는 서류 100%로 3배수, 2단계는 1단계 성적 60%에 면접 40%이며 수능 최저는 없습니다."),
   prep_min="12분", ans_min="6분", prep_sec=720,
   spec=[
     ("형태", "제시문 면접"),
     ("제시문 수", "<b>4</b>편<sup class=\"fn\">1</sup>"),
     ("준비 시간", "<b>12</b>분 <span class=\"xsec\">(<b>720</b>초)</span><sup class=\"fn\">1</sup>"),
     ("답변 시간", "<b>6</b>분 <span class=\"xsec\">(<b>360</b>초)</span><sup class=\"fn\">1</sup>"),
     ("질문 수", "<b>3</b>개<sup class=\"fn\">3</sup>"),
     ("배점 공개", ph("{배점 공개 여부}") + "<sup class=\"fn\">2</sup>"),
     ("출제 범위", ph("{출제 범위}") + "<sup class=\"fn\">3</sup>"),
     ("평가 요소", ph("{평가 요소}") + "<sup class=\"fn\">3</sup>"),
     ("언어", "한국어 제시문<sup class=\"fn\">1</sup>"),
     ("전형 반영", "1단계 서류 <b>100%</b> <span class=\"xsec\">(<b>3</b>배수)</span><br>2단계 1단계 성적 <b>60%</b> + 면접 <b>40%</b><sup class=\"fn\">2</sup>"),
     ("수능 최저", "없음<sup class=\"fn\">1</sup>"),
     ("모집 인원", "<b>199</b>명<sup class=\"fn\">1</sup>"),
     ("3개년 기출", ph("{n}세트") + "<sup class=\"fn\">3</sup>"),
   ],
   time=[(120, "발문 끝 동사로 작업을 확정한다"), (240, "제시문 넷의 지도를 그린다"),
         (150, "결론을 선언하고 개수를 박는다"), (150, "근거 자리를 지목해 배치한다"),
         (60, "말할 순서를 소리 내어 점검한다")],
   mats=[("제시문 면접 스튜디오 세트", ph("{n}세트")), ("풀이법 해설 인강", ph("{n}편")),
         ("2026 기출 해설", ph("{n}편")), ("대학별 면접 가이드북", ph("{n}권"))],
   faq=[
     ("면접 시간이 얼마나 되나요", "준비 12분, 답변 6분입니다. 제시문 4편을 읽고 질문 3개에 답합니다."),
     ("수능 최저학력기준이 있나요", "고른기회전형에는 수능 최저학력기준이 없습니다."),
     ("1단계는 몇 배수를 뽑나요", "서류 100%로 모집인원의 3배수를 뽑습니다."),
     ("모집 인원은 몇 명인가요", "199명입니다."),
     ("준비 자료는 언제 여나요", "지문 은행과 해설은 9월 14일에 엽니다. 여는 시점은 공지로 알립니다."),
   ],
   hours="평일 " + ph("{운영 시간}") + ", 주말과 공휴일 " + ph("{운영 시간}") + ".",
   cta=('<div class="xcta">'
        '<a class="tlink" href="../notice.html">9월 14일 오픈, 공지 보기 <span class="ar" aria-hidden="true">&rarr;</span></a>'
        '</div>'
        '<div class="xsoon">'
        '<div><h3>고려대 고른기회전형 지문 은행은 <span class="d">9월 14일</span>에 엽니다</h3>'
        '<p>여는 날에 세트와 해설 인강이 함께 섭니다. 그때까지 이 면의 규격과 풀이 절차는 그대로 봅니다.</p></div>'
        '<p><a class="tlink" href="../notice.html">공지 보기 <span class="ar" aria-hidden="true">&rarr;</span></a></p>'
        '</div>'),
   badge='<span class="badge mute">9월 14일 오픈 예정</span><span class="k">2027학년도 기준</span>',
 ),
}

MODS = {"A": "xa", "B": "xb", "C": "xc"}

def render(code, mod_letter):
    u = UNITS[code]
    mod = MODS[mod_letter]
    doc = SAMPLE_DOC % (u["crumb"], u["prep_min"], u["ans_min"],
                        ph("{문항 2 발문}"), ph("{문항 3 발문}"))
    vals = {
      "code": code, "mod": mod,
      "lang_title": u["title"], "desc": u["desc"],
      "canonical": "https://hyunhak.com/interview/%s.html" % code,
      "crumb_name": u["crumb"], "status_badge": u["badge"],
      "h1": u["h1"], "lead": u["lead"], "aeo": u["aeo"],
      "spec_rows": spec_rows(u["spec"]), "spec_notes": fnlist(FN),
      "type_cards": types(type_items()),
      "method_rules": rules(METHOD_RULES),
      "time_cap": ('<span class="k">준비 %s 배분</span><span class="k">%s초, 5단계</span>'
                   % (u["prep_min"], format(u["prep_sec"], ","))),
      "time_rows": time_rows(u["prep_sec"], u["time"]),
      "lock_items": "".join("<li><span>%s</span></li>" % t for t in LOCK),
      "sample_doc": doc, "sample_steps": steps(SAMPLE_STEPS),
      "sample_first": SAMPLE_FIRST, "sample_trap": SAMPLE_TRAP,
      "pitfalls": pits(PITS), "plan_steps": plan(PLAN), "materials": mats(u["mats"]),
      "cta": u["cta"], "faq": faq(u["faq"]), "contact_hours": u["hours"],
      "siblings": siblings(code),
    }
    out = TPL
    # 템플릿 머리 주석(자리표 명세)은 시안에서 뺀다. 통합용 원본 tpl.html 에만 남는다
    # 비탐욕 ^<!--.*?--> 는 머리 주석 *안*의 <!--v2:shell--> 에서 끊겨 주석 뒷부분을 본문 앞 생글로 남긴다.
    # 그러면 <!doctype> 과 meta charset 이 첫 바이트에서 밀려 브라우저 charset 추정이 깨진다(실측: 문자 게이트 전건 사망).
    # 자르는 자리는 주석 끝이 아니라 <!doctype 의 시작으로 잡는다.
    i = out.lower().index("<!doctype")
    out = out[i:]
    # 경로 한 겹 차이. tpl.html 은 /interview/<code>.html 자리라 ../assets, 시안은 _design/<폴더>/ 라 ../../assets.
    # 의도된 차이다. 시안에서 base.css 가 안 걸리면 조판 판정 자체가 무의미해진다
    out = out.replace('href="../assets/', 'href="../../assets/')
    for k, v in vals.items():
        out = out.replace("{%s}" % k, v)
    # 템플릿 자리표만 검사한다. 문안 안의 {n} {p} 는 빌더가 채울 값 자리표라 남는 게 맞다
    left = [k for k in vals if ("{%s}" % k) in out]
    assert not left, "미치환 템플릿 자리표: %s" % left
    keep = re.findall(r"\{[가-힣a-z ]+\}", out)
    print("   문안 자리표 잔존", len(keep), "건 (의도)")
    return out


# ── 이름 충돌 게이트 (빌드마다) ──────────────────────────────────────────────
# base.css 에는 :where(body.v2) .X{...} 꼴로 *조상 조건 없이* 잡는 규칙이 있다.
# 내 컴포넌트가 그 이름을 다시 쓰면 base 쪽 선언이 내 상자로 흘러든다.
# 실측 사고: .sec 이 base 의 section 여백(padding:96px 0)을 먹어 시간 배분 행이 220px 로 부풀었고,
#            .hd 가 헤더 규칙(position:sticky, backdrop-filter)을 먹었다. 둘 다 오류 0 으로 조용히 났다.
# 의도된 재사용(page note k num no btn badge tlink price crumb faq wrap sr mono anch)은 명부로 면제한다.
REUSE = {"page","note","k","num","no","btn","badge","tlink","price","crumb","faq","wrap","sr",
         "mono","anch","ar","skip","frame","sheet","aeo-answer","pagehead","lede2","v2","ghost","sm",
         "seal","line","mute","t","a"}

def collision_gate():
    import re as _re
    base = open(os.path.join(D, "..", "..", "assets", "base.css"), encoding="utf-8").read()
    css  = open(os.path.join(D, "exam_page.css"), encoding="utf-8").read()
    # base 의 무조건 규칙: :where(body.v2) .X{  (뒤에 다른 조합자나 클래스가 안 붙는 것)
    loose = set(_re.findall(r":where\(body\.v2\)\s+\.([\w-]+)\s*(?=[,{])", base))
    mine  = set(_re.findall(r"\.([a-zA-Z_][\w-]*)", css))
    bad = sorted((mine & loose) - REUSE)
    assert not bad, ("base.css 무조건 규칙과 이름이 겹친다(선언이 흘러든다): %s\n"
                     "  x 접두사를 붙이거나 REUSE 명부에 사유와 함께 올려라." % bad)
    print("   이름 충돌 게이트 통과 · base 무조건 규칙 %d개 대조, 겹침 0" % len(loose))

collision_gate()

made = []
for letter in ("A", "B", "C"):
    for code, suffix in (("korea-hum", ""), ("korea-eq-hum", "_open")):
        fn = "tpl_%s%s.html" % (letter, suffix)
        html = render(code, letter)
        open(os.path.join(D, fn), "w", encoding="utf-8").write(html)
        made.append((fn, len(html)))
for fn, n in made:
    print(fn, n, "자")
