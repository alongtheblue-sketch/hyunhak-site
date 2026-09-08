# R2 정보구조 계획

층: 런타임(사이트 산출). 기준: 8f9afab, FACTS_LEDGER, 2026-09-09.

- **면과 목적지**: 홈은 두 상품 선택. GNB와 모바일 탭의 가이드북은 `programs/guidebook.html`, 스튜디오는 `programs/studio.html`. 목록 `guidebook/index.html`과 응시실 `studio.html`은 상세면의 구매 및 보조 링크로 연결한다. URL과 SEO는 보존한다. 404 및 cart, checkout, join, login, my, pay_done은 파일 무변경 요구에 따라 기존 셸도 유지한다.
- **홈 순서**: 행사 한 줄(P1 그대로), 대입 면접 준비 리드, 동일한 두 상품 카드, 신뢰 네 칸, 대학별 찾기 `#find`, 스튜디오 응시 절차, 만든 사람과 기존 필름, 행사 가격표 네 행, FAQ, 공지. 대상 문구를 카드 첫 줄에 둔다. 데스크톱은 같은 폭과 높이의 2열, 모바일은 1열로 두 카드 머리가 844 높이 안에 들어오게 한다. 카드당 구매(`#buy`)와 자세히(상세 상단) 두 링크만 둔다.
- **가이드북 상세 첫 화면**: H1, 리드, `section#buy`. 대학 31개 select와 낱권/전권 열람권 가격 행, 단일 담기 버튼, 열람과 약관 안내, 목록 링크. 선택한 대학과 전권은 기존 SKU로 담는다. 이후 다섯 부, 기존 지면 표본 전량, 대상, 만든 사람 한 줄, FAQ, 마지막 구매 링크.
- **스튜디오 상세 첫 화면**: H1, 리드, `section#buy`. 응시 단위 5개 select, 세 이용권의 가격 행, 단일 담기 버튼, 체험 응시와 약관 링크. 전권은 한 편에 16,500원 앵커. 이후 응시 절차 네 단계, 첨삭 세 단, 공개 강의 안내, 순위표, 스쿨 플랜, FAQ, 마지막 구매 링크.
- **구매 계약**: `assets/app.js`의 `HH.addToCart({sku,title,price,ship,set_id})`를 재사용한다. 가이드북 `_tools/guidebook_page_v3.html`의 `[data-cart-sku]`, `data-cart-title`, `data-cart-price` 계약으로 `guide-<slug>` 또는 `guide-all-view`를 담는다. 스튜디오 `studio.html`의 `pass-<unit>`와 `lecture-common`을 재사용한다. `passage-single`은 `data-set-id`가 필수이므로 선택한 단위의 `studio.html?unit=<code>#sets`로 이동해 기존 지문 담기를 사용한다. 체험은 `studio.html#trialGo`. app.js 변경 없음.
- **생성 원천**: `_tools/program_*_v2.html`과 `_tools/build_programs.py`를 두고 기존 `_tools/build_interview_hub.py` 실행에서 생성한다. 목록 리드는 `_tools/guidebook_index_v2.html`, 공통 셸은 `v2_shell.py`, 가격표 위치는 `apply_promo.py`에서 바꾼다. build_all 순서는 유지한다.
- **제거와 보존**: 卷 folio와 장식 레일 및 CSS 잔여 제거. 한자는 푸터와 about에만 둔다(영상 자막과 SEO 원문 제외). 가격표 라벨/숫자/마감, 표본 검사에 필요한 이미지/범례, 필름 마크업/배선, 수량 검사의 홈 앵커를 보존한다. FAQ의 기존 JSON-LD는 SEO 원장에 고정하고 본문을 새 카피로 교체한다.

이어가기: 이 계획 커밋 후 MARKETING_NOTES.md, copy_ledger_v6.md 순으로 작성한다.
