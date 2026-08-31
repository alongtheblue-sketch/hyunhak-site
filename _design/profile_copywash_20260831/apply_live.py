#!/usr/bin/env python3
"""현학적 연구소 — 프로필 A(판권면) + 전면 카피 워시 본편 반영 (건우 픽 2026-08-31)

픽: 프로필 A 판권면 / index H1 후보 3(제작자 전면) / about H1 ①
후보 3 채택으로 히어로 서브와 증거줄에서 '13년차' 중복을 걷어냄 (H1 이 소구를 가져감).
치환은 전부 '원문 정확 일치 1회' 검증. 0회 또는 2회 이상이면 전건 미기록 후 실패.
title, description, aeo 문단은 seo_manifest.json 만 고치고 seo_inject 가 본문에 반영한다.
"""
import json, os, shutil, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, "..", ".."))
BK = os.path.join(HERE, "_backup_live", datetime.datetime.now().strftime("%Y%m%dT%H%M%S"))

fails, log = [], []
buf = {}          # rel -> 내용

def load(rel):
    p = os.path.join(SITE, rel)
    buf[rel] = open(p, encoding="utf-8").read()

def rep(rel, spot, old, new):
    s = buf[rel]
    n = s.count(old)
    if n != 1:
        fails.append(f"[{rel}:{spot}] 원문 일치 {n}회 (1회 필요): {old[:56]}…")
        return
    if new in s:
        fails.append(f"[{rel}:{spot}] 대상 문자열이 이미 존재 (재실행 의심)")
        return
    buf[rel] = s.replace(old, new)
    log.append((rel, spot, "치환"))

def ins_before(rel, spot, anchor, block):
    s = buf[rel]
    n = s.count(anchor)
    if n != 1:
        fails.append(f"[{rel}:{spot}] 앵커 일치 {n}회: {anchor[:56]}…")
        return
    buf[rel] = s.replace(anchor, block + anchor)
    log.append((rel, spot, "신설"))

def ins_after(rel, spot, anchor, block):
    s = buf[rel]
    n = s.count(anchor)
    if n != 1:
        fails.append(f"[{rel}:{spot}] 앵커 일치 {n}회: {anchor[:56]}…")
        return
    buf[rel] = s.replace(anchor, anchor + block)
    log.append((rel, spot, "신설"))

# ============================================================
# 1) index.html
# ============================================================
load("index.html")

rep("index.html", "H1(후보 3, 제작자 전면)",
    '<h1 class="rv">면접에서 나올 질문은 이미 공개된 자료 안에</h1>',
    '<h1 class="rv">13년차 입시 컨설턴트가 만든 38개 대학 면접 가이드북</h1>')

rep("index.html", "히어로 서브",
    '<p class="sub rv">모집요강과 합격 후기를 38개 대학별 가이드북으로 재구성했습니다. 연세대와 고려대 제시문 면접은 말하는 장면을 촬영해 첨삭합니다.</p>',
    '<p class="sub rv">모집요강과 합격 후기에서 관측된 질문만 싣고, 문항마다 출처를 표기했습니다. 연세대와 고려대 제시문 면접은 말하는 장면을 촬영해 첨삭합니다.</p>')

ins_after("index.html", "증거 1줄",
    '<a class="tlink" href="studio.html">연세, 고려 제시문 면접 스튜디오</a>\n      </div>',
    '\n      <p class="proof rv"><span>만든 사람 <b>고려대학교 영어교육과</b> 졸</span><span><b>38권</b> 1,389면</span><span>수록 질문 <b>4,766</b></span></p>')

rep("index.html", "대학별 찾기 lede",
    '<p class="lede">지원 대학의 가이드북과 스튜디오를 한 자리에서.</p>',
    '<p class="lede">지원 대학 이름 하나로 가이드북과 스튜디오까지.</p>')

rep("index.html", "상품 3종 부제",
    '<p>가이드북, 스튜디오, 봉투 모의고사. 이 세 가지.</p>',
    '<p>학교별 가이드북, 제시문 스튜디오, 영어 봉투 모의고사. 필요한 것만 세 가지.</p>')

rep("index.html", "가이드북 카드 본문",
    '<p>전형별 면접 제원과 유형별 기출, 예상 질문을 담았습니다. 보안 리더로 열람하실 수 있습니다.</p>',
    '<p>지원 대학 한 곳의 면접 준비를 한 권에. 구매 후 보안 리더로 열람.</p>')

rep("index.html", "가이드북 카드 spec 2행",
    '<li>실제로 나온 질문, 생기부에서 질문 뽑는 규칙</li>',
    '<li>실제로 나온 질문과 예상 질문, 문항마다 출처 표기</li>')

rep("index.html", "가이드북 카드 spec 3행",
    '<li>기기 제한 없는 보안 리더 열람</li>',
    '<li>생기부에서 질문 뽑는 전환 규칙 1,790개(38권 합계)</li>')

rep("index.html", "스튜디오 카드 본문",
    '<p>연세대, 고려대. 지문 1편에 5회 응시, 회차마다 전사와 진단.</p>',
    '<p>연세대, 고려대 기출 제시문으로 촬영 응시. 지문 1편에 5회, 회차마다 첨삭 세 단.</p>')

rep("index.html", "스튜디오 카드 spec 3행",
    '<li>연세대 신촌과 미래캠퍼스, 고려대 계열적합 지문</li>',
    '<li>8개 단위, 단위마다 지문 30편(연세 신촌과 미래캠, 고려 계열적합)</li>')

rep("index.html", "근거와 규정 부제",
    '<div><h2>근거와 규정</h2><p>추정 문항은 싣지 않았습니다. 규정은 약관 그대로 적용됩니다.</p></div>',
    '<div><h2>근거와 규정</h2><p>추정 문항 없이 출처 있는 질문만. 규정은 약관 그대로.</p></div>')

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
ins_before("index.html", "프로필 밴드", '<section class="sec tight" id="lab">', HOME_BAND)

ins_before("index.html", "FAQ 누가 만들었나요", '<dt>환불은 어떻게 되나요</dt>',
    '<dt>누가 만들었나요</dt><dd>입시 컨설턴트 13년차, 고려대학교 영어교육과 졸업. 38권 전권과 스튜디오 제시문 해제를 같은 사람이 편집. 상세는 연구소 소개에.</dd>\n        ')

# ============================================================
# 2) about.html  (title, aeo 문단은 manifest 소관이라 본문 미접촉)
# ============================================================
load("about.html")

rep("about.html", "H1(안 ①)",
    '<h1 class="rv">현학적 연구소</h1>',
    '<h1 class="rv">입시 컨설턴트 13년차의 면접 연구소</h1>')

rep("about.html", "lede",
    '<p class="lede rv">玄學的 硏究所. 요강과 관측 기록에서 출발하는 면접 자료.</p>',
    '<p class="lede rv">玄學的 硏究所. 고려대학교 영어교육과를 나온 입시 컨설턴트가 13년째 요강과 관측 기록으로 면접을 준비시키는 곳.</p>')

rep("about.html", "숫자 밴드 면수 정정(1,284→1,389)",
    '<div><b>38</b><span>면접 가이드북, 1,284면</span></div>',
    '<div><b>38</b><span>면접 가이드북, 1,389면</span></div>')

rep("about.html", "숫자 밴드 2→13",
    '<div><b>2</b><span>제시문 면접 스튜디오 대학</span></div>',
    '<div><b>13</b><span>입시 컨설턴트 연차</span></div>')

rep("about.html", "산출물 01 면수 정정(1,293→1,389)",
    '38개 대학, 1,293면, 수록 질문 4,766개.',
    '38개 대학, 1,389면, 수록 질문 4,766개.')

ins_before("about.html", "만드는 방식 편집 행", '<dt>갱신</dt>',
    '<dt>편집</dt><dd>38권 전권을 한 사람이 같은 기준으로 편집합니다. 학교 간 서술 차이는 자료의 차이입니다.</dd>\n      ')

# A 판권면. base.css 의 :where(body.v2) .side (position:sticky) 와 충돌하므로 mk-side 로 개명
MAKER_A = '''
<section class="sec tight" id="maker">
  <div class="wrap">
    <div class="sh rv"><div><h2>읽은 사람</h2><p>이 자료를 만든 사람</p></div></div>
    <div class="maker a rv">
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
      <div class="mk-side" aria-hidden="true">
        <div class="num">13<em>년차</em></div>
        <div class="seal">玄</div>
      </div>
    </div>
  </div>
</section>

'''
ins_before("about.html", "프로필 A 판권면 섹션", '<section class="sec tight" id="three">', MAKER_A)

# ============================================================
# 3) 하위 페이지 (deck §5)
# ============================================================
load("studio.html")
rep("studio.html", "lede",
    '<p class="lede rv">연세대와 고려대의 기출 제시문으로 온라인 촬영 응시. 지문 1편에 5회 응시, 회차마다 전사, 진단, 구술체 재구성의 첨삭 세 단.</p>',
    '<p class="lede rv">연세대와 고려대의 기출 제시문으로 온라인 촬영 응시. 지문 1편에 5회 응시, 회차마다 전사, 진단, 구술체 재구성의 첨삭 세 단. 제시문 해제는 13년차 입시 컨설턴트가 직접.</p>')

load("b2b.html")
rep("b2b.html", "lede 말미",
    '강사 계정으로 학생들의 응시 현황과 첨삭 리포트를 관리합니다.</p>',
    '강사 계정으로 학생들의 응시 현황과 첨삭 리포트를 관리합니다. 제시문 해제와 첨삭 기준은 13년차 입시 컨설턴트가 설계합니다.</p>')

# guidebook/index.html 은 생성물 → 템플릿을 고친다
load("_tools/guidebook_index_v2.html")
rep("_tools/guidebook_index_v2.html", "lede(템플릿)",
    '<p class="lede rv">면접 후기와 공식 요강으로 재구성한 학교별 면접의 실제, __N__권. 권당 __PRICE__원이며, 구매 후 보안 리더로 열람하실 수 있습니다. 가나다 순입니다.</p>',
    '<p class="lede rv">공식 요강과 면접 후기에서 고른 학교별 면접의 실제, __N__권. 입시 컨설턴트 13년차 편집이며 권당 __PRICE__원, 구매 후 보안 리더로 열람하실 수 있습니다. 가나다 순입니다.</p>')

# ============================================================
# 4) seo_manifest.json (title, description, aeo answer)
# ============================================================
MF = os.path.join(SITE, "_tools", "seo_manifest.json")
mf_raw = open(MF, encoding="utf-8").read()
mf = json.loads(mf_raw)
SEO = {
    "index.html": {
        "description": "현학적 연구소는 대입 면접 준비를 다룹니다. 입시 컨설턴트 13년차가 만든 학교별 2027 면접 가이드북 38권과 연세대, 고려대 제시문 면접 스튜디오를 운영합니다.",
    },
    "about.html": {
        "title": "만든 사람과 만드는 방식, 현학적 연구소",
        "description": "입시 컨설턴트 13년차, 고려대학교 영어교육과 졸업. 학교별 면접 가이드북 38권과 연세대, 고려대 제시문 면접 스튜디오, 영어 봉투 모의고사를 만드는 방식과 출처를 설명합니다.",
        "answer": "현학적 연구소의 자료는 모집요강, 선행학습영향평가 보고서, 수험생 후기 관측에서 나오며, 상품은 가이드북 38권과 스튜디오 2개교, 봉투 모의고사입니다. 전권은 입시 컨설턴트 13년차가 같은 기준으로 편집합니다.",
    },
}
for rel, fields in SEO.items():
    e = mf["pages"].get(rel)
    if e is None:
        fails.append(f"[manifest:{rel}] 항목 없음")
        continue
    for k, v in fields.items():
        if e.get(k) == v:
            fails.append(f"[manifest:{rel}.{k}] 값이 이미 동일 (재실행 의심)")
        e[k] = v
        log.append((f"_tools/seo_manifest.json", f"{rel}.{k}", "치환"))

# ============================================================
# 커밋
# ============================================================
if fails:
    print("FAIL — 미기록으로 중단")
    for f in fails:
        print("  " + f)
    sys.exit(1)

os.makedirs(BK, exist_ok=True)
for rel in list(buf) + ["_tools/seo_manifest.json"]:
    dst = os.path.join(BK, rel.replace("/", "__"))
    shutil.copy2(os.path.join(SITE, rel), dst)
for rel, s in buf.items():
    open(os.path.join(SITE, rel), "w", encoding="utf-8").write(s)
open(MF, "w", encoding="utf-8").write(json.dumps(mf, ensure_ascii=False, indent=2) + "\n")

print(f"OK — {len(log)}건 반영, 백업 {BK}")
for rel, spot, kind in log:
    print(f"  {kind}  {rel}  {spot}")
