/* 현학적 연구소 인강 뷰어 — 커스텀 컨트롤(배속, 목차 점프, 책갈피), 이어보기, 시청 행동 원장(beat), 계정 워터마크.
   서버 = hyunhak-api src/lecture.js. 설계 = hyunhak-api/docs/LECTURE_VIEWER_DESIGN_20260828.md §4.
   원칙: 영상 URL 은 세션 결속 토큰 없이는 쓸모없고, 워터마크는 DOM 오버레이라 지워도 서버 원장이 남는다. */
(function () {
  "use strict";
  var API = window.HH.API;
  var $ = function (id) { return document.getElementById(id); };
  var esc = window.HH.esc;
  var view = $("view"), titleEl = $("title"), metaEl = $("meta"), crumbNow = $("crumbNow"), toastEl = $("toast"), curtain = $("curtain");
  var params = new URLSearchParams(location.search);
  var lectureId = params.get("id");
  // 목록 진입 인자 (PLAN s30 Task 5): ?unit=<단위코드> 또는 ?set=<세트 id>. set 만 오면 단위는 id 접두로 푼다
  var UNIT_OF = [[/^korea_2027_h/, "korea-hum"], [/^korea_2027_s/, "korea-sci"], [/^yonsei_2027_h/, "yonsei-hum"], [/^yonsei_2027_s/, "yonsei-sci"], [/^yonsei_intl_2027_i/, "yonsei-intl"]];
  function unitOfSet(id) { for (var i = 0; i < UNIT_OF.length; i++) if (UNIT_OF[i][0].test(String(id || ""))) return UNIT_OF[i][1]; return null; }
  var setParam = params.get("set") || null;
  var unitParam = params.get("unit") || (setParam ? unitOfSet(setParam) : null);

  var RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
  var BEAT_SEC = 15;            // 재생 중 진도 송신 주기
  var RESUME_MIN = 10;          // 이어보기 안내 최소 위치(초)
  var KINDS = { common: "공통 강의", unit: "대학별 강의", passage: "제시문 해설" };

  // ---------- 공용 ----------
  function fmt(t) {
    t = Math.max(0, Math.floor(Number(t) || 0));
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    var mm = (h ? String(m).padStart(2, "0") : String(m)), ss = String(s).padStart(2, "0");
    return h ? h + ":" + mm + ":" + ss : mm + ":" + ss;
  }
  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove("show"); }, ms || 2200);
  }
  function block(text) { curtain.textContent = text; curtain.style.display = "flex"; }
  function apiFetch(path, opt) {
    opt = opt || {};
    return fetch(API + path, Object.assign({ credentials: "include", headers: opt.body ? { "Content-Type": "application/json" } : {} }, opt))
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; }); });
  }
  function loginRedirect() {
    location.href = "login.html?next=" + encodeURIComponent("lecture.html" + location.search);
  }
  // 자동화 지문 (reader.js T14 와 동일 규칙)
  function automationSignals() {
    var s = [];
    try { if (navigator.webdriver) s.push("webdriver"); } catch (e) {}
    try { if (/headless/i.test(navigator.userAgent)) s.push("headless-ua"); } catch (e) {}
    try { if (navigator.languages && navigator.languages.length === 0) s.push("no-langs"); } catch (e) {}
    try { if (window.cdc_adoQpoasnfa76pfcZLmcfl_Array || window.__playwright || window.__puppeteer_evaluation_script__ || window.__nightmare) s.push("cdp"); } catch (e) {}
    return s;
  }
  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5v13l11-6.5z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13M16 5.5v13"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7 6 12l5 5M18 7l-5 5 5 5"/></svg>',
    fwd: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 7 5 5-5 5M6 7l5 5-5 5"/></svg>',
    vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5zM16.5 9.5l4 5M20.5 9.5l-4 5"/></svg>',
    cc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M10.5 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3"/></svg>',
    bm: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10v15l-5-3.5-5 3.5z"/></svg>',
    fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
    unfs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
    chap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
    del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4.5h6V7M8 7l.8 12.5h6.4L16 7"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16zM13 7l4 4"/></svg>',
  };

  // ================= 목록 (id 없이 진입) =================
  // 단위별 그룹(공통, 단위 강의, 세트 해설) + 준비 중 슬롯 + ?unit= ?set= 진입 + 상단 "N편 공개" 요약.
  // 공개 편수는 /api/lectures/summary 실값만 쓴다 (L-6, L-12: "포함" 단정 금지). 세트 30편은 assets/data/sets.json.
  var MIRAE = /-mirae-/;
  function num2(n) { return String(n).padStart(2, "0"); }
  function loadSets() {
    return fetch("assets/data/sets.json").then(function (r) { return r.json(); })
      .then(function (d) { return (d.units || []).filter(function (u) { return !MIRAE.test(u.sku || ""); }); })
      .catch(function () { return []; });
  }
  function summary(q) { return apiFetch("/api/lectures/summary?" + q).then(function (d) { return d._status === 200 ? d : null; }).catch(function () { return null; }); }
  function lecText(ready) { return ready > 0 ? "해설 강의 " + ready + "편 공개, 순차 업로드" : "해설 강의 공개 준비 중, 순차 업로드"; }
  function badges(l) {
    var p = l.progress, st = [];
    if (l.status !== "ready") st.push("<span>" + SLOT_TEXT + "</span>");   // COPY.md §6: 뱃지는 행 끝 하나만
    else if (!l.entitled) st.push('<span class="badge line">이용권 필요</span>');
    else if (p && p.completed) st.push('<span class="badge">완료</span>');
    if (l.duration_sec) st.push("<span>" + fmt(l.duration_sec) + "</span>");
    if (p) { st.push("<span>" + p.view_count + "회 시청</span>"); if (p.position_sec > 0 && !p.completed) st.push("<span>" + fmt(p.position_sec) + " 부터 이어보기</span>"); }
    return st.join("");
  }
  function actionOf(l, unit) {
    if (l.status === "ready" && l.entitled) {
      var p = l.progress;
      return '<a class="btn sm" href="lecture.html?id=' + encodeURIComponent(l.id) + '">' + (p && p.position_sec > 0 && !p.completed ? "이어보기" : "시청") + "</a>";
    }
    if (l.status === "ready") return '<a class="btn ghost sm" href="studio.html' + (unit ? "?unit=" + encodeURIComponent(unit) : "") + '">이용권</a>';
    return '<span class="badge mute" aria-disabled="true">준비 중</span>';   // 클릭 대상 없음, 뱃지만 (COPY.md §6)
  }
  function row(l, n, unit) {
    var p = l.progress, pct = 0;
    if (p && l.duration_sec) pct = Math.min(100, Math.round(p.position_sec / l.duration_sec * 100));
    var slot = l.status !== "ready";
    return '<div class="' + (slot ? "slot" : "row") + '"' + (slot ? ' aria-disabled="true"' : "") + '><span class="n">' + esc(n) + '</span>'
      + '<span><span class="t">' + esc(l.title) + '</span>' + (l.subtitle ? '<span class="m"><span>' + esc(l.subtitle) + '</span></span>' : "")
      + '<span class="m">' + badges(l) + "</span>"
      + (p && pct > 0 ? '<span class="prog" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' : "") + "</span>"
      + '<span class="a">' + actionOf(l, unit) + "</span></div>";
  }
  var SLOT_TEXT = "준비 중. 공개되면 추가 비용 없이 이 이용권으로 시청합니다.";   // COPY.md §6 준비 중 슬롯
  function emptySlot(set) {
    return '<div class="slot" aria-disabled="true"><span class="n">' + num2(set.n) + '</span><span><span class="t">' + esc(set.title) + '</span><span class="m"><span>' + SLOT_TEXT + '</span></span></span><span class="a"><span class="badge mute" aria-disabled="true">준비 중</span></span></div>';
  }
  function group(title, cntHtml, moreHtml, rowsHtml) {
    return '<section class="lgrp"><div class="gh"><h2>' + title + "</h2>" + (cntHtml ? '<span class="cnt">' + cntHtml + "</span>" : "") + (moreHtml ? '<span class="more">' + moreHtml + "</span>" : "") + '</div><div class="toc">' + rowsHtml + "</div></section>";
  }
  function cnt(ready, prep) { return "공개 <b>" + ready + "</b> 준비 <b>" + prep + "</b>"; }

  function renderUnitView(unit, all, units, loggedIn, pubMissing) {
    var u = units.find(function (x) { return x.code === unit; });
    var label = u ? u.label : unit;
    titleEl.textContent = label + " 해설 강의"; crumbNow.textContent = label;
    var common = all.filter(function (l) { return l.kind === "common"; });
    var unitLecs = all.filter(function (l) { return l.kind === "unit" && l.unit_code === unit; });
    var pass = all.filter(function (l) { return l.kind === "passage" && l.unit_code === unit; });
    var sets = u ? u.sets.slice() : [];
    if (setParam) {
      sets = sets.filter(function (s2) { return s2.id === setParam; });
      if (!sets.length) sets = [{ id: setParam, n: Number((setParam.match(/(\d\d)$/) || [0, 0])[1]) || 0, title: setParam }];
    }
    var readyN = pass.filter(function (l) { return l.status === "ready"; }).length;
    summary("unit=" + encodeURIComponent(unit) + "&kind=passage").then(function (sm) {
      var r = sm ? (sm.ready || 0) : readyN;
      // COPY.md §6 뷰어 상단 요약: N편 공개, 순차 업로드 + 공개 기준일(summary.as_of)을 목록 위에
      metaEl.innerHTML = '<span class="badge line">' + esc(label) + "</span><span>" + esc(lecText(r)) + "</span>"
        + (sm && sm.as_of ? '<span class="mono">공개 기준일 ' + esc(sm.as_of) + "</span>" : "")
        + (u ? "<span>단위 지문 " + u.set_count + "편</span>" : "")
        + (pubMissing ? "<span>공개 상태는 지금 확인할 수 없습니다</span>" : "")
        + (loggedIn ? "<span>시청 위치는 계정에 저장됩니다</span>" : '<span><a class="tlink" href="login.html?next=' + encodeURIComponent("lecture.html" + location.search) + '">로그인</a>하면 이용권 범위에서 시청합니다</span>');
    });
    var html = '<div class="lecl">';
    if (common.length) html += group("공통 강의", cnt(common.filter(function (l) { return l.status === "ready"; }).length, common.filter(function (l) { return l.status !== "ready"; }).length), "", common.map(function (l, i) { return row(l, num2(l.seq || i + 1), unit); }).join(""));
    if (unitLecs.length) html += group("단위 강의", cnt(unitLecs.filter(function (l) { return l.status === "ready"; }).length, unitLecs.filter(function (l) { return l.status !== "ready"; }).length), "", unitLecs.map(function (l, i) { return row(l, num2(l.seq || i + 1), unit); }).join(""));
    var rows = "", prep = 0, rdy = 0;
    sets.forEach(function (set) {
      var ls = pass.filter(function (l) { return l.passage_set_id === set.id; });
      if (!ls.length) { prep++; rows += emptySlot(set); return; }
      ls.forEach(function (l) { if (l.status === "ready") rdy++; else prep++; rows += row(l, num2(set.n), unit); });
    });
    var more = setParam ? '<a class="tlink" href="lecture.html?unit=' + encodeURIComponent(unit) + '">단위 전체 보기</a>' : '<a class="tlink" href="studio.html?unit=' + encodeURIComponent(unit) + '">지문 목록과 이용권</a>';
    html += group(setParam ? "세트 해설, 지문 1편" : "세트 해설", cnt(rdy, prep), more, rows || '<p class="note">이 단위의 세트 목록을 불러오지 못했습니다.</p>');
    view.innerHTML = html + "</div>";
  }

  function renderAllView(all, units, loggedIn) {
    titleEl.textContent = "내 강의"; crumbNow.textContent = "내 강의";
    var codes = units.map(function (u) { return u.code; });
    all.forEach(function (l) { if (l.unit_code && codes.indexOf(l.unit_code) < 0) codes.push(l.unit_code); });
    Promise.all(codes.map(function (c) { return summary("unit=" + encodeURIComponent(c) + "&kind=passage"); })).then(function (sms) {
      var any = sms.some(function (x) { return !!x; });
      var ready = sms.reduce(function (s2, x) { return s2 + ((x && x.ready) || 0); }, 0);
      var asOf = (sms.find(function (x) { return x && x.as_of; }) || {}).as_of;
      metaEl.innerHTML = "<span>" + esc(any ? lecText(ready) : "해설 강의 공개 편수는 단위 목록에서 확인") + "</span>"
        + (asOf ? '<span class="mono">공개 기준일 ' + esc(asOf) + "</span>" : "")
        + "<span>이용권 범위의 강의를 한곳에서 봅니다. 시청 위치는 계정에 저장되어 다른 기기에서도 이어집니다.</span>";
    });
    if (!all.length) {
      view.innerHTML = '<div class="notice"><h2>아직 등록된 강의가 없습니다</h2><p>강의가 공개되면 이 자리에 나타납니다. 단위별 세트 목록과 준비 중 슬롯은 아래에서 봅니다.</p><div class="acts">'
        + units.map(function (u) { return '<a class="btn ghost sm" href="lecture.html?unit=' + encodeURIComponent(u.code) + '">' + esc(u.label) + "</a>"; }).join("")
        + '<a class="btn ghost sm" href="my.html">마이페이지</a></div></div>';
      return;
    }
    var html = '<div class="lecl">';
    var common = all.filter(function (l) { return l.kind === "common"; });
    if (common.length) html += group("공통 강의", cnt(common.filter(function (l) { return l.status === "ready"; }).length, common.filter(function (l) { return l.status !== "ready"; }).length), "", common.map(function (l, i) { return row(l, num2(l.seq || i + 1), null); }).join(""));
    codes.forEach(function (c) {
      var ls = all.filter(function (l) { return l.unit_code === c; });
      var u = units.find(function (x) { return x.code === c; });
      if (!ls.length) return;
      ls.sort(function (a, b) { return (a.kind === "unit" ? 0 : 1) - (b.kind === "unit" ? 0 : 1) || (a.seq || 0) - (b.seq || 0); });
      html += group(esc(u ? u.label : c), cnt(ls.filter(function (l) { return l.status === "ready"; }).length, ls.filter(function (l) { return l.status !== "ready"; }).length),
        '<a class="tlink" href="lecture.html?unit=' + encodeURIComponent(c) + '">단위 전체 보기, 세트 ' + (u ? u.set_count : 30) + "편</a>",
        ls.map(function (l, i) { return row(l, num2(l.seq || i + 1), c); }).join(""));
    });
    var rest = units.filter(function (u) { return !all.some(function (l) { return l.unit_code === u.code; }); });
    if (rest.length) html += '<div class="units-more">' + rest.map(function (u) { return '<a class="btn ghost sm" href="lecture.html?unit=' + encodeURIComponent(u.code) + '">' + esc(u.label) + " 세트 목록</a>"; }).join("") + "</div>";
    view.innerHTML = html + "</div>";
  }

  function renderList() {
    titleEl.textContent = "내 강의";
    crumbNow.textContent = "내 강의";
    metaEl.textContent = "불러오는 중입니다.";
    Promise.all([
      apiFetch("/api/lectures"),
      loadSets(),
      unitParam ? apiFetch("/api/lectures/public?unit=" + encodeURIComponent(unitParam)).catch(function () { return { _status: 0 }; }) : Promise.resolve(null),
    ]).then(function (res) {
      var mine = res[0], units = res[1], pubd = res[2];
      var loggedIn = mine._status !== 401;
      if (!loggedIn && !unitParam) return loginRedirect();
      var mineList = loggedIn ? (mine.lectures || []) : [];
      var pubList = pubd && pubd._status === 200 ? (pubd.lectures || []) : null;   // null = 공개 API 없음 (상태 미상)
      var pubMissing = !!unitParam && pubList === null;
      // 병합: id 기준. 공개 목록은 status 원천, 회원 목록은 entitled 와 progress 원천
      var byId = {};
      (pubList || []).forEach(function (l) { byId[l.id] = Object.assign({}, l, { entitled: false }); });
      mineList.forEach(function (l) { byId[l.id] = Object.assign(byId[l.id] || {}, l); });
      var all = Object.keys(byId).map(function (k) { return byId[k]; });
      if (unitParam) renderUnitView(unitParam, all, units, loggedIn, pubMissing);
      else renderAllView(all, units, loggedIn);
    }).catch(function (e) { console.error(e); view.innerHTML = '<div class="notice"><h2>목록을 불러오지 못했습니다</h2><p>잠시 후 다시 시도해 주세요.</p></div>'; });
  }

  // ================= 뷰어 =================
  var S = {                      // 세션 상태
    id: lectureId, token: null, sid: null, dur: 0, chapters: [], bookmarks: [], email: "", vtt: false,
    rate: 1, resume: 0, viewCount: 0, title: "",
    lastT: 0, watched: 0, evs: [], beatTimer: null, idleTimer: null, wmTimer: null, retries: 0, wasPlaying: false, evicted: false,
    trackUrl: null, ccOn: false, reopening: false, curCh: -1, closed: false,
  };
  var P = {};                    // DOM 참조

  function buildViewer(d) {
    S.exempt = !!d.exempt;
    S.token = d.token; S.sid = d.session_id; S.seq = Number(d.seq) || 0; S.dur = Number(d.duration_sec) || 0; S.chapters = d.chapters || []; S.bookmarks = d.bookmarks || [];
    S.email = d.email || ""; S.vtt = !!d.vtt; S.rate = Number(d.rate) || 1; S.resume = Number(d.resume_sec) || 0; S.viewCount = d.view_count || 1; S.title = d.title || "";
    titleEl.textContent = d.title || "강의";
    crumbNow.textContent = d.title || "강의";
    metaEl.innerHTML = '<span class="badge line">' + esc(KINDS[d.kind] || d.kind) + "</span>"
      + (d.subtitle ? "<span>" + esc(d.subtitle) + "</span>" : "")
      + (S.dur ? "<span>" + fmt(S.dur) + "</span>" : "")
      + "<span>" + S.viewCount + "회째 시청</span>";

    view.innerHTML =
      '<div class="lay2">' +
        '<div class="stagecol">' +
          '<div class="player" id="player" tabindex="0" aria-label="강의 플레이어. 스페이스 재생, 좌우 화살표 5초 이동, 대괄호로 배속">' +
            '<video id="v" playsinline preload="metadata" disablepictureinpicture controlslist="nodownload noplaybackrate nofullscreen noremoteplayback"></video>' +
            '<div class="wm" aria-hidden="true"><span class="w1"></span><span class="w2"></span><span class="w3"></span></div>' +
            '<div class="stage" id="stage"></div>' +
            '<div class="ctl" id="ctl">' +
              '<div class="bar" id="bar" role="slider" aria-label="재생 위치" aria-valuemin="0" aria-valuemax="' + Math.round(S.dur) + '" aria-valuenow="0" tabindex="-1">' +
                '<div class="track"></div><div class="buf" id="buf"></div><div class="played" id="played"></div><div id="ticks"></div><div id="marks"></div><div class="knob" id="knob"></div><div class="tip" id="tip"></div>' +
              '</div>' +
              '<div class="row2">' +
                '<button type="button" class="ib" id="bPlay" aria-label="재생">' + ICON.play + '</button>' +
                '<button type="button" class="ib" id="bBack" aria-label="10초 뒤로">' + ICON.back + '</button>' +
                '<button type="button" class="ib" id="bFwd" aria-label="10초 앞으로">' + ICON.fwd + '</button>' +
                '<span class="tm"><b id="tCur">0:00</b> / <span id="tDur">' + fmt(S.dur) + '</span></span>' +
                '<span class="chnow sp" id="chNow"></span>' +
                '<button type="button" class="ib" id="bBm" aria-label="현재 위치에 책갈피 (B)" title="책갈피 (B)">' + ICON.bm + '</button>' +
                (S.vtt ? '<button type="button" class="ib" id="bCc" aria-label="자막 (C)" title="자막 (C)" aria-pressed="false">' + ICON.cc + '</button>' : '') +
                '<button type="button" class="ib" id="bMute" aria-label="음소거 (M)" title="음소거 (M)">' + ICON.vol + '</button>' +
                '<div style="position:relative"><button type="button" class="rate" id="bRate" aria-haspopup="menu" aria-expanded="false" title="배속 ([ ])">1.0x</button>' +
                  '<div class="menu2x" id="rateMenu" role="menu"><p class="mh">배속</p>' + RATES.map(function (r) { return '<button type="button" role="menuitemradio" data-r="' + r + '">' + r.toFixed(2).replace(/0$/, "") + "x</button>"; }).join("") + '</div></div>' +
                '<button type="button" class="ib" id="bFs" aria-label="전체 화면 (F)" title="전체 화면 (F)">' + ICON.fs + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<p class="lecnote">시청 위치와 재생 기록은 이어보기와 학습 통계에만 쓰며, 이 영상은 <b>' + esc(S.email) + '</b> 계정에 발급된 열람입니다. 무단 복제와 배포는 금지됩니다.</p>' +
        '</div>' +
        '<aside class="side" aria-label="목차와 책갈피">' +
          '<div class="tabs" role="tablist">' +
            '<button type="button" role="tab" id="tabCh" aria-selected="true" aria-controls="paneCh">목차<b id="nCh">' + S.chapters.length + '</b></button>' +
            '<button type="button" role="tab" id="tabBm" aria-selected="false" aria-controls="paneBm">책갈피<b id="nBm">' + S.bookmarks.length + '</b></button>' +
          '</div>' +
          '<div class="pane" id="paneCh" role="tabpanel"><ol class="chl" id="chl"></ol></div>' +
          '<div class="pane" id="paneBm" role="tabpanel" hidden><ol class="bml" id="bml"></ol></div>' +
          '<p class="foot"><kbd>Space</kbd> 재생 <kbd>←</kbd><kbd>→</kbd> 5초 <kbd>J</kbd><kbd>L</kbd> 10초 <kbd>[</kbd><kbd>]</kbd> 배속 <kbd>B</kbd> 책갈피 <kbd>C</kbd> 자막 <kbd>F</kbd> 전체 화면</p>' +
        '</aside>' +
      '</div>';

    ["player", "v", "stage", "ctl", "bar", "buf", "played", "ticks", "marks", "knob", "tip", "bPlay", "bBack", "bFwd", "tCur", "tDur", "chNow", "bBm", "bCc", "bMute", "bRate", "rateMenu", "bFs", "tabCh", "tabBm", "paneCh", "paneBm", "chl", "bml", "nCh", "nBm"]
      .forEach(function (k) { P[k] = $(k); });

    setWatermark();
    renderChapters();
    renderBookmarks();
    bindPlayer();
    bindTabs();
    loadSource(S.resume);
    if (S.resume >= RESUME_MIN) showResume(); else showBigPlay();
  }

  // ---------- 소스, 토큰 ----------
  function streamUrl() { return API + "/api/lecture/stream?id=" + encodeURIComponent(S.id) + "&t=" + encodeURIComponent(S.token); }
  function loadSource(at) {
    var v = P.v;
    v.src = streamUrl();
    v.playbackRate = S.rate;
    v.load();
    if (at > 0) {
      var once = function () { try { v.currentTime = at; } catch (e) {} v.removeEventListener("loadedmetadata", once); };
      v.addEventListener("loadedmetadata", once);
    }
    S.lastT = at || 0;
    if (S.vtt) loadTrack();
    P.bRate.textContent = S.rate.toFixed(2).replace(/0$/, "") + "x";
    markRate();
  }
  // 자막: 교차 출처 <track> 은 CORS 헤더와 crossorigin 속성이 맞아야 해서, 본문을 가져와 Blob URL 로 붙인다
  function loadTrack() {
    fetch(API + "/api/lecture/track?id=" + encodeURIComponent(S.id) + "&t=" + encodeURIComponent(S.token), { credentials: "include" })
      .then(function (r) { if (!r.ok) throw new Error("track " + r.status); return r.text(); })
      .then(function (txt) {
        if (S.trackUrl) URL.revokeObjectURL(S.trackUrl);
        S.trackUrl = URL.createObjectURL(new Blob([txt], { type: "text/vtt" }));
        var old = P.v.querySelector("track"); if (old) old.remove();
        var tr = document.createElement("track");
        tr.kind = "subtitles"; tr.srclang = "ko"; tr.label = "한국어"; tr.src = S.trackUrl;
        P.v.appendChild(tr);
        applyCc();
      }).catch(function () { if (P.bCc) P.bCc.hidden = true; });
  }
  function applyCc() {
    var tt = P.v.textTracks;
    for (var i = 0; i < tt.length; i++) tt[i].mode = S.ccOn ? "showing" : "hidden";
    if (P.bCc) { P.bCc.classList.toggle("on", S.ccOn); P.bCc.setAttribute("aria-pressed", S.ccOn ? "true" : "false"); }
  }
  // 토큰 만료·연결 오류 복구: renew(같은 회차 유지) → 실패 시 open. 같은 위치에서 소스 교체.
  // 갱신 뒤 자동 재생은 사용자 제스처가 끊겨 거부될 수 있으므로 거부되면 큰 재생 버튼으로 돌아간다 (iOS)
  function reopen(reason) {
    if (S.evicted) return Promise.resolve(false); // L-5: 밀려난 상태의 자동 복구 금지 — 사람 손 재진입만
    if (S.reopening) return Promise.resolve(false);
    S.reopening = true;
    var at = P.v.currentTime || S.lastT, playing = !P.v.paused;
    var apply = function (d) {
      S.token = d.token; S.sid = d.session_id; S.seq = Math.max(S.seq || 0, Number(d.seq) || 0);
      loadSource(at);
      if (playing) P.v.play().catch(function () { showBigPlay(); });
      if (reason) toast(reason);
      return true;
    };
    return apiFetch("/api/lecture/renew", { method: "POST", body: JSON.stringify({ sid: S.sid }) }).then(function (d) {
      if (d._status === 200 && d.token) { S.reopening = false; if (S.evicted) { showEvicted(); return false; } return apply(d); }
      if (d._status === 401) { S.reopening = false; block("로그인이 만료되었습니다. 다시 로그인해 주세요."); return false; }
      // L-5: 밀려난 세션 — open 폴백으로 조용히 재진입하면 상한이 무력화된다
      if (d._status === 409 && d.code === "evicted") { S.reopening = false; showEvicted(); return false; }
      // r2 R8: renew 가 429/5xx 로 도는 사이 beat 가 evicted 래치를 세웠으면 open 폴백이 사람 클릭 없이
      // 슬롯을 재점유한다 — 폴백 직전 래치 재검사
      if (S.evicted) { S.reopening = false; showEvicted(); return false; }
      return apiFetch("/api/lecture/open", { method: "POST", body: JSON.stringify({ id: S.id, sig: automationSignals() }) }).then(function (d2) {
        S.reopening = false;
        if (d2._status === 401) { block("로그인이 만료되었습니다. 다시 로그인해 주세요."); return false; }
        if (d2._status !== 200 || !d2.token) { showError(d2.error || "영상을 다시 열지 못했습니다."); return false; }
        // r3 REQ6: /open 이 진행되는 동안 beat 가 evicted 래치를 세웠으면 사람 클릭 없이 재점유하지 않는다
        if (S.evicted) { showEvicted(); return false; }
        return apply(d2);
      });
    }).catch(function () { S.reopening = false; return false; });
  }

  // ---------- 상태 카드 ----------
  function stage(html) { P.stage.innerHTML = html; P.stage.hidden = !html; }
  // L-5 (2026-08-30): 동시 3기기 한도에 밀려난 상태 — 재생 정지 + 오버레이, 재개는 버튼(사람 손)으로만
  function evictOverlay() {
    stage('<div class="box"><h2>다른 기기에서 시청을 시작했습니다</h2><p>동시 시청은 계정당 3기기까지입니다. 이 기기에서 계속 보려면 아래 버튼을 눌러 주세요.</p><div class="row"><button type="button" class="btn" id="evictBtn">이 기기에서 계속 보기</button><a class="btn ghost" href="lecture.html">내 강의</a></div></div>');
    $("evictBtn").addEventListener("click", evictReopen);
  }
  function showEvicted() {
    if (S.evicted) return;
    S.evicted = true;
    stopBeat(); P.v.pause();
    evictOverlay();
  }
  // 밀려난 상태의 재진입 — open 성공 때만 래치를 푼다. 실패(429/5xx) 시 오류 카드의 "다시 시도" 도
  // 이 경로로 돌아온다 (reopen 은 래치에 즉시 반환이라 빈 플레이어로 고착된다, Codex 후속 r1 #16)
  function evictReopen() {
    var at = P.v.currentTime || S.lastT;
    apiFetch("/api/lecture/open", { method: "POST", body: JSON.stringify({ id: S.id, sig: automationSignals() }) }).then(function (d) {
      if (d._status === 401) { block("로그인이 만료되었습니다. 다시 로그인해 주세요."); return; }
      if (d._status !== 200 || !d.token) { showError(d.error || "다시 열지 못했습니다."); return; }
      S.evicted = false; stage("");
      S.token = d.token; S.sid = d.session_id; S.seq = Math.max(S.seq || 0, Number(d.seq) || 0);
      loadSource(at);
    }).catch(function () { showError("네트워크 상태를 확인한 뒤 다시 시도해 주세요."); });
  }
  function showBigPlay() {
    stage('<button type="button" class="bigplay" id="bigPlay" aria-label="재생">' + ICON.play + "</button>");
    $("bigPlay").addEventListener("click", function () { stage(""); P.v.play().catch(function () {}); });
  }
  function showResume() {
    stage('<div class="box"><h2>' + fmt(S.resume) + ' 부터 이어볼까요?</h2><p>지난 시청이 여기서 끊겼습니다.</p>' +
      '<div class="row"><button type="button" class="btn" id="rsGo">이어보기</button><button type="button" class="btn ghost" id="rsZero">처음부터</button></div></div>');
    $("rsGo").addEventListener("click", function () { stage(""); P.v.play().catch(function () {}); });
    $("rsZero").addEventListener("click", function () { stage(""); seekTo(0, "resume-zero"); P.v.play().catch(function () {}); });
  }
  function showError(msg) {
    stage('<div class="box"><h2>재생에 문제가 있습니다</h2><p>' + esc(msg) + '</p><div class="row"><button type="button" class="btn" id="errRetry">다시 시도</button></div></div>');
    $("errRetry").addEventListener("click", function () { stage(""); S.retries = 0; if (S.evicted) evictReopen(); else reopen(); });
  }

  // ---------- 워터마크 ----------
  function setWatermark() {
    var t = "현학적 연구소  " + S.email;
    var w = P.player.querySelectorAll(".wm span");
    w[0].textContent = t; w[1].textContent = "玄學的 硏究所  무단복제금지  " + S.email; w[2].textContent = "© 현학적 연구소  " + S.email;
    var move = function () {
      var st = P.player.style;
      st.setProperty("--wx1", (6 + Math.random() * 40).toFixed(0) + "%"); st.setProperty("--wy1", (8 + Math.random() * 40).toFixed(0) + "%");
      st.setProperty("--wx2", (40 + Math.random() * 40).toFixed(0) + "%"); st.setProperty("--wy2", (45 + Math.random() * 35).toFixed(0) + "%");
    };
    move(); S.wmTimer = setInterval(move, 30000);
  }

  // ---------- 목차 ----------
  function renderChapters() {
    var chs = S.chapters;
    P.ticks.innerHTML = S.dur ? chs.filter(function (c) { return c.start_sec > 0; }).map(function (c) { return '<i class="tick" style="left:' + (c.start_sec / S.dur * 100) + '%"></i>'; }).join("") : "";
    if (!chs.length) { P.chl.innerHTML = '<li class="empty">목차가 없는 강의입니다.</li>'; return; }
    P.chl.innerHTML = chs.map(function (c, i) {
      return '<li data-i="' + i + '"><button type="button"><span class="n">' + (i + 1) + '</span><span>' + esc(c.title) + '</span><span class="t2">' + fmt(c.start_sec) + "</span></button></li>";
    }).join("");
    P.chl.querySelectorAll("li").forEach(function (li) {
      li.querySelector("button").addEventListener("click", function () {
        var c = chs[Number(li.dataset.i)];
        seekTo(c.start_sec, "chapter", String(c.seq));
        P.v.play().catch(function () {});
        P.player.focus({ preventScroll: true });
      });
    });
  }
  function updateChapter(t) {
    var chs = S.chapters, idx = -1;
    for (var i = 0; i < chs.length; i++) if (t + 0.05 >= chs[i].start_sec) idx = i; else break;
    if (idx === S.curCh) return;
    S.curCh = idx;
    P.chl.querySelectorAll("li").forEach(function (li, i) { li.classList.toggle("on", i === idx); li.classList.toggle("done", i < idx); });
    P.chNow.textContent = idx >= 0 ? (idx + 1) + ". " + chs[idx].title : "";
    var on = P.chl.querySelector("li.on");
    if (on && P.paneCh.scrollHeight > P.paneCh.clientHeight) on.scrollIntoView({ block: "nearest" });
  }

  // ---------- 책갈피 ----------
  function renderBookmarks() {
    var bms = S.bookmarks;
    P.nBm.textContent = bms.length;
    P.marks.innerHTML = S.dur ? bms.map(function (b) { return '<i class="mark" style="left:' + (b.position_sec / S.dur * 100) + '%" title="' + esc(b.label) + '"></i>'; }).join("") : "";
    if (!bms.length) { P.bml.innerHTML = '<li class="empty">아직 책갈피가 없습니다.<br>재생 중 <b>B</b> 키나 책갈피 버튼을 누르면 지금 위치가 저장됩니다.</li>'; return; }
    P.bml.innerHTML = bms.map(function (b) {
      return '<li data-id="' + esc(b.id) + '"><button type="button" class="jump">' + fmt(b.position_sec) + '</button>' +
        '<div><p class="lb">' + esc(b.label) + "</p>" + (b.note ? '<p class="nt">' + esc(b.note) + "</p>" : "") + "</div>" +
        '<div class="ops"><button type="button" class="ed" aria-label="수정">' + ICON.edit + '</button><button type="button" class="rm" aria-label="삭제">' + ICON.del + "</button></div></li>";
    }).join("");
    P.bml.querySelectorAll("li").forEach(function (li) {
      var b = bms.find(function (x) { return x.id === li.dataset.id; });
      li.querySelector(".jump").addEventListener("click", function () { seekTo(b.position_sec, "bookmark-jump", b.id); P.v.play().catch(function () {}); });
      li.querySelector(".rm").addEventListener("click", function () { removeBookmark(b); });
      li.querySelector(".ed").addEventListener("click", function () { editBookmark(li, b); });
    });
  }
  function bookmarkForm(li, b, onSave) {
    var f = document.createElement("div"); f.className = "edit";
    f.innerHTML = '<input type="text" maxlength="80" placeholder="책갈피 이름" value="' + esc(b.label || "") + '"><textarea maxlength="500" placeholder="메모 (선택)">' + esc(b.note || "") + "</textarea>" +
      '<div class="r"><button type="button" class="cancel">취소</button><button type="button" class="pri save">저장</button></div>';
    li.appendChild(f);
    var inp = f.querySelector("input"), ta = f.querySelector("textarea");
    inp.focus(); inp.select();
    var done = function () { f.remove(); };
    f.querySelector(".cancel").addEventListener("click", function () { done(); renderBookmarks(); });
    f.querySelector(".save").addEventListener("click", function () { onSave(inp.value, ta.value, done); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); onSave(inp.value, ta.value, done); } if (e.key === "Escape") { done(); renderBookmarks(); } });
    [inp, ta].forEach(function (el) { el.addEventListener("keydown", function (e) { e.stopPropagation(); }); });
  }
  function addBookmark() {
    var pos = P.v.currentTime || 0;
    var wasPlaying = !P.v.paused;
    P.tabBm.click();
    var li = document.createElement("li");
    li.innerHTML = '<span class="jump">' + fmt(pos) + '</span><div><p class="lb">새 책갈피</p></div><div></div>';
    if (P.bml.querySelector(".empty")) P.bml.innerHTML = "";
    P.bml.prepend(li);
    bookmarkForm(li, { label: "책갈피 " + fmt(pos), note: "" }, function (label, note, done) {
      apiFetch("/api/lecture/bookmarks", { method: "POST", body: JSON.stringify({ id: S.id, pos: pos, label: label, note: note }) }).then(function (d) {
        if (d._status === 201) { S.bookmarks.push(d.bookmark); S.bookmarks.sort(function (a, b) { return a.position_sec - b.position_sec; }); pushEv("bookmark", pos, d.bookmark.id); done(); renderBookmarks(); toast("책갈피를 저장했습니다"); }
        else if (d._status === 401) block("로그인이 만료되었습니다. 다시 로그인해 주세요.");
        else toast(d.error || "저장하지 못했습니다");
      });
    });
    if (wasPlaying) { /* 재생은 이어간다. 입력 중 단축키는 stopPropagation 으로 차단 */ }
  }
  function editBookmark(li, b) {
    if (li.querySelector(".edit")) return;
    bookmarkForm(li, b, function (label, note, done) {
      apiFetch("/api/lecture/bookmarks/" + encodeURIComponent(b.id), { method: "PATCH", body: JSON.stringify({ label: label, note: note }) }).then(function (d) {
        if (d._status === 200) { b.label = d.bookmark.label; b.note = d.bookmark.note; done(); renderBookmarks(); }
        else toast(d.error || "수정하지 못했습니다");
      });
    });
  }
  function removeBookmark(b) {
    apiFetch("/api/lecture/bookmarks/" + encodeURIComponent(b.id), { method: "DELETE" }).then(function (d) {
      if (d._status === 200) { S.bookmarks = S.bookmarks.filter(function (x) { return x.id !== b.id; }); renderBookmarks(); toast("책갈피를 지웠습니다"); }
      else toast(d.error || "지우지 못했습니다");
    });
  }

  // ---------- 재생 제어 ----------
  function seekTo(t, kind, val) {
    var from = P.v.currentTime || 0;
    t = Math.max(0, Math.min(S.dur || t, t));
    try { P.v.currentTime = t; } catch (e) {}
    S.lastT = t;
    if (kind === "chapter") pushEv("chapter", t, val);
    else pushEv("seek", t, Math.round(from) + ">" + Math.round(t) + (kind ? ":" + kind : ""));
    updateUi();
  }
  function setRate(r) {
    r = Math.max(0.5, Math.min(2, Number(r) || 1));
    S.rate = r; P.v.playbackRate = r;
    P.bRate.textContent = r.toFixed(2).replace(/0$/, "") + "x";
    markRate();
    try { localStorage.setItem("hh_lec_rate", String(r)); } catch (e) {}
    pushEv("rate", P.v.currentTime || 0, String(r));
    toast("배속 " + P.bRate.textContent);
  }
  function markRate() { P.rateMenu.querySelectorAll("button[data-r]").forEach(function (b) { b.classList.toggle("on", Number(b.dataset.r) === S.rate); }); }
  function stepRate(dir) {
    var i = RATES.indexOf(S.rate); if (i < 0) i = RATES.indexOf(1);
    i = Math.max(0, Math.min(RATES.length - 1, i + dir)); setRate(RATES[i]);
  }
  // L-5: 밀려난 상태에선 재생 조작을 받지 않는다 — Space/K·컨트롤이 오버레이를 지우고 기존 소스를
  // 이어 재생하면 상한이 무력화된다 (Codex 후속 r1 #11). 재개는 evictReopen(사람 손)만.
  function togglePlay() { if (S.evicted) return; if (P.v.paused) { stage(""); P.v.play().catch(function () {}); } else P.v.pause(); }
  function toggleFs() {
    var el = P.player;
    if (document.fullscreenElement || el.classList.contains("fs-css")) {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      el.classList.remove("fs-css"); document.body.style.overflow = "";
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(function () { el.classList.add("fs-css"); document.body.style.overflow = "hidden"; });
    } else { el.classList.add("fs-css"); document.body.style.overflow = "hidden"; }  // iPhone Safari: 컨테이너 전체화면 미지원 → CSS 고정
    setTimeout(updateFsIcon, 80);
  }
  function updateFsIcon() {
    var on = !!document.fullscreenElement || P.player.classList.contains("fs-css");
    P.bFs.innerHTML = on ? ICON.unfs : ICON.fs;
  }
  function updateUi() {
    var v = P.v, t = v.currentTime || 0, d = S.dur || v.duration || 0;
    P.tCur.textContent = fmt(t);
    if (!S.dur && v.duration) { S.dur = v.duration; P.tDur.textContent = fmt(S.dur); renderChapters(); renderBookmarks(); }
    var pct = d ? Math.min(100, t / d * 100) : 0;
    P.played.style.width = pct + "%"; P.knob.style.left = pct + "%";
    P.bar.setAttribute("aria-valuenow", String(Math.round(t)));
    P.bar.setAttribute("aria-valuetext", fmt(t));
    try { var br = v.buffered; if (br.length && d) { var end = 0; for (var i = 0; i < br.length; i++) if (br.start(i) <= t + 0.5) end = Math.max(end, br.end(i)); P.buf.style.width = Math.min(100, end / d * 100) + "%"; } } catch (e) {}
    updateChapter(t);
  }
  function idleReset() {
    P.player.classList.remove("idle"); clearTimeout(S.idleTimer);
    S.idleTimer = setTimeout(function () { if (!P.v.paused) P.player.classList.add("idle"); }, 2600);
  }

  // ---------- 진도, 행동 원장 ----------
  function pushEv(k, pos, v) { S.evs.push({ k: k, pos: Math.round((pos || 0) * 100) / 100, v: v == null ? undefined : String(v) }); if (S.evs.length > 40) flushBeat(); }
  // 재생 누적: timeupdate 간격이 정상(0~2초)일 때만 더한다. 배속을 곱하지 않는다(영상 시간 기준)
  function accumulate() {
    var t = P.v.currentTime || 0;
    if (!P.v.paused && !P.v.seeking) { var dt = t - S.lastT; if (dt > 0 && dt < 2.5) S.watched += dt; }
    S.lastT = t;
  }
  function flushBeat(final) {
    if (!S.sid || S.closed || S.evicted) return;
    S.seq = (S.seq || 0) + 1;   // 단조 순번: 서버가 역순·재전송을 버린다
    var body = JSON.stringify({ sid: S.sid, seq: S.seq, pos: Math.round((P.v.currentTime || 0) * 100) / 100, watched: Math.round(S.watched * 100) / 100, rate: S.rate, ev: S.evs.splice(0, 50) });
    S.watched = 0;
    var p = fetch(API + "/api/lecture/beat", { method: "POST", credentials: "include", keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: body });
    if (!final) p.then(function (r) {
      if (r.status === 401) block("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      // L-5: 밀려난 기기 — seq stale 409 와는 code 로 구분 (stale 은 무해라 기존처럼 무시)
      if (r.status === 409) r.json().then(function (j) { if (j && j.code === "evicted") showEvicted(); }).catch(function () {});
    }).catch(function () {});
  }
  function startBeat() { stopBeat(); S.beatTimer = setInterval(function () { flushBeat(); }, BEAT_SEC * 1000); }
  function stopBeat() { clearInterval(S.beatTimer); S.beatTimer = null; }

  // ---------- 바인딩 ----------
  function bindPlayer() {
    var v = P.v, pl = P.player;
    // 밀려난 상태의 어떤 경로(챕터 점프, 책갈피 점프, 큰 재생 버튼)로도 재생이 시작되면 즉시 되돌린다 (r1 #11)
    v.addEventListener("play", function () { if (S.evicted) { v.pause(); evictOverlay(); return; } P.bPlay.innerHTML = ICON.pause; P.bPlay.setAttribute("aria-label", "일시정지"); pl.classList.add("playing"); pushEv("play", v.currentTime); startBeat(); idleReset(); S.lastT = v.currentTime; });
    v.addEventListener("pause", function () { P.bPlay.innerHTML = ICON.play; P.bPlay.setAttribute("aria-label", "재생"); pl.classList.remove("playing", "idle"); if (!v.ended) pushEv("pause", v.currentTime); stopBeat(); flushBeat(); });
    v.addEventListener("ended", function () { pushEv("ended", S.dur || v.duration || v.currentTime); stopBeat(); flushBeat(); stage('<div class="box"><h2>강의를 끝까지 보셨습니다</h2><p>다음에 열면 처음부터 시작합니다.</p><div class="row"><button type="button" class="btn" id="againBtn">다시 보기</button><a class="btn ghost" href="lecture.html">내 강의</a></div></div>'); $("againBtn").addEventListener("click", function () { stage(""); seekTo(0, "again"); v.play().catch(function () {}); }); });
    v.addEventListener("timeupdate", function () { accumulate(); updateUi(); });
    v.addEventListener("progress", updateUi);
    v.addEventListener("loadedmetadata", updateUi);
    v.addEventListener("ratechange", function () { if (Math.abs(v.playbackRate - S.rate) > 0.01) v.playbackRate = S.rate; });
    v.addEventListener("volumechange", function () { P.bMute.innerHTML = (v.muted || v.volume === 0) ? ICON.mute : ICON.vol; });
    v.addEventListener("error", function () {
      var code = v.error && v.error.code;
      pushEv("error", v.currentTime, String(code || "?"));
      if (S.retries++ < 3) { var wait = 800 * Math.pow(2, S.retries - 1); setTimeout(function () { reopen("연결을 복구했습니다"); }, wait); }
      else showError("네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
    });
    v.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    v.addEventListener("click", function () { togglePlay(); });
    v.addEventListener("dblclick", function (e) { e.preventDefault(); toggleFs(); });

    P.bPlay.addEventListener("click", togglePlay);
    P.bBack.addEventListener("click", function () { seekTo((v.currentTime || 0) - 10, "btn"); });
    P.bFwd.addEventListener("click", function () { seekTo((v.currentTime || 0) + 10, "btn"); });
    P.bMute.addEventListener("click", function () { v.muted = !v.muted; });
    P.bBm.addEventListener("click", addBookmark);
    if (P.bCc) P.bCc.addEventListener("click", function () { S.ccOn = !S.ccOn; applyCc(); });
    P.bFs.addEventListener("click", toggleFs);
    document.addEventListener("fullscreenchange", updateFsIcon);
    P.bRate.addEventListener("click", function () { var open = P.rateMenu.dataset.open === "1"; P.rateMenu.dataset.open = open ? "0" : "1"; P.bRate.setAttribute("aria-expanded", open ? "false" : "true"); });
    P.rateMenu.querySelectorAll("button[data-r]").forEach(function (b) { b.addEventListener("click", function () { setRate(Number(b.dataset.r)); P.rateMenu.dataset.open = "0"; P.bRate.setAttribute("aria-expanded", "false"); }); });
    document.addEventListener("click", function (e) { if (!P.rateMenu.contains(e.target) && e.target !== P.bRate) { P.rateMenu.dataset.open = "0"; P.bRate.setAttribute("aria-expanded", "false"); } });

    // 스크러버: 포인터 드래그, 호버 툴팁(시간 + 장 제목)
    var bar = P.bar, dragging = false;
    var frac = function (e) { var r = bar.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
    var tipAt = function (f) {
      var t = f * (S.dur || v.duration || 0), ch = null;
      for (var i = 0; i < S.chapters.length; i++) if (t >= S.chapters[i].start_sec) ch = S.chapters[i];
      P.tip.textContent = fmt(t) + (ch ? "  " + ch.title : ""); P.tip.style.left = (f * 100) + "%";
    };
    bar.addEventListener("pointermove", function (e) { tipAt(frac(e)); if (dragging) { var f = frac(e); P.played.style.width = (f * 100) + "%"; P.knob.style.left = (f * 100) + "%"; } });
    bar.addEventListener("pointerdown", function (e) { dragging = true; bar.classList.add("drag"); bar.setPointerCapture(e.pointerId); tipAt(frac(e)); });
    bar.addEventListener("pointerup", function (e) { if (!dragging) return; dragging = false; bar.classList.remove("drag"); seekTo(frac(e) * (S.dur || v.duration || 0), "bar"); });
    bar.addEventListener("pointercancel", function () { dragging = false; bar.classList.remove("drag"); });

    // 키보드 (입력 중은 제외)
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k === " " || k === "k") { e.preventDefault(); togglePlay(); }
      else if (k === "ArrowLeft") { e.preventDefault(); seekTo(v.currentTime - 5, "key"); }
      else if (k === "ArrowRight") { e.preventDefault(); seekTo(v.currentTime + 5, "key"); }
      else if (k === "j") seekTo(v.currentTime - 10, "key");
      else if (k === "l") seekTo(v.currentTime + 10, "key");
      else if (k === "ArrowUp") { e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); }
      else if (k === "ArrowDown") { e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); }
      else if (k === "[") stepRate(-1);
      else if (k === "]") stepRate(1);
      else if (k === "b") { e.preventDefault(); addBookmark(); }   // 기본 동작을 막지 않으면 'b' 가 새 입력칸에 찍힌다 (e2e 실측)
      else if (k === "c" && P.bCc) { S.ccOn = !S.ccOn; applyCc(); }
      else if (k === "f") toggleFs();
      else if (k === "m") v.muted = !v.muted;
      else if (k === "Escape" && pl.classList.contains("fs-css")) toggleFs();
      else return;
      idleReset();
    });
    pl.addEventListener("pointermove", idleReset);
    pl.addEventListener("pointerdown", idleReset);

    // 이탈: pagehide, 숨김 → close 이벤트 keepalive 송신 (끊은 지점 기록)
    var onLeave = function () { if (S.closed) return; pushEv("close", v.currentTime); flushBeat(true); S.closed = true; };
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { pushEv("pause", v.currentTime); flushBeat(true); pl.style.filter = "blur(22px)"; }
      else { pl.style.filter = ""; S.closed = false; }
    });
    // 런타임 자동화 재검사(지연 주입 대비)
    setInterval(function () {
      if (!S.exempt && automationSignals().length >= 2 && curtain.style.display !== "flex") {
        // 서버 신고 (aigate REQ14): 지연 주입 자동화도 경고·정지 파이프라인과 감사 원장에 들어가야 한다.
        // 캡처·제재 원장은 리더와 공용이라 /api/reader/event 를 그대로 쓴다 (slug 없음 = 문서 미지정).
        try { fetch(API + "/api/reader/event", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "web", kind: "automation" }), keepalive: true }); } catch (e) {}
        v.pause(); block("지원하지 않는 접속 환경입니다.");
      }
    }, 4000);
  }
  function bindTabs() {
    var sel = function (which) {
      var ch = which === "ch";
      P.tabCh.setAttribute("aria-selected", ch ? "true" : "false"); P.tabBm.setAttribute("aria-selected", ch ? "false" : "true");
      P.paneCh.hidden = !ch; P.paneBm.hidden = ch;
    };
    P.tabCh.addEventListener("click", function () { sel("ch"); });
    P.tabBm.addEventListener("click", function () { sel("bm"); });
  }

  // ---------- 진입 ----------
  function notice(h, p, acts) { view.innerHTML = '<div class="notice"><h2>' + h + "</h2><p>" + p + '</p><div class="acts">' + (acts || '<a class="btn ghost sm" href="lecture.html">내 강의</a><a class="btn ghost sm" href="my.html">마이페이지</a>') + "</div></div>"; }
  function boot() {
    if (!lectureId) return renderList();
    // 자동화 신호는 서버가 판정한다 (2026-08-30): 예외 회원(automation_exempt)은 통과, 그 외는 토큰 없이 403 code=automation
    var sig = automationSignals();
    apiFetch("/api/lecture/open", { method: "POST", body: JSON.stringify({ id: lectureId, sig: sig }) }).then(function (d) {
      if (d._status === 401) return loginRedirect();
      if (d._status === 403 && d.code === "automation") { block("지원하지 않는 접속 환경입니다.\n일반 브라우저에서 로그인 후 이용해 주세요."); return; }
      if (d._status === 403) return notice("이용권이 있는 회원만 시청할 수 있습니다", "이 강의는 해당 지문 이용권이나 강의 상품에 포함됩니다. 구매한 계정으로 로그인했는지 확인해 주세요.", '<a class="btn sm" href="studio.html">면접 스튜디오 이용권</a><a class="btn ghost sm" href="lecture.html">내 강의</a>');
      if (d._status === 404) return notice("강의를 찾을 수 없습니다", "주소가 바뀌었거나 공개가 끝난 강의입니다.");
      if (d._status === 409) return notice("영상을 준비하고 있습니다", d.has_script ? "대본은 준비되었고 영상을 제작하는 중입니다. 공개되면 이 자리에서 바로 재생됩니다. 공개 일정은 확정되지 않았습니다." : "이 강의는 아직 제작 전입니다. 공개되면 이 자리에서 바로 재생됩니다.");
      if (d._status === 429) return notice("잠시 후 다시 시도해 주세요", "열람 요청이 잠시 많았습니다.");
      if (d._status !== 200 || !d.token) return notice("불러오지 못했습니다", esc(d.error || "잠시 후 다시 시도해 주세요."));
      buildViewer(d);
    }).catch(function (e) { console.error(e); notice("불러오지 못했습니다", "네트워크 상태를 확인한 뒤 다시 시도해 주세요."); });
  }
  boot();
})();
