#!/usr/bin/env python3
"""제시문 면접 스튜디오 공통 상세페이지 조립기 (가이드북 상세페이지 v2 구조 승계: SB7 순서, 절정 4부 50~65%).

입력  shots_app/*.png (로컬 스튜디오 실물 화면, Playwright 2x 캡처), hyunhak-site/assets/photo/{studio_desk_aigen,campus_collage}.jpg,
      hyunhak-site/assets/data/sets.json (단위 5, 세트 150), interview-studio data/attempts/att_0d3086bfcf0e/report.json (데모 리포트, 가상 학생)
출력  out/면접스튜디오_공통상세페이지_v1.html (독립 HTML, 이미지 전부 data URI) 또는 mode=site 로 hyunhak-site/programs/studio.html + assets/photo/std/
규범  hyunhak-site/assets/base.css v3 토큰. 표제 Pretendard 800, 본문 16px, 계기값 JetBrains Mono, 세리프는 인용만.
      朱印은 가격과 표식 점에만. 1차 CTA 한 종류(응시 단위 고르기). 수치는 전부 원천 파일에서 읽거나 원천이 있는 값만 적는다.
"""
import base64, io, json, pathlib, sys, datetime, html, re
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS, OUT = ROOT / 'shots_app', ROOT / 'out'
OUT.mkdir(exist_ok=True)
SITE_ROOT = pathlib.Path.home() / 'Workspace' / 'hyunhak-site'
STUDIO_ROOT = pathlib.Path.home() / 'Workspace' / 'interview-studio'
SITE = 'https://www.hyunhak.com'
MODE = 'data'
ASSET_REL = '../assets/photo/std'
OUTNAME = '면접스튜디오_공통상세페이지_v1.html'
for a in sys.argv[1:]:
    if a.startswith('out='):
        OUTNAME = a[4:]
    elif a == 'mode=site':
        MODE = 'site'

sets = json.loads((SITE_ROOT / 'assets' / 'data' / 'sets.json').read_text())
units = sets['units']
report = json.loads((STUDIO_ROOT / 'data' / 'attempts' / 'att_0d3086bfcf0e' / 'report.json').read_text())

AX = {'제시문_추상도': '제시문 추상도', '연쇄_통합_폭': '연쇄 통합 폭', '자료_수리_부하': '자료 수리 부하', '개념_전이_거리': '개념 전이 거리',
      '관계_구성_단계수': '관계 구성 단계수', '자료_해석_부하': '자료 해석 부하', '관점_간_긴장도': '관점 간 긴장도', '다_다층성': '다층',
      '영어_지문_부하': '영어 지문 부하'}
UNIT_COPY = {  # studio.html COPY.md §3 문안 그대로
    'korea-hum': ('고려대 계열적합 인문', '준비 21분, 발화 7분. 3문항 한 번에'),
    'korea-sci': ('고려대 계열적합 자연', '준비 21분, 발화 7분. 자연 계열 30세트'),
    'yonsei-hum': ('연세대 활동우수 인문통합', '준비 8분, 답변 5분. 관점 사이 관계 구성'),
    'yonsei-sci': ('연세대 활동우수 자연', '준비 8분, 답변 5분. 자연 계열 30세트'),
    'yonsei-intl': ('연세대 국제형', '준비 8분, 답변 5분. 영어 제시문 포함'),
}
ORDER = ['yonsei-hum', 'yonsei-sci', 'yonsei-intl', 'korea-hum', 'korea-sci']
esc = html.escape


def emit(im, width, quality, name):
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if MODE == 'site':
        dest = SITE_ROOT / 'assets' / 'photo' / 'std' / f'{name}.jpg'
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, 'JPEG', quality=quality, optimize=True, progressive=True)
        return f'{ASSET_REL}/{name}.jpg', im.size
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(), im.size


def shot(name, file, box=None, width=1400, quality=80):
    """실물 화면. box = 2x 픽셀 크롭(앱 상단 바 제거)."""
    im = Image.open(SHOTS / file).convert('RGB')
    if box:
        im = im.crop(box)
    return emit(im, width, quality, f'std_{name}')


def photo(name, file, width=1600, quality=78):
    im = Image.open(SITE_ROOT / 'assets' / 'photo' / file).convert('RGB')
    return emit(im, width, quality, f'std_{name}')


def img(uri_size, alt, cls='', lazy=True):
    uri, (w, h) = uri_size
    lz = ' loading="lazy"' if lazy else ' fetchpriority="high"'
    ca = f' class="{cls}"' if cls else ''   # GS-17 hero must_fix ⑤: 빈 class 속성 금지
    return f'<img{ca} src="{uri}" width="{w}" height="{h}" alt="{alt}"{lz} decoding="async">'


def shot_block(key, alt):
    """단계 화면 한 장. site 모드는 원본 jpg 를 새 탭으로 여는 확대 래퍼(critic P1: 390 에서 1200px 화면이 348px 로 축소, 확대 경로 0건).
    data 모드(독립 HTML, data: URI)는 새 탭 이동이 브라우저에서 막히므로 래퍼 없이 그림만."""
    im = img(IMG[key], alt)
    if MODE != 'site':
        return f'<div class="shot">{im}</div>'
    return (f'<a class="zoom" href="{IMG[key][0]}" target="_blank" rel="noopener" aria-label="{alt}. 새 탭에서 크게 보기">'
            f'<div class="shot">{im}</div><span class="zl" aria-hidden="true">크게 보기 <span>↗</span></span></a>')


# 실물 화면 (앱 상단 바 135px@2x 제거)
BAR = 135
IMG = {
    'home': shot('home', 'home_korea.png', (0, BAR, 2560, 1600)),
    'brief': shot('brief', 'brief_korea_full.png', (0, BAR, 2560, 1480)),
    'prep': shot('prep', 'prep_korea.png', (0, BAR, 2560, 1600)),
    'answer': shot('answer', 'answer_korea.png', (0, BAR, 2560, 1600)),
    'report': shot('report', 'report_korea.png', (0, BAR, 2560, 1600)),
    'revision': shot('revision', 'report_panel4.png', (0, 0, 2112, 1760)),
    'delivery': shot('delivery', 'report_panel2.png', None, 1400, 82),
    'tab': shot('tab', 'prep_tab.png', (0, 115, 1668, 2224), 900, 80),
    'prep_y': shot('prep_y', 'prep_yonsei.png', (0, BAR, 2560, 1600)),
}
# GS-17 A: 히어로 실물 화면 한 장. 좌우 페이지 여백만 덜어낸 준비 시간 화면
STAGE = {'prep': shot('stage_prep', 'prep_korea.png', (120, BAR, 2440, 1600), 1200, 78)}
CAMPUS = photo('campus', 'campus_collage.jpg', 1200, 80)

# 단위 카드 (sets.json 실값)
def unit_card(u):
    title, sub = UNIT_COPY[u['code']]
    lv = {}
    for s in u['sets']:
        lv[s['difficulty']] = lv.get(s['difficulty'], 0) + 1
    lv_txt = ', '.join(f'{k} {lv[k]}' for k in ['하', '중', '상', '최상'] if k in lv)
    axes = [AX.get(k, k.replace('_', ' ')) for k in (u['sets'][0].get('axes') or {}) if k != '합계']
    titles = ''.join(f'<li><span class="lv">{esc(s["difficulty"])}</span>{esc(s["title"])}</li>' for s in u['sets'][:3])
    # studio.html 은 ?unit= 으로 단위 탭을 고른다 (JS 렌더 카드라 #u-<code> 정적 앵커가 없어 seo_check dead link)
    href = f'{SITE}/studio.html?unit={u["code"]}#units' if MODE == 'data' else f'../studio.html?unit={u["code"]}#units'
    return (f'<li class="unit rv"><span class="mono">{esc(u["label"].split()[0])}</span><h3>{esc(title)}</h3><p class="sub">{esc(sub)}</p>'
            f'<dl><dt>지문</dt><dd>{u["set_count"]}편</dd><dt>난이도</dt><dd>{esc(lv_txt)}</dd><dt>축</dt><dd>{esc(", ".join(axes))}</dd></dl>'
            f'<ul class="ex">{titles}</ul><span class="won">495,000<small>원, 전권. 인강 포함</small></span><a class="tl" href="{href}">이 단위 보기</a></li>')

UNITS = '\n'.join(unit_card(next(u for u in units if u['code'] == c)) for c in ORDER)
TOTAL_SETS = sum(u['set_count'] for u in units)
LV_ALL = {}
for u in units:
    for s in u['sets']:
        LV_ALL[s['difficulty']] = LV_ALL.get(s['difficulty'], 0) + 1
assert TOTAL_SETS == 150 and LV_ALL == {'하': 30, '중': 50, '상': 50, '최상': 20}, (TOTAL_SETS, LV_ALL)

# 데모 리포트 verbatim (가상 학생, 실채점)
q1 = report['question_grades'][0]
rev = q1['revision']
dl = report['delivery'][0]
issues = [i for i in rev['issues'] if i['type'] in ('질문 미응답', '근거 부족')][:2]
model_first = rev['spoken_model_answer'].split('\n\n')[0]
AXES_TXT = ', '.join(f'{a["axis"]} {a["score"]}' for a in report['axes'])
ISSUES = '\n'.join(
    f'<li><span class="tag">{esc(i["type"])}</span><p class="q">“{esc(i["quote"])}”</p><p class="pb">{esc(i["problem"])}</p><p class="fx">{esc(i["fix"])}</p></li>'
    for i in issues)


def link(path):
    if MODE == 'site':
        return {'/': '../index.html', '/studio.html': '../studio.html', '/studio.html#units': '../studio.html#units',
                '/studio.html#trialGo': '../studio.html#trialGo', '/studio.html#lecture': '../studio.html#lecture', '/b2b.html': '../b2b.html', '/programs/guidebook.html': 'guidebook.html'}[path]
    return SITE + path



# GS-17 A2: 사업자 문단은 빌드 시 index.html 의 <div class="biz"> 블록을 그대로 승계한다(세 면 drift 방지). 못 읽으면 빌드 중단(fail closed).
BIZ_RE = re.compile(r'<div class="biz">(?:(?!<div\b).)*?</div>', re.S)


def biz_block():
    src = (SITE_ROOT / 'index.html').read_text(encoding='utf-8')
    m = BIZ_RE.search(src)
    if not m or '사업자등록번호' not in m.group(0) or '통신판매업' not in m.group(0):
        raise SystemExit('GS-17 A2: index.html 에서 <div class="biz"> 블록을 읽지 못함. 빌드 중단')
    blk = m.group(0)
    for p in ('terms.html', 'privacy.html'):
        blk = blk.replace(f'href="{p}"', f'href="../{p}"' if MODE == 'site' else f'href="{SITE}/{p}"')
    return blk

CSS = (pathlib.Path(__file__).with_name('page.css')).read_text()

HTML = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>연세대 고려대 제시문 면접 스튜디오 소개, 현학적 연구소</title>
<meta name="description" content="연세대, 고려대 기출 제시문 150세트를 실전 규격으로 촬영 응시하고 전사, 진단, 구술체 재구성 세 단 첨삭을 받는 제시문 면접 스튜디오. 지문 1편 33,000원, 단위 전권 495,000원에 풀이법 인강 포함, 공통 풀이 인강 220,000원.">
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></noscript>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap"></noscript>
<link rel="icon" href="{{FAVICON}}">
<style>{{CSS}}</style>
<noscript><style>.rv{opacity:1;transform:none}</style></noscript><!-- critic r3b P1: .rv 는 @media(prefers-reduced-motion:no-preference) 안에서 opacity 0 으로 시작하고
     .in 부여는 본문 끝 인라인 스크립트뿐이다. 스크립트를 막으면 히어로 아래가 통째로 빈다
     (가이드북 실측 = #books 32/32, #format 2/2, #close 2/2 비가시 = 카탈로그와 가격과 CTA 소실).
     IntersectionObserver 미지원 폴백은 이미 있으므로 남은 구멍은 스크립트 차단 하나뿐이라 noscript 로 막는다. -->
</head>
<body>

<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="{{HOME}}">현학적 연구소 <span class="han">玄學的 硏究所</span></a>
    <span class="tag">제시문 면접 스튜디오</span>
  </div>
</header>

<main id="main">
<!-- 도입 -->
<section class="hero" id="top">
  <div class="wrap">
    <div class="say">
    <div class="pagehead">
      <p class="kicker">연세대와 고려대 제시문 면접 스튜디오</p>
      <h1>기출 제시문 150세트,<br>실전 규격 촬영 응시</h1>
      <p class="lede">연세대는 준비 8분과 답변 5분, 고려대는 준비 21분과 발화 7분. 그 시간을 그대로 재현해 촬영 응시합니다. 회차마다 전사와 진단과 구술체 재구성 세 단이 돌아옵니다.</p>
    </div>
      <div class="cta">
        <a class="btn" href="{{UNITS_URL}}">응시 단위 고르기 <span class="arr">→</span></a>
        <a class="tl" href="#parts">응시 한 회의 순서 먼저 보기</a>
      </div>
    </div>
    <div class="stage">
      {{STAGE}}
    </div>
  </div>
</section>

<!-- 계기 -->
<section class="facts">
  <div class="wrap">
    <ul>
      <li><b>150<small>세트</small></b><span>기출 규격 그대로 저작한 제시문</span></li>
      <li><b>5<small>단위</small></b><span>연세 3과 고려 2. 단위마다 30편</span></li>
      <li><b>5<small>회</small></b><span>지문 한 편당 응시 횟수</span></li>
      <li><b>3<small>단</small></b><span>전사와 진단과 구술체 재구성</span></li>
      <li><b>8<small>분 | 21분</small></b><span>연세와 고려 준비 시간 규격</span></li>
      <li><b>2<small>종</small></b><span>인강. 세트별 풀이법과 공통 풀이, 단위 전권에 포함</span></li>
    </ul>
  </div>
</section>

<!-- 문제 -->
<section class="sec ink" id="problem">
  <div class="wrap">
    <div class="split one">
      <div class="txt rv">
        <p class="kicker">시작하기 전에</p>
        <h2 class="h2">혼자 하는 제시문 면접 연습이 멈추는 자리</h2>
        <p class="lede" style="margin-top:var(--s4)">제시문 면접은 생활기록부를 보지 않습니다. 면접장에서 받은 글과 발문을 정해진 시간 안에 읽고 정해진 시간 안에 말하는 시험입니다. 혼자 연습하면 상담에서 반복해 듣는 네 문장에서 멈춥니다.</p>
        <ul class="forms">
          <li><span class="mono">읽는 순서</span><h3>“네 편 요약은 다 했는데, 뭘 물었는지는 답을 못 했어요.”</h3><p>요약은 답이 아닙니다. 발문이 지목한 기준으로 판단해야 답이 됩니다.</p></li>
          <li><span class="mono">쓰는 분량</span><h3>“문장으로 쓰다가 준비 시간이 끝났어요.”</h3><p>세 문항 발화 분량은 2,000자에 가깝습니다. 21분 안에 손으로 쓸 수 없는 분량.</p></li>
          <li><span class="mono">시간 감각</span><h3>“시간이 남아서 했던 말을 또 했어요.”</h3><p>닫는 문장을 정해 두지 않으면 마지막 30초가 늘어집니다.</p></li>
          <li><span class="mono">복기 부재</span><h3>“열 세트를 풀었는데 뭐가 틀렸는지 모르겠어요.”</h3><p>혼자 연습하면 채점이 없습니다. 같은 실수의 반복.</p></li>
        </ul>
        <p class="after">네 문장의 공통 원인은 독해력이 아닙니다. 시험장의 시간 규격 안에서 소리 내어 말해 볼 자리와 말한 것을 돌려받을 자리가 없었다는 것입니다.</p>
      </div>
    </div>
  </div>
</section>

<!-- 맞는 사람 -->
<section class="sec" id="who">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">이 스튜디오가 맞는 사람</p>
      <h2 class="h2">연세대와 고려대 제시문 면접을 앞둔 학생과 그 연습을 지켜보려는 사람</h2>
    </div>
    <ul class="aud">
      <li class="rv"><span class="mono">학생</span><h3>연세대 활동우수형과 국제형, 고려대 계열적합전형 지원자</h3><p>지원 단위의 기출 규격으로 응시 기록을 쌓는 학생. 실전형 한 번 뒤 연습형으로 막힌 문항만 다시 하고 실전형으로 확인.</p></li>
      <li class="rv"><span class="mono">학부모</span><h3>준비 상태를 리포트로 확인하려는 학부모</h3><p>응시마다 여섯 축 점수와 첨삭이 마이페이지에 남습니다. 어느 축이 낮은지와 다음 회차에 무엇이 올라갔는지가 숫자로 보입니다.</p></li>
      <li class="rv"><span class="mono">학원, 학교</span><h3>여러 학생을 같은 기준으로 지도하는 곳</h3><p>강사 화면에서 전 시도의 영상과 전사와 첨삭을 열람합니다. 좌석 단위 도입은 스쿨 플랜으로.</p></li>
    </ul>
  </div>
</section>

<!-- 안내자 -->
<section class="sec mat" id="trust">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">만든 사람과 기준</p>
      <h2 class="h2">한 사람, 같은 기준, 150세트</h2>
      <p class="lede" style="margin-top:var(--s4)">13년차 입시 컨설턴트 한 사람이 150세트 제시문 해제와 가이드북 31권을 같은 기준으로 편집합니다. 고려대학교 영어교육과 졸업.</p>
    </div>
    <ul class="pr rv">
      <li><span class="mono">원칙 1</span><h3>기출 규격 실측</h3><p>연세대 2026학년도 문항카드와 고려대 3개년 문항카드 12장을 전수 실측했습니다. 제시문 편수와 문항 수와 배점과 시간을 그대로 옮겼습니다.</p></li>
      <li><span class="mono">원칙 2</span><h3>세트 전수 정합 판정</h3><p>150세트 전부를 기출 유형 비율과 배점 구조에 대조해 판정합니다. 판정을 통과한 세트만 스튜디오에 올립니다.</p></li>
      <li><span class="mono">원칙 3</span><h3>루브릭 대조 채점</h3><p>기준마다 모범 포인트를 대조하고 전사문을 인용한 뒤 다섯 밴드로 판정합니다. 경계선은 낮은 밴드로 둡니다.</p></li>
      <li><span class="mono">원칙 4</span><h3>판을 밝힘</h3><p>세트마다 난이도와 네 축 점수를 공개합니다. 풀이법 인강 공개 편수는 열람 시점 기준으로 적습니다.</p></li>
    </ul>
    <div class="quote rv">
      <p class="q">“수험생이 제시문들의 논리를 읽어내어 관점 간 관계를 정확히 구성하고, 자기 생각을 다른 사람이 이해할 수 있도록 효과적으로 설명할 수 있는지 평가하고자 하였습니다.”</p>
      <span class="src">연세대학교 2026학년도 선행학습영향평가 문항카드 08, 출제 의도</span>
    </div>
  </div>
</section>

<!-- 계획 -->
<section class="sec" id="parts">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">이 스튜디오가 하는 일</p>
      <h2 class="h2">응시 한 회, 다섯 단계 그대로 준비 순서</h2>
      <p class="lede" style="margin-top:var(--s4)">세트를 고르고 준비하고 답변을 촬영합니다. 리포트를 받고 다시 응시합니다. 앞의 세 단계는 시험장을 옮겨 놓은 것이고 4단계가 이 스튜디오의 본론, 5단계는 그 리포트로 다음 회차를 정하는 자리입니다.</p>
    </div>
    <ol class="rail anchor">
      <li class="rv"><a href="#p1-shot"><span class="n">1단계</span><h3>세트 고르기</h3><p>다섯 단위 150세트. 난이도와 네 축 점수를 보고 고릅니다.</p><span class="pg">기출 규격 제시문 은행</span><span class="go">실제 화면 보기 <span aria-hidden="true">↓</span></span></a></li>
      <li class="rv"><a href="#p2-shot"><span class="n">2단계</span><h3>준비 시간</h3><p>제시문과 발문을 읽고 메모. 연세 8분과 고려 21분이 그대로 흐릅니다.</p><span class="pg">실전 규격 타이머</span><span class="go">실제 화면 보기 <span aria-hidden="true">↓</span></span></a></li>
      <li class="rv pivot"><a href="#p3-shot"><span class="n">3단계</span><h3>답변 촬영</h3><p>전면 카메라로 촬영하며 소리 내어 답변. 실전형은 시간 배분도 스스로.</p><span class="tail"><span class="pg">녹화, 전사, 태도 신호</span><span class="go">실제 화면 보기 <span aria-hidden="true">↓</span></span></span></a></li>
      <li class="rv core"><a href="#p4-shot"><div class="hd"><span class="n">4단계, 본론</span><h3>전사, 채점, 첨삭 세 단</h3></div><div class="bd"><p>말한 그대로 전사한 뒤 루브릭으로 채점하고 진단과 구술체 재구성을 붙입니다.</p><span class="pg">리포트가 응시 직후 열림</span><span class="go">실제 화면 보기 <span aria-hidden="true">↓</span></span></div></a></li>
      <li class="rv loop"><a href="#p5-shot"><span class="n">5단계</span><h3>재응시와 순위</h3><p>지문마다 5회. 막힌 문항만 연습형으로 다시 한 뒤 실전형으로 확인.</p><span class="foot"><span class="pg">5회 사다리, 랭킹 3축</span><span class="go">실제 화면 보기 <span aria-hidden="true">↓</span></span></span></a></li>
    </ol>
  </div>
</section>

<!-- 1단계 -->
<section class="part" id="p1">
  <div class="wrap">
    <div class="head rv">
      <div class="num">01</div>
      <div><h2>세트 고르기</h2><p class="sub">다섯 단위 150세트 | 난이도 | 네 축 점수</p></div>
    </div>
    <div class="body">
      <div class="vis rv" id="p1-shot">{{SHOT_HOME}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 단계에 들어 있는 것</h3>
          <ul>
            <li>연세대 활동우수형 인문통합과 자연과 국제형. 고려대 계열적합전형 인문과 자연. 단위마다 30편이고 모두 150세트</li>
            <li>난이도 네 단. 하 30과 중 50과 상 50과 최상 20</li>
            <li>세트마다 네 축 점수. 제시문 추상도나 자료 해석 부하처럼 단위마다 다른 어휘</li>
            <li>고려대 인문의 표와 산점도 자료, 연세대 국제형의 영어 제시문까지 기출 구성 그대로</li>
          </ul></div>
        <div class="blk"><h3>왜 첫 자리인가</h3>
          <div class="why"><p>제시문 면접의 문제는 지원 대학의 규격을 따릅니다. 연세대는 제시문 4편에 문제 2개, 고려대는 3문항이 앞 문항의 답을 이어 씁니다. 다른 대학 문제로 연습하면 준비 시간의 순서부터 어긋납니다.</p><p>150세트 전부가 기출의 편수와 배점과 시간 규격을 그대로 따릅니다. 유형 비율까지 대조해 판정을 통과한 세트만 올렸습니다.</p></div></div>
      </div>
    </div>
    <div class="sample rv">
          <div class="cap"><span>지문 목록 표본, 단위별 첫 세 편</span><span>스튜디오 세트 표</span></div>
          <table class="setlist">
            <caption>단위별 첫 세 세트와 난이도</caption>
            <tr><th scope="col">단위</th><td>세트 제목</td><td class="r">난이도</td></tr>
            {{SETROWS}}
          </table>
    </div>
  </div>
</section>

<!-- 2단계 -->
<section class="part rev" id="p2">
  <div class="wrap">
    <div class="head rv">
      <div class="num">02</div>
      <div><h2>준비 시간</h2><p class="sub">제시문, 발문, 답변 메모 | 연세 8분, 고려 21분</p></div>
    </div>
    <div class="body">
      <div class="vis rv" id="p2-shot">{{SHOT_PREP}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 단계에 들어 있는 것</h3>
          <ul>
            <li>실제 문제지 형식의 제시문과 발문. 배점과 답변 시간이 문항 옆에 표기</li>
            <li>준비 타이머. 끝나면 답변 단계로 자동 전환</li>
            <li>답변 메모. 답변 화면에서도 펼쳐 볼 수 있음</li>
            <li>실전형과 연습형. 실전형은 답변 시간이 문항별로 나뉘지 않고 연습형은 문항마다 따로</li>
          </ul></div>
        <div class="blk"><h3>왜 필요한가</h3>
          <div class="why"><p>준비 시간의 순서가 답변을 정합니다. 발문을 먼저 읽고 제시문에 문항 번호를 적고 명사구로 골격을 채우는 연습은 타이머가 실제로 흐를 때만 몸에 붙습니다.</p><p>시험 당일에 처음 겪는 조건이 없도록 준비 시간과 답변 시간을 대학 규격 그대로 두었습니다.</p></div></div>
      </div>
    </div>
    <div class="sample rv">
          <div class="cap"><span>지면 표본, 두 대학의 응시 규격</span><span>스튜디오 설정값</span></div>
          <div class="cols">
            <table>
              <caption>연세대 제시문 면접 제원</caption>
              <tr><th scope="rowgroup">연세대 활동우수형, 국제형</th><td></td></tr>
              <tr><th scope="row">준비 시간</th><td>480초, 8분</td></tr>
              <tr><th scope="row">답변 시간</th><td>300초, 5분</td></tr>
              <tr><th scope="row">구성</th><td>제시문 4편, 문제 2개</td></tr>
              <tr><th scope="row">배점</th><td>문제 1과 문제 2, 60점과 40점</td></tr>
            </table>
            <table>
              <caption>고려대 제시문 면접 제원</caption>
              <tr><th scope="rowgroup">고려대 계열적합전형</th><td></td></tr>
              <tr><th scope="row">준비 시간</th><td>1,260초, 21분</td></tr>
              <tr><th scope="row">발화 시간</th><td>420초, 7분 통합</td></tr>
              <tr><th scope="row">구성</th><td>제시문 여러 편, 3문항. 자연은 뒤 문항이 앞 문항의 개념을 참조</td></tr>
              <tr><th scope="row">배분</th><td>문항당 140초 기준, 실전형은 스스로 배분</td></tr>
            </table>
          </div>
    </div>
  </div>
</section>

<!-- 3단계 -->
<section class="part" id="p3">
  <div class="wrap">
    <div class="head rv">
      <div class="num">03</div>
      <div><h2>답변 촬영</h2><p class="sub">전면 카메라 녹화 | 말한 그대로 전사 | 전달과 태도 신호</p></div>
    </div>
    <div class="sample strip rv">
          <div class="cap"><span>지면 표본, 전달 측정값</span><span>데모 응시 리포트, 가상 학생</span></div>
          <ul class="tiles">
            <li><span class="lab">어절 수</span><b>{{DL_EOJ}}<em>어절</em></b></li>
            <li><span class="lab">발화 시간</span><b>{{DL_SPEECH}}<em>초</em></b></li>
            <li><span class="lab">분당 어절</span><b>{{DL_WPM}}</b></li>
            <li><span class="lab">간투사</span><b>{{DL_FILLER}}<em>회</em></b><span class="d">{{DL_FILLER_BD}}</span></li>
            <li><span class="lab">침묵 비율</span><b>{{DL_SIL}}<em>%</em></b></li>
            <li><span class="lab">사용 시간</span><b>{{DL_USED}}<em>/ {{DL_ALLOT}}초</em></b></li>
          </ul>
    </div>
    <div class="body">
      <div class="vis rv" id="p3-shot">{{SHOT_ANSWER}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 단계에 들어 있는 것</h3>
          <ul>
            <li>답변 타이머와 녹화. 전면 카메라를 켜면 영상으로, 끄면 음성으로 기록</li>
            <li>실전형은 “문제 N번 답변하겠습니다” 선언으로 문항을 가릅니다. 선언이 없으면 자르지 않고 전체를 채점</li>
            <li>말한 그대로 받아 적는 전사. 제시문 어휘를 기준으로 오인식을 보정</li>
            <li>어절 수와 발화 시간과 분당 어절, 간투사 횟수와 침묵 비율과 사용 시간을 측정</li>
            <li>응시 영상은 마이페이지에서 다시 보기</li>
            <li>응시 영상과 목소리는 첨삭과 계정 확인에만 씁니다. 목소리 대조는 첫 응시 전 고지에 동의한 뒤에만 합니다</li>
          </ul></div>
        <div class="blk"><h3>어떻게 쓰나</h3>
          <div class="why"><p>내용은 전사문에서 채점하고 전달과 태도는 음성과 영상 신호에서 잽니다. 태도 축은 침묵과 완주와 개시 선언과 카메라 네 성분으로 계산합니다.</p><p>자기 답변을 글로 읽는 첫 경험이 여기서 생깁니다. 무엇을 말했다고 생각했는지와 실제로 말한 것의 차이가 전사문에 그대로 남습니다.</p></div></div>
      </div>
    </div>
  </div>
</section>

<!-- 4단계, 절정 -->
<section class="part core rev" id="p4">
  <div class="wrap">
    <div class="head rv">
      <div class="num">04</div>
      <div><p class="kicker">이 스튜디오의 본론</p><h2>전사, 채점, 첨삭 세 단</h2><p class="sub">문항별 루브릭 채점 | 여섯 축 | 진단과 구술체 재구성</p></div>
    </div>
    <div class="body">
      <div class="vis rv" id="p4-shot">{{SHOT_REVISION}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 단계에 들어 있는 것</h3>
          <ul>
            <li>문항별 루브릭 채점. 기준마다 점수와 밴드와 전사문을 인용한 근거</li>
            <li>여섯 축. 이해력과 분석력과 논리성과 적용력은 루브릭에서 나오고 전달력과 태도는 음성과 영상 신호에서 나옴</li>
            <li>첨삭 1단은 전사록 정리. 간투사를 걷고 오인식을 보정. 내용은 더하지 않음</li>
            <li>첨삭 2단은 진단. 여섯 유형(오독 / 논리적 비약 / 근거 부족 / 개념 오류 / 질문 미응답 / 표현)을 인용과 문제와 고칠 방향으로 적음</li>
            <li>첨삭 3단은 구술체 재구성. 내 답변을 살려 “문제 1번 답변하겠습니다”부터 끝까지 다시 세운 모범 답변</li>
            <li>강점과 개선 포인트와 총평</li>
          </ul></div>
        <div class="blk"><h3>왜 본론인가</h3>
          <div class="why"><p>혼자 연습의 공백은 채점과 복기입니다. 리포트는 응시 직후 자동으로 열리고 진단은 내가 실제로 말한 문장을 인용해 무엇이 왜 부족한지 적습니다.</p><p>3단의 모범 재구성은 내 답변의 뼈대 위에 세운 것이라, 소리 내어 따라 말하면 다음 회차의 답변이 됩니다.</p></div></div>
      </div>
    </div>
    <div class="sample rv">
          <div class="cap"><span>지면 표본, 첨삭 세 단 발췌</span><span>데모 응시 리포트, 가상 학생, 문제 1</span></div>
          <div class="revs">
            <div class="rv1"><span class="stp">1단, 전사록 정리</span><p class="tx">“{{REV_WASHED}}”</p></div>
            <div class="rv2"><span class="stp">2단, 진단 {{REV_N}}건 중 2건</span><ul class="issues">{{ISSUES}}</ul></div>
            <div class="rv3"><span class="stp">3단, 구술체 재구성 첫 단락</span><p class="tx q">“{{REV_MODEL}}”</p></div>
          </div>
    </div>
    <ol class="steps rv">
      <li><span class="n">01</span><p>응시를 마치면 리포트가 열립니다.</p></li>
      <li><span class="n">02</span><p>여섯 축에서 낮은 축과 문항별 밴드를 봅니다.</p></li>
      <li><span class="n">03</span><p>진단의 인용 문장을 내 답변에서 찾아 고칠 방향을 적습니다.</p></li>
      <li><span class="n">04</span><p>구술체 재구성을 소리 내어 따라 말한 뒤 연습형으로 그 문항만 다시 응시합니다.</p></li>
    </ol>
  </div>
</section>

<!-- 5단계 -->
<section class="part" id="p5">
  <div class="wrap">
    <div class="head rv">
      <div class="num">05</div>
      <div><h2>재응시와 순위</h2><p class="sub">지문당 5회 | 랭킹 3축 | 인강 두 종류</p></div>
    </div>
    <div class="sample rv">
          <div class="cap"><span>지면 표본, 지문 한 편 5회 사다리</span><span>권장 순서</span></div>
          <table class="ladder">
            <caption>지문 1편 다섯 회 권장 순서</caption>
            <tr><th scope="row">1회</th><td>실전형</td><td>통합 답변으로 시작 상태를 잽니다. 리포트의 낮은 축이 기준선.</td></tr>
            <tr><th scope="row">2회</th><td>연습형</td><td>진단이 인용한 문항만 따로. 구술체 재구성을 따라 말한 뒤 응시.</td></tr>
            <tr><th scope="row">3회</th><td>연습형</td><td>다른 문항. 같은 유형의 진단이 다시 뜨는지 봅니다.</td></tr>
            <tr><th scope="row">4회</th><td>연습형</td><td>시간 배분. 문항별 답변 시간을 실전 배분에 맞춰 닫는 문장까지.</td></tr>
            <tr><th scope="row">5회</th><td>실전형</td><td>통합 답변으로 확인. 1회와 같은 축이 올라갔으면 다음 세트로.</td></tr>
          </table>
    </div>
    <div class="body">
      <div class="vis rv" id="p5-shot">{{SHOT_REPORT}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 단계에 들어 있는 것</h3>
          <ul>
            <li>지문 한 편에 5회. 실전형 한 번 뒤 연습형으로 막힌 문항만 다시 하고 실전형으로 확인</li>
            <li>랭킹 3축은 지망 대학별과 세트별과 연습량. 닉네임으로 공개하고 학생마다 최고 기록 한 건만 셈</li>
            <li>참가 3명 미만인 보드는 비공개. 다른 학생의 답변과 전사와 첨삭은 어디서도 열리지 않음</li>
            <li>세트마다 풀이법 인강 한 편. 낱권에는 그 세트 1편이, 단위 전권에는 30편이 딸려 있어 추가 비용 없음</li>
            <li>공통 풀이 인강도 단위 전권에 포함. 인강만 들으려면 따로 살 수 있음</li>
            <li>응시 이용 기간 12개월, 인강 시청 기간 3개월. 단위 전권은 기간 안의 추가 지문도 포함</li>
          </ul></div>
        <div class="blk"><h3>왜 마지막인가</h3>
          <div class="why"><p>리포트가 다음 회차를 정합니다. 낮은 축과 진단이 가리킨 문항을 연습형으로 끊어 다시 한 뒤 실전형으로 돌아가 같은 자리가 올라갔는지 확인합니다.</p><p>순위는 점수와 연습량만 보여 줍니다. 같은 대학을 지망하는 학생들 사이에서 내 위치를 알 수 있고, 남의 답을 볼 길은 없습니다.</p></div></div>
        <div class="blk"><h3>인강, 두 종류</h3>
          <ul>
            <li>공통 풀이 인강. 제시문 면접을 어떻게 읽고 어떻게 말하는지, 다섯 단위에 공통인 풀이법. 단위 전권에 포함되고 인강만 따로는 220,000원</li>
            <li>세트별 풀이법 인강. 세트마다 한 편, 그 세트의 제시문과 문항으로 풀이 순서를 보임. 낱권을 사면 그 세트 1편이, 단위 전권을 사면 그 단위 30편이 딸려 옴</li>
            <li>시청은 마이페이지의 내 강의, 시청 기간은 지급일부터 3개월. 공개 편수는 열람 시점 기준으로 지문 목록과 내 강의에 표시</li>
          </ul></div>
      </div>
    </div>
  </div>
</section>

<!-- 하강, 순서의 차이 -->
<section class="sec mat" id="diff">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">준비 순서의 차이</p>
      <h2 class="h2">기출을 눈으로 푸는 준비와 시간 안에 말하고 돌려받는 준비</h2>
      <p class="lede" style="margin-top:var(--s4)">흔한 준비는 기출 제시문을 읽고 답안을 써 봅니다. 이 스튜디오의 순서는 지원 대학 규격의 타이머 안에서 말하는 데서 시작하고, 말한 것을 전사와 첨삭으로 돌려받는 데서 끝납니다.</p>
    </div>
    <table class="cmp rv">
      <caption>흔한 준비와 스튜디오 순서 비교</caption>
      <thead><tr><th scope="col">단계</th><th scope="col">흔한 준비</th><th scope="col">이 스튜디오의 순서</th></tr></thead>
      <tbody>
        <tr><td>문제</td><td>여러 대학 기출을 섞어 읽기</td><td>지원 단위의 규격 그대로 저작한 150세트 (1단계)</td></tr>
        <tr><td>시간</td><td>시간 제한 없이 답안 쓰기</td><td>준비 8분 또는 21분, 답변 5분 또는 7분 타이머 (2단계)</td></tr>
        <tr><td>답변</td><td>글로 쓰거나 머릿속으로</td><td>전면 카메라 앞에서 소리 내어 답하고 전사와 태도 신호를 기록 (3단계)</td></tr>
        <tr><td>채점</td><td>없음, 또는 해설과 눈으로 대조</td><td>루브릭 대조와 밴드와 인용 근거와 여섯 축 (4단계)</td></tr>
        <tr><td>복기</td><td>같은 실수의 반복</td><td>진단 여섯 유형과 내 답변 위에 세운 구술체 재구성 (4단계)</td></tr>
        <tr><td>재응시</td><td>새 문제로 넘어감</td><td>같은 지문 5회 사다리, 순위로 위치 확인 (5단계)</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- 형태와 가격 -->
<section class="sec" id="format">
  <div class="wrap">
    <div class="split">
      <div class="txt rv">
        <p class="kicker">받는 방법과 가격</p>
        <h2 class="h2">회원 체험 응시 1회, 그다음은 지문 하나로</h2>
        <p class="lede" style="margin-top:var(--s4)">카메라와 마이크가 있는 브라우저면 됩니다. 응시 시간은 대학 규격과 같고 회차마다 세 단 첨삭이 마이페이지에 붙습니다. 응시하지 않은 지문은 공급받은 날부터 7일 이내에 청약철회하실 수 있습니다.</p>
        <ol class="flow">
          <li><span class="n">01</span><h3>회원 가입과 체험 응시</h3><p>회원은 무료 응시 1회. 실제 세트로 리포트까지 받습니다.</p></li>
          <li><span class="n">02</span><h3>지문 또는 단위 고르기</h3><p>지문 낱권 한 편, 지원 단위 전권 30편, 또는 공통 풀이 인강만.</p></li>
          <li><span class="n">03</span><h3>마이페이지에서 응시</h3><p>스튜디오로 바로 열립니다. 리포트와 영상은 마이페이지에 보관.</p></li>
        </ol>
      </div>
      <div class="vis rv"><div class="shot tabshot">{{IMG_TAB}}</div></div>
    </div>
    <ul class="price rv">
      <li><h3>지문 낱권</h3><div class="won">33,000<small>원, 지문 1편</small></div>
        <ul><li>응시 5회에 회차마다 세 단 첨삭</li><li>그 세트 풀이법 인강 1편 포함</li><li>응시 영상 보관과 다시 보기</li><li>응시 12개월, 인강 3개월</li></ul>
        <a class="btn" href="{{UNITS_URL}}">지문 고르기 <span class="arr">→</span></a></li>
      <li class="pick"><span class="tag">권하는 구성</span><h3>응시 단위 전권</h3><div class="won">495,000<small>원, 단위 1곳, 인강 포함</small></div>
        <ul><li>그 단위 지문 30편에 지문마다 5회</li><li>세트별 풀이법 인강 30편과 공통 풀이 인강 포함</li><li>기간 안의 추가 지문 포함</li><li>응시 12개월, 인강 3개월</li><li>낱권 33,000원 × 30편 = 990,000원. 전권 495,000원이면 한 편에 16,500원, 인강까지</li></ul>
        <a class="btn" href="{{UNITS_URL}}">응시 단위 고르기 <span class="arr">→</span></a></li>
      <li><h3>공통 풀이 인강</h3><div class="won">220,000<small>원, 인강만</small></div>
        <ul><li>응시 없이 공통 풀이 인강만 듣는 학생</li><li>단위 전권을 사면 이미 포함되어 따로 살 필요 없음</li><li>마이페이지의 내 강의에서 시청, 구매일부터 3개월</li></ul>
        <a class="btn" href="{{LECTURE_URL}}">인강만 고르기 <span class="arr">→</span></a></li>
      <li><h3>스쿨 플랜</h3><div class="won two">좌석 5개<small>부터, 문의</small></div>
        <ul><li>학원과 단체는 좌석 수에 따라 할인</li><li>강사 계정과 학생 리포트 열람</li><li>문의 이메일로 안내</li></ul>
        <a class="btn" href="mailto:admin@hyunhak.com?subject=스쿨 플랜 문의">이메일로 문의 <span class="arr">→</span></a></li>
    </ul>
    <p class="pricenote rv">990,000원은 낱권 30편의 합산 금액이며 따로 파는 상품이 아닙니다. 가격은 전부 부가세 포함입니다.</p>
  </div>
</section>

<!-- 다섯 단위 -->
<section class="sec mat" id="units">
  <div class="wrap">
    <div class="split rev">
      <div class="txt rv">
        <p class="kicker">응시 단위 다섯, 지문 150편</p>
        <h2 class="h2">지원 단위부터 고르기</h2>
        <p class="lede" style="margin-top:var(--s4)">단위마다 지문 30편. 단위를 누르면 그 단위의 지문 목록과 담기가 있는 스튜디오 면으로 갑니다.</p>
      </div>
      <figure class="vis rv">{{IMG_CAMPUS}}<figcaption class="viscap">표지 일러스트를 옮긴 그림입니다. 각 대학과 제휴하거나 후원받은&nbsp;바 없습니다.</figcaption></figure>
    </div>
    <ul class="units">
      {{UNITS}}
    </ul>
  </div>
</section>

<!-- FAQ -->
<section class="sec" id="faq">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">자주 묻는 질문</p>
      <h2 class="h2">스튜디오에 대해</h2>
    </div>
    <div class="faq rv">
      <details><summary>응시에 무엇이 필요한가</summary><div class="a">카메라와 마이크가 있는 브라우저. 태블릿과 노트북 모두 됩니다. 응시 시간은 대학 규격과 같습니다.</div></details>
      <details><summary>첨삭은 언제 받나</summary><div class="a">응시를 마치면 리포트가 바로 열립니다. 전사와 진단과 구술체 재구성 세 단이 회차마다 마이페이지에 남습니다.</div></details>
      <details><summary>채점은 누가 하나</summary><div class="a">세트마다 붙은 루브릭과 모범 포인트에 전사문을 대조해 자동으로 채점합니다. 기준마다 인용 근거와 밴드가 함께 적히고, 강사 화면에서 사람이 전 시도를 열람합니다.</div></details>
      <details><summary>인강은 무엇이 포함되나</summary><div class="a">단위 전권에는 그 단위 세트별 풀이법 인강 30편과 공통 풀이 인강이 딸려 있습니다. 낱권에는 그 세트 풀이법 인강 1편이 딸려 있고, 공통 풀이 인강만 따로 살 수도 있습니다. 인강 시청 기간은 지급일부터 3개월입니다. 시청은 마이페이지의 내 강의에서 하고, 공개 편수는 지문 목록과 내 강의에 열람 시점 기준으로 표시됩니다.</div></details>
      <details><summary>한 계정을 여럿이 써도 되나</summary><div class="a">1계정 1인입니다. 첫 응시 전 고지에 동의하면 이후 응시의 목소리를 계정 기준과 대조하고, 명백히 다른 목소리가 반복되면 경고 뒤 사람이 검토합니다.</div></details>
      <details><summary>환불은</summary><div class="a">응시권과 인강은 가분적 디지털 콘텐츠입니다. 응시하지 않은 지문과 재생하지 않은 강의는 공급받은 날부터 7일 이내에 청약철회하실 수 있고 그만큼 환불됩니다. 이미 응시한 지문과 재생한 강의는 제공이 개시되어 전자상거래법 제17조 제2항 제5호에 따라 청약철회가 제한됩니다. 단위 전권의 환불액은 잔여 지문 수 비율로 산정합니다. 구매 전 체험 응시 1회로 확인하실 수 있습니다.</div></details>
      <details><summary>서류기반 면접 준비에도 쓸 수 있나</summary><div class="a">스튜디오는 제시문 면접용입니다. 생활기록부가 문제지인 서류기반 면접은 별도 상품인 대학별 가이드북 쪽이 맞습니다.</div></details>
    </div>
  </div>
</section>

<!-- 결말 -->
<section class="sec ink close" id="close">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">2027 대비</p>
      <h2>면접장의 시간표로, 오늘 첫 응시</h2>
      <p class="lede" style="margin-top:var(--s4)">응시 단위를 고르면 그 단위의 지문 30편이 열립니다. 준비 타이머에서 시작해 내 답변 위에 세운 구술체 재구성으로 끝나는 순서 그대로.</p>
      <div class="cta" style="margin-top:var(--s5)"><a class="btn" href="{{UNITS_URL}}">응시 단위 고르기 <span class="arr">→</span></a><a class="tl" href="{{TRIAL}}">회원 체험 응시 1회</a></div>
      <p class="won">지문 1편 33,000원, 단위 전권 495,000원 인강 포함, 공통 풀이 인강 220,000원. 응시 12개월, 인강 3개월</p>
    </div>
    <div class="vis rv"><div class="shot">{{IMG_PREP_Y}}</div></div>
  </div>
</section>
</main>

<footer class="ft">
  <div class="wrap">
    <div><b>현학적 연구소 <span style="font-family:var(--serif);font-weight:500;color:var(--gray)">玄學的 硏究所</span></b>
      <p>대입 면접 전문. 서류기반면접 가이드북, 제시문 면접 스튜디오.<br>www.hyunhak.com &nbsp; admin@hyunhak.com</p></div>
    <div><b>사업자 정보</b>
      {{BIZ}}
      <p style="margin-top:var(--s3)">화면은 스튜디오 실제 화면. 데모 응시 리포트는 가상 학생의 답변을 실제 채점 경로로 돌린 결과. 발행 {{DATE}}.</p></div>
  </div>
</footer>

<!-- 모바일 하단 구매 바 (900px 이하 상시). 왼쪽 가격 한 줄(#format 앵커, 전권 495,000원 경로)과 오른쪽 1차 CTA 玄墨 fill 한 개. GS-17 B -->
<div class="buybar" role="region" aria-label="지문 낱권 가격과 구매">
  <a class="lab" href="#format"><span class="nm">지문 낱권 한 편</span><span class="won">33,000원</span></a>
  <a class="btn" href="{{UNITS_URL}}">지문 고르기 <span class="arr">→</span></a>
</div>

<script>
(function(){
  if(!('IntersectionObserver' in window)){document.querySelectorAll('.rv').forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
  document.querySelectorAll('.rv').forEach(function(e){io.observe(e)});
})();
</script>
</body>
</html>
"""


def main():
    stage = ('<figure class="solo"><div class="scr">'
             + img(STAGE['prep'], '준비 시간 화면. 왼쪽에 제시문, 오른쪽에 21분 타이머와 답변 메모', '', lazy=False)
             + '</div><figcaption class="scrcap"><b>준비 시간 화면</b><span>고려대 규격 21분</span></figcaption></figure>')
    openers = [('home', '세트 고르기'), ('brief', '응시 전 점검'), ('prep', '준비 시간'), ('answer', '답변 촬영'), ('report', '여섯 축 리포트'), ('revision', '첨삭 세 단')]
    open_html = '\n'.join(f'<li class="rv"><div class="shot">{img(IMG[k], cap)}</div><span>{cap}</span></li>' for k, cap in openers)
    setrows = []
    for c in ORDER:
        u = next(x for x in units if x['code'] == c)
        for i, s in enumerate(u['sets'][:3]):
            th = f'<th rowspan="3" scope="row">{esc(UNIT_COPY[c][0])}</th>' if i == 0 else ''
            setrows.append(f'<tr>{th}<td>{esc(s["title"])}</td><td class="r">{esc(s["difficulty"])}</td></tr>')
    h = HTML.replace('{{CSS}}', CSS).replace('{{STAGE}}', stage).replace('{{OPEN}}', open_html).replace('{{UNITS}}', UNITS)
    h = h.replace('{{SETROWS}}', '\n            '.join(setrows))
    h = (h
          .replace('{{SHOT_HOME}}', shot_block('home', '세트 고르기 화면, 고려대 계열적합 인문 세트 목록'))
          .replace('{{SHOT_PREP}}', shot_block('prep', '준비 시간 화면, 제시문과 21분 타이머와 답변 메모'))
          .replace('{{SHOT_ANSWER}}', shot_block('answer', '답변 촬영 화면, 세 문항과 7분 타이머와 녹화 표시'))
          .replace('{{SHOT_REVISION}}', shot_block('revision', '첨삭 화면, 전사록 정리와 진단 여섯 유형'))
          .replace('{{SHOT_REPORT}}', shot_block('report', '평가 리포트 화면, 여섯 축 도형과 문항별 루브릭 채점'))
          .replace('{{IMG_TAB}}', img(IMG['tab'], '태블릿 세로 화면의 준비 시간, 자료 그래프와 문제'))
          .replace('{{IMG_CAMPUS}}', img(CAMPUS, '연세대학교 언더우드관과 고려대학교 정문 일러스트'))
          .replace('{{IMG_PREP_Y}}', img(IMG['prep_y'], '연세대 세트 준비 시간 화면')))
    h = (h.replace('{{DL_EOJ}}', str(dl['eojeol_count'])).replace('{{DL_SPEECH}}', f"{dl['speech_seconds']:.1f}")
          .replace('{{DL_WPM}}', f"{dl['words_per_minute']:.1f}").replace('{{DL_FILLER}}', str(dl['filler_count']))
          .replace('{{DL_FILLER_BD}}', ', '.join(f'{k} {v}' for k, v in dl['filler_breakdown'].items()))
          .replace('{{DL_SIL}}', f"{dl['silence_ratio'] * 100:.1f}").replace('{{DL_USED}}', f"{dl['time_used_seconds']:.1f}")
          .replace('{{DL_ALLOT}}', f"{dl['time_allotted_seconds']:.0f}"))
    h = (h.replace('{{REV_WASHED}}', esc(rev['washed_transcript'])).replace('{{REV_N}}', str(len(rev['issues'])))
          .replace('{{ISSUES}}', ISSUES).replace('{{REV_MODEL}}', esc(model_first)))
    h = (h.replace('{{HOME}}', link('/')).replace('{{UNITS_URL}}', link('/studio.html#units')).replace('{{LECTURE_URL}}', link('/studio.html#lecture')).replace('{{TRIAL}}', link('/studio.html#trialGo'))
          .replace('{{FAVICON}}', '../assets/favicon_32.png' if MODE == 'site' else SITE + '/assets/favicon_32.png')
          .replace('{{DATE}}', datetime.date.today().isoformat()))
    h = h.replace('{{BIZ}}', biz_block())
    assert '{{BIZ}}' not in h
    assert '{{' not in h, [l for l in h.splitlines() if '{{' in l][:3]
    out = (SITE_ROOT / 'programs' / 'studio.html') if MODE == 'site' else OUT / OUTNAME
    if MODE == 'site':
        # og:image 1200x630 = 준비 시간 실물 화면 상단(제시문 + 타이머). AI 정물(std_desk) 대체, 2026-09-03 건우 지시
        og = Image.open(SHOTS / 'prep_korea.png').convert('RGB').crop((0, BAR, 2560, 1600))   # critic P2: 리포트 화면은 낙제 점수(20/100)가 지배 요소. 준비 시간 화면(제시문 + 21분 타이머)으로
        og = og.resize((1200, round(og.height * 1200 / og.width)), Image.LANCZOS).crop((0, 0, 1200, 630))
        og.save(SITE_ROOT / 'assets' / 'photo' / 'std' / 'std_og.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
    out.write_text(h, encoding='utf-8')
    print(out, f"{out.stat().st_size/1e6:.2f} MB", 'MODE', MODE, 'sets', TOTAL_SETS, LV_ALL)


if __name__ == '__main__':
    main()
