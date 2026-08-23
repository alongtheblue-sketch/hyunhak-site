#!/usr/bin/env python3
"""doctype/html/head/body 가 없는 본문 조각 html(programs/*.html, 아티팩트 발행용 조각)에 표준 스켈레톤을 씌운다. 멱등.
   head = 파일 처음 ~ 마지막 </style> 까지(meta/title/link/style/seo 블록). body = 그 뒤 전부."""
import glob, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
n = 0
for p in sorted(glob.glob(os.path.join(ROOT, "programs", "*.html"))):
    s = open(p, encoding="utf-8").read()
    if s.lstrip().lower().startswith("<!doctype"): continue
    i = s.rfind("</style>")
    if i < 0: print("style 없음:", p); continue
    i += len("</style>")
    head, body = s[:i], s[i:]
    out = '<!doctype html>\n<html lang="ko">\n<head>\n' + head.lstrip() + '\n</head>\n<body>' + body.rstrip() + '\n</body>\n</html>\n'
    open(p, "w", encoding="utf-8").write(out); n += 1
print("wrapped", n)
