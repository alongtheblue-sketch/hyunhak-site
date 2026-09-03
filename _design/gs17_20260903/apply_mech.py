#!/usr/bin/env python3
"""GS-17 기계 항목 멱등 적용기 (S2 S3 G2 G3 A2). 디자인 판단이 없는 마크업·CSS 변경만 다룬다.

    python3 apply_mech.py                          dry-run: 항목별 변경 예정 건수 + 자기검사 결과만 출력, 쓰지 않음
    python3 apply_mech.py --item S2,S3 --apply     지정 항목만 적용 (기본 = S2,S3,G2,G3,A2)
    python3 apply_mech.py --studio-build DIR --guidebook-build DIR    사본 검증용 경로 덮어쓰기
    python3 apply_mech.py --backup                 적용 전 .bak.<ts>_pre_gs17mech 사본 남김 (기본 off)

원천  스튜디오 B = <studio-build>/build_page.py (HTML 원문자열 템플릿) + C = <studio-build>/page.css
      가이드북 BP = <guidebook-build>/build_page.py (CSS 인라인 + 템플릿)
규약  행 번호가 아니라 셀렉터·마크업 패턴으로 찾는다 (다른 워크플로의 디자인 패치가 먼저 들어와도 동작).
      정규식의 줄 안 여백은 [ \\t] 로 못박고 \\s 로 개행을 삼키지 않는다.
      각 항목은 변환 뒤 계수 자기검사를 통과해야 하고, 한 항목이라도 FAIL 이면 아무 파일도 쓰지 않고 rc 1.
      두 번 돌려도 결과 동일(멱등): 이미 적용된 상태면 변경 0 건, 자기검사는 사후 상태로 다시 통과.
생성물 programs/studio.html, programs/guidebook.html 은 직접 만지지 않는다. 적용 뒤 각 build_page.py mode=site 재생성 → _tools/build_all.sh.
"""
import argparse, datetime, hashlib, pathlib, re, sys

SITE = pathlib.Path.home() / 'Workspace' / 'hyunhak-site'
STUDIO_BUILD = SITE / '_design' / 'studio_detail_20260903' / 'build'
GUIDE_BUILD = SITE / '_design' / 'guidebook_detail_20260903' / 'build'
ITEMS_ALL = ['S2', 'S3', 'G2', 'G3', 'A2']


class Fail(Exception):
    pass


def count(pat, text):
    return len(re.findall(pat, text))


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()[:12]


def element_span(text, start, tag):
    """text[start:] 가 <tag ...> 로 시작한다고 보고, 같은 태그의 중첩을 깊이로 세어 짝이 맞는 </tag> 끝 위치까지 (start, end)."""
    tok = re.compile(r'<(/?)' + tag + r'(?=[ \t>/\n])')
    depth = 0
    for m in tok.finditer(text, start):
        if m.group(1) == '':
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return start, text.find('>', m.end()) + 1
    raise Fail(f'<{tag}> 닫는 태그 없음 @ {start}')


def container_spans(text, tag, cls):
    """class 토큰 cls 를 가진 <tag> 요소 전부의 (start, end)."""
    spans = []
    for m in re.finditer(r'<' + tag + r'[ \t]+class="([^"]*)"[^>]*>', text):
        if cls in m.group(1).split():
            spans.append(element_span(text, m.start(), tag))
    return spans


def insert_after_line(text, anchor_re, new_lines, marker):
    """anchor_re 에 맞는 줄(정확히 1개) 바로 뒤에 new_lines 삽입. marker 가 이미 있으면 0."""
    if marker in text:
        return text, 0
    lines = text.split('\n')
    idx = [i for i, l in enumerate(lines) if re.match(anchor_re, l)]
    if len(idx) != 1:
        raise Fail(f'앵커 {anchor_re!r} 가 {len(idx)}건 (1건이어야 함)')
    lines[idx[0] + 1:idx[0] + 1] = new_lines
    return '\n'.join(lines), 1


def insert_before_line(text, anchor_re, new_lines, marker):
    if marker in text:
        return text, 0
    lines = text.split('\n')
    idx = [i for i, l in enumerate(lines) if re.match(anchor_re, l)]
    if len(idx) != 1:
        raise Fail(f'앵커 {anchor_re!r} 가 {len(idx)}건 (1건이어야 함)')
    lines[idx[0]:idx[0]] = new_lines
    return '\n'.join(lines), 1


# ----------------------------------------------------------------------------- S2 스튜디오 h4 → h3
S2_CONTAINERS = [('ul', 'forms'), ('ul', 'aud'), ('ul', 'pr'), ('ol', 'rail'), ('ol', 'flow'), ('ul', 'price'), ('li', 'unit')]
S2_CLASSES = [c for _, c in S2_CONTAINERS]
S2_SEL_HEAD = re.compile(r'[ \t]*\.(' + '|'.join(S2_CLASSES) + r')(?![\w-])')
S2_COMP = ('.forms h3,.aud h3,.pr h3,.rail h3,.flow h3,.price h3,.unit h3{font-weight:700;text-wrap:inherit}'
           '  /* GS-17 S2: h2 직후 h4 6곳을 h3 로 승격. h4 가 갖던 계산값(weight 700, text-wrap 은 body 상속) 그대로 두어 시각 불변 */')


def item_S2(F):
    B, C = F['B'], F['C']
    pre_h3 = count(r'<h3(?=[ \t>])', B)
    conv = 0
    for tag, cls in S2_CONTAINERS:
        spans = container_spans(B, tag, cls)
        if not spans:
            raise Fail(f'S2: 컨테이너 <{tag} class="{cls}"> 를 B 에서 못 찾음')
        for s, e in spans:                      # <h4 → <h3 는 길이가 같아 위치가 유지된다
            seg = B[s:e]
            conv += count(r'<h4(?=[ \t>])', seg)
            seg = re.sub(r'<h4(?=[ \t>])', '<h3', seg).replace('</h4>', '</h3>')
            B = B[:s] + seg + B[e:]
    for tag, cls in S2_CONTAINERS:
        for s, e in container_spans(B, tag, cls):
            n = count(r'<h4(?=[ \t>])', B[s:e])
            if n:
                raise Fail(f'S2 자기검사: {tag}.{cls} 안 <h4> 잔존 {n}')
    residual = count(r'<h4(?=[ \t>])', B)
    if residual:
        raise Fail(f'S2 자기검사: 컨테이너 밖 <h4> 잔존 {residual} (게이트 목표 = 도약 0 이라 페이지 전체 h4 0 이어야 함)')
    post_h3 = count(r'<h3(?=[ \t>])', B)
    if post_h3 != pre_h3 + conv:
        raise Fail(f'S2 자기검사: h3 수 불일치 전 {pre_h3} + 변환 {conv} ≠ 후 {post_h3}')

    lines = C.split('\n')
    csel = 0
    for i, line in enumerate(lines):
        if '{' not in line or 'h4' not in line:
            continue
        sel, rest = line.split('{', 1)
        if sel.lstrip().startswith('@'):
            continue
        parts = []
        for p in sel.split(','):
            if S2_SEL_HEAD.match(p) and re.search(r'\bh4\b', p):
                p = re.sub(r'\bh4\b', 'h3', p)
                csel += 1
            parts.append(p)
        lines[i] = ','.join(parts) + '{' + rest
    C = '\n'.join(lines)
    C, comp = insert_after_line(C, r'h4\{', [S2_COMP], 'GS-17 S2')
    for line in C.split('\n'):
        if '{' in line and not line.lstrip().startswith('@'):
            for p in line.split('{', 1)[0].split(','):
                if S2_SEL_HEAD.match(p) and re.search(r'\bh4\b', p):
                    raise Fail(f'S2 자기검사: C 셀렉터에 h4 잔존: {p.strip()}')
    if count(r'GS-17 S2', C) != 1:
        raise Fail('S2 자기검사: C 보정 규칙 마커 1건 아님')
    F['B'], F['C'] = B, C
    return {'B h4→h3': conv, 'C 셀렉터 h4→h3': csel, 'C 보정규칙': comp}, \
        {'B h4 잔존': residual, 'B h3 전/후': f'{pre_h3}/{post_h3}', 'C h4 셀렉터(컨테이너) 잔존': 0}


# ----------------------------------------------------------------------------- S3 스튜디오 표 caption + th scope
S3_CAPTION_CSS = ('table caption{caption-side:top;text-align:left;font-size:var(--t-cap);line-height:1.6;color:var(--gray);padding:0 0 6px}'
                  '  /* GS-17 S3: 표 5개 caption. 시각적으로 조용하게(12px 회색) */')
S3_TABLES = [
    # (이름, 찾기, caption, scope 규칙(th 순번, 행 순번, 속성문자열) → scope)
    ('setlist', ('class', 'setlist'), '단위별 첫 세 세트와 난이도',
     lambda i, r, a: 'row' if 'rowspan' in a else ('col' if r == 0 else 'row')),
    ('cols_yonsei', ('marker', r'<th[^>]*>연세대 활동우수형, 국제형</th>'), '연세대 제시문 면접 제원',
     lambda i, r, a: 'rowgroup' if i == 0 else 'row'),
    ('cols_korea', ('marker', r'<th[^>]*>고려대 계열적합전형</th>'), '고려대 제시문 면접 제원',
     lambda i, r, a: 'rowgroup' if i == 0 else 'row'),
    ('ladder', ('class', 'ladder'), '지문 1편 다섯 회 권장 순서', lambda i, r, a: 'row'),
    ('cmp', ('class', 'cmp'), '흔한 준비와 스튜디오 순서 비교', lambda i, r, a: 'col'),
]
TH_RE = re.compile(r'<th(?=[ \t>])([^>]*)>')


def table_span(text, how, key):
    if how == 'class':
        m = re.search(r'<table[ \t]+class="[^"]*\b' + key + r'\b[^"]*"[^>]*>', text)
        if not m:
            raise Fail(f'S3: <table class="{key}"> 없음')
        s = m.start()
    else:
        m = re.search(key, text)
        if not m:
            raise Fail(f'S3: 표 표지 {key!r} 없음')
        s = text.rfind('<table', 0, m.start())
        if s < 0:
            raise Fail(f'S3: 표지 {key!r} 앞에 <table 없음')
    e = text.find('</table>', s)
    if e < 0:
        raise Fail('S3: </table> 없음')
    return s, e + len('</table>')


def add_caption(seg, caption):
    if '<caption' in seg:
        return seg, 0
    m = re.match(r'<table[^>]*>', seg)
    nl = seg.find('\n', m.end())
    indent = re.match(r'[ \t]*', seg[nl + 1:]).group(0) if nl >= 0 else ''
    return seg[:m.end()] + '\n' + indent + f'<caption>{caption}</caption>' + seg[m.end():], 1


def set_scopes(seg, rule):
    out, pos, n, th_i = [], 0, 0, 0
    for m in TH_RE.finditer(seg):
        attrs = m.group(1)
        row_i = count(r'<tr(?=[ \t>])', seg[:m.start()]) - 1
        if not re.search(r'\bscope=', attrs):
            out.append(seg[pos:m.start()])
            out.append(f'<th{attrs} scope="{rule(th_i, row_i, attrs)}">')
            pos = m.end()
            n += 1
        th_i += 1
    out.append(seg[pos:])
    return ''.join(out), n


def item_S3(F):
    B, C = F['B'], F['C']
    caps = scopes = 0
    for name, (how, key), caption, rule in S3_TABLES:
        s, e = table_span(B, how, key)
        seg, c1 = add_caption(B[s:e], caption)
        seg, c2 = set_scopes(seg, rule)
        caps += c1
        scopes += c2
        B = B[:s] + seg + B[e:]
    # 단위명 rowspan th 는 파이썬 코드(f-string) 쪽에 있다
    old, new = '<th rowspan="3">', '<th rowspan="3" scope="row">'
    if old in B:
        scopes += B.count(old)
        B = B.replace(old, new)
    if new not in B:
        raise Fail('S3 자기검사: 단위명 <th rowspan="3" scope="row"> 가 B 에 없음')
    n_table, n_cap = count(r'<table(?=[ \t>])', B), count(r'<caption(?=[ \t>])', B)
    if n_table == 0 or n_table != n_cap:
        raise Fail(f'S3 자기검사: table {n_table} ≠ caption {n_cap}')
    for m in re.finditer(r'<table(?=[ \t>])', B):
        e = B.find('</table>', m.start())
        if count(r'<caption(?=[ \t>])', B[m.start():e]) != 1:
            raise Fail('S3 자기검사: caption 이 정확히 1개가 아닌 표 있음')
    no_scope = count(r'<th(?=[ \t>])(?![^>]*\bscope=)', B)
    if no_scope:
        raise Fail(f'S3 자기검사: scope 없는 <th> 잔존 {no_scope}')
    C, crule = insert_after_line(C, r'table\{border-collapse', [S3_CAPTION_CSS], 'GS-17 S3')
    if count(r'GS-17 S3', C) != 1:
        raise Fail('S3 자기검사: C caption 규칙 마커 1건 아님')
    F['B'], F['C'] = B, C
    return {'B caption 삽입': caps, 'B th scope 부여': scopes, 'C caption 규칙': crule}, \
        {'table/caption': f'{n_table}/{n_cap}', 'th 총/scope 없음': f'{count(r"<th(?=[ \t>])", B)}/{no_scope}'}


# ----------------------------------------------------------------------------- G2 가이드북 부채꼴 901~1100
G2_ANCHOR = r'\.fan\.f4\{transform:translateX\(-50%\) rotate\(14deg\) translateX\(100%\)\}$'
G2_BLOCK = [
    '/* GS-17 G2: 901~1100px 은 .fan 폭이 clamp 하한 136px 에 걸리고 stage 열이 좁아 f4 우측이 뷰포트를 넘는다(1024 에서 right 1037, 901 에서 +42.5).',
    '   바깥 두 장 ∓70%/±10deg, 안쪽 두 장 ∓35%/±5deg 로 펼침만 0.7 배(좌우 대칭 유지). 실측 901~1100 전 폭 f4.right ≤ W-7.8. ≤900 규칙과 1440 배치는 그대로 */',
    '@media (min-width:901px) and (max-width:1100px){',
    '  .fan.f0{transform:translateX(-50%) rotate(-10deg) translateX(-70%)}',
    '  .fan.f1{transform:translateX(-50%) rotate(-5deg) translateX(-35%)}',
    '  .fan.f3{transform:translateX(-50%) rotate(5deg) translateX(35%)}',
    '  .fan.f4{transform:translateX(-50%) rotate(10deg) translateX(70%)}',
    '}',
]


def item_G2(F):
    BP = F['BP']
    BP, ins = insert_after_line(BP, G2_ANCHOR, G2_BLOCK, 'GS-17 G2')
    if count(r'GS-17 G2', BP) != 1:
        raise Fail('G2 자기검사: 마커 1건 아님')
    blk = re.search(r'@media \(min-width:901px\) and \(max-width:1100px\)\{[^}]*\}[^}]*\}[^}]*\}[^}]*\}\n\}', BP)
    if not blk or count(r'\.fan\.f[0-4]\{', blk.group(0)) != 4:
        raise Fail('G2 자기검사: 901~1100 미디어 블록 안 .fan.fN 규칙 4건 아님')
    if count(G2_ANCHOR.replace('$', ''), BP) != 1:
        raise Fail('G2 자기검사: 기본 .fan.f4 규칙이 1건 아님(1440 배치 훼손)')
    F['BP'] = BP
    return {'BP 미디어 블록 삽입': ins}, {'미디어 블록': 1, '기본 .fan.f4': 1}


# ----------------------------------------------------------------------------- G3 가이드북 mono 숫자 쉼표
NUM = r'\d{1,3}(?:,\d{3})+'
CSPAN = '<span class="c">,</span>'
G3_CSS = ('.c,.facts b .c{display:inline-block;width:.34em;margin:0;font:inherit;color:inherit;text-align:center}'
          '  /* GS-17 G3: JetBrains Mono 쉼표는 숫자와 같은 0.6em 고정폭. 상자를 .34em(숫자폭의 0.57)으로 좁힌다. 숫자는 Mono 유지(건우 09-02). '
          '.facts span{display:block;font-size:13px} 이 span.c 를 잡아 줄을 끊으므로 .facts b .c 로 이겨 font/color/margin 을 부모값으로 되돌린다 */')


def wrap_text_tokens(seg):
    """태그를 뺀 텍스트 토큰에서만 NUM 의 쉼표를 감싼다. 속성값(alt 등)은 태그 토큰이라 건드리지 않는다."""
    parts = re.split(r'(<[^>]+>)', seg)
    n = 0
    for i, p in enumerate(parts):
        if p.startswith('<'):
            continue
        new = re.sub(NUM, lambda m: m.group(0).replace(',', CSPAN), p)
        n += new.count(CSPAN) - p.count(CSPAN)
        parts[i] = new
    return ''.join(parts), n


G3_TARGETS = (('section', 'facts', r'<b>.*?</b>'), ('ul', 'price', r'<div class="won[^"]*">.*?</div>'), ('section', 'close', r'<p class="won">.*?</p>'))


def g3_span(BP, tag, cls):
    """mono 숫자 컨테이너 1건의 (start, end). 길이가 바뀌는 치환 뒤에는 매번 다시 잰다(오프셋 낡음 방지)."""
    spans = container_spans(BP, tag, cls)
    if len(spans) != 1:
        raise Fail(f'G3: <{tag} class~="{cls}"> 가 {len(spans)}건')
    return spans[0]


def item_G3(F):
    BP = F['BP']
    wrapped = 0
    for tag, cls, inner in G3_TARGETS:
        s, e = g3_span(BP, tag, cls)
        seg = BP[s:e]
        def sub(m):
            nonlocal wrapped
            new, n = wrap_text_tokens(m.group(0))
            wrapped += n
            return new
        seg = re.sub(inner, sub, seg, flags=re.S)
        BP = BP[:s] + seg + BP[e:]
    for tag, cls, inner in G3_TARGETS:
        s, e = g3_span(BP, tag, cls)
        for m in re.finditer(inner, BP[s:e], flags=re.S):
            for p in re.split(r'(<[^>]+>)', m.group(0)):
                if not p.startswith('<') and re.search(NUM, p):
                    raise Fail(f'G3 자기검사: mono 대상 안 감싸지 않은 숫자 잔존: {p.strip()[:30]}')
    n_span, n_attr = BP.count(CSPAN), count(r'class="c"', BP)
    if n_span == 0 or n_span != n_attr:
        raise Fail(f'G3 자기검사: 쉼표 span {n_span} ≠ class="c" 출현 {n_attr} (속성값 안 삽입 의심)')
    head = BP[:BP.find('</head>')] if '</head>' in BP else ''
    if 'class="c"' in head:
        raise Fail('G3 자기검사: <head>(title/meta) 안에 span 삽입됨')
    for m in re.finditer(r'<(?:img|script)[^>]*>', BP):
        if 'class="c"' in m.group(0):
            raise Fail('G3 자기검사: img/script 태그 안에 span 삽입됨')
    BP, crule = insert_after_line(BP, r'\.mono\{', [G3_CSS], 'GS-17 G3')
    if count(r'(?m)^\.c,\.facts b \.c\{', BP) != 1:
        raise Fail('G3 자기검사: .c 규칙 1건 아님')
    F['BP'] = BP
    return {'BP 쉼표 span 감싸기': wrapped, 'BP .c 규칙': crule}, {'쉼표 span 총': n_span, 'head/img/script 오염': 0}


# ----------------------------------------------------------------------------- A2 푸터 사업자 블록 = index.html 승계
BIZ_RE = re.compile(r'<div class="biz">(?:(?!<div\b).)*?</div>', re.S)
OLD_BIZ_P = re.compile(r'^[ \t]*<p>상호 현학적 연구소 / 대표 현건우 / 사업자등록번호[^\n]*</p>[ \t]*$', re.M)
BIZ_FUNC = [
    '',
    "# GS-17 A2: 사업자 문단은 빌드 시 index.html 의 <div class=\"biz\"> 블록을 그대로 승계한다(세 면 drift 방지). 못 읽으면 빌드 중단(fail closed).",
    "BIZ_RE = re.compile(r'<div class=\"biz\">(?:(?!<div\\b).)*?</div>', re.S)",
    '',
    '',
    'def biz_block():',
    "    src = (SITE_ROOT / 'index.html').read_text(encoding='utf-8')",
    '    m = BIZ_RE.search(src)',
    "    if not m or '사업자등록번호' not in m.group(0) or '통신판매업' not in m.group(0):",
    "        raise SystemExit('GS-17 A2: index.html 에서 <div class=\"biz\"> 블록을 읽지 못함. 빌드 중단')",
    '    blk = m.group(0)',
    "    for p in ('terms.html', 'privacy.html'):",
    "        blk = blk.replace(f'href=\"{p}\"', f'href=\"../{p}\"' if MODE == 'site' else f'href=\"{SITE}/{p}\"')",
    '    return blk',
    '',
]
A2_CSS = [
    '/* GS-17 A2: index.html 푸터 사업자 블록(address.bizinfo + nav) 승계 */',
    '.ft .biz{margin-top:var(--s2)}',
    '.ft .bizinfo{font-style:normal;font-size:var(--t-cap);line-height:1.6;max-width:none;word-break:keep-all}',
    '.ft .biz nav{margin-top:0;font-size:var(--t-cap);display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2)}  /* GS-17 A2 회귀 수리: index.html(base.css:305) 과 같은 flex 행 */',
    '.ft .biz nav a{display:inline-flex;align-items:center;min-height:44px;min-width:44px;text-decoration:underline;text-underline-offset:3px}  /* 탭 표적 44px(faq A1 과 같은 기준). 종전 41x14, 81x14 */',
]


def a2_source(text, var, write_anchor):
    """build_page.py 한 본에 A2 적용. var = 템플릿 변수명('h' 또는 'html'), write_anchor = 치환 줄을 끼울 앞 줄의 정규식."""
    ch = {}
    text, ch['템플릿 {{BIZ}}'] = OLD_BIZ_P.subn('      {{BIZ}}', text)
    slots = count(r'(?m)^[ \t]*\{\{BIZ\}\}[ \t]*$', text)
    if slots != 1:
        raise Fail(f'A2 자기검사: 템플릿 {{{{BIZ}}}} 자리 {slots}건')
    lines = text.split('\n')
    imp = [i for i, l in enumerate(lines) if re.match(r'import [\w, ]*\bpathlib\b', l)]
    if len(imp) != 1:
        raise Fail('A2: import 줄(pathlib 포함) 1건 아님')
    ch['import re'] = 0
    if not re.search(r'\bre\b', lines[imp[0]]):
        lines[imp[0]] = lines[imp[0]].rstrip() + ', re'
        ch['import re'] = 1
    text = '\n'.join(lines)
    text, ch['biz_block 함수'] = insert_before_line(text, r'CSS = ', BIZ_FUNC, 'def biz_block(')
    text, ch['main 치환'] = insert_before_line(text, write_anchor, [f"    {var} = {var}.replace('{{{{BIZ}}}}', biz_block())", f"    assert '{{{{BIZ}}}}' not in {var}"], f"{var}.replace('{{{{BIZ}}}}'")
    for pat, want in ((r'def biz_block\(\):', 1), (r"\.replace\('\{\{BIZ\}\}', biz_block\(\)\)", 1), (r'\{\{BIZ\}\}', 3), (r'^import .*\bre\b', 1)):
        n = count('(?m)' + pat, text)
        if n != want:
            raise Fail(f'A2 자기검사: {pat!r} {n}건 (기대 {want})')
    if OLD_BIZ_P.search(text):
        raise Fail('A2 자기검사: 구 사업자 <p> 잔존')
    return text, ch


def item_A2(F):
    # 적용 시점에도 index.html 블록을 같은 정규식으로 읽어 본다(빌드가 fail closed 로 죽지 않을지 선확인)
    idx = (F['SITE'] / 'index.html').read_text(encoding='utf-8')
    m = BIZ_RE.search(idx)
    if not m or '사업자등록번호' not in m.group(0) or '통신판매업' not in m.group(0):
        raise Fail('A2: index.html 에서 <div class="biz"> 블록을 읽지 못함')
    blk = m.group(0)
    B, chB = a2_source(F['B'], 'h', r"[ \t]+assert '\{\{' not in h")
    BP, chBP = a2_source(F['BP'], 'html', r"[ \t]+out\.write_text\(html, encoding='utf-8'\)")
    C, cC = insert_after_line(F['C'], r'\.ft p\{', A2_CSS, '.ft .bizinfo{')
    BP, cBP = insert_after_line(BP, r'\.ft p\{', A2_CSS, '.ft .bizinfo{')
    for name, t in (('C', C), ('BP', BP)):
        if count(r'(?m)^\.ft \.bizinfo\{', t) != 1:
            raise Fail(f'A2 자기검사: {name} .ft .bizinfo 규칙 1건 아님')
    F['B'], F['C'], F['BP'] = B, C, BP
    return {'B': chB, 'BP': chBP, 'C 규칙': cC, 'BP CSS 규칙': cBP}, \
        {'index 블록 길이': len(blk), 'index 블록 사업자등록번호/통신판매업': True, 'index href': re.findall(r'href="([^"]+)"', blk)}


ITEM_FN = {'S2': item_S2, 'S3': item_S3, 'G2': item_G2, 'G3': item_G3, 'A2': item_A2}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--item', default=','.join(ITEMS_ALL))
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--backup', action='store_true')
    ap.add_argument('--studio-build', default=str(STUDIO_BUILD))
    ap.add_argument('--guidebook-build', default=str(GUIDE_BUILD))
    ap.add_argument('--site', default=str(SITE), help='index.html 이 있는 사이트 루트(A2 선확인용)')
    a = ap.parse_args()
    items = [x.strip().upper() for x in a.item.split(',') if x.strip()]
    bad = [x for x in items if x not in ITEM_FN]
    if bad:
        print('알 수 없는 항목', bad, '가능:', ITEMS_ALL)
        return 2
    paths = {'B': pathlib.Path(a.studio_build) / 'build_page.py', 'C': pathlib.Path(a.studio_build) / 'page.css',
             'BP': pathlib.Path(a.guidebook_build) / 'build_page.py'}
    F = {k: p.read_text(encoding='utf-8') for k, p in paths.items()}
    F['SITE'] = pathlib.Path(a.site)
    before = {k: sha(F[k]) for k in paths}
    ok = True
    for it in items:
        try:
            changes, checks = ITEM_FN[it](F)
            total = sum(v if isinstance(v, int) else sum(v.values()) for v in changes.values())
            print(f'[{it}] 변경 {total} 건  {changes}  자기검사 PASS {checks}')
        except Fail as e:
            ok = False
            print(f'[{it}] FAIL {e}')
    after = {k: sha(F[k]) for k in paths}
    changed = [k for k in paths if before[k] != after[k]]
    mode = 'apply' if a.apply else 'dry-run'
    print(f'[{mode}] 파일 변경: {changed or "없음"}  sha 전→후 ' + ' '.join(f'{k}:{before[k]}→{after[k]}' for k in paths))
    if not ok:
        print('자기검사 FAIL 항목이 있어 아무것도 쓰지 않음 (rc 1)')
        return 1
    if a.apply and changed:
        ts = datetime.datetime.now().strftime('%Y%m%d_%H%M')
        for k in changed:
            if a.backup:
                bak = paths[k].with_name(paths[k].name + f'.bak.{ts}_pre_gs17mech')
                bak.write_text(paths[k].read_text(encoding='utf-8'), encoding='utf-8')
                print('  backup', bak)
            paths[k].write_text(F[k], encoding='utf-8')
            print('  wrote', paths[k])
    return 0


if __name__ == '__main__':
    sys.exit(main())
