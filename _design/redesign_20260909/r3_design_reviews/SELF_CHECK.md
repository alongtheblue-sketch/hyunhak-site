# SELF_CHECK — R3 3안 자체 검사

측정 2026-09-09 · 대상 9면 (A, B, C × guidebook, studio, ranking) + `shared.css`
렌더 엔진 Playwright Chromium (`/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright`), `file://` 로드

---

## 1. AI 슬롭 16뿌리 (Q-C, 목표 0/16)

| # | 뿌리 | 판정 | 근거 |
|---|---|---|---|
| 1 | Midjourney 퍼플 그라디언트 | PASS | `gradient` 문자열 9면 + CSS 전부 0건 (grep) |
| 2 | SD 뇌회로 패턴 | PASS | 생성 이미지 0장. 전 이미지가 실 자산(지면 표본, 화면 캡처, 표지) |
| 3 | Inter 본문 만능론 | PASS | `Inter` 0건. 본문 Pretendard Variable (base.css `--sans`) |
| 4 | Space Grotesk 반복 | PASS | 0건 |
| 5 | 균등 카드 그리드 (8 카드 표준) | PASS | 카드 수가 자료 수에 종속. 4(기준), 5(단위, 레일), 3~4(가격), 31 또는 12(표지). 8 카드 관습 미사용 |
| 6 | 단일 hero + CTA 슬롭 | PASS | 히어로 다음이 계기 밴드 → 구성표(A) / 물음 4(B) / 비교표(C). CTA 하나로 끝나지 않는다 |
| 7 | GPT Image 2 균질화 | PASS | 생성 이미지 0장 |
| 8 | Variable fonts 단일 축 | PASS | Pretendard Variable 을 450 / 600 / 700 / 800 네 축값으로 쓴다. 모노 500 별 축 |
| 9 | 균등 좌우 분할 (50:50 만능) | PASS | 히어로 1.15fr : 1fr. 부 스프레드는 좌우 교차(`.rev`)로 리듬을 준다 |
| 10 | Excel 디폴트 색과 폰트 | PASS | 표 색은 종이와 먹 팔레트. 표 위계는 괘선(`--rule` `--rule-hd`)으로만 |
| 11 | K-pop 7색 글로우 | PASS | 색 5종 고정, 글로우 0 |
| 12 | 사이니지 광고 메가 톤 | PASS | 최상급 표현 0. 값과 수치는 전부 원장 항목 |
| 13 | AI 거의-인간 슬롭 | PASS | 인물 이미지 0장 |
| 14 | 손길 거짓 슬롭 | PASS | 「직접」 「손수」 류 수공 카피 0. 「한 사람이 같은 기준으로 편집합니다」는 원장 G12, S12 문면 |
| 15 | 전통 모티프 명시 회피 | PASS | 한국 OS 명시 (아래 §2) |
| 16 | 50년 후행 슬롭 | PASS | 도달 시점을 정직하게 적었다. 브리프 §7 에 못 한 것 4건 명시 |

**16/16 PASS.**

## 2. 한국 잔상 7축 (Q-D, 목표 1축 이상)

| 축 | 적용 | 어디에 |
|---|---|---|
| **#6 한지 질감** | 적용 | 팔레트 `--paper #F4EFE3` 楮紙(닥나무 종이) 톤이 지면 바탕. 카드 `--card #FFFDF8` 이 그 위의 한 겹 |
| **#7 단청 5색 계열의 절제형** | 부분 적용 | 朱印 `--seal #9E2B22` 을 값과 인장 자리에만, 金泥 `--gold` 를 먹 반전 면에만. 다섯 색을 나열하지 않고 두 색만 강조로 쓴다 |
| #4 한글 자소 | 미적용 | 워드마크 SVG 는 기존 자산이라 손대지 않았다 |

2축 적용. base.css 가 이미 「판본」 OS 로 한국 잔상을 깔고 있고, 본 산출은 그 위에서 새 색과 서체를 0건 추가했다.

## 3. 5요소 craft 정량 (Q-K, §K)

| 요소 | 값 | 판정 |
|---|---|---|
| 자간 | 본문 -0.012em, 표제 -0.032em, 라벨 0.01em (한글 라벨은 모노 + 0.10em 에서 sans + 0.01em 으로 낮춤) | PASS |
| 행간 | 본문 1.75, 표제 1.32, UI 1.5 | PASS |
| 8pt 그리드 | 4, 8, 16, 24, 40, 56, 72, 96, 128, 160, 200. 전 컴포넌트가 이 사다리만 쓴다 | PASS |
| 박스 | 곡률 4 / 8 / 999 세 단. 그림자는 `--shadow-2` 한 개, 나머지는 괘선 | PASS |
| 비율 | 타입 1.22 등비. 판면 1120, 본문 한 줄 상한 36em | PASS |

**리터럴 px**: `shared.css` 안 잔존 3건이며 전부 정당하다. `blur(10px)`(base.css `.hd` 와 동일), `inset 0 0 0 2px`(base.css `.plan.pick` 과 동일 관용), 주석 안 실측 수치. 2px 괘선 4건은 `--rule-hd` 토큰으로 치환 완료.

## 4. 한국어 문체 게이트 (`style_gate.py scan --gate-only`)

| 면 | 등급 | S1 | S2 | 상위 규칙 |
|---|---|---|---|---|
| A/guidebook.html | **A** | 0 | 1 | E-2 ×1 |
| A/studio.html | **A** | 0 | 1 | E-2 ×1 |
| A/ranking.html | **A** | 0 | 0 | 없음 |
| B/guidebook.html | **A** | 0 | 1 | E-2 ×1 |
| B/studio.html | **A** | 0 | 1 | E-2 ×1 |
| B/ranking.html | **A** | 0 | 1 | E-2 ×1 |
| C/guidebook.html | **A** | 0 | 1 | E-2 ×1 |
| C/studio.html | **A** | 0 | 1 | E-2 ×1 |
| C/ranking.html | **A** | 0 | 1 | E-2 ×1 |

- 전 9면 **등급 A**, S1 게이트 0건. 목표(A 또는 B) 충족.
- 남은 S2 는 **E-2 동일 종결어미 연속** 하나뿐이다. 합쇼체 유지가 BB-14 결재 사항이고 FAQ 답변이 전부 「~니다」로 끝나는 구조라 발생한다. **allow 대상**이며 문체 교체로 풀 문제가 아니다.
- C/guidebook 은 초기 측정에서 C-12(쉼표 포함 문장 51%)가 걸려 문장 4곳을 분할해 해소했다.
- 가운뎃점과 em 대시: 9면 전부 **0건**. 이모지 0건.

## 5. Playwright 렌더 실측 (verbatim)

```
[390x844] A/guidebook.html  scrollW=390 scrollH=19824  overflowX=no  over=0  tap<44=2  h1=1
[390x844] A/studio.html     scrollW=390 scrollH=13522  overflowX=no  over=0  tap<44=2  h1=1
[390x844] A/ranking.html    scrollW=390 scrollH=3695   overflowX=no  over=0  tap<44=1  h1=1
[390x844] B/guidebook.html  scrollW=390 scrollH=18350  overflowX=no  over=0  tap<44=2  h1=1
[390x844] B/studio.html     scrollW=390 scrollH=13043  overflowX=no  over=0  tap<44=2  h1=1
[390x844] B/ranking.html    scrollW=390 scrollH=3958   overflowX=no  over=0  tap<44=1  h1=1
[390x844] C/guidebook.html  scrollW=390 scrollH=14215  overflowX=no  over=0  tap<44=2  h1=1
[390x844] C/studio.html     scrollW=390 scrollH=12248  overflowX=no  over=0  tap<44=2  h1=1
[390x844] C/ranking.html    scrollW=390 scrollH=6116   overflowX=no  over=0  tap<44=1  h1=1
[1280x800] A/guidebook.html scrollW=1280 scrollH=10377 overflowX=no  over=0  tap<44=4  h1=1
[1280x800] A/studio.html    scrollW=1280 scrollH=7849  overflowX=no  over=0  tap<44=4  h1=1
[1280x800] A/ranking.html   scrollW=1280 scrollH=3044  overflowX=no  over=0  tap<44=3  h1=1
[1280x800] B/guidebook.html scrollW=1280 scrollH=11963 overflowX=no  over=0  tap<44=4  h1=1
[1280x800] B/studio.html    scrollW=1280 scrollH=8380  overflowX=no  over=0  tap<44=4  h1=1
[1280x800] B/ranking.html   scrollW=1280 scrollH=3232  overflowX=no  over=0  tap<44=3  h1=1
[1280x800] C/guidebook.html scrollW=1280 scrollH=8449  overflowX=no  over=0  tap<44=4  h1=1
[1280x800] C/studio.html    scrollW=1280 scrollH=8306  overflowX=no  over=0  tap<44=4  h1=1
[1280x800] C/ranking.html   scrollW=1280 scrollH=4277  overflowX=no  over=0  tap<44=3  h1=1
```

- **가로 넘침 0 / 18 조합.** JS 오류 0.
- h1 은 면당 정확히 1개.
- 첫 뷰포트 1차 CTA: 9면 × 2 뷰포트 = 18 조합 전부 존재.

### 5.1 렌더 중 잡아 고친 결함 5건 (전부 실측 발동)

| # | 증상 | 원인 | 조치 |
|---|---|---|---|
| 1 | 390에서 문서 폭 484px, 표지 팬 5장째가 판면 밖 | `.fan` left 56% + width 56% = 112% | 45% 폭, 최대 left 47% 로 닫음 |
| 2 | `.wrap` 좌우 여백이 사라져 표가 화면 끝에 붙음 | `.r3 .page{padding:… 0}` 축약형이 `.wrap` 의 `padding-inline` 을 0 으로 덮음 | 전 컴포넌트 `padding-block` 으로 교체 (7곳) |
| 3 | C/guidebook 4열 비교표가 390에서 넘침 | 열 4개가 최소 폭을 넘김 | 좁은 화면에서 표만 가로 스크롤 상자로. 지면은 넘치지 않음 |
| 4 | 모바일 하단 구매 바가 239px 높이로 히어로를 가림 | 내 `.lab` 이 base.css 410행 `.lab`(인용 블록, padding `--s6`)과 이름 충돌 | `.r3-lab` 으로 개명. 66px 로 정상화 |
| 5 | 1280에서 히어로 표제가 4행 + 마지막 행 외톨이 | `--t-display` 62px 이 열 폭 480px 에 과대 | 표제를 `--t-h1` 로 낮추고 열 비율 1.15:1, 문안을 행당 10자 이하로 재작성 |

추가로 한글 라벨 12곳이 모노 + 0.10em 자간으로 성기게 벌어지던 것을 sans + 0.01em 으로 바꿨다.

## 6. 인수 결함 (base.css 상속, 이번 산출이 만든 것 아님)

| 항목 | 실측 | 위치 | 제안 |
|---|---|---|---|
| 유틸바 링크 높이 19px (390) / 31px (1280) | 전 9면 | base.css `.util nav a` | WCAG 2.5.8 최소 24px 미달. `--util-h` 를 키우거나 히트박스 유틸(`.hit`) 적용 |
| 행사 띠 링크 높이 43px | 전 9면 | base.css `.promo a` (`--promo-h` 44 − 괘선 1) | 1px 부족. `--promo-h` 를 45로 올리면 해소 |

저장소 원본 무접촉 지시라 손대지 않았다. 구현 발주 시 별 항목으로 다뤄야 한다.

## 7. 원장 준수

- 지면의 모든 수치가 FACTS v2 항목이다. 원장 밖 수치 후보 14건은 브리프 §4.3 에 별 표로 격리했고 **지면에 쓰지 않았다**.
- 할인가 하드코딩 0. `data-list-price` 속성만 두고 지면에는 정가만 적었다 (P2 계약 준수). 속성값 6종: 33000, 110000, 511500, 1705000, 495000, 220000.
- 행사 라벨은 `label_sm` 문면 「9월 30일까지 정가 30% 할인」 그대로 (P1).
- 「13년차」 면당 1회 이하 (A3). 실측: A/guidebook 1, B/guidebook 1, C/guidebook 1, 나머지 6면 0.
- 스튜디오 제시문은 전 면에서 「기출 규격으로 새로 저작한 제시문」 (S2 RD-4 ①). 「실제 기출」 표현 0건.
- 스쿨 플랜 문맥에 영상 제공 단정 0건 (RD-4 ②).
- 순위표 별명과 점수는 지면에 「목업 표시용 예시 값」이라고 적었다.
