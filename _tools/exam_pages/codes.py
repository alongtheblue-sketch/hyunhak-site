# -*- coding: utf-8 -*-
"""전형별 면접 상세면 8본의 코드 원장 (2026-09-10). 빌더(build_exam_pages.py)와 허브(build_interview_hub.py)가 같은 표를 쓴다.
   status 는 facts/<code>.json spec.status 가 원천이고 여기 값은 표시 라벨 기본값이다."""
CODES = [
    # code, 지면 이름(짧은), 상태 라벨
    ("yonsei-hum",   "연세대 활동우수형 인문통합",   "판매 중"),
    ("yonsei-sci",   "연세대 활동우수형 자연",       "판매 중"),
    ("yonsei-intl",  "연세대 국제형",                "판매 중"),
    ("yonsei-mirae", "연세대 미래캠퍼스 학생부종합", "9월 14일 오픈 예정"),
    ("korea-hum",    "고려대 계열적합전형 인문",     "판매 중"),
    ("korea-sci",    "고려대 계열적합전형 자연",     "판매 중"),
    ("korea-eq-hum", "고려대 고른기회전형 인문",     "9월 14일 오픈 예정"),
    ("korea-eq-sci", "고려대 고른기회전형 자연",     "9월 14일 오픈 예정"),
]
OPEN_DATE = "9월 14일"
NOTICE_ID = "ntc_0914a001"      # hyunhak-api/tools/notice_open_20260914.sql 의 공지 행 id
PHONE = "070-8098-0671"
PHONE_TEL = "tel:07080980671"
