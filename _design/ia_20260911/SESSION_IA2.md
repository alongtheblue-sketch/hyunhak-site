# IA2 세션 기록: IA1 critic 잔여 선별 5건 (a, c, d, g, h) 집행

작업 트리 `~/Workspace/_wt/hh-ia`, 브랜치 `ia2/20260911-critic-residuals`, base = main `d74ad30`(라이브 세대). 배포와 push 없음, 커밋까지.
발주 = `_design/ia_20260911/IA2_BRIEF.md`(건우 결재 C, 2026-09-11 00:0x). 판정 원문 = `_design/ia_20260910/CRITIC_VERDICT_IA1.md`.

## 1. 커밋

| 해시 | 항목 | 내용 |
|---|---|---|
| `18b4026` | 사전 | 빌더 재실행이 낳는 날짜 갱신만 분리(`dateModified` 09-10 → 09-11, rss lastmod, sitemap lastmod). a~h 커밋의 diff 를 코드 변경만으로 두기 위한 기준 커밋 |
| `7e9c297` | a | 카드 ⑥ 라벨을 목적지에 맞춘다. `_tools/studio_units.py`, `_tools/r2_copy.json`, §5 문안표 |
| `a1f7dd1` | c | `my.html` 문안 현행 승인. §5 문안표에 행 추가, 코드 변경 0 |
| `627008b` | d | `studio.html` 담기 3등급을 2등급으로 |
| `c7e7f95` | h | 해설 강의 상태를 가격 행에서 분리, 반복 5회를 면 1회로. `assets/base.css`, `studio.html`, §5 문안표 |
| `d438cbe` | g② | 대안 ②. 소개면 카드에 가격 사본 표시, 담기 유지 |
| `35b0de7` | g① | 기본 권고 ①. 카드 담기는 선택과 이동만, ② 철회 |

브랜치 HEAD = `35b0de7` = 대안 ①. 대안 ② 는 `git show d438cbe` 로 온전히 재현된다.

## 2. 항목별 자리, 변경, 실측

| 항목 | 자리 | 변경 | 실측 |
|---|---|---|---|
| a | `_tools/studio_units.py:60-65` ⑥ 렌더, `_tools/r2_copy.json` | 면에 따라 문면을 가른다. 소개면 = 「이용권 보기」(목적지 `../studio.html?unit=<code>` 구매면), 구매면 = 「세트 고르기」(목적지 = 같은 면 `#sets` 세트 표, `data-unit-go` 가 그 단위를 고른 뒤 이동). 키 `r3_room`(응시실) 삭제, 키 `r3_unit_pass`, `r3_unit_sets` 신설 | `results.json` 카드 액션 문자열 = 소개면 `['출제 유형과 풀이법 보기','이용권 보기','담기']` 8장, 구매면 `['출제 유형과 풀이법 보기','세트 고르기','담기']` 5장. 두 면 「응시실」 0건(`grep -c 응시실 programs/studio.html studio.html` = 0, 0). `r3_room` 소비자 0, 원장에서도 삭제 |
| c | `my.html:577`, `my.html:585` | 코드 변경 없음. 두 자리의 목적지가 `interview/<code>.html` 이라 카드 primary 와 같은 문면이 맞다고 판정하고 §5 에 행을 추가해 현행을 승인했다. 허브 문면 「전형별 출제 유형과 풀이법」은 `interview.html#exam` 전용으로 표에 명시 | `git diff d74ad30..HEAD -- my.html` 변경 0줄. 캡처 회귀 = `my.html` 1280, 390 둘 다 PASS, `docOverflow` 0 |
| d | `studio.html:231`(공통 인강 plan `.acts`) | `btn ghost` → `btn ghost sm`. 낱권 세트 표 담기(`studio.html:463` JS 템플릿)는 이미 `btn ghost sm` 이라 무변 | 한 면의 담기 클래스 집계 = `btn sm` 5(단위 카드), `btn ghost sm` 2(낱권, 공통 인강). 3등급이 2등급으로. 크기는 sm 하나, 위계는 solid 와 ghost 로만 |
| g | `assets/product_buy.js:40-42`(종전 `button.click()` 자리) | ① `button.click()` 1줄 제거. 카드 클릭은 단위 선택, `pass` 모드 복원, `#buy` 이동까지만 한다 | 실브라우저(`verify_card_cart.mjs`, 8912): 클릭 뒤 `select=korea-hum`, `mode=pass`, `hash=#buy`, `scrollY=1046`, localStorage 에 `hh_cart_v1` **없음**, `pageerror` 0. 단위 테스트 `_design/ia_20260911/verify_ia2_buy.mjs` = 판매 5 카드 전건 적재 0, 구매 블록 버튼 1회 클릭에 1건 적재, failures=0 |
| h | `assets/base.css:1417-1419`, `studio.html:148-149`, `studio.html:390-394` | `.r3-unit-commerce` 를 가로 `space-between` 에서 세로 두 줄로 바꾸고 가격만 `align-self:flex-end`. 상태 조회에 실패한 카드는 그 줄을 감추고 같은 안내를 면 아래 `#lecNote` 로 한 번만 연다 | 상태 조회 성공 상태 주입 측정(1280): 가격과 해설 강의 줄이 같은 행에 있는 카드 0장, 두 줄 간격 8px(`--s2`), 카드 높이 5장 359.2px 동일, `docOverflow` 0. 390 = 392.1px 동일, `docOverflow` 0. 실패 상태(정적 서버, API 없음): 카드 안 반복 문면 0건, 면 안내 1건(`lecRepeat=0`, `lecNoteShown=true`) |

## 3. g 대안 두 판의 캡처

| 대안 | 커밋 | 캡처 | 화면 사실 |
|---|---|---|---|
| ① 선택과 이동만 (기본 권고, HEAD) | `35b0de7` | `_design/ia_20260911/shots/programs_studio.html_units_1280.png`, `..._390.png`, 잘라낸 판 `shots/crop_programs_units_1280.png`, `shots/crop_programs_card1_390.png` | 소개면 카드에 가격이 없다. 담기를 누르면 구매 블록으로 내려가 495,000원과 상태 문구를 본 뒤 그 자리에서 담는다. 장바구니 적재는 구매 블록에서만 일어난다 |
| ② 가격 사본 뒤 담기 | `d438cbe` | `_design/ia_20260911/shots_g2/programs_studio.html_units_1280.png`, `..._390.png`, `shots_g2/crop_programs_units_1280.png`, 계측 `shots_g2/results.json` | 소개면 판매 카드 5장에 495,000원이 카드 안 오른쪽 끝에 붙는다(원장 = `assets/data/sets.json` 의 `units[].price`, 화면 하드코딩 없음). 담기는 종전대로 1클릭 적재. 예정 3장은 가격 없음 |

두 판 모두 8장 카드 높이 279.4375px 동일, `titleLines` 1, `docOverflow` 0, 넘침 0.
① 이 지는 비용 = 「담기」가 적재하지 않는다. 문면과 행동이 다시 어긋난다(IA1 X1 mid-1 이 지적했던 상태로 복귀). ② 가 지는 비용 = 소개면에 가격 사본이 하나 늘어 원장이 두 면에 걸린다. 최종 선택은 critic.

## 4. §5 승인 문안표 갱신 diff

```
-| 카드 보조 링크 | 응시실 |
+| 카드 보조 링크 (소개면 ⑥ → `studio.html?unit=<code>` 구매면) | 이용권 보기 |
+| 카드 보조 링크 (구매면 ⑥ → 같은 면 `#sets` 세트 표, 그 단위 선택) | 세트 고르기 |
+| ~~카드 보조 링크~~ | ~~응시실~~ (IA2 폐지 2026-09-11. 두 면 모두 목적지는 구매면과 세트 표다. 정적 빌드에 보유 판정이 없어 보유자 전용 문면으로도 쓰지 않는다. `r2_copy.json` 키 `r3_room` 삭제) |

-| 허브 링크(랭킹실·홈·푸터·인강) | 전형별 출제 유형과 풀이법 |
+| 허브 링크(랭킹실, 홈, 푸터, 인강) → `interview.html#exam` | 전형별 출제 유형과 풀이법 |
+| 마이페이지 단위 행 안 링크 (`my.html` 보유 단위와 응시 기록) → `interview/<code>.html` | 출제 유형과 풀이법 보기 (IA2 현행 승인 2026-09-11, critic L2) |

+| 구매 면 해설 강의 상태 대체 안내 (면 1회, 상태 조회 실패 시만) | 해설 강의 상태는 내 강의에서 확인합니다. (IA2 신설 2026-09-11. 종전 카드 5장 반복 문면 「해설 강의 상태는 내 강의에서 확인」을 대신한다) |
```

원장 파일 = `_design/ia_20260910/codex/ia1_brief.md` §5.

## 5. 게이트 실측

| 게이트 | 값 |
|---|---|
| 빌드 멱등 | `sh _tools/build_all.sh` 3회 연속 `e6274d156e8cffe0` 동일(LC_ALL=C). 로그 = `_design/ia_20260911/build_ia2.log` |
| 정적 검증기 | v2_check 70면 fails=0, seo_check 31면 FAIL 0, 지면 표본 FAIL 0, seo_keyword_census FAIL 0, 자막 게이트 통과, link_check 면 75 fails=0, worker_check FAIL 0 / 27 |
| 캡처 | `node _design/ia_20260911/shot_ia2.mjs` 11면 × 2뷰포트 = **22/22 PASS**, `errors` 0, `docOverflow` 합 0, `over` 합 0, `pairHeightMismatch` 0. 결과 = `_design/ia_20260911/shots/results.json` |
| titleLines | 1280 소개면 8장 전건 1, 구매면 5장 전건 1 |
| 카드 높이 | 소개면 279.4375px 8장 동일(IA1 과 같은 값), 구매면 328.4062px 5장 동일(IA1 과 같은 값) |
| 여백(measure_edges, 1280) | 홀수 열 카드 131.2 ~ 640, 내용 131.2 ~ 616. 짝수 열 640 ~ 1148.8, 내용 665 ~ 1124.8. IA1 Δ2-R1 적용값 그대로, 좌측 스파인 131.2 유지 |
| 문체 | `studio.html` 등급 A(S1 0, S2 0), `programs/studio.html` 등급 A(S1 0, S2 1 = C-12 쉼표 비율, HEAD 부터 동일). `my.html` 등급 D 는 IA1 기록과 같은 기존 지적이며 본 회차 변경 0줄. 로그 = `_design/ia_20260911/style_gate_ia2.log` |
| 단위 테스트 | `_design/ia_20260911/verify_ia2_buy.mjs` failures=0. `_design/ia_20260910/codex/verify_ia1_buy.mjs` 는 대안 ②를 기대값으로 박은 오라클이라 ① 에서 실패한다(설계된 실패) |
| 회귀 문구 | `12개월` 0건, 산출 본문 가운뎃점 0, em대시 0(`studio.html`, `programs/studio.html`) |

## 6. 자체 검사

AI 슬롭 16뿌리: 그라디언트 0, 드롭섀도 0, 곡률 0, 가짜 3D 0, 이모지 0, 최상급 표현 0, AI 생성 이미지 0(diff 전체에서 `gradient|box-shadow|border-radius|filter:` 매치 0). 낚시 비매칭 계열은 a 로 해소됐다. 라벨 세 개가 모두 자기 목적지를 적는다.
신규 토큰 0(`assets/base.css` diff 에 `--` 정의 추가 0), `:where(body.v2)` 스코프 유지, 괘선 1px 유지, 팔레트 변경 0.

잔상 7축: IA1 Δ 에서 0건이 됐고 본 회차에서 새로 생긴 잔상은 없다. `r3_room` 은 소비자가 사라진 자리에서 원장까지 지웠다(코드에 남은 것은 사유 주석 1줄). g② 의 `unit_prices()` 도 ① 커밋에서 함께 걷어 죽은 함수를 남기지 않았다.

## 7. 남은 항목

1. **「이용권 보기」가 두 목적지를 갖는다.** 8면 보조 링크 「이용권 보기」는 `../programs/studio.html#u-<code>`(소개면)로 가고, a 로 붙인 소개면 카드 ⑥ 「이용권 보기」는 `studio.html?unit=<code>`(구매면)로 간다. 발주가 지정한 후보 문면을 그대로 썼고 8면은 본 회차 범위 밖이라 손대지 않았다. 다음 회차에 8면 문면을 바꾸거나 목적지를 맞추는 판단이 필요하다.
2. **「세트 고르기」와 「지문 고르기」가 같은 목적지를 가리킨다.** 구매면 카드 ⑥ 은 「세트 고르기」, 같은 면 낱권 plan 버튼은 「지문 고르기」이며 둘 다 `#sets` 로 간다. 후자는 IA1 이전부터 있던 문면이고 범위 밖이라 두었다.
3. **d 의 대가.** 공통 인강 plan 의 담기만 sm 이 되어 같은 plan 행의 다른 버튼(지문 고르기 ghost, 응시 단위 고르기 solid)보다 좌우 여백이 8px 씩 작다. 담기 크기 통일을 택한 대가다. 캡처 = `shots/crop_studio_plans_1280.png`.
4. **g 의 선택 미확정.** ①과 ② 중 하나를 critic 이 고른다. ② 를 고르면 `git revert 35b0de7` 이 아니라 `d438cbe` 의 `studio_units.py` 두 곳과 `product_buy.js` 1줄을 되살린다.
5. **현행 유지 3건(결재 C).** b M3 구매면 고아 1칸, e L3 序 번호 두 면 불일치, f Δ2 inset s4 스파인 24px 이탈은 손대지 않았다.
6. **M2' 죽은 여백.** `.r3-unit{grid-template-rows:auto auto 1fr auto}` 의 3행 `1fr` 은 그대로다. h 가 그 행에 두 줄을 넣어 상태 조회가 성공하면 여백이 줄지만, 실패 상태에서는 IA1 과 같다.

## 8. 다음 단계

critic Δ3 재채점(`_design/ia_20260911/CRITIC_VERDICT_IA2.md`)과 audience-proxy 재채점(`AUDIENCE_PROXY_IA2.md`)은 메인 세션이 호출한다. 본 기록은 점수를 매기지 않는다.
