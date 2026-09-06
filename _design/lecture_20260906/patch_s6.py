#!/usr/bin/env python3
"""s6 집행 패치 (2026-09-06, Codex r5 verdict_r5.json 권고). 멱등: 적용 판정은 new 존재로(old 부재 가드 금지).

LC-2  맛보기 캡션 = 매니페스트 실길이 (make_lecture_samples.py 문장 끝 스냅)          → build_lectures.py, faq.html
LC-4  2026 기출 해설 1편을 단위 전권 그룹으로 노출 (여섯 번째 판매 단위 신설 없음)      → build_lectures.py, assets/lectures.js, assets/lecture.js, my.html, faq.html
NNN2  앵커 착지 직후 aria-current 임계 (클릭 대상 고정 + 허용 폭)                        → build_lectures.py (spy)
NNN3  목록면 활성 필터 칩 = 솔리드 대신 테두리 상태 표현 (.lecp 한정)                   → build_lectures.py (CSS)
NNN4  모바일 마지막 화면 구매 경로 = 하단 바 fixed + 푸터 여백                          → build_lectures.py (CSS)
NNN5  푸터 heading H4 → H2 (공용 셸, apply_footer 가 전면 전파)                          → _tools/v2_shell.py, assets/base.css
FAQ   faq.html h2 앵커 scroll-margin-top                                                → faq.html
실행: python3 _design/lecture_20260906/patch_s6.py [--dry]
"""
import re, sys
from pathlib import Path

SITE = Path(__file__).resolve().parents[2]
B = SITE / "_tools" / "build_lectures.py"
LJS = SITE / "assets" / "lectures.js"
VJS = SITE / "assets" / "lecture.js"
MY = SITE / "my.html"
FAQ = SITE / "faq.html"
SHELL = SITE / "_tools" / "v2_shell.py"
CSS = SITE / "assets" / "base.css"

GICHUL_PY = '''GICHUL_SET_OF = {"korea-hum": "korea_2026_gichul_hum_am", "korea-sci": "korea_2026_gichul_sci_pm", "yonsei-hum": "yonsei_2026_gichul_hum", "yonsei-sci": "yonsei_2026_gichul_sci", "yonsei-intl": "yonsei_2026_gichul_intl"}'''
GICHUL_JS = '''GICHUL_OF = { "korea-hum": "korea_2026_gichul_hum_am", "korea-sci": "korea_2026_gichul_sci_pm", "yonsei-hum": "yonsei_2026_gichul_hum", "yonsei-sci": "yonsei_2026_gichul_sci", "yonsei-intl": "yonsei_2026_gichul_intl" }'''

ITEMS = [
    # ---------- build_lectures.py ----------
    ("B1 기출 표 + 맛보기 실길이", B,
     '''             "korea-hum": "lec_unit_korea-hum_L3-2", "korea-sci": "lec_unit_korea-sci_L4-1", "common": "lec_common_L0-2"}\n''',
     '''             "korea-hum": "lec_unit_korea-hum_L3-2", "korea-sci": "lec_unit_korea-sci_L4-1", "common": "lec_common_L0-2"}
# 2026 기출 해설 세트: 단위 전권마다 그 대학 계열의 기출 세트 하나 (LC-4 ②, 2026-09-06 Codex r5). hyunhak-api src/pay.js GICHUL_SET_OF 와 같은 표
''' + GICHUL_PY + '''
GICHUL_UNIT = "yeongo-gichul"
# 맛보기 실길이. make_lecture_samples.py 가 절 시작에서 75초에 가장 가까운 완결 문장 끝까지 자르므로 편마다 1~5초 다르다 (LC-2 A, Codex r5 후속 (i))
_SMP = json.load(open(os.path.join(ROOT, "assets/video/samples_manifest.json"), encoding="utf-8"))["samples"]


def smp_len(code):
    s = int(round(float(_SMP[code]["length_sec"])))
    m, r = divmod(s, 60)
    return f"{m}분 {r}초"
'''),
    ("B2 by_kind gichul", B,
     '''            "common": [l for l in LECS if l["kind"] == "common"]}\n''',
     '''            "common": [l for l in LECS if l["kind"] == "common"],
            "gichul": [l for l in LECS if l["kind"] == "passage" and l["unit_code"] == GICHUL_UNIT and l.get("passage_set_id") == GICHUL_SET_OF.get(code)]}\n'''),
    ("B3a courses n", B,
     '''        n = len(k["common"]) + len(k["unit"]) + len(k["passage"])\n''',
     '''        n = len(k["common"]) + len(k["unit"]) + len(k["passage"]) + len(k["gichul"])\n'''),
    ("B3b courses common", B,
     '''    k["unit"], k["passage"] = [], []\n''',
     '''    k["unit"], k["passage"], k["gichul"] = [], [], []\n'''),
    ("B4 목록 카드 구성", B,
     '''<span>공통 {len(k["common"])}, 단위 강의 {len(k["unit"])}, 세트 해설 {len(k["passage"])}</span>' if c["code"] != "common"''',
     '''<span>공통 {len(k["common"])}, 단위 강의 {len(k["unit"])}, 세트 해설 {len(k["passage"])}, 2026 기출 해설 {len(k["gichul"])}</span>' if c["code"] != "common"'''),
    ("B5 목록 리드", B,
     '''공통 풀이 4편, 단위 강의, 지문마다 한 편인 세트 해설. 단위 전권 이용권에 포함되고''',
     '''공통 풀이 4편, 단위 강의, 지문마다 한 편인 세트 해설, 2026 기출 해설 1편. 단위 전권 이용권에 포함되고'''),
    ("B6a 목록 캡션", B,
     '''공통 풀이 2편 개수 계약 발췌, 1분 15초. 강좌마다 맛보기가 한 편씩 있습니다.''',
     '''공통 풀이 2편 개수 계약 발췌, {smp_len("common")}. 강좌마다 맛보기가 한 편씩 있습니다.'''),
    ("B6b 인강실 캡션", B,
     '''공통 풀이 2편 개수 계약 발췌, 1분 15초</p>''',
     '''공통 풀이 2편 개수 계약 발췌, {smp_len("common")}</p>'''),
    ("B6c 상세 캡션", B,
     '''{E(smp_cap)}, 1분 15초. 로그인 없이 봅니다.''',
     '''{E(smp_cap)}, {smp_len(code)}. 로그인 없이 봅니다.'''),
    ("B7 상세 기출 그룹", B,
     '''        head, rest = k["passage"][:6], k["passage"][6:]\n''',
     '''        if k["gichul"]:
            groups.append(group("2026 기출 해설", f'구성 <b>{len(k["gichul"])}</b>, {E(c["label"])} 2026 기출 지문의 실전 해설. 단위 전권에 포함', toc_rows(k["gichul"], sid, noseq=True)))
        head, rest = k["passage"][:6], k["passage"][6:]\n'''),
    ("B7b toc_rows noseq", B,
     '''def toc_rows(ls, sample_id, label_n=None, start=1, strip=None):
    out = []
    for i, l in enumerate(ls, start):
        n = f"{l['seq'] or i:0>2}"   # D1 seq 그대로 (뷰어·인강실·맛보기 문구와 같은 번호. 결번은 인문/자연 트랙 분기의 사실)''',
     '''def toc_rows(ls, sample_id, label_n=None, start=1, strip=None, noseq=False):
    out = []
    for i, l in enumerate(ls, start):
        n = f"{i:0>2}" if noseq else f"{l['seq'] or i:0>2}"   # D1 seq 그대로 (뷰어·인강실·맛보기 문구와 같은 번호. 결번은 인문/자연 트랙 분기의 사실). 기출 그룹은 단위 밖 순번이라 안 쓴다'''),
    ("B8 묶음 수", B,
     '''{c["n"]}편, {"한 묶음" if is_common else "세 묶음"}</h2>''',
     '''{c["n"]}편, {"한 묶음" if is_common else ("네 묶음" if k["gichul"] else "세 묶음")}</h2>'''),
    ("B9 상세 스크립트 기출 공개 목록 병합", B,
     '''  Promise.all([code?LEC.pub(code):Promise.resolve(null), LEC.mine()]).then(function(r){{ var pubList=r[0], mineList=r[1];''',
     '''  Promise.all([code?LEC.pub(code):Promise.resolve(null), LEC.mine(), code?LEC.pubGichul(code):Promise.resolve(null)]).then(function(r){{ var pubList=r[0], mineList=r[1]; if(pubList&&r[2]) pubList=pubList.concat(r[2]);'''),
    ("B13 NNN3 활성 칩", B,
     '''.lecp .chips{margin-top:var(--s4)}\n''',
     '''.lecp .chips{margin-top:var(--s4)}
.lecp .chips button[aria-pressed="true"]{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink);font-weight:700}   /* 상태 표식은 테두리, 솔리드 채움은 주 행동 하나만 (critic NNN3) */\n'''),
    ("B14 NNN4 하단 바 fixed", B,
     '''@media (max-width:820px){.lecd .sticky{display:block;bottom:calc(72px + env(safe-area-inset-bottom))}.lecd .sticky.off{display:none}}''',
     '''@media (max-width:820px){.lecd .sticky{display:block;position:fixed;left:0;right:0;bottom:calc(72px + env(safe-area-inset-bottom))}.lecd .sticky.off{display:none}body.lecd footer .wrap{padding-bottom:64px}}   /* 푸터까지 내려도 구매 경로가 남는다 (critic NNN4). 푸터 끝 줄은 바 높이만큼 띄운다 */'''),
    ("B15 NNN2 스파이", B,
     '''  function spy(){{ var off=(bar?bar.getBoundingClientRect().bottom:120)+8, cur=0; secs.forEach(function(s,i){{ if(s&&s.getBoundingClientRect().top<=off) cur=i; }}); links.forEach(function(a,i){{ if(i===cur) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); }}); }}
  window.addEventListener('scroll', spy, {{passive:true}}); spy();''',
     '''  var hold=0;
  function setCur(cur){{ links.forEach(function(a,i){{ if(i===cur) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); }}); }}
  // 착지 임계: 절 top 은 scroll-margin(바 아래 56px) 에 서므로 바 아래 16px 까지를 현재 절로 본다. 클릭 뒤 0.8초는 클릭한 절로 고정한다 (critic NNN2)
  function spy(){{ if(Date.now()<hold) return; var off=(bar?bar.getBoundingClientRect().bottom:120)+16, cur=0; secs.forEach(function(s,i){{ if(s&&s.getBoundingClientRect().top<=off) cur=i; }}); setCur(cur); }}
  links.forEach(function(a,i){{ a.addEventListener('click', function(){{ setCur(i); hold=Date.now()+800; setTimeout(function(){{ hold=0; spy(); }}, 850); }}); }});
  window.addEventListener('scroll', spy, {{passive:true}}); spy();'''),
    # ---------- assets/lectures.js ----------
    ("J1a lectures.js 기출 표", LJS,
     '''  var UNITS = ["korea-hum", "korea-sci", "yonsei-hum", "yonsei-sci", "yonsei-intl"];\n''',
     '''  var UNITS = ["korea-hum", "korea-sci", "yonsei-hum", "yonsei-sci", "yonsei-intl"];
  // 2026 기출 해설 1편 = 단위 전권에 일대일 편입 (LC-4 ②, 2026-09-06). 단위 카드 안에 그 대학 계열 편 하나만 얹고 여섯 번째 단위는 만들지 않는다. hyunhak-api pay.js 와 같은 표
  var GICHUL_UNIT = "yeongo-gichul", ''' + GICHUL_JS + ''';
  function gichulOf(l, code) { return l.unit_code === GICHUL_UNIT && l.passage_set_id === GICHUL_OF[code]; }\n'''),
    ("J1b lectures.js pubGichul", LJS,
     '''  function summary(q) {
    if (_sum[q]) return _sum[q];''',
     '''  // 기출 해설 공개 목록에서 그 단위에 묶인 편 하나만 (공개 API 는 unit_code 로만 거른다)
  function pubGichul(code) {
    if (!GICHUL_OF[code]) return Promise.resolve(null);
    return HH.api("/api/lectures/public?unit=" + GICHUL_UNIT)
      .then(function (d) { return Array.isArray(d.lectures) ? d.lectures.filter(function (l) { return gichulOf(l, code); }) : null; })
      .catch(function () { return null; });
  }
  function summary(q) {
    if (_sum[q]) return _sum[q];'''),
    ("J1c lectures.js 인강실 카드", LJS,
     '''          var ls = all.filter(function (l) { return l.unit_code === u.code; });
          if (!ls.some(function (l) { return l.entitled; })) return;''',
     '''          var ls = all.filter(function (l) { return l.unit_code === u.code || gichulOf(l, u.code); });
          if (!ls.some(function (l) { return l.entitled; })) return;'''),
    ("J1d lectures.js export", LJS,
     '''  window.LEC = { units: units, pub: pub, summary: summary,''',
     '''  window.LEC = { units: units, pub: pub, pubGichul: pubGichul, summary: summary,'''),
    # ---------- assets/lecture.js ----------
    ("J2a lecture.js 기출 표", VJS,
     '''  function unitOfSet(id) { if (!okSetId(id)) return null; for (var i = 0; i < UNIT_OF.length; i++) if (UNIT_OF[i][0].test(String(id))) return UNIT_OF[i][1]; return null; }\n''',
     '''  function unitOfSet(id) { if (!okSetId(id)) return null; for (var i = 0; i < UNIT_OF.length; i++) if (UNIT_OF[i][0].test(String(id))) return UNIT_OF[i][1]; return null; }
  // 2026 기출 해설 1편 = 단위 전권에 일대일 편입 (LC-4 ②, 2026-09-06). 단위 그룹 안에 그 대학 계열 편 하나. 여섯 번째 단위 축은 만들지 않는다. hyunhak-api pay.js 와 같은 표
  var GICHUL_UNIT = "yeongo-gichul", ''' + GICHUL_JS + ''';
  function gichulOf(l, code) { return l.unit_code === GICHUL_UNIT && l.passage_set_id === GICHUL_OF[code]; }
  function isGichul(l) { return l.unit_code === GICHUL_UNIT && Object.keys(GICHUL_OF).some(function (c) { return GICHUL_OF[c] === l.passage_set_id; }); }\n'''),
    ("J2b lecture.js unit view 기출 그룹", VJS,
     '''    var pass = all.filter(function (l) { return l.kind === "passage" && l.unit_code === unit; });\n''',
     '''    var pass = all.filter(function (l) { return l.kind === "passage" && l.unit_code === unit; });
    var gich = all.filter(function (l) { return gichulOf(l, unit); });\n'''),
    ("J2c lecture.js all view 단위 그룹", VJS,
     '''      var ls = all.filter(function (l) { return l.unit_code === c; });
      var u = units.find(function (x) { return x.code === c; });''',
     '''      var ls = all.filter(function (l) { return l.unit_code === c || gichulOf(l, c); });
      var u = units.find(function (x) { return x.code === c; });'''),
    ("J2d lecture.js public view 세트 계수에서 기출 제외", VJS,
     '''      var rdy = passageOf(ls).filter(isReady).length;\n''',
     '''      var rdy = passageOf(ls).filter(isReady).filter(function (l) { return l.unit_code !== GICHUL_UNIT; }).length;   // 세트 30편 모수에 기출 1편을 섞지 않는다\n'''),
    ("J2e lecture.js publicAll 기출 합류", VJS,
     '''  function publicAll(codes) {
    return Promise.all(codes.map(function (c) {''',
     '''  function publicAll(codes) {
    return Promise.all([publicAllUnits(codes), apiFetch("/api/lectures/public?unit=" + GICHUL_UNIT).catch(function () { return { _status: 0 }; })]).then(function (r) {
      var states = r[0], g = r[1] && r[1]._status === 200 && Array.isArray(r[1].lectures) ? r[1].lectures : [];
      states.forEach(function (s2) { if (!s2.ok) return; g.forEach(function (l) { if (gichulOf(l, s2.code)) s2.lectures.push(l); }); });
      return states;
    });
  }
  function publicAllUnits(codes) {
    return Promise.all(codes.map(function (c) {'''),
    ("J2f lecture.js renderList 기출 fetch", VJS,
     '''      unitParam ? apiFetch("/api/lectures/public?unit=" + encodeURIComponent(unitParam)).catch(function () { return { _status: 0 }; }) : Promise.resolve(null),
    ]).then(function (res) {
      var mine = res[0], units = res[1], pubd = res[2];''',
     '''      unitParam ? apiFetch("/api/lectures/public?unit=" + encodeURIComponent(unitParam)).catch(function () { return { _status: 0 }; }) : Promise.resolve(null),
      unitParam && GICHUL_OF[unitParam] ? apiFetch("/api/lectures/public?unit=" + GICHUL_UNIT).catch(function () { return { _status: 0 }; }) : Promise.resolve(null),
    ]).then(function (res) {
      var mine = res[0], units = res[1], pubd = res[2], pubg = res[3];'''),
    ("J2g lecture.js renderList 병합", VJS,
     '''      (pubList || []).forEach(function (l) { byId[l.id] = Object.assign({}, l, { entitled: false }); });
      mineList.forEach''',
     '''      (pubList || []).forEach(function (l) { byId[l.id] = Object.assign({}, l, { entitled: false }); });
      if (pubg && pubg._status === 200) (pubg.lectures || []).forEach(function (l) { if (gichulOf(l, unitParam)) byId[l.id] = Object.assign({}, l, { entitled: false }); });
      mineList.forEach'''),
    ("J2h lecture.js renderList 허용", VJS,
     '''        .filter(function (l) { return !l.unit_code || okUnit(l.unit_code); });
      if (unitParam) renderUnitView''',
     '''        .filter(function (l) { return !l.unit_code || okUnit(l.unit_code) || isGichul(l); });   // 기출은 단위 전권에 묶인 세트만 (미래캠 노출 경로는 그대로 닫힘)
      if (unitParam) renderUnitView'''),
    # ---------- my.html ----------
    ("J3a my.html 기출 표", MY,
     '''    function unitOfSet(id){ for(var i=0;i<UNIT_OF.length;i++) if(UNIT_OF[i][0].test(String(id||''))) return UNIT_OF[i][1]; return null; }\n''',
     '''    function unitOfSet(id){ for(var i=0;i<UNIT_OF.length;i++) if(UNIT_OF[i][0].test(String(id||''))) return UNIT_OF[i][1]; return null; }
    var GICHUL_OF={'korea-hum':1,'korea-sci':1,'yonsei-hum':1,'yonsei-sci':1,'yonsei-intl':1};   // 단위 전권마다 2026 기출 해설 1편 (LC-4 ②, 2026-09-06)\n'''),
    ("J3b my.html 카드 문구", MY,
     '''        +'<p class="st">'+(sm?esc(lecText(sm.ready||0,total)):'공개 편수를 지금 확인할 수 없습니다')+(until(owned[c])?', '+until(owned[c]):'')+'</p></div>\'''',
     '''        +'<p class="st">'+(sm?esc(lecText(sm.ready||0,total)):'공개 편수를 지금 확인할 수 없습니다')+(GICHUL_OF[c]?', 2026 기출 해설 1편':'')+(until(owned[c])?', '+until(owned[c]):'')+'</p></div>\''''),
    # ---------- faq.html ----------
    ("H1a faq 맛보기 길이 (본문 + JSON-LD 2곳)", FAQ,
     '''로그인 없이 보는 1분 15초 발췌가 있고 자막이 붙어 있습니다.''',
     '''로그인 없이 보는 1분 15초 안팎의 발췌가 있고 자막이 붙어 있습니다. 절이 시작하는 자리에서 잘라 문장이 끊기지 않습니다.'''),
    ("H1b faq 인강 종류", FAQ,
     '''<p>세 묶음입니다. 다섯 단위에 모두 걸리는 공통 풀이 인강 4편, 응시 단위마다 5편에서 9편인 단위 강의, 지문마다 1편씩 단위마다 30편인 세트 해설입니다. 고려대 자연은 보충 해설 10편이 더 있습니다.''',
     '''<p>네 묶음입니다. 다섯 단위에 모두 걸리는 공통 풀이 인강 4편, 응시 단위마다 5편에서 9편인 단위 강의, 지문마다 1편씩 단위마다 30편인 세트 해설, 단위마다 1편인 2026 기출 해설입니다. 고려대 자연은 보충 해설 10편이 더 있습니다.'''),
    ("H1c faq 단위 전권 구성", FAQ,
     '''<p>그 단위의 단위 강의 전편과 세트 해설 30편, 공통 풀이 인강 4편이 인강실에 섭니다.''',
     '''<p>그 단위의 단위 강의 전편과 세트 해설 30편, 공통 풀이 인강 4편, 그 대학 계열의 2026 기출 해설 1편이 인강실에 섭니다.'''),
    ("H2 faq 앵커 scroll-margin", FAQ,
     ''".faqp h2:first-child{margin-top:0}\n",
     ''".faqp h2:first-child{margin-top:0}\n.faqp h2{scroll-margin-top:calc(var(--hd-h) + 16px)}\n@media (max-width:900px){.faqp h2{scroll-margin-top:calc(var(--hd-h-sm) + 16px)}}\n"),
    # ---------- 인강실 .ot 블록 heading H1 → H3 건너뜀 (NNN5 실측 곁다리, classroom.html 시퀀스 13222) ----------
    ("C1 classroom noscript h2", B,
     '<span class="eyebrow">스크립트 필요</span><h3>인강실은 스크립트가 켜진 브라우저에서 열립니다</h3>',
     '<span class="eyebrow">스크립트 필요</span><h2>인강실은 스크립트가 켜진 브라우저에서 열립니다</h2>'),
    ("C2 classroom guest h2", B,
     '<span class="eyebrow">로그인 필요</span><h3>인강실은 로그인한 뒤 열립니다</h3>',
     '<span class="eyebrow">로그인 필요</span><h2>인강실은 로그인한 뒤 열립니다</h2>'),
    ("C3 classroom ot h2", B,
     '<span class="eyebrow">인강 OT</span><h3>이 인강을 어떤 순서로 듣나</h3><p>공통 풀이 4편을 먼저, 단위 강의는 응시 전에, 세트 해설은 응시한 지문부터. 5분 안내 영상은 로그인하면 회원 무료 0강으로 목록 맨 위에 있습니다.</p>',
     '<span class="eyebrow">인강 OT</span><h2>이 인강을 어떤 순서로 듣나</h2><p>공통 풀이 4편을 먼저, 단위 강의는 응시 전에, 세트 해설은 응시한 지문부터. 5분 안내 영상은 로그인하면 회원 무료 0강으로 목록 맨 위에 있습니다.</p>'),
    # ---------- 공용 셸 푸터 heading (NNN5) ----------
    ("S1a shell h2", SHELL,
     '''        <h4>현학적 연구소 <span class="han">玄學的 硏究所</span></h4>''',
     '''        <h2>현학적 연구소 <span class="han">玄學的 硏究所</span></h2>'''),
    ("S1b shell h2", SHELL, '''        <h4>바로가기</h4>''', '''        <h2>바로가기</h2>'''),
    ("S1c shell h2", SHELL, '''        <h4>고객센터</h4>''', '''        <h2>고객센터</h2>'''),
    ("S1d base.css footer h2", CSS,
     ''':where(body.v2) footer h4{''',
     ''':where(body.v2) footer h2{'''),
]


def main():
    dry = "--dry" in sys.argv
    fail = 0
    for pid, path, old, new in ITEMS:
        s = path.read_text(encoding="utf-8")
        if new in s:
            print(f"skip  {pid}")
            continue
        n = s.count(old)
        if pid.startswith("H1a") and n == 2:   # 본문 details + ld+json FAQPage 답변 두 곳, 같은 문면
            n = 1
            old_all = True
        else:
            old_all = False
        if n != 1:
            print(f"FAIL  {pid} old 적중 {n}건 (1 이어야)  {path.name}")
            fail += 1
            continue
        if dry:
            print(f"would {pid} {path.name}")
            continue
        path.write_text(s.replace(old, new) if old_all else s.replace(old, new, 1), encoding="utf-8")
        print(f"apply {pid} {path.name}")
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
