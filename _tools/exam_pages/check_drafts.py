#!/usr/bin/env python3
"""astra 집필 산출(drafts/<code>.json) 결정론 검수 레그 (2026-09-10).

브리프(BRIEF_ASTRA.md) 자기검사 5항을 코드로 다시 잰다. 집필자의 자기신고는 근거가 아니다.
  1 스키마: 키 집합·순서·개수 상한·길이 상한
  2 숫자: 본문의 모든 숫자가 facts/<code>.json 값(과 그 유도값: 초→분)에 있는가. 허용 = 연도 2024~2027, 9월 14일, 070-8098-0671, 문항 번호 1~3, 단계 번호
  3 비공개 층 어휘: 루브릭·모범답안·배점 세부 낱말
  4 금지어·가운뎃점·줄표·감탄부호·명령형·반말 종결
  5 verbatim: sample.questions == 은행 세트 questions[].text, passages excerpt ⊂ passages[].text (고른기회 = 원문 카드 txt 안에 있는가)
  + 문체 게이트(style_gate scan --profile deliverable --gate-only) 등급
실행: python3 check_drafts.py [code ...]   (인자 없으면 drafts/*.json 전부). rc 1 = 하드 결함 1건 이상.
"""
import json, re, sys, subprocess, tempfile, os
from pathlib import Path

D = Path(__file__).resolve().parent
STYLE = Path.home() / "unjang/_shared/style_gate/style_gate.py"

KEYS = ["code", "h1", "title_tag", "meta_description", "keywords", "lead", "answer_box", "spec_notes", "types", "method",
        "sample", "pitfalls", "plan", "faq", "siblings_note", "offline_note"]
LIM = {"h1": 40, "title_tag": 60, "answer_box": 200}
BAN = ["합격", "보장", "1위", "최고", "단 하루", "지금 아니면", "경쟁률", "합격선", "최상의", "가장 좋은", "완벽"]
PRIVATE = ["루브릭", "모범답안", "모범 답안", "채점 기준표", "배점표", "만점", "감점"]
YEARS = {"2024", "2025", "2026", "2027"}
FREE = {"1", "2", "3", "4", "9", "14", "070", "8098", "0671", "12", "6"}   # 문항·단계·(가)~(라) 번호, 9월 14일, 전화. 12/6 = 고른기회 준비·답변(분)

def walk_str(o):
    if isinstance(o, str): yield o
    elif isinstance(o, dict):
        for v in o.values(): yield from walk_str(v)
    elif isinstance(o, list):
        for v in o: yield from walk_str(v)

def walk_num(o):
    if isinstance(o, bool): return
    if isinstance(o, (int, float)):
        yield o
    elif isinstance(o, str):
        for m in re.findall(r"\d[\d,]*", o): yield int(m.replace(",", ""))
    elif isinstance(o, dict):
        for v in o.values(): yield from walk_num(v)
    elif isinstance(o, list):
        for v in o: yield from walk_num(v)

def allowed_numbers(facts):
    s = set()
    for n in walk_num(facts):
        if isinstance(n, float) and not n.is_integer(): continue
        n = int(n); s.add(str(n)); s.add(f"{n:,}")
        if n % 60 == 0 and n >= 60: s.add(str(n // 60))     # 초 → 분
    return s

def sentences(t):
    return [x.strip() for x in re.split(r"(?<=[.!?])\s+", t) if x.strip()]

def main(codes):
    hard_total = 0
    for code in codes:
        dp = D / "drafts" / f"{code}.json"
        fp = D / "facts" / f"{code}.json"
        hard, soft = [], []
        try:
            raw = dp.read_text(encoding="utf-8")
            d = json.loads(raw)
        except Exception as e:
            print(f"[{code}] JSON 파싱 실패: {e}"); hard_total += 1; continue
        facts = json.loads(fp.read_text(encoding="utf-8"))
        # 1 스키마
        if list(d.keys()) != KEYS: hard.append(f"키 집합/순서 어긋남: {list(d.keys())}")
        if d.get("code") != code: hard.append(f"code 필드 {d.get('code')!r}")
        for k, lim in LIM.items():
            if len(d.get(k, "")) > lim: hard.append(f"{k} {len(d[k])}자 > {lim}")
        md = d.get("meta_description", "")
        if not 120 <= len(md) <= 155: hard.append(f"meta_description {len(md)}자 (120~155)")
        if not 10 <= len(d.get("keywords", [])) <= 15: hard.append(f"keywords {len(d.get('keywords', []))}개 (10~15)")
        if len(d.get("lead", [])) != 2: hard.append(f"lead {len(d.get('lead', []))}문장 (2)")
        for i, s in enumerate(d.get("lead", [])):
            if len(s) > 60: soft.append(f"lead[{i}] {len(s)}자 > 60")
        if not 1 <= len(d.get("spec_notes", [])) <= 3: hard.append(f"spec_notes {len(d.get('spec_notes', []))}개 (1~3)")
        if not 3 <= len(d.get("types", [])) <= 5: hard.append(f"types {len(d.get('types', []))}개 (3~5)")
        for t in d.get("types", []):
            if set(t) != {"name", "definition", "frequency_note", "prompt_shape", "reading_key"}: hard.append(f"types 키 {sorted(t)}")
            if len(t.get("definition", "")) > 80: soft.append(f"types[{t.get('name')}].definition {len(t['definition'])}자 > 80")
        m = d.get("method", {})
        if not 3 <= len(m.get("principles", [])) <= 5: hard.append(f"principles {len(m.get('principles', []))}개 (3~5)")
        for p in m.get("principles", []):
            if len(p.get("title", "")) > 20: soft.append(f"principle title {len(p['title'])}자 > 20: {p['title']}")
            if len(p.get("body", "")) > 120: soft.append(f"principle body {len(p['body'])}자 > 120")
        if not 4 <= len(m.get("timeline", [])) <= 6: hard.append(f"timeline {len(m.get('timeline', []))}단계 (4~6)")
        if not m.get("boundary"): hard.append("method.boundary 없음")
        sm = d.get("sample", {})
        for k in ["set_id", "doc_head", "passages", "questions", "steps", "first_sentence", "trap", "source_note"]:
            if k not in sm: hard.append(f"sample.{k} 없음")
        if not 2 <= len(sm.get("passages", [])) <= 4: hard.append(f"sample.passages {len(sm.get('passages', []))}편 (2~4)")
        if not 3 <= len(sm.get("steps", [])) <= 4: hard.append(f"sample.steps {len(sm.get('steps', []))}단계 (3~4)")
        if sm.get("steps") and "스튜디오" not in sm["steps"][-1].get("body", ""): hard.append("sample.steps 마지막 단계에 경계 문장(스튜디오) 없음")
        if len(d.get("pitfalls", [])) != 3: hard.append(f"pitfalls {len(d.get('pitfalls', []))}개 (3)")
        for p in d.get("pitfalls", []):
            if len(p.get("body", "")) > 100: soft.append(f"pitfall body {len(p['body'])}자 > 100")
        if len(d.get("plan", [])) != 4: hard.append(f"plan {len(d.get('plan', []))}단계 (4)")
        if len(d.get("faq", [])) != 5: hard.append(f"faq {len(d.get('faq', []))}개 (5)")
        for q in d.get("faq", []):
            if len(q.get("a", "")) > 160: soft.append(f"faq a {len(q['a'])}자 > 160: {q['q']}")
            if not re.search(r"(나요|가요|까요|인가요|되나요)\??$", q.get("q", "")): soft.append(f"faq q 꼴: {q.get('q')}")
        if "070-8098-0671" not in d.get("offline_note", ""): hard.append("offline_note 에 070-8098-0671 없음")
        if facts["spec"].get("status") != "on_sale" and not any("9월 14일" in s for s in walk_str(d.get("plan"))):
            hard.append("오픈 예정 전형인데 plan 에 '9월 14일 오픈' 문장 없음")
        # 2 숫자
        ok = allowed_numbers(facts) | YEARS | FREE
        verbatim_fields = set(sm.get("questions", [])) | {p.get("excerpt", "") for p in sm.get("passages", [])}
        seen = {}
        skip_num = verbatim_fields | {sm.get("set_id", ""), sm.get("doc_head", "")}
        for s in walk_str({k: v for k, v in d.items() if k not in ("code", "keywords")}):
            if s in skip_num: continue
            for mnum in re.findall(r"\d[\d,]*", s):
                if mnum not in ok and mnum.replace(",", "") not in ok:
                    seen.setdefault(mnum, s[:70])
        for n, ctx in seen.items(): hard.append(f"facts 에 없는 숫자 {n!r}: …{ctx}…")
        for s in verbatim_fields:
            for ch in ("·", "—", "–"):
                if ch in s: soft.append(f"verbatim 인용 안 {ch!r} (지면에서 따옴표 인용으로 감싸야 v2_check 통과): {s[:50]}")
        # 3·4 어휘
        prose = [s for s in walk_str({k: v for k, v in d.items() if k not in ("code",)}) if s not in verbatim_fields]
        for s in prose:
            for w in BAN:
                if w in s: hard.append(f"금지어 {w!r}: {s[:60]}")
            for w in PRIVATE:
                if w in s: soft.append(f"비공개 층 낱말 {w!r}: {s[:60]}")
            if "·" in s: hard.append(f"가운뎃점: {s[:60]}")
            if "—" in s or "–" in s: hard.append(f"줄표: {s[:60]}")
            if "!" in s: hard.append(f"감탄부호: {s[:60]}")
            if re.search(r"(하라|하시오|할 것)\.?$", s): hard.append(f"명령형: {s[:60]}")
        # 반말 종결: 문장 단위. 발문 인용(따옴표 안)은 제외. keywords·set_id·doc_head·tag 제외
        skip_keys = {"keywords", "code"}
        for k, v in d.items():
            if k in skip_keys: continue
            for s in walk_str(v):
                if s in verbatim_fields or k == "sample" and s in (sm.get("set_id"), sm.get("doc_head")): continue
                for sen in sentences(s):
                    core = re.sub(r"[\"'“”‘’()]", "", sen).rstrip(".?")
                    if len(core) < 6: continue
                    if re.search(r"(니다|니까|나요|가요|까요|세요|어요|아요|지요|죠|입니다|합니다)$", core): continue
                    if re.search(r"(한다|된다|이다|있다|없다|는다|였다|았다|었다|겠다|같다|않다|하다)$", core):
                        if "하시오" in core or "시오" in core: continue
                        soft.append(f"{k}: 반말 종결 의심 「{sen[:50]}」")
        # 5 verbatim
        sets = {s["id"]: s for s in (facts.get("bank") or {}).get("sets", [])}
        sid = sm.get("set_id")
        if sid in sets:
            st = json.loads(Path(sets[sid]["file"]).read_text(encoding="utf-8"))
            bank_q = [q["text"] for q in st["questions"]]
            if sm.get("questions") != bank_q:
                hard.append(f"sample.questions ≠ 은행 세트 {sid} 발문 (draft {len(sm.get('questions', []))} / bank {len(bank_q)})")
                for i, (a, b) in enumerate(zip(sm.get("questions", []), bank_q)):
                    if a != b: hard.append(f"  q{i+1} draft 「{a[:60]}」 / bank 「{b[:60]}」")
            ptext = {p["tag"]: p["text"] for p in st["passages"]}
            for p in sm.get("passages", []):
                t = ptext.get(p.get("tag"))
                if t is None: hard.append(f"passages tag {p.get('tag')!r} 이 세트에 없음")
                elif p.get("excerpt", "") not in t: hard.append(f"passages {p['tag']} 발췌가 원문 부분문자열이 아님: 「{p.get('excerpt', '')[:50]}」")
            if sm.get("doc_head") and st.get("doc_head") and sm["doc_head"] != st["doc_head"]:
                soft.append(f"doc_head 다름: draft 「{sm['doc_head']}」 / bank 「{st['doc_head']}」")
            # 난이도 하 첫 세트 규칙
            first_low = next((s for s in (facts["bank"]["sets"]) if s.get("difficulty") == "하"), facts["bank"]["sets"][0])
            if first_low["id"] != sid: soft.append(f"예시 세트 규칙(난이도 하 첫 세트 {first_low['id']}) 대신 {sid}")
        elif (facts.get("bank") or {}).get("n_sets"):
            hard.append(f"sample.set_id {sid!r} 이 은행에 없음")
        else:
            # 고른기회: 원문 카드 txt 에서 발문 실재 확인
            srcs = "".join(p.read_text(encoding="utf-8") for p in (D / "src").glob("korea_*_eq_cards_raw.txt"))
            norm = lambda x: re.sub(r"\s+", "", x)
            ns = norm(srcs)
            for i, q in enumerate(sm.get("questions", [])):
                if norm(q) not in ns: hard.append(f"고른기회 q{i+1} 가 원문 카드에 없음: 「{q[:60]}」")
        # 유형 prompt_shape 가 발문 verbatim 이면 은행·원문 실재
        for t in d.get("types", []):
            ps = t.get("prompt_shape", "")
            if ps.endswith("시오.") or ps.endswith("시오"):
                pool = [q for s in sets.values() for q in s.get("q_texts", [])]
                if pool and ps not in pool: soft.append(f"types[{t['name']}].prompt_shape 발문 꼴인데 은행 발문과 불일치: 「{ps[:50]}」")
        # 문체 게이트
        grade = "?"
        if STYLE.exists():
            with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as tf:
                tf.write("\n\n".join(s for s in prose if len(s) > 10)); tmp = tf.name
            try:
                r = subprocess.run([sys.executable, str(STYLE), "scan", "--profile", "deliverable", "--gate-only", "--json", tmp],
                                   capture_output=True, text=True, timeout=120)
                try:
                    j = json.loads(r.stdout); sm_ = j.get("summary", {})
                    grade = f"{sm_.get('grade')} gate={sm_.get('gate')} {sm_.get('by_rule')}"
                    for h in j.get("findings", [])[:12]:
                        if h.get("rid") in ("E-1", "E-2"): continue   # 문서 단위 장문·쉼표 지표. 지면 문안(40자 문장)에는 상시 발동이라 등급만 본다
                        soft.append(f"문체 {h.get('rid')} {h.get('name')}: 「{str(h.get('match') or h.get('text'))[:50]}」")
                except Exception:
                    grade = (r.stdout.strip().splitlines() or [r.stderr.strip()[:80]])[-1][:120]
            finally:
                os.unlink(tmp)
        print(f"[{code}] hard={len(hard)} soft={len(soft)} style={grade}")
        for h in hard: print("   HARD", h)
        for s_ in soft: print("   soft", s_)
        hard_total += len(hard)
    return 1 if hard_total else 0

if __name__ == "__main__":
    codes = sys.argv[1:] or sorted(p.stem for p in (D / "drafts").glob("*.json"))
    sys.exit(main(codes))
