// s8 렌더 실측 (2026-09-07): 배포 전 로컬 서버(:8813) 위에서 Playwright 로 마이페이지·인강실·강의실 ?unit= 화면을 잰다.
//   회원 API(/api/auth/me, /api/studio/attempts, /api/lectures)는 라우트 스텁(계정 로그인 0), 공개 API(/api/lectures/public, summary)는 라이브 전달.
//   MY-1  my.html: 낱권 카드 "잔여 응시 3회 / 5회" + 원장 응시 2회 병기
//   MY-2  my.html: 전권 카드 "지문마다 5회, 응시 6회 (세트 2개)" + 세트별 펼침 2행(잔여 0회 행이 먼저)
//   MY-3  my.html: 응시 기록 3행, 요약 "응시 3회, 채점 완료 2회, 최고 72%", 채점 전 1, 영상 보관 종료 배지 1(90일 경과 맛보기)
//   MY-4  my.html: "스튜디오에서 영상과 첨삭 보기" 버튼(.hgo) 존재
//   CR-1  classroom.html: 기출 카드(article.cr.gich) 1 + 권리 있는 기출 1편 행(시청) + 타 대학 기출 0
//   CR-2  classroom.html: 단위 카드 = 권리 있는 korea-hum 1개만
//   LU-1  lecture.html?unit=korea-hum: "2026 기출 해설" 그룹 + 기출 1편 링크, 세트 30편 링크
// 사용: node _design/lecture_20260906/measure_s8_render.mjs [http://localhost:8813]   (hostname 은 localhost 여야 app.js 가 API 를 localhost:8799 로 잡는다)
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
const require = createRequire("/Users/gregory/Workspace/iruri_6mo_thumb/package.json");
const { chromium } = require("playwright");

const BASE = process.argv[2] || "http://localhost:8813";
const API = "http://localhost:8799";
const LIVE = "https://api.hyunhak.com";
const HERE = new URL("./", import.meta.url).pathname;
const OUT = HERE + "shots_s8/";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fails.push(msg); };

const pubHum = JSON.parse(readFileSync(HERE + "s8_fixtures/pub_korea-hum.json", "utf8")).lectures;
const pubG = JSON.parse(readFileSync(HERE + "s8_fixtures/pub_yeongo-gichul.json", "utf8")).lectures;
const G_MINE = "korea_2026_gichul_hum_am";
const lectures = pubHum.map((l) => Object.assign({}, l, { entitled: true, progress: l.id === "lec_passage_korea_2027_h01" ? { position_sec: 300, completed: false, updated_at: "2026-09-06T10:00:00Z" } : null }))
  .concat(pubG.map((l) => Object.assign({}, l, { entitled: l.passage_set_id === G_MINE, progress: null })));

const ME = {
  member: { id: "mem_s8", email: "s8@example.test", name: "렌더 실측", role: "member" },
  trial_available: false,
  entitlements: [
    { id: "ent_p1", kind: "studio_passage", meta: JSON.stringify({ title: "고려대 계열적합 인문 01번 세트 지문 낱권", set_id: "korea_2027_h01" }), uses_left: 3, expires_at: null },
    { id: "ent_s1", kind: "studio_school", meta: JSON.stringify({ title: "고려대 계열적합 인문 단위 전권", unit_code: "korea-hum" }), uses_left: null, expires_at: null },
    { id: "ent_s1_lec", kind: "lecture", meta: JSON.stringify({ unit_code: "korea-hum" }), uses_left: null, expires_at: null },
    { id: "ent_s1_g", kind: "lecture", meta: JSON.stringify({ scope: "passage", set_id: G_MINE }), uses_left: null, expires_at: null },
    { id: "ent_c", kind: "lecture", meta: JSON.stringify({ scope: "common" }), uses_left: null, expires_at: null },
  ],
};
const ATT = {
  attempts: [
    { ref: "r1", kind: "studio_school", entitlement_id: "ent_s1", set_id: "korea_2027_h02", attempt_id: "a1", answer_mode: "per_question", created_at: "2026-09-06T14:00:00Z", finalized_at: "2026-09-06T14:20:00Z", total_score: 72, total_points: 100 },
    { ref: "r2", kind: "studio_passage", entitlement_id: "ent_p1", set_id: "korea_2027_h01", attempt_id: "a2", answer_mode: "combined", created_at: "2026-09-05T09:00:00Z", finalized_at: null, total_score: null, total_points: null },
    { ref: "r3", kind: "trial", entitlement_id: null, set_id: "yonsei_2026_h1", attempt_id: "a3", answer_mode: "per_question", created_at: "2026-05-01T09:00:00Z", finalized_at: "2026-05-01T09:30:00Z", total_score: 60, total_points: 100 },
  ],
  usage: [
    { entitlement_id: "ent_s1", set_id: "korea_2027_h01", n: 1 },
    { entitlement_id: "ent_s1", set_id: "korea_2027_h02", n: 5 },
    { entitlement_id: "ent_p1", set_id: "korea_2027_h01", n: 2 },
  ],
  set_uses: 5, retention_days: 90,
};

const browser = await chromium.launch();
async function page(w, h, path) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  const cors = { "access-control-allow-origin": BASE, "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,PATCH,OPTIONS" };
  await ctx.route(API + "/**", async (route) => {
    const u = new URL(route.request().url());
    const json = (o, s = 200) => route.fulfill({ status: s, contentType: "application/json", headers: cors, body: JSON.stringify(o) });
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (u.pathname === "/api/auth/me") return json(ME);
    if (u.pathname === "/api/studio/attempts") return json(ATT);
    if (u.pathname === "/api/lectures") return json({ lectures });
    if (u.pathname === "/api/lectures/public" || u.pathname === "/api/lectures/summary") {
      const r = await route.fetch({ url: LIVE + u.pathname + u.search });
      return route.fulfill({ status: r.status(), contentType: "application/json", headers: cors, body: await r.text() });
    }
    if (u.pathname === "/api/studio/token") return json({ url: "https://studio.example/?hh=x#history" });
    return json({ error: "stub 404 " + u.pathname }, 404);
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("  pageerror " + path + ": " + e.message));
  await p.goto(BASE + "/" + path, { waitUntil: "networkidle" });
  return p;
}
const text = async (p, sel) => ((await p.locator(sel).first().textContent()) || "").replace(/\s+/g, " ").trim();

// ── my.html ──
{
  const p = await page(1280, 900, "my.html");
  await p.waitForFunction(() => document.querySelectorAll("#stuRows li").length === 3, null, { timeout: 15000 }).catch(() => {});
  const pass = await text(p, '#passList [data-ent="ent_p1"] .st');
  ok(/잔여 응시 3회 \/ 5회, 응시 2회/.test(pass), "MY-1 낱권 카드 = " + pass);
  const sch = await text(p, '#passList [data-ent="ent_s1"] .st');
  ok(/지문마다 5회, 응시 6회 \(세트 2개\)/.test(sch), "MY-2 전권 카드 = " + sch);
  const setsOpen = await p.locator('#passList [data-ent="ent_s1"] .stsets').evaluate((d) => !d.hidden);
  const setRows = await p.locator('#passList [data-ent="ent_s1"] .stsets .r').allTextContents();
  ok(setsOpen && setRows.length === 2 && /5회 응시, 잔여 0회/.test(setRows[0]) && /1회 응시, 잔여 4회/.test(setRows[1]), "MY-2 세트별 펼침 2행(잔여 0 먼저) = " + JSON.stringify(setRows.map((s) => s.replace(/\s+/g, " ").trim())));
  const sum = await text(p, "#stuSum");
  ok(/응시 3회, 채점 완료 2회, 최고 72%/.test(sum) && /90일/.test(sum), "MY-3 요약 = " + sum);
  const rows = (await p.locator("#stuRows li").allTextContents()).map((s) => s.replace(/\s+/g, " ").trim());
  ok(rows.length === 3 && /72 \/ 100 \(72%\)/.test(rows[0]) && /채점 전/.test(rows[1]) && /영상 보관 종료/.test(rows[2]) && !/영상 보관 종료/.test(rows[0] + rows[1]), "MY-3 기록 3행 = " + JSON.stringify(rows));
  ok(/고려대 계열적합 인문 02/.test(rows[0]) && /연습형/.test(rows[0]) && /전권/.test(rows[0]), "MY-3 세트 제목·모드·종류 풀이 = " + rows[0]);
  ok((await p.locator(".hgo").count()) >= 1, "MY-4 스튜디오 기록 열람 버튼(.hgo) " + (await p.locator(".hgo").count()));
  const empty = await p.locator("#stuEmpty").evaluate((e) => e.hidden);
  ok(empty, "MY-3 빈 상태 문구 숨김");
  await p.screenshot({ path: OUT + "my_1280.png", fullPage: true });
  await p.context().close();
  const m = await page(390, 844, "my.html");
  await m.waitForFunction(() => document.querySelectorAll("#stuRows li").length === 3, null, { timeout: 15000 }).catch(() => {});
  const sw = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok(sw, "MY 390 가로 넘침 0");
  await m.screenshot({ path: OUT + "my_390.png", fullPage: true });
  await m.context().close();
}

// ── classroom.html ──
{
  const p = await page(1280, 900, "classroom.html");
  await p.waitForSelector("article.cr", { timeout: 15000 }).catch(() => {});
  const gich = p.locator("article.cr.gich");
  ok((await gich.count()) === 1 && /2026 기출 해설/.test(await text(p, "article.cr.gich h2")), "CR-1 기출 카드 1 (h2 2026 기출 해설)");
  const mine = p.locator('article.cr.gich [data-lec="lec_passage_' + G_MINE + '"]');
  ok((await mine.count()) === 1 && /시청/.test(await mine.locator("a.btn").first().textContent()), "CR-1 권리 있는 기출 1편 행 + 시청 버튼");
  ok((await p.locator("article.cr.gich [data-lec]").count()) === 1, "CR-1 타 대학 기출 행 0 (권리 없는 4편 미노출)");
  const units = await p.locator("article.cr:not(.gich) h2").allTextContents();
  ok(units.length === 1 && /고려대 계열적합 인문/.test(units[0]), "CR-2 단위 카드 = " + JSON.stringify(units));
  await p.screenshot({ path: OUT + "classroom_1280.png", fullPage: true });
  await p.context().close();
}

// ── lecture.html?unit=korea-hum ──
{
  const p = await page(1280, 900, "lecture.html?unit=korea-hum");
  await p.waitForSelector('a[href*="lecture.html?id=lec_passage_korea_2027_h01"]', { timeout: 20000 }).catch(() => {});
  const gTitle = await p.getByText("2026 기출 해설", { exact: false }).count();
  ok(gTitle >= 1, "LU-1 '2026 기출 해설' 그룹 제목 " + gTitle);
  const gLink = await p.locator('a[href*="lecture.html?id=lec_passage_' + G_MINE + '"]').count();
  ok(gLink >= 1, "LU-1 기출 1편 시청 링크 " + gLink);
  const setLinks = await p.locator('a[href*="lecture.html?id=lec_passage_korea_2027_h"]').count();
  ok(setLinks === 30, "LU-1 세트 30편 링크 = " + setLinks);
  const otherG = await p.locator('a[href*="lecture.html?id=lec_passage_yonsei_2026_gichul"]').count();
  ok(otherG === 0, "LU-1 타 대학 기출 링크 0 = " + otherG);
  await p.screenshot({ path: OUT + "lecture_unit_korea-hum_1280.png", fullPage: true });
  await p.context().close();
}

await browser.close();
console.log(fails.length ? "RESULT FAIL " + fails.length : "RESULT PASS");
process.exit(fails.length ? 1 : 0);
