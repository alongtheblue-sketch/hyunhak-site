#!/usr/bin/env python3
"""현학적 연구소, 프로필 + 전면 카피 워시 프리뷰 빌더 (초안, 라이브 무접촉)
- 입력: ../../index.html, ../../about.html (라이브 워킹트리, 읽기만)
- 출력: out/index_v3.html, out/about_v3_{A,B,C}.html, out/profile_board.html, COPY_DECK.md
- 치환은 전부 "원문 정확 일치 1회" 검증. 0회/2회+ = 즉시 실패 (조용한 누락 차단).
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

fails = []

def rep(s, old, new, label):
    n = s.count(old)
    if n != 1:
        fails.append(f"[{label}] 일치 {n}회 (1회 필요): {old[:60]}…")
        return s
    return s.replace(old, new)

def ins_before(s, anchor, block, label):
    n = s.count(anchor)
    if n != 1:
        fails.append(f"[{label}] 앵커 일치 {n}회: {anchor[:60]}…")
        return s
    return s.replace(anchor, block + anchor)

def ins_after(s, anchor, block, label):
    n = s.count(anchor)
    if n != 1:
        fails.append(f"[{label}] 앵커 일치 {n}회: {anchor[:60]}…")
        return s
    return s.replace(anchor, anchor + block)

# ============================================================
# 카피 원장 (deck 자동 생성용): (페이지, 자리, before, after)
# ============================================================
DECK = []

def R(s, page, spot, old, new):
    DECK.append((page, spot, old, new))
    return rep(s, old, new, f"{page}:{spot}")

# ---------- 프로필 사실 원장 (건우 제공 2건 + 사이트 실측치만) ----------
# 건우 제공: 입시 컨설턴트 13년차 / 고려대학교 영어교육과 졸업 / 표기명 현건우(푸터 사업자 정보 기공개)
# 실측: 38권 · 1,389면(catalog) · 질문 4,766 · 전환 규칙 1,790 · 스튜디오 8단위 × 지문 30편

MAKER_A = '''    <div class="maker a rv">
      <div>
        <span class="eyebrow">만든 사람</span>
        <h3 class="nm">현학자 <small>玄學者</small></h3>
        <dl>
          <dt>학력</dt><dd>고려대학교 영어교육과 졸</dd>
          <dt>현재</dt><dd><b>대치OOO학원 부원장</b>, 입시 컨설턴트 13년차</dd>
          <dt>경력</dt><dd><ul class="career">
            <li>데오럭스 교육 컨설팅 그룹 파트너 컨설턴트</li>
            <li>AI 기반 입시 컨설팅 솔루션 '학쫑' 서비스 교육/개발 리더</li>
            <li>현직 영어 정교사 대상 교수법 및 문제 출제법 특강 강사</li>
            <li>현직 정교사 대상 세특 작성법 연수 강사</li>
            <li>대치우리학원 출강 및 EBS 연계 모의고사 출제위원</li>
            <li>목동 돌풍학원 고등부 수능 영어 출강</li>
            <li>노량진 대성학원 EBS 연계문제 및 고난도 문제 출제위원</li>
            <li>자율형사립고 경희고등학교 1학년 의대반 학업/진학 멘토링</li>
          </ul></dd>
          <dt>만든 것</dt><dd><span class="tn">학교별 면접 가이드북 38권 1,389면, 수록 질문 4,766개, 생기부 전환 규칙 1,790개</span></dd>
        </dl>
        <p class="colo"><span class="han">玄學的 硏究所</span> 현학적 연구소, 2026</p>
      </div>
      <div class="side" aria-hidden="true">
        <div class="num">13<em>년차</em></div>
        <div class="seal">玄</div>
      </div>
    </div>'''

MAKER_B = '''    <div class="maker b rv">
      <div class="lockup" aria-hidden="true">
        <svg viewBox="0 0 100 100"><g fill="currentColor"><path d="M43 12 L57 12 L59 26 L41 26 Z"/><rect x="4" y="26" width="92" height="6" rx="3"/><path fill-rule="evenodd" d="M50 43 C64 43 72 56 92 88 L8 88 C28 56 36 43 50 43 Z M50 62 L31 57 L31 74 L50 79 L69 74 L69 57 Z"/></g></svg>
        <b>현학적 연구소</b>
      </div>
      <div class="who">
        <span class="eyebrow">만든 사람</span>
        <h3 class="nm">현학자 <small>玄學者</small></h3>
        <div class="rows">
          <span>고려대학교 영어교육과 졸</span>
          <span><b>현) 대치OOO학원 부원장</b>, 입시 컨설턴트 13년차</span>
          <span class="tn">가이드북 38권 1,389면 편집, 수록 질문 4,766개 선별</span>
        </div>
      </div>
      <ul class="career" aria-label="경력">
        <li>전) 데오럭스 교육 컨설팅 그룹 파트너 컨설턴트</li>
        <li>전) AI 기반 입시 컨설팅 솔루션 '학쫑' 서비스 교육/개발 리더</li>
        <li>전) 현직 영어 정교사 대상 교수법 및 문제 출제법 특강 강사</li>
        <li>전) 현직 정교사 대상 세특 작성법 연수 강사</li>
        <li>전) 대치우리학원 출강 및 EBS 연계 모의고사 출제위원</li>
        <li>전) 목동 돌풍학원 고등부 수능 영어 출강</li>
        <li>전) 노량진 대성학원 EBS 연계문제 및 고난도 문제 출제위원</li>
        <li>전) 자율형사립고 경희고등학교 1학년 의대반 학업/진학 멘토링</li>
      </ul>
      <div class="vert" aria-hidden="true">玄學的 硏究所</div>
    </div>'''

MAKER_C = '''    <div class="maker c rv">
      <span class="eyebrow">만든 사람</span>
      <h3 class="nm">현학자 <small>玄學者</small></h3>
      <div class="ruler" aria-hidden="true"><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i><i>10</i><i>11</i><i>12</i><i>13</i></div>
      <div class="cap13"><b>13년차, 입시 컨설턴트</b></div>
      <div class="cols two">
        <div>
          <h4>학력</h4><p>고려대학교 영어교육과 졸</p>
          <h4>현재</h4><p>대치OOO학원 부원장</p>
          <h4>만든 것</h4><p>1,389면, 질문 4,766개, 생기부 전환 규칙 1,790개</p>
        </div>
        <div>
          <h4>경력</h4>
          <ul class="career">
          <li>전) 데오럭스 교육 컨설팅 그룹 파트너 컨설턴트</li>
          <li>전) AI 기반 입시 컨설팅 솔루션 '학쫑' 서비스 교육/개발 리더</li>
          <li>전) 현직 영어 정교사 대상 교수법 및 문제 출제법 특강 강사</li>
          <li>전) 현직 정교사 대상 세특 작성법 연수 강사</li>
          <li>전) 대치우리학원 출강 및 EBS 연계 모의고사 출제위원</li>
          <li>전) 목동 돌풍학원 고등부 수능 영어 출강</li>
          <li>전) 노량진 대성학원 EBS 연계문제 및 고난도 문제 출제위원</li>
          <li>전) 자율형사립고 경희고등학교 1학년 의대반 학업/진학 멘토링</li>
          </ul>
        </div>
      </div>
    </div>'''

MAKER_SECTION = '''
<section class="sec tight" id="maker">
  <div class="wrap">
    <div class="sh rv"><div><h2>읽은 사람</h2><p>이 자료를 만든 사람</p></div></div>
{MAKER}
  </div>
</section>
'''

HOME_BAND = '''
<section class="sec tight" id="maker">
  <div class="wrap">
    <div class="makerband rv">
      <div class="num" aria-hidden="true">13<em>년차</em></div>
      <p><b>입시 컨설턴트 13년차, 고려대학교 영어교육과 졸업.</b> 38개 대학의 공개 자료에서 고른 질문 4,766개와 가이드북 38권. 편집 기준은 전권 동일.</p>
      <a class="tlink" href="about.html">만든 사람 보기</a>
    </div>
  </div>
</section>
'''

def head_patch(s, page_css_rel="profile.css"):
    # base 태그(라이브 자산 상대참조) + profile.css
    s = ins_after(s, '<meta charset="utf-8">', '\n<base href="../../../">', "head:base")
    s = ins_after(s, '<link rel="stylesheet" href="assets/base.css">',
                  f'\n<link rel="stylesheet" href="_design/profile_copywash_20260831/{page_css_rel}">', "head:profile.css")
    return s

# ============================================================
# INDEX
# ============================================================
idx = open(os.path.join(SITE, "index.html"), encoding="utf-8").read()
idx = head_patch(idx)

idx = R(idx, "index", "H1",
  '<h1 class="rv">면접에서 나올 질문은 이미 공개된 자료 안에</h1>',
  '<h1 class="rv">대학이 먼저 공개한 면접 질문 4,766개</h1>')

idx = R(idx, "index", "히어로 서브",
  '<p class="sub rv">모집요강과 합격 후기를 38개 대학별 가이드북으로 재구성했습니다. 연세대와 고려대 제시문 면접은 말하는 장면을 촬영해 첨삭합니다.</p>',
  '<p class="sub rv">38개 대학의 모집요강과 합격 후기에서 입시 컨설턴트 13년차가 골라 엮은 학교별 가이드북 38권. 연세대와 고려대 제시문 면접은 말하는 장면을 촬영해 첨삭.</p>')

idx = ins_after(idx,
  '<a class="tlink" href="studio.html">연세, 고려 제시문 면접 스튜디오</a>\n      </div>',
  '\n      <p class="proof rv"><span>만든 사람 <b>입시 컨설턴트 13년차</b>, 고려대학교 영어교육과 졸</span><span><b>38권</b> 1,389면</span><span>수록 질문 <b>4,766</b></span></p>',
  "index:증거 1줄")
DECK.append(("index", "증거 1줄(신설)", "(없음)", "만든 사람 입시 컨설턴트 13년차, 고려대학교 영어교육과 | 38권 1,389면 | 수록 질문 4,766"))

idx = R(idx, "index", "대학별 찾기 lede",
  '<p class="lede">지원 대학의 가이드북과 스튜디오를 한 자리에서.</p>',
  '<p class="lede">지원 대학 이름 하나로 가이드북과 스튜디오까지.</p>')

idx = R(idx, "index", "상품 3종 부제",
  '<p>가이드북, 스튜디오, 봉투 모의고사. 이 세 가지.</p>',
  '<p>학교별 가이드북, 제시문 스튜디오, 영어 봉투 모의고사. 필요한 것만 세 가지.</p>')

idx = R(idx, "index", "가이드북 카드 본문",
  '<p>전형별 면접 제원과 유형별 기출, 예상 질문을 담았습니다. 보안 리더로 열람하실 수 있습니다.</p>',
  '<p>지원 대학 한 곳의 면접 준비를 한 권에. 구매 후 보안 리더로 열람.</p>')

idx = R(idx, "index", "가이드북 카드 spec 2행",
  '<li>실제로 나온 질문, 생기부에서 질문 뽑는 규칙</li>',
  '<li>실제로 나온 질문과 예상 질문, 문항마다 출처 표기</li>')

idx = R(idx, "index", "가이드북 카드 spec 3행",
  '<li>기기 제한 없는 보안 리더 열람</li>',
  '<li>생기부에서 질문 뽑는 전환 규칙 1,790개(38권 합계)</li>')

idx = R(idx, "index", "스튜디오 카드 본문",
  '<p>연세대, 고려대. 지문 1편에 5회 응시, 회차마다 전사와 진단.</p>',
  '<p>연세대, 고려대 기출 제시문으로 촬영 응시. 지문 1편에 5회, 회차마다 첨삭 세 단.</p>')

idx = R(idx, "index", "스튜디오 카드 spec 3행",
  '<li>연세대 신촌과 미래캠퍼스, 고려대 계열적합 지문</li>',
  '<li>8개 단위, 단위마다 지문 30편(연세 신촌과 미래캠, 고려 계열적합)</li>')

idx = R(idx, "index", "근거와 규정 부제",
  '<div><h2>근거와 규정</h2><p>추정 문항은 싣지 않았습니다. 규정은 약관 그대로 적용됩니다.</p></div>',
  '<div><h2>근거와 규정</h2><p>추정 문항 없이 출처 있는 질문만. 규정은 약관 그대로.</p></div>')

idx = ins_before(idx, '<section class="sec tight" id="lab">', HOME_BAND, "index:프로필 밴드")
DECK.append(("index", "프로필 밴드(신설)", "(없음)", "13년차 | 입시 컨설턴트 13년차, 고려대학교 영어교육과 졸업. 38개 대학의 공개 자료에서 고른 질문 4,766개와 가이드북 38권. 편집 기준은 전권 동일. → 만든 사람 보기"))

idx = ins_before(idx, '<dt>환불은 어떻게 되나요</dt>',
  '<dt>누가 만들었나요</dt><dd>입시 컨설턴트 13년차, 고려대학교 영어교육과 졸업. 38권 전권과 스튜디오 제시문 해제를 같은 사람이 편집. 상세는 연구소 소개에.</dd>\n      ',
  "index:FAQ 신설")
DECK.append(("index", "FAQ(신설)", "(없음)", "누가 만들었나요 → 입시 컨설턴트 13년차, 고려대학교 영어교육과 졸업. 38권 전권과 스튜디오 제시문 해제를 같은 사람이 편집."))

open(os.path.join(OUT, "index_v3.html"), "w", encoding="utf-8").write(idx)

# ============================================================
# ABOUT (공통 워시 → 3안 분기)
# ============================================================
ab = open(os.path.join(SITE, "about.html"), encoding="utf-8").read()
ab = head_patch(ab)

ab = R(ab, "about", "aeo 수량사",
  '상품은 가이드북 38권과 스튜디오 2교, 봉투 모의고사입니다.',
  '상품은 가이드북 38권과 스튜디오 2개교, 봉투 모의고사입니다.')

ab = R(ab, "about", "title",
  '<title>연구소 소개, 현학적 연구소</title>',
  '<title>만든 사람과 만드는 방식, 현학적 연구소</title>')

ab = R(ab, "about", "H1",
  '<h1 class="rv">현학적 연구소</h1>',
  '<h1 class="rv">입시 컨설턴트 13년차의 면접 연구소</h1>')

ab = R(ab, "about", "lede",
  '<p class="lede rv">玄學的 硏究所. 요강과 관측 기록에서 출발하는 면접 자료.</p>',
  '<p class="lede rv">玄學的 硏究所. 고려대학교 영어교육과를 나온 입시 컨설턴트가 13년째 요강과 관측 기록으로 면접을 준비시키는 곳.</p>')

ab = R(ab, "about", "숫자 밴드: 면수 정정",
  '<div><b>38</b><span>면접 가이드북, 1,284면</span></div>',
  '<div><b>38</b><span>면접 가이드북, 1,389면</span></div>')

ab = R(ab, "about", "숫자 밴드: 2 스튜디오 → 13년차",
  '<div><b>2</b><span>제시문 면접 스튜디오 대학</span></div>',
  '<div><b>13</b><span>입시 컨설턴트 연차</span></div>')

ab = R(ab, "about", "산출물 01 면수 정정",
  '38개 대학, 1,293면, 수록 질문 4,766개.',
  '38개 대학, 1,389면, 수록 질문 4,766개.')

ab = ins_before(ab, '<dt>갱신</dt>',
  '<dt>편집</dt><dd>38권 전권을 한 사람이 같은 기준으로 편집합니다. 학교 간 서술 차이는 자료의 차이입니다.</dd>\n      ',
  "about:방식 편집 행")
DECK.append(("about", "만드는 방식(행 신설)", "(없음)", "편집 → 38권 전권을 한 사람이 같은 기준으로 편집합니다. 학교 간 서술 차이는 자료의 차이입니다."))

for tag, maker in (("A", MAKER_A), ("B", MAKER_B), ("C", MAKER_C)):
    v = ins_before(ab, '<section class="sec tight" id="three">',
                   MAKER_SECTION.replace("{MAKER}", maker), f"about:{tag} 프로필 섹션")
    open(os.path.join(OUT, f"about_v3_{tag}.html"), "w", encoding="utf-8").write(v)
DECK.append(("about", "프로필 섹션(신설, 3안)", "(없음)", "「읽은 사람」 A 판권면 / B 명함 / C 자(尺). profile_board.html 참조"))

# ============================================================
# BOARD (3안 나란히)
# ============================================================
board = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<base href="../../../">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>「읽은 사람」 프로필 3안, 현학적 연구소</title>
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></noscript>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;500;700&display=swap">
<link rel="stylesheet" href="assets/base.css">
<link rel="stylesheet" href="_design/profile_copywash_20260831/profile.css">
<style>.pb .sh p b{{color:var(--seal)}} .pb section{{padding:var(--s6) 0}} .pb .note{{font-size:13px;color:var(--gray);margin-top:var(--s3);line-height:1.7}}</style>
</head><body class="v2 pb">
<div class="frame"><div class="sheet">
<main class="wrap" style="padding-top:var(--s7);padding-bottom:var(--s9)">
<span class="eyebrow">시안 2026-08-31, 초안</span>
<h1 style="font-size:var(--t-h1);font-weight:700;letter-spacing:-0.025em;line-height:1.2">「읽은 사람」 프로필 3안</h1>
<p class="note">about 페이지 「연구소 소개」에 들어갈 제작자 프로필 블록. 사실 원장 = 입시 컨설턴트 13년차, 고려대학교 영어교육과 졸업(건우 제공) + 38권 1,389면, 질문 4,766, 전환 규칙 1,790(카탈로그 실측). 팔레트, 폰트, 로고 = 브랜드 가이드 v1.1 그대로.</p>

<section><div class="sh"><div><h2>A안 판권면 <span style="color:var(--seal)">권고</span></h2><p>책 판권면 문법의 괘선 원장. 이름은 크게, 사실은 표로, 낙관 玄 마무리. 가장 연구소다운 절제.</p></div></div>
{MAKER_A}
</section>

<section><div class="sh"><div><h2>B안 명함</h2><p>확정 명함(玄褐 바탕, 金泥 락업, 楮紙 정보)을 화면으로 옮긴 판. 실물 자산과 같은 문법이라 기억 자산 재사용.</p></div></div>
{MAKER_B}
</section>

<section><div class="sh"><div><h2>C안 자(尺)</h2><p>13년을 눈금 13개로 그은 측정형. 숫자가 주인공, 문장은 최소.</p></div></div>
{MAKER_C}
</section>

<section><div class="sh"><div><h2>홈 밴드 (공통)</h2><p>index 「근거와 규정」 아래에 들어가는 축약형. 어느 안을 골라도 동일.</p></div></div>
<div class="makerband">
  <div class="num" aria-hidden="true">13<em>년차</em></div>
  <p><b>입시 컨설턴트 13년차, 고려대학교 영어교육과 졸업.</b> 38개 대학의 공개 자료에서 고른 질문 4,766개와 가이드북 38권. 편집 기준은 전권 동일.</p>
  <a class="tlink" href="about.html">만든 사람 보기</a>
</div>
</section>
</main>
</div></div>
<script>document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'))</script>
</body></html>'''
open(os.path.join(OUT, "profile_board.html"), "w", encoding="utf-8").write(board)

# ============================================================
# COPY_DECK.md
# ============================================================
rows = "\n".join(f"| {p} | {s} | {b.replace('|','\\|')} | {a.replace('|','\\|')} |" for p, s, b, a in DECK)
deck = f"""# 현학적 연구소, 전면 카피 워시 + 「읽은 사람」 프로필 (초안 v1, 2026-08-31)

건우 지시: 13년차 입시 컨설턴트 제작 어필 + 현학자 프로필(고려대학교 영어교육과 졸 포함)을 텍스트가 아닌 디자인 요소로. 전체 멘트 워시.

## 0. 사실 원장 (이것 밖의 경력 수치 사용 금지)
- 표기명 = **가명 현학자 玄學者** (건우 지시 08-31 17:29, 실명 미표기. 법정 사업자 정보 이미지의 대표명과 별개)
- 건우 제공 약력(verbatim 보존): 고려대학교 영어교육과 졸 / 현) 대치OOO학원 부원장 / 전) 데오럭스 교육 컨설팅 그룹 파트너 컨설턴트 / 전) AI 기반 입시 컨설팅 솔루션 '학쫑' 서비스 교육/개발 리더 / 전) 현직 영어 정교사 대상 교수법 및 문제 출제법 특강 강사 / 전) 현직 정교사 대상 세특 작성법 연수 강사 / 전) 대치우리학원 출강 및 EBS 연계 모의고사 출제위원 / 전) 목동 돌풍학원 고등부 수능 영어 출강 / 전) 노량진 대성학원 EBS 연계문제 및 고난도 문제 출제위원 / 전) 자율형사립고 경희고등학교 1학년 의대반 학업/진학 멘토링 + **입시 컨설턴트 13년차**
- 실측(카탈로그): 38권 / **1,389면**(사이트 구표기 1,284와 1,293은 낡은 값, 이번에 정정) / 질문 4,766 / 전환 규칙 1,790 / 스튜디오 8단위 × 지문 30편
- 지어내지 않은 것: 지도 학생 수, 합격 실적, 연도별 연혁(시작 연도 미확인이라 연표에 연도 미기재)

## 1. 메시지 축 (모든 페이지 공통)
**누가 만들었나(13년차, 고대 영교) → 왜 믿나(공개 자료 관측, 출처 표기, 전권 동일 기준) → 뭘 얻나(38권, 스튜디오 5회 첨삭)**
문체 게이트: 명사형 종결 우선, 대구 0, 가운뎃점 0, em대시 0, 최상급 0, 합격 보장 0, 은유 0, 없는 수치 0.

## 2. H1 후보 (index)
| # | 후보 | 판단 |
|---|---|---|
| 1 | 대학이 먼저 공개한 면접 질문 4,766개 | **권고, 프리뷰 적용.** 숫자 전면, 명사형, 현행 통찰 유지 |
| 2 | 면접에서 나올 질문은 이미 공개된 자료 안에 | 현행(2026-08-19 건우 확정). 유지 시 서브에서 13년차만 추가 |
| 3 | 13년차 입시 컨설턴트가 만든 38개 대학 면접 가이드북 | 제작자 전면. 프로필 소구 최우선이면 이것 |

about H1 후보: ① 입시 컨설턴트 13년차의 면접 연구소(프리뷰 적용) ② 현학적 연구소(현행 유지 + lede만 교체)

## 3. 치환 원장 (프리뷰 반영분)
| 페이지 | 자리 | before | after |
|---|---|---|---|
{rows}

## 4. 프로필 3안 (about 「읽은 사람」 섹션, profile_board.html)
| 안 | 장치 | 근거 |
|---|---|---|
| **A 판권면(권고)** | 괘선 원장 + 세리프 대형 13 + 낙관 玄 | 책 판권면 문법 = 출판물 신뢰 코드(v8 03 신뢰: 권위 직종은 무이미지 타이포가 정답). 잔상 축 = 괘선, 낙관 |
| B 명함 | 玄褐 밴드 + 金泥 락업 + 세로쓰기 한자 | 확정 명함과 동일 문법 = DBA 일관성(Ehrenberg-Bass Consistency). 어두운 면이 페이지 리듬 환기 |
| C 자(尺) | 13눈금 자 + 3열 사실 | 측정형 deadpan. 연도 미기재로 사실 안전. 시각 밀도는 가장 낮음 |

## 5. 프리뷰 미반영 워시 제안 (픽 후 일괄 적용, 하위 페이지)
| 페이지 | 자리 | 제안 |
|---|---|---|
| guidebook/index | lede | 공식 요강과 면접 후기에서 고른 학교별 면접의 실제, 38권. 입시 컨설턴트 13년차 편집, 권당 33,000원, 보안 리더 열람. 가나다 순. |
| studio | lede | 연세대와 고려대 기출 제시문으로 온라인 촬영 응시. 지문 1편에 5회, 회차마다 전사, 진단, 구술체 재구성. 제시문 해제는 13년차 컨설턴트가 직접. |
| b2b | lede 말미 추가 | 제시문 해제와 첨삭 기준은 13년차 입시 컨설턴트가 설계. |
| store | 유지 | 실물 상품이라 프로필 소구 불요 |
| SEO meta | index, about description | 픽 확정 후 seo_inject 체계로 일괄 갱신(수기 편집 금지) |

## 6. 게이트 (본 초안에 적용)
critic 9렌즈(렌즈1 4 이상, 총점 31 이상) + 기계(overflow 0, 1440과 390) + style_gate 게이트층 + 금칙 grep(가운뎃점, em대시, 최상급, 보장) + 사실 grep(13년차, 1,389, 4,766, 1,790 표기 일관).

## 7. 가디언 검수 결과 (2026-08-31 초안 기준)
- design-critic: 총점 32/45 (렌즈1=4) 조건부 통과 → P0 2건(밴드·근거카드 문장 중복 / h4 셀렉터)·P1 3건(C 눈금 종단·모바일 A side 순서·반복) 전건 수정 반영. 3안 순위 = A > C > B (B 는 로고가 주어가 되는 문제, 채택 시 로고 축소판 유지)
- brand-voice-guardian: "면접 전부" 과장 → "면접 준비"로 수정, 13년차 반복 7→4회(서브·증거줄·밴드·FAQ만), 프로필 경력·학력은 실증자료 구비 권고(저위험 통과)
- ai-slop-detector: 16뿌리·한국어 게이트·신뢰소구 슬롭 0건
- style_gate(신규 카피 추출): 등급 A (S1 0건. E-1 장문결핍은 UI 카피 레지스터라 미적용 판단)
- 기계: overflow 0 (1440·390), 히트박스 미달 0, pageerror 0, .cv 클래스 충돌(base.css 표지 썸네일 56px) 적발 → .career 개명
- 문체 레지스터 판정: about 산문 = 주변 라이브와 같은 합니다체 유지, index UI = 명사형 (문서 내 일관성 우선)
- 잔여(픽 후): Codex 릴리스 감사(§5 release 동등 라인), H1 52px vs 48px 상한 선언 모순은 기존 라이브 사안이라 별도 판정

## 8. 반영 절차 (승인 후)
1) 건우 픽: H1(3택1), about H1(2택1), 프로필 안(3택1) 2) profile.css를 base.css v2 스코프에 병합 3) index, about 본편 치환 + seo_inject 재실행 4) build_all 멱등 확인 + seo_check 5) critic 재판정 + Codex 릴리스 감사 6) push는 건우 `!`
"""
open(os.path.join(HERE, "COPY_DECK.md"), "w", encoding="utf-8").write(deck)

if fails:
    print("FAIL", len(fails))
    [print(" -", f) for f in fails]
    sys.exit(1)
print(f"OK, out/ 5본 + COPY_DECK.md, 치환 {len(DECK)}건 전건 1회 일치")
