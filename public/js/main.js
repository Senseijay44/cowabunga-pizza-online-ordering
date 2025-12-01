console.log('Cowabunga Pizza client script loaded with cart + builder.');

// -------------------------------------------------------------
//  TOAST SYSTEM  (inline, self-contained)
// -------------------------------------------------------------
function showToast(message, type = 'success') {
  console.log('showToast (main.js):', message, type);

  const toast = document.createElement('div');
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: type === 'error' ? '#b91c1c' : '#16a34a',
    color: '#f9fafb',
    padding: '0.6rem 1rem',
    borderRadius: '999px',
    zIndex: 9999,
    fontSize: '0.85rem',
    opacity: 0,
    transform: 'translateY(16px)',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
    border: '1px solid rgba(15,23,42,0.7)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
  });

  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = 1;
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = 0;
    toast.style.transform = 'translateY(16px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// -------------------------------------------------------------
// MAIN MENU + CART + MODAL BUILDER LOGIC
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('cb-builder-modal');
  const openButtons = document.querySelectorAll('.js-open-builder');
  const closeButtons = document.querySelectorAll('.cb-modal-close, .cb-modal-cancel');
  const backdrop = modal ? modal.querySelector('.cb-modal-backdrop') : null;

  const cartPanel = document.getElementById('cart-panel');
  const cartItemsEl = document.getElementById('cb-cart-items');
  const cartCountEl = document.getElementById('cb-cart-count');
  const cartSubtotalEl = document.getElementById('cb-cart-subtotal');
  const cartTotalEl = document.getElementById('cb-cart-total');
  const cartBar = document.getElementById('cb-cart-bar');
  const cartBarLabelEl = document.getElementById('cb-cart-bar-label');
  const cartBarTotalEl = document.getElementById('cb-cart-bar-total');

  const sizeButtons = modal ? modal.querySelectorAll('.js-size-option') : [];
  const crustSelect = modal ? modal.querySelector('.js-crust-select') : null;
  const toppingCheckboxes = modal ? modal.querySelectorAll('.js-topping') : [];
  const builderTotalEl = modal ? modal.querySelector('#cb-builder-total') : null;
  const builderAddBtn = modal ? modal.querySelector('.js-builder-add') : null;

  const addMenuButtons = document.querySelectorAll('.js-add-menu-item');

  // If we're not on the menu page, bail quietly
  if (!cartPanel) {
    return;
  }

  // -------------------------------------------------------------
  // CART STATE
  // -------------------------------------------------------------
  const TAX_RATE = 0.086;
  const cart = [];

  function money(n) {
    return `$${n.toFixed(2)}`;
  }

  function computeCartTotals() {
    let itemCount = 0;
    let subtotal = 0;
    cart.forEach(item => {
      itemCount += item.qty;
      subtotal += item.price * item.qty;
    });
    const total = subtotal * (1 + TAX_RATE);
    return { itemCount, subtotal, total };
  }

  function updateCartSummaryUI() {
    const { itemCount, subtotal, total } = computeCartTotals();

    if (cartCountEl) {
      cartCountEl.textContent = itemCount === 1 ? '1 item' : `${itemCount} items`;
    }
    if (cartSubtotalEl) cartSubtotalEl.textContent = money(subtotal);
    if (cartTotalEl) cartTotalEl.textContent = money(total);

    if (cartBarLabelEl) {
      cartBarLabelEl.textContent =
        itemCount === 0 ? 'Cart: 0 items' : `Cart: ${itemCount} item${itemCount === 1 ? '' : 's'}`;
    }
    if (cartBarTotalEl) {
      cartBarTotalEl.textContent = money(total) + ' ▴';
    }
  }

  function renderCart() {
    if (!cartItemsEl) return;

    cartItemsEl.innerHTML = '';

    if (cart.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'cb-cart-item';
      empty.innerHTML =
        '<div><p class="cb-cart-item-name">Your cart is empty</p><p class="cb-cart-item-meta">Add a pizza to get started.</p></div>';
      cartItemsEl.appendChild(empty);
      updateCartSummaryUI();
      return;
    }

    cart.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'cb-cart-item';
      li.innerHTML = `
        <div>
          <p class="cb-cart-item-name">${item.name}</p>
          <p class="cb-cart-item-meta">${item.meta || ''}</p>
        </div>
        <div class="cb-cart-item-right">
          <span class="cb-cart-item-price">${money(item.price * item.qty)}</span>
          <div class="cb-qty-control">
            <button class="js-cart-remove" data-id="${item.id}" aria-label="Remove item">✕</button>
            <button class="js-cart-minus" data-id="${item.id}" data-index="${index}">-</button>
            <span>${item.qty}</span>
            <button class="js-cart-plus" data-id="${item.id}" data-index="${index}">+</button>
          </div>
        </div>
      `;
      cartItemsEl.appendChild(li);
    });

    cartItemsEl.querySelectorAll('.js-cart-minus').forEach(btn => {
      btn.addEventListener('click', () => updateCartItem(btn.dataset.id, -1));
    });

    cartItemsEl.querySelectorAll('.js-cart-plus').forEach(btn => {
      btn.addEventListener('click', () => updateCartItem(btn.dataset.id, +1));
    });

    cartItemsEl.querySelectorAll('.js-cart-remove').forEach(btn => {
      btn.addEventListener('click', () => deleteCartItem(btn.dataset.id));
    });

    updateCartSummaryUI();
  }

  async function loadCartFromServer() {
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) {
        console.error('Failed to load cart:', res.status);
        renderCart();
        return;
      }
      const data = await res.json();
      cart.length = 0;
      (data.items || []).forEach(item => cart.push(item));
      renderCart();
    } catch (err) {
      console.error('Error loading cart:', err);
      renderCart();
    }
  }

  // -------------------------------------------------------------
  // ADD ITEM (Preset or Modal) — WITH TOASTS
  // -------------------------------------------------------------
  async function addItemToCart(newItem) {
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      if (!res.ok) {
        console.error('Failed to add item:', res.status);
        showToast('Error adding item to cart', 'error');
        return;
      }

      const data = await res.json();
      cart.length = 0;
      (data.cart || []).forEach(item => cart.push(item));

      renderCart();
      showToast('Added to cart!', 'success');
    } catch (err) {
      console.error('Error adding item:', err);
      showToast('Error adding to cart', 'error');
    }
  }

  // -------------------------------------------------------------
  // PATCH (qty change)
  // -------------------------------------------------------------
  async function updateCartItem(id, delta) {
    try {
      const res = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      });

      if (!res.ok) {
        console.error('Failed updating cart:', res.status);
        return;
      }

      const data = await res.json();
      cart.length = 0;
      (data.cart || []).forEach(item => cart.push(item));
      renderCart();
    } catch (err) {
      console.error('Error updating cart:', err);
    }
  }

  // -------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------
  async function deleteCartItem(id) {
    try {
      const res = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        console.error('Failed delete:', res.status);
        return;
      }

      const data = await res.json();
      cart.length = 0;
      (data.cart || []).forEach(item => cart.push(item));
      renderCart();
    } catch (err) {
      console.error('Error removing item:', err);
    }
  }

  // -------------------------------------------------------------
  // MODAL BUILDER LOGIC
  // -------------------------------------------------------------
  const builderState = {
    sizeLabel: 'Small',
    sizePrice: 9.99,
    crustLabel: 'Hand Tossed',
    crustExtra: 0,
    toppings: [],
    toppingsTotal: 0
  };

  function parsePrice(value, fallback = 0) {
    const n = parseFloat(value);
    return Number.isNaN(n) ? fallback : n;
  }

  function recalcBuilderTotal() {
    if (!builderTotalEl) return 0;
    const total = builderState.sizePrice + builderState.crustExtra + builderState.toppingsTotal;
    builderTotalEl.textContent = money(total);
    return total;
  }

  function recomputeBuilderToppings() {
    builderState.toppings = [];
    let sum = 0;

    toppingCheckboxes.forEach(cb => {
      if (cb.checked) {
        const label = cb.closest('label');
        const span = label ? label.querySelector('span') : null;
        if (span) builderState.toppings.push(span.textContent.replace(/\s*\(.*\)$/, ''));
        sum += parsePrice(cb.dataset.price, 0);
      }
    });

    builderState.toppingsTotal = sum;
    recalcBuilderTotal();
  }

  function initBuilderDefaults() {
    if (!modal) return;

    toppingCheckboxes.forEach(cb => (cb.checked = false));

    if (sizeButtons.length > 0) {
      sizeButtons.forEach(b => b.classList.remove('cb-pill--active'));
      const first = sizeButtons[0];
      first.classList.add('cb-pill--active');
      builderState.sizeLabel = first.dataset.size;
      builderState.sizePrice = parsePrice(first.dataset.price, 9.99);
    }

    if (crustSelect && crustSelect.selectedOptions.length > 0) {
      const opt = crustSelect.selectedOptions[0];
      builderState.crustLabel = opt.textContent.trim();
      builderState.crustExtra = parsePrice(opt.dataset.extra, 0);
    } else {
      builderState.crustLabel = 'Hand Tossed';
      builderState.crustExtra = 0;
    }

    builderState.toppings = [];
    builderState.toppingsTotal = 0;
    recalcBuilderTotal();
  }

  function openModal() {
    if (!modal) return;
    modal.classList.add('cb-modal--open');
    modal.setAttribute('aria-hidden', 'false');
    initBuilderDefaults();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('cb-modal--open');
    modal.setAttribute('aria-hidden', 'true');
  }

  openButtons.forEach(btn => btn.addEventListener('click', openModal));
  closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
  if (backdrop) backdrop.addEventListener('click', closeModal);

  sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeButtons.forEach(b => b.classList.remove('cb-pill--active'));
      btn.classList.add('cb-pill--active');
      builderState.sizeLabel = btn.dataset.size;
      builderState.sizePrice = parsePrice(btn.dataset.price, 0);
      recalcBuilderTotal();
    });
  });

  if (crustSelect) {
    crustSelect.addEventListener('change', () => {
      const opt = crustSelect.selectedOptions[0];
      builderState.crustLabel = opt.textContent.trim();
      builderState.crustExtra = parsePrice(opt.dataset.extra, 0);
      recalcBuilderTotal();
    });
  }

  toppingCheckboxes.forEach(cb => cb.addEventListener('change', recomputeBuilderToppings));

  if (builderAddBtn) {
    builderAddBtn.addEventListener('click', () => {
      const total = recalcBuilderTotal() || 0;
      const name = `Custom Pizza (${builderState.sizeLabel})`;
      let meta = builderState.crustLabel;

      if (builderState.toppings.length > 0) {
        meta += ' • ' + builderState.toppings.join(', ');
      }

      addItemToCart({
        name,
        meta,
        price: total,
        qty: 1
      });

      closeModal();
    });
  }

  // Preset menu items
  addMenuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name || 'Menu Pizza';
      const price = parsePrice(btn.dataset.price, 0);
      addItemToCart({ name, price, qty: 1 });
    });
  });

  // Mobile cart bar scroll
  if (cartBar && cartPanel) {
    cartBar.addEventListener('click', () =>
      cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  }

  // Initial cart load
  loadCartFromServer();
});
