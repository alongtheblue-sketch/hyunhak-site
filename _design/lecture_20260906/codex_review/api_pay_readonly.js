// 주문과 결제 서버 승인: 금액은 서버 재계산, 승인 멱등
// 결제사는 어댑터가 가린다 (src/pg/). 아래 로직은 정규 어휘 하나만 보므로
// 토스든 포트원이든 같은 분기를 탄다. PG_PROVIDER 미설정 = 토스 (기존 동작 유지).
import { Hono } from "hono";
import { uid, nowISO, rateLimit, clientIP } from "./util.js";
import { requireMember } from "./auth.js";
import { notify, TPL, fmtWon, bankName, fmtDue, orderName } from "./notify.js";
import { pg, pgName } from "./pg/index.js";

const SHIP_FEE = 3000;
const SHIP_FREE_OVER = 50000;
// 지문 낱권 세트 id 형식, Global 5(PLAN s30). 서버 검증에 그대로 쓴다.
// trial.js 의 스튜디오 토큰 세트 선택도 같은 정규식을 쓴다 (재정의 금지, Codex r1 #3).
export const SET_ID_RE = /^(korea_2027_[hs]|yonsei_2027_[hs]|yonsei_intl_2027_i)(0[1-9]|[12][0-9]|30)$/;
// admin.js 취소 경로가 쓰던 심볼, 어댑터로 옮겼지만 재수출해 import 를 깨지 않는다
export { tossBase } from "./pg/toss.js";

export const pay = new Hono();

// ---------- 번들 전개 대상 동결 (r3 B3) ----------
// 전개 대상(결제 시점 활성 카탈로그)을 orders.bundle_targets 에 JSON 으로 박제한다.
// 박제는 ① paid 전이 batch(결제 시점, confirm 승자, 웹훅 DONE 승자, waiting_deposit→partial 첫 웹훅)와
// ② 구 주문 폴백(grantEntitlements 의 첫 지급 batch) 두 곳, 둘 다 다른 문장과 원자라
// "상태 전이 후 첫 지급 전 사망 + 카탈로그 증감 + 재시도" 가 결제 시점과 다른 목록을 지급하는 창이 없다.
async function computeBundleTargets(db, items) {
  const out = {};
  for (const it of items) {
    const snap = it.sku != null ? { type: it.type, sku: it.sku }
      : await db.prepare("SELECT type, sku FROM products WHERE id=?").bind(it.product_id).first();
    if (!snap || (snap.type !== "bundle_view" && snap.type !== "bundle_file")) continue;
    const targetType = snap.type === "bundle_view" ? "digital" : "digital_file";
    out[snap.sku] = (await db.prepare(
      "SELECT id, sku, school, file_key, title FROM products WHERE type=? AND status='active' AND sku LIKE 'guide-%' AND file_key IS NOT NULL ORDER BY sku"
    ).bind(targetType).all()).results;
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}
// paid 전이 batch 에 합류시킬 동결 문장 (없으면 null). IS NULL 가드 = 먼저 박제한 쪽이 이긴다.
async function bundleFreezeStmt(db, orderId, items) {
  const json = await computeBundleTargets(db, items);
  return json ? db.prepare("UPDATE orders SET bundle_targets=? WHERE id=? AND bundle_targets IS NULL").bind(json, orderId) : null;
}

// ---------- 지급 문장 예산 (Codex lecture_link r2 #13) ----------
// 상품 유형별 권리 kind 표. 지급 문장 산식의 단일 출처다. 아래 grantEntitlements 의 생성과
// lineStmtCount 의 계수가 이 표와 lecAccessRows 만 보므로 두 곳에 같은 산식을 다시 적지 않는다.
const GRANT_KINDS = {
  pass_passage: ["studio_passage"],
  pass_school: ["studio_school"],
  digital: ["download"],
  digital_file: ["download", "file_download"],   // 소장판 = 열람 + 파일 (DESIGN_v4 §1-2)
  lecture_common: ["lecture"],   // 공통 풀이 인강 단독 상품 (2026-09-03 GS-8e). 권리 자체가 lecture, access 는 common 1행
};
// 인강 파생 lecture_access 행 (PLAN s30 1-C). 단위 전권은 3행, 낱권 세트는 1행.
function lecAccessRows(kind, unitCode, setId) {
  return kind === "studio_school"
    ? [["unit", unitCode, null, unitCode], ["unit_passages", unitCode, null, unitCode], ["common", null, null, ""]]
    : [["passage", null, setId, setId]];
}
// 공통 풀이 인강 단독 상품(lecture_common)의 access 행. 파생이 아니라 상품 권리(kind lecture) 자체에 붙는다.
const COMMON_ACCESS_ROWS = [["common", null, null, ""]];
// 인강 권리 이용 기간(개월). 파생 권리와 lecture_common 둘 다 이 값으로 만료를 잡는다 (2026-09-03 건우 결재 GS-8f).
export const LECTURE_MONTHS = 3;
// 해설 강의가 걸린 단위 어휘 5종 (PLAN s30 Global 4). 판매 중단된 구 학교 전권(pass-yonsei, pass-korea)과
// 미래캠 3종은 여기 없다. 어휘 밖 pass_school 이 파생되면 강의가 하나도 없는 unit_code 로 _lec 와
// lecture_access 가 생기고, 내 강의 화면에 빈 단위 카드가 선다 (최종 리뷰 api Important 1).
export const LECTURE_UNITS = new Set(["korea-hum", "korea-sci", "yonsei-hum", "yonsei-sci", "yonsei-intl"]);
// pass_school 의 단위 코드 = sku 의 'pass-' 접미 (Global 4). 다른 유형에는 단위가 없다.
const unitCodeOf = (type, sku) => (type === "pass_school" ? String(sku || "").replace(/^pass-/, "") : null);
// 인강 연동 릴리스 시각. 이 시각 이후에 결제된 주문만 해설 강의 권리를 파생한다 (스펙 L-10 "기존 권리
// 소급은 별건"). 게이트가 없으면 grantEntitlements 를 다시 부르는 경로(결제 완료 페이지 재방문, DONE 웹훅
// 재전송, 부분취소 웹훅)에서 릴리스 이전 결제분이 그 순간 파생되어 만료가 재방문 시점 + 인강 기간으로 잡힌다.
// 같은 날 같은 상품을 산 두 회원 중 완료 페이지를 다시 연 쪽만 권리를 얻는 경로 의존 백필이다.
// 기존 결제분 소급은 핸드오프의 1회성 SQL 로 paid_at + 12개월을 박는 별건이다.
export const LECTURE_LINK_SINCE = "2026-09-02T00:00:00Z";
const LECTURE_LINK_SINCE_MS = Date.parse(LECTURE_LINK_SINCE);
// 이 주문이 시점 게이트를 통과하는가. 문자열 사전순 비교는 밀리초 표기 유무에 흔들려 시각으로 판정한다.
// 시각을 읽을 수 없으면 파생하지 않는다 (fail closed).
export function lecEligibleOrder(paidAt) {
  const t = Date.parse(paidAt || "");
  return Number.isFinite(t) && t >= LECTURE_LINK_SINCE_MS;
}
// 인강 파생이 붙는 줄인가: pass_school 은 5단위 어휘 안일 때만, pass_passage 는 세트 결속된 줄만.
// 주문 단위인 시점 게이트는 grantEntitlements 가 따로 본다 (예산 계수는 새 주문만 세므로 항상 통과).
const hasLecGrant = (kind, setId, unitCode) =>
  (kind === "studio_school" && LECTURE_UNITS.has(unitCode)) || (kind === "studio_passage" && !!setId);

// 한 주문에서 지급 batch 가 만들 D1 문장 수 상한.
// 근거: D1 문서 한도표(developers.cloudflare.com/d1/platform/limits, 2026-09-02 확인)의
//   "Queries per Worker invocation | 1000 (Workers Paid) | 50 (Free)" 과
//   "limits for individual queries apply to each individual statement contained within a batch",
//   즉 batch 안 문장 하나하나가 그 요청의 질의 수에 든다 (문장당 바인딩 100개, 문장 길이 100KB 한도는
//   본 지급 문장이 바인딩 14개, 1KB 미만이라 걸리지 않는다).
// 같은 요청이 지급 batch 말고도 주문, 품목 조회와 paid 전이 batch, 재고 차감(품목 수만큼),
// 알림, 감사 원장을 쓰고, 부분취소 웹훅은 회수 batch 뒤에 치유 지급을 한 번 더 부른다.
// 문서 상한의 1/4 을 한 주문 몫으로 잡는다. 250문 = 단위 전권 50개(19,800,000원)라 실제 장바구니가
// 닿는 값이 아니다. 초과 주문은 결제 전(주문 생성)에 막는다, 결제만 성사되고 지급과 치유 재시도가
// 영구 실패하는 주문을 만들지 않기 위해서다.
export const GRANT_STMT_MAX = 250;

// 주문 한 줄이 만드는 지급 문장 수. bundleTargets = 그 줄 번들의 전개 대상 수.
export function lineStmtCount(line, bundleTargets = 0) {
  const qty = Math.max(0, parseInt(line.qty, 10) || 0);
  if (line.type === "bundle_view" || line.type === "bundle_file")
    return 1 + bundleTargets * (line.type === "bundle_file" ? 2 : 1);   // 전개 목록 박제 1문 + 대상 x kind
  const kinds = GRANT_KINDS[line.type] || [];
  const setId = line.type === "pass_passage" && line.set_id ? line.set_id : null;
  const unitCode = unitCodeOf(line.type, line.sku);   // 어휘 밖 단위는 파생이 없어 문장도 없다
  let per = 0;
  for (const kind of kinds) {
    per += 1;                                                            // entitlements 1행
    if (kind === "lecture") per += COMMON_ACCESS_ROWS.length;            // 공통 인강 상품 = access 1행
    if (hasLecGrant(kind, setId, unitCode)) per += 1 + lecAccessRows(kind, "u", setId).length;   // 인강 권리 1행 + access N행
  }
  return per * qty;
}
// 주문 전 줄의 지급 문장 예산. 번들 전개 대상은 지급이 쓰는 것과 같은 조회(computeBundleTargets)로 센다.
export async function orderStmtBudget(db, lines) {
  let targets = {};
  if (lines.some((l) => l.type === "bundle_view" || l.type === "bundle_file")) {
    const json = await computeBundleTargets(db, lines);
    try { targets = json ? JSON.parse(json) : {}; } catch { targets = {}; }
  }
  let n = 0;
  for (const l of lines) n += lineStmtCount(l, (targets[l.sku] || []).length);
  return n;
}

// 멱등 권한부여, id 를 (주문, 상품, 회차) 결정론으로 만들고 INSERT OR IGNORE
// (Codex 2차 리뷰: 이중 confirm, 중간 장애 재시도에도 이중 지급, 영구 미지급 없음)
// 한 주문의 전 지급 문장은 단일 batch(단일 트랜잭션)로 나간다 (Codex lecture_link r1 #2, 2026-09-02).
// 품목별 batch 는 batch 사이에 커밋 창을 남겨, 낱권 다세트 주문에서 q0 만 지급된 순간에 부분취소가
// 끼면 아직 없는 q1 대신 q0 가 회수되고, 남은 줄의 지급이 실패하면 미취소 권리가 누락된다.
// export 는 테스트가 지급 batch 를 관찰하려는 용도다 (라우터는 이 심볼을 쓰지 않는다).
export async function grantEntitlements(db, order, items) {
  const now = nowISO();
  // 가이드북 열람권 이용기간 = 지급일부터 1개월 (2026-09-01 건우 지시, 종전 3개월).
  // 신규 지급분에만 적용된다, 이미 발급된 권리의 expires_at 은 건드리지 않는다.
  // 파일 소장, 스튜디오 권리는 만료 없음.
  const _d = new Date(now); _d.setMonth(_d.getMonth() + 1);
  const viewExp = _d.toISOString();
  // 인강 권리 만료 = 지급 + LECTURE_MONTHS(3)개월 (2026-09-03 건우 결재 GS-8f, 종전 PLAN s30 Global 6 의 12개월).
  // 파생 권리(pass_school, pass_passage 세트 결속)와 공통 풀이 인강 단독 상품(lecture_common) 둘 다.
  // 신규 지급분에만 적용된다, 이미 발급된 권리의 expires_at 은 건드리지 않는다.
  const _dl = new Date(now); _dl.setMonth(_dl.getMonth() + LECTURE_MONTHS);
  const lecExp = _dl.toISOString();
  // 부분취소 기회수 단위는 재지급하지 않는다, 경합 창의 늦은 DONE 웹훅이 회수분을 부활시키는 경로 차단 (READER-FOLLOWUP 2)
  const revoked = {};
  for (const r of (await db.prepare(
    "SELECT product_id, SUM(units) s FROM order_cancellation_items WHERE order_id=? GROUP BY 1"
  ).bind(order.id).all()).results) revoked[r.product_id] = r.s;
  // q 오프셋 누적 기준값, 같은 상품이 여러 줄(낱권 다세트)일 때 총 줄수와 줄 순서를 알아야
  // ent_<order>_<product>_<q> 가 줄마다 충돌 없이 이어진다 (PLAN s30 1-C)
  const totalQtyByProduct = {};
  for (const it of items) totalQtyByProduct[it.product_id] = (totalQtyByProduct[it.product_id] || 0) + it.qty;
  const qOffset = {};
  // r3 B3: 박제된 번들 전개 목록, 전달받은 order 객체는 전이 batch 이전 조회일 수 있어 fresh 로 읽는다
  let bundleTargets = null, freezeJson = null;
  const btRow = await db.prepare("SELECT bundle_targets, paid_at, created_at FROM orders WHERE id=?").bind(order.id).first();
  try { bundleTargets = btRow?.bundle_targets ? JSON.parse(btRow.bundle_targets) : null; } catch { bundleTargets = null; }
  // 인강 파생 시점 게이트 (최종 리뷰 api Important 1). 전이 batch 직후 호출은 인자 order 가 전이 이전
  // 조회라 paid_at 이 비어 있어, 같은 fresh 행의 값을 먼저 본다. 결제 시각이 없는 구 주문은 생성 시각으로 판정한다.
  const lecSince = lecEligibleOrder(btRow?.paid_at || order.paid_at || btRow?.created_at || order.created_at || null);
  if (!bundleTargets) freezeJson = await computeBundleTargets(db, items);   // 구 주문 폴백, 아래 첫 지급 batch 와 원자 박제
  const orderStmts = [];   // 주문 전 품목의 문장을 모아 마지막에 한 번 batch (r1 #2)
  for (const it of items) {
    // q 오프셋은 skip 여부와 무관하게 매 줄 전진, 다음 줄의 q 가 밀리면 부분취소 회수 후보 탐색과
    // 어긋난다 (round2 리뷰 Critical 1). 총수량 판정 기준은 같은 상품의 전 줄 합(totalQtyByProduct)이다.
    // 낱권 다세트에서 1편만 취소돼도 전 줄이 skip 되어 미취소 세트까지 영구 미지급되던 결함.
    const totalQty = totalQtyByProduct[it.product_id] || it.qty;
    const startQ = qOffset[it.product_id] || 0;
    qOffset[it.product_id] = startQ + it.qty;
    if ((revoked[it.product_id] || 0) >= totalQty) continue;
    // 스냅샷 우선 (READER-FOLLOWUP 1): 주문 시점 박제값으로 지급. 스냅샷 없는 구 주문만 products 폴백.
    // 번들 전개 대상은 결제 시점 활성 카탈로그 고정 정책 그대로 (DESIGN_v5 §2-2), 아래 targets 조회는 불변.
    const p = it.sku != null
      ? { id: it.product_id, type: it.type, sku: it.sku, file_key: it.file_key, school: it.school, title: it.title }
      : await db.prepare("SELECT * FROM products WHERE id=?").bind(it.product_id).first();
    if (!p) continue;
    // 전체권 번들 (DESIGN_v5 §2-2), 대상 카탈로그 전권으로 전개해 권당 권리 행을 남긴다.
    // 리더의 권리 검사(meta file_key)가 그대로 동작하므로 reader 계열은 비접촉.
    // sku 가드: digital 타입에 가이드북 아닌 상품이 나중에 생겨도 번들에 쓸려 들어가지 않게.
    if (p.type === "bundle_view" || p.type === "bundle_file") {
      const kinds = p.type === "bundle_view" ? ["download"] : ["download", "file_download"];
      // 전개 대상 = 박제 manifest (r3 B3). 박제가 없으면(구 주문, 전이 이전 결제) 지금 계산한 목록을
      // 첫 지급과 같은 batch 로 박제한다. 박제와 지급이 원자라 서로 다른 카탈로그 목록이 섞이지 않는다.
      // 종전의 granted_at 동결 가드(r2 B5)는 첫 지급 전 사망 시 무력했고, manifest 가 그 역할을 대체한다.
      const stored = bundleTargets && Array.isArray(bundleTargets[p.sku]) ? bundleTargets[p.sku] : null;
      let targets = stored;
      if (!targets) {
        try { targets = freezeJson ? (JSON.parse(freezeJson)[p.sku] || []) : []; } catch { targets = []; }
      }
      const stmts = [];
      if (!stored && freezeJson)
        stmts.push(db.prepare("UPDATE orders SET bundle_targets=? WHERE id=? AND bundle_targets IS NULL").bind(freezeJson, order.id));
      for (const t of targets) {
        for (const kind of kinds) {
          // INSERT 문 안의 가드 (조회, 삽입 사이 경합에도 문장 단위 원자):
          // ① 회수 원장 (r1 #1) ② 주문 상태 (r2 B1) ③ 폴백 박제 승자 확인, 동시 두 계산이
          //   서로 다른 목록을 섞지 않게, 내 목록이 박제본과 일치할 때만 지급 (r3 B3)
          const winGuard = stored ? "" : " AND (SELECT COALESCE(bundle_targets,?) FROM orders WHERE id=?) = ?";
          const st = db.prepare(
            `INSERT OR IGNORE INTO entitlements(id,member_id,order_id,product_id,kind,meta,uses_left,granted_at,expires_at)
             SELECT ?,?,?,?,?,?,?,?,?
             WHERE NOT EXISTS (SELECT 1 FROM order_cancellation_items WHERE order_id=? AND product_id=?)
               AND (SELECT status FROM orders WHERE id=?) IN ('paid','partial_canceled')${winGuard}`
          );
          const binds = [
            `ent_${order.id.slice(4)}_${p.id.slice(4)}_${t.id.slice(4)}${kind === "file_download" ? "_f" : ""}`,
            order.member_id, order.id, t.id, kind,
            JSON.stringify({ school: t.school || null, sku: t.sku, file_key: t.file_key, title: t.title, bundle: p.sku }),
            null, now, kind === "download" ? viewExp : null,
            order.id, p.id, order.id,
          ];
          if (!stored) binds.push(freezeJson, order.id, freezeJson);
          stmts.push(st.bind(...binds));
        }
      }
      orderStmts.push(...stmts);
      continue;
    }
    const kinds = GRANT_KINDS[p.type] || [];   // 유형별 kind 표는 예산 계수와 같은 출처 (r2 #13)
    if (!kinds.length) continue; // 실물 배송 상품은 권리 없음
    // 권리 행들은 주문 단위 batch 원자. 부분 실패로 열람만 지급된 상태가 남지 않는다 (Codex r1 #5, r1 #2)
    // 회수는 뒤 단위(q 상위)부터라, 재지급은 잔여 단위 수까지만 채우면 회수분과 겹치지 않는다.
    // 잔여 판정(q < qty - 회수합)과 주문 상태 판정을 INSERT 문 안의 서브쿼리로
    // 조회, 삽입 사이의 부분취소(r1 #1), 전액취소(r2 B1) 경합에도 문장 단위 원자다
    // q 는 상품별 누적 오프셋(startQ, totalQty 는 루프 진입부에서 이미 계산), 같은 상품이 여러 줄
    // (낱권 다세트)이면 줄 순서로 이어진다 (PLAN s30 1-C)
    const setId = p.type === "pass_passage" && it.set_id ? it.set_id : null;
    const unitCode = unitCodeOf(p.type, p.sku);
    const stmts = [];
    for (let i = 0; i < it.qty; i++) {
      const q = startQ + i;
      for (const kind of kinds) {
        const eid = `ent_${order.id.slice(4)}_${p.id.slice(4)}_${q}${kind === "file_download" ? "_f" : ""}`;
        const meta = { school: p.school || null, sku: p.sku, file_key: p.file_key || null, title: p.title };
        if (setId) meta.set_id = setId;
        if (kind === "lecture") meta.scope = "common";   // lecture_common: 내 강의가 범위를 읽는 표식
        const whereBinds = [q, totalQty, order.id, p.id, order.id];
        stmts.push(db.prepare(
          `INSERT OR IGNORE INTO entitlements(id,member_id,order_id,product_id,kind,meta,uses_left,granted_at,expires_at)
           SELECT ?,?,?,?,?,?,?,?,?
           WHERE ? < ? - (SELECT COALESCE(SUM(units),0) FROM order_cancellation_items WHERE order_id=? AND product_id=?)
             AND (SELECT status FROM orders WHERE id=?) IN ('paid','partial_canceled')`
        ).bind(
          // 멱등 id: 기존 포맷 불변, 파일 권리 행만 _f 접미 (DESIGN_v4 §1-2)
          eid, order.member_id, order.id, p.id, kind, JSON.stringify(meta),
          p.type === "pass_passage" ? 5 : null, // 지문 1편 = 5회 응시 (studio.html 고지)
          now, kind === "download" ? viewExp : kind === "lecture" ? lecExp : null,
          ...whereBinds
        ));
        // 공통 풀이 인강 단독 상품 (GS-8e): 권리 행 자체에 common access 1행. 파생과 같은 EXISTS 가드로 원자.
        if (kind === "lecture")
          for (const [scope, uc, sid, targetKey] of COMMON_ACCESS_ROWS)
            stmts.push(db.prepare(
              `INSERT OR IGNORE INTO lecture_access(entitlement_id,scope,unit_code,set_id,target_key)
               SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM entitlements WHERE id=?)`
            ).bind(eid, scope, uc, sid, targetKey, eid));
        // 인강 권리 파생 (PLAN s30 1-C): 릴리스 이후 결제 주문에서만, pass_school 은 5단위 어휘 안일 때,
        // pass_passage 는 세트 결속된 줄만. studio 행과 같은 가드(회수 서브쿼리, 주문 상태)를 그대로 써
        // 회수, 재확인 정합을 잇는다. 게이트 셋은 studio 권리 지급에 영향을 주지 않는다.
        if (lecSince && hasLecGrant(kind, setId, unitCode)) {
          const lecId = `${eid}_lec`;
          const lecMeta = kind === "studio_school" ? { unit_code: unitCode } : { set_id: setId };
          stmts.push(db.prepare(
            `INSERT OR IGNORE INTO entitlements(id,member_id,order_id,product_id,kind,meta,uses_left,granted_at,expires_at)
             SELECT ?,?,?,?,?,?,?,?,?
             WHERE ? < ? - (SELECT COALESCE(SUM(units),0) FROM order_cancellation_items WHERE order_id=? AND product_id=?)
               AND (SELECT status FROM orders WHERE id=?) IN ('paid','partial_canceled')`
          ).bind(lecId, order.member_id, order.id, p.id, "lecture", JSON.stringify(lecMeta), null, now, lecExp, ...whereBinds));
          for (const [scope, uc, sid, targetKey] of lecAccessRows(kind, unitCode, setId))
            stmts.push(db.prepare(
              `INSERT OR IGNORE INTO lecture_access(entitlement_id,scope,unit_code,set_id,target_key)
               SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM entitlements WHERE id=?)`
            ).bind(lecId, scope, uc, sid, targetKey, lecId));
        }
      }
    }
    orderStmts.push(...stmts);
  }
  // 단일 커밋 지점: 여기까지 오면 주문의 전 품목이 함께 지급되거나 함께 실패한다.
  if (orderStmts.length) await db.batch(orderStmts);
}

// ---------- 부분취소 품목 매핑 (READER-FOLLOWUP 2, 2026-08-30) ----------
// 취소 금액이 미회수 품목 단위(unit_price)들의 부분집합 합과 정확히 일치하고 그 조합이 유일할 때만 자동 회수.
// 조합이 없거나 여럿이면 null (회수 0, 수동 대사), 과회수보다 미회수가 안전하다.
// 배송비는 유사 품목 "_ship" 으로 탐색에 참여시킨다, 배송비만 환불했는데 같은 금액의 디지털 상품이
// 유일 매칭되어 정상 권리가 삭제되는 사고를 막는다 (Codex 후속 r1 #7). 금액이 겹치면 다의성 = 수동 대사.
function matchCancelUnits(items, revoked, amount, shipFee = 0) {
  if (!Number.isInteger(amount) || amount <= 0) return null;
  const byPid = new Map();
  for (const it of items) {
    const cur = byPid.get(it.product_id) || { pid: it.product_id, price: it.unit_price, left: 0 };
    // 같은 상품이 서로 다른 단가로 담긴 주문은 pid 단위 회계가 성립하지 않는다, 수동 대사 (Codex 후속 r1 #6)
    if (cur.price !== it.unit_price) return null;
    cur.left += it.qty;
    byPid.set(it.product_id, cur);
  }
  if (Number.isInteger(shipFee) && shipFee > 0)
    byPid.set("_ship", { pid: "_ship", price: shipFee, left: 1 });
  const pool = [...byPid.values()]
    .map((u) => ({ ...u, left: u.left - (revoked[u.pid] || 0) }))
    .filter((u) => u.left > 0 && u.price > 0);
  if (pool.reduce((s, u) => s + u.left, 0) > 16) return null; // 탐색 상한 초과 = 수동 대사
  const sols = [];
  const cur = new Map();
  (function dfs(i, rest) {
    if (sols.length > 1) return;
    if (rest === 0) { sols.push(new Map(cur)); return; }
    if (i >= pool.length || rest < 0) return;
    const u = pool[i];
    for (let n = Math.min(u.left, Math.floor(rest / u.price)); n >= 0; n--) {
      if (n > 0) cur.set(u.pid, n); else cur.delete(u.pid);
      dfs(i + 1, rest - n * u.price);
      if (sols.length > 1) return;
    }
    cur.delete(u.pid);
  })(0, amount);
  return sols.length === 1 ? Object.fromEntries(sols[0]) : null;
}

// 매핑된 품목 단위만 회수. 전 품목의 삭제, 묘비, 원장, matched 전이를 한 batch(단일 트랜잭션)로 묶는다.
// - "남은 것 중 최상위 q" 를 DELETE 시점 서브쿼리로 고른다, 동시 취소 두 발이 같은 q 를 겹쳐 지우고
//   원장만 이중 기록되던 경합 차단 (Codex 후속 r1 #3). q 는 주문 수량 상한 10 이라 항상 한 자리 = 사전순 DESC 가 수치 DESC.
// - 삭제 직전 같은 batch 에서 묘비를 박제해 보존기간(종료 후 3/5년)의 근거를 남긴다 (Codex 후속 r1 #17)
// - 크래시 시 matched=0 그대로 남아 다음 웹훅의 재평가 루프가 처음부터 다시 시도한다 (Codex 후속 r1 #2)
// - 번들 판정은 주문 스냅샷 우선, 구매 뒤 상품 type, sku 개정에도 회수는 주문 시점 기준 (Codex 후속 r1 #4)
// export: 환불요청 승인의 부분취소(admin.js)가 요청 항목으로 만든 mapping 을 같은 회수 경로에 태운다 (2026-09-03)
export async function revokeUnits(db, order, mapping, cancellationId, items) {
  const now = nowISO();
  // 클레임 가드 (r2 B2): 같은 transaction_key 웹훅 두 요청이 모두 matched=0 을 읽고 각자 batch 를 실행해도,
  // D1 트랜잭션은 직렬이라 먼저 커밋한 쪽이 마지막 문장에서 matched=1 로 전이하고 늦은 쪽의 전 문장은
  // 아래 EXISTS 가드에서 전부 no-op 이 된다 (같은 batch 안에서는 matched 가 아직 0 이라 자기 문장을 막지 않는다).
  const claim = "EXISTS (SELECT 1 FROM order_cancellations WHERE id=?1 AND matched=0)";
  const stmts = [];
  for (const [pid, units] of Object.entries(mapping)) {
    if (pid !== "_ship") { // 배송비 유사 품목은 권리가 없다, 원장 기록만
      const snap = items.find((x) => x.product_id === pid);
      const p = snap && snap.sku != null ? { type: snap.type, sku: snap.sku }
        : await db.prepare("SELECT type, sku FROM products WHERE id=?").bind(pid).first();
      if (p && (p.type === "bundle_view" || p.type === "bundle_file")) {
        // 묘비는 추적 소비처가 있는 권리종만, file_key 없는 스튜디오류 묘비는 목적 없는 보관 (r2 R3)
        stmts.push(db.prepare(
          `INSERT INTO entitlement_revocations(member_id,file_key,kind,revoked_at)
           SELECT member_id, json_extract(meta,'$.file_key'), kind, ?2
           FROM entitlements WHERE order_id=?3 AND json_valid(meta) AND json_extract(meta,'$.bundle')=?4
             AND kind IN ('download','file_download') AND json_extract(meta,'$.file_key') IS NOT NULL AND ${claim}`
        ).bind(cancellationId, now, order.id, p.sku));
        stmts.push(db.prepare(
          `DELETE FROM entitlements WHERE order_id=?2 AND json_valid(meta) AND json_extract(meta,'$.bundle')=?3 AND ${claim}`
        ).bind(cancellationId, order.id, p.sku));
      } else {
        const cand = [];
        for (let q = 0; q <= 9; q++) cand.push(`ent_${order.id.slice(4)}_${pid.slice(4)}_${q}`);
        // 문장마다 파라미터 번호를 자기 binds 에 맞춰 새로 짠다 (?1 = 클레임 cid 고정)
        const phFrom = (s) => cand.map((_, i) => `?${i + s}`).join(",");
        const topBaseT = `SELECT b.id FROM entitlements b WHERE b.id IN (${phFrom(3)}) ORDER BY b.id DESC LIMIT ?13`;
        const topFileT = `SELECT b.id||'_f' FROM entitlements b WHERE b.id IN (${phFrom(3)}) ORDER BY b.id DESC LIMIT ?13`;
        const topBaseD = `SELECT b.id FROM entitlements b WHERE b.id IN (${phFrom(2)}) ORDER BY b.id DESC LIMIT ?12`;
        const topFileD = `SELECT b.id||'_f' FROM entitlements b WHERE b.id IN (${phFrom(2)}) ORDER BY b.id DESC LIMIT ?12`;
        // 짝 인강 권리 (PLAN s30 1-C): studio 행 ent_..._<q> 를 회수할 때 ent_..._<q>_lec 도 함께 지운다.
        // base 행이 아직 살아 있을 때(삭제 전) 계산해야 이 q 집합을 찾는다, topFileD 와 같은 순서.
        const topLecD = `SELECT b.id||'_lec' FROM entitlements b WHERE b.id IN (${phFrom(2)}) ORDER BY b.id DESC LIMIT ?12`;
        // 묘비 → _f/_lec 삭제 → 기본 행 삭제 순서: 서브쿼리가 참조하는 기본 행이 삭제 전까지 살아 있어야 한다
        stmts.push(db.prepare(
          `INSERT INTO entitlement_revocations(member_id,file_key,kind,revoked_at)
           SELECT member_id, json_extract(meta,'$.file_key'), kind, ?2
           FROM entitlements WHERE (id IN (${topBaseT}) OR id IN (${topFileT})) AND ${claim}
             AND kind IN ('download','file_download') AND json_valid(meta) AND json_extract(meta,'$.file_key') IS NOT NULL`
        ).bind(cancellationId, now, ...cand, units));
        stmts.push(db.prepare(`DELETE FROM entitlements WHERE id IN (${topFileD}) AND ${claim}`).bind(cancellationId, ...cand, units));
        stmts.push(db.prepare(`DELETE FROM entitlements WHERE id IN (${topLecD}) AND ${claim}`).bind(cancellationId, ...cand, units));
        stmts.push(db.prepare(`DELETE FROM entitlements WHERE id IN (${topBaseD}) AND ${claim}`).bind(cancellationId, ...cand, units));
      }
    }
    stmts.push(db.prepare(
      `INSERT INTO order_cancellation_items(cancellation_id,order_id,product_id,units)
       SELECT ?1,?2,?3,?4 WHERE ${claim}`
    ).bind(cancellationId, order.id, pid, units));
  }
  stmts.push(db.prepare("UPDATE order_cancellations SET matched=1 WHERE id=?1 AND matched=0").bind(cancellationId));
  await db.batch(stmts);
}

// 주문 생성, 클라이언트는 sku, qty 만 보냄
pay.post("/orders", requireMember(async (c) => {
  const m = c.get("member");
  const b = await c.req.json().catch(() => ({}));
  const items = Array.isArray(b.items) ? b.items.slice(0, 20) : [];
  if (!items.length) return c.json({ error: "주문 항목이 없습니다" }, 400);
  // r3 REQ2: 가격 재확인으로 다시 만들 때 직전 pending 주문을 폐기 (미결제 고아 중복 방지). 본인 pending 만.
  if (typeof b.replace_order_id === "string" && b.replace_order_id)
    await c.env.DB.prepare("UPDATE orders SET status='failed', fail_reason='가격 재확인으로 재생성' WHERE id=? AND member_id=? AND status='pending'")
      .bind(b.replace_order_id.slice(0, 40), m.id).run();

  let amount = 0, needShip = false;
  const resolved = [];
  const seenSku = new Set();
  const seenSetKeys = new Set();
  const lineCountByProduct = {};
  for (const it of items) {
    let qty = Math.max(1, Math.min(10, parseInt(it.qty || 1, 10)));
    const p = await c.env.DB.prepare("SELECT * FROM products WHERE sku=? AND status='active'").bind(String(it.sku || "")).first();
    if (!p) return c.json({ error: `판매 중이 아닌 상품입니다: ${it.sku}` }, 400);
    // 소장판, 전체권: 수량>1 = 이중 청구인데 멱등 id 로 권리는 한 세트만 남는다 (Codex r1 #6)
    // lecture_common 도 1개만: 권리 한 행이 범위 전부라 수량은 이중 청구일 뿐이다 (GS-8e)
    if ((p.type === "digital_file" || p.type === "bundle_view" || p.type === "bundle_file" || p.type === "lecture_common") && qty !== 1)
      return c.json({ error: `이 상품은 1개만 구매할 수 있습니다: ${p.title}` }, 400);
    // 지문 낱권 세트 결속 (PLAN s30 1-B): set_id 필수 + Global 5 정규식. 세트 5회 응시가 상품
    // 단위라 qty 는 1로 강제한다(다세트는 줄을 나눠 담는다). 그 밖 상품에 set_id 는 거부.
    let setId = null;
    if (p.sku === "passage-single") {
      qty = 1;
      const raw = it.set_id;
      if (typeof raw !== "string" || !SET_ID_RE.test(raw)) return c.json({ error: "지문을 선택해 주세요" }, 400);
      setId = raw;
      const key = `${p.sku}:${setId}`;
      if (seenSetKeys.has(key)) return c.json({ error: `같은 상품이 두 번 담겼습니다, 수량으로 담아 주세요: ${p.title}` }, 400);
      seenSetKeys.add(key);
    } else {
      if (it.set_id !== undefined && it.set_id !== null && it.set_id !== "")
        return c.json({ error: "세트 지정은 지문 낱권만 가능합니다" }, 400);
      // 같은 상품 중복 줄은 전 유형 거부 (r2 B4), 권리 id 가 (주문, 상품, q) 결정론이라 두 줄이 같은
      // q 범위를 생성해 청구 수량보다 적게 지급되고, 회수 후보도 한 줄 분에 갇힌다. 수량은 qty 로.
      if (seenSku.has(p.sku)) return c.json({ error: `같은 상품이 두 번 담겼습니다, 수량으로 담아 주세요: ${p.title}` }, 400);
      seenSku.add(p.sku);
    }
    // 한 주문 안 같은 상품 총 줄수 상한 10, 부분취소 회수 후보 q 0~9 정합 (PLAN s30 1-B)
    lineCountByProduct[p.id] = (lineCountByProduct[p.id] || 0) + 1;
    if (lineCountByProduct[p.id] > 10) return c.json({ error: `같은 상품이 너무 많이 담겼습니다: ${p.title}` }, 400);
    if (p.stock !== null && p.stock < qty) return c.json({ error: `재고가 부족합니다: ${p.title}` }, 409);
    amount += p.price * qty;
    if (p.requires_shipping) needShip = true;
    resolved.push({ product_id: p.id, title: p.title, unit_price: p.price, qty,
      type: p.type, sku: p.sku, file_key: p.file_key || null, school: p.school || null, set_id: setId });
  }
  // 지급 문장 예산 (Codex r2 #13): 이 주문이 grantEntitlements 에서 만들 문장 수를 같은 산식(lineStmtCount)
  // 으로 미리 세고, D1 batch 한도 몫(GRANT_STMT_MAX)을 넘으면 결제 전에 거절한다.
  // 승인 뒤에 넘으면 결제는 paid 인데 지급과 모든 치유 재시도가 계속 실패한다.
  const stmtBudget = await orderStmtBudget(c.env.DB, resolved);
  if (stmtBudget > GRANT_STMT_MAX)
    return c.json({ error: "한 번에 주문할 수 있는 수량을 넘었습니다" }, 400);

  let shipFee = 0;
  if (needShip) {
    const s = b.shipping || {};
    if (!s.name || !s.phone || !s.addr1 || !s.zip)
      return c.json({ error: "배송지 정보를 입력해 주세요" }, 400);
    shipFee = amount >= SHIP_FREE_OVER ? 0 : SHIP_FEE;
    amount += shipFee;
  }

  const id = uid("ord");
  const now = nowISO();
  const s = b.shipping || {};
  await c.env.DB.prepare(
    `INSERT INTO orders(id,member_id,amount,status,ship_name,ship_phone,ship_zip,ship_addr1,ship_addr2,memo,created_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, m.id, amount, "pending",
    needShip ? String(s.name).slice(0, 40) : null,
    needShip ? String(s.phone).replace(/-/g, "").slice(0, 15) : null,
    needShip ? String(s.zip).slice(0, 8) : null,
    needShip ? String(s.addr1).slice(0, 120) : null,
    needShip ? String(s.addr2 || "").slice(0, 120) : null,
    String(b.memo || "").slice(0, 200), now).run();
  for (const r of resolved)
    await c.env.DB.prepare("INSERT INTO order_items(order_id,product_id,title,unit_price,qty,type,sku,file_key,school,set_id) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .bind(id, r.product_id, r.title, r.unit_price, r.qty, r.type, r.sku, r.file_key, r.school, r.set_id).run();

  const orderName = resolved.length === 1 ? resolved[0].title : `${resolved[0].title} 외 ${resolved.length - 1}건`;
  // r3 REQ1: 품목별 단가를 함께 반환, 클라이언트가 총액만이 아니라 품목 단위로 표시가를 대조한다
  return c.json({ orderId: id, amount, orderName, shipFee,
    items: resolved.map((r) => ({ sku: r.sku, unit_price: r.unit_price, qty: r.qty })) }, 201);
}));

// 결제 승인, successUrl 페이지가 호출. 멱등: 이미 paid + 동일 paymentKey 면 ok
pay.post("/payments/confirm", requireMember(async (c) => {
  const m = c.get("member");
  const b = await c.req.json().catch(() => ({}));
  const { paymentKey, orderId } = b;
  // 금액은 선택값이다. 포트원 결제창은 복귀 주소에 금액을 싣지 않고, 승인은 어차피 DB 금액으로만 한다.
  // 값이 왔으면 대조에 쓰고(토스 경로 종전 동작), 안 왔으면 대조를 건너뛴다. 엄격 정수 검증은 유지
  // "22000x", 22000.9 를 수용하면 대조가 무력해진다 (Codex 2차 #4).
  const hasAmount = b.amount !== undefined && b.amount !== null;
  const amount = hasAmount ? b.amount : null;
  if (typeof orderId !== "string" || !orderId) return c.json({ error: "필수 값이 없거나 형식이 올바르지 않습니다" }, 400);
  if (hasAmount && (!Number.isInteger(amount) || amount <= 0))
    return c.json({ error: "필수 값이 없거나 형식이 올바르지 않습니다" }, 400);
  // 토스는 결제 식별자를 클라이언트가 들고 온다. 포트원은 주문번호가 곧 결제 식별자라 없어도 된다.
  if (pgName(c.env) === "toss" && (typeof paymentKey !== "string" || !paymentKey))
    return c.json({ error: "필수 값이 없거나 형식이 올바르지 않습니다" }, 400);
  const ref = typeof paymentKey === "string" && paymentKey ? paymentKey : orderId;

  const order = await c.env.DB.prepare("SELECT * FROM orders WHERE id=? AND member_id=?").bind(orderId, m.id).first();
  if (!order) return c.json({ error: "주문을 찾을 수 없습니다" }, 404);
  // ORDER BY id: q 오프셋과 set_id 결속이 삽입 순서에 결정론으로 묶이게 (round2 리뷰 ⚠️)
  const items = (await c.env.DB.prepare("SELECT * FROM order_items WHERE order_id=? ORDER BY id").bind(orderId).all()).results;

  // 재방문 멱등 판정, 클라이언트가 결제 식별자를 들고 왔을 때만 그것까지 대조한다.
  // 토스는 복귀 주소에 paymentKey 를 실어 주므로 종전대로 대조하고(다른 결제건을 든 stale 탭 차단),
  // 포트원은 식별자 없이 돌아올 수 있어 위 조회의 소유자 조건(id AND member_id)이 그 자리를 대신한다.
  // 저장된 payment_key 는 결제사가 준 참조(토스 paymentKey / 포트원 transactionId)라
  // 클라이언트가 보낸 값과 다른 이름일 수 있어 ref 와 원본 둘 다 허용한다.
  const sameRef = (pk) => !paymentKey || pk === ref || pk === paymentKey;
  if (order.status === "paid") {
    if (sameRef(order.payment_key)) {
      await grantEntitlements(c.env.DB, order, items); // 장애 복구: 멱등 재부여 (Codex 2차 #2)
      return c.json({ ok: true, status: "paid", amount: order.amount, receipt: order.receipt_url || null });
    }
    return c.json({ error: "이미 결제된 주문입니다" }, 409);
  }
  // 가상계좌 발급 후 성공 페이지 재방문 = 같은 안내 재반환 (입금 확정은 웹훅 몫)
  if (order.status === "waiting_deposit" && sameRef(order.payment_key))
    return c.json({ ok: true, status: "waiting_deposit", amount: order.amount });
  if (order.status !== "pending") return c.json({ error: `승인 불가 상태입니다: ${order.status}` }, 409);
  // 금액 불일치 = 요청 거부만, 주문 상태는 건드리지 않음 (Codex 2차 #5: stale 탭이 주문을 죽이는 사고 차단)
  if (hasAmount && order.amount !== amount) return c.json({ error: "결제 금액이 주문 금액과 다릅니다" }, 400);

  const adapter = pg(c.env);
  // 조회 검증, 상태만이 아니라 주문, 금액, 결제참조 3중 대조 (Codex 2차 #6)
  // status 는 호출부에서 판정 (DONE 승인 확인 / PARTIAL_CANCELED pending 고착 방지, Codex r4 NEW-B1 T2)
  const verifyByQuery = async () => {
    const qd = await adapter.getByOrder(c.env, orderId);
    if (qd && qd.orderId === orderId && qd.amount === order.amount
        && (!qd.ref || !paymentKey || qd.ref === paymentKey)) return qd;
    return null;
  };

  let out, data;
  try {
    out = await adapter.confirm(c.env, { ref, orderId, amount: order.amount }); // 금액은 DB 값만 (Codex 2차 #4)
  } catch (e) {
    out = { ok: false, httpStatus: 0, code: "NETWORK", message: null, data: null };
  }
  if (!out.ok && out.httpStatus === 0) {   // 연결 자체가 끊긴 경우만 재조회로 구한다
    const qd = await verifyByQuery();
    if (qd && qd.status === "DONE") out = { ok: true, httpStatus: 200, code: null, message: null, data: qd };
    else return c.json({ error: "승인 확인 중입니다. 잠시 후 주문 내역을 확인해 주세요" }, 502);
  }
  data = out.data || {};
  await c.env.DB.prepare("INSERT INTO webhook_logs(provider,event,order_id,payload,ts) VALUES(?,'confirm',?,?,?)")
    .bind(adapter.name, orderId, JSON.stringify({ status: out.httpStatus, code: out.code || null }), nowISO()).run();

  if (!out.ok) {
    if (out.httpStatus >= 500 || out.httpStatus === 429) // 일시 장애 = pending 유지 (Codex 2차 #5)
      return c.json({ error: "결제사 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요" }, 502);
    if (out.code === "ALREADY_PROCESSED_PAYMENT") {
      const qd = await verifyByQuery();
      if (qd && qd.status === "DONE") { out = { ok: true, httpStatus: 200 }; data = qd; }
      // 재조회가 PARTIAL_CANCELED = 결제(입금) 자체는 완료된 사실, pending 을 failed 로 굳히면
      // 웹훅의 partial_canceled 복구 경로가 막힌다 (Codex r4 NEW-B1 T2). pending 유지, fail_reason 미기록.
      else if (qd && qd.status === "PARTIAL_CANCELED")
        return c.json({ error: "이미 처리된 결제입니다, 상태 확인 중입니다", code: out.code }, 409);
    }
    if (!out.ok) {
      await c.env.DB.prepare("UPDATE orders SET status='failed', fail_reason=? WHERE id=? AND status='pending'")
        .bind(`${out.code || out.httpStatus}: ${out.message || ""}`.slice(0, 200), orderId).run();
      return c.json({ error: out.message || "결제 승인에 실패했습니다", code: out.code }, 402);
    }
  }

  // T-2 status 게이트 (2026-08-27), confirm 200 이라도 paid 전환은 status DONE 만.
  // 가상계좌는 WAITING_FOR_DEPOSIT 로 200 이 와서, 이 게이트가 없으면 입금 전에 권리가 지급된다.
  if (data.status !== "DONE") {
    if (data.status === "WAITING_FOR_DEPOSIT") {
      const updVA = await c.env.DB.prepare(
        "UPDATE orders SET status='waiting_deposit', payment_key=?, pg_provider=?, method=? WHERE id=? AND status='pending'"
      ).bind(data.ref || ref, adapter.name, data.method || null, orderId).run();
      const va = data.virtualAccount || {};
      if (updVA.meta.changes > 0) // 승자 탭만 (재방문 재발송 차단)
        notify(c, TPL.VACCOUNT, m.phone, {
          이름: m.name || "회원", 주문번호: order.id, 상품명: orderName(items),
          은행: bankName(va.bankCode), 계좌번호: va.accountNumber || "", 결제금액: fmtWon(order.amount),
          입금기한: fmtDue(va.dueDate),
        }, order.id);
      return c.json({ ok: true, status: "waiting_deposit", amount: order.amount,
        vaccount: { bank: va.bankCode || null, accountNumber: va.accountNumber || null, dueDate: va.dueDate || null } });
    }
    // 그 밖의 미확정 상태 = pending 유지 (웹훅, 재시도가 확정)
    return c.json({ error: `승인 상태가 확정되지 않았습니다: ${data.status || "unknown"}` }, 409);
  }

  const freeze = await bundleFreezeStmt(c.env.DB, orderId, items);   // 결제 시점 전개 목록 박제 (r3 B3), 전이와 원자
  const updRs = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE orders SET status='paid', payment_key=?, pg_provider=?, method=?, receipt_url=?, paid_at=? WHERE id=? AND status='pending'"
    ).bind(data.ref || ref, adapter.name, data.method || null, data.receiptUrl || null, nowISO(), orderId),
    ...(freeze ? [freeze] : []),
  ]);
  const upd = updRs[0];
  // 승자 탭만 재고 차감 (Codex 2차 #1: 이중 실행 차단), 권한부여는 멱등이라 양쪽 다 안전
  if (upd.meta.changes > 0) {
    for (const it of items)
      await c.env.DB.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock IS NOT NULL").bind(it.qty, it.product_id).run();
    // T2/T3 결제 완료, 실물 포함 여부는 주문의 배송지 유무로 판정 (needShip 일 때만 ship_* 저장)
    const physical = !!order.ship_name;
    notify(c, physical ? TPL.PAY_PHYSICAL : TPL.PAY_DIGITAL, physical ? (order.ship_phone || m.phone) : m.phone, {
      이름: m.name || "회원", 주문번호: order.id, 상품명: orderName(items), 결제금액: fmtWon(order.amount),
    }, order.id);
  }
  await grantEntitlements(c.env.DB, order, items);
  return c.json({ ok: true, status: "paid", amount: order.amount, receipt: data.receiptUrl || null });
}));

// 결제 웹훅, payload 불신, 결제사에 재조회한 원문으로만 반영
pay.post("/payments/webhook", async (c) => {
  // 서명 검증은 원문 바이트로 한다, 파싱 후 재직렬화하면 바이트가 달라져 서명이 깨진다
  const rawBody = await c.req.text().catch(() => "");
  let b = {};
  try { b = JSON.parse(rawBody); } catch {}
  const adapter = pg(c.env);
  const hook = await adapter.parseWebhook(c.env, { headers: c.req.raw.headers, rawBody, json: b });
  await c.env.DB.prepare("INSERT INTO webhook_logs(provider,event,order_id,payload,ts) VALUES(?,?,?,?,?)")
    .bind(adapter.name, hook.eventType, hook.orderId, rawBody.slice(0, 4000), nowISO()).run();
  // 서명 스킴이 있는 결제사에서 검증 실패 = 위조 가능. 재조회조차 하지 않고 끊는다.
  // (토스는 서명 스킴이 없어 verifiable=false, 종전대로 재조회가 검증을 대신한다)
  if (hook.verifiable && !hook.verified) return c.json({ error: "서명 검증 실패" }, 401);
  if (!hook.ref && !hook.orderId) return c.json({ ok: true });

  const p = await adapter.getByRef(c.env, hook.ref, { orderId: hook.orderId });
  if (!p) return c.json({ ok: true }); // 조회 실패 = 무시 (로그만)
  // 가상계좌 입금 확정 (T-2 짝), confirm 은 waiting_deposit 까지만, paid 전환은 여기서.
  // 재조회 원문으로 주문, 금액, 키 3중 대조 후 승자 탭만 재고 차감, 권한부여는 멱등.
  if (p.status === "DONE") {
    const order = await c.env.DB.prepare("SELECT * FROM orders WHERE id=?").bind(p.orderId || "").first();
    if (order && p.amount === order.amount && (!order.payment_key || order.payment_key === p.ref)) {
      // ORDER BY id: q 오프셋과 set_id 결속이 삽입 순서에 결정론으로 묶이게 (round2 리뷰 ⚠️)
      const items = (await c.env.DB.prepare("SELECT * FROM order_items WHERE order_id=? ORDER BY id").bind(order.id).all()).results;
      const freeze = await bundleFreezeStmt(c.env.DB, order.id, items);   // 결제 시점 전개 목록 박제 (r3 B3)
      const updRs = await c.env.DB.batch([
        c.env.DB.prepare(
          "UPDATE orders SET status='paid', payment_key=?, pg_provider=?, method=?, receipt_url=?, paid_at=? WHERE id=? AND status IN ('pending','waiting_deposit')"
        ).bind(p.ref, adapter.name, p.method || null, p.receiptUrl || null, nowISO(), order.id),
        ...(freeze ? [freeze] : []),
      ]);
      const upd = updRs[0];
      // 지급은 승자 가드 밖, paid 전환 직후 죽으면 재전송 웹훅이 changes=0 이라 영구 미지급이 남는다 (Codex r1 #5). 멱등이라 재부여 안전.
      // partial_canceled 도 치유 대상, paid 직후 지급 전 장애에 부분취소가 끼면 미취소 품목이 영구 미지급으로 남는다
      // (Codex 후속 r1 #8). 회수분은 grantEntitlements 의 원장 가드가 막는다. canceled(전액)만 재지급 금지.
      if (upd.meta.changes > 0 || order.status === "paid" || order.status === "partial_canceled")
        await grantEntitlements(c.env.DB, order, items);
      if (upd.meta.changes > 0) {
        for (const it of items)
          await c.env.DB.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock IS NOT NULL").bind(it.qty, it.product_id).run();
        // 웹훅에는 세션이 없다, 수신자는 회원 행에서. 직전 상태가 입금 대기였으면 T5, 아니면 T2/T3.
        const mem = await c.env.DB.prepare("SELECT name, phone FROM members WHERE id=?").bind(order.member_id).first();
        const physical = !!order.ship_name;
        const code = order.status === "waiting_deposit" ? TPL.DEPOSIT : (physical ? TPL.PAY_PHYSICAL : TPL.PAY_DIGITAL);
        notify(c, code, physical ? (order.ship_phone || mem?.phone) : mem?.phone, {
          이름: mem?.name || "회원", 주문번호: order.id, 상품명: orderName(items), 결제금액: fmtWon(order.amount),
        }, order.id);
      }
    }
  }
  // READER-FOLLOWUP 2 (2026-08-30): 부분취소 = 품목별 회수. 종전엔 PARTIAL_CANCELED 도 주문 전체 권리를 지웠다.
  if (p.status === "PARTIAL_CANCELED") {
    const order = await c.env.DB.prepare("SELECT * FROM orders WHERE id=?").bind(p.orderId || "").first();
    // r3 B1: 금액 대조를 분기 진입 조건으로, 이 주문 금액과 다른 결제 응답은 상태, 취소원장, 권리에 아무 변이도 남기지 못한다
    if (order && p.amount === order.amount && (!order.payment_key || order.payment_key === p.ref)) {
      // ORDER BY id: q 오프셋과 set_id 결속이 삽입 순서에 결정론으로 묶이게 (round2 리뷰 ⚠️)
      const items = (await c.env.DB.prepare("SELECT * FROM order_items WHERE order_id=? ORDER BY id").bind(order.id).all()).results;
      // r3 B2: D1 이 waiting_deposit 인데 토스가 DONE→PARTIAL 까지 진행한 첫 웹훅, 입금 확정을 여기서 흡수.
      // 토스 응답이 PARTIAL_CANCELED 라는 것 자체가 결제(입금)가 완료됐다는 뜻이다. 전이 승자만 재고 차감.
      const freeze = await bundleFreezeStmt(c.env.DB, order.id, items);
      const updRs = await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE orders SET status='partial_canceled', payment_key=COALESCE(payment_key,?), pg_provider=COALESCE(pg_provider,?),
             method=COALESCE(method,?), receipt_url=COALESCE(receipt_url,?), paid_at=COALESCE(paid_at,?)
           WHERE id=? AND status IN ('pending','paid','partial_canceled','waiting_deposit')`
        ).bind(p.ref, adapter.name, p.method || null, p.receiptUrl || null, nowISO(), order.id),
        ...(freeze ? [freeze] : []),
      ]);
      if ((order.status === "waiting_deposit" || order.status === "pending") && updRs[0].meta.changes > 0)
        for (const it of items)
          await c.env.DB.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock IS NOT NULL").bind(it.qty, it.product_id).run();
      // 배송비 = 주문 금액 - 품목 합 (Codex 후속 r1 #7). 유사 품목으로 조합 탐색에 참여한다.
      const shipFee = order.amount - items.reduce((s, x) => s + x.unit_price * x.qty, 0);
      // 1) 취소 트랜잭션 멱등 적재, 재전송 웹훅과 누적 cancels 배열의 기처리분은 changes=0.
      //    적재(점유)와 처리를 분리한다: 처리 완료는 matched=1 이 배타 표식이고, 점유만 하고 죽은 행은
      //    아래 재평가 루프가 다음 웹훅에서 재처리한다 (Codex 후속 r1 #2, 점유가 재시도를 봉쇄하던 결함)
      let freshAmount = 0;
      for (const cx of (Array.isArray(p.cancels) ? p.cancels : [])) {
        if (!cx || !cx.transactionKey) continue;
        const ins = await c.env.DB.prepare(
          "INSERT OR IGNORE INTO order_cancellations(order_id,transaction_key,amount,reason,canceled_at,ts) VALUES(?,?,?,?,?,?)"
        ).bind(order.id, String(cx.transactionKey), cx.cancelAmount | 0, cx.cancelReason || null, cx.canceledAt || null, nowISO()).run();
        if (ins.meta.changes > 0) freshAmount += cx.cancelAmount | 0;
      }
      // 2) 미완(matched=0) 원장 전건 재평가, 진행이 멈출 때까지. 다의성으로 미뤄진 취소도 이후 취소가
      //    잔량을 바꿔 유일해지면 여기서 해소된다 (Codex 후속 r1 #5). 수동 대사 완료(품목 행 존재) 행은 승격만.
      let unmatched = false, progress = true;
      while (progress) {
        progress = false; unmatched = false;
        const pend = (await c.env.DB.prepare(
          "SELECT id, amount FROM order_cancellations WHERE order_id=? AND matched=0 ORDER BY id"
        ).bind(order.id).all()).results;
        for (const row of pend) {
          const manual = await c.env.DB.prepare(
            "SELECT 1 AS x FROM order_cancellation_items WHERE cancellation_id=? LIMIT 1").bind(row.id).first();
          if (manual) {
            await c.env.DB.prepare("UPDATE order_cancellations SET matched=1 WHERE id=?").bind(row.id).run();
            progress = true; continue;
          }
          const revoked = {};
          for (const r of (await c.env.DB.prepare(
            "SELECT product_id, SUM(units) s FROM order_cancellation_items WHERE order_id=? GROUP BY 1"
          ).bind(order.id).all()).results) revoked[r.product_id] = r.s;
          const mapping = matchCancelUnits(items, revoked, row.amount, shipFee);
          if (mapping) { await revokeUnits(c.env.DB, order, mapping, row.id, items); progress = true; }
          else unmatched = true;
        }
      }
      if (unmatched) {
        // 미매핑 잔존 = 항상 감사 대상. 적재 후 크래시 재전송(freshAmount=0)도 놓치지 않되,
        // 같은 미결 집합의 재전송은 detail 동일성으로 중복 기록하지 않는다 (r2 R2)
        const pendIds = (await c.env.DB.prepare(
          "SELECT id FROM order_cancellations WHERE order_id=? AND matched=0 ORDER BY id"
        ).bind(order.id).all()).results.map((r) => r.id);
        const detail = JSON.stringify({ note: "부분취소 금액이 품목 조합과 매핑되지 않음, 수동 대사 필요", cancellations: pendIds });
        await c.env.DB.prepare(
          `INSERT INTO admin_audit(actor,action,target,detail,ts)
           SELECT 'webhook','cancel.unmatched',?1,?2,?3
           WHERE NOT EXISTS (SELECT 1 FROM admin_audit WHERE action='cancel.unmatched' AND target=?1 AND detail=?2)`
        ).bind(order.id, detail, nowISO()).run();
      }
      // r2 B3: paid 전환 직후 지급 전 장애에 부분취소가 끼면 토스 상태가 PARTIAL_CANCELED 로 고정되어
      // DONE 재전송이 다시 오지 않는다, 여기서도 잔여(미회수) 품목을 멱등 치유 지급한다.
      // 회수분은 원장 가드, 전액취소, 미결제 주문은 상태 가드가 막는다. 금액 3중 대조 후에만.
      await grantEntitlements(c.env.DB, order, items);   // 금액 대조는 분기 진입 조건 (r3 B1). 회수분은 원장 가드, 미결제는 상태 가드가 막는다
      if (freshAmount > 0) { // 신규 취소분이 있는 웹훅만 발송 (재전송 무발송)
        const mem = await c.env.DB.prepare("SELECT name, phone FROM members WHERE id=?").bind(order.member_id).first();
        notify(c, TPL.CANCEL, mem?.phone, {
          이름: mem?.name || "회원", 주문번호: order.id, 상품명: orderName(items), 환불금액: fmtWon(freshAmount),
        }, order.id);
      }
    }
  }
  if (p.status === "CANCELED") {
    const updC = await c.env.DB.prepare("UPDATE orders SET status='canceled' WHERE id=? AND status IN ('paid','pending','waiting_deposit','partial_canceled')").bind(p.orderId).run();
    // 묘비 박제 후 삭제 (한 batch), 이용권 종료 시각이 사라지면 인쇄 3년, 소장 5년(종료 후) 보존을 지킬 수 없다 (Codex 후속 r1 #17)
    // 묘비는 추적 소비처가 있는 권리종만 (r2 R3)
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO entitlement_revocations(member_id,file_key,kind,revoked_at)
         SELECT member_id, json_extract(meta,'$.file_key'), kind, ? FROM entitlements
         WHERE order_id=? AND kind IN ('download','file_download') AND json_valid(meta) AND json_extract(meta,'$.file_key') IS NOT NULL`
      ).bind(nowISO(), p.orderId),
      c.env.DB.prepare("DELETE FROM entitlements WHERE order_id=?").bind(p.orderId),
    ]);
    if (updC.meta.changes > 0) { // T6, 상태가 실제로 전이된 첫 웹훅만
      const order = await c.env.DB.prepare("SELECT * FROM orders WHERE id=?").bind(p.orderId).first();
      if (order) {
        const mem = await c.env.DB.prepare("SELECT name, phone FROM members WHERE id=?").bind(order.member_id).first();
        const items = (await c.env.DB.prepare("SELECT title FROM order_items WHERE order_id=?").bind(order.id).all()).results;
        // 환불 금액 = 토스 재조회 원문의 취소 합계 (부분취소 대응), 없으면 주문 금액
        const refund = Array.isArray(p.cancels) ? p.cancels.reduce((s, x) => s + (x.cancelAmount || 0), 0) : order.amount;
        notify(c, TPL.CANCEL, mem?.phone, {
          이름: mem?.name || "회원", 주문번호: order.id, 상품명: orderName(items), 환불금액: fmtWon(refund || order.amount),
        }, order.id);
      }
    }
  }
  return c.json({ ok: true });
});

// 내 주문
pay.get("/orders", requireMember(async (c) => {
  const m = c.get("member");
  const rows = (await c.env.DB.prepare(
    "SELECT id, amount, status, created_at, paid_at, receipt_url FROM orders WHERE member_id=? ORDER BY created_at DESC LIMIT 50"
  ).bind(m.id).all()).results;
  for (const r of rows)
    r.items = (await c.env.DB.prepare("SELECT title, unit_price, qty FROM order_items WHERE order_id=?").bind(r.id).all()).results;
  return c.json({ orders: rows });
}));
