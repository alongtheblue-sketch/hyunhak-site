"""R2 FAQ membership and copy keys shared by visible HTML and structured data."""
import html
import json
import re
from pathlib import Path

COPY_PATH = Path(__file__).with_name("r2_copy.json")
PAGE_KEYS = {
    "index.html": [("faq_read_q", "faq_read_a"), ("faq_pick_q", "faq_pick_a"),
                   ("faq_source_q", "faq_source_a"), ("faq_refund_q", "withdraw_text")],
    "programs/guidebook.html": [("faq_read_q", "faq_read_a"), ("faq_pick_q", "faq_pick_a"),
                               ("faq_refund_q", "withdraw_text")],
    "programs/studio.html": [("faq_trial_q", "trial_note"), ("faq_lecture_q", "lecture_release"),
                            ("faq_refund_q", "withdraw_text")],
}


def faq_pairs(rel):
    copy = json.loads(COPY_PATH.read_text(encoding="utf-8"))
    return [{"q": copy[q][0], "a": copy[a][0]} for q, a in PAGE_KEYS[rel]]


def render_faq(rel):
    rows = []
    for keys, pair in zip(PAGE_KEYS[rel], faq_pairs(rel)):
        for tag, key, text in zip(("dt", "dd"), keys, (pair["q"], pair["a"])):
            rows.append(f'<{tag}><span data-copy="{key}">{html.escape(text)}</span></{tag}>')
    return '<dl class="r2-faq">' + "".join(rows) + '</dl>'


def sync_home(source):
    result, count = re.subn(r'<dl class="r2-faq">.*?</dl>',
                            lambda _: render_faq("index.html"), source, flags=re.S)
    if count != 1:
        raise ValueError(f"index.html: expected one R2 FAQ, found {count}")
    return result
