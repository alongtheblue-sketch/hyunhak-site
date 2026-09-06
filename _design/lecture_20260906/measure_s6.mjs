// s6 회귀 실측 (2026-09-06): Codex r5 권고로 고친 것만 잰다. 로컬 http 서버(기본 :8813) 위에서 Playwright.
//   NNN2  lectures/yonsei-hum.html 1280: .anch #faq 클릭 → 착지 뒤 aria-current 가 卷三
//   NNN3  lectures.html 1280 폴드: 솔리드 ink 채움 = 1 (주 CTA 만, 활성 칩은 테두리)
//   NNN4  lectures/yonsei-hum.html 390: 최대 스크롤에서 .sticky 가 폴드 안, 법적 고지 링크가 바에 안 가림
//   NNN5  lectures.html, faq.html, index.html: heading 시퀀스에 H2 → H4 건너뜀 0 (푸터 H2)
//   NNN6  lectures/yonsei-hum.html 390: .anch a.pl 접근가능 이름에 상품 표식 유지 (회귀)
//   FAQ   faq.html 1280/390: 11 앵커 착지 top ≥ 헤더 높이 (가림 0)
//   LC-2  상세 6면 캡션 = 매니페스트 실길이, 6본 mp4 길이 = 매니페스트 (ffprobe 는 make_lecture_samples --check 가 봄)
//   LC-4  상세 5면에 "2026 기출 해설" 그룹 1 + 행 1, 공통 면 0, 목록 카드 구성 문구에 기출 1
// 사용: node _design/lecture_20260906/measure_s6.mjs [http://127.0.0.1:8813]
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
// playwright 는 이 리포에 없다. 형제 측정 스크립트(measure_nn.mjs)와 같은 경로의 설치본을 빌린다
const require = createRequire("/Users/gregory/Workspace/iruri_6mo_thumb/package.json");
const { chromium } = require("playwright");

const BASE = process.argv[2] || "http://127.0.0.1:8813";
const man = JSON.parse(readFileSync(new URL("../../assets/video/samples_manifest.json", import.meta.url), "utf8")).samples;
const fails = [];
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fails.push(msg); };
const browser = await chromium.launch();

async function page(w, h, url) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.route("**/api.hyunhak.com/**", (r) => r.abort());
  await p.goto(BASE + "/" + url, { waitUntil: "load" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  return [ctx, p];
}

// NNN2 + NNN6 + NNN4 (상세면)
{
  const [ctx, p] = await page(1280, 800, "lectures/yonsei-hum.html");
  await p.click('.anch a[href="#faq"]');
  await p.waitForTimeout(1000);
  const cur = await p.$eval('.anch a[aria-current="true"]', (a) => a.textContent.trim());
  const top = await p.$eval("#faq", (s) => Math.round(s.getBoundingClientRect().top));
  const hd = await p.$eval("#hd", (h) => Math.round(h.getBoundingClientRect().bottom));
  ok(cur.startsWith("卷三"), `NNN2 #faq 착지 aria-current = ${cur} (top ${top}, 헤더 바닥 ${hd})`);
  await p.click('.anch a[href="#intro"]'); await p.waitForTimeout(1000);
  const cur2 = await p.$eval('.anch a[aria-current="true"]', (a) => a.textContent.trim());
  ok(cur2.startsWith("卷二"), `NNN2 #intro 착지 aria-current = ${cur2}`);
  await ctx.close();
}
{
  const [ctx, p] = await page(390, 844, "lectures/yonsei-hum.html");
  const name = await p.$eval(".anch a.pl", (a) => (a.innerText || a.textContent).replace(/\s+/g, " ").trim());
  const b = await p.$eval(".anch a.pl b", (el) => { const cs = getComputedStyle(el); return { display: cs.display, w: el.getBoundingClientRect().width }; });
  ok(b.display !== "none" && /단위 전권/.test(name), `NNN6 390 가격 링크 이름 "${name}" (b display ${b.display}, w ${b.w})`);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(600);
  const st = await p.$eval(".sticky", (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), disp: getComputedStyle(el).display, pos: getComputedStyle(el).position }; });
  const legal = await p.$eval('footer nav[aria-label="법적 고지"]', (el) => Math.round(el.getBoundingClientRect().bottom));
  const vh = 844;
  ok(st.disp !== "none" && st.top >= 0 && st.bottom <= vh, `NNN4 390 최하단 .sticky ${st.pos} top ${st.top} bottom ${st.bottom} (폴드 844)`);
  ok(legal <= st.top, `NNN4 390 법적 고지 바닥 ${legal} ≤ 바 top ${st.top} (가림 0)`);
  const hasBuy = await p.$$eval(".sticky a", (as) => as.some((a) => /담기/.test(a.textContent)));
  ok(hasBuy, "NNN4 390 마지막 화면에 담기 링크");
  await ctx.close();
}
// NNN3 (목록 폴드)
{
  const [ctx, p] = await page(1280, 800, "lectures.html");
  const solids = await p.evaluate(() => {
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim();
    const probe = document.createElement("i"); probe.style.color = ink; document.body.appendChild(probe);
    const inkRgb = getComputedStyle(probe).color; probe.remove();
    return [...document.querySelectorAll("a,button")].filter((el) => {
      const r = el.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= 800 || r.width === 0 || r.left < 0) return false;   // 건너뛰기 링크(x -9999) 제외
      if (el.closest("#hd, .util, nav.fix")) return false;   // 공용 셸(헤더 버튼)은 지면 채점 밖 (critic 도 지면만 셌다)
      return getComputedStyle(el).backgroundColor === inkRgb;
    }).map((el) => el.textContent.trim().slice(0, 20));
  });
  ok(solids.length === 1, `NNN3 1280 폴드 솔리드 ink 채움 = ${solids.length} ${JSON.stringify(solids)}`);
  const chip = await p.$eval('#crsChips button[aria-pressed="true"]', (b) => ({ bg: getComputedStyle(b).backgroundColor, sh: getComputedStyle(b).boxShadow.slice(0, 40), fw: getComputedStyle(b).fontWeight }));
  ok(/inset/.test(chip.sh) && chip.bg === "rgba(0, 0, 0, 0)", `NNN3 활성 칩 bg ${chip.bg} shadow ${chip.sh} fw ${chip.fw}`);
  const comp = await p.$$eval(".cr .comp span", (ss) => ss.map((s) => s.textContent).filter((t) => /기출 해설 1/.test(t)).length);
  ok(comp === 5, `LC-4 목록 카드 구성 문구에 '기출 해설 1' = ${comp}/5`);
  const cap = await p.$eval(".sample .cap", (c) => c.textContent);
  const want = (() => { const s = Math.round(man.common.length_sec); return `${Math.floor(s / 60)}분 ${s % 60}초`; })();
  ok(cap.includes(want), `LC-2 목록 캡션 "${want}" 포함: ${cap.trim().slice(0, 60)}`);
  await ctx.close();
}
// NNN5 heading 시퀀스
for (const u of ["lectures.html", "faq.html", "index.html", "lectures/yonsei-hum.html", "classroom.html"]) {
  const [ctx, p] = await page(1280, 800, u);
  const seq = await p.$$eval("h1,h2,h3,h4,h5,h6", (hs) => hs.filter((h) => h.offsetParent !== null || h.tagName === "H1").map((h) => Number(h.tagName[1])));
  let skip = 0; for (let i = 1; i < seq.length; i++) if (seq[i] > seq[i - 1] + 1) skip++;
  const ft = await p.$$eval("footer h2", (hs) => hs.length);
  ok(skip === 0 && ft === 3, `NNN5 ${u} heading 건너뜀 ${skip}, 푸터 H2 ${ft}/3 (시퀀스 ${seq.join("")})`);
  await ctx.close();
}
// FAQ 앵커 착지
for (const [w, h] of [[1280, 800], [390, 844]]) {
  const [ctx, p] = await page(w, h, "faq.html");
  const hdH = await p.$eval("#hd", (el) => Math.round(el.getBoundingClientRect().height));
  const ids = await p.$$eval(".faqp h2[id]", (hs) => hs.map((x) => x.id));
  let bad = [];
  for (const id of ids) {
    await p.evaluate((i) => { location.hash = ""; location.hash = "#" + i; }, id);
    await p.waitForTimeout(120);
    const top = await p.$eval("#" + id, (el) => Math.round(el.getBoundingClientRect().top));
    if (top < hdH) bad.push(`${id}:${top}`);
  }
  ok(bad.length === 0 && ids.length === 11, `FAQ ${w} 앵커 ${ids.length}개 착지 top ≥ 헤더 ${hdH}: 가림 ${bad.length} ${bad.join(" ")}`);
  await ctx.close();
}
// LC-2 상세 캡션 + LC-4 그룹
for (const code of ["common", "yonsei-hum", "yonsei-sci", "yonsei-intl", "korea-hum", "korea-sci"]) {
  const [ctx, p] = await page(1280, 800, `lectures/${code}.html`);
  const s = Math.round(man[code].length_sec); const want = `${Math.floor(s / 60)}분 ${s % 60}초`;
  const cap = await p.$eval("#sample .cap", (c) => c.textContent);
  ok(cap.includes(want), `LC-2 ${code} 캡션 "${want}" (매니페스트 ${man[code].length_sec}s 반올림): ${cap.trim().slice(0, 50)}`);
  const g = await p.$$eval(".lgrp .gh h3", (hs) => hs.map((h) => h.textContent.trim()));
  const rows = await p.$$eval(".lgrp", (gs) => gs.map((s2) => [s2.querySelector("h3").textContent.trim(), s2.querySelectorAll(".toc [data-lec]").length]));
  const gich = rows.find((r) => r[0] === "2026 기출 해설");
  if (code === "common") ok(!gich, `LC-4 common 면 기출 그룹 없음 (${g.join("/")})`);
  else ok(gich && gich[1] === 1, `LC-4 ${code} 기출 그룹 행 ${gich ? gich[1] : 0} (${g.join("/")})`);
  const t = await p.$eval("#toc h2.t", (h) => h.textContent);
  ok(code === "common" ? /한 묶음/.test(t) : /네 묶음/.test(t), `LC-4 ${code} 목차 제목 "${t}"`);
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `\nFAIL ${fails.length}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
