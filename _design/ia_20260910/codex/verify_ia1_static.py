"""IA1 원장, 경로, 보존 계약 검증. 브라우저 검증은 별도다 (메타 층)."""
import json
import posixpath
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit

from lxml import html

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "_tools"))
from exam_pages import codes as EX

failures = []


def check(name, ok, detail=""):
    print(f'{"PASS" if ok else "FAIL"} {name}' + (f": {detail}" if detail else ""))
    if not ok:
        failures.append(name)


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def dom(rel):
    return html.fromstring(read(rel))


def cls(name):
    return f'contains(concat(" ", normalize-space(@class), " "), " {name} ")'


def text(node):
    return "".join(node.itertext()).strip()


lp = dom("programs/studio.html")
purchase = dom("studio.html")
cards = lp.xpath('//*[@id="units"]//article')
templates = purchase.xpath('//template[@id="r3-unit-template"]/article')
specs = {code: json.loads(read(f"_tools/exam_pages/facts/{code}.json"))["spec"] for code, _, _ in EX.CODES}
sale = [c for c, _, _ in EX.CODES if specs[c]["status"] == "on_sale"]
opening = [c for c, _, _ in EX.CODES if specs[c]["status"] == "opening"]
check("LP 8 cards in CODES order", [n.get("data-r3-unit") for n in cards] == [c for c, _, _ in EX.CODES])
check("purchase templates only 5 sale units", [n.get("data-r3-unit") for n in templates] == sale)
check("LP standalone cart link removed", not lp.xpath('//*[@id="units"]/a[@href="#buy"]'))
check("LP keeps single purchase data-primary marker", len(lp.xpath('//*[@data-primary]')) == 1)
for node, (code, name, _) in zip(cards, EX.CODES):
    spec = specs[code]
    is_open = code in opening
    title = json.loads(read("_tools/r2_copy.json"))[code.replace("-", "_")][0] if is_open else name
    check(f"{code} title from approved source", text(node.xpath(f'.//p[{cls("uni")}]')[0]) + " " + text(node.xpath('.//h3')[0]) == title)
    actual = [text(n) for n in node.xpath('.//dl//dd')]
    expect = [f'{spec["prep_sec"] // 60}분', f'{spec["answer_sec"] // 60}분', f'{spec["questions"]}개']
    check(f"{code} facts to minutes", actual == expect, repr(actual))
    foot = node.xpath(f'./div[{cls("foot")}]')[0]
    check(f"{code} primary guide", foot[0].get("href") == f"../interview/{code}.html" and text(foot[0]) == "출제 유형과 풀이법 보기")
    check(f"{code} allowed actions", len(foot) == (1 if is_open else 3) and not node.xpath('.//*[@disabled]'))
    if is_open:
        check(f"{code} opening status and no commerce", text(node.xpath(f'.//span[{cls("r3-unit-badge")}]')[0]) == f"{EX.OPEN_DATE} 오픈" and not node.xpath('.//*[@data-cart-sku or @data-unit-go or @data-r3-unit-buy]'))
    else:
        other = next(n for n in templates if n.get("data-r3-unit") == code)
        for selector in ('./span', './div[1]', './dl', './p'):
            a, b = node.xpath(selector)[0], other.xpath(selector)[0]
            if selector == './span':   # 序 번호는 면 안 순번이라 값이 다를 수 있다 (critic H1). 구조·클래스만 같으면 된다.
                check(f"{code} shared markup {selector}", a.get("class") == b.get("class") == "kn" and text(a).isdigit() and text(b).isdigit())
            else:
                check(f"{code} shared markup {selector}", html.tostring(a) == html.tostring(b))
    page = dom(f"interview/{code}.html")
    cta = page.xpath(f'//div[{cls("xcta")}]')[0]
    expect_hrefs = ([f"../notice.html?id={EX.NOTICE_ID}", "../interview.html#exam"] if is_open else
                    [f"../studio.html?unit={code}", f"../programs/studio.html#u-{code}", f"../lectures/{code}.html"])
    check(f"{code} CTA routes", [a.get("href") for a in cta.xpath('./a')] == expect_hrefs)
    check(f"{code} screen breadcrumb", bool(page.xpath(f'//nav[{cls("crumb")}]/a[@href="../interview.html#exam"]')))
    check(f"{code} llms entry", read("llms.txt").count(f"https://hyunhak.com/interview/{code}.html") == 1)
check("purchase opening list order", [a.get("href") for a in purchase.xpath(f'//p[{cls("r3-opening-links")}]/a')] == [f"interview/{c}.html" for c in opening])
check("hub summary jump", bool(dom("interview.html").xpath('//a[@href="#exam"]')))
for code in sale:
    check(f"{code} lectures list/detail ingress", bool(dom("lectures.html").xpath(f'//main//a[@href="interview/{code}.html"]')) and bool(dom(f"lectures/{code}.html").xpath(f'//main//a[@href="../interview/{code}.html"]')))

files = subprocess.check_output(["git", "ls-files", "-z", "*.html"], cwd=ROOT, text=True).split("\0")[:-1]
site = [p for p in files if not p.startswith(("_design/", "_docs/", "_tools/", "design/"))]
seo = re.compile(r'<title\b[^>]*>.*?</title>|<meta\b[^>]*(?:name="description"|property="og:[^"]+")[^>]*>|<link\b[^>]*rel="canonical"[^>]*>|<script\b[^>]*type="application/ld\+json"[^>]*>.*?</script>', re.S)
analytics = re.compile(r'<!-- analytics:begin -->.*?<!-- analytics:end -->', re.S)
fonts = re.compile(r'<link\b[^>]*(?:fonts\.(?:googleapis|gstatic)\.com|cdn\.jsdelivr\.net)[^>]*>', re.S)
film = re.compile(r'<figure\b[^>]*class="[^"]*herofilm[^>]*>.*?</figure>', re.S)
for label, pattern in (("SEO", seo), ("analytics", analytics), ("font loading", fonts), ("brand film", film)):
    changed = []
    for rel in site:
        before = subprocess.check_output(["git", "show", f"HEAD:{rel}"], cwd=ROOT, text=True)
        if pattern.findall(before) != pattern.findall(read(rel)):
            changed.append(rel)
    check(f"{label} byte preservation", not changed, repr(changed))
for rel in ("terms.html", "privacy.html"):
    before = subprocess.check_output(["git", "show", f"HEAD:{rel}"], cwd=ROOT, text=True)
    main = re.compile(r'<main\b.*?</main>', re.S)
    check(f"{rel} legal main byte preservation", main.findall(before) == main.findall(read(rel)) and bool(main.findall(before)))
price_changes = []
for rel in site:
    before = subprocess.check_output(["git", "show", f"HEAD:{rel}"], cwd=ROOT, text=True)
    # 실시간 구매 카드 가격은 별도 JS 이벤트 시험과 기존 price 렌더식을 대조한다.
    pattern = r'data-list-price="[0-9]+"'
    if re.findall(pattern, before) != re.findall(pattern, read(rel)):
        price_changes.append(rel)
check("literal list prices and order preserved", not price_changes, repr(price_changes))
unchanged = ["assets/app.js", "_tools/build_all.sh", "_tools/promo.json", "robots.txt", "_tools/seo_manifest.json", "_worker.js"]
changed_paths = subprocess.check_output(["git", "diff", "--name-only"], cwd=ROOT, text=True).splitlines()
check("protected source files", not set(unchanged).intersection(changed_paths) and not any(p.startswith(("_worker/", "_tools/exam_pages/facts/", "_tools/exam_pages/drafts/")) or re.search(r'promo_[^/]*\.html$', p) for p in changed_paths))

print("INGRESS excluding interview/*.html, _tools templates, design/docs and scripts; purchase templates render verified above")
for code, _, _ in EX.CODES:
    target = f"interview/{code}.html"
    inbound = []
    for rel in site:
        if rel.startswith("interview/"):
            continue
        tree = dom(rel)
        for a in tree.xpath('//a[@href]'):
            # purchase template is rendered into the card by JS and checked above.
            href = urlsplit(a.get("href"))
            if href.scheme or href.netloc:
                continue
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(rel), href.path))
            if resolved == target:
                inbound.append(rel)
                break
    check(f"{code} >=3 inbound pages", len(inbound) >= 3, f"{len(inbound)} {', '.join(inbound)}")
print(f"IA1_STATIC failures={len(failures)}")
sys.exit(bool(failures))
