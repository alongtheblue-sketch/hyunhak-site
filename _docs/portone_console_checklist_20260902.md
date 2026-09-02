# 포트원 콘솔 세팅 점검표 (2026-09-02 12:1x 실측)

> 목적: 바로오픈 개통 통보가 오면 콘솔 미비로 하루를 잃지 않도록, 문서 기준 필수 항목을 콘솔 실측으로 전건 판정한다.
> 실측 도구 = gunwoobrowser(로그인 상속, 읽기 + 가역 설정 1건만 집행). 채증 = `pg_evidence_20260902/` JPG 3장.
> 판정 어휘 = 완료 / 진행중 / 대기 / 결재필요 / 해당없음. 미판정 0.

| # | 항목 | 근거 문서 | 현재값 (실측) | 판정 | 조치 |
|---|---|---|---|---|---|
| 1 | 사업자 정보 | console/guide/reg | 대표자, 사업자번호 293-38-01827, 주소, 업태/종목, 개인사업자, 등록증 첨부, 판매품목 "디지털북, 웹툰 / 교육", 웹 서비스, 월 1억 미만 | 완료 | 없음 |
| 2 | 서비스 URL | 심사 요건 | https://hyunhak.com | 완료 | 없음 |
| 3 | 관리자 계정 | console-account | 1명, Admin(Owner) | 완료 | 추가 계정 불요 |
| 4 | 2단계 인증(OTP) | console-account "2차인증(OTP) 등록 가능" | 내 정보 관리 = 비밀번호 재확인 벽, 세션 미확인 | 결재필요 | PC-4 건우 직접 확인·등록 권고 |
| 5 | 긴급 연락처 | 콘솔 설정 | 재무/개발 담당자 현건우, 09-01 20:01 갱신, 직책 공란 | 완료 | 직책은 선택 |
| 6 | 하위 상점 | 콘솔 설정 | 없음 | 해당없음 | 단일 상점 |
| 7 | 요금제 | subscription/opi | Free(월 거래 5천만 원까지 무료), 결제 담당자 등록 | 완료 | 없음 |
| 8 | 채널 (테스트) | console/guide/channel-manage | 이니시스 테스트, inicis_v2, INIpayTest, 채널키 = 라이브 /api/config channelKey 와 동일 | 완료 | 없음 |
| 9 | 채널 (실연동) | channel-manage, pg/v2/inicis-v2 | 등록된 채널 없음 | 대기 | PC-3 개통 후 실 MID 로 추가(과세구분 과세) |
| 10 | Store ID | integration/ready | store-84534eb1… = 라이브 config 일치 | 완료 | 없음 |
| 11 | V2 API Secret | integration/ready | hyunhakapi, 09-01 생성, 무기한. 라이브 주입 완료(SW-1) | 완료 | 없음 |
| 12 | 웹훅 V2 테스트 URL | webhook/readme-v2 | https://api.hyunhak.com/api/payments/webhook, application/json, 버전 2024-04-25 | 완료 | SW-2 닫음 |
| 13 | 웹훅 V2 테스트 시크릿 | webhook/readme-v2 | Secret 1 발급(1/2), 값은 마스킹. **12:35 호출 테스트 = 서명 있는 POST 1건에 서버 200 (tail 실측)** = 라이브 시크릿과 짝 일치 | 완료 | 없음 |
| 14 | 웹훅 V2 실연동 URL | webhook/readme-v2 | 비어 있음 → **09-02 12:2x 세션 등록** (동일 URL, 재조회로 확인, 채증 live_after_save.jpg) | 완료 | 없음 |
| 15 | 웹훅 V2 실연동 시크릿 | webhook/readme-v2 | 없음 | 대기 | PC-3 개통 시 발급, 테스트 시크릿 재사용 금지 |
| 16 | 웹훅 V1 | 콘솔 | URL 없음 | 해당없음 | V2 사용 |
| 17 | IP 화이트리스트 | 추가 설정 관리 | 규칙 없음 | 해당없음 | 미설정 유지(CF Workers 발신 IP 가변, 설정 시 API 호출 차단 위험) |
| 18 | 스마트 라우팅 | 콘솔 | 그룹 없음 | 해당없음 | 단일 PG |
| 19 | 체크아웃 | 콘솔 | 프로필 없음 | 해당없음 | SDK 직접 연동 |
| 20 | 신청: KG 신용카드 일반결제 | onboarding | 입점 심사중 | 진행중 | 대기 |
| 21 | 신청: KG 간편결제 | onboarding | PG사 접수 완료 | 진행중 | 바로오픈 미지원 수단, 심사 후 |
| 22 | 신청: NHN KCP 5건 | onboarding | 취소 3 + 진행중 2(신용카드 "미비사항 보완 요청", 본인인증 "신청서 작성 대기") | 결재필요 | PC-2 메일로 전건 철회 요청 완료, 콘솔 셀프 취소 버튼 없음. "완료하러 가기" 배너 진행 금지 |
| 23 | 바로오픈 | help open-immediately, console/guide/reg | 콘솔 별도 UI 없음, 메일 요청 완료(09-02 07:0x) | 대기 | 30일 내 본계약 조건 |
| 24 | 결제창 필수 파라미터 | pg/v2/inicis-v2 | customer fullName + PC 는 phoneNumber, email 필수 → 코드 반영(cc4ed79), s3 실브라우저 검증 | 완료 | 없음 |
| 25 | 정산 계좌, 세금계산서 | 콘솔 | 별도 메뉴 없음(PG 계약 단계) | 대기 | KG 계약서 작성 시 |

## 집행 기록
- 09-02 12:35 웹훅 호출 테스트 1회(건우 OK). tail = POST → 200, exceptions 0. webhook_logs 1행 남음.
- 09-02 12:2x 웹훅 V2 실연동 URL 등록 1건. 가역(빈 값으로 되돌리면 원복). 실연동 채널이 없어 라이브 웹훅은 아직 발생하지 않고, 발생해도 시크릿 미주입이라 서버가 401 로 끊는다.
- 그 외 변경 0. 시크릿 값은 어디에도 기록하지 않았다.

## 개통 통보 후 순서 (PC-3)
1. KG 담당자가 준 실 MID 와 키를 콘솔 채널 관리(실연동)에 추가. 키파일이 있으면 cs@portone.io 로 송부(help additional-inicis).
2. 웹훅 V2 실연동 시크릿 발급.
3. 건우 `!` 로 secret 교체: PORTONE_CHANNEL_KEY(실연동 채널키), PORTONE_WEBHOOK_SECRET(실연동), PG_TEST_MODE=0.
4. 세션이 /api/config, 웹훅 401 프로브, 실결제 1건(1,000원) 후 orders.pg_provider='portone' 실측, 환불 1건.

## 근거 문서
- https://developers.portone.io/opi/ko/integration/webhook/readme-v2
- https://developers.portone.io/opi/ko/integration/pg/v2/inicis-v2
- https://developers.portone.io/opi/ko/console/guide/channel-manage?v=v2
- https://developers.portone.io/opi/ko/integration/ready/readme?v=v2
- https://developers.portone.io/opi/ko/console/guide/reg?v=v2
- https://help.portone.io/content/open-immediately
- https://help.portone.io/content/additional-inicis
- https://guide.portone.io/42cf144d-8614-4b06-94da-1e81e55d0ce5
