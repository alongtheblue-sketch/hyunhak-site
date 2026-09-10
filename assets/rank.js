/* 면접 스튜디오 순위표 (2026-09-07). 원천 = /api/studio/ranking 하나(실응시 원장 집계, 가공 인원 0).
   studio.html 의 순위표(#ranking[data-rank-board] + 응시 현황 [data-rank-summary]) 와 index.html 위젯(#rankWidget[data-rank-widget]) 을 그린다.
   별명은 서버 값 그대로, masked 행만 종전 가린 이름을 보인다. 세트 제목과 난이도는 assets/data/sets.json 에서 붙인다. 표시 상태 3가지:
   응시 0 = "아직 응시 기록이 없습니다" / 채점 10명 미만 = 분포 숨김 + "집계 중" / 공개 회원 0 = 행 없음 문구. 숫자 0 을 크게 박지 않는다. */
(function () {
  if (!window.HH) return;
  const API = HH.API;
  const UNITS = ["yonsei-hum", "yonsei-sci", "korea-hum", "korea-sci"];
  const DIFF_ORDER = ["최상", "상", "중", "하"];
  const DIST_MIN = 10, GROUP_TOP = { set: 5, difficulty: 10 };
  // 응시가 하나도 없으면 세 뿌리 모두 숨긴다. 0 을 크게 박지 않는다는 규칙은 여기 한 곳에만 적는다
  // (2026-09-08 라이브 실측 = 전 단위 takers 0. 위젯만 지키고 순위표·응시 현황은 안 지키던 비대칭을 닫았다)
  function totalTakers(data) { return UNITS.reduce((t, u) => t + n(((data.units || {})[u] || {}).takers), 0); }
  const rel = (function () { const m = location.pathname.match(/\/guidebook\/|\/lectures\/|\/programs\//); return m ? "../" : ""; })();

  async function loadRanking() {
    try { const r = await fetch(API + "/api/studio/ranking"); if (!r.ok) return null; return await r.json(); } catch { return null; }
  }
  async function loadSets() {
    try {
      const r = await fetch(rel + "assets/data/sets.json"); const d = await r.json(); const m = {};
      (d.units || []).forEach((u) => (u.sets || []).forEach((s) => { m[s.id] = { n: s.n, title: s.title, difficulty: s.difficulty, unit: u.code }; }));
      return m;
    } catch { return {}; }
  }
  const codeOf = (id) => { const k = /([hsi])(\d{2})$/.exec(String(id || "")); return k ? k[1] + k[2] : "–"; };
  const dateOf = (at) => (typeof at === "string" && /^\d{4}-\d{2}-\d{2}/.test(at)) ? at.slice(0, 10).replace(/-/g, ".") : "";
  const n = (v) => HH.intIn(v, 0, 100000000, 0);
  const fmt = (v) => n(v).toLocaleString("ko-KR");

  // ── 위젯 (홈) ──
  function renderWidget(root, data) {
    UNITS.forEach((u) => {
      const x = data.units[u]; if (!x) return;
      const box = root.querySelector('[data-unit="' + u + '"]'); if (!box) return;
      const t = box.querySelector("[data-rank-takers]");
      if (t) { const wrap = t.parentElement; if (n(x.takers) === 0 && wrap) wrap.textContent = "기록 없음"; else t.textContent = fmt(x.takers); }
      const top = box.querySelector("[data-rank-top]");
      if (top) { const b = top.querySelector("b"); if (x.rows && x.rows.length && b) { b.textContent = n(x.rows[0].score); top.hidden = false; } else top.hidden = true; }
    });
    root.hidden = totalTakers(data) === 0;
  }

  // ── 순위표 (스튜디오) ──
  function renderSummary(root, data) {
    UNITS.forEach((u) => {
      const x = data.units[u]; const box = root.querySelector('[data-unit="' + u + '"]'); if (!x || !box) return;
      const t = box.querySelector("[data-rank-takers]"); if (!t) return;
      const b = t.closest("b") || t;
      let none = box.querySelector(".none");
      if (n(x.takers) === 0) {
        b.classList.add("sr");
        if (!none) { none = document.createElement("span"); none.className = "none"; none.textContent = "아직 기록 없음"; box.appendChild(none); }
      } else { b.classList.remove("sr"); if (none) none.remove(); t.textContent = fmt(x.takers); }
    });
  }
  const LV = ["하", "중", "상", "최상"];
  // 卷二 지문 목록과 같은 난이도 배지 (studio.html lvHtml 과 같은 마크업)
  function lvNode(d) {
    const k = Math.max(0, LV.indexOf(d));
    const span = document.createElement("span"); span.className = "lv" + (d === "최상" ? " top" : "");
    const i = document.createElement("i"); i.setAttribute("aria-hidden", "true");
    for (let j = 0; j < 4; j++) { const b = document.createElement("b"); if (j <= k) b.className = "f"; i.appendChild(b); }
    span.appendChild(i); span.appendChild(document.createTextNode(d));
    return span;
  }
  const kstStamp = (iso) => { const t = Date.parse(iso || ""); if (Number.isNaN(t)) return ""; const d = new Date(t + 9 * 3600 * 1000); const z = (v) => String(v).padStart(2, "0"); return d.getUTCFullYear() + "." + z(d.getUTCMonth() + 1) + "." + z(d.getUTCDate()) + " " + z(d.getUTCHours()) + ":" + z(d.getUTCMinutes()) + " 집계"; };
  function groupRows(rows, view, sets, unknownLabel) {
    if (view === "set") {
      const g = new Map();
      rows.forEach((r) => { const c = codeOf(r.set_id); if (!g.has(c)) g.set(c, { key: c, n: (sets[r.set_id] || {}).n || 99, title: (sets[r.set_id] || {}).title || "", diff: (sets[r.set_id] || {}).difficulty || "", rows: [] }); g.get(c).rows.push(r); });
      return [...g.values()].sort((a, b) => a.n - b.n).map((x) => ({ label: x.key + (x.title ? " " + x.title : "") + (x.diff ? " (" + x.diff + ")" : ""), rows: x.rows.slice(0, GROUP_TOP.set) }));
    }
    if (view === "difficulty") {
      const groups = DIFF_ORDER.map((d) => ({ label: "난이도 " + d, rows: rows.filter((r) => (sets[r.set_id] || {}).difficulty === d).slice(0, GROUP_TOP.difficulty) })).filter((g) => g.rows.length);
      const unknown = rows.filter(r => !DIFF_ORDER.includes((sets[r.set_id] || {}).difficulty));
      if (unknown.length) groups.push({ label: unknownLabel, rows: unknown.slice(0, GROUP_TOP.difficulty) });
      return groups;
    }
    return [{ label: null, rows }];
  }
  function fillRow(tr, r, sets, maskedLabel) {
    const s = sets[r.set_id] || {};
    const put = (k, v) => { const c = tr.querySelector('[data-c="' + k + '"]'); if (c) c.textContent = v; };
    put("rank", n(r.rank)); put("name", String(r.name || "회원")); put("score", n(r.score));
    if (r.masked === true) tr.title = maskedLabel;
    else tr.removeAttribute("title");
    put("set", codeOf(r.set_id)); put("at", dateOf(r.at));
    const setCell = tr.querySelector('[data-c="set"]'); if (setCell && s.title) setCell.title = s.title;
    const dc = tr.querySelector('[data-c="diff"]');
    if (dc) { dc.textContent = ""; if (s.difficulty) { dc.appendChild(lvNode(s.difficulty)); dc.dataset.diff = s.difficulty; } else dc.textContent = "–"; }
  }
  function renderBoard(root, data, sets, unit, view) {
    const x = data.units[unit]; if (!x) return;
    root.querySelectorAll("[data-rank-tabs] [data-unit]").forEach((b) => {
      b.setAttribute("aria-selected", b.dataset.unit === unit ? "true" : "false");
      b.tabIndex = b.dataset.unit === unit ? 0 : -1;
      b.setAttribute("aria-controls", "rp-" + unit);
      const cnt = b.querySelector("span"); const xu = data.units[b.dataset.unit];
      if (cnt && xu) cnt.textContent = n(xu.takers) ? fmt(xu.takers) : "–";
    });
    const panel = root.querySelector("[role=tabpanel]");
    if (panel) { panel.dataset.unit = unit; panel.id = "rp-" + unit; panel.setAttribute("aria-labelledby", "rt-" + unit); const h = panel.querySelector("h3.sr"); if (h) h.textContent = (x.label || unit) + " 응시 현황"; }
    root.querySelectorAll("[data-rank-updated],[data-rank-generated]").forEach((el) => { el.textContent = kstStamp(data.generated_at); });
    root.querySelectorAll("[data-rank-views] [data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === view ? "true" : "false"));
    const tk = root.querySelector("[data-rank-takers]"); if (tk) tk.textContent = fmt(x.takers);
    const sc = root.querySelector("[data-rank-scored]"); if (sc) sc.textContent = fmt(x.scored);
    const note = root.querySelector("[data-rank-note]");
    const rows = Array.isArray(x.rows) ? x.rows : [];
    if (note) {
      note.hidden = false; note.classList.remove("big");
      if (n(x.takers) === 0) { note.classList.add("big"); note.textContent = "아직 응시 기록이 없습니다. 첫 응시가 채점되면 여기에 실립니다."; }
      else if (n(x.scored) < DIST_MIN && !rows.length) note.textContent = "집계 중입니다. 채점이 끝난 회원이 " + DIST_MIN + "명이 되면 점수 분포를 보이고, 순위표 공개를 켠 회원의 기록부터 순위에 실립니다.";
      else if (n(x.scored) < DIST_MIN) note.textContent = "집계 중입니다. 채점이 끝난 회원이 " + DIST_MIN + "명이 되면 점수 분포를 보입니다.";
      else if (!rows.length) note.textContent = "순위표 공개를 켠 회원의 기록부터 순위에 실립니다.";
      else note.hidden = true;
    }
    const body = root.querySelector("[data-rank-rows]"); const tplRow = root.querySelector("template[data-rank-row]"); const tplGrp = root.querySelector("template[data-rank-group]");
    if (body && tplRow) {
      body.textContent = "";
      groupRows(rows, view, sets, root.dataset.unknownDifficulty).forEach((g) => {
        if (g.label && tplGrp) { const h = tplGrp.content.cloneNode(true); const c = h.querySelector('[data-c="group"]'); if (c) c.textContent = g.label; body.appendChild(h); }
        g.rows.forEach((r) => { const tr = tplRow.content.cloneNode(true); fillRow(tr.querySelector("tr"), r, sets, root.dataset.maskedLabel); body.appendChild(tr); });
      });
      const table = body.closest("table"); if (table) table.hidden = rows.length === 0;
    }
    const dist = root.querySelector("[data-rank-dist]");
    if (dist) {
      const bins = Array.isArray(x.dist) && x.dist.length === 10 ? x.dist.map(n) : null;
      dist.hidden = !bins;
      if (bins) {
        const mx = Math.max(1, ...bins); const labels = [];
        bins.forEach((v, i) => {
          const el = dist.querySelector('[data-bin="' + i + '"]'); if (!el) return;
          el.style.setProperty("--v", Math.round((v / mx) * 100) + "%");
          el.classList.toggle("pk", v === mx && v > 0 && bins.indexOf(mx) === i);
          labels.push((i * 10) + "~" + (i === 9 ? 100 : i * 10 + 9) + "점 " + v + "명");
        });
        dist.setAttribute("aria-label", "점수 분포. " + labels.join(", "));
      }
    }
  }
  function bindBoard(root, data, sets) {
    let unit = UNITS[0], view = "all";
    const h = (location.hash || "").replace("#", "");
    const tabs = [...root.querySelectorAll("[data-rank-tabs] [data-unit]")];
    tabs.forEach((b, i) => {
      b.addEventListener("click", () => { unit = b.dataset.unit; renderBoard(root, data, sets, unit, view); });
      b.addEventListener("keydown", (e) => {
        const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
        if (next < 0) return;
        e.preventDefault(); tabs[next].focus(); tabs[next].click();
      });
    });
    root.querySelectorAll("[data-rank-views] [data-view]").forEach((b) => b.addEventListener("click", () => { view = b.dataset.view; renderBoard(root, data, sets, unit, view); }));
    renderBoard(root, data, sets, unit, view);
    root.hidden = !root.hasAttribute("data-rank-page") && totalTakers(data) === 0;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const widget = document.querySelector("[data-rank-widget]");
    const board = document.querySelector("[data-rank-board]");
    const summary = document.querySelector("[data-rank-summary]");
    if (!widget && !board && !summary) return;
    const data = await loadRanking();
    if (!data || !data.units || UNITS.some(u => !data.units[u])) {
      if (board && board.hasAttribute("data-rank-page")) {
        const note = board.querySelector("[data-rank-note]");
        note.textContent = board.dataset.failed; note.hidden = false;
        const table = board.querySelector("table"); if (table) table.hidden = true;
      }
      return;
    }
    if (widget) renderWidget(widget, data);
    if (summary) { renderSummary(summary, data); summary.hidden = totalTakers(data) === 0; }
    if (board) { const sets = await loadSets(); bindBoard(board, data, sets); }
    try { document.dispatchEvent(new CustomEvent("hh:ranking", { detail: data })); } catch (e) {}
  });
})();
