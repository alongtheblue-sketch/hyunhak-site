// 반증 6회차 렌즈 = 레이아웃 회귀 (2026-09-23). 대상 = 3d2ada3 팝업 무대 CSS(.pstage 2행 격자 place-items:end center, .pbar grid-area 2/1, 활성 .pop 아래 선 투명).
//   비교 판 = 94f577b(라이브). 수리 전 판은 route 가 assets/app.js, assets/base.css 두 파일만 git show 94f577b:<path> 로 바꿔 응답한다(리포 파일 무변경).
//   matrix  뷰포트 × 카드 구성 × 활성 카드(→ 로 순회, 모션 감소 = 전이 0) × 판(post=3d2ada3 서빙, pre=94f577b route)
//           뷰포트 = 지시 9종(320x568, 360x640, 390x640, 844x390, 768x1024, 1024x600, 1440x600, 1920x1080, 1440x900 확대 200% = 720x450 dsf2)
//                  + 추가 5종(568x320 가로 소형 폰, 640x360 가로 구형 안드로이드, 576x360 = 1440x900 확대 250%, 683x384 = 1366x768 확대 200%, 320x256 = 1280x1024 확대 400% WCAG 1.4.10)
//           구성   = index N1(행사 없음 → 의뢰 1장), N2(행사+의뢰), N3L(+긴 공지), N3S(+짧은 공지), N4(+긴+짧은 공지), faq F1(긴 공지 1장), F2(긴+짧은 공지)
//           잰 것  = 하단바 전체 뷰포트 안, 활성 카드 top 뷰포트 안, 무대 높이 대 뷰포트, 보이는 측면 카드와 하단바/활성 카드 겹침 면적, 활성 카드 위 빈 공간,
//                   카드 max-height(72vh) 준수, 카드 안 스크롤로 끝까지 도달, 가로 넘침(문서, 카드, 하단바 내용), 하단바 줄 수, 조작부(닫기 ← → 정지 체크) 중심 hit-test
//   turn    1440x900 모션 기본 N3S/N4 에서 → 1회, 전이 중 0/100/150/200/300ms(Web Animations 정지) 에 감아 도는 카드와 활성 카드 겹침 + 캡처(post/pre)
//   font    Pretendard 차단(폴백 서체) 1440x900 과 620x800 N2/N4: 하단바 줄 수와 한 줄 여유 폭
// 사용: node refute_layout.mjs [matrix|turn|font|all]  → r6/refute_layout.json, r6/shots/refute_layout_*.png
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "../../..");
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const OUT = path.join(HERE, "refute_layout.json");
const STOP = path.join(HERE, ".wf_stop");
const BASE = "http://localhost:8092/";
const APIB = "http://localhost:8799";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const which = process.argv[2] || "all";
const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const shots = new Set(result.shots || []);
const save = () => { result.shots = [...shots]; fs.writeFileSync(OUT, JSON.stringify(result, null, 2)); };
const stopped = () => fs.existsSync(STOP);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
const PRE = "94f577b";
const PRE_FILES = Object.fromEntries(["assets/app.js", "assets/base.css"].map((f) => [f, execFileSync("git", ["-C", REPO, "show", `${PRE}:${f}`], { maxBuffer: 64 << 20 })]));
{
  const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
  const served = {};
  for (const f of ["assets/app.js", "assets/base.css"]) {
    const live = Buffer.from(await (await fetch(BASE + f)).arrayBuffer());
    const head = execFileSync("git", ["-C", REPO, "show", "HEAD:" + f], { maxBuffer: 64 << 20 });
    served[f] = { served: sha(live), head: sha(head), pre: sha(PRE_FILES[f]), sameHead: sha(live) === sha(head) };
  }
  result.meta = { head: execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]).toString().trim(), pre: PRE, at: new Date().toISOString(), served };
  log("meta", JSON.stringify(result.meta));
}
const realCfg = await (await fetch(APIB + "/api/config")).json();
const CFG_NULL = { ...realCfg, promo: null };
const LONG = { id: "ntc_refute_long", title: "프로브 공지: 10월 면접 대비 강의 일정 변경과 환불 기준, 자료 발송 일정 안내",
  body_md: ("10월 면접 대비 강의 일정이 바뀌었습니다. 기존 신청자는 마이페이지에서 새 일정을 확인하고, 참석이 어려운 경우 7일 안에 환불을 신청할 수 있습니다. " +
    "자료는 결제 확인 뒤 2영업일 안에 등록한 메일로 보냅니다. 메일이 오지 않으면 스팸함을 먼저 확인하고, 그래도 없으면 문의 게시판에 주문번호와 함께 남겨 주세요. ").repeat(4) +
    "참고 주소 https://hyunhak.com/notice/2026-10-interview-lecture-schedule-change-and-refund-policy-details-for-existing-applicants",
  link_url: "/notice.html", link_label: "공지 전문 보기" };
const SHORT = { id: "ntc_refute_short", title: "짧은 공지", body_md: "10월 3일은 휴무입니다." };
const CONFIGS = {
  N1: { url: "index.html", cfg: CFG_NULL, notices: { items: [] } },
  N2: { url: "index.html", notices: { items: [] } },
  N3L: { url: "index.html", notices: { items: [LONG] } },
  N3S: { url: "index.html", notices: { items: [SHORT] } },
  N4: { url: "index.html", notices: { items: [LONG, SHORT] } },
  F1: { url: "faq.html", notices: { items: [LONG] } },
  F2: { url: "faq.html", notices: { items: [LONG, SHORT] } },
};
// [이름, w, h, dsf, 폰(isMobile+touch)]
const VPS = [
  ["320x568", 320, 568, 2, true], ["360x640", 360, 640, 3, true], ["390x640", 390, 640, 3, true], ["844x390", 844, 390, 3, true],
  ["768x1024", 768, 1024, 2, true], ["1024x600", 1024, 600, 1, false], ["1440x600", 1440, 600, 1, false], ["1920x1080", 1920, 1080, 1, false],
  ["z200_1440x900", 720, 450, 2, false],
  ["568x320", 568, 320, 2, true], ["640x360", 640, 360, 3, true], ["z250_1440x900", 576, 360, 2.5, false], ["z200_1366x768", 683, 384, 2, false], ["z400_1280x1024", 320, 256, 4, false],
];

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });
async function open(ver, w, h, dsf, phone, conf, o = {}) {
  const co = { viewport: { width: w, height: h }, deviceScaleFactor: dsf, locale: "ko-KR", reducedMotion: o.motion ? "no-preference" : "reduce" };
  if (phone) Object.assign(co, { hasTouch: true, isMobile: true });
  const ctx = await browser.newContext(co);
  const cfg = conf.cfg;
  if (cfg) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/config", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(cfg) }));
  await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(conf.notices || { items: [] }) }));
  if (ver === "pre") for (const [f, body] of Object.entries(PRE_FILES)) await ctx.route(BASE + f, (r) => r.fulfill({ status: 200, contentType: f.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8", body }));
  if (o.blockFont) await ctx.route((u) => /pretendard/i.test(u.href), (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  await page.goto(BASE + conf.url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => errors.push("goto " + e.message));
  await page.addStyleTag({ content: RV });
  const ok = await page.waitForSelector(".pdim", { timeout: 15000 }).then(() => true).catch(() => false);
  await page.evaluate(() => document.fonts.ready.then(() => 0));
  await page.waitForTimeout(o.settle ?? 500);
  return { ctx, page, errors, ok };
}
const MEAS = () => {
  const r1 = (x) => +x.toFixed(1);
  const R = (b) => ({ l: r1(b.left), t: r1(b.top), r: r1(b.right), b: r1(b.bottom), w: r1(b.width), h: r1(b.height) });
  const vw = innerWidth, vh = innerHeight;
  const root = document.querySelector(".pdim");
  if (!root) return { open: false };
  const stage = root.querySelector(".pstage"), bar = root.querySelector(".pbar");
  const slots = [...root.querySelectorAll(".pslot")];
  const on = root.querySelector(".pslot[data-on]"), pop = on.querySelector(":scope > .pop");
  const br = bar.getBoundingClientRect(), pr = pop.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  const inter = (a, b) => { const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); return x * y; };
  const VIEW = { left: 0, top: 0, right: vw, bottom: vh };
  const clipTo = (a) => ({ left: Math.max(a.left, 0), top: Math.max(a.top, 0), right: Math.min(a.right, vw), bottom: Math.min(a.bottom, vh) });
  const sides = slots.filter((s) => s !== on).map((s) => {
    const p = s.querySelector(":scope > .pop"), r = p.getBoundingClientRect(), op = +getComputedStyle(s).opacity;
    const visArea = op > 0.01 ? inter(r, VIEW) : 0;
    return { i: +s.dataset.i, d: s.style.getPropertyValue("--d"), rect: R(r), opacity: op, visibleArea: r1(visArea),
      overlapBar: r1(op > 0.01 ? inter(clipTo(r), br) : 0), overlapActive: r1(op > 0.01 ? inter(clipTo(r), pr) : 0), gapAboveBar: r1(br.top - r.bottom) };
  });
  const hit = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect(), x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2;
    const inView = x >= 0 && x < vw && y >= 0 && y < vh;
    const e = inView ? document.elementFromPoint(x, y) : null;
    const vis = r.width * r.height > 0 ? inter(r, VIEW) / (r.width * r.height) : 0;
    return { ok: !!e && (e === el || el.contains(e) || (el.tagName === "INPUT" && e.closest && e.closest("label") === el.closest("label"))), visFrac: +vis.toFixed(3), y: r1(y), hitEl: e ? e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : "") : null };
  };
  const ctl = { close: hit(bar.querySelector("[data-ppop-close]")), next: hit(bar.querySelector("[data-ppop-next]")), prev: hit(bar.querySelector("[data-ppop-prev]")),
    pause: hit(bar.querySelector("[data-ppop-pause]")), mute: hit(bar.querySelector("[data-ppop-mute-all]")) };
  // 하단바 줄 수와 내용 넘침
  const kids = [...bar.children].filter((k) => k.getClientRects().length);
  const tops = [...new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)))];
  const bcs = getComputedStyle(bar), innerR = br.right - parseFloat(bcs.borderRightWidth) - parseFloat(bcs.paddingRight), innerL = br.left + parseFloat(bcs.borderLeftWidth) + parseFloat(bcs.paddingLeft);
  const desc = [...bar.querySelectorAll("*")].filter((k) => k.getClientRects().length);
  const barContentOverR = r1(Math.max(0, ...desc.map((k) => k.getBoundingClientRect().right - innerR)));
  const barContentOverL = r1(Math.max(0, ...desc.map((k) => innerL - k.getBoundingClientRect().left)));
  // 카드 스크롤: 끝까지 내려 마지막 내용이 카드 안에 들어오는지
  const cs = getComputedStyle(pop), maxH = parseFloat(cs.maxHeight);
  const sh = pop.scrollHeight, ch = pop.clientHeight, s0 = pop.scrollTop;
  let endReach = null;
  if (sh > ch + 1) {
    pop.scrollTop = sh;
    const last = [...pop.querySelectorAll(".pfr *")].filter((k) => k.getClientRects().length).at(-1);
    const lr = last.getBoundingClientRect(), pr2 = pop.getBoundingClientRect();
    endReach = { scrollTop: r1(pop.scrollTop), maxScroll: sh - ch, lastBottom: r1(lr.bottom), popBottom: r1(pr2.bottom), ok: lr.bottom <= pr2.bottom + 0.5 };
    pop.scrollTop = s0;
  }
  const cta = pop.querySelector(".pacts .btn, .pbot .btn, a.btn");
  const ctaR = cta ? cta.getBoundingClientRect() : null;
  const title = pop.querySelector("h2");
  return {
    open: true, vw, vh, n: slots.length, cur: +on.dataset.i, kind: title ? title.textContent.trim().slice(0, 14) : null,
    bar: R(br), pop: R(pr), stage: R(sr), stageOverVh: r1(sr.height - vh), barParent: bar.parentElement === stage ? "stage" : "slot",
    barInView: br.top >= -0.5 && br.bottom <= vh + 0.5, barClipTop: r1(Math.max(0, -br.top)), barClipBottom: r1(Math.max(0, br.bottom - vh)),
    popTopInView: pr.top >= -0.5, popClipTop: r1(Math.max(0, -pr.top)),
    emptyAbove: r1(pr.top - sr.top), emptyAboveVisible: r1(Math.max(0, pr.top - Math.max(0, sr.top))), barGap: +(br.top - pr.bottom).toFixed(2),
    barRows: tops.length, barH: r1(br.height), barContentOverR, barContentOverL, barScrollX: bar.scrollWidth - bar.clientWidth,
    maxH: cs.maxHeight, popWithinMax: pr.height <= (Number.isFinite(maxH) ? maxH : 0.72 * vh) + 0.5, overflows: sh > ch + 1, scrollH: sh, clientH: ch, endReach,
    popScrollX: pop.scrollWidth - pop.clientWidth, docScrollX: document.documentElement.scrollWidth - vw, pdimScrollX: root.scrollWidth - root.clientWidth,
    ctaInCardView: ctaR ? ctaR.bottom <= pr.bottom + 0.5 && ctaR.top >= pr.top - 0.5 : null,
    sides, ctl,
  };
};
const cellFail = (m) => {
  const f = [];
  if (!m.open) return ["not open"];
  if (!m.barInView) f.push(`bar out of view (top clip ${m.barClipTop}, bottom clip ${m.barClipBottom})`);
  if (!m.popTopInView) f.push(`card top clipped ${m.popClipTop}`);
  if (!m.popWithinMax) f.push("card > max-height");
  if (m.endReach && !m.endReach.ok) f.push("scroll end not reachable");
  if (m.sides.some((s) => s.overlapBar > 0)) f.push("side overlaps bar " + m.sides.map((s) => s.overlapBar).join("/"));
  if (m.sides.some((s) => s.overlapActive > 0)) f.push("side overlaps active " + m.sides.map((s) => s.overlapActive).join("/"));
  if (m.docScrollX > 0) f.push("doc overflow-x " + m.docScrollX);
  if (m.popScrollX > 0) f.push("card overflow-x " + m.popScrollX);
  if (m.barContentOverR > 0.5 || m.barContentOverL > 0.5 || m.barScrollX > 0) f.push(`bar content overflow R${m.barContentOverR} L${m.barContentOverL}`);
  for (const [k, c] of Object.entries(m.ctl)) if (c && !(c.ok && c.visFrac >= 0.999)) f.push(`ctl ${k} ok=${c.ok} vis=${c.visFrac} hit=${c.hitEl}`);
  return f;
};

async function matrixPart() {
  const out = result.matrix && result.matrix.cells ? result.matrix : { cells: {} };
  const jobs = [];
  for (const ver of ["post", "pre"]) for (const [vn, w, h, dsf, phone] of VPS) for (const [cn, conf] of Object.entries(CONFIGS)) jobs.push({ ver, vn, w, h, dsf, phone, cn, conf });
  let idx = 0;
  const worker = async () => {
    while (idx < jobs.length) {
      if (stopped()) { out.stopped = true; return; }
      const j = jobs[idx++];
      const key = `${j.ver}|${j.vn}|${j.cn}`;
      const { ctx, page, errors, ok } = await open(j.ver, j.w, j.h, j.dsf, j.phone, j.conf);
      const rows = [];
      try {
        if (!ok) { out.cells[key] = { error: "popup not open", errors }; continue; }
        const n = await page.evaluate(() => document.querySelectorAll(".pdim .pslot").length);
        for (let k = 0; k < n; k++) {
          const m = await page.evaluate(MEAS);
          m.fail = cellFail(m);
          if (m.fail.length && j.ver === "post" && !rows.some((r) => r.fail.length)) { const p = path.join(SHOTS, `refute_layout_${j.vn}_${j.cn}_k${k}.png`); await page.screenshot({ path: p }); shots.add(p); m.shot = p; }
          rows.push(m);
          if (n > 1 && k < n - 1) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(120); }
        }
        out.cells[key] = { rows, errors, fails: rows.flatMap((r) => r.fail.map((x) => `k${r.cur}: ${x}`)) };
      } catch (e) { out.cells[key] = { error: String(e.message || e), errors }; }
      finally { await ctx.close(); }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  // 요약: 칸별 실패, post 전용 실패(= pre 에서는 통과) 표시
  const sum = { post: {}, pre: {}, newInPost: [], fixedInPost: [], maxEmptyAbove: {}, errors: [] };
  for (const [key, c] of Object.entries(out.cells)) {
    const [ver, vn, cn] = key.split("|");
    if (c.error) { sum.errors.push(key + ": " + c.error); continue; }
    if (c.fails.length) sum[ver][`${vn}|${cn}`] = c.fails;
    if (ver === "post") {
      const e = Math.max(...c.rows.map((r) => r.emptyAbove));
      const worst = c.rows.find((r) => r.emptyAbove === e);
      sum.maxEmptyAbove[`${vn}|${cn}`] = { emptyAbove: e, card: worst.kind, popTop: worst.pop.t, vh: worst.vh, popTopPct: +(100 * worst.pop.t / worst.vh).toFixed(1) };
    }
  }
  for (const k of new Set([...Object.keys(sum.post), ...Object.keys(sum.pre)])) {
    const a = JSON.stringify((sum.post[k] || []).map((x) => x.replace(/[\d.]+/g, "#"))), b = JSON.stringify((sum.pre[k] || []).map((x) => x.replace(/[\d.]+/g, "#")));
    if (sum.post[k] && a !== b) sum.newInPost.push({ cell: k, post: sum.post[k], pre: sum.pre[k] || [] });
    if (!sum.post[k] && sum.pre[k]) sum.fixedInPost.push({ cell: k, pre: sum.pre[k] });
  }
  out.summary = sum;
  result.matrix = out; save();
  log("matrix post fails", Object.keys(sum.post).length, "pre fails", Object.keys(sum.pre).length, "errors", sum.errors.length);
  for (const [k, v] of Object.entries(sum.post)) log("  post", k, JSON.stringify(v));
  log("newInPost", JSON.stringify(sum.newInPost));
  log("fixedInPost", JSON.stringify(sum.fixedInPost.map((x) => x.cell)));
}

// 전이 중 감아 도는 카드(좌측 → 우측)와 활성 카드 겹침
async function turnPart() {
  const out = {};
  for (const ver of ["post", "pre"]) for (const cn of ["N3S", "N4"]) {
    if (stopped()) { out.stopped = true; break; }
    const key = `${ver}_${cn}`;
    const { ctx, page, errors } = await open(ver, 1440, 900, 1, false, CONFIGS[cn], { motion: true });
    try {
      await page.evaluate(() => { const b = document.querySelector(".pdim [data-ppop-pause]"); if (b && b.textContent.trim() === "정지") b.click(); });   // 자동 넘김 정지(전이 관찰만)
      await page.waitForTimeout(400);
      const before = await page.evaluate(() => [...document.querySelectorAll(".pdim .pslot")].map((s) => ({ i: +s.dataset.i, on: s.hasAttribute("data-on"), d: s.style.getPropertyValue("--d") })));
      await page.keyboard.press("ArrowRight");
      await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
      const frames = [];
      for (const t of [0, 100, 150, 200, 300]) {
        const f = await page.evaluate((t) => {
          document.getAnimations().forEach((a) => { a.currentTime = t; });
          const slots = [...document.querySelectorAll(".pdim .pslot")];
          const on = document.querySelector(".pdim .pslot[data-on] > .pop").getBoundingClientRect();
          const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          return slots.map((s) => { const r = s.querySelector(":scope > .pop").getBoundingClientRect(); return { i: +s.dataset.i, on: s.hasAttribute("data-on"), d: s.style.getPropertyValue("--d"), l: +r.left.toFixed(1), r: +r.right.toFixed(1), overlapActive: s.hasAttribute("data-on") ? null : +inter(r, on).toFixed(0), z: getComputedStyle(s).zIndex }; });
        }, t);
        const p = path.join(SHOTS, `refute_layout_turn_${key}_${t}.png`); await page.screenshot({ path: p }); shots.add(p);
        frames.push({ t, slots: f, shot: p });
      }
      out[key] = { before, frames, errors };
      log("turn", key, JSON.stringify(frames.map((f) => [f.t, f.slots.filter((s) => !s.on).map((s) => [s.i, s.d, s.l, s.r, s.overlapActive])])));
    } catch (e) { out[key] = { error: String(e.message || e) }; }
    finally { await ctx.close(); }
  }
  result.turn = out; save();
}

// 폴백 서체에서 하단바 한 줄 여유
async function fontPart() {
  const out = {};
  for (const ver of ["post", "pre"]) for (const [w, h] of [[1440, 900], [620, 800]]) for (const cn of ["N2", "N4"]) for (const block of [false, true]) {
    if (stopped()) { out.stopped = true; break; }
    const key = `${ver}_${w}x${h}_${cn}_${block ? "fallback" : "pretendard"}`;
    const { ctx, page, errors } = await open(ver, w, h, 1, false, CONFIGS[cn], { blockFont: block });
    try {
      const m = await page.evaluate(() => {
        const bar = document.querySelector(".pdim .pbar"), br = bar.getBoundingClientRect(), cs = getComputedStyle(bar);
        const inner = br.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
        const kids = [...bar.children].filter((k) => k.getClientRects().length);
        const widths = kids.map((k) => +k.getBoundingClientRect().width.toFixed(1));
        const gap = parseFloat(cs.columnGap) || 0;
        const tops = [...new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)))];
        return { pretendard: document.fonts.check('13px "Pretendard Variable"'), family: getComputedStyle(bar.querySelector(".pmute")).fontFamily.slice(0, 40), inner: +inner.toFixed(1), widths, gap,
          slack: +(inner - widths.reduce((a, b) => a + b, 0) - gap * (kids.length - 1)).toFixed(1), rows: tops.length, barH: +br.height.toFixed(1) };
      });
      out[key] = { ...m, errors };
      log("font", key, JSON.stringify(m));
    } catch (e) { out[key] = { error: String(e.message || e) }; }
    finally { await ctx.close(); }
  }
  result.font = out; save();
}

const parts = { matrix: matrixPart, turn: turnPart, font: fontPart };
for (const [k, fn] of Object.entries(parts)) {
  if (which !== "all" && which !== k) continue;
  if (stopped()) { log("STOP seen before", k); result.stopped = true; break; }
  const t0 = Date.now();
  try { await fn(); } catch (e) { log("PART ERROR", k, e.stack || e); result[k + "_error"] = String(e.stack || e); save(); }
  log(`part ${k} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
save();
log("wrote", OUT);
process.exit(0);
