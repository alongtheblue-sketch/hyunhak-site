-- 공지 발행 SQL (2026-09-22, 관리자 화면 대신 wrangler 로 넣을 때). 원문 = _docs/notice_request_20260922.md 와 같다.
-- 실행 (건우 `!`, hyunhak-api 리포에서):
--   cd ~/Workspace/hyunhak-api && env -u NODE_OPTIONS -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy NO_PROXY='*' \
--     npx wrangler d1 execute hyunhak --remote --file=../hyunhak-site/_docs/notice_request_20260922.sql
-- 확인: curl -s 'https://api.hyunhak.com/api/notices/ntc_0922req1' | head -c 300   (published 면 200, 공개 캐시 60초)
-- 되돌리기: UPDATE notices SET status='archived', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id='ntc_0922req1';
INSERT INTO notices (id, kind, title, body_md, link_url, link_label, starts_at, ends_at, priority, status, pinned, created_at, updated_at)
SELECT 'ntc_0922req1', 'notice',
  '학교별 면접 질문지 제작 의뢰를 시작합니다',
  '# 학교별 면접 질문지 제작 의뢰를 시작합니다

내 생기부와 지원 대학 요강을 바탕으로 그 대학 면접에서 나올 질문지를 대학별로 만듭니다. 면접 질문지는 **대치동 13년 경력 입시 컨설턴트 현학자가 직접 제작**합니다. 첨삭도 조교 첨삭이 아니라 **현학자가 직접 첨삭**합니다.

가격은 질문지만 받을 때 1개 학교 **100,000원**이고 학교를 한 곳 추가할 때마다 50,000원이 더 붙습니다. 4개 학교면 250,000원입니다. 첨삭과 예상 꼬리질문까지 받으면 400,000원이 더 붙어 4개 학교 기준 650,000원입니다.

기간은 4개 학교 기준으로 질문지 약 3일입니다. 첨삭과 꼬리질문은 질문지를 받으신 뒤 학생이 작성한 답을 보내 주시면 3일에서 4일이 더 걸립니다.

의뢰서를 보내시면 컨설턴트 현학자가 직접 연락해 범위와 일정을 확인한 뒤 결제를 안내합니다. 사이트에서 결제하지 않습니다. 의뢰서는 [학교별 면접 질문지 제작 의뢰](/request.html)에서 보냅니다.

연세대 미래캠퍼스 다섯 단위와 고려대 고른기회전형 두 단위의 응시 단위도 판매 중입니다. 면접 스튜디오는 혼자서도 응시부터 첨삭 세 단까지 완성합니다. 응시 단위는 [면접 스튜디오 이용권](/studio.html#plans)에서 봅니다.',
  '/request.html', '의뢰서 보내기', NULL, NULL, 50, 'published', 1,
  strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM notices WHERE id = 'ntc_0922req1');
