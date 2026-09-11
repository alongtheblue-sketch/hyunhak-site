"""IA1 단위 명패: 소개면과 구매면 template의 마크업 원천 (런타임 층)."""
import html
import json
import re
from pathlib import Path

from exam_pages import codes as EX

HERE = Path(__file__).resolve().parent


def copy_text(key):
    return json.loads((HERE / "r2_copy.json").read_text(encoding="utf-8"))[key][0]


def units():
    rows = []
    for number, (code, label, _) in enumerate(EX.CODES, 1):
        spec = json.loads((HERE / "exam_pages" / "facts" / f"{code}.json").read_text(encoding="utf-8"))["spec"]
        if spec["status"] not in {"on_sale", "opening"}:
            raise ValueError(f"{code}: unknown status")
        uni = label.split(" ", 1)[0]
        # 예정 단위의 카드 표제는 IA1 §5 승인 문면을 그대로 사용한다.
        title = copy_text(code.replace("-", "_")) if spec["status"] == "opening" else label
        if not title.startswith(uni + " "):
            raise ValueError(f"{code}: university label mismatch")
        minutes = []
        for key in ("prep_sec", "answer_sec"):
            value = spec[key]
            if not isinstance(value, int) or value <= 0 or value % 60:
                raise ValueError(f"{code}: {key} must be whole minutes")
            minutes.append(value // 60)
        if spec["status"] == "opening":
            month, day = map(int, spec["open_date"].split("-")[1:])
            if f"{month}월 {day}일" != EX.OPEN_DATE:
                raise ValueError(f"{code}: opening date mismatch")
        rows.append(dict(code=code, number=f"{number:02}", uni=uni,
                         title=title[len(uni) + 1:], label=title, spec=spec,
                         prep=minutes[0], answer=minutes[1]))
    return rows


def unit_prices():
    """소개면 가격 사본의 원천. 구매면 JS 가 읽는 것과 같은 원장이다 (IA2 g② 대안)."""
    data = json.loads((HERE.parent / "assets" / "data" / "sets.json").read_text(encoding="utf-8"))
    return {unit["code"]: int(unit["price"]) for unit in data["units"]}


def card(row, prefix="../", purchase=False, number=None):
    """number: 구매면은 판매 카드만 01부터 다시 센다 (critic H1, 결번 방지)."""
    esc = html.escape
    code = row["code"]
    opening = row["spec"]["status"] == "opening"
    badge = copy_text("r3_unit_opening" if opening else "r3_unit_on_sale")
    note = copy_text("r3_unit_open_note" if opening else "r3_30passages")
    specs = "".join(
        f'<div><dt>{esc(copy_text(key))}</dt><dd>{value}{esc(copy_text(unit))}</dd></div>'
        for key, value, unit in (("r3_unit_prep", row["prep"], "r3_unit_minutes"),
                                 ("r3_unit_answer", row["answer"], "r3_unit_minutes"),
                                 ("r3_unit_questions", row["spec"]["questions"], "r3_unit_count")))
    # 위계: 면의 목적 행동 하나만 solid (critic H2·H3). 소개면 = ⑤ 안내, 구매면 = ⑦ 담기.
    guide_cls = "btn ghost sm" if purchase else "btn sm"
    actions = (f'<a class="{guide_cls}" href="{prefix}interview/{code}.html">'
               f'{esc(copy_text("r3_unit_guide"))}</a>')
    if not opening:
        # ⑥ 라벨 = 목적지 (critic M1). 소개면은 구매면으로 나가고, 구매면은 같은 면의 세트 표로 간다.
        # 정적 빌드에는 보유 판정이 없으므로 「응시실」은 쓰지 않는다 (IA2 §5, 2026-09-11 결재 C).
        go_key = "r3_unit_sets" if purchase else "r3_unit_pass"
        room_attr = f' data-unit-go="{code}"' if purchase else ""
        actions += (f'<a class="btn ghost sm" href="{prefix}studio.html?unit={code}"{room_attr}>'
                    f'{esc(copy_text(go_key))}</a>')
        actions += (f'<button type="button" class="btn sm" data-r3-unit-cart>{esc(copy_text("add"))}</button>'
                    if purchase else f'<a class="tlink" href="#buy" data-r3-unit-buy="{code}">{esc(copy_text("add"))}</a>')
    return (f'<article class="unit r3-unit{" r3-unit-opening" if opening else ""}" id="u-{code}" data-r3-unit="{code}">'
            f'<span class="kn">{number or row["number"]}</span>'
            f'<div class="r3-unit-heading"><p class="uni">{esc(row["uni"])}</p>'
            f'<h3>{esc(row["title"])}</h3><span class="r3-unit-badge">{esc(badge)}</span></div>'
            f'<dl class="dl r3-unit-spec">{specs}</dl>'
            f'<p class="r3-unit-note">{esc(note)}</p>'
            # 구매면은 JS 가 채우는 빈 슬롯, 소개면은 판매 단위에 한해 가격 사본 (IA2 g② 대안: 담기 전에 값을 보여 준다)
            + ('<div class="r3-unit-commerce"></div>' if purchase
               else '' if opening
               else f'<div class="r3-unit-commerce"><span class="price" data-list-price="{unit_prices()[code]}">'
                    f'{unit_prices()[code]:,}원</span></div>')
            + f'<div class="foot">{actions}</div></article>')


def render():
    return "\n".join(card(row) for row in units())


def sync_purchase(source):
    rows = units()
    on_sale = [row for row in rows if row["spec"]["status"] == "on_sale"]
    cards = "\n".join(card(row, prefix="", purchase=True, number=f"{i:02}")
                      for i, row in enumerate(on_sale, 1))
    upcoming = [row for row in rows if row["spec"]["status"] == "opening"]
    links = ", ".join(f'<a class="tlink" href="interview/{row["code"]}.html">{html.escape(row["label"])}</a>'
                      for row in upcoming)
    block = ('<!-- ia1:units:begin -->\n<template id="r3-unit-template">\n' + cards
             + '\n</template>\n<p class="note r3-opening-links">'
             + f'{EX.OPEN_DATE}에 여는 단위: {links}</p>\n<!-- ia1:units:end -->')
    source, count = re.subn(r'<!-- ia1:units:begin -->.*?<!-- ia1:units:end -->',
                            lambda _: block, source, flags=re.S)
    if count != 1:
        raise ValueError("studio.html: expected one IA1 units block")
    return source
