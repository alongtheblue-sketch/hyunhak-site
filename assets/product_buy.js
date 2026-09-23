/* 상세면 구매 UI. 가격, 수량 제한, 할인과 장바구니 저장은 기존 HH 계약에 맡긴다. */
(function () {
  'use strict';
  var block = document.querySelector('[data-product-buy]');
  if (!block || !window.HH) return;
  var select = block.querySelector('select');
  var button = block.querySelector('[data-cart-sku]');
  var status = block.querySelector('[role="status"]');
  var cartLink = block.querySelector('[data-cart-link]');
  var isGuide = block.dataset.productBuy === 'guidebook';

  function optionFor(value) {
    for (var i = 0; i < select.options.length; i++) if (select.options[i].value === value) return select.options[i];
    return null;
  }
  // 고른 단위의 option 이 없으면 담기를 닫는다 (fail closed). 2026-09-23: select 에 5단위만 있을 때 카드 7장이
  // select.value 를 못 바꾸고(selectedIndex -1) update() 가 TypeError 로 멈춰 직전 단위 SKU 가 담기 버튼에 남았다.
  function closeBuy() {
    button.disabled = true;
    button.dataset.cartSku = '';
    button.dataset.cartTitle = '';
    button.dataset.cartPrice = '0';
    status.textContent = '이 단위는 구매 목록에 없습니다. 응시 단위를 다시 골라 주세요.';
    cartLink.hidden = true;
  }

  function update() {
    var mode = block.querySelector('input[type="radio"]:checked').value;
    var option = select.options[select.selectedIndex];
    if (!option) { closeBuy(); return; }
    select.disabled = isGuide ? mode !== 'single' : mode === 'lecture';
    if (isGuide) {
      button.dataset.cartSku = mode === 'pdf' ? 'guide-all-pdf' : mode === 'all' ? 'guide-all-view' : option.value;
      button.dataset.cartTitle = mode === 'pdf' ? block.dataset.pdfTitle : mode === 'all' ? block.dataset.allTitle : option.dataset.cartTitle;
      button.dataset.cartPrice = mode === 'pdf' ? '1705000' : mode === 'all' ? '511500' : option.dataset.cartPrice;
    } else {
      button.dataset.cartSku = mode === 'lecture' ? 'lecture-common' : mode === 'single' ? 'passage-single' : 'pass-' + option.value;
      button.dataset.cartTitle = mode === 'lecture' ? block.dataset.lectureTitle : option.textContent + ' 전권 이용권';
      button.dataset.cartPrice = mode === 'lecture' ? '220000' : mode === 'single' ? '33000' : '495000';
    }
    // 스튜디오 지문 낱권은 담지 않고 응시실 지문 선택으로 이동한다. 문구가 결과를 미리 말한다 (astra 2026-09-23 D P1-5).
    button.textContent = !isGuide && mode === 'single' ? '지문 고르기' : '장바구니 담기';
    button.disabled = false;
    block.querySelectorAll('[data-plan]').forEach(function (node) {
      node.hidden = node.dataset.plan !== mode;
    });
    status.textContent = '';
    cartLink.hidden = true;
  }

  block.addEventListener('change', update);
  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-r3-unit-buy]');
    if (!link || isGuide || !HH.okUnit(link.dataset.r3UnitBuy)) return;
    if (!optionFor(link.dataset.r3UnitBuy)) { closeBuy(); return; }
    select.value = link.dataset.r3UnitBuy;
    block.querySelector('input[name="product"][value="pass"]').checked = true;
    update();
    // 카드는 단위를 고르고 구매 블록으로 옮기기만 한다 (IA2 g①). 값을 보이기 전에 장바구니에 넣지 않는다.
    // 담는 것은 구매 블록의 담기 버튼이며, href="#buy" 이동으로 가격과 상태 문구를 먼저 보인다.
    // 값을 먼저 보이고 카드에서 담는 대안 ②는 커밋 d438cbe.
  });
  button.addEventListener('click', function () {
    if (button.dataset.cartSku === 'passage-single') {
      // 낱권에는 set_id가 필수다. 기존 응시실에서 실제 지문을 고르게 한다.
      window.location.assign('../studio.html?unit=' + encodeURIComponent(select.value) + '#sets');
      return;
    }
    try {
      var result = HH.addToCart({
        sku: button.dataset.cartSku,
        title: button.dataset.cartTitle,
        price: Number(button.dataset.cartPrice),
        qty: 1,
        ship: false
      });
      status.textContent = result.reason === 'storage' ? block.dataset.failedStorage
        : !result.ok || result.already ? result.message : block.dataset.added;
      cartLink.hidden = false;
    } catch (error) {
      status.textContent = block.dataset.failed;
      cartLink.hidden = false;
    }
  });
  update();
})();
