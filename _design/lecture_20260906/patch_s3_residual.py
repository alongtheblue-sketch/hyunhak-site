#!/usr/bin/env python3
"""s3 잔여 3건 패치 (2026-09-06). 멱등: 적용 판정은 new 존재 우선 (old 부재 가드 금지, feedback_idempotent_patch_guard).
 1) faq.html 기존 §인강(q-lecture 5문, 스쿨 플랜 뒤) 을 스튜디오 뒤로 올리고 3문 신설(단위 전권 구성, 맛보기, 플레이어) + 낡은 답 2건 갱신 + 바로가기 이동 + 리드 문장에 인강 추가
 2) build_lectures.py 앵커바 340px 이하 卷 표식 시각 숨김 (320px 폭 넘침 37px 해소, 접근성 이름 유지)
 3) build_lectures.py 인강실 게스트 안내 문장 종결을 합니다체로 통일하고 두 문장 종결을 달리 함
실행 위치 = 사이트 루트. 적용 뒤 sh _tools/build_all.sh 2회 (해시 동일) 필수.
"""
import sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
def patch(path, old, new, label):
    p = root / path; s = p.read_text(encoding="utf-8")
    if new in s: print(f"[skip] {label}: 이미 적용"); return 0
    n = s.count(old)
    if n != 1: print(f"[FAIL] {label}: old 적중 {n}건 (1 이어야 함)"); return 2
    p.write_text(s.replace(old, new), encoding="utf-8"); print(f"[ok] {label}"); return 1

rc = 0
# 1) 기존 §인강(q-lecture, 5문) 을 스튜디오 뒤로 올리고 3문 신설 + 낡은 답 2건 갱신(인강실 신설 전 "마이페이지 내 강의" 문면)
def faq_block():
    p = root / "faq.html"; lines = p.read_text(encoding="utf-8").split("\n")
    if any("<summary>맛보기를 볼 수 있습니까" in l for l in lines): print("[skip] faq 인강 묶음: 이미 적용"); return 0
    h = [i for i, l in enumerate(lines) if l.strip() == '<h2 id="q-lecture">인강</h2>']
    if len(h) != 1: print(f"[FAIL] faq q-lecture h2 적중 {len(h)}"); return 2
    i = h[0]; j = i + 1
    while j < len(lines) and lines[j].startswith('    <details class="faq"><summary>인강'): j += 1
    if j - i - 1 != 5: print(f"[FAIL] faq 기존 인강 문답 {j-i-1}건 (5 이어야 함)"); return 2
    del lines[i:j]
    k = [x for x, l in enumerate(lines) if l.strip() == '<h2 id="q-pay">결제</h2>']
    if len(k) != 1: print("[FAIL] faq q-pay 적중 != 1"); return 2
    block = NEW_LEC.rstrip("\n").split("\n")
    lines[k[0]:k[0]] = block
    p.write_text("\n".join(lines), encoding="utf-8"); print("[ok] faq 인강 묶음 이동 + 3문 신설 + 답 2건 갱신"); return 1
NEW_LEC = '''    <h2 id="q-lecture">인강</h2>
    <details class="faq"><summary>인강은 어떤 종류가 있습니까</summary><div class="a"><p>세 묶음입니다. 다섯 단위에 모두 걸리는 공통 풀이 인강 4편, 응시 단위마다 5편에서 9편인 단위 강의, 지문마다 1편씩 단위마다 30편인 세트 해설입니다. 고려대 자연은 보충 해설 10편이 더 있습니다. 편수와 시간은 <a href="lectures.html">강좌 목록</a>에 열람 시점 값으로 표시됩니다.</p></div></details>
    <details class="faq"><summary>인강은 어디에서 봅니까</summary><div class="a"><p>로그인한 뒤 <a href="classroom.html">인강실</a>에서 봅니다. 마이페이지의 내 강의에서도 들어갑니다. 시청 기간은 지급일부터 3개월이고 응시 이용 기간 12개월과는 별개입니다.</p></div></details>
    <details class="faq"><summary>인강만 따로 살 수 있습니까</summary><div class="a"><p>공통 풀이 인강만 따로는 220,000원이며 시청 3개월입니다. 단위 전권에는 이미 포함되어 있고 낱권에는 그 세트 풀이법 인강 1편이 딸려 있습니다.</p></div></details>
    <details class="faq"><summary>단위 전권을 사면 어떤 강의가 들어옵니까</summary><div class="a"><p>그 단위의 단위 강의 전편과 세트 해설 30편, 공통 풀이 인강 4편이 인강실에 섭니다. 다른 단위의 강의는 들어오지 않습니다. 지문 낱권은 그 세트의 해설 1편만 들어옵니다.</p></div></details>
    <details class="faq"><summary>맛보기를 볼 수 있습니까</summary><div class="a"><p>강좌 상세 여섯 면마다 로그인 없이 보는 1분 15초 발췌가 있고 자막이 붙어 있습니다. 로그인 전 인강실 화면에도 공통 풀이 맛보기가 있습니다.</p></div></details>
    <details class="faq"><summary>플레이어에는 어떤 기능이 있습니까</summary><div class="a"><p>배속, 장별 목차, 책갈피, 이어보기가 있고 전편에 우리말 자막이 붙어 있습니다. RESUME_WM</p></div></details>
    <details class="faq"><summary>인강이 준비 중으로 표시됩니다</summary><div class="a"><p>해설 강의는 공개되는 대로 순차 업로드되며 공개 편수는 열람 시점 기준으로 강좌 목록과 인강실에 표시됩니다. 공개되면 추가 비용 없이 같은 이용권으로 봅니다.</p></div></details>
    <details class="faq"><summary>인강 동시 시청 한도가 있습니까</summary><div class="a"><p>계정당 3기기까지. 가이드북 열람과 같은 세션 한도입니다.</p></div></details>
'''.replace("RESUME_WM", "시청 위치는 계정에 저장되어 다른 기기에서 열어도 그 자리부터입니다. 화면의 흐린 글자는 계정 워터마크라 지울 수 없습니다.").replace(" </p>", "</p>")
rc |= faq_block()
def nav_move():
    p = root / "faq.html"; s = p.read_text(encoding="utf-8")
    want = '        <a href="#q-studio">면접 스튜디오</a>\n        <a href="#q-lecture">인강</a>\n        <a href="#q-pay">결제</a>'
    if want in s: print("[skip] faq 바로가기: 이미 적용"); return 0
    old_line = '        <a href="#q-lecture">인강</a>\n'
    if s.count(old_line) != 1: print(f"[FAIL] faq 바로가기 인강 적중 {s.count(old_line)}"); return 2
    s = s.replace(old_line, "")
    anchor = '        <a href="#q-studio">면접 스튜디오</a>\n        <a href="#q-pay">결제</a>'
    if s.count(anchor) != 1: print("[FAIL] faq 바로가기 studio→pay 적중 != 1"); return 2
    s = s.replace(anchor, want); p.write_text(s, encoding="utf-8"); print("[ok] faq 바로가기 인강 이동"); return 1
rc |= nav_move()
rc |= patch("faq.html", '<p class="lede rv">현학적 연구소는 서류기반면접 가이드북 31권과 연세대, 고려대 제시문 면접 스튜디오를 판매합니다.</p>',
            '<p class="lede rv">현학적 연구소는 서류기반면접 가이드북 31권과 연세대, 고려대 제시문 면접 스튜디오, 제시문 풀이법 인강을 판매합니다.</p>', "faq 리드 인강")

OLD_CSS = '@media (max-width:400px){.lec2 .anch{gap:0}.lec2 .anch a{font-size:12px}.lec2 .anch a b{font-size:10px}}'
NEW_CSS = OLD_CSS + '\n@media (max-width:340px){.lec2 .anch a{gap:0;padding:0 7px}.lec2 .anch a b{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}}   /* 320px 폭: 卷 표식을 시각만 숨겨 4항목 233px 가 280px 안에 든다(종전 317px, 37px 가로 스크롤). 접근성 이름은 유지 */'
rc |= patch("_tools/build_lectures.py", OLD_CSS, NEW_CSS, "앵커바 340px 규칙")

rc |= patch("_tools/build_lectures.py",
            '<p>산 이용권의 강의와 이어보기 위치가 여기에 선다. 계정이 없으면 가입, 강의를 고르려면 강좌 목록.</p>',
            '<p>산 이용권의 강의와 마지막으로 본 자리를 여기에서 엽니다. 계정이 없으면 먼저 가입하고, 강의를 아직 고르는 중이면 강좌 목록을 보세요.</p>', "인강실 게스트 문장")
sys.exit(0 if rc in (0, 1) else rc)
