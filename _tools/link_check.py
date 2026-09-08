#!/usr/bin/env python3
"""깨진 링크·구 URL 수습 검출기 (2026-09-09, GA4 「현학적 연구소, 없는 면」 51회 재발 방지).

원인이었던 결함 = 면을 지우면서 301 을 안 두어 답변엔진·검색 색인이 계속 옛 URL 을 부른 것(08-26 /interview/ 26면, store, programs/skku).
빌드마다 다섯 가지를 대조한다. 하나라도 어긋나면 FAIL(rc 1).
  A 공개 html 의 내부 href/src/action 전건 → 로컬 실재
  B sitemap.xml loc 전건 → 로컬 실재
  C git 이력에서 삭제된 공개 html 전건 ∪ 카탈로그 비판매 7권 → 워커 301 표(REMOVED_GUIDEBOOK ∪ LEGACY_REDIRECTS)에 등재, 아니면 _tools/link_check_exempt.json 에 사유와 함께 면제
  D 워커 301 표 목적지 전건 → 로컬 실재, 그리고 목적지가 다시 301 표의 키가 아닐 것(연쇄 금지), 키가 현재 실재하는 면이 아닐 것(산 면을 가리는 301 금지)
  E llms.txt · llms-full.txt · rss.xml 의 hyunhak.com 경로 전건 → 로컬 실재
검출기는 빌더·워커 코드를 import 하지 않고 파일만 읽는다. 사용: python3 _tools/link_check.py [--selftest]
--selftest = 임시 트리에 결함 6종을 주입해 각각 잡히는지, 결함 없는 트리가 0 인지 확인 (검출기 자기시험).
"""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = ("_design/", "_docs/", "_tools/", "outputs/", "design/", "node_modules/", ".git/", ".wrangler/")
ATTR_RE = re.compile(r'''(?:href|src|action)\s*=\s*["']([^"'#]+)''', re.I)
SITE_PATH_RE = re.compile(r"https?://(?:www\.)?hyunhak\.com(/[A-Za-z0-9_\-./]*)")


def public_pages(root: Path):
    out = []
    for p in sorted(root.rglob("*.html")):
        rel = p.relative_to(root).as_posix()
        if ".bak" in rel or rel.startswith(SKIP_DIRS):
            continue
        out.append(rel)
    return out


def resolves(root: Path, site_path: str) -> bool:
    """워커 resolve() 와 같은 해석: 디렉터리 → index.html, 확장자 없는 경로 → .html 또는 /index.html."""
    p = site_path.split("?")[0].split("#")[0]
    if p in ("", "/"):
        return (root / "index.html").exists()
    local = p.lstrip("/")
    if local.endswith("/"):
        # 디렉터리 = index.html 이 서빙된다. index 가 없어도 디렉터리가 실재하면 JS 템플릿의 접두("assets/covers/" + slug)로 본다
        return (root / local / "index.html").exists() or (root / local).is_dir()
    if re.search(r"\.[A-Za-z0-9]+$", local):
        return (root / local).is_file()
    return (root / (local + ".html")).is_file() or (root / local / "index.html").is_file()


def check_internal_refs(root: Path, pages):
    fails = []
    for rel in pages:
        txt = (root / rel).read_text(encoding="utf-8", errors="replace")
        for u in ATTR_RE.findall(txt):
            u = u.strip()
            if not u or u.startswith(("mailto:", "tel:", "javascript:", "data:", "sms:")) or "${" in u or "{{" in u:
                continue
            if re.match(r"https?://", u):
                m = SITE_PATH_RE.match(u)
                if not m:
                    continue
                target = m.group(1) or "/"
            elif u.startswith("//"):
                continue
            elif u.startswith("/"):
                target = u
            else:
                raw = u.split("?")[0]
                target = "/" + os.path.normpath(os.path.join(os.path.dirname(rel), raw)).replace(os.sep, "/")
                if raw.endswith("/") and not target.endswith("/"):
                    target += "/"   # normpath 가 지운 끝 슬래시 복원 (디렉터리 접두 판정)
                if target.startswith("/.."):
                    fails.append(f"A {rel}: 트리 밖 참조 {u}"); continue
            if not resolves(root, target):
                fails.append(f"A {rel}: 깨진 링크 {u}")
    return fails


def sitemap_locs(root: Path):
    sm = root / "sitemap.xml"
    if not sm.exists():
        return None
    return re.findall(r"<loc>\s*(.*?)\s*</loc>", sm.read_text(encoding="utf-8"))


def check_sitemap(root: Path):
    locs = sitemap_locs(root)
    if locs is None:
        return ["B sitemap.xml 없음"]
    fails = []
    for loc in locs:
        m = SITE_PATH_RE.match(loc)
        if not m:
            fails.append(f"B sitemap 비정식 loc {loc}"); continue
        if not resolves(root, m.group(1) or "/"):
            fails.append(f"B sitemap 유령 loc {loc}")
    return fails


def worker_tables(worker_text: str):
    """REMOVED_GUIDEBOOK (Set) 키 집합 + LEGACY_REDIRECTS (Object) 키→값. 워커 코드는 실행하지 않고 문면만 읽는다."""
    removed = set()
    m = re.search(r"REMOVED_GUIDEBOOK\s*=\s*new Set\(\[(.*?)\]\)", worker_text, re.S)
    if m:
        removed = set(re.findall(r'"(/[^"]+)"', m.group(1)))
    legacy = {}
    m = re.search(r"LEGACY_REDIRECTS\s*=\s*\{(.*?)\n\};", worker_text, re.S)
    if m:
        body = re.sub(r"//[^\n]*", "", m.group(1))
        legacy = dict(re.findall(r'"(/[^"]+)"\s*:\s*"(/[^"]+)"', body))
    return removed, legacy


def deleted_public_html(root: Path):
    """git 이력에서 삭제된 공개 html (현재 존재하는 것은 제외). git 이 없으면 None."""
    try:
        out = subprocess.run(["git", "-C", str(root), "log", "--diff-filter=D", "--name-only", "--pretty=format:", "--", "*.html"],
                             capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    dele = set()
    for line in out.splitlines():
        rel = line.strip()
        if not rel or ".bak" in rel or rel.startswith(SKIP_DIRS) or (root / rel).exists():
            continue
        dele.add("/" + rel)
    return dele


def check_worker(root: Path, deleted, worker_text: str, exempt: dict, catalog_off=None):
    fails = []
    removed, legacy = worker_tables(worker_text)
    if not legacy:
        fails.append("D 워커 LEGACY_REDIRECTS 표를 못 읽음")
    covered = removed | set(legacy)
    # C 삭제 면 전건 등재
    if deleted is None:
        fails.append("C git 삭제 이력을 못 읽음")
    else:
        for d in sorted(deleted | set(catalog_off or ())):
            if d in covered:
                continue
            if d in exempt:
                if not str(exempt[d]).strip():
                    fails.append(f"C 면제 사유 없음 {d}")
                continue
            fails.append(f"C 삭제된 면이 워커 301 표에 없음 {d} (LEGACY_REDIRECTS 등재 또는 link_check_exempt.json 면제)")
    # D 목적지 실재 · 연쇄 금지 · 산 면 가림 금지
    for k, v in sorted(legacy.items()):
        if v in legacy or v in removed:
            fails.append(f"D 301 연쇄 {k} → {v} (목적지가 다시 301 표의 키)")
        elif not resolves(root, v):
            fails.append(f"D 301 목적지 부재 {k} → {v}")
        if (root / k.lstrip("/")).is_file():
            fails.append(f"D 실재하는 면을 301 이 가림 {k}")
    for k in sorted(removed):
        if (root / k.lstrip("/")).is_file():
            fails.append(f"D 실재하는 면을 REMOVED_GUIDEBOOK 이 가림 {k}")
    return fails


def check_feeds(root: Path):
    fails = []
    for rel in ("llms.txt", "llms-full.txt", "rss.xml"):
        p = root / rel
        if not p.exists():
            continue
        for m in SITE_PATH_RE.finditer(p.read_text(encoding="utf-8", errors="replace")):
            sp = m.group(1) or "/"
            if sp.endswith("."):
                sp = sp[:-1]
            if not resolves(root, sp):
                fails.append(f"E {rel} 유령 경로 {sp}")
    return sorted(set(fails))


def run(root: Path, worker_text=None, deleted="git", exempt=None, catalog_off=None):
    if worker_text is None:
        worker_text = (root / "_worker/index.js").read_text(encoding="utf-8")
    if deleted == "git":
        deleted = deleted_public_html(root)
    if exempt is None:
        ex = root / "_tools/link_check_exempt.json"
        exempt = json.load(open(ex, encoding="utf-8")).get("exempt", {}) if ex.exists() else {}
    if catalog_off is None:
        cat = root / "_tools/guidebook_catalog.json"
        catalog_off = set()
        if cat.exists():
            catalog_off = {f"/guidebook/{e['slug']}.html" for e in json.load(open(cat, encoding="utf-8"))["items"] if e.get("onsale", True) is False}
    pages = public_pages(root)
    fails = []
    fails += check_internal_refs(root, pages)
    fails += check_sitemap(root)
    fails += check_worker(root, deleted, worker_text, exempt, catalog_off)
    fails += check_feeds(root)
    return pages, fails


def selftest():
    """결함 6종 주입 → 각각 FAIL, 결함 없는 트리 → 0."""
    with tempfile.TemporaryDirectory() as d:
        r = Path(d)
        (r / "guidebook").mkdir(); (r / "_worker").mkdir()
        (r / "index.html").write_text('<a href="ok.html">a</a><a href="missing.html">b</a><img src="/assets/x.png">', encoding="utf-8")
        (r / "ok.html").write_text("<p>ok</p>", encoding="utf-8")
        (r / "alive.html").write_text("<p>alive</p>", encoding="utf-8")
        (r / "assets").mkdir(); (r / "assets/x.png").write_bytes(b"x")
        (r / "sitemap.xml").write_text("<urlset><url><loc>https://hyunhak.com/ok.html</loc></url><url><loc>https://hyunhak.com/ghost.html</loc></url></urlset>", encoding="utf-8")
        (r / "llms.txt").write_text("- https://hyunhak.com/ok.html\n- https://hyunhak.com/phantom.html\n", encoding="utf-8")
        worker = ('const REMOVED_GUIDEBOOK = new Set([\n  "/guidebook/gone7.html",\n]);\n'
                  'const LEGACY_REDIRECTS = {\n  "/gone.html": "/nowhere.html",   // 목적지 부재\n  "/a.html": "/b.html",\n  "/b.html": "/ok.html",\n  "/alive.html": "/ok.html",\n};\n')
        pages, fails = run(r, worker_text=worker, deleted={"/gone.html", "/unlisted.html", "/exempted.html"}, exempt={"/exempted.html": "테스트 면제"}, catalog_off={"/guidebook/gone7.html"})
        want = {
            "A": "깨진 링크 missing.html", "B": "유령 loc https://hyunhak.com/ghost.html",
            "C": "301 표에 없음 /unlisted.html", "D-부재": "목적지 부재 /gone.html → /nowhere.html",
            "D-연쇄": "301 연쇄 /a.html → /b.html", "D-가림": "실재하는 면을 301 이 가림 /alive.html", "E": "유령 경로 /phantom.html",
        }
        missed = {k: v for k, v in want.items() if not any(v in f for f in fails)}
        extra = [f for f in fails if not any(v in f for v in want.values())]
        # 결함 없는 트리
        (r / "index.html").write_text('<a href="ok.html">a</a>', encoding="utf-8")
        (r / "sitemap.xml").write_text("<urlset><url><loc>https://hyunhak.com/ok.html</loc></url></urlset>", encoding="utf-8")
        (r / "llms.txt").write_text("- https://hyunhak.com/ok.html\n", encoding="utf-8")
        clean_worker = 'const REMOVED_GUIDEBOOK = new Set([\n]);\nconst LEGACY_REDIRECTS = {\n  "/gone.html": "/ok.html",\n};\n'
        _, fails2 = run(r, worker_text=clean_worker, deleted={"/gone.html"}, exempt={}, catalog_off=set())
        ok = not missed and not extra and not fails2
        print(f"selftest 주입 7종 검출 {7 - len(missed)}/7, 예상 밖 FAIL {len(extra)}, 청정 트리 FAIL {len(fails2)} → {'PASS' if ok else 'FAIL'}")
        for k in missed: print("  미검출", k, want[k])
        for f in extra: print("  예상 밖", f)
        for f in fails2: print("  청정 트리", f)
        return 0 if ok else 1


def main():
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    pages, fails = run(ROOT)
    for f in fails:
        print("FAIL", f)
    removed, legacy = worker_tables((ROOT / "_worker/index.js").read_text(encoding="utf-8"))
    dele = deleted_public_html(ROOT) or set()
    print(f"link_check: 면 {len(pages)} · sitemap {len(sitemap_locs(ROOT) or [])} · 삭제 이력 {len(dele)} · 워커 301 표 {len(removed)}+{len(legacy)} · fails={len(fails)}")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
