// hyunhak-api — api.hyunhak.com (Cloudflare Workers + Hono + D1 + R2)
import { Hono } from "hono";
import { auth } from "./auth.js";
import { oauth, oauthEnabled } from "./oauth.js";
import { pay } from "./pay.js";
import { pg } from "./pg/index.js";
import { trial } from "./trial.js";
import { library } from "./library.js";
import { reader } from "./reader.js";
import { readerDownload } from "./reader_download.js";
import { lecture } from "./lecture.js";
import { idv } from "./idv.js";
import { notices } from "./notices.js";
import { b2b } from "./b2b.js";
import { support } from "./support.js";
import { admin } from "./admin.js";
import { adminUI } from "./admin_ui.js";
import { runCleanup } from "./maintenance.js";

const app = new Hono();

// ---------- CORS + 보안 헤더 ----------
const ALLOWED = (env) => [env.SITE_ORIGIN, "http://localhost:8788", "http://127.0.0.1:8788"];

app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  const ok = origin && ALLOWED(c.env).includes(origin);
  const NOIDX = { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" };   // 조기 반환 경로도 noindex (aigate NIT3)
  if (c.req.method === "OPTIONS") {
    if (!ok) return c.text("", 204, NOIDX);
    return c.body(null, 204, {
      ...NOIDX,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    });
  }
  // CSRF 방어: 상태 변경 요청은 Origin 필수 + 허용 목록 (Codex 2차 #7: fail-open 제거, PATCH 포함)
  // 예외 = 서버간 호출 경로: 토스 웹훅(재조회로 검증), 스튜디오 redeem(HMAC Bearer), 관리자(Access JWT — 같은 오리진 UI)
  const serverToServer = c.req.path === "/api/payments/webhook" || c.req.path === "/api/trial/redeem" || c.req.path === "/api/b2b/authorize" || c.req.path.startsWith("/admin");
  if (["POST", "PUT", "DELETE", "PATCH"].includes(c.req.method) && !serverToServer && !ok)
    return c.json({ error: "origin not allowed" }, 403, NOIDX);
  await next();
  if (ok) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
  }
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");   // api 응답은 어떤 색인에도 안 들어간다 (2026-08-30)
});

app.get("/api/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// 프론트 설정 (키 교체 시 사이트 재배포 불필요)
// 결제사에 따라 프론트가 받아야 할 공개값이 다르다 — 어댑터가 자기 몫만 내놓는다.
// 시크릿은 여기 절대 실리지 않는다 (publicConfig 는 공개값만 반환).
app.get("/api/config", (c) => c.json({
  ...pg(c.env).publicConfig(c.env),
  idvEnabled: !!c.env.IDV_PROVIDER,
  oauth: oauthEnabled(c.env), // {google, kakao, naver} — 콘솔 키 주입 전 false = 버튼 "준비 중"
}));

// 공개 상품 목록 (store 페이지)
app.get("/api/products", async (c) => {
  const rows = (await c.env.DB.prepare(
    "SELECT sku, type, title, subtitle, school, price, requires_shipping, stock, status, detail_url, sort FROM products WHERE status IN ('active','soldout') ORDER BY sort, title"
  ).all()).results;
  return c.json({ products: rows });
});

app.route("/api/auth", auth);
app.route("/api/auth", oauth);
app.route("/api", pay);
app.route("/api", trial);
app.route("/api", library);
app.route("/api", reader);
app.route("/api", readerDownload);
app.route("/api", lecture);
app.route("/api", idv);
app.route("/api", notices);
app.route("/api", b2b);
app.route("/api", support);   // 환불요청·1:1 문의 (2026-09-03)

// 관리자 (CF Access 뒤 — UI + API. UI 도 admin 라우터 안 = Access JWT 검증 뒤)
app.route("/admin", admin);

app.notFound((c) => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  console.error("unhandled", err);
  return c.json({ error: "서버 오류가 발생했습니다" }, 500);
});

export default {
  fetch: app.fetch,
  // wrangler.toml [triggers] crons — 회원 DB 위생 (만료 세션·rate_counters·email_tokens)
  scheduled: async (event, env, ctx) => { await runCleanup(env.DB); },
};
