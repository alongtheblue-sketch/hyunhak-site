/* MY 별명과 순위표 공개. 문안은 my.html의 r2_copy 원장 속성에서 읽는다. */
(function () {
  'use strict';
  if (!window.HH) return;
  HH.bindRankProfile = function (member) {
    var root = document.getElementById('rank');
    if (!root || root.dataset.bound) return;
    root.dataset.bound = 'true';
    var input = document.getElementById('nickname');
    var save = document.getElementById('nicknameSave');
    var message = document.getElementById('nicknameMsg');
    var opt = document.getElementById('rankOpt');
    var rankMessage = document.getElementById('rankMsg');
    var rankBase = rankMessage.textContent;
    var currentPublic = !!member.rank_public;
    input.value = member.nickname || '';
    opt.checked = currentPublic;
    function busy(value) { input.disabled = save.disabled = opt.disabled = value; }
    function errorText(error) {
      if (error.status === 400 && error.error === 'nickname_required') return root.dataset.required;
      if (error.status === 409 && error.error === 'nickname_taken') return root.dataset.taken;
      if (error.status === 400 && error.error === 'nickname_invalid') {
        return root.dataset[({ too_short: 'tooShort', too_long: 'tooLong', charset: 'charset', forbidden: 'forbidden' })[error.reason]] || root.dataset.charset;
      }
      return root.dataset.failed;
    }
    async function patch(body) {
      // HH.api는 reason을 보존하지 않으므로 이 설정의 오류 사유만 직접 읽는다.
      var response = await fetch(HH.API + '/api/auth/me', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw Object.assign({}, data, { status: response.status });
      return data;
    }
    function requireNickname() {
      if (input.value.trim()) return true;
      message.textContent = root.dataset.required;
      input.setAttribute('aria-invalid', 'true'); input.focus();
      return false;
    }
    save.addEventListener('click', async function () {
      if (!requireNickname()) return;
      var nickname = input.value.trim(); busy(true);
      try {
        await patch({ nickname: nickname });
        member.nickname = nickname; input.value = nickname;
        input.removeAttribute('aria-invalid'); message.textContent = root.dataset.saved;
      } catch (error) {
        message.textContent = errorText(error); input.setAttribute('aria-invalid', 'true');
      } finally { busy(false); }
    });
    input.addEventListener('keydown', function (event) {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Enter') { event.preventDefault(); save.click(); }
    });
    opt.addEventListener('change', async function () {
      var want = opt.checked;
      if (want && !requireNickname()) { opt.checked = currentPublic; return; }
      var nickname = input.value.trim();
      var body = want ? { nickname: nickname, rank_public: true } : { rank_public: false };
      busy(true);
      try {
        await patch(body);
        currentPublic = want; member.rank_public = want;
        if (want) { member.nickname = nickname; input.value = nickname; }
        input.removeAttribute('aria-invalid'); message.textContent = '';
        rankMessage.textContent = (want ? root.dataset.onSaved : root.dataset.offSaved) + rankBase;
      } catch (error) {
        opt.checked = currentPublic;
        message.textContent = errorText(error);
        if (error.error && error.error.indexOf('nickname_') === 0) input.setAttribute('aria-invalid', 'true');
      } finally { busy(false); }
    });
  };
})();
