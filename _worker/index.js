// hyunhak.com 정적 사이트 워커 (Workers static assets, run_worker_first).
// 하는 일 네 가지: www → apex 301, 경로 해석(GitHub Pages 와 같은 규칙), 보호층 셸 헤더, 답변엔진 유입 원장.
// 콘텐츠 판단은 하지 않는다. 봇 차단은 Cloudflare 존 정책(AI bot policies, WAF 룰)이 맡고, 본 워커는 같은 바이트를 모두에게 낸다 (클로킹 금지).

const APEX = "hyunhak.com";

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

function withHeaders(res, path, urlPath) {
  const h = new Headers(res.headers);
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname === "www." + APEX) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
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
      const out = withHeaders(res, path, url.pathname);
      if (offZone) out.headers.set("X-Robots-Tag", "noindex, nofollow");   // 비정식 호스트 사본 색인 차단
      return out;
    } catch (err) {
      // 워커 결함이 사이트를 내리지 않게: 자산 직접 서빙으로 후퇴
      return env.ASSETS.fetch(request);
    }
  },
};
