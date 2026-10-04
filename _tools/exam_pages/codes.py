# -*- coding: utf-8 -*-
"""전형별 면접 상세면의 코드 원장 (2026-09-10 8본, 2026-10 연세대 기회균형 1본 추가로 9본). 빌더(build_exam_pages.py)와 허브(build_interview_hub.py)가 같은 표를 쓴다.
   status 는 facts/<code>.json spec.status 가 원천이고 여기 값은 표시 라벨 기본값이다."""
CODES = [
    # code, 지면 이름(짧은), 상태 라벨
    ("yonsei-hum",   "연세대 활동우수형 인문통합",   "판매 중"),
    ("yonsei-sci",   "연세대 활동우수형 자연",       "판매 중"),
    ("yonsei-intl",  "연세대 국제형",                "판매 중"),
    ("yonsei-mirae", "연세대 미래캠퍼스 학생부종합", "판매 중"),   # 2026-09-14 판매 개시 (계열 5단위 + 전 모집단위 공통형)
    ("yonsei-eq",    "연세대 기회균형",              "판매 중"),   # 2026-10 판매 개시 예정 (전 계열 1단위, 인강 없음). 행 위치 = 카드 번호와 구매 select 순서
    ("korea-hum",    "고려대 계열적합전형 인문",     "판매 중"),
    ("korea-sci",    "고려대 계열적합전형 자연",     "판매 중"),
    ("korea-eq-hum", "고려대 고른기회전형 인문",     "판매 중"),   # 2026-09-14 판매 개시 (S9-3 2단계)
    ("korea-eq-sci", "고려대 고른기회전형 자연",     "판매 중"),
]
OPEN_DATE = "9월 14일"
NOTICE_ID = "ntc_0914a001"      # hyunhak-api/tools/notice_open_20260914.sql 의 공지 행 id
PHONE = "070-8098-0671"
PHONE_TEL = "tel:07080980671"
# 집필 초안(drafts/<code>.json)의 자리표시. 은행 세트가 있어야 쓸 수 있는 칸(예시 세트 발문, 제시문 발췌 등)에 둔다.
# check_drafts.py 는 남은 자리표시를 하드 결함으로 세고, build_exam_pages.py 는 자리표시가 남은 초안으로 지면을 만들지 않는다 (2026-10 연세대 기회균형)
PENDING = "__PENDING_BANK__"
