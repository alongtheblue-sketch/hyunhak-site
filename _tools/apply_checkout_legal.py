#!/usr/bin/env python3
"""checkout.html 의 동의 영역 아래에 이용약관과 개인정보 처리방침 전문을 박스로 싣는다.

원천은 terms.html 과 privacy.html 의 legal prose 블록 하나뿐이다. 여기서 문면을 새로
쓰지 않는다. 두 파일이 바뀌면 이 스크립트를 다시 돌려야 하고, --check 는 실린 사본이
원천과 같은지만 본다(문면 판정, mtime 판정 아님).

    python3 _tools/apply_checkout_legal.py          # 주입
    python3 _tools/apply_checkout_legal.py --check  # 낡음 검사, 낡으면 rc 1
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BEGIN = "<!-- legalbox:begin -->"
END = "<!-- legalbox:end -->"
OPEN = '<div class="wrap"><div class="legal prose rv">'
CLOSE = "</div></div>"

SRC = [
    ("terms.html", "이용약관", "약관"),
    ("privacy.html", "개인정보 처리방침", "방침"),
]


def extract(name):
    """legal prose 블록의 안쪽만 꺼낸다. 여는 표식과 </main> 사이에서 마지막 </div></div>."""
    raw = (ROOT / name).read_text(encoding="utf-8")
    i = raw.find(OPEN)
    if i < 0:
        sys.exit(f"{name}: 여는 표식 없음 ({OPEN})")
    j = raw.find("</main>", i)
    if j < 0:
        sys.exit(f"{name}: </main> 없음")
    k = raw.rfind(CLOSE, i, j)
    if k < 0:
        sys.exit(f"{name}: 닫는 표식 없음")
    return raw[i + len(OPEN):k].strip()


def transform(body, prefix):
    """상자 안에 넣을 형태로 고친다. 문장은 건드리지 않는다."""
    # 리빌 애니메이션은 스크롤 상자 안에서 영영 안 보이는 칸을 만든다
    body = re.sub(r'(\sclass="[^"]*?)\brv\b\s*', r"\1", body)
    body = re.sub(r'\sclass="\s*"', "", body)
    # 지면의 h2 는 결제 블록 제목이므로 한 단 낮춘다
    body = re.sub(r"<(/?)h3\b", r"<\g<1>h4", body)
    body = re.sub(r"<(/?)h2\b", r"<\g<1>h3", body)
    # id 충돌 방지
    body = re.sub(r'\sid="([^"]+)"', lambda m: f' id="{prefix}-{m.group(1)}"', body)
    return body.strip()


def render():
    parts = [BEGIN]
    parts.append('<div class="legalbox">')
    digests = []
    for name, title, prefix in SRC:
        raw = extract(name)
        digests.append(hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12])
        inner = transform(raw, prefix)
        parts.append(
            f'  <section class="lgb">\n'
            f'    <div class="lgb-h"><h3>{title}</h3>'
            f'<a class="lgb-x" href="{name}" target="_blank" rel="noopener">새 창에서 보기</a></div>\n'
            f'    <div class="lgb-b prose" tabindex="0" role="region" aria-label="{title} 전문">\n'
            f"{inner}\n"
            f"    </div>\n"
            f"  </section>"
        )
    parts.append("</div>")
    parts.append(END)
    return "\n".join(parts), digests


def main():
    check = "--check" in sys.argv
    target = ROOT / "checkout.html"
    page = target.read_text(encoding="utf-8")
    block, digests = render()

    if BEGIN in page:
        i = page.index(BEGIN)
        j = page.index(END) + len(END)
        cur = page[i:j]
        if cur == block:
            print(f"최신 (terms {digests[0]}, privacy {digests[1]})")
            return 0
        if check:
            print(f"낡음: 실린 사본이 원천과 다르다 (terms {digests[0]}, privacy {digests[1]})")
            return 1
        page = page[:i] + block + page[j:]
    else:
        if check:
            print("미주입: legalbox 블록 없음")
            return 1
        anchor = '<div id="agreement"></div>'
        if anchor not in page:
            sys.exit("checkout.html: 주입 기준점 없음 (#agreement)")
        page = page.replace(anchor, anchor + "\n      " + block, 1)

    target.write_text(page, encoding="utf-8")
    print(f"주입 완료 (terms {digests[0]}, privacy {digests[1]})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
