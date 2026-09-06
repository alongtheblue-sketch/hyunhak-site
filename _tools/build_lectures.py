#!/usr/bin/env python3
"""인강 상품면 빌더 (2026-09-06). lectures.html(강좌 목록), lectures/<code>.html(강좌 상세 6면), classroom.html(인강실) 을 생성한다.
   원천 = assets/data/sets.json(단위, 세트 제목, 가격) + _tools/lecture_catalog.json(D1 lectures 스냅샷: 제목, 길이, 순서).
   지면에 박는 값은 구성(편수, 길이)뿐이고, 공개 편수와 시청 권리는 assets/lectures.js 가 API 실값으로 덮는다 (LECTURE_SPEC §6).
   nav, footer, 폰트, 분석 태그, SEO 블록은 build_all.sh 의 후공정이 채운다 (자리표시 <!--v2:shell--> 등).
   멱등: 같은 입력이면 같은 바이트. 사용: python3 _tools/build_lectures.py [--only list,detail,classroom]"""
import json, os, sys, html, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = html.escape
SETS = json.load(open(os.path.join(ROOT, "assets/data/sets.json"), encoding="utf-8"))
CAT = json.load(open(os.path.join(ROOT, "_tools/lecture_catalog.json"), encoding="utf-8"))
LECS = [l for l in CAT["lectures"] if l.get("status") != "hidden"]
SNAP = CAT["snapshot_at"][:10]
UNITS = {u["code"]: u for u in SETS["units"]}
ORDER = ["yonsei-hum", "yonsei-sci", "yonsei-intl", "korea-hum", "korea-sci"]
TRACK = {"yonsei-hum": "hum", "yonsei-sci": "sci", "yonsei-intl": "intl", "korea-hum": "hum", "korea-sci": "sci"}
UNIV = {"yonsei-hum": "yonsei", "yonsei-sci": "yonsei", "yonsei-intl": "yonsei", "korea-hum": "korea", "korea-sci": "korea"}
SPEC = {   # 단위별 규격 한 줄 (studio.html, programs/*.html 의 문안과 같은 값)
    "yonsei-hum": "준비 8분, 답변 5분", "yonsei-sci": "준비 8분, 답변 5분", "yonsei-intl": "준비 8분, 답변 5분, 제시문 [나]는 영어",
    "korea-hum": "준비 21분, 발화 7분", "korea-sci": "준비 21분, 발화 7분",
}
# 단위별 소개 문단 (단위 강의 제목에서 뽑은 사실만. 새 주장 없음)
INTRO = {
    "yonsei-hum": ["연세대 활동우수형 인문통합 면접은 준비 8분과 답변 5분입니다. 이 인강은 발문 끝 동사가 유형을 정한다는 규칙에서 시작해, 적용과 불가와 자료라는 판정 세 종, 480초 배분, 자료를 성립 조건으로 읽는 법, 배점이 시간을 정하는 효율 트랙까지 단위 강의가 잡고, 세트 해설 30편이 지문마다 같은 절차를 밟습니다."],
    "yonsei-sci": ["연세대 활동우수형 자연 면접은 준비 8분과 답변 5분입니다. 발문 끝 동사, 판정 세 종, 480초 배분은 인문과 같고, 자연은 밑줄이 있으면 밑줄이 기준이라는 규칙과 배점이 시간을 정하는 효율 트랙을 단위 강의가 잡습니다. 세트 해설 30편이 지문마다 같은 절차를 밟습니다."],
    "yonsei-intl": ["연세대 국제형 면접은 준비 8분과 답변 5분이고 제시문 [나]가 영어입니다. [가]와 [나]의 층위 차이, 영어 [나]를 번역 시험으로 읽지 않는 법, [다]를 관점 단위로 재배열하는 문제 2, 8분과 5분의 배분과 답안의 골격, 실전 시연과 30세트 사이클을 단위 강의 5편이 잡습니다."],
    "korea-hum": ["고려대 계열적합전형 인문 면접은 준비 21분과 발화 7분입니다. 발문이 제시문을 지목하는 방식과 정석 배분표, 표와 산점도와 시계열과 부분 지지의 자료해석 네 갈래, 인문A 각론의 차이 축, 문항 3의 활용 세 칸, 트랙이 무너질 때의 전환 판정, 30세트 사이클과 자기채점까지 단위 강의 9편이 잡습니다."],
    "korea-sci": ["고려대 계열적합전형 자연 면접은 준비 21분과 발화 7분입니다. 문항 1이 문항 2와 3을 미리 정하는 직렬 구조, 우리말과 한자어 한 쌍인 개념어, 중복 개념 네 갈래, 한 세트 21분 완주 조립, 적용편부터 읽는 운용까지 단위 강의 8편이 잡습니다. 정규 30세트 해설 외에 보충 해설 10편을 더 봅니다."],
    "common": ["공통 풀이 4편은 연세대 활동우수형과 국제형, 고려대 계열적합 다섯 단위에 전부 걸리는 절차입니다. 이 시험이 지식 시험이 아니라 절차 시험이라는 전제, 결론 선언이 개수 계약이라는 구조 잡기, 7분을 편집으로 쓰는 말하기, 연습장의 빈칸이 절차라는 연습 시스템 총론입니다. 단위 전권에는 포함되어 있고, 응시 없이 절차만 들으려면 따로 삽니다."],
}
COMMON_TX = "공통 풀이 인강"
SAMPLE = {"yonsei-hum": ("단위 강의 3편 480초 배분 발췌", "L1-3"), "yonsei-sci": ("단위 강의 5편 밑줄 기준 발췌", "L1-5"), "yonsei-intl": ("단위 강의 1편 층위 차이 발췌", "L2-1"),
          "korea-hum": ("단위 강의 2편 자료해석 1 발췌", "L3-2"), "korea-sci": ("단위 강의 1편 직렬 구조 발췌", "L4-1"), "common": ("공통 풀이 2편 개수 계약 발췌", "L0-2")}
SAMPLE_ID = {"yonsei-hum": "lec_unit_yonsei-hum_L1-3", "yonsei-sci": "lec_unit_yonsei-sci_L1-5", "yonsei-intl": "lec_unit_yonsei-intl_L2-1",
             "korea-hum": "lec_unit_korea-hum_L3-2", "korea-sci": "lec_unit_korea-sci_L4-1", "common": "lec_common_L0-2"}
# 2026 기출 해설 세트: 단위 전권마다 그 대학 계열의 기출 세트 하나 (LC-4 ②, 2026-09-06 Codex r5). hyunhak-api src/pay.js GICHUL_SET_OF 와 같은 표
GICHUL_SET_OF = {"korea-hum": "korea_2026_gichul_hum_am", "korea-sci": "korea_2026_gichul_sci_pm", "yonsei-hum": "yonsei_2026_gichul_hum", "yonsei-sci": "yonsei_2026_gichul_sci", "yonsei-intl": "yonsei_2026_gichul_intl"}
GICHUL_UNIT = "yeongo-gichul"
# 맛보기 실길이. make_lecture_samples.py 가 절 시작에서 75초에 가장 가까운 완결 문장 끝까지 자르므로 편마다 1~5초 다르다 (LC-2 A, Codex r5 후속 (i))
_SMP = json.load(open(os.path.join(ROOT, "assets/video/samples_manifest.json"), encoding="utf-8"))["samples"]


def smp_len(code):
    s = int(round(float(_SMP[code]["length_sec"])))
    m, r = divmod(s, 60)
    return f"{m}분 {r}초"


def order_svg():
    """듣는 순서 도해. 도형과 글자만 (자가 벡터 허용 범위). 응시와 세트 해설 사이 되돌이 화살표가 30세트 사이클."""
    def node(x, k, t, sub):
        return (f'<rect x="{x}" y="34" width="144" height="64" rx="4"/>'
                f'<text class="k" x="{x+12}" y="52">{k}</text><text x="{x+12}" y="72">{t}</text><text class="sub" x="{x+12}" y="89">{sub}</text>')
    arrow = lambda x: f'<path d="M{x} 66h20m-6-5 6 5-6 5" />'
    return ('<svg class="order" viewBox="0 0 672 132" role="img" aria-label="듣는 순서. 공통 풀이 4편, 단위 강의, 응시, 세트 해설, 그리고 다시 응시. 응시와 세트 해설을 지문마다 반복한다" xmlns="http://www.w3.org/2000/svg">'
            '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'
            + node(8, "1", "공통 풀이", "4편, 먼저 전부") + arrow(154)
            + node(176, "2", "단위 강의", "내 단위만, 응시 전") + arrow(322)
            + node(344, "3", "응시", "실전형 1회, 첨삭") + arrow(490)
            + node(512, "4", "세트 해설", "그 지문 1편, 응시 뒤")
            + '<path class="loop" d="M584 98v14c0 6-4 10-10 10H426c-6 0-10-4-10-10v-14m0 0-5 6m5-6 5 6" stroke-dasharray="3 4"/>'
            '</g><text class="k" x="500" y="128" text-anchor="middle">다시 응시, 지문마다 반복</text></svg>')


def mins(sec):
    m = round((sec or 0) / 60)
    return m


def fmt_total(sec):
    m = round((sec or 0) / 60)
    h, r = divmod(m, 60)
    return (f"{h}시간 {r}분" if r else f"{h}시간") if h else f"{m}분"


def by_kind(code):
    return {"unit": [l for l in LECS if l["kind"] == "unit" and l["unit_code"] == code],
            "passage": [l for l in LECS if l["kind"] == "passage" and l["unit_code"] == code],
            "common": [l for l in LECS if l["kind"] == "common"],
            "gichul": [l for l in LECS if l["kind"] == "passage" and l["unit_code"] == GICHUL_UNIT and l.get("passage_set_id") == GICHUL_SET_OF.get(code)]}


def courses():
    out = []
    for code in ORDER:
        u = UNITS[code]; k = by_kind(code)
        n = len(k["common"]) + len(k["unit"]) + len(k["passage"]) + len(k["gichul"])
        sec = sum((l["duration_sec"] or 0) for g in k.values() for l in g)
        out.append({"code": code, "label": u["label"], "univ": UNIV[code], "track": TRACK[code], "sku": u["sku"], "price": u["price"],
                    "single": u["single_price"], "set_count": u["set_count"], "n": n, "sec": sec, "k": k, "spec": SPEC[code]})
    k = by_kind(None)
    k["unit"], k["passage"], k["gichul"] = [], [], []
    sec = sum((l["duration_sec"] or 0) for l in k["common"])
    out.append({"code": "common", "label": COMMON_TX, "univ": "common", "track": "common", "sku": "lecture-common", "price": 220000, "single": None,
                "set_count": 0, "n": len(k["common"]), "sec": sec, "k": k, "spec": "다섯 단위 공통"})
    return out


HEAD = '''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="referrer" content="no-referrer">
<link rel="icon" href="{p}assets/favicon_32.png">
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></noscript>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;500;700&family=JetBrains+Mono:wght@400;500&display=swap" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;500;700&family=JetBrains+Mono:wght@400;500&display=swap"></noscript>
<link rel="stylesheet" href="{p}assets/base.css"><noscript><style>.rv{{opacity:1;transform:none}}</style></noscript>
<style>
{css}
</style>
</head>
<body class="v2 {cls}" data-p="{p}">
<a class="skip" href="#main">본문으로 건너뛰기</a>
<div class="frame"><div class="sheet">
<!--v2:shell-->
<main id="main">
'''
TAIL = '''</main>
<!--v2:footer-->
</div></div>
<!--v2:fix-->
<script src="{p}assets/app.js"></script>
<script src="{p}assets/lectures.js?v={snap}"></script>
{script}
</body>
</html>
'''

CSS_COMMON = '''/* 인강 상품면 공용 (2026-09-06). 크기는 토큰만, 朱印은 가격과 맛보기 표식과 진행 막대에만 */
.lec2 .sample video{width:100%;aspect-ratio:16/9;background:#000;border-radius:var(--r-sm);display:block;box-shadow:inset 0 0 0 1px var(--hair)}
.lec2 .sample .cap{margin-top:10px;font-size:var(--t-sm);color:var(--gray);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.lec2 .ot{background:var(--card);border-radius:var(--r-md);box-shadow:inset 0 0 0 1px var(--hairs);padding:var(--s4)}
.lec2 .ot h3,.lec2 .ot h2{font-size:var(--t-h4);margin:0;letter-spacing:inherit}
.lec2 .ot p{font-size:var(--t-sm);color:var(--body);margin-top:8px;line-height:var(--lh-body)}
.lec2 .ot .steps4{list-style:none;counter-reset:ot;margin-top:var(--s3);display:grid;gap:8px}
.lec2 .ot .steps4 li{display:grid;grid-template-columns:24px 1fr;gap:10px;align-items:baseline;font-size:var(--t-sm);color:var(--body);counter-increment:ot}
.lec2 .ot .steps4 li::before{content:counter(ot);font-family:var(--mono);font-size:var(--t-xs);color:var(--seal);font-weight:500}
.lec2 .grid2{display:grid;gap:var(--s4);grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}
.lec2 .buybox{background:var(--card);border-radius:var(--r-md);box-shadow:inset 0 0 0 2px var(--ink);padding:var(--s4)}
.lec2 .buybox .k{font-family:var(--mono);font-size:var(--t-xs);letter-spacing:var(--tr-label);color:var(--gray)}
.lec2 .buybox .price{font-family:var(--mono);font-size:var(--t-h3);font-weight:500;margin-top:8px;line-height:1.1;color:var(--seal)}
.lec2 .buybox .price small{display:block;font-family:var(--sans);font-size:var(--t-sm);color:var(--gray);margin-top:6px;font-weight:400}
.lec2 .buybox .inc{margin-top:var(--s3)}
.lec2 .buybox .inc li{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:var(--rule);font-size:var(--t-sm)}
.lec2 .buybox .inc li span:first-child{color:var(--gray)}
.lec2 .buybox .acts{margin-top:var(--s3)}
.lec2 .buybox .acts .btn{width:100%}
.lec2 .buybox .alt{margin-top:12px;font-size:var(--t-xs);color:var(--gray);line-height:1.6}
.lec2 .lgrp+.lgrp{margin-top:var(--s5)}
.lec2 .toc .row .m .badge.seal{margin-left:2px}
.lec2 .band{background:var(--ink);color:var(--paper);border-radius:var(--r-md);padding:var(--s5);display:flex;gap:var(--s4);align-items:center;justify-content:space-between;flex-wrap:wrap;margin:var(--s6) 0}
.lec2 .band h2{font-size:var(--t-h3)}
.lec2 .band p{color:rgba(var(--paper-rgb),.8);font-size:var(--t-sm);margin-top:6px}
.lec2 .band .btn{background:var(--paper);color:var(--ink)}
.lec2 .band .btn:hover{background:#fff}
.lec2 .band .btn.ghost{background:transparent;color:var(--paper);box-shadow:inset 0 0 0 1px rgba(var(--paper-rgb),.5)}
.lec2 .order{width:100%;height:auto;display:block;margin-top:var(--s3);color:var(--ink)}
.lec2 .order text{font-family:var(--sans);font-size:14px;font-weight:700;fill:var(--ink)}
.lec2 .order text.sub{font-size:11.5px;font-weight:400;fill:var(--gray)}
.lec2 .order text.k{font-family:var(--mono);font-size:11px;font-weight:500;fill:var(--seal)}
.lec2 .order .loop{stroke:var(--seal)}
.lec2 .anch{display:flex;gap:4px;border-bottom:var(--rule-strong);overflow-x:auto;position:sticky;top:var(--hd-h);background:var(--paper);z-index:4}
.lec2 .anch a{display:inline-flex;align-items:center;gap:8px;min-height:var(--tap);padding:0 var(--s3);font-size:var(--t-sm);font-weight:600;color:var(--gray);border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.lec2 .anch a b{font-family:var(--mono);font-weight:500;font-size:var(--t-xs);color:var(--gray)}
.lec2 .anch a[aria-current="true"]{color:var(--ink);border-bottom-color:var(--seal)}
.lec2 .anch a:hover{color:var(--ink)}
@media (max-width:900px){.lec2 .anch{top:var(--hd-h-sm)}.lec2 .anch a{padding:0 10px}}
.lec2 .anch a,.lec2 .anch a b{flex:0 0 auto}
@media (max-width:480px){.lec2 .anch{gap:2px}.lec2 .anch a{padding:0 8px}.lec2 .anch a.pl{gap:0}.lec2 .anch a.pl b{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}}   /* 4항목이 한 줄(350px)에 들게. 가격 항목 상품명은 시각만 숨김(접근성 이름 유지) */
@media (max-width:400px){.lec2 .anch{gap:0}.lec2 .anch a{font-size:12px}.lec2 .anch a b{font-size:10px}}
@media (max-width:340px){.lec2 .anch a{gap:0;padding:0 7px}.lec2 .anch a b{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}}   /* 320px 폭: 卷 표식을 시각만 숨겨 4항목 233px 가 280px 안에 든다(종전 317px, 37px 가로 스크롤). 접근성 이름은 유지 */
@media (max-width:820px){body.lec2 .fix a.cta{background:transparent;color:var(--gray)}}   /* 인강 면은 폴드 안 솔리드 행동 1개. 모바일 바 가이드북 채움 강등 */   /* 좁은 폭에서 항목이 수축해 卷 표식 b 폭이 0 이 되어 라벨 위에 겹쳐 그려짐 (Stage 3 실측 390: b 폭 0). 수축 금지, 넘치면 overflow-x 로 */
.lec2 .tocmore[hidden]{display:none}
.lec2 .tocfold{margin-top:var(--s2)}

@media (max-width:820px){.lec2 .grid2{grid-template-columns:1fr}}
'''

# ---------------- 강좌 목록 ----------------
CSS_LIST = CSS_COMMON + '''
.lecp .crs{border-top:var(--rule-strong);margin-top:var(--s4)}
.lecp .cr{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) auto;gap:var(--s2) var(--s4);padding:var(--s4) 0;border-bottom:var(--rule);align-items:center}
.lecp .cr[hidden]{display:none}
.lecp .cr .kn{font-family:var(--mono);font-size:var(--t-xs);letter-spacing:var(--tr-label);color:var(--gray)}
.lecp .cr h2{font-size:var(--t-h4);margin-top:4px}
.lecp .cr h2 a{display:inline-block;padding:3px 0}
.lecp .cr h2 a:hover{text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--hair)}
.lecp .cr .sub{font-size:var(--t-sm);color:var(--gray);margin-top:4px}
.lecp .cr .comp{font-size:var(--t-sm);color:var(--body);display:grid;gap:4px}
.lecp .cr .comp b{font-weight:700;color:var(--ink)}
.lecp .cr .comp .mono{font-family:var(--mono);font-size:var(--t-xs);color:var(--gray)}
.lecp .cr .comp .pub{color:var(--gray)}
.lecp .cr .acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.lecp .cr .pr{font-family:var(--mono);font-size:var(--t-sm);color:var(--seal);font-weight:500;white-space:nowrap}
.lecp .cr .pr small{display:block;font-family:var(--sans);color:var(--gray);font-weight:400;font-size:var(--t-xs);margin-top:2px}
@media (max-width:820px){.lecp .cr{grid-template-columns:1fr}.lecp .cr .acts{justify-content:flex-start}}
.lecp .chips{margin-top:var(--s4)}
.lecp .chips button[aria-pressed="true"]{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink);font-weight:700}   /* 상태 표식은 테두리, 솔리드 채움은 주 행동 하나만 (critic NNN3) */
.lecp .otgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s4);margin-top:var(--s4)}
@media (max-width:820px){.lecp .otgrid{grid-template-columns:1fr}}
.lecp .poster{position:relative;aspect-ratio:16/9;background:var(--ink);border-radius:var(--r-sm);overflow:hidden;box-shadow:inset 0 0 0 1px var(--hair);display:grid;place-items:center;color:var(--paper);text-align:center;padding:var(--s4)}
.lecp .poster .han{font-family:var(--serif);font-weight:300;letter-spacing:.08em;color:rgba(var(--paper-rgb),.7);font-size:var(--t-sm)}
.lecp .poster h3{font-size:var(--t-h3);margin-top:8px}
.lecp .poster p{font-size:var(--t-sm);color:rgba(var(--paper-rgb),.75);margin-top:8px}
.lecp .poster .badge{position:absolute;top:12px;left:12px}

.lecp .facts b{font-size:var(--t-h3)}
'''


def list_page(cs):
    rows = []
    for i, c in enumerate(cs, 1):
        k = c["k"]
        comp = (f'<span><b>{c["n"]}편</b> 구성, {E(fmt_total(c["sec"]))}</span>'
                + (f'<span>공통 {len(k["common"])}, 단위 강의 {len(k["unit"])}, 세트 해설 {len(k["passage"])}, 2026 기출 해설 {len(k["gichul"])}</span>' if c["code"] != "common" else '<span>다섯 단위 공통 절차 4편</span>')
                + (f'<span class="pub" data-lec-summary="unit={c["code"]}&amp;kind=passage" data-total="{len(c["k"]["passage"])}">{E(SNAP)} 스냅샷 기준 세트 해설 {len(k["passage"])}편</span>' if c["code"] != "common" else f'<span class="pub" data-lec-summary="kind=common" data-total="{len(k["common"])}">{E(SNAP)} 스냅샷 기준 {len(k["common"])}편</span>'))
        pr = (f'<span class="pr">{c["price"]:,}원<small>단위 전권, 인강 포함, 시청 3개월</small></span>' if c["code"] != "common" else f'<span class="pr">{c["price"]:,}원<small>인강만, 시청 3개월</small></span>')
        rows.append(f'''<article class="cr" data-univ="{c["univ"]}" data-track="{c["track"]}">
  <div><span class="kn">{E(c["spec"])}</span><h2><a href="lectures/{c["code"]}.html">{E(c["label"])}{"" if c["code"] == "common" else " 풀이법 인강"}</a></h2><p class="sub">{E(INTRO[c["code"]][0].split(". ")[1][:60] + "…") if c["code"] != "common" else "절차 시험, 개수 계약, 말하기 편집, 연습 시스템"}</p></div>
  <div class="comp">{comp}</div>
  <div class="acts">{pr}<a class="btn ghost sm" href="lectures/{c["code"]}.html#sample">맛보기</a><a class="btn sm" href="lectures/{c["code"]}.html">강좌 상세 <span class="ar" aria-hidden="true">→</span></a></div>
</article>''')
    _seen, total_sec = set(), 0   # 공통 4편은 강좌마다 실리므로 강의 id 기준으로 한 번만 센다 (편수, 시간 둘 다)
    for c in cs:
        for g in c["k"].values():
            for l in g:
                if l["id"] not in _seen:
                    _seen.add(l["id"]); total_sec += (l["duration_sec"] or 0)
    total_n = len(_seen)
    body = f'''<section class="phead">
  <div class="wrap">
   <div class="pagehead">
    <nav class="crumb rv" aria-label="위치"><a href="index.html">현학적 연구소</a><span aria-hidden="true">/</span><span>인강</span></nav>
    <span class="eyebrow rv">인강</span>
    <h1 class="rv">풀이법 인강</h1>
    <p class="lede rv">연세대, 고려대 제시문 면접의 풀이 절차를 강의로 잇습니다. 공통 풀이 4편, 단위 강의, 지문마다 한 편인 세트 해설, 2026 기출 해설 1편. 단위 전권 이용권에 포함되고 구매일부터 3개월 시청합니다.</p>
    <!-- aeo-slot -->
    <div class="acts rv"><a class="btn" href="#ot">인강 OT 와 맛보기 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="classroom.html">인강실</a></div>
   </div>
   <div class="facts rv">
    <div><b>{len(cs)}</b><span>강좌. 단위 5, 공통 1</span></div>
    <div><b>{total_n}</b><span>편 구성, {E(SNAP)} 기준</span></div>
    <div><b>{round(total_sec / 3600)}</b><span>시간, 세트 해설 포함</span></div>
    <div><b>3</b><span>개월 시청, 구매일부터</span></div>
   </div>
  </div>
</section>
<div class="wrap">
 <div class="sh rv"><div><h2 class="t">강좌 6</h2><p>단위 전권을 사면 그 단위 강좌 전부가 인강실에 들어갑니다. 공개 편수는 열람 시점 값입니다.</p></div></div>
 <div class="chips rv" role="group" aria-label="대학 필터" id="crsChips"><button type="button" data-f="" aria-pressed="true">전체</button><button type="button" data-f="yonsei" aria-pressed="false">연세대</button><button type="button" data-f="korea" aria-pressed="false">고려대</button><button type="button" data-f="common" aria-pressed="false">공통</button></div>
 <div class="crs rv" id="crs">
{chr(10).join(rows)}
 </div>
 <p class="note" style="margin-top:var(--s3)">지문 낱권 33,000원에는 그 세트의 해설 1편이 붙습니다. 연세대와 고려대 2026 기출 해설 강의는 이용권 경로가 정해지면 이 목록에 올립니다.</p>

 <section id="ot" style="margin-top:var(--s7)">
  <div class="sh rv"><div><h2 class="t">인강 OT 와 맛보기</h2><p>사기 전에 순서와 말하는 속도를 확인합니다. 맛보기는 로그인 없이, OT 영상은 로그인 뒤 무료로 봅니다.</p></div></div>
  <div class="otgrid rv">
   <div class="ot"><span class="eyebrow">인강 OT</span><h3>이 인강을 어떤 순서로 듣나</h3><p>5분 안내 강의입니다. 회원이면 이용권이 없어도 인강실에서 무료로 봅니다.</p>
    <ol class="steps4"><li>공통 풀이 4편을 먼저 다 듣습니다. 두 시간이 안 됩니다.</li><li>내 단위의 단위 강의를 응시 전에 듣습니다.</li><li>응시합니다. 첫 응시는 실전형 한 번, 첨삭을 받습니다.</li><li>그 지문의 세트 해설을 듣고 다시 응시합니다. 지문마다 반복이 30세트 사이클입니다.</li></ol>
    {order_svg()}
    <p style="margin-top:var(--s3);display:flex;gap:18px;flex-wrap:wrap"><a class="tlink" href="classroom.html">인강실에서 OT 보기 <span class="ar" aria-hidden="true">→</span></a><a class="tlink" href="assets/docs/lecture_ot_script.pdf">OT 대본 PDF <span class="ar" aria-hidden="true">→</span></a></p></div>
   <div class="sample"><video controls preload="none" poster="assets/video/sample_common.jpg" playsinline><source src="assets/video/sample_common.mp4" type="video/mp4"><track kind="captions" srclang="ko" label="한국어" default src="assets/video/sample_common.vtt"></video><p class="cap"><span class="badge seal">맛보기</span>공통 풀이 2편 개수 계약 발췌, {smp_len("common")}. 강좌마다 맛보기가 한 편씩 있습니다.</p></div>
  </div>
 </section>

 <div class="band rv"><div><h2>산 강의는 인강실에서</h2><p>보유 이용권의 강의가 단위별로 서고, 시청 위치는 계정에 저장되어 다른 기기에서도 이어집니다.</p></div><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="classroom.html">인강실 열기 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="library.html#lecdocs">인강 자료</a></div></div>

 <section style="padding-bottom:var(--s8)">
  <div class="sh rv"><div><h2 class="t">자주 묻는 것</h2></div></div>
  <div class="rv">
  <details class="faq"><summary>인강만 따로 살 수 있나요</summary><div class="a"><p>공통 풀이 인강 4편은 220,000원에 따로 삽니다. 단위 강의와 세트 해설은 지문 낱권이나 단위 전권에 붙어 오고, 인강만 파는 상품은 없습니다.</p></div></details>
  <details class="faq"><summary>시청 기간은 얼마인가요</summary><div class="a"><p>구매일부터 3개월입니다. 응시 이용 기간 12개월과 다릅니다. 기간 안에 공개되는 편은 추가 비용 없이 봅니다.</p></div></details>
  <details class="faq"><summary>어디서 보나요</summary><div class="a"><p>로그인한 뒤 인강실에서 봅니다. 배속 0.75배에서 2배, 목차 점프, 책갈피가 되고 시청 위치는 계정에 저장됩니다. 동시 재생은 세 기기까지입니다.</p></div></details>
  <details class="faq"><summary>공개 편수는 어디서 확인하나요</summary><div class="a"><p>강좌 상세와 인강실에 열람 시점 기준으로 적힙니다. 준비 중인 편은 공개되는 대로 순차 업로드됩니다.</p></div></details>
  </div>
 </section>
</div>'''
    script = '''<script>
(function(){ var chips=document.getElementById('crsChips'), rows=document.querySelectorAll('#crs .cr'); if(!chips) return;
  chips.addEventListener('click',function(e){ var b=e.target.closest('button[data-f]'); if(!b) return; var f=b.getAttribute('data-f');
    chips.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x===b ? 'true':'false'); });
    rows.forEach(function(r){ r.hidden = !!f && r.getAttribute('data-univ')!==f; }); });
  if (window.LEC) LEC.paintSummaries(document);
})();
</script>'''
    return HEAD.format(title="풀이법 인강, 현학적 연구소", p="", css=CSS_LIST, cls="lec2 lecp") + body + TAIL.format(p="", snap=SNAP.replace("-", ""), script=script)


# ---------------- 인강실 ----------------
CSS_ROOM = CSS_COMMON + '''
.lecr #crView>[data-for]{display:none}
.lecr #crView[data-state="guest"]>[data-for="guest"],.lecr #crView[data-state="member"]>[data-for="member"],.lecr #crView[data-state="none"]>[data-for="none"],.lecr #crView[data-state="down"]>[data-for="down"],.lecr #crView[data-state="loading"]>[data-for="loading"]{display:block}
.lecr .crcards{display:grid;grid-template-columns:1fr 1fr;gap:var(--s4);margin-top:var(--s4)}
@media (max-width:820px){.lecr .crcards{grid-template-columns:1fr}}
.lecr .cr{background:var(--card);border-radius:var(--r-md);box-shadow:inset 0 0 0 1px var(--hairs);padding:var(--s4);display:flex;flex-direction:column;gap:10px}
.lecr .cr.off{opacity:.6}
.lecr .cr.gich{grid-column:1/-1}
.lecr .cr.gich .toc{margin-top:4px}
.lecr .cr .ch{display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap}
.lecr .cr h2{font-size:var(--t-h4)}
.lecr .cr .cnt{font-family:var(--mono);font-size:var(--t-xs);color:var(--gray)}
.lecr .cr .cnt b{color:var(--ink);font-weight:500}
.lecr .cr .st{font-size:var(--t-sm);color:var(--body)}
.lecr .prog.big{display:block;height:6px;background:var(--mat);border-radius:var(--r-pill);overflow:hidden}
.lecr .prog.big i{display:block;height:100%;background:var(--seal)}
.lecr .cr .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:6px}
.lecr .toc{margin-top:var(--s3)}
.lecr .guest{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s4);margin-top:var(--s4)}
@media (max-width:820px){.lecr .guest{grid-template-columns:1fr}}
'''


def room_page():
    body = f'''<section class="phead tight">
  <div class="wrap">
   <div class="pagehead">
    <nav class="crumb" aria-label="위치"><a href="index.html">현학적 연구소</a><span aria-hidden="true">/</span><a href="lectures.html">인강</a><span aria-hidden="true">/</span><span>인강실</span></nav>
    <h1>인강실</h1>
    <p class="lede">보유 이용권의 강의가 단위별로 섭니다. 시청 위치는 계정에 저장되어 다른 기기에서도 이어집니다. 공개 편수는 열람 시점 값입니다.</p>
   </div>
  </div>
</section>
<div class="wrap" style="padding-bottom:var(--s8)">
 <div id="crView" data-state="loading" aria-live="polite">
  <div data-for="loading"><p class="note">불러오는 중입니다.</p></div>
  <noscript><div class="ot"><span class="eyebrow">스크립트 필요</span><h2>인강실은 스크립트가 켜진 브라우저에서 열립니다</h2><p>로그인 상태와 시청 기록을 불러오려면 JavaScript 가 필요합니다. 강좌 소개와 맛보기는 스크립트 없이 봅니다.</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:var(--s3)"><a class="btn" href="login.html?next=classroom.html">로그인 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="lectures.html">강좌 목록</a></div></div></noscript>
  <div data-for="guest">
   <div class="ot"><span class="eyebrow">로그인 필요</span><h2>인강실은 로그인한 뒤 열립니다</h2><p>산 이용권의 강의와 마지막으로 본 자리를 여기에서 엽니다. 계정이 없으면 먼저 가입하고, 강의를 아직 고르는 중이면 강좌 목록을 보세요.</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:var(--s3)"><a class="btn" href="login.html?next=classroom.html">로그인 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="join.html">가입</a><a class="btn ghost" href="lectures.html">강좌 목록</a></div></div>
   <div class="guest">
    <div class="sample"><video controls preload="none" poster="assets/video/sample_common.jpg" playsinline><source src="assets/video/sample_common.mp4" type="video/mp4"><track kind="captions" srclang="ko" label="한국어" default src="assets/video/sample_common.vtt"></video><p class="cap"><span class="badge seal">맛보기</span>공통 풀이 2편 개수 계약 발췌, {smp_len("common")}</p></div>
    <div class="ot"><span class="eyebrow">인강 OT</span><h2>이 인강을 어떤 순서로 듣나</h2><p>공통 풀이 4편을 먼저, 단위 강의는 응시 전에, 세트 해설은 응시한 지문부터. 5분 안내 영상은 로그인하면 회원 무료 0강으로 목록 맨 위에 있습니다.</p>{order_svg()}<p style="margin-top:var(--s2)"><a class="tlink" href="assets/docs/lecture_ot_script.pdf">OT 대본 PDF <span class="ar" aria-hidden="true">→</span></a></p></div>
   </div>
  </div>
  <div data-for="member">
   <div class="sh"><div><h2 class="t">수강 중인 강좌</h2><p>완료는 끝까지 본 편의 수, 진행 막대는 공개 편 대비 완료 비율입니다.</p></div><a class="tlink" href="lecture.html">전체 목록으로 <span class="ar" aria-hidden="true">→</span></a></div>
   <div class="crcards" id="crCards"></div>
   <div class="sh" style="margin-top:var(--s6)"><div><h2 class="t">최근 시청</h2><p>마지막으로 본 자리부터 다시 엽니다.</p></div></div>
   <div class="toc" id="crRecent" role="list"><p class="note">불러오는 중입니다.</p></div>
   <div class="band"><div><h2>목차표와 OT 대본</h2><p>강좌별 강의 목차표와 OT 대본은 자료실에 있습니다.</p></div><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="library.html#lecdocs">인강 자료 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="lectures.html">강좌 목록</a></div></div>
  </div>
  <div data-for="none">
   <div class="ot"><span class="eyebrow">보유 이용권 없음</span><h2>아직 들어온 강의가 없습니다</h2><p>단위 전권이나 지문 낱권을 사면 그 강의가 여기에 섭니다. 공통 풀이 인강은 따로 살 수 있습니다.</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:var(--s3)"><a class="btn" href="lectures.html">강좌 목록 <span class="ar" aria-hidden="true">→</span></a><a class="btn ghost" href="studio.html#plans">이용권 세 가지</a></div></div>
  </div>
  <div data-for="down"><div class="ot"><span class="eyebrow">상태 미상</span><h2>강의 목록을 지금 불러올 수 없습니다</h2><p>잠시 후 다시 열어 주세요. 권리가 사라진 것이 아닙니다.</p></div></div>
 </div>
</div>'''
    script = '<script>(function(){ var v=document.getElementById("crView"); if(!window.LEC){ v.setAttribute("data-state","down"); return; } LEC.classroom(v); setTimeout(function(){ if(v.getAttribute("data-state")==="loading") v.setAttribute("data-state","down"); }, 12000); })();</script>'
    return HEAD.format(title="인강실, 현학적 연구소", p="", css=CSS_ROOM, cls="lec2 lecr") + body + TAIL.format(p="", snap=SNAP.replace("-", ""), script=script)


# ---------------- 강좌 상세 ----------------
CSS_DETAIL = CSS_COMMON + '''
.lecd .hero2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:var(--s5);padding:var(--s4) 0 var(--s5);align-items:start}
.lecd .hero2 h1{font-size:var(--t-h1);margin-top:6px}
.lecd .hero2 .meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:var(--t-sm);color:var(--gray);margin-top:10px}
.lecd .hero2 .meta .mono{font-family:var(--mono);font-size:var(--t-xs)}
.lecd .hero2 .lede{margin-top:var(--s3);font-size:var(--t-base);color:var(--body);line-height:var(--lh-body)}
.lecd .hero2 .chips{margin-top:var(--s3)}
@media (max-width:820px){.lecd .hero2{grid-template-columns:1fr}}
.lecd .page{padding:var(--s6) 0 var(--s6)}
@media (min-width:1000px){.lecd .page{padding:var(--s6) 0 var(--s7) 0}}
.lecd .page{scroll-margin-top:calc(var(--hd-h) + 56px)}.lecd #plan{scroll-margin-top:calc(var(--hd-h) + 8px)}
@media (max-width:900px){.lecd .page{scroll-margin-top:calc(var(--hd-h-sm) + 56px)}.lecd #plan{scroll-margin-top:calc(var(--hd-h-sm) + 8px)}}
.lecd .steps.three{grid-template-columns:1fr;gap:0;border-top:var(--rule-strong)}
.lecd .steps.three .step{display:grid;grid-template-columns:200px minmax(0,1fr);gap:6px var(--s4);background:none;box-shadow:none;border-radius:0;padding:var(--s3) 0;border-bottom:1px solid var(--hairs)}
.lecd .steps.three .step .no{grid-row:span 2;align-self:start}.lecd .steps.three .step .no::after{display:none}
.lecd .steps.three .step h3{margin-top:0}.lecd .steps.three .step p{margin-top:0}
.lec2 .lgrp .gh h3{font-size:var(--t-h4)}
@media (max-width:820px){.lecd .steps.three .step{grid-template-columns:1fr}.lecd .steps.three .step .no{grid-row:auto}}
.lecd .sticky{position:sticky;bottom:0;z-index:5;background:rgba(var(--paper-rgb),.96);backdrop-filter:blur(10px);border-top:var(--rule-strong);padding:10px 0;display:none}
.lecd .sticky .in{display:flex;justify-content:space-between;align-items:center;gap:12px}
.lecd .sticky .pr{font-family:var(--mono);font-weight:500;color:var(--seal)}
@media (max-width:820px){.lecd .sticky{display:block;position:fixed;left:0;right:0;bottom:calc(72px + env(safe-area-inset-bottom))}.lecd .sticky.off{display:none}body.lecd footer .wrap{padding-bottom:64px}}   /* 푸터까지 내려도 구매 경로가 남는다 (critic NNN4). 푸터 끝 줄은 바 높이만큼 띄운다 */
'''


def toc_rows(ls, sample_id, label_n=None, start=1, strip=None, noseq=False):
    out = []
    for i, l in enumerate(ls, start):
        n = f"{i:0>2}" if noseq else f"{l['seq'] or i:0>2}"   # D1 seq 그대로 (뷰어·인강실·맛보기 문구와 같은 번호. 결번은 인문/자연 트랙 분기의 사실). 기출 그룹은 단위 밖 순번이라 안 쓴다
        t, s2 = l["title"], l.get("subtitle") or ""
        if strip and l["kind"] == "passage" and s2:   # 세트 해설은 주제를 표제로, 정형구(단위명 NN번 세트 해설 강의)는 보조행으로
            t, s2 = s2, l["title"].replace(strip, "", 1)
        sub = f'<span class="m"><span>{E(s2)}</span></span>' if s2 else ""
        sample = l["id"] == sample_id
        m = f'<span>{mins(l["duration_sec"])}분</span>' + ('<span class="badge seal">맛보기</span>' if sample else "")
        a = f'<a class="btn ghost sm" href="#sample">맛보기</a>' if sample else '<span class="badge line">이용권</span>'
        out.append(f'<div class="row" role="listitem" data-lec="{E(l["id"])}" data-seq="{l["seq"] or ""}"><span class="n">{n}</span><span><span class="t">{E(t)}</span>{sub}<span class="m">{m}</span></span><span class="a">{a}</span></div>')
    return "".join(out)


def group(title, cnt_html, rows, more="", after=""):
    return f'<section class="lgrp"><div class="gh"><h3>{title}</h3><span class="cnt">{cnt_html}</span>{("<span class=\"more\">" + more + "</span>") if more else ""}</div><div class="toc" role="list">{rows}</div>{after}</section>'


def detail_page(c, cs):
    code, k = c["code"], c["k"]
    p = "../"
    is_common = code == "common"
    label = c["label"] + ("" if is_common else " 풀이법 인강")
    sid = SAMPLE_ID[code]
    smp_cap, _ = SAMPLE[code]
    intro = "".join(f"<p>{E(x)}</p>" for x in INTRO[code])
    # 구매 상자
    if not is_common:
        buy = f'''<div class="buybox" id="plan"><p class="k">단위 전권 이용권</p><p class="price">{c["price"]:,}원<small>단위 전권, 응시 12개월, 인강 3개월</small></p>
<ul class="inc"><li><span>이 인강 {c["n"]}편</span><span>전부 포함</span></li><li><span>응시</span><span>지문 {c["set_count"]}편, 지문마다 5회</span></li><li><span>첨삭</span><span>전사, 진단, 재구성</span></li></ul>
<div class="acts"><button type="button" class="btn" data-cart-sku="{E(c["sku"])}" data-cart-title="{E(c["label"])} 전권 이용권" data-cart-price="{c["price"]}">단위 전권 담기 <span class="ar" aria-hidden="true">→</span></button></div>
<p class="cartmsg note" role="status" aria-live="polite"></p>
<p class="alt">지문 낱권 {c["single"]:,}원에는 그 세트 해설 1편이 붙습니다. 공통 풀이 4편만 들으려면 <a href="common.html">220,000원</a>.</p></div>'''
    else:
        buy = f'''<div class="buybox" id="plan"><p class="k">공통 풀이 이용권</p><p class="price">{c["price"]:,}원<small>인강만, 구매일부터 3개월</small></p>
<ul class="inc"><li><span>내용</span><span>공통 풀이 4편</span></li><li><span>시청</span><span>인강실, 배속과 책갈피</span></li><li><span>단위 전권</span><span>이미 포함</span></li></ul>
<div class="acts"><button type="button" class="btn" data-cart-sku="lecture-common" data-cart-title="공통 풀이 인강" data-cart-price="220000">담기 <span class="ar" aria-hidden="true">→</span></button></div>
<p class="cartmsg note" role="status" aria-live="polite"></p>
<p class="alt">응시까지 하려면 단위 전권 495,000원에 이 4편이 들어 있습니다. <a href="../studio.html#plans">이용권 세 가지</a></p></div>'''
    # 목차
    groups = []
    if is_common:
        groups.append(group("공통 풀이", f"구성 <b>{len(k['common'])}</b>", toc_rows(k["common"], sid)))
    else:
        groups.append(group("공통 풀이", f"구성 <b>{len(k['common'])}</b>, 다섯 단위 공통", toc_rows(k["common"], sid), f'<a class="tlink" href="common.html">공통 풀이 인강 면</a>'))
        _seqs = [l["seq"] for l in k["unit"] if l.get("seq")]
        _gap = bool(_seqs) and (max(_seqs) - min(_seqs) + 1) != len(_seqs)   # 결번 = 인문/자연 트랙 분기(같은 번호 체계에서 다른 트랙 편)
        groups.append(group("단위 강의", f"구성 <b>{len(k['unit'])}</b>, {E(c['label'])}만" + (", 번호는 트랙 공통 순번이라 다른 트랙 편은 비어 있습니다" if _gap else ""), toc_rows(k["unit"], sid)))
        if k["gichul"]:
            groups.append(group("2026 기출 해설", f'구성 <b>{len(k["gichul"])}</b>, {E(c["label"])} 2026 기출 지문의 실전 해설. 단위 전권에 포함', toc_rows(k["gichul"], sid, noseq=True)))
        head, rest = k["passage"][:6], k["passage"][6:]
        rows = toc_rows(head, sid, strip=c["label"] + " ") + (f'<div class="tocmore" id="tocMore" role="presentation">{toc_rows(rest, sid, start=len(head) + 1, strip=c["label"] + " ")}</div>' if rest else "")
        after = (f'<p class="tocfold"><button type="button" class="tlink" data-tocmore aria-expanded="false" aria-controls="tocMore">세트 해설 {len(k["passage"])}편 전체 보기 <span class="ar" aria-hidden="true">→</span></button></p>' if rest else "")
        groups.append(group("세트 해설", f'구성 <b>{len(k["passage"])}</b>, 지문마다 한 편. <span data-lec-summary="unit={code}&amp;kind=passage" data-total="{len(c["k"]["passage"])}">{E(SNAP)} 스냅샷 기준 {len(k["passage"])}편</span>', rows, f'<a class="tlink" href="../studio.html?unit={code}">지문 목록과 담기</a>', after))
    tracks = ('' if is_common else f'''<div class="steps three"><div class="step"><span class="no">공통 풀이 {len(k["common"])}편</span><h3>절차부터</h3><p>지식 시험이 아니라 절차 시험이라는 전제에서 결론 선언과 개수 계약, 말하기 편집을 세웁니다.</p></div><div class="step"><span class="no">단위 강의 {len(k["unit"])}편</span><h3>{E(c["label"])}의 판</h3><p>{E(c["spec"])}. 이 단위에만 있는 규칙을 순서대로 잡습니다.</p></div><div class="step"><span class="no">세트 해설 {len(k["passage"])}편</span><h3>지문마다 한 편</h3><p>응시한 지문의 풀이를 같은 절차로 되짚습니다. 응시 뒤에 듣는 편이 가장 오래 남습니다.</p></div></div>''')
    meta = (f'<span>{c["n"]}편</span><span>{E(fmt_total(c["sec"]))}</span><span>시청 3개월</span>'
            + ('' if is_common else f'<span data-lec-summary="unit={code}&amp;kind=passage" data-total="{len(c["k"]["passage"])}">세트 해설 {len(k["passage"])}편, {E(SNAP)} 스냅샷 기준</span>'))
    others = "".join(f'<a class="btn ghost sm" href="{o["code"]}.html">{E(o["label"])}</a>' for o in cs if o["code"] != code)
    body = f'''<div class="wrap">
 <nav class="crumb" aria-label="위치" style="padding-top:var(--s3)"><a href="../index.html">현학적 연구소</a><span aria-hidden="true">/</span><a href="../lectures.html">인강</a><span aria-hidden="true">/</span><span>{E(c["label"])}</span></nav>
 <div class="hero2">
  <div class="hcopy"><span class="eyebrow">{"공통 풀이" if is_common else "풀이법 인강"}</span><h1>{E(label)}</h1><p class="meta">{meta}</p><p class="lede">{E(INTRO[code][0].split(". ")[0])}.</p>{buy}</div>
  <div id="sample" class="hmedia"><div class="sample"><video controls preload="none" poster="../assets/video/sample_{code}.jpg" playsinline><source src="../assets/video/sample_{code}.mp4" type="video/mp4"><track kind="captions" srclang="ko" label="한국어" default src="../assets/video/sample_{code}.vtt"></video><p class="cap"><span class="badge seal">맛보기</span>{E(smp_cap)}, {smp_len(code)}. 로그인 없이 봅니다.</p></div>
   <div class="ot" style="margin-top:var(--s3)"><span class="eyebrow">인강 OT</span><h2>이 인강을 어떤 순서로 듣나</h2><p>공통 풀이 4편을 먼저, 단위 강의는 응시 전에, 세트 해설은 응시한 지문부터. 5분 안내 영상은 로그인 뒤 인강실에서 무료로 봅니다.</p>{order_svg()}<p style="margin-top:var(--s2);display:flex;gap:18px;flex-wrap:wrap"><a class="tlink" href="../classroom.html">인강실에서 OT 보기 <span class="ar" aria-hidden="true">→</span></a><a class="tlink" href="../assets/docs/lecture_ot_script.pdf">OT 대본 PDF <span class="ar" aria-hidden="true">→</span></a></p></div></div>
 </div>
 <!-- aeo-slot -->
</div>
<div class="wrap">
 <nav class="anch" aria-label="지면 차례"><a href="#toc" aria-current="true"><b>卷一</b>강의 목차</a><a href="#intro"><b>卷二</b>이 인강은</a><a href="#faq"><b>卷三</b>묻는 것</a><a href="#plan" class="pl"><b>{"공통 풀이" if is_common else "단위 전권"}</b>{c["price"]:,}원</a></nav>
 <section class="page" id="toc"><p class="folio"><b>卷一</b><span>강의 목차</span><span class="r">1</span></p><h2 class="t">{c["n"]}편, {"한 묶음" if is_common else ("네 묶음" if k["gichul"] else "세 묶음")}</h2><p class="note">공개 편수와 시청 버튼은 열람 시점 값입니다. 로그인하면 이용권 범위에서 시청과 이어보기 버튼이 섭니다.</p>{"".join(groups)}</section>
 <section class="page" id="intro"><p class="folio"><b>卷二</b><span>이 인강은</span><span class="r">2</span></p><h2 class="t">{"절차 네 문장" if is_common else E(c["spec"]) + "을 절차로 만든다"}</h2><div style="margin-top:var(--s4);max-width:var(--measure)">{intro}</div>{("<div style='margin-top:var(--s5)'>" + tracks + "</div>") if tracks else ""}</section>
 <section class="page" id="faq"><p class="folio"><b>卷三</b><span>묻는 것</span><span class="r">3</span></p><h2 class="t">자주 묻는 것</h2><div style="margin-top:var(--s4)">
  <details class="faq"><summary>인강만 따로 살 수 있나요</summary><div class="a"><p>공통 풀이 인강 4편은 220,000원에 따로 삽니다. 단위 강의와 세트 해설은 지문 낱권이나 단위 전권에 붙어 오고, 인강만 파는 상품은 없습니다.</p></div></details>
  <details class="faq"><summary>시청 기간은 얼마인가요</summary><div class="a"><p>구매일부터 3개월입니다. 응시 이용 기간 12개월과 다릅니다. 기간 안에 공개되는 편은 추가 비용 없이 봅니다.</p></div></details>
  <details class="faq"><summary>어디서 보나요</summary><div class="a"><p>로그인한 뒤 인강실에서 봅니다. 배속 0.75배에서 2배, 목차 점프, 책갈피가 되고 시청 위치는 계정에 저장됩니다. 동시 재생은 세 기기까지입니다.</p></div></details>
 </div>
 <div style="margin-top:var(--s6)"><span class="eyebrow">다른 강좌</span><div style="display:flex;gap:8px;flex-wrap:wrap">{others}</div></div></section>
</div>
<div class="sticky"><div class="wrap in"><span class="pr">{c["price"]:,}원</span><a class="btn sm" href="#plan">{"담기" if is_common else "단위 전권 담기"}</a></div></div>'''
    script = f'''<script>
(function(){{ if(!window.LEC) return; var S=["{E(sid)}"]; LEC.paintSummaries(document);
  var code={"null" if is_common else '"' + code + '"'};
  Promise.all([code?LEC.pub(code):Promise.resolve(null), LEC.mine(), code?LEC.pubGichul(code):Promise.resolve(null)]).then(function(r){{ var pubList=r[0], mineList=r[1]; if(pubList&&r[2]) pubList=pubList.concat(r[2]);
    if(!code){{ LEC.paintRows(document, null, mineList, S); return; }}
    LEC.paintRows(document, pubList, mineList, S); }});
  var more=document.getElementById('tocMore'), fb=document.querySelector('[data-tocmore]');
  if(more&&fb){{ more.hidden=true; fb.addEventListener('click',function(){{ var open=more.hidden; more.hidden=!open; fb.setAttribute('aria-expanded', open?'true':'false'); fb.firstChild.textContent = open ? '세트 해설 접기 ' : fb.getAttribute('data-label'); }}); fb.setAttribute('data-label', fb.firstChild.textContent); }}
  var links=[].slice.call(document.querySelectorAll('.anch a[href^="#"]')).filter(function(a){{ return a.getAttribute('href')!=='#plan'; }}), secs=links.map(function(a){{ return document.querySelector(a.getAttribute('href')); }}), bar=document.querySelector('.anch');
  var hold=0;
  function setCur(cur){{ links.forEach(function(a,i){{ if(i===cur) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); }}); }}
  // 착지 임계: 절 top 은 scroll-margin(바 아래 56px) 에 서므로 바 아래 16px 까지를 현재 절로 본다. 클릭 뒤 0.8초는 클릭한 절로 고정한다 (critic NNN2)
  function spy(){{ if(Date.now()<hold) return; var off=(bar?bar.getBoundingClientRect().bottom:120)+16, cur=0; secs.forEach(function(s,i){{ if(s&&s.getBoundingClientRect().top<=off) cur=i; }}); setCur(cur); }}
  links.forEach(function(a,i){{ a.addEventListener('click', function(){{ setCur(i); hold=Date.now()+800; setTimeout(function(){{ hold=0; spy(); }}, 850); }}); }});
  window.addEventListener('scroll', spy, {{passive:true}}); spy();
  var plan=document.getElementById('plan'), stk=document.querySelector('.sticky');
  if(plan&&stk&&'IntersectionObserver' in window){{ new IntersectionObserver(function(es){{ stk.classList.toggle('off', es[0].isIntersecting); }}, {{threshold:0.2}}).observe(plan); }}
}})();
</script>'''
    return HEAD.format(title=f"{label}, 현학적 연구소", p=p, css=CSS_DETAIL, cls="lec2 lecd") + body + TAIL.format(p=p, snap=SNAP.replace("-", ""), script=script)


def write(rel, s):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
    if old != s:
        open(path, "w", encoding="utf-8").write(s)
    return old != s


def main():
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    cs = courses()
    changed = 0
    if not only or "list" in only:
        changed += write("lectures.html", list_page(cs))
    if not only or "classroom" in only:
        changed += write("classroom.html", room_page())
    if not only or "detail" in only:
        for c in cs:
            changed += write(f"lectures/{c['code']}.html", detail_page(c, cs))
    print(f"build_lectures: 강좌 {len(cs)}, 스냅샷 {SNAP}, 변경 {changed}")


if __name__ == "__main__":
    main()
