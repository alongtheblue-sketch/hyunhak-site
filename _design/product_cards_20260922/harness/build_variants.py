# index.html 원본 + 안별 <style> 덧입혀 A/B/C(+cur) 페이지 생성. base href 로 사이트 자산을 로컬 서버(8090)에서 읽는다.
import pathlib
ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = pathlib.Path(__file__).resolve().parents[1]
src = (ROOT / 'index.html').read_text(encoding='utf-8')
assert '<head>' in src and '</head>' in src
DESK = '@media (min-width:56.25em){'
SUB = DESK + '''
:where(body.v2.r2-home) .r2-products{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:0;column-gap:var(--s4)}
:where(body.v2.r2-home) .r2-card{display:grid;grid-template-rows:subgrid;grid-row:span 5;row-gap:0;align-content:start}
:where(body.v2.r2-home) .r2-card h2{align-self:end}
:where(body.v2.r2-home) .r2-card-prices{align-self:start;margin-top:0}
:where(body.v2.r2-home) .r2-actions{align-self:end}
}'''
V = {
 # A: Subgrid 5행 동기화만 (대상/제목/본문/가격/CTA). 가격 시작선과 CTA 를 카드 간 일치.
 'A2': '',
 # B: A + 가격 블록을 mat 바탕 패널로 묶고 행 사이 헤어라인, 라벨 회색 소형, 금액 우측
 'B': '''
:where(body.v2) .r2-card-prices{background:var(--mat);border-radius:calc(var(--r-md) - var(--s2));padding:var(--s1) var(--s2)}
:where(body.v2) .r2-card-price{border-top:0;padding-block:var(--s2)}
:where(body.v2) .r2-card-price+.r2-card-price{border-top:var(--rule-ui)}
:where(body.v2) .r2-card-price>span{font-size:var(--t-xs);color:var(--gray)}
:where(body.v2.r2-home) .r2-actions{margin-top:var(--s3)}''',
 # C: A + 정가와 할인가 한 줄 (m52 "할인 3요소 한 줄"), 금액 h5, 정가 취소선 앞에 같은 줄
 'C': '''
:where(body.v2) .r2-card-price b{font-size:var(--t-h5);display:flex;justify-content:flex-end;align-items:baseline;gap:var(--s2);flex-wrap:wrap}
:where(body.v2) .r2-card-price b s.was{display:inline;margin:0}
:where(body.v2) .r2-card-price b .sale{display:inline}''',
}
# cur = 라이브 대조군은 2차 렌더(22:2x, 행사 반영, 래핑 마크업 + 구 flex 배치) shots/cur_*.png 를 보존한다. 라이브 fetch 는 워커 UA 분류로 403.
for k, css in V.items():
    html = src.replace('<head>', '<head><base href="http://localhost:8092/">', 1)
    html = html.replace('</head>', '<style id="variant">/* 안 ' + k + ' */' + css + '</style></head>', 1)
    (OUT / (k + '.html')).write_text(html, encoding='utf-8')
    print(k, len(html))
