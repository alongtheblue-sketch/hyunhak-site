/* 고객센터 (support.html). 1:1 문의 접수, 내 문의 스레드와 답글, 최근 공지 5건.
   API 가 실패해도 화면은 깨지지 않는다. 각 블록이 폴백 문구를 띄우고 나머지는 그대로 선다. */
(function () {
  var CAT = { guide: '가이드북', studio: '면접 스튜디오', pay: '결제', refund: '환불', account: '계정', etc: '기타' };
  var STATUS = { open: '접수', answered: '답변 완료', closed: '종결' };
  var MAIL = 'admin@hyunhak.com';
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return HH.esc(s == null ? '' : String(s)); }
  function fmt(iso) { return iso ? String(iso).slice(0, 10).replace(/-/g, '.') : ''; }
  function fmtT(iso) {
    if (!iso) return '';
    var s = String(iso);
    return fmt(s) + (s.length >= 16 ? ' ' + s.slice(11, 16) : '');
  }
  function say(el, text, err) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('err', !!err);
  }
  function okEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function statusBadge(st) {
    var cls = st === 'answered' ? 'badge line' : (st === 'closed' ? 'badge mute' : 'badge seal');
    return '<span class="' + cls + '">' + esc(STATUS[st] || st || '') + '</span>';
  }

  var member = null;

  // ── 1:1 문의 폼 ──
  function initForm() {
    var form = $('#inqForm'); if (!form) return;
    var guest = $('#inqGuest'), who = $('#inqWho'), msg = $('#inqMsg'), send = $('#inqSend'), done = $('#inqDone');
    var pn = $('#inqPn'), agreeRow = $('#inqAgreeRow'), agree = $('#inqAgree');
    // 개인정보 수집 고지: 비회원은 펼친 채 동의 체크 필수, 회원은 접은 채 두고 체크는 받지 않는다 (법률 검토 2026-09-03)
    if (member) {
      if (guest) guest.hidden = true;
      if (who) { who.hidden = false; who.textContent = '답변은 회원 이메일 ' + (member.email || '') + ' 과 내 문의 목록에서 확인합니다.'; }
      if (pn) pn.open = false;
      if (agreeRow) agreeRow.hidden = true;
    } else {
      if (guest) guest.hidden = false;
      if (who) who.hidden = true;
      if (pn) pn.open = true;
      if (agreeRow) agreeRow.hidden = false;
    }
    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var cat = $('#inqCat').value, title = $('#inqTitle').value.trim(), body = $('#inqBody').value.trim();
      if (!member && agree && !agree.checked) { say(msg, '개인정보 수집 안내에 동의해야 문의를 보낼 수 있습니다.', true); if (pn) pn.open = true; agree.focus(); return; }
      if (!CAT[cat]) return say(msg, '분류를 골라 주세요.', true);
      if (!title) return say(msg, '제목을 적어 주세요.', true);
      if (title.length > 120) return say(msg, '제목은 120자 이내로 적어 주세요.', true);
      if (!body) return say(msg, '내용을 적어 주세요.', true);
      if (body.length > 3000) return say(msg, '내용은 3,000자 이내로 적어 주세요.', true);
      var payload = { category: cat, title: title, body: body };
      if (!member) {
        var email = $('#inqEmail').value.trim(), name = $('#inqName').value.trim();
        if (!okEmail(email)) return say(msg, '답변을 받을 이메일 주소를 확인해 주세요.', true);
        payload.email = email;
        if (name) payload.name = name.slice(0, 40);
      }
      send.disabled = true; say(msg, '접수 중');
      try {
        var r = await HH.api('/api/inquiries', { method: 'POST', body: JSON.stringify(payload) });
        say(msg, '');
        form.reset();
        if (done) {
          done.hidden = false;
          $('#inqDoneNo').textContent = r && r.id != null ? String(r.id) : '';
          done.focus();
        }
        if (member) loadMine();
      } catch (e) {
        if (e.status === 429) say(msg, '문의는 시간당 5건까지 접수됩니다. 잠시 후 다시 보내 주세요.', true);
        else if (e.status === 400) say(msg, (e.message || '입력 내용을 확인해 주세요') + '.', true);
        else say(msg, '지금은 접수할 수 없습니다. ' + MAIL + ' 으로 보내 주세요.', true);
      }
      send.disabled = false;
    });
    var again = $('#inqAgain');
    if (again) again.addEventListener('click', function () { if (done) done.hidden = true; $('#inqCat').focus(); });
  }

  // ── 내 문의 목록과 스레드 ──
  var mineBlk, mineList, mineEmpty, mineNote, th;
  async function loadMine() {
    mineBlk = $('#mineBlk'); if (!mineBlk) return;
    mineList = $('#mineList'); mineEmpty = $('#mineEmpty'); mineNote = $('#mineNote'); th = $('#thread');
    if (!member) {
      if (mineList) mineList.innerHTML = '';
      if (mineEmpty) mineEmpty.hidden = true;
      if (mineNote) mineNote.hidden = false;
      return;
    }
    if (mineNote) mineNote.hidden = true;
    var items;
    try { items = await HH.api('/api/inquiries'); }
    catch (e) {
      if (mineEmpty) { mineEmpty.hidden = false; mineEmpty.textContent = '내 문의를 지금 불러올 수 없습니다. 잠시 후 다시 열어 주세요.'; }
      return;
    }
    items = Array.isArray(items) ? items : (items.inquiries || items.items || []);
    if (!items.length) {
      if (mineEmpty) { mineEmpty.hidden = false; mineEmpty.textContent = '접수한 문의가 없습니다.'; }
      mineList.innerHTML = '';
      return;
    }
    if (mineEmpty) mineEmpty.hidden = true;
    mineList.innerHTML = items.map(function (it) {
      var n = HH.intIn(it.reply_count, 0, 9999, 0);
      return '<li><a href="support.html?inq=' + encodeURIComponent(it.id) + '" data-id="' + esc(it.id) + '">'
        + '<span class="u">' + esc(it.title) + '<small>' + esc(CAT[it.category] || it.category || '') + (n ? ', 답글 ' + n : '') + '</small></span>'
        + '<span class="n">' + esc(fmt(it.created_at)) + '</span>'
        + '<span class="n">' + statusBadge(it.status) + '</span></a></li>';
    }).join('');
  }
  async function openThread(id) {
    if (!th || !member) return;
    var body = $('#thBody'), replies = $('#thReplies'), meta = $('#thMeta'), title = $('#thTitle'), rf = $('#thReplyForm'), msg = $('#thMsg');
    th.hidden = false;
    title.textContent = '불러오는 중';
    meta.textContent = ''; body.textContent = ''; replies.innerHTML = ''; say(msg, '');
    if (rf) rf.hidden = true;
    var d;
    try { d = await HH.api('/api/inquiries/' + encodeURIComponent(id)); }
    catch (e) {
      title.textContent = '문의를 지금 불러올 수 없습니다';
      meta.textContent = e.status === 404 ? '삭제되었거나 내 문의가 아닌 번호입니다.' : '잠시 후 다시 열어 주세요.';
      th.scrollIntoView({ block: 'start' });
      return;
    }
    var q = d.inquiry || d, rs = Array.isArray(d.replies) ? d.replies : [];
    th.dataset.id = String(q.id != null ? q.id : id);
    title.textContent = q.title || '';
    meta.innerHTML = esc(fmtT(q.created_at)) + ', ' + esc(CAT[q.category] || q.category || '') + ' ' + statusBadge(q.status);
    body.innerHTML = '<span class="who">내가 보낸 문의</span>' + esc(q.body || '');
    replies.innerHTML = rs.map(function (r) {
      var admin = r.author === 'admin';
      return '<div class="msg' + (admin ? ' admin' : '') + '"><span class="who">' + (admin ? '연구소' : '나') + ', ' + esc(fmtT(r.created_at)) + '</span>' + esc(r.body || '') + '</div>';
    }).join('');
    if (rf) {
      rf.hidden = q.status === 'closed';
      if (q.status === 'closed') say(msg, '종결된 문의입니다. 이어서 물을 내용은 새 문의로 보내 주세요.');
    }
    th.scrollIntoView({ block: 'start' });
    th.focus();
  }
  function initThread() {
    th = $('#thread'); if (!th) return;
    var list = $('#mineList'), rf = $('#thReplyForm'), msg = $('#thMsg');
    if (list) list.addEventListener('click', function (ev) {
      var a = ev.target.closest('a[data-id]'); if (!a) return;
      ev.preventDefault();
      openThread(a.dataset.id);
    });
    var back = $('#thBack');
    if (back) back.addEventListener('click', function () { th.hidden = true; if (list) list.scrollIntoView({ block: 'start' }); });
    if (rf) rf.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var ta = $('#thReply'), text = ta.value.trim(), btn = $('#thSend');
      if (!text) return say(msg, '답글 내용을 적어 주세요.', true);
      if (text.length > 3000) return say(msg, '답글은 3,000자 이내로 적어 주세요.', true);
      btn.disabled = true; say(msg, '보내는 중');
      try {
        await HH.api('/api/inquiries/' + encodeURIComponent(th.dataset.id) + '/replies', { method: 'POST', body: JSON.stringify({ body: text }) });
        ta.value = '';
        await openThread(th.dataset.id);   // 스레드를 다시 그린 뒤에 문구를 놓는다 (openThread 가 문구를 비운다)
        say(msg, '답글을 보냈습니다.');
        loadMine();
      } catch (e) {
        if (e.status === 429) say(msg, '답글은 시간당 5건까지 보낼 수 있습니다. 잠시 후 다시 보내 주세요.', true);
        else say(msg, (e.message || '지금은 보낼 수 없습니다') + '.', true);
      }
      btn.disabled = false;
    });
  }

  // ── 최근 공지 5건 ──
  async function loadNotices() {
    var ul = $('#ntcList'), empty = $('#ntcEmpty'); if (!ul) return;
    var data;
    try { data = await HH.api('/api/notices?kind=notice&limit=5'); }
    catch (e) {
      if (empty) { empty.hidden = false; empty.innerHTML = '공지를 지금 불러올 수 없습니다. <a class="tlink" href="notice.html">공지 페이지로 →</a>'; }
      return;
    }
    var items = Array.isArray(data) ? data : (data.notices || data.items || []);
    if (!items.length) { if (empty) { empty.hidden = false; empty.textContent = '등록된 공지가 없습니다.'; } return; }
    if (empty) empty.hidden = true;
    ul.innerHTML = items.slice(0, 5).map(function (it) {
      return '<li><a href="notice.html?id=' + encodeURIComponent(it.id) + '"><span>' + esc(it.title) + '</span>'
        + '<time datetime="' + esc((it.starts_at || it.created_at || '').slice(0, 10)) + '">' + esc(fmt(it.starts_at || it.created_at)) + '</time></a></li>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var st = await HH.me(true);          // 실패하면 {member:null}, 비회원 폼으로 선다
    member = st && st.member ? st.member : null;
    initForm();
    initThread();
    loadNotices();
    await loadMine();
    var want = new URLSearchParams(location.search).get('inq');
    if (want && member) openThread(want);
  });
})();
