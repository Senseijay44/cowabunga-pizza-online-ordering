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
  const cartBackdrop = document.getElementById('cb-cart-backdrop');

  const sizeContainer = modal ? modal.querySelector('.js-size-options') : null;
  const toppingsContainer = modal ? modal.querySelector('.js-topping-grid') : null;
  let sizeButtons = [];
  let crustSelect = modal ? modal.querySelector('.js-crust-select') : null;
  let sauceSelect = modal ? modal.querySelector('.js-sauce-select') : null;
  let cheeseSelect = modal ? modal.querySelector('.js-cheese-select') : null;
  let toppingCheckboxes = [];
  const builderTotalEl = modal ? modal.querySelector('#cb-builder-total') : null;
  const builderAddBtn = modal ? modal.querySelector('.js-builder-add') : null;
  let builderMenuConfig = null;

  const addMenuButtons = document.querySelectorAll('.js-add-menu-item');
  const orderModeButtons = document.querySelectorAll('.js-order-mode');

  const ORDER_MODE_KEY = 'orderMode';
  const normalizeOrderMode = (value) => (value === 'delivery' ? 'delivery' : 'pickup');
  let orderMode = normalizeOrderMode(sessionStorage.getItem(ORDER_MODE_KEY));

  // If we're not on the menu page, bail quietly
  if (!cartPanel) {
    return;
  }

  const categoryChips = document.querySelectorAll('.js-category-chip');
  const menuCards = document.querySelectorAll('.cb-menu-grid .cb-card');

  setCartDrawerOpen(false);

  function syncOrderModeUI() {
    orderModeButtons.forEach((btn) => {
      btn.classList.toggle('cb-pill--active', btn.dataset.mode === orderMode);
    });
  }

  orderModeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = normalizeOrderMode(btn.dataset.mode);
      orderMode = mode;
      sessionStorage.setItem(ORDER_MODE_KEY, mode);
      syncOrderModeUI();
    });
  });

  syncOrderModeUI();

  function applyCategoryFilter(filter) {
    categoryChips.forEach((chip) => {
      chip.classList.toggle('cb-chip--active', chip.dataset.filter === filter);
    });

    menuCards.forEach((card) => {
      if (card.classList.contains('cb-card--highlight')) {
        card.style.display = '';
        return;
      }

      const category = card.dataset.category || 'pizza';
      const shouldShow = filter === 'all' || category === filter;
      card.style.display = shouldShow ? '' : 'none';
    });
  }

  categoryChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter || 'all';
      applyCategoryFilter(filter);
    });
  });

  applyCategoryFilter('all');

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

  function isCartDrawerOpen() {
    return cartPanel && cartPanel.classList.contains('cb-cart--open');
  }

  function setCartDrawerOpen(isOpen) {
    if (!cartPanel) return;
    cartPanel.classList.toggle('cb-cart--open', isOpen);
    if (cartBar) cartBar.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (cartBackdrop) {
      cartBackdrop.classList.toggle('cb-cart-backdrop--visible', isOpen);
      cartBackdrop.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }
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
      const chevron = isCartDrawerOpen() ? ' ▾' : ' ▴';
      cartBarTotalEl.textContent = money(total) + chevron;
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
          <div class="cb-cart-item-top">
            <span class="cb-cart-item-price">${money(item.price * item.qty)}</span>
            <button class="cb-cart-action-btn cb-cart-action-btn--remove js-cart-remove" data-id="${item.id}" aria-label="Remove item">✕</button>
          </div>
          <div class="cb-qty-control" aria-label="Update quantity">
            <button class="cb-cart-action-btn js-cart-minus" data-id="${item.id}" data-index="${index}">-</button>
            <span class="cb-cart-qty">${item.qty}</span>
            <button class="cb-cart-action-btn js-cart-plus" data-id="${item.id}" data-index="${index}">+</button>
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
    sizeId: null,
    baseId: null,
    sauceId: null,
    cheeseId: null,
    sizeLabel: 'Small',
    sizePrice: 0,
    crustLabel: 'Hand Tossed',
    crustExtra: 0,
    sauceLabel: 'Marinara',
    saucePrice: 0,
    cheeseLabel: 'Mozzarella',
    cheesePrice: 0,
    toppings: [],
    toppingIds: [],
    toppingsTotal: 0
  };

  let builderPricingError = null;

  function cacheBuilderControls() {
    sizeButtons = modal ? Array.from(modal.querySelectorAll('.js-size-option')) : [];
    crustSelect = modal ? modal.querySelector('.js-crust-select') : null;
    sauceSelect = modal ? modal.querySelector('.js-sauce-select') : null;
    cheeseSelect = modal ? modal.querySelector('.js-cheese-select') : null;
    toppingCheckboxes = modal ? Array.from(modal.querySelectorAll('.js-topping')) : [];
  }

  function parsePrice(value, fallback = 0) {
    const n = parseFloat(value);
    return Number.isNaN(n) ? fallback : n;
  }

  function computeBasePrice(sizeId, baseId) {
    if (!builderMenuConfig) return 0;
    const size = (builderMenuConfig.sizes || []).find(s => s.id === sizeId) ||
      (builderMenuConfig.sizes || [])[0];
    const base = (builderMenuConfig.bases || []).find(b => b.id === baseId) ||
      (builderMenuConfig.bases || [])[0];

    const basePrice = base?.basePrice || 0;
    const multiplier = size?.priceModifier || 1;
    return basePrice * multiplier;
  }

  function computeSaucePrice(sauceId) {
    if (!builderMenuConfig) return 0;
    const sauce = (builderMenuConfig.sauces || []).find(s => s.id === sauceId) ||
      (builderMenuConfig.sauces || [])[0];
    return sauce?.price || 0;
  }

  function computeCheesePrice(cheeseId) {
    if (!builderMenuConfig) return 0;
    const cheese = (builderMenuConfig.cheeses || []).find(c => c.id === cheeseId) ||
      (builderMenuConfig.cheeses || [])[0];
    return cheese?.price || 0;
  }

  function renderSizeButtons() {
    if (!sizeContainer || !builderMenuConfig || !Array.isArray(builderMenuConfig.sizes)) return;

    const defaultBaseId = builderMenuConfig.rules?.defaultBaseId || builderMenuConfig.bases?.[0]?.id;

    sizeContainer.innerHTML = '';
    builderMenuConfig.sizes.forEach((size, index) => {
      const btn = document.createElement('button');
      btn.className = 'cb-pill js-size-option';
      if (index === 0) btn.classList.add('cb-pill--active');
      btn.type = 'button';
      btn.dataset.sizeId = size.id;
      btn.dataset.size = size.name;
      btn.dataset.price = computeBasePrice(size.id, defaultBaseId).toFixed(2);
      btn.textContent = size.name;
      sizeContainer.appendChild(btn);
    });
  }

  function renderCrustOptions() {
    if (!crustSelect || !builderMenuConfig || !Array.isArray(builderMenuConfig.bases)) return;

    crustSelect.innerHTML = '';
    builderMenuConfig.bases.forEach(base => {
      const opt = document.createElement('option');
      opt.value = base.id;
      opt.dataset.extra = base.basePrice || 0;
      opt.textContent = base.name;
      crustSelect.appendChild(opt);
    });
  }

  function renderSauceOptions() {
    if (!sauceSelect || !builderMenuConfig || !Array.isArray(builderMenuConfig.sauces)) return;

    sauceSelect.innerHTML = '';
    builderMenuConfig.sauces.forEach(sauce => {
      const opt = document.createElement('option');
      const priceSuffix = sauce.price ? ` (+$${Number(sauce.price).toFixed(2)})` : '';
      opt.value = sauce.id;
      opt.dataset.extra = sauce.price || 0;
      opt.textContent = `${sauce.name}${priceSuffix}`;
      sauceSelect.appendChild(opt);
    });
  }

  function renderCheeseOptions() {
    if (!cheeseSelect || !builderMenuConfig || !Array.isArray(builderMenuConfig.cheeses)) return;

    cheeseSelect.innerHTML = '';
    builderMenuConfig.cheeses.forEach(cheese => {
      const opt = document.createElement('option');
      const priceSuffix = cheese.price ? ` (+$${Number(cheese.price).toFixed(2)})` : '';
      opt.value = cheese.id;
      opt.dataset.extra = cheese.price || 0;
      opt.textContent = `${cheese.name}${priceSuffix}`;
      cheeseSelect.appendChild(opt);
    });
  }

  function renderToppingsGrid() {
    if (!toppingsContainer || !builderMenuConfig || !Array.isArray(builderMenuConfig.toppings)) return;

    toppingsContainer.innerHTML = '';
    builderMenuConfig.toppings.forEach(topping => {
      const label = document.createElement('label');
      label.className = 'cb-checkbox';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'js-topping';
      input.dataset.price = topping.price || 0;
      input.dataset.toppingId = topping.id;

      const span = document.createElement('span');
      const priceSuffix = topping.price ? ` (+$${Number(topping.price).toFixed(2)})` : '';
      span.textContent = `${topping.name}${priceSuffix}`;

      label.appendChild(input);
      label.appendChild(span);
      toppingsContainer.appendChild(label);
    });
  }

  function renderBuilderOptions() {
    if (!builderMenuConfig) return;
    renderSizeButtons();
    renderCrustOptions();
    renderSauceOptions();
    renderCheeseOptions();
    renderToppingsGrid();
    cacheBuilderControls();
  }

  function recalcBuilderTotal() {
    if (!builderTotalEl) return 0;
    const total =
      builderState.sizePrice +
      builderState.crustExtra +
      builderState.saucePrice +
      builderState.cheesePrice +
      builderState.toppingsTotal;
    builderTotalEl.textContent = money(total);
    return total;
  }

  async function updateBuilderPrice() {
    if (!builderMenuConfig || !builderTotalEl) return true;

    const payload = {
      sizeId: builderState.sizeId,
      baseId: builderState.baseId,
      sauceId: builderState.sauceId,
      cheeseId: builderState.cheeseId,
      toppings: builderState.toppingIds || [],
      toppingIds: builderState.toppingIds || [],
      quantity: 1,
    };

    try {
      const res = await fetch('/api/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Pricing request failed: ${res.status}`);

      const pricing = await res.json();
      builderState.sizePrice = pricing.breakdown?.base ?? builderState.sizePrice;
      builderState.saucePrice = pricing.breakdown?.sauce ?? builderState.saucePrice;
      builderState.cheesePrice = pricing.breakdown?.cheese ?? builderState.cheesePrice;
      builderState.toppingsTotal = pricing.breakdown?.toppings ?? builderState.toppingsTotal;
      builderTotalEl.textContent = money(pricing.total || 0);
      builderPricingError = null;
      return true;
    } catch (err) {
      console.error('Builder price update failed:', err);
      recalcBuilderTotal();
      builderPricingError = err?.message || 'Unable to calculate price.';
      return false;
    }
  }

  function recomputeBuilderToppings() {
    builderState.toppings = [];
    builderState.toppingIds = [];
    let sum = 0;

    toppingCheckboxes.forEach(cb => {
      if (cb.checked) {
        const label = cb.closest('label');
        const span = label ? label.querySelector('span') : null;
        if (span) builderState.toppings.push(span.textContent.replace(/\s*\(.*\)$/, ''));
        builderState.toppingIds.push(cb.dataset.toppingId);
        sum += parsePrice(cb.dataset.price, 0);
      }
    });

    builderState.toppingsTotal = sum;
    recalcBuilderTotal();
    updateBuilderPrice();
  }

  function initBuilderDefaults() {
    if (!modal || !builderMenuConfig) return;

    toppingCheckboxes.forEach(cb => (cb.checked = false));

    const defaultSizeId = builderMenuConfig.rules?.defaultSizeId || builderMenuConfig.sizes?.[0]?.id;
    const defaultBaseId = builderMenuConfig.rules?.defaultBaseId || builderMenuConfig.bases?.[0]?.id;
    const defaultSauceId = builderMenuConfig.rules?.defaultSauceId || builderMenuConfig.sauces?.[0]?.id;
    const defaultCheeseId = builderMenuConfig.rules?.defaultCheeseId || builderMenuConfig.cheeses?.[0]?.id;

    if (sizeButtons.length > 0) {
      sizeButtons.forEach(b => {
        const isDefault = b.dataset.sizeId === defaultSizeId;
        b.classList.toggle('cb-pill--active', isDefault);
        if (isDefault) {
          builderState.sizeId = b.dataset.sizeId;
          builderState.sizeLabel = b.dataset.size;
        }
      });

      if (!builderState.sizeId && sizeButtons[0]) {
        const first = sizeButtons[0];
        first.classList.add('cb-pill--active');
        builderState.sizeId = first.dataset.sizeId;
        builderState.sizeLabel = first.dataset.size;
      }
    }

    if (crustSelect) {
      const baseToSelect = defaultBaseId || crustSelect.options[0]?.value;
      crustSelect.value = baseToSelect;
      const opt = crustSelect.selectedOptions[0];
      builderState.baseId = opt ? opt.value : builderState.baseId;
      builderState.crustLabel = opt ? opt.textContent.trim() : builderState.crustLabel;
      builderState.crustExtra = 0;
    }

    if (sauceSelect) {
      const sauceToSelect = defaultSauceId || sauceSelect.options[0]?.value;
      sauceSelect.value = sauceToSelect;
      const opt = sauceSelect.selectedOptions[0];
      builderState.sauceId = opt ? opt.value : builderState.sauceId;
      builderState.sauceLabel = opt ? opt.textContent.trim() : builderState.sauceLabel;
      builderState.saucePrice = computeSaucePrice(builderState.sauceId);
    }

    if (cheeseSelect) {
      const cheeseToSelect = defaultCheeseId || cheeseSelect.options[0]?.value;
      cheeseSelect.value = cheeseToSelect;
      const opt = cheeseSelect.selectedOptions[0];
      builderState.cheeseId = opt ? opt.value : builderState.cheeseId;
      builderState.cheeseLabel = opt ? opt.textContent.trim() : builderState.cheeseLabel;
      builderState.cheesePrice = computeCheesePrice(builderState.cheeseId);
    }

    builderState.sizePrice = computeBasePrice(builderState.sizeId, builderState.baseId);

    builderState.toppings = [];
    builderState.toppingIds = [];
    builderState.toppingsTotal = 0;
    recalcBuilderTotal();
    updateBuilderPrice();
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

  function attachBuilderEvents() {
    sizeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeButtons.forEach(b => b.classList.remove('cb-pill--active'));
        btn.classList.add('cb-pill--active');
        builderState.sizeId = btn.dataset.sizeId;
        builderState.sizeLabel = btn.dataset.size;
        builderState.sizePrice = computeBasePrice(builderState.sizeId, builderState.baseId);
        recalcBuilderTotal();
        updateBuilderPrice();
      });
    });

    if (crustSelect) {
      crustSelect.addEventListener('change', () => {
        const opt = crustSelect.selectedOptions[0];
        builderState.baseId = opt ? opt.value : builderState.baseId;
        builderState.crustLabel = opt ? opt.textContent.trim() : builderState.crustLabel;
        builderState.crustExtra = 0;
        builderState.sizePrice = computeBasePrice(builderState.sizeId, builderState.baseId);
        recalcBuilderTotal();
        updateBuilderPrice();
      });
    }

    if (sauceSelect) {
      sauceSelect.addEventListener('change', () => {
        const opt = sauceSelect.selectedOptions[0];
        builderState.sauceId = opt ? opt.value : builderState.sauceId;
        builderState.sauceLabel = opt ? opt.textContent.trim() : builderState.sauceLabel;
        builderState.saucePrice = computeSaucePrice(builderState.sauceId);
        recalcBuilderTotal();
        updateBuilderPrice();
      });
    }

    if (cheeseSelect) {
      cheeseSelect.addEventListener('change', () => {
        const opt = cheeseSelect.selectedOptions[0];
        builderState.cheeseId = opt ? opt.value : builderState.cheeseId;
        builderState.cheeseLabel = opt ? opt.textContent.trim() : builderState.cheeseLabel;
        builderState.cheesePrice = computeCheesePrice(builderState.cheeseId);
        recalcBuilderTotal();
        updateBuilderPrice();
      });
    }

    toppingCheckboxes.forEach(cb => cb.addEventListener('change', recomputeBuilderToppings));
  }

  if (builderAddBtn) {
    builderAddBtn.addEventListener('click', async () => {
      const sizeId = builderState.sizeId || builderMenuConfig?.rules?.defaultSizeId || builderMenuConfig?.sizes?.[0]?.id;
      const baseId = builderState.baseId || builderMenuConfig?.rules?.defaultBaseId || builderMenuConfig?.bases?.[0]?.id;
      const sauceId = builderState.sauceId || builderMenuConfig?.rules?.defaultSauceId || builderMenuConfig?.sauces?.[0]?.id;
      const cheeseId = builderState.cheeseId || builderMenuConfig?.rules?.defaultCheeseId || builderMenuConfig?.cheeses?.[0]?.id;

      const priceOk = await updateBuilderPrice();
      if (!priceOk) {
        showToast(builderPricingError || 'Unable to price this pizza.', 'error');
        return;
      }

      const payload = {
        type: 'custom',
        sizeId,
        baseId,
        sauceId,
        cheeseId,
        toppingIds: builderState.toppingIds || [],
        quantity: 1,
      };

      await addItemToCart(payload);
      closeModal();
    });
  }

  async function initBuilderMenu() {
    if (!modal) return;

    try {
      const res = await fetch('/api/menu');
      if (!res.ok) throw new Error('Failed to load menu config');
      builderMenuConfig = await res.json();

      renderBuilderOptions();
      attachBuilderEvents();
      initBuilderDefaults();
    } catch (err) {
      console.error('Error initializing quick builder:', err);
    }
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
    const toggleCartDrawer = () => {
      const isOpen = !isCartDrawerOpen();
      setCartDrawerOpen(isOpen);
      updateCartSummaryUI();
    };

    cartBar.addEventListener('click', toggleCartDrawer);

    if (cartBackdrop) {
      cartBackdrop.addEventListener('click', () => {
        setCartDrawerOpen(false);
        updateCartSummaryUI();
      });
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && isCartDrawerOpen()) {
        setCartDrawerOpen(false);
        updateCartSummaryUI();
      }
    });
  }

  // Initial cart load
  loadCartFromServer();
  initBuilderMenu();
});
