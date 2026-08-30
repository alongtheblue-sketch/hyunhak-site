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
const ENGINE_UTM = ["chatgpt", "perplexity", "claude", "copilot", "gemini"];

function engineOf(request, url) {
  let refHost = "";
  try { refHost = new URL(request.headers.get("Referer") || "").hostname.toLowerCase(); } catch {}
  for (const [h, name] of Object.entries(ENGINE_HOSTS)) {
    if (refHost === h || refHost.endsWith("." + h)) return { engine: name, refHost, utm: "" };
  }
  const utm = (url.searchParams.get("utm_source") || "").toLowerCase();
  for (const k of ENGINE_UTM) if (utm.includes(k)) return { engine: k, refHost, utm };
  return null;
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
    if (SHELL_NOINDEX.has(urlPath)) {
      h.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
      h.set("Cache-Control", "private, no-store");
    } else if (PRIVATE_NOINDEX.has(urlPath)) {
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
    try {
      const { res, path } = await resolve(env, request, url);
      if (res.status === 404 && isHtmlPath(url.pathname)) {
        const nf = await fetchAsset(env, request, url, "/404.html");
        return withHeaders(new Response(nf.body, { status: 404, headers: nf.headers }), "/404.html", url.pathname);
      }
      if (path && path.endsWith(".html") && res.status === 200 && env.DB && (request.method === "GET")) {
        const e = engineOf(request, url);
        if (e) ctx.waitUntil(
          env.DB.prepare("INSERT INTO ai_referrals(ts,path,engine,ref_host,utm) VALUES(?,?,?,?,?)")
            .bind(new Date().toISOString(), url.pathname.slice(0, 200), e.engine, e.refHost.slice(0, 100), e.utm.slice(0, 60)).run()
            .catch(() => {})
        );
      }
      return withHeaders(res, path, url.pathname);
    } catch (err) {
      // 워커 결함이 사이트를 내리지 않게: 자산 직접 서빙으로 후퇴
      return env.ASSETS.fetch(request);
    }
  },
};
