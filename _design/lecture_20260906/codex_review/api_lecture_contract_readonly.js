// 인강 뷰어 API, R2 mp4 Range 프록시 + 계정 결속 토큰 + 진도, 행동 원장 + 책갈피 + 관리자 집계
// 설계 = docs/LECTURE_VIEWER_DESIGN_20260828.md (LECTURE_SPEC_20260827 §4, §5 구현 규격)
import { Hono } from "hono";
import { nowISO, uid, clientIP, rateLimit, signToken, verifyToken, b64url, automatedFor, isExempt, looksAutomated } from "./util.js";
import { recordAutomationAndStrike } from "./enforce.js";
import { requireMember } from "./auth.js";

export const lecture = new Hono();        // /api 마운트
export const lectureAdmin = new Hono();   // /admin/api/lectures 마운트 (Access 미들웨어 뒤)

// 토큰 TTL 4시간, <video> 는 재생 내내 Range 요청을 이어 보낸다. 리더의 10분을 그대로 쓰면 재생 중 401 스톨.
// 세션 id 에 결속되어 로그아웃 즉시 무효, 유출 URL 은 쿠키 없이는 쓸모없다.
const TOKEN_TTL = 4 * 3600;
const RATE_MIN = 0.5, RATE_MAX = 2.0;
const EVENT_KINDS = new Set(["play", "pause", "seek", "rate", "chapter", "bookmark", "ended", "close", "error"]);
const EVENTS_PER_BEAT = 50;
const BOOKMARK_MAX = 100;
const LABEL_MAX = 80, NOTE_MAX = 500;
const WATCHED_CAP = 60;                   // beat 1회 최대 인정 시청량(초)
const STATUSES = new Set(["empty", "ready", "hidden"]);
const DROPOFF_BINS = 20;

const lectureSecret = (env) => `${env.STUDIO_BRIDGE_HMAC}|lecture-v1`;
// 세션 결속 키: 웹 쿠키 세션 id 또는 앱 세션 id (둘 다 없는 회원 객체는 없다)
const sessKey = (m) => m.sess_id || (m.app_id ? `app:${m.app_id}` : "");
// 토큰에는 세션 id 원문 대신 비밀키 HMAC 앞 22자만 싣는다, 쿼리 토큰은 서명일 뿐 암호화가 아니라
// URL, 접근 로그로 새면 HttpOnly 쿠키 값까지 노출된다 (Codex r1 #3)
async function sessBind(env, m) {
  const t = await signToken({ s: sessKey(m) }, lectureSecret(env));
  return t.split(".")[1].slice(0, 22);
}

// ---------- L-5: 동시 시청 상한 (2026-08-30 결재 A안, 리더 v3 밀어내기 모델 이식) ----------
// open 이 자기 등록 후 고령 초과분을 밀어낸다. 밀려난 세션은 renew/beat 의 409 code:"evicted" 로 차단.
// 401/403 은 클라이언트 자동 복구(reopen)가 조용히 재진입해 상한을 무력화하므로 409 = 사람 손 재진입 전용.
// 스트림 자체는 검사하지 않아 밀려난 기기의 재생은 최대 beat 주기까지만 이어진다 (검토안 §3-1).
const LEC_ACTIVE_CAP = 3;
const LEC_ACTIVE_WIN = 30 * 60 * 1000;
const LEC_EVICTED_MSG = `다른 기기에서 시청을 시작하여 이 기기의 시청이 중단되었습니다 (동시 ${LEC_ACTIVE_CAP}기기 한도). 계속 보려면 다시 열어 주세요`;
// 자기 등록 + 밀어내기 3문, open 의 시청 세션 생성과 같은 batch 에 합류시켜 단일 트랜잭션으로 만든다
// (등록, 밀어내기만 커밋되고 세션 생성이 실패하면, 정상 기기는 축출됐는데 호출자는 토큰을 못 받는다, Codex 후속 r1 #14).
// 자기 지문은 밀어내기에서 명시 제외 (reader v3 Codex B-2 승계). lecture_id 는 이 지문의 마지막 강의 기록.
function lecActiveStmts(c, m, lectureId, sf) {
  const now = nowISO();
  const stale = new Date(Date.now() - LEC_ACTIVE_WIN).toISOString();
  return [
    c.env.DB.prepare(
      // last_ts 단조, 지연된 open 커밋이 그 사이 touch 된 최신 last_ts 를 과거로 되돌려
      // 활성 기기를 최고령으로 오판하게 하지 않는다 (r2 R5)
      `INSERT INTO lecture_active(member_id,sess_fp,first_ts,last_ts,lecture_id) VALUES(?,?,?,?,?)
       ON CONFLICT(member_id,sess_fp) DO UPDATE SET
         lecture_id=CASE WHEN last_ts<excluded.last_ts THEN excluded.lecture_id ELSE lecture_id END,
         last_ts=CASE WHEN last_ts<excluded.last_ts THEN excluded.last_ts ELSE last_ts END`
    ).bind(m.id, sf, now, now, lectureId),
    c.env.DB.prepare("DELETE FROM lecture_active WHERE member_id=? AND sess_fp<>? AND last_ts<?").bind(m.id, sf, stale),
    c.env.DB.prepare(
      `DELETE FROM lecture_active WHERE member_id=?1 AND sess_fp<>?2 AND sess_fp NOT IN (
         SELECT sess_fp FROM lecture_active WHERE member_id=?1 AND sess_fp<>?2 ORDER BY last_ts DESC, sess_fp DESC LIMIT ?3
       ) RETURNING sess_fp, lecture_id`
    ).bind(m.id, sf, LEC_ACTIVE_CAP - 1),
  ];
}
// 밀어내기 원장, 피해 지문이 마지막으로 보던 강의를 기록한다 (Codex 후속 r1 #15)
// await, waitUntil 로 미루면 실패가 조용히 삼켜져 축출은 성립했는데 원장이 없다 (r2 R7)
async function lecLogEvicted(c, m, evicted) {
  const now = nowISO();
  for (const e of (evicted || []))
    await c.env.DB.prepare(
      "INSERT INTO lecture_events(session_id,member_id,lecture_id,kind,pos_sec,value,ts) VALUES('evict',?,?,'evict',NULL,?,?)"
    ).bind(m.id, e.lecture_id || null, e.sess_fp.slice(0, 8), now).run();
}
// 검사와 활동 갱신(touch)을 분리한다, 검사 실패 요청(403/409/429)이 last_ts 를 갱신해
// 정상 기기를 밀어내면 안 되므로, touch 는 호출자가 전 검증 통과 뒤에만 부른다 (Codex 후속 r1 #13).
async function lecActiveRow(c, m, sf) {
  return c.env.DB.prepare("SELECT last_ts FROM lecture_active WHERE member_id=? AND sess_fp=?").bind(m.id, sf).first();
}
// 활동 신호 1분 스로틀 + 단조 갱신 (reader v3 승계). await, waitUntil 로 미루면 정상 beat 직후의
// 동시 open 이 갱신 전 last_ts 를 보고 방금 활동한 자기 행을 밀어낸다 (Codex 후속 r1 #12).
// lecture_id 도 함께, 다른 강의를 연 뒤 옛 탭에서 계속 본 기기의 피해 강의가 옛 open 값으로 굳지 않게 (r2 R7)
async function lecTouch(c, m, sf, row, lectureId) {
  if (Date.now() - Date.parse(row.last_ts) > 60_000) {
    await c.env.DB.prepare(
      `UPDATE lecture_active SET last_ts=CASE WHEN last_ts<?1 THEN ?1 ELSE last_ts END,
         lecture_id=COALESCE(?4, lecture_id) WHERE member_id=?2 AND sess_fp=?3`
    ).bind(nowISO(), m.id, sf, lectureId || null).run();
  } else if (lectureId) {
    // throttle 은 last_ts 쓰기 빈도 제어이지 피해 강의 정확도를 깎는 장치가 아니다 (r3 REQ5)
    // 1분 안에 다른 강의로 활동이 옮겨가도 lecture_id 는 즉시 따라간다 (변경시에만 쓰기라 증폭 없음)
    await c.env.DB.prepare(
      "UPDATE lecture_active SET lecture_id=?1 WHERE member_id=?2 AND sess_fp=?3 AND lecture_id<>?1"
    ).bind(lectureId, m.id, sf).run();
  }
}

const SESSION_REUSE_MIN = 30;             // 같은 강의를 30분 안에 다시 열면 같은 시청 회차 (새로고침, 복구가 회차를 부풀리지 않게, Codex r1 #7)
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const snapRate = (r) => RATES.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 1);
const BEAT_BODY_MAX = 16 * 1024;

const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round2 = (v) => Math.round(v * 100) / 100;

// ---------- 로드, 판정 ----------
async function loadLecture(c, id) {
  if (!id || typeof id !== "string" || id.length > 80) return null;
  return c.env.DB.prepare("SELECT * FROM lectures WHERE id=?").bind(id).first();
}
async function chaptersOf(c, id) {
  return (await c.env.DB.prepare("SELECT seq, start_sec, title FROM lecture_chapters WHERE lecture_id=? ORDER BY seq").bind(id).all()).results;
}
async function bookmarksOf(c, memberId, id) {
  return (await c.env.DB.prepare(
    "SELECT id, position_sec, label, note, created_at FROM lecture_bookmarks WHERE member_id=? AND lecture_id=? ORDER BY position_sec, created_at"
  ).bind(memberId, id).all()).results;
}
async function progressOf(c, memberId, id) {
  return c.env.DB.prepare(
    "SELECT position_sec, max_position_sec, watched_sec, rate, view_count, completed_at, updated_at FROM lecture_progress WHERE member_id=? AND lecture_id=?"
  ).bind(memberId, id).first();
}
// 회원의 유효 권리 범위 전부 (목록에서 N회 조인 대신 1회 로드)
async function accessRows(c, memberId) {
  return (await c.env.DB.prepare(
    `SELECT la.scope, la.unit_code, la.set_id FROM lecture_access la JOIN entitlements e ON e.id = la.entitlement_id
     WHERE e.member_id=? AND (e.expires_at IS NULL OR e.expires_at > ?)`
  ).bind(memberId, nowISO()).all()).results;
}
function coversLecture(rows, lec) {
  if (lec.access === "member") return true;
  for (const r of rows) {
    if (r.scope === "common" && lec.kind === "common") return true;
    if (r.scope === "unit" && lec.kind === "unit" && r.unit_code === lec.unit_code) return true;
    if (r.scope === "unit_passages" && lec.kind === "passage" && r.unit_code === lec.unit_code) return true;
    if (r.scope === "passage" && lec.kind === "passage" && r.set_id === lec.passage_set_id) return true;
  }
  return false;
}
async function hasAccess(c, memberId, lec) {
  if (lec.access === "member") return true;
  const row = await c.env.DB.prepare(
    `SELECT 1 AS ok FROM lecture_access la JOIN entitlements e ON e.id = la.entitlement_id
     WHERE e.member_id=? AND (e.expires_at IS NULL OR e.expires_at > ?)
       AND ( (la.scope='common'        AND ?='common')
          OR (la.scope='unit'          AND ?='unit'    AND la.unit_code=?)
          OR (la.scope='unit_passages' AND ?='passage' AND la.unit_code=?)
          OR (la.scope='passage'       AND ?='passage' AND la.set_id=?) ) LIMIT 1`
  ).bind(memberId, nowISO(), lec.kind, lec.kind, lec.unit_code || "", lec.kind, lec.unit_code || "", lec.kind, lec.passage_set_id || "").first();
  return !!row;
}
// 이어보기 지점: 완주했고 끝 근처면 처음부터
function resumeOf(p, dur) {
  if (!p) return 0;
  const pos = num(p.position_sec);
  if (p.completed_at && dur && pos >= dur * 0.95) return 0;
  return round2(pos);
}
const publicLecture = (l) => ({
  id: l.id, kind: l.kind, unit_code: l.unit_code, passage_set_id: l.passage_set_id, seq: l.seq,
  title: l.title, subtitle: l.subtitle, duration_sec: l.duration_sec, status: l.status, access: l.access,
  published_at: l.published_at, has_script: !!l.script_path,
});

// ---------- 목록, 요약, 상세 ----------
lecture.get("/lectures", requireMember(async (c) => {
  const m = c.get("member");
  const unit = c.req.query("unit"), set = c.req.query("set");
  let sql = "SELECT * FROM lectures WHERE status<>'hidden'";
  const binds = [];
  if (unit) { sql += " AND unit_code=?"; binds.push(unit); }
  if (set) { sql += " AND passage_set_id=?"; binds.push(set); }
  sql += " ORDER BY kind, unit_code, seq, title";
  const rows = (await c.env.DB.prepare(sql).bind(...binds).all()).results;
  const acc = await accessRows(c, m.id);
  const prog = (await c.env.DB.prepare(
    "SELECT lecture_id, position_sec, view_count, completed_at, updated_at FROM lecture_progress WHERE member_id=?"
  ).bind(m.id).all()).results;
  const pmap = Object.fromEntries(prog.map((p) => [p.lecture_id, p]));
  const out = rows.map((l) => {
    const p = pmap[l.id];
    return { ...publicLecture(l), entitled: coversLecture(acc, l),
      progress: p ? { position_sec: round2(num(p.position_sec)), view_count: p.view_count, completed: !!p.completed_at, updated_at: p.updated_at } : null };
  });
  return c.json({ lectures: out });
}));

// 공개 요약 (SPEC §6 문구 3단 분기: N=0 준비 중 / 0<N<전체 순차 공개 / N=전체 전체 포함). hidden 은 ready 에서 제외
lecture.get("/lectures/summary", async (c) => {
  const unit = c.req.query("unit") || null, set = c.req.query("set") || null, kind = c.req.query("kind") || null;
  let where = "1=1"; const binds = [];
  if (unit) { where += " AND unit_code=?"; binds.push(unit); }
  if (set) { where += " AND passage_set_id=?"; binds.push(set); }
  if (kind) { where += " AND kind=?"; binds.push(kind); }
  const r = await c.env.DB.prepare(
    `SELECT COUNT(*) total, SUM(CASE WHEN status='ready' THEN 1 ELSE 0 END) ready FROM lectures WHERE ${where}`
  ).bind(...binds).first();
  return c.json({ unit, set, kind, total: r?.total || 0, ready: r?.ready || 0, as_of: nowISO().slice(0, 10) });
});

// 공개 인강 상태 (PLAN s30 1-D, 2026-09-02): 회원 불요, 단위 목록의 상태만 노출.
// 자산 키(r2_key 등)는 SELECT 목록에 아예 넣지 않는다, 필드 추가 실수로 새어 나가지 않게.
const PUBLIC_UNIT_RE = /^[a-z]+(-[a-z]+)+$/;
// kind 는 폐쇄 어휘 3종 (Codex lecture_link r1 #9). 임의 문자열을 그대로 바인드하면 비회원 반복 조회가
// 인덱스를 못 타는 조건으로 들어온다. 상한 500행도 같은 이유다 (한 단위 최대 39행이라 실사용 여유).
const PUBLIC_KINDS = new Set(["common", "unit", "passage"]);
const PUBLIC_LIMIT = 500;
lecture.get("/lectures/public", async (c) => {
  const unit = c.req.query("unit");
  if (!unit || !PUBLIC_UNIT_RE.test(unit)) return c.json({ error: "unit 형식이 올바르지 않습니다" }, 400);
  const kind = c.req.query("kind") || null;
  if (kind && !PUBLIC_KINDS.has(kind)) return c.json({ error: "kind 형식이 올바르지 않습니다" }, 400);
  let sql = `SELECT id, kind, unit_code, passage_set_id, seq, title, subtitle, duration_sec, status, published_at
             FROM lectures WHERE status<>'hidden' AND unit_code=?`;
  const binds = [unit];
  if (kind) { sql += " AND kind=?"; binds.push(kind); }
  sql += ` ORDER BY kind, seq LIMIT ${PUBLIC_LIMIT}`;
  const rows = (await c.env.DB.prepare(sql).bind(...binds).all()).results;
  return c.json({ unit, lectures: rows });
});

// ---------- 열람 시작: 토큰 + 시청 세션 1행 + 회차 +1 ----------
lecture.post("/lecture/open", requireMember(async (c) => {
  const m = c.get("member");
  const { id, sig } = await c.req.json().catch(() => ({}));
  // 자동화 = UA 지문 OR 클라이언트 자기신고 신호 2개 이상. 예외 회원(automation_exempt)은 통과 (2026-08-30, 리더와 같은 규칙)
  const sigs = Array.isArray(sig) ? sig.filter((x) => typeof x === "string" && x.length <= 24).slice(0, 8) : [];
  // 리더와 같은 규칙 (aigate B4, REQ9): sig 필드 자체가 없는 웹 세션 = 브라우저 클라이언트 아님.
  // 예외 회원도 판정은 기록한다 (통과만, exempt 플래그로 계수 제외, 감사 흔적 유지).
  const sigMissing = m.sess_id != null && !Array.isArray(sig);
  if (looksAutomated(c) || sigs.length >= 2 || sigMissing) {
    c.executionCtx?.waitUntil?.(recordAutomationAndStrike(c, m, null));
    if (!isExempt(m)) return c.json({ error: "지원하지 않는 접속 환경입니다", code: "automation" }, 403);
  }
  const lec = await loadLecture(c, id);
  if (!lec || lec.status === "hidden") return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
  if (!(await hasAccess(c, m.id, lec))) return c.json({ error: "이용권이 있는 회원만 시청할 수 있습니다" }, 403);
  if (lec.status !== "ready" || !lec.r2_key)
    return c.json({ error: "영상을 준비하고 있습니다", status: "empty", has_script: !!lec.script_path }, 409);
  if (!(await rateLimit(c.env.DB, `lcopen:${m.id}`, 30, 3600)))
    return c.json({ error: "잠시 후 다시 시도해 주세요" }, 429);
  // L-5: open 은 항상 들어온다, 자기 등록 후 최고령 초과분 밀어내기 (사람 손 재진입 경로).
  // 등록, 밀어내기 3문은 아래 시청 세션 batch 에 합류 (단일 트랜잭션, Codex 후속 r1 #14)
  const sf = await sessBind(c.env, m);
  const actStmts = lecActiveStmts(c, m, lec.id, sf);

  const now = nowISO();
  const prev = await progressOf(c, m.id, lec.id);
  const resume = resumeOf(prev, lec.duration_sec);
  // 30분 안의 "같은 기기" 기존 회차만 잇는다 (새로고침, 토큰 복구 = 같은 시청). 기기 구분 없이 이으면
  // 3기기가 같은 sid, last_seq 를 공유해 동시 beat 가 서로를 stale 409 로 만들어 진도가 유실된다 (r2 B7).
  // 구 행(fp NULL)은 재사용하지 않는다.
  const recent = await c.env.DB.prepare(
    "SELECT id, last_seq FROM lecture_view_sessions WHERE member_id=? AND lecture_id=? AND fp=? AND last_seen_at > ? ORDER BY last_seen_at DESC LIMIT 1"
  ).bind(m.id, lec.id, sf, new Date(Date.now() - SESSION_REUSE_MIN * 60000).toISOString()).first();
  const reused = !!recent;
  const sid = reused ? recent.id : uid("lvs", 6);
  const token = await issueToken(c, m, lec.id, sid);
  const stmts = [...actStmts];
  if (reused) {
    stmts.push(c.env.DB.prepare("UPDATE lecture_view_sessions SET last_seen_at=?, closed=0 WHERE id=?").bind(now, sid));
    stmts.push(c.env.DB.prepare(
      `INSERT INTO lecture_progress(member_id,lecture_id,position_sec,max_position_sec,watched_sec,rate,view_count,first_opened_at,updated_at)
       VALUES(?,?,0,0,0,1.0,1,?,?) ON CONFLICT(member_id,lecture_id) DO UPDATE SET updated_at=excluded.updated_at`
    ).bind(m.id, lec.id, now, now));
  } else {
    stmts.push(c.env.DB.prepare(
      `INSERT INTO lecture_progress(member_id,lecture_id,position_sec,max_position_sec,watched_sec,rate,view_count,first_opened_at,updated_at)
       VALUES(?,?,0,0,0,1.0,1,?,?)
       ON CONFLICT(member_id,lecture_id) DO UPDATE SET view_count=view_count+1, updated_at=excluded.updated_at`
    ).bind(m.id, lec.id, now, now));
    stmts.push(c.env.DB.prepare(
      `INSERT INTO lecture_view_sessions(id,member_id,lecture_id,opened_at,last_seen_at,start_sec,last_sec,max_sec,watched_sec,ended,closed,ua,ip,fp)
       VALUES(?,?,?,?,?,?,?,?,0,0,0,?,?,?)`
    ).bind(sid, m.id, lec.id, now, now, resume, resume, resume, (c.req.header("User-Agent") || "").slice(0, 200), clientIP(c), sf));
  }
  // 읽기(목차, 책갈피)는 변이 batch 앞에서, 커밋 뒤 조회 실패가 "축출은 됐는데 토큰 없는 500" 을 만들지 않게 (r2 R6)
  const [chapters, bookmarks] = await Promise.all([chaptersOf(c, lec.id), bookmarksOf(c, m.id, lec.id)]);
  const rs = await c.env.DB.batch(stmts);
  try {
    await lecLogEvicted(c, m, rs[2].results); // actStmts[2] = 밀어내기 RETURNING
  } catch (e) {
    // 축출은 이미 성립, 원장 실패로 호출자에게 토큰 없는 500 을 돌려주면 정상 기기만 손해다 (r3 REQ4).
    // 재시도 1회를 응답 뒤로 미루고, 그래도 실패하면 로그로 남긴다.
    console.error("evict ledger fail", e);
    c.executionCtx?.waitUntil?.(lecLogEvicted(c, m, rs[2].results).catch((e2) => console.error("evict ledger retry fail", e2)));
  }
  return c.json({ exempt: isExempt(m),
    id: lec.id, title: lec.title, subtitle: lec.subtitle, kind: lec.kind, duration_sec: lec.duration_sec,
    token, ttl: TOKEN_TTL, session_id: sid, session_reused: reused, resume_sec: resume,
    seq: reused ? num(recent.last_seq) : 0,   // beat 단조 순번 하한 (새로고침 뒤 1부터 다시 세면 전부 409, Codex r2 #17)
    rate: prev ? snapRate(num(prev.rate, 1)) : 1,
    view_count: (prev ? prev.view_count : 0) + (reused ? 0 : 1), chapters, bookmarks,
    email: m.email, vtt: !!lec.vtt_key, poster: !!lec.poster_key,
  });
}));

async function issueToken(c, m, lectureId, sid) {
  return signToken(
    { typ: "lecture", m: m.id, sess: await sessBind(c.env, m), id: lectureId, sid,
      jti: b64url(crypto.getRandomValues(new Uint8Array(8))), exp: Math.floor(Date.now() / 1000) + TOKEN_TTL },
    lectureSecret(c.env)
  );
}

// ---------- 토큰 갱신: 같은 회차 유지, 회차 +0 (오류 복구, 만료 대비, Codex r1 #4, #7) ----------
lecture.post("/lecture/renew", requireMember(async (c) => {
  const m = c.get("member");
  const { sid } = await c.req.json().catch(() => ({}));
  if (looksAutomated(c)) {
    c.executionCtx?.waitUntil?.(recordAutomationAndStrike(c, m, null));
    if (!isExempt(m)) return c.json({ error: "지원하지 않는 접속 환경입니다", code: "automation" }, 403);
  }
  const s = typeof sid === "string" && sid ? await c.env.DB.prepare("SELECT * FROM lecture_view_sessions WHERE id=?").bind(sid.slice(0, 40)).first() : null;
  if (!s) return c.json({ error: "시청 세션이 없습니다" }, 404);
  if (s.member_id !== m.id) return c.json({ error: "권한이 없습니다" }, 403);
  const lec = await loadLecture(c, s.lecture_id);
  if (!lec || lec.status === "hidden") return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
  if (!(await hasAccess(c, m.id, lec))) return c.json({ error: "이용권이 없습니다" }, 403);
  if (lec.status !== "ready" || !lec.r2_key) return c.json({ error: "영상을 준비하고 있습니다" }, 409);
  // L-5: 밀려난 세션의 renew = 무인 복귀 경로, 409 code evicted (재등록 없음). touch 는 전 검증 통과 뒤 (r1 #13)
  const sfRenew = await sessBind(c.env, m);
  const actRenew = await lecActiveRow(c, m, sfRenew);
  if (!actRenew) return c.json({ error: LEC_EVICTED_MSG, code: "evicted" }, 409);
  if (!(await rateLimit(c.env.DB, `lcrenew:${m.id}`, 60, 3600))) return c.json({ error: "잠시 후 다시 시도해 주세요" }, 429);
  await lecTouch(c, m, sfRenew, actRenew, lec.id);
  const token = await issueToken(c, m, lec.id, s.id);
  await c.env.DB.prepare("UPDATE lecture_view_sessions SET last_seen_at=?, closed=0 WHERE id=?").bind(nowISO(), s.id).run();
  return c.json({ token, ttl: TOKEN_TTL, session_id: s.id, id: lec.id, seq: num(s.last_seq) });
}));

// ---------- 스트림 공통 검증: 쿠키 세션 AND 쿼리 토큰 (video src 는 헤더를 못 싣는다) ----------
async function streamAuth(c) {
  const m = c.get("member");
  if (looksAutomated(c)) {
    c.executionCtx?.waitUntil?.(recordAutomationAndStrike(c, m, null));
    if (!isExempt(m)) return { err: c.json({ error: "지원하지 않는 접속 환경입니다", code: "automation" }, 403) };
  }
  const p = await verifyToken(c.req.query("t") || "", lectureSecret(c.env));
  if (!p || p.typ !== "lecture") return { err: c.json({ error: "열람 토큰이 유효하지 않습니다" }, 401) };
  if (p.m !== m.id || p.sess !== (await sessBind(c.env, m))) return { err: c.json({ error: "세션이 만료되었습니다. 다시 열어 주세요" }, 401) };
  const id = c.req.query("id");
  if (!id || id !== p.id) return { err: c.json({ error: "강의 불일치" }, 401) };
  // 예산 검사를 강의, 권리, 활성 슬롯 조회보다 앞에 (r3 REQ7), 1바이트 Range 대량 전송이
  // 요청당 D1 3~4조회를 그대로 증폭시키지 않게. 토큰, 세션 검증 뒤라 익명 트래픽이 예산을 태우지는 못한다.
  if (!(await rateLimit(c.env.DB, `lcstream:${m.id}`, 300, 60)))
    return { err: c.json({ error: "요청이 너무 잦습니다" }, 429) };
  const lec = await loadLecture(c, id);
  if (!lec || lec.status === "hidden") return { err: c.json({ error: "강의를 찾을 수 없습니다" }, 404) };
  if (!(await hasAccess(c, m.id, lec))) return { err: c.json({ error: "이용권이 없습니다" }, 403) };   // 취소 즉시 반영
  if (lec.status !== "ready" || !lec.r2_key) return { err: c.json({ error: "영상을 준비하고 있습니다" }, 503) };
  // L-5: 스트림도 활성 슬롯을 요구한다, 밀려난 기기가 기존 쿠키, 4시간 토큰으로 Range 를 이어 보내면
  // beat 없이도 재생, 다운로드가 계속되므로 cap 이 서버에서 강제되지 않는다 (Codex 후속 r1 #10).
  // 403: 클라이언트 error → reopen → renew 409 evicted → 오버레이 경로로 수렴. 유효 스트림은 활동 신호로 touch.
  const sfStream = p.sess; // 위에서 sessBind(m) 과 일치 확인이 끝난 값
  const actStream = await lecActiveRow(c, m, sfStream);
  if (!actStream) return { err: c.json({ error: LEC_EVICTED_MSG, code: "evicted" }, 403) };
  await lecTouch(c, m, sfStream, actStream, lec.id);
  return { lec, member: m, tok: p };
}

const STREAM_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Disposition": "inline",
  "Accept-Ranges": "bytes",
};

// Range 파싱. 깨진 형식은 무시(전체 응답). 반환 {offset, end} 또는 null / {unsat:true}
function parseRange(header, size) {
  if (!header) return null;
  const m = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/.exec(header);
  if (!m || (!m[1] && !m[2])) return null;
  let start, end;
  if (!m[1]) {                 // 접미 bytes=-N
    const n = Number(m[2]);
    if (n === 0) return { unsat: true };
    start = Math.max(0, size - n); end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  }
  if (start >= size || start > end) return { unsat: true };
  return { offset: start, end };
}

// 응답 1회 상한 (r2 B8): 활성 슬롯 검사는 응답 시작 때 한 번뿐이라, 열어 둔 무제한 스트림은 축출 뒤에도
// 파일 끝까지 흘러 cap3 를 우회한다. 청크를 자르면 클라이언트가 이어받기 Range 를 다시 보내며 그때마다 재인증된다.
// 브라우저 <video> 는 항상 Range(bytes=0- 포함)를 보내고 206 이어받기를 표준 처리하므로 재생에는 무영향.
const STREAM_CHUNK_MAX = 8 * 1024 * 1024;

lecture.on(["GET", "HEAD"], "/lecture/stream", requireMember(async (c) => {
  const a = await streamAuth(c);
  if (a.err) return a.err;
  const head = await c.env.FILES.head(a.lec.r2_key);
  if (!head) return c.json({ error: "영상을 준비하고 있습니다" }, 503);
  const size = head.size;
  const range = parseRange(c.req.header("Range"), size);
  const base = { ...STREAM_HEADERS, "Content-Type": "video/mp4" };
  if (head.httpEtag) base.ETag = head.httpEtag;
  if (c.req.method === "HEAD")   // HEAD 는 Range 판정보다 앞: 메타만 (Codex r2 #5)
    return new Response(null, { status: 200, headers: { ...base, "Content-Length": String(size) } });
  if (range && range.unsat)
    return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${size}` } });
  if (!range) {
    // Range 없는 전체 응답은 상한 이하 파일만, 브라우저 재생 경로가 아니라 통파일 수집 경로다 (r2 B8)
    if (size > STREAM_CHUNK_MAX)
      return c.json({ error: "Range 요청이 필요합니다" }, 400);
    const obj = await c.env.FILES.get(a.lec.r2_key);
    if (!obj) return c.json({ error: "영상을 준비하고 있습니다" }, 503);
    return new Response(obj.body, { status: 200, headers: { ...base, "Content-Length": String(size) } });
  }
  const length = Math.min(range.end - range.offset + 1, STREAM_CHUNK_MAX);
  const end = range.offset + length - 1;
  const obj = await c.env.FILES.get(a.lec.r2_key, { range: { offset: range.offset, length } });
  if (!obj) return c.json({ error: "영상을 준비하고 있습니다" }, 503);
  return new Response(obj.body, {
    status: 206,
    headers: { ...base, "Content-Length": String(length), "Content-Range": `bytes ${range.offset}-${end}/${size}` },
  });
}));

lecture.get("/lecture/track", requireMember(async (c) => {
  const a = await streamAuth(c);
  if (a.err) return a.err;
  if (!a.lec.vtt_key) return c.json({ error: "자막이 없습니다" }, 404);
  const obj = await c.env.FILES.get(a.lec.vtt_key);
  if (!obj) return c.json({ error: "자막이 없습니다" }, 404);
  return new Response(obj.body, { headers: { ...STREAM_HEADERS, "Content-Type": "text/vtt; charset=utf-8" } });
}));

// ---------- 진도, 행동 집계 (beat) ----------
// 본문 = text/plain 또는 application/json 의 JSON. text/plain 은 sendBeacon, keepalive fetch 가 프리플라이트 없이
// 보낼 수 있는 유일한 형태라 pagehide 시점의 close 이벤트가 살아남는다. CSRF 는 전역 Origin 검사가 막는다.
lecture.post("/lecture/beat", requireMember(async (c) => {
  const m = c.get("member");
  const raw = await c.req.text();
  if (raw.length > BEAT_BODY_MAX) return c.json({ error: "본문이 너무 큽니다" }, 413);
  let b;
  try { b = JSON.parse(raw); } catch { return c.json({ error: "본문 형식 오류" }, 400); }
  if (!b || typeof b !== "object") return c.json({ error: "본문 형식 오류" }, 400);
  const sid = typeof b.sid === "string" ? b.sid.slice(0, 40) : "";
  if (!sid) return c.json({ error: "세션 식별자 누락" }, 400);
  const s = await c.env.DB.prepare("SELECT * FROM lecture_view_sessions WHERE id=?").bind(sid).first();
  if (!s) return c.json({ error: "시청 세션이 없습니다" }, 404);
  if (s.member_id !== m.id) return c.json({ error: "권한이 없습니다" }, 403);
  // L-5: 밀려난 기기의 beat = 409 code evicted, seq 409(stale)와 code 로 구분된다
  const sfBeat = await sessBind(c.env, m);
  const actBeat = await lecActiveRow(c, m, sfBeat);
  if (!actBeat) return c.json({ error: LEC_EVICTED_MSG, code: "evicted" }, 409);
  // 단조 순번: 재전송, 역순 위조는 버린다 (seq 를 안 보내는 구형 클라이언트는 허용)
  const seq = Number.isInteger(b.seq) ? b.seq : null;
  if (seq !== null && seq <= num(s.last_seq)) return c.json({ ok: false, error: "stale", last_seq: s.last_seq }, 409);
  if (!(await rateLimit(c.env.DB, `lcbeat:${m.id}`, 20, 60))) return c.json({ error: "요청이 너무 잦습니다" }, 429);
  const lec = await loadLecture(c, s.lecture_id);
  if (!lec || lec.status === "hidden") return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
  if (!(await hasAccess(c, m.id, lec))) return c.json({ error: "이용권이 없습니다" }, 403);   // 취소 뒤 기존 sid 로 원장 쓰기 차단 (Codex r2 #3)
  // touch 는 전 검증 통과 뒤, 실패하는 beat 연타가 슬롯을 신선하게 유지해 정상 기기를 밀어내면 안 된다 (r1 #13)
  await lecTouch(c, m, sfBeat, actBeat, s.lecture_id);
  const prog = await progressOf(c, m.id, lec.id);

  const now = Date.now(), nowIso = new Date(now).toISOString();
  const dur = num(lec.duration_sec, 0);
  const rate = snapRate(clamp(num(b.rate, 1), RATE_MIN, RATE_MAX));
  let pos = num(b.pos, 0);
  pos = dur > 0 ? clamp(pos, 0, dur) : Math.max(0, pos);
  // 시청량 클램프: 경과 시간 × 배속 × 1.2 + 2초 여유, 1회 상한 60초, 음수 0
  const elapsed = Math.max(0, (now - Date.parse(s.last_seen_at)) / 1000);
  let watched = clamp(num(b.watched, 0), 0, WATCHED_CAP);
  watched = Math.min(watched, elapsed * rate * 1.2 + 2);
  watched = round2(watched);

  const evs = (Array.isArray(b.ev) ? b.ev : []).slice(0, EVENTS_PER_BEAT)
    .filter((e) => e && typeof e === "object" && EVENT_KINDS.has(e.k))
    .map((e) => ({ k: e.k, pos: dur > 0 ? clamp(num(e.pos, pos), 0, dur) : Math.max(0, num(e.pos, pos)),
      v: e.v == null ? null : String(e.v).slice(0, 100) }));
  const ended = evs.some((e) => e.k === "ended");
  const closed = evs.some((e) => e.k === "close");
  if (ended && dur > 0) pos = dur;
  const maxPos = Math.max(num(s.max_sec), pos);
  // 완주 = (ended 또는 90% 도달) 이면서 누적 시청량이 길이의 절반 이상. 끝으로 한 번 seek 한 것은 완주가 아니다 (Codex r1 #10)
  const totalWatched = num(prog?.watched_sec) + watched;
  const done = (ended || (dur > 0 && maxPos >= dur * 0.9)) && (dur <= 0 || totalWatched >= dur * 0.5);

  const stmts = [
    c.env.DB.prepare(
      `UPDATE lecture_view_sessions SET last_seen_at=?, last_sec=?, max_sec=?, watched_sec=watched_sec+?,
         ended=CASE WHEN ?=1 THEN 1 ELSE ended END, closed=CASE WHEN ?=1 THEN 1 ELSE closed END,
         last_seq=MAX(last_seq, ?) WHERE id=?`
    ).bind(nowIso, round2(pos), round2(maxPos), watched, ended ? 1 : 0, closed ? 1 : 0, seq === null ? 0 : seq, sid),
    c.env.DB.prepare(
      `INSERT INTO lecture_progress(member_id,lecture_id,position_sec,max_position_sec,watched_sec,rate,view_count,completed_at,first_opened_at,updated_at)
       VALUES(?,?,?,?,?,?,1,?,?,?)
       ON CONFLICT(member_id,lecture_id) DO UPDATE SET
         position_sec=excluded.position_sec,
         max_position_sec=MAX(max_position_sec, excluded.max_position_sec),
         watched_sec=watched_sec+?,
         rate=excluded.rate,
         completed_at=COALESCE(completed_at, excluded.completed_at),
         updated_at=excluded.updated_at`
    ).bind(m.id, lec.id, round2(pos), round2(maxPos), watched, rate, done ? nowIso : null, nowIso, nowIso, watched),
  ];
  for (const e of evs)
    stmts.push(c.env.DB.prepare(
      "INSERT INTO lecture_events(session_id,member_id,lecture_id,kind,pos_sec,value,ts) VALUES(?,?,?,?,?,?,?)"
    ).bind(sid, m.id, lec.id, e.k, round2(e.pos), e.v, nowIso));
  await c.env.DB.batch(stmts);
  return c.json({ ok: true, position_sec: round2(pos), completed: done });
}));

// ---------- 책갈피 ----------
function cleanLabel(v) { return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : ""; }
lecture.get("/lecture/bookmarks", requireMember(async (c) => {
  const m = c.get("member");
  const id = c.req.query("id");
  if (!id) return c.json({ error: "강의 id 누락" }, 400);
  return c.json({ bookmarks: await bookmarksOf(c, m.id, id) });
}));
lecture.post("/lecture/bookmarks", requireMember(async (c) => {
  const m = c.get("member");
  const b = await c.req.json().catch(() => ({}));
  const lec = await loadLecture(c, b.id);
  if (!lec || lec.status === "hidden") return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
  if (!(await hasAccess(c, m.id, lec))) return c.json({ error: "이용권이 있는 회원만 책갈피를 남길 수 있습니다" }, 403);
  const label = cleanLabel(b.label);
  const note = typeof b.note === "string" ? b.note.trim() : "";
  if (!label || label.length > LABEL_MAX) return c.json({ error: `책갈피 이름은 1~${LABEL_MAX}자로 적어 주세요` }, 400);
  if (note.length > NOTE_MAX) return c.json({ error: `메모는 ${NOTE_MAX}자 이내로 적어 주세요` }, 400);
  const dur = num(lec.duration_sec, 0);
  const pos = round2(dur > 0 ? clamp(num(b.pos, 0), 0, dur) : Math.max(0, num(b.pos, 0)));
  if (!(await rateLimit(c.env.DB, `lcbm:${m.id}`, 60, 3600))) return c.json({ error: "잠시 후 다시 시도해 주세요" }, 429);
  const n = (await c.env.DB.prepare("SELECT COUNT(*) n FROM lecture_bookmarks WHERE member_id=? AND lecture_id=?").bind(m.id, lec.id).first()).n;
  if (n >= BOOKMARK_MAX) return c.json({ error: `책갈피는 강의당 ${BOOKMARK_MAX}개까지 남길 수 있습니다` }, 409);
  const id = uid("bm", 12), now = nowISO();   // 96비트 (추측 불가, Codex r1 #8)
  await c.env.DB.prepare(
    "INSERT INTO lecture_bookmarks(id,member_id,lecture_id,position_sec,label,note,created_at) VALUES(?,?,?,?,?,?,?)"
  ).bind(id, m.id, lec.id, pos, label, note || null, now).run();
  return c.json({ bookmark: { id, position_sec: pos, label, note: note || null, created_at: now } }, 201);
}));
lecture.patch("/lecture/bookmarks/:bid", requireMember(async (c) => {
  const m = c.get("member");
  const bid = c.req.param("bid");
  const b = await c.req.json().catch(() => ({}));
  const row = await c.env.DB.prepare("SELECT * FROM lecture_bookmarks WHERE id=? AND member_id=?").bind(bid, m.id).first();
  if (!row) return c.json({ error: "책갈피를 찾을 수 없습니다" }, 404);
  if (!(await rateLimit(c.env.DB, `lcbm:${m.id}`, 60, 3600))) return c.json({ error: "잠시 후 다시 시도해 주세요" }, 429);   // 쓰기 공용 예산 (Codex r2 #13)
  const label = b.label === undefined ? row.label : cleanLabel(b.label);
  const note = b.note === undefined ? row.note : (typeof b.note === "string" ? b.note.trim() : "");
  if (!label || label.length > LABEL_MAX) return c.json({ error: `책갈피 이름은 1~${LABEL_MAX}자로 적어 주세요` }, 400);
  if ((note || "").length > NOTE_MAX) return c.json({ error: `메모는 ${NOTE_MAX}자 이내로 적어 주세요` }, 400);
  await c.env.DB.prepare("UPDATE lecture_bookmarks SET label=?, note=? WHERE id=? AND member_id=?").bind(label, note || null, bid, m.id).run();
  return c.json({ ok: true, bookmark: { ...row, label, note: note || null } });
}));
lecture.delete("/lecture/bookmarks/:bid", requireMember(async (c) => {
  const m = c.get("member");
  if (!(await rateLimit(c.env.DB, `lcbm:${m.id}`, 60, 3600))) return c.json({ error: "잠시 후 다시 시도해 주세요" }, 429);
  const r = await c.env.DB.prepare("DELETE FROM lecture_bookmarks WHERE id=? AND member_id=?").bind(c.req.param("bid"), m.id).run();
  if (!r.meta.changes) return c.json({ error: "책갈피를 찾을 수 없습니다" }, 404);
  return c.json({ ok: true });
}));

// ---------- 상세 (파라미터 라우트는 정적 경로 stream/track/beat/bookmarks 뒤에 등록: 등록 순서가 매칭 우선) ----------
lecture.get("/lecture/:id", requireMember(async (c) => {
  const m = c.get("member");
  const lec = await loadLecture(c, c.req.param("id"));
  if (!lec || lec.status === "hidden") return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
  const [chapters, entitled, progress, bookmarks] = await Promise.all([
    chaptersOf(c, lec.id), hasAccess(c, m.id, lec), progressOf(c, m.id, lec.id), bookmarksOf(c, m.id, lec.id),
  ]);
  return c.json({ lecture: publicLecture(lec), chapters, entitled,
    progress: progress ? { ...progress, resume_sec: resumeOf(progress, lec.duration_sec) } : null, bookmarks });
}));

// ---------- 관리자 집계 (Access 뒤) ----------
lectureAdmin.get("/", async (c) => {
  const rows = (await c.env.DB.prepare(
    `SELECT l.*,
       (SELECT COUNT(*) FROM lecture_view_sessions v WHERE v.lecture_id=l.id) AS views,
       (SELECT COUNT(DISTINCT member_id) FROM lecture_view_sessions v WHERE v.lecture_id=l.id) AS viewers,
       (SELECT COUNT(*) FROM lecture_chapters ch WHERE ch.lecture_id=l.id) AS chapter_count,
       (SELECT COUNT(*) FROM lecture_progress p WHERE p.lecture_id=l.id AND p.completed_at IS NOT NULL) AS completed
     FROM lectures l ORDER BY l.kind, l.unit_code, l.seq, l.title`
  ).all()).results;
  return c.json({ lectures: rows });
});
lectureAdmin.get("/:id/stats", async (c) => {
  const lec = await loadLecture(c, c.req.param("id"));
  if (!lec) return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
  const db = c.env.DB, id = lec.id, dur = num(lec.duration_sec, 0);
  const [agg, prog, sessions, chapters, rates] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) views, COUNT(DISTINCT member_id) viewers, AVG(watched_sec) avg_watched,
              SUM(ended) ended, SUM(closed) closed FROM lecture_view_sessions WHERE lecture_id=?`
    ).bind(id).first(),
    db.prepare(
      `SELECT COUNT(*) n, SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) completed,
              AVG(max_position_sec) avg_max, AVG(watched_sec) avg_watched_total FROM lecture_progress WHERE lecture_id=?`
    ).bind(id).first(),
    db.prepare("SELECT last_sec, max_sec, ended, watched_sec FROM lecture_view_sessions WHERE lecture_id=?").bind(id).all(),
    chaptersOf(c, id),
    db.prepare("SELECT rate, COUNT(*) n FROM lecture_progress WHERE lecture_id=? GROUP BY rate ORDER BY rate").bind(id).all(),
  ]);
  // 이탈 분포: 끝까지 안 본 세션의 마지막 위치를 5% 20구간으로
  const dropoff = new Array(DROPOFF_BINS).fill(0);
  for (const s of sessions.results) {
    if (s.ended) continue;
    const frac = dur > 0 ? clamp(num(s.last_sec) / dur, 0, 0.9999) : 0;
    dropoff[Math.floor(frac * DROPOFF_BINS)]++;
  }
  const viewers = agg?.viewers || 0;
  const reach = [];
  for (const ch of chapters) {
    const r = await db.prepare("SELECT COUNT(*) n FROM lecture_progress WHERE lecture_id=? AND max_position_sec>=?").bind(id, ch.start_sec).first();
    reach.push({ seq: ch.seq, title: ch.title, start_sec: ch.start_sec, reached: r.n, reach: prog.n ? round2(r.n / prog.n) : 0 });
  }
  return c.json({
    id, title: lec.title, duration_sec: dur, status: lec.status,
    views: agg?.views || 0, viewers, ended_sessions: agg?.ended || 0, closed_sessions: agg?.closed || 0,
    avg_watched_sec: round2(num(agg?.avg_watched)), avg_max_position_sec: round2(num(prog?.avg_max)),
    completed: prog?.completed || 0, completion_rate: prog?.n ? round2(num(prog.completed) / prog.n) : 0,
    dropoff, dropoff_bin_pct: 100 / DROPOFF_BINS, chapters: reach,
    rates: rates.results.map((r) => ({ rate: r.rate, n: r.n })),
  });
});
lectureAdmin.get("/:id/viewers", async (c) => {
  const lec = await loadLecture(c, c.req.param("id"));
  if (!lec) return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
  const rows = (await c.env.DB.prepare(
    `SELECT p.member_id, m.email, m.name, p.position_sec, p.max_position_sec, p.watched_sec, p.rate, p.view_count,
            p.completed_at IS NOT NULL AS completed, p.first_opened_at, p.updated_at,
            (SELECT COUNT(*) FROM lecture_bookmarks b WHERE b.member_id=p.member_id AND b.lecture_id=p.lecture_id) AS bookmarks
     FROM lecture_progress p JOIN members m ON m.id=p.member_id WHERE p.lecture_id=? ORDER BY p.updated_at DESC LIMIT 500`
  ).bind(lec.id).all()).results;
  return c.json({ viewers: rows.map((r) => ({ ...r, completed: !!r.completed })) });
});
lectureAdmin.get("/:id/sessions", async (c) => {
  const lec = await loadLecture(c, c.req.param("id"));
  if (!lec) return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
  const rows = (await c.env.DB.prepare(
    `SELECT v.id, v.member_id, m.email, v.opened_at, v.last_seen_at, v.start_sec, v.last_sec, v.max_sec, v.watched_sec, v.ended, v.closed
     FROM lecture_view_sessions v JOIN members m ON m.id=v.member_id WHERE v.lecture_id=? ORDER BY v.opened_at DESC LIMIT 200`
  ).bind(lec.id).all()).results;
  return c.json({ sessions: rows });
});
lectureAdmin.patch("/:id", async (c) => {
  const lec = await loadLecture(c, c.req.param("id"));
  if (!lec) return c.json({ error: "강의를 찾을 수 없습니다" }, 404);
  const b = await c.req.json().catch(() => ({}));
  if (!STATUSES.has(b.status)) return c.json({ error: "status 는 empty, ready, hidden 중 하나입니다" }, 400);
  if (b.status === "ready" && !lec.r2_key) return c.json({ error: "영상(r2_key)이 없는 슬롯은 ready 로 바꿀 수 없습니다" }, 409);
  const now = nowISO();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE lectures SET status=?, published_at=CASE WHEN ?='ready' AND published_at IS NULL THEN ? ELSE published_at END, updated_at=? WHERE id=?")
      .bind(b.status, b.status, now, now, lec.id),
    c.env.DB.prepare("INSERT INTO admin_audit(actor,action,target,detail,ts) VALUES(?,?,?,?,?)")
      .bind(c.get("adminEmail") || "admin", "lecture.status", lec.id, JSON.stringify({ from: lec.status, to: b.status }), now),
  ]);
  return c.json({ ok: true, id: lec.id, status: b.status });
});
