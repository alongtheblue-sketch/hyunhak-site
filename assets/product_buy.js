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

  function update() {
    var mode = block.querySelector('input[type="radio"]:checked').value;
    var option = select.options[select.selectedIndex];
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
    select.value = link.dataset.r3UnitBuy;
    block.querySelector('input[name="product"][value="pass"]').checked = true;
    update();
    // 카드 「담기」는 구매 블록의 담기 버튼과 같은 경로로 장바구니에 넣는다 (X1 mid-1, 2026-09-10 세션). href="#buy" 이동은 그대로 두어 상태 문구가 보이게 한다.
    button.click();
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
