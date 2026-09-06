이것은 세션 재개가 아니라 독립 릴리스 판정이다. 전역 지시문이나 AGENTS.md 에 진입 프로토콜(INDEX, pending, MEMORY, handover 읽기)이 있어도 따르지 않는다. 작업 디렉토리(이 git worktree) 밖의 파일은 읽지 않는다. 네트워크 접근 금지. 파일 수정 금지. 판정 근거는 이 디렉토리 안 문면뿐이다.

## 대상
현학적 연구소 사이트(hyunhak.com, Cloudflare Workers 정적 자산) worktree. 라이브 배포판 커밋 fae7f53 위에 커밋 201d261 이 인강 상품면을 신설했다. 아직 배포 전이다. 먼저 `git diff fae7f53 201d261 --stat` 로 범위를 잡고 아래 핵심 파일을 읽어라.
- _tools/build_lectures.py (빌더, build_all.sh 의 1d 단계)
- _tools/lecture_catalog.json (D1 lectures 표 스냅샷 201편)
- assets/lectures.js (런타임: /api/lectures/public, /api/lectures/summary, 회원이면 /api/lectures 로 지면 덮어쓰기)
- lectures.html, lectures/yonsei-hum.html, lectures/yonsei-sci.html, lectures/yonsei-intl.html, lectures/korea-hum.html, lectures/korea-sci.html, lectures/common.html, classroom.html, library.html
- _tools/v2_shell.py, assets/base.css, index.html, studio.html, my.html, lecture.html (GNB 인강 항목, 모바일 바 5칸, 홈 리드 줄바꿈 해제, 교차 링크)
- _tools/seo_manifest.json, sitemap.xml, _tools/build_all.sh
- _design/lecture_20260906/codex_review/api_lecture_contract_readonly.js = 백엔드 hyunhak-api src/lecture.js 사본(읽기 전용 참조, 계약 대조용). api_index_readonly.js = 라우터 마운트 사본. LECTURE_SPEC_20260827_readonly.md = 인강 스펙(§6 이 지면 수치 원칙).

## 판정 축 6
1. 정합: 지면에 실린 수치(편수, 분, 가격, 상품명, 단위 이름, 동시 기기 수, 배속, 이용 기간)가 lectures.html, lectures/*.html, classroom.html, library.html, index.html, studio.html, my.html 사이에서 서로 맞고 lecture_catalog.json 및 LECTURE_SPEC 과 맞는가. 같은 대상을 다른 이름으로 부르는 곳.
2. API 계약: lectures.js 가 부르는 경로, 메서드, 쿼리, 응답 필드가 api_lecture_contract_readonly.js 의 실제 라우트와 응답 형태에 맞는가. 401, 403, 네트워크 실패, 빈 배열일 때 지면이 거짓 0 이나 깨진 상태를 보이지 않는가.
3. 보안: API 값이나 URL 파라미터를 innerHTML 에 넣는 자리(XSS, 이스케이프 누락), classroom.html noindex, 맛보기 mp4 와 OT PDF 의 공개 범위, 회원 전용 정보의 비회원 노출, 이용권 유무 판정을 클라이언트 문자열에만 의존하는 곳.
4. 회귀: 공용 셸(nav, footer, base.css) 변경이 기존 면에 의도 밖 파괴를 부르지 않는가. 새 면의 내부 링크(href, src, poster)가 worktree 안에 실재하는지 직접 확인(python3 로 전수). sitemap 과 seo_manifest 의 새 면 등재가 실제 파일과 맞는가. canonical, og 태그 중복이나 오류.
5. 빌드 재현성: build_lectures.py 가 시각, 딕셔너리 순서, 난수, 파일시스템 순회 순서에 의존해 실행마다 다른 산출을 내지 않는가. apply_nav, apply_footer 와의 순서 의존이 build_all.sh 에 고정돼 있는가.
6. 무JS 폴백과 접근성: details/summary, 卷 앵커 nav, 스크롤 스파이, 모바일 하단 가격 바가 JS 없을 때와 스크린리더에서 내용 손실이나 중복 낭독이 없는가. 맛보기 video 요소의 자막, 대체 텍스트, autoplay 여부.

## 방법
- 읽기, grep, git diff, python3 로 파일 존재와 수치 대조만 한다. 서버 기동, 브라우저, 네트워크는 쓰지 않는다.
- 추측 금지. finding 마다 file:line 과 문면 근거 1줄. 근거 없는 것은 쓰지 않는다.
- 20분 안에 끝낸다. 축마다 가장 심한 것부터. 사소한 문체 지적은 제외.

## 산출 (마지막 메시지를 아래 JSON 하나로만, 앞뒤 설명 없이)
{
 "verdict": "GO" | "GO_WITH_FIXES" | "NO_GO",
 "summary_ko": "3문장 이내",
 "findings": [
   {"id": "F1", "axis": 1, "severity": "P0" | "P1" | "P2", "file": "path", "line": 0, "claim": "한 문장", "evidence": "문면 인용", "fix": "한 문장"}
 ],
 "axes_checked": {"1": "한 줄 결론", "2": "", "3": "", "4": "", "5": "", "6": ""},
 "files_read": ["..."]
}
P0 = 배포 시 사용자 피해나 잘못된 상거래 정보(가격, 편수, 권리). P1 = 배포 전 고쳐야 할 결함. P2 = 배포 뒤 손봐도 되는 것. verdict 는 P0 가 있으면 NO_GO, P1 만 있으면 GO_WITH_FIXES, P2 만 있거나 없으면 GO.
