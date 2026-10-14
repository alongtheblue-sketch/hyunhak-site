-- 이용약관 개정 공지 (제8조의2 제1항 열람권 인쇄, 2026-10-12 건우 결재). 시행 2026-11-16 00:00 KST.
-- 약관 제3조 제2항 = 이용자에게 불리한 개정은 적용일 30일 전부터 공지. 초일 불산입으로 공지일 + 31일 = 시행일이다.
-- 당초 공지 10-13, 시행 11-13 이었으나 10-13 안에 실행되지 않아 시행을 11-16 으로 미뤘다 (2026-10-14). 파일 이름과 id 는 처음 것 그대로다.
-- 그래서 이 SQL 은 늦어도 2026-10-16 23:59 KST 안에 실행한다. 그보다 늦으면 시행일을 다시 미루고 API VIEW_PRINT_UNTIL, 약관, 사이트 문구, 이 SQL 을 함께 바꾼다.
-- 사이트 약관(terms.html#addenda) 을 먼저 배포한 뒤 실행한다. 팝업 링크가 그 자리를 가리킨다.
-- 행 2개: 팝업(시행일 24:00 KST 까지 노출, 세션당 1회) + 공지 목록 고정(무기한).
-- 실행 (hyunhak-api 리포에서, 건우 !):
--   cd ~/Workspace/hyunhak-api && env -u NODE_OPTIONS -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy NO_PROXY='*' \
--     npx wrangler d1 execute hyunhak --remote --file=../hyunhak-site/_docs/terms_amend_20261012/notice_terms_print_20261013.sql
-- 확인: curl -s 'https://api.hyunhak.com/api/notices/active?kind=popup' 와 '?kind=notice' (공개 캐시 60초)
-- 되돌리기: UPDATE notices SET status='archived', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id IN ('ntc_1013tp01','ntc_1013tn01');
INSERT INTO notices (id, kind, title, body_md, link_url, link_label, starts_at, ends_at, priority, status, pinned, created_at, updated_at)
SELECT 'ntc_1013tp01', 'popup',
  '이용약관 개정 안내: 11월 16일부터 구매한 열람권은 인쇄 없음',
  '2026년 11월 16일 0시(한국 시간)부터 구매한 가이드북 열람권(보안 리더 열람판, 낱권과 전권)은 인쇄를 제공하지 않습니다.

그 전에 구매한 열람권은 열람 기간이 끝날 때까지 권당 3회 인쇄할 수 있습니다. PDF 소장판은 각인 PDF 파일 발급과 보안 리더 인쇄 권당 3회가 그대로입니다.

현행: 인쇄는 권당 3회까지 가능합니다.
개정: 인쇄는 보안 리더에서 권당 3회까지 할 수 있습니다. 다만 2026년 11월 16일 0시(한국 시간)부터 구매한 열람권은 인쇄를 제공하지 않습니다.

이용약관 제8조의2 제1항 개정, 시행일 2026년 11월 16일(약관 제3조 제2항, 30일 전 공지).',
  '/terms.html#addenda', '개정 약관 보기', NULL, '2026-11-16T15:00:00.000Z', 40, 'published', 1,
  strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM notices WHERE id = 'ntc_1013tp01');

INSERT INTO notices (id, kind, title, body_md, link_url, link_label, starts_at, ends_at, priority, status, pinned, created_at, updated_at)
SELECT 'ntc_1013tn01', 'notice',
  '이용약관 개정 안내 (제8조의2 제1항 열람권 인쇄), 2026년 11월 16일 시행',
  '현학적 연구소 이용약관 제8조의2 제1항을 아래와 같이 개정하고 부칙을 신설합니다. 개정 규정은 2026년 11월 16일 0시(한국 시간)부터 적용됩니다(약관 제3조 제2항).

1. 제8조의2 제1항 (가이드북 열람 서비스)

현행: 가이드북은 파일을 전달하지 않고 웹 열람 방식으로 제공하며, 구매한 계정으로만 열람할 수 있습니다. (중략) 인쇄는 권당 3회까지 가능합니다.

개정: 가이드북 열람권(상품면의 보안 리더 열람판, 낱권과 전권)은 파일을 전달하지 않고 웹 열람 방식으로 제공하며, 구매한 계정으로만 열람할 수 있습니다. (중략) 인쇄는 보안 리더에서 권당 3회까지 할 수 있습니다. 다만 2026년 11월 16일 0시(한국 시간)부터 구매한 열람권은 인쇄를 제공하지 않습니다.

2. 부칙 신설

시행일: 제8조의2 제1항의 개정 규정은 2026년 11월 16일부터 시행합니다.

경과조치: 시행 전에 구매한 열람권은 열람 기간이 끝날 때까지 종전 규정에 따라 권당 3회 인쇄할 수 있으며, 시행 후에 열람을 시작한 경우에도 같습니다. 구매 시점은 주문을 생성한 때와 이용권이 지급된 때 중 이른 때로 합니다.

3. 바뀌지 않는 것

PDF 소장판의 각인 PDF 파일 발급과 보안 리더 인쇄 권당 3회, 열람 기간(구매일부터 3개월), 동시 열람 3개 세션, 청약철회 조건은 그대로입니다.

개정 사유: 열람권을 보안 리더 화면 열람 상품으로 정리하고 인쇄와 파일이 필요한 이용은 PDF 소장판으로 제공하기 위한 개정입니다. 이용자에게 불리한 개정이므로 적용일 30일 전에 공지합니다.

문의: admin@hyunhak.com',
  '/terms.html#addenda', '개정 약관 보기', NULL, NULL, 40, 'published', 1,
  strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM notices WHERE id = 'ntc_1013tn01');
