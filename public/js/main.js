console.log('Cowabunga Pizza client script loaded with cart + builder.');

// Behavior for the enhanced menu page and dynamic pizza builder
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

  // If we're not on the menu page, just exit quietly
  if (!cartPanel) {
    return;
  }

  // ---- CART STATE ----
  const TAX_RATE = 0.086; // 8.6% approx
  const cart = []; // local mirror of server cart

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
    if (cartSubtotalEl) {
      cartSubtotalEl.textContent = money(subtotal);
    }
    if (cartTotalEl) {
      cartTotalEl.textContent = money(total);
    }
    if (cartBarLabelEl) {
      cartBarLabelEl.textContent = itemCount === 0
        ? 'Cart: 0 items'
        : `Cart: ${itemCount} item${itemCount === 1 ? '' : 's'}`;
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
      empty.innerHTML = '<div><p class="cb-cart-item-name">Your cart is empty</p><p class="cb-cart-item-meta">Add a pizza to get started.</p></div>';
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
            <button
              type="button"
              class="js-cart-remove"
              data-id="${item.id}"
              aria-label="Remove item"
            >✕</button>
            <button
              type="button"
              class="js-cart-minus"
              data-index="${index}"
              data-id="${item.id}"
            >-</button>
            <span>${item.qty}</span>
            <button
              type="button"
              class="js-cart-plus"
              data-index="${index}"
              data-id="${item.id}"
            >+</button>
          </div>
        </div>
      `;
      cartItemsEl.appendChild(li);
    });

    // Attach handlers for the quantity buttons – backend PATCH
    cartItemsEl.querySelectorAll('.js-cart-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!id) return;
        updateCartItem(id, -1);
      });
    });

    cartItemsEl.querySelectorAll('.js-cart-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!id) return;
        updateCartItem(id, +1);
      });
    });

    // Attach handler for remove button – backend DELETE
    cartItemsEl.querySelectorAll('.js-cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!id) return;
        deleteCartItem(id);
      });
    });

    updateCartSummaryUI();
  }

  // Load cart from server on page load
  async function loadCartFromServer() {
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) {
        console.error('Failed to load cart from server:', res.status);
        renderCart(); // render empty/local
        return;
      }
      const data = await res.json();
      cart.length = 0;
      (data.items || []).forEach(item => cart.push(item));
      renderCart();
    } catch (err) {
      console.error('Error loading cart from server:', err);
      renderCart();
    }
  }

  // Add new item using backend API
  async function addItemToCart(newItem) {
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      if (!res.ok) {
        console.error('Failed to add item to cart:', res.status);
        return;
      }

      const data = await res.json();

      cart.length = 0;
      (data.cart || []).forEach(item => cart.push(item));

      renderCart();
    } catch (err) {
      console.error('Error adding item to cart:', err);
    }
  }

  // Update existing item (for +/- qty) using PATCH
  async function updateCartItem(id, delta) {
    try {
      const res = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      });

      if (!res.ok) {
        console.error('Failed to update cart item:', res.status);
        return;
      }

      const data = await res.json();
      cart.length = 0;
      (data.cart || []).forEach(item => cart.push(item));
      renderCart();
    } catch (err) {
      console.error('Error updating cart item:', err);
    }
  }

  // Remove item entirely using DELETE
  async function deleteCartItem(id) {
    try {
      const res = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        console.error('Failed to delete cart item:', res.status);
        return;
      }

      const data = await res.json();
      cart.length = 0;
      (data.cart || []).forEach(item => cart.push(item));
      renderCart();
    } catch (err) {
      console.error('Error deleting cart item:', err);
    }
  }

  // ---- BUILDER STATE ----
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
    if (!builderTotalEl) return;
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
        if (label) {
          const span = label.querySelector('span');
          if (span) {
            builderState.toppings.push(span.textContent.replace(/\s*\(.*\)$/, ''));
          }
        }
        sum += parsePrice(cb.dataset.price, 0);
      }
    });
    builderState.toppingsTotal = sum;
    recalcBuilderTotal();
  }

  function initBuilderDefaults() {
    if (!modal) return;

    toppingCheckboxes.forEach(cb => {
      cb.checked = false;
    });

    if (sizeButtons.length > 0) {
      sizeButtons.forEach(btn => btn.classList.remove('cb-pill--active'));
      const first = sizeButtons[0];
      first.classList.add('cb-pill--active');
      builderState.sizeLabel = first.dataset.size || 'Small';
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

  openButtons.forEach(btn => {
    btn.addEventListener('click', openModal);
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeModal);
  }

  sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeButtons.forEach(b => b.classList.remove('cb-pill--active'));
      btn.classList.add('cb-pill--active');
      builderState.sizeLabel = btn.dataset.size || 'Custom';
      builderState.sizePrice = parsePrice(btn.dataset.price, 0);
      recalcBuilderTotal();
    });
  });

  if (crustSelect) {
    crustSelect.addEventListener('change', () => {
      const opt = crustSelect.selectedOptions[0];
      if (opt) {
        builderState.crustLabel = opt.textContent.trim();
        builderState.crustExtra = parsePrice(opt.dataset.extra, 0);
      } else {
        builderState.crustLabel = 'Hand Tossed';
        builderState.crustExtra = 0;
      }
      recalcBuilderTotal();
    });
  }

  toppingCheckboxes.forEach(cb => {
    cb.addEventListener('change', recomputeBuilderToppings);
  });

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

  addMenuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name || 'Menu Pizza';
      const price = parsePrice(btn.dataset.price, 0);
      addItemToCart({
        name,
        price,
        qty: 1
      });
    });
  });

  if (cartBar && cartPanel) {
    cartBar.addEventListener('click', () => {
      cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // INITIAL LOAD: sync cart from backend session
  loadCartFromServer();
});
