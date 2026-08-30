# 엣지 설정 절차 (AI 접근통제 + GEO, 2026-08-30)

전제는 `~/Workspace/go_hyunhak_edge_20260830.sh` 실행 완료(api 와 site 배포)이고, 대시보드 위치는 dash.cloudflare.com 의 hyunhak.com 존이며, 아래 작업은 전부 되돌릴 수 있다(프록시를 끄면 GH Pages 로 원복되고 정책과 룰은 토글이나 삭제로 제거된다).

## 1. DNS 프록시 전환 (5건)

DNS > Records 에서 각 레코드 Edit > Proxy status 토글 > Save:

- A hyunhak.com 185.199.108/109/110/111.153 (4건) → Proxied
- CNAME www → alongtheblue-sketch.github.io → Proxied
- studio(Tunnel), api(Worker), MX, TXT 는 손대지 않는다.

SSL/TLS 모드 = Full (2026-08-30 확인 완료, 변경 불요). 전환 직후 검증:
`python3 _tools/edge_smoke.py --no-policy` 전건 PASS.

## 2. AI bot policies (Security > Settings > Configure AI bot policies)

- Search crawlers = **Allow**: Googlebot, OAI-SearchBot, Claude-SearchBot 등 인용이 생기는 경로다.
- AI agents = **Allow**: ChatGPT-User 등 사용자 대행은 잠재 고객의 질문이다.
- Training crawlers = **Block on all pages**: GPTBot, ClaudeBot, CCBot 등 학습 크롤러다.
- 주의: CF managed robots.txt 는 켜지 않는다 (우리 3범주 robots.txt 를 덮어쓴다)

## 3. WAF 커스텀 룰 3개 (Security > Security rules > Create rule, 이 순서대로)

토큰 값 `<TOK>` = `~/.config/hyunhak-api/secrets.env` 의 DEV_BYPASS_TOKEN (문서에 값 자체는 적지 않는다).

R1 "dev bypass hh_dev", 액션 Skip (All remaining custom rules):

    (http.cookie contains "hh_dev=<TOK>")

R2 "protected paths bots", 액션 Block:

    (starts_with(http.request.uri.path, "/reader") or starts_with(http.request.uri.path, "/lecture") or starts_with(http.request.uri.path, "/api/reader") or starts_with(http.request.uri.path, "/api/lecture")) and (cf.client.bot or lower(http.user_agent) contains "bot" or lower(http.user_agent) contains "crawl" or lower(http.user_agent) contains "spider" or lower(http.user_agent) contains "python" or lower(http.user_agent) contains "curl" or lower(http.user_agent) contains "wget" or lower(http.user_agent) contains "headless")

R3 "reader shell non-browser", 액션 Managed Challenge:

    (http.host eq "hyunhak.com" and http.request.uri.path in {"/reader.html" "/lecture.html"} and not http.user_agent contains "Mozilla")

주의: Bot Fight Mode 는 켜지 않는다 (무료판은 skip 예외를 못 둬 ego-browser QA 까지 막힌다).

## 4. 최종 검증

- `python3 _tools/edge_smoke.py` 를 돌려 GPTBot 403 과 Googlebot 200, OAI-SearchBot 200 을 포함한 전건 PASS 를 확인한다.
- `python3 _tools/indexnow_ping.py` 로 Bing 과 네이버에 IndexNow 제출.
- 개발자 쿠키: 브라우저(ego-browser 포함)로 https://api.hyunhak.com/admin/dev-cookie 1회 방문 (Access 로그인) → hh_dev 90일

## 남은 후속 (별건)

- 학교별 FAQ 3문항 + FAQPage JSON-LD (GEO 인용 단위)는 다음 세션에서 만든다.
- 네이버 서치어드바이저 등록 확인 + 2주 후 ai_referrals 와 AI Crawl Control 첫 계측 리포트
- GH Pages 리포는 롤백 원점이라 당분간 그대로 두고, 엣지 구성이 안정화된 뒤에 Pages 비활성을 검토한다.
