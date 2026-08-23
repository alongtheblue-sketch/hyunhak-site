#!/usr/bin/env python3
"""가이드북 카탈로그 → D1 상품 시드 SQL (hyunhak-api/tools/seed_guidebook_products.sql).
   멱등 UPSERT. library_files 의 guide-<slug> 는 requires='entitled' 로 전환(구매 열람).
   실행(원격 쓰기 = 건우 `!`): cd ~/Workspace/hyunhak-api && wrangler d1 execute hyunhak --remote --file=tools/seed_guidebook_products.sql"""
import json, os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
cat = json.load(open(os.path.join(HERE, "guidebook_catalog.json"), encoding="utf-8"))
out = os.path.expanduser("~/Workspace/hyunhak-api/tools/seed_guidebook_products.sql")
TS = "2026-08-23T11:00:00Z"
rows = []
for i, it in enumerate(cat["items"]):
    price = it["price"] or cat["price"]
    pid = "prd_gb" + hashlib.sha1(it["sku"].encode()).hexdigest()[:6]
    title = f"{it['name']} 2027 면접 가이드북".replace("'", "''")
    sub = f"{it['pages']}면, 질문 {it['questions']}건, 보안 리더 열람".replace("'", "''")
    rows.append(f"('{pid}','{it['sku']}','digital','{title}','{sub}','{it['name']}',{price},0,NULL,'active','library/guide-{it['slug']}.pdf','/guidebook/{it['slug']}.html',{200+i},'{TS}','{TS}')")
sql = ["-- 가이드북 38권 상품 시드 (_tools/build_products_sql.py 생성, 멱등)",
 "INSERT INTO products(id,sku,type,title,subtitle,school,price,requires_shipping,stock,status,file_key,detail_url,sort,created_at,updated_at) VALUES",
 ",\n".join(rows),
 "ON CONFLICT(sku) DO UPDATE SET title=excluded.title, subtitle=excluded.subtitle, price=excluded.price, file_key=excluded.file_key, detail_url=excluded.detail_url, status=excluded.status, updated_at=excluded.updated_at;",
 "", "-- 성균관대 전권 이용권",
 f"INSERT INTO products(id,sku,type,title,subtitle,school,price,requires_shipping,stock,status,detail_url,sort,created_at,updated_at) VALUES ('prd_seed0005','pass-skku','pass_school','성균관대학교 전권 이용권','성균인재전형 제시문 전량, 스튜디오 무제한 응시','성균관대학교',330000,0,NULL,'active','/programs/skku.html',12,'{TS}','{TS}') ON CONFLICT(sku) DO UPDATE SET title=excluded.title, subtitle=excluded.subtitle, price=excluded.price, detail_url=excluded.detail_url, status=excluded.status, updated_at=excluded.updated_at;",
 "", "-- 가이드북 열람 = 구매 권리 필요 (구 회원 무료 → 유료 전환, 건우 결재 HS-12 후 실행)",
 "UPDATE library_files SET requires='entitled' WHERE slug LIKE 'guide-%';"]
open(out, "w", encoding="utf-8").write("\n".join(sql) + "\n")
print(out, len(rows), "products, price", cat["price"])
