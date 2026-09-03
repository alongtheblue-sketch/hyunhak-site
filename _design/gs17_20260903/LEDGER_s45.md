# s45 원장, §GBSTD-20260904-L 법률 4건 집행 (2026-09-04 07:31~)

> 결재 = 건우 07:31 "모두 권고사항대로 GO". 처분 원칙 = 각 항목 권고안 그대로. 권고 문언이 "변호사 확인 뒤 공지, 발송" 이라 외부로 나가는 행위(약관 본체 게시, 공지, 교육지원청 발송)는 준비 완료 상태로 멈추고 변호사 회신을 기다린다.
> 배포 축(트리거 next ①)은 02:44 다른 세션(현학_고객센터 s6)이 895c917 로 끝냈고 라이브 19/19 채증까지 s44 §5 에 있다. 본 세션 라이브 재확인 = `_gen.txt` 895c917 (07:33). 이후 HEAD 는 23c6dc5(배포 게이트 v2.1, 타 세션).
> GS-21(절정 위치)은 권고가 보류라 보류 유지.

## 0. 요약

| 항목 | 권고 | 집행 | 남은 사람 손 |
|---|---|---|---|
| GS-16-1b 약관 6조 1항 | ① 약관 개정(변호사 확인 뒤 공지) | 멱등 패처 + 초안 + 공지 초안 + 라이브 채증 스크립트. terms.html 본체 무변경 | 변호사 회신 → `--apply --publish-date P` → 배포 → 공지 게시 → verify_live |
| GS-16-2 학원법 등록 대상성 | ① 변호사 확인 + 교육지원청 서면 유권해석 | 의뢰서 2부 + 질의서 초안 PDF 2면 | 건우 [확인 필요] 3자리 기입, 변호사 확인, 발송 |
| GS-16-3 13년차 실증 | 준비 착수 | census 생성기 + 체크리스트 + 연차 산정표 CSV + evidence/ gitignore | 건우 실증자료 5종 수집, CSV 날짜 기입 |
| GS-19 약관 8조 | ① 3문장 보완안, 변호사 문안 확인 | 같은 패처에 편입, 의뢰서 1부 §3~4 | 변호사 문안 확정 |

## 1. 산출 파일

- `_docs/terms_amend_20260904/` = patch_terms_20260904.py (selftest: 앵커 3 old, 멱등, 토큰 3, 대조군 2 PASS) / terms_draft_20260904.html(자리값 P=09-10, 시행 09-17) / notice_body.md / verify_live.sh / README.md(게시 6단계 SOP)
- `_docs/lawyer_pack_20260904/` = source_review.html → 현학적연구소_약관개정_학원법_실증_검토의뢰_20260904.pdf **5면 260KB** / source_inquiry.html → 현학적연구소_교육지원청_유권해석_질의서_20260904.pdf **2면 91KB** / build.py(08-31 빌더 범용화, style_frag.css 승계, Pretendard 서브셋 임베드, 글리프 결손 fail closed)
- `_docs/substantiation_13yrs_20260904/` = census_claims.py → claims_census.md, .json(연차 203, 지역 183, 학력 8, 경력 8, 직위 2 / 41파일. 주소 표기 3종 제외 후) / checklist.md / tenure_table.csv / .gitignore(evidence/)
- `_design/gs17_20260903/LEDGER_s45.md` (본 파일)

## 2. 검증

- 패처 자기검사 PASS + `--check` 로 terms.html 상태 {6_1 old, 8 old, ver ok}, `git status terms.html` 변경 0.
- 문체 게이트(style_gate scan --gate-only --profile deliverable) 5문서 **전부 등급 A, S1 0**. 1차 스캔은 가운뎃점 K-1 41건, em대시 K-2 3건, 대구 C-8 2건 → 법령 정식 명칭은 법제처 표기 ㆍ(U+318D), 2항목은 와/과, 나머지 쉼표, 대구 2문장 재서술, 공지 장문 1문장.
- PDF 픽셀 채증 = 의뢰서 1, 2면, 질의서 1면 PNG 열람(표 조판, Pretendard 임베드 정상). GA 태그 잔존 0.
- 실물 상품 census: products_status.json 78종 = digital 38, digital_file 38, bundle_file 1, bundle_view 1 → 실물 0. 사이트 "미훼손, 미개봉" 잔존 0(checkout 교체 후).
- 법률 에이전트(legal-contract-privacy-analyst) 교차 검토 = 조문 인용 5축, 결과는 §4.

## 3. 곁다리 수리 (커밋 포함)

- `checkout.html` 환불 안내 "수령 7일 이내 미훼손 기준" → 17조 2항 1호 단서 문안. 실물 품목이 담길 때만 표시(현재 노출 0).
- 빌드 주입기 3종(apply_analytics, apply_fonts, apply_noscript_rv) skip 에 `_docs/` 추가. 08-31 의뢰서 HTML 에 GA 태그가 박혀 있던 원인. 재실행 시 08-31 파일 바이트 불변(acdd7e3f).
- 약관 문서 버전 줄이 09-03 6조 4항 개정을 안 따라옴(2026-09-01 그대로). 패처가 시행일로 갱신하고 개정 공지일을 병기. 09-03 개정분 사후 공지는 의뢰서 1부 §4(c).
- s44 메모의 "13년차" 게재 목록이 programs/yonsei, korea, studio 와 b2b 를 빠뜨림 → 정적 목록 대신 census 생성기.

## 4. 법률 에이전트 교차 검토 결과

(에이전트 회신 뒤 기입)
