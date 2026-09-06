# 연고대 면접 해설 인강, 상품군과 뷰어 설계 (2026-08-27)

> **2026-08-30 결재 확정 (건우 "전부 권고대로", GPT 5.6 병기 상신)**
> - L-1 = ① 공통 1 + 단위별 8 (대학별 통합 SKU 없음)
> - L-2 = 보류 (미래캠 60, 고려 13 은 카탈로그, 품질, 권리 범위 확정 후 별도 상품 재상신)
> - L-3 = 공통 4편 우선 제작
> - L-4 mp4+Range, L-5 워터마크+원장, L-8 안 A = 기본안 확정
> - L-6 = **빈 슬롯 선판매 금지.** 뷰어 슬롯 UI 노출은 먼저 가능하되 결제 개시는 SKU 당 최소 4편 탑재 + 전체 예정 편수와 업로드 일정 공개 후
> - L-7 = 인강 단품 결제액만큼 30일 내 1회성 패키지 차액 쿠폰 (판매 개시 전 별건 구현)
> - L-9 = 낱권 set_id 결속 수리 승인 (별건 집행)
> - L-10 = 절충: 현 배포는 expires_at NULL 현행(통계 한정) GO, **신규 구매 파생(pay.js) 구현 시 12개월 expires_at 기록 의무.** 기존 시드 권리 소급은 별건
> - L-11 = ① 통계 용도 한정 현행 GO. 환불, 혜택, 수료증, 접근권한 판단에 쓰기 전 서버 검증 전환 의무
> - **L-12 (신설, GPT 5.6 지적)**: 50,000 / 150,000 가격에 대응하는 최소 보장 편수와 총 재생시간을 SKU 스펙에 정의하고 상품면에 표기 (미정의 출시 금지, 환불 민원 기준)
> - 원격 핸드오프(handoff_lecture_20260828.sh)는 L-10 절충 + L-11 ① 조건으로 GO-with-fixes. 단 L-6 에 따라 시드 SKU 는 판매 비활성(status 확인) 상태여야 함

범위 = 설계 문서만. 코드 편집, D1 쓰기, 배포, push 전부 미집행. 명령은 verbatim 으로 적되 모두 "미집행" 표기.
근거 코드 = `schema.sql`, `src/pay.js:15-37`, `src/reader.js:36-43`, `src/trial.js:10-31`, `tools/patch_pass_units_20260826.sql`, `hyunhak-site/studio.html`, `interview-studio/src/interview_studio/api.py:263-273`.

건우 확정 사항 (재해석 없이 반영)

| 항목 | 확정 |
|---|---|
| 가격 | 공통 인강 50,000 / 연세대 단위별 인강 각 150,000 / 고려대 단위별 인강 각 150,000 |
| 통합 해석 | ①안 = "통합" 은 공통 강의. 단위별 인강에 공통 포함. SKU = 공통 1 + 단위별 8 |
| 패키지 규칙 | pass-* 8종(396,000) 구매 = 그 범위 인강 포함, 별도 과금 0. 인강만 구매 시 위 가격 |
| 1:1 결속 | 제시문 1편마다 해설 인강 1편. passage-single(33,000) 에 그 편 해설 딸림. 패키지에 30편 해설 전부 포함 |
| 빈 슬롯 | 영상 0 이므로 슬롯(자산 키, 상태) 먼저. 빈 슬롯 = "준비 중" 분기. 상품 문구는 "해설 인강 포함" 단정 금지 |

## 1. 자산 현황 (실측 그대로)

| 자산 | 위치 | 실측 | 구분 |
|---|---|---|---|
| 단위 인강 대본 | `~/Workspace/interview_meta_lecture_2027/scripts/` | common 4 (L0-1~4), yonsei 6 (L1-1~6), intl 5 (L2-1~5) = md 15편. korea_inmun, korea_jayeon 폴더 존재, md 0 | 슬롯만 (영상 0) |
| 강의 설계 | 같은 repo `spec/SYLLABUS.md` v2 | 29강 설계. 고려 인문 7, 자연 7 미집필 (14강 대본 없음) | 슬롯만 |
| 영상, 음성, 자막 | 없음 | 0개 | 슬롯만 |
| 제시문별 해설 인강 | 없음 | 0개. 세트 JSON `explanation` 텍스트(intent, passage_notes, question_notes, grading_criteria) 만 존재 | 슬롯만 |
| 제작 파이프라인 | `~/Workspace/iruri_ipsi_course/render/run_video.sh` | TTS 음성클론(힉스필드), 자막, 게이트 G1~G10, 18슬라이드 고정 구조 결합, `--max-cost` 지출 상한(기본 100cr) | 재사용 가능 |
| 제시문 은행 | `~/Workspace/{korea,yonsei,yonsei_intl,yonsei_mirae}_interview_bank_2027/sets/` | 313세트 = korea 73, yonsei 60, intl 30, mirae 150. id 예 `korea_2027_h01` | 판매 중 (스튜디오) |
| 상품 카탈로그 지문 | `tools/patch_pass_units_20260826.sql` | 8단위 × 30편 = 240. mirae 는 3단위 90편만 매핑, 60세트 미매핑 | 판매 중 |
| 상품 스키마 | `schema.sql` products | type = book, envelope, pass_passage, pass_school, digital. file_key, detail_url. 인강 type 없음 | 확장 필요 |
| 권리 스키마 | `schema.sql` entitlements | kind = studio_passage, studio_school, download, trial. meta JSON, uses_left. 지문 전용 테이블 없음, 외래키 없음 | 확장 필요 |
| 상품→권리 변환 | `src/pay.js:20-33` | type 별 kind 1:1, id `ent_<order>_<product>_<q>` 결정론 + INSERT OR IGNORE. expires_at 미설정(NULL) | 재사용 (확장) |
| 열람 판정 | `src/reader.js:36-43` | `kind='download' AND meta LIKE '%"file_key":"…"%'` 문자열 매칭 | 한계 (4절) |
| 낱권 결속 | `hyunhak-site/studio.html:161-164`, `src/pay.js:31` | 담기 버튼 전부 sku=passage-single, 세트 id 미전송. entitlement meta 에 set_id 없음 | 선행 결함 (1:1 결속 불가) |
| PDF 뷰어 | `hyunhak-site/reader.html`(53행) + `assets/reader.js`(204행) | canvas 타일, R2 `hyunhak-files`, 1600/2400 webp, `POST /api/reader/open` 토큰 10분, `GET /api/reader/page` 세션+토큰+세션결속 3중 검증, 분당 90 | 패턴 재사용 |
| 영상 플레이어 | `hyunhak-site/assets/video/` | hero_loop 2파일만. 강의 플레이어 없음 | 신설 |
| 스튜디오 API | `interview-studio` FastAPI | `GET /api/sets`, `GET /api/sets/{set_id}`. SETS_DIR = env `IVS_SETS_DIR`. 브리지 = hyunhak-api `POST /api/studio/token` (HMAC 2시간, entitlement 1건 meta 동봉) | 연동 지점 |

현재 판매 가능 = 지문(pass-* 8종, passage-single). 슬롯만 = 인강 전부(공통 4, 단위 11 대본 있음, 고려 14 대본 없음, 제시문 해설 240 전부).

## 2. 상품 SKU

명명 규칙 = `lec-` + pass-* 의 접미. lec-X ↔ pass-X 가 문자열로 1:1. products.type 신설값 = `lecture_common`, `lecture_unit`.

| sku | type | 가격 | 포함 | 대응 pass-* | 대본 실측 |
|---|---|---|---|---|---|
| lec-common | lecture_common | 50,000 | 공통 4강 | (전 8종에 포함) | L0-1~4 |
| lec-korea-hum | lecture_unit | 150,000 | 고려 인문 7강 + 공통 | pass-korea-hum | 0 (미집필) |
| lec-korea-sci | lecture_unit | 150,000 | 고려 자연 7강 + 공통 | pass-korea-sci | 0 (미집필) |
| lec-yonsei-hum | lecture_unit | 150,000 | 연세 인문 통합 6강 + 공통 | pass-yonsei-hum | L1-1~6 |
| lec-yonsei-sci | lecture_unit | 150,000 | 연세 자연 (L1 공유, 배정 미확인) + 공통 | pass-yonsei-sci | L1-5 자연 1편 확인 |
| lec-yonsei-intl | lecture_unit | 150,000 | 연세 국제 5강 + 공통 | pass-yonsei-intl | L2-1~5 |
| lec-yonsei-mirae-design | lecture_unit | 150,000 | 미래 디자인 (강 배정 미확인) + 공통 | pass-yonsei-mirae-design | 0 |
| lec-yonsei-mirae-health | lecture_unit | 150,000 | 미래 보건 (강 배정 미확인) + 공통 | pass-yonsei-mirae-health | 0 |
| lec-yonsei-mirae-intl | lecture_unit | 150,000 | 미래 국제 (강 배정 미확인) + 공통 | pass-yonsei-mirae-intl | 0 |

- SKU 수 = 9 (공통 1 + 단위 8). lec-* 8 ↔ pass-* 8 미매핑 0 (patch_pass_units 의 prd_pu0001~0008 전부 대응).
- 제시문별 해설 인강은 SKU 아님. lectures 행(kind=passage) 으로만 존재, 지문 권리에 딸림.
- 포함 관계는 코드 분기 대신 `product_includes` 표 데이터 16행 = pass-X → lec-X (8) + lec-X → lec-common (8).
- 세트 단위 미매핑(mirae 60세트, korea 은행 73 대 카탈로그 60 초과 13) 은 8절 결재 2.

## 3. 권리 매트릭스

| 구매 경로 | 지문 열람(응시) | 제시문 해설 인강 | 단위 인강 | 공통 인강 | 파생 lecture_access 행 |
|---|---|---|---|---|---|
| pass-<unit> 396,000 | 30편, 편당 5회 | 그 단위 30편 | 그 단위 전강 | 4강 | unit_passages, unit, common (3행) |
| lec-<unit> 150,000 | 없음 | 없음 | 그 단위 전강 | 4강 | unit, common (2행) |
| lec-common 50,000 | 없음 | 없음 | 없음 | 4강 | common (1행) |
| passage-single 33,000 | 1편 5회 | 그 1편 | 없음 | 없음 | passage(set_id) (1행) + 기존 studio_passage |
| trial (무료 1회) | 1편 1회 | 없음 | 없음 | 없음 | 0행 |

파생 규칙

| 항목 | 방식 |
|---|---|
| 파생 id | `ent_<order8>_<product4>_<q>` 는 기존 그대로. lecture_access 는 (entitlement_id, scope) 복합 PK 라 자체 결정론. INSERT OR IGNORE 멱등, confirm 재호출과 웹훅 재진입에 이중 지급 0 |
| 전개 | grantEntitlements 가 product_includes 를 재귀 전개(깊이 2 고정) 후 scope 행 생성. pass-* 는 studio_school 1행 + lecture_access 3행 |
| 이중 과금 방지 | `POST /api/orders` 에서 lec-* 항목마다 유효 lecture_access 보유 검사. 이미 덮이면 409 "이미 보유한 강의입니다" 로 주문 생성 거부. 클라이언트 담기 버튼 숨김은 보조, 판정은 서버 |
| 역순 구매 | lec-<unit> 보유 후 pass-<unit> 구매 = 허용, 차액 보전 없음 (8절 결재 7) |
| 취소 | 웹훅 CANCELED 는 현재 `DELETE FROM entitlements WHERE order_id=?` (pay.js:214). 그 앞에 `DELETE FROM lecture_access WHERE entitlement_id IN (SELECT id FROM entitlements WHERE order_id=?)` 1문 추가. PARTIAL_CANCELED 도 전량 삭제하는 기존 동작 유지 |
| 만료 | 기존 코드가 expires_at 을 쓰지 않아 NULL. 인강도 동일 승계. 12개월 집행은 본 설계 밖 |
| 낱권 set_id | 선행 결함. `POST /api/orders` items[] 에 `set_id` 허용(sku=passage-single 한정), 은행 id 형식 검증 후 entitlement meta 와 lecture_access.set_id 에 기록. studio.html 담기 버튼에 `data-set-id` 추가 (8절 결재 9) |

## 4. 스키마 초안 (DDL 텍스트, 적용 X)

```sql
-- 강의 슬롯. 영상이 없어도 행이 있고 status 로 분기한다
CREATE TABLE IF NOT EXISTS lectures (
  id TEXT PRIMARY KEY,                 -- lec_common_L0-1 / lec_unit_yonsei-hum_L1-1 / lec_passage_korea_2027_h01
  kind TEXT NOT NULL,                  -- common | unit | passage
  unit_code TEXT,                      -- pass-* 접미 (korea-hum ...). common 은 NULL, passage 는 매핑표 값
  passage_set_id TEXT,                 -- 은행 세트 id. kind=passage 만
  seq INTEGER NOT NULL DEFAULT 0,      -- 강 순서
  title TEXT NOT NULL,
  script_path TEXT,                    -- 대본 md 경로 (없으면 NULL)
  r2_key TEXT,                         -- NULL = 빈 슬롯. lectures/<id>/master.mp4 (HLS 채택 시 hls/index.m3u8)
  srt_key TEXT,                        -- lectures/<id>/ko.srt (인제스트 시 ko.vtt 병행 생성)
  poster_key TEXT,
  duration_sec INTEGER,
  status TEXT NOT NULL DEFAULT 'empty',   -- empty | ready | hidden
  published_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lectures_unit ON lectures(kind, unit_code, seq);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lectures_set ON lectures(passage_set_id) WHERE passage_set_id IS NOT NULL;  -- 제시문 1편 = 해설 1편

-- 권리 결속. entitlements 1:N 확장 (ALTER 회피 = reader_docs 와 같은 패턴)
CREATE TABLE IF NOT EXISTS lecture_access (
  entitlement_id TEXT NOT NULL REFERENCES entitlements(id),
  scope TEXT NOT NULL,                 -- common | unit | unit_passages | passage
  unit_code TEXT,                      -- unit, unit_passages 만
  set_id TEXT,                         -- passage 만
  PRIMARY KEY(entitlement_id, scope)
);
CREATE INDEX IF NOT EXISTS idx_la_lookup ON lecture_access(scope, unit_code, set_id);

-- 상품 포함 관계 (데이터 16행)
CREATE TABLE IF NOT EXISTS product_includes (
  parent_sku TEXT NOT NULL, child_sku TEXT NOT NULL, PRIMARY KEY(parent_sku, child_sku)
);

-- 시청 진도, 시청 원장
CREATE TABLE IF NOT EXISTS lecture_progress (
  member_id TEXT NOT NULL, lecture_id TEXT NOT NULL,
  position_sec INTEGER NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
  PRIMARY KEY(member_id, lecture_id)
);
CREATE TABLE IF NOT EXISTS lecture_view_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, member_id TEXT NOT NULL, lecture_id TEXT NOT NULL,
  kind TEXT NOT NULL,                  -- open | chunk | end
  ts TEXT NOT NULL, ip TEXT
);
```

시청 판정 SQL (lecture 행 L, 회원 M)

```sql
SELECT 1 FROM lecture_access la JOIN entitlements e ON e.id = la.entitlement_id
 WHERE e.member_id = :M AND (e.expires_at IS NULL OR e.expires_at > :now)
   AND ( (la.scope='common'        AND :L_kind='common')
      OR (la.scope='unit'          AND :L_kind='unit'    AND la.unit_code=:L_unit)
      OR (la.scope='unit_passages' AND :L_kind='passage' AND la.unit_code=:L_unit)
      OR (la.scope='passage'       AND :L_kind='passage' AND la.set_id=:L_set) ) LIMIT 1;
```

기존 entitlements.meta LIKE 결합의 한계 = 인덱스 불가, JSON 직렬화 순서와 공백에 의존, 외래키 없어 정합 검증 불가. 대안 = 위 lecture_access 정규 컬럼 + 인덱스 조인 (본 설계 채택). 기존 download 판정은 건드리지 않는다.

시드 규모 = common 4 + yonsei 6 + intl 5 + korea 14(대본 없음, status=empty) + passage 240 = 269행. passage 240행의 set_id ↔ unit_code 매핑표는 미확인 (9절 WBS 1).

## 5. 뷰어 요구

| # | 요구 | 설계 |
|---|---|---|
| 1 | R2 저장 | 버킷 `hyunhak-files` 동일. 키 `lectures/<lecture_id>/master.mp4`, `ko.srt`, `ko.vtt`, `poster.webp`. 공개 URL 없음, Worker 경유만 |
| 2 | 만료 서명 URL, 직다운로드 차단 | Workers R2 바인딩은 presigned URL 미제공. 기본안 = reader 패턴 복제: `POST /api/lecture/open` 이 HMAC 토큰(10분, typ=lecture, 세션 id 결속) 발급, `GET /api/lecture/stream?id=&t=` 가 세션 AND 토큰 검증 후 R2 Range 스트림. 헤더 = `Content-Disposition: inline`, `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`. 봇 UA 차단(reader.js looksAutomated 재사용). 완전 차단은 불가, 계정 email 오버레이 워터마크와 시청 원장으로 억제 |
| 3 | 시청 진도 저장 | `PUT /api/lecture/progress` 15초 주기 + pause, ended. lecture_progress upsert. 재진입 시 position_sec 복원. 오프라인 시 localStorage 보관 후 동기 |
| 4 | 자막 SRT | `<track kind="subtitles">` 는 WebVTT 만 받으므로 인제스트 시 srt → vtt 변환 병행 저장. 동일 토큰으로 `GET /api/lecture/track?id=` |
| 5 | 모바일 | `<video playsinline controls>`, 세로 화면 = 제시문 본문 위, 플레이어 하단 sticky. iOS Safari 인라인 재생 확인. 렌디션 720p 단일(HLS 채택 시 다중) |
| 6 | 실패 복구 | 토큰 만료 401 → open 재호출 후 같은 position 재개. R2 객체 없음 503 → "준비 중" 카드 전환. 네트워크 오류 → 3회 backoff 재시도 후 안내. 진도는 마지막 성공 값 유지 |

- 인라인 배치 = 제시문 화면 안에 재생 영역 상시 존재. status=ready 면 플레이어, empty 또는 hidden 이면 "준비 중" 카드(대본 있으면 "대본 준비됨, 영상 제작 중" 표시, 일정 약속 없음). 미권리 회원은 같은 자리에 잠금 카드 + 해당 SKU 링크.
- 제시문 화면 위치 = 안 A `hyunhak.com/lecture.html?set=<set_id>` (은행 세트 본문 + 플레이어, 회원 세션 그대로) / 안 B 스튜디오 응시 결과 화면 embed (studio.hyunhak.com 에서 hyunhak-api 호출, 쿠키 도메인과 CORS 실측 필요). 기본안 A (8절 결재 8).
- HLS 대 진행형 mp4 = mp4 + Range 프록시(구현 1파일, seek 즉시, 다운로드 억제 약함) 대 HLS(세그먼트 + 키 회전으로 억제 강함, ffmpeg 패키징 단계와 hls.js 추가). 기본안 mp4, HLS 는 8절 결재 4.
- 목록 API = `GET /api/lectures?unit=<code>&set=<set_id>` 가 회원 권리 플래그와 status 를 함께 반환 (reader/library 패턴).

## 6. 표시 문구 원칙

| 규칙 | 내용 |
|---|---|
| 단정 금지 | 해당 범위에 status=empty 가 1건이라도 있으면 "해설 인강 포함", "전 강 제공" 문구 금지 (표시광고법 부당광고 리스크, 실증책임) |
| 실측 반영 | 공개 편수 N 은 `GET /api/lectures/summary?unit=` 응답값. HTML 과 JSON-LD 에 숫자 하드코딩 금지, 기준일 병기 |
| 3단 분기 | N=0 "준비 중" / 0<N<전체 "순차 공개, 현재 N/전체" / N=전체 "해설 인강 전체 포함" 으로 자동 전환 |
| 채워진 편수 | 전체 = 그 범위 lectures 행 수(passage 30, unit 은 단위별), N = status='ready' COUNT. hidden 은 N 에서 제외 |

문안 예시 (빈 슬롯 기간)

1. pass-korea-hum 부제: "계열적합 인문 지문 30편, 지문마다 5회 응시, 12개월. 지문별 해설 인강은 편별로 순차 공개되며 공개분은 이 이용권 범위에서 시청 (현재 0/30편, 2026-08-27 기준)."
2. lec-yonsei-hum 상세: "연세대 인문 통합 강의 6강과 공통 4강. 영상은 강별로 순차 공개, 현재 공개 0/10강 (2026-08-27 기준). 공개 일정은 확정되지 않았으며 공개 시 추가 비용 없이 시청."

## 7. 마이그레이션, 배포 순서 초안 (전부 미집행)

관행 = go_live_20260827.sh: DDL 은 `--command` 분할, 시드는 `--file`, D1 먼저 → API 배포 → 사이트 push → 라이브 실측. `W` = `env -u NODE_OPTIONS NO_PROXY='*' npx wrangler`.

| 순서 | 명령 (verbatim) | 상태 | 게이트 |
|---|---|---|---|
| 0 | `cd ~/Workspace/hyunhak-api && npm test` | 미집행 | TDD 3종 PASS |
| 1 | `W d1 execute hyunhak --local --file=tools/migrate_lectures_20260827.sql` | 미집행 | 로컬 테이블 5 |
| 2 | `W d1 execute hyunhak --remote -y --command "CREATE TABLE IF NOT EXISTS lectures (...)"` (DDL 5문 각각 분할) | 미집행, `!` | `SELECT COUNT(*) FROM sqlite_master WHERE name IN ('lectures','lecture_access','product_includes','lecture_progress','lecture_view_logs')` = 5 |
| 3 | `W d1 execute hyunhak --remote -y --file=tools/seed_lectures_20260827.sql` | 미집행, `!` | lectures 269행, product_includes 16행, products lec-* 9행 status='hidden' |
| 4 | `cd ~/Workspace/hyunhak-api && git status --porcelain` 빈 출력 확인 후 `W deploy` | 미집행, `!` | 미커밋 타 스레드 변경 동반 배포 차단(wrangler.toml 주석 실측). `W tail` 첫 요청 exceptions 0 |
| 5 | `cd ~/Workspace/hyunhak-site && git push` | 미집행, `!` | Pages 빌드 후 lecture.html 200, 준비 중 카드 렌더 |
| 6 | 영상 1편 시험 업로드 `W r2 object put hyunhak-files/lectures/lec_common_L0-1/master.mp4 --file=<로컬 mp4>` 후 `W d1 execute hyunhak --remote -y --command "UPDATE lectures SET r2_key='lectures/lec_common_L0-1/master.mp4', status='ready', updated_at='<ISO>' WHERE id='lec_common_L0-1'"` | 미집행, `!` | 시청 왕복 + 진도 저장 실측 |
| 7 | `W d1 execute hyunhak --remote -y --command "UPDATE products SET status='active' WHERE sku LIKE 'lec-%'"` | 미집행, `!` | 결재 6 확정 후만 |

## 8. 결재 문항 (pending_approvals 등재용)

| # | 문항 | 선택지 | 본 문서 가정 |
|---|---|---|---|
| 1 | "통합" 해석 | ① 공통 강의 = 통합, 단위 인강에 포함, SKU 9 / ② 통합을 별도 묶음 SKU 로 신설 | ① |
| 2 | 카탈로그 밖 세트 | mirae 60세트, korea 초과 13세트: (a) 상품 외 보류 (b) 단위 신설 (c) 기존 단위 30편 상한 재정의 | (a) |
| 3 | 콘텐츠 제작 순서 | (a) 공통 4편 → 연세 6 → 국제 5 → 고려 14 집필 → 제시문 240 / (b) 판매 연동 우선으로 제시문 해설부터 | (a) |
| 4 | 전송 방식 | mp4 + Range 프록시 / HLS | mp4 |
| 5 | 시청 억제 수준 | 계정 오버레이 워터마크 + 원장 / 추가로 동시 재생 1기기 제한 | 워터마크 + 원장 |
| 6 | 빈 슬롯 SKU 판매 개시 | 선판매 허용 / 범위 내 ready ≥ 1 후 / 전편 ready 후 | ready ≥ 1 |
| 7 | 역순 구매 차액 | 없음 / 쿠폰 발급 | 없음 |
| 8 | 제시문 화면 위치 | 안 A hyunhak.com lecture.html / 안 B 스튜디오 응시 화면 embed | A |
| 9 | 낱권 set_id 결속 수정 | `POST /api/orders` set_id 수용 + studio.html 담기 버튼 data-set-id (라이브 구매 경로 변경) 승인 여부 | 승인 전제 |

## 9. 작업 분해 (WBS)

| # | 무엇 | 어디 | 게이트 | `!` |
|---|---|---|---|---|
| 1 | 240 set_id ↔ unit_code 매핑표 실측 (mirae 90, korea 60 선별 근거 포함) | 4개 `*_interview_bank_2027/sets/` + patch_pass_units | 240 정확, 중복 0, 카탈로그 밖 73 목록화 | 아니오 |
| 2 | DDL, 시드 SQL 작성 | `tools/migrate_lectures_20260827.sql`, `tools/seed_lectures_20260827.sql` | 로컬 D1 적용 후 행수 269/16/9 | 아니오 |
| 3 | grantEntitlements 확장 (product_includes 전개, lecture_access), /orders 이중구매 409, passage-single set_id | `src/pay.js` + `test/` | tdd-red → green, happy/boundary/failure, 이중 confirm 재현 시 행수 불변 | 아니오 |
| 4 | lecture.js 신설 (목록, open, stream Range, track, progress, summary) | `src/lecture.js`, `src/index.js` 마운트 | 미권리 403, 봇 UA 403, 토큰 만료 401, R2 부재 503 | 아니오 |
| 5 | 취소 경로 lecture_access 삭제 | `src/pay.js` webhook | fault 주입: CANCELED 후 시청 판정 0 | 아니오 |
| 6 | 사이트 뷰어 + 문구 3단 분기 | `hyunhak-site/lecture.html`, `assets/lecture.js`, `store.html`, `studio.html`, `programs/*.html` | iOS, Android 실기 스크린샷, 준비 중 카드, JSON-LD 숫자 하드코딩 0 | 로컬 아니오, push 예 |
| 7 | 제작 파이프라인 연결 (run_video.sh 산출 → mp4, srt, vtt → R2 키 규약) | `iruri_ipsi_course/render/`, 인제스트 스크립트 신설 | G1~G10, `--max-cost` 명시, 산출 3파일 존재 | TTS 실돈 예 |
| 8 | D1 원격 DDL + 시드 | 7절 2~3 | 원격 COUNT 대조 | 예 |
| 9 | API 배포 | 7절 4 | git clean, tail 첫 요청 | 예 |
| 10 | 사이트 push | 7절 5 | Pages 스모크 | 예 |
| 11 | 시험 영상 1편 업로드 + status ready | 7절 6 | 시청, 진도 왕복 실측 | 예 |
| 12 | 판매 개시 UPDATE + 라이브 실측 보고 | 7절 7 | 결재 6 확정, curl 5종 | 예 |

실측 근거: 2026-08-27 탐색 3건
