// 워커 단위 테스트 (2026-09-12): 평문 http → https 301, www → apex 301(https 유지), html 응답 HSTS.
// 실행: node _tools/worker_unit_test.mjs   (네트워크 0, env.ASSETS 는 가짜)
import assert from "node:assert/strict";
import worker from "../_worker/index.js";

const ASSETS = { fetch: async (req) => new Response("<!doctype html><title>x</title>", { status: 200, headers: { "Content-Type": "text/html" } }) };
const env = { ASSETS, DB: null };
const ctx = { waitUntil() {} };
const run = (url, headers = {}) => worker.fetch(new Request(url, { headers }), env, ctx);

let n = 0;
const chk = (name, ok, detail) => { n++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  " + detail)); if (!ok) process.exitCode = 1; };

let r = await run("http://hyunhak.com/join.html?x=1");
chk("http apex → 301 https", r.status === 301 && r.headers.get("Location") === "https://hyunhak.com/join.html?x=1", `${r.status} ${r.headers.get("Location")}`);
r = await run("http://www.hyunhak.com/");
chk("http www → 301 https apex", r.status === 301 && r.headers.get("Location") === "https://hyunhak.com/", `${r.status} ${r.headers.get("Location")}`);
r = await run("https://www.hyunhak.com/about.html");
chk("https www → 301 https apex", r.status === 301 && r.headers.get("Location") === "https://hyunhak.com/about.html", `${r.status} ${r.headers.get("Location")}`);
// cf-visitor 만 http 인 경우(프록시 뒤 request.url 이 https 로 재작성되는 배포 형태)도 301
r = await run("https://hyunhak.com/join.html", { "cf-visitor": '{"scheme":"http"}' });
chk("cf-visitor http → 301 https", r.status === 301 && r.headers.get("Location") === "https://hyunhak.com/join.html", `${r.status} ${r.headers.get("Location")}`);
r = await run("https://hyunhak.com/join.html");
chk("https apex html 200 + HSTS", r.status === 200 && /max-age=\d+/.test(r.headers.get("Strict-Transport-Security") || ""), `${r.status} hsts=${r.headers.get("Strict-Transport-Security")}`);
r = await run("http://localhost:8788/about.html");
chk("localhost http 는 리다이렉트 없음", r.status === 200, `${r.status}`);
console.log(`${n} cases, exit=${process.exitCode || 0}`);
