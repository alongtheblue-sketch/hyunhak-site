-- 스튜디오 가격 구조 개편 (2026-09-03 건우 결재 §GBSTD-20260903 GS-8a, GS-8e, GS-8f).
--   1) 단위 전권 5종 396,000 → 495,000. 세트별 풀이법 인강 30편과 공통 풀이 인강 포함, 인강 이용 기간 3개월.
--   2) 신규 SKU lecture-common (type lecture_common) 220,000. 공통 풀이 인강 단독 상품, 시청 3개월.
--   구 학교 전권(pass-yonsei, pass-korea, pass-skku)과 미래캠 3종은 inactive 그대로, 가격도 손대지 않는다.
-- 멱등. 각 문장에 가드가 있어 두 번 실행해도 두 번째는 0행이다.
-- 원격 적용 = tools/handoff_lecture_price_20260903.sh (건우 `!` 집행, BEFORE/AFTER 계수). 로컬 검증 = --local.
-- 인강 권리 만료 산식(지급 + 3개월)은 src/pay.js LECTURE_MONTHS 가 SoT 다. 이 파일은 카탈로그만 바꾼다.

-- 1) 가격. 396,000 인 활성 행만 (이미 495,000 이면 0행).
UPDATE products SET price=495000, updated_at='2026-09-03T02:30:00Z'
 WHERE sku IN ('pass-korea-hum','pass-korea-sci','pass-yonsei-hum','pass-yonsei-sci','pass-yonsei-intl')
   AND status='active' AND price=396000;

-- 1b) 부제에 인강 포함 표기. 이미 '인강' 이 든 부제는 건드리지 않는다.
UPDATE products SET subtitle=CASE WHEN subtitle IS NULL OR subtitle='' THEN '세트별 풀이법 인강 30편과 공통 풀이 인강 포함, 인강 3개월'
                                  ELSE subtitle||'. 세트별 풀이법 인강 30편과 공통 풀이 인강 포함, 인강 3개월' END,
                    updated_at='2026-09-03T02:30:00Z'
 WHERE sku IN ('pass-korea-hum','pass-korea-sci','pass-yonsei-hum','pass-yonsei-sci','pass-yonsei-intl')
   AND status='active' AND (subtitle IS NULL OR subtitle NOT LIKE '%인강%');

-- 2) 공통 풀이 인강 단독 SKU (UPSERT 멱등).
INSERT INTO products(id,sku,type,title,subtitle,school,price,requires_shipping,stock,status,detail_url,sort,created_at,updated_at) VALUES
('prd_lc0001','lecture-common','lecture_common','공통 풀이 인강','제시문 면접 공통 풀이법 인강. 시청 3개월, 마이페이지 내 강의. 단위 전권에는 이미 포함',NULL,220000,0,NULL,'active','/programs/studio.html',18,'2026-09-03T02:30:00Z','2026-09-03T02:30:00Z')
ON CONFLICT(sku) DO UPDATE SET type=excluded.type, title=excluded.title, subtitle=excluded.subtitle,
 price=excluded.price, status=excluded.status, detail_url=excluded.detail_url, sort=excluded.sort, updated_at=excluded.updated_at;
