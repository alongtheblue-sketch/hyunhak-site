#!/usr/bin/env python3
# r3 빌더 (디자이너 = Fable 세션). 사용: python3 build_r3.py [dirG,dirH,dirI]
# 산출 = r3/dir*/{story.html, story_promo.html, brochure.html, style.css}. 렌더와 게이트 = node render.mjs r3
# 사실값 원천 = BRIEF_r1.md §1.5 (studio.html b51c0fb 스냅샷). 이 파일 밖에서 수치를 새로 만들지 않는다.
import sys, os, html

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTO = '../../inputs/photo/'
NAT = {  # 원본 px (magick identify 실측)
    'std_answer.jpg': (1400, 801), 'std_brief.jpg': (1400, 736), 'std_delivery.jpg': (1400, 456),
    'std_home.jpg': (1400, 801), 'std_prep_y.jpg': (1400, 801), 'std_prep.jpg': (1400, 801),
    'std_report.jpg': (1400, 801), 'std_revision.jpg': (1400, 1167), 'std_stage_prep.jpg': (1200, 758),
    'std_tab.jpg': (900, 1138),
}
PX_PER_MM_300 = 11.811  # 300 dpi


def shot(src, x, y, w, crop=None, alt='', cls='', unit='mm', h=None):
    """캡처 프레임. crop=(x0,y0,x1,y1) 원본 px. object-view-box 로 잘라 img 박스 = 프레임 박스."""
    W, H = NAT[src]
    x0, y0, x1, y1 = crop if crop else (0, 0, W, H)
    cw, ch = x1 - x0, y1 - y0
    if h is None:
        h = w * ch / cw
    if unit == 'mm':  # 인쇄 300dpi 상한: 원본 px / 11.811 >= 배치 mm
        assert cw / PX_PER_MM_300 >= w - 0.05, f'{src} {w}mm 는 300dpi 미달 (상한 {cw / PX_PER_MM_300:.1f}mm)'
    vb = f'object-view-box: inset({y0}px {W - x1}px {H - y1}px {x0}px);' if crop else ''
    st = (f'position:static;' if x is None else f'left:{x}{unit};top:{y}{unit};') + f'width:{w}{unit};height:{h:.2f}{unit};'
    return (f'<img class="shot {cls}" src="{PHOTO}{src}" alt="{html.escape(alt)}" style="{st}{vb}">', h)


def inline_svg(rel, style, label=''):
    """currentColor SVG 를 인라인으로 심는다 (CSS mask 는 PDF 에서 박스 경계 헤어라인이 생긴다)."""
    import re
    t = open(os.path.join(HERE, 'inputs', 'logo', rel), encoding='utf-8').read()
    t = t[t.index('<svg'):]
    t = re.sub(r'<title>.*?</title>\s*', '', t, flags=re.S)  # 제목 텍스트는 aria-label 로 대체 (게이트 소형 글자, em 대시 회피)
    root_end = t.index('>')
    root = t[:root_end]
    vb = re.search(r'viewBox="([^"]+)"', root).group(1)
    aria = f'role="img" aria-label="{label}"' if label else 'aria-hidden="true"'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" preserveAspectRatio="xMidYMid meet" fill="currentColor" {aria} style="display:block;{style}"' + t[root_end:]


def report_split(x, y, w, unit='mm', body_bottom=720, alt='첨삭 리포트 화면. 여섯 축 평가와 문항별 루브릭 채점'):
    """std_report 를 제목 띠(20~112)와 본문(160~body_bottom) 두 크롭으로 이어 붙인다. 사이 메타 줄은 지면에 싣지 않는다."""
    W = 1200
    h1 = w * 92 / W
    h2 = w * (body_bottom - 160) / W
    r = '1.2mm' if unit == 'mm' else '14px'
    pos = 'position:static;' if x is None else f'position:absolute;left:{x}{unit};top:{y}{unit};'
    sh = '0 0 0 0.3pt rgba(49,46,46,.5), 0 0.6mm 1.6mm rgba(49,46,46,.16)' if unit == 'mm' else '0 0 0 1px rgba(49,46,46,.5), 0 12px 28px rgba(49,46,46,.35)'
    inner = (f'<img src="{PHOTO}std_report.jpg" alt="{html.escape(alt)}" style="display:block;width:{w}{unit};height:{h1:.2f}{unit};object-fit:cover;object-view-box: inset(20px 100px {801 - 112}px 100px);">'
             f'<img src="{PHOTO}std_report.jpg" alt="" style="display:block;width:{w}{unit};height:{h2:.2f}{unit};object-fit:cover;object-view-box: inset(160px 100px {801 - body_bottom}px 100px);">')
    return (f'<div class="shotwrap" style="{pos}width:{w}{unit};height:{h1 + h2:.2f}{unit};border-radius:{r};overflow:hidden;background:var(--paper);box-shadow:{sh}">{inner}</div>', h1 + h2)


# ---------------------------------------------------------------- 공통 데이터
UNITS = [
    ('01', '연세대', '활동우수형 인문통합', '8분', '5분', '2개'), ('02', '연세대', '활동우수형 자연', '8분', '5분', '2개'),
    ('03', '연세대', '국제형', '8분', '5분', '2개'), ('04', '연세대 미래', '자율융합', '10분', '5분', '3개'),
    ('05', '연세대 미래', '디자인', '10분', '5분', '3개'), ('06', '연세대 미래', '첨단', '10분', '5분', '3개'),
    ('07', '연세대 미래', '보건', '10분', '5분', '3개'), ('08', '연세대 미래', '국제', '10분', '5분', '3개'),
    ('09', '고려대', '계열적합전형 인문', '21분', '7분', '3개'), ('10', '고려대', '계열적합전형 자연', '21분', '7분', '3개'),
    ('11', '고려대', '고른기회전형 인문', '12분', '6분', '3개'), ('12', '고려대', '고른기회전형 자연', '12분', '6분', '3개'),
]


def units_table(rows, caption):
    body = ''.join(
        f'<tr><td class="no">{n}</td><td>{u}</td><td>{t}</td><td class="num">{a}</td><td class="num">{b}</td><td class="num">{q}</td></tr>'
        for n, u, t, a, b, q in rows)
    return (f'<table class="units"><caption>{caption}</caption><colgroup><col style="width:9%"><col style="width:23%"><col><col style="width:12%"><col style="width:12%"><col style="width:12%"></colgroup>'
            f'<thead><tr><th scope="col">번호</th><th scope="col">대학</th><th scope="col">전형</th><th scope="col" class="num">준비</th><th scope="col" class="num">답변</th><th scope="col" class="num">질문</th></tr></thead>'
            f'<tbody>{body}</tbody></table>')


PRICING = '''<table class="pricing"><colgroup><col style="width:15%"><col style="width:28%"><col style="width:31%"><col style="width:26%"></colgroup>
<thead><tr><th scope="col">비교 항목</th><th scope="col">지문 낱권</th><th scope="col">응시 단위 전권</th><th scope="col">공통 풀이 인강</th></tr></thead>
<tbody>
<tr class="price"><th scope="row">가격</th><td>33,000원</td><td>495,000원</td><td>220,000원</td></tr>
<tr><th scope="row">지문 수</th><td>지문 1편</td><td>지문 30편</td><td>인강만 제공</td></tr>
<tr><th scope="row">응시 횟수</th><td>지문당 5회</td><td>지문당 5회</td><td>응시 미포함</td></tr>
<tr><th scope="row">포함 인강</th><td>해당 세트 풀이법 1편</td><td>세트별 풀이법 30편과 공통 풀이</td><td>공통 풀이 인강</td></tr>
<tr><th scope="row">유효기간</th><td>응시 3개월(구매일부터)<br>인강 3개월(지급일부터)</td><td>응시 3개월(구매일부터)<br>인강 3개월(지급일부터)</td><td>3개월</td></tr>
<tr><th scope="row">청약철회</th><td>제공이 개시되기 전까지</td><td>지문 하나라도 응시하면 제한</td><td>제공이 개시되기 전까지, 강의 재생 전</td></tr>
</tbody></table>'''

FAQ = [('구매 전 체험', '회원 가입 후 무료로 1회 응시'),
       ('녹화 위치', '스튜디오 앱의 답변 화면에서 말하면 그 자리에서 녹음과 녹화. 따로 찍어 올리는 절차 없음'),
       ('이용권 시작', '마이페이지 이용권의 응시하러 가기. 앱이 열리면 세트 카드를 누르고 면접 시작')]

STEPS = [('01', '지문 선택', '앱 안의 세트 카드에서 선택. 제시문과 문제는 준비 화면에 나오므로 따로 풀어 올 자료 없음', 'std_home.jpg', '스튜디오 지문 선택 화면'),
         ('02', '실전형 응시', '실제 고사장 규격으로 문항을 나누지 않고 응시. 답변은 그 화면에서 녹음과 녹화', 'std_prep_y.jpg', '제시문 준비 화면'),
         ('03', '첨삭 세 단', '채점 뒤 리포트에 전사, 오독과 비약 진단, 구술체 재구성 제공', 'std_report.jpg', '첨삭 리포트 화면'),
         ('04', '연습형 재응시', '막힌 자리만 끊어 다시 응시. 해설 강의는 마이페이지 내 강의에서 시청', 'std_brief.jpg', '실전형과 연습형 선택 화면')]

FACTS6 = [('390', '세트', '제시문'), ('12', '단위', '응시 단위'), ('5', '회', '지문당 응시'),
          ('3', '단', '첨삭'), ('3', '개월', '구매일부터 응시'), ('1', '회', '가입 후 무료 응시')]

PROMO_LINE = '9월 30일까지 전 상품 정가에서 30% 할인'  # 라이브 원문 "전 상품을 정가에서 30% 할인합니다" 의 명사형
TAG1, TAG2, NAME = '혼자서도 완벽하게 대비하는', '연세대/고려대 제시문 면접', '면접 스튜디오'  # 건우 지정 문구 (09-20 16:42)


def spec_bars(scale):
    """실제 고사장 규격 비례 막대. scale = mm per 분."""
    def row(univ, prep, ans, q):
        return (f'<div class="spec-row"><span class="spec-univ">{univ}</span>'
                f'<span class="bar prep" style="width:{prep * scale:.2f}mm">준비 {prep}분</span>'
                f'<span class="bar ans" style="width:{ans * scale:.2f}mm">답변 {ans}분</span>'
                f'<span class="spec-q">{q}문항</span></div>')
    return f'<div class="spec">{row("연세대", 8, 5, 2)}{row("고려대", 21, 7, 3)}</div>'


def contact_block():
    return ('<div class="contact"><h3>문의</h3>'
            '<p class="c-line"><span class="url">www.hyunhak.com</span></p>'
            '<p class="c-line"><span class="url">admin@hyunhak.com</span></p>'
            '<p class="c-line">070-8098-0671</p>'
            '<p class="c-addr">서울특별시 강남구 테헤란로 70길 12,<br>402-941A호(대치동, H 타워)</p></div>')


BIZ = '상호 현학적 연구소, 대표 현건우, 사업자등록번호 293-38-01827'

# ---------------------------------------------------------------- 공통 CSS
CSS_COMMON = r'''
@page { size: 216mm 303mm; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; }
body { font-family: var(--sans); color: var(--ink); font-feature-settings: "halt" 1, "palt" 1, "kern" 1; word-break: keep-all; overflow-wrap: break-word; widows: 3; orphans: 3; }
h1, h2, h3, p, ul, ol, figure, table, caption { margin: 0; padding: 0; }
ul, ol { list-style: none; }
.url { overflow-wrap: anywhere; }
.shot { position: absolute; display: block; object-fit: cover; background: var(--paper); border-radius: 1.2mm;
  box-shadow: 0 0 0 0.3pt rgba(49,46,46,.5), 0 0.6mm 1.6mm rgba(49,46,46,.16); }

/* ---- 브로슈어 공통 ---- */
.page { width: 216mm; height: 303mm; overflow: hidden; position: relative; background: var(--paper); break-after: page; page-break-after: always; }
.page:last-of-type { break-after: auto; page-break-after: auto; }
.wrap { position: absolute; inset: 23mm; }
.wrap > * { position: absolute; }
.field { position: absolute; background: var(--ink); }
.serif { font-family: var(--serif); }
.sec-h { font-family: var(--serif); font-weight: 700; font-size: 13.4pt; line-height: 1.3; letter-spacing: -0.04em; display: flex; align-items: center; gap: 3mm; white-space: nowrap; }
.sec-h::after { content: ""; flex: 1; height: 0; border-top: 0.5pt solid var(--ink); }
.sec-h .sub { font-family: var(--sans); font-weight: 400; font-size: 8pt; letter-spacing: -0.01em; color: var(--gray); }
.cap { font-size: 7.5pt; line-height: 1.5; color: var(--gray); letter-spacing: -0.01em; white-space: nowrap; }
.body { font-size: 9.5pt; line-height: 1.7; letter-spacing: -0.025em; }
.marker { position: absolute; width: 4.6mm; height: 4.6mm; border-radius: 50%; background: var(--ink); color: var(--paper); font-weight: 700; font-size: 8pt; line-height: 4.6mm; text-align: center; box-shadow: 0 0 0 0.5mm var(--paper); font-variant-numeric: tabular-nums; }
.marker.inline { position: static; display: inline-block; box-shadow: none; flex: 0 0 4.6mm; }

table { border-collapse: collapse; width: 100%; font-size: 8.2pt; line-height: 1.32; letter-spacing: -0.02em; }
caption { text-align: left; font-weight: 700; font-size: 9.5pt; padding-bottom: 1.4mm; letter-spacing: -0.025em; white-space: nowrap; }
thead th { font-weight: 600; font-size: 7.5pt; color: var(--gray); text-align: left; padding: 0.8mm 1.4mm; border-top: 0.75pt solid var(--ink); border-bottom: 0.5pt solid var(--ink); white-space: nowrap; }
tbody td, tbody th { padding: 0.5mm 1.4mm; border-bottom: 0.25pt solid rgba(105,101,97,.5); text-align: left; font-weight: 400; vertical-align: top; }
tbody tr:last-child td, tbody tr:last-child th { border-bottom: 0.75pt solid var(--ink); }
.num, thead th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.units td { white-space: nowrap; }
.units .no { color: var(--gray); font-variant-numeric: tabular-nums; }
.pricing tbody th { font-weight: 600; white-space: nowrap; color: var(--ink); }
.pricing thead th { font-size: 8.4pt; color: var(--ink); font-weight: 700; }
.pricing .price td { font-weight: 700; font-size: 13pt; line-height: 1.3; color: var(--verm); font-variant-numeric: tabular-nums; letter-spacing: -0.03em; padding-top: 1.1mm; padding-bottom: 1.1mm; }
.pricing .price th { vertical-align: middle; }

.spec { display: grid; gap: 2.2mm; }
.spec-row { display: flex; align-items: center; height: 6.4mm; }
.spec-univ { flex: 0 0 13mm; font-weight: 700; font-size: 8.6pt; letter-spacing: -0.025em; }
.bar { height: 6.4mm; line-height: 6.4mm; font-size: 7.5pt; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.bar.prep { border: 0.5pt solid var(--ink); background: transparent; color: var(--ink); }
.bar.ans { background: var(--ink); color: var(--paper); }
.spec-q { margin-left: 2.4mm; font-size: 7.5pt; color: var(--gray); white-space: nowrap; }

.faq dt { font-weight: 700; font-size: 8.6pt; letter-spacing: -0.025em; }
.faq dd { margin: 0 0 2mm 0; font-size: 8.4pt; line-height: 1.6; letter-spacing: -0.025em; color: var(--body); }
.faq dd:last-child { margin-bottom: 0; }
.contact h3 { font-family: var(--serif); font-weight: 700; font-size: 13.4pt; letter-spacing: -0.04em; line-height: 1.3; margin-bottom: 1.6mm; }
.contact .c-line { font-size: 9.5pt; line-height: 1.6; font-weight: 600; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.contact .c-addr { font-size: 8pt; line-height: 1.55; color: var(--body); margin-top: 1.2mm; letter-spacing: -0.025em; }
.qr { position: absolute; width: 20mm; height: 20mm; display: block; }
.biz { font-size: 7pt; line-height: 1.4; color: var(--gray); letter-spacing: -0.01em; white-space: nowrap; }

/* ---- 스토리 공통 ---- */
body.story { width: 1080px; height: 1920px; overflow: hidden; position: relative; }
body.story > * { position: absolute; }
body.story .shot { border-radius: 14px; box-shadow: 0 0 0 1px rgba(49,46,46,.5), 0 12px 28px rgba(49,46,46,.35); }
.s-name { font-family: var(--serif); font-weight: 700; letter-spacing: -0.04em; line-height: 1.15; white-space: nowrap; }
.s-tag1 { font-family: var(--serif); font-weight: 500; letter-spacing: -0.035em; line-height: 1.3; white-space: nowrap; }
.s-tag2 { font-family: var(--serif); font-weight: 700; letter-spacing: -0.04em; line-height: 1.25; white-space: nowrap; }
.s-url { font-size: 32px; line-height: 48px; font-weight: 600; letter-spacing: -0.01em; }
.s-promo { font-size: 38px; line-height: 57px; font-weight: 600; letter-spacing: -0.02em; white-space: nowrap; display: flex; align-items: center; gap: 16px; }
.s-promo::before { content: ""; width: 12px; height: 12px; border-radius: 50%; background: var(--verm); flex: 0 0 12px; }
.s-line { font-size: 36px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; white-space: nowrap; font-variant-numeric: tabular-nums; }
.s-cap { font-size: 32px; line-height: 44px; letter-spacing: -0.01em; white-space: nowrap; }
'''

HEAD = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{t}</title><link rel="stylesheet" href="../../inputs/fonts.css"><link rel="stylesheet" href="style.css"></head>'


DANS = [('1단 전사', '내 답변을 글로 옮긴 정리본', (30, 170, 880, 350), '첨삭 세 단 화면 중 내 답변 전사록'),
        ('2단 오독과 비약 진단', '질문 미응답, 개념 오류, 근거 부족', (30, 395, 880, 622), '첨삭 세 단 화면 중 진단'),
        ('3단 구술체 재구성', '소리 내어 따라 말하는 모범 재구성', (30, 955, 880, 1118), '첨삭 세 단 화면 중 구술체 재구성')]
AXIS = '채점 축은 내용 4축과 전달력, 태도. 고려대 3번 문항은 종합적 사고력도 채점.'


def sec_captures(rep_w=94, dan_w=71):
    rep_, _ = report_split(None, None, rep_w)
    dans = ''
    for k_, sub, crop, alt in DANS:
        im, _ = shot('std_revision.jpg', None, None, dan_w, crop=crop, alt=alt)
        dans += f'<div class="g-dan"><p class="k">{k_}<i>{sub}</i></p>{im}</div>'
    return ('<h2 class="sec-h">채점 리포트와 첨삭 세 단<span class="sub">응시를 마치면 받는 화면</span></h2>'
            f'<div class="row" style="grid-template-columns:{rep_w}mm {dan_w}mm"><div>{rep_}<p class="cap" style="margin-top:1.6mm">첨삭 리포트 화면. 여섯 축 평가와 문항별 루브릭 채점</p>'
            f'<p class="g-axis" style="margin-top:2.4mm">{AXIS}</p></div><div class="dans">{dans}</div></div>')


def sec_units(extra='delivery'):
    if extra == 'delivery':
        dl, _ = shot('std_delivery.jpg', None, None, 82.5, crop=(0, 62, 1400, 262), alt='전달과 태도 화면. 말속도, 필러 표현, 침묵 비율, 답변 시간 사용')
        ex = f'<div style="margin-top:3.4mm">{dl}<p class="cap" style="margin-top:1.4mm">전달과 태도 화면. 말속도, 필러 표현, 침묵 비율</p></div>'
    else:
        ex = f'<div style="margin-top:3.6mm"><p class="cap" style="color:var(--ink);font-weight:700;font-size:8.6pt;margin-bottom:1.6mm">실제 고사장 규격의 시간 비례</p>{spec_bars(2.05)}</div>'
    return ('<h2 class="sec-h">응시 단위 12곳<span class="sub">단위마다 지문 30편, 지문당 응시 5회</span></h2>'
            f'<div class="row" style="grid-template-columns:82.5mm 82.5mm"><div>{units_table(UNITS[:8], "연세대 8단위")}</div>'
            f'<div>{units_table(UNITS[8:], "고려대 4단위")}{ex}</div></div>')


def sec_pricing():
    return f'<h2 class="sec-h">스튜디오 이용권 비교</h2><div>{PRICING}</div>'


def sec_foot():
    faq = ''.join(f'<div class="q"><dt>{q}</dt><dd>{a}</dd></div>' for q, a in FAQ)
    return ('<div class="row foot" style="grid-template-columns:94mm 71mm">'
            f'<div><h3 class="g-h3">자주 묻는 질문</h3><dl class="faq2">{faq}</dl></div>'
            f'<div style="position:relative"><div style="width:47mm">{contact_block()}</div>'
            '<img class="qr" src="../../inputs/qr_studio.svg" alt="" style="position:absolute;right:0;top:1mm">'
            '<p class="cap url" style="text-align:right;margin-top:1.2mm;font-size:7.5pt">hyunhak.com/programs/studio.html</p></div></div>'
            f'<div class="bizrow">{inline_svg("small/picto_b.svg", "width:20px;height:20px;color:var(--ink);flex:0 0 20px")}<p class="biz">{BIZ}</p></div>')


def back_page(variant):
    order = {'G': [sec_captures(), sec_units('delivery'), sec_pricing(), sec_foot()],
             'H': [sec_units('delivery'), sec_pricing(), sec_captures(94, 71), sec_foot()],
             'I': [sec_captures(94, 71), sec_pricing(), sec_units('delivery'), sec_foot()]}[variant]
    return '<section class="page back"><div class="wrap flow">' + ''.join(order) + '</div></section>'



# ================================================================= dirG: 먹 밴드에 걸친 큰 도판 + 가로 4단 절차
CSS_G = r'''
.g-mast { font-size: 9.5pt; font-weight: 600; letter-spacing: 0.02em; color: var(--paper); white-space: nowrap; }
.g-mast .dim { font-weight: 400; opacity: .78; margin-left: 2.5mm; letter-spacing: -0.01em; }
.g-h1 { font-family: var(--serif); font-weight: 700; font-size: 27pt; line-height: 1.3; letter-spacing: -0.04em; color: var(--paper); white-space: nowrap; }
.g-sub { font-size: 10.5pt; line-height: 1.6; letter-spacing: -0.025em; color: var(--paper); white-space: nowrap; }
.g-side-top { color: var(--paper); }
.g-side-top .k { font-size: 7.5pt; letter-spacing: 0.04em; opacity: .78; }
.g-side-top .t { font-family: var(--serif); font-weight: 700; font-size: 13.4pt; line-height: 1.35; letter-spacing: -0.04em; margin-top: 0.8mm; }
.g-legend li { display: flex; gap: 2.2mm; align-items: flex-start; margin-bottom: 2.6mm; }
.g-legend b { display: block; font-size: 8.8pt; line-height: 1.45; letter-spacing: -0.025em; }
.g-legend span.d { display: block; font-size: 8pt; line-height: 1.5; color: var(--body); letter-spacing: -0.025em; }
.g-step .n { font-family: var(--serif); font-weight: 500; font-size: 22pt; line-height: 1; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.g-step .t { font-weight: 700; font-size: 10.5pt; letter-spacing: -0.03em; line-height: 1.3; white-space: nowrap; }
.g-step .d { font-size: 8.2pt; line-height: 1.6; letter-spacing: -0.025em; color: var(--body); }
.g-spine { height: 0; border-top: 0.5pt solid var(--ink); }
.g-node { width: 2.2mm; height: 2.2mm; border-radius: 50%; background: var(--ink); }
.g-facts { display: flex; align-items: flex-end; border-top: 0.75pt solid var(--ink); border-bottom: 0.75pt solid var(--ink); padding: 3mm 0 2.6mm; }
.g-facts .f { flex: 1; padding-left: 3.4mm; border-left: 0.25pt solid rgba(105,101,97,.6); }
.g-facts .f:first-child { flex: 1.9; padding-left: 0; border-left: 0; }
.g-facts .l { display: block; font-size: 7.6pt; color: var(--gray); letter-spacing: -0.01em; line-height: 1.4; white-space: nowrap; }
.g-facts .v { font-weight: 600; font-size: 17pt; line-height: 1.2; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.g-facts .v small { font-size: 8.5pt; font-weight: 600; margin-left: 0.6mm; letter-spacing: -0.02em; }
.g-facts .f:first-child .v { font-size: 30pt; line-height: 1.05; }
.g-sign .k { font-size: 7.5pt; color: var(--gray); letter-spacing: 0.02em; }
.g-sign .s { font-family: var(--serif); font-weight: 500; font-size: 10.5pt; line-height: 1.5; letter-spacing: -0.035em; white-space: nowrap; }
.g-sign .m { font-size: 8pt; color: var(--body); letter-spacing: -0.025em; white-space: nowrap; }
.g-url { font-weight: 700; font-size: 11pt; letter-spacing: -0.01em; white-space: nowrap; text-align: right; }
.g-run { font-size: 8pt; color: var(--gray); letter-spacing: 0.02em; white-space: nowrap; }
.g-dan .k { font-family: var(--serif); font-weight: 700; font-size: 10.5pt; letter-spacing: -0.04em; white-space: nowrap; }
.g-dan .k i { font-style: normal; font-family: var(--sans); font-weight: 400; font-size: 7.8pt; color: var(--gray); margin-left: 1.6mm; letter-spacing: -0.02em; }
.g-axis { font-size: 8.2pt; line-height: 1.6; letter-spacing: -0.025em; color: var(--body); }
.wrap.flow { display: flex; flex-direction: column; gap: 4.2mm; }
.wrap.flow > .sec-h { margin-bottom: -1.8mm; }
.wrap.flow > * { position: static; flex-shrink: 0; }
.row { display: grid; column-gap: 5mm; align-items: start; }
.dans { display: grid; gap: 3mm; }
.g-dan .k { margin-bottom: 1.3mm; }
.g-h3 { font-family: var(--serif); font-weight: 700; font-size: 13.4pt; letter-spacing: -0.04em; line-height: 1.3; margin-bottom: 1.6mm; }
.faq2 .q { display: grid; grid-template-columns: 22mm 1fr; column-gap: 3mm; padding: 1.1mm 0; border-top: 0.25pt solid rgba(105,101,97,.5); }
.faq2 .q:last-child { border-bottom: 0.25pt solid rgba(105,101,97,.5); }
.faq2 dt { font-weight: 700; font-size: 8.4pt; line-height: 1.55; letter-spacing: -0.025em; white-space: nowrap; }
.faq2 dd { margin: 0; font-size: 8.2pt; line-height: 1.55; letter-spacing: -0.025em; color: var(--body); }
.row.foot .qr { position: static; }
.bizrow { display: flex; align-items: center; gap: 2mm; margin-top: -1.6mm; }
/* story G */
body.story.g { background: var(--ink); color: var(--paper); }
body.story.g .logo-full { color: var(--gold); }
'''


def brochure_G():
    W = 170.0
    o = []
    # ---------- 앞면 (절대 배치, 판면 170 x 257)
    o.append('<section class="page front"><div class="field" style="left:0;top:0;width:216mm;height:92mm"></div><div class="wrap">')
    o.append('<p class="g-mast" style="left:0;top:0">제시문 면접 스튜디오<span class="dim">연세대, 고려대 대입 모의면접</span></p>')
    o.append('<h1 class="g-h1" style="left:0;top:10mm">연세대, 고려대 제시문 면접을<br>실전 규격으로 연습합니다</h1>')
    o.append('<p class="g-sub" style="left:0;top:37.5mm">실전 규격으로 촬영 응시하고 첨삭 세 단을 받습니다.</p>')
    o.append(inline_svg('logo_full.svg', 'position:absolute;right:0;top:0;height:30mm;width:29.68mm;color:var(--gold)', '현학적 연구소'))
    hx, hy, hw = 0, 48, 100
    img, hh = shot('std_answer.jpg', hx, hy, hw, crop=(105, 12, 1295, 600), alt='답변 촬영 화면. 답변 시간 타이머와 답변 녹화 중 표시, 내 화면')
    o.append(img)
    k = hw / 1190
    for n, (px, py) in zip('123', [(945 - 105, 62 - 12), (150 - 105, 345 - 12), (662 - 105, 262 - 12)]):
        o.append(f'<span class="marker" style="left:{hx + px * k - 2.3:.2f}mm;top:{hy + py * k - 2.3:.2f}mm">{n}</span>')
    sx = 107
    o.append(f'<div class="g-side-top" style="left:{sx}mm;top:{hy}mm;width:{W - sx}mm"><p class="k">02 실전형 응시</p><p class="t">답변 촬영 화면</p></div>')
    o.append(f'<ol class="g-legend" style="left:{sx}mm;top:73.5mm;width:{W - sx}mm">'
             '<li><span class="marker inline">1</span><span><b>답변 시간</b><span class="d">고려대 7분, 연세대 5분. 실제 고사장 규격</span></span></li>'
             '<li><span class="marker inline">2</span><span><b>답변 녹화 중</b><span class="d">말하면 그 자리에서 녹음과 녹화</span></span></li>'
             '<li><span class="marker inline">3</span><span><b>내 모습 미리보기</b><span class="d">촬영 중 내 화면. 응시 영상은 보관되어 다시 보기 가능</span></span></li></ol>')
    y = 108.5
    o.append(f'<h2 class="sec-h" style="left:0;top:{y:.1f}mm;width:{W}mm">스튜디오 응시 절차<span class="sub">지문 선택부터 재응시까지 네 단계를 앱 화면 안에서</span></h2>')
    y += 9.5
    colw, gut = 38.75, 5.0
    o.append(f'<div class="g-spine" style="left:0;top:{y + 1.1:.1f}mm;width:{W}mm"></div>')
    crops = {'std_home.jpg': (30, 120, 520, 420), 'std_prep_y.jpg': (900, 20, 1380, 520), 'std_report.jpg': (100, 170, 560, 700), 'std_brief.jpg': (320, 372, 800, 716)}
    base = y + 33 + 44.65  # 캡처 바닥선 고정, 캡션 baseline 통일
    for i, (n, t, d, src, cap) in enumerate(STEPS):
        x = i * (colw + gut)
        o.append(f'<span class="g-node" style="left:{x}mm;top:{y:.1f}mm"></span>')
        o.append(f'<div class="g-step" style="left:{x}mm;top:{y + 4.2:.1f}mm;width:{colw}mm"><span class="n">{n}</span> <span class="t">{t}</span></div>')
        o.append(f'<p class="g-step" style="left:{x}mm;top:{y + 14:.1f}mm;width:{colw}mm"><span class="d">{d}</span></p>')
        x0, y0, x1, y1 = crops[src]
        ih = colw * (y1 - y0) / (x1 - x0)
        im, _ = shot(src, x, base - ih, colw, crop=crops[src], alt=cap)
        o.append(im)
        o.append(f'<p class="cap" style="left:{x}mm;top:{base + 1.6:.1f}mm">{cap}</p>')
    fy = 201
    o.append(f'<div class="g-facts" style="left:0;top:{fy}mm;width:{W}mm">' + ''.join(
        f'<div class="f"><span class="l">{l}</span><span class="v">{v}<small>{u}</small></span></div>' for v, u, l in FACTS6) + '</div>')
    by = 229.5
    o.append(f'<div class="g-sign" style="left:0;top:{by}mm;width:78mm"><p class="k">만든 사람</p><p class="s">한 사람이 제시문 390세트를<br>같은 기준으로 편집합니다.</p><p class="m">13년차 입시 컨설턴트 운영</p></div>')
    o.append(f'<p class="g-url url" style="left:0;top:252mm">hyunhak.com</p>')
    o.append(f'<div style="left:87.5mm;top:{by}mm;width:82.5mm"><p class="g-sign"><span class="k">실제 고사장 규격의 시간 비례</span></p><div style="margin-top:2.2mm">{spec_bars(2.05)}</div>'
             '<p class="cap" style="margin-top:2.2mm;white-space:normal">실전형 응시에 적용되는 실제 고사장 규격.</p></div>')
    o.append('</div></section>')

    o.append(back_page('G'))
    return HEAD.format(t='제시문 면접 스튜디오 브로슈어') + '<body>' + ''.join(o) + '</body></html>'


def story_G(promo=False):
    o = []
    o.append(inline_svg('logo_full.svg', 'position:absolute;left:88px;top:262px;height:132px;width:130.6px;color:var(--gold)', '현학적 연구소'))
    o.append('<p class="s-url" style="right:88px;top:304px">hyunhak.com</p>')
    o.append(f'<h1 class="s-name" style="left:84px;top:426px;font-size:140px">{NAME}</h1>')
    o.append(f'<p class="s-tag1" style="left:88px;top:612px;font-size:48px">{TAG1}</p>')
    o.append(f'<p class="s-tag2" style="left:88px;top:682px;font-size:72px">{TAG2}</p>')
    if promo:
        o.append(f'<p class="s-promo" style="left:88px;top:790px">{PROMO_LINE}</p>')
        bx, by_, bw, fx, fy_, fw = 272, 866, 720, 88, 944, 760
    else:
        bx, by_, bw, fx, fy_, fw = 232, 812, 760, 88, 900, 800
    im, _ = shot('std_report.jpg', bx, by_, bw, crop=(100, 20, 1300, 612), alt='첨삭 리포트 화면', unit='px')
    o.append(im)
    im, h = shot('std_answer.jpg', fx, fy_, fw, crop=(105, 12, 1295, 600), alt='답변 촬영 화면', unit='px')
    o.append(im)
    ly = fy_ + h + 22
    o.append(f'<p class="s-line" style="left:88px;top:{ly:.0f}px">제시문 390세트, 12 응시 단위, 가입 후 무료 응시 1회</p>')
    o.append('<!-- link sticker zone: y1420~1580 비움 -->')
    return HEAD.format(t='면접 스튜디오 스토리') + '<body class="story g">' + ''.join(o) + '</body></html>'


# ================================================================= dirH: 좌측 먹 레일(숫자와 규격) + 세로 타임라인
CSS_H = r"""
.h-k { font-size: 9pt; font-weight: 600; letter-spacing: 0.02em; color: var(--paper); white-space: nowrap; }
.h-h1 { font-family: var(--serif); font-weight: 700; font-size: 20pt; line-height: 1.32; letter-spacing: -0.04em; color: var(--paper); white-space: nowrap; }
.h-sub { font-size: 9pt; line-height: 1.65; letter-spacing: -0.025em; color: var(--paper); }
.h-nums { color: var(--paper); }
.h-nums .r { display: flex; align-items: baseline; justify-content: space-between; border-top: 0.25pt solid rgba(239,233,220,.5); padding: 1.9mm 0 1.7mm; }
.h-nums .r:last-child { border-bottom: 0.25pt solid rgba(239,233,220,.5); }
.h-nums .l { font-size: 7.8pt; letter-spacing: -0.01em; white-space: nowrap; }
.h-nums .v { font-weight: 600; font-size: 17pt; line-height: 1.15; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.h-nums .v small { font-size: 8.5pt; margin-left: .6mm; }
.h-nums .r.big .v { font-size: 30pt; line-height: 1.05; }
.h-spec { color: var(--paper); }
.h-spec .ttl { font-size: 7.8pt; font-weight: 700; letter-spacing: 0.02em; margin-bottom: 2mm; }
.h-spec .lab { font-size: 7.8pt; letter-spacing: -0.01em; margin: 1.6mm 0 1mm; white-space: nowrap; }
.h-spec .rw { display: flex; height: 5.6mm; }
.h-spec .bar { height: 5.6mm; line-height: 5.6mm; font-size: 7.5pt; }
.h-spec .bar.prep { border: 0.5pt solid var(--paper); background: transparent; color: var(--paper); }
.h-spec .bar.ans { background: var(--paper); color: var(--ink); }
.h-spinev { width: 0; border-left: 0.5pt solid var(--ink); }
.h-dan li { display: flex; gap: 2mm; align-items: flex-start; margin-bottom: 2.4mm; font-size: 8.4pt; line-height: 1.45; letter-spacing: -0.025em; }
.h-dan b { display: block; font-weight: 700; }
.h-dan span.d { display: block; color: var(--body); font-size: 7.8pt; }
body.story.h { background: var(--ink); color: var(--ink); }
.h-sheet { left: 0; top: 236px; width: 1080px; height: 1360px; background: var(--paper); }
.h-fact { border-top: 2px solid rgba(49,46,46,.55); width: 412px; padding-top: 14px; }
.h-fact .v { font-weight: 600; font-size: 96px; line-height: 1; letter-spacing: -0.045em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.h-fact .v small { font-size: 40px; margin-left: 6px; letter-spacing: -0.02em; }
.h-fact .l { font-size: 34px; line-height: 46px; letter-spacing: -0.015em; white-space: nowrap; color: var(--body); }
"""


def brochure_H():
    W = 170.0
    o = ['<section class="page front"><div class="field" style="left:0;top:0;width:75mm;height:303mm"></div><div class="wrap">']
    o.append(inline_svg('logo_full.svg', 'position:absolute;left:0;top:0;height:27mm;width:26.7mm;color:var(--gold)', '현학적 연구소'))
    o.append('<p class="h-k" style="left:0;top:33mm">제시문 면접 스튜디오</p>')
    o.append('<h1 class="h-h1" style="left:0;top:39mm">연세대, 고려대<br>제시문 면접을<br>실전 규격으로<br>연습합니다</h1>')
    o.append('<p class="h-sub" style="left:0;top:77.5mm;width:46mm">실전 규격으로 촬영 응시하고 첨삭 세 단을 받습니다.</p>')
    rows = ''.join(f'<div class="r{" big" if i == 0 else ""}"><span class="l">{l}</span><span class="v">{v}<small>{u}</small></span></div>' for i, (v, u, l) in enumerate(FACTS6))
    o.append(f'<div class="h-nums" style="left:0;top:94mm;width:46mm">{rows}</div>')
    sc = 1.6
    def hrow(u, a, b, q):
        return (f'<p class="lab">{u} {q}문항, 준비 {a}분과 답변 {b}분</p><div class="rw"><span class="bar prep" style="width:{a * sc:.2f}mm">{a}분</span>'
                f'<span class="bar ans" style="width:{b * sc:.2f}mm">{b}분</span></div>')
    o.append(f'<div class="h-spec" style="left:0;top:178mm;width:46mm"><p class="ttl">실제 고사장 규격의 시간 비례</p>{hrow("연세대", 8, 5, 2)}{hrow("고려대", 21, 7, 3)}</div>')
    o.append('<p class="g-url url" style="left:0;top:251.5mm;color:var(--paper);text-align:left">hyunhak.com</p>')
    # 타임라인
    X0, XT, XC = 57.0, 64.0, 104.0   # 척추, 글 열, 도판 열
    o.append(f'<h2 class="sec-h" style="left:{X0}mm;top:0;width:{W - X0}mm">스튜디오 응시 절차<span class="sub">모두 앱 화면 안에서</span></h2>')
    o.append(f'<div class="h-spinev" style="left:{X0 + 1.1}mm;top:12mm;height:196mm"></div>')
    def head(i, sy, width=36):
        n, t, d, _, _ = STEPS[i]
        return (f'<span class="g-node" style="left:{X0}mm;top:{sy + 2.4}mm"></span>'
                f'<div class="g-step" style="left:{XT}mm;top:{sy}mm;width:{width}mm"><span class="n">{n}</span> <span class="t">{t}</span></div>'
                f'<p class="g-step" style="left:{XT}mm;top:{sy + 10}mm;width:{width}mm"><span class="d">{d}</span></p>')
    sy = 11.0
    o.append(head(0, sy))
    im, h1 = shot('std_home.jpg', XC, sy, 66, crop=(0, 40, 1400, 640), alt='스튜디오 지문 선택 화면'); o.append(im)
    o.append(f'<p class="cap" style="left:{XC}mm;top:{sy + h1 + 1.6:.1f}mm">스튜디오 지문 선택 화면</p>')
    sy += max(h1 + 7, 33) + 5
    n, t, d, _, _ = STEPS[1]
    o.append(f'<span class="g-node" style="left:{X0}mm;top:{sy + 2.4}mm"></span><div class="g-step" style="left:{XT}mm;top:{sy}mm;width:106mm"><span class="n">{n}</span> <span class="t">{t}</span></div>'
             f'<p class="g-step" style="left:{XT}mm;top:{sy + 10}mm;width:106mm"><span class="d">{d}</span></p>')
    im, ha = shot('std_prep_y.jpg', XT, sy + 21, 41, crop=(560, 20, 1400, 760), alt='제시문 준비 화면'); o.append(im)
    im, hb = shot('std_answer.jpg', XT + 46, sy + 21, 60, crop=(105, 12, 1295, 600), alt='답변 촬영 화면'); o.append(im)
    o.append(f'<p class="cap" style="left:{XT}mm;top:{sy + 21 + ha + 1.6:.1f}mm">제시문 준비 화면</p><p class="cap" style="left:{XT + 46}mm;top:{sy + 21 + hb + 1.6:.1f}mm">답변 촬영 화면. 그 자리에서 녹음과 녹화</p>')
    sy += 21 + ha + 7 + 5
    o.append(head(2, sy))
    im, h3 = shot('std_report.jpg', XC, sy, 66, crop=(100, 20, 1300, 720), alt='첨삭 리포트 화면'); o.append(im)
    o.append(f'<p class="cap" style="left:{XC}mm;top:{sy + h3 + 1.6:.1f}mm">첨삭 리포트 화면. 여섯 축 평가와 문항별 채점</p>')
    sy += h3 + 7 + 5
    o.append(head(3, sy))
    im, h4 = shot('std_brief.jpg', XC, sy, 64, crop=(320, 372, 1080, 716), alt='실전형과 연습형 선택 화면'); o.append(im)
    o.append(f'<p class="cap" style="left:{XC}mm;top:{sy + h4 + 1.6:.1f}mm">실전형과 연습형 선택 화면</p>')
    end = sy + max(h4 + 7, 33)
    o.append(f'<div class="g-sign" style="left:{X0}mm;top:{max(end + 6, 226):.1f}mm;width:{W - X0}mm;border-top:0.75pt solid var(--ink);padding-top:3mm"><p class="k">만든 사람</p>'
             '<p class="s">한 사람이 제시문 390세트를 같은 기준으로 편집합니다.</p><p class="m">13년차 입시 컨설턴트 운영</p></div>')
    o.append('</div></section>')
    o.append(back_page('H'))
    return HEAD.format(t='제시문 면접 스튜디오 브로슈어') + '<body>' + ''.join(o) + '</body></html>'


def story_H(promo=False):
    o = ['<div class="h-sheet"></div>']
    o.append(inline_svg('logo_full.svg', 'position:absolute;left:88px;top:268px;height:132px;width:130.6px;color:var(--ink)', '현학적 연구소'))
    o.append('<p class="s-url" style="right:88px;top:310px">hyunhak.com</p>')
    o.append(f'<h1 class="s-name" style="left:84px;top:430px;font-size:140px">{NAME}</h1>')
    o.append(f'<p class="s-tag1" style="left:88px;top:614px;font-size:48px">{TAG1}</p>')
    o.append(f'<p class="s-tag2" style="left:88px;top:684px;font-size:72px">{TAG2}</p>')
    if promo:
        o.append(f'<p class="s-promo" style="left:88px;top:790px">{PROMO_LINE}</p>')
        top, w, pitch = 872, 400, 158
    else:
        top, w, pitch = 816, 440, 172
    im, _ = shot('std_tab.jpg', 1080 - 88 - w, top, w, alt='제시문 준비 화면', unit='px'); o.append(im)
    for i, (v, u, l) in enumerate([('390', '세트', '기출 규격 제시문'), ('12', '단위', '연세대, 고려대 응시 단위'), ('1', '회', '가입 후 무료 응시')]):
        o.append(f'<div class="h-fact" style="left:88px;top:{top + 4 + i * pitch}px"><p class="v">{v}<small>{u}</small></p><p class="l">{l}</p></div>')
    o.append('<!-- link sticker zone: y1420~1580 비움 -->')
    return HEAD.format(t='면접 스튜디오 스토리') + '<body class="story h">' + ''.join(o) + '</body></html>'


# ================================================================= dirI: 여섯 화면 스토리보드 + 하단 먹 밴드
CSS_I = r"""
.i-mast { font-size: 9.5pt; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap; }
.i-mast .dim { font-weight: 400; color: var(--gray); margin-left: 2.5mm; letter-spacing: -0.01em; }
.i-h1 { font-family: var(--serif); font-weight: 700; font-size: 25pt; line-height: 1.3; letter-spacing: -0.04em; white-space: nowrap; }
.i-sub { font-size: 10pt; line-height: 1.6; letter-spacing: -0.025em; color: var(--body); white-space: nowrap; }
.i-c { display: flex; gap: 2.2mm; align-items: flex-start; }
.i-c b { display: block; font-size: 8.8pt; line-height: 1.4; letter-spacing: -0.025em; white-space: nowrap; }
.i-c span.d { display: block; font-size: 7.8pt; line-height: 1.5; color: var(--body); letter-spacing: -0.025em; }
.i-facts { display: flex; align-items: flex-end; color: var(--paper); }
.i-facts .f { padding-right: 5mm; margin-right: 5mm; border-right: 0.25pt solid rgba(239,233,220,.5); }
.i-facts .f:last-child { border-right: 0; margin-right: 0; padding-right: 0; }
.i-facts .l { display: block; font-size: 7.6pt; letter-spacing: -0.01em; line-height: 1.4; white-space: nowrap; }
.i-facts .v { font-weight: 600; font-size: 16pt; line-height: 1.15; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.i-facts .v small { font-size: 8.5pt; margin-left: .5mm; }
.i-facts .f:first-child .v { font-size: 26pt; line-height: 1.02; }
.i-made { font-size: 8pt; letter-spacing: -0.025em; color: var(--paper); white-space: nowrap; }
body.story.i { background: var(--paper); color: var(--ink); }
.s-mk { width: 60px; height: 60px; border-radius: 50%; background: var(--ink); color: var(--paper); font-size: 34px; font-weight: 700; line-height: 60px; text-align: center; box-shadow: 0 0 0 6px var(--paper); font-variant-numeric: tabular-nums; }
"""

BOARD = [  # (번호, 제목, 설명, src, crop, 폭, x)
    ('01', '지문 선택', '앱 안의 세트 카드에서 선택', 'std_home.jpg', (0, 40, 1400, 600), 104, 0),
    ('02', '응시 방식', '실전형과 연습형 중 선택. 진행 안내 확인', 'std_brief.jpg', (320, 372, 1080, 716), 61, 109),
    ('03', '준비', '제시문과 문제는 준비 화면에. 연세대 8분, 고려대 21분', 'std_prep_y.jpg', (560, 20, 1400, 600), 61, 0),
    ('04', '답변 촬영', '그 자리에서 녹음과 녹화. 연세대 5분, 고려대 7분', 'std_answer.jpg', (105, 12, 1295, 540), 100, 70),
    ('05', '채점 리포트', '여섯 축 평가와 문항별 루브릭 채점', 'std_report.jpg', (100, 20, 1300, 600), 101, 0),
    ('06', '첨삭 세 단', '전사, 오독과 비약 진단, 구술체 재구성', 'std_revision.jpg', (30, 170, 880, 640), 64, 106),
]


def brochure_I():
    W = 170.0
    o = ['<section class="page front"><div class="field" style="left:0;top:252.5mm;width:216mm;height:50.5mm"></div><div class="wrap">']
    o.append('<p class="i-mast" style="left:0;top:0">제시문 면접 스튜디오<span class="dim">연세대, 고려대 대입 모의면접</span></p>')
    o.append('<p class="g-url url" style="right:0;top:-0.6mm">hyunhak.com</p>')
    o.append('<h1 class="i-h1" style="left:0;top:8mm">연세대, 고려대 제시문 면접을<br>실전 규격으로 연습합니다</h1>')
    o.append('<p class="i-sub" style="left:0;top:33.5mm">실전 규격으로 촬영 응시하고 첨삭 세 단을 받습니다.</p>')
    o.append(f'<h2 class="sec-h" style="left:0;top:44mm;width:{W}mm">응시 순서대로 본 여섯 화면<span class="sub">지문 선택부터 첨삭까지 앱 화면 안에서</span></h2>')
    y = 54.0
    for r in range(3):
        hmax = 0
        for n, t, d, src, crop, w, x in BOARD[r * 2:r * 2 + 2]:
            im, h = shot(src, x, y, w, crop=crop, alt=f'{t} 화면'); o.append(im)
            o.append(f'<div class="i-c" style="left:{x}mm;top:{y + h + 2.2:.1f}mm;width:{w}mm"><span class="marker inline" style="font-size:7.4pt">{n}</span><span><b>{t}</b><span class="d">{d}</span></span></div>')
            hmax = max(hmax, h)
        y += hmax + 14.5
    facts = ''.join(f'<div class="f"><span class="l">{l}</span><span class="v">{v}<small>{u}</small></span></div>' for v, u, l in FACTS6)
    o.append(f'<div class="i-facts" style="left:0;top:235.5mm">{facts}</div>')
    o.append('<p class="i-made" style="left:0;top:251.2mm">만든 사람. 한 사람이 제시문 390세트를 같은 기준으로 편집합니다. 13년차 입시 컨설턴트 운영</p>')
    o.append(inline_svg('logo_full.svg', 'position:absolute;right:0;top:233.5mm;height:22.4mm;width:22.16mm;color:var(--gold)', '현학적 연구소'))
    o.append('</div></section>')
    o.append(back_page('I'))
    return HEAD.format(t='제시문 면접 스튜디오 브로슈어') + '<body>' + ''.join(o) + '</body></html>'


def story_I(promo=False):
    o = [inline_svg('logo_full.svg', 'position:absolute;left:88px;top:262px;height:132px;width:130.6px;color:var(--ink)', '현학적 연구소')]
    o.append('<p class="s-url" style="right:88px;top:304px">hyunhak.com</p>')
    o.append(f'<h1 class="s-name" style="left:84px;top:426px;font-size:140px">{NAME}</h1>')
    o.append(f'<p class="s-tag1" style="left:88px;top:612px;font-size:48px">{TAG1}</p>')
    o.append(f'<p class="s-tag2" style="left:88px;top:682px;font-size:72px">{TAG2}</p>')
    if promo:
        o.append(f'<p class="s-promo" style="left:88px;top:790px">{PROMO_LINE}</p>')
        ys, ws = (872, 950, 1140), (540, 580, 540)
    else:
        ys, ws = (800, 886, 1096), (600, 620, 600)
    xs = (88, 236, 352)
    specs = [('std_prep_y.jpg', (0, 20, 1400, 640), '제시문 준비 화면'), ('std_answer.jpg', (105, 12, 1295, 600), '답변 촬영 화면')]
    for i, (src, crop, alt) in enumerate(specs):
        im, h = shot(src, xs[i], ys[i], ws[i], crop=crop, alt=alt, unit='px'); o.append(im)
        o.append(f'<span class="s-mk" style="left:{xs[i] - 22}px;top:{ys[i] - 22}px">{i + 1}</span>')
    im, h = report_split(xs[2], ys[2], ws[2], unit='px', body_bottom=520, alt='첨삭 리포트 화면'); o.append(im)
    o.append(f'<span class="s-mk" style="left:{xs[2] - 34}px;top:{ys[2] - 34}px">3</span>')
    hl = ys[2] + h
    o.append(f'<p class="s-line" style="left:88px;top:{hl + 18:.0f}px">준비, 답변 촬영, 첨삭까지 앱 화면 안에서</p>')
    o.append('<!-- link sticker zone: y1420~1580 비움 -->')
    return HEAD.format(t='면접 스튜디오 스토리') + '<body class="story i">' + ''.join(o) + '</body></html>'


# ================================================================= r4 dirG: 앞면 = 리포트와 첨삭 세 단(실제 문장 조판) + 혼자서도 되는 이유 / 뒷면 = 절차 + 숫자 + 단위 + 가격 + 문의
CSS_G4 = r"""
.sp-col h4 { font-family: var(--serif); font-weight: 700; font-size: 10.5pt; letter-spacing: -0.04em; line-height: 1.3; white-space: nowrap; margin-bottom: 0.6mm; }
.sp-col h4 i { display: block; font-style: normal; font-family: var(--sans); font-weight: 400; font-size: 7.6pt; color: var(--gray); letter-spacing: -0.02em; line-height: 1.4; margin-top: 0.4mm; white-space: normal; }
.sp-quote { border-left: 0.75pt solid var(--ink); padding: 0.6mm 0 0.6mm 2.6mm; font-size: 8pt; line-height: 1.6; letter-spacing: -0.025em; }
.sp-quote mark { background: transparent; color: inherit; box-shadow: inset 0 -0.55em 0 rgba(105,101,97,.22); }
.dg { padding: 1.9mm 0 2.1mm; border-top: 0.25pt solid rgba(105,101,97,.55); }
.dg:last-child { border-bottom: 0.25pt solid rgba(105,101,97,.55); }
.dg .tag { display: inline-block; background: var(--ink); color: var(--paper); font-size: 7pt; font-weight: 700; line-height: 1; padding: 0.9mm 1.5mm 0.8mm; border-radius: 0.6mm; letter-spacing: 0; vertical-align: 0.3mm; margin-right: 1.6mm; }
.dg .q { font-size: 7.8pt; line-height: 1.55; color: var(--gray); letter-spacing: -0.02em; }
.dg .d { font-size: 7.8pt; line-height: 1.55; letter-spacing: -0.025em; margin-top: 0.9mm; color: var(--ink); }
.dg .f { font-size: 7.8pt; line-height: 1.55; letter-spacing: -0.025em; margin-top: 0.9mm; font-weight: 600; display: flex; gap: 1.6mm; }
.dg .f b { flex: 0 0 auto; font-weight: 700; color: var(--gray); font-size: 7pt; letter-spacing: 0.02em; line-height: 1.6; padding-top: 0.15mm; }
.why .n { font-family: var(--serif); font-weight: 500; font-size: 22pt; line-height: 1; letter-spacing: -0.04em; }
.why .t { font-weight: 700; font-size: 10pt; letter-spacing: -0.03em; white-space: nowrap; }
.why .d { font-size: 7.9pt; line-height: 1.6; letter-spacing: -0.025em; color: var(--body); }
.g4-made { font-size: 7.8pt; color: var(--body); letter-spacing: -0.025em; white-space: nowrap; }
.wrap.flow > .steps-blk, .steps-blk { position: relative; }
.steps-blk > * { position: absolute; }
.g-made-line { font-size: 8pt; color: var(--body); letter-spacing: -0.025em; white-space: nowrap; }
"""

TRANSCRIPT = '네, <mark>제시문 [가]는 지능이 다양하다는 내용입니다.</mark> <mark>제시문 [나]는 IQ 테스트 이야기이고, [다]는 똑똑함에 대한 내용입니다.</mark> <mark>둘 다 지능으로 사람을 판단해서 문제라고 생각합니다.</mark> [라] 실험은 직업으로 지능을 평가한 실험인데, <mark>편견이 있다는 것 같습니다.</mark> 이상입니다.'
DIAG = [
    ('질문 미응답', '제시문 [나]는 IQ 테스트 이야기이고, [다]는 똑똑함에 대한 내용입니다.',
     '문항은 [나]와 [다]를 비교하라고 요구했는데 소재만 나열하고 차이점 비교를 전혀 수행하지 않았습니다.',
     '차별의 방식(제도적 법적 대 사회문화적 편견), 대상(인종 민족 집단 대 개인의 학력 직업), 정당화 논리(과학적 객관성 대 능력주의)처럼 최소 두 축을 세워 대응시켜 말해야 합니다.'),
    ('근거 부족', '둘 다 지능으로 사람을 판단해서 문제라고 생각합니다.',
     '공통점 주장에 제시문 근거가 하나도 붙지 않은 단정입니다. 생물학적 결정론이나 사회 위계 정당화 같은 층위도 빠졌습니다.',
     '[나]의 우생학과 1924년 이민법, [다]의 학력 기반 가치 판단을 근거로 들어 두 사례 모두 단일 지표로 사람의 전체 가치를 재고 위계를 정당화한다고 말해야 합니다.'),
    ('표현', '편견이 있다는 것 같습니다',
     '추측형 어미로 끝나 판단이 흐려지고 답변 전체가 두세 문장으로 끝나 분량이 절대적으로 부족합니다.',
     '단정형으로 마무리하고, 관점 정리, 공통점, 차이점, 비판의 네 단락 구조로 늘려 말하십시오.'),
]
RECON = '문제 1번 답변하겠습니다. 먼저 제시문 [가]의 두 관점을 정리하겠습니다. 가드너는 지능이 복합적이고 다차원적이라고 보고, 언어, 논리수학, 공간, 음악, 신체운동, 대인관계, 개인이해, 자연탐구 등 최소 여덟 가지 독립된 지능이 있으며 한 영역의 능력이 다른 영역의 능력을 예측하지 못한다고 주장합니다.'
WHY = [
    ('01', '고사장이 앱 안에', '실제 규격의 준비 시간과 답변 시간. 준비 시간이 끝나면 답변 단계로 자동 전환', 'std_prep_y.jpg', (900, 20, 1380, 330), '제시문 준비 화면의 타이머'),
    ('02', '촬영도 그 자리에서', '답변 화면에서 말하면 그 자리에서 녹음과 녹화. 따로 찍어 올리는 절차 없음', 'std_answer.jpg', (105, 12, 880, 430), '답변 촬영 화면'),
    ('03', '채점 뒤 리포트가 온다', '전사, 진단, 재구성 세 단과 말속도, 필러 표현, 침묵 비율, 답변 시간 사용 수치', 'std_delivery.jpg', (0, 62, 700, 262), '전달과 태도 화면'),
    ('04', '막힌 자리만 다시', '연습형 재응시로 막힌 자리만 끊어 다시 응시. 해설 강의는 마이페이지 내 강의에서', 'std_brief.jpg', (320, 372, 1080, 716), '실전형과 연습형 선택 화면'),
]


def brochure_G4():
    W = 170.0
    o = ['<section class="page front"><div class="field" style="left:0;top:0;width:216mm;height:92mm"></div><div class="wrap">']
    o.append('<p class="g-mast" style="left:0;top:0">제시문 면접 스튜디오<span class="dim">연세대, 고려대 대입 모의면접</span></p>')
    o.append('<h1 class="g-h1" style="left:0;top:10mm">연세대, 고려대 제시문 면접을<br>실전 규격으로 연습합니다</h1>')
    o.append('<p class="g-sub" style="left:0;top:37.5mm">실전 규격으로 촬영 응시하고 첨삭 세 단을 받습니다.</p>')
    o.append(inline_svg('logo_full.svg', 'position:absolute;right:0;top:0;height:30mm;width:29.68mm;color:var(--gold)', '현학적 연구소'))
    # hero = 채점 리포트 화면 (제목 띠 + 본문, 메타 줄 제외)
    hx, hy, hw = 0, 48, 100
    im, hh = report_split(hx, hy, hw, body_bottom=720); o.append(im)
    for n, (mx, my) in zip('123', [(1.6, 8.0), (39.6, 8.0), (87.0, 1.2)]):
        o.append(f'<span class="marker" style="left:{hx + mx:.1f}mm;top:{hy + my:.1f}mm">{n}</span>')
    sx = 107
    o.append(f'<div class="g-side-top" style="left:{sx}mm;top:{hy}mm;width:{W - sx}mm"><p class="k">03 첨삭 세 단</p><p class="t">채점 리포트 화면</p></div>')
    o.append(f'<ol class="g-legend" style="left:{sx}mm;top:73.5mm;width:{W - sx}mm">'
             '<li><span class="marker inline">1</span><span><b>여섯 축 평가</b><span class="d">이해력, 분석력, 논리성, 적용력, 전달력, 태도</span></span></li>'
             '<li><span class="marker inline">2</span><span><b>문항별 루브릭 채점</b><span class="d">항목마다 점수와 부족한 근거를 문장으로. 예: [가] 두 관점의 정확한 정리 4/15</span></span></li>'
             '<li><span class="marker inline">3</span><span><b>종합 점수와 밴드</b><span class="d">100점 만점. 고려대 3번 문항은 종합적 사고력도 채점</span></span></li></ol>')
    # 첨삭 세 단 실제 문장
    y = hy + hh + 7
    o.append(f'<h2 class="sec-h" style="left:0;top:{y:.1f}mm;width:{W}mm">실제 리포트에서 옮긴 첨삭 세 단<span class="sub">문제 1 답변 한 건. 진단 5건 중 2건</span></h2>')
    y += 10
    c1, c2, c3 = (0, 36), (40, 90), (134, 36)
    o.append(f'<div class="sp-col" style="left:{c1[0]}mm;top:{y:.1f}mm;width:{c1[1]}mm"><h4>1단 전사<i>내 답변을 글로 옮긴 정리본</i></h4><p class="sp-quote">{TRANSCRIPT}</p>'
             '<p class="cap" style="margin-top:1.6mm;white-space:normal">밑줄 = 진단이 붙은 문장</p></div>')
    dg = ''.join(f'<div class="dg"><span class="tag">{t}</span><span class="q">「{q}」</span><p class="d">{d}</p><p class="f"><b>고치기</b><span>{f}</span></p></div>' for t, q, d, f in DIAG[:2])
    o.append(f'<div class="sp-col" style="left:{c2[0]}mm;top:{y:.1f}mm;width:{c2[1]}mm"><h4>2단 오독과 비약 진단<i>문장마다 무엇이 빠졌고 어떻게 고치는지</i></h4>{dg}</div>')
    o.append(f'<div class="sp-col" style="left:{c3[0]}mm;top:{y:.1f}mm;width:{c3[1]}mm"><h4>3단 구술체 재구성<i>따라 말하는 모범</i></h4><p class="sp-quote">{RECON}</p>'
             '<p class="cap" style="margin-top:1.6mm;white-space:normal">이하 리포트에서 계속. 소리 내어 따라 말하는 용도</p></div>')
    # 혼자서도 되는 이유
    wy = 203.5
    o.append(f'<h2 class="sec-h" style="left:0;top:{wy:.1f}mm;width:{W}mm">혼자서도 되는 이유 네 가지<span class="sub">고사장, 촬영, 채점, 재응시가 모두 앱 화면 안에서</span></h2>')
    wy += 9
    colw, gut = 38.75, 5.0
    base = wy + 21 + 15.5
    for i, (n, t, d, src, crop, cap) in enumerate(WHY):
        x = i * (colw + gut)
        o.append(f'<div class="why" style="left:{x}mm;top:{wy:.1f}mm;width:{colw}mm"><span class="n">{n}</span> <span class="t">{t}</span><p class="d" style="margin-top:1.2mm">{d}</p></div>')
        ih = colw * (crop[3] - crop[1]) / (crop[2] - crop[0])
        ih = min(ih, 13.0)
        im, _ = shot(src, x, base - ih, colw, crop=crop, alt=cap, h=ih); o.append(im)
    o.append(f'<p class="g4-made" style="left:0;top:252.5mm">만든 사람. 한 사람이 제시문 390세트를 같은 기준으로 편집합니다. 13년차 입시 컨설턴트 운영</p>')
    o.append('<p class="g-url url" style="right:0;top:251.5mm">hyunhak.com</p>')
    o.append('</div></section>')
    # ---------- 뒷면 (흐름): 절차 4단 + 숫자 + 단위(규격 막대) + 이용권 + 문의
    b = ['<section class="page back"><div class="wrap flow" style="gap:2.6mm">']
    b.append('<h2 class="sec-h">스튜디오 응시 절차<span class="sub">지문 선택부터 재응시까지 네 단계를 앱 화면 안에서</span></h2>')
    colw, gut = 38.75, 5.0
    crops = {'std_home.jpg': (30, 120, 520, 420), 'std_prep_y.jpg': (900, 40, 1380, 337), 'std_report.jpg': (100, 300, 560, 585), 'std_brief.jpg': (320, 372, 800, 716)}
    cap_h = 24.0
    short = ['앱 안의 세트 카드에서 선택. 제시문과 문제는 준비 화면에', '실제 고사장 규격으로 응시. 답변은 그 화면에서 녹음과 녹화', '채점 뒤 리포트에 전사, 오독과 비약 진단, 구술체 재구성', '막힌 자리만 끊어 다시 응시. 해설 강의는 마이페이지에서']
    blk = [f'<div class="g-spine" style="left:0;top:1.1mm;width:{W}mm"></div>']
    for i, (n, t, _d, src, cap) in enumerate(STEPS):
        d = short[i]
        x = i * (colw + gut)
        blk.append(f'<span class="g-node" style="left:{x}mm;top:0"></span>')
        blk.append(f'<div class="g-step" style="left:{x}mm;top:4.2mm;width:{colw}mm"><span class="n">{n}</span> <span class="t">{t}</span></div>')
        blk.append(f'<p class="g-step" style="left:{x}mm;top:14mm;width:{colw}mm"><span class="d">{d}</span></p>')
        x0, y0, x1, y1 = crops[src]
        ih = min(colw * (y1 - y0) / (x1 - x0), cap_h)
        im, _ = shot(src, x, 25 + cap_h - ih, colw, crop=crops[src], alt=cap, h=ih); blk.append(im)
        blk.append(f'<p class="cap" style="left:{x}mm;top:{25 + cap_h + 1.6:.1f}mm">{cap}</p>')
    b.append(f'<div class="steps-blk" style="height:{25 + cap_h + 6:.1f}mm;margin-top:4.5mm">{"".join(blk)}</div>')
    b.append('<div class="g-facts" style="position:relative;padding:2.2mm 0 1.8mm">' + ''.join(f'<div class="f"><span class="l">{l}</span><span class="v">{v}<small>{u}</small></span></div>' for v, u, l in FACTS6) + '</div>')
    b.append(sec_units('delivery'))
    b.append(sec_pricing())
    b.append(sec_foot())
    b.append('</div></section>')
    return HEAD.format(t='제시문 면접 스튜디오 브로슈어') + '<body>' + ''.join(o) + ''.join(b) + '</body></html>'


DIRS = {'dirG': (CSS_G, brochure_G, story_G), 'dirH': (CSS_G + CSS_H, brochure_H, story_H), 'dirI': (CSS_G + CSS_I, brochure_I, story_I)}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    rnd = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--round=')), 'r3')
    if rnd == 'r4':
        DIRS['dirG'] = (CSS_G + CSS_G4, brochure_G4, story_G)
    only = args[0].split(',') if args else list(DIRS)
    for d in only:
        css, bro, sto = DIRS[d]
        out = os.path.join(HERE, rnd, d)
        os.makedirs(out, exist_ok=True)
        open(os.path.join(out, 'style.css'), 'w', encoding='utf-8').write(CSS_COMMON + css)
        open(os.path.join(out, 'brochure.html'), 'w', encoding='utf-8').write(bro())
        open(os.path.join(out, 'story.html'), 'w', encoding='utf-8').write(sto(False))
        open(os.path.join(out, 'story_promo.html'), 'w', encoding='utf-8').write(sto(True))
        print('built', d)


if __name__ == '__main__':
    main()
