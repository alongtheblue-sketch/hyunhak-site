-- 팝업 공지 발행 SQL (2026-10-07 건우 「팝업 공지 띄우라고」). 상명대 약술형 논술 1일 특강, 이루리학원 특강 페이지로 연결.
-- 사실 원천 = https://iruriedu.kr/news/yaksul-sangmyung-2026/ (일시, 반, 장소, 정원, 교습비를 그 페이지 그대로 옮김)
-- 노출 = 결제, 리더 화면을 뺀 전 면, 세션당 1회 (app.js attemptStage). 종료 = ends_at 10-09 15:00 KST 에 /api/notices/active 에서 빠진다.
-- 실행 (hyunhak-api 리포에서):
--   cd ~/Workspace/hyunhak-api && env -u NODE_OPTIONS -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy NO_PROXY='*' \
--     npx wrangler d1 execute hyunhak --remote --file=../hyunhak-site/_docs/notice_popup_sangmyung_20261007.sql
-- 확인: curl -s 'https://api.hyunhak.com/api/notices/active?kind=popup'   (공개 캐시 60초)
-- 되돌리기: UPDATE notices SET status='archived', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id='ntc_1007sm01';
INSERT INTO notices (id, kind, title, body_md, link_url, link_label, starts_at, ends_at, priority, status, pinned, created_at, updated_at)
SELECT 'ntc_1007sm01', 'popup',
  '상명대 약술형 논술 1일 특강',
  '10월 30일, 31일 상명대 논술과 같은 문항 수, 배점, 시간으로 계열별 실전 모의고사를 두 번 보고 1:1 개별 답안 첨삭을 받는 하루 수업입니다.

**일시** 10월 9일 금요일 오후 3시부터 10시까지
**반** 인문반(국어 8, 수학 2), 자연반(국어 2, 수학 8)
**장소** 대치동 이루리학원 4관(도곡로 440, 3층)
**정원** 반당 12명, 선착순 마감
**교습비** 270,000원',
  'https://iruriedu.kr/news/yaksul-sangmyung-2026/', '특강 안내 보기', NULL, '2026-10-09T06:00:00.000Z', 50, 'published', 1,
  strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM notices WHERE id = 'ntc_1007sm01');
