#!/usr/bin/env python3
"""이용약관 개정 패처 (GS-16-1b 제6조 제1항, GS-19 제8조). 2026-09-04 s45.

멱등: 구 문안이 있으면 새 문안으로, 새 문안이 이미 있으면 무변경(rc 0). 둘 다 없으면 fail closed(rc 2).
게시 절차: 변호사 확인 뒤 --publish-date 로 공지일을 주면 시행일 = 공지일 + 7일 (제3조 2항, 이용자에게 유리한 개정).
불리 판정이 나오면 --days 30.

  python3 patch_terms_20260904.py --check                          # 현 terms.html 의 상태 판정만 (변경 0)
  python3 patch_terms_20260904.py --out terms_draft.html           # 초안 파일만 생성 (terms.html 무변경)
  python3 patch_terms_20260904.py --apply --publish-date 2026-09-10  # terms.html 본체 개정 (변호사 확인 뒤)
  python3 patch_terms_20260904.py --selftest                       # 양방향 자기검사
"""
import argparse, datetime as dt, os, re, shutil, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
TERMS = os.path.join(ROOT, "terms.html")

# 제6조 제1항 --------------------------------------------------------------
OLD_6_1 = (
    "    <li>실물 상품은 수령 후 7일 이내, 상품이 훼손되지 않은 경우 청약철회할 수 있습니다.\n"
    "    단순 변심에 따른 청약철회의 반송 비용은 3,000원이며 구매자가 부담합니다.\n"
    "    상품 하자나 오배송인 경우에는 연구소가 부담합니다.</li>"
)
NEW_6_1 = (
    "    <li>실물 상품은 수령 후 7일 이내에 청약철회할 수 있습니다. 내용을 확인하려고 포장을 연 경우는\n"
    "    훼손으로 보지 않으며, 소비자에게 책임이 있는 사유로 상품이 멸실되거나 훼손된 경우에만 청약철회가\n"
    "    제한됩니다(「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제1호). 훼손에 소비자의 책임이\n"
    "    있는지를 두고 다툼이 있으면 연구소가 이를 증명합니다(같은 법 제17조 제5항).\n"
    "    단순 변심에 따른 청약철회의 반송 비용은 3,000원이며 구매자가 부담합니다.\n"
    "    상품 하자나 오배송인 경우에는 연구소가 부담합니다.</li>"
)

# 제8조 --------------------------------------------------------------------
OLD_8 = (
    "  <h2>제8조 (지식재산권)</h2>\n"
    "  <ol>\n"
    "    <li>사이트와 자료실의 콘텐츠(가이드북 PDF 포함)에 대한 저작권은 연구소에 있습니다.</li>\n"
    "    <li>자료는 개인 학습 용도로만 사용할 수 있으며, 무단 전재, 재배포, 판매를 금합니다.</li>\n"
    "  </ol>"
)
NEW_8 = (
    "  <h2>제8조 (지식재산권)</h2>\n"
    "  <ol>\n"
    "    <li>사이트와 자료실의 콘텐츠 중 연구소가 저작한 부분(가이드북 본문, 해설, 문항과 자료의 선택 및 배열)의\n"
    "    저작권은 연구소에 있습니다.</li>\n"
    "    <li>표지와 홍보 이미지의 일부는 연구소가 구도와 제작 방향을 정해 생성형 인공지능 도구로 제작하고 연구소가\n"
    "    편집한 자료이며, 저작권 귀속과 별개로 이 약관이 정한 이용 조건에 따라 이용이 제한됩니다.</li>\n"
    "    <li>자료는 개인 학습 용도로만 사용할 수 있으며, 무단 전재, 재배포, 판매를 금합니다.</li>\n"
    "  </ol>"
)

# 문서 버전 줄 --------------------------------------------------------------
VER_RE = re.compile(r'<p class="updated">문서 버전: (\d{4}-\d{2}-\d{2})\. 시행일: (\d{4}-\d{2}-\d{2})\.(?: 개정 공지: \d{4}-\d{2}-\d{2}, 제6조 제1항과 제8조\.)?</p>')

def ver_line(publish, effective):
    return (f'<p class="updated">문서 버전: {effective}. 시행일: {effective}. '
            f'개정 공지: {publish}, 제6조 제1항과 제8조.</p>')

def state(s):
    """각 앵커의 상태: old / new / none"""
    def st(old, new):
        o, n = s.count(old), s.count(new)
        if o == 1 and n == 0: return "old"
        if o == 0 and n == 1: return "new"
        return f"none(old={o},new={n})"
    return {"6_1": st(OLD_6_1, NEW_6_1), "8": st(OLD_8, NEW_8), "ver": "ok" if VER_RE.search(s) else "none"}

def patch(s, publish, effective):
    st = state(s)
    bad = [k for k, v in st.items() if v.startswith("none")]
    if bad:
        raise SystemExit(f"앵커 부재 (fail closed): {st}")
    t = s
    if st["6_1"] == "old": t = t.replace(OLD_6_1, NEW_6_1, 1)
    if st["8"] == "old": t = t.replace(OLD_8, NEW_8, 1)
    if publish:
        t = VER_RE.sub(ver_line(publish, effective), t, count=1)
    return t

def dates(a):
    if not a.publish_date: return None, None
    pub = dt.date.fromisoformat(a.publish_date)
    eff = dt.date.fromisoformat(a.effective_date) if a.effective_date else pub + dt.timedelta(days=a.days)
    if (eff - pub).days < a.days:
        raise SystemExit(f"시행일 {eff} 이 공지일 {pub} + {a.days}일보다 이르다 (제3조 2항)")
    return pub.isoformat(), eff.isoformat()

def selftest():
    src = open(TERMS, encoding="utf-8").read()
    st = state(src)
    # 1) 앵커가 old 또는 new 로 전부 서야 한다
    assert not any(v.startswith("none") for v in st.values()), st
    # 2) 1회 적용 뒤 상태는 전부 new, 2회째는 바이트 동일 (멱등)
    once = patch(src, "2026-09-10", "2026-09-17")
    assert state(once)["6_1"] == "new" and state(once)["8"] == "new", state(once)
    assert "개정 공지: 2026-09-10" in once and "시행일: 2026-09-17" in once
    twice = patch(once, "2026-09-10", "2026-09-17")
    assert once == twice, "2회째 변경 발생"
    # 3) 새 문안 핵심 토큰 존재, 구 문안 토큰 부재
    for tok in ("제17조 제2항 제1호", "제17조 제5항", "생성형 인공지능 도구로 제작하고"):
        assert once.count(tok) == 1, tok
    assert "상품이 훼손되지 않은 경우" not in once
    # 4) 대조군: 앵커를 깨뜨린 입력은 fail closed
    broken = src.replace("제8조 (지식재산권)", "제8조 (지식 재산권)", 1)
    try:
        patch(broken, None, None); raise AssertionError("대조군이 통과했다")
    except SystemExit:
        pass
    # 5) 시행일 하한 대조군
    try:
        dates(argparse.Namespace(publish_date="2026-09-10", effective_date="2026-09-12", days=7))
        raise AssertionError("시행일 하한 대조군이 통과했다")
    except SystemExit:
        pass
    print("selftest PASS: 앵커", st, "/ 멱등 / 토큰 / 대조군 2")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--out")
    ap.add_argument("--publish-date")
    ap.add_argument("--effective-date")
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest: return selftest()
    src = open(TERMS, encoding="utf-8").read()
    if a.check:
        print(state(src)); return
    pub, eff = dates(a)
    out = patch(src, pub, eff)
    if a.out:
        open(a.out, "w", encoding="utf-8").write(out)
        print("초안 생성:", a.out, state(out), "publish", pub, "effective", eff)
    if a.apply:
        if not pub: raise SystemExit("--apply 에는 --publish-date 가 필요하다 (제3조 2항 공지)")
        bak = TERMS + ".bak." + dt.datetime.now().strftime("%Y%m%d_%H%M%S") + "_pre_amend"
        shutil.copy2(TERMS, bak)
        open(TERMS, "w", encoding="utf-8").write(out)
        print("terms.html 개정 적용:", state(out), "publish", pub, "effective", eff, "백업", bak)
    if not (a.out or a.apply):
        print("변경 없음 (--check / --out / --apply 중 하나)", state(src))

if __name__ == "__main__":
    main()
