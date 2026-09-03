"""GS-17 2차 수리 적용기 (refute 확정 결함 S5 회귀, critic P1, A2 회귀 x2, G3 잉크). 원천만 고친다. 멱등: 이미 적용된 원천이면 변경 0 으로 끝난다.
  python3 apply_repair_r2.py           dry-run (변경 수만 출력)
  python3 apply_repair_r2.py --apply   백업(.bak.YYYYMMDD_HHMM_pre_gs17) 뒤 기록
"""
import sys, re, hashlib, shutil, datetime, pathlib
ROOT = pathlib.Path('/Users/gregory/Workspace/hyunhak-site')
B = ROOT / '_design/studio_detail_20260903/build/build_page.py'
C = ROOT / '_design/studio_detail_20260903/build/page.css'
BP = ROOT / '_design/guidebook_detail_20260903/build/build_page.py'
AM = ROOT / '_design/gs17_20260903/apply_mech.py'
APPLY = '--apply' in sys.argv
# 편집 직전 해시 가드: 읽은 시점(22:06) 의 원천과 같아야 기록한다(타 세션 경합 차단)
GUARD = {B: '0ad47fc226de13c2', C: 'ccf5be1bed5b9fde', BP: 'aad5785d031028f8'}

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()[:16]

def rep(text, old, new, n=1, label=''):
    if new in text:
        return text, 0   # 이미 적용(old 가 new 의 부분문자열인 경우까지 포함)
    c = text.count(old)
    if c != n:
        raise SystemExit(f'FAIL {label}: 기대 {n}건, 실측 {c}건: {old[:70]!r}')
    return text.replace(old, new), c

changes = {}
# ---------------------------------------------------------------- C page.css
c = C.read_text(encoding='utf-8'); nC = 0
c, k = rep(c, '.ft .biz nav{margin-top:var(--s2);font-size:var(--t-cap)}\n.ft .biz nav a{text-decoration:underline;text-underline-offset:3px}',
           '.ft .biz nav{margin-top:0;font-size:var(--t-cap);display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2)}  /* GS-17 A2 회귀 수리: index.html(base.css:305) 과 같은 flex 행 */\n'
           '.ft .biz nav a{display:inline-flex;align-items:center;min-height:44px;min-width:44px;text-decoration:underline;text-underline-offset:3px}  /* 탭 표적 44px(faq A1 과 같은 기준). 종전 41x14, 81x14 */',
           label='C nav'); nC += k
c, k = rep(c, '.part{scroll-margin-top:var(--s5)}\n',
           '.part{scroll-margin-top:var(--s5)}\n'
           '.part .vis{scroll-margin-top:var(--s5)}  /* GS-17 S5 회귀 수리: 카드 "실제 화면 보기" 착지 = #pN-shot(화면). p3 p5 는 sample 이 body 앞이라 섹션 상단 착지 시 화면이 접힘 아래(390 가시율 17%, 0%) */\n'
           '.vis .zoom{display:block;position:relative;color:inherit}  /* critic P1: 단계 화면 5장 확대 래퍼(원본 jpg 새 탭). 라벨은 그림 안 오른쪽 아래 */\n'
           '.vis .zl{position:absolute;right:8px;bottom:8px;display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:var(--t-xs);font-weight:500;letter-spacing:.06em;line-height:1;color:var(--ink);background:rgba(244,239,227,.94);border:1px solid var(--hair);border-radius:3px;padding:6px 8px;pointer-events:none}\n'
           '.vis .zoom:hover .zl,.vis .zoom:focus-visible .zl{background:var(--ink);color:var(--paper);border-color:var(--ink)}\n',
           label='C zoom'); nC += k
changes[C] = (c, nC)
# ---------------------------------------------------------------- B studio build_page.py
b = B.read_text(encoding='utf-8'); nB = 0
b, k = rep(b, "    return f'<img{ca} src=\"{uri}\" width=\"{w}\" height=\"{h}\" alt=\"{alt}\"{lz} decoding=\"async\">'\n",
           "    return f'<img{ca} src=\"{uri}\" width=\"{w}\" height=\"{h}\" alt=\"{alt}\"{lz} decoding=\"async\">'\n\n\n"
           "def shot_block(key, alt):\n"
           "    \"\"\"단계 화면 한 장. site 모드는 원본 jpg 를 새 탭으로 여는 확대 래퍼(critic P1: 390 에서 1200px 화면이 348px 로 축소, 확대 경로 0건).\n"
           "    data 모드(독립 HTML, data: URI)는 새 탭 이동이 브라우저에서 막히므로 래퍼 없이 그림만.\"\"\"\n"
           "    im = img(IMG[key], alt)\n"
           "    if MODE != 'site':\n"
           "        return f'<div class=\"shot\">{im}</div>'\n"
           "    return (f'<a class=\"zoom\" href=\"{IMG[key][0]}\" target=\"_blank\" rel=\"noopener\" aria-label=\"{alt}. 새 탭에서 크게 보기\">'\n"
           "            f'<div class=\"shot\">{im}</div><span class=\"zl\" aria-hidden=\"true\">크게 보기 <span>↗</span></span></a>')\n",
           label='B shot_block'); nB += k
for n, key in [(1, 'HOME'), (2, 'PREP'), (3, 'ANSWER'), (4, 'REVISION'), (5, 'REPORT')]:
    b, k = rep(b, f'<div class="vis rv"><div class="shot">{{{{IMG_{key}}}}}</div></div>', f'<div class="vis rv" id="p{n}-shot">{{{{SHOT_{key}}}}}</div>', label=f'B vis p{n}'); nB += k
    b, k = rep(b, f"          .replace('{{{{IMG_{key}}}}}', img(IMG['{key.lower()}'], ", f"          .replace('{{{{SHOT_{key}}}}}', shot_block('{key.lower()}', ", label=f'B main p{n}'); nB += k
# 카드 링크 착지: #pN → #pN-shot (rail 5장만)
m = re.search(r'<ol class="rail anchor">.*?</ol>', b, re.S)
if not m: raise SystemExit('FAIL B rail 블록 없음')
blk = m.group(0); new_blk, k = re.subn(r'<a href="#p([1-5])">', r'<a href="#p\1-shot">', blk)
if k not in (0, 5): raise SystemExit(f'FAIL B rail href {k}건')
if k == 0 and blk.count('-shot"') != 5: raise SystemExit('FAIL B rail href 상태 불명')
b = b.replace(blk, new_blk); nB += k
changes[B] = (b, nB)
# ---------------------------------------------------------------- BP guidebook build_page.py
bp = BP.read_text(encoding='utf-8'); nBP = 0
bp, k = rep(bp, '.c,.facts b .c{display:inline-block;width:.34em;margin:0;font:inherit;color:inherit;text-align:center}  /* GS-17 G3:',
            '.c,.facts b .c{display:inline-block;width:.34em;margin:0;font:inherit;color:inherit;text-align:center;text-indent:-.095em}  /* GS-17 G3 잉크 수리: 0.6em 글리프가 .34em 상자를 넘치면 Chrome 은 start 정렬이라 center 무효(refute 2건, 34px 간격 8.0/1.25px). text-indent -.095em 로 잉크를 상자 왼쪽으로 옮겨 앞뒤 간격을 숫자 간격(4.5px)과 맞춘다.',
            label='BP .c'); nBP += k
bp, k = rep(bp, '.ft .biz nav{margin-top:var(--s2);font-size:var(--t-cap)}\n.ft .biz nav a{text-decoration:underline;text-underline-offset:3px}',
            '.ft .biz nav{margin-top:0;font-size:var(--t-cap);display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2)}  /* GS-17 A2 회귀 수리: index.html(base.css:305) 과 같은 flex 행 */\n'
            '.ft .biz nav a{display:inline-flex;align-items:center;min-height:44px;min-width:44px;text-decoration:underline;text-underline-offset:3px}  /* 탭 표적 44px(faq A1 과 같은 기준). 종전 41x14, 81x14 */',
            label='BP nav'); nBP += k
changes[BP] = (bp, nBP)
# ---------------------------------------------------------------- apply_mech.py A2_CSS 동기화
am = AM.read_text(encoding='utf-8'); nAM = 0
am, k = rep(am, "    '.ft .biz nav{margin-top:var(--s2);font-size:var(--t-cap)}',\n    '.ft .biz nav a{text-decoration:underline;text-underline-offset:3px}',",
            "    '.ft .biz nav{margin-top:0;font-size:var(--t-cap);display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2)}  /* GS-17 A2 회귀 수리: index.html(base.css:305) 과 같은 flex 행 */',\n"
            "    '.ft .biz nav a{display:inline-flex;align-items:center;min-height:44px;min-width:44px;text-decoration:underline;text-underline-offset:3px}  /* 탭 표적 44px(faq A1 과 같은 기준). 종전 41x14, 81x14 */',",
            label='AM A2_CSS'); nAM += k
changes[AM] = (am, nAM)

for p, (t, n) in changes.items():
    print(f'{p.relative_to(ROOT)}: 변경 {n}건')
if not APPLY:
    print('dry-run. --apply 로 기록'); sys.exit(0)
stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M')
for p, (t, n) in changes.items():
    if n == 0: continue
    if p in GUARD and sha(p) != GUARD[p]:
        raise SystemExit(f'STOP 해시 가드: {p.name} 이 읽은 시점과 다르다(타 세션 편집 의심). {sha(p)} != {GUARD[p]}')
    bak = p.with_name(p.name + f'.bak.{stamp}_pre_gs17')
    if not bak.exists(): shutil.copy2(p, bak)
    p.write_text(t, encoding='utf-8')
    print(f'wrote {p.relative_to(ROOT)}  backup {bak.name}')
# 자기검사
b2 = B.read_text(encoding='utf-8'); c2 = C.read_text(encoding='utf-8'); bp2 = BP.read_text(encoding='utf-8')
assert b2.count('-shot"') == 10, b2.count('-shot"')          # rail href 5 + vis id 5
assert b2.count('{{IMG_HOME}}') == 0 and b2.count('{{SHOT_') == 10, (b2.count('{{SHOT_'))
assert b2.count('def shot_block(') == 1
assert c2.count('.part .vis{scroll-margin-top') == 1 and c2.count('.vis .zoom{') == 1
assert c2.count('min-height:44px;min-width:44px;text-decoration:underline') == 1
assert bp2.count('text-indent:-.095em') == 1 and bp2.count('min-height:44px;min-width:44px;text-decoration:underline') == 1
print('selfcheck OK')
