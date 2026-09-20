5개 산출물을 완료했습니다. 정적 검사 완료, r1과 inputs 변경 없음. 렌더는 수행하지 않았습니다.

[스토리](/Users/gregory/Workspace/hyunhak-site/_design/studio_promo_20260920/r2/dirF/story.html) · [할인본](/Users/gregory/Workspace/hyunhak-site/_design/studio_promo_20260920/r2/dirF/story_promo.html) · [브로슈어](/Users/gregory/Workspace/hyunhak-site/_design/studio_promo_20260920/r2/dirF/brochure.html) · [CSS](/Users/gregory/Workspace/hyunhak-site/_design/studio_promo_20260920/r2/dirF/style.css) · [설계 노트](/Users/gregory/Workspace/hyunhak-site/_design/studio_promo_20260920/r2/DESIGN_NOTES.md)

아래 위치는 HTML 클래스와 공유 CSS 선택자 기준입니다.

| 번호 | 반영 여부 | 반영 위치와 판단 |
|---|---|---|
| S1 | 반영 | `.story-sheet`, `.story-cta`: 높이 696px, 스티커 여유 44px, 기준선 약 1351.8 |
| S2 | 반영 | `.story-facts`: 390은 104px, 12·1은 76px |
| S3 | 반영 | `.story-logo`: 144px, 보호 여백 확보 |
| S4 | 반영 | `.story-cta`: 36px 문장, 버튼 없음 |
| S5 | 반영 | `.story-title`: 양쪽 96px, −0.04em, 1.15 |
| S6 | 반영 | `.story-lead`: 답변 화면의 녹음과 녹화를 명시하는 (b) 선택 |
| S7 | 유지 | `.story-sheet`: 불투명 종이색, 스크림 없음 |
| S8 | 반영 | `story_promo.html`: 지정 문구 38px와 점 하나만 추가 |
| B1 | 반영 | `.comparison`: 가격만 num, 고정 열폭, 대칭 패딩 2.5mm |
| B2 | 반영 | `.answer-crop`: 타이머 크롭 27mm, 약 301dpi |
| B3 | 반영 | `.answer-crop`: 웹캠 결함 영역 제외 |
| B4 | 반영 | `.steps`: 규격을 절차 2에 통합, 앞면 5구역 |
| B5 | 반영 | `.metrics`: 28pt / 17pt, 라벨 8.5pt |
| B6 | 반영 | `.signature-meta`: 앞면 URL 하단 1회 |
| B7 | 반영 | `.front-hero h1`: 36pt, 줄바꿈 허용, 밴드 유지 |
| B8 | 반영 | `.wrap`: 실제 그리드 배치, 공통 5mm 간격 |
| B9 | 반영 | `.comparison .price`: 세 가격만 朱印 12.5pt/700 |
| B10 | 반영 | `.picto`: picto_b, 20px |
| B11 | 반영 | `.correction-copy .score`: 두 번째 문단으로 편입 |
| B12 | 반영 | `.back .wrap`: 지정 순서, 삼선 표와 군집선 유지 |
| B13 | 반영 | `:root`: 색·서체 재선언 삭제, 폴백 상속 |
| B14 | 유지 | `.signature .logo-full`: 27mm |

스토리 최종 좌표는 다음과 같습니다. 단위는 px입니다.

1. 시트: **(64, 680), 952×696**, 하단 y1376.
2. 락업: **(841.5, 704), 높이 144**. URL (96, 720), 할인 문구 (96, 800).
3. 제목: **(96, 912), 폭 888**, 두 줄 중심 y1022.4.
4. 보조 문장: **(96, 1144)**. 숫자 밴드 (96, 1200), 888×104.
5. 유도 문구: **(96, 1312)**, 기준선 약1351.8. 스티커 영역 y1420~1580.

렌더에서 확인할 위험 지점:

- 숫자 옆 라벨의 읽기 순서와 락업 작은 한자 줄의 판독성.
- 27mm 타이머 크롭이 앱 화면의 증거로 충분히 읽히는지.
- 뒷면 표 줄바꿈, 가격 셀 간격, QR 캡션과 문의 분리.
- 실제 기준선·넘침, 사방 여백, PDF 2쪽, 폰트 임베드와 Type 3 여부.