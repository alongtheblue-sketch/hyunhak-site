// hyunhak.com 정적 사이트 워커 (Workers static assets, run_worker_first).
// 하는 일 여섯 가지: www → apex 301, 구 URL 301 표(철거 면 수습), 경로 해석(GitHub Pages 와 같은 규칙), 보호층 셸 헤더, 답변엔진·없는 면 유입 원장, 자산 바이트 범위(206).
// 콘텐츠 판단은 하지 않는다. 봇 차단은 Cloudflare 존 정책(AI bot policies, WAF 룰)이 맡고, 본 워커는 같은 바이트를 모두에게 낸다 (클로킹 금지).

const APEX = "hyunhak.com";

// 2026-09-04 철거 면: 비판매 7권(경북, 고려, 성균관, 연세, DGIST, 부경, 홍익)은 면을 내리고 목록으로 301 (색인과 외부 링크에 남은 URL 수습).
const REMOVED_GUIDEBOOK = new Set([
  "/guidebook/knu.html",
  "/guidebook/korea.html",
  "/guidebook/skku.html",
  "/guidebook/yonsei.html",
  "/guidebook/dgist.html",
  "/guidebook/pknu.html",
  "/guidebook/hongik.html",
]);

// 2026-09-09 구 URL 301 표. GA4 「현학적 연구소, 없는 면」 51회(전체 1위)의 원인 = 08-26(f74ccfc) 철거한 면접 아카이브 26면 /interview/<slug>.html 과
// 08-26~31 철거한 store·store_item·programs/skku 가 301 없이 내려가 답변엔진(ChatGPT-User, PerplexityBot)과 검색 색인에 남아 계속 불린다
// (CF 8일 실측 korea 60 · hufs 41 · seoultech 13, 일별 증가). 키 = legacyKey() 정규화 경로, 값 = 실재 면의 절대 경로.
// 목적지 실재와 삭제 면 전건 등재는 _tools/link_check.py 가 빌드마다 대조한다(누락 = FAIL). 쿼리는 보존한다(utm_source=chatgpt.com 이 목적지 ai_referrals 에 남게).
const LEGACY_REDIRECTS = {
  "/interview/index.html": "/interview.html",
  "/interview/ajou.html": "/guidebook/ajou.html",
  "/interview/catholic.html": "/guidebook/catholic.html",
  "/interview/cau.html": "/guidebook/cau.html",
  "/interview/dongguk.html": "/guidebook/dongguk.html",
  "/interview/ewha.html": "/guidebook/ewha.html",
  "/interview/gachon.html": "/guidebook/gachon.html",
  "/interview/hufs.html": "/guidebook/hufs.html",
  "/interview/inha.html": "/guidebook/inha.html",
  "/interview/khu.html": "/guidebook/khu.html",
  "/interview/konkuk.html": "/guidebook/konkuk.html",
  "/interview/kookmin.html": "/guidebook/kookmin.html",
  "/interview/kwangwoon.html": "/guidebook/kwangwoon.html",
  "/interview/kyonggi.html": "/guidebook/kyonggi.html",
  "/interview/myongji.html": "/guidebook/myongji.html",
  "/interview/pusan.html": "/guidebook/pusan.html",
  "/interview/sejong.html": "/guidebook/sejong.html",
  "/interview/seoultech.html": "/guidebook/seoultech.html",
  "/interview/snu.html": "/guidebook/snu.html",
  "/interview/sookmyung.html": "/guidebook/sookmyung.html",
  "/interview/soongsil.html": "/guidebook/soongsil.html",
  "/interview/sungshin.html": "/guidebook/sungshin.html",
  "/interview/uos.html": "/guidebook/uos.html",
  "/interview/korea.html": "/programs/korea.html",     // 고려대 제시문 면접 스튜디오 상세
  "/interview/yonsei.html": "/programs/yonsei.html",   // 연세대 제시문 면접 스튜디오 상세
  "/interview/knu.html": "/interview.html",            // 비판매 대학 → 38개 대학 면접 형태 판정표
  "/interview/skku.html": "/interview.html",
  "/store.html": "/guidebook/index.html",              // 08-26 v2 플랫폼 전환 전 상점 면
  "/store_item.html": "/guidebook/index.html",
  "/programs/skku.html": "/studio.html",               // 08-27 성균관대 스튜디오 폐지
  "/programs/index.html": "/programs/guidebook.html",  // 디렉터리 인덱스 없음 → 대표 소개면
  "/programs.html": "/programs/guidebook.html",
  "/lectures/index.html": "/lectures.html",
};
// GitHub Pages 해석과 같은 정규화: 디렉터리 → index.html, 확장자 없는 경로 → .html. 그 뒤 표를 찾는다.
function legacyKey(pathname) {
  if (pathname.endsWith("/")) return pathname + "index.html";
  if (!/\.[A-Za-z0-9]+$/.test(pathname)) return pathname + ".html";
  return pathname;
}

// 404 원장 UA 분류 (폐쇄 어휘: ai_user | ai_bot | search_bot | other_bot | browser | none). 원문 UA 는 저장하지 않는다.
// 순서가 판정이다 — 사용자 대행 fetcher(ChatGPT-User)가 먼저, 그다음 AI 크롤러, 검색 색인봇, 그 외 봇·도구, 남는 것이 브라우저.
const UA_CLASS = [
  [/ChatGPT-User|Claude-User|Perplexity-User|Meta-ExternalFetcher|MistralAI-User|Google-CloudVertexBot/i, "ai_user"],
  [/OAI-SearchBot|Claude-SearchBot|PerplexityBot|DuckAssistBot|YouBot|GPTBot|ClaudeBot|anthropic-ai|CCBot|Google-Extended|Bytespider|Amazonbot|meta-externalagent/i, "ai_bot"],
  [/Googlebot|Bingbot|bingpreview|Yeti|Daum|Applebot|Slurp|NaverBot|kakaotalk-scrap|Yandex/i, "search_bot"],
  [/bot|crawl|spider|scan|curl|wget|python|go-http|java|httpx|axios|node-fetch|okhttp|headless|smoke|audit|leakix|censys|zgrab|Prefetch Proxy|facebookexternalhit/i, "other_bot"],
];
function uaClass(ua) {
  if (!ua) return "none";
  for (const [re, c] of UA_CLASS) if (re.test(ua)) return c;
  return "browser";
}
function refHostOf(request) {
  try { return new URL(request.headers.get("Referer") || "").hostname.toLowerCase(); } catch { return ""; }
}
// 404 원장 쓰기 예산 — 스캐너가 분당 수백 건을 때리므로 isolate 당 분당 상한(통계 용도, 근사면 충분)
let nfBudget = { min: "", n: 0 };
function underNfBudget() {
  const k = new Date().toISOString().slice(0, 16);
  if (k !== nfBudget.min) nfBudget = { min: k, n: 0 };
  return ++nfBudget.n <= 60;
}

// 보호층 셸: 색인 금지 + 캐시 금지. 본문은 api 뒤에 있으므로 셸 자체는 비어 있지만 헤더로 한 번 더 못박는다.
const SHELL_NOINDEX = new Set(["/reader.html", "/lecture.html"]);
const PRIVATE_NOINDEX = new Set(["/my.html", "/cart.html", "/checkout.html", "/pay_done.html", "/join.html", "/login.html"]);

// 답변엔진 유입 판정: Referer 호스트 또는 utm_source (ChatGPT 는 링크에 utm_source=chatgpt.com 을 붙인다)
const ENGINE_HOSTS = {
  "chatgpt.com": "chatgpt", "openai.com": "chatgpt",
  "perplexity.ai": "perplexity",
  "claude.ai": "claude", "anthropic.com": "claude",
  "copilot.microsoft.com": "copilot", "bing.com": "bing",
  "gemini.google.com": "gemini",
  "duckduckgo.com": "duckduckgo", "you.com": "you", "search.brave.com": "brave", "kagi.com": "kagi",
};
// utm 은 정확 일치 allowlist 만 (aigate REQ13) — includes() 는 notchatgpt 류 오염과 임의 문자열(PII 포함) 저장 경로였다.
// 저장값도 원문이 아니라 정규화된 엔진명이다.
const ENGINE_UTM = {
  "chatgpt": "chatgpt", "chatgpt.com": "chatgpt", "openai": "chatgpt",
  "perplexity": "perplexity", "perplexity.ai": "perplexity",
  "claude": "claude", "claude.ai": "claude",
  "copilot": "copilot", "gemini": "gemini",
};

function engineOf(request, url) {
  let refHost = "";
  try { refHost = new URL(request.headers.get("Referer") || "").hostname.toLowerCase(); } catch {}
  for (const [h, name] of Object.entries(ENGINE_HOSTS)) {
    if (refHost === h || refHost.endsWith("." + h)) return { engine: name, refHost, utm: "" };
  }
  const utm = (url.searchParams.get("utm_source") || "").toLowerCase();
  const eng = ENGINE_UTM[utm];
  return eng ? { engine: eng, refHost, utm: eng } : null;
}

// 유입 원장 쓰기 예산 (aigate REQ13) — isolate 당 분당 상한. 성공 HTML GET 반복으로 D1 쓰기를
// 무제한 유발하는 경로의 역압. isolate 재기동 시 리셋되는 근사 예산이면 충분하다 (원장은 통계 용도).
let logBudget = { min: "", n: 0 };
function underLogBudget() {
  const k = new Date().toISOString().slice(0, 16);
  if (k !== logBudget.min) logBudget = { min: k, n: 0 };
  return ++logBudget.n <= 120;
}

function isHtmlPath(p) { return p.endsWith("/") || p.endsWith(".html") || !/\.[A-Za-z0-9]+$/.test(p); }

async function fetchAsset(env, request, url, path) {
  const u = new URL(url); u.pathname = path;
  return env.ASSETS.fetch(new Request(u.toString(), request));
}

// GitHub Pages 와 같은 해석: 디렉토리는 index.html, 확장자 없는 경로는 .html, 디렉토리를 슬래시 없이 부르면 슬래시로 301.
async function resolve(env, request, url) {
  const p = url.pathname;
  if (p.endsWith("/")) return { res: await fetchAsset(env, request, url, p + "index.html"), path: p + "index.html" };
  if (/\.[A-Za-z0-9]+$/.test(p)) return { res: await fetchAsset(env, request, url, p), path: p };
  const html = await fetchAsset(env, request, url, p + ".html");
  if (html.status !== 404) return { res: html, path: p + ".html" };
  const idx = await fetchAsset(env, request, url, p + "/index.html");
  if (idx.status !== 404) {
    const u = new URL(url); u.pathname = p + "/";
    return { res: Response.redirect(u.toString(), 301), path: null };
  }
  return { res: html, path: p + ".html" };
}

function visitorScheme(request) {
  try { return String(JSON.parse(request.headers.get("cf-visitor") || "{}").scheme || "").toLowerCase(); } catch { return ""; }
}

function withHeaders(res, path, urlPath) {
  const h = new Headers(res.headers);
  // HSTS 1년 (2026-09-12, http 301 과 짝). 서브도메인 미포함 — api·studio 는 각자 서빙하고, 미니 터널 등 http 전용 호스트가 생겨도 깨지지 않게.
  h.set("Strict-Transport-Security", "max-age=31536000");
  if (path && path.endsWith(".html")) {
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    // 판정 키 = 해석된 자산 경로 (aigate REQ12) — /reader 같은 확장자 없는 별칭도 /reader.html 로 판정된다
    const key = path;
    if (SHELL_NOINDEX.has(key)) {
      h.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
      h.set("Cache-Control", "private, no-store");
    } else if (PRIVATE_NOINDEX.has(key)) {
      h.set("X-Robots-Tag", "noindex, nofollow");
      h.set("Cache-Control", "private, no-store");
    } else if (!h.has("Cache-Control")) {
      h.set("Cache-Control", "public, max-age=600");
    }
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// ---------- 바이트 범위 (2026-09-07) ----------
// Workers static assets 바인딩은 Range 요청을 무시하고 200 전체 본문을 낸다 (09-04 Pages→Workers 이전 뒤 회귀, 라이브 실측 mp4·webm·png·css 전부 200).
// iOS Safari 는 서버 byte-range 지원이 없으면 mp4 재생을 "오류" 로 끝낸다 (Apple Safari Web Content Guide: 서버는 byte-range 요청을 지원해야 한다).
// 비 HTML 자산의 단일 범위를 여기서 잘라 206 으로 낸다. 다중 범위·형식 오류 = 200 전체, If-Range 가 ETag 와 다르면 200 전체, 범위 밖 = 416.
function parseRange(spec, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((spec || "").trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start, end;
  if (m[1] === "") { const n = Number(m[2]); if (n === 0) return "unsat"; start = Math.max(0, size - n); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= size || start > end) return "unsat";
  return { start, end };
}
async function withRange(request, res) {
  if (res.status !== 200) return res;
  const h = new Headers(res.headers); h.set("Accept-Ranges", "bytes");
  if (request.method === "HEAD") return new Response(null, { status: 200, statusText: res.statusText, headers: h });
  if (request.method !== "GET" || !res.body) return res;
  const spec = request.headers.get("Range");
  if (!spec) return new Response(res.body, { status: 200, statusText: res.statusText, headers: h });
  const ifRange = request.headers.get("If-Range");
  if (ifRange && ifRange !== h.get("ETag")) return new Response(res.body, { status: 200, statusText: res.statusText, headers: h });
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const r = parseRange(spec, size);
  if (r === null) { h.set("Content-Length", String(size)); return new Response(buf, { status: 200, headers: h }); }
  if (r === "unsat") return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size, "Accept-Ranges": "bytes" } });
  h.set("Content-Range", "bytes " + r.start + "-" + r.end + "/" + size);
  h.set("Content-Length", String(r.end - r.start + 1));
  return new Response(buf.slice(r.start, r.end + 1), { status: 206, statusText: "Partial Content", headers: h });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // 평문 http → https 301 (2026-09-12). 인스타그램 인앱 브라우저가 http://hyunhak.com 으로 열면 가입·로그인의
    // api.hyunhak.com 호출이 Origin http 로 나가 CORS 에서 막히고(브라우저 "Failed to fetch"), __Host- 쿠키도 못 받는다
    // (실사용자 신고, 라이브 실측 = http 200 그대로 서빙·HSTS 없음). 존 설정(Always Use HTTPS)과 별개로 워커가 스스로 올린다.
    // 판정 = request.url 의 scheme 또는 cf-visitor 헤더(프록시가 url 을 https 로 재작성하는 배포 형태 대비). 존 밖 호스트(localhost, workers.dev)는 제외.
    const zoneHost = url.hostname === APEX || url.hostname === "www." + APEX;
    if (zoneHost && (url.protocol === "http:" || visitorScheme(request) === "http")) {
      url.protocol = "https:"; url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }
    if (url.hostname === "www." + APEX) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }
    {
      const p0 = url.pathname.replace(/\/$/, "");
      const k = p0.endsWith(".html") ? p0 : p0 + ".html";
      if (REMOVED_GUIDEBOOK.has(k)) { url.pathname = "/guidebook/index.html"; url.search = ""; return Response.redirect(url.toString(), 301); }
    }
    {
      const to = LEGACY_REDIRECTS[legacyKey(url.pathname)];
      if (to) { url.pathname = to; return Response.redirect(url.toString(), 301); }
    }
    if (url.pathname === "/favicon.ico") {
      // 브라우저가 매 방문 자동 요청하는 경로. 404.html(12KB) 대신 아이콘 자산을 200 으로 낸다 (CF 8일 실측 60건)
      const ico = await fetchAsset(env, request, url, "/assets/favicon_32.png");
      if (ico.status === 200) {
        const h = new Headers(ico.headers); h.set("Cache-Control", "public, max-age=86400");
        return new Response(ico.body, { status: 200, headers: h });
      }
    }
    // workers.dev 등 비정식 호스트 (aigate REQ11): 존 밖이라 WAF·AI bot policies 가 안 걸린다.
    // 공개 지면은 noindex 로 서빙(컷오버 전 스모크 용도 유지), 보호층 셸은 아예 내지 않는다.
    const offZone = url.hostname !== APEX;
    try {
      const { res, path } = await resolve(env, request, url);
      if (offZone && path && (SHELL_NOINDEX.has(path) || PRIVATE_NOINDEX.has(path)))
        return new Response("Not available on this host", { status: 403, headers: { "X-Robots-Tag": "noindex" } });
      if (res.status === 404) {
        // GH Pages 와 동일: 모든 404 는 404.html 본문 (비 HTML 경로 포함, aigate NIT1)
        const nf = await fetchAsset(env, request, url, "/404.html");
        // 없는 면 원장 (2026-09-09): 경로·리퍼러 호스트·UA 분류만 (PII 없음). 다음 「없는 면」 유입은 _tools/not_found_report.py 로 즉시 특정한다.
        // 표가 아직 없어도 waitUntil + catch 라 응답은 그대로 404 다 (DDL 은 hyunhak-api tools/migrate_not_found_20260909.sql).
        if (!offZone && env.DB && request.method === "GET" && underNfBudget()) ctx.waitUntil(
          env.DB.prepare("INSERT INTO not_found(ts,path,ref_host,ua_class) VALUES(?,?,?,?)")
            .bind(new Date().toISOString(), url.pathname.slice(0, 200), refHostOf(request).slice(0, 100), uaClass(request.headers.get("User-Agent") || "")).run()
            .catch((err) => console.log("not_found fail", String(err).slice(0, 200)))
        );
        return withHeaders(new Response(nf.body, { status: 404, headers: nf.headers }), "/404.html", url.pathname);
      }
      if (!offZone && path && path.endsWith(".html") && res.status === 200 && env.DB && (request.method === "GET")) {
        const e = engineOf(request, url);
        if (e && underLogBudget()) ctx.waitUntil(
          env.DB.prepare("INSERT INTO ai_referrals(ts,path,engine,ref_host,utm) VALUES(?,?,?,?,?)")
            .bind(new Date().toISOString(), url.pathname.slice(0, 200), e.engine, e.refHost.slice(0, 100), e.utm.slice(0, 60)).run()
            .catch((err) => console.log("ai_referrals fail", String(err).slice(0, 200)))   // 결손 탐지 로그 (aigate NIT2)
        );
      }
      const ranged = (path && !path.endsWith(".html")) ? await withRange(request, res) : res;   // 미디어·자산만 (HTML 은 종전 그대로)
      const out = withHeaders(ranged, path, url.pathname);
      if (offZone) out.headers.set("X-Robots-Tag", "noindex, nofollow");   // 비정식 호스트 사본 색인 차단
      return out;
    } catch (err) {
      // 워커 결함이 사이트를 내리지 않게: 자산 직접 서빙으로 후퇴
      return env.ASSETS.fetch(request);
    }
  },
};
