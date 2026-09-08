#!/usr/bin/env node
// 워커 로컬 판정기 (2026-09-09). _worker/index.js 를 그대로 import 해 가짜 ASSETS(로컬 파일)·DB(INSERT 기록)로 fetch 를 돌린다.
// 배포 전 잡는 것: 구 URL 301 표(키 정규화 포함)·favicon 200·404 본문 + not_found 원장 배선·UA 분류 폐쇄 어휘·기존 동작(www 301, 철거 7권 301, 확장자 없는 경로).
// 사용: node _tools/worker_check.mjs  (rc 0 = 전건 PASS)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "_worker/index.js"), "utf8");
const tmp = path.join(os.tmpdir(), `hh_worker_${process.pid}_${Date.now()}.mjs`);
fs.writeFileSync(tmp, src);
let worker;
try { worker = (await import("file://" + tmp)).default; } finally { fs.unlinkSync(tmp); }

const MIME = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".txt": "text/plain", ".xml": "application/xml", ".vtt": "text/vtt", ".mp4": "video/mp4" };
const ASSETS = {
  fetch: async (req) => {
    const u = new URL(req.url);
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (u.pathname.endsWith("/") || !f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return new Response("not found", { status: 404 });
    return new Response(fs.readFileSync(f), { status: 200, headers: { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "ETag": '"t"' } });
  },
};
const inserts = [];
const DB = { prepare: (sql) => ({ bind: (...args) => ({ run: async () => { inserts.push({ sql, args }); return {}; } }) }) };
const env = { ASSETS, DB };

async function call(pathq, { ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/152.0 Safari/537.36", method = "GET", host = "hyunhak.com", referer } = {}) {
  const ps = []; const ctx = { waitUntil: (p) => ps.push(p) };
  const headers = { "User-Agent": ua }; if (referer) headers.Referer = referer;
  inserts.length = 0;
  const res = await worker.fetch(new Request(`https://${host}${pathq}`, { method, headers }), env, ctx);
  await Promise.all(ps);
  return res;
}
const rows = []; let fails = 0;
function chk(name, ok, detail) { rows.push([ok ? "PASS" : "FAIL", name, detail]); if (!ok) fails++; }
const loc = (r) => r.headers.get("Location") || "-";

// 1 구 URL 301 표 — 표 전건 + 정규화 꼴(디렉터리·확장자 없음·쿼리 보존)
const m = src.match(/LEGACY_REDIRECTS = \{([\s\S]*?)\n\};/);
const table = m ? [...m[1].replace(/\/\/[^\n]*/g, "").matchAll(/"(\/[^"]+)"\s*:\s*"(\/[^"]+)"/g)].map((x) => [x[1], x[2]]) : [];
chk("LEGACY_REDIRECTS 표 읽힘", table.length >= 30, `${table.length}건`);
let tblOk = 0;
for (const [k, v] of table) {
  const r = await call(k);
  if (r.status === 301 && loc(r) === `https://hyunhak.com${v}`) tblOk++;
  else rows.push(["FAIL", `301 ${k}`, `${r.status} ${loc(r)}`]), fails++;
}
chk("표 전건 301 + Location 일치", tblOk === table.length, `${tblOk}/${table.length}`);
for (const [p, want] of [["/interview/", "/interview.html"], ["/store", "/guidebook/index.html"], ["/programs/", "/programs/guidebook.html"], ["/programs", "/programs/guidebook.html"], ["/lectures/", "/lectures.html"], ["/interview/korea", "/programs/korea.html"]]) {
  const r = await call(p); chk(`정규화 ${p} → 301 ${want}`, r.status === 301 && loc(r) === `https://hyunhak.com${want}`, `${r.status} ${loc(r)}`);
}
{ const r = await call("/interview/korea.html?utm_source=chatgpt.com"); chk("301 이 쿼리를 보존(utm → 목적지 ai_referrals)", r.status === 301 && loc(r) === "https://hyunhak.com/programs/korea.html?utm_source=chatgpt.com", loc(r)); }
{ const r = await call("/interview"); chk("/interview (허브, 산 면) 200", r.status === 200, `${r.status}`); }
{ const r = await call("/guidebook/korea.html"); chk("철거 7권 301 (기존 REMOVED_GUIDEBOOK 유지)", r.status === 301 && loc(r) === "https://hyunhak.com/guidebook/index.html", `${r.status} ${loc(r)}`); }
{ const r = await call("/faq"); chk("확장자 없는 경로 /faq 200 (기존 해석 유지)", r.status === 200, `${r.status}`); }
{ const r = await call("/guidebook"); chk("/guidebook → 301 슬래시 (기존 유지)", r.status === 301 && loc(r).endsWith("/guidebook/"), `${r.status} ${loc(r)}`); }
{ const r = await call("/", { host: "www.hyunhak.com" }); chk("www → apex 301 (기존 유지)", r.status === 301 && loc(r) === "https://hyunhak.com/", `${r.status} ${loc(r)}`); }
// 2 favicon
{ const r = await call("/favicon.ico"); chk("/favicon.ico 200 image/png + 캐시", r.status === 200 && (r.headers.get("Content-Type") || "").startsWith("image/png") && (r.headers.get("Cache-Control") || "").includes("max-age=86400"), `${r.status} ${r.headers.get("Content-Type")}`); }
// 3 404 본문 + 원장
{
  const r = await call("/nope.html", { referer: "https://chatgpt.com/c/abc?x=1" });
  const body = await r.text();
  chk("없는 면 404 + 404.html 본문", r.status === 404 && body.includes("찾는 면이 없습니다") && body.includes("page_not_found"), `${r.status} len=${body.length}`);
  chk("not_found INSERT 1건 (path, ref_host, ua_class=browser)", inserts.length === 1 && inserts[0].sql.startsWith("INSERT INTO not_found") && inserts[0].args[1] === "/nope.html" && inserts[0].args[2] === "chatgpt.com" && inserts[0].args[3] === "browser", JSON.stringify(inserts.map((i) => i.args.slice(1))));
}
{ await call("/nope.html?secret=1", { ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot" }); chk("원장 = 쿼리 제외 + ua_class ai_user", inserts.length === 1 && inserts[0].args[1] === "/nope.html" && inserts[0].args[3] === "ai_user", JSON.stringify(inserts.map((i) => i.args.slice(1)))); }
{ await call("/nope.html", { ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)" }); chk("ua_class ai_bot (PerplexityBot)", inserts[0]?.args[3] === "ai_bot", inserts[0]?.args[3]); }
{ await call("/nope.html", { ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }); chk("ua_class search_bot (Googlebot)", inserts[0]?.args[3] === "search_bot", inserts[0]?.args[3]); }
{ await call("/nope.html", { ua: "Mozilla/5.0 (Macintosh) hyunhak-smoke" }); chk("ua_class other_bot (스모크)", inserts[0]?.args[3] === "other_bot", inserts[0]?.args[3]); }
{ await call("/nope.html", { ua: "Chrome Privacy Preserving Prefetch Proxy" }); chk("ua_class other_bot (Chrome 프리페치 프록시)", inserts[0]?.args[3] === "other_bot", inserts[0]?.args[3]); }
{ await call("/nope.html", { ua: "" }); chk("ua_class none (UA 없음)", inserts[0]?.args[3] === "none", inserts[0]?.args[3]); }
{ await call("/nope.html", { method: "HEAD" }); chk("HEAD 404 는 원장 미기록", inserts.length === 0, `${inserts.length}`); }
{ await call("/nope.html", { host: "hyunhak-site.example.workers.dev" }); chk("비정식 호스트 404 는 원장 미기록", inserts.length === 0, `${inserts.length}`); }
{ const r = await call("/wp-login.php"); chk("비 HTML 404 도 404.html 본문 (기존 NIT1 유지)", r.status === 404 && (await r.text()).includes("찾는 면이 없습니다"), `${r.status}`); }
// 4 예산: 61번째 404 부터 미기록
{ let n = 0; for (let i = 0; i < 70; i++) { await call(`/burst${i}.html`); n += inserts.length; } chk("404 원장 분당 예산 60 (이미 위에서 쓴 만큼 차감)", n < 70 && n > 0, `${n}/70 기록`); }

for (const [s, n, d] of rows) console.log(`${s.padEnd(4)} ${n.padEnd(52)} ${d}`);
console.log(`worker_check: FAIL ${fails} / ${rows.length} 항목`);
process.exit(fails ? 1 : 0);
