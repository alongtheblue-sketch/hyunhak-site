# SPEC — hyunhak_guidebook_site_contract

**생성**: 2026-08-27 15:59 (KST)
**세션**: specgate
**PM**: 메인 세션 `/root`
**분기 sub-agents**: Architect contract review, SEO manifest audit, QA gate, Security gate, Spec gate

## 1. 요구사항 (원문 인용)

> 저장소 /Users/gregory/Workspace/hyunhak-site (git main. **커밋하지 말 것** — 내가 검토 후 커밋한다). 참조 저장소(읽기 전용, 쓰기 금지): /Users/gregory/Workspace/interview_guidebook_2027 — 가이드북 빌드 파이프라인. 새 원류 계약 = `export/site/<대학>.json`, 스키마 = `export/site/_SCHEMA.md`. 지금 들어 있는 파일은 `"_stub": true` 계약 검증용 임시본이라 followups/label/ans 값이 얕다. 형식만 믿고 값은 실측 근거로 쓰지 말 것.
>
> 목표: 가이드북 상세페이지와 홈에서 (1) 출처 표기 전량 제거 (2) 통계 수치(실제 질문 N건, 전환 규칙 N개, 질문 유형 N종, N면, 미리보기 N면, 꼬리질문 N세트, 규칙 1,790개) 전량 제거 (3) 데이터 원천을 build/*.json 직접 읽기에서 export/site/<대학>.json 으로 교체 (4) 미리보기 생성기 입력 경로를 가이드북 저장소 산출로 교체. 판매 문구, 가격(33,000), 구매 흐름, 팝업, 공손체는 불변.
>
> 변경 목록:
> A. `_tools/build_guidebook.py`
>  - extract(): `<src>/export/site/<univ>.json` 을 읽는다(없으면 예외로 중단, build JSON 폴백 금지). samples = 유형별 첫 질문(`qgroups[].items[0].q`), 최대 SAMPLE_MAX 유지, `source` 필드 폐지. SOURCE_MAP, SOURCE_FALLBACK, source_label, source_doc, sources_n 제거. 내부 카운트(questions, types_n, pages)는 catalog 에 남겨도 되나 템플릿에 노출하지 않는다.
>  - build: lede(348-349 부근)를 수치 없는 문장으로 — "{name} 면접에서 실제로 나온 질문과, 내 생기부에서 질문을 뽑는 전환 규칙. 선배 후기 {years} 관측과 2027 공식 요강으로 재구성한 현학적 연구소 편집본." / samples 의 `<span class="src">출처: …</span>` 제거 / 템플릿에서 사라지는 치환 키(__QUESTIONS__ __RULES__ __TYPES_N__ __PAGES__ __PV_N__)는 dict 에서도 제거하고, placeholder 잔존 검사(기존 게이트가 하면 그대로, 없으면 build 끝에 `__[A-Z_]+__` grep 0 단언 추가).
>  - `refresh` 를 `--src ~/Workspace/interview_guidebook_2027` 로 실행해 catalog 의 samples 에서 source 가 사라지게 한다(price 33000·onsale 은 기존 값 보존이 코드에 있음을 확인).
> B. `_tools/guidebook_page_v3.html`
>  - spec 리스트(113-119): "실제 질문 | 선배 후기 __YEARS__ 관측, 유형별 수록" / "전환 규칙 | 내 생기부에서 질문 뽑기, 꼬리질문까지" / "전형 분석 | 전형별 제원, 형태 판정표" / "형태 | PDF, 브라우저 보안 리더" / 인쇄 행 유지
>  - facts 섹션(127-136) 통째 삭제
>  - 140 h2 "지면 미리보기" / 152 p "표지의 차례 그대로입니다." / 172 h2 "질문 유형", p "실제 나온 질문을 이 유형들로 나눠 싣습니다." / 179 p "유형별 첫 수록 질문." / 183 "전체 질문과 유형 해설은 책 본문에." / 187 h2 "전환 규칙, 이 책의 본론" / 191 "규칙의 질문 틀과 실제 질문, 꼬리질문은 본문에서. 위 미리보기 지면에 흐림 처리로 실려 있습니다."
>  - `.facts` 전용 CSS 가 있으면 제거(다른 곳에서 쓰면 유지)
> C. `index.html` (빌드 대상 아닌 수기 원천)
>  - mini 카드(139-141)의 `<span class="m">N면, N문항</span>` 삭제, 레이아웃이 깨지면 CSS 보정
>  - 배지 "15권 판매 중"(136, 191) → "38권 판매 중", 143 "판매 15권, 준비 중 23권" → "38개 대학 전권 판매 중" — `_tools/guidebook_catalog.json` 의 onsale 이 전권 true 인지 실측하고 반영
>  - 197 "생기부에서 질문 뽑는 규칙 1,790개" → "생기부에서 질문 뽑는 규칙"
>  - 503 tile(): `o.pages+'면, '+o.q+'문항'` 을 "2027학년도 대비" 로 대체(HH_GB 의 pages/q 데이터는 남겨도 화면에 찍지 않는다)
> D. `_tools/seo_manifest.json` + `_tools/seo_manifest_init.py`: 가이드북 항목의 answer/description/price 문구에 "N건", "N개", "N면", "출처" 가 있으면 자연스러운 문장으로 제거. 변경 건수 보고.
> E. `_tools/build_previews.py`: PDF_DIR → `/Users/gregory/Workspace/interview_guidebook_2027/dist_hyunhak_protected` (파일명 `<대학>_2027면접가이드북.pdf`), HTML_DIR → `/Users/gregory/Workspace/interview_guidebook_2027/out2` (`<대학>_H.html`). 60행 부근 `class="cvstat"` 정규식으로 questions/rules 를 뽑는 로직은 삭제하고 `export/site/<대학>.json` 의 counts 를 쓴다(meta_v3 내부 필드). 슬러그↔대학명은 build_guidebook.SLUGS 그대로. `--dry` 로 38교 경로 해석이 전부 성공하는지만 확인(실제 렌더 금지 — PDF 는 곧 재빌드된다).
> F. `_tools/live_smoke.py`: guidebook/snu 검사에 추가 — 본문에 "출처:" 없음, "실제 나온 질문" 없음, 정규식 `\d+면,` 없음, `class="facts"` 없음. 홈 index 검사에 "15권" 없음.
> G. 빌드: `bash _tools/build_all.sh` → v2_check fails=0, seo_check FAIL 0 실측. 생성된 guidebook/*.html 38면 + guidebook/index.html + index.html 에서 grep 실측: "출처:" 0, "실제 나온 질문" 0, `[0-9]+면,` 0, "전환 규칙 [0-9]" 0, "15권" 0, "16,500" 0.
>
> 보고(40줄 이내): 파일별 변경 요지 / build_all 마지막 5줄 verbatim / G grep 실측 / D 변경 건수 / 미해결. 커밋하지 않는다.

## 2. 복잡도 판정 + 활성 롤

- 등급: L
- 가산점: 읽기 전용 외부 저장소 계약 연동, 38개 대학 산출물 재생성, SEO/미리보기/회귀 게이트 연계
- 활성 롤: PM / Architect / Developer / QA / Security / Spec
- 모드: 분기

## 3. 설계 결정 (Architect lock)

- Architect 판정: `LOCK_APPROVED`.
- 가이드북 원류는 `<src>/export/site/<대학>.json` 단일 계약으로 고정하며, 누락 시 즉시 중단하고 `build/*.json` 폴백은 허용하지 않는다.
- UI에는 질문·규칙·유형·면수 등의 통계를 노출하지 않되, catalog/meta 내부 호환 필드는 유지한다.
- B의 `실제 나온 질문` 문구와 G의 동일 문자열 0건 게이트가 충돌하므로, 의미와 공손체를 유지한 `실제로 나온 질문`으로 기술 보정한다.
- 미리보기 입력은 참조 저장소의 protected PDF, out2 HTML, export counts로 고정하고 `--dry`는 경로 해석만 수행한다.
- 판매 문구·가격 33,000원·SKU·구매 흐름·팝업 계약은 보존한다.

## 4. 구현 변경점 (파일별 diff 요약)

| 파일 | +라인 | -라인 | 핵심 변경 |
|---|---:|---:|---|
| 소스 8개 (`_tools/build_guidebook.py`, `build_previews.py`, catalog, 템플릿 2개, smoke, SEO 2개) | 1,277 | 5,238 | export/site 계약, 무통계 UI/SEO, dry 경로 검증, smoke 게이트 반영 |
| `guidebook/*.html` 39개 | 1,066 | 1,636 | 상세 38개와 허브 재생성, 출처·통계 표기 제거 |
| `index.html` | 18 | 31 | 전권 판매 상태와 무통계 카드/문구 반영 |
| `llms.txt`, `llms-full.txt` | 40 | 40 | 재빌드 결과와 SEO 문구 동기화 |

## 5. QA 결과

- 3종 테스트: happy PASS (`build_all`) / boundary PASS (38개 export·PDF·HTML 경로와 sample 상한) / failure PASS (원류 누락 시 예외, 폴백 없음)
- 회귀: PASS — 가격 33,000원, SKU/카트/구매 팝업 계약 유지
- SEO: PASS — `FAIL 0`, `WARN 3`(reader noindex 의도값)
- v2: PASS — `fails=0`
- G grep: PASS — 6개 금지 패턴 각각 0건
- 성능: 실제 미리보기 렌더는 사용자 지시대로 생략, dry에서 `render=0`, `writes=0`
- 게이트 6.1: PASS

## 6. Security 검토

- 활성: L급이므로 필수 검토 완료
- 시크릿 노출: 0건
- 외부 API 키 처리: N/A (외부 API 및 키 사용 없음)
- 참조 저장소: 읽기 전용 접근만 수행
- 입력 안전성: shell injection 경로 없음, 대학명/슬러그 매핑은 고정 상수 사용
- 상거래 계약: 가격·SKU·카트·구매 흐름 유지
- 게이트 6.2: PASS

## 7. 알려진 한계 / Follow-up

- `export/site/*.json`은 현재 `_stub:true` 계약 검증본이므로 내부 값은 실측 근거로 간주하지 않는다.
- PDF 재빌드 전이므로 실제 preview 렌더는 수행하지 않았으며, 사용자 지시대로 38개 입력 경로의 dry 검증만 수행했다.
- Follow-up: 사용자 검토 후 사용자가 직접 커밋한다.

## 8. 재현 명령어

```bash
cd /Users/gregory/Workspace/hyunhak-site
python3 _tools/build_guidebook.py refresh --src ~/Workspace/interview_guidebook_2027
/Users/gregory/venvs/pdfbuild/bin/python _tools/build_previews.py --dry
bash _tools/build_all.sh
for pattern in '출처:' '실제 나온 질문' '[0-9]+면,' '전환 규칙 [0-9]' '15권' '16,500'; do
  rg -o --pcre2 "$pattern" index.html guidebook/*.html | wc -l
done
```
