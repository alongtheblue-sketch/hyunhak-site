**REVISE.** `8f9afab..842bcf7`의 98파일을 읽기 전용 검토했습니다. 아래 집계는 기존 결함 승계와 인수조건 미충족을 포함하며, 동일 원인은 중복 계산하지 않았습니다.

| 축 | 판정 | 근거 파일:줄 | 수정 제안 1줄 |
|---|---|---|---|
| 1. 구매 계약 | **PASS** | [product_buy.js:17](/Users/gregory/Workspace/_wt/hh-r2/assets/product_buy.js:17): 가이드북 31개·전권·5개 pass·공통 인강의 SKU/명칭/정가 일치, `ship:false`, 불필요한 `set_id` 없음. [studio.html:567](/Users/gregory/Workspace/_wt/hh-r2/studio.html:567)이 unit과 `#sets`를 처리. 비회원 담기 후 결제에서 로그인 요구. 계약 테스트 10/10. | 없음. |
| 2. 사실 회귀 | **PASS** | [r2_copy.json:2](/Users/gregory/Workspace/_wt/hh-r2/_tools/r2_copy.json:2) 135항목에서 원장 밖 신규 주장·RD-4 미확정 대안 단정 없음. 단위명 5개는 [studio.html:411](/Users/gregory/Workspace/_wt/hh-r2/studio.html:411)과 일치. | 없음. |
| 3. 보존 바이트 | **PASS** | 66면 title/meta, canonical·JSON-LD·분석 블록 각 65개, 폰트 323개, 사업자 주소 62개 동일. [terms.html:96](/Users/gregory/Workspace/_wt/hh-r2/terms.html:96)·privacy 본문, checkout 전체, robots/sitemap/llms, promo 원천·가격, 인강 본문, 404 수습 파일 모두 보존. [index.html:108](/Users/gregory/Workspace/_wt/hh-r2/index.html:108) 가격표도 이동 전후 동일. | 없음. |
| 4. SEO | **REVISE(p1)** | FAQ JSON-LD/가시 문답이 홈 **6/4**, 가이드 상세 **10/3**, 스튜디오 상세 **9/3**으로 불일치. [index.html:30](/Users/gregory/Workspace/_wt/hh-r2/index.html:30)↔129, [guidebook.html:31](/Users/gregory/Workspace/_wt/hh-r2/programs/guidebook.html:31)↔146, [studio.html:31](/Users/gregory/Workspace/_wt/hh-r2/programs/studio.html:31)↔100. 삭제한 출처·환불·첨삭 주장도 JSON-LD에 남음. 변경 57면 H1·정적 링크/앵커 정상; programs 4면 재생성 연결 정상. | 보존 요구를 조정하고 본문·JSON-LD를 같은 문답 원천에서 생성. |
| 5. 접근성·동작 | **REVISE(p1, 기존 결함 승계)** | [app.js:74](/Users/gregory/Workspace/_wt/hh-r2/assets/app.js:74)가 저장 예외를 삼킴. 실제 함수에 저장 실패를 주입하자 `ok:true, cart:[]`; [product_buy.js:48](/Users/gregory/Workspace/_wt/hh-r2/assets/product_buy.js:48)은 성공 안내. 라벨·DOM 순서·가격 렌더 배선 정상. 무JS에서는 주버튼 disabled, 보조 목록 링크 유지. | `APP_JS_REQUEST`로 저장 실패를 반환하도록 제안하고 실제 HH 함수 실패 테스트 추가. |
| 6. 셸 파급 | **PASS(지정 예외)** | 새 GNB/탭 **55면**, 기존 **7면**, 공통 내비 없음 **4면**. [v2_shell.py:277](/Users/gregory/Workspace/_wt/hh-r2/_tools/v2_shell.py:277)의 7면은 파일 무변경 지정에 따른 제외이며 상단 한자도 남음. about·푸터 한자는 보존. ft-compact는 줄바꿈·접기 구조 유지. | 66면 통일을 원하면 보호면의 셸 변경 범위를 먼저 명시. |
| 7. 요구 5개 | **REVISE(p2)** | **두 카드 동격·학원 신뢰·상세면 우선(지정 예외)·구매 상단 충족. 카피 전면은 미충족.** [index.html:91](/Users/gregory/Workspace/_wt/hh-r2/index.html:91), [IMPL_REPORT.md:20](/Users/gregory/Workspace/_wt/hh-r2/_design/redesign_20260909/IMPL_REPORT.md:20): 공개 8면·템플릿 2개가 기존 C/D로 남아 A/B 인수조건 실패. | 수정 가능한 본문은 재작성하고 바이트 보존 문구는 검사 예외 범위를 명시. |

후속 브라우저 기록은 동격·상단 CTA·넘침 검사를 통과했지만 로컬 CORS로 콘솔 검사 126건이 실패했습니다. 할인 적용 상태와 인증 동작의 브라우저 검증은 미확정입니다.

FAQ 리치결과는 [2026-05-07 종료](https://developers.google.com/search/updates)됐습니다. 위 SEO 지적은 현재 [일반 구조화 데이터 정책](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)의 가시 본문 일치 조건에 근거합니다.

X1_DONE verdict=REVISE p0=0 p1=2 p2=1