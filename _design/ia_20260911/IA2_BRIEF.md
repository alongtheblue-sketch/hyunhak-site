# IA2 브리프 — IA1 critic 잔여 선별 5건 (2026-09-11 00:0x 건우 결재 C)

## 0. 근거
- IA1 판정 = `_design/ia_20260910/CRITIC_VERDICT_IA1.md` (Δ2 33/45 릴리스 YES, 라이브 f690590). 잔여 목록 = 결재 큐 §HYUNHAK-S9 IA1-3 a~h.
- 건우 결재 (2026-09-11 00:0x) = **a·c·d·g·h 집행, b·e·f 현행 유지(대가 기록)**.
- IA1 브리프·§5 승인 문안표 = `_design/ia_20260910/codex/ia1_brief.md`. 문안 변경(a·c)은 그 §5 표에 행을 갱신·추가해 원장으로 남긴다.
- 브랜치 = `ia2/20260911-critic-residuals` (main d74ad30 이후 ff, 라이브 세대와 같음). 배포·push 금지 — 커밋까지만.

## 1. 집행 5건
| # | 결함 | 자리 | 요구 |
|---|---|---|---|
| a | M1 카드 「응시실」 링크가 응시실이 아니라 구매면(`studio.html?unit=`)·같은 면 탭으로 간다 | `_tools/studio_units.py` ⑥ 라벨, 소개면 `programs/studio.html`·구매면 `studio.html` 렌더, `_tools/r2_copy.json` | 라벨 = 목적지. 미구매자 문면 후보 2 = 「이용권 보기」(소개면→구매면) / 「세트 고르기」(구매면 같은 면 탭). 두 면의 목적지가 다르면 문면도 갈라도 된다. 「응시실」은 보유자에게만 남기되 정적 빌드라 보유 판정이 없으면 쓰지 않는다. §5 문안표 갱신 |
| c | L2 `my.html` 안내 링크 문안이 §5 허브형 자리(「전형별 출제 유형과 풀이법」)와 다르다 | `my.html` `'해설 강의 <a class="tlink">출제 유형과 풀이법 보기</a>'` | 허브 문안으로 통일하거나 §5 표에 my.html 행을 추가해 현행을 승인. 둘 중 하나를 고르고 표에 남긴다 |
| d | M6 `studio.html` 한 면에 「담기」 3등급 공존(단위 solid `btn sm` / 낱권 `btn ghost sm` / 공통 인강 `btn ghost`) | `studio.html`, `assets/base.css` | 단위 카드만 solid, 낱권·공통 인강의 두 ghost 크기를 하나로 통일. 면당 solid 1개 규칙 유지 |
| g | 소개면 카드 「담기」가 가격을 보이기 전에 장바구니에 넣는다(담은 뒤 #buy 이동) | `assets/product_buy.js` 카드 담기 핸들러(`button.click` 1줄), `_tools/studio_units.py` ⑦ | 대안 2 = ① 선택·이동만(`button.click` 제거, X1 mid-1 복귀) / ② 카드에 가격 사본 표시 후 담기. 둘 다 렌더해 critic 이 고른다. 기본 권고 ① |
| h | 프록시 지목: 구매면 「해설 강의 상태는 내 강의에서 확인」이 가격과 한 줄에 놓여 값 설명으로 읽힘 | `_tools/studio_units.py` commerce 행, `assets/base.css` `.r3-unit-commerce` | 가격 행과 분리(별 행 또는 카드 foot 밖 면 단위 1회 안내). 반복 5회도 1회로 줄일 수 있으면 같이 |

## 2. 현행 유지 3건 (기록만, 손대지 않는다)
- b M3 구매면 5장 2열 고아 1칸 — 브리프 「예정 3단위 = 한 줄 목록」 결정 유지.
- e L3 序 번호 소개면 05 대 구매면 04 — 면 안 순번 규칙의 대가로 기록.
- f Δ2 inset s4 — 스파인 24px 이탈은 알려진 비용, 재조정 없음.

## 3. 불변 조건
- 토큰·팔레트(玄墨 #312E2E, 楮紙 #F4EFE3 등 5색 + seal 가격 전용)·괘선 1px·곡률 0·그림자 0·그라디언트 0·이모지 0. 신규 토큰 0. `:where(body.v2)` 스코프.
- 가운뎃점(·)·em대시(—) 산출물 본문 0. 문체 게이트 = `~/unjang/_shared/style_gate/style_gate.py scan --gate-only`.
- 빌드 = 기존 `_tools` 빌더 재실행(수기 HTML 편집 금지). 넘침 검출기 8면×2 뷰포트 0, `titleLines` 1 유지.
- mood-reference-sourcing 은 기존 시스템 결함 수리라 비적용(명시 토큰 제공 예외).

## 4. 게이트·산출
1. 구현 커밋(들) on `ia2/20260911-critic-residuals` — 파일별 표적 편집, 부수 수정 금지.
2. 캡처 = `_design/ia_20260910/shot_ia1.mjs` 재사용(1280·390, 대상 = programs/studio.html·studio.html·my.html + 8면 회귀), `measure_edges.mjs` 넘침.
3. design-critic Δ3 재채점 → `_design/ia_20260911/CRITIC_VERDICT_IA2.md` (Blind, 9렌즈, 렌즈1≥4·8·9≥3·총점≥31, a·c·d·g·h 각 해소 실측 표, g 대안 ①② 판정).
4. design-audience-proxy 3 페르소나 → `_design/ia_20260911/AUDIENCE_PROXY_IA2.md` (25/30 이상).
5. 결과 요약 = `_design/ia_20260911/SESSION_IA2.md` (커밋 해시, 게이트 실측, 남은 항목, §5 표 갱신 diff).
