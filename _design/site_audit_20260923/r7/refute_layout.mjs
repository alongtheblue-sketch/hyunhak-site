// 반증 7회차 렌즈 = 레이아웃 회귀 (2026-09-23). 대상 = e1955be (3d2ada3 + ab9160d + e1955be) 팝업 무대.
//   post = 워크트리 서빙(8092) 그대로, pre = 라이브 96be167 의 assets/app.js, assets/base.css 를 route 로 서빙(팝업 코드 = 94f577b, 두 파일 diff 0).
//   matrix  뷰포트 22종 × 카드 구성 15종(index N1..N6, 이미지·긴 토큰 공지 N3H, faq F1/F2/Q0, about A1/A0/A3, lectures/interview/studio 3장) × 판
//           잰 것 = 하단바 전체 뷰포트 안, 카드+하단바 예산(vh - 32), --pbar-h 대 실측 하단바 높이, max-height 대 식, 측면 카드와 하단바/활성 카드 겹침,
//                   활성 카드 위 빈 공간, 카드 안 스크롤 끝 도달, 가로 넘침(문서, 카드, 하단바 내용), 하단바 줄 수, 조작부 중심 hit-test
//   font    폴백 서체(Pretendard 차단), CDP Page.setFontSizes standard 24, html font-size 150%, 최소 글꼴 크기(Chrome 환경설정 20/24), WCAG 1.4.12 글자 간격
//   sync    --pbar-h 동기: 글꼴 3초 지연 로드 전후, 창 크기 변경(600 경계 가로지름, 회전, 높이 축소), 열린 뒤 글자 간격 주입
//   joint   dsf 1, 1.5, 2 접합 crop(카드 아래 모서리, 그림자, 초점 윤곽) post/pre 행 대조(python PIL)
//   bars    일반 스크롤바(--hide-scrollbars 해제): 딤 폭, 카드 스크롤바, 하단바 폭 정렬
// 사용: node refute_layout.mjs [matrix|font|sync|joint|bars|all]  → r7/refute_layout.json, r7/shots/refute_layout_*.png
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "../../..");
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const OUT = path.join(HERE, "refute_layout.json");
const TMP = "/private/tmp/claude-501/-Users-gregory/a498102d-d8da-423d-950c-f2201bb2189d/scratchpad/rl7";
fs.mkdirSync(TMP, { recursive: true });
const BASE = "http://localhost:8092/";
const APIB = "http://localhost:8799";
const RV = ".rv{opacity:1!important;transform:none!important;transition:none!important}";
const CORS = { "access-control-allow-origin": "http://localhost:8092", "access-control-allow-credentials": "true", vary: "Origin", "content-type": "application/json; charset=utf-8" };
const which = process.argv[2] || "all";
const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const shots = new Set(result.shots || []);
const save = () => { result.shots = [...shots]; fs.writeFileSync(OUT, JSON.stringify(result, null, 2)); };
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
const PRE = "96be167";
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
const LONG = { id: "ntc_r7_long", title: "프로브 공지: 10월 면접 대비 강의 일정 변경과 환불 기준, 자료 발송 일정 안내",
  body_md: ("10월 면접 대비 강의 일정이 바뀌었습니다. 기존 신청자는 마이페이지에서 새 일정을 확인하고, 참석이 어려운 경우 7일 안에 환불을 신청할 수 있습니다. " +
    "자료는 결제 확인 뒤 2영업일 안에 등록한 메일로 보냅니다. 메일이 오지 않으면 스팸함을 먼저 확인하고, 그래도 없으면 문의 게시판에 주문번호와 함께 남겨 주세요. ").repeat(4),
  link_url: "/notice.html", link_label: "공지 전문 보기" };
const SHORT = { id: "ntc_r7_short", title: "짧은 공지", body_md: "10월 3일은 휴무입니다." };
const MID = { id: "ntc_r7_mid", title: "중간 길이 공지: 추석 연휴 배송 안내", body_md: "추석 연휴 기간(9월 27일부터 10월 1일까지) 주문은 10월 2일부터 순서대로 보냅니다. 전자 자료는 연휴에도 바로 열람할 수 있습니다." };
const SHORT2 = { id: "ntc_r7_short2", title: "점검 안내", body_md: "10월 5일 새벽 2시부터 4시까지 결제가 멈춥니다." };
const HTMLN = { id: "ntc_r7_html", title: "이미지와 긴 주소가 든 공지",
  body_html: '<p>행사 포스터 <img src="https://hyunhak.com/assets/alimtalk_welcome_800x400.jpg" width="900" height="450" alt="포스터"> 를 확인하세요.</p><h3>소제목</h3><ul><li>항목 하나</li><li>항목 둘</li></ul>' +
    '<p><a href="https://hyunhak.com/notice/2026-10-interview-lecture-schedule-change-and-refund-policy-details">https://hyunhak.com/notice/2026-10-interview-lecture-schedule-change-and-refund-policy-details</a></p>' +
    "<p>참고번호 HH2026100100000000000000000000000000000000000001</p>" };
const idx = (items, cfg) => ({ url: "index.html", notices: { items }, ...(cfg ? { cfg } : {}) });
const SUB_VPS = ["1440x900", "390x640", "844x390", "z400_320x256"];
const CONFIGS = {
  N1: idx([], CFG_NULL), N2: idx([]), N3L: idx([LONG]), N3S: idx([SHORT]), N4: idx([LONG, SHORT]), N3H: idx([HTMLN]), N6: idx([LONG, SHORT, MID, SHORT2]),
  F1: { url: "faq.html", notices: { items: [LONG] } }, F2: { url: "faq.html", notices: { items: [LONG, SHORT] } }, Q0: { url: "faq.html", notices: { items: [] }, expectNone: true },
  A1: { url: "about.html", notices: { items: [] } }, A0: { url: "about.html", cfg: CFG_NULL, notices: { items: [] }, expectNone: true }, A3: { url: "about.html", notices: { items: [LONG, SHORT] } },
  L3: { url: "lectures.html", notices: { items: [MID, SHORT] }, vps: SUB_VPS }, I3: { url: "interview.html", notices: { items: [LONG, SHORT] }, vps: SUB_VPS }, S3: { url: "studio.html", notices: { items: [SHORT, LONG] }, vps: SUB_VPS },
};
// [이름, w, h, dsf, 터치]
const VPS = [
  ["320x568", 320, 568, 2, true], ["360x640", 360, 640, 3, true], ["390x640", 390, 640, 3, true], ["412x915", 412, 915, 2.625, true],
  ["472x800", 472, 800, 1, false], ["600x800", 600, 800, 1, false], ["601x800", 601, 800, 1, false], ["844x390", 844, 390, 3, true],
  ["768x1024", 768, 1024, 2, true], ["1024x600", 1024, 600, 1, false], ["1440x600", 1440, 600, 1, false], ["1920x1080", 1920, 1080, 1, false], ["2560x1440", 2560, 1440, 1, false],
  ["z200_720x450", 720, 450, 2, false], ["z250_576x360", 576, 360, 2.5, false], ["z400_320x256", 320, 256, 4, false],
  ["280x653", 280, 653, 3, true], ["z400_360x225", 360, 225, 4, false], ["z300_480x300", 480, 300, 3, false], ["1440x900", 1440, 900, 1, false], ["1440x420", 1440, 420, 1, false], ["390x844", 390, 844, 3, true],
];
const VPM = Object.fromEntries(VPS.map((v) => [v[0], v]));

let browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] });
async function routes(ctx, ver, conf, o) {
  const cfg = conf.cfg;
  if (cfg) await ctx.route((u) => u.origin === APIB && u.pathname === "/api/config", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(cfg) }));
  await ctx.route((u) => u.origin === APIB && u.pathname === "/api/notices/active", (r) => r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(conf.notices || { items: [] }) }));
  if (ver === "pre") for (const [f, body] of Object.entries(PRE_FILES)) await ctx.route(BASE + f, (r) => r.fulfill({ status: 200, contentType: f.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8", body }));
  if (o.blockFont) await ctx.route((u) => /pretendard/i.test(u.href), (r) => r.abort());
  if (o.delayFont) await ctx.route((u) => /pretendard/i.test(u.href) && /\.woff2?(\?|$)/.test(u.href), async (r) => { await new Promise((z) => setTimeout(z, o.delayFont)); await r.continue().catch(() => {}); });
}
async function prep(ctx, page, o) {
  if (o.cdpFont) { const s = await ctx.newCDPSession(page); await s.send("Page.setFontSizes", { fontSizes: { standard: o.cdpFont, fixed: Math.round(o.cdpFont * 0.8125) } }); }
  // 문서 요소가 아직 없을 때 appendChild 가 던지면 DOMContentLoaded 등록까지 끊긴다(1차 실행 결함). 등록을 먼저 하고, 붙이기는 DCL 캡처 단계(app.js 의 무대 열기보다 앞)에서 한다
  if (o.initCss) await page.addInitScript((css) => { const st = document.createElement("style"); st.id = "rl7-init-css"; st.textContent = css; document.addEventListener("DOMContentLoaded", () => document.head.appendChild(st), { once: true, capture: true }); }, o.initCss);
  if (o.noRO) await page.addInitScript(() => { delete window.ResizeObserver; window.ResizeObserver = undefined; });
}
async function load(page, conf, o) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  await page.goto(BASE + conf.url, { waitUntil: o.delayFont ? "domcontentloaded" : "networkidle", timeout: 30000 }).catch((e) => errors.push("goto " + e.message));
  await page.addStyleTag({ content: RV }).catch(() => {});
  const ok = await page.waitForSelector(".pdim", { timeout: conf.expectNone ? 4000 : 15000 }).then(() => true).catch(() => false);
  if (!o.delayFont) await page.evaluate(() => document.fonts.ready.then(() => 0));
  await page.waitForTimeout(o.settle ?? 400);
  return { errors, ok };
}
async function open(ver, vp, conf, o = {}) {
  const [, w, h, dsf, phone] = vp;
  const co = { viewport: { width: w, height: h }, deviceScaleFactor: dsf, locale: "ko-KR", reducedMotion: o.motion ? "no-preference" : "reduce" };
  if (phone) Object.assign(co, { hasTouch: true, isMobile: true });
  const b = o.browser || browser;
  const ctx = await b.newContext(co);
  await routes(ctx, ver, conf, o);
  const page = await ctx.newPage();
  await prep(ctx, page, o);
  const { errors, ok } = await load(page, conf, o);
  return { ctx, page, errors, ok, close: () => ctx.close() };
}
// 최소 글꼴 크기 = Chrome 환경설정(webkit.webprefs.minimum_font_size). CDP 경로가 없어 사용자 데이터 폴더의 Preferences 로 준다.
async function openMinFont(ver, vp, conf, minPx, o = {}) {
  const [, w, h, dsf, phone] = vp;
  const dir = fs.mkdtempSync(path.join(TMP, "mf-"));
  fs.mkdirSync(path.join(dir, "Default"), { recursive: true });
  fs.writeFileSync(path.join(dir, "Default", "Preferences"), JSON.stringify({ webkit: { webprefs: { minimum_font_size: minPx, minimum_logical_font_size: minPx } } }));
  const co = { viewport: { width: w, height: h }, deviceScaleFactor: dsf, locale: "ko-KR", reducedMotion: "reduce", channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"] };
  if (phone) Object.assign(co, { hasTouch: true, isMobile: true });
  const ctx = await chromium.launchPersistentContext(dir, co);
  await routes(ctx, ver, conf, o);
  const page = ctx.pages()[0] || await ctx.newPage();
  const { errors, ok } = await load(page, conf, o);
  return { ctx, page, errors, ok, close: async () => { await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]); fs.rmSync(dir, { recursive: true, force: true }); } };
}
const MEAS = () => {
  const r1 = (x) => +x.toFixed(2);
  const R = (b) => ({ l: r1(b.left), t: r1(b.top), r: r1(b.right), b: r1(b.bottom), w: r1(b.width), h: r1(b.height) });
  const vw = innerWidth, vh = innerHeight;
  const root = document.querySelector(".pdim");
  if (!root) return { open: false };
  const stage = root.querySelector(".pstage"), bar = root.querySelector(".pbar");
  const slots = [...root.querySelectorAll(".pslot")];
  const on = root.querySelector(".pslot[data-on]"), pop = on.querySelector(":scope > .pop");
  const br = bar.getBoundingClientRect(), pr = pop.getBoundingClientRect(), sr = stage.getBoundingClientRect(), rr = root.getBoundingClientRect();
  const inter = (a, b) => { const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); return x * y; };
  const VIEW = { left: 0, top: 0, right: vw, bottom: vh };
  const clipTo = (a) => ({ left: Math.max(a.left, 0), top: Math.max(a.top, 0), right: Math.min(a.right, vw), bottom: Math.min(a.bottom, vh) });
  const sides = slots.filter((s) => s !== on).map((s) => {
    const p = s.querySelector(":scope > .pop"), r = p.getBoundingClientRect(), op = +getComputedStyle(s).opacity;
    return { i: +s.dataset.i, d: s.dataset.d, far: s.hasAttribute("data-far"), rect: R(r), opacity: op, visibleArea: r1(op > 0.01 ? inter(r, VIEW) : 0),
      overlapBar: r1(op > 0.01 ? inter(clipTo(r), br) : 0), overlapActive: r1(op > 0.01 ? inter(clipTo(r), pr) : 0), bottomToBarTop: r1(br.top - r.bottom) };
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
  const kids = [...bar.children].filter((k) => k.getClientRects().length);
  const tops = [...new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)))];
  const bcs = getComputedStyle(bar), innerR = br.right - parseFloat(bcs.borderRightWidth) - parseFloat(bcs.paddingRight), innerL = br.left + parseFloat(bcs.borderLeftWidth) + parseFloat(bcs.paddingLeft);
  const desc = [...bar.querySelectorAll("*")].filter((k) => k.getClientRects().length);
  const barContentOverR = r1(Math.max(0, ...desc.map((k) => k.getBoundingClientRect().right - innerR)));
  const barContentOverL = r1(Math.max(0, ...desc.map((k) => innerL - k.getBoundingClientRect().left)));
  const cs = getComputedStyle(pop), maxH = parseFloat(cs.maxHeight);
  const pbarVar = root.style.getPropertyValue("--pbar-h"), pbarNum = parseFloat(pbarVar);
  const expMax = Math.min(0.72 * vh, vh - 32 - (Number.isFinite(pbarNum) ? pbarNum : 0));
  const sh = pop.scrollHeight, ch = pop.clientHeight, s0 = pop.scrollTop;
  let endReach = null;
  if (sh > ch + 1) {
    pop.scrollTop = sh;
    const last = [...pop.querySelectorAll(".pfr *")].filter((k) => k.getClientRects().length).at(-1);
    const lr = last.getBoundingClientRect(), pr2 = pop.getBoundingClientRect();
    endReach = { scrollTop: r1(pop.scrollTop), maxScroll: sh - ch, lastBottom: r1(lr.bottom), popBottom: r1(pr2.bottom), ok: lr.bottom <= pr2.bottom + 0.5 };
    pop.scrollTop = s0;
  }
  const wide = [...pop.querySelectorAll(".pfr *")].filter((k) => k.getClientRects().length && k.getBoundingClientRect().right > pr.right + 0.5).map((k) => k.tagName.toLowerCase() + ":" + Math.round(k.getBoundingClientRect().right - pr.right)).slice(0, 4);
  const title = pop.querySelector("h2");
  return {
    open: true, vw, vh, n: slots.length, cur: +on.dataset.i, kind: title ? title.textContent.trim().slice(0, 14) : null,
    bar: R(br), pop: R(pr), stage: R(sr), root: R(rr), barParent: bar.parentElement === stage ? "stage" : "slot",
    barInView: br.top >= -0.5 && br.bottom <= vh + 0.5, barClipTop: r1(Math.max(0, -br.top)), barClipBottom: r1(Math.max(0, br.bottom - vh)), barBottomGap: r1(vh - br.bottom),
    popTopInView: pr.top >= -0.5, popClipTop: r1(Math.max(0, -pr.top)), popTopGap: r1(pr.top),
    emptyAbove: r1(pr.top - sr.top), barGap: r1(br.top - pr.bottom),
    barRows: tops.length, barH: r1(br.height), barOffsetH: bar.offsetHeight, pbarVar, pbarDelta: Number.isFinite(pbarNum) ? r1(pbarNum - br.height) : null,
    barContentOverR, barContentOverL, barScrollX: bar.scrollWidth - bar.clientWidth,
    maxH: cs.maxHeight, expMax: r1(expMax), maxHDelta: Number.isFinite(maxH) ? r1(maxH - expMax) : null,
    popWithinMax: pr.height <= (Number.isFinite(maxH) ? maxH : 0.72 * vh) + 0.5, budget: r1(pr.height + br.height - 1 - (vh - 32)),
    overflows: sh > ch + 1, scrollH: sh, clientH: ch, visibleCardH: r1(Math.max(0, Math.min(pr.bottom, br.top, vh) - Math.max(pr.top, 0))), endReach,
    popScrollX: pop.scrollWidth - pop.clientWidth, wide, popSbW: pop.offsetWidth - pop.clientWidth - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth),
    docScrollX: document.documentElement.scrollWidth - vw, pdimScrollX: root.scrollWidth - root.clientWidth, rootW: r1(rr.width), clientW: document.documentElement.clientWidth,
    imgs: pop.querySelectorAll("img").length,
    sides, ctl,
  };
};
const cellFail = (m, ver) => {
  const f = [];
  if (!m.open) return ["not open"];
  if (!m.barInView) f.push(`bar out of view (top clip ${m.barClipTop}, bottom clip ${m.barClipBottom})`);
  if (!m.popTopInView) f.push(`card top clipped ${m.popClipTop}`);
  if (!m.popWithinMax) f.push("card > max-height");
  if (m.endReach && !m.endReach.ok) f.push("scroll end not reachable");
  if (m.sides.some((s) => s.overlapBar > 0)) f.push("side overlaps bar " + m.sides.map((s) => s.overlapBar).join("/"));
  if (m.sides.some((s) => s.overlapActive > 0)) f.push("side overlaps active " + m.sides.map((s) => s.overlapActive).join("/"));
  if (m.docScrollX > 0) f.push("doc overflow-x " + m.docScrollX);
  if (m.popScrollX > 0) f.push("card overflow-x " + m.popScrollX + " " + m.wide.join(","));
  if (m.barContentOverR > 0.5 || m.barContentOverL > 0.5 || m.barScrollX > 0) f.push(`bar content overflow R${m.barContentOverR} L${m.barContentOverL}`);
  if (ver === "post" && m.pbarDelta !== null && Math.abs(m.pbarDelta) > 1) f.push(`--pbar-h ${m.pbarVar} vs bar ${m.barH}`);
  if (ver === "post" && m.pbarDelta === null) f.push("--pbar-h missing");
  if (ver === "post" && m.maxHDelta !== null && Math.abs(m.maxHDelta) > 1) f.push(`max-height ${m.maxH} vs formula ${m.expMax}`);
  for (const [k, c] of Object.entries(m.ctl)) if (c && !(c.ok && c.visFrac >= 0.999)) f.push(`ctl ${k} ok=${c.ok} vis=${c.visFrac} hit=${c.hitEl}`);
  return f;
};
const norm = (x) => x.replace(/-?[\d.]+(px)?/g, "#");
async function pool(jobs, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) { const j = jobs[i++]; try { await fn(j); } catch (e) { log("job error", JSON.stringify(j.key || j), String(e.message || e).slice(0, 200)); } } })); }

async function matrixPart() {
  const out = { cells: {} };
  const jobs = [];
  for (const ver of ["post", "pre"]) for (const vp of VPS) for (const [cn, conf] of Object.entries(CONFIGS)) {
    if (conf.vps && !conf.vps.includes(vp[0])) continue;
    jobs.push({ ver, vp, cn, conf, key: `${ver}|${vp[0]}|${cn}` });
  }
  await pool(jobs, 8, async (j) => {
    const { ctx, page, errors, ok } = await open(j.ver, j.vp, j.conf);
    try {
      if (!ok) { out.cells[j.key] = { noPopup: true, expectNone: !!j.conf.expectNone, errors }; return; }
      const n = await page.evaluate(() => document.querySelectorAll(".pdim .pslot").length);
      const rows = [];
      for (let k = 0; k < n; k++) {
        const m = await page.evaluate(MEAS);
        m.fail = cellFail(m, j.ver);
        if (m.fail.length && !rows.some((r) => r.fail.length)) { const p = path.join(SHOTS, `refute_layout_${j.ver}_${j.vp[0]}_${j.cn}_k${k}.png`); await page.screenshot({ path: p }); shots.add(p); m.shot = p; }
        rows.push(m);
        if (n > 1 && k < n - 1) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(140); }
      }
      out.cells[j.key] = { rows, errors, fails: rows.flatMap((r) => r.fail.map((x) => `k${r.cur}: ${x}`)) };
    } finally { await ctx.close(); }
  });
  const sum = { post: {}, pre: {}, newInPost: [], fixedInPost: [], noPopup: [], errors: [], emptyAboveMax: {}, pbarDeltaMax: 0, maxHDeltaMax: 0, budgetMax: -1e9, barRows: {}, visibleCardHMin: {} };
  for (const [key, c] of Object.entries(out.cells)) {
    const [ver, vn, cn] = key.split("|");
    if (c.noPopup) { sum.noPopup.push(key + (c.expectNone ? " (expected)" : " (UNEXPECTED)")); continue; }
    if (c.errors && c.errors.length) sum.errors.push(key + ": " + c.errors.join(" | "));
    if (c.fails.length) sum[ver][`${vn}|${cn}`] = c.fails;
    if (ver === "post") {
      for (const r of c.rows) {
        if (r.pbarDelta !== null) sum.pbarDeltaMax = Math.max(sum.pbarDeltaMax, Math.abs(r.pbarDelta));
        if (r.maxHDelta !== null) sum.maxHDeltaMax = Math.max(sum.maxHDeltaMax, Math.abs(r.maxHDelta));
        sum.budgetMax = Math.max(sum.budgetMax, r.budget);
      }
      const e = Math.max(...c.rows.map((r) => r.emptyAbove));
      sum.emptyAboveMax[`${vn}|${cn}`] = e;
      sum.barRows[vn] = [...new Set([...(sum.barRows[vn] || []), ...c.rows.map((r) => r.barRows)])];
      sum.visibleCardHMin[`${vn}|${cn}`] = Math.min(...c.rows.map((r) => r.visibleCardH));
    }
  }
  for (const k of new Set([...Object.keys(sum.post), ...Object.keys(sum.pre)])) {
    const a = new Set((sum.post[k] || []).map(norm)), b = new Set((sum.pre[k] || []).map(norm));
    const onlyPost = [...a].filter((x) => !b.has(x));
    if (onlyPost.length) sum.newInPost.push({ cell: k, onlyPost, post: sum.post[k] || [], pre: sum.pre[k] || [] });
    if (!sum.post[k] && sum.pre[k]) sum.fixedInPost.push({ cell: k, pre: sum.pre[k] });
  }
  out.summary = sum;
  result.matrix = out; save();
  log("matrix cells", Object.keys(out.cells).length, "post fails", Object.keys(sum.post).length, "pre fails", Object.keys(sum.pre).length);
  for (const [k, v] of Object.entries(sum.post)) log("  post", k, JSON.stringify(v.slice(0, 4)));
  log("newInPost", JSON.stringify(sum.newInPost.map((x) => [x.cell, x.onlyPost])));
  log("fixedInPost", JSON.stringify(sum.fixedInPost.map((x) => x.cell)));
  log("noPopup", JSON.stringify(sum.noPopup));
  log("pbarDeltaMax", sum.pbarDeltaMax, "maxHDeltaMax", sum.maxHDeltaMax, "budgetMax", sum.budgetMax);
  log("errors", JSON.stringify(sum.errors.slice(0, 10)));
}

const TS = "*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}";
const BAR_M = () => {
  const bar = document.querySelector(".pdim .pbar"), root = document.querySelector(".pdim");
  if (!bar) return null;
  const br = bar.getBoundingClientRect(), cs = getComputedStyle(bar);
  const inner = br.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
  const kids = [...bar.children].filter((k) => k.getClientRects().length);
  const mute = bar.querySelector(".pmute"), mr = mute.getBoundingClientRect();
  return { pretendard: document.fonts.check('13px "Pretendard Variable"'), inner: +inner.toFixed(1), widths: kids.map((k) => +k.getBoundingClientRect().width.toFixed(1)),
    rows: [...new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)))].length, barH: +br.height.toFixed(2), pbar: root.style.getPropertyValue("--pbar-h"),
    injected: !!document.getElementById("rl7-init-css"), muteW: +mr.width.toFixed(1), muteTextH: +mr.height.toFixed(1), pause: (bar.querySelector("[data-ppop-pause]") || {}).textContent || null };
};
async function fontPart() {
  const out = {};
  const VARIANTS = [
    ["pretendard", {}], ["fallback", { blockFont: true }], ["cdp24", { cdpFont: 24 }], ["html150", { initCss: "html{font-size:150%!important}" }],
    ["textspacing", { initCss: TS }], ["minfont20", { minFont: 20 }], ["minfont24", { minFont: 24 }],
  ];
  const jobs = [];
  for (const ver of ["post", "pre"]) for (const vn of ["1440x900", "620x800", "390x640", "320x568", "280x653"]) for (const cn of ["N2", "N4", "N1"]) for (const [tag, o] of VARIANTS) {
    if (cn === "N1" && !["minfont24", "textspacing", "fallback"].includes(tag)) continue;
    jobs.push({ ver, vn, cn, tag, o, key: `${ver}|${vn}|${cn}|${tag}` });
  }
  VPM["620x800"] = ["620x800", 620, 800, 1, false];
  await pool(jobs, 5, async (j) => {
    const vp = VPM[j.vn];
    const h = j.o.minFont ? await openMinFont(j.ver, vp, CONFIGS[j.cn], j.o.minFont, j.o) : await open(j.ver, vp, CONFIGS[j.cn], j.o);
    try {
      if (!h.ok) { out[j.key] = { noPopup: true, errors: h.errors }; return; }
      const rows = [];
      const n = await h.page.evaluate(() => document.querySelectorAll(".pdim .pslot").length);
      for (let k = 0; k < n; k++) {
        const m = await h.page.evaluate(MEAS); m.fail = cellFail(m, j.ver); m.barM = await h.page.evaluate(BAR_M);
        if (m.fail.length && !rows.some((r) => r.fail.length)) { const p = path.join(SHOTS, `refute_layout_font_${j.ver}_${j.vn}_${j.cn}_${j.tag}_k${k}.png`); await h.page.screenshot({ path: p }); shots.add(p); m.shot = p; }
        rows.push(m);
        if (n > 1 && k < n - 1) { await h.page.keyboard.press("ArrowRight"); await h.page.waitForTimeout(140); }
      }
      let pauseFlip = null;
      if (n > 1) {   // 정지/재생 글자 폭 차이로 줄 수가 바뀌는지
        const a = await h.page.evaluate(BAR_M);
        await h.page.evaluate(() => document.querySelector(".pdim [data-ppop-pause]").click());
        await h.page.waitForTimeout(150);
        const b = await h.page.evaluate(BAR_M);
        pauseFlip = { before: [a.pause, a.rows, a.barH, a.pbar], after: [b.pause, b.rows, b.barH, b.pbar] };
      }
      out[j.key] = { fails: rows.flatMap((r) => r.fail.map((x) => `k${r.cur}: ${x}`)), bar: rows[0].barM, barRows: [...new Set(rows.map((r) => r.barRows))], pbarDelta: rows.map((r) => r.pbarDelta), budget: rows.map((r) => r.budget), visibleCardH: rows.map((r) => r.visibleCardH), pauseFlip, errors: h.errors };
    } finally { await h.close(); }
  });
  const sum = { post: {}, pre: {}, newInPost: [] };
  for (const [k, v] of Object.entries(out)) { if (v.noPopup) continue; const [ver, ...rest] = k.split("|"); if (v.fails.length) sum[ver][rest.join("|")] = v.fails; }
  for (const k of new Set([...Object.keys(sum.post), ...Object.keys(sum.pre)])) {
    const a = new Set((sum.post[k] || []).map(norm)), b = new Set((sum.pre[k] || []).map(norm));
    const onlyPost = [...a].filter((x) => !b.has(x));
    if (onlyPost.length) sum.newInPost.push({ cell: k, onlyPost, post: sum.post[k] || [], pre: sum.pre[k] || [] });
  }
  result.font = { cells: out, summary: sum }; save();
  for (const [k, v] of Object.entries(out)) log("font", k, JSON.stringify({ rows: v.barRows, muteW: v.bar && v.bar.muteW, inner: v.bar && v.bar.inner, barH: v.bar && v.bar.barH, pbar: v.bar && v.bar.pbar, fails: v.fails && v.fails.slice(0, 3), flip: v.pauseFlip }));
  log("font newInPost", JSON.stringify(sum.newInPost.map((x) => [x.cell, x.onlyPost])));
}

async function syncPart() {
  const out = {};
  const snap = async (page, tag) => { const m = await page.evaluate(MEAS); return { tag, vw: m.vw, vh: m.vh, rows: m.barRows, barH: m.barH, offsetH: m.barOffsetH, pbar: m.pbarVar, pbarDelta: m.pbarDelta, maxH: m.maxH, expMax: m.expMax, maxHDelta: m.maxHDelta, budget: m.budget, barBottomGap: m.barBottomGap, popTopGap: m.popTopGap, barInView: m.barInView, fail: cellFail(m, "post"), pretendard: await page.evaluate(() => document.fonts.check('13px "Pretendard Variable"')) }; };
  // 1) 글꼴 3초 지연
  for (const ver of ["post", "pre"]) for (const [vn, cn] of [["1440x900", "N2"], ["1440x900", "N4"], ["390x640", "N2"], ["320x568", "N4"], ["z400_320x256", "N2"], ["844x390", "N3L"]]) {
    const key = `late|${ver}|${vn}|${cn}`;
    const h = await open(ver, VPM[vn], CONFIGS[cn], { delayFont: 3000, settle: 150 });
    try {
      if (!h.ok) { out[key] = { noPopup: true }; continue; }
      const a = await snap(h.page, "t+150ms");
      await h.page.evaluate(() => document.fonts.ready);
      await h.page.waitForTimeout(3500);
      await h.page.evaluate(() => document.fonts.ready);
      await h.page.waitForTimeout(300);
      const b = await snap(h.page, "after fonts");
      out[key] = [a, b];
      log("sync", key, JSON.stringify([a, b].map((s) => [s.tag, s.pretendard, s.rows, s.barH, s.pbar, s.maxH, s.budget, s.fail])));
    } finally { await h.close(); }
  }
  // 2) 창 크기 변경
  const SEQ = {
    desk600: [["1024x700", false], [1024, 700], [500, 700], [1024, 700], [601, 700], [600, 700], [601, 700], [472, 700], [1440, 400], [1440, 900]],
    rotate: [["844x390", true], [844, 390], [390, 844], [844, 390], [320, 568], [568, 320]],
    zoomin: [["1440x900", false], [1440, 900], [720, 450], [576, 360], [480, 300], [360, 225], [1440, 900]],
  };
  for (const ver of ["post", "pre"]) for (const [sn, seq] of Object.entries(SEQ)) for (const cn of ["N2", "N4"]) {
    const key = `resize|${ver}|${sn}|${cn}`;
    const [[vn0, phone], ...steps] = seq;
    const [w0, h0] = vn0.split("x").map(Number);
    const h = await open(ver, [vn0, w0, h0, sn === "zoomin" ? 1 : phone ? 3 : 1, phone], CONFIGS[cn]);
    try {
      if (!h.ok) { out[key] = { noPopup: true }; continue; }
      const snaps = [];
      for (const [w, hh] of steps) {
        await h.page.setViewportSize({ width: w, height: hh });
        await h.page.waitForTimeout(250);
        const s = await snap(h.page, `${w}x${hh}`);
        if (s.fail.length && ver === "post" && !snaps.some((x) => x.fail.length)) { const p = path.join(SHOTS, `refute_layout_resize_${sn}_${cn}_${w}x${hh}.png`); await h.page.screenshot({ path: p }); shots.add(p); s.shot = p; }
        snaps.push(s);
      }
      out[key] = snaps;
      log("sync", key, JSON.stringify(snaps.map((s) => [s.tag, s.rows, s.barH, s.pbar, s.budget, s.barBottomGap, s.fail.length ? s.fail : 0])));
    } finally { await h.close(); }
  }
  // 3) 열린 뒤 글자 간격 주입(하단바 높이만 바뀜, 창 크기 불변 = ResizeObserver 경로)
  for (const ver of ["post", "pre"]) for (const [vn, cn] of [["390x640", "N2"], ["320x568", "N4"], ["1440x900", "N4"], ["844x390", "N2"], ["280x653", "N2"]]) {
    const key = `tsAfter|${ver}|${vn}|${cn}`;
    const h = await open(ver, VPM[vn], CONFIGS[cn]);
    try {
      if (!h.ok) { out[key] = { noPopup: true }; continue; }
      const a = await snap(h.page, "before");
      await h.page.addStyleTag({ content: TS });
      await h.page.waitForTimeout(300);
      const b = await snap(h.page, "after");
      if (b.fail.length && ver === "post") { const p = path.join(SHOTS, `refute_layout_tsafter_${vn}_${cn}.png`); await h.page.screenshot({ path: p }); shots.add(p); b.shot = p; }
      out[key] = [a, b];
      log("sync", key, JSON.stringify([a, b].map((s) => [s.tag, s.rows, s.barH, s.pbar, s.maxH, s.budget, s.barBottomGap, s.fail])));
    } finally { await h.close(); }
  }
  result.sync = out; save();
}

// 접합 crop: 카드 좌우 24px 밖까지(그림자), 하단바 top -10 ~ +14 CSS px. 초점 상태 = 없음, 하단바 체크(Tab), 닫기(Shift+Tab), 카드 CTA(Tab 1회).
async function jointPart() {
  const out = [];
  const G = () => { const on = document.querySelector(".pslot[data-on] .pop"), bar = document.querySelector(".pbar"); const a = on.getBoundingClientRect(), c = bar.getBoundingClientRect();
    const ae = document.activeElement; const fr = ae && ae !== document.body ? ae.getBoundingClientRect() : null;
    return { onB: a.bottom, onL: a.left, onR: a.right, barT: c.top, barB: c.bottom, barL: c.left, barR: c.right, vw: innerWidth, vh: innerHeight, cur: document.querySelector("[data-ppop-cur]")?.textContent || "n1",
      focus: ae ? ae.tagName.toLowerCase() + (ae.className && typeof ae.className === "string" ? "." + ae.className.split(" ")[0] : "") : null, fv: ae && ae.matches ? ae.matches(":focus-visible") : null, fr: fr && { t: fr.top, b: fr.bottom, l: fr.left, r: fr.right },
      popST: on.scrollTop, popMax: on.scrollHeight - on.clientHeight }; };
  const cropAt = async (page, tag, dsf, band) => {
    const g = await page.evaluate(G);
    const x0 = Math.max(0, Math.floor(Math.min(g.onL, g.barL)) - 24), x1 = Math.min(g.vw, Math.ceil(Math.max(g.onR, g.barR)) + 24);
    const y0 = Math.max(0, Math.floor(g.barT) - band[0]), y1 = Math.min(g.vh, Math.ceil(g.barT) + band[1]);
    const file = path.join(TMP, `${tag}.png`);
    await page.screenshot({ path: file, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
    return { tag, dsf, file, x0, y0, g };
  };
  for (const dsf of [1, 1.5, 2]) for (const [vn, w, hh, phone] of [["1440x900", 1440, 900, false], ["390x640", 390, 640, true], ["844x390", 844, 390, true]]) for (const ver of ["post", "pre"]) {
    const h = await open(ver, [vn, w, hh, dsf, phone], CONFIGS.N3S);
    try {
      if (!h.ok) { out.push({ ver, vn, dsf, noPopup: true }); continue; }
      for (let k = 0; k < 3; k++) {
        out.push({ ver, vn, dsf, state: `cur${k}`, ...(await cropAt(h.page, `j_${ver}_${vn}_d${dsf}_cur${k}`, dsf, [10, 14])) });
        await h.page.keyboard.press("ArrowRight"); await h.page.waitForTimeout(150);
      }
      // 다시 첫 장(의뢰 카드, CTA 둘): 초점 상태 셋
      await h.page.evaluate(() => document.querySelector(".pdim").focus());
      await h.page.keyboard.press("Tab");   // 첫 조작 요소 = 카드 CTA 의뢰하기
      out.push({ ver, vn, dsf, state: "focus_cta", ...(await cropAt(h.page, `j_${ver}_${vn}_d${dsf}_fcta`, dsf, [40, 14])) });
      await h.page.keyboard.press("Tab"); await h.page.keyboard.press("Tab");   // 자세히 → 체크
      out.push({ ver, vn, dsf, state: "focus_mute", ...(await cropAt(h.page, `j_${ver}_${vn}_d${dsf}_fmute`, dsf, [10, 70])) });
      await h.page.evaluate(() => document.querySelector(".pdim").focus());
      await h.page.keyboard.press("Shift+Tab");   // 마지막 = 닫기
      out.push({ ver, vn, dsf, state: "focus_close", ...(await cropAt(h.page, `j_${ver}_${vn}_d${dsf}_fclose`, dsf, [10, 70])) });
      // 카드 끝까지 스크롤 뒤 CTA 초점(넘치는 카드만)
      await h.page.evaluate(() => { const p = document.querySelector(".pslot[data-on] .pop"); p.scrollTop = 0; document.querySelector(".pdim").focus(); });
      await h.page.keyboard.press("Tab"); await h.page.keyboard.press("Tab");
      out.push({ ver, vn, dsf, state: "focus_cta2", ...(await cropAt(h.page, `j_${ver}_${vn}_d${dsf}_fcta2`, dsf, [40, 14])) });
    } finally { await h.close(); }
  }
  const inFile = path.join(TMP, "joint_recs.json");
  fs.writeFileSync(inFile, JSON.stringify(out));
  const py = `
import json, sys, statistics
from PIL import Image
recs = json.load(open(sys.argv[1])); res = []
def px(im, x, y):
    W, H = im.size
    if 0 <= x < W and 0 <= y < H: return im.getpixel((x, y))
    return None
for r in recs:
    if "file" not in r: res.append(r); continue
    im = Image.open(r["file"]).convert("RGB"); W, H = im.size; d = r["dsf"]; g = r["g"]
    X = lambda cx: int(round((cx - r["x0"]) * d)); Y = lambda cy: int((cy - r["y0"]) * d)
    by = Y(g["barT"]); cl = X(g["onL"]); cr = X(g["onR"]) - 1
    rows = []
    for yy in range(max(0, by - int(4 * d)), min(H, by + int(6 * d) + 1)):
        interior = [max(im.getpixel((x, yy))) for x in range(cl + int(12 * d), cr - int(12 * d))]
        rows.append({"dy": yy - by, "med": statistics.median(interior) if interior else None, "min": min(interior) if interior else None,
            "slit": (sum(1 for v in interior if v < 190) / len(interior)) if interior else None,
            "L": px(im, cl, yy), "Lin": px(im, cl + 1, yy), "Lout1": px(im, cl - 1, yy), "Lout6": px(im, cl - int(6 * d), yy), "Lout16": px(im, cl - int(16 * d), yy),
            "R": px(im, cr, yy), "Rout1": px(im, cr + 1, yy), "Rout6": px(im, cr + int(6 * d), yy)})
    lines = 0; prev = False
    for rw in rows:
        isl = rw["med"] is not None and rw["med"] < 240
        if isl and not prev: lines += 1
        prev = isl
    slit = [rw["dy"] for rw in rows if rw["slit"] is not None and rw["slit"] >= 0.3]
    # 초점 윤곽: 2px ink 선. 윤곽 사각형 위/아래 변이 하단바 top 과 겹치는지
    res.append({k: r[k] for k in ("ver", "vn", "dsf", "state", "tag")} | {"size": [W, H], "barTdev": by, "lines": lines, "slitRows": slit, "rows": rows, "g": g})
json.dump(res, open(sys.argv[2], "w"))
`;
  const pyFile = path.join(TMP, "joint.py"), outFile = path.join(TMP, "joint_res.json");
  fs.writeFileSync(pyFile, py);
  execFileSync("python3", [pyFile, inFile, outFile], { maxBuffer: 64 << 20 });
  const res = JSON.parse(fs.readFileSync(outFile, "utf8"));
  // post 대 pre 행 대조(하단바 top 기준 정렬)
  const key = (r) => `${r.vn}|d${r.dsf}|${r.state}`;
  const by = {}; for (const r of res) (by[key(r)] ||= {})[r.ver] = r;
  const cmp = [];
  const dist = (a, b) => (a && b ? Math.max(...a.map((v, i) => Math.abs(v - b[i]))) : null);
  for (const [k, v] of Object.entries(by)) {
    if (!v.post || !v.pre || !v.post.rows) continue;
    const rowsDiff = v.post.rows.map((pr) => {
      const q = v.pre.rows.find((x) => x.dy === pr.dy);
      if (!q) return null;
      return { dy: pr.dy, med: [pr.med, q.med], L: dist(pr.L, q.L), Lout1: dist(pr.Lout1, q.Lout1), Lout6: dist(pr.Lout6, q.Lout6), Lout16: dist(pr.Lout16, q.Lout16), R: dist(pr.R, q.R), Rout6: dist(pr.Rout6, q.Rout6), postL: pr.L, preL: q.L, postLout6: pr.Lout6, preLout6: q.Lout6 };
    }).filter(Boolean);
    const maxd = Math.max(0, ...rowsDiff.flatMap((x) => [x.L, x.Lout1, x.Lout6, x.Lout16, x.R, x.Rout6].filter((y) => y !== null)));
    cmp.push({ k, lines: [v.post.lines, v.pre.lines], slit: [v.post.slitRows, v.pre.slitRows], maxEdgeDiff: maxd, focus: [v.post.g.focus, v.post.g.fv, v.pre.g.focus], fr: [v.post.g.fr, v.pre.g.fr], barT: [+v.post.g.barT.toFixed(2), +v.pre.g.barT.toFixed(2)], onB: [+v.post.g.onB.toFixed(2), +v.pre.g.onB.toFixed(2)], popST: [v.post.g.popST, v.pre.g.popST, v.post.g.popMax, v.pre.g.popMax], rowsDiff: rowsDiff.filter((x) => Math.max(x.L ?? 0, x.Lout1 ?? 0, x.Lout6 ?? 0, x.Lout16 ?? 0, x.R ?? 0, x.Rout6 ?? 0) > 6) });
  }
  // 확대 대조 그림 몇 장(post 위, pre 아래, 8배 최근접)
  const pick = cmp.filter((c) => c.maxEdgeDiff > 6 || /focus_cta|cur1|focus_close/.test(c.k)).slice(0, 10).map((c) => c.k);
  const zoomPy = `
import json, sys
from PIL import Image
pairs = json.load(open(sys.argv[1]))
for a, b, o in pairs:
    A = Image.open(a).convert("RGB"); B = Image.open(b).convert("RGB")
    s = 6; W = max(A.width, B.width); H = A.height + B.height + 4
    C = Image.new("RGB", (W, H), (255, 0, 255)); C.paste(A, (0, 0)); C.paste(B, (0, A.height + 4))
    C = C.resize((W * s, H * s), Image.NEAREST); C.save(o)
`;
  const pairs = pick.map((k) => { const v = by[k]; const tagP = v.post.tag, tagQ = v.pre.tag; const o = path.join(SHOTS, `refute_layout_joint_${k.replace(/[|.]/g, "_")}.png`); shots.add(o); return [path.join(TMP, tagP + ".png"), path.join(TMP, tagQ + ".png"), o]; });
  fs.writeFileSync(path.join(TMP, "pairs.json"), JSON.stringify(pairs));
  fs.writeFileSync(path.join(TMP, "zoom.py"), zoomPy);
  execFileSync("python3", [path.join(TMP, "zoom.py"), path.join(TMP, "pairs.json")]);
  result.joint = { cmp, raw: res.map((r) => ({ ...r, rows: undefined })) }; save();
  for (const c of cmp) log("joint", c.k, JSON.stringify({ lines: c.lines, slit: c.slit, maxEdgeDiff: c.maxEdgeDiff, focus: c.focus, barT: c.barT, onB: c.onB, popST: c.popST, diffRows: c.rowsDiff.map((x) => [x.dy, x.L, x.Lout1, x.Lout6, x.Lout16, x.R, x.Rout6]) }));
}

// 일반 스크롤바(Windows 형): --hide-scrollbars 해제
async function barsPart() {
  const b2 = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks"], ignoreDefaultArgs: ["--hide-scrollbars"] });
  const out = {};
  try {
    for (const ver of ["post", "pre"]) for (const [vn, cn] of [["1440x900", "N2"], ["1440x420", "N2"], ["1440x420", "N4"], ["1024x600", "N3L"], ["720x450z", "N4"]]) {
      const vp = vn === "720x450z" ? ["z200_720x450", 720, 450, 2, false] : VPM[vn];
      const key = `${ver}|${vn}|${cn}`;
      const h = await open(ver, vp, CONFIGS[cn], { browser: b2, initCss: "::-webkit-scrollbar{width:15px;height:15px;background:#e6e6e6}::-webkit-scrollbar-thumb{background:#8a8a8a}" });   // macOS 오버레이 스크롤바 대신 폭 15px 고전 스크롤바(Windows 형) 강제
      try {
        if (!h.ok) { out[key] = { noPopup: true }; continue; }
        const rows = [];
        const n = await h.page.evaluate(() => document.querySelectorAll(".pdim .pslot").length);
        for (let k = 0; k < n; k++) {
          const m = await h.page.evaluate(MEAS); m.fail = cellFail(m, ver);
          rows.push({ cur: m.cur, rootW: m.rootW, vw: m.vw, clientW: m.clientW, popSbW: m.popSbW, rootL: m.root.l, rootR: m.root.r, barC: +((m.bar.l + m.bar.r) / 2).toFixed(2), popC: +((m.pop.l + m.pop.r) / 2).toFixed(2), sideVis: m.sides.filter((x) => x.visibleArea > 0).map((x) => [x.d, x.rect.l, x.rect.r]), popScrollX: m.popScrollX, overflows: m.overflows, barW: m.bar.w, popW: m.pop.w, barL: m.bar.l, popL: m.pop.l, fail: m.fail });
          if (k === 0 || m.overflows) { const p = path.join(SHOTS, `refute_layout_sb_${ver}_${vn}_${cn}_k${k}.png`); if (k === 0) { await h.page.screenshot({ path: p }); shots.add(p); } }
          if (n > 1 && k < n - 1) { await h.page.keyboard.press("ArrowRight"); await h.page.waitForTimeout(140); }
        }
        out[key] = rows;
        log("bars", key, JSON.stringify(rows.map((r) => [r.cur, "root", r.rootL, r.rootR, "vw", r.vw, "clientW", r.clientW, "sb", r.popSbW, r.popScrollX, "barC", r.barC, "popC", r.popC, r.overflows, r.fail])));
      } finally { await h.close(); }
    }
  } finally { await Promise.race([b2.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]); }
  result.bars = out; save();
}

// 강제 색상(Windows 고대비): 투명 아래 선과 margin-top -1px 이 강제 색에서 선을 몇 개 남기는지. 카드 안쪽 폭 열 중앙값으로 행마다 선 판정
async function forcedPart() {
  const out = {};
  for (const ver of ["post", "pre"]) for (const [vn, w, hh, dsf, phone] of [["1440x900", 1440, 900, 1, false], ["1440x900d2", 1440, 900, 2, false], ["390x640", 390, 640, 3, true]]) {
    const co = { viewport: { width: w, height: hh }, deviceScaleFactor: dsf, locale: "ko-KR", reducedMotion: "reduce", forcedColors: "active", colorScheme: "dark" };
    if (phone) Object.assign(co, { hasTouch: true, isMobile: true });
    const ctx = await browser.newContext(co);
    await routes(ctx, ver, CONFIGS.N3S, {});
    const page = await ctx.newPage();
    const { ok } = await load(page, CONFIGS.N3S, {});
    try {
      if (!ok) { out[`${ver}|${vn}`] = { noPopup: true }; continue; }
      const rec = [];
      for (let k = 0; k < 3; k++) {
        const g = await page.evaluate(() => { const on = document.querySelector(".pslot[data-on] .pop"), bar = document.querySelector(".pbar"); const a = on.getBoundingClientRect(), c = bar.getBoundingClientRect();
          return { onB: a.bottom, onL: a.left, onR: a.right, barT: c.top, forced: matchMedia("(forced-colors: active)").matches, popBB: getComputedStyle(on).borderBottomColor, barBT: getComputedStyle(bar).borderTopColor, popBg: getComputedStyle(on).backgroundColor }; });
        const y0 = Math.floor(g.barT) - 6, file = path.join(TMP, `forced_${ver}_${vn}_k${k}.png`);
        await page.screenshot({ path: file, clip: { x: Math.floor(g.onL), y: y0, width: Math.floor(g.onR - g.onL), height: 14 } });
        rec.push({ k, g, file, y0, dsf });
        if (k === 0) { const p = path.join(SHOTS, `refute_layout_forced_${ver}_${vn}.png`); await page.screenshot({ path: p }); shots.add(p); }
        await page.keyboard.press("ArrowRight"); await page.waitForTimeout(150);
      }
      out[`${ver}|${vn}`] = rec;
    } finally { await ctx.close(); }
  }
  const py = `
import json, sys, statistics
from PIL import Image
d = json.load(open(sys.argv[1])); res = {}
for key, recs in d.items():
    if not isinstance(recs, list): res[key] = recs; continue
    rr = []
    for r in recs:
        im = Image.open(r["file"]).convert("RGB"); W, H = im.size; s = r["dsf"]
        bg = statistics.median([im.getpixel((x, 0)) [0] for x in range(W // 4, 3 * W // 4)])
        prof = []
        for y in range(H):
            vals = [im.getpixel((x, y)) for x in range(int(12 * s), W - int(12 * s))]
            med = tuple(statistics.median([v[i] for v in vals]) for i in range(3))
            prof.append(med)
        base = prof[0]
        lines = 0; prev = False; lrows = []
        for y, m in enumerate(prof):
            isl = max(abs(m[i] - base[i]) for i in range(3)) > 40
            if isl and not prev: lines += 1
            if isl: lrows.append(round(y / s - 6 + (r["y0"] - int(r["y0"])), 2))
            prev = isl
        rr.append({"k": r["k"], "lines": lines, "lineRowsCss": lrows, "g": r["g"]})
    res[key] = rr
json.dump(res, open(sys.argv[2], "w"))
`;
  fs.writeFileSync(path.join(TMP, "forced_in.json"), JSON.stringify(out));
  fs.writeFileSync(path.join(TMP, "forced.py"), py);
  execFileSync("python3", [path.join(TMP, "forced.py"), path.join(TMP, "forced_in.json"), path.join(TMP, "forced_out.json")]);
  const res = JSON.parse(fs.readFileSync(path.join(TMP, "forced_out.json"), "utf8"));
  result.forced = res; save();
  for (const [k, v] of Object.entries(res)) log("forced", k, JSON.stringify(Array.isArray(v) ? v.map((x) => [x.k, x.lines, x.lineRowsCss, x.g.forced, x.g.popBB, x.g.barBT, +(x.g.barT - x.g.onB).toFixed(2)]) : v));
}

// 데스크톱 확대 + 최소 글꼴(저시력 조합). 터치/isMobile 없음 = 레이아웃 뷰포트 축소 보정 없음
async function font2Part() {
  const out = {};
  const jobs = [];
  for (const ver of ["post", "pre"]) for (const vn of ["z200_720x450", "z250_576x360", "z300_480x300", "z400_320x256", "472x800", "1024x600", "1440x420"]) for (const cn of ["N2", "N4", "N1"]) for (const mf of [20, 24])
    jobs.push({ ver, vn, cn, mf, key: `${ver}|${vn}|${cn}|minfont${mf}` });
  await pool(jobs, 4, async (j) => {
    const h = await openMinFont(j.ver, VPM[j.vn], CONFIGS[j.cn], j.mf);
    try {
      if (!h.ok) { out[j.key] = { noPopup: true }; return; }
      const rows = [];
      const n = await h.page.evaluate(() => document.querySelectorAll(".pdim .pslot").length);
      for (let k = 0; k < n; k++) {
        const m = await h.page.evaluate(MEAS); m.fail = cellFail(m, j.ver);
        if (m.fail.length && j.ver === "post" && !rows.some((r) => r.fail.length)) { const p = path.join(SHOTS, `refute_layout_font2_${j.vn}_${j.cn}_mf${j.mf}_k${k}.png`); await h.page.screenshot({ path: p }); shots.add(p); m.shot = p; }
        rows.push(m);
        if (n > 1 && k < n - 1) { await h.page.keyboard.press("ArrowRight"); await h.page.waitForTimeout(140); }
      }
      out[j.key] = { vw: rows[0].vw, vh: rows[0].vh, fails: rows.flatMap((r) => r.fail.map((x) => `k${r.cur}: ${x}`)), barRows: [...new Set(rows.map((r) => r.barRows))], barH: rows[0].barH, pbar: rows[0].pbarVar, visibleCardH: rows.map((r) => r.visibleCardH), budget: rows.map((r) => r.budget), barBottomGap: rows[0].barBottomGap, barOver: [rows[0].barContentOverR, rows[0].barContentOverL] };
    } finally { await h.close(); }
  });
  const sum = { post: {}, pre: {}, newInPost: [] };
  for (const [k, v] of Object.entries(out)) { if (v.noPopup) continue; const [ver, ...rest] = k.split("|"); if (v.fails.length) sum[ver][rest.join("|")] = v.fails; }
  for (const k of new Set([...Object.keys(sum.post), ...Object.keys(sum.pre)])) {
    const a = new Set((sum.post[k] || []).map(norm)), b = new Set((sum.pre[k] || []).map(norm));
    const onlyPost = [...a].filter((x) => !b.has(x));
    if (onlyPost.length) sum.newInPost.push({ cell: k, onlyPost, post: sum.post[k] || [], pre: sum.pre[k] || [] });
  }
  result.font2 = { cells: out, summary: sum }; save();
  for (const [k, v] of Object.entries(out).sort()) log("font2", k, JSON.stringify({ vw: v.vw, vh: v.vh, rows: v.barRows, barH: v.barH, pbar: v.pbar, visH: v.visibleCardH, gap: v.barBottomGap, over: v.barOver, fails: v.fails && v.fails.slice(0, 3) }));
  log("font2 newInPost", JSON.stringify(sum.newInPost.map((x) => [x.cell, x.onlyPost])));
}

// 모션 켠 넘김(→ 5회, ← 2회) 동안 매 rAF: 보이는(불투명도 > .01) 비활성 카드와 하단바/활성 카드 겹침, 하단바 이동, 뷰포트 밖 넘침
async function motionPart() {
  const out = {};
  for (const ver of ["post", "pre"]) for (const vn of ["601x800", "844x390", "768x1024", "1024x600", "1440x900", "2560x1440"]) for (const cn of ["N3S", "N4", "N6"]) {
    const key = `${ver}|${vn}|${cn}`;
    const h = await open(ver, VPM[vn] || ["1440x900", 1440, 900, 1, false], CONFIGS[cn], { motion: true });
    try {
      if (!h.ok) { out[key] = { noPopup: true }; continue; }
      await h.page.evaluate(() => { const b = document.querySelector(".pdim [data-ppop-pause]"); if (b && b.textContent.trim() === "정지") b.click(); });
      await h.page.waitForTimeout(400);
      const r = await h.page.evaluate(async () => {
        const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const bar = document.querySelector(".pdim .pbar"), b0 = bar.getBoundingClientRect();
        let maxBarOv = 0, maxActOv = 0, barMove = 0, frames = 0, worst = null;
        const sample = () => {
          frames++;
          const br = bar.getBoundingClientRect();
          barMove = Math.max(barMove, Math.abs(br.top - b0.top), Math.abs(br.left - b0.left));
          const on = document.querySelector(".pdim .pslot[data-on] > .pop").getBoundingClientRect();
          for (const s of document.querySelectorAll(".pdim .pslot:not([data-on])")) {
            const op = +getComputedStyle(s).opacity; if (op <= 0.01) continue;
            const pr = s.querySelector(":scope > .pop").getBoundingClientRect();
            const ob = inter(pr, br), oa = inter(pr, on);
            if (ob > maxBarOv) { maxBarOv = ob; worst = { kind: "bar", i: s.dataset.i, d: s.dataset.d, op, l: Math.round(pr.left), r: Math.round(pr.right), b: Math.round(pr.bottom), barT: Math.round(br.top) }; }
            if (oa > maxActOv) { maxActOv = oa; if (!worst || worst.kind !== "bar") worst = { kind: "active", i: s.dataset.i, d: s.dataset.d, op, l: Math.round(pr.left), r: Math.round(pr.right), onL: Math.round(on.left), onR: Math.round(on.right) }; }
          }
        };
        const run = (ms) => new Promise((res) => { const t0 = performance.now(); const f = () => { sample(); if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
        const key = (k) => document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
        document.querySelector(".pdim").focus();
        for (const k of ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowLeft", "ArrowLeft"]) { key(k); await run(420); }
        return { frames, maxBarOv: Math.round(maxBarOv), maxActOv: Math.round(maxActOv), barMove: +barMove.toFixed(2), worst };
      });
      out[key] = r;
      log("motion", key, JSON.stringify(r));
    } finally { await h.close(); }
  }
  result.motion = out; save();
}

// motion2 (승계 세션 추가): motion 의 활성 카드 겹침이 어느 넘김에서 나는지 단계별로 잰다. 간격 = 600ms(전이 .5s 뒤) 와 420ms(motion 과 같음)
//   단계마다 매 rAF: 보이는 비활성 슬롯(불투명도 > .01)과 활성 .pop 교차 면적, 그 슬롯의 이전 d → 새 d, 인라인 transition, 계산 transform
//   최악 단계는 Web Animations 를 그 시각에 멈춰 스크린샷(shots/refute_layout_motion2_*.png)
async function motion2Part() {
  const out = {};
  for (const ver of ["post", "pre"]) for (const vn of ["1440x900", "601x800", "844x390"]) for (const cn of ["N3S", "N4", "N6"]) for (const gap of [600, 420]) {
    const key = `${ver}|${vn}|${cn}|gap${gap}`;
    const h = await open(ver, VPM[vn], CONFIGS[cn], { motion: true });
    try {
      if (!h.ok) { out[key] = { noPopup: true }; continue; }
      await h.page.evaluate(() => { const b = document.querySelector(".pdim [data-ppop-pause]"); if (b && b.textContent.trim() === "정지") b.click(); });
      await h.page.waitForTimeout(700);
      const steps = await h.page.evaluate(async (gap) => {
        const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const slots = [...document.querySelectorAll(".pdim .pslot")];
        const st = () => slots.map((s) => ({ i: slots.indexOf(s), d: s.dataset.d ?? (s.hasAttribute("data-on") ? "0" : s.getAttribute("data-side")), on: s.hasAttribute("data-on") }));
        const key = (k) => document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
        document.querySelector(".pdim").focus();
        const res = [];
        for (const k of ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowLeft", "ArrowLeft"]) {
          const before = st();
          key(k);
          const after = st();
          const t0 = performance.now();
          let max = 0, at = null, frames = 0, visFrames = 0;
          await new Promise((res2) => { const f = () => { frames++;
            const on = document.querySelector(".pdim .pslot[data-on] > .pop").getBoundingClientRect();
            let fr = 0;
            for (const s of slots) { if (s.hasAttribute("data-on")) continue; const op = +getComputedStyle(s).opacity; if (op <= 0.01) continue;
              const r = s.querySelector(":scope > .pop").getBoundingClientRect(); const o = inter(r, on); fr = Math.max(fr, o);
              if (o > max) { max = o; at = { t: Math.round(performance.now() - t0), i: slots.indexOf(s), op: +op.toFixed(2), l: Math.round(r.left), r: Math.round(r.right), onL: Math.round(on.left), onR: Math.round(on.right), inlineTr: s.style.transition || "", tf: getComputedStyle(s).transform.slice(0, 60) }; } }
            if (fr > 0) visFrames++;
            if (performance.now() - t0 < gap) requestAnimationFrame(f); else res2(); }; requestAnimationFrame(f); });
          res.push({ k, cur: +document.querySelector("[data-ppop-cur]").textContent, before: before.map((x) => x.d).join(","), after: after.map((x) => x.d).join(","), maxOv: Math.round(max), visFrames, frames, at });
        }
        return res;
      }, gap);
      out[key] = steps;
      log("motion2", key, JSON.stringify(steps.map((s) => [s.k[5], s.cur, s.before + ">" + s.after, s.maxOv, s.visFrames + "/" + s.frames, s.at && [s.at.t, s.at.i, s.at.op, s.at.l, s.at.r, s.at.inlineTr]])));
    } finally { await h.close(); }
  }
  // 최악 단계 멈춘 화면: post 1440x900 N3S, 600ms 간격, 겹침이 가장 큰 단계를 다시 재생해 그 시각에 멈춘다
  for (const ver of ["post", "pre"]) for (const [vn, cn] of [["1440x900", "N3S"], ["1440x900", "N4"]]) {
    const steps = out[`${ver}|${vn}|${cn}|gap600`];
    if (!Array.isArray(steps)) continue;
    const wi = steps.reduce((b, s, i) => (s.maxOv > steps[b].maxOv ? i : b), 0);
    if (!steps[wi].maxOv) continue;
    const h = await open(ver, VPM[vn], CONFIGS[cn], { motion: true });
    try {
      await h.page.evaluate(() => { const b = document.querySelector(".pdim [data-ppop-pause]"); if (b && b.textContent.trim() === "정지") b.click(); });
      await h.page.waitForTimeout(700);
      await h.page.evaluate(() => document.querySelector(".pdim").focus());
      for (let i = 0; i < wi; i++) { await h.page.evaluate((k) => document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })), steps[i].k); await h.page.waitForTimeout(600); }
      const tStop = steps[wi].at.t;
      await h.page.evaluate(async ([k, t]) => { document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); const t0 = performance.now();
        await new Promise((r) => { const f = () => { if (performance.now() - t0 >= t) { document.getAnimations().forEach((a) => a.pause()); r(); } else requestAnimationFrame(f); }; requestAnimationFrame(f); }); }, [steps[wi].k, tStop]);
      const p = path.join(SHOTS, `refute_layout_motion2_${ver}_${vn}_${cn}_step${wi}_t${tStop}.png`);
      await h.page.screenshot({ path: p }); shots.add(p);
      out[`frozen|${ver}|${vn}|${cn}`] = { step: wi, t: tStop, shot: p };
      log("motion2 frozen", ver, vn, cn, "step", wi, "t", tStop, p);
    } finally { await h.close(); }
  }
  result.motion2 = out; save();
}

const parts = { matrix: matrixPart, font: fontPart, sync: syncPart, joint: jointPart, bars: barsPart, forced: forcedPart, font2: font2Part, motion: motionPart, motion2: motion2Part };
for (const [k, fn] of Object.entries(parts)) {
  if (which !== "all" && which !== k) continue;
  const t0 = Date.now();
  try { await fn(); } catch (e) { log("PART ERROR", k, e.stack || e); result[k + "_error"] = String(e.stack || e); save(); }
  log(`part ${k} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
save();
log("wrote", OUT);
process.exit(0);
