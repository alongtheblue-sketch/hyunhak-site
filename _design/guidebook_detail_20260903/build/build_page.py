#!/usr/bin/env python3
"""면접 가이드북 공통 상세페이지 조립기 (v2 구조: SB7 순서, 절정 4부 50~65%).

입력  gen/<id>_aigen.png (힉스필드 gpt_image_2), covers/<대학명>.jpg (clean PDF 1면 렌더),
      pages/gachon_p*.jpg (부 들어가는 면 렌더), pages/sample_<본>_p*.jpg + build/sample_regions.json (표본 면, make_sample_page.py), build/books31.json
출력  out/면접가이드북_공통상세페이지_v1.html (독립 HTML, 이미지 전부 data URI)
규범  hyunhak-site/assets/base.css v3 토큰. 표제 Pretendard 800, 본문 16px, 계기값 JetBrains Mono, 세리프는 인용만.
      朱印은 가격과 표식 점에만. 1차 CTA 한 종류(지원 대학 가이드북 고르기).
"""
import base64, io, json, pathlib, sys, datetime
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
GEN, COV, PG, OUT = ROOT / 'gen', ROOT / 'covers', ROOT / 'pages', ROOT / 'out'
OUT.mkdir(exist_ok=True)
SITE = 'https://www.hyunhak.com'
MODE = 'data'                      # data = 독립 HTML(data URI) / site = hyunhak-site 자산 파일 + programs/guidebook.html
SITE_ROOT = pathlib.Path.home() / 'Workspace' / 'hyunhak-site'
ASSET_REL = '../assets/photo/gbd'  # programs/ 기준 상대 경로

IMG = {
    'hero': 'hero_c', 'problem': 'p1_forms', 'p1': 'hero_b', 'p2': 'p2_spec', 'p3': 'p3_archive',
    'p4': 'p4_rules', 'p5': 'p5_shelf', 'trust': 'p6_editor', 'format': 'p7_reader', 'close': 'hero_a',
}
OUTNAME = '면접가이드북_공통상세페이지_v1.html'
SAMPLE = 'A'                       # 4부 표본 면 본. A=4부 규칙 p18 / B=3부 기출 p14 / C=5부 전략 p31
for a in sys.argv[1:]:
    if a.startswith('out='):
        OUTNAME = a[4:]
    elif a.startswith('sample='):
        SAMPLE = a[7:]
    elif a == 'mode=site':
        MODE = 'site'
    elif '=' in a:
        k, v = a.split('=', 1)
        IMG[k] = v

HERO_COVERS = ['서울대학교', '이화여자대학교', '경희대학교', '부산대학교', '중앙대학교']
OPENERS = [('gachon_p2', '차례와 쓰는 법'), ('gachon_p3', '1부 들어가는 면'), ('gachon_p5', '2부 들어가는 면'),
           ('gachon_p11', '3부 들어가는 면'), ('gachon_p17', '4부 들어가는 면'), ('gachon_p29', '5부 들어가는 면')]


def data_uri(path, width, quality=78, name=None):
    """data 모드 = data URI. site 모드 = assets/photo/gbd/<name>.jpg 로 쓰고 상대 URL 반환."""
    im = Image.open(path).convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if MODE == 'site':
        name = name or pathlib.Path(path).stem
        dest = SITE_ROOT / 'assets' / 'photo' / 'gbd' / f'{name}.jpg'
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, 'JPEG', quality=quality, optimize=True, progressive=True)
        return f'{ASSET_REL}/{name}.jpg', im.size
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(), im.size


def gen_img(key, width, quality=78):
    p = GEN / f"{IMG[key]}_aigen.png"
    if not p.exists():
        return None, (16, 9)
    return data_uri(p, width, quality, name=f'gbd_{IMG[key]}')


def img_tag(key, width, alt, cls='', quality=78):
    uri, (w, h) = gen_img(key, width, quality)
    if uri is None:
        return f'<div class="ph {cls}" style="aspect-ratio:{w}/{h}"><span>이미지 준비 중</span></div>'
    return f'<img class="{cls}" src="{uri}" width="{w}" height="{h}" alt="{alt}" loading="lazy" decoding="async">'


books = json.loads((ROOT / 'build' / 'books31.json').read_text())
books.sort(key=lambda b: b['name'])
SLUG = {b['name']: b['slug'] for b in books}


def cover_uri(name, width, q=80):
    """site 모드 = assets/covers/<slug>.jpg 를 s17 clean 1면 렌더(700px)로 덮어쓰고 그 경로를 돌려준다."""
    if MODE == 'site':
        im = Image.open(COV / f"{name}.jpg").convert('RGB')
        if im.width > 700:
            im = im.resize((700, round(im.height * 700 / im.width)), Image.LANCZOS)
        dest = SITE_ROOT / 'assets' / 'covers' / f"{SLUG[name]}.jpg"
        im.save(dest, 'JPEG', quality=82, optimize=True, progressive=True)
        return f'../assets/covers/{SLUG[name]}.jpg'
    return data_uri(COV / f"{name}.jpg", width, q)[0]


def book_href(b):
    return f'../guidebook/{b["slug"]}.html' if MODE == 'site' else f'{SITE}{b["detail_url"]}'


def link(path):
    """사이트 내부 링크. data 모드 = 절대 URL, site 모드 = programs/ 기준 상대 경로."""
    if MODE == 'site':
        return {'/': '../index.html', '/guidebook/': '../guidebook/index.html'}[path]
    return SITE + path


GRID = '\n'.join(
    f'<a class="bk rv" href="{book_href(b)}"><img src="{cover_uri(b["name"], 280, 74)}" alt="{b["name"]} 2027 면접 가이드북 표지" width="280" height="396" loading="lazy" decoding="async"><span class="nm">{b["name"]}</span><span class="mt">{b["subtitle"].replace(", 보안 리더 열람", "")}</span></a>'
    for b in books)

CLOSE_COVERS = '<div class="closecovers" aria-hidden="true">' + ''.join(f'<img src="{cover_uri(n, 280, 74)}" alt="" width="280" height="396" loading="lazy" decoding="async">' for n in HERO_COVERS[:3]) + '</div>'

FAN = '\n'.join(
    f'<img class="fan f{i}" src="{cover_uri(n, 480, 82)}" alt="{n} 가이드북 표지" width="480" height="679" decoding="async">'
    for i, n in enumerate(HERO_COVERS))

OPEN = '\n'.join(
    f'<li class="rv"><img src="{data_uri(PG / (f + ".jpg"), 720, 80, name="gbd_" + f)[0]}" width="360" height="509" alt="{cap}" loading="lazy" decoding="async"><span>{cap}</span></li>'
    for f, cap in OPENERS)

PART_CROP = {'D': 0.47}   # 1부 p4 는 본문이 상단 45% 에서 끝나는 짧은 면. 아래 빈 여백을 잘라 상단만 싣는다(문구에 '상단' 병기)


def part_vis(key):
    """부 절 시각 = 판매본 실물 면 한 장(선명 칸 2~3, 나머지는 픽셀에 구운 블러) + 칸 배지 + 범례. AI 정물 대체(2026-09-03 건우 지시)."""
    reg = json.loads((ROOT / 'build' / 'sample_regions.json').read_text())[key]
    crop = PART_CROP.get(key, 1.0)
    src = ROOT / reg['file']
    if crop < 1:
        im = Image.open(src).convert('RGB')
        im = im.crop((0, 0, im.width, round(im.height * crop)))
        src = ROOT / 'pages' / f'{reg["file"].rsplit("/", 1)[-1].rsplit(".", 1)[0]}_top.jpg'
        im.save(src, 'JPEG', quality=90, optimize=True)
    uri, (w, h) = data_uri(src, 1000, 82, name=f'gbd_sample_{key}')
    regs = reg['regions']
    marks = ''.join(f'<span class="mk" style="left:{min(r["x"] + r["w"] + 2.2, 95):.2f}%;top:{(r["y"] + r["h"] / 2) / crop:.2f}%" aria-hidden="true">{i + 1}</span>'
                    for i, r in enumerate(regs))   # critic P2: 칸 왼쪽 가장자리에 두면 첫 글자를 덮는다 → 칸 오른쪽 바깥 흐림 구역
    legend = ''.join(f'<li><span class="n">{i + 1}</span><p>{r["label"]}</p></li>' for i, r in enumerate(regs))
    n = len(regs)
    where = f'가천대학교 판 {reg["page"]}면' + (' 상단' if crop < 1 else '')
    img = f'<img src="{uri}" width="{w}" height="{h}" alt="{where}, {reg["title"]}. 표시한 {n}칸만 선명하고 나머지는 흐림" loading="lazy" decoding="async">'
    if MODE == 'site':
        img = f'<a href="{uri}" target="_blank" rel="noopener" aria-label="표본 면 크게 보기">{img}</a>'
    return (f'<figure class="pgv"><div class="pg">{img}{marks}</div>'
            f'<figcaption><span class="cap">판매본 지면 그대로. {where}, {reg["title"]}. 번호 칸만 원문이고 나머지는 판매본 보호를 위해 흐림</span><ol class="lg">{legend}</ol></figcaption></figure>')


def sample_block(key):
    """4부 표본: 판매본 한 면을 그대로. 선명 칸은 make_sample_page.py 가 픽셀에 구운 것만 보인다."""
    reg = json.loads((ROOT / 'build' / 'sample_regions.json').read_text())[key]
    uri, (w, h) = data_uri(ROOT / reg['file'], 1241, 84, name=f'gbd_sample_{key}')
    zuri, (zw, zh) = data_uri(ROOT / reg['zoom']['file'], 1000, 86, name=f'gbd_sample_{key}_zoom')
    regs = reg['regions']
    zy = (reg['zoom']['rect_pt'][1] - 7) / 841.89 * 100
    zi = min(range(len(regs)), key=lambda i: abs(regs[i]['y'] - zy)) + 1
    marks = ''.join(f'<span class="mk" style="left:{min(r["x"] + r["w"] + 2.2, 95):.2f}%;top:{r["y"] + r["h"] / 2:.2f}%" aria-hidden="true">{i + 1}</span>'
                    for i, r in enumerate(regs))
    legend = ''.join(f'<li><span class="n">{i + 1}</span><p>{r["label"]}</p></li>' for i, r in enumerate(regs))
    n = len(regs)
    img = f'<img src="{uri}" width="{w}" height="{h}" alt="가천대학교 판 {reg["page"]}면, {reg["title"]}. 표시한 {n}칸만 선명하고 나머지는 흐림" loading="lazy" decoding="async">'
    if MODE == 'site':
        img = f'<a href="{uri}" target="_blank" rel="noopener" aria-label="표본 면 크게 보기">{img}</a>'
    return f'''<div class="sample pgs rv">
          <div class="cap"><span>판매본 지면 한 면 그대로, {reg["title"]}</span><span>가천대학교 판 {reg["page"]}면</span></div>
          <div class="pgcols">
            <figure class="pg">{img}{marks}</figure>
            <div class="lg">
              <ol>{legend}</ol>
              <figure class="zoom"><img src="{zuri}" width="{zw}" height="{zh}" alt="표본 면 {zi}번 칸 확대" loading="lazy" decoding="async"><figcaption>{zi}번 칸 확대</figcaption></figure>
              <p class="note">선명한 {n}칸만 판매본 그대로. 흐린 부분은 구매 뒤 보안 리더에서 전부 열립니다.</p>
            </div>
          </div>
    </div>'''


CSS = r"""
:root{
  --ink:#312E2E;--paper:#F4EFE3;--paper-2:#EDE7D8;--mat:#EBE4D4;--card:#FBF7EE;--gray:#696561;--body:#4A4644;
  --seal:#BC3529;--brown:#3B2C20;--gold:#D0AC6E;--hair:rgba(49,46,46,.40);--hairs:rgba(49,46,46,.24);
  --serif:'Noto Serif KR','Noto Serif CJK KR','Source Han Serif K',serif;
  --sans:'Pretendard Variable','Pretendard',-apple-system,'Apple SD Gothic Neo',sans-serif;
  --mono:'JetBrains Mono','Pretendard Variable','Pretendard','SFMono-Regular',ui-monospace,'Apple SD Gothic Neo',monospace;
  --s1:4px;--s2:8px;--s3:16px;--s4:24px;--s5:40px;--s6:56px;--s7:72px;--s8:96px;--s9:128px;--s10:160px;
  --gut:clamp(20px,4vw,56px);--container:1120px;
  --t-xs:11px;--t-cap:12px;--t-sm:13px;--t-md:14px;--t-base:16px;
  --t-h4:clamp(19px,1.5vw,23px);--t-h3:clamp(22px,2.0vw,28px);--t-h2:clamp(26px,2.7vw,34px);
  --t-h1:clamp(31px,4.0vw,44px);--t-display:clamp(38px,5.6vw,62px);--t-mono:13px;
  --w-head:800;--measure:36em;--tap:48px;--r-md:4px;--r-lg:8px;
  --rule:1px solid var(--hairs);--rule-strong:1px solid var(--hair);
  --lh-body:1.75;--lh-tight:1.32;--tr-body:-0.012em;--tr-head:-0.032em;--tr-label:.10em;
  --ease:cubic-bezier(.22,.68,0,1);
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:var(--t-base);line-height:var(--lh-body);
  letter-spacing:var(--tr-body);word-break:keep-all;overflow-wrap:break-word;text-wrap:pretty;
  font-feature-settings:"palt" 1,"kern" 1;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%;height:auto}
ul,ol{list-style:none}
table{border-collapse:collapse;width:100%}
:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
.ink :focus-visible{outline-color:var(--paper)}
.wrap{max-width:var(--container);margin:0 auto;padding-inline:var(--gut)}
h1,h2,h3{font-weight:var(--w-head);line-height:var(--lh-tight);letter-spacing:var(--tr-head);text-wrap:balance}
h4{font-weight:700;line-height:var(--lh-tight);letter-spacing:var(--tr-head)}
p{max-width:var(--measure);color:var(--body)}
.ink p{color:var(--paper-2)}
.mono{font-family:var(--mono);font-size:var(--t-mono);letter-spacing:0}
.kicker{font-family:var(--mono);font-size:var(--t-xs);letter-spacing:var(--tr-label);color:var(--gray);display:flex;align-items:center;gap:var(--s2);margin-bottom:var(--s3)}
.kicker::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--seal);flex:none}
.ink .kicker{color:var(--paper-2);opacity:.8}
.h2{font-size:var(--t-h1);max-width:22em}
.lede{font-size:var(--t-h4);line-height:1.6;max-width:30em}
.sec{padding-block:var(--s9)}
.ink{background:var(--ink);color:var(--paper)}
.mat{background:var(--mat)}
.btn{display:inline-flex;align-items:center;gap:var(--s3);min-height:var(--tap);padding:0 var(--s4);background:var(--ink);color:var(--paper);
  font-weight:700;border-radius:var(--r-md);transition:transform .24s var(--ease),background .24s}
.btn:hover{background:var(--brown);transform:translateY(-1px)}
.btn .arr{font-family:var(--mono);font-weight:400}
.ink .btn{background:var(--paper);color:var(--ink)}
.ink .btn:hover{background:var(--card)}
.tl{display:inline-flex;align-items:center;min-height:var(--tap);gap:var(--s2);border-bottom:1px solid var(--hair);color:var(--ink);font-weight:500}
.ph{background:linear-gradient(135deg,var(--paper-2),var(--mat));display:grid;place-items:center;color:var(--gray);font-family:var(--mono);font-size:var(--t-sm);border:var(--rule)}
.blk h3,.two h3{font-size:var(--t-sm);font-family:var(--mono);font-weight:500;letter-spacing:var(--tr-label);color:var(--gray);margin-bottom:var(--s3);padding-bottom:var(--s2);border-bottom:var(--rule)}
.blk ul li{position:relative;padding-left:var(--s3);margin-bottom:var(--s2);line-height:1.6;color:var(--body)}
.blk ul li::before{content:"";position:absolute;left:0;top:.75em;width:6px;height:1px;background:var(--ink)}
.why{background:var(--card);border:var(--rule);border-radius:var(--r-md);padding:var(--s4)}
.why p+p{margin-top:var(--s3)}

/* 상단 띠 */
.top{border-bottom:var(--rule);background:var(--paper)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;min-height:56px;gap:var(--s3)}
.brand{display:inline-flex;align-items:baseline;gap:var(--s2);font-weight:800;letter-spacing:var(--tr-head);min-height:var(--tap);padding-block:10px}
.brand .han{font-family:var(--serif);font-weight:500;font-size:var(--t-sm);color:var(--gray);letter-spacing:.08em}
.top .tag{font-family:var(--mono);font-size:var(--t-xs);color:var(--gray);letter-spacing:.06em}

/* 히어로 */
.hero{position:relative;overflow:hidden;border-bottom:var(--rule)}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,var(--paper) 0%,rgba(244,239,227,.97) 36%,rgba(244,239,227,.6) 56%,rgba(244,239,227,.06) 100%)}
.hero .wrap{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:var(--s6);align-items:center;min-height:min(80vh,800px);padding-block:var(--s8)}
.hero .say{position:relative;z-index:3;padding-right:var(--s4)}
.hero .aeo-answer{font-size:var(--t-sm);color:var(--gray);margin-top:var(--s4);max-width:34em}
.hero h1{font-size:var(--t-display);max-width:13em;margin:var(--s3) 0 var(--s4)}
.hero .cta{display:flex;flex-wrap:wrap;gap:var(--s4);align-items:center;margin-top:var(--s5)}
.stage{position:relative;height:clamp(280px,32vw,460px);align-self:start;margin-top:var(--s3)}
.fan{position:absolute;width:clamp(136px,12.5vw,186px);height:auto;left:var(--fan-x,56%);bottom:0;transform-origin:50% 100%;box-shadow:0 18px 40px rgba(49,46,46,.28),0 2px 0 rgba(49,46,46,.1);border-radius:2px}
.fan.f0{transform:translateX(-50%) rotate(-14deg) translateX(-100%)}
.fan.f1{transform:translateX(-50%) rotate(-7deg) translateX(-50%)}
.fan.f2{transform:translateX(-50%)}
.fan.f3{transform:translateX(-50%) rotate(7deg) translateX(50%)}
.fan.f4{transform:translateX(-50%) rotate(14deg) translateX(100%)}

/* 계기 띠 */
.facts{border-bottom:var(--rule);background:var(--card)}
.facts ul{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:var(--s3);padding-block:var(--s5)}
.facts li{border-left:var(--rule-strong);padding-left:var(--s3)}
.facts b{display:block;font-family:var(--mono);font-weight:500;font-size:var(--t-h2);line-height:1.1;letter-spacing:-.02em;white-space:nowrap}
.facts b small{font-size:var(--t-sm);margin-left:2px;color:var(--gray)}
.facts span{display:block;font-size:var(--t-sm);color:var(--gray);margin-top:var(--s1)}

/* 문제 */
.split{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:var(--s7);align-items:start}
.split.rev{grid-template-columns:minmax(0,5fr) minmax(0,7fr)}
.split.rev .txt{order:2}
.forms{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3);margin-top:var(--s6)}
.forms li{border:1px solid rgba(244,239,227,.22);border-radius:var(--r-md);padding:var(--s4)}
.forms h4{font-size:var(--t-h4);margin-bottom:var(--s2)}
.forms p{font-size:var(--t-sm);line-height:1.65}
.forms .mono{display:block;margin-bottom:var(--s2);opacity:.7}
.after{margin-top:var(--s6);padding-top:var(--s4);border-top:1px solid rgba(244,239,227,.22);font-size:var(--t-h4);line-height:1.55;max-width:28em}

/* 맞는 사람 */
.aud{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3);margin-top:var(--s6)}
.aud li{border-top:2px solid var(--ink);padding-top:var(--s4)}
.aud .mono{display:block;color:var(--gray);margin-bottom:var(--s2)}
.aud h4{font-size:var(--t-h4);margin-bottom:var(--s2)}
.aud p{font-size:var(--t-md);line-height:1.7}

/* 만든 사람 */
.pr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s3);margin-top:var(--s6)}
.pr li{background:var(--card);border:var(--rule);border-radius:var(--r-md);padding:var(--s4)}
.pr h4{font-size:var(--t-h4);margin-bottom:var(--s2)}
.pr p{font-size:var(--t-md);line-height:1.7}
.pr .mono{display:block;color:var(--seal);margin-bottom:var(--s2)}

/* 다섯 부 */
.rail{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:var(--s3);margin-top:var(--s6)}
.rail li{position:relative;padding-top:var(--s4);border-top:2px solid var(--ink)}
.rail li.core{border-top-color:var(--seal);background:var(--card);border-left:var(--rule);border-right:var(--rule);border-bottom:var(--rule);padding:var(--s4);border-radius:0 0 var(--r-md) var(--r-md)}
.rail .n{font-family:var(--mono);font-size:var(--t-sm);color:var(--gray);display:block;margin-bottom:var(--s2)}
.rail li.core .n{color:var(--seal)}
.rail h4{font-size:var(--t-h4);margin-bottom:var(--s2)}
.rail p{font-size:var(--t-md);line-height:1.7}
.rail .pg{font-family:var(--mono);font-size:var(--t-xs);color:var(--gray);margin-top:var(--s2);display:block}
.openers{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:var(--s3);margin-top:var(--s8)}
.openers img{width:100%;border-radius:2px;box-shadow:0 1px 0 rgba(49,46,46,.08),0 10px 24px rgba(49,46,46,.14)}
.openers span{display:block;font-family:var(--mono);font-size:var(--t-xs);color:var(--gray);margin-top:var(--s2)}
.openers-cap{font-family:var(--mono);font-size:var(--t-cap);color:var(--gray);letter-spacing:.06em;margin-top:var(--s4)}

/* 부 섹션 */
.part{padding-block:var(--s8);border-top:var(--rule)}
.part .head{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:var(--s6);align-items:end;margin-bottom:var(--s6)}
.part .num{font-family:var(--mono);font-weight:500;font-size:clamp(64px,9vw,120px);line-height:.9;letter-spacing:-.04em;color:var(--ink);opacity:.55}  /* 대비 3.2:1, 종전 .14 = 1.29:1 (critic P2 접근성, 스튜디오 동일) */
.part.core .num{color:var(--seal);opacity:.85}
.part h2{font-size:var(--t-h1)}
.part .sub{font-family:var(--mono);font-size:var(--t-sm);color:var(--gray);margin-top:var(--s2)}
.part .body{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:var(--s6);align-items:start}
.part.rev .body .vis{order:2}
.part .vis img,.part .vis .ph{width:100%;border-radius:var(--r-md)}
.part .txt .blk+.blk{margin-top:var(--s5)}
.sample{margin-top:var(--s6);border:var(--rule-strong);border-radius:var(--r-md);background:var(--card);padding:var(--s5)}
.sample .cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s3) var(--s6);align-items:start}
.sample table{max-width:46em}
.sample .cols table{max-width:none}
.sample .cap{font-family:var(--mono);font-size:var(--t-xs);letter-spacing:.06em;color:var(--gray);display:flex;justify-content:space-between;gap:var(--s3);margin-bottom:var(--s3);padding-bottom:var(--s2);border-bottom:var(--rule)}
.sample table td,.sample table th{padding:var(--s2) 0;border-bottom:var(--rule);vertical-align:top;text-align:left;font-size:var(--t-sm);line-height:1.55}
.sample table th{font-family:var(--mono);font-weight:500;color:var(--gray);width:36%;padding-right:var(--s3);letter-spacing:0}
.sample table tr:last-child td,.sample table tr:last-child th{border-bottom:0}
.q{font-family:var(--serif);font-weight:500;font-size:var(--t-h4);line-height:1.6;color:var(--ink)}
.qs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s4)}
.qs li{padding:var(--s3) 0 0;border-top:var(--rule)}
.qs .q{font-size:var(--t-base)}
.qs .src{font-family:var(--mono);font-size:var(--t-cap);color:var(--gray);display:block;margin-top:var(--s1)}
.rule{display:grid;grid-template-columns:auto 1fr;gap:var(--s2) var(--s4);max-width:56em}
.rule dt{font-family:var(--mono);font-size:var(--t-xs);letter-spacing:.06em;color:var(--gray);padding-top:.35em;white-space:nowrap}
.rule dd{font-size:var(--t-base);line-height:1.6;color:var(--ink)}
.rule dd.q{font-family:var(--serif);font-size:var(--t-h4)}
.pgcols{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:var(--s6);align-items:start;margin-top:var(--s2)}
.pg{position:relative;margin:0}
.pg img{width:100%;display:block;border:var(--rule);border-radius:2px;background:#fff;box-shadow:0 1px 0 rgba(49,46,46,.08),0 12px 28px rgba(49,46,46,.14)}
.pg .mk{position:absolute;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;background:var(--seal);color:var(--paper);font-family:var(--mono);font-size:var(--t-sm);font-weight:500;display:grid;place-items:center;box-shadow:0 0 0 3px var(--card)}
.lg ol{list-style:none;display:grid;gap:var(--s3)}
.lg li{display:grid;grid-template-columns:26px 1fr;gap:var(--s3);align-items:start}
.lg li .n{width:26px;height:26px;border-radius:50%;background:var(--seal);color:var(--paper);font-family:var(--mono);font-size:var(--t-sm);font-weight:500;display:grid;place-items:center}
.lg li p{font-size:var(--t-sm);line-height:1.6;color:var(--body);padding-top:3px}
.zoom{margin:var(--s5) 0 0}
.zoom img{width:100%;display:block;border:var(--rule);border-radius:2px;background:#fff}
.zoom figcaption{font-family:var(--mono);font-size:var(--t-xs);letter-spacing:.06em;color:var(--gray);margin-top:var(--s2)}
.lg .note{margin-top:var(--s4);font-size:var(--t-sm);color:var(--gray);line-height:1.6;border-top:var(--rule);padding-top:var(--s3)}
.rule dd .slot{background:var(--mat);border-radius:2px;padding:0 .25em;font-family:var(--mono);font-size:.82em;color:var(--brown)}
.core .why{border-color:var(--hair)}
.part.core{background:var(--card)}
.steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s3);margin-top:var(--s6)}
.steps li{border-top:var(--rule-strong);padding-top:var(--s3)}
.steps .n{font-family:var(--mono);font-size:var(--t-xs);color:var(--seal);display:block;margin-bottom:var(--s1)}
.steps p{font-size:var(--t-sm);line-height:1.6}
.diff{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3)}
.diff li{border-top:var(--rule-strong);padding-top:var(--s3)}
.diff .lab{font-size:var(--t-sm);color:var(--gray);display:block}
.diff b{font-family:var(--mono);font-weight:500;font-size:var(--t-h3);display:block;line-height:1.2;margin:var(--s1) 0}
.diff b em{font-style:normal;font-size:var(--t-sm);color:var(--gray);margin-left:var(--s1)}
.diff .d{font-family:var(--mono);font-size:var(--t-sm);color:var(--seal)}
.diff p{font-size:var(--t-sm);line-height:1.6;margin-top:var(--s2)}
.diff{gap:var(--s5)}

/* 준비 순서의 차이 */
.cmp{width:100%;margin-top:var(--s6)}
.cmp th,.cmp td{text-align:left;vertical-align:top;padding:var(--s3) var(--s3) var(--s3) 0;border-bottom:var(--rule);line-height:1.6}
.cmp th{font-family:var(--mono);font-weight:500;font-size:var(--t-xs);letter-spacing:.06em;color:var(--gray)}
.cmp td:first-child{font-family:var(--mono);font-size:var(--t-sm);color:var(--gray);width:16%}
.cmp td:nth-child(2){color:var(--gray);width:38%}
.cmp td:nth-child(3){color:var(--ink);font-weight:500}
.cmp td:nth-child(3)::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--seal);margin-right:var(--s2);vertical-align:.15em}

/* 형태와 가격 */
.price{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3);margin-top:var(--s6)}
.price>li{background:var(--card);border:var(--rule-strong);border-radius:var(--r-md);padding:var(--s4);display:flex;flex-direction:column;gap:var(--s2)}
.price h4{font-size:var(--t-h4)}
.price .won{font-family:var(--mono);font-weight:500;font-size:var(--t-h2);color:var(--seal);line-height:1.1;margin-top:var(--s2);white-space:nowrap}
.price .won small{font-size:var(--t-sm);color:var(--gray);margin-left:4px;font-family:var(--sans)}
.price .won.two{font-size:var(--t-h4);margin-top:var(--s1)}
.price ul{margin-top:var(--s2)}
.price .pricefoot{font-size:var(--t-cap);color:var(--gray);line-height:1.6;margin-top:var(--s2);padding-top:var(--s2);border-top:var(--rule)}
.price ul li{font-size:var(--t-md);color:var(--body);line-height:1.65;position:relative;padding-left:var(--s3)}
.price ul li::before{content:"";position:absolute;left:0;top:.8em;width:6px;height:1px;background:var(--ink)}
.flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3);margin-top:var(--s5)}
.flow li{border-top:var(--rule-strong);padding-top:var(--s3)}
.flow .n{font-family:var(--mono);font-size:var(--t-xs);color:var(--seal);display:block;margin-bottom:var(--s1)}
.flow h4{font-size:var(--t-base);margin-bottom:var(--s1)}
.flow p{font-size:var(--t-sm)}

/* 31권 */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:var(--s4) var(--s3);margin-top:var(--s6)}
.bk img{width:100%;border-radius:2px;box-shadow:0 1px 0 rgba(49,46,46,.08),0 10px 24px rgba(49,46,46,.14);transition:transform .3s var(--ease)}
.bk:hover img{transform:translateY(-4px)}
.bk .nm{display:block;font-size:var(--t-sm);font-weight:600;margin-top:var(--s2);line-height:1.4}
.bk .mt{display:block;font-family:var(--mono);font-size:var(--t-xs);color:var(--gray);margin-top:2px}

/* FAQ */
.faq{margin-top:var(--s5);border-top:var(--rule-strong)}
.faq details{border-bottom:var(--rule)}
.faq summary{cursor:pointer;list-style:none;min-height:var(--tap);display:flex;align-items:center;justify-content:space-between;gap:var(--s3);padding:var(--s3) 0;font-weight:600}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font-family:var(--mono);color:var(--gray);flex:none}
.faq details[open] summary::after{content:"\2013"}
.faq .a{padding:0 0 var(--s4);font-size:var(--t-base);color:var(--body);max-width:none}

/* 마무리 */
.close .wrap{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:var(--s7);align-items:center}
.close h2{font-size:var(--t-display);max-width:10em}
.close .won{font-family:var(--mono);font-size:var(--t-h4);margin-top:var(--s4);opacity:.85}
.close img,.close .ph{width:100%;border-radius:var(--r-md)}

/* 푸터 */
.ft{padding-block:var(--s6);border-top:var(--rule);font-size:var(--t-sm);color:var(--gray)}
.ft .wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s5)}
.ft b{color:var(--ink);font-weight:700;display:block;margin-bottom:var(--s2)}
.ft p{font-size:var(--t-sm);line-height:1.7;max-width:none}

@media (prefers-reduced-motion:no-preference){
  .rv{opacity:0;transform:translateY(14px);transition:opacity .7s var(--ease),transform .7s var(--ease)}
  .rv.in{opacity:1;transform:none}
}
@media (max-width:1000px){
  .facts ul{grid-template-columns:repeat(3,minmax(0,1fr))}
  .rail{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rail li:last-child{grid-column:span 2}
  .openers{grid-template-columns:repeat(3,minmax(0,1fr))}
  .pr{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:900px){
  .sec{padding-block:var(--s8)}
  #who,#trust{padding-block:var(--s9)}
  .hero .wrap{grid-template-columns:1fr;gap:var(--s5);min-height:0;padding-block:var(--s6)}
  .hero::after{background:linear-gradient(180deg,var(--paper) 0%,rgba(244,239,227,.97) 42%,rgba(244,239,227,.55) 72%,rgba(244,239,227,.06) 100%)}
  .stage{height:clamp(230px,60vw,380px);margin-top:0;align-self:auto;--fan-x:50%}
  .fan{width:clamp(130px,30vw,200px)}
  .fan.f0,.fan.f4{display:none}
  .fan.f1{transform:translateX(-50%) rotate(-10deg) translateX(-56%)}
  .fan.f3{transform:translateX(-50%) rotate(10deg) translateX(56%)}
  .split,.split.rev{grid-template-columns:1fr}
  .split.rev .txt{order:0}
  .part .head,.part .body{grid-template-columns:1fr;gap:var(--s5)}
  .part.rev .body .vis{order:0}
  .sample .cols,.qs,.pgcols{grid-template-columns:1fr}
  .sample{padding:var(--s4)}
  .part .num{font-size:clamp(48px,10vw,72px)}
  .steps,.diff{grid-template-columns:repeat(2,minmax(0,1fr))}
  .price,.flow,.forms,.aud{grid-template-columns:1fr}
  .close .wrap{grid-template-columns:1fr}
  .ft .wrap{grid-template-columns:1fr}
}
@media (max-width:560px){
  .facts ul{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rail{grid-template-columns:1fr}
  .rail li:last-child{grid-column:auto}
  .openers{grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s2)}
  .steps,.diff,.pr{grid-template-columns:1fr}
  .diff{gap:var(--s4)}
  .sample{padding:var(--s3) var(--s3)}
  .rule{grid-template-columns:1fr;gap:var(--s1) 0}
  .rule dt{padding-top:var(--s2)}
  .rail li.core{padding:var(--s3)}
  .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3) var(--s2)}
  .cmp td:first-child{width:22%}
  .cmp td:nth-child(2){width:34%}
  .top .tag{display:none}
  .hero h1{font-size:clamp(30px,9vw,38px)}
}

/* 2026-09-03 건우 지시: AI 정물 0장. 부 절 = 실물 면 표본(pgv), 문제·형태 절 = 단일 열, 마무리 = 실물 표지 */
.split.one{grid-template-columns:1fr}
.pgv{margin:0}
.pgv .pg{position:relative;border:var(--rule);border-radius:var(--r-md);overflow:hidden;background:#fff;box-shadow:0 1px 0 rgba(49,46,46,.08),0 12px 28px rgba(49,46,46,.12)}
.pgv .pg img{display:block;width:100%;height:auto;border-radius:0}
.pgv figcaption{margin-top:var(--s3)}
.pgv .cap{display:block;font-family:var(--mono);font-size:var(--t-cap);letter-spacing:.06em;color:var(--gray);margin-bottom:var(--s2);line-height:1.6}
ol.lg{list-style:none;display:grid;gap:var(--s2);padding:0;margin:0}
.closecovers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3)}
.closecovers img{width:100%;height:auto;border-radius:2px;box-shadow:0 10px 24px rgba(49,46,46,.35)}
.close .vis{align-self:center}
/* critic P2(2026-09-03 v4): 비rev 부도 실물 면 열을 7fr 로(1·3·5부 397→555px). 마무리 표지는 잉크 바탕에서 보이게 */
@media (min-width:901px){.part:not(.rev) .body{grid-template-columns:minmax(0,7fr) minmax(0,5fr)}}
.closecovers{gap:var(--s2)}
.closecovers img{box-shadow:0 14px 32px rgba(0,0,0,.55);outline:1px solid rgba(239,233,220,.16)}
"""

HTML = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>생기부 면접 가이드북 2027, 현학적 연구소</title>
<meta name="description" content="대학별 생기부 면접 가이드북 2027 대비판. 31개 대학, 다섯 부 구성. 면접 형태 판정, 전형별 제원, 실제로 나온 질문, 내 생기부에서 질문 뽑는 규칙, 대학별 준비 전략.">
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></noscript>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap"></noscript>
<link rel="icon" href="{{FAVICON}}">
<style>{{CSS}}</style>
</head>
<body>

<header class="top">
  <div class="wrap">
    <a class="brand" href="{{HOME}}">현학적 연구소 <span class="han">玄學的 硏究所</span></a>
    <span class="tag">생기부 면접 가이드북 2027 대비판</span>
  </div>
</header>

<main id="main">
<!-- 도입 -->
<section class="hero" id="top">
  {{HERO_BG}}
  <div class="wrap">
    <div class="say">
    <div class="pagehead">
      <p class="kicker">대학별 생기부 면접 가이드북</p>
      <h1>면접관의 다음 질문,<br>이미 내 생기부 안에</h1>
      <p class="lede">31개 대학 31권. 선배 후기 2017년부터 2026년까지의 관측과 2027학년도 공식 요강을 한 사람이 같은 기준으로 다시 짠 편집본.</p>
    </div>
      <div class="cta">
        <a class="btn" href="{{GB}}">지원 대학 가이드북 고르기 <span class="arr">→</span></a>
        <a class="tl" href="#parts">다섯 부 구성 먼저 보기</a>
      </div>
    </div>
    <div class="stage" aria-label="가이드북 표지 다섯 권">
      {{FAN}}
    </div>
  </div>
</section>

<!-- 계기 -->
<section class="facts">
  <div class="wrap">
    <ul>
      <li><b>31<small>개 대학</small></b><span>2027 대비판 판매 중</span></li>
      <li><b>1,178<small>면</small></b><span>31권 본문 합계</span></li>
      <li><b>3,065<small>건</small></b><span>수록된 실제 질문</span></li>
      <li><b>5<small>부</small></b><span>읽는 순서 그대로 준비 순서</span></li>
      <li><b>2017<small>~26</small></b><span>선배 후기 관측 기간</span></li>
      <li><b>2027<small>요강</small></b><span>공식 모집요강 대조</span></li>
    </ul>
  </div>
</section>

<!-- 문제 -->
<section class="sec ink" id="problem">
  <div class="wrap">
    <div class="split one">
      <div class="txt rv">
        <p class="kicker">시작하기 전에</p>
        <h2 class="h2">같은 “면접”이라는 이름, 준비 방법이 다른 세 시험</h2>
        <p class="lede" style="margin-top:var(--s4)">대입 면접 자료 대부분이 면접을 한 덩어리로 다룹니다. 내 생활기록부가 문제지인 시험과 면접장에서 받은 글이 문제지인 시험은 준비할 것이 처음부터 다른데도 그렇습니다.</p>
        <ul class="forms">
          <li><span class="mono">형태 1</span><h4>서류기반</h4><p>내 생활기록부가 문제지. 면접관이 기재 내용을 읽고 그 자리에서 묻는 시험입니다. 이 책의 3부와 4부가 이 형태를 위한 것.</p></li>
          <li><span class="mono">형태 2</span><h4>제시문</h4><p>면접장에서 받은 글과 문제를 두고 묻는 시험. 생활기록부는 보지 않고, 논술에 가까워 준비 방법이 완전히 다릅니다.</p></li>
          <li><span class="mono">형태 3</span><h4>MMI</h4><p>여러 방을 차례로 돌며 방마다 다른 상황 과제에 답하는 형태. 의약학 계열에서 쓰며 생활기록부 면접과는 다른 시험.</p></li>
        </ul>
        <p class="after">지원 전형이 어느 형태인지 모른 채 시작한 준비는 방향부터 어긋납니다. 이 책의 첫 면이 형태 판정인 이유.</p>
      </div>
    </div>
  </div>
</section>

<!-- 맞는 사람 -->
<section class="sec" id="who">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">이 책이 맞는 사람</p>
      <h2 class="h2">서류기반 면접을 앞둔 학생, 그 순서를 잡아 주려는 사람</h2>
    </div>
    <ul class="aud">
      <li class="rv"><span class="mono">학생</span><h4>학생부종합전형 지원자</h4><p>면접이 서류기반인 전형에 지원하는 학생. 3부에서 막히는 유형을 찾고 4부 규칙으로 내 질문지를 만드는 사람.</p></li>
      <li class="rv"><span class="mono">학부모</span><h4>준비 순서를 잡아 주려는 학부모</h4><p>1부와 2부만 읽어도 자녀가 어느 시험을 준비하는지, 대학이 무엇을 본다고 밝혔는지가 잡힙니다.</p></li>
      <li class="rv"><span class="mono">학교, 학원</span><h4>여러 학생을 같은 기준으로 지도하는 곳</h4><p>31권이 같은 다섯 부 구조라 학생이 바뀌어도 지도 순서가 같습니다. 전권 열람과 좌석 단위는 문의 이메일로.</p></li>
    </ul>
  </div>
</section>

<!-- 안내자 -->
<section class="sec mat" id="trust">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">만든 사람과 기준</p>
      <h2 class="h2">한 사람, 같은 기준, 31권</h2>
      <p class="lede" style="margin-top:var(--s4)">13년차 입시 컨설턴트 한 사람이 31권 전권을 같은 기준으로 편집합니다. 고려대학교 영어교육과 졸업.</p>
    </div>
    <ul class="pr rv">
      <li><span class="mono">원칙 1</span><h4>지어낸 질문 없음</h4><p>모든 질문은 선배 후기에서 회수한 실제 질문. 질문 끝에 모집단위와 연도를 적습니다.</p></li>
      <li><span class="mono">원칙 2</span><h4>공식 요강 원문 대조</h4><p>2027학년도 모집요강과 대학 공식 진술을 원문으로 인용하고 근거를 표기.</p></li>
      <li><span class="mono">원칙 3</span><h4>규칙은 역추적</h4><p>실제로 나온 질문에서 기재와 질문의 관계를 되짚어 규칙으로 만듭니다. 추정 문항 0건.</p></li>
      <li><span class="mono">원칙 4</span><h4>판을 밝힘</h4><p>2027 대비판 VOL 표기. 권마다 면수와 질문 수를 공개.</p></li>
    </ul>
  </div>
</section>

<!-- 계획 -->
<section class="sec" id="parts">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">이 책이 하는 일</p>
      <h2 class="h2">다섯 부, 읽는 순서 그대로 준비 순서</h2>
      <p class="lede" style="margin-top:var(--s4)">표지의 차례가 곧 준비 순서입니다. 앞의 세 부는 4부를 내 것으로 만들기 위한 준비이고 4부가 본론, 5부는 대학별 차이의 반영. 31권 전권이 같은 다섯 부로 짜여 있습니다.</p>
    </div>
    <ol class="rail">
      <li class="rv"><span class="n">1부</span><h4>내 면접은 어느 형태인가</h4><p>지원 전형 확정. 1부 표에서 내 전형의 면접 형태 확인. 형태가 다르면 준비 방법이 다릅니다.</p><span class="pg">서류기반, 제시문, MMI 판정</span></li>
      <li class="rv"><span class="n">2부</span><h4>이 대학은 무엇을 묻는가</h4><p>내 전형의 제원과 이 대학이 찾는 학생 읽기. 내 전형 줄만 읽어도 충분한 표.</p><span class="pg">전형별 제원, 공식 인재상</span></li>
      <li class="rv"><span class="n">3부</span><h4>실제로 나온 질문</h4><p>기출을 유형별로 훑으며 막히는 질문에 표시. 처음부터 답을 쓰지 않는 것이 요령.</p><span class="pg">선배 후기에서 회수한 기출</span></li>
      <li class="rv core"><span class="n">4부, 본론</span><h4>내 생기부에서 질문 뽑기</h4><p>규칙으로 내 생기부에서 질문 뽑기. 여기가 이 책의 본론.</p><span class="pg">기재를 질문으로 바꾸는 규칙</span></li>
      <li class="rv"><span class="n">5부</span><h4>이 대학의 특징과 준비 전략</h4><p>이 대학만의 차이와 거기서 나온 준비 전략 읽기.</p><span class="pg">타 대학 대비 차이, 전략</span></li>
    </ol>
    <ul class="openers">
      {{OPEN}}
    </ul>
    <p class="openers-cap">판매본 지면 그대로. 가천대학교 판 차례와 각 부 들어가는 면. 본문 지면은 대학별 상세 면의 미리보기에.</p>
  </div>
</section>

<!-- 1부 -->
<section class="part" id="p1">
  <div class="wrap">
    <div class="head rv">
      <div class="num">01</div>
      <div><h2>내 면접은 어느 형태인가</h2><p class="sub">서류기반 | 제시문 | MMI, 전형별 형태 판정</p></div>
    </div>
    <div class="body">
      <div class="vis rv">{{IMG_P1}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 부에 들어 있는 것</h3>
          <ul>
            <li>세 형태의 정의. 서류기반, 제시문, MMI</li>
            <li>이 대학에 있는 형태와 없는 형태</li>
            <li>전형과 모집단위별 형태 판정표. 서류확인형, 혼합형, 제시문형, 인적성형</li>
            <li>면접이 있는 전형의 목록</li>
          </ul></div>
        <div class="blk"><h3>왜 첫 자리인가</h3>
          <div class="why"><p>형태가 다르면 준비 방법이 통째로 다릅니다. 판정을 먼저 끝내면 준비 자원이 한 형태에 모입니다.</p><p>표에서 내 전형 한 줄만 찾으면 되는 구조. 전형 이름이 같아도 모집단위에 따라 형태가 갈리는 대학이 있어서 모집단위까지 적었습니다.</p></div></div>
      </div>
    </div>
    <div class="sample rv">
          <div class="cap"><span>지면 표본, 1부 형태 판정표</span><span>서울대학교 판</span></div>
          <table>
            <tr><th>전형과 모집단위</th><td>면접 형태 판정</td></tr>
            <tr><th>수시 지역균형전형 (의과대학 제외)</th><td>서류확인형</td></tr>
            <tr><th>수시 일반전형, 사범대학 전 모집단위</th><td>혼합형 (제시문 + 교직적성, 인성)</td></tr>
            <tr><th>수시 지역균형전형, 의과대학</th><td>혼합형</td></tr>
          </table>
    </div>
  </div>
</section>

<!-- 2부 -->
<section class="part rev" id="p2">
  <div class="wrap">
    <div class="head rv">
      <div class="num">02</div>
      <div><h2>이 대학은 무엇을 묻는가</h2><p class="sub">전형별 제원 | 이 대학이 찾는 학생</p></div>
    </div>
    <div class="body">
      <div class="vis rv">{{IMG_P2}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 부에 들어 있는 것</h3>
          <ul>
            <li>전형별 공식 제원 9항목. 전형유형, 면접 실시, 반영비율, 면접시간, 면접형태, 대면여부, 블라인드, 제시문 유무, 확인된 건수</li>
            <li>대학 공식 인재상 원문</li>
            <li>면접 관점의 공식 진술 원문과 면접 문항 설계 원칙</li>
            <li>항목마다 공식 근거 표기</li>
          </ul></div>
        <div class="blk"><h3>왜 필요한가</h3>
          <div class="why"><p>대학이 스스로 밝힌 평가 기준이 답변의 방향입니다. 인터넷 후기의 단편 대신 요강과 공식 진술을 원문으로 읽는 자리.</p><p>학과별 사례의 질문은 그해 지원자의 생기부에서 나온 것이라 무엇을 묻는 방식인지만 보면 됩니다.</p></div></div>
      </div>
    </div>
    <div class="sample rv">
          <div class="cap"><span>지면 표본, 2부 면접 관점 공식 진술</span><span>가천대학교 판</span></div>
          <div class="cols"><p class="q">“화법의 유창함보다, 질문의 의도를 정확히 파악하여 그 핵심에 맞게 답변할 수 있는지를 중점적으로 봅니다.”</p>
          <table>
            <tr><th>반영비율</th><td>1단계 서류 100%(4배수), 2단계 1단계 50% + 면접 50%</td></tr>
            <tr><th>면접형태</th><td>지원자가 제출한 서류 기반 확인형</td></tr>
            <tr><th>제시문</th><td>사용하지 않음 (기록 기반)</td></tr>
          </table></div>
    </div>
  </div>
</section>

<!-- 3부 -->
<section class="part" id="p3">
  <div class="wrap">
    <div class="head rv">
      <div class="num">03</div>
      <div><h2>실제로 나온 질문</h2><p class="sub">선배 후기에서 회수한 기출, 유형별, 모집단위와 연도</p></div>
    </div>
    <div class="body">
      <div class="vis rv">{{IMG_P3}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 부에 들어 있는 것</h3>
          <ul>
            <li>선배들의 면접 후기에서 회수한 실제 질문. 지어낸 문장 없음</li>
            <li>유형별 분류. 지원동기와 대학이해, 진로, 탐구와 세특 심화, 전공지식 확인, 독서, 공동체와 인성, 자기이해와 성장, 학업과 교과, 상황과 가치판단, 시사, 자기소개, 마무리, 꼬리질문</li>
            <li>질문마다 그 질문이 나온 모집단위와 연도</li>
            <li>이 대학의 최다 유형 표시</li>
          </ul></div>
        <div class="blk"><h3>어떻게 쓰나</h3>
          <div class="why"><p>유형의 분포가 대학마다 다릅니다. 처음부터 답을 쓰지 않고 유형별로 훑으며 막히는 질문에 표시하는 것이 3부의 쓰임.</p><p>어느 유형에서 막히는지가 4부에서 뽑을 질문의 우선순위가 됩니다.</p></div></div>
      </div>
    </div>
    <div class="sample rv">
          <div class="cap"><span>지면 표본, 3부 공동체와 인성 유형</span><span>가천대학교 판</span></div>
          <ul class="qs">
            <li><span class="q">“2학년 때 반장을 했는데, 활동하면서 어려운 점은 없었나요?”</span><span class="src">간호학과, 2022년</span></li>
            <li><span class="q">“그런 배려가 우리 학과에 어떻게 영향을 줄 수 있을까요?”</span><span class="src">설비소방공학과, 2024년</span></li>
            <li><span class="q">“2학년 때 쓰러진 친구를 응급처치했다고 했는데, 어떻게 도왔나요?”</span><span class="src">반도체물리학과, 2025년</span></li>
          </ul>
    </div>
  </div>
</section>

<!-- 4부, 절정 -->
<section class="part core rev" id="p4">
  <div class="wrap">
    <div class="head rv">
      <div class="num">04</div>
      <div><p class="kicker">이 책의 본론</p><h2>내 생기부에서 질문 뽑기</h2><p class="sub">생기부 기재를 질문으로 바꾸는 규칙</p></div>
    </div>
    <div class="body">
      <div class="vis rv">{{IMG_P4}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 부에 들어 있는 것</h3>
          <ul>
            <li>생기부 영역별 전환 규칙. 교과 세특, 창체 자율, 동아리, 진로활동, 봉사, 행동특성 및 종합의견, 독서, 성적 추이, 출결, 전형 공통</li>
            <li>규칙마다 네 칸. 언제(어떤 기재가 있을 때), 질문 틀, 이어질 꼬리질문, 평가 축</li>
            <li>실제로 나온 질문에서 되짚어 만든 규칙. 대학마다 다름</li>
          </ul></div>
        <div class="blk"><h3>왜 본론인가</h3>
          <div class="why"><p>3부의 기출은 그해 지원자의 생기부에서 나온 질문입니다. 내 생기부에 같은 기재가 없으면 같은 질문은 나오지 않습니다.</p><p>4부의 규칙은 이 대학이 생활기록부의 어떤 기재를 보고 어떤 질문을 만들었는지를 실제 질문에서 되짚은 것. 내 생기부를 펴 놓고 해당되는 규칙마다 질문을 만들면 그 목록이 내 예상 질문지.</p></div></div>
      </div>
    </div>
    {{SAMPLE}}
    <ol class="steps rv">
      <li><span class="n">01</span><p>내 생활기록부를 펴 놓기.</p></li>
      <li><span class="n">02</span><p>영역별로 해당되는 규칙 찾기.</p></li>
      <li><span class="n">03</span><p>질문 틀의 빈 자리에 내 기재를 채워 질문 만들기.</p></li>
      <li><span class="n">04</span><p>꼬리질문까지 답 준비. 그 목록이 내 예상 질문지.</p></li>
    </ol>
  </div>
</section>

<!-- 5부 -->
<section class="part" id="p5">
  <div class="wrap">
    <div class="head rv">
      <div class="num">05</div>
      <div><h2>이 대학의 특징과 준비 전략</h2><p class="sub">타 대학 대비 차이 | 준비 전략</p></div>
    </div>
    <div class="body">
      <div class="vis rv">{{IMG_P5}}</div>
      <div class="txt rv">
        <div class="blk"><h3>이 부에 들어 있는 것</h3>
          <ul>
            <li>2027학년도 공식 대비 범위</li>
            <li>전체 대학 평균 대비 이 대학의 차이 6지표. 제시문 질문 비중, 전공지식 확인과 탐구 심화 합계, 꼬리질문 비율, 면접시간 분포, 지원동기 비중, 공동체 질문 비중 대 인성 배점</li>
            <li>압박도 등 후기 참고 지표, 후기 원문 인용</li>
            <li>차이에서 나온 준비 전략 목록</li>
          </ul></div>
        <div class="blk"><h3>왜 마지막인가</h3>
          <div class="why"><p>같은 서류기반이라도 강조점이 다릅니다. 숫자로 잰 차이가 준비 순서를 정합니다.</p><p>꼬리질문 비율이 전체 평균의 1.5배인 대학은 첫 답보다 두 번째 답이 승부처. 10분 면접이 표준인 대학은 답변 한 건을 40초 안팎으로 압축하는 연습이 먼저.</p></div></div>
      </div>
    </div>
    <div class="sample rv">
          <div class="cap"><span>지면 표본, 5부 전체 평균 대비 차이</span><span>가천대학교 판</span></div>
          <ul class="diff">
            <li><span class="lab">꼬리질문 비율</span><b>6.7%<em>전체 4.5%</em></b><span class="d">+2.2%p</span><p>전체 평균의 1.5배. 확인된 꼬리질문 15건 중 11건이 개념 심화형.</p></li>
            <li><span class="lab">면접시간 10분 계열</span><b>63.2%<em>전체 41.7%</em></b><span class="d">+21.5%p</span><p>10분이 사실상 표준. 답변 1건당 40초 안팎으로 압축.</p></li>
            <li><span class="lab">제시문 질문 비중</span><b>0.0%<em>전체 2.3%</em></b><span class="d">-2.3%p</span><p>제시문 확인이 단 1건도 없음. 전 전형이 순수 서류확인형.</p></li>
          </ul>
    </div>
  </div>
</section>

<!-- 하강, 순서의 차이 -->
<section class="sec mat" id="diff">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">준비 순서의 차이</p>
      <h2 class="h2">예상 질문 100개를 외우는 준비와 내 질문을 뽑는 준비</h2>
      <p class="lede" style="margin-top:var(--s4)">흔한 준비는 남의 기출에서 시작해 남의 답을 외웁니다. 이 책의 순서는 내 전형의 형태에서 시작해 내 생기부에서 끝납니다.</p>
    </div>
    <table class="cmp rv">
      <thead><tr><th>단계</th><th>흔한 준비</th><th>이 책의 순서</th></tr></thead>
      <tbody>
        <tr><td>시작</td><td>예상 질문 목록을 구해 암기</td><td>내 전형의 면접 형태 판정 (1부)</td></tr>
        <tr><td>기준</td><td>인터넷 후기의 단편</td><td>2027 공식 요강과 대학 공식 진술 원문 (2부)</td></tr>
        <tr><td>기출</td><td>출처 없는 질문 모음</td><td>모집단위와 연도가 붙은 실제 질문, 유형별 (3부)</td></tr>
        <tr><td>예상 질문</td><td>남의 답안 외우기</td><td>내 생기부에서 규칙으로 뽑은 질문과 꼬리질문 (4부)</td></tr>
        <tr><td>대학 차이</td><td>모든 대학에 같은 준비</td><td>6지표로 잰 차이에서 나온 전략 (5부)</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- 형태와 가격 -->
<section class="sec" id="format">
  <div class="wrap">
    <div class="split one">
      <div class="txt rv">
        <p class="kicker">받는 방법과 가격</p>
        <h2 class="h2">결제 후 마이페이지에서 바로 열람</h2>
        <p class="lede" style="margin-top:var(--s4)">브라우저 보안 리더로 열람. 워터마크는 열람 계정마다 다르게 찍히고 인쇄는 권당 3회. 열람을 시작하기 전에는 취소할 수 있습니다.</p>
        <ol class="flow">
          <li><span class="n">01</span><h4>지원 대학 고르기</h4><p>가나다 순 목록에서 한 권 또는 여러 권.</p></li>
          <li><span class="n">02</span><h4>결제</h4><p>부가세 포함 가격. 취소는 열람 시작 전까지.</p></li>
          <li><span class="n">03</span><h4>보안 리더 열람</h4><p>마이페이지에서 바로 열림. 기기 제한 없음.</p></li>
        </ol>
      </div>
    </div>
    <ul class="price rv">
      <li><h4>보안 리더 열람판</h4><div class="won">33,000<small>원, 권당</small></div>
        <ul><li>열람 기간 구매일부터 1개월</li><li>인쇄 권당 3회, 원본 파일 비제공</li><li>열람 시작 전 취소 가능</li></ul></li>
      <li><h4>PDF 소장판</h4><div class="won">110,000<small>원, 권당</small></div>
        <ul><li>워터마크 파일 발급, 구매 계정 각인</li><li>파일 내려받기와 열람</li></ul></li>
      <li><h4>31개 대학 전권</h4><div class="won two">511,500<small>원, 열람</small></div><div class="won two">1,705,000<small>원, PDF</small></div>
        <ul><li>권당 33,000원 × 31권 = 1,023,000원의 절반</li><li>PDF는 110,000원 × 31권 = 3,410,000원의 절반</li><li>여러 대학에 지원하는 학생, 학교와 학원 단위</li></ul><p class="pricefoot">합산 금액은 따로 파는 상품이 아닙니다.</p></li>
    </ul>
  </div>
</section>

<!-- 31권 -->
<section class="sec mat" id="books">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">현재 판매 목록, 가나다 순</p>
      <h2 class="h2">지원 대학부터 고르기</h2>
      <p class="lede" style="margin-top:var(--s4)">31개 대학 31권. 표지를 누르면 그 대학의 지면 미리보기와 형태 판정표가 있는 상세 면으로 갑니다.</p>
    </div>
    <div class="grid">
      {{GRID}}
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="sec" id="faq">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">자주 묻는 질문</p>
      <h2 class="h2">가이드북에 대해</h2>
    </div>
    <div class="faq rv">
      <details><summary>내 지원 대학이 목록에 없으면</summary><div class="a">현재 판매 목록은 31개 대학. 목록에 없는 대학은 문의 이메일로 알려 주시면 준비 상황을 답합니다.</div></details>
      <details><summary>제시문 면접이나 MMI 준비에도 쓸 수 있나</summary><div class="a">1부와 2부의 형태 판정과 제원은 모든 형태에 해당. 3부와 4부는 서류기반 면접을 위한 것이라, 제시문 면접은 별도 상품인 제시문 면접 스튜디오 쪽이 맞습니다.</div></details>
      <details><summary>질문은 어디서 가져왔나</summary><div class="a">대학이 공개한 자료와 개인적으로 수집한 역대 면접 후기에서 회수한 실제 질문만 수록. 추정으로 만든 문항은 없고 질문마다 모집단위와 연도를 적었습니다.</div></details>
      <details><summary>여러 권을 사면</summary><div class="a">권당 33,000원. 31개 대학 전권 열람은 511,500원으로, 33,000원 × 31권 = 1,023,000원의 절반입니다. PDF 소장판 전권 1,705,000원은 110,000원 × 31권 = 3,410,000원의 절반입니다. 1,023,000원과 3,410,000원은 합산 금액이며 따로 파는 상품이 아닙니다. 학교와 학원 단위 좌석은 문의 이메일로.</div></details>
      <details><summary>환불은</summary><div class="a">디지털 상품은 열람 시작 전까지 전액 취소 가능. 열람을 시작한 뒤에는 취소되지 않습니다.</div></details>
    </div>
  </div>
</section>

<!-- 결말 -->
<section class="sec ink close" id="close">
  <div class="wrap">
    <div class="rv">
      <p class="kicker">2027 대비판</p>
      <h2>면접에서 나올 질문, 오늘 내 생기부에서</h2>
      <p class="lede" style="margin-top:var(--s4)">지원 대학을 고르면 그 대학의 다섯 부가 열립니다. 형태 판정에서 시작해 내 예상 질문지로 끝나는 순서 그대로.</p>
      <div class="cta" style="margin-top:var(--s5)"><a class="btn" href="{{GB}}">지원 대학 가이드북 고르기 <span class="arr">→</span></a></div>
      <p class="won">권당 33,000원, 보안 리더 열람 1개월</p>
    </div>
    <div class="vis rv">{{IMG_CLOSE}}</div>
  </div>
</section>
</main>

<footer class="ft">
  <div class="wrap">
    <div><b>현학적 연구소 <span style="font-family:var(--serif);font-weight:500;color:var(--gray)">玄學的 硏究所</span></b>
      <p>대입 면접 전문. 서류기반면접 가이드북, 제시문 면접 스튜디오.<br>www.hyunhak.com &nbsp; admin@hyunhak.com</p></div>
    <div><b>사업자 정보</b>
      <p>상호 현학적 연구소 / 대표 현건우 / 사업자등록번호 293-38-01827 / 통신판매업 신고 면제대상<br>서울특별시 강남구 테헤란로 70길 12, 402-941A호(대치동, H 타워) / 전화 070-8098-0671</p>
      <p style="margin-top:var(--s3)">표지와 들어가는 면은 판매본 지면의 실제 렌더. 발행 {{DATE}}.</p></div>
  </div>
</footer>

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
    hero_bg = ''   # AI 정물 배경 제거(2026-09-03 건우 지시). 히어로는 실물 표지 다섯 권만
    html = (HTML.replace('{{CSS}}', CSS).replace('{{HERO_BG}}', hero_bg).replace('{{FAN}}', FAN)
            .replace('{{GRID}}', GRID).replace('{{OPEN}}', OPEN))
    # 부 절 시각 = 실물 면(1부 D p4, 2부 E p7, 3부 B p14, 4부 F p22 창체, 5부 C p31). 4부 본론 표본 블록(A p18)은 별도 유지. AI 정물 0장(2026-09-03)
    html = html.replace('{{IMG_PROBLEM}}', '')
    for key, var in (('p1', 'D'), ('p2', 'E'), ('p3', 'B'), ('p4', 'F'), ('p5', 'C')):
        html = html.replace('{{IMG_' + key.upper() + '}}', part_vis(var))
    html = html.replace('{{IMG_TRUST}}', '')
    html = html.replace('{{IMG_FORMAT}}', '')
    html = html.replace('{{IMG_CLOSE}}', CLOSE_COVERS)
    html = html.replace('{{SAMPLE}}', sample_block(SAMPLE))
    html = html.replace('{{DATE}}', datetime.date.today().isoformat())
    html = (html.replace('{{HOME}}', link('/')).replace('{{GB}}', link('/guidebook/'))
            .replace('{{FAVICON}}', '../assets/favicon_32.png' if MODE == 'site' else 'https://www.hyunhak.com/assets/favicon_32.png'))
    if MODE == 'site':
        # og:image 1200x630 = 실물 표지 네 권을 한지 바탕에(AI 정물 대체, 2026-09-03)
        og = Image.new('RGB', (1200, 630), (244, 239, 227))
        ch = 520; cw = round(ch * 595 / 842); gap = (1200 - 4 * cw) // 5
        for i, n in enumerate(HERO_COVERS[:4]):
            c = Image.open(COV / f"{n}.jpg").convert('RGB').resize((cw, ch), Image.LANCZOS)
            og.paste(c, (gap + i * (cw + gap), (630 - ch) // 2))
        og.save(SITE_ROOT / 'assets' / 'photo' / 'gbd' / 'gbd_og.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
        out = SITE_ROOT / 'programs' / 'guidebook.html'
    else:
        out = OUT / OUTNAME
    out.write_text(html, encoding='utf-8')
    print(out, f"{out.stat().st_size/1e6:.2f} MB", 'MODE', MODE, 'IMG', IMG)


if __name__ == '__main__':
    main()
